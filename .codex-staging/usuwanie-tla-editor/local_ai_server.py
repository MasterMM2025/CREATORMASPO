#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import io
import json
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

try:
    from backgroundremover.bg import remove as remove_background
    BACKGROUNDREMOVER_ERROR = None
except Exception as exc:  # pragma: no cover - runtime dependency
    remove_background = None
    BACKGROUNDREMOVER_ERROR = exc

try:
    from PIL import Image, ImageEnhance, ImageFilter, ImageOps
    PIL_ERROR = None
except Exception as exc:  # pragma: no cover - runtime dependency
    Image = None
    ImageEnhance = None
    ImageFilter = None
    ImageOps = None
    PIL_ERROR = exc


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5101


def decode_data_url(data_url: str) -> bytes:
    if not data_url.startswith("data:"):
      raise ValueError("Expected data URL payload.")

    _, encoded = data_url.split(",", 1)
    return base64.b64decode(encoded)


def encode_png_data_url(data: bytes) -> str:
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def preprocess_image(image_bytes: bytes, options: dict) -> bytes:
    if not options.get("preprocess"):
        return image_bytes

    if PIL_ERROR:
        return image_bytes

    long_edge = max(600, int(options.get("preprocessLongEdge") or 1600))

    with Image.open(io.BytesIO(image_bytes)) as image:
        image = image.convert("RGB")
        width, height = image.size
        longest = max(width, height)

        if longest < long_edge:
            scale = long_edge / float(longest)
            resized = (
                max(1, round(width * scale)),
                max(1, round(height * scale)),
            )
            image = image.resize(resized, Image.Resampling.LANCZOS)

        image = ImageOps.autocontrast(image, cutoff=0.3)
        image = ImageEnhance.Contrast(image).enhance(1.03)
        image = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=105, threshold=3))

        output = io.BytesIO()
        image.save(output, format="PNG")
        return output.getvalue()


def process_remove_background(image_bytes: bytes, options: dict) -> bytes:
    if BACKGROUNDREMOVER_ERROR:
        raise RuntimeError(
            "backgroundremover is not installed. Run ./setup-local-ai.sh first."
        ) from BACKGROUNDREMOVER_ERROR

    processed_bytes = preprocess_image(image_bytes, options)

    return remove_background(
        processed_bytes,
        model_name=str(options.get("model") or "u2net"),
        alpha_matting=bool(options.get("alphaMatting", True)),
        alpha_matting_foreground_threshold=int(
            options.get("alphaMattingForegroundThreshold") or 235
        ),
        alpha_matting_background_threshold=int(
            options.get("alphaMattingBackgroundThreshold") or 12
        ),
        alpha_matting_erode_structure_size=int(
            options.get("alphaMattingErodeSize") or 8
        ),
        alpha_matting_base_size=int(options.get("alphaMattingBaseSize") or 1600),
    )


def make_handler(web_root: Path):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(web_root), **kwargs)

        def end_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            super().end_headers()

        def do_OPTIONS(self):
            self.send_response(HTTPStatus.NO_CONTENT)
            self.end_headers()

        def do_GET(self):
            parsed = urlparse(self.path)

            if parsed.path == "/api/health":
                self.send_json(
                    {
                        "ok": BACKGROUNDREMOVER_ERROR is None,
                        "engine": "backgroundremover",
                        "message": None if BACKGROUNDREMOVER_ERROR is None else str(BACKGROUNDREMOVER_ERROR),
                    }
                )
                return

            if parsed.path in ("", "/"):
                self.path = "/index.html"

            super().do_GET()

        def do_POST(self):
            parsed = urlparse(self.path)
            if parsed.path != "/api/remove-background":
                self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
                return

            try:
                content_length = int(self.headers.get("Content-Length", "0"))
                if content_length <= 0:
                    raise ValueError("Empty request body.")

                raw_body = self.rfile.read(content_length)
                payload = json.loads(raw_body.decode("utf-8"))
                image_data_url = str(payload.get("imageDataUrl") or "")
                options = payload.get("options") or {}

                if not image_data_url:
                    raise ValueError("Missing imageDataUrl.")

                image_bytes = decode_data_url(image_data_url)
                output_bytes = process_remove_background(image_bytes, options)

                self.send_json(
                    {
                        "ok": True,
                        "engine": "backgroundremover",
                        "imageDataUrl": encode_png_data_url(output_bytes),
                    }
                )
            except Exception as exc:  # pragma: no cover - runtime path
                self.send_json(
                    {
                        "ok": False,
                        "error": str(exc),
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )

        def log_message(self, format: str, *args):
            sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))

        def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK):
            encoded = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Serve the mini photo editor with a local backgroundremover API.")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--web-root", default=str(Path(__file__).resolve().parent))
    args = parser.parse_args()

    web_root = Path(args.web_root).resolve()
    handler = make_handler(web_root)
    server = ThreadingHTTPServer((args.host, args.port), handler)

    print(f"Serving local AI editor on http://{args.host}:{args.port}")
    print(f"Web root: {web_root}")
    print("Health check: /api/health")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local AI server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

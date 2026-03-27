/* eslint-disable require-jsdoc, max-len */
const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

const DEFAULT_PROVIDER_ORDER = ["removebg", "photoroom"];
const MAX_DATA_URL_BYTES = 15 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 45000;

function setCorsHeaders(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Cache-Control", "no-store");
}

function normalizeProvider(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "auto") return "auto";
  if (raw === "remove.bg") return "removebg";
  if (raw === "removebg") return "removebg";
  if (raw === "photoroom") return "photoroom";
  return "";
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function getApiKey(provider) {
  if (provider === "removebg") return String(process.env.REMOVE_BG_API_KEY || "").trim();
  if (provider === "photoroom") return String(process.env.PHOTOROOM_API_KEY || "").trim();
  return "";
}

function isProviderConfigured(provider) {
  return !!getApiKey(provider);
}

function parseProviderOrder(value) {
  const requested = String(value || "")
      .split(",")
      .map((item) => normalizeProvider(item))
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index);
  return requested.length ? requested : [...DEFAULT_PROVIDER_ORDER];
}

function getProviderOrder(requestedProvider) {
  const explicit = normalizeProvider(requestedProvider);
  if (explicit && explicit !== "auto") return [explicit];

  const configured = parseProviderOrder(
      process.env.REMOVE_BG_PROVIDER_ORDER || process.env.REMOVE_BG_PROVIDER,
  );
  const available = configured.filter(isProviderConfigured);
  if (available.length) return available;
  return DEFAULT_PROVIDER_ORDER.filter(isProviderConfigured);
}

function getRequestBody(req) {
  if (req && req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const raw = req && req.rawBody ? req.rawBody.toString("utf8") : "";
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return {};
  }
}

function sanitizeFilename(value) {
  const raw = String(value || "").trim();
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  if (!cleaned) return "upload.png";
  return cleaned.toLowerCase().endsWith(".png") ? cleaned : `${cleaned}.png`;
}

function sanitizeImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch (_err) {
    return "";
  }
}

function decodeDataPayload(payload, isBase64) {
  if (isBase64) return Buffer.from(payload, "base64");
  return Buffer.from(decodeURIComponent(payload), "utf8");
}

function dataUrlToBlob(dataUrl) {
  const match = /^data:([^;,]+)?((?:;[^;,=]+=[^;,=]+)*)(;base64)?,([\s\S]+)$/.exec(String(dataUrl || ""));
  if (!match) throw new Error("Nieprawidlowy format imageDataUrl.");
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = !!match[3];
  const payload = match[4] || "";
  const bytes = Math.ceil(payload.length * (isBase64 ? 0.75 : 1));
  if (bytes > MAX_DATA_URL_BYTES) {
    throw new Error("Obraz do usuniecia tla jest zbyt duzy dla proxy.");
  }
  const buffer = decodeDataPayload(payload, isBase64);
  return new Blob([buffer], {type: mimeType});
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {...options, signal: ctrl.signal});
  } finally {
    clearTimeout(timer);
  }
}

async function ensureInputBlob(input, filename) {
  if (input.imageDataUrl) return dataUrlToBlob(input.imageDataUrl);
  if (!input.imageUrl) throw new Error("Brak obrazu do przetworzenia.");
  const response = await fetchWithTimeout(input.imageUrl, {method: "GET"}, 20000);
  if (!response.ok) {
    throw new Error(`Nie udalo sie pobrac obrazu z URL (${response.status}).`);
  }
  const mimeType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_DATA_URL_BYTES) {
    throw new Error("Zrodlo obrazu jest zbyt duze dla proxy.");
  }
  return new Blob([buffer], {type: mimeType});
}

async function readUpstreamError(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  try {
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      const title = payload && payload.errors && payload.errors[0] && payload.errors[0].title;
      return String(title || (payload && payload.message) || (payload && payload.error) || "").trim();
    }
    const text = await response.text();
    return String(text || "").trim().slice(0, 300);
  } catch (_err) {
    return "";
  }
}

async function callRemoveBgProvider(input, filename) {
  const form = new FormData();
  const apiKey = getApiKey("removebg");
  if (!apiKey) throw new Error("Brak REMOVE_BG_API_KEY.");

  if (input.imageDataUrl) {
    form.append("image_file", dataUrlToBlob(input.imageDataUrl), filename);
  } else if (input.imageUrl) {
    form.append("image_url", input.imageUrl);
  } else {
    throw new Error("Brak danych obrazu dla remove.bg.");
  }

  form.append("size", "auto");
  form.append("format", "png");
  form.append("crop", "false");

  const response = await fetchWithTimeout("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const details = await readUpstreamError(response);
    throw new Error(
        `remove.bg zwrocil ${response.status}${details ? `: ${details}` : ""}`,
    );
  }

  return {
    provider: "removebg",
    contentType: response.headers.get("content-type") || "image/png",
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

async function callPhotoRoomProvider(input, filename) {
  const apiKey = getApiKey("photoroom");
  if (!apiKey) throw new Error("Brak PHOTOROOM_API_KEY.");

  const useEditApi = parseBoolean(process.env.PHOTOROOM_USE_EDIT_API, false);
  const headers = {
    "x-api-key": apiKey,
  };
  const form = new FormData();
  const blob = await ensureInputBlob(input, filename);

  let endpoint = "https://sdk.photoroom.com/v1/segment";
  if (useEditApi) {
    endpoint = "https://image-api.photoroom.com/v2/edit";
    form.append("imageFile", blob, filename);
    form.append("removeBackground", "true");
    const hdHeader = String(process.env.PHOTOROOM_HD_BACKGROUND_REMOVAL || "").trim();
    if (hdHeader) headers["pr-hd-background-removal"] = hdHeader;
  } else {
    form.append("image_file", blob, filename);
    form.append("format", "png");
    form.append("crop", "false");
    form.append("size", "full");
  }

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers,
    body: form,
  });

  if (!response.ok) {
    const details = await readUpstreamError(response);
    throw new Error(
        `PhotoRoom zwrocil ${response.status}${details ? `: ${details}` : ""}`,
    );
  }

  return {
    provider: "photoroom",
    contentType: response.headers.get("content-type") || "image/png",
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

async function callProvider(provider, input, filename) {
  if (provider === "removebg") return callRemoveBgProvider(input, filename);
  if (provider === "photoroom") return callPhotoRoomProvider(input, filename);
  throw new Error(`Nieobslugiwany provider: ${provider}`);
}

exports.removeBackground = onRequest(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Uzyj metody POST."});
    return;
  }

  const body = getRequestBody(req);
  const imageDataUrl = String(body.imageDataUrl || "").trim();
  const imageUrl = sanitizeImageUrl(body.imageUrl);
  const filename = sanitizeFilename(body.filename || "upload.png");

  if (!imageDataUrl && !imageUrl) {
    res.status(400).json({error: "Brak imageDataUrl lub imageUrl."});
    return;
  }

  const input = {imageDataUrl, imageUrl};
  const providers = getProviderOrder(body.provider);
  if (!providers.length) {
    res.status(501).json({
      error: "Brak skonfigurowanego providera premium do usuwania tla.",
    });
    return;
  }

  let lastError = null;
  for (const provider of providers) {
    try {
      const result = await callProvider(provider, input, filename);
      res.set("Content-Type", result.contentType || "image/png");
      res.set("X-Remove-Bg-Provider", result.provider);
      res.status(200).send(result.buffer);
      return;
    } catch (err) {
      lastError = err;
      logger.warn("Premium remove background provider failed", {
        provider,
        message: String(err && err.message ? err.message : err),
      });
    }
  }

  res.status(502).json({
    error: String(
        lastError && lastError.message ?
          lastError.message :
          "Nie udalo sie usunac tla w zadnym providerze.",
    ),
  });
});

#!/usr/bin/env node

const crypto = require("crypto");
const http = require("http");
const net = require("net");
const { URL } = require("url");

function parseArgs(argv) {
  const out = {
    port: 9223,
    pageId: "",
    urlSubstring: "",
    titleSubstring: "",
    expression: ""
  };

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i] || "");
    if (arg === "--port") {
      out.port = Number(args[i + 1]) || out.port;
      i += 1;
      continue;
    }
    if (arg === "--page-id") {
      out.pageId = String(args[i + 1] || "");
      i += 1;
      continue;
    }
    if (arg === "--url-substr") {
      out.urlSubstring = String(args[i + 1] || "");
      i += 1;
      continue;
    }
    if (arg === "--title-substr") {
      out.titleSubstring = String(args[i + 1] || "");
      i += 1;
      continue;
    }
    out.expression = args.slice(i).join(" ");
    break;
  }

  return out;
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      if (!res || res.statusCode !== 200) {
        reject(new Error(`HTTP ${res && res.statusCode ? res.statusCode : "?"}`));
        res && res.resume && res.resume();
        return;
      }

      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
  });
}

function chooseTarget(pages, options) {
  const list = Array.isArray(pages) ? pages : [];
  if (!list.length) {
    throw new Error("Chrome nie zwrocil zadnych kart.");
  }

  const matches = list.filter((page) => {
    if (!page || page.type !== "page") return false;
    if (options.pageId && String(page.id || "") !== options.pageId) return false;
    if (options.urlSubstring && !String(page.url || "").includes(options.urlSubstring)) return false;
    if (options.titleSubstring && !String(page.title || "").includes(options.titleSubstring)) return false;
    return true;
  });

  const chosen = matches[0] || list.find((page) => page && page.type === "page") || list[0];
  if (!chosen || !chosen.webSocketDebuggerUrl) {
    throw new Error("Nie znaleziono webSocketDebuggerUrl dla karty.");
  }
  return chosen;
}

function encodeClientFrame(payload) {
  const data = Buffer.from(String(payload || ""), "utf8");
  const mask = crypto.randomBytes(4);
  let header = null;

  if (data.length < 126) {
    header = Buffer.alloc(2);
    header[1] = 0x80 | data.length;
  } else if (data.length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 0x80 | 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }

  header[0] = 0x81;
  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 1) {
    masked[i] = data[i] ^ mask[i % 4];
  }

  return Buffer.concat([header, mask, masked]);
}

function tryDecodeFrame(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 2) return null;

  const first = buffer[0];
  const second = buffer[1];
  const fin = (first & 0x80) !== 0;
  const opcode = first & 0x0f;
  const masked = (second & 0x80) !== 0;
  let payloadLength = second & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < offset + 2) return null;
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    if (buffer.length < offset + 8) return null;
    payloadLength = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  const maskLength = masked ? 4 : 0;
  if (buffer.length < offset + maskLength + payloadLength) return null;

  let payload = buffer.subarray(offset + maskLength, offset + maskLength + payloadLength);
  if (masked) {
    const mask = buffer.subarray(offset, offset + 4);
    const unmasked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i += 1) {
      unmasked[i] = payload[i] ^ mask[i % 4];
    }
    payload = unmasked;
  }

  return {
    fin,
    opcode,
    payload,
    bytesRead: offset + maskLength + payloadLength
  };
}

class ChromeSocket {
  constructor(wsUrl) {
    this.wsUrl = new URL(wsUrl);
    this.socket = null;
    this.pending = new Map();
    this.nextId = 0;
    this.readBuffer = Buffer.alloc(0);
    this.closed = false;
  }

  connect() {
    const port = Number(this.wsUrl.port || 80);
    const host = this.wsUrl.hostname;
    const path = `${this.wsUrl.pathname}${this.wsUrl.search || ""}`;
    const origins = [
      `http://${host}:${port}`,
      "devtools://devtools",
      "chrome://inspect",
      ""
    ];

    const attempt = (originIndex) => new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString("base64");
      const socket = net.createConnection({ host, port });
      this.socket = socket;

      let handshake = "";
      let resolved = false;

      socket.on("connect", () => {
        const headers = [
          `GET ${path} HTTP/1.1`,
          `Host: ${host}:${port}`,
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Key: ${key}`,
          "Sec-WebSocket-Version: 13"
        ];
        const origin = origins[originIndex];
        if (origin) headers.push(`Origin: ${origin}`);
        headers.push("", "");
        socket.write(headers.join("\r\n"));
      });

      socket.on("data", (chunk) => {
        if (resolved) return;
        handshake += chunk.toString("latin1");
        const idx = handshake.indexOf("\r\n\r\n");
        if (idx === -1) return;
        const header = handshake.slice(0, idx);
        const rest = Buffer.from(handshake.slice(idx + 4), "latin1");
        if (!header.startsWith("HTTP/1.1 101")) {
          socket.destroy();
          reject(new Error(`Handshake WebSocket nieudany:\n${header}\n\n${rest.toString("utf8")}`));
          return;
        }
        resolved = true;
        this.readBuffer = rest;
        this.attachDataHandler();
        resolve();
      });

      socket.on("error", (err) => {
        if (!resolved) reject(err);
        else this.rejectAll(err);
      });

      socket.on("close", () => {
        if (!resolved) return;
        this.closed = true;
        this.rejectAll(new Error("Polaczenie z Chrome zostalo zamkniete."));
      });
    }).catch((err) => {
      if (originIndex >= origins.length - 1) throw err;
      return attempt(originIndex + 1);
    });

    return attempt(0);
  }

  attachDataHandler() {
    if (!this.socket) return;
    this.socket.removeAllListeners("data");
    this.socket.on("data", (chunk) => {
      this.readBuffer = Buffer.concat([this.readBuffer, chunk]);
      while (true) {
        const frame = tryDecodeFrame(this.readBuffer);
        if (!frame) break;
        this.readBuffer = this.readBuffer.subarray(frame.bytesRead);
        this.onFrame(frame);
      }
    });
  }

  onFrame(frame) {
    if (!frame) return;
    if (frame.opcode === 0x8) {
      this.close();
      return;
    }
    if (frame.opcode === 0x9) {
      this.socket && this.socket.write(encodeClientFrame(frame.payload));
      return;
    }
    if (frame.opcode !== 0x1) return;

    let msg = null;
    try {
      msg = JSON.parse(frame.payload.toString("utf8"));
    } catch (_err) {
      return;
    }

    if (msg && Object.prototype.hasOwnProperty.call(msg, "id") && this.pending.has(msg.id)) {
      const { resolve, reject, timeoutId } = this.pending.get(msg.id);
      clearTimeout(timeoutId);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else resolve(msg);
    }
  }

  send(method, params = {}, timeoutMs = 12000) {
    if (!this.socket || this.closed) {
      return Promise.reject(new Error("Brak aktywnego polaczenia z Chrome."));
    }

    const id = ++this.nextId;
    const payload = JSON.stringify({ id, method, params });
    this.socket.write(encodeClientFrame(payload));

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout dla ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeoutId });
    });
  }

  rejectAll(err) {
    for (const [id, entry] of this.pending.entries()) {
      clearTimeout(entry.timeoutId);
      entry.reject(err);
      this.pending.delete(id);
    }
  }

  async evaluate(expression) {
    await this.send("Runtime.enable");
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return result;
  }

  close() {
    this.closed = true;
    try {
      this.socket && this.socket.end();
    } catch (_err) {}
  }
}

async function main() {
  const options = parseArgs(process.argv);
  if (!options.expression) {
    throw new Error("Podaj expression do Runtime.evaluate.");
  }

  const pages = await httpGetJson(`http://127.0.0.1:${options.port}/json/list`);
  const target = chooseTarget(pages, options);
  const chrome = new ChromeSocket(target.webSocketDebuggerUrl);

  await chrome.connect();
  const response = await chrome.evaluate(options.expression);
  chrome.close();

  if (response.result && response.result.exceptionDetails) {
    throw new Error(JSON.stringify(response.result.exceptionDetails, null, 2));
  }

  const payload = response && response.result && response.result.result
    ? response.result.result
    : null;
  const value = payload && Object.prototype.hasOwnProperty.call(payload, "value")
    ? payload.value
    : payload;
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err && err.stack ? err.stack : String(err)}\n`);
  process.exit(1);
});

(function () {
  "use strict";

  function loadImageFromSrc(src) {
    return new Promise((resolve, reject) => {
      const tryLoad = (mode) => {
        const img = new Image();
        if (mode === "anonymous") img.crossOrigin = "anonymous";
        let done = false;
        const finish = (ok, value) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          img.onload = null;
          img.onerror = null;
          ok ? resolve(value) : reject(value);
        };
        const timer = setTimeout(() => {
          if (mode === "anonymous") {
            tryLoad("plain");
            return;
          }
          finish(false, new Error("Timeout ladowania obrazu."));
        }, 9000);
        img.onload = () => finish(true, img);
        img.onerror = () => {
          if (mode === "anonymous") {
            tryLoad("plain");
            return;
          }
          finish(false, new Error("Nie mozna zaladowac obrazu."));
        };
        img.src = src;
      };
      tryLoad("anonymous");
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function normalizeSourceForPixelRead(src) {
    const s = String(src || "").trim();
    if (!s) throw new Error("Brak zrodla obrazu.");
    if (s.startsWith("data:")) return s;
    if (s.startsWith("blob:")) return s;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3200);
      const res = await fetch(s, { mode: "cors", cache: "no-store", signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      return blobToDataUrl(blob);
    } catch (_err) {
      // fallback: sproboj bez normalizacji; jesli bedzie tainted canvas,
      // obsluzymy to wyzej i przejdziemy do fallbacku AI.
      return s;
    }
  }

  async function removeBackgroundLocalFloodFill(imgData, options = {}) {
    const srcRaw = String(imgData || "").trim();
    if (!srcRaw) throw new Error("Brak danych obrazu do usuniecia tla.");
    const src = await normalizeSourceForPixelRead(srcRaw);

    const THRESHOLD_LUMA = Number.isFinite(options.thresholdLuma) ? Number(options.thresholdLuma) : 220;
    const MAX_SAT_FOR_BG = Number.isFinite(options.maxSatForBg) ? Number(options.maxSatForBg) : 35;
    const DIST_FROM_WHITE = Number.isFinite(options.distFromWhite) ? Number(options.distFromWhite) : 45;
    const GAUSS_RADIUS = Number.isFinite(options.gaussRadius) ? Number(options.gaussRadius) : 1.2;
    const FINAL_ALPHA_CUTOFF = Number.isFinite(options.finalAlphaCutoff) ? Number(options.finalAlphaCutoff) : 28;
    const DILATE_PASSES = Number.isFinite(options.dilatePasses) ? Number(options.dilatePasses) : 1;

    const imageEl = await loadImageFromSrc(src);
    const w = Math.max(1, Number(imageEl.naturalWidth || imageEl.width || 1));
    const h = Math.max(1, Number(imageEl.naturalHeight || imageEl.height || 1));

    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cctx = c.getContext("2d", { willReadFrequently: true });
    if (!cctx) throw new Error("Brak kontekstu 2D do usuwania tla.");
    cctx.drawImage(imageEl, 0, 0, w, h);

    let imageData;
    try {
      imageData = cctx.getImageData(0, 0, w, h);
    } catch (err) {
      const msg = String(err && err.message ? err.message : err || "");
      if (msg.toLowerCase().includes("tainted") || msg.toLowerCase().includes("cross-origin")) {
        throw new Error("LOCAL_RMBG_CORS_TAINTED");
      }
      throw err;
    }
    const data = imageData.data;
    const mask = new Uint8Array(w * h);
    const visited = new Uint8Array(w * h);

    function estimateBorderBackgroundStats() {
      const band = Math.max(1, Math.min(6, Math.round(Math.min(w, h) * 0.012)));
      const step = Math.max(1, Math.round(Math.min(w, h) / 420));
      const samples = [];

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          if (!(x < band || x >= (w - band) || y < band || y >= (h - band))) continue;
          const idx = (y * w + x) * 4;
          const a = data[idx + 3];
          if (a < 8) continue;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : ((max - min) / max) * 100;
          const luma = r * 0.299 + g * 0.587 + b * 0.114;
          samples.push({ r, g, b, sat, luma });
        }
      }

      if (samples.length < 10) return null;

      const neutralLimit = Math.min(70, MAX_SAT_FOR_BG + 22);
      const neutral = samples.filter((s) => s.sat <= neutralLimit);
      const minNeutralCount = Math.max(28, Math.floor(samples.length * 0.24));
      const usable = neutral.length >= minNeutralCount ? neutral : samples;
      if (!usable.length) return null;

      let sumR = 0, sumG = 0, sumB = 0, sumL = 0;
      let sumR2 = 0, sumG2 = 0, sumB2 = 0;
      for (let i = 0; i < usable.length; i++) {
        const s = usable[i];
        sumR += s.r; sumG += s.g; sumB += s.b; sumL += s.luma;
        sumR2 += s.r * s.r; sumG2 += s.g * s.g; sumB2 += s.b * s.b;
      }

      const n = usable.length;
      const meanR = sumR / n;
      const meanG = sumG / n;
      const meanB = sumB / n;
      const meanLuma = sumL / n;
      const stdR = Math.sqrt(Math.max(0, (sumR2 / n) - meanR * meanR));
      const stdG = Math.sqrt(Math.max(0, (sumG2 / n) - meanG * meanG));
      const stdB = Math.sqrt(Math.max(0, (sumB2 / n) - meanB * meanB));
      const stdAvg = (stdR + stdG + stdB) / 3;

      const distThreshold = Math.max(24, Math.min(95, stdAvg * 3.1 + 16));
      const shadowDistThreshold = Math.max(distThreshold + 10, Math.min(120, distThreshold + 24));
      const lumaFloor = Math.max(105, Math.min(THRESHOLD_LUMA, meanLuma - 44));
      const shadowLumaFloor = Math.max(80, lumaFloor - 32);

      return {
        meanR,
        meanG,
        meanB,
        distThreshold,
        shadowDistThreshold,
        lumaFloor,
        shadowLumaFloor,
        maxSat: Math.min(78, MAX_SAT_FOR_BG + 20)
      };
    }

    const borderStats = estimateBorderBackgroundStats();

    function isBackground(r, g, b) {
      const luma = r * 0.299 + g * 0.587 + b * 0.114;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : ((max - min) / max) * 100;
      const dist = Math.hypot(r - 255, g - 255, b - 255);

      if (borderStats) {
        const borderDist = Math.hypot(
          r - borderStats.meanR,
          g - borderStats.meanG,
          b - borderStats.meanB
        );
        const inMainBgRange = (
          borderDist <= borderStats.distThreshold &&
          luma >= borderStats.lumaFloor
        );
        const inShadowRange = (
          saturation <= borderStats.maxSat &&
          borderDist <= borderStats.shadowDistThreshold &&
          luma >= borderStats.shadowLumaFloor
        );
        if (inMainBgRange || inShadowRange) return true;
      }

      if (luma < THRESHOLD_LUMA) return false;
      if (saturation > MAX_SAT_FOR_BG) return false;
      return dist < DIST_FROM_WHITE;
    }

    function floodFill(sx, sy) {
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;
      const sidx = sy * w + sx;
      if (visited[sidx]) return;

      const stack = [[sx, sy]];
      while (stack.length) {
        const pair = stack.pop();
        const x = pair[0];
        const y = pair[1];
        const idx = y * w + x;
        if (visited[idx]) continue;
        visited[idx] = 1;

        const i = idx * 4;
        if (!isBackground(data[i], data[i + 1], data[i + 2])) continue;

        mask[idx] = 1;
        if (x > 0) stack.push([x - 1, y]);
        if (x < w - 1) stack.push([x + 1, y]);
        if (y > 0) stack.push([x, y - 1]);
        if (y < h - 1) stack.push([x, y + 1]);
      }
    }

    for (let x = 0; x < w; x++) {
      floodFill(x, 0);
      floodFill(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      floodFill(0, y);
      floodFill(w - 1, y);
    }

    for (let pass = 0; pass < DILATE_PASSES; pass++) {
      const temp = new Uint8Array(mask);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          if (temp[idx] === 1) continue;
          if (
            temp[(y - 1) * w + (x - 1)] || temp[(y - 1) * w + x] || temp[(y - 1) * w + (x + 1)] ||
            temp[y * w + (x - 1)] || temp[y * w + (x + 1)] ||
            temp[(y + 1) * w + (x - 1)] || temp[(y + 1) * w + x] || temp[(y + 1) * w + (x + 1)]
          ) {
            mask[idx] = 1;
          }
        }
      }
    }

    let removedPixels = 0;
    for (let i = 0; i < w * h; i++) {
      if (!mask[i]) continue;
      data[i * 4 + 3] = 0;
      removedPixels++;
    }

    if (removedPixels === 0) {
      throw new Error("Nie wykryto jasnego tła do usunięcia.");
    }

    function smoothAlpha(px, ww, hh, radius) {
      const r = Math.max(1, Math.round(radius));
      const temp = new Uint8ClampedArray(px);

      for (let y = 0; y < hh; y++) {
        for (let x = 0; x < ww; x++) {
          let sum = 0;
          let cnt = 0;
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= ww) continue;
            sum += temp[(y * ww + nx) * 4 + 3];
            cnt++;
          }
          px[(y * ww + x) * 4 + 3] = cnt ? ((sum / cnt) | 0) : 0;
        }
      }

      temp.set(px);
      for (let x = 0; x < ww; x++) {
        for (let y = 0; y < hh; y++) {
          let sum = 0;
          let cnt = 0;
          for (let dy = -r; dy <= r; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= hh) continue;
            sum += temp[(ny * ww + x) * 4 + 3];
            cnt++;
          }
          px[(y * ww + x) * 4 + 3] = cnt ? ((sum / cnt) | 0) : 0;
        }
      }
    }

    smoothAlpha(data, w, h, GAUSS_RADIUS);

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < FINAL_ALPHA_CUTOFF) data[i] = 0;
    }

    cctx.putImageData(imageData, 0, 0);
    return c.toDataURL("image/png");
  }

  function uniquePush(arr, value) {
    const v = String(value || "").trim();
    if (!v) return;
    if (arr.includes(v)) return;
    arr.push(v);
  }

  function getSourceCandidatesFromKonvaNode(node) {
    const out = [];
    if (!node) return out;

    try { uniquePush(out, node.getAttr && node.getAttr("originalSrcBeforeRmbg")); } catch (_err) {}
    try { uniquePush(out, node.getAttr && node.getAttr("originalSrc")); } catch (_err) {}
    try {
      const raw = node.image && node.image();
      uniquePush(out, raw && raw.src ? raw.src : "");
    } catch (_err) {}

    // Fallback na końcu: aktualny render node (często mniejszy niż oryginał),
    // więc nie używamy go jako pierwszego źródła.
    try {
      if (typeof node.toDataURL === "function") {
        let fallbackPixelRatio = 2;
        try {
          const absScale = (typeof node.getAbsoluteScale === "function") ? node.getAbsoluteScale() : null;
          const sx = Math.abs(Number(absScale && absScale.x)) || Math.abs(Number(node.scaleX && node.scaleX())) || 1;
          const sy = Math.abs(Number(absScale && absScale.y)) || Math.abs(Number(node.scaleY && node.scaleY())) || 1;
          const minScale = Math.max(0.2, Math.min(sx, sy));
          fallbackPixelRatio = Math.max(1.5, Math.min(4, 1 / minScale));
        } catch (_err) {}
        uniquePush(out, node.toDataURL({ pixelRatio: fallbackPixelRatio }));
      }
    } catch (_err) {}
    return out;
  }

  async function applyCleanedToKonvaNode(node, cleanedDataUrl) {
    const loaded = await loadImageFromSrc(cleanedDataUrl);
    const oldAttrs = node && node.getAttrs ? { ...node.getAttrs() } : {};
    let srcBefore = "";
    let srcBeforeRmbg = "";
    try { srcBefore = String(oldAttrs.originalSrc || "").trim(); } catch (_err) {}
    try { srcBeforeRmbg = String(oldAttrs.originalSrcBeforeRmbg || "").trim(); } catch (_err) {}
    const prevGeom = {
      x: (typeof node.x === "function") ? Number(node.x()) : NaN,
      y: (typeof node.y === "function") ? Number(node.y()) : NaN,
      width: (typeof node.width === "function") ? Number(node.width()) : NaN,
      height: (typeof node.height === "function") ? Number(node.height()) : NaN,
      scaleX: (typeof node.scaleX === "function") ? Number(node.scaleX()) : NaN,
      scaleY: (typeof node.scaleY === "function") ? Number(node.scaleY()) : NaN
    };
    const prevCrop = {
      x: (typeof node.cropX === "function") ? Number(node.cropX()) : NaN,
      y: (typeof node.cropY === "function") ? Number(node.cropY()) : NaN,
      width: (typeof node.cropWidth === "function") ? Number(node.cropWidth()) : NaN,
      height: (typeof node.cropHeight === "function") ? Number(node.cropHeight()) : NaN
    };
    const hadCrop = Number.isFinite(prevCrop.width) && Number.isFinite(prevCrop.height) && prevCrop.width > 0 && prevCrop.height > 0;
    const prevImage = (typeof node.image === "function") ? node.image() : null;
    const prevNatural = {
      width: Number(prevImage && (prevImage.naturalWidth || prevImage.width)) || 0,
      height: Number(prevImage && (prevImage.naturalHeight || prevImage.height)) || 0
    };
    const nextNatural = {
      width: Number(loaded && (loaded.naturalWidth || loaded.width)) || 0,
      height: Number(loaded && (loaded.naturalHeight || loaded.height)) || 0
    };

    if (typeof node.clearCache === "function") node.clearCache();

    // Uwaga: nie wolno robić setAttrs({...oldAttrs}), bo oldAttrs zawiera `image`
    // i przywraca poprzednią bitmapę (efekt "brak reakcji").
    node.image(loaded);
    if (hadCrop && typeof node.crop === "function") {
      const canScaleCrop = prevNatural.width > 0 && prevNatural.height > 0 && nextNatural.width > 0 && nextNatural.height > 0;
      if (canScaleCrop) {
        const ratioX = nextNatural.width / prevNatural.width;
        const ratioY = nextNatural.height / prevNatural.height;
        const minW = 1;
        const minH = 1;
        const maxW = Math.max(minW, nextNatural.width);
        const maxH = Math.max(minH, nextNatural.height);
        let x = Number(prevCrop.x) * ratioX;
        let y = Number(prevCrop.y) * ratioY;
        let w = Number(prevCrop.width) * ratioX;
        let h = Number(prevCrop.height) * ratioY;
        if (!Number.isFinite(x)) x = 0;
        if (!Number.isFinite(y)) y = 0;
        if (!Number.isFinite(w) || w <= 0) w = maxW;
        if (!Number.isFinite(h) || h <= 0) h = maxH;
        w = Math.max(minW, Math.min(maxW, w));
        h = Math.max(minH, Math.min(maxH, h));
        x = Math.max(0, Math.min(Math.max(0, maxW - w), x));
        y = Math.max(0, Math.min(Math.max(0, maxH - h), y));
        node.crop({ x, y, width: w, height: h });
      } else {
        node.crop({
          x: Number.isFinite(prevCrop.x) ? prevCrop.x : 0,
          y: Number.isFinite(prevCrop.y) ? prevCrop.y : 0,
          width: Number.isFinite(prevCrop.width) ? prevCrop.width : 1,
          height: Number.isFinite(prevCrop.height) ? prevCrop.height : 1
        });
      }
    }
    if (Number.isFinite(prevGeom.width) && prevGeom.width > 0 && typeof node.width === "function") {
      node.width(prevGeom.width);
    }
    if (Number.isFinite(prevGeom.height) && prevGeom.height > 0 && typeof node.height === "function") {
      node.height(prevGeom.height);
    }
    if (Number.isFinite(prevGeom.scaleX) && typeof node.scaleX === "function") {
      node.scaleX(prevGeom.scaleX);
    }
    if (Number.isFinite(prevGeom.scaleY) && typeof node.scaleY === "function") {
      node.scaleY(prevGeom.scaleY);
    }
    if (Number.isFinite(prevGeom.x) && typeof node.x === "function") {
      node.x(prevGeom.x);
    }
    if (Number.isFinite(prevGeom.y) && typeof node.y === "function") {
      node.y(prevGeom.y);
    }
    if (typeof node.setAttr === "function") {
      node.setAttr("originalSrc", cleanedDataUrl);
      node.setAttr("originalSrcBeforeRmbg", srcBeforeRmbg || srcBefore || cleanedDataUrl);
    }
  }

  async function removeBgFromKonvaNode(node, options = {}) {
    if (!node || !window.Konva || !(node instanceof window.Konva.Image)) {
      throw new Error("Brak poprawnego wezla Konva.Image.");
    }

    const candidates = getSourceCandidatesFromKonvaNode(node);
    if (!candidates.length) {
      throw new Error("Nie znaleziono zrodla obrazu do usuniecia tla.");
    }

    let cleaned = "";
    let lastErr = null;
    const localTimeoutMs = Number.isFinite(options.localTimeoutMs) ? Number(options.localTimeoutMs) : 12000;
    for (let i = 0; i < candidates.length; i++) {
      const src = candidates[i];
      try {
        cleaned = await Promise.race([
          removeBackgroundLocalFloodFill(src, options),
          new Promise((_, reject) => setTimeout(() => reject(new Error("LOCAL_TIMEOUT")), localTimeoutMs))
        ]);
        if (cleaned) break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!cleaned) throw lastErr || new Error("Brak wyniku z usuwania tla.");
    await applyCleanedToKonvaNode(node, cleaned);
    return cleaned;
  }

  function toast(msg, type) {
    if (typeof window.showAppToast === "function") {
      window.showAppToast(msg, type || "info");
      return;
    }
    let el = document.getElementById("removeBgToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "removeBgToast";
      el.style.cssText = [
        "position:fixed",
        "right:24px",
        "bottom:24px",
        "z-index:10000001",
        "padding:12px 16px",
        "border-radius:10px",
        "font-family:Arial,sans-serif",
        "font-weight:600",
        "font-size:13px",
        "color:#fff",
        "opacity:0",
        "transform:translateY(8px)",
        "transition:all .2s ease",
        "box-shadow:0 10px 28px rgba(0,0,0,.24)"
      ].join(";");
      document.body.appendChild(el);
    }
    const bg = type === "error" ? "#d9534f" : (type === "success" ? "#28a745" : "#007cba");
    el.style.background = bg;
    el.textContent = String(msg || "");
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
    clearTimeout(window.__removeBgToastTimer);
    window.__removeBgToastTimer = setTimeout(() => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
    }, 2300);

    if (type === "error" && typeof window.alert === "function") {
      window.alert(msg);
    }
  }

  function isUsableProductImage(node) {
    return !!(
      window.Konva &&
      node instanceof window.Konva.Image &&
      node.getAttr &&
      !node.getAttr("isBarcode") &&
      !node.getAttr("isTNZBadge") &&
      !node.getAttr("isCountryBadge") &&
      !node.getAttr("isOverlayElement")
    );
  }

  function findUsableImageInNode(node) {
    if (!node) return null;
    if (isUsableProductImage(node)) return node;
    if (window.Konva && node instanceof window.Konva.Group && typeof node.findOne === "function") {
      const found = node.findOne((child) => isUsableProductImage(child));
      if (found) return found;
    }
    return null;
  }

  function resolveTargetImageNode(page, obj) {
    const selected = page && Array.isArray(page.selectedNodes) ? page.selectedNodes : [];
    for (let i = 0; i < selected.length; i++) {
      const found = findUsableImageInNode(selected[i]);
      if (found) return found;
    }
    try {
      if (page && page.transformer && typeof page.transformer.nodes === "function") {
        const trNodes = page.transformer.nodes() || [];
        for (let i = 0; i < trNodes.length; i++) {
          const found = findUsableImageInNode(trNodes[i]);
          if (found) return found;
        }
      }
    } catch (_err) {}
    return findUsableImageInNode(obj);
  }

  function ensureRemoveBgUiStyles() {
    if (document.getElementById("removeBgUiStyles")) return;
    const style = document.createElement("style");
    style.id = "removeBgUiStyles";
    style.textContent = `
      @keyframes rmbgSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes rmbgPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,99,235,0.36); }
        50% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(37,99,235,0); }
      }
      @keyframes rmbgShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }

  function computeNodeViewportRect(node) {
    try {
      if (!node || typeof node.getClientRect !== "function") return null;
      const stage = typeof node.getStage === "function" ? node.getStage() : null;
      const container = stage && typeof stage.container === "function" ? stage.container() : null;
      if (!stage || !container) return null;
      const stageRect = container.getBoundingClientRect();
      const nodeRect = node.getClientRect({ skipShadow: true });
      const stageW = Number(stage.width && stage.width()) || 1;
      const stageH = Number(stage.height && stage.height()) || 1;
      const ratioX = stageRect.width / stageW;
      const ratioY = stageRect.height / stageH;
      return {
        left: stageRect.left + nodeRect.x * ratioX,
        top: stageRect.top + nodeRect.y * ratioY,
        width: Math.max(12, nodeRect.width * ratioX),
        height: Math.max(12, nodeRect.height * ratioY)
      };
    } catch (_err) {
      return null;
    }
  }

  function showRemoveBgProcessingOverlay(targetNode) {
    ensureRemoveBgUiStyles();

    let overlay = document.getElementById("removeBgProgressOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "removeBgProgressOverlay";
      overlay.style.cssText = [
        "position:fixed",
        "inset:0",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "background:rgba(15,23,42,.42)",
        "backdrop-filter:blur(4px)",
        "z-index:10000020",
        "pointer-events:auto"
      ].join(";");
      overlay.innerHTML = `
        <div id="removeBgFocusBox" style="display:none;position:fixed;border:2px solid #60a5fa;border-radius:12px;animation:rmbgPulse 1.2s ease-in-out infinite;"></div>
        <div style="width:min(460px,92vw);border-radius:18px;background:#fff;padding:18px 18px 16px;border:1px solid #dbe4ff;box-shadow:0 28px 80px rgba(2,6,23,.42);font-family:Inter,Arial,sans-serif;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:999px;border:3px solid #dbeafe;border-top-color:#2563eb;animation:rmbgSpin .9s linear infinite;"></div>
            <div>
              <div style="font-size:17px;font-weight:700;color:#0f172a;">Usuwanie tła</div>
              <div id="removeBgProgressStep" style="margin-top:2px;font-size:12.5px;color:#475569;">Analiza obrazu…</div>
            </div>
          </div>
          <div style="margin-top:14px;height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden;">
            <div id="removeBgProgressFill" style="height:100%;width:8%;border-radius:999px;background:linear-gradient(90deg,#1d4ed8,#38bdf8,#1d4ed8);background-size:220% 100%;animation:rmbgShimmer 1.3s linear infinite;transition:width .18s ease;"></div>
          </div>
          <div id="removeBgProgressPercent" style="margin-top:7px;font-size:12px;color:#64748b;text-align:right;">8%</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const focusBox = document.getElementById("removeBgFocusBox");
    const fill = document.getElementById("removeBgProgressFill");
    const percent = document.getElementById("removeBgProgressPercent");
    const step = document.getElementById("removeBgProgressStep");

    const rect = computeNodeViewportRect(targetNode);
    if (focusBox && rect) {
      focusBox.style.display = "block";
      focusBox.style.left = `${Math.round(rect.left)}px`;
      focusBox.style.top = `${Math.round(rect.top)}px`;
      focusBox.style.width = `${Math.round(rect.width)}px`;
      focusBox.style.height = `${Math.round(rect.height)}px`;
    } else if (focusBox) {
      focusBox.style.display = "none";
    }

    const phases = [
      "Analiza obrazu…",
      "Wykrywanie granic obiektu…",
      "Czyszczenie tła…",
      "Wygładzanie krawędzi…"
    ];
    let progress = 8;
    let phaseIndex = 0;
    let progressTimer = null;
    let phaseTimer = null;

    const setProgress = (value) => {
      progress = Math.max(8, Math.min(99, Number(value) || 8));
      if (fill) fill.style.width = `${progress}%`;
      if (percent) percent.textContent = `${Math.round(progress)}%`;
    };
    const setStep = (text) => {
      if (step) step.textContent = String(text || "");
    };

    setProgress(8);
    setStep(phases[0]);

    progressTimer = setInterval(() => {
      const inc = progress < 55 ? 2.2 : (progress < 80 ? 1.2 : 0.45);
      setProgress(progress + inc + Math.random() * 0.4);
    }, 170);
    phaseTimer = setInterval(() => {
      phaseIndex = (phaseIndex + 1) % phases.length;
      setStep(phases[phaseIndex]);
    }, 1250);

    const cleanup = () => {
      clearInterval(progressTimer);
      clearInterval(phaseTimer);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    return {
      success() {
        setStep("Finalizacja…");
        setProgress(100);
        setTimeout(cleanup, 220);
      },
      error() {
        setStep("Nie udało się usunąć tła.");
        if (fill) fill.style.background = "linear-gradient(90deg,#dc2626,#f97316)";
        setProgress(Math.max(progress, 92));
        setTimeout(cleanup, 680);
      },
      dispose: cleanup
    };
  }

  async function runRemoveBgAction(ctx = {}) {
    if (!window.Konva) throw new Error("Konva nie jest zaladowana.");
    const page = ctx.page || null;
    const layer = ctx.layer || (page && page.layer) || null;
    const obj = ctx.obj || null;
    const setupProductImageDrag = typeof ctx.setupProductImageDrag === "function" ? ctx.setupProductImageDrag : null;
    const options = ctx.options && typeof ctx.options === "object" ? ctx.options : {};

    const targetImg = resolveTargetImageNode(page, obj);
    if (!targetImg) {
      const msg = "Zaznacz zdjęcie produktu, aby usunąć tło.";
      toast(msg, "error");
      throw new Error(msg);
    }

    const progressUi = showRemoveBgProcessingOverlay(targetImg);
    toast("Usuwanie tła…", "info");
    try {
      await removeBgFromKonvaNode(targetImg, options);
      progressUi.success();
    } catch (err) {
      progressUi.error();
      throw err;
    }

    if (typeof targetImg.clearCache === "function") targetImg.clearCache();
    targetImg.listening(true);
    targetImg.draggable(true);

    if (setupProductImageDrag && layer) {
      try { setupProductImageDrag(targetImg, layer); } catch (_err) {}
    }

    if (page && page.transformer && typeof page.transformer.nodes === "function") {
      page.transformer.nodes([targetImg]);
    }
    if (page && Array.isArray(page.selectedNodes)) {
      page.selectedNodes = [targetImg];
    }
    if (layer && typeof layer.batchDraw === "function") {
      layer.batchDraw();
    }
    if (page && page.transformerLayer && typeof page.transformerLayer.batchDraw === "function") {
      page.transformerLayer.batchDraw();
    }

    toast("Usunięto tło zdjęcia.", "success");
    return targetImg;
  }

  window.removeBackgroundLocalFloodFill = removeBackgroundLocalFloodFill;
  window.removeBgFromKonvaNode = removeBgFromKonvaNode;
  window.runRemoveBgAction = runRemoveBgAction;
})();

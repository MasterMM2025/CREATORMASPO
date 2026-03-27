(function () {
  "use strict";

  const REMOVE_BG_PROVIDER_STORAGE_KEY = "removeBg.provider";
  const PREMIUM_REMOVE_BG_COOLDOWN_MS = 3 * 60 * 1000;
  const LOCAL_REMOVE_BG_COOLDOWN_MS = 45 * 1000;
  const premiumRemoveBgRuntime = {
    disabledUntil: 0,
    lastReason: ""
  };
  const localAiRemoveBgRuntime = {
    disabledUntil: 0,
    lastReason: "",
    healthCheckedAt: 0,
    healthyUntil: 0
  };

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

    function collectRegionStats(x0, y0, x1, y1) {
      const minX = Math.max(0, Math.min(w, Math.floor(x0)));
      const minY = Math.max(0, Math.min(h, Math.floor(y0)));
      const maxX = Math.max(minX, Math.min(w, Math.ceil(x1)));
      const maxY = Math.max(minY, Math.min(h, Math.ceil(y1)));
      let count = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumLuma = 0;
      let sumSat = 0;

      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
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
          sumR += r;
          sumG += g;
          sumB += b;
          sumLuma += luma;
          sumSat += sat;
          count++;
        }
      }

      if (!count) {
        return {
          count: 0,
          meanR: 0,
          meanG: 0,
          meanB: 0,
          meanLuma: 0,
          meanSat: 0
        };
      }

      return {
        count,
        meanR: sumR / count,
        meanG: sumG / count,
        meanB: sumB / count,
        meanLuma: sumLuma / count,
        meanSat: sumSat / count
      };
    }

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
    const centerStats = collectRegionStats(w * 0.22, h * 0.18, w * 0.78, h * 0.88);
    const riskyLowContrastSubject = !!(
      borderStats &&
      centerStats.count >= 20 &&
      centerStats.meanLuma >= Math.max(155, THRESHOLD_LUMA - 35) &&
      centerStats.meanSat <= Math.min(24, MAX_SAT_FOR_BG + 6) &&
      Math.hypot(
        centerStats.meanR - borderStats.meanR,
        centerStats.meanG - borderStats.meanG,
        centerStats.meanB - borderStats.meanB
      ) <= Math.max(26, borderStats.distThreshold * 0.78)
    );

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

    function evaluateForegroundPreservation() {
      const centerX0 = Math.max(0, Math.floor(w * 0.2));
      const centerY0 = Math.max(0, Math.floor(h * 0.18));
      const centerX1 = Math.min(w, Math.ceil(w * 0.8));
      const centerY1 = Math.min(h, Math.ceil(h * 0.88));
      const centerArea = Math.max(1, (centerX1 - centerX0) * (centerY1 - centerY0));
      const opaqueAlphaCutoff = Math.max(40, FINAL_ALPHA_CUTOFF + 10);
      let opaqueCount = 0;
      let alphaSum = 0;
      let centerOpaqueCount = 0;
      let centerAlphaSum = 0;
      let minX = w;
      let minY = h;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const alpha = data[(y * w + x) * 4 + 3];
          alphaSum += alpha;
          const inCenter = x >= centerX0 && x < centerX1 && y >= centerY0 && y < centerY1;
          if (inCenter) centerAlphaSum += alpha;
          if (alpha < opaqueAlphaCutoff) continue;
          opaqueCount++;
          if (inCenter) centerOpaqueCount++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }

      const bboxAreaRatio = maxX >= minX && maxY >= minY
        ? (((maxX - minX + 1) * (maxY - minY + 1)) / (w * h))
        : 0;

      return {
        opaqueRatio: opaqueCount / (w * h),
        alphaRatio: alphaSum / (w * h * 255),
        centerOpaqueRatio: centerOpaqueCount / centerArea,
        centerAlphaRatio: centerAlphaSum / (centerArea * 255),
        bboxAreaRatio
      };
    }

    const preservation = evaluateForegroundPreservation();
    const unsafeLowContrastRemoval = riskyLowContrastSubject && (
      preservation.bboxAreaRatio < 0.24 ||
      preservation.centerAlphaRatio < 0.24 ||
      (preservation.alphaRatio < 0.22 && preservation.centerOpaqueRatio < 0.16)
    );
    if (unsafeLowContrastRemoval && !options.allowUnsafeLowContrastRemoval) {
      throw new Error("LOCAL_UNSAFE_FOR_LOW_CONTRAST_SUBJECT");
    }

    cctx.putImageData(imageData, 0, 0);
    return c.toDataURL("image/png");
  }

  async function evaluateResultAlphaPreservation(imgData) {
    const srcRaw = String(imgData || "").trim();
    if (!srcRaw) {
      return {
        opaqueRatio: 0,
        alphaRatio: 0,
        centerOpaqueRatio: 0,
        centerAlphaRatio: 0,
        bboxAreaRatio: 0
      };
    }

    const src = await normalizeSourceForPixelRead(srcRaw);
    const imageEl = await loadImageFromSrc(src);
    const w = Math.max(1, Number(imageEl.naturalWidth || imageEl.width || 1));
    const h = Math.max(1, Number(imageEl.naturalHeight || imageEl.height || 1));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cctx = c.getContext("2d", { willReadFrequently: true });
    if (!cctx) {
      return {
        opaqueRatio: 0,
        alphaRatio: 0,
        centerOpaqueRatio: 0,
        centerAlphaRatio: 0,
        bboxAreaRatio: 0
      };
    }

    cctx.drawImage(imageEl, 0, 0, w, h);
    const imageData = cctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const centerX0 = Math.max(0, Math.floor(w * 0.2));
    const centerY0 = Math.max(0, Math.floor(h * 0.18));
    const centerX1 = Math.min(w, Math.ceil(w * 0.8));
    const centerY1 = Math.min(h, Math.ceil(h * 0.88));
    const centerArea = Math.max(1, (centerX1 - centerX0) * (centerY1 - centerY0));
    const opaqueAlphaCutoff = 40;
    let opaqueCount = 0;
    let alphaSum = 0;
    let centerOpaqueCount = 0;
    let centerAlphaSum = 0;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        alphaSum += alpha;
        const inCenter = x >= centerX0 && x < centerX1 && y >= centerY0 && y < centerY1;
        if (inCenter) centerAlphaSum += alpha;
        if (alpha < opaqueAlphaCutoff) continue;
        opaqueCount++;
        if (inCenter) centerOpaqueCount++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    return {
      opaqueRatio: opaqueCount / (w * h),
      alphaRatio: alphaSum / (w * h * 255),
      centerOpaqueRatio: centerOpaqueCount / centerArea,
      centerAlphaRatio: centerAlphaSum / (centerArea * 255),
      bboxAreaRatio: maxX >= minX && maxY >= minY
        ? (((maxX - minX + 1) * (maxY - minY + 1)) / (w * h))
        : 0
    };
  }

  function shouldRejectLocalAiResult(preservation) {
    if (!preservation || typeof preservation !== "object") return true;
    return !!(
      preservation.bboxAreaRatio < 0.16 ||
      preservation.centerAlphaRatio < 0.22 ||
      (preservation.alphaRatio < 0.16 && preservation.centerOpaqueRatio < 0.18)
    );
  }

  async function cleanupPrimarySubjectAlpha(imgData) {
    const srcRaw = String(imgData || "").trim();
    if (!srcRaw) return srcRaw;

    const src = await normalizeSourceForPixelRead(srcRaw);
    const imageEl = await loadImageFromSrc(src);
    const w = Math.max(1, Number(imageEl.naturalWidth || imageEl.width || 1));
    const h = Math.max(1, Number(imageEl.naturalHeight || imageEl.height || 1));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cctx = c.getContext("2d", { willReadFrequently: true });
    if (!cctx) return srcRaw;

    cctx.drawImage(imageEl, 0, 0, w, h);
    const imageData = cctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const alphaHist = new Uint32Array(256);
    for (let i = 0; i < w * h; i++) {
      alphaHist[data[i * 4 + 3]]++;
    }

    let nonZeroAlphaCount = 0;
    for (let value = 8; value < 256; value++) nonZeroAlphaCount += alphaHist[value];

    function percentileAlpha(pct) {
      const target = Math.max(1, Math.floor(nonZeroAlphaCount * Math.max(0, Math.min(1, pct))));
      let acc = 0;
      for (let value = 8; value < 256; value++) {
        acc += alphaHist[value];
        if (acc >= target) return value;
      }
      return 255;
    }

    if (nonZeroAlphaCount < Math.max(120, (w * h) * 0.01)) return srcRaw;

    const strongCutoff = Math.max(60, Math.min(168, percentileAlpha(0.84)));
    const looseCutoff = Math.max(22, Math.min(72, strongCutoff - 34));
    const strong = new Uint8Array(w * h);
    const loose = new Uint8Array(w * h);
    const strongVisited = new Uint8Array(w * h);
    const looseVisited = new Uint8Array(w * h);

    for (let i = 0; i < w * h; i++) {
      const alpha = data[i * 4 + 3];
      if (alpha >= looseCutoff) loose[i] = 1;
      if (alpha >= strongCutoff) strong[i] = 1;
    }

    const centerX = w * 0.5;
    const centerY = h * 0.52;
    let bestScore = -Infinity;
    let bestCorePixels = null;
    let bestBounds = null;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const startIdx = y * w + x;
        if (!strong[startIdx] || strongVisited[startIdx]) continue;

        const stack = [startIdx];
        const pixels = [];
        strongVisited[startIdx] = 1;
        let minX = x;
        let minY = y;
        let maxX = x;
        let maxY = y;
        let sumX = 0;
        let sumY = 0;

        while (stack.length) {
          const idx = stack.pop();
          const px = idx % w;
          const py = (idx / w) | 0;
          pixels.push(idx);
          sumX += px;
          sumY += py;
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;

          const neighbors = [
            idx - 1,
            idx + 1,
            idx - w,
            idx + w
          ];
          for (let n = 0; n < neighbors.length; n++) {
            const nextIdx = neighbors[n];
            if (nextIdx < 0 || nextIdx >= w * h) continue;
            const nx = nextIdx % w;
            const ny = (nextIdx / w) | 0;
            if (Math.abs(nx - px) + Math.abs(ny - py) !== 1) continue;
            if (!strong[nextIdx] || strongVisited[nextIdx]) continue;
            strongVisited[nextIdx] = 1;
            stack.push(nextIdx);
          }
        }

        const area = pixels.length;
        if (area < Math.max(180, (w * h) * 0.0025)) continue;
        const cx = sumX / area;
        const cy = sumY / area;
        const centerDistance = Math.abs(cx - centerX) + Math.abs(cy - centerY);
        const touchesBorder = minX <= 0 || minY <= 0 || maxX >= (w - 1) || maxY >= (h - 1);
        const score = area - (centerDistance * 3.8) - (touchesBorder ? area * 0.14 : 0);

        if (score > bestScore) {
          bestScore = score;
          bestCorePixels = pixels;
          bestBounds = { minX, minY, maxX, maxY };
        }
      }
    }

    if (!bestCorePixels || !bestBounds) return srcRaw;

    const keep = new Uint8Array(w * h);
    const coreSet = new Uint8Array(w * h);
    for (let i = 0; i < bestCorePixels.length; i++) {
      const idx = bestCorePixels[i];
      keep[idx] = 1;
      coreSet[idx] = 1;
    }

    const coreArea = bestCorePixels.length;
    const expandedMinX = Math.max(0, bestBounds.minX - Math.max(12, Math.round((bestBounds.maxX - bestBounds.minX + 1) * 0.18)));
    const expandedMinY = Math.max(0, bestBounds.minY - Math.max(12, Math.round((bestBounds.maxY - bestBounds.minY + 1) * 0.12)));
    const expandedMaxX = Math.min(w - 1, bestBounds.maxX + Math.max(12, Math.round((bestBounds.maxX - bestBounds.minX + 1) * 0.18)));
    const expandedMaxY = Math.min(h - 1, bestBounds.maxY + Math.max(12, Math.round((bestBounds.maxY - bestBounds.minY + 1) * 0.12)));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const startIdx = y * w + x;
        if (!loose[startIdx] || looseVisited[startIdx]) continue;

        const stack = [startIdx];
        const pixels = [];
        looseVisited[startIdx] = 1;
        let minX = x;
        let minY = y;
        let maxX = x;
        let maxY = y;
        let touchesCore = !!coreSet[startIdx];

        while (stack.length) {
          const idx = stack.pop();
          const px = idx % w;
          const py = (idx / w) | 0;
          pixels.push(idx);
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
          if (coreSet[idx]) touchesCore = true;

          const neighbors = [
            idx - 1,
            idx + 1,
            idx - w,
            idx + w
          ];
          for (let n = 0; n < neighbors.length; n++) {
            const nextIdx = neighbors[n];
            if (nextIdx < 0 || nextIdx >= w * h) continue;
            const nx = nextIdx % w;
            const ny = (nextIdx / w) | 0;
            if (Math.abs(nx - px) + Math.abs(ny - py) !== 1) continue;
            if (!loose[nextIdx] || looseVisited[nextIdx]) continue;
            looseVisited[nextIdx] = 1;
            stack.push(nextIdx);
          }
        }

        const area = pixels.length;
        const overlapsExpandedMain = !(
          maxX < expandedMinX ||
          minX > expandedMaxX ||
          maxY < expandedMinY ||
          minY > expandedMaxY
        );
        const largeEnough = area >= Math.max(180, Math.round(coreArea * 0.08));
        const shouldKeep = touchesCore || (largeEnough && overlapsExpandedMain);
        if (!shouldKeep) continue;
        for (let i = 0; i < pixels.length; i++) {
          keep[pixels[i]] = 1;
        }
      }
    }

    for (let i = 0; i < w * h; i++) {
      if (keep[i]) continue;
      data[i * 4 + 3] = 0;
    }

    cctx.putImageData(imageData, 0, 0);
    return c.toDataURL("image/png");
  }

  async function dehaloCutoutImage(imgData, options = {}) {
    const srcRaw = String(imgData || "").trim();
    if (!srcRaw) return srcRaw;

    const src = await normalizeSourceForPixelRead(srcRaw);
    const imageEl = await loadImageFromSrc(src);
    const w = Math.max(1, Number(imageEl.naturalWidth || imageEl.width || 1));
    const h = Math.max(1, Number(imageEl.naturalHeight || imageEl.height || 1));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cctx = c.getContext("2d", { willReadFrequently: true });
    if (!cctx) return srcRaw;

    cctx.drawImage(imageEl, 0, 0, w, h);
    const imageData = cctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const passes = Number.isFinite(options.dehaloPasses) ? Math.max(1, Math.min(4, Number(options.dehaloPasses))) : 3;

    for (let pass = 0; pass < passes; pass++) {
      const source = new Uint8ClampedArray(data);
      let changed = false;

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          const alpha = source[idx + 3];
          if (alpha >= 250) continue;

          let weightSum = 0;
          let sumR = 0;
          let sumG = 0;
          let sumB = 0;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nIdx = ((y + dy) * w + (x + dx)) * 4;
              const nAlpha = source[nIdx + 3];
              if (nAlpha < Math.max(40, alpha + 12)) continue;
              const weight = Math.pow(nAlpha / 255, 1.5);
              weightSum += weight;
              sumR += source[nIdx] * weight;
              sumG += source[nIdx + 1] * weight;
              sumB += source[nIdx + 2] * weight;
            }
          }

          if (weightSum <= 0) continue;
          const avgR = sumR / weightSum;
          const avgG = sumG / weightSum;
          const avgB = sumB / weightSum;
          const blend = alpha <= 8
            ? 1
            : alpha <= 96
              ? 1
              : alpha <= 180
                ? 0.92
                : alpha <= 235
                  ? 0.78
                  : 0.55;

          data[idx] = Math.round((source[idx] * (1 - blend)) + (avgR * blend));
          data[idx + 1] = Math.round((source[idx + 1] * (1 - blend)) + (avgG * blend));
          data[idx + 2] = Math.round((source[idx + 2] * (1 - blend)) + (avgB * blend));
          changed = true;
        }
      }

      if (!changed) break;
    }

    cctx.putImageData(imageData, 0, 0);
    return c.toDataURL("image/png");
  }

  function isDataUrl(value) {
    return String(value || "").trim().startsWith("data:");
  }

  function isHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
  }

  function normalizeProviderName(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    if (raw === "remove.bg") return "removebg";
    if (raw === "removebg") return "removebg";
    if (raw === "photoroom") return "photoroom";
    if (raw === "auto") return "auto";
    return "";
  }

  function getStoredRemoveBgProvider() {
    try {
      return normalizeProviderName(window.localStorage && window.localStorage.getItem(REMOVE_BG_PROVIDER_STORAGE_KEY));
    } catch (_err) {
      return "";
    }
  }

  function getPreferredRemoveBgProvider(options = {}) {
    return (
      normalizeProviderName(options.provider) ||
      normalizeProviderName(window.REMOVE_BG_PROVIDER) ||
      getStoredRemoveBgProvider() ||
      "auto"
    );
  }

  function hasPremiumRemoveBgConfigured() {
    try {
      if (normalizeProviderName(window.REMOVE_BG_PROVIDER)) return true;
      if (getStoredRemoveBgProvider()) return true;
      if (String(window.REMOVE_BG_BACKEND_URL || "").trim()) return true;
    } catch (_err) {}
    return false;
  }

  function isLikelyLocalDevHost(hostname) {
    const host = String(hostname || "").trim().toLowerCase();
    return (
      host === "127.0.0.1" ||
      host === "localhost" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  }

  function getLocalRemoveBgBaseUrl(options = {}) {
    const explicit = String(
      options.localAiBaseUrl ||
      window.REMOVE_BG_LOCAL_BASE_URL ||
      ""
    ).trim();
    if (explicit) return explicit.replace(/\/+$/, "");
    try {
      const origin = String(window.location && window.location.origin || "").trim();
      const hostname = String(window.location && window.location.hostname || "").trim();
      if (origin && !isLikelyLocalDevHost(hostname)) {
        return origin.replace(/\/+$/, "");
      }
    } catch (_err) {}
    return "http://127.0.0.1:5103";
  }

  function getLocalRemoveBgApiUrl(options = {}) {
    const explicit = String(options.localAiUrl || window.REMOVE_BG_LOCAL_URL || "").trim();
    if (explicit) return explicit;
    return `${getLocalRemoveBgBaseUrl(options)}/api/remove-background`;
  }

  function getLocalRemoveBgHealthUrl(options = {}) {
    const explicit = String(options.localAiHealthUrl || window.REMOVE_BG_LOCAL_HEALTH_URL || "").trim();
    if (explicit) return explicit;
    return `${getLocalRemoveBgBaseUrl(options)}/api/health`;
  }

  function getRemoveBgBackendUrl(options = {}) {
    const raw = String(
      options.backendUrl ||
      window.REMOVE_BG_BACKEND_URL ||
      "/api/remove-background"
    ).trim();
    return raw;
  }

  function shouldTryPremiumRemoveBg(options = {}) {
    if (options.usePremium === false) return false;
    if (options.usePremium !== true && !hasPremiumRemoveBgConfigured()) return false;
    return Date.now() >= premiumRemoveBgRuntime.disabledUntil;
  }

  function shouldTryLocalAiRemoveBg(options = {}) {
    if (options.useLocalAi === false) return false;
    return true;
  }

  function disablePremiumRemoveBgTemporarily(reason) {
    premiumRemoveBgRuntime.disabledUntil = Date.now() + PREMIUM_REMOVE_BG_COOLDOWN_MS;
    premiumRemoveBgRuntime.lastReason = String(reason || "premium remove bg unavailable");
  }

  function disableLocalAiRemoveBgTemporarily(reason) {
    localAiRemoveBgRuntime.disabledUntil = Date.now() + LOCAL_REMOVE_BG_COOLDOWN_MS;
    localAiRemoveBgRuntime.lastReason = String(reason || "local ai remove bg unavailable");
    localAiRemoveBgRuntime.healthyUntil = 0;
    localAiRemoveBgRuntime.healthCheckedAt = Date.now();
  }

  function shouldCooldownLocalAiError(err) {
    const status = Number(err && err.status);
    if ([0, 502, 503, 504].includes(status)) return true;
    const msg = String(err && err.message ? err.message : err || "").toLowerCase();
    return (
      msg.includes("local_ai_server_unavailable") ||
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("load failed") ||
      msg.includes("aborted")
    );
  }

  async function ensureLocalAiServerHealthy(options = {}) {
    const now = Date.now();
    if (localAiRemoveBgRuntime.healthyUntil > now) return true;
    if (localAiRemoveBgRuntime.healthCheckedAt && (now - localAiRemoveBgRuntime.healthCheckedAt) < 2500) {
      return false;
    }

    localAiRemoveBgRuntime.healthCheckedAt = now;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1400);

    try {
      const response = await fetch(getLocalRemoveBgHealthUrl(options), {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: ctrl.signal
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      localAiRemoveBgRuntime.healthyUntil = Date.now() + 15000;
      localAiRemoveBgRuntime.disabledUntil = 0;
      return true;
    } catch (err) {
      disableLocalAiRemoveBgTemporarily(err && err.message ? err.message : err);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function shouldCooldownPremiumError(err) {
    const status = Number(err && err.status);
    if ([404, 405, 501, 503].includes(status)) return true;
    const msg = String(err && err.message ? err.message : err || "").toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("aborted") ||
      msg.includes("brak skonfigurowanego providera")
    );
  }

  function shouldStopPremiumRetries(err) {
    const status = Number(err && err.status);
    if ([400, 401, 403, 404, 405, 413, 422, 429, 500, 501, 502, 503].includes(status)) return true;
    const msg = String(err && err.message ? err.message : err || "").toLowerCase();
    return msg.includes("provider") || msg.includes("fetch") || msg.includes("nie udalo sie");
  }

  function getFileNameFromSource(src) {
    const raw = String(src || "").trim();
    if (!raw) return "upload.png";
    if (isDataUrl(raw)) return "upload.png";
    try {
      const parsed = new URL(raw, window.location.href);
      const tail = String(parsed.pathname || "").split("/").pop() || "upload.png";
      const safe = tail.replace(/[^a-zA-Z0-9._-]+/g, "-");
      if (!safe) return "upload.png";
      return /\.[a-z0-9]{2,8}$/i.test(safe) ? safe : `${safe}.png`;
    } catch (_err) {
      return "upload.png";
    }
  }

  async function sourceToPremiumPayload(src) {
    const normalized = await normalizeSourceForPixelRead(src);
    if (isDataUrl(normalized)) {
      return {
        imageDataUrl: normalized,
        filename: getFileNameFromSource(src)
      };
    }
    if (isHttpUrl(normalized)) {
      return {
        imageUrl: normalized,
        filename: getFileNameFromSource(normalized)
      };
    }
    throw new Error("Nie udalo sie przygotowac obrazu do premium remove background.");
  }

  async function readPremiumError(response) {
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    try {
      if (contentType.includes("application/json")) {
        const payload = await response.json();
        return String(payload && (payload.error || payload.message) || "").trim();
      }
      return String(await response.text() || "").trim().slice(0, 240);
    } catch (_err) {
      return "";
    }
  }

  async function removeBackgroundViaPremiumProxy(src, options = {}) {
    const backendUrl = getRemoveBgBackendUrl(options);
    if (!backendUrl) throw new Error("Brak URL backendu premium remove background.");

    const payload = await sourceToPremiumPayload(src);
    const ctrl = new AbortController();
    const remoteTimeoutMs = Number.isFinite(options.remoteTimeoutMs) ? Number(options.remoteTimeoutMs) : 30000;
    const timer = setTimeout(() => ctrl.abort(), remoteTimeoutMs);

    let response;
    try {
      response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: getPreferredRemoveBgProvider(options),
          imageDataUrl: payload.imageDataUrl || "",
          imageUrl: payload.imageUrl || "",
          filename: payload.filename || "upload.png"
        }),
        signal: ctrl.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const details = await readPremiumError(response);
      const err = new Error(details || `Premium remove background HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const blob = await response.blob();
    if (!blob || !blob.size) {
      throw new Error("Premium remove background zwrocil pusty wynik.");
    }

    return {
      cleanedDataUrl: await blobToDataUrl(blob),
      provider: String(response.headers.get("x-remove-bg-provider") || "premium").trim() || "premium"
    };
  }

  async function removeBackgroundViaLocalAiServer(src, options = {}) {
    const localApiUrl = getLocalRemoveBgApiUrl(options);
    if (!localApiUrl) throw new Error("Brak URL lokalnego serwera AI.");

    const isHealthy = await ensureLocalAiServerHealthy(options);
    if (!isHealthy) {
      throw new Error("LOCAL_AI_SERVER_UNAVAILABLE");
    }

    const payload = await sourceToPremiumPayload(src);
    const ctrl = new AbortController();
    const timeoutMs = Number.isFinite(options.localAiTimeoutMs) ? Number(options.localAiTimeoutMs) : 45000;
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(localApiUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageDataUrl: payload.imageDataUrl || "",
          imageUrl: payload.imageUrl || "",
          filename: payload.filename || "upload.png"
        }),
        signal: ctrl.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const details = await readPremiumError(response);
      const err = new Error(details || `Local AI remove background HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const blob = await response.blob();
    if (!blob || !blob.size) {
      throw new Error("Lokalny serwer AI zwrocil pusty wynik.");
    }

    localAiRemoveBgRuntime.healthyUntil = Date.now() + 15000;

    return {
      cleanedDataUrl: await blobToDataUrl(blob),
      provider: String(response.headers.get("x-remove-bg-provider") || "local-ai").trim() || "local-ai"
    };
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

  async function applyCleanedToKonvaNode(node, cleanedDataUrl, meta = {}) {
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
      if (meta.provider) node.setAttr("removeBgProvider", meta.provider);
      node.setAttr("removeBgProcessedAt", Date.now());
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
    let providerUsed = "local";
    let lastErr = null;
    let localAiErr = null;
    let premiumErr = null;
    let premiumTried = false;
    let localAiTried = false;

    if (shouldTryLocalAiRemoveBg(options)) {
      localAiTried = true;
      for (let i = 0; i < candidates.length; i++) {
        const src = candidates[i];
        try {
          const localAiResult = await removeBackgroundViaLocalAiServer(src, options);
          cleaned = String(localAiResult && localAiResult.cleanedDataUrl || "").trim();
          providerUsed = String(localAiResult && localAiResult.provider || "local-ai").trim() || "local-ai";
          if (cleaned) {
            const preservation = await evaluateResultAlphaPreservation(cleaned);
            if (shouldRejectLocalAiResult(preservation)) {
              cleaned = "";
              throw new Error("LOCAL_AI_LOW_CONFIDENCE_RESULT");
            }
          }
          if (cleaned) break;
        } catch (err) {
          lastErr = err;
          localAiErr = err;
          if (String(err && err.message ? err.message : err) === "LOCAL_AI_SERVER_UNAVAILABLE") {
            break;
          }
          if (shouldCooldownLocalAiError(err)) {
            disableLocalAiRemoveBgTemporarily(err && err.message ? err.message : err);
          }
          continue;
        }
      }
    }

    if (shouldTryPremiumRemoveBg(options)) {
      premiumTried = true;
      for (let i = 0; i < candidates.length; i++) {
        const src = candidates[i];
        try {
          const premiumResult = await removeBackgroundViaPremiumProxy(src, options);
          cleaned = String(premiumResult && premiumResult.cleanedDataUrl || "").trim();
          providerUsed = String(premiumResult && premiumResult.provider || "premium").trim() || "premium";
          if (cleaned) break;
        } catch (err) {
          lastErr = err;
          premiumErr = err;
          if (shouldCooldownPremiumError(err)) {
            disablePremiumRemoveBgTemporarily(err && err.message ? err.message : err);
          }
          if (shouldStopPremiumRetries(err)) break;
        }
      }
    }

    const localTimeoutMs = Number.isFinite(options.localTimeoutMs) ? Number(options.localTimeoutMs) : 12000;
    if (!cleaned) {
      for (let i = 0; i < candidates.length; i++) {
        const src = candidates[i];
        try {
          cleaned = await Promise.race([
            removeBackgroundLocalFloodFill(src, options),
            new Promise((_, reject) => setTimeout(() => reject(new Error("LOCAL_TIMEOUT")), localTimeoutMs))
          ]);
          providerUsed = "local";
          if (cleaned) break;
        } catch (err) {
          if (String(err && err.message ? err.message : err) === "LOCAL_UNSAFE_FOR_LOW_CONTRAST_SUBJECT") {
            if (localAiTried && localAiErr && String(localAiErr && localAiErr.message ? localAiErr.message : localAiErr) !== "LOCAL_AI_SERVER_UNAVAILABLE") {
              const localAiMsg = String(localAiErr && localAiErr.message ? localAiErr.message : localAiErr || "").trim();
              if (localAiMsg === "LOCAL_AI_LOW_CONFIDENCE_RESULT") {
                lastErr = new Error("Lokalne AI nie dalo pewnego wyniku dla jasnego zdjecia, a tryb prosty tez wycina obiekt.");
              } else {
                lastErr = new Error(localAiMsg || "Lokalny BiRefNet nie dal wyniku dla tego zdjecia, a tryb prosty zostal zablokowany, bo wycina obiekt.");
              }
            } else if (premiumTried && premiumErr) {
              lastErr = new Error("To zdjecie ma jasny produkt na jasnym tle. Lokalny tryb zostal zablokowany, bo wycina obiekt. Skonfiguruj premium remove background w functions/.env i wdroz endpoint.");
            } else {
              lastErr = new Error("To zdjecie ma jasny produkt na jasnym tle. Uruchom lokalny serwer BiRefNet albo premium AI, bo prosty tryb wycina obiekt.");
            }
          } else {
            lastErr = err;
          }
        }
      }
    }

    if (!cleaned) throw lastErr || new Error("Brak wyniku z usuwania tla.");
    cleaned = await dehaloCutoutImage(cleaned, options);
    await applyCleanedToKonvaNode(node, cleaned, { provider: providerUsed });
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
    const resolved = resolveTargetImageNodes(page, obj);
    return resolved[0] || null;
  }

  function resolveTargetImageNodes(page, obj) {
    const seen = new Set();
    const out = [];
    const pushFound = (node) => {
      const found = findUsableImageInNode(node);
      if (!found || seen.has(found)) return;
      seen.add(found);
      out.push(found);
    };

    const selected = page && Array.isArray(page.selectedNodes) ? page.selectedNodes : [];
    for (let i = 0; i < selected.length; i++) {
      pushFound(selected[i]);
    }
    try {
      if (page && page.transformer && typeof page.transformer.nodes === "function") {
        const trNodes = page.transformer.nodes() || [];
        for (let i = 0; i < trNodes.length; i++) {
          pushFound(trNodes[i]);
        }
      }
    } catch (_err) {}
    pushFound(obj);
    return out;
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

    const targetImgs = resolveTargetImageNodes(page, obj);
    if (!targetImgs.length) {
      const msg = "Zaznacz zdjęcie produktu, aby usunąć tło.";
      toast(msg, "error");
      throw new Error(msg);
    }

    const isBatch = targetImgs.length > 1;
    const selectionSnapshot = page && Array.isArray(page.selectedNodes)
      ? page.selectedNodes.filter(Boolean).slice()
      : [];
    const processed = [];
    const failed = [];

    toast(
      isBatch ? `Usuwanie tła z ${targetImgs.length} zdjęć…` : "Usuwanie tła…",
      "info"
    );

    for (let i = 0; i < targetImgs.length; i++) {
      const targetImg = targetImgs[i];
      const progressUi = showRemoveBgProcessingOverlay(targetImg);
      try {
        await removeBgFromKonvaNode(targetImg, options);
        progressUi.success();

        if (typeof targetImg.clearCache === "function") targetImg.clearCache();
        targetImg.listening(true);
        targetImg.draggable(true);

        if (setupProductImageDrag && layer) {
          try { setupProductImageDrag(targetImg, layer); } catch (_err) {}
        }

        processed.push(targetImg);
      } catch (err) {
        progressUi.error();
        failed.push({ node: targetImg, err });
        if (!isBatch) throw err;
      }
    }

    if (!processed.length) {
      const err = failed[0] && failed[0].err ? failed[0].err : new Error("Nie udało się usunąć tła.");
      throw err;
    }

    if (page && page.transformer && typeof page.transformer.nodes === "function") {
      if (isBatch) {
        page.transformer.nodes(selectionSnapshot.length ? selectionSnapshot : processed);
      } else {
        page.transformer.nodes([processed[0]]);
      }
    }
    if (page && Array.isArray(page.selectedNodes)) {
      page.selectedNodes = isBatch
        ? (selectionSnapshot.length ? selectionSnapshot : processed.slice())
        : [processed[0]];
    }
    if (layer && typeof layer.batchDraw === "function") {
      layer.batchDraw();
    }
    if (page && page.transformerLayer && typeof page.transformerLayer.batchDraw === "function") {
      page.transformerLayer.batchDraw();
    }

    if (failed.length) {
      toast(
        `Usunięto tło z ${processed.length} z ${targetImgs.length} zdjęć.`,
        failed.length < targetImgs.length ? "warning" : "error"
      );
    } else {
      toast(
        isBatch ? `Usunięto tło z ${processed.length} zdjęć.` : "Usunięto tło zdjęcia.",
        "success"
      );
    }

    return isBatch ? processed : processed[0];
  }

  window.removeBackgroundLocalFloodFill = removeBackgroundLocalFloodFill;
  window.removeBgFromKonvaNode = removeBgFromKonvaNode;
  window.configureRemoveBg = function configureRemoveBg(config = {}) {
    if (!config || typeof config !== "object") return;
    const provider = normalizeProviderName(config.provider);
    if (provider) {
      try { window.localStorage.setItem(REMOVE_BG_PROVIDER_STORAGE_KEY, provider); } catch (_err) {}
    }
    if (typeof config.backendUrl === "string") {
      window.REMOVE_BG_BACKEND_URL = String(config.backendUrl).trim();
    }
    if (typeof config.localAiBaseUrl === "string") {
      window.REMOVE_BG_LOCAL_BASE_URL = String(config.localAiBaseUrl).trim();
    }
    if (typeof config.localAiUrl === "string") {
      window.REMOVE_BG_LOCAL_URL = String(config.localAiUrl).trim();
    }
    if (typeof config.localAiHealthUrl === "string") {
      window.REMOVE_BG_LOCAL_HEALTH_URL = String(config.localAiHealthUrl).trim();
    }
  };
  window.runRemoveBgAction = runRemoveBgAction;
})();

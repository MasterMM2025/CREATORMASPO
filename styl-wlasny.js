(function () {
  const STYLE_CUSTOM = "styl_wlasny";
  const DATA_URL = "https://raw.githubusercontent.com/MasterMM2025/masterzamowienia/refs/heads/main/pelna%20baza%20maspo.json";

  let cachedProducts = null;
  let loadingPromise = null;
  const IMAGE_BUCKET_BASE = "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/";
  const IMAGE_FOLDER = "zdjecia - World food";
  const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
  const DIRECT_CUSTOM_MODULE_MODE = true; // testowy tryb: moduł rysowany bez redraw z importdanych.js
  const CUSTOM_MODULE_BASE_WIDTH = 500;
  const CUSTOM_MODULE_BASE_HEIGHT = 362;
  function getRegisteredPriceBadgeStyles() {
    const list = Array.isArray(window.STYL_WLASNY_REGISTRY?.priceBadges)
      ? window.STYL_WLASNY_REGISTRY.priceBadges
      : [];
    return list
      .map((item) => ({
        id: String(item?.id || "").trim(),
        label: String(item?.label || "").trim(),
        path: String(item?.path || "").trim(),
        url: String(item?.url || "").trim()
      }))
      .filter((item) => item.id && item.label);
  }

  const PRICE_BADGE_STYLE_OPTIONS = (() => {
    const out = [{ id: "solid", label: "Kolor koła (domyślny)", path: "" }];
    const seen = new Set(["solid"]);
    getRegisteredPriceBadgeStyles().forEach((styleDef) => {
      if (seen.has(styleDef.id)) return;
      seen.add(styleDef.id);
      out.push(styleDef);
    });
    return out;
  })();
  function getRegisteredModuleLayoutStyles() {
    const list = Array.isArray(window.STYL_WLASNY_REGISTRY?.moduleLayouts)
      ? window.STYL_WLASNY_REGISTRY.moduleLayouts
      : [];
    return list
      .map((item) => ({
        id: String(item?.id || "").trim(),
        label: String(item?.label || "").trim(),
        config: (item?.config && typeof item.config === "object") ? item.config : {}
      }))
      .filter((item) => item.id && item.label);
  }

  const MODULE_LAYOUT_STYLE_OPTIONS = (() => {
    const out = [{ id: "default", label: "Domyślny (styl elegancki)", config: {} }];
    const seen = new Set(["default"]);
    getRegisteredModuleLayoutStyles().forEach((styleDef) => {
      if (seen.has(styleDef.id)) return;
      seen.add(styleDef.id);
      out.push(styleDef);
    });
    return out;
  })();
  const STYLE_FONT_PRESETS = {
    default: { meta: "FactoTrial Bold", price: "FactoTrial Bold" },
    "styl-numer-1": { meta: "FactoTrial Bold", price: "FactoTrial Bold" },
    "styl-numer-2": { meta: "FactoTrial Bold", price: "FactoTrial Bold" },
    "styl-numer-3": { meta: "FactoTrial Bold", price: "FactoTrial Bold" }
  };
  const DEFAULT_STYLE_FONT_PRESET = STYLE_FONT_PRESETS.default;
  const DEFAULT_INDEX_TEXT_COLOR = "#b9b9b9";
  const getStyleFontPreset = (styleId) => STYLE_FONT_PRESETS[String(styleId || "default")] || DEFAULT_STYLE_FONT_PRESET;
  const CUSTOM_SINGLE_STYLE_IDS = new Set(["styl-numer-1", "styl-numer-2", "styl-numer-3"]);
  const isCustomSingleStyle = (styleId) => CUSTOM_SINGLE_STYLE_IDS.has(String(styleId || "").trim());

  let currentPreviewProduct = null;
  let currentPreviewImageUrl = null;
  let currentPickerProduct = null;
  let currentPickerImageUrl = null;
  const customNameOverrides = new Map();
  const customIndexOverrides = new Map();
  const customPriceOverrides = new Map();
  const customImageOverrides = new Map();
  const customResolvedImageUrls = new Map();
  const customResolvedImageUrlsByIndex = new Map();
  const customImageResolvePromisesByIndex = new Map();
  const customImageMetaCache = new Map();
  const customBadgeImageCache = new Map();
  let customDirectModuleSeq = 0;
  let directModuleUngroupProtectionInstalled = false;
  let directModuleStabilityWorkInProgress = false;
  let pendingPreviewExportLayouts = null;
  let isCustomPlacementActive = false;
  let customPriceCircleColor = "#d71920";
  let customPriceBadgeStyleId = "solid";
  let customModuleLayoutStyleId = "default";
  let customPriceTextColor = "#ffffff";
  let customCurrencySymbol = "£";
  let customPriceTextScale = 1;
  let customFamilySpacingTightness = 0.12;
  let CUSTOM_FONT_OPTIONS = [
    "Arial",
    "Inter",
    "Roboto",
    "FactoTrial Regular",
    "FactoTrial Bold",
    "Helvetica",
    "Verdana",
    "Tahoma",
    "Trebuchet MS",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Google Sans Flex"
  ];
  let customMetaFontFamily = DEFAULT_STYLE_FONT_PRESET.meta;
  let customMetaTextColor = "#1f3560";
  let customMetaTextBold = true;
  let customMetaTextUnderline = false;
  let customMetaTextAlign = "left";
  let customPriceFontFamily = DEFAULT_STYLE_FONT_PRESET.price;
  let customPriceTextBold = true;
  let customPriceTextUnderline = false;
  let customPriceTextAlign = "left";
  let customDraftModules = [];
  let customDraftModuleSeq = 0;
  let customFontReadyListenerBound = false;
  let customStyleInteractionsInitialized = false;
  let customGetCurrentEditorSnapshot = null;
  let customRestoreDraftToEditor = null;
  let customEditorProductsById = null;
  let customLastEditorSnapshot = null;
  let familyBaseProduct = null;
  let familyBaseImageUrl = null;
  let currentFamilyProducts = [];
  const CUSTOM_DRAFT_MODULE_LIMIT = 240;
  const CUSTOM_IMPORT_CONCURRENCY = 8;
  const customPreviewVisibility = {
    showFlag: false,
    showBarcode: false
  };

// =====================================================
// RĘCZNA KONFIGURACJA UKŁADU ZDJĘĆ (EDYTUJ TUTAJ)
// =====================================================
// Wartości są w proporcjach 0..1 względem obszaru zdjęcia modułu.
// x,y - pozycja lewego górnego rogu; w,h - szerokość/wysokość.
const CUSTOM_PRODUCT_LAYOUTS = {
  defaults: {
    single: [
      { x: 0.02, y: 0.02, w: 0.96, h: 0.96 }
    ],
    family2: [
      { x: 0.00, y: 0.00,  w: 1.00, h: 0.50 },   // 50% + 50% = idealny podział bez dziury
      { x: 0.00, y: 0.50,  w: 1.00, h: 0.50 }
    ],
    family3: [
      { x: 0.00, y: 0.00, w: 0.48, h: 0.32 },
      { x: 0.52, y: 0.00, w: 0.48, h: 0.32 },
      { x: 0.00, y: 0.34, w: 1.00, h: 0.66 }
    ],
    family4: [
      { x: 0.00, y: 0.00, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0.00, w: 0.49, h: 0.49 },
      { x: 0.00, y: 0.51, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0.51, w: 0.49, h: 0.49 }
    ]
  },
  byMergedIndex: {
    "29552,29554": [
      { x: 0.00, y: 0.00,  w: 1.00, h: 0.50 },
      { x: 0.00, y: 0.50,  w: 1.00, h: 0.50 }
    ]
  },
  byBaseIndex: {
    // opcjonalnie możesz tu dodać dla pojedynczego indeksu
  }
};
  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeIndexKey(value) {
    return String(value || "")
      .split(",")
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b, "pl", { numeric: true, sensitivity: "base" }))
      .join(",");
  }

  function clamp01(n, fallback) {
    const v = Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(0, Math.min(1, v));
  }

  function normalizeFamilySpacingTightness(value, fallback = 0) {
    const v = Number(value);
    if (!Number.isFinite(v)) return Math.max(0, Math.min(0.3, Number(fallback) || 0));
    return Math.max(0, Math.min(0.3, v));
  }

  function sanitizeImageLayouts(layouts, fallbackLayouts) {
    const src = Array.isArray(layouts) && layouts.length ? layouts : fallbackLayouts;
    return (Array.isArray(src) ? src : []).map((item) => ({
      x: clamp01(item?.x, 0),
      y: clamp01(item?.y, 0),
      w: clamp01(item?.w, 0.76),
      h: clamp01(item?.h, 1)
    }));
  }

  function getExplicitCustomLayoutFor(baseIndex, mergedIndex) {
    const keyMerged = normalizeIndexKey(mergedIndex);
    const keyBase = String(baseIndex || "").trim();
    const fromMerged = (CUSTOM_PRODUCT_LAYOUTS.byMergedIndex || {})[keyMerged];
    const fromBase = (CUSTOM_PRODUCT_LAYOUTS.byBaseIndex || {})[keyBase];
    return fromMerged || fromBase || null;
  }

  function getModuleStyleFamilyLayouts(styleIdOverride, familyCount) {
    const count = Number(familyCount);
    if (!Number.isFinite(count) || count <= 1) return null;
    const spec = getSingleDirectLayoutSpec(styleIdOverride, false);
    const family = (spec && spec.familyDirect && typeof spec.familyDirect === "object")
      ? spec.familyDirect
      : null;
    if (!family || !family.imageLayouts || typeof family.imageLayouts !== "object") return null;
    const key = count >= 4 ? "family4" : (count === 3 ? "family3" : "family2");
    const raw = family.imageLayouts[key];
    if (!Array.isArray(raw) || !raw.length) return null;
    return sanitizeImageLayouts(raw, []);
  }

  function cacheImageMeta(url, width, height) {
    const key = String(url || "").trim();
    const w = Number(width);
    const h = Number(height);
    if (!key || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    customImageMetaCache.set(key, {
      width: w,
      height: h,
      aspect: w / h
    });
  }

  function getImageAspectFromCache(url) {
    const key = String(url || "").trim();
    const meta = key ? customImageMetaCache.get(key) : null;
    const aspect = meta && Number(meta.aspect);
    return Number.isFinite(aspect) && aspect > 0 ? aspect : null;
  }

  function resolveCustomImageLayouts(baseIndex, mergedIndex, familyCount, styleIdOverride) {
    const keyMerged = normalizeIndexKey(mergedIndex);
    const keyBase = String(baseIndex || "").trim();
    const fromMerged = (CUSTOM_PRODUCT_LAYOUTS.byMergedIndex || {})[keyMerged];
    const fromBase = (CUSTOM_PRODUCT_LAYOUTS.byBaseIndex || {})[keyBase];
    const styleLayouts = getModuleStyleFamilyLayouts(styleIdOverride, familyCount);
    if (Array.isArray(styleLayouts) && styleLayouts.length) {
      // Dla stylów z własną definicją family layout (np. styl-numer-2)
      // priorytet ma plik stylu, a nie globalne fallbacki indeksów.
      return sanitizeImageLayouts(styleLayouts, styleLayouts);
    }

    let fallback = CUSTOM_PRODUCT_LAYOUTS.defaults.single;
    if (familyCount >= 4) fallback = CUSTOM_PRODUCT_LAYOUTS.defaults.family4;
    else if (familyCount === 3) fallback = CUSTOM_PRODUCT_LAYOUTS.defaults.family3;
    else if (familyCount === 2) fallback = CUSTOM_PRODUCT_LAYOUTS.defaults.family2;

    return sanitizeImageLayouts(fromMerged || fromBase, fallback);
  }

  function applyFamilySpacingTightness(layouts, familyCount, tightnessValue) {
    const safe = sanitizeImageLayouts(layouts, layouts);
    if (familyCount !== 2 || safe.length < 2) return safe;

    const tightness = normalizeFamilySpacingTightness(tightnessValue, 0);
    if (tightness <= 0) return safe;

    const a = safe[0];
    const b = safe[1];
    const centerA = a.y + a.h / 2;
    const centerB = b.y + b.h / 2;
    const anchor = (centerA + centerB) / 2;
    const pull = Math.max(0.35, 1 - (tightness * 1.35));

    const move = (item) => {
      const center = item.y + item.h / 2;
      const nextCenter = anchor + (center - anchor) * pull;
      const nextY = Math.max(0, Math.min(1 - item.h, nextCenter - item.h / 2));
      return {
        x: clamp01(item.x, 0),
        y: clamp01(nextY, item.y),
        w: clamp01(item.w, 0.76),
        h: clamp01(item.h, 1)
      };
    };

    return [move(a), move(b)];
  }

  function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  async function mapWithConcurrencyLimit(items, concurrency, mapper) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return [];
    const limit = Math.max(1, Number(concurrency) || 1);
    const results = new Array(list.length);
    let cursor = 0;

    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= list.length) return;
        results[index] = await mapper(list[index], index);
      }
    }

    const workers = [];
    const workerCount = Math.min(limit, list.length);
    for (let i = 0; i < workerCount; i += 1) workers.push(worker());
    await Promise.all(workers);
    return results;
  }

  function preloadImageUrl(url, timeoutMs = 1600) {
    const src = String(url || "").trim();
    if (!src) return Promise.resolve(false);
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        resolve(!!ok);
      };
      const timer = setTimeout(() => finish(false), Math.max(250, timeoutMs));
      img.onload = () => {
        cacheImageMeta(src, img.naturalWidth || img.width, img.naturalHeight || img.height);
        finish(true);
      };
      img.onerror = () => finish(false);
      img.src = src;
    });
  }

  async function preloadImageUrls(urls, timeoutMs = 1600) {
    const list = Array.from(
      new Set((Array.isArray(urls) ? urls : []).map((v) => String(v || "").trim()).filter(Boolean))
    );
    if (!list.length) return;
    await Promise.allSettled(list.map((u) => preloadImageUrl(u, timeoutMs)));
  }

  function buildSafeFamily2LayoutsFromImageMeta(urls) {
    const list = Array.isArray(urls) ? urls.slice(0, 2) : [];
    if (list.length < 2) return null;

    // importdanych.js skaluje rodzinę po szerokości ramki.
    // Dobieramy wspólną szerokość (jeden pionowy słupek), aby oba zdjęcia były w jednej linii.
    const boxAspectSafe = 0.95; // konserwatywne H/W dla layout6/layout8
    const rowHeight = 0.5;
    const verticalPad = 0.012;
    const topY = verticalPad;
    const bottomY = rowHeight + verticalPad;
    const usableH = rowHeight - verticalPad * 2;

    const widths = list.map((url) => {
      const aspect = Math.max(0.22, Math.min(3.6, getImageAspectFromCache(url) || 1));
      const safeWidth = usableH * boxAspectSafe * aspect * 0.96;
      return Math.max(0.22, Math.min(0.96, safeWidth));
    });

    const sharedW = Math.max(0.22, Math.min(0.96, Math.min(...widths)));
    const sharedX = (1 - sharedW) / 2;

    return list.map((_url, idx) => ({
      x: sharedX,
      y: idx === 0 ? topY : bottomY,
      w: sharedW,
      h: usableH
    }));
  }

  function shouldUsePreviewSnapshotLayouts(baseIndex, mergedIndex, familyCount) {
    if (familyCount <= 1) return false;
    return true;
  }

  function readRenderedImageLayoutsFromPreviewTrack(expectedCount) {
    const track = document.getElementById("customPreviewImagesTrack");
    if (!track) return null;
    const trackRect = track.getBoundingClientRect();
    if (!trackRect || trackRect.width < 4 || trackRect.height < 4) return null;

    const imgEls = Array.from(track.querySelectorAll("img"));
    if (!imgEls.length) return null;
    if (Number.isFinite(expectedCount) && expectedCount > 0 && imgEls.length < expectedCount) return null;

    const result = [];
    for (const imgEl of imgEls) {
      const rect = imgEl.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) continue;

      const naturalW = imgEl.naturalWidth || 0;
      const naturalH = imgEl.naturalHeight || 0;
      let drawW = rect.width;
      let drawH = rect.height;

      // Preview multi-img używa object-fit: contain + object-position: left top.
      // Zapisujemy rzeczywisty "obszar treści" obrazka, nie cały box.
      if (naturalW > 0 && naturalH > 0) {
        const ar = naturalW / naturalH;
        if (Number.isFinite(ar) && ar > 0) {
          const fitW = Math.min(rect.width, rect.height * ar);
          const fitH = fitW / ar;
          if (fitW > 0 && fitH > 0) {
            drawW = fitW;
            drawH = fitH;
          }
        }
      }

      result.push({
        x: clamp01((rect.left - trackRect.left) / trackRect.width, 0),
        y: clamp01((rect.top - trackRect.top) / trackRect.height, 0),
        w: clamp01(drawW / trackRect.width, 0.76),
        h: clamp01(drawH / trackRect.height, 1)
      });
    }

    if (Number.isFinite(expectedCount) && expectedCount > 0 && result.length < expectedCount) return null;
    return result;
  }

  function snapshotPreviewLayoutsForExport() {
    const family = Array.isArray(currentFamilyProducts) ? currentFamilyProducts : [];
    const urls = family.map((item) => String(item && item.url ? item.url : "").trim()).filter(Boolean);
    const count = Math.max(1, urls.length || 1);
    const base = getEffectivePreviewProduct();
    const indexes = family
      .map((item) => String(item && item.product && item.product.index ? item.product.index : "").trim())
      .filter(Boolean);
    if (!indexes.length && base?.index) indexes.push(String(base.index).trim());
    const mergedIndex = normalizeIndexKey(Array.from(new Set(indexes)).join(","));
    const styleId = String(base?.MODULE_LAYOUT_STYLE_ID || customModuleLayoutStyleId || "default");
    const layouts = readRenderedImageLayoutsFromPreviewTrack(count);
    pendingPreviewExportLayouts = {
      baseIndex: String(base?.index || "").trim(),
      mergedIndex,
      styleId,
      count,
      urls,
      layouts: Array.isArray(layouts) ? sanitizeImageLayouts(layouts, []) : null,
      capturedAt: Date.now()
    };
  }

  function buildExportImageLayouts(baseIndex, mergedIndex, familyImageUrls, styleIdOverride) {
    const urls = Array.isArray(familyImageUrls) ? familyImageUrls.filter(Boolean) : [];
    const familyCount = Math.max(1, urls.length || 1);
    const styleId = String(styleIdOverride || customModuleLayoutStyleId || "default");
    const hasStyleLayout = !!(getModuleStyleFamilyLayouts(styleId, familyCount) || null);
    const allowTightness = !hasStyleLayout;
    const pending = pendingPreviewExportLayouts;
    if (
      shouldUsePreviewSnapshotLayouts(baseIndex, mergedIndex, familyCount) &&
      pending &&
      Array.isArray(pending.layouts) &&
      pending.layouts.length >= familyCount &&
      pending.count === familyCount &&
      String(pending.baseIndex || "") === String(baseIndex || "").trim() &&
      normalizeIndexKey(pending.mergedIndex) === normalizeIndexKey(mergedIndex) &&
      String(pending.styleId || "default") === styleId
    ) {
      const snapshotLayouts = sanitizeImageLayouts(
        pending.layouts.slice(0, familyCount),
        resolveCustomImageLayouts(baseIndex, mergedIndex, familyCount, styleId)
      );
      return allowTightness
        ? applyFamilySpacingTightness(snapshotLayouts, familyCount, customFamilySpacingTightness)
        : snapshotLayouts;
    }

    const baseLayouts = resolveCustomImageLayouts(baseIndex, mergedIndex, familyCount, styleId);
    if (hasStyleLayout) {
      return baseLayouts;
    }
    if (familyCount !== 2) {
      return allowTightness
        ? applyFamilySpacingTightness(baseLayouts, familyCount, customFamilySpacingTightness)
        : baseLayouts;
    }
    if (getExplicitCustomLayoutFor(baseIndex, mergedIndex)) {
      return applyFamilySpacingTightness(baseLayouts, familyCount, customFamilySpacingTightness);
    }

    const safe2 = buildSafeFamily2LayoutsFromImageMeta(urls);
    if (!safe2 || safe2.length < 2) {
      return applyFamilySpacingTightness(baseLayouts, familyCount, customFamilySpacingTightness);
    }
    return applyFamilySpacingTightness(
      sanitizeImageLayouts(safe2, baseLayouts),
      familyCount,
      customFamilySpacingTightness
    );
  }

  function loadKonvaImageFromUrl(url, timeoutMs = 2600) {
    const src = String(url || "").trim();
    if (!src || !window.Konva || typeof window.Konva.Image?.fromURL !== "function") {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      let done = false;
      const finish = (img) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(img || null);
      };
      const timer = setTimeout(() => finish(null), Math.max(500, timeoutMs));
      try {
        window.Konva.Image.fromURL(src, (img) => finish(img));
      } catch (_err) {
        finish(null);
      }
    });
  }

  function ensureCustomAddLoadingOverlay() {
    let styleEl = document.getElementById("customAddLoadingStyle");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "customAddLoadingStyle";
      styleEl.textContent = `
        @keyframes customAddSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styleEl);
    }

    let overlay = document.getElementById("customAddLoadingOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "customAddLoadingOverlay";
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "background:rgba(15,23,42,.22)",
      "z-index:1000002",
      "pointer-events:auto"
    ].join(";");
    overlay.innerHTML = `
      <div style="min-width:260px;max-width:min(90vw,420px);display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:#ffffff;border:1px solid #d7dfec;box-shadow:0 10px 30px rgba(0,0,0,.14);font-family:Inter,Arial,sans-serif;">
        <div style="width:18px;height:18px;border-radius:999px;border:2px solid #cbd5e1;border-top-color:#0f172a;animation:customAddSpin .8s linear infinite;flex:0 0 auto;"></div>
        <div id="customAddLoadingLabel" style="font-size:13px;font-weight:700;color:#0f172a;">Trwa dodawanie produktu...</div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showCustomAddLoading(message) {
    const overlay = ensureCustomAddLoadingOverlay();
    const label = overlay.querySelector("#customAddLoadingLabel");
    if (label) label.textContent = String(message || "Trwa dodawanie produktu...");
    overlay.style.display = "flex";
  }

  function hideCustomAddLoading() {
    const overlay = document.getElementById("customAddLoadingOverlay");
    if (overlay) overlay.style.display = "none";
  }

  function ensureCustomImportProgressOverlay() {
    let overlay = document.getElementById("customImportProgressOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "customImportProgressOverlay";
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "background:rgba(15,23,42,.28)",
      "z-index:1000003",
      "pointer-events:auto"
    ].join(";");
    overlay.innerHTML = `
      <div style="width:min(92vw,520px);padding:18px;border-radius:14px;background:#ffffff;border:1px solid #d7dfec;box-shadow:0 10px 30px rgba(0,0,0,.14);font-family:Inter,Arial,sans-serif;">
        <div id="customImportProgressLabel" style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:10px;">Trwa import produktów...</div>
        <div style="height:12px;border-radius:999px;background:#e2e8f0;overflow:hidden;">
          <div id="customImportProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#06b6d4,#14b8a6);transition:width .22s ease;"></div>
        </div>
        <div id="customImportProgressPercent" style="margin-top:8px;font-size:11px;color:#334155;">0%</div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showCustomImportProgress(label, percent = 0) {
    const overlay = ensureCustomImportProgressOverlay();
    const bar = overlay.querySelector("#customImportProgressBar");
    const text = overlay.querySelector("#customImportProgressPercent");
    const title = overlay.querySelector("#customImportProgressLabel");
    const safe = Math.max(0, Math.min(100, Number(percent) || 0));
    if (title) title.textContent = String(label || "Trwa import produktów...");
    if (bar) bar.style.width = `${safe}%`;
    if (text) text.textContent = `${Math.round(safe)}%`;
    overlay.style.display = "flex";
  }

  function hideCustomImportProgress() {
    const overlay = document.getElementById("customImportProgressOverlay");
    if (overlay) overlay.style.display = "none";
  }

  function getDisplayName(product) {
    if (!product) return "";
    const override = customNameOverrides.get(product.id);
    if (typeof override === "string" && override.trim()) return override.trim();
    return product.name || "-";
  }

  function getDisplayIndex(product) {
    if (!product) return "";
    const override = customIndexOverrides.get(product.id);
    if (typeof override === "string" && override.trim()) return override.trim();
    return String(product.index || "").trim();
  }

  function normalizeEditablePriceValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const normalized = raw.replace(",", ".").replace(/[^0-9.]/g, "");
    if (!normalized) return "";
    const dotIndex = normalized.indexOf(".");
    const clean = dotIndex >= 0
      ? `${normalized.slice(0, dotIndex + 1)}${normalized.slice(dotIndex + 1).replace(/\./g, "")}`
      : normalized;
    const parsed = parseFloat(clean);
    if (!Number.isFinite(parsed)) return "";
    return parsed.toFixed(2);
  }

  function getDisplayPrice(product) {
    if (!product) return "";
    const override = customPriceOverrides.get(product.id);
    if (typeof override === "string" && override.trim()) return override.trim();
    return String(product.netto || "").trim();
  }

  function normalizeProduct(row, idx) {
    const index = String(
      row?.INDEKS ||
      row?.["index-cell"] ||
      row?.index ||
      row?.indeks ||
      ""
    ).trim();

    const name = String(
      row?.NAZWA_TOWARU ||
      row?.["text-decoration-none"] ||
      row?.name ||
      row?.NAZWA ||
      row?.nazwa ||
      ""
    ).trim();
    const packageValue = String(
      row?.IL_OPK_ZB ||
      row?.["package-cell"] ||
      row?.package ||
      row?.PAKIET ||
      ""
    ).trim();
    const packageUnit = String(
      row?.JM ||
      row?.["package-cell 2"] ||
      row?.packageUnit ||
      row?.PAKIET_JM ||
      ""
    ).trim();
    const ean = String(
      row?.KOD_KRESKOWY ||
      row?.["text-right 2"] ||
      row?.ean ||
      row?.EAN ||
      ""
    ).trim();
    const netto = String(
      row?.CENA_NETTO_FV ||
      row?.["netto-cell"] ||
      row?.netto ||
      row?.CENA ||
      ""
    ).trim();
    const brand = String(
      row?.NAZWA_PROD ||
      row?.MARKA ||
      row?.brand ||
      ""
    ).trim();

    if (!index && !name) return null;

    return {
      id: `${index || "brak"}-${idx}`,
      index,
      name,
      packageValue,
      packageUnit,
      ean,
      netto,
      brand,
      indexNorm: normalizeText(index),
      nameNorm: normalizeText(name),
      raw: row
    };
  }

  function scientificToPlain(raw) {
    const txt = String(raw || "").trim();
    if (!txt) return "";
    if (!/[eE]/.test(txt)) return txt.replace(/\D/g, "");
    const n = Number(txt);
    if (!Number.isFinite(n)) return txt.replace(/\D/g, "");
    return String(Math.round(n));
  }

  function normalizeExcelHeaderKey(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function readExcelCellAsText(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return String(value).trim();
  }

  function normalizeImportIndex(value) {
    const raw = readExcelCellAsText(value);
    if (!raw) return "";
    const plain = scientificToPlain(raw);
    return plain || raw.replace(/\s+/g, "");
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Nie udało się odczytać pliku zdjęcia."));
      reader.readAsDataURL(file);
    });
  }

  function getImageIndexCandidatesFromFileName(fileName) {
    const base = String(fileName || "").replace(/\.[^/.]+$/, "").trim();
    if (!base) return [];
    const out = new Set();
    const add = (v) => {
      const key = normalizeImportIndex(v);
      if (key) out.add(key);
    };
    add(base);
    const firstToken = base.split(/[\s_\-;|,]+/).find(Boolean);
    if (firstToken) add(firstToken);
    const digitMatch = base.match(/\d{3,}/g);
    if (Array.isArray(digitMatch)) {
      digitMatch.forEach((d) => add(d));
    }
    return Array.from(out);
  }

  function normalizeImportedGroupKey(value) {
    const raw = readExcelCellAsText(value).replace(/\s+/g, "");
    if (!raw) return "";
    if (/^\d+$/.test(raw)) return raw;
    const parts = raw.split(/[;,|/]+/).map((v) => v.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every((p) => p === parts[0])) return parts[0];
    return raw;
  }

  function isTnzFlagValue(value) {
    const v = normalizeExcelHeaderKey(value);
    if (!v) return false;
    return (
      v.includes("tnz") ||
      v === "1" ||
      v === "tak" ||
      v === "yes" ||
      v === "y" ||
      v === "x" ||
      v === "true"
    );
  }

  async function parseCustomStyleExcelRows(file) {
    if (!file) return [];
    if (!window.XLSX) {
      throw new Error("Brak biblioteki XLSX (xlsx.full.min.js).");
    }
    const buf = await file.arrayBuffer();
    const wb = window.XLSX.read(buf, { type: "array" });
    const ws = wb?.Sheets?.[wb?.SheetNames?.[0]];
    if (!ws) return [];
    const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!Array.isArray(rows) || rows.length < 1) return [];

    const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
    const headerMap = new Map(
      headerRow.map((cell, idx) => [normalizeExcelHeaderKey(cell), idx]).filter(([k]) => !!k)
    );

    const findCol = (fallbackIdx, aliases) => {
      for (const alias of aliases) {
        const k = normalizeExcelHeaderKey(alias);
        if (headerMap.has(k)) return headerMap.get(k);
      }
      return fallbackIdx;
    };

    const cIndex = findCol(0, ["indeks", "index", "kod", "sku"]);
    const cBrand = findCol(1, ["marka", "brand"]);
    const cPrice = findCol(2, ["cena", "price", "netto"]);
    const cTnz = findCol(3, ["tnz", "oznaczenie tnz", "znacznik tnz"]);
    const cGroup = findCol(4, ["grupa produktow", "grupa produktów", "grupa", "rodzina", "group"]);

    return rows.slice(1).map((row, rowIdx) => {
      const cells = Array.isArray(row) ? row : [];
      const indexRaw = readExcelCellAsText(cells[cIndex]);
      const index = normalizeImportIndex(indexRaw);
      const brand = readExcelCellAsText(cells[cBrand]);
      const price = readExcelCellAsText(cells[cPrice]);
      const tnzRaw = readExcelCellAsText(cells[cTnz]);
      const groupRaw = readExcelCellAsText(cells[cGroup]);
      return {
        rowNo: rowIdx + 2,
        indexRaw,
        index,
        brand,
        price,
        tnzRaw,
        tnz: isTnzFlagValue(tnzRaw),
        groupRaw,
        groupKey: normalizeImportedGroupKey(groupRaw)
      };
    }).filter((item) => !!item.index);
  }

  function formatPrice(nettoRaw) {
    const src = String(nettoRaw || "").trim();
    const currency = src.includes("£") ? "£" : (src.includes("€") ? "€" : "£");
    const value = parseFloat(src.replace(",", ".").replace(/[^0-9.]/g, ""));
    const safe = Number.isFinite(value) ? value : 0;
    const parts = safe.toFixed(2).split(".");
    return {
      currency,
      main: parts[0],
      dec: parts[1]
    };
  }

  function normalizeFontOption(value, fallback = "Arial") {
    const v = String(value || "").trim();
    if (!v) return fallback;
    return CUSTOM_FONT_OPTIONS.includes(v) ? v : fallback;
  }

  function syncCustomFontOptionsFromWindow() {
    const fromWindow = (typeof window.getAvailableFonts === "function") ? window.getAvailableFonts() : [];
    if (!Array.isArray(fromWindow) || !fromWindow.length) return;
    const merged = [];
    const seen = new Set();
    [...CUSTOM_FONT_OPTIONS, ...fromWindow].forEach((f) => {
      const v = String(f || "").trim();
      if (!v) return;
      const key = v.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(v);
    });
    CUSTOM_FONT_OPTIONS = merged;
  }

  function refreshFontSelectOptions(selectEl, preferredValue = "Arial") {
    if (!selectEl) return;
    syncCustomFontOptionsFromWindow();
    const current = String(preferredValue || selectEl.value || "Arial").trim() || "Arial";
    selectEl.innerHTML = CUSTOM_FONT_OPTIONS
      .map((font) => `<option value="${escapeHtml(font)}">${escapeHtml(font)}</option>`)
      .join("");
    selectEl.value = CUSTOM_FONT_OPTIONS.includes(current) ? current : (CUSTOM_FONT_OPTIONS[0] || "Arial");
    applyFontPreviewToSelect(selectEl, "Arial");
  }

  function applyFontPreviewToSelect(selectEl, fallback = "Arial") {
    if (!selectEl) return;
    const setFace = (el, family) => {
      if (!el) return;
      el.style.fontFamily = `"${family}", Arial, sans-serif`;
    };
    Array.from(selectEl.options || []).forEach((opt) => {
      const family = normalizeFontOption(opt?.value || opt?.textContent || "", fallback);
      setFace(opt, family);
    });
    setFace(selectEl, normalizeFontOption(selectEl.value, fallback));
  }

  function normalizeAlignOption(value, fallback = "left") {
    const v = String(value || "").trim().toLowerCase();
    if (v === "left" || v === "center" || v === "right") return v;
    return fallback;
  }

  function boolAttrToFlag(value) {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  function cloneCustomDraftSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    return {
      ...snapshot,
      familyProducts: Array.isArray(snapshot.familyProducts)
        ? snapshot.familyProducts.map((item) => ({ ...(item || {}) }))
        : [],
      nameOverrides: snapshot.nameOverrides && typeof snapshot.nameOverrides === "object"
        ? { ...snapshot.nameOverrides }
        : {},
      indexOverrides: snapshot.indexOverrides && typeof snapshot.indexOverrides === "object"
        ? { ...snapshot.indexOverrides }
        : {},
      priceOverrides: snapshot.priceOverrides && typeof snapshot.priceOverrides === "object"
        ? { ...snapshot.priceOverrides }
        : {},
      settings: snapshot.settings && typeof snapshot.settings === "object"
        ? { ...snapshot.settings }
        : {},
      importMeta: snapshot.importMeta && typeof snapshot.importMeta === "object"
        ? { ...snapshot.importMeta }
        : undefined
    };
  }

  function storeCustomStyleEditorSnapshot(snapshot = null) {
    const nextSnapshot = snapshot || (typeof customGetCurrentEditorSnapshot === "function"
      ? customGetCurrentEditorSnapshot()
      : null);
    customLastEditorSnapshot = cloneCustomDraftSnapshot(nextSnapshot);
    return customLastEditorSnapshot;
  }

  function buildKonvaFontStyle({ bold = false, italic = false } = {}) {
    if (bold && italic) return "bold italic";
    if (bold) return "bold";
    if (italic) return "italic";
    return "normal";
  }

  function resetCustomStyleEditorParamsToDefaults() {
    customPriceCircleColor = "#d71920";
    customPriceBadgeStyleId = "solid";
    customModuleLayoutStyleId = "default";
    customPriceTextColor = "#ffffff";
    customCurrencySymbol = "£";
    customPriceTextScale = 1;
    customFamilySpacingTightness = 0.12;
    const preset = getStyleFontPreset("default");
    customMetaFontFamily = preset.meta;
    customMetaTextColor = "#1f3560";
    customMetaTextBold = true;
    customMetaTextUnderline = false;
    customMetaTextAlign = "left";
    customPriceFontFamily = preset.price;
    customPriceTextBold = true;
    customPriceTextUnderline = false;
    customPriceTextAlign = "left";
    customPreviewVisibility.showFlag = false;
    customPreviewVisibility.showBarcode = false;
  }

  function resetCustomStyleEditorSessionState() {
    resetCustomStyleEditorParamsToDefaults();

    familyBaseProduct = null;
    familyBaseImageUrl = null;
    currentFamilyProducts = [];
    currentPreviewProduct = null;
    currentPreviewImageUrl = null;
    currentPickerProduct = null;
    currentPickerImageUrl = null;
    pendingPreviewExportLayouts = null;
    isCustomPlacementActive = false;
    window.__customPlacementActive = false;
    customLastEditorSnapshot = null;

    customNameOverrides.clear();
    customIndexOverrides.clear();
    customPriceOverrides.clear();
    customImageOverrides.clear();

    const search = document.getElementById("customStyleSearch");
    if (search) search.value = "";

    const info = document.getElementById("customStyleInfo");
    if (info) {
      info.innerHTML = `
        <div style="color:#64748b;">Wybierz produkt z listy, aby rozpocząć.</div>
      `;
    }

    const imageBox = document.getElementById("customStyleImageBox");
    if (imageBox) {
      imageBox.innerHTML = "brak";
      imageBox.style.color = "#94a3b8";
    }

    syncCustomStyleControlsFromState();
    updateFamilyUiStatus("Kliknij przycisk, aby ustawić produkt bazowy rodziny.", "info");
    renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
  }

  function syncCustomStyleControlsFromState() {
    const applyToggleMark = (markEl, enabled) => {
      if (!markEl) return;
      markEl.textContent = enabled ? "✓" : "✕";
      markEl.style.color = enabled ? "#0b8f84" : "#b91c1c";
      markEl.style.borderColor = enabled ? "#0b8f84" : "#b91c1c";
    };
    const applyMiniToggleButton = (btn, enabled) => {
      if (!btn) return;
      btn.style.borderColor = enabled ? "#0b8f84" : "#d7dfec";
      btn.style.background = enabled ? "#f0fdfa" : "#fff";
      btn.style.color = enabled ? "#0b8f84" : "#0f172a";
    };

    const priceColorInput = document.getElementById("customPriceColorInput");
    const moduleLayoutSelect = document.getElementById("customModuleLayoutSelect");
    const applyStyleToImportedBtn = document.getElementById("customApplyStyleToImportedBtn");
    const priceStyleSelect = document.getElementById("customPriceStyleSelect");
    const priceTextColorInput = document.getElementById("customPriceTextColorInput");
    const currencySelect = document.getElementById("customCurrencySelect");
    const priceSizeValue = document.getElementById("customPriceSizeValue");
    const metaFontSelect = document.getElementById("customMetaFontSelect");
    const metaTextColorInput = document.getElementById("customMetaTextColorInput");
    const metaBoldToggle = document.getElementById("customMetaBoldToggle");
    const metaUnderlineToggle = document.getElementById("customMetaUnderlineToggle");
    const metaAlignSelect = document.getElementById("customMetaAlignSelect");
    const priceFontSelect = document.getElementById("customPriceFontSelect");
    const priceBoldToggle = document.getElementById("customPriceBoldToggle");
    const priceUnderlineToggle = document.getElementById("customPriceUnderlineToggle");
    const priceAlignSelect = document.getElementById("customPriceAlignSelect");
    const familySpacingSelect = document.getElementById("customFamilySpacingSelect");
    const showFlagToggleMark = document.getElementById("customShowFlagToggleMark");
    const showBarcodeToggleMark = document.getElementById("customShowBarcodeToggleMark");

    if (priceColorInput) priceColorInput.value = customPriceCircleColor || "#d71920";
    if (moduleLayoutSelect) moduleLayoutSelect.value = customModuleLayoutStyleId || "default";
    if (priceStyleSelect) priceStyleSelect.value = customPriceBadgeStyleId || "solid";
    if (priceTextColorInput) priceTextColorInput.value = customPriceTextColor || "#ffffff";
    if (currencySelect) currencySelect.value = customCurrencySymbol === "€" ? "€" : "£";
    if (priceSizeValue) priceSizeValue.textContent = `${Math.round((Number(customPriceTextScale) || 1) * 100)}%`;
    if (metaFontSelect) metaFontSelect.value = normalizeFontOption(customMetaFontFamily, "Arial");
    if (metaTextColorInput) metaTextColorInput.value = customMetaTextColor || "#1f3560";
    if (metaAlignSelect) metaAlignSelect.value = normalizeAlignOption(customMetaTextAlign, "left");
    if (priceFontSelect) priceFontSelect.value = normalizeFontOption(customPriceFontFamily, "Arial");
    refreshFontSelectOptions(metaFontSelect, normalizeFontOption(customMetaFontFamily, "Arial"));
    refreshFontSelectOptions(priceFontSelect, normalizeFontOption(customPriceFontFamily, "Arial"));
    if (priceAlignSelect) priceAlignSelect.value = normalizeAlignOption(customPriceTextAlign, "left");
    if (familySpacingSelect) familySpacingSelect.value = String(normalizeFamilySpacingTightness(customFamilySpacingTightness, 0.12));
    applyToggleMark(showFlagToggleMark, !!customPreviewVisibility.showFlag);
    applyToggleMark(showBarcodeToggleMark, !!customPreviewVisibility.showBarcode);
    applyMiniToggleButton(metaBoldToggle, !!customMetaTextBold);
    applyMiniToggleButton(metaUnderlineToggle, !!customMetaTextUnderline);
    applyMiniToggleButton(priceBoldToggle, !!customPriceTextBold);
    applyMiniToggleButton(priceUnderlineToggle, !!customPriceTextUnderline);
  }

  function getEffectiveCurrencySymbol(productLike, fallbackSymbol = "£") {
    const saved = String(productLike?.PRICE_CURRENCY_SYMBOL || "").trim();
    if (saved === "€" || saved === "£") return saved;
    if (customCurrencySymbol === "€" || customCurrencySymbol === "£") return customCurrencySymbol;
    return fallbackSymbol === "€" ? "€" : "£";
  }

  function buildPackageInfoText(product) {
    if (!product) return "";
    const unit = String(product.packageUnit || "").trim().toLowerCase();
    const value = String(product.packageValue || "").trim();
    if (unit === "kg") return "produkt na wagę";
    if (unit === "szt" && value) return `opak. ${value}`;
    return "";
  }

  function isWeightProduct(productLike) {
    const unit = String(
      productLike?.packageUnit ||
      productLike?.CUSTOM_PACKAGE_UNIT ||
      productLike?.JEDNOSTKA ||
      ""
    ).trim().toLowerCase();
    return unit === "kg";
  }

  function nextDirectModuleId() {
    customDirectModuleSeq += 1;
    return `direct-module-${Date.now()}-${customDirectModuleSeq}`;
  }

  function moveNodeToParentPreserveAbsolute(node, parent) {
    if (!node || !parent || typeof node.moveTo !== "function") return;
    const abs = typeof node.getAbsolutePosition === "function" ? node.getAbsolutePosition() : null;
    node.moveTo(parent);
    if (abs && typeof node.absolutePosition === "function") {
      node.absolutePosition(abs);
    } else if (abs && typeof node.setAbsolutePosition === "function") {
      node.setAbsolutePosition(abs);
    }
  }

  function applySmallTextEasyHitArea(node) {
    if (!node || !window.Konva || !(node instanceof window.Konva.Text)) return;
    if (!node.getAttr) return;
    const isSmallTarget = !!(node.getAttr("isIndex") || node.getAttr("isCustomPackageInfo"));
    if (!isSmallTarget) return;
    try {
      if (typeof node.hitStrokeWidth === "function") node.hitStrokeWidth(18);
      // Zostaw marker też w attrs, żeby po serializacji/restore łatwo było utrzymać zachowanie.
      if (typeof node.setAttr === "function") node.setAttr("_customEasyHitSmallText", true);
    } catch (_err) {}
  }

  function tightenDirectTextSelectionBox(node) {
    if (!node || !window.Konva || !(node instanceof window.Konva.Text)) return;
    if (!node.getAttr) return;
    if (!(node.getAttr("directModuleId") || node.getAttr("isName") || node.getAttr("isIndex") || node.getAttr("isCustomPackageInfo"))) return;
    const parent = node.getParent ? node.getParent() : null;
    if (parent && parent.getAttr && parent.getAttr("isPriceGroup")) return;
    try {
      const fontSize = Number(node.fontSize?.() || 12);
      const lineHeightMult = Number(node.lineHeight?.() || 1);
      const textHeight = Number(node.textHeight || Math.round(fontSize * lineHeightMult));
      const lines = Math.max(
        1,
        Number(node.textArr?.length) || String(node.text?.() || "").split("\n").length
      );
      const padding = node.getAttr("isName") ? 4 : 3;
      const minH = Math.max(fontSize + 2, 10);
      const tightH = Math.max(minH, Math.ceil(lines * textHeight + padding));
      if (typeof node.height === "function") node.height(tightH);
    } catch (_err) {}
  }

  function bakeGroupTransformToChildren(group, options = {}) {
    const includeTranslation = options.includeTranslation !== false;
    if (!group || !group.getChildren) return false;
    const gx = Number(group.x?.() || 0);
    const gy = Number(group.y?.() || 0);
    const sx = Number(group.scaleX?.() || 1);
    const sy = Number(group.scaleY?.() || 1);
    const rot = Number(group.rotation?.() || 0);
    const ox = Number(group.offsetX?.() || 0);
    const oy = Number(group.offsetY?.() || 0);
    const needsBake =
      (includeTranslation && Math.abs(gx) > 0.0001) ||
      (includeTranslation && Math.abs(gy) > 0.0001) ||
      Math.abs(sx - 1) > 0.0001 ||
      Math.abs(sy - 1) > 0.0001 ||
      Math.abs(rot) > 0.0001 ||
      Math.abs(ox) > 0.0001 ||
      Math.abs(oy) > 0.0001;
    if (!needsBake) return false;

    const children = Array.from(group.getChildren());
    const snapshots = children.map((child) => {
      const absPos = child.getAbsolutePosition ? child.getAbsolutePosition() : null;
      const absScale = child.getAbsoluteScale ? child.getAbsoluteScale() : { x: child.scaleX?.() || 1, y: child.scaleY?.() || 1 };
      const absRot = child.getAbsoluteRotation ? child.getAbsoluteRotation() : (child.rotation?.() || 0);
      return { child, absPos, absScale, absRot };
    });

    if (includeTranslation) {
      group.x?.(0);
      group.y?.(0);
    }
    group.scaleX?.(1);
    group.scaleY?.(1);
    group.rotation?.(0);
    group.offsetX?.(0);
    group.offsetY?.(0);

    snapshots.forEach(({ child, absPos, absScale, absRot }) => {
      if (!child || (typeof child.isDestroyed === "function" && child.isDestroyed())) return;
      try {
        if (absPos) {
          if (typeof child.absolutePosition === "function") child.absolutePosition(absPos);
          else if (typeof child.setAbsolutePosition === "function") child.setAbsolutePosition(absPos);
        }
        if (absScale && typeof child.scaleX === "function" && typeof child.scaleY === "function") {
          if (Number.isFinite(absScale.x)) child.scaleX(absScale.x);
          if (Number.isFinite(absScale.y)) child.scaleY(absScale.y);
        }
        if (Number.isFinite(absRot) && typeof child.rotation === "function") child.rotation(absRot);
      } catch (_err) {}
    });
    return true;
  }

  function normalizeDirectModuleGroupTransformsOnPage(page) {
    if (!page || !page.layer || !window.Konva) return;
    const layer = page.layer;
    let bakedAny = false;
    const groups = layer.find((n) =>
      n instanceof window.Konva.Group &&
      n.getAttr &&
      n.getAttr("isDirectCustomModuleGroup")
    );
    groups.forEach((group) => {
      // Podczas zwykłego przeciągania nie bake'ujemy translacji (x/y),
      // żeby moduł nie "rozjeżdżał się" w trakcie ruchu.
      if (bakeGroupTransformToChildren(group, { includeTranslation: false })) bakedAny = true;
    });

    if (bakedAny && page.transformer && typeof page.transformer.nodes === "function") {
      try {
        const nodes = page.transformer.nodes() || [];
        if (nodes.length && typeof page.transformer.forceUpdate === "function") {
          page.transformer.forceUpdate();
        }
      } catch (_err) {}

      // Odtwórz prosty outline selekcji, bo po "bake" potrafi zostać w starym miejscu
      // do następnego kliknięcia (dotyczy głównie modułów styl-wlasny/direct).
      try {
        layer.find?.(".selectionOutline")?.forEach?.((n) => n.destroy?.());
        (Array.isArray(page.selectedNodes) ? page.selectedNodes : []).forEach((node) => {
          if (!node || (typeof node.isDestroyed === "function" && node.isDestroyed())) return;
          let box = null;
          try { box = node.getClientRect?.({ relativeTo: layer }); } catch (_e) { box = null; }
          if (!box || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return;
          const outline = new window.Konva.Rect({
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            stroke: "#00baff",
            strokeWidth: 1.5,
            dash: [4, 4],
            listening: false,
            name: "selectionOutline"
          });
          layer.add(outline);
          outline.moveToTop();
        });
      } catch (_err) {}
    }

    layer.batchDraw?.();
    page.transformerLayer?.batchDraw?.();
  }

  function restoreDirectModuleNodeSelectabilityOnPage(page) {
    if (!page || !page.layer || !window.Konva) return;
    const layer = page.layer;
    const directNodes = layer.find((n) => n && n.getAttr && !!n.getAttr("directModuleId"));
    directNodes.forEach((node) => {
      if (!node || (typeof node.isDestroyed === "function" && node.isDestroyed())) return;
      const parent = node.getParent ? node.getParent() : null;
      const parentIsUserGroup = !!(parent && parent.getAttr && parent.getAttr("isUserGroup"));
      const isTopLevel = parent === layer;
      const selectableType =
        node instanceof window.Konva.Text ||
        node instanceof window.Konva.Image ||
        node instanceof window.Konva.Group ||
        node instanceof window.Konva.Rect;
      const isDirectPriceLike =
        !!(node.getAttr && (
          node.getAttr("isPriceGroup") ||
          node.getAttr("isDirectPriceRectBg")
        ));

      // Po "Rozgrupuj" elementy direct wracają jako top-level i muszą być znowu
      // normalnie zaznaczalne (także box-select). Nie ruszamy dzieci siedzących w userGroup.
      if (!parentIsUserGroup && selectableType) {
        if (typeof node.listening === "function") node.listening(true);
        if (isTopLevel && typeof node.draggable === "function") node.draggable(true);
        if (node.setAttr) node.setAttr("selectable", true);
      }
      // Cena/prostokąt ceny edytujemy osobno dopiero po rozgrupowaniu.
      if (isDirectPriceLike && !parentIsUserGroup) {
        if (typeof node.listening === "function") node.listening(true);
        if (typeof node.draggable === "function") node.draggable(true);
        if (node.setAttr) node.setAttr("selectable", true);
      }

      applySmallTextEasyHitArea(node);
      tightenDirectTextSelectionBox(node);

      if (node instanceof window.Konva.Group && node.getAttr && node.getAttr("isPriceGroup")) {
        try { bindDirectPriceGroupEditor(node, page); } catch (_err) {}
      }
      if (node instanceof window.Konva.Rect && node.getAttr && node.getAttr("isDirectPriceRectBg")) {
        try { bindDirectPriceRectEditor(node, page); } catch (_err) {}
      }

      // Teksty wewnątrz priceGroup nie powinny stać się niezależnie draggable po ungroup.
      if (parent && parent.getAttr && parent.getAttr("isPriceGroup") && typeof node.draggable === "function") {
        node.draggable(false);
      }
    });
  }

  function collectDirectModuleTopLevelNodes(page, directModuleId) {
    if (!page || !page.layer || !directModuleId) return [];
    const layer = page.layer;
    return layer.find((n) => {
      if (!n || !n.getAttr) return false;
      if (String(n.getAttr("directModuleId") || "") !== String(directModuleId)) return false;
      if (n.getParent && n.getParent() !== layer) return false;
      return (
        n instanceof window.Konva.Text ||
        n instanceof window.Konva.Image ||
        n instanceof window.Konva.Group ||
        n instanceof window.Konva.Rect
      );
    });
  }

  function getTopUserGroupAncestor(node) {
    let current = node;
    while (current && current.getParent) {
      const parent = current.getParent();
      if (!(parent instanceof window.Konva.Group)) break;
      if (parent.getAttr && parent.getAttr("isUserGroup")) return parent;
      current = parent;
    }
    return null;
  }

  function isManagedDirectSlotNode(node) {
    if (!node || !node.getAttr) return false;
    return !!(
      node.getAttr("isName") ||
      node.getAttr("isIndex") ||
      node.getAttr("isProductImage") ||
      node.getAttr("isBarcode") ||
      node.getAttr("isCountryBadge") ||
      node.getAttr("isPriceGroup") ||
      node.getAttr("isDirectPriceRectBg") ||
      node.getAttr("isDirectPriceCircleBg") ||
      node.getAttr("isCustomPackageInfo") ||
      node.getAttr("isLayoutDivider") ||
      node.getAttr("isPriceHitArea")
    );
  }

  function collectDirectSlotNodes(page, slotIndex) {
    if (!page || !page.layer || !Number.isFinite(Number(slotIndex))) return [];
    const targetSlot = Number(slotIndex);
    return page.layer.find((n) => {
      if (!n || !n.getAttr) return false;
      if (Number(n.getAttr("slotIndex")) !== targetSlot) return false;
      return !!(n.getAttr("directModuleId") || isManagedDirectSlotNode(n));
    });
  }

  function moveNodeToGroupPreserveAbsolute(node, group) {
    if (!node || !group || typeof node.moveTo !== "function") return;
    const abs = typeof node.getAbsolutePosition === "function"
      ? node.getAbsolutePosition()
      : { x: Number(node.x?.() || 0), y: Number(node.y?.() || 0) };
    node.moveTo(group);
    if (typeof node.absolutePosition === "function") node.absolutePosition(abs);
    else if (typeof node.setAbsolutePosition === "function") node.setAbsolutePosition(abs);
  }

  async function rebuildDirectModuleLayoutsOnPage(page, options = {}) {
    if (!page || !page.layer || !page.stage || !window.Konva) return 0;
    const requestedSlots = Array.isArray(options.slotIndexes)
      ? options.slotIndexes.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item >= 0)
      : [];
    const slotIndexes = Array.from(new Set(
      requestedSlots.length
        ? requestedSlots
        : ((Array.isArray(page.products) ? page.products : []).map((product, index) => (product ? index : null)).filter((item) => item != null))
    ));
    if (!slotIndexes.length) return 0;

    let rebuilt = 0;

    for (const slotIndex of slotIndexes) {
      const productEntry = Array.isArray(page.products) ? page.products[slotIndex] : null;
      if (!productEntry || typeof productEntry !== "object") continue;

      const slotNodes = collectDirectSlotNodes(page, slotIndex);
      const directNodes = slotNodes.filter((node) => !!String(node?.getAttr?.("directModuleId") || "").trim());
      if (!directNodes.length) continue;

      const layer = page.layer;
      const parentGroup = getTopUserGroupAncestor(directNodes[0]);
      const rects = slotNodes
        .map((node) => (typeof node.getClientRect === "function" ? node.getClientRect({ relativeTo: layer }) : null))
        .filter((rect) => rect && Number.isFinite(rect.x) && Number.isFinite(rect.y) && Number.isFinite(rect.width) && Number.isFinite(rect.height));
      const anchorRect = rects.length
        ? rects.reduce((acc, rect) => {
            acc.x = Math.min(acc.x, rect.x);
            acc.y = Math.min(acc.y, rect.y);
            acc.maxX = Math.max(acc.maxX, rect.x + rect.width);
            acc.maxY = Math.max(acc.maxY, rect.y + rect.height);
            return acc;
          }, { x: Infinity, y: Infinity, maxX: -Infinity, maxY: -Infinity })
        : null;
      const pointer = anchorRect && Number.isFinite(anchorRect.x) && Number.isFinite(anchorRect.y)
        ? {
            x: anchorRect.x + ((anchorRect.maxX - anchorRect.x) / 2),
            y: anchorRect.y + ((anchorRect.maxY - anchorRect.y) / 2)
          }
        : {
            x: Number(page.stage.width?.() || 0) / 2,
            y: Number(page.stage.height?.() || 0) / 2
          };

      let effectiveImageUrl = "";
      if (Array.isArray(productEntry.FAMILY_IMAGE_URLS) && productEntry.FAMILY_IMAGE_URLS.length) {
        effectiveImageUrl = String(productEntry.FAMILY_IMAGE_URLS[0] || "").trim();
      }
      if (!effectiveImageUrl) {
        const imageNode = directNodes.find((node) => node.getAttr && node.getAttr("isProductImage"));
        if (imageNode) {
          effectiveImageUrl = String(
            (typeof window.getNodeImageSource === "function"
              ? window.getNodeImageSource(imageNode, "original")
              : (imageNode.getAttr("originalSrc") || imageNode.getAttr("editorSrc") || imageNode.getAttr("thumbSrc") || imageNode.image?.()?.src)
            ) || ""
          ).trim();
        }
      }

      slotNodes.forEach((node) => {
        if (node && typeof node.destroy === "function") node.destroy();
      });
      if (Array.isArray(page.slotObjects)) page.slotObjects[slotIndex] = null;
      if (Array.isArray(page.barcodeObjects)) page.barcodeObjects[slotIndex] = null;

      const added = await addDirectCustomModuleToPage(page, slotIndex, pointer, productEntry, {
        effectiveImageUrl
      });
      if (!added) continue;

      if (parentGroup && !(typeof parentGroup.isDestroyed === "function" && parentGroup.isDestroyed())) {
        collectDirectSlotNodes(page, slotIndex)
          .filter((node) => node.getParent && node.getParent() === layer)
          .forEach((node) => moveNodeToGroupPreserveAbsolute(node, parentGroup));
      }

      rebuilt += 1;
    }

    page.layer?.batchDraw?.();
    page.transformerLayer?.batchDraw?.();
    return rebuilt;
  }

  function collectDirectModuleIdsFromSelectionDeep(selection) {
    const ids = new Set();
    const visit = (node) => {
      if (!node || (typeof node.isDestroyed === "function" && node.isDestroyed())) return;
      if (node.getAttr) {
        const id = String(node.getAttr("directModuleId") || "").trim();
        if (id) ids.add(id);
      }
      if (node.getChildren) {
        try { node.getChildren().forEach(visit); } catch (_err) {}
      }
    };
    (Array.isArray(selection) ? selection : []).forEach(visit);
    return ids;
  }

  function selectionContainsDirectNodes(selection) {
    return collectDirectModuleIdsFromSelectionDeep(selection).size > 0;
  }

  function bakeSelectedUserGroupTransformsBeforeUngroup(page, selection) {
    if (!page || !window.Konva) return;
    const directGroups = (Array.isArray(selection) ? selection : []).filter((n) =>
      n instanceof window.Konva.Group &&
      n.getAttr &&
      n.getAttr("isUserGroup")
    );
    const groupsToBake = new Set();
    const collectNestedUserGroups = (node) => {
      if (!node || !node.find) return;
      try {
        node.find((m) => m instanceof window.Konva.Group && m.getAttr && m.getAttr("isUserGroup"))
          .forEach((g) => groupsToBake.add(g));
      } catch (_err) {}
    };
    directGroups.forEach((g) => {
      groupsToBake.add(g);
      collectNestedUserGroups(g);
    });
    Array.from(groupsToBake).forEach((group) => {
      if (!group || !group.find) return;
      const hasDirectDesc = !!group.findOne((n) => n && n.getAttr && !!n.getAttr("directModuleId"));
      if (!hasDirectDesc) return;
      // Przy ręcznym rozgrupowaniu chcemy utrwalić pełny transform (łącznie z x/y),
      // żeby pozycja dzieci po ungroup była 1:1.
      bakeGroupTransformToChildren(group, { includeTranslation: true });
    });
  }

  function selectDirectModuleNodes(page, directModuleId) {
    if (!page || !directModuleId || !window.Konva) return false;
    const nodes = collectDirectModuleTopLevelNodes(page, directModuleId);
    if (!nodes.length) return false;
    page.selectedNodes = nodes;
    page.transformer?.nodes?.(nodes);
    page.transformer?.forceUpdate?.();
    page.layer?.find?.(".selectionOutline")?.forEach?.((n) => n.destroy?.());
    // importdanych rysuje outline własną funkcją; tutaj robimy minimum, żeby zaznaczenie było aktywne.
    page.layer?.batchDraw?.();
    page.transformerLayer?.batchDraw?.();
    return true;
  }

  function patchPageUngroupForDirectModules(page) {
    if (!page || typeof page.ungroupSelectedNodes !== "function") return;
    if (page._customDirectUngroupPatched) return;
    const originalUngroup = page.ungroupSelectedNodes.bind(page);
    page.ungroupSelectedNodes = function patchedUngroupSelectedNodes(...args) {
      const beforeSelection = Array.isArray(page.selectedNodes) ? page.selectedNodes.slice() : [];
      if (selectionContainsDirectNodes(beforeSelection)) {
        bakeSelectedUserGroupTransformsBeforeUngroup(page, beforeSelection);
      }
      const beforeIds = collectDirectModuleIdsFromSelectionDeep(beforeSelection);
      const out = originalUngroup(...args);
      try {
        restoreDirectModuleNodeSelectabilityOnPage(page);
        const afterIds = collectDirectModuleIdsFromSelectionDeep(page.selectedNodes);
        const targetId = Array.from(afterIds)[0] || Array.from(beforeIds)[0] || "";
        if (targetId) selectDirectModuleNodes(page, targetId);
        page.layer?.batchDraw?.();
        page.transformerLayer?.batchDraw?.();
      } catch (_err) {}
      return out;
    };
    page._customDirectUngroupPatched = true;
  }

  function ensureDirectModuleUngroupProtectionInstalled() {
    if (directModuleUngroupProtectionInstalled) return;
    directModuleUngroupProtectionInstalled = true;
    window.addEventListener("canvasModified", () => {
      if (directModuleStabilityWorkInProgress) return;
      directModuleStabilityWorkInProgress = true;
      try {
        const pages = Array.isArray(window.pages) ? window.pages : [];
        pages.forEach((p) => {
          patchPageUngroupForDirectModules(p);
          normalizeDirectModuleGroupTransformsOnPage(p);
          restoreDirectModuleNodeSelectabilityOnPage(p);
        });
      } finally {
        setTimeout(() => { directModuleStabilityWorkInProgress = false; }, 0);
      }
    });
  }

  function getCustomModuleDimensions(page) {
    const fallbackW = CUSTOM_MODULE_BASE_WIDTH;
    const fallbackH = CUSTOM_MODULE_BASE_HEIGHT;
    const slotW = (typeof BW_dynamic !== "undefined" && Number.isFinite(BW_dynamic) && BW_dynamic > 0)
      ? BW_dynamic
      : fallbackW;
    const slotH = (typeof BH_dynamic !== "undefined" && Number.isFinite(BH_dynamic) && BH_dynamic > 0)
      ? BH_dynamic
      : fallbackH;
    const scale = Math.min(slotW / fallbackW, slotH / fallbackH);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const w = Math.max(1, Math.round(fallbackW * safeScale));
    const h = Math.max(1, Math.round(fallbackH * safeScale));
    return { w, h };
  }

  function getCustomModuleScale(page) {
    const { w, h } = getCustomModuleDimensions(page);
    const sx = Number(w) / CUSTOM_MODULE_BASE_WIDTH;
    const sy = Number(h) / CUSTOM_MODULE_BASE_HEIGHT;
    const raw = Math.min(sx, sy);
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    return Math.max(0.45, Math.min(2.8, raw));
  }

  function ensureStylWlasnyHelperScriptLoaded() {
    if (window.__stylWlasnyHelper1Loaded || document.getElementById("stylWlasnyHelper1Script")) return;
    const s = document.createElement("script");
    s.id = "stylWlasnyHelper1Script";
    s.src = "styl-wlasny-1.js";
    s.async = true;
    s.onload = () => { window.__stylWlasnyHelper1Loaded = true; };
    s.onerror = () => {};
    document.head.appendChild(s);
  }

  function makeStripFlagDataUrl() {
    const key = "ro-strip";
    if (customBadgeImageCache.has(key)) return customBadgeImageCache.get(key);
    const c = document.createElement("canvas");
    c.width = 300;
    c.height = 28;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#22409a";
    ctx.fillRect(0, 0, 100, 28);
    ctx.fillStyle = "#f3d31f";
    ctx.fillRect(100, 0, 100, 28);
    ctx.fillStyle = "#c4003a";
    ctx.fillRect(200, 0, 100, 28);
    const url = c.toDataURL("image/png");
    customBadgeImageCache.set(key, url);
    return url;
  }

  function makePriceCircleDataUrl(color) {
    const safeColor = String(color || "#d71920").trim() || "#d71920";
    const key = `circle:${safeColor}`;
    if (customBadgeImageCache.has(key)) return customBadgeImageCache.get(key);
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 240;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = safeColor;
    ctx.beginPath();
    ctx.arc(120, 120, 118, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    const url = c.toDataURL("image/png");
    customBadgeImageCache.set(key, url);
    return url;
  }

  function buildStorageMediaUrl(objectPath) {
    const safePath = String(objectPath || "").trim();
    if (!safePath) return null;
    return `${IMAGE_BUCKET_BASE}${encodeURIComponent(safePath)}?alt=media`;
  }

  function getSelectedPriceBadgeStyleMeta() {
    return PRICE_BADGE_STYLE_OPTIONS.find((opt) => opt.id === customPriceBadgeStyleId) || PRICE_BADGE_STYLE_OPTIONS[0];
  }

  function getSelectedPriceBadgeBackgroundUrl() {
    const style = getSelectedPriceBadgeStyleMeta();
    if (!style || !style.path) return makePriceCircleDataUrl(customPriceCircleColor || "#d71920");
    return String(style.url || "").trim()
      || buildStorageMediaUrl(style.path)
      || makePriceCircleDataUrl(customPriceCircleColor || "#d71920");
  }

  function getSelectedModuleLayoutStyleMeta(styleIdOverride) {
    const styleId = String(styleIdOverride || customModuleLayoutStyleId || "default");
    return MODULE_LAYOUT_STYLE_OPTIONS.find((opt) => opt.id === styleId) || MODULE_LAYOUT_STYLE_OPTIONS[0];
  }

  function getSingleDirectLayoutSpec(styleIdOverride, hasImagePriceBadge) {
    const styleMeta = getSelectedModuleLayoutStyleMeta(styleIdOverride);
    const cfg = (styleMeta?.config && typeof styleMeta.config === "object") ? styleMeta.config : {};
    const single = (cfg.singleDirect && typeof cfg.singleDirect === "object") ? cfg.singleDirect : {};
    const family = (cfg.familyDirect && typeof cfg.familyDirect === "object") ? cfg.familyDirect : {};
    const familyImageLayouts = (family.imageLayouts && typeof family.imageLayouts === "object")
      ? family.imageLayouts
      : {};
    const n = (val, fallback) => {
      const parsed = Number(val);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    return {
      imgArea: {
        x: n(single?.imgArea?.x, 2.8),
        y: n(single?.imgArea?.y, 16.5),
        w: n(single?.imgArea?.w, 82),
        h: n(single?.imgArea?.h, 37)
      },
      nameArea: {
        x: n(single?.nameArea?.x, 35),
        y: n(single?.nameArea?.y, 56),
        w: n(single?.nameArea?.w, 38),
        h: n(single?.nameArea?.h, 20)
      },
      indexPos: {
        x: n(single?.indexPos?.x, 35),
        y: n(single?.indexPos?.y, 67.8)
      },
      packagePos: {
        x: n(single?.packagePos?.x, 35),
        y: n(single?.packagePos?.y, 72.0)
      },
      flagArea: {
        x: n(single?.flagArea?.x, 35),
        y: n(single?.flagArea?.y, 78.8),
        w: n(single?.flagArea?.w, 18),
        h: n(single?.flagArea?.h, 2.6)
      },
      priceArea: {
        x: n(single?.priceArea?.x, 3.5),
        y: n(single?.priceArea?.y, 57),
        s: n(single?.priceArea?.s, hasImagePriceBadge ? 27.5 : 24),
        w: n(single?.priceArea?.w, 0),
        h: n(single?.priceArea?.h, 0),
        r: n(single?.priceArea?.r, 0)
      },
      barcodeArea: {
        x: n(single?.barcodeArea?.x, 53),
        y: n(single?.barcodeArea?.y, 79.2),
        w: n(single?.barcodeArea?.w, 38),
        h: n(single?.barcodeArea?.h, 11)
      },
      divider: {
        x: n(single?.divider?.x, -1),
        y: n(single?.divider?.y, 0),
        h: n(single?.divider?.h, 0),
        w: n(single?.divider?.w, 0.45)
      },
      text: {
        nameColor: String(cfg?.text?.nameColor || "").trim(),
        indexColor: String(cfg?.text?.indexColor || "").trim(),
        packageColor: String(cfg?.text?.packageColor || "").trim(),
        indexItalic: typeof cfg?.text?.indexItalic === "boolean" ? cfg.text.indexItalic : true,
        noPriceCircle: !!cfg?.text?.noPriceCircle,
        priceColor: String(cfg?.text?.priceColor || "").trim(),
        forcePriceBold: !!cfg?.text?.forcePriceBold,
        priceExtraBold: !!cfg?.text?.priceExtraBold,
        priceScaleMultiplier: Number.isFinite(Number(cfg?.text?.priceScaleMultiplier)) ? Number(cfg.text.priceScaleMultiplier) : 1,
        priceShape: String(cfg?.text?.priceShape || "").trim(),
        priceBgColor: String(cfg?.text?.priceBgColor || "").trim(),
        priceBgRadius: Number.isFinite(Number(cfg?.text?.priceBgRadius)) ? Number(cfg.text.priceBgRadius) : 0
      },
      familyDirect: {
        useSingleLayout: !!family.useSingleLayout,
        imageLayouts: {
          family2: Array.isArray(familyImageLayouts.family2) ? sanitizeImageLayouts(familyImageLayouts.family2, []) : null,
          family3: Array.isArray(familyImageLayouts.family3) ? sanitizeImageLayouts(familyImageLayouts.family3, []) : null,
          family4: Array.isArray(familyImageLayouts.family4) ? sanitizeImageLayouts(familyImageLayouts.family4, []) : null
        }
      }
    };
  }

  function resolveDirectPriceTextColor(explicitValue, singleSpec, options = {}) {
    const explicit = String(explicitValue || "").trim();
    if (explicit) return explicit;
    const custom = String(customPriceTextColor || "").trim();
    if (custom) return custom;
    const styleColor = String(singleSpec?.text?.priceColor || "").trim();
    if (styleColor) return styleColor;
    return options && options.noPriceCircle ? "#d71920" : "#ffffff";
  }

  function syncPriceTextNodeMetrics(node, opts = {}) {
    if (!node || typeof node.measureSize !== "function") return;
    const textValue = String(node.text?.() || "");
    const measured = node.measureSize(textValue);
    const measuredW = Number(measured?.width);
    const measuredH = Number(measured?.height);
    const strokePad = Math.max(0, Number(node.strokeWidth?.() || 0) * 2);
    const extraPad = Math.max(0, Number(opts.extraPad) || 0);
    const minWidth = Math.max(0, Number(opts.minWidth) || 0);
    const minHeight = Math.max(0, Number(opts.minHeight) || 0);
    if (Number.isFinite(measuredW) && measuredW > 0 && typeof node.width === "function") {
      node.width(Math.max(minWidth, Math.ceil(measuredW + strokePad + extraPad)));
    }
    if (Number.isFinite(measuredH) && measuredH > 0 && typeof node.height === "function") {
      node.height(Math.max(minHeight, Math.ceil(measuredH + strokePad + Math.min(2, extraPad))));
    }
  }

  function generateBarcodeDataUrl(ean) {
    const code = scientificToPlain(ean);
    if (!code) return Promise.resolve(null);
    if (typeof window.generateBarcode === "function") {
      return new Promise((resolve) => {
        try {
          window.generateBarcode(code, (url) => resolve(url || null));
        } catch (_err) {
          resolve(null);
        }
      });
    }
    if (!(window.JsBarcode)) return Promise.resolve(null);
    return Promise.resolve().then(() => {
      try {
        const c = document.createElement("canvas");
        window.JsBarcode(c, code, {
          format: "EAN13",
          width: 2.2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 5,
          background: "transparent",
          lineColor: "#000"
        });
        return c.toDataURL("image/png");
      } catch (_err) {
        return null;
      }
    });
  }

  async function createKonvaImageNodeFromUrl(url) {
    const src = String(url || "").trim();
    if (!src) return null;
    const img = await loadKonvaImageFromUrl(src, 3000);
    if (img && img.setAttr) img.setAttr("originalSrc", src);
    return img || null;
  }

  function layoutImageNodeContain(node, frameX, frameY, frameW, frameH) {
    if (!node) return;
    const rawW = Number(node.width?.()) || 1;
    const rawH = Number(node.height?.()) || 1;
    const scale = Math.min(frameW / rawW, frameH / rawH);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    node.scaleX(safeScale);
    node.scaleY(safeScale);
    node.x(frameX + (frameW - rawW * safeScale) / 2);
    node.y(frameY + (frameH - rawH * safeScale) / 2);
  }

  function scaleNodeAroundCenter(node, factor) {
    if (!node || !Number.isFinite(Number(factor)) || Number(factor) <= 0 || Math.abs(Number(factor) - 1) < 0.001) return;
    const f = Number(factor);
    const rawW = Number(node.width?.() || 0);
    const rawH = Number(node.height?.() || 0);
    const oldSX = Number(node.scaleX?.() || 1);
    const oldSY = Number(node.scaleY?.() || 1);
    const oldX = Number(node.x?.() || 0);
    const oldY = Number(node.y?.() || 0);
    const cx = oldX + (rawW * oldSX) / 2;
    const cy = oldY + (rawH * oldSY) / 2;
    const nextSX = oldSX * f;
    const nextSY = oldSY * f;
    node.scaleX(nextSX);
    node.scaleY(nextSY);
    node.x(cx - (rawW * nextSX) / 2);
    node.y(cy - (rawH * nextSY) / 2);
  }

  function bindDirectPriceRectEditor(priceRect, page) {
    if (!priceRect || !priceRect.getAttr || !window.Konva || !(priceRect instanceof window.Konva.Rect)) return;
    if (!priceRect.getAttr("isDirectPriceRectBg")) return;

    const applyPriceRectTransformAsRealResize = () => {
      const sxRaw = Number(priceRect.scaleX?.() || 1);
      const syRaw = Number(priceRect.scaleY?.() || 1);
      const sx = Number.isFinite(sxRaw) ? sxRaw : 1;
      const sy = Number.isFinite(syRaw) ? syRaw : 1;
      const absSx = Math.max(0.2, Math.abs(sx));
      const absSy = Math.max(0.2, Math.abs(sy));
      if (Math.abs(absSx - 1) < 0.001 && Math.abs(absSy - 1) < 0.001) return;

      const currentW = Math.max(1, Number(priceRect.width?.() || 0));
      const currentH = Math.max(1, Number(priceRect.height?.() || 0));
      const nextW = Math.max(32, Math.round(currentW * absSx));
      const nextH = Math.max(20, Math.round(currentH * absSy));

      if (sx < 0) priceRect.x((priceRect.x?.() || 0) - nextW);
      if (sy < 0) priceRect.y((priceRect.y?.() || 0) - nextH);

      priceRect.width(nextW);
      priceRect.height(nextH);

      const currentCorner = priceRect.cornerRadius?.();
      const cornerBase = Array.isArray(currentCorner)
        ? Number(currentCorner[0] || 0)
        : Number(currentCorner || 0);
      if (Number.isFinite(cornerBase) && cornerBase > 0) {
        const cornerScaled = Math.max(0, Math.round(cornerBase * Math.max(absSx, absSy)));
        priceRect.cornerRadius(cornerScaled);
      }

      priceRect.scaleX?.(1);
      priceRect.scaleY?.(1);

      page?.layer?.batchDraw?.();
      page?.transformerLayer?.batchDraw?.();
    };

    if (typeof priceRect.off === "function") {
      priceRect.off("transformend.directPriceRectResize");
    }
    if (typeof priceRect.on === "function") {
      priceRect.on("transformend.directPriceRectResize", applyPriceRectTransformAsRealResize);
    }
    if (typeof priceRect.draggable === "function") priceRect.draggable(true);
    if (typeof priceRect.listening === "function") priceRect.listening(true);
    priceRect.setAttr("selectable", true);
    priceRect.setAttr("_directPriceRectEditorBound", true);
  }

  function bindDirectPriceGroupEditor(priceGroup, page) {
    if (!priceGroup || !priceGroup.getAttr) return;
    const children = priceGroup.getChildren ? priceGroup.getChildren() : [];
    const hitArea = children.find((n) => n && n.getAttr && n.getAttr("isPriceHitArea"));
    const main = children.find((n) => n && n.getAttr && n.getAttr("pricePart") === "main");
    const dec = children.find((n) => n && n.getAttr && n.getAttr("pricePart") === "dec");
    const unit = children.find((n) => n && n.getAttr && n.getAttr("pricePart") === "unit");
    const layer = priceGroup.getLayer ? priceGroup.getLayer() : null;
    const parentGroup = priceGroup.getParent ? priceGroup.getParent() : null;
    const directModuleId = String(priceGroup.getAttr?.("directModuleId") || "");
    const slotIndex = Number(priceGroup.getAttr?.("slotIndex"));
    const rectBgSibling = layer && typeof layer.findOne === "function"
      ? layer.findOne((n) => {
          if (!n || !n.getAttr) return false;
          if (!n.getAttr("isDirectPriceRectBg")) return false;
          if (n === priceGroup) return false;
          if (n.getParent && n.getParent() !== parentGroup) return false;
          if (String(n.getAttr("directModuleId") || "") !== directModuleId) return false;
          if (Number(n.getAttr("slotIndex")) !== slotIndex) return false;
          return true;
        })
      : null;
    const rectBgChild = children.find((n) => n && n.getAttr && n.getAttr("isDirectPriceRectBg"));
    let rectBg = rectBgSibling || rectBgChild || null;
    if (!rectBg && layer && parentGroup && typeof layer.find === "function" && typeof parentGroup.getChildren === "function") {
      const bgOffsetX = Number(priceGroup.getAttr?.("priceBgOffsetX"));
      const bgOffsetY = Number(priceGroup.getAttr?.("priceBgOffsetY"));
      const expectedX = (priceGroup.x?.() || 0) + (Number.isFinite(bgOffsetX) ? bgOffsetX : 0);
      const expectedY = (priceGroup.y?.() || 0) + (Number.isFinite(bgOffsetY) ? bgOffsetY : 0);
      const expectedW = Number(priceGroup.getAttr?.("priceBgWidth"));
      const expectedH = Number(priceGroup.getAttr?.("priceBgHeight"));
      const candidates = layer.find((n) => {
        if (!(n instanceof window.Konva.Rect) || !n.getAttr) return false;
        if (n.getAttr("isPriceHitArea")) return false;
        if (n.getAttr("isPageBg")) return false;
        if (n.getAttr("isBox")) return false;
        if (String(n.getAttr("directModuleId") || "") !== directModuleId) return false;
        if (Number(n.getAttr("slotIndex")) !== slotIndex) return false;
        if (n.getParent && n.getParent() !== parentGroup) return false;
        return true;
      });
      const picked = (Array.isArray(candidates) ? candidates : []).find((n) => {
        const w = Number(n.width?.() || 0);
        const h = Number(n.height?.() || 0);
        const x = Number(n.x?.() || 0);
        const y = Number(n.y?.() || 0);
        const matchSize =
          Number.isFinite(expectedW) && Number.isFinite(expectedH)
            ? (Math.abs(w - expectedW) <= 2 && Math.abs(h - expectedH) <= 2)
            : (w > 40 && h > 16);
        const matchPos = Math.abs(x - expectedX) <= 4 && Math.abs(y - expectedY) <= 4;
        return matchSize || matchPos;
      }) || null;
      if (picked) {
        picked.setAttr?.("isDirectPriceRectBg", true);
        picked.setAttr?.("isOverlayElement", true);
        picked.setAttr?.("selectable", true);
        if (typeof picked.listening === "function") picked.listening(true);
        if (typeof picked.draggable === "function") picked.draggable(true);
        rectBg = picked;
      }
    }
    if (rectBgChild && parentGroup && typeof rectBgChild.remove === "function" && typeof parentGroup.add === "function") {
      // Migracja starszych modułów: tło prostokąta wynosimy poza priceGroup,
      // żeby skalowanie dotyczyło samego tekstu ceny.
      try {
        const abs = rectBgChild.getAbsolutePosition ? rectBgChild.getAbsolutePosition() : null;
        rectBgChild.remove();
        parentGroup.add(rectBgChild);
        if (abs && rectBgChild.setAbsolutePosition) rectBgChild.setAbsolutePosition(abs);
        if (typeof rectBgChild.draggable === "function") rectBgChild.draggable(true);
        if (typeof rectBgChild.listening === "function") rectBgChild.listening(true);
        rectBgChild.setAttr?.("isDirectPriceRectBg", true);
        rectBgChild.setAttr?.("isOverlayElement", true);
        rectBgChild.setAttr?.("selectable", true);
        rectBg = rectBgChild;
      } catch (_err) {}
    }
    if (rectBg) {
      try { bindDirectPriceRectEditor(rectBg, page); } catch (_err) {}
    }
    if (!main || !dec || !unit) return;

    const updateHitArea = () => {
      if (!hitArea || typeof hitArea.setAttrs !== "function") return;
      const getRect = (node, useMeasuredWidth = false) => {
        if (!node) return null;
        try {
          const rect = node.getClientRect({ relativeTo: priceGroup });
          if (!rect) return null;
          if (useMeasuredWidth && typeof node.measureSize === "function") {
            const m = node.measureSize(node.text?.() || "");
            const measuredW = Number(m?.width);
            if (Number.isFinite(measuredW) && measuredW > 0 && measuredW < rect.width) {
              rect.width = measuredW + 2;
            }
          }
          return rect;
        } catch (_err) {
          return null;
        }
      };
      const isRoundedRect = !!priceGroup.getAttr?.("priceShapeRoundedRect");
      const rects = [
        getRect(main, false),
        getRect(dec, false),
        getRect(unit, true)
      ].filter(Boolean);
      if (!rects.length) return;
      const minX = Math.min(...rects.map((r) => r.x));
      const minY = Math.min(...rects.map((r) => r.y));
      const maxX = Math.max(...rects.map((r) => r.x + r.width));
      const maxY = Math.max(...rects.map((r) => r.y + r.height));
      const pad = isRoundedRect ? 2 : 6;
      hitArea.setAttrs({
        x: minX - pad,
        y: minY - pad,
        width: Math.max(isRoundedRect ? 18 : 24, (maxX - minX) + pad * 2),
        height: Math.max(isRoundedRect ? 14 : 18, (maxY - minY) + pad * 2)
      });
    };

    const realign = () => {
      syncPriceTextNodeMetrics(main, { extraPad: 4, minWidth: 8, minHeight: 8 });
      syncPriceTextNodeMetrics(dec, { extraPad: 4, minWidth: 8, minHeight: 8 });
      syncPriceTextNodeMetrics(unit, { extraPad: 8, minWidth: 24, minHeight: 8 });

      const gap = 4;
      const baseX = Number(priceGroup.getAttr?.("priceTextOffsetX"));
      const baseY = Number(priceGroup.getAttr?.("priceTextOffsetY"));
      let safeBaseX = Number.isFinite(baseX) ? baseX : (main.x?.() || 0);
      const safeBaseY = Number.isFinite(baseY) ? baseY : (main.y?.() || 0);
      const alignMode = normalizeAlignOption(priceGroup.getAttr?.("priceTextAlign") || "left", "left");
      const circleSize = Number(priceGroup.getAttr?.("priceCircleSize"));
      const circleLocalX = Number(priceGroup.getAttr?.("priceCircleLocalX"));
      const isDirectSingle = !!priceGroup.getAttr?.("isDirectSinglePriceLayout");
      const isImageBadge = !!priceGroup.getAttr?.("isImagePriceBadge");
      const noPriceCircleDirect = !!priceGroup.getAttr?.("noPriceCircleDirect");
      const isRoundedRect = !!priceGroup.getAttr?.("priceShapeRoundedRect");
      const noOpticalShift = !!priceGroup.getAttr?.("priceNoOpticalShift");
      const priceBadgeStyleId = String(priceGroup.getAttr?.("priceBadgeStyleId") || "");
      const isTnzBadge = priceBadgeStyleId.includes("tnz");
      const isGranatBadge = priceBadgeStyleId.includes("granatowe");
      const localUnitGap = isDirectSingle ? (noPriceCircleDirect ? 7 : (isRoundedRect ? 6 : 2)) : gap;
      const mainW = Number(main.width?.() || 0);
      const decW = Number(dec.width?.() || 0);
      let unitMeasuredW = Number(unit.width?.() || 0);
      if (typeof unit.measureSize === "function") {
        const m = unit.measureSize(unit.text?.() || "");
        if (m && Number.isFinite(m.width)) unitMeasuredW = m.width;
      }
      const clusterWidth = Math.max(
        mainW,
        mainW + gap + decW,
        mainW + localUnitGap + unitMeasuredW
      );
      const fallbackCircle = Number.isFinite(circleSize) ? circleSize : 80;
      let opticalShiftX = 0;
      let opticalShiftY = 0;
      if (isDirectSingle && !noPriceCircleDirect && !isRoundedRect) {
        opticalShiftX = Math.round(fallbackCircle * (isTnzBadge ? 0.245 : (isGranatBadge ? 0.135 : (isImageBadge ? 0.11 : 0.09))));
        opticalShiftY = Math.round(fallbackCircle * (isTnzBadge ? 0.068 : (isGranatBadge ? 0.05 : (isImageBadge ? 0.045 : 0.025))));
      } else if (isImageBadge) {
        opticalShiftX = Math.round(fallbackCircle * (isTnzBadge ? 0.14 : (isGranatBadge ? 0.28 : 0.16)));
        opticalShiftY = Math.round(fallbackCircle * (isTnzBadge ? 0.03 : (isGranatBadge ? 0.045 : 0.03)));
      }
      if (Number.isFinite(circleSize) && Number.isFinite(circleLocalX)) {
        // W single+koło utrzymujemy taki sam "oddech" od lewej/prawej jak w podglądzie HTML.
        const innerPad = (isDirectSingle && !noPriceCircleDirect && !isRoundedRect) ? 10 : 4;
        if (alignMode === "center") safeBaseX = circleLocalX + (circleSize - clusterWidth) / 2;
        else if (alignMode === "right") safeBaseX = circleLocalX + circleSize - clusterWidth - innerPad;
        else safeBaseX = circleLocalX + innerPad;
      }
      if ((isDirectSingle || isImageBadge) && alignMode !== "right" && !noPriceCircleDirect && !noOpticalShift) safeBaseX += opticalShiftX;
      main.x(safeBaseX);
      main.y(safeBaseY + opticalShiftY);
      dec.x(safeBaseX + (main.width?.() || 0) + gap);
      dec.y((safeBaseY + opticalShiftY) + (main.height?.() || 0) * (noPriceCircleDirect ? 0.00 : (isRoundedRect ? 0.04 : 0.10)));
      const noCircleGap = noPriceCircleDirect ? 6 : (isRoundedRect ? 6 : 2);
      unit.x(safeBaseX + (main.width?.() || 0) + (isDirectSingle ? noCircleGap : gap));
      unit.y((safeBaseY + opticalShiftY) + (dec.height?.() || 0) * (isDirectSingle ? (noPriceCircleDirect ? 1.02 : (isRoundedRect ? 1.02 : 1.35)) : 1.5));
      if (typeof unit.width === "function" && typeof unit.measureSize === "function") {
        const measured = unit.measureSize(unit.text?.() || "");
        const targetW = Math.max(
          isDirectSingle ? (noPriceCircleDirect ? 68 : (isRoundedRect ? 60 : 42)) : 34,
          Math.ceil((measured?.width || 0) + (isDirectSingle ? (noPriceCircleDirect ? 12 : (isRoundedRect ? 8 : 10)) : 6))
        );
        unit.width(targetW);
      }
      updateHitArea();
      // Cena i prostokąt tła są niezależne: nie synchronizujemy pozycji prostokąta z ceną.
      page?.layer?.batchDraw?.();
      page?.transformerLayer?.batchDraw?.();
    };
    const applyPriceGroupTransformAsRealResize = () => {
      const isRoundedRect = !!priceGroup.getAttr?.("priceShapeRoundedRect");
      if (!isRoundedRect) return;
      const sx = Math.abs(Number(priceGroup.scaleX?.() || 1));
      const sy = Math.abs(Number(priceGroup.scaleY?.() || 1));
      const factor = Math.max(0.25, Math.min(4, Math.max(sx, sy)));
      if (!Number.isFinite(factor) || Math.abs(factor - 1) < 0.001) return;

      const scaleTextNode = (node, minSize, maxSize) => {
        if (!node || typeof node.fontSize !== "function") return;
        const fs = Number(node.fontSize() || 0);
        if (!Number.isFinite(fs) || fs <= 0) return;
        node.fontSize(Math.max(minSize, Math.min(maxSize, Math.round(fs * factor))));
      };
      scaleTextNode(main, 12, 220);
      scaleTextNode(dec, 8, 180);
      scaleTextNode(unit, 7, 180);

      priceGroup.scaleX?.(1);
      priceGroup.scaleY?.(1);
      realign();
    };
    if (typeof priceGroup.off === "function") {
      priceGroup.off("dblclick.directPriceEdit dbltap.directPriceEdit");
      priceGroup.off("transformend.directPriceResize");
      priceGroup.off("dragmove.directPriceRealign");
    }
    priceGroup.on("dblclick.directPriceEdit dbltap.directPriceEdit", () => {
      const current = `${main.text?.() || "0"}.${dec.text?.() || "00"}`;
      const raw = prompt("Podaj nową cenę (np. 1,49):", String(current).replace(".", ","));
      if (raw == null) return;
      const parsed = parseFloat(String(raw).replace(",", ".").replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(parsed)) return;
      const [nm, nd] = parsed.toFixed(2).split(".");
      main.text(nm);
      dec.text(nd);
      realign();
    });
    priceGroup.on("transformend.directPriceResize", applyPriceGroupTransformAsRealResize);
    priceGroup.on("dragmove.directPriceRealign", realign);
    priceGroup.setAttr("_directPriceEditorBound", true);
    realign();
  }

  async function addDirectCustomModuleToPage(page, slotIndex, pointer, catalogEntry, options = {}) {
    if (!page || !page.layer || !page.stage || !window.Konva) return false;
    ensureDirectModuleUngroupProtectionInstalled();
    const layer = page.layer;
    const stage = page.stage;
    const directModuleId = nextDirectModuleId();
    const { w: moduleW, h: moduleH } = getCustomModuleDimensions(page);
    const moduleScale = getCustomModuleScale(page);
    const stageW = stage.width?.() || 0;
    const stageH = stage.height?.() || 0;
    const x = Math.max(0, Math.min(Math.max(0, stageW - moduleW), (pointer?.x || 0) - moduleW / 2));
    const y = Math.max(0, Math.min(Math.max(0, stageH - moduleH), (pointer?.y || 0) - moduleH / 2));

    const pct = (px, total) => (Number(px) / 100) * total;
    const imageUrls = Array.isArray(catalogEntry?.FAMILY_IMAGE_URLS) && catalogEntry.FAMILY_IMAGE_URLS.length
      ? catalogEntry.FAMILY_IMAGE_URLS.filter(Boolean)
      : [String(options.effectiveImageUrl || "").trim()].filter(Boolean);
    const isSingleDirectLayout = imageUrls.length <= 1;
    const hasImagePriceBadge = String(catalogEntry?.PRICE_BG_STYLE_ID || customPriceBadgeStyleId || "solid") !== "solid";
    const selectedLayoutStyleId = String(catalogEntry?.MODULE_LAYOUT_STYLE_ID || customModuleLayoutStyleId || "default");
    const singleSpec = getSingleDirectLayoutSpec(selectedLayoutStyleId, hasImagePriceBadge);
    const useSingleLayoutForFamily = !isSingleDirectLayout && !!singleSpec.familyDirect?.useSingleLayout;
    const useSingleLikeDirectLayout = isSingleDirectLayout || useSingleLayoutForFamily;
    const useCustomSinglePalette = useSingleLikeDirectLayout && isCustomSingleStyle(selectedLayoutStyleId);
    const isStyle2FamilyTwoFinal = !isSingleDirectLayout && selectedLayoutStyleId === "styl-numer-2" && imageUrls.length === 2;
    const noPriceCircleDirect = useCustomSinglePalette && !!singleSpec.text.noPriceCircle;
    const isRoundedRectPriceDirect = useCustomSinglePalette && !noPriceCircleDirect && singleSpec.text.priceShape === "roundedRect";
    const nameFontSizeDirect = Math.max(6, Math.round((useSingleLikeDirectLayout ? 10 : 12) * moduleScale));
    const indexFontSizeDirect = Math.max(5, Math.round((useSingleLikeDirectLayout ? 12 : 8) * moduleScale));
    const packageFontSizeDirect = Math.max(5, Math.round((useSingleLikeDirectLayout ? 12 : 8) * moduleScale));
    const infoTextMinWidth = Math.max(56, Math.round(120 * moduleScale));

    // Nowy układ direct (single): jak na przykładzie użytkownika
    // duże zdjęcie u góry, cena lewy dół, tekst po prawej od ceny.
    const imgArea = useSingleLikeDirectLayout
      ? { x: x + pct(singleSpec.imgArea.x, moduleW), y: y + pct(singleSpec.imgArea.y, moduleH), w: pct(singleSpec.imgArea.w, moduleW), h: pct(singleSpec.imgArea.h, moduleH) }
      : { x: x + pct(0, moduleW), y: y + pct(4, moduleH), w: pct(48, moduleW), h: pct(83, moduleH) };
    const nameArea = useSingleLikeDirectLayout
      ? { x: x + pct(singleSpec.nameArea.x, moduleW), y: y + pct(singleSpec.nameArea.y, moduleH), w: pct(singleSpec.nameArea.w, moduleW), h: pct(singleSpec.nameArea.h, moduleH) }
      : { x: x + pct(49, moduleW), y: y + pct(50, moduleH), w: pct(47, moduleW), h: pct(15, moduleH) };
    const indexPos = useSingleLikeDirectLayout
      ? { x: x + pct(singleSpec.indexPos.x, moduleW), y: y + pct(singleSpec.indexPos.y, moduleH) }
      : { x: x + pct(48.7, moduleW), y: y + pct(62, moduleH) };
    const packagePos = useSingleLikeDirectLayout
      ? { x: x + pct(singleSpec.packagePos.x, moduleW), y: y + pct(singleSpec.packagePos.y, moduleH) }
      : { x: x + pct(48.7, moduleW), y: y + pct(65.2, moduleH) };
    const flagArea = useSingleLikeDirectLayout
      ? { x: x + pct(singleSpec.flagArea.x, moduleW), y: y + pct(singleSpec.flagArea.y, moduleH), w: pct(singleSpec.flagArea.w, moduleW), h: pct(singleSpec.flagArea.h, moduleH) }
      : { x: x + pct(49, moduleW), y: y + pct(72, moduleH), w: pct(34, moduleW), h: pct(3, moduleH) };
    const priceArea = useSingleLikeDirectLayout
      ? {
          x: x + pct(singleSpec.priceArea.x, moduleW),
          y: y + pct(singleSpec.priceArea.y, moduleH),
          s: Math.max(56, pct(singleSpec.priceArea.s, moduleW)),
          w: Math.max(72, pct(singleSpec.priceArea.w > 0 ? singleSpec.priceArea.w : singleSpec.priceArea.s * 1.5, moduleW)),
          h: Math.max(32, pct(singleSpec.priceArea.h > 0 ? singleSpec.priceArea.h : singleSpec.priceArea.s * 0.64, moduleH)),
          r: Math.max(0, pct(singleSpec.priceArea.r || 0, moduleW))
        }
      : { x: x + pct(22, moduleW), y: y + pct(70, moduleH), s: Math.max(48, pct(18, moduleW)) };
    const barcodeArea = useSingleLikeDirectLayout
      ? { x: x + pct(singleSpec.barcodeArea.x, moduleW), y: y + pct(singleSpec.barcodeArea.y, moduleH), w: pct(singleSpec.barcodeArea.w, moduleW), h: pct(singleSpec.barcodeArea.h, moduleH) }
      : { x: x + pct(40, moduleW), y: y + pct(76, moduleH), w: pct(49, moduleW), h: pct(22, moduleH) };
    const dividerArea = useSingleLikeDirectLayout && singleSpec.divider.x >= 0 && singleSpec.divider.h > 0
      ? { x: x + pct(singleSpec.divider.x, moduleW), y: y + pct(singleSpec.divider.y, moduleH), w: pct(singleSpec.divider.w, moduleW), h: pct(singleSpec.divider.h, moduleH) }
      : null;
    const createdNodes = [];
    const addNode = (node) => {
      if (!node) return;
      layer.add(node);
      createdNodes.push(node);
    };
    const metaFontFamily = normalizeFontOption(catalogEntry?.TEXT_FONT_FAMILY || customMetaFontFamily, page.settings?.fontFamily || "Arial");
    const metaTextColor = String(catalogEntry?.TEXT_COLOR || customMetaTextColor || (useSingleLikeDirectLayout ? "#1f3560" : "#111827"));
    const nameTextColor = useCustomSinglePalette ? (singleSpec.text.nameColor || "#111111") : metaTextColor;
    const indexTextColor = useCustomSinglePalette
      ? (singleSpec.text.indexColor || DEFAULT_INDEX_TEXT_COLOR)
      : String(catalogEntry?.TEXT_INDEX_COLOR || DEFAULT_INDEX_TEXT_COLOR);
    const packageTextColor = useCustomSinglePalette ? (singleSpec.text.packageColor || "#111111") : metaTextColor;
    const metaTextBold = boolAttrToFlag(catalogEntry?.TEXT_BOLD ?? customMetaTextBold);
    const metaTextUnderline = boolAttrToFlag(catalogEntry?.TEXT_UNDERLINE ?? customMetaTextUnderline);
    const metaTextAlign = normalizeAlignOption(catalogEntry?.TEXT_ALIGN || customMetaTextAlign, "left");
    const priceFontFamily = normalizeFontOption(catalogEntry?.PRICE_FONT_FAMILY || customPriceFontFamily, page.settings?.fontFamily || "Arial");
    const priceTextBold = boolAttrToFlag(catalogEntry?.PRICE_TEXT_BOLD ?? customPriceTextBold);
    const effectivePriceBoldDirect = useCustomSinglePalette && singleSpec.text.forcePriceBold ? true : priceTextBold;
    const effectivePriceExtraBoldDirect = useCustomSinglePalette && !!singleSpec.text.priceExtraBold;
    const priceTextUnderline = boolAttrToFlag(catalogEntry?.PRICE_TEXT_UNDERLINE ?? customPriceTextUnderline);
    const priceTextAlign = normalizeAlignOption(catalogEntry?.PRICE_TEXT_ALIGN || customPriceTextAlign, "left");

    const layouts = Array.isArray(catalogEntry?.CUSTOM_IMAGE_LAYOUTS) ? catalogEntry.CUSTOM_IMAGE_LAYOUTS : [];
    for (let i = 0; i < Math.min(4, imageUrls.length); i++) {
      const kImg = await createKonvaImageNodeFromUrl(imageUrls[i]);
      if (!kImg) continue;
      const layout = layouts[i] || { x: 0.02, y: 0.02, w: 0.96, h: 0.96 };
      const frame = {
        x: imgArea.x + imgArea.w * clamp01(layout.x, 0),
        y: imgArea.y + imgArea.h * clamp01(layout.y, 0),
        w: imgArea.w * Math.max(0.05, clamp01(layout.w, 0.96)),
        h: imgArea.h * Math.max(0.05, clamp01(layout.h, 0.96))
      };
      if (isStyle2FamilyTwoFinal) {
        // Tylko finalny moduł: w Styl numer 2 (2 produkty) dosuwamy zdjęcia bliżej bloku tekstu/ceny.
        frame.x += imgArea.w * 0.08;
      }
      layoutImageNodeContain(kImg, frame.x, frame.y, frame.w, frame.h);
      kImg.draggable(true);
      kImg.listening(true);
      kImg.setAttrs({
        slotIndex,
        directModuleId,
        isProductImage: true,
        familyImageIndex: i
      });
      addNode(kImg);
      if (typeof setupProductImageDrag === "function") setupProductImageDrag(kImg, layer);
      if (typeof addImageShadow === "function") addImageShadow(layer, kImg);
    }

    if (dividerArea) {
      const dividerNode = new window.Konva.Rect({
        x: dividerArea.x,
        y: dividerArea.y,
        width: Math.max(1, dividerArea.w),
        height: Math.max(8, dividerArea.h),
        fill: "#d9d9d9",
        cornerRadius: 1,
        draggable: true
      });
      dividerNode.setAttrs({ slotIndex, directModuleId, isProductText: true, isLayoutDivider: true });
      addNode(dividerNode);
    }

    const nameText = new window.Konva.Text({
      x: nameArea.x,
      y: nameArea.y,
      width: nameArea.w,
      height: nameArea.h,
      text: String(catalogEntry?.NAZWA || "-"),
      fontSize: nameFontSizeDirect,
      lineHeight: 1.04,
      fontFamily: metaFontFamily,
      fill: nameTextColor,
      fontStyle: buildKonvaFontStyle({ bold: metaTextBold, italic: false }),
      textDecoration: metaTextUnderline ? "underline" : "",
      wrap: "word",
      align: metaTextAlign,
      draggable: true
    });
    nameText.setAttrs({ slotIndex, isProductText: true, isName: true });
    nameText.setAttr("layoutMaxHeight", nameArea.h);
    nameText.setAttr("layoutBaseFontSize", nameFontSizeDirect);
    nameText.setAttr("directModuleId", directModuleId);
    tightenDirectTextSelectionBox(nameText);
    addNode(nameText);
    if (typeof enableEditableText === "function") enableEditableText(nameText, page);

    const indexText = new window.Konva.Text({
      x: indexPos.x,
      y: indexPos.y,
      width: Math.max(infoTextMinWidth, nameArea.w * 0.95),
      text: String(catalogEntry?.INDEKS || "-"),
      fontSize: indexFontSizeDirect,
      lineHeight: 1.05,
      fontFamily: metaFontFamily,
      fill: indexTextColor,
      fontStyle: buildKonvaFontStyle({ bold: metaTextBold, italic: useCustomSinglePalette ? !!singleSpec.text.indexItalic : true }),
      textDecoration: metaTextUnderline ? "underline" : "",
      wrap: "none",
      align: metaTextAlign,
      draggable: true
    });
    indexText.setAttrs({ slotIndex, isProductText: true, isIndex: true });
    indexText.setAttr("layoutBaseX", indexPos.x);
    indexText.setAttr("layoutBaseY", indexPos.y);
    indexText.setAttr("layoutBaseWidth", Math.max(infoTextMinWidth, nameArea.w * 0.95));
    indexText.setAttr("directModuleId", directModuleId);
    applySmallTextEasyHitArea(indexText);
    tightenDirectTextSelectionBox(indexText);
    addNode(indexText);
    if (typeof enableEditableText === "function") enableEditableText(indexText, page);

    const packageInfoText = String(catalogEntry?.CUSTOM_PACKAGE_INFO_TEXT || "").trim();
    if (packageInfoText) {
      const packageNode = new window.Konva.Text({
        x: packagePos.x,
        y: packagePos.y,
        width: Math.max(infoTextMinWidth, nameArea.w * 0.95),
        text: packageInfoText,
        fontSize: packageFontSizeDirect,
        lineHeight: 1.05,
        fontFamily: metaFontFamily,
        fill: packageTextColor,
        fontStyle: buildKonvaFontStyle({ bold: metaTextBold, italic: false }),
        textDecoration: metaTextUnderline ? "underline" : "",
        wrap: "none",
        align: metaTextAlign,
        draggable: true
      });
      packageNode.setAttrs({ slotIndex, isProductText: true, isCustomPackageInfo: true });
      packageNode.setAttr("layoutBaseX", packagePos.x);
      packageNode.setAttr("layoutBaseY", packagePos.y);
      packageNode.setAttr("layoutBaseWidth", Math.max(infoTextMinWidth, nameArea.w * 0.95));
      packageNode.setAttr("directModuleId", directModuleId);
      applySmallTextEasyHitArea(packageNode);
      tightenDirectTextSelectionBox(packageNode);
      addNode(packageNode);
      if (typeof enableEditableText === "function") enableEditableText(packageNode, page);
    }

    if (String(catalogEntry?.KRAJPOCHODZENIA || "").trim()) {
      const flagUrl = makeStripFlagDataUrl();
      const flagImg = await createKonvaImageNodeFromUrl(flagUrl);
      if (flagImg) {
        flagImg.x(flagArea.x);
        flagImg.y(flagArea.y);
        flagImg.width(flagImg.width?.() || 300);
        flagImg.height(flagImg.height?.() || 28);
        layoutImageNodeContain(flagImg, flagArea.x, flagArea.y, flagArea.w, flagArea.h);
        flagImg.draggable(true);
        flagImg.setAttrs({ slotIndex, directModuleId, isCountryBadge: true, isOverlayElement: true });
        addNode(flagImg);
      }
    }

    const priceParts = formatPrice(catalogEntry?.CENA || "0.00");
    const priceCurrencySymbol = getEffectiveCurrencySymbol(catalogEntry, priceParts.currency);
    const priceUnitSuffix = isWeightProduct(catalogEntry) ? "KG" : "SZT.";
    const priceScale = Number.isFinite(Number(catalogEntry?.PRICE_TEXT_SCALE))
      ? Number(catalogEntry.PRICE_TEXT_SCALE)
      : 1;
    const effectivePriceScaleDirect = priceScale * (useCustomSinglePalette ? Math.max(1, Number(singleSpec.text.priceScaleMultiplier || 1)) : 1);
    const priceColor = resolveDirectPriceTextColor(catalogEntry?.PRICE_TEXT_COLOR, singleSpec, {
      noPriceCircle: !!noPriceCircleDirect
    });
    const priceTextOffsetX = noPriceCircleDirect ? 0 : (isRoundedRectPriceDirect ? Math.round(priceArea.w * 0.06) : Math.round(priceArea.s * (useSingleLikeDirectLayout ? 0.16 : 0.22)));
    const priceTextOffsetY = noPriceCircleDirect ? 0 : (isRoundedRectPriceDirect ? Math.round(priceArea.h * 0.10) : Math.round(priceArea.s * (useSingleLikeDirectLayout ? 0.235 : 0.26)));

    const priceBadgeStyleId = String(catalogEntry?.PRICE_BG_STYLE_ID || customPriceBadgeStyleId || "solid");
    if (!noPriceCircleDirect && !isRoundedRectPriceDirect) {
      const priceCircleUrl = String(catalogEntry?.PRICE_BG_IMAGE_URL || "").trim() || getSelectedPriceBadgeBackgroundUrl();
      const priceBg = await createKonvaImageNodeFromUrl(priceCircleUrl);
      if (priceBg) {
        priceBg.x(priceArea.x);
        priceBg.y(priceArea.y);
        priceBg.width(priceBg.width?.() || 240);
        priceBg.height(priceBg.height?.() || 240);
        layoutImageNodeContain(priceBg, priceArea.x, priceArea.y, priceArea.s, priceArea.s);
        if (hasImagePriceBadge && !useSingleLikeDirectLayout) {
          const familyBadgeBoost = priceBadgeStyleId.includes("tnz")
            ? 1.14
            : (priceBadgeStyleId.includes("granatowe") ? 1.24 : 1.16);
          scaleNodeAroundCenter(priceBg, familyBadgeBoost);
        }
        // Klik ma przechodzić do powiększonego hit-area na priceGroup (tekst ceny),
        // dzięki temu łatwiej zaznaczyć cenę, ale dalej można skalować sam tekst.
        priceBg.draggable(false);
        priceBg.listening(false);
        priceBg.setAttrs({
          slotIndex,
          directModuleId,
          isOverlayElement: true,
          isDirectPriceCircleBg: true,
          selectable: false
        });
        addNode(priceBg);
      }
    }
    let priceRectBgNode = null;
    const priceGroup = new window.Konva.Group({
      x: priceArea.x + priceTextOffsetX,
      y: priceArea.y + priceTextOffsetY,
      draggable: true,
      listening: true
    });
    priceGroup.setAttrs({ slotIndex, isPriceGroup: true, isPrice: true, isProductText: true });
    priceGroup.setAttr("directModuleId", directModuleId);
    if (useSingleLikeDirectLayout) priceGroup.setAttr("isDirectSinglePriceLayout", true);
    if (noPriceCircleDirect) priceGroup.setAttr("noPriceCircleDirect", true);
    if (isRoundedRectPriceDirect) priceGroup.setAttr("priceShapeRoundedRect", true);
    if (hasImagePriceBadge) priceGroup.setAttr("isImagePriceBadge", true);
    priceGroup.setAttr("priceBadgeStyleId", priceBadgeStyleId);
    priceGroup.setAttr("priceTextAlign", priceTextAlign);
    priceGroup.setAttr("priceTextOffsetX", 0);
    priceGroup.setAttr("priceTextOffsetY", 0);
    priceGroup.setAttr("priceCircleSize", isRoundedRectPriceDirect ? priceArea.w : priceArea.s);
    priceGroup.setAttr("priceCircleLocalX", -priceTextOffsetX);
    if (isRoundedRectPriceDirect) priceGroup.setAttr("priceNoOpticalShift", true);
    if (isRoundedRectPriceDirect) {
      priceGroup.setAttr("priceBgOffsetX", -priceTextOffsetX);
      priceGroup.setAttr("priceBgOffsetY", -priceTextOffsetY);
      priceGroup.setAttr("priceBgWidth", priceArea.w);
      priceGroup.setAttr("priceBgHeight", priceArea.h);
    }

    if (isRoundedRectPriceDirect) {
      const rectBgColor = String(
        catalogEntry?.PRICE_BG_COLOR ||
        customPriceCircleColor ||
        singleSpec.text.priceBgColor ||
        "#2eaee8"
      );
      const priceRect = new window.Konva.Rect({
        x: priceArea.x,
        y: priceArea.y,
        width: priceArea.w,
        height: priceArea.h,
        fill: rectBgColor,
        cornerRadius: Math.max(2, priceArea.r || 8),
        draggable: true,
        listening: true
      });
      priceRect.setAttrs({
        slotIndex,
        directModuleId,
        isOverlayElement: true,
        isDirectPriceRectBg: true,
        selectable: true
      });
      priceRectBgNode = priceRect;
      addNode(priceRectBgNode);
      bindDirectPriceRectEditor(priceRectBgNode, page);
    }

    // Lekko powiększony obszar trafienia dla tekstu ceny (nie całego koła),
    // żeby transformer nie robił ogromnej ramki.
    const priceHitPadding = 6;
    const priceHitRect = new window.Konva.Rect({
      x: isRoundedRectPriceDirect ? -priceTextOffsetX : -priceHitPadding,
      y: isRoundedRectPriceDirect ? -priceTextOffsetY : -priceHitPadding,
      width: noPriceCircleDirect ? 170 : (isRoundedRectPriceDirect ? priceArea.w : 140),
      height: noPriceCircleDirect ? 58 : (isRoundedRectPriceDirect ? priceArea.h : 70),
      fill: "#000000",
      opacity: 0.001,
      listening: true,
      draggable: false
    });
    priceHitRect.setAttrs({ slotIndex, directModuleId, isPriceHitArea: true });
    priceGroup.add(priceHitRect);

    const priceBaseSize = isRoundedRectPriceDirect ? Math.max(24, priceArea.h) : priceArea.s;
    const isSingleCirclePriceDirect = useSingleLikeDirectLayout && !noPriceCircleDirect && !isRoundedRectPriceDirect;
    const unitFactor = noPriceCircleDirect
      ? 0.20
      : (isRoundedRectPriceDirect ? 0.26 : (isSingleCirclePriceDirect ? 0.095 : 0.10));
    const decFactor = noPriceCircleDirect
      ? 0
      : (isRoundedRectPriceDirect ? 0.26 : (isSingleCirclePriceDirect ? 0.14 : 0.12));
    const mainFactor = noPriceCircleDirect
      ? 0.52
      : (isRoundedRectPriceDirect ? 0.80 : (isSingleCirclePriceDirect ? 0.475 : 0.34));
    const unitSize = Math.max(7, Math.round(priceBaseSize * unitFactor * effectivePriceScaleDirect));
    const decSize = noPriceCircleDirect
      ? unitSize
      : Math.max(8, Math.round(priceBaseSize * decFactor * effectivePriceScaleDirect));
    const mainSize = Math.max(12, Math.round(priceBaseSize * mainFactor * effectivePriceScaleDirect));
    const mainNode = new window.Konva.Text({
      x: 0, y: 0, text: priceParts.main, fontSize: mainSize, fontStyle: "bold",
      fontFamily: priceFontFamily, fill: priceColor, lineHeight: 1,
      textDecoration: priceTextUnderline ? "underline" : ""
    });
    mainNode.setAttr("pricePart", "main");
    if (effectivePriceBoldDirect === false) mainNode.fontStyle("normal");
    if (effectivePriceExtraBoldDirect) {
      mainNode.stroke(priceColor);
      mainNode.strokeWidth(Math.max(0.9, Math.round(mainSize * 0.06)));
      mainNode.lineJoin("round");
    }
    const decNode = new window.Konva.Text({
      x: (mainNode.width?.() || 0) + (noPriceCircleDirect ? 6 : (isRoundedRectPriceDirect ? 6 : 4)), y: (mainNode.height?.() || 0) * (noPriceCircleDirect ? 0.00 : (isRoundedRectPriceDirect ? 0.04 : 0.10)),
      text: priceParts.dec, fontSize: decSize, fontStyle: "bold",
      fontFamily: priceFontFamily, fill: priceColor, lineHeight: 1,
      textDecoration: priceTextUnderline ? "underline" : ""
    });
    decNode.setAttr("pricePart", "dec");
    if (effectivePriceBoldDirect === false) decNode.fontStyle("normal");
    if (effectivePriceExtraBoldDirect) {
      decNode.stroke(priceColor);
      decNode.strokeWidth(Math.max(0.7, Math.round(decSize * 0.06)));
      decNode.lineJoin("round");
    }
    const unitNode = new window.Konva.Text({
      x: (mainNode.width?.() || 0) + (useSingleLikeDirectLayout ? (noPriceCircleDirect ? 6 : (isRoundedRectPriceDirect ? 6 : 2)) : 4), y: (decNode.height?.() || 0) * (useSingleLikeDirectLayout ? (noPriceCircleDirect ? 1.02 : (isRoundedRectPriceDirect ? 1.02 : 1.35)) : 1.5),
      text: `${priceCurrencySymbol} / ${priceUnitSuffix}`, fontSize: unitSize, fontStyle: "bold",
      fontFamily: priceFontFamily, fill: priceColor, lineHeight: 1,
      textDecoration: priceTextUnderline ? "underline" : "",
      width: Math.max(noPriceCircleDirect ? 68 : (isRoundedRectPriceDirect ? Math.round(priceArea.w * 0.42) : 52), Math.round((isRoundedRectPriceDirect ? priceBaseSize : priceArea.s) * (noPriceCircleDirect ? 0.78 : 0.62))),
      wrap: "none"
    });
    unitNode.setAttr("pricePart", "unit");
    if (effectivePriceBoldDirect === false) unitNode.fontStyle("normal");
    if (effectivePriceExtraBoldDirect) {
      unitNode.stroke(priceColor);
      unitNode.strokeWidth(Math.max(0.6, Math.round(unitSize * 0.055)));
      unitNode.lineJoin("round");
    }
    priceGroup.add(mainNode, decNode, unitNode);
    addNode(priceGroup);
    bindDirectPriceGroupEditor(priceGroup, page);

    const eanValue = String(catalogEntry?.["KOD EAN"] || "").trim();
    if (eanValue) {
      const barcodeUrl = await generateBarcodeDataUrl(eanValue);
      const barcodeNode = await createKonvaImageNodeFromUrl(barcodeUrl);
      if (barcodeNode) {
        barcodeNode.x(barcodeArea.x);
        barcodeNode.y(barcodeArea.y);
        barcodeNode.width(barcodeNode.width?.() || 240);
        barcodeNode.height(barcodeNode.height?.() || 90);
        layoutImageNodeContain(barcodeNode, barcodeArea.x, barcodeArea.y, barcodeArea.w, barcodeArea.h);
        barcodeNode.draggable(true);
        barcodeNode.setAttrs({
          slotIndex,
          directModuleId,
          isBarcode: true,
          barcodeOriginalSrc: barcodeUrl,
          barcodeColor: "#000"
        });
        addNode(barcodeNode);
      }
    }

    // Grupujemy cały moduł (bez widocznego boxa), aby można było przenosić całość jednym ruchem.
    const moduleGroup = new window.Konva.Group({
      x: 0,
      y: 0,
      draggable: true,
      listening: true
    });
    moduleGroup.setAttrs({
      isUserGroup: true,
      isAutoSlotGroup: true,
      preservedSlotIndex: slotIndex,
      slotIndex: null,
      isDirectCustomModuleGroup: true,
      directModuleId
    });
    layer.add(moduleGroup);

    createdNodes.forEach((node) => {
      if (!node) return;
      const abs = node.getAbsolutePosition ? node.getAbsolutePosition() : null;
      if (typeof node.draggable === "function") {
        node.setAttr?.("_wasDraggableBeforeUserGroup", !!node.draggable());
        // W zgrupowanym module przeciągamy wyłącznie całą grupę.
        node.draggable(false);
      }
      moveNodeToParentPreserveAbsolute(node, moduleGroup);
    });

    page.selectedNodes = [moduleGroup];
    page.transformer?.nodes?.([moduleGroup]);
    layer.batchDraw();
    page.transformerLayer?.batchDraw?.();
    return true;
  }

  async function loadProducts() {
    if (Array.isArray(cachedProducts)) return cachedProducts;
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch(DATA_URL, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const src = Array.isArray(json) ? json : [];
        const list = src
          .map((row, i) => normalizeProduct(row, i))
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name, "pl", { sensitivity: "base" }));
        cachedProducts = list;
        return list;
      })
      .finally(() => {
        loadingPromise = null;
      });

    return loadingPromise;
  }

  function ensureModal() {
    if (document.getElementById("customStyleModal")) return;
    syncCustomFontOptionsFromWindow();

    const overlay = document.createElement("div");
    overlay.id = "customStyleModal";
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "background:rgba(10,14,24,.50)",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "z-index:1000001"
    ].join(";");

    overlay.innerHTML = `
      <div style="width:min(1460px,98vw);height:min(94vh,1200px);overflow:auto;background:#fff;border-radius:16px;padding:24px 26px 24px 26px;box-shadow:0 24px 54px rgba(0,0,0,.24);font-family:Inter,Arial,sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
          <h3 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;">Kreator katalogu - styl własny</h3>
          <button id="customStyleClose" type="button" style="border:none;background:#eef2f7;color:#1f2937;font-size:24px;line-height:1;padding:8px 12px;border-radius:10px;cursor:pointer;">x</button>
        </div>

        <div style="display:grid;grid-template-columns:minmax(0,1fr) 520px;gap:16px;align-items:start;">
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:18px;background:#fbfdff;min-height:560px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid #d7dfec;border-radius:10px;background:#ffffff;margin-bottom:10px;">
              <div style="min-width:0;">
                <div style="font-size:11px;font-weight:700;color:#0f172a;">Import danych (Excel)</div>
                <div style="font-size:10px;color:#64748b;">Kolumny: Indeks, Marka, Cena, TNZ, Grupa produktów</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <input id="customExcelImportInput" type="file" accept=".xlsx,.xls,.csv" style="display:none;">
                <input id="customBulkImageImportInput" type="file" accept="image/*" multiple style="display:none;">
                <button id="customBulkImageImportBtn" type="button" style="border:1px solid #334155;background:#fff;color:#0f172a;border-radius:8px;padding:6px 10px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;">Import zdjęć</button>
                <button id="customExcelImportBtn" type="button" style="border:1px solid #0b8f84;background:#fff;color:#0b8f84;border-radius:8px;padding:6px 10px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;">Importuj Excel</button>
              </div>
            </div>
            <div id="customExcelImportStatus" style="display:none;margin:-2px 0 10px 0;padding:7px 9px;border:1px solid #d7dfec;border-radius:8px;background:#f8fafc;font-size:10px;color:#334155;"></div>

            <div style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:8px;">1. Dodawanie produktu</div>

            <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:end;">
              <div>
                <label for="customStyleSearch" style="display:block;font-size:10px;color:#64748b;margin-bottom:6px;font-weight:500;">Wyszukiwarka (nazwa lub indeks)</label>
                <input id="customStyleSearch" type="text" placeholder="np. 29552 albo GERULA" style="width:100%;padding:6px 7px;border:1px solid #d7dfec;border-radius:10px;font-size:10px;outline:none;">
              </div>
              <div>
                <label for="customStyleSelect" style="display:block;font-size:10px;color:#64748b;margin-bottom:6px;font-weight:500;">Produkt (dropdown)</label>
                <select id="customStyleSelect" size="1" style="width:100%;padding:5px 7px;border:1px solid #d7dfec;border-radius:10px;font-size:10px;background:#fff;color:#0f172a;"></select>
              </div>
            </div>

              <div id="customStyleInfo" style="margin-top:12px;padding:8px 10px;border:1px dashed #cbd5e1;border-radius:10px;background:#fff;font-size:10px;color:#334155;min-height:70px;">
              Ładowanie produktów...
            </div>
              <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <button id="customShowFlagToggle" type="button" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;cursor:pointer;">
                  <span id="customShowFlagToggleMark" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;font-size:12px;font-weight:700;line-height:1;color:#0f172a;">✓</span>
                  Flaga
                </button>
                <button id="customShowBarcodeToggle" type="button" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;cursor:pointer;">
                  <span id="customShowBarcodeToggleMark" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;font-size:12px;font-weight:700;line-height:1;color:#0f172a;">✓</span>
                  Kod kreskowy
                </button>
                <label for="customPriceColorInput" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Kolor ceny
                  <input id="customPriceColorInput" type="color" value="#d71920" style="width:24px;height:20px;padding:0;border:none;background:transparent;cursor:pointer;">
                </label>
                <label for="customPriceStyleSelect" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Wybierz styl
                  <select id="customPriceStyleSelect" style="max-width:180px;padding:2px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:10px;background:#fff;color:#0f172a;">
                    ${PRICE_BADGE_STYLE_OPTIONS.map((opt) => `<option value="${escapeHtml(opt.id)}">${escapeHtml(opt.label)}</option>`).join("")}
                  </select>
                </label>
                <label for="customPriceTextColorInput" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Kolor czcionki ceny
                  <input id="customPriceTextColorInput" type="color" value="#ffffff" style="width:24px;height:20px;padding:0;border:none;background:transparent;cursor:pointer;">
                </label>
                <label for="customCurrencySelect" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Waluta
                  <select id="customCurrencySelect" style="padding:2px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:10px;background:#fff;color:#0f172a;">
                    <option value="£">Funt (£)</option>
                    <option value="€">Euro (€)</option>
                  </select>
                </label>
                <div style="display:inline-flex;align-items:center;gap:6px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  <span>Wielkość ceny</span>
                  <button id="customPriceSizeMinusBtn" type="button" style="width:20px;height:20px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;font-size:12px;line-height:1;cursor:pointer;">-</button>
                  <span id="customPriceSizeValue" style="min-width:38px;text-align:center;font-weight:700;">100%</span>
                  <button id="customPriceSizePlusBtn" type="button" style="width:20px;height:20px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;font-size:12px;line-height:1;cursor:pointer;">+</button>
                </div>
              </div>
              <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <label for="customMetaFontSelect" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Czcionka nazwa/indeks/opak.
                  <select id="customMetaFontSelect" style="max-width:150px;padding:2px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:10px;background:#fff;color:#0f172a;">
                    ${CUSTOM_FONT_OPTIONS.map((font) => `<option value="${escapeHtml(font)}">${escapeHtml(font)}</option>`).join("")}
                  </select>
                </label>
                <label for="customMetaTextColorInput" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Kolor tekstów
                  <input id="customMetaTextColorInput" type="color" value="#1f3560" style="width:24px;height:20px;padding:0;border:none;background:transparent;cursor:pointer;">
                </label>
                <button id="customMetaBoldToggle" type="button" style="border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;font-weight:700;cursor:pointer;">B</button>
                <button id="customMetaUnderlineToggle" type="button" style="border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;text-decoration:underline;cursor:pointer;">U</button>
                <label for="customMetaAlignSelect" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Wyrównanie tekstów
                  <select id="customMetaAlignSelect" style="padding:2px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:10px;background:#fff;color:#0f172a;">
                    <option value="left">Lewo</option>
                    <option value="center">Środek</option>
                    <option value="right">Prawo</option>
                  </select>
                </label>
                <label for="customFamilySpacingSelect" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Odstęp produktów
                  <select id="customFamilySpacingSelect" style="padding:2px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:10px;background:#fff;color:#0f172a;">
                    <option value="0">Standard</option>
                    <option value="0.12" selected>Bliżej</option>
                    <option value="0.18">Bardzo blisko</option>
                    <option value="0.24">Ultra blisko</option>
                  </select>
                </label>
              </div>
              <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <label for="customPriceFontSelect" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Czcionka ceny
                  <select id="customPriceFontSelect" style="max-width:150px;padding:2px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:10px;background:#fff;color:#0f172a;">
                    ${CUSTOM_FONT_OPTIONS.map((font) => `<option value="${escapeHtml(font)}">${escapeHtml(font)}</option>`).join("")}
                  </select>
                </label>
                <button id="customPriceBoldToggle" type="button" style="border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;font-weight:700;cursor:pointer;">B cena</button>
                <button id="customPriceUnderlineToggle" type="button" style="border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;text-decoration:underline;cursor:pointer;">U cena</button>
                <label for="customPriceAlignSelect" style="display:inline-flex;align-items:center;gap:8px;border:1px solid #d7dfec;background:#fff;color:#0f172a;border-radius:8px;padding:6px 9px;font-size:10px;">
                  Wyrównanie ceny
                  <select id="customPriceAlignSelect" style="padding:2px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:10px;background:#fff;color:#0f172a;">
                    <option value="left">Lewo</option>
                    <option value="center">Środek</option>
                    <option value="right">Prawo</option>
                  </select>
                </label>
              </div>
              <input id="customImageUploadInput" type="file" accept="image/*" style="display:none;">
          </div>

          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#f8fafc;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
              <div style="font-size:11px;font-weight:700;color:#0f172a;">Podgląd modułu 1:1 (styl elegancki)</div>
              <label for="customModuleLayoutSelect" style="display:inline-flex;align-items:center;gap:6px;font-size:10px;color:#334155;">
                Styl modułu
                <select id="customModuleLayoutSelect" style="max-width:170px;padding:2px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:10px;background:#fff;color:#0f172a;">
                  ${MODULE_LAYOUT_STYLE_OPTIONS.map((opt) => `<option value="${escapeHtml(opt.id)}">${escapeHtml(opt.label)}</option>`).join("")}
                </select>
              </label>
              <button id="customApplyStyleToImportedBtn" type="button" style="border:1px solid #0b8f84;background:#fff;color:#0b8f84;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;">Zastosuj do zaimportowanych</button>
            </div>
            <div id="customPreviewCard" style="position:relative;width:100%;aspect-ratio:1.38/1;background:#ffffff;border:1px solid #dbe4ef;border-radius:12px;overflow:hidden;">
              <div id="customPreviewImagesTrack" style="position:absolute;left:0%;top:4%;width:48%;height:83%;overflow:hidden;">
                <img id="customPreviewImage" alt="Podgląd produktu" style="width:100%;height:100%;object-fit:contain;flex:1 1 auto;min-width:0;">
              </div>
              <div id="customPreviewDivider" style="display:none;position:absolute;left:63.6%;top:15.5%;width:0.55%;height:58.5%;background:#d9d9d9;border-radius:2px;"></div>
              <div id="customPreviewName" style="position:absolute;left:49%;top:50%;width:47%;font-size:12px;line-height:1.04;font-weight:600;color:#111827;text-align:left;"></div>
              <div id="customPreviewIndex" style="position:absolute;left:48.7%;top:62%;font-size:7px;font-weight:700;font-style:italic;color:#b9b9b9;"></div>
              <div id="customPreviewPackageInfo" style="position:absolute;left:48.7%;top:65.2%;font-size:7px;font-weight:600;color:#334155;"></div>
              <div id="customPreviewFlag" style="position:absolute;left:49%;top:72%;width:34%;height:3%;display:flex;border-radius:2px;overflow:hidden;border:1px solid rgba(0,0,0,.08);">
                <span style="flex:1;background:#22409a;"></span>
                <span style="flex:1;background:#f3d31f;"></span>
                <span style="flex:1;background:#c4003a;"></span>
              </div>
              <div id="customPreviewPriceCircle" style="position:absolute;left:22%;top:70%;width:84px;height:84px;border-radius:50%;background:#d71920;display:flex;align-items:center;justify-content:center;color:#fff;z-index:2;">
                <div id="customPreviewPriceRow" style="display:flex;align-items:center;gap:5px;width:100%;justify-content:flex-start;padding:0 8px;box-sizing:border-box;">
                  <div id="customPreviewPriceMain" style="font-size:32px;font-weight:800;line-height:1;">0</div>
                  <div style="display:flex;flex-direction:column;line-height:1;">
                    <span id="customPreviewPriceDec" style="font-size:12px;font-weight:700;">00</span>
                    <span id="customPreviewPriceUnit" style="font-size:9px;font-weight:700;">£ / SZT.</span>
                  </div>
                </div>
              </div>
              <div id="customPreviewBarcodeWrap" style="position:absolute;left:40%;top:76%;width:49%;height:22%;overflow:hidden;">
                <svg id="customPreviewBarcode" style="width:100%;height:100%;display:block;"></svg>
              </div>
            </div>
            <div style="margin-top:10px;display:flex;justify-content:flex-end;">
              <div style="display:flex;gap:8px;align-items:center;">
                <button
                  id="customSaveDraftBtn"
                  type="button"
                  style="border:1px solid #334155;background:#ffffff;color:#0f172a;border-radius:10px;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer;"
                >
                  Dodaj kolejny produkt (lista)
                </button>
                <button
                  id="customAddProductBtn"
                  type="button"
                  style="border:1px solid #0b8f84;background:#0fb5a8;color:#fff;border-radius:10px;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer;"
                >
                  Dodaj produkt do katalogu
                </button>
              </div>
            </div>
            <div style="margin-top:8px;display:flex;justify-content:flex-start;">
              <button id="customAddFamilyProductBtn" type="button" style="border:1px solid #334155;background:#ffffff;color:#0f172a;border-radius:8px;padding:6px 10px;font-size:10px;font-weight:700;cursor:pointer;">
                Dodaj kolejny produkt (rodzina)
              </button>
            </div>
            <div id="customFamilyStatusBox" style="margin-top:8px;padding:8px 10px;border:1px solid #d7dfec;border-radius:8px;background:#fff;color:#334155;font-size:10px;line-height:1.35;">
              <div id="customFamilyStatusLine" style="font-weight:600;">Rodzina: brak</div>
              <div id="customFamilyStatusDetails" style="margin-top:4px;color:#64748b;">Kliknij przycisk, aby ustawić produkt bazowy rodziny.</div>
            </div>
            <div style="margin-top:10px;padding:8px 10px;border:1px solid #d7dfec;border-radius:10px;background:#fff;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                <div style="font-size:10px;font-weight:700;color:#0f172a;">Lista modułów roboczych</div>
                <div style="display:flex;gap:6px;align-items:center;">
                  <button id="customClearEditorBtn" type="button" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;">Wyczyść</button>
                  <button id="customOpenDraftTrayBtn" type="button" style="border:1px solid #334155;background:#fff;color:#0f172a;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;">Dodaj te produkty do katalogu</button>
                </div>
              </div>
              <div id="customDraftModulesList" style="display:grid;gap:8px;max-height:220px;overflow:auto;">
                <div style="font-size:10px;color:#64748b;">Brak zapisanych modułów roboczych.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      storeCustomStyleEditorSnapshot();
      overlay.style.display = "none";
    };

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    const closeBtn = overlay.querySelector("#customStyleClose");
    if (closeBtn) closeBtn.addEventListener("click", close);
  }

  function renderSelect(select, list) {
    if (!select) return;
    const options = list.map((p) => {
      const label = `${p.index ? `[${p.index}] ` : ""}${p.name || "(bez nazwy)"}`;
      return `<option value="${p.id}">${label}</option>`;
    });
    select.innerHTML = options.join("");
  }

  function updateInfo(info, product, allCount, filteredCount, renderedCount) {
    if (!info) return;
    if (!product) {
      info.innerHTML = `Brak dopasowań. Łącznie produktów: <strong>${allCount}</strong>.`;
      return;
    }
    info.innerHTML = `
      <div style="display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:start;">
        <div style="border:1px solid #d7dfec;border-radius:8px;background:#fff;padding:6px;">
          <div style="font-size:10px;color:#64748b;margin-bottom:6px;">Zdjęcie</div>
          <div id="customStyleImageBox" style="width:100%;height:84px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px;">brak</div>
        </div>
        <div style="border:1px solid #d7dfec;border-radius:8px;background:#fff;padding:8px;">
          <div><strong>Indeks:</strong>
            <span
              id="customEditableIndex"
              contenteditable="true"
              spellcheck="false"
              title="Kliknij, aby edytować indeks"
              style="display:inline-block;min-width:120px;padding:1px 4px;border-radius:4px;border:1px dashed transparent;cursor:text;outline:none;"
            >${escapeHtml(getDisplayIndex(product) || "-")}</span>
          </div>
          <div><strong>Nazwa:</strong>
            <span
              id="customEditableName"
              contenteditable="true"
              spellcheck="false"
              title="Kliknij, aby edytować nazwę"
              style="display:inline-block;min-width:220px;padding:1px 4px;border-radius:4px;border:1px dashed transparent;cursor:text;outline:none;"
            >${escapeHtml(getDisplayName(product))}</span>
          </div>
          <div><strong>Cena:</strong>
            <span
              id="customEditablePrice"
              contenteditable="true"
              spellcheck="false"
              title="Kliknij, aby edytować cenę"
              style="display:inline-block;min-width:90px;padding:1px 4px;border-radius:4px;border:1px dashed transparent;cursor:text;outline:none;"
            >${escapeHtml(getDisplayPrice(product) || "0.00")}</span>
          </div>
          <div><strong>Opakowanie:</strong> ${product.packageValue || "-"} ${product.packageUnit || ""}</div>
          <div><strong>EAN:</strong> ${product.ean || "-"}</div>
        </div>
      </div>
      <div style="margin-top:6px;color:#64748b;">Dopasowań: ${filteredCount} / ${allCount}${Number.isFinite(renderedCount) ? ` (pokazano: ${renderedCount})` : ""}</div>
    `;
  }

  function bindEditableName(product) {
    const nameEl = document.getElementById("customEditableName");
    const indexEl = document.getElementById("customEditableIndex");
    const priceEl = document.getElementById("customEditablePrice");
    if (!product) return;

    const bindEditableField = (el, handlers = {}) => {
      if (!el) return;
      el.addEventListener("focus", () => {
        el.style.borderColor = "#93c5fd";
        el.style.background = "#eff6ff";
      });
      el.addEventListener("blur", () => {
        el.style.borderColor = "transparent";
        el.style.background = "transparent";
        if (typeof handlers.onBlur === "function") handlers.onBlur();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          el.blur();
        }
      });
      el.addEventListener("input", () => {
        if (typeof handlers.onInput === "function") handlers.onInput();
        if (currentPreviewProduct && currentPreviewProduct.id === product.id) {
          renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
        }
      });
    };

    bindEditableField(nameEl, {
      onInput: () => {
        const next = String(nameEl.textContent || "").replace(/\s+/g, " ").trim();
        if (next) customNameOverrides.set(product.id, next);
        else customNameOverrides.delete(product.id);
      },
      onBlur: () => {
        if (!nameEl) return;
        nameEl.textContent = getDisplayName(product) || "-";
      }
    });

    bindEditableField(indexEl, {
      onInput: () => {
        const next = String(indexEl.textContent || "").replace(/\s+/g, " ").trim();
        if (next) customIndexOverrides.set(product.id, next);
        else customIndexOverrides.delete(product.id);
      },
      onBlur: () => {
        if (!indexEl) return;
        indexEl.textContent = getDisplayIndex(product) || "-";
      }
    });

    bindEditableField(priceEl, {
      onInput: () => {
        const next = normalizeEditablePriceValue(priceEl.textContent || "");
        if (next) customPriceOverrides.set(product.id, next);
        else customPriceOverrides.delete(product.id);
      },
      onBlur: () => {
        if (!priceEl) return;
        const next = normalizeEditablePriceValue(priceEl.textContent || "");
        if (next) customPriceOverrides.set(product.id, next);
        else customPriceOverrides.delete(product.id);
        priceEl.textContent = getDisplayPrice(product) || "0.00";
      }
    });
  }

  function buildImageUrl(index, ext) {
    const objectPath = `${IMAGE_FOLDER}/${String(index || "").trim()}.${ext}`;
    return `${IMAGE_BUCKET_BASE}${encodeURIComponent(objectPath)}?alt=media`;
  }

  function loadImageWithFallback(index, onReady) {
    const safeIndex = String(index || "").trim();
    if (!safeIndex) {
      onReady(null);
      return;
    }
    let i = 0;
    const tryNext = () => {
      if (i >= IMAGE_EXTENSIONS.length) {
        onReady(null);
        return;
      }
      const url = buildImageUrl(safeIndex, IMAGE_EXTENSIONS[i++]);
      const img = new Image();
      img.onload = () => {
        cacheImageMeta(url, img.naturalWidth || img.width, img.naturalHeight || img.height);
        onReady(url);
      };
      img.onerror = tryNext;
      img.src = url;
    };
    tryNext();
  }

  function getEffectivePreviewProduct() {
    return familyBaseProduct || currentPreviewProduct || null;
  }

  function getEffectivePreviewImageUrl() {
    return familyBaseProduct ? familyBaseImageUrl : currentPreviewImageUrl;
  }

  function resolveProductImageUrl(product, onReady) {
    if (!product) {
      onReady(null);
      return;
    }
    if (customImageOverrides.has(product.id)) {
      onReady(customImageOverrides.get(product.id) || null);
      return;
    }
    if (customResolvedImageUrls.has(product.id)) {
      onReady(customResolvedImageUrls.get(product.id) || null);
      return;
    }
    const indexKey = normalizeImportIndex(product.index);
    if (indexKey && customResolvedImageUrlsByIndex.has(indexKey)) {
      const resolved = customResolvedImageUrlsByIndex.get(indexKey) || null;
      customResolvedImageUrls.set(product.id, resolved);
      onReady(resolved);
      return;
    }
    if (indexKey && customImageResolvePromisesByIndex.has(indexKey)) {
      customImageResolvePromisesByIndex.get(indexKey)
        .then((url) => {
          customResolvedImageUrls.set(product.id, url || null);
          onReady(url || null);
        })
        .catch(() => onReady(null));
      return;
    }

    const resolvePromise = new Promise((resolve) => {
      loadImageWithFallback(product.index, (url) => {
        resolve(url || null);
      });
    });

    if (indexKey) customImageResolvePromisesByIndex.set(indexKey, resolvePromise);

    resolvePromise
      .then((url) => {
        if (indexKey) {
          customResolvedImageUrlsByIndex.set(indexKey, url || null);
          customImageResolvePromisesByIndex.delete(indexKey);
        }
        customResolvedImageUrls.set(product.id, url || null);
        onReady(url || null);
      })
      .catch(() => {
        if (indexKey) customImageResolvePromisesByIndex.delete(indexKey);
        onReady(null);
      });
  }

  function renderProductImagePreview(product) {
    const box = document.getElementById("customStyleImageBox");
    if (!box) return;
    if (!product) {
      box.textContent = "brak";
      box.style.color = "#94a3b8";
      currentPreviewImageUrl = null;
      renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      storeCustomStyleEditorSnapshot();
      return;
    }
    const overrideUrl = product?.id ? customImageOverrides.get(product.id) : null;
    if (overrideUrl) {
      box.innerHTML = `<img src="${overrideUrl}" alt="Zdjęcie produktu (własne)" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:7px;transition:transform .16s ease;transform-origin:center center;cursor:zoom-in;position:relative;z-index:1;">`;
      const imgEl = box.querySelector("img");
      if (imgEl) {
        imgEl.onmouseenter = () => {
          imgEl.style.transform = "scale(1.9)";
          imgEl.style.zIndex = "3";
        };
        imgEl.onmouseleave = () => {
          imgEl.style.transform = "scale(1)";
          imgEl.style.zIndex = "1";
        };
      }
      box.style.color = "#0f172a";
      currentPreviewImageUrl = overrideUrl;
      renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      storeCustomStyleEditorSnapshot();
      return;
    }

    box.textContent = "szukam...";
    box.style.color = "#94a3b8";
    const stamp = `${product?.id || ""}-${Date.now()}`;
    box.setAttribute("data-stamp", stamp);

    resolveProductImageUrl(product, (url) => {
      const current = document.getElementById("customStyleImageBox");
      if (!current || current.getAttribute("data-stamp") !== stamp) return;
      if (product?.id && customImageOverrides.has(product.id)) return;
      if (!url) {
        current.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;height:100%;">
            <div style="font-size:10px;color:#94a3b8;">brak</div>
            <button id="customImportImageBtn" type="button" style="border:1px solid #0b8f84;background:#fff;color:#0b8f84;border-radius:7px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;">Importuj zdjęcie</button>
          </div>
        `;
        current.style.color = "#94a3b8";
        currentPreviewImageUrl = null;
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
        storeCustomStyleEditorSnapshot();
        return;
      }
      current.innerHTML = `<img src="${url}" alt="Zdjęcie produktu" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:7px;transition:transform .16s ease;transform-origin:center center;cursor:zoom-in;position:relative;z-index:1;">`;
      const imgEl = current.querySelector("img");
      if (imgEl) {
        imgEl.onmouseenter = () => {
          imgEl.style.transform = "scale(1.9)";
          imgEl.style.zIndex = "3";
        };
        imgEl.onmouseleave = () => {
          imgEl.style.transform = "scale(1)";
          imgEl.style.zIndex = "1";
        };
      }
      current.style.color = "#0f172a";
      currentPreviewImageUrl = url;
      renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      storeCustomStyleEditorSnapshot();
    });
  }

  function renderFamilyImagesTrack() {
    const track = document.getElementById("customPreviewImagesTrack");
    if (!track) return;
    const entries = Array.isArray(currentFamilyProducts) ? currentFamilyProducts : [];
    const base = getEffectivePreviewProduct();
    const selectedLayoutStyleId = String(base?.MODULE_LAYOUT_STYLE_ID || customModuleLayoutStyleId || "default");
    const familyIndexes = entries
      .map((item) => String(item && item.product && item.product.index ? item.product.index : "").trim())
      .filter(Boolean);
    if (!familyIndexes.length && base && base.index) familyIndexes.push(String(base.index).trim());
    const mergedIndex = normalizeIndexKey(Array.from(new Set(familyIndexes)).join(","));
    if (!entries.length) {
      track.innerHTML = `<img id="customPreviewImage" alt="Podgląd produktu" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;transform:scale(1.08);transform-origin:left top;">`;
      const imgEl = document.getElementById("customPreviewImage");
      const effectiveUrl = getEffectivePreviewImageUrl();
      if (imgEl) {
        if (effectiveUrl) imgEl.src = effectiveUrl;
        else imgEl.removeAttribute("src");
      }
      return;
    }

    if (entries.length === 1) {
      const escaped = escapeHtml(entries[0].url || "");
      track.innerHTML = `<img src="${escaped}" alt="Zdjęcie produktu 1" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;transform:scale(1.08);transform-origin:left top;">`;
      return;
    }

    const maxThumbs = 4;
    const visible = entries.slice(0, maxThumbs);
    const count = Math.max(1, visible.length);
    const hasStyleLayout = !!(getModuleStyleFamilyLayouts(selectedLayoutStyleId, count) || null);
    const baseLayout = resolveCustomImageLayouts(base?.index, mergedIndex, count, selectedLayoutStyleId);
    const layout = hasStyleLayout
      ? baseLayout
      : applyFamilySpacingTightness(baseLayout, count, customFamilySpacingTightness);

    const isFamily2 = count === 2 && !hasStyleLayout;
    const tightness = normalizeFamilySpacingTightness(customFamilySpacingTightness, 0.12);
    const family2Scale = isFamily2 ? (1 + tightness * 0.55) : 1;

    track.innerHTML = visible
      .map((entry, idx) => {
        const escaped = escapeHtml(entry.url || "");
        const alt = `Zdjęcie produktu ${idx + 1}`;
        const pos = layout[idx] || layout[layout.length - 1] || { x: 0, y: 0, w: 0.76, h: 1 };
        // Tylko preview: cofamy minimalnie rodzinę w Styl numer 2,
        // żeby nie nachodziła na blok tekstu, bez wpływu na finalny moduł.
        const previewX = (hasStyleLayout && selectedLayoutStyleId === "styl-numer-2")
          ? Math.max(0, pos.x - 0.18)
          : pos.x;
        const transform = isFamily2
          ? `transform:scale(${family2Scale.toFixed(3)});transform-origin:center ${idx === 0 ? "bottom" : "top"};`
          : "transform:none;transform-origin:left top;";
        const objPos = isFamily2 ? `object-position:center ${idx === 0 ? "bottom" : "top"};` : "object-position:left top;";
        return `<img src="${escaped}" alt="${alt}" style="position:absolute;left:${(previewX * 100).toFixed(3)}%;top:${(pos.y * 100).toFixed(3)}%;width:${(pos.w * 100).toFixed(3)}%;height:${(pos.h * 100).toFixed(3)}%;object-fit:contain;${objPos}${transform}border-radius:4px;">`;
      })
      .join("");
  }

  function updateFamilyIndexPreviewText() {
    const indexEl = document.getElementById("customPreviewIndex");
    const base = getEffectivePreviewProduct();
    if (!indexEl) return;
    const family = Array.isArray(currentFamilyProducts) ? currentFamilyProducts : [];
    const allIndexes = family
      .map((item) => getDisplayIndex(item && item.product ? item.product : null))
      .filter(Boolean);
    if (!allIndexes.length && base) allIndexes.push(getDisplayIndex(base));
    const uniqueIndexes = Array.from(new Set(allIndexes));
    indexEl.textContent = uniqueIndexes.length ? uniqueIndexes.join(", ") : "-";
  }

  function ensureBaseFamilyState() {
    const base = currentPreviewProduct;
    if (!base) return;
    familyBaseProduct = base;
    familyBaseImageUrl = currentPreviewImageUrl;
    currentFamilyProducts = [{
      product: base,
      url: familyBaseImageUrl || null
    }];
  }

  function updateFamilyUiStatus(message, tone = "info") {
    const btn = document.getElementById("customAddFamilyProductBtn");
    const lineEl = document.getElementById("customFamilyStatusLine");
    const detailsEl = document.getElementById("customFamilyStatusDetails");
    const boxEl = document.getElementById("customFamilyStatusBox");
    const entries = Array.isArray(currentFamilyProducts) ? currentFamilyProducts : [];
    const indexes = entries
      .map((item) => String(item && item.product && item.product.index ? item.product.index : "").trim())
      .filter(Boolean);
    const uniqueIndexes = Array.from(new Set(indexes));
    const baseIndex = String(familyBaseProduct && familyBaseProduct.index ? familyBaseProduct.index : "").trim();

    if (btn) {
      const count = uniqueIndexes.length;
      btn.textContent = !familyBaseProduct
        ? "Ustaw produkt bazowy (rodzina)"
        : `Dodaj do rodziny (${count}/4)`;
      btn.style.borderColor = familyBaseProduct ? "#0b8f84" : "#334155";
      btn.style.color = familyBaseProduct ? "#0b8f84" : "#0f172a";
      btn.style.background = familyBaseProduct ? "#f0fdfa" : "#ffffff";
    }

    if (lineEl) {
      if (!familyBaseProduct) {
        lineEl.textContent = "Rodzina: brak";
      } else {
        lineEl.textContent = `Rodzina: ${uniqueIndexes.length} produkt(y) • baza ${baseIndex || "-"}`;
      }
    }

    if (detailsEl) {
      if (message) {
        detailsEl.textContent = String(message);
      } else if (!familyBaseProduct) {
        detailsEl.textContent = "Kliknij przycisk, aby ustawić produkt bazowy rodziny.";
      } else if (uniqueIndexes.length) {
        detailsEl.textContent = `Dodane indeksy: ${uniqueIndexes.join(", ")}. Wybierz kolejny produkt z listy i kliknij przycisk.`;
      } else {
        detailsEl.textContent = "Rodzina aktywna. Wybierz kolejny produkt i kliknij przycisk.";
      }
    }

    if (boxEl) {
      let border = "#d7dfec";
      let bg = "#fff";
      if (tone === "success") {
        border = "#86efac";
        bg = "#f0fdf4";
      } else if (tone === "error") {
        border = "#fca5a5";
        bg = "#fef2f2";
      } else if (familyBaseProduct) {
        border = "#99f6e4";
        bg = "#f0fdfa";
      }
      boxEl.style.borderColor = border;
      boxEl.style.background = bg;
    }
  }

  function applyPreviewLayoutMode(isSingleDirectMode, styleIdOverride) {
    const track = document.getElementById("customPreviewImagesTrack");
    const nameEl = document.getElementById("customPreviewName");
    const indexEl = document.getElementById("customPreviewIndex");
    const packageInfoEl = document.getElementById("customPreviewPackageInfo");
    const flagEl = document.getElementById("customPreviewFlag");
    const priceCircle = document.getElementById("customPreviewPriceCircle");
    const barcodeWrap = document.getElementById("customPreviewBarcodeWrap");
    const dividerEl = document.getElementById("customPreviewDivider");
    const hasImageBadgePreview = String(customPriceBadgeStyleId || "solid") !== "solid";
    const singleSpec = getSingleDirectLayoutSpec(styleIdOverride, hasImageBadgePreview);
    const previewFamilyCount = Array.isArray(currentFamilyProducts) ? currentFamilyProducts.length : 0;
    const previewStyleLayouts = getModuleStyleFamilyLayouts(styleIdOverride, previewFamilyCount);
    const previewLayoutOverflowsTrack = Array.isArray(previewStyleLayouts) && previewStyleLayouts.some((item) => {
      const x = Number(item?.x);
      const y = Number(item?.y);
      const w = Number(item?.w);
      const h = Number(item?.h);
      if (![x, y, w, h].every(Number.isFinite)) return false;
      return x < 0 || y < 0 || (x + w) > 1 || (y + h) > 1;
    });

    if (track) {
      if (isSingleDirectMode) {
        track.style.left = `${singleSpec.imgArea.x}%`;
        track.style.top = `${singleSpec.imgArea.y}%`;
        track.style.width = `${singleSpec.imgArea.w}%`;
        track.style.height = `${singleSpec.imgArea.h}%`;
      } else {
        track.style.left = "0%";
        track.style.top = "4%";
        track.style.width = "48%";
        track.style.height = "83%";
      }
      // W niektórych stylach (np. styl-numer-2 family) ramka obrazu celowo
      // wychodzi poza bazowy obszar tracka, więc nie możemy jej ucinać w preview.
      track.style.overflow = (isSingleDirectMode && previewLayoutOverflowsTrack) ? "visible" : "hidden";
      track.querySelectorAll("img").forEach((img) => {
        if (!(img instanceof HTMLImageElement)) return;
        if (isSingleDirectMode) {
          img.style.transform = "none";
          img.style.transformOrigin = "center center";
          img.style.objectFit = "contain";
          img.style.objectPosition = "center center";
        } else if (!img.style.transform) {
          img.style.transform = "scale(1.08)";
          img.style.transformOrigin = "left top";
        }
      });
    }

    if (nameEl) {
      if (isSingleDirectMode) {
        nameEl.style.left = `${singleSpec.nameArea.x}%`;
        nameEl.style.top = `${singleSpec.nameArea.y}%`;
        nameEl.style.width = `${singleSpec.nameArea.w}%`;
        nameEl.style.fontSize = "10px";
        nameEl.style.fontWeight = "700";
        nameEl.style.color = "#1f3560";
      } else {
        nameEl.style.left = "49%";
        nameEl.style.top = "50%";
        nameEl.style.width = "47%";
        nameEl.style.fontSize = "12px";
        nameEl.style.fontWeight = "600";
        nameEl.style.color = "#111827";
      }
    }

    if (indexEl) {
      if (isSingleDirectMode) {
        indexEl.style.left = `${singleSpec.indexPos.x}%`;
        indexEl.style.top = `${singleSpec.indexPos.y}%`;
        indexEl.style.fontSize = "12px";
        indexEl.style.color = DEFAULT_INDEX_TEXT_COLOR;
      } else {
        indexEl.style.left = "48.7%";
        indexEl.style.top = "62%";
        indexEl.style.fontSize = "7px";
        indexEl.style.color = DEFAULT_INDEX_TEXT_COLOR;
      }
      indexEl.style.fontStyle = "italic";
    }

    if (packageInfoEl) {
      if (isSingleDirectMode) {
        packageInfoEl.style.left = `${singleSpec.packagePos.x}%`;
        packageInfoEl.style.top = `${singleSpec.packagePos.y}%`;
        packageInfoEl.style.fontSize = "12px";
        packageInfoEl.style.color = "#1f3560";
      } else {
        packageInfoEl.style.left = "48.7%";
        packageInfoEl.style.top = "65.2%";
        packageInfoEl.style.fontSize = "7px";
        packageInfoEl.style.color = "#334155";
      }
    }

    if (flagEl) {
      if (isSingleDirectMode) {
        flagEl.style.left = `${singleSpec.flagArea.x}%`;
        flagEl.style.top = `${singleSpec.flagArea.y}%`;
        flagEl.style.width = `${singleSpec.flagArea.w}%`;
        flagEl.style.height = `${singleSpec.flagArea.h}%`;
      } else {
        flagEl.style.left = "49%";
        flagEl.style.top = "72%";
        flagEl.style.width = "34%";
        flagEl.style.height = "3%";
      }
    }

    if (priceCircle) {
      if (isSingleDirectMode) {
        priceCircle.style.left = `${singleSpec.priceArea.x}%`;
        priceCircle.style.top = `${singleSpec.priceArea.y}%`;
      } else {
        priceCircle.style.left = "22%";
        priceCircle.style.top = "70%";
      }
    }

    if (barcodeWrap) {
      if (isSingleDirectMode) {
        barcodeWrap.style.left = `${singleSpec.barcodeArea.x}%`;
        barcodeWrap.style.top = `${singleSpec.barcodeArea.y}%`;
        barcodeWrap.style.width = `${singleSpec.barcodeArea.w}%`;
        barcodeWrap.style.height = `${singleSpec.barcodeArea.h}%`;
      } else {
        barcodeWrap.style.left = "40%";
        barcodeWrap.style.top = "76%";
        barcodeWrap.style.width = "49%";
        barcodeWrap.style.height = "22%";
      }
    }

    if (dividerEl) {
      if (isSingleDirectMode && singleSpec.divider.x >= 0 && singleSpec.divider.h > 0) {
        dividerEl.style.display = "block";
        dividerEl.style.left = `${singleSpec.divider.x}%`;
        dividerEl.style.top = `${singleSpec.divider.y}%`;
        dividerEl.style.width = `${singleSpec.divider.w}%`;
        dividerEl.style.height = `${singleSpec.divider.h}%`;
      } else {
        dividerEl.style.display = "none";
      }
    }
  }

  function renderModulePreview(product, imageUrl) {
    const nameEl = document.getElementById("customPreviewName");
    const indexEl = document.getElementById("customPreviewIndex");
    const packageInfoEl = document.getElementById("customPreviewPackageInfo");
    const imageEl = document.getElementById("customPreviewImage");
    const mainEl = document.getElementById("customPreviewPriceMain");
    const decEl = document.getElementById("customPreviewPriceDec");
    const unitEl = document.getElementById("customPreviewPriceUnit");
    const priceRowEl = document.getElementById("customPreviewPriceRow");
    const barcodeEl = document.getElementById("customPreviewBarcode");
    const barcodeWrap = document.getElementById("customPreviewBarcodeWrap");
    const priceCircle = document.getElementById("customPreviewPriceCircle");
    const flagEl = document.getElementById("customPreviewFlag");

    if (!nameEl || !indexEl || !mainEl || !decEl || !unitEl || !barcodeEl) return;
    if (!product) {
      nameEl.textContent = "";
      indexEl.textContent = "";
      if (packageInfoEl) packageInfoEl.textContent = "";
      mainEl.textContent = "0";
      decEl.textContent = "00";
      unitEl.textContent = `${getEffectiveCurrencySymbol(null, "£")} / SZT.`;
      mainEl.style.color = customPriceTextColor || "#ffffff";
      decEl.style.color = customPriceTextColor || "#ffffff";
      unitEl.style.color = customPriceTextColor || "#ffffff";
      if (priceRowEl) {
        priceRowEl.style.justifyContent = customPriceTextAlign === "right" ? "flex-end" : (customPriceTextAlign === "center" ? "center" : "flex-start");
      }
      barcodeEl.innerHTML = "";
      renderFamilyImagesTrack();
      return;
    }

    renderFamilyImagesTrack();
    const familyCountPreview = Array.isArray(currentFamilyProducts) ? currentFamilyProducts.length : 0;
    const hasFamilyPreview = familyCountPreview > 1;
    const hasImageBadgePreview = String(customPriceBadgeStyleId || "solid") !== "solid";
    const selectedLayoutStyleId = String(product?.MODULE_LAYOUT_STYLE_ID || customModuleLayoutStyleId || "default");
    const singleSpec = getSingleDirectLayoutSpec(selectedLayoutStyleId, hasImageBadgePreview);
    const isSingleDirectPreview = !!DIRECT_CUSTOM_MODULE_MODE && (!hasFamilyPreview || !!singleSpec.familyDirect?.useSingleLayout);
    applyPreviewLayoutMode(isSingleDirectPreview, selectedLayoutStyleId);
    nameEl.textContent = getDisplayName(product);
    indexEl.textContent = getDisplayIndex(product) || "-";
    if (packageInfoEl) packageInfoEl.textContent = buildPackageInfoText(product);
    if (Array.isArray(currentFamilyProducts) && currentFamilyProducts.length > 1) {
      updateFamilyIndexPreviewText();
    }

    const price = formatPrice(getDisplayPrice(product));
    const currencySymbol = getEffectiveCurrencySymbol(product, price.currency);
    const metaAlign = normalizeAlignOption(product?.TEXT_ALIGN || customMetaTextAlign, "left");
    const metaFont = normalizeFontOption(product?.TEXT_FONT_FAMILY || customMetaFontFamily, "Arial");
    const metaColor = String(product?.TEXT_COLOR || customMetaTextColor || "#1f3560");
    const metaBold = boolAttrToFlag(product?.TEXT_BOLD ?? customMetaTextBold);
    const metaUnderline = boolAttrToFlag(product?.TEXT_UNDERLINE ?? customMetaTextUnderline);
    const priceFont = normalizeFontOption(product?.PRICE_FONT_FAMILY || customPriceFontFamily, "Arial");
    const priceBold = boolAttrToFlag(product?.PRICE_TEXT_BOLD ?? customPriceTextBold);
    const useCustomSingleTextPalette = isSingleDirectPreview && isCustomSingleStyle(selectedLayoutStyleId);
    const noPriceCirclePreview = useCustomSingleTextPalette && !!singleSpec.text.noPriceCircle;
    const isRoundedRectPricePreview = useCustomSingleTextPalette && !noPriceCirclePreview && singleSpec.text.priceShape === "roundedRect";
    const effectivePriceBoldPreview = useCustomSingleTextPalette && singleSpec.text.forcePriceBold ? true : priceBold;
    const priceScaleBoostPreview = useCustomSingleTextPalette
      ? Math.max(1, Number(singleSpec.text.priceScaleMultiplier || 1))
      : 1;
    const priceUnderline = boolAttrToFlag(product?.PRICE_TEXT_UNDERLINE ?? customPriceTextUnderline);
    const priceAlign = normalizeAlignOption(product?.PRICE_TEXT_ALIGN || customPriceTextAlign, "left");

    const nameColor = useCustomSingleTextPalette ? (singleSpec.text.nameColor || "#111111") : metaColor;
    const indexColor = useCustomSingleTextPalette
      ? (singleSpec.text.indexColor || DEFAULT_INDEX_TEXT_COLOR)
      : String(product?.TEXT_INDEX_COLOR || DEFAULT_INDEX_TEXT_COLOR);
    const packageColor = useCustomSingleTextPalette ? (singleSpec.text.packageColor || "#111111") : metaColor;
    nameEl.style.fontFamily = metaFont;
    indexEl.style.fontFamily = metaFont;
    if (packageInfoEl) packageInfoEl.style.fontFamily = metaFont;
    nameEl.style.color = nameColor;
    indexEl.style.color = indexColor;
    if (packageInfoEl) packageInfoEl.style.color = packageColor;
    nameEl.style.fontWeight = metaBold ? "700" : "500";
    indexEl.style.fontWeight = metaBold ? "700" : "700";
    if (packageInfoEl) packageInfoEl.style.fontWeight = metaBold ? "700" : "600";
    nameEl.style.textDecoration = metaUnderline ? "underline" : "none";
    indexEl.style.textDecoration = metaUnderline ? "underline" : "none";
    if (packageInfoEl) packageInfoEl.style.textDecoration = metaUnderline ? "underline" : "none";
    nameEl.style.textAlign = metaAlign;
    indexEl.style.textAlign = metaAlign;
    if (packageInfoEl) packageInfoEl.style.textAlign = metaAlign;
    indexEl.style.fontStyle = (isSingleDirectPreview && useCustomSingleTextPalette)
      ? (singleSpec.text.indexItalic ? "italic" : "normal")
      : ((product?.TEXT_INDEX_ITALIC === false) ? "normal" : "italic");

    mainEl.textContent = price.main;
    decEl.textContent = price.dec;
    const priceUnitSuffix = isWeightProduct(product) ? "KG" : "SZT.";
    unitEl.textContent = `${currencySymbol} / ${priceUnitSuffix}`;
    const effectivePriceTextColor = resolveDirectPriceTextColor(product?.PRICE_TEXT_COLOR, singleSpec, {
      noPriceCircle: !!noPriceCirclePreview
    });
    mainEl.style.color = effectivePriceTextColor;
    decEl.style.color = effectivePriceTextColor;
    unitEl.style.color = effectivePriceTextColor;
    mainEl.style.fontFamily = priceFont;
    decEl.style.fontFamily = priceFont;
    unitEl.style.fontFamily = priceFont;
    const strongNoCircleBoldPreview = noPriceCirclePreview && effectivePriceBoldPreview;
    mainEl.style.fontWeight = strongNoCircleBoldPreview ? "900" : (effectivePriceBoldPreview ? "800" : "600");
    decEl.style.fontWeight = strongNoCircleBoldPreview ? "800" : (effectivePriceBoldPreview ? "700" : "500");
    unitEl.style.fontWeight = strongNoCircleBoldPreview ? "800" : (effectivePriceBoldPreview ? "700" : "500");
    mainEl.style.textDecoration = priceUnderline ? "underline" : "none";
    decEl.style.textDecoration = priceUnderline ? "underline" : "none";
    unitEl.style.textDecoration = priceUnderline ? "underline" : "none";
    if (priceRowEl) {
      priceRowEl.style.justifyContent = priceAlign === "right" ? "flex-end" : (priceAlign === "center" ? "center" : "flex-start");
      if (noPriceCirclePreview) {
        priceRowEl.style.padding = "0 0 0 0";
        priceRowEl.style.transform = "none";
      } else if (isRoundedRectPricePreview) {
        priceRowEl.style.padding = "0 6px";
        priceRowEl.style.transform = "none";
      } else if (isSingleDirectPreview) {
        const isTnzBadgePreview = String(customPriceBadgeStyleId || "").includes("tnz");
        const isGranatBadgePreview = String(customPriceBadgeStyleId || "").includes("granatowe");
        priceRowEl.style.padding = "0 10px 0 10px";
        if (priceAlign === "right") {
          priceRowEl.style.transform = isTnzBadgePreview
            ? "translate(8px, 7px)"
            : (isGranatBadgePreview ? "translate(4px, 5px)" : (hasImageBadgePreview ? "translate(2px, 5px)" : "translate(0px, 3px)"));
        } else if (priceAlign === "center") {
          priceRowEl.style.transform = isTnzBadgePreview
            ? "translate(19px, 7px)"
            : (isGranatBadgePreview ? "translate(11px, 5px)" : (hasImageBadgePreview ? "translate(8px, 5px)" : "translate(4px, 3px)"));
        } else {
          priceRowEl.style.transform = isTnzBadgePreview
            ? "translate(28px, 7px)"
            : (isGranatBadgePreview ? "translate(18px, 5px)" : (hasImageBadgePreview ? "translate(14px, 5px)" : "translate(8px, 3px)"));
        }
      } else {
        priceRowEl.style.padding = "0 8px";
        if (hasImageBadgePreview) {
          const isTnzBadgePreview = String(customPriceBadgeStyleId || "").includes("tnz");
          const isGranatBadgePreview = String(customPriceBadgeStyleId || "").includes("granatowe");
          if (priceAlign === "right") {
            priceRowEl.style.transform = isGranatBadgePreview ? "translate(10px, 3px)" : (isTnzBadgePreview ? "translate(4px, 3px)" : "translate(2px, 2px)");
          } else if (priceAlign === "center") {
            priceRowEl.style.transform = isGranatBadgePreview ? "translate(16px, 3px)" : (isTnzBadgePreview ? "translate(8px, 3px)" : "translate(5px, 2px)");
          } else {
            priceRowEl.style.transform = isGranatBadgePreview ? "translate(22px, 3px)" : (isTnzBadgePreview ? "translate(12px, 3px)" : "translate(7px, 2px)");
          }
        } else {
          priceRowEl.style.transform = "none";
        }
      }
    }

    // Skalowanie ceny proporcjonalnie do podglądu (bliżej stylu eleganckiego 1:1).
    if (priceCircle) {
      const card = document.getElementById("customPreviewCard");
      const singlePriceRatio = Math.max(0.12, (Number(singleSpec.priceArea.s) || 24) / 100);
      const base = card
        ? Math.max(isSingleDirectPreview ? 78 : 68, Math.round(card.clientWidth * (isSingleDirectPreview ? singlePriceRatio : 0.18)))
        : 84;
      const scale = (Number.isFinite(customPriceTextScale) ? customPriceTextScale : 1) * priceScaleBoostPreview;
      if (noPriceCirclePreview) {
        priceCircle.style.width = `${Math.max(140, Math.round(base * 3.2))}px`;
        priceCircle.style.height = `${Math.max(34, Math.round(base * 0.75))}px`;
        priceCircle.style.background = "transparent";
        priceCircle.style.backgroundImage = "none";
        priceCircle.style.borderRadius = "0";
      } else if (isRoundedRectPricePreview) {
        const cardW = card ? card.clientWidth : 520;
        const cardH = card ? card.clientHeight : Math.round(cardW / 1.38);
        const rectW = Math.max(86, Math.round((Number(singleSpec.priceArea.w) > 0 ? singleSpec.priceArea.w : 24) * cardW / 100));
        const rectH = Math.max(34, Math.round((Number(singleSpec.priceArea.h) > 0 ? singleSpec.priceArea.h : 11.5) * cardH / 100));
        const rectR = Math.max(6, Math.round((Number(singleSpec.text.priceBgRadius || singleSpec.priceArea.r || 2.2)) * cardW / 100));
        priceCircle.style.width = `${rectW}px`;
        priceCircle.style.height = `${rectH}px`;
        priceCircle.style.borderRadius = `${rectR}px`;
        priceCircle.style.backgroundImage = "none";
        const roundedPreviewBg = String(product?.PRICE_BG_COLOR || customPriceCircleColor || singleSpec.text.priceBgColor || "#2eaee8");
        priceCircle.style.background = roundedPreviewBg;
      } else {
        priceCircle.style.width = `${base}px`;
        priceCircle.style.height = `${base}px`;
        priceCircle.style.borderRadius = "50%";
        const badgeBgUrl = getSelectedPriceBadgeBackgroundUrl();
        if (customPriceBadgeStyleId && customPriceBadgeStyleId !== "solid" && badgeBgUrl) {
          const isGranatBadgePreview = String(customPriceBadgeStyleId || "").includes("granatowe");
          const isTnzBadgePreview = String(customPriceBadgeStyleId || "").includes("tnz");
          priceCircle.style.background = "transparent";
          priceCircle.style.backgroundImage = `url("${badgeBgUrl}")`;
          priceCircle.style.backgroundRepeat = "no-repeat";
          priceCircle.style.backgroundPosition = "center";
          if (isSingleDirectPreview) {
            priceCircle.style.backgroundSize = "contain";
          } else {
            priceCircle.style.backgroundSize = isGranatBadgePreview ? "124%" : (isTnzBadgePreview ? "114%" : "116%");
          }
        } else {
          priceCircle.style.backgroundImage = "none";
          priceCircle.style.background = customPriceCircleColor || "#d71920";
        }
      }
      const previewPriceBase = isRoundedRectPricePreview
        ? Math.max(34, parseInt(priceCircle.style.height || "34", 10))
        : base;
      const previewUnitPx = Math.max(7, Math.round(previewPriceBase * (noPriceCirclePreview ? 0.22 : (isRoundedRectPricePreview ? 0.26 : (isSingleDirectPreview ? 0.095 : 0.11))) * scale));
      const previewDecPx = noPriceCirclePreview
        ? previewUnitPx
        : Math.max(8, Math.round(previewPriceBase * (isRoundedRectPricePreview ? 0.26 : 0.14) * scale));
      const previewMainPx = Math.max(12, Math.round(previewPriceBase * (noPriceCirclePreview ? 0.56 : (isRoundedRectPricePreview ? 0.80 : (isSingleDirectPreview ? 0.475 : 0.38))) * scale));
      mainEl.style.fontSize = `${previewMainPx}px`;
      decEl.style.fontSize = `${previewDecPx}px`;
      unitEl.style.fontSize = `${previewUnitPx}px`;
      unitEl.style.whiteSpace = "nowrap";
      unitEl.style.letterSpacing = (isSingleDirectPreview && !noPriceCirclePreview && !isRoundedRectPricePreview) ? "-0.1px" : "0";
      if (isSingleDirectPreview && !noPriceCirclePreview && !isRoundedRectPricePreview) {
        unitEl.style.transform = "translateY(-1px)";
      } else {
        unitEl.style.transform = "none";
      }
    }

    const eanDigits = scientificToPlain(product.ean);
    barcodeEl.innerHTML = "";
    if (flagEl) {
      flagEl.style.display = customPreviewVisibility.showFlag ? "flex" : "none";
    }
    if (barcodeWrap) {
      barcodeWrap.style.display = customPreviewVisibility.showBarcode ? "block" : "none";
    }
    if (customPreviewVisibility.showBarcode && window.JsBarcode && eanDigits) {
      try {
        window.JsBarcode(barcodeEl, eanDigits, {
          format: "EAN13",
          displayValue: true,
          fontSize: 10,
          height: 54,
          width: 1.45,
          margin: 0,
          background: "transparent"
        });
        // JsBarcode potrafi nadpisac atrybuty SVG; wymuszamy osadzenie 1:1 w kontenerze.
        barcodeEl.removeAttribute("width");
        barcodeEl.removeAttribute("height");
        barcodeEl.style.width = "100%";
        barcodeEl.style.height = "100%";
        barcodeEl.style.display = "block";
      } catch (e) {
        barcodeEl.innerHTML = "";
      }
    }
  }

  function getActiveCatalogPage() {
    if (!Array.isArray(window.pages) || window.pages.length === 0) return null;
    return window.pages.find((p) => p.stage === document.activeStage) || window.pages[0];
  }

  function buildCatalogProductFromCustom(product) {
    if (!product) return null;
    const base = getEffectivePreviewProduct() || product;
    const name = getDisplayName(base);
    const ean = scientificToPlain(base.ean);
    const countryRaw = String(base?.raw?.["text-left 3"] || "RUMUNIA").trim();
    const includeBarcode = !!customPreviewVisibility.showBarcode;
    const includeFlag = !!customPreviewVisibility.showFlag;
    const family = Array.isArray(currentFamilyProducts) ? currentFamilyProducts : [];
    const familyIndexes = family
      .map((item) => getDisplayIndex(item && item.product ? item.product : null))
      .filter(Boolean);
    const uniqueFamilyIndexes = Array.from(new Set(familyIndexes));
    const mergedIndex = uniqueFamilyIndexes.length
      ? uniqueFamilyIndexes.join(", ")
      : getDisplayIndex(base);
    const familyImageUrls = family
      .map((item) => String(item && item.url ? item.url : "").trim())
      .filter(Boolean);
    const selectedLayoutStyleId = String(customModuleLayoutStyleId || "default");
    const imageLayouts = buildExportImageLayouts(base.index, mergedIndex, familyImageUrls, selectedLayoutStyleId);
    const selectedPriceBadgeStyle = getSelectedPriceBadgeStyleMeta();
    const priceBadgeImageUrl = getSelectedPriceBadgeBackgroundUrl();
    return {
      INDEKS: mergedIndex,
      NAZWA: name || "-",
      JEDNOSTKA: String(base.packageUnit || "SZT").trim() || "SZT",
      CUSTOM_PACKAGE_VALUE: String(base.packageValue || "").trim(),
      CUSTOM_PACKAGE_UNIT: String(base.packageUnit || "").trim(),
      CUSTOM_PACKAGE_INFO_TEXT: buildPackageInfoText(base),
      CENA: getDisplayPrice(base) || "0.00",
      PRICE_BG_COLOR: customPriceCircleColor || "#d71920",
      PRICE_BG_STYLE_ID: selectedPriceBadgeStyle?.id || "solid",
      PRICE_BG_IMAGE_URL: priceBadgeImageUrl || "",
      PRICE_TEXT_COLOR: customPriceTextColor || "#ffffff",
      PRICE_TEXT_SCALE: Number.isFinite(customPriceTextScale) ? customPriceTextScale : 1,
      PRICE_CURRENCY_SYMBOL: customCurrencySymbol === "€" ? "€" : "£",
      PRICE_FONT_FAMILY: normalizeFontOption(customPriceFontFamily, "Arial"),
      PRICE_TEXT_BOLD: !!customPriceTextBold,
      PRICE_TEXT_UNDERLINE: !!customPriceTextUnderline,
      PRICE_TEXT_ALIGN: normalizeAlignOption(customPriceTextAlign, "left"),
      MODULE_LAYOUT_STYLE_ID: selectedLayoutStyleId,
      TEXT_FONT_FAMILY: normalizeFontOption(customMetaFontFamily, "Arial"),
      TEXT_COLOR: String(customMetaTextColor || "#1f3560"),
      TEXT_INDEX_COLOR: DEFAULT_INDEX_TEXT_COLOR,
      TEXT_INDEX_ITALIC: true,
      TEXT_BOLD: !!customMetaTextBold,
      TEXT_UNDERLINE: !!customMetaTextUnderline,
      TEXT_ALIGN: normalizeAlignOption(customMetaTextAlign, "left"),
      FAMILY_IMAGE_URLS: familyImageUrls,
      CUSTOM_IMAGE_LAYOUTS: imageLayouts,
      "KOD EAN": includeBarcode ? (ean || "") : "",
      TNZ: String(base?.raw?.["text-right"] || "").trim(),
      LOGO: String(base?.raw?.["text-left 2"] || "").trim(),
      KRAJPOCHODZENIA: includeFlag ? (countryRaw || "RUMUNIA") : ""
    };
  }

  function addCurrentProductToCatalog() {
    if (window.__projectLoadInProgress) {
      if (typeof window.showAppToast === "function") {
        window.showAppToast("Poczekaj chwilę, projekt nadal się wczytuje.", "info");
      }
      return;
    }
    const product = currentPreviewProduct;
    if (!product) {
      if (typeof window.showAppToast === "function") window.showAppToast("Najpierw wybierz produkt.", "error");
      return;
    }
    const page = getActiveCatalogPage();
    if (!page) {
      if (typeof window.showAppToast === "function") window.showAppToast("Najpierw utwórz stronę katalogu.", "error");
      return;
    }
    const stage = page.stage;
    snapshotPreviewLayoutsForExport();
    const modal = document.getElementById("customStyleModal");
    if (modal) modal.style.display = "none";
    if (!stage) return;

    const placementPages = (Array.isArray(window.pages) ? window.pages : [])
      .filter((p) => p && p.stage && typeof p.stage.on === "function");
    const placementStages = placementPages.map((p) => p.stage);
    const placementContainers = placementStages
      .map((s) => (typeof s.container === "function" ? s.container() : null))
      .filter(Boolean);

    placementContainers.forEach((c) => { c.style.cursor = "crosshair"; });
    // Blokujemy auto-drag grup podczas trybu "kliknij miejsce wstawienia",
    // bo ten handler potrafi przejąć klik i nie dochodzi do onPlace.
    window.__customPlacementActive = true;
    isCustomPlacementActive = true;
    if (typeof window.showAppToast === "function") {
      window.showAppToast("Kliknij na stronie miejsce wstawienia produktu.", "success");
    }

    const detachPlacement = () => {
      placementStages.forEach((s) => s.off("mousedown.customPlaceProduct touchstart.customPlaceProduct"));
      placementContainers.forEach((c) => { c.style.cursor = "default"; });
      document.removeEventListener("keydown", onEsc, true);
      window.__customPlacementActive = false;
      isCustomPlacementActive = false;
      if (!window.__customPlacementActive) {
        // Snapshot jest ważny tylko dla najbliższego wstawienia.
        setTimeout(() => {
          pendingPreviewExportLayouts = null;
        }, 120000);
      }
    };

    const onEsc = (e) => {
      if (e.key !== "Escape") return;
      detachPlacement();
      if (typeof window.showAppToast === "function") {
        window.showAppToast("Anulowano wstawianie produktu.", "error");
      }
    };

    const onPlace = async (e) => {
      e.cancelBubble = true;
      const clickedStage = e?.target?.getStage?.() || stage;
      const page = placementPages.find((p) => p.stage === clickedStage) || getActiveCatalogPage();
      const pointer = clickedStage?.getPointerPosition?.() || null;
      detachPlacement();
      if (!pointer || !page || !page.stage || !page.layer) return;
      const loadingStartedAt = Date.now();
      let loadingOverlayClosed = false;
      const loadingSafetyTimer = setTimeout(() => hideCustomAddLoading(), 9000);
      const closeLoadingOverlay = () => {
        if (loadingOverlayClosed) return;
        loadingOverlayClosed = true;
        clearTimeout(loadingSafetyTimer);
        const elapsed = Date.now() - loadingStartedAt;
        const minVisibleMs = 420;
        const waitLeft = Math.max(0, minVisibleMs - elapsed);
        setTimeout(() => hideCustomAddLoading(), waitLeft);
      };
      showCustomAddLoading("Trwa dodawanie produktu do katalogu...");

      const mode = window.LAYOUT_MODE === "layout8" ? "layout8" : "layout6";
      if (!Array.isArray(page.products)) page.products = [];

      const collectOccupiedSlots = () => {
        const slots = new Set();
        if (Array.isArray(page.products)) {
          page.products.forEach((p, i) => {
            if (p) slots.add(i);
          });
        }
        if (Array.isArray(page.slotObjects)) {
          page.slotObjects.forEach((obj, i) => {
            if (obj) slots.add(i);
          });
        }
        if (page.layer && typeof page.layer.find === "function") {
          page.layer.find((n) => n && n.getAttr).forEach((n) => {
            const si = Number(n.getAttr("slotIndex"));
            const psi = Number(n.getAttr("preservedSlotIndex"));
            if (Number.isFinite(si) && si >= 0) slots.add(si);
            if (Number.isFinite(psi) && psi >= 0) slots.add(psi);
          });
        }
        return slots;
      };

      const occupiedSlots = collectOccupiedSlots();
      let slotIndex = page.products.length;
      if (occupiedSlots.size) {
        const maxUsed = Math.max(...Array.from(occupiedSlots));
        slotIndex = Math.max(page.products.length, maxUsed + 1);
      }
      while (occupiedSlots.has(slotIndex)) slotIndex += 1;
      // Styl własny: nigdy nie nadpisujemy istniejących modułów.
      // Nowy produkt zawsze dostaje nowy, wolny slot na końcu.

      function getManagedGroupSlot(group) {
        if (!group || !group.getAttr) return null;
        const direct = group.getAttr("slotIndex");
        if (Number.isFinite(direct)) return direct;
        const preserved = group.getAttr("preservedSlotIndex");
        if (Number.isFinite(preserved)) return preserved;
        return null;
      }

      function clearSlotBindingRecursive(node) {
        if (!node || !node.setAttr) return;
        node.setAttr("slotIndex", null);
        if (node.getChildren) node.getChildren().forEach(clearSlotBindingRecursive);
      }

      function preserveManagedGroupsBeforeRedraw() {
        const saved = [];
        const slots = new Set();
        if (!page || !page.layer) return saved;
        const groups = page.layer.find((n) =>
          n instanceof Konva.Group &&
          n.getAttr &&
          n.getAttr("isUserGroup") &&
          n.getAttr("isAutoSlotGroup")
        );
        groups.forEach((g) => {
          const slot = getManagedGroupSlot(g);
          if (!Number.isFinite(slot)) return;
          slots.add(slot);
          const clone = g.clone({ listening: true, draggable: true });
          clearSlotBindingRecursive(clone);
          clone.setAttr("isAutoSlotGroup", true);
          clone.setAttr("preservedSlotIndex", slot);
          clone.setAttr("slotIndex", null);
          saved.push({ slot, group: clone });
          g.destroy();
        });
        page._customProtectedSlots = slots;
        return saved;
      }

      function restoreManagedGroupsAfterRedraw(savedGroups, newSlot) {
        if (!Array.isArray(savedGroups) || !page || !page.layer) return;
        savedGroups.forEach(({ slot, group }) => {
          if (!Number.isFinite(slot) || !group) return;
          if (slot === newSlot) return;
          page.layer.find((n) => n && n.getAttr && n.getAttr("slotIndex") === slot).forEach((n) => n.destroy());
          page.layer.add(group);
        });
        page._customProtectedSlots = null;
      }

      const family = Array.isArray(currentFamilyProducts) ? currentFamilyProducts : [];
      const familyImageUrls = family
        .map((item) => String(item && item.url ? item.url : "").trim())
        .filter(Boolean);
      const effectiveImageUrl = getEffectivePreviewImageUrl();
      const preloadTargets = familyImageUrls.length > 1
        ? familyImageUrls
        : [effectiveImageUrl].filter(Boolean);
      await Promise.allSettled([
        preloadImageUrls(preloadTargets, 1800),
        waitMs(220)
      ]);

      let catalogEntry = null;
      let preservedGroups = [];
      while (page.products[slotIndex]) slotIndex += 1;
      if (!Array.isArray(page.slotObjects)) page.slotObjects = [];
      if (!Array.isArray(page.barcodeObjects)) page.barcodeObjects = [];
      if (!Array.isArray(page.barcodePositions)) page.barcodePositions = [];
      if (!Array.isArray(page.boxScales)) page.boxScales = [];
      if (!page.settings || typeof page.settings !== "object") page.settings = {};
      const currentIndexSizeSetting = Number(page.settings.indexSize);
      if (Number.isFinite(currentIndexSizeSetting) && currentIndexSizeSetting > 0) {
        page.settings.indexSize = Math.max(8, Math.round(currentIndexSizeSetting * 0.62));
      }

      const attachSlotNodesToGroup = (group, targetSlot) => {
        if (!group || !page || !page.layer) return;
        const toAttach = page.layer.find((n) => {
          if (!n || !n.getAttr) return false;
          if (n.getAttr("slotIndex") !== targetSlot) return false;
          if (n === group) return false;
          const parent = n.getParent ? n.getParent() : null;
          if (parent === group) return false;
          if (parent && parent.getAttr && parent.getAttr("isUserGroup")) return false;
          return isManagedDirectSlotNode(n);
        });
        toAttach.forEach((node) => {
          const abs = node.getAbsolutePosition ? node.getAbsolutePosition() : null;
          if (node.getAttr && node.getAttr("_wasDraggableBeforeUserGroup") == null) {
            node.setAttr("_wasDraggableBeforeUserGroup", !!node.draggable?.());
          }
          if (typeof node.draggable === "function") {
            // W trybie grupy blokujemy drag dzieci (także ceny/prostokąta ceny).
            node.draggable(false);
          }
          node.moveTo(group);
          if (abs && node.setAbsolutePosition) node.setAbsolutePosition(abs);
        });
      };

      const animateInsertedGroup = (group) => {
        if (!group || !window.Konva || !window.Konva.Tween) return;
        if (group.getAttr && group.getAttr("customInsertAnimated")) return;
        const baseScaleX = Number.isFinite(group.scaleX?.()) ? group.scaleX() : 1;
        const baseScaleY = Number.isFinite(group.scaleY?.()) ? group.scaleY() : 1;
        group.setAttr("customInsertAnimated", true);
        group.opacity(0.15);
        group.scaleX(baseScaleX * 0.95);
        group.scaleY(baseScaleY * 0.95);
        const tween = new window.Konva.Tween({
          node: group,
          duration: 0.26,
          opacity: 1,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          easing: window.Konva.Easings?.EaseOut || undefined
        });
        tween.play();
      };

      const placeGroupAtPointer = () => {
        const grouped = page.layer.findOne((n) =>
          n instanceof Konva.Group &&
          n.getAttr &&
          n.getAttr("isUserGroup") &&
          n.getAttr("isAutoSlotGroup") &&
          (n.getAttr("slotIndex") === slotIndex || n.getAttr("preservedSlotIndex") === slotIndex)
        );
        if (!grouped || !pointer) return;
        const rect = grouped.getClientRect({ relativeTo: page.layer });
        const stageW = page.stage?.width?.() || 0;
        const stageH = page.stage?.height?.() || 0;
        const targetRectX = Math.max(0, Math.min(Math.max(0, stageW - rect.width), pointer.x - rect.width / 2));
        const targetRectY = Math.max(0, Math.min(Math.max(0, stageH - rect.height), pointer.y - rect.height / 2));

        // Ustawiamy pozycję przez delte prostokąta (nie bezpośrednio group.x/y),
        // bo grupa po auto-grupowaniu ma dzieci w globalnych koordynatach.
        const dx = targetRectX - rect.x;
        const dy = targetRectY - rect.y;
        grouped.x((grouped.x() || 0) + dx);
        grouped.y((grouped.y() || 0) + dy);

        page.selectedNodes = [grouped];
        page.transformer?.nodes?.([grouped]);
        page.layer.batchDraw();
        page.transformerLayer?.batchDraw?.();
      };

      const autoGroupSlot = (targetSlot, keepSelected = false) => {
        if (!page || !page.layer || typeof page.groupSelectedNodes !== "function") return;
        const existingGroup = page.layer.findOne((n) =>
          n instanceof Konva.Group &&
          n.getAttr &&
          n.getAttr("isUserGroup") &&
          n.getAttr("isAutoSlotGroup") &&
          (n.getAttr("slotIndex") === targetSlot || n.getAttr("preservedSlotIndex") === targetSlot)
        );
        if (existingGroup) {
          attachSlotNodesToGroup(existingGroup, targetSlot);
          if (keepSelected) {
            page.selectedNodes = [existingGroup];
            page.transformer?.nodes?.([existingGroup]);
            animateInsertedGroup(existingGroup);
          }
          page.layer.batchDraw();
          page.transformerLayer?.batchDraw?.();
          return;
        }
        const nodes = page.layer.find((n) => {
          if (!n || !n.getAttr) return false;
          if (n.getAttr("slotIndex") !== targetSlot) return false;
          if (n.getAttr("isName")) return true;
          if (n.getAttr("isIndex")) return true;
          if (n.getAttr("isProductImage")) return true;
          if (n.getAttr("isBarcode")) return true;
          if (n.getAttr("isCountryBadge")) return true;
          if (n.getAttr("isPriceGroup")) return true;
          if (n.getAttr("isDirectPriceRectBg")) return true;
          if (n.getAttr("isCustomPackageInfo")) return true;
          return false;
        });
        if (!Array.isArray(nodes) || nodes.length < 2) return;
        page.selectedNodes = nodes;
        page.transformer?.nodes?.(nodes);
        page.groupSelectedNodes();
        const grouped = Array.isArray(page.selectedNodes) ? page.selectedNodes[0] : null;
        if (grouped && grouped.getAttr) {
          grouped.setAttr("isAutoSlotGroup", true);
          grouped.setAttr("preservedSlotIndex", targetSlot);
          clearSlotBindingRecursive(grouped);
          grouped.setAttr("slotIndex", null);
          attachSlotNodesToGroup(grouped, targetSlot);
          if (keepSelected) {
            animateInsertedGroup(grouped);
          } else {
            page.selectedNodes = [];
            page.transformer?.nodes?.([]);
          }
        }
        page.layer.batchDraw();
        page.transformerLayer?.batchDraw?.();
      };

      const isIndexLikeNode = (node) => {
        if (!node || !node.getAttr) return false;
        if (node.getAttr("isIndex")) return true;
        const txt = typeof node.text === "function" ? String(node.text() || "") : "";
        return txt.trim().toLowerCase().startsWith("indeks:");
      };

      const stripIndexLabel = (value) => {
        const txt = String(value || "").trim();
        if (!txt) return "-";
        return txt.replace(/^indeks\s*:\s*/i, "").trim() || "-";
      };

      const tuneIndexNode = (node) => {
        if (!node || !node.getAttr || !node.setAttr) return;
        if (!isIndexLikeNode(node)) return;
        if (typeof node.text === "function") {
          const rawText = String(node.text() || "");
          const cleanText = stripIndexLabel(rawText);
          if (cleanText !== rawText) node.text(cleanText);
        }
        if (node.getAttr("_customIndexFontTuned")) return;
        if (typeof node.fontSize !== "function") return;

        const currentSize = Number(node.fontSize());
        if (!Number.isFinite(currentSize) || currentSize <= 0) return;

        const nextSize = Math.max(7, Math.round(currentSize * 0.52));
        node.fontSize(nextSize);
        if (typeof node.fontStyle === "function") node.fontStyle("italic");
        if (typeof node.width === "function") {
          const currentW = Number(node.width());
          if (Number.isFinite(currentW) && currentW > 0) node.width(Math.max(currentW, 120));
        }
        if (typeof node.height === "function") {
          node.height(Math.max(10, Math.round(nextSize * 1.2)));
        }
        if (typeof node.scaleX === "function") node.scaleX(1);
        if (typeof node.scaleY === "function") node.scaleY(1);
        node.setAttr("_customIndexFontTuned", true);
      };

      const tuneIndexTextForSlot = (targetSlot) => {
        if (!page || !page.layer) return;

        // Przypadek przed grupowaniem / bez grupy: tekst ma slotIndex.
        page.layer.find((n) => n && n.getAttr && isIndexLikeNode(n) && n.getAttr("slotIndex") === targetSlot)
          .forEach(tuneIndexNode);

        // Przypadek po auto-grupowaniu: dzieci mogą stracić slotIndex, więc szukamy po grupie slotu.
        const grouped = page.layer.find((n) =>
          n instanceof Konva.Group &&
          n.getAttr &&
          n.getAttr("isUserGroup") &&
          n.getAttr("isAutoSlotGroup") &&
          (n.getAttr("slotIndex") === targetSlot || n.getAttr("preservedSlotIndex") === targetSlot)
        );
        grouped.forEach((g) => {
          if (!g || !g.find) return;
          g.find((n) => n && n.getAttr && isIndexLikeNode(n)).forEach(tuneIndexNode);
        });

        page.layer.batchDraw();
        page.transformerLayer?.batchDraw?.();
      };

      const bindIndexEditingNode = (node) => {
        if (!node || !node.getAttr || !node.setAttr) return;
        if (!isIndexLikeNode(node)) return;
        if (node.getAttr("_customIndexEditBound")) return;

        const rebindFn = (typeof window.rebindEditableTextForClone === "function")
          ? window.rebindEditableTextForClone
          : null;
        const bindFn = (typeof window.enableEditableText === "function")
          ? window.enableEditableText
          : null;

        try {
          if (rebindFn) {
            rebindFn(node, page);
          } else if (bindFn) {
            // Czyścimy tylko eventy tekstowe, a potem podpinamy pełną edycję inline.
            if (typeof node.off === "function") {
              node.off("dblclick dbltap click tap transform transformend");
            }
            bindFn(node, page);
          }
          node.setAttr("_customIndexEditBound", true);
        } catch (_err) {
          // Brak twardego faila – UI ma dalej działać.
        }
      };

      const isEditableModuleTextNode = (node) => {
        if (!node || !node.getAttr) return false;
        if (!window.Konva || !(node instanceof window.Konva.Text)) return false;
        if (isIndexLikeNode(node)) return true;
        return !!node.getAttr("isName");
      };

      const bindNoopEditFontGuardNode = (node) => {
        if (!isEditableModuleTextNode(node) || !node.setAttr) return;
        if (node.getAttr("_customNoopEditGuardBound")) return;

        const saveSnapshot = () => {
          try {
            const abs = node.getAbsolutePosition ? node.getAbsolutePosition() : null;
            node.setAttr("_customNoopEditSnapshot", {
              text: typeof node.text === "function" ? String(node.text() || "") : "",
              fontSize: typeof node.fontSize === "function" ? Number(node.fontSize()) : null,
              width: typeof node.width === "function" ? Number(node.width()) : null,
              height: typeof node.height === "function" ? Number(node.height()) : null,
              scaleX: typeof node.scaleX === "function" ? Number(node.scaleX()) : null,
              scaleY: typeof node.scaleY === "function" ? Number(node.scaleY()) : null,
              x: abs && Number.isFinite(abs.x) ? abs.x : null,
              y: abs && Number.isFinite(abs.y) ? abs.y : null
            });
          } catch (_err) {}
        };

        const restoreIfNoTextChange = () => {
          try {
            if (window.isEditingText) return false;
            const snap = node.getAttr ? node.getAttr("_customNoopEditSnapshot") : null;
            if (!snap) return true;
            if (typeof node.isDestroyed === "function" && node.isDestroyed()) return true;
            const currentText = typeof node.text === "function" ? String(node.text() || "") : "";
            if (currentText !== String(snap.text || "")) {
              node.setAttr("_customNoopEditSnapshot", null);
              return true;
            }
            if (Number.isFinite(snap.fontSize) && typeof node.fontSize === "function") node.fontSize(snap.fontSize);
            if (Number.isFinite(snap.width) && typeof node.width === "function") node.width(snap.width);
            if (Number.isFinite(snap.height) && typeof node.height === "function") node.height(snap.height);
            if (Number.isFinite(snap.scaleX) && typeof node.scaleX === "function") node.scaleX(snap.scaleX);
            if (Number.isFinite(snap.scaleY) && typeof node.scaleY === "function") node.scaleY(snap.scaleY);
            if (Number.isFinite(snap.x) && Number.isFinite(snap.y) && typeof node.setAbsolutePosition === "function") {
              node.setAbsolutePosition({ x: snap.x, y: snap.y });
            }
            node.setAttr("_customNoopEditSnapshot", null);
            page.layer?.batchDraw?.();
            page.transformerLayer?.batchDraw?.();
            return true;
          } catch (_err) {
            return true;
          }
        };

        const startEditWatch = () => {
          const watchId = (Number(node.getAttr("_customNoopEditWatchId")) || 0) + 1;
          node.setAttr("_customNoopEditWatchId", watchId);

          let sawEditing = !!window.isEditingText;
          let ticks = 0;
          const maxTicks = 400; // ok. 40s

          const poll = () => {
            if (!node || (typeof node.isDestroyed === "function" && node.isDestroyed())) return;
            if (Number(node.getAttr("_customNoopEditWatchId")) !== watchId) return;
            ticks += 1;

            if (window.isEditingText) {
              sawEditing = true;
            } else if (sawEditing) {
              restoreIfNoTextChange();
              return;
            } else if (ticks <= 3) {
              // klik bez edycji: szybka próba, bez czekania 40s
              restoreIfNoTextChange();
            }

            if (ticks >= maxTicks) {
              restoreIfNoTextChange();
              return;
            }
            setTimeout(poll, 100);
          };

          setTimeout(poll, 0);
        };

        if (typeof node.on === "function") {
          node.on("mousedown.customNoopEditGuard touchstart.customNoopEditGuard", saveSnapshot);
          node.on("click.customNoopEditGuard tap.customNoopEditGuard", startEditWatch);
          node.on("dblclick.customNoopEditGuard dbltap.customNoopEditGuard", startEditWatch);
        }

        node.setAttr("_customNoopEditGuardBound", true);
      };

      const startSafeInlineTextEdit = (node) => {
        if (!node || typeof node.text !== "function") return;
        if (window.isEditingText) return;
        if (node.getParent && node.getParent().getAttr && node.getParent().getAttr("isPriceGroup")) return;

        const layer = page.layer;
        const tr = page.transformer;
        const originalAbs = node.getAbsolutePosition ? node.getAbsolutePosition() : { x: node.x?.() || 0, y: node.y?.() || 0 };
        const original = {
          text: String(node.text() || ""),
          fontSize: typeof node.fontSize === "function" ? Number(node.fontSize()) : null,
          width: typeof node.width === "function" ? Number(node.width()) : null,
          height: typeof node.height === "function" ? Number(node.height()) : null,
          scaleX: typeof node.scaleX === "function" ? Number(node.scaleX()) : null,
          scaleY: typeof node.scaleY === "function" ? Number(node.scaleY()) : null,
          x: Number(originalAbs?.x),
          y: Number(originalAbs?.y)
        };

        window.hideTextToolbar?.();
        window.hideTextPanel?.();
        window.isEditingText = true;
        tr?.hide?.();
        node.hide?.();
        layer?.draw?.();

        const pos = node.absolutePosition ? node.absolutePosition() : { x: node.x?.() || 0, y: node.y?.() || 0 };
        const rect = page.stage?.container?.().getBoundingClientRect?.();
        if (!rect) {
          node.show?.();
          tr?.show?.();
          tr?.forceUpdate?.();
          layer?.draw?.();
          window.isEditingText = false;
          return;
        }

        const absX = rect.left + pos.x + window.scrollX;
        const absY = rect.top + pos.y + window.scrollY;
        const textarea = document.createElement("textarea");
        document.body.appendChild(textarea);

        textarea.value = original.text;
        Object.assign(textarea.style, {
          position: "absolute",
          left: `${absX}px`,
          top: `${absY}px`,
          width: `${Math.max(20, Number(node.width?.() || 0))}px`,
          minHeight: `${Math.max(16, Number(node.height?.() || 0))}px`,
          fontSize: `${Math.max(1, Number(node.fontSize?.() || 12))}px`,
          fontFamily: typeof node.fontFamily === "function" ? node.fontFamily() : "Arial",
          lineHeight: String(typeof node.lineHeight === "function" ? node.lineHeight() : 1.2),
          textAlign: typeof node.align === "function" ? node.align() : "left",
          color: typeof node.fill === "function" ? node.fill() : "#111",
          padding: "2px",
          border: "2px solid #0066ff",
          background: "white",
          resize: "none",
          zIndex: 99999,
          outline: "none",
          overflow: "hidden"
        });

        const localShrinkText = (typeof window.shrinkText === "function")
          ? window.shrinkText
          : (typeof shrinkText === "function" ? shrinkText : null);

        const finish = () => {
          const finalText = String(textarea.value || "");
          const normalizedFinal = finalText || "-";
          const changed = normalizedFinal !== String(original.text || "");

          if (changed) {
            node.text(normalizedFinal);
            if (typeof localShrinkText === "function") {
              localShrinkText(node, 8);
            }
            tightenDirectTextSelectionBox(node);
            const targetSlot = resolveSlotFromNode(node);
            if (Number.isFinite(targetSlot)) {
              layoutDirectMetaTextForSlot(targetSlot);
            }
          } else {
            node.text(String(original.text || ""));
            if (Number.isFinite(original.fontSize) && typeof node.fontSize === "function") node.fontSize(original.fontSize);
            if (Number.isFinite(original.width) && typeof node.width === "function") node.width(original.width);
            if (Number.isFinite(original.height) && typeof node.height === "function") node.height(original.height);
            if (Number.isFinite(original.scaleX) && typeof node.scaleX === "function") node.scaleX(original.scaleX);
            if (Number.isFinite(original.scaleY) && typeof node.scaleY === "function") node.scaleY(original.scaleY);
            if (Number.isFinite(original.x) && Number.isFinite(original.y) && typeof node.setAbsolutePosition === "function") {
              node.setAbsolutePosition({ x: original.x, y: original.y });
            }
            tightenDirectTextSelectionBox(node);
          }

          node.show?.();
          tr?.show?.();
          tr?.forceUpdate?.();
          layer?.draw?.();
          textarea.remove();
          window.isEditingText = false;
          window.removeEventListener("click", close);
        };

        const close = (e) => {
          if (e.target !== textarea) finish();
        };

        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        textarea.style.height = `${textarea.scrollHeight}px`;

        textarea.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            finish();
          }
          if (e.key === "Escape") finish();
        });

        textarea.addEventListener("input", () => {
          if (typeof node.text === "function") node.text(textarea.value);
          if (typeof localShrinkText === "function") {
            const newSize = localShrinkText(node, 8);
            if (Number.isFinite(newSize)) textarea.style.fontSize = `${newSize}px`;
          }
          textarea.style.height = "auto";
          textarea.style.height = `${textarea.scrollHeight}px`;
        });

        setTimeout(() => window.addEventListener("click", close), 0);
      };

      const bindSafeInlineTextEditNode = (node) => {
        if (!isEditableModuleTextNode(node) || !node.setAttr || typeof node.on !== "function") return;
        if (node.getAttr("_customSafeInlineTextEditBound")) return;

        // Usuwamy domyślne handlery edycji z importdanych.js dla tego tekstu
        // i podpinamy własne, które nie zmieniają stylu przy braku zmian.
        if (typeof node.off === "function") {
          node.off("click tap dblclick dbltap");
        }

        const onClick = (e) => {
          if (window.isEditingText) return;
          if (e && e.evt && e.evt.shiftKey) return;
          if (node.isDragging && node.isDragging()) return;
          if (node.getParent && node.getParent().getAttr && node.getParent().getAttr("isPriceGroup")) return;

          window.showTextToolbar?.(node);
          window.hideTextPanel?.();

          // Pojedynczy klik tylko zaznacza/pokazuje toolbar.
          // Edycja tekstu wyłącznie na dwuklik, żeby dało się swobodnie przeciągać tekst.
        };

        node.on("click.customSafeInlineTextEdit tap.customSafeInlineTextEdit", onClick);
        node.on("dblclick.customSafeInlineTextEdit dbltap.customSafeInlineTextEdit", () => {
          startSafeInlineTextEdit(node);
        });
        node.setAttr("_customSafeInlineTextEditBound", true);
      };

      const getManagedGroupForSlot = (targetSlot) => {
        if (!page || !page.layer) return null;
        return page.layer.findOne((n) =>
          n instanceof Konva.Group &&
          n.getAttr &&
          n.getAttr("isUserGroup") &&
          n.getAttr("isAutoSlotGroup") &&
          (n.getAttr("slotIndex") === targetSlot || n.getAttr("preservedSlotIndex") === targetSlot)
        ) || null;
      };

      const findIndexNodeForSlot = (targetSlot) => {
        if (!page || !page.layer) return null;
        const direct = page.layer.findOne((n) =>
          n && n.getAttr && isIndexLikeNode(n) && n.getAttr("slotIndex") === targetSlot
        );
        if (direct) return direct;
        const group = getManagedGroupForSlot(targetSlot);
        if (!group || !group.findOne) return null;
        return group.findOne((n) => n && n.getAttr && isIndexLikeNode(n)) || null;
      };

      const findPackageInfoNodeForSlot = (targetSlot) => {
        if (!page || !page.layer) return null;
        const direct = page.layer.findOne((n) =>
          n && n.getAttr && n.getAttr("isCustomPackageInfo") && n.getAttr("slotIndex") === targetSlot
        );
        if (direct) return direct;
        const group = getManagedGroupForSlot(targetSlot);
        if (!group || !group.findOne) return null;
        return group.findOne((n) => n && n.getAttr && n.getAttr("isCustomPackageInfo")) || null;
      };

      const findNameNodeForSlot = (targetSlot) => {
        if (!page || !page.layer) return null;
        const direct = page.layer.findOne((n) =>
          n && n.getAttr && n.getAttr("isName") && n.getAttr("slotIndex") === targetSlot
        );
        if (direct) return direct;
        const group = getManagedGroupForSlot(targetSlot);
        if (!group || !group.findOne) return null;
        return group.findOne((n) => n && n.getAttr && n.getAttr("isName")) || null;
      };

      const estimateTextContentHeight = (node) => {
        if (!node || !window.Konva || !(node instanceof window.Konva.Text)) return 0;
        const fontSize = Number(node.fontSize?.() || 12);
        const lineHeightMult = Number(node.lineHeight?.() || 1);
        const linePx = Math.max(fontSize, Math.round(fontSize * lineHeightMult));
        const lines = Math.max(
          1,
          Number(node.textArr?.length) || String(node.text?.() || "").split("\n").length
        );
        return Math.max(fontSize, Math.ceil(lines * linePx));
      };

      const fitTextNodeWithinHeight = (node, maxHeight, minFontSize = 6) => {
        if (!node || typeof node.fontSize !== "function") return;
        const targetHeight = Number(maxHeight);
        if (!Number.isFinite(targetHeight) || targetHeight <= 0) return;
        let size = Math.max(minFontSize, Math.round(Number(node.fontSize()) || 12));
        node.fontSize(size);
        while (size > minFontSize && estimateTextContentHeight(node) > targetHeight) {
          size -= 1;
          node.fontSize(size);
        }
        tightenDirectTextSelectionBox(node);
      };

      const layoutDirectMetaTextForSlot = (targetSlot) => {
        const nameNode = findNameNodeForSlot(targetSlot);
        const indexNode = findIndexNodeForSlot(targetSlot);
        const packageNode = findPackageInfoNodeForSlot(targetSlot);
        if (!nameNode || !indexNode) return;

        const directModuleId = String(
          nameNode.getAttr?.("directModuleId") ||
          indexNode.getAttr?.("directModuleId") ||
          packageNode?.getAttr?.("directModuleId") ||
          ""
        ).trim();
        if (!directModuleId) return;

        const moduleScale = getCustomModuleScale(page);
        const nameMaxHeight = Number(nameNode.getAttr?.("layoutMaxHeight")) || Number(nameNode.height?.() || 0);
        const nameBaseFont = Number(nameNode.getAttr?.("layoutBaseFontSize")) || Number(nameNode.fontSize?.() || 12);
        nameNode.fontSize(nameBaseFont);
        fitTextNodeWithinHeight(nameNode, nameMaxHeight, Math.max(6, Math.round(7 * moduleScale)));

        const nameBottom = Number(nameNode.y?.() || 0) + estimateTextContentHeight(nameNode);
        const baseIndexY = Number(indexNode.getAttr?.("layoutBaseY"));
        const baseIndexX = Number(indexNode.getAttr?.("layoutBaseX"));
        const baseIndexWidth = Number(indexNode.getAttr?.("layoutBaseWidth"));
        const gapAfterName = Math.max(2, Math.round(2 * moduleScale));
        const nextIndexY = Math.max(Number.isFinite(baseIndexY) ? baseIndexY : Number(indexNode.y?.() || 0), nameBottom + gapAfterName);

        if (Number.isFinite(baseIndexX) && typeof indexNode.x === "function") indexNode.x(baseIndexX);
        if (typeof indexNode.y === "function") indexNode.y(nextIndexY);
        if (Number.isFinite(baseIndexWidth) && typeof indexNode.width === "function") indexNode.width(Math.max(baseIndexWidth, Number(indexNode.width()) || 0));
        tightenDirectTextSelectionBox(indexNode);

        if (packageNode) {
          const basePackageY = Number(packageNode.getAttr?.("layoutBaseY"));
          const basePackageX = Number(packageNode.getAttr?.("layoutBaseX"));
          const basePackageWidth = Number(packageNode.getAttr?.("layoutBaseWidth"));
          const indexBottom = nextIndexY + estimateTextContentHeight(indexNode);
          const gapAfterIndex = Math.max(1, Math.round(1 * moduleScale));
          const nextPackageY = Math.max(Number.isFinite(basePackageY) ? basePackageY : Number(packageNode.y?.() || 0), indexBottom + gapAfterIndex);
          if (Number.isFinite(basePackageX) && typeof packageNode.x === "function") packageNode.x(basePackageX);
          if (typeof packageNode.y === "function") packageNode.y(nextPackageY);
          if (Number.isFinite(basePackageWidth) && typeof packageNode.width === "function") packageNode.width(Math.max(basePackageWidth, Number(packageNode.width()) || 0));
          tightenDirectTextSelectionBox(packageNode);
        }

        page.layer?.batchDraw?.();
        page.transformerLayer?.batchDraw?.();
      };

      const ensurePackageInfoTextForSlot = (targetSlot) => {
        if (!page || !page.layer || !window.Konva) return;
        const productEntry = Array.isArray(page.products) ? page.products[targetSlot] : null;
        const packageText = String(productEntry?.CUSTOM_PACKAGE_INFO_TEXT || "").trim();

        let labelNode = findPackageInfoNodeForSlot(targetSlot);
        if (!packageText) {
          if (labelNode && labelNode.destroy) {
            labelNode.destroy();
            page.layer.batchDraw();
            page.transformerLayer?.batchDraw?.();
          }
          return;
        }

        const indexNode = findIndexNodeForSlot(targetSlot);
        if (!indexNode || typeof indexNode.getAbsolutePosition !== "function") return;
        const directModuleId = String(indexNode.getAttr?.("directModuleId") || labelNode?.getAttr?.("directModuleId") || "").trim();
        const isDirectCustomLayout = !!directModuleId;
        const idxPos = indexNode.getAbsolutePosition();
        const idxFont = Number(indexNode.fontSize?.()) || 10;
        const idxW = Number(indexNode.width?.()) || 120;
        const idxH = Number(indexNode.height?.()) || Math.round(idxFont * 1.2);

        if (!labelNode) {
          if (isDirectCustomLayout) {
            // W module direct pozycja "opak." jest sterowana layoutem (np. styl-numer-2),
            // więc nie tworzymy tu fallbacku pod indeksem.
            return;
          }
          labelNode = new window.Konva.Text({
            x: idxPos.x,
            y: idxPos.y + idxH + 1,
            text: packageText,
            fontSize: Math.max(6, idxFont),
            fill: "#334155",
            fontFamily: typeof indexNode.fontFamily === "function" ? indexNode.fontFamily() : (page.settings?.fontFamily || "Arial"),
            align: typeof indexNode.align === "function" ? indexNode.align() : "left",
            width: Math.max(100, idxW),
            wrap: "none",
            listening: false,
            draggable: false,
            isCustomPackageInfo: true,
            slotIndex: targetSlot
          });
          page.layer.add(labelNode);
        } else {
          labelNode.text(packageText);
          if (!isDirectCustomLayout) {
            labelNode.fontSize(Math.max(6, idxFont));
            if (typeof labelNode.width === "function") labelNode.width(Math.max(100, idxW));
          }
        }
        applySmallTextEasyHitArea(labelNode);
        tightenDirectTextSelectionBox(labelNode);

        if (!isDirectCustomLayout) {
          if (typeof labelNode.setAbsolutePosition === "function") {
            labelNode.setAbsolutePosition({ x: idxPos.x, y: idxPos.y + idxH + 1 });
          } else {
            labelNode.x(idxPos.x);
            labelNode.y(idxPos.y + idxH + 1);
          }
        }
        labelNode.moveToTop?.();

        const group = getManagedGroupForSlot(targetSlot);
        if (group) attachSlotNodesToGroup(group, targetSlot);

        page.layer.batchDraw();
        page.transformerLayer?.batchDraw?.();
      };

      const collectModuleNodesForSlotSnapshot = (targetSlot) => {
        const out = [];
        const seen = new Set();
        const pushNode = (n) => {
          if (!n || seen.has(n)) return;
          seen.add(n);
          out.push(n);
        };

        const group = getManagedGroupForSlot(targetSlot);
        if (group) {
          pushNode(group);
          if (group.find) {
            group.find((n) => n && n.getAttr && isManagedDirectSlotNode(n)).forEach(pushNode);
          }
          return out;
        }

        if (!page || !page.layer) return out;
        page.layer.find((n) => {
          if (!n || !n.getAttr) return false;
          if (n.getAttr("slotIndex") !== targetSlot) return false;
          return isManagedDirectSlotNode(n);
        }).forEach(pushNode);
        return out;
      };

      const resolveSlotFromNode = (node) => {
        let cur = node;
        while (cur) {
          if (cur.getAttr) {
            const si = Number(cur.getAttr("slotIndex"));
            if (Number.isFinite(si) && si >= 0) return si;
            const psi = Number(cur.getAttr("preservedSlotIndex"));
            if (Number.isFinite(psi) && psi >= 0) return psi;
          }
          cur = cur.getParent ? cur.getParent() : null;
        }
        return null;
      };

      const clearCustomInsertTaskBag = () => {
        const bag = page && page._customInsertTaskBag;
        if (!bag) return;
        const timeoutIds = Array.isArray(bag.timeoutIds) ? bag.timeoutIds.slice() : [];
        timeoutIds.forEach((id) => clearTimeout(id));
        bag.timeoutIds = [];
        if (bag.stage && bag.dragListener && typeof bag.stage.off === "function") {
          bag.stage.off("dragstart.customInsertStabilize", bag.dragListener);
        }
        if (bag.stage && bag.pointerDownListener && typeof bag.stage.off === "function") {
          bag.stage.off("mousedown.customInsertStabilize touchstart.customInsertStabilize", bag.pointerDownListener);
        }
        if (page && page._customInsertTaskBag === bag) {
          page._customInsertTaskBag = null;
        }
      };

      const createCustomInsertScheduler = (targetSlot) => {
        clearCustomInsertTaskBag();
        const bag = {
          slotIndex: targetSlot,
          stage: page && page.stage ? page.stage : null,
          timeoutIds: [],
          dragListener: null,
          pointerDownListener: null
        };

        const runSafely = (fn) => {
          try { fn(); } catch (_err) {}
        };

        const schedule = (fn, ms) => {
          const timeoutId = setTimeout(() => {
            bag.timeoutIds = bag.timeoutIds.filter((id) => id !== timeoutId);
            if (!page || page._customInsertTaskBag !== bag) return;
            runSafely(fn);
          }, ms);
          bag.timeoutIds.push(timeoutId);
          return timeoutId;
        };

        bag.dragListener = (evt) => {
          const draggedSlot = resolveSlotFromNode(evt && evt.target ? evt.target : null);
          if (!Number.isFinite(draggedSlot) || draggedSlot !== targetSlot) return;
          clearCustomInsertTaskBag();
        };
        bag.pointerDownListener = (evt) => {
          const touchedSlot = resolveSlotFromNode(evt && evt.target ? evt.target : null);
          if (!Number.isFinite(touchedSlot) || touchedSlot !== targetSlot) return;
          clearCustomInsertTaskBag();
        };

        if (bag.stage && typeof bag.stage.on === "function") {
          bag.stage.on("dragstart.customInsertStabilize", bag.dragListener);
          bag.stage.on("mousedown.customInsertStabilize touchstart.customInsertStabilize", bag.pointerDownListener);
        }

        page._customInsertTaskBag = bag;
        schedule(() => clearCustomInsertTaskBag(), 5200);
        return schedule;
      };

      const saveModuleLayoutSnapshotForPriceEdit = (priceNode) => {
        const targetSlot = resolveSlotFromNode(priceNode);
        if (!Number.isFinite(targetSlot)) return;
        const nodes = collectModuleNodesForSlotSnapshot(targetSlot);
        const snapshot = nodes.map((n) => {
          const abs = n.getAbsolutePosition ? n.getAbsolutePosition() : null;
          if (!abs || !Number.isFinite(abs.x) || !Number.isFinite(abs.y)) return null;
          return { node: n, x: abs.x, y: abs.y };
        }).filter(Boolean);
        priceNode.setAttr("_customModulePosSnapshot", snapshot);
      };

      const restoreModuleLayoutSnapshotForPriceEdit = (priceNode) => {
        const snapshot = priceNode?.getAttr ? priceNode.getAttr("_customModulePosSnapshot") : null;
        if (!Array.isArray(snapshot) || !snapshot.length) return;
        snapshot.forEach((item) => {
          const n = item && item.node;
          if (!n || (typeof n.isDestroyed === "function" && n.isDestroyed())) return;
          if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) return;
          try {
            if (typeof n.setAbsolutePosition === "function") {
              n.setAbsolutePosition({ x: item.x, y: item.y });
            } else if (typeof n.x === "function" && typeof n.y === "function") {
              n.x(item.x);
              n.y(item.y);
            }
          } catch (_err) {}
        });
        page.layer?.batchDraw?.();
        page.transformerLayer?.batchDraw?.();
      };

      const bindPricePositionLockNode = (node) => {
        if (!node || !node.getAttr || !node.setAttr) return;
        if (!node.getAttr("isPriceGroup")) return;
        if (node.getAttr("_customPricePosLockBound")) return;

        const savePos = () => {
          try {
            saveModuleLayoutSnapshotForPriceEdit(node);
            const abs = node.getAbsolutePosition ? node.getAbsolutePosition() : null;
            if (!abs) return;
            node.setAttr("_customPricePosBeforeEdit", { x: abs.x, y: abs.y });
          } catch (_err) {}
        };

        const restorePos = () => {
          try {
            const saved = node.getAttr ? node.getAttr("_customPricePosBeforeEdit") : null;
            if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
            if (typeof node.setAbsolutePosition === "function") {
              node.setAbsolutePosition({ x: saved.x, y: saved.y });
            } else if (typeof node.x === "function" && typeof node.y === "function") {
              node.x(saved.x);
              node.y(saved.y);
            }
            page.layer?.batchDraw?.();
            page.transformerLayer?.batchDraw?.();
          } catch (_err) {}
        };

        if (typeof node.on === "function") {
          node.on("mousedown.customPricePosLock touchstart.customPricePosLock", savePos);
          node.on("dblclick.customPricePosLock dbltap.customPricePosLock", () => {
            // Po prompt + przeliczeniu stylu cena potrafi "skoczyć".
            // Przywracamy pozycję całego modułu kilka razy, bo część stylowań jest opóźniona.
            [0, 40, 120, 260, 520].forEach((ms) => setTimeout(() => {
              restoreModuleLayoutSnapshotForPriceEdit(node);
              restorePos();
            }, ms));
          });
        }

        node.setAttr("_customPricePosLockBound", true);
      };

      const ensureIndexEditingForSlot = (targetSlot) => {
        if (!page || !page.layer) return;
        page.layer.find((n) => n && n.getAttr && isIndexLikeNode(n) && n.getAttr("slotIndex") === targetSlot)
          .forEach(bindIndexEditingNode);
        const grouped = page.layer.find((n) =>
          n instanceof Konva.Group &&
          n.getAttr &&
          n.getAttr("isUserGroup") &&
          n.getAttr("isAutoSlotGroup") &&
          (n.getAttr("slotIndex") === targetSlot || n.getAttr("preservedSlotIndex") === targetSlot)
        );
        grouped.forEach((g) => {
          if (!g || !g.find) return;
          g.find((n) => n && n.getAttr && isIndexLikeNode(n)).forEach(bindIndexEditingNode);
        });
      };

      const ensureNoopEditFontGuardForSlot = (targetSlot) => {
        if (!page || !page.layer) return;
        page.layer.find((n) =>
          n && n.getAttr &&
          n.getAttr("slotIndex") === targetSlot &&
          (n.getAttr("isName") || isIndexLikeNode(n))
        ).forEach(bindNoopEditFontGuardNode);

        const grouped = page.layer.find((n) =>
          n instanceof Konva.Group &&
          n.getAttr &&
          n.getAttr("isUserGroup") &&
          n.getAttr("isAutoSlotGroup") &&
          (n.getAttr("slotIndex") === targetSlot || n.getAttr("preservedSlotIndex") === targetSlot)
        );
        grouped.forEach((g) => {
          if (!g || !g.find) return;
          g.find((n) => n && n.getAttr && (n.getAttr("isName") || isIndexLikeNode(n))).forEach(bindNoopEditFontGuardNode);
        });
      };

      const ensureSafeInlineTextEditForSlot = (targetSlot) => {
        if (!page || !page.layer) return;
        page.layer.find((n) =>
          n && n.getAttr &&
          n.getAttr("slotIndex") === targetSlot &&
          (n.getAttr("isName") || isIndexLikeNode(n))
        ).forEach(bindSafeInlineTextEditNode);

        const grouped = page.layer.find((n) =>
          n instanceof Konva.Group &&
          n.getAttr &&
          n.getAttr("isUserGroup") &&
          n.getAttr("isAutoSlotGroup") &&
          (n.getAttr("slotIndex") === targetSlot || n.getAttr("preservedSlotIndex") === targetSlot)
        );
        grouped.forEach((g) => {
          if (!g || !g.find) return;
          g.find((n) => n && n.getAttr && (n.getAttr("isName") || isIndexLikeNode(n))).forEach(bindSafeInlineTextEditNode);
        });
      };

      const ensurePricePositionLockForSlot = (targetSlot) => {
        if (!page || !page.layer) return;
        page.layer.find((n) => n && n.getAttr && n.getAttr("isPriceGroup") && n.getAttr("slotIndex") === targetSlot)
          .forEach(bindPricePositionLockNode);
        const grouped = page.layer.find((n) =>
          n instanceof Konva.Group &&
          n.getAttr &&
          n.getAttr("isUserGroup") &&
          n.getAttr("isAutoSlotGroup") &&
          (n.getAttr("slotIndex") === targetSlot || n.getAttr("preservedSlotIndex") === targetSlot)
        );
        grouped.forEach((g) => {
          if (!g || !g.find) return;
          g.find((n) => n && n.getAttr && n.getAttr("isPriceGroup")).forEach(bindPricePositionLockNode);
        });
      };

      clearCustomInsertTaskBag();
      const regroupNewSlotOnly = () => autoGroupSlot(slotIndex, true);
      const lockSlotDragTemporarily = (targetSlot, scheduleFn, lockMs = 520) => {
        const group = getManagedGroupForSlot(targetSlot);
        if (!group || typeof group.draggable !== "function") return;
        const prev = !!group.draggable();
        group.draggable(false);
        page.layer?.batchDraw?.();
        scheduleFn(() => {
          if (!group || (typeof group.isDestroyed === "function" && group.isDestroyed())) return;
          group.draggable(prev);
          page.layer?.batchDraw?.();
        }, lockMs);
      };
      const bindFirstDragArmingHandlers = (group) => {
        if (!group || typeof group.on !== "function" || typeof group.off !== "function") return;
        group.off(".customFirstDragArm");
        group.on("mousedown.customFirstDragArm touchstart.customFirstDragArm", (evt) => {
          const needsArming = !!(group.getAttr && group.getAttr("_dragNeedsArming"));
          if (!needsArming) return;
          if (group.setAttr) {
            group.setAttr("_dragNeedsArming", false);
            group.setAttr("_dragPendingEnable", true);
          }
          if (typeof group.draggable === "function") group.draggable(false);
          page.selectedNodes = [group];
          page.transformer?.nodes?.([group]);
          if (evt?.evt) {
            evt.evt.preventDefault?.();
            evt.evt.stopPropagation?.();
            evt.evt.stopImmediatePropagation?.();
          }
          evt.cancelBubble = true;
          page.layer?.batchDraw?.();
          page.transformerLayer?.batchDraw?.();
        });
      };
      const armSlotDragAfterInsert = (targetSlot, scheduleFn) => {
        const tryArm = () => {
          const group = getManagedGroupForSlot(targetSlot);
          if (!group || (typeof group.isDestroyed === "function" && group.isDestroyed())) return false;
          if (group.setAttr) group.setAttr("_dragNeedsArming", true);
          if (group.setAttr) group.setAttr("_dragPendingEnable", false);
          if (typeof group.draggable === "function") group.draggable(false);
          bindFirstDragArmingHandlers(group);
          page.layer?.batchDraw?.();
          return true;
        };
        if (tryArm()) return;
        [80, 220, 420, 620].forEach((ms) => scheduleFn(() => { tryArm(); }, ms));
      };

      if (DIRECT_CUSTOM_MODULE_MODE) {
        catalogEntry = buildCatalogProductFromCustom(product);
        page.products[slotIndex] = catalogEntry;
        page.slotObjects[slotIndex] = null;

        const added = await addDirectCustomModuleToPage(page, slotIndex, pointer, catalogEntry, {
          effectiveImageUrl
        });

        if (added) {
          const schedulePostInsert = createCustomInsertScheduler(slotIndex);
          lockSlotDragTemporarily(slotIndex, schedulePostInsert, 620);
          armSlotDragAfterInsert(slotIndex, schedulePostInsert);
          layoutDirectMetaTextForSlot(slotIndex);
          ensurePricePositionLockForSlot(slotIndex);
          ensureIndexEditingForSlot(slotIndex);
          ensureNoopEditFontGuardForSlot(slotIndex);
          ensureSafeInlineTextEditForSlot(slotIndex);
          ensurePackageInfoTextForSlot(slotIndex);
          [80, 220].forEach((ms) => schedulePostInsert(() => {
            layoutDirectMetaTextForSlot(slotIndex);
            ensurePricePositionLockForSlot(slotIndex);
            ensureIndexEditingForSlot(slotIndex);
            ensureNoopEditFontGuardForSlot(slotIndex);
            ensureSafeInlineTextEditForSlot(slotIndex);
            ensurePackageInfoTextForSlot(slotIndex);
          }, ms));
          schedulePostInsert(() => lockSlotDragTemporarily(slotIndex, schedulePostInsert, 420), 220);
          schedulePostInsert(() => armSlotDragAfterInsert(slotIndex, schedulePostInsert), 220);
          document.activeStage = page.stage;
          window.dispatchEvent(new CustomEvent("canvasModified", { detail: page.stage }));
          window.projectOpen = true;
          window.projectDirty = true;
          if (typeof window.showAppToast === "function") {
            window.showAppToast(`Dodano moduł (direct) do strony (slot ${slotIndex + 1}).`, "success");
          }
        } else if (typeof window.showAppToast === "function") {
          window.showAppToast("Nie udało się dodać modułu direct.", "error");
        }

        closeLoadingOverlay();
        resetCustomStyleEditorSessionState();
        updateFamilyUiStatus("Rodzina wyczyszczona po dodaniu modułu do katalogu.", "info");
        return;
      }

      const finalize = () => {
        const schedulePostInsert = createCustomInsertScheduler(slotIndex);
        lockSlotDragTemporarily(slotIndex, schedulePostInsert, 620);
        armSlotDragAfterInsert(slotIndex, schedulePostInsert);
        if (typeof window.applyCatalogStyle === "function") {
          window.applyCatalogStyle("styl_elegancki");
        } else {
          window.CATALOG_STYLE = "styl_elegancki";
        }
        // Rysuj tylko nowy slot – bez pełnego redraw (mniejsza zależność od importdanych, brak „rozjeżdżania”)
        if (typeof window.redrawCatalogPageForCustomStyle === "function") {
          page._drawOnlySlot = slotIndex;
          window.redrawCatalogPageForCustomStyle(page);
        }
        if (typeof window.applyCatalogStyleVisual === "function") {
          window.applyCatalogStyleVisual("styl_elegancki");
          schedulePostInsert(() => window.applyCatalogStyleVisual("styl_elegancki"), 120);
          schedulePostInsert(() => window.applyCatalogStyleVisual("styl_elegancki"), 320);
        }
        restoreManagedGroupsAfterRedraw(preservedGroups, slotIndex);
        ensurePricePositionLockForSlot(slotIndex);
        ensureIndexEditingForSlot(slotIndex);
        ensureNoopEditFontGuardForSlot(slotIndex);
        ensureSafeInlineTextEditForSlot(slotIndex);
        tuneIndexTextForSlot(slotIndex);
        ensurePackageInfoTextForSlot(slotIndex);
        [80, 220, 520].forEach((ms) => schedulePostInsert(() => {
          ensurePricePositionLockForSlot(slotIndex);
          ensureIndexEditingForSlot(slotIndex);
          ensureNoopEditFontGuardForSlot(slotIndex);
          ensureSafeInlineTextEditForSlot(slotIndex);
          tuneIndexTextForSlot(slotIndex);
          ensurePackageInfoTextForSlot(slotIndex);
        }, ms));
        schedulePostInsert(() => lockSlotDragTemporarily(slotIndex, schedulePostInsert, 420), 220);
        schedulePostInsert(() => armSlotDragAfterInsert(slotIndex, schedulePostInsert), 220);
        [220, 520].forEach((ms) => schedulePostInsert(regroupNewSlotOnly, ms));
        [300, 620].forEach((ms) => schedulePostInsert(placeGroupAtPointer, ms));
        document.activeStage = page.stage;
        window.dispatchEvent(new CustomEvent("canvasModified", { detail: page.stage }));
        window.projectOpen = true;
        window.projectDirty = true;
        if (typeof window.showAppToast === "function") {
          window.showAppToast(`Dodano produkt do strony (slot ${slotIndex + 1}).`, "success");
        }
        closeLoadingOverlay();
      };

      catalogEntry = buildCatalogProductFromCustom(product);
      page.products[slotIndex] = catalogEntry;
      preservedGroups = preserveManagedGroupsBeforeRedraw();

      if (familyImageUrls.length > 1) {
        page.slotObjects[slotIndex] = null;
        finalize();
      } else if (effectiveImageUrl && window.Konva && typeof window.Konva.Image.fromURL === "function") {
        const img = await loadKonvaImageFromUrl(effectiveImageUrl, 2600);
        page.slotObjects[slotIndex] = img || null;
        finalize();
      } else {
        page.slotObjects[slotIndex] = null;
        finalize();
      }

      resetCustomStyleEditorSessionState();
      updateFamilyUiStatus("Rodzina wyczyszczona po dodaniu produktu do katalogu.", "info");
    };

    document.addEventListener("keydown", onEsc, true);
    placementStages.forEach((s) => s.on("mousedown.customPlaceProduct touchstart.customPlaceProduct", onPlace));
  }

  function rankAndFilter(products, query) {
    const q = normalizeText(query);
    if (!q) return products.map((p) => ({ p, score: 0 }));

    const qTokens = q.split(" ").filter(Boolean);
    const out = [];

    for (const p of products) {
      const idx = p.indexNorm || "";
      const nm = p.nameNorm || "";
      let score = 0;

      if (idx === q) score += 1000;
      else if (idx.startsWith(q)) score += 700;
      else if (idx.includes(q)) score += 450;

      if (nm === q) score += 420;
      else if (nm.startsWith(q)) score += 320;
      else if (nm.includes(q)) score += 220;

      if (qTokens.length > 1 && qTokens.every((t) => nm.includes(t) || idx.includes(t))) {
        score += 140;
      }

      if (score > 0) out.push({ p, score });
    }

    out.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.p.name.localeCompare(b.p.name, "pl", { sensitivity: "base" });
    });

    return out;
  }

  function attachInteractions(products) {
    const search = document.getElementById("customStyleSearch");
    const select = document.getElementById("customStyleSelect");
    const info = document.getElementById("customStyleInfo");
    const addBtn = document.getElementById("customAddProductBtn");
    const saveDraftBtn = document.getElementById("customSaveDraftBtn");
    const draftListEl = document.getElementById("customDraftModulesList");
    const openDraftTrayBtn = document.getElementById("customOpenDraftTrayBtn");
    const clearEditorBtn = document.getElementById("customClearEditorBtn");
    const moduleLayoutSelect = document.getElementById("customModuleLayoutSelect");
    const applyStyleToImportedBtn = document.getElementById("customApplyStyleToImportedBtn");
    const showFlagToggle = document.getElementById("customShowFlagToggle");
    const showBarcodeToggle = document.getElementById("customShowBarcodeToggle");
    const showFlagToggleMark = document.getElementById("customShowFlagToggleMark");
    const showBarcodeToggleMark = document.getElementById("customShowBarcodeToggleMark");
    const priceColorInput = document.getElementById("customPriceColorInput");
    const priceStyleSelect = document.getElementById("customPriceStyleSelect");
    const priceTextColorInput = document.getElementById("customPriceTextColorInput");
    const currencySelect = document.getElementById("customCurrencySelect");
    const metaFontSelect = document.getElementById("customMetaFontSelect");
    const metaTextColorInput = document.getElementById("customMetaTextColorInput");
    const metaBoldToggle = document.getElementById("customMetaBoldToggle");
    const metaUnderlineToggle = document.getElementById("customMetaUnderlineToggle");
    const metaAlignSelect = document.getElementById("customMetaAlignSelect");
    const priceFontSelect = document.getElementById("customPriceFontSelect");
    const priceBoldToggle = document.getElementById("customPriceBoldToggle");
    const priceUnderlineToggle = document.getElementById("customPriceUnderlineToggle");
    const priceAlignSelect = document.getElementById("customPriceAlignSelect");
    const familySpacingSelect = document.getElementById("customFamilySpacingSelect");
    const priceSizeMinusBtn = document.getElementById("customPriceSizeMinusBtn");
    const priceSizePlusBtn = document.getElementById("customPriceSizePlusBtn");
    const priceSizeValue = document.getElementById("customPriceSizeValue");
    const imageUploadInput = document.getElementById("customImageUploadInput");
    const bulkImageImportBtn = document.getElementById("customBulkImageImportBtn");
    const bulkImageImportInput = document.getElementById("customBulkImageImportInput");
    const addFamilyProductBtn = document.getElementById("customAddFamilyProductBtn");
    const excelImportBtn = document.getElementById("customExcelImportBtn");
    const excelImportInput = document.getElementById("customExcelImportInput");
    const excelImportStatus = document.getElementById("customExcelImportStatus");
    if (!customFontReadyListenerBound) {
      customFontReadyListenerBound = true;
      window.addEventListener("appFontsReady", () => {
        syncCustomFontOptionsFromWindow();
        refreshFontSelectOptions(metaFontSelect, customMetaFontFamily || "Arial");
        refreshFontSelectOptions(priceFontSelect, customPriceFontFamily || "Arial");
      });
    }
    if (!search || !select || !info) return;
    if (addBtn) addBtn.onclick = () => addCurrentProductToCatalog();
    const productsById = new Map((Array.isArray(products) ? products : []).map((p) => [String(p.id), p]));
    customEditorProductsById = productsById;
    const draftBridgeListeners = new Set();

    const getCurrentEditorSnapshot = () => {
      const previewProduct = getEffectivePreviewProduct() || currentPreviewProduct;
      if (!previewProduct) return null;
      const family = Array.isArray(currentFamilyProducts) ? currentFamilyProducts : [];
      const familyThumbUrl = family
        .map((item) => String(item?.url || "").trim())
        .find(Boolean) || "";
      const previewUrl = familyThumbUrl || getEffectivePreviewImageUrl() || currentPreviewImageUrl || "";
      const involved = new Set([String(previewProduct.id || "")]);
      family.forEach((item) => {
        const id = String(item?.product?.id || "");
        if (id) involved.add(id);
      });
      const nameOverrides = {};
      const indexOverrides = {};
      const priceOverrides = {};
      involved.forEach((id) => {
        if (customNameOverrides.has(id)) nameOverrides[id] = customNameOverrides.get(id);
        if (customIndexOverrides.has(id)) indexOverrides[id] = customIndexOverrides.get(id);
        if (customPriceOverrides.has(id)) priceOverrides[id] = customPriceOverrides.get(id);
      });
      return {
        id: `draft-${Date.now()}-${++customDraftModuleSeq}`,
        createdAt: Date.now(),
        productId: String(previewProduct.id || ""),
        productIndex: String(getDisplayIndex(previewProduct) || ""),
        productName: String(getDisplayName(previewProduct) || ""),
        previewImageUrl: String(previewUrl || ""),
        familyBaseProductId: String(familyBaseProduct?.id || ""),
        familyBaseImageUrl: String(familyBaseImageUrl || ""),
        familyProducts: family.map((item) => ({
          productId: String(item?.product?.id || ""),
          url: String(item?.url || "")
        })),
        nameOverrides,
        indexOverrides,
        priceOverrides,
        settings: {
          customModuleLayoutStyleId,
          customPriceCircleColor,
          customPriceBadgeStyleId,
          customPriceTextColor,
          customCurrencySymbol,
          customPriceTextScale,
          customMetaFontFamily,
          customMetaTextColor,
          customMetaTextBold,
          customMetaTextUnderline,
          customMetaTextAlign,
          customPriceFontFamily,
          customPriceTextBold,
          customPriceTextUnderline,
          customPriceTextAlign,
          customFamilySpacingTightness,
          showFlag: !!customPreviewVisibility.showFlag,
          showBarcode: !!customPreviewVisibility.showBarcode
        }
      };
    };
    customGetCurrentEditorSnapshot = getCurrentEditorSnapshot;

    const resolveProductImageUrlAsync = (product) => new Promise((resolve) => {
      resolveProductImageUrl(product, (url) => resolve(url || ""));
    });

    const buildDraftSettingsForImport = (rowMeta) => {
      const forceTnz = !!rowMeta?.tnz;
      return {
        customModuleLayoutStyleId: customModuleLayoutStyleId || "default",
        customPriceCircleColor: customPriceCircleColor || "#d71920",
        customPriceBadgeStyleId: forceTnz ? "kolko-czerwone-tnz" : (customPriceBadgeStyleId || "solid"),
        customPriceTextColor: customPriceTextColor || "#ffffff",
        customCurrencySymbol: customCurrencySymbol === "€" ? "€" : "£",
        customPriceTextScale: Number.isFinite(customPriceTextScale) ? customPriceTextScale : 1,
        customMetaFontFamily: normalizeFontOption(customMetaFontFamily, "Arial"),
        customMetaTextColor: customMetaTextColor || "#1f3560",
        customMetaTextBold: !!customMetaTextBold,
        customMetaTextUnderline: !!customMetaTextUnderline,
        customMetaTextAlign: normalizeAlignOption(customMetaTextAlign, "left"),
        customPriceFontFamily: normalizeFontOption(customPriceFontFamily, "Arial"),
        customPriceTextBold: !!customPriceTextBold,
        customPriceTextUnderline: !!customPriceTextUnderline,
        customPriceTextAlign: normalizeAlignOption(customPriceTextAlign, "left"),
        customFamilySpacingTightness: normalizeFamilySpacingTightness(customFamilySpacingTightness, 0.12),
        showFlag: !!customPreviewVisibility.showFlag,
        showBarcode: !!customPreviewVisibility.showBarcode
      };
    };

    const showExcelImportMessage = (message, type = "info") => {
      if (!excelImportStatus) return;
      const palette = (type === "error")
        ? { border: "#fecaca", bg: "#fef2f2", color: "#991b1b" }
        : (type === "success")
          ? { border: "#bbf7d0", bg: "#f0fdf4", color: "#166534" }
          : { border: "#d7dfec", bg: "#f8fafc", color: "#334155" };
      excelImportStatus.style.display = "block";
      excelImportStatus.style.borderColor = palette.border;
      excelImportStatus.style.background = palette.bg;
      excelImportStatus.style.color = palette.color;
      excelImportStatus.textContent = String(message || "");
    };

    const getProductByExcelIndex = (() => {
      const idxMap = new Map();
      (Array.isArray(products) ? products : []).forEach((p) => {
        const raw = String(p?.index || "").trim();
        if (!raw) return;
        const normA = normalizeImportIndex(raw);
        const normB = raw.replace(/\s+/g, "");
        if (normA && !idxMap.has(normA)) idxMap.set(normA, p);
        if (normB && !idxMap.has(normB)) idxMap.set(normB, p);
      });
      return (excelIndex) => {
        const keyA = normalizeImportIndex(excelIndex);
        const keyB = String(excelIndex || "").trim().replace(/\s+/g, "");
        return idxMap.get(keyA) || idxMap.get(keyB) || null;
      };
    })();

    const getProductsByImageIndex = (() => {
      const idxMap = new Map();
      (Array.isArray(products) ? products : []).forEach((p) => {
        const key = normalizeImportIndex(p?.index);
        if (!key) return;
        if (!idxMap.has(key)) idxMap.set(key, []);
        idxMap.get(key).push(p);
      });
      return (idx) => idxMap.get(normalizeImportIndex(idx)) || [];
    })();

    const buildImportedProductVariant = (baseProduct, row, seqNo) => {
      const base = baseProduct || {};
      const id = `imp-${String(base.id || "product")}-${Date.now()}-${seqNo}`;
      const nextNetto = row?.price ? String(row.price).trim() : String(base.netto || "").trim();
      const nextRaw = Object.assign({}, base.raw || {}, {
        IMPORT_BRAND: String(row?.brand || "").trim(),
        IMPORT_TNZ: String(row?.tnzRaw || "").trim(),
        IMPORT_GROUP: String(row?.groupRaw || "").trim()
      });
      return Object.assign({}, base, {
        id,
        netto: nextNetto || String(base.netto || "0.00"),
        raw: nextRaw,
        IMPORTED_BRAND: String(row?.brand || "").trim(),
        IMPORTED_GROUP_KEY: String(row?.groupKey || "").trim()
      });
    };

    const importDraftsFromExcelRows = async (rows) => {
      const parsedRows = Array.isArray(rows) ? rows.filter((r) => r && r.index) : [];
      if (!parsedRows.length) {
        showExcelImportMessage("Plik nie zawiera żadnych wierszy z kolumną Indeks.", "error");
        return;
      }
      showCustomImportProgress("Analiza pliku Excel...", 6);

      const missingIndexes = [];
      const matched = [];
      let importSeq = 0;
      parsedRows.forEach((row) => {
        const base = getProductByExcelIndex(row.index);
        if (!base) {
          missingIndexes.push(row.index);
          return;
        }
        importSeq += 1;
        const variant = buildImportedProductVariant(base, row, importSeq);
        productsById.set(String(variant.id), variant);
        matched.push({
          row,
          product: variant
        });
      });
      showCustomImportProgress("Dopasowano indeksy do bazy produktów...", 18);

      if (!matched.length) {
        hideCustomImportProgress();
        showExcelImportMessage("Nie znaleziono żadnego indeksu z Excela w bazie produktów.", "error");
        return;
      }

      const groupedMap = new Map();
      const singles = [];
      matched.forEach((item) => {
        const key = String(item?.row?.groupKey || "").trim();
        if (!key) {
          singles.push(item);
          return;
        }
        if (!groupedMap.has(key)) groupedMap.set(key, []);
        groupedMap.get(key).push(item);
      });
      showCustomImportProgress("Budowanie modułów roboczych...", 26);

      const sortedGroupKeys = Array.from(groupedMap.keys()).sort((a, b) =>
        String(a).localeCompare(String(b), "pl", { numeric: true, sensitivity: "base" })
      );

      const importTasks = [];
      singles.forEach((item) => {
        importTasks.push({
          kind: "single",
          product: item.product,
          row: item.row,
          cost: 1,
          progressLabel: "Importowanie produktów bez grupy..."
        });
      });

      for (const groupKey of sortedGroupKeys) {
        const items = groupedMap.get(groupKey) || [];
        if (items.length < 2) {
          const item = items[0];
          if (!item) continue;
          importTasks.push({
            kind: "single",
            product: item.product,
            row: item.row,
            cost: 1,
            progressLabel: "Importowanie grup rodzimych..."
          });
          continue;
        }

        const targetImageCount = items.length > 2 ? 3 : 2;
        const limitedItems = items.slice(0, targetImageCount);
        importTasks.push({
          kind: "group",
          groupKey,
          items: limitedItems,
          cost: limitedItems.length,
          progressLabel: "Importowanie grup rodzimych..."
        });
      }

      const existingDraftCount = Array.isArray(customDraftModules) ? customDraftModules.length : 0;
      const availableSlots = Math.max(0, CUSTOM_DRAFT_MODULE_LIMIT - existingDraftCount);
      if (!availableSlots) {
        hideCustomImportProgress();
        showExcelImportMessage(`Lista modułów roboczych osiągnęła limit ${CUSTOM_DRAFT_MODULE_LIMIT}. Usuń część pozycji i spróbuj ponownie.`, "error");
        return;
      }

      const skippedByLimit = Math.max(0, importTasks.length - availableSlots);
      const tasksToRun = importTasks.slice(0, availableSlots);
      const totalUnits = Math.max(
        1,
        tasksToRun.reduce((sum, task) => sum + Math.max(1, Number(task?.cost) || 1), 0)
      );
      let processedUnits = 0;
      let lastProgressPercent = -1;
      let lastProgressAt = 0;
      const tickProgress = (weight, label, force = false) => {
        processedUnits += Math.max(0, Number(weight) || 0);
        const ratio = Math.max(0, Math.min(1, processedUnits / totalUnits));
        const percent = 26 + (ratio * 66);
        const now = (typeof performance !== "undefined" && typeof performance.now === "function")
          ? performance.now()
          : Date.now();
        if (!force) {
          const percentDelta = Math.abs(percent - lastProgressPercent);
          const timeDelta = now - lastProgressAt;
          if (percentDelta < 0.9 && timeDelta < 70) return;
        }
        lastProgressPercent = percent;
        lastProgressAt = now;
        showCustomImportProgress(label || "Importowanie produktów...", percent);
      };

      const createdDrafts = (await mapWithConcurrencyLimit(
        tasksToRun,
        CUSTOM_IMPORT_CONCURRENCY,
        async (task) => {
          if (!task || !task.product && task.kind !== "group") return null;

          if (task.kind === "single") {
            const p = task.product;
            const url = await resolveProductImageUrlAsync(p);
            tickProgress(task.cost, task.progressLabel);
            return {
              id: `draft-${Date.now()}-${++customDraftModuleSeq}`,
              createdAt: Date.now(),
              productId: String(p.id || ""),
              productIndex: String(p.index || ""),
              productName: String(getDisplayName(p) || p.name || "-"),
              previewImageUrl: String(url || ""),
              familyBaseProductId: "",
              familyBaseImageUrl: "",
              familyProducts: [],
              nameOverrides: {},
              settings: buildDraftSettingsForImport(task.row),
              importMeta: {
                source: "excel",
                isNativeGroup: false,
                groupKey: "",
                groupLabel: "",
                brand: String(task?.row?.brand || "").trim(),
                tnz: !!task?.row?.tnz
              }
            };
          }

          if (task.kind === "group") {
            const itemsForGroup = Array.isArray(task.items) ? task.items : [];
            if (!itemsForGroup.length) {
              tickProgress(task.cost, task.progressLabel);
              return null;
            }

            const familyProducts = (await Promise.all(
              itemsForGroup.map(async (entry) => {
                const imgUrl = await resolveProductImageUrlAsync(entry.product);
                return {
                  productId: String(entry?.product?.id || ""),
                  url: String(imgUrl || "")
                };
              })
            )).filter(Boolean);

            const baseEntry = itemsForGroup[0];
            const baseProduct = baseEntry?.product || null;
            const firstUrl = String(familyProducts[0]?.url || "");
            const groupLabel = `Grupa rodzima ${task.groupKey}`;
            const hasTnz = itemsForGroup.some((it) => !!it?.row?.tnz);

            tickProgress(task.cost, task.progressLabel);
            return {
              id: `draft-${Date.now()}-${++customDraftModuleSeq}`,
              createdAt: Date.now(),
              productId: String(baseProduct?.id || ""),
              productIndex: String(baseProduct?.index || ""),
              productName: `${groupLabel} (${itemsForGroup.length})`,
              previewImageUrl: firstUrl,
              familyBaseProductId: String(baseProduct?.id || ""),
              familyBaseImageUrl: firstUrl,
              familyProducts,
              nameOverrides: {},
              settings: buildDraftSettingsForImport({ tnz: hasTnz }),
              importMeta: {
                source: "excel",
                isNativeGroup: true,
                groupKey: String(task.groupKey || ""),
                groupLabel,
                brand: String(baseEntry?.row?.brand || "").trim(),
                tnz: hasTnz
              }
            };
          }

          tickProgress(task.cost, task.progressLabel);
          return null;
        }
      )).filter(Boolean);

      if (!createdDrafts.length) {
        hideCustomImportProgress();
        showExcelImportMessage("Brak modułów do dodania po przetworzeniu Excela.", "error");
        return;
      }

      customDraftModules = [...createdDrafts, ...(Array.isArray(customDraftModules) ? customDraftModules : [])];
      customDraftModules = customDraftModules.slice(0, CUSTOM_DRAFT_MODULE_LIMIT);
      renderDraftModulesList();
      if (createdDrafts[0] && typeof restoreDraftToEditor === "function") {
        restoreDraftToEditor(createdDrafts[0], { silent: true });
      } else {
        storeCustomStyleEditorSnapshot();
      }
      showCustomImportProgress("Finalizowanie podglądu importu...", 100);
      await waitMs(120);
      hideCustomImportProgress();

      const missingCount = missingIndexes.length;
      const limitInfo = skippedByLimit
        ? ` Osiągnięto limit kolejki ${CUSTOM_DRAFT_MODULE_LIMIT}. Pominięto ${skippedByLimit} moduł(y).`
        : "";
      const summary = `Zaimportowano ${createdDrafts.length} moduł(y). Dopasowano indeksów: ${matched.length}.${missingCount ? ` Brak w bazie: ${missingCount}.` : ""}${limitInfo}`;
      showExcelImportMessage(summary, missingCount ? "info" : "success");
      if (typeof window.showAppToast === "function") {
        window.showAppToast(summary, missingCount ? "info" : "success");
      }
    };

    const applyAllControlValuesFromState = () => {
      if (showFlagToggleMark) applyToggleMark(showFlagToggleMark, !!customPreviewVisibility.showFlag);
      if (showBarcodeToggleMark) applyToggleMark(showBarcodeToggleMark, !!customPreviewVisibility.showBarcode);
      if (priceColorInput) priceColorInput.value = customPriceCircleColor || "#d71920";
      if (moduleLayoutSelect) moduleLayoutSelect.value = customModuleLayoutStyleId || "default";
      if (priceStyleSelect) priceStyleSelect.value = customPriceBadgeStyleId || "solid";
      if (priceTextColorInput) priceTextColorInput.value = customPriceTextColor || "#ffffff";
      if (currencySelect) currencySelect.value = customCurrencySymbol === "€" ? "€" : "£";
      if (priceSizeValue) priceSizeValue.textContent = `${Math.round((Number(customPriceTextScale) || 1) * 100)}%`;
      if (metaFontSelect) metaFontSelect.value = normalizeFontOption(customMetaFontFamily, "Arial");
      if (metaTextColorInput) metaTextColorInput.value = customMetaTextColor || "#1f3560";
      if (metaBoldToggle) applyMiniToggleButton(metaBoldToggle, !!customMetaTextBold);
      if (metaUnderlineToggle) applyMiniToggleButton(metaUnderlineToggle, !!customMetaTextUnderline);
      if (metaAlignSelect) metaAlignSelect.value = normalizeAlignOption(customMetaTextAlign, "left");
      if (priceFontSelect) priceFontSelect.value = normalizeFontOption(customPriceFontFamily, "Arial");
      if (priceBoldToggle) applyMiniToggleButton(priceBoldToggle, !!customPriceTextBold);
      if (priceUnderlineToggle) applyMiniToggleButton(priceUnderlineToggle, !!customPriceTextUnderline);
      if (priceAlignSelect) priceAlignSelect.value = normalizeAlignOption(customPriceTextAlign, "left");
      if (familySpacingSelect) {
        const v = normalizeFamilySpacingTightness(customFamilySpacingTightness, 0.12);
        familySpacingSelect.value = String(v);
      }
    };

    const renderDraftModulesList = () => {
      if (!draftListEl) return;
      if (!Array.isArray(customDraftModules) || !customDraftModules.length) {
        draftListEl.innerHTML = `<div style="font-size:10px;color:#64748b;">Brak zapisanych modułów roboczych.</div>`;
        draftBridgeListeners.forEach((fn) => {
          try { fn([]); } catch (_err) {}
        });
        return;
      }
      draftListEl.innerHTML = customDraftModules.map((draft, idx) => {
        const p = productsById.get(String(draft.productId || ""));
        const title = escapeHtml(String(draft.productName || ((p && getDisplayName(p)) || `Produkt ${idx + 1}`)));
        const index = escapeHtml(String(draft.productIndex || p?.index || "-"));
        const familyThumb = (Array.isArray(draft.familyProducts) ? draft.familyProducts : [])
          .map((item) => String(item?.url || "").trim())
          .find(Boolean);
        const thumb = escapeHtml(String(familyThumb || draft.previewImageUrl || ""));
        const familyCount = Math.max(1, Array.isArray(draft.familyProducts) ? draft.familyProducts.length : 1);
        const familyThumbs = (Array.isArray(draft.familyProducts) ? draft.familyProducts : [])
          .map((item) => String(item?.url || "").trim())
          .filter(Boolean)
          .slice(0, 4);
        const thumbMarkup = familyThumbs.length > 1
          ? `<div style="width:68px;height:48px;border:1px solid #dbe4ef;border-radius:6px;background:#fff;padding:2px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:2px;box-sizing:border-box;overflow:hidden;">
              ${familyThumbs.map((src) => `<div style="border:1px solid #eef2f7;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;"><img src="${escapeHtml(src)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;"></div>`).join("")}
            </div>`
          : `<div style="width:68px;height:48px;border:1px solid #dbe4ef;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">
              ${thumb ? `<img src="${thumb}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;">` : `<span style="font-size:9px;color:#94a3b8;">brak</span>`}
            </div>`;
        const metaFont = escapeHtml(String(draft.settings?.customMetaFontFamily || "Arial"));
        const priceFont = escapeHtml(String(draft.settings?.customPriceFontFamily || "Arial"));
        const metaAlign = escapeHtml(String(draft.settings?.customMetaTextAlign || "left"));
        const priceAlign = escapeHtml(String(draft.settings?.customPriceTextAlign || "left"));
        const curr = escapeHtml(String(draft.settings?.customCurrencySymbol || "£"));
        const styleName = escapeHtml((PRICE_BADGE_STYLE_OPTIONS.find((o) => o.id === draft.settings?.customPriceBadgeStyleId)?.label) || "Kolor koła");
        const isGroupedImport = !!(draft?.importMeta?.source === "excel" && draft?.importMeta?.isNativeGroup);
        const isSingleImport = !!(draft?.importMeta?.source === "excel" && !draft?.importMeta?.isNativeGroup);
        const isTnzImport = !!(draft?.importMeta?.tnz || String(draft?.settings?.customPriceBadgeStyleId || "").includes("tnz"));
        const cardBg = isTnzImport ? "#f5f3ff" : (isGroupedImport ? "#fff1f4" : (isSingleImport ? "#ecfdf3" : "#f8fafc"));
        const cardBorder = isTnzImport ? "#a78bfa" : (isGroupedImport ? "#f9a8d4" : (isSingleImport ? "#86efac" : "#e2e8f0"));
        const groupLabel = isGroupedImport
          ? escapeHtml(String(draft?.importMeta?.groupLabel || "Grupa rodzima"))
          : "";
        return `
          <div data-draft-id="${escapeHtml(draft.id)}" style="display:grid;grid-template-columns:68px 1fr auto;gap:8px;align-items:start;border:1px solid ${cardBorder};border-radius:8px;padding:6px;background:${cardBg};">
            ${thumbMarkup}
            <div style="min-width:0;">
              <div style="font-size:10px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">[${index}] ${title}</div>
              ${groupLabel ? `<div style="font-size:9px;font-weight:700;color:#9d174d;margin-top:2px;">${groupLabel}</div>` : ``}
              <div style="font-size:9px;color:#475569;margin-top:2px;">Rodzina: ${familyCount} • Waluta: ${curr} • Cena: ${styleName}</div>
              <div style="font-size:9px;color:#64748b;margin-top:2px;">Teksty: ${metaFont}, ${metaAlign}${draft.settings?.customMetaTextBold ? ", B" : ""}${draft.settings?.customMetaTextUnderline ? ", U" : ""}</div>
              <div style="font-size:9px;color:#64748b;">Cena: ${priceFont}, ${priceAlign}${draft.settings?.customPriceTextBold ? ", B" : ""}${draft.settings?.customPriceTextUnderline ? ", U" : ""}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <button data-action="edit" type="button" style="border:1px solid #0b8f84;background:#f0fdfa;color:#0b8f84;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;">Edytuj</button>
              <button data-action="delete" type="button" style="border:1px solid #e2e8f0;background:#fff;color:#64748b;border-radius:6px;padding:4px 8px;font-size:10px;cursor:pointer;">Usuń</button>
            </div>
          </div>
        `;
      }).join("");
      draftBridgeListeners.forEach((fn) => {
        try { fn((customDraftModules || []).slice()); } catch (_err) {}
      });
    };

    const restoreDraftToEditor = (draft, options = {}) => {
      const silent = !!options.silent;
      if (!draft) return;
      const s = draft.settings || {};
      customPriceCircleColor = String(s.customPriceCircleColor || customPriceCircleColor || "#d71920");
      customModuleLayoutStyleId = String(s.customModuleLayoutStyleId || customModuleLayoutStyleId || "default");
      customPriceBadgeStyleId = String(s.customPriceBadgeStyleId || customPriceBadgeStyleId || "solid");
      customPriceTextColor = String(s.customPriceTextColor || customPriceTextColor || "#ffffff");
      customCurrencySymbol = String(s.customCurrencySymbol || customCurrencySymbol || "£") === "€" ? "€" : "£";
      customPriceTextScale = Number.isFinite(Number(s.customPriceTextScale)) ? Number(s.customPriceTextScale) : (customPriceTextScale || 1);
      customMetaFontFamily = normalizeFontOption(s.customMetaFontFamily || customMetaFontFamily, "Arial");
      customMetaTextColor = String(s.customMetaTextColor || customMetaTextColor || "#1f3560");
      customMetaTextBold = !!s.customMetaTextBold;
      customMetaTextUnderline = !!s.customMetaTextUnderline;
      customMetaTextAlign = normalizeAlignOption(s.customMetaTextAlign || customMetaTextAlign, "left");
      customPriceFontFamily = normalizeFontOption(s.customPriceFontFamily || customPriceFontFamily, "Arial");
      customPriceTextBold = !!s.customPriceTextBold;
      customPriceTextUnderline = !!s.customPriceTextUnderline;
      customPriceTextAlign = normalizeAlignOption(s.customPriceTextAlign || customPriceTextAlign, "left");
      customFamilySpacingTightness = normalizeFamilySpacingTightness(s.customFamilySpacingTightness, customFamilySpacingTightness);
      customPreviewVisibility.showFlag = !!s.showFlag;
      customPreviewVisibility.showBarcode = !!s.showBarcode;
      customNameOverrides.clear();
      customIndexOverrides.clear();
      customPriceOverrides.clear();
      Object.entries(draft.nameOverrides || {}).forEach(([id, value]) => {
        if (id) customNameOverrides.set(String(id), String(value || ""));
      });
      Object.entries(draft.indexOverrides || {}).forEach(([id, value]) => {
        if (id) customIndexOverrides.set(String(id), String(value || ""));
      });
      Object.entries(draft.priceOverrides || {}).forEach(([id, value]) => {
        if (id) customPriceOverrides.set(String(id), normalizeEditablePriceValue(value) || String(value || ""));
      });

      const baseProduct = productsById.get(String(draft.familyBaseProductId || "")) || null;
      familyBaseProduct = baseProduct;
      familyBaseImageUrl = String(draft.familyBaseImageUrl || "");
      currentFamilyProducts = (Array.isArray(draft.familyProducts) ? draft.familyProducts : [])
        .map((item) => ({
          product: productsById.get(String(item?.productId || "")) || null,
          url: String(item?.url || "")
        }))
        .filter((item) => item.product);

      const targetProduct = productsById.get(String(draft.productId || "")) || null;
      currentPreviewProduct = targetProduct;
      currentPickerProduct = targetProduct;
      currentPreviewImageUrl = String(draft.previewImageUrl || "");
      currentPickerImageUrl = currentPreviewImageUrl;
      if (targetProduct && currentPreviewImageUrl) {
        customResolvedImageUrls.set(String(targetProduct.id), currentPreviewImageUrl);
      }
      if (select && targetProduct) select.value = String(targetProduct.id);
      updateInfo(info, targetProduct, products.length, products.length, Number.isFinite(rendered?.length) ? rendered.length : products.length);
      bindEditableName(targetProduct);
      applyAllControlValuesFromState();
      updateFamilyUiStatus("Wczytano moduł roboczy do edycji.", "success");
      if (targetProduct) renderProductImagePreview(targetProduct);
      renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      storeCustomStyleEditorSnapshot(getCurrentEditorSnapshot());
      if (!silent && typeof window.showAppToast === "function") window.showAppToast("Wczytano moduł roboczy do podglądu.", "success");
    };
    customRestoreDraftToEditor = restoreDraftToEditor;

    if (saveDraftBtn) {
      saveDraftBtn.onclick = () => {
        const snap = getCurrentEditorSnapshot();
        if (!snap) {
          if (typeof window.showAppToast === "function") window.showAppToast("Najpierw wybierz produkt do podglądu.", "error");
          return;
        }
        customDraftModules = Array.isArray(customDraftModules) ? customDraftModules.slice() : [];
        customDraftModules.unshift(snap);
        customDraftModules = customDraftModules.slice(0, 24);
        storeCustomStyleEditorSnapshot(snap);
        renderDraftModulesList();
        if (typeof window.showAppToast === "function") window.showAppToast("Dodano moduł do listy roboczej.", "success");
      };
    }
    if (openDraftTrayBtn) {
      openDraftTrayBtn.onclick = () => {
        storeCustomStyleEditorSnapshot(getCurrentEditorSnapshot());
        ensureStylWlasnyHelperScriptLoaded();
        const modal = document.getElementById("customStyleModal");
        if (modal) modal.style.display = "none";
        if (window.CustomStyleDraftTrayUI && typeof window.CustomStyleDraftTrayUI.open === "function") {
          window.CustomStyleDraftTrayUI.open();
        } else {
          window.dispatchEvent(new CustomEvent("customStyleDraftTrayOpenRequest"));
        }
      };
    }
    if (applyStyleToImportedBtn) {
      applyStyleToImportedBtn.onclick = () => {
        const nextStyle = String(customModuleLayoutStyleId || "default");
        let changed = 0;
        customDraftModules = (Array.isArray(customDraftModules) ? customDraftModules : []).map((draft) => {
          if (!(draft?.importMeta?.source === "excel")) return draft;
          const prev = String(draft?.settings?.customModuleLayoutStyleId || "default");
          if (prev === nextStyle) return draft;
          changed += 1;
          return {
            ...draft,
            settings: {
              ...(draft.settings || {}),
              customModuleLayoutStyleId: nextStyle
            }
          };
        });
        renderDraftModulesList();
        if (typeof window.showAppToast === "function") {
          window.showAppToast(
            changed
              ? `Zmieniono styl modułu dla ${changed} zaimportowanych pozycji.`
              : "Wszystkie zaimportowane pozycje mają już wybrany styl.",
            "success"
          );
        }
      };
    }
    if (excelImportBtn && excelImportInput) {
      excelImportBtn.onclick = () => {
        excelImportInput.value = "";
        excelImportInput.click();
      };
      excelImportInput.onchange = async () => {
        const file = excelImportInput.files && excelImportInput.files[0];
        if (!file) return;
        try {
          showExcelImportMessage(`Wczytywanie pliku: ${file.name}...`, "info");
          const parsedRows = await parseCustomStyleExcelRows(file);
          await importDraftsFromExcelRows(parsedRows);
        } catch (err) {
          hideCustomImportProgress();
          const msg = `Błąd importu Excela: ${String(err && err.message ? err.message : err)}`;
          showExcelImportMessage(msg, "error");
          if (typeof window.showAppToast === "function") window.showAppToast(msg, "error");
        } finally {
          excelImportInput.value = "";
        }
      };
    }
    if (bulkImageImportBtn && bulkImageImportInput) {
      bulkImageImportBtn.onclick = () => {
        bulkImageImportInput.value = "";
        bulkImageImportInput.click();
      };
      bulkImageImportInput.onchange = async () => {
        const files = Array.from(bulkImageImportInput.files || []);
        if (!files.length) return;
        let matchedFiles = 0;
        let mappedProducts = 0;
        let failedReads = 0;
        const indexToDataUrl = new Map();
        showCustomImportProgress("Import zdjęć: przygotowanie...", 4);
        try {
          for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            const progress = 6 + ((i / Math.max(1, files.length)) * 82);
            showCustomImportProgress(`Import zdjęć: ${file.name}`, progress);
            const candidates = getImageIndexCandidatesFromFileName(file.name);
            if (!candidates.length) continue;
            let matched = false;
            for (const candidate of candidates) {
              const productList = getProductsByImageIndex(candidate);
              if (!productList.length) continue;
              let dataUrl = indexToDataUrl.get(candidate) || "";
              if (!dataUrl) {
                try {
                  dataUrl = await readFileAsDataUrl(file);
                } catch (_err) {
                  failedReads += 1;
                  dataUrl = "";
                }
                if (!dataUrl) break;
                indexToDataUrl.set(candidate, dataUrl);
              }
              productList.forEach((p) => {
                if (!p?.id) return;
                customImageOverrides.set(String(p.id), dataUrl);
                customResolvedImageUrls.set(String(p.id), dataUrl);
                mappedProducts += 1;
              });
              matched = true;
              matchedFiles += 1;
              break;
            }
            if (!matched) {
              // plik bez dopasowania po indeksie
            }
          }

          // Synchronizacja dla już utworzonych wariantów/draftów (id z importu excel).
          if (indexToDataUrl.size) {
            for (const p of productsById.values()) {
              const key = normalizeImportIndex(p?.index);
              if (!key) continue;
              const dataUrl = indexToDataUrl.get(key) || "";
              if (!dataUrl || !p?.id) continue;
              customImageOverrides.set(String(p.id), dataUrl);
              customResolvedImageUrls.set(String(p.id), dataUrl);
            }
            customDraftModules = (Array.isArray(customDraftModules) ? customDraftModules : []).map((draft) => {
              const productId = String(draft?.productId || "");
              const product = productsById.get(productId);
              const key = normalizeImportIndex(product?.index || draft?.productIndex);
              const mainUrl = key ? (indexToDataUrl.get(key) || "") : "";
              const nextFamily = (Array.isArray(draft?.familyProducts) ? draft.familyProducts : []).map((fp) => {
                const fpProd = productsById.get(String(fp?.productId || ""));
                const fpKey = normalizeImportIndex(fpProd?.index);
                const fpUrl = fpKey ? (indexToDataUrl.get(fpKey) || "") : "";
                return fpUrl ? { ...fp, url: fpUrl } : fp;
              });
              if (!mainUrl && (!nextFamily.length || nextFamily === draft.familyProducts)) return draft;
              return {
                ...draft,
                previewImageUrl: mainUrl || String(draft?.previewImageUrl || ""),
                familyBaseImageUrl: mainUrl || String(draft?.familyBaseImageUrl || ""),
                familyProducts: nextFamily
              };
            });
            renderDraftModulesList();
          }

          if (currentPreviewProduct) {
            renderProductImagePreview(currentPreviewProduct);
          }
          showCustomImportProgress("Import zdjęć zakończony.", 100);
          await waitMs(180);
          hideCustomImportProgress();
          const summary = `Import zdjęć: dopasowano plików ${matchedFiles}/${files.length}, przypięto zdjęć do produktów: ${mappedProducts}.${failedReads ? ` Błędy odczytu: ${failedReads}.` : ""}`;
          showExcelImportMessage(summary, matchedFiles ? "success" : "info");
          if (typeof window.showAppToast === "function") window.showAppToast(summary, matchedFiles ? "success" : "info");
        } catch (err) {
          hideCustomImportProgress();
          const msg = `Błąd importu zdjęć: ${String(err && err.message ? err.message : err)}`;
          showExcelImportMessage(msg, "error");
          if (typeof window.showAppToast === "function") window.showAppToast(msg, "error");
        } finally {
          bulkImageImportInput.value = "";
        }
      };
    }

    const placeDraftSnapshotDirectToPage = async (draftId, payload = {}) => {
      const draft = (Array.isArray(customDraftModules) ? customDraftModules : []).find((d) => String(d?.id || "") === String(draftId || ""));
      if (!draft) return { ok: false, error: "draft_not_found" };
      const stageRef = payload.stage || null;
      const page = (Array.isArray(window.pages) ? window.pages : []).find((p) => p && (p.stage === stageRef || p.number === payload.pageNumber)) || getActiveCatalogPage();
      const pointer = payload.pointer && Number.isFinite(payload.pointer.x) && Number.isFinite(payload.pointer.y) ? payload.pointer : null;
      if (!page || !page.stage || !page.layer || !pointer) return { ok: false, error: "page_or_pointer_missing" };

      restoreDraftToEditor(draft);
      const product = currentPreviewProduct;
      if (!product) return { ok: false, error: "product_restore_failed" };

      if (!Array.isArray(page.products)) page.products = [];
      if (!Array.isArray(page.slotObjects)) page.slotObjects = [];
      const occupiedSlots = new Set();
      page.products.forEach((p, i) => { if (p) occupiedSlots.add(i); });
      page.slotObjects.forEach((o, i) => { if (o) occupiedSlots.add(i); });
      if (page.layer && typeof page.layer.find === "function") {
        page.layer.find((n) => n && n.getAttr).forEach((n) => {
          const si = Number(n.getAttr("slotIndex"));
          const psi = Number(n.getAttr("preservedSlotIndex"));
          if (Number.isFinite(si) && si >= 0) occupiedSlots.add(si);
          if (Number.isFinite(psi) && psi >= 0) occupiedSlots.add(psi);
        });
      }
      let slotIndex = page.products.length;
      if (occupiedSlots.size) slotIndex = Math.max(slotIndex, Math.max(...Array.from(occupiedSlots)) + 1);
      while (occupiedSlots.has(slotIndex) || page.products[slotIndex]) slotIndex += 1;

      const family = Array.isArray(currentFamilyProducts) ? currentFamilyProducts : [];
      const familyImageUrls = family.map((item) => String(item?.url || "").trim()).filter(Boolean);
      const effectiveImageUrl = getEffectivePreviewImageUrl();
      const preloadTargets = familyImageUrls.length > 1 ? familyImageUrls : [effectiveImageUrl].filter(Boolean);
      await Promise.allSettled([preloadImageUrls(preloadTargets, 1400), waitMs(80)]);

      const catalogEntry = buildCatalogProductFromCustom(product);
      page.products[slotIndex] = catalogEntry;
      page.slotObjects[slotIndex] = null;

      const added = await addDirectCustomModuleToPage(page, slotIndex, pointer, catalogEntry, {
        effectiveImageUrl
      });
      if (!added) return { ok: false, error: "direct_add_failed" };

      document.activeStage = page.stage;
      window.dispatchEvent(new CustomEvent("canvasModified", { detail: page.stage }));
      window.projectOpen = true;
      window.projectDirty = true;

      customDraftModules = (Array.isArray(customDraftModules) ? customDraftModules : []).filter((d) => String(d?.id || "") !== String(draftId || ""));
      renderDraftModulesList();
      if (typeof window.showAppToast === "function") window.showAppToast("Przeciągnięto moduł na stronę katalogu.", "success");
      return { ok: true, slotIndex };
    };

    window.CustomStyleDraftBridge = {
      getDrafts: () => (Array.isArray(customDraftModules) ? customDraftModules.slice() : []),
      subscribe(listener) {
        if (typeof listener !== "function") return () => {};
        draftBridgeListeners.add(listener);
        try { listener((customDraftModules || []).slice()); } catch (_err) {}
        return () => draftBridgeListeners.delete(listener);
      },
      openDraftInEditor: (draftId) => {
        const draft = (Array.isArray(customDraftModules) ? customDraftModules : []).find((d) => String(d?.id || "") === String(draftId || ""));
        if (!draft) return false;
        const modal = document.getElementById("customStyleModal");
        if (modal) modal.style.display = "flex";
        if (window.CustomStyleDraftTrayUI && typeof window.CustomStyleDraftTrayUI.close === "function") {
          try { window.CustomStyleDraftTrayUI.close(); } catch (_err) {}
        }
        restoreDraftToEditor(draft);
        return true;
      },
      removeDraft: (draftId) => {
        const before = Array.isArray(customDraftModules) ? customDraftModules.length : 0;
        customDraftModules = (Array.isArray(customDraftModules) ? customDraftModules : []).filter((d) => String(d?.id || "") !== String(draftId || ""));
        renderDraftModulesList();
        return (customDraftModules.length !== before);
      },
      dropDraftToPage: placeDraftSnapshotDirectToPage,
      requestOpenTray: () => {
        if (window.CustomStyleDraftTrayUI && typeof window.CustomStyleDraftTrayUI.open === "function") window.CustomStyleDraftTrayUI.open();
      }
    };
    if (draftListEl) {
      draftListEl.onclick = (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("button[data-action]") : null;
        const row = e.target && e.target.closest ? e.target.closest("[data-draft-id]") : null;
        if (!btn || !row) return;
        const id = String(row.getAttribute("data-draft-id") || "");
        if (!id) return;
        const draft = (Array.isArray(customDraftModules) ? customDraftModules : []).find((d) => String(d?.id || "") === id);
        if (!draft) return;
        const action = String(btn.getAttribute("data-action") || "");
        if (action === "edit") {
          restoreDraftToEditor(draft);
          return;
        }
        if (action === "delete") {
          customDraftModules = (Array.isArray(customDraftModules) ? customDraftModules : []).filter((d) => String(d?.id || "") !== id);
          renderDraftModulesList();
        }
      };
    }
    renderDraftModulesList();
    if (info) {
      info.onclick = (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("#customImportImageBtn") : null;
        if (!btn || !imageUploadInput) return;
        if (!currentPreviewProduct) return;
        imageUploadInput.dataset.productId = currentPreviewProduct.id;
        imageUploadInput.value = "";
        imageUploadInput.click();
      };
    }
    if (imageUploadInput) {
      imageUploadInput.onchange = () => {
        const file = imageUploadInput.files && imageUploadInput.files[0];
        if (!file) return;
        const targetId = imageUploadInput.dataset.productId || currentPreviewProduct?.id || "";
        if (!targetId) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          if (!dataUrl.startsWith("data:image/")) return;
          customImageOverrides.set(targetId, dataUrl);
          const targetProduct = products.find((p) => p.id === targetId) || currentPreviewProduct;
          if (targetProduct) {
            currentPreviewProduct = targetProduct;
            renderProductImagePreview(targetProduct);
          }
        };
        reader.readAsDataURL(file);
      };
    }
    const applyToggleMark = (markEl, enabled) => {
      if (!markEl) return;
      markEl.textContent = enabled ? "✓" : "✕";
      markEl.style.color = enabled ? "#0b8f84" : "#b91c1c";
      markEl.style.borderColor = enabled ? "#0b8f84" : "#b91c1c";
    };
    const applyMiniToggleButton = (btn, enabled) => {
      if (!btn) return;
      btn.style.borderColor = enabled ? "#0b8f84" : "#d7dfec";
      btn.style.background = enabled ? "#f0fdfa" : "#fff";
      btn.style.color = enabled ? "#0b8f84" : "#0f172a";
    };
    if (showFlagToggle) {
      applyToggleMark(showFlagToggleMark, !!customPreviewVisibility.showFlag);
      showFlagToggle.onclick = () => {
        customPreviewVisibility.showFlag = !customPreviewVisibility.showFlag;
        applyToggleMark(showFlagToggleMark, !!customPreviewVisibility.showFlag);
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (showBarcodeToggle) {
      applyToggleMark(showBarcodeToggleMark, !!customPreviewVisibility.showBarcode);
      showBarcodeToggle.onclick = () => {
        customPreviewVisibility.showBarcode = !customPreviewVisibility.showBarcode;
        applyToggleMark(showBarcodeToggleMark, !!customPreviewVisibility.showBarcode);
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (priceColorInput) {
      priceColorInput.value = customPriceCircleColor || "#d71920";
      priceColorInput.oninput = () => {
        customPriceCircleColor = priceColorInput.value || "#d71920";
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (moduleLayoutSelect) {
      moduleLayoutSelect.value = customModuleLayoutStyleId || "default";
      moduleLayoutSelect.onchange = () => {
        customModuleLayoutStyleId = String(moduleLayoutSelect.value || "default");
        const styleMeta = getSelectedModuleLayoutStyleMeta(customModuleLayoutStyleId);
        const preset = getStyleFontPreset(customModuleLayoutStyleId);
        customMetaFontFamily = normalizeFontOption(preset.meta, customMetaFontFamily || DEFAULT_STYLE_FONT_PRESET.meta);
        customPriceFontFamily = normalizeFontOption(preset.price, customPriceFontFamily || DEFAULT_STYLE_FONT_PRESET.price);
        if (metaFontSelect) refreshFontSelectOptions(metaFontSelect, customMetaFontFamily);
        if (priceFontSelect) refreshFontSelectOptions(priceFontSelect, customPriceFontFamily);
        if (customModuleLayoutStyleId === "styl-numer-2") {
          const suggestedBg = String(styleMeta?.config?.text?.priceBgColor || "").trim();
          if (suggestedBg) {
            customPriceCircleColor = suggestedBg;
            if (priceColorInput) priceColorInput.value = suggestedBg;
          }
        }
        const suggestedText = String(styleMeta?.config?.text?.priceColor || "").trim();
        if (suggestedText) {
          customPriceTextColor = suggestedText;
          if (priceTextColorInput) priceTextColorInput.value = suggestedText;
        }
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (priceStyleSelect) {
      priceStyleSelect.value = customPriceBadgeStyleId || "solid";
      priceStyleSelect.onchange = () => {
        customPriceBadgeStyleId = String(priceStyleSelect.value || "solid");
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (priceTextColorInput) {
      priceTextColorInput.value = customPriceTextColor || "#ffffff";
      priceTextColorInput.oninput = () => {
        customPriceTextColor = priceTextColorInput.value || "#ffffff";
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (metaFontSelect) {
      refreshFontSelectOptions(metaFontSelect, normalizeFontOption(customMetaFontFamily, "Arial"));
      metaFontSelect.onchange = () => {
        customMetaFontFamily = normalizeFontOption(metaFontSelect.value, "Arial");
        applyFontPreviewToSelect(metaFontSelect, "Arial");
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (metaTextColorInput) {
      metaTextColorInput.value = customMetaTextColor || "#1f3560";
      metaTextColorInput.oninput = () => {
        customMetaTextColor = metaTextColorInput.value || "#1f3560";
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (metaBoldToggle) {
      applyMiniToggleButton(metaBoldToggle, !!customMetaTextBold);
      metaBoldToggle.onclick = () => {
        customMetaTextBold = !customMetaTextBold;
        applyMiniToggleButton(metaBoldToggle, !!customMetaTextBold);
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (metaUnderlineToggle) {
      applyMiniToggleButton(metaUnderlineToggle, !!customMetaTextUnderline);
      metaUnderlineToggle.onclick = () => {
        customMetaTextUnderline = !customMetaTextUnderline;
        applyMiniToggleButton(metaUnderlineToggle, !!customMetaTextUnderline);
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (metaAlignSelect) {
      metaAlignSelect.value = normalizeAlignOption(customMetaTextAlign, "left");
      metaAlignSelect.onchange = () => {
        customMetaTextAlign = normalizeAlignOption(metaAlignSelect.value, "left");
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (priceFontSelect) {
      refreshFontSelectOptions(priceFontSelect, normalizeFontOption(customPriceFontFamily, "Arial"));
      priceFontSelect.onchange = () => {
        customPriceFontFamily = normalizeFontOption(priceFontSelect.value, "Arial");
        applyFontPreviewToSelect(priceFontSelect, "Arial");
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (priceBoldToggle) {
      applyMiniToggleButton(priceBoldToggle, !!customPriceTextBold);
      priceBoldToggle.onclick = () => {
        customPriceTextBold = !customPriceTextBold;
        applyMiniToggleButton(priceBoldToggle, !!customPriceTextBold);
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (priceUnderlineToggle) {
      applyMiniToggleButton(priceUnderlineToggle, !!customPriceTextUnderline);
      priceUnderlineToggle.onclick = () => {
        customPriceTextUnderline = !customPriceTextUnderline;
        applyMiniToggleButton(priceUnderlineToggle, !!customPriceTextUnderline);
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (priceAlignSelect) {
      priceAlignSelect.value = normalizeAlignOption(customPriceTextAlign, "left");
      priceAlignSelect.onchange = () => {
        customPriceTextAlign = normalizeAlignOption(priceAlignSelect.value, "left");
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (familySpacingSelect) {
      familySpacingSelect.value = String(normalizeFamilySpacingTightness(customFamilySpacingTightness, 0.12));
      familySpacingSelect.onchange = () => {
        customFamilySpacingTightness = normalizeFamilySpacingTightness(familySpacingSelect.value, 0.12);
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    if (currencySelect) {
      currencySelect.value = customCurrencySymbol === "€" ? "€" : "£";
      currencySelect.onchange = () => {
        customCurrencySymbol = String(currencySelect.value || "£").trim() === "€" ? "€" : "£";
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      };
    }
    const setPriceScale = (next) => {
      const rounded = Math.round(next * 100) / 100;
      customPriceTextScale = Math.max(0.6, Math.min(1.8, rounded));
      if (priceSizeValue) priceSizeValue.textContent = `${Math.round(customPriceTextScale * 100)}%`;
      renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
    };
    if (priceSizeValue) priceSizeValue.textContent = `${Math.round(customPriceTextScale * 100)}%`;
    if (priceSizeMinusBtn) priceSizeMinusBtn.onclick = () => setPriceScale(customPriceTextScale - 0.05);
    if (priceSizePlusBtn) priceSizePlusBtn.onclick = () => setPriceScale(customPriceTextScale + 0.05);
    updateFamilyUiStatus();
    if (addFamilyProductBtn) {
      addFamilyProductBtn.onclick = () => {
        if (!currentPreviewProduct) return;
        if (!familyBaseProduct) {
          ensureBaseFamilyState();
          updateFamilyUiStatus(`Ustawiono bazę rodziny: ${currentPreviewProduct?.index || "-"}. Wybierz inny produkt i kliknij ponownie.`, "success");
          renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
          if (typeof window.showAppToast === "function") {
            window.showAppToast("Ustawiono produkt bazowy rodziny. Wybierz inny produkt i kliknij ponownie.", "success");
          }
          return;
        }
        const picked = currentPreviewProduct;
        if (familyBaseProduct && picked.id === familyBaseProduct.id) {
          updateFamilyUiStatus("Ten sam produkt jest już bazą rodziny. Wybierz inny produkt z listy.", "error");
          if (typeof window.showAppToast === "function") {
            window.showAppToast("Wybierz inny produkt, aby dodać go do rodziny.", "error");
          }
          return;
        }
        resolveProductImageUrl(picked, (url) => {
          const family = Array.isArray(currentFamilyProducts) ? currentFamilyProducts.slice() : [];
          const exists = family.some((item) => item && item.product && item.product.id === picked.id);
          if (exists) {
            updateFamilyUiStatus(`Produkt ${picked.index || ""} jest już dodany do rodziny.`, "error");
            if (typeof window.showAppToast === "function") {
              window.showAppToast("Ten produkt jest już dodany do rodziny.", "error");
            }
            return;
          }
          family.push({ product: picked, url: url || null });
          currentFamilyProducts = family;
          updateFamilyUiStatus(`Dodano do rodziny: ${picked.index || "-"}.`, "success");
          renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
        });
      };
    }

    let filtered = products.slice();
    let rendered = filtered.slice();
    let debounceTimer = null;

    const applyFilter = () => {
      const q = String(search.value || "");
      const ranked = rankAndFilter(products, q);
      rendered = ranked.map((r) => r.p);
      filtered = normalizeText(q) ? products.filter((p) => {
        const qq = normalizeText(q);
        return p.nameNorm.includes(qq) || p.indexNorm.includes(qq);
      }) : products.slice();

      renderSelect(select, rendered);

      const selected = rendered[0] || null;
      if (selected) select.value = selected.id;
      updateInfo(info, selected, products.length, filtered.length, rendered.length);
      bindEditableName(selected);
      currentPreviewProduct = selected || null;
      currentPickerProduct = selected || null;
      currentPickerImageUrl = currentPreviewImageUrl;
      updateFamilyUiStatus(
        familyBaseProduct
          ? `Wybrany produkt: ${selected?.index || "-"}. Kliknij "Dodaj do rodziny", aby dodać go do aktywnej rodziny.`
          : "Kliknij przycisk, aby ustawić wybrany produkt jako bazę rodziny.",
        "info"
      );
      if (!familyBaseProduct) {
        renderModulePreview(currentPreviewProduct, currentPreviewImageUrl);
      } else {
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      }
      if (selected) renderProductImagePreview(selected);
      else storeCustomStyleEditorSnapshot();
    };

    const onSelectChange = () => {
      const id = select.value;
      const selected = rendered.find((p) => p.id === id) || rendered[0] || null;
      updateInfo(info, selected, products.length, filtered.length, rendered.length);
      bindEditableName(selected);
      currentPreviewProduct = selected || null;
      currentPickerProduct = selected || null;
      currentPickerImageUrl = currentPreviewImageUrl;
      updateFamilyUiStatus(
        familyBaseProduct
          ? `Wybrany produkt: ${selected?.index || "-"}. Kliknij "Dodaj do rodziny", aby dodać go do aktywnej rodziny.`
          : "Kliknij przycisk, aby ustawić wybrany produkt jako bazę rodziny.",
        "info"
      );
      if (!familyBaseProduct) {
        renderModulePreview(currentPreviewProduct, currentPreviewImageUrl);
      } else {
        renderModulePreview(getEffectivePreviewProduct(), getEffectivePreviewImageUrl());
      }
      if (selected) renderProductImagePreview(selected);
      else storeCustomStyleEditorSnapshot();
    };

    search.oninput = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyFilter, 120);
    };
    search.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyFilter();
      }
    };
    select.onchange = onSelectChange;

    if (clearEditorBtn) {
      clearEditorBtn.onclick = () => {
        customDraftModules = [];
        resetCustomStyleEditorSessionState();
        hideCustomImportProgress();
        if (excelImportStatus) excelImportStatus.style.display = "none";
        renderDraftModulesList();
        applyFilter();
        if (typeof window.showAppToast === "function") {
          window.showAppToast("Wyczyszczono edytor do ustawień początkowych.", "success");
        }
      };
    }

    applyFilter();
  }

  window.openCustomStyleCreator = async function () {
    ensureStylWlasnyHelperScriptLoaded();
    ensureModal();

    const modal = document.getElementById("customStyleModal");
    const info = document.getElementById("customStyleInfo");
    if (!modal) return;

    modal.style.display = "flex";

     if (customStyleInteractionsInitialized) {
      syncCustomStyleControlsFromState();
      if (typeof window.CustomStyleDraftTrayUI?.refresh === "function") {
        try { window.CustomStyleDraftTrayUI.refresh(); } catch (_err) {}
      }
      const selectedId = String(document.getElementById("customStyleSelect")?.value || "");
      const selectedProduct = (customEditorProductsById instanceof Map && selectedId)
        ? (customEditorProductsById.get(selectedId) || null)
        : null;
      const lastSnapshot = cloneCustomDraftSnapshot(customLastEditorSnapshot);
      if (lastSnapshot && typeof customRestoreDraftToEditor === "function") {
        customRestoreDraftToEditor(lastSnapshot, { silent: true });
      } else {
        const previewProduct = getEffectivePreviewProduct() || currentPreviewProduct || selectedProduct;
        const previewImageUrl = getEffectivePreviewImageUrl() || currentPreviewImageUrl || "";
        if (previewProduct) {
          currentPreviewProduct = selectedProduct || currentPreviewProduct || previewProduct;
          currentPickerProduct = currentPreviewProduct;
          if (selectedProduct) {
            const select = document.getElementById("customStyleSelect");
            if (select) select.value = String(selectedProduct.id || "");
          }
          renderProductImagePreview(currentPreviewProduct || previewProduct);
        } else if (Array.isArray(customDraftModules) && customDraftModules.length && typeof customRestoreDraftToEditor === "function") {
          customRestoreDraftToEditor(customDraftModules[0], { silent: true });
        } else {
          renderModulePreview(previewProduct, previewImageUrl);
        }
      }
      return;
    }

    if (info) info.textContent = "Ładowanie produktów...";

    try {
      const products = await loadProducts();
      attachInteractions(products);
      customStyleInteractionsInitialized = true;
    } catch (err) {
      if (info) {
        info.innerHTML = `
          <div style="color:#b91c1c;font-weight:700;">Nie udało się pobrać bazy danych.</div>
          <div style="margin-top:6px;color:#64748b;">Szczegóły: ${String(err && err.message ? err.message : err)}</div>
        `;
      }
    }
  };

  function bindSidebarTrigger() {
    const trigger = document.getElementById("addCatalogProductsBtn");
    if (!trigger) return;

    const isCatalogContextReady = () => {
      const editorView = document.getElementById("editorView");
      const startView = document.getElementById("startProjectsView");
      const editorVisible = !!editorView && window.getComputedStyle(editorView).display !== "none";
      const startVisible = !!startView && window.getComputedStyle(startView).display !== "none";
      const hasPages = Array.isArray(window.pages) && window.pages.length > 0;
      return editorVisible && !startVisible && hasPages;
    };

    const updateTriggerState = () => {
      const enabled = isCatalogContextReady();
      trigger.style.opacity = enabled ? "1" : "0.45";
      trigger.style.cursor = enabled ? "pointer" : "not-allowed";
      trigger.setAttribute(
        "title",
        enabled
          ? "Dodaj produkty do katalogu"
          : "Najpierw dodaj pustą stronę lub zaimportuj Excel"
      );
    };

    updateTriggerState();

    const pagesContainer = document.getElementById("pagesContainer");
    if (pagesContainer && "MutationObserver" in window) {
      const observer = new MutationObserver(updateTriggerState);
      observer.observe(pagesContainer, { childList: true, subtree: false });
    }
    const editorView = document.getElementById("editorView");
    if (editorView && "MutationObserver" in window) {
      const observer = new MutationObserver(updateTriggerState);
      observer.observe(editorView, { attributes: true, attributeFilter: ["style", "class"] });
    }
    const startView = document.getElementById("startProjectsView");
    if (startView && "MutationObserver" in window) {
      const observer = new MutationObserver(updateTriggerState);
      observer.observe(startView, { attributes: true, attributeFilter: ["style", "class"] });
    }
    window.addEventListener("pageshow", updateTriggerState);
    window.addEventListener("focus", updateTriggerState);

    trigger.addEventListener("click", () => {
      updateTriggerState();
      if (!isCatalogContextReady()) {
        if (typeof window.showAppToast === "function") {
          window.showAppToast("Najpierw dodaj pustą stronę lub zaimportuj plik Excel.", "error");
        }
        return;
      }
      if (typeof window.openCustomStyleCreator === "function") {
        window.openCustomStyleCreator();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindSidebarTrigger);
  } else {
    bindSidebarTrigger();
  }

  window.CustomStyleDirectHooks = Object.assign({}, window.CustomStyleDirectHooks || {}, {
    bindDirectPriceGroupEditor,
    restoreDirectModuleNodeSelectabilityOnPage,
    rebuildDirectModuleLayoutsOnPage
  });
  window.CUSTOM_STYLE_CODE = STYLE_CUSTOM;
})();

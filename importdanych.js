// ======================================================================== //
// importdanych.js – PEŁNY, KONVA.JS – GLOBALNY CLIPBOARD + JEDNORAZOWE WKLEJANIE + PEŁNE DRAG & DROP + MENU WARSTW + USUWANIE STRON + CANVA-STYLE EDYTOR
// ======================================================================== //
window.pages = window.pages || [];
window.productImageCache = window.productImageCache || {};

// ============================================
// IMAGE PIPELINE (thumb/editor/original)
// ============================================
window.IMAGE_VARIANT_CONFIG = window.IMAGE_VARIANT_CONFIG || {
    // Lekki podglad (sidebar / miniatury / DnD)
    thumbMaxEdge: 112,
    // Edycja na scenie: cel 400-600 px
    editorMaxEdge: 480,
    outputType: "image/webp",
    thumbQuality: 0.72,
    editorQuality: 0.86,
    loadTimeoutMs: 12000
};
window.__IMAGE_VARIANT_CACHE = window.__IMAGE_VARIANT_CACHE || new Map();
window.__IMAGE_VARIANT_PROMISES = window.__IMAGE_VARIANT_PROMISES || new Map();
window.__IMAGE_VARIANT_CACHE_META = window.__IMAGE_VARIANT_CACHE_META || new Map();
window.__IMAGE_VARIANT_CACHE_BYTES = Number(window.__IMAGE_VARIANT_CACHE_BYTES) || 0;
window.__PRODUCT_IMAGE_CACHE_ORDER = Array.isArray(window.__PRODUCT_IMAGE_CACHE_ORDER) ? window.__PRODUCT_IMAGE_CACHE_ORDER : [];
window.__IMAGE_SOURCE_BANK = window.__IMAGE_SOURCE_BANK || new Map();
window.__IMAGE_SOURCE_BANK_ORDER = Array.isArray(window.__IMAGE_SOURCE_BANK_ORDER) ? window.__IMAGE_SOURCE_BANK_ORDER : [];
const IMAGE_VARIANT_CACHE_LIMIT = 120;
const IMAGE_VARIANT_CACHE_MAX_BYTES = 180 * 1024 * 1024;
const PRODUCT_IMAGE_CACHE_LIMIT = 180;
const DATA_URL_KEY_INLINE_LIMIT = 220;
const NODE_INLINE_SRC_LIMIT = 48000;
const IMAGE_SOURCE_BANK_LIMIT = 220;

function _normalizeImageSrcValue(value) {
    return String(value || "").trim();
}

function _isDataUrlSource(src) {
    return /^data:/i.test(String(src || "").trim());
}

function _simpleHashString(input) {
    const text = String(input || "");
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(16);
}

function _normalizeVariantCacheKey(value) {
    const raw = _normalizeImageSrcValue(value);
    if (!raw) return "";
    if (!_isDataUrlSource(raw) || raw.length <= DATA_URL_KEY_INLINE_LIMIT) return raw;
    const head = raw.slice(0, 96);
    const tail = raw.slice(-48);
    return `data:${_simpleHashString(`${head}|${tail}|${raw.length}`)}:${raw.length}`;
}

function _touchImageSourceBankKey(key) {
    const clean = String(key || "").trim();
    if (!clean) return;
    const order = window.__IMAGE_SOURCE_BANK_ORDER;
    const idx = order.indexOf(clean);
    if (idx >= 0) order.splice(idx, 1);
    order.push(clean);
    while (order.length > IMAGE_SOURCE_BANK_LIMIT) {
        const drop = order.shift();
        if (!drop) continue;
        window.__IMAGE_SOURCE_BANK?.delete?.(drop);
    }
}

function _putImageSourceInBank(src) {
    const normalized = _normalizeImageSrcValue(src);
    if (!normalized) return "";
    const head = normalized.slice(0, 120);
    const tail = normalized.slice(-56);
    const key = `src:${_simpleHashString(`${normalized.length}|${head}|${tail}`)}:${normalized.length}`;
    if (!window.__IMAGE_SOURCE_BANK.has(key)) {
        window.__IMAGE_SOURCE_BANK.set(key, normalized);
    }
    _touchImageSourceBankKey(key);
    return key;
}

function _getImageSourceFromBank(key) {
    const clean = String(key || "").trim();
    if (!clean) return "";
    const value = window.__IMAGE_SOURCE_BANK.get(clean) || "";
    if (value) _touchImageSourceBankKey(clean);
    return String(value || "");
}

function _cloneImageVariants(value) {
    const normalized = _normalizeImageVariantPayload(value);
    return {
        original: normalized.original,
        editor: normalized.editor,
        thumb: normalized.thumb
    };
}

function _normalizeImageVariantPayload(value) {
    if (!value) return { original: "", editor: "", thumb: "" };
    if (typeof value === "string") {
        const src = _normalizeImageSrcValue(value);
        return { original: src, editor: src, thumb: src };
    }
    const original =
        _normalizeImageSrcValue(value.original) ||
        _normalizeImageSrcValue(value.originalSrc) ||
        _normalizeImageSrcValue(value.src) ||
        _normalizeImageSrcValue(value.url);
    const editor =
        _normalizeImageSrcValue(value.editor) ||
        _normalizeImageSrcValue(value.editorSrc) ||
        original;
    const thumb =
        _normalizeImageSrcValue(value.thumb) ||
        _normalizeImageSrcValue(value.thumbSrc) ||
        editor ||
        original;
    return {
        original: original || editor || thumb || "",
        editor: editor || original || thumb || "",
        thumb: thumb || editor || original || ""
    };
}

function _estimateVariantPayloadBytes(payload) {
    const normalized = _normalizeImageVariantPayload(payload);
    const totalChars =
        String(normalized.original || "").length +
        String(normalized.editor || "").length +
        String(normalized.thumb || "").length;
    return totalChars * 2;
}

function _trimVariantCacheToBudget() {
    const cache = window.__IMAGE_VARIANT_CACHE;
    const meta = window.__IMAGE_VARIANT_CACHE_META;
    while (
        cache.size > IMAGE_VARIANT_CACHE_LIMIT ||
        Number(window.__IMAGE_VARIANT_CACHE_BYTES || 0) > IMAGE_VARIANT_CACHE_MAX_BYTES
    ) {
        const first = cache.keys().next();
        if (!first || first.done) break;
        const firstKey = first.value;
        const info = meta.get(firstKey);
        cache.delete(firstKey);
        meta.delete(firstKey);
        if (info && Number.isFinite(info.bytes)) {
            window.__IMAGE_VARIANT_CACHE_BYTES = Math.max(
                0,
                Number(window.__IMAGE_VARIANT_CACHE_BYTES || 0) - Number(info.bytes)
            );
        }
    }
}

function _touchProductImageCacheKey(indeksKey) {
    const key = String(indeksKey || "").trim().toLowerCase();
    if (!key) return;
    const order = window.__PRODUCT_IMAGE_CACHE_ORDER;
    const idx = order.indexOf(key);
    if (idx >= 0) order.splice(idx, 1);
    order.push(key);
    while (order.length > PRODUCT_IMAGE_CACHE_LIMIT) {
        const drop = order.shift();
        if (!drop) continue;
        if (window.productImageCache && Object.prototype.hasOwnProperty.call(window.productImageCache, drop)) {
            delete window.productImageCache[drop];
        }
    }
}

function _setProductImageCacheEntry(indeksKey, variants) {
    const key = String(indeksKey || "").trim().toLowerCase();
    if (!key) return;
    const normalized = _normalizeImageVariantPayload(variants);
    if (!window.productImageCache || typeof window.productImageCache !== "object") {
        window.productImageCache = {};
    }
    window.productImageCache[key] = {
        original: normalized.original || normalized.editor || normalized.thumb || "",
        editor: normalized.editor || normalized.original || normalized.thumb || "",
        thumb: normalized.thumb || normalized.editor || normalized.original || ""
    };
    _touchProductImageCacheKey(key);
}

function _cacheImageVariants(key, payload) {
    const cacheKey = _normalizeVariantCacheKey(key);
    if (!cacheKey) return;
    const cache = window.__IMAGE_VARIANT_CACHE;
    const meta = window.__IMAGE_VARIANT_CACHE_META;
    const cloned = _cloneImageVariants(payload);
    const bytes = _estimateVariantPayloadBytes(cloned);
    const prevMeta = meta.get(cacheKey);
    if (prevMeta && Number.isFinite(prevMeta.bytes)) {
        window.__IMAGE_VARIANT_CACHE_BYTES = Math.max(
            0,
            Number(window.__IMAGE_VARIANT_CACHE_BYTES || 0) - Number(prevMeta.bytes)
        );
    }
    if (cache.has(cacheKey)) cache.delete(cacheKey);
    cache.set(cacheKey, cloned);
    meta.set(cacheKey, { bytes });
    window.__IMAGE_VARIANT_CACHE_BYTES = Number(window.__IMAGE_VARIANT_CACHE_BYTES || 0) + bytes;
    _trimVariantCacheToBudget();
}

function _getCachedImageVariants(key) {
    const cacheKey = _normalizeVariantCacheKey(key);
    if (!cacheKey) return null;
    const cache = window.__IMAGE_VARIANT_CACHE;
    const item = cache.get(cacheKey);
    if (item) {
        // LRU: odswiez wpis
        cache.delete(cacheKey);
        cache.set(cacheKey, item);
    }
    return item ? _cloneImageVariants(item) : null;
}

function _readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Nie udalo sie odczytac pliku obrazu."));
        reader.readAsDataURL(file);
    });
}

function _loadImageElementForPipeline(src, timeoutMs) {
    return new Promise((resolve, reject) => {
        const safeSrc = _normalizeImageSrcValue(src);
        if (!safeSrc) {
            reject(new Error("Brak zrodla obrazu."));
            return;
        }
        const img = new Image();
        let done = false;
        const finish = (ok, payload) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            img.onload = null;
            img.onerror = null;
            if (ok) resolve(payload);
            else reject(payload instanceof Error ? payload : new Error(String(payload || "Blad ladowania obrazu.")));
        };
        const timer = setTimeout(() => finish(false, new Error("Timeout ladowania obrazu.")), Math.max(1200, Number(timeoutMs) || 12000));
        img.onload = () => finish(true, img);
        img.onerror = () => finish(false, new Error("Nie udalo sie zaladowac obrazu."));
        if (/^https?:\/\//i.test(safeSrc)) {
            img.crossOrigin = "Anonymous";
            img.referrerPolicy = "no-referrer";
        }
        img.src = safeSrc;
    });
}

function _encodeCanvasDataUrl(canvas, outputType, quality, fallback) {
    if (!canvas) return _normalizeImageSrcValue(fallback);
    const safeType = _normalizeImageSrcValue(outputType) || "image/webp";
    const safeQuality = Number.isFinite(Number(quality)) ? Math.max(0.1, Math.min(0.98, Number(quality))) : 0.82;
    try {
        return canvas.toDataURL(safeType, safeQuality);
    } catch (_e) {
        try {
            return canvas.toDataURL("image/png");
        } catch (_e2) {
            return _normalizeImageSrcValue(fallback);
        }
    }
}

function _buildResizedImageVariant(img, maxEdge, outputType, quality, fallback) {
    const safeFallback = _normalizeImageSrcValue(fallback);
    const targetEdge = Math.max(32, Number(maxEdge) || 0);
    if (!(img instanceof HTMLImageElement) && !(img instanceof ImageBitmap)) {
        return safeFallback;
    }
    const srcW = Math.max(1, Number(img.naturalWidth || img.width) || 1);
    const srcH = Math.max(1, Number(img.naturalHeight || img.height) || 1);
    const srcMax = Math.max(srcW, srcH);
    const ratio = srcMax > targetEdge ? (targetEdge / srcMax) : 1;
    const dstW = Math.max(1, Math.round(srcW * ratio));
    const dstH = Math.max(1, Math.round(srcH * ratio));
    let canvas = null;
    let ctx = null;
    try {
        canvas = document.createElement("canvas");
        canvas.width = dstW;
        canvas.height = dstH;
        ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: false });
        if (!ctx) return safeFallback;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.clearRect(0, 0, dstW, dstH);
        ctx.drawImage(img, 0, 0, dstW, dstH);
        return _encodeCanvasDataUrl(canvas, outputType, quality, safeFallback);
    } catch (_e) {
        return safeFallback;
    }
}

function _buildFileCacheKey(file, fallbackPrefix = "file") {
    if (!(file instanceof File)) return `${fallbackPrefix}:unknown`;
    return `${fallbackPrefix}:${file.name}:${file.size}:${file.lastModified}`;
}

window.normalizeImageVariantPayload = function(value) {
    return _normalizeImageVariantPayload(value);
};

window.cloneImageVariantPayload = function(value) {
    return _cloneImageVariants(value);
};

window.getImageVariantSource = function(value, kind = "editor") {
    const normalized = _normalizeImageVariantPayload(value);
    const mode = String(kind || "editor").toLowerCase();
    if (mode === "original") return normalized.original || normalized.editor || normalized.thumb || "";
    if (mode === "thumb") return normalized.thumb || normalized.editor || normalized.original || "";
    return normalized.editor || normalized.original || normalized.thumb || "";
};

window.getImageVariantsFromCache = function(cacheKeyOrSrc) {
    return _getCachedImageVariants(cacheKeyOrSrc);
};

window.getNodeImageSource = function(node, kind = "original") {
    if (!node || typeof node.getAttr !== "function") return "";
    const mode = String(kind || "original").toLowerCase();
    const attrName = mode === "thumb" ? "thumbSrc" : mode === "editor" ? "editorSrc" : "originalSrc";
    const bankAttrName = mode === "thumb" ? "thumbSrcBankKey" : mode === "editor" ? "editorSrcBankKey" : "originalSrcBankKey";

    const inlineSrc = _normalizeImageSrcValue(node.getAttr(attrName));
    if (inlineSrc) return inlineSrc;

    const bankKey = _normalizeImageSrcValue(node.getAttr(bankAttrName));
    if (bankKey) {
        const bankSrc = _getImageSourceFromBank(bankKey);
        if (bankSrc) return bankSrc;
    }

    if (mode === "editor" || mode === "thumb") {
        const fallback = (typeof node.image === "function" && node.image() && node.image().src)
            ? String(node.image().src || "")
            : "";
        if (fallback) return fallback;
    }

    if (mode === "original") {
        const barcodeSrc = _normalizeImageSrcValue(node.getAttr("barcodeOriginalSrc"));
        if (barcodeSrc) return barcodeSrc;
        const editorInline = _normalizeImageSrcValue(node.getAttr("editorSrc"));
        if (editorInline) return editorInline;
        const editorBank = _normalizeImageSrcValue(node.getAttr("editorSrcBankKey"));
        if (editorBank) {
            const bankEditor = _getImageSourceFromBank(editorBank);
            if (bankEditor) return bankEditor;
        }
        const imageFallback = (typeof node.image === "function" && node.image() && node.image().src)
            ? String(node.image().src || "")
            : "";
        if (imageFallback) return imageFallback;
    }
    return "";
};

window.applyImageVariantsToKonvaNode = function(node, value) {
    if (!node || typeof node.setAttr !== "function") return;
    const normalized = _normalizeImageVariantPayload(value);
    const originalSrc = normalized.original || normalized.editor || normalized.thumb || "";
    const editorSrc = normalized.editor || normalized.original || normalized.thumb || originalSrc;
    const thumbSrc = normalized.thumb || normalized.editor || normalized.original || editorSrc;

    const assignNodeSource = (attrName, bankAttrName, sourceValue) => {
        const src = _normalizeImageSrcValue(sourceValue);
        if (!src) {
            node.setAttr(attrName, "");
            node.setAttr(bankAttrName, "");
            return;
        }
        if (_isDataUrlSource(src) && src.length > NODE_INLINE_SRC_LIMIT) {
            const bankKey = _putImageSourceInBank(src);
            node.setAttr(attrName, "");
            node.setAttr(bankAttrName, bankKey || "");
            return;
        }
        node.setAttr(attrName, src);
        node.setAttr(bankAttrName, "");
    };

    assignNodeSource("originalSrc", "originalSrcBankKey", originalSrc);
    assignNodeSource("editorSrc", "editorSrcBankKey", editorSrc);
    assignNodeSource("thumbSrc", "thumbSrcBankKey", thumbSrc);
};

window.createImageVariantsFromSource = async function(src, options = {}) {
    const source = _normalizeImageSrcValue(src);
    if (!source) return _normalizeImageVariantPayload(null);
    const cfg = window.IMAGE_VARIANT_CONFIG || {};
    const cacheKeyRaw = _normalizeImageSrcValue(options.cacheKey) || source;
    const cacheKey = _normalizeVariantCacheKey(cacheKeyRaw);
    const sourceKey = _normalizeVariantCacheKey(source);
    const cached = _getCachedImageVariants(cacheKey) || _getCachedImageVariants(sourceKey);
    if (cached) return cached;

    if (window.__IMAGE_VARIANT_PROMISES.has(cacheKey)) {
        return _cloneImageVariants(await window.__IMAGE_VARIANT_PROMISES.get(cacheKey));
    }

    const job = (async () => {
        const original = source;
        let editor = original;
        let thumb = original;
        try {
            const img = await _loadImageElementForPipeline(source, options.timeoutMs || cfg.loadTimeoutMs || 12000);
            const outputType = _normalizeImageSrcValue(options.outputType) || cfg.outputType || "image/webp";
            const editorMax = Number(options.editorMaxEdge) || Number(cfg.editorMaxEdge) || 600;
            const thumbMax = Number(options.thumbMaxEdge) || Number(cfg.thumbMaxEdge) || 128;
            const editorQuality = Number(options.editorQuality);
            const thumbQuality = Number(options.thumbQuality);
            editor = _buildResizedImageVariant(
                img,
                editorMax,
                outputType,
                Number.isFinite(editorQuality) ? editorQuality : cfg.editorQuality,
                original
            ) || original;
            thumb = _buildResizedImageVariant(
                img,
                thumbMax,
                outputType,
                Number.isFinite(thumbQuality) ? thumbQuality : cfg.thumbQuality,
                editor || original
            ) || editor || original;
        } catch (_e) {
            editor = original;
            thumb = original;
        }

        const payload = _normalizeImageVariantPayload({ original, editor, thumb });
        _cacheImageVariants(cacheKey, payload);
        if (cacheKey !== sourceKey) _cacheImageVariants(sourceKey, payload);
        return payload;
    })().finally(() => {
        window.__IMAGE_VARIANT_PROMISES.delete(cacheKey);
    });

    window.__IMAGE_VARIANT_PROMISES.set(cacheKey, job);
    return _cloneImageVariants(await job);
};

window.createImageVariantsFromFile = async function(file, options = {}) {
    if (!(file instanceof File)) {
        throw new Error("Niepoprawny plik obrazu.");
    }
    const cfg = window.IMAGE_VARIANT_CONFIG || {};
    const cacheKeyRaw = _normalizeImageSrcValue(options.cacheKey) || _buildFileCacheKey(file, "local");
    const cacheKey = _normalizeVariantCacheKey(cacheKeyRaw);
    const cached = _getCachedImageVariants(cacheKey);
    if (cached) return cached;

    if (window.__IMAGE_VARIANT_PROMISES.has(cacheKey)) {
        return _cloneImageVariants(await window.__IMAGE_VARIANT_PROMISES.get(cacheKey));
    }

    const job = (async () => {
        const original = await _readFileAsDataUrl(file);
        const blobUrl = URL.createObjectURL(file);
        let editor = original;
        let thumb = original;
        try {
            const img = await _loadImageElementForPipeline(blobUrl, options.timeoutMs || cfg.loadTimeoutMs || 12000);
            const outputType = _normalizeImageSrcValue(options.outputType) || cfg.outputType || "image/webp";
            const editorMax = Number(options.editorMaxEdge) || Number(cfg.editorMaxEdge) || 600;
            const thumbMax = Number(options.thumbMaxEdge) || Number(cfg.thumbMaxEdge) || 128;
            const editorQuality = Number(options.editorQuality);
            const thumbQuality = Number(options.thumbQuality);
            editor = _buildResizedImageVariant(
                img,
                editorMax,
                outputType,
                Number.isFinite(editorQuality) ? editorQuality : cfg.editorQuality,
                original
            ) || original;
            thumb = _buildResizedImageVariant(
                img,
                thumbMax,
                outputType,
                Number.isFinite(thumbQuality) ? thumbQuality : cfg.thumbQuality,
                editor || original
            ) || editor || original;
        } catch (_e) {
            editor = original;
            thumb = original;
        } finally {
            try { URL.revokeObjectURL(blobUrl); } catch (_e) {}
        }
        const payload = _normalizeImageVariantPayload({ original, editor, thumb });
        _cacheImageVariants(cacheKey, payload);
        return payload;
    })().finally(() => {
        window.__IMAGE_VARIANT_PROMISES.delete(cacheKey);
    });

    window.__IMAGE_VARIANT_PROMISES.set(cacheKey, job);
    return _cloneImageVariants(await job);
};

window.__EXPORT_ORIGINAL_IMAGE_CACHE = window.__EXPORT_ORIGINAL_IMAGE_CACHE || new Map();
const EXPORT_ORIGINAL_IMAGE_CACHE_LIMIT = 80;

function _trimExportOriginalImageCache() {
    const cache = window.__EXPORT_ORIGINAL_IMAGE_CACHE;
    while (cache.size > EXPORT_ORIGINAL_IMAGE_CACHE_LIMIT) {
        const first = cache.keys().next();
        if (!first || first.done) break;
        cache.delete(first.value);
    }
}

window.releaseExportImageCache = function() {
    try {
        if (window.__EXPORT_ORIGINAL_IMAGE_CACHE && typeof window.__EXPORT_ORIGINAL_IMAGE_CACHE.clear === "function") {
            window.__EXPORT_ORIGINAL_IMAGE_CACHE.clear();
        }
    } catch (_e) {}
};

window.releaseImageMemoryCaches = function() {
    try {
        window.__IMAGE_VARIANT_PROMISES?.clear?.();
    } catch (_e) {}
    try {
        window.__IMAGE_VARIANT_CACHE?.clear?.();
    } catch (_e) {}
    try {
        window.__IMAGE_VARIANT_CACHE_META?.clear?.();
    } catch (_e) {}
    window.__IMAGE_VARIANT_CACHE_BYTES = 0;
    try {
        window.__IMAGE_SOURCE_BANK?.clear?.();
    } catch (_e) {}
    window.__IMAGE_SOURCE_BANK_ORDER = [];
    window.productImageCache = {};
    window.__PRODUCT_IMAGE_CACHE_ORDER = [];
    if (typeof window.releaseExportImageCache === "function") {
        window.releaseExportImageCache();
    }
};

async function _loadOriginalImageForExport(src) {
    const safeSrc = _normalizeImageSrcValue(src);
    if (!safeSrc) return null;
    const cache = window.__EXPORT_ORIGINAL_IMAGE_CACHE;
    const cacheKey = _normalizeVariantCacheKey(safeSrc) || safeSrc;
    if (cache.has(cacheKey)) {
        return await cache.get(cacheKey);
    }
    const job = _loadImageElementForPipeline(safeSrc, 20000)
        .then((img) => img || null)
        .catch(() => null);
    cache.set(cacheKey, job);
    _trimExportOriginalImageCache();
    const loaded = await job;
    if (!loaded) cache.delete(cacheKey);
    return loaded;
}

function _readImageNaturalSize(img) {
    const w = Number(img && (img.naturalWidth || img.width)) || 0;
    const h = Number(img && (img.naturalHeight || img.height)) || 0;
    return {
        width: w > 0 ? w : 0,
        height: h > 0 ? h : 0
    };
}

window.swapKonvaImageToOriginalForExport = async function(node) {
    if (!window.Konva || !(node instanceof window.Konva.Image)) return null;
    if (!node || typeof node.image !== "function" || typeof node.getAttr !== "function") return null;

    if (node.getAttr("isPriceHitArea")) return null;
    if (node.getAttr("isBarcode") || node.getAttr("isQRCode") || node.getAttr("isEAN")) return null;

    const originalSrc = _normalizeImageSrcValue(
        (typeof window.getNodeImageSource === "function")
            ? window.getNodeImageSource(node, "original")
            : (node.getAttr("originalSrc") || node.getAttr("barcodeOriginalSrc"))
    );
    if (!originalSrc) return null;

    const currentImage = node.image();
    if (!currentImage) return null;

    const originalImage = await _loadOriginalImageForExport(originalSrc);
    if (!originalImage || originalImage === currentImage) return null;

    const layer = (typeof node.getLayer === "function") ? node.getLayer() : null;
    const prevState = {
        image: currentImage,
        cropX: (typeof node.cropX === "function") ? Number(node.cropX()) : 0,
        cropY: (typeof node.cropY === "function") ? Number(node.cropY()) : 0,
        cropWidth: (typeof node.cropWidth === "function") ? Number(node.cropWidth()) : 0,
        cropHeight: (typeof node.cropHeight === "function") ? Number(node.cropHeight()) : 0
    };
    const hadCropRect = Number.isFinite(prevState.cropWidth) && Number.isFinite(prevState.cropHeight) &&
        prevState.cropWidth > 0 && prevState.cropHeight > 0;
    let cropChanged = false;

    try {
        node.image(originalImage);

        if (hadCropRect && typeof node.crop === "function") {
            const editorSize = _readImageNaturalSize(prevState.image);
            const originalSize = _readImageNaturalSize(originalImage);
            if (editorSize.width > 0 && editorSize.height > 0 && originalSize.width > 0 && originalSize.height > 0) {
                const ratioX = originalSize.width / editorSize.width;
                const ratioY = originalSize.height / editorSize.height;
                const nextCrop = clampCropRectToImage(
                    prevState.cropX * ratioX,
                    prevState.cropY * ratioY,
                    prevState.cropWidth * ratioX,
                    prevState.cropHeight * ratioY,
                    originalSize.width,
                    originalSize.height
                );
                node.crop({
                    x: nextCrop.x,
                    y: nextCrop.y,
                    width: nextCrop.width,
                    height: nextCrop.height
                });
                cropChanged = true;
            }
        }
        if (layer && typeof layer.batchDraw === "function") layer.batchDraw();
    } catch (_err) {
        try { node.image(prevState.image); } catch (_e) {}
        if (layer && typeof layer.batchDraw === "function") layer.batchDraw();
        return null;
    }

    return () => {
        try {
            node.image(prevState.image);
            if (cropChanged && typeof node.crop === "function") {
                node.crop({
                    x: prevState.cropX,
                    y: prevState.cropY,
                    width: prevState.cropWidth,
                    height: prevState.cropHeight
                });
            }
            if (layer && typeof layer.batchDraw === "function") layer.batchDraw();
        } catch (_err) {}
    };
};

window.swapPageImagesToOriginalForExport = async function(page) {
    if (!window.Konva || !page || !page.layer || typeof page.layer.find !== "function") return null;
    const images = page.layer.find((n) => n instanceof window.Konva.Image);
    if (!images || typeof images.length !== "number" || images.length === 0) return null;

    const restorers = [];
    for (let i = 0; i < images.length; i++) {
        const restore = await window.swapKonvaImageToOriginalForExport(images[i]);
        if (typeof restore === "function") restorers.push(restore);
    }
    if (!restorers.length) return null;

    return () => {
        for (let i = restorers.length - 1; i >= 0; i--) {
            try { restorers[i](); } catch (_err) {}
        }
    };
};

const TNZ_BADGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/CREATOR%20BASIC%2FTNZ.png?alt=media";

window.TNZ_IMAGE = null;
const COUNTRY_RO_BADGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/CREATOR%20BASIC%2FRumunia.png?alt=media";

window.COUNTRY_RO_IMAGE = null;

const COUNTRY_UA_BADGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/CREATOR%20BASIC%2FUkraina.png?alt=media";

window.COUNTRY_UA_IMAGE = null;
const COUNTRY_LT_BADGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/CREATOR%20BASIC%2FLitwa.png?alt=media";

window.COUNTRY_LT_IMAGE = null;

const COUNTRY_BG_BADGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/CREATOR%20BASIC%2FBulgaria.png?alt=media";

window.COUNTRY_BG_IMAGE = null;

const COUNTRY_PL_BADGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/CREATOR%20BASIC%2FPolska.png?alt=media";

window.COUNTRY_PL_IMAGE = null;

// ============================================
// PERFORMANCE: aktywne tylko strony blisko viewportu
// ============================================
const PAGE_PERF_VIEWPORT_MARGIN = 320;
// Domyslnie wlaczone (mozna recznie wylaczyc przez window.__enablePagePerfSleep = false)
window.__enablePagePerfSleep = (window.__enablePagePerfSleep !== false);
let pagePerfObserver = null;
let pagePerfRefreshQueued = false;
const pagePerfByContainer = new WeakMap();
const pagePerfInteractiveState = new WeakMap();

function shouldSkipPageDrawForTarget(target) {
    if (window.__projectLoadInProgress) return false;
    if (!window.__enablePagePerfSleep) return false;
    if (window.__forceAllPageDraw) return false;
    if (!target) return false;
    let stage = null;
    try {
        if (typeof target.getStage === "function") stage = target.getStage();
        if (!stage && typeof target.container === "function") stage = target;
    } catch (_e) {}
    if (!stage || typeof stage.container !== "function") return false;
    const container = stage.container();
    if (!container || typeof container.closest !== "function") return false;
    const host = container.closest(".page-container");
    return !!(host && host.classList && host.classList.contains("page-perf-sleep"));
}

function patchKonvaDrawPerf() {
    if (!window.Konva || window.__konvaDrawPerfPatched) return;
    window.__konvaDrawPerfPatched = true;

    const patchMethod = (proto, methodName) => {
        if (!proto || typeof proto[methodName] !== "function") return;
        const original = proto[methodName];
        proto[methodName] = function patchedDrawMethod(...args) {
            if (shouldSkipPageDrawForTarget(this)) return this;
            return original.apply(this, args);
        };
    };

    patchMethod(window.Konva.Stage && window.Konva.Stage.prototype, "draw");
    patchMethod(window.Konva.Stage && window.Konva.Stage.prototype, "batchDraw");
    patchMethod(window.Konva.Layer && window.Konva.Layer.prototype, "draw");
    patchMethod(window.Konva.Layer && window.Konva.Layer.prototype, "batchDraw");
}

window.beginForcePageDraw = function() {
    const prev = !!window.__forceAllPageDraw;
    window.__forceAllPageDraw = true;
    return () => {
        window.__forceAllPageDraw = prev;
    };
};

window.forceDrawAllPagesForExport = function() {
    const release = (typeof window.beginForcePageDraw === "function")
        ? window.beginForcePageDraw()
        : null;
    try {
        const list = Array.isArray(window.pages) ? window.pages : [];
        list.forEach((p) => {
            try { p?.bgLayer?.draw?.(); } catch (_e) {}
            try { p?.layer?.draw?.(); } catch (_e) {}
            try { p?.transformerLayer?.draw?.(); } catch (_e) {}
            try { p?.stage?.draw?.(); } catch (_e) {}
        });
    } finally {
        if (typeof release === "function") release();
    }
};

function isPageNearViewport(container) {
    if (!container || typeof container.getBoundingClientRect !== "function") return true;
    const rect = container.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement?.clientHeight || 0;
    return rect.bottom >= -PAGE_PERF_VIEWPORT_MARGIN && rect.top <= (vh + PAGE_PERF_VIEWPORT_MARGIN);
}

function requestDeferredPageHydration(page, reason) {
    if (!page) return;
    if (window.__projectLoadInProgress) return;
    if (typeof window.hasDeferredPageHydration !== "function") return;
    if (typeof window.ensurePageHydrated !== "function") return;
    if (!window.hasDeferredPageHydration(page)) return;
    Promise.resolve()
        .then(() => window.ensurePageHydrated(page, { reason: reason || "viewport" }))
        .catch(() => {});
}

function setPagePerfInteractive(page, interactive) {
    if (!page || !page.container || !page.stage) return;
    const enabled = (!window.__enablePagePerfSleep || window.__projectLoadInProgress) ? true : !!interactive;
    if (enabled) {
        requestDeferredPageHydration(page, "viewport");
    }
    if (pagePerfInteractiveState.get(page) === enabled) return;
    pagePerfInteractiveState.set(page, enabled);

    try { page.stage.listening(enabled); } catch (_e) {}
    const toggleLayer = (layer) => {
        if (!layer) return;
        try {
            if (typeof layer.listening === "function") layer.listening(enabled);
            if (typeof layer.hitGraphEnabled === "function") layer.hitGraphEnabled(enabled);
        } catch (_e) {}
    };
    toggleLayer(page.bgLayer);
    toggleLayer(page.layer);
    toggleLayer(page.transformerLayer);

    page.container.classList.toggle("page-perf-sleep", !enabled);
    const wrapper = page.container.querySelector(".canvas-wrapper");
    if (wrapper) wrapper.style.pointerEvents = enabled ? "auto" : "none";

    if (enabled) {
        try {
            page.stage.batchDraw();
        } catch (_e) {}
    }
}

function ensurePagePerfObserver() {
    if (!window.__enablePagePerfSleep) return null;
    if (pagePerfObserver || typeof IntersectionObserver !== "function") return pagePerfObserver;
    pagePerfObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const page = pagePerfByContainer.get(entry.target);
            if (!page) return;
            setPagePerfInteractive(page, !!entry.isIntersecting);
        });
    }, {
        root: null,
        rootMargin: `${PAGE_PERF_VIEWPORT_MARGIN}px 0px ${PAGE_PERF_VIEWPORT_MARGIN}px 0px`,
        threshold: 0.001
    });
    return pagePerfObserver;
}

function queueRefreshPagesPerf() {
    if (pagePerfRefreshQueued) return;
    pagePerfRefreshQueued = true;
    requestAnimationFrame(() => {
        pagePerfRefreshQueued = false;
        if (typeof window.refreshPagesPerf === "function") window.refreshPagesPerf();
    });
}

window.registerPageForPerf = function(page) {
    if (!page || !page.container) return;
    pagePerfByContainer.set(page.container, page);
    const observer = ensurePagePerfObserver();
    if (observer) observer.observe(page.container);
    setPagePerfInteractive(page, window.__enablePagePerfSleep ? isPageNearViewport(page.container) : true);
};

window.refreshPagesPerf = function() {
    const list = Array.isArray(window.pages) ? window.pages : [];
    const observer = ensurePagePerfObserver();
    list.forEach((page) => {
        if (!page || !page.container) return;
        pagePerfByContainer.set(page.container, page);
        if (observer) observer.observe(page.container);
        setPagePerfInteractive(page, window.__enablePagePerfSleep ? isPageNearViewport(page.container) : true);
    });
};

window.addEventListener("resize", queueRefreshPagesPerf, { passive: true });
window.addEventListener("orientationchange", queueRefreshPagesPerf, { passive: true });
window.addEventListener("canvasCreated", queueRefreshPagesPerf);
window.addEventListener("excelImported", queueRefreshPagesPerf);
patchKonvaDrawPerf();

async function ensurePagesReadyForExport(targetPages) {
    if (typeof window.ensureAllPagesHydrated !== "function") return;
    await window.ensureAllPagesHydrated(targetPages, { reason: "export" });
}

// ============================================
// 🔒 NORMALIZACJA ZAZNACZENIA (dziecko → GROUP)
// ============================================
function normalizeSelection(nodes) {
    if (!Array.isArray(nodes)) return [];

    const toGroupRoot = (node) => {
        let current = node;
        let lockedToPriceGroup = false;
        while (
            current &&
            current.getParent &&
            current.getParent() instanceof Konva.Group
        ) {
            const parent = current.getParent();
            if (
                parent.getAttr("isPriceGroup") ||
                parent.getAttr("isPreset") ||
                parent.getAttr("isShape") ||
                parent.getAttr("isUserGroup")
            ) {
                current = parent;
                if (parent.getAttr("isPriceGroup")) {
                    lockedToPriceGroup = true;
                    break;
                }
                continue;
            }
            break;
        }
        if (lockedToPriceGroup) return current;
        return current;
    };

    return nodes
        .map(toGroupRoot)
        .filter((v, i, a) => v && a.indexOf(v) === i);
}

// Rozszerza zaznaczenie o wszystkie top-level elementy modułu direct (styl-wlasny)
// po wspólnym directModuleId. Działa głównie dla rozgrupowanych modułów.
function expandSelectionForDirectModules(nodes, layer) {
    if (!Array.isArray(nodes) || !layer || typeof layer.find !== "function") return Array.isArray(nodes) ? nodes : [];

    const directIds = new Set();
    nodes.forEach((node) => {
        if (!node || !node.getAttr) return;
        if (node instanceof Konva.Group && node.getAttr("isUserGroup")) return; // zachowaj normalne grupy bez rozbijania
        const id = String(node.getAttr("directModuleId") || "").trim();
        if (id) directIds.add(id);
    });
    if (!directIds.size) return nodes;

    const expanded = nodes.slice();
    const extras = layer.find((n) => {
        if (!n || !n.getAttr) return false;
        const id = String(n.getAttr("directModuleId") || "").trim();
        if (!id || !directIds.has(id)) return false;
        if (n instanceof Konva.Group && n.getAttr("isUserGroup")) return false;
        const parent = n.getParent ? n.getParent() : null;
        if (parent !== layer) return false;
        return (
            n instanceof Konva.Text ||
            n instanceof Konva.Image ||
            n instanceof Konva.Group ||
            n instanceof Konva.Rect
        );
    });

    extras.forEach((n) => {
        if (!expanded.includes(n)) expanded.push(n);
    });
    return expanded;
}

let pastedDirectModuleSeq = 0;
function nextPastedDirectModuleId() {
    pastedDirectModuleSeq += 1;
    return `direct-module-paste-${Date.now()}-${pastedDirectModuleSeq}`;
}

function remapDirectModuleIdsForPastedClone(node, idMap) {
    if (!node || !node.getAttr || !node.setAttr) return;
    const map = (idMap && typeof idMap === "object") ? idMap : {};
    const oldId = String(node.getAttr("directModuleId") || "").trim();
    if (oldId) {
        if (!map[oldId]) map[oldId] = nextPastedDirectModuleId();
        node.setAttr("directModuleId", map[oldId]);
    }
    if (node.getChildren) {
        try {
            node.getChildren().forEach((child) => remapDirectModuleIdsForPastedClone(child, map));
        } catch (_e) {}
    }
}

function cleanupPastedCloneRuntimeAttrs(node) {
    if (!node || !node.getAttr || !node.setAttr) return;
    try {
        const attrs = node.getAttrs ? node.getAttrs() : {};
        Object.keys(attrs || {}).forEach((key) => {
            if (!key) return;
            if (
                key.startsWith("_custom") ||
                key.startsWith("_directSaved") ||
                key === "_directPriceEditorBound" ||
                key === "_customModulePosSnapshot" ||
                key === "_customPricePosBeforeEdit" ||
                key === "_customNoopEditSnapshot" ||
                key === "_customNoopEditWatchId"
            ) {
                try { node.setAttr(key, null); } catch (_e) {}
            }
        });
    } catch (_e) {}
    if (node.getChildren) {
        try { node.getChildren().forEach(cleanupPastedCloneRuntimeAttrs); } catch (_e) {}
    }
}

function collectProductSlotsFromNode(page, node) {
    const slots = new Set();
    if (!node || !node.getAttr) return slots;

    const isProductCarrier = (n) => {
        if (!n || !n.getAttr) return false;
        return !!(
            n.getAttr("isUserGroup") ||
            n.getAttr("isAutoSlotGroup") ||
            n.getAttr("isProductImage") ||
            n.getAttr("isPriceGroup") ||
            n.getAttr("isBarcode") ||
            n.getAttr("isCountryBadge")
        );
    };

    const tryAddSlot = (n) => {
        if (!n || !n.getAttr) return;
        const direct = Number(n.getAttr("slotIndex"));
        const preserved = Number(n.getAttr("preservedSlotIndex"));
        if (Number.isFinite(direct)) slots.add(direct);
        if (Number.isFinite(preserved)) slots.add(preserved);
    };

    if (isProductCarrier(node)) {
        tryAddSlot(node);
    }

    if (node.getChildren) {
        const walk = (n) => {
            if (!n) return;
            if (isProductCarrier(n)) tryAddSlot(n);
            if (n.getChildren) n.getChildren().forEach(walk);
        };
        node.getChildren().forEach(walk);
    }

    let parent = node.getParent ? node.getParent() : null;
    while (parent && parent !== page?.stage) {
        if (isProductCarrier(parent)) tryAddSlot(parent);
        parent = parent.getParent ? parent.getParent() : null;
    }

    return slots;
}

function clearCatalogSlotStateForNode(page, node) {
    if (!page) return;
    const slots = collectProductSlotsFromNode(page, node);
    if (!slots.size) return;

    slots.forEach((slot) => {
        if (!Number.isFinite(slot)) return;
        if (Array.isArray(page.products)) page.products[slot] = null;
        if (Array.isArray(page.slotObjects)) page.slotObjects[slot] = null;
        if (Array.isArray(page.barcodeObjects)) page.barcodeObjects[slot] = null;
        if (Array.isArray(page.barcodePositions)) page.barcodePositions[slot] = null;
        if (Array.isArray(page.boxScales)) page.boxScales[slot] = null;
        if (page._customProtectedSlots instanceof Set) page._customProtectedSlots.delete(slot);
    });
}

// ============================================
// CROP MODE (CANVA-LIKE) DLA OBRAZKÓW
// ============================================
const TRANSFORMER_ANCHORS_DEFAULT = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
];

const TRANSFORMER_ANCHORS_CROP = [
    // Pełne uchwyty: narożniki + boki (crop działa tylko na środkowych bokach)
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
];

function isCropAnchorName(anchor) {
    return (
        anchor === 'middle-left' ||
        anchor === 'middle-right' ||
        anchor === 'top-center' ||
        anchor === 'bottom-center'
    );
}

function clampCropRectToImage(cropX, cropY, cropW, cropH, imgW, imgH) {
    const safeImgW = Math.max(1, Number(imgW) || 1);
    const safeImgH = Math.max(1, Number(imgH) || 1);

    let x = Number.isFinite(cropX) ? cropX : 0;
    let y = Number.isFinite(cropY) ? cropY : 0;
    let w = Number.isFinite(cropW) ? cropW : safeImgW;
    let h = Number.isFinite(cropH) ? cropH : safeImgH;

    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x >= safeImgW) x = 0;
    if (y >= safeImgH) y = 0;

    const maxW = Math.max(1, safeImgW - x);
    const maxH = Math.max(1, safeImgH - y);

    if (w <= 0) w = maxW;
    if (h <= 0) h = maxH;

    if (w > maxW) w = maxW;
    if (h > maxH) h = maxH;

    return { x, y, width: w, height: h, imgW: safeImgW, imgH: safeImgH };
}

function ensureImageCropData(img) {
    if (!(img instanceof Konva.Image)) return null;
    const imgEl = img.image();
    if (!imgEl) return null;

    const rawImgW = Number(imgEl.naturalWidth || imgEl.width || img.width() || 1);
    const rawImgH = Number(imgEl.naturalHeight || imgEl.height || img.height() || 1);
    const cropXRaw = Number.isFinite(img.cropX()) ? img.cropX() : 0;
    const cropYRaw = Number.isFinite(img.cropY()) ? img.cropY() : 0;
    const cropWRaw = Number.isFinite(img.cropWidth()) ? img.cropWidth() : rawImgW;
    const cropHRaw = Number.isFinite(img.cropHeight()) ? img.cropHeight() : rawImgH;

    const clamped = clampCropRectToImage(cropXRaw, cropYRaw, cropWRaw, cropHRaw, rawImgW, rawImgH);

    img.crop({
        x: clamped.x,
        y: clamped.y,
        width: clamped.width,
        height: clamped.height
    });
    img.width(clamped.width);
    img.height(clamped.height);

    return { imgEl, cropX: clamped.x, cropY: clamped.y, cropW: clamped.width, cropH: clamped.height, imgW: clamped.imgW, imgH: clamped.imgH };
}

function refreshImageCacheAfterCrop(img) {
    if (!img) return;
    const filters = (typeof img.filters === "function") ? (img.filters() || []) : [];
    if (img.clearCache) img.clearCache();
    if (Array.isArray(filters) && filters.length && img.cache) {
        try { img.cache({ pixelRatio: 1 }); } catch (_e) {}
    }
}

function disableCropMode(page) {
    if (!page || !page._cropMode) return;
    const img = page._cropTarget;
    if (img) {
        img.off('.crop');
        img._cropApplying = false;
        img._cropState = null;
    }

    page._cropMode = false;
    page._cropTarget = null;

    page.transformer.enabledAnchors(TRANSFORMER_ANCHORS_DEFAULT);
    page.transformer.rotateEnabled(true);
    page.transformer.keepRatio(true);
    page.transformer.borderStroke('#007cba');
    page.transformer.anchorStroke('#007cba');
    page.transformer.anchorFill('#ffffff');
    page.layer.batchDraw();
    page.transformerLayer.batchDraw();
}

function enableCropMode(page, img) {
    if (!page || !(img instanceof Konva.Image)) return false;
    if (img.getAttr && img.getAttr("isBarcode")) {
        return false;
    }
    if (Math.abs(img.rotation()) > 0.01) {
        // nie blokuj pracy — po prostu pomiń crop dla obróconych
        return false;
    }
    if ((Number(img.scaleX()) || 1) <= 0 || (Number(img.scaleY()) || 1) <= 0) {
        return false;
    }

    if (page._cropMode && page._cropTarget === img) {
        return true;
    }
    if (page._cropMode && page._cropTarget && page._cropTarget !== img) {
        disableCropMode(page);
    }

    // resetuj poprzednie handlery crop, żeby nie dublować eventów
    img.off('.crop');

    ensureImageCropData(img);

    page._cropMode = true;
    page._cropTarget = img;

    page.transformer.enabledAnchors(TRANSFORMER_ANCHORS_CROP);
    page.transformer.rotateEnabled(false);
    page.transformer.keepRatio(false);
    page.transformer.borderStroke('#007cba');
    page.transformer.anchorStroke('#007cba');
    page.transformer.anchorFill('#ffffff');
    page.transformer.nodes([img]);
    page.transformer.forceUpdate && page.transformer.forceUpdate();
    page.transformerLayer.batchDraw();

    img.on('transformstart.crop', () => {
        const anchor = page.transformer.getActiveAnchor();
        if (!isCropAnchorName(anchor)) {
            img._cropState = { isCropping: false };
            return;
        }

        const data = ensureImageCropData(img);
        if (!data) return;
        img._cropApplying = false;
        img._cropState = {
            isCropping: true,
            origX: img.x(),
            origY: img.y(),
            origScaleX: img.scaleX(),
            origScaleY: img.scaleY(),
            cropX: data.cropX,
            cropY: data.cropY,
            cropW: data.cropW,
            cropH: data.cropH,
            imgW: data.imgW,
            imgH: data.imgH
        };
    });

    img.on('transform.crop', () => {
        const s = img._cropState;
        if (!s || !s.isCropping) return;
        if (img._cropApplying) return;
        const anchor = page.transformer.getActiveAnchor();
        if (!isCropAnchorName(anchor)) return;
        img._cropApplying = true;

        const origScaleXAbs = Math.max(0.0001, Math.abs(s.origScaleX));
        const origScaleYAbs = Math.max(0.0001, Math.abs(s.origScaleY));
        const scaleFactorXRaw = Math.abs((Number(img.scaleX()) || s.origScaleX) / s.origScaleX);
        const scaleFactorYRaw = Math.abs((Number(img.scaleY()) || s.origScaleY) / s.origScaleY);
        const scaleFactorX = Number.isFinite(scaleFactorXRaw) && scaleFactorXRaw > 0 ? scaleFactorXRaw : 1;
        const scaleFactorY = Number.isFinite(scaleFactorYRaw) && scaleFactorYRaw > 0 ? scaleFactorYRaw : 1;
        const minDisplay = 20;
        const minCropW = minDisplay / origScaleXAbs;
        const minCropH = minDisplay / origScaleYAbs;

        let newCropX = s.cropX;
        let newCropY = s.cropY;
        let newCropW = s.cropW;
        let newCropH = s.cropH;
        let newX = s.origX;
        let newY = s.origY;

        if (anchor === 'middle-right') {
            newCropW = Math.max(minCropW, s.cropW * scaleFactorX);
        }
        if (anchor === 'middle-left') {
            newCropW = Math.max(minCropW, s.cropW * scaleFactorX);
            const deltaCrop = s.cropW - newCropW;
            newCropX = s.cropX + deltaCrop;
            newX = s.origX + deltaCrop * s.origScaleX;
        }
        if (anchor === 'bottom-center') {
            newCropH = Math.max(minCropH, s.cropH * scaleFactorY);
        }
        if (anchor === 'top-center') {
            newCropH = Math.max(minCropH, s.cropH * scaleFactorY);
            const deltaCrop = s.cropH - newCropH;
            newCropY = s.cropY + deltaCrop;
            newY = s.origY + deltaCrop * s.origScaleY;
        }

        const clamped = clampCropRectToImage(newCropX, newCropY, newCropW, newCropH, s.imgW, s.imgH);
        newCropX = clamped.x;
        newCropY = clamped.y;
        newCropW = clamped.width;
        newCropH = clamped.height;

        try {
            img.crop({ x: newCropX, y: newCropY, width: newCropW, height: newCropH });
            img.width(newCropW);
            img.height(newCropH);
            img.scaleX(s.origScaleX);
            img.scaleY(s.origScaleY);
            img.x(newX);
            img.y(newY);
            refreshImageCacheAfterCrop(img);
            if (typeof syncBgBlur === "function") syncBgBlur(img);
            img.getLayer()?.batchDraw();
            page.transformer.forceUpdate && page.transformer.forceUpdate();
            page.transformerLayer.batchDraw();
        } finally {
            img._cropApplying = false;
        }
    });

    img.on('transformend.crop', () => {
        const s = img._cropState;
        if (!s || !s.isCropping) return;
        img.scaleX(s.origScaleX);
        img.scaleY(s.origScaleY);
        refreshImageCacheAfterCrop(img);
        if (typeof syncBgBlur === "function") syncBgBlur(img);
        img.getLayer()?.batchDraw();
        page.transformer.forceUpdate && page.transformer.forceUpdate();
        page.transformerLayer.batchDraw();
        img._cropState = null;
    });

    return true;
}



// ==========================================================
//  WYLICZANIE CYFRY KONTROLNEJ DLA EAN-13
// ==========================================================
function calculateEAN13Checksum(code12) {
    const digits = code12.split("").map(Number);
    let sum = 0;

    for (let i = 0; i < 12; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }

    return (10 - (sum % 10)) % 10;
}

// ==========================================================
//  NORMALIZACJA EAN → zawsze 13 cyfr
// ==========================================================
function normalizeEAN(eanRaw) {
    // ================================

    let ean = eanRaw.replace(/\D/g, "");

    if (ean.length === 7) ean = ean.padStart(12, "0");

    if (ean.length === 8) return "00000" + ean;

    if (ean.length < 12) ean = ean.padStart(12, "0");

    if (ean.length === 12) {
        return ean + calculateEAN13Checksum(ean);
    }

    if (ean.length === 13) return ean;

    ean = ean.slice(0, 12);
    return ean + calculateEAN13Checksum(ean);
}
// ================================
// LOADER TNZ (CANVA STYLE – TYLKO RAZ)
// ================================
function loadTNZImage(cb) {
    if (window.TNZ_IMAGE) {
        cb(window.TNZ_IMAGE);
        return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        window.TNZ_IMAGE = img;
        cb(img);
    };

    img.onerror = (e) => {
        console.error("❌ Błąd ładowania TNZ:", TNZ_BADGE_URL, e);
    };

    img.src = TNZ_BADGE_URL;
}
// ================================
// LOADER COUNTRY RO (CANVA STYLE – TYLKO RAZ)
// ================================
function loadCountryROImage(cb) {
    if (window.COUNTRY_RO_IMAGE) {
        cb(window.COUNTRY_RO_IMAGE);
        return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        window.COUNTRY_RO_IMAGE = img;
        cb(img);
    };

    img.onerror = (e) => {
        console.error("❌ Błąd ładowania Rumunia:", COUNTRY_RO_BADGE_URL, e);
    };

    img.src = COUNTRY_RO_BADGE_URL;
}
// ================================
// LOADER COUNTRY UA (CANVA STYLE – TYLKO RAZ)
// ================================
function loadCountryUAImage(cb) {
    if (window.COUNTRY_UA_IMAGE) {
        cb(window.COUNTRY_UA_IMAGE);
        return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        window.COUNTRY_UA_IMAGE = img;
        cb(img);
    };

    img.onerror = (e) => {
        console.error("❌ Błąd ładowania Ukraina:", COUNTRY_UA_BADGE_URL, e);
    };

    img.src = COUNTRY_UA_BADGE_URL;
}




window.isEditingText = false;
// ================================
// CANVA TEXT HELPERS – Z DEMO
// ================================
function getTokensInString(text) {
    if (typeof text === "string") {
        return text.split(/[\s\n]+/).filter(t => t.length > 0);
    }
    return [];
}

function hasBrokenWords(sourceTokens, renderLines) {
    let combined = "";
    for (let i = 0; i < renderLines.length; i++) {
        combined += (i === 0 ? "" : " ") + renderLines[i].text;
    }
    const a = sourceTokens;
    const b = getTokensInString(combined);
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return true;
    }
    return false;
}

function shrinkText(textNode, minFontSize = 8) {
    const sourceTokens = getTokensInString(textNode.text());
    let brokenWords = hasBrokenWords(sourceTokens, textNode.textArr);
    let textHeight = textNode.textArr.length * textNode.textHeight;
    let textAreaHeight = textNode.height();

    while ((textHeight > textAreaHeight || brokenWords) && textNode.fontSize() > minFontSize) {
        textNode.fontSize(textNode.fontSize() - 1);
        brokenWords = hasBrokenWords(sourceTokens, textNode.textArr);
        textHeight = textNode.textArr.length * textNode.textHeight;
        textAreaHeight = textNode.height();
    }
    return textNode.fontSize();
}

function createRotationLabel(layer) {
    const label = new Konva.Label({
        opacity: 0,
        visible: false
    });
    const tag = new Konva.Tag({
        fill: "black",
        cornerRadius: 6,
        padding: 6
    });
    const text = new Konva.Text({
        text: "",
        fontSize: 16,
        fill: "white",
        fontFamily: "Arial"
    });
    label.add(tag);
    label.add(text);
    layer.add(label);
    return { label, text };
}

function compactSidebarTextNode(node) {
    if (!(node instanceof Konva.Text)) return;
    if (!(node.getAttr && node.getAttr("isSidebarText"))) return;
    if (typeof node.verticalAlign === "function") node.verticalAlign("middle");
    const pad = Math.max(6, Number(node.padding && node.padding()) || 0);
    if (typeof node.padding === "function" && node.padding() < pad) node.padding(pad);
    if (typeof node.wrap === "function") node.wrap("none");
    const lines = String(node.text() || "").replace(/\r\n/g, "\n").split("\n");
    const maxChars = lines.reduce((max, line) => Math.max(max, String(line || "").length), 0);
    const letterSpacing = Math.max(0, Number(node.letterSpacing && node.letterSpacing()) || 0);
    const measuredW = lines.reduce((max, line) => {
        const txt = String(line || " ");
        const m = (typeof node.measureSize === "function") ? node.measureSize(txt) : null;
        const w = Number(m && m.width) || 0;
        return Math.max(max, w);
    }, 0);
    const extraSpacingW = Math.max(0, maxChars - 1) * letterSpacing;
    const strokeW = Math.max(0, Number(node.strokeWidth && node.strokeWidth()) || 0);
    const textW = measuredW + extraSpacingW + strokeW;
    const minW = Math.max(24, Math.ceil(textW) + (pad * 2) + 10);
    const currentW = Math.max(0, Number(node.width && node.width()) || 0);
    node.width(Math.max(currentW, minW));
    const lineCount = Array.isArray(node.textArr) && node.textArr.length ? node.textArr.length : Math.max(1, String(node.text() || "").split("\n").length);
    const textH = Math.ceil((Number(node.textHeight || 0) || Number(node.fontSize && node.fontSize()) || 12) * lineCount);
    const minH = Math.max(18, textH + (pad * 2));
    const currentH = Math.max(0, Number(node.height && node.height()) || 0);
    node.height(Math.max(currentH, minH));
    const st = typeof node.getStage === "function" ? node.getStage() : null;
    const stageW = st && typeof st.width === "function" ? Number(st.width()) : 0;
    const stageH = st && typeof st.height === "function" ? Number(st.height()) : 0;
    if (stageW > 0 && stageH > 0) {
        const maxX = Math.max(0, stageW - node.width());
        const maxY = Math.max(0, stageH - node.height());
        if (typeof node.x === "function") node.x(Math.max(0, Math.min(maxX, Number(node.x()) || 0)));
        if (typeof node.y === "function") node.y(Math.max(0, Math.min(maxY, Number(node.y()) || 0)));
    }
}
window.compactSidebarTextNode = compactSidebarTextNode;
window.allProducts = [];
window.pages = [];

// ================================
// LOADER COUNTRY LT (CANVA STYLE – TYLKO RAZ)
// ================================
function loadCountryLTImage(cb) {
    if (window.COUNTRY_LT_IMAGE) {
        cb(window.COUNTRY_LT_IMAGE);
        return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        window.COUNTRY_LT_IMAGE = img;
        cb(img);
    };

    img.onerror = (e) => {
        console.error("❌ Błąd ładowania Litwa:", COUNTRY_LT_BADGE_URL, e);
    };

    img.src = COUNTRY_LT_BADGE_URL;
}
// ================================
// LOADER COUNTRY BG (CANVA STYLE – TYLKO RAZ)
// ================================
function loadCountryBGImage(cb) {
    if (window.COUNTRY_BG_IMAGE) {
        cb(window.COUNTRY_BG_IMAGE);
        return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        window.COUNTRY_BG_IMAGE = img;
        cb(img);
    };

    img.onerror = (e) => {
        console.error("❌ Błąd ładowania Bulgaria:", COUNTRY_BG_BADGE_URL, e);
    };

    img.src = COUNTRY_BG_BADGE_URL;
}

// ================================
// LOADER COUNTRY PL (CANVA STYLE – TYLKO RAZ)
// ================================
function loadCountryPLImage(cb) {
    if (window.COUNTRY_PL_IMAGE) {
        cb(window.COUNTRY_PL_IMAGE);
        return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        window.COUNTRY_PL_IMAGE = img;
        cb(img);
    };

    img.onerror = (e) => {
        console.error("❌ Błąd ładowania Polska:", COUNTRY_PL_BADGE_URL, e);
    };

    img.src = COUNTRY_PL_BADGE_URL;
}


// =====================================================
// CENTRALNA FUNKCJA BUDOWANIA STRON Z PRODUKTÓW
// =====================================================
window.buildPagesFromProducts = function (products) {

    if (!Array.isArray(products) || products.length === 0) {
        console.warn("Brak produktów – nie buduję stron");
        return;
    }

    // 🔥 usuń stare strony
    pages.forEach(p => {
        p.stage?.destroy();
        p.container?.remove();
    });

    pages.length = 0;
    document.getElementById('pagesContainer').innerHTML = '';

    const perPage = COLS * ROWS;

    for (let i = 0; i < products.length; i += perPage) {
        const prods = products.slice(i, i + perPage);
        createPage(Math.floor(i / perPage) + 1, prods);
    }

    console.log("📄 Strony przebudowane. Layout:", window.LAYOUT_MODE);
};


const MM_TO_PX = 3.78;
const PAGE_MARGIN = 15 * MM_TO_PX;  // ~56.7px
const BOTTOM_MARGIN_TARGET = 18 * MM_TO_PX; // 18mm
const BOTTOM_MARGIN_DELTA = (28 + PAGE_MARGIN) - BOTTOM_MARGIN_TARGET;
// ================================
// CANVA STYLE SHADOW – DLA ZDJĘĆ
// ================================
const IMAGE_SHADOW = {
    color: 'rgba(0,0,0,0.25)',
    blur: 18,
    offsetX: 0,
    offsetY: 8,
    opacity: 1
};

function addImageShadow(layer, img) {
    if (!img) return;
    // nie dodawaj cienia do zdjęć produktów (ramki wyglądały źle)
    if (img.getAttr && img.getAttr("isProductImage")) return;
    img.shadowColor(IMAGE_SHADOW.color);
    img.shadowBlur(IMAGE_SHADOW.blur);
    img.shadowOffset({ x: IMAGE_SHADOW.offsetX, y: IMAGE_SHADOW.offsetY });
    img.shadowOpacity(IMAGE_SHADOW.opacity);
    if (layer) img.moveToTop();
}

function setupProductImageDrag(img, layer) {
    if (!img) return;
    img.draggable(true);
    img.listening(true);
    if (img.off) img.off(".productDrag");
    const disableBoxes = () => {
        if (!layer) return;
        layer.find(n => n.getAttr && n.getAttr("isBox")).forEach(b => {
            if (b.getAttr("boxListenWas")) return;
            b.setAttr("boxListenWas", b.listening());
            b.listening(false);
        });
    };
    const restoreBoxes = () => {
        if (!layer) return;
        layer.find(n => n.getAttr && n.getAttr("isBox")).forEach(b => {
            const prev = b.getAttr("boxListenWas");
            if (prev !== undefined) {
                b.listening(!!prev);
                b.setAttr("boxListenWas", undefined);
            }
        });
        layer.batchDraw();
    };
    img.on('mousedown.productDrag touchstart.productDrag', () => {
        disableBoxes();
    });
    img.on('mouseup.productDrag touchend.productDrag dragend.productDrag', () => {
        restoreBoxes();
    });
    ensureImageFX(img, layer);
}

function normalizeHexColor(color, fallback = "#000000") {
    if (!color) return fallback;
    if (typeof color === "string" && color.startsWith("#")) return color;
    const m = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return fallback;
    const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

function isNodeDestroyed(node) {
    if (!node) return true;
    if (typeof node.isDestroyed === "function") return node.isDestroyed();
    return !!node._destroyed;
}

function getImageFxState(img) {
    return {
        opacity: Number.isFinite(img.getAttr("fxOpacity")) ? img.getAttr("fxOpacity") : (img.opacity ? img.opacity() : 1),
        shadowEnabled: typeof img.getAttr("fxShadowEnabled") === "boolean"
            ? img.getAttr("fxShadowEnabled")
            : (img.shadowBlur && img.shadowBlur() > 0),
        shadowColor: img.getAttr("fxShadowColor") || normalizeHexColor(img.shadowColor ? img.shadowColor() : "#000000"),
        shadowBlur: Number.isFinite(img.getAttr("fxShadowBlur")) ? img.getAttr("fxShadowBlur") : 0,
        shadowOffsetX: Number.isFinite(img.getAttr("fxShadowOffsetX")) ? img.getAttr("fxShadowOffsetX") : (img.shadowOffsetX ? img.shadowOffsetX() : 0),
        shadowOffsetY: Number.isFinite(img.getAttr("fxShadowOffsetY")) ? img.getAttr("fxShadowOffsetY") : (img.shadowOffsetY ? img.shadowOffsetY() : 0),
        shadowOpacity: Number.isFinite(img.getAttr("fxShadowOpacity")) ? img.getAttr("fxShadowOpacity") : 0.35,
        brightness: Number.isFinite(img.getAttr("fxBrightness")) ? img.getAttr("fxBrightness") : 0,
        contrast: Number.isFinite(img.getAttr("fxContrast")) ? img.getAttr("fxContrast") : 0,
        saturation: Number.isFinite(img.getAttr("fxSaturation")) ? img.getAttr("fxSaturation") : 0,
        temperature: Number.isFinite(img.getAttr("fxTemperature")) ? img.getAttr("fxTemperature") : 0,
        grayscale: !!img.getAttr("fxGrayscale"),
        sepia: !!img.getAttr("fxSepia"),
        strokeColor: img.getAttr("fxStrokeColor") || "#000000",
        strokeWidth: Number.isFinite(img.getAttr("fxStrokeWidth")) ? img.getAttr("fxStrokeWidth") : 0,
        bgBlur: Number.isFinite(img.getAttr("fxBgBlur")) ? img.getAttr("fxBgBlur") : 0
    };
}

function ensureImageFX(img, layer) {
    if (!img || img.getAttr("fxReady")) return;
    img.setAttr("fxReady", true);
    const fx = getImageFxState(img);
    img.setAttr("fxOpacity", fx.opacity);
    img.setAttr("fxShadowEnabled", fx.shadowEnabled);
    img.setAttr("fxShadowColor", fx.shadowColor);
    img.setAttr("fxShadowBlur", fx.shadowBlur);
    img.setAttr("fxShadowOffsetX", fx.shadowOffsetX);
    img.setAttr("fxShadowOffsetY", fx.shadowOffsetY);
    img.setAttr("fxShadowOpacity", fx.shadowOpacity);
    img.setAttr("fxBrightness", fx.brightness);
    img.setAttr("fxContrast", fx.contrast);
    img.setAttr("fxSaturation", fx.saturation);
    img.setAttr("fxTemperature", fx.temperature);
    img.setAttr("fxGrayscale", fx.grayscale);
    img.setAttr("fxSepia", fx.sepia);
    img.setAttr("fxStrokeColor", fx.strokeColor);
    img.setAttr("fxStrokeWidth", fx.strokeWidth);
    img.setAttr("fxBgBlur", fx.bgBlur);

    if (img.strokeScaleEnabled) img.strokeScaleEnabled(false);

    if (img.off) img.off(".fxPerf");
    img.on("dragstart.fxPerf transformstart.fxPerf", () => suspendImageFX(img, true));
    img.on("dragend.fxPerf transformend.fxPerf", () => suspendImageFX(img, false));
    img.on("destroy.fx", () => {
        if (img._bgBlurClone && !isNodeDestroyed(img._bgBlurClone)) {
            img._bgBlurClone.destroy();
        }
        img._bgBlurClone = null;
    });

    if (layer && layer.batchDraw) layer.batchDraw();
}

function suspendImageFX(img, suspend) {
    if (!img) return;
    if (typeof img.isDestroyed === "function" && img.isDestroyed()) return;
    if (suspend) {
        img.setAttr("fxSuspended", true);
        if (img._bgBlurClone && !isNodeDestroyed(img._bgBlurClone)) {
            img._bgBlurClone.visible(false);
        }
        if (img.filters) {
            const currentFilters = img.filters() || [];
            if (Array.isArray(currentFilters) && currentFilters.length) {
                img._fxSavedFilters = currentFilters;
                img.filters([]);
                if (img.clearCache) img.clearCache();
            }
        }
    } else {
        img.setAttr("fxSuspended", false);
        if (img._bgBlurClone && !isNodeDestroyed(img._bgBlurClone)) {
            img._bgBlurClone.visible(true);
        }
        applyImageFX(img);
    }
}

function ensureBgBlurClone(img) {
    if (!img || !img.getLayer) return null;
    const layer = img.getLayer();
    if (!layer) return null;
    if (img._bgBlurClone && !isNodeDestroyed(img._bgBlurClone)) return img._bgBlurClone;
    const clone = img.clone({ listening: false, draggable: false });
    clone.setAttr("isBgBlur", true);
    clone.setAttr("isFxHelper", true);
    clone.setAttr("selectable", false);
    clone.setAttr("isProductImage", false);
    clone.setAttr("isOverlayElement", false);
    clone.setAttr("slotIndex", null);
    clone.opacity(0.45);
    if (clone.filters) {
        clone.filters([Konva.Filters.Blur]);
        clone.blurRadius(10);
    }
    clone.listening(false);
    clone.draggable(false);
    clone.perfectDrawEnabled(false);
    layer.add(clone);
    // ustaw poniżej oryginału
    const z = Math.max(1, img.getZIndex() - 1);
    clone.setZIndex(z);
    img._bgBlurClone = clone;
    return clone;
}

function syncBgBlur(img) {
    if (!img) return;
    if (typeof img.isDestroyed === "function" && img.isDestroyed()) return;
    const fxBgBlur = Number.isFinite(img.getAttr("fxBgBlur")) ? img.getAttr("fxBgBlur") : 0;
    if (!fxBgBlur || fxBgBlur <= 0) {
        if (img._bgBlurClone && !isNodeDestroyed(img._bgBlurClone)) {
            img._bgBlurClone.remove();
            img._bgBlurClone.destroy();
        }
        img._bgBlurClone = null;
        return;
    }
    const clone = ensureBgBlurClone(img);
    if (!clone) return;
    clone.x(img.x());
    clone.y(img.y());
    clone.scaleX(img.scaleX());
    clone.scaleY(img.scaleY());
    clone.rotation(img.rotation());
    clone.offsetX(img.offsetX());
    clone.offsetY(img.offsetY());
    clone.width(img.width());
    clone.height(img.height());
    const cw = Number.isFinite(img.cropWidth()) ? img.cropWidth() : null;
    const ch = Number.isFinite(img.cropHeight()) ? img.cropHeight() : null;
    if (cw && ch) {
        clone.crop({ x: img.cropX(), y: img.cropY(), width: cw, height: ch });
    }
    if (clone.blurRadius) clone.blurRadius(fxBgBlur);
    if (clone.filters) {
        clone.filters([Konva.Filters.Blur]);
    }
    clone.opacity(0.45);
    // trzymaj pod oryginałem
    const z = Math.max(1, img.getZIndex() - 1);
    clone.setZIndex(z);
    clone.getLayer()?.batchDraw();
}

function applyImageFX(img) {
    if (!img) return;
    if (img.getAttr && img.getAttr("isBgBlur")) return;
    if (typeof img.isDestroyed === "function" && img.isDestroyed()) return;
    if (img._fxApplying) return;
    img._fxApplying = true;
    try {
        ensureImageFX(img);
        const fx = getImageFxState(img);

        img.opacity(fx.opacity);

    // obrys/ramka
    if (fx.strokeWidth && fx.strokeWidth > 0) {
        img.strokeEnabled(true);
        img.stroke(fx.strokeColor);
        img.strokeWidth(fx.strokeWidth);
    } else {
        img.strokeEnabled(false);
        img.strokeWidth(0);
    }

    // cień
    const shadowOn = !!fx.shadowEnabled && (fx.shadowBlur > 0 || fx.shadowOpacity > 0);
    img.shadowEnabled(shadowOn);
    if (shadowOn) {
        img.shadowColor(fx.shadowColor);
        img.shadowBlur(fx.shadowBlur);
        img.shadowOffset({ x: fx.shadowOffsetX, y: fx.shadowOffsetY });
        img.shadowOpacity(fx.shadowOpacity);
        img.setAttr("fxShadowEnabled", true);
    }

    // filtry
    const filters = [];
    const useHSL = (fx.saturation !== 0 || fx.temperature !== 0);
    if (fx.grayscale && Konva.Filters.Grayscale) filters.push(Konva.Filters.Grayscale);
    if (fx.sepia && Konva.Filters.Sepia) filters.push(Konva.Filters.Sepia);
    if (useHSL && Konva.Filters.HSL) filters.push(Konva.Filters.HSL);
    if (fx.brightness !== 0 && Konva.Filters.Brighten) filters.push(Konva.Filters.Brighten);
    if (fx.contrast !== 0 && Konva.Filters.Contrast) filters.push(Konva.Filters.Contrast);

    if (filters.length) {
        img.filters(filters);
        if (img.clearCache) img.clearCache();
        img.cache({ pixelRatio: 1 });
        if (useHSL && img.hue) {
            const hue = fx.temperature * 0.4; // -40..40
            img.hue(hue);
            if (img.saturation) img.saturation(fx.saturation / 100);
            if (img.luminance) img.luminance(0);
        }
        if (img.brightness) img.brightness(fx.brightness / 100);
        if (img.contrast) img.contrast(fx.contrast);
    } else {
        img.filters([]);
        if (img.clearCache) img.clearCache();
    }

        syncBgBlur(img);
        img.getLayer()?.batchDraw();
    } finally {
        img._fxApplying = false;
    }
}

function fixProductTextSlotIndex(page) {
    if (!page || !page.layer) return;
    const boxes = page.layer.find(n => n.getAttr && n.getAttr("isBox"));
    if (!boxes.length) return;
    const texts = page.layer.find(n =>
        n instanceof Konva.Text &&
        n.getAttr("isProductText") &&
        !Number.isFinite(n.getAttr("slotIndex"))
    );
    texts.forEach(t => {
        const tRect = t.getClientRect({ relativeTo: page.layer });
        const match = boxes.find(b => {
            const bRect = b.getClientRect({ relativeTo: page.layer });
            return Konva.Util.haveIntersection(tRect, bRect);
        });
        if (match) {
            t.setAttr("slotIndex", match.getAttr("slotIndex"));
        }
    });
}

window.fixProductImageDrag = function() {
    if (!Array.isArray(window.pages)) return;
    window.pages.forEach(p => {
        const imgs = p.layer.find(n => n instanceof Konva.Image && n.getAttr("isProductImage"));
        imgs.forEach(img => setupProductImageDrag(img, p.layer));
        p.layer.batchDraw();
    });
};

window.W = 794 + PAGE_MARGIN * 2;
window.H = 1123 + PAGE_MARGIN * 2;
// Użyj szerokości strony jako odniesienie dla paneli UI
document.documentElement.style.setProperty('--page-width', `${window.W}px`);
document.documentElement.style.setProperty('--panel-center-offset', `0px`);

function setupImportPanelToggle() {
    const panel = document.getElementById('importPanel');
    const toggle = document.getElementById('importPanelToggle');
    if (!panel || !toggle) return;

    const setState = (collapsed) => {
        panel.classList.toggle('collapsed', collapsed);
        toggle.setAttribute('aria-expanded', (!collapsed).toString());
        toggle.title = collapsed ? 'Rozwiń panel' : 'Zwiń panel';
        const icon = toggle.querySelector('.panel-toggle-icon');
        if (icon) icon.textContent = collapsed ? '▾' : '▴';
        const text = toggle.querySelector('.panel-toggle-text');
        if (text) text.textContent = collapsed ? 'Rozwiń' : 'Zwiń';
    };

    setState(panel.classList.contains('collapsed'));

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setState(!panel.classList.contains('collapsed'));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupImportPanelToggle);
} else {
    setupImportPanelToggle();
}

let ML = 14 + PAGE_MARGIN;  // lewy margines strony + 15mm
let MT = 140 + PAGE_MARGIN + BOTTOM_MARGIN_DELTA; // przesunięcie w dół
let MB = BOTTOM_MARGIN_TARGET;  // docelowo ~18mm
let COLS = 2, ROWS = 3, GAP = 6;
window.LAYOUT_MODE = "layout6"; // DOMYŚLNY LAYOUT
window.CATALOG_STYLE = window.CATALOG_STYLE || "default";
let BW = 0;           // GLOBALNIE – bazowa szerokość boxa
let BH = 0;           // GLOBALNIE – bazowa wysokość boxa
let BW_dynamic = 0;   // GLOBALNIE – dostępne wszędzie
let BH_dynamic = 0;   // GLOBALNIE – dostępne wszędzie
// =============================
// PREDEFINIOWANE USTAWIENIA
// =============================
const layout6Defaults = {
    COLS: 2,
    ROWS: 3,
    GAP: 6,
    MT: 140 + BOTTOM_MARGIN_DELTA,
    scaleBox: 1
};

const layout8Defaults = {
    COLS: 2,
    ROWS: 4,
    GAP: 5,     // bardzo mały odstęp 5 mm
    MT: 200 + BOTTOM_MARGIN_DELTA,    // opuszczamy siatkę niżej
    scaleBox: 1.00   // boxy 25% mniejsze
};

// === SKALA CENY (większa i proporcjonalna dla całej grupy ceny) ===
const PRICE_SIZE_MULTIPLIER_LAYOUT6 = 1.8;
const PRICE_SIZE_MULTIPLIER_LAYOUT8 = 1.15;


// === GLOBALNY CLIPBOARD + PASTE MODE ===
window.globalClipboard = null;
window.globalPasteMode = false;
window.globalStyleClipboard = null;
window.globalStylePasteMode = false;

const STYLE_KEYS = [
    "fill",
    "stroke",
    "strokeWidth",
    "opacity",
    "cornerRadius",
    "dash",
    "lineCap",
    "lineJoin",
    "shadowColor",
    "shadowBlur",
    "shadowOpacity",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "textDecoration",
    "align",
    "verticalAlign",
    "lineHeight",
    "letterSpacing",
    "padding"
];
const GEOMETRY_STYLE_KEYS = ["width", "height", "scaleX", "scaleY", "rotation"];

function cloneStyleValue(v) {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.slice();
    if (typeof v === "object") return JSON.parse(JSON.stringify(v));
    return v;
}

function readStyleAttrs(node) {
    const out = {};
    const attrs = (node && node.getAttrs) ? node.getAttrs() : {};
    STYLE_KEYS.forEach((k) => {
        if (attrs[k] !== undefined && attrs[k] !== null) {
            out[k] = cloneStyleValue(attrs[k]);
            return;
        }
        if (node && typeof node[k] === "function") {
            try {
                const v = node[k]();
                if (v !== undefined && v !== null) out[k] = cloneStyleValue(v);
            } catch (_) {}
        }
    });
    GEOMETRY_STYLE_KEYS.forEach((k) => {
        if (node && typeof node[k] === "function") {
            try {
                const v = node[k]();
                if (v !== undefined && v !== null) out[k] = cloneStyleValue(v);
            } catch (_) {}
        }
    });

    if (node && typeof node.shadowOffsetX === "function" && typeof node.shadowOffsetY === "function") {
        out.shadowOffsetX = node.shadowOffsetX() || 0;
        out.shadowOffsetY = node.shadowOffsetY() || 0;
    }
    return out;
}

function writeStyleAttrs(node, attrs, copyGeometry = false) {
    if (!node || !attrs) return false;
    let changed = false;
    Object.keys(attrs).forEach((k) => {
        if (k === "shadowOffsetX" || k === "shadowOffsetY") return;
        if (!copyGeometry && GEOMETRY_STYLE_KEYS.includes(k)) return;
        const v = attrs[k];
        if (v === undefined || v === null) return;
        if (typeof node[k] === "function") {
            node[k](cloneStyleValue(v));
            changed = true;
        } else if (node.setAttr) {
            node.setAttr(k, cloneStyleValue(v));
            changed = true;
        }
    });

    if ((attrs.shadowOffsetX !== undefined || attrs.shadowOffsetY !== undefined) && typeof node.shadowOffset === "function") {
        node.shadowOffset({
            x: attrs.shadowOffsetX || 0,
            y: attrs.shadowOffsetY || 0
        });
        changed = true;
    }
    return changed;
}

function extractNodeStyle(node) {
    if (!node) return null;

    const style = {
        kind: "node",
        className: node.getClassName ? node.getClassName() : "",
        attrs: readStyleAttrs(node),
        meta: {
            sourceIsBox: !!(node.getAttr && node.getAttr("isBox")),
            sourceIsBarcode: !!(node.getAttr && node.getAttr("isBarcode")),
            sourceIsPriceGroup: !!(node.getAttr && node.getAttr("isPriceGroup")),
            copyGeometry: !!(node.getAttr && (
                node.getAttr("isBox") ||
                node.getAttr("isPriceGroup") ||
                node.getAttr("isShape") ||
                node.getAttr("isPreset") ||
                node.getAttr("isUserGroup")
            ))
        }
    };

    if (node instanceof Konva.Image) {
        style.kind = "image";
        style.imageFX = node.getAttr ? cloneStyleValue(node.getAttr("imageFX")) : null;
        if (node.getAttr && node.getAttr("isBarcode")) {
            style.barcode = {
                color: node.getAttr("barcodeColor") || "#000000",
                isBarcode: true
            };
        }
    } else if (node instanceof Konva.Text) {
        style.kind = "text";
    } else if (node instanceof Konva.Group) {
        style.kind = "group";
        style.children = node.getChildren().map((child) => extractNodeStyle(child));
    } else if (node instanceof Konva.Rect) {
        style.kind = "rect";
    }

    return style;
}

function applyNodeStyle(target, style, inheritedCopyGeometry = false) {
    if (!target || !style) return false;

    const copyGeometry = !!(inheritedCopyGeometry || (style.meta && style.meta.copyGeometry));
    let changed = writeStyleAttrs(target, style.attrs || {}, copyGeometry);

    if (style.kind === "group" && target instanceof Konva.Group && Array.isArray(style.children)) {
        const targetChildren = target.getChildren();
        const len = Math.min(targetChildren.length, style.children.length);
        for (let i = 0; i < len; i++) {
            if (applyNodeStyle(targetChildren[i], style.children[i], copyGeometry)) {
                changed = true;
            }
        }
    }

    if (style.kind === "image" && target instanceof Konva.Image) {
        if (style.imageFX && target.setAttr) {
            target.setAttr("imageFX", cloneStyleValue(style.imageFX));
            if (typeof ensureImageFX === "function") ensureImageFX(target, target.getLayer?.());
            if (typeof applyImageFX === "function") applyImageFX(target);
            changed = true;
        }
        if (
            style.barcode &&
            style.barcode.isBarcode &&
            target.getAttr &&
            target.getAttr("isBarcode") &&
            typeof window.recolorBarcode === "function"
        ) {
            window.recolorBarcode(target, style.barcode.color || "#000000", true);
            changed = true;
        }
    }

    return changed;
}

// === USTAWIENIA KATALOGU (GLOBALNE) ===
window.catalogSettings = {
    priceFormat: 'full'
};

// === ZOOM DLA CAŁEJ STRONY ===
let currentZoom = 1.0;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;

function applyZoomToPage(page, scale) {
    const wrapper = page.container.querySelector('.canvas-wrapper');
    if (!wrapper) return;
    const zoomWrapWidth = Math.round(W);

    // Zoom obejmuje CAŁY blok strony: toolbar + canvas + przycisk dodawania strony.
    let zoomWrap = page.container.querySelector('.page-zoom-wrap');
    const toolbar = page.container.querySelector('.page-toolbar');
    const addBtnWrap = page.container.querySelector('.add-page-btn-wrapper');

    if (!zoomWrap) {
        zoomWrap = document.createElement('div');
        zoomWrap.className = 'page-zoom-wrap';
        zoomWrap.style.width = `${zoomWrapWidth}px`;
        zoomWrap.style.margin = '0 auto';
        zoomWrap.style.position = 'relative';
        wrapper.parentNode.insertBefore(zoomWrap, wrapper);
    }

    // Uporządkuj strukturę: toolbar -> canvas -> add button w środku zoomWrap.
    if (toolbar && toolbar.parentNode !== zoomWrap) {
        zoomWrap.appendChild(toolbar);
    }
    if (wrapper.parentNode !== zoomWrap) {
        zoomWrap.appendChild(wrapper);
    }
    if (addBtnWrap && addBtnWrap.parentNode !== zoomWrap) {
        zoomWrap.appendChild(addBtnWrap);
    }

    zoomWrap.style.width = `${zoomWrapWidth}px`;
    if (page && page.container && page.container.style) {
        page.container.style.width = `${zoomWrapWidth}px`;
    }

    // Reset transformy na dzieciach — skaluje tylko kontener
    if (toolbar) toolbar.style.transform = 'none';
    wrapper.style.transform = 'none';
    if (addBtnWrap) addBtnWrap.style.transform = 'none';

    const layoutSignature = `${toolbar ? 1 : 0}|${addBtnWrap ? 1 : 0}|${zoomWrap.childElementCount}`;
    if (page._zoomLayoutSignature !== layoutSignature || !Number.isFinite(page._zoomBaseHeight)) {
        const prevTransition = zoomWrap.style.transition;
        const prevTransform = zoomWrap.style.transform;
        zoomWrap.style.transition = 'none';
        zoomWrap.style.transform = 'none';
        page._zoomBaseHeight = zoomWrap.getBoundingClientRect().height || (H + 160);
        page._zoomLayoutSignature = layoutSignature;
        zoomWrap.style.transform = prevTransform || 'none';
        zoomWrap.style.transition = prevTransition || '';
    }

    zoomWrap.style.transition = 'transform 0.15s ease-out';
    zoomWrap.style.transform = `scale(${scale})`;
    zoomWrap.style.transformOrigin = 'top center';
    zoomWrap.style.marginBottom = `${Math.max(0, (scale - 1) * page._zoomBaseHeight)}px`;

    if (page.stage) page.stage.batchDraw();
}

// Styl kontenera zoomu (żeby przycisk pod stroną zachował się jak w Canva)
if (!document.getElementById('pageZoomWrapStyle')) {
    const zw = document.createElement('style');
    zw.id = 'pageZoomWrapStyle';
    zw.textContent = `
      .page-zoom-wrap { display: block; }
    `;
    document.head.appendChild(zw);
}

function createZoomSlider() {
    if (document.getElementById('zoomSlider')) return;

    const sidebarEl = document.querySelector('.sidebar');
    if (sidebarEl) sidebarEl.classList.add('has-footer');

    // Footer bar (Canva-like) – przypięta do dołu
    let footer = document.getElementById('appFooterBar');
    if (!footer) {
        footer = document.createElement('div');
        footer.id = 'appFooterBar';
        footer.style.cssText = `
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            height: 56px;
            background: rgba(248,250,252,0.96);
            border-top: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 0 18px;
            z-index: 100000;
            backdrop-filter: blur(6px);
            pointer-events: auto;
        `;
        document.body.appendChild(footer);
    }

    const slider = document.createElement('div');
    slider.id = 'zoomSlider';
    slider.style.cssText = `
        background: #ffffff;
        padding: 6px 10px;
        border-radius: 999px;
        box-shadow: 0 6px 16px rgba(15,23,42,0.18);
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: Arial;
        border: 1px solid #e5e7eb;
        pointer-events: auto;
        margin-right: 180px; /* odsunięcie od prawego panelu */
    `;

    slider.innerHTML = `
        <button class="zoom-btn" data-delta="-0.1" type="button" onclick="window.changeZoom && window.changeZoom(-0.1)">−</button>
        <input type="range" id="zoomRange" min="${ZOOM_MIN}" max="${ZOOM_MAX}" step="0.1" value="1" class="zoom-range">
        <span id="zoomValue" class="zoom-val">100%</span>
        <button class="zoom-btn" data-delta="0.1" type="button" onclick="window.changeZoom && window.changeZoom(0.1)">+</button>
    `;

    footer.appendChild(slider);

    const range = document.getElementById('zoomRange');
    const value = document.getElementById('zoomValue');

    const updateZoomTrack = () => {
        const min = parseFloat(range.min);
        const max = parseFloat(range.max);
        const val = parseFloat(range.value);
        const pct = ((val - min) / (max - min)) * 100;
        range.style.background = `linear-gradient(90deg, #6b7280 ${pct}%, #e5e7eb ${pct}%)`;
    };

    window.changeZoom = (delta) => {
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, currentZoom + delta));
        range.value = newZoom;
        currentZoom = newZoom;
        value.textContent = Math.round(newZoom * 100) + '%';
        pages.forEach(p => applyZoomToPage(p, newZoom));
        updateZoomTrack();
    };

    range.oninput = () => {
        currentZoom = parseFloat(range.value);
        value.textContent = Math.round(currentZoom * 100) + '%';
        pages.forEach(p => applyZoomToPage(p, currentZoom));
        updateZoomTrack();
    };

    slider.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const delta = parseFloat(btn.dataset.delta || "0");
            if (!delta || Number.isNaN(delta)) return;
            window.changeZoom(delta);
        });
    });

    // awaryjny delegowany handler (gdyby ktoś nadpisał eventy)
    slider.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.zoom-btn');
        if (!btn) return;
        ev.preventDefault();
        ev.stopPropagation();
        const delta = parseFloat(btn.dataset.delta || "0");
        if (!delta || Number.isNaN(delta)) return;
        window.changeZoom(delta);
    });

    updateZoomTrack();

    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === '0') {
            e.preventDefault();
            range.value = 1;
            currentZoom = 1.0;
            value.textContent = '100%';
            pages.forEach(p => applyZoomToPage(p, 1.0));
        }
    });
}

// Styl suwaka zoom (Canva-like)
if (!document.getElementById('zoomSliderStyle')) {
    const zs = document.createElement('style');
    zs.id = 'zoomSliderStyle';
    zs.textContent = `
      #appFooterBar .zoom-btn{
        width: 32px;
        height: 32px;
        border-radius: 10px;
        border: 1px solid #d1d5db;
        color: #374151;
        background: #f9fafb;
        font-size: 20px;
        line-height: 1;
        font-weight: 700;
        cursor: pointer;
      }
      #appFooterBar .zoom-btn:active{
        transform: translateY(1px);
      }
      #appFooterBar .zoom-range{
        width: 150px;
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(90deg, #6b7280 0%, #e5e7eb 0%);
        outline: none;
        -webkit-appearance: none;
      }
      #appFooterBar .zoom-btn,
      #appFooterBar .zoom-range,
      #appFooterBar .zoom-val{
        pointer-events: auto;
      }
      #appFooterBar .zoom-range::-webkit-slider-thumb{
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: #6b7280;
        border: 2px solid #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      #appFooterBar .zoom-range::-moz-range-thumb{
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: #6b7280;
        border: 2px solid #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      #appFooterBar .zoom-val{
        font-weight: 700;
        color: #111827;
        min-width: 48px;
        text-align: center;
      }
    `;
    document.head.appendChild(zs);
}

// Delegowany handler zoom +/- (awaryjnie dla już istniejącego slidera)
if (!window._zoomBtnDelegated) {
    window._zoomBtnDelegated = true;
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#zoomSlider .zoom-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = parseFloat(btn.dataset.delta || "0");
        if (Number.isNaN(delta) || delta === 0) return;
        if (typeof window.changeZoom === "function") {
            window.changeZoom(delta);
        }
    }, true);
}


// === IMPORT EXCEL (POMIJA NAGŁÓWEK) ===
window.importExcelMultiPage = async function() {
    const file = document.getElementById('excelFile')?.files[0];
    if (!file) return alert('Wybierz plik Excel!');

    // 🔥 WYBÓR LAYOUTU – Z edytor.js (lub szybki kreator)
    if (window.quickCreatorExcelPick && window.quickCreatorLayout) {
        window.LAYOUT_MODE = window.quickCreatorLayout;
        window.quickCreatorLayout = null;
        window.quickCreatorExcelPick = false;
    } else {
        window.LAYOUT_MODE = await window.openLayoutSelector();
    }


    let scaleBox = 1;

// -------------------------------
// USTAWIENIA DLA LAYOUTU 6
// -------------------------------
if (window.LAYOUT_MODE === "layout6") {
    COLS = layout6Defaults.COLS;
    ROWS = layout6Defaults.ROWS;
    GAP  = layout6Defaults.GAP;
    MT   = layout6Defaults.MT;
    scaleBox = layout6Defaults.scaleBox;
}

// -------------------------------
// USTAWIENIA DLA LAYOUTU 8
// -------------------------------
if (window.LAYOUT_MODE === "layout8") {
    COLS = layout8Defaults.COLS;
    ROWS = layout8Defaults.ROWS;
    GAP  = layout8Defaults.GAP;
    MT   = layout8Defaults.MT;
    scaleBox = layout8Defaults.scaleBox;
}




if (window.LAYOUT_MODE === "layout6"){
    COLS = 2;
    ROWS = 3;
}
// =====================================================
//   PRZELICZANIE ROZMIARÓW BOXÓW *PO* WYBORZE LAYOUTU
// =====================================================

// standardowe parametry
// -------------------------------
// PRZELICZENIE ROZMIARÓW BOXÓW
// -------------------------------
BW = (W - ML * 2 - GAP * (COLS - 1)) / COLS;
BH = (H - MT - MB - GAP * (ROWS - 1)) / ROWS;

BW_dynamic = BW * scaleBox;
BH_dynamic = BH * scaleBox;



// 3️⃣ Przelicz wysokość i szerokość boxów
const perPage = COLS * ROWS;


    try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).slice(1);

  allProducts = json.map(row => ({
    INDEKS: String(row[0] || '').trim(),        // A
    NAZWA: String(row[1] || '').trim(),         // B
    JEDNOSTKA: String(row[2] || '').trim(),     // C  ✅ NOWE
    CENA: String(row[3] || '').trim(),          // D
    'KOD EAN': String(row[4] || '').trim(),     // E
    TNZ: String(row[5] || '').trim(),           // F
    RANKING: String(row[6] || '').trim(),       // G
    LOGO: String(row[7] || '').trim(),          // H
    KRAJPOCHODZENIA: String(row[8] || '').trim()// I
}))



        pages.forEach(p => {
            p.stage?.destroy();
            p.container?.remove();
        });
        pages = [];
        document.getElementById('pagesContainer').innerHTML = '';

        window.ExcelImporterReady = true;
        window.ExcelImporter = { pages };

        buildPagesFromProducts(allProducts);
        window.projectOpen = true;
        window.projectDirty = true;
        if (typeof window.quickStatusUpdate === "function") {
            window.quickStatusUpdate("excel", true);
        }
        // Jeśli zdjęcia były już wybrane (np. szybki kreator) – zaimportuj je po zbudowaniu stron
        if (window.quickImageFiles && window.quickImageFiles.length > 0) {
            if (typeof window.importImagesFromFiles === "function") {
                window.importImagesFromFiles(window.quickImageFiles);
            }
        } else {
            const imgInput = document.getElementById('imageInput');
            if (imgInput && imgInput.files && imgInput.files.length > 0) {
                if (typeof window.importImagesFromFiles === "function") {
                    window.importImagesFromFiles();
                }
            }
        }
        if (typeof window.resetProjectHistory === "function") {
            window.resetProjectHistory(null);
        }


        const pdfButton = document.getElementById('pdfButton');
        if (pdfButton) pdfButton.disabled = false;

        document.getElementById('fileLabel').textContent = file.name;
        createZoomSlider();
        window.dispatchEvent(new Event('excelImported'));

    } catch (e) {
        alert('Błąd: ' + e.message);
    }
};

// === TWORZENIE STRONY + KONVA + TRANSFORMER + MULTI-SELECT + WŁASNE SKALOWANIE ===
function createPage(n, prods) {
    const div = document.createElement('div');
    div.className = 'page-container';
    div.style.position = 'relative';

    // === WAŻNE: dopiero teraz tworzymy HTML strony ===
    div.innerHTML = `
  <div class="page-toolbar">
      <span class="page-title">Page ${n}</span>

      <div class="page-tools">
<button class="page-btn move-up" data-tip="Przenieś stronę wyżej">⬆</button>
<button class="page-btn move-down" data-tip="Przenieś stronę niżej">⬇</button>
<button class="page-btn duplicate" data-tip="Powiel stronę">⧉</button>
<button class="page-btn add" data-tip="Dodaj pustą stronę">＋</button>
<button class="page-btn grid" data-tip="Siatka pomocnicza">▦</button>
<button class="page-btn settings" data-tip="Edytuj stronę">⚙</button>
<button class="page-btn delete" data-tip="Usuń stronę">🗑</button>

</div>

  </div>

  <div class="canvas-wrapper"
       style="width:${W}px;height:${H}px;background:#fff;overflow:hidden;position:relative;">
      <div id="k${n}" style="width:${W}px;height:${H}px;"></div>
      <div class="grid-overlay" id="g${n}"></div>
  </div>
`;


    document.getElementById('pagesContainer').appendChild(div);

    const stage = new Konva.Stage({
        container: `k${n}`,
        width: W,
        height: H
    });

    // (drag priorytet dla zdjęć ustawiany w setupProductImageDrag)

    // (usuniete: ensurePageInteractive - wywolanie bylo zbyt wczesne)
    // === OBRYSY DLA MULTI-SELECT (CANVA STYLE) ===
    const MAX_SELECTION_OUTLINES = 12;
    function highlightSelection() {
    // Usuń stare obrysy
    page.layer.find('.selectionOutline').forEach(n => n.destroy());

    const selected = Array.isArray(page.selectedNodes) ? page.selectedNodes : [];
    const nodesToOutline = selected.length > MAX_SELECTION_OUTLINES
        ? selected.slice(0, MAX_SELECTION_OUTLINES)
        : selected;

    // Dodaj dla części zaznaczenia (duże multi-zaznaczenia bez setek obrysów)
    nodesToOutline.forEach(node => {
        if (!node) return;
        if (typeof node.isDestroyed === "function" && node.isDestroyed()) return;
        if (node.getAttr && node.getAttr("isBgBlur")) return;
        let box;
        try {
            box = node.getClientRect({ relativeTo: page.layer });
        } catch (e) {
            return;
        }

        const outline = new Konva.Rect({
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            stroke: '#00baff',
            strokeWidth: 1.5,
            dash: [4, 4],
            listening: false,
            name: 'selectionOutline'
        });

        page.layer.add(outline);
        outline.moveToTop();
    });

    page.layer.batchDraw();
}

    // WARSTWA 1: OBIEKTY
    const layer = new Konva.Layer();
    stage.add(layer);
    
// 🔥 TŁO STRONY – MUSI BYĆ NA POCZĄTKU WARSTWY
const bgRect = new Konva.Rect({
    x: 0,
    y: 0,
    width: W,
    height: H,
    fill: "#ffffff",
    listening: true  // 🔥 pozwala na double-click!
});

bgRect.setAttr("isPageBg", true);
layer.add(bgRect);
bgRect.moveToBottom(); // 🔥 zawsze na samym dole!
bgRect.setZIndex(0);
// 🔒 BLOKADA INTERAKCJI DLA TŁA STRONY
bgRect.draggable(false);         
bgRect.listening(true);          
bgRect.name("pageBackground");   
bgRect.setAttr("selectable", false);

// 🔒 uniemożliwiamy skalowanie i zaznaczanie
bgRect.on('mousedown', (e) => {
    // jeśli ktoś kliknie tło, to odznacz wszystkie inne zaznaczenia
    if (!window.globalPasteMode) {
        page.selectedNodes = [];
        page.transformer.nodes([]); // usuwamy uchwyty transformera
        hideFloatingButtons();
        page.layer.batchDraw();
        page.transformerLayer.batchDraw();
    }
});

// 🔒 nigdy nie pozwalaj transformować tła
bgRect.on('transformstart', (e) => e.cancelBubble = true);
bgRect.on('transform', (e) => e.cancelBubble = true);
bgRect.on('transformend', (e) => e.cancelBubble = true);
// 🔒 wyłącz dwuklik na tle strony (brak otwierania edycji koloru strony)
bgRect.on('dblclick dbltap', (e) => {
    e.cancelBubble = true;
});



    // WARSTWA 2: TRANSFORMER
    const transformerLayer = new Konva.Layer();
    stage.add(transformerLayer);

    // TRANSFORMER – DOKŁADNE SKALOWANIE + WIĘCEJ UCHWYTÓW
const tr = new Konva.Transformer({
    hitStrokeWidth: 20,
    padding: 6,

    enabledAnchors: [
        'top-left', 'top-center', 'top-right',
        'middle-left', 'middle-right',
        'bottom-left', 'bottom-center', 'bottom-right'
    ],

    rotateEnabled: true,
    keepRatio: true,   // 🔥 PROPORCJE
    rotationSnaps: [0, 90, 180, 270],
    rotationSnapTolerance: 5,
    borderStroke: '#007cba',
    borderStrokeWidth: 2,
    anchorStroke: '#007cba',
    anchorFill: '#ffffff',
    anchorSize: 12,
    padding: 4,

    boundBoxFunc: (oldBox, newBox) => {
        // 🔥 ograniczamy minimalny rozmiar aby nic się nie "odwróciło"
        if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) return oldBox;

        const selected = (tr && typeof tr.nodes === "function") ? (tr.nodes() || []) : [];
        const single = selected.length === 1 ? selected[0] : null;
        const shouldClampToPage = !!(single && (
            (single instanceof Konva.Text) ||
            (single.getAttr && (
                single.getAttr("isSidebarText") ||
                single.getAttr("isPriceGroup") ||
                single.getAttr("isDirectPriceRectBg")
            ))
        ));
        if (!shouldClampToPage) return newBox;

        const stageW = (stage && typeof stage.width === "function") ? Number(stage.width()) : 0;
        const stageH = (stage && typeof stage.height === "function") ? Number(stage.height()) : 0;
        if (!(stageW > 0 && stageH > 0)) return newBox;

        const next = { ...newBox };
        if (next.x < 0) {
            next.width += next.x;
            next.x = 0;
        }
        if (next.y < 0) {
            next.height += next.y;
            next.y = 0;
        }
        if (next.x + next.width > stageW) {
            next.width = Math.max(20, stageW - next.x);
        }
        if (next.y + next.height > stageH) {
            next.height = Math.max(20, stageH - next.y);
        }
        if (Math.abs(next.width) < 20 || Math.abs(next.height) < 20) return oldBox;
        return next;
    }
});

tr.anchorDragBoundFunc(function(oldPos, newPos) {
    const anchor = tr.getActiveAnchor();

    // 🟢 Rogi — pełne proporcjonalne skalowanie
    if (
        anchor === 'top-left' ||
        anchor === 'top-right' ||
        anchor === 'bottom-left' ||
        anchor === 'bottom-right'
    ) {
        return newPos;
    }

    // 🔵 Boki — tylko szerokość
    if (anchor === 'middle-left' || anchor === 'middle-right') {
        return {
            x: newPos.x,  // szerokość
            y: oldPos.y   // blokada góra–dół
        };
    }

    // 🔴 Góra/Dół — tylko wysokość
    if (anchor === 'top-center' || anchor === 'bottom-center') {
        return {
            x: oldPos.x,  // blokada lewo–prawo
            y: newPos.y   // wysokość
        };
    }

    return newPos;
});

    transformerLayer.add(tr);

// === MARQUEE SELECTION (ZAZNACZANIE PRZECIĄGANIEM) ===
let marqueeActive = false;
let marqueeStart = null;
let marqueeHadDrag = false;
let marqueeSuppressClickUntil = 0;
let marqueeDragSuppressedNode = null;
let marqueePendingDirectStart = null;

const selectionRect = new Konva.Rect({
    
    fill: 'rgba(0, 160, 255, 0.15)',
    stroke: 'rgba(0, 160, 255, 0.7)',
    strokeWidth: 1,
    visible: false,
    listening: false,   // 🔥 najważniejsze — nie przechwytuje kliknięć!
    name: 'selectionRect'
    
});
layer.add(selectionRect);


stage.on('mousedown.marquee', (e) => {
    const rawTarget = e.target;
    const targetIsBg = (rawTarget === stage) || (!!(rawTarget && rawTarget.getAttr) && rawTarget.getAttr("isPageBg") === true);
    let directStartNode = null;
    if (!targetIsBg && rawTarget && rawTarget.getAttr) {
        let candidate = rawTarget;
        const parent = candidate.getParent ? candidate.getParent() : null;
        if (parent && parent.getAttr && parent.getAttr("isPriceGroup")) candidate = parent;
        const directId = String(candidate.getAttr("directModuleId") || "").trim();
        const candidateParent = candidate.getParent ? candidate.getParent() : null;
        const insideUserGroup = !!(candidateParent && candidateParent.getAttr && candidateParent.getAttr("isUserGroup"));
        if (directId && !insideUserGroup) {
            const selectedNow = Array.isArray(page.selectedNodes) ? page.selectedNodes : [];
            const alreadySelected =
                selectedNow.includes(candidate) ||
                selectedNow.includes(rawTarget) ||
                (rawTarget && rawTarget.getParent && selectedNow.includes(rawTarget.getParent()));
            // Jeśli element direct jest już zaznaczony, pozwól normalnie go przeciągać.
            if (alreadySelected && !(e.evt && e.evt.shiftKey)) return;
            directStartNode = candidate;
        }
    }

    // standardowo start tylko z tła, ale dla rozgrupowanych modułów direct
    // pozwalamy startować marquee także z elementu.
    if (!targetIsBg && !directStartNode) return;

    marqueeHadDrag = false;
    marqueeDragSuppressedNode = null;
    marqueePendingDirectStart = null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Dla direct-start nie uruchamiamy marquee od razu (bo psuje zwykły klik/zaznaczenie).
    // Najpierw czekamy na realny ruch myszy; wtedy dopiero aktywujemy prostokąt zaznaczenia.
    if (directStartNode) {
        if (typeof directStartNode.draggable === "function") {
            marqueeDragSuppressedNode = {
                node: directStartNode,
                draggable: !!directStartNode.draggable()
            };
            if (marqueeDragSuppressedNode.draggable) {
                directStartNode.draggable(false);
            }
        }
        marqueePendingDirectStart = { x: pointer.x, y: pointer.y };
        marqueeStart = { x: pointer.x, y: pointer.y };
        return;
    }

    marqueeActive = true;
    marqueeStart = { x: pointer.x, y: pointer.y };
    if (!marqueeStart) {
        marqueeActive = false;
        if (marqueeDragSuppressedNode && marqueeDragSuppressedNode.node && typeof marqueeDragSuppressedNode.node.draggable === "function") {
            marqueeDragSuppressedNode.node.draggable(!!marqueeDragSuppressedNode.draggable);
        }
        marqueeDragSuppressedNode = null;
        marqueePendingDirectStart = null;
        return;
    }
selectionRect.moveToTop();
    selectionRect.setAttrs({
        x: marqueeStart.x,
        y: marqueeStart.y,
        width: 0,
        height: 0,
        visible: true
        
    });

    page.selectedNodes = [];
page.transformer.nodes([]);
page.layer.find('.selectionOutline').forEach(n => n.destroy());
hideFloatingButtons();
    disableCropMode(page);
page.layer.batchDraw();


});

stage.on('mousemove.marquee', () => {
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (!marqueeActive && marqueePendingDirectStart) {
        const dx = Math.abs(pos.x - marqueePendingDirectStart.x);
        const dy = Math.abs(pos.y - marqueePendingDirectStart.y);
        if (dx <= 3 && dy <= 3) return;

        marqueeActive = true;
        marqueeHadDrag = true;
        marqueeStart = { x: marqueePendingDirectStart.x, y: marqueePendingDirectStart.y };
        marqueePendingDirectStart = null;

        selectionRect.moveToTop();
        selectionRect.setAttrs({
            x: marqueeStart.x,
            y: marqueeStart.y,
            width: 0,
            height: 0,
            visible: true
        });

	        page.selectedNodes = [];
	        page.transformer.nodes([]);
	        page.layer.find('.selectionOutline').forEach(n => n.destroy());
	        hideFloatingButtons();
	        disableCropMode(page);
	        page.layer.batchDraw();
	    }

    if (!marqueeActive) return;
    if (!marqueeStart) return;
    if (Math.abs(pos.x - marqueeStart.x) > 3 || Math.abs(pos.y - marqueeStart.y) > 3) {
        marqueeHadDrag = true;
    }

    selectionRect.setAttrs({
        x: Math.min(pos.x, marqueeStart.x),
        y: Math.min(pos.y, marqueeStart.y),
        width: Math.abs(pos.x - marqueeStart.x),
        height: Math.abs(pos.y - marqueeStart.y)
    });
    selectionRect.moveToTop();  // 🔥 DODAJ TO
    layer.batchDraw();
});

stage.on('mouseup.marquee', () => {
    if (!marqueeActive && marqueePendingDirectStart) {
        if (marqueeDragSuppressedNode && marqueeDragSuppressedNode.node && typeof marqueeDragSuppressedNode.node.draggable === "function") {
            marqueeDragSuppressedNode.node.draggable(!!marqueeDragSuppressedNode.draggable);
        }
        marqueeDragSuppressedNode = null;
        marqueePendingDirectStart = null;
        marqueeStart = null;
        marqueeHadDrag = false;
        return;
    }
    if (!marqueeActive) return;
    marqueeActive = false;
    if (marqueeDragSuppressedNode && marqueeDragSuppressedNode.node && typeof marqueeDragSuppressedNode.node.draggable === "function") {
        marqueeDragSuppressedNode.node.draggable(!!marqueeDragSuppressedNode.draggable);
    }
    marqueeDragSuppressedNode = null;
    marqueePendingDirectStart = null;
    if (marqueeHadDrag) marqueeSuppressClickUntil = Date.now() + 180;

    // Upewnij się, że slotIndex trafia tylko do elementów produktowych
    const boxesForSlots = page.layer.find(n => n.getAttr && n.getAttr("isBox"));
    if (boxesForSlots.length) {
        page.layer.children.forEach(n => {
            if (n === bgRect || n === selectionRect) return;
            if (n.getAttr && n.getAttr("isBgBlur")) return;
            if (!n.getAttr || Number.isFinite(n.getAttr("slotIndex"))) return;
            const eligible = (() => {
                if (n instanceof Konva.Text) {
                    return !!(n.getAttr("isProductText") || n.getAttr("isName") || n.getAttr("isIndex") || n.getAttr("isCustomPackageInfo"));
                }
                if (n instanceof Konva.Image) {
                    if (n.getAttr("isUserImage")) return false;
                    if (n.getAttr("isBarcode") || n.getAttr("isCountryBadge") || n.getAttr("isTNZBadge")) return true;
                    return !!(n.getAttr("isProductImage") && !n.getAttr("isOverlayElement"));
                }
                if (n instanceof Konva.Group) {
                    return !!(n.getAttr("isPriceGroup") || n.getAttr("isAutoSlotGroup"));
                }
                return false;
            })();
            if (!eligible) return;
            const nRect = n.getClientRect({ relativeTo: page.layer });
            const match = boxesForSlots.find(b => {
                const bRect = b.getClientRect({ relativeTo: page.layer });
                return Konva.Util.haveIntersection(nRect, bRect);
            });
            if (match) n.setAttr("slotIndex", match.getAttr("slotIndex"));
        });
    }

    const area = selectionRect.getClientRect({ relativeTo: page.layer });

let nodes = page.layer.children.filter(node => {
    // Pomijamy tło strony i sam prostokąt zaznaczania
    if (node === bgRect || node.getAttr("isPageBg")) return false;
    if (node === selectionRect) return false;
    if (node.getAttr && (node.getAttr("isBgBlur") || node.getAttr("isFxHelper"))) return false;
    if (typeof node.isDestroyed === "function" && node.isDestroyed()) return false;

    // Wszystko inne co jest draggable lub tekst/obraz/box
    if (
    node instanceof Konva.Group ||        // 🔥 DODANE
    node.draggable() ||
    node instanceof Konva.Text ||
    node instanceof Konva.Image ||
    node instanceof Konva.Rect
) {

        let box;
        try {
            box = node.getClientRect({ relativeTo: page.layer });
        } catch (e) {
            return false;
        }
        return Konva.Util.haveIntersection(area, box);
    }
    return false;
});
    nodes = normalizeSelection(nodes);
    nodes = expandSelectionForDirectModules(nodes, page.layer);

    selectionRect.visible(false);

    // USUŃ STARE OBRYSY
    page.layer.find(".selectionOutline").forEach(n => n.destroy());

    if (page._cropMode && (nodes.length !== 1 || nodes[0] !== page._cropTarget)) {
        disableCropMode(page);
    }

    if (nodes.length > 0) {
        page.selectedNodes = nodes;
        const singleImage = (nodes.length === 1 && nodes[0] instanceof Konva.Image);
        if (singleImage) {
            enableCropMode(page, nodes[0]);
        } else {
            disableCropMode(page);
            page.transformer.nodes(nodes);
        }
        
        highlightSelection();
        showFloatingButtons();
    } else {
        page.selectedNodes = [];
        page.transformer.nodes([]);
        hideFloatingButtons();
    }

    page.layer.batchDraw();
    page.transformerLayer.batchDraw();

    setTimeout(() => {
        marqueeStart = null;
        selectionRect.visible(false);
        page.layer.batchDraw();
    }, 50);
});

    // === TWORZENIE OBIEKTU STRONY ===
const page = {
    number: n,
    products: prods,
    stage: stage,
    layer: layer,
    transformerLayer: transformerLayer,
    container: div,
    transformer: tr,

    slotObjects: Array(prods.length).fill(null),
    barcodeObjects: Array(prods.length).fill(null),
    barcodePositions: Array(prods.length).fill(null),
    textPositions: [],
    boxScales: Array(prods.length).fill(null),

    selectedNodes: [],
    _oldTransformBox: null,

    settings: {
        nameSize: 12,
        indexSize: 14,
        priceSize: Math.round(
            24 * (window.LAYOUT_MODE === "layout6"
                ? PRICE_SIZE_MULTIPLIER_LAYOUT6
                : PRICE_SIZE_MULTIPLIER_LAYOUT8)
        ),
        fontFamily: 'Arial',
        textColor: '#000000',
        bannerUrl: null,
        currency: 'gbp',
        pageBgColor: '#ffffff'
    }
};

    // === PODGLĄD KĄTA OBRACANIA (CANVA STYLE) ===
    const rotationUI = createRotationLabel(layer);
    page.rotationUI = rotationUI;

    const updateRotationLabel = () => {
        const nodes = tr.nodes();
        if (!nodes || nodes.length === 0) return;
        const target = nodes[0];
        const box = target.getClientRect({ relativeTo: layer });
        const angle = Math.round(((target.rotation() % 360) + 360) % 360);

        rotationUI.text.text(angle + "°");
        rotationUI.label.position({
            x: box.x + box.width / 2,
            y: box.y - 40
        });
        rotationUI.label.visible(true);
        rotationUI.label.opacity(1);
        rotationUI.label.moveToTop();
        layer.batchDraw();
    };

    tr.on("transformstart", () => {
        if (tr.getActiveAnchor && tr.getActiveAnchor() !== "rotater") return;
        updateRotationLabel();
    });

    tr.on("transform", () => {
        if (tr.getActiveAnchor && tr.getActiveAnchor() !== "rotater") return;
        updateRotationLabel();
    });

    tr.on("transformend", () => {
        const label = rotationUI?.label;
        if (!label || (label.isDestroyed && label.isDestroyed()) || !label.getLayer || !label.getLayer()) {
            return;
        }

        label.to({
            opacity: 0,
            duration: 0.2,
            onFinish: () => {
                if (!label.isDestroyed || !label.isDestroyed()) {
                    label.visible(false);
                }
            }
        });
    });



    // === PEŁNE DRAG & DROP PO CAŁEJ STRONIE ===
    stage.container().style.touchAction = 'none';
    stage.on('dragover', e => e.evt.preventDefault());
    // === OBSŁUGA PRZECIĄGANIA ZDJĘĆ Z PULPITU NA STRONĘ (IMPORT Z SYSTEMU) ===
stage.container().addEventListener('dragover', (e) => {
  e.preventDefault();
  stage.container().style.border = "2px dashed #007cba";
});

stage.container().addEventListener('dragleave', () => {
  stage.container().style.border = "none";
});

stage.container().addEventListener('drop', async (e) => {
  e.preventDefault();
  stage.container().style.border = "none";

  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  let variants = null;
  try {
      if (typeof window.createImageVariantsFromFile === "function") {
          variants = await window.createImageVariantsFromFile(file, {
              cacheKey: `drop:${file.name}:${file.size}:${file.lastModified}`
          });
      }
  } catch (_e) {}
  if (!variants) {
      try {
          const fallback = await (new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result || ""));
              reader.onerror = () => reject(new Error("file_read_error"));
              reader.readAsDataURL(file);
          }));
          variants = (typeof window.normalizeImageVariantPayload === "function")
              ? window.normalizeImageVariantPayload(fallback)
              : { original: fallback, editor: fallback, thumb: fallback };
      } catch (_e) {
          return;
      }
  }
  const editorSrc = (typeof window.getImageVariantSource === "function")
      ? window.getImageVariantSource(variants, "editor")
      : String(variants?.editor || variants?.original || "");
  if (!editorSrc) return;
  const originalSrc = (typeof window.getImageVariantSource === "function")
      ? window.getImageVariantSource(variants, "original")
      : String(variants?.original || editorSrc);
  const thumbSrc = (typeof window.getImageVariantSource === "function")
      ? window.getImageVariantSource(variants, "thumb")
      : String(variants?.thumb || editorSrc);

  Konva.Image.fromURL(editorSrc, (img) => {
      const pos = stage.getPointerPosition() || {
          x: Math.max(0, e.clientX - stage.container().getBoundingClientRect().left),
          y: Math.max(0, e.clientY - stage.container().getBoundingClientRect().top)
      };
      img.x(pos.x);
      img.y(pos.y);

      const maxWidth = W * 0.6;
      const scale = Math.min(maxWidth / img.width(), 1);

      img.scale({ x: scale, y: scale });
      img.draggable(true);
      img.listening(true);

      img.setAttrs({
        isProductImage: false,
        isUserImage: true,
        slotIndex: null
      });
      if (typeof window.applyImageVariantsToKonvaNode === "function") {
          window.applyImageVariantsToKonvaNode(img, {
              original: originalSrc || editorSrc,
              editor: editorSrc,
              thumb: thumbSrc || editorSrc
          });
      } else {
          img.setAttr("originalSrc", originalSrc || editorSrc);
          img.setAttr("editorSrc", editorSrc);
          img.setAttr("thumbSrc", thumbSrc || editorSrc);
      }

      // 🔥 KROK 3 — dodajemy nazwę obiektu, aby działał transform, multi-select i menu warstw
      img.name("droppedImage");

      // ustawienia: w pełni edytowalne, tak jak wszystkie obiekty
      img.draggable(true);
      img.listening(true);

      layer.add(img);
      layer.batchDraw();
      page.transformerLayer.batchDraw(); // ważne dla transformera
  });
});
// === ANIMACJA DRAG & DROP — CANVA STYLE ===
let multiDragState = null;
let dragMoveRafId = 0;
let dragMovePendingNode = null;
let dragGuideStopsCache = null;
let dragGuideNode = null;
const safeStartNodeDrag = (node, stageRef) => {
    if (!node || typeof node.startDrag !== "function") return false;
    if (typeof node.isDestroyed === "function" && node.isDestroyed()) return false;
    if (!node.getStage || !node.getStage()) return false;
    if (stageRef && node.getStage() !== stageRef) return false;
    // Konva 9: startDrag rzuca wyjątek, gdy node nie ma wpisu w DD._dragElements.
    // Sprawdzamy wpis przed startDrag, żeby uniknąć "Cannot set properties of undefined (dragStatus)".
    const hasDragEntry = (() => {
        const dd = window.Konva && window.Konva.DD;
        const dragElements = dd && dd._dragElements;
        if (!dragElements) return false;
        const nodeId = node && node._id;
        try {
            if (typeof dragElements.has === "function") {
                if (dragElements.has(nodeId)) return true;
                if (dragElements.has(node)) return true;
            }
            if (typeof dragElements.get === "function") {
                if (dragElements.get(nodeId)) return true;
                if (dragElements.get(node)) return true;
            }
            if (Array.isArray(dragElements)) {
                return dragElements.some((entry) =>
                    !!entry && (entry.node === node || (entry.node && entry.node._id === nodeId) || entry === node)
                );
            }
            if (typeof dragElements.forEach === "function") {
                let found = false;
                dragElements.forEach((entry, key) => {
                    if (found) return;
                    if (key === nodeId || key === node) {
                        found = true;
                        return;
                    }
                    if (entry && (entry.node === node || (entry.node && entry.node._id === nodeId) || entry === node)) {
                        found = true;
                    }
                });
                if (found) return true;
            }
            if (typeof dragElements === "object") {
                if (nodeId != null) {
                    const direct = dragElements[nodeId];
                    if (direct && (direct.node === node || (direct.node && direct.node._id === nodeId) || direct === node)) return true;
                }
                return Object.values(dragElements).some((entry) =>
                    !!entry && (entry.node === node || (entry.node && entry.node._id === nodeId) || entry === node)
                );
            }
        } catch (_e) {}
        return false;
    })();
    if (!hasDragEntry) return false;
    try {
        node.startDrag();
        return true;
    } catch (_e) {
        return false;
    }
};

const safeStopNodeDrag = (node) => {
    if (!node || typeof node.stopDrag !== "function") return false;
    if (typeof node.isDestroyed === "function" && node.isDestroyed()) return false;
    try {
        node.stopDrag();
        return true;
    } catch (_e) {
        return false;
    }
};

stage.on('dragstart', (e) => {
    const node = e.target;
    if (!node.draggable()) return;
    if (dragMoveRafId) {
        cancelAnimationFrame(dragMoveRafId);
        dragMoveRafId = 0;
    }
    dragMovePendingNode = null;
    dragGuideNode = node;
    try {
        dragGuideStopsCache = getSmartGuideStops(node);
    } catch (_e) {
        dragGuideStopsCache = null;
    }
    try {
        const outlines = page.layer.find('.selectionOutline');
        if (outlines && typeof outlines.forEach === "function") {
            outlines.forEach((n) => n.destroy());
            page.layer.batchDraw();
        }
    } catch (_e) {}

    // Nie przepinamy ręcznie drag między nodami.
    // Ręczne stop/start powodowało race condition z DD._dragElements w Konva 9.

    // Multi-drag: gdy zaznaczono kilka elementów, przeciąganie jednego przesuwa cały zestaw.
    const selectedNow = normalizeSelection(Array.isArray(page.selectedNodes) ? page.selectedNodes : []);
    if (selectedNow.length > 1 && selectedNow.includes(node)) {
        multiDragState = {
            leader: node,
            leaderStartX: Number(node.x?.() || 0),
            leaderStartY: Number(node.y?.() || 0),
            members: selectedNow
                .filter((n) => n && n !== node && typeof n.x === "function" && typeof n.y === "function")
                .map((n) => ({
                    node: n,
                    startX: Number(n.x()),
                    startY: Number(n.y())
                }))
        };
    } else {
        multiDragState = null;
    }

    // 🔥 TYLKO DLA BOXÓW
    if (node.getAttr("isBox")) {
        node._shadowBackup = {
            blur: node.shadowBlur(),
            offsetX: node.shadowOffsetX(),
            offsetY: node.shadowOffsetY(),
            opacity: node.shadowOpacity()
        };

        // 🔥 zostawiamy delikatny cień nawet podczas drag
node.shadowBlur(6);
node.shadowOffset({ x: 0, y: 3 });
node.shadowOpacity(0.35);

    }

    node.startX = node.x();
    node.startY = node.y();

    stage.container().style.cursor = 'grabbing';
});

// === DRAG CALEJ GRUPY USERGROUP (takze przy kliknieciu dziecka) ===
stage.on('mousedown.userGroupDrag touchstart.userGroupDrag', (e) => {
    if (window.isEditingText) return;
    if (e.evt && e.evt.shiftKey) return;
    document.activeStage = stage;

    let target = e.target;
    let userGroup = null;
    while (target && target !== stage) {
        if (target.getAttr && target.getAttr("isUserGroup")) {
            userGroup = target;
            break;
        }
        target = target.getParent ? target.getParent() : null;
    }
    if (!userGroup || typeof userGroup.startDrag !== 'function') return;
    const needsDragArming = !!(userGroup.getAttr && userGroup.getAttr("_dragNeedsArming"));
    if (needsDragArming) {
        if (userGroup.setAttr) userGroup.setAttr("_dragNeedsArming", false);
        if (userGroup.setAttr) userGroup.setAttr("_dragPendingEnable", true);
        if (typeof userGroup.draggable === "function") userGroup.draggable(false);
        page.selectedNodes = [userGroup];
        disableCropMode(page);
        page.transformer.nodes([userGroup]);
        highlightSelection();
        showFloatingButtons();
        if (e && e.evt) {
            if (typeof e.evt.preventDefault === "function") e.evt.preventDefault();
            if (typeof e.evt.stopPropagation === "function") e.evt.stopPropagation();
            if (typeof e.evt.stopImmediatePropagation === "function") e.evt.stopImmediatePropagation();
        }
        e.cancelBubble = true;
        page.layer?.batchDraw?.();
        page.transformerLayer?.batchDraw?.();
        return;
    }
    if (!userGroup.draggable || !userGroup.draggable()) return;

    const normalizedSelected = normalizeSelection(Array.isArray(page.selectedNodes) ? page.selectedNodes : []);
    const keepMultiSelection =
        normalizedSelected.length > 1 &&
        normalizedSelected.includes(userGroup);

    // Jeśli userGroup jest częścią multi-zaznaczenia, nie nadpisujemy wyboru do pojedynczego.
    if (keepMultiSelection) {
        return;
    }

    page.selectedNodes = [userGroup];
    disableCropMode(page);
    page.transformer.nodes([userGroup]);
    highlightSelection();
    showFloatingButtons();

    // Brak ręcznego startDrag - zostawiamy natywne zachowanie Konva.
});

stage.on('mouseup.userGroupDragArming touchend.userGroupDragArming pointerup.userGroupDragArming', () => {
    if (!page || !page.layer || typeof page.layer.find !== "function") return;
    const pendingGroups = page.layer.find((n) =>
        n instanceof Konva.Group &&
        n.getAttr &&
        n.getAttr("isUserGroup") &&
        n.getAttr("_dragPendingEnable")
    );
    if (!pendingGroups || !pendingGroups.length) return;
    pendingGroups.forEach((g) => {
        if (!g || (typeof g.isDestroyed === "function" && g.isDestroyed())) return;
        if (g.setAttr) g.setAttr("_dragPendingEnable", false);
        if (typeof g.draggable === "function") g.draggable(true);
    });
    page.layer?.batchDraw?.();
    page.transformerLayer?.batchDraw?.();
});

const SMART_GUIDE_NAME = "smartGuideLine";
const SMART_GUIDE_THRESHOLD = 5;

function clearSmartGuides() {
    let removed = false;
    try {
        const guides = page.layer.find(`.${SMART_GUIDE_NAME}`);
        if (guides && typeof guides.length === "number" && guides.length > 0) {
            removed = true;
            guides.forEach((n) => n.destroy());
        }
    } catch (_err) {}
    return removed;
}

function drawSmartGuideLine(points) {
    if (!Array.isArray(points) || points.length !== 4 || !window.Konva) return;
    const line = new window.Konva.Line({
        points,
        stroke: "#00baff",
        strokeWidth: 1,
        dash: [4, 4],
        listening: false,
        name: SMART_GUIDE_NAME
    });
    page.layer.add(line);
    line.moveToTop();
}

function nodeRectToEdges(rect) {
    return {
        vertical: [
            { type: "left", value: rect.x },
            { type: "center", value: rect.x + rect.width / 2 },
            { type: "right", value: rect.x + rect.width }
        ],
        horizontal: [
            { type: "top", value: rect.y },
            { type: "middle", value: rect.y + rect.height / 2 },
            { type: "bottom", value: rect.y + rect.height }
        ]
    };
}

function isDescendantOf(node, maybeAncestor) {
    let cur = node;
    while (cur && cur !== stage) {
        if (cur === maybeAncestor) return true;
        cur = cur.getParent ? cur.getParent() : null;
    }
    return false;
}

function getSmartGuideStops(skipNode) {
    const stageW = stage.width ? stage.width() : 0;
    const stageH = stage.height ? stage.height() : 0;
    const vertical = [0, stageW / 2, stageW];
    const horizontal = [0, stageH / 2, stageH];

    const nodes = page.layer.find((n) => {
        if (!n || n === skipNode) return false;
        if (n.getParent && isDescendantOf(n, skipNode)) return false;
        if (n.getAttr && (n.getAttr("isPageBg") || n.getAttr("isPriceHitArea"))) return false;
        if (n.name && typeof n.name === "function" && n.name() === SMART_GUIDE_NAME) return false;
        if (!n.visible || !n.visible()) return false;
        if (!n.getClientRect) return false;
        return (
            n instanceof window.Konva.Text ||
            n instanceof window.Konva.Image ||
            n instanceof window.Konva.Rect ||
            n instanceof window.Konva.Group
        );
    });

    nodes.forEach((n) => {
        try {
            const r = n.getClientRect({ relativeTo: page.layer, skipShadow: true, skipStroke: false });
            if (!r || !Number.isFinite(r.width) || !Number.isFinite(r.height) || r.width <= 0 || r.height <= 0) return;
            const edges = nodeRectToEdges(r);
            edges.vertical.forEach((v) => vertical.push(v.value));
            edges.horizontal.forEach((h) => horizontal.push(h.value));
        } catch (_err) {}
    });

    return { vertical, horizontal };
}

function applySmartGuidesAndSnap(node, stopsOverride) {
    if (!node || !node.getClientRect || !node.getAbsolutePosition || !node.setAbsolutePosition) return;
    const box = node.getClientRect({ relativeTo: page.layer, skipShadow: true, skipStroke: false });
    if (!box || !Number.isFinite(box.x) || !Number.isFinite(box.y)) return;

    const edges = nodeRectToEdges(box);
    const stops = stopsOverride || getSmartGuideStops(node);

    let bestV = null;
    edges.vertical.forEach((edge) => {
        stops.vertical.forEach((stop) => {
            const diff = stop - edge.value;
            const ad = Math.abs(diff);
            if (ad > SMART_GUIDE_THRESHOLD) return;
            if (!bestV || ad < bestV.abs) bestV = { diff, abs: ad, stop };
        });
    });

    let bestH = null;
    edges.horizontal.forEach((edge) => {
        stops.horizontal.forEach((stop) => {
            const diff = stop - edge.value;
            const ad = Math.abs(diff);
            if (ad > SMART_GUIDE_THRESHOLD) return;
            if (!bestH || ad < bestH.abs) bestH = { diff, abs: ad, stop };
        });
    });

    if (!bestV && !bestH) {
        return clearSmartGuides();
    }

    const abs = node.getAbsolutePosition();
    const next = {
        x: Number(abs?.x || 0) + (bestV ? bestV.diff : 0),
        y: Number(abs?.y || 0) + (bestH ? bestH.diff : 0)
    };
    node.setAbsolutePosition(next);

    const hadOldGuides = clearSmartGuides();
    const stageW = stage.width ? stage.width() : 0;
    const stageH = stage.height ? stage.height() : 0;
    if (bestV) drawSmartGuideLine([bestV.stop, 0, bestV.stop, stageH]);
    if (bestH) drawSmartGuideLine([0, bestH.stop, stageW, bestH.stop]);
    return hadOldGuides || !!bestV || !!bestH;
}

const flushDragMoveFrame = () => {
    dragMoveRafId = 0;
    const node = dragMovePendingNode;
    dragMovePendingNode = null;
    if (!node || node === stage || typeof node.draggable !== "function" || !node.draggable()) return;

    let needsLayerDraw = false;
    try {
        if (dragGuideNode !== node || !dragGuideStopsCache) {
            dragGuideNode = node;
            dragGuideStopsCache = getSmartGuideStops(node);
        }
        needsLayerDraw = !!applySmartGuidesAndSnap(node, dragGuideStopsCache) || needsLayerDraw;
    } catch (_err) {}

    if (multiDragState && multiDragState.leader === node) {
        const dx = Number(node.x?.() || 0) - Number(multiDragState.leaderStartX || 0);
        const dy = Number(node.y?.() || 0) - Number(multiDragState.leaderStartY || 0);
        multiDragState.members.forEach((entry) => {
            if (!entry || !entry.node) return;
            const nx = Number(entry.startX) + dx;
            const ny = Number(entry.startY) + dy;
            if (Number.isFinite(nx)) entry.node.x(nx);
            if (Number.isFinite(ny)) entry.node.y(ny);
        });
        needsLayerDraw = true;
    }

    if (page.transformer && page.transformer.nodes && page.transformer.nodes().length) {
        try { page.transformer.forceUpdate && page.transformer.forceUpdate(); } catch (_e) {}
        page.transformerLayer && page.transformerLayer.batchDraw && page.transformerLayer.batchDraw();
    }
    if (needsLayerDraw) {
        page.layer && page.layer.batchDraw && page.layer.batchDraw();
    }
};

stage.on('dragmove', (e) => {
    const node = e && e.target ? e.target : null;
    dragMovePendingNode = node;
    if (!dragMoveRafId) {
        dragMoveRafId = requestAnimationFrame(flushDragMoveFrame);
    }
});

stage.on('dragend', (e) => {
    if (dragMoveRafId) {
        cancelAnimationFrame(dragMoveRafId);
        dragMoveRafId = 0;
    }
    dragMovePendingNode = null;
    dragGuideStopsCache = null;
    dragGuideNode = null;

    clearSmartGuides();
    const hadOutlines = page.layer.find('.selectionOutline');
    if (hadOutlines && typeof hadOutlines.forEach === "function") hadOutlines.forEach(n => n.destroy());
    multiDragState = null;
    

    const node = e.target;
    if (!node.draggable()) return;

    // 🔥 PRZYWRÓCENIE CIENIA DLA BOXA
    if (node.getAttr("isBox") && node._shadowBackup) {
        node.shadowBlur(node._shadowBackup.blur);
        node.shadowOffset({
            x: node._shadowBackup.offsetX,
            y: node._shadowBackup.offsetY
        });
        node.shadowOpacity(node._shadowBackup.opacity);

        delete node._shadowBackup;
    }

    stage.container().style.cursor = 'grab';
    node.getLayer().batchDraw();
    highlightSelection();
    if (page.transformer && page.transformer.nodes && page.transformer.nodes().length) {
        try { page.transformer.forceUpdate && page.transformer.forceUpdate(); } catch (_e) {}
        page.transformerLayer && page.transformerLayer.batchDraw && page.transformerLayer.batchDraw();
    }
});



    // === NOWE PRZYCISKI NA GÓRZE STRONY (NOWY PANEL) ===
const toolbar = div.querySelector(".page-toolbar");

const btnUp       = toolbar.querySelector(".move-up");
const btnDown     = toolbar.querySelector(".move-down");
const btnDuplicate = toolbar.querySelector(".duplicate");
const btnAdd      = toolbar.querySelector(".add");
const btnGrid     = toolbar.querySelector(".grid");
const btnDelete   = toolbar.querySelector(".delete");
const btnSettings = toolbar.querySelector(".settings");
const canvasWrapperEl = div.querySelector(".canvas-wrapper");

const setGridVisible = (visible) => {
    const show = !!visible;
    page._gridVisible = show;
    if (canvasWrapperEl) {
        canvasWrapperEl.classList.toggle("grid-enabled", show);
    }
    if (btnGrid) {
        btnGrid.classList.toggle("active", show);
        btnGrid.setAttribute("aria-pressed", show ? "true" : "false");
    }
};

btnSettings.onclick = async (e) => {
    e.stopPropagation();

    // Jeśli to okładka → blokujemy edycję
    if (page.isCover) {
        alert("Edycja okładki jest osobnym modułem.");
        return;
    }

    if (typeof window.ensurePageHydrated === "function") {
        try { await window.ensurePageHydrated(page, { reason: "settings" }); } catch (_e) {}
    }

    if (typeof window.openPageEdit === "function") {
        window.openPageEdit(page);
    } else {
        console.error("Brak funkcji openPageEdit!");
    }
};



// ⬆ przesuwanie strony w górę
btnUp.onclick = () => {
    movePage(page, -1);
};

// ⬇ przesuwanie strony w dół
btnDown.onclick = () => {
    movePage(page, +1);
};

// ⧉ duplikuj stronę
btnDuplicate.onclick = () => {
    if (typeof window.createEmptyPageUnder === "function") {
        window.createEmptyPageUnder(page);
    } else {
        alert("Brak funkcji duplikowania strony.");
    }
};

// ＋ dodaj pustą stronę POD aktualną
btnAdd.onclick = () => {
    if (typeof window.createEmptyPageUnder === "function") {
        window.createEmptyPageUnder(page);
    } else {
        alert("Brak funkcji dodawania strony.");
    }
};

if (btnGrid) {
    btnGrid.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setGridVisible(!page._gridVisible);
    };
}

// 🗑 usuń stronę
btnDelete.onclick = () => {
    if (confirm("Czy na pewno chcesz usunąć tę stronę?")) {
        window.deletePage(page);
    }
};

    // === KOPIOWANIE + WKLEJANIE + MENU WARSTW ===
    let floatingButtons = null;
    let groupQuickMenu = null;

    function removeFloatingMenu() {
      if (!floatingButtons) return;
      if (floatingButtons._posHandler) {
        window.removeEventListener('scroll', floatingButtons._posHandler, true);
        window.removeEventListener('resize', floatingButtons._posHandler);
      }
      floatingButtons.remove();
      floatingButtons = null;
    }

    function getPageBgNode() {
      const bg =
        page.layer.findOne(n => n.getAttr && n.getAttr("isPageBg") === true) ||
        bgRect;
      return bg || null;
    }

    function normalizeColorForInput(rawColor, fallback = "#ffffff") {
      const txt = String(rawColor || "").trim();
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(txt)) return txt;
      return fallback;
    }

    function resolveHeaderPageSettingsAnchor() {
      return document.getElementById('pageSettingsToggleBtn') || null;
    }

    function setHeaderPageSettingsToggleState(isOpen) {
      const btn = resolveHeaderPageSettingsAnchor();
      if (!btn) return;
      btn.classList.toggle('active', !!isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    function getAlignableSelectionNodes() {
      const normalized = normalizeSelection(page.selectedNodes);
      return normalized.filter((n) => {
        if (!n) return false;
        if (n === bgRect || n === selectionRect) return false;
        if (!n.getAttr) return false;
        if (n.getAttr("isPageBg")) return false;
        if (n.getAttr("isBgBlur")) return false;
        if (typeof n.isDestroyed === "function" && n.isDestroyed()) return false;
        if (typeof n.visible === "function" && !n.visible()) return false;
        return true;
      });
    }

    function getSelectionBoundsInPage(nodes) {
      if (!Array.isArray(nodes) || nodes.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((node) => {
        if (!node || typeof node.getClientRect !== "function") return;
        let rect = null;
        try {
          rect = node.getClientRect({ relativeTo: page.layer });
        } catch (_e) {
          rect = null;
        }
        if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y)) return;
        if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return;
        minX = Math.min(minX, rect.x);
        minY = Math.min(minY, rect.y);
        maxX = Math.max(maxX, rect.x + rect.width);
        maxY = Math.max(maxY, rect.y + rect.height);
      });
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return null;
      }
      return {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY)
      };
    }

    function applySelectionOffset(dx, dy) {
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      const nodes = getAlignableSelectionNodes();
      if (!nodes.length) return;
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;

      nodes.forEach((node) => {
        if (typeof node.x !== "function" || typeof node.y !== "function") return;
        const nx = Number(node.x()) + dx;
        const ny = Number(node.y()) + dy;
        if (Number.isFinite(nx)) node.x(nx);
        if (Number.isFinite(ny)) node.y(ny);
      });

      page.selectedNodes = nodes;
      disableCropMode(page);
      page.transformer.nodes(nodes);
      try {
        page.transformer.forceUpdate && page.transformer.forceUpdate();
      } catch (_e) {}
      highlightSelection();
      layer.batchDraw();
      transformerLayer.batchDraw();
      try {
        window.dispatchEvent(new CustomEvent('canvasModified', { detail: stage }));
      } catch (_e) {}
    }

    function alignSelectionToPage(direction) {
      const nodes = getAlignableSelectionNodes();
      if (!nodes.length) return;
      const bounds = getSelectionBoundsInPage(nodes);
      if (!bounds) return;

      const stageWRaw = Number(page.stage && page.stage.width ? page.stage.width() : W);
      const stageHRaw = Number(page.stage && page.stage.height ? page.stage.height() : H);
      const stageW = Number.isFinite(stageWRaw) ? stageWRaw : W;
      const stageH = Number.isFinite(stageHRaw) ? stageHRaw : H;
      const maxX = Math.max(0, stageW - bounds.width);
      const maxY = Math.max(0, stageH - bounds.height);

      let targetX = bounds.x;
      let targetY = bounds.y;

      if (direction === "left") targetX = 0;
      else if (direction === "right") targetX = maxX;
      else if (direction === "top") targetY = 0;
      else if (direction === "bottom") targetY = maxY;
      else if (direction === "center") {
        targetX = maxX / 2;
        targetY = maxY / 2;
      } else {
        return;
      }

      applySelectionOffset(targetX - bounds.x, targetY - bounds.y);
    }

    function openAlignSubmenu() {
      const nodes = getAlignableSelectionNodes();
      if (!nodes.length) return;

      window.showSubmenu(`
        <div class="align-submenu-grid">
          <button class="align-submenu-btn" data-align="left"><i class="fas fa-arrow-left"></i>Do lewej</button>
          <button class="align-submenu-btn" data-align="top"><i class="fas fa-arrow-up"></i>Do gory</button>
          <button class="align-submenu-btn" data-align="bottom"><i class="fas fa-arrow-down"></i>Do dolu</button>
          <button class="align-submenu-btn" data-align="right"><i class="fas fa-arrow-right"></i>Do prawej</button>
          <button class="align-submenu-btn align-submenu-btn--center" data-align="center"><i class="fas fa-crosshairs"></i>Wysrodkuj</button>
        </div>
      `, { width: "auto", maxWidth: "92vw", className: "align-submenu-panel" });

      document.querySelectorAll('#floatingSubmenu .align-submenu-btn').forEach((btn) => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          const dir = String(btn.dataset.align || "").trim();
          alignSelectionToPage(dir);
        };
      });
    }
    function getGroupableSelection() {
      const normalized = normalizeSelection(page.selectedNodes).filter(n =>
        n &&
        n !== bgRect &&
        n !== selectionRect &&
        !(n.getAttr && n.getAttr("isPageBg"))
      );

      return normalized.filter(n =>
        !normalized.some(other =>
          other !== n &&
          typeof n.isDescendantOf === "function" &&
          n.isDescendantOf(other)
        )
      );
    }

    function groupSelectedNodes() {
      const nodes = getGroupableSelection();
      if (nodes.length < 2) return;

      const sortedNodes = [...nodes].sort((a, b) => a.getZIndex() - b.getZIndex());
      const minZ = Math.min(...sortedNodes.map(n => n.getZIndex()));

      const group = new Konva.Group({
        draggable: true,
        listening: true,
        name: "userGroup"
      });
      group.setAttrs({
        isUserGroup: true,
        selectable: true
      });

      layer.add(group);
      group.setZIndex(minZ);

      sortedNodes.forEach(node => {
        const abs = node.getAbsolutePosition();
        // W grupie przeciągamy całość, nie pojedyncze dzieci.
        node.setAttr("_wasDraggableBeforeUserGroup", node.draggable());
        node.draggable(false);
        node.moveTo(group);
        node.absolutePosition(abs);
      });

      page.selectedNodes = [group];
      disableCropMode(page);
      page.transformer.nodes([group]);
      highlightSelection();
      layer.batchDraw();
      transformerLayer.batchDraw();
      window.dispatchEvent(new CustomEvent('canvasModified', { detail: stage }));
      showFloatingButtons();
    }

    function bakeUserGroupTransformToChildren(group) {
      if (!(group instanceof Konva.Group) || !group.getChildren) return false;
      const gx = Number(group.x?.() || 0);
      const gy = Number(group.y?.() || 0);
      const gsx = Number(group.scaleX?.() || 1);
      const gsy = Number(group.scaleY?.() || 1);
      const grot = Number(group.rotation?.() || 0);
      const gox = Number(group.offsetX?.() || 0);
      const goy = Number(group.offsetY?.() || 0);

      const needsBake =
        Math.abs(gx) > 0.0001 ||
        Math.abs(gy) > 0.0001 ||
        Math.abs(gsx - 1) > 0.0001 ||
        Math.abs(gsy - 1) > 0.0001 ||
        Math.abs(grot) > 0.0001 ||
        Math.abs(gox) > 0.0001 ||
        Math.abs(goy) > 0.0001;
      if (!needsBake) return false;

      const snapshots = Array.from(group.getChildren()).map((child) => ({
        child,
        absPos: child.getAbsolutePosition ? child.getAbsolutePosition() : null,
        absScale: child.getAbsoluteScale ? child.getAbsoluteScale() : { x: child.scaleX?.() || 1, y: child.scaleY?.() || 1 },
        absRot: child.getAbsoluteRotation ? child.getAbsoluteRotation() : (child.rotation?.() || 0)
      }));

      if (group.x) group.x(0);
      if (group.y) group.y(0);
      if (group.scaleX) group.scaleX(1);
      if (group.scaleY) group.scaleY(1);
      if (group.rotation) group.rotation(0);
      if (group.offsetX) group.offsetX(0);
      if (group.offsetY) group.offsetY(0);

      snapshots.forEach(({ child, absPos, absScale, absRot }) => {
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
        } catch (_e) {}
      });
      return true;
    }

    function ungroupSelectedNodes() {
      const groups = normalizeSelection(page.selectedNodes).filter(n =>
        n instanceof Konva.Group && n.getAttr("isUserGroup")
      );
      if (!groups.length) return;

      const newSelection = [];
      groups.forEach(group => {
        const parent = group.getParent();
        if (!parent) return;

        // Kluczowe: "wypiekamy" transformację grupy do dzieci przed rozgrupowaniem,
        // żeby po skali/obrocie/przesunięciu nie zmieniały rozmiaru ani pozycji.
        bakeUserGroupTransformToChildren(group);

        const groupZ = group.getZIndex();
        const children = Array.from(group.getChildren());

        children.forEach((child, idx) => {
          const abs = child.getAbsolutePosition();
          child.moveTo(parent);
          child.absolutePosition(abs);
          child.setZIndex(groupZ + idx);
          const prevDraggable = child.getAttr("_wasDraggableBeforeUserGroup");
          child.draggable(typeof prevDraggable === "boolean" ? prevDraggable : true);
          child.setAttr("_wasDraggableBeforeUserGroup", null);
          newSelection.push(child);
        });

        group.destroy();
      });

      page.selectedNodes = normalizeSelection(newSelection);
      disableCropMode(page);
      page.transformer.nodes(page.selectedNodes);
      highlightSelection();
      layer.batchDraw();
      transformerLayer.batchDraw();
      window.dispatchEvent(new CustomEvent('canvasModified', { detail: stage }));
      showFloatingButtons();
    }

    page.groupSelectedNodes = groupSelectedNodes;
    page.ungroupSelectedNodes = ungroupSelectedNodes;

    function positionFloatingMenu(menuEl) {
      if (!menuEl) return;
      const header = document.querySelector('.header-bar');
      if (!page || !page.container) return;
      const wrap =
        page.container.querySelector('.page-zoom-wrap') ||
        page.container.querySelector('.canvas-wrapper') ||
        page.container;
      const rect = wrap.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      let top = Math.max(12, rect.top - menuEl.offsetHeight - 12);
      if (header) {
        const h = header.getBoundingClientRect();
        // przypnij do górnego paska, wyśrodkuj w jego wysokości
        top = Math.max(h.top + 6, h.top + (h.height - menuEl.offsetHeight) / 2);
      }
      menuEl.style.left = `${centerX}px`;
      menuEl.style.top = `${top}px`;
      menuEl.style.transform = 'translateX(-50%)';
    }

    function positionSubmenuMenu(submenuEl) {
      if (!submenuEl) return;
      const floating = document.getElementById('floatingMenu');
      if (floating) {
        const fRect = floating.getBoundingClientRect();
        submenuEl.style.left = `${fRect.left + fRect.width / 2}px`;
        submenuEl.style.top = `${fRect.bottom + 8}px`;
        submenuEl.style.transform = 'translateX(-50%)';
        return;
      }
      if (!page || !page.container) return;
      const wrap =
        page.container.querySelector('.page-zoom-wrap') ||
        page.container.querySelector('.canvas-wrapper') ||
        page.container;
      const rect = wrap.getBoundingClientRect();
      const header = document.querySelector('.header-bar');
      const top = header
        ? Math.max(12, header.getBoundingClientRect().bottom + 8)
        : Math.max(12, rect.top + 12);
      submenuEl.style.left = `${rect.left + rect.width / 2}px`;
      submenuEl.style.top = `${top}px`;
      submenuEl.style.transform = 'translateX(-50%)';
    }

    function removeGroupQuickMenu() {
      if (!groupQuickMenu) return;
      if (groupQuickMenu._posHandler) {
        window.removeEventListener('scroll', groupQuickMenu._posHandler, true);
        window.removeEventListener('resize', groupQuickMenu._posHandler);
      }
      groupQuickMenu.remove();
      groupQuickMenu = null;
    }

    function getSelectionViewportRect() {
      const selected = normalizeSelection(page.selectedNodes);
      if (!selected || selected.length === 0) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selected.forEach((n) => {
        if (!n || !n.getClientRect) return;
        const r = n.getClientRect({ relativeTo: page.layer });
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
      });

      if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

      const wrap =
        page.container.querySelector('.page-zoom-wrap') ||
        page.container.querySelector('.canvas-wrapper') ||
        page.container;
      const wrapRect = wrap.getBoundingClientRect();
      const scaleX = wrapRect.width / Math.max(1, page.stage.width());
      const scaleY = wrapRect.height / Math.max(1, page.stage.height());

      return {
        left: wrapRect.left + minX * scaleX,
        top: wrapRect.top + minY * scaleY,
        width: (maxX - minX) * scaleX,
        height: (maxY - minY) * scaleY
      };
    }

    function positionGroupQuickMenu(menuEl) {
      if (!menuEl) return;
      const sel = getSelectionViewportRect();
      if (!sel) return;
      const vw = window.innerWidth || document.documentElement.clientWidth || 0;
      const menuW = Math.max(1, menuEl.offsetWidth || 120);
      const menuH = Math.max(1, menuEl.offsetHeight || 44);
      const centerX = sel.left + sel.width / 2;

      const clampLeftCenter = (cx) => {
        const min = 10 + menuW / 2;
        const max = Math.max(min, vw - 10 - menuW / 2);
        return Math.max(min, Math.min(max, cx));
      };

      const intersects = (a, b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

      // Domyślna pozycja: nad środkiem zaznaczenia.
      let targetCenterX = centerX;
      let targetTop = Math.max(12, sel.top - menuH - 10);

      // Wirtualny obszar uchwytu obrotu transformera (górny środek).
      const rotateHandleRect = {
        left: centerX - 18,
        right: centerX + 18,
        top: sel.top - 48,
        bottom: sel.top - 8
      };

      const candidateRect = {
        left: targetCenterX - menuW / 2,
        right: targetCenterX + menuW / 2,
        top: targetTop,
        bottom: targetTop + menuH
      };

      if (intersects(candidateRect, rotateHandleRect)) {
        // Gdy zachodzi kolizja z uchwytem obrotu, przenieś menu w prawo.
        targetCenterX = sel.left + sel.width - menuW / 2 - 8;
        targetTop = Math.max(12, sel.top - menuH - 16);
      }

      targetCenterX = clampLeftCenter(targetCenterX);
      menuEl.style.left = `${targetCenterX}px`;
      menuEl.style.top = `${targetTop}px`;
      menuEl.style.transform = 'translateX(-50%)';
    }

    function renderGroupQuickMenu() {
      const normalizedSelection = normalizeSelection(page.selectedNodes);
      const canGroup = normalizedSelection.length > 1;
      const canUngroup =
        normalizedSelection.length === 1 &&
        normalizedSelection[0] instanceof Konva.Group &&
        normalizedSelection[0].getAttr("isUserGroup");

      if (!canGroup && !canUngroup) {
        removeGroupQuickMenu();
        return;
      }

      removeGroupQuickMenu();

      const quick = document.createElement('div');
      quick.id = 'groupQuickMenu';
      quick.style.cssText = `
        position: fixed;
        z-index: 100001;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.98);
        border: 1px solid #d7dde8;
        box-shadow: 0 6px 20px rgba(15,23,42,0.18);
        backdrop-filter: blur(6px);
      `;
      quick.innerHTML = `
        <button class="group-quick-btn" data-action="${canUngroup ? "ungroup" : "group"}">
          ${canUngroup ? "Rozgrupuj" : "Grupuj"}
        </button>
      `;
      document.body.appendChild(quick);
      groupQuickMenu = quick;

      const posHandler = () => {
        if (!groupQuickMenu) return;
        positionGroupQuickMenu(groupQuickMenu);
      };
      groupQuickMenu._posHandler = posHandler;
      requestAnimationFrame(posHandler);
      setTimeout(posHandler, 20);
      window.addEventListener('scroll', posHandler, true);
      window.addEventListener('resize', posHandler);

      const quickBtn = quick.querySelector('.group-quick-btn');
      if (quickBtn) {
        quickBtn.onclick = (ev) => {
          ev.stopPropagation();
          if (canUngroup) ungroupSelectedNodes();
          else groupSelectedNodes();
          setTimeout(() => showFloatingButtons(), 0);
        };
      }
    }

    function showPageFloatingMenu(opts = {}) {
      if (
        window._activePageFloatingOwner &&
        window._activePageFloatingOwner !== page &&
        typeof window._activePageFloatingOwner.hidePageFloatingMenu === 'function'
      ) {
        window._activePageFloatingOwner.hidePageFloatingMenu();
      }

      removeFloatingMenu();
      removeGroupQuickMenu();
      window.hideSubmenu?.();
      window.hideTextToolbar?.();
      window.hideTextPanel?.();

      const bgNode = getPageBgNode();
      const startColorRaw = (page.settings && page.settings.pageBgColor) ||
        (bgNode && typeof bgNode.fill === "function" ? bgNode.fill() : "#ffffff") ||
        "#ffffff";
      const startColor = normalizeColorForInput(startColorRaw, "#ffffff");
      let startOpacity = Number(page.settings && page.settings.pageOpacity);
      if (!Number.isFinite(startOpacity)) {
        const bgOpacity = Number(bgNode && typeof bgNode.opacity === "function" ? bgNode.opacity() : 1);
        startOpacity = Number.isFinite(bgOpacity) ? bgOpacity : 1;
      }
      startOpacity = Math.max(0, Math.min(1, startOpacity));
      const startOpacityPct = Math.round(startOpacity * 100);
      const anchorEl = (opts && opts.anchorEl) || resolveHeaderPageSettingsAnchor();
      const useHeaderAnchor = !!anchorEl;

      const panel = document.createElement('div');
      panel.id = 'floatingMenu';
      panel.className = `floating-menu-page${useHeaderAnchor ? ' floating-menu-page--header' : ''}`;
      panel.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255,255,255,0.96);
          padding: 10px 14px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.18);
          border: 1px solid #e6e6e6;
          pointer-events: auto;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(6px);
      `;

      panel.innerHTML = `
        <div class="page-fab-title">Ustawienia strony</div>
        <label class="page-fab-group" for="pageBgColorFloating">
          <span class="page-fab-label">Kolor</span>
          <input id="pageBgColorFloating" class="page-fab-color" type="color" value="${startColor}">
        </label>
        <label class="page-fab-group" for="pageBgOpacityFloating">
          <span class="page-fab-label">Opacity</span>
          <input id="pageBgOpacityFloating" class="page-fab-range" type="range" min="0" max="100" step="1" value="${startOpacityPct}">
          <span id="pageBgOpacityValue" class="page-fab-value">${startOpacityPct}%</span>
        </label>
        <button type="button" class="page-fab-reset" data-action="page-reset">Reset</button>
      `;

      document.body.appendChild(panel);
      floatingButtons = panel;

      const colorInput = panel.querySelector('#pageBgColorFloating');
      const opacityInput = panel.querySelector('#pageBgOpacityFloating');
      const opacityValue = panel.querySelector('#pageBgOpacityValue');
      const resetBtn = panel.querySelector('[data-action="page-reset"]');

      const applyPageBgSettings = ({ markDirty = true } = {}) => {
        if (!colorInput || !opacityInput) return;
        const color = colorInput.value || "#ffffff";
        const opacityPctRaw = Number(opacityInput.value);
        const opacityPct = Number.isFinite(opacityPctRaw) ? Math.max(0, Math.min(100, opacityPctRaw)) : 100;
        const opacity = opacityPct / 100;

        if (opacityValue) opacityValue.textContent = `${Math.round(opacityPct)}%`;
        if (bgNode) {
          if (typeof bgNode.fill === "function") bgNode.fill(color);
          if (typeof bgNode.opacity === "function") bgNode.opacity(opacity);
        }
        if (!page.settings) page.settings = {};
        page.settings.pageBgColor = color;
        page.settings.pageOpacity = opacity;

        layer.batchDraw();
        transformerLayer.batchDraw();

        if (markDirty) {
          try {
            window.dispatchEvent(new CustomEvent('canvasModified', { detail: stage }));
          } catch (_e) {}
        }
      };

      colorInput?.addEventListener('input', () => applyPageBgSettings());
      opacityInput?.addEventListener('input', () => applyPageBgSettings());
      resetBtn?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (colorInput) colorInput.value = '#ffffff';
        if (opacityInput) opacityInput.value = '100';
        applyPageBgSettings();
      });

      const posHandler = () => {
        if (!floatingButtons) return;
        if (useHeaderAnchor && anchorEl && anchorEl.getBoundingClientRect) {
          const anchorRect = anchorEl.getBoundingClientRect();
          const menuWidth = Math.max(260, floatingButtons.offsetWidth || 260);
          const menuHeight = Math.max(52, floatingButtons.offsetHeight || 52);
          const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
          const left = Math.max(12, Math.min(anchorRect.left - menuWidth - 10, viewportWidth - menuWidth - 12));
          const top = Math.max(8, anchorRect.top + (anchorRect.height - menuHeight) / 2);
          floatingButtons.style.left = `${left}px`;
          floatingButtons.style.top = `${top}px`;
          floatingButtons.style.transform = 'none';
        } else {
          positionFloatingMenu(floatingButtons);
        }
        const submenuEl = document.getElementById('floatingSubmenu');
        if (submenuEl && submenuEl.style.display !== 'none') {
          positionSubmenuMenu(submenuEl);
        }
      };
      floatingButtons._posHandler = posHandler;
      requestAnimationFrame(posHandler);
      setTimeout(posHandler, 30);
      window.addEventListener('scroll', posHandler, true);
      window.addEventListener('resize', posHandler);

      applyPageBgSettings({ markDirty: false });
      page._pageFloatingMenuOpen = true;
      page._pageFloatingMenuHeader = useHeaderAnchor;
      window._activePageFloatingOwner = page;
      setHeaderPageSettingsToggleState(useHeaderAnchor);
    }

    function showFloatingButtons() {
      // jeśli menu już istnieje – usuń je
      removeFloatingMenu();
  
      const btnContainer = document.createElement('div');
      btnContainer.id = 'floatingMenu';
      btnContainer.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          display: flex;
          gap: 10px;
          background: rgba(255,255,255,0.96);
          padding: 10px 14px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.18);
          border: 1px solid #e6e6e6;
          pointer-events: auto;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(6px);
      `;
  
  
      btnContainer.innerHTML = `
          <button class="fab-btn fab-copy" data-action="copy"><i class="fas fa-copy"></i>Kopiuj</button>
          <button class="fab-btn fab-stylecopy" data-action="stylecopy"><i class="fas fa-paint-brush"></i>Kopiuj styl</button>
          <button class="fab-btn fab-cut" data-action="cut"><i class="fas fa-cut"></i>Wytnij</button>
          <button class="fab-btn fab-delete" data-action="delete"><i class="fas fa-trash"></i>Usuń</button>
          <button class="fab-btn fab-align" data-action="align"><i class="fas fa-crosshairs"></i>Pozycja</button>
          <button class="fab-btn fab-front" data-action="front"><i class="fas fa-layer-group"></i>Na wierzch</button>
          <button class="fab-btn fab-back" data-action="back"><i class="fas fa-layer-group"></i>Na spód</button>
          <button class="fab-btn fab-removebg" data-action="removebg"><i class="fas fa-eraser"></i>Usuń tło</button>
          <button class="fab-btn fab-effects" data-action="effects" title="Efekty zdjęcia"><i class="fas fa-magic"></i>Efekty zdjęcia</button>
          <button class="fab-btn fab-barcolor" data-action="barcolor"><i class="fas fa-barcode"></i>Kolor kodu</button>

      `;
  
      document.body.appendChild(btnContainer);
      floatingButtons = btnContainer;
      page._pageFloatingMenuOpen = false;
      page._pageFloatingMenuHeader = false;
      setHeaderPageSettingsToggleState(false);

      renderGroupQuickMenu();

      // jeśli zaznaczono pojedynczy tekst — pokaż toolbar tekstu
      const singleText =
          (page.selectedNodes.length === 1 &&
          page.selectedNodes[0] instanceof Konva.Text &&
          !(page.selectedNodes[0].getParent && page.selectedNodes[0].getParent().getAttr("isPriceGroup")));
      if (singleText) {
          window.showTextToolbar?.(page.selectedNodes[0]);
          setTimeout(() => window.showTextToolbar?.(page.selectedNodes[0]), 0);
          window.hideTextPanel?.();
      } else {
          window.hideTextToolbar?.();
      }

      // pozycjonowanie względem aktualnej strony roboczej
      const posHandler = () => {
          if (!floatingButtons) return;
          positionFloatingMenu(floatingButtons);
          if (groupQuickMenu) positionGroupQuickMenu(groupQuickMenu);
          const submenuEl = document.getElementById('floatingSubmenu');
          if (submenuEl && submenuEl.style.display !== 'none') {
              positionSubmenuMenu(submenuEl);
          }
      };
      floatingButtons._posHandler = posHandler;
      requestAnimationFrame(posHandler);
      setTimeout(posHandler, 50);
      window.addEventListener('scroll', posHandler, true);
      window.addEventListener('resize', posHandler);
  
      // obsługa akcji
      btnContainer.querySelectorAll('.fab-btn').forEach(btn => {
          btn.onclick = (ev) => {
              ev.stopPropagation();
              const action = btn.dataset.action;
              page.selectedNodes = normalizeSelection(page.selectedNodes);

              if (action === 'removebg') {
    const runRemoveBg = (typeof window.runRemoveBgAction === "function") ? window.runRemoveBgAction : null;
    if (!runRemoveBg) {
        const msg = "Brak modułu removebg.js (runRemoveBgAction).";
        if (typeof window.showAppToast === "function") window.showAppToast(msg, "error");
        else alert(msg);
        return;
    }

    const currentObj = (Array.isArray(page.selectedNodes) && page.selectedNodes.length > 0)
        ? page.selectedNodes[0]
        : null;

    runRemoveBg({
        page,
        obj: currentObj,
        layer,
        setupProductImageDrag,
        options: {
            thresholdLuma: 220,
            maxSatForBg: 35,
            distFromWhite: 45,
            gaussRadius: 1.2,
            finalAlphaCutoff: 28,
            dilatePasses: 1,
            localTimeoutMs: 12000
        }
    }).catch((err) => {
        console.error("RemoveBG action error:", err);
        if (typeof window.showAppToast === "function") {
            window.showAppToast(`Usuwanie tła nie powiodło się: ${String(err?.message || err)}`, "error");
        } else {
            alert(`Usuwanie tła nie powiodło się: ${String(err?.message || err)}`);
        }
    });
    return;
}

              if (action === 'group') {
                  groupSelectedNodes();
                  return;
              }
              if (action === 'ungroup') {
                  ungroupSelectedNodes();
                  return;
              }
              if (action === 'align') {
                  openAlignSubmenu();
                  return;
              }

const obj = page.selectedNodes[0];
if (!obj) return;
  
 if (action === 'copy') {

    const nodes = normalizeSelection(page.selectedNodes);

    window.globalClipboard = nodes.map(n => {
        const clone = n.clone({ draggable: true, listening: true });
        clone.getChildren?.().forEach(c => c.listening(true));
        return clone;
    });
    window.globalClipboardPasteCount = 0;

    window.globalPasteMode = true;
    pages.forEach(p => p.stage.container().style.cursor = 'copy');
}

              if (action === 'stylecopy') {
    const source = normalizeSelection(page.selectedNodes)[0];
    if (!source) return;

    const style = extractNodeStyle(source);
    if (!style) {
        alert("Tego typu elementu nie można skopiować stylem.");
        return;
    }

    window.globalStyleClipboard = style;
    window.globalStylePasteMode = true;
    pages.forEach(p => p.stage.container().style.cursor = 'copy');
}

              if (action === 'cut') {
    if (page.selectedNodes.length > 0) {
        // 📌 zapisujemy WSZYSTKIE zaznaczone obiekty do schowka
        window.globalClipboard = page.selectedNodes.map(n => {
    const clone = n.clone({ listening: true, draggable: true });
    clone.getChildren?.().forEach(c => c.listening(true));
    return clone;
});
        window.globalClipboardPasteCount = 0;

        window.globalPasteMode = true;

        // 📌 kasujemy wszystkie zaznaczone elementy na stronie
        page.selectedNodes.forEach(n => {
            clearCatalogSlotStateForNode(page, n);
            n.destroy();
        });
        page.selectedNodes = [];
    } else if (obj) {
        // fallback gdy przypadkiem jest tylko jeden obiekt
        window.globalClipboard = [obj.clone()];
        window.globalClipboardPasteCount = 0;
        clearCatalogSlotStateForNode(page, obj);
        obj.destroy();
    }

    // 📌 czyścimy transformera — nic nie jest już zaznaczone
    page.transformer.nodes([]);
    layer.batchDraw();
    transformerLayer.batchDraw();
}

              if (action === 'delete') {
    if (page.selectedNodes.length > 0) {
        page.selectedNodes.forEach(n => {
            clearCatalogSlotStateForNode(page, n);
            n.destroy();
        });
        page.selectedNodes = [];
    } else {
        clearCatalogSlotStateForNode(page, obj);
        obj.destroy();
    }

    page.transformer.nodes([]);
    layer.batchDraw();
    transformerLayer.batchDraw();
}

              // ⭐ Pobieramy wszystkie elementy tła
const backgrounds = page.layer.find(n =>
    n.getAttr("isPageBg") === true ||
    n.getAttr("isPageColor") === true
);

// najwyższy indeks tła — poniżej NIE schodzimy!
let lowestAllowedZ = 0;
if (backgrounds.length) {
    lowestAllowedZ = Math.max(...backgrounds.map(b => b.getZIndex()));
}

// 🚀 Na wierzch — jak dawniej
if (action === 'front') {
    obj.moveToTop();
    page.transformer.nodes([obj]);
}

// 🚀 Na spód — ale zawsze NAD tłem strony!
if (action === 'back') {
    const bg = page.layer.findOne(n => n.getAttr("isPageBg") === true);
    const bgZ = bg ? bg.getZIndex() : 0;

    // 🔥 Obiekt NIE może zejść niżej niż tło
    let targetZ = bgZ + 1;

    // Jeśli to obraz, trzymaj go NAD boxem,
    // żeby box nie przejmował kliknięć/resize po "Na spód".
    if (obj instanceof Konva.Image && obj.getAttr && obj.getAttr("isProductImage")) {
        let box = null;
        const slot = obj.getAttr && obj.getAttr("slotIndex");
        if (Number.isFinite(slot)) {
            box = page.layer.findOne(n =>
                n.getAttr &&
                n.getAttr("isBox") &&
                n.getAttr("slotIndex") === slot
            );
        }
        // fallback: szukaj boxa po przecięciu (gdy slotIndex jest pusty)
        if (!box) {
            const objRect = obj.getClientRect({ relativeTo: page.layer });
            const matches = page.layer.find(n => {
                if (!n.getAttr || !n.getAttr("isBox")) return false;
                const bRect = n.getClientRect({ relativeTo: page.layer });
                return Konva.Util.haveIntersection(objRect, bRect);
            });
            box = (matches && matches.length) ? matches[0] : null;
        }
        if (box && typeof box.getZIndex === "function") {
            targetZ = Math.max(targetZ, box.getZIndex() + 1);
        }
    }

    obj.setZIndex(targetZ);

    page.transformer.nodes([obj]);
    page.layer.batchDraw();
    page.transformerLayer.batchDraw();
}


page.layer.batchDraw();
page.transformerLayer.batchDraw();

if (action === 'barcolor') {
    const barcode = page.selectedNodes[0];
    if (!barcode || !barcode.getAttr("isBarcode"))
        return alert("Zaznacz kod kreskowy!");

    window.showSubmenu(`
        <button class="colorBtn" data-color="#000000" style="width:32px;height:32px;border-radius:6px;border:none;background:#000;"></button>
        <button class="colorBtn" data-color="#ffffff" style="width:32px;height:32px;border-radius:6px;border:1px solid #aaa;background:#fff;"></button>
        <button class="colorBtn" data-color="#FFD700" style="width:32px;height:32px;border-radius:6px;border:none;background:#FFD700;"></button>
        <input type="color" id="colorPicker" style="width:38px;height:32px;border:none;padding:0;margin-left:8px;">
        <button id="applyColorBtn"
            style="
                padding:8px 14px;
                border-radius:8px;
                border:none;
                background:#007cba;
                color:#fff;
                font-weight:600;
                cursor:pointer;
            ">
            Zastosuj
        </button>
    `);

    let previewColor = null;

    document.querySelectorAll(".colorBtn").forEach(btn => {
        btn.onclick = () => {
            previewColor = btn.dataset.color;
            window.recolorBarcode(barcode, previewColor, false);
        };
    });

    document.getElementById("colorPicker").oninput = (e) => {
        previewColor = e.target.value;
        window.recolorBarcode(barcode, previewColor, false);
    };

    document.getElementById("applyColorBtn").onclick = () => {
        if (!previewColor) return window.hideSubmenu();
        window.recolorBarcode(barcode, previewColor, true);
        window.hideSubmenu();
    };
}

              if (action === 'effects') {
    const img = page.selectedNodes[0];
    const isEligible =
        img instanceof Konva.Image &&
        !img.getAttr("isBarcode") &&
        !img.getAttr("isQRCode") &&
        !img.getAttr("isEAN") &&
        !img.getAttr("isTNZBadge") &&
        !img.getAttr("isCountryBadge") &&
        !img.getAttr("isOverlayElement") &&
        !img.getAttr("isBgBlur");

    if (!isEligible) return alert("Zaznacz zdjęcie, aby użyć efektów.");
    openImageEffectsMenu(img);
}

  
              layer.batchDraw();
          };
      });
  }
  
  function hideFloatingButtons() {
      removeFloatingMenu();
      removeGroupQuickMenu();
      window.hideSubmenu?.();
      page._pageFloatingMenuOpen = false;
      page._pageFloatingMenuHeader = false;
      if (window._activePageFloatingOwner === page) {
          window._activePageFloatingOwner = null;
      }
      setHeaderPageSettingsToggleState(false);
  }
  // Udostępniamy globalnie floating menu dla innych plików
window.showFloatingButtons = showFloatingButtons;
window.hideFloatingButtons = hideFloatingButtons;
window.showPageFloatingMenu = showPageFloatingMenu;
page.showFloatingButtons = showFloatingButtons;
page.hideFloatingButtons = hideFloatingButtons;
page.showPageFloatingMenu = showPageFloatingMenu;
page.hidePageFloatingMenu = hideFloatingButtons;

    function detachCloneFromCatalogSlot(node) {
        if (!node || !node.setAttr) return;
        node.setAttr("slotIndex", null);
        if (node.getAttr && node.getAttr("isAutoSlotGroup")) {
            node.setAttr("isAutoSlotGroup", false);
        }
        if (node.getChildren) {
            node.getChildren().forEach(child => detachCloneFromCatalogSlot(child));
        }
    }

    function ensurePastedNodeAbovePageBg(layer, node) {
        if (!layer || !node) return;
        try {
            const bg = layer.findOne(n => n.getAttr && n.getAttr("isPageBg") === true);
            if (bg && typeof bg.getZIndex === "function" && typeof node.setZIndex === "function") {
                const minZ = (bg.getZIndex() || 0) + 1;
                const currZ = typeof node.getZIndex === "function" ? node.getZIndex() : minZ;
                if (currZ < minZ) node.setZIndex(minZ);
            }
            if (typeof node.moveToTop === "function") node.moveToTop();
        } catch (_e) {}
    }


    // === GLOBALNE WKLEJANIE — WERSJA KOŃCOWA, DZIAŁAJĄCA ===
    stage.on('click.paste', (e) => {
        if (!window.globalPasteMode) return;
        const clip = window.globalClipboard;
        if (!Array.isArray(clip) || clip.length === 0) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const baseX = clip[0].x();
        const baseY = clip[0].y();
        const newNodes = [];
        const pastedDirectIdMap = {};

        clip.forEach(src => {
            const clone = src.clone({
                draggable: true,
                listening: true
            });
            detachCloneFromCatalogSlot(clone);
            remapDirectModuleIdsForPastedClone(clone, pastedDirectIdMap);
            cleanupPastedCloneRuntimeAttrs(clone);
            clone.x(pointer.x + (src.x() - baseX));
            clone.y(pointer.y + (src.y() - baseY));
            clone.setAttrs({
                isProductText: src.getAttr("isProductText") || false,
                isName: src.getAttr("isName") || false,
                isIndex: src.getAttr("isIndex") || false,
                isPrice: src.getAttr("isPrice") || false,
                isBox: src.getAttr("isBox") || false,
                isBarcode: src.getAttr("isBarcode") || false,
                isProductImage: src.getAttr("isProductImage") || false,
                slotIndex: null
            });
            layer.add(clone);
            ensurePastedNodeAbovePageBg(layer, clone);
            if (clone instanceof Konva.Image) {
                ensureImageFX(clone, layer);
                applyImageFX(clone);
            }
            rebindEditableTextForClone(clone, page);
            newNodes.push(clone);
        });

        layer.batchDraw();
        transformerLayer.batchDraw();
        page.selectedNodes = newNodes;
        page.transformer.nodes(newNodes);
        try {
            page.transformer.forceUpdate && page.transformer.forceUpdate();
            page.transformerLayer && page.transformerLayer.batchDraw && page.transformerLayer.batchDraw();
        } catch (_e) {}
        try {
            window.dispatchEvent(new CustomEvent('canvasModified', { detail: stage }));
        } catch (_e) {}

        window.globalPasteMode = false;
        window.globalClipboard = null;
        pages.forEach(p => p.stage.container().style.cursor = 'default');
    });

    // === KOPIUJ STYL → KLIKNIJ DOCELOWY ELEMENT ===
    stage.on('click.stylecopy', (e) => {
        if (!window.globalStylePasteMode) return;
        const style = window.globalStyleClipboard;
        if (!style) return;

        let target = e.target;
        if (!target || target === stage) return;
        if (target.getAttr && target.getAttr("isPageBg")) return;

        if (
            target.getParent &&
            target.getParent() instanceof Konva.Group &&
            (
                target.getParent().getAttr("isPriceGroup") ||
                target.getParent().getAttr("isPreset") ||
                target.getParent().getAttr("isShape") ||
                target.getParent().getAttr("isUserGroup")
            )
        ) {
            target = target.getParent();
        }

        // Cena (priceGroup) zawsze jako cała grupa – nigdy pojedynczy tekst/circle.
        if (
            target.getParent &&
            target.getParent() instanceof Konva.Group &&
            target.getParent().getAttr &&
            target.getParent().getAttr("isPriceGroup")
        ) {
            target = target.getParent();
        }

        if (
            style.meta &&
            style.meta.sourceIsPriceGroup &&
            !(target.getAttr && target.getAttr("isPriceGroup"))
        ) {
            return;
        }

        // Jeśli kopiujemy styl BOXA, zawsze nakładaj na box docelowego slotu,
        // nawet gdy kliknięto tekst/obraz wewnątrz tego boxa.
        if (style.meta && style.meta.sourceIsBox) {
            if (!(target.getAttr && target.getAttr("isBox"))) {
                const slot = target.getAttr && target.getAttr("slotIndex");
                if (Number.isFinite(slot)) {
                    const boxTarget = page.layer.findOne(n =>
                        n.getAttr &&
                        n.getAttr("isBox") &&
                        n.getAttr("slotIndex") === slot
                    );
                    if (boxTarget) target = boxTarget;
                }
            }
        }

        // Jeśli kopiujemy styl BARCODE, nakładaj tylko na inny barcode.
        if (style.meta && style.meta.sourceIsBarcode) {
            if (!(target.getAttr && target.getAttr("isBarcode"))) {
                return;
            }
        }

        const ok = applyNodeStyle(target, style);
        if (ok) {
            layer.batchDraw();
            transformerLayer.batchDraw();
            window.dispatchEvent(new CustomEvent('canvasModified', { detail: stage }));
            window.globalStylePasteMode = false;
            window.globalStyleClipboard = null;
            pages.forEach(p => p.stage.container().style.cursor = 'default');
            e.cancelBubble = true;
        }
    });

    // === ESC – WYŁĄCZENIE PASTE MODE ===
    const escHandler = (e) => {
        if (e.key === 'Escape' && (window.globalPasteMode || window.globalStylePasteMode)) {
            window.globalPasteMode = false;
            window.globalClipboard = null;
            window.globalStylePasteMode = false;
            window.globalStyleClipboard = null;
            pages.forEach(p => p.stage.container().style.cursor = 'default');
            document.removeEventListener('keydown', escHandler);
        }
    };
    if (!window._escHandlerBound) {
    document.addEventListener('keydown', escHandler);
    window._escHandlerBound = true;
}

// ===============================================
// PRIORYTET NAJMNIEJSZEGO OBIEKTU POD KURSOREM
// ===============================================
stage.on("mousedown.pickSmallest", (e) => {
    // Ta strona staje się aktywna już na mousedown,
    // żeby selekcja działała stabilnie od pierwszego kliknięcia.
    document.activeStage = stage;
    const page = pages.find(p => p.stage === stage);
    if (!page) return;

    const rawTarget = e && e.target ? e.target : null;
    if (rawTarget && rawTarget.getAttr) {
        if (rawTarget.getAttr("isDirectPriceRectBg")) {
            page._priorityClickTarget = rawTarget;
            return;
        }
        const rawParent = rawTarget.getParent ? rawTarget.getParent() : null;
        if (rawParent && rawParent.getAttr && rawParent.getAttr("isPriceGroup")) {
            page._priorityClickTarget = rawParent;
            return;
        }
        if (rawTarget.getAttr("isPriceGroup")) {
            page._priorityClickTarget = rawTarget;
            return;
        }
    }

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const isSelectableTarget = (n) => {
        if (!n || !n.getAttr) return false;
        if (typeof n.isDestroyed === "function" && n.isDestroyed()) return false;
        if (typeof n.visible === "function" && !n.visible()) return false;
        if (typeof n.listening === "function" && !n.listening()) return false;
        if (n.getLayer && n.getLayer() !== page.layer) return false;
        if (n.getAttr("isBgBlur")) return false;
        if (n.getAttr("isPageBg")) return false;
        if (n.getAttr("selectable") === false) return false;
        if (n.name && (n.name() === "selectionOutline" || n.name() === "selectionRect")) return false;
        return true;
    };

    page._priorityClickTarget = null;
    const hits = stage.getAllIntersections(pos).filter(isSelectableTarget);
    // Dla stylu z prostokątem ceny najpierw pozwól wybrać sam prostokąt,
    // dopiero potem ewentualnie group z tekstem ceny.
    const directPriceRect = hits.find(n => n.getAttr && n.getAttr("isDirectPriceRectBg"));
    if (directPriceRect) {
        page._priorityClickTarget = directPriceRect;
        return;
    }
    const priceGroup = hits.find(n => n.getAttr && n.getAttr("isPriceGroup"));
    if (priceGroup) {
        page._priorityClickTarget = priceGroup;
        return;
    }


    if (hits.length === 0) {
        page._priorityClickTarget = null;
        return;
    }

    // sortowanie według rozmiaru bounding-box (najmniejszy pierwszy)
    hits.sort((a, b) => {
        const ra = a.getClientRect();
        const rb = b.getClientRect();
        const areaA = ra.width * ra.height;
        const areaB = rb.width * rb.height;
        return areaA - areaB;
    });

    // wybieramy najmniejszy element jako docelowy klik
    let pick = hits[0];
    if (
        pick &&
        pick.getParent &&
        pick.getParent() instanceof Konva.Group &&
        (
            pick.getParent().getAttr("isPreset") ||
            pick.getParent().getAttr("isShape") ||
            pick.getParent().getAttr("isUserGroup")
        )
    ) {
        const pickIsPriceLike = !!(pick.getAttr && (pick.getAttr("isPriceGroup") || pick.getAttr("isDirectPriceRectBg")));
        const pickIsProductImage = !!(pick.getAttr && pick.getAttr("isProductImage"));
        // W grupie użytkownika zawsze wybieramy całą grupę (także dla ceny/prostokąta ceny).
        // Wyjątek: zdjęcie produktu musi dać się zaznaczyć bezpośrednio, aby działało kadrowanie.
        if ((!pickIsPriceLike || pick.getParent().getAttr("isUserGroup")) && !pickIsProductImage) {
            pick = pick.getParent();
        }
    }
    page._priorityClickTarget = pick;
});


    // === MULTI SELECT — POPRAWIONE SHIFT+CLICK (CANVA STYLE) ===
stage.on("click tap", (e) => {
    if (window.isEditingText) return;

    if (window.globalPasteMode) return;
    if (window.globalStylePasteMode) return;
    if (Date.now() < marqueeSuppressClickUntil) {
        marqueeSuppressClickUntil = 0;
        return;
    }

    document.activeStage = stage;

    const rawTarget = e.target;
    const isPriceLikeNode = (n) => !!(n && n.getAttr && (n.getAttr("isPriceGroup") || n.getAttr("isDirectPriceRectBg")));
    const getUserGroupAncestor = (n) => {
        let cur = n;
        while (cur && cur.getParent) {
            const p = cur.getParent();
            if (!(p instanceof Konva.Group)) break;
            if (p.getAttr && p.getAttr("isUserGroup")) return p;
            cur = p;
        }
        return null;
    };
    let forcedDirectPriceTarget = null;
    if (rawTarget && rawTarget.getAttr) {
        if (rawTarget.getAttr("isDirectPriceRectBg")) {
            forcedDirectPriceTarget = rawTarget;
        } else if (rawTarget.getAttr("isPriceGroup")) {
            forcedDirectPriceTarget = rawTarget;
        } else {
            const rp = rawTarget.getParent ? rawTarget.getParent() : null;
            if (rp && rp.getAttr && rp.getAttr("isPriceGroup")) {
                forcedDirectPriceTarget = rp;
            }
        }
    }
    if (forcedDirectPriceTarget) {
        const groupedAncestor = getUserGroupAncestor(forcedDirectPriceTarget);
        if (groupedAncestor) forcedDirectPriceTarget = groupedAncestor;
    }
    const isSelectableTarget = (n) => {
        if (!n || !n.getAttr) return false;
        if (typeof n.isDestroyed === "function" && n.isDestroyed()) return false;
        if (typeof n.visible === "function" && !n.visible()) return false;
        if (typeof n.listening === "function" && !n.listening()) return false;
        if (n.getLayer && n.getLayer() !== page.layer) return false;
        if (n.getAttr("isBgBlur")) return false;
        if (n.getAttr("isPageBg")) return false;
        if (n.getAttr("selectable") === false) return false;
        if (n.name && (n.name() === "selectionOutline" || n.name() === "selectionRect")) return false;
        return true;
    };
    let target = rawTarget;
    if (forcedDirectPriceTarget) {
        target = forcedDirectPriceTarget;
    }
    if (
        target &&
        target.getParent &&
        target.getParent() instanceof Konva.Group &&
        (
            target.getParent().getAttr("isPreset") ||
            target.getParent().getAttr("isShape") ||
            target.getParent().getAttr("isUserGroup")
        )
    ) {
        const targetIsPriceLike = isPriceLikeNode(target);
        // W grupie użytkownika nie wybieramy ceny/prostokąta osobno.
        if (!targetIsPriceLike || target.getParent().getAttr("isUserGroup")) {
            target = target.getParent();
        }
    }

    const priorityTarget = page._priorityClickTarget;
    page._priorityClickTarget = null;
    if (!isSelectableTarget(target) && isSelectableTarget(priorityTarget)) {
        target = priorityTarget;
    }

    // Fallback: gdy mousedown nie ustawił celu (np. szybki tap/kolizja handlerów),
    // policz trafienia pod kursorem bezpośrednio na click.
    if (!isSelectableTarget(target)) {
        const pos = stage.getPointerPosition();
        if (pos) {
            const fallbackHits = stage.getAllIntersections(pos).filter(isSelectableTarget);
            if (fallbackHits.length) {
                const directPriceRectHit = fallbackHits.find(n => n.getAttr && n.getAttr("isDirectPriceRectBg"));
                if (directPriceRectHit) {
                    target = directPriceRectHit;
                } else {
                    const priceGroupHit = fallbackHits.find(n => n.getAttr && n.getAttr("isPriceGroup"));
                    if (priceGroupHit) {
                        target = priceGroupHit;
                    } else {
                        fallbackHits.sort((a, b) => {
                            const ra = a.getClientRect();
                            const rb = b.getClientRect();
                            return (ra.width * ra.height) - (rb.width * rb.height);
                        });
                        let fallbackPick = fallbackHits[0];
                        if (
                            fallbackPick &&
                            fallbackPick.getParent &&
                            fallbackPick.getParent() instanceof Konva.Group &&
                            (
                                fallbackPick.getParent().getAttr("isPreset") ||
                                fallbackPick.getParent().getAttr("isShape") ||
                                fallbackPick.getParent().getAttr("isUserGroup")
                            )
                        ) {
                            const fallbackIsPriceLike = isPriceLikeNode(fallbackPick);
                            if (!fallbackIsPriceLike || fallbackPick.getParent().getAttr("isUserGroup")) {
                                fallbackPick = fallbackPick.getParent();
                            }
                        }
                        target = fallbackPick;
                    }
                }
            }
        }
    }

    if (isPriceLikeNode(target)) {
        const groupedAncestor = getUserGroupAncestor(target);
        if (groupedAncestor) target = groupedAncestor;
    }

    // 🔥 tło nie jest wybieralne
    if (target && target.getAttr && target.getAttr("isPageBg") === true) {
        page.selectedNodes = [];
        page.transformer.nodes([]);
        page.layer.find(".selectionOutline").forEach(n => n.destroy());
        showPageFloatingMenu();
        disableCropMode(page);
        page.layer.batchDraw();
        page.transformerLayer.batchDraw();
        return;
    }

    // 🔥 sprawdź, czy obiekt jest wybieralny
    if (target && target.getAttr && target.getAttr("isBgBlur")) {
        return;
    }

    const isSelectable =
    isSelectableTarget(target) && (
    target instanceof Konva.Text ||
    target instanceof Konva.Image ||
    target instanceof Konva.Group ||   // 🔥 DODANE
    (target instanceof Konva.Rect && !target.getAttr("isPageBg")) ||
    (target.getAttr && target.getAttr("isShape") === true));


    if (!isSelectable) {
        // klik w pusty obszar — usuń zaznaczenie
        page.selectedNodes = [];
        page.transformer.nodes([]);
        page.layer.find(".selectionOutline").forEach(n => n.destroy());
        hideFloatingButtons();
        disableCropMode(page);
        page.layer.batchDraw();
        page.transformerLayer.batchDraw();
        return;
    }

    const wasSelected =
        page.selectedNodes.includes(rawTarget) ||
        (rawTarget && rawTarget.getParent && page.selectedNodes.includes(rawTarget.getParent()));

    const canInlineEdit =
        rawTarget instanceof Konva.Text &&
        !(rawTarget.getParent && rawTarget.getParent().getAttr("isPriceGroup"));

    // === SHIFT + CLICK → dodanie lub odjęcie z zaznaczenia ===
    if (e.evt.shiftKey) {
        if (page.selectedNodes.includes(target)) {
            page.selectedNodes = page.selectedNodes.filter(n => n !== target);
        } else {
            page.selectedNodes.push(target);
        }
        page.selectedNodes = normalizeSelection(page.selectedNodes);
    } else {
        // zwykły klik — pojedynczy wybór
        const autoTarget = isSelectableTarget(target) ? target : null;
        if (!autoTarget) {
            page.selectedNodes = [];
            page.transformer.nodes([]);
            page.layer.find(".selectionOutline").forEach(n => n.destroy());
            hideFloatingButtons();
            disableCropMode(page);
            page.layer.batchDraw();
            page.transformerLayer.batchDraw();
            return;
        }
        if (forcedDirectPriceTarget && isSelectableTarget(forcedDirectPriceTarget)) {
            page.selectedNodes = [forcedDirectPriceTarget];
        } else {
            const isDirectCropImage = !!(
                autoTarget instanceof Konva.Image &&
                autoTarget.getAttr &&
                autoTarget.getAttr("isProductImage")
            );
            if (isDirectCropImage) {
                page.selectedNodes = [autoTarget];
            } else {
                const normalized = normalizeSelection([autoTarget]);
                page.selectedNodes = normalized.length ? normalized : [autoTarget];
            }
        }

    }

    const shouldInlineEdit = canInlineEdit && wasSelected && !e.evt.shiftKey;

    if (shouldInlineEdit) {
        rawTarget.fire("dblclick");
        return;
    }

    // === zastosowanie zmiany do transformera + outline ===
    const singleImage = (page.selectedNodes.length === 1 && page.selectedNodes[0] instanceof Konva.Image);
    if (singleImage) {
        const img = page.selectedNodes[0];
        const isUserImage = !!(img.getAttr && img.getAttr("isUserImage"));
        const isProductImage = !!(img.getAttr && img.getAttr("isProductImage"));
        if (isUserImage || isProductImage) {
            const cropEnabled = enableCropMode(page, img);
            if (!cropEnabled) {
                disableCropMode(page);
                page.transformer.nodes([img]);
            }
        } else {
            disableCropMode(page);
            page.transformer.nodes([img]);
        }
    } else {
        disableCropMode(page);
        page.transformer.nodes(page.selectedNodes);
    }

    // === Tekst: użyj floating toolbar zamiast bocznego panelu ===
    const singleText =
        (page.selectedNodes.length === 1 &&
        page.selectedNodes[0] instanceof Konva.Text &&
        !(page.selectedNodes[0].getParent && page.selectedNodes[0].getParent().getAttr("isPriceGroup")));
    const singleTextNode = singleText ? page.selectedNodes[0] : null;
    if (singleTextNode && typeof window.showTextToolbar === "function") {
        window.showTextToolbar(singleTextNode);
        window.hideTextPanel?.();
    } else {
        window.hideTextToolbar?.();
        window.hideTextPanel?.();
    }
    page.layer.find(".selectionOutline").forEach(n => n.destroy());
   

    if (page.selectedNodes.length > 0) {
        showFloatingButtons();
        if (singleTextNode && typeof window.showTextToolbar === "function") {
            requestAnimationFrame(() => window.showTextToolbar(singleTextNode));
        }
    } else {
        hideFloatingButtons();
    }

    // 🔧 lepsze uchwyty dla linii/strzałek (większy odstęp)
    if (page.selectedNodes.length === 1) {
        const n = page.selectedNodes[0];
        const isPriceLike =
            !!(n && n.getAttr && (
                n.getAttr("isPriceGroup") ||
                n.getAttr("isDirectPriceRectBg")
            ));
        const type = n.getAttr && n.getAttr("shapeType");
        if (isPriceLike) {
            // Cena/prostokąt ceny: ciaśniejsza ramka, bez rotacji (bardziej intuicyjne przy małych elementach).
            page.transformer.rotateEnabled(false);
            page.transformer.padding(1);
            page.transformer.anchorSize(10);
        } else if (type === "line" || type === "arrow") {
            page.transformer.rotateEnabled(true);
            page.transformer.padding(12);
            page.transformer.anchorSize(16);
        } else {
            page.transformer.rotateEnabled(true);
            page.transformer.padding(4);
            page.transformer.anchorSize(12);
        }
    } else {
        page.transformer.rotateEnabled(true);
    }

    page.layer.batchDraw();
    page.transformerLayer.batchDraw();
});



    // === TRANSFORMSTART – ZAPISUJEMY STAN ===
    stage.on('transformstart', () => {
   // 🔥 usuń stare obrysy i dodaj nowe zgodne z aktualnym rozmiarem
page.layer.find('.selectionOutline').forEach(n => n.destroy());



    page._oldTransformBox = page.transformer.getClientRect();
});
    
    // === EVENTY TRANSFORMACJI ===
    // Nie wysyłamy canvasModified na dragstart — to powodowało
    // kosztowne snapshoty historii/autosave jeszcze przed realną zmianą.
    stage.on('dragend transformend', () => {
        try {
            if (page.transformer && page.transformer.nodes && page.transformer.nodes().length) {
                page.transformer.forceUpdate && page.transformer.forceUpdate();
                page.transformerLayer && page.transformerLayer.batchDraw && page.transformerLayer.batchDraw();
            }
        } catch (_e) {}
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('canvasModified', { detail: stage }));
        }, 50);
    });

    pages.push(page);
    drawPage(page);
    fixProductTextSlotIndex(page);

    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('canvasCreated', { detail: stage }));
    }, 100);

    applyZoomToPage(page, currentZoom);
    if (typeof window.registerPageForPerf === "function") {
        window.registerPageForPerf(page);
    }
    return page;
    // === ZAWSZE KOREKTUJEMY ROZMIAR WRAPPERA DO ROZMIARU STRONY ===
// 🔥 TO JEST JEDYNY WAŻNY FRAGMENT — on usuwa białe linie w PDF
const wrapperFixer = () => {
    const wrapper = page.container.querySelector('.canvas-wrapper');
    if (!wrapper) return;

    wrapper.style.width = `${W}px`;
    wrapper.style.height = `${H}px`;
    wrapper.style.overflow = "hidden";

    // Konva Stage też musi się odświeżyć
    page.stage.width(W);
    page.stage.height(H);
    page.stage.batchDraw();
};

// natychmiastowe poprawienie wymiarów
wrapperFixer();

// poprawianie przy zmianie stylu lub zoomu
setTimeout(wrapperFixer, 50);
setTimeout(wrapperFixer, 250);
setTimeout(wrapperFixer, 500);

}

// === USUWANIE STRONY – GLOBALNA FUNKCJA ===
window.deletePage = function(page) {
    const index = pages.indexOf(page);
    if (index === -1) return;
    if (pagePerfObserver && page?.container) {
        try { pagePerfObserver.unobserve(page.container); } catch (_e) {}
    }

    page.stage.destroy();
    page.container.remove();
    pages.splice(index, 1);

    pages.forEach((p, i) => {
        p.number = i + 1;
        const h3 = p.container.querySelector('h3 span');
        if (h3) h3.textContent = `Strona ${i + 1}`;
    });
    if (typeof window.refreshPagesPerf === "function") {
        window.refreshPagesPerf();
    }
};

// 🔧 Globalna naprawa interakcji (gdyby coś się "zawiesiło")
window.repairPageInteractions = function() {
    pages.forEach(p => {
        if (!p || !p.stage || !p.layer || !p.transformerLayer) return;
        p.stage.listening(true);
        p.layer.listening(true);
        p.transformerLayer.listening(true);
        if (p.transformer && !p.transformer.getLayer()) {
            p.transformerLayer.add(p.transformer);
        }
        p.stage.container().style.pointerEvents = 'auto';
        p.stage.container().style.touchAction = 'none';
    });
    if (typeof window.refreshPagesPerf === "function") {
        window.refreshPagesPerf();
    }
};

// === RYSOWANIE STRONY ===
function drawPage(page) {
    const { layer, transformerLayer, products, settings } = page;
    const protectedSlots = page && page._customProtectedSlots instanceof Set
      ? page._customProtectedSlots
      : null;

    // Styl własny: rysuj tylko jeden slot (bez niszczenia warstwy) – mniejsza zależność od pełnego redraw
    const onlySlot = page._drawOnlySlot;
    const drawOnlyOneSlot = onlySlot != null && Number.isFinite(onlySlot);
    if (drawOnlyOneSlot) page._drawOnlySlot = null;

    if (!drawOnlyOneSlot) {
        // 🔥 usuwamy TYLKO elementy produktowe (bez TNZ)
        layer.find(node =>
            node.getAttr("slotIndex") !== undefined &&
            node.getAttr("isTNZBadge") !== true &&
            node.getAttr("isCountryBadge") !== true
        ).forEach(n => {
            if (n.getAttr("isBarcode")) {
                const si = n.getAttr("slotIndex");
                if (Number.isFinite(si) && page.barcodeObjects) {
                    page.barcodeObjects[si] = null;
                }
            }
            n.destroy();
        });
    }





    const showEan = document.getElementById('showEan')?.checked ?? true;
    const showCena = document.getElementById('showCena')?.checked ?? true;
    const frame3D = document.querySelector('input[name="frameStyle"]:checked')?.value === '3d';

    products.forEach((p, i) => {
        // Styl własny: rysuj tylko ten jeden slot (bez pełnego redraw)
        if (drawOnlyOneSlot && i !== onlySlot) return;
        // Styl własny: gdy trwa bezpieczny redraw po dodaniu nowego modułu,
        // nie renderujemy ponownie już istniejących, chronionych slotów.
        if (protectedSlots && protectedSlots.has(i)) return;
        // oryginalna pozycja
// oryginalna pozycja
const xRaw = ML + (i % COLS) * ((BW_dynamic) + GAP);

let y = MT + Math.floor(i / COLS) * (BH_dynamic + GAP);


// 🔥 PRZESUNIĘCIE WSZYSTKICH BOXÓW TYLKO DLA LAYOUT 8
let boxOffsetY = 20;
if (window.LAYOUT_MODE === "layout8") {
    boxOffsetY = -38;   // ustaw na -60, -80, -120 jeśli chcesz wyżej
}

// Szybki kreator – zastosuj globalne ustawienia
window.applyQuickSettings = function(opts = {}) {
    if (!Array.isArray(pages) || pages.length === 0) return;
    pages.forEach(p => {
        const imgStates = [];
        if (Array.isArray(p.slotObjects)) {
            p.slotObjects.forEach((img, idx) => {
                if (!img) return;
                if (typeof img.isDestroyed === "function" && img.isDestroyed()) {
                    p.slotObjects[idx] = null;
                    return;
                }
                imgStates[idx] = {
                    img,
                    x: img.x(),
                    y: img.y(),
                    scaleX: img.scaleX(),
                    scaleY: img.scaleY(),
                    rotation: img.rotation()
                };
                // usuń z warstwy, aby drawPage nie zniszczył obrazu
                if (img.getLayer && img.getLayer() === p.layer) {
                    img.remove();
                }
            });
        }
        if (opts.currency) p.settings.currency = opts.currency;
        if (opts.fontFamily) p.settings.fontFamily = opts.fontFamily;
        if (Number.isFinite(opts.nameSize)) p.settings.nameSize = opts.nameSize;
        if (Number.isFinite(opts.priceSize)) p.settings.priceSize = opts.priceSize;
        if (Number.isFinite(opts.indexSize)) p.settings.indexSize = opts.indexSize;
        if (opts.nameColor) p.settings.nameColor = opts.nameColor;
        if (opts.priceColor) p.settings.priceColor = opts.priceColor;
        if (opts.indexColor) p.settings.indexColor = opts.indexColor;
        if (Number.isFinite(opts.rankSize)) p.settings.rankSize = opts.rankSize;
        if (opts.rankColor) p.settings.rankColor = opts.rankColor;
        drawPage(p);
        if (imgStates.length > 0) {
            imgStates.forEach(state => {
                if (!state || !state.img) return;
                const img = state.img;
                if (typeof img.isDestroyed === "function" && img.isDestroyed()) return;
                if (img.getLayer && img.getLayer() !== p.layer) {
                    p.layer.add(img);
                }
                img.x(state.x);
                img.y(state.y);
                img.scaleX(state.scaleX);
                img.scaleY(state.scaleY);
                img.rotation(state.rotation || 0);
                setupProductImageDrag(img, p.layer);
            });
        }
        p.layer.batchDraw();
        p.transformerLayer.batchDraw();
    });
};

y += boxOffsetY;


// 🔥 Domyślne odstępy dla layoutu 6
let nameOffsetY = 31;
let imageOffsetY = 100;
let priceOffsetExtra = 120;
let indexOffsetY = -84;

// 🔥 Specjalne ustawienia dla layoutu 8 (mniejsze boksy)
// 🔥 Specjalne ustawienia dla layoutu 8 (mniejsze boksy)
if (window.LAYOUT_MODE === "layout8") {
    nameOffsetY = 16;        
    priceOffsetExtra = 70;    
    indexOffsetY = -80;       
    imageOffsetY = 80;        // ⭐ tu ustawiamy bazę dla zdjęć
}



// 🔥 PRZESUNIĘCIE WSZYSTKICH PUDEŁEK W LEWO / PRAWO
const LEFT_OFFSET = 0; // wyrównanie marginesów lewy/prawy
const x = xRaw + LEFT_OFFSET;


        // === PUDEŁKO ===
        // ===================================




      const isElegantStyle = window.CATALOG_STYLE === "styl_elegancki";
      const boxInteractive = !isElegantStyle;
      const box = new Konva.Rect({
          x, y,
          width: BW_dynamic,
          height: BH_dynamic,
          fill: isElegantStyle ? 'rgba(0,0,0,0)' : '#ffffff',
          stroke: isElegantStyle ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.06)',
          strokeWidth: isElegantStyle ? 0 : 1,
          cornerRadius: isElegantStyle ? 0 : 10,
          shadowColor: 'rgba(0,0,0,0.18)',
          shadowBlur: isElegantStyle ? 0 : 30,
          shadowOffset: { x: 0, y: isElegantStyle ? 0 : 12 },
          shadowOpacity: isElegantStyle ? 0 : 0.8,
          draggable: boxInteractive,
          listening: boxInteractive,
          visible: boxInteractive,
          selectable: boxInteractive,
          isHiddenByCatalogStyle: !boxInteractive,
          isBox: true,
          slotIndex: i
      });

      box.dragBoundFunc(pos => pos);
      if (page.boxScales[i]) {
          box.scaleX(page.boxScales[i].scaleX);
          box.scaleY(page.boxScales[i].scaleY);
      }
      layer.add(box);


        
// ================================
// TNZ BADGE — WERSJA POPRAWNA
// ================================
if (p.TNZ && p.TNZ.toString().trim().toLowerCase() === "x") {

    loadTNZImage((img) => {

        const badgeScale = (window.LAYOUT_MODE === "layout8" ? 0.085 : 0.11) * 2;


        // ================================
        // POZYCJA TNZ – OSOBNO DLA LAYOUTÓW
        // ================================
        let tnzOffsetX = -245;
        let tnzOffsetY = -15;

        // layout 6
        if (window.LAYOUT_MODE === "layout6") {
            tnzOffsetX = -320;   // lewo / prawo
            tnzOffsetY = 48;    // góra / dół
        }

        // layout 8
        if (window.LAYOUT_MODE === "layout8") {
            tnzOffsetX = -330;   // lewo / prawo
            tnzOffsetY = 28;    // góra / dół
        }

        const tnzBadge = new Konva.Image({
            image: img,

            x: x + BW_dynamic - img.width * badgeScale + tnzOffsetX,
            y: y + tnzOffsetY,

            scaleX: badgeScale,
            scaleY: badgeScale,

            draggable: true,
            listening: true,

            name: "tnzBadge",

            // 🔥 KLUCZOWE FLAGI
            isTNZBadge: true,
            isOverlayElement: true,
            slotIndex: i
        });

        layer.add(tnzBadge);
        tnzBadge.moveToTop();
        layer.batchDraw();
    });
}
// ================================
// COUNTRY BADGE — RUMUNIA
// ================================
if (
    p.KRAJPOCHODZENIA &&
    p.KRAJPOCHODZENIA.toString().trim().toLowerCase() === "rumunia"
) {

    loadCountryROImage((img) => {

        // ================================
// WIELKOŚĆ FLAGI – OSOBNO DLA LAYOUTÓW
// ================================
let countryScale = 0.10; // domyślnie layout 6

// layout 6 – TU ROZCIĄGASZ
if (window.LAYOUT_MODE === "layout6") {
    countryScale = 0.112;   // 🔥 ZWIĘKSZ TYLKO TO
}

// layout 8 – ZOSTAJE JAK JEST
if (window.LAYOUT_MODE === "layout8") {
    countryScale = 0.111;   // ❗ NIE RUSZAJ
}


        // ================================
        // POZYCJA FLAGI – OSOBNO DLA LAYOUTÓW
        // ================================
        let countryOffsetX = -60;
        let countryOffsetY = 25;

        // layout 6
        if (window.LAYOUT_MODE === "layout6") {
            countryOffsetX = 212;
            countryOffsetY = 107;
        }

        // layout 8
        if (window.LAYOUT_MODE === "layout8") {
            countryOffsetX = 212;
            countryOffsetY = 10;
        }

        const countryBadge = new Konva.Image({
            image: img,

            x: x + countryOffsetX,
            y: y + countryOffsetY,

            scaleX: countryScale,
            scaleY: countryScale,

            draggable: true,
            listening: true,

            name: "countryBadgeRO",

            // 🔥 KLUCZOWE FLAGI
            isCountryBadge: true,
            isOverlayElement: true,
            slotIndex: i
        });

        layer.add(countryBadge);
        countryBadge.moveToTop();
        layer.batchDraw();
    });
}
// ================================
// COUNTRY BADGE — UKRAINA
// ================================
if (
    p.KRAJPOCHODZENIA &&
    p.KRAJPOCHODZENIA.toString().trim().toLowerCase() === "ukraina"
) {

    loadCountryUAImage((img) => {

        // ================================
        // WIELKOŚĆ FLAGI – OSOBNO DLA LAYOUTÓW
        // ================================
        let countryScale = 0.10; // layout 6 – domyślnie

        if (window.LAYOUT_MODE === "layout6") {
            countryScale = 0.112;   // 🔥 większa tylko dla 6
        }

        if (window.LAYOUT_MODE === "layout8") {
            countryScale = 0.111;   // 🔒 NIE ZMIENIAMY
        }

        // ================================
        // POZYCJA FLAGI – OSOBNO DLA LAYOUTÓW
        // ================================
        let countryOffsetX = 212;
        let countryOffsetY = 107;

        if (window.LAYOUT_MODE === "layout8") {
            countryOffsetX = 212;
            countryOffsetY = 10;
        }

        const countryBadge = new Konva.Image({
            image: img,

            x: x + countryOffsetX,
            y: y + countryOffsetY,

            scaleX: countryScale,
            scaleY: countryScale,

            draggable: true,
            listening: true,

            name: "countryBadgeUA",

            // 🔥 KLUCZOWE FLAGI
            isCountryBadge: true,
            isOverlayElement: true,
            slotIndex: i
        });

        layer.add(countryBadge);
        countryBadge.moveToTop();
        layer.batchDraw();
    });
}

// ================================
// COUNTRY BADGE — LITWA
// ================================
if (
    p.KRAJPOCHODZENIA &&
    p.KRAJPOCHODZENIA.toString().trim().toLowerCase() === "litwa"
) {

    loadCountryLTImage((img) => {

        // ================================
        // WIELKOŚĆ FLAGI – OSOBNO DLA LAYOUTÓW
        // ================================
        let countryScale = 0.10; // layout 6

        if (window.LAYOUT_MODE === "layout6") {
            countryScale = 0.112;
        }

        if (window.LAYOUT_MODE === "layout8") {
            countryScale = 0.111;
        }

        // ================================
        // POZYCJA FLAGI – OSOBNO DLA LAYOUTÓW
        // ================================
        let countryOffsetX = 212;
        let countryOffsetY = 107;

        if (window.LAYOUT_MODE === "layout8") {
            countryOffsetX = 212;
            countryOffsetY = 10;
        }

        const countryBadge = new Konva.Image({
            image: img,

            x: x + countryOffsetX,
            y: y + countryOffsetY,

            scaleX: countryScale,
            scaleY: countryScale,

            draggable: true,
            listening: true,

            name: "countryBadgeLT",

            // 🔥 KLUCZOWE FLAGI
            isCountryBadge: true,
            isOverlayElement: true,
            slotIndex: i
        });

        layer.add(countryBadge);
        countryBadge.moveToTop();
        layer.batchDraw();
    });
}

// ================================
// COUNTRY BADGE — BUŁGARIA
// ================================
if (
    p.KRAJPOCHODZENIA &&
    p.KRAJPOCHODZENIA.toString().trim().toLowerCase() === "bulgaria"
) {

    loadCountryBGImage((img) => {

        // ================================
        // WIELKOŚĆ FLAGI – OSOBNO DLA LAYOUTÓW
        // ================================
        let countryScale = 0.10; // layout 6

        if (window.LAYOUT_MODE === "layout6") {
            countryScale = 0.112;
        }

        if (window.LAYOUT_MODE === "layout8") {
            countryScale = 0.111;
        }

        // ================================
        // POZYCJA FLAGI – OSOBNO DLA LAYOUTÓW
        // ================================
        let countryOffsetX = 212;
        let countryOffsetY = 107;

        if (window.LAYOUT_MODE === "layout8") {
            countryOffsetX = 212;
            countryOffsetY = 10;
        }

        const countryBadge = new Konva.Image({
            image: img,

            x: x + countryOffsetX,
            y: y + countryOffsetY,

            scaleX: countryScale,
            scaleY: countryScale,

            draggable: true,
            listening: true,

            name: "countryBadgeBG",

            // 🔥 KLUCZOWE FLAGI
            isCountryBadge: true,
            isOverlayElement: true,
            slotIndex: i
        });

        layer.add(countryBadge);
        countryBadge.moveToTop();
        layer.batchDraw();
    });
}

// ================================
// COUNTRY BADGE — POLSKA
// ================================
if (
    p.KRAJPOCHODZENIA &&
    p.KRAJPOCHODZENIA.toString().trim().toLowerCase() === "polska"
) {

    loadCountryPLImage((img) => {

        // ================================
        // WIELKOŚĆ FLAGI – OSOBNO DLA LAYOUTÓW
        // ================================
        let countryScale = 0.10; // layout 6

        if (window.LAYOUT_MODE === "layout6") {
            countryScale = 0.112;
        }

        if (window.LAYOUT_MODE === "layout8") {
            countryScale = 0.111;
        }

        // ================================
        // POZYCJA FLAGI – OSOBNO DLA LAYOUTÓW
        // ================================
        let countryOffsetX = 212;
        let countryOffsetY = 107;

        if (window.LAYOUT_MODE === "layout8") {
            countryOffsetX = 212;
            countryOffsetY = 10;
        }

        const countryBadge = new Konva.Image({
            image: img,

            x: x + countryOffsetX,
            y: y + countryOffsetY,

            scaleX: countryScale,
            scaleY: countryScale,

            draggable: true,
            listening: true,

            name: "countryBadgePL",

            // 🔥 KLUCZOWE FLAGI
            isCountryBadge: true,
            isOverlayElement: true,
            slotIndex: i
        });

        layer.add(countryBadge);
        countryBadge.moveToTop();
        layer.batchDraw();
    });
}



        // === NAZWA ===
        const name = p.NAZWA || 'Pusty';
        const maxWidth = BW - 20;
        const lines = splitTextIntoLines(name, maxWidth, settings.nameSize, settings.fontFamily);
        let nameTop = y + nameOffsetY;

        const fullName = p.NAZWA || 'Pusty';
const textObj = new Konva.Text({
    x: x + BW / 35,
    y: nameTop,
    text: fullName,
    fontSize: settings.nameSize,
    fill: settings.nameColor || settings.textColor,
    fontFamily: settings.fontFamily,
    align: 'center',
    width: BW_dynamic - 20,
    wrap: 'word',
    draggable: true,
    listening: true,
    isProductText: true,
    isName: true,
    slotIndex: i
});
textObj.dragBoundFunc(pos => pos);
layer.add(textObj);
enableEditableText(textObj, page);
textObj.moveToTop();
if (textObj.height() < 28) textObj.height(28);



        // === INDEKS ===
        const indexObj = new Konva.Text({
    x: x + BW / 1.70 + 6,
    y: y + BH + indexOffsetY + (window.LAYOUT_MODE === "layout6" ? -2 : (window.LAYOUT_MODE === "layout8" ? -2 : 0)),
    text: `Indeks: ${p.INDEKS || '-'}`,
    fontSize: settings.indexSize,
    fill: settings.indexColor || settings.textColor,
    fontFamily: settings.fontFamily,
    align: 'center',
    width: 100,         // <<< szerokość pozwala zmieścić cały tekst w 1 linii
    wrap: 'none',       // <<< ZAKAZ łamania linii — najważniejsze
    draggable: true,
    listening: true,
    isProductText: true,
    isIndex: true,
    slotIndex: i
});



        indexObj.dragBoundFunc(pos => pos);
        layer.add(indexObj);
        if (indexObj.height() < 26) indexObj.height(26);
        indexObj.moveToTop();
        enableEditableText(textObj, page);

      // === CENA (CANVA STYLE – GROUP) ===
if (showCena && p.CENA) {

    const currency = String(page.settings.currency || 'gbp').toLowerCase();

    // --- rozbij cenę ---
    // 🔒 NORMALIZACJA CENY – MAX 2 MIEJSCA PO PRZECINKU
let raw = String(p.CENA)
.replace(',', '.')
.replace(/[^0-9.]/g, '');

let value = parseFloat(raw);

if (isNaN(value)) value = 0;

// zawsze max 2 miejsca po przecinku
let fixed = value.toFixed(2);

let [main, decimal] = fixed.split('.');


    const packUnit = (p.JEDNOSTKA || 'SZT.').toUpperCase();

let unitLabel = 'SZT.';
if (packUnit === 'KG') unitLabel = 'KG';

let unit = `£ / ${unitLabel}`;
if (currency === 'euro' || currency === 'eur' || currency === '€') unit = `€ / ${unitLabel}`;
if (currency === 'pln' || currency === 'zł' || currency === 'zl') unit = `zł / ${unitLabel}`;


    // --- pozycja Y liczona od BOXA ---
    // Podnieś całą cenę proporcjonalnie
    const PRICE_Y_SHIFT_LAYOUT6 = -78;
    const PRICE_Y_SHIFT_LAYOUT8 = -20;
    let priceY;
    if (window.LAYOUT_MODE === "layout6") {
        priceY = y + BH_dynamic - 130 + PRICE_Y_SHIFT_LAYOUT6;
    }
    if (window.LAYOUT_MODE === "layout8") {
        priceY = y + BH_dynamic - 135 + PRICE_Y_SHIFT_LAYOUT8;
    }

    // Kolory ceny ze stylu własnego (koło + tekst) – żeby w katalogu było widać ustawiony kolor
    const priceBgColor = (p.PRICE_BG_COLOR != null && String(p.PRICE_BG_COLOR).trim() !== '') ? String(p.PRICE_BG_COLOR).trim() : '#d71920';
    const priceTextColor = (p.PRICE_TEXT_COLOR != null && String(p.PRICE_TEXT_COLOR).trim() !== '') ? String(p.PRICE_TEXT_COLOR).trim() : '#ffffff';
    const priceTextScale = Number.isFinite(p.PRICE_TEXT_SCALE) && p.PRICE_TEXT_SCALE > 0 ? p.PRICE_TEXT_SCALE : 1;

    // === GROUPA CENY (JEDEN OBIEKT!) ===
    const priceGroup = new Konva.Group({
        x: x + BW_dynamic - 150,
        y: priceY,
        draggable: true,
        listening: true,

        isProductText: true,
        isPrice: true,
        isPriceGroup: true,
        slotIndex: i,

        name: "priceGroup"
    });
    priceGroup.setAttr("priceBgColor", priceBgColor);
    priceGroup.setAttr("priceTextColor", priceTextColor);
    priceGroup.setAttr("priceTextScale", priceTextScale);

    const basePriceSize = Math.round(settings.priceSize * 1.9 * priceTextScale);
    // === GŁÓWNA CENA ===
    const priceMain = new Konva.Text({
        text: main,
        fontSize: basePriceSize,
        fontFamily: settings.fontFamily,
        fill: priceTextColor,
        fontStyle: 'bold'
    });

    // === GROSZE ===
    const priceDecimal = new Konva.Text({
        text: decimal,
        fontSize: Math.round(settings.priceSize * 0.55 * priceTextScale),
        fontFamily: settings.fontFamily,
        fill: priceTextColor,
        x: priceMain.width() + 4,
        y: priceMain.height() * 0.10

    });

    // === WALUTA / SZT ===
    const priceUnit = new Konva.Text({
  text: unit,

  fontSize: Math.round(settings.priceSize * 0.35 * priceTextScale),
  fontFamily: settings.fontFamily,
  fill: priceTextColor,
  x: priceMain.width() + 4,
  y: priceDecimal.height() * 1.5,
  name: 'priceUnit'   // 🔥 TO JEST KLUCZ
});


    // === SKŁADANIE GRUPY ===
    priceGroup.add(priceMain, priceDecimal, priceUnit);
    layer.add(priceGroup);
    priceGroup.moveToTop();

    // ✅ Edycja ceny po dwukliku na grupie ceny
    priceGroup.on("dblclick dbltap", () => {
        const current = `${priceMain.text()}.${priceDecimal.text()}`;
        const raw = prompt("Podaj nową cenę (np. 1,49):", current.replace(".", ","));
        if (raw == null) return;

        const parsed = parseFloat(String(raw).replace(",", ".").replace(/[^0-9.]/g, ""));
        if (!Number.isFinite(parsed)) return;

        const [newMain, newDecimal] = parsed.toFixed(2).split(".");
        priceMain.text(newMain);
        priceDecimal.text(newDecimal);

        const gap = 4;
        priceDecimal.x(priceMain.width() + gap);
        priceDecimal.y(priceMain.height() * 0.10);
        priceUnit.x(priceMain.width() + gap);
        priceUnit.y(priceDecimal.height() * 1.5);

        // Jeśli aktywny styl elegancki, przelicz czerwone koło i centrowanie 1:1 po zmianie ceny
        if (priceGroup.getAttr("isElegantPriceStyled") && typeof window.applyCatalogStyleVisual === "function") {
            window.applyCatalogStyleVisual(window.CATALOG_STYLE || "styl_elegancki");
        } else {
            layer.batchDraw();
            page.transformerLayer?.batchDraw?.();
        }
    });

    // 🔥 KLUCZ: transformer MA ŁAPAĆ TYLKO GROUP
    
}



        // === ZDJĘCIE ===
const familyImageUrls = Array.isArray(p.FAMILY_IMAGE_URLS)
    ? p.FAMILY_IMAGE_URLS.map(v => String(v || "").trim()).filter(Boolean)
    : [];
const customImageLayouts = Array.isArray(p.CUSTOM_IMAGE_LAYOUTS) ? p.CUSTOM_IMAGE_LAYOUTS : [];
const normalizeLayoutItem = (item) => {
    if (!item || typeof item !== "object") return null;
    const x = Number(item.x);
    const y = Number(item.y);
    const w = Number(item.w);
    const h = Number(item.h);
    if (![x, y, w, h].every(Number.isFinite)) return null;
    return {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        w: Math.max(0, Math.min(1, w)),
        h: Math.max(0, Math.min(1, h))
    };
};

if (familyImageUrls.length > 1) {
    const imgTop = y + imageOffsetY + (lines.length * settings.nameSize * 1.2);
    let imageExtraY = 0;
    if (window.LAYOUT_MODE === "layout8") imageExtraY = -160;

    let boxX = x + 20;
    let boxY = imgTop + imageExtraY;
    let boxW = (BW * 0.45 - 20);
    let boxH = (BH * 0.6);

    if (window.LAYOUT_MODE === "layout8") {
        boxW = BW_dynamic * 0.48;
        boxH = BH_dynamic * 0.52;
        boxX = x + 12;
        boxY = imgTop + imageExtraY;
    }

    const count = Math.min(4, familyImageUrls.length);
    for (let fi = 0; fi < count; fi++) {
        const srcUrl = familyImageUrls[fi];
        if (!srcUrl) continue;
        (async () => {
            let variants = (typeof window.normalizeImageVariantPayload === "function")
                ? window.normalizeImageVariantPayload(srcUrl)
                : { original: srcUrl, editor: srcUrl, thumb: srcUrl };
            if (typeof window.createImageVariantsFromSource === "function") {
                try {
                    variants = await window.createImageVariantsFromSource(srcUrl, {
                        cacheKey: `family:${srcUrl}`
                    });
                } catch (_e) {}
            }
            const originalSrc = (typeof window.getImageVariantSource === "function")
                ? window.getImageVariantSource(variants, "original")
                : srcUrl;
            const editorSrc = (typeof window.getImageVariantSource === "function")
                ? window.getImageVariantSource(variants, "editor")
                : (variants?.editor || srcUrl);
            const thumbSrc = (typeof window.getImageVariantSource === "function")
                ? window.getImageVariantSource(variants, "thumb")
                : (variants?.thumb || editorSrc || srcUrl);
            const renderSrc = String(editorSrc || srcUrl || "").trim();
            if (!renderSrc) return;

            Konva.Image.fromURL(renderSrc, (img) => {
                if (!img || (typeof img.isDestroyed === "function" && img.isDestroyed())) return;

                let frameX = boxX;
                let frameY = boxY;
                let frameW = boxW;
                let frameH = boxH;

                // Domyślny układ rodziny: pionowo, jedno pod drugim.
                const gap = Math.max(2, Math.round(boxH * 0.02));
                const stackCount = Math.max(1, count);
                frameW = boxW * 0.74;
                frameH = Math.max(1, (boxH - gap * (stackCount - 1)) / stackCount);
                frameX = boxX;
                frameY = boxY + fi * (frameH + gap);

                // Ręczny układ z `styl-wlasny.js` (jeśli zdefiniowany dla produktu).
                const manualLayout = normalizeLayoutItem(customImageLayouts[fi]);
                if (manualLayout) {
                    frameX = boxX + boxW * manualLayout.x;
                    frameY = boxY + boxH * manualLayout.y;
                    frameW = boxW * manualLayout.w;
                    frameH = boxH * manualLayout.h;
                }

                const scale = frameW / Math.max(1, img.width());
                const imgH = img.height() * scale;

                img.x(frameX);
                img.y(frameY + (frameH - imgH) / 2);
                img.scaleX(scale);
                img.scaleY(scale);
                img.draggable(true);
                img.dragBoundFunc(pos => pos);
                img.listening(true);
                img.setAttrs({
                    width: img.width(),
                    height: img.height(),
                    isProductImage: true,
                    slotIndex: i,
                    familyImageIndex: fi
                });
                if (typeof window.applyImageVariantsToKonvaNode === "function") {
                    window.applyImageVariantsToKonvaNode(img, {
                        original: originalSrc || renderSrc,
                        editor: renderSrc,
                        thumb: thumbSrc || renderSrc
                    });
                } else {
                    img.setAttr("originalSrc", originalSrc || renderSrc);
                    img.setAttr("editorSrc", renderSrc);
                    img.setAttr("thumbSrc", thumbSrc || renderSrc);
                }
                layer.add(img);
                setupProductImageDrag(img, layer);
                addImageShadow(layer, img);
                const priceGroupTop = layer.findOne((n) => n && n.getAttr && n.getAttr("isPriceGroup") && n.getAttr("slotIndex") === i);
                if (priceGroupTop && priceGroupTop.moveToTop) priceGroupTop.moveToTop();
                layer.batchDraw();
                transformerLayer?.batchDraw?.();
            });
        })();
    }
} else if (page.slotObjects[i]) {
    const img = page.slotObjects[i];

    // 🔥 DODATKOWE PRZESUNIĘCIE ZDJĘCIA TYLKO DLA LAYOUT 8
    let imageExtraY = 0;
    if (window.LAYOUT_MODE === "layout8"){
        imageExtraY = -160;   // 🔼 podniesienie zdjęcia (zmień na -20, -60 itd.)
    }

    let scale = Math.min(
        (BW * 0.45 - 20) / img.width(),
        (BH * 0.6) / img.height(),
        1
    );

    const imgTop =
        y + imageOffsetY + (lines.length * settings.nameSize * 1.2);

    let imgX = x + 20;
    let imgY = imgTop + imageExtraY;   // 🔥 KLUCZOWA ZMIANA

    // ✅ Wyrównanie i stała „ramka” dla layout 8 (równe pozycje i skale)
    if (window.LAYOUT_MODE === "layout8") {
        const boxW = BW_dynamic * 0.48;
        const boxH = BH_dynamic * 0.52;
        scale = Math.min(boxW / img.width(), boxH / img.height(), 1);
        imgX = x + 12 + (boxW - img.width() * scale) / 2;
        imgY = imgTop + imageExtraY + (boxH - img.height() * scale) / 2;
    }

    const manualSingle = normalizeLayoutItem(customImageLayouts[0]);
    if (manualSingle) {
        let boxX = x + 20;
        let boxY = imgTop + imageExtraY;
        let boxW = (BW * 0.45 - 20);
        let boxH = (BH * 0.6);
        if (window.LAYOUT_MODE === "layout8") {
            boxW = BW_dynamic * 0.48;
            boxH = BH_dynamic * 0.52;
            boxX = x + 12;
            boxY = imgTop + imageExtraY;
        }
        const frameX = boxX + boxW * manualSingle.x;
        const frameY = boxY + boxH * manualSingle.y;
        const frameW = boxW * manualSingle.w;
        const frameH = boxH * manualSingle.h;
        scale = frameW / Math.max(1, img.width());
        const imgH = img.height() * scale;
        imgX = frameX;
        imgY = frameY + (frameH - imgH) / 2;
    }

    img.x(imgX);
    img.y(imgY);

    img.scaleX(scale);
    img.scaleY(scale);
    img.draggable(true);
    img.dragBoundFunc(pos => pos);

    layer.add(img);

    img.listening(true);
    img.setAttrs({
        width: img.width(),
        height: img.height(),
        isProductImage: true,
        slotIndex: i
    });
    // 🔥 CANVA STYLE SHADOW
setupProductImageDrag(img, layer);
addImageShadow(layer, img);

} else if (familyImageUrls.length === 1) {
    const imgTop = y + imageOffsetY + (lines.length * settings.nameSize * 1.2);
    let imageExtraY = 0;
    if (window.LAYOUT_MODE === "layout8") imageExtraY = -160;
    const srcUrl = familyImageUrls[0];
    if (srcUrl) {
        (async () => {
            let variants = (typeof window.normalizeImageVariantPayload === "function")
                ? window.normalizeImageVariantPayload(srcUrl)
                : { original: srcUrl, editor: srcUrl, thumb: srcUrl };
            if (typeof window.createImageVariantsFromSource === "function") {
                try {
                    variants = await window.createImageVariantsFromSource(srcUrl, {
                        cacheKey: `family-single:${srcUrl}`
                    });
                } catch (_e) {}
            }
            const originalSrc = (typeof window.getImageVariantSource === "function")
                ? window.getImageVariantSource(variants, "original")
                : srcUrl;
            const editorSrc = (typeof window.getImageVariantSource === "function")
                ? window.getImageVariantSource(variants, "editor")
                : (variants?.editor || srcUrl);
            const thumbSrc = (typeof window.getImageVariantSource === "function")
                ? window.getImageVariantSource(variants, "thumb")
                : (variants?.thumb || editorSrc || srcUrl);
            const renderSrc = String(editorSrc || srcUrl || "").trim();
            if (!renderSrc) return;

            Konva.Image.fromURL(renderSrc, (img) => {
                if (!img || (typeof img.isDestroyed === "function" && img.isDestroyed())) return;
                let scale = Math.min(
                    (BW * 0.45 - 20) / img.width(),
                    (BH * 0.6) / img.height(),
                    1
                );
                let imgX = x + 20;
                let imgY = imgTop + imageExtraY;
                if (window.LAYOUT_MODE === "layout8") {
                    const boxW = BW_dynamic * 0.48;
                    const boxH = BH_dynamic * 0.52;
                    scale = Math.min(boxW / img.width(), boxH / img.height(), 1);
                    imgX = x + 12 + (boxW - img.width() * scale) / 2;
                    imgY = imgTop + imageExtraY + (boxH - img.height() * scale) / 2;
                }
                const manualSingle = normalizeLayoutItem(customImageLayouts[0]);
                if (manualSingle) {
                    let boxX = x + 20;
                    let boxY = imgTop + imageExtraY;
                    let boxW = (BW * 0.45 - 20);
                    let boxH = (BH * 0.6);
                    if (window.LAYOUT_MODE === "layout8") {
                        boxW = BW_dynamic * 0.48;
                        boxH = BH_dynamic * 0.52;
                        boxX = x + 12;
                        boxY = imgTop + imageExtraY;
                    }
                    const frameX = boxX + boxW * manualSingle.x;
                    const frameY = boxY + boxH * manualSingle.y;
                    const frameW = boxW * manualSingle.w;
                    const frameH = boxH * manualSingle.h;
                    scale = frameW / Math.max(1, img.width());
                    const imgH = img.height() * scale;
                    imgX = frameX;
                    imgY = frameY + (frameH - imgH) / 2;
                }

                img.x(imgX);
                img.y(imgY);
                img.scaleX(scale);
                img.scaleY(scale);
                img.draggable(true);
                img.dragBoundFunc(pos => pos);
                img.listening(true);
                img.setAttrs({
                    width: img.width(),
                    height: img.height(),
                    isProductImage: true,
                    slotIndex: i
                });
                if (typeof window.applyImageVariantsToKonvaNode === "function") {
                    window.applyImageVariantsToKonvaNode(img, {
                        original: originalSrc || renderSrc,
                        editor: renderSrc,
                        thumb: thumbSrc || renderSrc
                    });
                } else {
                    img.setAttr("originalSrc", originalSrc || renderSrc);
                    img.setAttr("editorSrc", renderSrc);
                    img.setAttr("thumbSrc", thumbSrc || renderSrc);
                }
                layer.add(img);
                setupProductImageDrag(img, layer);
                addImageShadow(layer, img);
                const priceGroupTop = layer.findOne((n) => n && n.getAttr && n.getAttr("isPriceGroup") && n.getAttr("slotIndex") === i);
                if (priceGroupTop && priceGroupTop.moveToTop) priceGroupTop.moveToTop();
                layer.batchDraw();
                transformerLayer?.batchDraw?.();
            });
        })();
    }
}


        // === KOD KRESKOWY ===
        if (showEan && p['KOD EAN'] && !page.barcodeObjects[i]) {

    // ⭐⭐⭐ NORMALIZACJA KODU EAN ⭐⭐⭐
    const cleanEAN = normalizeEAN(p['KOD EAN']);  

    window.generateBarcode(cleanEAN, data => {

    if (!data) return;
    Konva.Image.fromURL(data, img => {

        // 🔥 KOPIA ORYGINALNEGO PNG — unikalna dla KAŻDEGO kodu
        const originalCopy = data.slice();      
        img.setAttr("barcodeOriginalSrc", originalCopy);

        const bw = 140;
        const bh = 40;
        const bx = x + (BW_dynamic - bw) / 1 - 35;
        const by = y + BH - bh - 20;

        const scaleFactor = 0.65;
        img.scaleX(scaleFactor);
        img.scaleY(scaleFactor);
        img.x(bx);
        img.y(by);

        img.draggable(true);
        img.dragBoundFunc(pos => pos);

        img.setAttrs({
            isBarcode: true,
            slotIndex: i,
            width: img.width(),
            height: img.height()
        });

        layer.add(img);
        page.barcodeObjects[i] = img;
        page.barcodePositions[i] = { x: bx, y: by };

        layer.batchDraw();
        transformerLayer.batchDraw();
    });
});

        }
    });

    // === BANER ===
    if (page.settings.bannerUrl) {
        const oldBanner = layer.getChildren().find(o => o.getAttr('name') === 'banner');
        if (oldBanner) oldBanner.destroy();

        (async () => {
            const src = String(page.settings.bannerUrl || "").trim();
            let variants = (typeof window.normalizeImageVariantPayload === "function")
                ? window.normalizeImageVariantPayload(src)
                : { original: src, editor: src, thumb: src };
            if (src && typeof window.createImageVariantsFromSource === "function") {
                try {
                    variants = await window.createImageVariantsFromSource(src, {
                        cacheKey: `banner:${src}`
                    });
                } catch (_e) {}
            }
            const originalSrc = (typeof window.getImageVariantSource === "function")
                ? window.getImageVariantSource(variants, "original")
                : src;
            const editorSrc = (typeof window.getImageVariantSource === "function")
                ? window.getImageVariantSource(variants, "editor")
                : (variants?.editor || src);
            const thumbSrc = (typeof window.getImageVariantSource === "function")
                ? window.getImageVariantSource(variants, "thumb")
                : (variants?.thumb || editorSrc || src);
            const renderSrc = String(editorSrc || src || "").trim();
            if (!renderSrc) return;

            Konva.Image.fromURL(renderSrc, img => {
                const scale = Math.min(W / img.width(), 113 / img.height());
                img.scaleX(scale);
                img.scaleY(scale);
                img.x(0);
                img.y(0);
                img.setAttr('name', 'banner');
                img.draggable(true);
                img.dragBoundFunc(pos => pos);
                layer.add(img);
                img.listening(true);
                img.setAttrs({
                    width: img.width(),
                    height: img.height()
                });
                if (typeof window.applyImageVariantsToKonvaNode === "function") {
                    window.applyImageVariantsToKonvaNode(img, {
                        original: originalSrc || renderSrc,
                        editor: renderSrc,
                        thumb: thumbSrc || renderSrc
                    });
                } else {
                    img.setAttr("originalSrc", originalSrc || renderSrc);
                    img.setAttr("editorSrc", renderSrc);
                    img.setAttr("thumbSrc", thumbSrc || renderSrc);
                }
                img.moveToBottom();
                layer.batchDraw();
                transformerLayer.batchDraw();
            });
        })();
    } else {
        layer.batchDraw();
        transformerLayer.batchDraw();
    }
}

// === DODAJ STYL DLA KONVAJS-CONTENT ===
const konvaStyle = document.createElement('style');
konvaStyle.textContent = `
    .canvas-wrapper, .page-container { position: relative !important; }
    .konvajs-content { position: relative !important; }
`;
document.head.appendChild(konvaStyle);
// === STYL DLA NOWEGO MENU STRONY (PAGE TOOLBAR) ===
const pageToolbarStyle = document.createElement('style');
pageToolbarStyle.textContent = `
.page-toolbar {
    width: ${W}px;
    margin: 0 auto 8px;
    padding: 0 6px;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    overflow: visible;
    color: #5a6673;
    font-family: Arial;
}

.page-title {
    font-size: 18px;
    font-weight: 600;
    margin-left: 8px;
    flex: 1 1 auto;
    min-width: 0;
    text-align: left;
}

.page-tools {
    display: flex;
    gap: 8px;
    white-space: nowrap;
    flex: 0 0 auto;
}

.page-btn {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: 1px solid #ddd;
    background: #f3f3f3;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
}

.page-btn:hover {
    background: #e2e2e2;
}

.page-btn.grid.active {
    background: #111827;
    color: #fff;
    border-color: #111827;
}

.grid-overlay {
    opacity: 0;
    transition: opacity 0.15s ease;
    background-image:
      repeating-linear-gradient(
        to right,
        rgba(55, 65, 81, 0.18) 0,
        rgba(55, 65, 81, 0.18) 1px,
        transparent 1px,
        transparent 24px
      ),
      repeating-linear-gradient(
        to bottom,
        rgba(55, 65, 81, 0.18) 0,
        rgba(55, 65, 81, 0.18) 1px,
        transparent 1px,
        transparent 24px
      );
}

.canvas-wrapper.grid-enabled .grid-overlay {
    opacity: 1;
}
`;
document.head.appendChild(pageToolbarStyle);
const tooltipStyle = document.createElement("style");
tooltipStyle.textContent = `
.page-btn {
    position: relative;
}

.page-btn:hover::after {
    content: attr(data-tip);
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 1;
    z-index: 999999;
}

.page-btn::after {
    opacity: 0;
    transition: opacity 0.2s ease;
}
`;
document.head.appendChild(tooltipStyle);



// === RESZTA FUNKCJI ===
function splitTextIntoLines(text, maxWidth, fontSize, fontFamily) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    const testCanvas = document.createElement('canvas');
    const ctx = testCanvas.getContext('2d');
    ctx.font = `${fontSize}px ${fontFamily}`;

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = ctx.measureText(testLine).width;
        if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
            if (lines.length >= 4) break;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    if (lines.length === 0 && ctx.measureText(text).width > maxWidth) {
        let cut = '';
        for (const char of text) {
            if (ctx.measureText(cut + char).width > maxWidth) break;
            cut += char;
        }
        lines.push(cut + '...');
    }
    return lines.slice(0, 4);
}

function generateBarcode(ean, cb) {
    const key = ean.trim().replace(/\s+/g, '');
    if (window.barcodeCache && window.barcodeCache[key]) return cb(window.barcodeCache[key]);

    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    try {
        JsBarcode(c, key, {
            format: 'EAN13',
            width: 2.2,
            height: 50,
            displayValue: true,
            fontSize: 14,
            margin: 5,
            marginLeft: 10,
            marginRight: 10,
            marginTop: 10,
            marginBottom: 10,
            flat: false,
            background: 'transparent',
            lineColor: '#000'
        });

        const imageData = ctx.getImageData(0, 0, c.width, c.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
                data[i + 3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const url = c.toDataURL('image/png');

        if (!window.barcodeCache) window.barcodeCache = {};
        window.barcodeCache[key] = url;
        cb(url);
    } catch (e) {
        console.error('Błąd generowania kodu kreskowego:', e);
        cb(null);
    }
}
window.recolorBarcode = function(konvaImage, color, finalApply = false) {

    let originalSrc = konvaImage.getAttr("barcodeOriginalSrc");
    if (!originalSrc) {
        // Fallback dla kodów po wczytaniu projektu/starszych danych:
        // budujemy bazę z aktualnego obrazu, aby recolor działał zawsze.
        const currentImg = konvaImage.image && konvaImage.image();
        if (currentImg) {
            try {
                const w = currentImg.naturalWidth || currentImg.width || Math.max(1, Math.round(konvaImage.width() || 1));
                const h = currentImg.naturalHeight || currentImg.height || Math.max(1, Math.round(konvaImage.height() || 1));
                const baseCanvas = document.createElement("canvas");
                baseCanvas.width = w;
                baseCanvas.height = h;
                const baseCtx = baseCanvas.getContext("2d");
                baseCtx.drawImage(currentImg, 0, 0, w, h);
                originalSrc = baseCanvas.toDataURL("image/png");
                konvaImage.setAttr("barcodeOriginalSrc", originalSrc);
            } catch (err) {
                console.error("Brak oryginalnego src dla kodu i nie udało się zbudować fallback:", err);
                return;
            }
        } else {
            console.error("Brak oryginalnego src dla kodu!");
            return;
        }
    }

    const img = new Image();
    img.src = originalSrc;

    img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const rNew = parseInt(color.substring(1, 3), 16);
        const gNew = parseInt(color.substring(3, 5), 16);
        const bNew = parseInt(color.substring(5, 7), 16);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            if (r < 160 && g < 160 && b < 160) {
                data[i] = rNew;
                data[i+1] = gNew;
                data[i+2] = bNew;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const finalSrc = canvas.toDataURL("image/png");

        // 🔥 najważniejsze — tworzę NOWY obraz, NIE nadpisuję starego
        const recolored = new Image();
        recolored.onload = () => {
            konvaImage.image(recolored);   // bez nakładania bitmap
            // Zawsze zapamiętujemy aktualny kolor kodu, aby "Kopiuj styl"
            // działało także po zmianie koloru bez dodatkowego zatwierdzania.
            konvaImage.setAttr("barcodeColor", color);
            konvaImage.getLayer().batchDraw();
        };
        recolored.src = finalSrc;
    };
};

function openImageEffectsMenu(img) {
    ensureImageFX(img);
    const fx = getImageFxState(img);

    window.showSubmenu(`
        <div class="imgfx-panel">
            <div class="imgfx-section">
                <div class="imgfx-title">Podstawy</div>
                <div class="imgfx-row">
                    <label>Przezroczystość</label>
                    <input id="fxOpacity" type="range" min="0" max="100" value="${Math.round(fx.opacity * 100)}">
                    <span id="fxOpacityVal">${Math.round(fx.opacity * 100)}%</span>
                </div>
                <div class="imgfx-row">
                    <label>Cień</label>
                    <input id="fxShadowOn" type="checkbox" ${fx.shadowEnabled ? "checked" : ""}>
                    <input id="fxShadowColor" type="color" value="${normalizeHexColor(fx.shadowColor)}">
                </div>
                <div class="imgfx-row">
                    <label>Rozmycie cienia</label>
                    <input id="fxShadowBlur" type="range" min="0" max="60" value="${fx.shadowBlur}">
                </div>
                <div class="imgfx-row">
                    <label>Przesunięcie cienia</label>
                    <div class="imgfx-split">
                        <input id="fxShadowOffX" type="range" min="-40" max="40" value="${fx.shadowOffsetX}">
                        <input id="fxShadowOffY" type="range" min="-40" max="40" value="${fx.shadowOffsetY}">
                    </div>
                </div>
                <div class="imgfx-row">
                    <label>Intensywność cienia</label>
                    <input id="fxShadowOpacity" type="range" min="0" max="100" value="${Math.round(fx.shadowOpacity * 100)}">
                </div>
            </div>

            <div class="imgfx-section">
                <div class="imgfx-title">Korekta obrazu</div>
                <div class="imgfx-row">
                    <label>Jasność</label>
                    <input id="fxBrightness" type="range" min="-100" max="100" value="${fx.brightness}">
                </div>
                <div class="imgfx-row">
                    <label>Kontrast</label>
                    <input id="fxContrast" type="range" min="-100" max="100" value="${fx.contrast}">
                </div>
                <div class="imgfx-row">
                    <label>Nasycenie</label>
                    <input id="fxSaturation" type="range" min="-100" max="100" value="${fx.saturation}">
                </div>
                <div class="imgfx-row">
                    <label>Temperatura</label>
                    <input id="fxTemperature" type="range" min="-100" max="100" value="${fx.temperature}">
                </div>
            </div>

            <div class="imgfx-section">
                <div class="imgfx-title">Kolor / styl</div>
                <div class="imgfx-chips">
                    <button id="fxGrayscale" class="imgfx-chip ${fx.grayscale ? "is-active" : ""}">B&W</button>
                    <button id="fxSepia" class="imgfx-chip ${fx.sepia ? "is-active" : ""}">Sepia</button>
                </div>
            </div>

            <div class="imgfx-section">
                <div class="imgfx-title">Obrys / ramka</div>
                <div class="imgfx-row">
                    <label>Kolor obrysu</label>
                    <input id="fxStrokeColor" type="color" value="${normalizeHexColor(fx.strokeColor)}">
                </div>
                <div class="imgfx-row">
                    <label>Grubość obrysu</label>
                    <input id="fxStrokeWidth" type="range" min="0" max="20" value="${fx.strokeWidth}">
                </div>
            </div>

            <div class="imgfx-section">
                <div class="imgfx-title">Rozmycie tła (focus)</div>
                <div class="imgfx-row">
                    <label>Siła rozmycia</label>
                    <input id="fxBgBlur" type="range" min="0" max="40" value="${fx.bgBlur}">
                </div>
            </div>
            <div class="imgfx-section">
                <div class="imgfx-title">Reset</div>
                <div class="imgfx-row">
                    <label>Przywróć</label>
                    <button id="fxResetBtn" class="imgfx-chip">Domyślne</button>
                </div>
                <div class="imgfx-row">
                    <label>Na wszystkie</label>
                    <button id="fxApplyAllBtn" class="imgfx-chip">Zastosuj</button>
                </div>
            </div>
        </div>
    `, { width: "900px", className: "imgfx-submenu" });

    const onNum = (id, cb) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.oninput = (e) => cb(parseFloat(e.target.value));
    };
    const onColor = (id, cb) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.oninput = (e) => cb(e.target.value);
    };

    onNum("fxOpacity", (v) => {
        document.getElementById("fxOpacityVal").textContent = `${Math.round(v)}%`;
        img.setAttr("fxOpacity", v / 100);
        applyImageFX(img);
    });

    const shadowOn = document.getElementById("fxShadowOn");
    if (shadowOn) {
        shadowOn.onchange = (e) => {
            img.setAttr("fxShadowEnabled", e.target.checked);
            if (e.target.checked) {
                const blur = Number.isFinite(img.getAttr("fxShadowBlur")) ? img.getAttr("fxShadowBlur") : 0;
                if (blur <= 0) img.setAttr("fxShadowBlur", 22);
                const op = Number.isFinite(img.getAttr("fxShadowOpacity")) ? img.getAttr("fxShadowOpacity") : 0;
                if (op <= 0) img.setAttr("fxShadowOpacity", 0.5);
                const offX = Number.isFinite(img.getAttr("fxShadowOffsetX")) ? img.getAttr("fxShadowOffsetX") : 6;
                const offY = Number.isFinite(img.getAttr("fxShadowOffsetY")) ? img.getAttr("fxShadowOffsetY") : 8;
                img.setAttr("fxShadowOffsetX", offX);
                img.setAttr("fxShadowOffsetY", offY);
                img.setAttr("fxShadowColor", img.getAttr("fxShadowColor") || "#000000");
            }
            applyImageFX(img);
        };
    }
    onColor("fxShadowColor", (v) => {
        img.setAttr("fxShadowEnabled", true);
        if (shadowOn) shadowOn.checked = true;
        img.setAttr("fxShadowColor", v);
        applyImageFX(img);
    });
    onNum("fxShadowBlur", (v) => {
        img.setAttr("fxShadowEnabled", true);
        if (shadowOn) shadowOn.checked = true;
        img.setAttr("fxShadowBlur", v);
        applyImageFX(img);
    });
    onNum("fxShadowOffX", (v) => {
        img.setAttr("fxShadowEnabled", true);
        if (shadowOn) shadowOn.checked = true;
        img.setAttr("fxShadowOffsetX", v);
        applyImageFX(img);
    });
    onNum("fxShadowOffY", (v) => {
        img.setAttr("fxShadowEnabled", true);
        if (shadowOn) shadowOn.checked = true;
        img.setAttr("fxShadowOffsetY", v);
        applyImageFX(img);
    });
    onNum("fxShadowOpacity", (v) => {
        img.setAttr("fxShadowEnabled", true);
        if (shadowOn) shadowOn.checked = true;
        img.setAttr("fxShadowOpacity", v / 100);
        applyImageFX(img);
    });

    onNum("fxBrightness", (v) => { img.setAttr("fxBrightness", v); applyImageFX(img); });
    onNum("fxContrast", (v) => { img.setAttr("fxContrast", v); applyImageFX(img); });
    onNum("fxSaturation", (v) => { img.setAttr("fxSaturation", v); applyImageFX(img); });
    onNum("fxTemperature", (v) => { img.setAttr("fxTemperature", v); applyImageFX(img); });

    const bwBtn = document.getElementById("fxGrayscale");
    if (bwBtn) {
        bwBtn.onclick = () => {
            const next = !img.getAttr("fxGrayscale");
            img.setAttr("fxGrayscale", next);
            bwBtn.classList.toggle("is-active", next);
            applyImageFX(img);
        };
    }
    const sepiaBtn = document.getElementById("fxSepia");
    if (sepiaBtn) {
        sepiaBtn.onclick = () => {
            const next = !img.getAttr("fxSepia");
            img.setAttr("fxSepia", next);
            sepiaBtn.classList.toggle("is-active", next);
            applyImageFX(img);
        };
    }

    onColor("fxStrokeColor", (v) => { img.setAttr("fxStrokeColor", v); applyImageFX(img); });
    onNum("fxStrokeWidth", (v) => { img.setAttr("fxStrokeWidth", v); applyImageFX(img); });

    onNum("fxBgBlur", (v) => { img.setAttr("fxBgBlur", v); applyImageFX(img); });

    const resetBtn = document.getElementById("fxResetBtn");
    if (resetBtn) {
        resetBtn.onclick = () => {
            img.setAttrs({
                fxOpacity: 1,
                fxShadowEnabled: false,
                fxShadowColor: "#000000",
                fxShadowBlur: 0,
                fxShadowOffsetX: 0,
                fxShadowOffsetY: 0,
                fxShadowOpacity: 0.35,
                fxBrightness: 0,
                fxContrast: 0,
                fxSaturation: 0,
                fxTemperature: 0,
                fxGrayscale: false,
                fxSepia: false,
                fxStrokeColor: "#000000",
                fxStrokeWidth: 0,
                fxBgBlur: 0
            });
            // UI sync (twardo na żywo)
            const ids = [
                ["fxOpacity", 100],
                ["fxShadowOn", false],
                ["fxShadowColor", "#000000"],
                ["fxShadowBlur", 0],
                ["fxShadowOffX", 0],
                ["fxShadowOffY", 0],
                ["fxShadowOpacity", 35],
                ["fxBrightness", 0],
                ["fxContrast", 0],
                ["fxSaturation", 0],
                ["fxTemperature", 0],
                ["fxStrokeColor", "#000000"],
                ["fxStrokeWidth", 0],
                ["fxBgBlur", 0]
            ];
            ids.forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (el.type === "checkbox") el.checked = !!val;
                else el.value = String(val);
            });
            const bwBtn = document.getElementById("fxGrayscale");
            if (bwBtn) bwBtn.classList.remove("is-active");
            const sepiaBtn = document.getElementById("fxSepia");
            if (sepiaBtn) sepiaBtn.classList.remove("is-active");
            const opVal = document.getElementById("fxOpacityVal");
            if (opVal) opVal.textContent = "100%";
            applyImageFX(img);
        };
    }

    const applyAllBtn = document.getElementById("fxApplyAllBtn");
    if (applyAllBtn) {
        applyAllBtn.onclick = () => {
            const fx = getImageFxState(img);
            const isValidImage = (node) => {
                if (!(node instanceof Konva.Image)) return false;
                if (node.getAttr("isBgBlur")) return false;
                if (node.getAttr("isBarcode")) return false;
                if (node.getAttr("isTNZBadge")) return false;
                if (node.getAttr("isCountryBadge")) return false;
                if (node.getAttr("isOverlayElement")) return false;
                return true;
            };

            pages.forEach(p => {
                p.layer.find(n => isValidImage(n)).forEach(target => {
                    target.setAttrs({
                        fxOpacity: fx.opacity,
                        fxShadowEnabled: fx.shadowEnabled,
                        fxShadowColor: fx.shadowColor,
                        fxShadowBlur: fx.shadowBlur,
                        fxShadowOffsetX: fx.shadowOffsetX,
                        fxShadowOffsetY: fx.shadowOffsetY,
                        fxShadowOpacity: fx.shadowOpacity,
                        fxBrightness: fx.brightness,
                        fxContrast: fx.contrast,
                        fxSaturation: fx.saturation,
                        fxTemperature: fx.temperature,
                        fxGrayscale: fx.grayscale,
                        fxSepia: fx.sepia,
                        fxStrokeColor: fx.strokeColor,
                        fxStrokeWidth: fx.strokeWidth,
                        fxBgBlur: fx.bgBlur
                    });
                    applyImageFX(target);
                });
            });
        };
    }
}


// === SUBMENU POD FLOATING MENU ===
const submenu = document.createElement("div");
submenu.id = "floatingSubmenu";
submenu.style.cssText = `
    position: fixed;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    padding: 12px 18px;
    border-radius: 16px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.25);
    border: 1px solid #ccc;
    z-index: 99998;
    display: none;
    gap: 12px;
    align-items: center;
`;
document.body.appendChild(submenu);

window.showSubmenu = (html, opts = {}) => {
    const floating = document.getElementById("floatingMenu");
    const submenuWidth = opts.width || (floating ? floating.offsetWidth + "px" : "auto");

    submenu.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;width:${submenuWidth};justify-content:center;">
            ${html}
        </div>
    `;
    submenu.className = opts.className || "";
    submenu.style.maxWidth = opts.maxWidth || "92vw";
    submenu.style.display = "flex";
    // pozycjonowanie względem aktualnej strony/menupaska
    if (floating) {
        const fRect = floating.getBoundingClientRect();
        submenu.style.left = `${fRect.left + fRect.width / 2}px`;
        submenu.style.top = `${fRect.bottom + 8}px`;
        submenu.style.transform = 'translateX(-50%)';
    } else {
        const active = window.pages?.find(p => p.stage === document.activeStage);
        const wrap =
            active?.container?.querySelector('.page-zoom-wrap') ||
            active?.container?.querySelector('.canvas-wrapper');
        if (wrap) {
            const rect = wrap.getBoundingClientRect();
            submenu.style.left = `${rect.left + rect.width / 2}px`;
            submenu.style.top = `${Math.max(12, rect.top + 12)}px`;
            submenu.style.transform = 'translateX(-50%)';
        }
    }
};

window.hideSubmenu = () => {
    submenu.style.display = "none";
    submenu.className = "";
};

// zamknij submenu klikając poza nim
document.addEventListener("click", (e) => {
    if (e.target && e.target.type === "color") return;
    if (!e.target.closest("#floatingMenu") &&
        !e.target.closest("#floatingSubmenu")) {
        if (window._activeTextToolbarNode) {
            return;
        }
        if (typeof window._shapeToolsHasSelection === "function" && window._shapeToolsHasSelection()) {
            return;
        }
        window.hideSubmenu();
    }
});



window.importImagesFromFiles = async function(filesOverride) {
    const input = document.getElementById('imageInput');
    const files = filesOverride || input?.files;
    if (!files || files.length === 0) return alert('Wybierz zdjęcia!');
    if (!pages || pages.length === 0) {
        return alert('Najpierw zaimportuj Excel!');
    }

    const map = new Map();
    pages.forEach((page, pi) => {
        if (page.isCover) return;
        if (!page.products) return;
        page.products.forEach((p, si) => {
            if (!p.INDEKS) return;
            const key = p.INDEKS.toLowerCase().trim();
            if (!map.has(key)) map.set(key, []);
            map.get(key).push({ pageIndex: pi, slotIndex: si });
        });
    });

    const matched = [];
    Array.from(files).forEach(file => {
        const name = file.name.toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^0-9a-z]/g, '');
        for (const [indeks, positions] of map) {
            const clean = indeks.replace(/[^0-9a-z]/g, '');
            if (name.includes(clean) || clean.includes(name)) {
                matched.push({ file, positions, indeksKey: indeks });
                break;
            }
        }
    });

    if (matched.length === 0) return alert('Brak dopasowań');

    let styleRefreshRequested = false;
    const refreshCatalogStyleAfterImages = () => {
        if (styleRefreshRequested) return;
        styleRefreshRequested = true;
        setTimeout(() => {
            styleRefreshRequested = false;
            if (
                window.CATALOG_STYLE === "styl_elegancki" &&
                typeof window.applyCatalogStyleVisual === "function"
            ) {
                window.applyCatalogStyleVisual(window.CATALOG_STYLE);
            }
        }, 0);
    };

    let importedCount = 0;
    for (const { file, positions, indeksKey } of matched) {
        let variants = null;
        try {
            if (typeof window.createImageVariantsFromFile === "function") {
                variants = await window.createImageVariantsFromFile(file, {
                    cacheKey: `product:${indeksKey}:${file.name}:${file.size}:${file.lastModified}`
                });
            }
        } catch (_e) {}
        if (!variants) {
            try {
                const fallback = await (new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ""));
                    reader.onerror = () => reject(new Error("file_read_error"));
                    reader.readAsDataURL(file);
                }));
                variants = (typeof window.normalizeImageVariantPayload === "function")
                    ? window.normalizeImageVariantPayload(fallback)
                    : { original: fallback, editor: fallback, thumb: fallback };
            } catch (_e) {
                continue;
            }
        }

        const originalSrc = (typeof window.getImageVariantSource === "function")
            ? window.getImageVariantSource(variants, "original")
            : String(variants?.original || "");
        const editorSrc = (typeof window.getImageVariantSource === "function")
            ? window.getImageVariantSource(variants, "editor")
            : String(variants?.editor || originalSrc);
        const thumbSrc = (typeof window.getImageVariantSource === "function")
            ? window.getImageVariantSource(variants, "thumb")
            : String(variants?.thumb || editorSrc || originalSrc);
        if (!editorSrc) continue;

        if (indeksKey) {
            _setProductImageCacheEntry(indeksKey, {
                original: originalSrc || editorSrc,
                editor: editorSrc,
                thumb: thumbSrc || editorSrc
            });
        }

        await new Promise((resolveLoad) => {
            Konva.Image.fromURL(editorSrc, (img) => {
                positions.forEach(({ pageIndex, slotIndex }) => {
                    const page = pages[pageIndex];
                    if (!page || !page.layer) return;

                    if (page.slotObjects[slotIndex]) {
                        page.slotObjects[slotIndex].destroy();
                    }

                    let scale = Math.min(
                        (BW * 0.45 - 20) / img.width(),
                        (BH * 0.6) / img.height(),
                        1
                    );

                    let x = ML + (slotIndex % COLS) * (BW + GAP) + 20;
                    let y = MT + Math.floor(slotIndex / COLS) * (BH + GAP) + 100;

                    // 🔥 przesunięcie zdjęć tylko w layout8
                    if (window.LAYOUT_MODE === "layout8") {
                        y -= 80;   // podnieś zdjęcie wyżej
                        x += 5;    // opcjonalnie wyrównanie w poziomie

                        // ✅ stała ramka, równe pozycje i skala
                        const boxW = BW_dynamic * 0.48;
                        const boxH = BH_dynamic * 0.52;
                        scale = Math.min(boxW / img.width(), boxH / img.height(), 1);
                        x = x + 12 + (boxW - img.width() * scale) / 2;
                        y = y + (boxH - img.height() * scale) / 2;
                    }

                    const clone = img.clone();
                    clone.x(x);
                    clone.y(y);
                    clone.scaleX(scale);
                    clone.scaleY(scale);
                    clone.draggable(true);
                    clone.dragBoundFunc(pos => pos);

                    page.layer.add(clone);
                    clone.listening(true);

                    clone.setAttrs({
                        width: clone.width(),
                        height: clone.height(),
                        isProductImage: true,
                        slotIndex: slotIndex
                    });
                    if (typeof window.applyImageVariantsToKonvaNode === "function") {
                        window.applyImageVariantsToKonvaNode(clone, {
                            original: originalSrc || editorSrc,
                            editor: editorSrc,
                            thumb: thumbSrc || editorSrc
                        });
                    } else {
                        clone.setAttr("originalSrc", originalSrc || editorSrc);
                        clone.setAttr("editorSrc", editorSrc);
                        clone.setAttr("thumbSrc", thumbSrc || editorSrc);
                    }
                    // 🔥 CANVA STYLE SHADOW DLA PNG
                    setupProductImageDrag(clone, page.layer);
                    addImageShadow(page.layer, clone);
                    clone.moveToTop();

                    page.slotObjects[slotIndex] = clone;

                    page.layer.batchDraw();
                    page.transformerLayer.batchDraw();
                });
                importedCount += 1;
                refreshCatalogStyleAfterImages();
                resolveLoad();
            });
        });
    }

    if (!filesOverride && input) input.value = '';
    if (typeof window.quickStatusUpdate === "function") {
        window.quickStatusUpdate("images", matched.length > 0);
    }
    if (importedCount > 0) {
        const quickImagesBtn = document.getElementById('quickImagesBtn');
        if (quickImagesBtn) {
            quickImagesBtn.classList.remove('error');
            quickImagesBtn.classList.add('done');
        }
    }
    if (typeof window.showAppToast === "function") {
        window.showAppToast(`Zaimportowano ${importedCount}/${matched.length} zdjec`, importedCount > 0 ? "success" : "error");
    } else {
        alert(`Zaimportowano ${importedCount}/${matched.length} zdjec`);
    }
};

window.applyCachedProductImages = async function() {
    if (!window.productImageCache) return;
    if (!Array.isArray(pages) || pages.length === 0) return;
    if (!window.allProducts || !window.allProducts.length) return;

    const map = new Map();
    pages.forEach((page, pi) => {
        if (page.isCover) return;
        if (!page.products) return;
        page.products.forEach((p, si) => {
            if (!p.INDEKS) return;
            const key = p.INDEKS.toLowerCase().trim();
            if (!map.has(key)) map.set(key, []);
            map.get(key).push({ pageIndex: pi, slotIndex: si });
        });
    });

    let styleRefreshRequested = false;
    const refreshCatalogStyleAfterImages = () => {
        if (styleRefreshRequested) return;
        styleRefreshRequested = true;
        setTimeout(() => {
            styleRefreshRequested = false;
            if (
                window.CATALOG_STYLE === "styl_elegancki" &&
                typeof window.applyCatalogStyleVisual === "function"
            ) {
                window.applyCatalogStyleVisual(window.CATALOG_STYLE);
            }
        }, 0);
    };

    const keys = Object.keys(window.productImageCache);
    for (const indeksKey of keys) {
        const cachedValue = window.productImageCache[indeksKey];
        const positions = map.get(indeksKey);
        if (!cachedValue || !positions || positions.length === 0) continue;

        let variants = (typeof window.normalizeImageVariantPayload === "function")
            ? window.normalizeImageVariantPayload(cachedValue)
            : { original: String(cachedValue || ""), editor: String(cachedValue || ""), thumb: String(cachedValue || "") };

        if (typeof cachedValue === "string" && typeof window.createImageVariantsFromSource === "function") {
            try {
                variants = await window.createImageVariantsFromSource(cachedValue, {
                    cacheKey: `product-cache:${indeksKey}`
                });
                _setProductImageCacheEntry(indeksKey, variants);
            } catch (_e) {}
        }

        const originalSrc = (typeof window.getImageVariantSource === "function")
            ? window.getImageVariantSource(variants, "original")
            : String(variants?.original || "");
        const editorSrc = (typeof window.getImageVariantSource === "function")
            ? window.getImageVariantSource(variants, "editor")
            : String(variants?.editor || originalSrc);
        const thumbSrc = (typeof window.getImageVariantSource === "function")
            ? window.getImageVariantSource(variants, "thumb")
            : String(variants?.thumb || editorSrc || originalSrc);
        if (!editorSrc) continue;

        await new Promise((resolveLoad) => {
            Konva.Image.fromURL(editorSrc, (img) => {
                positions.forEach(({ pageIndex, slotIndex }) => {
                    const page = pages[pageIndex];
                    if (!page) return;

                    if (page.slotObjects[slotIndex]) {
                        page.slotObjects[slotIndex].destroy();
                    }

                    const scale = Math.min(
                        (BW * 0.45 - 20) / img.width(),
                        (BH * 0.6) / img.height(),
                        1
                    );

                    let x = ML + (slotIndex % COLS) * (BW + GAP) + 20;
                    let y = MT + Math.floor(slotIndex / COLS) * (BH + GAP) + 100;

                    if (window.LAYOUT_MODE === "layout8") {
                        y -= 80;
                        x += 5;
                    }

                    const clone = img.clone();
                    clone.x(x);
                    clone.y(y);
                    clone.scaleX(scale);
                    clone.scaleY(scale);
                    clone.draggable(true);
                    clone.dragBoundFunc(pos => pos);

                    page.layer.add(clone);
                    clone.listening(true);

                    clone.setAttrs({
                        width: clone.width(),
                        height: clone.height(),
                        isProductImage: true,
                        slotIndex: slotIndex
                    });
                    if (typeof window.applyImageVariantsToKonvaNode === "function") {
                        window.applyImageVariantsToKonvaNode(clone, {
                            original: originalSrc || editorSrc,
                            editor: editorSrc,
                            thumb: thumbSrc || editorSrc
                        });
                    } else {
                        clone.setAttr("originalSrc", originalSrc || editorSrc);
                        clone.setAttr("editorSrc", editorSrc);
                        clone.setAttr("thumbSrc", thumbSrc || editorSrc);
                    }

                    setupProductImageDrag(clone, page.layer);
                    addImageShadow(page.layer, clone);
                    clone.moveToTop();

                    page.slotObjects[slotIndex] = clone;
                    page.layer.batchDraw();
                    page.transformerLayer.batchDraw();
                });
                refreshCatalogStyleAfterImages();
                resolveLoad();
            });
        });
    }
};

// Auto-import po wybraniu plików (bez klikania przycisku)
const imageInputAuto = document.getElementById('imageInput');
if (imageInputAuto) {
    imageInputAuto.addEventListener('change', () => {
        window.importImagesFromFiles();
    });
}

window.generatePDF = async function(pageSelection) {
    if (!pages.length) return alert('Brak stron');
    let exportPages = pages;
    if (Array.isArray(pageSelection) && pageSelection.length > 0) {
        const byNumber = new Map(pages.map(p => [p.number, p]));
        exportPages = pageSelection
            .map(n => byNumber.get(Number(n)))
            .filter(Boolean);
        if (exportPages.length === 0) {
            alert('Zakres stron jest pusty.');
            return;
        }
    }

    try {
        await ensurePagesReadyForExport(exportPages);
    } catch (_e) {
        alert("Nie udało się przygotować stron do eksportu.");
        return;
    }

    const releaseForceDraw = (typeof window.beginForcePageDraw === "function")
        ? window.beginForcePageDraw()
        : null;
    if (typeof window.forceDrawAllPagesForExport === "function") {
        window.forceDrawAllPagesForExport();
    }
    try {

    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [W, H]
    });

    for (let i = 0; i < exportPages.length; i++) {
        const page = exportPages[i];
        const overlay = document.getElementById(`g${page.number}`);
        const restoreImages = (typeof window.swapPageImagesToOriginalForExport === "function")
            ? await window.swapPageImagesToOriginalForExport(page)
            : null;

        try {
            // 🔹 1. Ukryj transformer na tej stronie na czas eksportu
            if (page.transformer) {
                page.transformer.visible(false);
            }
            if (page.transformerLayer) {
                page.transformerLayer.hide();
                page.transformerLayer.batchDraw();
            }

            // 🔹 2. Ukryj siatkę (jeśli jest) na czas eksportu
            if (overlay) overlay.style.display = 'none';

            // 🔹 3. Render sceny do obrazka (JUŻ BEZ UCHWYTÓW)
            const data = page.stage.toDataURL({
                mimeType: "image/jpeg",
                quality: 1.0,
                pixelRatio: 3
            });

            // 🔹 4. Dodaj stronę do PDF
            if (i > 0) pdf.addPage();
            pdf.addImage(data, 'PNG', 0, 0, W, H);
        } finally {
            // 🔹 5. Przywróć siatkę + obrazy + transformer
            if (overlay) overlay.style.display = '';
            if (typeof restoreImages === "function") restoreImages();
            if (page.transformer) {
                page.transformer.visible(true);
            }
            if (page.transformerLayer) {
                page.transformerLayer.show();
                page.transformerLayer.batchDraw();
            }
        }
    }

    pdf.save('katalog.pdf');
    } finally {
        if (typeof window.releaseExportImageCache === "function") window.releaseExportImageCache();
        if (typeof releaseForceDraw === "function") releaseForceDraw();
    }
};


window.generatePDFBlob = async function() {
    if (!pages.length) throw new Error();
    await ensurePagesReadyForExport(pages);
    const releaseForceDraw = (typeof window.beginForcePageDraw === "function")
        ? window.beginForcePageDraw()
        : null;
    if (typeof window.forceDrawAllPagesForExport === "function") {
        window.forceDrawAllPagesForExport();
    }
    try {

    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [W, H]
    });


    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const overlay = document.getElementById(`g${page.number}`);
        let overlayParent = null;
        const restoreImages = (typeof window.swapPageImagesToOriginalForExport === "function")
            ? await window.swapPageImagesToOriginalForExport(page)
            : null;

        try {
            // --- USUNIĘCIE overlay PRZED renderem PDF ---
            if (overlay) {
                overlayParent = overlay.parentNode;
                overlay.remove();
            }

            // --- RENDER STRONY ---
            const data = page.stage.toDataURL({
                mimeType: "image/jpeg",
                quality: 0.82,
                pixelRatio: 1.35
            });

            if (i > 0) pdf.addPage();
            pdf.addImage(data, 'PNG', 0, 0, W, H);
        } finally {
            if (overlay && overlayParent) {
                overlayParent.appendChild(overlay);
            }
            if (typeof restoreImages === "function") restoreImages();
        }
    }

return pdf.output('blob');
    } finally {
        if (typeof window.releaseExportImageCache === "function") window.releaseExportImageCache();
        if (typeof releaseForceDraw === "function") releaseForceDraw();
    }

};

window.clearAll = function() {
    if (typeof window.releaseImageMemoryCaches === "function") {
        window.releaseImageMemoryCaches();
    }
    pages.forEach(p => {
        p.stage?.destroy();
        p.container?.remove();
    });
    pages = [];
    document.getElementById('pagesContainer').innerHTML = '';

    window.ExcelImporterReady = false;

    window.ExcelImporter = null;

    const pdfButton = document.getElementById('pdfButton');
    if (pdfButton) pdfButton.disabled = true;

    const slider = document.getElementById('zoomSlider');
    if (slider) slider.remove();
    const footer = document.getElementById('appFooterBar');
    if (footer) footer.remove();
    const sidebarEl = document.querySelector('.sidebar');
    if (sidebarEl) sidebarEl.classList.remove('has-footer');

    const menu = document.getElementById('floatingMenu');
    if (menu) menu.remove();
    const pageSettingsToggleBtn = document.getElementById('pageSettingsToggleBtn');
    if (pageSettingsToggleBtn) {
        pageSettingsToggleBtn.classList.remove('active');
        pageSettingsToggleBtn.setAttribute('aria-expanded', 'false');
    }

    if (typeof window.setProjectTitle === "function") {
        window.setProjectTitle("Katalog produktów");
    }
    if (typeof window.resetProjectHistory === "function") {
        window.resetProjectHistory(null);
    }
};

const floatingBtnStyle = document.createElement('style');
floatingBtnStyle.textContent = `
    #floatingMenu.floating-menu-page .page-fab-title {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: 0.1px;
        margin-right: 4px;
    }
    #floatingMenu.floating-menu-page.floating-menu-page--header {
        min-height: 64px;
        border-radius: 24px;
        padding: 12px 18px;
        gap: 16px;
        background: rgba(255,255,255,0.98);
        border-color: #dbe3ef;
        box-shadow: 0 14px 34px rgba(15,23,42,0.22);
    }
    #floatingMenu.floating-menu-page.floating-menu-page--header .page-fab-title {
        font-size: 14px;
    }
    #floatingMenu.floating-menu-page .page-fab-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        color: #334155;
    }
    #floatingMenu.floating-menu-page .page-fab-label {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.15px;
        color: #475569;
        text-transform: uppercase;
    }
    #floatingMenu.floating-menu-page .page-fab-color {
        width: 38px;
        height: 30px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: #fff;
        cursor: pointer;
        padding: 2px;
    }
    #floatingMenu.floating-menu-page .page-fab-range {
        width: 124px;
        accent-color: #0ea5e9;
        cursor: pointer;
    }
    #floatingMenu.floating-menu-page .page-fab-value {
        min-width: 44px;
        text-align: right;
        font-weight: 700;
        color: #0f172a;
        font-size: 12px;
    }
    #floatingMenu.floating-menu-page .page-fab-reset {
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid #d1d5db;
        border-radius: 999px;
        cursor: pointer;
        color: #0f172a;
        background: #ffffff;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    }
    #floatingMenu.floating-menu-page .page-fab-reset:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(15,23,42,0.12);
        border-color: #94a3b8;
        background: #f8fafc;
    }
    .fab-btn {
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 600;
        border: 1px solid #e6eaf2;
        border-radius: 999px;
        cursor: pointer;
        color: #0f172a;
        background: #ffffff;
        min-width: 84px;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        letter-spacing: 0.1px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 1px 0 rgba(15,23,42,0.04);
    }
    .fab-btn i { font-size: 13px; opacity: 0.85; }
    .fab-copy { border-color:#e6eaf2; color:#1f2937; }
    .fab-stylecopy { border-color:#e6eaf2; color:#1f2937; }
    .fab-cut { border-color:#e6eaf2; color:#1f2937; }
    .fab-delete { border-color:#fde2e2; color:#b91c1c; }
    .fab-align { border-color:#e6eaf2; color:#1f2937; }
    .fab-front { border-color:#e6eaf2; color:#1f2937; }
    .fab-back { border-color:#e6eaf2; color:#1f2937; }
    .fab-forward { border-color:#e6eaf2; color:#1f2937; }
    .fab-backward { border-color:#e6eaf2; color:#1f2937; }
    .fab-removebg { border-color:#e6eaf2; color:#1f2937; }
    .fab-effects { border-color:#e6eaf2; color:#1f2937; }
    .fab-barcolor { border-color:#e6eaf2; color:#1f2937; }
    .fab-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(15,23,42,0.12);
        border-color:#cbd5e1;
        background:#f8fafc;
    }
    #groupQuickMenu .group-quick-btn {
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #111827;
        border-radius: 999px;
        padding: 7px 14px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        letter-spacing: 0.2px;
    }
    #groupQuickMenu .group-quick-btn:hover {
        background: #f8fafc;
        border-color: #9ca3af;
    }
    .align-submenu-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: center;
    }
    .align-submenu-btn {
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #0f172a;
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        letter-spacing: 0.1px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 102px;
        justify-content: center;
    }
    .align-submenu-btn i {
        font-size: 11px;
        opacity: 0.85;
    }
    .align-submenu-btn:hover {
        background: #f8fafc;
        border-color: #94a3b8;
    }
    .align-submenu-btn--center {
        border-color: #93c5fd;
        background: #eff6ff;
        color: #1d4ed8;
    }
`;
document.head.appendChild(floatingBtnStyle);
const imgFxStyle = document.createElement('style');
imgFxStyle.textContent = `
    .imgfx-submenu {
        padding: 10px 12px;
    }
    .imgfx-panel {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        min-width: 860px;
        max-width: 940px;
        max-height: 32vh;
        overflow: auto;
        font-family: Arial, sans-serif;
    }
    .imgfx-section {
        padding: 8px 10px;
        border: 1px solid #eef2f7;
        border-radius: 12px;
        background: #f8fafc;
    }
    .imgfx-title {
        font-size: 12px;
        font-weight: 700;
        color: #64748b;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
    }
    .imgfx-row {
        display: grid;
        grid-template-columns: 120px 1fr auto;
        align-items: center;
        gap: 10px;
        padding: 4px 0;
        font-size: 12px;
        color: #334155;
    }
    .imgfx-row input[type="range"] {
        width: 100%;
        accent-color: #2563eb;
    }
    .imgfx-row input[type="color"] {
        width: 32px;
        height: 24px;
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
    }
    .imgfx-split {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        width: 100%;
    }
    .imgfx-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
    .imgfx-chip {
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid #e5e7eb;
        background: #ffffff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        color: #111827;
    }
    .imgfx-chip.is-active {
        border-color: #2563eb;
        background: #eaf2ff;
        color: #1d4ed8;
    }
`;
document.head.appendChild(imgFxStyle);
// =====================================================
// PDF CANVA – OBIEKTOWY (EDYTOWALNY)
// =====================================================
window.generateCanvaPDF = async function (pageNumbers) {

    if (!pages.length) {
        alert("Brak stron");
        return;
    }
    try {
        await ensurePagesReadyForExport(pages);
    } catch (_e) {
        alert("Nie udało się przygotować stron do eksportu.");
        return;
    }
    const releaseForceDraw = (typeof window.beginForcePageDraw === "function")
        ? window.beginForcePageDraw()
        : null;
    if (typeof window.forceDrawAllPagesForExport === "function") {
        window.forceDrawAllPagesForExport();
    }
    try {

    const pdf = new jsPDF({
        orientation: "p",
        unit: "px",
        format: [W, H]
    });

    for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi];

        if (pi > 0) pdf.addPage();

        // === TŁO STRONY ===
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, W, H, "F");

        // === ITERACJA PO OBIEKTACH KONVA ===
        page.layer.getChildren().forEach(node => {

            // =====================
            // BOX
            // =====================
           // wyraźny box jak w Canvie
pdf.setDrawColor(180);          // ciemniejsza ramka
pdf.setLineWidth(2);            // grubsza linia
pdf.setFillColor(250, 250, 250); // lekko szare tło

pdf.roundedRect(
  x,
  y,
  w,
  h,
  14,
  14,
  "FD"
);


            // =====================
            // TEKST (NAZWA, INDEKS)
            // =====================
            if (node instanceof Konva.Text && node.getAttr("isProductText")) {

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(node.fontSize());
                pdf.setTextColor(0);

                pdf.text(
                    node.text(),
                    node.x(),
                    node.y() + node.fontSize()
                );
            }

            // === CENA – GROUP (KONIECZNIE TU!) ===
if (node instanceof Konva.Group && node.getAttr("isPriceGroup")) {

  node.getChildren().forEach(t => {
    if (!(t instanceof Konva.Text)) return;

    pdf.setFont(
      "helvetica",
      t.fontStyle() === "bold" ? "bold" : "normal"
    );
    pdf.setFontSize(t.fontSize());
    pdf.setTextColor(0);

    pdf.text(
      t.text(),
      node.x() + t.x(),
      node.y() + t.y() + t.fontSize()
    );
  });
}


            // =====================
            // OBRAZY (produkt, flagi, TNZ)
            // =====================
            if (node instanceof Konva.Image) {
                const img = node.image();
                if (!img) return;

                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);

                    const dataURL = canvas.toDataURL("image/png");

                    pdf.addImage(
                        dataURL,
                        "PNG",
                        node.x(),
                        node.y(),
                        node.width() * node.scaleX(),
                        node.height() * node.scaleY()
                    );
                } catch (e) {
                    console.warn("Nie udało się dodać obrazu", e);
                }
            }
        });
    }

    pdf.save("katalog_canva_editable.pdf");
    } finally {
        if (typeof window.releaseExportImageCache === "function") window.releaseExportImageCache();
        if (typeof releaseForceDraw === "function") releaseForceDraw();
    }
};


window.ExcelImporterReady = false;
if (!window.__pageToolbarSettingsDelegated) {
    window.__pageToolbarSettingsDelegated = true;
    document.addEventListener('click', async (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('.page-toolbar .settings') : null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const pageContainer = btn.closest('.page-container');
        const list = Array.isArray(window.pages) ? window.pages : (Array.isArray(pages) ? pages : []);
        const page = list.find(p => p && p.container === pageContainer) || list[0] || null;
        if (!page || page.isCover) return;

        if (page.stage) {
            document.activeStage = page.stage;
        }

        if (
            window._activePageFloatingOwner &&
            typeof window._activePageFloatingOwner.hidePageFloatingMenu === "function"
        ) {
            window._activePageFloatingOwner.hidePageFloatingMenu();
        }

        if (typeof window.ensurePageHydrated === "function") {
            try { await window.ensurePageHydrated(page, { reason: "settings" }); } catch (_e) {}
        }

        if (typeof window.openPageEdit === "function") {
            window.openPageEdit(page);
            return;
        }

        console.error("Brak funkcji openPageEdit!");
    }, true);
}
// === GLOBALNE ODZNACZANIE POZA KONTENEREM ROBOCZYM ===
document.addEventListener('click', (e) => {
  const targetEl =
    (e.target && e.target.nodeType === 1 && e.target) ||
    (e.target && e.target.parentElement) ||
    null;
  if (!targetEl) return;
  if (targetEl.type === "color") return;

  const clickedInsideCanvas =
    targetEl.closest('.canvas-wrapper') ||
    targetEl.closest('.page-zoom-wrap') ||
    targetEl.closest('[id^="k"]');
  const clickedInsideMenus =
    targetEl.closest('#floatingMenu') ||
    targetEl.closest('#floatingSubmenu') ||
    targetEl.closest('#groupQuickMenu') ||
    targetEl.closest('#shapePanel');

  if (!clickedInsideCanvas && !clickedInsideMenus) {
		    const hasAnyFloatingUi =
		      !!document.getElementById('groupQuickMenu') ||
		      !!document.getElementById('floatingMenu') ||
		      !!document.getElementById('floatingSubmenu');
		    pages.forEach(page => {
	          const hadSelection = Array.isArray(page.selectedNodes) && page.selectedNodes.length > 0;
	          let hadTransformer = false;
	          try {
	              hadTransformer = !!(page.transformer && page.transformer.nodes && page.transformer.nodes().length);
	          } catch (_e) {}
	          const outlines = page.layer.find('.selectionOutline');
	          const hadOutlines = !!(outlines && typeof outlines.length === "number" && outlines.length > 0);
	          const hadCropMode = !!page._cropMode;
	          if (hasAnyFloatingUi && typeof page.hideFloatingButtons === "function") {
	              page.hideFloatingButtons();
	          }
	          if (!hadSelection && !hadTransformer && !hadOutlines && !hadCropMode) return;

		      page.selectedNodes = [];
		      page.transformer.nodes([]);
		      outlines.forEach(n => n.destroy());
		      disableCropMode(page);
		      page.layer.batchDraw();
		      page.transformerLayer.batchDraw();
		    });

    const menu = document.getElementById('floatingMenu');
    if (menu) {
        if (
            window._activePageFloatingOwner &&
            typeof window._activePageFloatingOwner.hidePageFloatingMenu === "function"
        ) {
            window._activePageFloatingOwner.hidePageFloatingMenu();
        } else {
            menu.remove();
            const pageSettingsToggleBtn = document.getElementById('pageSettingsToggleBtn');
            if (pageSettingsToggleBtn) {
                pageSettingsToggleBtn.classList.remove('active');
                pageSettingsToggleBtn.setAttribute('aria-expanded', 'false');
            }
        }
    }
    window.hideTextToolbar?.();
    window.hideTextPanel?.();
  }
});

// === GLOBALNE UNDO/REDO Z GUI + SKRÓTY KLAWISZOWE ===
document.addEventListener('keydown', (e) => {
    if (window.isEditingText) return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
    const key = e.key.toLowerCase();
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    if (isCmdOrCtrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (typeof window.undoProject === "function") window.undoProject();
    }
    if (
        (isCmdOrCtrl && key === 'y') ||
        (isCmdOrCtrl && key === 'z' && e.shiftKey)
    ) {
        e.preventDefault();
        if (typeof window.redoProject === "function") window.redoProject();
    }
});

document.getElementById('undoBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.projectHistory && Array.isArray(window.projectHistory.undo) && window.projectHistory.undo.length === 0) return;
    if (typeof window.undoProject === "function") window.undoProject();
});

document.getElementById('redoBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.projectHistory && Array.isArray(window.projectHistory.redo) && window.projectHistory.redo.length === 0) return;
    if (typeof window.redoProject === "function") window.redoProject();
});

// === PRZESUWANIE ZAZNACZEŃ STRZAŁKAMI (CANVA STYLE) ===
document.addEventListener('keydown', (e) => {
    if (window.isEditingText) return;
    if (window.globalPasteMode) return;

    const tag = (document.activeElement && document.activeElement.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(e.key)) return;

    const page = pages.find(p => p.stage === document.activeStage) || pages[0];
    if (!page || !page.selectedNodes || page.selectedNodes.length === 0) return;

    e.preventDefault();

    const step = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -step;
    if (e.key === 'ArrowRight') dx = step;
    if (e.key === 'ArrowUp') dy = -step;
    if (e.key === 'ArrowDown') dy = step;

    page.selectedNodes.forEach(node => {
        node.x(node.x() + dx);
        node.y(node.y() + dy);
    });

    page.layer.batchDraw();
    page.transformerLayer.batchDraw();
    window.dispatchEvent(new CustomEvent('canvasModified', { detail: page.stage }));
});

// Gdy modyfikujemy cokolwiek na stronie → oznacz ją jako aktywną
window.addEventListener('canvasModified', (e) => {
    document.activeStage = e.detail;
    window.projectDirty = true;
});

// ===============================================
// SKRÓTY KLAWISZOWE (CTRL+C / CTRL+V / CTRL+X / DEL)
// ===============================================
function getActivePage() {
    const stage = document.activeStage;
    if (!stage) return pages[0] || null;
    return pages.find(p => p.stage === stage) || pages[0] || null;
}

window.toggleActivePageSettingsMenu = function(anchorEl) {
    void anchorEl;
    const page = getActivePage();
    if (!page || page.isCover) return;
    if (
        window._activePageFloatingOwner &&
        typeof window._activePageFloatingOwner.hidePageFloatingMenu === "function"
    ) {
        window._activePageFloatingOwner.hidePageFloatingMenu();
    }
    if (typeof window.openPageEdit === "function") {
        window.openPageEdit(page);
        return;
    }
    console.error("Brak funkcji openPageEdit!");
};

function pasteClipboardToPage(page, pointer) {
    const detachCloneFromCatalogSlot = (node) => {
        if (!node || !node.setAttr) return;
        node.setAttr("slotIndex", null);
        if (node.getAttr && node.getAttr("isAutoSlotGroup")) {
            node.setAttr("isAutoSlotGroup", false);
        }
        if (node.getChildren) node.getChildren().forEach(detachCloneFromCatalogSlot);
    };

    const clip = window.globalClipboard;
    if (!Array.isArray(clip) || clip.length === 0) return;
    const ensurePastedNodeAbovePageBg = (layer, node) => {
        if (!layer || !node) return;
        try {
            const bg = layer.findOne(n => n.getAttr && n.getAttr("isPageBg") === true);
            if (bg && typeof bg.getZIndex === "function" && typeof node.setZIndex === "function") {
                const minZ = (bg.getZIndex() || 0) + 1;
                const currZ = typeof node.getZIndex === "function" ? node.getZIndex() : minZ;
                if (currZ < minZ) node.setZIndex(minZ);
            }
            if (typeof node.moveToTop === "function") node.moveToTop();
        } catch (_e) {}
    };

    const baseX = clip[0].x();
    const baseY = clip[0].y();
    const newNodes = [];
    const pastedDirectIdMap = {};

    clip.forEach(src => {
        const clone = src.clone({
            draggable: true,
            listening: true
        });
        detachCloneFromCatalogSlot(clone);
        remapDirectModuleIdsForPastedClone(clone, pastedDirectIdMap);
        cleanupPastedCloneRuntimeAttrs(clone);
        clone.x(pointer.x + (src.x() - baseX));
        clone.y(pointer.y + (src.y() - baseY));
        clone.setAttrs({
            isProductText: src.getAttr("isProductText") || false,
            isName: src.getAttr("isName") || false,
            isIndex: src.getAttr("isIndex") || false,
            isPrice: src.getAttr("isPrice") || false,
            isBox: src.getAttr("isBox") || false,
            isBarcode: src.getAttr("isBarcode") || false,
            isProductImage: src.getAttr("isProductImage") || false,
            slotIndex: null
        });
        page.layer.add(clone);
        ensurePastedNodeAbovePageBg(page.layer, clone);
        rebindEditableTextForClone(clone, page);
        newNodes.push(clone);
    });

    page.layer.batchDraw();
    page.transformerLayer.batchDraw();
    page.selectedNodes = newNodes;
    page.transformer.nodes(newNodes);
    try {
        page.transformer.forceUpdate && page.transformer.forceUpdate();
        page.transformerLayer && page.transformerLayer.batchDraw && page.transformerLayer.batchDraw();
    } catch (_e) {}
    try {
        window.dispatchEvent(new CustomEvent('canvasModified', { detail: page.stage }));
    } catch (_e) {}
}

function getClipboardPastePointer(page, mode = "keyboard") {
    if (!page || !page.stage) return { x: 100, y: 100 };
    const stage = page.stage;
    const clip = window.globalClipboard;
    const first = Array.isArray(clip) && clip[0] ? clip[0] : null;

    if (mode === "click") {
        const p = stage.getPointerPosition();
        if (p) return p;
    }

    // Klawiatura: wklejaj przewidywalnie obok kopiowanego obiektu, a nie wg starej pozycji myszy.
    const baseX = first && typeof first.x === "function" ? first.x() : Math.round(stage.width() * 0.35);
    const baseY = first && typeof first.y === "function" ? first.y() : Math.round(stage.height() * 0.35);
    const pasteCount = Math.max(0, Number(window.globalClipboardPasteCount || 0));
    const step = 26;
    return {
        x: baseX + step * (pasteCount + 1),
        y: baseY + step * (pasteCount + 1)
    };
}

document.addEventListener('keydown', (e) => {
    if (window.isEditingText) return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;

    const page = getActivePage();
    if (!page) return;

    const key = e.key.toLowerCase();
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl && key === 'a') {
        e.preventDefault();

        const nodes = page.layer.find((n) => {
            if (!n || !n.getAttr) return false;
            if (typeof n.isDestroyed === "function" && n.isDestroyed()) return false;
            if (typeof n.visible === "function" && !n.visible()) return false;
            if (typeof n.listening === "function" && !n.listening()) return false;
            if (n.getAttr("isPageBg")) return false;
            if (n.getAttr("isBgBlur")) return false;
            if (n.getAttr("isFxHelper")) return false;
            if (n.getAttr("selectable") === false) return false;
            if (n.name && (n.name() === "selectionOutline" || n.name() === "selectionRect")) return false;
            return (
                n instanceof Konva.Text ||
                n instanceof Konva.Image ||
                n instanceof Konva.Group ||
                n instanceof Konva.Rect
            );
        });

        const normalized = normalizeSelection(nodes);
        page.selectedNodes = normalized;

        page.layer.find('.selectionOutline').forEach(n => n.destroy());
        if (normalized.length === 0) {
            page.transformer.nodes([]);
            page.hideFloatingButtons?.();
            page.layer.batchDraw();
            page.transformerLayer.batchDraw();
            return;
        }

        if (typeof disableCropMode === "function") disableCropMode(page);
        page.transformer.nodes(normalized);

        normalized.forEach((node) => {
            if (!node || !node.getClientRect) return;
            let box;
            try {
                box = node.getClientRect({ relativeTo: page.layer });
            } catch (_e) {
                return;
            }
            const outline = new Konva.Rect({
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                stroke: '#00baff',
                strokeWidth: 1.5,
                dash: [4, 4],
                listening: false,
                name: 'selectionOutline'
            });
            page.layer.add(outline);
            outline.moveToTop();
        });

        page.layer.batchDraw();
        page.transformerLayer.batchDraw();
        page.showFloatingButtons?.();
        return;
    }

    if (isCtrl && key === 'c') {
        e.preventDefault();
        const nodes = normalizeSelection(page.selectedNodes);
        if (!nodes.length) return;
        window.globalClipboard = nodes.map(n => {
            const clone = n.clone({ draggable: true, listening: true });
            clone.getChildren?.().forEach(c => c.listening(true));
            return clone;
        });
        window.globalClipboardPasteCount = 0;
        window.globalPasteMode = false;
        return;
    }

    if (isCtrl && key === 'x') {
        e.preventDefault();
        const nodes = normalizeSelection(page.selectedNodes);
        if (!nodes.length) return;
        window.globalClipboard = nodes.map(n => {
            const clone = n.clone({ draggable: true, listening: true });
            clone.getChildren?.().forEach(c => c.listening(true));
            return clone;
        });
        window.globalClipboardPasteCount = 0;
        nodes.forEach(n => n.destroy());
        page.selectedNodes = [];
        page.transformer.nodes([]);
        page.layer.batchDraw();
        page.transformerLayer.batchDraw();
        window.globalPasteMode = false;
        return;
    }

    if (isCtrl && key === 'v') {
        e.preventDefault();
        if (!window.globalClipboard || window.globalClipboard.length === 0) return;
        const pointer = getClipboardPastePointer(page, "keyboard");
        pasteClipboardToPage(page, pointer);
        window.globalClipboardPasteCount = Math.max(0, Number(window.globalClipboardPasteCount || 0)) + 1;
        return;
    }

    if (isCtrl && key === 'g' && !e.shiftKey) {
        e.preventDefault();
        page.groupSelectedNodes?.();
        return;
    }

    if (isCtrl && key === 'g' && e.shiftKey) {
        e.preventDefault();
        page.ungroupSelectedNodes?.();
        return;
    }

    if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        const nodes = normalizeSelection(page.selectedNodes);
        if (!nodes.length) return;
        nodes.forEach(n => {
            clearCatalogSlotStateForNode(page, n);
            n.destroy();
        });
        page.selectedNodes = [];
        page.transformer.nodes([]);
        page.layer.batchDraw();
        page.transformerLayer.batchDraw();
        window.projectDirty = true;
    }
});
window.movePage = function(page, direction) {
    const index = pages.indexOf(page);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= pages.length) return;

    // Zamiana w tablicy
    const tmp = pages[newIndex];
    pages[newIndex] = page;
    pages[index] = tmp;

    // Zamiana w DOM
    const container = document.getElementById('pagesContainer');
    if (direction < 0) {
        container.insertBefore(page.container, tmp.container);
    } else {
        container.insertBefore(tmp.container, page.container);
    }

    // ⭐ Aktualizacja numerów NA NOWYM TOOLBARZE
    pages.forEach((p, i) => {
        p.number = i + 1;

        const title = p.container.querySelector('.page-title');
        if (title) title.textContent = `Page ${i + 1}`;
    });
    if (typeof window.refreshPagesPerf === "function") {
        window.refreshPagesPerf();
    }

    console.log(`Strona przesunięta na pozycję ${newIndex + 1}`);
};

function applyCursorEvents(page) {
    if (!page || !page.stage || typeof page.stage.find !== "function") return;
    const nodes = page.stage.find('Rect, Text, Image');
    nodes.forEach(node => {
        if (!node.draggable()) return;

        node.on('mouseover', () => {
            page.stage.container().style.cursor = 'grab';
        });

        node.on('mouseout', () => {
            page.stage.container().style.cursor = 'default';
        });
    });
}


// Automatycznie przy tworzeniu każdej strony:
window.addEventListener('canvasCreated', (e) => {
    const page = pages.find(p => p.stage === e.detail);
    setTimeout(() => applyCursorEvents(page), 200);
});
function enableEditableText(node, page) {
    const layer = page.layer;
    const tr = page.transformer;
    compactSidebarTextNode(node);
    const isSingleSelectedTextTransform = () => {
        try {
            const nodes = (tr && typeof tr.nodes === "function") ? (tr.nodes() || []) : [];
            return nodes.length === 1 && nodes[0] === node;
        } catch (_e) {
            return false;
        }
    };

    // Zapamiętaj oryginalne wartości
    node.originalFontSize = node.fontSize();
    node.originalWidth = node.width();
    node.originalHeight = node.height();

    // Etykieta rotacji
    const rotationUI = createRotationLabel(layer);

    // Pokazuj kąt przy rotacji
    node.on("transform", () => {
        if (!isSingleSelectedTextTransform()) return;
        const angle = Math.round(node.rotation());
        rotationUI.text.text(angle + "°");
        const abs = node.absolutePosition();
        rotationUI.label.position({
            x: abs.x + node.width() / 2,
            y: abs.y - 40
        });
        rotationUI.label.visible(true);
        rotationUI.label.opacity(1);
        layer.batchDraw();
    });

    node.on("transformend", () => {
        const label = rotationUI?.label;
        if (!label || (label.isDestroyed && label.isDestroyed()) || !label.getLayer || !label.getLayer()) {
            return;
        }

        label.to({
            opacity: 0,
            duration: 0.25,
            onFinish: () => {
                if (!label.isDestroyed || !label.isDestroyed()) {
                    label.visible(false);
                }
            }
        });
    });

    // GŁÓWNA LOGIKA SKALOWANIA – IDENTYCZNA Z DEMO
    node.on("transform", () => {
        // Ten "Canva-like" przelicznik tekstu działa dobrze dla pojedynczego tekstu.
        // Przy multi-select powoduje rozjazdy (tekst dostaje jednocześnie skalę grupową
        // i ręczne przeliczanie width/fontSize), więc tam go pomijamy.
        if (!isSingleSelectedTextTransform()) return;
        const oldPos = node.absolutePosition();

        let newW = node.width() * node.scaleX();
        let newH = node.height() * node.scaleY();

        node.setAttrs({
            width: newW,
            height: newH,
            scaleX: 1,
            scaleY: 1
        });

        // 1. Najpierw próbuj POWIĘKSZYĆ
        let enlarged = false;
        while (true) {
            const prev = node.fontSize();
            node.fontSize(prev + 1);

            const h = node.textArr.length * node.textHeight;
            if (h > newH) {
                node.fontSize(prev);
                break;
            }
            if (hasBrokenWords(getTokensInString(node.text()), node.textArr)) {
                node.fontSize(prev);
                break;
            }
            enlarged = true;
        }

        // 2. Jeśli nie powiększyło – shrink
        if (!enlarged) {
            shrinkText(node, 8);
        }
        if (node.getAttr && node.getAttr("isSidebarText")) {
            compactSidebarTextNode(node);
        }

        node.absolutePosition(oldPos);
        layer.batchDraw();
    });

    // Kliknij ponownie zaznaczony tekst → edycja w miejscu (Canva‑style)
    const startInlineEdit = () => {
        if (window.isEditingText) return;
        window.hideTextToolbar?.();
        window.hideTextPanel?.();
        window.isEditingText = true;
        tr.hide();
        node.hide();
        layer.draw();

        const pos = node.absolutePosition();
        const rect = page.stage.container().getBoundingClientRect();
        const absX = rect.left + pos.x + window.scrollX;
        const absY = rect.top + pos.y + window.scrollY;

        const textarea = document.createElement("textarea");
        document.body.appendChild(textarea);

        const parseColorToRgb = (raw) => {
            const txt = String(raw || "").trim();
            if (!txt) return { r: 0, g: 0, b: 0 };

            const hex = txt.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
            if (hex) {
                let h = hex[1];
                if (h.length === 3) h = h.split("").map(ch => ch + ch).join("");
                return {
                    r: parseInt(h.slice(0, 2), 16),
                    g: parseInt(h.slice(2, 4), 16),
                    b: parseInt(h.slice(4, 6), 16)
                };
            }

            const rgb = txt.match(/^rgba?\(([^)]+)\)$/i);
            if (rgb) {
                const parts = rgb[1].split(",").map(v => Number(v.trim()));
                return {
                    r: Number.isFinite(parts[0]) ? parts[0] : 0,
                    g: Number.isFinite(parts[1]) ? parts[1] : 0,
                    b: Number.isFinite(parts[2]) ? parts[2] : 0
                };
            }

            // Named color fallback (np. "white")
            const probe = document.createElement("span");
            probe.style.color = txt;
            document.body.appendChild(probe);
            const computed = getComputedStyle(probe).color;
            probe.remove();
            const namedRgb = computed.match(/^rgba?\(([^)]+)\)$/i);
            if (!namedRgb) return { r: 0, g: 0, b: 0 };
            const vals = namedRgb[1].split(",").map(v => Number(v.trim()));
            return {
                r: Number.isFinite(vals[0]) ? vals[0] : 0,
                g: Number.isFinite(vals[1]) ? vals[1] : 0,
                b: Number.isFinite(vals[2]) ? vals[2] : 0
            };
        };

        const colorRgb = parseColorToRgb(node.fill());
        const luma = (0.2126 * colorRgb.r + 0.7152 * colorRgb.g + 0.0722 * colorRgb.b) / 255;
        const isVeryLight = luma >= 0.74;

        textarea.value = node.text();
        Object.assign(textarea.style, {
            position: "absolute",
            left: absX + "px",
            top: absY + "px",
            width: node.width() + "px",
            minHeight: node.height() + "px",
            fontSize: node.fontSize() + "px",
            fontFamily: node.fontFamily(),
            lineHeight: node.lineHeight(),
            textAlign: node.align(),
            color: node.fill(),
            padding: "2px",
            border: "2px solid #0066ff",
            borderRadius: "6px",
            background: "rgba(15, 23, 42, 0.05)",
            textShadow: isVeryLight
                ? "0 0 1px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.85)"
                : "0 0 1px rgba(255,255,255,0.7)",
            caretColor: isVeryLight ? "#0f172a" : "#f8fafc",
            resize: "none",
            zIndex: 99999,
            outline: "none",
            overflow: "hidden"
        });

        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        textarea.style.height = textarea.scrollHeight + "px";

        const finish = () => {
            node.text(textarea.value || "-");
            if (node.getAttr && node.getAttr("isSidebarText")) compactSidebarTextNode(node);
            else shrinkText(node, 8);
            node.show();
            tr.show();
            tr.forceUpdate();
            layer.draw();
            textarea.remove();
            window.isEditingText = false;
            window.removeEventListener("click", close);
        };

        const close = (e) => {
            if (e.target !== textarea) finish();
        };

        textarea.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                finish();
            }
            if (e.key === "Escape") finish();
        });

        textarea.addEventListener("input", () => {
            node.text(textarea.value);
            if (node.getAttr && node.getAttr("isSidebarText")) {
                compactSidebarTextNode(node);
                textarea.style.width = node.width() + "px";
                textarea.style.fontSize = node.fontSize() + "px";
            } else {
                const newSize = shrinkText(node, 8);
                textarea.style.fontSize = newSize + "px";
            }
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";
        });

        setTimeout(() => window.addEventListener("click", close), 0);
    };

    // 🟢 Jedno kliknięcie → pokaż floating toolbar tekstu
    node.on("click", (e) => {
        if (window.isEditingText) return;
        if (node.getParent && node.getParent().getAttr && node.getParent().getAttr("isPriceGroup")) return;
        window.showTextToolbar?.(node);
        window.hideTextPanel?.();
    });

    node.on("click tap", (e) => {
        if (window.isEditingText) return;
        if (e && e.evt && e.evt.shiftKey) return;
        if (node.isDragging && node.isDragging()) return;

        const isSelected =
            page.selectedNodes &&
            page.selectedNodes.length === 1 &&
            page.selectedNodes[0] === node;

        if (isSelected) startInlineEdit();
    });

    // DBLCLICK nadal wspierany
    node.on("dblclick dbltap", startInlineEdit);
}

// 🔧 Naprawa klonów tekstu: usuń stare handlery i podepnij nowe dla klona
function rebindEditableTextForClone(node, page) {
    if (!node || !page) return;

    const rebind = (t) => {
        if (!(t instanceof Konva.Text)) return;
        const parent = t.getParent && t.getParent();
        if (parent && parent.getAttr && parent.getAttr("isPriceGroup")) return;

        t.off("dblclick dbltap transform transformend");
        enableEditableText(t, page);
    };

    if (node instanceof Konva.Text) {
        rebind(node);
        return;
    }

    if (node instanceof Konva.Group && node.find) {
        node.find("Text").forEach(rebind);
    }
}

// === FALLBACK: Dodaj tekst / zdjęcie z sidebaru (gdy moduł nie zadziała) ===
let addTextFallback = false;
let addImageFallback = false;

function getActivePageForAdd() {
    if (!Array.isArray(pages) || pages.length === 0) return null;
    return pages.find(p => p.stage === document.activeStage) || pages[0];
}

function disableAddTextFallback() {
    if (!Array.isArray(pages)) return;
    pages.forEach(page => {
        const c = page.stage.container();
        c.style.cursor = 'default';
        if (page._fallbackTextHandler) {
            page.stage.off('mousedown.fallbackText', page._fallbackTextHandler);
            page._fallbackTextHandler = null;
        }
    });
}

function disableAddImageFallback() {
    if (!Array.isArray(pages)) return;
    pages.forEach(page => {
        const c = page.stage.container();
        c.style.cursor = 'default';
        if (page._fallbackImageHandler) {
            page.stage.off('mousedown.fallbackImage', page._fallbackImageHandler);
            page._fallbackImageHandler = null;
        }
    });
}

function enableAddTextModeFallback() {
    if (addTextFallback || addImageFallback) return;
    addTextFallback = true;
    pages.forEach(page => {
        const c = page.stage.container();
        c.style.cursor = 'text';
        const handler = (e) => {
            if (!addTextFallback || e.evt.button !== 0) return;
            const pos = page.stage.getPointerPosition();
            if (pos) {
                const text = new Konva.Text({
                    text: "Kliknij, aby edytować",
                    x: pos.x,
                    y: pos.y,
                    fontSize: 18,
                    fill: "#000000",
                    fontFamily: "Arial",
                    align: "left",
                    verticalAlign: "middle",
                    draggable: true,
                    isSidebarText: true,
                    _originalText: "Kliknij, aby edytować"
                });
                compactSidebarTextNode(text);
                text.x(pos.x - text.width() / 2);
                text.y(pos.y - text.height() / 2);
                page.layer.add(text);
                page.layer.batchDraw();
                enableEditableText(text, page);
                try {
                    window.dispatchEvent(new CustomEvent('canvasModified', { detail: page.stage }));
                } catch (_e) {}
            }
            addTextFallback = false;
            disableAddTextFallback();
        };
        page.stage.on('mousedown.fallbackText', handler);
        page._fallbackTextHandler = handler;
    });
}

function enableAddImageModeFallback() {
    if (addTextFallback || addImageFallback) return;
    addImageFallback = true;
    pages.forEach(page => {
        const c = page.stage.container();
        c.style.cursor = 'crosshair';
        const handler = (e) => {
            if (!addImageFallback || e.evt.button !== 0) return;
            const pos = page.stage.getPointerPosition();
            if (!pos) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (ev) => {
                const file = ev.target.files && ev.target.files[0];
                if (!file) return;
                let variants = null;
                try {
                    if (typeof window.createImageVariantsFromFile === "function") {
                        variants = await window.createImageVariantsFromFile(file, {
                            cacheKey: `fallback:${file.name}:${file.size}:${file.lastModified}`
                        });
                    }
                } catch (_e) {}
                if (!variants) {
                    try {
                        const fallback = await (new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(String(reader.result || ""));
                            reader.onerror = () => reject(new Error("fallback_image_read_error"));
                            reader.readAsDataURL(file);
                        }));
                        variants = (typeof window.normalizeImageVariantPayload === "function")
                            ? window.normalizeImageVariantPayload(fallback)
                            : { original: fallback, editor: fallback, thumb: fallback };
                    } catch (_e) {
                        return;
                    }
                }
                const originalSrc = (typeof window.getImageVariantSource === "function")
                    ? window.getImageVariantSource(variants, "original")
                    : String(variants?.original || "");
                const editorSrc = (typeof window.getImageVariantSource === "function")
                    ? window.getImageVariantSource(variants, "editor")
                    : String(variants?.editor || originalSrc);
                const thumbSrc = (typeof window.getImageVariantSource === "function")
                    ? window.getImageVariantSource(variants, "thumb")
                    : String(variants?.thumb || editorSrc || originalSrc);
                if (!editorSrc) return;

                Konva.Image.fromURL(editorSrc, (img) => {
                    img.x(pos.x);
                    img.y(pos.y);
                    img.draggable(true);
                    img.listening(true);
                    img.setAttrs({
                        isProductImage: false,
                        isUserImage: true
                    });
                    if (typeof window.applyImageVariantsToKonvaNode === "function") {
                        window.applyImageVariantsToKonvaNode(img, {
                            original: originalSrc || editorSrc,
                            editor: editorSrc,
                            thumb: thumbSrc || editorSrc
                        });
                    } else {
                        img.setAttr("originalSrc", originalSrc || editorSrc);
                        img.setAttr("editorSrc", editorSrc);
                        img.setAttr("thumbSrc", thumbSrc || editorSrc);
                    }
                    page.layer.add(img);
                    setupProductImageDrag(img, page.layer);
                    page.layer.batchDraw();
                    try {
                        window.dispatchEvent(new CustomEvent('canvasModified', { detail: page.stage }));
                    } catch (_e) {}
                });
            };
            input.click();
            addImageFallback = false;
            disableAddImageFallback();
        };
        page.stage.on('mousedown.fallbackImage', handler);
        page._fallbackImageHandler = handler;
    });
}

// Bind fallback click handlers (if moduł sidebar nie działa)
document.addEventListener('DOMContentLoaded', () => {
    const textBtn = document.getElementById('sidebarAddText');
    const imgBtn = document.getElementById('sidebarAddImage');
    if (textBtn) {
        textBtn.addEventListener('click', () => {
            if (window.__sidebarModuleBound) return;
            enableAddTextModeFallback();
        });
    }
    if (imgBtn) {
        imgBtn.addEventListener('click', () => {
            if (window.__sidebarModuleBound) return;
            enableAddImageModeFallback();
        });
    }
});
// =====================================================================
// PANEL EDYCJI STRONY – WSPÓLNY DLA WSZYSTKICH STRON
// =====================================================================

window.openPageEdit = function(page) {

    // Usuń stary panel, jeśli jest
    let old = document.getElementById("pageEditPanel");
    if (old) old.remove();

    // Tworzymy panel
    const panel = document.createElement("div");
    panel.id = "pageEditPanel";

    panel.style.cssText = `
        position: fixed;
        top: 100px;
        right: 40px;
        width: 260px;
        background: #fff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        z-index: 999999;
        font-family: Arial;
    `;

    panel.innerHTML = `
        <h3 style="margin:0 0 10px 0;">Ustawienia strony</h3>

        <label>Kolor tła:</label>
        <input type="color" id="bgColorPicker"
               value="${page.settings.pageBgColor || '#ffffff'}"
               style="width:100%;height:40px;margin:8px 0;">

        <label>Baner (URL):</label>
        <input type="text" id="bannerUrlInput"
               value="${page.settings.bannerUrl || ''}"
               placeholder="https://..."
               style="width:100%;padding:6px;margin:8px 0;">

        <button id="applyPageEdit"
                style="width:100%;padding:10px;background:#007cba;color:#fff;border:none;border-radius:8px;margin-top:12px;">
            Zastosuj
        </button>

        <button id="closePageEdit"
                style="width:100%;padding:10px;background:#777;color:#fff;border:none;border-radius:8px;margin-top:8px;">
            Zamknij
        </button>
    `;

    document.body.appendChild(panel);

    // ====== Zastosuj ======
    document.getElementById("applyPageEdit").onclick = () => {
        const bgColor = document.getElementById("bgColorPicker").value;
        const bannerUrl = document.getElementById("bannerUrlInput").value.trim();

        // Tło
        const bg = page.layer.findOne(n => n.getAttr("isPageBg"));
        if (bg) bg.fill(bgColor);

        page.settings.pageBgColor = bgColor;

        // Baner
        page.settings.bannerUrl = bannerUrl || null;

        // Przerysuj stronę
        drawPage(page);
    };

    // ====== Zamknij ======
    document.getElementById("closePageEdit").onclick = () => {
        panel.remove();
    };
};
// === GLOBALNE TWORZENIE NOWEJ, PUSTEJ STRONY ===
window.createNewPage = function() {

    const newIndex = pages.length + 1;

    // Pusta lista produktów → strona bez produktów
    const emptyProducts = [];

    // Tworzymy stronę z indeksem i pustymi produktami
    const page = createPage(newIndex, emptyProducts);

    return page;
};

window.applyCatalogStyle = function(styleName) {
    window.CATALOG_STYLE = styleName || "default";
    if (typeof window.applyCatalogStyleVisual === "function") {
        window.applyCatalogStyleVisual(window.CATALOG_STYLE);
        return;
    }
    if (Array.isArray(window.pages)) {
        window.pages.forEach(p => drawPage(p));
    }
};

window.redrawCatalogPageForCustomStyle = function(page) {
    if (!page || !page.layer || !page.stage) return;
    // Bezpieczna inicjalizacja wymiarów siatki (działa także bez wcześniejszego importu Excel).
    if (!Number.isFinite(BW) || BW <= 0 || !Number.isFinite(BH) || BH <= 0 || !Number.isFinite(BW_dynamic) || BW_dynamic <= 0 || !Number.isFinite(BH_dynamic) || BH_dynamic <= 0) {
        let scaleBox = 1;
        if ((window.LAYOUT_MODE || "layout6") === "layout8") {
            COLS = layout8Defaults.COLS;
            ROWS = layout8Defaults.ROWS;
            GAP = layout8Defaults.GAP;
            MT = layout8Defaults.MT;
            scaleBox = layout8Defaults.scaleBox;
        } else {
            COLS = layout6Defaults.COLS;
            ROWS = layout6Defaults.ROWS;
            GAP = layout6Defaults.GAP;
            MT = layout6Defaults.MT;
            scaleBox = layout6Defaults.scaleBox;
        }
        BW = (W - ML * 2 - GAP * (COLS - 1)) / COLS;
        BH = (H - MT - MB - GAP * (ROWS - 1)) / ROWS;
        BW_dynamic = BW * scaleBox;
        BH_dynamic = BH * scaleBox;
    }
    drawPage(page);
    page.layer.batchDraw();
    page.transformerLayer?.batchDraw?.();
};

console.log("importdanych.js – PEŁNY KOD ZAŁADOWANY – wszystko działa idealnie!");//DZIALA
// =====================================================
window.setCatalogLayout = function (layout) {

    if (!layout) return;

    console.log("🔁 ZMIANA LAYOUTU NA:", layout);

    // =========================
    // 1. ZAPIS GLOBALNY
    // =========================
    window.LAYOUT_MODE = layout;

    let scaleBox = 1;

    // =========================
    // 2. USTAWIENIA GRIDU
    // =========================
    if (layout === "layout6") {
        COLS = layout6Defaults.COLS;
        ROWS = layout6Defaults.ROWS;
        GAP  = layout6Defaults.GAP;
        MT   = layout6Defaults.MT;
        scaleBox = layout6Defaults.scaleBox;
    }

    if (layout === "layout8") {
        COLS = layout8Defaults.COLS;
        ROWS = layout8Defaults.ROWS;
        GAP  = layout8Defaults.GAP;
        MT   = layout8Defaults.MT;
        scaleBox = layout8Defaults.scaleBox;
    }

    // =========================
    // 3. PRZELICZ BOX
    // =========================
    BW = (W - ML * 2 - GAP * (COLS - 1)) / COLS;
    BH = (H - MT - MB - GAP * (ROWS - 1)) / ROWS;

    BW_dynamic = BW * scaleBox;
    BH_dynamic = BH * scaleBox;

    // =========================
    // 4. PRZEBUDUJ STRONY
    // =========================
    if (!window.allProducts || !allProducts.length) {
        console.warn("⚠️ Brak produktów – nie przebudowuję");
        return;
    }

    pages.forEach(p => {
        p.stage.destroy();
        p.container.remove();
    });

    pages.length = 0;
    document.getElementById("pagesContainer").innerHTML = "";

    buildPagesFromProducts(allProducts);
    setTimeout(() => {
        if (typeof window.applyCachedProductImages === "function") {
            window.applyCachedProductImages();
        }
    }, 50);
    if (typeof window.resetProjectHistory === "function") {
        window.resetProjectHistory(null);
    }
// ================================
// OVERLAY „AI PROCESSING…”
// ================================
const aiOverlay = document.createElement("div");
aiOverlay.id = "aiProcessingOverlay";
aiOverlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
`;

aiOverlay.innerHTML = `
  <div style="
      background:#fff;
      padding:28px 36px;
      border-radius:18px;
      box-shadow:0 20px 60px rgba(0,0,0,.35);
      display:flex;
      align-items:center;
      gap:18px;
      font-family:Arial;
  ">
      <div class="aiSpinner"></div>
      <div style="font-size:16px;font-weight:600;color:#333;">
          Usuwanie tła…<br>
          <span style="font-size:13px;font-weight:400;color:#666;">
              AI analizuje obraz
          </span>
      </div>
  </div>
`;

document.body.appendChild(aiOverlay);

// spinner (CSS)
const spinnerStyle = document.createElement("style");
spinnerStyle.textContent = `
.aiSpinner {
    width:34px;
    height:34px;
    border:4px solid #e0e0e0;
    border-top:4px solid #8e44ad;
    border-radius:50%;
    animation: aiSpin 1s linear infinite;
}
@keyframes aiSpin {
    to { transform: rotate(360deg); }
}
`;
document.head.appendChild(spinnerStyle);

function showAIOverlay() {
    aiOverlay.style.pointerEvents = "auto";
    aiOverlay.style.opacity = "1";
}

function hideAIOverlay() {
    aiOverlay.style.opacity = "0";
    setTimeout(() => {
        aiOverlay.style.pointerEvents = "none";
    }, 250);
}

    console.log("✅ Layout ZASTOSOWANY:", layout);
};
// =====================================================
// PDF CANVA – OBIEKTOWY (EDYTOWALNY W CANVA)
// =====================================================
window.generateCanvaPDF = async function (pageNumbers) {

  if (!window.pages || !window.pages.length) {
    alert("Brak stron do eksportu");
    return;
  }
  const releaseForceDraw = (typeof window.beginForcePageDraw === "function")
    ? window.beginForcePageDraw()
    : null;
  if (typeof window.forceDrawAllPagesForExport === "function") {
    window.forceDrawAllPagesForExport();
  }
  try {

  const pageSet = Array.isArray(pageNumbers) && pageNumbers.length
    ? new Set(pageNumbers.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n)))
    : null;

  const pagesToExport = pageSet
    ? pages.filter(p => pageSet.has(p.number))
    : pages;

  if (!pagesToExport.length) {
    alert("Brak stron do eksportu");
    return;
  }

  try {
    await ensurePagesReadyForExport(pagesToExport);
  } catch (_e) {
    alert("Nie udało się przygotować stron do eksportu.");
    return;
  }

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [W, H]
  });

  for (let pi = 0; pi < pagesToExport.length; pi++) {
    const page = pagesToExport[pi];
    if (pi > 0) pdf.addPage();

    // białe tło
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, W, H, "F");

    const parsePdfColor = (raw) => {
      const txt = String(raw || "").trim();
      if (!txt) return [0, 0, 0];
      const hex = txt.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (hex) {
        let h = hex[1];
        if (h.length === 3) h = h.split("").map(ch => ch + ch).join("");
        return [
          parseInt(h.slice(0, 2), 16),
          parseInt(h.slice(2, 4), 16),
          parseInt(h.slice(4, 6), 16)
        ];
      }
      const rgb = txt.match(/rgba?\(([^)]+)\)/i);
      if (rgb) {
        const parts = rgb[1].split(",").map(v => parseFloat(v.trim()));
        return [
          Math.max(0, Math.min(255, Math.round(parts[0] || 0))),
          Math.max(0, Math.min(255, Math.round(parts[1] || 0))),
          Math.max(0, Math.min(255, Math.round(parts[2] || 0)))
        ];
      }
      return [0, 0, 0];
    };

    const drawTextNodeToPdf = (textNode, opts = {}) => {
      if (!(textNode instanceof Konva.Text)) return;
      if (textNode.getAttr && textNode.getAttr("isPriceHitArea")) return;
      if (typeof textNode.visible === "function" && !textNode.visible()) return;
      const abs = textNode.getAbsolutePosition ? textNode.getAbsolutePosition() : { x: textNode.x(), y: textNode.y() };
      const absScale = textNode.getAbsoluteScale ? textNode.getAbsoluteScale() : { x: textNode.scaleX?.() || 1, y: textNode.scaleY?.() || 1 };
      const fontSize = Math.max(1, (textNode.fontSize() || 12) * (Number(absScale.y) || 1));
      const maxWidth = Math.max(1, (textNode.width() || 300) * (Number(absScale.x) || 1));
      const [r, g, b] = parsePdfColor(textNode.fill?.() || "#000");
      const style = String(textNode.fontStyle?.() || "").toLowerCase();
      let pdfStyle = "normal";
      if (style.includes("bold") && style.includes("italic")) pdfStyle = "bolditalic";
      else if (style.includes("bold")) pdfStyle = "bold";
      else if (style.includes("italic")) pdfStyle = "italic";

      pdf.setFont("helvetica", pdfStyle);
      pdf.setFontSize(fontSize);
      pdf.setTextColor(r, g, b);
      pdf.setLineHeightFactor(Number(textNode.lineHeight?.() || 1.2));

      const textValue = String(textNode.text?.() || "");
      const lines = opts.noWrap ? [textValue] : pdf.splitTextToSize(textValue, maxWidth);
      const x = Number(abs.x || 0) + Number(opts.xOffset || 0);
      const y = Number(abs.y || 0) + Number(opts.yOffset || 0);
      pdf.text(lines, x, y + (opts.baselineTop ? 0 : fontSize), opts.baselineTop ? { baseline: "top" } : undefined);
    };

	    const drawImageNodeToPdf = async (imgNode) => {
	      if (!(imgNode instanceof Konva.Image) || !imgNode.image()) return;
	      if (imgNode.getAttr && imgNode.getAttr("isPriceHitArea")) return;
	      if (typeof imgNode.visible === "function" && !imgNode.visible()) return;

      const abs = imgNode.getAbsolutePosition ? imgNode.getAbsolutePosition() : { x: imgNode.x(), y: imgNode.y() };
      const absScale = imgNode.getAbsoluteScale ? imgNode.getAbsoluteScale() : { x: imgNode.scaleX?.() || 1, y: imgNode.scaleY?.() || 1 };
      const w = (imgNode.width() || 0) * (Number(absScale.x) || 1);
      const h = (imgNode.height() || 0) * (Number(absScale.y) || 1);
      if (!(w > 0 && h > 0)) return;

	      const isOverlay =
	        imgNode.getAttr("isOverlayElement") ||
	        imgNode.getAttr("isTNZBadge") ||
	        imgNode.getAttr("isCountryBadge") ||
	        imgNode.getAttr("isBarcode");

	      const exportScale = 2.2;
	      const restoreOriginalImage = (!isOverlay && typeof window.swapKonvaImageToOriginalForExport === "function")
	        ? await window.swapKonvaImageToOriginalForExport(imgNode)
	        : null;
	      try {
	        const pngUrl = imgNode.toDataURL({
	          pixelRatio: exportScale,
	          mimeType: "image/png"
	        });

	        if (isOverlay) {
	          pdf.addImage(pngUrl, "PNG", abs.x, abs.y, w, h);
	          return;
	        }

	        const imgEl = new Image();
	        imgEl.src = pngUrl;
	        await new Promise((res, rej) => {
	          imgEl.onload = res;
	          imgEl.onerror = rej;
	        });

	        const c = document.createElement("canvas");
	        c.width = Math.max(1, Math.round(w * exportScale));
	        c.height = Math.max(1, Math.round(h * exportScale));
	        const ctx = c.getContext("2d");
	        ctx.fillStyle = "#ffffff";
	        ctx.fillRect(0, 0, c.width, c.height);
	        ctx.drawImage(imgEl, 0, 0, c.width, c.height);
	        const jpegUrl = c.toDataURL("image/jpeg", 0.88);
	        pdf.addImage(jpegUrl, "JPEG", abs.x, abs.y, w, h);
	      } finally {
	        if (typeof restoreOriginalImage === "function") restoreOriginalImage();
	      }
	    };

    const drawNodeRecursive = async (node) => {
      if (!node || !node.getAttr) return;
      if (typeof node.visible === "function" && !node.visible()) return;
      if (node.name && (node.name() === "selectionOutline" || node.name() === "selectionRect")) return;
      if (node.getAttr("isBgBlur") || node.getAttr("isFxHelper") || node.getAttr("isPriceHitArea")) return;
      if (node.getAttr("isPageBg")) return;

      // === BOX (CANVA STYLE – FAKE SHADOW + SOFT BORDER) ===
      if (node.getAttr && node.getAttr("isBox")) {
        const hiddenByStyle =
          node.getAttr("isHiddenByCatalogStyle") === true ||
          window.CATALOG_STYLE === "styl_elegancki" ||
          (typeof node.visible === "function" && node.visible() === false);
        if (hiddenByStyle) return;

        const abs = node.getAbsolutePosition ? node.getAbsolutePosition() : { x: node.x(), y: node.y() };
        const absScale = node.getAbsoluteScale ? node.getAbsoluteScale() : { x: node.scaleX?.() || 1, y: node.scaleY?.() || 1 };
        const x = abs.x;
        const y = abs.y;
        const w = (node.width() || 0) * (Number(absScale.x) || 1);
        const h = (node.height() || 0) * (Number(absScale.y) || 1);
        const r = 14;

        // 1️⃣ CIEŃ (FAKE SHADOW)
        pdf.setFillColor(0, 0, 0);
        pdf.setLineWidth(0);
        pdf.setGState(new pdf.GState({ opacity: 0.12 }));

        pdf.roundedRect(
          x,
          y + 8,
          w,
          h,
          r,
          r,
          "F"
        );

        pdf.setGState(new pdf.GState({ opacity: 1 }));

        // 2️⃣ BOX GŁÓWNY – DELIKATNA RAMKA
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(210, 210, 210);
        pdf.setLineWidth(1.2);

        pdf.roundedRect(
          x,
          y,
          w,
          h,
          r,
          r,
          "FD"
        );
      }

      // === TEKST ===
      if (node instanceof Konva.Text) {
        if (node.getParent && node.getParent() && node.getParent().getAttr && node.getParent().getAttr("isPriceGroup")) {
          return;
        }
        drawTextNodeToPdf(node);
        return;
      }

      // === TŁO CENY (styl prostokątny) ===
      if (node instanceof Konva.Rect && node.getAttr && node.getAttr("isDirectPriceRectBg")) {
        const abs = node.getAbsolutePosition ? node.getAbsolutePosition() : { x: node.x(), y: node.y() };
        const absScale = node.getAbsoluteScale ? node.getAbsoluteScale() : { x: node.scaleX?.() || 1, y: node.scaleY?.() || 1 };
        const w = Math.max(1, (node.width?.() || 0) * (Number(absScale.x) || 1));
        const h = Math.max(1, (node.height?.() || 0) * (Number(absScale.y) || 1));
        const radiusRaw = Number(node.cornerRadius?.() || 0);
        const radius = Math.max(0, radiusRaw * (Number(absScale.x) || 1));
        const [r, g, b] = parsePdfColor(node.fill?.() || "#2eaee8");
        pdf.setFillColor(r, g, b);
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(0.1);
        if (radius > 0) {
          pdf.roundedRect(abs.x, abs.y, w, h, radius, radius, "F");
        } else {
          pdf.rect(abs.x, abs.y, w, h, "F");
        }
        return;
      }

      // === CENA (GROUP) – POPRAWIONE 1:1 ===
      if (node instanceof Konva.Group && node.getAttr("isPriceGroup")) {
        node.getChildren().forEach(t => {
          if (!(t instanceof Konva.Text)) return;
          drawTextNodeToPdf(t, {
            noWrap: true,
            baselineTop: true
          });
        });
        return;
      }

      // CODEX_CANVA_IMAGE_EXPORT
      // === OBRAZ (crop 1:1 + wysoka jakość) ===
      if (node instanceof Konva.Image && node.image()) {
        await drawImageNodeToPdf(node);
        return;
      }

      if (node instanceof Konva.Group && node.getChildren) {
        const children = node.getChildren();
        for (const child of children) {
          await drawNodeRecursive(child);
        }
      }
    };

    const nodes = page.layer.getChildren();
    for (const node of nodes) {
      await drawNodeRecursive(node);
    }
  }

  pdf.save("katalog_canva_editable.pdf");
  } finally {
    if (typeof window.releaseExportImageCache === "function") window.releaseExportImageCache();
    if (typeof releaseForceDraw === "function") releaseForceDraw();
  }
};

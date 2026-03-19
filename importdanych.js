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

let zoomSliderCreateQueued = false;
function queueCreateZoomSlider() {
    if (zoomSliderCreateQueued) return;
    zoomSliderCreateQueued = true;
    requestAnimationFrame(() => {
        zoomSliderCreateQueued = false;
        if (typeof window.createZoomSlider === "function") {
            try { window.createZoomSlider(); } catch (_e) {}
        } else {
            try { createZoomSlider(); } catch (_e) {}
        }
    });
}

function schedulePageTask(page, key, fn, delay = 0) {
    if (!page || typeof fn !== "function") return;
    const cleanKey = String(key || "").trim();
    if (!cleanKey) return;
    if (!page.__scheduledTasks) page.__scheduledTasks = Object.create(null);
    const tasks = page.__scheduledTasks;
    if (tasks[cleanKey]) clearTimeout(tasks[cleanKey]);
    tasks[cleanKey] = setTimeout(() => {
        if (tasks[cleanKey]) delete tasks[cleanKey];
        try { fn(); } catch (_e) {}
    }, Math.max(0, Number(delay) || 0));
}

function getViewportUiZoom() {
    const raw = window.getComputedStyle(document.body).zoom;
    const zoom = Number.parseFloat(raw);
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
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

function exportStageToDataURLWithBackground(stage, options = {}) {
    if (!stage) return "";
    const mimeType = String(options.mimeType || "image/jpeg");
    const qualityRaw = Number(options.quality);
    const quality = Number.isFinite(qualityRaw) ? Math.max(0.1, Math.min(1, qualityRaw)) : 0.92;
    const pixelRatioRaw = Number(options.pixelRatio);
    const pixelRatio = Number.isFinite(pixelRatioRaw) ? Math.max(0.1, pixelRatioRaw) : 1;
    const backgroundColor = String(options.backgroundColor || "#ffffff");
    const directFallback = () => stage.toDataURL({ mimeType, quality, pixelRatio });

    try {
        if (typeof stage.toCanvas !== "function") return directFallback();
        const stageCanvas = stage.toCanvas({ pixelRatio });
        if (!stageCanvas) return directFallback();

        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = stageCanvas.width || Math.max(1, Math.round((stage.width?.() || 1) * pixelRatio));
        outputCanvas.height = stageCanvas.height || Math.max(1, Math.round((stage.height?.() || 1) * pixelRatio));
        const ctx = outputCanvas.getContext("2d");
        if (!ctx) return directFallback();

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
        ctx.drawImage(stageCanvas, 0, 0);
        return outputCanvas.toDataURL(mimeType, quality);
    } catch (_e) {
        return directFallback();
    }
}
window.exportStageToDataURLWithBackground = exportStageToDataURLWithBackground;

// ============================================
// 🔒 NORMALIZACJA ZAZNACZENIA (dziecko → GROUP)
// ============================================
function isDirectModuleEditableTextNode(node) {
    if (!(node instanceof Konva.Text)) return false;
    if (!(node.getAttr && typeof node.getAttr === "function")) return false;
    const parent = node.getParent ? node.getParent() : null;
    if (parent && parent.getAttr && parent.getAttr("isPriceGroup")) return false;
    const isManagedDirectText = !!(
        node.getAttr("directModuleId") ||
        node.getAttr("isName") ||
        node.getAttr("isIndex") ||
        node.getAttr("isCustomPackageInfo")
    );
    if (!isManagedDirectText) return false;
    let current = parent;
    while (current && current.getParent) {
        if (
            current instanceof Konva.Group &&
            current.getAttr &&
            current.getAttr("isUserGroup") &&
            current.getAttr("isAutoSlotGroup")
        ) {
            return true;
        }
        current = current.getParent ? current.getParent() : null;
    }
    return false;
}
window.isDirectModuleEditableTextNode = isDirectModuleEditableTextNode;

function normalizeSelection(nodes) {
    if (!Array.isArray(nodes)) return [];

    const toGroupRoot = (node) => {
        if (isDirectModuleEditableTextNode(node)) return node;
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

function cloneProjectSerializableValue(value, fallback = null) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_e) {
        return fallback;
    }
}

function collectNodeSlotIndexes(node, bucket = new Set()) {
    if (!node || !node.getAttr) return bucket;
    const direct = Number(node.getAttr("slotIndex"));
    const preserved = Number(node.getAttr("preservedSlotIndex"));
    if (Number.isFinite(direct) && direct >= 0) bucket.add(direct);
    if (Number.isFinite(preserved) && preserved >= 0) bucket.add(preserved);
    if (node.getChildren) {
        try {
            node.getChildren().forEach((child) => collectNodeSlotIndexes(child, bucket));
        } catch (_e) {}
    }
    return bucket;
}

function resolveClipboardSourceSlotIndex(node) {
    const slots = Array.from(collectNodeSlotIndexes(node));
    return slots.length ? slots[0] : null;
}

function resolveClipboardSourceModuleKey(node) {
    if (!node || !node.getAttr) return "";
    const directModuleId = String(node.getAttr("directModuleId") || "").trim();
    if (directModuleId) return `direct:${directModuleId}`;
    const slotIndex = resolveClipboardSourceSlotIndex(node);
    if (Number.isFinite(slotIndex) && slotIndex >= 0) return `slot:${slotIndex}`;
    return "";
}

function collectOccupiedPageSlotIndexes(page) {
    const occupied = new Set();
    if (!page) return occupied;
    if (Array.isArray(page.products)) {
        page.products.forEach((product, index) => {
            if (product) occupied.add(index);
        });
    }
    if (Array.isArray(page.slotObjects)) {
        page.slotObjects.forEach((obj, index) => {
            if (obj) occupied.add(index);
        });
    }
    if (page.layer && typeof page.layer.find === "function") {
        try {
            page.layer.find((n) => n && n.getAttr).forEach((n) => {
                const direct = Number(n.getAttr("slotIndex"));
                const preserved = Number(n.getAttr("preservedSlotIndex"));
                if (Number.isFinite(direct) && direct >= 0) occupied.add(direct);
                if (Number.isFinite(preserved) && preserved >= 0) occupied.add(preserved);
            });
        } catch (_e) {}
    }
    return occupied;
}

function findNextFreePageSlotIndex(page) {
    const occupied = collectOccupiedPageSlotIndexes(page);
    let slotIndex = Array.isArray(page?.products) ? page.products.length : 0;
    if (occupied.size) {
        const maxUsed = Math.max(...Array.from(occupied));
        slotIndex = Math.max(slotIndex, maxUsed + 1);
    }
    while (occupied.has(slotIndex)) slotIndex += 1;
    return slotIndex;
}

function assignSlotBindingToPastedClone(node, slotIndex) {
    if (!node || !node.setAttr) return;
    const normalizedSlot = Number.isFinite(Number(slotIndex)) ? Number(slotIndex) : null;
    node.setAttr("slotIndex", normalizedSlot);
    if (node.getAttr && node.getAttr("isAutoSlotGroup")) {
        node.setAttr("preservedSlotIndex", normalizedSlot);
    } else if (node.getAttr && node.getAttr("preservedSlotIndex") != null) {
        node.setAttr("preservedSlotIndex", null);
    }
    if (node.getChildren) {
        try {
            node.getChildren().forEach((child) => assignSlotBindingToPastedClone(child, normalizedSlot));
        } catch (_e) {}
    }
}

function registerPastedCatalogClone(page, sourceNode, clone, slotMap) {
    if (!page || !clone) return null;
    const sourceModuleKey = resolveClipboardSourceModuleKey(sourceNode);
    const map = (slotMap && typeof slotMap === "object") ? slotMap : null;
    if (sourceModuleKey && map && Number.isFinite(Number(map[sourceModuleKey]))) {
        const reusedSlotIndex = Number(map[sourceModuleKey]);
        assignSlotBindingToPastedClone(clone, reusedSlotIndex);
        return reusedSlotIndex;
    }
    const sourceSlotIndex = resolveClipboardSourceSlotIndex(sourceNode);
    if (!Number.isFinite(sourceSlotIndex) || sourceSlotIndex < 0) return null;
    if (!Array.isArray(page.products) || !page.products[sourceSlotIndex]) return null;
    if (!Array.isArray(page.products)) page.products = [];
    if (!Array.isArray(page.slotObjects)) page.slotObjects = [];
    if (!Array.isArray(page.barcodeObjects)) page.barcodeObjects = [];

    const nextSlotIndex = findNextFreePageSlotIndex(page);
    const clonedProduct = cloneProjectSerializableValue(page.products[sourceSlotIndex], null);
    if (!clonedProduct || typeof clonedProduct !== "object") return null;

    page.products[nextSlotIndex] = clonedProduct;
    page.slotObjects[nextSlotIndex] = null;
    page.barcodeObjects[nextSlotIndex] = null;
    assignSlotBindingToPastedClone(clone, nextSlotIndex);
    if (sourceModuleKey && map) map[sourceModuleKey] = nextSlotIndex;
    return nextSlotIndex;
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

const TRANSFORMER_ANCHORS_LINE = [
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
];

const TRANSFORMER_PADDING_DEFAULT = 4;
const TRANSFORMER_PADDING_LINE = 22;
const TRANSFORMER_ANCHOR_SIZE_DEFAULT = 12;
const TRANSFORMER_ANCHOR_SIZE_LINE = 14;
const TRANSFORMER_ROTATE_OFFSET_DEFAULT = 50;
const TRANSFORMER_ROTATE_OFFSET_LINE = 82;

function isLineLikeTransformerNode(node) {
    if (!node) return false;
    const type = String(node.getAttr && node.getAttr("shapeType") || "").trim().toLowerCase();
    return (
        type === "line" ||
        type === "arrow" ||
        node instanceof Konva.Line ||
        node instanceof Konva.Arrow
    );
}

function normalizeLineLikeTransformerNode(node) {
    if (!isLineLikeTransformerNode(node) || !node || typeof node.points !== "function") return;
    const points = node.points();
    if (!Array.isArray(points) || points.length < 4) return;

    const numericPoints = points.map((value) => Number(value));
    if (numericPoints.some((value) => !Number.isFinite(value))) return;

    let minX = Infinity;
    let minY = Infinity;
    for (let i = 0; i < numericPoints.length; i += 2) {
        minX = Math.min(minX, numericPoints[i]);
        minY = Math.min(minY, numericPoints[i + 1]);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
    if (Math.abs(minX) < 0.001 && Math.abs(minY) < 0.001) {
        node.setAttr("lineCoordsNormalized", true);
        return;
    }

    const nextPoints = numericPoints.map((value, index) => (
        index % 2 === 0 ? value - minX : value - minY
    ));

    node.x((Number(node.x && node.x()) || 0) + minX);
    node.y((Number(node.y && node.y()) || 0) + minY);
    node.points(nextPoints);
    node.setAttr("lineCoordsNormalized", true);
}

function applyTransformerProfileForSelection(page) {
    if (!page || !page.transformer) return;
    const selectedNodes = normalizeSelection(Array.isArray(page.selectedNodes) ? page.selectedNodes : []);
    page.selectedNodes = selectedNodes;

    if (selectedNodes.length === 1) {
        const n = selectedNodes[0];
        const cropSelectionActive = !!(page._cropMode && page._cropTarget === n);
        const isLineLikeSelection = isLineLikeTransformerNode(n);
        if (isLineLikeSelection) {
            normalizeLineLikeTransformerNode(n);
        }
        if (cropSelectionActive) {
            page.transformer.enabledAnchors(TRANSFORMER_ANCHORS_DEFAULT);
            page.transformer.rotateEnabled(true);
            page.transformer.keepRatio(true);
            page.transformer.padding(TRANSFORMER_PADDING_DEFAULT);
            page.transformer.anchorSize(TRANSFORMER_ANCHOR_SIZE_DEFAULT);
            page.transformer.rotateAnchorOffset(TRANSFORMER_ROTATE_OFFSET_DEFAULT);
        } else if (isLineLikeSelection) {
            page.transformer.enabledAnchors(TRANSFORMER_ANCHORS_LINE);
            page.transformer.rotateEnabled(true);
            page.transformer.keepRatio(false);
            page.transformer.padding(TRANSFORMER_PADDING_LINE);
            page.transformer.anchorSize(TRANSFORMER_ANCHOR_SIZE_LINE);
            page.transformer.rotateAnchorOffset(TRANSFORMER_ROTATE_OFFSET_LINE);
        } else {
            page.transformer.enabledAnchors(TRANSFORMER_ANCHORS_DEFAULT);
            page.transformer.rotateEnabled(true);
            page.transformer.keepRatio(true);
            page.transformer.padding(TRANSFORMER_PADDING_DEFAULT);
            page.transformer.anchorSize(TRANSFORMER_ANCHOR_SIZE_DEFAULT);
            page.transformer.rotateAnchorOffset(TRANSFORMER_ROTATE_OFFSET_DEFAULT);
        }
    } else {
        page.transformer.enabledAnchors(TRANSFORMER_ANCHORS_DEFAULT);
        page.transformer.rotateEnabled(true);
        page.transformer.keepRatio(true);
        page.transformer.padding(TRANSFORMER_PADDING_DEFAULT);
        page.transformer.anchorSize(TRANSFORMER_ANCHOR_SIZE_DEFAULT);
        page.transformer.rotateAnchorOffset(TRANSFORMER_ROTATE_OFFSET_DEFAULT);
    }

    try { page.transformer.forceUpdate && page.transformer.forceUpdate(); } catch (_e) {}
    try { page.layer && page.layer.batchDraw && page.layer.batchDraw(); } catch (_e) {}
    try { page.transformerLayer && page.transformerLayer.batchDraw && page.transformerLayer.batchDraw(); } catch (_e) {}
}

window.applyTransformerProfileForSelection = applyTransformerProfileForSelection;

const TRANSFORMER_ANCHORS_CROP = [
    // Pełne uchwyty: narożniki + boki (crop działa tylko na środkowych bokach)
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
];

function isCropAnchorName(anchor) {
    return (
        anchor === 'top-left' ||
        anchor === 'middle-left' ||
        anchor === 'top-right' ||
        anchor === 'middle-right' ||
        anchor === 'top-center' ||
        anchor === 'bottom-left' ||
        anchor === 'bottom-center' ||
        anchor === 'bottom-right'
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

function isUserLikeImageForCrop(img) {
    if (!(img instanceof Konva.Image) || !img.getAttr) return false;
    if (img.getAttr("isProductImage")) return false;
    if (img.getAttr("isOverlayElement")) return false;
    if (img.getAttr("isBarcode") || img.getAttr("isCountryBadge") || img.getAttr("isTNZBadge") || img.getAttr("isQRCode") || img.getAttr("isEAN")) {
        return false;
    }
    return !!(
        img.getAttr("isUserImage") ||
        img.getAttr("isSidebarImage") ||
        img.getAttr("isDesignElement")
    );
}

function isCropCapableImageNode(node) {
    if (!(node instanceof Konva.Image) || !node.getAttr) return false;
    if (node.getAttr("isOverlayElement")) return false;
    if (
        node.getAttr("isBarcode") ||
        node.getAttr("isCountryBadge") ||
        node.getAttr("isTNZBadge") ||
        node.getAttr("isQRCode") ||
        node.getAttr("isEAN")
    ) {
        return false;
    }
    return !!(
        node.getAttr("isUserImage") ||
        node.getAttr("isProductImage") ||
        node.getAttr("isSidebarImage") ||
        node.getAttr("isDesignElement")
    );
}

function resetUntouchedUserImageCropBaseline(img) {
    if (!isUserLikeImageForCrop(img)) return;
    if (img.getAttr && img.getAttr("_userCropTouched")) return;
    const imgEl = img.image && img.image();
    if (!imgEl) return;

    const rawW = Math.max(1, Number(imgEl.naturalWidth || imgEl.width || img.width() || 1));
    const rawH = Math.max(1, Number(imgEl.naturalHeight || imgEl.height || img.height() || 1));
    const curW = Math.max(1, Number(img.width() || rawW));
    const curH = Math.max(1, Number(img.height() || rawH));
    const scaleX = Number(img.scaleX()) || 1;
    const scaleY = Number(img.scaleY()) || 1;
    const signX = scaleX < 0 ? -1 : 1;
    const signY = scaleY < 0 ? -1 : 1;
    const displayW = Math.max(1, Math.abs(curW * scaleX));
    const displayH = Math.max(1, Math.abs(curH * scaleY));

    try {
        if (typeof img.crop === "function") {
            img.crop({ x: 0, y: 0, width: rawW, height: rawH });
        }
        img.width(rawW);
        img.height(rawH);
        img.scaleX(signX * (displayW / rawW));
        img.scaleY(signY * (displayH / rawH));
    } catch (_e) {}
}

function ensureImageCropData(img) {
    if (!(img instanceof Konva.Image)) return null;
    const imgEl = img.image();
    if (!imgEl) return null;

    const rawImgW = Number(imgEl.naturalWidth || imgEl.width || img.width() || 1);
    const rawImgH = Number(imgEl.naturalHeight || imgEl.height || img.height() || 1);
    const curW = Math.max(1, Number(img.width() || rawImgW));
    const curH = Math.max(1, Number(img.height() || rawImgH));
    const curScaleX = Number(img.scaleX()) || 1;
    const curScaleY = Number(img.scaleY()) || 1;
    const signX = curScaleX < 0 ? -1 : 1;
    const signY = curScaleY < 0 ? -1 : 1;
    const displayW = Math.max(1, Math.abs(curW * curScaleX));
    const displayH = Math.max(1, Math.abs(curH * curScaleY));
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
    img.scaleX(signX * (displayW / clamped.width));
    img.scaleY(signY * (displayH / clamped.height));

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

function getCropPointerPosition(stage, fallback = null) {
    if (!stage || typeof stage.getPointerPosition !== "function") return fallback;
    const pos = stage.getPointerPosition();
    if (!pos) return fallback;
    const x = Number(pos.x);
    const y = Number(pos.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return fallback;
    return { x, y };
}

function scheduleCropVisualSync(page, img) {
    if (!page || !img) return;
    if (img._cropVisualSyncRaf) return;
    img._cropVisualSyncRaf = requestAnimationFrame(() => {
        img._cropVisualSyncRaf = 0;
        const tick = (Number(img._cropVisualTick) || 0) + 1;
        img._cropVisualTick = tick;
        try { img.getLayer()?.batchDraw?.(); } catch (_e) {}
        if ((tick % 3) === 0) {
            try { page.transformer?.forceUpdate?.(); } catch (_e) {}
        }
        try { page.transformerLayer?.batchDraw?.(); } catch (_e) {}
    });
}

function suspendImageShadowDuringCrop(img) {
    if (!img || img._cropShadowBackup) return;
    if (typeof img.shadowBlur !== "function" || typeof img.shadowOpacity !== "function") return;
    img._cropShadowBackup = {
        blur: Number(img.shadowBlur() || 0),
        opacity: Number(img.shadowOpacity() || 0),
        offsetX: (typeof img.shadowOffsetX === "function") ? Number(img.shadowOffsetX() || 0) : 0,
        offsetY: (typeof img.shadowOffsetY === "function") ? Number(img.shadowOffsetY() || 0) : 0
    };
    try {
        img.shadowBlur(0);
        img.shadowOpacity(0);
        if (typeof img.shadowOffset === "function") img.shadowOffset({ x: 0, y: 0 });
    } catch (_e) {}
}

function restoreImageShadowAfterCrop(img) {
    if (!img || !img._cropShadowBackup) return;
    const backup = img._cropShadowBackup;
    img._cropShadowBackup = null;
    try {
        img.shadowBlur(Number(backup.blur || 0));
        img.shadowOpacity(Number(backup.opacity || 0));
        if (typeof img.shadowOffset === "function") {
            img.shadowOffset({
                x: Number(backup.offsetX || 0),
                y: Number(backup.offsetY || 0)
            });
        }
    } catch (_e) {}
}

function disableCropMode(page) {
    if (!page || !page._cropMode) return;
    const img = page._cropTarget;
    if (img) {
        if (img._cropVisualSyncRaf) {
            cancelAnimationFrame(img._cropVisualSyncRaf);
            img._cropVisualSyncRaf = 0;
        }
        img._cropVisualTick = 0;
        restoreImageShadowAfterCrop(img);
        img.off('.crop');
        img._cropApplying = false;
        img._cropState = null;
    }

    page._cropMode = false;
    page._cropTarget = null;

    page.transformer.enabledAnchors(TRANSFORMER_ANCHORS_DEFAULT);
    page.transformer.rotateEnabled(true);
    page.transformer.keepRatio(true);
    page.transformer.padding(TRANSFORMER_PADDING_DEFAULT);
    page.transformer.anchorSize(TRANSFORMER_ANCHOR_SIZE_DEFAULT);
    page.transformer.rotateAnchorOffset(TRANSFORMER_ROTATE_OFFSET_DEFAULT);
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
    // W crop zostawiamy też uchwyt obrotu, żeby można było obracać bez wychodzenia z trybu.
    page.transformer.rotateEnabled(true);
    // Domyślnie dla zdjęcia zachowujemy proporcje (narożniki skalują cały obraz).
    // Na czas kadrowania środkowymi uchwytami przełączamy to dynamicznie w transformstart.
    page.transformer.keepRatio(true);
    page.transformer.borderStroke('#007cba');
    page.transformer.anchorStroke('#007cba');
    page.transformer.anchorFill('#ffffff');
    page.transformer.nodes([img]);
    page.transformer.forceUpdate && page.transformer.forceUpdate();
    page.transformerLayer.batchDraw();

    img.on('transformstart.crop', () => {
        const anchor = page.transformer.getActiveAnchor();
        const cropAnchor = isCropAnchorName(anchor);
        page.transformer.keepRatio(!cropAnchor);
        if (!isCropAnchorName(anchor)) {
            img._cropState = { isCropping: false };
            return;
        }

        suspendImageShadowDuringCrop(img);
        const data = ensureImageCropData(img);
        if (!data) return;
        const startPointer = getCropPointerPosition(page.stage, null);
        const startRect = (() => {
            try {
                return img.getClientRect({ relativeTo: page.layer });
            } catch (_e) {
                const w = Math.max(1, Math.abs((Number(img.width()) || 1) * (Number(img.scaleX()) || 1)));
                const h = Math.max(1, Math.abs((Number(img.height()) || 1) * (Number(img.scaleY()) || 1)));
                return {
                    x: Number(img.x()) || 0,
                    y: Number(img.y()) || 0,
                    width: w,
                    height: h
                };
            }
        })();
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
            imgH: data.imgH,
            startPointerX: Number(startPointer && startPointer.x),
            startPointerY: Number(startPointer && startPointer.y),
            startRectX: Number(startRect.x) || Number(img.x()) || 0,
            startRectY: Number(startRect.y) || Number(img.y()) || 0,
            startRectW: Math.max(1, Number(startRect.width) || Math.abs((Number(img.width()) || 1) * (Number(img.scaleX()) || 1))),
            startRectH: Math.max(1, Number(startRect.height) || Math.abs((Number(img.height()) || 1) * (Number(img.scaleY()) || 1)))
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
        const minDisplay = 20;
        const minCropW = minDisplay / origScaleXAbs;
        const minCropH = minDisplay / origScaleYAbs;
        const pointer = getCropPointerPosition(page.stage, null);
        const curRect = (() => {
            try {
                return img.getClientRect({ relativeTo: page.layer });
            } catch (_e) {
                const w = Math.max(1, Math.abs((Number(img.width()) || 1) * (Number(img.scaleX()) || 1)));
                const h = Math.max(1, Math.abs((Number(img.height()) || 1) * (Number(img.scaleY()) || 1)));
                return {
                    x: Number(img.x()) || 0,
                    y: Number(img.y()) || 0,
                    width: w,
                    height: h
                };
            }
        })();

        const startLeft = Number(s.startRectX) || 0;
        const startTop = Number(s.startRectY) || 0;
        const startRight = startLeft + (Number(s.startRectW) || Math.max(1, Math.abs(s.cropW * s.origScaleX)));
        const startBottom = startTop + (Number(s.startRectH) || Math.max(1, Math.abs(s.cropH * s.origScaleY)));
        const curLeft = Number(curRect.x) || startLeft;
        const curTop = Number(curRect.y) || startTop;
        const curRight = curLeft + (Number(curRect.width) || 0);
        const curBottom = curTop + (Number(curRect.height) || 0);
        const pointerStartX = Number(s.startPointerX);
        const pointerStartY = Number(s.startPointerY);
        const hasPointerDeltaX = !!(pointer && Number.isFinite(pointerStartX));
        const hasPointerDeltaY = !!(pointer && Number.isFinite(pointerStartY));
        const deltaDisplayX = hasPointerDeltaX ? (Number(pointer.x) - pointerStartX) : 0;
        const deltaDisplayY = hasPointerDeltaY ? (Number(pointer.y) - pointerStartY) : 0;

        let newCropX = s.cropX;
        let newCropY = s.cropY;
        let newCropW = s.cropW;
        let newCropH = s.cropH;
        let newX = s.origX;
        let newY = s.origY;

        // Reset transient transformer resize before applying our crop math.
        // This keeps crop stable on the first drag frame instead of mixing scale+crop.
        img.x(s.origX);
        img.y(s.origY);
        img.width(s.cropW);
        img.height(s.cropH);
        img.scaleX(s.origScaleX);
        img.scaleY(s.origScaleY);

        const affectsRight = anchor === 'middle-right' || anchor === 'top-right' || anchor === 'bottom-right';
        const affectsLeft = anchor === 'middle-left' || anchor === 'top-left' || anchor === 'bottom-left';
        const affectsBottom = anchor === 'bottom-center' || anchor === 'bottom-left' || anchor === 'bottom-right';
        const affectsTop = anchor === 'top-center' || anchor === 'top-left' || anchor === 'top-right';

        if (affectsRight) {
            const deltaCrop = hasPointerDeltaX
                ? (deltaDisplayX / s.origScaleX)
                : ((curRight - startRight) / s.origScaleX);
            newCropW = s.cropW + deltaCrop;
            if (newCropW < minCropW) newCropW = minCropW;
        }
        if (affectsLeft) {
            const deltaCrop = hasPointerDeltaX
                ? (deltaDisplayX / s.origScaleX)
                : ((curLeft - startLeft) / s.origScaleX);
            newCropX = s.cropX + deltaCrop;
            newCropW = s.cropW - deltaCrop;
            if (newCropW < minCropW) {
                newCropW = minCropW;
                newCropX = s.cropX + (s.cropW - newCropW);
            }
        }
        if (affectsBottom) {
            const deltaCrop = hasPointerDeltaY
                ? (deltaDisplayY / s.origScaleY)
                : ((curBottom - startBottom) / s.origScaleY);
            newCropH = s.cropH + deltaCrop;
            if (newCropH < minCropH) newCropH = minCropH;
        }
        if (affectsTop) {
            const deltaCrop = hasPointerDeltaY
                ? (deltaDisplayY / s.origScaleY)
                : ((curTop - startTop) / s.origScaleY);
            newCropY = s.cropY + deltaCrop;
            newCropH = s.cropH - deltaCrop;
            if (newCropH < minCropH) {
                newCropH = minCropH;
                newCropY = s.cropY + (s.cropH - newCropH);
            }
        }

        const clamped = clampCropRectToImage(newCropX, newCropY, newCropW, newCropH, s.imgW, s.imgH);
        newCropX = clamped.x;
        newCropY = clamped.y;
        newCropW = clamped.width;
        newCropH = clamped.height;

        // Kotwiczenie pozycji musi być liczone PO clampie, inaczej obraz "ucieka"
        // przy lewym/górnym uchwycie po dojściu do krawędzi bitmapy.
        if (affectsLeft) {
            newX = s.origX + (newCropX - s.cropX) * s.origScaleX;
        }
        if (affectsTop) {
            newY = s.origY + (newCropY - s.cropY) * s.origScaleY;
        }

        try {
            img.crop({ x: newCropX, y: newCropY, width: newCropW, height: newCropH });
            img.width(newCropW);
            img.height(newCropH);
            img.scaleX(s.origScaleX);
            img.scaleY(s.origScaleY);
            img.x(newX);
            img.y(newY);
            img.getLayer()?.batchDraw?.();
            page.transformer?.forceUpdate?.();
            page.transformerLayer?.batchDraw?.();
        } finally {
            img._cropApplying = false;
        }
    });

    img.on('transformend.crop', () => {
        const s = img._cropState;
        // Po zakończeniu wracamy do proporcjonalnego skalowania narożnikami.
        page.transformer.keepRatio(true);
        if (!s || !s.isCropping) return;
        if (img._cropVisualSyncRaf) {
            cancelAnimationFrame(img._cropVisualSyncRaf);
            img._cropVisualSyncRaf = 0;
        }
        img._cropVisualTick = 0;
        img.scaleX(s.origScaleX);
        img.scaleY(s.origScaleY);
        if (img.setAttr) {
            img.setAttr("_userCropTouched", true);
        }
        restoreImageShadowAfterCrop(img);
        refreshImageCacheAfterCrop(img);
        if (typeof syncBgBlur === "function") syncBgBlur(img);
        img.getLayer()?.batchDraw();
        page.transformer.forceUpdate && page.transformer.forceUpdate();
        page.transformerLayer.batchDraw();
        img._cropState = null;
    });

    return true;
}

function activateNewImageCropSelection(page, img, options = {}) {
    if (!page || !(img instanceof Konva.Image)) return false;
    if (typeof img.getLayer === "function" && img.getLayer() !== page.layer) return false;

    if (page._cropMode && page._cropTarget && page._cropTarget !== img) {
        try { disableCropMode(page); } catch (_e) {}
    }

    page.selectedNodes = [img];
    const shouldAutoCrop = options && Object.prototype.hasOwnProperty.call(options, "autoCrop")
        ? !!options.autoCrop
        : !!(
            img.getAttr &&
            !img.getAttr("isProductImage") &&
            (img.getAttr("isUserImage") || img.getAttr("isSidebarImage"))
        );
    if (shouldAutoCrop) {
        const cropEnabled = enableCropMode(page, img);
        if (!cropEnabled) {
            try { disableCropMode(page); } catch (_e) {}
            if (page.transformer && typeof page.transformer.nodes === "function") {
                try { page.transformer.nodes([img]); } catch (_e) {}
            }
        }
    } else {
        try { disableCropMode(page); } catch (_e) {}
        if (page.transformer && typeof page.transformer.nodes === "function") {
            try { page.transformer.nodes([img]); } catch (_e) {}
        }
    }
    if (typeof window.applyTransformerProfileForSelection === "function") {
        try { window.applyTransformerProfileForSelection(page); } catch (_e) {}
    } else {
        try { page.transformer?.forceUpdate?.(); } catch (_e) {}
    }

    try {
        const outlines = (page.layer && typeof page.layer.find === "function")
            ? page.layer.find(".selectionOutline")
            : [];
        if (Array.isArray(outlines) || (outlines && typeof outlines.forEach === "function")) {
            outlines.forEach((n) => { try { n.destroy(); } catch (_e) {} });
        }
    } catch (_e) {}

    try { page.layer?.batchDraw?.(); } catch (_e) {}
    try { page.transformerLayer?.batchDraw?.(); } catch (_e) {}

    return true;
}
window.activateNewImageCropSelection = activateNewImageCropSelection;

function getClientPointFromEvent(evt) {
    if (!evt) return null;
    const cx = Number(evt.clientX);
    const cy = Number(evt.clientY);
    if (Number.isFinite(cx) && Number.isFinite(cy)) return { x: cx, y: cy };
    const touch = (evt.changedTouches && evt.changedTouches[0]) || (evt.touches && evt.touches[0]) || null;
    if (!touch) return null;
    const tx = Number(touch.clientX);
    const ty = Number(touch.clientY);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null;
    return { x: tx, y: ty };
}

function findPageByClientPoint(clientX, clientY, excludePage) {
    const list = Array.isArray(pages) ? pages : [];
    for (let i = 0; i < list.length; i++) {
        const candidate = list[i];
        if (!candidate || candidate === excludePage) continue;
        const container = candidate.stage && candidate.stage.container ? candidate.stage.container() : null;
        if (!container || !container.getBoundingClientRect) continue;
        const rect = container.getBoundingClientRect();
        if (!rect || !(rect.width > 0) || !(rect.height > 0)) continue;
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            return candidate;
        }
    }
    return null;
}

function clientPointToStagePoint(targetPage, clientX, clientY) {
    if (!targetPage || !targetPage.stage || !targetPage.stage.container) return null;
    const container = targetPage.stage.container();
    if (!container || !container.getBoundingClientRect) return null;
    const rect = container.getBoundingClientRect();
    if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;
    const stageW = Number(targetPage.stage.width && targetPage.stage.width()) || 1;
    const stageH = Number(targetPage.stage.height && targetPage.stage.height()) || 1;
    return {
        x: ((clientX - rect.left) * stageW) / rect.width,
        y: ((clientY - rect.top) * stageH) / rect.height
    };
}

function isCrossPageMovableNode(node) {
    if (!node) return false;
    if (node.getAttr && (node.getAttr("isPageBg") || node.getAttr("isPriceHitArea") || node.getAttr("isFxHelper") || node.getAttr("isBgBlur"))) {
        return false;
    }
    if (typeof node.draggable === "function" && !node.draggable()) return false;
    return true;
}

window.transferDraggedSelectionAcrossPages = function({ sourcePage, dragNode, evt } = {}) {
    if (!sourcePage || !dragNode) return false;
    const clientPoint = getClientPointFromEvent(evt);
    if (!clientPoint) return false;

    const targetPage = findPageByClientPoint(clientPoint.x, clientPoint.y, sourcePage);
    if (!targetPage) return false;

    const normalizedSelected = normalizeSelection(Array.isArray(sourcePage.selectedNodes) ? sourcePage.selectedNodes : []);
    const movingNodesRaw = (normalizedSelected.length && normalizedSelected.includes(dragNode))
        ? normalizedSelected
        : [dragNode];
    const movingNodes = movingNodesRaw.filter((node) => isCrossPageMovableNode(node));
    if (!movingNodes.length) return false;

    const sourceStagePoint = clientPointToStagePoint(sourcePage, clientPoint.x, clientPoint.y);
    const targetStagePoint = clientPointToStagePoint(targetPage, clientPoint.x, clientPoint.y);
    if (!sourceStagePoint || !targetStagePoint) return false;

    const leader = movingNodes.includes(dragNode) ? dragNode : movingNodes[0];
    const leaderX = Number(leader.x && leader.x()) || 0;
    const leaderY = Number(leader.y && leader.y()) || 0;
    const pointerOffsetX = leaderX - sourceStagePoint.x;
    const pointerOffsetY = leaderY - sourceStagePoint.y;
    const targetLeaderX = targetStagePoint.x + pointerOffsetX;
    const targetLeaderY = targetStagePoint.y + pointerOffsetY;

    const relativeOffsets = new Map();
    movingNodes.forEach((node) => {
        const nx = Number(node.x && node.x()) || 0;
        const ny = Number(node.y && node.y()) || 0;
        relativeOffsets.set(node, {
            x: nx - leaderX,
            y: ny - leaderY
        });
    });

    if (typeof disableCropMode === "function" && sourcePage._cropTarget && movingNodes.includes(sourcePage._cropTarget)) {
        try { disableCropMode(sourcePage); } catch (_e) {}
    }

    movingNodes.forEach((node) => {
        try { clearCatalogSlotStateForNode(sourcePage, node); } catch (_e) {}
        if (node._bgBlurClone && !isNodeDestroyed(node._bgBlurClone)) {
            try { node._bgBlurClone.destroy(); } catch (_e) {}
            node._bgBlurClone = null;
        }
        const rel = relativeOffsets.get(node) || { x: 0, y: 0 };
        if (typeof node.moveTo === "function" && targetPage.layer) node.moveTo(targetPage.layer);
        if (typeof node.x === "function") node.x(targetLeaderX + rel.x);
        if (typeof node.y === "function") node.y(targetLeaderY + rel.y);
        if (typeof node.draggable === "function") node.draggable(true);
        if (typeof node.listening === "function") node.listening(true);
    });

    sourcePage.selectedNodes = normalizeSelection((Array.isArray(sourcePage.selectedNodes) ? sourcePage.selectedNodes : []).filter((node) => !movingNodes.includes(node)));
    if (sourcePage.transformer && typeof sourcePage.transformer.nodes === "function") {
        sourcePage.transformer.nodes(sourcePage.selectedNodes);
    }
    if (!sourcePage.selectedNodes.length && typeof disableCropMode === "function") {
        try { disableCropMode(sourcePage); } catch (_e) {}
    }

    targetPage.selectedNodes = normalizeSelection(movingNodes);
    if (typeof disableCropMode === "function") {
        try { disableCropMode(targetPage); } catch (_e) {}
    }
    if (targetPage.transformer && typeof targetPage.transformer.nodes === "function") {
        targetPage.transformer.nodes(targetPage.selectedNodes);
    }

    sourcePage.layer?.batchDraw?.();
    sourcePage.transformerLayer?.batchDraw?.();
    targetPage.layer?.batchDraw?.();
    targetPage.transformerLayer?.batchDraw?.();
    window.projectDirty = true;
    if (typeof window.showAppToast === "function") {
        window.showAppToast("Przeniesiono element na inną stronę.", "success");
    }
    return true;
};



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

let sharedTextMeasureProbe = null;
function getSharedTextMeasureProbe() {
    const probeDestroyed = !!(
        sharedTextMeasureProbe &&
        typeof sharedTextMeasureProbe.isDestroyed === "function" &&
        sharedTextMeasureProbe.isDestroyed()
    );
    if (!sharedTextMeasureProbe || probeDestroyed) {
        sharedTextMeasureProbe = new Konva.Text({
            listening: false,
            visible: false
        });
    }
    return sharedTextMeasureProbe;
}

function measureTextNodeWrappedLineCount(textNode, fallback = 1) {
    const safeFallback = Math.max(
        1,
        Number(fallback) || 1
    );
    if (!(textNode instanceof Konva.Text)) return safeFallback;
    try {
        const probe = getSharedTextMeasureProbe();
        probe.setAttrs({
            text: String(textNode.text && textNode.text() || ""),
            fontFamily: String(textNode.fontFamily && textNode.fontFamily() || "Arial"),
            fontSize: Math.max(1, Number(textNode.fontSize && textNode.fontSize()) || 12),
            fontStyle: String(textNode.fontStyle && textNode.fontStyle() || ""),
            textDecoration: String(textNode.textDecoration && textNode.textDecoration() || ""),
            lineHeight: Math.max(0.1, Number(textNode.lineHeight && textNode.lineHeight()) || 1),
            letterSpacing: Number(textNode.letterSpacing && textNode.letterSpacing()) || 0,
            wrap: String(textNode.wrap && textNode.wrap() || "word"),
            align: String(textNode.align && textNode.align() || "left"),
            width: Math.max(1, Number(textNode.width && textNode.width()) || 1),
            height: 100000,
            padding: Number(textNode.padding && textNode.padding()) || 0,
            stroke: String(textNode.stroke && textNode.stroke() || ""),
            strokeWidth: Number(textNode.strokeWidth && textNode.strokeWidth()) || 0,
            listening: false
        });
        probe.getClientRect();
        return Math.max(
            1,
            (Array.isArray(probe.textArr) ? probe.textArr.length : 0) || safeFallback
        );
    } catch (_e) {
        return safeFallback;
    }
}
window.measureTextNodeWrappedLineCount = measureTextNodeWrappedLineCount;

function getTextNodeAutoHeight(textNode, minHeight = 24) {
    if (!(textNode instanceof Konva.Text)) return minHeight;
    const fallbackLineCount = Array.isArray(textNode.textArr) && textNode.textArr.length
        ? textNode.textArr.length
        : Math.max(1, String(textNode.text() || "").split("\n").length);
    const fontSize = Math.max(
        1,
        Number(textNode.fontSize && textNode.fontSize()) || 12
    );
    const lineHeightFactor = Math.max(
        0.1,
        Number(textNode.lineHeight && textNode.lineHeight()) || 1
    );
    const fallbackTextHeight = Math.max(
        1,
        Number(textNode.textHeight || 0) || fontSize
    );

    const lineCount = measureTextNodeWrappedLineCount(textNode, fallbackLineCount);

    return Math.max(minHeight, Math.ceil(lineCount * fallbackTextHeight * lineHeightFactor));
}
window.getTextNodeAutoHeight = getTextNodeAutoHeight;

function getPreferredWrapModeForTextNode(textNode) {
    if (!(textNode instanceof Konva.Text)) return "word";
    if (textNode.getAttr && (
        textNode.getAttr("isSidebarText") ||
        textNode.getAttr("isIndex") ||
        textNode.getAttr("isCustomPackageInfo")
    )) {
        return "none";
    }
    const rawText = String((typeof textNode.text === "function" ? textNode.text() : "") || "");
    if (textNode.getAttr && textNode.getAttr("isUserText")) {
        return /\s/.test(rawText) ? "word" : "char";
    }
    return /\s/.test(rawText) ? "word" : "char";
}
window.getPreferredWrapModeForTextNode = getPreferredWrapModeForTextNode;

function createRotationLabel(layer) {
    const label = new Konva.Label({
        opacity: 0,
        visible: false,
        name: "rotationHelperLabel",
        isFxHelper: true
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

function createTransformSizeLabel(layer) {
    const label = new Konva.Label({
        opacity: 0,
        visible: false,
        name: "transformSizeHelperLabel",
        isFxHelper: true
    });
    const tag = new Konva.Tag({
        fill: "#111827",
        cornerRadius: 6,
        padding: 6
    });
    const text = new Konva.Text({
        text: "",
        fontSize: 14,
        fill: "white",
        fontFamily: "Arial"
    });
    label.add(tag);
    label.add(text);
    layer.add(label);
    return { label, text };
}

function getLiveNodeSizeLabel(node, layer) {
    if (!node) return "";
    let box = null;
    try {
        box = node.getClientRect({ relativeTo: layer });
    } catch (_e) {
        box = null;
    }

    const width = Math.max(
        1,
        Math.round(Number(box && box.width) || Math.abs((Number(node.width?.() || 1)) * (Number(node.scaleX?.() || 1))))
    );
    const height = Math.max(
        1,
        Math.round(Number(box && box.height) || Math.abs((Number(node.height?.() || 1)) * (Number(node.scaleY?.() || 1))))
    );

    return `${width} × ${height} px`;
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
        createPageThroughFactory(Math.floor(i / perPage) + 1, prods);
    }

    console.log("📄 Strony przebudowane. Layout:", window.LAYOUT_MODE);
};


const MM_TO_PX = 3.78;
const PAGE_MARGIN = 15 * MM_TO_PX;  // ~56.7px
const BOTTOM_MARGIN_TARGET = 18 * MM_TO_PX; // 18mm
const BOTTOM_MARGIN_DELTA = (28 + PAGE_MARGIN) - BOTTOM_MARGIN_TARGET;
const DEFAULT_PAGE_FORMAT = "A4";
const CUSTOM_PAGE_FORMAT = "CUSTOM";
const DEFAULT_PAGE_ORIENTATION = "portrait";
const PAGE_SIZE_MATCH_TOLERANCE = 1;
const PAGE_FORMAT_PRESETS_MM = Object.freeze({
    A6: {
        label: "A6",
        widthMm: 105,
        heightMm: 148,
        description: "Format pocztówkowy, często używany do małych ulotek."
    },
    A5: {
        label: "A5",
        widthMm: 148,
        heightMm: 210,
        description: "Mniejszy od A4, idealny do notatników, kalendarzy i broszur."
    },
    A4: {
        label: "A4",
        widthMm: 210,
        heightMm: 297,
        description: "Najpopularniejszy format biurowy do katalogów, ofert i materiałów informacyjnych."
    },
    A3: {
        label: "A3",
        widthMm: 297,
        heightMm: 420,
        description: "Większy od A4, używany w plakatach, wykresach i rysunkach technicznych."
    },
    A2: {
        label: "A2",
        widthMm: 420,
        heightMm: 594,
        description: "Duży format do plakatów, map i kalendarzy ściennych."
    },
    DL: {
        label: "DL",
        widthMm: 99,
        heightMm: 210,
        description: "Format do ulotek oraz kopert na złożoną na trzy kartkę A4."
    },
    LETTER: {
        label: "Letter",
        widthMm: 216,
        heightMm: 279,
        description: "Standard amerykański, często używany w dokumentach i ofertach."
    },
    LEGAL: {
        label: "Legal",
        widthMm: 216,
        heightMm: 356,
        description: "Dłuższy format do dokumentów formalnych i zestawień."
    }
});
const POPULAR_PAGE_FORMAT_KEYS = Object.freeze(["A5", "A3", "A6", "DL", "A2", "A4"]);

function normalizePageFormat(format) {
    const key = String(format || "").trim().toUpperCase();
    if (key === CUSTOM_PAGE_FORMAT) return CUSTOM_PAGE_FORMAT;
    if (key && PAGE_FORMAT_PRESETS_MM[key]) return key;
    return DEFAULT_PAGE_FORMAT;
}

function normalizePageOrientation(orientation) {
    const raw = String(orientation || "").trim().toLowerCase();
    if (raw === "landscape" || raw === "horizontal" || raw === "l") return "landscape";
    return "portrait";
}

function inferPageOrientationFromSize(width, height, fallback = DEFAULT_PAGE_ORIENTATION) {
    const w = Number(width);
    const h = Number(height);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        return w > h ? "landscape" : "portrait";
    }
    return normalizePageOrientation(fallback);
}

function isPageFormatMatch(width, height, formatKey) {
    const preset = PAGE_FORMAT_PRESETS_MM[formatKey];
    if (!preset) return false;
    const expectedW = Math.round(Number(preset.widthMm) * MM_TO_PX);
    const expectedH = Math.round(Number(preset.heightMm) * MM_TO_PX);
    return (
        Math.abs(Number(width) - expectedW) <= PAGE_SIZE_MATCH_TOLERANCE &&
        Math.abs(Number(height) - expectedH) <= PAGE_SIZE_MATCH_TOLERANCE
    );
}

function inferPageFormatFromCanvasSize(canvasWidth, canvasHeight, fallback = DEFAULT_PAGE_FORMAT) {
    const printW = Number(canvasWidth) - PAGE_MARGIN * 2;
    const printH = Number(canvasHeight) - PAGE_MARGIN * 2;
    if (!(Number.isFinite(printW) && Number.isFinite(printH) && printW > 0 && printH > 0)) {
        return normalizePageFormat(fallback);
    }
    const normalizedW = Math.min(printW, printH);
    const normalizedH = Math.max(printW, printH);
    const found = Object.keys(PAGE_FORMAT_PRESETS_MM).find((key) => isPageFormatMatch(normalizedW, normalizedH, key));
    if (found) return found;
    const fallbackKey = String(fallback || "").trim().toUpperCase();
    if (fallbackKey === CUSTOM_PAGE_FORMAT) return CUSTOM_PAGE_FORMAT;
    return CUSTOM_PAGE_FORMAT;
}

function getCanvasSizeForFormat(format, orientation) {
    const fmt = normalizePageFormat(format);
    const ori = normalizePageOrientation(orientation);
    const preset = PAGE_FORMAT_PRESETS_MM[fmt] || PAGE_FORMAT_PRESETS_MM[DEFAULT_PAGE_FORMAT];
    const basePortraitW = Math.round(Number(preset.widthMm || 0) * MM_TO_PX);
    const basePortraitH = Math.round(Number(preset.heightMm || 0) * MM_TO_PX);
    const printW = ori === "landscape" ? basePortraitH : basePortraitW;
    const printH = ori === "landscape" ? basePortraitW : basePortraitH;
    return {
        width: printW + PAGE_MARGIN * 2,
        height: printH + PAGE_MARGIN * 2
    };
}

function pxToMm(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return n / MM_TO_PX;
}

function pxFontToPt(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 12;
    return Math.max(1, n * 0.75);
}

function getPdfPageMetrics(page) {
    const stageWidthPx = Number(page?.stage?.width?.() || window.W || 0);
    const stageHeightPx = Number(page?.stage?.height?.() || window.H || 0);
    const orientation = normalizePageOrientation(
        window.CATALOG_PAGE_ORIENTATION || inferPageOrientationFromSize(stageWidthPx, stageHeightPx, DEFAULT_PAGE_ORIENTATION)
    );
    const format = normalizePageFormat(window.CATALOG_PAGE_FORMAT || DEFAULT_PAGE_FORMAT);
    let pageWidthMm = 0;
    let pageHeightMm = 0;

    if (format !== CUSTOM_PAGE_FORMAT && PAGE_FORMAT_PRESETS_MM[format]) {
        const preset = PAGE_FORMAT_PRESETS_MM[format];
        pageWidthMm = orientation === "landscape" ? Number(preset.heightMm) : Number(preset.widthMm);
        pageHeightMm = orientation === "landscape" ? Number(preset.widthMm) : Number(preset.heightMm);
    } else {
        const customPrintW = Number(window.CATALOG_CUSTOM_PRINT_WIDTH_PX);
        const customPrintH = Number(window.CATALOG_CUSTOM_PRINT_HEIGHT_PX);
        if (Number.isFinite(customPrintW) && customPrintW > 0 && Number.isFinite(customPrintH) && customPrintH > 0) {
            pageWidthMm = pxToMm(customPrintW);
            pageHeightMm = pxToMm(customPrintH);
        } else {
            pageWidthMm = pxToMm(stageWidthPx);
            pageHeightMm = pxToMm(stageHeightPx);
        }
    }

    const safePageWidthMm = Math.max(1, Number(pageWidthMm) || pxToMm(stageWidthPx) || 210);
    const safePageHeightMm = Math.max(1, Number(pageHeightMm) || pxToMm(stageHeightPx) || 297);
    const safeStageWidthPx = Math.max(1, stageWidthPx || window.W || 1);
    const safeStageHeightPx = Math.max(1, stageHeightPx || window.H || 1);
    const scaleX = safePageWidthMm / safeStageWidthPx;
    const scaleY = safePageHeightMm / safeStageHeightPx;

    return {
        pageWidthMm: safePageWidthMm,
        pageHeightMm: safePageHeightMm,
        orientation: safePageWidthMm > safePageHeightMm ? "l" : "p",
        scaleX,
        scaleY,
        x(px) { return Number(px || 0) * scaleX; },
        y(px) { return Number(px || 0) * scaleY; },
        w(px) { return Number(px || 0) * scaleX; },
        h(px) { return Number(px || 0) * scaleY; },
        font(ptPx) { return pxFontToPt(ptPx); }
    };
}

function setPageCssVars(widthPx) {
    const safeWidth = Number.isFinite(Number(widthPx)) ? Number(widthPx) : 980;
    document.documentElement.style.setProperty('--page-width', `${safeWidth}px`);
    document.documentElement.style.setProperty('--panel-center-offset', `0px`);
}
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

window.normalizeHexColor = normalizeHexColor;
window.getImageFxState = getImageFxState;
window.ensureImageFX = ensureImageFX;
window.applyImageFX = applyImageFX;

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

window.CATALOG_PAGE_FORMAT = normalizePageFormat(window.CATALOG_PAGE_FORMAT || DEFAULT_PAGE_FORMAT);
window.CATALOG_PAGE_ORIENTATION = normalizePageOrientation(window.CATALOG_PAGE_ORIENTATION || DEFAULT_PAGE_ORIENTATION);
const initialCanvasSize = getCanvasSizeForFormat(window.CATALOG_PAGE_FORMAT, window.CATALOG_PAGE_ORIENTATION);
window.W = initialCanvasSize.width;
window.H = initialCanvasSize.height;
setPageCssVars(window.W);

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

function getLayoutDefaultsByMode(layoutMode) {
    if (layoutMode === "layout8") return layout8Defaults;
    return layout6Defaults;
}

window.recomputeCatalogGridMetrics = function(layoutOverride) {
    const activeLayout = String(layoutOverride || window.LAYOUT_MODE || "layout6");
    const defaults = getLayoutDefaultsByMode(activeLayout);

    COLS = defaults.COLS;
    ROWS = defaults.ROWS;
    GAP = defaults.GAP;
    MT = defaults.MT;

    BW = (W - ML * 2 - GAP * (COLS - 1)) / COLS;
    BH = (H - MT - MB - GAP * (ROWS - 1)) / ROWS;
    BW_dynamic = BW * defaults.scaleBox;
    BH_dynamic = BH * defaults.scaleBox;

    return {
        layout: activeLayout,
        cols: COLS,
        rows: ROWS,
        gap: GAP,
        mt: MT,
        bw: BW,
        bh: BH,
        bwDynamic: BW_dynamic,
        bhDynamic: BH_dynamic
    };
};

window.getCatalogPageFormats = function() {
    const orderedKeys = Array.from(new Set([
        ...POPULAR_PAGE_FORMAT_KEYS,
        ...Object.keys(PAGE_FORMAT_PRESETS_MM)
    ])).filter((key) => !!PAGE_FORMAT_PRESETS_MM[key]);
    return orderedKeys.map((key) => {
        const preset = PAGE_FORMAT_PRESETS_MM[key];
        const baseLabel = String(preset?.label || key);
        const sizeLabel = Number.isFinite(Number(preset?.widthMm)) && Number.isFinite(Number(preset?.heightMm))
            ? `${Math.round(Number(preset.widthMm))} × ${Math.round(Number(preset.heightMm))} mm`
            : "";
        return {
            value: key,
            label: sizeLabel ? `${baseLabel} (${sizeLabel})` : baseLabel
        };
    });
};

function normalizePageUnit(unit) {
    const raw = String(unit || "").trim().toLowerCase();
    return raw === "px" ? "px" : "mm";
}

function pageUnitValueToPx(value, unit) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (normalizePageUnit(unit) === "px") return n;
    return n * MM_TO_PX;
}

function pagePxValueToUnit(pxValue, unit) {
    const n = Number(pxValue);
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (normalizePageUnit(unit) === "px") return n;
    return n / MM_TO_PX;
}

window.getCatalogPageSettings = function() {
    const width = Number(window.W) || 0;
    const height = Number(window.H) || 0;
    const orientation = normalizePageOrientation(
        window.CATALOG_PAGE_ORIENTATION || inferPageOrientationFromSize(width, height)
    );
    const format = normalizePageFormat(
        window.CATALOG_PAGE_FORMAT || inferPageFormatFromCanvasSize(width, height)
    );
    return {
        format,
        orientation,
        width,
        height,
        printWidthPx: Math.max(0, width - PAGE_MARGIN * 2),
        printHeightPx: Math.max(0, height - PAGE_MARGIN * 2)
    };
};

window.getPdfOrientationForCurrentCatalogPage = function() {
    const orientation = normalizePageOrientation(
        window.CATALOG_PAGE_ORIENTATION || inferPageOrientationFromSize(window.W, window.H)
    );
    return orientation === "landscape" ? "l" : "p";
};

function scaleNumberValue(input, factor, minValue = null) {
    const value = Number(input);
    const f = Number(factor);
    if (!Number.isFinite(value) || !Number.isFinite(f)) return input;
    const scaled = value * f;
    if (Number.isFinite(Number(minValue))) {
        return Math.max(Number(minValue), scaled);
    }
    return scaled;
}

function scaleAttrObjectForResize(attrs, scaleX, scaleY, textScale) {
    if (!attrs || typeof attrs !== "object") return;
    const uniform = Math.min(scaleX, scaleY);
    const scaleKey = (key, factor, minValue = null) => {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) return;
        const value = attrs[key];
        const n = Number(value);
        if (!Number.isFinite(n)) return;
        attrs[key] = scaleNumberValue(value, factor, minValue);
    };

    // Pozycje i offsety X/Y używane w direct module (price group / price rect)
    scaleKey("priceTextOffsetX", scaleX, 0);
    scaleKey("priceCircleLocalX", scaleX, 0);
    scaleKey("priceBgOffsetX", scaleX, 0);
    scaleKey("priceTextOffsetY", scaleY, 0);
    scaleKey("priceCircleLocalY", scaleY, 0);
    scaleKey("priceBgOffsetY", scaleY, 0);

    // Wymiary i rozmiary helperów ceny
    scaleKey("priceBgWidth", scaleX, 1);
    scaleKey("priceBgHeight", scaleY, 1);
    scaleKey("priceCircleSize", uniform, 1);

    // Typowe grubości / promienie
    scaleKey("strokeWidth", uniform, 0);
    scaleKey("shadowBlur", uniform, 0);
    scaleKey("shadowOffsetX", scaleX, 0);
    scaleKey("shadowOffsetY", scaleY, 0);
    if (Object.prototype.hasOwnProperty.call(attrs, "cornerRadius")) {
        if (Array.isArray(attrs.cornerRadius)) {
            attrs.cornerRadius = attrs.cornerRadius.map((item) => scaleNumberValue(item, uniform, 0));
        } else {
            attrs.cornerRadius = scaleNumberValue(attrs.cornerRadius, uniform, 0);
        }
    }

    // Gdy fontSize trafi do attrs (stare payloady), też skaluj.
    scaleKey("fontSize", textScale, 1);
}

function scaleDirectNodePayloadForResize(node, scaleX, scaleY, textScale) {
    if (!node || typeof node !== "object") return;

    node.x = scaleNumberValue(node.x, scaleX, 0);
    node.y = scaleNumberValue(node.y, scaleY, 0);

    if (node.type === "textNode") {
        node.width = scaleNumberValue(node.width, scaleX, 1);
        node.height = scaleNumberValue(node.height, scaleY, 1);
        node.fontSize = scaleNumberValue(node.fontSize, textScale, 1);
    } else if (node.type === "rectNode" || node.type === "imageNode") {
        node.width = scaleNumberValue(node.width, scaleX, 1);
        node.height = scaleNumberValue(node.height, scaleY, 1);
        node.strokeWidth = scaleNumberValue(node.strokeWidth, textScale, 0);
    }

    if (node.attrs && typeof node.attrs === "object") {
        scaleAttrObjectForResize(node.attrs, scaleX, scaleY, textScale);
    }

    if (Array.isArray(node.children) && node.children.length) {
        node.children.forEach((child) => scaleDirectNodePayloadForResize(child, scaleX, scaleY, textScale));
    }
}

function scaleSavedObjectForResize(obj, scaleX, scaleY, textScale) {
    if (!obj || typeof obj !== "object") return;

    if (obj.type === "background") return;
    if (obj.type === "directGroup" || obj.type === "directNode" || obj.type === "genericGroup") {
        if (obj.data && typeof obj.data === "object") {
            scaleDirectNodePayloadForResize(obj.data, scaleX, scaleY, textScale);
        }
        return;
    }

    obj.x = scaleNumberValue(obj.x, scaleX, 0);
    obj.y = scaleNumberValue(obj.y, scaleY, 0);

    if (obj.type === "text") {
        obj.width = scaleNumberValue(obj.width, scaleX, 1);
        obj.height = scaleNumberValue(obj.height, scaleY, 1);
        obj.fontSize = scaleNumberValue(obj.fontSize, textScale, 1);
        return;
    }

    if (obj.type === "image") {
        if (Number.isFinite(Number(obj.width)) && Number(obj.width) > 0) {
            obj.width = scaleNumberValue(obj.width, scaleX, 1);
        } else {
            obj.scaleX = scaleNumberValue(obj.scaleX, scaleX, 0.001);
        }
        if (Number.isFinite(Number(obj.height)) && Number(obj.height) > 0) {
            obj.height = scaleNumberValue(obj.height, scaleY, 1);
        } else {
            obj.scaleY = scaleNumberValue(obj.scaleY, scaleY, 0.001);
        }
        return;
    }

    if (obj.type === "barcode") {
        obj.scaleX = scaleNumberValue(obj.scaleX, scaleX, 0.001);
        obj.scaleY = scaleNumberValue(obj.scaleY, scaleY, 0.001);
        obj.width = scaleNumberValue(obj.width, scaleX, 1);
        obj.height = scaleNumberValue(obj.height, scaleY, 1);
        return;
    }

    if (obj.type === "priceGroup") {
        obj.scaleX = scaleNumberValue(obj.scaleX, scaleX, 0.001);
        obj.scaleY = scaleNumberValue(obj.scaleY, scaleY, 0.001);
        if (Array.isArray(obj.parts)) {
            obj.parts.forEach((part) => {
                if (!part || typeof part !== "object") return;
                part.x = scaleNumberValue(part.x, scaleX, 0);
                part.y = scaleNumberValue(part.y, scaleY, 0);
                part.width = scaleNumberValue(part.width, scaleX, 1);
                part.height = scaleNumberValue(part.height, scaleY, 1);
                part.fontSize = scaleNumberValue(part.fontSize, textScale, 1);
            });
        }
        return;
    }

    if (obj.type === "box") {
        obj.width = scaleNumberValue(obj.width, scaleX, 1);
        obj.height = scaleNumberValue(obj.height, scaleY, 1);
        obj.cornerRadius = scaleNumberValue(obj.cornerRadius, Math.min(scaleX, scaleY), 0);
        obj.strokeWidth = scaleNumberValue(obj.strokeWidth, Math.min(scaleX, scaleY), 0);
        obj.shadowBlur = scaleNumberValue(obj.shadowBlur, Math.min(scaleX, scaleY), 0);
        obj.shadowOffsetX = scaleNumberValue(obj.shadowOffsetX, scaleX, 0);
        obj.shadowOffsetY = scaleNumberValue(obj.shadowOffsetY, scaleY, 0);
    }
}

function scaleProjectSnapshotForResize(projectData, oldWidth, oldHeight, newWidth, newHeight) {
    const sourceW = Number(oldWidth);
    const sourceH = Number(oldHeight);
    const targetW = Number(newWidth);
    const targetH = Number(newHeight);
    if (!(Number.isFinite(sourceW) && sourceW > 0 && Number.isFinite(sourceH) && sourceH > 0)) return false;
    if (!(Number.isFinite(targetW) && targetW > 0 && Number.isFinite(targetH) && targetH > 0)) return false;
    const sx = targetW / sourceW;
    const sy = targetH / sourceH;
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx <= 0 || sy <= 0) return false;
    const textScale = Math.sqrt(sx * sy);
    if (Math.abs(1 - sx) < 0.0001 && Math.abs(1 - sy) < 0.0001) return false;

    const pagesList = Array.isArray(projectData?.pages) ? projectData.pages : [];
    pagesList.forEach((page) => {
        const objects = Array.isArray(page?.objects) ? page.objects : [];
        objects.forEach((obj) => scaleSavedObjectForResize(obj, sx, sy, textScale));
    });
    return true;
}

// === SKALA CENY (większa i proporcjonalna dla całej grupy ceny) ===
const PRICE_SIZE_MULTIPLIER_LAYOUT6 = 1.8;
const PRICE_SIZE_MULTIPLIER_LAYOUT8 = 1.15;

function resizeExistingPagesForCanvasSize() {
    const pagesList = Array.isArray(window.pages) ? window.pages : [];
    pagesList.forEach((page) => {
        if (!page || !page.stage || !page.container) return;
        const wrapper = page.container.querySelector('.canvas-wrapper');
        if (wrapper) {
            wrapper.style.width = `${W}px`;
            wrapper.style.height = `${H}px`;
        }
        const stageHost = page.stage && typeof page.stage.container === "function" ? page.stage.container() : null;
        if (stageHost) {
            stageHost.style.width = `${W}px`;
            stageHost.style.height = `${H}px`;
        }
        const overlay = page.container.querySelector('.grid-overlay');
        if (overlay) {
            overlay.style.width = `${W}px`;
            overlay.style.height = `${H}px`;
        }
        try {
            page.stage.width(W);
            page.stage.height(H);
        } catch (_e) {}
        try {
            const bg = page.layer?.findOne?.((n) => n.getAttr && n.getAttr("isPageBg"));
            if (bg) {
                bg.width(W);
                bg.height(H);
                const gradient = bg.getAttr && bg.getAttr("backgroundGradient");
                const imageSrc = bg.getAttr && bg.getAttr("backgroundImageSrc");
                if (gradient && typeof window.applySavedBackgroundGradient === "function") {
                    try { window.applySavedBackgroundGradient(page, gradient); } catch (_e) {}
                } else if (imageSrc && typeof window.applySavedBackgroundImage === "function") {
                    try { window.applySavedBackgroundImage(page, imageSrc); } catch (_e) {}
                }
            }
        } catch (_e) {}
        try { page.layer?.batchDraw?.(); } catch (_e) {}
        try { page.transformerLayer?.batchDraw?.(); } catch (_e) {}
        try { page.stage?.batchDraw?.(); } catch (_e) {}
    });
    queueCreateZoomSlider();
    queueRefreshPagesPerf();
}

window.setCatalogPageSettings = async function(nextSettings = {}, opts = {}) {
    const options = {
        rebuildExistingPages: opts.rebuildExistingPages !== false,
        resizeInPlaceWhenNoRebuild: opts.resizeInPlaceWhenNoRebuild !== false,
        silent: opts.silent === true
    };

    const explicitWidth = Number(nextSettings.width ?? nextSettings.pageWidth);
    const explicitHeight = Number(nextSettings.height ?? nextSettings.pageHeight);
    const hasExplicitSize = (
        Number.isFinite(explicitWidth) &&
        Number.isFinite(explicitHeight) &&
        explicitWidth > 100 &&
        explicitHeight > 100
    );

    let format = normalizePageFormat(nextSettings.format ?? nextSettings.pageFormat ?? window.CATALOG_PAGE_FORMAT);
    let orientation = normalizePageOrientation(nextSettings.orientation ?? nextSettings.pageOrientation ?? window.CATALOG_PAGE_ORIENTATION);
    let width = 0;
    let height = 0;

    if (hasExplicitSize) {
        width = explicitWidth;
        height = explicitHeight;
        orientation = inferPageOrientationFromSize(
            width,
            height,
            nextSettings.orientation ?? nextSettings.pageOrientation ?? orientation
        );
        if (!(nextSettings.format ?? nextSettings.pageFormat)) {
            format = inferPageFormatFromCanvasSize(width, height, format);
        }
    } else {
        const computed = getCanvasSizeForFormat(format, orientation);
        width = computed.width;
        height = computed.height;
    }

    const prev = window.getCatalogPageSettings ? window.getCatalogPageSettings() : {
        width: Number(window.W) || 0,
        height: Number(window.H) || 0,
        format: normalizePageFormat(window.CATALOG_PAGE_FORMAT || DEFAULT_PAGE_FORMAT),
        orientation: normalizePageOrientation(window.CATALOG_PAGE_ORIENTATION || DEFAULT_PAGE_ORIENTATION)
    };

    const changed = (
        Math.abs(Number(prev.width || 0) - Number(width || 0)) > 0.5 ||
        Math.abs(Number(prev.height || 0) - Number(height || 0)) > 0.5 ||
        String(prev.format || "") !== String(format || "") ||
        String(prev.orientation || "") !== String(orientation || "")
    );

    if (!changed) {
        if (!options.silent && typeof window.showAppToast === "function") {
            window.showAppToast("Format strony jest już ustawiony.", "info");
        }
        return false;
    }

    window.CATALOG_PAGE_FORMAT = format;
    window.CATALOG_PAGE_ORIENTATION = orientation;
    window.W = width;
    window.H = height;
    if (format === CUSTOM_PAGE_FORMAT) {
        window.CATALOG_CUSTOM_PRINT_WIDTH_PX = Math.max(0, width - PAGE_MARGIN * 2);
        window.CATALOG_CUSTOM_PRINT_HEIGHT_PX = Math.max(0, height - PAGE_MARGIN * 2);
    } else {
        window.CATALOG_CUSTOM_PRINT_WIDTH_PX = null;
        window.CATALOG_CUSTOM_PRINT_HEIGHT_PX = null;
    }
    try {
        W = width;
        H = height;
    } catch (_e) {}
    setPageCssVars(width);

    if (typeof window.recomputeCatalogGridMetrics === "function") {
        window.recomputeCatalogGridMetrics(window.LAYOUT_MODE || "layout6");
    }

    const hasPages = Array.isArray(window.pages) && window.pages.length > 0;
    if (!hasPages) {
        if (!options.silent && typeof window.showAppToast === "function") {
            window.showAppToast("Zmieniono format strony.", "success");
        }
        return true;
    }

    if (!options.rebuildExistingPages) {
        if (options.resizeInPlaceWhenNoRebuild) resizeExistingPagesForCanvasSize();
        if (!options.silent && typeof window.showAppToast === "function") {
            window.showAppToast("Zmieniono rozmiar roboczy strony.", "success");
        }
        return true;
    }

    const canRebuild = (
        typeof window.collectProjectData === "function" &&
        typeof window.loadProjectFromData === "function"
    );
    if (canRebuild) {
        let snapshot = null;
        try {
            snapshot = window.collectProjectData();
        } catch (_e) {
            snapshot = null;
        }
        if (snapshot && Array.isArray(snapshot.pages)) {
            scaleProjectSnapshotForResize(snapshot, prev.width, prev.height, width, height);
            snapshot.pageWidth = width;
            snapshot.pageHeight = height;
            snapshot.pageFormat = format;
            snapshot.pageOrientation = orientation;
            await window.loadProjectFromData(snapshot, {
                silent: true,
                lazyHydration: false,
                source: "page-settings"
            });
            if (!options.silent && typeof window.showAppToast === "function") {
                window.showAppToast("Zmieniono format i orientację stron.", "success");
            }
            return true;
        }
    }

    resizeExistingPagesForCanvasSize();
    if (!options.silent && typeof window.showAppToast === "function") {
        window.showAppToast("Zmieniono rozmiar stron (tryb uproszczony).", "info");
    }
    return true;
};

window.applyCatalogPageSettings = window.setCatalogPageSettings;

window.openProjectSizeDialog = function() {
    const current = window.getCatalogPageSettings ? window.getCatalogPageSettings() : {
        format: DEFAULT_PAGE_FORMAT,
        orientation: DEFAULT_PAGE_ORIENTATION,
        width: Number(window.W) || 0,
        height: Number(window.H) || 0,
        printWidthPx: Math.max(0, Number(window.W || 0) - PAGE_MARGIN * 2),
        printHeightPx: Math.max(0, Number(window.H || 0) - PAGE_MARGIN * 2)
    };
    const formats = window.getCatalogPageFormats ? window.getCatalogPageFormats() : [
        { value: "A4", label: "A4 (210 × 297 mm)" },
        { value: "A5", label: "A5 (148 × 210 mm)" },
        { value: "A3", label: "A3 (297 × 420 mm)" },
        { value: "A6", label: "A6 (105 × 148 mm)" },
        { value: "DL", label: "DL (99 × 210 mm)" },
        { value: "A2", label: "A2 (420 × 594 mm)" }
    ];
    const popularFormats = POPULAR_PAGE_FORMAT_KEYS
        .map((key) => {
            const preset = PAGE_FORMAT_PRESETS_MM[key];
            if (!preset) return null;
            return {
                key,
                label: String(preset.label || key),
                widthMm: Number(preset.widthMm) || 0,
                heightMm: Number(preset.heightMm) || 0,
                description: String(preset.description || "")
            };
        })
        .filter(Boolean);
    const popularCardsHtml = popularFormats.map((item) => `
        <button type="button" class="project-size-popular-card" data-format="${item.key}" aria-pressed="false">
            <span class="project-size-popular-card-check" aria-hidden="true">✓</span>
            <span class="project-size-popular-card-title">${item.label} (${item.widthMm} × ${item.heightMm} mm)</span>
            <span class="project-size-popular-card-desc">${item.description}</span>
        </button>
    `).join("");
    const currentIsCustom = String(current.format || "").toUpperCase() === CUSTOM_PAGE_FORMAT;
    const defaultUnit = normalizePageUnit(window.CATALOG_CUSTOM_SIZE_UNIT || "mm");
    const initialCustomPrintW = Number.isFinite(Number(window.CATALOG_CUSTOM_PRINT_WIDTH_PX))
        ? Number(window.CATALOG_CUSTOM_PRINT_WIDTH_PX)
        : Number(current.printWidthPx || 0);
    const initialCustomPrintH = Number.isFinite(Number(window.CATALOG_CUSTOM_PRINT_HEIGHT_PX))
        ? Number(window.CATALOG_CUSTOM_PRINT_HEIGHT_PX)
        : Number(current.printHeightPx || 0);

    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000002;
    `;

    const pagesCount = Array.isArray(window.pages) ? window.pages.length : 0;
    const card = document.createElement("div");
    card.className = "project-size-dialog";
    card.style.cssText = `
        width: 760px;
        max-width: 96vw;
        max-height: 92vh;
        overflow-y: auto;
        background: linear-gradient(180deg,#0d1320 0%,#09101a 100%);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 28px 64px rgba(0,0,0,0.42);
        font-family: Inter, Arial, sans-serif;
    `;
    card.innerHTML = `
        <style>
            .project-size-dialog .project-size-popular-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
                margin-bottom: 12px;
            }
            .project-size-dialog .project-size-popular-card {
                width: 100%;
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: 10px;
                background: rgba(255,255,255,0.04);
                padding: 10px;
                text-align: left;
                cursor: pointer;
                transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .project-size-dialog .project-size-popular-card:hover {
                border-color: rgba(216,255,31,0.68);
                box-shadow: 0 6px 16px rgba(24, 200, 187, 0.16);
                transform: translateY(-1px);
            }
            .project-size-dialog .project-size-popular-card.is-selected {
                border-color: rgba(216,255,31,0.68);
                background: rgba(216,255,31,0.14);
                box-shadow: 0 8px 20px rgba(24, 200, 187, 0.18);
            }
            .project-size-dialog .project-size-popular-card.is-disabled {
                cursor: not-allowed;
                opacity: 0.58;
                box-shadow: none;
                transform: none;
            }
            .project-size-dialog .project-size-popular-card-check {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 20px;
                height: 20px;
                border-radius: 999px;
                background: #d8ff1f;
                color: #081014;
                font-weight: 700;
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transform: scale(0.7);
                transition: opacity 0.16s ease, transform 0.16s ease;
            }
            .project-size-dialog .project-size-popular-card.is-selected .project-size-popular-card-check {
                opacity: 1;
                transform: scale(1);
            }
            .project-size-dialog .project-size-popular-card-title {
                font-size: 13px;
                font-weight: 700;
                color: #f5f7fb;
                line-height: 1.25;
                padding-right: 20px;
            }
            .project-size-dialog .project-size-popular-card-desc {
                font-size: 12px;
                color: #a6b0c4;
                line-height: 1.35;
            }
            .project-size-dialog .project-size-mode-row {
                display: flex;
                gap: 10px;
                margin-bottom: 12px;
            }
            @media (max-width: 860px) {
                .project-size-dialog .project-size-popular-grid {
                    grid-template-columns: 1fr;
                }
                .project-size-dialog .project-size-mode-row {
                    flex-direction: column;
                }
            }
        </style>

        <h3 style="margin:0 0 10px 0;font-size:28px;font-weight:800;color:#f5f7fb;">Rozmiar projektu</h3>
        <div style="font-size:13px;color:#a6b0c4;margin-bottom:16px;">
            Wybierz gotowy format albo wpisz własny rozmiar strony.
        </div>

        <div class="project-size-mode-row">
            <label class="project-size-mode-option" style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;cursor:pointer;transition:border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, opacity 0.16s ease;background:rgba(255,255,255,0.04);color:#f5f7fb;">
                <input type="radio" name="projectSizeMode" value="standard">
                <span>Format standardowy</span>
            </label>
            <label class="project-size-mode-option" style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;cursor:pointer;transition:border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, opacity 0.16s ease;background:rgba(255,255,255,0.04);color:#f5f7fb;">
                <input type="radio" name="projectSizeMode" value="custom">
                <span>Rozmiar niestandardowy</span>
            </label>
        </div>

        <div id="projectSizeStandardBox" style="border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:12px;margin-bottom:14px;background:rgba(255,255,255,0.03);">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px;">
                <label style="display:block;font-size:13px;font-weight:700;margin:0;color:#f5f7fb;">Najpopularniejsze rozmiary</label>
                <span style="font-size:11px;color:#8f9bb2;">Kliknij kafelek, aby wybrać</span>
            </div>
            <div id="projectSizePopularGrid" class="project-size-popular-grid">
                ${popularCardsHtml}
            </div>

            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#d8deec;">Format (pełna lista)</label>
            <select id="projectSizeFormatSelect" style="width:100%;padding:11px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;margin-bottom:10px;background:rgba(255,255,255,0.05);color:#f5f7fb;">
                ${formats.map((item) => `<option value="${item.value}">${item.label}</option>`).join("")}
            </select>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#d8deec;">Orientacja</label>
            <div style="display:flex;gap:10px;">
                <label class="project-size-orientation-option" style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;cursor:pointer;transition:border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, opacity 0.16s ease;background:rgba(255,255,255,0.04);color:#f5f7fb;">
                    <input type="radio" name="projectSizeOrientation" value="portrait">
                    <span>Pion</span>
                </label>
                <label class="project-size-orientation-option" style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;cursor:pointer;transition:border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, opacity 0.16s ease;background:rgba(255,255,255,0.04);color:#f5f7fb;">
                    <input type="radio" name="projectSizeOrientation" value="landscape">
                    <span>Poziom</span>
                </label>
            </div>
        </div>

        <div id="projectSizeCustomBox" style="border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:12px;margin-bottom:14px;background:rgba(255,255,255,0.03);">
            <div style="display:flex;gap:8px;align-items:end;">
                <div style="flex:1;">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#d8deec;">Szerokość</label>
                    <input id="projectCustomWidthInput" type="number" step="0.1" min="1" style="width:100%;padding:11px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;background:rgba(255,255,255,0.05);color:#f5f7fb;">
                </div>
                <div style="flex:1;">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#d8deec;">Wysokość</label>
                    <input id="projectCustomHeightInput" type="number" step="0.1" min="1" style="width:100%;padding:11px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;background:rgba(255,255,255,0.05);color:#f5f7fb;">
                </div>
                <div style="width:90px;">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#d8deec;">Jedn.</label>
                    <select id="projectCustomUnitSelect" style="width:100%;padding:11px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;background:rgba(255,255,255,0.05);color:#f5f7fb;">
                        <option value="mm">mm</option>
                        <option value="px">px</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                <button id="projectCustomSwapBtn" type="button" style="padding:9px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;background:rgba(255,255,255,0.05);color:#f5f7fb;cursor:pointer;font-weight:700;">Zamień W/H</button>
            </div>
        </div>

        <div id="projectSizePreviewHint" style="font-size:12px;color:#d8deec;margin-bottom:10px;"></div>
        <div style="font-size:12px;color:#8f9bb2;margin-bottom:14px;">
            ${pagesCount > 0 ? `Zmiana przeskaluje i przebuduje ${pagesCount} ${pagesCount === 1 ? "stronę" : "strony"} projektu.` : "Ustawienie będzie użyte dla nowo tworzonych stron."}
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button id="projectSizeCancelBtn" style="padding:11px 16px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;background:rgba(255,255,255,0.05);color:#f5f7fb;cursor:pointer;font-weight:700;">Anuluj</button>
            <button id="projectSizeApplyBtn" style="padding:11px 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#18c8bb 0%,#31c6c8 100%);color:#071015;cursor:pointer;font-weight:800;box-shadow:0 12px 28px rgba(24,200,187,.22);">Zastosuj</button>
        </div>
    `;
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const close = () => {
        overlay.remove();
        document.removeEventListener("keydown", onEsc, true);
    };
    const onEsc = (e) => {
        if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onEsc, true);

    const modeRadios = Array.from(card.querySelectorAll('input[name="projectSizeMode"]'));
    const formatSelect = card.querySelector("#projectSizeFormatSelect");
    const orientationRadios = Array.from(card.querySelectorAll('input[name="projectSizeOrientation"]'));
    const customWidthInput = card.querySelector("#projectCustomWidthInput");
    const customHeightInput = card.querySelector("#projectCustomHeightInput");
    const customUnitSelect = card.querySelector("#projectCustomUnitSelect");
    const customSwapBtn = card.querySelector("#projectCustomSwapBtn");
    const standardBox = card.querySelector("#projectSizeStandardBox");
    const customBox = card.querySelector("#projectSizeCustomBox");
    const previewHint = card.querySelector("#projectSizePreviewHint");
    const popularFormatCards = Array.from(card.querySelectorAll(".project-size-popular-card"));
    const modeOptionLabels = Array.from(card.querySelectorAll(".project-size-mode-option"));
    const orientationOptionLabels = Array.from(card.querySelectorAll(".project-size-orientation-option"));
    const cancelBtn = card.querySelector("#projectSizeCancelBtn");
    const applyBtn = card.querySelector("#projectSizeApplyBtn");

    const applyOptionVisualState = (labelEl, selected, disabled) => {
        if (!labelEl) return;
        labelEl.style.borderColor = selected ? "#2563eb" : "#d1d5db";
        labelEl.style.background = selected ? "rgba(37,99,235,0.08)" : "#ffffff";
        labelEl.style.boxShadow = selected ? "0 0 0 2px rgba(37,99,235,0.14) inset" : "none";
        labelEl.style.opacity = disabled ? "0.58" : "1";
        labelEl.style.cursor = disabled ? "not-allowed" : "pointer";
    };

    const syncModeOptionState = () => {
        const selectedMode = modeRadios.find((radio) => radio.checked)?.value || "standard";
        modeOptionLabels.forEach((labelEl) => {
            const input = labelEl.querySelector('input[name="projectSizeMode"]');
            const selected = !!input && input.value === selectedMode;
            const disabled = !!(input && input.disabled);
            applyOptionVisualState(labelEl, selected, disabled);
        });
    };

    const syncOrientationOptionState = () => {
        const selectedOrientation = normalizePageOrientation(
            orientationRadios.find((radio) => radio.checked)?.value || current.orientation
        );
        orientationOptionLabels.forEach((labelEl) => {
            const input = labelEl.querySelector('input[name="projectSizeOrientation"]');
            const selected = !!input && normalizePageOrientation(input.value) === selectedOrientation;
            const disabled = !!(input && input.disabled);
            applyOptionVisualState(labelEl, selected, disabled);
        });
    };

    const syncPopularCardsState = () => {
        const selectedFormat = normalizePageFormat(formatSelect?.value || current.format);
        popularFormatCards.forEach((btn) => {
            const formatKey = normalizePageFormat(btn.dataset.format || "");
            const selected = formatKey === selectedFormat;
            btn.classList.toggle("is-selected", selected);
            btn.setAttribute("aria-pressed", selected ? "true" : "false");
        });
    };

    const setMode = (mode) => {
        const safeMode = mode === "custom" ? "custom" : "standard";
        modeRadios.forEach((radio) => { radio.checked = radio.value === safeMode; });
        if (standardBox) standardBox.style.opacity = safeMode === "standard" ? "1" : "0.62";
        if (customBox) customBox.style.opacity = safeMode === "custom" ? "1" : "0.62";
        if (formatSelect) formatSelect.disabled = safeMode !== "standard";
        orientationRadios.forEach((radio) => { radio.disabled = safeMode !== "standard"; });
        if (customWidthInput) customWidthInput.disabled = safeMode !== "custom";
        if (customHeightInput) customHeightInput.disabled = safeMode !== "custom";
        if (customUnitSelect) customUnitSelect.disabled = safeMode !== "custom";
        if (customSwapBtn) customSwapBtn.disabled = safeMode !== "custom";
        popularFormatCards.forEach((btn) => {
            const disabled = safeMode !== "standard";
            btn.disabled = disabled;
            btn.classList.toggle("is-disabled", disabled);
        });
        syncModeOptionState();
        syncOrientationOptionState();
        refreshPreviewHint();
    };

    const readStandardOrientation = () => normalizePageOrientation(
        orientationRadios.find((r) => r.checked)?.value || current.orientation
    );

    const readCustomCanvasSize = () => {
        const unit = normalizePageUnit(customUnitSelect?.value || defaultUnit);
        const wRaw = Number(customWidthInput?.value);
        const hRaw = Number(customHeightInput?.value);
        const printW = pageUnitValueToPx(wRaw, unit);
        const printH = pageUnitValueToPx(hRaw, unit);
        if (!(Number.isFinite(printW) && printW > 0 && Number.isFinite(printH) && printH > 0)) return null;
        return {
            unit,
            printW,
            printH,
            canvasW: printW + PAGE_MARGIN * 2,
            canvasH: printH + PAGE_MARGIN * 2
        };
    };

    const refreshPreviewHint = () => {
        if (!previewHint) return;
        const mode = modeRadios.find((r) => r.checked)?.value || "standard";
        if (mode === "custom") {
            const customSize = readCustomCanvasSize();
            if (!customSize) {
                previewHint.textContent = "Podaj poprawny niestandardowy rozmiar.";
                return;
            }
            const orientation = inferPageOrientationFromSize(customSize.canvasW, customSize.canvasH, "portrait");
            previewHint.textContent =
                `Rozmiar roboczy: ${Math.round(customSize.canvasW)} × ${Math.round(customSize.canvasH)} px (${orientation === "landscape" ? "poziom" : "pion"})`;
            return;
        }
        const orientation = readStandardOrientation();
        const format = normalizePageFormat(formatSelect?.value || current.format);
        const computed = getCanvasSizeForFormat(format, orientation);
        const preset = PAGE_FORMAT_PRESETS_MM[format];
        const label = String(preset?.label || format);
        const mmInfo = preset ? `${Math.round(Number(preset.widthMm))} × ${Math.round(Number(preset.heightMm))} mm` : "";
        previewHint.textContent = `${label}${mmInfo ? ` (${mmInfo})` : ""} • rozmiar roboczy: ${Math.round(computed.width)} × ${Math.round(computed.height)} px (${orientation === "landscape" ? "poziom" : "pion"})`;
    };

    if (formatSelect) {
        const normalizedCurrentFormat = normalizePageFormat(current.format);
        if (normalizedCurrentFormat !== CUSTOM_PAGE_FORMAT) {
            formatSelect.value = normalizedCurrentFormat;
        } else {
            formatSelect.value = DEFAULT_PAGE_FORMAT;
        }
    }
    const currentOrientation = normalizePageOrientation(current.orientation);
    orientationRadios.forEach((radio) => { radio.checked = radio.value === currentOrientation; });

    if (customUnitSelect) customUnitSelect.value = defaultUnit;
    if (customWidthInput) {
        const customWUnit = pagePxValueToUnit(initialCustomPrintW || current.printWidthPx, defaultUnit);
        customWidthInput.value = customWUnit > 0 ? (Math.round(customWUnit * 100) / 100) : "";
    }
    if (customHeightInput) {
        const customHUnit = pagePxValueToUnit(initialCustomPrintH || current.printHeightPx, defaultUnit);
        customHeightInput.value = customHUnit > 0 ? (Math.round(customHUnit * 100) / 100) : "";
    }

    popularFormatCards.forEach((btn) => {
        btn.addEventListener("click", () => {
            const selectedFormat = normalizePageFormat(btn.dataset.format || DEFAULT_PAGE_FORMAT);
            if (formatSelect) formatSelect.value = selectedFormat;
            setMode("standard");
            syncPopularCardsState();
            refreshPreviewHint();
        });
    });
    syncPopularCardsState();
    setMode(currentIsCustom ? "custom" : "standard");

    modeRadios.forEach((radio) => {
        radio.addEventListener("change", () => setMode(radio.value));
    });
    if (formatSelect) {
        formatSelect.addEventListener("change", () => {
            syncPopularCardsState();
            refreshPreviewHint();
        });
    }
    orientationRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            syncOrientationOptionState();
            refreshPreviewHint();
        });
    });
    if (customWidthInput) customWidthInput.addEventListener("input", refreshPreviewHint);
    if (customHeightInput) customHeightInput.addEventListener("input", refreshPreviewHint);
    if (customUnitSelect) customUnitSelect.addEventListener("change", refreshPreviewHint);
    if (customSwapBtn) {
        customSwapBtn.onclick = () => {
            if (!customWidthInput || !customHeightInput) return;
            const oldW = customWidthInput.value;
            customWidthInput.value = customHeightInput.value;
            customHeightInput.value = oldW;
            refreshPreviewHint();
        };
    }

    if (cancelBtn) cancelBtn.onclick = close;
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    if (applyBtn) {
        applyBtn.onclick = async () => {
            const mode = modeRadios.find((r) => r.checked)?.value || "standard";
            applyBtn.disabled = true;
            if (typeof window.showBusyOverlay === "function") {
                window.showBusyOverlay("Zmiana rozmiaru projektu…");
            }
            try {
                if (mode === "custom") {
                    const customSize = readCustomCanvasSize();
                    if (!customSize) {
                        if (typeof window.showAppToast === "function") {
                            window.showAppToast("Podaj poprawny niestandardowy rozmiar.", "error");
                        }
                        applyBtn.disabled = false;
                        return;
                    }
                    const minCanvasEdge = 180;
                    if (customSize.canvasW < minCanvasEdge || customSize.canvasH < minCanvasEdge) {
                        if (typeof window.showAppToast === "function") {
                            window.showAppToast("Rozmiar jest zbyt mały.", "error");
                        }
                        applyBtn.disabled = false;
                        return;
                    }
                    window.CATALOG_CUSTOM_SIZE_UNIT = customSize.unit;
                    await window.setCatalogPageSettings(
                        {
                            format: CUSTOM_PAGE_FORMAT,
                            orientation: inferPageOrientationFromSize(customSize.canvasW, customSize.canvasH, currentOrientation),
                            width: customSize.canvasW,
                            height: customSize.canvasH
                        },
                        {
                            rebuildExistingPages: true
                        }
                    );
                } else {
                    const selectedOrientation = readStandardOrientation();
                    await window.setCatalogPageSettings(
                        {
                            format: formatSelect ? formatSelect.value : DEFAULT_PAGE_FORMAT,
                            orientation: selectedOrientation
                        },
                        {
                            rebuildExistingPages: true
                        }
                    );
                }
                close();
            } catch (_err) {
                if (typeof window.showAppToast === "function") {
                    window.showAppToast("Nie udało się zmienić rozmiaru projektu.", "error");
                }
                applyBtn.disabled = false;
            } finally {
                if (typeof window.hideBusyOverlay === "function") {
                    window.hideBusyOverlay();
                }
            }
        };
    }
};

window.openCatalogPageSettingsDialog = window.openProjectSizeDialog;

function bindProjectSizeButton() {
    const btn = document.getElementById("projectSizeBtn");
    if (!btn || btn.dataset.projectSizeBound === "1") return;
    btn.dataset.projectSizeBound = "1";
    btn.addEventListener("click", () => {
        if (typeof window.openProjectSizeDialog === "function") {
            window.openProjectSizeDialog();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindProjectSizeButton);
} else {
    bindProjectSizeButton();
}


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
            background: rgba(10,14,22,0.94);
            border-top: 1px solid rgba(255,255,255,0.08);
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 0 18px;
            z-index: 100000;
            backdrop-filter: blur(10px);
            pointer-events: auto;
        `;
        document.body.appendChild(footer);
    }

    const slider = document.createElement('div');
    slider.id = 'zoomSlider';
    slider.style.cssText = `
        background: rgba(18,25,39,0.96);
        padding: 6px 10px;
        border-radius: 999px;
        box-shadow: 0 10px 24px rgba(0,0,0,0.32);
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: Arial;
        border: 1px solid rgba(255,255,255,0.08);
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
        border: 1px solid rgba(255,255,255,0.08);
        color: #d8e0ee;
        background: rgba(255,255,255,0.05);
        font-size: 20px;
        line-height: 1;
        font-weight: 700;
        cursor: pointer;
      }
      #appFooterBar .zoom-btn:hover{
        background: rgba(39,203,173,0.14);
        border-color: rgba(39,203,173,0.32);
        color: #8df5e2;
      }
      #appFooterBar .zoom-btn:active{
        transform: translateY(1px);
      }
      #appFooterBar .zoom-range{
        width: 150px;
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(90deg, #27cbad 0%, rgba(255,255,255,0.16) 0%);
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
        background: #27cbad;
        border: 2px solid #0b111b;
        box-shadow: 0 1px 6px rgba(0,0,0,0.35);
      }
      #appFooterBar .zoom-range::-moz-range-thumb{
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: #27cbad;
        border: 2px solid #0b111b;
        box-shadow: 0 1px 6px rgba(0,0,0,0.35);
      }
      #appFooterBar .zoom-val{
        font-weight: 700;
        color: #f4f7fb;
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
        queueCreateZoomSlider();
        window.dispatchEvent(new Event('excelImported'));

    } catch (e) {
        alert('Błąd: ' + e.message);
    }
};

// === TWORZENIE STRONY + KONVA + TRANSFORMER + MULTI-SELECT + WŁASNE SKALOWANIE ===
function buildPageShellLocal(n) {
    const div = document.createElement('div');
    div.className = 'page-container';
    div.style.position = 'relative';
    div.innerHTML = `
  <div class="page-toolbar">
      <span class="page-title">Page ${n}</span>

      <div class="page-tools">
<button class="page-btn magic-layout" data-tip="Magiczny uklad"><i class="fas fa-wand-magic-sparkles"></i></button>
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
    return div;
}

function buildPageShellThroughFactory(n) {
    if (window.PageFactory && typeof window.PageFactory.buildPageShell === "function") {
        const div = window.PageFactory.buildPageShell({
            number: n,
            width: W,
            height: H,
            pagesContainerId: "pagesContainer"
        });
        if (div instanceof HTMLElement) return div;
    }
    return buildPageShellLocal(n);
}

function createStageLayersLocal(n) {
    const stage = new Konva.Stage({
        container: `k${n}`,
        width: W,
        height: H
    });
    const layer = new Konva.Layer();
    stage.add(layer);
    const transformerLayer = new Konva.Layer();
    stage.add(transformerLayer);
    return { stage, layer, transformerLayer };
}

function createStageLayersThroughFactory(n) {
    if (window.PageFactory && typeof window.PageFactory.createStageLayers === "function") {
        const result = window.PageFactory.createStageLayers({
            number: n,
            width: W,
            height: H,
            KonvaRef: Konva
        });
        if (result && result.stage && result.layer && result.transformerLayer) return result;
    }
    return createStageLayersLocal(n);
}

function createPageBackgroundLocal(layer, getPage) {
    const bgRect = new Konva.Rect({
        x: 0,
        y: 0,
        width: W,
        height: H,
        fill: "#ffffff",
        listening: true
    });

    bgRect.setAttr("isPageBg", true);
    layer.add(bgRect);
    bgRect.moveToBottom();
    bgRect.setZIndex(0);
    bgRect.draggable(false);
    bgRect.listening(true);
    bgRect.name("pageBackground");
    bgRect.setAttr("selectable", false);

    bgRect.on('mousedown', () => {
        const page = typeof getPage === "function" ? getPage() : null;
        if (!page || window.globalPasteMode) return;
        document.activeStage = page.stage;
    });
    bgRect.on('transformstart', (e) => e.cancelBubble = true);
    bgRect.on('transform', (e) => e.cancelBubble = true);
    bgRect.on('transformend', (e) => e.cancelBubble = true);
    bgRect.on('dblclick dbltap', (e) => {
        e.cancelBubble = true;
    });

    return bgRect;
}

function createPageBackgroundThroughFactory(layer, getPage) {
    if (window.PageFactory && typeof window.PageFactory.createPageBackground === "function") {
        const bgRect = window.PageFactory.createPageBackground({
            layer,
            width: W,
            height: H,
            KonvaRef: Konva,
            getPage,
            onBackgroundPointerDown: (page) => {
                if (!page || window.globalPasteMode) return;
                document.activeStage = page.stage;
            }
        });
        if (bgRect) return bgRect;
    }
    return createPageBackgroundLocal(layer, getPage);
}

function createBasePageObjectLocal({ n, prods, stage, layer, transformerLayer, div, tr }) {
    return {
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
}

function createBasePageObjectThroughFactory({ n, prods, stage, layer, transformerLayer, div, tr }) {
    if (window.PageFactory && typeof window.PageFactory.createBasePageObject === "function") {
        const page = window.PageFactory.createBasePageObject({
            number: n,
            products: prods,
            stage,
            layer,
            transformerLayer,
            container: div,
            transformer: tr,
            layoutMode: window.LAYOUT_MODE,
            priceSizeMultiplierLayout6: PRICE_SIZE_MULTIPLIER_LAYOUT6,
            priceSizeMultiplierLayout8: PRICE_SIZE_MULTIPLIER_LAYOUT8
        });
        if (page && typeof page === "object") return page;
    }
    return createBasePageObjectLocal({ n, prods, stage, layer, transformerLayer, div, tr });
}

function createTransformerLocal(stage, transformerLayer, getPage) {
    let tr = null;
    tr = new Konva.Transformer({
        hitStrokeWidth: 20,
        padding: 6,

        enabledAnchors: [
            'top-left', 'top-center', 'top-right',
            'middle-left', 'middle-right',
            'bottom-left', 'bottom-center', 'bottom-right'
        ],

        rotateEnabled: true,
        keepRatio: true,
        rotationSnaps: [0, 90, 180, 270],
        rotationSnapTolerance: 5,
        rotateAnchorOffset: TRANSFORMER_ROTATE_OFFSET_DEFAULT,
        borderStroke: '#007cba',
        borderStrokeWidth: 2,
        anchorStroke: '#007cba',
        anchorFill: '#ffffff',
        anchorSize: TRANSFORMER_ANCHOR_SIZE_DEFAULT,
        padding: TRANSFORMER_PADDING_DEFAULT,

        boundBoxFunc: (oldBox, newBox) => {
            const selected = (tr && typeof tr.nodes === "function") ? (tr.nodes() || []) : [];
            const single = selected.length === 1 ? selected[0] : null;
            const isLineLikeSelection = isLineLikeTransformerNode(single);
            const meetsMinSize = (box) => {
                const width = Math.abs(Number(box && box.width) || 0);
                const height = Math.abs(Number(box && box.height) || 0);
                return isLineLikeSelection
                    ? Math.max(width, height) >= 12
                    : width >= 20 && height >= 20;
            };
            if (!meetsMinSize(newBox)) return oldBox;
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
            if (!meetsMinSize(next)) return oldBox;
            return next;
        }
    });

    tr.anchorDragBoundFunc(function(oldPos, newPos) {
        const anchor = tr.getActiveAnchor();
        const selectedNodes = (tr && typeof tr.nodes === "function") ? (tr.nodes() || []) : [];
        const isSingleImageSelection = selectedNodes.length === 1 && selectedNodes[0] instanceof Konva.Image;
        const singleSelectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
        const isLineLikeSelection = isLineLikeTransformerNode(singleSelectedNode);
        const isSingleUserTextSelection = !!(
            singleSelectedNode instanceof Konva.Text &&
            singleSelectedNode.getAttr &&
            singleSelectedNode.getAttr("isUserText")
        );

        if (isSingleImageSelection) {
            const img = selectedNodes[0];
            const page = typeof getPage === "function" ? getPage() : null;
            const cropActive = !!(page && page._cropMode && page._cropTarget === img);
            if (!cropActive) return newPos;
            if (anchor === 'middle-left' || anchor === 'middle-right') {
                return { x: newPos.x, y: oldPos.y };
            }
            if (anchor === 'top-center' || anchor === 'bottom-center') {
                return { x: oldPos.x, y: newPos.y };
            }
            return newPos;
        }

        if (isLineLikeSelection) {
            return newPos;
        }

        if (
            anchor === 'top-left' ||
            anchor === 'top-right' ||
            anchor === 'bottom-left' ||
            anchor === 'bottom-right'
        ) {
            return newPos;
        }

        if (anchor === 'middle-left' || anchor === 'middle-right') {
            return {
                x: newPos.x,
                y: oldPos.y
            };
        }

        if (isSingleUserTextSelection && (anchor === 'top-center' || anchor === 'bottom-center')) {
            return {
                x: newPos.x,
                y: oldPos.y
            };
        }

        if (anchor === 'top-center' || anchor === 'bottom-center') {
            return {
                x: oldPos.x,
                y: newPos.y
            };
        }

        return newPos;
    });

    transformerLayer.add(tr);
    return tr;
}

function createTransformerThroughFactory(stage, transformerLayer, getPage) {
    if (window.PageFactory && typeof window.PageFactory.createTransformer === "function") {
        const tr = window.PageFactory.createTransformer({
            KonvaRef: Konva,
            stage,
            transformerLayer,
            getPage
        });
        if (tr) return tr;
    }
    return createTransformerLocal(stage, transformerLayer, getPage);
}

function createPage(n, prods) {
    const div = buildPageShellThroughFactory(n);
    const { stage, layer, transformerLayer } = createStageLayersThroughFactory(n);
    let page = null;

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

    const bgRect = createPageBackgroundThroughFactory(layer, () => page);

    const tr = createTransformerThroughFactory(stage, transformerLayer, () => page);

// === MARQUEE SELECTION (ZAZNACZANIE PRZECIĄGANIEM) ===
let marqueeActive = false;
let marqueeStart = null;
let marqueeHadDrag = false;
let marqueeSuppressClickUntil = 0;
let marqueeDragSuppressedNode = null;
let marqueePendingStart = null;
let marqueeAdditiveMode = false;
let marqueeSelectionSeed = [];
const MARQUEE_DRAG_THRESHOLD = 3;

const selectionRect = new Konva.Rect({
    
    fill: 'rgba(0, 160, 255, 0.15)',
    stroke: 'rgba(0, 160, 255, 0.7)',
    strokeWidth: 1,
    visible: false,
    listening: false,   // 🔥 najważniejsze — nie przechwytuje kliknięć!
    name: 'selectionRect'
    
});
layer.add(selectionRect);

function preparePageForActiveMarquee({ additive = false } = {}) {
    page.layer.find('.selectionOutline').forEach((n) => n.destroy());
    hideFloatingButtons();
    disableCropMode(page);
    if (!additive) {
        page.selectedNodes = [];
    }
    page.transformer.nodes([]);
    page.layer.batchDraw();
    page.transformerLayer.batchDraw();
}

function activatePendingMarquee() {
    if (!marqueePendingStart) return false;
    marqueeActive = true;
    marqueeHadDrag = true;
    marqueeStart = { x: marqueePendingStart.x, y: marqueePendingStart.y };
    marqueePendingStart = null;

    selectionRect.moveToTop();
    selectionRect.setAttrs({
        x: marqueeStart.x,
        y: marqueeStart.y,
        width: 0,
        height: 0,
        visible: true
    });

    preparePageForActiveMarquee({ additive: marqueeAdditiveMode });
    return true;
}

function resetPendingMarqueeState() {
    marqueePendingStart = null;
    marqueeStart = null;
    marqueeHadDrag = false;
    marqueeAdditiveMode = false;
    marqueeSelectionSeed = [];
}


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
    marqueePendingStart = null;
    marqueeAdditiveMode = !!(e.evt && e.evt.shiftKey);
    marqueeSelectionSeed = normalizeSelection(Array.isArray(page.selectedNodes) ? page.selectedNodes.slice() : []);

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

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
    }
    marqueePendingStart = { x: pointer.x, y: pointer.y };
    marqueeStart = null;
});

stage.on('mousemove.marquee', () => {
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (!marqueeActive && marqueePendingStart) {
        const dx = Math.abs(pos.x - marqueePendingStart.x);
        const dy = Math.abs(pos.y - marqueePendingStart.y);
        if (dx <= MARQUEE_DRAG_THRESHOLD && dy <= MARQUEE_DRAG_THRESHOLD) return;
        activatePendingMarquee();
    }

    if (!marqueeActive) return;
    if (!marqueeStart) return;
    if (
        Math.abs(pos.x - marqueeStart.x) > MARQUEE_DRAG_THRESHOLD ||
        Math.abs(pos.y - marqueeStart.y) > MARQUEE_DRAG_THRESHOLD
    ) {
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
    if (!marqueeActive && marqueePendingStart) {
        if (marqueeDragSuppressedNode && marqueeDragSuppressedNode.node && typeof marqueeDragSuppressedNode.node.draggable === "function") {
            marqueeDragSuppressedNode.node.draggable(!!marqueeDragSuppressedNode.draggable);
        }
        marqueeDragSuppressedNode = null;
        resetPendingMarqueeState();
        return;
    }
    if (!marqueeActive) return;
    marqueeActive = false;
    if (marqueeDragSuppressedNode && marqueeDragSuppressedNode.node && typeof marqueeDragSuppressedNode.node.draggable === "function") {
        marqueeDragSuppressedNode.node.draggable(!!marqueeDragSuppressedNode.draggable);
    }
    marqueeDragSuppressedNode = null;
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
    if (marqueeAdditiveMode && marqueeSelectionSeed.length) {
        nodes = normalizeSelection([].concat(marqueeSelectionSeed, nodes));
        nodes = expandSelectionForDirectModules(nodes, page.layer);
    }

    selectionRect.visible(false);

    // USUŃ STARE OBRYSY
    page.layer.find(".selectionOutline").forEach(n => n.destroy());

    if (page._cropMode && (nodes.length !== 1 || nodes[0] !== page._cropTarget)) {
        disableCropMode(page);
    }

    if (nodes.length > 0) {
        page.selectedNodes = nodes;
        disableCropMode(page);
        page.transformer.nodes(nodes);
        
        highlightSelection();
        showFloatingButtons();
    } else {
        page.selectedNodes = [];
        page.transformer.nodes([]);
        hideFloatingButtons();
    }

    page.layer.batchDraw();
    page.transformerLayer.batchDraw();

    schedulePageTask(page, "selectionCleanup", () => {
        resetPendingMarqueeState();
        selectionRect.visible(false);
        page.layer.batchDraw();
    }, 50);
});

    // === TWORZENIE OBIEKTU STRONY ===
page = createBasePageObjectThroughFactory({
    n,
    prods,
    stage,
    layer,
    transformerLayer,
    div,
    tr
});

    // === PODGLĄD KĄTA OBRACANIA (CANVA STYLE) ===
    const rotationUI = createRotationLabel(layer);
    page.rotationUI = rotationUI;
    const sizeUI = createTransformSizeLabel(layer);
    page.sizeUI = sizeUI;

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

    const hideSizeLabel = () => {
        const label = sizeUI?.label;
        if (!label || (label.isDestroyed && label.isDestroyed()) || !label.getLayer || !label.getLayer()) {
            return;
        }
        label.to({
            opacity: 0,
            duration: 0.18,
            onFinish: () => {
                if (!label.isDestroyed || !label.isDestroyed()) {
                    label.visible(false);
                }
            }
        });
    };

    const updateSizeLabel = () => {
        const nodes = tr.nodes();
        if (!nodes || nodes.length !== 1) return;
        const target = nodes[0];
        let box;
        try {
            box = target.getClientRect({ relativeTo: layer });
        } catch (_e) {
            return;
        }
        const labelText = getLiveNodeSizeLabel(target, layer);
        if (!labelText) return;
        sizeUI.text.text(labelText);
        sizeUI.label.position({
            x: box.x + box.width / 2,
            y: box.y + box.height + 14
        });
        sizeUI.label.visible(true);
        sizeUI.label.opacity(1);
        sizeUI.label.moveToTop();
        layer.batchDraw();
    };

    tr.on("transformstart", () => {
        if (tr.getActiveAnchor && tr.getActiveAnchor() === "rotater") {
            updateRotationLabel();
            hideSizeLabel();
            return;
        }
        updateSizeLabel();
    });

    tr.on("transform", () => {
        if (tr.getActiveAnchor && tr.getActiveAnchor() === "rotater") {
            updateRotationLabel();
            hideSizeLabel();
            return;
        }
        updateSizeLabel();
    });

    tr.on("transformend", () => {
        hideSizeLabel();
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

  if (typeof window.ensurePageHydrated === "function") {
      try { await window.ensurePageHydrated(page, { reason: "drop-image" }); } catch (_e) {}
  }

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
      if (typeof window.activateNewImageCropSelection === "function") {
          try { window.activateNewImageCropSelection(page, img); } catch (_e) {}
      }
  });
});
// === ANIMACJA DRAG & DROP — CANVA STYLE ===
let multiDragState = null;
let dragMoveRafId = 0;
let dragMovePendingNode = null;
let dragGuideStopsCache = null;
let dragGuideNode = null;
let dragGuideIgnoredNodes = null;
let dragGuideSnapState = null;
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

const isCanvasDragTarget = (node) => {
    if (!node || node === stage) return false;
    if (typeof node.draggable !== "function" || !node.draggable()) return false;
    if (typeof node.getLayer === "function" && node.getLayer() !== page.layer) return false;
    return true;
};

stage.on('dragstart', (e) => {
    const node = e.target;
    if (!isCanvasDragTarget(node)) return;
    if (dragMoveRafId) {
        cancelAnimationFrame(dragMoveRafId);
        dragMoveRafId = 0;
    }
    dragMovePendingNode = null;
    dragGuideNode = node;
    dragGuideIgnoredNodes = new Set([node]);
    dragGuideSnapState = {
        node,
        vertical: null,
        horizontal: null
    };
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
        multiDragState.members.forEach((entry) => {
            if (entry && entry.node) dragGuideIgnoredNodes.add(entry.node);
        });
    } else {
        multiDragState = null;
    }

    try {
        dragGuideStopsCache = getSmartGuideStops(node, dragGuideIgnoredNodes);
    } catch (_e) {
        dragGuideStopsCache = null;
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

    if (typeof window.isDirectModuleEditableTextNode === "function" && window.isDirectModuleEditableTextNode(e.target)) {
        return;
    }

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
const SMART_GUIDE_TARGET_NAME = "smartGuideTarget";
const SMART_GUIDE_BADGE_NAME = "smartGuideBadge";
const SMART_GUIDE_THRESHOLD = 8;
const SMART_GUIDE_RELEASE_THRESHOLD = 12;
const SMART_GUIDE_SWITCH_PRIORITY_DELTA = 3;
const SMART_GUIDE_CROSS_AXIS_GAP = 96;
const SMART_GUIDE_MIN_SOURCE_SIZE = 14;
const SMART_GUIDE_SHOW_TARGET_RECT = false;
const PAGE_EDGE_GUIDE_NAME = "pageEdgeGuideLine";
const PAGE_EDGE_GUIDE_ZONE_NAME = "pageEdgeGuideZone";
const PAGE_EDGE_GUIDE_BADGE_NAME = "pageEdgeGuideBadge";
const PAGE_EDGE_GUIDE_THRESHOLD = 12;
const PAGE_EDGE_GUIDE_ZONE_SIZE = 8;
const PAGE_EDGE_GUIDE_SHOW_ZONE = false;

function clearSmartGuides() {
    let removed = false;
    try {
        [
            SMART_GUIDE_NAME,
            SMART_GUIDE_TARGET_NAME,
            SMART_GUIDE_BADGE_NAME,
            PAGE_EDGE_GUIDE_NAME,
            PAGE_EDGE_GUIDE_ZONE_NAME,
            PAGE_EDGE_GUIDE_BADGE_NAME
        ].forEach((guideName) => {
            const guides = page.layer.find(`.${guideName}`);
            if (guides && typeof guides.length === "number" && guides.length > 0) {
                removed = true;
                guides.forEach((n) => n.destroy());
            }
        });
    } catch (_err) {}
    return removed;
}

function drawGuideLine(points, options = {}) {
    if (!Array.isArray(points) || points.length !== 4 || !window.Konva) return;
    const line = new window.Konva.Line({
        points,
        stroke: options.stroke || "#00baff",
        strokeWidth: Number.isFinite(Number(options.strokeWidth)) ? Number(options.strokeWidth) : 1,
        dash: Array.isArray(options.dash) ? options.dash : [4, 4],
        listening: false,
        name: options.name || SMART_GUIDE_NAME,
        opacity: Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1
    });
    page.layer.add(line);
    line.moveToTop();
}

function drawSmartGuideLine(points) {
    drawGuideLine(points, {
        name: SMART_GUIDE_NAME,
        stroke: "#00baff",
        strokeWidth: 2,
        dash: []
    });
}

function drawSmartGuideTargetRect(rect) {
    if (!window.Konva || !rect) return;
    const x = Number(rect.x) || 0;
    const y = Number(rect.y) || 0;
    const width = Number(rect.width) || 0;
    const height = Number(rect.height) || 0;
    if (!(width > 0) || !(height > 0)) return;
    const targetRect = new window.Konva.Rect({
        x,
        y,
        width,
        height,
        stroke: "#00baff",
        strokeWidth: 1.5,
        dash: [6, 4],
        fill: "rgba(0, 186, 255, 0.05)",
        listening: false,
        name: SMART_GUIDE_TARGET_NAME
    });
    page.layer.add(targetRect);
    targetRect.moveToTop();
}

function getSmartGuideAxisLabel(axis, edgeType) {
    const normalizedAxis = axis === "horizontal" ? "horizontal" : "vertical";
    const key = String(edgeType || "").trim().toLowerCase();
    const labelMap = normalizedAxis === "vertical"
        ? {
            left: "Lewa krawedz",
            center: "Srodek w pionie",
            right: "Prawa krawedz"
        }
        : {
            top: "Gorna krawedz",
            middle: "Srodek w poziomie",
            bottom: "Dolna krawedz"
        };
    return labelMap[key] || "Wyrownanie";
}

function buildSmartGuideBadgeText(bestV, bestH) {
    const parts = [];
    if (bestV) parts.push(getSmartGuideAxisLabel("vertical", bestV.edgeType));
    if (bestH) parts.push(getSmartGuideAxisLabel("horizontal", bestH.edgeType));
    return parts.join(" | ");
}

function drawSmartGuideBadge(rect, bestV, bestH, stageW, stageH) {
    if (!window.Konva || !rect) return;
    const textValue = buildSmartGuideBadgeText(bestV, bestH);
    if (!textValue) return;

    const textNode = new window.Konva.Text({
        text: textValue,
        fontSize: 12,
        fontStyle: "bold",
        fontFamily: "Arial",
        fill: "#035388",
        padding: 0,
        listening: false
    });

    const textW = Number(textNode.width()) || 0;
    const textH = Number(textNode.height()) || 0;
    const badgePaddingX = 10;
    const badgePaddingY = 6;
    const badgeW = textW + badgePaddingX * 2;
    const badgeH = textH + badgePaddingY * 2;
    const preferredX = Number(rect.x || 0) + Number(rect.width || 0) / 2 - badgeW / 2;
    const preferredY = Number(rect.y || 0) - badgeH - 10;
    const badgeX = Math.max(8, Math.min(preferredX, Math.max(8, stageW - badgeW - 8)));
    const badgeY = Math.max(8, Math.min(preferredY, Math.max(8, stageH - badgeH - 8)));

    const bgNode = new window.Konva.Rect({
        x: 0,
        y: 0,
        width: badgeW,
        height: badgeH,
        fill: "rgba(239, 249, 255, 0.98)",
        stroke: "#00baff",
        strokeWidth: 1,
        cornerRadius: 999,
        shadowColor: "rgba(0, 0, 0, 0.12)",
        shadowBlur: 8,
        shadowOffset: { x: 0, y: 2 },
        shadowOpacity: 0.2,
        listening: false
    });

    textNode.x(badgePaddingX);
    textNode.y(badgePaddingY);

    const badge = new window.Konva.Group({
        x: badgeX,
        y: badgeY,
        listening: false,
        name: SMART_GUIDE_BADGE_NAME
    });
    badge.add(bgNode);
    badge.add(textNode);
    page.layer.add(badge);
    badge.moveToTop();
}

function getSmartGuideLinePoints(axis, snappedBox, match, stageW, stageH) {
    if (!match) return null;
    const targetRect = match.stopObj && match.stopObj.rect ? match.stopObj.rect : null;
    if (axis === "vertical") {
        const x = Number(match.stop) || 0;
        if (!targetRect || match.stopObj?.source === "page") {
            return [x, 0, x, stageH];
        }
        const y1 = Math.max(0, Math.min(Number(snappedBox.y) || 0, Number(targetRect.y) || 0) - 8);
        const y2 = Math.min(
            stageH,
            Math.max(
                (Number(snappedBox.y) || 0) + (Number(snappedBox.height) || 0),
                (Number(targetRect.y) || 0) + (Number(targetRect.height) || 0)
            ) + 8
        );
        return [x, y1, x, y2];
    }
    const y = Number(match.stop) || 0;
    if (!targetRect || match.stopObj?.source === "page") {
        return [0, y, stageW, y];
    }
    const x1 = Math.max(0, Math.min(Number(snappedBox.x) || 0, Number(targetRect.x) || 0) - 8);
    const x2 = Math.min(
        stageW,
        Math.max(
            (Number(snappedBox.x) || 0) + (Number(snappedBox.width) || 0),
            (Number(targetRect.x) || 0) + (Number(targetRect.width) || 0)
        ) + 8
    );
    return [x1, y, x2, y];
}

function drawPageEdgeGuideLine(points) {
    drawGuideLine(points, {
        name: PAGE_EDGE_GUIDE_NAME,
        stroke: "#f59e0b",
        strokeWidth: 2.5,
        dash: [],
        opacity: 1
    });
}

function drawPageEdgeGuideZone(side, stageW, stageH) {
    if (!window.Konva || !(stageW > 0) || !(stageH > 0)) return;
    const size = PAGE_EDGE_GUIDE_ZONE_SIZE;
    const attrs = {
        x: 0,
        y: 0,
        width: stageW,
        height: size,
        fill: "rgba(245, 158, 11, 0.12)",
        listening: false,
        name: PAGE_EDGE_GUIDE_ZONE_NAME
    };
    if (side === "left") {
        attrs.width = size;
        attrs.height = stageH;
    } else if (side === "right") {
        attrs.x = Math.max(0, stageW - size);
        attrs.width = size;
        attrs.height = stageH;
    } else if (side === "top") {
        attrs.width = stageW;
        attrs.height = size;
    } else if (side === "bottom") {
        attrs.y = Math.max(0, stageH - size);
        attrs.width = stageW;
        attrs.height = size;
    } else {
        return;
    }
    const zone = new window.Konva.Rect(attrs);
    page.layer.add(zone);
    zone.moveToTop();
}

function getPageEdgeBadgeText(edgeMatches) {
    if (!Array.isArray(edgeMatches) || !edgeMatches.length) return "";
    const sideLabelMap = {
        left: "Lewa",
        right: "Prawa",
        top: "Gorna",
        bottom: "Dolna"
    };
    return edgeMatches
        .map((match) => {
            const label = sideLabelMap[match.side] || "Krawedz";
            const distance = Math.max(0, Math.round(Number(match.distance) || 0));
            return `${label}: ${distance}px`;
        })
        .join(" | ");
}

function drawPageEdgeGuideBadge(rect, edgeMatches, stageW, stageH) {
    if (!window.Konva || !rect || !Array.isArray(edgeMatches) || !edgeMatches.length) return;
    const textValue = getPageEdgeBadgeText(edgeMatches);
    if (!textValue) return;

    const textNode = new window.Konva.Text({
        text: textValue,
        fontSize: 12,
        fontStyle: "bold",
        fontFamily: "Arial",
        fill: "#9a6700",
        padding: 0,
        listening: false
    });

    const textW = Number(textNode.width()) || 0;
    const textH = Number(textNode.height()) || 0;
    const badgePaddingX = 10;
    const badgePaddingY = 6;
    const badgeW = textW + badgePaddingX * 2;
    const badgeH = textH + badgePaddingY * 2;
    const preferredX = Number(rect.x || 0) + Number(rect.width || 0) / 2 - badgeW / 2;
    const preferredY = Number(rect.y || 0) - badgeH - 10;
    const badgeX = Math.max(8, Math.min(preferredX, Math.max(8, stageW - badgeW - 8)));
    const badgeY = Math.max(8, Math.min(preferredY, Math.max(8, stageH - badgeH - 8)));

    const bgNode = new window.Konva.Rect({
        x: 0,
        y: 0,
        width: badgeW,
        height: badgeH,
        fill: "rgba(255, 247, 237, 0.96)",
        stroke: "#f59e0b",
        strokeWidth: 1,
        cornerRadius: 999,
        shadowColor: "rgba(0, 0, 0, 0.12)",
        shadowBlur: 8,
        shadowOffset: { x: 0, y: 2 },
        shadowOpacity: 0.25,
        listening: false
    });

    textNode.x(badgePaddingX);
    textNode.y(badgePaddingY);

    const badge = new window.Konva.Group({
        x: badgeX,
        y: badgeY,
        listening: false,
        name: PAGE_EDGE_GUIDE_BADGE_NAME
    });
    badge.add(bgNode);
    badge.add(textNode);
    page.layer.add(badge);
    badge.moveToTop();
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

function isRelatedToIgnoredGuideNode(node, ignoredNodes) {
    if (!node || !(ignoredNodes instanceof Set) || ignoredNodes.size === 0) return false;
    for (const ignored of ignoredNodes) {
        if (!ignored) continue;
        if (node === ignored) return true;
        if (isDescendantOf(node, ignored)) return true;
        if (isDescendantOf(ignored, node)) return true;
    }
    return false;
}

function resolveSmartGuideReferenceNode(node) {
    if (!node) return null;
    let candidate = node;
    let current = node;
    while (current && current !== stage && current !== page.layer) {
        const parent = current.getParent ? current.getParent() : null;
        if (!(parent instanceof window.Konva.Group)) break;
        const parentActsAsSingleObject = !!(
            (typeof parent.draggable === "function" && parent.draggable()) ||
            (parent.getAttr && (
                parent.getAttr("isUserGroup") ||
                parent.getAttr("isPriceGroup") ||
                parent.getAttr("isPreset") ||
                parent.getAttr("isShape")
            ))
        );
        if (!parentActsAsSingleObject) break;
        candidate = parent;
        current = parent;
    }
    return candidate;
}

function isSmartGuideSourceNode(node) {
    if (!node || !node.getClientRect) return false;
    if (typeof node.isDestroyed === "function" && node.isDestroyed()) return false;
    if (typeof node.visible === "function" && !node.visible()) return false;
    if (node.getAttr && (
        node.getAttr("isPageBg") ||
        node.getAttr("isBgBlur") ||
        node.getAttr("isPriceHitArea") ||
        node.getAttr("selectable") === false
    )) return false;

    if (node.name && typeof node.name === "function") {
        const nodeName = node.name();
        if (
            nodeName === SMART_GUIDE_NAME ||
            nodeName === SMART_GUIDE_TARGET_NAME ||
            nodeName === SMART_GUIDE_BADGE_NAME ||
            nodeName === PAGE_EDGE_GUIDE_NAME ||
            nodeName === PAGE_EDGE_GUIDE_ZONE_NAME ||
            nodeName === PAGE_EDGE_GUIDE_BADGE_NAME ||
            nodeName === "selectionOutline" ||
            nodeName === "selectionRect"
        ) {
            return false;
        }
    }

    if (node instanceof window.Konva.Group) {
        const isGuideGroup = !!(node.getAttr && (
            node.getAttr("isUserGroup") ||
            node.getAttr("isPriceGroup") ||
            node.getAttr("isPreset") ||
            node.getAttr("isShape")
        ));
        if (!isGuideGroup && !(typeof node.draggable === "function" && node.draggable())) {
            return false;
        }
    }

    if (node instanceof window.Konva.Rect) {
        const isGuideRect = !!(node.getAttr && (
            node.getAttr("isShape") ||
            node.getAttr("isDirectPriceRectBg")
        ));
        if (!isGuideRect && !(typeof node.draggable === "function" && node.draggable())) {
            return false;
        }
    }

    try {
        const rect = node.getClientRect({ relativeTo: page.layer, skipShadow: true, skipStroke: false });
        if (!rect) return false;
        const width = Number(rect.width) || 0;
        const height = Number(rect.height) || 0;
        if (!(width > 0) || !(height > 0)) return false;
        if (Math.max(width, height) < SMART_GUIDE_MIN_SOURCE_SIZE) return false;
        return true;
    } catch (_e) {
        return false;
    }
}

function getRangeOverlap(startA, endA, startB, endB) {
    return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function getRangeGap(startA, endA, startB, endB) {
    const overlap = getRangeOverlap(startA, endA, startB, endB);
    if (overlap > 0) return 0;
    if (endA < startB) return startB - endA;
    if (endB < startA) return startA - endB;
    return 0;
}

function getGuideStopRelevance(sourceRect, stop, axis) {
    if (!stop || stop.source === "page" || !stop.rect) {
        return {
            eligible: true,
            overlap: Number.POSITIVE_INFINITY,
            crossGap: 0,
            mainCenterDistance: 0
        };
    }

    const targetRect = stop.rect;
    const sourceCenterX = (Number(sourceRect.x) || 0) + ((Number(sourceRect.width) || 0) / 2);
    const sourceCenterY = (Number(sourceRect.y) || 0) + ((Number(sourceRect.height) || 0) / 2);
    const targetCenterX = (Number(targetRect.x) || 0) + ((Number(targetRect.width) || 0) / 2);
    const targetCenterY = (Number(targetRect.y) || 0) + ((Number(targetRect.height) || 0) / 2);

    if (axis === "vertical") {
        const overlap = getRangeOverlap(
            Number(sourceRect.y) || 0,
            (Number(sourceRect.y) || 0) + (Number(sourceRect.height) || 0),
            Number(targetRect.y) || 0,
            (Number(targetRect.y) || 0) + (Number(targetRect.height) || 0)
        );
        const crossGap = getRangeGap(
            Number(sourceRect.y) || 0,
            (Number(sourceRect.y) || 0) + (Number(sourceRect.height) || 0),
            Number(targetRect.y) || 0,
            (Number(targetRect.y) || 0) + (Number(targetRect.height) || 0)
        );
        return {
            eligible: overlap > 0 || crossGap <= SMART_GUIDE_CROSS_AXIS_GAP,
            overlap,
            crossGap,
            mainCenterDistance: Math.abs(sourceCenterX - targetCenterX)
        };
    }

    const overlap = getRangeOverlap(
        Number(sourceRect.x) || 0,
        (Number(sourceRect.x) || 0) + (Number(sourceRect.width) || 0),
        Number(targetRect.x) || 0,
        (Number(targetRect.x) || 0) + (Number(targetRect.width) || 0)
    );
    const crossGap = getRangeGap(
        Number(sourceRect.x) || 0,
        (Number(sourceRect.x) || 0) + (Number(sourceRect.width) || 0),
        Number(targetRect.x) || 0,
        (Number(targetRect.x) || 0) + (Number(targetRect.width) || 0)
    );
    return {
        eligible: overlap > 0 || crossGap <= SMART_GUIDE_CROSS_AXIS_GAP,
        overlap,
        crossGap,
        mainCenterDistance: Math.abs(sourceCenterY - targetCenterY)
    };
}

function getSmartGuideStops(skipNode, ignoredNodes = null) {
    const stageW = stage.width ? stage.width() : 0;
    const stageH = stage.height ? stage.height() : 0;
    const vertical = [
        {
            value: stageW / 2,
            type: "center",
            source: "page",
            rect: { x: stageW / 2, y: 0, width: 0, height: stageH }
        }
    ];
    const horizontal = [
        {
            value: stageH / 2,
            type: "middle",
            source: "page",
            rect: { x: 0, y: stageH / 2, width: stageW, height: 0 }
        }
    ];

    const rawNodes = page.layer.find((n) => {
        if (!n || n === skipNode) return false;
        if (!n.visible || !n.visible()) return false;
        return !!n.getClientRect;
    });

    const uniqueNodes = new Map();
    rawNodes.forEach((n) => {
        const guideNode = resolveSmartGuideReferenceNode(n);
        if (!guideNode || guideNode === skipNode) return;
        if (isRelatedToIgnoredGuideNode(guideNode, ignoredNodes)) return;
        if (!isSmartGuideSourceNode(guideNode)) return;
        uniqueNodes.set(String(guideNode._id || uniqueNodes.size), guideNode);
    });

    uniqueNodes.forEach((n) => {
        try {
            const r = n.getClientRect({ relativeTo: page.layer, skipShadow: true, skipStroke: false });
            if (!r || !Number.isFinite(r.width) || !Number.isFinite(r.height) || r.width <= 0 || r.height <= 0) return;
            const edges = nodeRectToEdges(r);
            edges.vertical.forEach((v) => vertical.push({
                value: v.value,
                type: v.type,
                source: "node",
                node: n,
                rect: { x: r.x, y: r.y, width: r.width, height: r.height }
            }));
            edges.horizontal.forEach((h) => horizontal.push({
                value: h.value,
                type: h.type,
                source: "node",
                node: n,
                rect: { x: r.x, y: r.y, width: r.width, height: r.height }
            }));
        } catch (_err) {}
    });

    return { vertical, horizontal };
}

function buildGuideStopKey(stop) {
    if (!stop) return "";
    const source = stop.source === "page"
        ? "page"
        : `node:${String(stop.node?._id || "")}`;
    const type = String(stop.type || "");
    const value = Math.round((Number(stop.value) || 0) * 100) / 100;
    return `${source}:${type}:${value}`;
}

function compareGuideCandidates(a, b) {
    const absDiff = Number(a?.abs || 0) - Number(b?.abs || 0);
    if (absDiff !== 0) return absDiff;

    const overlapDiff = Number(b?.crossOverlap || 0) - Number(a?.crossOverlap || 0);
    if (overlapDiff !== 0) return overlapDiff;

    const crossGapDiff = Number(a?.crossGap || 0) - Number(b?.crossGap || 0);
    if (crossGapDiff !== 0) return crossGapDiff;

    const aCenterBias = (a?.edgeType === "center" || a?.edgeType === "middle") ? 0 : 1;
    const bCenterBias = (b?.edgeType === "center" || b?.edgeType === "middle") ? 0 : 1;
    if (aCenterBias !== bCenterBias) return aCenterBias - bCenterBias;

    const aPageBias = a?.stopObj?.source === "page" ? 0 : 1;
    const bPageBias = b?.stopObj?.source === "page" ? 0 : 1;
    if (aPageBias !== bPageBias) return aPageBias - bPageBias;

    const centerDistanceDiff = Number(a?.mainCenterDistance || 0) - Number(b?.mainCenterDistance || 0);
    if (centerDistanceDiff !== 0) return centerDistanceDiff;

    return buildGuideStopKey(a?.stopObj).localeCompare(buildGuideStopKey(b?.stopObj));
}

function resolveGuideMatch(axis, sourceRect, edges, stops, activeLock = null) {
    if (!Array.isArray(edges) || !Array.isArray(stops) || !stops.length) return null;

    const candidates = [];
    edges.forEach((edge) => {
        stops.forEach((stop) => {
            if (!stop || edge.type !== stop.type) return;
            const relevance = getGuideStopRelevance(sourceRect, stop, axis);
            if (!relevance.eligible) return;
            const diff = Number(stop.value) - Number(edge.value);
            const abs = Math.abs(diff);
            if (abs > SMART_GUIDE_RELEASE_THRESHOLD) return;
            candidates.push({
                diff,
                abs,
                stop: Number(stop.value) || 0,
                stopObj: stop,
                edgeType: edge.type,
                lockKey: buildGuideStopKey(stop),
                crossOverlap: Number(relevance.overlap) || 0,
                crossGap: Number(relevance.crossGap) || 0,
                mainCenterDistance: Number(relevance.mainCenterDistance) || 0
            });
        });
    });

    if (!candidates.length) return null;
    candidates.sort(compareGuideCandidates);

    const bestAcquire = candidates.find((candidate) => candidate.abs <= SMART_GUIDE_THRESHOLD) || null;
    if (!activeLock || !activeLock.key) return bestAcquire;

    const lockedCandidate = candidates.find((candidate) => (
        candidate.lockKey === activeLock.key &&
        candidate.edgeType === activeLock.edgeType
    )) || null;

    if (!lockedCandidate) return bestAcquire;
    if (!bestAcquire || bestAcquire.lockKey === lockedCandidate.lockKey) return lockedCandidate;

    const improvement = Number(lockedCandidate.abs || 0) - Number(bestAcquire.abs || 0);
    return improvement >= SMART_GUIDE_SWITCH_PRIORITY_DELTA ? bestAcquire : lockedCandidate;
}

function getPageEdgeGuideMatches(rect) {
    const stageW = stage.width ? stage.width() : 0;
    const stageH = stage.height ? stage.height() : 0;
    if (!rect || !(stageW > 0) || !(stageH > 0)) {
        return { vertical: [], horizontal: [] };
    }

    const vertical = [];
    const horizontal = [];

    const leftDiff = Math.abs(Number(rect.x) || 0);
    const rightDiff = Math.abs((Number(rect.x) || 0) + (Number(rect.width) || 0) - stageW);
    const topDiff = Math.abs(Number(rect.y) || 0);
    const bottomDiff = Math.abs((Number(rect.y) || 0) + (Number(rect.height) || 0) - stageH);

    if (leftDiff <= PAGE_EDGE_GUIDE_THRESHOLD) vertical.push({ side: "left", stop: 0, distance: leftDiff });
    if (rightDiff <= PAGE_EDGE_GUIDE_THRESHOLD) vertical.push({ side: "right", stop: stageW, distance: rightDiff });
    if (topDiff <= PAGE_EDGE_GUIDE_THRESHOLD) horizontal.push({ side: "top", stop: 0, distance: topDiff });
    if (bottomDiff <= PAGE_EDGE_GUIDE_THRESHOLD) horizontal.push({ side: "bottom", stop: stageH, distance: bottomDiff });

    return { vertical, horizontal };
}

function applySmartGuidesAndSnap(node, stopsOverride) {
    if (!node || !node.getClientRect || !node.getAbsolutePosition || !node.setAbsolutePosition) return;
    const box = node.getClientRect({ relativeTo: page.layer, skipShadow: true, skipStroke: false });
    if (!box || !Number.isFinite(box.x) || !Number.isFinite(box.y)) return;

    const edges = nodeRectToEdges(box);
    const stops = stopsOverride || getSmartGuideStops(node);
    if (!dragGuideSnapState || dragGuideSnapState.node !== node) {
        dragGuideSnapState = {
            node,
            vertical: null,
            horizontal: null
        };
    }

    const bestV = resolveGuideMatch("vertical", box, edges.vertical, stops.vertical, dragGuideSnapState.vertical);
    const bestH = resolveGuideMatch("horizontal", box, edges.horizontal, stops.horizontal, dragGuideSnapState.horizontal);
    dragGuideSnapState.vertical = bestV ? {
        key: bestV.lockKey,
        edgeType: bestV.edgeType
    } : null;
    dragGuideSnapState.horizontal = bestH ? {
        key: bestH.lockKey,
        edgeType: bestH.edgeType
    } : null;

    const snappedBox = {
        x: Number(box.x || 0) + (bestV ? bestV.diff : 0),
        y: Number(box.y || 0) + (bestH ? bestH.diff : 0),
        width: Number(box.width || 0),
        height: Number(box.height || 0)
    };
    const edgeGuides = getPageEdgeGuideMatches(snappedBox);

    const abs = node.getAbsolutePosition();
    if (bestV || bestH) {
        const next = {
            x: Number(abs?.x || 0) + (bestV ? bestV.diff : 0),
            y: Number(abs?.y || 0) + (bestH ? bestH.diff : 0)
        };
        node.setAbsolutePosition(next);
    }

    const hadOldGuides = clearSmartGuides();
    const stageW = stage.width ? stage.width() : 0;
    const stageH = stage.height ? stage.height() : 0;
    const highlightedTargets = new Set();
    if (bestV) {
        const points = getSmartGuideLinePoints("vertical", snappedBox, bestV, stageW, stageH);
        if (points) drawSmartGuideLine(points);
        if (SMART_GUIDE_SHOW_TARGET_RECT && bestV.stopObj && bestV.stopObj.source === "node" && bestV.stopObj.rect) {
            const key = JSON.stringify(bestV.stopObj.rect);
            if (!highlightedTargets.has(key)) {
                highlightedTargets.add(key);
                drawSmartGuideTargetRect(bestV.stopObj.rect);
            }
        }
    }
    if (bestH) {
        const points = getSmartGuideLinePoints("horizontal", snappedBox, bestH, stageW, stageH);
        if (points) drawSmartGuideLine(points);
        if (SMART_GUIDE_SHOW_TARGET_RECT && bestH.stopObj && bestH.stopObj.source === "node" && bestH.stopObj.rect) {
            const key = JSON.stringify(bestH.stopObj.rect);
            if (!highlightedTargets.has(key)) {
                highlightedTargets.add(key);
                drawSmartGuideTargetRect(bestH.stopObj.rect);
            }
        }
    }
    edgeGuides.vertical.forEach((match) => {
        if (PAGE_EDGE_GUIDE_SHOW_ZONE) drawPageEdgeGuideZone(match.side, stageW, stageH);
        drawPageEdgeGuideLine([match.stop, 0, match.stop, stageH]);
    });
    edgeGuides.horizontal.forEach((match) => {
        if (PAGE_EDGE_GUIDE_SHOW_ZONE) drawPageEdgeGuideZone(match.side, stageW, stageH);
        drawPageEdgeGuideLine([0, match.stop, stageW, match.stop]);
    });
    drawPageEdgeGuideBadge(
        snappedBox,
        edgeGuides.vertical.concat(edgeGuides.horizontal),
        stageW,
        stageH
    );
    drawSmartGuideBadge(snappedBox, bestV, bestH, stageW, stageH);

    return hadOldGuides || !!bestV || !!bestH || edgeGuides.vertical.length > 0 || edgeGuides.horizontal.length > 0;
}

const flushDragMoveFrame = () => {
    dragMoveRafId = 0;
    const node = dragMovePendingNode;
    dragMovePendingNode = null;
    if (!isCanvasDragTarget(node)) return;

    let needsLayerDraw = false;
    try {
        if (dragGuideNode !== node || !dragGuideStopsCache) {
            dragGuideNode = node;
            dragGuideIgnoredNodes = dragGuideIgnoredNodes instanceof Set ? dragGuideIgnoredNodes : new Set([node]);
            dragGuideIgnoredNodes.add(node);
            dragGuideStopsCache = getSmartGuideStops(node, dragGuideIgnoredNodes);
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
    if (!isCanvasDragTarget(node)) return;
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
    dragGuideIgnoredNodes = null;
    dragGuideSnapState = null;

    clearSmartGuides();
    const hadOutlines = page.layer.find('.selectionOutline');
    if (hadOutlines && typeof hadOutlines.forEach === "function") hadOutlines.forEach(n => n.destroy());
    multiDragState = null;
    

    const node = e.target;
    if (!isCanvasDragTarget(node)) return;

    const transferredAcrossPages = (typeof window.transferDraggedSelectionAcrossPages === "function")
        ? window.transferDraggedSelectionAcrossPages({
            sourcePage: page,
            dragNode: node,
            evt: e && e.evt
        })
        : false;
    if (transferredAcrossPages) {
        stage.container().style.cursor = 'default';
        return;
    }

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
const btnMagicLayout = toolbar.querySelector(".magic-layout");
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

if (btnMagicLayout) {
    btnMagicLayout.onclick = async (e) => {
        e.stopPropagation();

        if (typeof window.ensurePageHydrated === "function") {
            try { await window.ensurePageHydrated(page, { reason: "magic-layout" }); } catch (_e) {}
        }

        if (typeof window.openMagicLayoutForPage === "function") {
            window.openMagicLayoutForPage(page);
        } else {
            alert("Brak modulu magic-layout.js");
        }
    };
}



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
    if (typeof window.duplicatePage === "function") {
        window.duplicatePage(page);
    } else if (typeof window.createEmptyPageUnder === "function") {
        window.createEmptyPageUnder(page);
    } else {
        alert("Brak funkcji duplikowania strony.");
    }
};

// ＋ dodaj pustą stronę POD aktualną
btnAdd.onclick = () => {
    if (typeof window.createBlankPageFromMainButton === "function") {
        window.createBlankPageFromMainButton(page);
    } else if (typeof window.createNewPage === "function") {
        window.createNewPage();
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
btnDelete.onclick = async () => {
    let confirmed = true;
    if (typeof window.showActionConfirmModal === "function") {
        confirmed = await window.showActionConfirmModal({
            title: "Usuń stronę",
            message: "Czy na pewno chcesz usunąć tę stronę?",
            confirmText: "Usuń",
            cancelText: "Anuluj",
            tone: "danger"
        });
    } else {
        confirmed = confirm("Czy na pewno chcesz usunąć tę stronę?");
    }
    if (confirmed) {
        window.deletePage(page);
    }
};

    // === KOPIOWANIE + WKLEJANIE + MENU WARSTW ===
    let floatingButtons = null;
    let pageHeaderFloatingMenu = null;
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

    function removePageHeaderFloatingMenu() {
      if (!pageHeaderFloatingMenu) return;
      pageHeaderFloatingMenu.remove();
      pageHeaderFloatingMenu = null;
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
      return document.getElementById('headerPageSettingsMenuHost') || null;
    }

    function setHeaderPageSettingsToggleState(isOpen) {
      const host = resolveHeaderPageSettingsAnchor();
      if (!host) return;
      host.classList.toggle('is-open', !!isOpen);
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
        dispatchCanvasModified(stage, { historyMode: 'immediate', historySource: 'align' });
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
      const bgZ = typeof bgRect?.getZIndex === "function" ? bgRect.getZIndex() : -1;
      const safeGroupZ = Math.max(minZ, bgZ + 1);

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
      group.setZIndex(safeGroupZ);

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
      dispatchCanvasModified(stage, { historyMode: 'immediate', historySource: 'group' });
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
	      page.transformer.forceUpdate && page.transformer.forceUpdate();
	      highlightSelection();
	      layer.batchDraw();
	      transformerLayer.batchDraw();
      dispatchCanvasModified(stage, { historyMode: 'immediate', historySource: 'ungroup' });
      showFloatingButtons();
    }

    page.groupSelectedNodes = groupSelectedNodes;
    page.ungroupSelectedNodes = ungroupSelectedNodes;

    function positionFloatingMenu(menuEl) {
      if (!menuEl) return;
      const uiZoom = getViewportUiZoom();
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
      menuEl.style.left = `${centerX / uiZoom}px`;
      menuEl.style.top = `${top / uiZoom}px`;
      menuEl.style.transform = 'translateX(-50%)';
    }

    function positionSubmenuMenu(submenuEl) {
      if (!submenuEl) return;
      const uiZoom = getViewportUiZoom();
      const floating = document.getElementById('floatingMenu');
      if (floating) {
        const fRect = floating.getBoundingClientRect();
        submenuEl.style.left = `${(fRect.left + fRect.width / 2) / uiZoom}px`;
        submenuEl.style.top = `${(fRect.bottom + 8) / uiZoom}px`;
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
      submenuEl.style.left = `${(rect.left + rect.width / 2) / uiZoom}px`;
      submenuEl.style.top = `${top / uiZoom}px`;
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
      const uiZoom = getViewportUiZoom();

      return {
        left: (wrapRect.left + minX * scaleX) / uiZoom,
        top: (wrapRect.top + minY * scaleY) / uiZoom,
        width: ((maxX - minX) * scaleX) / uiZoom,
        height: ((maxY - minY) * scaleY) / uiZoom
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
        <button class="group-quick-btn" data-action="${canUngroup ? "ungroup" : "group"}" style="color:#0f172a;">
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
      const headerMenuHost = document.getElementById('headerPageSettingsMenuHost');
      const anchorEl = (opts && opts.anchorEl) || headerMenuHost || resolveHeaderPageSettingsAnchor();
      const useHeaderAnchor = !!headerMenuHost;

      const panel = document.createElement('div');
      panel.id = useHeaderAnchor && headerMenuHost ? 'pageHeaderFloatingMenu' : 'floatingMenu';
      panel.className = `floating-menu-page${useHeaderAnchor ? ' floating-menu-page--header' : ''}`;
      panel.style.cssText = useHeaderAnchor && headerMenuHost
        ? `
          position: static;
          z-index: auto;
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(9, 14, 24, 0.96);
          padding: 4px 8px;
          border-radius: 14px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.22);
          border: 1px solid rgba(255,255,255,0.08);
          pointer-events: auto;
          font-size: 11px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          max-width: min(360px, calc(100vw - 420px));
          flex: 0 1 auto;
        `
        : `
          position: fixed;
          top: 28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(9, 14, 24, 0.96);
          padding: 8px 12px;
          border-radius: 14px;
          box-shadow: 0 14px 34px rgba(0,0,0,0.34);
          border: 1px solid rgba(255,255,255,0.08);
          pointer-events: auto;
          font-size: 13px;
          font-weight: 500;
          backdrop-filter: blur(10px);
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

      if (useHeaderAnchor && headerMenuHost) {
        removePageHeaderFloatingMenu();
        headerMenuHost.appendChild(panel);
        pageHeaderFloatingMenu = panel;
      } else {
        document.body.appendChild(panel);
        floatingButtons = panel;
      }

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
            dispatchCanvasModified(stage, { historySource: 'page-background' });
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

      if (!useHeaderAnchor || !headerMenuHost) {
        const posHandler = () => {
          if (!floatingButtons) return;
          positionFloatingMenu(floatingButtons);
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
      }

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
          gap: 8px;
          background: rgba(10,16,28,0.94);
          padding: 8px 10px;
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.34);
          border: 1px solid rgba(255,255,255,0.08);
          pointer-events: auto;
          font-size: 12px;
          font-weight: 500;
          backdrop-filter: blur(10px);
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
      page._pageFloatingMenuOpen = !!pageHeaderFloatingMenu;
      page._pageFloatingMenuHeader = !!pageHeaderFloatingMenu;
      setHeaderPageSettingsToggleState(!!pageHeaderFloatingMenu);

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
    const img = resolveSelectedImageActionTargetFromSelection(page.selectedNodes);
    if (!img) return alert("Zaznacz zdjęcie, aby użyć efektów.");
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
      page._pageFloatingMenuOpen = !!pageHeaderFloatingMenu;
      page._pageFloatingMenuHeader = !!pageHeaderFloatingMenu;
      if (!pageHeaderFloatingMenu && window._activePageFloatingOwner === page) {
          window._activePageFloatingOwner = null;
      }
      setHeaderPageSettingsToggleState(!!pageHeaderFloatingMenu);
  }
  function hidePageFloatingMenu() {
      removeFloatingMenu();
      removePageHeaderFloatingMenu();
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
page.hidePageFloatingMenu = hidePageFloatingMenu;

    function resolveSelectedImageActionTarget(node) {
        if (!node) return null;
        const isEligibleImageNode = (img) => (
            img instanceof Konva.Image &&
            img.getAttr &&
            !img.getAttr("isBarcode") &&
            !img.getAttr("isQRCode") &&
            !img.getAttr("isEAN") &&
            !img.getAttr("isTNZBadge") &&
            !img.getAttr("isCountryBadge") &&
            !img.getAttr("isOverlayElement") &&
            !img.getAttr("isBgBlur")
        );

        if (isEligibleImageNode(node)) return node;
        if (typeof node.find !== "function") return null;

        const rawImages = node.find((child) => isEligibleImageNode(child));
        const images = typeof rawImages?.toArray === "function"
            ? rawImages.toArray()
            : Array.from(rawImages || []);
        if (!images.length) return null;

        const preferred = images.find((img) =>
            img.getAttr("isProductImage") ||
            img.getAttr("isUserImage") ||
            img.getAttr("isSidebarImage") ||
            img.getAttr("isDesignElement")
        );
        return preferred || images[0] || null;
    }

    function resolveSelectedImageActionTargetFromSelection(selectedNodes) {
        const normalized = normalizeSelection(Array.isArray(selectedNodes) ? selectedNodes : []);
        for (const node of normalized) {
            const img = resolveSelectedImageActionTarget(node);
            if (img) return img;
        }
        return null;
    }

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
        const pastedSlotMap = {};

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
            registerPastedCatalogClone(page, src, clone, pastedSlotMap);
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
            dispatchCanvasModified(stage, { historyMode: 'immediate', historySource: 'paste' });
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
            dispatchCanvasModified(stage, { historyMode: 'immediate', historySource: 'style-paste' });
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
    const pickIsDirectEditableText = isDirectModuleEditableTextNode(pick);
    const pickUserGroupAncestor = (() => {
        if (pickIsDirectEditableText) return null;
        let cur = pick;
        while (cur && cur.getParent) {
            const parent = cur.getParent();
            if (!(parent instanceof Konva.Group)) break;
            if (parent.getAttr && parent.getAttr("isUserGroup")) return parent;
            cur = parent;
        }
        return null;
    })();
    if (pickUserGroupAncestor) {
        pick = pickUserGroupAncestor;
    } else if (
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
        if (!pickIsPriceLike && !pickIsDirectEditableText) {
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
    const rawTargetIsDirectEditableText =
        typeof window.isDirectModuleEditableTextNode === "function" &&
        window.isDirectModuleEditableTextNode(rawTarget);
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
    const targetUserGroupAncestor = rawTargetIsDirectEditableText ? null : getUserGroupAncestor(target);
    if (targetUserGroupAncestor) {
        target = targetUserGroupAncestor;
    } else if (
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
        if (!targetIsPriceLike && !rawTargetIsDirectEditableText) {
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
                        const fallbackIsDirectEditableText =
                            typeof window.isDirectModuleEditableTextNode === "function" &&
                            window.isDirectModuleEditableTextNode(fallbackPick);
                        const fallbackUserGroupAncestor = fallbackIsDirectEditableText ? null : getUserGroupAncestor(fallbackPick);
                        if (fallbackUserGroupAncestor) {
                            fallbackPick = fallbackUserGroupAncestor;
                        } else if (
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
                            if (!fallbackIsPriceLike && !fallbackIsDirectEditableText) {
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

	    const previousSelection = normalizeSelection(Array.isArray(page.selectedNodes) ? page.selectedNodes.slice() : []);
	    const wasSelected =
	        previousSelection.includes(rawTarget) ||
	        (rawTarget && rawTarget.getParent && previousSelection.includes(rawTarget.getParent()));
	    const wasSingleSelectedBeforeClick = !!(
	        previousSelection.length === 1 &&
	        (
	            previousSelection[0] === rawTarget ||
	            (rawTarget && rawTarget.getParent && previousSelection[0] === rawTarget.getParent())
	        )
	    );

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
                isCropCapableImageNode(autoTarget)
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

    const selectedImage = (page.selectedNodes.length === 1 && page.selectedNodes[0] instanceof Konva.Image)
        ? page.selectedNodes[0]
        : null;
    const cropSelectionActive = !!(selectedImage && page._cropMode && page._cropTarget === selectedImage);
	    const shouldEnterCropOnSecondClick = !!(
	        selectedImage &&
	        wasSingleSelectedBeforeClick &&
	        !e.evt.shiftKey &&
	        rawTarget === selectedImage &&
	        !cropSelectionActive &&
	        isCropCapableImageNode(selectedImage)
	    );
    if (shouldEnterCropOnSecondClick) {
        const cropEnabled = enableCropMode(page, selectedImage);
        if (!cropEnabled) {
            disableCropMode(page);
            page.transformer.nodes([selectedImage]);
        }
        page.layer.find(".selectionOutline").forEach((n) => { try { n.destroy(); } catch (_e) {} });
        showFloatingButtons();
        page.layer.batchDraw();
        page.transformerLayer.batchDraw();
        return;
    }

    // === zastosowanie zmiany do transformera + outline ===
    const singleImage = (page.selectedNodes.length === 1 && page.selectedNodes[0] instanceof Konva.Image);
	    if (singleImage) {
	        const img = page.selectedNodes[0];
	        const cropActiveForImage = !!(page._cropMode && page._cropTarget === img);
	        if (cropActiveForImage && isCropCapableImageNode(img)) {
	            page.transformer.nodes([img]);
	        } else {
	            disableCropMode(page);
	            page.transformer.nodes([img]);
	        }
	    } else {
	        disableCropMode(page);
	        page.transformer.nodes(page.selectedNodes);
	    }
        try { page.transformer.forceUpdate && page.transformer.forceUpdate(); } catch (_e) {}

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

    applyTransformerProfileForSelection(page);
});

// === WEJŚCIE W CROP PO DWUKLIKU (dodatkowo działa też drugi klik na zaznaczonym obrazie) ===
stage.on("dblclick dbltap", (e) => {
    if (window.isEditingText) return;
    const rawTarget = e && e.target ? e.target : null;
    if (!(rawTarget instanceof Konva.Image)) return;

    if (!isCropCapableImageNode(rawTarget)) return;

    document.activeStage = stage;
    page.selectedNodes = [rawTarget];
    try { disableCropMode(page); } catch (_e) {}

    const cropEnabled = enableCropMode(page, rawTarget);
    if (!cropEnabled) {
        try { disableCropMode(page); } catch (_e) {}
        page.transformer.nodes([rawTarget]);
    }

    page.layer.find(".selectionOutline").forEach((n) => { try { n.destroy(); } catch (_e) {} });
    highlightSelection();
    showFloatingButtons();
    page.layer.batchDraw();
    page.transformerLayer.batchDraw();
});



	    // === TRANSFORMSTART – ZAPISUJEMY STAN ===
	    stage.on('transformstart', () => {
	   // 🔥 usuń stare obrysy i dodaj nowe zgodne z aktualnym rozmiarem
	page.layer.find('.selectionOutline').forEach(n => n.destroy());
        if (dragMoveRafId) {
            cancelAnimationFrame(dragMoveRafId);
            dragMoveRafId = 0;
        }
        dragMovePendingNode = null;
        dragGuideStopsCache = null;
        dragGuideNode = null;
        dragGuideIgnoredNodes = null;
        dragGuideSnapState = null;
        clearSmartGuides();



	    page._oldTransformBox = page.transformer.getClientRect();
	});
    
    // === EVENTY TRANSFORMACJI ===
    // Nie wysyłamy canvasModified na dragstart — to powodowało
    // kosztowne snapshoty historii/autosave jeszcze przed realną zmianą.
	    stage.on('dragend transformend', () => {
        dragMovePendingNode = null;
        dragGuideStopsCache = null;
        dragGuideNode = null;
        dragGuideIgnoredNodes = null;
        dragGuideSnapState = null;
        clearSmartGuides();
	        try {
	            if (page.transformer && page.transformer.nodes && page.transformer.nodes().length) {
	                page.transformer.forceUpdate && page.transformer.forceUpdate();
                page.transformerLayer && page.transformerLayer.batchDraw && page.transformerLayer.batchDraw();
            }
        } catch (_e) {}
        schedulePageTask(page, "canvasModifiedDispatch", () => {
            dispatchCanvasModified(stage, { historyMode: 'immediate', historySource: 'transform' });
        }, 50);
    });

    pages.push(page);
    drawPage(page);
    fixProductTextSlotIndex(page);

    schedulePageTask(page, "canvasCreatedDispatch", () => {
        window.dispatchEvent(new CustomEvent('canvasCreated', { detail: stage }));
    }, 100);

    if (!window.__projectLoadInProgress) {
        schedulePageTask(page, "initialHistorySnapshot", () => {
            dispatchCanvasModified(stage, { historyMode: 'immediate', historySource: 'page-create' });
        }, 120);
    }

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

    const targetWidth = `${W}px`;
    const targetHeight = `${H}px`;
    const wrapperNeedsUpdate =
        wrapper.style.width !== targetWidth ||
        wrapper.style.height !== targetHeight ||
        wrapper.style.overflow !== "hidden";

    if (wrapperNeedsUpdate) {
        wrapper.style.width = targetWidth;
        wrapper.style.height = targetHeight;
        wrapper.style.overflow = "hidden";
    }

    const stage = page.stage;
    if (!stage) return;
    const stageNeedsUpdate =
        stage.width() !== W ||
        stage.height() !== H;

    if (!wrapperNeedsUpdate && !stageNeedsUpdate) return;

    // Konva Stage też musi się odświeżyć
    stage.width(W);
    stage.height(H);
    stage.batchDraw();
};

// natychmiastowe poprawienie wymiarów
wrapperFixer();

// poprawianie przy zmianie stylu lub zoomu
schedulePageTask(page, "wrapperFixer:50", wrapperFixer, 50);
schedulePageTask(page, "wrapperFixer:250", wrapperFixer, 250);
schedulePageTask(page, "wrapperFixer:500", wrapperFixer, 500);

}

function createPageThroughFactory(n, prods) {
    if (window.PageFactory && typeof window.PageFactory.createPage === "function") {
        const page = window.PageFactory.createPage(n, prods);
        if (page) return page;
    }
    return createPage(n, prods);
}

// === USUWANIE STRONY – GLOBALNA FUNKCJA ===
window.deletePage = function(page) {
    if (window.PageActions && typeof window.PageActions.deletePage === "function") {
        return window.PageActions.deletePage(page);
    }
    const index = pages.indexOf(page);
    if (index === -1) return;
    if (pagePerfObserver && page?.container) {
        try { pagePerfObserver.unobserve(page.container); } catch (_e) {}
    }
    if (page && page.__scheduledTasks) {
        Object.values(page.__scheduledTasks).forEach((timerId) => {
            try { clearTimeout(timerId); } catch (_e) {}
        });
        page.__scheduledTasks = Object.create(null);
    }

    page.stage.destroy();
    page.container.remove();
    pages.splice(index, 1);

    pages.forEach((p, i) => {
        p.number = i + 1;
        const h3 = p.container.querySelector('h3 span');
        if (h3) h3.textContent = `Strona ${i + 1}`;
    });
    queueRefreshPagesPerf();
};

window.duplicatePage = function(page) {
    if (window.PageActions && typeof window.PageActions.duplicatePage === "function") {
        return window.PageActions.duplicatePage(page);
    }
    if (typeof window.createEmptyPageUnder === "function") {
        return window.createEmptyPageUnder(page);
    }
    return null;
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
    queueRefreshPagesPerf();
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
        enableEditableText(indexObj, page);

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

.page-btn.magic-layout {
    width: 40px;
    color: #081014;
    background: linear-gradient(135deg, #d8ff1f 0%, #b8f111 100%);
    border-color: rgba(216,255,31,0.36);
    box-shadow: 0 10px 22px rgba(216,255,31,0.18);
}

.page-btn.magic-layout i {
    font-size: 15px;
}

.page-btn:hover {
    background: #e2e2e2;
}

.page-btn.magic-layout:hover {
    background: linear-gradient(135deg, #e3ff58 0%, #c8f333 100%);
}

.page-btn.grid.active {
    background: #111827;
    color: #fff;
    border-color: #f5f7fb;
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

// === SUBMENU POD FLOATING MENU ===
function createFloatingSubmenuElement() {
    const el = document.createElement("div");
    el.id = "floatingSubmenu";
    el.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(180deg,#0d1320 0%,#09101a 100%);
        padding: 12px 18px;
        border-radius: 16px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.25);
        border: 1px solid #ccc;
        z-index: 100002;
        display: none;
        gap: 12px;
        align-items: center;
        max-width: 92vw;
        max-height: calc(100vh - 24px);
        overflow: visible;
    `;
    document.body.appendChild(el);
    return el;
}

let submenu = null;
function ensureFloatingSubmenu() {
    if (submenu && submenu.isConnected) return submenu;
    const existing = document.getElementById("floatingSubmenu");
    if (existing) {
        submenu = existing;
        return submenu;
    }
    submenu = createFloatingSubmenuElement();
    return submenu;
}
ensureFloatingSubmenu();

window.showSubmenu = (html, opts = {}) => {
    const submenu = ensureFloatingSubmenu();
    const floating = document.getElementById("floatingMenu");
    const submenuWidth = opts.width || (floating ? floating.offsetWidth + "px" : "auto");
    const uiZoom = getViewportUiZoom();
    const anchor = String(opts.anchor || "menu").trim().toLowerCase();

    submenu.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;width:${submenuWidth};justify-content:center;">
            ${html}
        </div>
    `;
    submenu.className = opts.className || "";
    submenu.style.maxWidth = opts.maxWidth || "92vw";
    submenu.style.display = "flex";
    submenu.style.zIndex = String(opts.zIndex || (anchor === "center" ? 1000003 : 100002));
    submenu.style.overflow = anchor === "center" ? "auto" : "visible";
    // pozycjonowanie względem aktualnej strony/menupaska
    if (anchor === "center") {
        submenu.style.left = "50%";
        submenu.style.top = "50%";
        submenu.style.transform = "translate(-50%, -50%)";
        return;
    }
    if (floating) {
        const fRect = floating.getBoundingClientRect();
        submenu.style.left = `${(fRect.left + fRect.width / 2) / uiZoom}px`;
        submenu.style.top = `${(fRect.bottom + 8) / uiZoom}px`;
        submenu.style.transform = 'translateX(-50%)';
    } else {
        const active = window.pages?.find(p => p.stage === document.activeStage);
        const wrap =
            active?.container?.querySelector('.page-zoom-wrap') ||
            active?.container?.querySelector('.canvas-wrapper');
        if (wrap) {
            const rect = wrap.getBoundingClientRect();
            submenu.style.left = `${(rect.left + rect.width / 2) / uiZoom}px`;
            submenu.style.top = `${Math.max(12, rect.top + 12) / uiZoom}px`;
            submenu.style.transform = 'translateX(-50%)';
        }
    }
};

window.hideSubmenu = () => {
    const submenu = ensureFloatingSubmenu();
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

    const pdfMetrics = getPdfPageMetrics(exportPages[0]);
    const pdf = new jsPDF({
        orientation: pdfMetrics.orientation,
        unit: "mm",
        format: [pdfMetrics.pageWidthMm, pdfMetrics.pageHeightMm]
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
            const data = exportStageToDataURLWithBackground(page.stage, {
                mimeType: "image/jpeg",
                quality: 1.0,
                pixelRatio: 3,
                backgroundColor: "#ffffff"
            });

            // 🔹 4. Dodaj stronę do PDF
            if (i > 0) pdf.addPage([pdfMetrics.pageWidthMm, pdfMetrics.pageHeightMm], pdfMetrics.orientation);
            pdf.addImage(data, 'JPEG', 0, 0, pdfMetrics.pageWidthMm, pdfMetrics.pageHeightMm);
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

    const pdfMetrics = getPdfPageMetrics(pages[0]);
    const pdf = new jsPDF({
        orientation: pdfMetrics.orientation,
        unit: "mm",
        format: [pdfMetrics.pageWidthMm, pdfMetrics.pageHeightMm]
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
            const data = exportStageToDataURLWithBackground(page.stage, {
                mimeType: "image/jpeg",
                quality: 0.82,
                pixelRatio: 1.35,
                backgroundColor: "#ffffff"
            });

            if (i > 0) pdf.addPage([pdfMetrics.pageWidthMm, pdfMetrics.pageHeightMm], pdfMetrics.orientation);
            pdf.addImage(data, 'JPEG', 0, 0, pdfMetrics.pageWidthMm, pdfMetrics.pageHeightMm);
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
    const headerMenu = document.getElementById('pageHeaderFloatingMenu');
    if (headerMenu) headerMenu.remove();
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
    window.__PROJECT_BACKGROUND_DEFAULT = null;
};

function revealCreatedPage(page) {
    if (window.PageActions && typeof window.PageActions.revealCreatedPage === "function") {
        return window.PageActions.revealCreatedPage(page);
    }
    const container = page && page.container;
    if (!container || !(container instanceof HTMLElement)) return;

    requestAnimationFrame(() => {
        container.classList.remove("page-new-highlight");
        void container.offsetWidth;
        container.classList.add("page-new-highlight");
        const headerOffset = 124;
        const rect = container.getBoundingClientRect();
        const absoluteTop = window.scrollY + rect.top;
        const targetTop = Math.max(0, absoluteTop - headerOffset);
        window.scrollTo({
            top: targetTop,
            behavior: "smooth"
        });
        window.setTimeout(() => {
            container.classList.remove("page-new-highlight");
        }, 1400);
    });
}

const floatingBtnStyle = document.createElement('style');
floatingBtnStyle.textContent = `
    .floating-menu-page .page-fab-title {
        font-size: 12px;
        font-weight: 700;
        color: #f5f7fb;
        letter-spacing: 0.1px;
        margin-right: 2px;
    }
    .floating-menu-page.floating-menu-page--header {
        min-height: 38px;
        border-radius: 14px;
        padding: 4px 8px;
        gap: 6px;
        background: rgba(9, 14, 24, 0.96);
        border-color: rgba(255,255,255,0.08);
        box-shadow: 0 10px 22px rgba(0,0,0,0.22);
        max-width: min(360px, calc(100vw - 420px));
        align-items: center;
    }
    .floating-menu-page.floating-menu-page--header .page-fab-title {
        display: none;
    }
    .floating-menu-page.floating-menu-page--header .page-fab-group {
        gap: 6px;
        min-height: 28px;
        padding: 0 8px;
        border-radius: 10px;
        background: linear-gradient(180deg, rgba(24, 33, 50, 0.94) 0%, rgba(16, 22, 34, 0.98) 100%);
        border: 1px solid rgba(255,255,255,0.06);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
    }
    .floating-menu-page.floating-menu-page--header .page-fab-label {
        font-size: 8px;
        letter-spacing: 0.1em;
        color: #8f9ab0;
    }
    .floating-menu-page.floating-menu-page--header .page-fab-color {
        width: 26px;
        height: 20px;
        border-radius: 6px;
    }
    .floating-menu-page.floating-menu-page--header .page-fab-range {
        width: 68px;
    }
    .floating-menu-page.floating-menu-page--header .page-fab-value {
        min-width: 28px;
        font-size: 9px;
    }
    .floating-menu-page.floating-menu-page--header .page-fab-reset {
        min-height: 28px;
        padding: 0 10px;
        font-size: 9px;
        border-radius: 10px;
    }
    .floating-menu-page .page-fab-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        color: #c9d3e7;
    }
    .floating-menu-page .page-fab-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.15px;
        color: #95a1b8;
        text-transform: uppercase;
    }
    .floating-menu-page .page-fab-color {
        width: 34px;
        height: 28px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        background: rgba(255,255,255,0.04);
        cursor: pointer;
        padding: 2px;
    }
    .floating-menu-page .page-fab-range {
        width: 104px;
        accent-color: #27cbad;
        cursor: pointer;
    }
    .floating-menu-page .page-fab-value {
        min-width: 40px;
        text-align: right;
        font-weight: 700;
        color: #f5f7fb;
        font-size: 11px;
    }
    .floating-menu-page .page-fab-reset {
        padding: 7px 12px;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 999px;
        cursor: pointer;
        color: #f5f7fb;
        background: rgba(255,255,255,0.04);
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    }
    .floating-menu-page .page-fab-reset:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(0,0,0,0.24);
        border-color: rgba(39,203,173,0.28);
        background: rgba(39,203,173,0.1);
    }
    .fab-btn {
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 999px;
        cursor: pointer;
        color: #e8edf6;
        background: linear-gradient(180deg, rgba(28, 36, 54, 0.94) 0%, rgba(17, 24, 39, 0.98) 100%);
        min-width: 70px;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        letter-spacing: 0.1px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        line-height: 1.1;
        text-align: center;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 18px rgba(0,0,0,0.18);
    }
    .fab-btn i { font-size: 11px; opacity: 0.85; color: #a8b4c9; }
    .fab-copy,
    .fab-stylecopy,
    .fab-magiclayout,
    .fab-cut,
    .fab-align,
    .fab-front,
    .fab-back,
    .fab-forward,
    .fab-backward,
    .fab-removebg,
    .fab-effects,
    .fab-barcolor { border-color:rgba(255,255,255,0.08); color:#e8edf6; }
    .fab-delete { border-color:rgba(255,107,107,0.24); color:#ff7b88; }
    .fab-delete i { color:#ff7b88; }
    .fab-magiclayout {
        border-color: rgba(216,255,31,0.26);
        color: #f2ffd0;
        background: linear-gradient(180deg, rgba(59, 78, 14, 0.62) 0%, rgba(40, 57, 12, 0.92) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 20px rgba(131, 173, 18, 0.16);
    }
    .fab-magiclayout i {
        color: #d8ff1f;
    }
    .fab-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 24px rgba(0,0,0,0.24);
        border-color:rgba(216,255,31,0.24);
        background: linear-gradient(180deg, rgba(34, 44, 64, 0.96) 0%, rgba(20, 28, 44, 0.98) 100%);
    }
    .fab-btn:hover i {
        color: #d8ff1f;
    }
    #groupQuickMenu .group-quick-btn {
        border: 1px solid rgba(255,255,255,0.10);
        background: #ffffff;
        color: #f5f7fb;
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
        border: 1px solid rgba(255,255,255,0.10);
        background: #ffffff;
        color: #f5f7fb;
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
        background: rgba(216,255,31,0.14);
        color: #1d4ed8;
    }
`;
document.head.appendChild(floatingBtnStyle);
const imgFxStyle = document.createElement('style');
imgFxStyle.textContent = `
    .imgfx-submenu {
        padding: 14px 16px;
        border-color: rgba(255,255,255,0.12) !important;
        box-shadow: 0 24px 70px rgba(0,0,0,0.42) !important;
    }
    .imgfx-panel {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        width: min(1100px, 94vw);
        min-width: 0;
        max-width: 100%;
        max-height: 72vh;
        overflow: auto;
        font-family: Arial, sans-serif;
    }
    @media (max-width: 960px) {
        .imgfx-panel {
            grid-template-columns: 1fr;
        }
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
        color: #f5f7fb;
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
        orientation: (typeof window.getPdfOrientationForCurrentCatalogPage === "function"
            ? window.getPdfOrientationForCurrentCatalogPage()
            : (Number(W) > Number(H) ? "l" : "p")),
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

        if (typeof window.togglePageEditForPage === "function") {
            window.togglePageEditForPage(page);
            return;
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
    targetEl.closest('#pageHeaderFloatingMenu') ||
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
    dispatchCanvasModified(page.stage, { historySource: 'nudge' });
});

function getCanvasModifiedStage(detail) {
    if (detail && typeof detail === 'object' && Object.prototype.hasOwnProperty.call(detail, 'stage')) {
        return detail.stage || null;
    }
    return detail || null;
}

function dispatchCanvasModified(stage, meta = {}) {
    const detail = {
        ...(meta && typeof meta === 'object' ? meta : {}),
        stage
    };
    window.dispatchEvent(new CustomEvent('canvasModified', { detail }));
}

// Gdy modyfikujemy cokolwiek na stronie → oznacz ją jako aktywną
window.addEventListener('canvasModified', (e) => {
    const activeStage = getCanvasModifiedStage(e && e.detail);
    if (activeStage) {
        document.activeStage = activeStage;
    }
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
    const host = document.getElementById('headerPageSettingsMenuHost');
    if (typeof page.showPageFloatingMenu === "function") {
        page.showPageFloatingMenu({ anchorEl: host || undefined });
        return;
    }
    if (typeof window.openPageEdit === "function") {
        window.openPageEdit(page);
        return;
    }
    console.error("Brak funkcji openPageEdit!");
};

window.ensureHeaderPageSettingsVisible = function() {
    const host = document.getElementById('headerPageSettingsMenuHost');
    const editorView = document.getElementById('editorView');
    if (!host || !editorView || window.getComputedStyle(editorView).display === 'none') return false;
    const page = getActivePage();
    if (!page || page.isCover || typeof page.showPageFloatingMenu !== "function") return false;
    const existing = document.getElementById('pageHeaderFloatingMenu');
    if (existing && window._activePageFloatingOwner === page) return true;
    page.showPageFloatingMenu({ anchorEl: host });
    return true;
};

if (!window.__headerPageSettingsAutoInit) {
    window.__headerPageSettingsAutoInit = true;
    const scheduleEnsureHeaderPageSettings = () => {
        window.requestAnimationFrame(() => {
            try { window.ensureHeaderPageSettingsVisible?.(); } catch (_e) {}
        });
    };
    window.addEventListener('canvasModified', scheduleEnsureHeaderPageSettings);
    document.addEventListener('click', (e) => {
        const target = e.target && e.target.closest ? e.target.closest('.page-container, .canvas-wrapper, .page-zoom-wrap') : null;
        if (!target) return;
        setTimeout(() => {
            try { window.ensureHeaderPageSettingsVisible?.(); } catch (_e) {}
        }, 0);
    }, true);
    setTimeout(() => {
        try { window.ensureHeaderPageSettingsVisible?.(); } catch (_e) {}
    }, 200);
}

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
    const pastedSlotMap = {};

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
        registerPastedCatalogClone(page, src, clone, pastedSlotMap);
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
        dispatchCanvasModified(page.stage, { historyMode: 'immediate', historySource: 'paste' });
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

function getSystemClipboardImageFile(clipboardData) {
    const items = Array.from(clipboardData?.items || []);
    for (const item of items) {
        if (String(item?.type || "").toLowerCase().startsWith("image/")) {
            const file = item.getAsFile?.();
            if (file) return file;
        }
    }
    const files = Array.from(clipboardData?.files || []);
    return files.find((file) => String(file?.type || "").toLowerCase().startsWith("image/")) || null;
}

function getClipboardImagePastePointer(page) {
    if (!page || !page.stage) return { x: 100, y: 100 };
    const stage = page.stage;
    const pointer = stage.getPointerPosition?.();
    if (pointer) return pointer;
    const stageW = Number(stage.width?.() || W || 0);
    const stageH = Number(stage.height?.() || H || 0);
    return {
        x: Math.round(stageW * 0.5) || 100,
        y: Math.round(stageH * 0.38) || 100
    };
}

async function pasteSystemClipboardImageToPage(page, file, options = {}) {
    if (!page || !page.stage || !page.layer || !file || !window.Konva?.Image) return false;

    if (typeof window.ensurePageHydrated === "function") {
        try { await window.ensurePageHydrated(page, { reason: "paste-clipboard-image" }); } catch (_e) {}
    }

    let variants = null;
    try {
        if (typeof window.createImageVariantsFromFile === "function") {
            variants = await window.createImageVariantsFromFile(file, {
                cacheKey: `clipboard:${file.name || "image"}:${file.size || 0}:${file.lastModified || 0}`
            });
        }
    } catch (_e) {}

    if (!variants) {
        try {
            const fallback = await (new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("clipboard_image_read_error"));
                reader.readAsDataURL(file);
            }));
            variants = (typeof window.normalizeImageVariantPayload === "function")
                ? window.normalizeImageVariantPayload(fallback)
                : { original: fallback, editor: fallback, thumb: fallback };
        } catch (_e) {
            return false;
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
    if (!editorSrc) return false;

    const pointer = options.pointer || getClipboardImagePastePointer(page);

    return await new Promise((resolve) => {
        Konva.Image.fromURL(editorSrc, (img) => {
            if (!img) {
                resolve(false);
                return;
            }

            const stageW = Number(page.stage?.width?.() || W || img.width?.() || 1);
            const stageH = Number(page.stage?.height?.() || H || img.height?.() || 1);
            const maxWidth = Math.max(120, stageW * 0.6);
            const scale = Math.min(maxWidth / Math.max(1, Number(img.width?.() || 1)), 1);
            const scaledW = Math.max(1, Math.round(Number(img.width?.() || 1) * scale));
            const scaledH = Math.max(1, Math.round(Number(img.height?.() || 1) * scale));
            const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
            const posX = clamp(
                Math.round((Number(pointer?.x) || 0) - scaledW / 2),
                0,
                Math.max(0, stageW - scaledW)
            );
            const posY = clamp(
                Math.round((Number(pointer?.y) || 0) - scaledH / 2),
                0,
                Math.max(0, stageH - scaledH)
            );

            img.x(posX);
            img.y(posY);
            img.scale({ x: scale, y: scale });
            img.draggable(true);
            img.listening(true);
            img.setAttrs({
                isProductImage: false,
                isUserImage: true,
                isSidebarImage: true,
                slotIndex: null,
                preservedSlotIndex: null
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

            if (typeof window.activateNewImageCropSelection === "function") {
                try { window.activateNewImageCropSelection(page, img, { autoCrop: false }); } catch (_e) {}
            }

            const armSelection = () => {
                try { page.selectedNodes = [img]; } catch (_e) {}
                try { page.transformer?.nodes?.([img]); } catch (_e) {}
                try { window.applyTransformerProfileForSelection?.(page); } catch (_e) {}
                try { page.transformer?.forceUpdate?.(); } catch (_e) {}
                try { page.layer?.batchDraw?.(); } catch (_e) {}
                try { page.transformerLayer?.batchDraw?.(); } catch (_e) {}
            };
            armSelection();
            requestAnimationFrame(() => {
                armSelection();
                requestAnimationFrame(() => armSelection());
            });

            document.activeStage = page.stage;
            try {
                dispatchCanvasModified(page.stage, { historyMode: 'immediate', historySource: 'clipboard-image' });
            } catch (_e) {}
            resolve(true);
        });
    });
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

document.addEventListener('paste', async (e) => {
    if (window.isEditingText) return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;

    const page = getActivePage();
    if (!page) return;

    const imageFile = getSystemClipboardImageFile(e.clipboardData);
    if (imageFile) {
        e.preventDefault();
        e.stopPropagation();
        const inserted = await pasteSystemClipboardImageToPage(page, imageFile, {
            pointer: getClipboardImagePastePointer(page)
        });
        if (!inserted && typeof window.showAppToast === "function") {
            window.showAppToast("Nie udało się wkleić obrazu ze schowka.", "error");
        }
        return;
    }

    if (window.globalClipboard && window.globalClipboard.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const pointer = getClipboardPastePointer(page, "keyboard");
        pasteClipboardToPage(page, pointer);
        window.globalClipboardPasteCount = Math.max(0, Number(window.globalClipboardPasteCount || 0)) + 1;
    }
});

window.movePage = function(page, direction) {
    if (window.PageActions && typeof window.PageActions.movePage === "function") {
        return window.PageActions.movePage(page, direction);
    }
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
    queueRefreshPagesPerf();

    console.log(`Strona przesunięta na pozycję ${newIndex + 1}`);
};

function applyCursorEvents(page) {
    if (!page || !page.stage || typeof page.stage.find !== "function") return;
    const nodes = page.stage.find('Rect, Text, Image');
    nodes.forEach(node => {
        if (!node.draggable()) return;
        if (node.__cursorEventsBound) return;
        node.__cursorEventsBound = true;

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
    schedulePageTask(page, "applyCursorEvents", () => applyCursorEvents(page), 200);
});
function enableEditableText(node, page) {
    const layer = page.layer;
    const tr = page.transformer;
    const stage = page.stage;
    compactSidebarTextNode(node);
    const isCanvaLikeResizableTextNode = () => {
        if (!(node instanceof Konva.Text)) return false;
        if (!(node.getAttr && typeof node.getAttr === "function")) return false;
        const parent = node.getParent ? node.getParent() : null;
        if (parent && parent.getAttr && parent.getAttr("isPriceGroup")) return false;
        if (node.getAttr("isSidebarText")) return false;
        if (node.getAttr("isIndex") || node.getAttr("isCustomPackageInfo")) return false;
        if (node.getAttr("isUserText")) return true;
        if (node.getAttr("isName")) return true;
        return false;
    };
    const isSingleSelectedTextTransform = () => {
        try {
            const nodes = (tr && typeof tr.nodes === "function") ? (tr.nodes() || []) : [];
            return nodes.length === 1 && nodes[0] === node;
        } catch (_e) {
            return false;
        }
    };
    const isIdealUserTextResizeEligible = () => {
        if (!isCanvaLikeResizableTextNode()) return false;
        const rotation = Math.abs(Number(node.rotation && node.rotation()) || 0);
        return rotation < 0.01;
    };

    // Zapamiętaj oryginalne wartości
    node.originalFontSize = node.fontSize();
    node.originalWidth = node.width();
    node.originalHeight = node.height();
    node.__textResizeState = null;

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
        const resizeState = node.__textResizeState;
        if (resizeState && typeof tr.keepRatio === "function" && typeof resizeState.keepRatio === "boolean") {
            tr.keepRatio(resizeState.keepRatio);
        }
        node.__textResizeState = null;
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

    node.on("transformstart", () => {
        if (!isSingleSelectedTextTransform()) return;
        const activeAnchor = (tr && typeof tr.getActiveAnchor === "function")
            ? String(tr.getActiveAnchor() || "")
            : "";
        const pointer = (stage && typeof stage.getPointerPosition === "function")
            ? stage.getPointerPosition()
            : null;
        const isCanvaLikeTextNode = isCanvaLikeResizableTextNode();
        node.__textResizeState = {
            x: Number(node.x()) || 0,
            y: Number(node.y()) || 0,
            width: Math.max(24, Number(node.width()) || 24),
            height: Math.max(24, Number(node.height()) || 24),
            fontSize: Math.max(8, Number(node.fontSize()) || 8),
            wrap: getPreferredWrapModeForTextNode(node),
            keepRatio: (typeof tr.keepRatio === "function") ? !!tr.keepRatio() : true,
            activeAnchor,
            startPointerX: pointer ? Number(pointer.x) || 0 : ((Number(node.x()) || 0) + ((Number(node.width()) || 0) / 2)),
            rightEdge: (Number(node.x()) || 0) + Math.max(24, Number(node.width()) || 24),
            centerX: (Number(node.x()) || 0) + (Math.max(24, Number(node.width()) || 24) / 2),
            padding: Math.max(0, Number(node.padding && node.padding()) || 0)
        };
        if (isCanvaLikeTextNode && typeof tr.keepRatio === "function" && activeAnchor !== "rotater") {
            tr.keepRatio(false);
        }
        node.originalFontSize = node.fontSize();
        node.originalWidth = node.width();
        node.originalHeight = node.height();
    });

    // GŁÓWNA LOGIKA SKALOWANIA – IDENTYCZNA Z DEMO
    node.on("transform", () => {
        // Ten "Canva-like" przelicznik tekstu działa dobrze dla pojedynczego tekstu.
        // Przy multi-select powoduje rozjazdy (tekst dostaje jednocześnie skalę grupową
        // i ręczne przeliczanie width/fontSize), więc tam go pomijamy.
        if (!isSingleSelectedTextTransform()) return;
        const oldPos = node.absolutePosition();
        const activeAnchor = (tr && typeof tr.getActiveAnchor === "function")
            ? String(tr.getActiveAnchor() || "")
            : "";
        let anchorBox = null;
        try {
            anchorBox = node.getClientRect({ relativeTo: layer, skipShadow: true });
        } catch (_e) {
            anchorBox = null;
        }
        const anchorGuide = anchorBox ? {
            left: anchorBox.x,
            right: anchorBox.x + anchorBox.width,
            centerX: anchorBox.x + (anchorBox.width / 2),
            top: anchorBox.y,
            bottom: anchorBox.y + anchorBox.height,
            centerY: anchorBox.y + (anchorBox.height / 2)
        } : null;

        const resizeState = node.__textResizeState || {
            width: Math.max(24, Number(node.width()) || 24),
            height: Math.max(24, Number(node.height()) || 24),
            fontSize: Math.max(8, Number(node.fontSize()) || 8),
            wrap: getPreferredWrapModeForTextNode(node)
        };
        const scaleX = Math.max(0.001, Math.abs(Number(node.scaleX()) || 1));
        const scaleY = Math.max(0.001, Math.abs(Number(node.scaleY()) || 1));
        const widthOnlyAnchor = activeAnchor === "middle-left" || activeAnchor === "middle-right";
        const heightOnlyAnchor = activeAnchor === "top-center" || activeAnchor === "bottom-center";
        const wrapMode = resizeState.wrap || getPreferredWrapModeForTextNode(node);
        const isUserTextNode = !!(node.getAttr && node.getAttr("isUserText"));
        const isCanvaLikeTextNode = isCanvaLikeResizableTextNode();
        const pointer = (stage && typeof stage.getPointerPosition === "function")
            ? stage.getPointerPosition()
            : null;

        if (isIdealUserTextResizeEligible() && activeAnchor && activeAnchor !== "rotater" && pointer) {
            const minWidth = Math.max(40, Math.ceil((Number(resizeState.padding) || 0) * 2) + 24);
            const minFontSize = 8;
            const minPadding = 0;
            const deltaX = (Number(pointer.x) || 0) - (Number(resizeState.startPointerX) || 0);
            const isCornerAnchor = (
                activeAnchor === "top-left" ||
                activeAnchor === "top-right" ||
                activeAnchor === "bottom-left" ||
                activeAnchor === "bottom-right"
            );
            const isLeftAnchor = activeAnchor.includes("left");
            const isRightAnchor = activeAnchor.includes("right");
            const isCenterAnchor = activeAnchor.includes("center");

            let nextWidth = Math.max(24, Number(resizeState.width) || 24);
            let nextX = Number(resizeState.x) || 0;
            let nextFontSize = Math.max(8, Number(resizeState.fontSize) || 8);
            let nextPadding = Math.max(0, Number(resizeState.padding) || 0);

            if (isCornerAnchor && isRightAnchor) {
                nextWidth = Math.max(minWidth, (Number(resizeState.width) || 24) + deltaX);
                const scale = nextWidth / Math.max(1, Number(resizeState.width) || 1);
                nextX = Number(resizeState.x) || 0;
                nextFontSize = Math.max(minFontSize, (Number(resizeState.fontSize) || 8) * scale);
                nextPadding = Math.max(minPadding, (Number(resizeState.padding) || 0) * scale);
            } else if (isCornerAnchor && isLeftAnchor) {
                nextWidth = Math.max(minWidth, (Number(resizeState.width) || 24) - deltaX);
                const scale = nextWidth / Math.max(1, Number(resizeState.width) || 1);
                nextX = (Number(resizeState.rightEdge) || 0) - nextWidth;
                nextFontSize = Math.max(minFontSize, (Number(resizeState.fontSize) || 8) * scale);
                nextPadding = Math.max(minPadding, (Number(resizeState.padding) || 0) * scale);
            } else if (isRightAnchor) {
                nextWidth = Math.max(minWidth, (Number(resizeState.width) || 24) + deltaX);
                nextX = Number(resizeState.x) || 0;
            } else if (isLeftAnchor) {
                nextWidth = Math.max(minWidth, (Number(resizeState.width) || 24) - deltaX);
                nextX = (Number(resizeState.rightEdge) || 0) - nextWidth;
            } else if (isCenterAnchor) {
                nextWidth = Math.max(minWidth, (Number(resizeState.width) || 24) + (deltaX * 2));
                nextX = (Number(resizeState.centerX) || 0) - (nextWidth / 2);
            }

            if (typeof node.wrap === "function") node.wrap(wrapMode);
            node.setAttrs({
                x: nextX,
                y: Number(resizeState.y) || 0,
                width: nextWidth,
                scaleX: 1,
                scaleY: 1
            });
            if (typeof node.fontSize === "function") node.fontSize(nextFontSize);
            if (typeof node.padding === "function") node.padding(nextPadding);
            node.height(getTextNodeAutoHeight(
                node,
                Math.max(24, Math.ceil(nextFontSize * Math.max(0.7, Number(node.lineHeight && node.lineHeight()) || 1.2)))
            ));
            try { tr.forceUpdate && tr.forceUpdate(); } catch (_e) {}
            layer.batchDraw();
            page.transformerLayer.batchDraw();
            return;
        }

        let nextWidth = Math.max(24, resizeState.width * scaleX);
        let nextFontSize = Math.max(8, resizeState.fontSize);

        if (widthOnlyAnchor) {
            nextFontSize = resizeState.fontSize;
        } else if (heightOnlyAnchor) {
            nextWidth = resizeState.width;
            nextFontSize = isCanvaLikeTextNode
                ? resizeState.fontSize
                : Math.max(8, resizeState.fontSize * scaleY);
        } else {
            nextFontSize = Math.max(8, resizeState.fontSize * scaleY);
        }

        if (typeof node.wrap === "function") node.wrap(wrapMode);
        node.setAttrs({
            width: nextWidth,
            scaleX: 1,
            scaleY: 1
        });
        node.fontSize(nextFontSize);

        const minHeight = Math.max(24, Math.ceil(nextFontSize * 1.15));
        if (wrapMode === "none") {
            const requestedHeight = heightOnlyAnchor
                ? Math.max(minHeight, resizeState.height * scaleY)
                : Math.max(minHeight, resizeState.height);
            node.height(requestedHeight);
        } else {
            const autoHeight = getTextNodeAutoHeight(node, minHeight);
            if (isCanvaLikeTextNode && heightOnlyAnchor) {
                const requestedHeight = Math.max(minHeight, resizeState.height * scaleY);
                node.height(Math.max(autoHeight, requestedHeight));
            } else {
                node.height(autoHeight);
            }
        }

        if (isCanvaLikeTextNode && widthOnlyAnchor && Math.abs(Number(node.rotation && node.rotation()) || 0) < 0.01) {
            const baseX = Number(resizeState.x) || 0;
            const baseY = Number(resizeState.y) || 0;
            const baseWidth = Math.max(24, Number(resizeState.width) || 24);
            if (activeAnchor === "middle-left") {
                node.x(baseX + baseWidth - nextWidth);
            } else {
                node.x(baseX);
            }
            node.y(baseY);
            try { tr.forceUpdate && tr.forceUpdate(); } catch (_e) {}
            layer.batchDraw();
            page.transformerLayer.batchDraw();
            return;
        }

        if (isCanvaLikeTextNode && heightOnlyAnchor && Math.abs(Number(node.rotation && node.rotation()) || 0) < 0.01) {
            const baseX = Number(resizeState.x) || 0;
            const baseY = Number(resizeState.y) || 0;
            const baseHeight = Math.max(24, Number(resizeState.height) || 24);
            const nextHeight = Math.max(24, Number(node.height()) || 24);
            node.x(baseX);
            if (activeAnchor === "top-center") {
                node.y(baseY + baseHeight - nextHeight);
            } else {
                node.y(baseY);
            }
            try { tr.forceUpdate && tr.forceUpdate(); } catch (_e) {}
            layer.batchDraw();
            page.transformerLayer.batchDraw();
            return;
        }

        if (node.getAttr && node.getAttr("isSidebarText")) {
            compactSidebarTextNode(node);
        }
        let anchorRestored = false;
        if (anchorGuide && activeAnchor) {
            let nextBox = null;
            try {
                nextBox = node.getClientRect({ relativeTo: layer, skipShadow: true });
            } catch (_e) {
                nextBox = null;
            }
            if (nextBox) {
                let dx = 0;
                let dy = 0;

                if (activeAnchor.endsWith("left")) {
                    dx = anchorGuide.right - (nextBox.x + nextBox.width);
                } else if (activeAnchor.endsWith("right")) {
                    dx = anchorGuide.left - nextBox.x;
                } else if (activeAnchor.endsWith("center")) {
                    dx = anchorGuide.centerX - (nextBox.x + (nextBox.width / 2));
                }

                const keepVerticalPosition = !!(isCanvaLikeTextNode && widthOnlyAnchor);
                if (activeAnchor.startsWith("top")) {
                    dy = anchorGuide.bottom - (nextBox.y + nextBox.height);
                } else if (activeAnchor.startsWith("bottom")) {
                    dy = anchorGuide.top - nextBox.y;
                } else if (activeAnchor.startsWith("middle") && !keepVerticalPosition) {
                    dy = anchorGuide.centerY - (nextBox.y + (nextBox.height / 2));
                }

                if (dx || dy) {
                    node.position({
                        x: (Number(node.x()) || 0) + dx,
                        y: (Number(node.y()) || 0) + dy
                    });
                }
                anchorRestored = true;
            }
        }
        if (!anchorRestored) {
            node.absolutePosition(oldPos);
        }
        try { tr.forceUpdate && tr.forceUpdate(); } catch (_e) {}
        layer.batchDraw();
        page.transformerLayer.batchDraw();
    });

    // Kliknij ponownie zaznaczony tekst → edycja w miejscu (Canva‑style)
    const startInlineEdit = () => {
        if (window.isEditingText) return;
        window.hideTextToolbar?.();
        window.hideTextPanel?.();
        window.isEditingText = true;
        const canvasWrapper =
            page.container.querySelector('.canvas-wrapper') ||
            page.stage.container().parentElement ||
            page.stage.container();
        let editHost = canvasWrapper.querySelector('.inline-text-edit-host');
        if (!editHost) {
            editHost = document.createElement('div');
            editHost.className = 'inline-text-edit-host';
            Object.assign(editHost.style, {
                position: 'absolute',
                inset: '0',
                zIndex: '99998',
                pointerEvents: 'none'
            });
            canvasWrapper.appendChild(editHost);
        }
        const absScale = typeof node.getAbsoluteScale === "function"
            ? node.getAbsoluteScale()
            : { x: 1, y: 1 };
        const nodeScaleX = Math.max(0.001, Math.abs(Number(absScale.x || 1)));
        const nodeScaleY = Math.max(0.001, Math.abs(Number(absScale.y || 1)));
        const textRect = node.getClientRect({
            relativeTo: page.layer,
            skipShadow: true,
            skipStroke: true
        });
        const absX = Number(textRect.x || 0);
        const absY = Number(textRect.y || 0);
        const textWidth = Math.max(24, Number(textRect.width || node.width() || 0));
        const textMinHeight = Math.max(24, Number(textRect.height || node.height() || 0));
        const textFontSize = Math.max(
            8,
            Number(node.fontSize() || 0) * nodeScaleY
        );

        tr.hide();
        node.hide();
        layer.draw();

        const textarea = document.createElement("textarea");
        const initialTextValue = String(node.text() || "");
        const initialFontSize = Number(node.fontSize() || 0);
        const initialWidth = Number(node.width() || 0);
        const initialHeight = Number(node.height() || 0);
        editHost.appendChild(textarea);

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
            width: textWidth + "px",
            minHeight: textMinHeight + "px",
            fontSize: textFontSize + "px",
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
            caretColor: isVeryLight ? "#0f172a" : (String(node.fill() || "").trim() || "#111827"),
            resize: "none",
            zIndex: 1,
            outline: "none",
            overflow: "hidden",
            boxSizing: "border-box",
            pointerEvents: "auto"
        });

        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        textarea.style.height = textarea.scrollHeight + "px";

        const finish = () => {
            const nextText = String(textarea.value || "").length > 0 ? String(textarea.value) : "-";
            const textChanged = nextText !== initialTextValue;
            node.text(nextText);
            if (node.getAttr && node.getAttr("isSidebarText")) {
                compactSidebarTextNode(node);
            } else if (node.getAttr && node.getAttr("isUserText")) {
                const wrapMode = (typeof window.getPreferredWrapModeForTextNode === "function")
                    ? window.getPreferredWrapModeForTextNode(node)
                    : "char";
                if (typeof node.wrap === "function") node.wrap(wrapMode);
                node.height(getTextNodeAutoHeight(
                    node,
                    Math.max(24, Math.ceil((Number(node.fontSize() || 0) || 18) * (Number(node.lineHeight && node.lineHeight()) || 1.2)))
                ));
            } else if (textChanged) {
                // Shrink only after an actual text change.
                // Clicking selected text without edits must not reduce font size.
                shrinkText(node, 8);
            } else {
                if (Number.isFinite(initialFontSize) && initialFontSize > 0) node.fontSize(initialFontSize);
                if (Number.isFinite(initialWidth) && initialWidth > 0) node.width(initialWidth);
                if (Number.isFinite(initialHeight) && initialHeight > 0) node.height(initialHeight);
            }
            node.show();
            tr.show();
            tr.forceUpdate();
            layer.draw();
            textarea.remove();
            window.isEditingText = false;
            window.removeEventListener("click", close);
            requestAnimationFrame(() => {
                const selectedNow = Array.isArray(page.selectedNodes) ? page.selectedNodes : [];
                if (selectedNow.length === 1 && selectedNow[0] === node) {
                    window.showTextToolbar?.(node);
                    window.hideTextPanel?.();
                }
            });
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
                textarea.style.width = `${Math.max(24, Number(node.width() || 0) * nodeScaleX)}px`;
                textarea.style.fontSize = `${Math.max(8, Number(node.fontSize() || 0) * nodeScaleY)}px`;
            } else if (node.getAttr && node.getAttr("isUserText")) {
                const wrapMode = (typeof window.getPreferredWrapModeForTextNode === "function")
                    ? window.getPreferredWrapModeForTextNode(node)
                    : "char";
                if (typeof node.wrap === "function") node.wrap(wrapMode);
                node.height(getTextNodeAutoHeight(
                    node,
                    Math.max(24, Math.ceil((Number(node.fontSize() || 0) || 18) * (Number(node.lineHeight && node.lineHeight()) || 1.2)))
                ));
                textarea.style.fontSize = `${Math.max(8, Number(node.fontSize() || 0) * nodeScaleY)}px`;
                textarea.style.width = `${Math.max(24, Number(node.width() || 0) * nodeScaleX)}px`;
            } else {
                const newSize = shrinkText(node, 8);
                textarea.style.fontSize = `${Math.max(8, Number(newSize || 0) * nodeScaleY)}px`;
                textarea.style.width = `${Math.max(24, Number(node.width() || 0) * nodeScaleX)}px`;
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

        t.off("dblclick dbltap transform transformend transformstart click tap");
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
        const handler = async (e) => {
            if (!addTextFallback || e.evt.button !== 0) return;
            const pos = page.stage.getPointerPosition();
            if (pos) {
                if (typeof window.ensurePageHydrated === "function") {
                    try { await window.ensurePageHydrated(page, { reason: "add-text" }); } catch (_e) {}
                }
                const text = new Konva.Text({
                    text: "Kliknij, aby edytować",
                    x: pos.x,
                    y: pos.y,
                    fontSize: 18,
                    fill: "#000000",
                    fontFamily: "Arial",
                    align: "left",
                    width: Math.max(180, Math.min(320, W * 0.28)),
                    wrap: "word",
                    lineHeight: 1.2,
                    verticalAlign: "top",
                    draggable: true,
                    isUserText: true,
                    _originalText: "Kliknij, aby edytować"
                });
                text.height(getTextNodeAutoHeight(text, Math.ceil((Number(text.fontSize()) || 18) * 1.2)));
                text.x(pos.x - text.width() / 2);
                text.y(pos.y - text.height() / 2);
                page.layer.add(text);
                page.layer.batchDraw();
                enableEditableText(text, page);
                try {
                    dispatchCanvasModified(page.stage, { historyMode: 'immediate', historySource: 'add-text' });
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
                if (typeof window.ensurePageHydrated === "function") {
                    try { await window.ensurePageHydrated(page, { reason: "add-image" }); } catch (_e) {}
                }
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
                        isUserImage: true,
                        isSidebarImage: true,
                        slotIndex: null,
                        preservedSlotIndex: null
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
                    if (typeof window.activateNewImageCropSelection === "function") {
                        try { window.activateNewImageCropSelection(page, img, { autoCrop: false }); } catch (_e) {}
                    }
                    const armSelection = () => {
                        try { page.selectedNodes = [img]; } catch (_e) {}
                        try { page.transformer?.nodes?.([img]); } catch (_e) {}
                        try { window.applyTransformerProfileForSelection?.(page); } catch (_e) {}
                        try { page.transformer?.forceUpdate?.(); } catch (_e) {}
                        try { page.layer?.batchDraw?.(); } catch (_e) {}
                        try { page.transformerLayer?.batchDraw?.(); } catch (_e) {}
                    };
                    armSelection();
                    requestAnimationFrame(() => {
                        armSelection();
                        requestAnimationFrame(() => {
                            armSelection();
                        });
                    });
                    try {
                        dispatchCanvasModified(page.stage, { historyMode: 'immediate', historySource: 'add-image' });
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
        background: linear-gradient(180deg,#0d1320 0%,#09101a 100%);
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
if (window.PageFactory && typeof window.PageFactory.registerLegacyCreatePage === "function") {
    window.PageFactory.registerLegacyCreatePage(createPage);
}

if (window.PageActions && typeof window.PageActions.configure === "function") {
    window.PageActions.configure({
        getPages: () => pages,
        createPage: createPageThroughFactory,
        queueCreateZoomSlider,
        queueRefreshPagesPerf,
        getPagePerfObserver: () => pagePerfObserver
    });
}

// === GLOBALNE TWORZENIE NOWEJ, PUSTEJ STRONY ===
window.createNewPage = function(options = {}) {
    if (window.PageActions && typeof window.PageActions.createNewPage === "function") {
        return window.PageActions.createNewPage(options);
    }
    const shouldApplyProjectBackgroundDefault = !options || options.skipProjectBackgroundDefault !== true;
    const shouldRevealPage = !!(options && options.reveal);

    const newIndex = pages.length + 1;

    // Pusta lista produktów → strona bez produktów
    const emptyProducts = [];

    // Tworzymy stronę z indeksem i pustymi produktami
    const page = createPageThroughFactory(newIndex, emptyProducts);

    if (shouldApplyProjectBackgroundDefault && typeof window.applyProjectDefaultBackgroundToPage === "function") {
        Promise.resolve(window.applyProjectDefaultBackgroundToPage(page)).catch(() => {});
    }

    if (shouldRevealPage) {
        revealCreatedPage(page);
    }

    return page;
};

// === WSPÓLNY DODATEK STRONY: taka sama logika jak przycisk "Dodaj pustą stronę" ===
window.createBlankPageFromMainButton = function(parentPage = null) {
    if (window.PageActions && typeof window.PageActions.createBlankPageFromMainButton === "function") {
        return window.PageActions.createBlankPageFromMainButton(parentPage);
    }
    if (typeof window.createNewPage !== "function") return null;

    const createdPage = window.createNewPage();
    if (!createdPage) return null;

    // Jeśli wywołane z poziomu konkretnej strony (+ w toolbarze / przycisk pod stroną),
    // przesuń nowo utworzoną stronę bezpośrednio pod nią.
    if (parentPage && typeof window.movePage === "function" && Array.isArray(pages)) {
        const parentIndex = pages.indexOf(parentPage);
        let currentIndex = pages.indexOf(createdPage);
        if (parentIndex > -1 && currentIndex > -1) {
            const targetIndex = parentIndex + 1;
            while (currentIndex > targetIndex) {
                window.movePage(createdPage, -1);
                currentIndex -= 1;
            }
            while (currentIndex < targetIndex) {
                window.movePage(createdPage, +1);
                currentIndex += 1;
            }
        }
    }

    window.projectOpen = true;
    window.projectDirty = true;
    const pdfButton = document.getElementById("pdfButton");
    if (pdfButton) pdfButton.disabled = false;
    queueCreateZoomSlider();
    revealCreatedPage(createdPage);

    return createdPage;
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

  const pdfMetrics = getPdfPageMetrics(pagesToExport[0]);
  const pdf = new jsPDF({
    orientation: pdfMetrics.orientation,
    unit: "mm",
    format: [pdfMetrics.pageWidthMm, pdfMetrics.pageHeightMm]
  });

  for (let pi = 0; pi < pagesToExport.length; pi++) {
    const page = pagesToExport[pi];
    if (pi > 0) pdf.addPage([pdfMetrics.pageWidthMm, pdfMetrics.pageHeightMm], pdfMetrics.orientation);

    // białe tło
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pdfMetrics.pageWidthMm, pdfMetrics.pageHeightMm, "F");

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
      const x = pdfMetrics.x(Number(abs.x || 0) + Number(opts.xOffset || 0));
      const y = pdfMetrics.y(Number(abs.y || 0) + Number(opts.yOffset || 0));
      pdf.setFontSize(pdfMetrics.font(fontSize));
      pdf.text(lines, x, y + (opts.baselineTop ? 0 : pdfMetrics.y(fontSize)), opts.baselineTop ? { baseline: "top" } : undefined);
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
      const pdfX = pdfMetrics.x(abs.x);
      const pdfY = pdfMetrics.y(abs.y);
      const pdfW = pdfMetrics.w(w);
      const pdfH = pdfMetrics.h(h);

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
	          pdf.addImage(pngUrl, "PNG", pdfX, pdfY, pdfW, pdfH);
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
	        pdf.addImage(jpegUrl, "JPEG", pdfX, pdfY, pdfW, pdfH);
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
        const x = pdfMetrics.x(abs.x);
        const y = pdfMetrics.y(abs.y);
        const w = pdfMetrics.w((node.width() || 0) * (Number(absScale.x) || 1));
        const h = pdfMetrics.h((node.height() || 0) * (Number(absScale.y) || 1));
        const r = Math.min(pdfMetrics.w(14), pdfMetrics.h(14));

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
        const w = Math.max(1, pdfMetrics.w((node.width?.() || 0) * (Number(absScale.x) || 1)));
        const h = Math.max(1, pdfMetrics.h((node.height?.() || 0) * (Number(absScale.y) || 1)));
        const radiusRaw = Number(node.cornerRadius?.() || 0);
        const radius = Math.max(0, pdfMetrics.w(radiusRaw * (Number(absScale.x) || 1)));
        const [r, g, b] = parsePdfColor(node.fill?.() || "#2eaee8");
        pdf.setFillColor(r, g, b);
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(0.1);
        if (radius > 0) {
          pdf.roundedRect(pdfMetrics.x(abs.x), pdfMetrics.y(abs.y), w, h, radius, radius, "F");
        } else {
          pdf.rect(pdfMetrics.x(abs.x), pdfMetrics.y(abs.y), w, h, "F");
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

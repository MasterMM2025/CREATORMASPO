(function () {
  const TRIGGER_ID = "sidebarNewStyle";
  const MODAL_ID = "newStyleModal";
  const STYLE_ID = "newStyleModalTheme";
  const REFRESH_BTN_ID = "newStyleRefreshBtn";
  const CLOSE_BTN_ID = "newStyleCloseBtn";
  const PRODUCT_STATUS_ID = "newStyleProductStatus";
  const PRODUCT_SEARCH_ID = "newStyleProductSearch";
  const PRODUCT_LIST_ID = "newStyleProductList";
  const PRODUCT_JSON_ID = "newStyleProductJson";
  const WORKSPACE_STAGE_ID = "newStyleWorkspaceStage";
  const WORKSPACE_HINT_ID = "newStyleWorkspaceHint";
  const WORKSPACE_SELECTED_ID = "newStyleWorkspaceSelected";
  const SELECTED_CANVAS_ID = "newStyleCanvasProduct";
  const STYLE_NAME_ID = "newStyleStyleName";
  const STYLE_LOAD_SELECT_ID = "newStyleLoadSelect";
  const PRICE_STYLE_APPLY_SELECT_ID = "newStylePriceApplySelect";
  const PRICE_STYLE_LOAD_SELECT_ID = "newStylePriceLoadSelect";
  const PRICE_STYLE_NAME_ID = "newStylePriceStyleName";
  const STYLE_SAVE_STATUS_ID = "newStyleSaveStatus";
  const TEXT_FONT_ID = "newStyleTextFont";
  const TEXT_COLOR_ID = "newStyleTextColor";
  const TEXT_SIZE_ID = "newStyleTextSize";
  const DIVIDER_COLOR_ID = "newStyleDividerColor";
  const CURRENCY_SELECT_ID = "newStyleCurrencySelect";
  const BUILDER_NOTE_ID = "newStyleBuilderNote";
  const CUSTOM_STYLES_STORAGE_KEY = "styl_wlasny_custom_styles_v1";
  const CUSTOM_STYLES_REMOTE_PATH = "styles/styles.json";
  const CUSTOM_PRICE_STYLES_STORAGE_KEY = "styl_wlasny_custom_price_styles_v1";
  const CUSTOM_PRICE_STYLES_REMOTE_PATH = "styles/customprice.json";
  const CUSTOM_STYLES_BUCKET = "gs://pdf-creator-f7a8b.firebasestorage.app";
  const BUILDER_TAB_PRODUCT = "product";
  const BUILDER_TAB_PRICE = "price";
  const LOCKED_SYSTEM_STYLE_IDS = new Set(["styl-numer-1", "styl-numer-2", "styl-numer-3"]);
  const PRODUCT_DATA_URL = "https://raw.githubusercontent.com/MasterMM2025/masterzamowienia/refs/heads/main/pelna%20baza%20maspo.json";
  const IMAGE_BUCKET_BASE = "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/";
  const IMAGE_FOLDER = "zdjecia - World food";
  const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
  const MAX_VISIBLE_PRODUCTS = 250;
  const MODULE_BASE_WIDTH = 500;
  const MODULE_BASE_HEIGHT = 362;
  let firebaseStorageApiPromise = null;

  const state = {
    products: null,
    loadingPromise: null,
    selectedProductId: "",
    searchQuery: "",
    imageSelectionStamp: 0,
    resolvedImageByProductId: new Map(),
    resolvedImageByIndex: new Map(),
    imageResolvePromisesByIndex: new Map(),
    activeBuilderTab: BUILDER_TAB_PRODUCT,
    productWorkspaceDraft: null,
    priceWorkspaceDraft: null,
    workspace: {
      stage: null,
      layer: null,
      transformer: null,
      selectedNode: null,
      loadStamp: 0,
      resizeRaf: 0,
      resizeBound: false,
      viewportInitialized: false,
      clipboard: null,
      textEditorCleanup: null
    }
  };
  let activeLoadedStyleId = "";
  let activeLoadedPriceStyleId = "";

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
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

  function scientificToPlain(raw) {
    const txt = String(raw || "").trim();
    if (!txt) return "";
    if (!/[eE]/.test(txt)) return txt.replace(/\D/g, "");
    const n = Number(txt);
    if (!Number.isFinite(n)) return txt.replace(/\D/g, "");
    return String(Math.round(n));
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
  }

  function normalizeImportIndex(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const plain = scientificToPlain(raw);
    return plain || raw.replace(/\s+/g, "");
  }

  function buildImageUrl(index, ext) {
    const objectPath = `${IMAGE_FOLDER}/${String(index || "").trim()}.${ext}`;
    return `${IMAGE_BUCKET_BASE}${encodeURIComponent(objectPath)}?alt=media`;
  }

  function loadImageWithFallback(index) {
    const safeIndex = String(index || "").trim();
    if (!safeIndex) return Promise.resolve(null);

    return new Promise((resolve) => {
      let pointer = 0;
      const tryNext = () => {
        if (pointer >= IMAGE_EXTENSIONS.length) {
          resolve(null);
          return;
        }
        const nextUrl = buildImageUrl(safeIndex, IMAGE_EXTENSIONS[pointer++]);
        const img = new Image();
        img.onload = () => resolve(nextUrl);
        img.onerror = () => tryNext();
        img.src = nextUrl;
      };
      tryNext();
    });
  }

  function resolveProductImageUrl(product) {
    if (!product) return Promise.resolve(null);
    if (state.resolvedImageByProductId.has(product.id)) {
      return Promise.resolve(state.resolvedImageByProductId.get(product.id) || null);
    }

    const indexKey = normalizeImportIndex(product.index);
    if (!indexKey) {
      state.resolvedImageByProductId.set(product.id, null);
      return Promise.resolve(null);
    }

    if (state.resolvedImageByIndex.has(indexKey)) {
      const cached = state.resolvedImageByIndex.get(indexKey) || null;
      state.resolvedImageByProductId.set(product.id, cached);
      return Promise.resolve(cached);
    }

    if (state.imageResolvePromisesByIndex.has(indexKey)) {
      return state.imageResolvePromisesByIndex.get(indexKey).then((url) => {
        state.resolvedImageByProductId.set(product.id, url || null);
        return url || null;
      });
    }

    const resolvePromise = loadImageWithFallback(indexKey)
      .then((url) => {
        state.resolvedImageByIndex.set(indexKey, url || null);
        state.resolvedImageByProductId.set(product.id, url || null);
        state.imageResolvePromisesByIndex.delete(indexKey);
        return url || null;
      })
      .catch(() => {
        state.resolvedImageByIndex.set(indexKey, null);
        state.resolvedImageByProductId.set(product.id, null);
        state.imageResolvePromisesByIndex.delete(indexKey);
        return null;
      });

    state.imageResolvePromisesByIndex.set(indexKey, resolvePromise);
    return resolvePromise;
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

    const eanRaw = (
      row?.KOD_KRESKOWY ||
      row?.["text-right 2"] ||
      row?.ean ||
      row?.EAN ||
      ""
    );
    const ean = scientificToPlain(eanRaw) || String(eanRaw || "").trim();

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
      eanNorm: normalizeText(ean),
      brandNorm: normalizeText(brand),
      raw: row
    };
  }

  function formatPackage(product) {
    if (!product) return "-";
    const parts = [String(product.packageValue || "").trim(), String(product.packageUnit || "").trim()].filter(Boolean);
    return parts.length ? parts.join(" ") : "-";
  }

  function getSelectedProduct() {
    if (!Array.isArray(state.products) || !state.products.length) return null;
    return state.products.find((product) => product.id === state.selectedProductId) || state.products[0] || null;
  }

  function getFilteredProducts() {
    const list = Array.isArray(state.products) ? state.products : [];
    const query = normalizeText(state.searchQuery);
    if (!query) return list;
    return list.filter((product) => (
      product.nameNorm.includes(query) ||
      product.indexNorm.includes(query) ||
      product.eanNorm.includes(query) ||
      product.brandNorm.includes(query)
    ));
  }

  function setWorkspaceSelectedLabel(label) {
    const selectedEl = document.getElementById(WORKSPACE_SELECTED_ID);
    if (!selectedEl) return;
    selectedEl.textContent = `Wybrany element: ${String(label || "brak")}`;
  }

  function getFontCandidates() {
    const fromApp = typeof window.getAvailableFonts === "function" ? window.getAvailableFonts() : [];
    const base = ["Arial", "Inter", "Poppins", "Montserrat", "Roboto", "Verdana", "Georgia"];
    const seen = new Set();
    return [...base, ...fromApp]
      .map((name) => String(name || "").trim())
      .filter((name) => name && !seen.has(name.toLowerCase()) && seen.add(name.toLowerCase()));
  }

  function getFontOptionsHtml() {
    return getFontCandidates().map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  }

  function setSaveStatus(message, tone = "default") {
    const el = document.getElementById(STYLE_SAVE_STATUS_ID);
    if (!el) return;
    el.textContent = String(message || "");
    el.style.color = tone === "error" ? "#fca5a5" : "#8ea4c2";
  }

  function normalizeCustomStyleList(list) {
    return (Array.isArray(list) ? list : []).filter((item) => {
      const id = String(item?.id || "").trim();
      const label = String(item?.label || "").trim();
      if (LOCKED_SYSTEM_STYLE_IDS.has(id)) return false;
      return !!id && !!label && item?.config && typeof item.config === "object";
    });
  }

  function getCustomStyleUpdatedAt(item) {
    const value = Number(item?.updatedAt || item?.config?.updatedAt || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function mergeCustomStyleLists(primary, secondary, normalizer = normalizeCustomStyleList) {
    const normalizeList = typeof normalizer === "function" ? normalizer : normalizeCustomStyleList;
    const merged = [];
    const seen = new Map();
    const pushItem = (item, sourceRank) => {
      const id = String(item?.id || "").trim();
      if (!id) return;
      const copy = JSON.parse(JSON.stringify(item));
      const next = { ...copy, __mergeSourceRank: sourceRank };
      if (seen.has(id)) {
        const index = seen.get(id);
        const prev = merged[index];
        const nextTs = getCustomStyleUpdatedAt(next);
        const prevTs = getCustomStyleUpdatedAt(prev);
        const prevRank = Number(prev?.__mergeSourceRank || 0);
        if (nextTs > prevTs || (nextTs === prevTs && sourceRank >= prevRank)) {
          merged[index] = next;
        }
        return;
      }
      seen.set(id, merged.length);
      merged.push(next);
    };
    normalizeList(secondary).forEach((item) => pushItem(item, 1));
    normalizeList(primary).forEach((item) => pushItem(item, 2));
    return merged.map((item) => {
      if (!item || typeof item !== "object") return item;
      delete item.__mergeSourceRank;
      return item;
    });
  }

  function loadCustomStylesFromLocalStorage() {
    try {
      const raw = localStorage.getItem(CUSTOM_STYLES_STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      return normalizeCustomStyleList(parsed);
    } catch (_err) {
      return [];
    }
  }

  function saveCustomStylesToLocalStorage(list) {
    try {
      localStorage.setItem(CUSTOM_STYLES_STORAGE_KEY, JSON.stringify(normalizeCustomStyleList(list)));
    } catch (_err) {}
  }

  function upsertCustomStyleInStorage(styleDef) {
    const safe = styleDef && typeof styleDef === "object" ? styleDef : null;
    if (!safe) return [];
    const id = String(safe.id || "").trim();
    const label = String(safe.label || "").trim();
    if (!id || !label) return [];
    const list = loadCustomStylesFromLocalStorage();
    const idx = list.findIndex((item) => String(item?.id || "") === id);
    if (idx >= 0) list[idx] = safe;
    else list.unshift(safe);
    saveCustomStylesToLocalStorage(list);
    return list;
  }

  function getCustomStyleById(styleId) {
    const target = String(styleId || "").trim();
    if (!target) return null;
    const list = loadCustomStylesFromLocalStorage();
    return list.find((item) => String(item?.id || "") === target) || null;
  }

  function getSavedStylesOptionsHtml(selectedId = "") {
    const target = String(selectedId || "").trim();
    const list = loadCustomStylesFromLocalStorage();
    const labelUsage = list.reduce((acc, item) => {
      const key = String(item?.label || item?.id || "").trim().toLowerCase();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const options = ['<option value="">Wczytaj zapisany styl...</option>'];
    list.forEach((item) => {
      const id = String(item?.id || "").trim();
      const label = String(item?.label || id || "").trim();
      if (!id) return;
      const duplicateLabel = !!(label && labelUsage[label.toLowerCase()] > 1);
      const viewLabel = duplicateLabel ? `${label} [${id}]` : label;
      const selected = id === target ? ' selected' : "";
      options.push(`<option value="${escapeHtml(id)}"${selected}>${escapeHtml(viewLabel)}</option>`);
    });
    return options.join("");
  }

  function refreshSavedStylesSelect(selectedId = "") {
    const select = document.getElementById(STYLE_LOAD_SELECT_ID);
    if (!select) return;
    select.innerHTML = getSavedStylesOptionsHtml(selectedId);
    if (!selectedId) select.value = "";
  }

  function normalizeCustomPriceStyleList(list) {
    return (Array.isArray(list) ? list : []).filter((item) => {
      const id = String(item?.id || "").trim();
      const label = String(item?.label || "").trim();
      const snapshot = item?.snapshot && typeof item.snapshot === "object" ? item.snapshot : null;
      const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
      return !!id && !!label && nodes.length > 0;
    });
  }

  function loadCustomPriceStylesFromLocalStorage() {
    try {
      const raw = localStorage.getItem(CUSTOM_PRICE_STYLES_STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      return normalizeCustomPriceStyleList(parsed);
    } catch (_err) {
      return [];
    }
  }

  function saveCustomPriceStylesToLocalStorage(list) {
    try {
      localStorage.setItem(CUSTOM_PRICE_STYLES_STORAGE_KEY, JSON.stringify(normalizeCustomPriceStyleList(list)));
    } catch (_err) {}
  }

  function upsertCustomPriceStyleInStorage(styleDef) {
    const safe = styleDef && typeof styleDef === "object" ? styleDef : null;
    if (!safe) return [];
    const id = String(safe.id || "").trim();
    const label = String(safe.label || "").trim();
    if (!id || !label) return [];
    const list = loadCustomPriceStylesFromLocalStorage();
    const idx = list.findIndex((item) => String(item?.id || "") === id);
    if (idx >= 0) list[idx] = safe;
    else list.unshift(safe);
    saveCustomPriceStylesToLocalStorage(list);
    return list;
  }

  function getCustomPriceStyleById(styleId) {
    const target = String(styleId || "").trim();
    if (!target) return null;
    const list = loadCustomPriceStylesFromLocalStorage();
    return list.find((item) => String(item?.id || "") === target) || null;
  }

  function getSavedPriceStylesOptionsHtml(selectedId = "") {
    const target = String(selectedId || "").trim();
    const list = loadCustomPriceStylesFromLocalStorage();
    const options = ['<option value="">Wybierz styl ceny...</option>'];
    list.forEach((item) => {
      const id = String(item?.id || "").trim();
      const label = String(item?.label || id || "").trim();
      if (!id) return;
      const selected = id === target ? ' selected' : "";
      options.push(`<option value="${escapeHtml(id)}"${selected}>${escapeHtml(label)}</option>`);
    });
    return options.join("");
  }

  function refreshSavedPriceStylesSelect(selectedId = "") {
    [PRICE_STYLE_APPLY_SELECT_ID, PRICE_STYLE_LOAD_SELECT_ID].forEach((id) => {
      const select = document.getElementById(id);
      if (!select) return;
      select.innerHTML = getSavedPriceStylesOptionsHtml(selectedId);
      if (!selectedId) select.value = "";
    });
  }

  function createStorageNotReadyError(message) {
    const error = new Error(message || "Firebase Storage nie jest jeszcze gotowy.");
    error.code = "storage-not-ready";
    return error;
  }

  function resolveFirebaseStorageInstance(getStorageFn) {
    if (window.firebaseStorage) return window.firebaseStorage;
    if (typeof getStorageFn !== "function") return null;
    const firebaseApp = window.firebaseApp || null;
    if (!firebaseApp) return null;
    try {
      return getStorageFn(firebaseApp, CUSTOM_STYLES_BUCKET);
    } catch (_err) {
      return null;
    }
  }

  async function ensureFirebaseStorageApiForStyles() {
    if (!firebaseStorageApiPromise) {
      firebaseStorageApiPromise = (async () => {
        const api = window.firebaseStorageExports || await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js");
        const refFn = api?.ref;
        const getDownloadURLFn = api?.getDownloadURL;
        const uploadBytesFn = api?.uploadBytes;
        const getStorageFn = api?.getStorage;
        if (
          typeof refFn !== "function" ||
          typeof getDownloadURLFn !== "function" ||
          typeof uploadBytesFn !== "function"
        ) {
          throw new Error("Brak API Firebase Storage.");
        }
        const storage = resolveFirebaseStorageInstance(getStorageFn);
        if (!storage) {
          throw createStorageNotReadyError("Firebase Storage nie zostal jeszcze zainicjalizowany.");
        }
        return {
          storage,
          ref: refFn,
          getDownloadURL: getDownloadURLFn,
          uploadBytes: uploadBytesFn
        };
      })();
    }
    try {
      return await firebaseStorageApiPromise;
    } catch (err) {
      firebaseStorageApiPromise = null;
      throw err;
    }
  }

  async function loadCustomStylesFromRemoteStorage() {
    const api = await ensureFirebaseStorageApiForStyles();
    const fileRef = api.ref(api.storage, CUSTOM_STYLES_REMOTE_PATH);
    const url = await api.getDownloadURL(fileRef);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const styles = Array.isArray(payload) ? payload : payload?.styles;
    return normalizeCustomStyleList(styles);
  }

  async function saveCustomStylesToRemoteStorage(list) {
    const api = await ensureFirebaseStorageApiForStyles();
    const fileRef = api.ref(api.storage, CUSTOM_STYLES_REMOTE_PATH);
    const payload = JSON.stringify(normalizeCustomStyleList(list), null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    await api.uploadBytes(fileRef, blob, {
      contentType: "application/json",
      cacheControl: "no-store",
      customMetadata: {
        savedAt: String(Date.now()),
        source: "new-style"
      }
    });
  }

  async function syncCustomStylesFromRemoteStorage() {
    const localStyles = loadCustomStylesFromLocalStorage();
    try {
      const remoteStyles = await loadCustomStylesFromRemoteStorage();
      const merged = mergeCustomStyleLists(remoteStyles, localStyles);
      saveCustomStylesToLocalStorage(merged);
      return merged;
    } catch (_err) {
      return localStyles;
    }
  }

  async function loadCustomPriceStylesFromRemoteStorage() {
    const api = await ensureFirebaseStorageApiForStyles();
    const fileRef = api.ref(api.storage, CUSTOM_PRICE_STYLES_REMOTE_PATH);
    const url = await api.getDownloadURL(fileRef);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const styles = Array.isArray(payload) ? payload : payload?.styles;
    return normalizeCustomPriceStyleList(styles);
  }

  async function saveCustomPriceStylesToRemoteStorage(list) {
    const api = await ensureFirebaseStorageApiForStyles();
    const fileRef = api.ref(api.storage, CUSTOM_PRICE_STYLES_REMOTE_PATH);
    const payload = JSON.stringify(normalizeCustomPriceStyleList(list), null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    await api.uploadBytes(fileRef, blob, {
      contentType: "application/json",
      cacheControl: "no-store",
      customMetadata: {
        savedAt: String(Date.now()),
        source: "new-style-price"
      }
    });
  }

  async function syncCustomPriceStylesFromRemoteStorage() {
    const localStyles = loadCustomPriceStylesFromLocalStorage();
    try {
      const remoteStyles = await loadCustomPriceStylesFromRemoteStorage();
      const merged = mergeCustomStyleLists(remoteStyles, localStyles, normalizeCustomPriceStyleList);
      saveCustomPriceStylesToLocalStorage(merged);
      return merged;
    } catch (_err) {
      return localStyles;
    }
  }

  function registerStyleForRuntime(styleDef) {
    if (typeof window.registerStylWlasnyModuleLayoutStyle !== "function") return;
    try {
      window.registerStylWlasnyModuleLayoutStyle(styleDef);
    } catch (_err) {}
  }

  function getWorkspaceSize() {
    const host = document.getElementById(WORKSPACE_STAGE_ID);
    if (!host) return { width: 900, height: 520 };
    const container = host.parentElement || host;
    const rect = container.getBoundingClientRect();
    const availableW = Math.max(MODULE_BASE_WIDTH, Math.round(rect.width || MODULE_BASE_WIDTH));
    const availableH = Math.max(MODULE_BASE_HEIGHT, Math.round(rect.height || MODULE_BASE_HEIGHT));
    const width = MODULE_BASE_WIDTH;
    const height = MODULE_BASE_HEIGHT;
    const offsetX = Math.max(0, Math.round((availableW - width) / 2));
    const offsetY = Math.max(0, Math.round((availableH - height) / 2));
    host.style.width = `${width}px`;
    host.style.height = `${height}px`;
    host.style.left = `${offsetX}px`;
    host.style.top = `${offsetY}px`;
    host.setAttribute("data-workspace-size", `BAZA ${MODULE_BASE_WIDTH}x${MODULE_BASE_HEIGHT}`);
    return {
      width,
      height
    };
  }

  function centerWorkspaceViewport(force = false) {
    const ws = getWorkspace();
    if (!force && ws.viewportInitialized) return;
    state.workspace.viewportInitialized = true;
  }

  function getWorkspace() {
    return state.workspace || {};
  }

  function nextWorkspaceLoadStamp() {
    state.workspace.loadStamp = Number(state.workspace.loadStamp || 0) + 1;
    return state.workspace.loadStamp;
  }

  function isWorkspaceLoadStampActive(stamp) {
    if (!stamp) return true;
    return Number(getWorkspace().loadStamp || 0) === Number(stamp);
  }

  function invalidateWorkspaceAsyncState() {
    state.imageSelectionStamp = Number(state.imageSelectionStamp || 0) + 1;
    nextWorkspaceLoadStamp();
  }

  function selectWorkspaceNode(node) {
    const ws = getWorkspace();
    if (!ws.transformer || !ws.layer) return;
    ws.selectedNode = node || null;
    ws.transformer.nodes(node ? [node] : []);
    setWorkspaceSelectedLabel(node ? (node.getAttr("workspaceLabel") || node.getClassName() || "element") : "brak");
    syncTextStyleControlsFromNode(node || null);
    ws.layer.batchDraw();
  }

  function resolveSelectableTarget(rawTarget) {
    const ws = getWorkspace();
    let node = rawTarget || null;
    while (node && node !== ws.stage && node !== ws.layer) {
      if (node.getAttr && node.getAttr("workspaceSelectable")) return node;
      node = node.getParent ? node.getParent() : null;
    }
    return null;
  }

  function ensureWorkspaceEditor() {
    const host = document.getElementById(WORKSPACE_STAGE_ID);
    if (!host) return null;
    if (!window.Konva) {
      host.innerHTML = '<div style="padding:10px;color:#fca5a5;font-size:12px;">Brak Konva - nie mozna uruchomic edytora.</div>';
      return null;
    }

    const ws = getWorkspace();
    if (ws.stage && ws.layer && ws.transformer) return ws;

    const size = getWorkspaceSize();
    const stage = new window.Konva.Stage({
      container: WORKSPACE_STAGE_ID,
      width: size.width,
      height: size.height
    });

    const layer = new window.Konva.Layer();
    const transformer = new window.Konva.Transformer({
      rotateEnabled: true,
      keepRatio: true,
      enabledAnchors: ["middle-left", "middle-right", "top-left", "top-right", "bottom-left", "bottom-right"],
      borderStroke: "#22d3ee",
      anchorStroke: "#22d3ee",
      anchorFill: "#ffffff",
      anchorSize: 8,
      boundBoxFunc: (oldBox, newBox) => {
        const safeWidth = Math.max(16, Number(newBox?.width || 0));
        const safeHeight = Math.max(16, Number(newBox?.height || 0));
        return { ...newBox, width: safeWidth, height: safeHeight };
      }
    });

    layer.add(transformer);
    stage.add(layer);

    stage.on("mousedown touchstart", (event) => {
      const rawTarget = event.target;
      const parent = rawTarget && typeof rawTarget.getParent === "function" ? rawTarget.getParent() : null;
      const isTransformerHandle = !!(
        rawTarget === transformer ||
        parent === transformer ||
        (parent && typeof parent.getParent === "function" && parent.getParent() === transformer)
      );
      if (isTransformerHandle) return;
      const target = resolveSelectableTarget(rawTarget);
      selectWorkspaceNode(target);
    });

    stage.on("dblclick dbltap", (event) => {
      const target = resolveSelectableTarget(event.target);
      if (!target) return;
      const editableText = target instanceof window.Konva.Text
        ? target
        : (collectTextNodes(target)[0] || null);
      if (editableText) beginTextEdit(editableText);
    });

    state.workspace.stage = stage;
    state.workspace.layer = layer;
    state.workspace.transformer = transformer;
    state.workspace.selectedNode = null;
    state.workspace.viewportInitialized = false;

    if (!state.workspace.resizeBound) {
      state.workspace.resizeBound = true;
      window.addEventListener("resize", () => {
        const wsNext = getWorkspace();
        if (!wsNext.stage) return;
        if (wsNext.resizeRaf) cancelAnimationFrame(wsNext.resizeRaf);
        wsNext.resizeRaf = requestAnimationFrame(() => {
          const nextSize = getWorkspaceSize();
          wsNext.stage.width(nextSize.width);
          wsNext.stage.height(nextSize.height);
          wsNext.stage.batchDraw();
        });
      });
    }

    setWorkspaceSelectedLabel("brak");
    requestAnimationFrame(() => centerWorkspaceViewport(true));
    return state.workspace;
  }

  function centerNode(node) {
    const ws = getWorkspace();
    if (!ws.stage || !node || typeof node.x !== "function" || typeof node.y !== "function") return;
    const stageW = Number(ws.stage.width() || 0);
    const stageH = Number(ws.stage.height() || 0);
    const box = node.getClientRect ? node.getClientRect({ skipStroke: false }) : { width: 120, height: 80 };
    const w = Math.max(10, Number(box.width || 120));
    const h = Math.max(10, Number(box.height || 80));
    node.x(Math.max(10, (stageW - w) / 2));
    node.y(Math.max(10, (stageH - h) / 2));
  }

  function fitTextNodeIntoWorkspace(node, options = {}) {
    const ws = getWorkspace();
    if (!ws.stage || !node || typeof node.fontSize !== "function") return;

    const stageW = Number(ws.stage.width() || MODULE_BASE_WIDTH);
    const stageH = Number(ws.stage.height() || MODULE_BASE_HEIGHT);
    const padding = Math.max(18, Math.round(Math.min(stageW, stageH) * 0.04));
    const maxWidth = Math.max(
      140,
      Math.min(stageW - padding * 2, Number(options.maxWidth || Math.round(stageW * 0.62)))
    );
    const maxHeight = Math.max(60, stageH - padding * 2);
    const minFontSize = Math.max(12, Number(options.minFontSize || 16));
    const shouldWrap = options.wrap !== false;
    const textValue = typeof node.text === "function" ? String(node.text() || "") : "";
    const preferredWidth = Math.max(
      140,
      Math.min(maxWidth, Number(options.preferredWidth || maxWidth))
    );

    if (shouldWrap && typeof node.wrap === "function") node.wrap("word");
    if (typeof node.width === "function") {
      const currentWidth = Number(node.width() || 0);
      const shouldSetWidth = !!options.forceWidth || textValue.length > 18 || currentWidth > maxWidth;
      if (shouldSetWidth) {
        node.width(preferredWidth);
      } else if (currentWidth > 0) {
        node.width(Math.min(currentWidth, preferredWidth));
      }
    }

    let nextFontSize = Math.max(minFontSize, Number(options.fontSize || node.fontSize() || 24));
    node.fontSize(nextFontSize);

    for (let index = 0; index < 48; index += 1) {
      const box = node.getClientRect ? node.getClientRect({ skipStroke: false }) : null;
      const fitsWidth = !box || Number(box.width || 0) <= maxWidth;
      const fitsHeight = !box || Number(box.height || 0) <= maxHeight;
      if (fitsWidth && fitsHeight) break;
      if (nextFontSize <= minFontSize) break;
      nextFontSize -= 1;
      node.fontSize(nextFontSize);
    }
  }

  function getSelectedCurrencySymbol() {
    const select = document.getElementById(CURRENCY_SELECT_ID);
    return String(select?.value || "£").trim() || "£";
  }

  function parsePriceParts(rawValue) {
    const priceRaw = String(rawValue || "0.00").replace(",", ".");
    const [majorRaw, minorRaw] = priceRaw.split(".");
    return {
      major: String(majorRaw || "0").replace(/[^\d]/g, "") || "0",
      minor: String(minorRaw || "00").replace(/[^\d]/g, "").padEnd(2, "0").slice(0, 2)
    };
  }

  function normalizeWorkspacePriceFactor(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(2.5, parsed));
  }

  function getWorkspacePriceShapeProfile(options = {}) {
    const isRoundedRect = !!options.isRoundedRect;
    const isCircle = !!options.isCircle;
    return {
      isRoundedRect,
      isCircle,
      noBadge: !isRoundedRect && !isCircle
    };
  }

  function getWorkspaceDefaultPriceFactors(shapeProfile = {}) {
    if (shapeProfile.noBadge) return { main: 0.56, dec: 0.22, unit: 0.22 };
    if (shapeProfile.isRoundedRect) return { main: 0.80, dec: 0.26, unit: 0.26 };
    return { main: 0.475, dec: 0.14, unit: 0.095 };
  }

  function getWorkspacePriceFactorsFromConfig(textCfg = {}, shapeProfile = {}) {
    const fallback = getWorkspaceDefaultPriceFactors(shapeProfile);
    return {
      main: normalizeWorkspacePriceFactor(textCfg.priceMainFactor, fallback.main),
      dec: normalizeWorkspacePriceFactor(textCfg.priceDecFactor, fallback.dec),
      unit: normalizeWorkspacePriceFactor(textCfg.priceUnitFactor, fallback.unit)
    };
  }

  function getWorkspacePriceRatiosFromFactors(factors = {}) {
    const main = Math.max(0.01, Number(factors.main) || 0.01);
    return {
      minor: Math.max(0.12, Math.min(1.4, (Number(factors.dec) || 0) / main)),
      unit: Math.max(0.12, Math.min(1.4, (Number(factors.unit) || 0) / main))
    };
  }

  function getWorkspacePriceRatiosFromGroup(group, fallbackRatios) {
    const majorText = group?.findOne?.((node) => node?.getAttr?.("priceRole") === "major");
    const minorText = group?.findOne?.((node) => node?.getAttr?.("priceRole") === "minor");
    const unitText = group?.findOne?.((node) => node?.getAttr?.("priceRole") === "unit");
    const majorSize = Number(majorText?.fontSize?.() || 0);
    const minorSize = Number(minorText?.fontSize?.() || 0);
    const unitSize = Number(unitText?.fontSize?.() || 0);
    if (majorSize > 0 && minorSize > 0 && unitSize > 0) {
      return {
        minor: Math.max(0.12, Math.min(1.4, minorSize / majorSize)),
        unit: Math.max(0.12, Math.min(1.4, unitSize / majorSize))
      };
    }
    return fallbackRatios || { minor: 0.3, unit: 0.22 };
  }

  function deriveWorkspacePriceBaseFromRect(shapeProfile = {}, rect = {}) {
    const width = Math.max(1, Number(rect?.w || 0) || 0);
    const height = Math.max(1, Number(rect?.h || 0) || 0);
    if (shapeProfile.isRoundedRect) return height;
    if (shapeProfile.noBadge) return Math.max(width / 3.2, height / 0.75, height);
    return Math.max(1, Math.min(width, height));
  }

  function captureWorkspacePriceFactors(group, rect, shapeProfile = {}) {
    const fallback = getWorkspaceDefaultPriceFactors(shapeProfile);
    const majorText = group?.findOne?.((node) => node?.getAttr?.("priceRole") === "major");
    const minorText = group?.findOne?.((node) => node?.getAttr?.("priceRole") === "minor");
    const unitText = group?.findOne?.((node) => node?.getAttr?.("priceRole") === "unit");
    const base = deriveWorkspacePriceBaseFromRect(shapeProfile, rect);
    const majorSize = Number(majorText?.fontSize?.() || 0);
    const minorSize = Number(minorText?.fontSize?.() || 0);
    const unitSize = Number(unitText?.fontSize?.() || 0);
    if (!(base > 0) || !(majorSize > 0) || !(minorSize > 0) || !(unitSize > 0)) return fallback;
    return {
      main: Number((majorSize / base).toFixed(4)),
      dec: Number((minorSize / base).toFixed(4)),
      unit: Number((unitSize / base).toFixed(4))
    };
  }

  function layoutPriceGroup(group, options = {}) {
    if (!group || typeof group.findOne !== "function") return;
    const majorText = group.findOne((node) => node?.getAttr?.("priceRole") === "major");
    const minorText = group.findOne((node) => node?.getAttr?.("priceRole") === "minor");
    const unitText = group.findOne((node) => node?.getAttr?.("priceRole") === "unit");
    if (!majorText || !minorText || !unitText) return;

    const ratios = options.ratios && typeof options.ratios === "object"
      ? {
        minor: Math.max(0.12, Math.min(1.4, Number(options.ratios.minor) || 0.3)),
        unit: Math.max(0.12, Math.min(1.4, Number(options.ratios.unit) || 0.22))
      }
      : getWorkspacePriceRatiosFromGroup(group, { minor: 0.3, unit: 0.22 });
    const majorSize = Math.max(20, Number(options.majorSize || options.baseSize || majorText.fontSize?.() || 64));
    const minorSize = Math.max(9, Math.round(majorSize * ratios.minor));
    const unitSize = Math.max(8, Math.round(majorSize * ratios.unit));
    const paddingX = Math.max(6, Math.round(majorSize * 0.14));
    const majorY = 0;

    majorText.fontSize(majorSize);
    minorText.fontSize(minorSize);
    unitText.fontSize(unitSize);

    majorText.x(0);
    majorText.y(majorY);
    minorText.x(majorText.width() + Math.max(4, Math.round(majorSize * 0.06)));
    minorText.y(Math.max(0, Math.round(majorSize * 0.08)));
    unitText.x(majorText.width() + Math.max(5, Math.round(majorSize * 0.08)));
    unitText.y(Math.max(minorText.y() + minorText.height() - 2, Math.round(majorSize * 0.54)));

    const box = group.getClientRect ? group.getClientRect({ skipTransform: true, skipStroke: false }) : null;
    if (box) {
      const shiftX = Number(box.x || 0) - paddingX;
      const shiftY = Number(box.y || 0);
      [majorText, minorText, unitText].forEach((node) => {
        node.x(Number(node.x() || 0) - shiftX);
        node.y(Number(node.y() || 0) - shiftY);
      });
    }
    group.setAttr("priceMinorRatio", Number(ratios.minor.toFixed(4)));
    group.setAttr("priceUnitRatio", Number(ratios.unit.toFixed(4)));
  }

  function normalizeScalableNode(node) {
    if (!node || typeof node.scaleX !== "function" || typeof node.scaleY !== "function") return;
    const sx = Number(node.scaleX() || 1);
    const sy = Number(node.scaleY() || 1);
    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return;

    if (node instanceof window.Konva.Text) {
      const currentWidth = Number(node.width?.() || 0);
      const currentFontSize = Number(node.fontSize?.() || 0);
      if (currentWidth > 0 && typeof node.width === "function") node.width(Math.max(20, currentWidth * sx));
      if (currentFontSize > 0 && typeof node.fontSize === "function") node.fontSize(Math.max(8, currentFontSize * sy));
      node.scaleX(1);
      node.scaleY(1);
      return;
    }

    if (node instanceof window.Konva.Line) {
      const points = Array.isArray(node.points?.()) ? node.points() : [];
      const nextPoints = [];
      for (let index = 0; index < points.length; index += 2) {
        nextPoints.push(Number(points[index] || 0) * sx, Number(points[index + 1] || 0) * sy);
      }
      node.points(nextPoints);
      node.scaleX(1);
      node.scaleY(1);
      return;
    }

    if (node instanceof window.Konva.Group && node.getAttr?.("workspaceKind") === "priceGroup") {
      const majorText = node.findOne((item) => item?.getAttr?.("priceRole") === "major");
      const majorSize = Number(majorText?.fontSize?.() || 64) * Math.max(sx, sy);
      const ratios = getWorkspacePriceRatiosFromGroup(node, {
        minor: Number(node.getAttr?.("priceMinorRatio") || 0.3),
        unit: Number(node.getAttr?.("priceUnitRatio") || 0.22)
      });
      node.scaleX(1);
      node.scaleY(1);
      layoutPriceGroup(node, { majorSize, ratios });
      return;
    }

    if (node instanceof window.Konva.Rect) {
      if (typeof node.width === "function") node.width(Math.max(1, Number(node.width() || 0) * sx));
      if (typeof node.height === "function") node.height(Math.max(1, Number(node.height() || 0) * sy));
      if (typeof node.cornerRadius === "function") node.cornerRadius(Math.max(0, Number(node.cornerRadius() || 0) * Math.min(sx, sy)));
      if (typeof node.strokeWidth === "function") node.strokeWidth(Math.max(0, Number(node.strokeWidth() || 0) * Math.min(sx, sy)));
      node.scaleX(1);
      node.scaleY(1);
      return;
    }

    if (node instanceof window.Konva.Circle) {
      if (typeof node.radius === "function") node.radius(Math.max(1, Number(node.radius() || 0) * Math.min(sx, sy)));
      if (typeof node.strokeWidth === "function") node.strokeWidth(Math.max(0, Number(node.strokeWidth() || 0) * Math.min(sx, sy)));
      node.scaleX(1);
      node.scaleY(1);
      return;
    }

    if (node instanceof window.Konva.Image) {
      if (typeof node.width === "function") node.width(Math.max(1, Number(node.width() || 0) * sx));
      if (typeof node.height === "function") node.height(Math.max(1, Number(node.height() || 0) * sy));
      node.scaleX(1);
      node.scaleY(1);
      return;
    }

    if (node instanceof window.Konva.Group) {
      const children = typeof node.getChildren === "function" ? node.getChildren() : [];
      const list = Array.isArray(children) ? children : (typeof children.toArray === "function" ? children.toArray() : []);
      list.forEach((child) => {
        if (typeof child.x === "function") child.x(Number(child.x() || 0) * sx);
        if (typeof child.y === "function") child.y(Number(child.y() || 0) * sy);
        if (typeof child.scaleX === "function") child.scaleX(Number(child.scaleX() || 1) * sx);
        if (typeof child.scaleY === "function") child.scaleY(Number(child.scaleY() || 1) * sy);
        normalizeScalableNode(child);
      });
      node.scaleX(1);
      node.scaleY(1);
      return;
    }
  }

  function normalizeWorkspaceForSave() {
    const ws = ensureWorkspaceEditor();
    if (!ws?.layer || !ws?.transformer) return;
    const children = typeof ws.layer.getChildren === "function" ? ws.layer.getChildren() : [];
    const list = Array.isArray(children) ? children : (typeof children.toArray === "function" ? children.toArray() : []);
    list.forEach((node) => {
      if (!node || node === ws.transformer || !node.getAttr?.("workspaceSelectable")) return;
      normalizeScalableNode(node);
    });
    ws.layer.batchDraw();
  }

  function beginTextEdit(node) {
    const ws = ensureWorkspaceEditor();
    if (!ws?.stage || !(node instanceof window.Konva.Text)) return;
    if (typeof ws.textEditorCleanup === "function") {
      try { ws.textEditorCleanup(); } catch (_err) {}
    }

    const stageContainer = ws.stage.container();
    const canvasHost = stageContainer?.closest?.(".new-style-canvas-inner") || stageContainer?.parentElement || null;
    if (!canvasHost) return;
    const textBox = node.getClientRect({ relativeTo: ws.stage });
    const editorRoot = document.createElement("div");
    const editorPanel = document.createElement("div");
    const title = document.createElement("div");
    const textarea = document.createElement("textarea");
    const actions = document.createElement("div");
    const cancelBtn = document.createElement("button");
    const saveBtn = document.createElement("button");

    editorRoot.style.position = "absolute";
    editorRoot.style.inset = "0";
    editorRoot.style.zIndex = "30";
    editorRoot.style.pointerEvents = "auto";

    editorPanel.style.position = "absolute";
    const hostW = Math.max(220, Number(canvasHost.clientWidth || 0));
    const hostH = Math.max(140, Number(canvasHost.clientHeight || 0));
    const preferredW = Math.max(240, Math.round(Math.min(hostW - 20, Math.max(320, textBox.width + 120))));
    const panelW = Math.min(preferredW, hostW - 20);
    const panelH = Math.max(140, Math.round(Math.min(hostH * 0.72, Math.max(160, textBox.height + 110))));
    const rawLeft = Math.round(textBox.x + (textBox.width * 0.5) - (panelW * 0.5));
    const rawTop = Math.round(textBox.y + textBox.height + 10);
    const left = Math.max(10, Math.min(hostW - panelW - 10, rawLeft));
    const top = Math.max(10, Math.min(hostH - panelH - 10, rawTop));

    editorPanel.style.left = `${left}px`;
    editorPanel.style.top = `${top}px`;
    editorPanel.style.width = `${panelW}px`;
    editorPanel.style.height = `${panelH}px`;
    editorPanel.style.padding = "12px";
    editorPanel.style.borderRadius = "14px";
    editorPanel.style.border = "1px solid rgba(34,211,238,0.65)";
    editorPanel.style.background = "rgba(2, 8, 22, 0.96)";
    editorPanel.style.boxShadow = "0 20px 42px rgba(2, 6, 23, 0.62)";
    editorPanel.style.pointerEvents = "auto";
    editorPanel.style.display = "grid";
    editorPanel.style.gap = "8px";

    title.textContent = "Tryb edycji tekstu";
    title.style.fontSize = "12px";
    title.style.fontWeight = "800";
    title.style.letterSpacing = "0.03em";
    title.style.color = "#67e8f9";

    textarea.value = String(node.text?.() || "");
    textarea.style.width = "100%";
    textarea.style.height = `${Math.max(74, panelH - 74)}px`;
    textarea.style.padding = "8px 10px";
    textarea.style.borderRadius = "10px";
    textarea.style.border = "1px solid rgba(148,163,184,0.42)";
    textarea.style.background = "rgba(255,255,255,0.98)";
    textarea.style.color = "#0f172a";
    textarea.style.fontFamily = String(node.fontFamily?.() || "Arial");
    textarea.style.fontSize = `${Math.max(12, Number(node.fontSize?.() || 24))}px`;
    textarea.style.lineHeight = String(node.lineHeight?.() || 1);
    textarea.style.fontWeight = String(node.fontStyle?.() || "").includes("bold") ? "700" : "400";
    textarea.style.resize = "both";
    textarea.style.outline = "none";
    textarea.style.boxSizing = "border-box";

    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "8px";

    cancelBtn.type = "button";
    cancelBtn.textContent = "Anuluj";
    cancelBtn.style.padding = "8px 12px";
    cancelBtn.style.borderRadius = "9px";
    cancelBtn.style.border = "1px solid rgba(148,163,184,0.45)";
    cancelBtn.style.background = "rgba(30,41,59,0.65)";
    cancelBtn.style.color = "#dbe7f6";
    cancelBtn.style.fontWeight = "700";
    cancelBtn.style.cursor = "pointer";

    saveBtn.type = "button";
    saveBtn.textContent = "Zapisz";
    saveBtn.style.padding = "8px 12px";
    saveBtn.style.borderRadius = "9px";
    saveBtn.style.border = "1px solid rgba(34,211,238,0.85)";
    saveBtn.style.background = "rgba(8,145,178,0.28)";
    saveBtn.style.color = "#e0f2fe";
    saveBtn.style.fontWeight = "800";
    saveBtn.style.cursor = "pointer";

    actions.append(cancelBtn, saveBtn);
    editorPanel.append(title, textarea, actions);
    editorRoot.appendChild(editorPanel);

    setSaveStatus("Edytujesz tekst: Enter = nowa linia, Ctrl/Cmd+Enter = zapisz.", "default");

    const originalOpacity = Number(node.opacity?.() || 1);
    if (typeof node.opacity === "function") {
      node.opacity(Math.max(0.35, Math.min(1, originalOpacity * 0.72)));
      ws.layer.batchDraw();
    }

    const cleanup = () => {
      if (typeof node.opacity === "function") node.opacity(originalOpacity);
      ws.layer.batchDraw();
      editorRoot.remove();
      if (state.workspace.textEditorCleanup === cleanup) state.workspace.textEditorCleanup = null;
      setSaveStatus("Tryb edycji tekstu zamkniety.", "default");
    };
    const commit = () => {
      node.text(textarea.value || " ");
      if (typeof node.width === "function") {
        node.width(Math.max(80, textarea.offsetWidth - 4));
      }
      fitTextNodeIntoWorkspace(node, {
        maxWidth: Math.round(Number(ws.stage.width() || MODULE_BASE_WIDTH) * 0.9),
        preferredWidth: Math.round(Number(ws.stage.width() || MODULE_BASE_WIDTH) * 0.82),
        fontSize: Number(node.fontSize?.() || 24),
        minFontSize: 12,
        forceWidth: true
      });
      ws.layer.batchDraw();
      setSaveStatus("Zapisano edycje tekstu.", "default");
      cleanup();
    };

    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        commit();
      }
    });
    cancelBtn.addEventListener("click", cleanup);
    saveBtn.addEventListener("click", commit);
    canvasHost.appendChild(editorRoot);
    textarea.focus();
    textarea.select();
    state.workspace.textEditorCleanup = cleanup;
  }

  function getEditableTextNodeFromSelected() {
    const ws = ensureWorkspaceEditor();
    if (!ws?.selectedNode) return null;
    if (ws.selectedNode instanceof window.Konva.Text) return ws.selectedNode;
    return collectTextNodes(ws.selectedNode)[0] || null;
  }

  function computeFitSize(naturalW, naturalH, stageW, stageH, maxScale = 0.42) {
    const nw = Math.max(1, Number(naturalW || 1));
    const nh = Math.max(1, Number(naturalH || 1));
    const maxW = Math.max(120, Number(stageW || 900) * maxScale);
    const maxH = Math.max(120, Number(stageH || 520) * maxScale);
    const scale = Math.min(maxW / nw, maxH / nh, 1);
    return {
      width: Math.max(90, Math.round(nw * scale)),
      height: Math.max(90, Math.round(nh * scale))
    };
  }

  function getWorkspaceRequestedTextSize(fallback = 12) {
    const sizeEl = document.getElementById(TEXT_SIZE_ID);
    const raw = Number(sizeEl?.value);
    const safe = Number.isFinite(raw) ? raw : Number(fallback || 12);
    return Math.max(6, Math.min(280, safe));
  }

  function fitImageNodeIntoRect(node, rect) {
    if (!node || !rect) return;
    const source = typeof node.image === "function" ? node.image() : null;
    const rawW = Math.max(1, Number(source?.naturalWidth || source?.videoWidth || source?.width || node.width?.() || 1));
    const rawH = Math.max(1, Number(source?.naturalHeight || source?.videoHeight || source?.height || node.height?.() || 1));
    const frameW = Math.max(1, Number(rect.w || 1));
    const frameH = Math.max(1, Number(rect.h || 1));
    const scale = Math.min(frameW / rawW, frameH / rawH);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const drawW = Math.max(1, rawW * safeScale);
    const drawH = Math.max(1, rawH * safeScale);
    if (typeof node.width === "function") node.width(drawW);
    if (typeof node.height === "function") node.height(drawH);
    if (typeof node.scaleX === "function") node.scaleX(1);
    if (typeof node.scaleY === "function") node.scaleY(1);
    if (typeof node.x === "function") node.x(Number(rect.x || 0) + (frameW - drawW) / 2);
    if (typeof node.y === "function") node.y(Number(rect.y || 0) + (frameH - drawH) / 2);
  }

  function getStarterWorkspaceLayout(stageW, stageH) {
    const safeW = Math.max(1, Number(stageW || MODULE_BASE_WIDTH));
    const safeH = Math.max(1, Number(stageH || MODULE_BASE_HEIGHT));
    return {
      imageRect: {
        x: Math.round(safeW * 0.08),
        y: Math.round(safeH * 0.16),
        w: Math.round(safeW * 0.24),
        h: Math.round(safeH * 0.46)
      },
      name: {
        x: Math.round(safeW * 0.38),
        y: Math.round(safeH * 0.18),
        width: Math.round(safeW * 0.42),
        fontSize: 12,
        minFontSize: 12
      },
      index: {
        x: Math.round(safeW * 0.38),
        y: Math.round(safeH * 0.49),
        fontSize: 12,
        minFontSize: 12
      },
      package: {
        x: Math.round(safeW * 0.38),
        y: Math.round(safeH * 0.57),
        fontSize: 12,
        minFontSize: 12
      }
    };
  }

  function placeStarterTextNode(node, config = {}) {
    if (!node) return;
    const nextWidth = Math.max(0, Number(config.width || 0));
    const nextFontSize = Math.max(12, Number(config.fontSize || node.fontSize?.() || 24));
    if (typeof node.fontSize === "function") node.fontSize(nextFontSize);
    if (nextWidth > 1 && typeof node.width === "function") node.width(nextWidth);
    fitTextNodeIntoWorkspace(node, {
      maxWidth: nextWidth > 1 ? nextWidth : undefined,
      preferredWidth: nextWidth > 1 ? nextWidth : undefined,
      fontSize: nextFontSize,
      minFontSize: Math.max(12, Number(config.minFontSize || nextFontSize || 12)),
      forceWidth: nextWidth > 1,
      wrap: nextWidth > 1
    });
    if (typeof node.x === "function") node.x(Number(config.x || 0));
    if (typeof node.y === "function") node.y(Number(config.y || 0));
  }

  function setupWorkspaceNodeBehavior(node) {
    const ws = getWorkspace();
    if (!ws?.stage || !node) return;
    node.setAttr("workspaceSelectable", true);
    if (typeof node.draggable === "function") node.draggable(true);
    if (typeof node.on === "function") {
      node.on("transformend", () => {
        normalizeScalableNode(node);
        ws.layer.batchDraw();
      });
    }
    if (typeof node.dragBoundFunc === "function") {
      node.dragBoundFunc((pos) => {
        const wsNext = getWorkspace();
        const stageW = Number(wsNext?.stage?.width?.() || 0);
        const stageH = Number(wsNext?.stage?.height?.() || 0);
        const marginX = Math.max(160, stageW * 1.2);
        const marginY = Math.max(140, stageH * 1.2);
        return {
          x: Math.min(Math.max(-marginX, Number(pos?.x || 0)), stageW + marginX),
          y: Math.min(Math.max(-marginY, Number(pos?.y || 0)), stageH + marginY)
        };
      });
    }
  }

  function addWorkspaceNode(node) {
    const ws = ensureWorkspaceEditor();
    if (!ws || !node) return;
    setupWorkspaceNodeBehavior(node);
    ws.layer.add(node);
    centerNode(node);
    selectWorkspaceNode(node);
    ws.layer.batchDraw();
  }

  function addTextNode() {
    const ws = ensureWorkspaceEditor();
    const stageW = Number(ws?.stage?.width?.() || MODULE_BASE_WIDTH);
    const nextFontSize = getWorkspaceRequestedTextSize(12);
    const text = new window.Konva.Text({
      x: 40,
      y: 40,
      text: "Nowy tekst",
      fontSize: nextFontSize,
      fontFamily: "Arial",
      fill: "#e5eefb",
      width: Math.round(stageW * 0.86),
      wrap: "word",
      lineHeight: 0.96,
      draggable: true
    });
    text.setAttr("workspaceLabel", "Tekst");
    fitTextNodeIntoWorkspace(text, {
      maxWidth: Math.round(stageW * 0.92),
      preferredWidth: Math.round(stageW * 0.86),
      fontSize: nextFontSize,
      minFontSize: Math.max(12, Math.min(nextFontSize, 18)),
      forceWidth: true
    });
    addWorkspaceNode(text);
  }

  function productTextValue(product, field) {
    const p = product || {};
    if (field === "name") return String(p.name || "NAZWA PRODUKTU");
    if (field === "index") return String(p.index || "00000");
    if (field === "package") return String(formatPackage(p) || "opak.");
    if (field === "price") return String(p.netto || "0.00");
    if (field === "ean") return String(p.ean || "0000000000000");
    if (field === "brand") return String(p.brand || "MARKA");
    return "-";
  }

  function addProductFieldText(field) {
    const product = getCurrentProductForWorkspace();
    const textByField = {
      name: productTextValue(product, "name"),
      index: productTextValue(product, "index"),
      package: `OPAK: ${productTextValue(product, "package")}`,
      ean: `EAN: ${productTextValue(product, "ean")}`
    };
    const value = textByField[field] || "Nowy tekst";
    const isLongName = field === "name";
    const ws = ensureWorkspaceEditor();
    const stageW = Number(ws?.stage?.width?.() || MODULE_BASE_WIDTH);
    const nextFontSize = (field === "name" || field === "index" || field === "package")
      ? 12
      : getWorkspaceRequestedTextSize(12);
    const textConfig = {
      x: 40,
      y: 40,
      text: value,
      fontSize: nextFontSize,
      fontFamily: "Arial",
      fill: "#e5eefb",
      lineHeight: isLongName ? 0.96 : 1,
      draggable: true
    };
    if (isLongName) {
      textConfig.width = Math.round(stageW * 0.88);
      textConfig.wrap = "word";
    }
    const text = new window.Konva.Text(textConfig);
    text.setAttr("workspaceLabel", field === "name" ? "Nazwa produktu" : field === "index" ? "Indeks" : field === "package" ? "Opakowanie" : "Pole tekstowe");
    text.setAttr("workspaceKind", field === "name" ? "nameText" : field === "index" ? "indexText" : field === "package" ? "packageText" : field);
    fitTextNodeIntoWorkspace(text, {
      maxWidth: isLongName ? Math.round(stageW * 0.94) : Math.round(stageW * 0.46),
      preferredWidth: isLongName ? Math.round(stageW * 0.88) : Math.round(stageW * 0.46),
      fontSize: textConfig.fontSize,
      minFontSize: 12,
      forceWidth: isLongName,
      wrap: isLongName
    });
    addWorkspaceNode(text);
  }

  function collectTextNodes(node) {
    if (!node || !window.Konva) return [];
    if (node instanceof window.Konva.Text) return [node];
    if (typeof node.find === "function") return node.find((n) => n instanceof window.Konva.Text) || [];
    return [];
  }

  function syncTextStyleControlsFromNode(node) {
    const fontEl = document.getElementById(TEXT_FONT_ID);
    const colorEl = document.getElementById(TEXT_COLOR_ID);
    const sizeEl = document.getElementById(TEXT_SIZE_ID);
    const dividerColorEl = document.getElementById(DIVIDER_COLOR_ID);
    if (!fontEl || !colorEl || !sizeEl) return;

    const textNode = collectTextNodes(node)[0] || null;
    if (!textNode) {
      if (dividerColorEl && node instanceof window.Konva.Line) {
        const stroke = String(node.stroke?.() || "#9fb6d7");
        if (/^#([0-9a-f]{6})$/i.test(stroke)) dividerColorEl.value = stroke;
      }
      return;
    }
    const fontFamily = String(textNode.fontFamily?.() || "Arial");
    const fill = String(textNode.fill?.() || "#e5eefb");
    const size = Math.round(Number(textNode.fontSize?.() || 30));

    if ([...fontEl.options].some((opt) => String(opt.value) === fontFamily)) {
      fontEl.value = fontFamily;
    }
    if (/^#([0-9a-f]{6})$/i.test(fill)) colorEl.value = fill;
    sizeEl.value = String(Math.max(6, Math.min(280, size)));
  }

  function applyTextStyleToSelected() {
    const ws = ensureWorkspaceEditor();
    if (!ws || !ws.selectedNode) return;
    const fontEl = document.getElementById(TEXT_FONT_ID);
    const colorEl = document.getElementById(TEXT_COLOR_ID);
    const sizeEl = document.getElementById(TEXT_SIZE_ID);
    if (!fontEl || !colorEl || !sizeEl) return;

    const nextFont = String(fontEl.value || "Arial").trim() || "Arial";
    const nextColor = String(colorEl.value || "#e5eefb").trim() || "#e5eefb";
    const nextSize = Math.max(6, Math.min(280, Number(sizeEl.value) || 30));
    if (ws.selectedNode?.getAttr?.("workspaceKind") === "priceGroup") {
      const majorText = ws.selectedNode.findOne((node) => node?.getAttr?.("priceRole") === "major");
      const unitText = ws.selectedNode.findOne((node) => node?.getAttr?.("priceRole") === "unit");
      const minorText = ws.selectedNode.findOne((node) => node?.getAttr?.("priceRole") === "minor");
      const ratios = getWorkspacePriceRatiosFromGroup(ws.selectedNode, {
        minor: Number(ws.selectedNode.getAttr?.("priceMinorRatio") || 0.3),
        unit: Number(ws.selectedNode.getAttr?.("priceUnitRatio") || 0.22)
      });
      [majorText, minorText, unitText].forEach((textNode) => {
        if (!textNode) return;
        if (typeof textNode.fontFamily === "function") textNode.fontFamily(nextFont);
        if (typeof textNode.fill === "function") textNode.fill(nextColor);
      });
      layoutPriceGroup(ws.selectedNode, { majorSize: nextSize, ratios });
      ws.layer.batchDraw();
      return;
    }
    const targets = collectTextNodes(ws.selectedNode);
    if (!targets.length) return;
    targets.forEach((textNode) => {
      if (typeof textNode.fontFamily === "function") textNode.fontFamily(nextFont);
      if (typeof textNode.fill === "function") textNode.fill(nextColor);
      if (typeof textNode.fontSize === "function") textNode.fontSize(nextSize);
    });
    ws.layer.batchDraw();
  }

  function applyDividerColorToSelected() {
    const ws = ensureWorkspaceEditor();
    if (!ws || !ws.selectedNode) return;
    const dividerColorEl = document.getElementById(DIVIDER_COLOR_ID);
    if (!dividerColorEl) return;
    const nextColor = String(dividerColorEl.value || "#9fb6d7").trim() || "#9fb6d7";
    const isLine = ws.selectedNode instanceof window.Konva.Line;
    if (!isLine) return;
    if (typeof ws.selectedNode.stroke === "function") ws.selectedNode.stroke(nextColor);
    ws.layer.batchDraw();
  }

  function addDividerNode() {
    const ws = ensureWorkspaceEditor();
    if (!ws || !ws.stage) return;
    const stageH = Number(ws.stage.height() || 520);
    const dividerColorEl = document.getElementById(DIVIDER_COLOR_ID);
    const dividerColor = String(dividerColorEl?.value || "#9fb6d7").trim() || "#9fb6d7";
    const line = new window.Konva.Line({
      points: [0, 0, 0, Math.max(140, stageH * 0.45)],
      stroke: dividerColor,
      strokeWidth: 2,
      strokeScaleEnabled: false,
      draggable: true
    });
    line.setAttr("workspaceLabel", "Divider");
    line.setAttr("workspaceKind", "divider");
    addWorkspaceNode(line);
  }

  function addCurrencyNode() {
    const symbol = getSelectedCurrencySymbol();
    const ws = ensureWorkspaceEditor();
    const stageW = Number(ws?.stage?.width?.() || MODULE_BASE_WIDTH);
    const text = new window.Konva.Text({
      x: 40,
      y: 40,
      text: symbol,
      fontSize: 42,
      fontFamily: "Arial",
      fill: "#e5eefb",
      width: Math.round(stageW * 0.16),
      align: "center",
      draggable: true
    });
    text.setAttr("workspaceLabel", `Waluta ${symbol}`);
    text.setAttr("workspaceKind", "currencySymbol");
    addWorkspaceNode(text);
  }

  function addBadgeNode(shape = "rect") {
    const isCircle = shape === "circle";
    const group = new window.Konva.Group({
      x: 60,
      y: 60,
      draggable: true
    });
    const bg = isCircle
      ? new window.Konva.Circle({
        x: 64,
        y: 40,
        radius: 40,
        fill: "#d71920",
        stroke: "#f8fafc",
        strokeWidth: 2
      })
      : new window.Konva.Rect({
        x: 0,
        y: 0,
        width: 150,
        height: 74,
        cornerRadius: 14,
        fill: "#d71920",
        stroke: "#f8fafc",
        strokeWidth: 2
      });
    group.add(bg);
    group.setAttr("workspaceLabel", isCircle ? "Badge kolo" : "Badge prostokat");
    group.setAttr("workspaceKind", isCircle ? "badgeCircle" : "badgeRect");
    addWorkspaceNode(group);
  }

  function addPriceGroupNode() {
    const product = getCurrentProductForWorkspace();
    const parts = parsePriceParts(productTextValue(product, "price"));
    const currency = getSelectedCurrencySymbol();
    const shapeProfile = getWorkspacePriceShapeProfile({
      isRoundedRect: !!findWorkspaceNodeByKind("badgeRect"),
      isCircle: !!findWorkspaceNodeByKind("badgeCircle")
    });
    const defaultRatios = getWorkspacePriceRatiosFromFactors(getWorkspaceDefaultPriceFactors(shapeProfile));

    const group = new window.Konva.Group({
      x: 90,
      y: 90,
      draggable: true
    });
    const majorText = new window.Konva.Text({
      x: 0,
      y: 0,
      text: parts.major,
      fontFamily: "Arial",
      fontStyle: "700",
      fontSize: 64,
      fill: "#b91c1c"
    });
    majorText.setAttr("priceRole", "major");
    const minorText = new window.Konva.Text({
      x: 0,
      y: 0,
      text: parts.minor,
      fontFamily: "Arial",
      fontStyle: "700",
      fontSize: 34,
      fill: "#b91c1c"
    });
    minorText.setAttr("priceRole", "minor");
    const unitText = new window.Konva.Text({
      x: 0,
      y: 0,
      text: `${currency} / SZT.`,
      fontFamily: "Arial",
      fontStyle: "700",
      fontSize: 30,
      fill: "#991b1b"
    });
    unitText.setAttr("priceRole", "unit");
    group.add(majorText);
    group.add(minorText);
    group.add(unitText);
    group.setAttr("workspaceLabel", "Cena");
    group.setAttr("workspaceKind", "priceGroup");
    layoutPriceGroup(group, { majorSize: 64, ratios: defaultRatios });
    addWorkspaceNode(group);
  }

  function inferFlagCode(product) {
    const hay = normalizeText(`${product?.brand || ""} ${product?.name || ""} ${product?.raw?.GRUPA_NAZWA || ""} ${product?.raw?.PODGRUPA_NAZWA || ""}`);
    if (hay.includes("rumun")) return "RO";
    if (hay.includes("ukrain")) return "UA";
    if (hay.includes("litw")) return "LT";
    if (hay.includes("bulgar")) return "BG";
    if (hay.includes("polsk")) return "PL";
    return "XX";
  }

  function addFlagNode() {
    const product = getCurrentProductForWorkspace();
    const flag = inferFlagCode(product);
    const text = new window.Konva.Text({
      x: 50,
      y: 50,
      text: `FLAGA ${flag}`,
      fontSize: 38,
      fontFamily: "Arial",
      fill: "#f8fafc",
      draggable: true
    });
    text.setAttr("workspaceLabel", "Flaga");
    text.setAttr("workspaceKind", "flag");
    addWorkspaceNode(text);
  }

  function addRectNode() {
    const rect = new window.Konva.Rect({
      x: 80,
      y: 80,
      width: 240,
      height: 130,
      fill: "rgba(34, 211, 238, 0.22)",
      stroke: "#22d3ee",
      strokeWidth: 2,
      cornerRadius: 12,
      draggable: true
    });
    rect.setAttr("workspaceLabel", "Prostokat");
    addWorkspaceNode(rect);
  }

  function addCircleNode() {
    const circle = new window.Konva.Circle({
      x: 140,
      y: 140,
      radius: 70,
      fill: "rgba(245, 158, 11, 0.22)",
      stroke: "#f59e0b",
      strokeWidth: 2,
      draggable: true
    });
    circle.setAttr("workspaceLabel", "Kolo");
    addWorkspaceNode(circle);
  }

  function addLineNode() {
    const line = new window.Konva.Line({
      points: [40, 40, 300, 160],
      stroke: "#f8fafc",
      strokeWidth: 4,
      draggable: true
    });
    line.setAttr("workspaceLabel", "Linia");
    addWorkspaceNode(line);
  }

  function addImageNodeFromUrl(url, label = "Obraz", kind = "", options = {}) {
    const src = String(url || "").trim();
    if (!src) return Promise.resolve(null);
    const ws = ensureWorkspaceEditor();
    if (!ws) return Promise.resolve(null);
    const loadStamp = Number(options?.loadStamp || 0);
    return new Promise((resolve) => {
      window.Konva.Image.fromURL(src, (imageNode) => {
        if (!imageNode) {
          resolve(null);
          return;
        }
        if (!isWorkspaceLoadStampActive(loadStamp)) {
          try { imageNode.destroy(); } catch (_err) {}
          resolve(null);
          return;
        }
        const naturalW = Number(imageNode.width() || 180);
        const naturalH = Number(imageNode.height() || 180);
        const size = computeFitSize(naturalW, naturalH, ws.stage.width(), ws.stage.height(), 0.28);
        imageNode.width(size.width);
        imageNode.height(size.height);
        imageNode.setAttr("workspaceLabel", label);
        if (kind) imageNode.setAttr("workspaceKind", String(kind));
        addWorkspaceNode(imageNode);
        resolve(imageNode);
      });
    });
  }

  function findWorkspaceNodeByKind(kind) {
    const ws = getWorkspace();
    if (!ws || !ws.layer || !kind) return null;
    const list = ws.layer.find((node) => node && node.getAttr && node.getAttr("workspaceKind") === kind);
    return Array.isArray(list) && list.length ? list[list.length - 1] : null;
  }

  function serializeWorkspaceNode(node) {
    if (!node || typeof node.getClassName !== "function") return null;
    const className = String(node.getClassName() || "");
    const customAttrs = {};
    ["priceRole", "priceMinorRatio", "priceUnitRatio"].forEach((key) => {
      const value = node.getAttr?.(key);
      if (value === undefined || value === null || value === "") return;
      customAttrs[key] = value;
    });
    const base = {
      className,
      attrs: {
        x: Number(node.x?.() || 0),
        y: Number(node.y?.() || 0),
        rotation: Number(node.rotation?.() || 0),
        draggable: !!node.draggable?.(),
        workspaceKind: String(node.getAttr?.("workspaceKind") || ""),
        workspaceLabel: String(node.getAttr?.("workspaceLabel") || ""),
        customAttrs: Object.keys(customAttrs).length ? customAttrs : undefined
      }
    };

    if (className === "Text") {
      return {
        ...base,
        attrs: {
          ...base.attrs,
          text: String(node.text?.() || ""),
          fontFamily: String(node.fontFamily?.() || "Arial"),
          fontSize: Number(node.fontSize?.() || 24),
          fontStyle: String(node.fontStyle?.() || "normal"),
          fill: String(node.fill?.() || "#ffffff"),
          width: Number(node.width?.() || 0),
          lineHeight: Number(node.lineHeight?.() || 1),
          align: String(node.align?.() || "left"),
          wrap: String(node.wrap?.() || "word"),
          textDecoration: String(node.textDecoration?.() || "")
        }
      };
    }

    if (className === "Line") {
      return {
        ...base,
        attrs: {
          ...base.attrs,
          points: Array.isArray(node.points?.()) ? node.points() : [],
          stroke: String(node.stroke?.() || "#ffffff"),
          strokeWidth: Number(node.strokeWidth?.() || 2)
        }
      };
    }

    if (className === "Rect") {
      return {
        ...base,
        attrs: {
          ...base.attrs,
          width: Number(node.width?.() || 0),
          height: Number(node.height?.() || 0),
          fill: String(node.fill?.() || ""),
          stroke: String(node.stroke?.() || ""),
          strokeWidth: Number(node.strokeWidth?.() || 0),
          cornerRadius: Number(node.cornerRadius?.() || 0)
        }
      };
    }

    if (className === "Circle") {
      return {
        ...base,
        attrs: {
          ...base.attrs,
          radius: Number(node.radius?.() || 0),
          fill: String(node.fill?.() || ""),
          stroke: String(node.stroke?.() || ""),
          strokeWidth: Number(node.strokeWidth?.() || 0)
        }
      };
    }

    if (className === "Image") {
      return {
        ...base,
        attrs: {
          ...base.attrs,
          width: Number(node.width?.() || 0),
          height: Number(node.height?.() || 0),
          src: String(node.getAttr?.("originalSrc") || ""),
          workspaceProductId: String(node.getAttr?.("workspaceProductId") || "")
        }
      };
    }

    if (className === "Group") {
      const children = typeof node.getChildren === "function"
        ? node.getChildren()
        : [];
      const list = Array.isArray(children)
        ? children
        : (typeof children.toArray === "function" ? children.toArray() : []);
      return {
        ...base,
        children: list.map((child) => serializeWorkspaceNode(child)).filter(Boolean)
      };
    }

    return null;
  }

  function buildWorkspaceSnapshot() {
    const ws = ensureWorkspaceEditor();
    if (!ws?.layer || !ws?.transformer || !ws?.stage) return null;
    const children = typeof ws.layer.getChildren === "function" ? ws.layer.getChildren() : [];
    const list = Array.isArray(children) ? children : (typeof children.toArray === "function" ? children.toArray() : []);
    const nodes = list
      .filter((node) => node && node !== ws.transformer && node.getAttr?.("workspaceSelectable"))
      .map((node) => serializeWorkspaceNode(node))
      .filter(Boolean);
    return {
      version: 1,
      stageWidth: Math.max(1, Number(ws.stage.width() || MODULE_BASE_WIDTH)),
      stageHeight: Math.max(1, Number(ws.stage.height() || MODULE_BASE_HEIGHT)),
      nodes
    };
  }

  function cloneJsonSnapshot(value) {
    if (!value || typeof value !== "object") return null;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return null;
    }
  }

  function hasSnapshotNodes(snapshot) {
    return !!(snapshot && Array.isArray(snapshot.nodes) && snapshot.nodes.length);
  }

  function getDraftStorageKeyForTab(tab) {
    return String(tab || "") === BUILDER_TAB_PRICE ? "priceWorkspaceDraft" : "productWorkspaceDraft";
  }

  function setDraftSnapshotForTab(tab, snapshot) {
    const key = getDraftStorageKeyForTab(tab);
    state[key] = hasSnapshotNodes(snapshot) ? cloneJsonSnapshot(snapshot) : null;
  }

  function getDraftSnapshotForTab(tab) {
    const key = getDraftStorageKeyForTab(tab);
    return cloneJsonSnapshot(state[key]);
  }

  function captureWorkspaceDraftForTab(tab) {
    const snapshot = buildWorkspaceSnapshot();
    setDraftSnapshotForTab(tab, snapshot);
  }

  async function restoreWorkspaceForBuilderTab(tab) {
    const ws = ensureWorkspaceEditor();
    if (!ws?.layer) return false;
    invalidateWorkspaceAsyncState();
    const loadStamp = Number(getWorkspace().loadStamp || 0);
    const snapshot = getDraftSnapshotForTab(tab);
    if (hasSnapshotNodes(snapshot)) {
      const restored = await restoreWorkspaceFromSnapshot(snapshot, loadStamp);
      if (!restored) return false;
    } else {
      clearWorkspaceScene();
    }
    selectWorkspaceNode(null);
    ws.layer.batchDraw();
    return true;
  }

  async function setActiveBuilderTab(nextTab) {
    const target = String(nextTab || "").trim() === BUILDER_TAB_PRICE ? BUILDER_TAB_PRICE : BUILDER_TAB_PRODUCT;
    const current = String(state.activeBuilderTab || BUILDER_TAB_PRODUCT);
    if (current === target) {
      updateBuilderTabUi();
      return;
    }
    captureWorkspaceDraftForTab(current);
    state.activeBuilderTab = target;
    updateBuilderTabUi();
    await restoreWorkspaceForBuilderTab(target);
  }

  function updateBuilderTabUi() {
    const activeTab = String(state.activeBuilderTab || BUILDER_TAB_PRODUCT);
    document.querySelectorAll(`#${MODAL_ID} [data-builder-tab]`).forEach((button) => {
      const tab = String(button.getAttribute("data-builder-tab") || "");
      button.classList.toggle("is-active", tab === activeTab);
    });
    document.querySelectorAll(`#${MODAL_ID} [data-builder-panel]`).forEach((panel) => {
      const tab = String(panel.getAttribute("data-builder-panel") || "");
      panel.hidden = tab !== activeTab;
    });
    const note = document.getElementById(BUILDER_NOTE_ID);
    if (note) {
      note.textContent = activeTab === BUILDER_TAB_PRICE
        ? "Buduj i zapisuj biblioteke stylow ceny do customprice.json."
        : "Przeciagaj, skaluj, rotuj i edytuj elementy bezposrednio na obszarze roboczym.";
    }
  }

  function getNodeRectPct(node, stageW, stageH) {
    if (!node || !stageW || !stageH) return null;
    const box = typeof node.getClientRect === "function"
      ? node.getClientRect({ skipStroke: false })
      : null;
    if (!box) return null;
    const x = (Number(box.x || 0) / stageW) * 100;
    const y = (Number(box.y || 0) / stageH) * 100;
    const w = (Number(box.width || 0) / stageW) * 100;
    const h = (Number(box.height || 0) / stageH) * 100;
    return {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      w: Math.round(w * 100) / 100,
      h: Math.round(h * 100) / 100
    };
  }

  function buildStyleConfigFromWorkspace() {
    const ws = ensureWorkspaceEditor();
    if (!ws || !ws.stage) return null;
    normalizeWorkspaceForSave();
    const stageW = Math.max(1, Number(ws.stage.width() || 1));
    const stageH = Math.max(1, Number(ws.stage.height() || 1));

    const imageNode = findWorkspaceNodeByKind("productImage");
    const nameNode = findWorkspaceNodeByKind("nameText");
    const indexNode = findWorkspaceNodeByKind("indexText");
    const packageNode = findWorkspaceNodeByKind("packageText");
    const priceNode = findWorkspaceNodeByKind("priceGroup");
    const badgeRectNode = findWorkspaceNodeByKind("badgeRect");
    const badgeCircleNode = findWorkspaceNodeByKind("badgeCircle");
    const badgeNode = badgeRectNode || badgeCircleNode;
    const dividerNode = findWorkspaceNodeByKind("divider");
    const eanNode = findWorkspaceNodeByKind("ean");
    const flagNode = findWorkspaceNodeByKind("flag");

    const imgRect = getNodeRectPct(imageNode, stageW, stageH);
    const nameRect = getNodeRectPct(nameNode, stageW, stageH);
    const indexRect = getNodeRectPct(indexNode, stageW, stageH);
    const packageRect = getNodeRectPct(packageNode, stageW, stageH);
    const priceRect = getNodeRectPct(priceNode, stageW, stageH);
    const badgeRect = getNodeRectPct(badgeNode, stageW, stageH);
    const dividerRect = getNodeRectPct(dividerNode, stageW, stageH);
    const eanRect = getNodeRectPct(eanNode, stageW, stageH);
    const flagRect = getNodeRectPct(flagNode, stageW, stageH);

    const priceBgNode = priceNode && typeof priceNode.findOne === "function"
      ? priceNode.findOne((n) => n && n.getClassName && n.getClassName() === "Rect")
      : null;
    const badgeBgNode = badgeNode && typeof badgeNode.findOne === "function"
      ? badgeNode.findOne((n) => {
        if (!n || !n.getClassName) return false;
        const kind = String(n.getClassName());
        return kind === "Rect" || kind === "Circle";
      })
      : null;
    const priceTextNode = priceNode && typeof priceNode.findOne === "function"
      ? priceNode.findOne((n) => n && n.getClassName && n.getClassName() === "Text")
      : null;

    const nameColor = nameNode && typeof nameNode.fill === "function" ? String(nameNode.fill() || "") : "#111111";
    const indexColor = indexNode && typeof indexNode.fill === "function" ? String(indexNode.fill() || "") : "#9ca3af";
    const packageColor = packageNode && typeof packageNode.fill === "function" ? String(packageNode.fill() || "") : "#111111";
    const metaFont = nameNode && typeof nameNode.fontFamily === "function" ? String(nameNode.fontFamily() || "Arial") : "Arial";
    const indexItalic = indexNode && typeof indexNode.fontStyle === "function"
      ? String(indexNode.fontStyle() || "").toLowerCase().includes("italic")
      : false;

    const priceFont = priceTextNode && typeof priceTextNode.fontFamily === "function"
      ? String(priceTextNode.fontFamily() || "Arial")
      : "Arial";
    const priceColor = priceTextNode && typeof priceTextNode.fill === "function"
      ? String(priceTextNode.fill() || "#ffffff")
      : "#ffffff";
    const priceBgColor = priceBgNode && typeof priceBgNode.fill === "function"
      ? String(priceBgNode.fill() || "#d71920")
      : "";
    const badgeBgColor = badgeBgNode && typeof badgeBgNode.fill === "function"
      ? String(badgeBgNode.fill() || "")
      : "";
    const dividerColor = dividerNode && typeof dividerNode.stroke === "function"
      ? String(dividerNode.stroke() || "#9fb6d7")
      : "#9fb6d7";
    const priceBgRadius = priceBgNode && typeof priceBgNode.cornerRadius === "function"
      ? Number(priceBgNode.cornerRadius() || 0)
      : 0;
    const badgeBgRadius = badgeBgNode && typeof badgeBgNode.cornerRadius === "function"
      ? Number(badgeBgNode.cornerRadius() || 0)
      : 0;
    const hasPriceBackground = !!(priceBgNode || badgeBgNode);
    const priceAreaSource = badgeRect || priceRect;
    const hasPriceAndBadge = !!(priceRect && badgeRect);
    const usesRoundedRectBadge = !!badgeRectNode || (!badgeNode && !!priceBgNode);
    const usesCircleBadge = !!badgeCircleNode;
    const priceShapeProfile = getWorkspacePriceShapeProfile({
      isRoundedRect: usesRoundedRectBadge,
      isCircle: usesCircleBadge
    });
    const capturedPriceFactors = captureWorkspacePriceFactors(priceNode, priceAreaSource || priceRect || {}, priceShapeProfile);
    const priceOffsetX = hasPriceAndBadge && Number(badgeRect.w || 0) > 0
      ? (Number(priceRect.x || 0) - Number(badgeRect.x || 0)) / Number(badgeRect.w || 1)
      : 0;
    const priceOffsetY = hasPriceAndBadge && Number(badgeRect.h || 0) > 0
      ? (Number(priceRect.y || 0) - Number(badgeRect.y || 0)) / Number(badgeRect.h || 1)
      : 0;
    const hideImage = !imageNode;
    const hideName = !nameNode;
    const hideIndex = !indexNode;
    const hidePackage = !packageNode;
    const hidePrice = !priceNode;
    const hideBarcode = !eanNode;
    const hideFlag = !flagNode;
    const dividerGapFromPrice = (dividerRect && priceAreaSource)
      ? (Math.round((Number(priceAreaSource.y || 0) - (Number(dividerRect.y || 0) + Number(dividerRect.h || 0))) * 100) / 100)
      : 0;

    const divider = dividerRect
      ? {
        x: dividerRect.x,
        y: dividerRect.y,
        h: dividerRect.h || 0.45,
        w: dividerRect.w || 0.45,
        anchor: imgRect ? "image-right" : "module",
        gapFromImage: imgRect ? (Math.round((Number(dividerRect.x || 0) - (Number(imgRect.x || 0) + Number(imgRect.w || 0))) * 100) / 100) : 0,
        gapFromPrice: dividerGapFromPrice,
        snapToPriceTop: !!priceAreaSource
      }
      : { x: -1, y: 0, h: 0, w: 0 };

    const editorSnapshot = buildWorkspaceSnapshot();

    return {
      singleDirect: {
        imgArea: imgRect ? { x: imgRect.x, y: imgRect.y, w: imgRect.w, h: imgRect.h } : { x: 10, y: 18, w: 62, h: 44 },
        nameArea: nameRect ? { x: nameRect.x, y: nameRect.y, w: nameRect.w, h: nameRect.h } : { x: 66, y: 21, w: 30, h: 22 },
        indexPos: indexRect ? { x: indexRect.x, y: indexRect.y } : { x: 66, y: 36 },
        packagePos: packageRect ? { x: packageRect.x, y: packageRect.y } : { x: 66, y: 40 },
        priceArea: priceAreaSource
          ? {
            x: priceAreaSource.x,
            y: priceAreaSource.y,
            s: Math.max(priceAreaSource.w, priceAreaSource.h),
            w: priceAreaSource.w,
            h: priceAreaSource.h,
            r: usesRoundedRectBadge ? (badgeBgRadius || priceBgRadius) : 0
          }
          : { x: 66, y: 52, s: 24, w: 24, h: 11, r: 2 },
        divider,
        priceTextOffset: {
          x: Math.round(priceOffsetX * 10000) / 10000,
          y: Math.round(priceOffsetY * 10000) / 10000
        },
        barcodeArea: eanRect ? { x: eanRect.x, y: eanRect.y, w: eanRect.w, h: eanRect.h } : { x: 0, y: 0, w: 0, h: 0 },
        flagArea: flagRect ? { x: flagRect.x, y: flagRect.y, w: flagRect.w, h: flagRect.h } : { x: 0, y: 0, w: 0, h: 0 }
      },
      familyDirect: {
        useSingleLayout: false,
        imageLayouts: {
          family2: null,
          family3: null,
          family4: null
        }
      },
      text: {
        metaFontFamily: metaFont,
        priceFontFamily: priceFont,
        nameColor,
        indexColor,
        packageColor,
        indexItalic,
        metaScaleMultiplier: 1,
        noPriceCircle: !hasPriceBackground,
        priceColor,
        forcePriceBold: true,
        priceExtraBold: false,
        priceScaleMultiplier: 1,
        priceMainFactor: capturedPriceFactors.main,
        priceDecFactor: capturedPriceFactors.dec,
        priceUnitFactor: capturedPriceFactors.unit,
        priceShape: usesRoundedRectBadge ? "roundedRect" : (usesCircleBadge ? "" : "none"),
        priceTextAlign: "left",
        priceTextOffsetMode: "absolute",
        priceBgColor: badgeBgColor || priceBgColor,
        priceBgRadius: usesRoundedRectBadge ? (badgeBgRadius || priceBgRadius) : 0,
        dividerColor,
        hideImage,
        hideName,
        hideIndex,
        hidePackage,
        hidePrice,
        hideBarcode,
        hideFlag
      },
      __editorSnapshot: editorSnapshot
    };
  }

  function clampPct(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, n));
  }

  function toStageRectFromPct(rawRect, stageW, stageH, fallback) {
    const rect = rawRect && typeof rawRect === "object" ? rawRect : {};
    const safeFallback = fallback && typeof fallback === "object" ? fallback : { x: 0, y: 0, w: 10, h: 10 };
    return {
      x: (clampPct(rect.x, safeFallback.x) / 100) * stageW,
      y: (clampPct(rect.y, safeFallback.y) / 100) * stageH,
      w: Math.max(1, (clampPct(rect.w, safeFallback.w) / 100) * stageW),
      h: Math.max(1, (clampPct(rect.h, safeFallback.h) / 100) * stageH)
    };
  }

  function clearWorkspaceScene() {
    const ws = ensureWorkspaceEditor();
    if (!ws?.layer) return;
    const children = typeof ws.layer.getChildren === "function" ? ws.layer.getChildren() : [];
    const list = Array.isArray(children) ? children : (typeof children.toArray === "function" ? children.toArray() : []);
    list.forEach((node) => {
      if (!node || node === ws.transformer) return;
      try { node.destroy(); } catch (_err) {}
    });
    selectWorkspaceNode(null);
    ws.layer.batchDraw();
  }

  async function createWorkspaceNodeFromSnapshot(def, options = {}) {
    const className = String(def?.className || "");
    const attrs = def?.attrs && typeof def.attrs === "object" ? def.attrs : {};
    const customAttrs = attrs?.customAttrs && typeof attrs.customAttrs === "object" ? attrs.customAttrs : {};
    const loadStamp = Number(options?.loadStamp || 0);
    if (!className) return null;

    if (className === "Text") {
      const node = new window.Konva.Text({
        x: Number(attrs.x || 0),
        y: Number(attrs.y || 0),
        text: String(attrs.text || ""),
        fontFamily: String(attrs.fontFamily || "Arial"),
        fontSize: Number(attrs.fontSize || 24),
        fontStyle: String(attrs.fontStyle || "normal"),
        fill: String(attrs.fill || "#ffffff"),
        width: Number(attrs.width || 0) || undefined,
        lineHeight: Number(attrs.lineHeight || 1),
        align: String(attrs.align || "left"),
        wrap: String(attrs.wrap || "word"),
        textDecoration: String(attrs.textDecoration || ""),
        draggable: attrs.draggable !== false
      });
      if (Number.isFinite(Number(attrs.rotation))) node.rotation(Number(attrs.rotation || 0));
      Object.entries(customAttrs).forEach(([key, value]) => {
        try { node.setAttr(key, value); } catch (_err) {}
      });
      return node;
    }

    if (className === "Line") {
      const node = new window.Konva.Line({
        x: Number(attrs.x || 0),
        y: Number(attrs.y || 0),
        points: Array.isArray(attrs.points) ? attrs.points : [0, 0, 0, 120],
        stroke: String(attrs.stroke || "#ffffff"),
        strokeWidth: Number(attrs.strokeWidth || 2),
        draggable: attrs.draggable !== false
      });
      if (Number.isFinite(Number(attrs.rotation))) node.rotation(Number(attrs.rotation || 0));
      Object.entries(customAttrs).forEach(([key, value]) => {
        try { node.setAttr(key, value); } catch (_err) {}
      });
      return node;
    }

    if (className === "Rect") {
      const node = new window.Konva.Rect({
        x: Number(attrs.x || 0),
        y: Number(attrs.y || 0),
        width: Number(attrs.width || 80),
        height: Number(attrs.height || 40),
        fill: String(attrs.fill || "rgba(255,255,255,0.2)"),
        stroke: String(attrs.stroke || ""),
        strokeWidth: Number(attrs.strokeWidth || 0),
        cornerRadius: Number(attrs.cornerRadius || 0),
        draggable: attrs.draggable !== false
      });
      if (Number.isFinite(Number(attrs.rotation))) node.rotation(Number(attrs.rotation || 0));
      Object.entries(customAttrs).forEach(([key, value]) => {
        try { node.setAttr(key, value); } catch (_err) {}
      });
      return node;
    }

    if (className === "Circle") {
      const node = new window.Konva.Circle({
        x: Number(attrs.x || 0),
        y: Number(attrs.y || 0),
        radius: Number(attrs.radius || 30),
        fill: String(attrs.fill || "rgba(255,255,255,0.2)"),
        stroke: String(attrs.stroke || ""),
        strokeWidth: Number(attrs.strokeWidth || 0),
        draggable: attrs.draggable !== false
      });
      if (Number.isFinite(Number(attrs.rotation))) node.rotation(Number(attrs.rotation || 0));
      Object.entries(customAttrs).forEach(([key, value]) => {
        try { node.setAttr(key, value); } catch (_err) {}
      });
      return node;
    }

    if (className === "Image") {
      const src = String(attrs.src || "").trim();
      if (!src) return null;
      return await new Promise((resolve) => {
        window.Konva.Image.fromURL(src, (imageNode) => {
          if (!imageNode) {
            resolve(null);
            return;
          }
          if (!isWorkspaceLoadStampActive(loadStamp)) {
            try { imageNode.destroy(); } catch (_err) {}
            resolve(null);
            return;
          }
          imageNode.x(Number(attrs.x || 0));
          imageNode.y(Number(attrs.y || 0));
          imageNode.width(Math.max(1, Number(attrs.width || imageNode.width() || 90)));
          imageNode.height(Math.max(1, Number(attrs.height || imageNode.height() || 90)));
          if (Number.isFinite(Number(attrs.rotation))) imageNode.rotation(Number(attrs.rotation || 0));
          imageNode.draggable(attrs.draggable !== false);
          imageNode.setAttr("originalSrc", src);
          if (attrs.workspaceProductId) imageNode.setAttr("workspaceProductId", String(attrs.workspaceProductId));
          Object.entries(customAttrs).forEach(([key, value]) => {
            try { imageNode.setAttr(key, value); } catch (_err) {}
          });
          resolve(imageNode);
        });
      });
    }

    if (className === "Group") {
      const group = new window.Konva.Group({
        x: Number(attrs.x || 0),
        y: Number(attrs.y || 0),
        draggable: attrs.draggable !== false
      });
      if (Number.isFinite(Number(attrs.rotation))) group.rotation(Number(attrs.rotation || 0));
      Object.entries(customAttrs).forEach(([key, value]) => {
        try { group.setAttr(key, value); } catch (_err) {}
      });
      const children = Array.isArray(def?.children) ? def.children : [];
      for (const childDef of children) {
        if (!isWorkspaceLoadStampActive(loadStamp)) {
          try { group.destroy(); } catch (_err) {}
          return null;
        }
        const childNode = await createWorkspaceNodeFromSnapshot(childDef, options);
        if (childNode) group.add(childNode);
      }
      return group;
    }

    return null;
  }

  async function restoreWorkspaceFromSnapshot(snapshot, loadStamp = 0) {
    const ws = ensureWorkspaceEditor();
    if (!ws?.layer || !ws?.stage) return false;
    const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
    if (!nodes.length) return false;
    const sourceW = Math.max(1, Number(snapshot?.stageWidth || MODULE_BASE_WIDTH));
    const sourceH = Math.max(1, Number(snapshot?.stageHeight || MODULE_BASE_HEIGHT));
    const targetW = Math.max(1, Number(ws.stage.width() || MODULE_BASE_WIDTH));
    const targetH = Math.max(1, Number(ws.stage.height() || MODULE_BASE_HEIGHT));
    const scaleX = targetW / sourceW;
    const scaleY = targetH / sourceH;
    clearWorkspaceScene();
    for (const def of nodes) {
      if (!isWorkspaceLoadStampActive(loadStamp)) return false;
      const scaledDef = (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001)
        ? scaleSnapshotDefinition(def, scaleX, scaleY)
        : def;
      const node = await createWorkspaceNodeFromSnapshot(scaledDef, { loadStamp });
      if (!node) continue;
      if (!isWorkspaceLoadStampActive(loadStamp)) {
        try { node.destroy(); } catch (_err) {}
        return false;
      }
      const meta = attrsFromSnapshot(scaledDef);
      if (meta?.workspaceKind) node.setAttr("workspaceKind", meta.workspaceKind);
      if (meta?.workspaceLabel) node.setAttr("workspaceLabel", meta.workspaceLabel);
      setupWorkspaceNodeBehavior(node);
      ws.layer.add(node);
    }
    selectWorkspaceNode(null);
    ws.layer.batchDraw();
    return true;
  }

  function attrsFromSnapshot(def) {
    return def?.attrs && typeof def.attrs === "object" ? def.attrs : {};
  }

  function scaleSnapshotNumber(value, factor, fallback = 0) {
    const raw = Number(value);
    const scale = Number(factor);
    if (!Number.isFinite(raw)) return fallback;
    if (!Number.isFinite(scale) || scale <= 0) return raw;
    return raw * scale;
  }

  function scaleSnapshotDefinition(def, scaleX, scaleY) {
    const safeDef = def && typeof def === "object" ? def : null;
    if (!safeDef) return null;
    const sx = Number.isFinite(Number(scaleX)) && Number(scaleX) > 0 ? Number(scaleX) : 1;
    const sy = Number.isFinite(Number(scaleY)) && Number(scaleY) > 0 ? Number(scaleY) : 1;
    const uniform = Math.min(sx, sy);
    const attrs = safeDef.attrs && typeof safeDef.attrs === "object" ? { ...safeDef.attrs } : {};
    const scaled = {
      ...safeDef,
      attrs: {
        ...attrs,
        x: scaleSnapshotNumber(attrs.x, sx, 0),
        y: scaleSnapshotNumber(attrs.y, sy, 0)
      }
    };

    if (Number.isFinite(Number(attrs.strokeWidth))) {
      scaled.attrs.strokeWidth = Math.max(0, scaleSnapshotNumber(attrs.strokeWidth, uniform, Number(attrs.strokeWidth) || 0));
    }

    const className = String(safeDef.className || "");
    if (className === "Text") {
      if (Number.isFinite(Number(attrs.width))) scaled.attrs.width = Math.max(1, scaleSnapshotNumber(attrs.width, sx, Number(attrs.width) || 0));
      if (Number.isFinite(Number(attrs.fontSize))) scaled.attrs.fontSize = Math.max(1, scaleSnapshotNumber(attrs.fontSize, uniform, Number(attrs.fontSize) || 0));
    } else if (className === "Line") {
      const points = Array.isArray(attrs.points) ? attrs.points.slice() : [];
      scaled.attrs.points = points.map((point, idx) => scaleSnapshotNumber(point, idx % 2 === 0 ? sx : sy, Number(point) || 0));
    } else if (className === "Rect") {
      if (Number.isFinite(Number(attrs.width))) scaled.attrs.width = Math.max(1, scaleSnapshotNumber(attrs.width, sx, Number(attrs.width) || 0));
      if (Number.isFinite(Number(attrs.height))) scaled.attrs.height = Math.max(1, scaleSnapshotNumber(attrs.height, sy, Number(attrs.height) || 0));
      if (Number.isFinite(Number(attrs.cornerRadius))) scaled.attrs.cornerRadius = Math.max(0, scaleSnapshotNumber(attrs.cornerRadius, uniform, Number(attrs.cornerRadius) || 0));
    } else if (className === "Circle") {
      if (Number.isFinite(Number(attrs.radius))) scaled.attrs.radius = Math.max(1, scaleSnapshotNumber(attrs.radius, uniform, Number(attrs.radius) || 0));
    } else if (className === "Image") {
      if (Number.isFinite(Number(attrs.width))) scaled.attrs.width = Math.max(1, scaleSnapshotNumber(attrs.width, sx, Number(attrs.width) || 0));
      if (Number.isFinite(Number(attrs.height))) scaled.attrs.height = Math.max(1, scaleSnapshotNumber(attrs.height, sy, Number(attrs.height) || 0));
    } else if (className === "Group") {
      scaled.children = (Array.isArray(safeDef.children) ? safeDef.children : [])
        .map((child) => scaleSnapshotDefinition(child, sx, sy))
        .filter(Boolean);
    }

    return scaled;
  }

  function setNodeRect(node, rect) {
    if (!node || !rect) return;
    if (typeof node.x === "function") node.x(Number(rect.x || 0));
    if (typeof node.y === "function") node.y(Number(rect.y || 0));
    if (typeof node.width === "function") node.width(Math.max(1, Number(rect.w || 1)));
    if (typeof node.height === "function") node.height(Math.max(1, Number(rect.h || 1)));
    if (typeof node.scaleX === "function") node.scaleX(1);
    if (typeof node.scaleY === "function") node.scaleY(1);
  }

  function isWorkspacePriceStyleNode(node) {
    if (!node || !node.getAttr) return false;
    if (node.getAttr("priceStyleArtifact")) return true;
    const kind = String(node.getAttr("workspaceKind") || "").trim();
    return kind === "priceGroup" || kind === "badgeRect" || kind === "badgeCircle" || kind === "currencySymbol";
  }

  function clearPriceStyleNodesFromWorkspace() {
    const ws = ensureWorkspaceEditor();
    if (!ws?.layer) return;
    const nodes = ws.layer.find((node) => node && node !== ws.transformer && isWorkspacePriceStyleNode(node));
    const list = Array.isArray(nodes) ? nodes : (typeof nodes?.toArray === "function" ? nodes.toArray() : []);
    list.forEach((node) => {
      try { node.destroy(); } catch (_err) {}
    });
    ws.layer.batchDraw();
  }

  async function appendSnapshotNodesToWorkspace(snapshot, options = {}) {
    const ws = ensureWorkspaceEditor();
    if (!ws?.layer || !ws?.stage) return false;
    const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
    if (!nodes.length) return false;
    const loadStamp = nextWorkspaceLoadStamp();
    const sourceW = Math.max(1, Number(snapshot?.stageWidth || MODULE_BASE_WIDTH));
    const sourceH = Math.max(1, Number(snapshot?.stageHeight || MODULE_BASE_HEIGHT));
    const targetW = Math.max(1, Number(ws.stage.width() || MODULE_BASE_WIDTH));
    const targetH = Math.max(1, Number(ws.stage.height() || MODULE_BASE_HEIGHT));
    const scaleX = targetW / sourceW;
    const scaleY = targetH / sourceH;

    if (options.replacePriceStyle) {
      clearPriceStyleNodesFromWorkspace();
    }

    for (const def of nodes) {
      if (!isWorkspaceLoadStampActive(loadStamp)) return false;
      const scaledDef = (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001)
        ? scaleSnapshotDefinition(def, scaleX, scaleY)
        : def;
      const node = await createWorkspaceNodeFromSnapshot(scaledDef, { loadStamp });
      if (!node) continue;
      const meta = attrsFromSnapshot(scaledDef);
      if (meta?.workspaceKind) node.setAttr("workspaceKind", meta.workspaceKind);
      if (meta?.workspaceLabel) node.setAttr("workspaceLabel", meta.workspaceLabel);
      if (options.markPriceStyle && typeof node.setAttr === "function") {
        node.setAttr("priceStyleArtifact", true);
      }
      setupWorkspaceNodeBehavior(node);
      ws.layer.add(node);
    }

    selectWorkspaceNode(null);
    ws.layer.batchDraw();
    return true;
  }

  function buildPriceStyleSnapshotFromWorkspace() {
    return buildWorkspaceSnapshot();
  }

  async function loadStyleToWorkspace(styleDef) {
    const safe = styleDef && typeof styleDef === "object" ? styleDef : null;
    const cfg = safe?.config && typeof safe.config === "object" ? safe.config : null;
    if (!cfg) return false;
    const ws = ensureWorkspaceEditor();
    if (!ws?.stage || !ws?.layer) return false;
    const stageW = Math.max(1, Number(ws.stage.width() || MODULE_BASE_WIDTH));
    const stageH = Math.max(1, Number(ws.stage.height() || MODULE_BASE_HEIGHT));
    const loadStamp = nextWorkspaceLoadStamp();
    const single = cfg.singleDirect && typeof cfg.singleDirect === "object" ? cfg.singleDirect : {};
    const textCfg = cfg.text && typeof cfg.text === "object" ? cfg.text : {};
    const product = getCurrentProductForWorkspace();
    const snapshot = cfg.__editorSnapshot && typeof cfg.__editorSnapshot === "object" ? cfg.__editorSnapshot : null;
    if (snapshot && Array.isArray(snapshot.nodes) && snapshot.nodes.length) {
      const restored = await restoreWorkspaceFromSnapshot(snapshot, loadStamp);
      if (!isWorkspaceLoadStampActive(loadStamp)) return false;
      if (restored) {
        ws.layer.batchDraw();
        return true;
      }
    }
    const fallbackRects = {
      img: { x: 10, y: 18, w: 62, h: 44 },
      name: { x: 66, y: 21, w: 30, h: 22 },
      price: { x: 66, y: 52, w: 24, h: 11 },
      flag: { x: 0, y: 0, w: 0, h: 0 },
      ean: { x: 0, y: 0, w: 0, h: 0 }
    };

    clearWorkspaceScene();
    if (!isWorkspaceLoadStampActive(loadStamp)) return false;

    if (!textCfg.hideImage) {
      await upsertProductImageOnWorkspace(product, { loadStamp });
      if (!isWorkspaceLoadStampActive(loadStamp)) return false;
      const imageNode = findWorkspaceNodeByKind("productImage");
      fitImageNodeIntoRect(imageNode, toStageRectFromPct(single.imgArea, stageW, stageH, fallbackRects.img));
    }

    if (!textCfg.hideName) {
      addProductFieldText("name");
      const nameNode = findWorkspaceNodeByKind("nameText");
      const nameRect = toStageRectFromPct(single.nameArea, stageW, stageH, fallbackRects.name);
      setNodeRect(nameNode, nameRect);
      if (nameNode) {
        if (typeof nameNode.fontFamily === "function") nameNode.fontFamily(String(textCfg.metaFontFamily || "Arial"));
        if (typeof nameNode.fill === "function") nameNode.fill(String(textCfg.nameColor || "#111111"));
      }
    }

    if (!textCfg.hideIndex) {
      addProductFieldText("index");
      const indexNode = findWorkspaceNodeByKind("indexText");
      if (indexNode) {
        indexNode.x((clampPct(single?.indexPos?.x, 66) / 100) * stageW);
        indexNode.y((clampPct(single?.indexPos?.y, 36) / 100) * stageH);
        if (typeof indexNode.fontFamily === "function") indexNode.fontFamily(String(textCfg.metaFontFamily || "Arial"));
        if (typeof indexNode.fill === "function") indexNode.fill(String(textCfg.indexColor || "#9ca3af"));
        if (typeof indexNode.fontStyle === "function") indexNode.fontStyle(textCfg.indexItalic ? "italic" : "normal");
      }
    }

    if (!textCfg.hidePackage) {
      addProductFieldText("package");
      const packageNode = findWorkspaceNodeByKind("packageText");
      if (packageNode) {
        packageNode.x((clampPct(single?.packagePos?.x, 66) / 100) * stageW);
        packageNode.y((clampPct(single?.packagePos?.y, 40) / 100) * stageH);
        if (typeof packageNode.fontFamily === "function") packageNode.fontFamily(String(textCfg.metaFontFamily || "Arial"));
        if (typeof packageNode.fill === "function") packageNode.fill(String(textCfg.packageColor || "#111111"));
      }
    }

    if (!textCfg.hidePrice) {
      const priceAreaPct = single.priceArea && typeof single.priceArea === "object" ? single.priceArea : {};
      const priceW = Number(priceAreaPct.w || 0) > 0 ? Number(priceAreaPct.w) : Number(priceAreaPct.s || 24);
      const priceH = Number(priceAreaPct.h || 0) > 0 ? Number(priceAreaPct.h) : (Number(priceAreaPct.s || 24) * 0.64);
      const priceRect = toStageRectFromPct(
        { x: priceAreaPct.x, y: priceAreaPct.y, w: priceW, h: priceH },
        stageW,
        stageH,
        fallbackRects.price
      );

      const showCircleBadge = !textCfg.noPriceCircle && String(textCfg.priceShape || "").trim() !== "none";
      if (showCircleBadge) {
        addBadgeNode(String(textCfg.priceShape || "").trim() === "roundedRect" ? "rect" : "circle");
        const badgeNode = findWorkspaceNodeByKind(String(textCfg.priceShape || "").trim() === "roundedRect" ? "badgeRect" : "badgeCircle");
        if (badgeNode) {
          badgeNode.x(priceRect.x);
          badgeNode.y(priceRect.y);
          const shapeNode = badgeNode.findOne((node) => node && node.getClassName && (node.getClassName() === "Rect" || node.getClassName() === "Circle"));
          if (shapeNode && shapeNode.getClassName() === "Rect") {
            shapeNode.x(0);
            shapeNode.y(0);
            shapeNode.width(priceRect.w);
            shapeNode.height(priceRect.h);
            if (typeof shapeNode.cornerRadius === "function") shapeNode.cornerRadius(Math.max(0, Number(textCfg.priceBgRadius || 0)));
          } else if (shapeNode && shapeNode.getClassName() === "Circle") {
            const radius = Math.max(1, Math.max(priceRect.w, priceRect.h) / 2);
            shapeNode.x(radius);
            shapeNode.y(radius);
            shapeNode.radius(radius);
          }
          if (shapeNode && typeof shapeNode.fill === "function") shapeNode.fill(String(textCfg.priceBgColor || "#d71920"));
        }
      }

      addPriceGroupNode();
      const priceNode = findWorkspaceNodeByKind("priceGroup");
      if (priceNode) {
        const shapeProfile = getWorkspacePriceShapeProfile({
          isRoundedRect: String(textCfg.priceShape || "").trim() === "roundedRect",
          isCircle: showCircleBadge && String(textCfg.priceShape || "").trim() !== "roundedRect"
        });
        const priceFactors = getWorkspacePriceFactorsFromConfig(textCfg, shapeProfile);
        const priceRatios = getWorkspacePriceRatiosFromFactors(priceFactors);
        const priceBase = deriveWorkspacePriceBaseFromRect(shapeProfile, priceRect);
        const offsetX = Number(single?.priceTextOffset?.x || 0) * Math.max(1, priceRect.w);
        const offsetY = Number(single?.priceTextOffset?.y || 0) * Math.max(1, priceRect.h);
        priceNode.x(priceRect.x + offsetX);
        priceNode.y(priceRect.y + offsetY);
        const majorText = priceNode.findOne((node) => node?.getAttr?.("priceRole") === "major");
        const scaleMultiplier = Math.max(0.35, Math.min(4, Number(textCfg.priceScaleMultiplier || 1) || 1));
        const majorSize = Math.max(18, Number((priceBase * priceFactors.main * scaleMultiplier).toFixed(2)));
        layoutPriceGroup(priceNode, { majorSize, ratios: priceRatios });
        const textNodes = [
          majorText,
          priceNode.findOne((node) => node?.getAttr?.("priceRole") === "minor"),
          priceNode.findOne((node) => node?.getAttr?.("priceRole") === "unit")
        ].filter(Boolean);
        textNodes.forEach((node) => {
          if (typeof node.fontFamily === "function") node.fontFamily(String(textCfg.priceFontFamily || "Arial"));
          if (typeof node.fill === "function") node.fill(String(textCfg.priceColor || "#ffffff"));
        });
      }
    }

    if (!textCfg.hideBarcode) {
      const raw = String(product?.ean || "").replace(/\D/g, "");
      const eanCode = raw.length >= 12 ? raw.slice(0, 13) : "5901234123457";
      const url = await makeBarcodeDataUrl(eanCode);
      if (url) {
        await addImageNodeFromUrl(url, "EAN", "ean", { loadStamp });
        if (!isWorkspaceLoadStampActive(loadStamp)) return false;
        const eanNode = findWorkspaceNodeByKind("ean");
        setNodeRect(eanNode, toStageRectFromPct(single.barcodeArea, stageW, stageH, fallbackRects.ean));
      }
    }

    if (!textCfg.hideFlag) {
      addFlagNode();
      const flagNode = findWorkspaceNodeByKind("flag");
      const flagRect = toStageRectFromPct(single.flagArea, stageW, stageH, fallbackRects.flag);
      if (flagNode) {
        flagNode.x(flagRect.x);
        flagNode.y(flagRect.y);
      }
    }

    if (single.divider && Number(single.divider.x) >= 0 && Number(single.divider.h) > 0) {
      addDividerNode();
      const dividerNode = findWorkspaceNodeByKind("divider");
      if (dividerNode) {
        const x = (clampPct(single.divider.x, 0) / 100) * stageW;
        const y = (clampPct(single.divider.y, 0) / 100) * stageH;
        const h = (clampPct(single.divider.h, 0) / 100) * stageH;
        dividerNode.x(x);
        dividerNode.y(y);
        dividerNode.points([0, 0, 0, Math.max(8, h)]);
        dividerNode.stroke(String(textCfg.dividerColor || "#9fb6d7"));
      }
    }

    ws.layer.batchDraw();
    return true;
  }

  async function resetWorkspaceToBlankState(options = {}) {
    if (!options.preserveLoadedProductStyle) {
      activeLoadedStyleId = "";
      refreshSavedStylesSelect("");
    }
    const styleNameInput = document.getElementById(STYLE_NAME_ID);
    if (styleNameInput && options.clearName !== false) {
      styleNameInput.value = "";
    }
    const ws = ensureWorkspaceEditor();
    if (typeof ws?.textEditorCleanup === "function") {
      try { ws.textEditorCleanup(); } catch (_err) {}
    }
    if (ws) ws.clipboard = null;
    invalidateWorkspaceAsyncState();
    clearWorkspaceScene();
    selectWorkspaceNode(null);
    if (options.showStatus !== false) {
      setSaveStatus(
        String(options.statusMessage || "Workspace wyczyszczony. Startujesz od pustego obszaru roboczego."),
        "default"
      );
    }
    return true;
  }

  async function seedWorkspaceWithSelectedProduct(product, options = {}) {
    if (!product) return false;
    await resetWorkspaceToBlankState({
      clearName: options.clearName !== false,
      showStatus: false
    });
    const ws = ensureWorkspaceEditor();
    if (!ws?.stage || !ws?.layer) return false;
    const loadStamp = Number(getWorkspace().loadStamp || 0);
    const layout = getStarterWorkspaceLayout(ws.stage.width(), ws.stage.height());

    if (!isWorkspaceLoadStampActive(loadStamp)) return false;
    addProductFieldText("name");
    placeStarterTextNode(findWorkspaceNodeByKind("nameText"), layout.name);

    if (!isWorkspaceLoadStampActive(loadStamp)) return false;
    addProductFieldText("index");
    placeStarterTextNode(findWorkspaceNodeByKind("indexText"), layout.index);

    if (!isWorkspaceLoadStampActive(loadStamp)) return false;
    addProductFieldText("package");
    placeStarterTextNode(findWorkspaceNodeByKind("packageText"), layout.package);

    if (!isWorkspaceLoadStampActive(loadStamp)) return false;
    const imageNode = await upsertProductImageOnWorkspace(product, { loadStamp });
    if (!isWorkspaceLoadStampActive(loadStamp)) return false;
    if (imageNode) {
      fitImageNodeIntoRect(imageNode, layout.imageRect);
      if (typeof imageNode.moveToBottom === "function") imageNode.moveToBottom();
    }

    selectWorkspaceNode(null);
    ws.layer.batchDraw();
    if (options.showStatus !== false) {
      setSaveStatus("Wybrano produkt. Dodano automatycznie: zdjecie, nazwe, indeks i opak.", "default");
    }
    return true;
  }

  async function loadPriceStyleToWorkspace(priceStyleDef) {
    const snapshot = priceStyleDef?.snapshot && typeof priceStyleDef.snapshot === "object"
      ? cloneJsonSnapshot(priceStyleDef.snapshot)
      : null;
    if (!hasSnapshotNodes(snapshot)) return false;
    setDraftSnapshotForTab(BUILDER_TAB_PRICE, snapshot);
    if (String(state.activeBuilderTab || "") === BUILDER_TAB_PRICE) {
      return await restoreWorkspaceForBuilderTab(BUILDER_TAB_PRICE);
    }
    return true;
  }

  async function applyPriceStyleToProductWorkspace(priceStyleDef) {
    const snapshot = priceStyleDef?.snapshot && typeof priceStyleDef.snapshot === "object"
      ? cloneJsonSnapshot(priceStyleDef.snapshot)
      : null;
    if (!hasSnapshotNodes(snapshot)) return false;
    return await appendSnapshotNodesToWorkspace(snapshot, {
      replacePriceStyle: true,
      markPriceStyle: true
    });
  }

  function makeBarcodeDataUrl(value) {
    return new Promise((resolve) => {
      try {
        if (!window.JsBarcode) {
          resolve(null);
          return;
        }
        const canvas = document.createElement("canvas");
        const code = String(value || "").replace(/\D/g, "").slice(0, 13) || "5901234123457";
        window.JsBarcode(canvas, code, {
          format: "EAN13",
          width: 2,
          height: 88,
          displayValue: true,
          margin: 8,
          background: "#ffffff",
          lineColor: "#111111"
        });
        resolve(canvas.toDataURL("image/png"));
      } catch (_err) {
        resolve(null);
      }
    });
  }

  function makeQrDataUrl(value) {
    return new Promise((resolve) => {
      try {
        if (!window.QRCode) {
          resolve(null);
          return;
        }
        const holder = document.createElement("div");
        holder.style.position = "fixed";
        holder.style.left = "-9999px";
        holder.style.top = "-9999px";
        document.body.appendChild(holder);
        // qrcodejs renders synchronously in most cases, but we keep a small timeout fallback.
        // eslint-disable-next-line no-new
        new window.QRCode(holder, {
          text: String(value || "https://world-food.local"),
          width: 220,
          height: 220
        });
        setTimeout(() => {
          const canvas = holder.querySelector("canvas");
          const img = holder.querySelector("img");
          const data = canvas
            ? canvas.toDataURL("image/png")
            : (img ? String(img.src || "") : "");
          holder.remove();
          resolve(data || null);
        }, 80);
      } catch (_err) {
        resolve(null);
      }
    });
  }

  function getCurrentProductForWorkspace() {
    return getSelectedProduct();
  }

  async function upsertProductImageOnWorkspace(product, options = {}) {
    const ws = ensureWorkspaceEditor();
    if (!ws || !product) return;
    const stamp = ++state.imageSelectionStamp;
    const loadStamp = Number(options?.loadStamp || 0);
    const resolved = await resolveProductImageUrl(product);
    if (stamp !== state.imageSelectionStamp) return null;
    if (!isWorkspaceLoadStampActive(loadStamp)) return null;
    if (!resolved) return null;

    const existing = ws.layer.findOne((node) => node && node.getAttr && node.getAttr("workspaceKind") === "productImage");
    if (existing && existing instanceof window.Konva.Image) {
      const currentSrc = String(existing.getAttr?.("originalSrc") || "");
      const currentProductId = String(existing.getAttr?.("workspaceProductId") || "");
      const nextProductId = String(product.id || "");
      if (currentSrc && currentSrc === resolved && currentProductId === nextProductId) {
        return existing;
      }
      const currentX = Number(existing.x() || 0);
      const currentY = Number(existing.y() || 0);
      const currentWidth = Math.max(24, Number(existing.width() || 180) * Math.abs(Number(existing.scaleX() || 1)));
      const currentHeight = Math.max(24, Number(existing.height() || 220) * Math.abs(Number(existing.scaleY() || 1)));
      return await new Promise((resolve) => {
        window.Konva.Image.fromURL(resolved, (nextImage) => {
          if (!nextImage) {
            resolve(null);
            return;
          }
          if (!isWorkspaceLoadStampActive(loadStamp) || stamp !== state.imageSelectionStamp) {
            try { nextImage.destroy(); } catch (_err) {}
            resolve(null);
            return;
          }
          nextImage.x(currentX);
          nextImage.y(currentY);
          nextImage.width(currentWidth);
          nextImage.height(currentHeight);
          nextImage.rotation(Number(existing.rotation() || 0));
          nextImage.scaleX(1);
          nextImage.scaleY(1);
          nextImage.setAttrs({
            workspaceSelectable: true,
            workspaceLabel: "Zdjecie produktu",
            workspaceKind: "productImage",
            workspaceProductId: nextProductId,
            originalSrc: resolved
          });
          if (typeof nextImage.draggable === "function") nextImage.draggable(true);
          existing.destroy();
          ws.layer.add(nextImage);
          selectWorkspaceNode(nextImage);
          ws.layer.batchDraw();
          resolve(nextImage);
        });
      });
    }

    return await new Promise((resolve) => {
      window.Konva.Image.fromURL(resolved, (imageNode) => {
        if (!imageNode) {
          resolve(null);
          return;
        }
        if (!isWorkspaceLoadStampActive(loadStamp) || stamp !== state.imageSelectionStamp) {
          try { imageNode.destroy(); } catch (_err) {}
          resolve(null);
          return;
        }
        const naturalW = Number(imageNode.width() || 280);
        const naturalH = Number(imageNode.height() || 360);
        const fit = computeFitSize(naturalW, naturalH, ws.stage.width(), ws.stage.height(), 0.3);
        imageNode.width(fit.width);
        imageNode.height(fit.height);
        imageNode.setAttrs({
          workspaceLabel: "Zdjecie produktu",
          workspaceKind: "productImage",
          workspaceProductId: String(product.id || ""),
          originalSrc: resolved
        });
        addWorkspaceNode(imageNode);
        resolve(imageNode);
      });
    });
  }

  function mutateSelectedNode(mutator) {
    const ws = ensureWorkspaceEditor();
    if (!ws || !ws.selectedNode || typeof mutator !== "function") return;
    mutator(ws.selectedNode);
    if (ws.layer) ws.layer.batchDraw();
  }

  function duplicateSelectedNode() {
    const ws = ensureWorkspaceEditor();
    if (!ws || !ws.selectedNode || typeof ws.selectedNode.clone !== "function") return;
    const clone = ws.selectedNode.clone({
      x: Number(ws.selectedNode.x() || 0) + 24,
      y: Number(ws.selectedNode.y() || 0) + 24
    });
    if (typeof clone.draggable === "function") clone.draggable(true);
    clone.setAttr("workspaceSelectable", true);
    ws.layer.add(clone);
    selectWorkspaceNode(clone);
    ws.layer.batchDraw();
  }

  function copySelectedNode() {
    const ws = ensureWorkspaceEditor();
    if (!ws?.selectedNode || typeof ws.selectedNode.clone !== "function") return;
    ws.clipboard = ws.selectedNode.clone();
  }

  function pasteClipboardNode() {
    const ws = ensureWorkspaceEditor();
    if (!ws?.clipboard || typeof ws.clipboard.clone !== "function") return;
    const clone = ws.clipboard.clone({
      x: Number(ws.clipboard.x?.() || 0) + 24,
      y: Number(ws.clipboard.y?.() || 0) + 24
    });
    if (typeof clone.draggable === "function") clone.draggable(true);
    clone.setAttr("workspaceSelectable", true);
    ws.layer.add(clone);
    selectWorkspaceNode(clone);
    ws.layer.batchDraw();
  }

  function deleteSelectedNode() {
    const ws = ensureWorkspaceEditor();
    if (!ws || !ws.selectedNode) return;
    ws.selectedNode.destroy();
    selectWorkspaceNode(null);
    ws.layer.batchDraw();
  }

  async function handleWorkspaceTool(tool) {
    const action = String(tool || "").trim();
    if (!action) return;
    ensureWorkspaceEditor();
    if (!window.Konva) return;

    if (action === "add-product-image") {
      await upsertProductImageOnWorkspace(getCurrentProductForWorkspace());
      return;
    }
    if (action === "add-name") {
      addProductFieldText("name");
      return;
    }
    if (action === "add-index") {
      addProductFieldText("index");
      return;
    }
    if (action === "add-package") {
      addProductFieldText("package");
      return;
    }
    if (action === "add-price") {
      if (String(state.activeBuilderTab || "") === BUILDER_TAB_PRODUCT) {
        const select = document.getElementById(PRICE_STYLE_APPLY_SELECT_ID);
        const styleId = String(select?.value || "").trim();
        if (styleId) {
          const priceStyleDef = getCustomPriceStyleById(styleId);
          if (!priceStyleDef) {
            setSaveStatus("Nie znaleziono wybranego stylu ceny.", "error");
            return;
          }
          const applied = await applyPriceStyleToProductWorkspace(priceStyleDef);
          if (!applied) {
            setSaveStatus("Nie udalo sie zastosowac stylu ceny.", "error");
            return;
          }
          setSaveStatus(`Dodano styl ceny: ${String(priceStyleDef.label || styleId)}.`, "default");
          return;
        }
      }
      addPriceGroupNode();
      return;
    }
    if (action === "add-badge-rect") {
      addBadgeNode("rect");
      return;
    }
    if (action === "add-badge-circle") {
      addBadgeNode("circle");
      return;
    }
    if (action === "add-divider") {
      addDividerNode();
      return;
    }
    if (action === "add-flag") {
      addFlagNode();
      return;
    }
    if (action === "add-text") {
      addTextNode();
      return;
    }
    if (action === "add-rect") {
      addRectNode();
      return;
    }
    if (action === "add-circle") {
      addCircleNode();
      return;
    }
    if (action === "add-line") {
      addLineNode();
      return;
    }
    if (action === "add-ean") {
      const product = getCurrentProductForWorkspace();
      const raw = String(product?.ean || "").replace(/\D/g, "");
      const eanCode = raw.length >= 12 ? raw.slice(0, 13) : "5901234123457";
      const url = await makeBarcodeDataUrl(eanCode);
      if (url) addImageNodeFromUrl(url, "EAN", "ean");
      return;
    }
    if (action === "add-currency") {
      addCurrencyNode();
      return;
    }
    if (action === "edit-text") {
      const textNode = getEditableTextNodeFromSelected();
      if (!textNode) {
        setSaveStatus("Zaznacz element tekstowy i kliknij Edytuj tekst.", "error");
        return;
      }
      beginTextEdit(textNode);
      return;
    }
    if (action === "apply-text-style") {
      applyTextStyleToSelected();
      return;
    }
    if (action === "apply-divider-color") {
      applyDividerColorToSelected();
      return;
    }
    if (action === "load-style") {
      const select = document.getElementById(STYLE_LOAD_SELECT_ID);
      const styleId = String(select?.value || "").trim();
      if (!styleId) {
        setSaveStatus("Wybierz zapisany styl z listy.", "error");
        return;
      }
      const styleDef = getCustomStyleById(styleId);
      if (!styleDef) {
        setSaveStatus("Nie znaleziono stylu do wczytania.", "error");
        return;
      }
      const ok = await loadStyleToWorkspace(styleDef);
      if (!ok) {
        setSaveStatus("Nie udalo sie wczytac stylu do workspace.", "error");
        return;
      }
      activeLoadedStyleId = styleId;
      const input = document.getElementById(STYLE_NAME_ID);
      if (input) input.value = String(styleDef.label || "");
      setDraftSnapshotForTab(BUILDER_TAB_PRODUCT, styleDef?.config?.__editorSnapshot || buildWorkspaceSnapshot());
      setSaveStatus(`Wczytano styl do edycji: ${String(styleDef.label || styleId)}.`, "default");
      return;
    }
    if (action === "load-price-style") {
      const select = document.getElementById(PRICE_STYLE_LOAD_SELECT_ID);
      const styleId = String(select?.value || "").trim();
      if (!styleId) {
        setSaveStatus("Wybierz zapisany styl ceny z listy.", "error");
        return;
      }
      const styleDef = getCustomPriceStyleById(styleId);
      if (!styleDef) {
        setSaveStatus("Nie znaleziono stylu ceny do wczytania.", "error");
        return;
      }
      const ok = await loadPriceStyleToWorkspace(styleDef);
      if (!ok) {
        setSaveStatus("Nie udalo sie wczytac stylu ceny do workspace.", "error");
        return;
      }
      activeLoadedPriceStyleId = styleId;
      const input = document.getElementById(PRICE_STYLE_NAME_ID);
      if (input) input.value = String(styleDef.label || "");
      refreshSavedPriceStylesSelect(styleId);
      setDraftSnapshotForTab(BUILDER_TAB_PRICE, styleDef.snapshot || buildWorkspaceSnapshot());
      setSaveStatus(`Wczytano styl ceny: ${String(styleDef.label || styleId)}.`, "default");
      return;
    }
    if (action === "clear-style") {
      if (String(state.activeBuilderTab || "") === BUILDER_TAB_PRICE) {
        activeLoadedPriceStyleId = "";
        refreshSavedPriceStylesSelect("");
        setDraftSnapshotForTab(BUILDER_TAB_PRICE, null);
        const priceNameInput = document.getElementById(PRICE_STYLE_NAME_ID);
        if (priceNameInput) priceNameInput.value = "";
      } else {
        activeLoadedStyleId = "";
        refreshSavedStylesSelect("");
        setDraftSnapshotForTab(BUILDER_TAB_PRODUCT, null);
      }
      await resetWorkspaceToBlankState({
        clearName: String(state.activeBuilderTab || "") !== BUILDER_TAB_PRICE,
        preserveLoadedProductStyle: String(state.activeBuilderTab || "") === BUILDER_TAB_PRICE,
        showStatus: true,
        statusMessage: String(state.activeBuilderTab || "") === BUILDER_TAB_PRICE
          ? "Workspace wyczyszczony. Tworzysz teraz pusty styl ceny."
          : "Workspace wyczyszczony. Masz pusty obszar roboczy."
      });
      return;
    }
    if (action === "save-style") {
      const input = document.getElementById(STYLE_NAME_ID);
      const rawName = String(input?.value || "").trim();
      if (!rawName) {
        setSaveStatus("Podaj nazwe stylu przed zapisem.", "error");
        return;
      }
      const wasEditingExistingStyle = !!activeLoadedStyleId;
      const styleId = activeLoadedStyleId || `new-style-${slugify(rawName) || Date.now()}`;
      const config = buildStyleConfigFromWorkspace();
      if (!config) {
        setSaveStatus("Brak danych workspace do zapisu.", "error");
        return;
      }
      const updatedAt = Date.now();
      const styleDef = {
        id: styleId,
        label: rawName,
        updatedAt,
        config: {
          ...config,
          updatedAt
        }
      };
      setSaveStatus(`Zapisywanie stylu: ${rawName}...`, "default");
      let mergedStyles = upsertCustomStyleInStorage(styleDef);
      let remoteSaveFailed = false;
      registerStyleForRuntime(styleDef);
      try {
        const remoteStyles = await loadCustomStylesFromRemoteStorage();
        mergedStyles = mergeCustomStyleLists(mergedStyles, remoteStyles);
      } catch (_err) {}
      try {
        await saveCustomStylesToRemoteStorage(mergedStyles);
        saveCustomStylesToLocalStorage(mergedStyles);
      } catch (err) {
        console.warn("New Style: nie udało się zapisać styles/styles.json:", err);
        remoteSaveFailed = true;
        setSaveStatus(`Zapisano lokalnie (${rawName}), ale nie udalo sie zapisac do Firebase.`, "error");
      }
      if (typeof window.refreshStylWlasnyModuleLayoutOptions === "function") {
        try {
          window.refreshStylWlasnyModuleLayoutOptions();
        } catch (_err) {}
      }
      try {
        window.dispatchEvent(new CustomEvent("stylWlasny:module-layout-style-saved", {
          detail: { id: styleId, label: rawName }
        }));
      } catch (_err) {}
      refreshSavedStylesSelect(styleId);
      if (!remoteSaveFailed) {
        const modeLabel = wasEditingExistingStyle ? "Nadpisano styl" : "Zapisano styl";
        setSaveStatus(`${modeLabel}: ${rawName}. Dostepny lokalnie i w Firebase (styles.json).`, "default");
      }
      activeLoadedStyleId = styleId;
      setDraftSnapshotForTab(BUILDER_TAB_PRODUCT, config.__editorSnapshot || buildWorkspaceSnapshot());
      return;
    }
    if (action === "save-price-style") {
      const input = document.getElementById(PRICE_STYLE_NAME_ID);
      const rawName = String(input?.value || "").trim();
      if (!rawName) {
        setSaveStatus("Podaj nazwe stylu ceny przed zapisem.", "error");
        return;
      }
      const wasEditingExistingPriceStyle = !!activeLoadedPriceStyleId;
      const snapshot = buildPriceStyleSnapshotFromWorkspace();
      if (!hasSnapshotNodes(snapshot)) {
        setSaveStatus("Brak elementow ceny do zapisu.", "error");
        return;
      }
      const styleId = activeLoadedPriceStyleId || `price-style-${slugify(rawName) || Date.now()}`;
      const updatedAt = Date.now();
      const styleDef = {
        id: styleId,
        label: rawName,
        updatedAt,
        snapshot
      };
      setSaveStatus(`Zapisywanie stylu ceny: ${rawName}...`, "default");
      let mergedStyles = upsertCustomPriceStyleInStorage(styleDef);
      let remoteSaveFailed = false;
      try {
        const remoteStyles = await loadCustomPriceStylesFromRemoteStorage();
        mergedStyles = mergeCustomStyleLists(mergedStyles, remoteStyles, normalizeCustomPriceStyleList);
      } catch (_err) {}
      try {
        await saveCustomPriceStylesToRemoteStorage(mergedStyles);
        saveCustomPriceStylesToLocalStorage(mergedStyles);
      } catch (err) {
        console.warn("New Style: nie udało się zapisać styles/customprice.json:", err);
        remoteSaveFailed = true;
        setSaveStatus(`Zapisano lokalnie styl ceny (${rawName}), ale nie udalo sie zapisac do Firebase.`, "error");
      }
      activeLoadedPriceStyleId = styleId;
      setDraftSnapshotForTab(BUILDER_TAB_PRICE, snapshot);
      refreshSavedPriceStylesSelect(styleId);
      if (typeof window.refreshStylWlasnyCustomPriceStyleOptions === "function") {
        try {
          window.refreshStylWlasnyCustomPriceStyleOptions();
        } catch (_err) {}
      }
      try {
        window.dispatchEvent(new CustomEvent("stylWlasny:price-style-saved", {
          detail: { id: styleId, label: rawName }
        }));
      } catch (_err) {}
      if (!remoteSaveFailed) {
        const modeLabel = wasEditingExistingPriceStyle ? "Nadpisano styl ceny" : "Zapisano styl ceny";
        setSaveStatus(`${modeLabel}: ${rawName}. Dostepny lokalnie i w Firebase (customprice.json).`, "default");
      }
      return;
    }
    if (action === "download-style-json") {
      const localStyles = loadCustomStylesFromLocalStorage();
      const payload = {
        version: 1,
        styles: localStyles
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "style.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch (_err) {}
      }, 800);
      setSaveStatus("Pobrano style.json z zapisanymi stylami.", "default");
      return;
    }
    if (action === "download-price-style-json") {
      const localStyles = loadCustomPriceStylesFromLocalStorage();
      const payload = {
        version: 1,
        styles: localStyles
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customprice.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch (_err) {}
      }, 800);
      setSaveStatus("Pobrano customprice.json z zapisanymi stylami ceny.", "default");
      return;
    }
    if (action === "scale-up") {
      mutateSelectedNode((node) => {
        node.scaleX(Math.max(0.1, Number(node.scaleX() || 1) * 1.08));
        node.scaleY(Math.max(0.1, Number(node.scaleY() || 1) * 1.08));
      });
      return;
    }
    if (action === "scale-down") {
      mutateSelectedNode((node) => {
        node.scaleX(Math.max(0.1, Number(node.scaleX() || 1) * 0.92));
        node.scaleY(Math.max(0.1, Number(node.scaleY() || 1) * 0.92));
      });
      return;
    }
    if (action === "rotate-left") {
      mutateSelectedNode((node) => {
        node.rotation(Number(node.rotation() || 0) - 6);
      });
      return;
    }
    if (action === "rotate-right") {
      mutateSelectedNode((node) => {
        node.rotation(Number(node.rotation() || 0) + 6);
      });
      return;
    }
    if (action === "bring-front") {
      mutateSelectedNode((node) => node.moveToTop());
      return;
    }
    if (action === "send-back") {
      mutateSelectedNode((node) => node.moveToBottom());
      return;
    }
    if (action === "duplicate") {
      duplicateSelectedNode();
      return;
    }
    if (action === "delete") {
      deleteSelectedNode();
    }
  }

  function ensureTheme() {
    const existing = document.getElementById(STYLE_ID);
    const styleEl = existing || document.createElement("style");
    if (!existing) {
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: rgba(2, 6, 23, 0.88);
        z-index: 1000002;
        font-family: Arial, sans-serif;
      }

      #${MODAL_ID} .new-style-shell {
        position: relative;
        isolation: isolate;
        contain: layout paint style;
        width: min(2200px, calc(100vw - 2px));
        height: calc(100dvh - 2px);
        max-width: 100vw;
        max-height: 100dvh;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: 8px;
        padding: 8px;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: linear-gradient(180deg, #08111f 0%, #0b1322 100%);
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.42);
        color: #e5eefb;
        overflow: hidden;
      }

      #${MODAL_ID} .new-style-shell * {
        min-width: 0;
      }

      #${MODAL_ID} .new-style-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      #${MODAL_ID} .new-style-title {
        margin: 0;
        font-size: clamp(24px, 2.2vw, 42px);
        font-weight: 800;
        letter-spacing: 0.02em;
      }

      #${MODAL_ID} .new-style-subtitle {
        margin: 4px 0 0;
        color: #94a3b8;
        font-size: 14px;
      }

      #${MODAL_ID} .new-style-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      #${MODAL_ID} .new-style-btn {
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.76);
        color: #e5eefb;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.2;
        padding: 10px 16px;
        cursor: pointer;
      }

      #${MODAL_ID} .new-style-btn:hover {
        border-color: rgba(103, 232, 249, 0.4);
      }

      #${MODAL_ID} .new-style-btn--primary {
        background: linear-gradient(135deg, #22d3ee, #34d399);
        color: #05202a;
        border-color: transparent;
      }

      #${MODAL_ID} .new-style-body {
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
        gap: 8px;
        align-items: stretch;
      }

      #${MODAL_ID} .new-style-panel {
        min-height: 0;
        display: grid;
        gap: 6px;
        padding: 8px;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.14);
        background: rgba(8, 15, 28, 0.72);
      }

      #${MODAL_ID} .new-style-panel--data {
        grid-template-rows: auto auto auto minmax(160px, 1fr) minmax(120px, 0.72fr);
      }

      #${MODAL_ID} .new-style-panel--builder {
        grid-template-rows: auto minmax(0, 1fr);
        overflow: auto;
      }

      #${MODAL_ID} .new-style-panel-title {
        margin: 0;
        font-size: 14px;
        font-weight: 800;
        color: #f8fbff;
      }

      #${MODAL_ID} .new-style-panel-note {
        margin: 4px 0 0;
        color: #8ea4c2;
        font-size: 12px;
        line-height: 1.45;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #${MODAL_ID} .new-style-json-status {
        font-size: 12px;
        color: #8ea4c2;
      }

      #${MODAL_ID} .new-style-input {
        width: 100%;
        border: 1px solid rgba(96, 165, 250, 0.18);
        border-radius: 12px;
        background: rgba(4, 8, 16, 0.94);
        color: #dbe7f6;
        padding: 11px 12px;
        font-size: 13px;
        box-sizing: border-box;
      }

      #${MODAL_ID} .new-style-input::placeholder {
        color: #6b7f9c;
      }

      #${MODAL_ID} .new-style-product-list {
        min-height: 0;
        overflow: auto;
        display: grid;
        gap: 8px;
        padding-right: 2px;
      }

      #${MODAL_ID} .new-style-product-item {
        padding: 11px 12px;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.14);
        background: rgba(15, 23, 42, 0.48);
        cursor: pointer;
        transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
      }

      #${MODAL_ID} .new-style-product-item:hover {
        transform: translateY(-1px);
        border-color: rgba(103, 232, 249, 0.36);
      }

      #${MODAL_ID} .new-style-product-item.is-active {
        border-color: rgba(34, 211, 238, 0.7);
        background: rgba(8, 145, 178, 0.16);
        box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.18);
      }

      #${MODAL_ID} .new-style-product-name {
        font-size: 13px;
        font-weight: 700;
        color: #f8fbff;
        line-height: 1.35;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #${MODAL_ID} .new-style-product-meta {
        margin-top: 6px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        color: #8ea4c2;
        font-size: 11px;
      }

      #${MODAL_ID} .new-style-product-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 7px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
      }

      #${MODAL_ID} .new-style-empty {
        padding: 18px 14px;
        border-radius: 14px;
        border: 1px dashed rgba(148, 163, 184, 0.18);
        color: #94a3b8;
        font-size: 12px;
        text-align: center;
      }

      #${MODAL_ID} .new-style-json-viewer {
        width: 100%;
        height: 100%;
        resize: none;
        border: 1px solid rgba(96, 165, 250, 0.18);
        border-radius: 14px;
        background: rgba(4, 8, 16, 0.94);
        color: #dbe7f6;
        padding: 14px;
        font-size: 12px;
        line-height: 1.45;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        box-sizing: border-box;
      }

      #${MODAL_ID} .new-style-builder-tabs {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        padding: 1px 2px 4px 0;
      }

      #${MODAL_ID} .new-style-builder-tab {
        flex: 0 0 auto;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 999px;
        background: rgba(8, 15, 30, 0.66);
        color: #dbe7f6;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.15;
        padding: 8px 14px;
        cursor: pointer;
      }

      #${MODAL_ID} .new-style-builder-tab.is-active {
        border-color: rgba(34, 211, 238, 0.7);
        background: rgba(8, 145, 178, 0.18);
        box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.18);
      }

      #${MODAL_ID} [data-builder-panel][hidden] {
        display: none !important;
      }

      #${MODAL_ID} .new-style-workspace {
        min-height: 0;
        display: grid;
        grid-template-rows: auto auto auto auto minmax(0, 1fr) auto auto auto;
        gap: 4px;
      }

      #${MODAL_ID} .new-style-workspace-tools {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 1px 2px 4px 0;
        scrollbar-width: thin;
      }

      #${MODAL_ID} .new-style-tool-btn {
        flex: 0 0 auto;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 10px;
        background: rgba(8, 15, 30, 0.66);
        color: #dbe7f6 !important;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.15;
        padding: 8px 11px;
        cursor: pointer;
        white-space: nowrap;
      }

      #${MODAL_ID} .new-style-tool-btn:hover {
        border-color: rgba(103, 232, 249, 0.44);
      }

      #${MODAL_ID} .new-style-text-tools {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 1px 2px 4px 0;
        scrollbar-width: thin;
      }

      #${MODAL_ID} .new-style-text-tools-label {
        flex: 0 0 auto;
        font-size: 11px;
        color: #8ea4c2;
        font-weight: 700;
      }

      #${MODAL_ID} .new-style-text-font,
      #${MODAL_ID} .new-style-text-size,
      #${MODAL_ID} .new-style-text-color {
        flex: 0 0 auto;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 10px;
        background: rgba(8, 15, 30, 0.66);
        color: #dbe7f6;
        font-size: 11px;
        font-weight: 700;
        height: 34px;
        padding: 6px 10px;
      }

      #${MODAL_ID} .new-style-text-font {
        min-width: 160px;
      }

      #${MODAL_ID} .new-style-text-size {
        width: 84px;
      }

      #${MODAL_ID} .new-style-text-color {
        width: 42px;
        padding: 3px;
      }

      #${MODAL_ID} .new-style-save-tools {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 1px 2px 4px 0;
        scrollbar-width: thin;
      }

      #${MODAL_ID} .new-style-save-input {
        flex: 1 0 260px;
        min-width: 220px;
        max-width: 100%;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 10px;
        background: rgba(8, 15, 30, 0.66);
        color: #dbe7f6;
        font-size: 12px;
        font-weight: 700;
        height: 34px;
        padding: 7px 10px;
      }

      #${MODAL_ID} .new-style-save-status {
        font-size: 11px;
        line-height: 1.2;
        color: #8ea4c2;
        min-height: 12px;
      }

      #${MODAL_ID} .new-style-canvas {
        position: relative;
        width: auto;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
        min-width: 0;
        aspect-ratio: 500 / 362;
        min-height: 0;
        border-radius: 18px;
        justify-self: center;
        align-self: stretch;
        border: 0;
        background: transparent;
        overflow: hidden;
      }

      #${MODAL_ID} .new-style-canvas-inner {
        position: absolute;
        inset: 0;
        display: block;
        border-radius: 18px;
        border: 1px dashed rgba(103, 232, 249, 0.36);
        background:
          radial-gradient(130% 90% at 50% 45%, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0.08) 38%, rgba(255, 255, 255, 0) 64%),
          linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
          linear-gradient(180deg, rgba(8, 13, 24, 0.96), rgba(12, 18, 32, 0.98));
        background-size: auto, 24px 24px, 24px 24px, auto;
        overflow: hidden;
      }

      #${MODAL_ID} .new-style-workspace-stage {
        position: absolute;
        left: 0;
        top: 0;
        touch-action: none;
        border: 2px solid rgba(34, 211, 238, 0.72);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.025);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.16),
          0 0 0 1px rgba(34, 211, 238, 0.24);
      }

      #${MODAL_ID} .new-style-workspace-stage::before {
        content: "OBSZAR ROBOCZY 1:1";
        position: absolute;
        left: 10px;
        top: 8px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: rgba(103, 232, 249, 0.92);
        background: rgba(2, 6, 23, 0.55);
        border: 1px solid rgba(103, 232, 249, 0.35);
        border-radius: 999px;
        padding: 4px 8px;
        pointer-events: none;
        z-index: 4;
      }

      #${MODAL_ID} .new-style-workspace-stage::after {
        content: attr(data-workspace-size);
        position: absolute;
        right: 10px;
        top: 8px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: rgba(224, 242, 254, 0.9);
        background: rgba(2, 6, 23, 0.42);
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 999px;
        padding: 3px 8px;
        pointer-events: none;
        z-index: 4;
      }

      #${MODAL_ID} .new-style-workspace-hint {
        position: absolute;
        right: 12px;
        bottom: 12px;
        max-width: min(40%, 340px);
        padding: 8px 10px;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        background: rgba(2, 6, 23, 0.55);
        color: #8ea4c2;
        font-size: 11px;
        line-height: 1.4;
      }

      #${MODAL_ID} .new-style-workspace-selected {
        font-size: 11px;
        line-height: 1.2;
        color: #22d3ee;
        font-weight: 700;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #${MODAL_ID} .new-style-workspace-tools::-webkit-scrollbar,
      #${MODAL_ID} .new-style-text-tools::-webkit-scrollbar,
      #${MODAL_ID} .new-style-save-tools::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      #${MODAL_ID} .new-style-workspace-tools::-webkit-scrollbar-thumb,
      #${MODAL_ID} .new-style-text-tools::-webkit-scrollbar-thumb,
      #${MODAL_ID} .new-style-save-tools::-webkit-scrollbar-thumb {
        background: rgba(103, 232, 249, 0.34);
        border-radius: 999px;
      }

      @media (max-width: 1450px) {
        #${MODAL_ID} .new-style-body {
          grid-template-columns: minmax(270px, 330px) minmax(0, 1fr);
        }
      }

      @media (max-width: 1240px) {
        #${MODAL_ID} .new-style-body {
          grid-template-columns: 1fr;
        }

        #${MODAL_ID} .new-style-panel--builder {
          order: 1;
        }

        #${MODAL_ID} .new-style-panel--data {
          order: 2;
          grid-template-rows: auto auto auto minmax(180px, 1fr) minmax(140px, 180px);
        }
      }

      @media (max-width: 980px) {
        #${MODAL_ID} .new-style-shell {
          width: calc(100vw - 2px);
          height: calc(100dvh - 2px);
          border-radius: 10px;
          padding: 6px;
        }

        #${MODAL_ID} .new-style-title {
          font-size: 28px;
        }

        #${MODAL_ID} .new-style-subtitle {
          font-size: 12px;
        }

        #${MODAL_ID} .new-style-panel {
          border-radius: 14px;
        }

        #${MODAL_ID} .new-style-workspace {
          grid-template-rows: auto auto auto minmax(280px, 1fr) auto auto auto;
        }

        #${MODAL_ID} .new-style-canvas {
          min-width: 0;
        }

        #${MODAL_ID} .new-style-workspace-hint {
          max-width: min(60%, 220px);
          font-size: 10px;
        }
      }

      @media (max-width: 760px) {
        #${MODAL_ID} .new-style-header {
          align-items: flex-start;
        }

        #${MODAL_ID} .new-style-actions {
          width: 100%;
          justify-content: flex-end;
        }

        #${MODAL_ID} .new-style-btn {
          padding: 9px 12px;
          font-size: 12px;
        }

        #${MODAL_ID} .new-style-tool-btn {
          font-size: 11px;
          padding: 7px 9px;
        }

        #${MODAL_ID} .new-style-workspace-selected {
          font-size: 11px;
        }

        #${MODAL_ID} .new-style-workspace-hint {
          display: none;
        }

        #${MODAL_ID} .new-style-save-input {
          min-width: 180px;
        }
      }
    `;
  }

  function ensureModal() {
    ensureTheme();
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="new-style-shell" role="dialog" aria-modal="true" aria-labelledby="newStyleTitle">
        <div class="new-style-header">
          <div>
            <h2 class="new-style-title" id="newStyleTitle">New Style</h2>
            <p class="new-style-subtitle">Po lewej baza produktow z JSON, po prawej workspace pod budowe nowego kreatora stylow.</p>
          </div>
          <div class="new-style-actions">
            <button type="button" class="new-style-btn" id="${REFRESH_BTN_ID}">Odswiez baze</button>
            <button type="button" class="new-style-btn new-style-btn--primary" id="${CLOSE_BTN_ID}">Zamknij</button>
          </div>
        </div>
        <div class="new-style-body">
          <section class="new-style-panel new-style-panel--data">
            <div>
              <h3 class="new-style-panel-title">Baza produktow</h3>
              <p class="new-style-panel-note">${PRODUCT_DATA_URL}</p>
            </div>
            <div class="new-style-json-status" id="${PRODUCT_STATUS_ID}">Ladowanie danych produktowych...</div>
            <input id="${PRODUCT_SEARCH_ID}" class="new-style-input" type="search" placeholder="Szukaj po nazwie, indeksie, EAN albo marce">
            <div id="${PRODUCT_LIST_ID}" class="new-style-product-list"></div>
            <textarea id="${PRODUCT_JSON_ID}" class="new-style-json-viewer" spellcheck="false" readonly></textarea>
          </section>
          <section class="new-style-panel new-style-panel--builder">
            <div>
              <h3 class="new-style-panel-title">Nowy kreator stylow</h3>
              <p class="new-style-panel-note" id="${BUILDER_NOTE_ID}">Przeciagaj, skaluj, rotuj i edytuj elementy bezposrednio na obszarze roboczym.</p>
            </div>
            <div class="new-style-workspace">
              <div class="new-style-builder-tabs">
                <button type="button" class="new-style-builder-tab is-active" data-builder-tab="${BUILDER_TAB_PRODUCT}">Nowy styl produktow</button>
                <button type="button" class="new-style-builder-tab" data-builder-tab="${BUILDER_TAB_PRICE}">Wlasny styl ceny</button>
              </div>
              <div class="new-style-workspace-tools" data-builder-panel="${BUILDER_TAB_PRODUCT}">
                <button type="button" class="new-style-tool-btn" data-tool="add-product-image">Zdjecie produktu</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-name">Nazwa produktu</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-index">Indeks</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-package">Opak</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-price">Cena</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-badge-rect">Badge prostokat</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-badge-circle">Badge kolo</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-divider">Divider</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-flag">Flaga</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-text">Tekst</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-rect">Prostokat</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-circle">Kolo</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-line">Linia</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-ean">EAN</button>
                <button type="button" class="new-style-tool-btn" data-tool="scale-down">-</button>
                <button type="button" class="new-style-tool-btn" data-tool="scale-up">+</button>
                <button type="button" class="new-style-tool-btn" data-tool="rotate-left">Obrot -</button>
                <button type="button" class="new-style-tool-btn" data-tool="rotate-right">Obrot +</button>
                <button type="button" class="new-style-tool-btn" data-tool="bring-front">Do przodu</button>
                <button type="button" class="new-style-tool-btn" data-tool="send-back">Do tylu</button>
                <button type="button" class="new-style-tool-btn" data-tool="duplicate">Duplikuj</button>
                <button type="button" class="new-style-tool-btn" data-tool="delete">Usun</button>
              </div>
              <div class="new-style-workspace-tools" data-builder-panel="${BUILDER_TAB_PRICE}" hidden>
                <button type="button" class="new-style-tool-btn" data-tool="add-price">Cena</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-badge-rect">Badge prostokat</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-badge-circle">Badge kolo</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-currency">Znak waluty</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-text">Tekst</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-rect">Prostokat</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-circle">Kolo</button>
                <button type="button" class="new-style-tool-btn" data-tool="add-line">Linia</button>
                <button type="button" class="new-style-tool-btn" data-tool="scale-down">-</button>
                <button type="button" class="new-style-tool-btn" data-tool="scale-up">+</button>
                <button type="button" class="new-style-tool-btn" data-tool="rotate-left">Obrot -</button>
                <button type="button" class="new-style-tool-btn" data-tool="rotate-right">Obrot +</button>
                <button type="button" class="new-style-tool-btn" data-tool="bring-front">Do przodu</button>
                <button type="button" class="new-style-tool-btn" data-tool="send-back">Do tylu</button>
                <button type="button" class="new-style-tool-btn" data-tool="duplicate">Duplikuj</button>
                <button type="button" class="new-style-tool-btn" data-tool="delete">Usun</button>
              </div>
              <div class="new-style-text-tools">
                <span class="new-style-text-tools-label">Styl tekstu:</span>
                <select id="${TEXT_FONT_ID}" class="new-style-text-font">
                  ${getFontOptionsHtml()}
                </select>
                <input id="${TEXT_COLOR_ID}" class="new-style-text-color" type="color" value="#e5eefb" aria-label="Kolor tekstu">
                <input id="${TEXT_SIZE_ID}" class="new-style-text-size" type="number" min="6" max="280" step="1" value="12" aria-label="Rozmiar tekstu">
                <span class="new-style-text-tools-label">Linia:</span>
                <input id="${DIVIDER_COLOR_ID}" class="new-style-text-color" type="color" value="#9fb6d7" aria-label="Kolor dividera">
                <button type="button" class="new-style-tool-btn" data-tool="apply-divider-color">Kolor linii</button>
                <select id="${CURRENCY_SELECT_ID}" class="new-style-text-font" aria-label="Waluta">
                  <option value="£">GBP £</option>
                  <option value="zł">PLN zł</option>
                  <option value="€">EUR €</option>
                  <option value="$">USD $</option>
                </select>
                <button type="button" class="new-style-tool-btn" data-tool="add-currency">Znak waluty</button>
                <button type="button" class="new-style-tool-btn" data-tool="edit-text">Edytuj tekst</button>
                <button type="button" class="new-style-tool-btn" data-tool="apply-text-style">Zastosuj styl</button>
              </div>
              <div class="new-style-save-tools" data-builder-panel="${BUILDER_TAB_PRODUCT}">
                <select id="${STYLE_LOAD_SELECT_ID}" class="new-style-save-input">
                  ${getSavedStylesOptionsHtml("")}
                </select>
                <button type="button" class="new-style-tool-btn" data-tool="load-style">Wczytaj styl</button>
                <select id="${PRICE_STYLE_APPLY_SELECT_ID}" class="new-style-save-input">
                  ${getSavedPriceStylesOptionsHtml("")}
                </select>
                <button type="button" class="new-style-tool-btn" data-tool="clear-style">Wyczysc</button>
                <input id="${STYLE_NAME_ID}" class="new-style-save-input" type="text" placeholder="Nazwa nowego stylu">
                <button type="button" class="new-style-tool-btn" data-tool="save-style">Zapisz styl</button>
                <button type="button" class="new-style-tool-btn" data-tool="download-style-json">Pobierz style.json</button>
              </div>
              <div class="new-style-save-tools" data-builder-panel="${BUILDER_TAB_PRICE}" hidden>
                <select id="${PRICE_STYLE_LOAD_SELECT_ID}" class="new-style-save-input">
                  ${getSavedPriceStylesOptionsHtml("")}
                </select>
                <button type="button" class="new-style-tool-btn" data-tool="load-price-style">Wczytaj styl ceny</button>
                <button type="button" class="new-style-tool-btn" data-tool="clear-style">Wyczysc</button>
                <input id="${PRICE_STYLE_NAME_ID}" class="new-style-save-input" type="text" placeholder="Nazwa stylu ceny">
                <button type="button" class="new-style-tool-btn" data-tool="save-price-style">Zapisz styl ceny</button>
                <button type="button" class="new-style-tool-btn" data-tool="download-price-style-json">Pobierz customprice.json</button>
              </div>
              <div class="new-style-canvas">
                <div class="new-style-canvas-inner">
                  <div class="new-style-workspace-stage" id="${WORKSPACE_STAGE_ID}"></div>
                  <div class="new-style-workspace-hint" id="${WORKSPACE_HINT_ID}">
                    Kliknij element aby go zaznaczyc. Drag przesuwa, uchwyty zmieniaja rozmiar i rotacje.
                  </div>
                </div>
              </div>
              <div class="new-style-save-status" id="${STYLE_SAVE_STATUS_ID}"></div>
              <div class="new-style-workspace-selected" id="${WORKSPACE_SELECTED_ID}">Wybrany element: brak</div>
              <div class="new-style-workspace-selected" id="${SELECTED_CANVAS_ID}">Produkt: brak</div>
            </div>
          </section>
        </div>
      </div>
    `;

    modal.addEventListener("mousedown", (event) => {
      if (event.target === modal) closeModal();
    });

    document.body.appendChild(modal);
    document.getElementById(CLOSE_BTN_ID)?.addEventListener("click", closeModal);
    document.getElementById(REFRESH_BTN_ID)?.addEventListener("click", () => {
      openModal({ forceReload: true });
    });
    document.getElementById(PRODUCT_SEARCH_ID)?.addEventListener("input", (event) => {
      state.searchQuery = String(event.target?.value || "");
      renderProductList();
      syncSelectedProductUi();
    });
    document.getElementById(PRODUCT_LIST_ID)?.addEventListener("click", async (event) => {
      const item = event.target?.closest?.("[data-product-id]");
      if (!item) return;
      state.selectedProductId = String(item.getAttribute("data-product-id") || "");
      renderProductList();
      await syncSelectedProductUi(
        String(state.activeBuilderTab || "") === BUILDER_TAB_PRODUCT
          ? { populateStarterWorkspace: true, clearName: true, showStatus: true }
          : { showStatus: false }
      );
    });
    modal.querySelectorAll("[data-builder-tab]").forEach((button) => {
      button.addEventListener("click", async () => {
        await setActiveBuilderTab(button.getAttribute("data-builder-tab"));
      });
    });
    modal.querySelector(".new-style-workspace")?.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-tool]");
      if (!button) return;
      handleWorkspaceTool(button.getAttribute("data-tool"));
    });
    document.getElementById(TEXT_FONT_ID)?.addEventListener("change", () => {
      applyTextStyleToSelected();
    });
    document.getElementById(TEXT_COLOR_ID)?.addEventListener("input", () => {
      applyTextStyleToSelected();
    });
    document.getElementById(DIVIDER_COLOR_ID)?.addEventListener("input", () => {
      applyDividerColorToSelected();
    });
    document.getElementById(TEXT_SIZE_ID)?.addEventListener("change", () => {
      applyTextStyleToSelected();
    });
    document.getElementById(STYLE_NAME_ID)?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleWorkspaceTool("save-style");
    });
    document.getElementById(PRICE_STYLE_NAME_ID)?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleWorkspaceTool("save-price-style");
    });
    document.getElementById(STYLE_LOAD_SELECT_ID)?.addEventListener("change", (event) => {
      const value = String(event?.target?.value || "").trim();
      if (!value) activeLoadedStyleId = "";
    });
    document.getElementById(PRICE_STYLE_LOAD_SELECT_ID)?.addEventListener("change", (event) => {
      const value = String(event?.target?.value || "").trim();
      if (!value) activeLoadedPriceStyleId = "";
    });
    document.addEventListener("keydown", onDocumentKeydown);

    updateBuilderTabUi();

    return modal;
  }

  function onDocumentKeydown(event) {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.style.display !== "flex") return;
    const target = event.target;
    const isTypingTarget = !!(target && (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    ));

    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (isTypingTarget) return;

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelectedNode();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      copySelectedNode();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
      event.preventDefault();
      pasteClipboardNode();
      return;
    }

    if (event.key.toLowerCase() === "e") {
      const textNode = getEditableTextNodeFromSelected();
      if (textNode) {
        event.preventDefault();
        beginTextEdit(textNode);
      }
    }
  }

  function setProductStatus(message, tone = "default") {
    const statusEl = document.getElementById(PRODUCT_STATUS_ID);
    if (!statusEl) return;
    statusEl.textContent = String(message || "");
    statusEl.style.color = tone === "error" ? "#fca5a5" : "#8ea4c2";
  }

  function setSelectedJson(value) {
    const viewer = document.getElementById(PRODUCT_JSON_ID);
    if (viewer) viewer.value = String(value || "");
  }

  async function loadProducts(forceReload = false) {
    if (Array.isArray(state.products) && state.products.length && !forceReload) return state.products;
    if (state.loadingPromise && !forceReload) return state.loadingPromise;

    if (forceReload) state.products = null;

    state.loadingPromise = fetch(PRODUCT_DATA_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        const source = Array.isArray(payload) ? payload : [];
        const products = source
          .map((row, index) => normalizeProduct(row, index))
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name, "pl", { sensitivity: "base" }));
        state.products = products;
        if (!products.some((product) => product.id === state.selectedProductId)) {
          state.selectedProductId = products[0]?.id || "";
        }
        return products;
      })
      .finally(() => {
        state.loadingPromise = null;
      });

    return state.loadingPromise;
  }

  function renderProductList() {
    const listEl = document.getElementById(PRODUCT_LIST_ID);
    if (!listEl) return;

    const all = Array.isArray(state.products) ? state.products : [];
    const filtered = getFilteredProducts();

    if (!all.length) {
      listEl.innerHTML = `<div class="new-style-empty">Brak danych produktowych w bazie.</div>`;
      return;
    }

    if (!filtered.length) {
      listEl.innerHTML = `<div class="new-style-empty">Brak wynikow dla aktualnego wyszukiwania.</div>`;
      return;
    }

    const visible = filtered.slice(0, MAX_VISIBLE_PRODUCTS);
    listEl.innerHTML = visible.map((product) => `
      <div class="new-style-product-item${product.id === state.selectedProductId ? " is-active" : ""}" data-product-id="${escapeHtml(product.id)}">
        <div class="new-style-product-name">${escapeHtml(product.name || "-")}</div>
        <div class="new-style-product-meta">
          <span class="new-style-product-chip">IDX: ${escapeHtml(product.index || "-")}</span>
          <span class="new-style-product-chip">OPAK: ${escapeHtml(formatPackage(product))}</span>
          <span class="new-style-product-chip">EAN: ${escapeHtml(product.ean || "-")}</span>
        </div>
      </div>
    `).join("");

    if (filtered.length > MAX_VISIBLE_PRODUCTS) {
      setProductStatus(`Pokazano ${MAX_VISIBLE_PRODUCTS} z ${filtered.length} produktow. Zawęź wyszukiwanie, aby zobaczyc więcej.`, "default");
    } else {
      setProductStatus(`Wczytano ${all.length} produktow. Aktualnie widocznych: ${filtered.length}.`, "default");
    }
  }

  async function syncSelectedProductUi(options = {}) {
    const product = getSelectedProduct();
    if (!product) {
      const canvasLabel = document.getElementById(SELECTED_CANVAS_ID);
      if (canvasLabel) canvasLabel.textContent = "Brak wybranego produktu";
      setSelectedJson("");
      setSaveStatus("");
      return;
    }

    const canvasLabel = document.getElementById(SELECTED_CANVAS_ID);
    if (canvasLabel) canvasLabel.textContent = `${product.index || "-"} - ${product.name || "-"}`;
    const styleNameInput = document.getElementById(STYLE_NAME_ID);
    if (styleNameInput && options.autoStyleName && !String(styleNameInput.value || "").trim()) {
      styleNameInput.value = `Styl ${product.index || "nowy"}`;
    }
    setSelectedJson(JSON.stringify(product.raw || product, null, 2));
    if (options?.populateStarterWorkspace) {
      await seedWorkspaceWithSelectedProduct(product, {
        clearName: options.clearName !== false,
        showStatus: options.showStatus !== false
      });
      return;
    }
  }

  async function populateProductDatabase(forceReload = false) {
    setProductStatus("Ladowanie danych produktowych...", "default");
    setSelectedJson("");

    try {
      await loadProducts(forceReload);
      renderProductList();
      syncSelectedProductUi();
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      setProductStatus(`Blad ladowania bazy: ${message}`, "error");
      const listEl = document.getElementById(PRODUCT_LIST_ID);
      if (listEl) {
        listEl.innerHTML = `<div class="new-style-empty">Nie udalo sie pobrac bazy produktow.</div>`;
      }
      syncSelectedProductUi();
    }
  }

  async function openModal(options = {}) {
    const modal = ensureModal();
    if (!modal) return;
    modal.style.display = "flex";
    activeLoadedStyleId = "";
    activeLoadedPriceStyleId = "";
    state.activeBuilderTab = BUILDER_TAB_PRODUCT;
    state.productWorkspaceDraft = null;
    state.priceWorkspaceDraft = null;
    await syncCustomStylesFromRemoteStorage();
    await syncCustomPriceStylesFromRemoteStorage();
    refreshSavedStylesSelect();
    refreshSavedPriceStylesSelect();
    const priceStyleNameInput = document.getElementById(PRICE_STYLE_NAME_ID);
    if (priceStyleNameInput) priceStyleNameInput.value = "";
    updateBuilderTabUi();
    ensureWorkspaceEditor();
    centerWorkspaceViewport(true);
    await populateProductDatabase(!!options.forceReload);
    await resetWorkspaceToBlankState({
      clearName: true,
      showStatus: false
    });
    setSaveStatus("Zapis stylu doda go do styl-wlasny i magic-layout.", "default");
    document.getElementById(PRODUCT_SEARCH_ID)?.focus();
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.style.display = "none";
  }

  function bindTrigger() {
    const trigger = document.getElementById(TRIGGER_ID);
    if (!trigger || trigger.dataset.newStyleBound === "1") return;
    trigger.dataset.newStyleBound = "1";
    trigger.addEventListener("click", () => {
      openModal();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindTrigger);
  } else {
    bindTrigger();
  }

  window.NewStyleUI = {
    open: openModal,
    close: closeModal
  };
})();

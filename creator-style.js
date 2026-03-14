(function () {
  const CREATOR_STYLE_EDITOR_ENABLED = false;
  if (!CREATOR_STYLE_EDITOR_ENABLED) return;

  const STORAGE_KEY = "styl_wlasny_custom_styles_v1";
  const REMOTE_STYLES_PATH = "styles/styles.json";
  const REMOTE_STYLES_BUCKET = "gs://pdf-creator-f7a8b.firebasestorage.app";
  const CARD_ID = "customPreviewCard";
  const SELECT_ID = "customModuleLayoutSelect";
  const BTN_ID = "customOpenStyleCreatorBtn";
  const PANEL_ID = "customStyleCreatorPanel";
  const OVERLAY_ID = "customStyleCreatorOverlay";
  const HOST_ID = "customStyleCreatorHost";
  const JSON_ID = "customStyleCreatorJson";
  const NAME_ID = "customStyleCreatorName";
  const ELEMENT_SELECT_ID = "customStyleCreatorElementSelect";
  const PALETTE_ID = "customStyleCreatorPalette";
  const METRICS_ID = "customStyleCreatorMetrics";
  const META_FONT_ID = "customStyleCreatorMetaFont";
  const PRICE_FONT_ID = "customStyleCreatorPriceFont";
  const PRICE_COLOR_ID = "customStyleCreatorPriceColor";
  const PRICE_BG_COLOR_ID = "customStyleCreatorPriceBgColor";
  const INDEX_COLOR_ID = "customStyleCreatorIndexColor";
  const PACKAGE_COLOR_ID = "customStyleCreatorPackageColor";
  const NO_CIRCLE_ID = "customStyleCreatorHidePriceBadge";
  const PRICE_SHAPE_ID = "customStyleCreatorPriceShape";
  const THEME_STYLE_ID = "customStyleCreatorDarkTheme";

  const HANDLE_DEFS = [
    { key: "imgArea", label: "Produkt", previewId: "customPreviewImagesTrack", type: "rect" },
    { key: "nameArea", label: "Nazwa produktu", previewId: "customPreviewName", type: "rect" },
    { key: "indexPos", label: "Indeks", previewId: "customPreviewIndex", type: "point" },
    { key: "packagePos", label: "Opak. / Waga", previewId: "customPreviewPackageInfo", type: "point" },
    { key: "priceTextOffset", label: "Cena", previewId: "customPreviewPriceRow", type: "rect" },
    { key: "priceArea", label: "Badge", previewId: "customPreviewPriceCircle", type: "rect" },
    { key: "divider", label: "Divider", previewId: "customPreviewDivider", type: "rect" },
    { key: "barcodeArea", label: "Kod EAN", previewId: "customPreviewBarcodeWrap", type: "rect" },
    { key: "flagArea", label: "Flaga", previewId: "customPreviewFlag", type: "rect" }
  ];

  const ELEMENT_CARD_DEFS = [
    { key: "imgArea", title: "Produkt", desc: "Zdjęcie lub obszar produktu" },
    { key: "nameArea", title: "Nazwa produktu", desc: "Pole nazwy" },
    { key: "indexPos", title: "Indeks", desc: "Kod indeksu" },
    { key: "packagePos", title: "Opak. / Waga", desc: "Opakowanie albo waga" },
    { key: "priceTextOffset", title: "Cena", desc: "Własny układ tekstu ceny" },
    { key: "priceArea", title: "Badge", desc: "Koło lub prostokąt ceny" },
    { key: "divider", title: "Divider", desc: "Separator pionowy" },
    { key: "barcodeArea", title: "Kod EAN", desc: "Obszar kodu kreskowego" },
    { key: "flagArea", title: "Flaga", desc: "Dodatki produktu" }
  ];

  const state = {
    active: false,
    drag: null,
    draft: null,
    selectedKey: "priceArea",
    selectedAxis: "both",
    priceBaseMetrics: null,
    priceDisplayedMultiplier: 1,
    sourceStyleId: "default",
    remoteReady: false
  };

  let firebaseStorageApi = null;
  let firebaseStoragePromise = null;

  function cloneJson(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }

  function ensureCreatorThemeStyles() {
    if (document.getElementById(THEME_STYLE_ID)) return;
    const styleEl = document.createElement("style");
    styleEl.id = THEME_STYLE_ID;
    styleEl.textContent = `
      #customOpenStyleCreatorBtn.custom-style-creator-launch {
        background: linear-gradient(135deg, rgba(8, 14, 24, 0.98), rgba(15, 33, 54, 0.96)) !important;
        border: 1px solid rgba(103, 232, 249, 0.34) !important;
        color: #effbff !important;
        box-shadow: 0 18px 36px rgba(6, 182, 212, 0.18) !important;
        transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease !important;
      }

      #customOpenStyleCreatorBtn.custom-style-creator-launch:hover {
        transform: translateY(-1px);
        border-color: rgba(94, 234, 212, 0.54) !important;
        box-shadow: 0 24px 42px rgba(6, 182, 212, 0.24) !important;
      }

      #customStyleCreatorPanel.custom-style-creator-panel {
        position: relative;
        overflow: hidden;
        margin-top: 12px !important;
        padding: 14px !important;
        border-radius: 18px !important;
        border: 1px solid rgba(96, 165, 250, 0.18) !important;
        background:
          radial-gradient(120% 120% at 0% 0%, rgba(34, 211, 238, 0.16), transparent 34%),
          radial-gradient(100% 120% at 100% 0%, rgba(16, 185, 129, 0.14), transparent 32%),
          linear-gradient(180deg, rgba(8, 13, 24, 0.98), rgba(11, 18, 32, 0.98)) !important;
        box-shadow: 0 28px 60px rgba(2, 6, 23, 0.32) !important;
        color: #dbe7f6 !important;
      }

      #${HOST_ID}.custom-style-creator-host {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid rgba(148, 163, 184, 0.16);
      }

      #${HOST_ID}.custom-style-creator-host > #customStyleCreatorPanel.custom-style-creator-panel {
        margin-top: 0 !important;
        max-height: min(54vh, 860px);
        overflow: auto;
      }

      #customStyleCreatorPanel.custom-style-creator-panel::before {
        content: "";
        position: absolute;
        inset: auto auto -80px -60px;
        width: 220px;
        height: 220px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(34, 211, 238, 0.18), transparent 68%);
        pointer-events: none;
      }

      #customStyleCreatorPanel.custom-style-creator-panel > * {
        position: relative;
        z-index: 1;
      }

      #customStyleCreatorPanel .custom-style-creator-title {
        color: #f8fbff !important;
        letter-spacing: 0.02em;
      }

      #customStyleCreatorPanel .custom-style-creator-note {
        color: #8ea4c2 !important;
      }

      #customStyleCreatorPanel label.custom-style-creator-chip {
        background: rgba(8, 13, 24, 0.72) !important;
        border: 1px solid rgba(148, 163, 184, 0.16) !important;
        color: #dbe7f6 !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
      }

      #customStyleCreatorPanel .custom-style-creator-field {
        background: rgba(5, 10, 19, 0.92) !important;
        border: 1px solid rgba(96, 165, 250, 0.18) !important;
        color: #f8fbff !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
      }

      #customStyleCreatorPanel .custom-style-creator-field::placeholder {
        color: #8095b2;
      }

      #customStyleCreatorPanel .custom-style-creator-field:focus {
        outline: none;
        border-color: rgba(34, 211, 238, 0.68) !important;
        box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12) !important;
      }

      #customStyleCreatorPanel textarea.custom-style-creator-field {
        background: rgba(4, 8, 16, 0.94) !important;
      }

      #customStyleCreatorPanel .custom-style-creator-btn {
        background: rgba(8, 14, 24, 0.82) !important;
        border: 1px solid rgba(148, 163, 184, 0.2) !important;
        color: #e5eefb !important;
        box-shadow: 0 12px 24px rgba(2, 6, 23, 0.16) !important;
        transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease !important;
      }

      #customStyleCreatorPanel .custom-style-creator-btn:hover {
        transform: translateY(-1px);
        border-color: rgba(103, 232, 249, 0.44) !important;
        box-shadow: 0 18px 30px rgba(2, 6, 23, 0.24) !important;
      }

      #customStyleCreatorPanel .custom-style-creator-btn--primary {
        background: linear-gradient(135deg, #22d3ee 0%, #34d399 100%) !important;
        border-color: transparent !important;
        color: #05202a !important;
        box-shadow: 0 16px 30px rgba(16, 185, 129, 0.28) !important;
      }

      #customStyleCreatorPanel .custom-style-creator-btn--ghost {
        background: rgba(15, 23, 42, 0.58) !important;
      }

      #customStyleCreatorPanel .custom-style-creator-btn--danger {
        border-color: rgba(248, 113, 113, 0.32) !important;
        background: rgba(69, 10, 10, 0.5) !important;
        color: #fecaca !important;
      }

      #customStyleCreatorPanel .custom-style-creator-layout {
        display: grid;
        grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
        gap: 12px;
        align-items: start;
      }

      #customStyleCreatorPanel .custom-style-creator-sidebar,
      #customStyleCreatorPanel .custom-style-creator-main {
        display: grid;
        gap: 12px;
      }

      #customStyleCreatorPanel .custom-style-creator-block {
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 16px;
        background: rgba(7, 12, 22, 0.54);
        padding: 12px;
      }

      #customStyleCreatorPanel .custom-style-creator-block-title {
        font-size: 11px;
        font-weight: 800;
        color: #f8fbff;
        margin-bottom: 8px;
      }

      #customStyleCreatorPanel .custom-style-creator-block-note {
        font-size: 10px;
        line-height: 1.45;
        color: #8ea4c2;
      }

      #customStyleCreatorPanel .custom-style-creator-palette {
        display: grid;
        gap: 8px;
      }

      #customStyleCreatorPanel .custom-style-creator-element-card {
        display: grid;
        gap: 3px;
        text-align: left;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(10, 16, 29, 0.8);
        color: #dbe7f6;
        cursor: pointer;
        transition: border-color 0.16s ease, transform 0.16s ease, background 0.16s ease;
      }

      #customStyleCreatorPanel .custom-style-creator-element-card:hover {
        transform: translateY(-1px);
        border-color: rgba(34, 211, 238, 0.4);
        background: rgba(14, 21, 37, 0.92);
      }

      #customStyleCreatorPanel .custom-style-creator-element-card.is-active,
      #customStyleCreatorPanel .custom-style-creator-element-card[aria-pressed="true"] {
        border-color: rgba(245, 158, 11, 0.62);
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(15, 23, 42, 0.92));
        box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.18);
      }

      #customStyleCreatorPanel .custom-style-creator-element-card__title {
        font-size: 11px;
        font-weight: 800;
        color: #f8fbff;
      }

      #customStyleCreatorPanel .custom-style-creator-element-card__desc {
        font-size: 10px;
        color: #8ea4c2;
        line-height: 1.35;
      }

      #customStyleCreatorPanel .custom-style-creator-section-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      #customStyleCreatorPanel .custom-style-creator-section-grid--wide {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      #customStyleCreatorPanel .custom-style-creator-metrics {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
      }

      #customStyleCreatorPanel .custom-style-creator-metric-card {
        display: grid;
        gap: 2px;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(10, 16, 29, 0.76);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }

      #customStyleCreatorPanel .custom-style-creator-metric-card span {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8ea4c2;
      }

      #customStyleCreatorPanel .custom-style-creator-metric-card strong {
        font-size: 11px;
        color: #f8fbff;
      }

      #customStyleCreatorPanel input[type="checkbox"].custom-style-creator-check {
        appearance: auto !important;
        accent-color: #22d3ee;
        inline-size: 16px;
        block-size: 16px;
      }

      #customStyleCreatorPanel input[type="color"].custom-style-creator-color {
        width: 28px !important;
        height: 24px !important;
        border-radius: 8px;
        overflow: hidden;
      }

      #customStyleCreatorOverlay.custom-style-creator-overlay {
        border-radius: 14px;
        overflow: hidden;
      }

      #customStyleCreatorOverlay .custom-style-creator-handle {
        box-shadow: 0 0 0 1px rgba(8, 13, 23, 0.24), inset 0 0 0 1px rgba(255, 255, 255, 0.02);
      }

      #customStyleCreatorOverlay .custom-style-creator-handle-label {
        background: rgba(7, 12, 22, 0.88) !important;
        border: 1px solid rgba(34, 211, 238, 0.18);
        color: #eff8ff !important;
        box-shadow: 0 10px 24px rgba(2, 6, 23, 0.28);
      }

      @media (max-width: 980px) {
        #customStyleCreatorPanel .custom-style-creator-layout {
          grid-template-columns: 1fr;
        }

        #customStyleCreatorPanel .custom-style-creator-metrics,
        #customStyleCreatorPanel .custom-style-creator-section-grid--wide {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        #customStyleCreatorPanel.custom-style-creator-panel {
          padding: 12px !important;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  function decorateCreatorUi() {
    ensureCreatorThemeStyles();
    const openBtn = document.getElementById(BTN_ID);
    if (openBtn) openBtn.classList.add("custom-style-creator-launch");
    const panel = getPanel();
    if (panel) {
      panel.classList.add("custom-style-creator-panel");
      panel.querySelectorAll("button:not(.custom-style-creator-element-card)").forEach((el) => el.classList.add("custom-style-creator-btn"));
      panel.querySelectorAll("label").forEach((el) => el.classList.add("custom-style-creator-chip"));
      panel.querySelectorAll("select, input[type='text'], textarea").forEach((el) => el.classList.add("custom-style-creator-field"));
      panel.querySelectorAll("input[type='checkbox']").forEach((el) => el.classList.add("custom-style-creator-check"));
      panel.querySelectorAll("input[type='color']").forEach((el) => el.classList.add("custom-style-creator-color"));
      panel.querySelector("#customStyleCreatorSaveBtn")?.classList.add("custom-style-creator-btn--primary");
      panel.querySelector("#customStyleCreatorCaptureBtn")?.classList.add("custom-style-creator-btn--ghost");
      panel.querySelector("#customStyleCreatorToggleBtn")?.classList.add("custom-style-creator-btn--danger");
    }
    const overlay = getOverlay();
    if (overlay) overlay.classList.add("custom-style-creator-overlay");
  }

  function ensureCreatorHost() {
    const editorPanel = getEditorPanel();
    if (!editorPanel) return null;
    let host = getCreatorHost();
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.className = "custom-style-creator-host";
      editorPanel.appendChild(host);
    }
    return host;
  }

  function getPreviewCard() {
    return document.getElementById(CARD_ID);
  }

  function getSelect() {
    return document.getElementById(SELECT_ID);
  }

  function getMetaFontSelect() {
    return document.getElementById("customMetaFontSelect");
  }

  function getPriceFontSelect() {
    return document.getElementById("customPriceFontSelect");
  }

  function getEditorPanel() {
    return document.querySelector("#customStyleModal .custom-style-panel--editor");
  }

  function getCreatorHost() {
    return document.getElementById(HOST_ID);
  }

  function getRegisteredStyles() {
    return Array.isArray(window.STYL_WLASNY_REGISTRY?.moduleLayouts)
      ? window.STYL_WLASNY_REGISTRY.moduleLayouts
      : [];
  }

  function getCurrentStyleId() {
    return String(getSelect()?.value || "default");
  }

  function getCurrentStyleMeta() {
    const currentId = getCurrentStyleId();
    return getRegisteredStyles().find((item) => String(item?.id || "") === currentId) || {
      id: "default",
      label: "Domyślny (styl elegancki)",
      config: {}
    };
  }

  function loadSavedStyles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function saveSavedStyles(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (_err) {}
  }

  async function ensureFirebaseStorageApi() {
    if (firebaseStorageApi) return firebaseStorageApi;
    if (!firebaseStoragePromise) {
      firebaseStoragePromise = (async () => {
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
        const storage = window.firebaseStorage || (typeof getStorageFn === "function"
          ? getStorageFn(undefined, REMOTE_STYLES_BUCKET)
          : null);
        if (!storage) {
          throw new Error("Brak połączenia z Firebase Storage.");
        }
        firebaseStorageApi = {
          storage,
          ref: refFn,
          getDownloadURL: getDownloadURLFn,
          uploadBytes: uploadBytesFn
        };
        return firebaseStorageApi;
      })();
    }
    try {
      return await firebaseStoragePromise;
    } catch (err) {
      firebaseStoragePromise = null;
      throw err;
    }
  }

  function normalizeSavedStylesList(list) {
    return (Array.isArray(list) ? list : []).filter((item) => {
      const id = String(item?.id || "").trim();
      const label = String(item?.label || "").trim();
      return !!id && !!label && item?.config && typeof item.config === "object";
    });
  }

  function mergeSavedStylesLists(primary, secondary) {
    const merged = [];
    const byId = new Map();
    [...normalizeSavedStylesList(secondary), ...normalizeSavedStylesList(primary)].forEach((item) => {
      const id = String(item.id || "").trim();
      if (!id) return;
      const copy = cloneJson(item);
      if (byId.has(id)) {
        merged[byId.get(id)] = copy;
        return;
      }
      byId.set(id, merged.length);
      merged.push(copy);
    });
    return merged;
  }

  async function loadSavedStylesFromRemote() {
    const api = await ensureFirebaseStorageApi();
    const fileRef = api.ref(api.storage, REMOTE_STYLES_PATH);
    const url = await api.getDownloadURL(fileRef);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return normalizeSavedStylesList(await response.json());
  }

  async function saveSavedStylesToRemote(list) {
    const api = await ensureFirebaseStorageApi();
    const fileRef = api.ref(api.storage, REMOTE_STYLES_PATH);
    const payload = JSON.stringify(normalizeSavedStylesList(list), null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    await api.uploadBytes(fileRef, blob, {
      contentType: "application/json",
      cacheControl: "no-store",
      customMetadata: {
        savedAt: String(Date.now()),
        source: "creator-style"
      }
    });
  }

  function registerStyle(styleDef) {
    if (typeof window.registerStylWlasnyModuleLayoutStyle === "function") {
      window.registerStylWlasnyModuleLayoutStyle(styleDef);
    }
  }

  function registerSavedStylesFromStorage() {
    loadSavedStyles().forEach((styleDef) => registerStyle(styleDef));
    if (typeof window.refreshStylWlasnyModuleLayoutOptions === "function") {
      window.refreshStylWlasnyModuleLayoutOptions();
    }
  }

  async function syncSavedStylesFromRemote() {
    try {
      const remote = await loadSavedStylesFromRemote();
      const merged = mergeSavedStylesLists(remote, loadSavedStyles());
      saveSavedStyles(merged);
      merged.forEach((styleDef) => registerStyle(styleDef));
      window.refreshStylWlasnyModuleLayoutOptions?.();
      state.remoteReady = true;
      return merged;
    } catch (err) {
      console.warn("Nie udało się wczytać styles/styles.json z Firebase Storage:", err);
      return loadSavedStyles();
    }
  }

  function getRelativeBox(card, node) {
    if (!card || !node) return null;
    const cardRect = card.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    if (!cardRect.width || !cardRect.height || !rect.width || !rect.height) return null;
    return {
      x: Number((((rect.left - cardRect.left) / cardRect.width) * 100).toFixed(2)),
      y: Number((((rect.top - cardRect.top) / cardRect.height) * 100).toFixed(2)),
      w: Number(((rect.width / cardRect.width) * 100).toFixed(2)),
      h: Number(((rect.height / cardRect.height) * 100).toFixed(2))
    };
  }

  function getRelativePoint(card, node) {
    const box = getRelativeBox(card, node);
    if (!box) return null;
    return { x: box.x, y: box.y };
  }

  function readComputedColor(node, fallback) {
    if (!node) return fallback;
    const value = window.getComputedStyle(node).color;
    return value && value !== "rgba(0, 0, 0, 0)" ? value : fallback;
  }

  function readComputedBackground(node, fallback) {
    if (!node) return fallback;
    const value = window.getComputedStyle(node).backgroundColor;
    return value && value !== "rgba(0, 0, 0, 0)" ? value : fallback;
  }

  function readComputedFontFamily(node, fallback) {
    if (!node) return fallback;
    const value = window.getComputedStyle(node).fontFamily;
    return String(value || "").trim() || fallback;
  }

  function readNodeScaleX(node) {
    if (!node) return 1;
    const raw = String(window.getComputedStyle(node).transform || "").trim();
    if (!raw || raw === "none") return 1;
    try {
      if (typeof window.DOMMatrixReadOnly === "function") {
        const matrix = new window.DOMMatrixReadOnly(raw);
        const scale = Math.sqrt((matrix.a * matrix.a) + (matrix.b * matrix.b));
        if (Number.isFinite(scale) && scale > 0) return scale;
      }
    } catch (_err) {}
    const matrix2d = raw.match(/^matrix\((.+)\)$/);
    if (matrix2d) {
      const parts = matrix2d[1].split(",").map((part) => Number(part.trim()));
      const scale = Math.sqrt(((parts[0] || 0) * (parts[0] || 0)) + ((parts[1] || 0) * (parts[1] || 0)));
      return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }
    const matrix3d = raw.match(/^matrix3d\((.+)\)$/);
    if (matrix3d) {
      const parts = matrix3d[1].split(",").map((part) => Number(part.trim()));
      const scale = Math.sqrt(((parts[0] || 0) * (parts[0] || 0)) + ((parts[1] || 0) * (parts[1] || 0)) + ((parts[2] || 0) * (parts[2] || 0)));
      return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }
    return 1;
  }

  function normalizeScaleMultiplier(value, fallback = 1) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return clamp(parsed, 0.35, 4);
  }

  function getPriceShapeProfile(text = {}) {
    const hidePriceBadge = !!text.hidePriceBadge;
    const noCircle = !hidePriceBadge && !!text.noPriceCircle;
    const isRoundedRect = !hidePriceBadge && !noCircle && String(text.priceShape || "circle") === "roundedRect";
    return {
      hidePriceBadge,
      noCircle,
      isRoundedRect
    };
  }

  function getPriceShapeFactors(shapeProfile, text = {}) {
    const customMain = Number(text?.priceMainFactor);
    const customDec = Number(text?.priceDecFactor);
    const customUnit = Number(text?.priceUnitFactor);
    if (customMain > 0 && customDec >= 0 && customUnit > 0) {
      return {
        main: Math.max(0.05, Math.min(2.5, customMain)),
        dec: Math.max(0, Math.min(2.5, customDec)),
        unit: Math.max(0.05, Math.min(2.5, customUnit))
      };
    }
    if (shapeProfile?.hidePriceBadge || shapeProfile?.noCircle) {
      return { main: 0.56, dec: 0.22, unit: 0.22 };
    }
    if (shapeProfile?.isRoundedRect) {
      return { main: 0.80, dec: 0.26, unit: 0.26 };
    }
    return { main: 0.475, dec: 0.14, unit: 0.095 };
  }

  function deriveBadgeBaseFromShape(shapeProfile, badgeWidth, badgeHeight) {
    const width = Math.max(1, Number(badgeWidth) || 0);
    const height = Math.max(1, Number(badgeHeight) || 0);
    if (shapeProfile?.isRoundedRect) return height;
    if (shapeProfile?.noCircle) {
      return Math.max(width / 3.2, height / 0.75, height);
    }
    return Math.max(1, Math.min(width, height));
  }

  function getRoundedRectPriceFitRatio(priceCircle, priceRow) {
    if (!priceCircle || !priceRow) return 1;
    const badgeRect = priceCircle.getBoundingClientRect();
    const textRects = ["customPreviewPriceMain", "customPreviewPriceDec", "customPreviewPriceUnit"]
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect && rect.width && rect.height);
    const rowRect = priceRow.getBoundingClientRect();
    const contentRect = textRects.length
      ? {
          left: Math.min(...textRects.map((rect) => rect.left)),
          top: Math.min(...textRects.map((rect) => rect.top)),
          right: Math.max(...textRects.map((rect) => rect.right)),
          bottom: Math.max(...textRects.map((rect) => rect.bottom))
        }
      : rowRect;
    const contentWidth = Math.max(0, Number(contentRect.right || 0) - Number(contentRect.left || 0));
    const contentHeight = Math.max(0, Number(contentRect.bottom || 0) - Number(contentRect.top || 0));
    if (!badgeRect.width || !badgeRect.height || !contentWidth || !contentHeight) return 1;
    const innerWidth = Math.max(24, badgeRect.width - 16);
    const innerHeight = Math.max(18, badgeRect.height - 8);
    const fit = Math.min(innerWidth / contentWidth, innerHeight / contentHeight, 1);
    return Number.isFinite(fit) && fit > 0 ? fit : 1;
  }

  function measureDisplayedPriceScaleMultiplier() {
    const text = state.draft?.config?.text || {};
    return normalizeScaleMultiplier(
      state.priceDisplayedMultiplier,
      normalizeScaleMultiplier(text.priceScaleMultiplier, 1)
    );
  }

  function buildFontOptionsMarkup(sourceSelect) {
    if (!sourceSelect) return `<option value="Arial">Arial</option>`;
    const options = Array.from(sourceSelect.options || []);
    const seen = new Set();
    return options.map((opt) => {
      const value = String(opt?.value || opt?.textContent || "").trim();
      if (!value || seen.has(value)) return "";
      seen.add(value);
      return `<option value="${value.replace(/"/g, "&quot;")}">${String(opt?.textContent || value).trim()}</option>`;
    }).join("") || `<option value="Arial">Arial</option>`;
  }

  function normalizePriceTextAlign(value, fallback = "left") {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "center" || raw === "flex-center") return "center";
    if (raw === "right" || raw === "end" || raw === "flex-end") return "right";
    if (raw === "left" || raw === "start" || raw === "flex-start") return "left";
    return fallback;
  }

  function getCaptureBaseConfig() {
    if (state.draft?.config && typeof state.draft.config === "object") {
      return cloneJson(state.draft.config);
    }
    return cloneJson(getCurrentStyleMeta().config || {});
  }

  function ensureEditorBoxes(single) {
    if (!single || typeof single !== "object") return {};
    if (!single._editorBoxes || typeof single._editorBoxes !== "object") {
      single._editorBoxes = {};
    }
    return single._editorBoxes;
  }

  function syncDraftEditorBoxesFromLivePreview(single = state.draft?.config?.singleDirect, text = state.draft?.config?.text || {}, options = {}) {
    const card = getPreviewCard();
    if (!card || !single) return;
    const editorBoxes = ensureEditorBoxes(single);
    const livePriceRowBox = getRelativeBox(card, document.getElementById("customPreviewPriceRow"));
    const livePriceAreaBox = getRelativeBox(card, document.getElementById("customPreviewPriceCircle"));
    const liveImageAreaBox = getVisiblePreviewImageBox();
    const noPriceBackground = !!text.hidePriceBadge || !!text.noPriceCircle || String(text.priceShape || "") === "none";
    const syncPriceTextOffset = options?.syncPriceTextOffset !== false;
    const syncPriceArea = options?.syncPriceArea !== false;
    HANDLE_DEFS.forEach((def) => {
      let box = null;
      if (def.key === "imgArea") {
        box = liveImageAreaBox || single.imgArea || null;
      } else if (def.key === "priceArea") {
        if (!syncPriceArea) {
          box = editorBoxes.priceArea || normalizePriceAreaBox(single.priceArea, text);
        } else if (noPriceBackground) {
          box = expandOverlayBox(livePriceRowBox || editorBoxes.priceTextOffset || editorBoxes.priceArea || single.priceArea, 0.8, 0.7);
        } else {
          box = livePriceAreaBox || single.priceArea || null;
        }
      } else if (def.key === "priceTextOffset") {
        box = syncPriceTextOffset
          ? (livePriceRowBox || editorBoxes.priceTextOffset || { x: single.priceArea?.x, y: single.priceArea?.y, w: 18, h: 8 })
          : (editorBoxes.priceTextOffset || getPriceTextEditorBox(single, text));
      } else if (def.key === "nameArea" || def.key === "flagArea" || def.key === "barcodeArea" || def.key === "divider") {
        box = getRelativeBox(card, document.getElementById(def.previewId)) || single[def.key] || null;
      } else {
        box = getRelativeBox(card, document.getElementById(def.previewId));
        if (!box) {
          const point = single[def.key];
          box = point ? { x: point.x, y: point.y, w: 8, h: 6 } : null;
        }
      }
      if (box) editorBoxes[def.key] = cloneJson(box);
    });
  }

  function captureLivePriceTextEditorBox(single = state.draft?.config?.singleDirect) {
    const card = getPreviewCard();
    if (!card || !single) return null;
    const rowBox = getRelativeBox(card, document.getElementById("customPreviewPriceRow"));
    if (!rowBox) return null;
    const editorBoxes = ensureEditorBoxes(single);
    editorBoxes.priceTextOffset = {
      x: Number(rowBox.x || 0),
      y: Number(rowBox.y || 0),
      w: Math.max(4, Number(rowBox.w || 18) || 18),
      h: Math.max(2, Number(rowBox.h || 8) || 8)
    };
    return cloneJson(editorBoxes.priceTextOffset);
  }

  function captureLivePriceAreaEditorBox(single = state.draft?.config?.singleDirect, text = state.draft?.config?.text || {}) {
    const card = getPreviewCard();
    if (!card || !single) return null;
    const editorBoxes = ensureEditorBoxes(single);
    const noPriceBackground = !!text.hidePriceBadge || !!text.noPriceCircle || String(text.priceShape || "") === "none";
    const livePriceAreaBox = getRelativeBox(card, document.getElementById("customPreviewPriceCircle"));
    const priceTextBox = editorBoxes.priceTextOffset || captureLivePriceTextEditorBox(single);
    const nextBox = noPriceBackground
      ? expandOverlayBox(priceTextBox || editorBoxes.priceArea || normalizePriceAreaBox(single.priceArea, text), 0.8, 0.7)
      : (livePriceAreaBox || normalizePriceAreaBox(single.priceArea, text));
    if (!nextBox) return null;
    editorBoxes.priceArea = cloneJson(nextBox);
    return cloneJson(editorBoxes.priceArea);
  }

  function captureBasePriceMetrics() {
    const mainEl = document.getElementById("customPreviewPriceMain");
    const decEl = document.getElementById("customPreviewPriceDec");
    const unitEl = document.getElementById("customPreviewPriceUnit");
    const priceCircle = document.getElementById("customPreviewPriceCircle");
    const priceRow = document.getElementById("customPreviewPriceRow");
    if (!mainEl || !decEl || !unitEl || !priceCircle) return;
    const badgeRect = priceCircle.getBoundingClientRect();
    const text = state.draft?.config?.text || {};
    const shapeProfile = getPriceShapeProfile(text);
    const factors = getPriceShapeFactors(shapeProfile, text);
    const styleMultiplier = normalizeScaleMultiplier(text.priceScaleMultiplier, 1);
    const rowScale = readNodeScaleX(priceRow);
    const badgeBase = deriveBadgeBaseFromShape(shapeProfile, badgeRect.width, badgeRect.height);
    const mainSize = (parseFloat(window.getComputedStyle(mainEl).fontSize || "32") || 32) * rowScale;
    const decSize = (parseFloat(window.getComputedStyle(decEl).fontSize || "12") || 12) * rowScale;
    const unitSize = (parseFloat(window.getComputedStyle(unitEl).fontSize || "9") || 9) * rowScale;
    const samples = [];
    if (badgeBase > 0 && factors.main > 0 && mainSize > 0) samples.push(mainSize / (badgeBase * factors.main * styleMultiplier));
    if (badgeBase > 0 && factors.dec > 0 && decSize > 0) samples.push(decSize / (badgeBase * factors.dec * styleMultiplier));
    if (badgeBase > 0 && factors.unit > 0 && unitSize > 0) samples.push(unitSize / (badgeBase * factors.unit * styleMultiplier));
    const valid = samples.filter((value) => Number.isFinite(value) && value > 0);
    const editorScale = valid.length ? (valid.reduce((sum, value) => sum + value, 0) / valid.length) : 1;
    state.priceBaseMetrics = {
      main: mainSize,
      dec: decSize,
      unit: unitSize,
      badgeWidth: badgeRect.width,
      badgeHeight: badgeRect.height,
      editorScale: Number.isFinite(editorScale) && editorScale > 0 ? editorScale : 1
    };
  }

  function reloadDraftFromCurrentPreview() {
    state.draft = captureDraftFromPreview();
    captureBasePriceMetrics();
    state.sourceStyleId = getCurrentStyleId();
    syncControlValues();
    applyDraftToPreview();
    renderOverlayHandles();
    scheduleCreatorOverlayStabilization();
  }

  function captureDraftFromPreview() {
    const card = getPreviewCard();
    if (!card) return null;
    const base = getCaptureBaseConfig();
    const single = cloneJson(base.singleDirect || {});
    const family = cloneJson(base.familyDirect || { useSingleLayout: true, imageLayouts: {} });
    const text = cloneJson(base.text || {});
    const nameEl = document.getElementById("customPreviewName");
    const priceCircleEl = document.getElementById("customPreviewPriceCircle");
    const priceMainEl = document.getElementById("customPreviewPriceMain");

    const readRect = (id, fallback) => getRelativeBox(card, document.getElementById(id)) || cloneJson(fallback || {});
    const readPoint = (id, fallback) => getRelativePoint(card, document.getElementById(id)) || cloneJson(fallback || {});

    single.imgArea = readRect("customPreviewImagesTrack", single.imgArea || { x: 2.8, y: 16.5, w: 82, h: 37 });
    single.nameArea = readRect("customPreviewName", single.nameArea || { x: 35, y: 56, w: 38, h: 20 });
    single.indexPos = readPoint("customPreviewIndex", single.indexPos || { x: 35, y: 67.8 });
    single.packagePos = readPoint("customPreviewPackageInfo", single.packagePos || { x: 35, y: 72.0 });
    const priceRect = readRect("customPreviewPriceCircle", single.priceArea || { x: 3.5, y: 57, w: 16, h: 16 });
    const priceRowEl = document.getElementById("customPreviewPriceRow");
    const circleRect = priceCircleEl ? priceCircleEl.getBoundingClientRect() : null;
    const rowRect = priceRowEl ? priceRowEl.getBoundingClientRect() : null;
    single.priceArea = {
      ...(single.priceArea || {}),
      x: priceRect.x,
      y: priceRect.y,
      s: Number((priceRect.w || single.priceArea?.s || 16).toFixed(2)),
      w: Number((priceRect.w || 0).toFixed(2)),
      h: Number((priceRect.h || 0).toFixed(2)),
      r: Number((single.priceArea?.r || 0).toFixed(2))
    };
    single.priceTextOffset = {
      x: Number((((rowRect?.left || circleRect?.left || 0) - (circleRect?.left || 0)) / Math.max(1, circleRect?.width || 1)).toFixed(4)),
      y: Number((((rowRect?.top || circleRect?.top || 0) - (circleRect?.top || 0)) / Math.max(1, circleRect?.height || 1)).toFixed(4))
    };

    const dividerEl = document.getElementById("customPreviewDivider");
    if (dividerEl && dividerEl.style.display !== "none") {
      single.divider = readRect("customPreviewDivider", single.divider || { x: 63.6, y: 15.5, h: 58.5, w: 0.55 });
    } else {
      single.divider = { x: -1, y: 0, h: 0, w: 0 };
    }

    const flagEl = document.getElementById("customPreviewFlag");
    if (flagEl && flagEl.style.display !== "none") {
      single.flagArea = readRect("customPreviewFlag", single.flagArea || { x: 35, y: 78.8, w: 18, h: 2.6 });
    } else {
      single.flagArea = { x: 0, y: 0, w: 0, h: 0 };
    }

    const barcodeEl = document.getElementById("customPreviewBarcodeWrap");
    if (barcodeEl && barcodeEl.style.display !== "none") {
      single.barcodeArea = readRect("customPreviewBarcodeWrap", single.barcodeArea || { x: 53, y: 79.2, w: 38, h: 11 });
    } else {
      single.barcodeArea = { x: 0, y: 0, w: 0, h: 0 };
    }

    text.priceColor = readComputedColor(priceMainEl, text.priceColor || "#ffffff");
    text.priceBgColor = readComputedBackground(priceCircleEl, text.priceBgColor || "#d71920");
    text.indexColor = readComputedColor(document.getElementById("customPreviewIndex"), text.indexColor || "#b9b9b9");
    text.packageColor = readComputedColor(document.getElementById("customPreviewPackageInfo"), text.packageColor || "#334155");
    text.metaFontFamily = String(getMetaFontSelect()?.value || readComputedFontFamily(nameEl, text.metaFontFamily || "Arial"));
    text.priceFontFamily = String(getPriceFontSelect()?.value || readComputedFontFamily(priceMainEl, text.priceFontFamily || "Arial"));
    text.hidePriceBadge = !!text.hidePriceBadge;
    text.priceScaleMultiplier = normalizeScaleMultiplier(readNodeScaleX(priceRowEl), normalizeScaleMultiplier(text.priceScaleMultiplier, 1));
    text.priceTextAlign = normalizePriceTextAlign(window.getComputedStyle(priceRowEl || priceMainEl || document.body).justifyContent || text.priceTextAlign || "left", "left");
    text.priceTextOffsetMode = "absolute";
    if (!text.priceShape) {
      text.priceShape = text.noPriceCircle ? "none" : "circle";
    }

    syncDraftEditorBoxesFromLivePreview(single, text);

    return {
      id: "",
      label: "",
      config: {
        singleDirect: single,
        familyDirect: family,
        text
      }
    };
  }

  function setRectStyle(el, box) {
    if (!el || !box) return;
    if (Number.isFinite(box.x)) el.style.left = `${box.x}%`;
    if (Number.isFinite(box.y)) el.style.top = `${box.y}%`;
    if (Number.isFinite(box.w) && box.w > 0) el.style.width = `${box.w}%`;
    if (Number.isFinite(box.h) && box.h > 0) el.style.height = `${box.h}%`;
  }

  function setPointStyle(el, point) {
    if (!el || !point) return;
    if (Number.isFinite(point.x)) el.style.left = `${point.x}%`;
    if (Number.isFinite(point.y)) el.style.top = `${point.y}%`;
  }

  function applyDraftToPreview() {
    const draft = state.draft;
    if (!draft?.config?.singleDirect) return;
    const single = draft.config.singleDirect;
    const text = draft.config.text || {};
    const editorBoxes = ensureEditorBoxes(single);
    const shapeProfile = getPriceShapeProfile(text);
    if (!state.priceBaseMetrics) captureBasePriceMetrics();
    setRectStyle(document.getElementById("customPreviewImagesTrack"), single.imgArea);
    const nameEl = document.getElementById("customPreviewName");
    const indexEl = document.getElementById("customPreviewIndex");
    const packageEl = document.getElementById("customPreviewPackageInfo");
    setRectStyle(nameEl, single.nameArea);
    setPointStyle(indexEl, single.indexPos);
    setPointStyle(packageEl, single.packagePos);
    if (nameEl) nameEl.style.fontFamily = String(text.metaFontFamily || "Arial");
    if (indexEl) {
      indexEl.style.fontFamily = String(text.metaFontFamily || "Arial");
      indexEl.style.color = String(text.indexColor || "#b9b9b9");
    }
    if (packageEl) {
      packageEl.style.fontFamily = String(text.metaFontFamily || "Arial");
      packageEl.style.color = String(text.packageColor || "#334155");
    }
    const priceCircle = document.getElementById("customPreviewPriceCircle");
    setRectStyle(priceCircle, shapeProfile.isRoundedRect
      ? {
          x: single.priceArea?.x,
          y: single.priceArea?.y,
          w: single.priceArea?.w || single.priceArea?.s,
          h: single.priceArea?.h || single.priceArea?.s
        }
      : {
          x: single.priceArea?.x,
          y: single.priceArea?.y,
          w: single.priceArea?.s || single.priceArea?.w,
          h: getCirclePreviewHeightPct(single.priceArea?.s || single.priceArea?.w || 0)
        });
    if (priceCircle) {
      const hidePriceBadge = shapeProfile.hidePriceBadge;
      const noCircle = shapeProfile.noCircle;
      const isRoundedRect = shapeProfile.isRoundedRect;
      priceCircle.style.backgroundImage = "none";
      priceCircle.style.background = noCircle ? "transparent" : String(text.priceBgColor || "#d71920");
      priceCircle.style.borderRadius = noCircle ? "0" : (isRoundedRect ? "14px" : "50%");
      priceCircle.style.display = "flex";
      priceCircle.style.opacity = "1";
      priceCircle.style.pointerEvents = "auto";
      priceCircle.style.boxShadow = "none";
      priceCircle.style.outline = hidePriceBadge ? "none" : "";
      const row = document.getElementById("customPreviewPriceRow");
      if (row) {
        detachPriceTextFromBadge();
        const rowBox = getPriceTextEditorBox(single, text);
        editorBoxes.priceTextOffset = {
          x: Number(rowBox.x || 0),
          y: Number(rowBox.y || 0),
          w: Number(rowBox.w || 18),
          h: Number(rowBox.h || 8)
        };
        row.style.position = "absolute";
        row.style.left = `${Number(rowBox.x || 0)}%`;
        row.style.top = `${Number(rowBox.y || 0)}%`;
        row.style.width = "max-content";
        row.style.maxWidth = "none";
        row.style.minWidth = "0";
        row.style.display = "inline-flex";
        row.style.justifyContent = "flex-start";
        row.style.alignItems = "center";
        row.style.flexWrap = "nowrap";
        row.style.whiteSpace = "nowrap";
        row.style.gap = isRoundedRect ? "6px" : "5px";
        row.style.padding = "0";
        row.style.pointerEvents = "none";
        row.style.transformOrigin = "left top";
        row.style.zIndex = "7";
      }
    }
    ["customPreviewPriceMain", "customPreviewPriceDec", "customPreviewPriceUnit"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.color = String(text.priceColor || "#d71920");
        el.style.fontFamily = String(text.priceFontFamily || "Arial");
      }
    });
    if (state.priceBaseMetrics && priceCircle) {
      const mainEl = document.getElementById("customPreviewPriceMain");
      const decEl = document.getElementById("customPreviewPriceDec");
      const unitEl = document.getElementById("customPreviewPriceUnit");
      const rowEl = document.getElementById("customPreviewPriceRow");
      const shapeProfile = getPriceShapeProfile(text);
      const factors = getPriceShapeFactors(shapeProfile, text);
      const badgeRect = priceCircle.getBoundingClientRect();
      const badgeBase = deriveBadgeBaseFromShape(shapeProfile, badgeRect.width, badgeRect.height);
      const editorScale = Math.max(0.5, Number(state.priceBaseMetrics.editorScale || 1));
      let appliedMultiplier = normalizeScaleMultiplier(text.priceScaleMultiplier, 1);

      const applyPriceTypography = () => {
        if (mainEl) mainEl.style.fontSize = `${Math.max(10, Number((badgeBase * factors.main * editorScale).toFixed(2)))}px`;
        if (decEl) decEl.style.fontSize = `${Math.max(7, Number((badgeBase * factors.dec * editorScale).toFixed(2)))}px`;
        if (unitEl) unitEl.style.fontSize = `${Math.max(6, Number((badgeBase * factors.unit * editorScale).toFixed(2)))}px`;
      };

      const applyPriceScale = (multiplier) => {
        if (!rowEl) return;
        rowEl.style.transform = `scale(${Number(multiplier.toFixed(3))})`;
      };

      applyPriceTypography();
      applyPriceScale(appliedMultiplier);

      if (shapeProfile.isRoundedRect && rowEl) {
        for (let i = 0; i < 3; i += 1) {
          const fitRatio = getRoundedRectPriceFitRatio(priceCircle, rowEl);
          if (!(fitRatio < 0.995)) break;
          const nextMultiplier = Number(clamp(appliedMultiplier * fitRatio * 0.97, 0.35, 4).toFixed(2));
          if (!(nextMultiplier < appliedMultiplier - 0.01)) break;
          appliedMultiplier = nextMultiplier;
          applyPriceScale(appliedMultiplier);
        }
      }
      state.priceDisplayedMultiplier = appliedMultiplier;
      state.draft.config.text.priceScaleMultiplier = appliedMultiplier;
    }
    captureLivePriceTextEditorBox(single);
    captureLivePriceAreaEditorBox(single, text);
    const divider = document.getElementById("customPreviewDivider");
    if (divider) {
      const visible = Number(single.divider?.x) >= 0 && Number(single.divider?.h) > 0;
      divider.style.display = visible ? "block" : "none";
      if (visible) setRectStyle(divider, single.divider);
    }
    const flag = document.getElementById("customPreviewFlag");
    if (flag) {
      const visible = Number(single.flagArea?.w) > 0 && Number(single.flagArea?.h) > 0;
      flag.style.display = visible ? "flex" : "none";
      if (visible) setRectStyle(flag, single.flagArea);
    }
    const barcode = document.getElementById("customPreviewBarcodeWrap");
    if (barcode) {
      const visible = Number(single.barcodeArea?.w) > 0 && Number(single.barcodeArea?.h) > 0;
      barcode.style.display = visible ? "block" : "none";
      if (visible) setRectStyle(barcode, single.barcodeArea);
    }
    syncDraftEditorBoxesFromLivePreview(single, text, { syncPriceTextOffset: false, syncPriceArea: false });
  }

  function getOverlay() {
    return document.getElementById(OVERLAY_ID);
  }

  function getPanel() {
    return document.getElementById(PANEL_ID);
  }

  function getCirclePreviewHeightPct(sizePct) {
    const cardRect = getPreviewCard()?.getBoundingClientRect?.();
    if (!cardRect?.width || !cardRect?.height) return Number(sizePct || 0);
    return Number(sizePct || 0) * (cardRect.width / cardRect.height);
  }

  function getVisiblePreviewImageBox() {
    const card = getPreviewCard();
    const track = document.getElementById("customPreviewImagesTrack");
    const img = document.getElementById("customPreviewImage");
    if (!card || !track) return null;
    const cardRect = card.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    if (!cardRect.width || !cardRect.height || !trackRect.width || !trackRect.height) return null;
    if (!img) return getRelativeBox(card, track);
    const naturalW = Number(img.naturalWidth || img.width || 0);
    const naturalH = Number(img.naturalHeight || img.height || 0);
    if (!(naturalW > 0 && naturalH > 0)) return getRelativeBox(card, track);
    const trackRatio = trackRect.width / trackRect.height;
    const imgRatio = naturalW / naturalH;
    let contentW = trackRect.width;
    let contentH = trackRect.height;
    if (imgRatio > trackRatio) contentH = trackRect.width / imgRatio;
    else contentW = trackRect.height * imgRatio;
    return {
      x: Number((((trackRect.left - cardRect.left) + ((trackRect.width - contentW) / 2)) / cardRect.width * 100).toFixed(2)),
      y: Number((((trackRect.top - cardRect.top) + ((trackRect.height - contentH) / 2)) / cardRect.height * 100).toFixed(2)),
      w: Number(((contentW / cardRect.width) * 100).toFixed(2)),
      h: Number(((contentH / cardRect.height) * 100).toFixed(2))
    };
  }

  function expandOverlayBox(box, padX = 1, padY = 1) {
    if (!box) return null;
    const safePadX = Math.max(0, Number(padX) || 0);
    const safePadY = Math.max(0, Number(padY) || 0);
    const nextX = Math.max(0, Number(box.x || 0) - safePadX);
    const nextY = Math.max(0, Number(box.y || 0) - safePadY);
    const nextW = Math.min(100 - nextX, Math.max(1, Number(box.w || 0) + (safePadX * 2)));
    const nextH = Math.min(100 - nextY, Math.max(1, Number(box.h || 0) + (safePadY * 2)));
    return {
      x: Number(nextX.toFixed(2)),
      y: Number(nextY.toFixed(2)),
      w: Number(nextW.toFixed(2)),
      h: Number(nextH.toFixed(2))
    };
  }

  function getPreviewDragBounds(boxW, boxH, minVisibleX = 4, minVisibleY = 4) {
    const width = Math.max(0, Number(boxW) || 0);
    const height = Math.max(0, Number(boxH) || 0);
    const visibleX = clamp(Number(minVisibleX) || 0, 0, 100);
    const visibleY = clamp(Number(minVisibleY) || 0, 0, 100);
    return {
      minX: width > 0 ? (-width + visibleX) : 0,
      maxX: 100 - visibleX,
      minY: height > 0 ? (-height + visibleY) : 0,
      maxY: 100 - visibleY
    };
  }

  function getPriceAreaPreviewSize(priceArea, text = {}) {
    const box = normalizePriceAreaBox(priceArea, text);
    return {
      width: Math.max(0, Number(box.w || 0) || 0),
      height: Math.max(0, Number(box.h || 0) || 0)
    };
  }

  function getPriceAreaKind(text = {}) {
    const shapeProfile = getPriceShapeProfile(text);
    if (shapeProfile.isRoundedRect) return "roundedRect";
    if (shapeProfile.hidePriceBadge || shapeProfile.noCircle) return "textOnly";
    return "circle";
  }

  function normalizePriceAreaBox(source, text = {}) {
    const kind = getPriceAreaKind(text);
    const box = source || {};
    const x = Number(box.x || 0);
    const y = Number(box.y || 0);

    if (kind === "circle") {
      const size = Math.max(4, Number(box.s || box.w || 16) || 16);
      return {
        x,
        y,
        w: size,
        h: getCirclePreviewHeightPct(size),
        s: size
      };
    }

    const fallbackW = kind === "roundedRect" ? 24 : 18;
    const fallbackH = kind === "roundedRect" ? 12 : 8;
    const minW = kind === "roundedRect" ? 8 : 4;
    const minH = kind === "roundedRect" ? 4 : 4;
    const width = Math.max(minW, Number(box.w || box.s || fallbackW) || fallbackW);
    const height = Math.max(minH, Number(box.h || fallbackH) || fallbackH);
    return {
      x,
      y,
      w: width,
      h: height,
      s: Math.max(width, height)
    };
  }

  function commitPriceAreaBox(nextBox, text = {}) {
    if (!state.draft?.config?.singleDirect) return;
    const kind = getPriceAreaKind(text);
    const priceArea = state.draft.config.singleDirect.priceArea || (state.draft.config.singleDirect.priceArea = {});
    const x = Number(nextBox?.x || 0);
    const y = Number(nextBox?.y || 0);

    priceArea.x = Number(x.toFixed(2));
    priceArea.y = Number(y.toFixed(2));

    if (kind === "circle") {
      const size = Number(Math.max(4, Number(nextBox?.w || nextBox?.s || 16) || 16).toFixed(2));
      priceArea.s = size;
      priceArea.w = size;
      priceArea.h = Number(getCirclePreviewHeightPct(size).toFixed(2));
      return;
    }

    const minW = kind === "roundedRect" ? 8 : 4;
    const minH = kind === "roundedRect" ? 4 : 4;
    const width = Number(Math.max(minW, Number(nextBox?.w || nextBox?.s || 0) || minW).toFixed(2));
    const height = Number(Math.max(minH, Number(nextBox?.h || 0) || minH).toFixed(2));
    priceArea.w = width;
    priceArea.h = height;
    priceArea.s = width;
  }

  function getPriceTextEditorBox(single, text = {}) {
    const editorBoxes = ensureEditorBoxes(single);
    const saved = editorBoxes.priceTextOffset;
    if (saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))) {
      return {
        x: Number(saved.x || 0),
        y: Number(saved.y || 0),
        w: Math.max(4, Number(saved.w || 18) || 18),
        h: Math.max(2, Number(saved.h || 8) || 8)
      };
    }
    const priceBox = normalizePriceAreaBox(single?.priceArea, text);
    return {
      x: Number((priceBox.x + (Number(single?.priceTextOffset?.x || 0) * Math.max(0.01, priceBox.w))).toFixed(2)),
      y: Number((priceBox.y + (Number(single?.priceTextOffset?.y || 0) * Math.max(0.01, priceBox.h))).toFixed(2)),
      w: 18,
      h: 8
    };
  }

  function syncStoredPriceTextOffsetFromEditorBox(single, text = {}) {
    if (!single) return;
    const editorBoxes = ensureEditorBoxes(single);
    const rowBox = getPriceTextEditorBox(single, text);
    const priceBox = normalizePriceAreaBox(single.priceArea, text);
    single.priceTextOffset = single.priceTextOffset || { x: 0, y: 0 };
    single.priceTextOffset.x = Number((((Number(rowBox.x || 0) - Number(priceBox.x || 0)) / Math.max(0.01, Number(priceBox.w || 0))).toFixed(4)));
    single.priceTextOffset.y = Number((((Number(rowBox.y || 0) - Number(priceBox.y || 0)) / Math.max(0.01, Number(priceBox.h || 0))).toFixed(4)));
    editorBoxes.priceTextOffset = {
      x: Number(rowBox.x || 0),
      y: Number(rowBox.y || 0),
      w: Math.max(4, Number(rowBox.w || 18) || 18),
      h: Math.max(2, Number(rowBox.h || 8) || 8)
    };
  }

  function preserveCurrentPriceTextBox(single, text = {}) {
    if (!single) return;
    const card = getPreviewCard();
    const row = document.getElementById("customPreviewPriceRow");
    const liveRowBox = getRelativeBox(card, row);
    if (!liveRowBox) return;
    const editorBoxes = ensureEditorBoxes(single);
    editorBoxes.priceTextOffset = {
      x: Number(liveRowBox.x || 0),
      y: Number(liveRowBox.y || 0),
      w: Math.max(4, Number(liveRowBox.w || 18) || 18),
      h: Math.max(2, Number(liveRowBox.h || 8) || 8)
    };
    syncStoredPriceTextOffsetFromEditorBox(single, text);
  }

  function detachPriceTextFromBadge() {
    const card = getPreviewCard();
    const row = document.getElementById("customPreviewPriceRow");
    const badge = document.getElementById("customPreviewPriceCircle");
    if (!card || !row || !badge) return;
    if (!row.dataset.creatorOriginalParentId) row.dataset.creatorOriginalParentId = badge.id;
    if (row.parentElement !== card) card.appendChild(row);
  }

  function restorePriceTextToBadge() {
    const row = document.getElementById("customPreviewPriceRow");
    if (!row) return;
    const targetParent = document.getElementById(row.dataset.creatorOriginalParentId || "customPreviewPriceCircle");
    if (targetParent && row.parentElement !== targetParent) targetParent.appendChild(row);
    [
      "position",
      "left",
      "top",
      "width",
      "maxWidth",
      "minWidth",
      "display",
      "justifyContent",
      "alignItems",
      "flexWrap",
      "whiteSpace",
      "gap",
      "padding",
      "pointerEvents",
      "transformOrigin",
      "transform",
      "zIndex"
    ].forEach((prop) => {
      row.style[prop] = "";
    });
  }

  function resizeCirclePriceAreaFromHandle(source, dir, dxPct, dyPct, text = {}) {
    const cardRect = getPreviewCard()?.getBoundingClientRect?.();
    if (!cardRect?.width || !cardRect?.height) return;
    const normalized = normalizePriceAreaBox(source, text);
    const sourceWidthPx = Math.max((normalized.w / 100) * cardRect.width, 4);
    const sourceHeightPx = Math.max((normalized.h / 100) * cardRect.height, 4);
    const sourceSizePx = Math.max(sourceWidthPx, sourceHeightPx);
    const sourceLeftPx = (normalized.x / 100) * cardRect.width;
    const sourceTopPx = (normalized.y / 100) * cardRect.height;
    const sourceRightPx = sourceLeftPx + sourceWidthPx;
    const sourceBottomPx = sourceTopPx + sourceHeightPx;
    const sourceCenterXPx = sourceLeftPx + (sourceWidthPx / 2);
    const sourceCenterYPx = sourceTopPx + (sourceHeightPx / 2);
    const dxPx = (Number(dxPct || 0) / 100) * cardRect.width;
    const dyPx = (Number(dyPct || 0) / 100) * cardRect.height;
    let scale = 1;

    if (dir === "e") scale = (sourceSizePx + dxPx) / sourceSizePx;
    else if (dir === "w") scale = (sourceSizePx - dxPx) / sourceSizePx;
    else if (dir === "s") scale = (sourceSizePx + dyPx) / sourceSizePx;
    else if (dir === "n") scale = (sourceSizePx - dyPx) / sourceSizePx;
    else if (dir === "se") scale = Math.max((sourceSizePx + dxPx) / sourceSizePx, (sourceSizePx + dyPx) / sourceSizePx);
    else if (dir === "sw") scale = Math.max((sourceSizePx - dxPx) / sourceSizePx, (sourceSizePx + dyPx) / sourceSizePx);
    else if (dir === "ne") scale = Math.max((sourceSizePx + dxPx) / sourceSizePx, (sourceSizePx - dyPx) / sourceSizePx);
    else if (dir === "nw") scale = Math.max((sourceSizePx - dxPx) / sourceSizePx, (sourceSizePx - dyPx) / sourceSizePx);

    const maxSizePx = Math.min(cardRect.width * 0.96, cardRect.height * 0.96);
    const nextSizePx = clamp(sourceSizePx * scale, 4, Math.max(4, maxSizePx));
    let nextLeftPx = sourceLeftPx;
    let nextTopPx = sourceTopPx;

    if (dir === "e") {
      nextTopPx = sourceCenterYPx - (nextSizePx / 2);
    } else if (dir === "w") {
      nextLeftPx = sourceRightPx - nextSizePx;
      nextTopPx = sourceCenterYPx - (nextSizePx / 2);
    } else if (dir === "s") {
      nextLeftPx = sourceCenterXPx - (nextSizePx / 2);
    } else if (dir === "n") {
      nextLeftPx = sourceCenterXPx - (nextSizePx / 2);
      nextTopPx = sourceBottomPx - nextSizePx;
    } else if (dir === "sw") {
      nextLeftPx = sourceRightPx - nextSizePx;
    } else if (dir === "ne") {
      nextTopPx = sourceBottomPx - nextSizePx;
    } else if (dir === "nw") {
      nextLeftPx = sourceRightPx - nextSizePx;
      nextTopPx = sourceBottomPx - nextSizePx;
    }

    const nextSizePct = (nextSizePx / cardRect.width) * 100;
    const nextHeightPct = getCirclePreviewHeightPct(nextSizePct);
    const bounds = getPreviewDragBounds(nextSizePct, nextHeightPct);
    commitPriceAreaBox({
      x: clamp((nextLeftPx / cardRect.width) * 100, bounds.minX, bounds.maxX),
      y: clamp((nextTopPx / cardRect.height) * 100, bounds.minY, bounds.maxY),
      w: nextSizePct,
      h: nextHeightPct
    }, text);
  }

  function resizeRectPriceAreaFromHandle(source, dir, dxPct, dyPct, text = {}) {
    const kind = getPriceAreaKind(text);
    const normalized = normalizePriceAreaBox(source, text);
    const minW = kind === "roundedRect" ? 8 : 4;
    const minH = kind === "roundedRect" ? 4 : 4;
    let nextX = Number(normalized.x || 0);
    let nextY = Number(normalized.y || 0);
    let nextW = Number(normalized.w || 0);
    let nextH = Number(normalized.h || 0);

    if (dir.includes("e")) nextW += dxPct;
    if (dir.includes("s")) nextH += dyPct;
    if (dir.includes("w")) {
      nextX += dxPct;
      nextW -= dxPct;
    }
    if (dir.includes("n")) {
      nextY += dyPct;
      nextH -= dyPct;
    }

    if (nextW < minW) {
      if (dir.includes("w")) nextX -= (minW - nextW);
      nextW = minW;
    }
    if (nextH < minH) {
      if (dir.includes("n")) nextY -= (minH - nextH);
      nextH = minH;
    }

    const bounds = getPreviewDragBounds(nextW, nextH);
    nextX = clamp(nextX, bounds.minX, bounds.maxX);
    nextY = clamp(nextY, bounds.minY, bounds.maxY);
    nextW = clamp(nextW, minW, Math.max(minW, 100 - Math.max(nextX, 0)));
    nextH = clamp(nextH, minH, Math.max(minH, 100 - Math.max(nextY, 0)));

    commitPriceAreaBox({
      x: nextX,
      y: nextY,
      w: nextW,
      h: nextH
    }, text);
  }

  function resizePriceAreaByStep(deltaPct, activeAxis = "both", text = {}) {
    const kind = getPriceAreaKind(text);
    const current = normalizePriceAreaBox(state.draft?.config?.singleDirect?.priceArea, text);

    if (kind === "circle") {
      const nextSize = clamp(Number(current.w || 16) + deltaPct, 4, 96);
      const nextHeight = getCirclePreviewHeightPct(nextSize);
      const bounds = getPreviewDragBounds(nextSize, nextHeight);
      commitPriceAreaBox({
        x: clamp(Number(current.x || 0), bounds.minX, bounds.maxX),
        y: clamp(Number(current.y || 0), bounds.minY, bounds.maxY),
        w: nextSize,
        h: nextHeight
      }, text);
      return;
    }

    const minW = kind === "roundedRect" ? 8 : 4;
    const minH = kind === "roundedRect" ? 4 : 4;
    const wStep = activeAxis === "y" ? 0 : deltaPct;
    const hStep = activeAxis === "x" ? 0 : deltaPct;
    const nextW = clamp(Number(current.w || 0) + wStep, minW, 96);
    const nextH = clamp(Number(current.h || 0) + hStep, minH, 96);
    const bounds = getPreviewDragBounds(nextW, nextH);

    commitPriceAreaBox({
      x: clamp(Number(current.x || 0), bounds.minX, bounds.maxX),
      y: clamp(Number(current.y || 0), bounds.minY, bounds.maxY),
      w: nextW,
      h: nextH
    }, text);
  }

  function getElementCardDef(key) {
    return ELEMENT_CARD_DEFS.find((item) => item.key === key) || null;
  }

  function buildElementPaletteMarkup() {
    return ELEMENT_CARD_DEFS.map((item) => `
      <button
        type="button"
        class="custom-style-creator-element-card"
        data-creator-select="${item.key}"
        aria-pressed="${state.selectedKey === item.key ? "true" : "false"}"
      >
        <span class="custom-style-creator-element-card__title">${item.title}</span>
        <span class="custom-style-creator-element-card__desc">${item.desc}</span>
      </button>
    `).join("");
  }

  function refreshElementPaletteSelection() {
    const palette = document.getElementById(PALETTE_ID);
    if (!palette) return;
    palette.querySelectorAll("[data-creator-select]").forEach((node) => {
      const key = String(node.getAttribute("data-creator-select") || "");
      const active = key === state.selectedKey;
      node.setAttribute("aria-pressed", active ? "true" : "false");
      node.classList.toggle("is-active", active);
    });
  }

  function updateSelectedElementMetrics() {
    const metrics = document.getElementById(METRICS_ID);
    if (!metrics || !state.draft?.config?.singleDirect) return;
    const single = state.draft.config.singleDirect;
    const text = state.draft.config.text || {};
    const def = getElementCardDef(state.selectedKey) || { title: "Element" };
    let box = null;

    if (state.selectedKey === "priceArea") {
      box = normalizePriceAreaBox(single.priceArea, text);
    } else if (state.selectedKey === "priceTextOffset") {
      box = getPriceTextEditorBox(single, text);
    } else if (state.selectedKey === "indexPos" || state.selectedKey === "packagePos") {
      const point = single[state.selectedKey] || {};
      box = { x: Number(point.x || 0), y: Number(point.y || 0), w: 0, h: 0 };
    } else {
      const raw = single[state.selectedKey] || {};
      box = {
        x: Number(raw.x || 0),
        y: Number(raw.y || 0),
        w: Number(raw.w || 0),
        h: Number(raw.h || 0)
      };
    }

    metrics.innerHTML = `
      <div class="custom-style-creator-metric-card">
        <span>Element</span>
        <strong>${def.title}</strong>
      </div>
      <div class="custom-style-creator-metric-card">
        <span>X</span>
        <strong>${Number(box.x || 0).toFixed(2)}%</strong>
      </div>
      <div class="custom-style-creator-metric-card">
        <span>Y</span>
        <strong>${Number(box.y || 0).toFixed(2)}%</strong>
      </div>
      <div class="custom-style-creator-metric-card">
        <span>W</span>
        <strong>${Number(box.w || 0).toFixed(2)}%</strong>
      </div>
      <div class="custom-style-creator-metric-card">
        <span>H</span>
        <strong>${Number(box.h || 0).toFixed(2)}%</strong>
      </div>
    `;
  }

  function stabilizeCreatorOverlay() {
    if (!state.active || !state.draft?.config?.singleDirect) return;
    const single = state.draft.config.singleDirect;
    const text = state.draft.config?.text || {};
    captureLivePriceTextEditorBox(single);
    captureLivePriceAreaEditorBox(single, text);
    renderOverlayHandles();
  }

  function scheduleCreatorOverlayStabilization() {
    requestAnimationFrame(() => {
      requestAnimationFrame(stabilizeCreatorOverlay);
    });
  }

  function keepPriceTextOffsetVisible() {
    if (!state.draft?.config?.singleDirect) return false;
    const card = getPreviewCard();
    const badge = document.getElementById("customPreviewPriceCircle");
    const row = document.getElementById("customPreviewPriceRow");
    if (!card || !badge || !row) return false;

    const badgeBox = getRelativeBox(card, badge);
    const rowBox = getRelativeBox(card, row);
    if (
      !badgeBox || !rowBox ||
      !(Number(badgeBox.w) > 0) || !(Number(badgeBox.h) > 0) ||
      !(Number(rowBox.w) > 0) || !(Number(rowBox.h) > 0)
    ) {
      return false;
    }

    // Tekst ceny ma dać się przeciągać po całym podglądzie,
    // ale zostawiamy minimalny fragment widoczny w obrębie karty.
    const minVisibleW = Math.max(2, Math.min(Number(rowBox.w || 0), 8) * 0.5);
    const minVisibleH = Math.max(1.2, Math.min(Number(rowBox.h || 0), 6) * 0.5);
    const rowBounds = getPreviewDragBounds(Number(rowBox.w || 0), Number(rowBox.h || 0), minVisibleW, minVisibleH);
    const clampedRowX = clamp(Number(rowBox.x || 0), rowBounds.minX, rowBounds.maxX);
    const clampedRowY = clamp(Number(rowBox.y || 0), rowBounds.minY, rowBounds.maxY);
    const deltaRowX = clampedRowX - Number(rowBox.x || 0);
    const deltaRowY = clampedRowY - Number(rowBox.y || 0);
    if (Math.abs(deltaRowX) < 0.01 && Math.abs(deltaRowY) < 0.01) return false;

    const single = state.draft.config.singleDirect;
    const editorBoxes = ensureEditorBoxes(single);
    editorBoxes.priceTextOffset = {
      x: Number(clampedRowX.toFixed(2)),
      y: Number(clampedRowY.toFixed(2)),
      w: Number(rowBox.w || 18),
      h: Number(rowBox.h || 8)
    };
    syncStoredPriceTextOffsetFromEditorBox(single, state.draft.config?.text || {});
    return true;
  }

  function getLiveOverlayBoxForDef(def, single, text, livePriceRowBox, livePriceAreaBox, liveImageAreaBox) {
    if (!def || !single) return null;
    const editorBoxes = single._editorBoxes || {};
    if (def.key === "imgArea") {
      return liveImageAreaBox || editorBoxes.imgArea || single.imgArea || null;
    }
    if (def.key === "nameArea" || def.key === "flagArea" || def.key === "barcodeArea" || def.key === "divider") {
      return editorBoxes[def.key] || single[def.key] || null;
    }
    if (def.key === "priceArea") {
      return editorBoxes.priceArea || livePriceAreaBox || normalizePriceAreaBox(single.priceArea, text);
    }
    if (def.key === "priceTextOffset") {
      return editorBoxes.priceTextOffset || livePriceRowBox || getPriceTextEditorBox(single, text);
    }
    const point = single[def.key];
    return editorBoxes[def.key] || { x: point?.x, y: point?.y, w: 8, h: 6 };
  }

  function canResizeWithOverlayHandles(def) {
    return !!def && def.type === "rect" && def.key !== "divider";
  }

  function buildResizeHandlesMarkup(def, borderColor) {
    if (!canResizeWithOverlayHandles(def) || state.selectedKey !== def.key) return "";
    const handles = [
      { dir: "nw", left: "-6px", top: "-6px", cursor: "nwse-resize" },
      { dir: "n", left: "calc(50% - 5px)", top: "-6px", cursor: "ns-resize" },
      { dir: "ne", right: "-6px", top: "-6px", cursor: "nesw-resize" },
      { dir: "e", right: "-6px", top: "calc(50% - 5px)", cursor: "ew-resize" },
      { dir: "se", right: "-6px", bottom: "-6px", cursor: "nwse-resize" },
      { dir: "s", left: "calc(50% - 5px)", bottom: "-6px", cursor: "ns-resize" },
      { dir: "sw", left: "-6px", bottom: "-6px", cursor: "nesw-resize" },
      { dir: "w", left: "-6px", top: "calc(50% - 5px)", cursor: "ew-resize" }
    ];
    return handles.map((handle) => {
      const pos = [
        Number.isFinite(parseFloat(handle.left)) || String(handle.left || "").startsWith("calc(") ? `left:${handle.left};` : "",
        Number.isFinite(parseFloat(handle.right)) || String(handle.right || "").startsWith("calc(") ? `right:${handle.right};` : "",
        Number.isFinite(parseFloat(handle.top)) || String(handle.top || "").startsWith("calc(") ? `top:${handle.top};` : "",
        Number.isFinite(parseFloat(handle.bottom)) || String(handle.bottom || "").startsWith("calc(") ? `bottom:${handle.bottom};` : ""
      ].join("");
      return `
        <span
          data-style-key="${def.key}"
          data-resize-dir="${handle.dir}"
          style="
            position:absolute;
            ${pos}
            width:10px;
            height:10px;
            border:2px solid ${borderColor};
            background:#ffffff;
            border-radius:2px;
            box-sizing:border-box;
            cursor:${handle.cursor};
            pointer-events:auto;
          "
        ></span>
      `;
    }).join("");
  }

  function applyBoxResize(key, source, dxPct, dyPct) {
    if (!state.draft) return;
    const single = state.draft.config.singleDirect;
    const dir = String(state.drag?.dir || "");
    if (!dir) return;
    if (key === "priceTextOffset") {
      state.draft.config.text = state.draft.config.text || {};
      const sourceScale = normalizeScaleMultiplier(state.drag?.sourceScale, measureDisplayedPriceScaleMultiplier());
      const primaryDelta = Math.abs(Number(dxPct || 0)) >= Math.abs(Number(dyPct || 0))
        ? Number(dxPct || 0)
        : Number(dyPct || 0);
      const signedDelta = (dir.includes("w") || dir.includes("n")) ? -primaryDelta : primaryDelta;
      const nextScale = Number(clamp(sourceScale * (1 + (signedDelta * 0.03)), 0.35, 4).toFixed(2));
      state.priceDisplayedMultiplier = nextScale;
      state.draft.config.text.priceScaleMultiplier = nextScale;
      return;
    }
    if (key === "priceArea") {
      const text = state.draft.config?.text || {};
      preserveCurrentPriceTextBox(single, text);
      if (getPriceAreaKind(text) === "circle") {
        resizeCirclePriceAreaFromHandle(source, dir, dxPct, dyPct, text);
      } else {
        resizeRectPriceAreaFromHandle(source, dir, dxPct, dyPct, text);
      }
      return;
    }
    const keepAspectRatio = key === "imgArea";
    const minW = 2;
    const minH = 2;
    if (keepAspectRatio) {
      const sourceW = Math.max(Number(source.w || source.s || 0), minW);
      const sourceH = Math.max(Number(source.h || source.s || 0), minH);
      const sourceLeft = Number(source.x || 0);
      const sourceTop = Number(source.y || 0);
      const sourceRight = sourceLeft + sourceW;
      const sourceBottom = sourceTop + sourceH;
      const sourceCenterX = sourceLeft + (sourceW / 2);
      const sourceCenterY = sourceTop + (sourceH / 2);
      const minScale = Math.max(minW / sourceW, minH / sourceH);
      const maxScale = Math.min(96 / sourceW, 96 / sourceH);
      let scale = 1;

      if (dir === "e") scale = (sourceW + dxPct) / sourceW;
      else if (dir === "w") scale = (sourceW - dxPct) / sourceW;
      else if (dir === "s") scale = (sourceH + dyPct) / sourceH;
      else if (dir === "n") scale = (sourceH - dyPct) / sourceH;
      else if (dir === "se") scale = Math.max((sourceW + dxPct) / sourceW, (sourceH + dyPct) / sourceH);
      else if (dir === "sw") scale = Math.max((sourceW - dxPct) / sourceW, (sourceH + dyPct) / sourceH);
      else if (dir === "ne") scale = Math.max((sourceW + dxPct) / sourceW, (sourceH - dyPct) / sourceH);
      else if (dir === "nw") scale = Math.max((sourceW - dxPct) / sourceW, (sourceH - dyPct) / sourceH);

      scale = clamp(scale, minScale, maxScale);

      const nextW = sourceW * scale;
      const nextH = sourceH * scale;
      let nextX = sourceLeft;
      let nextY = sourceTop;

      if (dir === "e") {
        nextX = sourceLeft;
        nextY = sourceCenterY - (nextH / 2);
      } else if (dir === "w") {
        nextX = sourceRight - nextW;
        nextY = sourceCenterY - (nextH / 2);
      } else if (dir === "s") {
        nextX = sourceCenterX - (nextW / 2);
        nextY = sourceTop;
      } else if (dir === "n") {
        nextX = sourceCenterX - (nextW / 2);
        nextY = sourceBottom - nextH;
      } else if (dir === "se") {
        nextX = sourceLeft;
        nextY = sourceTop;
      } else if (dir === "sw") {
        nextX = sourceRight - nextW;
        nextY = sourceTop;
      } else if (dir === "ne") {
        nextX = sourceLeft;
        nextY = sourceBottom - nextH;
      } else if (dir === "nw") {
        nextX = sourceRight - nextW;
        nextY = sourceBottom - nextH;
      }

      nextX = clamp(nextX, 0, 96);
      nextY = clamp(nextY, 0, 96);

      single[key] = single[key] || {};
      single[key].x = Number(nextX.toFixed(2));
      single[key].y = Number(nextY.toFixed(2));
      single[key].w = Number(nextW.toFixed(2));
      single[key].h = Number(nextH.toFixed(2));
      return;
    }
    let nextX = Number(source.x || 0);
    let nextY = Number(source.y || 0);
    let nextW = Number(source.w || 0);
    let nextH = Number(source.h || 0);

    if (dir.includes("e")) nextW += dxPct;
    if (dir.includes("s")) nextH += dyPct;
    if (dir.includes("w")) {
      nextX += dxPct;
      nextW -= dxPct;
    }
    if (dir.includes("n")) {
      nextY += dyPct;
      nextH -= dyPct;
    }

    if (nextW < minW) {
      if (dir.includes("w")) nextX -= (minW - nextW);
      nextW = minW;
    }
    if (nextH < minH) {
      if (dir.includes("n")) nextY -= (minH - nextH);
      nextH = minH;
    }

    nextX = clamp(nextX, 0, 96);
    nextY = clamp(nextY, 0, 96);
    nextW = clamp(nextW, minW, Math.max(minW, 100 - Math.max(nextX, 0)));
    nextH = clamp(nextH, minH, Math.max(minH, 100 - Math.max(nextY, 0)));

    single[key] = single[key] || {};
    single[key].x = Number(nextX.toFixed(2));
    single[key].y = Number(nextY.toFixed(2));
    single[key].w = Number(nextW.toFixed(2));
    single[key].h = Number(nextH.toFixed(2));
  }

  function syncControlValues() {
    const draft = state.draft;
    if (!draft) return;
    const select = document.getElementById(ELEMENT_SELECT_ID);
    if (select) select.value = state.selectedKey || "priceArea";
    const metaFont = document.getElementById(META_FONT_ID);
    if (metaFont) metaFont.value = String(draft.config?.text?.metaFontFamily || "Arial");
    const priceFont = document.getElementById(PRICE_FONT_ID);
    if (priceFont) priceFont.value = String(draft.config?.text?.priceFontFamily || "Arial");
    const priceColor = document.getElementById(PRICE_COLOR_ID);
    if (priceColor) priceColor.value = String(draft.config?.text?.priceColor || "#d71920");
    const indexColor = document.getElementById(INDEX_COLOR_ID);
    if (indexColor) indexColor.value = String(draft.config?.text?.indexColor || "#b9b9b9");
    const packageColor = document.getElementById(PACKAGE_COLOR_ID);
    if (packageColor) packageColor.value = String(draft.config?.text?.packageColor || "#334155");
    const priceBg = document.getElementById(PRICE_BG_COLOR_ID);
    if (priceBg) priceBg.value = String(draft.config?.text?.priceBgColor || "#d71920");
    const noCircle = document.getElementById(NO_CIRCLE_ID);
    if (noCircle) noCircle.checked = !!draft.config?.text?.hidePriceBadge;
    const priceShape = document.getElementById(PRICE_SHAPE_ID);
    if (priceShape) {
      const hidden = !!draft.config?.text?.hidePriceBadge;
      const shape = hidden ? "none" : String(draft.config?.text?.priceShape || "circle");
      priceShape.value = (shape === "roundedRect" || shape === "none") ? shape : "circle";
    }
    refreshElementPaletteSelection();
    updateSelectedElementMetrics();
  }

  function updateJsonOutput() {
    const jsonEl = document.getElementById(JSON_ID);
    if (!jsonEl || !state.draft) return;
    jsonEl.value = JSON.stringify(state.draft, null, 2);
  }

  function selectPreviewElement(key) {
    if (!state.active || !state.draft || !key) return;
    state.selectedKey = String(key);
    syncControlValues();
    renderOverlayHandles();
    if (key === "priceTextOffset" || key === "priceArea") scheduleCreatorOverlayStabilization();
  }

  function bindDirectPreviewSelection() {
    [
      { id: "customPreviewImagesTrack", key: "imgArea" },
      { id: "customPreviewImage", key: "imgArea" },
      { id: "customPreviewName", key: "nameArea" },
      { id: "customPreviewIndex", key: "indexPos" },
      { id: "customPreviewPackageInfo", key: "packagePos" },
      { id: "customPreviewPriceRow", key: "priceTextOffset" },
      { id: "customPreviewPriceCircle", key: "priceArea" },
      { id: "customPreviewDivider", key: "divider" },
      { id: "customPreviewBarcodeWrap", key: "barcodeArea" },
      { id: "customPreviewFlag", key: "flagArea" }
    ].forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (!el || el.dataset.creatorStyleDirectSelectBound === "1") return;
      el.dataset.creatorStyleDirectSelectBound = "1";
      el.addEventListener("mousedown", (event) => {
        if (!state.active) return;
        if (event.target?.closest?.("[data-resize-dir]")) return;
        selectPreviewElement(key);
      });
      el.addEventListener("click", () => {
        if (!state.active) return;
        selectPreviewElement(key);
      });
    });
  }

  function renderOverlayHandles() {
    const overlay = getOverlay();
    const draft = state.draft;
    if (!overlay || !draft?.config?.singleDirect) return;
    const single = draft.config.singleDirect;
    const text = draft.config.text || {};
    const editorBoxes = ensureEditorBoxes(single);
    const noPriceBackground = !!text.hidePriceBadge || !!text.noPriceCircle || String(text.priceShape || "") === "none";
    const livePriceRowBox = getRelativeBox(getPreviewCard(), document.getElementById("customPreviewPriceRow"));
    const livePriceAreaBox = getRelativeBox(getPreviewCard(), document.getElementById("customPreviewPriceCircle"));
    const liveImageAreaBox = getVisiblePreviewImageBox();
    const priceTextOverlayBox = editorBoxes.priceTextOffset || livePriceRowBox || getPriceTextEditorBox(single, text);
    const compactNoBadgePriceAreaBox = noPriceBackground
      ? expandOverlayBox(priceTextOverlayBox, 1.4, 1.1)
      : null;
    const compactNoBadgePriceTextBox = noPriceBackground
      ? expandOverlayBox(priceTextOverlayBox, 0.35, 0.25)
      : null;

    overlay.style.backgroundImage = `
      linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(15, 23, 42, 0.08) 1px, transparent 1px),
      linear-gradient(to right, rgba(14, 165, 233, 0.16) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(14, 165, 233, 0.16) 1px, transparent 1px)
    `;
    overlay.style.backgroundSize = "5% 100%, 100% 5%, 25% 100%, 100% 25%";
    overlay.style.backgroundPosition = "0 0, 0 0, 0 0, 0 0";

    overlay.innerHTML = HANDLE_DEFS.map((def) => {
      const box = (def.key === "priceArea" && noPriceBackground)
        ? compactNoBadgePriceAreaBox
        : (def.key === "priceTextOffset" && noPriceBackground)
          ? compactNoBadgePriceTextBox
          : getLiveOverlayBoxForDef(def, single, text, livePriceRowBox, livePriceAreaBox, liveImageAreaBox);
      const visible = !(def.key === "divider" && Number(single.divider?.x) < 0) &&
        !(def.key === "flagArea" && !(Number(single.flagArea?.w) > 0 && Number(single.flagArea?.h) > 0)) &&
        !(def.key === "barcodeArea" && !(Number(single.barcodeArea?.w) > 0 && Number(single.barcodeArea?.h) > 0));
      if (!visible || !box) return "";
      const isPriceTextOnly = (def.key === "priceArea" || def.key === "priceTextOffset") && noPriceBackground;
      const borderColor = state.selectedKey === def.key
        ? "#f59e0b"
        : (isPriceTextOnly ? "#64748b" : (def.key === "priceArea" ? "#dc2626" : "#0ea5e9"));
      const bgColor = state.selectedKey === def.key
        ? (isPriceTextOnly ? "rgba(245,158,11,.02)" : "rgba(245,158,11,.04)")
        : (isPriceTextOnly ? "transparent" : (def.key === "priceArea" ? "rgba(220,38,38,.03)" : "rgba(14,165,233,.03)"));
      const borderStyle = isPriceTextOnly ? "2px dashed" : "2px solid";
      const radius = isPriceTextOnly ? "6px" : (def.key === "priceArea" ? "12px" : "6px");
      const zIndex = state.selectedKey === def.key
        ? 40
        : (def.key === "priceTextOffset" ? 32 : (def.key === "priceArea" ? 24 : 12));
      return `
        <div
          class="custom-style-creator-handle"
          data-style-key="${def.key}"
          style="
            position:absolute;
            left:${box.x}%;
            top:${box.y}%;
            width:${Math.max(3, box.w || 8)}%;
            height:${Math.max(2, box.h || 6)}%;
            border:${borderStyle} ${borderColor};
            background:${bgColor};
            border-radius:${radius};
            box-sizing:border-box;
            cursor:move;
            pointer-events:auto;
            user-select:none;
            z-index:${zIndex};
          "
        >
          <span class="custom-style-creator-handle-label" style="
            position:absolute;left:4px;top:2px;
            font-size:10px;font-weight:700;color:#0f172a;
            background:rgba(255,255,255,.9);padding:1px 4px;border-radius:4px;
            display:${state.selectedKey === def.key ? "inline-block" : "none"};
            pointer-events:none;
          ">${def.label}</span>
          ${buildResizeHandlesMarkup(def, borderColor)}
        </div>
      `;
    }).join("");

    overlay.querySelectorAll("[data-style-key]").forEach((el) => {
      if (el.hasAttribute("data-resize-dir")) return;
      el.onmousedown = (event) => {
        event.preventDefault();
        const key = String(el.getAttribute("data-style-key") || "");
        if (key === "priceArea") preserveCurrentPriceTextBox(single, text);
        if (key === "priceTextOffset") captureLivePriceTextEditorBox(single);
        state.selectedKey = key;
        syncControlValues();
        state.drag = {
          key,
          startX: event.clientX,
          startY: event.clientY,
          source: cloneJson(
            key === "priceTextOffset"
              ? getPriceTextEditorBox(state.draft.config.singleDirect, state.draft.config?.text || {})
              : (
                (noPriceBackground && key === "priceArea")
                  ? (compactNoBadgePriceAreaBox || state.draft.config.singleDirect.priceArea || {})
                  : (state.draft.config.singleDirect[key] || state.draft.config.singleDirect.priceArea || {})
              )
          )
        };
        state.selectedAxis = event.shiftKey ? "y" : (event.altKey ? "x" : "both");
        renderOverlayHandles();
      };
    });

    overlay.querySelectorAll("[data-resize-dir]").forEach((el) => {
      el.onmousedown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = String(el.getAttribute("data-style-key") || "");
        const dir = String(el.getAttribute("data-resize-dir") || "");
        if (key === "priceArea") preserveCurrentPriceTextBox(single, text);
        if (key === "priceTextOffset") captureLivePriceTextEditorBox(single);
        const def = HANDLE_DEFS.find((item) => item.key === key);
        const source = (key === "priceArea" && noPriceBackground)
          ? compactNoBadgePriceAreaBox
          : (key === "priceTextOffset" && noPriceBackground)
            ? compactNoBadgePriceTextBox
            : getLiveOverlayBoxForDef(def, single, text, livePriceRowBox, livePriceAreaBox, liveImageAreaBox);
        if (!source) return;
        state.selectedKey = key;
        syncControlValues();
        state.drag = {
          mode: "resize",
          key,
          dir,
          startX: event.clientX,
          startY: event.clientY,
          source: cloneJson(source),
          sourceScale: key === "priceTextOffset" ? measureDisplayedPriceScaleMultiplier() : null
        };
      };
    });

    refreshElementPaletteSelection();
    updateSelectedElementMetrics();
    updateJsonOutput();
  }

  function resizeSelected(deltaPct, axisOverride = null) {
    if (!state.draft || !state.selectedKey) return;
    const single = state.draft.config.singleDirect;
    const key = state.selectedKey;
    const activeAxis = axisOverride || state.selectedAxis || "both";
    let shouldRefreshPriceMetrics = false;
    if (key === "priceArea") {
      preserveCurrentPriceTextBox(single, state.draft.config?.text || {});
      resizePriceAreaByStep(deltaPct, activeAxis, state.draft.config?.text || {});
      shouldRefreshPriceMetrics = true;
    } else if (key === "priceTextOffset") {
      state.draft.config.text = state.draft.config.text || {};
      const visibleScale = Number(state.priceDisplayedMultiplier);
      const storedScale = normalizeScaleMultiplier(state.draft.config.text.priceScaleMultiplier, 1);
      const baseScale = Number.isFinite(visibleScale) && visibleScale > 0
        ? visibleScale
        : storedScale;
      const ratio = clamp(1 + (deltaPct * 0.06), 0.7, 1.3);
      const nextScale = Number(clamp(baseScale * ratio, 0.35, 4).toFixed(2));
      state.priceDisplayedMultiplier = nextScale;
      state.draft.config.text.priceScaleMultiplier = nextScale;
    } else if (key === "divider") {
      single.divider.h = Number(clamp(Number(single.divider?.h || 0) + deltaPct, 0, 96).toFixed(2));
      single.divider.w = Number(clamp(Number(single.divider?.w || 0.55) + (deltaPct * 0.08), 0, 8).toFixed(2));
    } else {
      const box = single[key] || {};
      const widthStep = activeAxis === "y" ? 0 : deltaPct;
      const heightStep = activeAxis === "x" ? 0 : deltaPct;
      box.w = Number(clamp(Number(box.w || 10) + widthStep, 0, 96).toFixed(2));
      box.h = Number(clamp(Number(box.h || 10) + heightStep, 0, 96).toFixed(2));
      single[key] = box;
    }
    applyDraftToPreview();
    if (key === "priceTextOffset" && keepPriceTextOffsetVisible()) {
      applyDraftToPreview();
    }
    if (shouldRefreshPriceMetrics) captureBasePriceMetrics();
    renderOverlayHandles();
    updateJsonOutput();
  }

  function toggleSelectedVisibility() {
    if (!state.draft || !state.selectedKey) return;
    const single = state.draft.config.singleDirect;
    const key = state.selectedKey;
    if (key === "priceArea") {
      preserveCurrentPriceTextBox(single, state.draft.config?.text || {});
      state.draft.config.text = state.draft.config.text || {};
      state.draft.config.text.hidePriceBadge = !state.draft.config.text.hidePriceBadge;
      state.draft.config.text.noPriceCircle = !!state.draft.config.text.hidePriceBadge;
      state.draft.config.text.priceShape = state.draft.config.text.hidePriceBadge ? "none" : "circle";
    } else if (key === "priceTextOffset") {
      return;
    } else if (key === "divider") {
      const visible = Number(single.divider?.x) >= 0 && Number(single.divider?.h) > 0;
      single.divider = visible ? { x: -1, y: 0, h: 0, w: 0 } : { x: 63.6, y: 15.5, h: 58.5, w: 0.55 };
    } else if (key === "flagArea" || key === "barcodeArea") {
      const box = single[key] || {};
      const visible = Number(box.w) > 0 && Number(box.h) > 0;
      single[key] = visible ? { x: 0, y: 0, w: 0, h: 0 } : (key === "flagArea" ? { x: 35, y: 78.8, w: 18, h: 2.6 } : { x: 53, y: 79.2, w: 38, h: 11 });
    }
    syncControlValues();
    applyDraftToPreview();
    renderOverlayHandles();
  }

  function onGlobalPointerMove(event) {
    if (!state.active || !state.drag || !state.draft) return;
    const card = getPreviewCard();
    if (!card) return;
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dxPct = ((event.clientX - state.drag.startX) / rect.width) * 100;
    const dyPct = ((event.clientY - state.drag.startY) / rect.height) * 100;
    const key = state.drag.key;
    const single = state.draft.config.singleDirect;
    if (state.drag.mode === "resize") {
      applyBoxResize(key, state.drag.source || {}, dxPct, dyPct);
      applyDraftToPreview();
      if (key === "priceTextOffset" && keepPriceTextOffsetVisible()) {
        applyDraftToPreview();
      }
      if (key === "priceArea") captureBasePriceMetrics();
      renderOverlayHandles();
      return;
    }
    if (key === "priceArea") {
      const text = state.draft.config?.text || {};
      preserveCurrentPriceTextBox(single, text);
      const sourceBox = normalizePriceAreaBox(state.drag.source || single.priceArea, text);
      const bounds = getPreviewDragBounds(sourceBox.w, sourceBox.h);
      commitPriceAreaBox({
        ...normalizePriceAreaBox(single.priceArea, text),
        x: clamp(Number(sourceBox.x || 0) + dxPct, bounds.minX, bounds.maxX),
        y: clamp(Number(sourceBox.y || 0) + dyPct, bounds.minY, bounds.maxY)
      }, text);
    } else if (key === "priceTextOffset") {
      const text = state.draft.config?.text || {};
      const editorBoxes = ensureEditorBoxes(single);
      const sourceBox = getPriceTextEditorBox({ ...single, _editorBoxes: { ...editorBoxes, priceTextOffset: state.drag.source } }, text);
      const minVisibleW = Math.max(2, Math.min(Number(sourceBox.w || 0), 8) * 0.5);
      const minVisibleH = Math.max(1.2, Math.min(Number(sourceBox.h || 0), 6) * 0.5);
      const bounds = getPreviewDragBounds(Number(sourceBox.w || 18), Number(sourceBox.h || 8), minVisibleW, minVisibleH);
      editorBoxes.priceTextOffset = {
        x: Number(clamp(Number(sourceBox.x || 0) + dxPct, bounds.minX, bounds.maxX).toFixed(2)),
        y: Number(clamp(Number(sourceBox.y || 0) + dyPct, bounds.minY, bounds.maxY).toFixed(2)),
        w: Number(sourceBox.w || 18),
        h: Number(sourceBox.h || 8)
      };
      syncStoredPriceTextOffsetFromEditorBox(single, text);
    } else if (key === "indexPos" || key === "packagePos") {
      single[key].x = Number(clamp(Number(state.drag.source.x || 0) + dxPct, 0, 96).toFixed(2));
      single[key].y = Number(clamp(Number(state.drag.source.y || 0) + dyPct, 0, 96).toFixed(2));
    } else {
      const sourceWidth = Number(state.drag.source?.w || single[key]?.w || 0);
      const minX = Math.max(-96, (-sourceWidth + 4));
      single[key].x = Number(clamp(Number(state.drag.source.x || 0) + dxPct, minX, 96).toFixed(2));
      single[key].y = Number(clamp(Number(state.drag.source.y || 0) + dyPct, 0, 96).toFixed(2));
    }
    applyDraftToPreview();
    if (key === "priceTextOffset" && keepPriceTextOffsetVisible()) {
      applyDraftToPreview();
    }
    renderOverlayHandles();
  }

  function onGlobalPointerUp() {
    state.drag = null;
  }

  function buildStylePayloadFromDraft() {
    const nameValue = String(document.getElementById(NAME_ID)?.value || "").trim();
    if (!nameValue || !state.draft) return null;
    const freshDraft = captureDraftFromPreview();
    if (freshDraft?.config) {
      state.draft.config = freshDraft.config;
    }
    const nextConfig = cloneJson(state.draft.config);
    if (!nextConfig.text || typeof nextConfig.text !== "object") nextConfig.text = {};
    nextConfig.text.priceScaleMultiplier = measureDisplayedPriceScaleMultiplier();
    return {
      id: slugify(nameValue),
      label: nameValue,
      config: nextConfig
    };
  }

  async function saveCurrentStyle() {
    const payload = buildStylePayloadFromDraft();
    if (!payload || !payload.id) {
      window.showAppToast?.("Podaj nazwę stylu.", "error");
      return;
    }
    registerStyle(payload);
    let saved = loadSavedStyles();
    if (state.remoteReady) {
      try {
        saved = mergeSavedStylesLists(await loadSavedStylesFromRemote(), saved);
      } catch (_err) {}
    }
    const idx = saved.findIndex((item) => String(item?.id || "") === payload.id);
    if (idx >= 0) saved[idx] = payload;
    else saved.push(payload);
    saveSavedStyles(saved);
    try {
      await saveSavedStylesToRemote(saved);
      state.remoteReady = true;
    } catch (err) {
      console.error("Nie udało się zapisać styles/styles.json do Firebase Storage:", err);
      window.showAppToast?.(`Styl zapisany lokalnie, ale nie udało się wysłać do Firebase: ${String(err?.message || err)}`, "error");
      window.refreshStylWlasnyModuleLayoutOptions?.(payload.id);
      const failedSelect = getSelect();
      if (failedSelect) {
        failedSelect.value = payload.id;
        failedSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      updateJsonOutput();
      return;
    }
    window.refreshStylWlasnyModuleLayoutOptions?.(payload.id);
    const select = getSelect();
    if (select) {
      select.value = payload.id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    updateJsonOutput();
    window.showAppToast?.(`Zapisano styl: ${payload.label}`, "success");
  }

  function ensureCreatorUi() {
    ensureCreatorThemeStyles();
    const modal = document.getElementById("customStyleModal");
    const card = getPreviewCard();
    const select = getSelect();
    if (!modal || !card || !select) return;
    bindDirectPreviewSelection();

    if (!document.getElementById(BTN_ID)) {
      const target = document.getElementById("customApplyStyleToImportedBtn");
      const btn = document.createElement("button");
      btn.id = BTN_ID;
      btn.type = "button";
      btn.textContent = "Stwórz własny styl";
      btn.style.cssText = "border:1px solid #334155;background:#fff;color:#0f172a;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;";
      btn.onclick = () => toggleCreator();
      if (target && target.parentNode) target.parentNode.insertBefore(btn, target);
    }

    if (!getPanel()) {
      const metaFontOptions = buildFontOptionsMarkup(getMetaFontSelect());
      const priceFontOptions = buildFontOptionsMarkup(getPriceFontSelect());
      const paletteMarkup = buildElementPaletteMarkup();
      const panel = document.createElement("div");
      panel.id = PANEL_ID;
      panel.style.cssText = "display:none;margin:8px 0 10px 0;padding:10px;border:1px solid #d7dfec;border-radius:10px;background:#fff;";
      panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
          <div class="custom-style-creator-title" style="font-size:11px;font-weight:800;color:#0f172a;">Kreator layoutu produktu</div>
          <button id="customStyleCreatorCaptureBtn" type="button" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;">Załaduj z podglądu</button>
        </div>
        <div class="custom-style-creator-note" style="font-size:10px;color:#64748b;line-height:1.4;margin-bottom:12px;">
          Budujesz layout od zera: wybierasz element z listy, przesuwasz go po gridzie, a każda zmiana pozycji i skali trafia od razu do JSON. Badge i cena są osobnymi warstwami.
        </div>
        <div class="custom-style-creator-layout">
          <div class="custom-style-creator-sidebar">
            <section class="custom-style-creator-block">
              <div class="custom-style-creator-block-title">Elementy layoutu</div>
              <div class="custom-style-creator-block-note" style="margin-bottom:8px;">Kliknij element, żeby od razu edytować go na podglądzie.</div>
              <div id="${PALETTE_ID}" class="custom-style-creator-palette">${paletteMarkup}</div>
              <select id="${ELEMENT_SELECT_ID}" style="display:none;">
                ${HANDLE_DEFS.map((item) => `<option value="${item.key}">${item.label}</option>`).join("")}
              </select>
            </section>
            <section class="custom-style-creator-block">
              <div class="custom-style-creator-block-title">Pozycja i rozmiar</div>
              <div id="${METRICS_ID}" class="custom-style-creator-metrics"></div>
            </section>
          </div>
          <div class="custom-style-creator-main">
            <section class="custom-style-creator-block">
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <input id="${NAME_ID}" type="text" placeholder="Nazwa stylu" style="flex:1 1 220px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;font-size:11px;">
                <button id="customStyleCreatorSaveBtn" type="button" style="border:1px solid #0b8f84;background:#0fb5a8;color:#fff;border-radius:8px;padding:8px 12px;font-size:10px;font-weight:800;cursor:pointer;">Zapisz styl</button>
              </div>
            </section>
            <section class="custom-style-creator-block">
              <div class="custom-style-creator-block-title">Sterowanie zaznaczonym elementem</div>
              <div class="custom-style-creator-section-grid custom-style-creator-section-grid--wide" style="margin-bottom:8px;">
                <button id="customStyleCreatorSmallerBtn" type="button" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:700;cursor:pointer;">Mniejszy</button>
                <button id="customStyleCreatorBiggerBtn" type="button" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:700;cursor:pointer;">Większy</button>
                <button id="customStyleCreatorNarrowerBtn" type="button" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:700;cursor:pointer;">Węższy</button>
                <button id="customStyleCreatorWiderBtn" type="button" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:700;cursor:pointer;">Szerszy</button>
                <button id="customStyleCreatorShorterBtn" type="button" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:700;cursor:pointer;">Niższy</button>
                <button id="customStyleCreatorTallerBtn" type="button" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:700;cursor:pointer;">Wyższy</button>
                <button id="customStyleCreatorToggleBtn" type="button" style="border:1px solid #ef4444;background:#fff;color:#b91c1c;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:700;cursor:pointer;">Ukryj / Przywróć</button>
              </div>
              <div class="custom-style-creator-block-note">Grid na podglądzie pokazuje pozycję. Każdy drag i resize aktualizuje JSON automatycznie.</div>
            </section>
            <section class="custom-style-creator-block">
              <div class="custom-style-creator-block-title">Teksty i cena</div>
              <div class="custom-style-creator-section-grid" style="margin-bottom:8px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;border:1px solid #d7dfec;border-radius:10px;padding:8px 10px;">
                  Czcionka tekstów
                  <select id="${META_FONT_ID}" style="margin-left:auto;min-width:132px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:10px;color:#0f172a;">
                    ${metaFontOptions}
                  </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;border:1px solid #d7dfec;border-radius:10px;padding:8px 10px;">
                  Czcionka ceny
                  <select id="${PRICE_FONT_ID}" style="margin-left:auto;min-width:132px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:10px;color:#0f172a;">
                    ${priceFontOptions}
                  </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;border:1px solid #d7dfec;border-radius:10px;padding:8px 10px;">
                  Kolor ceny
                  <input id="${PRICE_COLOR_ID}" type="color" value="#d71920" style="margin-left:auto;width:24px;height:20px;padding:0;border:none;background:transparent;cursor:pointer;">
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;border:1px solid #d7dfec;border-radius:10px;padding:8px 10px;">
                  Tło badge
                  <input id="${PRICE_BG_COLOR_ID}" type="color" value="#d71920" style="margin-left:auto;width:24px;height:20px;padding:0;border:none;background:transparent;cursor:pointer;">
                </label>
              </div>
            </section>
            <section class="custom-style-creator-block">
              <div class="custom-style-creator-block-title">Badge, indeks i dodatki</div>
              <div class="custom-style-creator-section-grid" style="margin-bottom:8px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;border:1px solid #d7dfec;border-radius:10px;padding:8px 10px;">
                  Badge
                  <select id="${PRICE_SHAPE_ID}" style="margin-left:auto;min-width:108px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:10px;color:#0f172a;">
                    <option value="circle">Koło</option>
                    <option value="roundedRect">Prostokąt</option>
                    <option value="none">Brak tła</option>
                  </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;border:1px solid #d7dfec;border-radius:10px;padding:8px 10px;">
                  Ukryj badge
                  <input id="${NO_CIRCLE_ID}" type="checkbox" style="margin-left:auto;">
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;border:1px solid #d7dfec;border-radius:10px;padding:8px 10px;">
                  Kolor indeksu
                  <input id="${INDEX_COLOR_ID}" type="color" value="#b9b9b9" style="margin-left:auto;width:24px;height:20px;padding:0;border:none;background:transparent;cursor:pointer;">
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;border:1px solid #d7dfec;border-radius:10px;padding:8px 10px;">
                  Kolor opak.
                  <input id="${PACKAGE_COLOR_ID}" type="color" value="#334155" style="margin-left:auto;width:24px;height:20px;padding:0;border:none;background:transparent;cursor:pointer;">
                </label>
              </div>
            </section>
            <section class="custom-style-creator-block">
              <div class="custom-style-creator-block-title">JSON layoutu</div>
              <textarea id="${JSON_ID}" spellcheck="false" style="width:100%;min-height:220px;border:1px solid #d7dfec;border-radius:10px;padding:10px;font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;background:#f8fafc;color:#0f172a;"></textarea>
            </section>
          </div>
        </div>
      `;
      card.parentNode.insertBefore(panel, card);

      document.getElementById("customStyleCreatorCaptureBtn")?.addEventListener("click", () => {
        state.draft = captureDraftFromPreview();
        captureBasePriceMetrics();
        state.sourceStyleId = getCurrentStyleId();
        const currentLabel = getCurrentStyleMeta()?.label || "";
        const nameInput = document.getElementById(NAME_ID);
        if (nameInput && !nameInput.value.trim()) nameInput.value = `${currentLabel} kopia`;
        applyDraftToPreview();
        renderOverlayHandles();
        scheduleCreatorOverlayStabilization();
      });
      document.getElementById("customStyleCreatorSaveBtn")?.addEventListener("click", saveCurrentStyle);
      document.getElementById(ELEMENT_SELECT_ID)?.addEventListener("change", (event) => {
        state.selectedKey = String(event.target?.value || "priceArea");
        refreshElementPaletteSelection();
        renderOverlayHandles();
      });
      document.querySelectorAll("#" + PALETTE_ID + " [data-creator-select]")?.forEach((button) => {
        button.addEventListener("click", () => {
          const key = String(button.getAttribute("data-creator-select") || "priceArea");
          state.selectedKey = key;
          const elementSelect = document.getElementById(ELEMENT_SELECT_ID);
          if (elementSelect) elementSelect.value = key;
          syncControlValues();
          renderOverlayHandles();
        });
      });
      document.getElementById(META_FONT_ID)?.addEventListener("change", (event) => {
        if (!state.draft) return;
        state.draft.config.text = state.draft.config.text || {};
        state.draft.config.text.metaFontFamily = String(event.target?.value || "Arial");
        applyDraftToPreview();
        renderOverlayHandles();
      });
      document.getElementById(PRICE_FONT_ID)?.addEventListener("change", (event) => {
        if (!state.draft) return;
        state.draft.config.text = state.draft.config.text || {};
        state.draft.config.text.priceFontFamily = String(event.target?.value || "Arial");
        applyDraftToPreview();
        renderOverlayHandles();
      });
      document.getElementById("customStyleCreatorSmallerBtn")?.addEventListener("click", () => resizeSelected(-2));
      document.getElementById("customStyleCreatorBiggerBtn")?.addEventListener("click", () => resizeSelected(2));
      document.getElementById("customStyleCreatorNarrowerBtn")?.addEventListener("click", () => resizeSelected(-2, "x"));
      document.getElementById("customStyleCreatorWiderBtn")?.addEventListener("click", () => resizeSelected(2, "x"));
      document.getElementById("customStyleCreatorShorterBtn")?.addEventListener("click", () => resizeSelected(-2, "y"));
      document.getElementById("customStyleCreatorTallerBtn")?.addEventListener("click", () => resizeSelected(2, "y"));
      document.getElementById("customStyleCreatorToggleBtn")?.addEventListener("click", toggleSelectedVisibility);
      document.getElementById(PRICE_COLOR_ID)?.addEventListener("input", (event) => {
        if (!state.draft) return;
        state.draft.config.text = state.draft.config.text || {};
        state.draft.config.text.priceColor = String(event.target?.value || "#d71920");
        applyDraftToPreview();
        renderOverlayHandles();
      });
      document.getElementById(INDEX_COLOR_ID)?.addEventListener("input", (event) => {
        if (!state.draft) return;
        state.draft.config.text = state.draft.config.text || {};
        state.draft.config.text.indexColor = String(event.target?.value || "#b9b9b9");
        applyDraftToPreview();
        renderOverlayHandles();
      });
      document.getElementById(PACKAGE_COLOR_ID)?.addEventListener("input", (event) => {
        if (!state.draft) return;
        state.draft.config.text = state.draft.config.text || {};
        state.draft.config.text.packageColor = String(event.target?.value || "#334155");
        applyDraftToPreview();
        renderOverlayHandles();
      });
      document.getElementById(PRICE_BG_COLOR_ID)?.addEventListener("input", (event) => {
        if (!state.draft) return;
        state.draft.config.text = state.draft.config.text || {};
        state.draft.config.text.priceBgColor = String(event.target?.value || "#d71920");
        applyDraftToPreview();
        renderOverlayHandles();
      });
      document.getElementById(NO_CIRCLE_ID)?.addEventListener("change", (event) => {
        if (!state.draft) return;
        preserveCurrentPriceTextBox(state.draft.config.singleDirect, state.draft.config?.text || {});
        state.draft.config.text = state.draft.config.text || {};
        state.draft.config.text.hidePriceBadge = !!event.target?.checked;
        state.draft.config.text.noPriceCircle = !!event.target?.checked;
        state.draft.config.text.priceShape = state.draft.config.text.hidePriceBadge
          ? "none"
          : (String(state.draft.config.text.priceShape || "circle") === "roundedRect" ? "roundedRect" : "circle");
        syncControlValues();
        applyDraftToPreview();
        renderOverlayHandles();
      });
      document.getElementById(PRICE_SHAPE_ID)?.addEventListener("change", (event) => {
        if (!state.draft) return;
        preserveCurrentPriceTextBox(state.draft.config.singleDirect, state.draft.config?.text || {});
        const nextShape = String(event.target?.value || "circle");
        state.draft.config.text = state.draft.config.text || {};
        state.draft.config.text.hidePriceBadge = nextShape === "none";
        state.draft.config.text.noPriceCircle = nextShape === "none";
        state.draft.config.text.priceShape = nextShape;
        if (nextShape === "roundedRect") {
          state.draft.config.singleDirect.priceArea.w = Number(state.draft.config.singleDirect.priceArea.w || 24);
          state.draft.config.singleDirect.priceArea.h = Number(state.draft.config.singleDirect.priceArea.h || 12);
          state.draft.config.singleDirect.priceArea.s = Number(state.draft.config.singleDirect.priceArea.w || 24);
        } else if (nextShape === "circle") {
          const base = Number(state.draft.config.singleDirect.priceArea.s || state.draft.config.singleDirect.priceArea.w || 16);
          state.draft.config.singleDirect.priceArea.s = base;
          state.draft.config.singleDirect.priceArea.w = base;
          state.draft.config.singleDirect.priceArea.h = base;
        }
        applyDraftToPreview();
        renderOverlayHandles();
      });
    }

    const host = ensureCreatorHost();
    const panel = getPanel();
    if (host && panel && panel.parentNode !== host) {
      host.appendChild(panel);
    }

    if (!getOverlay()) {
      card.style.position = "relative";
      const overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.style.cssText = "display:none;position:absolute;inset:0;z-index:20;pointer-events:none;";
      card.appendChild(overlay);
    }

    decorateCreatorUi();
  }

  function openCreator() {
    ensureCreatorUi();
    const panel = getPanel();
    const overlay = getOverlay();
    if (!panel || !overlay) return;
    state.active = true;
    panel.style.display = "block";
    overlay.style.display = "block";
    state.draft = captureDraftFromPreview();
    captureBasePriceMetrics();
    state.sourceStyleId = getCurrentStyleId();
    const currentLabel = getCurrentStyleMeta()?.label || "";
    const nameInput = document.getElementById(NAME_ID);
    if (nameInput && !nameInput.value.trim()) nameInput.value = `${currentLabel} kopia`;
    syncControlValues();
    applyDraftToPreview();
    renderOverlayHandles();
    scheduleCreatorOverlayStabilization();
    updateSelectedElementMetrics();
  }

  function closeCreator() {
    state.active = false;
    state.drag = null;
    const panel = getPanel();
    const overlay = getOverlay();
    if (panel) panel.style.display = "none";
    if (overlay) {
      overlay.style.display = "none";
      overlay.style.backgroundImage = "none";
    }
    restorePriceTextToBadge();
    const select = getSelect();
    if (select) select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function toggleCreator() {
    if (state.active) closeCreator();
    else openCreator();
  }

  function initObserver() {
    const observer = new MutationObserver(() => {
      ensureCreatorUi();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener("mousemove", onGlobalPointerMove, true);
  window.addEventListener("mouseup", onGlobalPointerUp, true);
  window.addEventListener("customStylePreviewRendered", () => {
    if (!state.active) return;
    const currentStyleId = getCurrentStyleId();
    if (!state.draft || String(currentStyleId || "") !== String(state.sourceStyleId || "")) {
      reloadDraftFromCurrentPreview();
      return;
    }
    applyDraftToPreview();
    renderOverlayHandles();
  });

  window.CustomStyleCreatorUI = {
    open: openCreator,
    close: closeCreator,
    toggle: toggleCreator,
    refresh: () => {
      ensureCreatorUi();
      if (state.active) {
        reloadDraftFromCurrentPreview();
      }
    }
  };

  registerSavedStylesFromStorage();
  syncSavedStylesFromRemote();
  initObserver();
  ensureCreatorUi();
})();

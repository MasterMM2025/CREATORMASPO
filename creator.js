(function () {
  const state = {
    selectedOption: "classic"
  };

  const labels = {
    classic: "Katalog klasyczny",
    pro: "Katalog profesjonalny"
  };

  const modal = document.getElementById("creatorChoiceModal");
  const openButton = document.getElementById("openCreatorModalBtn");
  const closeButton = document.getElementById("closeCreatorModalBtn");
  const cancelButton = document.getElementById("cancelCreatorModalBtn");
  const confirmButton = document.getElementById("confirmCreatorModalBtn");
  const feedback = document.getElementById("creatorFeedback");
  const optionButtons = Array.from(document.querySelectorAll(".creator-option"));
  const sourceOptionButtons = Array.from(document.querySelectorAll(".creator-source-option"));
  const detailsModal = document.getElementById("creatorDetailsModal");
  const closeDetailsModalBtn = document.getElementById("closeDetailsModalBtn");
  const continueSourceModalBtn = document.getElementById("continueSourceModalBtn");
  const sourceFeedback = document.getElementById("creatorSourceFeedback");
  const excelModal = document.getElementById("creatorExcelModal");
  const closeExcelModalBtn = document.getElementById("closeExcelModalBtn");
  const backToSourceModalBtn = document.getElementById("backToSourceModalBtn");
  const excelImportPanel = document.getElementById("creatorExcelImportPanel");
  const excelFileInput = document.getElementById("creatorExcelFileInput");
  const excelFileLabel = document.getElementById("creatorExcelFileLabel");
  const excelImportBtn = document.getElementById("creatorExcelImportBtn");
  const excelFeedback = document.getElementById("creatorExcelFeedback");
  const excelStats = document.getElementById("creatorExcelStats");
  const showProductsBtn = document.getElementById("creatorShowProductsBtn");
  const continueToImagesBtn = document.getElementById("creatorContinueToImagesBtn");
  const catalogPreviewList = document.getElementById("creatorCatalogPreviewList");
  const catalogProgressValue = document.getElementById("creatorCatalogProgressValue");
  const catalogProgressBar = document.getElementById("creatorCatalogProgressBar");
  const catalogProgressLabel = document.getElementById("creatorCatalogProgressLabel");
  const imagesModal = document.getElementById("creatorImagesModal");
  const closeImagesModalBtn = document.getElementById("closeImagesModalBtn");
  const backToExcelModalBtn = document.getElementById("backToExcelModalBtn");
  const imagesImportPanel = document.getElementById("creatorImagesImportPanel");
  const imagesFileInput = document.getElementById("creatorImagesFileInput");
  const imagesFileLabel = document.getElementById("creatorImagesFileLabel");
  const imagesImportBtn = document.getElementById("creatorImagesImportBtn");
  const imagesFeedback = document.getElementById("creatorImagesFeedback");
  const continueToLayoutBtn = document.getElementById("creatorContinueToLayoutBtn");
  const imagesCatalogPreviewList = document.getElementById("creatorImagesCatalogPreviewList");
  const imagesCatalogProgressValue = document.getElementById("creatorImagesCatalogProgressValue");
  const imagesCatalogProgressBar = document.getElementById("creatorImagesCatalogProgressBar");
  const imagesCatalogProgressLabel = document.getElementById("creatorImagesCatalogProgressLabel");
  const layoutModal = document.getElementById("creatorLayoutModal");
  const closeLayoutModalBtn = document.getElementById("closeLayoutModalBtn");
  const backToImagesModalBtn = document.getElementById("backToImagesModalBtn");
  const layoutOptionsHost = document.getElementById("creatorLayoutOptions");
  const layoutFeedback = document.getElementById("creatorLayoutFeedback");
  const layoutCatalogPreviewList = document.getElementById("creatorLayoutCatalogPreviewList");
  const layoutCatalogProgressValue = document.getElementById("creatorLayoutCatalogProgressValue");
  const layoutCatalogProgressBar = document.getElementById("creatorLayoutCatalogProgressBar");
  const layoutCatalogProgressLabel = document.getElementById("creatorLayoutCatalogProgressLabel");
  const continueToMagicBtn = document.getElementById("creatorContinueToMagicBtn");
  const magicModal = document.getElementById("creatorMagicModal");
  const closeMagicModalBtn = document.getElementById("closeMagicModalBtn");
  const backToLayoutModalBtn = document.getElementById("backToLayoutModalBtn");
  const magicWandBtn = document.getElementById("creatorMagicWandBtn");
  const magicSelectedStyle = document.getElementById("creatorMagicSelectedStyle");
  const magicFlavorLabel = document.getElementById("creatorMagicFlavorLabel");
  const magicFeedback = document.getElementById("creatorMagicFeedback");
  const magicCatalogPreviewList = document.getElementById("creatorMagicCatalogPreviewList");
  const magicCatalogProgressValue = document.getElementById("creatorMagicCatalogProgressValue");
  const magicCatalogProgressBar = document.getElementById("creatorMagicCatalogProgressBar");
  const magicCatalogProgressLabel = document.getElementById("creatorMagicCatalogProgressLabel");
  const sourceLabels = {
    excel: "Mam gotowy plik Excel",
    manual: "Tworzymy listę ręcznie"
  };
  const sourceState = {
    selected: "excel"
  };
  const excelState = {
    rows: [],
    activePage: null
  };
  const CUSTOM_STYLES_STORAGE_KEY = "styl_wlasny_custom_styles_v1";
  const LAST_SELECTED_MODULE_STYLE_STORAGE_KEY = "styl_wlasny_last_module_layout_style_v1";
  const LAYOUT_JSON_CANDIDATE_PATHS = [
    "styles/styles.json",
    "styles/styl-wlasny/module-layouts/styles.json"
  ];
  const LAYOUT_OPTION_META = {
    default: {
      chip: "Elegant",
      description: "Spokojny układ z większym obszarem zdjęcia i klasycznym rozłożeniem treści."
    },
    "styl-numer-1": {
      chip: "Direct",
      description: "Zdjęcie po lewej, pionowy separator i mocna treść po prawej stronie modułu."
    },
    "styl-numer-2": {
      chip: "Compact",
      description: "Bardziej kompaktowy układ z uporządkowanym blokiem ceny i zwartym rytmem."
    },
    "styl-numer-3": {
      chip: "Poster",
      description: "Układ bardziej ekspozycyjny, z większym miejscem na zdjęcie i opis pod spodem."
    }
  };
  const SYSTEM_LAYOUT_STYLE_FALLBACKS = [
    {
      id: "default",
      label: "Domyślny (styl elegancki)",
      config: {
        singleDirect: {
          imgArea: { x: 2.8, y: 16.5, w: 82, h: 37 },
          nameArea: { x: 35, y: 56, w: 38, h: 20 },
          indexPos: { x: 35, y: 67.8 },
          packagePos: { x: 35, y: 72.0 },
          flagArea: { x: 35, y: 78.8, w: 18, h: 2.6 },
          priceArea: { x: 3.5, y: 57, s: 24, w: 0, h: 0, r: 0 },
          barcodeArea: { x: 53, y: 79.2, w: 38, h: 11 },
          divider: { x: -1, y: 0, h: 0, w: 0.45 }
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
          metaFontFamily: "FactoTrial Bold",
          priceFontFamily: "FactoTrial Bold",
          nameColor: "",
          indexColor: "#b9b9b9",
          packageColor: "",
          indexItalic: true,
          metaScaleMultiplier: 1,
          noPriceCircle: false,
          priceColor: "",
          forcePriceBold: false,
          priceExtraBold: false,
          priceScaleMultiplier: 1,
          priceShape: "",
          priceBgColor: "",
          priceBgRadius: 0
        }
      }
    },
    {
      id: "styl-numer-1",
      label: "Styl numer 1",
      config: {
        singleDirect: {
          imgArea: { x: 12.5, y: 18.8, w: 62, h: 44 },
          nameArea: { x: 66.2, y: 20.8, w: 31.8, h: 29.5 },
          indexPos: { x: 66.2, y: 34.6 },
          packagePos: { x: 66.2, y: 38.6 },
          priceArea: { x: 66.2, y: 59.8, s: 14.8 },
          divider: { x: 63.6, y: 15.5, h: 58.5, w: 0.55 }
        },
        familyDirect: {
          useSingleLayout: true,
          imageLayouts: {
            family2: [
              { x: 0.4, y: 0.0, w: 0.62, h: 0.44 },
              { x: 0.4, y: 0.5, w: 0.62, h: 0.44 }
            ],
            family3: [
              { x: 0.4, y: 0.0, w: 0.62, h: 0.27 },
              { x: 0.4, y: 0.35, w: 0.62, h: 0.27 },
              { x: 0.4, y: 0.7, w: 0.62, h: 0.27 }
            ],
            family4: [
              { x: 0.4, y: 0.0, w: 0.62, h: 0.2 },
              { x: 0.4, y: 0.26, w: 0.62, h: 0.2 },
              { x: 0.4, y: 0.52, w: 0.62, h: 0.2 },
              { x: 0.4, y: 0.78, w: 0.62, h: 0.2 }
            ]
          }
        },
        text: {
          metaFontFamily: "Google Sans Flex",
          priceFontFamily: "Google Sans Flex",
          nameWeight: "700",
          indexWeight: "700",
          packageWeight: "700",
          priceMainWeight: "900",
          priceDecWeight: "800",
          priceUnitWeight: "800",
          nameColor: "#111111",
          indexColor: "#b9b9b9",
          packageColor: "#111111",
          indexItalic: false,
          metaScaleMultiplier: 1.12,
          noPriceCircle: true,
          priceColor: "#d71920",
          forcePriceBold: true,
          priceExtraBold: false,
          priceScaleMultiplier: 1.48,
          priceShape: "",
          priceBgColor: "",
          priceBgRadius: 0
        }
      }
    },
    {
      id: "styl-numer-2",
      label: "Styl numer 2",
      config: {
        singleDirect: {
          imgArea: { x: 10.0, y: 16.0, w: 62.5, h: 50.0 },
          nameArea: { x: 66.5, y: 22.0, w: 30.0, h: 22.0 },
          indexPos: { x: 66.5, y: 36.2 },
          packagePos: { x: 66.5, y: 39.8 },
          priceArea: { x: 66.5, y: 50.8, w: 24.0, h: 11.5, r: 2.2 },
          divider: { x: -1, y: 0, h: 0, w: 0 }
        },
        familyDirect: {
          useSingleLayout: true,
          imageLayouts: {
            family2: [
              { x: 0.5, y: 0.0, w: 0.72, h: 0.43 },
              { x: 0.5, y: 0.47, w: 0.72, h: 0.43 }
            ],
            family3: [
              { x: 0.5, y: 0.0, w: 0.72, h: 0.3 },
              { x: 0.5, y: 0.34, w: 0.72, h: 0.3 },
              { x: 0.5, y: 0.68, w: 0.72, h: 0.3 }
            ],
            family4: [
              { x: 0.5, y: 0.0, w: 0.72, h: 0.22 },
              { x: 0.5, y: 0.26, w: 0.72, h: 0.22 },
              { x: 0.5, y: 0.52, w: 0.72, h: 0.22 },
              { x: 0.5, y: 0.78, w: 0.72, h: 0.22 }
            ]
          }
        },
        text: {
          nameColor: "#151515",
          indexColor: "#9ca3af",
          packageColor: "#151515",
          indexItalic: false,
          metaScaleMultiplier: 1,
          noPriceCircle: false,
          priceShape: "roundedRect",
          priceBgColor: "#2eaee8",
          priceBgRadius: 2.2,
          forcePriceBold: true,
          priceColor: "#ffffff",
          priceExtraBold: false,
          priceScaleMultiplier: 1.08
        }
      }
    },
    {
      id: "styl-numer-3",
      label: "Styl numer 3",
      config: {
        singleDirect: {
          imgArea: { x: 4.0, y: 5.0, w: 92.0, h: 48.0 },
          priceArea: { x: 17.5, y: 55.0, s: 17.0 },
          nameArea: { x: 18.0, y: 76.0, w: 76.0, h: 12.8 },
          indexPos: { x: 18.0, y: 88.8 },
          packagePos: { x: 18.0, y: 93.0 },
          flagArea: { x: 0, y: 0, w: 0, h: 0 },
          barcodeArea: { x: 0, y: 0, w: 0, h: 0 },
          divider: { x: -1, y: 0, h: 0, w: 0 }
        },
        familyDirect: {
          useSingleLayout: true,
          imageLayouts: {
            family2: [
              { x: 0.02, y: 0.0, w: 0.46, h: 1.0 },
              { x: 0.52, y: 0.0, w: 0.46, h: 1.0 }
            ],
            family3: [
              { x: 0.01, y: 0.0, w: 0.31, h: 1.0 },
              { x: 0.345, y: 0.0, w: 0.31, h: 1.0 },
              { x: 0.68, y: 0.0, w: 0.31, h: 1.0 }
            ],
            family4: [
              { x: 0.06, y: 0.0, w: 0.4, h: 0.48 },
              { x: 0.54, y: 0.0, w: 0.4, h: 0.48 },
              { x: 0.06, y: 0.52, w: 0.4, h: 0.48 },
              { x: 0.54, y: 0.52, w: 0.4, h: 0.48 }
            ]
          }
        },
        text: {
          nameColor: "#123d85",
          indexColor: "#b9b9b9",
          packageColor: "#123d85",
          indexItalic: true,
          metaScaleMultiplier: 1,
          noPriceCircle: true,
          priceColor: "#0b4aa2",
          forcePriceBold: true,
          priceExtraBold: true,
          priceScaleMultiplier: 1.35,
          priceShape: "",
          priceBgColor: "",
          priceBgRadius: 0
        }
      }
    }
  ];
  const magicLayoutProfiles = [
    { id: "balanced-tight", label: "Balanced Tight" },
    { id: "balanced-airy", label: "Balanced Airy" },
    { id: "dense-grid", label: "Dense Grid" },
    { id: "editorial-sweep", label: "Editorial Sweep" },
    { id: "minimal-premium", label: "Minimal Premium" },
    { id: "showcase", label: "Showcase" }
  ];
  let layoutOptions = buildLayoutOptionsFromStyleDefinitions(SYSTEM_LAYOUT_STYLE_FALLBACKS);
  let layoutStylesReadyPromise = null;
  const previewState = {
    stage: "excel",
    currentProgress: 0,
    imageStatus: "idle",
    selectedLayoutId: loadRememberedLayoutStyleId(),
    magicProfileId: "balanced-tight",
    lastMagicLayoutId: "",
    magicLayoutPreset: null,
    magicLayoutHistory: [],
    magicLayoutContextKey: ""
  };
  const imageState = {
    objectUrls: [],
    importRunId: 0
  };
  let progressTimer = null;
  let previewHydrationFrame = 0;
  const PREVIEW_MODULE_BASE_WIDTH = 150;
  const PREVIEW_MODULE_BASE_HEIGHT = 96;
  const OPTION_PREVIEW_BASE_WIDTH = 86;
  const OPTION_PREVIEW_BASE_HEIGHT = 72;
  const CUSTOM_STYLE_CARD_BASE_WIDTH = 500;
  const CUSTOM_STYLE_CARD_BASE_HEIGHT = 362;
  const MAGIC_PREVIEW_PAGE_WIDTH = 2100;
  const MAGIC_PREVIEW_PAGE_HEIGHT = 2970;
  const MAGIC_PREVIEW_MAX_ROWS = 6;

  function cloneJson(value) {
    try {
      return JSON.parse(JSON.stringify(value || {}));
    } catch (_err) {
      return {};
    }
  }

  function loadRememberedLayoutStyleId() {
    try {
      const stored = String(localStorage.getItem(LAST_SELECTED_MODULE_STYLE_STORAGE_KEY) || "").trim();
      return stored || "styl-numer-1";
    } catch (_err) {
      return "styl-numer-1";
    }
  }

  function saveRememberedLayoutStyleId(styleId) {
    try {
      const safe = String(styleId || "").trim();
      if (!safe) return;
      localStorage.setItem(LAST_SELECTED_MODULE_STYLE_STORAGE_KEY, safe);
    } catch (_err) {}
  }

  function toFiniteNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatPercent(value, fallback) {
    const safe = toFiniteNumber(value, fallback);
    return `${safe}%`;
  }

  function formatPixels(value, fallback) {
    const safe = toFiniteNumber(value, fallback);
    return `${Math.round(safe)}px`;
  }

  function percentToPreviewPixels(percent, axis) {
    const safePercent = clamp(toFiniteNumber(percent, 0), 0, 100);
    const base = axis === "y" ? PREVIEW_MODULE_BASE_HEIGHT : PREVIEW_MODULE_BASE_WIDTH;
    return Math.max(0, Math.round((safePercent / 100) * base));
  }

  function percentToOptionPreviewPixels(percent, axis) {
    const safePercent = clamp(toFiniteNumber(percent, 0), 0, 100);
    const base = axis === "y" ? OPTION_PREVIEW_BASE_HEIGHT : OPTION_PREVIEW_BASE_WIDTH;
    return Math.max(0, Math.round((safePercent / 100) * base));
  }

  function extractLayoutStyleList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && Array.isArray(payload.styles)) {
      return payload.styles;
    }
    return [];
  }

  function normalizeLayoutStyleList(list) {
    return (Array.isArray(list) ? list : [])
      .map(function (item) {
        const id = String(item && item.id || "").trim();
        const label = String(item && item.label || "").trim();
        const config = item && item.config && typeof item.config === "object"
          ? cloneJson(item.config)
          : {};
        if (!id || !label) return null;
        return { id: id, label: label, config: config };
      })
      .filter(Boolean);
  }

  function mergeLayoutStyleLists(primary, secondary) {
    const merged = [];
    const byId = new Map();
    normalizeLayoutStyleList([].concat(secondary || [], primary || [])).forEach(function (item) {
      const id = String(item.id || "").trim();
      if (!id) return;
      if (byId.has(id)) {
        merged[byId.get(id)] = item;
        return;
      }
      byId.set(id, merged.length);
      merged.push(item);
    });
    return merged;
  }

  function normalizeStyleIdLabel(value) {
    return String(value || "")
      .replace(/^styl[-_\s]*/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
  }

  function inferLayoutChip(styleDef) {
    const meta = LAYOUT_OPTION_META[String(styleDef && styleDef.id || "").trim()];
    if (meta && meta.chip) return meta.chip;
    const spec = getLayoutPreviewSpec(styleDef);
    if (spec.text.hidePrice || spec.text.hidePriceBadge || spec.text.noPriceCircle) return "Text";
    if (spec.text.priceShape === "roundedRect") return "Badge";
    if (spec.imgArea.w >= 88 && spec.imgArea.y <= 8) return "Poster";
    if (spec.divider.w > 0 && spec.divider.h > 0 && spec.divider.x >= 0) return "Direct";
    if (spec.imgArea.w >= 76) return "Focus";
    return "Custom";
  }

  function inferLayoutDescription(styleDef) {
    const meta = LAYOUT_OPTION_META[String(styleDef && styleDef.id || "").trim()];
    if (meta && meta.description) return meta.description;
    const spec = getLayoutPreviewSpec(styleDef);
    const parts = [];
    if (spec.imgArea.w >= 88 && spec.imgArea.y <= 8) {
      parts.push("Duże zdjęcie u góry");
    } else if (spec.divider.w > 0 && spec.divider.h > 0 && spec.divider.x >= 0) {
      parts.push("Zdjęcie i treść rozdzielone pionową linią");
    } else if (spec.imgArea.x <= 8 && spec.priceArea.x <= 20) {
      parts.push("Zdjęcie szeroko po lewej z ceną pod spodem");
    } else {
      parts.push("Układ zdefiniowany w stylu własnym");
    }
    if (spec.text.priceShape === "roundedRect") {
      parts.push("cena w prostokątnej belce");
    } else if (spec.text.hidePriceBadge || spec.text.noPriceCircle) {
      parts.push("cena bez badge");
    } else {
      parts.push("cena w badge");
    }
    return parts.join(", ") + ".";
  }

  function buildLayoutOptionsFromStyleDefinitions(styleDefs) {
    return normalizeLayoutStyleList(styleDefs).map(function (styleDef) {
      const fallbackName = normalizeStyleIdLabel(styleDef.id) || "Styl";
      return {
        id: styleDef.id,
        label: styleDef.label || fallbackName,
        chip: inferLayoutChip(styleDef),
        description: inferLayoutDescription(styleDef),
        config: cloneJson(styleDef.config)
      };
    });
  }

  function loadLayoutStylesFromLocalStorage() {
    try {
      const raw = localStorage.getItem(CUSTOM_STYLES_STORAGE_KEY);
      return normalizeLayoutStyleList(extractLayoutStyleList(JSON.parse(raw || "[]")));
    } catch (_err) {
      return [];
    }
  }

  async function loadLayoutStylesFromJsonPaths() {
    for (const path of LAYOUT_JSON_CANDIDATE_PATHS) {
      try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) continue;
        const payload = await response.json();
        const list = normalizeLayoutStyleList(extractLayoutStyleList(payload));
        if (list.length) return list;
      } catch (_err) {}
    }
    return [];
  }

  function syncPreviewLayoutSelection() {
    const ids = new Set(layoutOptions.map(function (item) {
      return String(item && item.id || "").trim();
    }).filter(Boolean));
    if (!ids.size) return;
    if (!ids.has(previewState.selectedLayoutId)) {
      previewState.selectedLayoutId = ids.has("styl-numer-1")
        ? "styl-numer-1"
        : (ids.has("default") ? "default" : layoutOptions[0].id);
      saveRememberedLayoutStyleId(previewState.selectedLayoutId);
    }
  }

  async function ensureCreatorLayoutStylesReady() {
    if (!layoutStylesReadyPromise) {
      layoutStylesReadyPromise = (async function () {
        const localStyles = loadLayoutStylesFromLocalStorage();
        const jsonStyles = await loadLayoutStylesFromJsonPaths();
        const merged = mergeLayoutStyleLists(localStyles, mergeLayoutStyleLists(jsonStyles, SYSTEM_LAYOUT_STYLE_FALLBACKS));
        layoutOptions = buildLayoutOptionsFromStyleDefinitions(merged);
        syncPreviewLayoutSelection();
        previewState.magicProfileId = inferMagicProfileIdForStyle(getSelectedLayoutOption()).id;
        syncAllPreviewPanels();
        return layoutOptions;
      })();
    }
    try {
      return await layoutStylesReadyPromise;
    } catch (_err) {
      layoutStylesReadyPromise = null;
      return layoutOptions;
    }
  }

  function getLayoutPreviewSpec(styleLike) {
    const cfg = styleLike && styleLike.config && typeof styleLike.config === "object"
      ? styleLike.config
      : {};
    const single = cfg.singleDirect && typeof cfg.singleDirect === "object"
      ? cfg.singleDirect
      : {};
    const text = cfg.text && typeof cfg.text === "object"
      ? cfg.text
      : {};
    return {
      imgArea: {
        x: toFiniteNumber(single.imgArea && single.imgArea.x, 12.5),
        y: toFiniteNumber(single.imgArea && single.imgArea.y, 18.8),
        w: toFiniteNumber(single.imgArea && single.imgArea.w, 62),
        h: toFiniteNumber(single.imgArea && single.imgArea.h, 44)
      },
      nameArea: {
        x: toFiniteNumber(single.nameArea && single.nameArea.x, 66.2),
        y: toFiniteNumber(single.nameArea && single.nameArea.y, 20.8),
        w: toFiniteNumber(single.nameArea && single.nameArea.w, 31.8),
        h: toFiniteNumber(single.nameArea && single.nameArea.h, 28)
      },
      indexPos: {
        x: toFiniteNumber(single.indexPos && single.indexPos.x, 66.2),
        y: toFiniteNumber(single.indexPos && single.indexPos.y, 34.6)
      },
      packagePos: {
        x: toFiniteNumber(single.packagePos && single.packagePos.x, 66.2),
        y: toFiniteNumber(single.packagePos && single.packagePos.y, 38.6)
      },
      priceArea: {
        x: toFiniteNumber(single.priceArea && single.priceArea.x, 66.2),
        y: toFiniteNumber(single.priceArea && single.priceArea.y, 59.8),
        s: toFiniteNumber(single.priceArea && single.priceArea.s, 14.8),
        w: toFiniteNumber(single.priceArea && single.priceArea.w, 0),
        h: toFiniteNumber(single.priceArea && single.priceArea.h, 0),
        r: toFiniteNumber(single.priceArea && single.priceArea.r, 0)
      },
      divider: {
        x: toFiniteNumber(single.divider && single.divider.x, 63.6),
        y: toFiniteNumber(single.divider && single.divider.y, 15.5),
        h: toFiniteNumber(single.divider && single.divider.h, 58.5),
        w: toFiniteNumber(single.divider && single.divider.w, 0.55)
      },
      text: {
        metaFontFamily: String(text.metaFontFamily || "").trim(),
        priceFontFamily: String(text.priceFontFamily || "").trim(),
        nameWeight: String(text.nameWeight || "").trim(),
        indexWeight: String(text.indexWeight || "").trim(),
        packageWeight: String(text.packageWeight || "").trim(),
        priceMainWeight: String(text.priceMainWeight || "").trim(),
        priceDecWeight: String(text.priceDecWeight || "").trim(),
        priceUnitWeight: String(text.priceUnitWeight || "").trim(),
        nameColor: String(text.nameColor || "").trim() || "#121212",
        indexColor: String(text.indexColor || "").trim() || "#b8b8b8",
        packageColor: String(text.packageColor || "").trim() || "#18181b",
        dividerColor: String(text.dividerColor || "").trim() || "rgba(207, 207, 207, 0.92)",
        indexItalic: typeof text.indexItalic === "boolean" ? text.indexItalic : true,
        metaScaleMultiplier: clamp(toFiniteNumber(text.metaScaleMultiplier, 1), 0.6, 2.4),
        priceScaleMultiplier: clamp(toFiniteNumber(text.priceScaleMultiplier, 1), 0.6, 2.4),
        priceColor: String(text.priceColor || "").trim(),
        priceBgColor: String(text.priceBgColor || "").trim(),
        priceBgRadius: toFiniteNumber(text.priceBgRadius, 0),
        priceShape: String(text.priceShape || "").trim(),
        hidePriceBadge: !!text.hidePriceBadge,
        noPriceCircle: !!text.noPriceCircle,
        hideImage: !!text.hideImage,
        hideName: !!text.hideName,
        hideIndex: !!text.hideIndex,
        hidePackage: !!text.hidePackage,
        hidePrice: !!text.hidePrice,
        forcePriceBold: !!text.forcePriceBold,
        priceExtraBold: !!text.priceExtraBold
      }
    };
  }

  function styleHasDirectPreview(styleLike) {
    const cfg = styleLike && styleLike.config && typeof styleLike.config === "object"
      ? styleLike.config
      : {};
    return !!(cfg.singleDirect && typeof cfg.singleDirect === "object");
  }

  function buildInlineStyle(styleMap) {
    return Object.keys(styleMap || {}).map(function (key) {
      const value = styleMap[key];
      if (value == null || value === "") return "";
      return key + ":" + value;
    }).filter(Boolean).join(";");
  }

  function getPreviewStyleOptionById(styleId) {
    const safeId = String(styleId || "").trim();
    return layoutOptions.find(function (item) {
      return String(item && item.id || "").trim() === safeId;
    }) || layoutOptions[0] || null;
  }

  function getPreviewRowDisplayName(row) {
    const candidates = [
      row && row.name,
      row && row.productName,
      row && row.title,
      row && row.label,
      row && row.nazwa
    ];
    for (let i = 0; i < candidates.length; i += 1) {
      const safe = sanitizeEditableText(candidates[i]);
      if (safe) return safe;
    }
    return "Produkt" + (row && row.rowNo ? (" " + row.rowNo) : "");
  }

  function createPreviewSampleRow(option) {
    return {
      rowNo: String(option && option.id || "preview"),
      name: String(option && option.label || "Styl"),
      index: "29552",
      price: "12.99",
      packageValue: "1",
      packageUnit: "szt."
    };
  }

  function setNodeStyles(node, styles) {
    if (!node || !styles) return;
    Object.keys(styles).forEach(function (key) {
      if (styles[key] == null) return;
      node.style[key] = String(styles[key]);
    });
  }

  function createStyleNode(tagName, className, textContent) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (textContent != null) node.textContent = textContent;
    return node;
  }

  function appendPreviewImageContent(track, row) {
    const imageUrl = String(row && row.previewImageUrl || "").trim();
    if (imageUrl) {
      const img = createStyleNode("img", "creator-style-card__image");
      img.src = imageUrl;
      img.alt = getPreviewRowDisplayName(row) || "Zdjecie produktu";
      setNodeStyles(img, {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center center",
        display: "block",
        position: "relative",
        zIndex: "2",
        filter: "drop-shadow(0 14px 18px rgba(15, 23, 42, 0.14))"
      });
      track.appendChild(img);
      return;
    }

    const placeholder = createStyleNode("div", "creator-style-card__placeholder");
    setNodeStyles(placeholder, {
      width: "100%",
      height: "100%",
      border: "1px dashed #c4cfdb",
      borderRadius: "16px",
      background: "linear-gradient(180deg, #ffffff 0%, #f3f6fb 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "#94a3b8",
      fontSize: "20px",
      fontWeight: "700",
      letterSpacing: "0.08em",
      textAlign: "center"
    });
    placeholder.appendChild(createStyleNode("span", "", "BRAK"));
    placeholder.appendChild(createStyleNode("span", "", "ZDJECIA"));
    track.appendChild(placeholder);
  }

  function configurePreviewStyleCardPrice(cardNodes, row, spec, styleId) {
    const priceMode = getPreviewPriceMode(spec);
    const parts = getPreviewPriceParts(row && row.price);
    const priceScale = clamp(toFiniteNumber(spec && spec.text && spec.text.priceScaleMultiplier, 1), 0.6, 2.4);
    const textColor = getPreviewPriceTextColor(spec);
    const priceFont = getPreviewFontStack(spec && spec.text && spec.text.priceFontFamily);
    const baseCircleSize = Math.max(44, Math.round((toFiniteNumber(spec && spec.priceArea && spec.priceArea.s, 18) / 100) * CUSTOM_STYLE_CARD_BASE_WIDTH));
    const roundedWidth = Math.max(86, Math.round((toFiniteNumber(spec && spec.priceArea && spec.priceArea.w, 24) / 100) * CUSTOM_STYLE_CARD_BASE_WIDTH));
    const roundedHeight = Math.max(34, Math.round((toFiniteNumber(spec && spec.priceArea && spec.priceArea.h, 11.5) / 100) * CUSTOM_STYLE_CARD_BASE_HEIGHT));
    const roundedRadius = Math.max(8, Math.round((toFiniteNumber(spec && spec.text && spec.text.priceBgRadius, toFiniteNumber(spec && spec.priceArea && spec.priceArea.r, 2.2)) / 100) * CUSTOM_STYLE_CARD_BASE_WIDTH));
    const mainScaleBoost = String(styleId || "").trim() === "default" ? 1.05 : 1;
    const mainWeight = String(spec && spec.text && spec.text.priceMainWeight || "").trim()
      || (spec && spec.text && spec.text.forcePriceBold ? "900" : "800");
    const decWeight = String(spec && spec.text && spec.text.priceDecWeight || "").trim()
      || (spec && spec.text && spec.text.forcePriceBold ? "800" : "700");
    const unitWeight = String(spec && spec.text && spec.text.priceUnitWeight || "").trim()
      || (spec && spec.text && spec.text.forcePriceBold ? "800" : "700");
    const priceCircle = cardNodes.priceCircle;
    const priceRow = cardNodes.priceRow;
    const priceStack = cardNodes.priceStack;
    const mainEl = cardNodes.priceMain;
    const decEl = cardNodes.priceDec;
    const unitEl = cardNodes.priceUnit;

    mainEl.textContent = parts.main;
    decEl.textContent = parts.dec;
    unitEl.textContent = parts.unit;

    setNodeStyles(mainEl, {
      fontFamily: priceFont,
      color: textColor,
      fontWeight: mainWeight,
      lineHeight: "0.92",
      letterSpacing: "-0.05em"
    });
    setNodeStyles(decEl, {
      fontFamily: priceFont,
      color: textColor,
      fontWeight: decWeight,
      lineHeight: "1",
      letterSpacing: "-0.03em"
    });
    setNodeStyles(unitEl, {
      fontFamily: priceFont,
      color: textColor,
      fontWeight: unitWeight,
      lineHeight: "1",
      whiteSpace: "nowrap"
    });

    setNodeStyles(priceCircle, {
      position: "absolute",
      left: `${toFiniteNumber(spec && spec.priceArea && spec.priceArea.x, 66.2)}%`,
      top: `${toFiniteNumber(spec && spec.priceArea && spec.priceArea.y, 59.8)}%`,
      display: spec && spec.text && spec.text.hidePrice ? "none" : "flex",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      overflow: "visible",
      backgroundImage: "none"
    });
    setNodeStyles(priceRow, {
      display: "flex",
      alignItems: "flex-end",
      gap: "5px",
      position: "absolute"
    });
    setNodeStyles(priceStack, {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "2px"
    });

    if (priceMode === "text") {
      const mainSize = Math.max(20, Math.round(baseCircleSize * 0.56 * priceScale * mainScaleBoost));
      const metaSize = Math.max(10, Math.round(baseCircleSize * 0.22 * priceScale));
      setNodeStyles(priceCircle, {
        width: `${baseCircleSize}px`,
        height: `${baseCircleSize}px`,
        background: "transparent",
        borderRadius: "0"
      });
      setNodeStyles(priceRow, {
        left: "0px",
        top: "0px",
        transform: "none",
        justifyContent: "flex-start"
      });
      mainEl.style.fontSize = `${mainSize}px`;
      decEl.style.fontSize = `${metaSize}px`;
      unitEl.style.fontSize = `${metaSize}px`;
      return;
    }

    if (priceMode === "rounded") {
      const mainSize = Math.max(16, Math.round(roundedHeight * 0.8 * priceScale));
      const metaSize = Math.max(9, Math.round(roundedHeight * 0.26 * priceScale));
      setNodeStyles(priceCircle, {
        width: `${roundedWidth}px`,
        height: `${roundedHeight}px`,
        background: getPreviewPriceAccentColor(spec),
        borderRadius: `${roundedRadius}px`
      });
      setNodeStyles(priceRow, {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        justifyContent: "center"
      });
      mainEl.style.fontSize = `${mainSize}px`;
      decEl.style.fontSize = `${metaSize}px`;
      unitEl.style.fontSize = `${metaSize}px`;
      return;
    }

    const mainSize = Math.max(16, Math.round(baseCircleSize * 0.475 * priceScale * mainScaleBoost));
    const decSize = Math.max(8, Math.round(baseCircleSize * 0.14 * priceScale));
    const unitSize = Math.max(7, Math.round(baseCircleSize * 0.095 * priceScale));
    setNodeStyles(priceCircle, {
      width: `${baseCircleSize}px`,
      height: `${baseCircleSize}px`,
      background: getPreviewPriceAccentColor(spec),
      borderRadius: "999px"
    });
    setNodeStyles(priceRow, {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -46%)",
      justifyContent: "center"
    });
    mainEl.style.fontSize = `${mainSize}px`;
    decEl.style.fontSize = `${decSize}px`;
    unitEl.style.fontSize = `${unitSize}px`;
  }

  function renderPreviewStyleCardIntoShell(shell, row, styleLike) {
    if (!shell) return;
    const width = Math.max(1, Math.round(shell.clientWidth || shell.getBoundingClientRect().width || 0));
    const height = Math.max(1, Math.round(shell.clientHeight || shell.getBoundingClientRect().height || 0));
    if (!(width > 0 && height > 0)) return;

    const option = styleLike || getSelectedLayoutOption();
    const spec = getLayoutPreviewSpec(option);
    const scale = Math.min(width / CUSTOM_STYLE_CARD_BASE_WIDTH, height / CUSTOM_STYLE_CARD_BASE_HEIGHT);
    const fittedWidth = Math.max(1, CUSTOM_STYLE_CARD_BASE_WIDTH * scale);
    const fittedHeight = Math.max(1, CUSTOM_STYLE_CARD_BASE_HEIGHT * scale);
    const metaScale = clamp(toFiniteNumber(spec && spec.text && spec.text.metaScaleMultiplier, 1), 0.6, 2.4);
    const metaFont = getPreviewFontStack(spec && spec.text && spec.text.metaFontFamily);
    const showDivider = toFiniteNumber(spec && spec.divider && spec.divider.x, -1) >= 0
      && toFiniteNumber(spec && spec.divider && spec.divider.h, 0) > 0
      && toFiniteNumber(spec && spec.divider && spec.divider.w, 0) > 0;
    const displayName = getPreviewRowDisplayName(row);
    const displayIndex = sanitizeEditableText(row && row.index) || "-";
    const displayPackage = formatPackageLabel(row);

    shell.innerHTML = "";
    setNodeStyles(shell, {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden"
    });

    const fit = createStyleNode("div", "creator-style-card-shell__fit");
    setNodeStyles(fit, {
      width: `${fittedWidth}px`,
      height: `${fittedHeight}px`,
      position: "relative",
      zIndex: "1",
      flex: "0 0 auto"
    });

    const card = createStyleNode("div", "creator-style-card");
    setNodeStyles(card, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${CUSTOM_STYLE_CARD_BASE_WIDTH}px`,
      height: `${CUSTOM_STYLE_CARD_BASE_HEIGHT}px`,
      transformOrigin: "left top",
      transform: `scale(${scale})`,
      background: "#ffffff",
      border: "1px solid #dbe4ef",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 10px 20px rgba(148, 163, 184, 0.12)"
    });

    const track = createStyleNode("div", "creator-style-card__images-track");
    setNodeStyles(track, {
      position: "absolute",
      left: `${toFiniteNumber(spec && spec.imgArea && spec.imgArea.x, 12.5)}%`,
      top: `${toFiniteNumber(spec && spec.imgArea && spec.imgArea.y, 18.8)}%`,
      width: `${toFiniteNumber(spec && spec.imgArea && spec.imgArea.w, 62)}%`,
      height: `${toFiniteNumber(spec && spec.imgArea && spec.imgArea.h, 44)}%`,
      display: spec && spec.text && spec.text.hideImage ? "none" : "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden"
    });
    appendPreviewImageContent(track, row);
    card.appendChild(track);

    const divider = createStyleNode("div", "creator-style-card__divider");
    setNodeStyles(divider, {
      position: "absolute",
      left: `${toFiniteNumber(spec && spec.divider && spec.divider.x, 63.6)}%`,
      top: `${toFiniteNumber(spec && spec.divider && spec.divider.y, 15.5)}%`,
      width: `${toFiniteNumber(spec && spec.divider && spec.divider.w, 0.55)}%`,
      height: `${toFiniteNumber(spec && spec.divider && spec.divider.h, 58.5)}%`,
      background: String(spec && spec.text && spec.text.dividerColor || "").trim() || "rgba(207, 207, 207, 0.92)",
      borderRadius: "999px",
      display: showDivider ? "block" : "none"
    });
    card.appendChild(divider);

    const nameEl = createStyleNode("div", "creator-style-card__name", displayName);
    setNodeStyles(nameEl, {
      position: "absolute",
      left: `${toFiniteNumber(spec && spec.nameArea && spec.nameArea.x, 66.2)}%`,
      top: `${toFiniteNumber(spec && spec.nameArea && spec.nameArea.y, 20.8)}%`,
      width: `${toFiniteNumber(spec && spec.nameArea && spec.nameArea.w, 31.8)}%`,
      fontSize: `${Math.round(10 * metaScale)}px`,
      lineHeight: "1.04",
      fontWeight: String(spec && spec.text && spec.text.nameWeight || "").trim() || "700",
      color: String(spec && spec.text && spec.text.nameColor || "").trim() || "#1f3560",
      fontFamily: metaFont,
      textAlign: "left",
      letterSpacing: "-0.02em",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      display: spec && spec.text && spec.text.hideName ? "none" : "block",
      zIndex: "4"
    });
    card.appendChild(nameEl);

    const indexEl = createStyleNode("div", "creator-style-card__index", displayIndex);
    setNodeStyles(indexEl, {
      position: "absolute",
      left: `${toFiniteNumber(spec && spec.indexPos && spec.indexPos.x, 66.2)}%`,
      top: `${toFiniteNumber(spec && spec.indexPos && spec.indexPos.y, 34.6)}%`,
      fontSize: `${Math.round(12 * metaScale)}px`,
      lineHeight: "1",
      fontWeight: String(spec && spec.text && spec.text.indexWeight || "").trim() || "700",
      color: String(spec && spec.text && spec.text.indexColor || "").trim() || "#b9b9b9",
      fontStyle: spec && spec.text && spec.text.indexItalic === false ? "normal" : "italic",
      fontFamily: metaFont,
      display: spec && spec.text && spec.text.hideIndex ? "none" : "block",
      zIndex: "4"
    });
    card.appendChild(indexEl);

    const packageEl = createStyleNode("div", "creator-style-card__package", displayPackage);
    setNodeStyles(packageEl, {
      position: "absolute",
      left: `${toFiniteNumber(spec && spec.packagePos && spec.packagePos.x, 66.2)}%`,
      top: `${toFiniteNumber(spec && spec.packagePos && spec.packagePos.y, 38.6)}%`,
      fontSize: `${Math.round(12 * metaScale)}px`,
      lineHeight: "1.06",
      fontWeight: String(spec && spec.text && spec.text.packageWeight || "").trim() || "600",
      color: String(spec && spec.text && spec.text.packageColor || "").trim() || "#1f3560",
      fontFamily: metaFont,
      display: spec && spec.text && spec.text.hidePackage ? "none" : "block",
      zIndex: "4"
    });
    card.appendChild(packageEl);

    const flagEl = createStyleNode("div", "creator-style-card__flag");
    setNodeStyles(flagEl, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "0",
      height: "0",
      display: "none"
    });
    card.appendChild(flagEl);

    const priceCircle = createStyleNode("div", "creator-style-card__price-circle");
    const priceRow = createStyleNode("div", "creator-style-card__price-row");
    const priceMain = createStyleNode("div", "creator-style-card__price-main");
    const priceStack = createStyleNode("div", "creator-style-card__price-stack");
    const priceDec = createStyleNode("div", "creator-style-card__price-dec");
    const priceUnit = createStyleNode("div", "creator-style-card__price-unit");
    priceStack.appendChild(priceDec);
    priceStack.appendChild(priceUnit);
    priceRow.appendChild(priceMain);
    priceRow.appendChild(priceStack);
    priceCircle.appendChild(priceRow);
    card.appendChild(priceCircle);

    configurePreviewStyleCardPrice({
      priceCircle: priceCircle,
      priceRow: priceRow,
      priceMain: priceMain,
      priceStack: priceStack,
      priceDec: priceDec,
      priceUnit: priceUnit
    }, row, spec, option && option.id);

    const barcodeWrap = createStyleNode("div", "creator-style-card__barcode-wrap");
    setNodeStyles(barcodeWrap, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "0",
      height: "0",
      display: "none"
    });
    card.appendChild(barcodeWrap);

    fit.appendChild(card);
    shell.appendChild(fit);
  }

  function hydrateOptionPreviewCards() {
    const shells = Array.from(layoutOptionsHost.querySelectorAll("[data-option-style-preview]"));
    shells.forEach(function (shell) {
      const option = getPreviewStyleOptionById(shell.getAttribute("data-option-style-preview"));
      if (!option) return;
      renderPreviewStyleCardIntoShell(shell, createPreviewSampleRow(option), option);
    });
  }

  function hydrateCatalogPreviewCards(root) {
    if (!root) return;
    const rowMap = new Map();
    excelState.rows.forEach(function (row) {
      if (!row) return;
      rowMap.set(String(row.rowNo || ""), row);
    });
    Array.from(root.querySelectorAll("[data-preview-style-shell='module']")).forEach(function (shell) {
      const option = getPreviewStyleOptionById(shell.getAttribute("data-style-id"));
      const row = rowMap.get(String(shell.getAttribute("data-rowno") || ""));
      if (!option || !row) return;
      renderPreviewStyleCardIntoShell(shell, row, option);
    });
  }

  function schedulePreviewHydration() {
    if (previewHydrationFrame) {
      window.cancelAnimationFrame(previewHydrationFrame);
    }
    previewHydrationFrame = window.requestAnimationFrame(function () {
      previewHydrationFrame = 0;
      hydrateOptionPreviewCards();
      previewPanels.forEach(function (panel) {
        hydrateCatalogPreviewCards(panel.list);
      });
    });
  }

  function buildOptionPreviewMarkup(option) {
    return '<span class="creator-layout-option__preview" aria-hidden="true" data-option-style-preview="' + escapeHtml(option && option.id || "") + '"></span>';
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
    if (value == null) return "";
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return "";
      return String(value);
    }
    return String(value).trim();
  }

  function toFinitePriceNumber(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return null;

    const compact = raw
      .replace(/\s+/g, "")
      .replace(/[^0-9,.\-]/g, "");
    if (!compact || compact === "-" || compact === "," || compact === ".") {
      return null;
    }

    const lastComma = compact.lastIndexOf(",");
    const lastDot = compact.lastIndexOf(".");
    let normalized = compact;

    if (lastComma >= 0 && lastDot >= 0) {
      if (lastComma > lastDot) {
        normalized = compact.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = compact.replace(/,/g, "");
      }
    } else if (lastComma >= 0) {
      normalized = compact.replace(",", ".");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatPrice(value) {
    const parsed = toFinitePriceNumber(value);
    if (!Number.isFinite(parsed)) {
      return sanitizeEditableText(value);
    }
    const rounded = Math.round((parsed + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString("pl-PL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeEditableText(value) {
    return String(value || "")
      .replace(/\r?\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function scientificToPlain(raw) {
    const txt = String(raw || "").trim();
    if (!txt) return "";
    if (!/[eE]/.test(txt)) return txt.replace(/\D/g, "");
    const n = Number(txt);
    if (!Number.isFinite(n)) return txt.replace(/\D/g, "");
    return String(Math.round(n));
  }

  function normalizeImportIndex(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const plain = scientificToPlain(raw);
    return plain || raw.replace(/\s+/g, "");
  }

  function normalizeFileKey(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function normalizeImportedPageNumber(raw) {
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return Math.round(raw);
    }
    const tokens = (String(raw || "").match(/\d+/g) || [])
      .map(function (token) {
        return parseInt(token, 10);
      })
      .filter(function (token) {
        return Number.isFinite(token) && token > 0;
      });
    if (!tokens.length) return null;
    const unique = Array.from(new Set(tokens));
    if (unique.length === 1) return unique[0];
    if (tokens.length === 1) return tokens[0];
    return null;
  }

  async function parseExcelRowsLikeCustomStyle(file) {
    if (!file) return [];
    if (!window.XLSX) {
      throw new Error("Brak biblioteki XLSX (xlsx.full.min.js).");
    }
    const buf = await file.arrayBuffer();
    const wb = window.XLSX.read(buf, { type: "array" });
    const ws = wb && wb.Sheets ? wb.Sheets[wb.SheetNames && wb.SheetNames[0]] : null;
    if (!ws) return [];
    const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!Array.isArray(rows) || rows.length < 1) return [];

    const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
    const headerMap = new Map(
      headerRow.map(function (cell, idx) {
        return [normalizeExcelHeaderKey(cell), idx];
      }).filter(function (pair) {
        return !!pair[0];
      })
    );

    function findCol(fallbackIdx, aliases) {
      for (let i = 0; i < aliases.length; i += 1) {
        const key = normalizeExcelHeaderKey(aliases[i]);
        if (headerMap.has(key)) return headerMap.get(key);
      }
      return fallbackIdx;
    }

    const cIndex = findCol(0, ["indeks", "index", "kod", "sku"]);
    const cName = findCol(-1, ["nazwa towaru", "nazwa produktu", "nazwa artykulu", "nazwa artykułu", "opis towaru", "nazwa", "produkt", "product name", "name", "opis"]);
    const cPrice = findCol(2, ["cena", "price", "netto", "cena netto", "cena netto fv"]);
    const cPackageValue = findCol(-1, ["il opk zb", "il_opk_zb", "ilosc w opakowaniu zbiorczym", "ilość w opakowaniu zbiorczym", "pakiet"]);
    const cPackageUnit = findCol(-1, ["jm", "jednostka miary", "jednostka", "pakiet jm", "pakiet_jm"]);
    const cEan = findCol(-1, ["kod kreskowy", "kod_kreskowy", "ean"]);
    const cAssignedPage = findCol(8, ["strona", "page", "numer strony", "nr strony", "strona katalogu", "strony"]);
    const dataRows = rows.slice(1);
    return dataRows.map(function (row, rowIdx) {
      const cells = Array.isArray(row) ? row : [];
      const indexRaw = (Number.isInteger(cIndex) && cIndex >= 0) ? readExcelCellAsText(cells[cIndex]) : "";
      const name = (Number.isInteger(cName) && cName >= 0) ? readExcelCellAsText(cells[cName]) : "";
      const price = (Number.isInteger(cPrice) && cPrice >= 0) ? readExcelCellAsText(cells[cPrice]) : "";
      const packageValue = (Number.isInteger(cPackageValue) && cPackageValue >= 0) ? readExcelCellAsText(cells[cPackageValue]) : "";
      const packageUnit = (Number.isInteger(cPackageUnit) && cPackageUnit >= 0) ? readExcelCellAsText(cells[cPackageUnit]) : "";
      const ean = (Number.isInteger(cEan) && cEan >= 0) ? readExcelCellAsText(cells[cEan]) : "";
      const assignedPageRaw = (Number.isInteger(cAssignedPage) && cAssignedPage >= 0) ? readExcelCellAsText(cells[cAssignedPage]) : "";
      return {
        rowNo: rowIdx + 2,
        indexRaw: indexRaw,
        index: normalizeImportIndex(indexRaw),
        name: name,
        price: formatPrice(price),
        packageValue: packageValue,
        packageUnit: packageUnit,
        ean: ean,
        assignedPageRaw: assignedPageRaw,
        assignedPageNumber: normalizeImportedPageNumber(assignedPageRaw)
      };
    }).filter(function (item) {
      return !!item.index;
    });
  }

  if (!modal || !closeButton || !cancelButton || !confirmButton || !feedback || !optionButtons.length || !detailsModal || !closeDetailsModalBtn || !continueSourceModalBtn || !sourceFeedback || !sourceOptionButtons.length || !excelModal || !closeExcelModalBtn || !backToSourceModalBtn || !excelImportPanel || !excelFileInput || !excelFileLabel || !excelImportBtn || !excelFeedback || !excelStats || !showProductsBtn || !continueToImagesBtn || !catalogPreviewList || !catalogProgressValue || !catalogProgressBar || !catalogProgressLabel || !imagesModal || !closeImagesModalBtn || !backToExcelModalBtn || !imagesImportPanel || !imagesFileInput || !imagesFileLabel || !imagesImportBtn || !imagesFeedback || !continueToLayoutBtn || !imagesCatalogPreviewList || !imagesCatalogProgressValue || !imagesCatalogProgressBar || !imagesCatalogProgressLabel || !layoutModal || !closeLayoutModalBtn || !backToImagesModalBtn || !layoutOptionsHost || !layoutFeedback || !layoutCatalogPreviewList || !layoutCatalogProgressValue || !layoutCatalogProgressBar || !layoutCatalogProgressLabel || !continueToMagicBtn || !magicModal || !closeMagicModalBtn || !backToLayoutModalBtn || !magicWandBtn || !magicSelectedStyle || !magicFlavorLabel || !magicFeedback || !magicCatalogPreviewList || !magicCatalogProgressValue || !magicCatalogProgressBar || !magicCatalogProgressLabel) {
    return;
  }

  const previewPanels = [
    {
      list: catalogPreviewList,
      value: catalogProgressValue,
      bar: catalogProgressBar,
      label: catalogProgressLabel,
      variant: "standard"
    },
    {
      list: imagesCatalogPreviewList,
      value: imagesCatalogProgressValue,
      bar: imagesCatalogProgressBar,
      label: imagesCatalogProgressLabel,
      variant: "standard"
    },
    {
      list: layoutCatalogPreviewList,
      value: layoutCatalogProgressValue,
      bar: layoutCatalogProgressBar,
      label: layoutCatalogProgressLabel,
      variant: "standard"
    },
    {
      list: magicCatalogPreviewList,
      value: magicCatalogProgressValue,
      bar: magicCatalogProgressBar,
      label: magicCatalogProgressLabel,
      variant: "magic"
    }
  ];

  function updateSelection(nextOption) {
    state.selectedOption = nextOption;
    optionButtons.forEach((button) => {
      const isActive = button.dataset.option === nextOption;
      button.classList.toggle("is-selected", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    feedback.textContent = "";
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function showFeedback() {
    const label = labels[state.selectedOption] || labels.classic;
    feedback.textContent = "Wybrano: " + label + ". Ten prototyp jest gotowy do późniejszego podpięcia pod istniejący start projektu.";
  }

  function updateSourceSelection(nextOption) {
    sourceState.selected = nextOption;
    sourceOptionButtons.forEach((button) => {
      const isActive = button.dataset.sourceOption === nextOption;
      button.classList.toggle("is-selected", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    sourceFeedback.textContent = "Wybrano: " + (sourceLabels[nextOption] || sourceLabels.excel);
  }

  function openExcelModal() {
    detailsModal.classList.remove("is-open");
    detailsModal.setAttribute("aria-hidden", "true");
    imagesModal.classList.remove("is-open");
    imagesModal.setAttribute("aria-hidden", "true");
    layoutModal.classList.remove("is-open");
    layoutModal.setAttribute("aria-hidden", "true");
    magicModal.classList.remove("is-open");
    magicModal.setAttribute("aria-hidden", "true");
    excelModal.classList.add("is-open");
    excelModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    previewState.stage = "excel";
    previewState.imageStatus = "idle";
    excelFeedback.textContent = "";
    excelStats.hidden = true;
    excelStats.innerHTML = "";
    showProductsBtn.hidden = true;
    showProductsBtn.textContent = "Zobacz produkty";
    continueToImagesBtn.hidden = true;
    continueToLayoutBtn.hidden = true;
    setPreviewProgress(0, false);
    syncAllPreviewPanels();
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function closeExcelModalAndReturn() {
    excelModal.classList.remove("is-open");
    excelModal.setAttribute("aria-hidden", "true");
    detailsModal.classList.add("is-open");
    detailsModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function openImagesModal() {
    excelModal.classList.remove("is-open");
    excelModal.setAttribute("aria-hidden", "true");
    layoutModal.classList.remove("is-open");
    layoutModal.setAttribute("aria-hidden", "true");
    magicModal.classList.remove("is-open");
    magicModal.setAttribute("aria-hidden", "true");
    imagesModal.classList.add("is-open");
    imagesModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    previewState.stage = "images";
    imagesFeedback.textContent = "";
    continueToLayoutBtn.hidden = !excelState.rows.some(function (row) {
      return !!(row && row.previewImageUrl);
    });
    syncAllPreviewPanels();
  }

  function closeImagesModalAndReturn() {
    imagesModal.classList.remove("is-open");
    imagesModal.setAttribute("aria-hidden", "true");
    excelModal.classList.add("is-open");
    excelModal.setAttribute("aria-hidden", "false");
    previewState.stage = "excel";
    document.body.style.overflow = "hidden";
    syncAllPreviewPanels();
  }

  function openLayoutModal() {
    void ensureCreatorLayoutStylesReady();
    imagesModal.classList.remove("is-open");
    imagesModal.setAttribute("aria-hidden", "true");
    magicModal.classList.remove("is-open");
    magicModal.setAttribute("aria-hidden", "true");
    layoutModal.classList.add("is-open");
    layoutModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    previewState.stage = "layout";
    setPreviewProgress(Math.max(previewState.currentProgress, 58), true);
    layoutFeedback.textContent = "Wybrano: " + ((layoutOptions.find(function (item) {
      return item.id === previewState.selectedLayoutId;
    }) || {}).label || "Styl numer 1");
    syncAllPreviewPanels();
  }

  function closeLayoutModalAndReturn() {
    layoutModal.classList.remove("is-open");
    layoutModal.setAttribute("aria-hidden", "true");
    imagesModal.classList.add("is-open");
    imagesModal.setAttribute("aria-hidden", "false");
    previewState.stage = "images";
    document.body.style.overflow = "hidden";
    syncAllPreviewPanels();
  }

  function inferMagicProfileIdForStyle(styleLike) {
    if (previewState.magicLayoutPreset && previewState.magicLayoutPreset.flavor) {
      return {
        id: previewState.magicLayoutPreset.flavor,
        label: formatMagicFlavorLabel(previewState.magicLayoutPreset.flavor)
      };
    }
    const safeStyle = styleLike || getSelectedLayoutOption();
    const id = String(safeStyle && safeStyle.id || "").trim();
    if (id === "styl-numer-2") return { id: "dense-grid", label: "Dense Grid" };
    if (id === "styl-numer-3") return { id: "showcase", label: "Showcase" };
    if (id === "default") return { id: "minimal-premium", label: "Minimal Premium" };
    const spec = getLayoutPreviewSpec(safeStyle);
    if (spec.text.priceShape === "roundedRect") return { id: "dense-grid", label: "Dense Grid" };
    if (spec.imgArea.w >= 88 && spec.imgArea.y <= 8) return { id: "showcase", label: "Showcase" };
    if (spec.divider.w > 0 && spec.divider.h > 0 && spec.divider.x >= 0) return { id: "balanced-tight", label: "Balanced Tight" };
    if (spec.imgArea.x <= 8 && spec.priceArea.x <= 20) return { id: "minimal-premium", label: "Minimal Premium" };
    if (spec.imgArea.h <= 36) return { id: "editorial-sweep", label: "Editorial Sweep" };
    return { id: "balanced-airy", label: "Balanced Airy" };
  }

  function getDefaultMagicProfileId() {
    return inferMagicProfileIdForStyle(getSelectedLayoutOption()).id;
  }

  function getActiveMagicProfile() {
    if (previewState.magicLayoutPreset && previewState.magicLayoutPreset.flavor) {
      return {
        id: previewState.magicLayoutPreset.flavor,
        label: formatMagicFlavorLabel(previewState.magicLayoutPreset.flavor)
      };
    }
    return magicLayoutProfiles.find(function (profile) {
      return profile.id === previewState.magicProfileId;
    }) || magicLayoutProfiles[0];
  }

  function getNextMagicLayoutOption() {
    const activeId = String(previewState.selectedLayoutId || "").trim();
    let pool = layoutOptions.filter(function (item) {
      return item && item.id !== activeId && styleHasDirectPreview(item);
    });
    if (!pool.length) {
      pool = layoutOptions.filter(function (item) {
        return item && item.id !== activeId;
      });
    }
    if (!pool.length) return null;
    const filtered = pool.filter(function (item) {
      return item.id !== previewState.lastMagicLayoutId;
    });
    const candidates = filtered.length ? filtered : pool;
    return candidates[Math.floor(Math.random() * candidates.length)] || candidates[0] || null;
  }

  function openMagicModal() {
    void ensureCreatorLayoutStylesReady();
    layoutModal.classList.remove("is-open");
    layoutModal.setAttribute("aria-hidden", "true");
    magicModal.classList.add("is-open");
    magicModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    previewState.stage = "magic";
    chooseMagicLayoutPreset(getProductsForPage(excelState.activePage).slice(0, 8), false);
    magicSelectedStyle.textContent = getSelectedLayoutOption().label;
    magicFlavorLabel.textContent = getActiveMagicProfile().label;
    magicFeedback.textContent = "Kliknij różdżkę, aby Creator AI przetestował kolejny układ inspirowany magic-layout.js.";
    setPreviewProgress(Math.max(previewState.currentProgress, 76), true);
    syncAllPreviewPanels();
  }

  function closeMagicModalAndReturn() {
    magicModal.classList.remove("is-open");
    magicModal.setAttribute("aria-hidden", "true");
    layoutModal.classList.add("is-open");
    layoutModal.setAttribute("aria-hidden", "false");
    previewState.stage = "layout";
    document.body.style.overflow = "hidden";
    syncAllPreviewPanels();
  }

  function getPreviewMagicClass() {
    if (previewState.stage !== "magic") return "";
    const safe = String(previewState.magicProfileId || "").trim();
    return safe ? ("creator-a4-page--magic-" + safe) : "";
  }

  function triggerMagicPreviewSpell() {
    const page = magicCatalogPreviewList.querySelector(".creator-a4-page");
    if (!page) return;

    page.querySelectorAll(".creator-magic-spell").forEach(function (node) {
      node.remove();
    });

    const effect = document.createElement("div");
    effect.className = "creator-magic-spell";

    const ring = document.createElement("span");
    ring.className = "creator-magic-spell__ring";
    effect.appendChild(ring);

    for (let i = 0; i < 7; i += 1) {
      const spark = document.createElement("span");
      spark.className = "creator-magic-spell__spark";
      spark.style.left = (12 + Math.random() * 76) + "%";
      spark.style.top = (10 + Math.random() * 72) + "%";
      spark.style.setProperty("--creator-spell-dx", ((Math.random() * 32) - 16) + "px");
      spark.style.setProperty("--creator-spell-dy", (-(18 + Math.random() * 42)) + "px");
      effect.appendChild(spark);
    }

    page.appendChild(effect);
    magicWandBtn.classList.add("is-casting");

    window.setTimeout(function () {
      effect.remove();
      magicWandBtn.classList.remove("is-casting");
    }, 1200);
  }

  function castMagicLayoutPreview() {
    const currentRows = getProductsForPage(excelState.activePage).slice(0, 8);
    const nextPreset = chooseMagicLayoutPreset(currentRows, true);
    magicSelectedStyle.textContent = getSelectedLayoutOption().label;
    magicFlavorLabel.textContent = getActiveMagicProfile().label;
    magicFeedback.textContent = nextPreset
      ? ("AI przetestowało nowy układ strony: " + getActiveMagicProfile().label + ".")
      : "AI odświeżyło bieżący układ strony.";
    setPreviewProgress(Math.max(previewState.currentProgress, 82), true);
    syncAllPreviewPanels();
    triggerMagicPreviewSpell();
  }

  function getProductsForPage(pageNo) {
    return excelState.rows.filter(function (row) {
      return Number(row && row.assignedPageNumber) === Number(pageNo);
    });
  }

  function renderPageDetails(pageNo) {
    const safePage = Number(pageNo);
    const items = getProductsForPage(safePage);
    const detailsHost = excelStats.querySelector("#creatorExcelPageDetails");
    if (!detailsHost) return;

    excelState.activePage = safePage;
    syncAllPreviewPanels();
    excelStats.querySelectorAll(".creator-excel-pages__item").forEach(function (el) {
      const elPage = Number(el.getAttribute("data-page") || "");
      el.classList.toggle("is-active", Number.isFinite(elPage) && elPage === safePage);
    });

    if (!items.length) {
      detailsHost.innerHTML =
        '<div class="creator-excel-empty">Brak produktów przypisanych do tej strony.</div>';
      return;
    }

    const rowsHtml = items.map(function (item) {
      const rowId = Number(item && item.rowNo);
      return (
        "<tr>" +
          '<td class="creator-excel-cell" contenteditable="true" spellcheck="false" data-rowno="' + rowId + '" data-field="index">' + escapeHtml(item.index || "") + "</td>" +
          '<td class="creator-excel-cell" contenteditable="true" spellcheck="false" data-rowno="' + rowId + '" data-field="name">' + escapeHtml(item.name || "") + "</td>" +
          '<td class="creator-excel-cell" contenteditable="true" spellcheck="false" data-rowno="' + rowId + '" data-field="ean">' + escapeHtml(item.ean || "") + "</td>" +
        "</tr>"
      );
    }).join("");

    detailsHost.innerHTML =
      '<div class="creator-excel-products__head">Strona ' + safePage + " - " + items.length + " produktów</div>" +
      '<div class="creator-excel-products__table-wrap">' +
        '<table class="creator-excel-products__table">' +
          "<thead><tr><th>Indeks</th><th>Nazwa</th><th>Kod EAN</th></tr></thead>" +
          "<tbody>" + rowsHtml + "</tbody>" +
        "</table>" +
      "</div>";
  }

  function formatPackageLabel(row) {
    const value = sanitizeEditableText(row && row.packageValue);
    const unit = sanitizeEditableText(row && row.packageUnit);
    if (value && unit) return value + " " + unit;
    if (value) return value;
    if (unit) return unit;
    return "-";
  }

  function formatPreviewPriceLabel(value) {
    const parsed = toFinitePriceNumber(value);
    if (!Number.isFinite(parsed)) {
      return "-";
    }

    const rounded = Math.round((parsed + Number.EPSILON) * 100) / 100;
    return "£ " + rounded.toFixed(2) + " / szt.";
  }

  function getPreviewPriceParts(value) {
    const parsed = toFinitePriceNumber(value);
    if (!Number.isFinite(parsed)) {
      return {
        main: "-",
        dec: "00",
        line: "-",
        unit: "£ / SZT."
      };
    }

    const fixed = parsed.toFixed(2);
    const parts = fixed.split(".");
    return {
      main: parts[0] || "0",
      dec: parts[1] || "00",
      line: "£ " + fixed + " / szt.",
      unit: "£ / SZT."
    };
  }

  function getPreviewPriceMode(spec) {
    if (!spec || !spec.text) return "circle";
    if (spec.text.hidePrice || spec.text.hidePriceBadge || spec.text.noPriceCircle || spec.text.priceShape === "none") {
      return "text";
    }
    if (spec.text.priceShape === "roundedRect" || (spec.priceArea.w > 0 && spec.priceArea.h > 0)) {
      return "rounded";
    }
    return "circle";
  }

  function getPreviewPriceAccentColor(spec) {
    if (!spec || !spec.text) return "#d71920";
    if (spec.text.priceBgColor) return spec.text.priceBgColor;
    if (getPreviewPriceMode(spec) === "rounded") return "#2eaee8";
    if (spec.text.noPriceCircle || spec.text.hidePriceBadge) return "transparent";
    return "#d71920";
  }

  function getPreviewPriceTextColor(spec) {
    const mode = getPreviewPriceMode(spec);
    if (spec && spec.text && spec.text.priceColor) return spec.text.priceColor;
    if (mode === "rounded" || mode === "circle") return "#ffffff";
    return "#d71920";
  }

  function getPreviewFontStack(fontFamily) {
    const safe = sanitizeEditableText(fontFamily).replace(/"/g, "");
    if (!safe) return '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
    return '"' + safe + '", "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
  }

  function getPreviewPriceBadgeMetrics(spec) {
    const mode = getPreviewPriceMode(spec);
    if (mode === "rounded") {
      return {
        width: Math.max(54, percentToPreviewPixels(spec.priceArea.w || 24, "x")),
        height: Math.max(24, percentToPreviewPixels(spec.priceArea.h || 11.5, "y")),
        radius: Math.max(8, percentToPreviewPixels(spec.priceArea.r || spec.text.priceBgRadius || 2.2, "x"))
      };
    }
    return {
      width: Math.max(42, percentToPreviewPixels(spec.priceArea.s || 16, "x")),
      height: Math.max(42, percentToPreviewPixels(spec.priceArea.s || 16, "x")),
      radius: 999
    };
  }

  function buildPreviewPriceMarkup(value, styleLike) {
    const parts = getPreviewPriceParts(value);
    const spec = getLayoutPreviewSpec(styleLike || getSelectedLayoutOption());

    if (previewState.stage !== "layout" && previewState.stage !== "magic") {
      return '<span class="creator-a4-price-line">' + escapeHtml(parts.line) + "</span>";
    }

    const mode = getPreviewPriceMode(spec);
    const scale = spec.text.priceScaleMultiplier || 1;
    const fontStack = getPreviewFontStack(spec.text.priceFontFamily);
    const textColor = getPreviewPriceTextColor(spec);
    const priceWeights = {
      main: spec.text.priceMainWeight || (spec.text.forcePriceBold || spec.text.priceExtraBold ? "900" : "800"),
      dec: spec.text.priceDecWeight || (spec.text.forcePriceBold ? "800" : "700"),
      unit: spec.text.priceUnitWeight || (spec.text.forcePriceBold ? "800" : "700")
    };

    if (mode === "rounded") {
      const metrics = getPreviewPriceBadgeMetrics(spec);
      const badgeStyle = buildInlineStyle({
        minWidth: formatPixels(metrics.width, 56),
        minHeight: formatPixels(metrics.height, 26),
        borderRadius: formatPixels(metrics.radius, 8),
        background: getPreviewPriceAccentColor(spec),
        color: textColor,
        fontFamily: fontStack
      });
      const mainStyle = buildInlineStyle({
        fontSize: formatPixels(16 * scale, 16),
        fontWeight: priceWeights.main
      });
      const decStyle = buildInlineStyle({
        fontSize: formatPixels(9 * scale, 9),
        fontWeight: priceWeights.dec
      });
      const unitStyle = buildInlineStyle({
        fontSize: formatPixels(6 * scale, 6),
        fontWeight: priceWeights.unit
      });
      return (
        '<span class="creator-a4-price-badge creator-a4-price-badge--rounded" style="' + escapeHtml(badgeStyle) + '">' +
          '<span class="creator-a4-price-chip__top">' +
            '<span class="creator-a4-price-chip__main" style="' + escapeHtml(mainStyle) + '">' + escapeHtml(parts.main) + "</span>" +
            '<span class="creator-a4-price-chip__dec" style="' + escapeHtml(decStyle) + '">' + escapeHtml(parts.dec) + "</span>" +
          "</span>" +
          '<span class="creator-a4-price-chip__bottom" style="' + escapeHtml(unitStyle) + '">£ / SZT.</span>' +
        "</span>"
      );
    }

    const clusterClass = mode === "text"
      ? "creator-a4-price-badge creator-a4-price-badge--text"
      : "creator-a4-price-badge creator-a4-price-badge--circle";
    const badgeMetrics = getPreviewPriceBadgeMetrics(spec);
    const badgeStyle = buildInlineStyle({
      minWidth: mode === "text" ? "0" : formatPixels(badgeMetrics.width, 46),
      minHeight: mode === "text" ? "0" : formatPixels(badgeMetrics.height, 46),
      borderRadius: mode === "text" ? "0" : "999px",
      background: mode === "text" ? "transparent" : getPreviewPriceAccentColor(spec),
      color: textColor,
      fontFamily: fontStack
    });
    const mainStyle = buildInlineStyle({
      fontSize: formatPixels((mode === "text" ? 28 : 16) * scale, mode === "text" ? 28 : 16),
      fontWeight: priceWeights.main
    });
    const decStyle = buildInlineStyle({
      fontSize: formatPixels((mode === "text" ? 13 : 8.5) * scale, mode === "text" ? 13 : 9),
      fontWeight: priceWeights.dec
    });
    const unitStyle = buildInlineStyle({
      fontSize: formatPixels((mode === "text" ? 7 : 6.5) * scale, mode === "text" ? 7 : 7),
      fontWeight: priceWeights.unit
    });

    return (
      '<span class="' + clusterClass + '" style="' + escapeHtml(badgeStyle) + '">' +
        '<span class="creator-a4-price-main" style="' + escapeHtml(mainStyle) + '">' + escapeHtml(parts.main) + "</span>" +
        '<span class="creator-a4-price-stack">' +
          '<span class="creator-a4-price-dec" style="' + escapeHtml(decStyle) + '">' + escapeHtml(parts.dec) + "</span>" +
          '<span class="creator-a4-price-unit" style="' + escapeHtml(unitStyle) + '">' + escapeHtml(parts.unit) + "</span>" +
        "</span>" +
      "</span>"
    );
  }

  function getPreviewStageLabel() {
    if (previewState.stage === "magic") return "Etap 4 - Magic Layout AI";
    if (previewState.stage === "layout") return "Etap 3 - wybór layoutu";
    if (previewState.stage === "images") {
      if (previewState.imageStatus === "assigning") return "Etap 2 - AI dodaje zdjęcia";
      if (previewState.imageStatus === "done") return "Etap 2 - zdjęcia w podglądzie";
      return "Etap 2 - import zdjęć";
    }
    return "Etap 1 - import danych";
  }

  function getAvailablePreviewPages() {
    const pageSet = new Set();
    excelState.rows.forEach(function (row) {
      const pageNo = Number(row && row.assignedPageNumber);
      if (Number.isFinite(pageNo) && pageNo > 0) pageSet.add(pageNo);
    });
    return Array.from(pageSet).sort(function (a, b) {
      return a - b;
    });
  }

  function getSelectedLayoutOption() {
    return layoutOptions.find(function (item) {
      return item.id === previewState.selectedLayoutId;
    }) || layoutOptions[0];
  }

  function getPreviewLayoutClass() {
    if (previewState.stage !== "layout" && previewState.stage !== "magic") {
      return "creator-a4-page--layout-1";
    }
    const id = String(previewState.selectedLayoutId || "");
    if (id === "default") return "creator-a4-page--layout-default";
    if (id === "styl-numer-2") return "creator-a4-page--layout-2";
    if (id === "styl-numer-3") return "creator-a4-page--layout-3";
    return "creator-a4-page--layout-1";
  }

  function renderLayoutOptions() {
    const cards = layoutOptions.map(function (option) {
      const isActive = option.id === previewState.selectedLayoutId;
      return (
        '<button class="creator-layout-option' + (isActive ? ' is-selected' : '') + '" type="button" data-layout-option="' + escapeHtml(option.id) + '" aria-pressed="' + String(isActive) + '">' +
          buildOptionPreviewMarkup(option) +
          '<span class="creator-layout-option__top">' +
            '<span class="creator-layout-option__title">' + escapeHtml(option.label) + "</span>" +
            '<span class="creator-layout-option__chip">' + escapeHtml(option.chip) + "</span>" +
          "</span>" +
          '<span class="creator-layout-option__text">' + escapeHtml(option.description) + "</span>" +
        "</button>"
      );
    }).join("");
    layoutOptionsHost.innerHTML = cards;
  }

  function buildLegacyPreviewModule(row, index, isMagicPreview) {
    const priceMarkup = buildPreviewPriceMarkup(row && row.price, getSelectedLayoutOption());
    const hasImage = !!(row && row.previewImageUrl);
    const mediaHtml = hasImage
      ? '<div class="creator-a4-module__photo-shell"><img class="creator-a4-module__image" src="' + escapeHtml(row.previewImageUrl) + '" alt="' + escapeHtml(row.name || "Zdjecie produktu") + '"></div>'
      : '<div class="creator-a4-module__placeholder"><span>BRAK</span><span>ZDJECIA</span></div>';
    if (isMagicPreview) {
      return (
        '<article class="creator-a4-module' + (hasImage ? ' creator-a4-module--with-image' : '') + '" style="--creator-preview-delay:' + (index * 90) + 'ms;">' +
          '<div class="creator-a4-module__media">' + mediaHtml + "</div>" +
          '<div class="creator-a4-module__divider"></div>' +
          '<div class="creator-a4-module__name">' + escapeHtml(row.name || ("Produkt " + (row.rowNo || ""))) + "</div>" +
          '<div class="creator-a4-module__index">' + escapeHtml(row.index || "-") + "</div>" +
          '<div class="creator-a4-module__pack">opak. ' + escapeHtml(formatPackageLabel(row)) + "</div>" +
          '<div class="creator-a4-module__price">' + priceMarkup + "</div>" +
        "</article>"
      );
    }
    return (
      '<article class="creator-a4-module' + (hasImage ? ' creator-a4-module--with-image' : '') + '" style="--creator-preview-delay:' + (index * 90) + 'ms;">' +
        '<div class="creator-a4-module__media">' + mediaHtml + "</div>" +
        '<div class="creator-a4-module__divider"></div>' +
        '<div class="creator-a4-module__content">' +
          '<div class="creator-a4-module__name">' + escapeHtml(row.name || ("Produkt " + (row.rowNo || ""))) + "</div>" +
          '<div class="creator-a4-module__index">' + escapeHtml(row.index || "-") + "</div>" +
          '<div class="creator-a4-module__pack">opak. ' + escapeHtml(formatPackageLabel(row)) + "</div>" +
          '<div class="creator-a4-module__price">' + priceMarkup + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function buildLayoutDrivenPreviewModule(row, index, styleLike) {
    const option = styleLike || getSelectedLayoutOption();
    return (
      '<article class="creator-a4-module-slot creator-a4-module-slot--style" style="--creator-preview-delay:' + (index * 90) + 'ms;" data-preview-style-shell="module" data-rowno="' + escapeHtml(row && row.rowNo || "") + '" data-style-id="' + escapeHtml(option && option.id || "") + '"></article>'
    );
  }

  function formatMagicFlavorLabel(flavor) {
    const safe = String(flavor || "").trim();
    if (!safe) return "AI Layout";
    const parts = safe.split("-").filter(Boolean);
    if (parts[0] === "generated") {
      return "AI " + parts.slice(2, 6).map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join(" ");
    }
    return parts.map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join(" ");
  }

  function uniquePreviewMagicRows(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map(function (value) {
        return Math.max(0, Math.floor(toFiniteNumber(value, 0)));
      })
      .filter(function (value) {
        return value > 0;
      })
      .slice(0, MAGIC_PREVIEW_MAX_ROWS);
  }

  function getPreviewMagicRecommendedRows(count) {
    if (count <= 0) return [0];
    if (count <= 3) return [count];
    if (count === 4) return [2, 2];
    if (count === 5) return [3, 2];
    if (count === 6) return [3, 3];
    if (count === 7) return [4, 3];
    if (count === 8) return [4, 4];
    const columns = Math.max(2, Math.ceil(Math.sqrt(count)));
    const rows = [];
    let left = count;
    while (left > 0) {
      const size = Math.min(columns, left);
      rows.push(size);
      left -= size;
    }
    return rows;
  }

  function buildPreviewMagicWaveRows(count) {
    if (count <= 4) return getPreviewMagicRecommendedRows(count);
    const rows = [];
    let left = count;
    let next = 1;
    while (left > 0) {
      const size = Math.min(left, next);
      rows.push(size);
      left -= size;
      next = next === 3 ? 2 : Math.min(3, next + 1);
    }
    return uniquePreviewMagicRows(rows);
  }

  function buildPreviewMagicPyramidRows(count) {
    if (count <= 4) return getPreviewMagicRecommendedRows(count);
    return uniquePreviewMagicRows([1].concat(getPreviewMagicRecommendedRows(count - 1)));
  }

  function buildPreviewMagicReversePyramidRows(count) {
    if (count <= 4) return getPreviewMagicRecommendedRows(count);
    return uniquePreviewMagicRows(getPreviewMagicRecommendedRows(count - 1).concat([1]));
  }

  function buildPreviewMagicTwinRows(count) {
    if (count <= 0) return [0];
    if (count <= 2) return [count];
    const rowCount = Math.min(MAGIC_PREVIEW_MAX_ROWS, Math.max(1, Math.ceil(count / 2)));
    const rows = Array(rowCount).fill(1);
    let remaining = count - rowCount;
    for (let i = 0; i < rowCount && remaining > 0; i += 1) {
      rows[i] += 1;
      remaining -= 1;
    }
    let cursor = 0;
    while (remaining > 0) {
      rows[cursor % rowCount] += 1;
      remaining -= 1;
      cursor += 2;
    }
    return uniquePreviewMagicRows(rows);
  }

  function buildAllPreviewMagicRowPartitions(count, maxRows) {
    const out = new Map();
    const safeMaxRows = Math.max(1, Math.min(MAGIC_PREVIEW_MAX_ROWS, toFiniteNumber(maxRows, MAGIC_PREVIEW_MAX_ROWS)));
    const maxRowSize = Math.max(1, Math.min(count, 8));
    const walk = function (left, acc) {
      if (left === 0) {
        const normalized = uniquePreviewMagicRows(acc);
        if (normalized.length && normalized.length <= safeMaxRows) {
          out.set(normalized.join("-"), normalized);
        }
        return;
      }
      if (acc.length >= safeMaxRows) return;
      for (let size = 1; size <= Math.min(left, maxRowSize); size += 1) {
        walk(left - size, acc.concat(size));
      }
    };
    walk(count, []);
    return Array.from(out.values());
  }

  function getPreviewMagicRowVariants(count) {
    const variants = new Map();
    const push = function (rows) {
      const normalized = uniquePreviewMagicRows(rows);
      const total = normalized.reduce(function (sum, value) {
        return sum + value;
      }, 0);
      if (!normalized.length || total !== count) return;
      variants.set(normalized.join("-"), normalized);
    };

    push(getPreviewMagicRecommendedRows(count));
    push(getPreviewMagicRecommendedRows(count).slice().reverse());
    push(buildPreviewMagicWaveRows(count));
    push(buildPreviewMagicPyramidRows(count));
    push(buildPreviewMagicReversePyramidRows(count));
    push(buildPreviewMagicTwinRows(count));
    buildAllPreviewMagicRowPartitions(count, MAGIC_PREVIEW_MAX_ROWS).forEach(push);
    return Array.from(variants.values());
  }

  function getPreviewMagicOrderStrategies(context) {
    const count = Number(context && context.modules && context.modules.length || 0);
    const strategies = ["preserve", "reverse", "outer-focus"];
    if (count >= 4) strategies.push("hero-first", "hero-last");
    return Array.from(new Set(strategies));
  }

  function getPreviewMagicVerticalModes(context) {
    const modes = ["center"];
    const pageHeight = toFiniteNumber(context && context.pageHeight, MAGIC_PREVIEW_PAGE_HEIGHT);
    const pageWidth = toFiniteNumber(context && context.pageWidth, MAGIC_PREVIEW_PAGE_WIDTH);
    if (pageHeight >= pageWidth || Number(context && context.modules && context.modules.length || 0) <= 4) {
      modes.push("top", "bottom");
    }
    return Array.from(new Set(modes));
  }

  function getPreviewMagicModuleArea(module) {
    return Math.max(1, (Number(module && module.rect && module.rect.width) || 1) * (Number(module && module.rect && module.rect.height) || 1));
  }

  function getOrderedPreviewMagicModules(modules, strategy) {
    const items = (Array.isArray(modules) ? modules : []).map(function (module) {
      return {
        key: module.key,
        sourceIndex: module.sourceIndex,
        rect: {
          width: Number(module && module.rect && module.rect.width) || CUSTOM_STYLE_CARD_BASE_WIDTH,
          height: Number(module && module.rect && module.rect.height) || CUSTOM_STYLE_CARD_BASE_HEIGHT
        }
      };
    });
    const byAreaDesc = items.slice().sort(function (a, b) {
      return getPreviewMagicModuleArea(b) - getPreviewMagicModuleArea(a);
    });
    switch (strategy) {
      case "reverse":
        return items.reverse();
      case "hero-first":
        return byAreaDesc;
      case "hero-last":
        return byAreaDesc.slice(1).concat(byAreaDesc[0] || []);
      case "outer-focus": {
        const sorted = byAreaDesc.slice();
        const result = [];
        let left = 0;
        let right = sorted.length - 1;
        while (left <= right) {
          result.push(sorted[left]);
          left += 1;
          if (left <= right) {
            result.push(sorted[right]);
            right -= 1;
          }
        }
        return result;
      }
      default:
        return items;
    }
  }

  function getAutoOuterPadding(pageSize, preferred, ratio, floor) {
    const smartSize = Math.round(pageSize * ratio);
    return Math.max(floor, Math.min(preferred, smartSize));
  }

  function buildPreviewMagicLayoutPlan(context, rowsConfig, options) {
    const modules = getOrderedPreviewMagicModules(context.modules, options.orderStrategy || "preserve");
    const rows = [];
    let cursor = 0;
    rowsConfig.forEach(function (count) {
      rows.push({
        items: modules.slice(cursor, cursor + count),
        startIndex: cursor
      });
      cursor += count;
    });

    const requestedMarginX = Math.max(0, toFiniteNumber(options.marginX, 0));
    const requestedMarginY = Math.max(0, toFiniteNumber(options.marginY, 0));
    const effectiveMarginX = options.marginMode === "auto"
      ? getAutoOuterPadding(context.pageWidth, requestedMarginX, 0.028, 12)
      : requestedMarginX;
    const effectiveMarginY = options.marginMode === "auto"
      ? getAutoOuterPadding(context.pageHeight, requestedMarginY, 0.03, 14)
      : requestedMarginY;
    const usableWidth = Math.max(80, context.pageWidth - (effectiveMarginX * 2));
    const usableHeight = Math.max(80, context.pageHeight - (effectiveMarginY * 2));
    const totalGapHeight = Math.max(0, rows.length - 1) * Math.max(0, toFiniteNumber(options.gapY, 0));
    const targetRowHeight = Math.max(44, (usableHeight - totalGapHeight) / Math.max(1, rows.length));
    const rowData = rows.map(function (rowEntry, rowIndex) {
      const row = rowEntry.items;
      const rowStartIndex = rowEntry.startIndex;
      const rowMaxHeight = row.reduce(function (acc, item) {
        return Math.max(acc, item.rect.height);
      }, 0);
      const normalizedScales = row.map(function (item) {
        return rowMaxHeight / Math.max(1, Number(item.rect.height) || 1);
      });
      const moduleScaleBiases = row.map(function (_item, index) {
        const globalIndex = rowStartIndex + index;
        const list = Array.isArray(options.moduleScaleBiases) ? options.moduleScaleBiases : [];
        return Math.max(0.22, Math.min(1.65, toFiniteNumber(list[globalIndex], 1)));
      });
      const normalizedWidth = row.reduce(function (acc, item, index) {
        return acc + (item.rect.width * normalizedScales[index] * moduleScaleBiases[index]);
      }, 0);
      const widthFitScale = row.length
        ? (usableWidth - Math.max(0, row.length - 1) * options.gapX) / Math.max(1, normalizedWidth)
        : 1;
      const biasedRowHeight = row.reduce(function (acc, _item, index) {
        return Math.max(acc, rowMaxHeight * moduleScaleBiases[index]);
      }, 0);
      const heightFitScale = targetRowHeight / Math.max(1, biasedRowHeight);
      const fitScale = Math.min(widthFitScale, heightFitScale);
      const baseRowScale = options.scaleMode === "fit" ? Math.max(0.12, Math.min(4, fitScale)) : 1;
      const rowScaleBiases = Array.isArray(options.rowScaleBiases) ? options.rowScaleBiases : [];
      const rowScaleBias = Math.max(0.18, Math.min(1.5, toFiniteNumber(rowScaleBiases[rowIndex], toFiniteNumber(options.scaleBias, 1))));
      const rowScale = baseRowScale * rowScaleBias;
      const moduleScales = row.map(function (_item, index) {
        return normalizedScales[index] * moduleScaleBiases[index] * rowScale;
      });
      const rawWidth = row.reduce(function (acc, item, index) {
        return acc + (item.rect.width * moduleScales[index]);
      }, 0) + Math.max(0, row.length - 1) * options.gapX;
      const rawHeight = row.reduce(function (acc, item, index) {
        return Math.max(acc, item.rect.height * moduleScales[index]);
      }, 0);
      return {
        row: row,
        rowIndex: rowIndex,
        moduleScales: moduleScales,
        rawWidth: rawWidth,
        rawHeight: rawHeight
      };
    });

    let totalHeight = rowData.reduce(function (acc, entry) {
      return acc + entry.rawHeight;
    }, 0) + Math.max(0, rowData.length - 1) * options.gapY;
    if (totalHeight > usableHeight && options.scaleMode === "fit") {
      const verticalFactor = usableHeight / Math.max(1, totalHeight);
      rowData.forEach(function (entry) {
        entry.moduleScales = entry.moduleScales.map(function (scale) {
          return Math.max(0.2, scale * verticalFactor);
        });
        entry.rawWidth = entry.row.reduce(function (acc, item, index) {
          return acc + (item.rect.width * entry.moduleScales[index]);
        }, 0) + Math.max(0, entry.row.length - 1) * options.gapX;
        entry.rawHeight = entry.row.reduce(function (acc, item, index) {
          return Math.max(acc, item.rect.height * entry.moduleScales[index]);
        }, 0);
      });
      totalHeight = rowData.reduce(function (acc, entry) {
        return acc + entry.rawHeight;
      }, 0) + Math.max(0, rowData.length - 1) * options.gapY;
    }

    if (totalHeight > usableHeight + 0.5) {
      return { error: "Layout overflow." };
    }

    let startY = effectiveMarginY;
    if (options.marginMode === "auto") {
      const freeVerticalSpace = Math.max(0, usableHeight - totalHeight);
      if (options.verticalMode === "bottom") {
        startY = effectiveMarginY + freeVerticalSpace;
      } else if (options.verticalMode === "center") {
        startY = effectiveMarginY + (freeVerticalSpace / 2);
      }
    }

    const slots = [];
    let currentY = startY;
    rowData.forEach(function (entry) {
      const rowWidth = entry.rawWidth;
      const rowHeight = entry.rawHeight;
      let currentX = effectiveMarginX;
      const rowAlignModes = Array.isArray(options.rowAlignModes) ? options.rowAlignModes : [];
      const rowAlign = rowAlignModes[entry.rowIndex] || options.align;
      if (rowAlign === "center") currentX += Math.max(0, (usableWidth - rowWidth) / 2);
      if (rowAlign === "right") currentX += Math.max(0, usableWidth - rowWidth);
      entry.row.forEach(function (module, index) {
        const width = module.rect.width * entry.moduleScales[index];
        const height = module.rect.height * entry.moduleScales[index];
        slots.push({
          rowIndex: entry.rowIndex,
          sourceIndex: module.sourceIndex,
          key: module.key,
          x: currentX,
          y: currentY + Math.max(0, (rowHeight - height) / 2),
          width: width,
          height: height
        });
        currentX += width + options.gapX;
      });
      currentY += rowHeight + options.gapY;
    });

    return {
      slots: slots,
      rowData: rowData,
      usableWidth: usableWidth
    };
  }

  function scorePreviewMagicPreset(plan, context, preset) {
    if (!plan || !Array.isArray(plan.rowData) || !plan.rowData.length) return Number.NEGATIVE_INFINITY;
    const usableWidth = Math.max(1, plan.usableWidth || 1);
    const totalHeight = plan.rowData.reduce(function (acc, entry) {
      return acc + entry.rawHeight;
    }, 0);
    const widestRow = plan.rowData.reduce(function (acc, entry) {
      return Math.max(acc, entry.rawWidth);
    }, 0);
    const widthUsage = Math.min(1.15, widestRow / usableWidth);
    const rowHeights = plan.rowData.map(function (entry) {
      return entry.rawHeight;
    }).filter(function (value) {
      return value > 0;
    });
    const avgHeight = rowHeights.reduce(function (acc, value) {
      return acc + value;
    }, 0) / Math.max(1, rowHeights.length);
    const variance = rowHeights.reduce(function (acc, value) {
      return acc + Math.abs(value - avgHeight);
    }, 0) / Math.max(1, rowHeights.length);
    const rowBalance = 1 - Math.min(1, variance / Math.max(40, avgHeight || 1));
    const density = Math.min(1.2, totalHeight / Math.max(1, context.pageHeight));
    const rowCount = plan.rowData.length;
    const compactness = 1 - Math.min(1, Math.abs(rowCount - Math.max(1, Math.round(Math.sqrt(context.modules.length)))) / 4);
    const alignBoost = preset.options.align === "center" ? 0.08 : 0;
    const autoBoost = preset.options.marginMode === "auto" ? 0.06 : 0;
    const verticalBoost = rowCount === 1 && preset.options.verticalMode && preset.options.verticalMode !== "center" ? 0.03 : 0;
    const rowScaleBiases = Array.isArray(preset.options.rowScaleBiases) ? preset.options.rowScaleBiases : [];
    const moduleScaleBiases = Array.isArray(preset.options.moduleScaleBiases) ? preset.options.moduleScaleBiases : [];
    const rowScaleSpread = rowScaleBiases.length
      ? Math.max.apply(null, rowScaleBiases) - Math.min.apply(null, rowScaleBiases)
      : Math.abs(1 - toFiniteNumber(preset.options.scaleBias, 1));
    const moduleScaleSpread = moduleScaleBiases.length
      ? Math.max.apply(null, moduleScaleBiases) - Math.min.apply(null, moduleScaleBiases)
      : 0;
    const sizeDiversityBoost = Math.min(0.22, (rowScaleSpread * 0.12) + (moduleScaleSpread * 0.09));
    const asymmetryBoost = Array.isArray(preset.rows) && preset.rows.length && (Math.max.apply(null, preset.rows) - Math.min.apply(null, preset.rows)) >= 1
      ? 0.04
      : 0;
    return (widthUsage * 0.4) + (rowBalance * 0.14) + (density * 0.16) + (compactness * 0.12) + alignBoost + autoBoost + verticalBoost + sizeDiversityBoost + asymmetryBoost;
  }

  function buildPreviewMagicGeneratedProfiles(context) {
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const compact = Math.max(14, Math.round(shortSide * 0.035));
    const standard = Math.max(22, Math.round(shortSide * 0.06));
    const airy = Math.max(32, Math.round(shortSide * 0.09));
    const spacious = Math.max(44, Math.round(shortSide * 0.13));
    const isSingle = context.modules.length === 1;
    const alignModes = ["left", "center", "right"];
    const verticalModes = isSingle ? ["top", "center", "bottom"] : ["center", "top", "bottom"];
    const gapPresets = [
      { name: "micro", gapX: isSingle ? 0 : 10, gapY: isSingle ? 0 : 12 },
      { name: "tight", gapX: isSingle ? 0 : 16, gapY: isSingle ? 0 : 18 },
      { name: "medium", gapX: isSingle ? 0 : 24, gapY: isSingle ? 0 : 28 },
      { name: "airy", gapX: isSingle ? 0 : 34, gapY: isSingle ? 0 : 38 }
    ];
    const marginPresets = [
      { name: "compact", marginX: compact, marginY: compact },
      { name: "standard", marginX: standard, marginY: standard },
      { name: "airy", marginX: airy, marginY: airy },
      { name: "spacious", marginX: spacious, marginY: spacious }
    ];
    const scaleBiases = isSingle ? [0.46, 0.58, 0.72, 0.88, 1.02] : [0.62, 0.76, 0.9, 1, 1.08];
    const profiles = [];
    const seen = new Set();

    alignModes.forEach(function (align) {
      verticalModes.forEach(function (verticalMode) {
        gapPresets.forEach(function (gap) {
          marginPresets.forEach(function (margin) {
            scaleBiases.forEach(function (scaleBias) {
              const flavor = "generated-" + context.modules.length + "-" + align + "-" + verticalMode + "-" + gap.name + "-" + margin.name + "-" + Math.round(scaleBias * 100);
              if (seen.has(flavor)) return;
              seen.add(flavor);
              profiles.push({
                flavor: flavor,
                align: align,
                verticalMode: verticalMode,
                marginMode: "auto",
                scaleMode: "fit",
                orderStrategy: "preserve",
                gapX: gap.gapX,
                gapY: gap.gapY,
                marginX: margin.marginX,
                marginY: margin.marginY,
                scaleBias: scaleBias
              });
            });
          });
        });
      });
    });

    return profiles;
  }

  function buildPreviewMagicCandidatePresets(context) {
    const rowVariants = getPreviewMagicRowVariants(context.modules.length);
    const profiles = buildPreviewMagicGeneratedProfiles(context);
    const orderStrategies = getPreviewMagicOrderStrategies(context);
    const verticalModes = getPreviewMagicVerticalModes(context);
    const seen = new Set();
    const presets = [];

    profiles.forEach(function (profile, profileIndex) {
      const rowsList = Array.isArray(profile.fixedRows) && profile.fixedRows.length
        ? [uniquePreviewMagicRows(profile.fixedRows)]
        : rowVariants;
      rowsList.forEach(function (rows, rowsIndex) {
        if (!rows.length) return;
        const total = rows.reduce(function (sum, value) {
          return sum + value;
        }, 0);
        if (total !== context.modules.length) return;
        orderStrategies.forEach(function (orderStrategy, orderIndex) {
          (profile.verticalMode ? [profile.verticalMode] : verticalModes).forEach(function (verticalMode, verticalIndex) {
            const options = {
              gapX: toFiniteNumber(profile.gapX, 24),
              gapY: toFiniteNumber(profile.gapY, 28),
              marginX: toFiniteNumber(profile.marginX, 36),
              marginY: toFiniteNumber(profile.marginY, 36),
              marginMode: profile.marginMode || "auto",
              align: profile.align || "center",
              scaleMode: profile.scaleMode || "fit",
              orderStrategy: profile.orderStrategy || orderStrategy,
              verticalMode: verticalMode,
              scaleBias: toFiniteNumber(profile.scaleBias, 1),
              rowAlignModes: profile.rowAlignModes,
              rowScaleBiases: profile.rowScaleBiases,
              moduleScaleBiases: profile.moduleScaleBiases
            };
            const signature = [
              rows.join("-"),
              options.align,
              options.orderStrategy,
              options.verticalMode,
              Math.round(options.gapX),
              Math.round(options.gapY),
              Math.round(options.marginX),
              Math.round(options.marginY),
              Math.round(options.scaleBias * 100),
              profile.flavor,
              profileIndex,
              rowsIndex,
              orderIndex,
              verticalIndex
            ].join("|");
            if (seen.has(signature)) return;
            seen.add(signature);
            presets.push({
              rows: rows,
              options: options,
              signature: signature,
              flavor: profile.flavor
            });
          });
        });
      });
    });

    return presets;
  }

  function buildPreviewMagicContext(rows) {
    const modules = (Array.isArray(rows) ? rows : []).map(function (row, index) {
      return {
        key: String(row && row.rowNo || index),
        sourceIndex: index,
        rect: {
          width: CUSTOM_STYLE_CARD_BASE_WIDTH,
          height: CUSTOM_STYLE_CARD_BASE_HEIGHT
        }
      };
    });
    return {
      modules: modules,
      pageWidth: MAGIC_PREVIEW_PAGE_WIDTH,
      pageHeight: MAGIC_PREVIEW_PAGE_HEIGHT
    };
  }

  function buildPreviewMagicContextKey(rows) {
    return String(previewState.selectedLayoutId || "") + "::" + (Array.isArray(rows) ? rows.map(function (row) {
      return String(row && row.rowNo || "");
    }).join(",") : "");
  }

  function chooseMagicLayoutPreset(rows, forceNew) {
    const context = buildPreviewMagicContext(rows);
    if (!context.modules.length) return null;
    const presets = buildPreviewMagicCandidatePresets(context);
    const scored = presets.map(function (preset) {
      const plan = buildPreviewMagicLayoutPlan(context, preset.rows, preset.options);
      if (plan && !plan.error) {
        return {
          preset: preset,
          plan: plan,
          score: scorePreviewMagicPreset(plan, context, preset)
        };
      }
      return null;
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score;
    });
    if (!scored.length) return null;

    const history = Array.isArray(previewState.magicLayoutHistory) ? previewState.magicLayoutHistory : [];
    let pool = scored;
    if (forceNew) {
      const filtered = scored.filter(function (item) {
        return history.indexOf(item.preset.signature) === -1;
      });
      if (filtered.length) pool = filtered;
    }
    const topPool = pool.slice(0, Math.min(24, pool.length));
    const pick = topPool[Math.floor(Math.random() * topPool.length)] || topPool[0];
    if (!pick) return null;

    previewState.magicLayoutPreset = {
      signature: pick.preset.signature,
      flavor: pick.preset.flavor,
      rows: pick.preset.rows.slice(),
      options: { ...pick.preset.options },
      plan: pick.plan
    };
    previewState.magicLayoutHistory = [pick.preset.signature].concat(history.filter(function (item) {
      return item !== pick.preset.signature;
    })).slice(0, 18);
    previewState.magicLayoutContextKey = buildPreviewMagicContextKey(rows);
    previewState.magicProfileId = pick.preset.flavor;
    return previewState.magicLayoutPreset;
  }

  function ensureMagicLayoutPreset(rows) {
    const currentKey = buildPreviewMagicContextKey(rows);
    const currentPreset = previewState.magicLayoutPreset;
    const hasSameContext = currentPreset && previewState.magicLayoutContextKey === currentKey;
    if (hasSameContext && currentPreset.plan && Array.isArray(currentPreset.plan.slots)) {
      return currentPreset;
    }
    return chooseMagicLayoutPreset(rows, false);
  }

  function buildMagicPreviewModules(rows, styleLike) {
    const option = styleLike || getSelectedLayoutOption();
    const preset = ensureMagicLayoutPreset(rows);
    if (!preset || !preset.plan || !Array.isArray(preset.plan.slots) || !preset.plan.slots.length) {
      return "";
    }
    return preset.plan.slots.map(function (slot, index) {
      return (
        '<article class="creator-a4-module-slot creator-a4-module-slot--magic" style="--creator-preview-delay:' + (index * 90) + 'ms;left:' + ((slot.x / MAGIC_PREVIEW_PAGE_WIDTH) * 100).toFixed(4) + '%;top:' + ((slot.y / MAGIC_PREVIEW_PAGE_HEIGHT) * 100).toFixed(4) + '%;width:' + ((slot.width / MAGIC_PREVIEW_PAGE_WIDTH) * 100).toFixed(4) + '%;height:' + ((slot.height / MAGIC_PREVIEW_PAGE_HEIGHT) * 100).toFixed(4) + '%;" data-preview-style-shell="module" data-rowno="' + escapeHtml(rows[slot.sourceIndex] && rows[slot.sourceIndex].rowNo || "") + '" data-style-id="' + escapeHtml(option && option.id || "") + '"></article>'
      );
    }).join("");
  }

  function goToPreviewPage(direction) {
    const pages = getAvailablePreviewPages();
    if (!pages.length) return;
    const current = Number(excelState.activePage);
    const currentIndex = pages.indexOf(current);
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = Math.max(0, Math.min(pages.length - 1, fallbackIndex + direction));
    const nextPage = pages[nextIndex];
    if (!Number.isFinite(nextPage)) return;
    excelState.activePage = nextPage;
    syncAllPreviewPanels();
    if (!excelStats.hidden) {
      renderPageDetails(nextPage);
    }
  }

  function buildCatalogPreviewHtml(rows, pageNo, options) {
    const settings = options || {};
    const isMagicPreview = settings.variant === "magic" && previewState.stage === "magic";
    const allRows = Array.isArray(rows) ? rows : [];
    const pageNumbers = getAvailablePreviewPages();
    const safePageNo = Number(pageNo);
    const rowsForPage = Number.isFinite(safePageNo) && safePageNo > 0
      ? allRows.filter(function (row) {
          return Number(row && row.assignedPageNumber) === safePageNo;
        })
      : allRows.slice(0, 8);

    const sample = rowsForPage.slice(0, 8);
    if (!sample.length) {
      return '<div class="creator-catalog-preview__empty">Brak danych do podglądu.</div>';
    }

    const previewPageNo = Number.isFinite(safePageNo) && safePageNo > 0
      ? safePageNo
      : (pageNumbers[0] || Number(sample[0] && sample[0].assignedPageNumber) || 1);
    const pageIndex = pageNumbers.indexOf(previewPageNo);
    const currentPageIndex = pageIndex >= 0 ? pageIndex : 0;
    const canGoPrev = currentPageIndex > 0;
    const canGoNext = currentPageIndex >= 0 && currentPageIndex < pageNumbers.length - 1;

    const previewRowsCount = Math.max(3, Math.min(4, Math.ceil(sample.length / 2)));
    const totalOnPage = rowsForPage.length || sample.length;
    const previewMetaText = totalOnPage > sample.length
      ? "pokazano " + sample.length + " z " + totalOnPage + " produktów"
      : totalOnPage + " produktów";

    const selectedLayout = getSelectedLayoutOption();
    const canRenderDynamicLayout = (previewState.stage === "layout" || previewState.stage === "magic") && styleHasDirectPreview(selectedLayout);
    const cardsHtml = canRenderDynamicLayout
      ? (isMagicPreview
        ? buildMagicPreviewModules(sample, selectedLayout)
        : sample.map(function (row, index) {
            return buildLayoutDrivenPreviewModule(row, index, selectedLayout);
          }).join(""))
      : sample.map(function (row, index) {
          return buildLegacyPreviewModule(row, index, isMagicPreview);
        }).join("");
    const pageBodyHtml = canRenderDynamicLayout && isMagicPreview
      ? '<div class="creator-a4-page__canvas">' + cardsHtml + "</div>"
      : '<div class="creator-a4-page__grid" style="--creator-preview-rows:' + previewRowsCount + ';">' + cardsHtml + "</div>";

    return (
      '<div class="creator-a4-stage">' +
        '<div class="creator-a4-stage__meta">' +
          '<span class="creator-a4-stage__label">' + getPreviewStageLabel() + "</span>" +
          '<span class="creator-a4-stage__page">Strona ' + previewPageNo + " - " + previewMetaText + "</span>" +
        "</div>" +
        (isMagicPreview
          ? '<div class="creator-a4-stage__magic-head"><span class="creator-a4-stage__magic-style">' + escapeHtml(getSelectedLayoutOption().label) + '</span><span class="creator-a4-stage__magic-flavor">' + escapeHtml(getActiveMagicProfile().label) + "</span></div>"
          : "") +
        '<div class="creator-a4-stage__pager">' +
          '<button class="creator-a4-stage__pager-btn" type="button" data-preview-nav="prev"' + (canGoPrev ? "" : " disabled") + '>‹ Poprzednia</button>' +
          '<div class="creator-a4-stage__pager-state">Strona ' + (pageNumbers.length ? (currentPageIndex + 1) : 1) + " z " + Math.max(1, pageNumbers.length) + "</div>" +
          '<button class="creator-a4-stage__pager-btn" type="button" data-preview-nav="next"' + (canGoNext ? "" : " disabled") + '>Następna ›</button>' +
        "</div>" +
        '<div class="creator-a4-page ' + getPreviewLayoutClass() + (isMagicPreview ? (' ' + getPreviewMagicClass()) : "") + '">' +
          pageBodyHtml +
        "</div>" +
      "</div>"
    );
  }

  function syncAllPreviewPanels() {
    const pages = getAvailablePreviewPages();
    if (pages.length) {
      const activePage = Number(excelState.activePage);
      if (!Number.isFinite(activePage) || pages.indexOf(activePage) === -1) {
        excelState.activePage = pages[0];
      }
    }
    previewPanels.forEach(function (panel) {
      const html = buildCatalogPreviewHtml(excelState.rows, excelState.activePage, {
        variant: panel.variant
      });
      panel.list.innerHTML = html;
      panel.label.textContent = panel.variant === "magic" && previewState.stage === "magic"
        ? "Etap Magic Layout"
        : "Postęp kreatora";
    });
    renderLayoutOptions();
    magicSelectedStyle.textContent = getSelectedLayoutOption().label;
    magicFlavorLabel.textContent = getActiveMagicProfile().label;
    schedulePreviewHydration();
  }

  function setPreviewProgress(value, shouldAnimate) {
    const safeTarget = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    if (!shouldAnimate) {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      previewState.currentProgress = safeTarget;
      previewPanels.forEach(function (panel) {
        panel.value.textContent = safeTarget + "%";
        panel.bar.style.width = safeTarget + "%";
      });
      return;
    }
    animateCatalogProgress(safeTarget);
  }

  function animateCatalogProgress(targetPercent) {
    const safeTarget = Math.max(0, Math.min(100, Math.round(Number(targetPercent) || 0)));
    if (progressTimer) clearInterval(progressTimer);
    let current = previewState.currentProgress;
    if (!Number.isFinite(current)) current = 0;
    progressTimer = setInterval(function () {
      if (current >= safeTarget) {
        clearInterval(progressTimer);
        progressTimer = null;
        previewState.currentProgress = safeTarget;
        return;
      }
      current += 1;
      previewState.currentProgress = current;
      previewPanels.forEach(function (panel) {
        panel.value.textContent = current + "%";
        panel.bar.style.width = current + "%";
      });
    }, 26);
  }

  function releasePreviewImages() {
    imageState.objectUrls.forEach(function (url) {
      try {
        URL.revokeObjectURL(url);
      } catch (_err) {}
    });
    imageState.objectUrls = [];
    excelState.rows.forEach(function (row) {
      if (row) {
        row.previewImageUrl = "";
        row.previewImageName = "";
      }
    });
    continueToLayoutBtn.hidden = true;
  }

  function mapImageFilesToRows(files) {
    const rows = Array.isArray(excelState.rows) ? excelState.rows.filter(Boolean) : [];
    const images = Array.from(files || []);
    const assignments = [];
    const usedRows = new Set();
    const usedFiles = new Set();

    images.forEach(function (file) {
      const fileKey = normalizeFileKey(file && file.name);
      if (!fileKey) return;
      const match = rows.find(function (row) {
        if (!row || usedRows.has(row.rowNo)) return false;
        const indexKey = normalizeFileKey(row.index);
        const eanKey = normalizeFileKey(row.ean);
        return (indexKey && fileKey.includes(indexKey)) || (eanKey && fileKey.includes(eanKey));
      });
      if (!match) return;
      usedRows.add(match.rowNo);
      usedFiles.add(file);
      assignments.push({ row: match, file: file });
    });

    images.forEach(function (file) {
      if (usedFiles.has(file)) return;
      const nextRow = rows.find(function (row) {
        return row && !usedRows.has(row.rowNo);
      });
      if (!nextRow) return;
      usedRows.add(nextRow.rowNo);
      assignments.push({ row: nextRow, file: file });
    });

    return assignments;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  async function animateImageAssignments(assignments) {
    imageState.importRunId += 1;
    const runId = imageState.importRunId;

    previewState.stage = "images";
    previewState.imageStatus = "assigning";
    imagesFeedback.textContent = "AI dopasowuje zdjęcia do produktów...";
    syncAllPreviewPanels();

    const targetProgress = Math.min(72, Math.max(46, previewState.currentProgress + Math.min(28, assignments.length * 3)));
    setPreviewProgress(targetProgress, true);

    imagesFeedback.textContent = "AI przypina zdjęcia do katalogu...";

    for (let i = 0; i < assignments.length; i += 1) {
      if (runId !== imageState.importRunId) return;
      const assignment = assignments[i];
      if (!assignment || !assignment.row || !assignment.file) continue;
      const objectUrl = URL.createObjectURL(assignment.file);
      imageState.objectUrls.push(objectUrl);
      assignment.row.previewImageUrl = objectUrl;
      assignment.row.previewImageName = assignment.file.name || "";
    }

    syncAllPreviewPanels();
    await wait(90);

    if (runId !== imageState.importRunId) return;
    previewState.imageStatus = "done";
    continueToLayoutBtn.hidden = false;
    imagesFeedback.textContent = "Zdjęcia zostały dodane do podglądu katalogu.";
    syncAllPreviewPanels();
  }

  if (openButton) {
    openButton.addEventListener("click", openModal);
  }
  closeButton.addEventListener("click", closeModal);
  cancelButton.addEventListener("click", closeModal);

  optionButtons.forEach((button) => {
    button.addEventListener("click", function () {
      updateSelection(button.dataset.option || "classic");
    });
  });

  sourceOptionButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const selected = button.dataset.sourceOption || "excel";
      updateSourceSelection(selected);
    });
  });

  continueSourceModalBtn.addEventListener("click", function () {
    if (sourceState.selected === "excel") {
      openExcelModal();
      return;
    }
    sourceFeedback.textContent = "Dalej: tryb ręczny będzie w następnym kroku.";
  });

  excelFileInput.addEventListener("change", function () {
    const picked = excelFileInput.files && excelFileInput.files[0] ? excelFileInput.files[0].name : "";
    excelFileLabel.textContent = picked || "Wybierz plik Excel";
  });

  excelImportBtn.addEventListener("click", function () {
    if (!excelFileInput.files || !excelFileInput.files[0]) {
      excelFeedback.textContent = "Najpierw wybierz plik Excel.";
      return;
    }
    const file = excelFileInput.files[0];
    excelFeedback.textContent = "Wczytywanie pliku: " + file.name + "...";
    parseExcelRowsLikeCustomStyle(file)
      .then(function (parsedRows) {
        releasePreviewImages();
        const importedCount = Array.isArray(parsedRows) ? parsedRows.length : 0;
        excelState.rows = Array.isArray(parsedRows) ? parsedRows.slice() : [];
        const pageCounts = new Map();
        let assignedCount = 0;

        parsedRows.forEach(function (row) {
          const pageNo = Number(row && row.assignedPageNumber);
          if (!Number.isFinite(pageNo) || pageNo <= 0) return;
          assignedCount += 1;
          pageCounts.set(pageNo, (pageCounts.get(pageNo) || 0) + 1);
        });

        const unassignedCount = Math.max(0, importedCount - assignedCount);
        const sortedPages = Array.from(pageCounts.entries()).sort(function (a, b) {
          return a[0] - b[0];
        });
        excelFeedback.textContent = "Import zakończony pomyślnie.";
        const defaultPreviewPage = sortedPages.length ? sortedPages[0][0] : null;
        excelState.activePage = defaultPreviewPage;
        previewState.stage = "excel";
        previewState.imageStatus = "idle";
        syncAllPreviewPanels();
        const progressTarget = importedCount > 0
          ? Math.min(36, Math.max(14, Math.round((assignedCount / Math.max(1, importedCount)) * 18 + Math.min(12, sortedPages.length))))
          : 0;
        setPreviewProgress(progressTarget, true);

        const pageItemsHtml = sortedPages.length
          ? sortedPages.map(function (entry) {
              const pageNo = entry[0];
              const productCount = entry[1];
              const noun = productCount === 1 ? "produkt" : (productCount >= 2 && productCount <= 4 ? "produkty" : "produktów");
              return '<button class="creator-excel-pages__item" type="button" data-page="' + pageNo + '"><span>Strona <b>' + pageNo + "</b></span><span>" + productCount + " " + noun + "</span></button>";
            }).join("")
          : '<div class="creator-excel-pages__item is-disabled"><span>Brak kolumny Strona</span><span>0</span></div>';

        excelStats.innerHTML =
          '<div class="creator-excel-stats__grid">' +
            '<div class="creator-excel-stats__card"><div class="creator-excel-stats__label">Zaimportowano</div><div class="creator-excel-stats__value">' + importedCount + "</div></div>" +
            '<div class="creator-excel-stats__card"><div class="creator-excel-stats__label">Przypisane do stron</div><div class="creator-excel-stats__value">' + assignedCount + "</div></div>" +
            '<div class="creator-excel-stats__card"><div class="creator-excel-stats__label">Bez strony</div><div class="creator-excel-stats__value">' + unassignedCount + "</div></div>" +
            '<div class="creator-excel-stats__card"><div class="creator-excel-stats__label">Wykryte strony</div><div class="creator-excel-stats__value">' + sortedPages.length + "</div></div>" +
          "</div>" +
          '<div class="creator-excel-pages">' +
            '<div class="creator-excel-pages__title">Podział na strony</div>' +
            '<div class="creator-excel-pages__list">' + pageItemsHtml + "</div>" +
            '<div id="creatorExcelPageDetails" class="creator-excel-products">' +
              '<div class="creator-excel-hint">Kliknij wybraną stronę z listy powyżej, aby zobaczyć produkty (indeks, nazwa i kod EAN).</div>' +
            "</div>" +
          "</div>";
        excelStats.hidden = true;
        showProductsBtn.hidden = false;
        showProductsBtn.textContent = "Zobacz produkty";
        continueToImagesBtn.hidden = false;
      })
      .catch(function (err) {
        const msg = err && err.message ? err.message : String(err);
        excelFeedback.textContent = "Błąd importu Excela: " + msg;
        excelStats.hidden = true;
        excelStats.innerHTML = "";
        showProductsBtn.hidden = true;
        continueToImagesBtn.hidden = true;
        setPreviewProgress(0, false);
        syncAllPreviewPanels();
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
      });
  });

  imagesFileInput.addEventListener("change", function () {
    const files = Array.from(imagesFileInput.files || []);
    if (!files.length) {
      imagesFileLabel.textContent = "Wybierz zdjęcia produktów";
      return;
    }
    imagesFileLabel.textContent = files.length === 1
      ? files[0].name
      : ("Wybrano zdjęcia: " + files.length);
  });

  imagesImportBtn.addEventListener("click", function () {
    const files = Array.from(imagesFileInput.files || []);
    if (!excelState.rows.length) {
      imagesFeedback.textContent = "Najpierw zaimportuj produkty z pliku Excel.";
      return;
    }
    if (!files.length) {
      imagesFeedback.textContent = "Najpierw wybierz zdjęcia produktów.";
      return;
    }

    releasePreviewImages();
    continueToLayoutBtn.hidden = true;
    const assignments = mapImageFilesToRows(files);
    if (!assignments.length) {
      imagesFeedback.textContent = "Nie udało się dopasować zdjęć do produktów.";
      syncAllPreviewPanels();
      return;
    }

    animateImageAssignments(assignments).catch(function (err) {
      const msg = err && err.message ? err.message : String(err);
      imagesFeedback.textContent = "Błąd importu zdjęć: " + msg;
    });
  });

  excelStats.addEventListener("click", function (event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const pageButton = target.closest(".creator-excel-pages__item[data-page]");
    if (!pageButton) return;
    const pageNo = Number(pageButton.getAttribute("data-page") || "");
    if (!Number.isFinite(pageNo) || pageNo <= 0) return;
    renderPageDetails(pageNo);
  });

  function persistEditableCell(target) {
    if (!(target instanceof HTMLElement) || !target.classList.contains("creator-excel-cell")) return;

    const rowNo = Number(target.getAttribute("data-rowno") || "");
    const field = String(target.getAttribute("data-field") || "").trim();
    if (!Number.isFinite(rowNo) || !field) return;

    const nextValue = sanitizeEditableText(target.innerText);
    target.textContent = nextValue;

    const rowRef = excelState.rows.find(function (row) {
      return Number(row && row.rowNo) === rowNo;
    });
    if (!rowRef) return;

    rowRef[field] = nextValue;
    if (field === "index") {
      rowRef.indexRaw = nextValue;
      rowRef.index = nextValue;
    }

    if ((field === "name" || field === "index") && Number.isFinite(Number(excelState.activePage))) {
      syncAllPreviewPanels();
    }
  }

  excelStats.addEventListener("focusout", function (event) {
    const target = event.target;
    persistEditableCell(target);
  });

  excelStats.addEventListener("input", function (event) {
    const target = event.target;
    persistEditableCell(target);
  });

  showProductsBtn.addEventListener("click", function () {
    const willShow = excelStats.hidden;
    excelStats.hidden = !willShow ? true : false;
    showProductsBtn.textContent = willShow ? "Ukryj produkty" : "Zobacz produkty";
  });

  continueToImagesBtn.addEventListener("click", openImagesModal);
  continueToLayoutBtn.addEventListener("click", openLayoutModal);
  continueToMagicBtn.addEventListener("click", openMagicModal);
  closeExcelModalBtn.addEventListener("click", closeExcelModalAndReturn);
  backToSourceModalBtn.addEventListener("click", closeExcelModalAndReturn);
  excelModal.addEventListener("click", function (event) {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeExcelModal === "true") {
      closeExcelModalAndReturn();
    }
  });

  closeImagesModalBtn.addEventListener("click", closeImagesModalAndReturn);
  backToExcelModalBtn.addEventListener("click", closeImagesModalAndReturn);
  imagesModal.addEventListener("click", function (event) {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeImagesModal === "true") {
      closeImagesModalAndReturn();
    }
  });

  closeLayoutModalBtn.addEventListener("click", closeLayoutModalAndReturn);
  backToImagesModalBtn.addEventListener("click", closeLayoutModalAndReturn);
  layoutModal.addEventListener("click", function (event) {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeLayoutModal === "true") {
      closeLayoutModalAndReturn();
    }
  });

  layoutOptionsHost.addEventListener("click", function (event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const optionButton = target.closest("[data-layout-option]");
    if (!(optionButton instanceof HTMLElement)) return;
    const nextLayoutId = String(optionButton.getAttribute("data-layout-option") || "").trim();
    if (!nextLayoutId || nextLayoutId === previewState.selectedLayoutId) return;
    previewState.selectedLayoutId = nextLayoutId;
    previewState.magicProfileId = getDefaultMagicProfileId();
    saveRememberedLayoutStyleId(nextLayoutId);
    const selected = getSelectedLayoutOption();
    layoutFeedback.textContent = "Aktywny layout: " + selected.label + ". Podgląd po prawej został odświeżony.";
    setPreviewProgress(Math.max(previewState.currentProgress, 62), true);
    syncAllPreviewPanels();
  });

  closeMagicModalBtn.addEventListener("click", closeMagicModalAndReturn);
  backToLayoutModalBtn.addEventListener("click", closeMagicModalAndReturn);
  magicModal.addEventListener("click", function (event) {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeMagicModal === "true") {
      closeMagicModalAndReturn();
    }
  });
  magicWandBtn.addEventListener("click", castMagicLayoutPreview);

  previewPanels.forEach(function (panel) {
    panel.list.addEventListener("click", function (event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const navButton = target.closest("[data-preview-nav]");
      if (!(navButton instanceof HTMLElement)) return;
      const direction = navButton.getAttribute("data-preview-nav") === "prev" ? -1 : 1;
      goToPreviewPage(direction);
    });
  });

  modal.addEventListener("click", function (event) {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeModal === "true") {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  confirmButton.addEventListener("click", function () {
    showFeedback();
    closeModal();
    openDetailsModal();
  });

  function openDetailsModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    detailsModal.style.display = "flex";
    detailsModal.classList.add("is-open");
    detailsModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeDetailsModal() {
    detailsModal.style.display = "none";
    detailsModal.classList.remove("is-open");
    detailsModal.setAttribute("aria-hidden", "true");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  closeDetailsModalBtn.addEventListener("click", closeDetailsModal);
  detailsModal.addEventListener("click", function (event) {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeModal === "true") {
      closeDetailsModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && detailsModal.classList.contains("is-open")) {
      closeDetailsModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && excelModal.classList.contains("is-open")) {
      closeExcelModalAndReturn();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && imagesModal.classList.contains("is-open")) {
      closeImagesModalAndReturn();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && layoutModal.classList.contains("is-open")) {
      closeLayoutModalAndReturn();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && magicModal.classList.contains("is-open")) {
      closeMagicModalAndReturn();
    }
  });

  window.addEventListener("storage", function (event) {
    const key = String(event && event.key || "");
    if (key !== CUSTOM_STYLES_STORAGE_KEY && key !== LAST_SELECTED_MODULE_STYLE_STORAGE_KEY) return;
    layoutStylesReadyPromise = null;
    previewState.selectedLayoutId = loadRememberedLayoutStyleId();
    void ensureCreatorLayoutStylesReady();
  });

  window.addEventListener("resize", function () {
    schedulePreviewHydration();
  });

  updateSelection(state.selectedOption);
  updateSourceSelection(sourceState.selected);
  previewState.magicProfileId = getDefaultMagicProfileId();
  syncAllPreviewPanels();
  setPreviewProgress(0, false);
  void ensureCreatorLayoutStylesReady();
})();

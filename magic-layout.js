(function () {
  const MODAL_ID = "magicLayoutModal";
  const BACKDROP_ID = "magicLayoutBackdrop";
  const STYLE_ID = "magicLayoutStyles";
  const MAX_ROWS = 6;
  const CUSTOM_STYLES_STORAGE_KEY = "styl_wlasny_custom_styles_v1";
  const CUSTOM_STYLES_REMOTE_PATH = "styles/styles.json";
  const LAST_SELECTED_MODULE_STYLE_STORAGE_KEY = "styl_wlasny_last_module_layout_style_v1";
  const CUSTOM_STYLES_BUCKET = "gs://pdf-creator-f7a8b.firebasestorage.app";
  const STORAGE_MEDIA_BASE_URL = "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/";
  const LOCKED_SYSTEM_STYLE_IDS = new Set(["styl-numer-1", "styl-numer-2", "styl-numer-3"]);

  let customStylesSyncPromise = null;

  function normalizeCustomStyleList(list) {
    return (Array.isArray(list) ? list : []).filter((item) => {
      const id = String(item?.id || "").trim();
      const label = String(item?.label || "").trim();
      if (LOCKED_SYSTEM_STYLE_IDS.has(id)) return false;
      return !!id && !!label && item?.config && typeof item.config === "object";
    });
  }

  function loadCustomStylesFromLocalStorage() {
    try {
      const raw = localStorage.getItem(CUSTOM_STYLES_STORAGE_KEY);
      return normalizeCustomStyleList(JSON.parse(raw || "[]"));
    } catch (_err) {
      return [];
    }
  }

  function saveCustomStylesToLocalStorage(list) {
    try {
      localStorage.setItem(CUSTOM_STYLES_STORAGE_KEY, JSON.stringify(normalizeCustomStyleList(list)));
    } catch (_err) {}
  }

  function mergeCustomStyleLists(primary, secondary) {
    const merged = [];
    const seen = new Map();
    [...normalizeCustomStyleList(secondary), ...normalizeCustomStyleList(primary)].forEach((item) => {
      const id = String(item?.id || "").trim();
      if (!id) return;
      const copy = JSON.parse(JSON.stringify(item));
      if (seen.has(id)) {
        merged[seen.get(id)] = copy;
        return;
      }
      seen.set(id, merged.length);
      merged.push(copy);
    });
    return merged;
  }

  function registerCustomStyleDefinitions(list) {
    if (typeof window.registerStylWlasnyModuleLayoutStyle !== "function") return;
    normalizeCustomStyleList(list).forEach((styleDef) => {
      try {
        window.registerStylWlasnyModuleLayoutStyle(styleDef);
      } catch (_err) {}
    });
  }

  async function loadCustomStylesFromRemoteStorage() {
    const api = window.firebaseStorageExports || await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js");
    const refFn = api?.ref;
    const getDownloadURLFn = api?.getDownloadURL;
    const getStorageFn = api?.getStorage;
    if (
      typeof refFn !== "function" ||
      typeof getDownloadURLFn !== "function"
    ) {
      throw new Error("Brak API Firebase Storage.");
    }
    const storage = window.firebaseStorage || (typeof getStorageFn === "function"
      ? getStorageFn(undefined, CUSTOM_STYLES_BUCKET)
      : null);
    if (!storage) {
      throw new Error("Brak połączenia z Firebase Storage.");
    }
    const fileRef = refFn(storage, CUSTOM_STYLES_REMOTE_PATH);
    const url = await getDownloadURLFn(fileRef);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return normalizeCustomStyleList(await response.json());
  }

  async function ensureMagicLayoutCustomStylesReady() {
    if (!customStylesSyncPromise) {
      customStylesSyncPromise = (async () => {
        const localStyles = loadCustomStylesFromLocalStorage();
        if (localStyles.length) {
          registerCustomStyleDefinitions(localStyles);
        }
        try {
          const remoteStyles = await loadCustomStylesFromRemoteStorage();
          const merged = mergeCustomStyleLists(remoteStyles, localStyles);
          saveCustomStylesToLocalStorage(merged);
          registerCustomStyleDefinitions(merged);
          return merged;
        } catch (err) {
          console.warn("Magic Layout: nie udało się wczytać styles/styles.json:", err);
          return localStyles;
        }
      })();
    }
    try {
      return await customStylesSyncPromise;
    } catch (err) {
      customStylesSyncPromise = null;
      throw err;
    }
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BACKDROP_ID} {
        position: fixed;
        inset: 0;
        background: rgba(3, 7, 18, 0.68);
        backdrop-filter: blur(8px);
        z-index: 100120;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      #${BACKDROP_ID}.is-open {
        display: flex;
      }
      #${MODAL_ID} {
        width: min(680px, calc(100vw - 32px));
        max-height: calc(100vh - 48px);
        overflow: auto;
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,0.08);
        background:
          radial-gradient(900px 400px at 10% -10%, rgba(58, 168, 255, 0.12), transparent 45%),
          radial-gradient(520px 320px at 88% 8%, rgba(216,255,31,0.12), transparent 46%),
          radial-gradient(360px 220px at 50% 100%, rgba(126, 92, 255, 0.12), transparent 42%),
          linear-gradient(180deg, rgba(16, 22, 36, 0.98) 0%, rgba(10, 15, 25, 0.98) 100%);
        box-shadow: 0 32px 80px rgba(0,0,0,0.42);
        color: #eef4ff;
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
      }
      .ml-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 22px 22px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .ml-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: #8fb7ff;
        margin-bottom: 10px;
      }
      .ml-title {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: #f8fbff;
        margin: 0 0 6px;
      }
      .ml-subtitle {
        margin: 0;
        color: #9ca9c0;
        font-size: 14px;
        line-height: 1.45;
      }
      .ml-close {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        color: #d8e0ee;
        cursor: pointer;
      }
      .ml-body {
        padding: 22px;
        display: grid;
        gap: 18px;
      }
      .ml-hero {
        position: relative;
        overflow: hidden;
        border-radius: 22px;
        border: 1px solid rgba(119, 156, 255, 0.18);
        background:
          radial-gradient(280px 200px at 10% 0%, rgba(58, 168, 255, 0.18), transparent 65%),
          radial-gradient(220px 180px at 88% 12%, rgba(216,255,31,0.16), transparent 62%),
          linear-gradient(140deg, rgba(16, 30, 56, 0.98) 0%, rgba(8, 14, 29, 0.98) 52%, rgba(12, 20, 37, 0.98) 100%);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.05),
          0 20px 48px rgba(5, 10, 22, 0.42);
        padding: 18px;
      }
      .ml-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.03) 38%, transparent 52%),
          linear-gradient(180deg, rgba(255,255,255,0.02), transparent 30%);
        pointer-events: none;
      }
      .ml-hero-grid {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 16px;
        align-items: center;
      }
      .ml-hero-copy {
        display: grid;
        gap: 10px;
      }
      .ml-ai-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(216,255,31,0.18);
        background: rgba(216,255,31,0.08);
        color: #efff9a;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .ml-hero-title {
        margin: 0;
        font-size: 24px;
        line-height: 1.08;
        letter-spacing: -0.04em;
        color: #f8fbff;
      }
      .ml-hero-text {
        margin: 0;
        color: #b4c1d6;
        font-size: 14px;
        line-height: 1.55;
        max-width: 48ch;
      }
      .ml-hero-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .ml-hero-tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 11px;
        border-radius: 999px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
        color: #dce6f7;
        font-size: 12px;
        font-weight: 700;
      }
      .ml-hero-tag i {
        color: #7fe2ff;
      }
      .ml-hero-side {
        display: grid;
        gap: 12px;
        justify-items: end;
      }
      .ml-ai-controls {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: stretch;
        justify-content: flex-end;
      }
      .ml-ai-controls > * {
        position: relative;
        z-index: 1;
      }
      .ml-ai-style-select {
        flex: 0 0 220px;
        min-height: 54px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.1);
        background:
          linear-gradient(180deg, rgba(22, 31, 49, 0.96) 0%, rgba(13, 19, 31, 0.98) 100%);
        color: #f5f8ff;
        font-size: 14px;
        font-weight: 700;
        padding: 0 14px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
      }
      .ml-orb {
        width: 122px;
        height: 122px;
        border-radius: 32px;
        border: 1px solid rgba(255,255,255,0.12);
        background:
          radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0 6%, rgba(160, 232, 255, 0.82) 10%, rgba(54, 128, 255, 0.5) 26%, rgba(38, 24, 96, 0.08) 56%, transparent 66%),
          radial-gradient(circle at 70% 68%, rgba(216,255,31,0.7), transparent 26%),
          linear-gradient(180deg, rgba(22, 36, 64, 0.92) 0%, rgba(10, 14, 26, 0.96) 100%);
        box-shadow:
          0 16px 42px rgba(35, 132, 255, 0.24),
          inset 0 0 24px rgba(255,255,255,0.05);
        position: relative;
      }
      .ml-orb::before,
      .ml-orb::after {
        content: "";
        position: absolute;
        inset: 14px;
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .ml-orb::after {
        inset: 28px;
        border-color: rgba(216,255,31,0.18);
      }
      .ml-ai-cta {
        flex: 1 1 260px;
        min-width: 0;
        min-height: 54px;
        border-radius: 16px;
        border: 1px solid rgba(216,255,31,0.34);
        background: linear-gradient(135deg, #d8ff1f 0%, #b8f111 100%);
        color: #071018;
        font-size: 16px;
        font-weight: 900;
        letter-spacing: -0.03em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        cursor: pointer;
        box-shadow: 0 18px 34px rgba(216,255,31,0.18);
      }
      .ml-ai-note {
        color: #9bb2d0;
        font-size: 12px;
        font-weight: 700;
        text-align: right;
      }
      .ml-page-spell {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        border-radius: 18px;
        z-index: 999;
        opacity: 0;
        animation: mlSpellFade 1200ms ease-out forwards;
      }
      .ml-page-spell::before {
        content: "";
        position: absolute;
        inset: -18%;
        background:
          radial-gradient(circle at 18% 24%, rgba(58,168,255,0.16), transparent 18%),
          radial-gradient(circle at 78% 26%, rgba(216,255,31,0.16), transparent 18%),
          radial-gradient(circle at 46% 76%, rgba(121,92,255,0.12), transparent 18%);
        filter: blur(16px);
        animation: mlSpellPulse 1150ms ease-out forwards;
      }
      .ml-page-spell::after {
        content: "";
        position: absolute;
        top: -16%;
        bottom: -16%;
        width: 42%;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 24%, rgba(127,226,255,0.22) 50%, rgba(216,255,31,0.16) 64%, transparent 100%);
        transform: translateX(-140%) rotate(8deg);
        filter: blur(4px);
        animation: mlSpellSweep 900ms cubic-bezier(.22,.9,.23,1) forwards;
      }
      .ml-page-spell--random::after {
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 24%, rgba(127,226,255,0.18) 50%, rgba(255,121,198,0.16) 64%, transparent 100%);
      }
      .ml-page-spell--manual::after {
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 24%, rgba(216,255,31,0.14) 50%, rgba(127,226,255,0.14) 64%, transparent 100%);
      }
      .ml-page-spell__ring {
        position: absolute;
        inset: 8px;
        border-radius: 18px;
        border: 1px solid rgba(127,226,255,0.26);
        box-shadow:
          0 0 0 1px rgba(216,255,31,0.08),
          0 0 34px rgba(127,226,255,0.18),
          inset 0 0 24px rgba(127,226,255,0.06);
        opacity: 0;
        animation: mlSpellRing 900ms ease-out forwards;
      }
      .ml-page-spell--random .ml-page-spell__ring {
        border-color: rgba(255,121,198,0.26);
        box-shadow:
          0 0 0 1px rgba(255,121,198,0.08),
          0 0 34px rgba(255,121,198,0.18),
          inset 0 0 24px rgba(255,121,198,0.06);
      }
      .ml-page-spell--manual .ml-page-spell__ring {
        border-color: rgba(216,255,31,0.22);
        box-shadow:
          0 0 0 1px rgba(216,255,31,0.08),
          0 0 34px rgba(216,255,31,0.16),
          inset 0 0 24px rgba(216,255,31,0.05);
      }
      .ml-page-spell__spark {
        position: absolute;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(127,226,255,0.92) 42%, rgba(127,226,255,0) 72%);
        box-shadow: 0 0 18px rgba(127,226,255,0.45);
        opacity: 0;
        animation: mlSpellSpark 900ms ease-out forwards;
      }
      .ml-page-spell--random .ml-page-spell__spark {
        background: radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,121,198,0.9) 42%, rgba(255,121,198,0) 72%);
        box-shadow: 0 0 18px rgba(255,121,198,0.35);
      }
      .ml-page-spell--manual .ml-page-spell__spark {
        background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(216,255,31,0.88) 42%, rgba(216,255,31,0) 72%);
        box-shadow: 0 0 18px rgba(216,255,31,0.32);
      }
      @keyframes mlSpellFade {
        0% { opacity: 0; }
        12% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes mlSpellPulse {
        0% { transform: scale(0.9); opacity: 0; }
        28% { opacity: 1; }
        100% { transform: scale(1.08); opacity: 0; }
      }
      @keyframes mlSpellSweep {
        0% { transform: translateX(-140%) rotate(8deg); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translateX(340%) rotate(8deg); opacity: 0; }
      }
      @keyframes mlSpellSpark {
        0% { transform: translate3d(0, 12px, 0) scale(0.4); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translate3d(var(--ml-dx, 0), var(--ml-dy, -32px), 0) scale(1.5); opacity: 0; }
      }
      @keyframes mlSpellRing {
        0% { transform: scale(0.985); opacity: 0; }
        18% { opacity: 1; }
        100% { transform: scale(1.01); opacity: 0; }
      }
      .ml-card {
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(22, 31, 49, 0.92) 0%, rgba(13, 19, 31, 0.96) 100%);
        padding: 16px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
      }
      .ml-card-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #f5f8ff;
        margin: 0 0 14px;
      }
      .ml-card-title i {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: rgba(216,255,31,0.12);
        color: #d8ff1f;
        font-size: 13px;
      }
      .ml-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .ml-stat {
        border-radius: 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        padding: 12px;
      }
      .ml-stat-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8e9cb4;
        margin-bottom: 8px;
      }
      .ml-stat-value {
        font-size: 19px;
        font-weight: 800;
        color: #f5f8ff;
        letter-spacing: -0.03em;
      }
      .ml-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .ml-field {
        display: grid;
        gap: 7px;
      }
      .ml-field--rows {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        display: grid;
        gap: 12px;
      }
      .ml-field label,
      .ml-row-field label {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #9fb0c8;
      }
      .ml-row-field {
        display: grid;
        gap: 7px;
      }
      .ml-input,
      .ml-select {
        width: 100%;
        min-height: 44px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(90deg, rgba(31,39,56,0.96) 0%, rgba(26,33,49,0.96) 100%);
        color: #f5f8ff;
        font-size: 15px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
      }
      .ml-hint {
        font-size: 12px;
        line-height: 1.45;
        color: #91a0b8;
      }
      .ml-error {
        display: none;
        border-radius: 12px;
        border: 1px solid rgba(255,107,107,0.24);
        background: rgba(127, 29, 29, 0.18);
        color: #ffd5d8;
        padding: 12px 14px;
        font-size: 13px;
        font-weight: 600;
      }
      .ml-error.is-visible {
        display: block;
      }
      .ml-actions {
        display: grid;
        grid-template-columns: 1.2fr 1fr 1fr;
        gap: 12px;
        padding: 0 22px 22px;
      }
      .ml-btn {
        min-height: 52px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .ml-btn-primary {
        color: #081014;
        background: linear-gradient(135deg, #d8ff1f 0%, #b8f111 100%);
        box-shadow: 0 14px 30px rgba(216,255,31,0.16);
        border-color: rgba(216,255,31,0.36);
      }
      .ml-btn-random {
        color: #eef7ff;
        background:
          radial-gradient(120px 90px at 50% 0%, rgba(58, 168, 255, 0.22), transparent 70%),
          linear-gradient(180deg, rgba(23, 38, 62, 0.96) 0%, rgba(13, 21, 37, 0.98) 100%);
        box-shadow: 0 14px 30px rgba(58, 168, 255, 0.14);
        border-color: rgba(58, 168, 255, 0.28);
      }
      .ml-btn-manual {
        color: #eef7ff;
        background:
          radial-gradient(120px 90px at 50% 0%, rgba(216,255,31,0.14), transparent 70%),
          linear-gradient(180deg, rgba(23, 38, 62, 0.96) 0%, rgba(13, 21, 37, 0.98) 100%);
        border-color: rgba(216,255,31,0.18);
      }
      .ml-btn-secondary {
        color: #eef4ff;
        background: linear-gradient(180deg, rgba(28,36,54,0.94) 0%, rgba(17,24,39,0.98) 100%);
      }
      @media (max-width: 720px) {
        .ml-hero-grid,
        .ml-grid,
        .ml-field--rows,
        .ml-stats,
        .ml-actions {
          grid-template-columns: 1fr;
        }
        .ml-ai-controls {
          flex-direction: column;
        }
        .ml-ai-style-select,
        .ml-ai-cta {
          flex: 1 1 auto;
          width: 100%;
        }
        .ml-title {
          font-size: 24px;
        }
        .ml-hero-side {
          justify-items: stretch;
        }
        .ml-ai-note {
          text-align: left;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureStyles();
    let backdrop = document.getElementById(BACKDROP_ID);
    if (backdrop) return backdrop;
    backdrop = document.createElement("div");
    backdrop.id = BACKDROP_ID;
    backdrop.innerHTML = `
      <div id="${MODAL_ID}" role="dialog" aria-modal="true" aria-labelledby="magicLayoutTitle">
        <div class="ml-head">
          <div>
            <div class="ml-kicker"><i class="fas fa-wand-magic-sparkles"></i><span>Magic Layout</span></div>
            <h2 class="ml-title" id="magicLayoutTitle">Magiczny uklad produktow</h2>
            <p class="ml-subtitle">Ustaw liczbe produktow w kazdym rzedzie, a system wyrowna zaznaczone moduly zgodnie z rozmiarem strony i realnym bounding boxem kazdego produktu.</p>
          </div>
          <button type="button" class="ml-close" data-action="close" aria-label="Zamknij">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="ml-body">
          <div class="ml-hero">
            <div class="ml-hero-grid">
              <div class="ml-hero-copy">
                <div class="ml-ai-badge"><i class="fas fa-sparkles"></i><span>AI Layout Wizard</span></div>
                <h3 class="ml-hero-title">Jednym kliknieciem uloz cala strone jak inteligentny kreator.</h3>
                <p class="ml-hero-text" id="magicLayoutAiSummary">AI analizuje liczbe produktow, format strony i proporcje modulow, a potem sam dobiera uklad, skale, marginesy i oddech kompozycji.</p>
                <div class="ml-hero-tags" id="magicLayoutAiTags"></div>
              </div>
              <div class="ml-hero-side">
                <div class="ml-orb" aria-hidden="true"></div>
                <div class="ml-ai-controls">
                  <button type="button" class="ml-ai-cta" data-action="ai-apply"><i class="fas fa-wand-magic-sparkles"></i><span>AI uloz cala strone</span></button>
                  <select id="magicLayoutAiStyleMode" class="ml-ai-style-select" aria-label="Styl AI"></select>
                </div>
                <div class="ml-ai-note">Wybierz, czy AI ma mieszac style, czy trzymac jeden konkretny styl na calej stronie.</div>
              </div>
            </div>
          </div>
          <div class="ml-card">
            <div class="ml-card-title"><i class="fas fa-chart-simple"></i><span>Zakres</span></div>
            <div class="ml-stats">
              <div class="ml-stat">
                <div class="ml-stat-label">Produkty</div>
                <div class="ml-stat-value" id="magicLayoutProductCount">0</div>
              </div>
              <div class="ml-stat">
                <div class="ml-stat-label">Strona</div>
                <div class="ml-stat-value" id="magicLayoutPageSize">0 x 0</div>
              </div>
              <div class="ml-stat">
                <div class="ml-stat-label">Zaznaczenie</div>
                <div class="ml-stat-value" id="magicLayoutSelectionMode">moduly</div>
              </div>
            </div>
          </div>
          <div class="ml-card">
            <div class="ml-card-title"><i class="fas fa-grip"></i><span>Rzedy</span></div>
            <div class="ml-field--rows" id="magicLayoutRows"></div>
            <div class="ml-hint">Mozesz wpisac wlasny uklad rzedow, a system w razie potrzeby sam skoryguje sume i domknie rozklad produktow.</div>
          </div>
          <div class="ml-card">
            <div class="ml-card-title"><i class="fas fa-sliders"></i><span>Opcje ukladu</span></div>
            <div class="ml-grid">
              <div class="ml-field">
                <label for="magicLayoutGapX">Odstep poziomy</label>
                <input id="magicLayoutGapX" class="ml-input" type="number" min="0" step="1" value="28">
              </div>
              <div class="ml-field">
                <label for="magicLayoutGapY">Odstep pionowy</label>
                <input id="magicLayoutGapY" class="ml-input" type="number" min="0" step="1" value="34">
              </div>
              <div class="ml-field">
                <label for="magicLayoutMarginX">Margines boczny</label>
                <input id="magicLayoutMarginX" class="ml-input" type="number" min="0" step="1" value="42">
              </div>
              <div class="ml-field">
                <label for="magicLayoutMarginY">Margines gorny/dolny</label>
                <input id="magicLayoutMarginY" class="ml-input" type="number" min="0" step="1" value="42">
              </div>
              <div class="ml-field">
                <label for="magicLayoutMarginMode">Marginesy</label>
                <select id="magicLayoutMarginMode" class="ml-select">
                  <option value="auto">Dopasuj automatycznie</option>
                  <option value="manual">Uzyj wpisanych wartosci</option>
                </select>
              </div>
              <div class="ml-field">
                <label for="magicLayoutAlign">Wyrownanie rzedu</label>
                <select id="magicLayoutAlign" class="ml-select">
                  <option value="center">Wycentruj</option>
                  <option value="left">Do lewej</option>
                  <option value="right">Do prawej</option>
                </select>
              </div>
              <div class="ml-field">
                <label for="magicLayoutScale">Skalowanie</label>
                <select id="magicLayoutScale" class="ml-select">
                  <option value="fit">Dopasuj automatycznie</option>
                  <option value="keep">Zachowaj obecny rozmiar</option>
                </select>
              </div>
              <div class="ml-field">
                <label for="magicLayoutStyleMode">Styl modułów</label>
                <select id="magicLayoutStyleMode" class="ml-select"></select>
              </div>
            </div>
            <div class="ml-hint">Przy auto marginesach wpisane wartosci sa traktowane jako baza, a system sam rozklada wolne miejsce i delikatnie dopasowuje uklad do strony.</div>
          </div>
          <div class="ml-error" id="magicLayoutError"></div>
        </div>
        <div class="ml-actions">
          <button type="button" class="ml-btn ml-btn-primary" data-action="apply"><i class="fas fa-stars"></i><span>Zastosuj ten uklad</span></button>
          <button type="button" class="ml-btn ml-btn-random" data-action="random"><i class="fas fa-shuffle"></i><span>Uloz losowo</span></button>
          <button type="button" class="ml-btn ml-btn-secondary" data-action="cancel"><i class="fas fa-xmark"></i><span>Anuluj</span></button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeModal();
    });
    backdrop.querySelectorAll("[data-action='close'], [data-action='cancel']").forEach((btn) => {
      btn.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && backdrop.classList.contains("is-open")) closeModal();
    });
    return backdrop;
  }

  function closeModal() {
    const backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop) return;
    backdrop.classList.remove("is-open");
    backdrop._magicLayoutContext = null;
  }

  function showError(message) {
    const errorEl = document.getElementById("magicLayoutError");
    if (!errorEl) return;
    errorEl.textContent = message || "";
    errorEl.classList.toggle("is-visible", !!message);
  }

  function getNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function randomInt(min, max) {
    const safeMin = Math.ceil(Math.min(min, max));
    const safeMax = Math.floor(Math.max(min, max));
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
  }

  function shuffle(array) {
    const items = array.slice();
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function uniqueRowsVariant(rows) {
    return rows
      .map((value) => Math.max(0, Math.floor(getNumber(value, 0))))
      .filter((value) => value > 0)
      .slice(0, MAX_ROWS);
  }

  function formatRowsLabel(rows) {
    const normalized = uniqueRowsVariant(rows);
    return normalized.length ? normalized.join(" - ") : "auto";
  }

  function setAiTags(tags) {
    const container = document.getElementById("magicLayoutAiTags");
    if (!container) return;
    container.innerHTML = "";
    tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "ml-hero-tag";
      chip.innerHTML = `<i class="${tag.icon}"></i><span>${tag.label}</span>`;
      container.appendChild(chip);
    });
  }

  function getAvailableModuleStyleOptions() {
    const registered = Array.isArray(window.STYL_WLASNY_REGISTRY?.moduleLayouts)
      ? window.STYL_WLASNY_REGISTRY.moduleLayouts
      : [];
    const styles = [{ id: "default", label: "Domyslny (styl elegancki)" }];
    const seen = new Set(["default"]);
    registered.forEach((item) => {
      const id = String(item?.id || "").trim();
      const label = String(item?.label || "").trim();
      if (!id || !label || seen.has(id)) return;
      seen.add(id);
      styles.push({ id, label });
    });
    return styles;
  }

  function loadRememberedModuleStyleId() {
    try {
      return String(localStorage.getItem(LAST_SELECTED_MODULE_STYLE_STORAGE_KEY) || "").trim();
    } catch (_err) {
      return "";
    }
  }

  function saveRememberedModuleStyleId(styleId) {
    try {
      const safeId = String(styleId || "").trim();
      if (!safeId) return;
      localStorage.setItem(LAST_SELECTED_MODULE_STYLE_STORAGE_KEY, safeId);
    } catch (_err) {}
  }

  function rememberFixedStyleMode(mode) {
    const safeMode = String(mode || "").trim();
    if (!safeMode.startsWith("style:")) return;
    const styleId = String(safeMode.slice(6) || "").trim();
    if (!styleId) return;
    saveRememberedModuleStyleId(styleId);
  }

  function getPreferredMagicLayoutStyleId(page) {
    const availableIds = new Set(getAvailableModuleStyleOptions().map((item) => String(item?.id || "").trim()).filter(Boolean));
    const rememberedStyleId = loadRememberedModuleStyleId();
    if (rememberedStyleId && availableIds.has(rememberedStyleId)) return rememberedStyleId;
    const currentPageStyles = getCurrentPageStyleIds(page);
    if (currentPageStyles.length === 1 && availableIds.has(currentPageStyles[0])) {
      return currentPageStyles[0];
    }
    return "default";
  }

  function getPreferredMagicLayoutStyleMode(page) {
    return `style:${getPreferredMagicLayoutStyleId(page)}`;
  }

  function getModuleStyleDefinition(styleId) {
    const safeId = String(styleId || "default").trim() || "default";
    const registered = Array.isArray(window.STYL_WLASNY_REGISTRY?.moduleLayouts)
      ? window.STYL_WLASNY_REGISTRY.moduleLayouts
      : [];
    const match = registered.find((item) => String(item?.id || "").trim() === safeId);
    return {
      id: safeId,
      label: String(match?.label || (safeId === "default" ? "Domyslny (styl elegancki)" : safeId)).trim(),
      config: (match?.config && typeof match.config === "object") ? match.config : {}
    };
  }

  function normalizeBadgeStyleId(value) {
    const source = String(value || "").trim();
    if (!source) return "solid";
    const safe = source
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return safe ? `firebase-badge-${safe}` : "solid";
  }

  function buildStorageMediaUrl(objectPath) {
    const safePath = String(objectPath || "").trim();
    if (!safePath) return "";
    return `${STORAGE_MEDIA_BASE_URL}${encodeURIComponent(safePath)}?alt=media`;
  }

  function getDesiredProductStylePayload(styleId) {
    const styleDef = getModuleStyleDefinition(styleId);
    const cfg = (styleDef?.config && typeof styleDef.config === "object") ? styleDef.config : {};
    const textCfg = (cfg?.text && typeof cfg.text === "object") ? cfg.text : {};
    const hidePriceBadge = !!textCfg.hidePriceBadge;
    const noPriceCircle = !!textCfg.noPriceCircle;
    const rawBadgeStyleId = String(cfg.priceBadgeStyleId || textCfg.priceBadgeStyleId || "").trim();
    const badgePath = String(cfg.priceBadgeStylePath || textCfg.priceBadgeStylePath || "").trim();
    const badgeUrl = String(cfg.priceBadgeStyleUrl || textCfg.priceBadgeStyleUrl || "").trim()
      || buildStorageMediaUrl(badgePath);
    const resolvedBadgeStyleId = rawBadgeStyleId || ((badgePath || badgeUrl) ? normalizeBadgeStyleId(badgePath || badgeUrl) : "solid");
    const shouldClearBadgeImage = hidePriceBadge || noPriceCircle || resolvedBadgeStyleId === "solid";
    return {
      styleDef,
      priceTextColor: String(textCfg.priceColor || "").trim() || (noPriceCircle ? "#d71920" : "#ffffff"),
      priceBgColor: String(textCfg.priceBgColor || "").trim(),
      priceBgStyleId: shouldClearBadgeImage ? "solid" : resolvedBadgeStyleId,
      priceBgImageUrl: shouldClearBadgeImage ? "" : badgeUrl
    };
  }

  function getCurrentPageStyleIds(page) {
    if (!Array.isArray(page?.products)) return [];
    return Array.from(new Set(
      page.products
        .filter((product) => !!(product && typeof product === "object"))
        .map((product) => String(product.MODULE_LAYOUT_STYLE_ID || "default").trim() || "default")
        .filter(Boolean)
    ));
  }

  function hasInlineModuleLayoutEditorSnapshot(product) {
    const snapshot = product?.MODULE_LAYOUT_EDITOR_SNAPSHOT;
    return !!(snapshot && typeof snapshot === "object" && Array.isArray(snapshot.nodes) && snapshot.nodes.length);
  }

  function getInlineModuleLayoutSnapshotSourceStyleId(product) {
    return String(
      product?.MODULE_LAYOUT_EDITOR_SNAPSHOT_SOURCE_STYLE_ID ||
      product?.MODULE_LAYOUT_EDITOR_SOURCE_STYLE_ID ||
      ""
    ).trim();
  }

  function styleHasEditorSnapshot(styleId) {
    const snapshot = getModuleStyleDefinition(styleId)?.config?.__editorSnapshot;
    return !!(snapshot && typeof snapshot === "object" && Array.isArray(snapshot.nodes) && snapshot.nodes.length);
  }

  function styleHasDirectLayoutConfig(styleId) {
    const config = getModuleStyleDefinition(styleId)?.config;
    const singleDirect = config?.singleDirect;
    const familyDirect = config?.familyDirect;
    return !!(
      (singleDirect && typeof singleDirect === "object") ||
      (familyDirect && typeof familyDirect === "object")
    );
  }

  function shouldDropInlineSnapshotForStyleChange(product, targetStyleId) {
    if (!product || !hasInlineModuleLayoutEditorSnapshot(product)) return false;
    const nextStyleId = String(targetStyleId || "").trim();
    if (!nextStyleId) return false;
    if (styleHasEditorSnapshot(nextStyleId)) return false;
    return styleHasDirectLayoutConfig(nextStyleId);
  }

  function shouldRefreshProductInlineSnapshot(product, targetStyleId) {
    if (!product || !hasInlineModuleLayoutEditorSnapshot(product)) return false;
    if (!styleHasEditorSnapshot(targetStyleId)) return false;
    const sourceStyleId = getInlineModuleLayoutSnapshotSourceStyleId(product);
    return sourceStyleId !== String(targetStyleId || "").trim();
  }

  function shouldRefreshProductStylePayload(product, targetStyleId) {
    if (!product || typeof product !== "object") return false;
    const desired = getDesiredProductStylePayload(targetStyleId);
    const currentBadgeStyleId = String(product.PRICE_BG_STYLE_ID || "solid").trim() || "solid";
    const currentBadgeUrl = String(product.PRICE_BG_IMAGE_URL || "").trim();
    const currentTextColor = String(product.PRICE_TEXT_COLOR || "").trim();
    const currentBgColor = String(product.PRICE_BG_COLOR || "").trim();
    if (currentBadgeStyleId !== desired.priceBgStyleId) return true;
    if (currentBadgeUrl !== desired.priceBgImageUrl) return true;
    if (currentTextColor !== desired.priceTextColor) return true;
    if (desired.priceBgColor && currentBgColor !== desired.priceBgColor) return true;
    return false;
  }

  function applyStyleDefaultsToProduct(product, styleId, options = {}) {
    if (!product || typeof product !== "object") return product;
    const currentStyleId = String(product.MODULE_LAYOUT_STYLE_ID || "default").trim() || "default";
    const forceSnapshotRefresh = !!options.forceSnapshotRefresh;
    const desired = getDesiredProductStylePayload(styleId);
    const textCfg = (desired.styleDef.config?.text && typeof desired.styleDef.config.text === "object") ? desired.styleDef.config.text : {};
    const noPriceCircle = !!textCfg.noPriceCircle;
    const next = { ...product, MODULE_LAYOUT_STYLE_ID: desired.styleDef.id };

    next.PRICE_TEXT_COLOR = desired.priceTextColor;
    next.PRICE_BG_STYLE_ID = desired.priceBgStyleId;
    next.PRICE_BG_IMAGE_URL = desired.priceBgImageUrl;
    if (desired.priceBgColor) {
      next.PRICE_BG_COLOR = desired.priceBgColor;
    }
    if (noPriceCircle) {
      next.PRICE_BG_STYLE_ID = "solid";
      next.PRICE_BG_IMAGE_URL = "";
    }
    if (currentStyleId !== desired.styleDef.id && shouldDropInlineSnapshotForStyleChange(product, desired.styleDef.id)) {
      delete next.MODULE_LAYOUT_EDITOR_SNAPSHOT;
      delete next.MODULE_LAYOUT_EDITOR_SNAPSHOT_SOURCE_STYLE_ID;
      delete next.MODULE_LAYOUT_EDITOR_SOURCE_STYLE_ID;
    }
    if (next.MODULE_LAYOUT_EDITOR_SNAPSHOT && styleHasEditorSnapshot(desired.styleDef.id)) {
      const currentSourceStyleId = getInlineModuleLayoutSnapshotSourceStyleId(product);
      if (currentStyleId !== desired.styleDef.id) {
        next.MODULE_LAYOUT_EDITOR_SNAPSHOT_SOURCE_STYLE_ID = currentSourceStyleId && currentSourceStyleId !== desired.styleDef.id
          ? currentSourceStyleId
          : currentStyleId;
      } else if (forceSnapshotRefresh) {
        next.MODULE_LAYOUT_EDITOR_SNAPSHOT_SOURCE_STYLE_ID = currentSourceStyleId && currentSourceStyleId !== desired.styleDef.id
          ? currentSourceStyleId
          : "__magic-layout-stale-inline__";
      }
    }
    return next;
  }

  function fillStyleModeOptions() {
    const select = document.getElementById("magicLayoutStyleMode");
    if (!select) return;
    const styles = getAvailableModuleStyleOptions();
    select.innerHTML = "";
    [
      { value: "keep", label: "Bez zmian" },
      { value: "auto-page", label: "AI: jeden styl na cala strone" },
      { value: "auto-mix", label: "AI: mieszaj style produktow" }
    ].concat(styles.map((style) => ({ value: `style:${style.id}`, label: style.label }))).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    });
  }

  function fillAiStyleModeOptions() {
    const select = document.getElementById("magicLayoutAiStyleMode");
    if (!select) return;
    const styles = getAvailableModuleStyleOptions();
    select.innerHTML = "";
    styles
      .map((style) => ({ value: `style:${style.id}`, label: style.label }))
      .concat([{ value: "auto-mix", label: "Mix stylow" }])
      .forEach((item) => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        select.appendChild(option);
      });
  }

  function syncAiStyleModeFromMain(page = null) {
    const mainSelect = document.getElementById("magicLayoutStyleMode");
    const aiSelect = document.getElementById("magicLayoutAiStyleMode");
    if (!mainSelect || !aiSelect) return;
    const safeValue = String(mainSelect.value || "").trim();
    const allowedValues = new Set(Array.from(aiSelect.options || []).map((option) => String(option.value || "")));
    const fallbackValue = getPreferredMagicLayoutStyleMode(page);
    aiSelect.value = allowedValues.has(safeValue) ? safeValue : (allowedValues.has(fallbackValue) ? fallbackValue : "style:default");
  }

  function syncMainStyleModeFromAi() {
    const mainSelect = document.getElementById("magicLayoutStyleMode");
    const aiSelect = document.getElementById("magicLayoutAiStyleMode");
    if (!mainSelect || !aiSelect) return;
    if (mainSelect.value !== aiSelect.value) mainSelect.value = aiSelect.value;
    rememberFixedStyleMode(aiSelect.value);
  }

  function getSelectedStyleMode() {
    return String(document.getElementById("magicLayoutStyleMode")?.value || "keep").trim() || "keep";
  }

  function getRequestedFixedStyleId(page) {
    const styleMode = getSelectedStyleMode();
    if (styleMode.startsWith("style:")) {
      return String(styleMode.slice(6) || "").trim();
    }
    const currentPageStyles = getCurrentPageStyleIds(page);
    return currentPageStyles.length === 1 ? currentPageStyles[0] : "";
  }

  function pickRandomItem(items) {
    if (!Array.isArray(items) || !items.length) return null;
    return items[Math.floor(Math.random() * items.length)] || null;
  }

  function chooseStyleIdsForMode(page, mode) {
    const styles = getAvailableModuleStyleOptions().map((item) => item.id).filter(Boolean);
    if (!styles.length) return null;
    const lastPageStyle = String(page?._magicLayoutLastPageStyleId || "");
    const currentPageStyles = getCurrentPageStyleIds(page);
    const uniformCurrentStyle = currentPageStyles.length === 1 ? currentPageStyles[0] : "";
    if (mode === "auto-page") {
      const pool = styles.filter((id) => id !== lastPageStyle && id !== uniformCurrentStyle);
      return { pageStyleId: pickRandomItem(pool.length ? pool : styles) || "default" };
    }
    if (mode === "auto-mix") {
      return { mixedStyleIds: styles };
    }
    if (mode.startsWith("style:")) {
      const fixed = String(mode.slice(6) || "").trim();
      if (fixed) return { pageStyleId: fixed };
    }
    return null;
  }

  async function applyModuleStylesToPage(context, styleMode) {
    if (!context?.page || styleMode === "keep") return false;
    const page = context.page;
    const next = chooseStyleIdsForMode(page, styleMode);
    if (!next) return false;
    const products = Array.isArray(page.products) ? page.products.slice() : null;
    if (!products || !products.length) return false;

    let changed = false;
    const updatedProducts = products.map((product) => {
      if (!product || typeof product !== "object") return product;
      const currentStyle = String(product.MODULE_LAYOUT_STYLE_ID || "default");
      let styleId = currentStyle;
      if (next.pageStyleId) {
        styleId = next.pageStyleId;
      } else if (Array.isArray(next.mixedStyleIds) && next.mixedStyleIds.length) {
        const pool = next.mixedStyleIds.filter((id) => id !== currentStyle);
        styleId = pickRandomItem(pool.length ? pool : next.mixedStyleIds) || currentStyle;
      }
      const needsSnapshotRefresh = shouldRefreshProductInlineSnapshot(product, styleId);
      const needsStylePayloadRefresh = shouldRefreshProductStylePayload(product, styleId);
      if (!styleId || (styleId === currentStyle && !needsSnapshotRefresh && !needsStylePayloadRefresh)) return product;
      changed = true;
      return applyStyleDefaultsToProduct(product, styleId, {
        forceSnapshotRefresh: needsSnapshotRefresh
      });
    });

    if (!changed) return false;
    const normalizedChangedSlots = updatedProducts.reduce((acc, product, index) => {
      if (!product || typeof product !== "object") return acc;
      if (product !== products[index]) {
        acc.push(index);
      }
      return acc;
    }, []);
    page.products = updatedProducts;
    if (next.pageStyleId) page._magicLayoutLastPageStyleId = next.pageStyleId;

    const directRebuild = window.CustomStyleDirectHooks?.rebuildDirectModuleLayoutsOnPage;
    let rebuiltDirectCount = 0;
    if (typeof directRebuild === "function") {
      try {
        rebuiltDirectCount = await directRebuild(page, {
          slotIndexes: normalizedChangedSlots
        });
      } catch (_err) {}
    }

    if (!rebuiltDirectCount) {
      if (typeof window.redrawCatalogPageForCustomStyle === "function") {
        window.redrawCatalogPageForCustomStyle(page);
      } else {
        page.layer?.batchDraw?.();
      }
    }

    context.modules = buildModulesFromPage(page);
    context.totalProducts = context.modules.length;
    return true;
  }

  function triggerMagicPageEffect(context, mode = "ai") {
    const page = context?.page;
    const host =
      page?.container?.querySelector?.(".page-zoom-wrap") ||
      page?.container?.querySelector?.(".canvas-wrapper") ||
      page?.container;
    if (!host || !host.style) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative";
    }

    try {
      host.querySelectorAll(".ml-page-spell").forEach((node) => node.remove());
    } catch (_err) {}

    const effect = document.createElement("div");
    effect.className = `ml-page-spell ml-page-spell--${mode}`;
    const ring = document.createElement("span");
    ring.className = "ml-page-spell__ring";
    effect.appendChild(ring);
    const sparkCount = mode === "ai" ? 7 : 5;

    for (let i = 0; i < sparkCount; i += 1) {
      const spark = document.createElement("span");
      spark.className = "ml-page-spell__spark";
      spark.style.left = `${randomInt(10, 88)}%`;
      spark.style.top = `${randomInt(16, 82)}%`;
      spark.style.animationDelay = `${Math.round(i * 55)}ms`;
      spark.style.setProperty("--ml-dx", `${randomInt(-18, 18)}px`);
      spark.style.setProperty("--ml-dy", `${randomInt(-52, -18)}px`);
      effect.appendChild(spark);
    }

    host.appendChild(effect);
    window.setTimeout(() => {
      try { effect.remove(); } catch (_err) {}
    }, 1400);
  }

  function closeModalWithMagicEffect(context, mode) {
    closeModal();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        triggerMagicPageEffect(context, mode);
      });
    });
  }

  function sortModulesForLayout(modules) {
    return modules.slice().sort((a, b) => {
      if (Math.abs(a.rect.y - b.rect.y) > 10) return a.rect.y - b.rect.y;
      return a.rect.x - b.rect.x;
    });
  }

  function getModuleArea(module) {
    return Math.max(1, (Number(module?.rect?.width) || 1) * (Number(module?.rect?.height) || 1));
  }

  function getOrderedModules(modules, strategy) {
    const items = modules.map((module) => ({
      key: module.key,
      nodes: module.nodes,
      rect: { ...module.rect }
    }));
    const byAreaDesc = items.slice().sort((a, b) => getModuleArea(b) - getModuleArea(a));
    const byAreaAsc = byAreaDesc.slice().reverse();
    const byWidthDesc = items.slice().sort((a, b) => (Number(b.rect.width) || 0) - (Number(a.rect.width) || 0));
    const byWidthAsc = byWidthDesc.slice().reverse();

    switch (strategy) {
      case "reverse":
        return items.reverse();
      case "area-desc":
        return byAreaDesc;
      case "area-asc":
        return byAreaAsc;
      case "width-desc":
        return byWidthDesc;
      case "width-asc":
        return byWidthAsc;
      case "hero-first": {
        if (!byAreaDesc.length) return items;
        return [byAreaDesc[0]].concat(items.filter((item) => item.key !== byAreaDesc[0].key));
      }
      case "hero-last": {
        if (!byAreaDesc.length) return items;
        return items.filter((item) => item.key !== byAreaDesc[0].key).concat(byAreaDesc[0]);
      }
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

  function isProductModuleNode(node) {
    if (!node || !node.getAttr) return false;
    return !!(
      node.getAttr("isName") ||
      node.getAttr("isIndex") ||
      node.getAttr("isProductImage") ||
      node.getAttr("isBarcode") ||
      node.getAttr("isCountryBadge") ||
      node.getAttr("isPriceGroup") ||
      node.getAttr("isDirectPriceRectBg") ||
      node.getAttr("isCustomPackageInfo")
    );
  }

  function getModuleMetaFromNode(node) {
    if (!node || !node.getAttr) return { directModuleId: "", slotIndex: null };
    const directModuleId = String(node.getAttr("directModuleId") || "").trim();
    const directSlot = Number(node.getAttr("slotIndex"));
    const preservedSlot = Number(node.getAttr("preservedSlotIndex"));
    return {
      directModuleId,
      slotIndex: Number.isFinite(directSlot) ? directSlot : (Number.isFinite(preservedSlot) ? preservedSlot : null)
    };
  }

  function createModuleKey(meta, fallback) {
    if (meta.directModuleId) return `direct:${meta.directModuleId}`;
    if (Number.isFinite(meta.slotIndex)) return `slot:${meta.slotIndex}`;
    return fallback;
  }

  function getTopLevelNode(node) {
    if (!node || typeof node.getParent !== "function") return node;
    let current = node;
    let parent = current.getParent();
    while (parent && typeof parent.getAttr === "function" && !parent.getAttr("isStage")) {
      if (parent.getAttr("isUserGroup")) return parent;
      const grandParent = typeof parent.getParent === "function" ? parent.getParent() : null;
      if (grandParent && typeof grandParent.getAttr === "function" && grandParent.getAttr("isStage")) return current;
      current = parent;
      parent = current.getParent ? current.getParent() : null;
    }
    return current;
  }

  function collectNodesByModule(page, node) {
    if (!page || !page.layer || !node || !node.getAttr) return [];
    const top = getTopLevelNode(node);
    if (top && top.getAttr && top.getAttr("isUserGroup")) return [top];

    const meta = getModuleMetaFromNode(node);
    const topMeta = getModuleMetaFromNode(top);
    const directModuleId = meta.directModuleId || topMeta.directModuleId;
    if (directModuleId) {
      return page.layer.find((candidate) => {
        if (!candidate || !candidate.getAttr) return false;
        if (candidate.getParent && candidate.getParent() !== page.layer) return false;
        return String(candidate.getAttr("directModuleId") || "").trim() === directModuleId;
      });
    }

    const slotIndex = Number.isFinite(meta.slotIndex) ? meta.slotIndex : topMeta.slotIndex;
    if (Number.isFinite(slotIndex)) {
      return page.layer.find((candidate) => {
        if (!candidate || !candidate.getAttr) return false;
        if (candidate.getParent && candidate.getParent() !== page.layer) return false;
        return Number(candidate.getAttr("slotIndex")) === slotIndex;
      });
    }

    return top ? [top] : [];
  }

  function buildModulesFromSelection(page) {
    const selected = (Array.isArray(page?.selectedNodes) ? page.selectedNodes : []).filter(Boolean);
    const unique = new Map();

    selected.forEach((node, index) => {
      if (!node || typeof node.getAttr !== "function") return;
      const nodes = collectNodesByModule(page, node);
      if (!nodes.length) return;
      const nodeMeta = getModuleMetaFromNode(node);
      const topMeta = getModuleMetaFromNode(nodes[0]);
      const key = createModuleKey(
        {
          directModuleId: nodeMeta.directModuleId || topMeta.directModuleId,
          slotIndex: Number.isFinite(nodeMeta.slotIndex) ? nodeMeta.slotIndex : topMeta.slotIndex
        },
        `node:${index}:${nodes[0]?._id || index}`
      );
      if (unique.has(key)) return;
      const rect = getNodesRect(nodes, page.layer);
      if (!rect) return;
      unique.set(key, { key, nodes, rect });
    });

    return sortModulesForLayout(Array.from(unique.values()));
  }

  function buildModulesFromPage(page) {
    if (!page || !page.layer || typeof page.layer.getChildren !== "function") return [];
    const childrenCollection = page.layer.getChildren();
    const layerChildren = typeof childrenCollection?.toArray === "function"
      ? childrenCollection.toArray()
      : Array.from(childrenCollection || []);
    const grouped = new Map();
    const modules = [];

    layerChildren.forEach((node, index) => {
      if (!node || !node.getAttr || node.getAttr("isPageBg")) return;

      if (node instanceof Konva.Group && node.getAttr("isUserGroup")) {
        const descendants = node.find ? node.find((child) => isProductModuleNode(child)) : [];
        if (!descendants || !descendants.length) return;
        const groupMeta = getModuleMetaFromNode(node);
        const descMeta = getModuleMetaFromNode(descendants[0]);
        const key = createModuleKey(
          {
            directModuleId: groupMeta.directModuleId || descMeta.directModuleId,
            slotIndex: Number.isFinite(groupMeta.slotIndex) ? groupMeta.slotIndex : descMeta.slotIndex
          },
          `group:${index}:${node._id || index}`
        );
        const rect = getNodesRect([node], page.layer);
        if (!rect || grouped.has(key)) return;
        grouped.set(key, true);
        modules.push({ key, nodes: [node], rect });
        return;
      }

      if (node.getParent && node.getParent() !== page.layer) return;
      if (!isProductModuleNode(node)) return;

      const meta = getModuleMetaFromNode(node);
      const key = createModuleKey(meta, `node:${index}:${node._id || index}`);
      if (!grouped.has(key)) grouped.set(key, []);
      if (Array.isArray(grouped.get(key))) grouped.get(key).push(node);
    });

    grouped.forEach((value, key) => {
      if (!Array.isArray(value)) return;
      const rect = getNodesRect(value, page.layer);
      if (!rect) return;
      modules.push({ key, nodes: value, rect });
    });

    return sortModulesForLayout(modules);
  }

  function getNodesRect(nodes, layer) {
    if (!Array.isArray(nodes) || !nodes.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach((node) => {
      const rect = typeof node.getClientRect === "function" ? node.getClientRect({ relativeTo: layer }) : null;
      if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y)) return;
      minX = Math.min(minX, rect.x);
      minY = Math.min(minY, rect.y);
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  function scaleModule(module, factor, layer) {
    if (!module || !Array.isArray(module.nodes) || !Number.isFinite(factor) || Math.abs(factor - 1) < 0.001) return;
    const anchorX = module.rect.x;
    const anchorY = module.rect.y;
    module.nodes.forEach((node) => {
      if (!node) return;
      const absRect = typeof node.getClientRect === "function" ? node.getClientRect({ relativeTo: layer }) : null;
      const dx = absRect ? absRect.x - anchorX : 0;
      const dy = absRect ? absRect.y - anchorY : 0;

      if (typeof node.x === "function") node.x(anchorX + dx * factor);
      if (typeof node.y === "function") node.y(anchorY + dy * factor);
      if (typeof node.scaleX === "function") node.scaleX((Number(node.scaleX()) || 1) * factor);
      if (typeof node.scaleY === "function") node.scaleY((Number(node.scaleY()) || 1) * factor);
    });
    const nextRect = getNodesRect(module.nodes, layer);
    if (nextRect) module.rect = nextRect;
  }

  function moveModule(module, targetX, targetY, layer) {
    if (!module || !Array.isArray(module.nodes)) return;
    const current = getNodesRect(module.nodes, layer);
    if (!current) return;
    const dx = targetX - current.x;
    const dy = targetY - current.y;
    module.nodes.forEach((node) => {
      if (typeof node.x === "function") node.x((Number(node.x()) || 0) + dx);
      if (typeof node.y === "function") node.y((Number(node.y()) || 0) + dy);
    });
    const nextRect = getNodesRect(module.nodes, layer);
    if (nextRect) module.rect = nextRect;
  }

  function measureRowModules(row, layer) {
    return row.map((module) => {
      const rect = getNodesRect(module?.nodes, layer) || module?.rect || { x: 0, y: 0, width: 1, height: 1 };
      if (module) module.rect = rect;
      return rect;
    });
  }

  function fitRowModulesToBounds(row, layer, maxWidth, maxHeight, gapX) {
    if (!Array.isArray(row) || !row.length) return measureRowModules(row, layer);
    const safeMaxWidth = Math.max(1, Number(maxWidth) || 1);
    const safeMaxHeight = Math.max(1, Number(maxHeight) || 1);
    const safeGapX = Math.max(0, Number(gapX) || 0);

    let rects = measureRowModules(row, layer);
    for (let pass = 0; pass < 4; pass += 1) {
      const contentWidth = rects.reduce((acc, rect) => acc + Math.max(1, Number(rect?.width) || 1), 0);
      const rowWidth = contentWidth + Math.max(0, row.length - 1) * safeGapX;
      const rowHeight = rects.reduce((acc, rect) => Math.max(acc, Math.max(1, Number(rect?.height) || 1)), 0);
      const widthFactor = row.length > 0
        ? (safeMaxWidth - Math.max(0, row.length - 1) * safeGapX) / Math.max(1, contentWidth)
        : 1;
      const heightFactor = safeMaxHeight / Math.max(1, rowHeight);
      const fitFactor = Math.min(1, widthFactor, heightFactor);
      if (fitFactor >= 0.999 || (!Number.isFinite(rowWidth) && !Number.isFinite(rowHeight))) break;
      row.forEach((module) => scaleModule(module, Math.max(0.12, fitFactor), layer));
      rects = measureRowModules(row, layer);
    }
    return rects;
  }

  function getRecommendedRows(count) {
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

  function fillRowInputs(productCount) {
    const container = document.getElementById("magicLayoutRows");
    if (!container) return;
    const recommended = getRecommendedRows(productCount);
    container.innerHTML = "";
    for (let i = 0; i < MAX_ROWS; i += 1) {
      const value = recommended[i] || 0;
      const field = document.createElement("div");
      field.className = "ml-row-field";
      field.innerHTML = `
        <label for="magicLayoutRow${i + 1}">Rzad ${i + 1}</label>
        <input id="magicLayoutRow${i + 1}" class="ml-input" type="number" min="0" step="1" value="${value}">
      `;
      container.appendChild(field);
    }
  }

  function openModal(context) {
    const backdrop = ensureModal();
    backdrop._magicLayoutContext = context;
    document.getElementById("magicLayoutProductCount").textContent = String(context.totalProducts || context.modules.length);
    document.getElementById("magicLayoutPageSize").textContent = context.pageLabel || `${Math.round(context.pageWidth)} x ${Math.round(context.pageHeight)}`;
    document.getElementById("magicLayoutSelectionMode").textContent = context.selectionLabel;
    const suggestedRows = getRecommendedRows(context.modules.length);
    const aiSummary = document.getElementById("magicLayoutAiSummary");
    if (aiSummary) {
      aiSummary.textContent = `AI widzi ${context.modules.length} produktow na stronie ${context.pageLabel || "aktywny format"} i proponuje start od ukladu ${formatRowsLabel(suggestedRows)} z auto marginesami oraz smart skala. Jedno klikniecie ulozy cala kompozycje bez recznego liczenia.`;
    }
    setAiTags([
      { icon: "fas fa-table-cells-large", label: `Rzedy ${formatRowsLabel(suggestedRows)}` },
      { icon: "fas fa-arrows-left-right-to-line", label: "Auto marginesy" },
      { icon: "fas fa-expand", label: "Smart skala" },
      { icon: "fas fa-layer-group", label: `${context.modules.length} modulow` }
    ]);
    fillStyleModeOptions();
    fillAiStyleModeOptions();
    document.getElementById("magicLayoutGapX").value = "28";
    document.getElementById("magicLayoutGapY").value = "34";
    document.getElementById("magicLayoutMarginX").value = "42";
    document.getElementById("magicLayoutMarginY").value = "42";
    document.getElementById("magicLayoutMarginMode").value = "auto";
    document.getElementById("magicLayoutAlign").value = "center";
    document.getElementById("magicLayoutScale").value = "fit";
    const defaultStyleMode = getPreferredMagicLayoutStyleMode(context.page);
    document.getElementById("magicLayoutStyleMode").value = defaultStyleMode;
    syncAiStyleModeFromMain(context.page);
    fillRowInputs(context.modules.length);
    showError("");
    const applyBtn = backdrop.querySelector("[data-action='apply']");
    const randomBtn = backdrop.querySelector("[data-action='random']");
    const aiApplyBtn = backdrop.querySelector("[data-action='ai-apply']");
    const styleSelect = document.getElementById("magicLayoutStyleMode");
    const aiStyleSelect = document.getElementById("magicLayoutAiStyleMode");
    if (styleSelect) styleSelect.onchange = () => syncAiStyleModeFromMain();
    if (aiStyleSelect) aiStyleSelect.onchange = () => syncMainStyleModeFromAi();
    applyBtn.onclick = () => applyMagicLayout(backdrop._magicLayoutContext);
    randomBtn.onclick = () => applyRandomMagicLayout(backdrop._magicLayoutContext);
    aiApplyBtn.onclick = () => {
      syncMainStyleModeFromAi();
      applyAiMagicLayout(backdrop._magicLayoutContext);
    };
    backdrop.classList.add("is-open");
  }

  function readRows(productCount) {
    const rows = [];
    for (let i = 0; i < MAX_ROWS; i += 1) {
      const input = document.getElementById(`magicLayoutRow${i + 1}`);
      const value = Math.max(0, Math.floor(getNumber(input?.value, 0)));
      if (value > 0) rows.push(value);
    }
    if (!rows.length) return { error: "Podaj przynajmniej jeden rzad z produktami." };

    const normalized = [];
    let left = productCount;
    rows.forEach((value) => {
      if (left <= 0) return;
      const clipped = Math.max(0, Math.min(value, left));
      if (clipped > 0) {
        normalized.push(clipped);
        left -= clipped;
      }
    });

    if (left > 0) {
      if (normalized.length < MAX_ROWS) {
        normalized.push(left);
      } else if (normalized.length > 0) {
        normalized[normalized.length - 1] += left;
      }
    }

    for (let i = 0; i < MAX_ROWS; i += 1) {
      const input = document.getElementById(`magicLayoutRow${i + 1}`);
      if (input) input.value = String(normalized[i] || 0);
    }

    return { rows: normalized };
  }

  function getAutoOuterPadding(pageSize, preferred, ratio, floor) {
    const smartSize = Math.round(pageSize * ratio);
    return Math.max(floor, Math.min(preferred, smartSize));
  }

  function buildLayoutPlan(context, rowsConfig, options) {
    const modules = getOrderedModules(context.modules, options.orderStrategy || "preserve");
    const rows = [];
    let cursor = 0;
    rowsConfig.forEach((count) => {
      rows.push({
        items: modules.slice(cursor, cursor + count),
        startIndex: cursor
      });
      cursor += count;
    });

    const requestedMarginX = Math.max(0, options.marginX);
    const requestedMarginY = Math.max(0, options.marginY);
    const effectiveMarginX = options.marginMode === "auto"
      ? getAutoOuterPadding(context.pageWidth, requestedMarginX, 0.028, 12)
      : requestedMarginX;
    const effectiveMarginY = options.marginMode === "auto"
      ? getAutoOuterPadding(context.pageHeight, requestedMarginY, 0.03, 14)
      : requestedMarginY;

    const usableWidth = Math.max(80, context.pageWidth - (effectiveMarginX * 2));
    const usableHeight = Math.max(80, context.pageHeight - (effectiveMarginY * 2));
    const totalGapHeight = Math.max(0, rows.length - 1) * options.gapY;
    const targetRowHeight = Math.max(44, (usableHeight - totalGapHeight) / Math.max(1, rows.length));
    const rowData = rows.map((rowEntry, rowIndex) => {
      const row = rowEntry.items;
      const rowStartIndex = rowEntry.startIndex;
      const rowMaxHeight = row.reduce((acc, item) => Math.max(acc, item.rect.height), 0);
      const normalizedScales = row.map((item) => {
        const height = Math.max(1, Number(item.rect.height) || 1);
        return rowMaxHeight / height;
      });
      const moduleScaleBiases = row.map((_item, index) => {
        const globalIndex = rowStartIndex + index;
        return Math.max(0.22, Math.min(1.65, getNumber(options.moduleScaleBiases?.[globalIndex], 1)));
      });
      const normalizedWidth = row.reduce((acc, item, index) => {
        return acc + (item.rect.width * normalizedScales[index] * moduleScaleBiases[index]);
      }, 0);
      const widthFitScale = row.length
        ? (usableWidth - Math.max(0, row.length - 1) * options.gapX) / Math.max(1, normalizedWidth)
        : 1;
      const biasedRowHeight = row.reduce((acc, _item, index) => Math.max(acc, rowMaxHeight * moduleScaleBiases[index]), 0);
      const heightFitScale = targetRowHeight / Math.max(1, biasedRowHeight);
      const fitScale = Math.min(widthFitScale, heightFitScale);
      const baseRowScale = options.scaleMode === "fit" ? Math.max(0.12, Math.min(4, fitScale)) : 1;
      const rowScaleBias = Math.max(0.18, Math.min(1.5, getNumber(options.rowScaleBiases?.[rowIndex], getNumber(options.scaleBias, 1))));
      const rowScale = baseRowScale * rowScaleBias;
      const moduleScales = row.map((_item, index) => normalizedScales[index] * moduleScaleBiases[index] * rowScale);
      const rawWidth = row.reduce((acc, item, index) => acc + (item.rect.width * moduleScales[index]), 0) + Math.max(0, row.length - 1) * options.gapX;
      const rawHeight = row.reduce((acc, item, index) => Math.max(acc, item.rect.height * moduleScales[index]), 0);
      return {
        row,
        rowIndex,
        rowScale,
        moduleScales,
        rawWidth,
        rawHeight
      };
    });

    if (options.scaleMode !== "fit") {
      const widthOverflow = rowData.find((entry) => entry.rawWidth > usableWidth + 0.5);
      if (widthOverflow) {
        return { error: "Wybrany uklad nie miesci sie na szerokosc strony. Wlacz dopasowanie automatyczne albo zmniejsz liczbe produktow w rzedzie." };
      }
    }

    let totalHeight = rowData.reduce((acc, entry) => acc + entry.rawHeight, 0) + Math.max(0, rowData.length - 1) * options.gapY;
    if (totalHeight > usableHeight && options.scaleMode === "fit") {
      const verticalFactor = usableHeight / Math.max(1, totalHeight);
      rowData.forEach((entry) => {
        entry.moduleScales = entry.moduleScales.map((scale) => Math.max(0.2, scale * verticalFactor));
        entry.rowScale = Math.max(0.2, entry.rowScale * verticalFactor);
        entry.rawWidth = entry.row.reduce((acc, item, index) => acc + (item.rect.width * entry.moduleScales[index]), 0) + Math.max(0, entry.row.length - 1) * options.gapX;
        entry.rawHeight = entry.row.reduce((acc, item, index) => Math.max(acc, item.rect.height * entry.moduleScales[index]), 0);
      });
      totalHeight = rowData.reduce((acc, entry) => acc + entry.rawHeight, 0) + Math.max(0, rowData.length - 1) * options.gapY;
    }

    if (totalHeight > usableHeight + 0.5) {
      return { error: "Produkty nie mieszcza sie na wysokosc strony. Zmniejsz odstepy albo rozloz je na wiecej rzedow." };
    }

    let startY = effectiveMarginY;
    if (options.marginMode === "auto") {
      const freeVerticalSpace = Math.max(0, usableHeight - totalHeight);
      if (options.verticalMode === "bottom") {
        startY = effectiveMarginY + freeVerticalSpace;
      } else if (options.verticalMode === "top") {
        startY = effectiveMarginY;
      } else {
        startY = effectiveMarginY + (freeVerticalSpace / 2);
      }
    }

    return {
      modules,
      rowData,
      effectiveMarginX,
      effectiveMarginY,
      usableWidth,
      startY
    };
  }

  function layoutModules(context, rowsConfig, options) {
    const plan = buildLayoutPlan(context, rowsConfig, options);
    if (plan.error) return plan;

    const { modules, rowData, effectiveMarginX, usableWidth, startY } = plan;
    const pageWidth = Number(context?.pageWidth || context?.page?.stage?.width?.() || 0);
    const pageHeight = Number(context?.pageHeight || context?.page?.stage?.height?.() || 0);
    const rightLimit = Math.max(effectiveMarginX, pageWidth - effectiveMarginX);
    const bottomLimit = Math.max(0, pageHeight);

    let currentY = startY;
    rowData.forEach((entry) => {
      const plannedRowHeight = entry.row.reduce((acc, item, index) => Math.max(acc, item.rect.height * entry.moduleScales[index]), 0);
      entry.row.forEach((module, index) => {
        const moduleScale = entry.moduleScales[index] || 1;
        if (Math.abs(moduleScale - 1) > 0.001) {
          scaleModule(module, moduleScale, context.page.layer);
        }
      });

      const measuredRects = fitRowModulesToBounds(
        entry.row,
        context.page.layer,
        usableWidth,
        plannedRowHeight,
        options.gapX
      );
      const rowWidth = measuredRects.reduce((acc, rect) => acc + Math.max(1, Number(rect?.width) || 1), 0) + Math.max(0, entry.row.length - 1) * options.gapX;
      const rowHeight = measuredRects.reduce((acc, rect) => Math.max(acc, Math.max(1, Number(rect?.height) || 1)), 0);

      let currentX = effectiveMarginX;
      const rowAlign = Array.isArray(options.rowAlignModes) ? (options.rowAlignModes[entry.rowIndex] || options.align) : options.align;
      if (rowAlign === "center") currentX += Math.max(0, (usableWidth - rowWidth) / 2);
      if (rowAlign === "right") currentX += Math.max(0, usableWidth - rowWidth);

      entry.row.forEach((module, index) => {
        const moduleRect = getNodesRect(module.nodes, context.page.layer);
        if (moduleRect) module.rect = moduleRect;
        const targetY = currentY + Math.max(0, (rowHeight - module.rect.height) / 2);
        moveModule(module, currentX, targetY, context.page.layer);

        const finalRect = getNodesRect(module.nodes, context.page.layer);
        if (finalRect) {
          module.rect = finalRect;
          const overflowRight = (finalRect.x + finalRect.width) - rightLimit;
          const overflowBottom = (finalRect.y + finalRect.height) - bottomLimit;
          if (overflowRight > 0 || overflowBottom > 0) {
            const widthFactor = overflowRight > 0
              ? Math.max(0.12, (Math.max(1, rightLimit - finalRect.x)) / Math.max(1, finalRect.width))
              : 1;
            const heightFactor = overflowBottom > 0
              ? Math.max(0.12, (Math.max(1, bottomLimit - finalRect.y)) / Math.max(1, finalRect.height))
              : 1;
            const fitFactor = Math.min(1, widthFactor, heightFactor);
            if (fitFactor < 0.999) {
              scaleModule(module, fitFactor, context.page.layer);
              moveModule(module, currentX, targetY, context.page.layer);
              const correctedRect = getNodesRect(module.nodes, context.page.layer);
              if (correctedRect) module.rect = correctedRect;
            }
          }
        }

        currentX += Math.max(1, Number(module.rect?.width) || 1) + options.gapX;
      });

      currentY += rowHeight + options.gapY;
    });

    context.page.selectedNodes = modules.flatMap((module) => module.nodes);
    context.page.transformer?.nodes?.(context.page.selectedNodes);
    context.page.layer?.batchDraw?.();
    context.page.transformerLayer?.batchDraw?.();
    try {
      window.dispatchEvent(new CustomEvent("canvasModified", { detail: context.page.stage }));
    } catch (_err) {}
    return { ok: true };
  }

  function writeRowsToInputs(rows) {
    for (let i = 0; i < MAX_ROWS; i += 1) {
      const input = document.getElementById(`magicLayoutRow${i + 1}`);
      if (input) input.value = String(rows[i] || 0);
    }
  }

  function writeOptionsToInputs(options) {
    document.getElementById("magicLayoutGapX").value = String(Math.max(0, Math.round(getNumber(options.gapX, 28))));
    document.getElementById("magicLayoutGapY").value = String(Math.max(0, Math.round(getNumber(options.gapY, 34))));
    document.getElementById("magicLayoutMarginX").value = String(Math.max(0, Math.round(getNumber(options.marginX, 42))));
    document.getElementById("magicLayoutMarginY").value = String(Math.max(0, Math.round(getNumber(options.marginY, 42))));
    document.getElementById("magicLayoutMarginMode").value = options.marginMode || "auto";
    document.getElementById("magicLayoutAlign").value = options.align || "center";
    document.getElementById("magicLayoutScale").value = options.scaleMode || "fit";
    const styleSelect = document.getElementById("magicLayoutStyleMode");
    if (styleSelect && options.styleMode) styleSelect.value = options.styleMode;
    syncAiStyleModeFromMain();
  }

  function getPresetSignature(rows, options, flavor) {
    return [
      rows.join("-"),
      options.align || "center",
      options.marginMode || "manual",
      options.orderStrategy || "preserve",
      options.verticalMode || "center",
      Array.isArray(options.rowAlignModes) ? options.rowAlignModes.join(",") : "",
      Array.isArray(options.rowScaleBiases) ? options.rowScaleBiases.map((value) => Math.round(getNumber(value, 1) * 100)).join(",") : "",
      Array.isArray(options.moduleScaleBiases) ? options.moduleScaleBiases.map((value) => Math.round(getNumber(value, 1) * 100)).join(",") : "",
      Math.round(getNumber(options.scaleBias, 1) * 100),
      Math.round(getNumber(options.gapX, 0)),
      Math.round(getNumber(options.gapY, 0)),
      Math.round(getNumber(options.marginX, 0)),
      Math.round(getNumber(options.marginY, 0)),
      flavor || ""
    ].join("|");
  }

  function buildWaveRows(count) {
    if (count <= 2) return [count];
    if (count === 3) return [1, 2];
    if (count === 4) return [2, 2];
    const inner = Math.max(1, count - 4);
    const middle = getRecommendedRows(inner);
    return uniqueRowsVariant([2, ...middle, 2]);
  }

  function buildCenterHeroRows(count) {
    if (count <= 2) return [count];
    if (count === 3) return [1, 2];
    if (count === 4) return [1, 2, 1];
    return uniqueRowsVariant([1, ...getRecommendedRows(count - 2), 1]);
  }

  function buildPairRows(count) {
    if (count <= 3) return [count];
    if (count === 4) return [2, 2];
    return uniqueRowsVariant([2, ...getRecommendedRows(count - 2)]);
  }

  function buildTailPairRows(count) {
    if (count <= 3) return [count];
    if (count === 4) return [2, 2];
    return uniqueRowsVariant([...getRecommendedRows(count - 2), 2]);
  }

  function buildPyramidRows(count) {
    if (count <= 3) return [count];
    if (count === 4) return [1, 2, 1];
    if (count === 5) return [1, 3, 1];
    if (count === 6) return [1, 4, 1];
    return uniqueRowsVariant([1, ...getRecommendedRows(count - 2), 1]);
  }

  function buildReversePyramidRows(count) {
    if (count <= 3) return [count];
    if (count === 4) return [2, 1, 1];
    if (count === 5) return [2, 1, 2];
    if (count === 6) return [3, 1, 2];
    return uniqueRowsVariant(getRecommendedRows(count).slice().reverse());
  }

  function buildHeroTopRows(count) {
    if (count <= 3) return [count];
    return uniqueRowsVariant([1, ...getRecommendedRows(count - 1)]);
  }

  function buildHeroBottomRows(count) {
    if (count <= 3) return [count];
    return uniqueRowsVariant([...getRecommendedRows(count - 1), 1]);
  }

  function buildTripleFlowRows(count) {
    if (count <= 4) return getRecommendedRows(count);
    return uniqueRowsVariant([3, ...getRecommendedRows(count - 3)]);
  }

  function buildTailTripleRows(count) {
    if (count <= 4) return getRecommendedRows(count);
    return uniqueRowsVariant([...getRecommendedRows(count - 3), 3]);
  }

  function buildAlternatingRows(count) {
    if (count <= 3) return [count];
    const rows = [];
    let left = count;
    let toggle = 2;
    while (left > 0 && rows.length < MAX_ROWS) {
      const take = Math.min(toggle, left);
      rows.push(take);
      left -= take;
      toggle = toggle === 2 ? 1 : 2;
    }
    if (left > 0 && rows.length) rows[rows.length - 1] += left;
    return uniqueRowsVariant(rows);
  }

  function buildAlternatingWideRows(count) {
    if (count <= 4) return getRecommendedRows(count);
    const rows = [];
    let left = count;
    let toggle = 3;
    while (left > 0 && rows.length < MAX_ROWS) {
      const take = Math.min(toggle, left);
      rows.push(take);
      left -= take;
      toggle = toggle === 3 ? 2 : 3;
    }
    if (left > 0 && rows.length) rows[rows.length - 1] += left;
    return uniqueRowsVariant(rows);
  }

  function buildLadderRows(count) {
    if (count <= 3) return [count];
    const rows = [];
    let left = count;
    let next = 1;
    while (left > 0 && rows.length < MAX_ROWS) {
      const take = Math.min(next, left);
      rows.push(take);
      left -= take;
      next = Math.min(next + 1, 3);
    }
    if (left > 0 && rows.length) rows[rows.length - 1] += left;
    return uniqueRowsVariant(rows);
  }

  function buildReverseLadderRows(count) {
    return uniqueRowsVariant(buildLadderRows(count).slice().reverse());
  }

  function buildEdgeHeavyRows(count) {
    if (count <= 4) return getRecommendedRows(count);
    if (count === 5) return [2, 1, 2];
    if (count === 6) return [2, 2, 2];
    return uniqueRowsVariant([2, ...getRecommendedRows(count - 4), 2]);
  }

  function buildTwinColumnRows(count) {
    if (count <= 0) return [0];
    if (count <= 2) return [count];
    const rowCount = Math.min(MAX_ROWS, Math.max(1, Math.ceil(count / 2)));
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

    return uniqueRowsVariant(rows);
  }

  function buildCenterDenseRows(count) {
    if (count <= 4) return getRecommendedRows(count);
    const middle = Math.min(4, Math.max(2, Math.ceil(count / 2)));
    const left = count - middle;
    return uniqueRowsVariant([Math.ceil(left / 2), middle, Math.floor(left / 2)].filter((v) => v > 0));
  }

  function buildAllRowPartitions(count, maxRows = MAX_ROWS) {
    const out = new Map();
    const maxRowSize = Math.max(1, Math.min(count, 8));
    const walk = (left, acc) => {
      if (left === 0) {
        const normalized = uniqueRowsVariant(acc);
        if (normalized.length && normalized.length <= maxRows) out.set(normalized.join("-"), normalized);
        return;
      }
      if (acc.length >= maxRows) return;
      for (let size = 1; size <= Math.min(left, maxRowSize); size += 1) {
        walk(left - size, acc.concat(size));
      }
    };
    walk(count, []);
    return Array.from(out.values());
  }

  function getRandomRowVariants(count) {
    const variants = new Map();
    const push = (rows) => {
      const normalized = uniqueRowsVariant(rows);
      if (!normalized.length || normalized.reduce((acc, value) => acc + value, 0) !== count) return;
      if (normalized.length > MAX_ROWS) return;
      variants.set(normalized.join("-"), normalized);
    };

    const recommended = getRecommendedRows(count);
    push(recommended);
    push(recommended.slice().reverse());
    if (count === 2) {
      push([1, 1]);
    }
    if (count === 3) {
      push([1, 2]);
      push([2, 1]);
      push([1, 1, 1]);
    }
    if (count === 4) {
      push([4]);
      push([1, 3]);
      push([3, 1]);
      push([1, 2, 1]);
      push([2, 1, 1]);
      push([1, 1, 2]);
      push([1, 1, 1, 1]);
    }
    push(buildWaveRows(count));
    push(buildCenterHeroRows(count));
    push(buildPairRows(count));
    push(buildTailPairRows(count));
    push(buildPyramidRows(count));
    push(buildReversePyramidRows(count));
    push(buildHeroTopRows(count));
    push(buildHeroBottomRows(count));
    push(buildTripleFlowRows(count));
    push(buildTailTripleRows(count));
    push(buildAlternatingRows(count));
    push(buildAlternatingWideRows(count));
    push(buildLadderRows(count));
    push(buildReverseLadderRows(count));
    push(buildEdgeHeavyRows(count));
    push(buildCenterDenseRows(count));
    buildAllRowPartitions(count).forEach((rows) => push(rows));

    if (count > 3) {
      push([1, ...getRecommendedRows(count - 1)]);
      push([...getRecommendedRows(count - 1), 1]);
      push([1, 1, ...getRecommendedRows(count - 2)]);
      push([...getRecommendedRows(count - 2), 1, 1]);
    }
    if (count > 4) {
      push([2, ...getRecommendedRows(count - 2)]);
      push([...getRecommendedRows(count - 2), 2]);
      push([1, 2, ...getRecommendedRows(count - 3)]);
      push([...getRecommendedRows(count - 3), 2, 1]);
      push([2, 1, ...getRecommendedRows(count - 3)]);
      push([...getRecommendedRows(count - 3), 1, 2]);
      push([1, ...getRecommendedRows(count - 3), 2]);
      push([2, ...getRecommendedRows(count - 3), 1]);
    }
    if (count > 5) {
      push([3, ...getRecommendedRows(count - 3)]);
      push([...getRecommendedRows(count - 3), 3]);
      push([2, 2, ...getRecommendedRows(count - 4)]);
      push([...getRecommendedRows(count - 4), 2, 2]);
      push([1, 3, ...getRecommendedRows(count - 4)]);
      push([...getRecommendedRows(count - 4), 3, 1]);
    }

    return Array.from(variants.values());
  }

  function getOrderStrategies(context) {
    const strategies = ["preserve", "reverse", "area-desc", "area-asc", "hero-first", "hero-last", "outer-focus"];
    const widthSpread = context.modules.reduce((acc, module) => acc + Math.abs((Number(module.rect.width) || 0) - (Number(module.rect.height) || 0)), 0);
    if (widthSpread > 40) {
      strategies.push("width-desc", "width-asc");
    }
    return Array.from(new Set(strategies));
  }

  function getVerticalModes(context) {
    const modes = ["center"];
    const isPortrait = context.pageHeight >= context.pageWidth;
    if (isPortrait || context.modules.length <= 4) {
      modes.push("top", "bottom");
    }
    return Array.from(new Set(modes));
  }

  function getRandomProfiles(context) {
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const baseMargin = Math.max(18, Math.round(shortSide * 0.04));
    return [
      {
        flavor: "balanced-tight",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(16, 24),
        gapY: randomInt(22, 34),
        marginX: randomInt(Math.max(16, baseMargin - 10), baseMargin),
        marginY: randomInt(Math.max(18, baseMargin - 8), baseMargin + 8)
      },
      {
        flavor: "balanced-airy",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(24, 36),
        gapY: randomInt(30, 48),
        marginX: randomInt(baseMargin, baseMargin + 12),
        marginY: randomInt(baseMargin, baseMargin + 16)
      },
      {
        flavor: "left-flow",
        align: "left",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(18, 30),
        gapY: randomInt(24, 40),
        marginX: randomInt(Math.max(16, baseMargin - 6), baseMargin + 8),
        marginY: randomInt(Math.max(18, baseMargin - 4), baseMargin + 12)
      },
      {
        flavor: "right-flow",
        align: "right",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(18, 30),
        gapY: randomInt(24, 40),
        marginX: randomInt(Math.max(16, baseMargin - 6), baseMargin + 8),
        marginY: randomInt(Math.max(18, baseMargin - 4), baseMargin + 12)
      },
      {
        flavor: "poster",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(14, 22),
        gapY: randomInt(18, 28),
        marginX: randomInt(16, Math.max(18, baseMargin - 6)),
        marginY: randomInt(18, Math.max(20, baseMargin - 4))
      },
      {
        flavor: "gallery-soft",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(20, 28),
        gapY: randomInt(26, 38),
        marginX: randomInt(baseMargin - 4, baseMargin + 10),
        marginY: randomInt(baseMargin + 2, baseMargin + 14)
      },
      {
        flavor: "catalog-tight",
        align: "left",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(12, 20),
        gapY: randomInt(18, 28),
        marginX: randomInt(14, baseMargin),
        marginY: randomInt(16, baseMargin + 4)
      },
      {
        flavor: "catalog-wide",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(28, 40),
        gapY: randomInt(22, 34),
        marginX: randomInt(baseMargin + 4, baseMargin + 16),
        marginY: randomInt(baseMargin, baseMargin + 10)
      },
      {
        flavor: "spotlight-left",
        align: "left",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(20, 32),
        gapY: randomInt(28, 42),
        marginX: randomInt(18, baseMargin + 6),
        marginY: randomInt(baseMargin, baseMargin + 14)
      },
      {
        flavor: "spotlight-right",
        align: "right",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(20, 32),
        gapY: randomInt(28, 42),
        marginX: randomInt(18, baseMargin + 6),
        marginY: randomInt(baseMargin, baseMargin + 14)
      },
      {
        flavor: "dense-grid",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(10, 18),
        gapY: randomInt(14, 24),
        marginX: randomInt(12, baseMargin - 2),
        marginY: randomInt(14, baseMargin + 2)
      },
      {
        flavor: "air-premium",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(30, 44),
        gapY: randomInt(34, 52),
        marginX: randomInt(baseMargin + 8, baseMargin + 20),
        marginY: randomInt(baseMargin + 8, baseMargin + 20)
      },
      {
        flavor: "magazine-left",
        align: "left",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(16, 26),
        gapY: randomInt(24, 36),
        marginX: randomInt(14, baseMargin + 4),
        marginY: randomInt(18, baseMargin + 12)
      },
      {
        flavor: "magazine-right",
        align: "right",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(16, 26),
        gapY: randomInt(24, 36),
        marginX: randomInt(14, baseMargin + 4),
        marginY: randomInt(18, baseMargin + 12)
      },
      {
        flavor: "compact-center",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(14, 20),
        gapY: randomInt(18, 26),
        marginX: randomInt(14, baseMargin),
        marginY: randomInt(16, baseMargin + 4)
      },
      {
        flavor: "showcase",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(22, 34),
        gapY: randomInt(32, 46),
        marginX: randomInt(baseMargin + 2, baseMargin + 14),
        marginY: randomInt(baseMargin + 6, baseMargin + 18)
      },
      {
        flavor: "editorial-sweep",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(12, 20),
        gapY: randomInt(34, 52),
        marginX: randomInt(Math.max(14, baseMargin - 6), baseMargin + 8),
        marginY: randomInt(baseMargin + 8, baseMargin + 22)
      },
      {
        flavor: "stagger-left-air",
        align: "left",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(14, 24),
        gapY: randomInt(28, 44),
        marginX: randomInt(16, baseMargin + 6),
        marginY: randomInt(baseMargin + 2, baseMargin + 16)
      },
      {
        flavor: "stagger-right-air",
        align: "right",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(14, 24),
        gapY: randomInt(28, 44),
        marginX: randomInt(16, baseMargin + 6),
        marginY: randomInt(baseMargin + 2, baseMargin + 16)
      },
      {
        flavor: "gallery-runway",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(18, 26),
        gapY: randomInt(16, 26),
        marginX: randomInt(baseMargin, baseMargin + 12),
        marginY: randomInt(12, baseMargin)
      },
      {
        flavor: "minimal-premium",
        align: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(34, 50),
        gapY: randomInt(24, 36),
        marginX: randomInt(baseMargin + 10, baseMargin + 24),
        marginY: randomInt(baseMargin + 12, baseMargin + 24)
      },
      {
        flavor: "cinematic-left",
        align: "left",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(10, 18),
        gapY: randomInt(20, 34),
        marginX: randomInt(14, baseMargin + 2),
        marginY: randomInt(baseMargin, baseMargin + 12)
      },
      {
        flavor: "cinematic-right",
        align: "right",
        marginMode: "auto",
        scaleMode: "fit",
        gapX: randomInt(10, 18),
        gapY: randomInt(20, 34),
        marginX: randomInt(14, baseMargin + 2),
        marginY: randomInt(baseMargin, baseMargin + 12)
      }
    ];
  }

  function getGeneratedProfiles(context) {
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
    const scaleBiases = isSingle
      ? [0.46, 0.58, 0.72, 0.88, 1.02]
      : [0.62, 0.76, 0.9, 1, 1.08];
    const profiles = [];
    const seen = new Set();

    alignModes.forEach((align) => {
      verticalModes.forEach((verticalMode) => {
        gapPresets.forEach((gap) => {
          marginPresets.forEach((margin) => {
            scaleBiases.forEach((scaleBias) => {
              const flavor = `generated-${context.modules.length}-${align}-${verticalMode}-${gap.name}-${margin.name}-${Math.round(scaleBias * 100)}`;
              if (seen.has(flavor)) return;
              seen.add(flavor);
              profiles.push({
                flavor,
                align,
                verticalMode,
                marginMode: "auto",
                scaleMode: "fit",
                orderStrategy: "preserve",
                gapX: gap.gapX,
                gapY: gap.gapY,
                marginX: margin.marginX,
                marginY: margin.marginY,
                scaleBias
              });
            });
          });
        });
      });
    });

    return profiles;
  }

  function getSingleProductProfiles(context) {
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const compact = Math.max(18, Math.round(shortSide * 0.05));
    const standard = Math.max(28, Math.round(shortSide * 0.08));
    const airy = Math.max(44, Math.round(shortSide * 0.12));
    const heavy = Math.max(62, Math.round(shortSide * 0.17));
    const presets = [];
    const positions = [
      ["center", "center"],
      ["left", "center"],
      ["right", "center"],
      ["center", "top"],
      ["center", "bottom"],
      ["left", "top"],
      ["right", "top"],
      ["left", "bottom"],
      ["right", "bottom"]
    ];
    const sizes = [
      ["hero", compact, compact, 1.02],
      ["large", standard, standard, 0.88],
      ["medium", airy, airy, 0.68],
      ["small", heavy, heavy, 0.52]
    ];

    sizes.forEach(([sizeName, marginX, marginY, scaleBias]) => {
      positions.forEach(([align, verticalMode]) => {
        presets.push({
          flavor: `single-${sizeName}-${align}-${verticalMode}`,
          align,
          verticalMode,
          marginMode: "auto",
          scaleMode: "fit",
          orderStrategy: "preserve",
          gapX: 0,
          gapY: 0,
          marginX,
          marginY,
          scaleBias
        });
      });
    });

    presets.push(
      { flavor: "single-center-tiny", align: "center", verticalMode: "center", marginMode: "auto", scaleMode: "fit", orderStrategy: "preserve", gapX: 0, gapY: 0, marginX: heavy + 22, marginY: heavy + 22, scaleBias: 0.4 },
      { flavor: "single-left-tiny", align: "left", verticalMode: "center", marginMode: "auto", scaleMode: "fit", orderStrategy: "preserve", gapX: 0, gapY: 0, marginX: heavy + 20, marginY: heavy + 10, scaleBias: 0.42 },
      { flavor: "single-right-tiny", align: "right", verticalMode: "center", marginMode: "auto", scaleMode: "fit", orderStrategy: "preserve", gapX: 0, gapY: 0, marginX: heavy + 20, marginY: heavy + 10, scaleBias: 0.42 },
      { flavor: "single-top-wide", align: "center", verticalMode: "top", marginMode: "auto", scaleMode: "fit", orderStrategy: "preserve", gapX: 0, gapY: 0, marginX: standard, marginY: compact, scaleBias: 0.78 },
      { flavor: "single-bottom-wide", align: "center", verticalMode: "bottom", marginMode: "auto", scaleMode: "fit", orderStrategy: "preserve", gapX: 0, gapY: 0, marginX: standard, marginY: compact, scaleBias: 0.78 }
    );

    return presets;
  }

  function getTwoProductProfiles(context) {
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const compact = Math.max(18, Math.round(shortSide * 0.05));
    const standard = Math.max(26, Math.round(shortSide * 0.08));
    const airy = Math.max(42, Math.round(shortSide * 0.12));
    const heavy = Math.max(58, Math.round(shortSide * 0.16));
    const profiles = [];

    const sideBySideAnchors = [
      ["center", "center"],
      ["center", "top"],
      ["center", "bottom"],
      ["left", "center"],
      ["right", "center"],
      ["left", "top"],
      ["right", "top"],
      ["left", "bottom"],
      ["right", "bottom"]
    ];
    const sideBySideSizes = [
      ["equal-hero", [0.94, 0.94], compact, compact, 18],
      ["equal-large", [0.82, 0.82], standard, standard, 22],
      ["equal-medium", [0.68, 0.68], airy, airy, 24],
      ["left-big-right-small", [1, 0.62], standard, airy, 20],
      ["left-small-right-big", [0.62, 1], standard, airy, 20],
      ["left-medium-right-small", [0.82, 0.58], airy, airy, 18],
      ["left-small-right-medium", [0.58, 0.82], airy, airy, 18],
      ["hero-plus-tiny-left", [1, 0.46], compact, heavy, 22],
      ["hero-plus-tiny-right", [0.46, 1], compact, heavy, 22]
    ];

    sideBySideSizes.forEach(([name, moduleScaleBiases, marginX, marginY, gapX]) => {
      sideBySideAnchors.forEach(([align, verticalMode]) => {
        profiles.push({
          flavor: `two-side-${name}-${align}-${verticalMode}`,
          fixedRows: [2],
          align,
          verticalMode,
          marginMode: "auto",
          scaleMode: "fit",
          gapX,
          gapY: 0,
          marginX,
          marginY,
          scaleBias: 1,
          moduleScaleBiases
        });
      });
    });

    const stackedGroups = [
      ["top-big-bottom-small", [1, 0.58], ["center", "center"], standard, standard],
      ["top-small-bottom-big", [0.58, 1], ["center", "center"], standard, standard],
      ["top-big-left-bottom-right", [1, 0.56], ["left", "right"], standard, standard],
      ["top-big-right-bottom-left", [1, 0.56], ["right", "left"], standard, standard],
      ["top-small-left-bottom-big-right", [0.56, 1], ["left", "right"], standard, standard],
      ["top-small-right-bottom-big-left", [0.56, 1], ["right", "left"], standard, standard],
      ["equal-medium-stack", [0.72, 0.72], ["center", "center"], airy, airy],
      ["equal-large-stack", [0.84, 0.84], ["center", "center"], standard, standard],
      ["left-stack-medium", [0.7, 0.7], ["left", "left"], airy, airy],
      ["right-stack-medium", [0.7, 0.7], ["right", "right"], airy, airy],
      ["zigzag-soft", [0.78, 0.64], ["left", "right"], airy, airy],
      ["zigzag-soft-reverse", [0.64, 0.78], ["right", "left"], airy, airy]
    ];
    const stackModes = ["top", "center", "bottom"];

    stackedGroups.forEach(([name, rowScaleBiases, rowAlignModes, marginX, marginY]) => {
      stackModes.forEach((verticalMode) => {
        profiles.push({
          flavor: `two-stack-${name}-${verticalMode}`,
          fixedRows: [1, 1],
          align: "center",
          rowAlignModes,
          rowScaleBiases,
          verticalMode,
          marginMode: "auto",
          scaleMode: "fit",
          gapX: 0,
          gapY: randomInt(18, 32),
          marginX,
          marginY,
          scaleBias: 1
        });
      });
    });

    return profiles;
  }

  function getThreeProductProfiles(context) {
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const compact = Math.max(18, Math.round(shortSide * 0.05));
    const standard = Math.max(28, Math.round(shortSide * 0.08));
    const airy = Math.max(42, Math.round(shortSide * 0.12));
    const heavy = Math.max(58, Math.round(shortSide * 0.16));
    const profiles = [];
    const addProfile = (profile) => profiles.push({
      marginMode: "auto",
      scaleMode: "fit",
      align: "center",
      verticalMode: "center",
      gapX: 18,
      gapY: 20,
      scaleBias: 1,
      ...profile
    });

    [
      { flavor: "three-row-balanced", fixedRows: [3], verticalMode: "top", gapX: 16, gapY: 0, marginX: standard, marginY: compact, moduleScaleBiases: [0.94, 0.94, 0.94] },
      { flavor: "three-row-center-hero", fixedRows: [3], verticalMode: "top", gapX: 14, gapY: 0, marginX: compact, marginY: compact, moduleScaleBiases: [0.82, 1.18, 0.82] },
      { flavor: "three-row-left-hero", fixedRows: [3], align: "left", verticalMode: "center", gapX: 14, gapY: 0, marginX: compact, marginY: standard, moduleScaleBiases: [1.16, 0.88, 0.7] },
      { flavor: "three-row-right-hero", fixedRows: [3], align: "right", verticalMode: "center", gapX: 14, gapY: 0, marginX: compact, marginY: standard, moduleScaleBiases: [0.7, 0.88, 1.16] },
      { flavor: "three-top-hero", fixedRows: [1, 2], verticalMode: "top", gapX: 18, gapY: 20, marginX: compact, marginY: standard, rowScaleBiases: [1.18, 0.74], rowAlignModes: ["center", "center"], orderStrategy: "hero-first" },
      { flavor: "three-bottom-hero", fixedRows: [2, 1], verticalMode: "bottom", gapX: 18, gapY: 20, marginX: compact, marginY: standard, rowScaleBiases: [0.74, 1.18], rowAlignModes: ["center", "center"], orderStrategy: "hero-last" },
      { flavor: "three-zigzag-top", fixedRows: [1, 2], verticalMode: "top", gapX: 16, gapY: 18, marginX: standard, marginY: standard, rowScaleBiases: [1.04, 0.82], rowAlignModes: ["left", "right"] },
      { flavor: "three-zigzag-bottom", fixedRows: [2, 1], verticalMode: "bottom", gapX: 16, gapY: 18, marginX: standard, marginY: standard, rowScaleBiases: [0.82, 1.04], rowAlignModes: ["left", "right"] },
      { flavor: "three-column-center", fixedRows: [1, 1, 1], gapX: 0, gapY: 14, marginX: standard, marginY: heavy, rowScaleBiases: [1.18, 0.92, 0.72], rowAlignModes: ["center", "center", "center"] },
      { flavor: "three-column-left", fixedRows: [1, 1, 1], verticalMode: "top", gapX: 0, gapY: 12, marginX: compact, marginY: heavy, rowScaleBiases: [1.12, 0.88, 0.68], rowAlignModes: ["left", "left", "left"] },
      { flavor: "three-column-right", fixedRows: [1, 1, 1], verticalMode: "bottom", gapX: 0, gapY: 12, marginX: compact, marginY: heavy, rowScaleBiases: [1.12, 0.88, 0.68], rowAlignModes: ["right", "right", "right"] },
      { flavor: "three-pyramid", fixedRows: [1, 1, 1], gapX: 0, gapY: 16, marginX: airy, marginY: heavy, rowScaleBiases: [0.84, 1.18, 0.78], rowAlignModes: ["center", "left", "right"] }
    ].forEach(addProfile);

    return profiles;
  }

  function getFiveProductProfiles(context) {
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const compact = Math.max(18, Math.round(shortSide * 0.05));
    const standard = Math.max(28, Math.round(shortSide * 0.08));
    const airy = Math.max(44, Math.round(shortSide * 0.12));
    const heavy = Math.max(60, Math.round(shortSide * 0.165));
    const profiles = [];
    const addProfile = (profile) => profiles.push({
      marginMode: "auto",
      scaleMode: "fit",
      align: "center",
      verticalMode: "center",
      gapX: 18,
      gapY: 20,
      scaleBias: 1,
      ...profile
    });

    [
      { flavor: "five-balanced-32", fixedRows: [3, 2], gapX: 16, gapY: 18, marginX: standard, marginY: standard, rowScaleBiases: [0.98, 0.92], rowAlignModes: ["center", "center"] },
      { flavor: "five-balanced-23", fixedRows: [2, 3], gapX: 16, gapY: 18, marginX: standard, marginY: standard, rowScaleBiases: [0.92, 0.98], rowAlignModes: ["center", "center"] },
      { flavor: "five-bridge", fixedRows: [2, 1, 2], gapX: 16, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [0.82, 1.16, 0.82], rowAlignModes: ["center", "center", "center"] },
      { flavor: "five-hero-center", fixedRows: [1, 3, 1], gapX: 18, gapY: 20, marginX: compact, marginY: standard, rowScaleBiases: [0.72, 1.16, 0.72], rowAlignModes: ["center", "center", "center"], orderStrategy: "hero-first" },
      { flavor: "five-left-cascade", fixedRows: [1, 2, 2], gapX: 16, gapY: 18, marginX: compact, marginY: airy, rowScaleBiases: [1.12, 0.84, 0.84], rowAlignModes: ["left", "left", "center"] },
      { flavor: "five-right-cascade", fixedRows: [2, 2, 1], gapX: 16, gapY: 18, marginX: compact, marginY: airy, rowScaleBiases: [0.84, 0.84, 1.12], rowAlignModes: ["center", "right", "right"] },
      { flavor: "five-totem-top", fixedRows: [1, 1, 3], verticalMode: "top", gapX: 14, gapY: 14, marginX: compact, marginY: heavy, rowScaleBiases: [1.16, 0.92, 0.72], rowAlignModes: ["center", "left", "center"] },
      { flavor: "five-totem-bottom", fixedRows: [3, 1, 1], verticalMode: "bottom", gapX: 14, gapY: 14, marginX: compact, marginY: heavy, rowScaleBiases: [0.72, 0.92, 1.16], rowAlignModes: ["center", "right", "center"] },
      { flavor: "five-band-top", fixedRows: [5], verticalMode: "top", gapX: 10, gapY: 0, marginX: compact, marginY: compact, moduleScaleBiases: [1.1, 0.96, 0.84, 0.72, 0.6], orderStrategy: "hero-first" },
      { flavor: "five-band-bottom", fixedRows: [5], verticalMode: "bottom", gapX: 10, gapY: 0, marginX: compact, marginY: compact, moduleScaleBiases: [0.6, 0.72, 0.84, 0.96, 1.1], orderStrategy: "hero-last" },
      { flavor: "five-column", fixedRows: [1, 1, 1, 1, 1], gapX: 0, gapY: 10, marginX: standard, marginY: heavy + 8, rowScaleBiases: [1.18, 1.0, 0.86, 0.72, 0.58], rowAlignModes: ["center", "center", "center", "center", "center"] },
      { flavor: "five-runway", fixedRows: [2, 1, 2], verticalMode: "center", gapX: 20, gapY: 22, marginX: airy, marginY: standard, moduleScaleBiases: [0.92, 0.92, 1.18, 0.92, 0.92], rowAlignModes: ["center", "center", "center"] }
    ].forEach(addProfile);

    return profiles;
  }

  function getSixProductProfiles(context) {
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const compact = Math.max(18, Math.round(shortSide * 0.05));
    const standard = Math.max(28, Math.round(shortSide * 0.08));
    const airy = Math.max(44, Math.round(shortSide * 0.12));
    const heavy = Math.max(62, Math.round(shortSide * 0.17));
    const profiles = [];
    const addProfile = (profile) => profiles.push({
      marginMode: "auto",
      scaleMode: "fit",
      align: "center",
      verticalMode: "center",
      gapX: 18,
      gapY: 20,
      scaleBias: 1,
      ...profile
    });

    [
      { flavor: "six-grid-33", fixedRows: [3, 3], gapX: 14, gapY: 16, marginX: standard, marginY: standard, rowScaleBiases: [0.96, 0.96], rowAlignModes: ["center", "center"] },
      { flavor: "six-grid-33-zigzag", fixedRows: [3, 3], gapX: 16, gapY: 18, marginX: standard, marginY: standard, rowScaleBiases: [1.02, 0.86], rowAlignModes: ["left", "right"] },
      { flavor: "six-grid-222", fixedRows: [2, 2, 2], gapX: 16, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [0.94, 0.94, 0.94], rowAlignModes: ["center", "center", "center"] },
      { flavor: "six-grid-222-left", fixedRows: [2, 2, 2], verticalMode: "top", gapX: 16, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [1.04, 0.9, 0.76], rowAlignModes: ["left", "left", "left"] },
      { flavor: "six-grid-222-right", fixedRows: [2, 2, 2], verticalMode: "bottom", gapX: 16, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [1.04, 0.9, 0.76], rowAlignModes: ["right", "right", "right"] },
      { flavor: "six-band-top", fixedRows: [4, 2], verticalMode: "top", gapX: 12, gapY: 18, marginX: compact, marginY: compact, rowScaleBiases: [0.84, 1.04], rowAlignModes: ["center", "center"] },
      { flavor: "six-band-bottom", fixedRows: [2, 4], verticalMode: "bottom", gapX: 12, gapY: 18, marginX: compact, marginY: compact, rowScaleBiases: [1.04, 0.84], rowAlignModes: ["center", "center"] },
      { flavor: "six-cross", fixedRows: [1, 4, 1], gapX: 16, gapY: 16, marginX: airy, marginY: standard, rowScaleBiases: [0.72, 1.08, 0.72], rowAlignModes: ["center", "center", "center"] },
      { flavor: "six-runway", fixedRows: [1, 2, 2, 1], gapX: 18, gapY: 14, marginX: standard, marginY: airy, rowScaleBiases: [0.78, 0.92, 0.92, 0.78], rowAlignModes: ["center", "left", "right", "center"] },
      { flavor: "six-cascade-left", fixedRows: [3, 2, 1], verticalMode: "top", gapX: 16, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [0.78, 0.96, 1.18], rowAlignModes: ["center", "left", "left"] },
      { flavor: "six-cascade-right", fixedRows: [1, 2, 3], verticalMode: "bottom", gapX: 16, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [1.18, 0.96, 0.78], rowAlignModes: ["right", "right", "center"] },
      { flavor: "six-column", fixedRows: [1, 1, 1, 1, 1, 1], gapX: 0, gapY: 8, marginX: standard, marginY: heavy + 10, rowScaleBiases: [1.2, 1.04, 0.9, 0.78, 0.66, 0.54], rowAlignModes: ["center", "center", "center", "center", "center", "center"] }
    ].forEach(addProfile);

    return profiles;
  }

  function getLargeCatalogProfiles(context) {
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const compact = Math.max(16, Math.round(shortSide * 0.042));
    const standard = Math.max(24, Math.round(shortSide * 0.072));
    const airy = Math.max(34, Math.round(shortSide * 0.098));
    const rows = buildTwinColumnRows(context.modules.length);
    const rowCount = Math.max(1, rows.length);
    const centerAlignModes = rows.map(() => "center");
    const snakeAlignModes = rows.map((_, index) => (index % 2 === 0 ? "left" : "right"));
    const leftAlignModes = rows.map(() => "left");
    const rightAlignModes = rows.map(() => "right");
    const topHeavyBiases = rows.map((_, index) => Math.max(0.76, 1.1 - (index * 0.06)));
    const bottomHeavyBiases = rows.map((_, index) => Math.max(0.76, 0.8 + (index * 0.06)));
    const balancedBiases = rows.map((_, index) => (index % 2 === 0 ? 1.02 : 0.96));
    const airyBiases = rows.map((_, index) => (index % 2 === 0 ? 0.96 : 1.02));
    const profiles = [];
    const addProfile = (profile) => profiles.push({
      fixedRows: rows,
      marginMode: "auto",
      scaleMode: "fit",
      align: "center",
      verticalMode: "top",
      gapX: 18,
      gapY: 18,
      marginX: standard,
      marginY: compact,
      scaleBias: 1,
      ...profile
    });

    addProfile({
      flavor: `large-catalog-twin-balanced-${context.modules.length}`,
      rowAlignModes: centerAlignModes,
      rowScaleBiases: balancedBiases
    });
    addProfile({
      flavor: `large-catalog-twin-airy-${context.modules.length}`,
      gapX: 22,
      gapY: 24,
      marginX: airy,
      marginY: standard,
      rowAlignModes: centerAlignModes,
      rowScaleBiases: airyBiases
    });
    addProfile({
      flavor: `large-catalog-twin-tight-${context.modules.length}`,
      gapX: 12,
      gapY: 14,
      marginX: compact,
      marginY: compact,
      rowAlignModes: centerAlignModes,
      rowScaleBiases: rows.map(() => 0.94)
    });
    addProfile({
      flavor: `large-catalog-twin-left-${context.modules.length}`,
      align: "left",
      marginX: compact,
      marginY: standard,
      rowAlignModes: leftAlignModes,
      rowScaleBiases: topHeavyBiases
    });
    addProfile({
      flavor: `large-catalog-twin-right-${context.modules.length}`,
      align: "right",
      marginX: compact,
      marginY: standard,
      rowAlignModes: rightAlignModes,
      rowScaleBiases: topHeavyBiases
    });
    addProfile({
      flavor: `large-catalog-twin-snake-${context.modules.length}`,
      gapX: 16,
      gapY: 18,
      marginX: standard,
      marginY: standard,
      rowAlignModes: snakeAlignModes,
      rowScaleBiases: balancedBiases
    });
    addProfile({
      flavor: `large-catalog-twin-tophero-${context.modules.length}`,
      gapX: 16,
      gapY: 18,
      marginX: compact,
      marginY: compact,
      rowAlignModes: centerAlignModes,
      rowScaleBiases: topHeavyBiases
    });
    addProfile({
      flavor: `large-catalog-twin-bottomhero-${context.modules.length}`,
      verticalMode: "bottom",
      gapX: 16,
      gapY: 18,
      marginX: compact,
      marginY: compact,
      rowAlignModes: centerAlignModes,
      rowScaleBiases: bottomHeavyBiases
    });

    if (rowCount >= 4) {
      addProfile({
        flavor: `large-catalog-twin-premium-${context.modules.length}`,
        gapX: 24,
        gapY: 26,
        marginX: airy,
        marginY: airy,
        rowAlignModes: centerAlignModes,
        rowScaleBiases: rows.map((_, index) => {
          const center = (rowCount - 1) / 2;
          const distance = Math.abs(index - center);
          return Math.max(0.82, 1.08 - (distance * 0.08));
        })
      });
    }

    return profiles;
  }

  function getFixedStyleFourProductProfiles(context, styleId) {
    if (!styleId) return [];
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const compact = Math.max(16, Math.round(shortSide * 0.045));
    const standard = Math.max(24, Math.round(shortSide * 0.075));
    const airy = Math.max(38, Math.round(shortSide * 0.11));
    const heavy = Math.max(56, Math.round(shortSide * 0.155));
    const profiles = [];
    const addProfile = (profile) => profiles.push({
      marginMode: "auto",
      scaleMode: "fit",
      align: "center",
      verticalMode: "center",
      gapX: 18,
      gapY: 20,
      scaleBias: 1,
      ...profile
    });

    [
      { flavor: `fixed-${styleId}-row4-tight`, fixedRows: [4], verticalMode: "top", gapX: 10, gapY: 0, marginX: compact, marginY: compact, moduleScaleBiases: [1.18, 1.02, 0.84, 0.66], orderStrategy: "hero-first" },
      { flavor: `fixed-${styleId}-row4-wide`, fixedRows: [4], verticalMode: "center", gapX: 18, gapY: 0, marginX: standard, marginY: airy, moduleScaleBiases: [0.78, 1.08, 1.08, 0.78] },
      { flavor: `fixed-${styleId}-row4-reverse`, fixedRows: [4], verticalMode: "bottom", gapX: 10, gapY: 0, marginX: compact, marginY: compact, moduleScaleBiases: [0.66, 0.84, 1.02, 1.18], orderStrategy: "hero-last" },
      { flavor: `fixed-${styleId}-col4-center`, fixedRows: [1, 1, 1, 1], gapX: 0, gapY: 12, marginX: standard, marginY: heavy, rowScaleBiases: [1.2, 1.0, 0.82, 0.64], rowAlignModes: ["center", "center", "center", "center"] },
      { flavor: `fixed-${styleId}-col4-left`, fixedRows: [1, 1, 1, 1], gapX: 0, gapY: 10, marginX: compact, marginY: heavy, rowScaleBiases: [1.16, 0.96, 0.8, 0.62], rowAlignModes: ["left", "left", "left", "left"], verticalMode: "top" },
      { flavor: `fixed-${styleId}-col4-right`, fixedRows: [1, 1, 1, 1], gapX: 0, gapY: 10, marginX: compact, marginY: heavy, rowScaleBiases: [1.16, 0.96, 0.8, 0.62], rowAlignModes: ["right", "right", "right", "right"], verticalMode: "bottom" },
      { flavor: `fixed-${styleId}-grid22-equal`, fixedRows: [2, 2], gapX: 16, gapY: 18, marginX: standard, marginY: standard, rowScaleBiases: [0.98, 0.98], rowAlignModes: ["center", "center"] },
      { flavor: `fixed-${styleId}-grid22-top-hero`, fixedRows: [2, 2], gapX: 14, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [1.18, 0.72], rowAlignModes: ["center", "center"], verticalMode: "top" },
      { flavor: `fixed-${styleId}-grid22-bottom-hero`, fixedRows: [2, 2], gapX: 14, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [0.72, 1.18], rowAlignModes: ["center", "center"], verticalMode: "bottom" },
      { flavor: `fixed-${styleId}-grid22-zigzag-left`, fixedRows: [2, 2], gapX: 18, gapY: 22, marginX: standard, marginY: standard, rowScaleBiases: [1.04, 0.82], rowAlignModes: ["left", "right"] },
      { flavor: `fixed-${styleId}-grid22-zigzag-right`, fixedRows: [2, 2], gapX: 18, gapY: 22, marginX: standard, marginY: standard, rowScaleBiases: [0.82, 1.04], rowAlignModes: ["right", "left"] },
      { flavor: `fixed-${styleId}-hero13`, fixedRows: [1, 3], gapX: 16, gapY: 20, marginX: compact, marginY: standard, rowScaleBiases: [1.22, 0.66], rowAlignModes: ["center", "center"], orderStrategy: "hero-first" },
      { flavor: `fixed-${styleId}-hero31`, fixedRows: [3, 1], gapX: 16, gapY: 20, marginX: compact, marginY: standard, rowScaleBiases: [0.66, 1.22], rowAlignModes: ["center", "center"], orderStrategy: "hero-last" },
      { flavor: `fixed-${styleId}-stair112`, fixedRows: [1, 1, 2], gapX: 16, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [1.18, 0.88, 0.72], rowAlignModes: ["center", "left", "center"] },
      { flavor: `fixed-${styleId}-stair211`, fixedRows: [2, 1, 1], gapX: 16, gapY: 16, marginX: compact, marginY: standard, rowScaleBiases: [0.72, 0.88, 1.18], rowAlignModes: ["center", "right", "center"] }
    ].forEach(addProfile);

    if (styleId === "styl-numer-3") {
      [
        { flavor: "style3-panorama-row", fixedRows: [4], gapX: 8, gapY: 0, marginX: compact, marginY: compact, moduleScaleBiases: [1.38, 1.08, 0.8, 0.56], orderStrategy: "hero-first", verticalMode: "top" },
        { flavor: "style3-panorama-row-reverse", fixedRows: [4], gapX: 8, gapY: 0, marginX: compact, marginY: compact, moduleScaleBiases: [0.56, 0.8, 1.08, 1.38], orderStrategy: "hero-last", verticalMode: "bottom" },
        { flavor: "style3-banner-top", fixedRows: [4], gapX: 12, gapY: 0, marginX: standard, marginY: compact, moduleScaleBiases: [0.92, 0.92, 0.92, 0.92], verticalMode: "top" },
        { flavor: "style3-banner-bottom", fixedRows: [4], gapX: 12, gapY: 0, marginX: standard, marginY: compact, moduleScaleBiases: [0.92, 0.92, 0.92, 0.92], verticalMode: "bottom" },
        { flavor: "style3-totem-center", fixedRows: [1, 1, 1, 1], gapX: 0, gapY: 8, marginX: standard, marginY: heavy, rowScaleBiases: [1.28, 1.04, 0.82, 0.58], rowAlignModes: ["center", "center", "center", "center"] },
        { flavor: "style3-rail-left", fixedRows: [1, 1, 1, 1], gapX: 0, gapY: 8, marginX: compact, marginY: heavy, rowScaleBiases: [1.2, 0.98, 0.78, 0.58], rowAlignModes: ["left", "left", "left", "left"], verticalMode: "top" },
        { flavor: "style3-rail-right", fixedRows: [1, 1, 1, 1], gapX: 0, gapY: 8, marginX: compact, marginY: heavy, rowScaleBiases: [1.2, 0.98, 0.78, 0.58], rowAlignModes: ["right", "right", "right", "right"], verticalMode: "bottom" },
        { flavor: "style3-cross", fixedRows: [1, 2, 1], gapX: 10, gapY: 12, marginX: compact, marginY: standard, rowScaleBiases: [0.74, 1.2, 0.74], rowAlignModes: ["center", "center", "center"] },
        { flavor: "style3-grid-tight", fixedRows: [2, 2], gapX: 10, gapY: 12, marginX: compact, marginY: compact, rowScaleBiases: [1.08, 0.86], rowAlignModes: ["center", "center"] },
        { flavor: "style3-grid-airy", fixedRows: [2, 2], gapX: 20, gapY: 24, marginX: airy, marginY: airy, rowScaleBiases: [0.82, 0.82], rowAlignModes: ["center", "center"] }
      ].forEach(addProfile);
    }

    return profiles;
  }

  function getFourProductProfiles(context) {
    const shortSide = Math.min(context.pageWidth, context.pageHeight);
    const compact = Math.max(18, Math.round(shortSide * 0.05));
    const standard = Math.max(26, Math.round(shortSide * 0.08));
    const airy = Math.max(42, Math.round(shortSide * 0.12));
    const heavy = Math.max(58, Math.round(shortSide * 0.16));
    const profiles = [];
    const requestedStyleId = getRequestedFixedStyleId(context.page);

    const heroRows = [
      ["hero-top-balanced", [1, 3], [1.04, 0.7], null, "center", compact, standard, 22, 28],
      ["hero-top-left-flow", [1, 3], [1.08, 0.64], ["center", "left"], "top", compact, standard, 18, 26],
      ["hero-top-right-flow", [1, 3], [1.08, 0.64], ["center", "right"], "top", compact, standard, 18, 26],
      ["hero-bottom-balanced", [3, 1], [0.7, 1.04], null, "center", compact, standard, 22, 28],
      ["hero-bottom-left", [3, 1], [0.68, 1.06], ["left", "center"], "bottom", compact, standard, 18, 24],
      ["hero-bottom-right", [3, 1], [0.68, 1.06], ["right", "center"], "bottom", compact, standard, 18, 24]
    ];

    heroRows.forEach(([name, fixedRows, rowScaleBiases, rowAlignModes, verticalMode, marginX, marginY, gapX, gapY]) => {
      profiles.push({
        flavor: `four-${name}`,
        fixedRows,
        align: "center",
        verticalMode,
        marginMode: "auto",
        scaleMode: "fit",
        gapX,
        gapY,
        marginX,
        marginY,
        scaleBias: 1,
        rowScaleBiases,
        rowAlignModes
      });
    });

    const equalGridConfigs = [
      ["equal-tight", [2, 2], [0.98, 0.98], ["center", "center"], compact, compact, 16, 18],
      ["equal-airy", [2, 2], [0.84, 0.84], ["center", "center"], airy, airy, 28, 32],
      ["equal-left", [2, 2], [0.9, 0.9], ["left", "left"], standard, standard, 20, 24],
      ["equal-right", [2, 2], [0.9, 0.9], ["right", "right"], standard, standard, 20, 24],
      ["top-wide-bottom-tight", [2, 2], [0.98, 0.72], ["center", "center"], standard, airy, 24, 26],
      ["top-tight-bottom-wide", [2, 2], [0.72, 0.98], ["center", "center"], standard, airy, 24, 26],
      ["left-zigzag", [2, 2], [0.94, 0.78], ["left", "right"], standard, standard, 18, 24],
      ["right-zigzag", [2, 2], [0.78, 0.94], ["right", "left"], standard, standard, 18, 24]
    ];

    equalGridConfigs.forEach(([name, fixedRows, rowScaleBiases, rowAlignModes, marginX, marginY, gapX, gapY]) => {
      profiles.push({
        flavor: `four-${name}`,
        fixedRows,
        align: "center",
        verticalMode: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX,
        gapY,
        marginX,
        marginY,
        scaleBias: 1,
        rowScaleBiases,
        rowAlignModes
      });
    });

    const ladderConfigs = [
      ["center-column", [1, 1, 1, 1], [1.02, 0.86, 0.74, 0.62], ["center", "center", "center", "center"], standard, heavy, 0, 18],
      ["descending-left", [1, 1, 1, 1], [1.04, 0.84, 0.7, 0.58], ["left", "left", "left", "left"], compact, heavy, 0, 16],
      ["descending-right", [1, 1, 1, 1], [1.04, 0.84, 0.7, 0.58], ["right", "right", "right", "right"], compact, heavy, 0, 16]
    ];

    ladderConfigs.forEach(([name, fixedRows, rowScaleBiases, rowAlignModes, marginX, marginY, gapX, gapY]) => {
      profiles.push({
        flavor: `four-${name}`,
        fixedRows,
        align: "center",
        verticalMode: "center",
        marginMode: "auto",
        scaleMode: "fit",
        gapX,
        gapY,
        marginX,
        marginY,
        scaleBias: 1,
        rowScaleBiases,
        rowAlignModes
      });
    });

    const mixedModuleBiases = [
      ["hero-grid-left", [2, 2], [1.18, 0.72, 0.92, 0.76], ["center", "center"], "left", standard, standard, 18, 20],
      ["hero-grid-right", [2, 2], [0.72, 1.18, 0.76, 0.92], ["center", "center"], "right", standard, standard, 18, 20],
      ["diagonal-spotlight", [2, 2], [1.16, 0.74, 0.74, 1.08], ["center", "center"], "center", standard, standard, 20, 22],
      ["inverse-diagonal", [2, 2], [0.74, 1.16, 1.08, 0.74], ["center", "center"], "center", standard, standard, 20, 22],
      ["hero-stack-top", [1, 1, 2], [1.14, 0.82, 0.72, 0.72], ["center", "center", "center"], "top", compact, standard, 18, 20],
      ["hero-stack-bottom", [2, 1, 1], [0.72, 0.72, 0.82, 1.14], ["center", "center", "center"], "bottom", compact, standard, 18, 20],
      ["mega-hero-left", [2, 2], [1.42, 0.54, 0.88, 0.62], ["center", "center"], "left", compact, standard, 16, 18],
      ["mega-hero-right", [2, 2], [0.54, 1.42, 0.62, 0.88], ["center", "center"], "right", compact, standard, 16, 18],
      ["tiny-tiny-hero-tail", [1, 1, 2], [0.58, 0.72, 1.28, 0.92], ["left", "right", "center"], "center", compact, standard, 16, 18],
      ["hero-head-tiny-tail", [2, 1, 1], [1.28, 0.92, 0.72, 0.58], ["center", "left", "right"], "center", compact, standard, 16, 18]
    ];

    mixedModuleBiases.forEach(([name, fixedRows, moduleScaleBiases, rowAlignModes, verticalMode, marginX, marginY, gapX, gapY]) => {
      profiles.push({
        flavor: `four-${name}`,
        fixedRows,
        align: "center",
        verticalMode,
        marginMode: "auto",
        scaleMode: "fit",
        gapX,
        gapY,
        marginX,
        marginY,
        scaleBias: 1,
        rowAlignModes,
        moduleScaleBiases
      });
    });

    profiles.push(...getFixedStyleFourProductProfiles(context, requestedStyleId));

    return profiles;
  }

  function getPresetProfilesForContext(context) {
    const count = Number(context?.modules?.length || 0);
    if (count === 1) {
      return getSingleProductProfiles(context).concat(getGeneratedProfiles(context));
    }
    if (count === 2) {
      return getTwoProductProfiles(context).concat(getGeneratedProfiles(context));
    }
    if (count === 3) {
      return getThreeProductProfiles(context).concat(getRandomProfiles(context), getGeneratedProfiles(context));
    }
    if (count === 4) {
      return getFourProductProfiles(context).concat(getRandomProfiles(context), getGeneratedProfiles(context));
    }
    if (count === 5) {
      return getFiveProductProfiles(context).concat(getRandomProfiles(context), getGeneratedProfiles(context));
    }
    if (count === 6) {
      return getSixProductProfiles(context).concat(getRandomProfiles(context), getGeneratedProfiles(context));
    }
    if (count >= 7) {
      return getLargeCatalogProfiles(context).concat(getRandomProfiles(context), getGeneratedProfiles(context));
    }
    return getRandomProfiles(context).concat(getGeneratedProfiles(context));
  }

  function buildProfileBasedSeedPresets(context, profiles, prefix) {
    const presets = [];
    const seen = new Set();
    const verticalModes = getVerticalModes(context);
    const rowVariants = getRandomRowVariants(context.modules.length);

    profiles.forEach((profile, profileIndex) => {
      const candidateRows = Array.isArray(profile.fixedRows) && profile.fixedRows.length
        ? [uniqueRowsVariant(profile.fixedRows)]
        : rowVariants;

      candidateRows.forEach((rows, rowsIndex) => {
        if (!rows.length || rows.reduce((acc, value) => acc + value, 0) !== context.modules.length) return;

        getOrderStrategies(context).forEach((orderStrategy, orderIndex) => {
          (profile.verticalMode ? [profile.verticalMode] : verticalModes).forEach((verticalMode, verticalIndex) => {
            const options = {
              gapX: profile.gapX,
              gapY: profile.gapY,
              marginX: profile.marginX,
              marginY: profile.marginY,
              marginMode: profile.marginMode,
              align: profile.align,
              scaleMode: profile.scaleMode,
              orderStrategy: profile.orderStrategy || orderStrategy,
              verticalMode,
              styleMode: "keep",
              scaleBias: profile.scaleBias,
              rowAlignModes: profile.rowAlignModes,
              rowScaleBiases: profile.rowScaleBiases,
              moduleScaleBiases: profile.moduleScaleBiases
            };
            const signature = getPresetSignature(rows, options, `${prefix}:${profileIndex}:${rowsIndex}:${orderIndex}:${verticalIndex}:${profile.flavor}`);
            if (seen.has(signature)) return;
            seen.add(signature);
            presets.push({ rows, options, signature, flavor: profile.flavor });
          });
        });
      });
    });

    return presets;
  }

  function buildRandomPresets(context, rounds = 1) {
    const presets = [];
    const seen = new Set();
    const maxPresets = context.modules.length <= 2 ? 2600 : (context.modules.length <= 4 ? 3600 : 3200);

    for (let round = 0; round < Math.max(1, rounds); round += 1) {
      const rowsVariants = getRandomRowVariants(context.modules.length);
      const profiles = getPresetProfilesForContext(context);
      const orderStrategies = getOrderStrategies(context);
      const verticalModes = getVerticalModes(context);
      shuffle(rowsVariants).forEach((rows) => {
        shuffle(profiles).forEach((profile) => {
          if (presets.length >= maxPresets) return;
          if (context.modules.length === 1 && rows.join("-") !== "1") return;
          if (Array.isArray(profile.fixedRows) && profile.fixedRows.join("-") !== rows.join("-")) return;
          shuffle(orderStrategies).forEach((orderStrategy) => {
            shuffle(verticalModes).forEach((verticalMode) => {
              if (presets.length >= maxPresets) return;
              const options = {
                gapX: profile.gapX,
                gapY: profile.gapY,
                marginX: profile.marginX,
                marginY: profile.marginY,
                marginMode: profile.marginMode,
                align: profile.align,
                scaleMode: profile.scaleMode,
                orderStrategy: profile.orderStrategy || orderStrategy,
                verticalMode: profile.verticalMode || verticalMode,
                scaleBias: profile.scaleBias,
                styleMode: Math.random() < 0.72 ? "auto-page" : "auto-mix",
                rowAlignModes: profile.rowAlignModes,
                rowScaleBiases: profile.rowScaleBiases,
                moduleScaleBiases: profile.moduleScaleBiases
              };
              const signature = getPresetSignature(rows, options, `${profile.flavor}:${round}`);
              if (seen.has(signature)) return;
              seen.add(signature);
              presets.push({ rows, options, signature, flavor: profile.flavor });
            });
          });
        });
      });
    }

    return presets;
  }

  function scorePresetPlan(plan, context, preset) {
    if (!plan || !Array.isArray(plan.rowData) || !plan.rowData.length) return -Infinity;
    const usableWidth = Math.max(1, plan.usableWidth || 1);
    const totalHeight = plan.rowData.reduce((acc, entry) => acc + entry.rawHeight, 0);
    const widestRow = plan.rowData.reduce((acc, entry) => Math.max(acc, entry.rawWidth), 0);
    const widthUsage = Math.min(1.15, widestRow / usableWidth);
    const rowHeights = plan.rowData.map((entry) => entry.rawHeight).filter((value) => value > 0);
    const avgHeight = rowHeights.reduce((acc, value) => acc + value, 0) / Math.max(1, rowHeights.length);
    const variance = rowHeights.reduce((acc, value) => acc + Math.abs(value - avgHeight), 0) / Math.max(1, rowHeights.length);
    const rowBalance = 1 - Math.min(1, variance / Math.max(40, avgHeight || 1));
    const density = Math.min(1.2, totalHeight / Math.max(1, context.pageHeight));
    const rowCount = plan.rowData.length;
    const compactness = 1 - Math.min(1, Math.abs(rowCount - Math.max(1, Math.round(Math.sqrt(context.modules.length)))) / 4);
    const alignBoost = preset.options.align === "center" ? 0.08 : 0;
    const autoBoost = preset.options.marginMode === "auto" ? 0.06 : 0;
    const portraitBoost = context.pageHeight > context.pageWidth && context.modules.length <= 3
      ? (rowCount > 1 ? 0.08 : 0)
      : 0;
    const verticalBoost = rowCount === 1 && preset.options.verticalMode && preset.options.verticalMode !== "center" ? 0.03 : 0;
    const rowScaleBiases = Array.isArray(preset.options.rowScaleBiases)
      ? preset.options.rowScaleBiases.map((value) => getNumber(value, 1))
      : [];
    const moduleScaleBiases = Array.isArray(preset.options.moduleScaleBiases)
      ? preset.options.moduleScaleBiases.map((value) => getNumber(value, 1))
      : [];
    const rowScaleSpread = rowScaleBiases.length
      ? Math.max(...rowScaleBiases) - Math.min(...rowScaleBiases)
      : Math.abs(1 - getNumber(preset.options.scaleBias, 1));
    const moduleScaleSpread = moduleScaleBiases.length
      ? Math.max(...moduleScaleBiases) - Math.min(...moduleScaleBiases)
      : 0;
    const sizeDiversityBoost = Math.min(0.22, (rowScaleSpread * 0.12) + (moduleScaleSpread * 0.09));
    const asymmetryBoost = (
      (Array.isArray(preset.rows) && preset.rows.length ? (Math.max(...preset.rows) - Math.min(...preset.rows)) : 0) >= 1
        ? 0.04
        : 0
    );
    const singleBias = context.modules.length === 1
      ? Math.max(0, Math.min(0.12, Math.abs(1 - getNumber(preset.options.scaleBias, 1)) * 0.18))
      : 0;
    return (widthUsage * 0.4) + (rowBalance * 0.14) + (density * 0.16) + (compactness * 0.12) + alignBoost + autoBoost + portraitBoost + verticalBoost + singleBias + sizeDiversityBoost + asymmetryBoost;
  }

  function getLayoutFamilyKey(preset) {
    const rowsKey = Array.isArray(preset?.rows) ? preset.rows.join("-") : "auto";
    const alignKey = String(preset?.options?.align || "center");
    const orderKey = String(preset?.options?.orderStrategy || "preserve");
    const verticalKey = String(preset?.options?.verticalMode || "center");
    const rowScaleKey = Array.isArray(preset?.options?.rowScaleBiases)
      ? preset.options.rowScaleBiases.map((value) => Math.round(getNumber(value, 1) * 100)).join(",")
      : "";
    const moduleScaleKey = Array.isArray(preset?.options?.moduleScaleBiases)
      ? preset.options.moduleScaleBiases.map((value) => Math.round(getNumber(value, 1) * 100)).join(",")
      : "";
    const scaleKey = Math.round(getNumber(preset?.options?.scaleBias, 1) * 100);
    return `${rowsKey}|${alignKey}|${orderKey}|${verticalKey}|${rowScaleKey}|${moduleScaleKey}|${scaleKey}`;
  }

  function getLayoutShapeKey(preset) {
    return Array.isArray(preset?.rows) && preset.rows.length ? preset.rows.join("-") : "auto";
  }

  function buildDiverseAiPool(scored, context) {
    if (!Array.isArray(scored) || !scored.length) return [];
    const bestScore = scored[0].score;
    const scoreFloor = bestScore - (
      context.modules.length === 1 ? 0.5
        : (context.modules.length <= 2 ? 0.36
          : (context.modules.length <= 4 ? 0.44 : 0.16))
    );
    const maxPool = context.modules.length === 1 ? 72 : (context.modules.length <= 2 ? 56 : (context.modules.length <= 4 ? 120 : 36));
    const eligible = scored.filter((item) => item.score >= scoreFloor);
    const pool = [];
    const usedSignatures = new Set();
    const usedShapes = new Set();
    const usedFamilies = new Set();
    const pushItem = (item, markShape = false, markFamily = false) => {
      if (!item || usedSignatures.has(item.preset.signature) || pool.length >= maxPool) return;
      usedSignatures.add(item.preset.signature);
      if (markShape) usedShapes.add(getLayoutShapeKey(item.preset));
      if (markFamily) usedFamilies.add(getLayoutFamilyKey(item.preset));
      pool.push(item);
    };

    eligible.forEach((item) => {
      const shapeKey = getLayoutShapeKey(item.preset);
      if (usedShapes.has(shapeKey)) return;
      pushItem(item, true, true);
    });
    eligible.forEach((item) => {
      const familyKey = getLayoutFamilyKey(item.preset);
      if (usedFamilies.has(familyKey)) return;
      pushItem(item, true, true);
    });
    eligible.forEach((item) => pushItem(item));

    return pool;
  }

  function pickWeightedRandomPreset(scoredPresets) {
    if (!Array.isArray(scoredPresets) || !scoredPresets.length) return null;
    const minScore = scoredPresets.reduce((acc, item) => Math.min(acc, item.score), scoredPresets[0].score);
    const weighted = scoredPresets.map((item) => {
      const normalized = Math.max(0.01, item.score - minScore + 0.02);
      return { ...item, weight: normalized * normalized };
    });
    const total = weighted.reduce((acc, item) => acc + item.weight, 0);
    let threshold = Math.random() * Math.max(0.001, total);
    for (const item of weighted) {
      threshold -= item.weight;
      if (threshold <= 0) return item.preset;
    }
    return weighted[weighted.length - 1]?.preset || null;
  }

  function buildAiSeedPresets(context) {
    if (context.modules.length === 1) {
      const presets = [];
      const seen = new Set();
      getSingleProductProfiles(context).forEach((profile, index) => {
        const options = {
          gapX: 0,
          gapY: 0,
          marginX: profile.marginX,
          marginY: profile.marginY,
          marginMode: "auto",
          align: profile.align,
          scaleMode: "fit",
          orderStrategy: "preserve",
          verticalMode: profile.verticalMode,
          scaleBias: profile.scaleBias,
          styleMode: Math.random() < 0.72 ? "auto-page" : "auto-mix"
        };
        const signature = getPresetSignature([1], options, `single-seed:${index}:${profile.flavor}`);
        if (seen.has(signature)) return;
        seen.add(signature);
        presets.push({ rows: [1], options, signature, flavor: profile.flavor });
      });
      return presets;
    }

    if (context.modules.length === 3) {
      return buildProfileBasedSeedPresets(
        context,
        getThreeProductProfiles(context).concat(getRandomProfiles(context)),
        "ai-three"
      );
    }

    if (context.modules.length === 4) {
      return buildProfileBasedSeedPresets(
        context,
        getFourProductProfiles(context).concat(getRandomProfiles(context)),
        "ai-four"
      );
    }

    if (context.modules.length === 5) {
      return buildProfileBasedSeedPresets(
        context,
        getFiveProductProfiles(context).concat(getRandomProfiles(context)),
        "ai-five"
      );
    }

    if (context.modules.length === 6) {
      return buildProfileBasedSeedPresets(
        context,
        getSixProductProfiles(context).concat(getRandomProfiles(context)),
        "ai-six"
      );
    }

    if (context.modules.length >= 7) {
      return buildProfileBasedSeedPresets(
        context,
        getLargeCatalogProfiles(context).concat(getRandomProfiles(context)),
        "ai-large-catalog"
      );
    }

    const recommendedRows = getRecommendedRows(context.modules.length);
    const rowsVariants = [
      recommendedRows,
      recommendedRows.slice().reverse(),
      buildCenterHeroRows(context.modules.length),
      buildWaveRows(context.modules.length),
      buildCenterDenseRows(context.modules.length),
      buildPyramidRows(context.modules.length),
      buildHeroTopRows(context.modules.length),
      buildHeroBottomRows(context.modules.length),
      buildEdgeHeavyRows(context.modules.length)
    ];
    const profiles = [
      { gapX: 24, gapY: 28, marginX: 36, marginY: 34, marginMode: "auto", align: "center", scaleMode: "fit", flavor: "ai-smart" },
      { gapX: 18, gapY: 24, marginX: 28, marginY: 28, marginMode: "auto", align: "center", scaleMode: "fit", flavor: "ai-tight" },
      { gapX: 28, gapY: 34, marginX: 42, marginY: 40, marginMode: "auto", align: "center", scaleMode: "fit", flavor: "ai-airy" },
      { gapX: 22, gapY: 30, marginX: 34, marginY: 32, marginMode: "auto", align: "left", scaleMode: "fit", flavor: "ai-left" },
      { gapX: 22, gapY: 30, marginX: 34, marginY: 32, marginMode: "auto", align: "right", scaleMode: "fit", flavor: "ai-right" },
      { gapX: 16, gapY: 20, marginX: 24, marginY: 26, marginMode: "auto", align: "center", scaleMode: "fit", flavor: "ai-compact" },
      { gapX: 30, gapY: 38, marginX: 46, marginY: 44, marginMode: "auto", align: "center", scaleMode: "fit", flavor: "ai-gallery" },
      { gapX: 14, gapY: 32, marginX: 22, marginY: 36, marginMode: "auto", align: "left", scaleMode: "fit", flavor: "ai-editorial-left" },
      { gapX: 14, gapY: 32, marginX: 22, marginY: 36, marginMode: "auto", align: "right", scaleMode: "fit", flavor: "ai-editorial-right" },
      { gapX: 20, gapY: 18, marginX: 38, marginY: 20, marginMode: "auto", align: "center", scaleMode: "fit", flavor: "ai-runway" }
    ];
    const presets = [];
    const seen = new Set();
    const verticalModes = getVerticalModes(context);

    rowsVariants.forEach((rows, rowIndex) => {
      profiles.forEach((profile, profileIndex) => {
        getOrderStrategies(context).forEach((orderStrategy, orderIndex) => {
          verticalModes.forEach((verticalMode, verticalIndex) => {
            const signature = getPresetSignature(rows, { ...profile, orderStrategy, verticalMode }, `ai-seed:${rowIndex}:${profileIndex}:${orderIndex}:${verticalIndex}`);
            if (seen.has(signature)) return;
            seen.add(signature);
            presets.push({
              rows,
              options: {
                gapX: profile.gapX,
                gapY: profile.gapY,
                marginX: profile.marginX,
                marginY: profile.marginY,
                marginMode: profile.marginMode,
                align: profile.align,
                scaleMode: profile.scaleMode,
                orderStrategy,
                verticalMode,
                styleMode: Math.random() < 0.72 ? "auto-page" : "auto-mix"
              },
              signature,
              flavor: profile.flavor
            });
          });
        });
      });
    });

    return presets;
  }

  function findAiPreset(context) {
    const randomRounds = context.modules.length <= 4 ? 10 : 6;
    const candidates = buildAiSeedPresets(context).concat(buildRandomPresets(context, randomRounds));
    const scored = [];

    candidates.forEach((preset) => {
      const plan = buildLayoutPlan(context, preset.rows, preset.options);
      if (plan.error) return;
      const score = scorePresetPlan(plan, context, preset);
      scored.push({ preset, score });
    });

    if (!scored.length) return null;

    scored.sort((a, b) => b.score - a.score);
    let pool = buildDiverseAiPool(scored, context);
    const recentSignatures = Array.isArray(context.page._magicLayoutAiRecentSignatures) ? context.page._magicLayoutAiRecentSignatures : [];
    const recentFamilies = Array.isArray(context.page._magicLayoutAiRecentFamilies) ? context.page._magicLayoutAiRecentFamilies : [];
    const recentShapes = Array.isArray(context.page._magicLayoutAiRecentShapes) ? context.page._magicLayoutAiRecentShapes : [];

    if (pool.length > 1) {
      const withoutRecentSignature = pool.filter((item) => !recentSignatures.includes(item.preset.signature));
      if (withoutRecentSignature.length) pool = withoutRecentSignature;
    }
    if (pool.length > 1) {
      const withoutRecentShape = pool.filter((item) => !recentShapes.includes(getLayoutShapeKey(item.preset)));
      if (withoutRecentShape.length) pool = withoutRecentShape;
    }
    if (pool.length > 1) {
      const withoutRecentFamily = pool.filter((item) => !recentFamilies.includes(getLayoutFamilyKey(item.preset)));
      if (withoutRecentFamily.length) pool = withoutRecentFamily;
    }

    return pickWeightedRandomPreset(pool);
  }

  async function applyAiMagicLayout(context) {
    if (!context || !context.page) return;
    const bestPreset = findAiPreset(context);
    if (!bestPreset) {
      showError("AI nie znalazlo jeszcze dobrego ukladu dla tej strony. Sprobuj losowego ukladu albo zmniejsz odstepy.");
      return;
    }
    const requestedStyleMode = getSelectedStyleMode();
    const options = {
      ...bestPreset.options,
      styleMode: requestedStyleMode
    };
    writeRowsToInputs(bestPreset.rows);
    writeOptionsToInputs(options);
    await applyModuleStylesToPage(context, options.styleMode || "keep");
    const result = layoutModules(context, bestPreset.rows, options);
    if (result.error) {
      showError(result.error);
      return;
    }
    const familyKey = getLayoutFamilyKey(bestPreset);
    const shapeKey = getLayoutShapeKey(bestPreset);
    const recentSignatures = Array.isArray(context.page._magicLayoutAiRecentSignatures) ? context.page._magicLayoutAiRecentSignatures : [];
    const recentFamilies = Array.isArray(context.page._magicLayoutAiRecentFamilies) ? context.page._magicLayoutAiRecentFamilies : [];
    const recentShapes = Array.isArray(context.page._magicLayoutAiRecentShapes) ? context.page._magicLayoutAiRecentShapes : [];
    context.page._magicLayoutAiRecentSignatures = [bestPreset.signature, ...recentSignatures.filter((item) => item !== bestPreset.signature)].slice(0, 8);
    context.page._magicLayoutAiRecentFamilies = [familyKey, ...recentFamilies.filter((item) => item !== familyKey)].slice(0, 6);
    context.page._magicLayoutAiRecentShapes = [shapeKey, ...recentShapes.filter((item) => item !== shapeKey)].slice(0, 8);
    context.page._magicLayoutLastAiSignature = bestPreset.signature;
    context.page._magicLayoutLastRandomSignature = bestPreset.signature;
    showError("");
    closeModalWithMagicEffect(context, "ai");
  }

  async function applyRandomMagicLayout(context) {
    if (!context || !context.page) return;
    const presets = buildRandomPresets(context);
    if (!presets.length) {
      showError("Nie udalo sie wygenerowac losowego ukladu dla tej strony.");
      return;
    }

    const lastSignature = String(context.page._magicLayoutLastRandomSignature || "");
    const preferred = shuffle(presets).filter((preset) => preset.signature !== lastSignature);
    const orderedPresets = preferred.length ? preferred.concat(presets.filter((preset) => preset.signature === lastSignature)) : shuffle(presets);

    for (const preset of orderedPresets) {
      const options = {
        ...preset.options,
        styleMode: getSelectedStyleMode()
      };
      writeRowsToInputs(preset.rows);
      writeOptionsToInputs(options);
      await applyModuleStylesToPage(context, options.styleMode || "keep");
      const result = layoutModules(context, preset.rows, options);
      if (result.error) continue;
      context.page._magicLayoutLastRandomSignature = preset.signature;
      showError("");
      closeModalWithMagicEffect(context, "random");
      return;
    }

    showError("Losowy uklad nie znalazl jeszcze dobrego wariantu. Sprobuj zmniejszyc odstepy albo liczbe rzedow.");
  }

  async function applyMagicLayout(context) {
    if (!context || !context.page) return;
    const rowState = readRows(context.modules.length);
    if (rowState.error) {
      showError(rowState.error);
      return;
    }
    const options = {
      gapX: Math.max(0, getNumber(document.getElementById("magicLayoutGapX")?.value, 28)),
      gapY: Math.max(0, getNumber(document.getElementById("magicLayoutGapY")?.value, 34)),
      marginX: Math.max(0, getNumber(document.getElementById("magicLayoutMarginX")?.value, 42)),
      marginY: Math.max(0, getNumber(document.getElementById("magicLayoutMarginY")?.value, 42)),
      marginMode: document.getElementById("magicLayoutMarginMode")?.value || "auto",
      align: document.getElementById("magicLayoutAlign")?.value || "center",
      scaleMode: document.getElementById("magicLayoutScale")?.value || "fit",
      styleMode: document.getElementById("magicLayoutStyleMode")?.value || "keep"
    };
    await applyModuleStylesToPage(context, options.styleMode);
    const result = layoutModules(context, rowState.rows, options);
    if (result.error) {
      showError(result.error);
      return;
    }
    closeModalWithMagicEffect(context, "manual");
  }

  function resolveSelectionLabel(page) {
    const selected = Array.isArray(page?.selectedNodes) ? page.selectedNodes : [];
    if (!selected.length) return "cala strona";
    const pageModules = buildModulesFromPage(page);
    const selectedModules = buildModulesFromSelection(page);
    if (pageModules.length && selectedModules.length === pageModules.length) return "cala strona";
    if (selectedModules.length > 1) return "zaznaczone";
    return "cala strona";
  }

  function getPageLabel(page) {
    const pageSettings = typeof window.getCatalogPageSettings === "function"
      ? window.getCatalogPageSettings()
      : null;
    const format = String(pageSettings?.format || window.CATALOG_PAGE_FORMAT || "").trim().toUpperCase();
    const orientation = String(pageSettings?.orientation || window.CATALOG_PAGE_ORIENTATION || "").trim().toLowerCase();
    if (format) {
      const suffix = orientation === "landscape" ? "NL" : (orientation === "portrait" ? "NP" : "");
      return suffix ? `${format} ${suffix}` : format;
    }
    return `${Math.round(Number(page?.stage?.width?.() || 0))} x ${Math.round(Number(page?.stage?.height?.() || 0))}`;
  }

  async function openMagicLayoutForPage(page) {
    if (!page || !page.layer || !page.stage) {
      alert("Brak aktywnej strony do ulozenia.");
      return false;
    }
    try {
      await ensureMagicLayoutCustomStylesReady();
    } catch (_err) {}
    const modules = buildModulesFromPage(page);
    if (!modules.length) {
      alert("Brak produktow do automatycznego ulozenia na tej stronie.");
      return false;
    }
    const context = {
      page,
      modules,
      totalProducts: modules.length,
      pageWidth: Number(page.stage.width?.() || 0),
      pageHeight: Number(page.stage.height?.() || 0),
      pageLabel: getPageLabel(page),
      selectionLabel: resolveSelectionLabel(page)
    };
    openModal(context);
    return true;
  }

  window.openMagicLayoutForPage = openMagicLayoutForPage;
})();

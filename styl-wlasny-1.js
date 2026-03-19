(function () {
  const TRAY_ID = "customStyleDraftTray";
  const TRAY_STYLE_ID = "customStyleDraftTrayStyle";
  let trayInitialized = false;
  let unsubscribe = null;
  let subscribedBridge = null;
  let currentDrafts = [];
  let dragDraftId = null;
  let lastRenderedDraftCount = 0;

  function getBridge() {
    return window.CustomStyleDraftBridge || null;
  }

  function ensureTrayStyles() {
    if (document.getElementById(TRAY_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = TRAY_STYLE_ID;
    style.textContent = `
      #${TRAY_ID} {
        position: fixed;
        top: 92px;
        right: 28px;
        width: 344px;
        max-width: calc(100vw - 28px);
        min-width: 0;
        bottom: 28px;
        max-height: none;
        display: none;
        flex-direction: column;
        overflow: hidden;
        background: linear-gradient(180deg, rgba(14, 19, 31, 0.98) 0%, rgba(9, 14, 24, 0.98) 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        box-shadow: -20px 0 40px rgba(0, 0, 0, 0.32);
        backdrop-filter: blur(12px);
        z-index: 1000002;
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
      }
      #${TRAY_ID} .custom-style-draft-tray__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 14px 12px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      #${TRAY_ID} .custom-style-draft-tray__header-copy {
        min-width: 0;
      }
      #${TRAY_ID} .custom-style-draft-tray__kicker {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #7f8aa0;
        margin-bottom: 4px;
      }
      #${TRAY_ID} .custom-style-draft-tray__title {
        font-size: 18px;
        font-weight: 800;
        color: #f5f7fb;
        letter-spacing: -0.02em;
      }
      #${TRAY_ID} .custom-style-draft-tray__subtitle {
        margin-top: 4px;
        font-size: 11px;
        line-height: 1.4;
        color: #93a0b5;
      }
      #${TRAY_ID} .custom-style-draft-tray__close {
        width: 32px;
        height: 32px;
        border-radius: 11px;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(180deg, rgba(28, 36, 54, 0.96) 0%, rgba(16, 22, 34, 0.98) 100%);
        color: #d8e0ee;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
      }
      #${TRAY_ID} .custom-style-draft-tray__close:hover {
        background: rgba(39,203,173,0.12);
        border-color: rgba(39,203,173,0.28);
        color: #8df5e2;
      }
      #${TRAY_ID} .custom-style-draft-tray__count {
        margin: 12px 10px 0;
        padding: 12px 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(19, 27, 42, 0.88) 0%, rgba(12, 18, 30, 0.94) 100%);
        color: #f5f7fb;
        font-size: 13px;
        font-weight: 800;
      }
      #${TRAY_ID} .custom-style-draft-tray__hint {
        margin: 8px 10px 0;
        padding: 10px 14px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 14px;
        background: rgba(39, 203, 173, 0.08);
        color: #a9b5c8;
        font-size: 11px;
        line-height: 1.45;
      }
      #${TRAY_ID} .custom-style-draft-tray__list {
        flex: 1 1 auto;
        overflow: auto;
        padding: 10px;
        display: grid;
        gap: 8px;
      }
      #${TRAY_ID} .custom-style-draft-tray__empty {
        padding: 16px 14px;
        border: 1px dashed rgba(255,255,255,0.12);
        border-radius: 16px;
        color: #93a0b5;
        font-size: 12px;
        text-align: center;
      }
      #${TRAY_ID} .custom-style-draft-tray__card {
        display: grid;
        grid-template-columns: 88px 1fr;
        gap: 10px;
        align-items: center;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 10px;
        background: linear-gradient(180deg, rgba(20, 29, 46, 0.94) 0%, rgba(12, 18, 30, 0.98) 100%);
        cursor: grab;
        transition: transform 0.16s ease, border-color 0.18s ease, box-shadow 0.18s ease;
      }
      #${TRAY_ID} .custom-style-draft-tray__card:hover {
        transform: translateY(-1px);
        border-color: rgba(39,203,173,0.24);
        box-shadow: 0 14px 28px rgba(0,0,0,0.18);
      }
      #${TRAY_ID} .custom-style-draft-tray__meta {
        min-width: 0;
      }
      #${TRAY_ID} .custom-style-draft-tray__meta-title {
        font-size: 11px;
        font-weight: 700;
        color: #f5f7fb;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #${TRAY_ID} .custom-style-draft-tray__meta-subtitle {
        margin-top: 4px;
        font-size: 10px;
        color: #93a0b5;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #${TRAY_ID} .custom-style-draft-tray__thumb,
      #${TRAY_ID} .custom-style-draft-tray__thumb-grid {
        width: 88px;
        height: 58px;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        background: rgba(255,255,255,0.96);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      #${TRAY_ID} .custom-style-draft-tray__thumb-grid {
        padding: 3px;
        box-sizing: border-box;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 3px;
      }
      #${TRAY_ID} .custom-style-draft-tray__thumb-cell {
        border: 1px solid #e2e8f0;
        border-radius: 5px;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      #${TRAY_ID} .custom-style-draft-tray__thumb img,
      #${TRAY_ID} .custom-style-draft-tray__thumb-grid img,
      #${TRAY_ID} .custom-style-draft-tray__thumb-cell img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      #${TRAY_ID} .custom-style-draft-tray__thumb-empty {
        font-size: 9px;
        color: #94a3b8;
      }
      @media (max-width: 700px) {
        #${TRAY_ID} {
          left: 8px;
          right: 8px;
          top: 72px;
          width: auto;
          min-width: 0;
          bottom: 76px;
          border-radius: 18px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureTray() {
    if (document.getElementById(TRAY_ID)) return document.getElementById(TRAY_ID);
    ensureTrayStyles();
    const el = document.createElement("div");
    el.id = TRAY_ID;

    el.innerHTML = `
      <div class="custom-style-draft-tray__header">
        <div class="custom-style-draft-tray__header-copy">
          <div class="custom-style-draft-tray__kicker">Drag and Drop</div>
          <div class="custom-style-draft-tray__title">Produkty do dodania</div>
          <div class="custom-style-draft-tray__subtitle">Przeciągnij moduł na stronę katalogu.</div>
        </div>
        <button id="${TRAY_ID}_close" class="custom-style-draft-tray__close" type="button" aria-label="Ukryj panel" title="Ukryj panel">✕</button>
      </div>
      <div id="${TRAY_ID}_count" class="custom-style-draft-tray__count">
        Pozostało: 0 produktów
      </div>
      <div class="custom-style-draft-tray__hint">
        Po upuszczeniu moduł znika z kolejki.
      </div>
      <div id="${TRAY_ID}_list" class="custom-style-draft-tray__list">
        <div class="custom-style-draft-tray__empty">Brak elementów.</div>
      </div>
    `;
    document.body.appendChild(el);

    const closeBtn = document.getElementById(`${TRAY_ID}_close`);
    if (closeBtn) closeBtn.onclick = () => hideTray();
    return el;
  }

  function showTray() {
    const el = ensureTray();
    el.style.display = "flex";
    attachStageDropTargets();
    bindBridge();
    const bridge = getBridge();
    if (bridge && typeof bridge.getDrafts === "function") {
      renderDrafts(bridge.getDrafts());
    } else {
      renderDrafts(currentDrafts);
    }
  }

  function hideTray() {
    const el = document.getElementById(TRAY_ID);
    if (el) el.style.display = "none";
  }

  function isTrayOpen() {
    const el = document.getElementById(TRAY_ID);
    return !!el && el.style.display !== "none";
  }

  function renderDrafts(drafts) {
    currentDrafts = Array.isArray(drafts) ? drafts.slice() : [];
    const nextCount = currentDrafts.length;
    const countEl = document.getElementById(`${TRAY_ID}_count`);
    if (countEl) {
      countEl.textContent = `Pozostało: ${nextCount} ${nextCount === 1 ? "produkt" : (nextCount >= 2 && nextCount <= 4 ? "produkty" : "produktów")}`;
    }
    const list = document.getElementById(`${TRAY_ID}_list`);
    if (!list) return;
    if (!currentDrafts.length) {
      list.innerHTML = `<div class="custom-style-draft-tray__empty">Brak elementów w kolejce.</div>`;
      if (lastRenderedDraftCount > 0 && isTrayOpen()) {
        setTimeout(() => {
          if ((currentDrafts || []).length === 0) hideTray();
        }, 80);
      }
      lastRenderedDraftCount = 0;
      return;
    }
    const buildThumbMarkup = (draft) => {
      const familyThumbs = (Array.isArray(draft?.familyProducts) ? draft.familyProducts : [])
        .map((item) => String(item?.url || "").trim())
        .filter(Boolean)
        .slice(0, 4);
      if (familyThumbs.length > 1) {
        const cells = familyThumbs.map((src) => `
          <div class="custom-style-draft-tray__thumb-cell">
            <img src="${escapeHtml(src)}" alt="">
          </div>
        `).join("");
        return `
          <div class="custom-style-draft-tray__thumb-grid">
            ${cells}
          </div>
        `;
      }
      const singleThumb = familyThumbs[0] || String(draft?.previewImageUrl || "").trim();
      return `
        <div class="custom-style-draft-tray__thumb">
          ${singleThumb ? `<img src="${escapeHtml(singleThumb)}" alt="">` : `<span class="custom-style-draft-tray__thumb-empty">brak</span>`}
        </div>
      `;
    };
    list.innerHTML = currentDrafts.map((draft) => {
      const title = String(draft?.nameOverrides?.[draft?.productId] || draft?.productName || "").trim();
      const index = String(draft?.productIndex || "").trim();
      const familyCount = Math.max(1, Array.isArray(draft?.familyProducts) ? draft.familyProducts.length : 1);
      const currency = String(draft?.settings?.customCurrencySymbol || "£");
      return `
        <div data-draft-id="${escapeHtml(String(draft.id || ""))}" draggable="true" class="custom-style-draft-tray__card">
          ${buildThumbMarkup(draft)}
          <div class="custom-style-draft-tray__meta">
            <div class="custom-style-draft-tray__meta-title">${escapeHtml(index ? `[${index}] ${title || draft?.productId || ""}` : (title || draft?.productId || ""))}</div>
            <div class="custom-style-draft-tray__meta-subtitle">Rodzina: ${familyCount} • ${escapeHtml(currency)}</div>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-draft-id]").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        dragDraftId = String(item.getAttribute("data-draft-id") || "");
        item.style.opacity = "0.55";
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", dragDraftId);
          e.dataTransfer.setData("application/x-custom-style-draft", dragDraftId);
        }
      });
      item.addEventListener("dragend", () => {
        dragDraftId = null;
        item.style.opacity = "1";
      });
      item.addEventListener("dblclick", () => {
        const bridge = getBridge();
        if (!bridge || typeof bridge.openDraftInEditor !== "function") return;
        bridge.openDraftInEditor(String(item.getAttribute("data-draft-id") || ""));
      });
    });
    lastRenderedDraftCount = nextCount;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function bindBridge() {
    const bridge = getBridge();
    if (!bridge) return;
    if (subscribedBridge && bridge !== subscribedBridge && unsubscribe) {
      try { unsubscribe(); } catch (_err) {}
      unsubscribe = null;
      subscribedBridge = null;
    }
    if (unsubscribe && subscribedBridge === bridge) return;
    if (typeof bridge.subscribe === "function") {
      unsubscribe = bridge.subscribe((drafts) => {
        renderDrafts(drafts);
      });
      subscribedBridge = bridge;
    } else if (typeof bridge.getDrafts === "function") {
      renderDrafts(bridge.getDrafts());
      subscribedBridge = bridge;
    }
  }

  function attachStageDropTargets() {
    if (trayInitialized) return;
    trayInitialized = true;

    const onDragOver = (e) => {
      if (!dragDraftId) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    };

    const onDrop = async (e, page) => {
      if (!dragDraftId) return;
      e.preventDefault();
      const bridge = getBridge();
      if (!bridge || typeof bridge.dropDraftToPage !== "function") return;
      const stage = page?.stage;
      if (!stage) return;
      try {
        if (typeof stage.setPointersPositions === "function") stage.setPointersPositions(e);
      } catch (_err) {}
      const container = stage.container ? stage.container() : null;
      const rect = container ? container.getBoundingClientRect() : null;
      const pointer = stage.getPointerPosition?.() || (rect ? {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      } : null);
      if (!pointer) return;
      const res = await bridge.dropDraftToPage(dragDraftId, {
        stage,
        pageNumber: page.number,
        pointer
      });
      if (!res || res.ok !== true) return;
      dragDraftId = null;
    };

    const installForPage = (page) => {
      const stage = page?.stage;
      if (!stage || page._customDraftTrayDropBound) return;
      const container = stage.container ? stage.container() : null;
      if (!container) return;
      page._customDraftTrayDropBound = true;
      container.addEventListener("dragover", onDragOver);
      container.addEventListener("drop", (e) => onDrop(e, page));
    };

    const bindAllPages = () => {
      (Array.isArray(window.pages) ? window.pages : []).forEach(installForPage);
    };
    bindAllPages();

    window.addEventListener("canvasCreated", bindAllPages);
    window.addEventListener("customStyleDraftTrayOpenRequest", () => showTray());
  }

  function init() {
    ensureTray();
    bindBridge();
    attachStageDropTargets();
  }

  window.CustomStyleDraftTrayUI = {
    open: showTray,
    close: hideTray,
    isOpen: isTrayOpen,
    refresh() {
      const bridge = getBridge();
      if (bridge?.getDrafts) renderDrafts(bridge.getDrafts());
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

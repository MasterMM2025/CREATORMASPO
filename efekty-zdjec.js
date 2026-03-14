(function () {
  const STYLE_ID = "imageEffectsPanelStyles";

  function ensureImageEffectsStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .imgfx-submenu {
        border: 1px solid rgba(122, 148, 194, 0.2) !important;
        border-radius: 26px !important;
        background:
          radial-gradient(900px 320px at 12% -10%, rgba(64, 127, 255, 0.14), transparent 46%),
          radial-gradient(560px 280px at 92% 4%, rgba(30, 194, 164, 0.12), transparent 42%),
          linear-gradient(180deg, rgba(9, 15, 29, 0.98) 0%, rgba(5, 10, 20, 0.99) 100%) !important;
        box-shadow:
          0 28px 80px rgba(0, 0, 0, 0.46),
          inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
        padding: 0 !important;
      }
      .page-edit-panel.imgfx-side-panel {
        padding: 10px 10px 18px 10px;
      }
      .page-edit-panel.imgfx-side-panel .imgfx-shell {
        width: 100%;
      }
      .page-edit-panel.imgfx-side-panel .imgfx-header {
        padding: 10px 4px 14px;
      }
      .page-edit-panel.imgfx-side-panel .imgfx-heading {
        font-size: 22px;
      }
      .page-edit-panel.imgfx-side-panel .imgfx-subtitle {
        font-size: 13px;
      }
      .page-edit-panel.imgfx-side-panel .imgfx-grid {
        grid-template-columns: 1fr;
        gap: 12px;
        padding: 0 4px 6px;
      }
      .page-edit-panel.imgfx-side-panel .imgfx-section--wide,
      .page-edit-panel.imgfx-side-panel .imgfx-section--medium,
      .page-edit-panel.imgfx-side-panel .imgfx-section--small {
        grid-column: span 1;
      }
      .page-edit-panel.imgfx-side-panel .imgfx-row {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .page-edit-panel.imgfx-side-panel .imgfx-value {
        text-align: left;
      }
      .page-edit-panel.imgfx-side-panel .imgfx-badge {
        display: none;
      }
      .imgfx-close-btn {
        width: 34px;
        height: 34px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(180deg, rgba(26, 38, 60, 0.94) 0%, rgba(14, 21, 36, 0.98) 100%);
        color: #dbe6f8;
        cursor: pointer;
        flex: 0 0 auto;
      }
      .imgfx-shell {
        width: min(1220px, 94vw);
        color: #e8eefb;
        font-family: Inter, "Segoe UI", Arial, sans-serif;
      }
      .imgfx-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 22px 24px 18px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .imgfx-kicker {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #88a4d6;
        margin-bottom: 8px;
      }
      .imgfx-heading {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.04em;
        color: #f8fbff;
      }
      .imgfx-subtitle {
        margin: 6px 0 0;
        max-width: 60ch;
        color: #9cadc9;
        font-size: 14px;
        line-height: 1.5;
      }
      .imgfx-badge {
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid rgba(116, 144, 192, 0.24);
        background: rgba(255,255,255,0.04);
        color: #d8e4fb;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      .imgfx-grid {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 16px;
        padding: 20px 24px 24px;
      }
      .imgfx-section {
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,0.08);
        background:
          linear-gradient(180deg, rgba(20, 29, 47, 0.94) 0%, rgba(11, 18, 32, 0.98) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        padding: 18px 18px 16px;
      }
      .imgfx-section--wide {
        grid-column: span 4;
      }
      .imgfx-section--medium {
        grid-column: span 4;
      }
      .imgfx-section--small {
        grid-column: span 4;
      }
      .imgfx-title {
        margin: 0 0 14px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #90a5c8;
      }
      .imgfx-row {
        display: grid;
        grid-template-columns: 190px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      .imgfx-row:last-child {
        margin-bottom: 0;
      }
      .imgfx-row label {
        color: #d5e0f2;
        font-size: 13px;
        font-weight: 600;
      }
      .imgfx-value {
        min-width: 44px;
        text-align: right;
        font-size: 12px;
        font-weight: 700;
        color: #8ea4c8;
      }
      .imgfx-split {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .imgfx-stack {
        display: grid;
        gap: 10px;
      }
      .imgfx-toggle-line {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .imgfx-toggle {
        width: 18px;
        height: 18px;
        accent-color: #7cf6d6;
      }
      .imgfx-range {
        width: 100%;
        accent-color: #56a5ff;
      }
      .imgfx-color {
        width: 56px;
        height: 36px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03);
        padding: 3px;
      }
      .imgfx-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .imgfx-chip {
        min-height: 42px;
        padding: 0 16px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03);
        color: #e8eefb;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .imgfx-chip.is-active {
        border-color: rgba(83, 216, 189, 0.38);
        background: linear-gradient(135deg, rgba(46, 210, 170, 0.22), rgba(69, 117, 255, 0.18));
        color: #f6fffc;
      }
      .imgfx-action {
        min-height: 46px;
        padding: 0 18px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(180deg, rgba(24, 36, 59, 0.96) 0%, rgba(12, 19, 34, 0.98) 100%);
        color: #eef5ff;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
      }
      .imgfx-action--primary {
        border-color: rgba(124, 246, 214, 0.32);
        background: linear-gradient(135deg, #1ed0a7 0%, #20a6ff 100%);
        color: #04131a;
      }
      @media (max-width: 1100px) {
        .imgfx-section--wide,
        .imgfx-section--medium,
        .imgfx-section--small {
          grid-column: span 6;
        }
      }
      @media (max-width: 760px) {
        .imgfx-grid {
          grid-template-columns: 1fr;
        }
        .imgfx-section--wide,
        .imgfx-section--medium,
        .imgfx-section--small {
          grid-column: span 1;
        }
        .imgfx-row {
          grid-template-columns: 1fr;
        }
        .imgfx-value {
          text-align: left;
        }
        .imgfx-header {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getImageLabel(img) {
    const slot = Number(img?.getAttr?.("slotIndex"));
    if (Number.isFinite(slot) && slot >= 0) return `Zdjecie produktu ${slot + 1}`;
    if (img?.getAttr?.("isProductImage")) return "Zdjecie produktu";
    if (img?.getAttr?.("isUserImage")) return "Obraz uzytkownika";
    if (img?.getAttr?.("isDesignElement")) return "Element graficzny";
    return "Zdjecie";
  }

  function bindRange(id, cb) {
    const el = document.getElementById(id);
    if (!el) return;
    el.oninput = (event) => cb(parseFloat(event.target.value));
  }

  function bindColor(id, cb) {
    const el = document.getElementById(id);
    if (!el) return;
    el.oninput = (event) => cb(event.target.value);
  }

  function setValueLabel(id, value, suffix = "") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = `${Math.round(value)}${suffix}`;
  }

  function resolveActivePage() {
    const list = Array.isArray(window.pages) ? window.pages : [];
    if (!list.length) return null;
    const activeStage = document.activeStage || null;
    return list.find((page) => page && page.stage === activeStage && !page.isCover)
      || list.find((page) => page && !page.isCover)
      || null;
  }

  function ensureSidePanelHost() {
    let panel = document.querySelector(".page-edit-panel");
    if (panel) return panel;
    if (typeof window.showPageEditForCurrentPage === "function") {
      window.showPageEditForCurrentPage();
      panel = document.querySelector(".page-edit-panel");
    }
    return panel || null;
  }

  function closeImageEffectsSidePanel() {
    try { window.hideSubmenu?.(); } catch (_e) {}
    const panel = document.querySelector(".page-edit-panel.imgfx-side-panel");
    if (!panel) return;
    panel.classList.remove("imgfx-side-panel");
    const restore = panel._imgfxRestoreState || {};
    panel._imgfxRestoreState = null;
    try { window.destroyPageEditPanel?.(); } catch (_e) {}
    if (restore.page && typeof window.openPageEdit === "function" && restore.restorePageEditor) {
      window.openPageEdit(restore.page);
      return;
    }
    if (typeof window.hidePageEditPanel === "function") window.hidePageEditPanel();
  }

  function showInSidePanel(img, fx, imageLabel) {
    const wasPageEditorVisible = typeof window.isPageEditPanelVisible === "function"
      ? window.isPageEditPanelVisible()
      : false;
    try { window.hideSubmenu?.(); } catch (_e) {}
    const panel = ensureSidePanelHost();
    if (!panel) return false;
    const activePage = resolveActivePage();
    panel._imgfxRestoreState = {
      restorePageEditor: wasPageEditorVisible,
      page: activePage
    };
    panel.classList.add("imgfx-side-panel");
    panel.style.display = "block";
    document.body.classList.add("page-edit-panel-visible");

    panel.innerHTML = `
      <div class="imgfx-shell">
        <div class="imgfx-header">
          <div>
            <div class="imgfx-kicker">Image Effects</div>
            <h3 class="imgfx-heading">Efekty zdjecia</h3>
            <p class="imgfx-subtitle">Panel zastapil prawy edytor strony. Zmiany widzisz od razu na zaznaczonym obrazie.</p>
          </div>
          <button type="button" id="imgfxCloseBtn" class="imgfx-close-btn" aria-label="Zamknij">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <div class="imgfx-grid">
          <section class="imgfx-section imgfx-section--wide">
            <div class="imgfx-title">Podstawy</div>
            <div class="imgfx-row">
              <label for="fxOpacity">Przezroczystosc</label>
              <input id="fxOpacity" class="imgfx-range" type="range" min="0" max="100" value="${Math.round(fx.opacity * 100)}">
              <span id="fxOpacityVal" class="imgfx-value">${Math.round(fx.opacity * 100)}%</span>
            </div>
            <div class="imgfx-row">
              <label for="fxShadowOn">Cien</label>
              <div class="imgfx-toggle-line">
                <input id="fxShadowOn" class="imgfx-toggle" type="checkbox" ${fx.shadowEnabled ? "checked" : ""}>
                <input id="fxShadowColor" class="imgfx-color" type="color" value="${window.normalizeHexColor(fx.shadowColor)}">
              </div>
              <span class="imgfx-value">${fx.shadowEnabled ? "ON" : "OFF"}</span>
            </div>
            <div class="imgfx-row">
              <label for="fxShadowBlur">Rozmycie cienia</label>
              <input id="fxShadowBlur" class="imgfx-range" type="range" min="0" max="60" value="${fx.shadowBlur}">
              <span id="fxShadowBlurVal" class="imgfx-value">${Math.round(fx.shadowBlur)}</span>
            </div>
            <div class="imgfx-row">
              <label>Przesuniecie cienia</label>
              <div class="imgfx-split">
                <input id="fxShadowOffX" class="imgfx-range" type="range" min="-40" max="40" value="${fx.shadowOffsetX}">
                <input id="fxShadowOffY" class="imgfx-range" type="range" min="-40" max="40" value="${fx.shadowOffsetY}">
              </div>
              <span id="fxShadowOffsetVal" class="imgfx-value">${Math.round(fx.shadowOffsetX)} / ${Math.round(fx.shadowOffsetY)}</span>
            </div>
            <div class="imgfx-row">
              <label for="fxShadowOpacity">Intensywnosc cienia</label>
              <input id="fxShadowOpacity" class="imgfx-range" type="range" min="0" max="100" value="${Math.round(fx.shadowOpacity * 100)}">
              <span id="fxShadowOpacityVal" class="imgfx-value">${Math.round(fx.shadowOpacity * 100)}%</span>
            </div>
          </section>

          <section class="imgfx-section imgfx-section--wide">
            <div class="imgfx-title">Korekta obrazu</div>
            <div class="imgfx-row">
              <label for="fxBrightness">Jasnosc</label>
              <input id="fxBrightness" class="imgfx-range" type="range" min="-100" max="100" value="${fx.brightness}">
              <span id="fxBrightnessVal" class="imgfx-value">${Math.round(fx.brightness)}</span>
            </div>
            <div class="imgfx-row">
              <label for="fxContrast">Kontrast</label>
              <input id="fxContrast" class="imgfx-range" type="range" min="-100" max="100" value="${fx.contrast}">
              <span id="fxContrastVal" class="imgfx-value">${Math.round(fx.contrast)}</span>
            </div>
            <div class="imgfx-row">
              <label for="fxSaturation">Nasycenie</label>
              <input id="fxSaturation" class="imgfx-range" type="range" min="-100" max="100" value="${fx.saturation}">
              <span id="fxSaturationVal" class="imgfx-value">${Math.round(fx.saturation)}</span>
            </div>
            <div class="imgfx-row">
              <label for="fxTemperature">Temperatura</label>
              <input id="fxTemperature" class="imgfx-range" type="range" min="-100" max="100" value="${fx.temperature}">
              <span id="fxTemperatureVal" class="imgfx-value">${Math.round(fx.temperature)}</span>
            </div>
          </section>

          <section class="imgfx-section imgfx-section--small">
            <div class="imgfx-title">Kolor / styl</div>
            <div class="imgfx-chip-row">
              <button id="fxGrayscale" class="imgfx-chip ${fx.grayscale ? "is-active" : ""}">B&W</button>
              <button id="fxSepia" class="imgfx-chip ${fx.sepia ? "is-active" : ""}">Sepia</button>
            </div>
          </section>

          <section class="imgfx-section imgfx-section--medium">
            <div class="imgfx-title">Obrys / ramka</div>
            <div class="imgfx-row">
              <label for="fxStrokeColor">Kolor obrysu</label>
              <input id="fxStrokeColor" class="imgfx-color" type="color" value="${window.normalizeHexColor(fx.strokeColor)}">
              <span class="imgfx-value"></span>
            </div>
            <div class="imgfx-row">
              <label for="fxStrokeWidth">Grubosc obrysu</label>
              <input id="fxStrokeWidth" class="imgfx-range" type="range" min="0" max="20" value="${fx.strokeWidth}">
              <span id="fxStrokeWidthVal" class="imgfx-value">${Math.round(fx.strokeWidth)}</span>
            </div>
          </section>

          <section class="imgfx-section imgfx-section--medium">
            <div class="imgfx-title">Rozmycie tla (focus)</div>
            <div class="imgfx-row">
              <label for="fxBgBlur">Sila rozmycia</label>
              <input id="fxBgBlur" class="imgfx-range" type="range" min="0" max="40" value="${fx.bgBlur}">
              <span id="fxBgBlurVal" class="imgfx-value">${Math.round(fx.bgBlur)}</span>
            </div>
          </section>

          <section class="imgfx-section imgfx-section--small">
            <div class="imgfx-title">Reset</div>
            <div class="imgfx-stack">
              <div class="imgfx-badge" style="display:block;width:fit-content;">${imageLabel}</div>
              <button id="fxResetBtn" class="imgfx-action">Domyslne</button>
              <button id="fxApplyAllBtn" class="imgfx-action imgfx-action--primary">Zastosuj na wszystkie</button>
            </div>
          </section>
        </div>
      </div>
    `;
    document.getElementById("imgfxCloseBtn")?.addEventListener("click", closeImageEffectsSidePanel);
    return true;
  }

  window.openImageEffectsMenu = function openImageEffectsMenu(img) {
    try {
      window.closeBackgroundSidePanel?.({ restorePageEditor: false, resetToolbarState: true });
    } catch (_e) {}
    if (!img || typeof window.ensureImageFX !== "function" || typeof window.getImageFxState !== "function" || typeof window.applyImageFX !== "function") {
      return;
    }

    ensureImageEffectsStyles();
    window.ensureImageFX(img);
    const fx = window.getImageFxState(img);
    const imageLabel = getImageLabel(img);
    if (!showInSidePanel(img, fx, imageLabel) && typeof window.showSubmenu === "function") {
      window.showSubmenu(`<div style="padding:16px;color:#fff;">Nie udalo sie otworzyc panelu bocznego efektow.</div>`, {
        width: "360px",
        className: "imgfx-submenu",
        anchor: "center"
      });
      return;
    }

    bindRange("fxOpacity", (value) => {
      setValueLabel("fxOpacityVal", value, "%");
      img.setAttr("fxOpacity", value / 100);
      window.applyImageFX(img);
    });

    const shadowOn = document.getElementById("fxShadowOn");
    if (shadowOn) {
      shadowOn.onchange = (event) => {
        img.setAttr("fxShadowEnabled", event.target.checked);
        if (event.target.checked) {
          if ((Number(img.getAttr("fxShadowBlur")) || 0) <= 0) img.setAttr("fxShadowBlur", 22);
          if ((Number(img.getAttr("fxShadowOpacity")) || 0) <= 0) img.setAttr("fxShadowOpacity", 0.5);
          if (!Number.isFinite(Number(img.getAttr("fxShadowOffsetX")))) img.setAttr("fxShadowOffsetX", 6);
          if (!Number.isFinite(Number(img.getAttr("fxShadowOffsetY")))) img.setAttr("fxShadowOffsetY", 8);
          img.setAttr("fxShadowColor", img.getAttr("fxShadowColor") || "#000000");
        }
        window.applyImageFX(img);
      };
    }

    bindColor("fxShadowColor", (value) => {
      img.setAttr("fxShadowEnabled", true);
      if (shadowOn) shadowOn.checked = true;
      img.setAttr("fxShadowColor", value);
      window.applyImageFX(img);
    });
    bindRange("fxShadowBlur", (value) => {
      setValueLabel("fxShadowBlurVal", value);
      img.setAttr("fxShadowEnabled", true);
      if (shadowOn) shadowOn.checked = true;
      img.setAttr("fxShadowBlur", value);
      window.applyImageFX(img);
    });
    bindRange("fxShadowOffX", (value) => {
      img.setAttr("fxShadowEnabled", true);
      if (shadowOn) shadowOn.checked = true;
      img.setAttr("fxShadowOffsetX", value);
      setValueLabel("fxShadowOffsetVal", Number(document.getElementById("fxShadowOffX")?.value || 0));
      const label = document.getElementById("fxShadowOffsetVal");
      if (label) label.textContent = `${Math.round(Number(document.getElementById("fxShadowOffX")?.value || 0))} / ${Math.round(Number(document.getElementById("fxShadowOffY")?.value || 0))}`;
      window.applyImageFX(img);
    });
    bindRange("fxShadowOffY", (value) => {
      img.setAttr("fxShadowEnabled", true);
      if (shadowOn) shadowOn.checked = true;
      img.setAttr("fxShadowOffsetY", value);
      const label = document.getElementById("fxShadowOffsetVal");
      if (label) label.textContent = `${Math.round(Number(document.getElementById("fxShadowOffX")?.value || 0))} / ${Math.round(Number(document.getElementById("fxShadowOffY")?.value || 0))}`;
      window.applyImageFX(img);
    });
    bindRange("fxShadowOpacity", (value) => {
      setValueLabel("fxShadowOpacityVal", value, "%");
      img.setAttr("fxShadowEnabled", true);
      if (shadowOn) shadowOn.checked = true;
      img.setAttr("fxShadowOpacity", value / 100);
      window.applyImageFX(img);
    });

    [
      ["fxBrightness", "fxBrightnessVal", "fxBrightness"],
      ["fxContrast", "fxContrastVal", "fxContrast"],
      ["fxSaturation", "fxSaturationVal", "fxSaturation"],
      ["fxTemperature", "fxTemperatureVal", "fxTemperature"],
      ["fxStrokeWidth", "fxStrokeWidthVal", "fxStrokeWidth"],
      ["fxBgBlur", "fxBgBlurVal", "fxBgBlur"]
    ].forEach(([id, labelId, attr]) => {
      bindRange(id, (value) => {
        setValueLabel(labelId, value);
        img.setAttr(attr, value);
        window.applyImageFX(img);
      });
    });

    bindColor("fxStrokeColor", (value) => {
      img.setAttr("fxStrokeColor", value);
      window.applyImageFX(img);
    });

    const grayscaleBtn = document.getElementById("fxGrayscale");
    if (grayscaleBtn) {
      grayscaleBtn.onclick = () => {
        const next = !img.getAttr("fxGrayscale");
        img.setAttr("fxGrayscale", next);
        grayscaleBtn.classList.toggle("is-active", next);
        window.applyImageFX(img);
      };
    }

    const sepiaBtn = document.getElementById("fxSepia");
    if (sepiaBtn) {
      sepiaBtn.onclick = () => {
        const next = !img.getAttr("fxSepia");
        img.setAttr("fxSepia", next);
        sepiaBtn.classList.toggle("is-active", next);
        window.applyImageFX(img);
      };
    }

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
        const syncPairs = [
          ["fxOpacity", 100],
          ["fxShadowBlur", 0],
          ["fxShadowOffX", 0],
          ["fxShadowOffY", 0],
          ["fxShadowOpacity", 35],
          ["fxBrightness", 0],
          ["fxContrast", 0],
          ["fxSaturation", 0],
          ["fxTemperature", 0],
          ["fxStrokeWidth", 0],
          ["fxBgBlur", 0]
        ];
        syncPairs.forEach(([id, value]) => {
          const el = document.getElementById(id);
          if (el) el.value = String(value);
        });
        const shadowCheckbox = document.getElementById("fxShadowOn");
        if (shadowCheckbox) shadowCheckbox.checked = false;
        const shadowColor = document.getElementById("fxShadowColor");
        if (shadowColor) shadowColor.value = "#000000";
        const strokeColor = document.getElementById("fxStrokeColor");
        if (strokeColor) strokeColor.value = "#000000";
        setValueLabel("fxOpacityVal", 100, "%");
        setValueLabel("fxShadowBlurVal", 0);
        setValueLabel("fxShadowOpacityVal", 35, "%");
        setValueLabel("fxBrightnessVal", 0);
        setValueLabel("fxContrastVal", 0);
        setValueLabel("fxSaturationVal", 0);
        setValueLabel("fxTemperatureVal", 0);
        setValueLabel("fxStrokeWidthVal", 0);
        setValueLabel("fxBgBlurVal", 0);
        const offsetLabel = document.getElementById("fxShadowOffsetVal");
        if (offsetLabel) offsetLabel.textContent = "0 / 0";
        grayscaleBtn?.classList.remove("is-active");
        sepiaBtn?.classList.remove("is-active");
        window.applyImageFX(img);
      };
    }

    const applyAllBtn = document.getElementById("fxApplyAllBtn");
    if (applyAllBtn) {
      applyAllBtn.onclick = () => {
        const currentFx = window.getImageFxState(img);
        const isValidImage = (node) => {
          if (!(node instanceof Konva.Image)) return false;
          if (node.getAttr("isBgBlur")) return false;
          if (node.getAttr("isBarcode")) return false;
          if (node.getAttr("isTNZBadge")) return false;
          if (node.getAttr("isCountryBadge")) return false;
          if (node.getAttr("isOverlayElement")) return false;
          return true;
        };

        (window.pages || []).forEach((page) => {
          page.layer.find((node) => isValidImage(node)).forEach((target) => {
            target.setAttrs({
              fxOpacity: currentFx.opacity,
              fxShadowEnabled: currentFx.shadowEnabled,
              fxShadowColor: currentFx.shadowColor,
              fxShadowBlur: currentFx.shadowBlur,
              fxShadowOffsetX: currentFx.shadowOffsetX,
              fxShadowOffsetY: currentFx.shadowOffsetY,
              fxShadowOpacity: currentFx.shadowOpacity,
              fxBrightness: currentFx.brightness,
              fxContrast: currentFx.contrast,
              fxSaturation: currentFx.saturation,
              fxTemperature: currentFx.temperature,
              fxGrayscale: currentFx.grayscale,
              fxSepia: currentFx.sepia,
              fxStrokeColor: currentFx.strokeColor,
              fxStrokeWidth: currentFx.strokeWidth,
              fxBgBlur: currentFx.bgBlur
            });
            window.applyImageFX(target);
          });
        });
      };
    }
  };
})();

// edycja.js – PEŁNY EDYTOR + WALUTA + EDYCJA KAŻDEGO TEKSTU Z isEditable

let editPanel = null;
let currentText = null;
let currentStage = null;
let currentLayer = null;
let pageEditPanel = null;
let currentPage = null;
let pageEditSyncScheduled = false;
let pageEditSyncInProgress = false;

function getActiveEditablePage() {
  const list = Array.isArray(window.pages) ? window.pages : [];
  if (!list.length) return null;
  const activeStage = document.activeStage || null;
  return (
    list.find((page) => page && !page.isCover && page.stage === activeStage) ||
    list.find((page) => page && !page.isCover) ||
    null
  );
}

function syncVisiblePageEditToActivePage() {
  if (pageEditSyncInProgress) return false;
  if (!(window.isPageEditPanelVisible && window.isPageEditPanelVisible())) return false;
  const nextPage = getActiveEditablePage();
  if (!nextPage || nextPage === currentPage) return false;
  pageEditSyncInProgress = true;
  try {
    window.openPageEdit(nextPage);
    return true;
  } finally {
    pageEditSyncInProgress = false;
  }
}

function scheduleVisiblePageEditSync() {
  if (pageEditSyncScheduled) return;
  pageEditSyncScheduled = true;
  const run = () => {
    pageEditSyncScheduled = false;
    syncVisiblePageEditToActivePage();
  };
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(run);
    return;
  }
  setTimeout(run, 0);
}

function dismissPageEditBlockingOverlays() {
  const closeSafely = (fn) => {
    try {
      if (typeof fn === 'function') fn();
    } catch (_e) {}
  };

  closeSafely(window.NewStyleUI?.close);
  closeSafely(window.CustomStyleCreatorUI?.close);
  closeSafely(window.CustomStyleDraftTrayUI?.close);

  const newStyleModal = document.getElementById('newStyleModal');
  if (newStyleModal) newStyleModal.style.display = 'none';

  const customStyleModal = document.getElementById('customStyleModal');
  if (customStyleModal) customStyleModal.style.display = 'none';

  const magicLayoutBackdrop = document.getElementById('magicLayoutBackdrop');
  if (magicLayoutBackdrop) {
    magicLayoutBackdrop.classList.remove('is-open');
    magicLayoutBackdrop._magicLayoutContext = null;
  }
}

if (!window.__pageEditActivePageSyncBound) {
  window.__pageEditActivePageSyncBound = true;
  window.addEventListener('canvasModified', () => {
    scheduleVisiblePageEditSync();
  });
  document.addEventListener('mousedown', (e) => {
    const target = e.target && e.target.closest ? e.target.closest('.page-container, .canvas-wrapper, .page-zoom-wrap') : null;
    if (!target) return;
    scheduleVisiblePageEditSync();
  }, true);
  document.addEventListener('touchstart', (e) => {
    const target = e.target && e.target.closest ? e.target.closest('.page-container, .canvas-wrapper, .page-zoom-wrap') : null;
    if (!target) return;
    scheduleVisiblePageEditSync();
  }, true);
}

window.destroyPageEditPanel = function() {
  if (!pageEditPanel) return;
  try { pageEditPanel.remove(); } catch (_e) {}
  pageEditPanel = null;
    };

function syncPageEditLayoutState(expanded) {
  document.body.classList.toggle('page-edit-panel-visible', !!expanded);
}

function syncPageEditToggleState(expanded) {
  const pageSettingsToggleBtn = document.getElementById('pageSettingsToggleBtn');
  if (!pageSettingsToggleBtn) return;
  pageSettingsToggleBtn.classList.toggle('active', !!expanded);
  pageSettingsToggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

window.hidePageEditPanel = function() {
  if (!pageEditPanel) return;
  pageEditPanel.style.display = 'none';
  syncPageEditLayoutState(false);
  syncPageEditToggleState(false);
};

window.isPageEditPanelVisible = function() {
  return !!(pageEditPanel && pageEditPanel.style.display !== 'none');
};

window.getPageEditPanelRestoreState = function() {
  if (!(window.isPageEditPanelVisible && window.isPageEditPanelVisible())) return null;
  const list = Array.isArray(window.pages) ? window.pages : [];
  const pageIndex = currentPage ? list.indexOf(currentPage) : -1;
  return {
    visible: true,
    pageIndex: pageIndex >= 0 ? pageIndex : null
  };
};

window.restorePageEditPanelState = function(state) {
  if (!state?.visible || typeof window.openPageEdit !== 'function') return false;
  const list = Array.isArray(window.pages) ? window.pages : [];
  if (!list.length) return false;
  const preferredByIndex = Number.isInteger(state.pageIndex) ? list[state.pageIndex] : null;
  const fallback =
    list.find((page) => page && page.stage === document.activeStage && !page.isCover) ||
    list.find((page) => page && !page.isCover) ||
    list[0] ||
    null;
  const nextPage = (preferredByIndex && !preferredByIndex.isCover) ? preferredByIndex : fallback;
  if (!nextPage || nextPage.isCover) return false;
  window.openPageEdit(nextPage);
  return true;
};

window.togglePageEditForPage = function(page) {
  if (!page || page.isCover || typeof window.openPageEdit !== 'function') return false;
  if (window.isPageEditPanelVisible && window.isPageEditPanelVisible() && currentPage === page) {
    if (typeof window.hidePageEditPanel === 'function') {
      window.hidePageEditPanel();
      return true;
    }
    return false;
  }
  window.openPageEdit(page);
  return true;
};

window.showPageEditForCurrentPage = function() {
  const list = Array.isArray(window.pages) ? window.pages : [];
  if (!list.length || typeof window.openPageEdit !== 'function') return false;
  const activeStage = document.activeStage || null;
  const preferredPage =
    list.find((page) => page && page.stage === activeStage && !page.isCover) ||
    list.find((page) => page && !page.isCover) ||
    list[0] ||
    null;
  if (!preferredPage || preferredPage.isCover) return false;
  window.openPageEdit(preferredPage);
  return true;
};


// === DOMYŚLNE STYLE DLA KAŻDEGO TYPU ===
const DEFAULT_STYLES = {
  nameStyle: { size: 12, fontFamily: 'Arial', color: '#000000', bold: false, italic: false, underline: false },
  indexStyle: { size: 14, fontFamily: 'Arial', color: '#000000', bold: false, italic: false, underline: false },
  packageStyle: { size: 12, fontFamily: 'Arial', color: '#000000', bold: false, italic: false, underline: false },
  priceStyle: { size: 24, fontFamily: 'Arial', color: '#000000', bold: true, italic: false, underline: false },
  ratingStyle: { size: 12, fontFamily: 'Arial', color: '#000000', bold: false, italic: false, underline: false },

};


function normalizeCurrencyCode(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return 'GBP';
  if (raw === '€' || raw === 'EUR' || raw === 'EURO') return 'EUR';
  if (raw === '£' || raw === 'GBP') return 'GBP';
  if (raw === 'ZŁ' || raw === 'ZL' || raw === 'PLN') return 'PLN';
  return 'GBP';
}

function normalizeColorForInput(value, fallback = '#000000') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  if (typeof document === 'undefined') return fallback;
  const probe = document.createElement('span');
  probe.style.color = raw;
  const normalized = String(probe.style.color || '').trim();
  const match = normalized.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return fallback;
  const parts = match[1].split(',').slice(0, 3).map((part) => {
    const num = Math.max(0, Math.min(255, parseInt(part, 10) || 0));
    return num.toString(16).padStart(2, '0');
  });
  return `#${parts.join('')}`;
}

function getNodeUnderline(node) {
  if (!node) return false;
  const textDecoration = String(
    (typeof node.textDecoration === 'function' ? node.textDecoration() : (node.getAttr && node.getAttr('textDecoration'))) || ''
  ).toLowerCase();
  return textDecoration.includes('underline') || !!(node.getAttr && node.getAttr('underline'));
}

function extractTextNodeStyle(node, fallback = {}) {
  if (!(node instanceof Konva.Text)) return null;
  const fontStyle = String(node.fontStyle?.() || '').toLowerCase();
  return {
    size: Math.max(1, Math.round(Number(node.fontSize?.() || fallback.size || 12))),
    fontFamily: String(node.fontFamily?.() || fallback.fontFamily || 'Arial').trim() || 'Arial',
    color: normalizeColorForInput(node.fill?.(), fallback.color || '#000000'),
    bold: fontStyle.includes('bold'),
    italic: fontStyle.includes('italic'),
    underline: getNodeUnderline(node)
  };
}

function getPageMatchingNodes(page, predicate) {
  if (!page || !page.layer || typeof page.layer.find !== 'function') return [];
  return page.layer.find((node) => {
    try {
      return !!predicate(node);
    } catch (_e) {
      return false;
    }
  }) || [];
}

function getFirstPageMatchingNode(page, predicate) {
  const matches = getPageMatchingNodes(page, predicate);
  return matches.length ? matches[0] : null;
}

function getLegacyStyleForType(page, type) {
  const settings = page && page.settings ? page.settings : {};
  const defaultStyle = DEFAULT_STYLES[type + 'Style'] || DEFAULT_STYLES.nameStyle;
  if (type === 'name') {
    return {
      size: Number.isFinite(Number(settings.nameSize)) ? Number(settings.nameSize) : defaultStyle.size,
      fontFamily: String(settings.fontFamily || defaultStyle.fontFamily || 'Arial'),
      color: normalizeColorForInput(settings.nameColor || settings.textColor || defaultStyle.color, defaultStyle.color),
      bold: !!defaultStyle.bold,
      italic: !!defaultStyle.italic,
      underline: !!defaultStyle.underline
    };
  }
  if (type === 'index') {
    return {
      size: Number.isFinite(Number(settings.indexSize)) ? Number(settings.indexSize) : defaultStyle.size,
      fontFamily: String(settings.fontFamily || defaultStyle.fontFamily || 'Arial'),
      color: normalizeColorForInput(settings.indexColor || settings.textColor || defaultStyle.color, defaultStyle.color),
      bold: !!defaultStyle.bold,
      italic: !!defaultStyle.italic,
      underline: !!defaultStyle.underline
    };
  }
  if (type === 'package') {
    const fallbackIndex = getLegacyStyleForType(page, 'index');
    return {
      size: Number.isFinite(Number(settings.packageSize)) ? Number(settings.packageSize) : fallbackIndex.size,
      fontFamily: String(settings.packageFontFamily || fallbackIndex.fontFamily || defaultStyle.fontFamily || 'Arial'),
      color: normalizeColorForInput(settings.packageColor || fallbackIndex.color || defaultStyle.color, defaultStyle.color),
      bold: !!defaultStyle.bold,
      italic: !!defaultStyle.italic,
      underline: !!defaultStyle.underline
    };
  }
  if (type === 'price') {
    return {
      size: Number.isFinite(Number(settings.priceSize)) ? Number(settings.priceSize) : defaultStyle.size,
      fontFamily: String(settings.priceFontFamily || settings.fontFamily || defaultStyle.fontFamily || 'Arial'),
      color: normalizeColorForInput(settings.priceColor || defaultStyle.color, defaultStyle.color),
      bold: Object.prototype.hasOwnProperty.call(settings, 'priceBold') ? !!settings.priceBold : !!defaultStyle.bold,
      italic: Object.prototype.hasOwnProperty.call(settings, 'priceItalic') ? !!settings.priceItalic : !!defaultStyle.italic,
      underline: Object.prototype.hasOwnProperty.call(settings, 'priceUnderline') ? !!settings.priceUnderline : !!defaultStyle.underline
    };
  }
  if (type === 'rating') {
    return {
      size: Number.isFinite(Number(settings.ratingSize)) ? Number(settings.ratingSize) : defaultStyle.size,
      fontFamily: String(settings.ratingFontFamily || settings.fontFamily || defaultStyle.fontFamily || 'Arial'),
      color: normalizeColorForInput(settings.ratingColor || defaultStyle.color, defaultStyle.color),
      bold: !!defaultStyle.bold,
      italic: !!defaultStyle.italic,
      underline: !!defaultStyle.underline
    };
  }
  return { ...defaultStyle };
}

function normalizeResolvedStyle(style, fallbackStyle) {
  const fallback = fallbackStyle || DEFAULT_STYLES.nameStyle;
  return {
    size: Math.max(1, Math.round(Number(style?.size || fallback.size || 12))),
    fontFamily: String(style?.fontFamily || fallback.fontFamily || 'Arial').trim() || 'Arial',
    color: normalizeColorForInput(style?.color || fallback.color || '#000000', fallback.color || '#000000'),
    bold: !!(style && style.bold),
    italic: !!(style && style.italic),
    underline: !!(style && style.underline)
  };
}

function areResolvedStylesEqual(left, right) {
  return (
    Math.round(Number(left?.size || 0)) === Math.round(Number(right?.size || 0)) &&
    String(left?.fontFamily || '').trim() === String(right?.fontFamily || '').trim() &&
    normalizeColorForInput(left?.color || '', '#000000') === normalizeColorForInput(right?.color || '', '#000000') &&
    !!left?.bold === !!right?.bold &&
    !!left?.italic === !!right?.italic &&
    !!left?.underline === !!right?.underline
  );
}

function detectPageStyleFromCanvas(page, type) {
  const legacy = getLegacyStyleForType(page, type);
  if (type === 'price') {
    const priceGroup = getFirstPageMatchingNode(page, (node) =>
      node instanceof Konva.Group &&
      node.getAttr &&
      node.getAttr('isPriceGroup')
    );
    if (!priceGroup || typeof priceGroup.find !== 'function') return null;
    const mainText =
      priceGroup.findOne((node) => node instanceof Konva.Text && node.getAttr && (
        node.getAttr('pricePart') === 'main' || node.getAttr('priceRole') === 'major'
      )) ||
      priceGroup.findOne((node) => node instanceof Konva.Text) ||
      null;
    const detected = extractTextNodeStyle(mainText, legacy);
    if (!detected) return null;
    const storedSize = Number(page?.settings?.priceStyle?.size);
    const groupScaleX = Number(typeof priceGroup.scaleX === 'function' ? priceGroup.scaleX() : 1);
    const basePriceSize = Number(DEFAULT_STYLES.priceStyle?.size || 24);
    detected.size = Number.isFinite(storedSize) && storedSize > 0
      ? storedSize
      : Math.max(1, Math.round((Number.isFinite(groupScaleX) && groupScaleX > 0 ? groupScaleX : 1) * basePriceSize));
    return detected;
  }

  const typePredicateMap = {
    name: (node) => node instanceof Konva.Text && node.getAttr && node.getAttr('isName'),
    index: (node) => node instanceof Konva.Text && node.getAttr && node.getAttr('isIndex'),
    package: (node) => node instanceof Konva.Text && node.getAttr && node.getAttr('isCustomPackageInfo'),
    rating: (node) => node instanceof Konva.Text && node.getAttr && node.getAttr('isRating')
  };
  const predicate = typePredicateMap[type];
  if (!predicate) return null;
  return extractTextNodeStyle(getFirstPageMatchingNode(page, predicate), legacy);
}

function resolvePagePanelStyle(page, type) {
  const styleKey = type + 'Style';
  const defaultStyle = DEFAULT_STYLES[styleKey] || DEFAULT_STYLES.nameStyle;
  const detected = detectPageStyleFromCanvas(page, type);
  if (detected) return normalizeResolvedStyle(detected, defaultStyle);
  const stored = page && page.settings ? page.settings[styleKey] : null;
  if (stored) return normalizeResolvedStyle(stored, defaultStyle);
  return normalizeResolvedStyle(getLegacyStyleForType(page, type), defaultStyle);
}

function getCurrencyCodeFromText(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes('zł') || raw.includes('zl') || raw.includes('pln')) return 'PLN';
  if (raw.includes('€') || raw.includes('eur') || raw.includes('euro')) return 'EUR';
  if (raw.includes('£') || raw.includes('gbp')) return 'GBP';
  return null;
}

function detectPageCurrency(page) {
  const explicit = normalizeCurrencyCode(page?.settings?.currency || 'GBP');
  const unitNodes = getPageMatchingNodes(page, (node) =>
    node instanceof Konva.Text &&
    node.getAttr &&
    (
      node.getAttr('pricePart') === 'unit' ||
      node.getAttr('isPriceUnit') ||
      node.getAttr('priceRole') === 'unit' ||
      node.getAttr('workspaceKind') === 'currencySymbol'
    )
  );
  const detected = Array.from(new Set(unitNodes
    .map((node) => getCurrencyCodeFromText(node.text?.()))
    .filter(Boolean)));
  if (detected.length === 1) return detected[0];
  if (detected.length > 1) return explicit || detected[0];
  return explicit || 'GBP';
}

function computeStyle(style) {
  if (style.bold) return 'bold';
  if (style.italic) return 'italic';
  return 'normal';
}

function applyFontPreviewToSelect(selectEl, fallback = "Arial") {
  if (!selectEl) return;
  const setFace = (el, family) => {
    if (!el) return;
    el.style.fontFamily = `"${family}", Arial, sans-serif`;
  };
  Array.from(selectEl.options || []).forEach((opt) => {
    const family = String(opt?.value || opt?.textContent || fallback).trim() || fallback;
    setFace(opt, family);
  });
  const selected = String(selectEl.value || fallback).trim() || fallback;
  setFace(selectEl, selected);
}

function getDynamicFonts() {
  const list = (typeof window.getAvailableFonts === "function") ? window.getAvailableFonts() : [];
  return Array.isArray(list) && list.length
    ? list
    : ["Arial", "Inter", "Roboto", "Verdana", "Georgia", "Tahoma", "Courier New"];
}

function repopulateFontSelect(selectEl, preferredValue = "Arial") {
  if (!selectEl) return;
  const fonts = getDynamicFonts();
  const current = String(preferredValue || selectEl.value || "Arial").trim() || "Arial";
  selectEl.innerHTML = fonts.map((f) => `<option value="${f}">${f}</option>`).join("");
  selectEl.value = fonts.includes(current) ? current : (fonts[0] || "Arial");
  applyFontPreviewToSelect(selectEl);
}

function updateCheckStyle(checkbox) {
  const label = checkbox && checkbox.parentElement;
  if (!label) return;
  label.classList.toggle('is-active', !!checkbox.checked);
}

// === TWORZENIE PANELU EDYCJI TEKSTU (ROZBUDOWANY) ===
function createEditPanel() {
  if (editPanel) {
    editPanel.style.display = 'block';
    return editPanel;
  }

  editPanel = document.createElement('div');
  editPanel.style.cssText = `
    position: fixed; top: 20px; right: 20px; width: 360px; background: white;
    padding: 16px; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    z-index: 10000; font-family: Arial; border: 1px solid #ddd; max-height: 80vh; overflow-y: auto;
  `;

  editPanel.innerHTML = `
    <h3 style="margin:0 0 12px; font-size:16px;">Edycja tekstu</h3>
    
    <label style="display:block; margin-bottom:8px;">
      Treść: <br>
      <textarea id="textInput" style="width:100%; height:80px; margin-top:4px; resize:vertical; font-family:Arial;"></textarea>
    </label>
    
    <label style="display:block; margin-bottom:8px;">
      Czcionka:
      <select id="fontSelect" style="width:100%; padding:4px; margin-top:4px;">
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
        <option value="Verdana">Verdana</option>
        <option value="Georgia">Georgia</option>
        <option value="Comic Sans MS">Comic Sans MS</option>
        <option value="Impact">Impact</option>
        <option value="Trebuchet MS">Trebuchet MS</option>
        <option value="Google Sans Flex">Google Sans Flex</option>
      </select>
    </label>
    
    <label style="display:block; margin-bottom:8px;">
      Rozmiar:
      <input type="number" id="sizeInput" min="8" max="72" value="18" style="width:100%; padding:4px;">
    </label>
    
    <label style="display:block; margin-bottom:8px;">
      Kolor: <input type="color" id="colorInput" value="#000000" style="width:100%; height:36px;">
    </label>
    
    <div style="margin-bottom:12px;">
      <label style="display:inline-block; margin-right:12px;">
        <input type="checkbox" id="boldInput"> Pogrubienie
      </label>
      <label style="display:inline-block; margin-right:12px;">
        <input type="checkbox" id="italicInput"> Kursywa
      </label>
      <label style="display:inline-block;">
        <input type="checkbox" id="underlineInput"> Podkreślenie
      </label>
    </div>
    
    <label style="display:block; margin-bottom:8px;">
      Wyrównanie:
      <select id="alignSelect" style="width:100%; padding:4px; margin-top:4px;">
        <option value="left">Do lewej</option>
        <option value="center">Wyśrodkowane</option>
        <option value="right">Do prawej</option>
      </select>
    </label>
    
    <label style="display:block; margin-bottom:8px;">
      Odstęp między liniami:
      <input type="number" id="lineHeightInput" min="0.5" max="3" step="0.1" value="1.2" style="width:100%; padding:4px;">
    </label>

    <label style="display:block; margin-bottom:8px;">
      Odstęp między literami:
      <input type="number" id="letterSpacingInput" min="-10" max="50" step="1" value="0" style="width:100%; padding:4px;">
    </label>

    <div style="border-top: 1px solid #eee; padding-top: 12px; margin-bottom: 12px;">
      <h4 style="margin:0 0 8px; font-size:14px;">Cień tekstu</h4>
      <label><input type="checkbox" id="shadowEnabled"> Włącz</label>
      <label>Kolor: <input type="color" id="shadowColor" value="#000000"></label>
      <label>Rozmycie: <input type="number" id="shadowBlur" min="0" max="50" value="5"></label>
      <label>Przesunięcie X: <input type="number" id="shadowOffsetX" min="-50" max="50" value="2"></label>
      <label>Przesunięcie Y: <input type="number" id="shadowOffsetY" min="-50" max="50" value="2"></label>
      <label>Przezroczystość: <input type="number" id="shadowOpacity" min="0" max="1" step="0.1" value="0.5"></label>
    </div>

    <div style="border-top: 1px solid #eee; padding-top: 12px; margin-bottom: 12px;">
      <h4 style="margin:0 0 8px; font-size:14px;">Obrys tekstu</h4>
      <label><input type="checkbox" id="strokeEnabled"> Włącz</label>
      <label>Kolor: <input type="color" id="strokeColor" value="#000000"></label>
      <label>Grubość: <input type="number" id="strokeWidth" min="0" max="10" step="0.5" value="1"></label>
    </div>

    <div style="border-top: 1px solid #eee; padding-top: 12px; margin-bottom: 12px;">
      <h4 style="margin:0 0 8px; font-size:14px;">Tło tekstu</h4>
      <label><input type="checkbox" id="backgroundEnabled"> Włącz</label>
      <label>Kolor: <input type="color" id="backgroundColor" value="#ffff00"></label>
      <label>Padding: <input type="number" id="paddingInput" min="0" max="50" value="5"></label>
      <label>Zaokrąglenie: <input type="number" id="cornerRadiusInput" min="0" max="50" value="5"></label>
    </div>

    <div style="border-top: 1px solid #eee; padding-top: 12px; margin-bottom: 12px;">
      <h4 style="margin:0 0 8px; font-size:14px;">Gradient</h4>
      <label><input type="checkbox" id="gradientEnabled"> Włącz</label>
      <label>Od: <input type="color" id="gradientStart" value="#ff0000"></label>
      <label>Do: <input type="color" id="gradientEnd" value="#0000ff"></label>
    </div>
    
    <div style="display:flex; gap:8px;">
      <button id="applyBtn" style="flex:1; background:#007cba; color:white; border:none; padding:8px; border-radius:6px;">Zastosuj</button>
      <button id="cancelBtn" style="flex:1; background:#f0f0f0; border:1px solid #ccc; padding:8px; border-radius:6px;">Anuluj</button>
    </div>
  `;

  document.body.appendChild(editPanel);
  const panelFontSelect = document.getElementById('fontSelect');
  if (panelFontSelect) {
    repopulateFontSelect(panelFontSelect, panelFontSelect.value || 'Arial');
    panelFontSelect.addEventListener('change', () => applyFontPreviewToSelect(panelFontSelect));
  }
  window.addEventListener('appFontsReady', () => {
    const current = panelFontSelect?.value || 'Arial';
    repopulateFontSelect(panelFontSelect, current);
  });

  document.getElementById('applyBtn').onclick = () => {
    const text = document.getElementById('textInput').value;
    const font = document.getElementById('fontSelect').value;
    const size = parseInt(document.getElementById('sizeInput').value);
    const color = document.getElementById('colorInput').value;
    const bold = document.getElementById('boldInput').checked;
    const italic = document.getElementById('italicInput').checked;
    const underline = document.getElementById('underlineInput').checked;
    const align = document.getElementById('alignSelect').value;
    const lineHeight = parseFloat(document.getElementById('lineHeightInput').value);
    const letterSpacing = parseFloat(document.getElementById('letterSpacingInput').value);

    const shadowEnabled = document.getElementById('shadowEnabled').checked;
    const shadowColor = document.getElementById('shadowColor').value;
    const shadowBlur = parseFloat(document.getElementById('shadowBlur').value);
    const shadowOffsetX = parseFloat(document.getElementById('shadowOffsetX').value);
    const shadowOffsetY = parseFloat(document.getElementById('shadowOffsetY').value);
    const shadowOpacity = parseFloat(document.getElementById('shadowOpacity').value);

    const strokeEnabled = document.getElementById('strokeEnabled').checked;
    const strokeColor = document.getElementById('strokeColor').value;
    const strokeWidth = parseFloat(document.getElementById('strokeWidth').value);

    const backgroundEnabled = document.getElementById('backgroundEnabled').checked;
    const backgroundColor = document.getElementById('backgroundColor').value;
    const padding = parseFloat(document.getElementById('paddingInput').value);
    const cornerRadius = parseFloat(document.getElementById('cornerRadiusInput').value);

    const gradientEnabled = document.getElementById('gradientEnabled').checked;
    const gradientStart = document.getElementById('gradientStart').value;
    const gradientEnd = document.getElementById('gradientEnd').value;

    if (text && currentText) {
      currentText.text(text);
      currentText.fontFamily(font);
      currentText.fontSize(size);
      currentText.fill(color);
      currentText.align(align);
      currentText.lineHeight(lineHeight);
      currentText.letterSpacing(letterSpacing);
      currentText.fontStyle(computeStyle({ bold, italic }));
      currentText.setAttr('underline', underline);

      // Cień
      currentText.shadowEnabled(shadowEnabled);
      if (shadowEnabled) {
        currentText.shadowColor(shadowColor);
        currentText.shadowBlur(shadowBlur);
        currentText.shadowOffsetX(shadowOffsetX);
        currentText.shadowOffsetY(shadowOffsetY);
        currentText.shadowOpacity(shadowOpacity);
      }

      // Obrys
      currentText.strokeEnabled(strokeEnabled);
      if (strokeEnabled) {
        currentText.stroke(strokeColor);
        currentText.strokeWidth(strokeWidth);
      } else {
        currentText.stroke(null);
      }

      // Tło
      currentText.setAttr('backgroundEnabled', backgroundEnabled);
      currentText.setAttr('backgroundColor', backgroundColor);
      currentText.setAttr('padding', padding);
      currentText.setAttr('cornerRadius', cornerRadius);

      // Gradient
      if (gradientEnabled) {
        currentText.fillLinearGradientStartPoint({ x: 0, y: 0 });
        currentText.fillLinearGradientEndPoint({ x: currentText.width(), y: 0 });
        currentText.fillLinearGradientColorStops([0, gradientStart, 1, gradientEnd]);
      } else {
        currentText.fill(color);
      }

      currentLayer.batchDraw();
    }
    editPanel.style.display = 'none';
  };

  document.getElementById('cancelBtn').onclick = () => {
    editPanel.style.display = 'none';
  };

  return editPanel;
}

function showEditPanel(textNode, stage, layer) {
  currentText = textNode;
  currentStage = stage;
  currentLayer = layer;

  const panel = createEditPanel();

  document.getElementById('textInput').value = textNode.text() || '';
  repopulateFontSelect(document.getElementById('fontSelect'), textNode.fontFamily() || 'Arial');
  document.getElementById('sizeInput').value = textNode.fontSize() || 18;
  document.getElementById('colorInput').value = textNode.fill() || '#000000';

  const fontStyle = textNode.fontStyle() || 'normal';
  document.getElementById('boldInput').checked = (fontStyle === 'bold' || fontStyle.includes('bold'));
  document.getElementById('italicInput').checked = (fontStyle === 'italic' || fontStyle.includes('italic'));
  document.getElementById('underlineInput').checked = !!textNode.getAttr('underline');

  document.getElementById('alignSelect').value = textNode.align() || 'left';
  document.getElementById('lineHeightInput').value = textNode.lineHeight() || 1.2;
  document.getElementById('letterSpacingInput').value = textNode.letterSpacing() || 0;

  // Cień
  const shadow = textNode.shadowEnabled();
  document.getElementById('shadowEnabled').checked = shadow;
  document.getElementById('shadowColor').value = textNode.shadowColor() || '#000000';
  document.getElementById('shadowBlur').value = textNode.shadowBlur() || 5;
  document.getElementById('shadowOffsetX').value = textNode.shadowOffsetX() || 2;
  document.getElementById('shadowOffsetY').value = textNode.shadowOffsetY() || 2;
  document.getElementById('shadowOpacity').value = textNode.shadowOpacity() || 0.5;

  // Obrys
  document.getElementById('strokeEnabled').checked = !!textNode.stroke();
  document.getElementById('strokeColor').value = textNode.stroke() || '#000000';
  document.getElementById('strokeWidth').value = textNode.strokeWidth() || 1;

  // Tło
  document.getElementById('backgroundEnabled').checked = !!textNode.getAttr('backgroundEnabled');
  document.getElementById('backgroundColor').value = textNode.getAttr('backgroundColor') || '#ffff00';
  document.getElementById('paddingInput').value = textNode.getAttr('padding') || 5;
  document.getElementById('cornerRadiusInput').value = textNode.getAttr('cornerRadius') || 5;

  // Gradient
  const gradient = textNode.fillLinearGradientColorStops();
  document.getElementById('gradientEnabled').checked = !!gradient;
  if (gradient && gradient.length >= 4) {
    document.getElementById('gradientStart').value = gradient[1];
    document.getElementById('gradientEnd').value = gradient[3];
  }

  panel.style.display = 'block';
}

window.editFontOfText = function(textNode) {
  if (!currentStage || !currentLayer) return;
  showEditPanel(textNode, currentStage, currentLayer);
};

window.openEditPanel = function(textNode, stage) {
  const layer = stage.getChildren()[0];
  showEditPanel(textNode, stage, layer);
};

// === TWORZENIE PANELU EDYCJI STRONY ===
function createPageEditPanel() {
  if (pageEditPanel && pageEditPanel.classList?.contains('imgfx-side-panel')) {
    window.destroyPageEditPanel?.();
  }
  if (pageEditPanel) return pageEditPanel;

  pageEditPanel = document.createElement('div');
  pageEditPanel.className = 'page-edit-panel';

  const palette = ['#000000', '#e53e3e', '#3182ce', '#38a169', '#dd6b20', '#805ad5'].map(c => 
    `<button class="color-preset" data-color="${c}" style="background:${c}; width:24px; height:24px; border:none; border-radius:4px; margin:2px;"></button>`
  ).join('');

  const fonts = getDynamicFonts();
  const fontOptions = fonts.map(f => `<option value="${f}">${f}</option>`).join('');
  const makeStyleSection = (key, title, icon, sizeValue, sizeMax) => `
    <div class="style-section">
      <div class="style-section-head">
        <h4><i class="fas ${icon}"></i><span>${title}</span></h4>
      </div>
      <label><span class="field-label"><i class="fas fa-text-height"></i>Rozmiar</span><input type="number" id="${key}Size" min="8" max="${sizeMax}" value="${sizeValue}"></label>
      <label><span class="field-label"><i class="fas fa-font"></i>Czcionka</span><select id="${key}Font">${fontOptions}</select></label>
      <div class="color-row">
        <input type="color" id="${key}Color" value="#000000">
        <div class="palette">${palette}</div>
      </div>
      <div class="style-checks">
        <label class="style-toggle" title="Pogrubienie" aria-label="Pogrubienie">
          <input type="checkbox" id="${key}Bold">
          <span class="style-toggle-icon style-toggle-icon-bold">B</span>
          <span class="style-toggle-label">Bold</span>
        </label>
        <label class="style-toggle" title="Kursywa" aria-label="Kursywa">
          <input type="checkbox" id="${key}Italic">
          <span class="style-toggle-icon style-toggle-icon-italic">I</span>
          <span class="style-toggle-label">Italic</span>
        </label>
        <label class="style-toggle" title="Podkreślenie" aria-label="Podkreślenie">
          <input type="checkbox" id="${key}Underline">
          <span class="style-toggle-icon style-toggle-icon-underline">U</span>
          <span class="style-toggle-label">Underline</span>
        </label>
      </div>
      <button class="reset-btn" data-type="${key}"><i class="fas fa-rotate-left"></i><span>Przywróć domyślne</span></button>
    </div>
  `;

  pageEditPanel.innerHTML = `
    <div class="pe-header">
      <div class="pe-header-copy">
        <div class="pe-kicker">Page Style</div>
        <div class="pe-title">Ustawienia strony</div>
      </div>
      <button type="button" id="hidePageEditBtn" class="pe-panel-hide-btn" aria-label="Ukryj panel" title="Ukryj panel">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>

    <div class="pe-top-tools">
      <button type="button" id="pagePanelUndoBtn" class="pe-tool-btn" aria-label="Cofnij">
        <i class="fas fa-rotate-left"></i>
        <span>Cofnij</span>
      </button>
      <button type="button" id="pagePanelRedoBtn" class="pe-tool-btn" aria-label="Ponów">
        <i class="fas fa-rotate-right"></i>
        <span>Ponów</span>
      </button>
    </div>

    <div class="pe-section pe-section-compact">
      <div class="pe-section-title"><i class="fas fa-panorama"></i><span>Baner</span></div>
      <div class="pe-row">
        <label class="pe-label">Plik</label>
        <input type="file" id="pageBannerInput" accept="image/*" class="pe-input-file">
      </div>
      <button id="removeBannerBtn" class="pe-btn pe-btn-danger"><i class="fas fa-trash"></i><span>Usuń baner</span></button>
    </div>

    <div class="pe-section">
      <div class="pe-section-title"><i class="fas fa-sterling-sign"></i><span>Waluta ceny</span></div>
      <select id="currencySelect" class="pe-select">
        <option value="GBP" selected>GBP (£)</option>
        <option value="PLN">PLN (zł)</option>
        <option value="EUR">EUR (€)</option>
      </select>
    </div>

    ${makeStyleSection('name', 'Nazwa produktu', 'fa-tag', 14, 30)}
    ${makeStyleSection('index', 'Indeks', 'fa-hashtag', 12, 20)}
    ${makeStyleSection('package', 'Opak. / info', 'fa-box-open', 12, 20)}
    ${makeStyleSection('price', 'Cena', 'fa-badge-dollar', 16, 30)}
    ${makeStyleSection('rating', 'Ranking', 'fa-ranking-star', 12, 20)}

    <div class="apply-scope" id="applyScopeBox">
      <div class="apply-scope-title"><i class="fas fa-layer-group"></i><span>Zakres zastosowania</span></div>
      <label class="apply-scope-row" id="applyScopeRow">
        <input type="checkbox" id="applyToAllPages">
        <span class="apply-scope-text">
          <strong id="applyScopeLabel">Tylko ta strona</strong><br>
          <span class="apply-scope-hint" id="applyScopeHint">Zmiany zostaną zapisane na tej stronie.</span>
        </span>
        <span class="apply-scope-toggle" id="applyScopeToggle" aria-hidden="true"></span>
      </label>
    </div>

    <div class="pe-actions">
      <button id="applyPageEditBtn" class="pe-btn pe-btn-primary"><i class="fas fa-check"></i><span>Zastosuj</span></button>
      <button id="cancelPageEditBtn" class="pe-btn pe-btn-ghost"><i class="fas fa-xmark"></i><span>Anuluj</span></button>
    </div>
    

  `;

  document.body.appendChild(pageEditPanel);
  pageEditPanel.querySelector('#hidePageEditBtn').onclick = () => {
    if (typeof window.hidePageEditPanel === 'function') {
      window.hidePageEditPanel();
    }
  };
  pageEditPanel.querySelector('#pagePanelUndoBtn').onclick = () => {
    if (typeof window.undoProject === "function") window.undoProject();
  };
  pageEditPanel.querySelector('#pagePanelRedoBtn').onclick = () => {
    if (typeof window.redoProject === "function") window.redoProject();
  };
  pageEditPanel.querySelectorAll('.color-preset').forEach(preset => {
    preset.onclick = () => {
      const input = preset.closest('.color-row').querySelector('input[type="color"]');
      input.value = preset.dataset.color;
    };
  });

  pageEditPanel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => updateCheckStyle(cb));
  });

  pageEditPanel.querySelectorAll('.reset-btn').forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      const def = DEFAULT_STYLES[type + 'Style'];
      document.getElementById(type + 'Size').value = def.size;
      document.getElementById(type + 'Font').value = def.fontFamily;
      document.getElementById(type + 'Color').value = def.color;
      const bold = document.getElementById(type + 'Bold');
      const italic = document.getElementById(type + 'Italic');
      const underline = document.getElementById(type + 'Underline');
      bold.checked = def.bold; italic.checked = def.italic; underline.checked = def.underline;
      updateCheckStyle(bold); updateCheckStyle(italic); updateCheckStyle(underline);
    };
  });

  return pageEditPanel;
}

function applyStyle(obj, style) {
  const textDecoration = style.underline ? 'underline' : '';

  // 🔹 jeśli to GROUP (np. cena)
if (obj instanceof Konva.Group) {
  const isPriceGroup = obj.getAttr && obj.getAttr('isPriceGroup');
  const children = obj.getChildren().filter(c => c instanceof Konva.Text);
  children.forEach((child, idx) => {
    // styl TAK, rozmiar NIE
    child.fill(style.color);
    child.fontFamily(style.fontFamily);
    if (isPriceGroup && typeof child.stroke === 'function') {
      const rawStrokeFlag = child.getAttr?.('priceStrokeManaged');
      const hasManagedStrokeFlag = typeof rawStrokeFlag === 'boolean';
      const hasVisibleStroke = !!child.stroke?.() && Number(child.strokeWidth?.() || 0) > 0;
      const shouldKeepStroke = hasManagedStrokeFlag
        ? rawStrokeFlag
        : (hasVisibleStroke && Math.abs(Number(child.strokeWidth?.() || 0) - 2) > 0.01);
      if (shouldKeepStroke) {
        child.stroke(style.color);
      } else {
        child.stroke(null);
      }
    }

    if (isPriceGroup) {
      // tylko główna cena dziedziczy pogrubienie/italic
      const targetStyle = (idx === 0) ? computeStyle(style) : 'normal';
      child.fontStyle(targetStyle);
    } else {
      child.fontStyle(computeStyle(style));
    }

    child.setAttr('underline', style.underline);
    if (typeof child.textDecoration === 'function') child.textDecoration(textDecoration);
  });
  if (isPriceGroup && obj.setAttr) obj.setAttr('priceTextColor', style.color);
  return;
}




  // 🔹 jeśli to zwykły Text
  obj.fontSize(style.size);
  obj.fontFamily(style.fontFamily);
  obj.fill(style.color);
  obj.fontStyle(computeStyle(style));
  obj.setAttr('underline', style.underline);
  if (typeof obj.textDecoration === 'function') obj.textDecoration(textDecoration);
}

function applyStyleToMatchingPageNodes(page, predicate, style) {
  getPageMatchingNodes(page, predicate).forEach((node) => {
    applyStyle(node, style);
  });
}

function isDirectPriceGroupNode(priceGroup) {
  if (!(priceGroup instanceof Konva.Group) || !priceGroup.getAttr) return false;
  const directModuleId = String(priceGroup.getAttr('directModuleId') || '').trim();
  if (directModuleId) return true;
  const parent = typeof priceGroup.getParent === 'function' ? priceGroup.getParent() : null;
  return !!(parent && parent.getAttr && parent.getAttr('isDirectCustomModuleGroup'));
}

function refreshPriceGroupLayout(priceGroup, page) {
  if (!(priceGroup instanceof Konva.Group)) return;

  const textNodes = priceGroup.getChildren().filter((node) => node instanceof Konva.Text);
  const main =
    textNodes.find((node) => node.getAttr && (
      node.getAttr('pricePart') === 'main' || node.getAttr('priceRole') === 'major'
    )) ||
    textNodes[0] ||
    null;
  const dec =
    textNodes.find((node) => node.getAttr && (
      node.getAttr('pricePart') === 'dec' || node.getAttr('priceRole') === 'minor'
    )) ||
    textNodes[1] ||
    null;
  const unit =
    priceGroup.findOne('.priceUnit') ||
    textNodes.find((node) => node.getAttr && (
      node.getAttr('pricePart') === 'unit' ||
      node.getAttr('isPriceUnit') ||
      node.getAttr('priceRole') === 'unit' ||
      node.getAttr('workspaceKind') === 'currencySymbol'
    )) ||
    textNodes[2] ||
    null;

  if (main && dec) {
    const gap = 4;
    if (typeof dec.x === 'function') dec.x((main.width?.() || 0) + gap);
    if (typeof dec.y === 'function') dec.y((main.height?.() || 0) * 0.10);
    if (unit && typeof unit.x === 'function') unit.x((main.width?.() || 0) + gap);
    if (unit && typeof unit.y === 'function') unit.y((dec.height?.() || 0) * 1.5);
  }

  if (isDirectPriceGroupNode(priceGroup)) {
    try {
      window.CustomStyleDirectHooks?.bindDirectPriceGroupEditor?.(priceGroup, page);
    } catch (_e) {}
  }
}

function syncLegacyPageSettingsFromStyles(page, styles, changedTypes = null) {
  if (!page) return;
  if (!page.settings) page.settings = {};
  if (!changedTypes || changedTypes.name) {
    page.settings.nameSize = styles.nameStyle.size;
    page.settings.nameColor = styles.nameStyle.color;
  }
  if (!changedTypes || changedTypes.index) {
    page.settings.indexSize = styles.indexStyle.size;
    page.settings.indexColor = styles.indexStyle.color;
  }
  if (!changedTypes || changedTypes.package) {
    page.settings.packageSize = styles.packageStyle.size;
    page.settings.packageColor = styles.packageStyle.color;
  }
  if (!changedTypes || changedTypes.price) {
    page.settings.priceSize = styles.priceStyle.size;
    page.settings.priceColor = styles.priceStyle.color;
  }
  if (!changedTypes || changedTypes.rating) {
    page.settings.ratingSize = styles.ratingStyle.size;
    page.settings.ratingColor = styles.ratingStyle.color;
  }
}

function applyPageEditStylesToPage(page, styles, selectedCurrency, options = {}) {
  if (!page || page.isCover) return;
  if (!page.settings) page.settings = {};
  const changedTypes = options.changedTypes || {
    name: true,
    index: true,
    package: true,
    price: true,
    rating: true
  };

  if (changedTypes.name) page.settings.nameStyle = normalizeResolvedStyle(styles.nameStyle, DEFAULT_STYLES.nameStyle);
  if (changedTypes.index) page.settings.indexStyle = normalizeResolvedStyle(styles.indexStyle, DEFAULT_STYLES.indexStyle);
  if (changedTypes.package) page.settings.packageStyle = normalizeResolvedStyle(styles.packageStyle, DEFAULT_STYLES.packageStyle);
  if (changedTypes.price) page.settings.priceStyle = normalizeResolvedStyle(styles.priceStyle, DEFAULT_STYLES.priceStyle);
  if (changedTypes.rating) page.settings.ratingStyle = normalizeResolvedStyle(styles.ratingStyle, DEFAULT_STYLES.ratingStyle);
  syncLegacyPageSettingsFromStyles(page, styles, changedTypes);
  page.settings.currency = normalizeCurrencyCode(selectedCurrency);

  if (changedTypes.name) {
    applyStyleToMatchingPageNodes(page, (node) =>
      node instanceof Konva.Text &&
      node.getAttr &&
      node.getAttr('isName'),
    page.settings.nameStyle);
  }

  if (changedTypes.index) {
    applyStyleToMatchingPageNodes(page, (node) =>
      node instanceof Konva.Text &&
      node.getAttr &&
      node.getAttr('isIndex'),
    page.settings.indexStyle);
  }

  if (changedTypes.package) {
    applyStyleToMatchingPageNodes(page, (node) =>
      node instanceof Konva.Text &&
      node.getAttr &&
      node.getAttr('isCustomPackageInfo'),
    page.settings.packageStyle);
  }

  getPageMatchingNodes(page, (node) =>
    node instanceof Konva.Group &&
    node.getAttr &&
    node.getAttr('isPriceGroup')
  ).forEach((priceGroup) => {
    if (changedTypes.price) {
      applyStyle(priceGroup, page.settings.priceStyle);
      applyPriceScale(priceGroup, page.settings.priceStyle.size);
    }
    updatePriceCurrency(priceGroup, selectedCurrency);
    refreshPriceGroupLayout(priceGroup, page);
  });

  if (changedTypes.rating) {
    applyStyleToMatchingPageNodes(page, (node) =>
      node instanceof Konva.Text &&
      node.getAttr &&
      node.getAttr('isRating'),
    page.settings.ratingStyle);
  }

  updateDirectCustomModuleCurrency(page, selectedCurrency);
  page.layer.batchDraw();
  page.transformerLayer?.batchDraw?.();
  if (typeof window.dispatchCanvasModified === 'function') {
    window.dispatchCanvasModified(page.stage, { historyMode: 'immediate', historySource: 'page-edit-apply' });
  } else {
    window.dispatchEvent?.(new CustomEvent('canvasModified', {
      detail: {
        stage: page.stage,
        historyMode: 'immediate',
        historySource: 'page-edit-apply'
      }
    }));
  }
}

window.openPageEdit = function(page) {
  if (!page || page.isCover) return false;
  dismissPageEditBlockingOverlays();
  try {
    window.closeBackgroundSidePanel?.({ restorePageEditor: false, resetToolbarState: true });
  } catch (_e) {}
  if (pageEditPanel && pageEditPanel.classList?.contains('imgfx-side-panel')) {
    window.destroyPageEditPanel?.();
  }
  if (page.stage) {
    document.activeStage = page.stage;
  }
  currentPage = page;
  const panel = createPageEditPanel();
  const closePanel = () => {
    if (typeof window.hidePageEditPanel === 'function') {
      window.hidePageEditPanel();
      return;
    }
    panel.style.display = 'none';
    syncPageEditToggleState(false);
  };


  const bannerInput = document.getElementById('pageBannerInput');
  const applyToAllCheckbox = document.getElementById('applyToAllPages');
  const currencySelect = document.getElementById('currencySelect');
  const applyScopeBox = document.getElementById('applyScopeBox');
  const applyScopeLabel = document.getElementById('applyScopeLabel');
  const applyScopeHint = document.getElementById('applyScopeHint');
  const loadedStyles = {};

  const updateApplyScopeUI = () => {
    const isAll = applyToAllCheckbox.checked;
    if (applyScopeBox) {
      applyScopeBox.classList.toggle('is-all', isAll);
    }
    if (applyScopeLabel) {
      applyScopeLabel.textContent = isAll ? 'Wszystkie strony' : 'Tylko ta strona';
    }
    if (applyScopeHint) {
      applyScopeHint.textContent = isAll
        ? 'Zmiany zostaną zastosowane do wszystkich stron.'
        : 'Zmiany zostaną zapisane na tej stronie.';
    }
  };

  const loadStyle = (type) => {
    const s = resolvePagePanelStyle(page, type);
    loadedStyles[type] = normalizeResolvedStyle(s, DEFAULT_STYLES[type + 'Style'] || DEFAULT_STYLES.nameStyle);
    document.getElementById(type + 'Size').value = s.size;
    document.getElementById(type + 'Font').value = s.fontFamily;
    document.getElementById(type + 'Color').value = s.color;
    const bold = document.getElementById(type + 'Bold');
    const italic = document.getElementById(type + 'Italic');
    const underline = document.getElementById(type + 'Underline');
    bold.checked = s.bold; italic.checked = s.italic; underline.checked = s.underline;
    [bold, italic, underline].forEach(cb => {
      updateCheckStyle(cb);
    });
  };

  ['name', 'index', 'package', 'price', 'rating'].forEach(loadStyle);
  const normalizedCurrency = detectPageCurrency(page);
  currencySelect.value = ['PLN', 'EUR', 'GBP'].includes(normalizedCurrency) ? normalizedCurrency : 'GBP';
  applyToAllCheckbox.checked = false;
  updateApplyScopeUI();

  panel.style.display = 'block';
  syncPageEditLayoutState(true);
  syncPageEditToggleState(true);

  document.getElementById('removeBannerBtn').onclick = () => {
    const targetPage = currentPage && !currentPage.isCover ? currentPage : page;
    const old = targetPage?.layer?.findOne?.(o => o.getAttr('name') === 'banner');
    if (old) {
      old.destroy();
      targetPage.settings.bannerUrl = null;
      targetPage.layer.batchDraw();
    }
  };

  applyToAllCheckbox.onchange = updateApplyScopeUI;

document.getElementById('applyPageEditBtn').onclick = () => {
    const basePage = currentPage && !currentPage.isCover ? currentPage : page;
    const applyToAll = applyToAllCheckbox.checked;
    const targetPages = applyToAll ? pages : [basePage];
    const selectedCurrency = currencySelect.value;

    const newStyles = {
      nameStyle: {
        size: parseInt(document.getElementById('nameSize').value),
        fontFamily: document.getElementById('nameFont').value,
        color: document.getElementById('nameColor').value,
        bold: document.getElementById('nameBold').checked,
        italic: document.getElementById('nameItalic').checked,
        underline: document.getElementById('nameUnderline').checked
      },
    
      indexStyle: {
        size: parseInt(document.getElementById('indexSize').value),
        fontFamily: document.getElementById('indexFont').value,
        color: document.getElementById('indexColor').value,
        bold: document.getElementById('indexBold').checked,
        italic: document.getElementById('indexItalic').checked,
        underline: document.getElementById('indexUnderline').checked
      },

      packageStyle: {
        size: parseInt(document.getElementById('packageSize').value),
        fontFamily: document.getElementById('packageFont').value,
        color: document.getElementById('packageColor').value,
        bold: document.getElementById('packageBold').checked,
        italic: document.getElementById('packageItalic').checked,
        underline: document.getElementById('packageUnderline').checked
      },
    
      priceStyle: {
        size: parseInt(document.getElementById('priceSize').value),
        fontFamily: document.getElementById('priceFont').value,
        color: document.getElementById('priceColor').value,
        bold: document.getElementById('priceBold').checked,
        italic: document.getElementById('priceItalic').checked,
        underline: document.getElementById('priceUnderline').checked
      },
    
      ratingStyle: {
        size: parseInt(document.getElementById('ratingSize').value),
        fontFamily: document.getElementById('ratingFont').value,
        color: document.getElementById('ratingColor').value,
        bold: document.getElementById('ratingBold').checked,
        italic: document.getElementById('ratingItalic').checked,
        underline: document.getElementById('ratingUnderline').checked
      },
};

    const changedTypes = {
      name: !areResolvedStylesEqual(loadedStyles.name, newStyles.nameStyle),
      index: !areResolvedStylesEqual(loadedStyles.index, newStyles.indexStyle),
      package: !areResolvedStylesEqual(loadedStyles.package, newStyles.packageStyle),
      price: !areResolvedStylesEqual(loadedStyles.price, newStyles.priceStyle),
      rating: !areResolvedStylesEqual(loadedStyles.rating, newStyles.ratingStyle)
    };


    targetPages.forEach(p => {
      applyPageEditStylesToPage(p, newStyles, selectedCurrency, { changedTypes });
    });


      
      
      // === BANER — BEZ ZMIAN ===
      if (bannerInput.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
          Konva.Image.fromURL(e.target.result, img => {
            const referencePage = currentPage && !currentPage.isCover ? currentPage : page;
            const scale = Math.min(referencePage.stage.width() / img.width(), 113 / img.height());
            img.scale({ x: scale, y: scale });
            img.x(0);
            img.y(0);
            img.setAttr("name", "banner");
            img.draggable(true);
      
            targetPages.forEach(p => {
              if (p.isCover) return;
      
              const old = p.layer.findOne(n => n.getAttr("name") === "banner");
              if (old) old.destroy();
      
              p.layer.add(img.clone());
              p.layer.batchDraw();
            });
          });
        };
        reader.readAsDataURL(bannerInput.files[0]);
      }
    };

    // === Anuluj zmiany (nie dotykamy pudełek) ===
    document.getElementById('cancelPageEditBtn').onclick = () => {
      closePanel();
    };
  return true;
};

// === EDYCJA ZDJĘĆ ===
function showImageOptions(img, page) {
  const oldMenu = document.querySelector('.image-edit-menu');
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement('div');
  menu.className = 'image-edit-menu';
  menu.style.cssText = `
    position: absolute;
    top: ${img.y() + img.height() * img.scaleY() / 2}px;
    left: ${img.x() + img.width() * img.scaleX() / 2}px;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    padding: 10px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: Arial, sans-serif;
    font-size: 13px;
    min-width: 140px;
  `;

  menu.innerHTML = `
    <button class="edit-btn replace-btn">Zamień zdjęcie</button>
    <button class="edit-btn add-btn">Dodaj kolejne</button>
    <button class="edit-btn remove-btn" style="color: #e53e3e;">Usuń</button>
  `;

  document.body.appendChild(menu);

  const closeMenu = (e) => {
    if (!menu.contains(e.target) && e.target !== img) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);

  menu.querySelector('.replace-btn').onclick = (e) => { e.stopPropagation(); replaceImage(img, page); menu.remove(); };
  menu.querySelector('.add-btn').onclick = (e) => { e.stopPropagation(); addAnotherImage(page, img.x() + img.width() * img.scaleX() + 20, img.y()); menu.remove(); };
  menu.querySelector('.remove-btn').onclick = (e) => { e.stopPropagation(); img.destroy(); page.layer.batchDraw(); menu.remove(); };
}

function replaceImage(oldImg, page) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      Konva.Image.fromURL(ev.target.result, (newImg) => {
        newImg.x(oldImg.x()); newImg.y(oldImg.y());
        newImg.rotation(oldImg.rotation());
        newImg.scaleX(oldImg.scaleX()); newImg.scaleY(oldImg.scaleY());
        newImg.draggable(true); newImg.listening(true);
        oldImg.destroy();
        page.layer.add(newImg);
        page.layer.batchDraw();
      });
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function addAnotherImage(page, x, y) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      Konva.Image.fromURL(ev.target.result, (newImg) => {
        const maxHeight = 120;
        const scale = Math.min(maxHeight / newImg.height(), 1);
        newImg.x(x); newImg.y(y);
        newImg.scaleX(scale); newImg.scaleY(scale);
        newImg.draggable(true); newImg.listening(true);
        page.layer.add(newImg);
        page.layer.batchDraw();
      });
    };
    reader.readAsDataURL(file);
  };
  input.click();
}
function applyPriceScale(priceGroup, priceSize) {
  if (!(priceGroup instanceof Konva.Group)) return;

  const BASE_SIZE = 24;

  const scale = priceSize / BASE_SIZE;

  priceGroup.scaleX(scale);
  priceGroup.scaleY(scale);
}

function getCurrencySymbolByCode(currency) {
  const normalized = normalizeCurrencyCode(currency);
  if (normalized === 'EUR') return '€';
  if (normalized === 'GBP') return '£';
  return 'zł';
}

function fitCurrencyTextNodeToContent(node) {
  if (!(node instanceof Konva.Text)) return;
  const text = String(node.text?.() || '');
  if (!text) return;
  const measured = typeof node.measureSize === 'function' ? node.measureSize(text) : null;
  const padding = Math.max(0, Number(node.padding?.() || 0));
  const strokeWidth = Math.max(0, Number(node.strokeWidth?.() || 0));
  const minWidth = Math.max(12, Math.ceil(Number(measured?.width || 0) + padding * 2 + strokeWidth + 2));
  if (typeof node.width !== 'function') return;
  const currentWidth = Number(node.width() || 0);
  if (!Number.isFinite(currentWidth) || currentWidth < minWidth) {
    node.width(minWidth);
  }
}

function isPriceUnitLikeTextNode(node) {
  if (!(node instanceof Konva.Text)) return false;
  const text = String(node.text?.() || '').trim();
  const normalizedText = text.toUpperCase();
  if (node.getAttr && (
    node.getAttr('isCustomPackageInfo') ||
    node.getAttr('workspaceKind') === 'packageText'
  )) {
    return false;
  }
  if (/^\s*OPAK(?:OWANIE)?\b/i.test(text)) return false;
  if (node.getAttr && (
    node.getAttr('pricePart') === 'unit' ||
    node.getAttr('isPriceUnit') ||
    node.getAttr('priceRole') === 'unit' ||
    node.getAttr('workspaceKind') === 'currencySymbol'
  )) {
    return true;
  }
  if (!text) return false;
  if (/^[£€$]$/i.test(text) || /^zł$/i.test(text)) return true;
  if (/\/\s*(SZT|KG)\.?/i.test(text)) return true;
  return /^(?:SZT|KG)\.?$/i.test(normalizedText);
}

function updateStandaloneCurrencyTextNode(node, symbol) {
  if (!(node instanceof Konva.Text)) return;
  const safeSymbol = String(symbol || '').trim() || '£';
  const text = String(node.text?.() || '').trim();
  if (!text) {
    node.text(safeSymbol);
    fitCurrencyTextNodeToContent(node);
    return;
  }
  if (!text.includes('/')) {
    node.text(safeSymbol);
    fitCurrencyTextNodeToContent(node);
    return;
  }
  const slashIndex = text.indexOf('/');
  const unitPart = slashIndex >= 0 ? text.slice(slashIndex).trim() : '';
  node.text(unitPart ? `${safeSymbol} ${unitPart}` : safeSymbol);
  fitCurrencyTextNodeToContent(node);
}

function updatePriceCurrency(priceGroup, currency) {
  if (!(priceGroup instanceof Konva.Group)) return;

  const unit =
    priceGroup.findOne('.priceUnit') ||
    (priceGroup.find((node) => isPriceUnitLikeTextNode(node))[0] || null);
  if (!unit) return false;

  const symbol = getCurrencySymbolByCode(currency);
  updateStandaloneCurrencyTextNode(unit, symbol);
  return true;
}

function updateCatalogEntryCurrencyForSlot(page, slotIndex, currencyCode, currencySymbol) {
  if (!Number.isFinite(slotIndex) || slotIndex < 0) return;
  if (!Array.isArray(page?.products) || !page.products[slotIndex]) return;
  page.products[slotIndex].PRICE_CURRENCY_SYMBOL = currencySymbol;
  page.products[slotIndex].PRICE_CURRENCY_CODE = currencyCode;
}

function readPageEditSlotAttrIndex(node, attrName) {
  if (!node || typeof node.getAttr !== 'function') return null;
  const raw = node.getAttr(attrName);
  if (raw === null || raw === undefined || raw === '') return null;
  const slotIndex = Number(raw);
  return Number.isFinite(slotIndex) && slotIndex >= 0 ? slotIndex : null;
}

function resolveSlotIndexFromNode(node) {
  let current = node;
  while (current) {
    const slotIndex = readPageEditSlotAttrIndex(current, 'slotIndex');
    if (Number.isFinite(slotIndex)) return slotIndex;
    current = typeof current.getParent === 'function' ? current.getParent() : null;
  }
  return null;
}

function resolveDirectSlotIndexFromNode(node) {
  let current = node;
  while (current) {
    const slotIndex = readPageEditSlotAttrIndex(current, 'slotIndex');
    if (Number.isFinite(slotIndex)) return slotIndex;
    const preservedSlotIndex = readPageEditSlotAttrIndex(current, 'preservedSlotIndex');
    if (Number.isFinite(preservedSlotIndex)) return preservedSlotIndex;
    current = typeof current.getParent === 'function' ? current.getParent() : null;
  }
  return null;
}

function normalizeDirectRebuildSlots(slotIndexes) {
  return Array.from(new Set(
    (Array.isArray(slotIndexes) ? slotIndexes : [])
      .map((slotIndex) => Number(slotIndex))
      .filter((slotIndex) => Number.isFinite(slotIndex) && slotIndex >= 0)
  ));
}

function queueDirectCurrencyRebuild(page, slotIndexes) {
  const uniqueSlots = normalizeDirectRebuildSlots(slotIndexes);
  if (!page || !uniqueSlots.length) return;
  if (typeof window.CustomStyleDirectHooks?.rebuildDirectModuleLayoutsOnPage !== 'function') return;

  const pendingKey = uniqueSlots.join(',');
  if (String(page._pendingDirectCurrencyRebuildKey || '')) {
    page._nextDirectCurrencyRebuildSlots = normalizeDirectRebuildSlots([
      ...(Array.isArray(page._nextDirectCurrencyRebuildSlots) ? page._nextDirectCurrencyRebuildSlots : []),
      ...uniqueSlots
    ]);
    return;
  }
  page._pendingDirectCurrencyRebuildKey = pendingKey;
  page._pendingDirectCurrencyRebuildSlots = uniqueSlots.slice();

  Promise.resolve(window.CustomStyleDirectHooks.rebuildDirectModuleLayoutsOnPage(page, {
    slotIndexes: uniqueSlots
  }))
    .then((rebuilt) => {
      if (!(Number(rebuilt) > 0)) return;
      page.layer?.batchDraw?.();
      page.transformerLayer?.batchDraw?.();
      if (typeof window.dispatchCanvasModified === 'function') {
        window.dispatchCanvasModified(page.stage, {
          historyMode: 'immediate',
          historySource: 'page-edit-currency-rebuild'
        });
      } else {
        window.dispatchEvent?.(new CustomEvent('canvasModified', {
          detail: {
            stage: page.stage,
            historyMode: 'immediate',
            historySource: 'page-edit-currency-rebuild'
          }
        }));
      }
    })
    .catch(() => {})
    .finally(() => {
      if (String(page._pendingDirectCurrencyRebuildKey || '') === pendingKey) {
        page._pendingDirectCurrencyRebuildKey = '';
        page._pendingDirectCurrencyRebuildSlots = [];
      }
      const queuedSlots = normalizeDirectRebuildSlots(page._nextDirectCurrencyRebuildSlots);
      page._nextDirectCurrencyRebuildSlots = [];
      if (queuedSlots.length) {
        queueDirectCurrencyRebuild(page, queuedSlots);
      }
    });
}

function updateDirectCustomModuleCurrency(page, currency) {
  if (!page || !page.layer || typeof page.layer.find !== 'function') return;

  const normalizedCurrency = normalizeCurrencyCode(currency);
  const nextSymbol = getCurrencySymbolByCode(normalizedCurrency);
  const updatedDirectSlots = new Set();
  const directNodes = page.layer.find((node) => {
    if (!node?.getAttr) return false;
    if (node.getAttr('isDirectCustomModuleGroup')) return true;
    return !!String(node.getAttr('directModuleId') || '').trim();
  }) || [];
  const directNodeList = Array.isArray(directNodes)
    ? directNodes
    : (typeof directNodes.toArray === 'function' ? directNodes.toArray() : Array.from(directNodes));
  const directSlotIndexes = Array.from(new Set(
    directNodeList
      .map((node) => resolveDirectSlotIndexFromNode(node))
      .filter((slotIndex) => Number.isFinite(slotIndex) && slotIndex >= 0)
  ));
  directSlotIndexes.forEach((slotIndex) => {
    updateCatalogEntryCurrencyForSlot(page, slotIndex, normalizedCurrency, nextSymbol);
  });
  const directPriceGroups = page.layer.find((node) => {
    if (!(node instanceof Konva.Group)) return false;
    if (!node.getAttr || !node.getAttr('isPriceGroup')) return false;
    const directModuleId = String(node.getAttr('directModuleId') || '').trim();
    if (directModuleId) return true;
    const parent = typeof node.getParent === 'function' ? node.getParent() : null;
    return !!(parent && parent.getAttr && parent.getAttr('isDirectCustomModuleGroup'));
  });

  directPriceGroups.forEach((priceGroup) => {
    const updated = updatePriceCurrency(priceGroup, normalizedCurrency);
    refreshPriceGroupLayout(priceGroup, page);
    const slotIndex = resolveDirectSlotIndexFromNode(priceGroup);
    updateCatalogEntryCurrencyForSlot(page, slotIndex, normalizedCurrency, nextSymbol);
    if (updated && Number.isFinite(slotIndex) && slotIndex >= 0) {
      updatedDirectSlots.add(slotIndex);
    }
  });

  const standaloneCurrencyNodes = page.layer.find((node) => {
    if (!(node instanceof Konva.Text)) return false;
    if (!node.getAttr || node.getAttr('workspaceKind') !== 'currencySymbol') return false;
    const parent = typeof node.getParent === 'function' ? node.getParent() : null;
    return !(parent && parent.getAttr && parent.getAttr('isPriceGroup'));
  });

  standaloneCurrencyNodes.forEach((node) => {
    node.text(nextSymbol);
    fitCurrencyTextNodeToContent(node);
    const slotIndex = resolveDirectSlotIndexFromNode(node);
    updateCatalogEntryCurrencyForSlot(page, slotIndex, normalizedCurrency, nextSymbol);
    if (Number.isFinite(slotIndex) && slotIndex >= 0) {
      updatedDirectSlots.add(slotIndex);
    }
  });

  const standaloneUnitNodes = page.layer.find((node) => {
    if (!(node instanceof Konva.Text)) return false;
    if (!node.getAttr) return false;
    const parent = typeof node.getParent === 'function' ? node.getParent() : null;
    if (parent && parent.getAttr && parent.getAttr('isPriceGroup')) return false;
    const isDirectNode =
      !!String(node.getAttr('directModuleId') || '').trim() ||
      !!(parent && parent.getAttr && parent.getAttr('isDirectCustomModuleGroup'));
    if (!isDirectNode) return false;
    return isPriceUnitLikeTextNode(node);
  });

  standaloneUnitNodes.forEach((node) => {
    updateStandaloneCurrencyTextNode(node, nextSymbol);
    const slotIndex = resolveDirectSlotIndexFromNode(node);
    updateCatalogEntryCurrencyForSlot(page, slotIndex, normalizedCurrency, nextSymbol);
    if (Number.isFinite(slotIndex) && slotIndex >= 0) {
      updatedDirectSlots.add(slotIndex);
    }
  });

  const slotsNeedingRebuild = directSlotIndexes.filter((slotIndex) => !updatedDirectSlots.has(slotIndex));
  if (slotsNeedingRebuild.length) {
    queueDirectCurrencyRebuild(page, slotsNeedingRebuild);
  }
}


// === INICJALIZACJA + KLUCZOWA ZMIANA: edytowalny każdy tekst z isEditable ===
document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('canvasCreated', (e) => {
    const stage = e.detail;
    const page = pages.find(p => p.stage === stage);
    if (!page) return;

    stage.on('dblclick', (e) => {
      const node = e.target;

      currentStage = stage;
      currentLayer = stage.getChildren()[0];

      // KLUCZOWA ZMIANA: edytujemy KAŻDY tekst z isEditable, isProductText lub isRating
      if (node instanceof Konva.Text) {
        if (
          node.getAttr('isEditable') === true ||
          node.getAttr('isProductText') === true ||
          node.getAttr('isRating') === true
        ) {
          window.openEditPanel(node, stage);
        }
      }

      // ⛔ Wyłączone menu kontekstowe dla obrazów (niepotrzebne)
    });
  });
});

document.addEventListener('click', (e) => {
  if (editPanel && !editPanel.contains(e.target) && !e.target.classList.contains('konvajs-content')) {
    editPanel.style.display = 'none';
  }
});

const style = document.createElement('style');
style.textContent = `
  .page-edit-panel {
    position: fixed;
    top: 92px;
    right: 28px;
    width: 344px;
    max-width: calc(100vw - 28px);
    min-width: 0;
    bottom: 28px;
    max-height: none;
    overflow: auto;
    background: linear-gradient(180deg, rgba(14, 19, 31, 0.98) 0%, rgba(9, 14, 24, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    box-shadow: -20px 0 40px rgba(0, 0, 0, 0.32);
    z-index: 10000;
    font-family: "Inter", "Segoe UI", Arial, sans-serif;
    font-size: 13px;
    display: none;
    padding: 10px 10px 24px 10px;
    backdrop-filter: blur(12px);
  }
  .pe-header {
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding-bottom: 12px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .pe-header-copy { min-width: 0; display: block; }
  .pe-kicker { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #7f8aa0; margin-bottom: 4px; }
  .pe-title { font-size: 18px; font-weight: 800; color: #f5f7fb; letter-spacing: -0.02em; }
  .pe-panel-hide-btn {
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
  .pe-top-tools {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 8px;
  }
  .pe-tool-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 11px;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(24, 34, 54, 0.92) 0%, rgba(16, 22, 35, 0.98) 100%);
    color: #e8edf6;
    font-weight: 700;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 22px rgba(0,0,0,0.18);
  }
  .pe-tool-btn i { color: #a8b4c9; }
  .pe-tool-btn span { letter-spacing: -0.01em; }
  .pe-tool-btn:hover {
    background: rgba(39,203,173,0.12);
    border-color: rgba(39,203,173,0.24);
    color: #8df5e2;
  }
  .pe-panel-hide-btn:hover {
    background: rgba(39,203,173,0.12);
    border-color: rgba(39,203,173,0.28);
    color: #8df5e2;
  }
  .pe-section { border: 1px solid rgba(255, 255, 255, 0.08); background: linear-gradient(180deg, rgba(19, 27, 42, 0.88) 0%, rgba(12, 18, 30, 0.94) 100%); padding: 12px; border-radius: 16px; margin-bottom: 10px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
  .pe-section-compact { background: linear-gradient(180deg, rgba(20, 29, 46, 0.94) 0%, rgba(12, 18, 30, 0.98) 100%); }
  .pe-section-title { font-weight: 800; color: #f5f7fb; margin-bottom: 10px; font-size: 15px; display: flex; align-items: center; gap: 10px; letter-spacing: -0.02em; }
  .pe-section-title i { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; background: rgba(62, 195, 173, 0.12); color: #63e6d3; }
  .pe-row { display: grid; grid-template-columns: 74px 1fr; gap: 8px; align-items: center; margin-bottom: 8px; }
  .pe-label { font-weight: 700; color: #d8e0ee; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
  .pe-input-file { width: 100%; color: #d8e0ee; }
  .pe-select { width: 100%; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: linear-gradient(90deg, rgba(31, 39, 56, 0.96) 0%, rgba(26, 33, 49, 0.96) 100%); color: #f5f7fb; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
  .pe-btn { padding: 10px 12px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px; letter-spacing: -0.01em; }
  .pe-btn-primary { background: linear-gradient(135deg, #24b5a2 0%, #2ad0bf 100%); color: #07110f; }
  .pe-btn-ghost { background: linear-gradient(180deg, rgba(28, 36, 54, 0.94) 0%, rgba(17, 24, 39, 0.98) 100%); border-color: rgba(255,255,255,0.08); color: #f5f7fb; }
  .pe-btn-danger { background: #e11d48; color: #fff; border: none; }
  .pe-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; position: sticky; bottom: 0; background: linear-gradient(180deg, rgba(14,19,31,0) 0%, rgba(14,19,31,0.96) 18%, rgba(14,19,31,0.98) 100%); padding-top: 10px; padding-bottom: 10px; }

  .style-section { border: 1px solid rgba(255,255,255,0.08); padding: 14px; margin-bottom: 12px; border-radius: 18px; background: linear-gradient(180deg, rgba(18, 26, 40, 0.92) 0%, rgba(11, 18, 30, 0.98) 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 14px 28px rgba(0,0,0,0.18); }
  .style-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .style-section h4 { margin: 0; font-size: 18px; color: #f5f7fb; display: flex; align-items: center; gap: 10px; letter-spacing: -0.02em; }
  .style-section h4 i { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; background: linear-gradient(180deg, rgba(58, 168, 255, 0.18) 0%, rgba(39, 203, 173, 0.12) 100%); color: #7bdfff; font-size: 13px; }
  .style-section label { display: block; margin: 8px 0; color: #a9b5c8; font-size: 11px; }
  .field-label { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; font-weight: 800; color: #9fb0c8; text-transform: uppercase; letter-spacing: 0.08em; }
  .field-label i { color: #5ec9ff; font-size: 11px; }
  .style-section input[type="number"], .style-section select { width: 100%; padding: 10px 12px; margin-top: 0; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(90deg, rgba(31, 39, 56, 0.96) 0%, rgba(26, 33, 49, 0.96) 100%); color: #f5f7fb; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
  .color-row { display: flex; align-items: center; gap: 10px; margin: 10px 0 12px; }
  .color-row input[type="color"] { width: 52px; height: 40px; padding: 3px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(25, 34, 50, 0.95) 0%, rgba(17, 25, 39, 0.98) 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
  .palette { display: flex; flex-wrap: wrap; width: 162px; gap: 8px; }
  .color-preset { box-shadow: 0 6px 14px rgba(0,0,0,0.18); border: 2px solid rgba(255,255,255,0.08) !important; border-radius: 10px !important; }
  .style-checks { display: flex; gap: 8px; margin: 8px 0 6px; flex-wrap: wrap; }
  .style-toggle {
    min-width: 54px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0 10px;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.16s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
    background: linear-gradient(180deg, rgba(25, 34, 52, 0.94) 0%, rgba(17, 23, 36, 0.98) 100%);
    color: #cdd7e7;
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 6px 14px rgba(0,0,0,0.12);
  }
  .style-toggle:hover {
    background: linear-gradient(180deg, rgba(31, 42, 63, 0.96) 0%, rgba(20, 28, 44, 0.98) 100%);
    border-color: rgba(94, 201, 255, 0.28);
    color: #f5f7fb;
    transform: translateY(-1px);
  }
  .style-toggle input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
  }
  .style-toggle-icon {
    pointer-events: none;
    font-size: 18px;
    line-height: 1;
    letter-spacing: -0.04em;
    color: inherit;
    font-family: Georgia, "Times New Roman", serif;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
  }
  .style-toggle-icon-bold { font-weight: 800; font-family: Inter, "Segoe UI", Arial, sans-serif; }
  .style-toggle-icon-italic { font-style: italic; font-weight: 600; transform: translateX(1px); }
  .style-toggle-icon-underline {
    text-decoration: underline;
    text-decoration-thickness: 1.5px;
    text-underline-offset: 2px;
    font-weight: 700;
    font-family: Inter, "Segoe UI", Arial, sans-serif;
  }
  .style-toggle-label {
    display: none;
    pointer-events: none;
  }
  .style-toggle.is-active {
    background: linear-gradient(180deg, #d8ff1f 0%, #bff211 100%);
    border-color: rgba(216, 255, 31, 0.92);
    color: #081014;
    box-shadow:
      0 0 0 1px rgba(216, 255, 31, 0.42),
      0 0 12px rgba(216, 255, 31, 0.36),
      0 0 24px rgba(216, 255, 31, 0.22),
      inset 0 1px 0 rgba(255,255,255,0.24);
  }
  .reset-btn { margin-top: 8px; font-size: 11px; padding: 8px 10px; background: linear-gradient(180deg, rgba(26, 34, 50, 0.94) 0%, rgba(17, 24, 39, 0.98) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #f5f7fb; display: inline-flex; align-items: center; gap: 8px; }
  .reset-btn:hover { background: rgba(255,255,255,0.08); }
  .apply-scope { border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(18, 26, 40, 0.92) 0%, rgba(11, 18, 30, 0.98) 100%); padding: 14px; border-radius: 18px; margin: 12px 0; }
  .apply-scope-title { font-size: 14px; font-weight: 800; color: #f5f7fb; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
  .apply-scope-title i { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; background: rgba(216,255,31,0.12); color: #d8ff1f; font-size: 12px; }
  .apply-scope-row { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; cursor: pointer; }
  .apply-scope-row input { margin-top: 2px; }
  .apply-scope-hint { display: inline-block; font-size: 12px; color: #93a0b5; margin-top: 2px; }
  .apply-scope-text { line-height: 1.2; color: #d8e0ee; }
  .apply-scope-toggle { width: 44px; height: 24px; border-radius: 999px; background: rgba(255,255,255,0.14); position: relative; transition: background 0.2s; }
  .apply-scope-toggle::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: #fff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: transform 0.2s; }
  .apply-scope.is-all { border-color: rgba(39,203,173,0.24); background: rgba(39,203,173,0.08); }
  .apply-scope.is-all .apply-scope-title { color: #8df5e2; }
  .apply-scope.is-all .apply-scope-toggle { background: #24b5a2; }
  .apply-scope.is-all .apply-scope-toggle::after { transform: translateX(20px); }
  #undoRedoControls { display: none !important; }
  @media (max-width: 700px) {
    .page-edit-panel { left: 8px; right: 8px; top: 72px; width: auto; min-width: 0; bottom: 76px; border-radius: 18px; border-right: 1px solid rgba(255,255,255,0.08); }
    .pe-row { grid-template-columns: 1fr; }
    .pe-actions { grid-template-columns: 1fr; }
    .pe-top-tools { grid-template-columns: 1fr 1fr; }
  }
`;
document.head.appendChild(style);//dziala

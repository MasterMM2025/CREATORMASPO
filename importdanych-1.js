// ========================================================================
// importdanych-1.js – OSTATECZNA, PIĘKNA WERSJA 2025 – JAK CANVA
// Ikony wyrównania z SVG, zero błędów, działa idealnie!
// ========================================================================

Konva.listenClickTap = true;
let currentFolder = "PHOTO PNG/BANNERS";
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
// ===== LAZY LOAD ELEMENTÓW (SIDEBAR) =====
let elementsAllItems = [];
let elementsRenderIndex = 0;
let elementsFilteredItems = [];
const ELEMENTS_BATCH_SIZE = 24;
let elementsLoading = false;
let elementsLazyObserver = null;
let elementsPendingRows = [];
let elementsUrlWorkersActive = 0;
let elementsSearchDebounce = null;
let elementsScrollRaf = 0;

// === AUTO-CROP — usuwa przezroczyste marginesy z PNG ===
function autoCropKonvaImage(kImg) {
    const w = kImg.width();
    const h = kImg.height();

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(kImg.image(), 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h).data;

    let minX = w, minY = h, maxX = 0, maxY = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const alpha = imgData[i + 3];
            if (alpha > 10) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }

    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;

    kImg.crop({
        x: minX,
        y: minY,
        width: cropWidth,
        height: cropHeight
    });

    kImg.width(cropWidth);
    kImg.height(cropHeight);
}


// ⭐⭐⭐ DODAJ TO TUTAJ ⭐⭐⭐
function markAsEditable(node) {
    node.setAttr("isEditable", true);
    node.setAttr("isDesignElement", true);
    node.setAttr("isSelectable", true);
    node.setAttr("isDraggable", true);

    node.draggable(true);
    node.listening(true);

    // Dla PNG z dużą przezroczystością: hit-test tylko po nieprzezroczystych pikselach.
    // Dzięki temu duży "niewidzialny" prostokąt nie blokuje klikania elementów pod spodem.
    if (window.Konva && node instanceof window.Konva.Image) {
      try {
        if (typeof node.hitFunc === "function") {
          // Usuń ewentualny prostokątny hitFunc ustawiony wcześniej.
          node.hitFunc(undefined);
        }
        if (typeof node.clearCache === "function") node.clearCache();
        if (typeof node.cache === "function") node.cache({ pixelRatio: 1 });
        if (typeof node.drawHitFromCache === "function") node.drawHitFromCache(12);
        node.setAttr("alphaHitTest", true);
      } catch (_e) {}
    }
}

let loadSessionId = 0;
const ELEMENTS_URL_CACHE = new Map(); // storage fullPath -> downloadURL
const ELEMENTS_FOLDER_ITEMS_CACHE = new Map(); // folderPath -> StorageReference[]
const ELEMENTS_URL_CONCURRENCY = 8;
let addTextMode = false;
let addImageMode = false;
let addPSDMode = false;

function normalizeVariantPayloadLocal(value) {
  if (typeof window.normalizeImageVariantPayload === "function") {
    return window.normalizeImageVariantPayload(value);
  }
  const src = String(value || "").trim();
  return { original: src, editor: src, thumb: src };
}

function variantSrcLocal(variants, kind = "editor") {
  if (typeof window.getImageVariantSource === "function") {
    return window.getImageVariantSource(variants, kind);
  }
  const payload = normalizeVariantPayloadLocal(variants);
  if (kind === "original") return payload.original || payload.editor || payload.thumb || "";
  if (kind === "thumb") return payload.thumb || payload.editor || payload.original || "";
  return payload.editor || payload.original || payload.thumb || "";
}

async function getImageVariantsFromSourceLocal(src, cacheKeyPrefix = "sidebar-src") {
  const safeSrc = String(src || "").trim();
  if (!safeSrc) return normalizeVariantPayloadLocal("");
  if (typeof window.createImageVariantsFromSource === "function") {
    try {
      return await window.createImageVariantsFromSource(safeSrc, {
        cacheKey: `${cacheKeyPrefix}:${safeSrc}`,
        thumbMaxEdge: 128,
        editorMaxEdge: 560
      });
    } catch (_e) {}
  }
  return normalizeVariantPayloadLocal(safeSrc);
}

async function getImageVariantsFromFileLocal(file, cacheKeyPrefix = "sidebar-file") {
  if (typeof window.createImageVariantsFromFile === "function") {
    try {
      return await window.createImageVariantsFromFile(file, {
        cacheKey: `${cacheKeyPrefix}:${file?.name || "file"}:${file?.size || 0}:${file?.lastModified || 0}`,
        thumbMaxEdge: 128,
        editorMaxEdge: 560
      });
    } catch (_e) {}
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(normalizeVariantPayloadLocal(String(reader.result || "")));
    reader.onerror = () => reject(new Error("image_read_error"));
    reader.readAsDataURL(file);
  });
}


// ====================== SIDEBAR – PRZYCISKI ======================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {

      const title = item.getAttribute('title');

      if (title === 'Import PSD') enableAddPSDMode();

      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      if (title === 'Dodaj tekst') enableAddTextMode();
      if (title === 'Dodaj zdjęcia') enableAddImageMode();
      // 🔥 🔥 🔥 DODAJ TO:
      if (title === 'BANNERS') {
          currentFolder = "PHOTO PNG/BANNERS";
          openElementsPanel();
          loadFirebaseFolder(currentFolder);
      }
      if (title === 'FOOD') {
          currentFolder = "PHOTO PNG/FOOD";
          openElementsPanel();
          loadFirebaseFolder(currentFolder);
      }
      if (title === 'COUNTRY') {
    currentFolder = "PHOTO PNG/COUNTRY";
    openElementsPanel();
    loadFirebaseFolder(currentFolder);
}


    });
  });
});

// Udostępnij tryby globalnie (fallback)
window.__sidebarModuleBound = true;
window.enableAddTextMode = enableAddTextMode;
window.enableAddImageMode = enableAddImageMode;



function isWithinPageArea(x, y) {
  return x >= 0 && x <= 794 && y >= 0 && y <= 1123;
}

// ====================== DODAJ TEKST Z SIDEBARU ======================
function enableAddTextMode() {
  if (addTextMode || addImageMode) return;
  addTextMode = true;
  pages.forEach(page => {
    const c = page.stage.container();
    c.style.outline = '2px solid #00c4b4';
    c.style.outlineOffset = '2px';
    c.style.cursor = 'text';
    const handler = e => {
      if (!addTextMode || e.evt.button !== 0) return;
      const pos = page.stage.getPointerPosition();
      if (pos && isWithinPageArea(pos.x, pos.y)) {
        addTextAtPosition(page, pos.x, pos.y);
      }
      addTextMode = false;
      disableAddTextMode();
    };
    page.stage.on('mousedown.textmode', handler);
    page._textHandler = handler;
  });
}

function disableAddTextMode() {
  pages.forEach(page => {
    const c = page.stage.container();
    c.style.outline = c.style.outlineOffset = '';
    c.style.cursor = 'default';
    if (page._textHandler) {
      page.stage.off('mousedown.textmode', page._textHandler);
      page._textHandler = null;
    }
  });
}

function addTextAtPosition(page, x, y) {
  const fitSidebarTextBounds = (node) => {
    if (!node || typeof node.getTextWidth !== "function") return;
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
    const lineCount = Math.max(1, lines.length);
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
  };

  const text = new Konva.Text({
    text: "Kliknij, aby edytować",
    x, y, fontSize: 18,
    fill: "#000000", fontFamily: "Arial", align: "left",
    verticalAlign: "middle", draggable: true, isSidebarText: true,
    _originalText: "Kliknij, aby edytować"
  });
  fitSidebarTextBounds(text);
  text.x(x - text.width() / 2);
  text.y(y - text.height() / 2);
  page.layer.add(text);
  page.layer.batchDraw();
  if (typeof enableEditableText === "function") {
    enableEditableText(text, page);
  } else {
    text.on('dblclick', (e) => {
      e.cancelBubble = true;
      openTextEditor(text);
    });
  }


}

// ====================== DODAJ ZDJĘCIE ======================
function enableAddImageMode() {
  if (addTextMode || addImageMode) return;
  addImageMode = true;
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGM0YjQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBhdGggZD0iTTE3IDEzaC0xLjVMMTAuMjUgNy43NWEuNzUuNzUgMCAwIDAtMS4wNiAwTDQgMTMiLz48L3N2Zz4=';
  img.onload = () => {
    const cursor = `url(${img.src}) 12 12, crosshair`;
    pages.forEach(page => {
      const c = page.stage.container();
      c.style.outline = '2px solid #00c4b4';
      c.style.outlineOffset = '2px';
      c.style.cursor = cursor;
      const handler = e => {
        if (!addImageMode || e.evt.button !== 0) return;
        const pos = page.stage.getPointerPosition();
        if (pos && isWithinPageArea(pos.x, pos.y)) openImagePickerAtPosition(page, pos.x, pos.y);
        addImageMode = false;
        disableAddImageMode();
      };
      page.stage.on('mousedown.imagemode', handler);
      page._imageHandler = handler;
    });
  };
}

function disableAddImageMode() {
  pages.forEach(page => {
    const c = page.stage.container();
    c.style.outline = c.style.outlineOffset = '';
    c.style.cursor = 'default';
    if (page._imageHandler) {
      page.stage.off('mousedown.imagemode', page._imageHandler);
      page._imageHandler = null;
    }
  });
}

function openImagePickerAtPosition(page, x, y) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let variants = null;
    try {
      variants = await getImageVariantsFromFileLocal(file, "sidebar-manual");
    } catch (_e) {
      return;
    }
    const editorSrc = variantSrcLocal(variants, "editor");
    const originalSrc = variantSrcLocal(variants, "original") || editorSrc;
    const thumbSrc = variantSrcLocal(variants, "thumb") || editorSrc;
    if (!editorSrc) return;

    Konva.Image.fromURL(editorSrc, img => {
      if (!img) return;
      if (typeof window.applyImageVariantsToKonvaNode === "function") {
        window.applyImageVariantsToKonvaNode(img, {
          original: originalSrc,
          editor: editorSrc,
          thumb: thumbSrc
        });
      } else {
        img.setAttr("originalSrc", originalSrc);
        img.setAttr("editorSrc", editorSrc);
        img.setAttr("thumbSrc", thumbSrc);
      }

      // 🔥 duże zdjęcie, ładne jak w Canva
      const maxSize = 500;  // możesz zmienić na 800 jeśli chcesz

      const s = Math.min(maxSize / img.width(), maxSize / img.height(), 1);


      img.setAttrs({
        x: x - img.width() * s / 2,
        y: y - img.height() * s / 2,
        scaleX: s,
        scaleY: s,
        draggable: true,
        listening: true,

        // 🔥 ULTRA WAŻNE — pozwala odróżnić od tła/koloru strony
        isSidebarImage: true,
        isDesignElement: true,
        isEditable: true,
        isSelectable: true,
        isDraggable: true,
        isPageBg: false,
        name: "design-image"
      });

      markAsEditable(img);
      if (img.hitStrokeWidth) img.hitStrokeWidth(20);

      page.layer.add(img);
      page.layer.batchDraw();
    });
  };
  input.click();
}
function enableAddPSDMode() {
  if (addPSDMode || addTextMode || addImageMode) return;
  addPSDMode = true;

  const cursor = "copy";

  pages.forEach(page => {
    const c = page.stage.container();
    c.style.outline = '2px solid #00c4b4';
    c.style.outlineOffset = '2px';
    c.style.cursor = cursor;

    const handler = e => {
      if (!addPSDMode || e.evt.button !== 0) return;

      const pos = page.stage.getPointerPosition();
      if (pos && isWithinPageArea(pos.x, pos.y)) {
        openPSDPickerAtPosition(page, pos.x, pos.y);
      }

      addPSDMode = false;
      disableAddPSDMode();
    };

    page.stage.on('mousedown.psdmode', handler);
    page._psdHandler = handler;
  });
}
function openPSDPickerAtPosition(page, x, y) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.psd';

  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const psd = await PSD.fromURL(URL.createObjectURL(file));

    psd.parse();
    const layers = psd.tree().descendants();

    layers.forEach(layer => {
      if (layer.isGroup() || !layer.layer.visible) return;

      const png = layer.toPng();
      if (!png) return;

      const img = new Image();
      img.src = png.src;

      img.onload = () => {
        Konva.Image.fromURL(img.src, (node) => {
          node.x(x);
          node.y(y);
          node.draggable(true);
          node.setAttrs({
            isProductImage: true,
            isPSDLayer: true
          });

          page.layer.add(node);
          page.layer.batchDraw();
        });
      };
    });

    alert("Zaimportowano warstwy PSD 🎉");
  };

  input.click();
}

function disableAddPSDMode() {
  pages.forEach(page => {
    const c = page.stage.container();
    c.style.outline = c.style.outlineOffset = '';
    c.style.cursor = 'default';

    if (page._psdHandler) {
      page.stage.off('mousedown.psdmode', page._psdHandler);
      page._psdHandler = null;
    }
  });
}

// ====================== PIĘKNY PANEL Z IKONAMI JAK W CANVA ======================
const panel = document.createElement("div");
panel.id = "textEditorPanel";
panel.style.cssText = `
  position:fixed;right:20px;top:80px;width:340px;padding:22px;background:#fff;
  border-radius:20px;box-shadow:0 15px 50px rgba(0,0,0,0.22);display:none;z-index:99999;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  border:1px solid #e0e0e0;background:#fff;
`;
panel.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
    <h3 style="margin:0;color:#00c4b4;font-size:21px;font-weight:600;">Edytuj tekst</h3>
    <button id="teClose" style="background:none;border:none;font-size:26px;cursor:pointer;color:#999;">×</button>
  </div>

  <textarea id="teContent" placeholder="Wpisz tekst..." style="width:100%;height:110px;padding:14px;border:1px solid #ddd;border-radius:14px;
    font-size:16px;resize:none;background:#fff;box-shadow:inset 0 2px 8px rgba(0,0,0,0.06);margin-bottom:18px;"></textarea>

  <div style="margin-bottom:18px;">
    <label style="display:block;margin-bottom:8px;font-weight:600;color:#333;font-size:14px;">Czcionka</label>
    <select id="teFont" style="width:100%;padding:12px;border-radius:12px;border:1px solid #ddd;background:#fff;font-size:15px;">
      <option value="Arial">Arial</option>
      <option value="Helvetica">Helvetica</option>
      <option value="Georgia">Georgia</option>
      <option value="Times New Roman">Times New Roman</option>
      <option value="Courier New">Courier New</option>
      <option value="Verdana">Verdana</option>
      <option value="Trebuchet MS">Trebuchet MS</option>
      <option value="Impact">Impact</option>
      <option value="Comic Sans MS">Comic Sans MS</option>
      <option value="Google Sans Flex">Google Sans Flex</option>
    </select>
  </div>

  <div style="display:flex;gap:14px;margin-bottom:20px;">
    <div style="flex:1;">
      <label style="display:block;margin-bottom:8px;font-weight:600;color:#333;font-size:14px;">Kolor</label>
      <input type="color" id="teColor" value="#000000" style="width:100%;height:50px;border-radius:12px;border:none;cursor:pointer;">
    </div>
    <div style="width:100px;">
      <label style="display:block;margin-bottom:8px;font-weight:600;color:#333;font-size:14px;">Rozmiar</label>
      <input type="number" id="teSize" value="18" min="8" max="200" style="width:100%;padding:10px;border-radius:12px;border:1px solid #ddd;text-align:center;font-size:15px;">
    </div>
  </div>

  <div style="margin:24px 0;">
    <label style="display:block;margin-bottom:14px;font-weight:600;color:#333;font-size:15px;">Wyrównanie</label>
    <div style="display:flex;gap:16px;justify-content:center;">
      <button id="teAlignLeft"   class="icon-btn" data-align="left">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
      </button>
      <button id="teAlignCenter" class="icon-btn active" data-align="center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="5" y1="12" x2="19" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
      </button>
      <button id="teAlignRight"  class="icon-btn" data-align="right">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
  </div>

  <div style="margin:24px 0;">
    <label style="display:block;margin-bottom:14px;font-weight:600;color:#333;font-size:15px;">Styl tekstu</label>
    <div style="display:flex;gap:16px;justify-content:center;">
      <button id="teBold"      class="icon-btn">B</button>
      <button id="teItalic"    class="icon-btn">I</button>
      <button id="teUnderline" class="icon-btn">U</button>
      <button id="teUppercase" class="icon-btn">A→A</button>
    </div>
  </div>

  <div style="display:flex;gap:14px;">
    <button id="teApply" style="flex:1;background:#00c4b4;color:white;padding:14px;border:none;border-radius:14px;font-weight:600;font-size:16px;cursor:pointer;box-shadow:0 6px 18px rgba(0,196,180,0.3);">Zastosuj</button>
    <button id="teCancel" style="flex:1;background:#ff4757;color:white;padding:14px;border:none;border-radius:14px;font-weight:600;font-size:16px;cursor:pointer;">Anuluj</button>
  </div>
`;
document.body.appendChild(panel);
const teFontSelect = document.getElementById("teFont");
if (teFontSelect) {
  repopulateFontSelect(teFontSelect, teFontSelect.value || "Arial");
  teFontSelect.addEventListener("change", () => applyFontPreviewToSelect(teFontSelect));
}
window.addEventListener("appFontsReady", () => {
  const current = teFontSelect?.value || "Arial";
  repopulateFontSelect(teFontSelect, current);
});

// STYLE – TYLKO RAZ!
const customStyle = document.createElement('style');
customStyle.textContent = `
  .icon-btn {
    width: 58px;
    height: 58px;
    border-radius: 16px;
    border: none;
    background: #f8f9fa;
    color: #333;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.25s;
    box-shadow: 0 4px 14px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon-btn:hover { background:#e9ecef; transform: translateY(-2px); }
  .icon-btn:active { transform: translateY(1px); }
  .icon-btn.active {
    background: #00c4b4 !important;
    color: white !important;
    box-shadow: 0 8px 25px rgba(0,196,180,0.5);
  }
  .icon-btn svg { pointer-events: none; }
`;

document.head.appendChild(customStyle);

let currentNode = null;
let backupAttrs = null;

function openTextEditor(node) {
  currentNode = node;
  backupAttrs = { ...node.attrs };
  if (!node._originalText) node._originalText = node.text();

  panel.style.display = "block";

  document.getElementById("teContent").value = node._originalText || node.text();
  repopulateFontSelect(document.getElementById("teFont"), node.fontFamily() || "Arial");
  document.getElementById("teColor").value = node.fill() || "#000000";
  document.getElementById("teSize").value = node.fontSize() || 18;

  // Aktualizacja przycisków
  const s = node.fontStyle() || "";
  const d = node.textDecoration() || "";
  const upper = node.text() === node.text().toUpperCase() && node.text() !== "";
  const align = node.align() || "center";

  document.getElementById("teBold").classList.toggle("active", s.includes("bold"));
  document.getElementById("teItalic").classList.toggle("active", s.includes("italic"));
  document.getElementById("teUnderline").classList.toggle("active", d.includes("underline"));
  document.getElementById("teUppercase").classList.toggle("active", upper);

  document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
  document.getElementById("teAlign" + align.charAt(0).toUpperCase() + align.slice(1)).classList.add('active');
}

// Żywe podglądy
document.getElementById("teContent").oninput = e => {
  if (!currentNode) return;
  currentNode._originalText = e.target.value;
  const txt = document.getElementById("teUppercase").classList.contains("active")
    ? e.target.value.toUpperCase()
    : e.target.value;
  currentNode.text(txt);
  currentNode.getLayer().batchDraw();
};
document.getElementById("teFont").onchange = e => {
  applyFontPreviewToSelect(e.target);
  currentNode?.fontFamily(e.target.value);
  currentNode?.getLayer().batchDraw();
};
document.getElementById("teColor").oninput = e => currentNode?.fill(e.target.value) && currentNode.getLayer().batchDraw();
document.getElementById("teSize").oninput = e => currentNode?.fontSize(+e.target.value) && currentNode.getLayer().batchDraw();

// Przyciski stylu + wyrównanie + uppercase
["teBold","teItalic","teUnderline","teUppercase"].forEach(id => {
  document.getElementById(id).onclick = () => {
    if (!currentNode) return;
    if (id === "teUppercase") {
      const ta = document.getElementById("teContent");
      const active = !document.getElementById(id).classList.contains("active");
      document.getElementById(id).classList.toggle("active");
      currentNode.text(active ? ta.value.toUpperCase() : (currentNode._originalText || ""));
    } else {
      const prop = id === "teBold" ? "fontStyle" : id === "teItalic" ? "fontStyle" : "textDecoration";
      const val = id === "teBold" ? "bold" : id === "teItalic" ? "italic" : "underline";
      const cur = currentNode[prop]() || "";
      const newVal = cur.includes(val) ? cur.replace(val,"").trim() : (cur + " " + val).trim();
      currentNode[prop](newVal);
      document.getElementById(id).classList.toggle("active");
    }
    currentNode.getLayer().batchDraw();
  };
});

// Wyrównanie – ikony SVG
document.querySelectorAll('[id^="teAlign"]').forEach(btn => {
  btn.onclick = () => {
    if (!currentNode) return;
    const align = btn.dataset.align;
    currentNode.align(align);
    document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentNode.getLayer().batchDraw();
  };
});

// OK / Anuluj / Zamknij
document.getElementById("teClose").onclick = 
document.getElementById("teCancel").onclick = () => {
  if (currentNode && backupAttrs) {
    currentNode.setAttrs(backupAttrs);
    currentNode.getLayer().batchDraw();
  }
  panel.style.display = "none";
  currentNode = null;
};

document.getElementById("teApply").onclick = () => {
  if (currentNode) currentNode._originalText = document.getElementById("teContent").value;
  panel.style.display = "none";
  currentNode = null;
};
// ========================================================================
// PANEL ELEMENTÓW – JAK W CANVA
// ========================================================================

const elementsPanel = document.createElement('div');
elementsPanel.id = "elementsPanel";
const ELEMENTS_PANEL_LEFT_OPEN = 130;
const ELEMENTS_PANEL_WIDTH = 380;
const ELEMENTS_PANEL_LEFT_CLOSED = -(ELEMENTS_PANEL_WIDTH + 20);
const ELEMENTS_TOGGLE_LEFT_OPEN = ELEMENTS_PANEL_LEFT_OPEN + ELEMENTS_PANEL_WIDTH - 10;
elementsPanel.style.cssText = `
transition: left 0.25s ease;
  position: fixed;
  left: ${ELEMENTS_PANEL_LEFT_OPEN}px;
  top: 60px;
  width: ${ELEMENTS_PANEL_WIDTH}px;
  height: calc(100vh - 80px);
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
  overflow-y: auto;
  overflow-x: hidden;
  display: none;
  z-index: 99999;
  padding: 20px;
  box-sizing: border-box;
  font-family: 'Inter', sans-serif;
`;

elementsPanel.innerHTML = `
  <h3 style="font-size:18px;color:#00c4b4;font-weight:600;margin-bottom:12px;">Elementy</h3>

  <input type="text" id="searchElements" placeholder="Wyszukaj elementy"
    style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #ddd;font-size:15px;margin-bottom:15px;">

  <!-- 🔥 ZAKŁADKI -->
  <div id="elementsTabs" style="display:flex; gap:10px; margin-bottom:12px;">
    <button class="tabBtn active" data-folder="PHOTO PNG/BANNERS">BANNERS-PNG</button>
<button class="tabBtn" data-folder="PHOTO PNG/FOOD">FOOD-PNG</button>
<button class="tabBtn" data-folder="PHOTO PNG/COUNTRY">COUNTRY-PNG</button>

  </div>

  <!-- KONTENER NA ELEMENTY -->
  <div id="elementsContainer" 
    style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%;overflow-x:hidden;"></div>
`;
const btnStyle = document.createElement("style");
btnStyle.textContent = `
  .tabBtn {
    flex: 1;
    padding: 6px 8px;        /* MNIEJSZE WEWNĘTRZNE ODSUNIECIE */
    background: #f2f2f2;
    border: none;
    border-radius: 8px;      /* MNIEJSZE ZAOKRĄGLENIE */
    font-size: 13px;         /* MNIEJSZA CZCIONKA */
    font-weight: 600;
    cursor: pointer;
    transition: 0.25s ease;
    height: 32px;            /* MNIEJSZA WYSOKOŚĆ CAŁKOWITA */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tabBtn:hover {
    background: #e6e6e6;
  }

  .tabBtn.active {
    background: #00c4b4;
    color: white;
    box-shadow: 0 3px 10px rgba(0,196,180,0.35);
    transform: translateY(-1px);
  }

  .elementTile {
    width: 100%;
    height: 80px;
    border-radius: 10px;
    border: 2px solid transparent;
    background: #fff;
    position: relative;
    overflow: hidden;
    cursor: grab;
    transition: 0.2s;
    box-sizing: border-box;
  }
  .elementTile:active {
    cursor: grabbing;
  }

  .elementTile.is-selected {
    border-color: #00c4b4;
  }

  .elementSkeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, #efefef 0%, #f7f7f7 45%, #efefef 100%);
    background-size: 220% 100%;
    animation: elementShimmer 1.2s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes elementShimmer {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }
`;

document.head.appendChild(btnStyle);


document.body.appendChild(elementsPanel);
// OBSŁUGA ZAKŁADEK
document.querySelectorAll('.tabBtn').forEach(btn => {
  btn.addEventListener('click', () => {

    document.querySelectorAll('.tabBtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentFolder = btn.dataset.folder;   // 🔥 zapamiętaj wybraną zakładkę

    loadFirebaseFolder(currentFolder);     // 🔥 wczytaj odpowiedni folder
  });
});
const searchElementsInput = document.getElementById('searchElements');
if (searchElementsInput) {
  searchElementsInput.addEventListener('input', () => {
    if (elementsSearchDebounce) clearTimeout(elementsSearchDebounce);
    elementsSearchDebounce = setTimeout(() => {
      loadFirebaseFolder(currentFolder);
    }, 140);
  });
}

const toggleBtn = document.createElement('button');
toggleBtn.id = 'toggleElementsPanel';
toggleBtn.innerHTML = '⟨';
toggleBtn.style.cssText = `
  position: fixed;
  left: ${ELEMENTS_TOGGLE_LEFT_OPEN}px;
  top: 50%;
  transform: translateY(-50%);
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 0 10px 10px 0;
  width: 34px;
  height: 70px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,0.1);
  z-index: 100000;
  transition: all 0.25s ease;
  font-size: 18px;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
`;
document.body.appendChild(toggleBtn)
toggleBtn.style.display = 'none';
function openElementsPanel() {
  const panel = document.getElementById('elementsPanel');

  panel.style.display = "block";
  elementsPanel.style.left = `${ELEMENTS_PANEL_LEFT_OPEN}px`; // wysuwa panel
  toggleBtn.style.display = "flex";
  toggleBtn.style.left = `${ELEMENTS_TOGGLE_LEFT_OPEN}px`;
  toggleBtn.innerHTML = "⟨";

  panelVisible = true;
}
// === 🔥 Funkcja otwierająca panel elementów z czyszczeniem zawartości ===
function showElementsPanel() {
    const panel = document.getElementById('elementsPanel');
    const container = document.getElementById('elementsContainer');

    // usuń stare miniatury zanim zaczniesz ładować nowe
    container.innerHTML = "";

    panel.style.display = "block";
    elementsPanel.style.left = `${ELEMENTS_PANEL_LEFT_OPEN}px`;

    toggleBtn.style.display = "flex";
    toggleBtn.style.left = `${ELEMENTS_TOGGLE_LEFT_OPEN}px`;
    toggleBtn.innerHTML = "⟨";

    panelVisible = true;
}



let panelVisible = false;
elementsPanel.style.left = `${ELEMENTS_PANEL_LEFT_CLOSED}px`;
toggleBtn.style.left = '0px';
toggleBtn.innerHTML = '⟩';

toggleBtn.addEventListener('click', () => {
  // 🔹 Przełącz widoczność panelu
  panelVisible = !panelVisible;

  if (panelVisible) {
    // === POKAŻ PANEL ===
    elementsPanel.style.left = `${ELEMENTS_PANEL_LEFT_OPEN}px`;
    toggleBtn.style.left = `${ELEMENTS_TOGGLE_LEFT_OPEN}px`;
    toggleBtn.innerHTML = '⟨';
  } else {
    // === SCHOWAJ PANEL ===
    elementsPanel.style.left = `${ELEMENTS_PANEL_LEFT_CLOSED}px`;
    toggleBtn.style.left = '0px';
    toggleBtn.innerHTML = '⟩';
    
    // 🔥 Po krótkiej animacji (0.3s) ukryj przycisk całkowicie
    setTimeout(() => {
      toggleBtn.style.display = 'none';
    }, 300);
  }
});

let firebaseStorageApi = null;
let storage = null;
let firebaseStorageApiPromise = null;

async function ensureFirebaseStorageReady() {
  if (firebaseStorageApi && storage) return firebaseStorageApi;
  if (!firebaseStorageApiPromise) {
    firebaseStorageApiPromise = (async () => {
      const api = window.firebaseStorageExports || await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js");
      const getStorageFn = api?.getStorage;
      const refFn = api?.ref;
      const listAllFn = api?.listAll;
      const getDownloadURLFn = api?.getDownloadURL;
      if (
        typeof getStorageFn !== "function" ||
        typeof refFn !== "function" ||
        typeof listAllFn !== "function" ||
        typeof getDownloadURLFn !== "function"
      ) {
        throw new Error("Brak API Firebase Storage.");
      }
      storage = getStorageFn(undefined, "gs://pdf-creator-f7a8b.firebasestorage.app");
      firebaseStorageApi = {
        ref: refFn,
        listAll: listAllFn,
        getDownloadURL: getDownloadURLFn
      };
      return firebaseStorageApi;
    })();
  }
  try {
    return await firebaseStorageApiPromise;
  } catch (err) {
    firebaseStorageApiPromise = null;
    throw err;
  }
}



const addElementBtn = document.getElementById('addElementBtn');
addElementBtn.addEventListener('click', async () => {
  const panel = document.getElementById('elementsPanel');
  
  // Przełącz widoczność panelu
  const nowVisible = panel.style.display !== 'block';
  panel.style.display = nowVisible ? 'block' : 'none';

  if (nowVisible) {
    // Pokaż przycisk schowania gdy panel się pojawia
    toggleBtn.style.display = 'flex';
    panelVisible = true;
    elementsPanel.style.left = `${ELEMENTS_PANEL_LEFT_OPEN}px`;
    toggleBtn.style.left = `${ELEMENTS_TOGGLE_LEFT_OPEN}px`;
    toggleBtn.innerHTML = '⟨';
    await loadFirebaseFolder(currentFolder);
  } else {
    // Schowaj panel i przycisk
    toggleBtn.style.display = 'none';
    elementsPanel.style.left = `${ELEMENTS_PANEL_LEFT_CLOSED}px`;
  }
});


async function loadFirebaseFolder(folderPath) {
  const container = document.getElementById('elementsContainer');
  const searchInput = document.getElementById('searchElements');
  if (!container) return;
  let storageApi = null;
  try {
    storageApi = await ensureFirebaseStorageReady();
  } catch (err) {
    container.innerHTML = '<p style="color:#c62828;font-size:13px;">Nie udało się połączyć z Firebase Storage.</p>';
    console.error("Firebase Storage init error:", err);
    return;
  }

  const mySession = ++loadSessionId;
  const renderSkeletons = (count = 12) => {
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const tile = document.createElement("div");
      tile.className = "elementTile";
      const skeleton = document.createElement("div");
      skeleton.className = "elementSkeleton";
      tile.appendChild(skeleton);
      fragment.appendChild(tile);
    }
    container.appendChild(fragment);
  };

  renderSkeletons(12);

  let items = ELEMENTS_FOLDER_ITEMS_CACHE.get(folderPath) || null;
  if (!items) {
    const folderRef = storageApi.ref(storage, folderPath);
    const result = await storageApi.listAll(folderRef);
    items = Array.isArray(result?.items) ? result.items : [];
    ELEMENTS_FOLDER_ITEMS_CACHE.set(folderPath, items);
  }

  if (mySession !== loadSessionId) return;

  const query = String(searchInput?.value || "").trim().toLowerCase();
  elementsAllItems = Array.isArray(items) ? items.slice() : [];
  elementsFilteredItems = query
    ? elementsAllItems.filter((item) => String(item?.name || "").toLowerCase().includes(query))
    : elementsAllItems.slice();

  elementsRenderIndex = 0;
  elementsLoading = false;
  elementsPendingRows = [];
  elementsUrlWorkersActive = 0;

  if (elementsLazyObserver) {
    try { elementsLazyObserver.disconnect(); } catch (_e) {}
  }
  elementsLazyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const img = entry.target;
      if (!img) return;
      if (mySession !== loadSessionId) {
        elementsLazyObserver.unobserve(img);
        return;
      }
      if (!entry.isIntersecting) return;
      const src = img.dataset.src || "";
      if (!src) return;
      if (img.dataset.loaded === "1") {
        elementsLazyObserver.unobserve(img);
        return;
      }
      img.dataset.loaded = "1";
      img.src = src;
      elementsLazyObserver.unobserve(img);
    });
  }, { root: elementsPanel, rootMargin: "120px 0px", threshold: 0.01 });

  container.innerHTML = "";

  const createTile = (item, url) => {
    const tile = document.createElement('div');
    tile.className = 'elementTile';
    tile.title = item?.name || "";
    tile.draggable = true;

    const skeleton = document.createElement('div');
    skeleton.className = 'elementSkeleton';
    tile.appendChild(skeleton);

    const img = document.createElement('img');
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    img.loading = "lazy";
    if (url) {
      const fullSrc = String(url || "").trim();
      img.dataset.fullsrc = fullSrc;
      let previewSrc = fullSrc;
      if (typeof window.getImageVariantsFromCache === "function") {
        const cached = window.getImageVariantsFromCache(fullSrc);
        const cachedThumb = variantSrcLocal(cached, "thumb");
        if (cachedThumb) {
          previewSrc = cachedThumb;
          img.dataset.thumbready = "1";
        }
      }
      img.dataset.src = previewSrc;
    }
    img.dataset.loaded = "0";
    img.style.cssText = `
      display:block;
      opacity:0;
      width:100%;
      height:80px;
      object-fit:contain;
      border-radius:8px;
      user-select:none;
      transition: opacity .18s ease;
      pointer-events: none;
    `;
    img.addEventListener('load', () => {
      skeleton.style.display = 'none';
      img.style.opacity = '1';
      const fullSrc = String(img.dataset.fullsrc || img.dataset.src || "").trim();
      if (
        fullSrc &&
        img.dataset.thumbready !== "1" &&
        typeof window.createImageVariantsFromSource === "function"
      ) {
        window.createImageVariantsFromSource(fullSrc, {
          cacheKey: `elements-thumb:${fullSrc}`
        }).then((variants) => {
          const thumbSrc = variantSrcLocal(variants, "thumb");
          if (!thumbSrc || thumbSrc === fullSrc) return;
          img.dataset.thumbready = "1";
          img.dataset.src = thumbSrc;
          if (img.isConnected) {
            img.src = thumbSrc;
          }
        }).catch(() => {});
      }
    });
    img.addEventListener('error', () => {
      img.dataset.loaded = "0";
      skeleton.style.display = 'block';
      img.style.opacity = '0';
    });

    tile.addEventListener('dragstart', e => {
      if (mySession !== loadSessionId) return;
      const dragUrl = img.dataset.fullsrc || img.dataset.src || "";
      if (!dragUrl) {
        e.preventDefault();
        return;
      }
      document.querySelectorAll('#elementsContainer .elementTile')
        .forEach(i => i.classList.remove('is-selected'));
      tile.classList.add('is-selected');
      e.dataTransfer.setData('image-url', dragUrl);
      e.dataTransfer.effectAllowed = "copy";
    });
    tile.addEventListener('click', () => {
      if (mySession !== loadSessionId) return;
      const selectedUrl = img.dataset.fullsrc || img.dataset.src || "";
      if (!selectedUrl) return;
      document.querySelectorAll('#elementsContainer .elementTile')
        .forEach(i => i.classList.remove('is-selected'));
      tile.classList.add('is-selected');
      document.body.style.cursor = 'crosshair';
      enablePageClickForImage(selectedUrl);
    });

    tile.appendChild(img);
    if (url) elementsLazyObserver.observe(img);
    return { tile, img, item, cacheKey: item.fullPath || item.name };
  };

  const pumpUrlWorkers = () => {
    while (
      mySession === loadSessionId &&
      elementsUrlWorkersActive < ELEMENTS_URL_CONCURRENCY &&
      elementsPendingRows.length
    ) {
      elementsUrlWorkersActive += 1;
      (async () => {
        while (mySession === loadSessionId && elementsPendingRows.length) {
          const row = elementsPendingRows.shift();
          if (!row) continue;
          if (row.img.dataset.src) {
            elementsLazyObserver.observe(row.img);
            continue;
          }
          try {
            const url = await storageApi.getDownloadURL(row.item);
            if (mySession !== loadSessionId) return;
            if (!url) continue;
            ELEMENTS_URL_CACHE.set(row.cacheKey, url);
            row.img.dataset.fullsrc = url;
            let previewSrc = url;
            if (typeof window.getImageVariantsFromCache === "function") {
              const cached = window.getImageVariantsFromCache(url);
              const thumbSrc = variantSrcLocal(cached, "thumb");
              if (thumbSrc) {
                previewSrc = thumbSrc;
                row.img.dataset.thumbready = "1";
              }
            }
            row.img.dataset.src = previewSrc;
            elementsLazyObserver.observe(row.img);
          } catch (err) {
            console.warn("⚠️ Nie udało się pobrać miniatury:", row.item?.fullPath || row.item?.name, err);
          }
        }
      })().finally(() => {
        elementsUrlWorkersActive = Math.max(0, elementsUrlWorkersActive - 1);
        if (mySession === loadSessionId && elementsPendingRows.length) {
          pumpUrlWorkers();
        }
      });
    }
  };

  const renderNextBatch = () => {
    if (mySession !== loadSessionId || elementsLoading) return;
    if (elementsRenderIndex >= elementsFilteredItems.length) return;
    elementsLoading = true;
    const batch = elementsFilteredItems.slice(elementsRenderIndex, elementsRenderIndex + ELEMENTS_BATCH_SIZE);
    elementsRenderIndex += batch.length;

    const fragment = document.createDocumentFragment();
    const rowsMissingUrl = [];
    batch.forEach((item) => {
      const cacheKey = item.fullPath || item.name;
      const cachedUrl = ELEMENTS_URL_CACHE.get(cacheKey) || "";
      const row = createTile(item, cachedUrl);
      fragment.appendChild(row.tile);
      if (!cachedUrl) rowsMissingUrl.push(row);
    });
    container.appendChild(fragment);
    if (rowsMissingUrl.length) {
      elementsPendingRows.push(...rowsMissingUrl);
      pumpUrlWorkers();
    }
    elementsLoading = false;
  };

  window.renderNextElementsBatch = renderNextBatch;
  renderNextBatch();
  renderNextBatch();

  if (!elementsFilteredItems.length) {
    container.innerHTML = query
      ? '<p style="color:#777;font-size:14px;">Brak wyników wyszukiwania.</p>'
      : '<p style="color:#777;font-size:14px;">Brak elementów w tym folderze.</p>';
  }
  return;

}



// ====== 4️⃣ Kliknij na stronę po wybraniu obrazka ======
function enablePageClickForImage(url) {
  pages.forEach(page => {
    const c = page.stage.container();

    const handler = async (e) => {
      const pos = page.stage.getPointerPosition();
      if (!pos) return;
      const variants = await getImageVariantsFromSourceLocal(url, "sidebar-firebase");
      const editorSrc = variantSrcLocal(variants, "editor");
      const originalSrc = variantSrcLocal(variants, "original") || editorSrc;
      const thumbSrc = variantSrcLocal(variants, "thumb") || editorSrc;
      if (!editorSrc) return;

      Konva.Image.fromURL(editorSrc, kImg => {
        if (!kImg) return;
        if (typeof window.applyImageVariantsToKonvaNode === "function") {
          window.applyImageVariantsToKonvaNode(kImg, {
            original: originalSrc,
            editor: editorSrc,
            thumb: thumbSrc
          });
        } else {
          kImg.setAttr("originalSrc", originalSrc);
          kImg.setAttr("editorSrc", editorSrc);
          kImg.setAttr("thumbSrc", thumbSrc);
        }

        // 🔥 USTAWIAMY ROZMIAR TYLKO DLA OBRAZÓW Z FIREBASE
        const maxSize = 250; // możesz zmienić np. 200–300 px

        const scale = Math.min(
          maxSize / kImg.width(),
          maxSize / kImg.height(),
          1
        );


        kImg.setAttrs({
          x: pos.x - (kImg.width() * scale) / 2,
          y: pos.y - (kImg.height() * scale) / 2,
          scaleX: scale,
          scaleY: scale,
        });

        kImg.setAttrs({
          isDesignElement: true,
          isEditable: true,
          isSelectable: true,
          isDraggable: true,
          isPageBg: false,   // 🔥 KLUCZOWE
          name: "design-image"
        });

        markAsEditable(kImg);
        kImg.hitStrokeWidth(20);


        page.layer.add(kImg);
        kImg.zIndex(10);

        page.layer.batchDraw();
      });



      // reset po kliknięciu
      document.body.style.cursor = 'default';
      document.querySelectorAll('#elementsContainer .elementTile')
        .forEach(i => i.classList.remove('is-selected'));
      pages.forEach(pg => pg.stage.off('mousedown.addimage'));
    };

    // aktywuj tryb kliknięcia
    page.stage.on('mousedown.addimage', handler);
  });
}

// =========================================================
// GLOBALNY DRAG & DROP – DZIAŁAJĄCY ZAWSZE (jak Canva)
// =========================================================

// przeciąganie musi być dozwolone globalnie
document.addEventListener("dragover", e => e.preventDefault());

document.addEventListener("drop", async (e) => {
    e.preventDefault();

    const url = e.dataTransfer.getData("image-url");
    if (!url) return;

    // Sprawdź, na którą stronę upuszczono
    for (const page of pages) {
        const container = page.stage.container();
        const rect = container.getBoundingClientRect();

        if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
        ) {
            continue;
        }

        // Upuszczono NA TĘ STRONĘ
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const variants = await getImageVariantsFromSourceLocal(url, "sidebar-firebase-drop");
        const editorSrc = variantSrcLocal(variants, "editor");
        const originalSrc = variantSrcLocal(variants, "original") || editorSrc;
        const thumbSrc = variantSrcLocal(variants, "thumb") || editorSrc;
        if (!editorSrc) return;

        Konva.Image.fromURL(editorSrc, kImg => {
            if (!kImg) return;
            if (typeof window.applyImageVariantsToKonvaNode === "function") {
              window.applyImageVariantsToKonvaNode(kImg, {
                original: originalSrc,
                editor: editorSrc,
                thumb: thumbSrc
              });
            } else {
              kImg.setAttr("originalSrc", originalSrc);
              kImg.setAttr("editorSrc", editorSrc);
              kImg.setAttr("thumbSrc", thumbSrc);
            }

            const maxWidth = 300;
            const scale = Math.min(maxWidth / kImg.width(), 1);

            kImg.setAttrs({
              x: x - (kImg.width() * scale) / 2,
              y: y - (kImg.height() * scale) / 2,
              scaleX: scale,
              scaleY: scale,
            });

            kImg.setAttrs({
              isDesignElement: true,
              isEditable: true,
              isSelectable: true,
              isDraggable: true,
              name: "design-image"
            });
            markAsEditable(kImg);
            kImg.hitStrokeWidth(20);

            page.layer.add(kImg);
            page.layer.batchDraw();
        });

        break;
    }
});
elementsPanel.addEventListener('scroll', () => {
  if (elementsScrollRaf) return;
  elementsScrollRaf = requestAnimationFrame(() => {
    elementsScrollRaf = 0;
    const nearBottom =
      elementsPanel.scrollTop + elementsPanel.clientHeight >=
      elementsPanel.scrollHeight - 120;

    if (nearBottom && typeof window.renderNextElementsBatch === "function") {
      window.renderNextElementsBatch();
    } else if (nearBottom && typeof renderNextElementsBatch === "function") {
      renderNextElementsBatch();
    }
  });
}, { passive: true });

console.log("importdanych-1.js – GOTOWY! Ikony jak w Canva, zero błędów, pięknie!");

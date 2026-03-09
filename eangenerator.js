// eangenerator.js – PEŁNA, POPRAWIONA WERSJA
// ✔ kolor działa
// ✔ obramowanie ZNIKA po kliknięciu obok
// ✔ brak konfliktów z importdanych.js

(function () {
  if (window.eanGeneratorLoaded) return;
  window.eanGeneratorLoaded = true;

  let eanModal = null;
  let pendingBarcodeUrl = null;
  let addMode = false;
  let globalTransformer = null;

  // ================= INIT =================
  function init() {
    const btn = document.querySelector('.sidebar-item[data-tooltip="Kod EAN"]');
    if (!btn || btn._eanBound) return;
    btn._eanBound = true;
    btn.addEventListener('click', openEanModal);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener('excelImported', () => setTimeout(init, 200));

  // ================= MODAL =================
  function openEanModal() {
    if (!window.pages || pages.length === 0) {
      alert("Najpierw zaimportuj Excel lub dodaj stronę!");
      return;
    }

    if (eanModal) {
      eanModal.style.display = "block";
      eanModal.querySelector("#eanInput")?.focus();
      return;
    }

    eanModal = document.createElement("div");
    eanModal.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:linear-gradient(180deg,#0d1320 0%,#09101a 100%);padding:18px;width:340px;border-radius:18px;
      box-shadow:0 24px 56px rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.08);
      z-index:20000;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;color:#f4f7fb;
    `;

    eanModal.innerHTML = `
      <h3 style="margin:0 0 14px;text-align:center;font-size:24px;font-weight:800;color:#f5f7fb;">Generator EAN</h3>
      <input id="eanInput" type="text" maxlength="13"
        placeholder="wpisz 8 lub 13 cyfr"
        style="width:100%;padding:14px 16px;font-size:16px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);color:#f5f7fb;outline:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.04);">
      <div id="eanPreview"
        style="margin:16px 0;min-height:70px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;
               display:flex;align-items:center;justify-content:center;padding:10px;">
      </div>
      <button id="makeBarcode"
        style="width:100%;padding:13px 16px;background:linear-gradient(135deg,#18c8bb 0%,#31c6c8 100%);border:none;
               border-radius:14px;color:#071015;font-weight:800;cursor:pointer;box-shadow:0 12px 28px rgba(24,200,187,.22);">
        Generuj i wstaw
      </button>
      <button id="closeEan"
        style="margin-top:8px;width:100%;padding:13px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);color:#f5f7fb;font-weight:700;cursor:pointer;">
        Anuluj
      </button>
    `;

    document.body.appendChild(eanModal);

    const input = eanModal.querySelector("#eanInput");
    const preview = eanModal.querySelector("#eanPreview");

    input.focus();
    input.addEventListener("input", () => showPreview(input.value, preview));

    eanModal.querySelector("#makeBarcode").onclick = () => {
      const code = input.value.trim();
      if (!/^\d{8}$/.test(code) && !/^\d{13}$/.test(code)) {
        alert("Kod musi mieć 8 lub 13 cyfr!");
        return;
      }
      generateBarcode(code, (url) => {
        if (!url) return alert("Błąd generowania EAN!");
        pendingBarcodeUrl = url;
        eanModal.style.display = "none";
        enableAddMode();
      });
    };

    eanModal.querySelector("#closeEan").onclick = () => {
      eanModal.style.display = "none";
    };
  }

  // ================= PREVIEW =================
  function showPreview(code, container) {
    container.innerHTML = "";
    if (!(/^\d{8}$/.test(code) || /^\d{13}$/.test(code))) {
      container.innerHTML = `<span style="color:#ff7c9a;font-weight:700;">Błędny format</span>`;
      return;
    }
    const c = document.createElement("canvas");
    try {
      JsBarcode(c, code, {
        format: code.length === 8 ? "EAN8" : "EAN13",
        width: 2,
        height: 50,
        displayValue: true,
        background: "transparent",
        lineColor: "#000"
      });
      container.appendChild(c);
    } catch {
      container.innerHTML = `<span style="color:#ff7c9a;font-weight:700;">Błąd</span>`;
    }
  }

  // ================= GENERATOR =================
  function generateBarcode(code, cb) {
    const c = document.createElement("canvas");
    try {
      JsBarcode(c, code, {
        format: code.length === 8 ? "EAN8" : "EAN13",
        width: 2.5,
        height: 70,
        displayValue: true,
        background: "transparent",
        lineColor: "#000"
      });
      cb(c.toDataURL("image/png"));
    } catch {
      cb(null);
    }
  }

  // ================= ADD MODE =================
  function enableAddMode() {
    addMode = true;
    pages.forEach(page => {
      const stage = page.stage;
      stage.container().style.cursor = "crosshair";

      stage.on("mousedown.ean", () => {
        if (!addMode || !pendingBarcodeUrl) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        insertBarcode(stage, pos.x, pos.y);
        disableAddMode();
      });
    });
  }

  function disableAddMode() {
    addMode = false;
    pendingBarcodeUrl = null;
    pages.forEach(page => {
      const stage = page.stage;
      stage.container().style.cursor = "default";
      stage.off("mousedown.ean");
    });
  }

  // ================= INSERT BARCODE =================
  function insertBarcode(stage, x, y) {
    const layer = stage.children[0];
    const img = new Image();
    const originalCopy = pendingBarcodeUrl.slice(); // 🔥 kluczowe

    img.onload = () => {
      const konvaImg = new Konva.Image({
        image: img,
        x,
        y,
        scaleX: 0.6,
        scaleY: 0.6,
        draggable: true,
        listening: true
      });

      konvaImg.setAttrs({
        isBarcode: true,
        barcodeOriginalSrc: originalCopy,
        barcodeColor: "#000000"
      });

      layer.add(konvaImg);

      // 🔥 używaj GŁÓWNEGO transformera (jak wszystkie inne elementy)
      const page = pages.find(p => p.stage === stage);
      if (page) {
        page.selectedNodes = [konvaImg];
        page.transformer.nodes([konvaImg]);
        page.layer.batchDraw();
        page.transformerLayer.batchDraw();
        document.activeStage = stage;
      } else {
        layer.batchDraw();
      }
    };
    img.src = originalCopy;
  }

  // ================= TRANSFORMER =================
  function attachTransformer(stage, node) {
    const layer = stage.children[0];

    if (globalTransformer) {
      globalTransformer.nodes([]);
      globalTransformer.destroy();
      globalTransformer = null;
    }

    globalTransformer = new Konva.Transformer({
      nodes: [node],
      enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
      rotateEnabled: false,
      borderStroke: "#00c4b4",
      anchorFill: "#00c4b4"
    });

    layer.add(globalTransformer);
    layer.batchDraw();

    // klik w barcode → pokazuj uchwyty
    node.on("mousedown.eanSelect", (e) => {
      e.cancelBubble = true;
      globalTransformer.nodes([node]);
      layer.batchDraw();
    });

    // 🔥 KLIK POZA BARCODE → USUŃ OBRAMOWANIE
    stage.off("mousedown.eanClear");
    stage.on("mousedown.eanClear", (e) => {
      if (e.target !== node) {
        globalTransformer.nodes([]);
        layer.batchDraw();
      }
    });

    // delete
    document.addEventListener("keydown", (e) => {
      if (e.key === "Delete" && globalTransformer?.nodes()[0] === node) {
        node.destroy();
        globalTransformer.nodes([]);
        layer.batchDraw();
      }
    });
  }

})();

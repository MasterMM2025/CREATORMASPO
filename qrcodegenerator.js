// qrcodegenerator.js – FINAL FINAL FIX
// ✔ 1 klik = transformer
// ✔ klik poza QR = czyszczenie
// ✔ 100% jak EAN

(function () {
  if (window.qrGeneratorLoaded) return;
  window.qrGeneratorLoaded = true;

  let qrModal = null;
  let pendingQRUrl = null;
  let addMode = false;

  let transformer = null;
  let activeNode = null;

  // ================= INIT =================
  function init() {
    const btn = document.querySelector('.sidebar-item[data-tooltip="Kod QR"]');
    if (!btn || btn._qrBound) return;
    btn._qrBound = true;
    btn.addEventListener('click', openQRModal);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("excelImported", () => setTimeout(init, 200));

  // ================= MODAL =================
  function openQRModal() {
    if (!window.pages || pages.length === 0) {
      alert("Najpierw zaimportuj Excel lub dodaj stronę!");
      return;
    }

    if (qrModal) {
      qrModal.style.display = "block";
      return;
    }

    qrModal = document.createElement("div");
    qrModal.style.cssText = `
      position:fixed;top:50%;left:50%;
      transform:translate(-50%,-50%);
      background:linear-gradient(180deg,#0d1320 0%,#09101a 100%);padding:18px;width:360px;
      border-radius:18px;
      box-shadow:0 24px 56px rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.08);
      z-index:20000;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;color:#f4f7fb;
    `;

    qrModal.innerHTML = `
      <h3 style="margin:0 0 14px;text-align:center;font-size:24px;font-weight:800;color:#f5f7fb;">Generator QR Code</h3>

      <input id="qrInput" type="text"
        placeholder="wklej link lub tekst"
        style="width:100%;padding:14px 16px;font-size:15px;
               border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);color:#f5f7fb;outline:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.04);">

      <div id="qrPreview"
        style="margin:16px 0;min-height:120px;
               background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;
               display:flex;align-items:center;justify-content:center;padding:12px;">
      </div>

      <button id="makeQR"
        style="width:100%;padding:13px 16px;
               background:linear-gradient(135deg,#18c8bb 0%,#31c6c8 100%);border:none;
               border-radius:14px;color:#071015;font-weight:800;cursor:pointer;box-shadow:0 12px 28px rgba(24,200,187,.22);">
        Generuj i wstaw
      </button>

      <button id="closeQR"
        style="margin-top:8px;width:100%;
               padding:13px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);color:#f5f7fb;font-weight:700;cursor:pointer;">
        Anuluj
      </button>
    `;

    document.body.appendChild(qrModal);

    const input = qrModal.querySelector("#qrInput");
    const preview = qrModal.querySelector("#qrPreview");

    input.addEventListener("input", () => showPreview(input.value, preview));

    qrModal.querySelector("#makeQR").onclick = () => {
      const text = input.value.trim();
      if (!text) return alert("Wklej link lub tekst!");

      generateQR(text, (url) => {
        pendingQRUrl = url;
        qrModal.style.display = "none";
        enableAddMode();
      });
    };

    qrModal.querySelector("#closeQR").onclick = () => {
      qrModal.style.display = "none";
    };
  }

  // ================= PREVIEW =================
  function showPreview(text, container) {
    container.innerHTML = "";
    if (!text) return;

    const div = document.createElement("div");
    new QRCode(div, {
      text,
      width: 110,
      height: 110,
      correctLevel: QRCode.CorrectLevel.M
    });

    container.appendChild(div);
  }

  // ================= GENERATE =================
  function generateQR(text, cb) {
    const div = document.createElement("div");
    new QRCode(div, {
      text,
      width: 400,
      height: 400,
      correctLevel: QRCode.CorrectLevel.M
    });

    const canvas = div.querySelector("canvas");
    cb(canvas.toDataURL("image/png"));
  }

  // ================= ADD MODE =================
  function enableAddMode() {
    addMode = true;

    pages.forEach(page => {
      const stage = page.stage;
      stage.container().style.cursor = "crosshair";

      stage.on("pointerdown.qrAdd", () => {
        if (!addMode || !pendingQRUrl) return;
        const pos = stage.getPointerPosition();
        insertQR(stage, pos.x, pos.y);
        disableAddMode();
      });
    });
  }

  function disableAddMode() {
    addMode = false;
    pendingQRUrl = null;

    pages.forEach(page => {
      const stage = page.stage;
      stage.container().style.cursor = "default";
      stage.off("pointerdown.qrAdd");
    });
  }

  // ================= INSERT =================
  function insertQR(stage, x, y) {
    const layer = stage.children[0];
    const img = new Image();
    const src = pendingQRUrl;

    img.onload = () => {
      const node = new Konva.Image({
        image: img,
        x,
        y,
        width: img.width * 0.4,
        height: img.height * 0.4,
        draggable: true,
        listening: true
      });

      node.setAttrs({
        isBarcode: true,
        barcodeOriginalSrc: src,
        barcodeColor: "#000000"
      });

      layer.add(node);

      // 🔥 używaj GŁÓWNEGO transformera (jak wszystkie inne elementy)
      const page = pages.find(p => p.stage === stage);
      if (page) {
        page.selectedNodes = [node];
        page.transformer.nodes([node]);
        page.layer.batchDraw();
        page.transformerLayer.batchDraw();
        document.activeStage = stage;
      } else {
        layer.batchDraw();
      }
    };

    img.src = src;
  }

  // ================= TRANSFORMER =================
  function attach(stage, node) {
    const layer = stage.children[0];

    if (!transformer) {
      transformer = new Konva.Transformer({
        enabledAnchors: [
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right"
        ],
        rotateEnabled: false,
        borderStroke: "#00c4b4",
        anchorFill: "#00c4b4"
      });
      layer.add(transformer);
    }

    // ✅ JEDEN KLIK = SELEKCJA + TRANSFORMER
    node.on("pointerdown.qrSelect", (e) => {
      e.cancelBubble = true;

      activeNode = node;
      transformer.nodes([node]);
      layer.batchDraw();
    });

    // ✅ KLIK GDZIEKOLWIEK INDZIEJ = CLEAR
    stage.off("pointerdown.qrClear");
    stage.on("pointerdown.qrClear", (e) => {
      if (e.target !== activeNode) {
        transformer.nodes([]);
        activeNode = null;
        layer.batchDraw();
      }
    });

    // ✅ STABILNE SKALOWANIE
    transformer.off("transform.qr");
    transformer.on("transform.qr", () => {
      const n = transformer.nodes()[0];
      if (!n) return;

      const sx = n.scaleX();
      const sy = n.scaleY();

      n.width(Math.max(20, n.width() * sx));
      n.height(Math.max(20, n.height() * sy));

      n.scaleX(1);
      n.scaleY(1);
      layer.batchDraw();
    });

    // DELETE
    document.addEventListener("keydown", (e) => {
      if (e.key === "Delete" && transformer.nodes()[0] === node) {
        node.destroy();
        transformer.nodes([]);
        activeNode = null;
        layer.batchDraw();
      }
    });
  }

})();

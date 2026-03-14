// qrcodegenerator.js – FINAL FINAL FIX
// ✔ 1 klik = transformer
// ✔ klik poza QR = czyszczenie
// ✔ 100% jak EAN

(function () {
  if (window.qrGeneratorLoaded) return;
  window.qrGeneratorLoaded = true;

  const QR_LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/szablony%20maspo%2Fmaspo%20-%20czarne%20logo%20(1).png?alt=media&token=0b9b8f84-08c4-4381-ba34-72b6744afcbb";

  let qrModal = null;
  let pendingQRUrl = null;
  let addMode = false;

  let transformer = null;
  let activeNode = null;
  let qrLogoImagePromise = null;
  let previewRenderSeq = 0;

  // ================= INIT =================
  function init() {
    const btn = document.querySelector('.sidebar-item[data-tooltip="Kod QR"]');
    if (!btn || btn._qrBound) return;
    btn._qrBound = true;
    btn.addEventListener('click', openQRModal);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("excelImported", () => setTimeout(init, 200));

  function loadQrLogoImage() {
    if (qrLogoImagePromise) return qrLogoImagePromise;
    qrLogoImagePromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = QR_LOGO_URL;
    });
    return qrLogoImagePromise;
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
  }

  function renderQrWithLogo(text, size, cb) {
    const div = document.createElement("div");
    new QRCode(div, {
      text,
      width: size,
      height: size,
      correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(async () => {
      const sourceCanvas = div.querySelector("canvas");
      if (!sourceCanvas) {
        cb(null);
        return;
      }

      const outCanvas = document.createElement("canvas");
      outCanvas.width = size;
      outCanvas.height = size;
      const ctx = outCanvas.getContext("2d");
      if (!ctx) {
        cb(null);
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(sourceCanvas, 0, 0, size, size);

      const logo = await loadQrLogoImage();
      if (logo) {
        const badgeSize = Math.round(size * 0.34);
        const logoPadding = Math.max(4, Math.round(badgeSize * 0.08));
        const logoBox = badgeSize - (logoPadding * 2);
        const badgeX = Math.round((size - badgeSize) / 2);
        const badgeY = Math.round((size - badgeSize) / 2);

        ctx.save();
        ctx.shadowColor = "rgba(15,23,42,0.18)";
        ctx.shadowBlur = Math.max(4, Math.round(size * 0.02));
        ctx.shadowOffsetY = Math.max(2, Math.round(size * 0.01));
        drawRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, Math.round(badgeSize * 0.22));
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();

        const logoWidth = Number(logo.naturalWidth || logo.width || 1);
        const logoHeight = Number(logo.naturalHeight || logo.height || 1);
        const scale = Math.min(logoBox / logoWidth, logoBox / logoHeight);
        const drawWidth = Math.max(1, Math.round(logoWidth * scale));
        const drawHeight = Math.max(1, Math.round(logoHeight * scale));
        const logoX = Math.round(badgeX + ((badgeSize - drawWidth) / 2));
        const logoY = Math.round(badgeY + ((badgeSize - drawHeight) / 2));
        ctx.drawImage(logo, logoX, logoY, drawWidth, drawHeight);
      }

      let dataUrl = null;
      try {
        dataUrl = outCanvas.toDataURL("image/png");
      } catch (_err) {
        try {
          dataUrl = sourceCanvas.toDataURL("image/png");
        } catch (_fallbackErr) {
          dataUrl = null;
        }
      }

      cb(dataUrl);
    }, 30);
  }

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

      <div style="margin-top:10px;text-align:center;font-size:12px;color:rgba(245,247,251,.72);">
        QR zostanie wygenerowany z logo MASPO na środku.
      </div>

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

    const renderId = ++previewRenderSeq;
    container.innerHTML = `<div style="font-size:12px;color:rgba(245,247,251,.72);">Generowanie podglądu...</div>`;

    renderQrWithLogo(text, 110, (dataUrl) => {
      if (renderId !== previewRenderSeq) return;
      container.innerHTML = "";
      if (!dataUrl) {
        container.innerHTML = `<div style="font-size:12px;color:#fecaca;">Nie udało się wygenerować podglądu QR.</div>`;
        return;
      }
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "Podgląd QR";
      img.style.cssText = "display:block;width:110px;height:110px;border-radius:10px;background:#fff;";
      container.appendChild(img);
    });
  }

  // ================= GENERATE =================
  function generateQR(text, cb) {
    renderQrWithLogo(text, 400, (dataUrl) => {
      if (!dataUrl) {
        alert("Nie udało się wygenerować QR code.");
        return;
      }
      cb(dataUrl);
    });
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

(function () {
  const SIDEBAR_BUTTON_ID = "sidebarDataUploadBtn";
  const PANEL_ID = "dataUploadPanel";
  const TOGGLE_ID = "dataUploadPanelToggle";
  const IMPORT_BUTTON_ID = "dataUploadImportBtn";
  const FILE_INPUT_ID = "dataUploadFileInput";
  const STATUS_ID = "dataUploadStatus";
  const EMPTY_ID = "dataUploadEmpty";
  const GRID_ID = "dataUploadGrid";
  const MASPO_FOLDER = "szablony maspo";
  const STORAGE_BUCKET = "gs://pdf-creator-f7a8b.firebasestorage.app";
  const IMPORTED_FILE_PREFIX = "__upload__-";
  const PANEL_LEFT_OPEN = 82;
  const PANEL_WIDTH = 286;
  const PANEL_LEFT_CLOSED = -(PANEL_WIDTH + 20);
  const TOGGLE_LEFT_OPEN = PANEL_LEFT_OPEN + PANEL_WIDTH - 10;
  const PREVIEW_HEIGHT = 100;
  let panelVisible = false;
  let storageApiPromise = null;
  let storageInstance = null;
  let renderSessionId = 0;
  const MASPO_URL_CACHE = new Map();

  function getUiZoom() {
    const raw = window.getComputedStyle(document.body).zoom;
    const zoom = Number.parseFloat(raw);
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  }

  function normalizeVariantPayload(value) {
    if (typeof window.normalizeImageVariantPayload === "function") {
      return window.normalizeImageVariantPayload(value);
    }
    const src = String(value || "").trim();
    return { original: src, editor: src, thumb: src };
  }

  function getVariantSource(variants, kind) {
    if (typeof window.getImageVariantSource === "function") {
      return window.getImageVariantSource(variants, kind);
    }
    const payload = normalizeVariantPayload(variants);
    if (kind === "original") return payload.original || payload.editor || payload.thumb || "";
    if (kind === "thumb") return payload.thumb || payload.editor || payload.original || "";
    return payload.editor || payload.original || payload.thumb || "";
  }

  async function createVariantsFromSource(src) {
    const safeSrc = String(src || "").trim();
    if (!safeSrc) return normalizeVariantPayload("");
    if (typeof window.createImageVariantsFromSource === "function") {
      try {
        return await window.createImageVariantsFromSource(safeSrc, {
          cacheKey: `data-upload-panel:${safeSrc}`,
          thumbMaxEdge: 100,
          editorMaxEdge: 560
        });
      } catch (_e) {}
    }
    return normalizeVariantPayload(safeSrc);
  }

  function markAsEditable(node) {
    if (!node || !node.setAttr) return;
    node.setAttr("isEditable", true);
    node.setAttr("isDesignElement", true);
    node.setAttr("isSelectable", true);
    node.setAttr("isDraggable", true);
    node.setAttr("isSidebarImage", true);
    node.setAttr("isUserImage", true);
    node.setAttr("isProductImage", false);
    node.setAttr("slotIndex", null);
    node.setAttr("preservedSlotIndex", null);
    node.setAttr("name", "design-image");
    if (typeof node.draggable === "function") node.draggable(true);
    if (typeof node.listening === "function") node.listening(true);
    if (window.Konva && node instanceof window.Konva.Image) {
      try {
        if (typeof node.hitFunc === "function") node.hitFunc(undefined);
        if (typeof node.clearCache === "function") node.clearCache();
        if (typeof node.cache === "function") node.cache({ pixelRatio: 1 });
        if (typeof node.drawHitFromCache === "function") node.drawHitFromCache(12);
        node.setAttr("alphaHitTest", true);
      } catch (_e) {}
    }
  }

  function clearPlacementMode() {
    document.body.style.cursor = "default";
    document.querySelectorAll(`#${GRID_ID} .elementTile`).forEach((tile) => tile.classList.remove("is-selected"));
    if (!Array.isArray(window.pages)) return;
    window.pages.forEach((page) => {
      if (!page || !page.stage || typeof page.stage.off !== "function") return;
      page.stage.off("mousedown.dataUploadPlace touchstart.dataUploadPlace");
    });
  }

  async function startPlacementFallback(url) {
    if (!Array.isArray(window.pages) || !window.pages.length) return;
    clearPlacementMode();
    document.body.style.cursor = "crosshair";

    window.pages.forEach((page) => {
      if (!page || !page.stage || typeof page.stage.on !== "function") return;
      const handler = async () => {
        const pos = page.stage.getPointerPosition && page.stage.getPointerPosition();
        if (!pos) return;

        const variants = await createVariantsFromSource(url);
        const editorSrc = getVariantSource(variants, "editor");
        const originalSrc = getVariantSource(variants, "original") || editorSrc;
        const thumbSrc = getVariantSource(variants, "thumb") || editorSrc;
        if (!editorSrc) {
          clearPlacementMode();
          return;
        }

        Konva.Image.fromURL(editorSrc, (img) => {
          if (!img) {
            clearPlacementMode();
            return;
          }

          const maxWidth = 300;
          const scale = Math.min(maxWidth / img.width(), 1);

          img.setAttrs({
            x: pos.x - (img.width() * scale) / 2,
            y: pos.y - (img.height() * scale) / 2,
            scaleX: scale,
            scaleY: scale
          });
          markAsEditable(img);

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

          if (page.layer && typeof page.layer.add === "function") {
            page.layer.add(img);
            page.layer.batchDraw();
          }
          if (typeof window.activateNewImageCropSelection === "function") {
            try { window.activateNewImageCropSelection(page, img, { autoCrop: false }); } catch (_e) {}
          }
        });

        clearPlacementMode();
      };

      page.stage.on("mousedown.dataUploadPlace touchstart.dataUploadPlace", handler);
    });
  }

  function placeImage(url) {
    if (typeof window.placeElementsLibraryImage === "function") {
      window.placeElementsLibraryImage(url);
      return;
    }
    void startPlacementFallback(url);
  }

  async function ensureStorageApi() {
    if (storageApiPromise) return storageApiPromise;
    storageApiPromise = (async () => {
      const api = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js");
      const getStorageFn = api?.getStorage;
      const refFn = api?.ref;
      const listAllFn = api?.listAll;
      const getDownloadURLFn = api?.getDownloadURL;
      const uploadBytesFn = api?.uploadBytes;

      if (
        typeof getStorageFn !== "function" ||
        typeof refFn !== "function" ||
        typeof listAllFn !== "function" ||
        typeof getDownloadURLFn !== "function" ||
        typeof uploadBytesFn !== "function"
      ) {
        throw new Error("Brak API Firebase Storage.");
      }

      storageInstance = window.firebaseStorage || getStorageFn(window.firebaseApp || undefined, STORAGE_BUCKET);
      return {
        ref: refFn,
        listAll: listAllFn,
        getDownloadURL: getDownloadURLFn,
        uploadBytes: uploadBytesFn
      };
    })().catch((err) => {
      storageApiPromise = null;
      throw err;
    });
    return storageApiPromise;
  }

  function getPanel() {
    return document.getElementById(PANEL_ID);
  }

  function getToggleButton() {
    return document.getElementById(TOGGLE_ID);
  }

  function getStatusNode() {
    return document.getElementById(STATUS_ID);
  }

  function setStatus(message, tone) {
    const status = getStatusNode();
    if (!status) return;
    status.textContent = String(message || "").trim();
    status.dataset.tone = String(tone || "info").trim() || "info";
  }

  function applyPanelLayout() {
    const panel = getPanel();
    const toggle = getToggleButton();
    if (!panel || !toggle) return;

    const zoom = getUiZoom();
    const openLeft = PANEL_LEFT_OPEN / zoom;
    const closedLeft = PANEL_LEFT_CLOSED / zoom;
    const toggleLeftOpen = TOGGLE_LEFT_OPEN / zoom;
    const panelHeight = Math.max(300, window.innerHeight - 92);

    panel.style.top = `${60 / zoom}px`;
    panel.style.width = `${PANEL_WIDTH / zoom}px`;
    panel.style.height = `${panelHeight / zoom}px`;
    panel.style.padding = `${20 / zoom}px`;
    panel.style.borderRadius = `${16 / zoom}px ${16 / zoom}px 0 0`;

    toggle.style.top = `${window.innerHeight / 2 / zoom}px`;
    toggle.style.width = `${30 / zoom}px`;
    toggle.style.height = `${60 / zoom}px`;
    toggle.style.fontSize = `${16 / zoom}px`;
    toggle.style.borderRadius = `0 ${10 / zoom}px ${10 / zoom}px 0`;

    if (panelVisible) {
      panel.style.left = `${openLeft}px`;
      toggle.style.left = `${toggleLeftOpen}px`;
    } else {
      panel.style.left = `${closedLeft}px`;
      toggle.style.left = "0px";
    }
  }

  function hidePanel() {
    const toggle = getToggleButton();
    panelVisible = false;
    applyPanelLayout();
    if (toggle) toggle.innerHTML = "⟩";
    window.setTimeout(() => {
      if (!panelVisible && toggle) toggle.style.display = "none";
    }, 300);
  }

  async function openPanel() {
    if (typeof window.hideElementsLibraryPanel === "function") {
      window.hideElementsLibraryPanel();
    }

    const panel = getPanel();
    const toggle = getToggleButton();
    if (!panel || !toggle) return;

    panel.style.display = "block";
    panelVisible = true;
    applyPanelLayout();
    toggle.style.display = "flex";
    toggle.innerHTML = "⟨";
    await loadMaspoFiles();
  }

  function sanitizeFileName(name) {
    const raw = String(name || "").trim();
    const withoutExt = raw.replace(/\.[^/.]+$/, "");
    return withoutExt
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "grafika";
  }

  function isImportedMaspoFileName(name) {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) return false;
    return (
      normalized.startsWith(IMPORTED_FILE_PREFIX) ||
      /^(\d{4})(\d{2})(\d{2})-\d{9,}/.test(normalized)
    );
  }

  function sortMaspoEntries(entries) {
    return entries.slice().sort((left, right) => {
      const leftImported = isImportedMaspoFileName(left?.name) ? 1 : 0;
      const rightImported = isImportedMaspoFileName(right?.name) ? 1 : 0;
      if (leftImported !== rightImported) return rightImported - leftImported;
      return String(right?.name || "").localeCompare(String(left?.name || ""), undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });
  }

  function buildUploadFileName(file) {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
      String(now.getMilliseconds()).padStart(3, "0")
    ].join("");
    const extMatch = String(file?.name || "").match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : ".png";
    return `${IMPORTED_FILE_PREFIX}${stamp}-${sanitizeFileName(file?.name || "grafika")}${ext}`;
  }

  function createSkeletonTile() {
    const tile = document.createElement("div");
    tile.className = "elementTile data-upload-element-tile";
    const skeleton = document.createElement("div");
    skeleton.className = "elementSkeleton";
    tile.appendChild(skeleton);
    return tile;
  }

  function renderSkeletons(count) {
    const grid = document.getElementById(GRID_ID);
    const empty = document.getElementById(EMPTY_ID);
    if (!grid || !empty) return;
    grid.innerHTML = "";
    empty.style.display = "none";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      fragment.appendChild(createSkeletonTile());
    }
    grid.appendChild(fragment);
  }

  function selectTile(tile) {
    document.querySelectorAll(`#${GRID_ID} .elementTile`).forEach((node) => node.classList.remove("is-selected"));
    if (tile) tile.classList.add("is-selected");
  }

  function createFileTile(entry) {
    const tile = document.createElement("div");
    tile.className = "elementTile data-upload-element-tile";
    tile.title = entry.name || "";
    tile.draggable = true;

    const skeleton = document.createElement("div");
    skeleton.className = "elementSkeleton";
    tile.appendChild(skeleton);

    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    img.loading = "lazy";
    img.fetchPriority = entry.priority <= 3 ? "high" : "low";
    img.src = entry.url;
    img.style.cssText = `
      display:block;
      opacity:0;
      width:100%;
      height:${PREVIEW_HEIGHT}px;
      object-fit:contain;
      border-radius:8px;
      user-select:none;
      transition: opacity .18s ease;
      pointer-events:none;
    `;

    img.addEventListener("load", () => {
      skeleton.style.display = "none";
      img.style.opacity = "1";
    });
    img.addEventListener("error", () => {
      skeleton.style.display = "block";
      img.style.opacity = "0";
    });

    tile.addEventListener("dragstart", (event) => {
      selectTile(tile);
      event.dataTransfer.setData("image-url", entry.url);
      event.dataTransfer.effectAllowed = "copy";
    });

    tile.addEventListener("click", () => {
      selectTile(tile);
      document.body.style.cursor = "crosshair";
      placeImage(entry.url);
    });

    tile.appendChild(img);
    return tile;
  }

  function renderFiles(entries) {
    const grid = document.getElementById(GRID_ID);
    const empty = document.getElementById(EMPTY_ID);
    if (!grid || !empty) return;

    grid.innerHTML = "";
    if (!entries.length) {
      empty.style.display = "block";
      setStatus("Folder MASPO jest pusty.", "info");
      return;
    }

    empty.style.display = "none";
    const fragment = document.createDocumentFragment();
    entries.forEach((entry) => fragment.appendChild(createFileTile(entry)));
    grid.appendChild(fragment);
    setStatus(`Pliki w MASPO: ${entries.length}`, "success");
  }

  async function loadMaspoFiles() {
    const mySession = ++renderSessionId;
    renderSkeletons(8);
    setStatus("Wczytywanie plików MASPO...", "info");

    try {
      const api = await ensureStorageApi();
      const folderRef = api.ref(storageInstance, MASPO_FOLDER);
      const result = await api.listAll(folderRef);
      const items = sortMaspoEntries(Array.isArray(result?.items) ? result.items.slice() : []);

      const entries = (await Promise.all(items.map(async (item, index) => {
        try {
          const fullPath = item.fullPath || "";
          const cachedUrl = fullPath ? MASPO_URL_CACHE.get(fullPath) : "";
          const url = cachedUrl || await api.getDownloadURL(item);
          if (fullPath && url) MASPO_URL_CACHE.set(fullPath, url);
          return {
            name: item.name || "",
            fullPath,
            url,
            priority: index
          };
        } catch (_e) {
          return null;
        }
      }))).filter(Boolean);

      if (mySession !== renderSessionId) return;
      renderFiles(entries);
    } catch (error) {
      if (mySession !== renderSessionId) return;
      const grid = document.getElementById(GRID_ID);
      const empty = document.getElementById(EMPTY_ID);
      if (grid) grid.innerHTML = "";
      if (empty) empty.style.display = "block";
      setStatus("Nie udało się wczytać folderu MASPO.", "error");
      console.error("data upload panel load error:", error);
    }
  }

  async function uploadFiles(files) {
    const fileList = Array.from(files || []).filter((file) => {
      if (!file) return false;
      const type = String(file.type || "").toLowerCase();
      return type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(String(file.name || ""));
    });

    if (!fileList.length) {
      setStatus("Wybierz pliki PNG, JPG, WEBP, GIF albo SVG.", "error");
      return;
    }

    setStatus(`Wgrywanie plików: ${fileList.length}`, "info");

    try {
      const api = await ensureStorageApi();
      for (const file of fileList) {
        const fileName = buildUploadFileName(file);
        const fileRef = api.ref(storageInstance, `${MASPO_FOLDER}/${fileName}`);
        await api.uploadBytes(fileRef, file, {
          contentType: file.type || "application/octet-stream",
          customMetadata: {
            source: "przesylaniedanych",
            originalName: String(file.name || "")
          }
        });
      }

      if (typeof window.invalidateElementsFolderCache === "function") {
        window.invalidateElementsFolderCache(MASPO_FOLDER);
      }
      if (typeof window.refreshElementsFolderLibrary === "function") {
        window.refreshElementsFolderLibrary(MASPO_FOLDER).catch(() => {});
      }

      setStatus(`Wgrano pliki do MASPO: ${fileList.length}`, "success");
      await loadMaspoFiles();
    } catch (error) {
      setStatus("Nie udało się wgrać plików do MASPO.", "error");
      console.error("data upload panel upload error:", error);
    }
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const style = document.createElement("style");
    style.id = "dataUploadPanelStyle";
    style.textContent = `
      #${PANEL_ID} {
        transition: left 0.25s ease;
        position: fixed;
        left: ${PANEL_LEFT_OPEN}px;
        top: 60px;
        width: ${PANEL_WIDTH}px;
        height: calc(100vh - 92px);
        background: linear-gradient(180deg, #0b1019 0%, #070c14 100%);
        border-radius: 16px 16px 0 0;
        box-shadow: 0 18px 48px rgba(0,0,0,0.42);
        border: 1px solid rgba(148, 163, 184, 0.16);
        overflow-y: auto;
        overflow-x: hidden;
        display: none;
        z-index: 99998;
        padding: 12px;
        box-sizing: border-box;
        font-family: "Inter", sans-serif;
        color: #e5edf9;
      }
      #${PANEL_ID} .data-upload-box {
        border: 1px solid rgba(148,163,184,.14);
        border-radius: 14px;
        background: linear-gradient(180deg, #121927 0%, #0d1320 100%);
        padding: 12px;
        margin-bottom: 12px;
      }
      #${PANEL_ID} .data-upload-box-title {
        color: #f3f6fb;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 6px;
      }
      #${PANEL_ID} .data-upload-box-copy {
        color: rgba(215,226,240,.78);
        font-size: 12px;
        line-height: 1.45;
        margin-bottom: 12px;
      }
      #${PANEL_ID} .data-upload-action {
        width: 100%;
        border: none;
        border-radius: 12px;
        padding: 12px 14px;
        background: linear-gradient(135deg, #11847d 0%, #25c7b7 100%);
        color: #f8fffe;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 10px 22px rgba(18, 184, 166, 0.22);
      }
      #${PANEL_ID} .data-upload-action:hover {
        filter: brightness(1.03);
      }
      #${PANEL_ID} .data-upload-status {
        margin-top: 10px;
        font-size: 12px;
        line-height: 1.4;
        color: rgba(215,226,240,.82);
      }
      #${PANEL_ID} .data-upload-status[data-tone="success"] {
        color: #7ef0d8;
      }
      #${PANEL_ID} .data-upload-status[data-tone="error"] {
        color: #ff9a9a;
      }
      #${PANEL_ID} .data-upload-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        width: 100%;
        overflow-x: hidden;
      }
      #${PANEL_ID} .data-upload-empty {
        color: rgba(215,226,240,.62);
        font-size: 13px;
        text-align: center;
        padding: 12px 0 4px;
      }
      #${PANEL_ID} .data-upload-element-tile {
        min-height: ${PREVIEW_HEIGHT + 18}px;
      }
      #${TOGGLE_ID} {
        position: fixed;
        left: ${TOGGLE_LEFT_OPEN}px;
        top: 50%;
        transform: translateY(-50%);
        background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
        border: 1px solid rgba(148,163,184,.18);
        border-radius: 0 10px 10px 0;
        width: 30px;
        height: 60px;
        cursor: pointer;
        box-shadow: 0 10px 24px rgba(0,0,0,0.34);
        z-index: 99999;
        transition: all 0.25s ease;
        font-size: 16px;
        color: #dce8f7;
        display: none;
        align-items: center;
        justify-content: center;
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <h3 style="font-size:14px;color:#f3f6fb;font-weight:700;margin-bottom:8px;letter-spacing:.01em;">Przesyłanie danych</h3>
      <div class="data-upload-box">
        <div class="data-upload-box-title">Import do MASPO</div>
        <div class="data-upload-box-copy">Dodane grafiki zapiszą się w folderze MASPO i będą widoczne także w oknie Dodaj element.</div>
        <button class="data-upload-action" id="${IMPORT_BUTTON_ID}" type="button">Importuj grafiki</button>
        <input id="${FILE_INPUT_ID}" type="file" accept="image/*" multiple hidden>
        <div class="data-upload-status" id="${STATUS_ID}" data-tone="info">Gotowe do importu.</div>
      </div>
      <div class="data-upload-empty" id="${EMPTY_ID}">Ładowanie grafik z MASPO...</div>
      <div class="data-upload-grid" id="${GRID_ID}"></div>
    `;
    document.body.appendChild(panel);

    const toggle = document.createElement("button");
    toggle.id = TOGGLE_ID;
    toggle.type = "button";
    toggle.innerHTML = "⟩";
    document.body.appendChild(toggle);
  }

  function bindEvents() {
    const sidebarButton = document.getElementById(SIDEBAR_BUTTON_ID);
    const importButton = document.getElementById(IMPORT_BUTTON_ID);
    const fileInput = document.getElementById(FILE_INPUT_ID);
    const toggle = getToggleButton();
    const addElementButton = document.getElementById("addElementBtn");

    if (sidebarButton) {
      sidebarButton.addEventListener("click", () => {
        const panel = getPanel();
        const isOpen = !!panel && panelVisible && panel.style.display === "block";
        if (isOpen) {
          hidePanel();
          return;
        }
        void openPanel();
      });
    }

    if (importButton && fileInput) {
      importButton.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", async () => {
        if (!fileInput.files || !fileInput.files.length) return;
        await uploadFiles(fileInput.files);
        fileInput.value = "";
      });
    }

    if (toggle) {
      toggle.addEventListener("click", () => {
        if (panelVisible) hidePanel();
        else void openPanel();
      });
    }

    if (addElementButton) {
      addElementButton.addEventListener("click", () => {
        if (panelVisible) hidePanel();
      });
    }

    window.addEventListener("resize", applyPanelLayout);
    window.hideDataUploadPanel = hidePanel;
  }

  function init() {
    createPanel();
    bindEvents();
    applyPanelLayout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

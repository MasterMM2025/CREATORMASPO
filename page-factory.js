(function () {
  const api = window.PageFactory || {};
  const deps = {
    createPageLegacy: null
  };

  function buildPageShell({ number, width, height, pagesContainerId = "pagesContainer" }) {
    const div = document.createElement("div");
    div.className = "page-container";
    div.style.position = "relative";
    div.innerHTML = `
  <div class="page-toolbar">
      <span class="page-title">Page ${number}</span>

      <div class="page-tools">
<button class="page-btn magic-layout" data-tip="Magiczny uklad"><i class="fas fa-wand-magic-sparkles"></i></button>
<button class="page-btn move-up" data-tip="Przenieś stronę wyżej">⬆</button>
<button class="page-btn move-down" data-tip="Przenieś stronę niżej">⬇</button>
<button class="page-btn duplicate" data-tip="Powiel stronę">⧉</button>
<button class="page-btn add" data-tip="Dodaj pustą stronę">＋</button>
<button class="page-btn grid" data-tip="Siatka pomocnicza">▦</button>
<button class="page-btn settings" data-tip="Edytuj stronę">⚙</button>
<button class="page-btn delete" data-tip="Usuń stronę">🗑</button>

</div>

  </div>

  <div class="canvas-wrapper"
       style="width:${width}px;height:${height}px;background:#fff;overflow:hidden;position:relative;">
      <div id="k${number}" style="width:${width}px;height:${height}px;"></div>
      <div class="grid-overlay" id="g${number}"></div>
  </div>
`;
    const pagesContainer = document.getElementById(pagesContainerId);
    if (pagesContainer) pagesContainer.appendChild(div);
    return div;
  }

  function createStageLayers({ number, width, height, KonvaRef }) {
    const stage = new KonvaRef.Stage({
      container: `k${number}`,
      width,
      height
    });
    const layer = new KonvaRef.Layer();
    stage.add(layer);
    const transformerLayer = new KonvaRef.Layer();
    stage.add(transformerLayer);
    return { stage, layer, transformerLayer };
  }

  function createPageBackground({
    layer,
    width,
    height,
    KonvaRef,
    getPage,
    onBackgroundPointerDown
  }) {
    const bgRect = new KonvaRef.Rect({
      x: 0,
      y: 0,
      width,
      height,
      fill: "#ffffff",
      listening: true
    });

    bgRect.setAttr("isPageBg", true);
    layer.add(bgRect);
    bgRect.moveToBottom();
    bgRect.setZIndex(0);
    bgRect.draggable(false);
    bgRect.listening(true);
    bgRect.name("pageBackground");
    bgRect.setAttr("selectable", false);

    bgRect.on("mousedown", (e) => {
      if (typeof onBackgroundPointerDown === "function") {
        onBackgroundPointerDown(getPage ? getPage() : null, bgRect, e);
      }
    });
    bgRect.on("transformstart", (e) => e.cancelBubble = true);
    bgRect.on("transform", (e) => e.cancelBubble = true);
    bgRect.on("transformend", (e) => e.cancelBubble = true);
    bgRect.on("dblclick dbltap", (e) => {
      e.cancelBubble = true;
    });

    return bgRect;
  }

  function createBasePageObject({
    number,
    products,
    stage,
    layer,
    transformerLayer,
    container,
    transformer,
    layoutMode,
    priceSizeMultiplierLayout6,
    priceSizeMultiplierLayout8
  }) {
    return {
      number,
      products,
      stage,
      layer,
      transformerLayer,
      container,
      transformer,
      slotObjects: Array(products.length).fill(null),
      barcodeObjects: Array(products.length).fill(null),
      barcodePositions: Array(products.length).fill(null),
      textPositions: [],
      boxScales: Array(products.length).fill(null),
      selectedNodes: [],
      _oldTransformBox: null,
      settings: {
        nameSize: 12,
        indexSize: 14,
        priceSize: Math.round(
          24 * (layoutMode === "layout6" ? priceSizeMultiplierLayout6 : priceSizeMultiplierLayout8)
        ),
        fontFamily: "Arial",
        textColor: "#000000",
        bannerUrl: null,
        currency: "gbp",
        pageBgColor: "#ffffff"
      }
    };
  }

  function createTransformer({
    KonvaRef,
    stage,
    transformerLayer,
    getPage
  }) {
    let tr = null;
    tr = new KonvaRef.Transformer({
      hitStrokeWidth: 20,
      padding: 6,
      enabledAnchors: [
        "top-left", "top-center", "top-right",
        "middle-left", "middle-right",
        "bottom-left", "bottom-center", "bottom-right"
      ],
      rotateEnabled: true,
      keepRatio: true,
      rotationSnaps: [0, 90, 180, 270],
      rotationSnapTolerance: 5,
      borderStroke: "#007cba",
      borderStrokeWidth: 2,
      anchorStroke: "#007cba",
      anchorFill: "#ffffff",
      anchorSize: 12,
      padding: 4,
      boundBoxFunc: (oldBox, newBox) => {
        const selected = (tr && typeof tr.nodes === "function") ? (tr.nodes() || []) : [];
        const single = selected.length === 1 ? selected[0] : null;
        const isLineLikeSelection = !!(single && (
          (KonvaRef.Arrow && single instanceof KonvaRef.Arrow) ||
          (KonvaRef.Line && single instanceof KonvaRef.Line) ||
          (single.getAttr && ["line", "arrow"].includes(String(single.getAttr("shapeType") || "").trim().toLowerCase()))
        ));
        const meetsMinSize = (box) => {
          const width = Math.abs(Number(box && box.width) || 0);
          const height = Math.abs(Number(box && box.height) || 0);
          return isLineLikeSelection
            ? Math.max(width, height) >= 12
            : width >= 20 && height >= 20;
        };
        if (!meetsMinSize(newBox)) return oldBox;
        const shouldClampToPage = !!(single && (
          (single instanceof KonvaRef.Text) ||
          (single.getAttr && (
            single.getAttr("isSidebarText") ||
            single.getAttr("isPriceGroup") ||
            single.getAttr("isDirectPriceRectBg")
          ))
        ));
        if (!shouldClampToPage) return newBox;

        const stageW = (stage && typeof stage.width === "function") ? Number(stage.width()) : 0;
        const stageH = (stage && typeof stage.height === "function") ? Number(stage.height()) : 0;
        if (!(stageW > 0 && stageH > 0)) return newBox;

        const next = { ...newBox };
        if (next.x < 0) {
          next.width += next.x;
          next.x = 0;
        }
        if (next.y < 0) {
          next.height += next.y;
          next.y = 0;
        }
        if (next.x + next.width > stageW) {
          next.width = Math.max(20, stageW - next.x);
        }
        if (next.y + next.height > stageH) {
          next.height = Math.max(20, stageH - next.y);
        }
        if (!meetsMinSize(next)) return oldBox;
        return next;
      }
    });

    tr.anchorDragBoundFunc(function (oldPos, newPos) {
      const anchor = tr.getActiveAnchor();
      const selectedNodes = (tr && typeof tr.nodes === "function") ? (tr.nodes() || []) : [];
      const isSingleImageSelection = selectedNodes.length === 1 && selectedNodes[0] instanceof KonvaRef.Image;
      const singleSelectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
      const isLineLikeSelection = !!(
        singleSelectedNode &&
        (
          (KonvaRef.Arrow && singleSelectedNode instanceof KonvaRef.Arrow) ||
          (KonvaRef.Line && singleSelectedNode instanceof KonvaRef.Line) ||
          (singleSelectedNode.getAttr && ["line", "arrow"].includes(String(singleSelectedNode.getAttr("shapeType") || "").trim().toLowerCase()))
        )
      );
      const isSingleUserTextSelection = !!(
        singleSelectedNode instanceof KonvaRef.Text &&
        singleSelectedNode.getAttr &&
        singleSelectedNode.getAttr("isUserText")
      );

      if (isSingleImageSelection) {
        const img = selectedNodes[0];
        const page = typeof getPage === "function" ? getPage() : null;
        const cropActive = !!(page && page._cropMode && page._cropTarget === img);
        if (!cropActive) return newPos;
        if (anchor === "middle-left" || anchor === "middle-right") {
          return { x: newPos.x, y: oldPos.y };
        }
        if (anchor === "top-center" || anchor === "bottom-center") {
          return { x: oldPos.x, y: newPos.y };
        }
        return newPos;
      }

      if (isLineLikeSelection) {
        return newPos;
      }

      if (
        anchor === "top-left" ||
        anchor === "top-right" ||
        anchor === "bottom-left" ||
        anchor === "bottom-right"
      ) {
        return newPos;
      }

      if (anchor === "middle-left" || anchor === "middle-right") {
        return { x: newPos.x, y: oldPos.y };
      }

      if (isSingleUserTextSelection && (anchor === "top-center" || anchor === "bottom-center")) {
        return { x: newPos.x, y: oldPos.y };
      }

      if (anchor === "top-center" || anchor === "bottom-center") {
        return { x: oldPos.x, y: newPos.y };
      }

      return newPos;
    });

    transformerLayer.add(tr);
    return tr;
  }

  api.configure = function configurePageFactory(nextDeps = {}) {
    if (!nextDeps || typeof nextDeps !== "object") return;
    if (typeof nextDeps.createPage === "function") {
      deps.createPageLegacy = nextDeps.createPage;
    }
  };

  api.registerLegacyCreatePage = function registerLegacyCreatePage(fn) {
    if (typeof fn === "function") {
      deps.createPageLegacy = fn;
    }
  };

  api.getLegacyCreatePage = function getLegacyCreatePage() {
    return deps.createPageLegacy;
  };

  api.createPage = function createPageViaFactory(...args) {
    const createPageLegacy = deps.createPageLegacy;
    if (typeof createPageLegacy !== "function") return null;
    return createPageLegacy(...args);
  };

  api.buildPageShell = buildPageShell;
  api.createStageLayers = createStageLayers;
  api.createPageBackground = createPageBackground;
  api.createBasePageObject = createBasePageObject;
  api.createTransformer = createTransformer;

  window.PageFactory = api;
})();

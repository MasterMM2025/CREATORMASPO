(function () {
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;

  const state = {
    pages: [],
    activePageId: null,
    nextPageNumber: 1
  };

  function getPagesHost() {
    return document.getElementById("pagesContainer");
  }

  function getNotice() {
    return document.getElementById("projectNotice");
  }

  function getToastStack() {
    return document.getElementById("toastStack");
  }

  function showAppToast(message, tone = "info") {
    const stack = getToastStack();
    if (!stack) return;
    const toast = document.createElement("div");
    toast.className = `app-toast app-toast--${tone}`;
    toast.textContent = String(message || "");
    stack.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  function syncGlobals() {
    window.pages = state.pages;
    window.W = A4_WIDTH;
    window.H = A4_HEIGHT;
    window.CATALOG_PAGE_FORMAT = "A4";
    window.CATALOG_PAGE_ORIENTATION = "portrait";
    window.LAYOUT_MODE = "layout6";
    window.CATALOG_STYLE = window.CATALOG_STYLE || "styl_elegancki";
    window.showAppToast = showAppToast;
    window.refreshPagesPerf = function refreshPagesPerf() {};
    window.getCatalogPageSettings = function getCatalogPageSettings() {
      return {
        format: "A4",
        orientation: "portrait"
      };
    };
    window.applyCatalogStyle = function applyCatalogStyle(styleCode) {
      window.CATALOG_STYLE = String(styleCode || "styl_elegancki");
    };
    window.applyCatalogStyleVisual = function applyCatalogStyleVisual(styleCode) {
      window.CATALOG_STYLE = String(styleCode || window.CATALOG_STYLE || "styl_elegancki");
    };
  }

  function getActivePage() {
    return state.pages.find((page) => page.id === state.activePageId) || state.pages[0] || null;
  }

  function refreshNotice() {
    const notice = getNotice();
    if (!notice) return;
    const activePage = getActivePage();
    if (!activePage) {
      notice.textContent = "Kliknij \"Dodaj strone A4\", aby utworzyc pierwsza strone testowa.";
      return;
    }
    const hasProducts = Array.isArray(activePage.products) && activePage.products.some(Boolean);
    notice.textContent = hasProducts
      ? `Aktywna strona: ${activePage.number}. Masz juz moduły na stronie i mozesz testowac dalsze zmiany.`
      : `Aktywna strona: ${activePage.number}. Kliknij "Dodaj produkt", a potem wskaz miejsce na bialej stronie A4.`;
  }

  function pageHasVisibleContent(page) {
    const hasProducts = Array.isArray(page?.products) && page.products.some(Boolean);
    const layerChildren = Number(page?.layer?.getChildren?.().length || 0);
    return hasProducts || layerChildren > 0;
  }

  function getPageStyleIds(page) {
    if (!Array.isArray(page?.products)) return [];
    return Array.from(new Set(
      page.products
        .filter((product) => !!(product && typeof product === "object"))
        .map((product) => String(product.MODULE_LAYOUT_STYLE_ID || "default").trim() || "default")
        .filter(Boolean)
    ));
  }

  function getMagicStyleRegistry() {
    return Array.isArray(window.STYL_WLASNY_REGISTRY?.moduleLayouts)
      ? window.STYL_WLASNY_REGISTRY.moduleLayouts
      : [];
  }

  function getDemoMagicStyleSequence() {
    const preferred = Array.isArray(window.__DEMO_MAGIC_STYLE_SEQUENCE)
      ? window.__DEMO_MAGIC_STYLE_SEQUENCE.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    if (preferred.length) return preferred;
    return getMagicStyleRegistry()
      .map((item) => String(item?.id || "").trim())
      .filter((id) => id && id !== "default");
  }

  function getDemoMagicAiLabSequence() {
    return Array.isArray(window.__DEMO_MAGIC_AI_LAB_SEQUENCE)
      ? window.__DEMO_MAGIC_AI_LAB_SEQUENCE.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  }

  function parseDemoMagicAiLabStyle(styleId) {
    if (typeof window.parseDemoMagicAiLabStyleId === "function") {
      const parsed = window.parseDemoMagicAiLabStyleId(styleId);
      if (parsed && parsed.familyId) return parsed;
    }
    const safe = String(styleId || "").trim();
    const runtimeMatch = safe.match(/^(ai-lab-[a-z0-9-]+)--s(\d+)$/);
    if (runtimeMatch) {
      return {
        familyId: runtimeMatch[1],
        seed: Math.max(1, Number(runtimeMatch[2]) || 1),
        runtimeId: safe,
        isRuntime: true
      };
    }
    if (/^ai-lab-[a-z0-9-]+$/.test(safe)) {
      return {
        familyId: safe,
        seed: 1,
        runtimeId: safe,
        isRuntime: false
      };
    }
    return null;
  }

  function getDemoMagicVariantCount() {
    const configured = Number(window.__DEMO_MAGIC_VARIANT_COUNT || 1000);
    return Math.max(24, Math.min(4000, Math.round(configured) || 1000));
  }

  function getStyleLabelById(styleId) {
    const safeId = String(styleId || "").trim();
    if (!safeId || safeId === "default") return "Domyslny";
    const aiLab = parseDemoMagicAiLabStyle(safeId);
    if (aiLab?.familyId) {
      const familyLabel = String(window.__DEMO_MAGIC_AI_LAB_LABELS?.[aiLab.familyId] || "").trim();
      if (aiLab.isRuntime) {
        return `${familyLabel || aiLab.familyId} • seed ${String(aiLab.seed || 1).padStart(6, "0")}`;
      }
      if (familyLabel) return familyLabel;
    }
    const directMap = (window.__DEMO_MAGIC_STYLE_LABELS && typeof window.__DEMO_MAGIC_STYLE_LABELS === "object")
      ? window.__DEMO_MAGIC_STYLE_LABELS
      : null;
    if (directMap && directMap[safeId]) return String(directMap[safeId]);
    const match = getMagicStyleRegistry().find((item) => String(item?.id || "").trim() === safeId);
    return String(match?.label || safeId);
  }

  function getMagicCubeSequence(currentStyleId = "") {
    const aiLab = parseDemoMagicAiLabStyle(currentStyleId);
    const aiSequence = getDemoMagicAiLabSequence();
    if (aiLab?.familyId && aiSequence.length) return aiSequence;
    return getDemoMagicStyleSequence();
  }

  function getStyleFamilyKey(styleId) {
    const aiLab = parseDemoMagicAiLabStyle(styleId);
    if (aiLab?.familyId) return aiLab.familyId;
    const label = getStyleLabelById(styleId);
    const parts = String(label || "").split(" - ");
    if (parts.length < 2) return String(styleId || "").trim();
    const detail = String(parts.slice(1).join(" - ") || "").trim();
    if (!detail) return String(styleId || "").trim();
    const [layoutName = ""] = detail.split(" / ");
    return layoutName.trim() || String(styleId || "").trim();
  }

  function getDemoMagicVariantStylePool(styleId, sequence) {
    const safeSequence = Array.isArray(sequence) ? sequence.slice() : [];
    const safeStyleId = String(styleId || "").trim();
    if (!safeSequence.length || !safeStyleId) return [];
    const familyKey = getStyleFamilyKey(safeStyleId);
    const pool = safeSequence.filter((candidateId) => getStyleFamilyKey(candidateId) === familyKey);
    return pool.length > 1 ? pool : safeSequence;
  }

  function getVisibleProductCount(page) {
    if (!Array.isArray(page?.products)) return 0;
    return page.products.filter((product) => !!(product && typeof product === "object")).length;
  }

  function pageSupportsMagicCube(page) {
    const hasProducts = Array.isArray(page?.products) && page.products.some(Boolean);
    if (!hasProducts) return false;
    if (!getDemoMagicStyleSequence().length) return false;
    const styleIds = getPageStyleIds(page);
    return !!(
      page?._demoMagicCubeUnlocked ||
      page?._magicLayoutLastPageStyleId ||
      page?._magicLayoutLastAiSignature ||
      styleIds.some((id) => id && id !== "default")
    );
  }

  function resolveMagicCubeCurrentStyleId(page) {
    const styleIds = getPageStyleIds(page);
    const remembered = String(page?._magicLayoutLastPageStyleId || page?._demoMagicLastStyleId || "").trim();
    if (styleIds.length === 1) {
      const direct = String(styleIds[0] || "").trim();
      const sequence = getDemoMagicStyleSequence();
      if (!direct || sequence.includes(direct)) return direct;
      if (remembered) return remembered;
      return direct;
    }
    if (remembered) return remembered;
    return "";
  }

  function resolveMagicCubeIndex(page, sequence, currentStyleId) {
    const styleId = String(currentStyleId || "").trim();
    const aiLab = parseDemoMagicAiLabStyle(styleId);
    const sequenceStyleId = aiLab?.familyId || styleId;
    const styleIndex = sequenceStyleId ? sequence.indexOf(sequenceStyleId) : -1;
    if (styleIndex >= 0) return styleIndex;
    const savedIndex = Number(page?._demoMagicStyleCursor);
    if (Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < sequence.length) return savedIndex;
    return -1;
  }

  function resolveMagicCubeVariantIndex(page, currentStyleId) {
    const safeStyleId = String(currentStyleId || "").trim();
    const savedStyleId = String(page?._demoMagicVariantStyleId || "").trim();
    const savedIndex = Number(page?._demoMagicVariantCursor);
    if (safeStyleId && savedStyleId && safeStyleId === savedStyleId && Number.isInteger(savedIndex) && savedIndex >= 0) {
      return savedIndex;
    }
    return 0;
  }

  function resolveAiLabSeed(page, currentStyleId) {
    const parsed = parseDemoMagicAiLabStyle(currentStyleId);
    if (parsed?.seed) return parsed.seed;
    return Math.max(1, Number(page?._demoMagicAiLabSeed) || 1);
  }

  function syncMagicStyleCube(page) {
    const cube = page?.dom?.magicCube;
    if (!cube) return;
    const supported = pageSupportsMagicCube(page);
    cube.hidden = !supported;
    cube.disabled = !supported;
    cube.classList.toggle("is-active", supported);
    if (!supported) return;

    const currentStyleId = resolveMagicCubeCurrentStyleId(page);
    const sequence = getMagicCubeSequence(currentStyleId);
    const currentIndex = resolveMagicCubeIndex(page, sequence, currentStyleId);
    const currentVariantIndex = resolveMagicCubeVariantIndex(page, currentStyleId);
    const variantCount = getDemoMagicVariantCount();
    const resolvedCurrentLabel = currentStyleId ? getStyleLabelById(currentStyleId) : "Start AI";
    const styleCount = Number(window.__DEMO_MAGIC_STYLE_COUNT || sequence.length || 0);
    const nextStyleIndex = sequence.length ? ((currentIndex + 1 + sequence.length) % sequence.length) : -1;
    const nextStyleLabel = nextStyleIndex >= 0 ? getStyleLabelById(sequence[nextStyleIndex]) : "Brak";
    const aiLab = parseDemoMagicAiLabStyle(currentStyleId);

    if (aiLab?.familyId) {
      const currentSeed = resolveAiLabSeed(page, currentStyleId);
      page._demoMagicStyleCursor = currentIndex;
      cube.querySelector(".magic-style-cube__count").textContent = `AI${String(Math.max(0, currentIndex + 1)).padStart(2, "0")}/${String(Math.max(0, sequence.length)).padStart(2, "0")}`;
      cube.querySelector(".magic-style-cube__label").textContent = resolvedCurrentLabel;
      cube.querySelector(".magic-style-cube__next").textContent = `Klik: ${nextStyleLabel} | Shift: seed ${String(currentSeed + 1).padStart(6, "0")}`;
      cube.title = `Klik: kolejna rodzina AI Lab. Shift+klik: nowy seed tej rodziny. Teraz: ${resolvedCurrentLabel}.`;
      return;
    }

    const singleProductPage = getVisibleProductCount(page) === 1;
    const variantPool = singleProductPage ? getDemoMagicVariantStylePool(currentStyleId, sequence) : [];
    const variantPoolIndex = variantPool.length ? variantPool.indexOf(currentStyleId) : -1;
    const nextVariantStyleLabel = variantPool.length
      ? getStyleLabelById(variantPool[(variantPoolIndex >= 0 ? (variantPoolIndex + 1) : 0) % variantPool.length])
      : `wariant ${String(currentVariantIndex + 1).padStart(4, "0")}/${String(variantCount).padStart(4, "0")}`;

    page._demoMagicStyleCursor = currentIndex;
    cube.querySelector(".magic-style-cube__count").textContent = `S${String(Math.max(0, currentIndex + 1)).padStart(3, "0")}/${String(Math.max(0, styleCount)).padStart(3, "0")}`;
    cube.querySelector(".magic-style-cube__label").textContent = resolvedCurrentLabel;
    cube.querySelector(".magic-style-cube__next").textContent = singleProductPage
      ? `Klik: ${nextStyleLabel} | Shift: ${nextVariantStyleLabel}`
      : `Klik: ${nextStyleLabel} | Shift: wariant ${String(currentVariantIndex + 1).padStart(4, "0")}/${String(variantCount).padStart(4, "0")}`;
    cube.title = singleProductPage
      ? `Klik: kolejny styl AI. Shift+klik: kolejny podwariant wizualny tej samej rodziny ukladu. Teraz: ${resolvedCurrentLabel}.`
      : `Klik: kolejny styl AI. Shift+klik: kolejny wariant w tym stylu. Teraz: ${resolvedCurrentLabel}.`;
  }

  async function cycleMagicStyleFromCube(page, event = null) {
    const activePage = page || getActivePage();
    if (!activePage) return;
    activatePage(activePage.id, { silentScroll: true });
    const cube = activePage?.dom?.magicCube;
    const rememberedStyleId = resolveMagicCubeCurrentStyleId(activePage) || "";
    const sequence = getMagicCubeSequence(rememberedStyleId);
    if (!sequence.length) {
      showAppToast("Brak testowych stylow AI do przelaczania.", "error");
      return;
    }
    if (typeof window.applyDemoMagicVariantForPage !== "function") {
      showAppToast("AI Layout nie jest jeszcze gotowy do przełączania wariantow.", "error");
      return;
    }

    const currentStyleId = resolveMagicCubeCurrentStyleId(activePage) || sequence[0];
    const currentAiLab = parseDemoMagicAiLabStyle(currentStyleId);
    if (currentAiLab?.familyId) {
      const currentSeed = resolveAiLabSeed(activePage, currentStyleId);
      const currentIndex = resolveMagicCubeIndex(activePage, sequence, currentAiLab.familyId);
      const switchVariant = !!event?.shiftKey;
      const nextFamilyIndex = currentIndex >= 0 ? ((currentIndex + 1) % sequence.length) : 0;
      const nextFamilyId = switchVariant ? currentAiLab.familyId : sequence[nextFamilyIndex];
      const nextSeed = switchVariant ? (currentSeed + 1) : currentSeed;

      activePage._demoMagicCubeUnlocked = true;
      if (cube) {
        cube.disabled = true;
        cube.classList.add("is-loading");
      }

      try {
        const applied = await window.applyDemoMagicVariantForPage(activePage, {
          styleId: nextFamilyId,
          aiSeed: nextSeed,
          variantIndex: 0,
          effectMode: switchVariant ? "variant" : "style"
        });
        if (applied) {
          activePage._demoMagicStyleCursor = sequence.indexOf(nextFamilyId);
          activePage._demoMagicAiLabFamilyId = nextFamilyId;
          activePage._demoMagicAiLabSeed = nextSeed;
          activePage._demoMagicLastStyleId = applied.styleId || nextFamilyId;
          activePage._magicLayoutLastPageStyleId = applied.styleId || nextFamilyId;
          activePage._demoMagicVariantStyleId = applied.styleId || nextFamilyId;
          activePage._demoMagicVariantCursor = 0;
          syncMagicStyleCube(activePage);
        }
      } finally {
        if (cube) {
          cube.disabled = false;
          cube.classList.remove("is-loading");
        }
        refreshPageUi(activePage);
      }
      return;
    }

    const currentIndex = resolveMagicCubeIndex(activePage, sequence, currentStyleId);
    const currentVariantIndex = resolveMagicCubeVariantIndex(activePage, currentStyleId);
    const variantCount = getDemoMagicVariantCount();
    const switchVariant = !!event?.shiftKey;
    const singleProductPage = getVisibleProductCount(activePage) === 1;
    const nextStyleIndex = currentIndex >= 0 ? ((currentIndex + 1) % sequence.length) : 0;
    let nextStyleId = switchVariant ? currentStyleId : sequence[nextStyleIndex];
    let nextVariantIndex = switchVariant ? ((currentVariantIndex + 1) % variantCount) : 0;

    if (switchVariant && singleProductPage) {
      const variantPool = getDemoMagicVariantStylePool(currentStyleId, sequence);
      const variantPoolIndex = variantPool.indexOf(currentStyleId);
      const nextVariantPoolIndex = variantPool.length
        ? ((variantPoolIndex >= 0 ? variantPoolIndex : 0) + 1) % variantPool.length
        : 0;
      nextStyleId = variantPool[nextVariantPoolIndex] || currentStyleId;
      nextVariantIndex = 0;
    }

    if (!nextStyleId) return;

    activePage._demoMagicCubeUnlocked = true;
    if (cube) {
      cube.disabled = true;
      cube.classList.add("is-loading");
    }

    try {
      const applied = await window.applyDemoMagicVariantForPage(activePage, {
        styleId: nextStyleId,
        variantIndex: nextVariantIndex,
        effectMode: switchVariant ? "variant" : "style"
      });
      if (applied) {
        activePage._demoMagicStyleCursor = sequence.indexOf(nextStyleId);
        activePage._demoMagicLastStyleId = nextStyleId;
        activePage._magicLayoutLastPageStyleId = nextStyleId;
        activePage._demoMagicVariantStyleId = nextStyleId;
        activePage._demoMagicVariantCursor = nextVariantIndex;
        syncMagicStyleCube(activePage);
      }
    } finally {
      if (cube) {
        cube.disabled = false;
        cube.classList.remove("is-loading");
      }
      refreshPageUi(activePage);
    }
  }

  function refreshPageUi(page) {
    if (!page || !page.dom) return;
    const isActive = page.id === state.activePageId;
    page.dom.label.textContent = `Strona ${page.number}${isActive ? " • aktywna" : ""}`;
    page.dom.empty.hidden = pageHasVisibleContent(page);
    page.dom.activateBtn.disabled = isActive;
    syncMagicStyleCube(page);
  }

  function refreshAllPages() {
    state.pages.forEach(refreshPageUi);
    refreshNotice();
  }

  function activatePage(pageId, options = {}) {
    const page = state.pages.find((item) => item.id === pageId);
    if (!page) return null;
    state.activePageId = page.id;
    document.activeStage = page.stage;
    if (!options.silentScroll) {
      page.dom.section.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    refreshAllPages();
    return page;
  }

  function createPageShell(pageNumber) {
    const section = document.createElement("section");
    section.className = "catalog-page";
    section.dataset.pageNumber = String(pageNumber);

    const meta = document.createElement("div");
    meta.className = "catalog-page__meta";

    const label = document.createElement("span");
    label.textContent = `Strona ${pageNumber}`;

    const activateBtn = document.createElement("button");
    activateBtn.className = "ui-btn ui-btn--ghost";
    activateBtn.type = "button";
    activateBtn.textContent = "Ustaw jako aktywna";

    meta.appendChild(label);
    meta.appendChild(activateBtn);

    const sheet = document.createElement("div");
    sheet.className = "catalog-page__sheet catalog-page__sheet--canvas";

    const zoomWrap = document.createElement("div");
    zoomWrap.className = "page-zoom-wrap";

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "canvas-wrapper";

    const stageHost = document.createElement("div");
    stageHost.className = "konva-host";

    const magicCube = document.createElement("button");
    magicCube.className = "magic-style-cube";
    magicCube.type = "button";
    magicCube.hidden = true;
    magicCube.innerHTML = `
      <span class="magic-style-cube__eyebrow">AI cube</span>
      <span class="magic-style-cube__count">000/000</span>
      <span class="magic-style-cube__label">Start AI</span>
      <span class="magic-style-cube__next">Dalej: -</span>
    `;

    const empty = document.createElement("div");
    empty.className = "catalog-page__empty";
    empty.textContent = "Ta strona A4 jest pusta. Dodaj produkt z panelu po lewej.";

    canvasWrap.appendChild(stageHost);
    canvasWrap.appendChild(magicCube);
    zoomWrap.appendChild(canvasWrap);
    sheet.appendChild(zoomWrap);
    sheet.appendChild(empty);
    section.appendChild(meta);
    section.appendChild(sheet);

    return {
      section,
      label,
      activateBtn,
      sheet,
      stageHost,
      magicCube,
      empty
    };
  }

  function createGroupHelpers(page) {
    page.groupSelectedNodes = function groupSelectedNodes() {
      if (!window.Konva) return null;
      const nodes = (Array.isArray(page.selectedNodes) ? page.selectedNodes : []).filter((node) => node && node !== page.transformer);
      if (nodes.length < 2) return null;

      const group = new window.Konva.Group({
        draggable: true,
        isUserGroup: true
      });

      page.layer.add(group);
      nodes.forEach((node) => {
        const abs = node.getAbsolutePosition ? node.getAbsolutePosition() : { x: 0, y: 0 };
        node.moveTo(group);
        if (node.setAbsolutePosition) node.setAbsolutePosition(abs);
      });

      page.selectedNodes = [group];
      page.transformer.nodes([group]);
      page.layer.batchDraw();
      page.transformerLayer.batchDraw();
      return group;
    };

    page.ungroupSelectedNodes = function ungroupSelectedNodes() {
      const group = Array.isArray(page.selectedNodes) ? page.selectedNodes[0] : null;
      if (!group || !window.Konva || !(group instanceof window.Konva.Group)) return [];

      const children = typeof group.getChildren === "function"
        ? group.getChildren().toArray()
        : [];

      children.forEach((child) => {
        const abs = child.getAbsolutePosition ? child.getAbsolutePosition() : { x: 0, y: 0 };
        child.moveTo(page.layer);
        if (child.setAbsolutePosition) child.setAbsolutePosition(abs);
      });

      group.destroy();
      page.selectedNodes = children;
      page.transformer.nodes(children);
      page.layer.batchDraw();
      page.transformerLayer.batchDraw();
      return children;
    };
  }

  function createPage(pageNumber = state.nextPageNumber, options = {}) {
    const host = getPagesHost();
    if (!host) return null;
    if (!window.Konva) {
      showAppToast("Brak biblioteki Konva. Strona testowa nie moze uruchomic canvas.", "error");
      return null;
    }

    const dom = createPageShell(pageNumber);
    host.appendChild(dom.section);

    const stage = new window.Konva.Stage({
      container: dom.stageHost,
      width: A4_WIDTH,
      height: A4_HEIGHT
    });
    const layer = new window.Konva.Layer();
    const transformerLayer = new window.Konva.Layer();
    const transformer = new window.Konva.Transformer({
      rotateEnabled: false,
      enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"]
    });

    transformerLayer.add(transformer);
    stage.add(layer);
    stage.add(transformerLayer);

    const page = {
      id: `page-${pageNumber}-${Date.now()}`,
      number: pageNumber,
      isCover: false,
      container: dom.section,
      dom,
      stage,
      layer,
      transformerLayer,
      transformer,
      selectedNodes: [],
      products: [],
      slotObjects: [],
      barcodeObjects: [],
      barcodePositions: [],
      boxScales: [],
      settings: {
        fontFamily: "Arial"
      }
    };

    createGroupHelpers(page);

    dom.activateBtn.addEventListener("click", function () {
      activatePage(page.id);
    });

    dom.magicCube.addEventListener("click", async function (event) {
      event.preventDefault();
      event.stopPropagation();
      await cycleMagicStyleFromCube(page, event);
    });

    stage.on("mousedown tap touchstart click", function () {
      activatePage(page.id, { silentScroll: true });
    });

    state.pages.push(page);
    state.nextPageNumber = Math.max(state.nextPageNumber, pageNumber + 1);
    syncGlobals();
    window.dispatchEvent(new CustomEvent("canvasCreated", { detail: page.stage }));
    activatePage(page.id, { silentScroll: options.reveal === false });
    refreshAllPages();
    return page;
  }

  function createNewPage(options = {}) {
    return createPage(state.nextPageNumber, options);
  }

  function resetPages(nextPages) {
    state.pages.forEach((page) => {
      try { page.stage.destroy(); } catch (_err) {}
      page.dom?.section?.remove?.();
    });
    state.pages = [];
    state.activePageId = null;
    state.nextPageNumber = 1;
    syncGlobals();

    if (Array.isArray(nextPages) && nextPages.length) {
      nextPages.forEach((pageLike, index) => {
        const page = createPage(Number(pageLike?.number) || (index + 1), { reveal: false });
        if (!page) return;
        page.products = Array.isArray(pageLike?.products) ? pageLike.products.slice() : [];
        refreshPageUi(page);
      });
      activatePage(state.pages[0]?.id || "", { silentScroll: true });
    } else {
      createNewPage({ reveal: false });
    }
  }

  function bindCanvasEvents() {
    window.addEventListener("canvasModified", function (event) {
      const stage = event?.detail || null;
      const page = state.pages.find((item) => item.stage === stage) || getActivePage();
      if (!page) return;
      activatePage(page.id, { silentScroll: true });
      refreshAllPages();
    });
  }

  function bindUiEvents() {
    document.getElementById("addPageBtn").addEventListener("click", function () {
      createNewPage();
    });

    document.getElementById("openMagicLayoutBtn").addEventListener("click", async function () {
      const activePage = getActivePage();
      if (!activePage) {
        showAppToast("Najpierw utworz strone A4.", "error");
        return;
      }
      const hasProducts = Array.isArray(activePage.products) && activePage.products.some(Boolean);
      if (!hasProducts) {
        showAppToast("Najpierw dodaj przynajmniej jeden produkt na stronie.", "info");
        return;
      }
      if (typeof window.openMagicLayoutForPage === "function") {
        await window.openMagicLayoutForPage(activePage);
        return;
      }
      showAppToast("Magic Layout nie jest jeszcze gotowy.", "error");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    syncGlobals();
    bindUiEvents();
    bindCanvasEvents();
    createNewPage({ reveal: false });

    window.createNewPage = createNewPage;
    window.ProjektDemo = {
      createNewPage,
      getActivePage,
      resetPages
    };
  });
})();

(function () {
  const api = window.PageActions || {};
  const deps = {
    getPages: null,
    createPage: null,
    queueCreateZoomSlider: null,
    queueRefreshPagesPerf: null,
    getPagePerfObserver: null,
    createEmptyPageUnderLegacy: null
  };

  api.configure = function configurePageActions(nextDeps = {}) {
    if (!nextDeps || typeof nextDeps !== "object") return;
    if (typeof nextDeps.getPages === "function") deps.getPages = nextDeps.getPages;
    if (typeof nextDeps.createPage === "function") deps.createPage = nextDeps.createPage;
    if (typeof nextDeps.queueCreateZoomSlider === "function") deps.queueCreateZoomSlider = nextDeps.queueCreateZoomSlider;
    if (typeof nextDeps.queueRefreshPagesPerf === "function") deps.queueRefreshPagesPerf = nextDeps.queueRefreshPagesPerf;
    if (typeof nextDeps.getPagePerfObserver === "function") deps.getPagePerfObserver = nextDeps.getPagePerfObserver;
    if (typeof nextDeps.createEmptyPageUnderLegacy === "function") deps.createEmptyPageUnderLegacy = nextDeps.createEmptyPageUnderLegacy;
  };

  api.registerLegacyCreateEmptyPageUnder = function registerLegacyCreateEmptyPageUnder(fn) {
    if (typeof fn === "function") deps.createEmptyPageUnderLegacy = fn;
  };

  function getPagesRef() {
    if (typeof deps.getPages === "function") {
      const list = deps.getPages();
      if (Array.isArray(list)) return list;
    }
    return Array.isArray(window.pages) ? window.pages : [];
  }

  function revealCreatedPage(page) {
    const container = page && page.container;
    if (!container || !(container instanceof HTMLElement)) return;

    requestAnimationFrame(() => {
      container.classList.remove("page-new-highlight");
      void container.offsetWidth;
      container.classList.add("page-new-highlight");
      const headerOffset = 124;
      const rect = container.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const targetTop = Math.max(0, absoluteTop - headerOffset);
      window.scrollTo({
        top: targetTop,
        behavior: "smooth"
      });
      window.setTimeout(() => {
        container.classList.remove("page-new-highlight");
      }, 1400);
    });
  }

  function createNewPage(options = {}) {
    const shouldApplyProjectBackgroundDefault = !options || options.skipProjectBackgroundDefault !== true;
    const shouldRevealPage = !!(options && options.reveal);
    const createPage = deps.createPage || window.createPage;
    if (typeof createPage !== "function") return null;

    const pages = getPagesRef();
    const newIndex = pages.length + 1;
    const page = createPage(newIndex, []);

    if (shouldApplyProjectBackgroundDefault && typeof window.applyProjectDefaultBackgroundToPage === "function") {
      Promise.resolve(window.applyProjectDefaultBackgroundToPage(page)).catch(() => {});
    }

    if (shouldRevealPage) {
      revealCreatedPage(page);
    }

    return page;
  }

  function createBlankPageFromMainButton(parentPage = null) {
    const createdPage = createNewPage();
    if (!createdPage) return null;

    const pages = getPagesRef();
    if (parentPage && typeof window.movePage === "function" && Array.isArray(pages)) {
      const parentIndex = pages.indexOf(parentPage);
      let currentIndex = pages.indexOf(createdPage);
      if (parentIndex > -1 && currentIndex > -1) {
        const targetIndex = parentIndex + 1;
        while (currentIndex > targetIndex) {
          window.movePage(createdPage, -1);
          currentIndex -= 1;
        }
        while (currentIndex < targetIndex) {
          window.movePage(createdPage, +1);
          currentIndex += 1;
        }
      }
    }

    window.projectOpen = true;
    window.projectDirty = true;
    const pdfButton = document.getElementById("pdfButton");
    if (pdfButton) pdfButton.disabled = false;
    const queueCreateZoomSlider = deps.queueCreateZoomSlider || window.queueCreateZoomSlider;
    if (typeof queueCreateZoomSlider === "function") queueCreateZoomSlider();
    revealCreatedPage(createdPage);

    return createdPage;
  }

  function createEmptyPageUnder(parentPage = null) {
    const legacyCreateEmptyPageUnder = deps.createEmptyPageUnderLegacy;
    if (typeof legacyCreateEmptyPageUnder === "function") {
      return legacyCreateEmptyPageUnder(parentPage);
    }
    return createBlankPageFromMainButton(parentPage);
  }

  function movePage(page, direction) {
    const pages = getPagesRef();
    const index = pages.indexOf(page);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= pages.length) return;

    const tmp = pages[newIndex];
    pages[newIndex] = page;
    pages[index] = tmp;

    const container = document.getElementById("pagesContainer");
    if (!container) return;
    if (direction < 0) {
      container.insertBefore(page.container, tmp.container);
    } else {
      container.insertBefore(tmp.container, page.container);
    }

    pages.forEach((p, i) => {
      p.number = i + 1;
      const title = p.container && p.container.querySelector
        ? p.container.querySelector(".page-title")
        : null;
      if (title) title.textContent = `Page ${i + 1}`;
    });

    const queueRefreshPagesPerf = deps.queueRefreshPagesPerf || window.queueRefreshPagesPerf;
    if (typeof queueRefreshPagesPerf === "function") queueRefreshPagesPerf();
    console.log(`Strona przesunięta na pozycję ${newIndex + 1}`);
  }

  function deletePage(page) {
    const pages = getPagesRef();
    const index = pages.indexOf(page);
    if (index === -1) return;

    const pagePerfObserver = typeof deps.getPagePerfObserver === "function"
      ? deps.getPagePerfObserver()
      : null;
    if (pagePerfObserver && page?.container) {
      try { pagePerfObserver.unobserve(page.container); } catch (_e) {}
    }
    if (page && page.__scheduledTasks) {
      Object.values(page.__scheduledTasks).forEach((timerId) => {
        try { clearTimeout(timerId); } catch (_e) {}
      });
      page.__scheduledTasks = Object.create(null);
    }

    page.stage?.destroy?.();
    page.container?.remove?.();
    pages.splice(index, 1);

    pages.forEach((p, i) => {
      p.number = i + 1;
      const h3 = p.container && p.container.querySelector
        ? p.container.querySelector("h3 span")
        : null;
      if (h3) h3.textContent = `Strona ${i + 1}`;
      const title = p.container && p.container.querySelector
        ? p.container.querySelector(".page-title")
        : null;
      if (title) title.textContent = `Page ${i + 1}`;
    });

    const queueRefreshPagesPerf = deps.queueRefreshPagesPerf || window.queueRefreshPagesPerf;
    if (typeof queueRefreshPagesPerf === "function") queueRefreshPagesPerf();
  }

  function duplicatePage(page) {
    const collectProjectData = window.collectProjectData;
    const restoreSavedObjectsForPage = window.restoreSavedObjectsForPage;
    if (typeof collectProjectData !== "function" || typeof restoreSavedObjectsForPage !== "function") {
      return createEmptyPageUnder(page);
    }

    const pages = getPagesRef();
    const sourceIndex = pages.indexOf(page);
    if (sourceIndex === -1) return null;

    const projectSnapshot = collectProjectData();
    const sourcePayload = Array.isArray(projectSnapshot?.pages) ? projectSnapshot.pages[sourceIndex] : null;
    if (!sourcePayload || typeof sourcePayload !== "object") {
      return createEmptyPageUnder(page);
    }

    const clonedPayload = JSON.parse(JSON.stringify(sourcePayload));
    const createdPage = createNewPage({ skipProjectBackgroundDefault: true });
    if (!createdPage) return null;

    let currentIndex = pages.indexOf(createdPage);
    const targetIndex = sourceIndex + 1;
    while (currentIndex > targetIndex) {
      movePage(createdPage, -1);
      currentIndex -= 1;
    }

    const clonedProducts = Array.isArray(clonedPayload.products)
      ? JSON.parse(JSON.stringify(clonedPayload.products))
      : [];
    createdPage.products = clonedProducts;
    createdPage.slotObjects = Array(clonedProducts.length).fill(null);
    createdPage.barcodeObjects = Array(clonedProducts.length).fill(null);
    createdPage.barcodePositions = Array(clonedProducts.length).fill(null);
    createdPage.boxScales = Array(clonedProducts.length).fill(null);
    createdPage.settings = {
      ...(createdPage.settings && typeof createdPage.settings === "object" ? createdPage.settings : {}),
      ...(clonedPayload.settings && typeof clonedPayload.settings === "object"
        ? JSON.parse(JSON.stringify(clonedPayload.settings))
        : {})
    };
    createdPage.__savedUserProductGroups = Array.isArray(clonedPayload.userProductGroups)
      ? JSON.parse(JSON.stringify(clonedPayload.userProductGroups))
      : [];

    Promise.resolve(restoreSavedObjectsForPage(createdPage, clonedPayload))
      .then(() => {
        window.projectOpen = true;
        window.projectDirty = true;
        const pdfButton = document.getElementById("pdfButton");
        if (pdfButton) pdfButton.disabled = false;
        const queueCreateZoomSlider = deps.queueCreateZoomSlider || window.queueCreateZoomSlider;
        if (typeof queueCreateZoomSlider === "function") queueCreateZoomSlider();
        revealCreatedPage(createdPage);
      })
      .catch((err) => {
        console.error("duplicatePage restore error:", err);
      });

    return createdPage;
  }

  api.revealCreatedPage = revealCreatedPage;
  api.createNewPage = createNewPage;
  api.createBlankPageFromMainButton = createBlankPageFromMainButton;
  api.createEmptyPageUnder = createEmptyPageUnder;
  api.movePage = movePage;
  api.deletePage = deletePage;
  api.duplicatePage = duplicatePage;
  window.PageActions = api;
})();

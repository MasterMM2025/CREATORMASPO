// baner-konva.js – baner skalowany do pelnej szerokosci aktualnej strony

let bannerImage = null;        // surowy <img>
let bannerDataURL = null;      // gotowy URL

// ======================================================
// DODAWANIE BANERA NA STRONĘ KONVA
// ======================================================
window.addBannerToPage = function(page) {
  // NIE dodawaj banera do okładki
  if (page.isCover) return Promise.resolve(null);

  if (!bannerImage || !bannerDataURL) return Promise.resolve(null);

  if (typeof window.addCatalogBannerToPage === "function") {
    return window.addCatalogBannerToPage(page, {
      bannerUrl: bannerDataURL,
      originalSrc: bannerDataURL,
      editorSrc: bannerDataURL,
      thumbSrc: bannerDataURL,
      renderSrc: bannerDataURL
    }, {
      sourceWidth: bannerImage.width,
      sourceHeight: bannerImage.height,
      resetState: true,
      clearTransformer: true,
      moveToTop: true,
      y: 0
    });
  }

  return Promise.resolve(null);
};

// ======================================================
// IMPORT BANERA (Konva)
// ======================================================
window.importBanner = function() {
  const input = document.getElementById("bannerFileInput");
  const file = input?.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    bannerDataURL = e.target.result;

    const img = new Image();
    img.onload = () => {
      bannerImage = img;

      // Dodaj baner na wszystkie istniejące strony (oprócz okładki)
      const targetPages = (Array.isArray(pages) ? pages : []).filter(p => p && !p.isCover);
      Promise.all(targetPages.map(p => addBannerToPage(p))).finally(() => {
        const historyStage = document.activeStage || targetPages[0]?.stage || null;
        if (historyStage && typeof window.dispatchCanvasModified === "function") {
          window.dispatchCanvasModified(historyStage, {
            historyMode: "immediate",
            historySource: "banner-import"
          });
        }
      });

      input.value = "";
    };
    img.src = bannerDataURL;
  };

  reader.readAsDataURL(file);
};

// ======================================================
// USUWANIE BANERA (Konva)
// ======================================================
window.removeBanner = function() {
  const targetPages = (Array.isArray(window.pages) ? window.pages : []).filter(p => p && !p.isCover);
  const changedPages = targetPages.filter((page) => {
    if (typeof window.removeCatalogBannerFromPage === "function") {
      return window.removeCatalogBannerFromPage(page, { clearTransformer: true });
    }
    const liveBanner = page?.layer?.findOne?.((node) => node?.getAttr?.("name") === "banner");
    if (!liveBanner) return false;
    liveBanner.destroy();
    page.layer?.batchDraw?.();
    return true;
  });

  bannerImage = null;
  bannerDataURL = null;

  const historyStage = document.activeStage || changedPages[0]?.stage || null;
  if (historyStage && typeof window.dispatchCanvasModified === "function") {
    window.dispatchCanvasModified(historyStage, {
      historyMode: "immediate",
      historySource: "banner-remove"
    });
  }
};

// ======================================================
// OBSŁUGA DROPZONE
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
  const bannerInput = document.getElementById("bannerFileInput");

  if (bannerInput && !bannerInput.dataset.bannerImportBound) {
    bannerInput.dataset.bannerImportBound = "1";
    bannerInput.addEventListener("change", importBanner);
  }
});

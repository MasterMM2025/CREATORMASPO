const FASTCREATOR_TEMPLATE_URL = "fastcreator.html?v=20260327-fastcreator-v25";
const FASTCREATOR_DRAFT_TRAY_SCRIPT_URL = "styl-wlasny-1.js?v=20260326-draft-tray-v01";
const FASTCREATOR_IMPORT_WARNING_TEMPLATE = `
  <div id="fastCreatorImportWarning" class="fastcreator-alert" hidden>
    <div class="fastcreator-alert__backdrop" data-fastcreator-warning-close="true"></div>
    <div class="fastcreator-alert__dialog" role="alertdialog" aria-modal="true" aria-labelledby="fastCreatorImportWarningTitle">
      <button id="fastCreatorImportWarningCloseBtn" class="fastcreator-close" type="button" aria-label="Zamknij komunikat">
        <i class="fas fa-times"></i>
      </button>
      <div class="fastcreator-shell fastcreator-shell--alert">
        <div class="fastcreator-shell__head fastcreator-shell__head--compact">
          <div class="fastcreator-kicker">Informacja o imporcie</div>
          <h2 id="fastCreatorImportWarningTitle" class="fastcreator-title fastcreator-title--alert">Brak przypisania stron</h2>
          <p id="fastCreatorImportWarningMessage" class="fastcreator-copy">Brak przypisania produktów do stron. Spowoduje to wydłużony proces układu katalogu.</p>
        </div>
        <div class="fastcreator-actions fastcreator-actions--alert">
          <button id="fastCreatorImportWarningDismissBtn" class="fastcreator-btn fastcreator-btn--accent" type="button">Zamknij</button>
        </div>
      </div>
    </div>
  </div>
`;
const FASTCREATOR_TEMPLATE_FALLBACK = `
<div id="fastCreatorModal" class="fastcreator-modal" aria-hidden="true">
  <div class="fastcreator-modal__backdrop" data-fastcreator-close="true"></div>
  <section class="fastcreator-modal__dialog fastcreator-modal__dialog--name is-active" data-fast-screen="name" role="dialog" aria-modal="true" aria-labelledby="fastCreatorNameTitle">
    <button id="fastCreatorClose" class="fastcreator-close" type="button" aria-label="Zamknij szybki kreator"><i class="fas fa-times"></i></button>
    <div class="fastcreator-shell">
      <div class="fastcreator-shell__head fastcreator-shell__head--compact">
        <div class="fastcreator-kicker">Szybki kreator katalogu</div>
        <h2 id="fastCreatorNameTitle" class="fastcreator-title">Wybierz nazwę katalogu</h2>
        <p class="fastcreator-copy">Wpisz nazwę nowego katalogu i przejdź dalej do importu danych.</p>
      </div>
      <div class="fastcreator-panel fastcreator-panel--name">
        <label class="fastcreator-field" for="fastCreatorNameInput">
          <span>Nazwa katalogu</span>
          <input id="fastCreatorNameInput" type="text" maxlength="120" placeholder="np. Oferta Wielkanoc 2026" autocomplete="off">
        </label>
        <div id="fastCreatorNameError" class="fastcreator-inline-error" hidden>Wpisz nazwę katalogu, aby przejść dalej.</div>
      </div>
      <div class="fastcreator-actions">
        <button id="fastCreatorCancelBtn" class="fastcreator-btn fastcreator-btn--ghost" type="button">Anuluj</button>
        <button id="fastCreatorNextBtn" class="fastcreator-btn fastcreator-btn--accent" type="button">Dalej</button>
      </div>
    </div>
  </section>
  <section class="fastcreator-modal__dialog fastcreator-modal__dialog--excel" data-fast-screen="excel" role="dialog" aria-modal="true" aria-labelledby="fastCreatorExcelTitle">
    <button id="fastCreatorCloseSecondaryBtn" class="fastcreator-close" type="button" aria-label="Zamknij szybki kreator"><i class="fas fa-times"></i></button>
    <div class="fastcreator-shell">
      <div class="fastcreator-shell__head">
        <div class="fastcreator-kicker">Szybki kreator katalogu</div>
        <h2 id="fastCreatorExcelTitle" class="fastcreator-title">Import danych Excel</h2>
        <p class="fastcreator-copy">To jest drugi modal. Tutaj wybierasz tylko plik Excel i importujesz dane.</p>
      </div>
      <div class="fastcreator-summary">
        <div class="fastcreator-summary__label">Nazwa katalogu</div>
        <div id="fastCreatorProjectNamePreview" class="fastcreator-summary__value">Projekt bez nazwy</div>
      </div>
      <div class="fastcreator-panel fastcreator-panel--excel">
        <div class="fastcreator-toolbar">
          <div class="fastcreator-toolbar__copy">
            <div class="fastcreator-toolbar__title">Import danych (Excel)</div>
            <div class="fastcreator-toolbar__sub">Wybierz plik \`.xlsx\`, \`.xls\` lub \`.csv\`. Kreator uruchomi dokładnie ten sam import, którego używa główny edytor.</div>
          </div>
          <div class="fastcreator-toolbar__actions">
            <input id="fastCreatorExcelInput" type="file" accept=".xlsx,.xls,.csv" hidden>
            <button id="fastCreatorPickExcelBtn" class="fastcreator-btn fastcreator-btn--ghost" type="button"><i class="fas fa-file-excel"></i> Wybierz Excel</button>
          </div>
        </div>
        <div id="fastCreatorExcelStats" class="fastcreator-stats" hidden>
          <div class="fastcreator-stats__item">
            <div class="fastcreator-stats__label">Zaimportowane produkty</div>
            <div id="fastCreatorImportedProductsCount" class="fastcreator-stats__value">0</div>
          </div>
          <div class="fastcreator-stats__item">
            <div class="fastcreator-stats__label">Strony katalogu</div>
            <div id="fastCreatorImportedPagesCount" class="fastcreator-stats__value">0</div>
          </div>
        </div>
        <div id="fastCreatorExcelCard" class="fastcreator-filecard is-empty">
          <div class="fastcreator-filecard__icon"><i class="fas fa-file-import"></i></div>
          <div class="fastcreator-filecard__copy">
            <div id="fastCreatorExcelFileName" class="fastcreator-filecard__title">Nie wybrano pliku</div>
            <div id="fastCreatorExcelFileMeta" class="fastcreator-filecard__meta">Przygotowany importer obsługuje pliki Excel i CSV.</div>
          </div>
        </div>
        <div id="fastCreatorExcelStatus" class="fastcreator-status" data-state="idle">Wybierz plik, aby rozpocząć import danych.</div>
      </div>
      <div class="fastcreator-actions">
        <button id="fastCreatorBackBtn" class="fastcreator-btn fastcreator-btn--ghost" type="button">Wstecz</button>
        <button id="fastCreatorExcelNextBtn" class="fastcreator-btn fastcreator-btn--accent" type="button" disabled>Dalej</button>
      </div>
    </div>
  </section>
  <section class="fastcreator-modal__dialog fastcreator-modal__dialog--images" data-fast-screen="images" role="dialog" aria-modal="true" aria-labelledby="fastCreatorImagesTitle">
    <button id="fastCreatorCloseImagesBtn" class="fastcreator-close" type="button" aria-label="Zamknij szybki kreator"><i class="fas fa-times"></i></button>
    <div class="fastcreator-shell">
      <div class="fastcreator-shell__head">
        <div class="fastcreator-kicker">Szybki kreator katalogu</div>
        <h2 id="fastCreatorImagesTitle" class="fastcreator-title">Import zdjęć</h2>
        <p class="fastcreator-copy">W trzecim kroku dobierasz zdjęcia produktów. Import dopasuje je po indeksach tak jak w głównym edytorze.</p>
      </div>
      <div class="fastcreator-summary">
        <div class="fastcreator-summary__label">Katalog</div>
        <div id="fastCreatorImagesProjectNamePreview" class="fastcreator-summary__value">Projekt bez nazwy</div>
        <div id="fastCreatorImagesProjectMeta" class="fastcreator-summary__meta">Brak danych o imporcie Excela.</div>
      </div>
      <div class="fastcreator-panel fastcreator-panel--images">
        <div class="fastcreator-toolbar">
          <div class="fastcreator-toolbar__copy">
            <div class="fastcreator-toolbar__title">Import zdjęć produktów</div>
            <div class="fastcreator-toolbar__sub">Wybierz wiele plików graficznych. System spróbuje dopasować je po indeksach produktów.</div>
          </div>
          <div class="fastcreator-toolbar__actions">
            <input id="fastCreatorImagesInput" type="file" accept="image/*" multiple hidden>
            <button id="fastCreatorPickImagesBtn" class="fastcreator-btn fastcreator-btn--ghost" type="button"><i class="fas fa-images"></i> Wybierz zdjęcia</button>
            <button id="fastCreatorImportImagesBtn" class="fastcreator-btn fastcreator-btn--accent" type="button"><i class="fas fa-bolt"></i> Importuj zdjęcia</button>
          </div>
        </div>
        <div id="fastCreatorImagesStats" class="fastcreator-stats" hidden>
          <div class="fastcreator-stats__item">
            <div class="fastcreator-stats__label">Wybrane pliki</div>
            <div id="fastCreatorSelectedImagesCount" class="fastcreator-stats__value">0</div>
          </div>
          <div class="fastcreator-stats__item">
            <div class="fastcreator-stats__label">Zaimportowane zdjęcia</div>
            <div id="fastCreatorImportedImagesCount" class="fastcreator-stats__value">0</div>
          </div>
        </div>
        <div id="fastCreatorImagesCard" class="fastcreator-filecard is-empty">
          <div class="fastcreator-filecard__icon"><i class="fas fa-camera"></i></div>
          <div class="fastcreator-filecard__copy">
            <div id="fastCreatorImagesFileName" class="fastcreator-filecard__title">Nie wybrano zdjęć</div>
            <div id="fastCreatorImagesFileMeta" class="fastcreator-filecard__meta">Możesz wskazać wiele plików jednocześnie.</div>
          </div>
        </div>
        <div id="fastCreatorImagesStatus" class="fastcreator-status" data-state="idle">Wybierz zdjęcia produktów, aby rozpocząć import.</div>
      </div>
      <div class="fastcreator-actions">
        <button id="fastCreatorImagesBackBtn" class="fastcreator-btn fastcreator-btn--ghost" type="button">Wstecz</button>
        <button id="fastCreatorImagesNextBtn" class="fastcreator-btn fastcreator-btn--accent" type="button">Dalej</button>
      </div>
    </div>
  </section>
  <div id="fastCreatorImportWarning" class="fastcreator-alert" hidden>
    <div class="fastcreator-alert__backdrop" data-fastcreator-warning-close="true"></div>
    <div class="fastcreator-alert__dialog" role="alertdialog" aria-modal="true" aria-labelledby="fastCreatorImportWarningTitle">
      <button id="fastCreatorImportWarningCloseBtn" class="fastcreator-close" type="button" aria-label="Zamknij komunikat"><i class="fas fa-times"></i></button>
      <div class="fastcreator-shell fastcreator-shell--alert">
        <div class="fastcreator-shell__head fastcreator-shell__head--compact">
          <div class="fastcreator-kicker">Informacja o imporcie</div>
          <h2 id="fastCreatorImportWarningTitle" class="fastcreator-title fastcreator-title--alert">Brak przypisania stron</h2>
          <p id="fastCreatorImportWarningMessage" class="fastcreator-copy">Brak przypisania produktów do stron. Spowoduje to wydłużony proces układu katalogu.</p>
        </div>
        <div class="fastcreator-actions fastcreator-actions--alert">
          <button id="fastCreatorImportWarningDismissBtn" class="fastcreator-btn fastcreator-btn--accent" type="button">Zamknij</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;

const fastCreatorState = {
  initialized: false,
  modal: null,
  currentScreen: "name",
  selectedLayout: "layout6",
  selectedStyleId: "default",
  selectedExcelFile: null,
  selectedImageFiles: [],
  matchedImageFiles: [],
  isSubmitting: false,
  lastExcelSummary: null,
  lastImageSummary: null,
  importedProductsSnapshot: [],
  previewObjectUrls: [],
  styleOptions: [],
  stylePreviewRenderToken: 0,
  previewVisibility: {
    showPrice: true,
    showBarcode: false
  },
  finalizeActiveReportKey: "",
  activePreviewScopeKey: "style",
  legacyOpenQuickCreator: null,
  elements: {}
};

window.fastCreatorState = fastCreatorState;

let fastCreatorSnapshotPreviewRenderStamp = 0;

const FASTCREATOR_PREVIEW_BASE_WIDTH = 500;
const FASTCREATOR_PREVIEW_BASE_HEIGHT = 362;
const FASTCREATOR_STORAGE_MEDIA_BASE = "https://firebasestorage.googleapis.com/v0/b/pdf-creator-f7a8b.firebasestorage.app/o/";
const FASTCREATOR_DEFAULT_INDEX_TEXT_COLOR = "#b9b9b9";
const FASTCREATOR_STYLE_FONT_PRESETS = {
  default: { meta: "FactoTrial Bold", price: "FactoTrial Bold" },
  "styl-numer-1": { meta: "Google Sans Flex", price: "Google Sans Flex" },
  "styl-numer-2": { meta: "FactoTrial Bold", price: "FactoTrial Bold" },
  "styl-numer-3": { meta: "FactoTrial Bold", price: "FactoTrial Bold" }
};

function formatFileSize(size) {
  const bytes = Number(size || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeFastCreatorHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFastCreatorStylePreviewVariant(styleId) {
  const safe = String(styleId || "default").trim();
  if (safe === "default") return "default";
  if (safe === "styl-numer-1") return "style1";
  if (safe === "styl-numer-2") return "style2";
  if (safe === "styl-numer-3") return "style3";
  return "custom";
}

function getInitialLayout() {
  const current = String(window.editorState?.layout || window.LAYOUT_MODE || "layout6").trim();
  return current === "layout8" ? "layout8" : "layout6";
}

function getNameValue() {
  return String(fastCreatorState.elements.nameInput?.value || "").trim();
}

function setNameErrorVisible(visible) {
  const errorEl = fastCreatorState.elements.nameError;
  if (!errorEl) return;
  errorEl.hidden = !visible;
}

function updateNamePreviews() {
  const value = getNameValue() || "Projekt bez nazwy";
  if (fastCreatorState.elements.namePreview) {
    fastCreatorState.elements.namePreview.textContent = value;
  }
  if (fastCreatorState.elements.imagesNamePreview) {
    fastCreatorState.elements.imagesNamePreview.textContent = value;
  }
  if (fastCreatorState.elements.styleNamePreview) {
    fastCreatorState.elements.styleNamePreview.textContent = value;
  }
  if (fastCreatorState.elements.optionsNamePreview) {
    fastCreatorState.elements.optionsNamePreview.textContent = value;
  }
  if (fastCreatorState.elements.finalizeNamePreview) {
    fastCreatorState.elements.finalizeNamePreview.textContent = value;
  }
}

function setFastCreatorStatus(target, message, state = "idle") {
  const map = {
    excel: fastCreatorState.elements.excelStatus,
    images: fastCreatorState.elements.imagesStatus,
    style: fastCreatorState.elements.styleStatus,
    options: fastCreatorState.elements.optionsStatus,
    finalize: fastCreatorState.elements.finalizeStatus
  };
  const statusEl = map[target];
  if (!statusEl) return;
  statusEl.textContent = String(message || "");
  statusEl.dataset.state = state;
}

function getFastCreatorExcelImportStatusMessage(summary) {
  const productCount = Number(summary?.productCount || 0);
  const assignedCount = Number(summary?.assignedPageProductCount || 0);
  const hasAssignments = summary?.pageAssignmentsDetected === true;
  if (!productCount) {
    return {
      message: "Wybierz plik, aby rozpocząć import danych.",
      state: "idle"
    };
  }
  if (hasAssignments) {
    return {
      message: `Zaimportowano ${productCount} produktów. Wykryto przypisanie ${assignedCount} produktów do stron. Możesz kliknąć "Dalej".`,
      state: "success"
    };
  }
  return {
    message: `Zaimportowano ${productCount} produktów. Możesz kliknąć "Dalej".`,
    state: "success"
  };
}

function getFastCreatorMissingAssignmentsWarningMessage(summary) {
  const productCount = Number(summary?.productCount || 0);
  if (!productCount || summary?.pageAssignmentsDetected === true) return "";
  return `Zaimportowano ${productCount} produktów. Brak przypisania produktów do stron. Spowoduje to wydłużony proces układu katalogu.`;
}

function ensureFastCreatorImportWarningElements(modal = fastCreatorState.modal) {
  if (!(modal instanceof HTMLElement)) return null;

  let warning = modal.querySelector("#fastCreatorImportWarning");
  if (!(warning instanceof HTMLElement)) {
    modal.insertAdjacentHTML("beforeend", FASTCREATOR_IMPORT_WARNING_TEMPLATE);
    warning = modal.querySelector("#fastCreatorImportWarning");
  }

  if (!(warning instanceof HTMLElement)) return null;

  const closeBtn = warning.querySelector("#fastCreatorImportWarningCloseBtn");
  const dismissBtn = warning.querySelector("#fastCreatorImportWarningDismissBtn");
  const messageEl = warning.querySelector("#fastCreatorImportWarningMessage");

  fastCreatorState.elements.importWarning = warning;
  fastCreatorState.elements.importWarningCloseBtn = closeBtn;
  fastCreatorState.elements.importWarningDismissBtn = dismissBtn;
  fastCreatorState.elements.importWarningMessage = messageEl;

  if (!warning.dataset.fastcreatorWarningBound) {
    warning.querySelectorAll('[data-fastcreator-warning-close="true"]').forEach((backdrop) => {
      backdrop.addEventListener("click", () => {
        closeFastCreatorImportWarning();
      });
    });

    [closeBtn, dismissBtn].forEach((button) => {
      button?.addEventListener("click", () => {
        closeFastCreatorImportWarning();
      });
    });

    warning.dataset.fastcreatorWarningBound = "true";
  }

  return warning;
}

function openFastCreatorImportWarning(message) {
  const modal = ensureFastCreatorImportWarningElements();
  const messageEl = fastCreatorState.elements.importWarningMessage;
  if (!(modal instanceof HTMLElement) || !(messageEl instanceof HTMLElement)) return;
  messageEl.textContent = String(message || "").trim();
  modal.hidden = false;
}

function closeFastCreatorImportWarning() {
  const modal = fastCreatorState.elements.importWarning || ensureFastCreatorImportWarningElements();
  if (!(modal instanceof HTMLElement)) return;
  modal.hidden = true;
}

function updateExcelFileCard(file) {
  const card = fastCreatorState.elements.excelFileCard;
  const nameEl = fastCreatorState.elements.excelFileName;
  const metaEl = fastCreatorState.elements.excelFileMeta;
  if (!card || !nameEl || !metaEl) return;

  if (!file) {
    card.classList.add("is-empty");
    nameEl.textContent = "Nie wybrano pliku";
    metaEl.textContent = "Przygotowany importer obsługuje pliki Excel i CSV.";
    return;
  }

  card.classList.remove("is-empty");
  nameEl.textContent = String(file.name || "Wybrany plik");
  metaEl.textContent = `${formatFileSize(file.size)} • gotowy do importu`;
}

function updateImagesFileCard(files) {
  const card = fastCreatorState.elements.imagesFileCard;
  const nameEl = fastCreatorState.elements.imagesFileName;
  const metaEl = fastCreatorState.elements.imagesFileMeta;
  if (!card || !nameEl || !metaEl) return;

  const list = Array.isArray(files) ? files : Array.from(files || []);
  if (!list.length) {
    card.classList.add("is-empty");
    nameEl.textContent = "Nie wybrano zdjęć";
    metaEl.textContent = "Możesz wskazać wiele plików jednocześnie.";
    return;
  }

  card.classList.remove("is-empty");
  nameEl.textContent = list.length === 1 ? String(list[0].name || "1 zdjęcie") : `Wybrano ${list.length} zdjęcia`;
  metaEl.textContent = `${list.length} plików • ${list.map((file) => Number(file?.size || 0)).reduce((sum, value) => sum + value, 0) > 0 ? formatFileSize(list.map((file) => Number(file?.size || 0)).reduce((sum, value) => sum + value, 0)) : "gotowe do importu"}`;
}

function hasFastCreatorAssignedPages() {
  return fastCreatorState.lastExcelSummary?.pageAssignmentsDetected === true;
}

function formatFastCreatorCountLabel(count, one, few, many) {
  const value = Math.abs(Number(count) || 0);
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (value === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

function getFastCreatorPlannedCatalogPageCount() {
  const assignedPages = Array.isArray(fastCreatorState.lastExcelSummary?.assignedPages)
    ? fastCreatorState.lastExcelSummary.assignedPages
        .map((value) => Number(value || 0))
        .filter((value) => Number.isFinite(value) && value > 0)
    : [];
  if (assignedPages.length) {
    return Math.max(...assignedPages);
  }
  return Math.max(0, Number(fastCreatorState.lastExcelSummary?.pageCount || 0));
}

function findFastCreatorMatchedEntriesForFile(file, importIndexMap) {
  const candidates = getFastCreatorImageIndexCandidates(file?.name);
  if (!candidates.length) return [];

  for (const candidate of candidates) {
    const entries = importIndexMap.get(candidate);
    if (Array.isArray(entries) && entries.length) {
      return entries;
    }
  }
  return [];
}

function getFastCreatorMatchedImageFilesFromSelection(files = null) {
  const selectedFiles = Array.isArray(files)
    ? files.filter(Boolean)
    : (Array.isArray(fastCreatorState.selectedImageFiles) ? fastCreatorState.selectedImageFiles.filter(Boolean) : []);
  if (!selectedFiles.length) return [];

  const importIndexMap = buildFastCreatorSnapshotImportIndexMap();
  if (!(importIndexMap instanceof Map) || !importIndexMap.size) return [];

  return selectedFiles.filter((file) => findFastCreatorMatchedEntriesForFile(file, importIndexMap).length > 0);
}

function getFastCreatorMatchedImageCount() {
  if (fastCreatorState.lastImageSummary) {
    return Math.max(0, Number(
      fastCreatorState.lastImageSummary.matchedFileCount
      || fastCreatorState.lastImageSummary.matchedCount
      || 0
    ));
  }
  return getFastCreatorMatchedImageFilesFromSelection().length;
}

function getFastCreatorMatchedProductCount() {
  return Math.max(0, Number(fastCreatorState.lastImageSummary?.importedCount || 0));
}

function getFastCreatorFinalizeMetaText(selectedStyle = null) {
  const selected = selectedStyle || fastCreatorState.styleOptions.find((option) => option.id === fastCreatorState.selectedStyleId) || null;
  const productCount = Math.max(0, Number(fastCreatorState.lastExcelSummary?.productCount || 0));
  if (!productCount) {
    return selected ? `Wybrany styl: ${selected.label}` : "Brak danych o wybranym stylu.";
  }

  const assignedCount = Math.max(0, Number(fastCreatorState.lastExcelSummary?.assignedPageProductCount || 0));
  const matchedImageCount = getFastCreatorMatchedImageCount();
  const plannedPageCount = getFastCreatorPlannedCatalogPageCount();
  const hasImageSelection = Array.isArray(fastCreatorState.selectedImageFiles) && fastCreatorState.selectedImageFiles.length > 0;
  const parts = [`${productCount} produktów`];

  if (fastCreatorState.lastImageSummary || hasImageSelection) {
    parts.push(
      matchedImageCount > 0
        ? `${matchedImageCount} dopasowanych zdjęć`
        : "brak dopasowanych zdjęć"
    );
  } else {
    parts.push("zdjęcia niezaimportowane");
  }

  if (hasFastCreatorAssignedPages()) {
    parts.push(
      assignedCount >= productCount
        ? "strony dla wszystkich produktów"
        : `strony dla ${assignedCount}/${productCount} produktów`
    );
    if (plannedPageCount > 0) {
      parts.push(`${plannedPageCount} stron katalogu`);
    }
  } else {
    parts.push("brak przypisania stron");
  }

  if (selected) {
    parts.push(`Styl: ${selected.label}`);
  }

  return parts.join(" • ");
}

function getFastCreatorFinalizeSummarySentence() {
  const productCount = Math.max(0, Number(fastCreatorState.lastExcelSummary?.productCount || 0));
  if (!productCount) return "";

  const assignedCount = Math.max(0, Number(fastCreatorState.lastExcelSummary?.assignedPageProductCount || 0));
  const matchedImageCount = getFastCreatorMatchedImageCount();
  const matchedProductCount = getFastCreatorMatchedProductCount();
  const plannedPageCount = getFastCreatorPlannedCatalogPageCount();
  const hasImageSelection = Array.isArray(fastCreatorState.selectedImageFiles) && fastCreatorState.selectedImageFiles.length > 0;
  const productWord = formatFastCreatorCountLabel(productCount, "produkt", "produkty", "produktów");
  const matchedImageWord = formatFastCreatorCountLabel(matchedImageCount, "zdjęcie", "zdjęcia", "zdjęć");
  const pageWord = formatFastCreatorCountLabel(plannedPageCount, "stronie", "stronach", "stronach");

  const parts = [`Zaimportowano ${productCount} ${productWord}.`];

  if (fastCreatorState.lastImageSummary || hasImageSelection) {
    if (matchedImageCount > 0) {
      const matchedProductsInfo = matchedProductCount > 0
        ? ` do ${matchedProductCount} ${formatFastCreatorCountLabel(matchedProductCount, "produktu", "produktów", "produktów")}`
        : "";
      parts.push(`Dopasowano ${matchedImageCount} ${matchedImageWord}${matchedProductsInfo}.`);
    } else {
      parts.push("Nie wykryto jeszcze dopasowanych zdjęć.");
    }
  } else {
    parts.push("Zdjęcia nie zostały jeszcze zaimportowane.");
  }

  if (hasFastCreatorAssignedPages()) {
    parts.push(
      assignedCount >= productCount
        ? "System ma przypisane strony dla każdego produktu."
        : `System ma przypisane strony dla ${assignedCount} z ${productCount} produktów.`
    );
    if (plannedPageCount > 0) {
      parts.push(`Katalog zostanie zbudowany na ${plannedPageCount} ${pageWord}.`);
    }
  } else {
    parts.push("Excel nie zawiera pełnego przypisania produktów do stron.");
  }

  return parts.join(" ");
}

function getFastCreatorFinalizeActionLabel() {
  return hasFastCreatorAssignedPages() ? "Utwórz gotowy układ" : "Utwórz katalog";
}

function getFastCreatorFinalizeTitleText() {
  return hasFastCreatorAssignedPages() ? "Utwórz gotowy katalog" : "Utwórz katalog";
}

function getFastCreatorFinalizeCopyText() {
  return hasFastCreatorAssignedPages()
    ? "Przed utworzeniem katalogu możesz zweryfikować plan stron, liczbę indeksów na każdej stronie i szczegóły produktów. Kreator zbuduje układ zgodnie z Excelem i dopasuje go do wybranego stylu."
    : "Na tym etapie możesz zweryfikować podsumowanie importu. Po kliknięciu przejdziesz do okna Drag and Drop z produktami, dokładnie jak w styl-wlasny.js.";
}

function getFastCreatorFinalizeIdleStatusText() {
  const actionLabel = getFastCreatorFinalizeActionLabel();
  return hasFastCreatorAssignedPages()
    ? `Raport importu jest gotowy. Sprawdź plan stron i kliknij "${actionLabel}", aby utworzyć katalog zgodnie z przypisaniem z Excela.`
    : `Raport importu jest gotowy. Kliknij "${actionLabel}", aby przejść do okna Drag and Drop z produktami.`;
}

function getFastCreatorFinalizeReportEntries() {
  const importedSnapshot = Array.isArray(fastCreatorState.importedProductsSnapshot)
    ? fastCreatorState.importedProductsSnapshot.filter(Boolean)
    : [];
  if (importedSnapshot.length) return importedSnapshot;
  return Array.isArray(fastCreatorState.lastExcelSummary?.productsSnapshot)
    ? fastCreatorState.lastExcelSummary.productsSnapshot.filter(Boolean)
    : [];
}

function getFastCreatorFinalizeAssignedPageNumber(entry) {
  const candidates = [
    entry?.FASTCREATOR_ASSIGNED_PAGE_NUMBER,
    entry?.IMPORTED_ASSIGNED_PAGE,
    entry?.assignedPageNumber,
    entry?.raw?.strona,
    entry?.raw?.STRONA,
    entry?.raw?.page,
    entry?.raw?.PAGE
  ];
  for (const candidate of candidates) {
    const pageNumber = Number(candidate || 0);
    if (Number.isFinite(pageNumber) && pageNumber > 0) return pageNumber;
  }
  return null;
}

function getFastCreatorFinalizeIndexCountLabel(count) {
  const safeCount = Math.max(0, Number(count || 0));
  return `${safeCount} ${formatFastCreatorCountLabel(safeCount, "indeks", "indeksy", "indeksów")}`;
}

function getFastCreatorFinalizePreviewIndexes(items) {
  const indexes = (Array.isArray(items) ? items : [])
    .map((item) => String(item?.index || "").trim())
    .filter(Boolean);
  if (!indexes.length) return "Brak listy indeksów";
  if (indexes.length <= 3) return indexes.join(", ");
  return `${indexes.slice(0, 3).join(", ")} +${indexes.length - 3}`;
}

function getFastCreatorFinalizeVisibleFieldsLabel(includePrice, includeBarcode) {
  if (includePrice && includeBarcode) return "Cena i kod EAN";
  if (includePrice) return "Cena";
  if (includeBarcode) return "Kod EAN";
  return "Indeks i nazwa";
}

function buildFastCreatorFinalizeReportModel() {
  const entries = getFastCreatorFinalizeReportEntries();
  const selected = fastCreatorState.styleOptions.find((option) => option.id === fastCreatorState.selectedStyleId) || null;
  const includePrice = fastCreatorState.previewVisibility?.showPrice !== false;
  const includeBarcode = fastCreatorState.previewVisibility?.showBarcode === true;
  const groupedPages = new Map();
  const unassignedItems = [];

  entries.forEach((entry, order) => {
    if (!entry || typeof entry !== "object") return;
    const hydratedEntry = hydrateFastCreatorPreviewEntry(entry) || entry;
    const pageNumber = getFastCreatorFinalizeAssignedPageNumber(hydratedEntry);
    const item = {
      key: `${pageNumber || "unassigned"}-${order + 1}`,
      order: order + 1,
      index: getFastCreatorDisplayIndex(hydratedEntry),
      name: getFastCreatorDisplayName(hydratedEntry),
      price: getFastCreatorDisplayPrice(hydratedEntry),
      ean: scientificToPlainFastCreator(getFastCreatorDisplayEan(hydratedEntry) || ""),
      entry: hydratedEntry
    };

    if (pageNumber) {
      if (!groupedPages.has(pageNumber)) groupedPages.set(pageNumber, []);
      groupedPages.get(pageNumber).push(item);
    } else {
      unassignedItems.push(item);
    }
  });

  const sections = Array.from(groupedPages.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([pageNumber, items]) => ({
      key: `page-${pageNumber}`,
      type: "page",
      pageNumber,
      title: `Strona ${pageNumber}`,
      countLabel: getFastCreatorFinalizeIndexCountLabel(items.length),
      previewIndexes: getFastCreatorFinalizePreviewIndexes(items),
      items
    }));

  if (unassignedItems.length) {
    sections.push({
      key: "unassigned",
      type: "unassigned",
      pageNumber: null,
      title: "Bez przypisanej strony",
      countLabel: getFastCreatorFinalizeIndexCountLabel(unassignedItems.length),
      previewIndexes: getFastCreatorFinalizePreviewIndexes(unassignedItems),
      items: unassignedItems
    });
  }

  const plannedPageCount = Math.max(
    getFastCreatorPlannedCatalogPageCount(),
    sections.filter((section) => section.type === "page").length
  );

  return {
    productCount: Math.max(0, Number(fastCreatorState.lastExcelSummary?.productCount || entries.length || 0)),
    matchedImageCount: getFastCreatorMatchedImageCount(),
    matchedProductCount: getFastCreatorMatchedProductCount(),
    plannedPageCount,
    assignedCount: Math.max(0, Number(fastCreatorState.lastExcelSummary?.assignedPageProductCount || 0)),
    includePrice,
    includeBarcode,
    visibleFieldsLabel: getFastCreatorFinalizeVisibleFieldsLabel(includePrice, includeBarcode),
    selectedStyleLabel: selected?.label || "Brak wybranego stylu",
    sections,
    unassignedCount: unassignedItems.length
  };
}

function renderFastCreatorFinalizeReport() {
  const reportEl = fastCreatorState.elements.finalizeReport;
  const overviewEl = fastCreatorState.elements.finalizeOverview;
  const pageListEl = fastCreatorState.elements.finalizePageList;
  const detailEl = fastCreatorState.elements.finalizePageDetail;
  if (!(reportEl instanceof HTMLElement) || !(overviewEl instanceof HTMLElement) || !(pageListEl instanceof HTMLElement) || !(detailEl instanceof HTMLElement)) {
    return;
  }

  const model = buildFastCreatorFinalizeReportModel();
  if (!model.productCount) {
    reportEl.hidden = true;
    overviewEl.innerHTML = "";
    pageListEl.innerHTML = "";
    detailEl.innerHTML = "";
    return;
  }

  reportEl.hidden = false;

  const pageSummaryMeta = hasFastCreatorAssignedPages()
    ? (model.unassignedCount > 0
      ? `${model.plannedPageCount} stron w planie • ${model.unassignedCount} bez przypisania`
      : `${model.plannedPageCount} stron w planie katalogu`)
    : "Excel nie zawiera przypisania produktów do stron";

  overviewEl.innerHTML = `
    <article class="fastcreator-final-stat">
      <div class="fastcreator-final-stat__label">Produkty</div>
      <div class="fastcreator-final-stat__value">${escapeFastCreatorHtml(String(model.productCount))}</div>
      <div class="fastcreator-final-stat__meta">Zaimportowane indeksy przygotowane do katalogu.</div>
    </article>
    <article class="fastcreator-final-stat">
      <div class="fastcreator-final-stat__label">Zdjęcia</div>
      <div class="fastcreator-final-stat__value">${escapeFastCreatorHtml(String(model.matchedImageCount))}</div>
      <div class="fastcreator-final-stat__meta">Dopasowane zdjęcia dla ${escapeFastCreatorHtml(String(model.matchedProductCount || 0))} produktów.</div>
    </article>
    <article class="fastcreator-final-stat">
      <div class="fastcreator-final-stat__label">Plan stron</div>
      <div class="fastcreator-final-stat__value">${escapeFastCreatorHtml(String(model.plannedPageCount || 0))}</div>
      <div class="fastcreator-final-stat__meta">${escapeFastCreatorHtml(pageSummaryMeta)}</div>
    </article>
    <article class="fastcreator-final-stat">
      <div class="fastcreator-final-stat__label">Widoczne pola</div>
      <div class="fastcreator-final-stat__value">${escapeFastCreatorHtml(model.visibleFieldsLabel)}</div>
      <div class="fastcreator-final-stat__meta">Styl końcowy: ${escapeFastCreatorHtml(model.selectedStyleLabel)}</div>
    </article>
  `;

  if (!model.sections.length) {
    fastCreatorState.finalizeActiveReportKey = "";
    pageListEl.innerHTML = `
      <div class="fastcreator-final-empty">
        <strong>Brak planu stron w imporcie.</strong>
        Ten plik Excel nie zawiera przypisania produktów do konkretnych stron. Po utworzeniu katalogu przejdziesz do okna Drag and Drop i tam rozłożysz produkty ręcznie.
      </div>
    `;
    detailEl.innerHTML = `
      <div class="fastcreator-final-empty">
        <strong>Brak szczegółów stron.</strong>
        Szczegółowy raport strony pojawi się tutaj automatycznie, jeśli Excel będzie zawierał kolumnę z numerem strony dla produktów.
      </div>
    `;
    return;
  }

  const availableKeys = model.sections.map((section) => section.key);
  if (!availableKeys.includes(fastCreatorState.finalizeActiveReportKey)) {
    fastCreatorState.finalizeActiveReportKey = availableKeys[0] || "";
  }
  const activeSection = model.sections.find((section) => section.key === fastCreatorState.finalizeActiveReportKey) || model.sections[0];

  pageListEl.innerHTML = model.sections.map((section) => `
    <button
      type="button"
      class="fastcreator-final-page${section.key === activeSection?.key ? " is-active" : ""}"
      data-fastcreator-finalize-page="${escapeFastCreatorHtml(section.key)}"
      aria-pressed="${section.key === activeSection?.key ? "true" : "false"}"
    >
      <span class="fastcreator-final-page__eyebrow">${escapeFastCreatorHtml(section.title)}</span>
      <span class="fastcreator-final-page__title">${escapeFastCreatorHtml(section.countLabel)}</span>
      <span class="fastcreator-final-page__meta">${escapeFastCreatorHtml(section.previewIndexes)}</span>
    </button>
  `).join("");

  const detailRows = (Array.isArray(activeSection?.items) ? activeSection.items : []).map((item, index) => `
    <tr>
      <td class="fastcreator-final-table__seq">${index + 1}</td>
      <td class="fastcreator-final-table__index">${escapeFastCreatorHtml(item.index || "-")}</td>
      <td class="fastcreator-final-table__name">${escapeFastCreatorHtml(item.name || "-")}</td>
      ${model.includePrice ? `<td class="fastcreator-final-table__price">${escapeFastCreatorHtml(item.price || "-")}</td>` : ""}
      ${model.includeBarcode ? `<td class="fastcreator-final-table__barcode">${escapeFastCreatorHtml(item.ean || "-")}</td>` : ""}
    </tr>
  `).join("");

  const detailMeta = activeSection?.type === "unassigned"
    ? `${activeSection.countLabel}. Te produkty nie mają numeru strony w imporcie Excel.`
    : `${activeSection?.countLabel || "0 indeksów"}. Produkty zostaną dodane na tę stronę zgodnie z przypisaniem z Excela.`;

  detailEl.innerHTML = `
    <div class="fastcreator-final-detail__head">
      <div class="fastcreator-final-detail__title">${escapeFastCreatorHtml(activeSection?.title || "Szczegóły strony")}</div>
      <div class="fastcreator-final-detail__meta">${escapeFastCreatorHtml(detailMeta)}</div>
    </div>
    <div class="fastcreator-final-detail__table-wrap">
      <table class="fastcreator-final-table">
        <thead>
          <tr>
            <th>Lp.</th>
            <th>Indeks</th>
            <th>Nazwa produktu</th>
            ${model.includePrice ? "<th>Cena</th>" : ""}
            ${model.includeBarcode ? "<th>Kod EAN</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${detailRows}
        </tbody>
      </table>
    </div>
  `;
}

function updateFastCreatorFinalizeUi() {
  const actionLabel = getFastCreatorFinalizeActionLabel();
  if (fastCreatorState.elements.finalizeTitle) {
    fastCreatorState.elements.finalizeTitle.textContent = getFastCreatorFinalizeTitleText();
  }
  if (fastCreatorState.elements.finalizeCopy) {
    fastCreatorState.elements.finalizeCopy.textContent = getFastCreatorFinalizeCopyText();
  }
  if (fastCreatorState.elements.finalizeApplyBtn) {
    fastCreatorState.elements.finalizeApplyBtn.textContent = actionLabel;
  }
  if (fastCreatorState.elements.finalizeInlineApplyBtn) {
    fastCreatorState.elements.finalizeInlineApplyBtn.textContent = actionLabel;
  }
  renderFastCreatorFinalizeReport();
}

function renderExcelSummary(summary) {
  const stats = fastCreatorState.elements.excelStats;
  if (!stats) return;
  const statsLabels = Array.from(stats.querySelectorAll(".fastcreator-stats__label"));
  const secondaryLabel = statsLabels[1] || null;

  if (!summary || !Number.isFinite(Number(summary.productCount))) {
    stats.hidden = true;
    if (fastCreatorState.elements.importedProductsCount) {
      fastCreatorState.elements.importedProductsCount.textContent = "0";
    }
    if (fastCreatorState.elements.importedPagesCount) {
      fastCreatorState.elements.importedPagesCount.textContent = "0";
    }
    if (secondaryLabel) {
      secondaryLabel.textContent = "Przypisane do stron";
    }
    if (fastCreatorState.elements.imagesProjectMeta) {
      fastCreatorState.elements.imagesProjectMeta.textContent = "Brak danych o imporcie Excela.";
    }
    updateFastCreatorStyleSummary();
    updateFastCreatorFinalizeUi();
    return;
  }

  const assignedCount = Number(summary.assignedPageProductCount || 0);
  const hasAssignments = summary.pageAssignmentsDetected === true;
  stats.hidden = false;
  fastCreatorState.elements.importedProductsCount.textContent = String(Number(summary.productCount || 0));
  fastCreatorState.elements.importedPagesCount.textContent = String(hasAssignments ? assignedCount : 0);
  if (secondaryLabel) {
    secondaryLabel.textContent = "Przypisane do stron";
  }
  if (fastCreatorState.elements.imagesProjectMeta) {
    fastCreatorState.elements.imagesProjectMeta.textContent = hasAssignments
      ? `${Number(summary.productCount || 0)} produktów • przypisano do stron: ${assignedCount}`
      : `${Number(summary.productCount || 0)} produktów • brak przypisania do stron`;
  }
  updateFastCreatorStyleSummary();
  updateFastCreatorFinalizeUi();
}

function renderImageSummary(summary, selectedFiles = null) {
  const stats = fastCreatorState.elements.imagesStats;
  if (!stats) return;

  const selectedCount = Array.isArray(selectedFiles)
    ? selectedFiles.length
    : Array.isArray(fastCreatorState.selectedImageFiles)
      ? fastCreatorState.selectedImageFiles.length
      : 0;
  const importedCount = Number(summary?.importedCount || 0);

  if (!selectedCount && !importedCount) {
    stats.hidden = true;
    if (fastCreatorState.elements.selectedImagesCount) {
      fastCreatorState.elements.selectedImagesCount.textContent = "0";
    }
    if (fastCreatorState.elements.importedImagesCount) {
      fastCreatorState.elements.importedImagesCount.textContent = "0";
    }
    return;
  }

  stats.hidden = false;
  fastCreatorState.elements.selectedImagesCount.textContent = String(selectedCount);
  fastCreatorState.elements.importedImagesCount.textContent = String(importedCount);
}

function clearImageStepState(options = {}) {
  const shouldClearFiles = options.clearFiles !== false;
  fastCreatorState.lastImageSummary = null;
  fastCreatorState.matchedImageFiles = [];
  if (shouldClearFiles) {
    releaseFastCreatorPreviewObjectUrls();
    clearFastCreatorPreviewImageMappings();
    fastCreatorState.selectedImageFiles = [];
    if (fastCreatorState.elements.imagesInput) fastCreatorState.elements.imagesInput.value = "";
    updateImagesFileCard([]);
    renderImageSummary(null, []);
    setFastCreatorStatus("images", "Wybierz zdjęcia produktów, aby rozpocząć import.", "idle");
  } else {
    renderImageSummary(null, fastCreatorState.selectedImageFiles);
    if (Array.isArray(fastCreatorState.selectedImageFiles) && fastCreatorState.selectedImageFiles.length > 0) {
      setFastCreatorStatus("images", `Wybrano ${fastCreatorState.selectedImageFiles.length} plików. Możesz rozpocząć import zdjęć.`, "idle");
    } else {
      setFastCreatorStatus("images", "Wybierz zdjęcia produktów, aby rozpocząć import.", "idle");
    }
  }
  updateFastCreatorStyleSummary();
}

function releaseFastCreatorPreviewObjectUrls() {
  const urls = Array.isArray(fastCreatorState.previewObjectUrls)
    ? fastCreatorState.previewObjectUrls
    : [];
  urls.forEach((url) => {
    const safe = String(url || "").trim();
    if (!safe || typeof URL?.revokeObjectURL !== "function") return;
    try {
      URL.revokeObjectURL(safe);
    } catch (_error) {}
  });
  fastCreatorState.previewObjectUrls = [];
}

function clearFastCreatorPreviewImageMappings() {
  const snapshot = Array.isArray(fastCreatorState.importedProductsSnapshot)
    ? fastCreatorState.importedProductsSnapshot
    : [];
  snapshot.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    entry.previewImageUrl = "";
    entry.imageUrl = "";
    entry.IMAGE_URL = "";
    entry.ZDJECIE_URL = "";
    entry.FAMILY_IMAGE_URLS = [];
    entry.BARCODE_IMAGE_URL = "";
    entry.barcodeImageUrl = "";
    entry.FASTCREATOR_IMAGE_MATCHED = false;
  });
}

function getFastCreatorStyleBridge() {
  return (window.FastCreatorStylePreviewBridge && typeof window.FastCreatorStylePreviewBridge === "object")
    ? window.FastCreatorStylePreviewBridge
    : null;
}

function getFastCreatorRegisteredStyleMetas() {
  return Array.isArray(window.STYL_WLASNY_REGISTRY?.moduleLayouts)
    ? window.STYL_WLASNY_REGISTRY.moduleLayouts
    : [];
}

function getFastCreatorStyleMeta(styleId = "default") {
  const safeId = String(styleId || "default").trim() || "default";
  const registryMatch = getFastCreatorRegisteredStyleMetas()
    .find((item) => String(item?.id || "").trim() === safeId);
  if (registryMatch) return registryMatch;
  return {
    id: "default",
    label: "Domyslny (styl elegancki)",
    config: {}
  };
}

function getFastCreatorStyleOptions() {
  const registryOptions = getFastCreatorRegisteredStyleMetas();
  return [{ id: "default", label: "Domyslny (styl elegancki)" }].concat(
    registryOptions
      .map((option) => ({
        id: String(option?.id || "").trim(),
        label: String(option?.label || option?.id || "").trim()
      }))
      .filter((option, index, list) => option.id && option.label && list.findIndex((item) => item.id === option.id) === index)
  );
}

function getFastCreatorPreviewCatalogEntry() {
  return getFastCreatorPreviewContext().product || null;
}

function getFastCreatorPreviewImageUrl(entry) {
  if (!entry || typeof entry !== "object") return "";
  const candidates = [
    ...(Array.isArray(entry.FAMILY_IMAGE_URLS) ? entry.FAMILY_IMAGE_URLS : []),
    entry.previewImageUrl,
    entry.imageUrl,
    entry.IMAGE_URL,
    entry.ZDJECIE_URL
  ];
  for (const candidate of candidates) {
    const safe = String(candidate || "").trim();
    if (safe) return safe;
  }
  return "";
}

function getFastCreatorPreviewIndexCandidates(entry) {
  const raw = [
    entry?.CUSTOM_SOURCE_PRODUCT_INDEX,
    entry?.INDEKS
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(",");

  return raw
    .split(/[,\n;|/]+/)
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function getFastCreatorCachedImageUrl(entry) {
  const cache = window.productImageCache && typeof window.productImageCache === "object"
    ? window.productImageCache
    : null;
  if (!cache) return "";

  const candidates = getFastCreatorPreviewIndexCandidates(entry);
  for (const key of candidates) {
    const cached = cache[key];
    const url = String(cached?.original || cached?.editor || cached?.thumb || "").trim();
    if (url) return url;
  }
  return "";
}

function getFastCreatorSlotImageUrl(page, slotIndex) {
  const safeSlotIndex = Number(slotIndex);
  if (!page || !Number.isFinite(safeSlotIndex) || safeSlotIndex < 0) return "";

  const slotObject = Array.isArray(page.slotObjects) ? page.slotObjects[safeSlotIndex] : null;
  const slotObjectUrl = String(
    (typeof window.getNodeImageSource === "function"
      ? window.getNodeImageSource(slotObject, "original")
      : (slotObject?.getAttr?.("originalSrc") || slotObject?.getAttr?.("editorSrc") || slotObject?.image?.()?.src)
    ) || ""
  ).trim();
  if (slotObjectUrl) return slotObjectUrl;

  if (page.layer && typeof page.layer.find === "function") {
    try {
      const imageNode = page.layer.find((node) => {
        if (!node || typeof node.getAttr !== "function") return false;
        return !!node.getAttr("isProductImage") && Number(node.getAttr("slotIndex")) === safeSlotIndex;
      })?.[0];
      const imageNodeUrl = String(
        (typeof window.getNodeImageSource === "function"
          ? window.getNodeImageSource(imageNode, "original")
          : (imageNode?.getAttr?.("originalSrc") || imageNode?.getAttr?.("editorSrc") || imageNode?.image?.()?.src)
        ) || ""
      ).trim();
      if (imageNodeUrl) return imageNodeUrl;
    } catch (_error) {}
  }

  return "";
}

function getFastCreatorSlotBarcodeImageUrl(page, slotIndex) {
  const safeSlotIndex = Number(slotIndex);
  if (!page || !Number.isFinite(safeSlotIndex) || safeSlotIndex < 0) return "";

  const barcodeObject = Array.isArray(page.barcodeObjects) ? page.barcodeObjects[safeSlotIndex] : null;
  const barcodeObjectUrl = String(
    (typeof window.getNodeImageSource === "function"
      ? window.getNodeImageSource(barcodeObject, "original")
      : (barcodeObject?.getAttr?.("barcodeOriginalSrc") || barcodeObject?.getAttr?.("originalSrc") || barcodeObject?.image?.()?.src)
    ) || ""
  ).trim();
  if (barcodeObjectUrl) return barcodeObjectUrl;

  if (page.layer && typeof page.layer.find === "function") {
    try {
      const barcodeNode = page.layer.find((node) => {
        if (!node || typeof node.getAttr !== "function") return false;
        const slot = Number(node.getAttr("slotIndex"));
        return slot === safeSlotIndex && !!(node.getAttr("isBarcode") || node.getAttr("isEAN"));
      })?.[0];
      const barcodeNodeUrl = String(
        (typeof window.getNodeImageSource === "function"
          ? window.getNodeImageSource(barcodeNode, "original")
          : (barcodeNode?.getAttr?.("barcodeOriginalSrc") || barcodeNode?.getAttr?.("originalSrc") || barcodeNode?.image?.()?.src)
        ) || ""
      ).trim();
      if (barcodeNodeUrl) return barcodeNodeUrl;
    } catch (_error) {}
  }

  return "";
}

function scoreFastCreatorPreviewCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return -1;
  const product = candidate.product && typeof candidate.product === "object" ? candidate.product : null;
  if (!product) return -1;
  const hasImage = !!String(candidate.imageUrl || "").trim();
  const hydratedProduct = hydrateFastCreatorPreviewEntry(product) || product;
  const hasEan = !!getFastCreatorDisplayEan(hydratedProduct);
  const hasBarcodeImage = !!String(candidate.barcodeImageUrl || "").trim();
  const hasPrice = hasFastCreatorPriceValue(
    hydratedProduct?.CENA
    || hydratedProduct?.price
    || hydratedProduct?.netto
    || hydratedProduct?.CENA_NETTO_FV
    || hydratedProduct?.raw?.CENA
    || hydratedProduct?.raw?.PRICE
    || ""
  );
  let score = 0;
  if (hasImage) score += 100;
  if (hasEan) score += 80;
  if (hasBarcodeImage) score += 40;
  if (hasPrice) score += 20;
  if (candidate.page) score += 10;
  return score;
}

function pickFastCreatorBestPreviewCandidate(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  let best = null;
  let bestScore = -1;
  for (const candidate of list) {
    const score = scoreFastCreatorPreviewCandidate(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  if (!best) return { product: null, imageUrl: "", barcodeImageUrl: "" };
  return {
    ...best,
    product: hydrateFastCreatorPreviewEntry(best.product) || best.product
  };
}

function getFastCreatorPreviewContext() {
  const importedSnapshot = Array.isArray(fastCreatorState.importedProductsSnapshot)
    ? fastCreatorState.importedProductsSnapshot
    : [];
  if (importedSnapshot.length) {
    return pickFastCreatorBestPreviewCandidate(
      importedSnapshot.map((entry) => ({
        product: entry,
        imageUrl: getFastCreatorPreviewImageUrl(entry) || getFastCreatorCachedImageUrl(entry),
        barcodeImageUrl: String(entry?.BARCODE_IMAGE_URL || entry?.barcodeImageUrl || "").trim(),
        page: null,
        slotIndex: -1
      }))
    );
  }

  const pages = Array.isArray(window.pages) ? window.pages : [];
  const validPages = pages.filter((page) => page && !page.isCover);
  const candidates = [];

  for (const page of validPages) {
    const products = Array.isArray(page?.products) ? page.products : [];
    for (let slotIndex = 0; slotIndex < products.length; slotIndex += 1) {
      const entry = products[slotIndex];
      if (!entry || typeof entry !== "object") continue;
      const imageUrl =
        getFastCreatorSlotImageUrl(page, slotIndex) ||
        getFastCreatorPreviewImageUrl(entry) ||
        getFastCreatorCachedImageUrl(entry);
      candidates.push({
        product: entry,
        imageUrl,
        barcodeImageUrl: getFastCreatorSlotBarcodeImageUrl(page, slotIndex),
        page,
        slotIndex
      });
    }
  }

  for (const page of validPages) {
    const products = Array.isArray(page?.products) ? page.products : [];
    const slotIndex = products.findIndex((item) => item && typeof item === "object");
    const entry = slotIndex >= 0 ? products[slotIndex] : null;
    if (!entry) continue;
    candidates.push({
      product: entry,
      imageUrl: getFastCreatorPreviewImageUrl(entry) || getFastCreatorCachedImageUrl(entry),
      barcodeImageUrl: getFastCreatorSlotBarcodeImageUrl(page, slotIndex),
      page,
      slotIndex
    });
  }

  const fallbackProducts = Array.isArray(window.allProducts) ? window.allProducts : [];
  for (const fallbackEntry of fallbackProducts) {
    if (!fallbackEntry || typeof fallbackEntry !== "object") continue;
    candidates.push({
      product: fallbackEntry,
      imageUrl: getFastCreatorPreviewImageUrl(fallbackEntry) || getFastCreatorCachedImageUrl(fallbackEntry),
      barcodeImageUrl: "",
      page: null,
      slotIndex: -1
    });
  }
  return pickFastCreatorBestPreviewCandidate(candidates);
}

function getFastCreatorLookupKeys(entry) {
  const values = [
    entry?.INDEKS,
    entry?.CUSTOM_SOURCE_PRODUCT_INDEX,
    entry?.index,
    entry?.productIndex
  ];
  return values
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function findFastCreatorProductFallback(entry) {
  const keys = getFastCreatorLookupKeys(entry);
  if (!keys.length) return null;

  const importedSnapshot = Array.isArray(fastCreatorState.importedProductsSnapshot)
    ? fastCreatorState.importedProductsSnapshot
    : [];
  const fromSnapshot = importedSnapshot.find((candidate) => {
    const candidateKeys = getFastCreatorLookupKeys(candidate);
    return candidateKeys.some((key) => keys.includes(key));
  });
  if (fromSnapshot) return fromSnapshot;

  const allProducts = Array.isArray(window.allProducts) ? window.allProducts : [];
  const fromAllProducts = allProducts.find((candidate) => {
    const candidateKeys = getFastCreatorLookupKeys(candidate);
    return candidateKeys.some((key) => keys.includes(key));
  });
  if (fromAllProducts) return fromAllProducts;

  const pages = Array.isArray(window.pages) ? window.pages : [];
  for (const page of pages) {
    const products = Array.isArray(page?.products) ? page.products : [];
    const match = products.find((candidate) => {
      if (!candidate || candidate === entry) return false;
      const candidateKeys = getFastCreatorLookupKeys(candidate);
      return candidateKeys.some((key) => keys.includes(key));
    });
    if (match) return match;
  }

  return null;
}

function hydrateFastCreatorPreviewEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const fallback = findFastCreatorProductFallback(entry);
  if (!fallback || typeof fallback !== "object") return entry;

  const mergedRaw = {
    ...(fallback?.raw && typeof fallback.raw === "object" ? fallback.raw : {}),
    ...(entry?.raw && typeof entry.raw === "object" ? entry.raw : {})
  };
  const resolvedBarcode = getFastCreatorDisplayEan(entry) || getFastCreatorDisplayEan(fallback) || "";
  if (resolvedBarcode) {
    mergedRaw["KOD EAN"] = resolvedBarcode;
    mergedRaw.KOD_KRESKOWY = resolvedBarcode;
    mergedRaw["KOD KRESKOWY"] = resolvedBarcode;
    mergedRaw["text-right 2"] = resolvedBarcode;
    mergedRaw.ean = resolvedBarcode;
    mergedRaw.EAN = resolvedBarcode;
    mergedRaw.barcode = resolvedBarcode;
  }

  return {
    ...fallback,
    ...entry,
    CENA: hasFastCreatorPriceValue(entry?.CENA)
      ? entry.CENA
      : (hasFastCreatorPriceValue(fallback?.CENA) ? fallback.CENA : ""),
    price: hasFastCreatorPriceValue(entry?.price)
      ? entry.price
      : (hasFastCreatorPriceValue(fallback?.price) ? fallback.price : ""),
    netto: hasFastCreatorPriceValue(entry?.netto)
      ? entry.netto
      : (hasFastCreatorPriceValue(fallback?.netto) ? fallback.netto : ""),
    CENA_NETTO_FV: hasFastCreatorPriceValue(entry?.CENA_NETTO_FV)
      ? entry.CENA_NETTO_FV
      : (hasFastCreatorPriceValue(fallback?.CENA_NETTO_FV) ? fallback.CENA_NETTO_FV : ""),
    "KOD EAN": resolvedBarcode,
    KOD_KRESKOWY: resolvedBarcode || String(entry?.KOD_KRESKOWY || fallback?.KOD_KRESKOWY || "").trim(),
    "KOD KRESKOWY": resolvedBarcode || String(entry?.["KOD KRESKOWY"] || fallback?.["KOD KRESKOWY"] || "").trim(),
    ean: resolvedBarcode || String(entry?.ean || fallback?.ean || "").trim(),
    EAN: resolvedBarcode || String(entry?.EAN || fallback?.EAN || "").trim(),
    barcode: resolvedBarcode || String(entry?.barcode || fallback?.barcode || "").trim(),
    raw: mergedRaw
  };
}

function getFastCreatorInitialStyleId() {
  const fromCatalog = String(getFastCreatorPreviewCatalogEntry()?.MODULE_LAYOUT_STYLE_ID || "").trim();
  const fromState = String(fastCreatorState.selectedStyleId || "").trim();
  return fromCatalog || fromState || "default";
}

function getFastCreatorPreviewScope(scopeKey = fastCreatorState.activePreviewScopeKey) {
  const safeKey = String(scopeKey || "style").trim().toLowerCase();
  if (safeKey === "options") return fastCreatorState.elements.optionsPreviewScope || null;
  return fastCreatorState.elements.stylePreviewScope || null;
}

function getFastCreatorAllPreviewScopes() {
  return [
    fastCreatorState.elements.stylePreviewScope,
    fastCreatorState.elements.optionsPreviewScope
  ].filter((scope) => scope instanceof HTMLElement);
}

function activateFastCreatorStylePreviewIds(scopeKey = fastCreatorState.activePreviewScopeKey) {
  deactivateFastCreatorStylePreviewIds();
  fastCreatorState.activePreviewScopeKey = String(scopeKey || "style").trim().toLowerCase() === "options"
    ? "options"
    : "style";
  const scope = getFastCreatorPreviewScope(fastCreatorState.activePreviewScopeKey);
  if (!scope) return;
  scope.querySelectorAll("[data-fastcreator-preview-id]").forEach((node) => {
    const nextId = String(node.getAttribute("data-fastcreator-preview-id") || "").trim();
    if (nextId) node.id = nextId;
  });
}

function deactivateFastCreatorStylePreviewIds() {
  getFastCreatorAllPreviewScopes().forEach((scope) => {
    scope.querySelectorAll("[id^='customPreview']").forEach((node) => {
      const currentId = String(node.id || "").trim();
      if (!currentId) return;
      if (!node.hasAttribute("data-fastcreator-preview-id")) {
        node.setAttribute("data-fastcreator-preview-id", currentId);
      }
      node.removeAttribute("id");
    });
  });
}

function normalizeFastCreatorText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeFastCreatorHeaderKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readFastCreatorExcelCellAsText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function scientificToPlainFastCreator(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!/[eE]/.test(raw)) return raw;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return raw;
  try {
    return numeric.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: 20
    }).replace(/\.?0+$/, "");
  } catch (_error) {
    return raw;
  }
}

function normalizeFastCreatorEan(value) {
  const raw = scientificToPlainFastCreator(value).replace(/\D/g, "");
  if (!raw) return "";
  if (typeof window.normalizeEAN === "function") {
    try {
      return String(window.normalizeEAN(raw) || "").trim();
    } catch (_error) {}
  }
  let ean = raw;
  if (ean.length === 7) ean = ean.padStart(12, "0");
  if (ean.length === 8) return `00000${ean}`;
  if (ean.length < 12) ean = ean.padStart(12, "0");
  if (ean.length === 12) {
    const digits = ean.split("").map((char) => Number(char) || 0);
    const checksumBase = digits.reduce((sum, digit, index) => sum + (digit * (index % 2 === 0 ? 1 : 3)), 0);
    const checksum = (10 - (checksumBase % 10)) % 10;
    return `${ean}${checksum}`;
  }
  if (ean.length === 13) return ean;
  ean = ean.slice(0, 12);
  const digits = ean.split("").map((char) => Number(char) || 0);
  const checksumBase = digits.reduce((sum, digit, index) => sum + (digit * (index % 2 === 0 ? 1 : 3)), 0);
  const checksum = (10 - (checksumBase % 10)) % 10;
  return `${ean}${checksum}`;
}

function normalizeFastCreatorImportIndex(value) {
  const raw = readFastCreatorExcelCellAsText(value);
  if (!raw) return "";
  const plain = scientificToPlainFastCreator(raw);
  return plain || raw.replace(/\s+/g, "");
}

function getFastCreatorImportLookupKeys(value) {
  const raw = readFastCreatorExcelCellAsText(value);
  if (!raw) return [];
  const compact = raw.replace(/\s+/g, "");
  const normalized = normalizeFastCreatorImportIndex(raw);
  const out = new Set();
  const add = (candidate) => {
    const safe = String(candidate || "").trim();
    if (!safe) return;
    out.add(safe);
    if (/^\d+$/.test(safe)) {
      out.add(safe.replace(/^0+(?=\d)/, ""));
    }
  };
  add(compact);
  add(normalized);
  return Array.from(out).filter(Boolean);
}

function getFastCreatorHeaderColumnIndex(headerMap, fallbackIndex, aliases) {
  for (const alias of aliases) {
    const key = normalizeFastCreatorHeaderKey(alias);
    if (headerMap.has(key)) return headerMap.get(key);
  }
  return fallbackIndex;
}

async function parseFastCreatorExcelRows(file) {
  if (!file || !window.XLSX) return [];
  const buf = await file.arrayBuffer();
  const workbook = window.XLSX.read(buf, { type: "array" });
  const worksheet = workbook?.Sheets?.[workbook?.SheetNames?.[0]];
  if (!worksheet) return [];

  const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!Array.isArray(rows) || !rows.length) return [];

  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const headerMap = new Map(
    headerRow
      .map((cell, index) => [normalizeFastCreatorHeaderKey(cell), index])
      .filter(([key]) => !!key)
  );

  const readCellAt = (cells, index) => (
    Number.isInteger(index) && index >= 0
      ? readFastCreatorExcelCellAsText(cells[index])
      : ""
  );

  const cIndex = getFastCreatorHeaderColumnIndex(headerMap, 0, ["indeks", "index", "kod", "sku"]);
  const cName = getFastCreatorHeaderColumnIndex(headerMap, 1, ["nazwa towaru", "nazwa", "name"]);
  const cPrice = getFastCreatorHeaderColumnIndex(headerMap, 2, ["cena", "cena eu", "price", "netto", "cena netto", "cena netto fv"]);
  const cTnz = getFastCreatorHeaderColumnIndex(headerMap, 3, ["tnz", "oznaczenie tnz", "znacznik tnz"]);
  const cGroup = getFastCreatorHeaderColumnIndex(headerMap, 4, ["grupa produktow", "grupa produktów", "grupa", "rodzina", "group"]);
  const cEan = getFastCreatorHeaderColumnIndex(headerMap, 5, ["kod kreskowy", "kod_kreskowy", "kod ean", "ean"]);
  const cPackageValue = getFastCreatorHeaderColumnIndex(headerMap, 6, ["il opk zb", "il_opk_zb", "ilosc w opakowaniu zbiorczym", "ilość w opakowaniu zbiorczym", "pakiet"]);
  const cPackageUnit = getFastCreatorHeaderColumnIndex(headerMap, 7, ["jm", "jednostka miary", "jednostka", "pakiet jm", "pakiet_jm"]);
  const cAssignedPage = getFastCreatorHeaderColumnIndex(headerMap, 8, ["strona", "page", "numer strony", "nr strony", "strona katalogu", "strony"]);

  return rows.slice(1).map((row) => {
    const cells = Array.isArray(row) ? row : [];
    const indexRaw = readCellAt(cells, cIndex);
    const index = normalizeFastCreatorImportIndex(indexRaw);
    if (!index) return null;
    const assignedPageRaw = readCellAt(cells, cAssignedPage);
    const assignedPageNumber = Number.isFinite(Number.parseInt(assignedPageRaw, 10))
      ? Number.parseInt(assignedPageRaw, 10)
      : null;
    const raw = {};
    headerRow.forEach((header, idx) => {
      const key = String(header || "").trim();
      if (!key || Object.prototype.hasOwnProperty.call(raw, key)) return;
      raw[key] = cells[idx];
    });
    return {
      index,
      name: readCellAt(cells, cName),
      price: readCellAt(cells, cPrice),
      tnz: readCellAt(cells, cTnz),
      group: readCellAt(cells, cGroup),
      ean: readCellAt(cells, cEan),
      packageValue: readCellAt(cells, cPackageValue),
      packageUnit: readCellAt(cells, cPackageUnit),
      assignedPageRaw,
      assignedPageNumber: assignedPageNumber && assignedPageNumber > 0 ? assignedPageNumber : null,
      raw
    };
  }).filter(Boolean);
}

function buildFastCreatorImportedProductSnapshot(row, seq = 0) {
  const safeRow = row && typeof row === "object" ? row : {};
  const index = String(safeRow.index || "").trim();
  const name = String(safeRow.name || "").trim();
  const price = readFastCreatorExcelCellAsText(safeRow.price);
  const packageValue = String(safeRow.packageValue || "").trim();
  const packageUnit = String(safeRow.packageUnit || "").trim();
  const tnz = String(safeRow.tnz || "").trim();
  const group = String(safeRow.group || "").trim();
  const normalizedEan = normalizeFastCreatorEan(safeRow.ean);
  const raw = {
    ...(safeRow.raw && typeof safeRow.raw === "object" ? safeRow.raw : {})
  };

  if (index) raw.INDEKS = index;
  if (name) raw.NAZWA = name;
  if (price) {
    raw.CENA = price;
    raw.CENA_NETTO_FV = price;
  }
  if (packageValue) raw.IL_OPK_ZB = packageValue;
  if (packageUnit) raw.JM = packageUnit;
  if (tnz) raw.TNZ = tnz;
  if (group) raw.GRUPA_PRODUKTOW = group;
  if (normalizedEan) {
    raw["KOD EAN"] = normalizedEan;
    raw["KOD KRESKOWY"] = normalizedEan;
    raw.KOD_KRESKOWY = normalizedEan;
    raw["text-right 2"] = normalizedEan;
    raw.ean = normalizedEan;
    raw.EAN = normalizedEan;
    raw.barcode = normalizedEan;
  }

  return {
    id: `fastcreator-import-${seq}-${index || "produkt"}`,
    index,
    INDEKS: index,
    CUSTOM_SOURCE_PRODUCT_INDEX: index,
    productIndex: index,
    name,
    NAZWA: name,
    productName: name,
    CENA: price,
    price,
    netto: price,
    CENA_NETTO_FV: price,
    TNZ: tnz,
    group,
    packageValue,
    packageUnit,
    CUSTOM_PACKAGE_VALUE: packageValue,
    CUSTOM_PACKAGE_UNIT: packageUnit,
    IL_OPK_ZB: packageValue,
    JM: packageUnit,
    JEDNOSTKA: packageUnit,
    "KOD EAN": normalizedEan,
    "KOD KRESKOWY": normalizedEan,
    KOD_KRESKOWY: normalizedEan,
    ean: normalizedEan,
    EAN: normalizedEan,
    barcode: normalizedEan,
    FASTCREATOR_ORIGINAL_KOD_EAN: normalizedEan,
    IMPORTED_ASSIGNED_PAGE: Number.isFinite(Number(safeRow.assignedPageNumber))
      ? Number(safeRow.assignedPageNumber)
      : null,
    FASTCREATOR_ASSIGNED_PAGE_NUMBER: Number.isFinite(Number(safeRow.assignedPageNumber))
      ? Number(safeRow.assignedPageNumber)
      : null,
    IMAGE_URL: "",
    ZDJECIE_URL: "",
    previewImageUrl: "",
    FAMILY_IMAGE_URLS: [],
    raw
  };
}

function buildFastCreatorExcelSummaryFromRows(file, rows) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const assignedPageNumbers = safeRows
    .map((row) => Number(row?.assignedPageNumber || 0))
    .filter((pageNumber) => Number.isFinite(pageNumber) && pageNumber > 0);
  const uniqueAssignedPages = Array.from(new Set(assignedPageNumbers)).sort((a, b) => a - b);
  const assignedPageProductCount = assignedPageNumbers.length;
  const pageAssignmentsDetected = assignedPageProductCount > 0;

  return {
    fileName: String(file?.name || ""),
    productCount: safeRows.length,
    pageCount: uniqueAssignedPages.length,
    assignedPageProductCount,
    pageAssignmentsDetected,
    assignedPages: uniqueAssignedPages,
    productsSnapshot: safeRows.map((row, index) => buildFastCreatorImportedProductSnapshot(row, index + 1))
  };
}

async function analyzeFastCreatorExcelImport(file) {
  const rows = await parseFastCreatorExcelRows(file);
  if (!rows.length) {
    throw new Error("Plik nie zawiera żadnych wierszy z kolumną Indeks.");
  }

  const summary = buildFastCreatorExcelSummaryFromRows(file, rows);
  fastCreatorState.importedProductsSnapshot = Array.isArray(summary.productsSnapshot)
    ? summary.productsSnapshot
    : [];
  return summary;
}

function buildFastCreatorExcelRowLookup(rows) {
  const lookup = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    getFastCreatorImportLookupKeys(row?.index).forEach((key) => {
      if (key && !lookup.has(key)) lookup.set(key, row);
    });
  });
  return lookup;
}

function getFastCreatorExcelRowForEntry(lookup, entry) {
  if (!(lookup instanceof Map) || !entry || typeof entry !== "object") return null;
  const candidates = [
    entry?.CUSTOM_SOURCE_PRODUCT_INDEX,
    entry?.INDEKS,
    entry?.index,
    entry?.productIndex
  ];
  for (const candidate of candidates) {
    const keys = getFastCreatorImportLookupKeys(candidate);
    for (const key of keys) {
      const match = lookup.get(key);
      if (match) return match;
    }
  }
  return null;
}

function patchFastCreatorEntryFromExcelRow(entry, excelRow) {
  if (!entry || typeof entry !== "object" || !excelRow || typeof excelRow !== "object") return false;
  const nextRaw = entry.raw && typeof entry.raw === "object"
    ? entry.raw
    : {};
  let changed = false;

  const assign = (key, value) => {
    const safe = String(value || "").trim();
    if (!safe) return;
    if (String(entry[key] || "").trim() === safe) return;
    entry[key] = safe;
    changed = true;
  };
  const assignRaw = (key, value) => {
    const safe = String(value || "").trim();
    if (!safe) return;
    if (String(nextRaw[key] || "").trim() === safe) return;
    nextRaw[key] = safe;
    changed = true;
  };

  assign("INDEKS", excelRow.index);
  assign("NAZWA", excelRow.name);
  assign("CENA", excelRow.price);
  assign("price", excelRow.price);
  assign("netto", excelRow.price);
  assign("CENA_NETTO_FV", excelRow.price);
  assign("TNZ", excelRow.tnz);
  assign("CUSTOM_PACKAGE_VALUE", excelRow.packageValue);
  assign("CUSTOM_PACKAGE_UNIT", excelRow.packageUnit);
  assign("IL_OPK_ZB", excelRow.packageValue);
  assign("JEDNOSTKA", excelRow.packageUnit);
  assign("JM", excelRow.packageUnit);

  const normalizedEan = normalizeFastCreatorEan(excelRow.ean);
  if (normalizedEan) {
    assign("KOD_KRESKOWY", normalizedEan);
    assign("KOD EAN", normalizedEan);
    assign("KOD KRESKOWY", normalizedEan);
    assign("ean", normalizedEan);
    assign("EAN", normalizedEan);
    assign("barcode", normalizedEan);
    assign("FASTCREATOR_ORIGINAL_KOD_EAN", normalizedEan);
  }

  Object.entries(excelRow.raw || {}).forEach(([key, value]) => {
    const safeKey = String(key || "").trim();
    if (!safeKey) return;
    assignRaw(safeKey, readFastCreatorExcelCellAsText(value));
  });

  if (excelRow.price) {
    assignRaw("CENA", excelRow.price);
    assignRaw("CENA_NETTO_FV", excelRow.price);
  }
  if (excelRow.packageValue) assignRaw("IL_OPK_ZB", excelRow.packageValue);
  if (excelRow.packageUnit) assignRaw("JM", excelRow.packageUnit);
  if (normalizedEan) {
    assignRaw("KOD_KRESKOWY", normalizedEan);
    assignRaw("KOD EAN", normalizedEan);
    assignRaw("text-right 2", normalizedEan);
    assignRaw("ean", normalizedEan);
    assignRaw("EAN", normalizedEan);
    assignRaw("barcode", normalizedEan);
  }

  if (changed) {
    entry.raw = nextRaw;
  }
  return changed;
}

async function patchFastCreatorImportedDataFromExcelFile(file) {
  const rows = await parseFastCreatorExcelRows(file);
  if (!rows.length) return {
    changed: false,
    rowCount: 0,
    assignedPageProductCount: 0,
    pageAssignmentsDetected: false,
    pageCount: 0
  };

  const lookup = buildFastCreatorExcelRowLookup(rows);
  let changed = false;
  const patchRuntime = false;
  const assignedPageProductCount = rows.filter((row) => Number(row?.assignedPageNumber || 0) > 0).length;
  const pageAssignmentsDetected = assignedPageProductCount > 0;
  const pageCount = Array.from(
    new Set(
      rows
        .map((row) => Number(row?.assignedPageNumber || 0))
        .filter((pageNumber) => Number.isFinite(pageNumber) && pageNumber > 0)
    )
  ).length;

  const patchList = (list) => {
    if (!Array.isArray(list)) return;
    list.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const excelRow = getFastCreatorExcelRowForEntry(lookup, entry);
      if (excelRow && patchFastCreatorEntryFromExcelRow(entry, excelRow)) {
        changed = true;
      }
    });
  };

  patchList(fastCreatorState.importedProductsSnapshot);
  if (patchRuntime) {
    patchList(window.allProducts);
    (Array.isArray(window.pages) ? window.pages : []).forEach((page) => patchList(page?.products));
  }

  return {
    changed,
    rowCount: rows.length,
    assignedPageProductCount,
    pageAssignmentsDetected,
    pageCount
  };
}

function getFastCreatorImageIndexCandidates(fileName) {
  const baseName = String(fileName || "").trim().replace(/\.[^.]+$/, "");
  if (!baseName) return [];
  const out = new Set();
  const pushCandidate = (candidate) => {
    getFastCreatorImportLookupKeys(candidate).forEach((key) => {
      if (key) out.add(key);
    });
  };

  pushCandidate(baseName);
  baseName.split(/[^A-Za-z0-9]+/g).forEach(pushCandidate);
  (baseName.match(/\d{4,}/g) || []).forEach(pushCandidate);
  return Array.from(out);
}

function buildFastCreatorSnapshotImportIndexMap() {
  const map = new Map();
  (Array.isArray(fastCreatorState.importedProductsSnapshot) ? fastCreatorState.importedProductsSnapshot : []).forEach((entry) => {
    getFastCreatorImportLookupKeys(
      entry?.CUSTOM_SOURCE_PRODUCT_INDEX
      || entry?.INDEKS
      || entry?.index
      || entry?.productIndex
    ).forEach((key) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    });
  });
  return map;
}

async function runExistingImagesImport(files) {
  const selectedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  if (!selectedFiles.length) {
    throw new Error("Najpierw wybierz zdjęcia produktów.");
  }

  const snapshot = Array.isArray(fastCreatorState.importedProductsSnapshot)
    ? fastCreatorState.importedProductsSnapshot
    : [];
  if (!snapshot.length) {
    throw new Error("Najpierw zaimportuj dane Excel.");
  }

  releaseFastCreatorPreviewObjectUrls();
  clearFastCreatorPreviewImageMappings();

  const importIndexMap = buildFastCreatorSnapshotImportIndexMap();
  let matchedCount = 0;
  const matchedProductKeys = new Set();
  const matchedFiles = [];

  selectedFiles.forEach((file) => {
    const matchedEntries = findFastCreatorMatchedEntriesForFile(file, importIndexMap);
    if (!matchedEntries.length) return;
    matchedFiles.push(file);

    let previewUrl = "";
    if (typeof URL?.createObjectURL === "function") {
      try {
        previewUrl = URL.createObjectURL(file);
      } catch (_error) {
        previewUrl = "";
      }
    }
    if (!previewUrl) return;

    fastCreatorState.previewObjectUrls.push(previewUrl);
    matchedCount += 1;
    matchedEntries.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      entry.previewImageUrl = previewUrl;
      entry.imageUrl = previewUrl;
      entry.IMAGE_URL = previewUrl;
      entry.ZDJECIE_URL = previewUrl;
      entry.FAMILY_IMAGE_URLS = [previewUrl];
      entry.FASTCREATOR_IMAGE_MATCHED = true;
      matchedProductKeys.add(
        String(
          entry?.CUSTOM_SOURCE_PRODUCT_INDEX
          || entry?.INDEKS
          || entry?.index
          || entry?.id
          || ""
        )
      );
    });
  });

  return {
    selectedCount: selectedFiles.length,
    matchedCount,
    matchedFileCount: matchedFiles.length,
    matchedFiles,
    importedCount: matchedProductKeys.size,
    unmatchedCount: Math.max(0, selectedFiles.length - matchedCount)
  };
}

function getFastCreatorImagesForFinalize() {
  if (fastCreatorState.lastImageSummary) {
    return Array.isArray(fastCreatorState.matchedImageFiles)
      ? fastCreatorState.matchedImageFiles.slice()
      : [];
  }
  return getFastCreatorMatchedImageFilesFromSelection();
}

function closeFastCreatorDraftTrayIfOpen() {
  if (window.CustomStyleDraftTrayUI && typeof window.CustomStyleDraftTrayUI.close === "function") {
    try {
      window.CustomStyleDraftTrayUI.close();
    } catch (_error) {}
  }
  const tray = document.getElementById("customStyleDraftTray");
  if (tray instanceof HTMLElement) {
    tray.style.display = "none";
  }
}

function getFastCreatorPagesForMagicLayout() {
  return (Array.isArray(window.pages) ? window.pages : [])
    .filter((page) => page && !page.isCover)
    .filter((page) => Array.isArray(page.products) && page.products.some((product) => !!product));
}

function getFastCreatorPageOccupiedSlotIndexes(page) {
  if (!page) return [];
  const indexes = new Set();
  (Array.isArray(page.products) ? page.products : []).forEach((product, index) => {
    if (product) indexes.add(index);
  });
  (Array.isArray(page.slotObjects) ? page.slotObjects : []).forEach((node, index) => {
    if (node) indexes.add(index);
  });
  return Array.from(indexes).sort((a, b) => a - b);
}

function getFastCreatorPageProductCount(page) {
  return (Array.isArray(page?.products) ? page.products : []).reduce(
    (count, product) => count + (product ? 1 : 0),
    0
  );
}

function getFastCreatorPageModuleRectCount(page) {
  const getRects = window.getCatalogPageProductModuleRects;
  if (typeof getRects !== "function") return 0;
  try {
    const rects = getRects(page);
    return Array.isArray(rects) ? rects.length : 0;
  } catch (_error) {
    return 0;
  }
}

function isFastCreatorPagePostInsertBusy(page) {
  const bag = page && typeof page === "object" ? page._customInsertTaskBag : null;
  const timeoutIds = Array.isArray(bag?.timeoutIds) ? bag.timeoutIds.filter(Boolean) : [];
  return timeoutIds.length > 1;
}

function fastCreatorRectsOverlap(a, b, tolerance = 1) {
  const rectA = a && typeof a === "object" ? a : null;
  const rectB = b && typeof b === "object" ? b : null;
  if (!rectA || !rectB) return false;
  const pad = Math.max(0, Number(tolerance) || 0);
  return !(
    (Number(rectA.x) + Number(rectA.width) - pad) <= Number(rectB.x) ||
    (Number(rectB.x) + Number(rectB.width) - pad) <= Number(rectA.x) ||
    (Number(rectA.y) + Number(rectA.height) - pad) <= Number(rectB.y) ||
    (Number(rectB.y) + Number(rectB.height) - pad) <= Number(rectA.y)
  );
}

function pageHasFastCreatorModuleOverlaps(page) {
  const getRects = window.getCatalogPageProductModuleRects;
  if (typeof getRects !== "function") return false;
  const rects = getRects(page);
  if (!Array.isArray(rects) || rects.length < 2) return false;
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      if (fastCreatorRectsOverlap(rects[i], rects[j], 2)) {
        return true;
      }
    }
  }
  return false;
}

function clearFastCreatorPageSelectionDecor(page) {
  if (!page) return;
  try { page.hideFloatingButtons?.(); } catch (_error) {}
  try { page.selectedNodes = []; } catch (_error) {}
  try {
    page.transformer?.nodes?.([]);
    page.transformer?.forceUpdate?.();
  } catch (_error) {}
  try {
    page.layer?.find?.(".selectionOutline")?.forEach?.((node) => node?.destroy?.());
  } catch (_error) {}
  page.layer?.batchDraw?.();
  page.transformerLayer?.batchDraw?.();
}

function clearFastCreatorAutoLayoutSelectionDecor() {
  (Array.isArray(window.pages) ? window.pages : []).forEach((page) => {
    clearFastCreatorPageSelectionDecor(page);
  });
}

async function waitForFastCreatorPagesToSettle(pages, options = {}) {
  const list = (Array.isArray(pages) ? pages : []).filter(Boolean);
  if (!list.length) return;
  const timeoutMs = Math.max(500, Number(options.timeoutMs || 1800));
  const intervalMs = Math.max(40, Number(options.intervalMs || 90));
  const requireModuleMatch = options.requireModuleMatch !== false;
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    let ready = true;

    for (let index = 0; index < list.length; index += 1) {
      const page = list[index];
      if (!page) continue;

      if (typeof window.ensurePageHydrated === "function") {
        try {
          await window.ensurePageHydrated(page, {
            reason: options.reason || "fastcreator-layout-settle"
          });
        } catch (_error) {}
      }

      if (page.__customStyleLazyHydrationPromise) {
        ready = false;
        break;
      }

      if (isFastCreatorPagePostInsertBusy(page)) {
        ready = false;
        break;
      }

      const expectedModules = getFastCreatorPageProductCount(page);
      const actualModules = getFastCreatorPageModuleRectCount(page);
      if (requireModuleMatch && expectedModules > 0 && actualModules !== expectedModules) {
        ready = false;
        break;
      }
    }

    if (ready) return;
    await waitFastCreatorMs(intervalMs);
  }
}

async function settleFastCreatorPageBeforeAutoLayout(page, options = {}) {
  if (!page) return;
  if (typeof window.ensurePageHydrated === "function") {
    try {
      await window.ensurePageHydrated(page, { reason: options.reason || "fastcreator-auto-layout" });
    } catch (_error) {}
  }
  const timeoutMs = Math.max(300, Number(options.timeoutMs || 1200));
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < timeoutMs) {
    const expectedModules = getFastCreatorPageProductCount(page);
    const actualModules = getFastCreatorPageModuleRectCount(page);
    if (
      !page.__customStyleLazyHydrationPromise &&
      !isFastCreatorPagePostInsertBusy(page) &&
      (!expectedModules || actualModules === expectedModules)
    ) {
      break;
    }
    await waitFastCreatorMs(70);
  }
  page.layer?.batchDraw?.();
  page.transformerLayer?.batchDraw?.();
  await waitFastCreatorMs(Math.max(20, Number(options.extraWaitMs || 45)));
}

async function settleFastCreatorPageAfterAutoLayout(page, options = {}) {
  if (!page) return;
  await waitFastCreatorMs(Math.max(60, Number(options.extraWaitMs || 140)));
  if (typeof window.requestAnimationFrame === "function") {
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    });
  }
  page.layer?.batchDraw?.();
  page.transformerLayer?.batchDraw?.();
}

async function autoArrangeFastCreatorPagesByMagicLayout(styleId) {
  const applyQuickLayout = window.applyQuickAiMagicLayoutForPage;
  const pages = getFastCreatorPagesForMagicLayout();
  if (typeof applyQuickLayout !== "function" || !pages.length) {
    return {
      available: typeof applyQuickLayout === "function",
      attempted: pages.length,
      applied: 0,
      failed: 0
    };
  }

  const safeStyleId = String(styleId || "default").trim() || "default";
  let applied = 0;
  await waitForFastCreatorPagesToSettle(pages, {
    timeoutMs: 1600,
    intervalMs: 90,
    reason: "fastcreator-auto-layout-batch"
  });

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    setFastCreatorStatus(
      "finalize",
      `Porządkuję układ stron przez Magic Layout: ${index + 1}/${pages.length}...`,
      "loading"
    );
    try {
      await settleFastCreatorPageBeforeAutoLayout(page, {
        reason: "fastcreator-auto-layout",
        timeoutMs: 1200,
        extraWaitMs: 40
      });
      const ok = await applyQuickLayout(page, {
        styleMode: `style:${safeStyleId}`,
        pickMode: "best",
        randomRounds: 2,
        maxRandomPresets: page && getFastCreatorPageProductCount(page) <= 4 ? 960 : 760,
        showToast: false,
        effect: false
      });
      await settleFastCreatorPageAfterAutoLayout(page, {
        extraWaitMs: 110
      });
      const hasOverlap = pageHasFastCreatorModuleOverlaps(page);
      if (ok && !hasOverlap) applied += 1;
    } catch (_error) {}
    clearFastCreatorPageSelectionDecor(page);
    if (index < pages.length - 1) {
      await waitFastCreatorMs(18);
    }
  }

  clearFastCreatorAutoLayoutSelectionDecor();

  return {
    available: true,
    attempted: pages.length,
    applied,
    failed: Math.max(0, pages.length - applied)
  };
}

async function runFastCreatorDeferredMagicLayoutPasses(styleId) {
  let latestResult = {
    available: typeof window.applyQuickAiMagicLayoutForPage === "function",
    attempted: 0,
    applied: 0,
    failed: 0
  };

  const pages = getFastCreatorPagesForMagicLayout();
  if (!pages.length) return latestResult;

  setFastCreatorStatus("finalize", "Czekam aż strony dokończą własny układ po imporcie...", "loading");
  await waitFastCreatorMs(700);
  await waitForFastCreatorPagesToSettle(pages, {
    timeoutMs: 1800,
    intervalMs: 90,
    reason: "fastcreator-deferred-layout"
  });

  setFastCreatorStatus("finalize", "Układam strony przez AI szybki układ...", "loading");
  latestResult = await autoArrangeFastCreatorPagesByMagicLayout(styleId);

  if (latestResult.attempted > 0 && latestResult.applied < latestResult.attempted) {
    setFastCreatorStatus("finalize", "Koryguję strony, które nie ułożyły się idealnie za pierwszym razem...", "loading");
    await waitFastCreatorMs(320);
    await waitForFastCreatorPagesToSettle(pages, {
      timeoutMs: 900,
      intervalMs: 80,
      reason: "fastcreator-deferred-layout-retry"
    });
    latestResult = mergeFastCreatorAutoLayoutResults(
      latestResult,
      await autoArrangeFastCreatorPagesByMagicLayout(styleId)
    );
  }

  return latestResult;
}

function mergeFastCreatorAutoLayoutResults(primary, secondary) {
  const first = primary && typeof primary === "object" ? primary : {};
  const second = secondary && typeof secondary === "object" ? secondary : {};
  const attempted = Math.max(0, Number(first.attempted || 0), Number(second.attempted || 0));
  const applied = Math.min(
    attempted,
    Math.max(0, Number(first.applied || 0), Number(second.applied || 0))
  );
  return {
    available: !!(first.available || second.available),
    attempted,
    applied,
    failed: Math.max(0, attempted - applied)
  };
}

function getFastCreatorPreviewElement(id) {
  const safeId = String(id || "").trim();
  if (!safeId) return null;
  return document.getElementById(safeId)
    || getFastCreatorPreviewScope()?.querySelector(`[data-fastcreator-preview-id="${safeId}"]`)
    || null;
}

function ensureFastCreatorPreviewSnapshotLayer() {
  const card = getFastCreatorPreviewElement("customPreviewCard");
  if (!(card instanceof HTMLElement)) return null;
  let layer = card.querySelector("[data-fastcreator-preview-snapshot]");
  if (!(layer instanceof HTMLElement)) {
    layer = document.createElement("div");
    layer.setAttribute("data-fastcreator-preview-snapshot", "true");
    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    layer.style.transformOrigin = "left top";
    layer.style.zIndex = "15";
    layer.style.display = "none";
    card.appendChild(layer);
  }
  return layer;
}

function setFastCreatorPreviewSnapshotMode(enabled) {
  [
    "customPreviewImagesTrack",
    "customPreviewDivider",
    "customPreviewName",
    "customPreviewIndex",
    "customPreviewPackageInfo",
    "customPreviewFlag",
    "customPreviewPriceCircle"
  ].forEach((id) => {
    const el = getFastCreatorPreviewElement(id);
    if (el instanceof HTMLElement) {
      el.style.visibility = enabled ? "hidden" : "";
    }
  });
  const layer = ensureFastCreatorPreviewSnapshotLayer();
  if (layer instanceof HTMLElement) {
    layer.style.display = enabled ? "block" : "none";
    if (!enabled) layer.innerHTML = "";
  }
  if (!enabled) fastCreatorSnapshotPreviewRenderStamp += 1;
}

function ensureFastCreatorPreviewImageElement() {
  const track = getFastCreatorPreviewElement("customPreviewImagesTrack");
  if (!(track instanceof HTMLElement)) return null;
  let img = getFastCreatorPreviewElement("customPreviewImage");
  if (!(img instanceof HTMLImageElement) || img.parentElement !== track) {
    track.innerHTML = "";
    img = document.createElement("img");
    img.alt = "Podglad produktu";
    img.setAttribute("data-fastcreator-preview-id", "customPreviewImage");
    track.appendChild(img);
  }
  return img;
}

function ensureFastCreatorPreviewBarcodeImageElement() {
  const wrap = getFastCreatorPreviewElement("customPreviewBarcodeWrap");
  if (!(wrap instanceof HTMLElement)) return null;
  let img = getFastCreatorPreviewElement("customPreviewBarcodeImage");
  if (!(img instanceof HTMLImageElement) || img.parentElement !== wrap) {
    img = document.createElement("img");
    img.alt = "Kod EAN";
    img.setAttribute("data-fastcreator-preview-id", "customPreviewBarcodeImage");
    img.style.display = "none";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    wrap.appendChild(img);
  }
  return img;
}

function getFastCreatorStyleFontPreset(styleId) {
  return FASTCREATOR_STYLE_FONT_PRESETS[String(styleId || "default").trim() || "default"]
    || FASTCREATOR_STYLE_FONT_PRESETS.default;
}

function normalizeFastCreatorAlign(value, fallback = "left") {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "center" || raw === "flex-center") return "center";
  if (raw === "right" || raw === "end" || raw === "flex-end") return "right";
  if (raw === "left" || raw === "start" || raw === "flex-start") return "left";
  return fallback;
}

function normalizeFastCreatorScale(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0.35, Math.min(4, parsed));
}

function isFastCreatorSingleStyle(styleMetaOrId) {
  const styleMeta = typeof styleMetaOrId === "string"
    ? getFastCreatorStyleMeta(styleMetaOrId)
    : styleMetaOrId;
  const styleId = String(styleMeta?.id || "").trim();
  const cfg = styleMeta?.config && typeof styleMeta.config === "object"
    ? styleMeta.config
    : {};
  return styleId === "styl-numer-1"
    || styleId === "styl-numer-2"
    || styleId === "styl-numer-3"
    || !!(cfg.singleDirect && typeof cfg.singleDirect === "object")
    || !!(cfg.text && typeof cfg.text === "object");
}

function hasFastCreatorPriceValue(value) {
  return /\d/.test(String(value ?? ""));
}

function isFastCreatorNumericOnly(value) {
  const safe = scientificToPlainFastCreator(value)
    .replace(/\s+/g, "")
    .replace(",", ".")
    .trim();
  return !!safe && /^-?\d+(?:\.\d+)?$/.test(safe);
}

function getFastCreatorDisplayName(entry) {
  const candidates = [
    entry?.NAZWA,
    entry?.name,
    entry?.productName,
    entry?.NAZWA_TOWARU
  ];
  for (const candidate of candidates) {
    const safe = String(candidate || "").trim();
    if (safe) return safe;
  }
  return "-";
}

function getFastCreatorDisplayIndex(entry) {
  const candidates = [
    entry?.INDEKS,
    entry?.index,
    entry?.productIndex,
    entry?.CUSTOM_SOURCE_PRODUCT_INDEX
  ];
  for (const candidate of candidates) {
    const safe = String(candidate || "").trim();
    if (safe) return safe;
  }
  return "-";
}

function getFastCreatorDisplayEan(entry) {
  const candidates = [
    entry?.["KOD EAN"],
    entry?.["KOD KRESKOWY"],
    entry?.KOD_KRESKOWY,
    entry?.["text-right 2"],
    entry?.ean,
    entry?.EAN,
    entry?.kodKreskowy,
    entry?.barcode,
    entry?.excelProduct?.["KOD EAN"],
    entry?.excelProduct?.["KOD KRESKOWY"],
    entry?.excelProduct?.KOD_KRESKOWY,
    entry?.excelProduct?.ean,
    entry?.source?.["KOD EAN"],
    entry?.source?.["KOD KRESKOWY"],
    entry?.source?.KOD_KRESKOWY,
    entry?.source?.ean,
    entry?.FASTCREATOR_ORIGINAL_KOD_EAN,
    entry?.raw?.["KOD EAN"],
    entry?.raw?.["KOD KRESKOWY"],
    entry?.raw?.KOD_KRESKOWY,
    entry?.raw?.["text-right 2"],
    entry?.raw?.ean,
    entry?.raw?.EAN,
    entry?.raw?.["kod kreskowy"],
    entry?.raw?.kod_kreskowy,
    entry?.raw?.barcode,
    entry?.row?.["KOD EAN"],
    entry?.row?.["KOD KRESKOWY"],
    entry?.row?.KOD_KRESKOWY,
    entry?.row?.["text-right 2"],
    entry?.row?.ean
  ];
  for (const candidate of candidates) {
    const safe = normalizeFastCreatorEan(candidate);
    if (safe) return safe;
  }
  return "";
}

function getFastCreatorPreviewBarcodeImageUrl(previewContext, catalogEntry = null, sourceEntry = null) {
  const candidates = [
    previewContext?.barcodeImageUrl,
    catalogEntry?.barcodeImageUrl,
    catalogEntry?.BARCODE_IMAGE_URL,
    sourceEntry?.barcodeImageUrl,
    sourceEntry?.BARCODE_IMAGE_URL,
    catalogEntry?.raw?.barcodeImageUrl,
    catalogEntry?.raw?.BARCODE_IMAGE_URL,
    sourceEntry?.raw?.barcodeImageUrl,
    sourceEntry?.raw?.BARCODE_IMAGE_URL
  ];
  for (const candidate of candidates) {
    const safe = String(candidate || "").trim();
    if (safe) return safe;
  }
  return "";
}

async function syncFastCreatorPreviewBarcodeOverlay(options = {}) {
  const barcodeWrap = getFastCreatorPreviewElement("customPreviewBarcodeWrap");
  const barcodeEl = getFastCreatorPreviewElement("customPreviewBarcode");
  const barcodeImageEl = ensureFastCreatorPreviewBarcodeImageElement();
  if (!(barcodeWrap instanceof HTMLElement)) return false;

  const previewCatalogEntry = options.previewCatalogEntry && typeof options.previewCatalogEntry === "object"
    ? options.previewCatalogEntry
    : null;
  const sourceEntry = options.sourceEntry && typeof options.sourceEntry === "object"
    ? options.sourceEntry
    : null;
  const previewContext = options.previewContext && typeof options.previewContext === "object"
    ? options.previewContext
    : null;
  const previewVisibility = options.previewVisibility && typeof options.previewVisibility === "object"
    ? options.previewVisibility
    : null;
  const showBarcode = previewVisibility?.showBarcode === true;
  const eanDigits = getFastCreatorDisplayEan(previewCatalogEntry || sourceEntry);
  const barcodeImageUrl = getFastCreatorPreviewBarcodeImageUrl(previewContext, previewCatalogEntry, sourceEntry);
  const canShow = showBarcode && !!(eanDigits || barcodeImageUrl);
  const skipBecauseSnapshotAlreadyShowsBarcode = !!options.skipWhenSnapshotHasBarcode;

  let snapshotHasBarcode = false;
  if (skipBecauseSnapshotAlreadyShowsBarcode) {
    const layer = ensureFastCreatorPreviewSnapshotLayer();
    snapshotHasBarcode = !!(layer instanceof HTMLElement && layer.querySelector('[data-fastcreator-snapshot-kind="ean"]'));
  }

  if (!canShow || snapshotHasBarcode) {
    barcodeWrap.style.display = "none";
    barcodeWrap.style.zIndex = "";
    barcodeWrap.style.pointerEvents = "";
    if (barcodeEl instanceof SVGElement) {
      barcodeEl.innerHTML = "";
      barcodeEl.style.display = "none";
    }
    if (barcodeImageEl instanceof HTMLImageElement) {
      barcodeImageEl.style.display = "none";
      barcodeImageEl.removeAttribute("src");
    }
    return false;
  }

  barcodeWrap.style.visibility = "";
  barcodeWrap.style.display = "block";
  barcodeWrap.style.zIndex = "30";
  barcodeWrap.style.pointerEvents = "none";

  if (barcodeEl instanceof SVGElement) {
    barcodeEl.innerHTML = "";
    barcodeEl.style.display = "none";
  }
  if (barcodeImageEl instanceof HTMLImageElement) {
    barcodeImageEl.style.display = "none";
    barcodeImageEl.removeAttribute("src");
  }

  if (barcodeEl instanceof SVGElement && window.JsBarcode && eanDigits) {
    try {
      window.JsBarcode(barcodeEl, eanDigits, {
        format: "EAN13",
        displayValue: true,
        fontSize: 10,
        height: 54,
        width: 1.45,
        margin: 0,
        background: "transparent"
      });
      barcodeEl.removeAttribute("width");
      barcodeEl.removeAttribute("height");
      barcodeEl.style.width = "100%";
      barcodeEl.style.height = "100%";
      barcodeEl.style.display = "block";
      return true;
    } catch (_error) {
      barcodeEl.innerHTML = "";
      barcodeEl.style.display = "none";
    }
  }

  if (barcodeImageEl instanceof HTMLImageElement && barcodeImageUrl) {
    barcodeImageEl.src = barcodeImageUrl;
    barcodeImageEl.style.display = "block";
    return true;
  }

  barcodeWrap.style.display = "none";
  return false;
}

function getFastCreatorDisplayPrice(entry) {
  const candidates = [
    entry?.CENA,
    entry?.price,
    entry?.netto,
    entry?.priceValue,
    entry?.IMPORTED_PRICE,
    entry?.CENA_NETTO_FV,
    entry?.raw?.CENA_NETTO_FV,
    entry?.raw?.CENA,
    entry?.raw?.price,
    entry?.raw?.PRICE,
    entry?.PRICE,
    entry?.CENA_BRUTTO,
    entry?.CENA_NETTO,
    entry?.raw?.CENA_BRUTTO,
    entry?.raw?.CENA_NETTO,
    entry?.row?.price
  ];
  for (const candidate of candidates) {
    if (candidate === 0 || candidate === "0") return "0.00";
    const safe = String(candidate || "").trim();
    if (safe) return safe;
  }

  const numericFallbacks = [
    entry?.CUSTOM_PACKAGE_VALUE,
    entry?.packageValue,
    entry?.IL_OPK_ZB,
    entry?.JEDNOSTKA,
    entry?.JM
  ];
  for (const candidate of numericFallbacks) {
    if (!isFastCreatorNumericOnly(candidate)) continue;
    return String(candidate || "").trim();
  }
  return "";
}

function formatFastCreatorPrice(value) {
  const raw = scientificToPlainFastCreator(value)
    .replace(/\s+/g, "")
    .replace(/[^\d,.\-]/g, "");
  if (!raw) {
    return { main: "0", dec: "00", currency: "£" };
  }

  let normalized = raw;
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    normalized = normalized.replace(",", ".");
  }

  const numeric = Number.parseFloat(normalized);
  if (Number.isFinite(numeric)) {
    const abs = Math.abs(numeric);
    let main = Math.floor(abs);
    let dec = Math.round((abs - main) * 100);
    if (dec >= 100) {
      main += 1;
      dec = 0;
    }
    return {
      main: String(main),
      dec: String(dec).padStart(2, "0"),
      currency: "£"
    };
  }

  const parts = normalized.split(".");
  return {
    main: String(parts[0] || "0").replace(/[^\d]/g, "") || "0",
    dec: String(parts[1] || "00").replace(/[^\d]/g, "").padEnd(2, "0").slice(0, 2),
    currency: "£"
  };
}

function getFastCreatorCurrencySymbol(entry, fallback = "£") {
  const raw = String(
    entry?.PRICE_CURRENCY_SYMBOL
    || entry?.CURRENCY_SYMBOL
    || entry?.WALUTA
    || entry?.currency
    || fallback
    || "£"
  ).trim();
  const normalized = normalizeFastCreatorText(raw);
  if (!normalized) return fallback;
  if (normalized === "pln" || normalized === "zl" || normalized === "zl.") return "zł";
  if (normalized === "eur" || raw === "€") return "€";
  if (normalized === "usd" || raw === "$") return "$";
  return raw;
}

function isFastCreatorWeightProduct(entry) {
  const unit = normalizeFastCreatorText(
    entry?.JEDNOSTKA
    || entry?.JM
    || entry?.packageUnit
    || entry?.CUSTOM_PACKAGE_UNIT
    || entry?.UNIT
    || ""
  );
  return unit === "kg" || unit === "kilogram" || unit === "kilogramy";
}

function buildFastCreatorPackageText(entry) {
  const explicit = String(entry?.CUSTOM_PACKAGE_INFO_TEXT || "").trim();
  if (explicit) return explicit;
  const value = String(
    entry?.CUSTOM_PACKAGE_VALUE
    || entry?.packageValue
    || entry?.IL_OPK_ZB
    || entry?.ILOSC
    || ""
  ).trim();
  const unit = String(
    entry?.CUSTOM_PACKAGE_UNIT
    || entry?.packageUnit
    || entry?.JEDNOSTKA
    || entry?.JM
    || ""
  ).trim();
  if (!value && isFastCreatorNumericOnly(unit)) return "";
  const joined = [value, unit].filter(Boolean).join(" ").trim();
  if (joined && isFastCreatorNumericOnly(joined) && (!value || !unit)) return "";
  return joined ? `OPAK: ${joined}` : "";
}

function inferFastCreatorFlagCode(entry) {
  const rawCountry = String(
    entry?.KRAJPOCHODZENIA
    || entry?.raw?.["text-left 3"]
    || entry?.country
    || ""
  ).trim();
  const hay = normalizeFastCreatorText(rawCountry);
  if (hay.includes("rumun")) return "RO";
  if (hay.includes("ukrain")) return "UA";
  if (hay.includes("litw")) return "LT";
  if (hay.includes("bulgar")) return "BG";
  if (hay.includes("polsk")) return "PL";
  return rawCountry ? rawCountry.slice(0, 2).toUpperCase() : "XX";
}

function getFastCreatorRegisteredPriceBadgeStyles() {
  return Array.isArray(window.STYL_WLASNY_REGISTRY?.priceBadges)
    ? window.STYL_WLASNY_REGISTRY.priceBadges
    : [];
}

function buildFastCreatorStorageMediaUrl(objectPath) {
  const safePath = String(objectPath || "").trim();
  return safePath ? `${FASTCREATOR_STORAGE_MEDIA_BASE}${encodeURIComponent(safePath)}?alt=media` : "";
}

function makeFastCreatorPriceCircleDataUrl(color) {
  const safeColor = String(color || "#d71920").trim() || "#d71920";
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = safeColor;
  ctx.beginPath();
  ctx.arc(120, 120, 118, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  return canvas.toDataURL("image/png");
}

function getFastCreatorPriceBadgeMeta(styleMeta, entry) {
  const cfg = styleMeta?.config && typeof styleMeta.config === "object"
    ? styleMeta.config
    : {};
  const textCfg = cfg.text && typeof cfg.text === "object"
    ? cfg.text
    : {};
  const explicitId = String(
    cfg.priceBadgeStyleId
    || textCfg.priceBadgeStyleId
    || entry?.PRICE_BG_STYLE_ID
    || "solid"
  ).trim() || "solid";
  const explicitUrl = String(
    cfg.priceBadgeStyleUrl
    || textCfg.priceBadgeStyleUrl
    || entry?.PRICE_BG_IMAGE_URL
    || ""
  ).trim();
  const explicitPath = String(
    cfg.priceBadgeStylePath
    || textCfg.priceBadgeStylePath
    || ""
  ).trim();
  const registered = getFastCreatorRegisteredPriceBadgeStyles()
    .find((item) => String(item?.id || "").trim() === explicitId);
  const url = explicitUrl
    || String(registered?.url || "").trim()
    || buildFastCreatorStorageMediaUrl(explicitPath || registered?.path || "");
  return {
    id: explicitId,
    url,
    isImageBadge: explicitId !== "solid" && !!url
  };
}

function getFastCreatorSingleDirectLayoutSpec(styleMeta, hasImagePriceBadge) {
  const cfg = styleMeta?.config && typeof styleMeta.config === "object"
    ? styleMeta.config
    : {};
  const single = cfg.singleDirect && typeof cfg.singleDirect === "object"
    ? cfg.singleDirect
    : {};
  const text = cfg.text && typeof cfg.text === "object"
    ? cfg.text
    : {};
  const readNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    imgArea: {
      x: readNumber(single?.imgArea?.x, 2.8),
      y: readNumber(single?.imgArea?.y, 16.5),
      w: readNumber(single?.imgArea?.w, 82),
      h: readNumber(single?.imgArea?.h, 37)
    },
    nameArea: {
      x: readNumber(single?.nameArea?.x, 35),
      y: readNumber(single?.nameArea?.y, 56),
      w: readNumber(single?.nameArea?.w, 38),
      h: readNumber(single?.nameArea?.h, 20)
    },
    indexPos: {
      x: readNumber(single?.indexPos?.x, 35),
      y: readNumber(single?.indexPos?.y, 67.8)
    },
    packagePos: {
      x: readNumber(single?.packagePos?.x, 35),
      y: readNumber(single?.packagePos?.y, 72)
    },
    flagArea: {
      x: readNumber(single?.flagArea?.x, 35),
      y: readNumber(single?.flagArea?.y, 78.8),
      w: readNumber(single?.flagArea?.w, 18),
      h: readNumber(single?.flagArea?.h, 2.6)
    },
    priceArea: {
      x: readNumber(single?.priceArea?.x, 3.5),
      y: readNumber(single?.priceArea?.y, 57),
      s: readNumber(single?.priceArea?.s, hasImagePriceBadge ? 22 : 24),
      w: readNumber(single?.priceArea?.w, 24),
      h: readNumber(single?.priceArea?.h, 11.5),
      r: readNumber(single?.priceArea?.r, 2.2)
    },
    priceTextOffset: {
      x: readNumber(single?.priceTextOffset?.x, 0),
      y: readNumber(single?.priceTextOffset?.y, 0)
    },
    barcodeArea: {
      x: readNumber(single?.barcodeArea?.x, 53),
      y: readNumber(single?.barcodeArea?.y, 79.2),
      w: readNumber(single?.barcodeArea?.w, 38),
      h: readNumber(single?.barcodeArea?.h, 11)
    },
    divider: {
      x: readNumber(single?.divider?.x, -1),
      y: readNumber(single?.divider?.y, 0),
      w: readNumber(single?.divider?.w, 0.55),
      h: readNumber(single?.divider?.h, 0)
    },
    text: {
      metaFontFamily: String(text.metaFontFamily || "").trim(),
      priceFontFamily: String(text.priceFontFamily || "").trim(),
      nameWeight: String(text.nameWeight || "").trim(),
      indexWeight: String(text.indexWeight || "").trim(),
      packageWeight: String(text.packageWeight || "").trim(),
      priceMainWeight: String(text.priceMainWeight || "").trim(),
      priceDecWeight: String(text.priceDecWeight || "").trim(),
      priceUnitWeight: String(text.priceUnitWeight || "").trim(),
      nameColor: String(text.nameColor || "").trim(),
      indexColor: String(text.indexColor || "").trim(),
      packageColor: String(text.packageColor || "").trim(),
      indexItalic: typeof text.indexItalic === "boolean" ? text.indexItalic : true,
      metaScaleMultiplier: readNumber(text.metaScaleMultiplier, 1),
      noPriceCircle: !!text.noPriceCircle,
      hidePriceBadge: !!text.hidePriceBadge,
      priceColor: String(text.priceColor || "").trim(),
      forcePriceBold: !!text.forcePriceBold,
      priceScaleMultiplier: normalizeFastCreatorScale(text.priceScaleMultiplier, 1),
      priceMainFactor: readNumber(text.priceMainFactor, 0),
      priceDecFactor: readNumber(text.priceDecFactor, 0),
      priceUnitFactor: readNumber(text.priceUnitFactor, 0),
      priceShape: String(text.priceShape || "").trim(),
      priceTextAlign: String(text.priceTextAlign || "").trim(),
      priceTextOffsetMode: String(text.priceTextOffsetMode || "").trim(),
      priceBgColor: String(text.priceBgColor || "").trim(),
      priceBgRadius: readNumber(text.priceBgRadius, 2.2),
      dividerColor: String(text.dividerColor || "").trim(),
      hideImage: !!text.hideImage,
      hideName: !!text.hideName,
      hideIndex: !!text.hideIndex,
      hidePackage: !!text.hidePackage,
      hidePrice: !!text.hidePrice,
      hideBarcode: !!text.hideBarcode,
      hideFlag: !!text.hideFlag
    }
  };
}

function getFastCreatorPriceBadgeCircleProfile(styleId, isSingleLayout = false) {
  const safeId = String(styleId || "").trim().toLowerCase();
  const profile = {
    scaleBoost: isSingleLayout ? 1.18 : 1.18,
    previewBgSize: isSingleLayout ? "118%" : "118%",
    contentNudgeX: isSingleLayout ? 0.8 : 0.6,
    contentNudgeY: 0,
    extraPadX: 1,
    mainScale: isSingleLayout ? 0.97 : 0.98
  };
  if (!safeId || safeId === "solid") return profile;
  if (safeId.includes("tnz")) {
    return {
      scaleBoost: isSingleLayout ? 1.22 : 1.2,
      previewBgSize: isSingleLayout ? "122%" : "120%",
      contentNudgeX: isSingleLayout ? 1.8 : 1.2,
      contentNudgeY: isSingleLayout ? 0.2 : 0,
      extraPadX: 3,
      mainScale: isSingleLayout ? 0.94 : 0.96
    };
  }
  if (safeId.includes("granatowe") && safeId.includes("bez-ramki")) {
    return {
      scaleBoost: isSingleLayout ? 1.24 : 1.26,
      previewBgSize: isSingleLayout ? "124%" : "126%",
      contentNudgeX: isSingleLayout ? 1.4 : 1,
      contentNudgeY: 0,
      extraPadX: 2,
      mainScale: isSingleLayout ? 0.96 : 0.98
    };
  }
  if (safeId.includes("granatowe")) {
    return {
      scaleBoost: isSingleLayout ? 1.22 : 1.24,
      previewBgSize: isSingleLayout ? "122%" : "124%",
      contentNudgeX: isSingleLayout ? 1.2 : 0.8,
      contentNudgeY: 0,
      extraPadX: 2,
      mainScale: isSingleLayout ? 0.96 : 0.98
    };
  }
  return profile;
}

function getFastCreatorCirclePriceMajorOpticalBiasX(value, options = {}) {
  const digits = String(value == null ? "" : value).replace(/\D+/g, "");
  if (digits.length <= 1) {
    const badgeProfile = getFastCreatorPriceBadgeCircleProfile(options?.styleId, !!options?.isSingleLayout);
    return !!options?.isImageBadge
      ? Math.min(2.2, (Number(badgeProfile.contentNudgeX || 0) * 0.6) + (!!options?.isSingleLayout ? 0.65 : 0.45))
      : 0;
  }
  const onesCount = (digits.match(/1/g) || []).length;
  const digitBias = Math.min(1.8, (digits.length - 1) * 0.85);
  const onesBias = Math.min(0.6, onesCount * 0.2);
  const tripleDigitBias = digits.length >= 3 ? 0.45 : 0;
  const badgeProfile = getFastCreatorPriceBadgeCircleProfile(options?.styleId, !!options?.isSingleLayout);
  const styleBias = !!options?.isImageBadge ? Number(badgeProfile.contentNudgeX || 0) : 0;
  return Number(Math.min(7.2, digitBias + onesBias + tripleDigitBias + 0.9 + styleBias).toFixed(2));
}

function getFastCreatorCirclePriceBadgePadX(baseDiameter, isImageBadge, majorText, styleId = "", isSingleLayout = false) {
  const base = Math.max(1, Number(baseDiameter || 0) || 0);
  const digits = String(majorText == null ? "" : majorText).replace(/\D+/g, "");
  const digitBonus = digits.length >= 3 ? 2 : (digits.length >= 2 ? 1 : 0);
  if (!isImageBadge) return Math.max(5, Math.round(base * 0.055));
  const badgeProfile = getFastCreatorPriceBadgeCircleProfile(styleId, isSingleLayout);
  return Math.max(6, Math.round(base * 0.055) + digitBonus + Math.round(Number(badgeProfile.extraPadX || 0)));
}

function getFastCreatorCirclePriceMainScale(majorText, isImageBadge, styleId = "", isSingleLayout = false) {
  const digits = String(majorText == null ? "" : majorText).replace(/\D+/g, "");
  if (!isImageBadge) return 1;
  let scale = 1;
  if (digits.length >= 4) scale = 0.78;
  else if (digits.length === 3) scale = 0.84;
  else if (digits.length === 2) scale = 0.92;
  const badgeProfile = getFastCreatorPriceBadgeCircleProfile(styleId, isSingleLayout);
  return Number((scale * Math.max(0.82, Number(badgeProfile.mainScale || 1))).toFixed(3));
}

function applyFastCreatorAutoCircleBadgeLayout(options = {}) {
  const priceCircle = options?.priceCircle;
  const priceRowEl = options?.priceRowEl;
  if (!(priceCircle instanceof HTMLElement) || !(priceRowEl instanceof HTMLElement)) return;

  const hostRect = priceCircle.parentElement?.getBoundingClientRect?.();
  const badgeRect = priceCircle.getBoundingClientRect?.();
  if (!hostRect || !badgeRect || !(badgeRect.width > 0) || !(badgeRect.height > 0)) return;

  priceRowEl.style.position = "absolute";
  priceRowEl.style.left = "0px";
  priceRowEl.style.top = "0px";
  priceRowEl.style.width = "auto";
  priceRowEl.style.maxWidth = "none";
  priceRowEl.style.padding = "0";
  priceRowEl.style.transform = "none";
  priceRowEl.style.justifyContent = "flex-start";
  priceRowEl.style.gap = `${Math.max(0, Number(options.gapPx) || 0)}px`;

  const rowRect = priceRowEl.getBoundingClientRect?.();
  if (!rowRect || !(rowRect.width > 0) || !(rowRect.height > 0)) return;

  const padX = getFastCreatorCirclePriceBadgePadX(
    options.baseDiameter,
    !!options.isImageBadge,
    options.majorText,
    options.styleId,
    !!options.isSingleLayout
  );
  const padY = Math.max(options.isImageBadge ? 6 : 5, Math.round((Number(options.baseDiameter || 0) || 0) * 0.06));
  const diameter = Math.max(
    Math.max(1, Number(options.baseDiameter || 0) || 0),
    Math.ceil(rowRect.width + padX * 2),
    Math.ceil(rowRect.height + padY * 2)
  );
  const centerX = (badgeRect.left - hostRect.left) + (badgeRect.width / 2);
  const centerY = (badgeRect.top - hostRect.top) + (badgeRect.height / 2);
  const contentNudgeX = getFastCreatorCirclePriceMajorOpticalBiasX(options.majorText, {
    styleId: options.styleId,
    isImageBadge: !!options.isImageBadge,
    isSingleLayout: !!options.isSingleLayout
  });
  const badgeProfile = getFastCreatorPriceBadgeCircleProfile(options.styleId, !!options.isSingleLayout);

  priceCircle.style.width = `${diameter}px`;
  priceCircle.style.height = `${diameter}px`;
  priceCircle.style.left = `${Number((centerX - (diameter / 2)).toFixed(2))}px`;
  priceCircle.style.top = `${Number((centerY - (diameter / 2)).toFixed(2))}px`;
  priceCircle.style.borderRadius = "50%";

  priceRowEl.style.left = `${Number((((diameter - rowRect.width) / 2) + contentNudgeX).toFixed(2))}px`;
  priceRowEl.style.top = `${Number((((diameter - rowRect.height) / 2) + Number(badgeProfile.contentNudgeY || 0)).toFixed(2))}px`;
}

function normalizeFastCreatorPreviewFont(value, fallback = "Arial") {
  const safe = String(value || "").trim();
  return safe || fallback;
}

function boolFastCreatorAttrToFlag(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function cloneFastCreatorModuleLayoutEditorSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  try {
    return JSON.parse(JSON.stringify(snapshot));
  } catch (_error) {
    return null;
  }
}

function isFastCreatorSnapshotValid(snapshot) {
  return !!(
    snapshot
    && typeof snapshot === "object"
    && Array.isArray(snapshot.nodes)
    && snapshot.nodes.length
  );
}

function getFastCreatorModuleLayoutEditorSnapshot(styleIdOverride) {
  const styleMeta = getFastCreatorStyleMeta(styleIdOverride);
  const snapshot = styleMeta?.config?.__editorSnapshot;
  return isFastCreatorSnapshotValid(snapshot) ? snapshot : null;
}

function getFastCreatorSnapshotNodeAttrs(def) {
  return def?.attrs && typeof def.attrs === "object" ? def.attrs : {};
}

function getFastCreatorSnapshotNodeCustomAttrs(def) {
  const attrs = getFastCreatorSnapshotNodeAttrs(def);
  return attrs?.customAttrs && typeof attrs.customAttrs === "object" ? attrs.customAttrs : {};
}

function normalizeFastCreatorSnapshotText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFastCreatorSnapshotTextSeed(def) {
  return String(getFastCreatorSnapshotNodeAttrs(def).text || "").trim();
}

function looksLikeFastCreatorSnapshotPriceUnitText(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/[£€$]/.test(text)) return true;
  if (/\bz[łl]\b/i.test(text)) return true;
  if (/\/\s*(SZT|KG)\.?/i.test(text)) return true;
  return /^\s*\/?\s*(SZT|KG)\.?\s*$/i.test(text);
}

function getFastCreatorSnapshotNodeKind(def) {
  const attrs = getFastCreatorSnapshotNodeAttrs(def);
  const customAttrs = getFastCreatorSnapshotNodeCustomAttrs(def);
  const explicitKind = String(attrs.workspaceKind || customAttrs.workspaceKind || "").trim();
  if (explicitKind) return explicitKind;

  const hasLegacyFlag = (flagName) => !!(attrs?.[flagName] || customAttrs?.[flagName]);
  if (hasLegacyFlag("isName")) return "nameText";
  if (hasLegacyFlag("isIndex")) return "indexText";
  if (hasLegacyFlag("isCustomPackageInfo")) return "packageText";
  if (hasLegacyFlag("isPriceGroup")) return "priceGroup";
  if (hasLegacyFlag("isProductImage")) return "productImage";
  if (hasLegacyFlag("isBarcode")) return "ean";
  if (hasLegacyFlag("isCountryBadge")) return "flag";
  if (hasLegacyFlag("isLayoutDivider")) return "divider";

  const normalizedLabel = normalizeFastCreatorSnapshotText(
    String(attrs.workspaceLabel || customAttrs.workspaceLabel || "").trim()
  );
  const normalizedName = normalizeFastCreatorSnapshotText(
    String(attrs.name || customAttrs.name || attrs.id || customAttrs.id || "").trim()
  );
  if (normalizedLabel.includes("nazwa")) return "nameText";
  if (normalizedLabel.includes("indeks")) return "indexText";
  if (normalizedLabel.includes("opak")) return "packageText";
  if (normalizedLabel.includes("waluta")) return "currencySymbol";
  if (normalizedLabel.includes("cena")) return "priceGroup";
  if (
    normalizedLabel.includes("ean")
    || normalizedLabel.includes("barcode")
    || normalizedLabel.includes("kod kreskowy")
    || normalizedName.includes("ean")
    || normalizedName.includes("barcode")
  ) {
    return "ean";
  }
  if (normalizedLabel.includes("flaga")) return "flag";
  if (normalizedLabel.includes("divider") || normalizedLabel.includes("linia")) return "divider";

  const textSeed = getFastCreatorSnapshotTextSeed(def);
  if (looksLikeFastCreatorSnapshotPriceUnitText(textSeed)) return "currencySymbol";
  return "";
}

function isFastCreatorModuleLayoutPriceNode(def) {
  const kind = getFastCreatorSnapshotNodeKind(def);
  return kind === "priceGroup" || kind === "badgeRect" || kind === "badgeCircle" || kind === "currencySymbol";
}

function mergeFastCreatorModuleLayoutEditorSnapshotWithPriceStyle(moduleSnapshot, priceSnapshot) {
  const base = cloneFastCreatorModuleLayoutEditorSnapshot(moduleSnapshot);
  const price = cloneFastCreatorModuleLayoutEditorSnapshot(priceSnapshot);
  const baseNodes = Array.isArray(base?.nodes) ? base.nodes : [];
  const priceNodes = Array.isArray(price?.nodes) ? price.nodes : [];
  if (!baseNodes.length) return null;
  if (!priceNodes.length) return base;
  return {
    ...base,
    nodes: [...baseNodes.filter((def) => !isFastCreatorModuleLayoutPriceNode(def)), ...priceNodes]
  };
}

function getFastCreatorCatalogEntryModuleLayoutEditorSnapshot(catalogEntry, styleIdOverride) {
  const inlineSnapshot = catalogEntry?.MODULE_LAYOUT_EDITOR_SNAPSHOT;
  const inlineSourceStyleId = String(
    catalogEntry?.MODULE_LAYOUT_EDITOR_SNAPSHOT_SOURCE_STYLE_ID
    || catalogEntry?.MODULE_LAYOUT_EDITOR_SOURCE_STYLE_ID
    || ""
  ).trim();
  const priceSnapshot = catalogEntry?.MODULE_LAYOUT_PRICE_STYLE_SNAPSHOT;
  const normalizedStyleId = String(
    styleIdOverride || catalogEntry?.MODULE_LAYOUT_STYLE_ID || "default"
  ).trim() || "default";
  const targetStyleSnapshot = getFastCreatorModuleLayoutEditorSnapshot(normalizedStyleId);
  const hasInlineSnapshot = isFastCreatorSnapshotValid(inlineSnapshot);
  const hasTargetStyleSnapshot = isFastCreatorSnapshotValid(targetStyleSnapshot);
  const shouldUseInlineSnapshot = hasInlineSnapshot
    && (!inlineSourceStyleId || inlineSourceStyleId === normalizedStyleId || !hasTargetStyleSnapshot);
  const baseSnapshot = shouldUseInlineSnapshot
    ? inlineSnapshot
    : (hasTargetStyleSnapshot ? targetStyleSnapshot : inlineSnapshot);
  const priceNodes = Array.isArray(priceSnapshot?.nodes) ? priceSnapshot.nodes : [];
  if (!priceNodes.length) return baseSnapshot;
  return mergeFastCreatorModuleLayoutEditorSnapshotWithPriceStyle(baseSnapshot, priceSnapshot);
}

function inferFastCreatorSnapshotPriceRole(def, fallbackIndex = -1) {
  const explicitRole = String(getFastCreatorSnapshotNodeCustomAttrs(def).priceRole || "").trim().toLowerCase();
  if (explicitRole === "major" || explicitRole === "minor" || explicitRole === "unit") return explicitRole;
  if (getFastCreatorSnapshotNodeKind(def) === "currencySymbol") return "unit";
  if (looksLikeFastCreatorSnapshotPriceUnitText(getFastCreatorSnapshotTextSeed(def))) return "unit";
  if (fallbackIndex === 0) return "major";
  if (fallbackIndex === 1) return "minor";
  if (fallbackIndex === 2) return "unit";
  return "";
}

function getFastCreatorSnapshotBarcodeDigits(context) {
  return getFastCreatorDisplayEan(context?.catalogEntry || context?.product || null);
}

function resolveFastCreatorSnapshotTextValue(def, context, options = {}) {
  const attrs = getFastCreatorSnapshotNodeAttrs(def);
  const kind = getFastCreatorSnapshotNodeKind(def);
  const fallbackText = String(attrs.text || "");
  const product = context?.product || null;
  const catalogEntry = context?.catalogEntry || null;

  if (options.priceRole) {
    const price = formatFastCreatorPrice(
      hasFastCreatorPriceValue(catalogEntry?.CENA)
        ? catalogEntry?.CENA
        : getFastCreatorDisplayPrice(catalogEntry || product)
    );
    const currencySymbol = getFastCreatorCurrencySymbol(catalogEntry, price.currency);
    const priceUnitSuffix = isFastCreatorWeightProduct(catalogEntry || product) ? "KG" : "SZT.";
    if (options.priceRole === "major") return price.main;
    if (options.priceRole === "minor") return price.dec;
    if (options.priceRole === "unit") return `${currencySymbol} / ${priceUnitSuffix}`;
  }

  if (kind === "nameText") return String(catalogEntry?.NAZWA || getFastCreatorDisplayName(product) || fallbackText || "-");
  if (kind === "indexText") return String(catalogEntry?.INDEKS || getFastCreatorDisplayIndex(product) || fallbackText || "-");
  if (kind === "packageText") return buildFastCreatorPackageText(catalogEntry || product) || fallbackText;
  if (kind === "currencySymbol") return getFastCreatorCurrencySymbol(catalogEntry, fallbackText || "£");
  if (kind === "flag") {
    const country = String(catalogEntry?.KRAJPOCHODZENIA || "").trim();
    return country ? `FLAGA ${inferFastCreatorFlagCode(catalogEntry || product)}` : "";
  }
  if (kind === "ean") {
    const digits = getFastCreatorSnapshotBarcodeDigits(context);
    return digits ? `EAN: ${digits}` : "";
  }

  return fallbackText;
}

function getFastCreatorPreviewVisibilitySettings() {
  return {
    showPrice: fastCreatorState.previewVisibility?.showPrice !== false,
    showBarcode: fastCreatorState.previewVisibility?.showBarcode === true
  };
}

function getFastCreatorSnapshotBadgeImageMeta(context, options = {}) {
  const badgeGroupKind = String(options?.badgeGroupKind || "").trim();
  if (badgeGroupKind !== "badgeRect" && badgeGroupKind !== "badgeCircle") return null;
  const catalogEntry = context?.catalogEntry && typeof context.catalogEntry === "object"
    ? context.catalogEntry
    : {};
  const badgeStyleId = String(catalogEntry?.PRICE_BG_STYLE_ID || "solid").trim() || "solid";
  const badgeImageUrl = String(catalogEntry?.PRICE_BG_IMAGE_URL || "").trim();
  if (!badgeImageUrl || badgeStyleId === "solid") return null;
  return {
    badgeStyleId,
    badgeImageUrl,
    badgeGroupKind
  };
}

function generateFastCreatorBarcodeDataUrl(ean) {
  const code = scientificToPlainFastCreator(ean);
  if (!code) return Promise.resolve(null);
  if (typeof window.generateBarcode === "function") {
    return new Promise((resolve) => {
      try {
        window.generateBarcode(code, (url) => resolve(url || null));
      } catch (_error) {
        resolve(null);
      }
    });
  }
  if (!window.JsBarcode) return Promise.resolve(null);
  return Promise.resolve().then(() => {
    try {
      const canvas = document.createElement("canvas");
      window.JsBarcode(canvas, code, {
        format: "EAN13",
        width: 2.2,
        height: 50,
        displayValue: true,
        fontSize: 14,
        margin: 5,
        background: "transparent",
        lineColor: "#000"
      });
      return canvas.toDataURL("image/png");
    } catch (_error) {
      return null;
    }
  });
}

async function resolveFastCreatorSnapshotImageUrl(def, context) {
  const attrs = getFastCreatorSnapshotNodeAttrs(def);
  const kind = getFastCreatorSnapshotNodeKind(def);
  if (kind === "productImage") {
    return String(context?.imageUrl || attrs.src || "").trim();
  }
  if (kind === "ean") {
    const digits = getFastCreatorSnapshotBarcodeDigits(context);
    const fallbackBarcodeUrl = String(context?.barcodeImageUrl || attrs.src || "").trim();
    if (!digits) return fallbackBarcodeUrl;
    if (!context.barcodeDataUrlPromise) {
      context.barcodeDataUrlPromise = generateFastCreatorBarcodeDataUrl(digits);
    }
    const url = await context.barcodeDataUrlPromise;
    return String(url || fallbackBarcodeUrl).trim();
  }
  return String(attrs.src || "").trim();
}

function parseFastCreatorSnapshotFontStyle(fontStyle) {
  const raw = String(fontStyle || "normal").trim().toLowerCase();
  const weightMatch = raw.match(/\b([1-9]00)\b/);
  const hasBold = raw.includes("bold");
  return {
    fontStyle: raw.includes("italic") ? "italic" : "normal",
    fontWeight: weightMatch ? weightMatch[1] : (hasBold ? "700" : "400")
  };
}

function createFastCreatorPreviewSnapshotLineElement(attrs) {
  const points = Array.isArray(attrs.points) ? attrs.points : [];
  if (points.length < 4) return null;
  const x1 = Number(points[0] || 0);
  const y1 = Number(points[1] || 0);
  const x2 = Number(points[points.length - 2] || 0);
  const y2 = Number(points[points.length - 1] || 0);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(1, Math.sqrt((dx * dx) + (dy * dy)));
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const strokeWidth = Math.max(1, Number(attrs.strokeWidth || 2));
  const line = document.createElement("div");
  line.style.position = "absolute";
  line.style.left = `${Number(attrs.x || 0) + x1}px`;
  line.style.top = `${Number(attrs.y || 0) + y1 - (strokeWidth / 2)}px`;
  line.style.width = `${length}px`;
  line.style.height = `${strokeWidth}px`;
  line.style.background = String(attrs.stroke || "#ffffff");
  line.style.borderRadius = `${Math.max(1, strokeWidth / 2)}px`;
  line.style.transformOrigin = "0 50%";
  line.style.transform = `rotate(${angle + Number(attrs.rotation || 0)}deg)`;
  return line;
}

async function createFastCreatorPreviewSnapshotNodeElement(def, context, options = {}) {
  const className = String(def?.className || "");
  const attrs = getFastCreatorSnapshotNodeAttrs(def);
  const kind = getFastCreatorSnapshotNodeKind(def);
  if (!className) return null;

  if (className === "Group") {
    const group = document.createElement("div");
    group.dataset.fastcreatorSnapshotKind = kind || "group";
    if (options?.badgeGroupKind) group.dataset.fastcreatorSnapshotBadgeGroupKind = String(options.badgeGroupKind);
    if (options?.priceRole) group.dataset.fastcreatorSnapshotPriceRole = String(options.priceRole);
    group.style.position = "absolute";
    group.style.left = `${Number(attrs.x || 0)}px`;
    group.style.top = `${Number(attrs.y || 0)}px`;
    group.style.transformOrigin = "left top";
    group.style.transform = `rotate(${Number(attrs.rotation || 0)}deg)`;
    const children = Array.isArray(def?.children) ? def.children : [];
    let priceTextIndex = 0;
    for (const childDef of children) {
      const childOptions = {
        ...options,
        badgeGroupKind: (kind === "badgeRect" || kind === "badgeCircle")
          ? kind
          : String(options?.badgeGroupKind || "").trim(),
        priceRole: kind === "priceGroup"
          ? inferFastCreatorSnapshotPriceRole(childDef, priceTextIndex)
          : "",
        inPriceGroup: kind === "priceGroup"
      };
      if (kind === "priceGroup" && String(childDef?.className || "") === "Text") {
        priceTextIndex += 1;
      }
      const childEl = await createFastCreatorPreviewSnapshotNodeElement(childDef, context, childOptions);
      if (childEl) group.appendChild(childEl);
    }
    return group;
  }

  if (className === "Text") {
    const textValue = resolveFastCreatorSnapshotTextValue(def, context, options);
    if (!textValue && (kind === "flag" || kind === "ean")) return null;
    const text = document.createElement("div");
    text.dataset.fastcreatorSnapshotKind = kind || "text";
    if (options?.priceRole) text.dataset.fastcreatorSnapshotPriceRole = String(options.priceRole);
    const fontMeta = parseFastCreatorSnapshotFontStyle(attrs.fontStyle);
    text.textContent = textValue || " ";
    text.style.position = "absolute";
    text.style.left = `${Number(attrs.x || 0)}px`;
    text.style.top = `${Number(attrs.y || 0)}px`;
    text.style.color = String(attrs.fill || "#111111");
    text.style.fontFamily = String(attrs.fontFamily || "Arial");
    text.style.fontSize = `${Math.max(1, Number(attrs.fontSize || 24))}px`;
    text.style.fontStyle = fontMeta.fontStyle;
    text.style.fontWeight = fontMeta.fontWeight;
    text.style.lineHeight = String(Number(attrs.lineHeight || 1));
    text.style.textAlign = String(attrs.align || "left");
    text.style.textDecoration = String(attrs.textDecoration || "none") || "none";
    text.style.whiteSpace = String(attrs.wrap || "word") === "none" ? "nowrap" : "pre-wrap";
    text.style.wordBreak = String(attrs.wrap || "word") === "none" ? "normal" : "break-word";
    text.style.transformOrigin = "left top";
    text.style.transform = `rotate(${Number(attrs.rotation || 0)}deg)`;
    if (Number(attrs.width || 0) > 0) {
      text.style.width = `${Math.max(1, Number(attrs.width || 0))}px`;
    }
    return text;
  }

  if (className === "Image") {
    const src = await resolveFastCreatorSnapshotImageUrl(def, context);
    if (!src) return null;
    const img = document.createElement("img");
    img.dataset.fastcreatorSnapshotKind = kind || "image";
    img.alt = kind || "snapshot";
    img.src = src;
    img.style.position = "absolute";
    img.style.left = `${Number(attrs.x || 0)}px`;
    img.style.top = `${Number(attrs.y || 0)}px`;
    img.style.width = `${Math.max(1, Number(attrs.width || 1))}px`;
    img.style.height = `${Math.max(1, Number(attrs.height || 1))}px`;
    img.style.objectFit = "contain";
    img.style.transformOrigin = "left top";
    img.style.transform = `rotate(${Number(attrs.rotation || 0)}deg)`;
    return img;
  }

  if (className === "Rect") {
    const rect = document.createElement("div");
    rect.dataset.fastcreatorSnapshotKind = kind || "rect";
    if (options?.badgeGroupKind) rect.dataset.fastcreatorSnapshotBadgeGroupKind = String(options.badgeGroupKind);
    rect.style.position = "absolute";
    rect.style.left = `${Number(attrs.x || 0)}px`;
    rect.style.top = `${Number(attrs.y || 0)}px`;
    rect.style.width = `${Math.max(1, Number(attrs.width || 1))}px`;
    rect.style.height = `${Math.max(1, Number(attrs.height || 1))}px`;
    rect.style.background = String(attrs.fill || "transparent");
    rect.style.borderStyle = Number(attrs.strokeWidth || 0) > 0 ? "solid" : "none";
    rect.style.borderWidth = `${Math.max(0, Number(attrs.strokeWidth || 0))}px`;
    rect.style.borderColor = String(attrs.stroke || "transparent");
    rect.style.borderRadius = `${Math.max(0, Number(attrs.cornerRadius || 0))}px`;
    rect.style.boxSizing = "border-box";
    rect.style.transformOrigin = "left top";
    rect.style.transform = `rotate(${Number(attrs.rotation || 0)}deg)`;
    const rectBadgeMeta = getFastCreatorSnapshotBadgeImageMeta(context, options);
    if (rectBadgeMeta?.badgeGroupKind === "badgeRect") {
      rect.style.background = "transparent";
      rect.style.backgroundImage = `url("${rectBadgeMeta.badgeImageUrl}")`;
      rect.style.backgroundRepeat = "no-repeat";
      rect.style.backgroundPosition = "center";
      rect.style.backgroundSize = "100% 100%";
    }
    return rect;
  }

  if (className === "Circle") {
    const radius = Math.max(1, Number(attrs.radius || 1));
    const circle = document.createElement("div");
    circle.dataset.fastcreatorSnapshotKind = kind || "circle";
    if (options?.badgeGroupKind) circle.dataset.fastcreatorSnapshotBadgeGroupKind = String(options.badgeGroupKind);
    circle.style.position = "absolute";
    circle.style.left = `${Number(attrs.x || 0) - radius}px`;
    circle.style.top = `${Number(attrs.y || 0) - radius}px`;
    circle.style.width = `${radius * 2}px`;
    circle.style.height = `${radius * 2}px`;
    circle.style.background = String(attrs.fill || "transparent");
    circle.style.borderStyle = Number(attrs.strokeWidth || 0) > 0 ? "solid" : "none";
    circle.style.borderWidth = `${Math.max(0, Number(attrs.strokeWidth || 0))}px`;
    circle.style.borderColor = String(attrs.stroke || "transparent");
    circle.style.borderRadius = "50%";
    circle.style.boxSizing = "border-box";
    const circleBadgeMeta = getFastCreatorSnapshotBadgeImageMeta(context, options);
    if (circleBadgeMeta?.badgeGroupKind === "badgeCircle") {
      circle.style.background = "transparent";
      circle.style.backgroundImage = `url("${circleBadgeMeta.badgeImageUrl}")`;
      circle.style.backgroundRepeat = "no-repeat";
      circle.style.backgroundPosition = "center";
      circle.style.backgroundSize = "100% 100%";
    }
    return circle;
  }

  if (className === "Line") {
    const line = createFastCreatorPreviewSnapshotLineElement(attrs);
    if (line instanceof HTMLElement) {
      line.dataset.fastcreatorSnapshotKind = kind || "line";
    }
    return line;
  }

  return null;
}

async function renderFastCreatorPreviewFromEditorSnapshot(snapshot, context) {
  const card = getFastCreatorPreviewElement("customPreviewCard");
  const layer = ensureFastCreatorPreviewSnapshotLayer();
  if (!(card instanceof HTMLElement) || !(layer instanceof HTMLElement)) return false;
  const stamp = ++fastCreatorSnapshotPreviewRenderStamp;
  const sourceW = Math.max(1, Number(snapshot?.stageWidth || FASTCREATOR_PREVIEW_BASE_WIDTH));
  const sourceH = Math.max(1, Number(snapshot?.stageHeight || FASTCREATOR_PREVIEW_BASE_HEIGHT));
  const targetW = Math.max(1, Number(card.clientWidth || sourceW));
  const targetH = Math.max(1, Number(card.clientHeight || sourceH));
  layer.innerHTML = "";
  layer.style.width = `${sourceW}px`;
  layer.style.height = `${sourceH}px`;
  layer.style.transform = `scale(${targetW / sourceW}, ${targetH / sourceH})`;
  setFastCreatorPreviewSnapshotMode(true);

  for (const def of Array.isArray(snapshot?.nodes) ? snapshot.nodes : []) {
    const el = await createFastCreatorPreviewSnapshotNodeElement(def, context);
    if (stamp !== fastCreatorSnapshotPreviewRenderStamp) return false;
    if (el) layer.appendChild(el);
  }

  const showPrice = context?.previewVisibility?.showPrice !== false;
  const showBarcode = context?.previewVisibility?.showBarcode === true;
  if (showBarcode && !layer.querySelector('[data-fastcreator-snapshot-kind="ean"]')) {
    const eanDigits = getFastCreatorSnapshotBarcodeDigits(context);
    const barcodeUrl = eanDigits
      ? await generateFastCreatorBarcodeDataUrl(eanDigits)
      : String(context?.barcodeImageUrl || "").trim();
    if (stamp !== fastCreatorSnapshotPreviewRenderStamp) return false;
    if (barcodeUrl) {
      const hasImageBadge = String(context?.catalogEntry?.PRICE_BG_STYLE_ID || "solid").trim() !== "solid";
      const singleSpec = getFastCreatorExactSingleDirectLayoutSpec(context?.styleMeta, hasImageBadge);
      const fallbackBarcode = document.createElement("img");
      fallbackBarcode.dataset.fastcreatorSnapshotKind = "ean";
      fallbackBarcode.alt = "EAN";
      fallbackBarcode.src = barcodeUrl;
      fallbackBarcode.style.position = "absolute";
      fallbackBarcode.style.left = `${(Number(singleSpec?.barcodeArea?.x || 53) / 100) * sourceW}px`;
      fallbackBarcode.style.top = `${(Number(singleSpec?.barcodeArea?.y || 79.2) / 100) * sourceH}px`;
      fallbackBarcode.style.width = `${Math.max(1, (Number(singleSpec?.barcodeArea?.w || 38) / 100) * sourceW)}px`;
      fallbackBarcode.style.height = `${Math.max(1, (Number(singleSpec?.barcodeArea?.h || 11) / 100) * sourceH)}px`;
      fallbackBarcode.style.objectFit = "contain";
      layer.appendChild(fallbackBarcode);
    }
  }
  layer.querySelectorAll("[data-fastcreator-snapshot-kind]").forEach((node) => {
    const kind = String(node.getAttribute("data-fastcreator-snapshot-kind") || "").trim();
    const isPriceNode = kind === "priceGroup" || kind === "badgeRect" || kind === "badgeCircle" || kind === "currencySymbol";
    if (isPriceNode) {
      node.style.display = showPrice ? "" : "none";
    }
    if (kind === "ean") {
      node.style.display = showBarcode ? "" : "none";
    }
  });

  if (stamp !== fastCreatorSnapshotPreviewRenderStamp) return false;
  return true;
}

function getFastCreatorPreviewPriceBadgeCircleProfile(styleId, isSingleLayout = false) {
  const safeId = String(styleId || "").trim().toLowerCase();
  const profile = {
    scaleBoost: isSingleLayout ? 1.18 : 1.18,
    previewBgSize: isSingleLayout ? "118%" : "118%",
    contentNudgeX: isSingleLayout ? 0.8 : 0.6,
    contentNudgeY: 0,
    extraPadX: 1,
    mainScale: isSingleLayout ? 0.97 : 0.98
  };
  if (!safeId || safeId === "solid") return profile;
  if (safeId.includes("tnz")) {
    return {
      scaleBoost: isSingleLayout ? 1.22 : 1.20,
      previewBgSize: isSingleLayout ? "122%" : "120%",
      contentNudgeX: isSingleLayout ? 1.8 : 1.2,
      contentNudgeY: isSingleLayout ? 0.2 : 0,
      extraPadX: 3,
      mainScale: isSingleLayout ? 0.94 : 0.96
    };
  }
  if (safeId.includes("granatowe") && safeId.includes("bez-ramki")) {
    return {
      scaleBoost: isSingleLayout ? 1.24 : 1.26,
      previewBgSize: isSingleLayout ? "124%" : "126%",
      contentNudgeX: isSingleLayout ? 1.4 : 1,
      contentNudgeY: 0,
      extraPadX: 2,
      mainScale: isSingleLayout ? 0.96 : 0.98
    };
  }
  if (safeId.includes("granatowe")) {
    return {
      scaleBoost: isSingleLayout ? 1.22 : 1.24,
      previewBgSize: isSingleLayout ? "122%" : "124%",
      contentNudgeX: isSingleLayout ? 1.2 : 0.8,
      contentNudgeY: 0,
      extraPadX: 2,
      mainScale: isSingleLayout ? 0.96 : 0.98
    };
  }
  if (safeId.includes("badge")) {
    return {
      scaleBoost: isSingleLayout ? 1.16 : 1.18,
      previewBgSize: isSingleLayout ? "116%" : "118%",
      contentNudgeX: 0.8,
      contentNudgeY: 0,
      extraPadX: 1,
      mainScale: 0.96
    };
  }
  return profile;
}

function getFastCreatorPreviewCirclePriceMajorOpticalBiasX(value, options = {}) {
  const digits = String(value == null ? "" : value).replace(/\D+/g, "");
  if (digits.length <= 1) {
    const badgeProfile = getFastCreatorPreviewPriceBadgeCircleProfile(options?.styleId, !!options?.isSingleLayout);
    const singleDigitImageBias = !!options?.isImageBadge
      ? Math.min(
          2.2,
          (Number(badgeProfile.contentNudgeX || 0) * 0.6) + (!!options?.isSingleLayout ? 0.65 : 0.45)
        )
      : 0;
    return Number(singleDigitImageBias.toFixed(2));
  }
  const onesCount = (digits.match(/1/g) || []).length;
  const digitBias = Math.min(1.8, (digits.length - 1) * 0.85);
  const onesBias = Math.min(0.6, onesCount * 0.2);
  const tripleDigitBias = digits.length >= 3 ? 0.45 : 0;
  const onesHeavyBias = digits.length >= 3 && onesCount >= 2
    ? Math.min(0.65, 0.35 + (onesCount - 2) * 0.3)
    : 0;
  const leftSpaceBias = digits.length >= 3 ? 1.0 : 0.9;
  const badgeProfile = getFastCreatorPreviewPriceBadgeCircleProfile(options?.styleId, !!options?.isSingleLayout);
  const styleBias = !!options?.isImageBadge ? Number(badgeProfile.contentNudgeX || 0) : 0;
  return Number(
    Math.min(7.2, digitBias + onesBias + tripleDigitBias + onesHeavyBias + leftSpaceBias + styleBias).toFixed(2)
  );
}

function getFastCreatorPreviewCirclePriceBadgePadX(baseDiameter, isImageBadge, majorText, styleId = "", isSingleLayout = false) {
  const base = Math.max(1, Number(baseDiameter || 0) || 0);
  const digits = String(majorText == null ? "" : majorText).replace(/\D+/g, "");
  const digitCount = digits.length;
  if (!isImageBadge) return Math.max(5, Math.round(base * 0.055));
  const digitBonus = digitCount >= 3 ? 2 : (digitCount >= 2 ? 1 : 0);
  const badgeProfile = getFastCreatorPreviewPriceBadgeCircleProfile(styleId, isSingleLayout);
  return Math.max(6, Math.round(base * 0.055) + digitBonus + Math.round(Number(badgeProfile.extraPadX || 0)));
}

function getFastCreatorPreviewCirclePriceMainScale(majorText, isImageBadge, styleId = "", isSingleLayout = false) {
  const digits = String(majorText == null ? "" : majorText).replace(/\D+/g, "");
  if (!isImageBadge) return 1;
  let scale = 1;
  if (digits.length >= 4) scale = 0.78;
  else if (digits.length === 3) scale = 0.84;
  else if (digits.length === 2) scale = 0.92;
  const badgeProfile = getFastCreatorPreviewPriceBadgeCircleProfile(styleId, isSingleLayout);
  return Number((scale * Math.max(0.82, Number(badgeProfile.mainScale || 1))).toFixed(3));
}

function getFastCreatorPreviewCirclePriceOpticalCenterX(parts = []) {
  const validParts = Array.isArray(parts)
    ? parts.filter((part) => part && Number.isFinite(Number(part.x)) && Number.isFinite(Number(part.width)) && Number(part.width) > 0)
    : [];
  if (!validParts.length) return 0;
  const totalWeight = validParts.reduce((sum, part) => sum + Math.max(0.1, Number(part.weight) || 0), 0);
  if (!(totalWeight > 0)) {
    const left = Math.min(...validParts.map((part) => Number(part.x)));
    const right = Math.max(...validParts.map((part) => Number(part.x) + Number(part.width)));
    return (left + right) / 2;
  }
  return validParts.reduce((sum, part) => {
    const center = Number(part.x) + (Number(part.width) / 2);
    return sum + (center * Math.max(0.1, Number(part.weight) || 0));
  }, 0) / totalWeight;
}

function getFastCreatorPreviewAutoCircleBadgeMetrics(options = {}) {
  const baseDiameter = Math.max(1, Number(options.baseDiameter || 0) || 0);
  const contentWidth = Math.max(1, Number(options.contentWidth || 0) || 0);
  const contentHeight = Math.max(1, Number(options.contentHeight || 0) || 0);
  const contentLeft = Number(options.contentLeft);
  const contentRight = Number(options.contentRight);
  const opticalCenterX = Number(options.opticalCenterX);
  const isImageBadge = !!options.isImageBadge;
  const padX = getFastCreatorPreviewCirclePriceBadgePadX(
    baseDiameter,
    isImageBadge,
    options.majorText,
    options.styleId,
    !!options.isSingleLayout
  );
  const padY = Math.max(isImageBadge ? 6 : 5, Math.round(baseDiameter * 0.06));
  const diameterFromOpticalCenter = Number.isFinite(contentLeft)
    && Number.isFinite(contentRight)
    && Number.isFinite(opticalCenterX)
    ? Math.ceil(Math.max(
        Math.max(1, opticalCenterX - contentLeft) + padX,
        Math.max(1, contentRight - opticalCenterX) + padX
      ) * 2)
    : 0;
  const diameter = Math.max(
    baseDiameter,
    Math.ceil(contentWidth + padX * 2),
    Math.ceil(contentHeight + padY * 2),
    diameterFromOpticalCenter
  );
  return {
    diameter,
    offsetX: Number.isFinite(opticalCenterX)
      ? Number(((diameter / 2) - opticalCenterX).toFixed(2))
      : Math.max(0, Number(((diameter - contentWidth) / 2).toFixed(2))),
    offsetY: Math.max(0, Number(((diameter - contentHeight) / 2).toFixed(2)))
  };
}

function applyFastCreatorPreviewAutoCircleBadgeLayout(options = {}) {
  const priceCircle = options?.priceCircle;
  const priceRowEl = options?.priceRowEl;
  if (!(priceCircle instanceof HTMLElement) || !(priceRowEl instanceof HTMLElement)) return null;

  const hostRect = priceCircle.parentElement?.getBoundingClientRect?.();
  const badgeRect = priceCircle.getBoundingClientRect?.();
  if (!hostRect || !badgeRect || !(badgeRect.width > 0) || !(badgeRect.height > 0)) return null;

  priceRowEl.style.position = "absolute";
  priceRowEl.style.left = "0px";
  priceRowEl.style.top = "0px";
  priceRowEl.style.width = "auto";
  priceRowEl.style.maxWidth = "none";
  priceRowEl.style.padding = "0";
  priceRowEl.style.transform = "none";
  priceRowEl.style.justifyContent = "flex-start";
  priceRowEl.style.gap = `${Math.max(0, Number(options.gapPx) || 0)}px`;

  const rowRect = priceRowEl.getBoundingClientRect?.();
  if (!rowRect || !(rowRect.width > 0) || !(rowRect.height > 0)) return null;
  const mainRect = options?.mainEl?.getBoundingClientRect?.();
  const decRect = options?.decEl?.getBoundingClientRect?.();
  const unitRect = options?.unitEl?.getBoundingClientRect?.();
  const badgeProfile = getFastCreatorPreviewPriceBadgeCircleProfile(options?.styleId, !!options?.isSingleLayout);
  const opticalCenterX = getFastCreatorPreviewCirclePriceOpticalCenterX([
    mainRect && rowRect
      ? { x: mainRect.left - rowRect.left, width: mainRect.width, weight: 1.85 }
      : null,
    decRect && rowRect
      ? { x: decRect.left - rowRect.left, width: decRect.width, weight: 1 }
      : null,
    unitRect && rowRect
      ? { x: unitRect.left - rowRect.left, width: unitRect.width, weight: 0.85 }
      : null
  ]);
  const contentNudgeX = getFastCreatorPreviewCirclePriceMajorOpticalBiasX(options?.majorText, {
    styleId: options?.styleId,
    isImageBadge: !!options?.isImageBadge,
    isSingleLayout: !!options?.isSingleLayout
  });

  const metrics = getFastCreatorPreviewAutoCircleBadgeMetrics({
    baseDiameter: Number(options.baseDiameter || 0),
    contentWidth: rowRect.width,
    contentHeight: rowRect.height,
    contentLeft: 0,
    contentRight: rowRect.width,
    opticalCenterX,
    majorText: options?.majorText,
    styleId: options?.styleId,
    isSingleLayout: !!options?.isSingleLayout,
    isImageBadge: !!options.isImageBadge
  });
  const centerX = (badgeRect.left - hostRect.left) + (badgeRect.width / 2);
  const centerY = (badgeRect.top - hostRect.top) + (badgeRect.height / 2);

  priceCircle.style.width = `${metrics.diameter}px`;
  priceCircle.style.height = `${metrics.diameter}px`;
  priceCircle.style.left = `${Number((centerX - (metrics.diameter / 2)).toFixed(2))}px`;
  priceCircle.style.top = `${Number((centerY - (metrics.diameter / 2)).toFixed(2))}px`;
  priceCircle.style.borderRadius = "50%";

  priceRowEl.style.left = `${Number((metrics.offsetX + contentNudgeX).toFixed(2))}px`;
  priceRowEl.style.top = `${Number((metrics.offsetY + Number(badgeProfile.contentNudgeY || 0)).toFixed(2))}px`;
  return metrics;
}

function getFastCreatorPreviewImageBadgeCircleBackgroundSize(styleId, isSingleLayout = false) {
  return getFastCreatorPreviewPriceBadgeCircleProfile(styleId, isSingleLayout).previewBgSize;
}

function resolveFastCreatorDirectPriceTextColor(explicitValue, singleSpec, options = {}) {
  const explicit = String(explicitValue || "").trim();
  if (explicit) return explicit;
  const styleColor = String(singleSpec?.text?.priceColor || "").trim();
  if (styleColor) return styleColor;
  return options && options.noPriceCircle ? "#d71920" : "#ffffff";
}

function getFastCreatorStoredCustomPriceTypographyFactors(text = {}) {
  const main = Number(text?.priceMainFactor);
  const dec = Number(text?.priceDecFactor);
  const unit = Number(text?.priceUnitFactor);
  if (!(main > 0) || !(unit > 0) || !(dec >= 0)) return null;
  return {
    main: Math.max(0.05, Math.min(2.5, main)),
    dec: Math.max(0, Math.min(2.5, dec)),
    unit: Math.max(0.05, Math.min(2.5, unit))
  };
}

function getFastCreatorExactSingleDirectLayoutSpec(styleMeta, hasImagePriceBadge) {
  const base = getFastCreatorSingleDirectLayoutSpec(styleMeta, hasImagePriceBadge);
  const cfg = styleMeta?.config && typeof styleMeta.config === "object"
    ? styleMeta.config
    : {};
  const single = cfg.singleDirect && typeof cfg.singleDirect === "object"
    ? cfg.singleDirect
    : {};
  const text = cfg.text && typeof cfg.text === "object"
    ? cfg.text
    : {};
  const resolvedStyleId = String(styleMeta?.id || "default").trim() || "default";
  const dividerAnchorRaw = String(single?.divider?.anchor || "").trim().toLowerCase();
  const dividerAnchor = dividerAnchorRaw === "image-right"
    ? "image-right"
    : "module";
  const dividerGapFallback = Number(base.divider.x) - (Number(base.imgArea.x) + Number(base.imgArea.w));
  const dividerGapFromPriceFallback = Number(base.priceArea.y) - (Number(base.divider.y) + Number(base.divider.h));
  const dividerGapFromPriceRaw = Number(single?.divider?.gapFromPrice);
  const dividerGapFromPrice = Number.isFinite(dividerGapFromPriceRaw)
    ? dividerGapFromPriceRaw
    : dividerGapFromPriceFallback;
  const dividerSnapToPriceTop = typeof single?.divider?.snapToPriceTop === "boolean"
    ? !!single.divider.snapToPriceTop
    : (resolvedStyleId !== "default" && Math.abs(dividerGapFromPriceFallback) <= 8);

  return {
    ...base,
    divider: {
      ...base.divider,
      anchor: dividerAnchor,
      gapFromImage: Number.isFinite(Number(single?.divider?.gapFromImage))
        ? Number(single.divider.gapFromImage)
        : dividerGapFallback,
      gapFromPrice: dividerGapFromPrice,
      snapToPriceTop: dividerSnapToPriceTop
    },
    text: {
      ...base.text,
      priceExtraBold: !!text.priceExtraBold,
      priceLayoutMode: String(text.priceLayoutMode || "").trim()
    }
  };
}

function getFastCreatorPreviewImageContentRect(imgEl) {
  if (!(imgEl instanceof HTMLImageElement)) return null;
  const rect = imgEl.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  const naturalW = Number(imgEl.naturalWidth || 0);
  const naturalH = Number(imgEl.naturalHeight || 0);
  if (!(naturalW > 0 && naturalH > 0)) return rect;

  const scale = Math.min(rect.width / naturalW, rect.height / naturalH);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const drawW = naturalW * safeScale;
  const drawH = naturalH * safeScale;
  const freeX = Math.max(0, rect.width - drawW);
  const freeY = Math.max(0, rect.height - drawH);

  const computed = window.getComputedStyle(imgEl);
  const fit = String(computed.objectFit || "").trim().toLowerCase();
  if (fit !== "contain") return rect;

  const rawPos = String(computed.objectPosition || "50% 50%").trim();
  const parts = rawPos.split(/\s+/).filter(Boolean);
  const xToken = parts[0] || "50%";
  const yToken = parts[1] || "50%";
  const mapPosToken = (token, freeSpace, axis) => {
    const value = String(token || "").trim().toLowerCase();
    if (!Number.isFinite(freeSpace) || freeSpace <= 0) return 0;
    if (value === "left" || value === "top") return 0;
    if (value === "center") return freeSpace / 2;
    if (value === "right" || value === "bottom") return freeSpace;
    if (value.endsWith("%")) {
      const ratio = Number.parseFloat(value.slice(0, -1));
      if (Number.isFinite(ratio)) return (ratio / 100) * freeSpace;
    }
    if (value.endsWith("px")) {
      const px = Number.parseFloat(value.slice(0, -2));
      if (Number.isFinite(px)) return Math.max(0, Math.min(freeSpace, px));
    }
    const asNum = Number.parseFloat(value);
    if (Number.isFinite(asNum)) return Math.max(0, Math.min(freeSpace, asNum));
    return axis === "x" ? (freeSpace / 2) : (freeSpace / 2);
  };
  const offsetX = mapPosToken(xToken, freeX, "x");
  const offsetY = mapPosToken(yToken, freeY, "y");
  return {
    left: rect.left + offsetX,
    top: rect.top + offsetY,
    width: drawW,
    height: drawH
  };
}

function applyFastCreatorPreviewLayoutMode(isSingleDirectMode, styleMeta, options = {}) {
  const track = getFastCreatorPreviewElement("customPreviewImagesTrack");
  const nameEl = getFastCreatorPreviewElement("customPreviewName");
  const indexEl = getFastCreatorPreviewElement("customPreviewIndex");
  const packageInfoEl = getFastCreatorPreviewElement("customPreviewPackageInfo");
  const flagEl = getFastCreatorPreviewElement("customPreviewFlag");
  const priceCircle = getFastCreatorPreviewElement("customPreviewPriceCircle");
  const barcodeWrap = getFastCreatorPreviewElement("customPreviewBarcodeWrap");
  const dividerEl = getFastCreatorPreviewElement("customPreviewDivider");
  const singleSpec = getFastCreatorExactSingleDirectLayoutSpec(styleMeta, !!options.hasImageBadge);
  const metaScaleMultiplierPreview = isFastCreatorSingleStyle(styleMeta)
    ? Math.max(0.8, Number(singleSpec.text.metaScaleMultiplier || 1))
    : 1;

  if (track instanceof HTMLElement) {
    if (isSingleDirectMode) {
      track.style.left = `${singleSpec.imgArea.x}%`;
      track.style.top = `${singleSpec.imgArea.y}%`;
      track.style.width = `${singleSpec.imgArea.w}%`;
      track.style.height = `${singleSpec.imgArea.h}%`;
    } else {
      track.style.left = "0%";
      track.style.top = "4%";
      track.style.width = "48%";
      track.style.height = "83%";
    }
    track.style.overflow = "hidden";
    track.querySelectorAll("img").forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (isSingleDirectMode) {
        img.style.transform = "none";
        img.style.transformOrigin = "center center";
        img.style.objectFit = "contain";
        img.style.objectPosition = "center center";
      } else if (!img.style.transform) {
        img.style.transform = "scale(1.08)";
        img.style.transformOrigin = "left top";
      }
    });
  }

  if (nameEl instanceof HTMLElement) {
    if (isSingleDirectMode) {
      nameEl.style.left = `${singleSpec.nameArea.x}%`;
      nameEl.style.top = `${singleSpec.nameArea.y}%`;
      nameEl.style.width = `${singleSpec.nameArea.w}%`;
      nameEl.style.fontSize = `${Math.round(10 * metaScaleMultiplierPreview)}px`;
      nameEl.style.fontWeight = "700";
      nameEl.style.color = "#1f3560";
    } else {
      nameEl.style.left = "49%";
      nameEl.style.top = "50%";
      nameEl.style.width = "47%";
      nameEl.style.fontSize = "12px";
      nameEl.style.fontWeight = "600";
      nameEl.style.color = "#111827";
    }
  }

  if (indexEl instanceof HTMLElement) {
    if (isSingleDirectMode) {
      indexEl.style.left = `${singleSpec.indexPos.x}%`;
      indexEl.style.top = `${singleSpec.indexPos.y}%`;
      indexEl.style.fontSize = `${Math.round(12 * metaScaleMultiplierPreview)}px`;
      indexEl.style.color = FASTCREATOR_DEFAULT_INDEX_TEXT_COLOR;
    } else {
      indexEl.style.left = "48.7%";
      indexEl.style.top = "62%";
      indexEl.style.fontSize = "7px";
      indexEl.style.color = FASTCREATOR_DEFAULT_INDEX_TEXT_COLOR;
    }
    indexEl.style.fontStyle = "italic";
  }

  if (packageInfoEl instanceof HTMLElement) {
    if (isSingleDirectMode) {
      packageInfoEl.style.left = `${singleSpec.packagePos.x}%`;
      packageInfoEl.style.top = `${singleSpec.packagePos.y}%`;
      packageInfoEl.style.fontSize = `${Math.round(12 * metaScaleMultiplierPreview)}px`;
      packageInfoEl.style.color = "#1f3560";
    } else {
      packageInfoEl.style.left = "48.7%";
      packageInfoEl.style.top = "65.2%";
      packageInfoEl.style.fontSize = "7px";
      packageInfoEl.style.color = "#334155";
    }
  }

  if (flagEl instanceof HTMLElement) {
    if (isSingleDirectMode) {
      flagEl.style.left = `${singleSpec.flagArea.x}%`;
      flagEl.style.top = `${singleSpec.flagArea.y}%`;
      flagEl.style.width = `${singleSpec.flagArea.w}%`;
      flagEl.style.height = `${singleSpec.flagArea.h}%`;
    } else {
      flagEl.style.left = "49%";
      flagEl.style.top = "72%";
      flagEl.style.width = "34%";
      flagEl.style.height = "3%";
    }
  }

  if (priceCircle instanceof HTMLElement) {
    if (isSingleDirectMode) {
      priceCircle.style.left = `${singleSpec.priceArea.x}%`;
      priceCircle.style.top = `${singleSpec.priceArea.y}%`;
    } else {
      priceCircle.style.left = "22%";
      priceCircle.style.top = "70%";
    }
  }

  if (barcodeWrap instanceof HTMLElement) {
    if (isSingleDirectMode) {
      barcodeWrap.style.left = `${singleSpec.barcodeArea.x}%`;
      barcodeWrap.style.top = `${singleSpec.barcodeArea.y}%`;
      barcodeWrap.style.width = `${singleSpec.barcodeArea.w}%`;
      barcodeWrap.style.height = `${singleSpec.barcodeArea.h}%`;
    } else {
      barcodeWrap.style.left = "40%";
      barcodeWrap.style.top = "76%";
      barcodeWrap.style.width = "49%";
      barcodeWrap.style.height = "22%";
    }
  }

  if (dividerEl instanceof HTMLElement) {
    if (isSingleDirectMode && singleSpec.divider.x >= 0 && singleSpec.divider.h > 0) {
      let dividerLeftPct = Number(singleSpec.divider.x);
      if (singleSpec.divider.anchor === "image-right" && track instanceof HTMLElement) {
        const hostRect = dividerEl.parentElement?.getBoundingClientRect?.();
        const imgs = Array.from(track.querySelectorAll("img"));
        if (hostRect && hostRect.width > 0 && imgs.length) {
          const rightEdge = Math.max(...imgs.map((img) => {
            const rect = getFastCreatorPreviewImageContentRect(img);
            return rect ? (Number(rect.left || 0) + Number(rect.width || 0)) : Number.NEGATIVE_INFINITY;
          }));
          if (Number.isFinite(rightEdge)) {
            const gapPx = (Number(singleSpec.divider.gapFromImage || 0) / 100) * hostRect.width;
            dividerLeftPct = ((rightEdge + gapPx - hostRect.left) / hostRect.width) * 100;
          }
        }
      }
      dividerLeftPct = Math.max(0, Math.min(100, Number.isFinite(dividerLeftPct) ? dividerLeftPct : Number(singleSpec.divider.x || 0)));
      const dividerTopPct = Math.max(0, Math.min(100, Number(singleSpec.divider.y || 0)));
      let dividerHeightPct = Math.max(0, Number(singleSpec.divider.h || 0));
      if (singleSpec.divider.snapToPriceTop && !singleSpec.text.hidePrice) {
        const targetBottomPct = Number(singleSpec.priceArea.y || 0) - Number(singleSpec.divider.gapFromPrice || 0);
        dividerHeightPct = Math.max(0.2, targetBottomPct - dividerTopPct);
      }
      dividerEl.style.display = "block";
      dividerEl.style.left = `${dividerLeftPct}%`;
      dividerEl.style.top = `${dividerTopPct}%`;
      dividerEl.style.width = `${singleSpec.divider.w}%`;
      dividerEl.style.height = `${dividerHeightPct}%`;
      dividerEl.style.background = String(singleSpec.text.dividerColor || "").trim() || "#d9d9d9";
    } else {
      dividerEl.style.display = "none";
    }
  }
}

function buildFastCreatorPreviewCatalogEntry(sourceEntry, styleMeta, previewContext, previewVisibility = null) {
  if (!sourceEntry || typeof sourceEntry !== "object") return null;
  const hydratedSourceEntry = hydrateFastCreatorPreviewEntry(sourceEntry);
  const styleId = String(styleMeta?.id || sourceEntry?.MODULE_LAYOUT_STYLE_ID || "default").trim() || "default";
  const cfg = styleMeta?.config && typeof styleMeta.config === "object"
    ? styleMeta.config
    : {};
  const textCfg = cfg.text && typeof cfg.text === "object"
    ? cfg.text
    : {};
  const fontPreset = getFastCreatorStyleFontPreset(styleId);
  const badgeMeta = getFastCreatorPriceBadgeMeta(styleMeta, hydratedSourceEntry);
  const priceValue = hasFastCreatorPriceValue(hydratedSourceEntry?.CENA)
    ? hydratedSourceEntry.CENA
    : getFastCreatorDisplayPrice(hydratedSourceEntry);
  const effectiveVisibility = previewVisibility && typeof previewVisibility === "object"
    ? previewVisibility
    : null;
  const includePrice = effectiveVisibility?.showPrice !== false;
  const includeBarcode = effectiveVisibility?.showBarcode !== false;
  const resolvedBarcode = includeBarcode ? getFastCreatorDisplayEan(hydratedSourceEntry) : "";
  const priceTextColor = String(
    textCfg.priceColor
    || hydratedSourceEntry?.PRICE_TEXT_COLOR
    || ((textCfg.noPriceCircle || textCfg.hidePriceBadge) ? "#d71920" : "#ffffff")
  ).trim() || "#ffffff";
  const previewImageUrl = String(
    previewContext?.imageUrl
    || getFastCreatorPreviewImageUrl(hydratedSourceEntry)
    || getFastCreatorCachedImageUrl(hydratedSourceEntry)
    || ""
  ).trim();
  const packageValue = String(
    hydratedSourceEntry?.CUSTOM_PACKAGE_VALUE
    || hydratedSourceEntry?.packageValue
    || hydratedSourceEntry?.IL_OPK_ZB
    || hydratedSourceEntry?.ILOSC
    || hydratedSourceEntry?.raw?.IL_OPK_ZB
    || hydratedSourceEntry?.raw?.ILOSC
    || ""
  ).trim();
  const packageUnit = String(
    hydratedSourceEntry?.CUSTOM_PACKAGE_UNIT
    || hydratedSourceEntry?.packageUnit
    || hydratedSourceEntry?.JEDNOSTKA
    || hydratedSourceEntry?.JM
    || hydratedSourceEntry?.UNIT
    || hydratedSourceEntry?.raw?.JEDNOSTKA
    || hydratedSourceEntry?.raw?.JM
    || ""
  ).trim();
  const textFontFamily = normalizeFastCreatorPreviewFont(
    textCfg.metaFontFamily
    || hydratedSourceEntry?.TEXT_FONT_FAMILY
    || fontPreset.meta,
    fontPreset.meta || "Arial"
  );
  const priceFontFamily = normalizeFastCreatorPreviewFont(
    textCfg.priceFontFamily
    || hydratedSourceEntry?.PRICE_FONT_FAMILY
    || fontPreset.price,
    fontPreset.price || "Arial"
  );
  const normalizedEntry = {
    ...hydratedSourceEntry,
    INDEKS: getFastCreatorDisplayIndex(hydratedSourceEntry),
    NAZWA: getFastCreatorDisplayName(hydratedSourceEntry),
    JEDNOSTKA: packageUnit || "SZT",
    CUSTOM_PACKAGE_VALUE: packageValue,
    CUSTOM_PACKAGE_UNIT: packageUnit,
    CENA: priceValue,
    HIDE_PRICE: !includePrice || !hasFastCreatorPriceValue(priceValue),
    PRICE_BG_COLOR: String(textCfg.priceBgColor || hydratedSourceEntry?.PRICE_BG_COLOR || "#d71920").trim() || "#d71920",
    PRICE_BG_STYLE_ID: badgeMeta.id || "solid",
    PRICE_BG_IMAGE_URL: badgeMeta.url || "",
    PRICE_TEXT_COLOR: priceTextColor,
    PRICE_TEXT_SCALE: Number.isFinite(Number(hydratedSourceEntry?.PRICE_TEXT_SCALE))
      ? Number(hydratedSourceEntry.PRICE_TEXT_SCALE)
      : 1,
    PRICE_CURRENCY_SYMBOL: getFastCreatorCurrencySymbol(hydratedSourceEntry, "£"),
    PRICE_FONT_FAMILY: priceFontFamily,
    PRICE_TEXT_BOLD: hydratedSourceEntry?.PRICE_TEXT_BOLD ?? textCfg.forcePriceBold ?? true,
    PRICE_TEXT_UNDERLINE: hydratedSourceEntry?.PRICE_TEXT_UNDERLINE ?? false,
    PRICE_TEXT_ALIGN: normalizeFastCreatorAlign(hydratedSourceEntry?.PRICE_TEXT_ALIGN || textCfg.priceTextAlign || "left", "left"),
    MODULE_LAYOUT_STYLE_ID: styleId,
    MODULE_LAYOUT_EDITOR_SNAPSHOT_SOURCE_STYLE_ID: styleId,
    MODULE_LAYOUT_EDITOR_SNAPSHOT: null,
    MODULE_LAYOUT_PRICE_STYLE_ID: "",
    MODULE_LAYOUT_PRICE_STYLE_SNAPSHOT: null,
    TEXT_FONT_FAMILY: textFontFamily,
    TEXT_COLOR: String(hydratedSourceEntry?.TEXT_COLOR || "#1f3560").trim() || "#1f3560",
    TEXT_INDEX_COLOR: String(hydratedSourceEntry?.TEXT_INDEX_COLOR || FASTCREATOR_DEFAULT_INDEX_TEXT_COLOR).trim() || FASTCREATOR_DEFAULT_INDEX_TEXT_COLOR,
    TEXT_INDEX_ITALIC: typeof hydratedSourceEntry?.TEXT_INDEX_ITALIC === "boolean"
      ? hydratedSourceEntry.TEXT_INDEX_ITALIC
      : true,
    TEXT_BOLD: hydratedSourceEntry?.TEXT_BOLD ?? true,
    TEXT_UNDERLINE: hydratedSourceEntry?.TEXT_UNDERLINE ?? false,
    TEXT_ALIGN: normalizeFastCreatorAlign(hydratedSourceEntry?.TEXT_ALIGN || "left", "left"),
    CUSTOM_SOURCE_PRODUCT_INDEX: String(
      hydratedSourceEntry?.CUSTOM_SOURCE_PRODUCT_INDEX
      || hydratedSourceEntry?.INDEKS
      || hydratedSourceEntry?.index
      || ""
    ).trim(),
    FAMILY_IMAGE_URLS: Array.isArray(hydratedSourceEntry?.FAMILY_IMAGE_URLS) && hydratedSourceEntry.FAMILY_IMAGE_URLS.length
      ? hydratedSourceEntry.FAMILY_IMAGE_URLS
      : (previewImageUrl ? [previewImageUrl] : []),
    "KOD EAN": resolvedBarcode,
    "KOD KRESKOWY": resolvedBarcode,
    KOD_KRESKOWY: resolvedBarcode,
    ean: resolvedBarcode,
    EAN: resolvedBarcode,
    barcode: resolvedBarcode,
    TNZ: String(hydratedSourceEntry?.TNZ || hydratedSourceEntry?.raw?.["text-right"] || "").trim(),
    LOGO: String(hydratedSourceEntry?.LOGO || hydratedSourceEntry?.raw?.["text-left 2"] || "").trim(),
    KRAJPOCHODZENIA: String(
      hydratedSourceEntry?.KRAJPOCHODZENIA
      || hydratedSourceEntry?.raw?.["text-left 3"]
      || hydratedSourceEntry?.country
      || ""
    ).trim()
  };
  normalizedEntry.CUSTOM_PACKAGE_INFO_TEXT = buildFastCreatorPackageText(normalizedEntry);
  return normalizedEntry;
}

async function renderFastCreatorConfiguredStylePreview(styleMeta, previewContext, previewVisibility = null) {
  const card = getFastCreatorPreviewElement("customPreviewCard");
  const track = getFastCreatorPreviewElement("customPreviewImagesTrack");
  const img = ensureFastCreatorPreviewImageElement();
  const dividerEl = getFastCreatorPreviewElement("customPreviewDivider");
  const nameEl = getFastCreatorPreviewElement("customPreviewName");
  const indexEl = getFastCreatorPreviewElement("customPreviewIndex");
  const packageEl = getFastCreatorPreviewElement("customPreviewPackageInfo");
  const flagEl = getFastCreatorPreviewElement("customPreviewFlag");
  const priceCircle = getFastCreatorPreviewElement("customPreviewPriceCircle");
  const priceRowEl = getFastCreatorPreviewElement("customPreviewPriceRow");
  const mainEl = getFastCreatorPreviewElement("customPreviewPriceMain");
  const decEl = getFastCreatorPreviewElement("customPreviewPriceDec");
  const unitEl = getFastCreatorPreviewElement("customPreviewPriceUnit");
  const barcodeWrap = getFastCreatorPreviewElement("customPreviewBarcodeWrap");
  const barcodeEl = getFastCreatorPreviewElement("customPreviewBarcode");
  const barcodeImageEl = ensureFastCreatorPreviewBarcodeImageElement();
  const sourceEntry = previewContext?.product && typeof previewContext.product === "object"
    ? previewContext.product
    : null;

  if (
    !(card instanceof HTMLElement)
    || !(track instanceof HTMLElement)
    || !(img instanceof HTMLImageElement)
    || !(nameEl instanceof HTMLElement)
    || !(indexEl instanceof HTMLElement)
    || !(packageEl instanceof HTMLElement)
    || !(priceCircle instanceof HTMLElement)
    || !(priceRowEl instanceof HTMLElement)
    || !(mainEl instanceof HTMLElement)
    || !(decEl instanceof HTMLElement)
    || !(unitEl instanceof HTMLElement)
  ) {
    return false;
  }

  const styleId = String(styleMeta?.id || "default").trim() || "default";
  const previewCatalogEntry = sourceEntry
    ? buildFastCreatorPreviewCatalogEntry(sourceEntry, styleMeta, previewContext, previewVisibility)
    : null;
  const previewImageUrl = String(
    previewContext?.imageUrl
    || getFastCreatorPreviewImageUrl(previewCatalogEntry || sourceEntry)
    || getFastCreatorCachedImageUrl(previewCatalogEntry || sourceEntry)
    || ""
  ).trim();

  if (!previewCatalogEntry) {
    setFastCreatorPreviewSnapshotMode(false);
    nameEl.textContent = "";
    indexEl.textContent = "";
    packageEl.textContent = "";
    mainEl.textContent = "0";
    decEl.textContent = "00";
    unitEl.textContent = `${getFastCreatorCurrencySymbol(null, "£")} / SZT.`;
    if (barcodeEl instanceof SVGElement) barcodeEl.innerHTML = "";
    track.style.display = "none";
    priceCircle.style.display = "none";
    if (barcodeWrap instanceof HTMLElement) barcodeWrap.style.display = "none";
    if (flagEl instanceof HTMLElement) flagEl.style.display = "none";
    return true;
  }

  const editorSnapshot = getFastCreatorCatalogEntryModuleLayoutEditorSnapshot(previewCatalogEntry, styleId);
  if (editorSnapshot) {
    const previewPriceBadgeStyleId = String(previewCatalogEntry?.PRICE_BG_STYLE_ID || "solid").trim() || "solid";
    const hasImageBadgePreview = previewPriceBadgeStyleId !== "solid";
    applyFastCreatorPreviewLayoutMode(true, styleMeta, {
      hasImageBadge: hasImageBadgePreview
    });
    const rendered = await renderFastCreatorPreviewFromEditorSnapshot(editorSnapshot, {
      product: sourceEntry,
      catalogEntry: previewCatalogEntry,
      imageUrl: previewImageUrl,
      barcodeImageUrl: getFastCreatorPreviewBarcodeImageUrl(previewContext, previewCatalogEntry, sourceEntry),
      styleMeta,
      previewVisibility
    });
    await syncFastCreatorPreviewBarcodeOverlay({
      previewCatalogEntry,
      sourceEntry,
      previewContext,
      previewVisibility,
      skipWhenSnapshotHasBarcode: true
    });
    return rendered;
  }

  setFastCreatorPreviewSnapshotMode(false);
  const isSingleDirectPreview = true;
  const previewPriceBadgeStyleId = String(previewCatalogEntry?.PRICE_BG_STYLE_ID || "solid").trim() || "solid";
  const hasImageBadgePreview = previewPriceBadgeStyleId !== "solid";
  const exactSingleSpec = getFastCreatorExactSingleDirectLayoutSpec(styleMeta, hasImageBadgePreview);
  const elegantPreviewPriceScale = styleId === "default" ? 0.61 : 1;
  const previewPriceSource = hasFastCreatorPriceValue(previewCatalogEntry?.CENA)
    ? previewCatalogEntry.CENA
    : getFastCreatorDisplayPrice(previewCatalogEntry || sourceEntry);
  const hidePriceFromData = previewCatalogEntry?.HIDE_PRICE === true || !hasFastCreatorPriceValue(previewPriceSource);
  const hideImagePreview = isSingleDirectPreview && !!exactSingleSpec.text.hideImage;
  const hideNamePreview = isSingleDirectPreview && !!exactSingleSpec.text.hideName;
  const hideIndexPreview = isSingleDirectPreview && !!exactSingleSpec.text.hideIndex;
  const hidePackagePreview = isSingleDirectPreview && !!exactSingleSpec.text.hidePackage;
  const forceShowPricePreview = !!previewVisibility && previewVisibility.showPrice !== false;
  const forceShowBarcodePreview = !!previewVisibility && previewVisibility.showBarcode === true;
  const hidePricePreview = hidePriceFromData || (!forceShowPricePreview && isSingleDirectPreview && !!exactSingleSpec.text.hidePrice);
  const hideBarcodePreview = !forceShowBarcodePreview && isSingleDirectPreview && !!exactSingleSpec.text.hideBarcode;
  const hideFlagPreview = isSingleDirectPreview && !!exactSingleSpec.text.hideFlag;

  applyFastCreatorPreviewLayoutMode(isSingleDirectPreview, styleMeta, {
    hasImageBadge: hasImageBadgePreview
  });

  track.style.display = hideImagePreview ? "none" : "block";
  img.style.position = "absolute";
  img.style.left = "0";
  img.style.top = "0";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.display = !hideImagePreview && !!previewImageUrl ? "block" : "none";
  if (previewImageUrl) img.src = previewImageUrl;
  else img.removeAttribute("src");

  nameEl.textContent = hideNamePreview ? "" : String(previewCatalogEntry?.NAZWA || getFastCreatorDisplayName(sourceEntry) || "-");
  indexEl.textContent = hideIndexPreview ? "" : String(previewCatalogEntry?.INDEKS || getFastCreatorDisplayIndex(sourceEntry) || "-");
  packageEl.textContent = hidePackagePreview ? "" : String(previewCatalogEntry?.CUSTOM_PACKAGE_INFO_TEXT || buildFastCreatorPackageText(sourceEntry) || "");
  nameEl.style.display = hideNamePreview ? "none" : "block";
  indexEl.style.display = hideIndexPreview ? "none" : "block";
  packageEl.style.display = hidePackagePreview ? "none" : "block";
  priceCircle.style.display = hidePricePreview ? "none" : "flex";
  priceCircle.style.alignItems = "center";
  priceCircle.style.justifyContent = "center";
  priceCircle.style.backgroundImage = "none";
  priceCircle.style.backgroundRepeat = "no-repeat";
  priceCircle.style.backgroundPosition = "center";
  priceCircle.style.boxSizing = "border-box";

  const price = formatFastCreatorPrice(previewPriceSource);
  const currencySymbol = getFastCreatorCurrencySymbol(previewCatalogEntry, price.currency);
  const metaAlign = normalizeFastCreatorAlign(previewCatalogEntry?.TEXT_ALIGN || "left", "left");
  const useCustomSingleTextPalette = isSingleDirectPreview && isFastCreatorSingleStyle(styleMeta);
  const useAbsolutePriceTextOffsetPreview = useCustomSingleTextPalette
    && String(exactSingleSpec.text.priceTextOffsetMode || "").trim().toLowerCase() === "absolute";
  const styleMetaFontPreview = normalizeFastCreatorPreviewFont(exactSingleSpec.text.metaFontFamily || "", "");
  const metaFont = normalizeFastCreatorPreviewFont(
    (useCustomSingleTextPalette && styleMetaFontPreview)
      ? styleMetaFontPreview
      : previewCatalogEntry?.TEXT_FONT_FAMILY,
    "Arial"
  );
  const metaColor = String(previewCatalogEntry?.TEXT_COLOR || "#1f3560");
  const metaBold = boolFastCreatorAttrToFlag(previewCatalogEntry?.TEXT_BOLD);
  const metaUnderline = boolFastCreatorAttrToFlag(previewCatalogEntry?.TEXT_UNDERLINE);
  const stylePriceFontPreview = normalizeFastCreatorPreviewFont(exactSingleSpec.text.priceFontFamily || "", "");
  const priceFont = normalizeFastCreatorPreviewFont(
    (useCustomSingleTextPalette && stylePriceFontPreview)
      ? stylePriceFontPreview
      : previewCatalogEntry?.PRICE_FONT_FAMILY,
    "Arial"
  );
  const priceBold = boolFastCreatorAttrToFlag(previewCatalogEntry?.PRICE_TEXT_BOLD);
  const hidePriceBadgePreview = useCustomSingleTextPalette && !!exactSingleSpec.text.hidePriceBadge;
  const noPriceCirclePreview = useCustomSingleTextPalette && !!exactSingleSpec.text.noPriceCircle;
  const isRoundedRectPricePreview = useCustomSingleTextPalette
    && !hidePriceBadgePreview
    && !noPriceCirclePreview
    && exactSingleSpec.text.priceShape === "roundedRect";
  const effectivePriceBoldPreview = useCustomSingleTextPalette && exactSingleSpec.text.forcePriceBold ? true : priceBold;
  const priceScaleBoostPreview = useCustomSingleTextPalette
    ? normalizeFastCreatorScale(exactSingleSpec.text.priceScaleMultiplier, 1)
    : 1;
  const priceUnderline = boolFastCreatorAttrToFlag(previewCatalogEntry?.PRICE_TEXT_UNDERLINE);
  const stylePriceAlignPreview = useCustomSingleTextPalette && String(exactSingleSpec.text.priceTextAlign || "").trim()
    ? normalizeFastCreatorAlign(exactSingleSpec.text.priceTextAlign, "left")
    : "";
  const priceAlign = stylePriceAlignPreview
    || normalizeFastCreatorAlign(previewCatalogEntry?.PRICE_TEXT_ALIGN || "left", "left");

  const nameColor = useCustomSingleTextPalette ? (exactSingleSpec.text.nameColor || "#111111") : metaColor;
  const indexColor = useCustomSingleTextPalette
    ? (exactSingleSpec.text.indexColor || FASTCREATOR_DEFAULT_INDEX_TEXT_COLOR)
    : String(previewCatalogEntry?.TEXT_INDEX_COLOR || FASTCREATOR_DEFAULT_INDEX_TEXT_COLOR);
  const packageColor = useCustomSingleTextPalette ? (exactSingleSpec.text.packageColor || "#111111") : metaColor;
  nameEl.style.fontFamily = metaFont;
  indexEl.style.fontFamily = metaFont;
  packageEl.style.fontFamily = metaFont;
  nameEl.style.color = nameColor;
  indexEl.style.color = indexColor;
  packageEl.style.color = packageColor;
  nameEl.style.fontWeight = (useCustomSingleTextPalette && exactSingleSpec.text.nameWeight)
    ? exactSingleSpec.text.nameWeight
    : (metaBold ? "700" : "500");
  indexEl.style.fontWeight = (useCustomSingleTextPalette && exactSingleSpec.text.indexWeight)
    ? exactSingleSpec.text.indexWeight
    : (metaBold ? "700" : "700");
  packageEl.style.fontWeight = (useCustomSingleTextPalette && exactSingleSpec.text.packageWeight)
    ? exactSingleSpec.text.packageWeight
    : (metaBold ? "700" : "600");
  nameEl.style.textDecoration = metaUnderline ? "underline" : "none";
  indexEl.style.textDecoration = metaUnderline ? "underline" : "none";
  packageEl.style.textDecoration = metaUnderline ? "underline" : "none";
  nameEl.style.textAlign = metaAlign;
  indexEl.style.textAlign = metaAlign;
  packageEl.style.textAlign = metaAlign;
  nameEl.style.lineHeight = "1.04";
  indexEl.style.fontStyle = (isSingleDirectPreview && useCustomSingleTextPalette)
    ? (exactSingleSpec.text.indexItalic ? "italic" : "normal")
    : ((previewCatalogEntry?.TEXT_INDEX_ITALIC === false) ? "normal" : "italic");

  mainEl.textContent = price.main;
  decEl.textContent = price.dec;
  unitEl.textContent = `${currencySymbol} / ${isFastCreatorWeightProduct(previewCatalogEntry) ? "KG" : "SZT."}`;
  const effectivePriceTextColor = resolveFastCreatorDirectPriceTextColor(
    previewCatalogEntry?.PRICE_TEXT_COLOR,
    exactSingleSpec,
    { noPriceCircle: !!(noPriceCirclePreview || hidePriceBadgePreview) }
  );
  mainEl.style.color = effectivePriceTextColor;
  decEl.style.color = effectivePriceTextColor;
  unitEl.style.color = effectivePriceTextColor;
  mainEl.style.fontFamily = priceFont;
  decEl.style.fontFamily = priceFont;
  unitEl.style.fontFamily = priceFont;
  const strongNoCircleBoldPreview = noPriceCirclePreview && effectivePriceBoldPreview;
  mainEl.style.fontWeight = (useCustomSingleTextPalette && exactSingleSpec.text.priceMainWeight)
    ? exactSingleSpec.text.priceMainWeight
    : (strongNoCircleBoldPreview ? "900" : (effectivePriceBoldPreview ? "800" : "600"));
  decEl.style.fontWeight = (useCustomSingleTextPalette && exactSingleSpec.text.priceDecWeight)
    ? exactSingleSpec.text.priceDecWeight
    : (strongNoCircleBoldPreview ? "800" : (effectivePriceBoldPreview ? "700" : "500"));
  unitEl.style.fontWeight = (useCustomSingleTextPalette && exactSingleSpec.text.priceUnitWeight)
    ? exactSingleSpec.text.priceUnitWeight
    : (strongNoCircleBoldPreview ? "800" : (effectivePriceBoldPreview ? "700" : "500"));
  mainEl.style.textDecoration = priceUnderline ? "underline" : "none";
  decEl.style.textDecoration = priceUnderline ? "underline" : "none";
  unitEl.style.textDecoration = priceUnderline ? "underline" : "none";

  priceRowEl.style.position = "";
  priceRowEl.style.left = "";
  priceRowEl.style.top = "";
  priceRowEl.style.width = "";
  priceRowEl.style.maxWidth = "";
  priceRowEl.style.flex = "";
  priceRowEl.style.gap = "";
  priceRowEl.style.justifyContent = priceAlign === "right" ? "flex-end" : (priceAlign === "center" ? "center" : "flex-start");
  if (useCustomSingleTextPalette) {
    const customOffsetX = Number(exactSingleSpec.priceTextOffset?.x || 0);
    const customOffsetY = Number(exactSingleSpec.priceTextOffset?.y || 0);
    priceRowEl.style.position = "absolute";
    priceRowEl.style.left = `${customOffsetX * 100}%`;
    priceRowEl.style.top = `${customOffsetY * 100}%`;
    priceRowEl.style.width = "100%";
    priceRowEl.style.gap = "5px";
  }
  if (useAbsolutePriceTextOffsetPreview) {
    priceRowEl.style.padding = hidePriceBadgePreview || noPriceCirclePreview
      ? "0 0 0 0"
      : (isRoundedRectPricePreview ? "0 6px" : "0 8px");
    priceRowEl.style.transform = "none";
  } else if (hidePriceBadgePreview || noPriceCirclePreview) {
    priceRowEl.style.padding = "0 0 0 0";
    priceRowEl.style.transform = "none";
  } else if (isRoundedRectPricePreview) {
    priceRowEl.style.padding = "0 6px";
    priceRowEl.style.transform = "none";
  } else if (isSingleDirectPreview) {
    priceRowEl.style.padding = hasImageBadgePreview ? "0" : "0 10px";
    priceRowEl.style.transform = hasImageBadgePreview
      ? "none"
      : (priceAlign === "right"
        ? "translate(0px, 3px)"
        : (priceAlign === "center" ? "translate(4px, 3px)" : "translate(8px, 3px)"));
  } else {
    priceRowEl.style.padding = hasImageBadgePreview ? "0" : "0 8px";
    priceRowEl.style.transform = "none";
  }

  const cardWidth = Math.max(1, Number(card.clientWidth || FASTCREATOR_PREVIEW_BASE_WIDTH));
  const cardHeight = Math.max(1, Number(card.clientHeight || FASTCREATOR_PREVIEW_BASE_HEIGHT));
  const singlePriceRatio = Math.max(0.12, (Number(exactSingleSpec.priceArea.s) || 24) / 100);
  const exactCircleBase = Math.max(1, Math.round((Number(exactSingleSpec.priceArea.s) || 24) * cardWidth / 100));
  const base = useCustomSingleTextPalette
    ? exactCircleBase
    : Math.max(
        isSingleDirectPreview ? 78 : 68,
        Math.round(cardWidth * (isSingleDirectPreview ? singlePriceRatio : 0.18) * elegantPreviewPriceScale)
      );
  const priceTextScalePreview = Number(previewCatalogEntry?.PRICE_TEXT_SCALE);
  const scale = (Number.isFinite(priceTextScalePreview) ? priceTextScalePreview : 1) * priceScaleBoostPreview;

  if (hidePriceBadgePreview) {
    priceCircle.style.width = `${base}px`;
    priceCircle.style.height = `${base}px`;
    priceCircle.style.background = "transparent";
    priceCircle.style.backgroundImage = "none";
    priceCircle.style.borderRadius = "0";
  } else if (noPriceCirclePreview) {
    if (useCustomSingleTextPalette) {
      priceCircle.style.width = `${base}px`;
      priceCircle.style.height = `${base}px`;
    } else {
      priceCircle.style.width = `${Math.max(140, Math.round(base * 3.2))}px`;
      priceCircle.style.height = `${Math.max(34, Math.round(base * 0.75))}px`;
    }
    priceCircle.style.background = "transparent";
    priceCircle.style.backgroundImage = "none";
    priceCircle.style.borderRadius = "0";
  } else if (isRoundedRectPricePreview) {
    const rectWidth = useCustomSingleTextPalette
      ? Math.max(1, Math.round((Number(exactSingleSpec.priceArea.w) > 0 ? exactSingleSpec.priceArea.w : 24) * cardWidth / 100))
      : Math.max(86, Math.round((Number(exactSingleSpec.priceArea.w) > 0 ? exactSingleSpec.priceArea.w : 24) * cardWidth / 100));
    const rectHeight = useCustomSingleTextPalette
      ? Math.max(1, Math.round((Number(exactSingleSpec.priceArea.h) > 0 ? exactSingleSpec.priceArea.h : 11.5) * cardHeight / 100))
      : Math.max(34, Math.round((Number(exactSingleSpec.priceArea.h) > 0 ? exactSingleSpec.priceArea.h : 11.5) * cardHeight / 100));
    const rectRadius = useCustomSingleTextPalette
      ? Math.max(0, Math.round((Number(exactSingleSpec.text.priceBgRadius || exactSingleSpec.priceArea.r || 2.2)) * cardWidth / 100))
      : Math.max(6, Math.round((Number(exactSingleSpec.text.priceBgRadius || exactSingleSpec.priceArea.r || 2.2)) * cardWidth / 100));
    priceCircle.style.width = `${rectWidth}px`;
    priceCircle.style.height = `${rectHeight}px`;
    priceCircle.style.borderRadius = `${rectRadius}px`;
    const roundedBadgeBgUrl = String(previewCatalogEntry?.PRICE_BG_IMAGE_URL || "").trim();
    const roundedPreviewBg = String(
      previewCatalogEntry?.PRICE_BG_COLOR
      || exactSingleSpec.text.priceBgColor
      || "#2eaee8"
    );
    if (previewPriceBadgeStyleId !== "solid" && roundedBadgeBgUrl) {
      priceCircle.style.background = "transparent";
      priceCircle.style.backgroundImage = `url("${roundedBadgeBgUrl}")`;
      priceCircle.style.backgroundRepeat = "no-repeat";
      priceCircle.style.backgroundPosition = "center";
      priceCircle.style.backgroundSize = "100% 100%";
    } else {
      priceCircle.style.backgroundImage = "none";
      priceCircle.style.background = roundedPreviewBg;
    }
  } else {
    priceCircle.style.width = `${base}px`;
    priceCircle.style.height = `${base}px`;
    priceCircle.style.borderRadius = "50%";
    const badgeBgUrl = String(previewCatalogEntry?.PRICE_BG_IMAGE_URL || "").trim();
    if (previewPriceBadgeStyleId !== "solid" && badgeBgUrl) {
      priceCircle.style.background = "transparent";
      priceCircle.style.backgroundImage = `url("${badgeBgUrl}")`;
      priceCircle.style.backgroundRepeat = "no-repeat";
      priceCircle.style.backgroundPosition = "center";
      priceCircle.style.backgroundSize = getFastCreatorPreviewImageBadgeCircleBackgroundSize(
        previewPriceBadgeStyleId,
        isSingleDirectPreview
      );
    } else {
      priceCircle.style.backgroundImage = "none";
      priceCircle.style.background = String(previewCatalogEntry?.PRICE_BG_COLOR || "#d71920");
    }
  }

  const previewPriceBase = hidePriceBadgePreview
    ? base
    : (isRoundedRectPricePreview
      ? Math.max(34, parseInt(priceCircle.style.height || "34", 10))
      : base);
  const customPriceFactorsPreview = useCustomSingleTextPalette
    ? getFastCreatorStoredCustomPriceTypographyFactors(exactSingleSpec.text)
    : null;
  const previewCircleMainScale = getFastCreatorPreviewCirclePriceMainScale(
    price.main,
    hasImageBadgePreview && isSingleDirectPreview && !hidePriceBadgePreview && !noPriceCirclePreview && !isRoundedRectPricePreview,
    previewPriceBadgeStyleId,
    isSingleDirectPreview
  );
  const previewUnitPx = useCustomSingleTextPalette
    ? Math.max(1, Math.round(previewPriceBase * (customPriceFactorsPreview
      ? customPriceFactorsPreview.unit
      : ((hidePriceBadgePreview || noPriceCirclePreview) ? 0.22 : (isRoundedRectPricePreview ? 0.26 : (isSingleDirectPreview ? 0.095 : 0.11)))) * scale))
    : Math.max(7, Math.round(previewPriceBase * ((hidePriceBadgePreview || noPriceCirclePreview) ? 0.22 : (isRoundedRectPricePreview ? 0.26 : (isSingleDirectPreview ? 0.095 : 0.11))) * scale));
  const previewDecPx = (hidePriceBadgePreview || noPriceCirclePreview)
    ? (customPriceFactorsPreview
      ? Math.max(1, Math.round(previewPriceBase * customPriceFactorsPreview.dec * scale))
      : previewUnitPx)
    : (useCustomSingleTextPalette
      ? Math.max(1, Math.round(previewPriceBase * (customPriceFactorsPreview
        ? customPriceFactorsPreview.dec
        : (isRoundedRectPricePreview ? 0.26 : 0.14)) * scale))
      : Math.max(8, Math.round(previewPriceBase * (isRoundedRectPricePreview ? 0.26 : 0.14) * scale)));
  const previewMainPx = useCustomSingleTextPalette
    ? Math.max(1, Math.round(previewPriceBase * (customPriceFactorsPreview
      ? customPriceFactorsPreview.main
      : ((hidePriceBadgePreview || noPriceCirclePreview) ? 0.56 : (isRoundedRectPricePreview ? 0.80 : (isSingleDirectPreview ? 0.475 : 0.38)))) * scale * previewCircleMainScale))
    : Math.max(12, Math.round(previewPriceBase * ((hidePriceBadgePreview || noPriceCirclePreview) ? 0.56 : (isRoundedRectPricePreview ? 0.80 : (isSingleDirectPreview ? 0.475 : 0.38))) * scale * previewCircleMainScale));
  mainEl.style.fontSize = `${previewMainPx}px`;
  decEl.style.fontSize = `${previewDecPx}px`;
  unitEl.style.fontSize = `${previewUnitPx}px`;
  unitEl.style.whiteSpace = "nowrap";
  unitEl.style.letterSpacing = (useCustomSingleTextPalette || !isSingleDirectPreview || noPriceCirclePreview || isRoundedRectPricePreview)
    ? "0"
    : "-0.1px";
  if (!useCustomSingleTextPalette && isSingleDirectPreview && !noPriceCirclePreview && !isRoundedRectPricePreview) {
    unitEl.style.transform = "translateY(-1px)";
  } else {
    unitEl.style.transform = "none";
  }

  if (!hidePriceBadgePreview && !noPriceCirclePreview && !isRoundedRectPricePreview && priceRowEl) {
    applyFastCreatorPreviewAutoCircleBadgeLayout({
      priceCircle,
      priceRowEl,
      mainEl,
      decEl,
      unitEl,
      majorText: mainEl?.textContent || "",
      styleId: previewPriceBadgeStyleId,
      isSingleLayout: isSingleDirectPreview,
      baseDiameter: base,
      isImageBadge: hasImageBadgePreview,
      gapPx: isSingleDirectPreview ? 4 : 5
    });
  }

  const eanDigits = getFastCreatorDisplayEan(previewCatalogEntry || sourceEntry);
  const showFlagPreview = !hideFlagPreview && !!String(previewCatalogEntry?.KRAJPOCHODZENIA || "").trim();
  const showBarcodePreview = !hideBarcodePreview && !!eanDigits;

  if (flagEl instanceof HTMLElement) {
    flagEl.style.display = showFlagPreview ? "flex" : "none";
    flagEl.setAttribute("title", inferFastCreatorFlagCode(previewCatalogEntry));
  }
  if (!showBarcodePreview && barcodeWrap instanceof HTMLElement) {
    barcodeWrap.style.display = "none";
  }
  await syncFastCreatorPreviewBarcodeOverlay({
    previewCatalogEntry,
    sourceEntry,
    previewContext,
    previewVisibility
  });

  return true;
}

function renderFastCreatorStyleOptions() {
  const options = getFastCreatorStyleOptions();
  fastCreatorState.styleOptions = options;
  if (!options.length) {
    setFastCreatorStatus("style", "Nie udalo sie wczytac listy stylow.", "error");
    updateFastCreatorStyleSelector();
    return;
  }

  const availableIds = new Set(options.map((option) => option.id));
  if (!availableIds.has(fastCreatorState.selectedStyleId)) {
    fastCreatorState.selectedStyleId = options[0].id;
  }
  updateFastCreatorStyleSelector();
}

function updateFastCreatorStyleSelector() {
  const options = Array.isArray(fastCreatorState.styleOptions) ? fastCreatorState.styleOptions : [];
  const currentIndex = Math.max(0, options.findIndex((option) => option.id === fastCreatorState.selectedStyleId));
  const current = options[currentIndex] || null;
  const currentLabel = current?.label || "Brak stylów";
  const currentIndexLabel = options.length
    ? `${currentIndex + 1} / ${options.length}`
    : "0 / 0";

  if (fastCreatorState.elements.styleCurrentName) {
    fastCreatorState.elements.styleCurrentName.textContent = currentLabel;
  }
  if (fastCreatorState.elements.styleCurrentIndex) {
    fastCreatorState.elements.styleCurrentIndex.textContent = currentIndexLabel;
  }
  if (fastCreatorState.elements.optionsCurrentName) {
    fastCreatorState.elements.optionsCurrentName.textContent = currentLabel;
  }
  if (fastCreatorState.elements.optionsCurrentIndex) {
    fastCreatorState.elements.optionsCurrentIndex.textContent = currentIndexLabel;
  }
  if (fastCreatorState.elements.optionsStyleName) {
    fastCreatorState.elements.optionsStyleName.textContent = currentLabel;
  }
}

function updateFastCreatorStyleSummary() {
  const selected = fastCreatorState.styleOptions.find((option) => option.id === fastCreatorState.selectedStyleId) || null;
  const productCount = Number(fastCreatorState.lastExcelSummary?.productCount || 0);
  const assignedCount = Number(fastCreatorState.lastExcelSummary?.assignedPageProductCount || 0);
  const hasAssignments = fastCreatorState.lastExcelSummary?.pageAssignmentsDetected === true;
  const summaryText = selected && productCount > 0
    ? (hasAssignments
      ? `${productCount} produktów • przypisano do stron: ${assignedCount} • Styl: ${selected.label}`
      : `${productCount} produktów • brak przypisania do stron • Styl: ${selected.label}`)
    : (selected ? `Wybrany styl: ${selected.label}` : "Brak danych o stylu.");
  if (fastCreatorState.elements.styleProjectMeta) {
    fastCreatorState.elements.styleProjectMeta.textContent = summaryText;
  }
  if (fastCreatorState.elements.optionsProjectMeta) {
    fastCreatorState.elements.optionsProjectMeta.textContent = summaryText;
  }
  if (fastCreatorState.elements.finalizeProjectMeta) {
    fastCreatorState.elements.finalizeProjectMeta.textContent = getFastCreatorFinalizeMetaText(selected);
  }
  renderFastCreatorFinalizeReport();
}

function syncFastCreatorPreviewVisibilityControls() {
  const visibility = getFastCreatorPreviewVisibilitySettings();
  if (fastCreatorState.elements.showPriceToggle) {
    fastCreatorState.elements.showPriceToggle.checked = visibility.showPrice;
  }
  if (fastCreatorState.elements.showBarcodeToggle) {
    fastCreatorState.elements.showBarcodeToggle.checked = visibility.showBarcode;
  }
}

function applyFastCreatorVisibilityOptionsToEntry(entry, visibility) {
  if (!entry || typeof entry !== "object") return;
  const showPrice = visibility?.showPrice !== false;
  const showBarcode = visibility?.showBarcode !== false;
  const currentEan = scientificToPlainFastCreator(
    getFastCreatorDisplayEan(entry)
    || entry.FASTCREATOR_ORIGINAL_KOD_EAN
    || ""
  );

  entry.HIDE_PRICE = !showPrice || !hasFastCreatorPriceValue(
    entry?.CENA
    || entry?.price
    || entry?.netto
    || entry?.CENA_NETTO_FV
    || entry?.raw?.CENA
    || entry?.raw?.PRICE
    || ""
  );

  if (!showBarcode) {
    if (currentEan && !entry.FASTCREATOR_ORIGINAL_KOD_EAN) {
      entry.FASTCREATOR_ORIGINAL_KOD_EAN = currentEan;
    }
    entry["KOD EAN"] = "";
    entry["KOD KRESKOWY"] = "";
    entry.KOD_KRESKOWY = "";
    entry.ean = "";
    entry.EAN = "";
    entry.barcode = "";
    if (entry.raw && typeof entry.raw === "object") {
      entry.raw["KOD EAN"] = "";
      entry.raw["KOD KRESKOWY"] = "";
      entry.raw.KOD_KRESKOWY = "";
      entry.raw["text-right 2"] = "";
      entry.raw.ean = "";
      entry.raw.EAN = "";
      entry.raw.barcode = "";
    }
    return;
  }

  const restoredEan = scientificToPlainFastCreator(
    entry.FASTCREATOR_ORIGINAL_KOD_EAN
    || getFastCreatorDisplayEan(entry)
    || ""
  );
  entry["KOD EAN"] = restoredEan;
  entry["KOD KRESKOWY"] = restoredEan;
  entry.KOD_KRESKOWY = restoredEan;
  entry.ean = restoredEan;
  entry.EAN = restoredEan;
  entry.barcode = restoredEan;
  if (entry.raw && typeof entry.raw === "object" && restoredEan) {
    entry.raw["KOD EAN"] = restoredEan;
    entry.raw["KOD KRESKOWY"] = restoredEan;
    entry.raw.KOD_KRESKOWY = restoredEan;
    entry.raw["text-right 2"] = restoredEan;
    entry.raw.ean = restoredEan;
    entry.raw.EAN = restoredEan;
    entry.raw.barcode = restoredEan;
  }
}

function applyFastCreatorVisibilityOptionsToCatalog() {
  const visibility = getFastCreatorPreviewVisibilitySettings();
  const seen = new WeakSet();
  const visit = (entry) => {
    if (!entry || typeof entry !== "object" || seen.has(entry)) return;
    seen.add(entry);
    applyFastCreatorVisibilityOptionsToEntry(entry, visibility);
  };

  (Array.isArray(fastCreatorState.importedProductsSnapshot) ? fastCreatorState.importedProductsSnapshot : []).forEach(visit);
  (Array.isArray(window.allProducts) ? window.allProducts : []).forEach(visit);
  (Array.isArray(window.pages) ? window.pages : []).forEach((page) => {
    (Array.isArray(page?.products) ? page.products : []).forEach(visit);
  });
}

async function renderFastCreatorStylePreview(screen = fastCreatorState.currentScreen) {
  if (fastCreatorState.selectedExcelFile && fastCreatorState.lastExcelSummary) {
    try {
      await patchFastCreatorImportedDataFromExcelFile(fastCreatorState.selectedExcelFile);
    } catch (_error) {}
  }

  const previewContext = getFastCreatorPreviewContext();
  const previewEntry = previewContext.product;
  const selected = fastCreatorState.styleOptions.find((option) => option.id === fastCreatorState.selectedStyleId) || null;
  const styleLabel = selected?.label || "Wybrany styl";
  const targetScreen = screen === "options" ? "options" : "style";
  const previewVisibility = targetScreen === "options"
    ? getFastCreatorPreviewVisibilitySettings()
    : null;

  updateFastCreatorStyleSummary();
  syncFastCreatorPreviewVisibilityControls();
  if (!previewEntry) {
    setFastCreatorStatus(targetScreen, "Najpierw zaimportuj dane, aby zobaczyc podglad stylu.", "error");
    return false;
  }

  activateFastCreatorStylePreviewIds(targetScreen);
  const renderToken = ++fastCreatorState.stylePreviewRenderToken;
  setFastCreatorStatus(targetScreen, `Laduje podglad stylu: ${styleLabel}...`, "loading");

  try {
    const styleMeta = getFastCreatorStyleMeta(fastCreatorState.selectedStyleId);
    const rendered = await renderFastCreatorConfiguredStylePreview(styleMeta, previewContext, previewVisibility);
    if (renderToken !== fastCreatorState.stylePreviewRenderToken) return false;
    if (!rendered) {
      throw new Error("Nie udalo sie wygenerowac podgladu stylu.");
    }
    setFastCreatorStatus(targetScreen, `Podglad 1:1 jest gotowy dla stylu: ${styleLabel}.`, "success");
    return true;
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    setFastCreatorStatus(targetScreen, message, "error");
    return false;
  }
}

async function refreshFastCreatorStyleStep() {
  renderFastCreatorStyleOptions();
  await renderFastCreatorStylePreview("style");
}

async function refreshFastCreatorOptionsStep() {
  renderFastCreatorStyleOptions();
  await renderFastCreatorStylePreview("options");
}

function setFastCreatorScreen(screen) {
  const nextScreen = screen === "excel" || screen === "images" || screen === "style" || screen === "options" || screen === "finalize"
    ? screen
    : "name";
  fastCreatorState.activePreviewScopeKey = nextScreen === "options" ? "options" : "style";
  deactivateFastCreatorStylePreviewIds();
  fastCreatorState.currentScreen = nextScreen;
  fastCreatorState.elements.screens.forEach((dialog) => {
    dialog.classList.toggle("is-active", dialog.getAttribute("data-fast-screen") === nextScreen);
  });
}

function syncButtonsState() {
  const hasName = !!getNameValue();
  const hasImages = Array.isArray(fastCreatorState.selectedImageFiles) && fastCreatorState.selectedImageFiles.length > 0;
  const hasExcelSummary = Number(fastCreatorState.lastExcelSummary?.productCount || 0) > 0;
  const hasStyle = !!String(fastCreatorState.selectedStyleId || "").trim();
  const hasMultipleStyles = Array.isArray(fastCreatorState.styleOptions) && fastCreatorState.styleOptions.length > 1;
  const isBusy = fastCreatorState.isSubmitting;

  if (fastCreatorState.elements.nextBtn) fastCreatorState.elements.nextBtn.disabled = !hasName || isBusy;
  if (fastCreatorState.elements.blankWorkspaceBtn) fastCreatorState.elements.blankWorkspaceBtn.disabled = isBusy;
  if (fastCreatorState.elements.excelNextBtn) fastCreatorState.elements.excelNextBtn.disabled = !hasExcelSummary || isBusy;
  if (fastCreatorState.elements.pickExcelBtn) fastCreatorState.elements.pickExcelBtn.disabled = isBusy;
  if (fastCreatorState.elements.backBtn) fastCreatorState.elements.backBtn.disabled = isBusy;
  if (fastCreatorState.elements.imagesBackBtn) fastCreatorState.elements.imagesBackBtn.disabled = isBusy;
  if (fastCreatorState.elements.pickImagesBtn) fastCreatorState.elements.pickImagesBtn.disabled = isBusy || !hasExcelSummary;
  if (fastCreatorState.elements.importImagesBtn) fastCreatorState.elements.importImagesBtn.disabled = isBusy || !hasExcelSummary || !hasImages;
  if (fastCreatorState.elements.imagesNextBtn) fastCreatorState.elements.imagesNextBtn.disabled = isBusy || !hasExcelSummary;
  if (fastCreatorState.elements.styleBackBtn) fastCreatorState.elements.styleBackBtn.disabled = isBusy;
  if (fastCreatorState.elements.styleOptionsNextBtn) fastCreatorState.elements.styleOptionsNextBtn.disabled = isBusy || !hasStyle;
  if (fastCreatorState.elements.optionsBackBtn) fastCreatorState.elements.optionsBackBtn.disabled = isBusy;
  if (fastCreatorState.elements.applyStyleBtn) fastCreatorState.elements.applyStyleBtn.disabled = isBusy || !hasStyle;
  if (fastCreatorState.elements.finalizeBackBtn) fastCreatorState.elements.finalizeBackBtn.disabled = isBusy;
  if (fastCreatorState.elements.finalizeApplyBtn) fastCreatorState.elements.finalizeApplyBtn.disabled = isBusy || !hasStyle;
  if (fastCreatorState.elements.finalizeInlineBackBtn) fastCreatorState.elements.finalizeInlineBackBtn.disabled = isBusy;
  if (fastCreatorState.elements.finalizeInlineApplyBtn) fastCreatorState.elements.finalizeInlineApplyBtn.disabled = isBusy || !hasStyle;
  if (fastCreatorState.elements.stylePrevBtn) fastCreatorState.elements.stylePrevBtn.disabled = isBusy || !hasMultipleStyles;
  if (fastCreatorState.elements.styleNextBtn) fastCreatorState.elements.styleNextBtn.disabled = isBusy || !hasMultipleStyles;
  if (fastCreatorState.elements.cancelBtn) fastCreatorState.elements.cancelBtn.disabled = isBusy;
  if (fastCreatorState.elements.closeBtn) fastCreatorState.elements.closeBtn.disabled = isBusy;
  if (fastCreatorState.elements.closeSecondaryBtn) fastCreatorState.elements.closeSecondaryBtn.disabled = isBusy;
  if (fastCreatorState.elements.closeImagesBtn) fastCreatorState.elements.closeImagesBtn.disabled = isBusy;
  if (fastCreatorState.elements.closeStyleBtn) fastCreatorState.elements.closeStyleBtn.disabled = isBusy;
  if (fastCreatorState.elements.closeOptionsBtn) fastCreatorState.elements.closeOptionsBtn.disabled = isBusy;
  if (fastCreatorState.elements.closeFinalizeBtn) fastCreatorState.elements.closeFinalizeBtn.disabled = isBusy;
}

function validateCatalogName() {
  const isValid = getNameValue().length > 0;
  setNameErrorVisible(!isValid);
  syncButtonsState();
  return isValid;
}

function resetFastCreatorState() {
  fastCreatorState.currentScreen = "name";
  fastCreatorState.selectedLayout = getInitialLayout();
  fastCreatorState.selectedStyleId = getFastCreatorInitialStyleId();
  fastCreatorState.selectedExcelFile = null;
  fastCreatorState.selectedImageFiles = [];
  fastCreatorState.matchedImageFiles = [];
  fastCreatorState.isSubmitting = false;
  fastCreatorState.lastExcelSummary = null;
  fastCreatorState.lastImageSummary = null;
  fastCreatorState.importedProductsSnapshot = [];
  fastCreatorState.styleOptions = [];
  fastCreatorState.stylePreviewRenderToken = 0;
  fastCreatorState.previewVisibility = {
    showPrice: true,
    showBarcode: false
  };
  fastCreatorState.finalizeActiveReportKey = "";
  fastCreatorState.activePreviewScopeKey = "style";

  if (fastCreatorState.elements.nameInput) fastCreatorState.elements.nameInput.value = "";
  if (fastCreatorState.elements.excelInput) fastCreatorState.elements.excelInput.value = "";
  if (fastCreatorState.elements.imagesInput) fastCreatorState.elements.imagesInput.value = "";

  setNameErrorVisible(false);
  updateNamePreviews();
  updateExcelFileCard(null);
  updateImagesFileCard([]);
  renderExcelSummary(null);
  renderImageSummary(null, []);
  setFastCreatorStatus("excel", "Wybierz plik, aby rozpocząć import danych.", "idle");
  setFastCreatorStatus("images", "Wybierz zdjęcia produktów, aby rozpocząć import.", "idle");
  setFastCreatorStatus("style", "Wybierz styl, aby zobaczyc podglad modulu.", "idle");
  setFastCreatorStatus("options", "Ustaw opcje po lewej stronie, aby zobaczyć finalny podgląd modułu.", "idle");
  if (fastCreatorState.elements.styleOptions) {
    fastCreatorState.elements.styleOptions.innerHTML = "";
  }
  updateFastCreatorStyleSelector();
  updateFastCreatorStyleSummary();
  updateFastCreatorFinalizeUi();
  setFastCreatorStatus("finalize", getFastCreatorFinalizeIdleStatusText(), "idle");
  syncFastCreatorPreviewVisibilityControls();
  closeFastCreatorImportWarning();
  deactivateFastCreatorStylePreviewIds();
  setFastCreatorScreen("name");
  syncButtonsState();
}

function closeFastCreator(options = {}) {
  const shouldReset = options.reset !== false;
  if (!fastCreatorState.modal) return;

  fastCreatorState.modal.classList.remove("is-open");
  fastCreatorState.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("fastcreator-open");
  closeFastCreatorImportWarning();

  if (shouldReset) {
    resetFastCreatorState();
  }
}

function hideFastCreatorOverlayOnly() {
  if (!fastCreatorState.modal) return;
  fastCreatorState.modal.classList.remove("is-open");
  fastCreatorState.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("fastcreator-open");
  closeFastCreatorImportWarning();
}

function showFastCreatorOverlayOnly() {
  if (!fastCreatorState.modal) return;
  fastCreatorState.modal.classList.add("is-open");
  fastCreatorState.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("fastcreator-open");
}

async function fetchFastCreatorMarkup() {
  try {
    const response = await fetch(FASTCREATOR_TEMPLATE_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (_error) {
    return FASTCREATOR_TEMPLATE_FALLBACK;
  }
}

function bindFastCreatorEvents() {
  const {
    modal,
    closeBtn,
    closeSecondaryBtn,
    closeImagesBtn,
    closeStyleBtn,
    closeOptionsBtn,
    closeFinalizeBtn,
    importWarning,
    importWarningCloseBtn,
    importWarningDismissBtn,
    cancelBtn,
    blankWorkspaceBtn,
    nextBtn,
    backBtn,
    excelNextBtn,
    imagesBackBtn,
    imagesNextBtn,
    styleBackBtn,
    styleOptionsNextBtn,
    optionsBackBtn,
    applyStyleBtn,
    finalizeBackBtn,
    finalizeApplyBtn,
    finalizeInlineBackBtn,
    finalizeInlineApplyBtn,
    stylePrevBtn,
    styleNextBtn,
    nameInput,
    excelInput,
    imagesInput,
    pickExcelBtn,
    pickImagesBtn,
    importImagesBtn
  } = fastCreatorState.elements;

  modal?.querySelectorAll('[data-fastcreator-close="true"]')?.forEach((backdrop) => {
    backdrop.addEventListener("click", () => {
      if (!fastCreatorState.isSubmitting) closeFastCreator();
    });
  });

  modal?.addEventListener("click", (event) => {
    const trigger = event.target && event.target.closest
      ? event.target.closest("[data-fastcreator-finalize-page]")
      : null;
    if (!(trigger instanceof HTMLElement) || !modal.contains(trigger)) return;
    if (fastCreatorState.isSubmitting) return;
    const nextKey = String(trigger.getAttribute("data-fastcreator-finalize-page") || "").trim();
    if (!nextKey) return;
    fastCreatorState.finalizeActiveReportKey = nextKey;
    renderFastCreatorFinalizeReport();
  });

  [closeBtn, closeSecondaryBtn, closeImagesBtn, closeStyleBtn, closeOptionsBtn, closeFinalizeBtn, cancelBtn].forEach((button) => {
    button?.addEventListener("click", () => {
      if (!fastCreatorState.isSubmitting) closeFastCreator();
    });
  });

  blankWorkspaceBtn?.addEventListener("click", async () => {
    if (fastCreatorState.isSubmitting) return;
    await openBlankFastCreatorWorkspace();
  });

  nextBtn?.addEventListener("click", () => {
    if (!validateCatalogName()) {
      nameInput?.focus();
      return;
    }
    updateNamePreviews();
    setFastCreatorScreen("excel");
  });

  backBtn?.addEventListener("click", () => {
    if (fastCreatorState.isSubmitting) return;
    setFastCreatorScreen("name");
    nameInput?.focus();
  });

  excelNextBtn?.addEventListener("click", () => {
    if (fastCreatorState.isSubmitting) return;
    if (!fastCreatorState.lastExcelSummary) return;
    setFastCreatorScreen("images");
  });

  imagesBackBtn?.addEventListener("click", () => {
    if (fastCreatorState.isSubmitting) return;
    setFastCreatorScreen("excel");
  });

  imagesNextBtn?.addEventListener("click", async () => {
    if (fastCreatorState.isSubmitting) return;
    setFastCreatorScreen("style");
    await refreshFastCreatorStyleStep();
    syncButtonsState();
  });

  styleBackBtn?.addEventListener("click", () => {
    if (fastCreatorState.isSubmitting) return;
    setFastCreatorScreen("images");
  });

  styleOptionsNextBtn?.addEventListener("click", async () => {
    if (fastCreatorState.isSubmitting) return;
    setFastCreatorScreen("options");
    await refreshFastCreatorOptionsStep();
    syncButtonsState();
  });

  optionsBackBtn?.addEventListener("click", async () => {
    if (fastCreatorState.isSubmitting) return;
    setFastCreatorScreen("style");
    await renderFastCreatorStylePreview("style");
    syncButtonsState();
  });

  applyStyleBtn?.addEventListener("click", () => {
    if (fastCreatorState.isSubmitting) return;
    setFastCreatorScreen("finalize");
    updateFastCreatorFinalizeUi();
    setFastCreatorStatus("finalize", getFastCreatorFinalizeIdleStatusText(), "idle");
    syncButtonsState();
  });

  finalizeBackBtn?.addEventListener("click", () => {
    if (fastCreatorState.isSubmitting) return;
    setFastCreatorScreen("options");
    syncButtonsState();
  });

  finalizeInlineBackBtn?.addEventListener("click", () => {
    if (fastCreatorState.isSubmitting) return;
    setFastCreatorScreen("options");
    syncButtonsState();
  });

  stylePrevBtn?.addEventListener("click", async () => {
    if (fastCreatorState.isSubmitting) return;
    const options = Array.isArray(fastCreatorState.styleOptions) ? fastCreatorState.styleOptions : [];
    if (!options.length) return;
    const currentIndex = Math.max(0, options.findIndex((option) => option.id === fastCreatorState.selectedStyleId));
    const nextIndex = (currentIndex - 1 + options.length) % options.length;
    fastCreatorState.selectedStyleId = options[nextIndex].id;
    updateFastCreatorStyleSelector();
    updateFastCreatorStyleSummary();
    syncButtonsState();
    await renderFastCreatorStylePreview();
  });

  styleNextBtn?.addEventListener("click", async () => {
    if (fastCreatorState.isSubmitting) return;
    const options = Array.isArray(fastCreatorState.styleOptions) ? fastCreatorState.styleOptions : [];
    if (!options.length) return;
    const currentIndex = Math.max(0, options.findIndex((option) => option.id === fastCreatorState.selectedStyleId));
    const nextIndex = (currentIndex + 1) % options.length;
    fastCreatorState.selectedStyleId = options[nextIndex].id;
    updateFastCreatorStyleSelector();
    updateFastCreatorStyleSummary();
    syncButtonsState();
    await renderFastCreatorStylePreview();
  });

  const submitFastCreatorFinalize = async () => {
    if (fastCreatorState.isSubmitting) return;

    const useAssignedLayout = hasFastCreatorAssignedPages();
    fastCreatorState.isSubmitting = true;
    syncButtonsState();
    setFastCreatorStatus("finalize", "Tworzę katalog. To może potrwać kilka sekund...", "loading");

    try {
      if (typeof window.showBusyOverlay === "function") {
        window.showBusyOverlay(
          useAssignedLayout
            ? "Tworzę katalog i układ stron z Excela..."
            : "Tworzę katalog i otwieram Drag and Drop..."
        );
      }
      const finalizeResult = await openFastCreatorDraftCatalog();
      const autoLayoutApplied = Number(finalizeResult?.autoLayoutResult?.applied || 0);
      const autoLayoutAttempted = Number(finalizeResult?.autoLayoutResult?.attempted || 0);
      const successMessage = useAssignedLayout
        ? (autoLayoutAttempted > 0
          ? `Utworzono gotowy układ stron według importu Excela. Magic Layout uporządkował ${autoLayoutApplied}/${autoLayoutAttempted} stron.`
          : "Utworzono gotowy układ stron według importu Excela.")
        : "Otworzono okno Drag and Drop z produktami.";
      setFastCreatorStatus("finalize", successMessage, "success");
      if (typeof window.showAppToast === "function") {
        window.showAppToast(successMessage, "success");
      }
      closeFastCreator();
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      setFastCreatorStatus("finalize", message, "error");
      if (typeof window.showAppToast === "function") {
        window.showAppToast(message, "error");
      }
    } finally {
      fastCreatorState.isSubmitting = false;
      syncButtonsState();
      if (typeof window.hideBusyOverlay === "function") {
        window.setTimeout(() => window.hideBusyOverlay(), 180);
      }
    }
  };

  const runFastCreatorFinalizeFromClick = (event) => {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    if (event && typeof event.stopPropagation === "function") event.stopPropagation();
    void submitFastCreatorFinalize();
    return false;
  };

  window.fastCreatorSubmitFinalize = submitFastCreatorFinalize;

  if (finalizeApplyBtn) {
    finalizeApplyBtn.onclick = runFastCreatorFinalizeFromClick;
  }
  if (finalizeInlineApplyBtn) {
    finalizeInlineApplyBtn.onclick = runFastCreatorFinalizeFromClick;
  }

  nameInput?.addEventListener("input", () => {
    if (fastCreatorState.lastExcelSummary) {
      fastCreatorState.lastExcelSummary = null;
      fastCreatorState.importedProductsSnapshot = [];
      renderExcelSummary(null);
      clearImageStepState({ clearFiles: true });
      if (fastCreatorState.selectedExcelFile) {
        setFastCreatorStatus("excel", "Nazwa zmieniona. Wybierz plik Excel ponownie, aby odświeżyć import.", "idle");
      }
    }
    setNameErrorVisible(false);
    updateNamePreviews();
    syncButtonsState();
  });

  nameInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!validateCatalogName()) return;
    updateNamePreviews();
    setFastCreatorScreen("excel");
  });

  pickExcelBtn?.addEventListener("click", () => {
    if (fastCreatorState.isSubmitting) return;
    excelInput.value = "";
    excelInput.click();
  });

  excelInput?.addEventListener("change", () => {
    closeFastCreatorImportWarning();
    const file = excelInput.files && excelInput.files[0] ? excelInput.files[0] : null;
    fastCreatorState.selectedExcelFile = file;
    fastCreatorState.lastExcelSummary = null;
    fastCreatorState.importedProductsSnapshot = [];
    renderExcelSummary(null);
    clearImageStepState({ clearFiles: true });
    updateExcelFileCard(file);
    if (file) {
      setFastCreatorStatus("excel", `Importuję ${file.name}...`, "loading");
    } else {
      setFastCreatorStatus("excel", "Wybierz plik, aby rozpocząć import danych.", "idle");
      syncButtonsState();
      return;
    }

    const catalogName = getNameValue();
    if (!catalogName) {
      setFastCreatorScreen("name");
      setNameErrorVisible(true);
      nameInput?.focus();
      syncButtonsState();
      return;
    }

    void (async () => {
      fastCreatorState.isSubmitting = true;
      syncButtonsState();

      try {
        if (typeof window.showBusyOverlay === "function") {
          window.showBusyOverlay("Import danych Excel...");
        }

        const summary = await runExistingExcelImport(file, fastCreatorState.selectedLayout);
        fastCreatorState.lastExcelSummary = summary;
        fastCreatorState.importedProductsSnapshot = Array.isArray(summary?.productsSnapshot)
          ? summary.productsSnapshot
          : [];
        fastCreatorState.selectedStyleId = getFastCreatorInitialStyleId();
        renderExcelSummary(summary);
        updateNamePreviews();
        const excelStatus = getFastCreatorExcelImportStatusMessage(summary);
        setFastCreatorStatus("excel", excelStatus.message, excelStatus.state);
        const warningMessage = getFastCreatorMissingAssignmentsWarningMessage(summary);
        if (warningMessage) {
          openFastCreatorImportWarning(warningMessage);
        }
        if (typeof window.showAppToast === "function") {
          window.showAppToast(`Zaimportowano ${Number(summary?.productCount || 0)} produktów.`, "success");
        }
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        setFastCreatorStatus("excel", message, "error");
        if (typeof window.showAppToast === "function") {
          window.showAppToast(message, "error");
        }
      } finally {
        fastCreatorState.isSubmitting = false;
        syncButtonsState();
        if (typeof window.hideBusyOverlay === "function") {
          window.setTimeout(() => window.hideBusyOverlay(), 220);
        }
      }
    })();
  });

  pickImagesBtn?.addEventListener("click", () => {
    if (fastCreatorState.isSubmitting) return;
    imagesInput.value = "";
    imagesInput.click();
  });

  imagesInput?.addEventListener("change", () => {
    const files = Array.from(imagesInput.files || []);
    fastCreatorState.selectedImageFiles = files;
    fastCreatorState.matchedImageFiles = [];
    fastCreatorState.lastImageSummary = null;
    updateImagesFileCard(files);
    renderImageSummary(null, files);
    if (files.length) {
      setFastCreatorStatus("images", `Wybrano ${files.length} plików. Możesz rozpocząć import zdjęć.`, "idle");
    } else {
      setFastCreatorStatus("images", "Wybierz zdjęcia produktów, aby rozpocząć import.", "idle");
    }
    updateFastCreatorStyleSummary();
    syncButtonsState();
  });

  importImagesBtn?.addEventListener("click", async () => {
    if (fastCreatorState.isSubmitting) return;
    if (!fastCreatorState.lastExcelSummary) {
      setFastCreatorStatus("images", "Najpierw zakończ import Excela.", "error");
      return;
    }
    if (!Array.isArray(fastCreatorState.selectedImageFiles) || fastCreatorState.selectedImageFiles.length === 0) {
      setFastCreatorStatus("images", "Najpierw wybierz zdjęcia produktów.", "error");
      return;
    }

    fastCreatorState.isSubmitting = true;
    syncButtonsState();
    setFastCreatorStatus("images", `Importuję ${fastCreatorState.selectedImageFiles.length} zdjęć...`, "loading");

    try {
      const summary = await runExistingImagesImport(fastCreatorState.selectedImageFiles);
      fastCreatorState.lastImageSummary = summary;
      fastCreatorState.matchedImageFiles = Array.isArray(summary?.matchedFiles)
        ? summary.matchedFiles.slice()
        : [];
      updateFastCreatorStyleSummary();
      renderImageSummary(summary, fastCreatorState.selectedImageFiles);
      setFastCreatorStatus(
        "images",
        `${Number(summary?.matchedFileCount || summary?.matchedCount || 0)} z ${Number(summary?.selectedCount || 0)} wybranych zdjęć zostało dopasowanych. Do katalogu trafią tylko dopasowane pliki (${Number(summary?.importedCount || 0)} produktów).`,
        Number(summary?.importedCount || 0) > 0 ? "success" : "error"
      );
      if (fastCreatorState.currentScreen === "style" || fastCreatorState.currentScreen === "options") {
        await renderFastCreatorStylePreview(fastCreatorState.currentScreen);
      }
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      setFastCreatorStatus("images", message, "error");
      if (typeof window.showAppToast === "function") {
        window.showAppToast(message, "error");
      }
    } finally {
      fastCreatorState.isSubmitting = false;
      syncButtonsState();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!fastCreatorState.modal?.classList.contains("is-open")) return;
    if (fastCreatorState.isSubmitting) return;
    if (fastCreatorState.elements.importWarning instanceof HTMLElement && !fastCreatorState.elements.importWarning.hidden) {
      closeFastCreatorImportWarning();
      return;
    }
    closeFastCreator();
  });

  fastCreatorState.elements.showPriceToggle?.addEventListener("change", async () => {
    fastCreatorState.previewVisibility.showPrice = !!fastCreatorState.elements.showPriceToggle?.checked;
    await renderFastCreatorStylePreview("options");
  });

  fastCreatorState.elements.showBarcodeToggle?.addEventListener("change", async () => {
    fastCreatorState.previewVisibility.showBarcode = !!fastCreatorState.elements.showBarcodeToggle?.checked;
    await renderFastCreatorStylePreview("options");
  });
}

async function ensureFastCreatorMounted() {
  if (fastCreatorState.modal && fastCreatorState.modal.isConnected) {
    return fastCreatorState.modal;
  }

  const markup = await fetchFastCreatorMarkup();
  const container = document.createElement("div");
  container.innerHTML = markup.trim();

  const modal = container.querySelector("#fastCreatorModal");
  if (!modal) {
    throw new Error("Nie udało się zbudować modalu szybkiego kreatora.");
  }

  document.body.appendChild(modal);
  ensureFastCreatorImportWarningElements(modal);

  fastCreatorState.modal = modal;
  fastCreatorState.elements = {
    modal,
    screens: Array.from(modal.querySelectorAll("[data-fast-screen]")),
    closeBtn: document.getElementById("fastCreatorClose"),
    closeSecondaryBtn: document.getElementById("fastCreatorCloseSecondaryBtn"),
    closeImagesBtn: document.getElementById("fastCreatorCloseImagesBtn"),
    closeStyleBtn: document.getElementById("fastCreatorCloseStyleBtn"),
    closeOptionsBtn: document.getElementById("fastCreatorCloseOptionsBtn"),
    closeFinalizeBtn: document.getElementById("fastCreatorCloseFinalizeBtn"),
    importWarning: modal.querySelector("#fastCreatorImportWarning"),
    importWarningCloseBtn: modal.querySelector("#fastCreatorImportWarningCloseBtn"),
    importWarningDismissBtn: modal.querySelector("#fastCreatorImportWarningDismissBtn"),
    cancelBtn: document.getElementById("fastCreatorCancelBtn"),
    blankWorkspaceBtn: document.getElementById("fastCreatorBlankWorkspaceBtn"),
    nextBtn: document.getElementById("fastCreatorNextBtn"),
    backBtn: document.getElementById("fastCreatorBackBtn"),
    excelNextBtn: document.getElementById("fastCreatorExcelNextBtn"),
    imagesBackBtn: document.getElementById("fastCreatorImagesBackBtn"),
    imagesNextBtn: document.getElementById("fastCreatorImagesNextBtn"),
    styleBackBtn: document.getElementById("fastCreatorStyleBackBtn"),
    styleOptionsNextBtn: document.getElementById("fastCreatorStyleOptionsNextBtn"),
    optionsBackBtn: document.getElementById("fastCreatorOptionsBackBtn"),
    applyStyleBtn: document.getElementById("fastCreatorApplyStyleBtn"),
    finalizeBackBtn: document.getElementById("fastCreatorFinalizeBackBtn"),
    finalizeApplyBtn: document.getElementById("fastCreatorFinalizeApplyBtn"),
    finalizeInlineBackBtn: document.getElementById("fastCreatorFinalizeInlineBackBtn"),
    finalizeInlineApplyBtn: document.getElementById("fastCreatorFinalizeInlineApplyBtn"),
    stylePrevBtn: document.getElementById("fastCreatorStylePrevBtn"),
    styleNextBtn: document.getElementById("fastCreatorStyleNextBtn"),
    nameInput: document.getElementById("fastCreatorNameInput"),
    nameError: document.getElementById("fastCreatorNameError"),
    namePreview: document.getElementById("fastCreatorProjectNamePreview"),
    imagesNamePreview: document.getElementById("fastCreatorImagesProjectNamePreview"),
    styleNamePreview: document.getElementById("fastCreatorStyleProjectNamePreview"),
    optionsNamePreview: document.getElementById("fastCreatorOptionsProjectNamePreview"),
    finalizeNamePreview: document.getElementById("fastCreatorFinalizeProjectNamePreview"),
    imagesProjectMeta: document.getElementById("fastCreatorImagesProjectMeta"),
    styleProjectMeta: document.getElementById("fastCreatorStyleProjectMeta"),
    optionsProjectMeta: document.getElementById("fastCreatorOptionsProjectMeta"),
    finalizeProjectMeta: document.getElementById("fastCreatorFinalizeProjectMeta"),
    finalizeReport: document.getElementById("fastCreatorFinalizeReport"),
    finalizeOverview: document.getElementById("fastCreatorFinalizeOverview"),
    finalizePageList: document.getElementById("fastCreatorFinalizePageList"),
    finalizePageDetail: document.getElementById("fastCreatorFinalizePageDetail"),
    excelInput: document.getElementById("fastCreatorExcelInput"),
    pickExcelBtn: document.getElementById("fastCreatorPickExcelBtn"),
    excelFileCard: document.getElementById("fastCreatorExcelCard"),
    excelFileName: document.getElementById("fastCreatorExcelFileName"),
    excelFileMeta: document.getElementById("fastCreatorExcelFileMeta"),
    excelStatus: document.getElementById("fastCreatorExcelStatus"),
    excelStats: document.getElementById("fastCreatorExcelStats"),
    importedProductsCount: document.getElementById("fastCreatorImportedProductsCount"),
    importedPagesCount: document.getElementById("fastCreatorImportedPagesCount"),
    imagesInput: document.getElementById("fastCreatorImagesInput"),
    pickImagesBtn: document.getElementById("fastCreatorPickImagesBtn"),
    importImagesBtn: document.getElementById("fastCreatorImportImagesBtn"),
    imagesFileCard: document.getElementById("fastCreatorImagesCard"),
    imagesFileName: document.getElementById("fastCreatorImagesFileName"),
    imagesFileMeta: document.getElementById("fastCreatorImagesFileMeta"),
    imagesStatus: document.getElementById("fastCreatorImagesStatus"),
    imagesStats: document.getElementById("fastCreatorImagesStats"),
    selectedImagesCount: document.getElementById("fastCreatorSelectedImagesCount"),
    importedImagesCount: document.getElementById("fastCreatorImportedImagesCount"),
    styleOptions: document.getElementById("fastCreatorStyleOptions"),
    styleStatus: document.getElementById("fastCreatorStyleStatus"),
    optionsStatus: document.getElementById("fastCreatorOptionsStatus"),
    finalizeStatus: document.getElementById("fastCreatorFinalizeStatus"),
    stylePreviewScope: document.getElementById("fastCreatorStylePreviewScope"),
    optionsPreviewScope: document.getElementById("fastCreatorOptionsPreviewScope"),
    styleCurrentName: document.getElementById("fastCreatorStyleCurrentName"),
    styleCurrentIndex: document.getElementById("fastCreatorStyleCurrentIndex"),
    optionsCurrentName: document.getElementById("fastCreatorOptionsCurrentName"),
    optionsCurrentIndex: document.getElementById("fastCreatorOptionsCurrentIndex"),
    optionsStyleName: document.getElementById("fastCreatorOptionsStyleName"),
    finalizeTitle: document.getElementById("fastCreatorFinalizeTitle"),
    finalizeCopy: document.getElementById("fastCreatorFinalizeCopy"),
    importWarningMessage: modal.querySelector("#fastCreatorImportWarningMessage"),
    showPriceToggle: document.getElementById("fastCreatorShowPriceToggle"),
    showBarcodeToggle: document.getElementById("fastCreatorShowBarcodeToggle")
  };

  updateFastCreatorFinalizeUi();

  ensureFastCreatorImportWarningElements(modal);
  bindFastCreatorEvents();
  resetFastCreatorState();
  return modal;
}

async function prepareCatalogWorkspace(catalogName, options = {}) {
  const applyProjectTitle = options.applyProjectTitle !== false;
  const fallbackProjectTitle = String(options.fallbackProjectTitle || "Katalog produktów").trim() || "Katalog produktów";
  if (typeof window.resetUnsavedProjectSession === "function") {
    window.resetUnsavedProjectSession(true);
  }
  if (typeof window.clearAll === "function") {
    window.clearAll();
  }
  if (typeof window.setProjectTitle === "function") {
    window.setProjectTitle(applyProjectTitle ? catalogName : fallbackProjectTitle);
  }

  const saveProjectNameInput = document.getElementById("projectNameInput");
  if (saveProjectNameInput) {
    saveProjectNameInput.value = applyProjectTitle ? catalogName : "";
  }

  window.currentProjectMeta = null;
  window.projectDirty = true;
  if (window.editorState && typeof window.editorState === "object") {
    window.editorState.layout = fastCreatorState.selectedLayout;
  }

  if (typeof window.setCatalogPageSettings === "function") {
    try {
      await window.setCatalogPageSettings(
        {
          format: "A4",
          orientation: "portrait"
        },
        {
          rebuildExistingPages: false,
          resizeInPlaceWhenNoRebuild: false,
          silent: true
        }
      );
    } catch (_error) {}
  }

  if (typeof window.showEditorView === "function") {
    window.showEditorView();
  }
}

async function ensureFastCreatorBlankCatalogPage() {
  const catalogPages = Array.isArray(window.pages)
    ? window.pages.filter((page) => page && !page.isCover)
    : [];

  if (catalogPages.length > 0) {
    if (typeof window.showEditorView === "function") {
      window.showEditorView();
    }
    if (typeof window.showPageEditForCurrentPage === "function") {
      window.setTimeout(() => {
        try { window.showPageEditForCurrentPage(); } catch (_error) {}
      }, 0);
    }
    return catalogPages[0];
  }

  if (typeof window.createNewPage !== "function") {
    throw new Error("Nie udało się otworzyć pustej strony A4.");
  }

  const createdPage = window.createNewPage({ reveal: true });
  if (!createdPage) {
    throw new Error("Nie udało się otworzyć pustej strony A4.");
  }

  window.projectOpen = true;
  window.projectDirty = true;

  if (typeof window.refreshPdfButtonState === "function") {
    try { window.refreshPdfButtonState(); } catch (_error) {}
  }
  if (typeof window.createZoomSlider === "function") {
    try { window.createZoomSlider(); } catch (_error) {}
  }
  if (typeof window.showPageEditForCurrentPage === "function") {
    window.setTimeout(() => {
      try { window.showPageEditForCurrentPage(); } catch (_error) {}
    }, 0);
  }

  return createdPage;
}

async function openBlankFastCreatorWorkspace() {
  fastCreatorState.isSubmitting = true;
  syncButtonsState();

  try {
    if (typeof window.showBusyOverlay === "function") {
      window.showBusyOverlay("Otwieram pusty obszar roboczy...");
    }

    await prepareCatalogWorkspace("", {
      applyProjectTitle: false,
      fallbackProjectTitle: "Katalog produktów"
    });

    let createdPage = null;
    if (typeof window.createNewPage === "function") {
      createdPage = window.createNewPage({ reveal: true });
    }
    if (!createdPage) {
      throw new Error("Nie udało się otworzyć pustej strony A4.");
    }

    window.projectOpen = true;
    window.projectDirty = true;
    if (typeof window.createZoomSlider === "function") {
      window.createZoomSlider();
    }
    if (typeof window.showAppToast === "function") {
      window.showAppToast("Otworzono pusty obszar roboczy A4.", "success");
    }
    closeFastCreator();
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    if (typeof window.showAppToast === "function") {
      window.showAppToast(message, "error");
    }
  } finally {
    fastCreatorState.isSubmitting = false;
    syncButtonsState();
    if (typeof window.hideBusyOverlay === "function") {
      window.setTimeout(() => window.hideBusyOverlay(), 180);
    }
  }
}

function syncFileIntoMainImporter(file) {
  const excelInput = document.getElementById("excelFile");
  const fileLabel = document.getElementById("fileLabel");
  if (!excelInput) {
    throw new Error("Nie znalazłem głównego pola importu Excel.");
  }
  if (typeof DataTransfer !== "function") {
    throw new Error("Ta przeglądarka nie obsługuje szybkiego przekazania pliku do importera.");
  }

  const transfer = new DataTransfer();
  transfer.items.add(file);
  excelInput.files = transfer.files;
  excelInput.dispatchEvent(new Event("change", { bubbles: true }));
  if (fileLabel) fileLabel.textContent = file.name;
}

async function runExistingExcelImport(file, layout) {
  const summary = await analyzeFastCreatorExcelImport(file);
  summary.layoutMode = String(window.LAYOUT_MODE || layout || fastCreatorState.selectedLayout || "layout6");
  return summary;
}

function waitFastCreatorMs(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

async function waitForFastCreatorCondition(check, options = {}) {
  const timeoutMs = Math.max(200, Number(options.timeoutMs || 30000));
  const intervalMs = Math.max(40, Number(options.intervalMs || 120));
  const timeoutMessage = String(options.timeoutMessage || "Operacja nie zakończyła się na czas.");
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    const result = await check();
    if (result) return result;
    await waitFastCreatorMs(intervalMs);
  }

  throw new Error(timeoutMessage);
}

async function ensureFastCreatorDraftTrayReady() {
  if (window.CustomStyleDraftTrayUI && typeof window.CustomStyleDraftTrayUI.open === "function") {
    return window.CustomStyleDraftTrayUI;
  }

  const existingScript = document.querySelector('script[data-fastcreator-draft-tray="true"]');
  if (!existingScript) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = FASTCREATOR_DRAFT_TRAY_SCRIPT_URL;
      script.async = true;
      script.dataset.fastcreatorDraftTray = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Nie udało się wczytać okna Drag and Drop."));
      document.head.appendChild(script);
    });
  }

  return waitForFastCreatorCondition(
    () => (window.CustomStyleDraftTrayUI && typeof window.CustomStyleDraftTrayUI.open === "function")
      ? window.CustomStyleDraftTrayUI
      : null,
    {
      timeoutMs: 15000,
      intervalMs: 100,
      timeoutMessage: "Nie udało się uruchomić okna Drag and Drop."
    }
  );
}

function syncFastCreatorFilesIntoInput(input, files) {
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Nie znalazłem pola do przekazania plików.");
  }
  if (typeof DataTransfer !== "function") {
    throw new Error("Ta przeglądarka nie obsługuje przekazywania plików do kreatora.");
  }

  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  const transfer = new DataTransfer();
  list.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
}

function isFastCreatorCustomStyleToggleEnabled(markEl) {
  return !!(markEl instanceof HTMLElement && String(markEl.textContent || "").includes("✓"));
}

function syncFastCreatorCustomStyleToggle(button, markEl, expectedState) {
  if (!(button instanceof HTMLElement) || !(markEl instanceof HTMLElement)) return;
  const currentState = isFastCreatorCustomStyleToggleEnabled(markEl);
  if (currentState !== !!expectedState) {
    button.click();
  }
}

async function openFastCreatorDraftCatalog() {
  const excelFile = fastCreatorState.selectedExcelFile;
  if (!excelFile) {
    throw new Error("Najpierw wybierz plik Excel.");
  }
  if (typeof window.openCustomStyleCreator !== "function") {
    throw new Error("Moduł styl-wlasny nie jest jeszcze gotowy.");
  }

  const selectedImages = getFastCreatorImagesForFinalize();
  const useMatchedImageSubset = !!fastCreatorState.lastImageSummary;
  const catalogName = getNameValue() || "Projekt bez nazwy";
  const selectedStyleId = String(fastCreatorState.selectedStyleId || "default").trim() || "default";
  const showPrice = fastCreatorState.previewVisibility?.showPrice !== false;
  const showBarcode = fastCreatorState.previewVisibility?.showBarcode === true;
  const hasAssignedPages = hasFastCreatorAssignedPages();
  let autoLayoutResult = {
    available: typeof window.applyQuickAiMagicLayoutForPage === "function",
    attempted: 0,
    applied: 0,
    failed: 0
  };

  setFastCreatorStatus("finalize", "Przygotowuję obszar roboczy katalogu...", "loading");
  await prepareCatalogWorkspace(catalogName);

  if (!hasAssignedPages) {
    setFastCreatorStatus("finalize", "Tworzę pustą stronę A4 do pracy z Drag and Drop...", "loading");
    await ensureFastCreatorBlankCatalogPage();
  }

  if (hasAssignedPages) {
    closeFastCreatorDraftTrayIfOpen();
  }

  setFastCreatorStatus(
    "finalize",
    hasAssignedPages ? "Uruchamiam kreator stylu..." : "Uruchamiam kreator stylu i Drag and Drop...",
    "loading"
  );
  await window.openCustomStyleCreator();
  if (hasAssignedPages) {
    closeFastCreatorDraftTrayIfOpen();
  } else {
    await ensureFastCreatorDraftTrayReady();
  }

  const customStyleModal = await waitForFastCreatorCondition(
    () => {
      const modal = document.getElementById("customStyleModal");
      const excelInput = document.getElementById("customExcelImportInput");
      const imageInput = document.getElementById("customBulkImageImportInput");
      const styleSelect = document.getElementById("customModuleLayoutSelect");
      if (!(modal instanceof HTMLElement) || !(excelInput instanceof HTMLInputElement) || !(imageInput instanceof HTMLInputElement)) {
        return null;
      }
      return {
        modal,
        excelInput,
        imageInput,
        styleSelect: styleSelect instanceof HTMLSelectElement ? styleSelect : null,
        applyImportedLayoutBtn: document.getElementById("customApplyImportedLayoutBtn"),
        excelStatus: document.getElementById("customExcelImportStatus"),
        showPriceToggle: document.getElementById("customShowPriceToggle"),
        showPriceToggleMark: document.getElementById("customShowPriceToggleMark"),
        showBarcodeToggle: document.getElementById("customShowBarcodeToggle"),
        showBarcodeToggleMark: document.getElementById("customShowBarcodeToggleMark")
      };
    },
    {
      timeoutMs: 30000,
      intervalMs: 100,
      timeoutMessage: "Nie udało się otworzyć kreatora styl-wlasny."
    }
  );

  if (customStyleModal.styleSelect && Array.from(customStyleModal.styleSelect.options || []).some((option) => String(option?.value || "") === selectedStyleId)) {
    customStyleModal.styleSelect.value = selectedStyleId;
    customStyleModal.styleSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  syncFastCreatorCustomStyleToggle(
    customStyleModal.showPriceToggle,
    customStyleModal.showPriceToggleMark,
    showPrice
  );
  syncFastCreatorCustomStyleToggle(
    customStyleModal.showBarcodeToggle,
    customStyleModal.showBarcodeToggleMark,
    showBarcode
  );

  if (customStyleModal.excelStatus instanceof HTMLElement) {
    customStyleModal.excelStatus.textContent = "";
    customStyleModal.excelStatus.style.display = "none";
  }

  const getDraftCount = () => {
    const bridge = window.CustomStyleDraftBridge;
    return bridge && typeof bridge.getDrafts === "function"
      ? Number(bridge.getDrafts().length || 0)
      : 0;
  };

  const draftCountBeforeExcel = getDraftCount();
  syncFastCreatorFilesIntoInput(customStyleModal.excelInput, [excelFile]);
  setFastCreatorStatus(
    "finalize",
    hasAssignedPages
      ? "Importuję produkty z Excela do gotowego układu..."
      : "Importuję produkty z Excela do Drag and Drop...",
    "loading"
  );
  customStyleModal.excelInput.dispatchEvent(new Event("change", { bubbles: true }));

  const excelImportResult = await waitForFastCreatorCondition(
    () => {
      const draftCountNow = getDraftCount();
      const statusText = String(customStyleModal.excelStatus?.textContent || "").trim();
      if (/Błąd importu Excela/i.test(statusText) || /Nie udało się/i.test(statusText) || /Plik nie zawiera/i.test(statusText)) {
        return { error: statusText };
      }
      if (draftCountNow > draftCountBeforeExcel || /^Zaimportowano /i.test(statusText) || /Excel przygotowany/i.test(statusText)) {
        return { ok: true };
      }
      return null;
    },
    {
      timeoutMs: 45000,
      intervalMs: 140,
      timeoutMessage: "Import Excela do styl-wlasny nie zakończył się na czas."
    }
  );

  if (excelImportResult?.error) {
    throw new Error(excelImportResult.error);
  }
  if (getDraftCount() <= 0) {
    throw new Error(
      hasAssignedPages
        ? "Nie udało się przygotować produktów do gotowego układu katalogu."
        : "Nie udało się przygotować produktów do okna Drag and Drop."
    );
  }

  if (selectedImages.length) {
    syncFastCreatorFilesIntoInput(customStyleModal.imageInput, selectedImages);
    setFastCreatorStatus(
      "finalize",
      hasAssignedPages
        ? `Importuję ${selectedImages.length} ${useMatchedImageSubset ? "dopasowanych " : ""}zdjęć do gotowego układu...`
        : "Importuję zdjęcia do Drag and Drop...",
      "loading"
    );
    customStyleModal.imageInput.dispatchEvent(new Event("change", { bubbles: true }));

    const imageImportResult = await waitForFastCreatorCondition(
      () => {
        const statusText = String(customStyleModal.excelStatus?.textContent || "").trim();
        if (/Błąd importu zdjęć/i.test(statusText)) {
          return { error: statusText };
        }
        if (/^Import zdjęć:/i.test(statusText) && !/przygotowanie/i.test(statusText)) {
          return { ok: true };
        }
        return null;
      },
      {
        timeoutMs: 60000,
        intervalMs: 160,
        timeoutMessage: "Import zdjęć do styl-wlasny nie zakończył się na czas."
      }
    );

    if (imageImportResult?.error) {
      throw new Error(imageImportResult.error);
    }
  }

  if (hasAssignedPages) {
    const applyBtn = customStyleModal.applyImportedLayoutBtn;
    if (!(applyBtn instanceof HTMLButtonElement)) {
      throw new Error("Nie znalazłem przycisku układu katalogu w styl-wlasny.");
    }
    closeFastCreatorDraftTrayIfOpen();
    setFastCreatorStatus("finalize", "Układam katalog według przypisanych stron...", "loading");
    const pagesBefore = Array.isArray(window.pages)
      ? window.pages.filter((page) => page && !page.isCover).length
      : 0;
    applyBtn.click();
    await waitForFastCreatorCondition(
      () => {
        const pagesNow = Array.isArray(window.pages)
          ? window.pages.filter((page) => page && !page.isCover).length
          : 0;
        const statusText = String(customStyleModal.excelStatus?.textContent || "").trim();
        if (/Nie udało się/i.test(statusText)) {
          return { error: statusText };
        }
        if (pagesNow > pagesBefore || /Gotowy layout z Excela został dodany/i.test(statusText)) {
          return { ok: true };
        }
        return null;
      },
      {
        timeoutMs: 45000,
        intervalMs: 150,
        timeoutMessage: "Nie udało się ułożyć katalogu według przypisanych stron."
      }
    );
    closeFastCreatorDraftTrayIfOpen();
  } else if (window.CustomStyleDraftBridge && typeof window.CustomStyleDraftBridge.requestOpenTray === "function") {
    setFastCreatorStatus("finalize", "Otwieram okno Drag and Drop z produktami...", "loading");
    window.CustomStyleDraftBridge.requestOpenTray();
  } else if (window.CustomStyleDraftTrayUI && typeof window.CustomStyleDraftTrayUI.open === "function") {
    setFastCreatorStatus("finalize", "Otwieram okno Drag and Drop z produktami...", "loading");
    window.CustomStyleDraftTrayUI.open();
  } else {
    throw new Error("Nie udało się otworzyć okna Drag and Drop.");
  }

  if (!hasAssignedPages) {
    await waitForFastCreatorCondition(
      () => {
        const tray = document.getElementById("customStyleDraftTray");
        if (!(tray instanceof HTMLElement)) return null;
        const visible = window.getComputedStyle(tray).display !== "none";
        return visible ? { ok: true } : null;
      },
      {
        timeoutMs: 15000,
        intervalMs: 120,
        timeoutMessage: "Okno Drag and Drop nie pojawiło się na ekranie."
      }
    );
  }

  if (customStyleModal.modal instanceof HTMLElement) {
    customStyleModal.modal.style.display = "none";
  }

  if (hasAssignedPages) {
    const deferredAutoLayoutResult = await runFastCreatorDeferredMagicLayoutPasses(selectedStyleId);
    autoLayoutResult = mergeFastCreatorAutoLayoutResults(autoLayoutResult, deferredAutoLayoutResult);
    clearFastCreatorAutoLayoutSelectionDecor();
  }

  return {
    hasAssignedPages,
    autoLayoutResult
  };
}

async function openFastCreator() {
  await ensureFastCreatorMounted();

  let canOpen = true;
  const legacyModal = document.getElementById("quickCreatorModal");
  const previousVisibility = legacyModal ? legacyModal.style.visibility : "";

  if (legacyModal) {
    legacyModal.style.display = "none";
    legacyModal.style.visibility = "hidden";
  }

  if (typeof fastCreatorState.legacyOpenQuickCreator === "function") {
    await fastCreatorState.legacyOpenQuickCreator();
    if (legacyModal) {
      canOpen = window.getComputedStyle(legacyModal).display !== "none";
      legacyModal.style.display = "none";
      legacyModal.style.visibility = previousVisibility;
    }
  }

  if (!canOpen) {
    return false;
  }

  resetFastCreatorState();
  fastCreatorState.modal.classList.add("is-open");
  fastCreatorState.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("fastcreator-open");
  fastCreatorState.elements.nameInput?.focus();
  return true;
}

function attachStartButtonInterceptor() {
  const startCreateProjectBtn = document.getElementById("startCreateProjectBtn");
  if (!startCreateProjectBtn || startCreateProjectBtn.dataset.fastcreatorBound === "true") return;

  startCreateProjectBtn.dataset.fastcreatorBound = "true";
  startCreateProjectBtn.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      await openFastCreator();
    },
    true
  );
}

async function initFastCreator() {
  if (fastCreatorState.initialized) {
    attachStartButtonInterceptor();
    return;
  }

  fastCreatorState.initialized = true;
  fastCreatorState.legacyOpenQuickCreator =
    typeof window.openQuickCreator === "function" ? window.openQuickCreator.bind(window) : null;

  window.openFastCreator = openFastCreator;
  window.openQuickCreator = openFastCreator;

  attachStartButtonInterceptor();
  await ensureFastCreatorMounted();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initFastCreator().catch((error) => {
      console.error("fastcreator init error", error);
    });
  });
} else {
  initFastCreator().catch((error) => {
    console.error("fastcreator init error", error);
  });
}

(function () {
  const demoProducts = [
    { id: "p-101", index: "WF-101", label: "Mango Delux", description: "Karta inspirowana ukladem direct z glownego stylu.", price: "12.99", packageText: "500 g", layoutLabel: "Styl numer 1", imageUrl: "" },
    { id: "p-204", index: "WF-204", label: "Berry Mix", description: "Zwarty produkt pod bardziej kompaktowy uklad.", price: "9.49", packageText: "250 g", layoutLabel: "Styl numer 2", imageUrl: "" },
    { id: "p-305", index: "WF-305", label: "Coconut Crunch", description: "Wiekszy modul do spokojnego ekspozycyjnego układu.", price: "14.20", packageText: "1 szt.", layoutLabel: "Styl numer 3", imageUrl: "" },
    { id: "p-411", index: "WF-411", label: "Citrus Fresh", description: "Produkt do szybkiego testowania kilku kart na stronie.", price: "10.90", packageText: "330 ml", layoutLabel: "Styl numer 1", imageUrl: "" }
  ];

  const state = {
    selectedProductId: demoProducts[0].id,
    selectedLayout: "styl-numer-1",
    selectedImageUrl: "",
    products: demoProducts.slice()
  };

  function getSelectedProduct() {
    return state.products.find((product) => product.id === state.selectedProductId) || state.products[0];
  }

  function getLayoutLabel() {
    if (state.selectedLayout === "styl-numer-2") return "Styl numer 2";
    if (state.selectedLayout === "styl-numer-3") return "Styl numer 3";
    return "Styl numer 1";
  }

  function renderEditor() {
    const root = document.getElementById("stylWlasnyRoot");
    if (!root) return;

    root.innerHTML = `
      <div class="editor-panel__head">
        <div class="demo-brand__eyebrow">Edytor</div>
        <h3>Kreator katalogu - styl wlasny</h3>
        <p>Wybierz produkt, styl modulu i kliknij przycisk, aby dodac go do bialej strony A4 w <strong>projekt.js</strong>.</p>
      </div>

      <div class="editor-panel__section">
        <label class="field">
          <span>Importuj Excel</span>
          <input id="customExcelImportInput" type="file" accept=".xlsx,.xls,.csv">
        </label>
        <div class="helper-text">Odczytujemy pierwsza zakladke. Wspierane kolumny: index, label lub name, description, price, package, page.</div>
      </div>

      <div class="editor-panel__section">
        <label class="field">
          <span>Produkt</span>
          <select id="customProductSelect">
            ${state.products.map((product) => `<option value="${product.id}">${product.index} - ${product.label}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Uklad modulu</span>
          <select id="customLayoutSelect">
            <option value="styl-numer-1">Styl numer 1</option>
            <option value="styl-numer-2">Styl numer 2</option>
            <option value="styl-numer-3">Styl numer 3</option>
          </select>
        </label>
        <label class="field">
          <span>Zdjecie produktu</span>
          <input id="customImageInput" type="file" accept="image/*">
        </label>
      </div>

      <div class="editor-panel__section">
        <div class="chip">Podglad produktu</div>
        <div id="customPreviewCard" class="status-box"></div>
      </div>

      <div class="editor-panel__section">
        <div class="editor-actions">
          <button id="customAddProductBtn" class="ui-btn ui-btn--primary" type="button">Dodaj produkt do katalogu</button>
          <button id="customAddAnotherBtn" class="ui-btn ui-btn--ghost" type="button">Dodaj kolejny produkt</button>
        </div>
        <div id="customStatusBox" class="status-box">Aktywna strona A4 czeka na pierwszy produkt.</div>
      </div>
    `;

    document.getElementById("customProductSelect").value = state.selectedProductId;
    document.getElementById("customLayoutSelect").value = state.selectedLayout;
    renderPreview();
  }

  function renderPreview() {
    const preview = document.getElementById("customPreviewCard");
    const product = getSelectedProduct();
    if (!preview || !product) return;
    const imageUrl = state.selectedImageUrl || product.imageUrl || "";
    const imageHtml = imageUrl
      ? `<img src="${imageUrl}" alt="${product.label}">`
      : `<div class="preview-card__placeholder">Brak zdjecia</div>`;

    preview.innerHTML = `
      <div class="preview-card">
        <div class="preview-card__image">${imageHtml}</div>
        <div>
          <strong>${product.label}</strong><br>
          Indeks: ${product.index}<br>
          Cena: ${product.price} GBP<br>
          Opakowanie: ${product.packageText || "-"}<br>
          Uklad: ${getLayoutLabel()}<br>
          <span>${product.description}</span>
        </div>
      </div>
    `;
  }

  function updateStatus(message) {
    const box = document.getElementById("customStatusBox");
    if (box) box.textContent = message;
  }

  function buildCatalogEntry() {
    const product = getSelectedProduct();
    return {
      id: `${product.id}-${Date.now()}`,
      index: product.index,
      label: product.label,
      description: product.description,
      price: product.price,
      packageText: product.packageText || "",
      layoutId: state.selectedLayout,
      layoutLabel: getLayoutLabel(),
      imageUrl: state.selectedImageUrl || product.imageUrl || ""
    };
  }

  function addProductToCatalog() {
    if (!window.ProjektDemo || typeof window.ProjektDemo.addProductToActivePage !== "function") {
      updateStatus("Brak polaczenia z projekt.js.");
      return;
    }

    const entry = buildCatalogEntry();
    window.ProjektDemo.addProductToActivePage(entry);
    const activePage = window.ProjektDemo.getActivePage();
    updateStatus(`Dodano produkt ${entry.index} do strony A4 ${activePage ? activePage.number : "-"}.`);
  }

  function addAnotherProduct() {
    const currentIndex = state.products.findIndex((product) => product.id === state.selectedProductId);
    const nextIndex = (currentIndex + 1) % state.products.length;
    state.selectedProductId = state.products[nextIndex].id;
    document.getElementById("customProductSelect").value = state.selectedProductId;
    state.selectedImageUrl = "";
    document.getElementById("customImageInput").value = "";
    renderPreview();
  }

  function normalizeHeader(value) {
    return String(value || "").trim().toLowerCase();
  }

  function mapExcelRowsToProducts(rows) {
    return rows
      .map((row, index) => {
        const normalized = {};
        Object.keys(row || {}).forEach((key) => {
          normalized[normalizeHeader(key)] = row[key];
        });
        const label = String(normalized.label || normalized.name || normalized.nazwa || "").trim();
        const productIndex = String(normalized.index || normalized.indeks || normalized.sku || `ROW-${index + 1}`).trim();
        if (!label) return null;
        return {
          id: `excel-${index + 1}-${Date.now()}`,
          index: productIndex,
          label,
          description: String(normalized.description || normalized.opis || "").trim(),
          price: String(normalized.price || normalized.cena || "0.00").trim(),
          packageText: String(normalized.package || normalized.opakowanie || normalized.unit || "").trim(),
          assignedPage: Number(normalized.page || normalized.strona || 0) || null,
          layoutLabel: "Styl numer 1",
          imageUrl: ""
        };
      })
      .filter(Boolean);
  }

  function applyImportedProducts(products) {
    if (!products.length) {
      updateStatus("Plik Excel nie zawiera produktow.");
      return;
    }
    state.products = products;
    state.selectedProductId = products[0].id;
    state.selectedImageUrl = "";
    renderEditor();
    bindEvents();
    updateStatus(`Zaimportowano ${products.length} produktow z Excela.`);

    const hasAssignedPages = products.some((product) => Number.isFinite(product.assignedPage) && product.assignedPage > 0);
    if (hasAssignedPages && window.ProjektDemo && typeof window.ProjektDemo.setPages === "function") {
      const grouped = new Map();
      products.forEach((product) => {
        const pageNumber = product.assignedPage || 1;
        if (!grouped.has(pageNumber)) grouped.set(pageNumber, []);
        grouped.get(pageNumber).push(product);
      });
      const pages = Array.from(grouped.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([pageNumber, items]) => ({
          id: `page-${pageNumber}`,
          number: pageNumber,
          products: items.map((item) => ({
            id: `${item.id}-page`,
            index: item.index,
            label: item.label,
            description: item.description,
            price: item.price,
            packageText: item.packageText,
            layoutId: "styl-numer-1",
            layoutLabel: "Styl numer 1",
            imageUrl: item.imageUrl || ""
          })),
          layout: {
            columns: 2,
            gap: 16,
            cardHeight: 210,
            variant: "balanced"
          }
        }));
      window.ProjektDemo.setPages(pages);
      updateStatus(`Zaimportowano ${products.length} produktow i przygotowano ${pages.length} stron A4 z Excela.`);
    }
  }

  function handleExcelImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.XLSX) {
      updateStatus("Brak biblioteki XLSX w demo.html.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function (loadEvent) {
      try {
        const data = new Uint8Array(loadEvent.target.result);
        const workbook = window.XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "" });
        applyImportedProducts(mapExcelRowsToProducts(rows));
      } catch (_error) {
        updateStatus("Nie udalo sie odczytac pliku Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImageImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (loadEvent) {
      state.selectedImageUrl = String(loadEvent.target.result || "");
      const current = getSelectedProduct();
      if (current) current.imageUrl = state.selectedImageUrl;
      renderPreview();
      updateStatus(`Podpieto zdjecie do produktu ${current?.index || "-"}.`);
    };
    reader.readAsDataURL(file);
  }

  function bindEvents() {
    document.getElementById("customProductSelect").addEventListener("change", function (event) {
      state.selectedProductId = event.target.value;
      state.selectedImageUrl = getSelectedProduct()?.imageUrl || "";
      renderPreview();
    });

    document.getElementById("customLayoutSelect").addEventListener("change", function (event) {
      state.selectedLayout = event.target.value;
      renderPreview();
    });

    document.getElementById("customAddProductBtn").addEventListener("click", addProductToCatalog);
    document.getElementById("customAddAnotherBtn").addEventListener("click", addAnotherProduct);
    document.getElementById("customExcelImportInput").addEventListener("change", handleExcelImport);
    document.getElementById("customImageInput").addEventListener("change", handleImageImport);
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderEditor();
    bindEvents();
  });
})();

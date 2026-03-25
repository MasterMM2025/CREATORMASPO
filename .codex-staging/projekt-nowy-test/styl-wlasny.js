(function () {
  const demoProducts = [
    { name: "Mango Deluxe", desc: "Owocowy miks i nowoczesna karta produktu.", price: "12.99" },
    { name: "Berry Mix", desc: "Lekka karta w stylu premium do szybkich testow.", price: "9.49" },
    { name: "Coconut Crunch", desc: "Prosty blok produktowy inspirowany glowym projektem.", price: "14.20" },
    { name: "Citrus Fresh", desc: "Wersja demonstracyjna do sprawdzania ukladu i odstepow.", price: "10.90" }
  ];

  const state = {
    title: "Promocje tygodnia",
    accent: "glow",
    cardCount: 4,
    products: demoProducts.slice()
  };

  function getGrid() {
    return document.getElementById("productGrid");
  }

  function syncLabels() {
    document.getElementById("previewTitle").textContent = state.title;
    document.getElementById("productCountLabel").textContent = String(state.cardCount);
    document.getElementById("styleNameLabel").textContent = state.accent === "glow"
      ? "Glow"
      : state.accent === "ocean"
        ? "Ocean"
        : "Sunset";
  }

  function applyTheme() {
    document.body.classList.remove("theme-ocean", "theme-sunset");
    if (state.accent === "ocean") document.body.classList.add("theme-ocean");
    if (state.accent === "sunset") document.body.classList.add("theme-sunset");
  }

  function buildCards() {
    const grid = getGrid();
    if (!grid) return;
    grid.innerHTML = "";

    for (let i = 0; i < state.cardCount; i += 1) {
      const product = state.products[i % state.products.length];
      const card = document.createElement("article");
      card.className = "product-card";
      card.innerHTML = `
        <div class="product-card__media"></div>
        <h4 class="product-card__title">${product.name}</h4>
        <p class="product-card__meta">${product.desc}</p>
        <div class="product-card__price">${product.price} GBP</div>
      `;
      grid.appendChild(card);
    }
  }

  function applyStyleFromControls() {
    state.title = document.getElementById("pageTitleInput").value.trim() || "Promocje tygodnia";
    state.accent = document.getElementById("accentSelect").value;
    state.cardCount = Number(document.getElementById("cardCountInput").value) || 4;
    applyTheme();
    syncLabels();
    buildCards();
  }

  function fillDemo() {
    document.getElementById("pageTitleInput").value = "Nowosci i promocje";
    document.getElementById("accentSelect").value = "ocean";
    document.getElementById("cardCountInput").value = "6";
    applyStyleFromControls();
  }

  function bindEvents() {
    document.getElementById("applyStyleBtn").addEventListener("click", applyStyleFromControls);
    document.getElementById("fillDemoBtn").addEventListener("click", fillDemo);
    document.getElementById("cardCountInput").addEventListener("input", applyStyleFromControls);
  }

  function init() {
    bindEvents();
    applyStyleFromControls();
  }

  window.testStyleState = state;
  window.applyTestStyle = applyStyleFromControls;
  document.addEventListener("DOMContentLoaded", init);
})();

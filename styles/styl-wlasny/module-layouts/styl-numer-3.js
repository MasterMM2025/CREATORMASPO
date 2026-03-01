(function () {
  if (typeof window.registerStylWlasnyModuleLayoutStyle !== "function") return;

  window.registerStylWlasnyModuleLayoutStyle({
    id: "styl-numer-3",
    label: "Styl numer 3",
    config: {
      singleDirect: {
        // Zdjęcie duże u góry modułu
        imgArea: { x: 4.0, y: 5.0, w: 92.0, h: 48.0 },

        // Duża cena pod zdjęciem (bez koła)
        priceArea: { x: 17.5, y: 55.0, s: 17.0 },

        // Opis pod ceną: nazwa -> indeks -> opak.
        nameArea: { x: 18.0, y: 76.0, w: 76.0, h: 12.8 },
        indexPos: { x: 18.0, y: 88.8 },
        packagePos: { x: 18.0, y: 93.0 },

        // Dodatki wyłączone w tym układzie
        flagArea: { x: 0, y: 0, w: 0, h: 0 },
        barcodeArea: { x: 0, y: 0, w: 0, h: 0 },
        divider: { x: -1, y: 0, h: 0, w: 0 }
      },
      text: {
        nameColor: "#123d85",
        indexColor: "#123d85",
        packageColor: "#123d85",
        indexItalic: false,
        noPriceCircle: true,
        priceColor: "#0b4aa2",
        forcePriceBold: true,
        priceExtraBold: true,
        priceScaleMultiplier: 1.35
      }
    }
  });
})();

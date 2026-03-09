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
      familyDirect: {
        // Dla rodziny zachowujemy ten sam układ stylu 3:
        // zdjęcia zostają w górnym obszarze, a cena i tekst pod spodem.
        useSingleLayout: true,
        imageLayouts: {
          family2: [
            { x: 0.02, y: 0.00, w: 0.46, h: 1.00 },
            { x: 0.52, y: 0.00, w: 0.46, h: 1.00 }
          ],
          family3: [
            { x: 0.01, y: 0.00, w: 0.31, h: 1.00 },
            { x: 0.345, y: 0.00, w: 0.31, h: 1.00 },
            { x: 0.68, y: 0.00, w: 0.31, h: 1.00 }
          ],
          family4: [
            { x: 0.06, y: 0.00, w: 0.40, h: 0.48 },
            { x: 0.54, y: 0.00, w: 0.40, h: 0.48 },
            { x: 0.06, y: 0.52, w: 0.40, h: 0.48 },
            { x: 0.54, y: 0.52, w: 0.40, h: 0.48 }
          ]
        }
      },
      text: {
        nameColor: "#123d85",
        indexColor: "#b9b9b9",
        packageColor: "#123d85",
        indexItalic: true,
        noPriceCircle: true,
        priceColor: "#0b4aa2",
        forcePriceBold: true,
        priceExtraBold: true,
        priceScaleMultiplier: 1.35
      }
    }
  });
})();

(function () {
  if (typeof window.registerStylWlasnyModuleLayoutStyle !== "function") return;

  window.registerStylWlasnyModuleLayoutStyle({
    id: "styl-numer-1",
    label: "Styl numer 1",
    config: {
      singleDirect: {
        imgArea: { x: 12.5, y: 18.8, w: 62, h: 44 },
        nameArea: { x: 66.2, y: 22.5, w: 31, h: 28 },
        indexPos: { x: 66.2, y: 36.5 },
        packagePos: { x: 66.2, y: 40.5 },
        priceArea: { x: 66.2, y: 61.8, s: 14.5 },
        divider: { x: 63.6, y: 15.5, h: 58.5, w: 0.55 }
      },
      familyDirect: {
        // Reuzywamy ten sam układ tekstu/ceny co singleDirect;
        // zmieniamy tylko siatkę zdjęć dla rodziny.
        useSingleLayout: true,
        imageLayouts: {
          family2: [
            { x: 0.40, y: 0.00, w: 0.62, h: 0.44 },
            { x: 0.40, y: 0.50, w: 0.62, h: 0.44 }
          ],
          family3: [
            { x: 0.40, y: 0.00, w: 0.62, h: 0.27 },
            { x: 0.40, y: 0.35, w: 0.62, h: 0.27 },
            { x: 0.40, y: 0.70, w: 0.62, h: 0.27 }
          ],
          family4: [
            { x: 0.40, y: 0.00, w: 0.62, h: 0.20 },
            { x: 0.40, y: 0.26, w: 0.62, h: 0.20 },
            { x: 0.40, y: 0.52, w: 0.62, h: 0.20 },
            { x: 0.40, y: 0.78, w: 0.62, h: 0.20 }
          ]
        }
      },
      text: {
        nameColor: "#111111",
        indexColor: "#b9b9b9",
        packageColor: "#111111",
        indexItalic: false,
        noPriceCircle: true,
        priceColor: "#d71920",
        forcePriceBold: true,
        priceScaleMultiplier: 1.4
      }
    }
  });
})();

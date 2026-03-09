(function () {
  if (typeof window.registerStylWlasnyModuleLayoutStyle !== "function") return;

  window.registerStylWlasnyModuleLayoutStyle({
    id: "styl-numer-2",
    label: "Styl numer 2",
    config: {
      singleDirect: {
        imgArea: { x: 10.0, y: 16.0, w: 62.5, h: 50.0 },
        nameArea: { x: 66.5, y: 22.0, w: 30.0, h: 22.0 },
        indexPos: { x: 66.5, y: 36.2 },
        packagePos: { x: 66.5, y: 39.8 },
        priceArea: { x: 66.5, y: 50.8, w: 24.0, h: 11.5, r: 2.2 },
        divider: { x: -1, y: 0, h: 0, w: 0 }
      },
      familyDirect: {
        // Dla rodziny utrzymujemy ten sam układ tekstów/ceny co w singleDirect,
        // zmienia się tylko sposób ułożenia wielu zdjęć produktu.
        useSingleLayout: true,
        imageLayouts: {
          family2: [
            { x: 0.50, y: 0.00, w: 0.72, h: 0.43 },
            { x: 0.50, y: 0.47, w: 0.72, h: 0.43 }
          ],
          family3: [
            { x: 0.50, y: 0.00, w: 0.72, h: 0.30 },
            { x: 0.50, y: 0.34, w: 0.72, h: 0.30 },
            { x: 0.50, y: 0.68, w: 0.72, h: 0.30 }
          ],
          family4: [
            { x: 0.50, y: 0.00, w: 0.72, h: 0.22 },
            { x: 0.50, y: 0.26, w: 0.72, h: 0.22 },
            { x: 0.50, y: 0.52, w: 0.72, h: 0.22 },
            { x: 0.50, y: 0.78, w: 0.72, h: 0.22 }
          ]
        }
      },
      text: {
        nameColor: "#151515",
        indexColor: "#9ca3af",
        packageColor: "#151515",
        indexItalic: false,
        priceShape: "roundedRect",
        priceBgColor: "#2eaee8",
        priceBgRadius: 2.2,
        forcePriceBold: true,
        priceColor: "#ffffff",
        priceScaleMultiplier: 1.08
      }
    }
  });
})();

# Styl własny - style JS

Ten folder jest miejscem na osobne pliki JS ze stylami dla `styl-wlasny.js`.

## Rejestr

- `registry.js` udostępnia globalną funkcję:
  - `window.registerStylWlasnyPriceBadgeStyle({...})`

## Aktualne style ceny (koła)

- `price-badges/kolko-czerwone.js`
- `price-badges/kolko-czerwone-tnz.js`
- `price-badges/kolko-granatowe.js`
- `price-badges/kolko-granatowe-bez-ramki.js`

## Aktualne style modułu

- `module-layouts/styl-numer-1.js`

## Jak dodać nowy styl

1. Utwórz nowy plik JS w `price-badges/`.
2. Zarejestruj styl:

```js
(function () {
  if (typeof window.registerStylWlasnyPriceBadgeStyle !== "function") return;
  window.registerStylWlasnyPriceBadgeStyle({
    id: "styl-numer-3",
    label: "Styl numer 3",
    path: "CREATOR BASIC/katalog styl wlasny/styl-numer-3.png"
  });
})();
```

3. Dodaj `<script src="...">` w `kreator.html` przed `styl-wlasny.js`.

Po tym styl pojawi się automatycznie w polu `Wybierz styl`.

## Jak dodać nowy styl modułu (układ)

1. Utwórz plik JS w `module-layouts/`.
2. Zarejestruj:

```js
(function () {
  if (typeof window.registerStylWlasnyModuleLayoutStyle !== "function") return;
  window.registerStylWlasnyModuleLayoutStyle({
    id: "styl-numer-2",
    label: "Styl numer 2",
    config: {
      singleDirect: {
        imgArea: { x: 2, y: 18, w: 62, h: 44 },
        nameArea: { x: 66, y: 22, w: 31, h: 28 },
        indexPos: { x: 66, y: 57 },
        packagePos: { x: 66, y: 64 },
        priceArea: { x: 66, y: 74, s: 22 },
        divider: { x: 63.5, y: 15, h: 58, w: 0.55 }
      },
      text: {
        nameColor: "#111111",
        indexColor: "#b9b9b9",
        packageColor: "#111111",
        indexItalic: false
      }
    }
  });
})();
```

3. Dodaj `<script src="...">` w `kreator.html` przed `styl-wlasny.js`.

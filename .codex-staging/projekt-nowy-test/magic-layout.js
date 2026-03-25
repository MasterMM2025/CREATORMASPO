(function () {
  const presets = {
    balanced: { columns: 2, gap: 18, height: 220 },
    compact: { columns: 3, gap: 14, height: 190 },
    showcase: { columns: 2, gap: 24, height: 260 }
  };

  function backdrop() {
    return document.getElementById("magicLayoutBackdrop");
  }

  function openModal() {
    const el = backdrop();
    if (!el) return;
    el.hidden = false;
  }

  function closeModal() {
    const el = backdrop();
    if (!el) return;
    el.hidden = true;
  }

  function applyLayout(options) {
    const root = document.documentElement;
    root.style.setProperty("--grid-columns", String(options.columns));
    root.style.setProperty("--grid-gap", `${options.gap}px`);
    root.style.setProperty("--card-min-height", `${options.height}px`);
  }

  function currentOptionsFromForm() {
    return {
      columns: Math.min(4, Math.max(1, Number(document.getElementById("layoutColumnsInput").value) || 2)),
      gap: Math.min(40, Math.max(8, Number(document.getElementById("layoutGapInput").value) || 18)),
      height: Math.min(360, Math.max(180, Number(document.getElementById("cardHeightInput").value) || 220))
    };
  }

  function applyPreset(name) {
    const preset = presets[name] || presets.balanced;
    document.getElementById("layoutColumnsInput").value = String(preset.columns);
    document.getElementById("layoutGapInput").value = String(preset.gap);
    document.getElementById("cardHeightInput").value = String(preset.height);
    applyLayout(preset);
  }

  function applyRandom() {
    const options = {
      columns: [1, 2, 3][Math.floor(Math.random() * 3)],
      gap: [12, 16, 18, 22, 26][Math.floor(Math.random() * 5)],
      height: [190, 220, 240, 280][Math.floor(Math.random() * 4)]
    };
    document.getElementById("layoutColumnsInput").value = String(options.columns);
    document.getElementById("layoutGapInput").value = String(options.gap);
    document.getElementById("cardHeightInput").value = String(options.height);
    applyLayout(options);
  }

  function bindEvents() {
    document.getElementById("openMagicBtn").addEventListener("click", openModal);
    document.getElementById("closeMagicBtn").addEventListener("click", closeModal);
    document.getElementById("applyLayoutBtn").addEventListener("click", function () {
      applyLayout(currentOptionsFromForm());
      closeModal();
    });
    document.getElementById("randomLayoutBtn").addEventListener("click", applyRandom);
    document.getElementById("layoutPresetSelect").addEventListener("change", function (event) {
      applyPreset(event.target.value);
    });
    backdrop().addEventListener("click", function (event) {
      if (event.target === backdrop()) closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindEvents();
    applyPreset("balanced");
  });

  window.openMagicLayoutTest = openModal;
})();

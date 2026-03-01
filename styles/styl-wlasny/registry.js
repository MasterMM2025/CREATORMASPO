(function () {
  const root = window;
  if (!root.STYL_WLASNY_REGISTRY) {
    root.STYL_WLASNY_REGISTRY = {
      priceBadges: [],
      moduleLayouts: []
    };
  }

  root.registerStylWlasnyPriceBadgeStyle = function registerStylWlasnyPriceBadgeStyle(styleDef) {
    if (!styleDef || typeof styleDef !== "object") return;
    const id = String(styleDef.id || "").trim();
    const label = String(styleDef.label || "").trim();
    if (!id || !label) return;

    const normalized = {
      id,
      label,
      path: String(styleDef.path || "").trim(),
      url: String(styleDef.url || "").trim()
    };

    const list = root.STYL_WLASNY_REGISTRY.priceBadges;
    const idx = list.findIndex((item) => String(item?.id || "") === id);
    if (idx >= 0) list[idx] = normalized;
    else list.push(normalized);
  };

  root.registerStylWlasnyModuleLayoutStyle = function registerStylWlasnyModuleLayoutStyle(styleDef) {
    if (!styleDef || typeof styleDef !== "object") return;
    const id = String(styleDef.id || "").trim();
    const label = String(styleDef.label || "").trim();
    if (!id || !label) return;

    const normalized = {
      id,
      label,
      config: (styleDef.config && typeof styleDef.config === "object") ? styleDef.config : {}
    };

    const list = root.STYL_WLASNY_REGISTRY.moduleLayouts;
    const idx = list.findIndex((item) => String(item?.id || "") === id);
    if (idx >= 0) list[idx] = normalized;
    else list.push(normalized);
  };
})();

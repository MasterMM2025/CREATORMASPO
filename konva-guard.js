// konva-guard.js
// Globalny "bezpiecznik" dla race-condition drag w Konva 9
// (Cannot read properties of null (reading 'setPointersPositions'))
(function () {
  try {
    if (!window.Konva || !window.Konva.DD || !window.Konva.Node) return;
    if (window.__konvaHardDragGuardInstalled) return;

    const DD = window.Konva.DD;
    const NodeProto = window.Konva.Node.prototype;
    const STAGE_FALLBACK_KEY = "__konvaDragStageFallback";

    const shouldHandleKonvaDragError = (err) => {
      const msg = String((err && err.message) || err || "");
      return msg.includes("setPointersPositions") || msg.includes("dragStatus");
    };

    const stageAlive = (stage) => {
      if (!stage) return false;
      if (typeof stage.isDestroyed === "function" && stage.isDestroyed()) return false;
      if (typeof stage.container !== "function") return false;
      return !!stage.container();
    };

    const cleanupInvalidDragEntries = () => {
      try {
        const dragElements = DD && DD._dragElements;
        if (!dragElements) return;

        const entryAlive = (entry) => {
          const node = entry && (entry.node || entry);
          if (!node) return false;
          if (typeof node.isDestroyed === "function" && node.isDestroyed()) return false;
          if (typeof node.getStage !== "function") return false;
          const st = node.getStage();
          return stageAlive(st);
        };

        if (typeof dragElements.forEach === "function" && typeof dragElements.delete === "function") {
          const staleKeys = [];
          dragElements.forEach((entry, key) => {
            if (!entryAlive(entry)) staleKeys.push(key);
          });
          staleKeys.forEach((key) => {
            try { dragElements.delete(key); } catch (_e) {}
          });
          return;
        }

        if (Array.isArray(dragElements)) {
          for (let i = dragElements.length - 1; i >= 0; i -= 1) {
            if (!entryAlive(dragElements[i])) dragElements.splice(i, 1);
          }
          return;
        }

        if (typeof dragElements === "object") {
          Object.keys(dragElements).forEach((key) => {
            if (!entryAlive(dragElements[key])) delete dragElements[key];
          });
        }
      } catch (_e) {}
    };

    const stopEntryDrag = (entry) => {
      const node = entry && (entry.node || entry);
      if (!node) return;
      if (typeof node.stopDrag === "function") {
        try { node.stopDrag(); } catch (_e) {}
      }
      try { node[STAGE_FALLBACK_KEY] = null; } catch (_e) {}
    };

    const clearDragStateHard = () => {
      try {
        cleanupInvalidDragEntries();
        const dragElements = DD && DD._dragElements;

        if (dragElements && typeof dragElements.forEach === "function") {
          try { dragElements.forEach((entry) => stopEntryDrag(entry)); } catch (_e) {}
        } else if (Array.isArray(dragElements)) {
          dragElements.forEach((entry) => stopEntryDrag(entry));
        } else if (dragElements && typeof dragElements === "object") {
          Object.keys(dragElements).forEach((key) => stopEntryDrag(dragElements[key]));
        }

        if (dragElements && typeof dragElements.clear === "function") {
          dragElements.clear();
        } else if (Array.isArray(dragElements)) {
          dragElements.length = 0;
        } else {
          DD._dragElements = new Map();
        }

        DD.node = null;
        DD.isDragging = false;
        DD.justDragged = false;
        if (DD.anim && typeof DD.anim.stop === "function") {
          DD.anim.stop();
        }
      } catch (_e) {}
    };

    // Patch wszystkich metod DD, bo w różnych wersjach nazwy flow drag się różnią.
    Object.keys(DD).forEach((key) => {
      const original = DD[key];
      if (typeof original !== "function") return;
      if (original.__konvaGuardWrapped) return;

      const wrapped = function () {
        try {
          if (key.indexOf("drag") !== -1 || key.indexOf("Drag") !== -1) {
            cleanupInvalidDragEntries();
          }
          return original.apply(this, arguments);
        } catch (err) {
          if (!shouldHandleKonvaDragError(err)) throw err;
          clearDragStateHard();
          return;
        }
      };
      wrapped.__konvaGuardWrapped = true;
      wrapped.__konvaGuardOriginal = original;
      DD[key] = wrapped;
    });

    // Fallback stage podczas drag: jeśli node chwilowo wypnie się z drzewa,
    // getStage() zwróci stage zapamiętany na starcie drag.
    const originalGetStage = NodeProto.getStage;
    if (typeof originalGetStage === "function" && !originalGetStage.__konvaStageFallbackWrapped) {
      const wrappedGetStage = function () {
        const stage = originalGetStage.call(this);
        if (stageAlive(stage)) return stage;
        const fallback = this && this[STAGE_FALLBACK_KEY];
        if (stageAlive(fallback)) return fallback;
        return stage;
      };
      wrappedGetStage.__konvaStageFallbackWrapped = true;
      NodeProto.getStage = wrappedGetStage;
    }

    const originalStartDrag = NodeProto.startDrag;
    if (typeof originalStartDrag === "function" && !originalStartDrag.__konvaStartDragGuardWrapped) {
      const wrappedStartDrag = function () {
        try {
          this[STAGE_FALLBACK_KEY] = originalGetStage && originalGetStage.call(this);
        } catch (_e) {
          this[STAGE_FALLBACK_KEY] = null;
        }
        try {
          return originalStartDrag.apply(this, arguments);
        } catch (err) {
          if (!shouldHandleKonvaDragError(err)) throw err;
          clearDragStateHard();
          return this;
        }
      };
      wrappedStartDrag.__konvaStartDragGuardWrapped = true;
      NodeProto.startDrag = wrappedStartDrag;
    }

    const originalStopDrag = NodeProto.stopDrag;
    if (typeof originalStopDrag === "function" && !originalStopDrag.__konvaStopDragGuardWrapped) {
      const wrappedStopDrag = function () {
        try {
          return originalStopDrag.apply(this, arguments);
        } finally {
          try { this[STAGE_FALLBACK_KEY] = null; } catch (_e) {}
        }
      };
      wrappedStopDrag.__konvaStopDragGuardWrapped = true;
      NodeProto.stopDrag = wrappedStopDrag;
    }

    const onGlobalKonvaDragError = (ev) => {
      const msg = String((ev && (ev.message || (ev.error && ev.error.message))) || "");
      if (!msg.includes("setPointersPositions")) return;
      clearDragStateHard();
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      if (ev) ev.returnValue = false;
    };
    window.addEventListener("error", onGlobalKonvaDragError, true);

    // Safety-net: po puszczeniu wskaźnika resetuj stan DD, jeśli został zawieszony.
    const onPointerRelease = () => {
      try {
        const dragElements = DD && DD._dragElements;
        const hasEntries = !!(
          dragElements &&
          (
            (typeof dragElements.size === "number" && dragElements.size > 0) ||
            (Array.isArray(dragElements) && dragElements.length > 0)
          )
        );
        if (!hasEntries && DD && DD.isDragging) {
          clearDragStateHard();
        }
      } catch (_e) {}
    };
    window.addEventListener("mouseup", onPointerRelease, true);
    window.addEventListener("touchend", onPointerRelease, true);
    window.addEventListener("pointerup", onPointerRelease, true);

    window.__konvaHardDragGuardInstalled = true;
    window.__konvaHardDragGuardClear = clearDragStateHard;
  } catch (_e) {}
})();


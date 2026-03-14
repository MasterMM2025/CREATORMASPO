(function() {
  async function maybeCall(fn, ...args) {
    if (typeof fn !== 'function') return null;
    return await fn(...args);
  }

  function pickStoreApi() {
    return window.ProjectHistoryStore || {};
  }

  function cloneEntry(entry) {
    if (!entry) return null;
    return {
      id: entry.id,
      ts: entry.ts,
      source: entry.source,
      hash: entry.hash,
      data: entry.data
    };
  }

  function preparePersistPayload(history, options) {
    if (!history.current) return null;
    const persistUndoDepth = Math.max(0, Number(options.persistUndoDepth) || 8);
    const persistRedoDepth = Math.max(0, Number(options.persistRedoDepth) || 2);

    return {
      version: 2,
      savedAt: Date.now(),
      current: cloneEntry(history.current),
      undo: history.undo.slice(-persistUndoDepth).map(cloneEntry),
      redo: history.redo.slice(-persistRedoDepth).map(cloneEntry)
    };
  }

  function isMeaningfulPayload(payload) {
    return !!(payload && payload.current && payload.current.data);
  }

  async function waitForProjectLoadFunction(timeoutMs) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (typeof window.loadProjectFromData === 'function') return true;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return typeof window.loadProjectFromData === 'function';
  }

  function normalizeOpts(options) {
    return {
      limit: Number(options && options.limit) > 0 ? Number(options.limit) : 30,
      eventName: options && options.eventName ? options.eventName : 'canvasModified',
      debounceMs: Number(options && options.debounceMs) > 0 ? Number(options.debounceMs) : 260,
      snapshotFn: typeof (options && options.snapshotFn) === 'function' ? options.snapshotFn : () => null,
      applyFn: typeof (options && options.applyFn) === 'function' ? options.applyFn : null,
      shouldArchiveStateFn: typeof (options && options.shouldArchiveStateFn) === 'function'
        ? options.shouldArchiveStateFn
        : null,
      previewFn: typeof (options && options.previewFn) === 'function' ? options.previewFn : null,
      projectIdentityFn: typeof (options && options.projectIdentityFn) === 'function' ? options.projectIdentityFn : null,
      storeKey: options && options.storeKey ? String(options.storeKey) : 'main',
      autosaveDebounceMs: Number(options && options.autosaveDebounceMs) > 0 ? Number(options.autosaveDebounceMs) : 1400,
      autosaveArchiveLimit: Number(options && options.autosaveArchiveLimit) > 0 ? Number(options.autosaveArchiveLimit) : 30,
      autosaveArchiveMinIntervalMs: Number(options && options.autosaveArchiveMinIntervalMs) >= 0
        ? Number(options.autosaveArchiveMinIntervalMs)
        : 20000,
      persistUndoDepth: Number(options && options.persistUndoDepth) >= 0 ? Number(options.persistUndoDepth) : 8,
      persistRedoDepth: Number(options && options.persistRedoDepth) >= 0 ? Number(options.persistRedoDepth) : 2,
      autoRestoreOnLoad: options && Object.prototype.hasOwnProperty.call(options, 'autoRestoreOnLoad')
        ? !!options.autoRestoreOnLoad
        : true,
      autoRestoreMaxAgeMs: Number(options && options.autoRestoreMaxAgeMs) > 0
        ? Number(options.autoRestoreMaxAgeMs)
        : 1000 * 60 * 60 * 24 * 7
    };
  }

  function initProjectHistoryBridge(options) {
    if (window.__projectHistoryBridgeInitialized) return window.projectHistory;
    window.__projectHistoryBridgeInitialized = true;

    const config = normalizeOpts(options);
    const storeApi = pickStoreApi();
    const history = (typeof storeApi.createProjectHistoryStore === 'function')
      ? storeApi.createProjectHistoryStore(config.limit)
      : {
          limit: config.limit,
          undo: [],
          redo: [],
          current: null,
          currentHash: null,
          isApplying: false,
          debounceTimer: null,
          pendingApplyPromise: Promise.resolve(),
          lastAutosaveAt: 0,
          lastArchiveHash: null,
          lastArchiveAt: 0,
          autosaveTimer: null,
          autosaveEnabled: true,
          restoreInProgress: false
        };

    const updateButtons = () => {
      if (typeof window.updateProjectHistoryButtons === 'function') {
        window.updateProjectHistoryButtons(history);
      }
    };

    const buildEntry = (state, source) => {
      if (!state) return null;
      if (typeof storeApi.buildEntry === 'function') {
        return storeApi.buildEntry(state, { source });
      }
      try {
        const hash = JSON.stringify(state);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ts: Date.now(),
          source: source || 'snapshot',
          hash,
          data: state
        };
      } catch (_e) {
        return null;
      }
    };

    const trim = (arr, limit) => {
      if (typeof storeApi.trimToLimit === 'function') {
        return storeApi.trimToLimit(arr, limit);
      }
      if (!Array.isArray(arr)) return [];
      if (arr.length <= limit) return arr;
      return arr.slice(arr.length - limit);
    };

    async function persistAutosaveSoon() {
      if (!history.autosaveEnabled) return;
      if (history.autosaveTimer) clearTimeout(history.autosaveTimer);
      history.autosaveTimer = setTimeout(async () => {
        try {
          const payload = preparePersistPayload(history, config);
          if (!payload) return;

          if (typeof storeApi.savePersistent === 'function') {
            await storeApi.savePersistent(config.storeKey, payload);
          }
          const currentData = payload && payload.current ? payload.current.data : null;
          const currentHash = payload && payload.current ? payload.current.hash : null;
          const now = Date.now();
          const enoughTimePassed = (now - Number(history.lastArchiveAt || 0)) >= config.autosaveArchiveMinIntervalMs;
          const hashChanged = !!currentHash && currentHash !== history.lastArchiveHash;
          let shouldArchive = !!currentData;
          if (shouldArchive && typeof config.shouldArchiveStateFn === 'function') {
            try {
              shouldArchive = !!(await maybeCall(config.shouldArchiveStateFn, currentData, payload.current));
            } catch (_e) {
              shouldArchive = true;
            }
          }
          if (
            shouldArchive &&
            typeof storeApi.appendAutosaveEntry === 'function' &&
            (hashChanged || enoughTimePassed || !history.lastArchiveHash)
          ) {
            let identity = null;
            if (config.projectIdentityFn) {
              try {
                identity = await maybeCall(config.projectIdentityFn, currentData);
              } catch (_e) {
                identity = null;
              }
            }
            let thumb = '';
            if (config.previewFn) {
              try {
                thumb = String((await maybeCall(config.previewFn, currentData)) || '');
              } catch (_e) {
                thumb = '';
              }
            }
            await storeApi.appendAutosaveEntry(config.storeKey, {
              id: `${payload.savedAt || now}-${Math.random().toString(36).slice(2, 8)}`,
              savedAt: Number(payload.savedAt || now),
              hash: String(currentHash || ''),
              projectKey: String((identity && identity.projectKey) || config.storeKey),
              name: String((identity && identity.name) || (currentData && currentData.name) || '').trim(),
              layout: String((currentData && currentData.layout) || '').trim(),
              thumb,
              data: currentData
            }, config.autosaveArchiveLimit);
            history.lastArchiveHash = currentHash || history.lastArchiveHash;
            history.lastArchiveAt = now;
          }
          history.lastAutosaveAt = Date.now();
        } catch (_e) {}
      }, config.autosaveDebounceMs);
    }

    async function applyStateEntry(entry, reason) {
      if (!entry || typeof config.applyFn !== 'function') return;

      history.pendingApplyPromise = history.pendingApplyPromise.then(async () => {
        history.isApplying = true;
        updateButtons();
        try {
          await maybeCall(config.applyFn, entry.data, { silent: true, source: reason || 'history' });
          history.current = entry;
          history.currentHash = entry.hash || null;
          return true;
        } catch (_e) {
          if (typeof window.showHistoryInfo === 'function') {
            window.showHistoryInfo('Nie udało się zastosować kroku historii.', 'error');
          }
          return false;
        } finally {
          history.isApplying = false;
          updateButtons();
        }
      });

      return await history.pendingApplyPromise;
    }

    async function snapshotNow(source, force) {
      try {
        if (window.__projectLoadInProgress) return;
        if (history.isApplying || history.restoreInProgress) return;
        const state = await maybeCall(config.snapshotFn);
        const entry = buildEntry(state, source || 'change');
        if (!entry) return;

        if (!force && history.currentHash && entry.hash === history.currentHash) return;

        if (history.current) {
          history.undo.push(history.current);
          history.undo = trim(history.undo, history.limit);
        }

        history.current = entry;
        history.currentHash = entry.hash;
        history.redo = [];
        updateButtons();
        await persistAutosaveSoon();
      } catch (_e) {}
    }

    function scheduleSnapshot(source) {
      if (window.__projectLoadInProgress) return;
      if (history.isApplying || history.restoreInProgress) return;
      if (history.debounceTimer) clearTimeout(history.debounceTimer);
      history.debounceTimer = setTimeout(() => {
        if (window.__projectLoadInProgress) return;
        snapshotNow(source || 'event', false);
      }, config.debounceMs);
    }

    async function resetHistory(state, meta) {
      if (history.debounceTimer) {
        clearTimeout(history.debounceTimer);
        history.debounceTimer = null;
      }

      history.undo = [];
      history.redo = [];

      let entry = null;
      if (state) {
        entry = buildEntry(state, meta && meta.source ? meta.source : 'reset');
      }
      if (!entry) {
        const snap = await maybeCall(config.snapshotFn);
        entry = buildEntry(snap, 'reset');
      }

      history.current = entry;
      history.currentHash = entry ? entry.hash : null;
      history.lastArchiveHash = null;
      history.lastArchiveAt = 0;
      updateButtons();
      if (!entry) {
        await clearAutosave();
        return;
      }
      await persistAutosaveSoon();
    }

    async function undo() {
      if (!history.undo.length || history.isApplying || history.restoreInProgress) return;
      const prev = history.undo[history.undo.length - 1];
      const currentBefore = history.current;
      const ok = await applyStateEntry(prev, 'undo');
      if (!ok) return;
      history.undo.pop();
      if (currentBefore) {
        history.redo.push(currentBefore);
        history.redo = trim(history.redo, history.limit);
      }
      updateButtons();
      await persistAutosaveSoon();
    }

    async function redo() {
      if (!history.redo.length || history.isApplying || history.restoreInProgress) return;
      const next = history.redo[history.redo.length - 1];
      const currentBefore = history.current;
      const ok = await applyStateEntry(next, 'redo');
      if (!ok) return;
      history.redo.pop();
      if (currentBefore) {
        history.undo.push(currentBefore);
        history.undo = trim(history.undo, history.limit);
      }
      updateButtons();
      await persistAutosaveSoon();
    }

    async function clearAutosave() {
      if (typeof storeApi.clearPersistent === 'function') {
        await storeApi.clearPersistent(config.storeKey);
      }
      if (typeof storeApi.clearAutosaveEntries === 'function') {
        await storeApi.clearAutosaveEntries(config.storeKey);
      }
    }

    async function restoreFromAutosave(_optionsOverride) {
      if (history.restoreInProgress) return false;
      if (typeof storeApi.loadPersistent !== 'function') return false;

      history.restoreInProgress = true;
      try {
        const payload = await storeApi.loadPersistent(config.storeKey);
        if (!isMeaningfulPayload(payload)) return false;

        const ageMs = Date.now() - Number(payload.savedAt || 0);
        if (Number.isFinite(ageMs) && ageMs > config.autoRestoreMaxAgeMs) return false;

        const ok = await waitForProjectLoadFunction(6000);
        if (!ok) return false;
        const restoredCurrent = payload.current;
        if (!restoredCurrent || !restoredCurrent.data) return false;

        await applyStateEntry(restoredCurrent, 'restore');

        history.undo = Array.isArray(payload.undo) ? payload.undo.slice(-history.limit) : [];
        history.redo = Array.isArray(payload.redo) ? payload.redo.slice(-history.limit) : [];
        history.current = restoredCurrent;
        history.currentHash = restoredCurrent.hash || null;
        updateButtons();

        if (typeof window.showHistoryInfo === 'function') {
          window.showHistoryInfo('Przywrócono ostatni autosave projektu.', 'success');
        }

        await persistAutosaveSoon();
        return true;
      } catch (_e) {
        if (typeof window.showHistoryInfo === 'function') {
          window.showHistoryInfo('Nie udało się przywrócić autosave.', 'error');
        }
        return false;
      } finally {
        history.restoreInProgress = false;
      }
    }

    window.projectHistory = history;
    window.undoProject = undo;
    window.redoProject = redo;
    window.resetProjectHistory = resetHistory;
    window.restoreProjectAutosave = restoreFromAutosave;
    window.clearProjectAutosave = clearAutosave;
    window.captureProjectSnapshot = () => snapshotNow('manual', true);

    window.addEventListener(config.eventName, (event) => {
      if (window.__projectLoadInProgress) return;
      const detail = event ? event.detail : null;
      const meta = detail && typeof detail === 'object' ? detail : null;
      const source = String((meta && meta.historySource) || 'canvasModified');
      const historyMode = String((meta && meta.historyMode) || '').toLowerCase();

      if (historyMode === 'immediate') {
        if (history.debounceTimer) {
          clearTimeout(history.debounceTimer);
          history.debounceTimer = null;
        }
        snapshotNow(source, false);
        return;
      }

      scheduleSnapshot(source);
    });

    window.addEventListener('beforeunload', () => {
      const payload = preparePersistPayload(history, config);
      if (!payload) return;
      if (typeof storeApi.savePersistent === 'function') {
        storeApi.savePersistent(config.storeKey, payload);
      }
      if (typeof storeApi.savePersistentSyncFallback === 'function') {
        storeApi.savePersistentSyncFallback(config.storeKey, payload);
      }
    });

    window.addEventListener('load', () => {
      setTimeout(() => {
        if (!history.current) {
          snapshotNow('initial', true);
        }
      }, 0);

      if (config.autoRestoreOnLoad) {
        setTimeout(() => {
          restoreFromAutosave();
        }, 250);
      }
    });

    updateButtons();
    return history;
  }

  window.initProjectHistoryBridge = initProjectHistoryBridge;
})();

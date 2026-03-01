(function() {
  const UNSAVED_SESSION_STORAGE_KEY = 'wf_active_unsaved_project_id_v1';

  function makeSessionId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function ensureUnsavedProjectId(forceNew) {
    try {
      if (forceNew) {
        const next = makeSessionId();
        sessionStorage.setItem(UNSAVED_SESSION_STORAGE_KEY, next);
        return next;
      }
      let existing = sessionStorage.getItem(UNSAVED_SESSION_STORAGE_KEY);
      if (!existing) {
        existing = makeSessionId();
        sessionStorage.setItem(UNSAVED_SESSION_STORAGE_KEY, existing);
      }
      return existing;
    } catch (_e) {
      return makeSessionId();
    }
  }

  function getProjectIdentity(data) {
    const meta = window.currentProjectMeta || null;
    const hasSavedProjectPath = !!(meta && typeof meta.path === 'string' && meta.path.trim());
    if (hasSavedProjectPath) {
      const savedName = String(
        (meta && meta.name) ||
        (window.currentProjectName && window.currentProjectName !== 'Katalog produktów' ? window.currentProjectName : '') ||
        (data && data.name) ||
        ''
      ).trim();
      return {
        projectKey: `saved:${meta.path}`,
        name: savedName
      };
    }
    const unsavedId = ensureUnsavedProjectId(false);
    const unsavedName = String(
      (window.currentProjectName && window.currentProjectName !== 'Katalog produktów' ? window.currentProjectName : '') ||
      (data && data.name) ||
      'Projekt bez nazwy'
    ).trim();
    return {
      projectKey: `unsaved:${unsavedId}`,
      name: unsavedName
    };
  }

  window.getProjectIdentityForAutosave = function getProjectIdentityForAutosave(data) {
    return getProjectIdentity(data);
  };

  window.resetUnsavedProjectSession = function resetUnsavedProjectSession(forceNew) {
    return ensureUnsavedProjectId(forceNew !== false);
  };

  async function snapshotProject() {
    if (typeof window.collectProjectData !== 'function') return null;
    const data = window.collectProjectData();
    if (!data || !Array.isArray(data.pages) || data.pages.length === 0) return null;
    const hasRealContent = data.pages.some((p) =>
      Array.isArray(p && p.objects) &&
      p.objects.some((obj) => obj && obj.type && obj.type !== 'background')
    );
    if (!hasRealContent) return null;
    return data;
  }

  async function applyProjectState(state, opts) {
    if (!state || typeof window.loadProjectFromData !== 'function') return;
    await window.loadProjectFromData(state, {
      silent: true,
      source: (opts && opts.source) || 'history'
    });
  }

  function captureAutosavePreview() {
    try {
      const pages = Array.isArray(window.pages) ? window.pages : [];
      const firstPage = pages[0];
      const stage = firstPage && firstPage.stage;
      if (!stage || typeof stage.toDataURL !== 'function') return '';
      return stage.toDataURL({
        pixelRatio: 0.35,
        mimeType: 'image/jpeg',
        quality: 0.72
      }) || '';
    } catch (_e) {
      return '';
    }
  }

  function initWhenReady() {
    if (typeof window.initProjectHistoryBridge !== 'function') {
      setTimeout(initWhenReady, 60);
      return;
    }

    ensureUnsavedProjectId(false);

    const storeKey = 'main-catalog-project-v2';
    window.PROJECT_AUTOSAVE_STORE_KEY = storeKey;

    window.initProjectHistoryBridge({
      limit: 40,
      eventName: 'canvasModified',
      debounceMs: 220,
      snapshotFn: snapshotProject,
      applyFn: applyProjectState,
      previewFn: captureAutosavePreview,
      projectIdentityFn: getProjectIdentity,
      storeKey,
      autosaveDebounceMs: 1200,
      autosaveArchiveLimit: 40,
      autosaveArchiveMinIntervalMs: 12000,
      persistUndoDepth: 10,
      persistRedoDepth: 3,
      autoRestoreOnLoad: true,
      autoRestoreMaxAgeMs: 1000 * 60 * 60 * 24 * 7
    });
  }

  initWhenReady();
})();

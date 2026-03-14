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

  function hasMeaningfulProjectContent(data) {
    if (!data || !Array.isArray(data.pages) || data.pages.length === 0) return false;
    return data.pages.some((p) =>
      Array.isArray(p && p.objects) &&
      p.objects.some((obj) => obj && obj.type && obj.type !== 'background')
    );
  }

  async function snapshotProject() {
    if (typeof window.collectProjectData !== 'function') return null;
    const data = window.collectProjectData();
    if (!data || !Array.isArray(data.pages) || data.pages.length === 0) return null;
    compactProjectDataForHistoryInPlace(data);
    return data;
  }

  function isLargeDataUrl(src) {
    const text = String(src || '').trim();
    return /^data:/i.test(text) && text.length > 160000;
  }

  function compactDirectNodePayloadInPlace(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (payload.type === 'imageNode') {
      const attrs = payload.attrs && typeof payload.attrs === 'object' ? payload.attrs : null;
      const src = String(payload.src || '').trim();
      const editorSrc = String((attrs && attrs.editorSrc) || '').trim();
      const thumbSrc = String((attrs && attrs.thumbSrc) || '').trim();

      if (isLargeDataUrl(src)) {
        payload.src = editorSrc || thumbSrc || src;
      }
      if (attrs && isLargeDataUrl(attrs.thumbSrc) && editorSrc) {
        attrs.thumbSrc = editorSrc;
      }
      return;
    }

    if (Array.isArray(payload.children)) {
      payload.children.forEach((child) => compactDirectNodePayloadInPlace(child));
    }
  }

  function compactProjectDataForHistoryInPlace(data) {
    if (!data || !Array.isArray(data.pages)) return data;
    data.pages.forEach((page) => {
      const objects = Array.isArray(page && page.objects) ? page.objects : [];
      objects.forEach((obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.type === 'image') {
          const src = String(obj.src || '').trim();
          const editorSrc = String(obj.editorSrc || '').trim();
          const thumbSrc = String(obj.thumbSrc || '').trim();
          if (isLargeDataUrl(src)) {
            obj.src = editorSrc || thumbSrc || src;
          }
          if (isLargeDataUrl(obj.thumbSrc) && editorSrc) {
            obj.thumbSrc = editorSrc;
          }
          return;
        }
        if ((obj.type === 'directGroup' || obj.type === 'directNode' || obj.type === 'genericGroup') && obj.data) {
          compactDirectNodePayloadInPlace(obj.data);
        }
      });
    });
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
      limit: 14,
      eventName: 'canvasModified',
      debounceMs: 900,
      snapshotFn: snapshotProject,
      applyFn: applyProjectState,
      shouldArchiveStateFn: hasMeaningfulProjectContent,
      previewFn: captureAutosavePreview,
      projectIdentityFn: getProjectIdentity,
      storeKey,
      autosaveDebounceMs: 4800,
      autosaveArchiveLimit: 14,
      autosaveArchiveMinIntervalMs: 30000,
      persistUndoDepth: 3,
      persistRedoDepth: 1,
      autoRestoreOnLoad: false,
      autoRestoreMaxAgeMs: 1000 * 60 * 60 * 24 * 7
    });
  }

  initWhenReady();
})();

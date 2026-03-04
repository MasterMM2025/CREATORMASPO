(function() {
  const FALLBACK_PREFIX = 'wf_project_autosave_v2';
  const DB_NAME = 'wf_project_autosave_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'snapshots';
  const HASH_LONG_STRING_LIMIT = 1400;

  function hashString(input) {
    let h = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(16);
  }

  function safeStringify(value, replacer) {
    try {
      return JSON.stringify(value, replacer);
    } catch (_e) {
      return null;
    }
  }

  function hashStringReplacer(_key, val) {
    if (typeof val !== 'string') return val;
    const raw = String(val || '');
    if (raw.length <= HASH_LONG_STRING_LIMIT) return raw;
    const head = raw.slice(0, 96);
    const tail = raw.slice(-48);
    return `__WF_LONG_STR__:${raw.length}:${head}:${tail}`;
  }

  function normalizeKey(key) {
    const trimmed = String(key || '').trim();
    return trimmed || 'default';
  }

  function computeStateHash(state) {
    const raw = safeStringify(state, hashStringReplacer);
    if (!raw) return null;
    return `${hashString(raw)}:${raw.length}`;
  }

  function buildEntry(state, meta) {
    const hash = computeStateHash(state);
    if (!hash) return null;
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      source: String(meta && meta.source ? meta.source : 'snapshot'),
      hash,
      data: state
    };
  }

  function trimToLimit(list, limit) {
    if (!Array.isArray(list)) return [];
    const hardLimit = Math.max(1, Number(limit) || 30);
    if (list.length <= hardLimit) return list;
    return list.slice(list.length - hardLimit);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    });
  }

  async function idbSet(key, payload) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ key, payload, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
    });
    db.close();
  }

  async function idbGet(key) {
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.payload : null);
      req.onerror = () => reject(req.error || new Error('IndexedDB read failed'));
    });
    db.close();
    return result;
  }

  async function idbDelete(key) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
    });
    db.close();
  }

  function fallbackSet(key, payload) {
    localStorage.setItem(`${FALLBACK_PREFIX}:${key}`, JSON.stringify(payload));
  }

  function fallbackGet(key) {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  function fallbackDelete(key) {
    localStorage.removeItem(`${FALLBACK_PREFIX}:${key}`);
  }

  async function savePersistent(key, payload) {
    const normalizedKey = normalizeKey(key);
    try {
      await idbSet(normalizedKey, payload);
      return true;
    } catch (_e) {
      try {
        fallbackSet(normalizedKey, payload);
        return true;
      } catch (__e) {
        return false;
      }
    }
  }

  async function loadPersistent(key) {
    const normalizedKey = normalizeKey(key);
    let idbValue = null;
    try {
      idbValue = await idbGet(normalizedKey);
    } catch (_e) {}

    try {
      const fallbackValue = fallbackGet(normalizedKey);
      if (idbValue && fallbackValue) {
        const idbTs = Number(idbValue.savedAt || idbValue.updatedAt || 0);
        const fallbackTs = Number(fallbackValue.savedAt || fallbackValue.updatedAt || 0);
        return fallbackTs > idbTs ? fallbackValue : idbValue;
      }
      return idbValue || fallbackValue || null;
    } catch (_e) {
      return idbValue || null;
    }
  }

  async function clearPersistent(key) {
    const normalizedKey = normalizeKey(key);
    try { await idbDelete(normalizedKey); } catch (_e) {}
    try { fallbackDelete(normalizedKey); } catch (_e) {}
  }

  function savePersistentSyncFallback(key, payload) {
    const normalizedKey = normalizeKey(key);
    try {
      fallbackSet(normalizedKey, payload);
      return true;
    } catch (_e) {
      return false;
    }
  }

  function makeAutosaveEntriesKey(key) {
    return `${normalizeKey(key)}::entries`;
  }

  function normalizeAutosaveEntry(entry) {
    if (!entry || !entry.data) return null;
    const savedAt = Number(entry.savedAt || Date.now());
    const hash = String(entry.hash || '');
    const projectKey = String(entry.projectKey || '').trim();
    return {
      id: String(entry.id || `${savedAt}-${Math.random().toString(36).slice(2, 8)}`),
      savedAt: Number.isFinite(savedAt) ? savedAt : Date.now(),
      hash,
      projectKey,
      name: String(entry.name || '').trim(),
      layout: String(entry.layout || '').trim(),
      thumb: typeof entry.thumb === 'string' ? entry.thumb : '',
      data: entry.data
    };
  }

  async function listAutosaveEntries(key) {
    const entriesKey = makeAutosaveEntriesKey(key);
    try {
      const payload = await loadPersistent(entriesKey);
      const items = Array.isArray(payload && payload.items) ? payload.items : [];
      return items
        .map(normalizeAutosaveEntry)
        .filter(Boolean)
        .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
    } catch (_e) {
      return [];
    }
  }

  async function appendAutosaveEntry(key, entry, limit) {
    const normalized = normalizeAutosaveEntry(entry);
    if (!normalized) return false;
    const entriesKey = makeAutosaveEntriesKey(key);
    const hardLimit = Math.max(1, Number(limit) || 20);
    try {
      const payload = await loadPersistent(entriesKey);
      const items = Array.isArray(payload && payload.items) ? payload.items : [];
      let preservedId = normalized.id;
      if (normalized.projectKey) {
        const existingForProject = items.find((it) => String((it && it.projectKey) || '') === normalized.projectKey);
        if (existingForProject && existingForProject.id) {
          preservedId = String(existingForProject.id);
        }
      }
      normalized.id = preservedId;
      const filtered = items.filter((it) => {
        if (!it) return false;
        if (String(it.id || '') === normalized.id) return false;
        if (normalized.projectKey && String(it.projectKey || '') === normalized.projectKey) return false;
        return true;
      });
      filtered.push(normalized);
      filtered.sort((a, b) => Number(a.savedAt || 0) - Number(b.savedAt || 0));
      const trimmed = filtered.slice(-hardLimit);
      await savePersistent(entriesKey, {
        version: 1,
        updatedAt: Date.now(),
        items: trimmed
      });
      return true;
    } catch (_e) {
      return false;
    }
  }

  async function getAutosaveEntryById(key, entryId) {
    const id = String(entryId || '').trim();
    if (!id) return null;
    const list = await listAutosaveEntries(key);
    return list.find((entry) => entry.id === id) || null;
  }

  async function deleteAutosaveEntry(key, entryId) {
    const id = String(entryId || '').trim();
    if (!id) return false;
    const entriesKey = makeAutosaveEntriesKey(key);
    try {
      const payload = await loadPersistent(entriesKey);
      const items = Array.isArray(payload && payload.items) ? payload.items : [];
      const filtered = items.filter((it) => String((it && it.id) || '') !== id);
      await savePersistent(entriesKey, {
        version: 1,
        updatedAt: Date.now(),
        items: filtered
      });
      return true;
    } catch (_e) {
      return false;
    }
  }

  async function clearAutosaveEntries(key) {
    const entriesKey = makeAutosaveEntriesKey(key);
    await clearPersistent(entriesKey);
  }

  function createProjectHistoryStore(limit) {
    return {
      limit: Number(limit) > 0 ? Number(limit) : 30,
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
  }

  window.ProjectHistoryStore = {
    createProjectHistoryStore,
    buildEntry,
    computeStateHash,
    trimToLimit,
    savePersistent,
    savePersistentSyncFallback,
    loadPersistent,
    clearPersistent,
    listAutosaveEntries,
    appendAutosaveEntry,
    getAutosaveEntryById,
    deleteAutosaveEntry,
    clearAutosaveEntries
  };

  window.createProjectHistoryStore = createProjectHistoryStore;
})();

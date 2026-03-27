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

  function cloneJson(value, fallback = null) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_e) {
      return fallback;
    }
  }

  function computeComparableStateHash(state) {
    if (!state) return '';
    try {
      if (window.ProjectHistoryStore && typeof window.ProjectHistoryStore.computeStateHash === 'function') {
        return String(window.ProjectHistoryStore.computeStateHash(state) || '');
      }
      return JSON.stringify(state) || '';
    } catch (_e) {
      return '';
    }
  }

  function isBannerHistorySource(source) {
    const normalized = String(source || '').trim().toLowerCase();
    return !!(
      normalized === 'banner-transform' ||
      normalized === 'banner-import' ||
      normalized === 'banner-remove' ||
      normalized === 'page-edit-banner-apply' ||
      normalized === 'page-edit-banner-remove' ||
      normalized === 'page-settings-banner'
    );
  }

  function isGeometryHistorySource(source) {
    const normalized = String(source || '').trim().toLowerCase();
    return !!(
      normalized === 'transform' ||
      normalized === 'nudge' ||
      normalized === 'banner-transform' ||
      normalized === 'align'
    );
  }

  function isBannerObject(obj) {
    return !!(
      obj &&
      obj.type === 'image' &&
      (obj.isCatalogBanner || obj.name === 'banner')
    );
  }

  function getBannerObjectFromPage(page) {
    const objects = Array.isArray(page && page.objects) ? page.objects : [];
    return objects.find((obj) => isBannerObject(obj)) || null;
  }

  function sanitizeStateWithoutBanner(state) {
    const cloned = cloneJson(state, null);
    if (!cloned || !Array.isArray(cloned.pages)) return null;

    cloned.pages.forEach((page) => {
      if (!page || typeof page !== 'object') return;
      if (page.settings && typeof page.settings === 'object') {
        delete page.settings.bannerUrl;
        delete page.settings.bannerEditorSrc;
        delete page.settings.bannerThumbSrc;
        delete page.settings.bannerState;
      }
      if (Array.isArray(page.objects)) {
        page.objects = page.objects.filter((obj) => !isBannerObject(obj));
      }
    });

    return cloned;
  }

  const GEOMETRY_KEYS = new Set([
    'x', 'y', 'width', 'height', 'scaleX', 'scaleY', 'rotation',
    'radius', 'points', 'crop', 'opacity', 'visible',
    'shadowOffsetX', 'shadowOffsetY'
  ]);

  function stripGeometryFromDirectPayloadInPlace(payload) {
    if (!payload || typeof payload !== 'object') return;
    Object.keys(payload).forEach((key) => {
      if (GEOMETRY_KEYS.has(key)) {
        delete payload[key];
      }
    });
    if (payload.attrs && typeof payload.attrs === 'object') {
      delete payload.attrs.x;
      delete payload.attrs.y;
      delete payload.attrs.width;
      delete payload.attrs.height;
      delete payload.attrs.scaleX;
      delete payload.attrs.scaleY;
      delete payload.attrs.rotation;
    }
    if (Array.isArray(payload.children)) {
      payload.children.forEach((child) => stripGeometryFromDirectPayloadInPlace(child));
    }
  }

  function sanitizeStateForGeometryTransition(state) {
    const cloned = cloneJson(state, null);
    if (!cloned || !Array.isArray(cloned.pages)) return null;

    cloned.pages.forEach((page) => {
      if (!page || typeof page !== 'object') return;
      if (page.settings && typeof page.settings === 'object') {
        delete page.settings.bannerState;
      }
      const objects = Array.isArray(page.objects) ? page.objects : [];
      objects.forEach((obj) => {
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach((key) => {
          if (GEOMETRY_KEYS.has(key)) {
            delete obj[key];
          }
        });
        if (obj.data) {
          stripGeometryFromDirectPayloadInPlace(obj.data);
        }
      });
    });

    return cloned;
  }

  function isMeaningfulLiveNodeForHistory(node) {
    if (!node || !window.Konva) return false;
    const nodeName = typeof node.name === 'function' ? String(node.name() || '') : '';
    const isHelperNode = !!(node.getAttr && (
      nodeName === 'selectionOutline' ||
      nodeName === 'selectionRect' ||
      node.getAttr('isBgBlur') ||
      node.getAttr('isFxHelper') ||
      node.getAttr('isPriceHitArea')
    ));
    if (isHelperNode) return false;
    if (node instanceof Konva.Label) return false;
    return true;
  }

  function getSavableLiveNodesForPage(page) {
    const layer = page && page.layer;
    if (!layer || typeof layer.getChildren !== 'function') return [];
    const children = typeof layer.getChildren().toArray === 'function'
      ? layer.getChildren().toArray()
      : Array.from(layer.getChildren() || []);
    return children.filter((node) => isMeaningfulLiveNodeForHistory(node));
  }

  function getLiveNodeComparableKey(node) {
    if (!node || !window.Konva) return '';
    const nodeName = typeof node.name === 'function' ? String(node.name() || '') : '';
    const slotIndex = node.getAttr ? node.getAttr('slotIndex') ?? '' : '';
    const directModuleId = node.getAttr ? String(node.getAttr('directModuleId') || '') : '';
    const directPayloadType = node.getAttr ? String(node.getAttr('directPayloadType') || '') : '';
    const isUserGroup = !!(node.getAttr && node.getAttr('isUserGroup'));
    const src = String(
      (typeof window.getNodeImageSource === 'function'
        ? (
            window.getNodeImageSource(node, 'original') ||
            window.getNodeImageSource(node, 'editor') ||
            window.getNodeImageSource(node, 'thumb')
          )
        : (
            node.getAttr &&
            (node.getAttr('originalSrc') || node.getAttr('editorSrc') || node.getAttr('thumbSrc'))
          )) ||
      ''
    ).trim();

    if (node instanceof Konva.Text) {
      return [
        'text',
        nodeName,
        slotIndex,
        node.getAttr && node.getAttr('isName') ? 'name' : '',
        node.getAttr && node.getAttr('isPrice') ? 'price' : '',
        node.getAttr && node.getAttr('isIndex') ? 'index' : '',
        typeof node.text === 'function' ? node.text() : ''
      ].join('|');
    }

    if (node instanceof Konva.Image) {
      if (node.getAttr && node.getAttr('isBarcode')) {
        return ['barcode', slotIndex, String(node.getAttr('barcodeOriginalSrc') || src || '')].join('|');
      }
      return [
        'image',
        nodeName,
        slotIndex,
        node.getAttr && node.getAttr('isProductImage') ? 'product' : '',
        node.getAttr && node.getAttr('isUserImage') ? 'user' : '',
        node.getAttr && node.getAttr('isSidebarImage') ? 'sidebar' : '',
        node.getAttr && (node.getAttr('isCatalogBanner') || nodeName === 'banner') ? 'banner' : '',
        src
      ].join('|');
    }

    if (node instanceof Konva.Rect) {
      if (node.getAttr && node.getAttr('isPageBg')) return 'background';
      return [
        'box',
        slotIndex,
        nodeName,
        typeof node.fill === 'function' ? node.fill() : '',
        typeof node.stroke === 'function' ? node.stroke() : ''
      ].join('|');
    }

    if (node instanceof Konva.Group) {
      if (node.getAttr && node.getAttr('isPriceGroup')) {
        return ['priceGroup', slotIndex, nodeName || 'priceGroup'].join('|');
      }
      if (directModuleId || directPayloadType || isUserGroup) {
        return [
          directPayloadType || 'group',
          nodeName,
          directModuleId,
          slotIndex,
          isUserGroup ? 'userGroup' : ''
        ].join('|');
      }
      return ['group', nodeName, slotIndex, isUserGroup ? 'userGroup' : ''].join('|');
    }

    return [
      node.className || '',
      nodeName,
      slotIndex,
      directModuleId
    ].join('|');
  }

  function getSavedObjectComparableKey(obj) {
    if (!obj || typeof obj !== 'object') return '';
    const type = String(obj.type || '').trim();
    if (type === 'background') return 'background';
    if (type === 'text') {
      return [
        'text',
        obj.name || '',
        obj.slotIndex ?? '',
        obj.isName ? 'name' : '',
        obj.isPrice ? 'price' : '',
        obj.isIndex ? 'index' : '',
        obj.text || ''
      ].join('|');
    }
    if (type === 'image') {
      return [
        'image',
        obj.name || '',
        obj.slotIndex ?? '',
        obj.isProductImage ? 'product' : '',
        obj.isUserImage ? 'user' : '',
        obj.isSidebarImage ? 'sidebar' : '',
        obj.isCatalogBanner ? 'banner' : '',
        obj.src || obj.editorSrc || obj.thumbSrc || ''
      ].join('|');
    }
    if (type === 'barcode') {
      return ['barcode', obj.slotIndex ?? '', obj.original || ''].join('|');
    }
    if (type === 'box') {
      return ['box', obj.slotIndex ?? '', obj.name || '', obj.fill || '', obj.stroke || ''].join('|');
    }
    if (type === 'priceGroup') {
      return ['priceGroup', obj.slotIndex ?? '', obj.name || ''].join('|');
    }
    if ((type === 'directGroup' || type === 'directNode' || type === 'genericGroup') && obj.data) {
      const data = obj.data || {};
      const attrs = data.attrs && typeof data.attrs === 'object' ? data.attrs : {};
      return [
        type,
        data.type || '',
        data.name || '',
        attrs.directModuleId || '',
        attrs.slotIndex ?? '',
        attrs.isUserGroup ? 'userGroup' : ''
      ].join('|');
    }
    return type;
  }

  function nodeMatchesSavedObject(obj, node) {
    if (!obj || !node || !window.Konva) return false;
    switch (obj.type) {
      case 'background':
        return !!(node.getAttr && node.getAttr('isPageBg'));
      case 'text':
        return node instanceof Konva.Text;
      case 'image':
      case 'barcode':
        return node instanceof Konva.Image;
      case 'box':
        return node instanceof Konva.Rect;
      case 'priceGroup':
      case 'directGroup':
      case 'genericGroup':
        return node instanceof Konva.Group;
      case 'directNode':
        return true;
      default:
        return true;
    }
  }

  function applyCommonGeometry(node, snapshot) {
    if (!node || !snapshot) return;
    if (typeof node.x === 'function' && Number.isFinite(Number(snapshot.x))) node.x(Number(snapshot.x));
    if (typeof node.y === 'function' && Number.isFinite(Number(snapshot.y))) node.y(Number(snapshot.y));
    if (typeof node.scaleX === 'function' && Number.isFinite(Number(snapshot.scaleX))) node.scaleX(Number(snapshot.scaleX));
    if (typeof node.scaleY === 'function' && Number.isFinite(Number(snapshot.scaleY))) node.scaleY(Number(snapshot.scaleY));
    if (typeof node.rotation === 'function' && Number.isFinite(Number(snapshot.rotation))) node.rotation(Number(snapshot.rotation));
    if (typeof node.opacity === 'function' && Object.prototype.hasOwnProperty.call(snapshot, 'opacity')) {
      node.opacity(snapshot.opacity ?? 1);
    }
    if (typeof node.visible === 'function' && Object.prototype.hasOwnProperty.call(snapshot, 'visible')) {
      node.visible(snapshot.visible !== false);
    }
  }

  function applyDirectPayloadGeometry(node, payload) {
    if (!node || !payload) return;
    applyCommonGeometry(node, payload);
    if (typeof node.width === 'function' && Number.isFinite(Number(payload.width))) node.width(Number(payload.width));
    if (typeof node.height === 'function' && Number.isFinite(Number(payload.height))) node.height(Number(payload.height));
    if (typeof node.radius === 'function' && Number.isFinite(Number(payload.radius))) node.radius(Number(payload.radius));
    if (typeof node.points === 'function' && Array.isArray(payload.points)) node.points(payload.points.slice());
    if (typeof node.crop === 'function' && payload.crop && typeof payload.crop === 'object') {
      node.crop(payload.crop);
    }
    if (node instanceof Konva.Group && Array.isArray(payload.children) && typeof node.getChildren === 'function') {
      const children = typeof node.getChildren().toArray === 'function'
        ? node.getChildren().toArray()
        : Array.from(node.getChildren() || []);
      if (children.length === payload.children.length) {
        payload.children.forEach((childPayload, index) => {
          applyDirectPayloadGeometry(children[index], childPayload);
        });
      }
    }
  }

  function applySavedObjectToLiveNode(obj, node, page) {
    if (!obj || !node) return;
    switch (obj.type) {
      case 'background':
        if (typeof node.fill === 'function' && obj.fill != null) node.fill(obj.fill);
        if (typeof node.opacity === 'function') node.opacity(obj.opacity ?? 1);
        break;
      case 'text':
        applyCommonGeometry(node, obj);
        if (typeof node.width === 'function' && Number.isFinite(Number(obj.width))) node.width(Number(obj.width));
        if (typeof node.height === 'function' && Number.isFinite(Number(obj.height))) node.height(Number(obj.height));
        break;
      case 'image':
        if (obj.isCatalogBanner && typeof window.bindCatalogBannerNode === 'function') {
          window.bindCatalogBannerNode(page, node, {
            state: {
              x: Number(obj.x) || 0,
              y: Number(obj.y) || 0,
              scaleX: Number(obj.scaleX) || 1,
              scaleY: Number(obj.scaleY) || 1,
              rotation: Number(obj.rotation) || 0,
              width: Math.max(1, Number(obj.width) || 1),
              height: Math.max(1, Number(obj.height) || 1)
            },
            sourceWidth: Math.max(1, Number(obj.width) || 1),
            sourceHeight: Math.max(1, Number(obj.height) || 1),
            bannerUrl: String(obj.src || obj.editorSrc || obj.thumbSrc || '').trim(),
            originalSrc: String(obj.src || obj.editorSrc || obj.thumbSrc || '').trim(),
            editorSrc: String(obj.editorSrc || obj.src || obj.thumbSrc || '').trim(),
            thumbSrc: String(obj.thumbSrc || obj.editorSrc || obj.src || '').trim()
          });
          break;
        }
        applyCommonGeometry(node, obj);
        if (typeof node.width === 'function' && Number.isFinite(Number(obj.width))) node.width(Number(obj.width));
        if (typeof node.height === 'function' && Number.isFinite(Number(obj.height))) node.height(Number(obj.height));
        if (typeof node.crop === 'function' && obj.crop && typeof obj.crop === 'object') node.crop(obj.crop);
        break;
      case 'barcode':
        applyCommonGeometry(node, obj);
        break;
      case 'box':
        applyCommonGeometry(node, obj);
        if (typeof node.width === 'function' && Number.isFinite(Number(obj.width))) node.width(Number(obj.width));
        if (typeof node.height === 'function' && Number.isFinite(Number(obj.height))) node.height(Number(obj.height));
        break;
      case 'priceGroup':
        applyCommonGeometry(node, obj);
        break;
      case 'directGroup':
      case 'directNode':
      case 'genericGroup':
        if (obj.data) applyDirectPayloadGeometry(node, obj.data);
        break;
      default:
        break;
    }
  }

  function buildQueuedKeyMap(items, keyFn) {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach((item, index) => {
      const key = String(keyFn(item, index) || '').trim();
      const queue = map.get(key) || [];
      queue.push(item);
      map.set(key, queue);
    });
    return map;
  }

  function compareQueuedKeyMaps(left, right) {
    if (left.size !== right.size) return false;
    for (const [key, leftQueue] of left.entries()) {
      const rightQueue = right.get(key);
      if (!rightQueue || rightQueue.length !== leftQueue.length) return false;
    }
    return true;
  }

  async function applyGeometryOnlyTransition(fromState, toState) {
    if (!fromState || !toState) return false;
    const livePages = Array.isArray(window.pages) ? window.pages : [];
    const fromPages = Array.isArray(fromState.pages) ? fromState.pages : [];
    const toPages = Array.isArray(toState.pages) ? toState.pages : [];
    if (!livePages.length || livePages.length !== toPages.length || fromPages.length !== toPages.length) {
      return false;
    }

    const touchedPages = [];
    for (let pageIndex = 0; pageIndex < toPages.length; pageIndex += 1) {
      const livePage = livePages[pageIndex];
      const fromPage = fromPages[pageIndex] || {};
      const toPage = toPages[pageIndex] || {};
      const liveNodes = getSavableLiveNodesForPage(livePage);
      const fromObjects = Array.isArray(fromPage.objects) ? fromPage.objects : [];
      const toObjects = Array.isArray(toPage.objects) ? toPage.objects : [];
      if (fromObjects.length !== toObjects.length) {
        return false;
      }
      const fromObjectKeyMap = buildQueuedKeyMap(fromObjects, (obj) => getSavedObjectComparableKey(obj));
      const toObjectKeyMap = buildQueuedKeyMap(toObjects, (obj) => getSavedObjectComparableKey(obj));
      const liveNodeKeyMap = buildQueuedKeyMap(liveNodes, (node) => getLiveNodeComparableKey(node));
      if (!compareQueuedKeyMaps(fromObjectKeyMap, toObjectKeyMap)) {
        return false;
      }
      if (!compareQueuedKeyMaps(toObjectKeyMap, liveNodeKeyMap)) {
        return false;
      }

      const liveNodeQueues = new Map();
      for (const [key, queue] of liveNodeKeyMap.entries()) {
        liveNodeQueues.set(key, queue.slice());
      }

      for (let objectIndex = 0; objectIndex < toObjects.length; objectIndex += 1) {
        const fromObj = fromObjects[objectIndex];
        const toObj = toObjects[objectIndex];
        const objectKey = getSavedObjectComparableKey(toObj);
        if (getSavedObjectComparableKey(fromObj) !== objectKey) return false;
        const queue = liveNodeQueues.get(objectKey);
        if (!queue || !queue.length) return false;
        const liveNode = queue.shift();
        if (!nodeMatchesSavedObject(toObj, liveNode)) return false;
        applySavedObjectToLiveNode(toObj, liveNode, livePage);
      }

      if (livePage.settings && toPage.settings && typeof toPage.settings === 'object') {
        livePage.settings.bannerUrl = toPage.settings.bannerUrl || null;
        livePage.settings.bannerEditorSrc = toPage.settings.bannerEditorSrc || null;
        livePage.settings.bannerThumbSrc = toPage.settings.bannerThumbSrc || null;
        livePage.settings.bannerState = cloneJson(toPage.settings.bannerState || null, null);
      }
      touchedPages.push(livePage);
    }

    touchedPages.forEach((page) => {
      try {
        page.transformer?.forceUpdate?.();
      } catch (_e) {}
      page.layer?.batchDraw?.();
      page.transformerLayer?.batchDraw?.();
    });

    return true;
  }

  function buildBannerState(pageState, bannerObj) {
    const settings = pageState && typeof pageState.settings === 'object' ? pageState.settings : {};
    if (settings.bannerState && typeof settings.bannerState === 'object') {
      return cloneJson(settings.bannerState, null);
    }
    if (!bannerObj) return null;
    return {
      x: Number(bannerObj.x) || 0,
      y: Number(bannerObj.y) || 0,
      scaleX: Number(bannerObj.scaleX) || 1,
      scaleY: Number(bannerObj.scaleY) || 1,
      rotation: Number(bannerObj.rotation) || 0,
      width: Math.max(1, Number(bannerObj.width) || 1),
      height: Math.max(1, Number(bannerObj.height) || 1)
    };
  }

  async function applyBannerOnlyTransition(_fromState, toState) {
    if (!toState || !Array.isArray(toState.pages)) return false;
    const livePages = Array.isArray(window.pages) ? window.pages : [];
    if (!livePages.length || livePages.length !== toState.pages.length) return false;

    const targetPages = Array.isArray(toState.pages) ? toState.pages : [];
    const pendingAdds = [];
    const touchedPages = [];

    for (let index = 0; index < targetPages.length; index += 1) {
      const targetPage = targetPages[index] || {};
      const livePage = livePages[index];
      if (!livePage || !livePage.layer) return false;

      const targetBannerObj = getBannerObjectFromPage(targetPage);
      const targetSettings = targetPage && typeof targetPage.settings === 'object' ? targetPage.settings : {};
      const liveBanner = typeof window.findCatalogBannerNode === 'function'
        ? window.findCatalogBannerNode(livePage)
        : null;

      if (!livePage.settings || typeof livePage.settings !== 'object') {
        livePage.settings = {};
      }

      const targetOriginalSrc = String(
        (targetBannerObj && (targetBannerObj.src || targetBannerObj.editorSrc || targetBannerObj.thumbSrc)) ||
        targetSettings.bannerUrl ||
        ''
      ).trim();
      const targetEditorSrc = String(
        (targetBannerObj && (targetBannerObj.editorSrc || targetBannerObj.src || targetBannerObj.thumbSrc)) ||
        targetSettings.bannerEditorSrc ||
        targetOriginalSrc
      ).trim();
      const targetThumbSrc = String(
        (targetBannerObj && (targetBannerObj.thumbSrc || targetBannerObj.editorSrc || targetBannerObj.src)) ||
        targetSettings.bannerThumbSrc ||
        targetEditorSrc ||
        targetOriginalSrc
      ).trim();
      const targetBannerState = buildBannerState(targetPage, targetBannerObj);

      livePage.settings.bannerUrl = targetOriginalSrc || null;
      livePage.settings.bannerEditorSrc = targetEditorSrc || null;
      livePage.settings.bannerThumbSrc = targetThumbSrc || null;
      livePage.settings.bannerState = targetBannerState ? cloneJson(targetBannerState, null) : null;
      touchedPages.push(livePage);

      if (!targetBannerObj || !targetOriginalSrc) {
        if (typeof window.removeCatalogBannerFromPage === 'function') {
          window.removeCatalogBannerFromPage(livePage, { clearTransformer: false });
        } else if (liveBanner && typeof liveBanner.destroy === 'function') {
          liveBanner.destroy();
        }
        continue;
      }

      const liveOriginalSrc = String(
        (liveBanner && typeof window.getNodeImageSource === 'function'
          ? (
              window.getNodeImageSource(liveBanner, 'original') ||
              window.getNodeImageSource(liveBanner, 'editor') ||
              window.getNodeImageSource(liveBanner, 'thumb')
            )
          : (
              liveBanner &&
              liveBanner.getAttr &&
              (liveBanner.getAttr('originalSrc') || liveBanner.getAttr('editorSrc') || liveBanner.getAttr('thumbSrc'))
            )) ||
        ''
      ).trim();
      const sameSource = !!(
        liveBanner &&
        liveOriginalSrc &&
        [targetOriginalSrc, targetEditorSrc, targetThumbSrc].includes(liveOriginalSrc)
      );

      if (sameSource && typeof window.bindCatalogBannerNode === 'function') {
        window.bindCatalogBannerNode(livePage, liveBanner, {
          state: targetBannerState,
          sourceWidth: Math.max(1, Number(targetBannerState?.width) || Number(targetBannerObj.width) || Number(liveBanner.width?.()) || 1),
          sourceHeight: Math.max(1, Number(targetBannerState?.height) || Number(targetBannerObj.height) || Number(liveBanner.height?.()) || 1),
          bannerUrl: targetOriginalSrc,
          originalSrc: targetOriginalSrc,
          editorSrc: targetEditorSrc,
          thumbSrc: targetThumbSrc,
          draggable: targetBannerObj.draggable !== false,
          listening: targetBannerObj.listening !== false
        });
        if (typeof liveBanner.opacity === 'function') {
          liveBanner.opacity(targetBannerObj.opacity ?? 1);
        }
        if (typeof liveBanner.rotation === 'function') {
          liveBanner.rotation(Number(targetBannerObj.rotation) || 0);
        }
        if (typeof liveBanner.show === 'function' && targetBannerObj.visible !== false) {
          liveBanner.show();
        }
        if (typeof liveBanner.hide === 'function' && targetBannerObj.visible === false) {
          liveBanner.hide();
        }
        continue;
      }

      if (typeof window.addCatalogBannerToPage !== 'function') {
        return false;
      }

      pendingAdds.push(
        window.addCatalogBannerToPage(livePage, {
          bannerUrl: targetOriginalSrc,
          originalSrc: targetOriginalSrc,
          editorSrc: targetEditorSrc,
          thumbSrc: targetThumbSrc,
          renderSrc: targetEditorSrc || targetOriginalSrc
        }, {
          state: targetBannerState,
          sourceWidth: Math.max(1, Number(targetBannerState?.width) || Number(targetBannerObj.width) || 1),
          sourceHeight: Math.max(1, Number(targetBannerState?.height) || Number(targetBannerObj.height) || 1),
          clearTransformer: false,
          moveToBottom: true,
          y: 0
        })
      );
    }

    if (pendingAdds.length) {
      await Promise.all(pendingAdds);
    }

    touchedPages.forEach((page) => {
      page.layer?.batchDraw?.();
      page.transformerLayer?.batchDraw?.();
    });

    return true;
  }

  async function applyProjectStateTransition(fromState, toState, opts = {}) {
    if (!fromState || !toState) return false;
    const currentSource = String(opts && opts.currentEntry && opts.currentEntry.source || '').trim();
    const nextSource = String(opts && opts.nextEntry && opts.nextEntry.source || '').trim();
    if (isGeometryHistorySource(currentSource) || isGeometryHistorySource(nextSource)) {
      const fromGeometryState = sanitizeStateForGeometryTransition(fromState);
      const toGeometryState = sanitizeStateForGeometryTransition(toState);
      if (
        fromGeometryState &&
        toGeometryState &&
        computeComparableStateHash(fromGeometryState) === computeComparableStateHash(toGeometryState)
      ) {
        const appliedGeometry = await applyGeometryOnlyTransition(fromState, toState);
        if (appliedGeometry) return true;
      }
    }
    if (isBannerHistorySource(currentSource) || isBannerHistorySource(nextSource)) {
      return await applyBannerOnlyTransition(fromState, toState);
    }
    const fromSanitized = sanitizeStateWithoutBanner(fromState);
    const toSanitized = sanitizeStateWithoutBanner(toState);
    if (!fromSanitized || !toSanitized) return false;
    if (computeComparableStateHash(fromSanitized) !== computeComparableStateHash(toSanitized)) return false;
    return await applyBannerOnlyTransition(fromState, toState);
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
      transitionApplyFn: applyProjectStateTransition,
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

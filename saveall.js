// ============================================================
// saveall.js – ZAPIS/ODCZYT PROJEKTÓW DO FIREBASE STORAGE (JSON)
// ============================================================

import {
    ref,
    uploadBytes,
    listAll,
    getDownloadURL,
    deleteObject,
    getMetadata
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

const storage = window.firebaseStorage;
const PROJECTS_FOLDER = "projects";
const THUMBS_FOLDER = "projects/thumbs";
const LOCAL_BACKUP_KEY = "wf_last_project_backup_v1";

function showAppToast(message, type = "success") {
    let toast = document.getElementById("appToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "appToast";
        toast.style.cssText = `
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 10000000;
            padding: 14px 18px;
            border-radius: 12px;
            font-family: Arial;
            font-weight: 600;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            opacity: 0;
            transform: translateY(8px);
            transition: all 0.2s ease;
        `;
        document.body.appendChild(toast);
    }
    let bottomOffset = 24;
    const footerBar = document.getElementById("appFooterBar");
    if (footerBar && typeof footerBar.getBoundingClientRect === "function") {
        const rect = footerBar.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const coveredBottom = Math.max(0, window.innerHeight - rect.top);
            bottomOffset += coveredBottom + 12;
        }
    }
    toast.style.bottom = `${Math.round(bottomOffset)}px`;
    const bg = type === "error" ? "#d9534f" : type === "info" ? "#007cba" : "#28a745";
    toast.style.background = bg;
    toast.style.color = "#fff";
    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
    }, 2200);
}
window.showAppToast = showAppToast;

function dataUrlToBlob(dataUrl) {
    const [meta, base64] = dataUrl.split(",");
    const mime = meta.match(/data:([^;]+);/i)?.[1] || "application/octet-stream";
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

function saveLocalProjectBackup(data, meta = {}) {
    try {
        if (!data || !Array.isArray(data.pages)) return false;
        const payload = {
            savedAt: Date.now(),
            meta: {
                reason: String(meta.reason || "manual").trim() || "manual",
                source: String(meta.source || "saveall").trim() || "saveall",
                name: String(data.name || "").trim()
            },
            data
        };
        localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(payload));
        return true;
    } catch (_e) {
        return false;
    }
}

async function restoreLocalProjectBackup() {
    try {
        const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
        if (!raw) {
            showAppToast("Brak lokalnego backupu projektu.", "info");
            return false;
        }
        const parsed = JSON.parse(raw);
        const data = parsed && parsed.data ? parsed.data : null;
        if (!data || !Array.isArray(data.pages) || !data.pages.length) {
            showAppToast("Lokalny backup jest nieprawidłowy.", "error");
            return false;
        }
        if (typeof window.loadProjectFromData !== "function") {
            showAppToast("Brak funkcji przywracania projektu.", "error");
            return false;
        }
        await window.loadProjectFromData(data);
        showAppToast("Przywrócono projekt z backupu lokalnego.", "success");
        return true;
    } catch (_e) {
        showAppToast("Nie udało się przywrócić backupu lokalnego.", "error");
        return false;
    }
}

function renderFirstPageThumb() {
    try {
        if (!window.pages || !window.pages.length) return null;
        const stage = window.pages[0]?.stage;
        if (!stage) return null;
        try {
            return stage.toDataURL({
                mimeType: "image/jpeg",
                quality: 0.7,
                pixelRatio: 0.35
            });
        } catch (e) {
            // fallback: ukryj obrazy (żeby nie taintować canvas)
            const images = stage.find("Image");
            const prev = images.map(n => n.visible());
            images.forEach(n => n.visible(false));
            const thumb = stage.toDataURL({
                mimeType: "image/jpeg",
                quality: 0.7,
                pixelRatio: 0.35
            });
            images.forEach((n, i) => n.visible(prev[i]));
            return thumb;
        }
    } catch (e) {
        return null;
    }
}

function showBusyOverlay(text) {
    let overlay = document.getElementById("projectBusyOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "projectBusyOverlay";
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999999;
        `;
        overlay.innerHTML = `
            <div style="background:#fff;padding:22px 28px;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.35);display:flex;align-items:center;gap:14px;font-family:Arial;">
                <div class="saveSpinner"></div>
                <div id="projectBusyText" style="font-weight:600;color:#333;">Przetwarzanie…</div>
            </div>
        `;
        const style = document.createElement("style");
        style.textContent = `
            .saveSpinner {
                width:26px;height:26px;border:3px solid #e0e0e0;border-top:3px solid #007cba;border-radius:50%;
                animation: saveSpin 1s linear infinite;
            }
            @keyframes saveSpin { to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }
    const label = overlay.querySelector("#projectBusyText");
    if (label) label.textContent = text || "Przetwarzanie…";
    overlay.style.display = "flex";
}

function hideBusyOverlay() {
    const overlay = document.getElementById("projectBusyOverlay");
    if (overlay) overlay.style.display = "none";
}

function clearKonvaGlobalDragState() {
    try {
        const pagesList = Array.isArray(window.pages) ? window.pages : [];
        pagesList.forEach((p) => {
            const stage = p && p.stage;
            if (!stage || (typeof stage.isDestroyed === "function" && stage.isDestroyed())) return;
            try { if (typeof stage.stopDrag === "function") stage.stopDrag(); } catch (_e) {}
            try {
                if (typeof stage.find === "function") {
                    stage.find((n) => n && typeof n.stopDrag === "function").forEach((n) => {
                        try { n.stopDrag(); } catch (_e) {}
                    });
                }
            } catch (_e) {}
        });
    } catch (_e) {}
    try {
        const dd = window.Konva && window.Konva.DD;
        if (!dd) return;
        try { if (typeof dd.stopDrag === "function") dd.stopDrag(); } catch (_e) {}
    } catch (_e) {}
}

// Aktualizacja tytułu projektu w nagłówku
const DEFAULT_PROJECT_TITLE = "Katalog produktów";
function setProjectTitle(name) {
    const titleEl = document.getElementById("projectTitle");
    const finalName = (name && String(name).trim()) ? String(name).trim() : DEFAULT_PROJECT_TITLE;
    if (titleEl) titleEl.textContent = finalName;
    document.title = `Kreator PDF – ${finalName}`;
    window.currentProjectName = finalName;
    window.projectOpen = finalName !== DEFAULT_PROJECT_TITLE;
}
window.setProjectTitle = setProjectTitle;

// Modal potwierdzenia wyjścia bez zapisu
function showLeaveConfirmModal(projectName) {
    return new Promise((resolve) => {
        let modal = document.getElementById("leaveConfirmModal");
        if (modal) modal.remove();

        modal = document.createElement("div");
        modal.id = "leaveConfirmModal";
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000000;
        `;
        modal.innerHTML = `
            <div style="width:560px; background:#fff; border-radius:16px; padding:22px; box-shadow:0 12px 48px rgba(0,0,0,0.28); font-family:Inter,Arial;">
                <h3 style="margin:0 0 12px 0; font-size:20px;">Wyjście z projektu</h3>
                <p style="margin:0 0 20px 0; color:#444; font-size:15px; line-height:1.45;">
                    Masz otwarty projekt <strong>${projectName || "bez nazwy"}</strong>. Czy na pewno chcesz wyjść bez zapisywania?
                </p>
                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button id="leaveCancelBtn" style="padding:10px 16px; background:#eee; border:none; border-radius:10px; cursor:pointer;">Zostań</button>
                    <button id="leaveSaveBtn" style="padding:10px 16px; background:#0066ff; color:#fff; border:none; border-radius:10px; cursor:pointer;">Zapisz</button>
                    <button id="leaveConfirmBtn" style="padding:10px 16px; background:#ff4444; color:#fff; border:none; border-radius:10px; cursor:pointer;">Wyjdź</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector("#leaveCancelBtn").onclick = () => {
            modal.remove();
            resolve(false);
        };
        modal.querySelector("#leaveSaveBtn").onclick = () => {
            modal.remove();
            const saveBtn = document.getElementById("saveProjectBtn");
            if (saveBtn) saveBtn.click();
            resolve(false);
        };
        modal.querySelector("#leaveConfirmBtn").onclick = () => {
            modal.remove();
            // Wyjście = wyczyść projekt i wróć do widoku startowego
            window._exitToStartTriggered = true;
            if (typeof window.clearAll === "function") window.clearAll();
            setProjectTitle(DEFAULT_PROJECT_TITLE);
            window.currentProjectMeta = null;
            window.projectDirty = false;
            if (typeof showStartView === "function") {
                showStartView();
            } else {
                window.location.href = "kreator.html";
            }
            setTimeout(() => { window._exitToStartTriggered = false; }, 0);
            resolve(true);
        };
    });
}

function shouldAskBeforeLeave() {
    return window.projectDirty === true || (window.projectHistory && (window.projectHistory.undo?.length > 0));
}

function showNewProjectNameModal() {
    return new Promise((resolve) => {
        let modal = document.getElementById("newProjectNameModal");
        if (modal) modal.remove();
        modal = document.createElement("div");
        modal.id = "newProjectNameModal";
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000001;
        `;
        modal.innerHTML = `
            <div style="width:460px;background:#fff;border-radius:14px;padding:18px;box-shadow:0 12px 42px rgba(0,0,0,0.28);font-family:Inter,Arial;">
                <h3 style="margin:0 0 10px 0;font-size:20px;">Nowy projekt</h3>
                <p style="margin:0 0 12px 0;color:#444;">Wpisz nazwę nowego projektu albo wybierz opcję bez nazwy.</p>
                <input id="newProjectNameInput" type="text" placeholder="Np. Promocje marzec" style="width:100%;padding:10px 12px;border:1px solid #d0d5dd;border-radius:10px;font-size:14px;outline:none;">
                <div id="newProjectNameError" style="display:none;margin-top:8px;color:#dc2626;font-size:13px;font-weight:600;">Wpisz nazwę projektu lub wybierz „Projekt bez nazwy”.</div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
                    <button id="newProjectCancelBtn" style="padding:9px 14px;background:#eee;border:none;border-radius:9px;cursor:pointer;">Anuluj</button>
                    <button id="newProjectUnnamedBtn" style="padding:9px 14px;background:#64748b;color:#fff;border:none;border-radius:9px;cursor:pointer;">Projekt bez nazwy</button>
                    <button id="newProjectCreateBtn" style="padding:9px 14px;background:#0066ff;color:#fff;border:none;border-radius:9px;cursor:pointer;">Utwórz</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const input = modal.querySelector("#newProjectNameInput");
        const errorEl = modal.querySelector("#newProjectNameError");
        const showValidation = () => {
            if (errorEl) errorEl.style.display = "block";
            if (input) {
                input.style.borderColor = "#dc2626";
                input.focus();
            }
        };
        const clearValidation = () => {
            if (errorEl) errorEl.style.display = "none";
            if (input) input.style.borderColor = "#d0d5dd";
        };
        if (input) {
            input.focus();
            input.addEventListener("input", () => {
                if (String(input.value || "").trim()) clearValidation();
            });
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    modal.querySelector("#newProjectCreateBtn")?.click();
                }
            });
        }
        modal.querySelector("#newProjectCancelBtn").onclick = () => {
            modal.remove();
            resolve(null);
        };
        modal.querySelector("#newProjectUnnamedBtn").onclick = () => {
            clearValidation();
            modal.remove();
            resolve("");
        };
        modal.querySelector("#newProjectCreateBtn").onclick = () => {
            const value = String(input?.value || "").trim();
            if (!value) {
                showValidation();
                return;
            }
            clearValidation();
            modal.remove();
            resolve(value);
        };
    });
}

// Prosty modal wyboru sposobu zapisu (bez alertów przeglądarki)
function showSaveChoiceModal(projectName) {
    return new Promise((resolve) => {
        let modal = document.getElementById("saveChoiceModal");
        if (modal) modal.remove();

        modal = document.createElement("div");
        modal.id = "saveChoiceModal";
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000000;
        `;
        modal.innerHTML = `
            <div style="width:420px; background:#fff; border-radius:14px; padding:18px; box-shadow:0 10px 40px rgba(0,0,0,0.25); font-family:Inter,Arial;">
                <h3 style="margin:0 0 10px 0;">Zapis projektu</h3>
                <p style="margin:0 0 16px 0; color:#444;">Projekt <strong>${projectName}</strong> już istnieje. Co chcesz zrobić?</p>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button id="saveChoiceCancel" style="padding:8px 12px; background:#eee; border:none; border-radius:8px; cursor:pointer;">Anuluj</button>
                    <button id="saveChoiceNew" style="padding:8px 12px; background:#0066ff; color:#fff; border:none; border-radius:8px; cursor:pointer;">Zapisz jako nowy</button>
                    <button id="saveChoiceOverwrite" style="padding:8px 12px; background:#2ecc71; color:#fff; border:none; border-radius:8px; cursor:pointer;">Nadpisz</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector("#saveChoiceCancel").onclick = () => {
            modal.remove();
            resolve("cancel");
        };
        modal.querySelector("#saveChoiceNew").onclick = () => {
            modal.remove();
            resolve("new");
        };
        modal.querySelector("#saveChoiceOverwrite").onclick = () => {
            modal.remove();
            resolve("overwrite");
        };
    });
}

// ====================================================================
// 1. OTWARCIE OKNA ZAPISU
// ====================================================================
document.getElementById("saveProjectBtn").onclick = () => {
    const modal = document.getElementById("saveProjectModal");
    modal.style.display = "flex";
    document.getElementById("projectDateInput").value = new Date().toISOString().split("T")[0];
};

// Live podgląd nazwy projektu w nagłówku
const nameInputEl = document.getElementById("projectNameInput");
if (nameInputEl) {
    nameInputEl.addEventListener("input", () => {
        const val = nameInputEl.value.trim();
        if (val.length > 0) {
            setProjectTitle(val);
        }
    });
}

// ====================================================================
// 2. ZAMKNIĘCIE OKNA
// ====================================================================
document.getElementById("cancelSaveBtn").onclick = () => {
    document.getElementById("saveProjectModal").style.display = "none";
};

// ====================================================================
// 3. ZBIERANIE DANYCH – NAJLEPSZA WERSJA (originalSrc + auto isBox)
// ====================================================================
function sanitizeAttrsForSave(attrs) {
    const out = {};
    const src = attrs && typeof attrs === "object" ? attrs : {};
    Object.keys(src).forEach((key) => {
        const v = src[key];
        if (v === undefined) return;
        if (typeof v === "function") return;
        if (v && typeof v === "object") {
            if (Array.isArray(v)) {
                out[key] = v.map((item) => (item && typeof item === "object" ? null : item));
                return;
            }
            // pomijamy ciężkie/niestabilne obiekty (np. image elementy)
            const ctor = v.constructor && v.constructor.name;
            if (ctor && ctor !== "Object") return;
            try {
                out[key] = JSON.parse(JSON.stringify(v));
            } catch (_e) {}
            return;
        }
        out[key] = v;
    });
    return out;
}

function pruneTransientDirectAttrsForSave(attrs, kind = "") {
    const src = attrs && typeof attrs === "object" ? attrs : {};
    const out = { ...src };

    // Runtime / helper state – niepotrzebne po reloadzie, a potrafi mocno pompować JSON.
    Object.keys(out).forEach((key) => {
        if (!key) return;
        if (
            key.startsWith("_custom") ||
            key.startsWith("_directSaved") ||
            key.startsWith("_last") ||
            key.startsWith("_drag") ||
            key.startsWith("_crop")
        ) {
            delete out[key];
        }
    });

    // Duplikaty atrybutów zapisywanych już jako pola payloadu.
    [
        "x", "y", "width", "height",
        "scaleX", "scaleY", "rotation",
        "draggable", "listening", "opacity",
        "text", "fontSize", "fontFamily", "fontStyle",
        "align", "lineHeight", "fill", "stroke", "strokeWidth",
        "name"
    ].forEach((key) => delete out[key]);

    if (kind === "image") {
        // `src` zapisujemy osobno w payload.src – tu tylko duplikaty i ciężkie pola out.
        delete out.originalSrc;
        delete out.editorSrc;
        delete out.thumbSrc;
        delete out.originalSrcBankKey;
        delete out.editorSrcBankKey;
        delete out.thumbSrcBankKey;
        delete out.barcodeOriginalSrc;
        delete out.originalSrcBeforeRmbg;
        delete out.image;
        delete out.crop;
        delete out.filters;
        delete out.shadowFor;
    }

    if (kind === "text") {
        delete out.textDecoration; // zapisane osobno
    }

    return out;
}

function getNodeCropForSave(node) {
    if (!node || typeof node.crop !== "function") return null;
    let cropObj = null;
    try {
        cropObj = node.crop();
    } catch (_e) {
        cropObj = null;
    }

    let x = Number(cropObj && cropObj.x);
    let y = Number(cropObj && cropObj.y);
    let width = Number(cropObj && cropObj.width);
    let height = Number(cropObj && cropObj.height);

    if (!Number.isFinite(x) && typeof node.cropX === "function") x = Number(node.cropX());
    if (!Number.isFinite(y) && typeof node.cropY === "function") y = Number(node.cropY());
    if (!Number.isFinite(width) && typeof node.cropWidth === "function") width = Number(node.cropWidth());
    if (!Number.isFinite(height) && typeof node.cropHeight === "function") height = Number(node.cropHeight());

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        return null;
    }

    return {
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
        width,
        height
    };
}

function normalizeSavedCrop(crop, imgWidth, imgHeight) {
    if (!crop || typeof crop !== "object") return null;
    const iw = Math.max(1, Number(imgWidth) || 1);
    const ih = Math.max(1, Number(imgHeight) || 1);

    let x = Number(crop.x);
    let y = Number(crop.y);
    let width = Number(crop.width);
    let height = Number(crop.height);

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return null;
    if (!Number.isFinite(x)) x = 0;
    if (!Number.isFinite(y)) y = 0;

    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x >= iw) x = 0;
    if (y >= ih) y = 0;

    width = Math.max(1, Math.min(width, iw - x));
    height = Math.max(1, Math.min(height, ih - y));

    return { x, y, width, height };
}

const PROJECT_LAZY_HYDRATE_INITIAL_PAGES = 3;
const PROJECT_POST_REPAIR_STYLE_DELAYS = [0, 80, 220];
const PROJECT_POST_REPAIR_PRICE_DELAYS = [0, 80, 220, 520, 980];

function collectTargetPages(targetPages) {
    if (Array.isArray(targetPages)) {
        return targetPages.filter((p) => !!(p && p.layer && p.transformerLayer));
    }
    if (targetPages && targetPages.layer && targetPages.transformerLayer) {
        return [targetPages];
    }
    return (Array.isArray(window.pages) ? window.pages : []).filter((p) => !!(p && p.layer && p.transformerLayer));
}

function getInitialHydratedPagesLimit(opts = {}, totalPages = 0) {
    const total = Math.max(0, Number(totalPages) || 0);
    if (total <= 0) return 0;

    if (opts && (opts.lazyHydration === false || opts.disableLazyHydration === true)) {
        return total;
    }

    const source = String((opts && opts.source) || "").trim().toLowerCase();
    if (source === "history" || source === "undo" || source === "redo") {
        return total;
    }

    let requested = Number(opts && opts.initialHydratedPages);
    if (!Number.isFinite(requested)) {
        requested = Number(window.__projectLazyHydrateInitialPages);
    }
    if (!Number.isFinite(requested)) {
        requested = PROJECT_LAZY_HYDRATE_INITIAL_PAGES;
    }

    const normalized = Math.max(1, Math.round(requested));
    return Math.min(total, normalized);
}

function markPageDeferredHydration(page, payload) {
    if (!page) return;
    page.__deferredHydrationPayload = payload || null;
    page.__deferredHydrationDone = !payload;
    page.__deferredHydrationPromise = null;
    page.__deferredHydrationError = null;
}

function pageHasDeferredHydration(page) {
    return !!(page && page.__deferredHydrationPayload);
}

function isPageHydrationContextActive(page) {
    if (!page || !page.layer || !page.stage) return false;
    if (page.__projectLoadStamp && window.__projectLoadStamp && page.__projectLoadStamp !== window.__projectLoadStamp) {
        return false;
    }
    if (typeof page.stage.isDestroyed === "function" && page.stage.isDestroyed()) {
        return false;
    }
    return true;
}

function restoreDirectTextStylesForPages(targetPages) {
    try {
        const pagesList = collectTargetPages(targetPages);
        pagesList.forEach((page) => {
            const layer = page && page.layer;
            if (!layer || !layer.find || !window.Konva) return;
            const directTexts = layer.find((n) =>
                n instanceof Konva.Text &&
                n.getAttr &&
                !!n.getAttr("directModuleId") &&
                !!n.getAttr("_directSavedFill")
            );
            directTexts.forEach((t) => {
                try {
                    const fill = t.getAttr("_directSavedFill");
                    const ff = t.getAttr("_directSavedFontFamily");
                    const fs = t.getAttr("_directSavedFontStyle");
                    const td = t.getAttr("_directSavedTextDecoration");
                    if (fill && typeof t.fill === "function") t.fill(fill);
                    if (ff && typeof t.fontFamily === "function") t.fontFamily(ff);
                    if (fs && typeof t.fontStyle === "function") t.fontStyle(fs);
                    if (typeof t.textDecoration === "function") t.textDecoration(td || "");
                } catch (_e) {}
            });
            layer.batchDraw?.();
            page.transformerLayer?.batchDraw?.();
        });
    } catch (_e) {}
}

function stabilizePriceGroupsForPages(targetPages) {
    try {
        const pagesList = collectTargetPages(targetPages);
        const directHooks = window.CustomStyleDirectHooks || {};
        const bindDirectPriceGroupEditor = typeof directHooks.bindDirectPriceGroupEditor === "function"
            ? directHooks.bindDirectPriceGroupEditor
            : null;

        const realignLegacyPriceGroup = (priceGroup) => {
            if (!priceGroup || !priceGroup.getChildren || !window.Konva) return;
            const texts = (priceGroup.getChildren() || []).filter((n) => n instanceof Konva.Text);
            if (texts.length < 2) return;

            const pickByText = (pattern) => texts.find((t) => pattern.test(String(t.text?.() || "")));
            const unitNode = pickByText(/\/\s*(SZT|KG|L|ML|G|OPAK)/i) || pickByText(/^\s*[£€$]\s*\/\s*/i);
            const mainNode = texts.slice().sort((a, b) => Number(b.fontSize?.() || 0) - Number(a.fontSize?.() || 0))[0] || null;
            const decNode = texts.find((t) => t !== mainNode && t !== unitNode) || texts.find((t) => t !== mainNode) || null;
            if (!mainNode || !decNode || !unitNode) return;

            const gap = 4;
            const baseX = Number(mainNode.x?.() || 0);
            const baseY = Number(mainNode.y?.() || 0);
            const mainW = Number(mainNode.width?.() || 0);
            const mainH = Number(mainNode.height?.() || 0);
            const decH = Number(decNode.height?.() || 0);

            decNode.x(baseX + mainW + gap);
            decNode.y(baseY + (mainH * 0.10));
            unitNode.x(baseX + mainW + gap);
            unitNode.y(baseY + (decH * 1.5));

            if (typeof unitNode.measureSize === "function" && typeof unitNode.width === "function") {
                const measured = unitNode.measureSize(unitNode.text?.() || "");
                const minW = Math.max(36, Math.ceil((Number(measured?.width) || 0) + 8));
                if (Number(unitNode.width?.() || 0) < minW) unitNode.width(minW);
            }
        };

        pagesList.forEach((page) => {
            const layer = page && page.layer;
            if (!layer || typeof layer.find !== "function" || !window.Konva) return;

            const priceGroups = layer.find((n) =>
                n instanceof Konva.Group &&
                n.getAttr &&
                n.getAttr("isPriceGroup")
            );

            priceGroups.forEach((group) => {
                try {
                    if (bindDirectPriceGroupEditor && group.getAttr("directModuleId")) {
                        bindDirectPriceGroupEditor(group, page);
                    } else {
                        realignLegacyPriceGroup(group);
                    }
                } catch (_err) {}
            });

            layer.batchDraw?.();
            page.transformerLayer?.batchDraw?.();
        });
    } catch (_e) {}
}

function restoreDirectModuleSelectabilityForPages(targetPages) {
    try {
        const fixSelectability = window.CustomStyleDirectHooks && window.CustomStyleDirectHooks.restoreDirectModuleNodeSelectabilityOnPage;
        if (typeof fixSelectability !== "function") return;
        collectTargetPages(targetPages).forEach((p) => {
            try { fixSelectability(p); } catch (_e) {}
        });
    } catch (_e) {}
}

function runPostLoadRepairsForPages(targetPages, opts = {}) {
    const pagesList = collectTargetPages(targetPages);
    if (!pagesList.length) return;

    restoreDirectTextStylesForPages(pagesList);
    stabilizePriceGroupsForPages(pagesList);
    restoreDirectModuleSelectabilityForPages(pagesList);

    if (opts.schedule === false) return;

    PROJECT_POST_REPAIR_STYLE_DELAYS.forEach((ms) => {
        setTimeout(() => restoreDirectTextStylesForPages(pagesList), ms);
    });
    PROJECT_POST_REPAIR_PRICE_DELAYS.forEach((ms) => {
        setTimeout(() => stabilizePriceGroupsForPages(pagesList), ms);
    });

    try {
        if (document?.fonts?.ready && typeof document.fonts.ready.then === "function") {
            document.fonts.ready.then(() => {
                stabilizePriceGroupsForPages(pagesList);
                setTimeout(() => stabilizePriceGroupsForPages(pagesList), 120);
            }).catch(() => {});
        }
    } catch (_e) {}
}

async function restoreDirectNodeRecursiveFromPayload(payload, page, layer) {
    if (!payload || !window.Konva) return null;
    if (!isPageHydrationContextActive(page)) return null;

    if (payload.type === "textNode") {
        const t = new Konva.Text({
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            width: payload.width,
            height: payload.height,
            scaleX: payload.scaleX || 1,
            scaleY: payload.scaleY || 1,
            rotation: payload.rotation || 0,
            text: payload.text || "",
            fontSize: payload.fontSize || 12,
            fontFamily: payload.fontFamily || "Arial",
            fill: payload.fill || "#000",
            fontStyle: payload.fontStyle || "normal",
            align: payload.align || "left",
            lineHeight: payload.lineHeight || 1.2,
            draggable: payload.draggable !== false,
            listening: payload.listening !== false
        });
        if (typeof t.textDecoration === "function" && payload.textDecoration) {
            t.textDecoration(payload.textDecoration);
        }
        if (payload.attrs) t.setAttrs(payload.attrs);
        if (payload.attrs && payload.attrs.directModuleId) {
            t.setAttr("_directSavedFill", payload.fill || t.fill() || "#000000");
            t.setAttr("_directSavedFontFamily", payload.fontFamily || t.fontFamily() || "Arial");
            t.setAttr("_directSavedFontStyle", payload.fontStyle || t.fontStyle() || "normal");
            t.setAttr("_directSavedTextDecoration", payload.textDecoration || (t.textDecoration ? t.textDecoration() : ""));
        }
        const editFn = window.enableEditableText || window.enableTextEditing;
        if (typeof editFn === "function" && (t.getAttr("isName") || t.getAttr("isIndex") || t.getAttr("isProductText") || t.getAttr("isCustomPackageInfo"))) {
            try { editFn(t, page); } catch (_e) {}
        }
        return t;
    }

    if (payload.type === "rectNode") {
        const r = new Konva.Rect({
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            width: payload.width || 0,
            height: payload.height || 0,
            scaleX: payload.scaleX || 1,
            scaleY: payload.scaleY || 1,
            rotation: payload.rotation || 0,
            fill: payload.fill,
            opacity: payload.opacity ?? 1,
            stroke: payload.stroke,
            strokeWidth: payload.strokeWidth,
            draggable: payload.draggable === true,
            listening: payload.listening !== false
        });
        if (payload.attrs) r.setAttrs(payload.attrs);
        return r;
    }

    if (payload.type === "imageNode" && (payload.src || (payload.attrs && payload.attrs.editorSrc) || (payload.attrs && payload.attrs.thumbSrc))) {
        return await new Promise((resolve) => {
            if (!isPageHydrationContextActive(page)) {
                resolve(null);
                return;
            }
            const renderSrc =
                String(payload?.attrs?.editorSrc || "").trim() ||
                String(payload.src || payload?.attrs?.thumbSrc || "").trim();
            const thumbSrc =
                String(payload?.attrs?.thumbSrc || "").trim() ||
                renderSrc;
            const img = new Image();
            img.onload = () => {
                if (!isPageHydrationContextActive(page)) {
                    resolve(null);
                    return;
                }
                const safeCrop = normalizeSavedCrop(payload.crop, img.naturalWidth, img.naturalHeight);
                const k = new Konva.Image({
                    x: payload.x ?? 0,
                    y: payload.y ?? 0,
                    image: img,
                    width: payload.width || img.naturalWidth,
                    height: payload.height || img.naturalHeight,
                    scaleX: payload.scaleX || 1,
                    scaleY: payload.scaleY || 1,
                    rotation: payload.rotation || 0,
                    draggable: payload.draggable !== false,
                    listening: payload.listening !== false,
                    opacity: payload.opacity ?? 1
                });
                if (safeCrop && typeof k.crop === "function") {
                    k.crop(safeCrop);
                }
                if (payload.attrs) k.setAttrs(payload.attrs);
                const payloadSlotRaw = Number(
                    payload && payload.attrs && payload.attrs.slotIndex !== undefined
                        ? payload.attrs.slotIndex
                        : null
                );
                const payloadHasSlot = Number.isFinite(payloadSlotRaw);
                const payloadIsUserImage = !!(payload && payload.attrs && payload.attrs.isUserImage);
                const payloadIsProductImage = !!(payload && payload.attrs && payload.attrs.isProductImage) && payloadHasSlot && !payloadIsUserImage;
                if (k.setAttr) {
                    k.setAttr("slotIndex", payloadHasSlot ? payloadSlotRaw : null);
                    k.setAttr("isProductImage", payloadIsProductImage);
                    k.setAttr("isUserImage", payloadIsUserImage || !payloadHasSlot);
                }
                if (typeof k.imageSmoothingEnabled === "function") k.imageSmoothingEnabled(true);
                if (typeof window.applyImageVariantsToKonvaNode === "function") {
                    window.applyImageVariantsToKonvaNode(k, {
                        original: payload.src,
                        editor: renderSrc || payload.src,
                        thumb: thumbSrc || renderSrc || payload.src
                    });
                } else {
                    if (k.setAttr) k.setAttr("originalSrc", payload.src);
                    if (k.setAttr) k.setAttr("editorSrc", renderSrc || payload.src);
                    if (k.setAttr) k.setAttr("thumbSrc", thumbSrc || renderSrc || payload.src);
                }
                if (typeof window.setupProductImageDrag === "function" && (k.getAttr("isProductImage") || k.getAttr("directModuleId"))) {
                    try { window.setupProductImageDrag(k, layer); } catch (_e) {}
                }
                resolve(k);
            };
            img.onerror = () => resolve(null);
            img.crossOrigin = "Anonymous";
            img.src = renderSrc || payload.src;
        });
    }

    if (payload.type === "groupNode") {
        const g = new Konva.Group({
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            scaleX: payload.scaleX || 1,
            scaleY: payload.scaleY || 1,
            rotation: payload.rotation || 0,
            draggable: payload.draggable !== false,
            listening: payload.listening !== false,
            name: payload.name || ""
        });
        if (payload.attrs) g.setAttrs(payload.attrs);
        const children = Array.isArray(payload.children) ? payload.children : [];
        for (const childPayload of children) {
            const childNode = await restoreDirectNodeRecursiveFromPayload(childPayload, page, layer);
            if (childNode) g.add(childNode);
        }
        if (g.getAttr && g.getAttr("isPriceGroup")) {
            const bindFn = window.CustomStyleDirectHooks && window.CustomStyleDirectHooks.bindDirectPriceGroupEditor;
            if (typeof bindFn === "function") {
                try { bindFn(g, page); } catch (_e) {}
            }
        }
        return g;
    }

    return null;
}

async function restoreSavedObjectsForPage(page, pagePayload) {
    if (!page || !page.layer) return;
    if (!isPageHydrationContextActive(page)) return;
    const layer = page.layer;
    const objects = Array.isArray(pagePayload && pagePayload.objects) ? pagePayload.objects : [];

    for (const obj of objects) {
        if (!isPageHydrationContextActive(page)) return;
        if (!obj || !obj.type) continue;

        if (obj.type === "directGroup" && obj.data) {
            const directGroup = await restoreDirectNodeRecursiveFromPayload(obj.data, page, layer);
            if (directGroup) layer.add(directGroup);
            continue;
        }

        if (obj.type === "directNode" && obj.data) {
            const directNode = await restoreDirectNodeRecursiveFromPayload(obj.data, page, layer);
            if (directNode) layer.add(directNode);
            continue;
        }

        if (obj.type === "genericGroup" && obj.data) {
            const genericGroup = await restoreDirectNodeRecursiveFromPayload(obj.data, page, layer);
            if (genericGroup) layer.add(genericGroup);
            continue;
        }

        if (obj.type === "background") {
            const bg = layer.findOne((n) => n.getAttr("isPageBg"));
            if (bg) bg.fill(obj.fill);
            continue;
        }

        if (obj.type === "text") {
            const t = new Konva.Text({
                x: obj.x,
                y: obj.y,
                text: obj.text || "",
                width: obj.width,
                height: obj.height,
                fontSize: obj.fontSize,
                fontFamily: obj.fontFamily,
                fill: obj.fill,
                fontStyle: obj.fontStyle || "normal",
                align: obj.align || "left",
                lineHeight: obj.lineHeight || 1.2,
                rotation: obj.rotation,
                draggable: true
            });
            t.setAttrs({
                isName: obj.isName || false,
                isPrice: obj.isPrice || false,
                isIndex: obj.isIndex || false,
                slotIndex: obj.slotIndex
            });
            layer.add(t);
            const editFn = window.enableEditableText || window.enableTextEditing;
            if (typeof editFn === "function") editFn(t, page);
            continue;
        }

    if (obj.type === "image" && (obj.src || obj.editorSrc || obj.thumbSrc)) {
            await new Promise((res) => {
                if (!isPageHydrationContextActive(page)) {
                    res();
                    return;
                }
                const renderSrc = String(obj.editorSrc || obj.src || obj.thumbSrc || "").trim();
                const thumbSrc = String(obj.thumbSrc || renderSrc || obj.src || "").trim();
                const img = new Image();
                img.onload = () => {
                    if (!isPageHydrationContextActive(page)) {
                        res();
                        return;
                    }
                    const safeCrop = normalizeSavedCrop(obj.crop, img.naturalWidth, img.naturalHeight);
                    const slotIndexRaw = Number(obj.slotIndex);
                    const hasSlot = Number.isFinite(slotIndexRaw);
                    const isUserImage = !!obj.isUserImage;
                    const isProductImage = !!obj.isProductImage && hasSlot && !isUserImage;
                    const k = new Konva.Image({
                        x: obj.x,
                        y: obj.y,
                        image: img,
                        width: obj.width || img.naturalWidth,
                        height: obj.height || img.naturalHeight,
                        scaleX: obj.scaleX || 1,
                        scaleY: obj.scaleY || 1,
                        rotation: obj.rotation || 0,
                        draggable: true
                    });
                    if (safeCrop && typeof k.crop === "function") {
                        k.crop(safeCrop);
                    }
                    k.setAttr("slotIndex", hasSlot ? slotIndexRaw : null);
                    if (typeof window.applyImageVariantsToKonvaNode === "function") {
                        window.applyImageVariantsToKonvaNode(k, {
                            original: obj.src,
                            editor: renderSrc || obj.src,
                            thumb: thumbSrc || renderSrc || obj.src
                        });
                    } else {
                        k.setAttr("originalSrc", obj.src);
                        k.setAttr("editorSrc", renderSrc || obj.src);
                        k.setAttr("thumbSrc", thumbSrc || renderSrc || obj.src);
                    }
                    k.setAttr("isProductImage", isProductImage);
                    k.setAttr("isUserImage", isUserImage || !hasSlot);
                    k.setAttr("isOverlayElement", obj.isOverlayElement || false);
                    k.setAttr("isTNZBadge", obj.isTNZBadge || false);
                    k.setAttr("isCountryBadge", obj.isCountryBadge || false);
                    if (typeof k.imageSmoothingEnabled === "function") {
                        k.imageSmoothingEnabled(true);
                    }
                    layer.add(k);
                    if (typeof window.addImageShadow === "function") {
                        window.addImageShadow(layer, k);
                    }
                    res();
                };
                img.onerror = () => res();
                img.crossOrigin = "Anonymous";
                img.src = renderSrc || obj.src;
            });
            continue;
        }

        if (obj.type === "priceGroup") {
            const g = new Konva.Group({
                x: obj.x ?? 0,
                y: obj.y ?? 0,
                scaleX: obj.scaleX || 1,
                scaleY: obj.scaleY || 1,
                rotation: obj.rotation || 0,
                draggable: obj.draggable !== false,
                listening: true,
                name: obj.name || "priceGroup"
            });
            g.setAttrs({
                isProductText: true,
                isPrice: true,
                isPriceGroup: true,
                slotIndex: obj.slotIndex ?? null
            });

            const parts = Array.isArray(obj.parts) ? obj.parts : [];
            parts.forEach((part) => {
                const t = new Konva.Text({
                    x: part.x ?? 0,
                    y: part.y ?? 0,
                    text: part.text || "",
                    width: part.width,
                    height: part.height,
                    fontSize: part.fontSize || 12,
                    fontFamily: part.fontFamily || "Arial",
                    fill: part.fill || "#000000",
                    fontStyle: part.fontStyle || "normal",
                    align: part.align || "left",
                    lineHeight: part.lineHeight || 1.2
                });
                g.add(t);
            });

            layer.add(g);
            continue;
        }

        if (obj.type === "barcode" && obj.original) {
            await new Promise((res) => {
                if (!isPageHydrationContextActive(page)) {
                    res();
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    if (!isPageHydrationContextActive(page)) {
                        res();
                        return;
                    }
                    const k = new Konva.Image({
                        x: obj.x,
                        y: obj.y,
                        image: img,
                        scaleX: obj.scaleX || 1,
                        scaleY: obj.scaleY || 1,
                        rotation: obj.rotation || 0,
                        draggable: true
                    });
                    k.setAttrs({
                        isBarcode: true,
                        slotIndex: obj.slotIndex,
                        barcodeOriginalSrc: obj.original,
                        barcodeColor: obj.color
                    });
                    layer.add(k);
                    res();
                };
                img.onerror = () => res();
                img.src = obj.original;
            });
            continue;
        }

        if (obj.type === "box") {
            const box = new Konva.Rect({
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                fill: obj.fill !== undefined ? obj.fill : "#ffffff",
                stroke: obj.stroke || "rgba(0,0,0,0.06)",
                strokeWidth: obj.strokeWidth ?? 1,
                cornerRadius: obj.cornerRadius ?? 10,
                shadowColor: obj.shadowColor || "rgba(0,0,0,0.18)",
                shadowBlur: obj.shadowBlur ?? 30,
                shadowOffset: { x: obj.shadowOffsetX ?? 0, y: obj.shadowOffsetY ?? 12 },
                shadowOpacity: obj.shadowOpacity ?? 0.8,
                draggable: true,
                visible: obj.visible !== false,
                listening: obj.listening !== false
            });

            box.setAttr("isBox", true);
            box.setAttr("slotIndex", obj.slotIndex ?? null);
            box.setAttr("isShape", !!obj.isShape);
            box.setAttr("isPreset", !!obj.isPreset);
            if (obj.selectable !== undefined) box.setAttr("selectable", obj.selectable);
            box.setAttr("isHiddenByCatalogStyle", !!obj.isHiddenByCatalogStyle);

            box.scaleX(obj.scaleX || 1);
            box.scaleY(obj.scaleY || 1);

            layer.add(box);
            continue;
        }
    }

    layer.batchDraw?.();
}

async function ensurePageHydrated(page, opts = {}) {
    if (!page || !page.layer) return false;
    if (!isPageHydrationContextActive(page)) return false;
    if (!pageHasDeferredHydration(page)) {
        page.__deferredHydrationDone = true;
        return false;
    }
    if (page.__deferredHydrationPromise) {
        return page.__deferredHydrationPromise;
    }

    const payload = page.__deferredHydrationPayload;
    const trackedPromise = (async () => {
        try {
            await restoreSavedObjectsForPage(page, payload);
            page.__deferredHydrationPayload = null;
            page.__deferredHydrationDone = true;
            page.__deferredHydrationError = null;
            runPostLoadRepairsForPages([page], { schedule: true });
            return true;
        } catch (err) {
            page.__deferredHydrationError = err;
            if (opts.throwOnError) throw err;
            try {
                console.warn("Deferred page hydration failed", err);
            } catch (_e) {}
            return false;
        } finally {
            if (page.__deferredHydrationPromise === trackedPromise) {
                page.__deferredHydrationPromise = null;
            }
        }
    })();

    page.__deferredHydrationPromise = trackedPromise;
    return trackedPromise;
}

window.ensurePageHydrated = ensurePageHydrated;
window.hasDeferredPageHydration = pageHasDeferredHydration;
window.ensureAllPagesHydrated = async function(targetPages, opts = {}) {
    const pagesList = collectTargetPages(targetPages);
    if (!pagesList.length) return;
    for (const page of pagesList) {
        await ensurePageHydrated(page, {
            ...opts,
            throwOnError: true
        });
    }
};

function serializeDirectNodeRecursive(node) {
    if (!node || !window.Konva) return null;

    if (node instanceof Konva.Text) {
        const attrs = pruneTransientDirectAttrsForSave(
            sanitizeAttrsForSave(node.getAttrs ? node.getAttrs() : {}),
            "text"
        );
        return {
            type: "textNode",
            x: node.x(),
            y: node.y(),
            width: node.width(),
            height: node.height(),
            scaleX: node.scaleX ? node.scaleX() : 1,
            scaleY: node.scaleY ? node.scaleY() : 1,
            rotation: node.rotation ? node.rotation() : 0,
            text: node.text(),
            fontSize: node.fontSize(),
            fontFamily: node.fontFamily(),
            fill: node.fill(),
            fontStyle: node.fontStyle(),
            align: node.align(),
            lineHeight: node.lineHeight(),
            textDecoration: node.textDecoration ? node.textDecoration() : "",
            draggable: node.draggable ? node.draggable() : true,
            listening: node.listening ? node.listening() : true,
            attrs
        };
    }

    if (node instanceof Konva.Rect) {
        const attrs = pruneTransientDirectAttrsForSave(
            sanitizeAttrsForSave(node.getAttrs ? node.getAttrs() : {}),
            "rect"
        );
        return {
            type: "rectNode",
            x: node.x(),
            y: node.y(),
            width: node.width(),
            height: node.height(),
            scaleX: node.scaleX ? node.scaleX() : 1,
            scaleY: node.scaleY ? node.scaleY() : 1,
            rotation: node.rotation ? node.rotation() : 0,
            fill: node.fill(),
            opacity: node.opacity ? node.opacity() : 1,
            stroke: node.stroke ? node.stroke() : undefined,
            strokeWidth: node.strokeWidth ? node.strokeWidth() : undefined,
            draggable: node.draggable ? node.draggable() : false,
            listening: node.listening ? node.listening() : true,
            attrs
        };
    }

    if (node instanceof Konva.Image) {
        const attrs = pruneTransientDirectAttrsForSave(
            sanitizeAttrsForSave(node.getAttrs ? node.getAttrs() : {}),
            "image"
        );
        const crop = getNodeCropForSave(node);
        return {
            type: "imageNode",
            x: node.x(),
            y: node.y(),
            width: node.width(),
            height: node.height(),
            scaleX: node.scaleX ? node.scaleX() : 1,
            scaleY: node.scaleY ? node.scaleY() : 1,
            rotation: node.rotation ? node.rotation() : 0,
            draggable: node.draggable ? node.draggable() : true,
            listening: node.listening ? node.listening() : true,
            opacity: node.opacity ? node.opacity() : 1,
            crop,
            src: (
                (typeof window.getNodeImageSource === "function")
                    ? window.getNodeImageSource(node, "original")
                    : ((node.getAttr && node.getAttr("originalSrc")) || (node.image && node.image() && node.image().src))
            ) || null,
            attrs
        };
    }

    if (node instanceof Konva.Group) {
        const attrs = pruneTransientDirectAttrsForSave(
            sanitizeAttrsForSave(node.getAttrs ? node.getAttrs() : {}),
            "group"
        );
        return {
            type: "groupNode",
            x: node.x ? node.x() : 0,
            y: node.y ? node.y() : 0,
            scaleX: node.scaleX ? node.scaleX() : 1,
            scaleY: node.scaleY ? node.scaleY() : 1,
            rotation: node.rotation ? node.rotation() : 0,
            draggable: node.draggable ? node.draggable() : true,
            listening: node.listening ? node.listening() : true,
            name: node.name ? node.name() : "",
            attrs,
            children: (node.getChildren ? node.getChildren() : []).map(serializeDirectNodeRecursive).filter(Boolean)
        };
    }

    return null;
}

function collectProjectData() {

    const project = {
        name: document.getElementById("projectNameInput").value.trim(),
        date: document.getElementById("projectDateInput").value,
        layout: window.LAYOUT_MODE || "layout6",
        catalogStyle: window.CATALOG_STYLE || "default",
        pageWidth: window.W || null,
        pageHeight: window.H || null,
        pages: []
    };

    window.pages.forEach(page => {
        const deferredPayload = page && page.__deferredHydrationPayload;
        if (deferredPayload && typeof deferredPayload === "object" && Array.isArray(deferredPayload.objects)) {
            let deferredObjects = deferredPayload.objects;
            try {
                deferredObjects = JSON.parse(JSON.stringify(deferredPayload.objects));
            } catch (_e) {
                deferredObjects = Array.isArray(deferredPayload.objects) ? deferredPayload.objects.slice() : [];
            }
            project.pages.push({
                number: page.number,
                objects: deferredObjects
            });
            return;
        }

        const objects = [];

        page.layer.getChildren().forEach(node => {
            const nodeName = (node && typeof node.name === "function") ? node.name() : "";
            const isHelperNode = !!(node && node.getAttr && (
                nodeName === "selectionOutline" ||
                nodeName === "selectionRect" ||
                node.getAttr("isBgBlur") ||
                node.getAttr("isFxHelper") ||
                node.getAttr("isPriceHitArea")
            ));
            if (isHelperNode) return;

            // MODUŁY STYL-WLASNY (direct) – zapis rekurencyjny grupy z dziećmi
            if (node instanceof Konva.Group && node.getAttr && node.getAttr("isDirectCustomModuleGroup")) {
                const payload = serializeDirectNodeRecursive(node);
                if (payload) {
                    objects.push({
                        type: "directGroup",
                        data: payload
                    });
                }
                return;
            }

            // LUŹNE NODE'Y direct (np. po rozgrupowaniu) – zapis pełny z attrs.
            if (node.getAttr && node.getAttr("directModuleId")) {
                const payload = serializeDirectNodeRecursive(node);
                if (payload) {
                    objects.push({
                        type: "directNode",
                        data: payload
                    });
                }
                return;
            }

            // GRUPY OGÓLNE (np. user-group z mieszanymi obiektami: moduł + grafika).
            // Bez tego część elementów mogła znikać po wczytaniu.
            if (node instanceof Konva.Group && !node.getAttr("isPriceGroup")) {
                const payload = serializeDirectNodeRecursive(node);
                if (payload) {
                    objects.push({
                        type: "genericGroup",
                        data: payload
                    });
                }
                return;
            }

            // TŁO STRONY
            if (node.getAttr("isPageBg")) {
                objects.push({
                    type: "background",
                    fill: node.fill()
                });
                return;
            }

            // TEKST
            if (node instanceof Konva.Text) {
                const parent = node.getParent && node.getParent();
                const isPriceGroup = parent && parent.getAttr && parent.getAttr("isPriceGroup");
                const abs = isPriceGroup ? node.getAbsolutePosition() : null;
                objects.push({
                    type: "text",
                    x: abs ? abs.x : node.x(),
                    y: abs ? abs.y : node.y(),
                    text: node.text(),
                    width: node.width(),
                    height: node.height(),
                    fontSize: node.fontSize(),
                    fontFamily: node.fontFamily(),
                    fill: node.fill(),
                    fontStyle: node.fontStyle(),
                    align: node.align(),
                    lineHeight: node.lineHeight(),
                    rotation: node.rotation(),
                    isName: node.getAttr("isName") || false,
                    isPrice: node.getAttr("isPrice") || false,
                    isIndex: node.getAttr("isIndex") || false,
                    isPricePart: isPriceGroup || false,
                    slotIndex: node.getAttr("slotIndex") ?? null
                });
                return;
            }

            // CENA (GROUP) – zapisz całą grupę, aby po wczytaniu dało się odtworzyć styl elegancki
            if (node instanceof Konva.Group && node.getAttr("isPriceGroup")) {
                const parts = (node.getChildren ? node.getChildren() : [])
                    .filter(ch => ch instanceof Konva.Text)
                    .map(ch => ({
                        x: ch.x(),
                        y: ch.y(),
                        text: ch.text(),
                        width: ch.width(),
                        height: ch.height(),
                        fontSize: ch.fontSize(),
                        fontFamily: ch.fontFamily(),
                        fill: ch.fill(),
                        fontStyle: ch.fontStyle() || "normal",
                        align: ch.align() || "left",
                        lineHeight: ch.lineHeight() || 1.2
                    }));

                objects.push({
                    type: "priceGroup",
                    x: node.x(),
                    y: node.y(),
                    scaleX: node.scaleX ? node.scaleX() : 1,
                    scaleY: node.scaleY ? node.scaleY() : 1,
                    rotation: node.rotation ? node.rotation() : 0,
                    draggable: node.draggable ? node.draggable() : true,
                    slotIndex: node.getAttr("slotIndex") ?? null,
                    name: node.name ? node.name() : "priceGroup",
                    parts
                });
                return;
            }

            // ZDJĘCIA (nie barcode)
            if (node instanceof Konva.Image && !node.getAttr("isBarcode")) {
                const crop = getNodeCropForSave(node);
                const rawSlot = Number(node.getAttr("slotIndex"));
                const hasSlot = Number.isFinite(rawSlot);
                const isUserImage = !!node.getAttr("isUserImage");
                const isProductImage = !!node.getAttr("isProductImage") && hasSlot && !isUserImage;
                objects.push({
                    type: "image",
                    x: node.x(),
                    y: node.y(),
                    scaleX: node.scaleX(),
                    scaleY: node.scaleY(),
                    rotation: node.rotation(),
                    width: node.width(),
                    height: node.height(),
                    crop,
                    slotIndex: hasSlot ? rawSlot : null,
                    src: (
                        (typeof window.getNodeImageSource === "function")
                            ? window.getNodeImageSource(node, "original")
                            : (node.getAttr("originalSrc") || node.image()?.src)
                    ) || null,
                    editorSrc: (
                        (typeof window.getNodeImageSource === "function")
                            ? window.getNodeImageSource(node, "editor")
                            : node.getAttr("editorSrc")
                    ) || null,
                    thumbSrc: (
                        (typeof window.getNodeImageSource === "function")
                            ? window.getNodeImageSource(node, "thumb")
                            : node.getAttr("thumbSrc")
                    ) || null,
                    isProductImage,
                    isUserImage,
                    isOverlayElement: node.getAttr("isOverlayElement") || false,
                    isTNZBadge: node.getAttr("isTNZBadge") || false,
                    isCountryBadge: node.getAttr("isCountryBadge") || false
                });
                return;
            }

            // BARCODE
            if (node.getAttr("isBarcode")) {
                objects.push({
                    type: "barcode",
                    x: node.x(),
                    y: node.y(),
                    scaleX: node.scaleX(),
                    scaleY: node.scaleY(),
                    rotation: node.rotation(),
                    slotIndex: node.getAttr("slotIndex") ?? null,
                    original: node.getAttr("barcodeOriginalSrc") || null,
                    color: node.getAttr("barcodeColor") || "#000"
                });
                return;
            }

            // BOXY – NAJWAŻNIEJSZA POPRAWKA: automatyczne wykrywanie!
            if (node instanceof Konva.Rect) {
                const isBg = node.getAttr("isPageBg");
                const alreadyMarked = node.getAttr("isBox");
                const isShape = node.getAttr("isShape") || node.getAttr("isPreset");

                // Zapisujemy tylko prawdziwe boxy/kształty użytkownika (bez helperów zaznaczenia).
                if ((alreadyMarked || isShape) && !isBg) {
                    objects.push({
                        type: "box",
                        x: node.x(),
                        y: node.y(),
                        width: node.width(),
                        height: node.height(),
                        scaleX: node.scaleX(),
                        scaleY: node.scaleY(),
                        fill: node.fill(),
                        stroke: node.stroke(),
                        strokeWidth: node.strokeWidth(),
                        cornerRadius: node.cornerRadius(),
                        shadowColor: node.shadowColor(),
                        shadowBlur: node.shadowBlur(),
                        shadowOffsetX: node.shadowOffsetX(),
                        shadowOffsetY: node.shadowOffsetY(),
                        shadowOpacity: node.shadowOpacity(),
                        slotIndex: node.getAttr("slotIndex") ?? null,
                        isShape: !!node.getAttr("isShape"),
                        isPreset: !!node.getAttr("isPreset"),
                        visible: typeof node.visible === "function" ? node.visible() : true,
                        listening: typeof node.listening === "function" ? node.listening() : true,
                        selectable: node.getAttr("selectable"),
                        isHiddenByCatalogStyle: !!node.getAttr("isHiddenByCatalogStyle")
                    });
                }
            }
        });

        project.pages.push({
            number: page.number,
            objects
        });
    });

    return project;
}
window.collectProjectData = collectProjectData;

// ====================================================================
// 4A. PODGLĄD Z DANYCH (bez podmiany aktualnego projektu)
// ====================================================================
function createThumbQueue(concurrency = 2) {
    let active = 0;
    const queue = [];
    const next = () => {
        if (active >= concurrency || queue.length === 0) return;
        const task = queue.shift();
        active++;
        Promise.resolve()
            .then(task.fn)
            .catch(() => {})
            .finally(() => {
                active--;
                next();
            });
    };
    return (fn) => {
        queue.push({ fn });
        next();
    };
}

const queueThumbTask = createThumbQueue(2);

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    const words = String(text).split(/\s+/).filter(Boolean);
    let line = "";
    let yy = y;
    for (let i = 0; i < words.length; i++) {
        const test = line ? line + " " + words[i] : words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, yy);
            line = words[i];
            yy += lineHeight;
        } else {
            line = test;
        }
    }
    if (line) ctx.fillText(line, x, yy);
}

async function renderPreviewFromData(data, opts = {}) {
    if (!data || !data.pages || !data.pages.length) return null;
    const pageW = data.pageWidth || window.W || 794;
    const pageH = data.pageHeight || window.H || 1123;
    const targetW = opts.targetWidth || 320;
    const scale = targetW / pageW;
    const targetH = Math.round(pageH * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const page = data.pages[0];
    const objects = page.objects || [];

    // cache obrazów
    const imgCache = new Map();
    const getImg = async (src) => {
        if (!src) return null;
        if (imgCache.has(src)) return imgCache.get(src);
        try {
            const img = await loadImageElement(src);
            imgCache.set(src, img);
            return img;
        } catch {
            imgCache.set(src, null);
            return null;
        }
    };

    for (const obj of objects) {
        if (obj.type === "background") {
            ctx.fillStyle = obj.fill || "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            continue;
        }
        if (obj.type === "box") {
            const x = obj.x * scale;
            const y = obj.y * scale;
            const w = obj.width * (obj.scaleX || 1) * scale;
            const h = obj.height * (obj.scaleY || 1) * scale;
            const r = Math.max(0, (obj.cornerRadius || 0) * scale);
            ctx.fillStyle = obj.fill || "#fff";
            ctx.strokeStyle = obj.stroke || "rgba(0,0,0,0.06)";
            ctx.lineWidth = (obj.strokeWidth || 0) * scale;
            ctx.beginPath();
            if (r > 0) {
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
            } else {
                ctx.rect(x, y, w, h);
            }
            ctx.closePath();
            ctx.fill();
            if (ctx.lineWidth > 0) ctx.stroke();
            continue;
        }
        if (obj.type === "image") {
            const img = await getImg(obj.src);
            if (!img) continue;
            const w = img.naturalWidth * (obj.scaleX || 1) * scale;
            const h = img.naturalHeight * (obj.scaleY || 1) * scale;
            const x = obj.x * scale;
            const y = obj.y * scale;
            ctx.save();
            if (obj.rotation) {
                const cx = x + w / 2;
                const cy = y + h / 2;
                ctx.translate(cx, cy);
                ctx.rotate((obj.rotation * Math.PI) / 180);
                ctx.drawImage(img, -w / 2, -h / 2, w, h);
            } else {
                ctx.drawImage(img, x, y, w, h);
            }
            ctx.restore();
            continue;
        }
        if (obj.type === "barcode") {
            const img = await getImg(obj.original);
            if (!img) continue;
            const w = img.naturalWidth * (obj.scaleX || 1) * scale;
            const h = img.naturalHeight * (obj.scaleY || 1) * scale;
            const x = obj.x * scale;
            const y = obj.y * scale;
            ctx.drawImage(img, x, y, w, h);
            continue;
        }
        if (obj.type === "text") {
            const x = obj.x * scale;
            const y = obj.y * scale;
            const w = (obj.width || 0) * scale;
            const fs = (obj.fontSize || 12) * scale;
            const lh = (obj.lineHeight || 1.2) * fs;
            const style = obj.fontStyle && obj.fontStyle.includes("bold") ? "bold " : "";
            ctx.font = `${style}${fs}px ${obj.fontFamily || "Arial"}`;
            ctx.fillStyle = obj.fill || "#000";
            ctx.textAlign = obj.align === "center" ? "center" : obj.align === "right" ? "right" : "left";
            ctx.textBaseline = "top";
            const drawX = obj.align === "center" ? x + w / 2 : obj.align === "right" ? x + w : x;
            drawWrappedText(ctx, obj.text, drawX, y, Math.max(10, w), lh);
            continue;
        }
    }

    return canvas.toDataURL("image/jpeg", 0.78);
}

async function ensureThumbForProject(itemRef, thumbPath) {
    try {
        const existing = await getDownloadURL(ref(storage, thumbPath));
        return existing;
    } catch (e) {
        // ignore
    }
    try {
        const jsonUrl = await getDownloadURL(itemRef);
        const resp = await fetch(jsonUrl);
        if (!resp.ok) return "";
        const data = await resp.json();
        const thumb = await renderPreviewFromData(data, { targetWidth: 320 });
        if (!thumb) return "";
        const thumbRef = ref(storage, thumbPath);
        await uploadBytes(thumbRef, dataUrlToBlob(thumb), {
            contentType: "image/jpeg"
        });
        return await getDownloadURL(thumbRef);
    } catch (e) {
        return "";
    }
}

// ====================================================================
// 4. ZAPIS DO FIRESTORE
// ====================================================================
let saveProjectNowBusy = false;
async function saveProjectNow(options = {}) {
    if (saveProjectNowBusy) {
        if (typeof window.showAppToast === "function") {
            window.showAppToast("Trwa zapisywanie projektu…", "info");
        }
        return false;
    }
    saveProjectNowBusy = true;
    const confirmBtn = document.getElementById("confirmSaveBtn");
    if (confirmBtn) confirmBtn.disabled = true;
    const opts = {
        closeModal: options.closeModal !== false,
        allowUntitled: options.allowUntitled === true,
        skipConflictPrompt: options.skipConflictPrompt === true,
        successToast: options.successToast !== false
    };
    if (opts.closeModal) {
        const saveModal = document.getElementById("saveProjectModal");
        if (saveModal) saveModal.style.display = "none";
    }
    let busyVisible = false;
    try {
        const data = collectProjectData();
        if (!data) return false;
        saveLocalProjectBackup(data, { reason: "pre-upload" });
        let autosaveIdentityBefore = null;
        if (typeof window.getProjectIdentityForAutosave === "function") {
            try {
                autosaveIdentityBefore = await window.getProjectIdentityForAutosave(data);
            } catch (_e) {
                autosaveIdentityBefore = null;
            }
        }

        if (!data.name) {
            if (opts.allowUntitled) {
                const fallbackName = String(
                    (window.currentProjectName && window.currentProjectName !== DEFAULT_PROJECT_TITLE ? window.currentProjectName : "") ||
                    "Projekt bez nazwy"
                ).trim();
                data.name = fallbackName;
                const projectNameInput = document.getElementById("projectNameInput");
                if (projectNameInput && !String(projectNameInput.value || "").trim()) {
                    projectNameInput.value = fallbackName === "Projekt bez nazwy" ? "" : fallbackName;
                }
            } else {
                showAppToast("Podaj nazwę projektu!", "error");
                return false;
            }
        }

        if (!storage) {
            showAppToast("Brak połączenia z Firebase Storage.", "error");
            return false;
        }

        // jeśli edytujemy wcześniej zapisany projekt — zapytaj o nadpisanie
        let filePath = null;
        let thumbPath = null;
        if (window.currentProjectMeta && window.currentProjectMeta.name === data.name) {
            if (opts.skipConflictPrompt) {
                filePath = window.currentProjectMeta.path;
                const fileName = filePath.split("/").pop();
                thumbPath = window.currentProjectMeta.thumbPath || `${THUMBS_FOLDER}/${fileName.replace(/\.json$/i, ".jpg")}`;
            } else {
                const choice = await showSaveChoiceModal(data.name);
                if (choice === "cancel") return false;
                if (choice === "overwrite") {
                    filePath = window.currentProjectMeta.path;
                    const fileName = filePath.split("/").pop();
                    thumbPath = window.currentProjectMeta.thumbPath || `${THUMBS_FOLDER}/${fileName.replace(/\.json$/i, ".jpg")}`;
                }
            }
        }

        showBusyOverlay("Zapisywanie projektu…");
        busyVisible = true;
        if (!filePath) {
            // sprawdź, czy projekt o tej nazwie już istnieje w Storage
            try {
                const folderRef = ref(storage, PROJECTS_FOLDER);
                const result = await listAll(folderRef);
                let existing = null;
                for (const itemRef of result.items) {
                    try {
                        const meta = await getMetadata(itemRef);
                        const existingName = (meta?.customMetadata?.name || "").trim();
                        if (existingName && existingName === data.name.trim()) {
                            existing = { path: itemRef.fullPath, thumbPath: meta?.customMetadata?.thumbPath || "" };
                            break;
                        }
                    } catch (e) {
                        // ignore pojedynczy błąd
                    }
                }
                if (existing) {
                    if (!opts.skipConflictPrompt) {
                        const choice = await showSaveChoiceModal(data.name);
                        if (choice === "cancel") {
                            hideBusyOverlay();
                            busyVisible = false;
                            return false;
                        }
                        if (choice === "overwrite") {
                            filePath = existing.path;
                            const fileName = filePath.split("/").pop();
                            thumbPath = existing.thumbPath || `${THUMBS_FOLDER}/${fileName.replace(/\.json$/i, ".jpg")}`;
                        }
                    }
                }
            } catch (e) {
                // jeśli coś padnie, kontynuuj standardowy zapis
            }
        }
        if (!filePath) {
            const safeName = data.name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
            const datePart = data.date || new Date().toISOString().slice(0, 10);
            const fileName = `${safeName || "projekt"}_${datePart}_${Date.now()}.json`;
            filePath = `${PROJECTS_FOLDER}/${fileName}`;
            thumbPath = `${THUMBS_FOLDER}/${fileName.replace(/\.json$/i, ".jpg")}`;
        }

        const jsonString = JSON.stringify(data);
        const approxMB = (new Blob([jsonString]).size / (1024 * 1024));
        if (approxMB > 18) {
            showBusyOverlay(`Zapisywanie dużego projektu… (${approxMB.toFixed(1)} MB)`);
        }
        const blob = new Blob([jsonString], { type: "application/json" });
        const fileRef = ref(storage, filePath);

        await uploadBytes(fileRef, blob, {
            contentType: "application/json",
            customMetadata: {
                name: data.name || "",
                date: data.date || "",
                layout: data.layout || "layout6",
                thumbPath
            }
        });

        const thumb = renderFirstPageThumb();
        if (thumb) {
            const thumbRef = ref(storage, thumbPath);
            await uploadBytes(thumbRef, dataUrlToBlob(thumb), {
                contentType: "image/jpeg"
            });
        }

        hideBusyOverlay();
        busyVisible = false;
        if (opts.successToast) showAppToast("Projekt zapisany!", "success");
        saveLocalProjectBackup(data, { reason: "saved" });

        // zapamiętaj bieżący zapis
        window.currentProjectMeta = {
            name: data.name || "",
            path: filePath,
            thumbPath
        };
        window.projectDirty = false;
        setProjectTitle(data.name || DEFAULT_PROJECT_TITLE);
        let autosaveIdentityAfter = null;
        if (typeof window.getProjectIdentityForAutosave === "function") {
            try {
                autosaveIdentityAfter = await window.getProjectIdentityForAutosave(data);
            } catch (_e) {
                autosaveIdentityAfter = null;
            }
        }
        await migrateAutosaveProjectIdentityOnSave(autosaveIdentityBefore, autosaveIdentityAfter, data);
        return true;
    } catch (e) {
        if (busyVisible) hideBusyOverlay();
        console.error("Błąd zapisu projektu:", e);
        const msg = (e && (e.message || e.code)) ? String(e.message || e.code) : "Nieznany błąd zapisu";
        showAppToast(`Błąd zapisu: ${msg} (możesz użyć: Przywróć backup lokalny)`, "error");
        return false;
    } finally {
        saveProjectNowBusy = false;
        if (confirmBtn) confirmBtn.disabled = false;
    }
}
window.saveProjectNow = saveProjectNow;

const confirmSaveBtn = document.getElementById("confirmSaveBtn");
if (confirmSaveBtn) {
    confirmSaveBtn.onclick = async () => {
        await saveProjectNow({
            closeModal: true,
            allowUntitled: false
        });
    };
}

// ====================================================================
// PANEL ZAPISANYCH PROJEKTÓW
// ====================================================================
const savedPanel = document.createElement("div");
savedPanel.id = "savedProjectsModal";
savedPanel.style = `display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); z-index:999999; justify-content:center; align-items:center;`;
savedPanel.innerHTML = `
    <div style="width:860px; max-height:82vh; overflow-y:auto; background:white; padding:20px; border-radius:14px; box-shadow:0 10px 40px rgba(0,0,0,0.25); font-family:Inter,Arial;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <h2 style="margin-top:0;">Zapisane projekty</h2>
            <button id="restoreLocalBackupBtn" style="padding:8px 12px;background:#0b74c8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Przywróć backup lokalny</button>
        </div>
        <div id="savedProjectsList" style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:14px;"></div>
        <div style="text-align:right; margin-top:20px;">
            <button id="closeSavedProjects" style="padding:10px 20px; background:#ccc; border:none; border-radius:8px; cursor:pointer;">Zamknij</button>
        </div>
    </div>
`;
document.body.appendChild(savedPanel);
const restoreLocalBackupBtn = document.getElementById("restoreLocalBackupBtn");
if (restoreLocalBackupBtn) {
    restoreLocalBackupBtn.onclick = async () => {
        await restoreLocalProjectBackup();
    };
}

// ====================================================================
// 5. WCZYTYWANIE LISTY
// ====================================================================
function formatSavedTimestamp(ts) {
    const n = Number(ts || 0);
    if (!Number.isFinite(n) || n <= 0) return "";
    try {
        return new Date(n).toLocaleString("pl-PL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    } catch (_e) {
        return "";
    }
}

function normalizedProjectNameLayoutKey(name, layout) {
    const n = String(name || "").trim().toLowerCase();
    const l = String(layout || "").trim().toLowerCase();
    return `${n}::${l}`;
}

function getAutosaveStoreKey() {
    return window.PROJECT_AUTOSAVE_STORE_KEY || "main-catalog-project-v2";
}

async function migrateAutosaveProjectIdentityOnSave(prevIdentity, nextIdentity, data) {
    try {
        const fromKey = String((prevIdentity && prevIdentity.projectKey) || "").trim();
        const toKey = String((nextIdentity && nextIdentity.projectKey) || "").trim();
        if (!fromKey || !toKey || fromKey === toKey) return;
        if (!toKey.startsWith("saved:")) return;

        const storeApi = window.ProjectHistoryStore;
        if (!storeApi || typeof storeApi.listAutosaveEntries !== "function" || typeof storeApi.appendAutosaveEntry !== "function") return;

        const key = getAutosaveStoreKey();
        const entries = await storeApi.listAutosaveEntries(key);
        if (!Array.isArray(entries) || !entries.length) return;

        const targetName = String(
            (nextIdentity && nextIdentity.name) ||
            (data && data.name) ||
            ""
        ).trim();
        const targetLayout = String((data && data.layout) || "").trim();
        const targetNameLayoutKey = normalizedProjectNameLayoutKey(targetName, targetLayout);
        const sameNameLayout = (entry) => {
            const entryKey = normalizedProjectNameLayoutKey(
                entry?.name || entry?.data?.name || "",
                entry?.layout || entry?.data?.layout || ""
            );
            return !!targetNameLayoutKey && entryKey === targetNameLayoutKey;
        };

        const fromEntries = entries
            .filter((entry) => {
                const entryKey = String((entry && entry.projectKey) || "").trim();
                if (entryKey === fromKey) return true;
                if (entryKey && entryKey.startsWith("saved:")) return false;
                return sameNameLayout(entry);
            })
            .sort((a, b) => Number(b?.savedAt || 0) - Number(a?.savedAt || 0));
        if (!fromEntries.length) return;

        const toEntries = entries
            .filter((entry) => String((entry && entry.projectKey) || "").trim() === toKey)
            .sort((a, b) => Number(b?.savedAt || 0) - Number(a?.savedAt || 0));

        const fromLatest = fromEntries[0];
        const toLatest = toEntries[0] || null;
        const pick = (!toLatest || Number(fromLatest?.savedAt || 0) >= Number(toLatest?.savedAt || 0))
            ? fromLatest
            : toLatest;

        const mergedData = (pick && pick.data) || data || null;
        if (!mergedData) return;

        await storeApi.appendAutosaveEntry(key, {
            id: String((pick && pick.id) || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            savedAt: Number((pick && pick.savedAt) || Date.now()),
            hash: String((pick && pick.hash) || ""),
            projectKey: toKey,
            name: String((nextIdentity && nextIdentity.name) || mergedData?.name || (pick && pick.name) || "").trim(),
            layout: String((pick && pick.layout) || mergedData?.layout || "layout6").trim(),
            thumb: typeof pick?.thumb === "string" ? pick.thumb : "",
            data: mergedData
        }, 40);

        if (typeof storeApi.deleteAutosaveEntry === "function") {
            for (const entry of fromEntries) {
                const entryId = String((entry && entry.id) || "").trim();
                if (!entryId) continue;
                await storeApi.deleteAutosaveEntry(key, entryId);
            }
        }

        await syncLatestAutosavePayloadFromEntries();
    } catch (_e) {}
}

async function syncLatestAutosavePayloadFromEntries() {
    try {
        const storeApi = window.ProjectHistoryStore;
        if (!storeApi || typeof storeApi.listAutosaveEntries !== "function") return;
        const key = getAutosaveStoreKey();
        const entries = await storeApi.listAutosaveEntries(key);
        if (!entries.length) {
            if (typeof storeApi.clearPersistent === "function") {
                await storeApi.clearPersistent(key);
            }
            return;
        }
        const latest = entries[0];
        if (!latest?.data) return;
        if (typeof storeApi.savePersistent === "function") {
            await storeApi.savePersistent(key, {
                version: 2,
                savedAt: Number(latest.savedAt || Date.now()),
                current: {
                    id: String(latest.id || `${Date.now()}`),
                    ts: Number(latest.savedAt || Date.now()),
                    source: "autosave-history-list",
                    hash: String(latest.hash || ""),
                    data: latest.data
                },
                undo: [],
                redo: []
            });
        }
    } catch (_e) {}
}

async function getAutosaveProjectEntries(options = {}) {
    const opts = options && typeof options === "object" ? options : {};
    const includeSavedLinked = opts.includeSavedLinked === true;
    const entries = [];
    const storeApi = window.ProjectHistoryStore;
    const key = getAutosaveStoreKey();

    // 1) Lista autosave z mechanizmu historii (wiele wpisów)
    try {
        if (storeApi && typeof storeApi.listAutosaveEntries === "function") {
            const list = await storeApi.listAutosaveEntries(key);
            list.forEach((entry, idx) => {
                if (!entry?.data || !Array.isArray(entry.data.pages) || !entry.data.pages.length) return;
                entries.push({
                    id: String(entry.id || `history-${idx}-${Date.now()}`),
                    projectKey: String(entry.projectKey || "").trim(),
                    data: entry.data,
                    savedAt: Number(entry.savedAt || Date.now()),
                    source: "autosave-history-list",
                    thumb: typeof entry.thumb === "string" ? entry.thumb : "",
                    name: String(entry.name || entry.data?.name || "").trim(),
                    layout: String(entry.layout || entry.data?.layout || "layout6")
                });
            });
        }
    } catch (_e) {}

    // 2) Legacy: pojedynczy autosave payload (wsteczna zgodność)
    if (!entries.length) {
        try {
            if (storeApi && typeof storeApi.loadPersistent === "function") {
                const payload = await storeApi.loadPersistent(key);
                const data = payload?.current?.data;
                if (data && Array.isArray(data.pages) && data.pages.length > 0) {
                    entries.push({
                        id: `legacy-${Number(payload.savedAt || payload.current?.ts || Date.now())}`,
                        projectKey: "",
                        data,
                        savedAt: Number(payload.savedAt || payload.current?.ts || Date.now()),
                        source: "autosave-history-legacy",
                        thumb: "",
                        name: String(data?.name || "").trim(),
                        layout: String(data?.layout || "layout6")
                    });
                }
            }
        } catch (_e) {}
    }

    // 3) Fallback: lokalny backup z saveall.js
    try {
        const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const data = parsed?.data;
            if (data && Array.isArray(data.pages) && data.pages.length > 0) {
                entries.push({
                    id: `backup-${Number(parsed.savedAt || Date.now())}`,
                    projectKey: "autosave-backup",
                    data,
                    savedAt: Number(parsed.savedAt || Date.now()),
                    source: "autosave-backup",
                    thumb: "",
                    name: String(data?.name || "").trim(),
                    layout: String(data?.layout || "layout6")
                });
            }
        }
    } catch (_e) {}

    const seenByProject = new Set();
    const seenIds = new Set();
    return entries
        .filter((entry) => {
            if (!entry || !entry.data) return false;
            const projectKey = String(entry.projectKey || "").trim();
            if (!includeSavedLinked && projectKey.startsWith("saved:")) return false;
            const id = String(entry.id || "");
            if (!id || seenIds.has(id)) return false;
            const dedupeKey = projectKey || `legacy:${String(entry.name || "").trim()}:${String(entry.layout || "").trim()}:${String(entry.source || "").trim()}`;
            if (seenByProject.has(dedupeKey)) return false;
            seenByProject.add(dedupeKey);
            seenIds.add(id);
            return true;
        })
        .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
}

async function loadSavedProjects(listEl) {
    const list = listEl || document.getElementById("savedProjectsList");
    if (!list) return;
    const renderToken = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    list.__projectsRenderToken = renderToken;
    const isStale = () => list.__projectsRenderToken !== renderToken;

    list.innerHTML = "<p>Ładowanie...</p>";
    const isStartList = list.id === "startProjectsList";
    list.innerHTML = "";
    let renderedCount = 0;
    const autosaveCardsByNameLayout = new Map();

    // === Karty autosave (wiele wpisów) ===
    const autosaveEntries = await getAutosaveProjectEntries();
    if (isStale()) return;
    autosaveEntries.forEach((autosaveEntry) => {
        if (isStale()) return;
        if (!autosaveEntry || !autosaveEntry.data) return;
        const previewId = `preview_${Math.random().toString(36).slice(2)}`;
        const autosaveNameRaw = String(autosaveEntry.name || autosaveEntry.data.name || "").trim();
        const autosaveName = autosaveNameRaw ? `Autosave: ${autosaveNameRaw}` : "Autosave (lokalny)";
        const autosaveDate = formatSavedTimestamp(autosaveEntry.savedAt);
        const autosaveLayout = autosaveEntry.layout || autosaveEntry.data.layout || "layout6";
        const autosaveThumb = String(autosaveEntry.thumb || "");

        const card = document.createElement("div");
        card.className = isStartList ? "start-card" : "";
        card.dataset.autosave = "1";
        card.dataset.autosaveId = String(autosaveEntry.id || "");
        card.dataset.autosaveSource = String(autosaveEntry.source || "");
        const autosaveNameLayoutKey = normalizedProjectNameLayoutKey(
            autosaveEntry.name || autosaveEntry.data?.name || "",
            autosaveEntry.layout || autosaveEntry.data?.layout || "layout6"
        );
        card.dataset.autosaveNameLayoutKey = autosaveNameLayoutKey;
        if (!isStartList) {
            card.style = `padding:12px; border:1px solid #c7d2fe; border-radius:12px; background:#f5f8ff; display:flex; flex-direction:column; gap:10px;`;
        }
        card.innerHTML = `
            <div id="${previewId}" class="${isStartList ? "start-preview" : ""}" style="${isStartList ? "" : "width:100%;aspect-ratio:3/4;background:#fff;border:1px solid #dbe5ff;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;"}">
                ${autosaveThumb ? `<img src="${autosaveThumb}" alt="Podgląd autosave" ${isStartList ? "" : `style="width:100%;height:100%;object-fit:cover;"`}>` : `<span style="color:#667085;">Autosave lokalny</span>`}
            </div>
            <div class="${isStartList ? "start-meta" : ""}" style="${isStartList ? "" : "display:flex;flex-direction:column;gap:4px;"}">
                <strong class="${isStartList ? "start-name" : ""}" style="${isStartList ? "" : "font-size:14px;"}">${autosaveName}</strong>
                <small class="${isStartList ? "start-sub" : ""}" style="${isStartList ? "" : "color:#475467;font-size:12px;"}">${autosaveDate} • ${autosaveLayout}</small>
            </div>
            <div class="${isStartList ? "start-actions" : ""}" style="${isStartList ? "" : "display:flex; gap:8px; margin-top:4px;"}">
                <button class="openAutosaveBtn ${isStartList ? "start-btn start-open" : ""}" data-autosave-id="${String(autosaveEntry.id || "")}" style="${isStartList ? "" : "flex:1;padding:8px 10px; font-size:13px; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer;"}">Otwórz</button>
                <button class="deleteAutosaveBtn ${isStartList ? "start-btn start-delete" : ""}" data-autosave-id="${String(autosaveEntry.id || "")}" data-autosave-source="${String(autosaveEntry.source || "")}" style="${isStartList ? "" : "padding:8px 10px; font-size:13px; background:#64748b; color:white; border:none; border-radius:6px; cursor:pointer;"}">Usuń</button>
            </div>
        `;
        list.appendChild(card);
        if (autosaveNameLayoutKey) {
            const bucket = autosaveCardsByNameLayout.get(autosaveNameLayoutKey) || [];
            bucket.push(card);
            autosaveCardsByNameLayout.set(autosaveNameLayoutKey, bucket);
        }
        renderedCount += 1;

        if (!autosaveThumb) {
            const previewEl = card.querySelector(`#${previewId}`);
            queueThumbTask(async () => {
                if (isStale()) return;
                let freshThumb = "";
                try {
                    freshThumb = await renderPreviewFromData(autosaveEntry.data, { targetWidth: 320 });
                } catch (_e) {
                    freshThumb = "";
                }
                if (isStale()) return;
                if (!previewEl) return;
                if (freshThumb) {
                    if (!previewEl.isConnected) return;
                    previewEl.innerHTML = `<img src="${freshThumb}" alt="Podgląd autosave" style="width:100%;height:100%;object-fit:cover;">`;
                } else {
                    if (!previewEl.isConnected) return;
                    previewEl.innerHTML = `<span style="color:#667085;">Brak podglądu</span>`;
                }
            });
        }
    });

    // === Karty z Firebase ===
    if (storage) {
        try {
            const folderRef = ref(storage, PROJECTS_FOLDER);
            const result = await listAll(folderRef);
            if (isStale()) return;
            const seenProjectPaths = new Set();

            for (const itemRef of result.items) {
                if (isStale()) return;
                const fullPath = String(itemRef?.fullPath || "").trim();
                if (!fullPath || seenProjectPaths.has(fullPath)) continue;
                seenProjectPaths.add(fullPath);
                let meta = null;
                try {
                    meta = await getMetadata(itemRef);
                } catch (_e) {
                    meta = null;
                }
                if (isStale()) return;

                const name = meta?.customMetadata?.name || itemRef.name;
                const date = meta?.customMetadata?.date || "";
                const layout = meta?.customMetadata?.layout || "layout6";
                const thumbPath = meta?.customMetadata?.thumbPath || `${THUMBS_FOLDER}/${itemRef.name.replace(/\.json$/i, ".jpg")}`;
                let thumbUrl = "";
                if (thumbPath) {
                    try {
                        thumbUrl = await getDownloadURL(ref(storage, thumbPath));
                    } catch (_e) {
                        thumbUrl = "";
                    }
                }
                if (isStale()) return;

                const savedNameLayoutKey = normalizedProjectNameLayoutKey(name, layout);
                if (savedNameLayoutKey && autosaveCardsByNameLayout.has(savedNameLayoutKey)) {
                    const dupCards = autosaveCardsByNameLayout.get(savedNameLayoutKey) || [];
                    dupCards.forEach((dupCard) => {
                        if (dupCard && dupCard.parentNode === list) {
                            dupCard.remove();
                            renderedCount = Math.max(0, renderedCount - 1);
                        }
                    });
                    autosaveCardsByNameLayout.delete(savedNameLayoutKey);
                }

                const card = document.createElement("div");
                card.className = isStartList ? "start-card" : "";
                card.dataset.path = itemRef.fullPath;
                card.dataset.thumbpath = thumbPath;
                if (!isStartList) {
                    card.style = `padding:12px; border:1px solid #e2e2e2; border-radius:12px; background:#fafafa; display:flex; flex-direction:column; gap:10px;`;
                }
                const previewId = `preview_${Math.random().toString(36).slice(2)}`;
                card.innerHTML = `
                    <div id="${previewId}" class="${isStartList ? "start-preview" : ""}" style="${isStartList ? "" : "width:100%;aspect-ratio:3/4;background:#fff;border:1px solid #eee;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;"}">
                        ${thumbUrl ? `<img src="${thumbUrl}" alt="Podgląd" ${isStartList ? "" : `style="width:100%;height:100%;object-fit:cover;"`}>` : `<span style="color:#999;">Ładowanie podglądu…</span>`}
                    </div>
                    <div class="${isStartList ? "start-meta" : ""}" style="${isStartList ? "" : "display:flex;flex-direction:column;gap:4px;"}">
                        <strong class="${isStartList ? "start-name" : ""}" style="${isStartList ? "" : "font-size:14px;"}">${name}</strong>
                        <small class="${isStartList ? "start-sub" : ""}" style="${isStartList ? "" : "color:#666;font-size:12px;"}">${date} • ${layout}</small>
                    </div>
                    <div class="${isStartList ? "start-actions" : ""}" style="${isStartList ? "" : "display:flex; gap:8px; margin-top:4px;"}">
                        <button data-path="${itemRef.fullPath}" data-thumbpath="${thumbPath}" class="openProjectBtn ${isStartList ? "start-btn start-open" : ""}" style="${isStartList ? "" : "flex:1;padding:8px 10px; font-size:13px; background:#0066ff; color:white; border:none; border-radius:6px; cursor:pointer;"}">Otwórz</button>
                        <button data-path="${itemRef.fullPath}" class="deleteProjectBtn ${isStartList ? "start-btn start-delete" : ""}" style="${isStartList ? "" : "padding:8px 10px; font-size:13px; background:#ff4444; color:white; border:none; border-radius:6px; cursor:pointer;"}">Usuń</button>
                    </div>
                `;
                list.appendChild(card);
                renderedCount += 1;

                if (!thumbUrl) {
                    const previewEl = card.querySelector(`#${previewId}`);
                    queueThumbTask(async () => {
                        if (isStale()) return;
                        const url = await ensureThumbForProject(itemRef, thumbPath);
                        if (isStale()) return;
                        if (!previewEl) return;
                        if (url) {
                            previewEl.innerHTML = `<img src="${url}" alt="Podgląd" style="width:100%;height:100%;object-fit:cover;">`;
                        } else {
                            previewEl.innerHTML = `<span style="color:#999;">Brak podglądu</span>`;
                        }
                    });
                }
            }
        } catch (_e) {
            // Jeśli Firebase chwilowo niedostępny, i tak pokaż lokalny autosave.
        }
    }

    if (renderedCount === 0) {
        list.innerHTML = storage
            ? "<p>Brak zapisanych projektów</p>"
            : "<p>Brak połączenia z Firebase Storage</p>";
        return;
    }
    if (isStale()) return;

    list.querySelectorAll(".deleteProjectBtn").forEach(btn => {
        btn.onclick = async () => {
            if (confirm("Na pewno usunąć?")) {
                await deleteObject(ref(storage, btn.dataset.path));
                loadSavedProjects(list);
            }
        };
    });

    list.querySelectorAll(".openProjectBtn").forEach(btn => {
        btn.onclick = async () => {
            showBusyOverlay("Wczytywanie projektu…");
            await loadProjectFromStorage(btn.dataset.path, btn.dataset.thumbpath);
            hideBusyOverlay();
            if (!listEl) {
                savedPanel.style.display = "none";
                loadSavedProjects();
            } else {
                showEditorView();
            }
        };
    });

    list.querySelectorAll(".openAutosaveBtn").forEach(btn => {
        btn.onclick = async () => {
            const autosaveId = String(btn.dataset.autosaveId || "").trim();
            const allAutosaves = await getAutosaveProjectEntries();
            const freshAutosave = autosaveId
                ? allAutosaves.find((entry) => String(entry.id || "") === autosaveId)
                : allAutosaves[0];
            if (!freshAutosave?.data) {
                showAppToast("Brak autosave do wczytania.", "info");
                return;
            }
            showBusyOverlay("Wczytywanie autosave…");
            await loadProjectFromData(freshAutosave.data);
            hideBusyOverlay();
            window.currentProjectMeta = null;
            if (!listEl) {
                savedPanel.style.display = "none";
                loadSavedProjects();
            } else {
                showEditorView();
            }
        };
    });

    list.querySelectorAll(".deleteAutosaveBtn").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Usunąć lokalny autosave?")) return;
            const autosaveId = String(btn.dataset.autosaveId || "").trim();
            const autosaveSource = String(btn.dataset.autosaveSource || "").trim();
            const storeApi = window.ProjectHistoryStore;
            const key = getAutosaveStoreKey();
            try {
                if (autosaveId && storeApi && typeof storeApi.deleteAutosaveEntry === "function") {
                    await storeApi.deleteAutosaveEntry(key, autosaveId);
                    await syncLatestAutosavePayloadFromEntries();
                } else if (typeof window.clearProjectAutosave === "function") {
                    await window.clearProjectAutosave();
                }
            } catch (_e) {}
            try {
                if (autosaveSource === "autosave-backup") {
                    localStorage.removeItem(LOCAL_BACKUP_KEY);
                }
            } catch (_e) {}
            loadSavedProjects(listEl || list);
        };
    });

    // Kliknięcie w kartę = Otwórz (bez kliknięć na przyciskach)
    if (isStartList) {
        list.querySelectorAll(".start-card").forEach(card => {
            card.onclick = (e) => {
                if (e.target && e.target.closest("button")) return;
                const openBtn = card.querySelector(".openProjectBtn, .openAutosaveBtn");
                if (openBtn) openBtn.click();
            };
        });
    }
}

// ====================================================================
// 6. WCZYTYWANIE PROJEKTU – zdjęcia + boxy działają idealnie
// ====================================================================
async function loadProjectFromData(data, opts = {}) {
    if (!data || !data.pages) return showAppToast("Nieprawidłowy plik projektu!", "error");
    if (window.__projectLoadMutex) {
        try { await window.__projectLoadMutex; } catch (_e) {}
    }
    let releaseProjectLoadMutex = null;
    const loadMutex = new Promise((resolve) => { releaseProjectLoadMutex = resolve; });
    window.__projectLoadMutex = loadMutex;
    const perfSleepBeforeLoad = (window.__enablePagePerfSleep !== false);
    window.__enablePagePerfSleep = false;
    window.__projectLoadInProgress = true;
    try {
        clearKonvaGlobalDragState();
        if (typeof window.releaseImageMemoryCaches === "function") {
            try { window.releaseImageMemoryCaches(); } catch (_e) {}
        }
        const oldPages = Array.isArray(window.pages) ? window.pages : [];
        oldPages.forEach((p) => {
            const oldStage = p && p.stage;
            if (!oldStage || (typeof oldStage.isDestroyed === "function" && oldStage.isDestroyed())) return;
            try { if (typeof oldStage.stopDrag === "function") oldStage.stopDrag(); } catch (_e) {}
            try { oldStage.destroy(); } catch (_e) {}
        });

        const pagesContainer = document.getElementById("pagesContainer");
        if (pagesContainer) pagesContainer.innerHTML = "";
        window.pages = [];
        const loadStamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        window.__projectLoadStamp = loadStamp;
        window.CATALOG_STYLE = data.catalogStyle || "default";
        setProjectTitle(data.name || DEFAULT_PROJECT_TITLE);

        const savedPages = Array.isArray(data.pages) ? data.pages : [];
        const hydrateNowLimit = getInitialHydratedPagesLimit(opts, savedPages.length);
        const hydratedPages = [];

        for (let i = 0; i < savedPages.length; i++) {
            const savedPage = (savedPages[i] && typeof savedPages[i] === "object") ? savedPages[i] : {};
            const page = window.createNewPage();
            page.__projectLoadStamp = loadStamp;
            if (i < hydrateNowLimit) {
                markPageDeferredHydration(page, null);
                await restoreSavedObjectsForPage(page, savedPage);
                hydratedPages.push(page);
            } else {
                markPageDeferredHydration(page, savedPage);
            }
        }

        if (typeof window.applyCatalogStyleVisual === "function") {
            window.applyCatalogStyleVisual(window.CATALOG_STYLE || "default");
        } else if (typeof window.applyCatalogStyle === "function") {
            window.applyCatalogStyle(window.CATALOG_STYLE || "default");
        }

        runPostLoadRepairsForPages(
            hydratedPages.length ? hydratedPages : (Array.isArray(window.pages) ? window.pages : []),
            { schedule: true }
        );

        if (typeof window.createZoomSlider === "function") {
            window.createZoomSlider();
        } else if (typeof createZoomSlider === "function") {
            createZoomSlider();
        }

        if (!opts.silent) showAppToast("Projekt wczytany!", "success");
        if (!window.projectHistory?.isApplying && typeof window.resetProjectHistory === "function") {
            window.resetProjectHistory(data);
        }
    } finally {
        window.__enablePagePerfSleep = perfSleepBeforeLoad;
        if (typeof window.refreshPagesPerf === "function") {
            setTimeout(() => window.refreshPagesPerf(), 0);
            setTimeout(() => window.refreshPagesPerf(), 120);
        }
        window.__projectLoadInProgress = false;
            try {
                const firstStage = window.pages && window.pages[0] && window.pages[0].stage;
                if (firstStage) {
                    setTimeout(() => {
                        try {
                            window.dispatchEvent(new CustomEvent("canvasModified", { detail: firstStage }));
                        } catch (_e) {}
                    }, 0);
                }
            } catch (_e) {}
            if (releaseProjectLoadMutex) releaseProjectLoadMutex();
            if (window.__projectLoadMutex === loadMutex) window.__projectLoadMutex = null;
    }
}
window.loadProjectFromData = loadProjectFromData;

async function loadProjectFromStorage(path, thumbPath) {
    const fileRef = ref(storage, path);
    const url = await getDownloadURL(fileRef);
    const res = await fetch(url);
    const data = await res.json();
    window.currentProjectMeta = {
        name: data?.name || "",
        path,
        thumbPath: thumbPath || `${THUMBS_FOLDER}/${path.split("/").pop().replace(/\.json$/i, ".jpg")}`
    };
    await loadProjectFromData(data);
    window.currentProjectMeta = {
        name: data?.name || "",
        path,
        thumbPath: thumbPath || `${THUMBS_FOLDER}/${path.split("/").pop().replace(/\.json$/i, ".jpg")}`
    };

    // jeśli brak podglądu — wygeneruj po wczytaniu i zapisz
    const finalThumbPath = thumbPath || `${THUMBS_FOLDER}/${path.split("/").pop().replace(/\.json$/i, ".jpg")}`;
    if (finalThumbPath) {
        const thumb = renderFirstPageThumb();
        if (thumb) {
            try {
                const thumbRef = ref(storage, finalThumbPath);
                await uploadBytes(thumbRef, dataUrlToBlob(thumb), {
                    contentType: "image/jpeg"
                });
            } catch (e) {
                // podgląd opcjonalny — ignoruj błąd
            }
        }
    }
}

// ====================================================================
// 7. OTWARCIE PANELU
// ====================================================================
const savedBtn = document.querySelector('[title="Elementy zapisane"]');
if (savedBtn) {
    savedBtn.onclick = () => {
        savedPanel.style.display = "flex";
        loadSavedProjects();
    };
}

// Usunięto ręczny przycisk generowania podglądów – teraz dzieje się to automatycznie.

// Widoki: start (projekty) vs edytor
function showStartView() {
    const startView = document.getElementById("startProjectsView");
    const editorView = document.getElementById("editorView");
    if (startView) startView.style.display = "block";
    if (editorView) editorView.style.display = "none";
    const list = document.getElementById("startProjectsList");
    if (list) loadSavedProjects(list);
}

function showEditorView() {
    const startView = document.getElementById("startProjectsView");
    const editorView = document.getElementById("editorView");
    if (startView) startView.style.display = "none";
    if (editorView) editorView.style.display = "block";
}
window.showEditorView = showEditorView;

function ensureInitialBlankPage() {
    const hasPages = Array.isArray(window.pages) && window.pages.length > 0;
    if (hasPages) return false;
    if (typeof window.createNewPage !== "function") return false;
    window.createNewPage();
    window.projectOpen = true;
    window.projectDirty = true;
    const pdfButton = document.getElementById("pdfButton");
    if (pdfButton) pdfButton.disabled = false;
    if (typeof window.createZoomSlider === "function") {
        window.createZoomSlider();
    }
    return true;
}

// Klik w logo -> przejście do strony startowej z potwierdzeniem
const homeLogo = document.getElementById("homeLogo");
if (homeLogo) {
    homeLogo.addEventListener("click", async (e) => {
        e.preventDefault();
        const targetUrl = homeLogo.getAttribute("data-start-url") || homeLogo.getAttribute("href") || "kreator.html";
        if (window.projectOpen) {
            const ok = await showLeaveConfirmModal(window.currentProjectName);
            if (!ok) return;
        }
        if (typeof showStartView === "function") {
            showStartView();
            return;
        }
        window.location.href = targetUrl;
    });
}

async function runCreateNewProjectFlow() {
    const chosenName = await showNewProjectNameModal();
    if (chosenName === null) return false;
    if (typeof window.resetUnsavedProjectSession === "function") {
        window.resetUnsavedProjectSession(true);
    }
    if (typeof window.clearAll === "function") {
        window.clearAll();
    }
    const finalProjectName = String(chosenName || "").trim() || "Projekt bez nazwy";
    setProjectTitle(finalProjectName);
    const projectNameInput = document.getElementById("projectNameInput");
    if (projectNameInput) {
        projectNameInput.value = String(chosenName || "").trim();
    }
    window.currentProjectMeta = null;
    window.projectDirty = true;
    showEditorView();
    ensureInitialBlankPage();
    return true;
}

// Nowy projekt: wraca do listy zapisanych (start view)
const newProjectBtn = document.getElementById("newProjectBtn");
if (newProjectBtn) {
    newProjectBtn.addEventListener("click", async () => {
        if (window.projectOpen || shouldAskBeforeLeave()) {
            const ok = await showLeaveConfirmModal(window.currentProjectName);
            if (!ok) return;
        }
        showStartView();
    });
}

// Start view: właściwe tworzenie nowego projektu
const startCreateProjectBtn = document.getElementById("startCreateProjectBtn");
if (startCreateProjectBtn) {
    startCreateProjectBtn.addEventListener("click", async () => {
        await runCreateNewProjectFlow();
    });
}

// Szybki kreator – też pytaj o zapis
window.openQuickCreator = async function() {
    if (window.projectOpen || shouldAskBeforeLeave()) {
        const ok = await showLeaveConfirmModal(window.currentProjectName);
        if (!ok) return;
        if (window._exitToStartTriggered) {
            window._exitToStartTriggered = false;
            return;
        }
    }
    const quickModal = document.getElementById('quickCreatorModal');
    if (quickModal) quickModal.style.display = 'flex';
};

function showReloadConfirmModal(projectName) {
    return new Promise((resolve) => {
        let modal = document.getElementById("reloadConfirmModal");
        if (modal) modal.remove();
        modal = document.createElement("div");
        modal.id = "reloadConfirmModal";
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(8,14,30,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000002;
            backdrop-filter: blur(2px);
        `;
        modal.innerHTML = `
            <div style="width:620px;max-width:92vw;background:#fff;border-radius:18px;padding:22px 22px 18px;box-shadow:0 18px 54px rgba(0,0,0,0.28);font-family:Inter,Arial;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <div style="width:32px;height:32px;border-radius:10px;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-weight:900;">!</div>
                    <h3 style="margin:0;font-size:24px;line-height:1.2;">Odświeżyć stronę?</h3>
                </div>
                <p style="margin:0 0 18px 0;color:#374151;font-size:16px;line-height:1.5;">
                    Projekt <strong>${projectName || "bez nazwy"}</strong> ma niezapisane zmiany. Wybierz, co chcesz zrobić.
                </p>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;">
                    <button id="reloadCancelBtn" style="padding:10px 16px;background:#e5e7eb;border:none;border-radius:10px;cursor:pointer;font-weight:700;">Anuluj</button>
                    <button id="reloadSaveBtn" style="padding:10px 16px;background:#2563eb;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">Zapisz i odśwież</button>
                    <button id="reloadOnlyBtn" style="padding:10px 16px;background:#ef4444;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">Odśwież bez zapisu</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector("#reloadCancelBtn").onclick = () => {
            modal.remove();
            resolve("cancel");
        };
        modal.querySelector("#reloadSaveBtn").onclick = () => {
            modal.remove();
            resolve("save-reload");
        };
        modal.querySelector("#reloadOnlyBtn").onclick = () => {
            modal.remove();
            resolve("reload");
        };
    });
}

window.__skipBeforeUnloadPrompt = false;
function reloadWithoutPrompt() {
    window.__skipBeforeUnloadPrompt = true;
    window.location.reload();
}

async function handleReloadShortcut(e) {
    const isF5 = e.key === "F5";
    const isCtrlR = (e.ctrlKey || e.metaKey) && String(e.key || "").toLowerCase() === "r";
    if (!isF5 && !isCtrlR) return;
    if (!shouldAskBeforeLeave()) return;
    if (document.getElementById("reloadConfirmModal")) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }

    e.preventDefault();
    e.stopPropagation();
    const action = await showReloadConfirmModal(window.currentProjectName);
    if (action === "cancel") return;
    if (action === "reload") {
        reloadWithoutPrompt();
        return;
    }
    if (action === "save-reload") {
        const ok = await saveProjectNow({
            closeModal: false,
            allowUntitled: true,
            skipConflictPrompt: true,
            successToast: false
        });
        if (!ok) return;
        showAppToast("Projekt zapisany. Odświeżam…", "success");
        setTimeout(() => {
            reloadWithoutPrompt();
        }, 160);
    }
}
window.addEventListener("keydown", handleReloadShortcut, true);

// Ostrzeżenie przy odświeżeniu / zamknięciu karty, gdy są niezapisane zmiany
window.addEventListener("beforeunload", (e) => {
    try {
        if (window.__skipBeforeUnloadPrompt) return;
        if (!shouldAskBeforeLeave()) return;
        e.preventDefault();
        e.returnValue = "";
    } catch (_e) {}
});

// Startowa lista projektów po uruchomieniu
window.addEventListener("DOMContentLoaded", () => {
    showStartView();
});

// Bezpieczne zamykanie — działa nawet jeśli modal został zdublowany przez reload
document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target) return;

    const closeBtn = target.closest && target.closest("#closeSavedProjects");
    if (closeBtn) {
        savedPanel.style.display = "none";
        return;
    }

    const overlay = target.closest && target.closest("#savedProjectsModal");
    const panel = target.closest && target.closest("#savedProjectsModal > div");
    if (overlay && !panel) {
        savedPanel.style.display = "none";
    }
});

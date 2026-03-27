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
const PROJECT_LIST_METADATA_CONCURRENCY = 6;
const PROJECT_THUMB_DOWNLOAD_CONCURRENCY = 4;
const PROJECT_INITIAL_PAGE_HYDRATION_CONCURRENCY = 2;
const PAGE_IMAGE_RESTORE_CONCURRENCY = 4;
const PROJECT_COMPRESSION_MIN_BYTES = 1024 * 1024;

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
            pointer-events: none;
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
    toast.style.pointerEvents = "none";
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

function parseLoosePriceNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const compact = raw
        .replace(/\s+/g, "")
        .replace(/[^0-9,.\-]/g, "");
    if (!compact || compact === "-" || compact === "," || compact === "." || compact === "-," || compact === "-.") {
        return null;
    }

    const negative = compact.startsWith("-");
    const unsigned = negative ? compact.slice(1) : compact;
    if (!unsigned) return null;

    const lastComma = unsigned.lastIndexOf(",");
    const lastDot = unsigned.lastIndexOf(".");
    let normalized = unsigned;

    if (lastComma >= 0 || lastDot >= 0) {
        const separatorIndex = Math.max(lastComma, lastDot);
        const integerPart = unsigned.slice(0, separatorIndex).replace(/[.,]/g, "");
        const decimalPart = unsigned.slice(separatorIndex + 1).replace(/[.,]/g, "");
        normalized = `${integerPart || "0"}${decimalPart ? `.${decimalPart}` : ""}`;
    } else {
        normalized = unsigned.replace(/[.,]/g, "");
    }

    if (!normalized || normalized === ".") return null;

    const parsed = Number(`${negative ? "-" : ""}${normalized}`);
    return Number.isFinite(parsed) ? parsed : null;
}

function showPriceEditDialog(options = {}) {
    return new Promise((resolve) => {
        let modal = document.getElementById("priceEditModal");
        if (modal) modal.remove();

        const title = String(options.title || "Edycja ceny").trim();
        const message = String(options.message || "Podaj nową cenę produktu.").trim();
        const confirmText = String(options.confirmText || "Zapisz cenę").trim();
        const cancelText = String(options.cancelText || "Anuluj").trim();
        const initialValue = String(options.value ?? "").trim();

        modal = document.createElement("div");
        modal.id = "priceEditModal";
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(8, 15, 27, 0.56);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000003;
            backdrop-filter: blur(6px);
            padding: 20px;
        `;
        modal.innerHTML = `
            <div style="width:min(520px, calc(100vw - 32px)); background:radial-gradient(360px 180px at 100% 0%, rgba(56,189,248,0.10), transparent 54%), linear-gradient(180deg,#121a2a 0%,#0a101b 100%); border:1px solid rgba(255,255,255,0.08); border-radius:22px; padding:22px; box-shadow:0 28px 70px rgba(0,0,0,0.42); font-family:Inter,Arial,sans-serif;">
                <div style="display:flex; align-items:flex-start; gap:14px;">
                    <div style="width:46px; height:46px; flex:0 0 46px; border-radius:16px; background:rgba(56,189,248,0.14); color:#7dd3fc; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid rgba(255,255,255,0.06);">
                        <i class="fas fa-tag"></i>
                    </div>
                    <div style="min-width:0;">
                        <h3 style="margin:0; font-size:24px; line-height:1.2; color:#f5f7fb; font-weight:800;">${title}</h3>
                        <p style="margin:10px 0 0 0; color:#b7c2d8; font-size:14px; line-height:1.55;">${message}</p>
                    </div>
                </div>
                <div style="margin-top:18px;">
                    <label for="priceEditInput" style="display:block; margin-bottom:8px; color:#dbe7f5; font-size:13px; font-weight:700; letter-spacing:0.02em;">Nowa cena</label>
                    <input id="priceEditInput" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${initialValue.replace(/"/g, "&quot;")}" placeholder="Np. 1,49" style="width:100%; padding:14px 16px; border:1px solid rgba(125,211,252,0.30); border-radius:14px; font-size:26px; font-weight:800; letter-spacing:0.02em; outline:none; background:rgba(255,255,255,0.04); color:#f8fbff; box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);">
                    <div id="priceEditHint" style="margin-top:8px; color:#8fa3bf; font-size:12px; line-height:1.45;">Akceptowane formaty: <strong style="color:#dbeafe;">1,49</strong> albo <strong style="color:#dbeafe;">1.49</strong>.</div>
                    <div id="priceEditError" style="display:none; margin-top:8px; color:#ff8ea1; font-size:13px; font-weight:700;">Wpisz poprawną cenę, np. 1,49.</div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:22px; flex-wrap:wrap;">
                    <button id="priceEditCancelBtn" type="button" style="padding:11px 16px; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg,#202838 0%,#151d2b 100%); color:#f5f7fb; border-radius:12px; cursor:pointer; font-weight:700; font-size:14px;">${cancelText}</button>
                    <button id="priceEditOkBtn" type="button" style="padding:11px 18px; border:none; background:linear-gradient(135deg,#22c55e 0%,#14b8a6 100%); color:#06121a; border-radius:12px; cursor:pointer; font-weight:800; font-size:14px; box-shadow:0 14px 30px rgba(20,184,166,0.22);">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const input = modal.querySelector("#priceEditInput");
        const errorEl = modal.querySelector("#priceEditError");
        const setErrorVisible = (visible) => {
            if (errorEl) errorEl.style.display = visible ? "block" : "none";
            if (input) input.style.borderColor = visible ? "#ff8ea1" : "rgba(125,211,252,0.30)";
        };
        const cleanup = (result) => {
            document.removeEventListener("keydown", onKey, true);
            modal.remove();
            resolve(result);
        };
        const submit = () => {
            const raw = String(input?.value || "").trim();
            const parsed = parseLoosePriceNumber(raw);
            if (!Number.isFinite(parsed)) {
                setErrorVisible(true);
                input?.focus();
                input?.select?.();
                return;
            }
            setErrorVisible(false);
            cleanup(parsed);
        };
        const onKey = (ev) => {
            if (!document.getElementById("priceEditModal")) {
                document.removeEventListener("keydown", onKey, true);
                return;
            }
            if (ev.key === "Escape") {
                ev.preventDefault();
                cleanup(null);
            }
            if (ev.key === "Enter") {
                ev.preventDefault();
                submit();
            }
        };

        document.addEventListener("keydown", onKey, true);
        input?.focus();
        input?.select?.();
        input?.addEventListener("input", () => setErrorVisible(false));
        modal.querySelector("#priceEditCancelBtn").onclick = () => cleanup(null);
        modal.querySelector("#priceEditOkBtn").onclick = submit;
        modal.onclick = (event) => {
            if (event.target === modal) cleanup(null);
        };
    });
}
window.showPriceEditDialog = showPriceEditDialog;

function dataUrlToBlob(dataUrl) {
    const [meta, base64] = dataUrl.split(",");
    const mime = meta.match(/data:([^;]+);/i)?.[1] || "application/octet-stream";
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

function cloneProjectSerializable(value, fallback = null) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_e) {
        return fallback;
    }
}

function cloneSavedPageProducts(products) {
    if (!Array.isArray(products)) return [];
    const cloned = cloneProjectSerializable(products, []);
    return Array.isArray(cloned) ? cloned : [];
}

function supportsProjectCompression() {
    return typeof CompressionStream === "function" && typeof DecompressionStream === "function";
}

async function buildProjectUploadPayload(jsonString) {
    const rawText = String(jsonString || "");
    const rawBlob = new Blob([rawText], { type: "application/json" });
    const rawBytes = rawBlob.size;
    const rawResult = {
        blob: rawBlob,
        rawBytes,
        storedBytes: rawBytes,
        encoding: "identity",
        contentType: "application/json",
        compressed: false
    };

    if (!supportsProjectCompression()) return rawResult;
    if (rawBytes < PROJECT_COMPRESSION_MIN_BYTES) return rawResult;

    try {
        const gzStream = rawBlob.stream().pipeThrough(new CompressionStream("gzip"));
        const gzBlob = await new Response(gzStream).blob();
        const gzBytes = gzBlob.size;
        if (!gzBytes || gzBytes >= (rawBytes - 2048)) {
            return rawResult;
        }
        return {
            blob: gzBlob,
            rawBytes,
            storedBytes: gzBytes,
            encoding: "gzip",
            contentType: "application/gzip",
            compressed: true
        };
    } catch (_e) {
        return rawResult;
    }
}

async function parseProjectDownloadResponse(response, encodingHint = "") {
    const encoding = String(encodingHint || "").trim().toLowerCase();
    if (encoding === "gzip") {
        if (typeof DecompressionStream !== "function") {
            throw new Error("Ta przegladarka nie obsluguje skompresowanych projektow.");
        }
        const blob = await response.blob();
        const text = await new Response(
            blob.stream().pipeThrough(new DecompressionStream("gzip"))
        ).text();
        return JSON.parse(text);
    }
    return await response.json();
}

async function loadProjectDataFromStorageRef(fileRef) {
    const [url, meta] = await Promise.all([
        getDownloadURL(fileRef),
        getMetadata(fileRef).catch(() => null)
    ]);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Nie udalo sie pobrac projektu (${response.status}).`);
    }
    const contentType = String(meta?.contentType || "").trim().toLowerCase();
    const encodingHint = String(meta?.customMetadata?.projectEncoding || "").trim().toLowerCase()
        || (contentType === "application/gzip" ? "gzip" : "identity");
    const data = await parseProjectDownloadResponse(response, encodingHint);
    return { data, meta };
}

async function mapWithConcurrencyLimit(items, concurrency, mapper) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return [];
    const limit = Math.max(1, Number(concurrency) || 1);
    const results = new Array(list.length);
    let cursor = 0;

    async function worker() {
        while (true) {
            const index = cursor++;
            if (index >= list.length) return;
            results[index] = await mapper(list[index], index);
        }
    }

    const workers = [];
    const workerCount = Math.min(limit, list.length);
    for (let i = 0; i < workerCount; i++) workers.push(worker());
    await Promise.all(workers);
    return results;
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
        const renderThumb = () => {
            if (typeof window.exportStageToDataURLWithBackground === "function") {
                return window.exportStageToDataURLWithBackground(stage, {
                    mimeType: "image/jpeg",
                    quality: 0.7,
                    pixelRatio: 0.35,
                    backgroundColor: "#ffffff"
                });
            }
            return stage.toDataURL({
                mimeType: "image/jpeg",
                quality: 0.7,
                pixelRatio: 0.35
            });
        };
        try {
            return renderThumb();
        } catch (e) {
            // fallback: ukryj obrazy (żeby nie taintować canvas)
            const images = stage.find("Image");
            const prev = images.map(n => n.visible());
            images.forEach(n => n.visible(false));
            const thumb = renderThumb();
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

function refreshPdfButtonState() {
    const pdfButton = document.getElementById("pdfButton");
    if (!pdfButton) return false;
    const hasPages = Array.isArray(window.pages) && window.pages.length > 0;
    pdfButton.disabled = !hasPages;
    return hasPages;
}
window.refreshPdfButtonState = refreshPdfButtonState;

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
            background: rgba(4,10,22,0.62);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000000;
            backdrop-filter: blur(6px);
            padding: 20px;
        `;
        modal.innerHTML = `
            <div style="width:min(560px, calc(100vw - 32px)); background:radial-gradient(380px 180px at 100% 0%, rgba(216,255,31,0.08), transparent 52%), linear-gradient(180deg,#121a2a 0%,#0a101b 100%); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:22px; box-shadow:0 24px 64px rgba(0,0,0,0.42); font-family:Inter,Arial; color:#f5f7fb;">
                <h3 style="margin:0 0 12px 0; font-size:24px; font-weight:800; color:#f5f7fb;">Wyjście z projektu</h3>
                <p style="margin:0 0 20px 0; color:#b7c2d8; font-size:16px; line-height:1.5;">
                    Masz otwarty projekt <strong>${projectName || "bez nazwy"}</strong>. Czy na pewno chcesz wyjść bez zapisywania?
                </p>
                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button id="leaveCancelBtn" style="padding:10px 16px; background:linear-gradient(180deg,#202838 0%,#151d2b 100%); color:#f5f7fb; border:1px solid rgba(255,255,255,0.08); border-radius:12px; cursor:pointer; font-weight:700;">Zostań</button>
                    <button id="leaveSaveBtn" style="padding:10px 16px; background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%); color:#fff; border:none; border-radius:12px; cursor:pointer; font-weight:800; box-shadow:0 12px 28px rgba(37,99,235,0.22);">Zapisz</button>
                    <button id="leaveConfirmBtn" style="padding:10px 16px; background:linear-gradient(135deg,#ff5a5f 0%,#ef4444 100%); color:#fff; border:none; border-radius:12px; cursor:pointer; font-weight:800; box-shadow:0 12px 28px rgba(239,68,68,0.22);">Wyjdź</button>
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
            <div style="width:460px;background:linear-gradient(180deg,#0d1320 0%,#09101a 100%);border-radius:20px;padding:20px;box-shadow:0 28px 64px rgba(0,0,0,0.42);border:1px solid rgba(255,255,255,0.08);font-family:Inter,Arial;">
                <h3 style="margin:0 0 12px 0;font-size:30px;font-weight:800;color:#f5f7fb;">Nowy projekt</h3>
                <p style="margin:0 0 14px 0;color:#a6b0c4;font-size:15px;line-height:1.5;">Wpisz nazwę nowego projektu albo wybierz opcję bez nazwy.</p>
                <input id="newProjectNameInput" type="text" placeholder="Np. Promocje marzec" style="width:100%;padding:14px 16px;border:1px solid rgba(255,255,255,0.10);border-radius:14px;font-size:15px;outline:none;background:rgba(255,255,255,0.05);color:#f5f7fb;box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);">
                <div id="newProjectNameError" style="display:none;margin-top:8px;color:#ff7c9a;font-size:13px;font-weight:700;">Wpisz nazwę projektu lub wybierz „Projekt bez nazwy”.</div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap;">
                    <button id="newProjectCancelBtn" style="padding:12px 18px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);color:#f5f7fb;border-radius:14px;cursor:pointer;font-weight:700;">Anuluj</button>
                    <button id="newProjectUnnamedBtn" style="padding:12px 18px;background:linear-gradient(180deg,#202838 0%,#151d2b 100%);color:#f5f7fb;border:1px solid rgba(255,255,255,0.08);border-radius:14px;cursor:pointer;font-weight:700;">Projekt bez nazwy</button>
                    <button id="newProjectCreateBtn" style="padding:12px 18px;background:linear-gradient(135deg,#18c8bb 0%,#31c6c8 100%);color:#071015;border:none;border-radius:14px;cursor:pointer;font-weight:800;box-shadow:0 12px 28px rgba(24,200,187,0.22);">Utwórz</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const input = modal.querySelector("#newProjectNameInput");
        const errorEl = modal.querySelector("#newProjectNameError");
        const showValidation = () => {
            if (errorEl) errorEl.style.display = "block";
            if (input) {
                input.style.borderColor = "#ff7c9a";
                input.focus();
            }
        };
        const clearValidation = () => {
            if (errorEl) errorEl.style.display = "none";
            if (input) input.style.borderColor = "rgba(255,255,255,0.10)";
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
            background: rgba(4,10,22,0.62);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000000;
            backdrop-filter: blur(6px);
            padding: 20px;
        `;
        modal.innerHTML = `
            <div style="width:min(420px, calc(100vw - 32px)); background:radial-gradient(340px 180px at 100% 0%, rgba(58,168,255,0.08), transparent 52%), linear-gradient(180deg,#121a2a 0%,#0a101b 100%); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:18px; box-shadow:0 22px 56px rgba(0,0,0,0.42); font-family:Inter,Arial; color:#f5f7fb;">
                <h3 style="margin:0 0 10px 0; font-size:22px; font-weight:800; color:#f5f7fb;">Zapis projektu</h3>
                <p style="margin:0 0 16px 0; color:#b7c2d8; line-height:1.5;">Projekt <strong>${projectName}</strong> już istnieje. Co chcesz zrobić?</p>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button id="saveChoiceCancel" style="padding:10px 14px; background:linear-gradient(180deg,#202838 0%,#151d2b 100%); color:#f5f7fb; border:1px solid rgba(255,255,255,0.08); border-radius:10px; cursor:pointer; font-weight:700;">Anuluj</button>
                    <button id="saveChoiceNew" style="padding:10px 14px; background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%); color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:800; box-shadow:0 12px 28px rgba(37,99,235,0.22);">Zapisz jako nowy</button>
                    <button id="saveChoiceOverwrite" style="padding:10px 14px; background:linear-gradient(135deg,#18c8bb 0%,#31c6c8 100%); color:#071015; border:none; border-radius:10px; cursor:pointer; font-weight:800; box-shadow:0 12px 28px rgba(24,200,187,0.22);">Nadpisz</button>
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

function showActionConfirmModal(options = {}) {
    return new Promise((resolve) => {
        let modal = document.getElementById("actionConfirmModal");
        if (modal) modal.remove();

        const title = String(options.title || "Potwierdź działanie").trim();
        const message = String(options.message || "Czy chcesz kontynuować?").trim();
        const confirmText = String(options.confirmText || "Potwierdź").trim();
        const cancelText = String(options.cancelText || "Anuluj").trim();
        const tone = String(options.tone || "danger").trim().toLowerCase();
        const confirmBg = tone === "danger" ? "#ef4444" : "#2563eb";
        const confirmShadow = tone === "danger"
            ? "0 12px 28px rgba(239,68,68,0.22)"
            : "0 12px 28px rgba(37,99,235,0.22)";

        modal = document.createElement("div");
        modal.id = "actionConfirmModal";
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.42);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000002;
            backdrop-filter: blur(4px);
            padding: 20px;
        `;
        modal.innerHTML = `
            <div style="width:min(460px, calc(100vw - 32px)); background:radial-gradient(360px 180px at 100% 0%, ${tone === "danger" ? "rgba(239,68,68,0.08)" : "rgba(58,168,255,0.08)"} , transparent 52%), linear-gradient(180deg,#121a2a 0%,#0a101b 100%); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:22px; box-shadow:0 24px 60px rgba(0,0,0,0.42); font-family:Inter,Arial,sans-serif;">
                <div style="display:flex; align-items:flex-start; gap:14px;">
                    <div style="width:42px; height:42px; flex:0 0 42px; border-radius:14px; background:${tone === "danger" ? "rgba(239,68,68,0.14)" : "rgba(37,99,235,0.14)"}; color:${tone === "danger" ? "#ff8a8f" : "#7db7ff"}; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid rgba(255,255,255,0.06);">
                        <i class="fas ${tone === "danger" ? "fa-trash-alt" : "fa-circle-info"}"></i>
                    </div>
                    <div style="min-width:0;">
                        <h3 style="margin:0; font-size:22px; line-height:1.2; color:#f5f7fb; font-weight:800;">${title}</h3>
                        <p style="margin:10px 0 0 0; color:#b7c2d8; font-size:14px; line-height:1.55;">${message}</p>
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:22px;">
                    <button id="actionConfirmCancelBtn" type="button" style="padding:10px 16px; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg,#202838 0%,#151d2b 100%); color:#f5f7fb; border-radius:12px; cursor:pointer; font-weight:700; font-size:14px;">${cancelText}</button>
                    <button id="actionConfirmOkBtn" type="button" style="padding:10px 16px; border:none; background:${confirmBg}; color:#fff; border-radius:12px; cursor:pointer; font-weight:800; font-size:14px; box-shadow:${confirmShadow};">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const onKey = (ev) => {
            if (!document.getElementById("actionConfirmModal")) {
                document.removeEventListener("keydown", onKey, true);
                return;
            }
            if (ev.key === "Escape") {
                ev.preventDefault();
                cleanup(false);
            }
            if (ev.key === "Enter") {
                ev.preventDefault();
                cleanup(true);
            }
        };

        const cleanup = (result) => {
            document.removeEventListener("keydown", onKey, true);
            modal.remove();
            resolve(result);
        };

        modal.querySelector("#actionConfirmCancelBtn").onclick = () => cleanup(false);
        modal.querySelector("#actionConfirmOkBtn").onclick = () => cleanup(true);
        modal.onclick = (e) => {
            if (e.target === modal) cleanup(false);
        };
        document.addEventListener("keydown", onKey, true);
    });
}
window.showActionConfirmModal = showActionConfirmModal;

// ====================================================================
// 1. OTWARCIE OKNA ZAPISU
// ====================================================================
function getTodayIsoDate() {
    return new Date().toISOString().split("T")[0];
}

function getPreferredProjectName(options = {}) {
    const preferMeta = options.preferMeta === true;
    const inputValue = String(document.getElementById("projectNameInput")?.value || "").trim();
    const metaName = String(window.currentProjectMeta?.name || "").trim();
    const currentName = String(window.currentProjectName || "").trim();

    if (preferMeta && metaName) return metaName;
    if (inputValue) return inputValue;
    if (metaName) return metaName;
    if (currentName && currentName !== DEFAULT_PROJECT_TITLE) return currentName;
    return "";
}

function syncSaveFormWithCurrentProject(options = {}) {
    const nameInput = document.getElementById("projectNameInput");
    const dateInput = document.getElementById("projectDateInput");
    const nextName = String(
        options.forceName !== undefined
            ? options.forceName
            : getPreferredProjectName({ preferMeta: options.preferMeta === true })
    ).trim();
    const nextDate = String(
        options.forceDate !== undefined
            ? options.forceDate
            : (dateInput?.value || getTodayIsoDate())
    ).trim();

    if (nameInput && (options.overwriteName === true || !String(nameInput.value || "").trim())) {
        nameInput.value = nextName;
    }
    if (dateInput && (options.overwriteDate === true || !String(dateInput.value || "").trim())) {
        dateInput.value = nextDate;
    }
}

function openSaveProjectModal() {
    const modal = document.getElementById("saveProjectModal");
    syncSaveFormWithCurrentProject();
    modal.style.display = "flex";
}

async function triggerProjectSaveFlow(options = {}) {
    const forceModal = options.forceModal === true;
    const hasSavedTarget = !!String(window.currentProjectMeta?.path || "").trim();

    if (hasSavedTarget && !forceModal) {
        syncSaveFormWithCurrentProject({
            preferMeta: true,
            overwriteName: true,
            overwriteDate: false
        });
        return await saveProjectNow({
            closeModal: false,
            allowUntitled: true,
            skipConflictPrompt: true
        });
    }

    openSaveProjectModal();
    return null;
}
window.triggerProjectSaveFlow = triggerProjectSaveFlow;

document.getElementById("saveProjectBtn").onclick = () => {
    void triggerProjectSaveFlow();
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

function normalizeSavedImageRole(input = {}) {
    const rawSlot = Number(input && input.slotIndex);
    const hasRawSlot = Number.isFinite(rawSlot);

    const isOverlayElement = !!(input && input.isOverlayElement);
    const isTNZBadge = !!(input && input.isTNZBadge);
    const isCountryBadge = !!(input && input.isCountryBadge);
    const isSlotScopedOverlay = isOverlayElement || isTNZBadge || isCountryBadge;

    const isProductImage = !!(input && input.isProductImage);
    const explicitUser = !!(input && (input.isUserImage || input.isSidebarImage));
    const looksLikeFreeDesign = !!(
        input &&
        input.isDesignElement &&
        !isSlotScopedOverlay &&
        !input.isBarcode &&
        !input.isQRCode &&
        !input.isEAN
    );
    const freeUserImage = explicitUser || (looksLikeFreeDesign && !isProductImage);

    const normalizedProduct = !!(isProductImage && hasRawSlot && !freeUserImage);
    const normalizedSlot = (normalizedProduct || isSlotScopedOverlay) && hasRawSlot
        ? rawSlot
        : null;
    const normalizedUser = !!(freeUserImage || (!normalizedProduct && !isSlotScopedOverlay));
    const normalizedSidebar = !!(input && input.isSidebarImage) || (normalizedUser && !normalizedProduct && !isSlotScopedOverlay);
    const normalizedDesignElement = !!(
        (input && input.isDesignElement) ||
        (normalizedUser && !normalizedProduct && !isSlotScopedOverlay)
    );

    return {
        slotIndex: Number.isFinite(normalizedSlot) ? normalizedSlot : null,
        hasSlot: Number.isFinite(normalizedSlot),
        isProductImage: normalizedProduct,
        isUserImage: normalizedUser,
        isSidebarImage: normalizedSidebar,
        isDesignElement: normalizedDesignElement
    };
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

            const syncTextMetrics = (node, opts = {}) => {
                if (!node || typeof node.measureSize !== "function") return;
                const measured = node.measureSize(String(node.text?.() || ""));
                const measuredW = Number(measured?.width);
                const measuredH = Number(measured?.height);
                const extraPad = Math.max(0, Number(opts.extraPad) || 0);
                const minWidth = Math.max(0, Number(opts.minWidth) || 0);
                const minHeight = Math.max(0, Number(opts.minHeight) || 0);
                if (Number.isFinite(measuredW) && measuredW > 0 && typeof node.width === "function") {
                    node.width(Math.max(minWidth, Math.ceil(measuredW + extraPad)));
                }
                if (Number.isFinite(measuredH) && measuredH > 0 && typeof node.height === "function") {
                    node.height(Math.max(minHeight, Math.ceil(measuredH + Math.min(2, extraPad))));
                }
            };

            syncTextMetrics(mainNode, { extraPad: 4, minWidth: 8, minHeight: 8 });
            syncTextMetrics(decNode, { extraPad: 4, minWidth: 8, minHeight: 8 });
            syncTextMetrics(unitNode, { extraPad: 8, minWidth: 24, minHeight: 8 });

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

function normalizeLoadedProductGroupsForPages(targetPages) {
    try {
        const pagesList = collectTargetPages(targetPages);
        pagesList.forEach((page) => {
            const layer = page && page.layer;
            if (!page || !layer || typeof layer.find !== "function" || !window.Konva) return;

            const isProductModuleNode = (node) => isProductGroupingNode(node);

            const getTopUserGroupAncestor = (node) => {
                let current = node;
                let found = null;
                while (current && current.getParent) {
                    const parent = current.getParent();
                    if (!(parent instanceof Konva.Group)) break;
                    if (parent.getAttr && parent.getAttr("isUserGroup")) found = parent;
                    current = parent;
                }
                return found;
            };

            const addNodeMeta = (node, slotSet, directSet) => {
                if (!node || !node.getAttr) return;
                const direct = String(node.getAttr("directModuleId") || "").trim();
                const slot = Number(node.getAttr("slotIndex"));
                const preserved = Number(node.getAttr("preservedSlotIndex"));
                if (direct) directSet.add(direct);
                if (Number.isFinite(slot)) slotSet.add(slot);
                if (Number.isFinite(preserved)) slotSet.add(preserved);
            };

            const moveNodeToGroupPreserveAbsolute = (node, group) => {
                if (!node || !group || typeof node.moveTo !== "function") return;
                const abs = typeof node.getAbsolutePosition === "function"
                    ? node.getAbsolutePosition()
                    : { x: Number(node.x?.() || 0), y: Number(node.y?.() || 0) };
                if (node.setAttr && node.getAttr("_wasDraggableBeforeUserGroup") == null && typeof node.draggable === "function") {
                    node.setAttr("_wasDraggableBeforeUserGroup", !!node.draggable());
                }
                if (typeof node.draggable === "function") node.draggable(false);
                node.moveTo(group);
                if (typeof node.absolutePosition === "function") node.absolutePosition(abs);
                else if (typeof node.setAbsolutePosition === "function") node.setAbsolutePosition(abs);
            };

            const ensureRecord = (map, key) => {
                if (!map.has(key)) {
                    map.set(key, {
                        key,
                        slot: null,
                        directId: "",
                        groups: [],
                        looseNodes: []
                    });
                }
                return map.get(key);
            };

            const moduleMap = new Map();
            const topLevelGroups = typeof layer.getChildren === "function"
                ? ((typeof layer.getChildren().toArray === "function" ? layer.getChildren().toArray() : Array.from(layer.getChildren())).filter((n) => n instanceof Konva.Group))
                : [];

            topLevelGroups.forEach((group) => {
                if (!group || !group.find) return;
                const descendants = group.find((n) => isProductModuleNode(n));
                if (!descendants || !descendants.length) return;

                const slotSet = new Set();
                const directSet = new Set();
                addNodeMeta(group, slotSet, directSet);
                descendants.forEach((node) => addNodeMeta(node, slotSet, directSet));

                const directId = directSet.size === 1 ? Array.from(directSet)[0] : "";
                const slot = slotSet.size === 1 ? Array.from(slotSet)[0] : null;
                if (!directId && !Number.isFinite(slot)) return;

                const key = directId ? `direct:${directId}` : `slot:${slot}`;
                const record = ensureRecord(moduleMap, key);
                if (directId) record.directId = directId;
                if (Number.isFinite(slot)) record.slot = slot;
                record.groups.push(group);
            });

            layer.find((node) => {
                if (!isProductModuleNode(node)) return false;
                return !getTopUserGroupAncestor(node);
            }).forEach((node) => {
                const slotSet = new Set();
                const directSet = new Set();
                addNodeMeta(node, slotSet, directSet);
                const directId = directSet.size === 1 ? Array.from(directSet)[0] : "";
                const slot = slotSet.size === 1 ? Array.from(slotSet)[0] : null;
                if (!directId && !Number.isFinite(slot)) return;

                const key = directId ? `direct:${directId}` : `slot:${slot}`;
                const record = ensureRecord(moduleMap, key);
                if (directId) record.directId = directId;
                if (Number.isFinite(slot)) record.slot = slot;
                record.looseNodes.push(node);
            });

            moduleMap.forEach((record) => {
                const groups = Array.isArray(record.groups) ? record.groups.filter(Boolean) : [];
                let primaryGroup = groups[0] || null;

                if (!primaryGroup && Array.isArray(record.looseNodes) && record.looseNodes.length >= 2) {
                    primaryGroup = new Konva.Group({
                        x: 0,
                        y: 0,
                        draggable: true,
                        listening: true,
                        name: "userGroup"
                    });
                    layer.add(primaryGroup);
                }
                if (!primaryGroup) return;

                if (typeof primaryGroup.name === "function") primaryGroup.name("userGroup");
                if (typeof primaryGroup.draggable === "function") primaryGroup.draggable(true);
                if (typeof primaryGroup.listening === "function") primaryGroup.listening(true);
                if (primaryGroup.setAttr) {
                    primaryGroup.setAttr("isUserGroup", true);
                    primaryGroup.setAttr("selectable", true);
                    primaryGroup.setAttr("_dragNeedsArming", false);
                    primaryGroup.setAttr("_dragPendingEnable", false);
                    if (Number.isFinite(record.slot)) {
                        primaryGroup.setAttr("isAutoSlotGroup", true);
                        primaryGroup.setAttr("preservedSlotIndex", record.slot);
                        primaryGroup.setAttr("slotIndex", null);
                    }
                    if (record.directId) {
                        primaryGroup.setAttr("directModuleId", record.directId);
                    }
                }

                const extraGroups = groups.slice(1);
                extraGroups.forEach((extraGroup) => {
                    if (!extraGroup || extraGroup === primaryGroup || !extraGroup.getChildren) return;
                    const children = typeof extraGroup.getChildren().toArray === "function"
                        ? extraGroup.getChildren().toArray()
                        : Array.from(extraGroup.getChildren());
                    children.forEach((child) => moveNodeToGroupPreserveAbsolute(child, primaryGroup));
                    if (typeof extraGroup.destroy === "function") extraGroup.destroy();
                });

                const looseNodes = Array.isArray(record.looseNodes) ? record.looseNodes : [];
                looseNodes.forEach((node) => {
                    if (!node || (node.getParent && node.getParent() === primaryGroup)) return;
                    moveNodeToGroupPreserveAbsolute(node, primaryGroup);
                });

                const descendants = primaryGroup.find ? primaryGroup.find((n) => isProductModuleNode(n)) : [];
                descendants.forEach((child) => {
                    if (!child || !child.getAttr) return;
                    if (typeof child.draggable === "function") child.draggable(false);
                    if (child.setAttr && Number.isFinite(record.slot) && !Number.isFinite(Number(child.getAttr("slotIndex")))) {
                        child.setAttr("slotIndex", record.slot);
                    }
                    if (child.setAttr && record.directId && !String(child.getAttr("directModuleId") || "").trim()) {
                        child.setAttr("directModuleId", record.directId);
                    }
                });
            });

            topLevelGroups.forEach((group) => {
                if (!(group instanceof Konva.Group)) return;
                if (group.getAttr && group.getAttr("isPriceGroup")) return;
                const children = typeof group.getChildren === "function" ? group.getChildren() : [];
                if (children && children.length === 0 && typeof group.destroy === "function") {
                    group.destroy();
                }
            });

            const slotImages = [];
            const slotBarcodes = [];
            const allSlotIndexes = new Set();
            layer.find((node) => {
                if (!node || !node.getAttr) return false;
                const slot = Number(node.getAttr("slotIndex"));
                const preserved = Number(node.getAttr("preservedSlotIndex"));
                return Number.isFinite(slot) || Number.isFinite(preserved);
            }).forEach((node) => {
                const slot = Number(node.getAttr("slotIndex"));
                const preserved = Number(node.getAttr("preservedSlotIndex"));
                const finalSlot = Number.isFinite(slot) ? slot : preserved;
                if (!Number.isFinite(finalSlot)) return;
                allSlotIndexes.add(finalSlot);
                if (node.getAttr("isProductImage") && !slotImages[finalSlot]) slotImages[finalSlot] = node;
                if (node.getAttr("isBarcode") && !slotBarcodes[finalSlot]) slotBarcodes[finalSlot] = node;
            });

            if (!Array.isArray(page.slotObjects)) page.slotObjects = [];
            if (!Array.isArray(page.barcodeObjects)) page.barcodeObjects = [];
            const maxSlot = allSlotIndexes.size ? Math.max(...Array.from(allSlotIndexes)) : -1;
            if (maxSlot >= 0) {
                page.slotObjects.length = Math.max(page.slotObjects.length, maxSlot + 1);
                page.barcodeObjects.length = Math.max(page.barcodeObjects.length, maxSlot + 1);
                for (let i = 0; i <= maxSlot; i++) {
                    if (slotImages[i]) page.slotObjects[i] = slotImages[i];
                    if (slotBarcodes[i]) page.barcodeObjects[i] = slotBarcodes[i];
                }
            }

            page.selectedNodes = [];
            page._priorityClickTarget = null;
            page.transformer?.nodes?.([]);
            try { page.layer.find(".selectionOutline").forEach((n) => n.destroy()); } catch (_e) {}
            try { page.hideFloatingButtons?.(); } catch (_e) {}
            try { page.hidePageFloatingMenu?.(); } catch (_e) {}
            layer.batchDraw?.();
            page.transformerLayer?.batchDraw?.();
        });

        try { document.getElementById("floatingMenu")?.remove(); } catch (_e) {}
        try { document.getElementById("floatingSubmenu")?.remove(); } catch (_e) {}
        try { document.getElementById("groupQuickMenu")?.remove(); } catch (_e) {}
    } catch (_e) {}
}

function reconstructAutoSlotGroupsForPages(targetPages) {
    try {
        const pagesList = collectTargetPages(targetPages);
        pagesList.forEach((page) => {
            const layer = page && page.layer;
            if (!page || !layer || typeof layer.find !== "function" || !window.Konva) return;

            const existingManagedSlots = new Set();
            layer.find((n) =>
                n instanceof Konva.Group &&
                n.getAttr &&
                n.getAttr("isUserGroup") &&
                n.getAttr("isAutoSlotGroup")
            ).forEach((group) => {
                const direct = Number(group.getAttr("slotIndex"));
                const preserved = Number(group.getAttr("preservedSlotIndex"));
                const slot = Number.isFinite(direct) ? direct : preserved;
                if (Number.isFinite(slot)) existingManagedSlots.add(slot);
            });

            const slotMap = new Map();
            layer.find((node) => {
                if (!node || !node.getAttr) return false;
                if (node instanceof Konva.Group && node.getAttr("isUserGroup")) return false;
                const slot = Number(node.getAttr("slotIndex"));
                if (!Number.isFinite(slot)) return false;
                return isProductGroupingNode(node);
            }).forEach((node) => {
                const slot = Number(node.getAttr("slotIndex"));
                if (!Number.isFinite(slot) || existingManagedSlots.has(slot)) return;
                if (!slotMap.has(slot)) slotMap.set(slot, []);
                slotMap.get(slot).push(node);
            });

            slotMap.forEach((nodes, slot) => {
                if (!Array.isArray(nodes) || nodes.length < 2) return;
                const sortedNodes = nodes.slice().sort((a, b) => {
                    const az = typeof a.getZIndex === "function" ? Number(a.getZIndex()) || 0 : 0;
                    const bz = typeof b.getZIndex === "function" ? Number(b.getZIndex()) || 0 : 0;
                    return az - bz;
                });
                const firstRect = sortedNodes[0]?.getClientRect?.({ relativeTo: layer });
                const anchorX = Number(firstRect?.x || sortedNodes[0]?.x?.() || 0);
                const anchorY = Number(firstRect?.y || sortedNodes[0]?.y?.() || 0);
                const group = new Konva.Group({
                    x: 0,
                    y: 0,
                    draggable: true,
                    listening: true,
                    name: "userGroup"
                });
                group.setAttrs({
                    isUserGroup: true,
                    isAutoSlotGroup: true,
                    preservedSlotIndex: slot,
                    slotIndex: null,
                    selectable: true
                });
                layer.add(group);
                sortedNodes.forEach((node) => {
                    const abs = typeof node.getAbsolutePosition === "function" ? node.getAbsolutePosition() : { x: node.x?.() || 0, y: node.y?.() || 0 };
                    if (node.setAttr && node.getAttr("_wasDraggableBeforeUserGroup") == null && typeof node.draggable === "function") {
                        node.setAttr("_wasDraggableBeforeUserGroup", !!node.draggable());
                    }
                    if (typeof node.draggable === "function") node.draggable(false);
                    node.moveTo(group);
                    if (typeof node.absolutePosition === "function") node.absolutePosition(abs);
                    else if (typeof node.setAbsolutePosition === "function") node.setAbsolutePosition(abs);
                });
                if (typeof group.x === "function") group.x(anchorX);
                if (typeof group.y === "function") group.y(anchorY);
                group.getChildren?.().forEach((child) => {
                    if (typeof child.x === "function") child.x((Number(child.x()) || 0) - anchorX);
                    if (typeof child.y === "function") child.y((Number(child.y()) || 0) - anchorY);
                });
            });

            page.selectedNodes = [];
            page.transformer?.nodes?.([]);
            layer.batchDraw?.();
            page.transformerLayer?.batchDraw?.();
        });
    } catch (_e) {}
}

function restoreSavedUserProductGroupsForPages(targetPages) {
    try {
        const pagesList = collectTargetPages(targetPages);
        pagesList.forEach((page) => {
            const layer = page && page.layer;
            const savedGroups = normalizeSavedUserProductGroups(
                page?.__savedUserProductGroups ||
                page?.__deferredHydrationPayload?.userProductGroups ||
                page?.__deferredHydrationPayload?.groupedProductKeys
            );
            if (!page || !layer || !savedGroups.length || !window.Konva) return;

            const layerChildren = typeof layer.getChildren === "function"
                ? (typeof layer.getChildren().toArray === "function" ? layer.getChildren().toArray() : Array.from(layer.getChildren() || []))
                : [];

            const getTopUserGroupAncestor = (node) => {
                let current = node;
                while (current && current.getParent) {
                    const parent = current.getParent();
                    if (!(parent instanceof Konva.Group)) break;
                    if (parent.getAttr && parent.getAttr("isUserGroup")) return parent;
                    current = parent;
                }
                return null;
            };

            const getGroupKeys = (group) => {
                if (!(group instanceof Konva.Group) || !group.find) return [];
                const descendants = group.find((node) => isSavedProductModuleNode(node));
                return Array.from(new Set(descendants.map((node) => getSavedProductGroupKeyFromNode(node)).filter(Boolean))).sort();
            };

            const sameKeys = (left, right) => {
                if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
                return left.every((item, index) => item === right[index]);
            };

            const moveNodeToGroupPreserveAbsolute = (node, group) => {
                if (!node || !group || typeof node.moveTo !== "function") return;
                const abs = typeof node.getAbsolutePosition === "function"
                    ? node.getAbsolutePosition()
                    : { x: Number(node.x?.() || 0), y: Number(node.y?.() || 0) };
                if (node.setAttr && node.getAttr("_wasDraggableBeforeUserGroup") == null && typeof node.draggable === "function") {
                    node.setAttr("_wasDraggableBeforeUserGroup", !!node.draggable());
                }
                if (typeof node.draggable === "function") node.draggable(false);
                node.moveTo(group);
                if (typeof node.absolutePosition === "function") node.absolutePosition(abs);
                else if (typeof node.setAbsolutePosition === "function") node.setAbsolutePosition(abs);
            };

            const applyGroupMeta = (group, blueprint) => {
                if (!(group instanceof Konva.Group)) return;
                if (typeof group.name === "function") group.name("userGroup");
                if (typeof group.draggable === "function") group.draggable(true);
                if (typeof group.listening === "function") group.listening(true);
                if (!group.setAttr) return;
                group.setAttr("isUserGroup", true);
                group.setAttr("selectable", true);
                group.setAttr("_dragNeedsArming", false);
                group.setAttr("_dragPendingEnable", false);
                if (blueprint.keys.length === 1 && (blueprint.isAutoSlotGroup || Number.isFinite(blueprint.slotIndex))) {
                    group.setAttr("isAutoSlotGroup", true);
                    group.setAttr("preservedSlotIndex", blueprint.slotIndex);
                    group.setAttr("slotIndex", null);
                } else {
                    group.setAttr("isAutoSlotGroup", false);
                    group.setAttr("preservedSlotIndex", null);
                }
                if (blueprint.directModuleId) {
                    group.setAttr("directModuleId", blueprint.directModuleId);
                } else {
                    group.setAttr("directModuleId", null);
                }
            };

            const topGroups = layerChildren.filter((node) => node instanceof Konva.Group && node.getAttr && node.getAttr("isUserGroup"));
            const existingGroups = topGroups.map((group) => ({ group, keys: getGroupKeys(group) }));
            const looseNodes = layer.find((node) => isSavedProductModuleNode(node) && !getTopUserGroupAncestor(node));
            const handledKeys = new Set();

            savedGroups
                .slice()
                .sort((a, b) => b.keys.length - a.keys.length)
                .forEach((blueprint) => {
                    const desiredKeys = Array.from(new Set((blueprint.keys || []).filter((key) => !handledKeys.has(key)))).sort();
                    if (!desiredKeys.length) return;

                    const exact = existingGroups.find((entry) => sameKeys(entry.keys, desiredKeys));
                    if (exact) {
                        applyGroupMeta(exact.group, { ...blueprint, keys: desiredKeys });
                        desiredKeys.forEach((key) => handledKeys.add(key));
                        return;
                    }

                    const subsetGroups = existingGroups.filter((entry) =>
                        entry.keys.length &&
                        entry.keys.every((key) => desiredKeys.includes(key)) &&
                        entry.keys.some((key) => desiredKeys.includes(key))
                    );

                    let primaryGroup = subsetGroups[0]?.group || null;
                    if (!primaryGroup) {
                        primaryGroup = new Konva.Group({
                            x: 0,
                            y: 0,
                            draggable: true,
                            listening: true,
                            name: "userGroup"
                        });
                        layer.add(primaryGroup);
                    }

                    applyGroupMeta(primaryGroup, { ...blueprint, keys: desiredKeys });

                    subsetGroups.slice(primaryGroup === subsetGroups[0]?.group ? 1 : 0).forEach((entry) => {
                        const sourceGroup = entry.group;
                        if (!sourceGroup || sourceGroup === primaryGroup || !sourceGroup.getChildren) return;
                        const children = typeof sourceGroup.getChildren().toArray === "function"
                            ? sourceGroup.getChildren().toArray()
                            : Array.from(sourceGroup.getChildren() || []);
                        children.forEach((child) => moveNodeToGroupPreserveAbsolute(child, primaryGroup));
                        if (typeof sourceGroup.destroy === "function") sourceGroup.destroy();
                    });

                    looseNodes
                        .filter((node) => desiredKeys.includes(getSavedProductGroupKeyFromNode(node)))
                        .forEach((node) => {
                            if (!node || (node.getParent && node.getParent() === primaryGroup)) return;
                            moveNodeToGroupPreserveAbsolute(node, primaryGroup);
                        });

                    desiredKeys.forEach((key) => handledKeys.add(key));
                });

            layer.batchDraw?.();
            page.transformerLayer?.batchDraw?.();
        });
    } catch (_e) {}
}

function runPostLoadRepairsForPages(targetPages, opts = {}) {
    const pagesList = collectTargetPages(targetPages);
    if (!pagesList.length) return;

    normalizeLoadedProductGroupsForPages(pagesList);
    reconstructAutoSlotGroupsForPages(pagesList);
    restoreSavedUserProductGroupsForPages(pagesList);
    normalizeLoadedProductGroupsForPages(pagesList);
    restoreDirectTextStylesForPages(pagesList);
    stabilizePriceGroupsForPages(pagesList);
    restoreDirectModuleSelectabilityForPages(pagesList);

    if (opts.schedule === false) return;

    PROJECT_POST_REPAIR_STYLE_DELAYS.forEach((ms) => {
        setTimeout(() => normalizeLoadedProductGroupsForPages(pagesList), ms);
        setTimeout(() => restoreSavedUserProductGroupsForPages(pagesList), ms);
        setTimeout(() => restoreDirectTextStylesForPages(pagesList), ms);
    });
    PROJECT_POST_REPAIR_PRICE_DELAYS.forEach((ms) => {
        setTimeout(() => normalizeLoadedProductGroupsForPages(pagesList), ms);
        setTimeout(() => reconstructAutoSlotGroupsForPages(pagesList), ms);
        setTimeout(() => restoreSavedUserProductGroupsForPages(pagesList), ms);
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
    try {
        if (window.APP_FONT_LOADER_PROMISE && typeof window.APP_FONT_LOADER_PROMISE.then === "function") {
            window.APP_FONT_LOADER_PROMISE.then(() => {
                stabilizePriceGroupsForPages(pagesList);
                restoreDirectTextStylesForPages(pagesList);
                setTimeout(() => stabilizePriceGroupsForPages(pagesList), 120);
            }).catch(() => {});
        }
    } catch (_e) {}
}

async function restoreDirectNodeRecursiveFromPayload(payload, page, layer) {
    if (!payload || !window.Konva) return null;
    if (!isPageHydrationContextActive(page)) return null;

    const restoreSavedDirectShapeFill = async (node, attrs) => {
        const safeAttrs = attrs && typeof attrs === "object" ? attrs : {};
        const imageUrl = String(safeAttrs.shapeFillImageUrl || "").trim();
        if (!imageUrl) return;
        const applyFill = window.CustomStyleDirectHooks && window.CustomStyleDirectHooks.applyImageFillToShapeNode;
        if (typeof applyFill !== "function") return;
        try {
            await applyFill(node, imageUrl, String(safeAttrs.shapeFillFallbackColor || safeAttrs.fill || ""));
        } catch (_e) {}
    };

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
        if (typeof editFn === "function" && (
            t.getAttr("isName") ||
            t.getAttr("isIndex") ||
            t.getAttr("isProductText") ||
            t.getAttr("isCustomPackageInfo") ||
            t.getAttr("isSidebarText") ||
            t.getAttr("isUserText")
        )) {
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
        await restoreSavedDirectShapeFill(r, payload.attrs);
        return r;
    }

    if (payload.type === "circleNode") {
        const c = new Konva.Circle({
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            radius: payload.radius || 0,
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
        if (payload.attrs) c.setAttrs(payload.attrs);
        await restoreSavedDirectShapeFill(c, payload.attrs);
        return c;
    }

    if (payload.type === "lineNode") {
        const l = new Konva.Line({
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            points: Array.isArray(payload.points) ? payload.points.slice() : [0, 0, 0, 0],
            scaleX: payload.scaleX || 1,
            scaleY: payload.scaleY || 1,
            rotation: payload.rotation || 0,
            stroke: payload.stroke || "#111111",
            strokeWidth: payload.strokeWidth,
            opacity: payload.opacity ?? 1,
            draggable: payload.draggable === true,
            listening: payload.listening !== false
        });
        if (payload.attrs) l.setAttrs(payload.attrs);
        return l;
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
                const role = normalizeSavedImageRole({
                    slotIndex: payload && payload.attrs ? payload.attrs.slotIndex : null,
                    isProductImage: payload && payload.attrs ? payload.attrs.isProductImage : false,
                    isUserImage: payload && payload.attrs ? payload.attrs.isUserImage : false,
                    isSidebarImage: payload && payload.attrs ? payload.attrs.isSidebarImage : false,
                    isDesignElement: payload && payload.attrs ? payload.attrs.isDesignElement : false,
                    isOverlayElement: payload && payload.attrs ? payload.attrs.isOverlayElement : false,
                    isTNZBadge: payload && payload.attrs ? payload.attrs.isTNZBadge : false,
                    isCountryBadge: payload && payload.attrs ? payload.attrs.isCountryBadge : false,
                    isBarcode: payload && payload.attrs ? payload.attrs.isBarcode : false,
                    isQRCode: payload && payload.attrs ? payload.attrs.isQRCode : false,
                    isEAN: payload && payload.attrs ? payload.attrs.isEAN : false
                });
                if (k.setAttr) {
                    k.setAttr("slotIndex", role.slotIndex);
                    k.setAttr("isProductImage", role.isProductImage);
                    k.setAttr("isUserImage", role.isUserImage);
                    k.setAttr("isSidebarImage", role.isSidebarImage);
                    k.setAttr("isDesignElement", role.isDesignElement);
                    if (role.isUserImage && safeCrop) {
                        const meaningfulCrop = (
                            Number(safeCrop.x || 0) > 0.5 ||
                            Number(safeCrop.y || 0) > 0.5 ||
                            Number(safeCrop.width || 0) < (Number(img.naturalWidth || 0) - 0.5) ||
                            Number(safeCrop.height || 0) < (Number(img.naturalHeight || 0) - 0.5)
                        );
                        if (meaningfulCrop) k.setAttr("_userCropTouched", true);
                    }
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

function createSavedImageNodeFromObject(obj, page) {
    return new Promise((resolve) => {
        if (!isPageHydrationContextActive(page)) {
            resolve(null);
            return;
        }
        const renderSrc = String(obj.editorSrc || obj.src || obj.thumbSrc || "").trim();
        const thumbSrc = String(obj.thumbSrc || renderSrc || obj.src || "").trim();
        const img = new Image();
        img.onload = () => {
            if (!isPageHydrationContextActive(page)) {
                resolve(null);
                return;
            }
            const safeCrop = normalizeSavedCrop(obj.crop, img.naturalWidth, img.naturalHeight);
            const role = normalizeSavedImageRole({
                slotIndex: obj.slotIndex,
                isProductImage: obj.isProductImage,
                isUserImage: obj.isUserImage,
                isSidebarImage: obj.isSidebarImage,
                isDesignElement: obj.isDesignElement,
                isOverlayElement: obj.isOverlayElement,
                isTNZBadge: obj.isTNZBadge,
                isCountryBadge: obj.isCountryBadge
            });
            const k = new Konva.Image({
                x: obj.x,
                y: obj.y,
                image: img,
                width: obj.width || img.naturalWidth,
                height: obj.height || img.naturalHeight,
                scaleX: obj.scaleX || 1,
                scaleY: obj.scaleY || 1,
                rotation: obj.rotation || 0,
                draggable: obj.draggable !== false,
                listening: obj.listening !== false,
                visible: obj.visible !== false,
                opacity: obj.opacity ?? 1,
                name: obj.name || ""
            });
            if (safeCrop && typeof k.crop === "function") {
                k.crop(safeCrop);
            }
            k.setAttr("slotIndex", role.slotIndex);
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
            k.setAttr("isProductImage", role.isProductImage);
            k.setAttr("isUserImage", role.isUserImage);
            k.setAttr("isSidebarImage", role.isSidebarImage);
            k.setAttr("isDesignElement", role.isDesignElement);
            if (role.isUserImage && safeCrop) {
                const meaningfulCrop = (
                    Number(safeCrop.x || 0) > 0.5 ||
                    Number(safeCrop.y || 0) > 0.5 ||
                    Number(safeCrop.width || 0) < (Number(img.naturalWidth || 0) - 0.5) ||
                    Number(safeCrop.height || 0) < (Number(img.naturalHeight || 0) - 0.5)
                );
                if (meaningfulCrop) k.setAttr("_userCropTouched", true);
            }
            k.setAttr("isOverlayElement", obj.isOverlayElement || false);
            k.setAttr("isTNZBadge", obj.isTNZBadge || false);
            k.setAttr("isCountryBadge", obj.isCountryBadge || false);
            if (typeof k.shadowColor === "function" && obj.shadowColor != null) {
                k.shadowColor(obj.shadowColor);
            }
            if (typeof k.shadowBlur === "function" && Number.isFinite(Number(obj.shadowBlur))) {
                k.shadowBlur(Number(obj.shadowBlur));
            }
            if (typeof k.shadowOffset === "function") {
                k.shadowOffset({
                    x: Number(obj.shadowOffsetX || 0),
                    y: Number(obj.shadowOffsetY || 0)
                });
            }
            if (typeof k.shadowOpacity === "function" && Number.isFinite(Number(obj.shadowOpacity))) {
                k.shadowOpacity(Number(obj.shadowOpacity));
            }
            if (typeof k.stroke === "function" && obj.stroke != null) {
                k.stroke(obj.stroke);
            }
            if (typeof k.strokeWidth === "function" && Number.isFinite(Number(obj.strokeWidth))) {
                k.strokeWidth(Number(obj.strokeWidth));
            }
            if (obj.imageFX && k.setAttr) {
                try { k.setAttr("imageFX", cloneStyleValue(obj.imageFX)); } catch (_e) {}
            }
            if (typeof k.imageSmoothingEnabled === "function") {
                k.imageSmoothingEnabled(true);
            }
            if (obj.imageFX && typeof window.ensureImageFX === "function") {
                try { window.ensureImageFX(k, page.layer); } catch (_e) {}
            }
            if (obj.imageFX && typeof window.applyImageFX === "function") {
                try { window.applyImageFX(k); } catch (_e) {}
            }
            if ((obj.isCatalogBanner || obj.name === "banner") && typeof window.bindCatalogBannerNode === "function") {
                window.bindCatalogBannerNode(page, k, {
                    state: {
                        x: Number(obj.x) || 0,
                        y: Number(obj.y) || 0,
                        scaleX: Number(obj.scaleX) || 1,
                        scaleY: Number(obj.scaleY) || 1,
                        rotation: Number(obj.rotation) || 0,
                        width: Math.max(1, Number(obj.width) || Number(img.naturalWidth) || 1),
                        height: Math.max(1, Number(obj.height) || Number(img.naturalHeight) || 1)
                    },
                    sourceWidth: Math.max(1, Number(obj.width) || Number(img.naturalWidth) || 1),
                    sourceHeight: Math.max(1, Number(obj.height) || Number(img.naturalHeight) || 1),
                    bannerUrl: String(obj.src || renderSrc || thumbSrc || "").trim(),
                    originalSrc: String(obj.src || renderSrc || thumbSrc || "").trim(),
                    editorSrc: String(renderSrc || obj.src || thumbSrc || "").trim(),
                    thumbSrc: String(thumbSrc || renderSrc || obj.src || "").trim()
                });
            }
            resolve(k);
        };
        img.onerror = () => resolve(null);
        img.crossOrigin = "Anonymous";
        img.src = renderSrc || obj.src;
    });
}

function createSavedBarcodeNodeFromObject(obj, page) {
    return new Promise((resolve) => {
        if (!isPageHydrationContextActive(page)) {
            resolve(null);
            return;
        }
        const img = new Image();
        img.onload = () => {
            if (!isPageHydrationContextActive(page)) {
                resolve(null);
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
            resolve(k);
        };
        img.onerror = () => resolve(null);
        img.src = obj.original;
    });
}

async function restoreSavedObjectsForPage(page, pagePayload) {
    if (!page || !page.layer) return;
    if (!isPageHydrationContextActive(page)) return;
    const layer = page.layer;
    const objects = Array.isArray(pagePayload && pagePayload.objects) ? pagePayload.objects : [];
    const scheduleAsyncNode = createAsyncTaskQueue(PAGE_IMAGE_RESTORE_CONCURRENCY);
    const preloadNodePromises = new Map();

    for (let index = 0; index < objects.length; index++) {
        const obj = objects[index];
        if (!obj || !obj.type) continue;
        if (obj.type === "image" && (obj.src || obj.editorSrc || obj.thumbSrc)) {
            preloadNodePromises.set(index, scheduleAsyncNode(() => createSavedImageNodeFromObject(obj, page)));
            continue;
        }
        if (obj.type === "barcode" && obj.original) {
            preloadNodePromises.set(index, scheduleAsyncNode(() => createSavedBarcodeNodeFromObject(obj, page)));
        }
    }

    for (let index = 0; index < objects.length; index++) {
        const obj = objects[index];
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
            if (bg) {
                bg.fill(obj.fill);
                bg.opacity(obj.opacity ?? 1);
                bg.setAttr("backgroundFill", obj.fill || "#ffffff");
                if (obj.imageSrc && typeof window.applySavedBackgroundImage === "function") {
                    try {
                        await window.applySavedBackgroundImage(page, obj.imageSrc);
                    } catch (_e) {}
                } else if (obj.gradient && typeof window.applySavedBackgroundGradient === "function") {
                    try {
                        window.applySavedBackgroundGradient(page, obj.gradient);
                    } catch (_e) {}
                } else {
                    bg.setAttr("backgroundGradient", null);
                    bg.setAttr("backgroundImageSrc", null);
                    bg.setAttr("backgroundKind", "color");
                }
                if (!page.settings) page.settings = {};
                page.settings.pageBgColor = obj.fill || "#ffffff";
                page.settings.pageOpacity = obj.opacity ?? 1;
            }
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
                wrap: obj.wrap || "word",
                padding: Number.isFinite(Number(obj.padding)) ? Number(obj.padding) : 0,
                verticalAlign: obj.verticalAlign || "top",
                rotation: obj.rotation,
                draggable: obj.draggable !== false,
                listening: obj.listening !== false,
                opacity: obj.opacity ?? 1,
                name: obj.name || ""
            });
            if (typeof t.textDecoration === "function" && obj.textDecoration) {
                t.textDecoration(obj.textDecoration);
            }
            t.setAttrs({
                isName: obj.isName || false,
                isPrice: obj.isPrice || false,
                isIndex: obj.isIndex || false,
                slotIndex: obj.slotIndex
            });
            if (obj.attrs && typeof obj.attrs === "object") {
                t.setAttrs(obj.attrs);
            }
            const hasSlotIndex = obj.slotIndex !== null && obj.slotIndex !== undefined && Number.isFinite(Number(obj.slotIndex));
            const hasExplicitTextMode = !!(
                t.getAttr("isUserText") ||
                t.getAttr("isSidebarText")
            );
            const looksLikeLegacyFreeText = !(
                obj.isName ||
                obj.isPrice ||
                obj.isIndex ||
                obj.isPricePart ||
                hasSlotIndex
            );
            if (!hasExplicitTextMode && looksLikeLegacyFreeText) {
                t.setAttr("isUserText", true);
                if (!String(t.getAttr("_originalText") || "").trim()) {
                    t.setAttr("_originalText", String(obj.text || "").trim());
                }
            }
            layer.add(t);
            const editFn = window.enableEditableText || window.enableTextEditing;
            if (typeof editFn === "function") editFn(t, page);
            continue;
        }

        if (obj.type === "image" && (obj.src || obj.editorSrc || obj.thumbSrc)) {
            const imageNode = await (
                preloadNodePromises.get(index) ||
                createSavedImageNodeFromObject(obj, page)
            );
            if (imageNode) {
                layer.add(imageNode);
            }
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
            const barcodeNode = await (
                preloadNodePromises.get(index) ||
                createSavedBarcodeNodeFromObject(obj, page)
            );
            if (barcodeNode) layer.add(barcodeNode);
            continue;
        }

        if (obj.type === "box") {
            const isProductBox = !!obj.isBox && !obj.isShape && !obj.isPreset;
            const box = new Konva.Rect({
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                scaleX: obj.scaleX || 1,
                scaleY: obj.scaleY || 1,
                rotation: obj.rotation || 0,
                fill: obj.fill !== undefined ? obj.fill : "#ffffff",
                opacity: obj.opacity ?? 1,
                stroke: obj.stroke || "rgba(0,0,0,0.06)",
                strokeWidth: obj.strokeWidth ?? 1,
                cornerRadius: obj.cornerRadius ?? 10,
                shadowColor: obj.shadowColor || "rgba(0,0,0,0.18)",
                shadowBlur: obj.shadowBlur ?? 30,
                shadowOffset: { x: obj.shadowOffsetX ?? 0, y: obj.shadowOffsetY ?? 12 },
                shadowOpacity: obj.shadowOpacity ?? 0.8,
                draggable: obj.draggable !== false,
                visible: obj.visible !== false,
                listening: obj.listening !== false,
                dash: Array.isArray(obj.dash) ? obj.dash : undefined,
                lineCap: obj.lineCap || undefined,
                lineJoin: obj.lineJoin || undefined,
                name: obj.name || ""
            });

            if (obj.shadowEnabled === false && typeof box.shadowEnabled === "function") {
                box.shadowEnabled(false);
            }
            if (obj.shadowForStrokeEnabled !== undefined && typeof box.shadowForStrokeEnabled === "function") {
                box.shadowForStrokeEnabled(!!obj.shadowForStrokeEnabled);
            }
            if (obj.strokeScaleEnabled !== undefined && typeof box.strokeScaleEnabled === "function") {
                box.strokeScaleEnabled(!!obj.strokeScaleEnabled);
            }

            if (isProductBox) {
                box.setAttr("isBox", true);
                box.setAttr("slotIndex", obj.slotIndex ?? null);
                box.setAttr("isHiddenByCatalogStyle", !!obj.isHiddenByCatalogStyle);
            } else {
                box.setAttr("isShape", !!obj.isShape || !!String(obj.shapeType || "").trim());
                box.setAttr("isPreset", !!obj.isPreset);
                if (obj.shapeType) box.setAttr("shapeType", String(obj.shapeType));
            }
            if (obj.selectable !== undefined) box.setAttr("selectable", obj.selectable);

            layer.add(box);
            continue;
        }
    }

    layer.batchDraw?.();
}
window.restoreSavedObjectsForPage = restoreSavedObjectsForPage;

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

    if (node instanceof Konva.Circle) {
        const attrs = pruneTransientDirectAttrsForSave(
            sanitizeAttrsForSave(node.getAttrs ? node.getAttrs() : {}),
            "circle"
        );
        return {
            type: "circleNode",
            x: node.x(),
            y: node.y(),
            radius: node.radius ? node.radius() : 0,
            scaleX: node.scaleX ? node.scaleX() : 1,
            scaleY: node.scaleY ? node.scaleY() : 1,
            rotation: node.rotation ? node.rotation() : 0,
            fill: node.fill ? node.fill() : undefined,
            opacity: node.opacity ? node.opacity() : 1,
            stroke: node.stroke ? node.stroke() : undefined,
            strokeWidth: node.strokeWidth ? node.strokeWidth() : undefined,
            draggable: node.draggable ? node.draggable() : false,
            listening: node.listening ? node.listening() : true,
            attrs
        };
    }

    if (node instanceof Konva.Line) {
        const attrs = pruneTransientDirectAttrsForSave(
            sanitizeAttrsForSave(node.getAttrs ? node.getAttrs() : {}),
            "line"
        );
        return {
            type: "lineNode",
            x: node.x ? node.x() : 0,
            y: node.y ? node.y() : 0,
            points: Array.isArray(node.points ? node.points() : null) ? node.points().slice() : [],
            scaleX: node.scaleX ? node.scaleX() : 1,
            scaleY: node.scaleY ? node.scaleY() : 1,
            rotation: node.rotation ? node.rotation() : 0,
            stroke: node.stroke ? node.stroke() : undefined,
            strokeWidth: node.strokeWidth ? node.strokeWidth() : undefined,
            opacity: node.opacity ? node.opacity() : 1,
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
        const role = normalizeSavedImageRole({
            slotIndex: node.getAttr ? node.getAttr("slotIndex") : null,
            isProductImage: node.getAttr ? node.getAttr("isProductImage") : false,
            isUserImage: node.getAttr ? node.getAttr("isUserImage") : false,
            isSidebarImage: node.getAttr ? node.getAttr("isSidebarImage") : false,
            isDesignElement: node.getAttr ? node.getAttr("isDesignElement") : false,
            isOverlayElement: node.getAttr ? node.getAttr("isOverlayElement") : false,
            isTNZBadge: node.getAttr ? node.getAttr("isTNZBadge") : false,
            isCountryBadge: node.getAttr ? node.getAttr("isCountryBadge") : false,
            isBarcode: node.getAttr ? node.getAttr("isBarcode") : false,
            isQRCode: node.getAttr ? node.getAttr("isQRCode") : false,
            isEAN: node.getAttr ? node.getAttr("isEAN") : false
        });
        attrs.slotIndex = role.slotIndex;
        attrs.isProductImage = role.isProductImage;
        attrs.isUserImage = role.isUserImage;
        attrs.isSidebarImage = role.isSidebarImage;
        if (!role.hasSlot) {
            attrs.preservedSlotIndex = null;
        }
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

function isProductGroupingNode(node) {
    if (!node || !node.getAttr) return false;
    if (node.getAttr("isPriceHitArea")) return false;
    return !!(
        node.getAttr("isBox") ||
        node.getAttr("isProductText") ||
        node.getAttr("isName") ||
        node.getAttr("isIndex") ||
        node.getAttr("isPrice") ||
        node.getAttr("isProductImage") ||
        node.getAttr("isBarcode") ||
        node.getAttr("isCountryBadge") ||
        node.getAttr("isTNZBadge") ||
        node.getAttr("isPriceGroup") ||
        node.getAttr("isDirectPriceRectBg") ||
        node.getAttr("isDirectPriceCircleBg") ||
        node.getAttr("isCustomPackageInfo") ||
        node.getAttr("isLayoutDivider")
    );
}

function isSavedProductModuleNode(node) {
    return isProductGroupingNode(node);
}

function getSavedProductGroupKeyFromNode(node) {
    if (!node || !node.getAttr) return "";
    const directId = String(node.getAttr("directModuleId") || "").trim();
    if (directId) return `direct:${directId}`;
    const slot = Number(node.getAttr("slotIndex"));
    const preserved = Number(node.getAttr("preservedSlotIndex"));
    const finalSlot = Number.isFinite(slot) ? slot : preserved;
    return Number.isFinite(finalSlot) ? `slot:${finalSlot}` : "";
}

function normalizeSavedUserProductGroups(rawGroups) {
    if (!Array.isArray(rawGroups)) return [];
    const groups = [];
    rawGroups.forEach((entry) => {
        const keys = Array.isArray(entry?.keys)
            ? entry.keys
            : Array.isArray(entry)
                ? entry
                : (typeof entry === "string" ? [entry] : []);
        const normalizedKeys = Array.from(new Set(
            keys
                .map((item) => String(item || "").trim())
                .filter(Boolean)
        ));
        if (!normalizedKeys.length) return;
        const slotIndex = Number(entry?.slotIndex);
        groups.push({
            keys: normalizedKeys,
            isAutoSlotGroup: !!entry?.isAutoSlotGroup,
            slotIndex: Number.isFinite(slotIndex) ? slotIndex : null,
            directModuleId: String(entry?.directModuleId || "").trim()
        });
    });
    return groups;
}

function collectSavedUserProductGroupsForPage(page) {
    const layer = page && page.layer;
    if (!layer || typeof layer.getChildren !== "function" || !window.Konva) return [];
    const children = typeof layer.getChildren().toArray === "function"
        ? layer.getChildren().toArray()
        : Array.from(layer.getChildren() || []);

    return normalizeSavedUserProductGroups(children.map((group) => {
        if (!(group instanceof Konva.Group) || !group.getAttr || !group.getAttr("isUserGroup") || !group.find) {
            return null;
        }
        const descendants = group.find((node) => isSavedProductModuleNode(node));
        if (!Array.isArray(descendants) || !descendants.length) return null;
        const keys = Array.from(new Set(descendants.map((node) => getSavedProductGroupKeyFromNode(node)).filter(Boolean)));
        if (!keys.length) return null;
        const slot = Number(group.getAttr("slotIndex"));
        const preserved = Number(group.getAttr("preservedSlotIndex"));
        return {
            keys,
            isAutoSlotGroup: !!group.getAttr("isAutoSlotGroup"),
            slotIndex: Number.isFinite(slot) ? slot : (Number.isFinite(preserved) ? preserved : null),
            directModuleId: String(group.getAttr("directModuleId") || "").trim()
        };
    }).filter(Boolean));
}

function isMeaningfulLiveNodeForProjectSave(node) {
    if (!node || !window.Konva) return false;
    const nodeName = (typeof node.name === "function") ? node.name() : "";
    const isHelperNode = !!(node.getAttr && (
        nodeName === "selectionOutline" ||
        nodeName === "selectionRect" ||
        node.getAttr("isBgBlur") ||
        node.getAttr("isFxHelper") ||
        node.getAttr("isPriceHitArea")
    ));
    if (isHelperNode) return false;
    if (node instanceof Konva.Label) return false;
    return true;
}

function canReuseDeferredHydrationPayloadForSave(page) {
    const deferredPayload = page && page.__deferredHydrationPayload;
    if (!(deferredPayload && typeof deferredPayload === "object" && Array.isArray(deferredPayload.objects))) {
        return false;
    }
    const layer = page && page.layer;
    if (!layer || typeof layer.getChildren !== "function") return true;
    const children = typeof layer.getChildren().toArray === "function"
        ? layer.getChildren().toArray()
        : Array.from(layer.getChildren() || []);
    return !children.some((node) => isMeaningfulLiveNodeForProjectSave(node));
}

function collectProjectData() {

    const project = {
        name: document.getElementById("projectNameInput").value.trim(),
        date: document.getElementById("projectDateInput").value,
        layout: window.LAYOUT_MODE || "layout6",
        catalogStyle: window.CATALOG_STYLE || "default",
        pageFormat: window.CATALOG_PAGE_FORMAT || null,
        pageOrientation: window.CATALOG_PAGE_ORIENTATION || (
            Number(window.W || 0) > Number(window.H || 0) ? "landscape" : "portrait"
        ),
        pageWidth: window.W || null,
        pageHeight: window.H || null,
        backgroundDefault: cloneProjectSerializable(window.__PROJECT_BACKGROUND_DEFAULT || null, null),
        pages: []
    };

    window.pages.forEach(page => {
        const deferredPayload = page && page.__deferredHydrationPayload;
        if (canReuseDeferredHydrationPayloadForSave(page)) {
            let deferredObjects = deferredPayload.objects;
            const deferredUserProductGroups = normalizeSavedUserProductGroups(
                page?.__savedUserProductGroups ||
                deferredPayload.userProductGroups ||
                deferredPayload.groupedProductKeys
            );
            const deferredProducts = cloneSavedPageProducts(
                Array.isArray(page?.products) ? page.products : deferredPayload.products
            );
            const deferredSettings = cloneProjectSerializable(
                (page && typeof page.settings === "object" ? page.settings : null) ||
                deferredPayload.settings ||
                {},
                {}
            );
            try {
                deferredObjects = JSON.parse(JSON.stringify(deferredPayload.objects));
            } catch (_e) {
                deferredObjects = Array.isArray(deferredPayload.objects) ? deferredPayload.objects.slice() : [];
            }
            project.pages.push({
                number: page.number,
                objects: deferredObjects,
                userProductGroups: deferredUserProductGroups,
                products: deferredProducts,
                settings: deferredSettings
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
            if (node instanceof Konva.Label) return;

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
                    fill: node.fill(),
                    opacity: node.opacity ? node.opacity() : 1,
                    gradient: node.getAttr("backgroundGradient") || null,
                    imageSrc: node.getAttr("backgroundImageSrc") || null
                });
                return;
            }

            // TEKST
            if (node instanceof Konva.Text) {
                const parent = node.getParent && node.getParent();
                const isPriceGroup = parent && parent.getAttr && parent.getAttr("isPriceGroup");
                const abs = isPriceGroup ? node.getAbsolutePosition() : null;
                const attrs = pruneTransientDirectAttrsForSave(
                    sanitizeAttrsForSave(node.getAttrs ? node.getAttrs() : {}),
                    "text"
                );
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
                    textDecoration: node.textDecoration ? node.textDecoration() : "",
                    padding: node.padding ? node.padding() : 0,
                    wrap: node.wrap ? node.wrap() : "word",
                    verticalAlign: node.verticalAlign ? node.verticalAlign() : "top",
                    rotation: node.rotation(),
                    name: node.name ? node.name() : "",
                    draggable: node.draggable ? node.draggable() : true,
                    listening: node.listening ? node.listening() : true,
                    opacity: node.opacity ? node.opacity() : 1,
                    isName: node.getAttr("isName") || false,
                    isPrice: node.getAttr("isPrice") || false,
                    isIndex: node.getAttr("isIndex") || false,
                    isPricePart: isPriceGroup || false,
                    slotIndex: node.getAttr("slotIndex") ?? null,
                    attrs
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
                const role = normalizeSavedImageRole({
                    slotIndex: node.getAttr("slotIndex"),
                    isProductImage: node.getAttr("isProductImage"),
                    isUserImage: node.getAttr("isUserImage"),
                    isSidebarImage: node.getAttr("isSidebarImage"),
                    isDesignElement: node.getAttr("isDesignElement"),
                    isOverlayElement: node.getAttr("isOverlayElement"),
                    isTNZBadge: node.getAttr("isTNZBadge"),
                    isCountryBadge: node.getAttr("isCountryBadge"),
                    isBarcode: node.getAttr("isBarcode"),
                    isQRCode: node.getAttr("isQRCode"),
                    isEAN: node.getAttr("isEAN")
                });
                objects.push({
                    type: "image",
                    x: node.x(),
                    y: node.y(),
                    scaleX: node.scaleX(),
                    scaleY: node.scaleY(),
                    rotation: node.rotation(),
                    width: node.width(),
                    height: node.height(),
                    draggable: node.draggable ? node.draggable() : true,
                    listening: node.listening ? node.listening() : true,
                    visible: typeof node.visible === "function" ? node.visible() : true,
                    opacity: node.opacity ? node.opacity() : 1,
                    crop,
                    shadowColor: node.shadowColor ? node.shadowColor() : null,
                    shadowBlur: node.shadowBlur ? node.shadowBlur() : 0,
                    shadowOffsetX: node.shadowOffsetX ? node.shadowOffsetX() : 0,
                    shadowOffsetY: node.shadowOffsetY ? node.shadowOffsetY() : 0,
                    shadowOpacity: node.shadowOpacity ? node.shadowOpacity() : 0,
                    stroke: node.stroke ? node.stroke() : null,
                    strokeWidth: node.strokeWidth ? node.strokeWidth() : 0,
                    imageFX: (node.getAttr && node.getAttr("imageFX")) ? cloneStyleValue(node.getAttr("imageFX")) : null,
                    name: node.name ? node.name() : "",
                    isCatalogBanner: !!(node.getAttr("isCatalogBanner") || (node.name && node.name() === "banner")),
                    slotIndex: role.slotIndex,
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
                    isProductImage: role.isProductImage,
                    isUserImage: role.isUserImage,
                    isSidebarImage: role.isSidebarImage,
                    isDesignElement: node.getAttr("isDesignElement") || false,
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
                        rotation: node.rotation ? node.rotation() : 0,
                        opacity: node.opacity ? node.opacity() : 1,
                        fill: node.fill(),
                        stroke: node.stroke(),
                        strokeWidth: node.strokeWidth(),
                        cornerRadius: node.cornerRadius(),
                        dash: node.dash ? cloneStyleValue(node.dash()) : [],
                        lineCap: node.lineCap ? node.lineCap() : undefined,
                        lineJoin: node.lineJoin ? node.lineJoin() : undefined,
                        shadowColor: node.shadowColor(),
                        shadowBlur: node.shadowBlur(),
                        shadowOffsetX: node.shadowOffsetX(),
                        shadowOffsetY: node.shadowOffsetY(),
                        shadowOpacity: node.shadowOpacity(),
                        shadowEnabled: node.shadowEnabled ? node.shadowEnabled() : undefined,
                        shadowForStrokeEnabled: node.shadowForStrokeEnabled ? node.shadowForStrokeEnabled() : undefined,
                        draggable: node.draggable ? node.draggable() : true,
                        slotIndex: node.getAttr("slotIndex") ?? null,
                        isBox: !!node.getAttr("isBox"),
                        isShape: !!node.getAttr("isShape"),
                        isPreset: !!node.getAttr("isPreset"),
                        shapeType: String(node.getAttr("shapeType") || ""),
                        name: node.name ? node.name() : "",
                        visible: typeof node.visible === "function" ? node.visible() : true,
                        listening: typeof node.listening === "function" ? node.listening() : true,
                        selectable: node.getAttr("selectable"),
                        isHiddenByCatalogStyle: !!node.getAttr("isHiddenByCatalogStyle"),
                        strokeScaleEnabled: node.strokeScaleEnabled ? node.strokeScaleEnabled() : undefined
                    });
                }
            }
        });

        project.pages.push({
            number: page.number,
            objects,
            userProductGroups: collectSavedUserProductGroupsForPage(page),
            products: cloneSavedPageProducts(page.products),
            settings: cloneProjectSerializable(page.settings || {}, {})
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
const queueRemoteProjectThumbTask = createThumbQueue(PROJECT_THUMB_DOWNLOAD_CONCURRENCY);

function createAsyncTaskQueue(concurrency = 2) {
    let active = 0;
    const queue = [];
    const safeConcurrency = Math.max(1, Number(concurrency) || 1);
    const next = () => {
        if (active >= safeConcurrency || queue.length === 0) return;
        const task = queue.shift();
        active++;
        Promise.resolve()
            .then(task.fn)
            .then(task.resolve, task.reject)
            .finally(() => {
                active--;
                next();
            });
    };
    return (fn) => new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        next();
    });
}

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
            const prevAlpha = ctx.globalAlpha;
            if (obj.imageSrc) {
                const bgImg = await getImg(obj.imageSrc);
                if (bgImg) {
                    const scaleCover = Math.max(canvas.width / (bgImg.naturalWidth || bgImg.width || 1), canvas.height / (bgImg.naturalHeight || bgImg.height || 1));
                    const drawW = (bgImg.naturalWidth || bgImg.width || 1) * scaleCover;
                    const drawH = (bgImg.naturalHeight || bgImg.height || 1) * scaleCover;
                    const drawX = (canvas.width - drawW) / 2;
                    const drawY = (canvas.height - drawH) / 2;
                    ctx.globalAlpha = obj.opacity ?? 1;
                    ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
                    ctx.globalAlpha = prevAlpha;
                    continue;
                }
            }
            if (obj.gradient && Array.isArray(obj.gradient.stops) && obj.gradient.stops.length) {
                const direction = String(obj.gradient.direction || "horizontal");
                let grad;
                if (direction === "vertical") {
                    grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
                } else if (direction === "diagonal") {
                    grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                } else {
                    grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
                }
                const stops = obj.gradient.stops;
                const lastIndex = Math.max(1, stops.length - 1);
                stops.forEach((color, index) => grad.addColorStop(index / lastIndex, color));
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = obj.fill || "#ffffff";
            }
            ctx.globalAlpha = obj.opacity ?? 1;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = prevAlpha;
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
            if (obj.visible === false) continue;
            const renderSrc = obj.thumbSrc || obj.editorSrc || obj.src;
            const img = await getImg(renderSrc);
            if (!img) continue;
            const drawBaseW = Number(obj.width) > 0 ? Number(obj.width) : (img.naturalWidth || img.width || 0);
            const drawBaseH = Number(obj.height) > 0 ? Number(obj.height) : (img.naturalHeight || img.height || 0);
            const w = drawBaseW * (obj.scaleX || 1) * scale;
            const h = drawBaseH * (obj.scaleY || 1) * scale;
            const x = obj.x * scale;
            const y = obj.y * scale;
            const crop = obj.crop && typeof obj.crop === "object" ? obj.crop : null;
            const cropX = Number(crop?.x) >= 0 ? Number(crop.x) : 0;
            const cropY = Number(crop?.y) >= 0 ? Number(crop.y) : 0;
            const cropW = Number(crop?.width) > 0 ? Number(crop.width) : (img.naturalWidth || img.width || drawBaseW);
            const cropH = Number(crop?.height) > 0 ? Number(crop.height) : (img.naturalHeight || img.height || drawBaseH);
            ctx.save();
            ctx.globalAlpha = obj.opacity ?? 1;
            if (obj.rotation) {
                const cx = x + w / 2;
                const cy = y + h / 2;
                ctx.translate(cx, cy);
                ctx.rotate((obj.rotation * Math.PI) / 180);
                ctx.drawImage(img, cropX, cropY, cropW, cropH, -w / 2, -h / 2, w, h);
            } else {
                ctx.drawImage(img, cropX, cropY, cropW, cropH, x, y, w, h);
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
        const loaded = await loadProjectDataFromStorageRef(itemRef);
        const data = loaded && loaded.data ? loaded.data : null;
        if (!data) return "";
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
        const uploadPayload = await buildProjectUploadPayload(jsonString);
        const approxMB = uploadPayload.rawBytes / (1024 * 1024);
        const uploadMB = uploadPayload.storedBytes / (1024 * 1024);
        if (approxMB > 18) {
            const busyLabel = uploadPayload.compressed
                ? `Zapisywanie dużego projektu… (${uploadMB.toFixed(1)} MB po kompresji)`
                : `Zapisywanie dużego projektu… (${approxMB.toFixed(1)} MB)`;
            showBusyOverlay(busyLabel);
        }
        const blob = uploadPayload.blob;
        const fileRef = ref(storage, filePath);

        await uploadBytes(fileRef, blob, {
            contentType: uploadPayload.contentType,
            customMetadata: {
                name: data.name || "",
                date: data.date || "",
                savedAt: String(Date.now()),
                layout: data.layout || "layout6",
                thumbPath,
                projectEncoding: uploadPayload.encoding,
                projectRawBytes: String(uploadPayload.rawBytes || 0),
                projectStoredBytes: String(uploadPayload.storedBytes || 0)
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
        syncSaveFormWithCurrentProject({
            forceName: String(data.name || "").trim(),
            forceDate: String(data.date || "").trim() || getTodayIsoDate(),
            overwriteName: true,
            overwriteDate: true
        });
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
            minute: "2-digit"
        });
    } catch (_e) {
        return "";
    }
}

function parseSavedTimestamp(value) {
    const numeric = Number(value || 0);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    const parsed = Date.parse(String(value || "").trim());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatSavedProjectMetaLabel(ts, fallbackDate = "") {
    const exact = formatSavedTimestamp(ts);
    if (exact) return exact;
    return String(fallbackDate || "").trim();
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

const startProjectsSelection = new Set();
let startProjectsRenderedEntries = new Map();
let startProjectsBulkActionsBound = false;

function buildStartProjectSelectionKey(type, rawId) {
    return `${String(type || "saved")}::${String(rawId || "").trim()}`;
}

function safeProjectDownloadBaseName(name) {
    const raw = String(name || "").trim() || "projekt";
    const safe = raw
        .replace(/[\\/:*?"<>|]+/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
    return safe || "projekt";
}

function triggerBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = String(fileName || "projekt.json");
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function downloadProjectDataAsJsonFile(data, fileNameBase) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json;charset=utf-8"
    });
    triggerBlobDownload(blob, `${safeProjectDownloadBaseName(fileNameBase)}.json`);
}

function closeStartProjectMenus(root = document) {
    (root.querySelectorAll ? root.querySelectorAll(".start-card-menu.is-open") : []).forEach((menu) => {
        menu.classList.remove("is-open");
    });
}

function syncStartProjectsBulkBar() {
    const bar = document.getElementById("startProjectsBulkBar");
    const countEl = document.getElementById("startProjectsSelectionCount");
    const deleteBtn = document.getElementById("startProjectsBulkDeleteBtn");
    if (!bar || !countEl) return;

    const validKeys = new Set(startProjectsRenderedEntries.keys());
    Array.from(startProjectsSelection).forEach((key) => {
        if (!validKeys.has(key)) startProjectsSelection.delete(key);
    });

    const selectedCount = startProjectsSelection.size;
    bar.style.display = selectedCount ? "flex" : "none";
    countEl.textContent = selectedCount === 1
        ? "1 projekt zaznaczony"
        : `${selectedCount} projektów zaznaczonych`;
    if (deleteBtn) deleteBtn.disabled = selectedCount === 0;
}

function syncStartProjectsSelectionUi(root = document) {
    (root.querySelectorAll ? root.querySelectorAll(".start-card[data-selection-key]") : []).forEach((card) => {
        const key = String(card.dataset.selectionKey || "");
        const selected = !!key && startProjectsSelection.has(key);
        card.classList.toggle("is-selected", selected);
        const checkbox = card.querySelector(".start-select-checkbox");
        if (checkbox) checkbox.checked = selected;
        const selectAction = card.querySelector(".projectMenuSelectBtn");
        if (selectAction) {
            selectAction.textContent = selected ? "Odznacz" : "Zaznacz";
        }
    });
    syncStartProjectsBulkBar();
}

function setStartProjectSelection(key, selected, root = document) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) return;
    if (selected) startProjectsSelection.add(normalizedKey);
    else startProjectsSelection.delete(normalizedKey);
    syncStartProjectsSelectionUi(root);
}

function clearStartProjectsSelection(root = document) {
    startProjectsSelection.clear();
    syncStartProjectsSelectionUi(root);
}

async function deleteSavedProjectFiles(path, thumbPath = "") {
    if (!storage || !path) return false;
    await deleteObject(ref(storage, path));
    if (thumbPath) {
        try {
            await deleteObject(ref(storage, thumbPath));
        } catch (_e) {}
    }
    return true;
}

async function deleteAutosaveEntryById(autosaveId, autosaveSource = "") {
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
    return true;
}

async function downloadSavedProjectFromStorage(path, fallbackName = "") {
    if (!storage || !path) return false;
    showBusyOverlay("Przygotowywanie pliku projektu…");
    try {
        const fileRef = ref(storage, path);
        const loaded = await loadProjectDataFromStorageRef(fileRef);
        const data = loaded?.data || null;
        if (!data) {
            showAppToast("Nie udało się pobrać projektu.", "error");
            return false;
        }
        const fileNameBase = loaded?.meta?.customMetadata?.name || data?.name || fallbackName || "projekt";
        downloadProjectDataAsJsonFile(data, fileNameBase);
        showAppToast("Pobrano plik projektu.", "success");
        return true;
    } catch (e) {
        showAppToast(`Nie udało się pobrać projektu: ${String(e?.message || e || "błąd")}`, "error");
        return false;
    } finally {
        hideBusyOverlay();
    }
}

async function downloadAutosaveProjectFile(autosaveEntry) {
    if (!autosaveEntry?.data) {
        showAppToast("Brak danych autosave do pobrania.", "error");
        return false;
    }
    const fileNameBase = autosaveEntry?.name || autosaveEntry?.data?.name || "autosave_projekt";
    downloadProjectDataAsJsonFile(autosaveEntry.data, fileNameBase);
    showAppToast("Pobrano plik projektu.", "success");
    return true;
}

async function deleteStartProjectEntry(entry) {
    if (!entry) return false;
    if (entry.type === "autosave") {
        await deleteAutosaveEntryById(entry.autosaveId, entry.autosaveSource);
        return true;
    }
    await deleteSavedProjectFiles(entry.path, entry.thumbPath);
    return true;
}

function bindStartProjectsBulkBar(rootList) {
    if (startProjectsBulkActionsBound) return;
    startProjectsBulkActionsBound = true;

    const clearBtn = document.getElementById("startProjectsBulkClearBtn");
    const deleteBtn = document.getElementById("startProjectsBulkDeleteBtn");

    if (clearBtn) {
        clearBtn.onclick = () => {
            clearStartProjectsSelection(rootList || document);
            closeStartProjectMenus();
        };
    }

    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            const selectedEntries = Array.from(startProjectsSelection)
                .map((key) => startProjectsRenderedEntries.get(key))
                .filter(Boolean);
            if (!selectedEntries.length) return;
            const confirmed = await showActionConfirmModal({
                title: selectedEntries.length === 1 ? "Usunąć projekt?" : "Usunąć zaznaczone projekty?",
                message: selectedEntries.length === 1
                    ? "Ta operacja usunie wybrany projekt z listy zapisanych projektów."
                    : `Ta operacja usunie ${selectedEntries.length} zaznaczone projekty z listy zapisanych projektów.`,
                confirmText: "Usuń",
                cancelText: "Anuluj",
                tone: "danger"
            });
            if (!confirmed) return;

            showBusyOverlay(selectedEntries.length === 1 ? "Usuwanie projektu…" : "Usuwanie zaznaczonych projektów…");
            let successCount = 0;
            let failedCount = 0;
            try {
                for (const entry of selectedEntries) {
                    try {
                        await deleteStartProjectEntry(entry);
                        successCount += 1;
                    } catch (_e) {
                        failedCount += 1;
                    }
                }
            } finally {
                hideBusyOverlay();
            }

            clearStartProjectsSelection(rootList || document);
            await loadSavedProjects(document.getElementById("startProjectsList"));
            if (successCount) {
                showAppToast(
                    failedCount
                        ? `Usunięto ${successCount} projekt(y), ${failedCount} nie udało się usunąć.`
                        : `Usunięto ${successCount} projekt(y).`,
                    failedCount ? "info" : "success"
                );
            } else if (failedCount) {
                showAppToast("Nie udało się usunąć zaznaczonych projektów.", "error");
            }
        };
    }
}

async function loadSavedProjects(listEl) {
    const list = listEl || document.getElementById("savedProjectsList");
    if (!list) return;
    const renderToken = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    list.__projectsRenderToken = renderToken;
    const isStale = () => list.__projectsRenderToken !== renderToken;

    list.innerHTML = "<p>Ładowanie...</p>";
    const isStartList = list.id === "startProjectsList";
    const currentStartEntries = new Map();
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
        const autosaveDate = formatSavedProjectMetaLabel(autosaveEntry.savedAt, autosaveEntry.data?.date || "");
        const autosaveThumb = String(autosaveEntry.thumb || "");
        const autosaveSelectionKey = buildStartProjectSelectionKey("autosave", autosaveEntry.id || autosaveNameLayoutKey || renderedCount);

        const card = document.createElement("div");
        card.className = isStartList ? "start-card" : "";
        card.dataset.autosave = "1";
        card.dataset.autosaveId = String(autosaveEntry.id || "");
        card.dataset.autosaveSource = String(autosaveEntry.source || "");
        if (isStartList) {
            card.dataset.selectionKey = autosaveSelectionKey;
            currentStartEntries.set(autosaveSelectionKey, {
                type: "autosave",
                selectionKey: autosaveSelectionKey,
                autosaveId: String(autosaveEntry.id || ""),
                autosaveSource: String(autosaveEntry.source || ""),
                name: autosaveName,
                data: autosaveEntry.data
            });
        }
        const autosaveNameLayoutKey = normalizedProjectNameLayoutKey(
            autosaveEntry.name || autosaveEntry.data?.name || "",
            autosaveEntry.layout || autosaveEntry.data?.layout || "layout6"
        );
        card.dataset.autosaveNameLayoutKey = autosaveNameLayoutKey;
        if (!isStartList) {
            card.style = `padding:12px; border:1px solid #c7d2fe; border-radius:12px; background:#f5f8ff; display:flex; flex-direction:column; gap:10px;`;
        }
        card.innerHTML = `
            ${isStartList ? `
            <div class="start-card-toolbar">
                <label class="start-select-toggle" title="Zaznacz projekt">
                    <input type="checkbox" class="start-select-checkbox" data-selection-key="${autosaveSelectionKey}">
                    <span><i class="fas fa-check"></i></span>
                </label>
                <div style="position:relative;">
                    <button type="button" class="start-menu-toggle" aria-label="Więcej akcji"><i class="fas fa-ellipsis-h"></i></button>
                    <div class="start-card-menu">
                        <button type="button" class="projectMenuEditBtn" data-autosave-id="${String(autosaveEntry.id || "")}">Edytuj</button>
                        <button type="button" class="projectMenuDownloadBtn" data-autosave-id="${String(autosaveEntry.id || "")}">Pobierz</button>
                        <button type="button" class="projectMenuSelectBtn" data-selection-key="${autosaveSelectionKey}">Zaznacz</button>
                        <button type="button" class="projectMenuDeleteBtn danger" data-autosave-id="${String(autosaveEntry.id || "")}" data-autosave-source="${String(autosaveEntry.source || "")}">Usuń</button>
                    </div>
                </div>
            </div>` : ``}
            <div id="${previewId}" class="${isStartList ? "start-preview" : ""}" style="${isStartList ? "" : "width:100%;aspect-ratio:3/4;background:#fff;border:1px solid #dbe5ff;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;"}">
                ${autosaveThumb ? `<img src="${autosaveThumb}" alt="Podgląd autosave" ${isStartList ? "" : `style="width:100%;height:100%;object-fit:cover;"`}>` : `<span style="color:#667085;">Autosave lokalny</span>`}
            </div>
            <div class="${isStartList ? "start-meta" : ""}" style="${isStartList ? "" : "display:flex;flex-direction:column;gap:4px;"}">
                <strong class="${isStartList ? "start-name" : ""}" style="${isStartList ? "" : "font-size:14px;"}">${autosaveName}</strong>
                <small class="${isStartList ? "start-sub" : ""}" style="${isStartList ? "" : "color:#475467;font-size:12px;"}">${autosaveDate}</small>
            </div>
            <div class="${isStartList ? "start-actions" : ""}" style="${isStartList ? "" : "display:flex; gap:8px; margin-top:4px;"}">
                <button class="openAutosaveBtn ${isStartList ? "start-btn start-open" : ""}" data-autosave-id="${String(autosaveEntry.id || "")}" style="${isStartList ? "" : "flex:1;padding:8px 10px; font-size:13px; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer;"}">${isStartList ? "Edytuj" : "Otwórz"}</button>
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
            const sourceItems = Array.isArray(result?.items) ? result.items : [];
            const firebaseProjects = await mapWithConcurrencyLimit(
                sourceItems,
                PROJECT_LIST_METADATA_CONCURRENCY,
                async (itemRef) => {
                    if (isStale()) return null;
                    const fullPath = String(itemRef?.fullPath || "").trim();
                    if (!fullPath) return null;
                    let meta = null;
                    try {
                        meta = await getMetadata(itemRef);
                    } catch (_e) {
                        meta = null;
                    }
                    if (isStale()) return null;
                    const name = meta?.customMetadata?.name || itemRef.name;
                    const date = meta?.customMetadata?.date || "";
                    const savedAt = parseSavedTimestamp(
                        meta?.customMetadata?.savedAt ||
                        meta?.updated ||
                        meta?.timeCreated ||
                        ""
                    );
                    const dateLabel = formatSavedProjectMetaLabel(savedAt, date);
                    const layout = meta?.customMetadata?.layout || "layout6";
                    const thumbPath = meta?.customMetadata?.thumbPath || `${THUMBS_FOLDER}/${itemRef.name.replace(/\.json$/i, ".jpg")}`;
                    return {
                        itemRef,
                        fullPath,
                        name,
                        date,
                        savedAt,
                        dateLabel,
                        layout,
                        thumbPath
                    };
                }
            );
            if (isStale()) return;
            const seenProjectPaths = new Set();

            for (const projectEntry of firebaseProjects) {
                if (isStale()) return;
                if (!projectEntry) continue;
                const {
                    itemRef,
                    fullPath,
                    name,
                    date,
                    savedAt,
                    dateLabel,
                    layout,
                    thumbPath
                } = projectEntry;
                if (!fullPath || seenProjectPaths.has(fullPath)) continue;
                seenProjectPaths.add(fullPath);

                const savedNameLayoutKey = normalizedProjectNameLayoutKey(name, layout);
                if (savedNameLayoutKey && autosaveCardsByNameLayout.has(savedNameLayoutKey)) {
                    const dupCards = autosaveCardsByNameLayout.get(savedNameLayoutKey) || [];
                    dupCards.forEach((dupCard) => {
                        if (dupCard && dupCard.parentNode === list) {
                            const dupKey = String(dupCard.dataset.selectionKey || "");
                            if (dupKey) {
                                currentStartEntries.delete(dupKey);
                                startProjectsSelection.delete(dupKey);
                            }
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
                const savedSelectionKey = buildStartProjectSelectionKey("saved", itemRef.fullPath);
                if (isStartList) {
                    card.dataset.selectionKey = savedSelectionKey;
                    currentStartEntries.set(savedSelectionKey, {
                        type: "saved",
                        selectionKey: savedSelectionKey,
                        path: itemRef.fullPath,
                        thumbPath,
                        name
                    });
                }
                if (!isStartList) {
                    card.style = `padding:12px; border:1px solid #e2e2e2; border-radius:12px; background:#fafafa; display:flex; flex-direction:column; gap:10px;`;
                }
                const previewId = `preview_${Math.random().toString(36).slice(2)}`;
                card.innerHTML = `
                    ${isStartList ? `
                    <div class="start-card-toolbar">
                        <label class="start-select-toggle" title="Zaznacz projekt">
                            <input type="checkbox" class="start-select-checkbox" data-selection-key="${savedSelectionKey}">
                            <span><i class="fas fa-check"></i></span>
                        </label>
                        <div style="position:relative;">
                            <button type="button" class="start-menu-toggle" aria-label="Więcej akcji"><i class="fas fa-ellipsis-h"></i></button>
                            <div class="start-card-menu">
                                <button type="button" class="projectMenuEditBtn" data-path="${itemRef.fullPath}" data-thumbpath="${thumbPath}">Edytuj</button>
                                <button type="button" class="projectMenuDownloadBtn" data-path="${itemRef.fullPath}" data-name="${String(name || "").replace(/"/g, '&quot;')}">Pobierz</button>
                                <button type="button" class="projectMenuSelectBtn" data-selection-key="${savedSelectionKey}">Zaznacz</button>
                                <button type="button" class="projectMenuDeleteBtn danger" data-path="${itemRef.fullPath}" data-thumbpath="${thumbPath}">Usuń</button>
                            </div>
                        </div>
                    </div>` : ``}
                    <div id="${previewId}" class="${isStartList ? "start-preview" : ""}" style="${isStartList ? "" : "width:100%;aspect-ratio:3/4;background:#fff;border:1px solid #eee;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;"}">
                        <span style="color:#999;">Ładowanie podglądu…</span>
                    </div>
                    <div class="${isStartList ? "start-meta" : ""}" style="${isStartList ? "" : "display:flex;flex-direction:column;gap:4px;"}">
                        <strong class="${isStartList ? "start-name" : ""}" style="${isStartList ? "" : "font-size:14px;"}">${name}</strong>
                        <small class="${isStartList ? "start-sub" : ""}" style="${isStartList ? "" : "color:#666;font-size:12px;"}">${dateLabel || formatSavedProjectMetaLabel(savedAt, date)}</small>
                    </div>
                    <div class="${isStartList ? "start-actions" : ""}" style="${isStartList ? "" : "display:flex; gap:8px; margin-top:4px;"}">
                        <button data-path="${itemRef.fullPath}" data-thumbpath="${thumbPath}" class="openProjectBtn ${isStartList ? "start-btn start-open" : ""}" style="${isStartList ? "" : "flex:1;padding:8px 10px; font-size:13px; background:#0066ff; color:white; border:none; border-radius:6px; cursor:pointer;"}">${isStartList ? "Edytuj" : "Otwórz"}</button>
                        <button data-path="${itemRef.fullPath}" data-thumbpath="${thumbPath}" class="deleteProjectBtn ${isStartList ? "start-btn start-delete" : ""}" style="${isStartList ? "" : "padding:8px 10px; font-size:13px; background:#ff4444; color:white; border:none; border-radius:6px; cursor:pointer;"}">Usuń</button>
                    </div>
                `;
                list.appendChild(card);
                renderedCount += 1;

                const previewEl = card.querySelector(`#${previewId}`);
                queueRemoteProjectThumbTask(async () => {
                    if (isStale()) return;
                    const url = await ensureThumbForProject(itemRef, thumbPath);
                    if (isStale()) return;
                    if (!previewEl || !previewEl.isConnected) return;
                    if (url) {
                        previewEl.innerHTML = `<img src="${url}" alt="Podgląd" style="width:100%;height:100%;object-fit:cover;">`;
                    } else {
                        previewEl.innerHTML = `<span style="color:#999;">Brak podglądu</span>`;
                    }
                });
            }
        } catch (_e) {
            // Jeśli Firebase chwilowo niedostępny, i tak pokaż lokalny autosave.
        }
    }

    if (renderedCount === 0) {
        if (isStartList) {
            startProjectsRenderedEntries = new Map();
            clearStartProjectsSelection(list);
        }
        list.innerHTML = storage
            ? "<p>Brak zapisanych projektów</p>"
            : "<p>Brak połączenia z Firebase Storage</p>";
        return;
    }
    if (isStale()) return;

    list.querySelectorAll(".deleteProjectBtn").forEach(btn => {
        btn.onclick = async () => {
            const confirmed = await showActionConfirmModal({
                title: "Usunąć projekt?",
                message: "Projekt oraz jego miniatura zostaną usunięte z zapisanych projektów.",
                confirmText: "Usuń",
                cancelText: "Anuluj",
                tone: "danger"
            });
            if (!confirmed) return;
            await deleteSavedProjectFiles(btn.dataset.path, btn.dataset.thumbpath || "");
            loadSavedProjects(list);
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
            const confirmed = await showActionConfirmModal({
                title: "Usunąć autosave?",
                message: "Lokalny autosave tego projektu zostanie usunięty z urządzenia.",
                confirmText: "Usuń",
                cancelText: "Anuluj",
                tone: "danger"
            });
            if (!confirmed) return;
            await deleteAutosaveEntryById(
                String(btn.dataset.autosaveId || "").trim(),
                String(btn.dataset.autosaveSource || "").trim()
            );
            loadSavedProjects(listEl || list);
        };
    });

    list.querySelectorAll(".projectMenuEditBtn").forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            closeStartProjectMenus(list);
            const autosaveId = String(btn.dataset.autosaveId || "").trim();
            if (autosaveId) {
                const allAutosaves = await getAutosaveProjectEntries();
                const freshAutosave = allAutosaves.find((entry) => String(entry.id || "") === autosaveId);
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
                return;
            }
            const path = String(btn.dataset.path || "").trim();
            if (!path) return;
            showBusyOverlay("Wczytywanie projektu…");
            await loadProjectFromStorage(path, String(btn.dataset.thumbpath || "").trim());
            hideBusyOverlay();
            if (!listEl) {
                savedPanel.style.display = "none";
                loadSavedProjects();
            } else {
                showEditorView();
            }
        };
    });

    list.querySelectorAll(".projectMenuDownloadBtn").forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            closeStartProjectMenus(list);
            const autosaveId = String(btn.dataset.autosaveId || "").trim();
            if (autosaveId) {
                const allAutosaves = await getAutosaveProjectEntries();
                const autosaveEntry = allAutosaves.find((entry) => String(entry.id || "") === autosaveId);
                await downloadAutosaveProjectFile(autosaveEntry);
                return;
            }
            const path = String(btn.dataset.path || "").trim();
            if (!path) return;
            await downloadSavedProjectFromStorage(path, String(btn.dataset.name || "").trim());
        };
    });

    list.querySelectorAll(".projectMenuDeleteBtn").forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            closeStartProjectMenus(list);
            const autosaveId = String(btn.dataset.autosaveId || "").trim();
            if (autosaveId) {
                const confirmed = await showActionConfirmModal({
                    title: "Usunąć autosave?",
                    message: "Lokalny autosave tego projektu zostanie usunięty z urządzenia.",
                    confirmText: "Usuń",
                    cancelText: "Anuluj",
                    tone: "danger"
                });
                if (!confirmed) return;
                await deleteAutosaveEntryById(
                    autosaveId,
                    String(btn.dataset.autosaveSource || "").trim()
                );
                loadSavedProjects(listEl || list);
                return;
            }
            const path = String(btn.dataset.path || "").trim();
            if (!path) return;
            const confirmed = await showActionConfirmModal({
                title: "Usunąć projekt?",
                message: "Projekt oraz jego miniatura zostaną usunięte z zapisanych projektów.",
                confirmText: "Usuń",
                cancelText: "Anuluj",
                tone: "danger"
            });
            if (!confirmed) return;
            await deleteSavedProjectFiles(path, String(btn.dataset.thumbpath || "").trim());
            loadSavedProjects(list);
        };
    });

    list.querySelectorAll(".start-menu-toggle").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const menu = btn.parentElement?.querySelector(".start-card-menu");
            if (!menu) return;
            const shouldOpen = !menu.classList.contains("is-open");
            closeStartProjectMenus(list);
            if (shouldOpen) menu.classList.add("is-open");
        };
    });

    list.querySelectorAll(".start-select-checkbox").forEach(checkbox => {
        checkbox.onchange = (e) => {
            e.stopPropagation();
            setStartProjectSelection(checkbox.dataset.selectionKey, !!checkbox.checked, list);
        };
        checkbox.onclick = (e) => e.stopPropagation();
    });

    list.querySelectorAll(".projectMenuSelectBtn").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const key = String(btn.dataset.selectionKey || "").trim();
            if (!key) return;
            setStartProjectSelection(key, !startProjectsSelection.has(key), list);
            closeStartProjectMenus(list);
        };
    });

    // Kliknięcie w kartę = Otwórz (bez kliknięć na przyciskach)
    if (isStartList) {
        startProjectsRenderedEntries = currentStartEntries;
        bindStartProjectsBulkBar(list);
        syncStartProjectsSelectionUi(list);
        list.querySelectorAll(".start-card").forEach(card => {
            card.onclick = (e) => {
                if (e.target && e.target.closest("button, input, label, .start-card-menu")) return;
                const selectionKey = String(card.dataset.selectionKey || "").trim();
                if (selectionKey && startProjectsSelection.size > 0) {
                    setStartProjectSelection(selectionKey, !startProjectsSelection.has(selectionKey), list);
                    return;
                }
                const openBtn = card.querySelector(".openProjectBtn, .openAutosaveBtn");
                if (openBtn) openBtn.click();
            };
        });
    } else {
        closeStartProjectMenus(list);
    }
}

// ====================================================================
// 6. WCZYTYWANIE PROJEKTU – zdjęcia + boxy działają idealnie
// ====================================================================
function pickViewportAnchorPageIndex(pagesList) {
    const list = Array.isArray(pagesList) ? pagesList.filter((page) => !!page?.container) : [];
    if (!list.length) return -1;
    const activeIndex = list.findIndex((page) => page && page.stage === document.activeStage);
    if (activeIndex >= 0) return activeIndex;

    const viewportAnchor = 148;
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    list.forEach((page, index) => {
        const rect = page.container?.getBoundingClientRect?.();
        if (!rect) return;
        const offscreenPenalty = rect.bottom < 0
            ? Math.abs(rect.bottom) + 2000
            : rect.top > window.innerHeight
                ? Math.abs(rect.top - window.innerHeight) + 2000
                : 0;
        const score = Math.abs(rect.top - viewportAnchor) + offscreenPenalty;
        if (score < bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    return bestIndex;
}

function captureProjectViewportState() {
    const list = Array.isArray(window.pages) ? window.pages : [];
    const pageIndex = pickViewportAnchorPageIndex(list);
    if (pageIndex < 0) return null;
    const page = list[pageIndex];
    const rect = page?.container?.getBoundingClientRect?.();
    if (!rect) return null;
    const absoluteTop = window.scrollY + rect.top;
    return {
        pageIndex,
        offsetWithinPage: window.scrollY - absoluteTop
    };
}

function restoreProjectViewportState(state) {
    if (!state) return;
    const pageIndex = Number(state.pageIndex);
    if (!Number.isInteger(pageIndex)) return;
    const offsetWithinPage = Number(state.offsetWithinPage) || 0;

    const applyRestore = () => {
        const list = Array.isArray(window.pages) ? window.pages : [];
        if (!list.length) return;
        const safeIndex = Math.max(0, Math.min(pageIndex, list.length - 1));
        const page = list[safeIndex];
        const rect = page?.container?.getBoundingClientRect?.();
        if (!page?.container || !rect) return;
        const absoluteTop = window.scrollY + rect.top;
        const targetTop = Math.max(0, absoluteTop + offsetWithinPage);
        document.activeStage = page.stage || document.activeStage;
        window.scrollTo({
            top: targetTop,
            behavior: "auto"
        });
    };

    [0, 80, 220, 420].forEach((delay) => {
        window.setTimeout(applyRestore, delay);
    });
}

async function loadProjectFromData(data, opts = {}) {
    if (!data || !data.pages) return showAppToast("Nieprawidłowy plik projektu!", "error");
    const loadSource = String((opts && opts.source) || "").trim().toLowerCase();
    const isHistoryReplayLoad = (
        loadSource === "history" ||
        loadSource === "undo" ||
        loadSource === "redo" ||
        loadSource === "restore"
    );
    const pageEditRestoreState = isHistoryReplayLoad && typeof window.getPageEditPanelRestoreState === "function"
        ? window.getPageEditPanelRestoreState()
        : null;
    const viewportRestoreState = isHistoryReplayLoad ? captureProjectViewportState() : null;
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
        try { window.hideFloatingButtons?.(); } catch (_e) {}
        try { window.hidePageEditPanel?.(); } catch (_e) {}
        try { window.hideTextToolbar?.(); } catch (_e) {}
        try { window.hideTextPanel?.(); } catch (_e) {}
        try { document.getElementById("floatingMenu")?.remove(); } catch (_e) {}
        try { document.getElementById("floatingSubmenu")?.remove(); } catch (_e) {}
        try { document.getElementById("groupQuickMenu")?.remove(); } catch (_e) {}
        const loadStamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        window.__projectLoadStamp = loadStamp;
        window.CATALOG_STYLE = data.catalogStyle || "default";
        setProjectTitle(data.name || DEFAULT_PROJECT_TITLE);
        syncSaveFormWithCurrentProject({
            forceName: String(data.name || "").trim(),
            forceDate: String(data.date || "").trim() || getTodayIsoDate(),
            overwriteName: true,
            overwriteDate: true
        });

        const savedPageWidth = Number(data.pageWidth);
        const savedPageHeight = Number(data.pageHeight);
        const rawSavedOrientation = String(data.pageOrientation || "").trim().toLowerCase();
        const normalizedSavedOrientation = (
            rawSavedOrientation === "landscape" || rawSavedOrientation === "horizontal" || rawSavedOrientation === "l"
        )
            ? "landscape"
            : (rawSavedOrientation === "portrait" || rawSavedOrientation === "vertical" || rawSavedOrientation === "p")
                ? "portrait"
                : (Number.isFinite(savedPageWidth) && Number.isFinite(savedPageHeight) && savedPageWidth > 0 && savedPageHeight > 0)
                    ? (savedPageWidth > savedPageHeight ? "landscape" : "portrait")
                    : null;
        const hasSavedPageSettings = (
            (Number.isFinite(savedPageWidth) && savedPageWidth > 100 && Number.isFinite(savedPageHeight) && savedPageHeight > 100) ||
            !!String(data.pageFormat || "").trim() ||
            !!normalizedSavedOrientation
        );
        if (hasSavedPageSettings) {
            if (typeof window.setCatalogPageSettings === "function") {
                await window.setCatalogPageSettings(
                    {
                        format: data.pageFormat || null,
                        orientation: normalizedSavedOrientation || null,
                        width: (Number.isFinite(savedPageWidth) && savedPageWidth > 100) ? savedPageWidth : undefined,
                        height: (Number.isFinite(savedPageHeight) && savedPageHeight > 100) ? savedPageHeight : undefined
                    },
                    {
                        rebuildExistingPages: false,
                        resizeInPlaceWhenNoRebuild: false,
                        silent: true
                    }
                );
            } else {
                if (Number.isFinite(savedPageWidth) && savedPageWidth > 100) window.W = savedPageWidth;
                if (Number.isFinite(savedPageHeight) && savedPageHeight > 100) window.H = savedPageHeight;
                try {
                    document.documentElement.style.setProperty("--page-width", `${Number(window.W || 0)}px`);
                    document.documentElement.style.setProperty("--panel-center-offset", "0px");
                } catch (_e) {}
                if (typeof window.recomputeCatalogGridMetrics === "function") {
                    try { window.recomputeCatalogGridMetrics(window.LAYOUT_MODE || "layout6"); } catch (_e) {}
                }
            }
        }

        window.__PROJECT_BACKGROUND_DEFAULT = (
            data.backgroundDefault && typeof data.backgroundDefault === "object"
        )
            ? cloneProjectSerializable(data.backgroundDefault, null)
            : null;

        const savedPages = Array.isArray(data.pages) ? data.pages : [];
        const hydrateNowLimit = getInitialHydratedPagesLimit(opts, savedPages.length);
        const hydratedPages = [];
        const immediateHydrationEntries = [];

        for (let i = 0; i < savedPages.length; i++) {
            const savedPage = (savedPages[i] && typeof savedPages[i] === "object") ? savedPages[i] : {};
            const page = window.createNewPage({ skipProjectBackgroundDefault: true });
            page.__projectLoadStamp = loadStamp;
            page.__savedUserProductGroups = normalizeSavedUserProductGroups(
                savedPage.userProductGroups || savedPage.groupedProductKeys
            );
            const savedProducts = cloneSavedPageProducts(savedPage.products);
            if (savedProducts.length) {
                page.products = savedProducts;
                page.slotObjects = Array(savedProducts.length).fill(null);
                page.barcodeObjects = Array(savedProducts.length).fill(null);
                page.barcodePositions = Array(savedProducts.length).fill(null);
                page.boxScales = Array(savedProducts.length).fill(null);
            }
            if (savedPage.settings && typeof savedPage.settings === "object") {
                page.settings = {
                    ...(page.settings && typeof page.settings === "object" ? page.settings : {}),
                    ...cloneProjectSerializable(savedPage.settings, {})
                };
            }
            if (i < hydrateNowLimit) {
                markPageDeferredHydration(page, null);
                hydratedPages.push(page);
                immediateHydrationEntries.push({ page, savedPage });
            } else {
                markPageDeferredHydration(page, savedPage);
            }
        }

        if (immediateHydrationEntries.length) {
            const hydrationConcurrency = Math.max(
                1,
                Number(opts.hydrationConcurrency || PROJECT_INITIAL_PAGE_HYDRATION_CONCURRENCY) || 1
            );
            await mapWithConcurrencyLimit(
                immediateHydrationEntries,
                hydrationConcurrency,
                async ({ page, savedPage }) => {
                    if (!isPageHydrationContextActive(page)) return;
                    await restoreSavedObjectsForPage(page, savedPage);
                }
            );
        }

        normalizeLoadedProductGroupsForPages(
            hydratedPages.length ? hydratedPages : (Array.isArray(window.pages) ? window.pages : [])
        );

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

        if (pageEditRestoreState && typeof window.restorePageEditPanelState === "function") {
            try { window.restorePageEditPanelState(pageEditRestoreState); } catch (_e) {}
        }

        if (isHistoryReplayLoad) {
            restoreProjectViewportState(viewportRestoreState);
        }

        refreshPdfButtonState();
        try { document.getElementById("floatingMenu")?.remove(); } catch (_e) {}
        try { document.getElementById("floatingSubmenu")?.remove(); } catch (_e) {}
        try { document.getElementById("groupQuickMenu")?.remove(); } catch (_e) {}

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
        if (!isHistoryReplayLoad) {
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
        }
        if (releaseProjectLoadMutex) releaseProjectLoadMutex();
        if (window.__projectLoadMutex === loadMutex) window.__projectLoadMutex = null;
    }
}
window.loadProjectFromData = loadProjectFromData;

async function loadProjectFromStorage(path, thumbPath) {
    const fileRef = ref(storage, path);
    const loaded = await loadProjectDataFromStorageRef(fileRef);
    const data = loaded && loaded.data ? loaded.data : null;
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
const savedBtn = document.querySelector('.sidebar-item[data-tooltip="Elementy zapisane"]');
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
    if (typeof window.hidePageEditPanel === "function") {
        window.hidePageEditPanel();
    }
    const list = document.getElementById("startProjectsList");
    if (list) loadSavedProjects(list);
}

function showEditorView() {
    const startView = document.getElementById("startProjectsView");
    const editorView = document.getElementById("editorView");
    if (startView) startView.style.display = "none";
    if (editorView) editorView.style.display = "block";
    refreshPdfButtonState();
    setTimeout(() => {
        if (typeof window.showPageEditForCurrentPage === "function") {
            window.showPageEditForCurrentPage();
        }
    }, 0);
}
window.showEditorView = showEditorView;

function ensureInitialBlankPage() {
    const hasPages = Array.isArray(window.pages) && window.pages.length > 0;
    if (hasPages) return false;
    if (typeof window.createNewPage !== "function") return false;
    window.createNewPage();
    window.projectOpen = true;
    window.projectDirty = true;
    refreshPdfButtonState();
    if (typeof window.createZoomSlider === "function") {
        window.createZoomSlider();
    }
    setTimeout(() => {
        if (typeof window.showPageEditForCurrentPage === "function") {
            window.showPageEditForCurrentPage();
        }
    }, 0);
    return true;
}

// Klik w logo -> przejście do strony startowej z potwierdzeniem
const homeLogo = document.getElementById("homeLogo");
if (homeLogo) {
    homeLogo.addEventListener("click", async (e) => {
        e.preventDefault();
        const targetUrl = homeLogo.getAttribute("data-start-url") || homeLogo.getAttribute("href") || "kreator.html";
        if (window.projectOpen || shouldAskBeforeLeave()) {
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
    if (typeof window.setCatalogPageSettings === "function") {
        try {
            await window.setCatalogPageSettings(
                {
                    format: "A4",
                    orientation: "portrait"
                },
                {
                    rebuildExistingPages: false,
                    resizeInPlaceWhenNoRebuild: false,
                    silent: true
                }
            );
        } catch (_e) {}
    }
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
    if (typeof window.isQuickCreatorEnabled === "function" && !window.isQuickCreatorEnabled()) {
        const quickModal = document.getElementById('quickCreatorModal');
        if (quickModal) quickModal.style.display = 'none';
        return;
    }
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
            background: rgba(4,10,22,0.62);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000002;
            backdrop-filter: blur(6px);
            padding: 20px;
        `;
        modal.innerHTML = `
            <div style="width:620px;max-width:92vw;background:radial-gradient(420px 180px at 100% 0%, rgba(58,168,255,0.08), transparent 52%), linear-gradient(180deg,#121a2a 0%,#0a101b 100%);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:22px 22px 18px;box-shadow:0 24px 60px rgba(0,0,0,0.42);font-family:Inter,Arial;color:#f5f7fb;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <div style="width:32px;height:32px;border-radius:10px;background:rgba(37,99,235,0.14);color:#7db7ff;display:flex;align-items:center;justify-content:center;font-weight:900;border:1px solid rgba(255,255,255,0.06);">!</div>
                    <h3 style="margin:0;font-size:24px;line-height:1.2;color:#f5f7fb;">Odświeżyć stronę?</h3>
                </div>
                <p style="margin:0 0 18px 0;color:#b7c2d8;font-size:16px;line-height:1.5;">
                    Projekt <strong>${projectName || "bez nazwy"}</strong> ma niezapisane zmiany. Wybierz, co chcesz zrobić.
                </p>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;">
                    <button id="reloadCancelBtn" style="padding:10px 16px;background:linear-gradient(180deg,#202838 0%,#151d2b 100%);color:#f5f7fb;border:1px solid rgba(255,255,255,0.08);border-radius:12px;cursor:pointer;font-weight:700;">Anuluj</button>
                    <button id="reloadSaveBtn" style="padding:10px 16px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#fff;border:none;border-radius:12px;cursor:pointer;font-weight:800;box-shadow:0 12px 28px rgba(37,99,235,0.22);">Zapisz i odśwież</button>
                    <button id="reloadOnlyBtn" style="padding:10px 16px;background:linear-gradient(135deg,#ff5a5f 0%,#ef4444 100%);color:#fff;border:none;border-radius:12px;cursor:pointer;font-weight:800;box-shadow:0 12px 28px rgba(239,68,68,0.22);">Odśwież bez zapisu</button>
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

function isSaveModalVisible() {
    const modal = document.getElementById("saveProjectModal");
    if (!modal) return false;
    return modal.style.display === "flex" || modal.style.display === "block";
}

async function handleSaveShortcut(e) {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    const key = String(e.key || "").toLowerCase();
    if (!isCmdOrCtrl || key !== "s") return;

    e.preventDefault();
    e.stopPropagation();

    if (e.shiftKey) {
        openSaveProjectModal();
        return;
    }

    if (isSaveModalVisible()) {
        await saveProjectNow({
            closeModal: true,
            allowUntitled: false
        });
        return;
    }

    await triggerProjectSaveFlow();
}
window.addEventListener("keydown", handleSaveShortcut, true);

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

    if (!(target.closest && target.closest(".start-card-toolbar"))) {
        closeStartProjectMenus();
    }

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

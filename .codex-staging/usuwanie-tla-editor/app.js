const fileInput = document.querySelector("#fileInput");
const removeBgBtn = document.querySelector("#removeBgBtn");
const cleanBgBtn = document.querySelector("#cleanBgBtn");
const resetBtn = document.querySelector("#resetBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const formatSelect = document.querySelector("#formatSelect");
const qualityRange = document.querySelector("#qualityRange");
const qualityValue = document.querySelector("#qualityValue");
const statusNode = document.querySelector("#status");
const metaNode = document.querySelector("#meta");
const previewCanvas = document.querySelector("#previewCanvas");
const resultCanvas = document.querySelector("#resultCanvas");

const previewCtx = previewCanvas.getContext("2d");
const resultCtx = resultCanvas.getContext("2d");

const PREVIEW_MAX_WIDTH = 720;
const PREVIEW_MAX_HEIGHT = 420;
const MIN_CROP_SIZE = 24;
const LOCAL_BACKEND_PORT = 5101;
const LOCAL_BACKEND_RESULT_OPTIONS = {
  minVisibleRatio: 0.12,
  minBoundingBoxRatio: 0.16,
};
const OPEN_SOURCE_AI_MODELS = [
  {
    id: "onnx-community/BEN2-ONNX",
    label: "BEN2",
    acceptScore: 8.4,
    loadOptions: { dtype: "fp32" },
  },
  {
    id: "onnx-community/ormbg-ONNX",
    label: "ORMBG",
    acceptScore: 7.6,
    loadOptions: {},
  },
];
const TRANSFORMERS_JS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const SOURCE_ALPHA_OPTIONS = {
  transparentPixelAlpha: 235,
  strongTransparentPixelAlpha: 12,
  meaningfulTransparentRatio: 0.12,
  strongTransparentRatio: 0.05,
  edgeBandRatio: 0.025,
  edgeTransparentRatio: 0.3,
  edgeStrongTransparentRatio: 0.14,
};
const REMOVE_BG_OPTIONS = {
  edgeThresholdFloor: 8,
  edgeThresholdPercentile: 72,
  edgeStdMultiplier: 0.9,
  lowThresholdRatio: 0.42,
  featherRadius: 2,
  minObjectAreaRatio: 0.01,
  maxObjectAreaRatio: 0.96,
};
const RESULT_REFINE_OPTIONS = {
  alphaStrongThreshold: 148,
  alphaSoftThreshold: 8,
  alphaTouchThreshold: 22,
  refineExpandPasses: 3,
  featherRadius: 2,
  protectExpandPasses: 2,
  borderDarkLumaOffset: 46,
  borderBackgroundDistFactor: 0.9,
  haloCleanupPasses: 2,
  haloBgDistFactor: 1.06,
  haloLumaOffset: 18,
  haloAlphaSoftCutoff: 228,
  autoCleanupPasses: 2,
};

const state = {
  originalFile: null,
  originalDataUrl: "",
  originalImage: null,
  currentDataUrl: "",
  currentImage: null,
  currentBlob: null,
  fileBaseName: "obrobione-zdjecie",
  crop: null,
  previousCrop: null,
  dragStart: null,
  isDragging: false,
  busy: false,
  backgroundRemoved: false,
  cleanupMode: false,
};

let transformersModulePromise = null;
const openSourceAiRemoverPromises = new Map();

qualityRange.addEventListener("input", () => {
  qualityValue.textContent = `${Math.round(Number(qualityRange.value) * 100)}%`;
  updateMeta();
});

formatSelect.addEventListener("change", updateControls);

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  await loadSelectedFile(file);
});

removeBgBtn.addEventListener("click", async () => {
  if (!state.currentImage || state.busy) {
    return;
  }

  setBusy(true);
  setStatus("Usuwanie tla przez mocniejsze AI open source...");

  try {
    const sourceBlob = await getCurrentSourceBlob();
    const sourceDataUrl = await getCurrentSourceForRemoveBg();
    const sourceAlphaInfo = await inspectImageTransparency(sourceDataUrl);
    let cleanedDataUrl;
    let shouldRefine = true;
    let finalSuccessMessage = "Tlo zostalo usuniete.";
    const shouldPreserveTransparency =
      sourceAlphaInfo.hasMeaningfulTransparency &&
      sourceAlphaInfo.transparentRatio >= 0.22 &&
      sourceAlphaInfo.edgeTransparentRatio >= 0.78 &&
      sourceAlphaInfo.edgeStrongTransparentRatio >= 0.18;

    if (shouldPreserveTransparency) {
      cleanedDataUrl = sourceDataUrl;
      shouldRefine = false;
      finalSuccessMessage = "Wykryto gotowa przezroczystosc. Zachowano oryginalne alpha.";
      setStatus("Plik ma juz przezroczystosc. Zachowuje istniejace alpha, zeby nie pogorszyc wyciecia.");
    } else {
      try {
        setStatus("Probuje lokalnego backendu backgroundremover...");
        const backendResult = await removeBackgroundWithLocalBackend(sourceDataUrl);
        cleanedDataUrl = backendResult.dataUrl;
        shouldRefine = false;
        finalSuccessMessage = "Tlo zostalo usuniete przez lokalny backend backgroundremover.";
        setStatus("Tlo usuniete przez lokalny backend backgroundremover.", "success");
      } catch (backendError) {
        console.warn("Local backgroundremover backend failed, falling back to in-browser removal.", backendError);

        try {
          const aiResult = await removeBackgroundWithOpenSourceAI(sourceBlob, sourceDataUrl);
          cleanedDataUrl = aiResult.dataUrl;
          finalSuccessMessage = `Tlo zostalo usuniete przez ${aiResult.label}.`;
          setStatus(`Tlo usuniete przez ${aiResult.label}.`, "success");
        } catch (aiError) {
          console.warn("Open-source AI background removal failed, falling back to local method.", aiError);
          setStatus("Lokalny backend nie odpowiada, uruchamiam fallback w przegladarce...");
          finalSuccessMessage = "Tlo zostalo usuniete przez lokalny fallback.";
          cleanedDataUrl = await removeBackgroundLocalFloodFill(sourceDataUrl, REMOVE_BG_OPTIONS);
        }
      }
    }

    if (shouldRefine) {
      setStatus("Dopracowuje krawedzie i odzyskuje brakujace fragmenty...");
      cleanedDataUrl = await refineRemovedBackgroundResult(
        state.originalDataUrl || cleanedDataUrl,
        cleanedDataUrl,
        RESULT_REFINE_OPTIONS,
      );
    }

    const resultImage = await loadImageFromSrc(cleanedDataUrl);
    const resultBlob = dataUrlToBlob(cleanedDataUrl);

    state.currentImage = resultImage;
    state.currentDataUrl = cleanedDataUrl;
    state.currentBlob = resultBlob;
    state.backgroundRemoved = true;
    state.cleanupMode = false;
    resetCrop();
    renderAll();
    setStatus(finalSuccessMessage, "success");
  } catch (error) {
    console.error(error);
    setStatus(`Nie udalo sie usunac tla: ${String(error?.message || error)}`, "error");
  } finally {
    setBusy(false);
  }
});

cleanBgBtn.addEventListener("click", () => {
  if (!state.currentImage || state.busy) {
    return;
  }

  state.cleanupMode = !state.cleanupMode;
  updateControls();

  if (state.cleanupMode) {
    setStatus("Tryb doczyszczania aktywny. Kliknij resztki tla przy brzegu obrazu.");
  } else {
    setStatus("Tryb doczyszczania wylaczony.");
  }
});

resetBtn.addEventListener("click", () => {
  if (!state.originalImage || state.busy) {
    return;
  }

  state.currentImage = state.originalImage;
  state.currentDataUrl = state.originalDataUrl;
  state.currentBlob = state.originalFile;
  state.backgroundRemoved = false;
  state.cleanupMode = false;
  resetCrop();
  renderAll();
  setStatus("Ustawienia zostaly zresetowane.");
});

downloadBtn.addEventListener("click", async () => {
  if (!state.currentImage || state.busy) {
    return;
  }

  setBusy(true);
  setStatus("Przygotowuje plik do pobrania...");

  try {
    const output = await buildOutputFile();
    const url = URL.createObjectURL(output.blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${state.fileBaseName}-gotowe.${output.extension}`;
    document.body.append(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    setStatus(
      `Plik gotowy: ${output.extension.toUpperCase()} (${formatBytes(output.blob.size)}).`,
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus("Nie udalo sie zapisac pliku.", "error");
  } finally {
    setBusy(false);
  }
});

previewCanvas.addEventListener("pointerdown", (event) => {
  if (!state.currentImage || state.busy) {
    return;
  }

  if (state.cleanupMode) {
    event.preventDefault();
    runManualCleanupAtPoint(pointerToImagePoint(event));
    return;
  }

  const point = pointerToImagePoint(event);
  state.dragStart = point;
  state.previousCrop = { ...getSafeCrop() };
  state.crop = {
    x: point.x,
    y: point.y,
    width: 1,
    height: 1,
  };
  state.isDragging = true;
  previewCanvas.setPointerCapture(event.pointerId);
  renderAll();
});

previewCanvas.addEventListener("pointermove", (event) => {
  if (!state.isDragging || !state.dragStart) {
    return;
  }

  const point = pointerToImagePoint(event);
  state.crop = normalizeRect(state.dragStart, point);
  renderAll();
});

previewCanvas.addEventListener("pointerup", finishCropSelection);
previewCanvas.addEventListener("pointercancel", finishCropSelection);
resultCanvas.addEventListener("pointerdown", (event) => {
  if (!state.currentImage || state.busy || !state.cleanupMode) {
    return;
  }

  event.preventDefault();
  runManualCleanupAtPoint(pointerToResultImagePoint(event));
});

renderPlaceholder(previewCanvas, previewCtx, "Podglad zdjecia");
renderPlaceholder(resultCanvas, resultCtx, "Tutaj pojawi sie wynik");
updateControls();

async function loadSelectedFile(file) {
  setBusy(true);
  setStatus("Laduje zdjecie...");

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImageFromSrc(dataUrl);

    state.originalFile = file;
    state.originalDataUrl = dataUrl;
    state.originalImage = image;
    state.currentDataUrl = dataUrl;
    state.currentImage = image;
    state.currentBlob = file;
    state.fileBaseName = sanitizeBaseName(file.name);
    state.backgroundRemoved = false;
    state.cleanupMode = false;
    resetCrop();
    renderAll();
    setStatus("Zdjecie gotowe. Zaznacz kadr na lewym podgladzie.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Nie udalo sie wczytac pliku.", "error");
  } finally {
    setBusy(false);
  }
}

function finishCropSelection(event) {
  if (!state.isDragging) {
    return;
  }

  state.isDragging = false;
  state.dragStart = null;

  if (previewCanvas.hasPointerCapture(event.pointerId)) {
    previewCanvas.releasePointerCapture(event.pointerId);
  }

  if (!state.crop || state.crop.width < MIN_CROP_SIZE || state.crop.height < MIN_CROP_SIZE) {
    state.crop = state.previousCrop || fullImageCrop();
  }

  renderAll();
}

function renderAll() {
  renderPreview();
  renderResult();
  updateMeta();
  updateControls();
}

function renderPreview() {
  if (!state.currentImage) {
    renderPlaceholder(previewCanvas, previewCtx, "Podglad zdjecia");
    return;
  }

  const size = fitWithin(
    state.currentImage.naturalWidth,
    state.currentImage.naturalHeight,
    PREVIEW_MAX_WIDTH,
    PREVIEW_MAX_HEIGHT,
  );

  previewCanvas.width = size.width;
  previewCanvas.height = size.height;

  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.drawImage(state.currentImage, 0, 0, previewCanvas.width, previewCanvas.height);

  const crop = getSafeCrop();
  const cropCanvas = imageRectToCanvasRect(crop, size.scale);

  previewCtx.save();
  previewCtx.fillStyle = "rgba(20, 20, 20, 0.45)";
  previewCtx.beginPath();
  previewCtx.rect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.rect(cropCanvas.x, cropCanvas.y, cropCanvas.width, cropCanvas.height);
  previewCtx.fill("evenodd");
  previewCtx.restore();

  previewCtx.save();
  previewCtx.strokeStyle = "#ffffff";
  previewCtx.lineWidth = 2;
  previewCtx.setLineDash([10, 6]);
  previewCtx.strokeRect(cropCanvas.x, cropCanvas.y, cropCanvas.width, cropCanvas.height);
  previewCtx.fillStyle = "#ffffff";
  previewCtx.font = "600 12px Segoe UI";
  previewCtx.fillText(`${crop.width} x ${crop.height}px`, 12, 24);
  previewCtx.restore();
}

function renderResult() {
  if (!state.currentImage) {
    renderPlaceholder(resultCanvas, resultCtx, "Tutaj pojawi sie wynik");
    return;
  }

  const crop = getSafeCrop();
  const size = fitWithin(crop.width, crop.height, PREVIEW_MAX_WIDTH, PREVIEW_MAX_HEIGHT);

  resultCanvas.width = size.width;
  resultCanvas.height = size.height;
  resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  resultCtx.imageSmoothingEnabled = true;
  resultCtx.imageSmoothingQuality = "high";
  resultCtx.drawImage(
    state.currentImage,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    resultCanvas.width,
    resultCanvas.height,
  );
}

function renderPlaceholder(canvas, ctx, label) {
  canvas.width = PREVIEW_MAX_WIDTH;
  canvas.height = PREVIEW_MAX_HEIGHT;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f6efe4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#7a6d5c";
  ctx.font = "600 24px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 - 8);
  ctx.font = "16px Segoe UI";
  ctx.fillText("Po wgraniu pliku pojawi sie podglad.", canvas.width / 2, canvas.height / 2 + 24);
}

function updateMeta() {
  if (!state.currentImage) {
    metaNode.textContent =
      "Auto wybiera mniejszy plik. Usuwanie tla najpierw probuje model open source.";
    return;
  }

  const crop = getSafeCrop();
  const sourceSize = state.originalFile ? formatBytes(state.originalFile.size) : "-";
  const formatLabel = formatSelect.value === "auto" ? "Auto" : formatSelect.value.toUpperCase();

  metaNode.textContent =
    `Plik: ${sourceSize} | Oryginal: ${state.currentImage.naturalWidth} x ${state.currentImage.naturalHeight}px | ` +
    `Kadr: ${crop.width} x ${crop.height}px | Tlo usuniete: ${state.backgroundRemoved ? "tak" : "nie"} | ` +
    `Zapis: ${formatLabel}`;
}

function updateControls() {
  const hasImage = Boolean(state.currentImage);
  const qualityDisabled = !hasImage || state.busy || formatSelect.value === "png";

  removeBgBtn.disabled = !hasImage || state.busy;
  cleanBgBtn.disabled = !hasImage || state.busy;
  resetBtn.disabled = !hasImage || state.busy;
  downloadBtn.disabled = !hasImage || state.busy;
  formatSelect.disabled = !hasImage || state.busy;
  qualityRange.disabled = qualityDisabled;

  cleanBgBtn.classList.toggle("is-active", state.cleanupMode && !cleanBgBtn.disabled);
  previewCanvas.style.cursor = hasImage && !state.busy ? (state.cleanupMode ? "cell" : "crosshair") : "default";
  resultCanvas.style.cursor = hasImage && !state.busy ? (state.cleanupMode ? "cell" : "default") : "default";
  qualityValue.style.opacity = qualityDisabled ? "0.55" : "1";
}

function setBusy(isBusy) {
  state.busy = isBusy;
  updateControls();
}

function setStatus(message, type = "info") {
  statusNode.textContent = message;
  statusNode.classList.remove("is-error", "is-success");

  if (type === "error") {
    statusNode.classList.add("is-error");
  }

  if (type === "success") {
    statusNode.classList.add("is-success");
  }
}

function resetCrop() {
  state.crop = fullImageCrop();
}

function fullImageCrop() {
  if (!state.currentImage) {
    return null;
  }

  return {
    x: 0,
    y: 0,
    width: state.currentImage.naturalWidth,
    height: state.currentImage.naturalHeight,
  };
}

function getSafeCrop() {
  if (!state.currentImage) {
    return null;
  }

  if (!state.crop) {
    return fullImageCrop();
  }

  const maxWidth = state.currentImage.naturalWidth;
  const maxHeight = state.currentImage.naturalHeight;
  const x = clamp(Math.round(state.crop.x), 0, maxWidth - 1);
  const y = clamp(Math.round(state.crop.y), 0, maxHeight - 1);
  const width = clamp(Math.round(state.crop.width), 1, maxWidth - x);
  const height = clamp(Math.round(state.crop.height), 1, maxHeight - y);

  return { x, y, width, height };
}

function pointerToImagePoint(event) {
  const rect = previewCanvas.getBoundingClientRect();
  const canvasX = ((event.clientX - rect.left) / rect.width) * previewCanvas.width;
  const canvasY = ((event.clientY - rect.top) / rect.height) * previewCanvas.height;
  const scaleX = state.currentImage.naturalWidth / previewCanvas.width;
  const scaleY = state.currentImage.naturalHeight / previewCanvas.height;

  return {
    x: clamp(Math.round(canvasX * scaleX), 0, state.currentImage.naturalWidth),
    y: clamp(Math.round(canvasY * scaleY), 0, state.currentImage.naturalHeight),
  };
}

function pointerToResultImagePoint(event) {
  const crop = getSafeCrop();
  const rect = resultCanvas.getBoundingClientRect();
  const canvasX = ((event.clientX - rect.left) / rect.width) * resultCanvas.width;
  const canvasY = ((event.clientY - rect.top) / rect.height) * resultCanvas.height;
  const scaleX = crop.width / resultCanvas.width;
  const scaleY = crop.height / resultCanvas.height;

  return {
    x: clamp(Math.round(crop.x + canvasX * scaleX), 0, state.currentImage.naturalWidth),
    y: clamp(Math.round(crop.y + canvasY * scaleY), 0, state.currentImage.naturalHeight),
  };
}

function normalizeRect(start, end) {
  const maxWidth = state.currentImage.naturalWidth;
  const maxHeight = state.currentImage.naturalHeight;
  const x1 = clamp(Math.min(start.x, end.x), 0, maxWidth - 1);
  const y1 = clamp(Math.min(start.y, end.y), 0, maxHeight - 1);
  const x2 = clamp(Math.max(start.x, end.x), x1 + 1, maxWidth);
  const y2 = clamp(Math.max(start.y, end.y), y1 + 1, maxHeight);

  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  };
}

function imageRectToCanvasRect(rect, scale) {
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    width: Math.max(1, Math.round(rect.width * scale)),
    height: Math.max(1, Math.round(rect.height * scale)),
  };
}

function fitWithin(width, height, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

async function buildOutputFile() {
  const crop = getSafeCrop();
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = crop.width;
  outputCanvas.height = crop.height;

  const ctx = outputCanvas.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    state.currentImage,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  if (formatSelect.value === "png") {
    return {
      blob: await canvasToBlob(outputCanvas, "image/png"),
      extension: "png",
    };
  }

  if (formatSelect.value === "jpg") {
    return {
      blob: await canvasToBlob(outputCanvas, "image/jpeg", Number(qualityRange.value)),
      extension: "jpg",
    };
  }

  return buildAutoOutput(outputCanvas, crop);
}

async function buildAutoOutput(canvas, crop) {
  if (state.backgroundRemoved) {
    return {
      blob: await canvasToBlob(canvas, "image/png"),
      extension: "png",
    };
  }

  const jpgBlob = await canvasToBlob(canvas, "image/jpeg", Number(qualityRange.value));
  const pngBlob = await canvasToBlob(canvas, "image/png");

  if (isUntouchedOriginal(crop) && state.originalFile) {
    const smallerGenerated = Math.min(jpgBlob.size || Number.MAX_SAFE_INTEGER, pngBlob.size);

    if (state.originalFile.size <= smallerGenerated) {
      return {
        blob: state.originalFile,
        extension: extensionFromMime(state.originalFile.type),
      };
    }
  }

  if (!jpgBlob.size || pngBlob.size <= jpgBlob.size) {
    return {
      blob: pngBlob,
      extension: "png",
    };
  }

  return {
    blob: jpgBlob,
    extension: "jpg",
  };
}

function isUntouchedOriginal(crop) {
  return (
    !state.backgroundRemoved &&
    crop.x === 0 &&
    crop.y === 0 &&
    crop.width === state.originalImage?.naturalWidth &&
    crop.height === state.originalImage?.naturalHeight
  );
}

async function getCurrentSourceForRemoveBg() {
  if (state.currentDataUrl) {
    return state.currentDataUrl;
  }

  if (state.currentBlob) {
    const dataUrl = await blobToDataUrl(state.currentBlob);
    state.currentDataUrl = dataUrl;
    return dataUrl;
  }

  throw new Error("Brak obrazu do usuniecia tla.");
}

async function getCurrentSourceBlob() {
  if (state.currentBlob instanceof Blob) {
    return state.currentBlob;
  }

  if (state.currentDataUrl) {
    const blob = dataUrlToBlob(state.currentDataUrl);
    state.currentBlob = blob;
    return blob;
  }

  throw new Error("Brak pliku do usuniecia tla.");
}

async function runManualCleanupAtPoint(point) {
  if (!point || state.busy) {
    return;
  }

  setBusy(true);
  setStatus("Doczyszczam wskazane tlo...");

  try {
    const cleanedDataUrl = await removeConnectedBackgroundAtPoint(state.currentDataUrl, point);
    if (!cleanedDataUrl) {
      setStatus("Nie znaleziono bezpiecznej resztki tla do usuniecia.");
      return;
    }

    const resultImage = await loadImageFromSrc(cleanedDataUrl);
    state.currentImage = resultImage;
    state.currentDataUrl = cleanedDataUrl;
    state.currentBlob = dataUrlToBlob(cleanedDataUrl);
    state.backgroundRemoved = true;
    renderAll();
    setStatus("Doczyszczono resztki tla.", "success");
  } catch (error) {
    console.error(error);
    setStatus(`Nie udalo sie doczyscic tla: ${String(error?.message || error)}`, "error");
  } finally {
    setBusy(false);
  }
}

async function removeConnectedBackgroundAtPoint(imageSource, point) {
  const image = await loadImageFromSrc(imageSource);
  const width = Math.max(1, Number(image.naturalWidth || image.width || 1));
  const height = Math.max(1, Number(image.naturalHeight || image.height || 1));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const startX = clamp(Math.round(point.x), 0, width - 1);
  const startY = clamp(Math.round(point.y), 0, height - 1);
  const startIndex = startY * width + startX;
  const startRgbaIndex = startIndex * 4;
  const sample = {
    r: data[startRgbaIndex],
    g: data[startRgbaIndex + 1],
    b: data[startRgbaIndex + 2],
    a: data[startRgbaIndex + 3],
  };

  const colorTolerance = sample.a < 160 ? 76 : 42;
  const alphaTolerance = sample.a < 180 ? 180 : 84;
  const visited = new Uint8Array(width * height);
  const stack = [startIndex];
  const region = [];
  let touchesBorder = false;
  let alphaSum = 0;

  visited[startIndex] = 1;

  while (stack.length) {
    const index = stack.pop();
    region.push(index);
    const rgbaIndex = index * 4;
    alphaSum += data[rgbaIndex + 3];

    const x = index % width;
    const y = (index / width) | 0;
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
      touchesBorder = true;
    }

    const neighbors = [];
    if (x > 0) neighbors.push(index - 1);
    if (x < width - 1) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - width);
    if (y < height - 1) neighbors.push(index + width);

    for (const neighbor of neighbors) {
      if (visited[neighbor]) {
        continue;
      }

      const nIdx = neighbor * 4;
      const dr = data[nIdx] - sample.r;
      const dg = data[nIdx + 1] - sample.g;
      const db = data[nIdx + 2] - sample.b;
      const da = data[nIdx + 3] - sample.a;
      const colorDistance = Math.hypot(dr, dg, db);

      if (colorDistance > colorTolerance || Math.abs(da) > alphaTolerance) {
        continue;
      }

      visited[neighbor] = 1;
      stack.push(neighbor);
    }
  }

  const averageAlpha = alphaSum / Math.max(1, region.length);
  if (!touchesBorder && averageAlpha > 220) {
    return "";
  }

  for (const index of region) {
    data[index * 4 + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

async function removeBackgroundWithLocalBackend(sourceDataUrl) {
  const payload = {
    imageDataUrl: sourceDataUrl,
    options: {
      model: "u2net",
      alphaMatting: true,
      alphaMattingForegroundThreshold: 235,
      alphaMattingBackgroundThreshold: 12,
      alphaMattingErodeSize: 8,
      alphaMattingBaseSize: 1600,
      preprocess: true,
      preprocessLongEdge: 1600,
    },
  };

  let lastError = null;
  for (const endpoint of getLocalBackendEndpoints()) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      window.clearTimeout(timer);

      let responseData = null;
      try {
        responseData = await response.json();
      } catch (_error) {
        responseData = null;
      }

      if (!response.ok) {
        throw new Error(responseData?.error || `HTTP ${response.status}`);
      }

      if (!responseData?.imageDataUrl) {
        throw new Error("Lokalny backend nie zwrocil obrazu.");
      }

      const backendMetrics = await analyzeMatteCoverage(responseData.imageDataUrl);
      const badCoverage =
        backendMetrics.visibleRatio < LOCAL_BACKEND_RESULT_OPTIONS.minVisibleRatio ||
        backendMetrics.boundingBoxRatio < LOCAL_BACKEND_RESULT_OPTIONS.minBoundingBoxRatio;

      if (badCoverage) {
        throw new Error(
          `Lokalny backend zwrocil zbyt maly obiekt (visible=${backendMetrics.visibleRatio.toFixed(3)}, bbox=${backendMetrics.boundingBoxRatio.toFixed(3)}).`,
        );
      }

      return {
        dataUrl: responseData.imageDataUrl,
        label: "backgroundremover",
        metrics: backendMetrics,
      };
    } catch (error) {
      window.clearTimeout(timer);
      lastError = error;
    }
  }

  throw lastError || new Error("Lokalny backend backgroundremover nie odpowiada.");
}

async function analyzeMatteCoverage(imageSource) {
  const image = await loadImageFromSrc(imageSource);
  const width = Math.max(1, Number(image.naturalWidth || image.width || 1));
  const height = Math.max(1, Number(image.naturalHeight || image.height || 1));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const alpha = extractAlphaChannel(imageData.data, width, height);
  let visible = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (alpha[index] <= 20) {
        continue;
      }

      visible += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const total = Math.max(1, width * height);
  const bboxArea =
    maxX >= minX && maxY >= minY
      ? (maxX - minX + 1) * (maxY - minY + 1)
      : 0;

  return {
    visibleRatio: visible / total,
    boundingBoxRatio: bboxArea / total,
  };
}

function getLocalBackendEndpoints() {
  const endpoints = [
    `http://127.0.0.1:${LOCAL_BACKEND_PORT}/api/remove-background`,
    `http://localhost:${LOCAL_BACKEND_PORT}/api/remove-background`,
  ];

  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    endpoints.unshift(new URL("/api/remove-background", window.location.href).href);
  }

  return [...new Set(endpoints)];
}

async function autoCleanupResidualBackground(imageSource, options = {}) {
  let current = imageSource;
  const passes = Math.max(1, Number(options.autoCleanupPasses) || 2);

  for (let pass = 0; pass < passes; pass += 1) {
    const image = await loadImageFromSrc(current);
    const width = Math.max(1, Number(image.naturalWidth || image.width || 1));
    const height = Math.max(1, Number(image.naturalHeight || image.height || 1));
    const points = buildAutoCleanupPoints(width, height, pass);
    let changedInPass = false;

    for (const point of points) {
      const next = await removeConnectedBackgroundAtPoint(current, point);
      if (next && next !== current) {
        current = next;
        changedInPass = true;
      }
    }

    if (!changedInPass) {
      break;
    }
  }

  return current;
}

function buildAutoCleanupPoints(width, height, pass = 0) {
  const inset = Math.max(2, Math.round(Math.min(width, height) * (pass === 0 ? 0.01 : 0.022)));
  const left = inset;
  const right = Math.max(inset, width - 1 - inset);
  const top = inset;
  const bottom = Math.max(inset, height - 1 - inset);
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);
  const quarterX = Math.round(width * 0.25);
  const threeQuarterX = Math.round(width * 0.75);
  const quarterY = Math.round(height * 0.25);
  const threeQuarterY = Math.round(height * 0.75);

  return dedupeCleanupPoints([
    { x: left, y: top },
    { x: centerX, y: top },
    { x: right, y: top },
    { x: left, y: quarterY },
    { x: right, y: quarterY },
    { x: left, y: centerY },
    { x: right, y: centerY },
    { x: left, y: threeQuarterY },
    { x: right, y: threeQuarterY },
    { x: left, y: bottom },
    { x: centerX, y: bottom },
    { x: right, y: bottom },
    { x: quarterX, y: top },
    { x: threeQuarterX, y: top },
    { x: quarterX, y: bottom },
    { x: threeQuarterX, y: bottom },
  ]);
}

function dedupeCleanupPoints(points) {
  const unique = [];
  const seen = new Set();

  for (const point of points) {
    const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(point);
  }

  return unique;
}

async function removeBackgroundWithOpenSourceAI(sourceBlob, originalSource) {
  const sourceUrl = URL.createObjectURL(sourceBlob);
  const candidates = [];
  const errors = [];

  try {
    for (const modelConfig of OPEN_SOURCE_AI_MODELS) {
      try {
        const candidate = await runOpenSourceAiCandidate(modelConfig, sourceUrl, originalSource);
        candidates.push(candidate);

        if (candidate.score >= Number(modelConfig.acceptScore || 999)) {
          break;
        }
      } catch (error) {
        errors.push(`${modelConfig.label}: ${String(error?.message || error)}`);
      }
    }
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }

  if (!candidates.length) {
    throw new Error(errors.join(" | ") || "Nie udalo sie uzyskac wyniku z modeli AI.");
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

async function runOpenSourceAiCandidate(modelConfig, sourceUrl, originalSource) {
  const remover = await getOpenSourceAiRemover(modelConfig);
  setStatus(`Analizuje zdjecie przez ${modelConfig.label}...`);

  const output = await remover([sourceUrl]);
  const first = Array.isArray(output) ? output[0] : output;
  const blob = await rawImageOutputToBlob(first);
  const dataUrl = await blobToDataUrl(blob);
  const score = await scoreMatteCandidate(originalSource, dataUrl);

  return {
    blob,
    dataUrl,
    score,
    label: modelConfig.label,
    modelId: modelConfig.id,
  };
}

async function getOpenSourceAiRemover(modelConfig) {
  const cacheKey = JSON.stringify({
    id: modelConfig.id,
    loadOptions: modelConfig.loadOptions || {},
  });

  if (openSourceAiRemoverPromises.has(cacheKey)) {
    return openSourceAiRemoverPromises.get(cacheKey);
  }

  const removerPromise = (async () => {
    const transformers = await getTransformersModule();
    setStatus(
      `Laduje model AI ${modelConfig.label}... pierwsze uruchomienie moze potrwac dluzej.`,
    );
    return transformers.pipeline(
      "background-removal",
      modelConfig.id,
      modelConfig.loadOptions && Object.keys(modelConfig.loadOptions).length
        ? modelConfig.loadOptions
        : undefined,
    );
  })();
  openSourceAiRemoverPromises.set(cacheKey, removerPromise);

  try {
    return await removerPromise;
  } catch (error) {
    openSourceAiRemoverPromises.delete(cacheKey);
    throw error;
  }
}

async function getTransformersModule() {
  if (!transformersModulePromise) {
    transformersModulePromise = import(TRANSFORMERS_JS_CDN).then((module) => {
      if (module.env) {
        module.env.allowLocalModels = false;
      }
      return module;
    });
  }

  return transformersModulePromise;
}

async function rawImageOutputToBlob(rawImage) {
  if (!rawImage) {
    throw new Error("Model AI nie zwrocil obrazu.");
  }

  if (typeof rawImage.toBlob === "function") {
    return rawImage.toBlob();
  }

  if (typeof rawImage.toCanvas === "function") {
    const canvas = await rawImage.toCanvas();
    return canvasToBlob(canvas, "image/png");
  }

  if (
    typeof rawImage.width === "number" &&
    typeof rawImage.height === "number" &&
    typeof rawImage.channels === "number" &&
    rawImage.data
  ) {
    return rawImageDataToBlob(rawImage);
  }

  throw new Error("Nieznany format wyniku z modelu AI.");
}

async function rawImageDataToBlob(rawImage) {
  const canvas = document.createElement("canvas");
  canvas.width = rawImage.width;
  canvas.height = rawImage.height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const source = rawImage.data;

  if (rawImage.channels === 4) {
    imageData.data.set(source);
  } else if (rawImage.channels === 3) {
    for (let i = 0; i < canvas.width * canvas.height; i += 1) {
      imageData.data[i * 4] = source[i * 3];
      imageData.data[i * 4 + 1] = source[i * 3 + 1];
      imageData.data[i * 4 + 2] = source[i * 3 + 2];
      imageData.data[i * 4 + 3] = 255;
    }
  } else if (rawImage.channels === 1) {
    for (let i = 0; i < canvas.width * canvas.height; i += 1) {
      const value = source[i];
      imageData.data[i * 4] = value;
      imageData.data[i * 4 + 1] = value;
      imageData.data[i * 4 + 2] = value;
      imageData.data[i * 4 + 3] = 255;
    }
  } else {
    throw new Error("Nieobslugiwany format obrazu z AI.");
  }

  ctx.putImageData(imageData, 0, 0);
  return canvasToBlob(canvas, "image/png");
}

function canvasToBlob(canvas, mimeType, quality) {
  const sourceCanvas = mimeType === "image/jpeg" ? flattenCanvas(canvas) : canvas;

  return new Promise((resolve, reject) => {
    sourceCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Canvas export failed"));
      },
      mimeType,
      quality,
    );
  });
}

function flattenCanvas(canvas) {
  const flatCanvas = document.createElement("canvas");
  flatCanvas.width = canvas.width;
  flatCanvas.height = canvas.height;

  const ctx = flatCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, flatCanvas.width, flatCanvas.height);
  ctx.drawImage(canvas, 0, 0);

  return flatCanvas;
}

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl || "").split(",");
  const meta = parts[0] || "";
  const mimeMatch = meta.match(/data:([^;]+)/i);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = window.atob(parts[1] || "");
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nie udalo sie odczytac pliku obrazu."));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nie udalo sie odczytac danych obrazu."));
    reader.readAsDataURL(blob);
  });
}

async function inspectImageTransparency(imageSource) {
  const image = await loadImageFromSrc(imageSource);
  const width = Math.max(1, Number(image.naturalWidth || image.width || 1));
  const height = Math.max(1, Number(image.naturalHeight || image.height || 1));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const alpha = extractAlphaChannel(imageData.data, width, height);
  let transparentPixels = 0;
  let strongTransparentPixels = 0;
  let edgePixels = 0;
  let edgeTransparentPixels = 0;
  let edgeStrongTransparentPixels = 0;
  const edgeBand = Math.max(2, Math.round(Math.min(width, height) * SOURCE_ALPHA_OPTIONS.edgeBandRatio));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const value = alpha[i];
      if (value < SOURCE_ALPHA_OPTIONS.transparentPixelAlpha) {
        transparentPixels += 1;
      }

      if (value <= SOURCE_ALPHA_OPTIONS.strongTransparentPixelAlpha) {
        strongTransparentPixels += 1;
      }

      if (!isBorderBandPixel(x, y, width, height, edgeBand)) {
        continue;
      }

      edgePixels += 1;
      if (value < SOURCE_ALPHA_OPTIONS.transparentPixelAlpha) {
        edgeTransparentPixels += 1;
      }

      if (value <= SOURCE_ALPHA_OPTIONS.strongTransparentPixelAlpha) {
        edgeStrongTransparentPixels += 1;
      }
    }
  }

  const totalPixels = Math.max(1, width * height);
  const transparentRatio = transparentPixels / totalPixels;
  const strongTransparentRatio = strongTransparentPixels / totalPixels;
  const edgeTransparentRatio = edgeTransparentPixels / Math.max(1, edgePixels);
  const edgeStrongTransparentRatio = edgeStrongTransparentPixels / Math.max(1, edgePixels);

  return {
    transparentRatio,
    strongTransparentRatio,
    edgeTransparentRatio,
    edgeStrongTransparentRatio,
    hasMeaningfulTransparency:
      strongTransparentRatio >= SOURCE_ALPHA_OPTIONS.strongTransparentRatio &&
      edgeTransparentRatio >= SOURCE_ALPHA_OPTIONS.edgeTransparentRatio &&
      edgeStrongTransparentRatio >= SOURCE_ALPHA_OPTIONS.edgeStrongTransparentRatio,
  };
}

function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const tryLoad = (mode) => {
      const image = new Image();
      if (mode === "anonymous") {
        image.crossOrigin = "anonymous";
      }

      let done = false;
      const finish = (ok, value) => {
        if (done) {
          return;
        }

        done = true;
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;

        if (ok) {
          resolve(value);
          return;
        }

        reject(value);
      };

      const timer = window.setTimeout(() => {
        if (mode === "anonymous") {
          tryLoad("plain");
          return;
        }

        finish(false, new Error("Timeout ladowania obrazu."));
      }, 9000);

      image.onload = () => finish(true, image);
      image.onerror = () => {
        if (mode === "anonymous") {
          tryLoad("plain");
          return;
        }

        finish(false, new Error("Nie mozna zaladowac obrazu."));
      };
      image.src = src;
    };

    tryLoad("anonymous");
  });
}

async function normalizeSourceForPixelRead(src) {
  const source = String(src || "").trim();
  if (!source) {
    throw new Error("Brak zrodla obrazu.");
  }

  if (source.startsWith("data:") || source.startsWith("blob:")) {
    return source;
  }

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3200);
    const response = await fetch(source, {
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return blobToDataUrl(blob);
  } catch (_error) {
    return source;
  }
}

async function removeBackgroundLocalFloodFill(imageSource, options = {}) {
  const sourceRaw = String(imageSource || "").trim();
  if (!sourceRaw) {
    throw new Error("Brak danych obrazu do usuniecia tla.");
  }

  const source = await normalizeSourceForPixelRead(sourceRaw);
  const image = await loadImageFromSrc(source);
  const width = Math.max(1, Number(image.naturalWidth || image.width || 1));
  const height = Math.max(1, Number(image.naturalHeight || image.height || 1));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Brak kontekstu 2D do usuwania tla.");
  }

  ctx.drawImage(image, 0, 0, width, height);

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch (error) {
    const message = String(error?.message || error || "");
    if (message.toLowerCase().includes("tainted") || message.toLowerCase().includes("cross-origin")) {
      throw new Error("Obraz blokuje odczyt pikseli przez CORS.");
    }

    throw error;
  }

  const data = imageData.data;
  const gray = rgbaToGrayscale(data, width, height);
  const blurred = blurScalarMap(gray, width, height, 1);
  const grayEdges = computeSobelEdges(blurred, width, height);
  const colorEdges = computeColorSobelEdges(data, width, height);
  const mergedEdges = mergeEdgeMaps(grayEdges, colorEdges, 0.7, 1);
  const attempts = [
    { stdBoost: 1.15, percentileBoost: 1.0, lowBoost: 1.0, dilate: 3, erode: 2 },
    { stdBoost: 0.95, percentileBoost: 0.92, lowBoost: 0.92, dilate: 4, erode: 2 },
    { stdBoost: 0.8, percentileBoost: 0.84, lowBoost: 0.82, dilate: 5, erode: 3 },
  ];

  let bestCandidate = null;
  for (const attempt of attempts) {
    const candidate = segmentForegroundCandidate(mergedEdges, width, height, {
      edgeThresholdFloor: options.edgeThresholdFloor,
      edgeThresholdPercentile: options.edgeThresholdPercentile,
      edgeStdMultiplier: Number(options.edgeStdMultiplier || 1) * attempt.stdBoost,
      percentileBoost: attempt.percentileBoost,
      lowThresholdRatio: Number(options.lowThresholdRatio || 0.42) * attempt.lowBoost,
      dilatePasses: attempt.dilate,
      erodePasses: attempt.erode,
      minObjectAreaRatio: options.minObjectAreaRatio,
      maxObjectAreaRatio: options.maxObjectAreaRatio,
    });

    if (!bestCandidate || candidate.score > bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate || !bestCandidate.mask || bestCandidate.foregroundPixels === 0) {
    throw new Error("Nie wykryto obiektu na zdjeciu.");
  }

  const cleanedMask = removeDarkBorderArtifacts(bestCandidate.mask, gray, width, height);
  const alphaMask = buildFeatheredAlphaMask(
    cleanedMask,
    width,
    height,
    Number.isFinite(options.featherRadius) ? Number(options.featherRadius) : 2,
  );

  let removedPixels = 0;
  for (let i = 0; i < width * height; i += 1) {
    const alpha = alphaMask[i];
    data[i * 4 + 3] = Math.min(data[i * 4 + 3], alpha);
    if (alpha === 0) {
      removedPixels += 1;
    }
  }

  if (removedPixels === 0) {
    throw new Error("Nie udalo sie oddzielic obiektu od tla.");
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

async function refineRemovedBackgroundResult(originalSource, matteSource, options = {}) {
  const originalImage = await loadImageFromSrc(originalSource);
  const matteImage = await loadImageFromSrc(matteSource);
  const width = Math.max(1, Number(originalImage.naturalWidth || originalImage.width || 1));
  const height = Math.max(1, Number(originalImage.naturalHeight || originalImage.height || 1));
  const originalCanvas = document.createElement("canvas");
  const matteCanvas = document.createElement("canvas");
  originalCanvas.width = width;
  originalCanvas.height = height;
  matteCanvas.width = width;
  matteCanvas.height = height;

  const originalCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
  const matteCtx = matteCanvas.getContext("2d", { willReadFrequently: true });
  originalCtx.drawImage(originalImage, 0, 0, width, height);
  matteCtx.drawImage(matteImage, 0, 0, width, height);

  const originalImageData = originalCtx.getImageData(0, 0, width, height);
  const matteImageData = matteCtx.getImageData(0, 0, width, height);
  const originalData = originalImageData.data;
  const matteData = matteImageData.data;
  const sourceAlpha = extractAlphaChannel(originalData, width, height);
  const alpha = extractAlphaChannel(matteData, width, height);
  const strongMask = alphaMaskToBinary(alpha, width, height, Number(options.alphaStrongThreshold) || 148);
  const softMask = alphaMaskToBinary(alpha, width, height, Number(options.alphaSoftThreshold) || 8);
  const primary = selectPrimaryForegroundMask(strongMask, softMask, width, height);

  if (!primary || !primary.mask) {
    return matteSource;
  }

  const gray = rgbaToGrayscale(originalData, width, height);
  const blurred = blurScalarMap(gray, width, height, 1);
  const grayEdges = computeSobelEdges(blurred, width, height);
  const colorEdges = computeColorSobelEdges(originalData, width, height);
  const mergedEdges = mergeEdgeMaps(grayEdges, colorEdges, 0.7, 1);
  const bgStats = estimateBackgroundStatsFromBorder(originalData, alpha, width, height);

  let refinedMask = new Uint8Array(primary.mask);
  refinedMask = expandMaskUsingOriginal(
    refinedMask,
    softMask,
    alpha,
    originalData,
    mergedEdges,
    bgStats,
    width,
    height,
    primary.component,
    options,
  );
  refinedMask = fillMaskHoles(refinedMask, width, height);
  refinedMask = removeBorderConnectedResidualBackground(
    refinedMask,
    strongMask,
    alpha,
    originalData,
    bgStats,
    width,
    height,
    options,
  );
  const protectedCore = buildProtectedCoreMask(primary.mask, strongMask, width, height);
  refinedMask = pruneBorderAttachedFringe(
    refinedMask,
    protectedCore,
    alpha,
    originalData,
    bgStats,
    width,
    height,
  );
  refinedMask = removeDarkBorderArtifacts(refinedMask, gray, width, height);

  const featheredAlpha = buildFeatheredAlphaMask(
    refinedMask,
    width,
    height,
    Number(options.featherRadius) || 2,
  );
  const finalAlpha = reduceLightHaloAlpha(
    refinedMask,
    protectedCore,
    alpha,
    featheredAlpha,
    originalData,
    bgStats,
    width,
    height,
    options,
  );

  for (let i = 0; i < width * height; i += 1) {
    const nextAlpha = Math.min(sourceAlpha[i], finalAlpha[i]);
    originalData[i * 4 + 3] = nextAlpha < 18 ? 0 : nextAlpha;
  }

  originalCtx.putImageData(originalImageData, 0, 0);
  return originalCanvas.toDataURL("image/png");
}

function extractAlphaChannel(rgba, width, height) {
  const alpha = new Uint8ClampedArray(width * height);

  for (let i = 0; i < width * height; i += 1) {
    alpha[i] = rgba[i * 4 + 3];
  }

  return alpha;
}

function alphaMaskToBinary(alpha, width, height, threshold) {
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < alpha.length; i += 1) {
    mask[i] = alpha[i] >= threshold ? 1 : 0;
  }

  return mask;
}

function selectPrimaryForegroundMask(strongMask, softMask, width, height) {
  const strongComponents = buildForegroundComponents(strongMask, width, height);
  const softComponents = buildForegroundComponents(softMask, width, height);
  const pool = strongComponents.length ? strongComponents : softComponents;

  if (!pool.length) {
    return null;
  }

  const best = pickBestForegroundComponent(pool, width, height);
  if (!best) {
    return null;
  }

  const paddingX = Math.max(12, Math.round((best.maxX - best.minX + 1) * 0.14));
  const paddingY = Math.max(12, Math.round((best.maxY - best.minY + 1) * 0.14));
  const keepLeft = Math.max(0, best.minX - paddingX);
  const keepTop = Math.max(0, best.minY - paddingY);
  const keepRight = Math.min(width - 1, best.maxX + paddingX);
  const keepBottom = Math.min(height - 1, best.maxY + paddingY);
  const keepMask = new Uint8Array(width * height);

  for (const component of softComponents.length ? softComponents : pool) {
    const overlapsMainBox =
      component.maxX >= keepLeft &&
      component.minX <= keepRight &&
      component.maxY >= keepTop &&
      component.minY <= keepBottom;
    const coversBestCenter =
      best.centerX >= component.minX &&
      best.centerX <= component.maxX &&
      best.centerY >= component.minY &&
      best.centerY <= component.maxY;
    const shouldKeep =
      coversBestCenter ||
      (!component.touchesBorder && overlapsMainBox && component.area >= Math.max(80, best.area * 0.015));

    if (!shouldKeep) {
      continue;
    }

    for (const index of component.pixels) {
      keepMask[index] = 1;
    }
  }

  const density =
    best.area / Math.max(1, (best.maxX - best.minX + 1) * (best.maxY - best.minY + 1));
  let finalMask = keepMask;
  if (density < 0.86) {
    finalMask = solidifyMaskByScanlines(keepMask, width, height, best);
  }

  return { mask: finalMask, component: best };
}

function pickBestForegroundComponent(components, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const centerIndex = Math.floor(centerY) * width + Math.floor(centerX);
  let best = null;

  for (const component of components) {
    const areaRatio = component.area / (width * height);
    const bboxWidth = component.maxX - component.minX + 1;
    const bboxHeight = component.maxY - component.minY + 1;
    const bboxAreaRatio = (bboxWidth * bboxHeight) / (width * height);
    const centerDistance =
      Math.hypot(component.centerX - centerX, component.centerY - centerY) /
      Math.hypot(centerX, centerY);
    const containsCenter =
      centerX >= component.minX &&
      centerX <= component.maxX &&
      centerY >= component.minY &&
      centerY <= component.maxY;
    const hasCenter = containsCenter && component.pixels.includes(centerIndex);

    let score = 0;
    score += component.touchesBorder ? -4 : 3;
    score += hasCenter ? 2.6 : 0;
    score += Math.min(4, areaRatio / 0.06);
    score += Math.min(2, bboxAreaRatio / 0.14);
    score += Math.max(-2, 1.35 - centerDistance * 2.1);

    if (!best || score > best.score) {
      best = { ...component, score };
    }
  }

  return best;
}

function estimateBackgroundStatsFromBorder(originalData, alpha, width, height) {
  const band = Math.max(2, Math.min(8, Math.round(Math.min(width, height) * 0.015)));
  const samples = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!(x < band || x >= width - band || y < band || y >= height - band)) {
        continue;
      }

      const index = y * width + x;
      if (alpha[index] > 24) {
        continue;
      }

      const rgbaIndex = index * 4;
      const r = originalData[rgbaIndex];
      const g = originalData[rgbaIndex + 1];
      const b = originalData[rgbaIndex + 2];
      const luma = r * 0.299 + g * 0.587 + b * 0.114;
      samples.push({ r, g, b, luma });
    }
  }

  if (!samples.length) {
    return {
      meanR: 245,
      meanG: 245,
      meanB: 245,
      meanLuma: 245,
      distThreshold: 22,
      recoverDistThreshold: 38,
      edgeThreshold: 24,
      lowEdgeThreshold: 12,
      lumaFloor: 220,
    };
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumL = 0;
  let sumR2 = 0;
  let sumG2 = 0;
  let sumB2 = 0;

  for (const sample of samples) {
    sumR += sample.r;
    sumG += sample.g;
    sumB += sample.b;
    sumL += sample.luma;
    sumR2 += sample.r * sample.r;
    sumG2 += sample.g * sample.g;
    sumB2 += sample.b * sample.b;
  }

  const count = samples.length;
  const meanR = sumR / count;
  const meanG = sumG / count;
  const meanB = sumB / count;
  const meanLuma = sumL / count;
  const stdR = Math.sqrt(Math.max(0, sumR2 / count - meanR * meanR));
  const stdG = Math.sqrt(Math.max(0, sumG2 / count - meanG * meanG));
  const stdB = Math.sqrt(Math.max(0, sumB2 / count - meanB * meanB));
  const stdAvg = (stdR + stdG + stdB) / 3;

  return {
    meanR,
    meanG,
    meanB,
    meanLuma,
    distThreshold: Math.max(18, Math.min(60, stdAvg * 1.8 + 12)),
    recoverDistThreshold: Math.max(26, Math.min(90, stdAvg * 2.7 + 18)),
    edgeThreshold: 22,
    lowEdgeThreshold: 11,
    lumaFloor: Math.max(170, meanLuma - 14),
  };
}

function expandMaskUsingOriginal(
  mask,
  softMask,
  alpha,
  originalData,
  edges,
  bgStats,
  width,
  height,
  component,
  options,
) {
  let current = new Uint8Array(mask);
  const paddingX = Math.max(14, Math.round((component.maxX - component.minX + 1) * 0.12));
  const paddingY = Math.max(14, Math.round((component.maxY - component.minY + 1) * 0.12));
  const left = Math.max(0, component.minX - paddingX);
  const top = Math.max(0, component.minY - paddingY);
  const right = Math.min(width - 1, component.maxX + paddingX);
  const bottom = Math.min(height - 1, component.maxY + paddingY);
  const passes = Math.max(1, Number(options.refineExpandPasses) || 3);

  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(current);

    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const index = y * width + x;
        if (current[index]) {
          continue;
        }

        const neighborCount = countForegroundNeighbors(current, width, height, x, y);
        if (neighborCount < 2) {
          continue;
        }

        const rgbaIndex = index * 4;
        const r = originalData[rgbaIndex];
        const g = originalData[rgbaIndex + 1];
        const b = originalData[rgbaIndex + 2];
        const luma = r * 0.299 + g * 0.587 + b * 0.114;
        const distBg = Math.hypot(r - bgStats.meanR, g - bgStats.meanG, b - bgStats.meanB);
        const edge = edges[index];
        const bridgesRow = hasForegroundOnBothSides(current, width, height, x, y, 42);
        const bridgesColumn = hasForegroundAboveAndBelow(current, width, height, x, y, 34);

        const likelyBackground =
          distBg < bgStats.distThreshold &&
          luma >= bgStats.lumaFloor &&
          edge < bgStats.lowEdgeThreshold &&
          !softMask[index];

        const shouldAdd =
          (softMask[index] && alpha[index] >= (Number(options.alphaTouchThreshold) || 22)) ||
          (distBg > bgStats.recoverDistThreshold && neighborCount >= 2) ||
          (edge >= bgStats.edgeThreshold && neighborCount >= 2) ||
          ((bridgesRow || bridgesColumn) && neighborCount >= 1) ||
          (neighborCount >= 5 && luma <= bgStats.meanLuma + 8);

        if (shouldAdd && !likelyBackground) {
          next[index] = 1;
        }
      }
    }

    current = next;
  }

  return current;
}

function countForegroundNeighbors(mask, width, height, x, y) {
  let count = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }

      if (mask[ny * width + nx]) {
        count += 1;
      }
    }
  }

  return count;
}

function hasForegroundOnBothSides(mask, width, height, x, y, maxGap) {
  let leftFound = false;
  let rightFound = false;

  for (let gap = 1; gap <= maxGap; gap += 1) {
    const left = x - gap;
    const right = x + gap;
    if (!leftFound && left >= 0 && mask[y * width + left]) {
      leftFound = true;
    }
    if (!rightFound && right < width && mask[y * width + right]) {
      rightFound = true;
    }
    if (leftFound && rightFound) {
      return true;
    }
  }

  return false;
}

function hasForegroundAboveAndBelow(mask, width, height, x, y, maxGap) {
  let topFound = false;
  let bottomFound = false;

  for (let gap = 1; gap <= maxGap; gap += 1) {
    const top = y - gap;
    const bottom = y + gap;
    if (!topFound && top >= 0 && mask[top * width + x]) {
      topFound = true;
    }
    if (!bottomFound && bottom < height && mask[bottom * width + x]) {
      bottomFound = true;
    }
    if (topFound && bottomFound) {
      return true;
    }
  }

  return false;
}

function fillMaskHoles(mask, width, height) {
  const externalBackground = floodFillBackgroundFromBorders(mask, width, height);
  const filled = new Uint8Array(mask);

  for (let i = 0; i < filled.length; i += 1) {
    if (!externalBackground[i]) {
      filled[i] = 1;
    }
  }

  return filled;
}

function buildProtectedCoreMask(primaryMask, strongMask, width, height) {
  const erodedPrimary = erodeBinaryMask(new Uint8Array(primaryMask), width, height, 2);
  const dilatedStrong = dilateBinaryMask(new Uint8Array(strongMask), width, height, 2);
  const protectedCore = new Uint8Array(width * height);

  for (let i = 0; i < protectedCore.length; i += 1) {
    protectedCore[i] = erodedPrimary[i] || dilatedStrong[i] ? 1 : 0;
  }

  return protectedCore;
}

function pruneBorderAttachedFringe(mask, protectedCore, alpha, originalData, bgStats, width, height) {
  const output = new Uint8Array(mask);
  const visited = new Uint8Array(width * height);
  const darkCutoff = Math.max(0, bgStats.meanLuma - 34);
  const bgLikeThreshold = bgStats.recoverDistThreshold * 0.92;

  function isNearProtected(index) {
    const x = index % width;
    const y = (index / width) | 0;

    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }
        if (protectedCore[ny * width + nx]) {
          return true;
        }
      }
    }

    return false;
  }

  function isFringeLike(index) {
    if (!output[index] || protectedCore[index]) {
      return false;
    }

    const rgbaIndex = index * 4;
    const r = originalData[rgbaIndex];
    const g = originalData[rgbaIndex + 1];
    const b = originalData[rgbaIndex + 2];
    const luma = r * 0.299 + g * 0.587 + b * 0.114;
    const distBg = Math.hypot(r - bgStats.meanR, g - bgStats.meanG, b - bgStats.meanB);
    const softAlpha = alpha[index] < 228;
    const bgLike = distBg <= bgLikeThreshold && luma >= bgStats.lumaFloor - 24;
    const darkLike = luma < darkCutoff;

    if (isNearProtected(index) && alpha[index] > 150 && !darkLike) {
      return false;
    }

    return softAlpha && (bgLike || darkLike);
  }

  function sweep(startIndex) {
    const stack = [startIndex];
    visited[startIndex] = 1;

    while (stack.length) {
      const current = stack.pop();
      output[current] = 0;

      const x = current % width;
      const y = (current / width) | 0;

      if (x > 0) {
        const left = current - 1;
        if (!visited[left] && isFringeLike(left)) {
          visited[left] = 1;
          stack.push(left);
        }
      }
      if (x < width - 1) {
        const right = current + 1;
        if (!visited[right] && isFringeLike(right)) {
          visited[right] = 1;
          stack.push(right);
        }
      }
      if (y > 0) {
        const top = current - width;
        if (!visited[top] && isFringeLike(top)) {
          visited[top] = 1;
          stack.push(top);
        }
      }
      if (y < height - 1) {
        const bottom = current + width;
        if (!visited[bottom] && isFringeLike(bottom)) {
          visited[bottom] = 1;
          stack.push(bottom);
        }
      }
    }
  }

  for (let x = 0; x < width; x += 1) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (!visited[top] && isFringeLike(top)) {
      sweep(top);
    }
    if (!visited[bottom] && isFringeLike(bottom)) {
      sweep(bottom);
    }
  }

  for (let y = 0; y < height; y += 1) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (!visited[left] && isFringeLike(left)) {
      sweep(left);
    }
    if (!visited[right] && isFringeLike(right)) {
      sweep(right);
    }
  }

  return output;
}

function removeBorderConnectedResidualBackground(
  mask,
  strongMask,
  alpha,
  originalData,
  bgStats,
  width,
  height,
  options,
) {
  const output = new Uint8Array(mask);
  const protectedMask = dilateBinaryMask(
    new Uint8Array(strongMask),
    width,
    height,
    Math.max(1, Number(options.protectExpandPasses) || 2),
  );
  const visited = new Uint8Array(width * height);
  const darkCutoff = Math.max(0, bgStats.meanLuma - (Number(options.borderDarkLumaOffset) || 46));
  const backgroundDistThreshold = bgStats.recoverDistThreshold * (Number(options.borderBackgroundDistFactor) || 0.9);

  function canRemove(index) {
    if (!output[index] || protectedMask[index]) {
      return false;
    }

    const rgbaIndex = index * 4;
    const r = originalData[rgbaIndex];
    const g = originalData[rgbaIndex + 1];
    const b = originalData[rgbaIndex + 2];
    const luma = r * 0.299 + g * 0.587 + b * 0.114;
    const distBg = Math.hypot(r - bgStats.meanR, g - bgStats.meanG, b - bgStats.meanB);
    const weakAlpha = alpha[index] < 120;
    const darkBackgroundLike = luma < darkCutoff;
    const neutralBackgroundLike =
      luma >= bgStats.lumaFloor - 22 &&
      distBg <= backgroundDistThreshold &&
      alpha[index] < 80;

    return weakAlpha && (darkBackgroundLike || neutralBackgroundLike);
  }

  function sweepFrom(index) {
    const stack = [index];
    visited[index] = 1;

    while (stack.length) {
      const current = stack.pop();
      output[current] = 0;

      const x = current % width;
      const y = (current / width) | 0;

      if (x > 0) {
        const left = current - 1;
        if (!visited[left] && canRemove(left)) {
          visited[left] = 1;
          stack.push(left);
        }
      }
      if (x < width - 1) {
        const right = current + 1;
        if (!visited[right] && canRemove(right)) {
          visited[right] = 1;
          stack.push(right);
        }
      }
      if (y > 0) {
        const top = current - width;
        if (!visited[top] && canRemove(top)) {
          visited[top] = 1;
          stack.push(top);
        }
      }
      if (y < height - 1) {
        const bottom = current + width;
        if (!visited[bottom] && canRemove(bottom)) {
          visited[bottom] = 1;
          stack.push(bottom);
        }
      }
    }
  }

  for (let x = 0; x < width; x += 1) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (!visited[top] && canRemove(top)) {
      sweepFrom(top);
    }
    if (!visited[bottom] && canRemove(bottom)) {
      sweepFrom(bottom);
    }
  }

  for (let y = 0; y < height; y += 1) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (!visited[left] && canRemove(left)) {
      sweepFrom(left);
    }
    if (!visited[right] && canRemove(right)) {
      sweepFrom(right);
    }
  }

  return output;
}

function rgbaToGrayscale(data, width, height) {
  const gray = new Uint8ClampedArray(width * height);

  for (let i = 0; i < width * height; i += 1) {
    const idx = i * 4;
    gray[i] = Math.round(data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
  }

  return gray;
}

function blurScalarMap(source, width, height, radius) {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) {
    return new Uint8ClampedArray(source);
  }

  const horizontal = new Uint8ClampedArray(source.length);
  const output = new Uint8ClampedArray(source.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;

      for (let dx = -r; dx <= r; dx += 1) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) {
          continue;
        }

        sum += source[y * width + nx];
        count += 1;
      }

      horizontal[y * width + x] = count ? Math.round(sum / count) : 0;
    }
  }

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      let count = 0;

      for (let dy = -r; dy <= r; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          continue;
        }

        sum += horizontal[ny * width + x];
        count += 1;
      }

      output[y * width + x] = count ? Math.round(sum / count) : 0;
    }
  }

  return output;
}

function computeSobelEdges(gray, width, height) {
  const edges = new Uint8ClampedArray(width * height);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const topLeft = gray[(y - 1) * width + (x - 1)];
      const top = gray[(y - 1) * width + x];
      const topRight = gray[(y - 1) * width + (x + 1)];
      const left = gray[y * width + (x - 1)];
      const right = gray[y * width + (x + 1)];
      const bottomLeft = gray[(y + 1) * width + (x - 1)];
      const bottom = gray[(y + 1) * width + x];
      const bottomRight = gray[(y + 1) * width + (x + 1)];

      const gx = -topLeft - 2 * left - bottomLeft + topRight + 2 * right + bottomRight;
      const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
      const magnitude = Math.min(255, Math.round(Math.hypot(gx, gy) / 4));
      edges[idx] = magnitude;
    }
  }

  return edges;
}

function computeColorSobelEdges(data, width, height) {
  const edges = new Uint8ClampedArray(width * height);

  function channel(index, offset) {
    return data[index * 4 + offset];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i00 = (y - 1) * width + (x - 1);
      const i01 = (y - 1) * width + x;
      const i02 = (y - 1) * width + (x + 1);
      const i10 = y * width + (x - 1);
      const i12 = y * width + (x + 1);
      const i20 = (y + 1) * width + (x - 1);
      const i21 = (y + 1) * width + x;
      const i22 = (y + 1) * width + (x + 1);
      let gx2 = 0;
      let gy2 = 0;

      for (let channelOffset = 0; channelOffset < 3; channelOffset += 1) {
        const gx =
          -channel(i00, channelOffset) -
          2 * channel(i10, channelOffset) -
          channel(i20, channelOffset) +
          channel(i02, channelOffset) +
          2 * channel(i12, channelOffset) +
          channel(i22, channelOffset);
        const gy =
          -channel(i00, channelOffset) -
          2 * channel(i01, channelOffset) -
          channel(i02, channelOffset) +
          channel(i20, channelOffset) +
          2 * channel(i21, channelOffset) +
          channel(i22, channelOffset);

        gx2 += gx * gx;
        gy2 += gy * gy;
      }

      const index = y * width + x;
      edges[index] = Math.min(255, Math.round(Math.sqrt(gx2 + gy2) / 10));
    }
  }

  return edges;
}

function mergeEdgeMaps(primary, secondary, primaryWeight, secondaryWeight) {
  const merged = new Uint8ClampedArray(primary.length);

  for (let i = 0; i < primary.length; i += 1) {
    merged[i] = Math.min(
      255,
      Math.round(primary[i] * primaryWeight + secondary[i] * secondaryWeight),
    );
  }

  return merged;
}

function computeEdgeThreshold(edges, options) {
  const histogram = new Uint32Array(256);
  let sum = 0;
  let sum2 = 0;
  let count = 0;

  for (let i = 0; i < edges.length; i += 1) {
    const value = edges[i];
    histogram[value] += 1;
    sum += value;
    sum2 += value * value;
    count += 1;
  }

  const mean = count ? sum / count : 0;
  const variance = count ? Math.max(0, sum2 / count - mean * mean) : 0;
  const std = Math.sqrt(variance);
  const percentileTarget = Math.max(0, Math.min(100, Number(options.edgeThresholdPercentile) || 82));
  const targetCount = Math.floor((percentileTarget / 100) * count);

  let running = 0;
  let percentileValue = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    running += histogram[value];
    if (running >= targetCount) {
      percentileValue = value;
      break;
    }
  }

  const stdThreshold = mean + std * (Number(options.edgeStdMultiplier) || 1.35);
  const percentileThreshold = percentileValue * (Number(options.percentileBoost) || 1);

  return Math.max(
    Number(options.edgeThresholdFloor) || 18,
    Math.round(stdThreshold),
    Math.round(percentileThreshold),
  );
}

function thresholdEdges(edges, width, height, threshold) {
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < edges.length; i += 1) {
    mask[i] = edges[i] >= threshold ? 1 : 0;
  }

  return mask;
}

function buildHysteresisEdgeMask(edges, width, height, lowThreshold, highThreshold) {
  const strong = new Uint8Array(width * height);
  const weak = new Uint8Array(width * height);
  const result = new Uint8Array(width * height);
  const stack = [];

  for (let i = 0; i < edges.length; i += 1) {
    const value = edges[i];
    if (value >= highThreshold) {
      strong[i] = 1;
      result[i] = 1;
      stack.push(i);
    } else if (value >= lowThreshold) {
      weak[i] = 1;
    }
  }

  while (stack.length) {
    const index = stack.pop();
    const x = index % width;
    const y = (index / width) | 0;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }

        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }

        const neighbor = ny * width + nx;
        if (!weak[neighbor] || result[neighbor]) {
          continue;
        }

        result[neighbor] = 1;
        stack.push(neighbor);
      }
    }
  }

  return result;
}

function dilateBinaryMask(mask, width, height, passes) {
  let current = new Uint8Array(mask);

  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(current);

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (current[index]) {
          continue;
        }

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) {
              continue;
            }

            if (current[(y + dy) * width + (x + dx)]) {
              next[index] = 1;
              dx = 2;
              dy = 2;
            }
          }
        }
      }
    }

    current = next;
  }

  return current;
}

function erodeBinaryMask(mask, width, height, passes) {
  let current = new Uint8Array(mask);

  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(current);

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (!current[index]) {
          continue;
        }

        let keep = true;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!current[(y + dy) * width + (x + dx)]) {
              keep = false;
              dx = 2;
              dy = 2;
            }
          }
        }

        if (!keep) {
          next[index] = 0;
        }
      }
    }

    current = next;
  }

  return current;
}

function clearMaskBorder(mask, width, height) {
  for (let x = 0; x < width; x += 1) {
    mask[x] = 0;
    mask[(height - 1) * width + x] = 0;
  }

  for (let y = 0; y < height; y += 1) {
    mask[y * width] = 0;
    mask[y * width + (width - 1)] = 0;
  }
}

function floodFillBackgroundFromBorders(barrier, width, height) {
  const background = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const stack = [];

  function push(index) {
    if (index < 0 || index >= barrier.length || visited[index] || barrier[index]) {
      return;
    }

    visited[index] = 1;
    stack.push(index);
  }

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }

  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + (width - 1));
  }

  while (stack.length) {
    const index = stack.pop();
    background[index] = 1;

    const x = index % width;
    const y = (index / width) | 0;

    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }

  return background;
}

function buildForegroundComponents(mask, width, height) {
  const visited = new Uint8Array(width * height);
  const components = [];
  let componentId = 0;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }

    const stack = [start];
    visited[start] = 1;

    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let touchesBorder = false;
    let sumX = 0;
    let sumY = 0;
    const pixels = [];

    while (stack.length) {
      const index = stack.pop();
      pixels.push(index);
      area += 1;

      const x = index % width;
      const y = (index / width) | 0;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        touchesBorder = true;
      }

      if (x > 0) {
        const left = index - 1;
        if (mask[left] && !visited[left]) {
          visited[left] = 1;
          stack.push(left);
        }
      }

      if (x < width - 1) {
        const right = index + 1;
        if (mask[right] && !visited[right]) {
          visited[right] = 1;
          stack.push(right);
        }
      }

      if (y > 0) {
        const top = index - width;
        if (mask[top] && !visited[top]) {
          visited[top] = 1;
          stack.push(top);
        }
      }

      if (y < height - 1) {
        const bottom = index + width;
        if (mask[bottom] && !visited[bottom]) {
          visited[bottom] = 1;
          stack.push(bottom);
        }
      }
    }

    components.push({
      id: componentId,
      pixels,
      area,
      touchesBorder,
      minX,
      minY,
      maxX,
      maxY,
      centerX: sumX / Math.max(1, area),
      centerY: sumY / Math.max(1, area),
    });
    componentId += 1;
  }

  return components;
}

function solidifyMaskByScanlines(mask, width, height, component) {
  const bboxWidth = component.maxX - component.minX + 1;
  const bboxHeight = component.maxY - component.minY + 1;
  const minSpan = Math.max(18, Math.round(bboxWidth * 0.22));
  const rowMin = new Array(height).fill(null);
  const rowMax = new Array(height).fill(null);

  for (let y = component.minY; y <= component.maxY; y += 1) {
    let minX = null;
    let maxX = null;

    for (let x = component.minX; x <= component.maxX; x += 1) {
      if (!mask[y * width + x]) {
        continue;
      }

      if (minX === null) {
        minX = x;
      }
      maxX = x;
    }

    if (minX !== null && maxX !== null && maxX - minX >= minSpan) {
      rowMin[y] = minX;
      rowMax[y] = maxX;
    }
  }

  const validRows = [];
  for (let y = component.minY; y <= component.maxY; y += 1) {
    if (rowMin[y] !== null) {
      validRows.push(y);
    }
  }

  if (validRows.length < Math.max(8, Math.round(bboxHeight * 0.14))) {
    return new Uint8Array(mask);
  }

  for (let y = validRows[0]; y <= validRows[validRows.length - 1]; y += 1) {
    if (rowMin[y] !== null) {
      continue;
    }

    let prev = null;
    let next = null;
    for (let py = y - 1; py >= validRows[0]; py -= 1) {
      if (rowMin[py] !== null) {
        prev = py;
        break;
      }
    }
    for (let ny = y + 1; ny <= validRows[validRows.length - 1]; ny += 1) {
      if (rowMin[ny] !== null) {
        next = ny;
        break;
      }
    }

    if (prev === null && next === null) {
      continue;
    }
    if (prev === null) {
      rowMin[y] = rowMin[next];
      rowMax[y] = rowMax[next];
      continue;
    }
    if (next === null) {
      rowMin[y] = rowMin[prev];
      rowMax[y] = rowMax[prev];
      continue;
    }

    const ratio = (y - prev) / Math.max(1, next - prev);
    rowMin[y] = Math.round(rowMin[prev] + (rowMin[next] - rowMin[prev]) * ratio);
    rowMax[y] = Math.round(rowMax[prev] + (rowMax[next] - rowMax[prev]) * ratio);
  }

  const smoothRadius = 4;
  const solid = new Uint8Array(mask);
  for (let y = validRows[0]; y <= validRows[validRows.length - 1]; y += 1) {
    if (rowMin[y] === null || rowMax[y] === null) {
      continue;
    }

    let minSum = 0;
    let maxSum = 0;
    let count = 0;
    for (let sy = y - smoothRadius; sy <= y + smoothRadius; sy += 1) {
      if (sy < validRows[0] || sy > validRows[validRows.length - 1]) {
        continue;
      }
      if (rowMin[sy] === null || rowMax[sy] === null) {
        continue;
      }

      minSum += rowMin[sy];
      maxSum += rowMax[sy];
      count += 1;
    }

    const left = Math.max(component.minX, Math.round(minSum / Math.max(1, count)));
    const right = Math.min(component.maxX, Math.round(maxSum / Math.max(1, count)));
    if (right - left < minSpan) {
      continue;
    }

    for (let x = left; x <= right; x += 1) {
      solid[y * width + x] = 1;
    }
  }

  return erodeBinaryMask(dilateBinaryMask(solid, width, height, 2), width, height, 1);
}

function segmentForegroundCandidate(edges, width, height, options) {
  const highThreshold = computeEdgeThreshold(edges, options);
  const lowThreshold = Math.max(
    4,
    Math.round(highThreshold * (Number(options.lowThresholdRatio) || 0.42)),
  );
  let barrier = buildHysteresisEdgeMask(edges, width, height, lowThreshold, highThreshold);
  barrier = dilateBinaryMask(barrier, width, height, Number(options.dilatePasses) || 0);
  barrier = erodeBinaryMask(barrier, width, height, Number(options.erodePasses) || 0);
  clearMaskBorder(barrier, width, height);

  const background = floodFillBackgroundFromBorders(barrier, width, height);
  const foreground = new Uint8Array(width * height);

  for (let i = 0; i < foreground.length; i += 1) {
    foreground[i] = background[i] ? 0 : 1;
  }

  const components = buildForegroundComponents(foreground, width, height);
  const totalPixels = width * height;
  const centerX = width / 2;
  const centerY = height / 2;
  const centerIndex = Math.floor(centerY) * width + Math.floor(centerX);

  if (!components.length) {
    return { mask: null, foregroundPixels: 0, score: -9999 };
  }

  let best = null;
  for (const component of components) {
    const areaRatio = component.area / totalPixels;
    const bboxWidth = component.maxX - component.minX + 1;
    const bboxHeight = component.maxY - component.minY + 1;
    const bboxAreaRatio = (bboxWidth * bboxHeight) / totalPixels;
    const centerDistance =
      Math.hypot(component.centerX - centerX, component.centerY - centerY) /
      Math.hypot(centerX, centerY);
    const containsCenter =
      centerX >= component.minX &&
      centerX <= component.maxX &&
      centerY >= component.minY &&
      centerY <= component.maxY;
    const componentMaskContainsCenter = containsCenter && component.pixels.includes(centerIndex);

    let score = 0;
    score += component.touchesBorder ? -4 : 3;
    score += componentMaskContainsCenter ? 2.5 : 0;
    score += Math.min(3.5, areaRatio / 0.08);
    score += Math.min(2, bboxAreaRatio / 0.15);
    score += Math.max(-2, 1.4 - centerDistance * 2.2);

    if (areaRatio < (Number(options.minObjectAreaRatio) || 0.01)) {
      score -= 5;
    }

    if (areaRatio > (Number(options.maxObjectAreaRatio) || 0.96)) {
      score -= 4;
    }

    if (!best || score > best.score) {
      best = { ...component, score };
    }
  }

  if (!best) {
    return { mask: null, foregroundPixels: 0, score: -9999 };
  }

  const keepMask = new Uint8Array(width * height);
  const paddingX = Math.max(12, Math.round((best.maxX - best.minX + 1) * 0.14));
  const paddingY = Math.max(12, Math.round((best.maxY - best.minY + 1) * 0.14));
  const keepLeft = Math.max(0, best.minX - paddingX);
  const keepTop = Math.max(0, best.minY - paddingY);
  const keepRight = Math.min(width - 1, best.maxX + paddingX);
  const keepBottom = Math.min(height - 1, best.maxY + paddingY);

  let foregroundPixels = 0;
  for (const component of components) {
    const overlapsMainBox =
      component.maxX >= keepLeft &&
      component.minX <= keepRight &&
      component.maxY >= keepTop &&
      component.minY <= keepBottom;
    const shouldKeep =
      component.id === best.id ||
      (!component.touchesBorder && overlapsMainBox && component.area >= Math.max(120, best.area * 0.02));

    if (!shouldKeep) {
      continue;
    }

    for (const index of component.pixels) {
      if (!keepMask[index]) {
        keepMask[index] = 1;
        foregroundPixels += 1;
      }
    }
  }

  const bestBoxArea = (best.maxX - best.minX + 1) * (best.maxY - best.minY + 1);
  const bestDensity = best.area / Math.max(1, bestBoxArea);
  let finalMask = keepMask;
  if (bestDensity < 0.42) {
    finalMask = solidifyMaskByScanlines(keepMask, width, height, best);
  }

  foregroundPixels = 0;
  for (let i = 0; i < finalMask.length; i += 1) {
    if (finalMask[i]) {
      foregroundPixels += 1;
    }
  }

  let score = best.score;
  const foregroundRatio = foregroundPixels / totalPixels;
  if (foregroundRatio < 0.015) {
    score -= 5;
  }
  if (foregroundRatio > 0.97) {
    score -= 6;
  }
  if (finalMask[centerIndex]) {
    score += 1.5;
  }

  return {
    mask: finalMask,
    foregroundPixels,
    score,
  };
}

function buildFeatheredAlphaMask(mask, width, height, featherRadius) {
  let workMask = new Uint8Array(mask);
  workMask = dilateBinaryMask(workMask, width, height, 1);

  const alpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < workMask.length; i += 1) {
    alpha[i] = workMask[i] ? 255 : 0;
  }

  const blurred = blurScalarMap(alpha, width, height, Math.max(1, Math.round(featherRadius)));

  for (let i = 0; i < blurred.length; i += 1) {
    if (blurred[i] < 18) {
      blurred[i] = 0;
    } else if (blurred[i] > 245) {
      blurred[i] = 255;
    }
  }

  return blurred;
}

function reduceLightHaloAlpha(
  mask,
  protectedCore,
  originalAlpha,
  featheredAlpha,
  originalData,
  bgStats,
  width,
  height,
  options,
) {
  let output = new Uint8ClampedArray(width * height);

  for (let i = 0; i < output.length; i += 1) {
    output[i] = mask[i] ? Math.max(originalAlpha[i], featheredAlpha[i]) : 0;
  }

  const passes = Math.max(1, Number(options.haloCleanupPasses) || 2);
  const bgThreshold = bgStats.recoverDistThreshold * (Number(options.haloBgDistFactor) || 1.06);
  const lumaFloor = bgStats.lumaFloor - (Number(options.haloLumaOffset) || 18);
  const softCutoff = Number(options.haloAlphaSoftCutoff) || 228;

  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8ClampedArray(output);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const currentAlpha = output[index];
        if (!mask[index] || !currentAlpha || protectedCore[index]) {
          continue;
        }

        const neighbors = summarizeAlphaNeighbors(output, width, height, x, y);
        if (neighbors.transparentCount === 0) {
          continue;
        }

        const rgbaIndex = index * 4;
        const r = originalData[rgbaIndex];
        const g = originalData[rgbaIndex + 1];
        const b = originalData[rgbaIndex + 2];
        const luma = r * 0.299 + g * 0.587 + b * 0.114;
        const distBg = Math.hypot(r - bgStats.meanR, g - bgStats.meanG, b - bgStats.meanB);
        const colorSpread = Math.max(r, g, b) - Math.min(r, g, b);
        const bgLike = distBg <= bgThreshold && luma >= lumaFloor;
        const lightNeutral = luma >= lumaFloor - 6 && colorSpread <= 26;
        const haloLike = bgLike || lightNeutral;

        if (!haloLike) {
          continue;
        }

        const mostlyOutside = neighbors.transparentCount >= 3 && neighbors.solidCount <= 3;
        const softEdge = currentAlpha < softCutoff || neighbors.transparentCount >= 4;

        if (mostlyOutside && currentAlpha < 170) {
          next[index] = 0;
          continue;
        }

        if (!softEdge) {
          continue;
        }

        const transparencyPressure =
          neighbors.transparentCount * 28 + Math.max(0, neighbors.semiTransparentCount - 1) * 10;
        const bgPressure = bgLike ? 44 : 22;
        const reduction = transparencyPressure + bgPressure;
        next[index] = Math.max(0, currentAlpha - reduction);
      }
    }

    output = next;
  }

  return output;
}

function summarizeAlphaNeighbors(alpha, width, height, x, y) {
  let transparentCount = 0;
  let semiTransparentCount = 0;
  let solidCount = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        transparentCount += 1;
        continue;
      }

      const value = alpha[ny * width + nx];
      if (value <= 18) {
        transparentCount += 1;
      } else if (value < 210) {
        semiTransparentCount += 1;
      } else {
        solidCount += 1;
      }
    }
  }

  return {
    transparentCount,
    semiTransparentCount,
    solidCount,
  };
}

async function scoreMatteCandidate(originalSource, matteSource) {
  const originalImage = await loadImageFromSrc(originalSource);
  const matteImage = await loadImageFromSrc(matteSource);
  const width = Math.max(1, Number(originalImage.naturalWidth || originalImage.width || 1));
  const height = Math.max(1, Number(originalImage.naturalHeight || originalImage.height || 1));
  const originalCanvas = document.createElement("canvas");
  const matteCanvas = document.createElement("canvas");
  originalCanvas.width = width;
  originalCanvas.height = height;
  matteCanvas.width = width;
  matteCanvas.height = height;

  const originalCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
  const matteCtx = matteCanvas.getContext("2d", { willReadFrequently: true });
  originalCtx.drawImage(originalImage, 0, 0, width, height);
  matteCtx.drawImage(matteImage, 0, 0, width, height);

  const originalData = originalCtx.getImageData(0, 0, width, height).data;
  const matteData = matteCtx.getImageData(0, 0, width, height).data;
  const alpha = extractAlphaChannel(matteData, width, height);
  const strongMask = alphaMaskToBinary(alpha, width, height, 140);
  const softMask = alphaMaskToBinary(alpha, width, height, 12);
  const primary = selectPrimaryForegroundMask(strongMask, softMask, width, height);

  if (!primary || !primary.mask || !primary.component) {
    return -999;
  }

  const totalPixels = Math.max(1, width * height);
  const mainArea = countMaskPixels(primary.mask);
  const areaRatio = mainArea / totalPixels;
  const bboxWidth = primary.component.maxX - primary.component.minX + 1;
  const bboxHeight = primary.component.maxY - primary.component.minY + 1;
  const bboxArea = Math.max(1, bboxWidth * bboxHeight);
  const density = mainArea / bboxArea;
  const bgStats = estimateBackgroundStatsFromBorder(originalData, alpha, width, height);
  const borderBand = Math.max(2, Math.min(10, Math.round(Math.min(width, height) * 0.012)));
  let borderPixels = 0;
  let borderVisible = 0;
  let borderSoft = 0;
  let borderBgLike = 0;
  let extraBorderNoise = 0;

  const components = buildForegroundComponents(softMask, width, height);
  for (const component of components) {
    if (component.id !== primary.component.id && component.touchesBorder) {
      extraBorderNoise += component.area;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isBorderBandPixel(x, y, width, height, borderBand)) {
        continue;
      }

      const index = y * width + x;
      const rgbaIndex = index * 4;
      const currentAlpha = alpha[index];
      borderPixels += 1;

      if (currentAlpha > 18) {
        borderVisible += 1;
      }

      if (currentAlpha > 18 && currentAlpha < 210) {
        borderSoft += 1;
      }

      if (currentAlpha <= 18) {
        continue;
      }

      const r = originalData[rgbaIndex];
      const g = originalData[rgbaIndex + 1];
      const b = originalData[rgbaIndex + 2];
      const luma = r * 0.299 + g * 0.587 + b * 0.114;
      const distBg = Math.hypot(r - bgStats.meanR, g - bgStats.meanG, b - bgStats.meanB);

      if (distBg <= bgStats.recoverDistThreshold * 0.95 && luma >= bgStats.lumaFloor - 20) {
        borderBgLike += 1;
      }
    }
  }

  const borderVisibleRatio = borderVisible / Math.max(1, borderPixels);
  const borderSoftRatio = borderSoft / Math.max(1, borderPixels);
  const borderBgLikeRatio = borderBgLike / Math.max(1, borderPixels);

  let score = Number(primary.component.score || 0);

  if (areaRatio < 0.02) {
    score -= 7;
  } else if (areaRatio < 0.05) {
    score -= 2.5;
  } else if (areaRatio > 0.97) {
    score -= 8;
  } else if (areaRatio > 0.9) {
    score -= 3;
  } else {
    score += 1.8;
  }

  score += Math.min(1.5, density * 1.6);
  score += Math.max(-4, 1.7 - borderVisibleRatio * 14);
  score += Math.max(-3, 0.9 - borderSoftRatio * 12);
  score += Math.max(-3, 1.0 - borderBgLikeRatio * 16);
  score -= (extraBorderNoise / totalPixels) * 72;

  return score;
}

function countMaskPixels(mask) {
  let count = 0;

  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) {
      count += 1;
    }
  }

  return count;
}

function isBorderBandPixel(x, y, width, height, band) {
  return x < band || x >= width - band || y < band || y >= height - band;
}

function removeDarkBorderArtifacts(mask, gray, width, height) {
  const visited = new Uint8Array(width * height);
  const output = new Uint8Array(mask);

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }

    const stack = [start];
    visited[start] = 1;
    const pixels = [];
    let touchesBorder = false;
    let graySum = 0;

    while (stack.length) {
      const index = stack.pop();
      pixels.push(index);
      graySum += gray[index];

      const x = index % width;
      const y = (index / width) | 0;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        touchesBorder = true;
      }

      if (x > 0) {
        const left = index - 1;
        if (mask[left] && !visited[left]) {
          visited[left] = 1;
          stack.push(left);
        }
      }
      if (x < width - 1) {
        const right = index + 1;
        if (mask[right] && !visited[right]) {
          visited[right] = 1;
          stack.push(right);
        }
      }
      if (y > 0) {
        const top = index - width;
        if (mask[top] && !visited[top]) {
          visited[top] = 1;
          stack.push(top);
        }
      }
      if (y < height - 1) {
        const bottom = index + width;
        if (mask[bottom] && !visited[bottom]) {
          visited[bottom] = 1;
          stack.push(bottom);
        }
      }
    }

    const avgGray = graySum / Math.max(1, pixels.length);
    const smallBorderArtifact = touchesBorder && pixels.length < Math.max(1800, mask.length * 0.035);
    const darkBorderArtifact = touchesBorder && avgGray < 150;

    if (smallBorderArtifact || darkBorderArtifact) {
      for (const index of pixels) {
        output[index] = 0;
      }
    }
  }

  return output;
}

function sanitizeBaseName(name) {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "obrobione-zdjecie";
}

function extensionFromMime(mimeType) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

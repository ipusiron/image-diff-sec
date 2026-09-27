// 画像処理に関するロジック

// グローバル変数
let objectUrls = new Map(); // URL管理用
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const imageStates = { canvas1: emptyImageState(), canvas2: emptyImageState() };
let comparing = false;
let lastComparison = null;
// 画面に出ている文言は { key, params } で覚え、言語の切り替えで訳し直す。訳した文字列は状態に入れない。
let matchState = null;
let resultState = null;

function emptyImageState() {
  return { loaded: false, hash: null, notice: null };
}

// 通知・ハッシュ表示・位置合わせ・結果を、保持した状態から描き直す。
function renderNotice(canvasId) {
  const notice = imageStates[canvasId].notice;
  document.getElementById(canvasId + "Notice").textContent =
    notice ? window.I18n.t(notice.key, notice.params) : "";
}

function renderHashLabel(canvasId) {
  const state = imageStates[canvasId];
  const label = document.getElementById(canvasId + "Hash");
  if (!state.loaded) {
    label.textContent = "";
    label.title = "";
    return;
  }
  label.textContent = state.hash
    ? window.I18n.t("hash.prefix", { prefix: state.hash.slice(0, 16) })
    : window.I18n.t("hash.unavailable");
  label.title = state.hash || "";
}

function renderMatch() {
  document.getElementById("matchResult").textContent =
    matchState ? window.I18n.t("match.overlay", matchState.params) : "";
  document.getElementById("matchWarning").textContent =
    matchState && matchState.lowScore ? window.I18n.t("match.lowScore") : "";
}

// describeResult() が返した部品を、表示の直前に訳して1つの文にする。
function describeText(parts) {
  const params = { ...parts.summary.params };
  if (parts.summary.rate) {
    params.rate = window.I18n.t(parts.summary.rate.key, parts.summary.rate.params);
  }
  let text = window.I18n.t(parts.summary.key, params);
  if (parts.tolerance) text += window.I18n.t(parts.tolerance.key, parts.tolerance.params);
  if (parts.bbox) text += "\n" + window.I18n.t(parts.bbox.key, parts.bbox.params);
  return text;
}

function renderResult() {
  const diffCanvas = document.getElementById("diffCanvas");
  if (!resultState) {
    document.getElementById("diffRate").textContent = "";
    document.getElementById("hashResult").textContent = "";
    diffCanvas.setAttribute("aria-label", window.I18n.t("result.canvasAriaEmpty"));
    return;
  }
  document.getElementById("diffRate").textContent = describeText(resultState.parts);
  document.getElementById("hashResult").textContent = window.I18n.t(resultState.hash.key) +
    (resultState.hash.extraKey ? "\n" + window.I18n.t(resultState.hash.extraKey) : "");
  diffCanvas.setAttribute("aria-label",
    window.I18n.t("result.canvasAria", { count: formatCount(resultState.diffCount) }));
}

// 言語を切り替えたときは、表示中の文言だけを訳し直す。比較や位置合わせはやり直さない。
function renderTexts() {
  for (const canvasId of ["canvas1", "canvas2"]) {
    renderNotice(canvasId);
    renderHashLabel(canvasId);
  }
  renderMatch();
  renderResult();
}

// ファイル選択処理の共通化（inputとドロップで同じ確認を行う）
async function handleFileSelect(file, canvasId) {
  if (!file || comparing) return;
  const inputId = canvasId === "canvas1" ? "image1" : "image2";
  clearImage(inputId, canvasId);
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    window.UIController.showMessage("error.unsupportedType", true);
    return;
  }
  const state = emptyImageState();
  imageStates[canvasId] = state;
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  objectUrls.set(canvasId, objectUrl);

  img.onload = async () => {
    if (imageStates[canvasId] !== state) return;
    const canvas = document.getElementById(canvasId);
    const MAX_SIZE = 4096;
    let width = img.width;
    let height = img.height;

    if (width > MAX_SIZE || height > MAX_SIZE) {
      const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
      state.notice = {
        key: "notice.downscaled",
        params: {
          number: canvasId === "canvas1" ? 1 : 2,
          originalWidth: img.width, originalHeight: img.height, width, height
        }
      };
      renderNotice(canvasId);
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);
    canvas.hidden = false;
    URL.revokeObjectURL(objectUrl);
    objectUrls.delete(canvasId);

    try {
      if (!globalThis.crypto?.subtle) throw new Error("digest unavailable");
      state.hash = toHex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
    } catch {
      state.hash = null;
    }
    if (imageStates[canvasId] !== state) return;
    state.loaded = true;
    renderHashLabel(canvasId);
    document.getElementById(canvasId + "Copy").disabled = !state.hash;
    window.UIController.showMessage(null);
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    if (imageStates[canvasId] !== state) return;
    objectUrls.delete(canvasId);
    window.UIController.showMessage("error.loadFailed", true);
  };
  img.src = objectUrl;
}

function readCanvas(canvas) {
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    window.UIController.showMessage("error.pixelsUnreadable", true);
    return null;
  }
}

function setComparing(value) {
  comparing = value;
  for (const id of ["compareButton", "image1", "image2", "clear1", "clear2", "tolerance"]) {
    document.getElementById(id).disabled = value;
  }
  document.getElementById("saveDiff").disabled = value || !lastComparison;
}

async function yieldForPaint() {
  // 次の描画まで待ち、進捗が画面へ反映されてから次段を計算する。
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
}

// 重複領域の検出と比較
async function compareImagesWithOverlap() {
  if (comparing) return;
  resetResult();
  if (!imageStates.canvas1.loaded || !imageStates.canvas2.loaded) {
    window.UIController.showMessage("error.needBothImages", true);
    return;
  }
  const canvas1 = document.getElementById("canvas1");
  const canvas2 = document.getElementById("canvas2");
  const choice = chooseLargeSmall(canvas1.width, canvas1.height, canvas2.width, canvas2.height);
  if (choice.error) {
    window.UIController.showMessage("error.noContainment", true);
    return;
  }
  setComparing(true);
  try {
    if (choice.same) {
      compareImagesSameSize(canvas1, canvas2);
      return;
    }
    const largeCanvas = choice.large === 1 ? canvas1 : canvas2;
    const smallCanvas = choice.large === 1 ? canvas2 : canvas1;
    const large = readCanvas(largeCanvas), small = readCanvas(smallCanvas);
    if (!large || !small) return;
    const L = toLuma(large), S = toLuma(small);
    if (isFlat(S)) {
      showUnmatchable();
      return;
    }
    const levels = buildLevels(L, largeCanvas.width, largeCanvas.height, S, smallCanvas.width, smallCanvas.height);
    let candidates;
    for (let i = 0; i < levels.length; i++) {
      window.UIController.showMessage("status.aligning", false, { step: i + 1, total: levels.length });
      await yieldForPaint();
      candidates = i === 0 ? searchCoarsest(levels[i]) : refineLevel(levels[i], candidates);
    }
    const match = candidates[0];
    if (match.score === 0) {
      showUnmatchable();
      return;
    }
    const width = smallCanvas.width, height = smallCanvas.height;
    lastComparison = {
      a: cropRegion(large, largeCanvas.width, match.x, match.y, width, height),
      b: small, width, height
    };
    matchState = {
      params: {
        large: choice.large, small: 3 - choice.large,
        x: match.x, y: match.y, score: match.score.toFixed(4)
      },
      lowScore: matchConfidence(match.score) === "low"
    };
    renderMatch();
    renderComparison();
  } catch {
    resetResult();
    window.UIController.showMessage("error.compareFailed", true);
  } finally {
    setComparing(false);
  }
}

function showUnmatchable() {
  window.UIController.showMessage("error.unmatchable", true);
}

// 同じサイズでも異サイズと同じRGBAの物差しを使う。
function compareImagesSameSize(canvas1, canvas2) {
  const a = readCanvas(canvas1), b = readCanvas(canvas2);
  if (!a || !b) return;
  lastComparison = { a, b, width: canvas1.width, height: canvas1.height };
  renderComparison();
}

function renderComparison() {
  if (!lastComparison) return;
  const { a, b, width, height } = lastComparison;
  const tolerance = Number(document.getElementById("tolerance").value);
  const result = comparePixels(a, b, width, height, tolerance);
  const diffCanvas = document.getElementById("diffCanvas");
  diffCanvas.width = width;
  diffCanvas.height = height;
  diffCanvas.hidden = false;
  const diffCtx = diffCanvas.getContext("2d", { willReadFrequently: true });
  const diff = diffCtx.createImageData(width, height);
  for (let i = 0, pixel = 0; i < a.length; i += 4, pixel++) {
    const gray = (a[i] + a[i + 1] + a[i + 2]) / 3;
    const value = Math.round((gray + 255) / 2);
    diff.data[i] = result.mask[pixel] ? 255 : value;
    diff.data[i + 1] = result.mask[pixel] ? 0 : value;
    diff.data[i + 2] = result.mask[pixel] ? 0 : value;
    diff.data[i + 3] = 255;
  }
  diffCtx.putImageData(diff, 0, 0);
  if (result.bbox) {
    const box = result.bbox;
    diffCtx.strokeStyle = "rgb(0,90,255)";
    diffCtx.lineWidth = 2;
    diffCtx.strokeRect(box.minX - 3, box.minY - 3, box.width + 6, box.height + 6);
  }
  const { hash: hash1 } = imageStates.canvas1, { hash: hash2 } = imageStates.canvas2;
  const hashMessage = { key: "hash.unavailable", extraKey: null };
  if (hash1 && hash2) {
    hashMessage.key = hash1 === hash2 ? "hash.same" : "hash.different";
    if (hash1 !== hash2 && result.diffCount === 0) {
      hashMessage.extraKey = tolerance === 0 ? "hash.metaOnly" : "hash.metaOnlyTolerance";
    }
  }
  resultState = {
    parts: describeResult({ ...result, tolerance }),
    diffCount: result.diffCount,
    hash: hashMessage
  };
  renderResult();
  document.getElementById("saveDiff").disabled = false;
  window.UIController.showMessage(null);
}

function resetResult() {
  lastComparison = null;
  matchState = null;
  resultState = null;
  renderMatch();
  renderResult();
  const canvas = document.getElementById("diffCanvas");
  canvas.width = 0;
  canvas.height = 0;
  canvas.hidden = true;
  document.getElementById("saveDiff").disabled = true;
}

// メインの比較関数
function compareImages() {
  return compareImagesWithOverlap();
}

// 差分画像の保存。生成したURLはクリック後に解放する。
function saveDiff() {
  if (!lastComparison || comparing) return;
  document.getElementById("diffCanvas").toBlob(blob => {
    if (!blob) {
      window.UIController.showMessage("error.saveFailed", true);
      return;
    }
    const date = new Date();
    const pad = value => String(value).padStart(2, "0");
    const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
      `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `imagediffsec_diff_${stamp}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

async function copyHash(canvasId) {
  const hash = imageStates[canvasId].hash;
  if (!hash) return;
  try {
    await navigator.clipboard.writeText(hash);
    window.UIController.showMessage("notice.copied");
  } catch {
    window.UIController.showMessage("error.copyFailed", true);
  }
}

// 画像クリア処理
function clearImage(inputId, canvasId) {
  if (comparing) return;
  imageStates[canvasId] = emptyImageState();
  const input = document.getElementById(inputId);
  input.value = "";
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
  canvas.hidden = true;
  renderHashLabel(canvasId);
  renderNotice(canvasId);
  document.getElementById(canvasId + "Copy").disabled = true;

  // メモリ解放
  if (objectUrls.has(canvasId)) {
    URL.revokeObjectURL(objectUrls.get(canvasId));
    objectUrls.delete(canvasId);
  }

  resetResult();
  window.UIController.showMessage(null);
}

// メモリ解放用のクリーンアップ関数
function cleanupObjectUrls() {
  objectUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  objectUrls.clear();
}

// エクスポート（グローバルスコープに公開）
window.ImageProcessor = {
  handleFileSelect,
  compareImages,
  clearImage,
  cleanupObjectUrls,
  renderComparison,
  renderTexts,
  saveDiff,
  copyHash
};

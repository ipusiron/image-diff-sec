// 画像処理に関するロジック

// グローバル変数
let objectUrls = new Map(); // URL管理用
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const imageStates = { canvas1: { loaded: false }, canvas2: { loaded: false } };
let comparing = false;
let lastComparison = null;

// ファイル選択処理の共通化（inputとドロップで同じ確認を行う）
async function handleFileSelect(file, canvasId) {
  if (!file || comparing) return;
  const inputId = canvasId === "canvas1" ? "image1" : "image2";
  clearImage(inputId, canvasId);
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    window.UIController.showMessage("対応していない形式（PNG・JPEG・GIF・WebPに対応）", true);
    return;
  }
  const state = { loaded: false, hash: null };
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
      const number = canvasId === "canvas1" ? 1 : 2;
      document.getElementById(canvasId + "Notice").textContent =
        `⚠ 画像${number}は4096pxを超えていたので縮小して読み込んだ（${img.width}×${img.height} → ${width}×${height}）。` +
        "縮小した画像では厳密な比較にならない";
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
    const hashLabel = document.getElementById(canvasId + "Hash");
    hashLabel.textContent = state.hash
      ? `SHA-256: ${state.hash.slice(0, 16)}…（先頭16桁）`
      : "この環境ではSHA-256を計算できない";
    hashLabel.title = state.hash || "";
    document.getElementById(canvasId + "Copy").disabled = !state.hash;
    state.loaded = true;
    window.UIController.showMessage("");
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    if (imageStates[canvasId] !== state) return;
    objectUrls.delete(canvasId);
    window.UIController.showMessage("画像の読み込みに失敗しました。", true);
  };
  img.src = objectUrl;
}

function readCanvas(canvas) {
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    window.UIController.showMessage("この画像からは画素を読み出せない", true);
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
    window.UIController.showMessage("画像1と画像2を読み込むこと", true);
    return;
  }
  const canvas1 = document.getElementById("canvas1");
  const canvas2 = document.getElementById("canvas2");
  const choice = chooseLargeSmall(canvas1.width, canvas1.height, canvas2.width, canvas2.height);
  if (choice.error) {
    window.UIController.showMessage("両画像のサイズ関係では重複領域の検出ができません。", true);
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
      window.UIController.showMessage(`位置合わせ中…（${i + 1} / ${levels.length} 段）`);
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
    document.getElementById("matchResult").textContent =
      `画像${choice.large}の (${match.x}, ${match.y}) に画像${3 - choice.large}を重ねて比較` +
      `（位置合わせのスコア ${match.score.toFixed(4)}）`;
    if (matchConfidence(match.score) === "low") {
      document.getElementById("matchWarning").textContent =
        "⚠ 位置合わせのスコアが0.90に届いていない。画像の内容が大きく違うか、位置合わせが外れている。" +
        "差分が全体に散らばっているなら、位置合わせの失敗を疑うこと";
    }
    renderComparison();
  } catch {
    resetResult();
    window.UIController.showMessage("画像の比較を完了できませんでした。画像を読み込み直してください。", true);
  } finally {
    setComparing(false);
  }
}

function showUnmatchable() {
  window.UIController.showMessage("位置合わせ不能: 小さいほうの画像が単色で、位置を決める手がかりがない", true);
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
  document.getElementById("diffRate").textContent = describeResult({ ...result, tolerance });
  diffCanvas.setAttribute("aria-label", `差分の画像。${formatCount(result.diffCount)}画素が赤で示されている`);
  const { hash: hash1 } = imageStates.canvas1, { hash: hash2 } = imageStates.canvas2;
  let hashMessage = "この環境ではSHA-256を計算できない";
  if (hash1 && hash2) {
    hashMessage = hash1 === hash2 ? "ファイルは同一（SHA-256が一致）" : "ファイルは別物（SHA-256が不一致）";
    if (hash1 !== hash2 && result.diffCount === 0) {
      hashMessage += tolerance === 0
        ? "\n画素は一致するが、ファイルは別物である。メタデータ（Exifなど）や圧縮の設定だけが違う可能性がある"
        : "\n許容差の範囲では画素が一致するが、ファイルは別物である";
    }
  }
  document.getElementById("hashResult").textContent = hashMessage;
  document.getElementById("saveDiff").disabled = false;
  window.UIController.showMessage("");
}

function resetResult() {
  lastComparison = null;
  for (const id of ["diffRate", "matchResult", "matchWarning", "hashResult"]) {
    document.getElementById(id).textContent = "";
  }
  const canvas = document.getElementById("diffCanvas");
  canvas.width = 0;
  canvas.height = 0;
  canvas.hidden = true;
  canvas.setAttribute("aria-label", "差分の画像。まだ比較していません");
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
      window.UIController.showMessage("PNGを保存できませんでした。", true);
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
    window.UIController.showMessage("SHA-256をコピーしました。");
  } catch {
    window.UIController.showMessage("コピーできませんでした。SHA-256の全桁はハッシュ表示のtitleから確認できます。", true);
  }
}

// 画像クリア処理
function clearImage(inputId, canvasId) {
  if (comparing) return;
  imageStates[canvasId] = { loaded: false, hash: null };
  const input = document.getElementById(inputId);
  input.value = "";
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
  canvas.hidden = true;
  document.getElementById(canvasId + "Hash").textContent = "";
  document.getElementById(canvasId + "Hash").title = "";
  document.getElementById(canvasId + "Notice").textContent = "";
  document.getElementById(canvasId + "Copy").disabled = true;
  
  // メモリ解放
  if (objectUrls.has(canvasId)) {
    URL.revokeObjectURL(objectUrls.get(canvasId));
    objectUrls.delete(canvasId);
  }
  
  resetResult();
  window.UIController.showMessage("");
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
  saveDiff,
  copyHash
};

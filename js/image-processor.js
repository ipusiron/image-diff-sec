// 画像処理に関するロジック

// グローバル変数
let objectUrls = new Map(); // URL管理用

// 画像読み込み処理（高速化版）
function loadImage(input, canvasId, callback) {
  const file = input.files[0];
  if (!file) return;
  
  // 既存のURLがあれば解放
  if (objectUrls.has(canvasId)) {
    URL.revokeObjectURL(objectUrls.get(canvasId));
  }
  
  const img = new Image();
  const objectUrl = URL.createObjectURL(file); // 高速化のポイント
  objectUrls.set(canvasId, objectUrl);
  
  img.onload = () => {
    const canvas = document.getElementById(canvasId);
    
    // オプション: 大きすぎる画像は制限（必要に応じてコメントアウト）
    const MAX_SIZE = 4096;
    let width = img.width;
    let height = img.height;
    
    if (width > MAX_SIZE || height > MAX_SIZE) {
      const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    
    if (callback) callback();
  };
  
  img.onerror = () => {
    alert("画像の読み込みに失敗しました。");
    URL.revokeObjectURL(objectUrl);
    objectUrls.delete(canvasId);
  };
  
  img.src = objectUrl;
}

// ファイル選択処理の共通化
function handleFileSelect(file, canvasId) {
  if (!file) return;
  
  // 既存のURLがあれば解放
  if (objectUrls.has(canvasId)) {
    URL.revokeObjectURL(objectUrls.get(canvasId));
  }
  
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  objectUrls.set(canvasId, objectUrl);
  
  img.onload = () => {
    const canvas = document.getElementById(canvasId);
    
    // オプション: 大きすぎる画像は制限（必要に応じてコメントアウト）
    const MAX_SIZE = 4096;
    let width = img.width;
    let height = img.height;
    
    if (width > MAX_SIZE || height > MAX_SIZE) {
      const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
  };
  
  img.onerror = () => {
    alert("画像の読み込みに失敗しました。");
    URL.revokeObjectURL(objectUrl);
    objectUrls.delete(canvasId);
  };
  
  img.src = objectUrl;
}

// 画像比較処理
function compareImages() {
  const canvas1 = document.getElementById("canvas1");
  const canvas2 = document.getElementById("canvas2");
  const diffCanvas = document.getElementById("diffCanvas");

  if (canvas1.width === 0 || canvas2.width === 0) {
    alert("両方の画像を読み込んでください。");
    return;
  }
  if (canvas1.width !== canvas2.width || canvas1.height !== canvas2.height) {
    alert("画像のサイズが一致していません。");
    return;
  }

  diffCanvas.width = canvas1.width;
  diffCanvas.height = canvas1.height;
  const ctx1 = canvas1.getContext("2d");
  const ctx2 = canvas2.getContext("2d");
  const diffCtx = diffCanvas.getContext("2d");

  const data1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
  const data2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
  const diff = diffCtx.createImageData(canvas1.width, canvas1.height);

  let diffCount = 0;
  for (let i = 0; i < data1.data.length; i += 4) {
    const r1 = data1.data[i];
    const g1 = data1.data[i + 1];
    const b1 = data1.data[i + 2];

    const r2 = data2.data[i];
    const g2 = data2.data[i + 1];
    const b2 = data2.data[i + 2];

    const same = r1 === r2 && g1 === g2 && b1 === b2;
    if (!same) {
      diff.data[i] = 255;     // 赤
      diff.data[i + 1] = 0;
      diff.data[i + 2] = 0;
      diff.data[i + 3] = 255;
      diffCount++;
    } else {
      diff.data[i] = r1;
      diff.data[i + 1] = g1;
      diff.data[i + 2] = b1;
      diff.data[i + 3] = 255;
    }
  }

  diffCtx.putImageData(diff, 0, 0);

  const totalPixels = canvas1.width * canvas1.height;
  const percent = ((diffCount / totalPixels) * 100).toFixed(2);
  document.getElementById("diffRate").textContent = `差分率: ${percent}%`;
}

// 画像クリア処理
function clearImage(inputId, canvasId) {
  const input = document.getElementById(inputId);
  input.value = "";
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
  
  // メモリ解放
  if (objectUrls.has(canvasId)) {
    URL.revokeObjectURL(objectUrls.get(canvasId));
    objectUrls.delete(canvasId);
  }
  
  document.getElementById("diffRate").textContent = "";
  const diffCanvas = document.getElementById("diffCanvas");
  const diffCtx = diffCanvas.getContext("2d");
  diffCtx.clearRect(0, 0, diffCanvas.width, diffCanvas.height);
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
  loadImage,
  handleFileSelect,
  compareImages,
  clearImage,
  cleanupObjectUrls
};
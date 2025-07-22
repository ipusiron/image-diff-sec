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

// テンプレートマッチング：小さい画像が大きい画像のどこに位置するかを検出
function findBestMatch(largeCanvas, smallCanvas) {
  const largeCtx = largeCanvas.getContext("2d");
  const smallCtx = smallCanvas.getContext("2d");
  
  const largeData = largeCtx.getImageData(0, 0, largeCanvas.width, largeCanvas.height);
  const smallData = smallCtx.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
  
  let bestX = 0, bestY = 0, bestScore = Infinity;
  
  // サンプリング間隔（パフォーマンス向上のため）
  const step = Math.max(1, Math.floor(Math.min(largeCanvas.width, largeCanvas.height) / 100));
  
  for (let y = 0; y <= largeCanvas.height - smallCanvas.height; y += step) {
    for (let x = 0; x <= largeCanvas.width - smallCanvas.width; x += step) {
      let score = 0;
      let samples = 0;
      
      // 小さい画像の各ピクセルとの差を計算（サンプリング）
      for (let dy = 0; dy < smallCanvas.height; dy += step) {
        for (let dx = 0; dx < smallCanvas.width; dx += step) {
          const largeIdx = ((y + dy) * largeCanvas.width + (x + dx)) * 4;
          const smallIdx = (dy * smallCanvas.width + dx) * 4;
          
          const rDiff = largeData.data[largeIdx] - smallData.data[smallIdx];
          const gDiff = largeData.data[largeIdx + 1] - smallData.data[smallIdx + 1];
          const bDiff = largeData.data[largeIdx + 2] - smallData.data[smallIdx + 2];
          
          score += rDiff * rDiff + gDiff * gDiff + bDiff * bDiff;
          samples++;
        }
      }
      
      if (score < bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }
  
  return { x: bestX, y: bestY, score: bestScore };
}

// 重複領域の検出と比較
function compareImagesWithOverlap() {
  const canvas1 = document.getElementById("canvas1");
  const canvas2 = document.getElementById("canvas2");
  const diffCanvas = document.getElementById("diffCanvas");

  if (canvas1.width === 0 || canvas2.width === 0) {
    alert("両方の画像を読み込んでください。");
    return;
  }

  // 同じサイズの場合は従来の方法
  if (canvas1.width === canvas2.width && canvas1.height === canvas2.height) {
    return compareImagesSameSize(canvas1, canvas2, diffCanvas);
  }

  // 異なるサイズの場合：重複領域を検出
  let largeCanvas, smallCanvas, isCanvas1Large;
  
  if (canvas1.width * canvas1.height > canvas2.width * canvas2.height) {
    largeCanvas = canvas1;
    smallCanvas = canvas2;
    isCanvas1Large = true;
  } else {
    largeCanvas = canvas2;
    smallCanvas = canvas1;
    isCanvas1Large = false;
  }

  // テンプレートマッチングで最適位置を検出
  document.getElementById("diffRate").textContent = "重複領域を検索中...";
  
  // 非同期処理でUIブロックを防ぐ
  setTimeout(() => {
    const match = findBestMatch(largeCanvas, smallCanvas);
    
    // 重複領域を比較
    const overlapWidth = smallCanvas.width;
    const overlapHeight = smallCanvas.height;
    
    diffCanvas.width = overlapWidth;
    diffCanvas.height = overlapHeight;
    
    const largeCtx = largeCanvas.getContext("2d");
    const smallCtx = smallCanvas.getContext("2d");
    const diffCtx = diffCanvas.getContext("2d");
    
    // 大きい画像から重複部分を切り出し
    const largeRegion = largeCtx.getImageData(match.x, match.y, overlapWidth, overlapHeight);
    const smallRegion = smallCtx.getImageData(0, 0, overlapWidth, overlapHeight);
    const diff = diffCtx.createImageData(overlapWidth, overlapHeight);
    
    let diffCount = 0;
    for (let i = 0; i < largeRegion.data.length; i += 4) {
      const r1 = largeRegion.data[i];
      const g1 = largeRegion.data[i + 1];
      const b1 = largeRegion.data[i + 2];
      
      const r2 = smallRegion.data[i];
      const g2 = smallRegion.data[i + 1];
      const b2 = smallRegion.data[i + 2];
      
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
    
    const totalPixels = overlapWidth * overlapHeight;
    const percent = ((diffCount / totalPixels) * 100).toFixed(2);
    const largerImageName = isCanvas1Large ? "画像1" : "画像2";
    document.getElementById("diffRate").textContent = 
      `差分率: ${percent}% (${largerImageName}内の位置: ${match.x}, ${match.y})`;
  }, 10);
}

// 同じサイズの画像比較（従来の方法）
function compareImagesSameSize(canvas1, canvas2, diffCanvas) {
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

// メインの比較関数
function compareImages() {
  compareImagesWithOverlap();
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

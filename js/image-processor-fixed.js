// 画像処理に関するロジック（修正版）

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

// 改良版：2段階テンプレートマッチング
function findBestMatch(largeCanvas, smallCanvas) {
  const largeCtx = largeCanvas.getContext("2d", { willReadFrequently: true });
  const smallCtx = smallCanvas.getContext("2d", { willReadFrequently: true });
  
  const largeData = largeCtx.getImageData(0, 0, largeCanvas.width, largeCanvas.height);
  const smallData = smallCtx.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
  
  console.log(`Template matching: Large(${largeCanvas.width}x${largeCanvas.height}) vs Small(${smallCanvas.width}x${smallCanvas.height})`);
  
  // === 第1段階：粗い探索 ===
  let coarseStep = Math.max(4, Math.floor(Math.min(largeCanvas.width, largeCanvas.height) / 80));
  let coarseBestX = 0, coarseBestY = 0, coarseBestScore = -1;
  
  console.log(`第1段階: 粗い探索 (step=${coarseStep})`);
  
  const coarseResult = performTemplateMatch(largeData, smallData, largeCanvas, smallCanvas, coarseStep);
  coarseBestX = coarseResult.x;
  coarseBestY = coarseResult.y;
  coarseBestScore = coarseResult.score;
  
  console.log(`粗い探索結果: (${coarseBestX}, ${coarseBestY}), スコア: ${coarseBestScore.toFixed(4)}`);
  
  // === 第2段階：精密探索 ===
  // 粗い探索結果の周辺を1ピクセル単位で詳細探索
  const searchRadius = Math.max(coarseStep * 2, 8);
  let fineBestX = coarseBestX, fineBestY = coarseBestY, fineBestScore = coarseBestScore;
  
  console.log(`第2段階: 精密探索 (半径=${searchRadius})`);
  
  const startX = Math.max(0, coarseBestX - searchRadius);
  const endX = Math.min(largeCanvas.width - smallCanvas.width, coarseBestX + searchRadius);
  const startY = Math.max(0, coarseBestY - searchRadius);
  const endY = Math.min(largeCanvas.height - smallCanvas.height, coarseBestY + searchRadius);
  
  // 1ピクセル単位での精密探索
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const ncc = calculateNCC(largeData, smallData, x, y, largeCanvas.width, smallCanvas.width, smallCanvas.height, 1);
      
      if (ncc > fineBestScore) {
        fineBestScore = ncc;
        fineBestX = x;
        fineBestY = y;
      }
    }
  }
  
  console.log(`精密探索結果: (${fineBestX}, ${fineBestY}), スコア: ${fineBestScore.toFixed(4)}`);
  console.log(`改善: ${(fineBestScore - coarseBestScore).toFixed(4)}`);
  
  return { x: fineBestX, y: fineBestY, score: fineBestScore };
}

// テンプレートマッチング実行
function performTemplateMatch(largeData, smallData, largeCanvas, smallCanvas, step) {
  let bestX = 0, bestY = 0, bestScore = -1;
  
  for (let y = 0; y <= largeCanvas.height - smallCanvas.height; y += step) {
    for (let x = 0; x <= largeCanvas.width - smallCanvas.width; x += step) {
      const ncc = calculateNCC(largeData, smallData, x, y, largeCanvas.width, smallCanvas.width, smallCanvas.height, step);
      
      if (ncc > bestScore) {
        bestScore = ncc;
        bestX = x;
        bestY = y;
      }
    }
  }
  
  return { x: bestX, y: bestY, score: bestScore };
}

// NCC計算（最適化版）
function calculateNCC(largeData, smallData, offsetX, offsetY, largeWidth, smallWidth, smallHeight, step) {
  // 小さい画像の平均値を計算（正規化用）
  let smallMean = 0;
  let smallCount = 0;
  
  // 適応的サンプリング：stepが1の場合は全ピクセル、それ以外はサンプリング
  const sampleStep = step === 1 ? 1 : Math.max(2, step);
  
  for (let dy = 0; dy < smallHeight; dy += sampleStep) {
    for (let dx = 0; dx < smallWidth; dx += sampleStep) {
      const idx = (dy * smallWidth + dx) * 4;
      const gray = (smallData.data[idx] + smallData.data[idx + 1] + smallData.data[idx + 2]) / 3;
      smallMean += gray;
      smallCount++;
    }
  }
  smallMean /= smallCount;
  
  // 大きい画像の対応領域の平均値を計算
  let largeMean = 0;
  let largeCount = 0;
  for (let dy = 0; dy < smallHeight; dy += sampleStep) {
    for (let dx = 0; dx < smallWidth; dx += sampleStep) {
      const largeIdx = ((offsetY + dy) * largeWidth + (offsetX + dx)) * 4;
      if (largeIdx + 2 < largeData.data.length) { // 境界チェック
        const gray = (largeData.data[largeIdx] + largeData.data[largeIdx + 1] + largeData.data[largeIdx + 2]) / 3;
        largeMean += gray;
        largeCount++;
      }
    }
  }
  largeMean /= largeCount;
  
  // 正規化相互相関の計算
  let numerator = 0;
  let largeSumSq = 0;
  let smallSumSq = 0;
  
  for (let dy = 0; dy < smallHeight; dy += sampleStep) {
    for (let dx = 0; dx < smallWidth; dx += sampleStep) {
      const largeIdx = ((offsetY + dy) * largeWidth + (offsetX + dx)) * 4;
      const smallIdx = (dy * smallWidth + dx) * 4;
      
      if (largeIdx + 2 < largeData.data.length && smallIdx + 2 < smallData.data.length) {
        const largeGray = (largeData.data[largeIdx] + largeData.data[largeIdx + 1] + largeData.data[largeIdx + 2]) / 3;
        const smallGray = (smallData.data[smallIdx] + smallData.data[smallIdx + 1] + smallData.data[smallIdx + 2]) / 3;
        
        const largeDiff = largeGray - largeMean;
        const smallDiff = smallGray - smallMean;
        
        numerator += largeDiff * smallDiff;
        largeSumSq += largeDiff * largeDiff;
        smallSumSq += smallDiff * smallDiff;
      }
    }
  }
  
  // 正規化相互相関係数
  const denominator = Math.sqrt(largeSumSq * smallSumSq);
  return denominator > 0 ? numerator / denominator : 0;
}

// 重複領域の検出と比較（改良版）
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
  
  // 小さい画像が大きい画像内に収まるかチェック
  const canFitInside = smallCanvas.width <= largeCanvas.width && smallCanvas.height <= largeCanvas.height;
  
  if (!canFitInside) {
    if (smallCanvas.width > largeCanvas.width && smallCanvas.height > largeCanvas.height) {
      alert("小さい方の画像が大きい方の画像よりも大きすぎます。比較できません。");
      return;
    }
    console.warn("画像のアスペクト比が異なりますが、重複領域の検出を試行します。");
  }

  // テンプレートマッチングで最適位置を検出
  document.getElementById("diffRate").textContent = "高精度重複領域検索中...";
  
  // 非同期処理でUIブロックを防ぐ
  setTimeout(() => {
    const match = findBestMatch(largeCanvas, smallCanvas);
    
    // 重複領域を比較
    const overlapWidth = smallCanvas.width;
    const overlapHeight = smallCanvas.height;
    
    diffCanvas.width = overlapWidth;
    diffCanvas.height = overlapHeight;
    
    const largeCtx = largeCanvas.getContext("2d", { willReadFrequently: true });
    const smallCtx = smallCanvas.getContext("2d", { willReadFrequently: true });
    const diffCtx = diffCanvas.getContext("2d");
    
    // 大きい画像から重複部分を切り出し
    const largeRegion = largeCtx.getImageData(match.x, match.y, overlapWidth, overlapHeight);
    const smallRegion = smallCtx.getImageData(0, 0, overlapWidth, overlapHeight);
    const diff = diffCtx.createImageData(overlapWidth, overlapHeight);
    
    let diffCount = 0;
    const threshold = 30; // 色差の許容範囲
    
    for (let i = 0; i < largeRegion.data.length; i += 4) {
      const r1 = largeRegion.data[i];
      const g1 = largeRegion.data[i + 1];
      const b1 = largeRegion.data[i + 2];
      
      const r2 = smallRegion.data[i];
      const g2 = smallRegion.data[i + 1];
      const b2 = smallRegion.data[i + 2];
      
      // 厳密な比較（改良版）
      const exactMatch = r1 === r2 && g1 === g2 && b1 === b2;
      
      // 高精度マッチの場合は厳密比較を優先
      const isSignificantDiff = match.score > 0.95 ? !exactMatch : 
        Math.sqrt((r1-r2)*(r1-r2) + (g1-g2)*(g1-g2) + (b1-b2)*(b1-b2)) > threshold;
      
      if (isSignificantDiff) {
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
    const qualityInfo = match.score > 0.95 ? " (高精度マッチ)" : ` (NCCスコア: ${match.score.toFixed(3)})`;
    document.getElementById("diffRate").textContent = 
      `差分率: ${percent}%${qualityInfo} (${largerImageName}内の位置: ${match.x}, ${match.y})`;
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
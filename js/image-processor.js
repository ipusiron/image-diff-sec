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

// 正規化相互相関（NCC）によるテンプレートマッチング（2段階精密版）
function findBestMatch(largeCanvas, smallCanvas) {
  const largeCtx = largeCanvas.getContext("2d", { willReadFrequently: true });
  const smallCtx = smallCanvas.getContext("2d", { willReadFrequently: true });
  
  const largeData = largeCtx.getImageData(0, 0, largeCanvas.width, largeCanvas.height);
  const smallData = smallCtx.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
  
  // 第1段階: 粗い探索（効率重視）
  let coarseBestX = 0, coarseBestY = 0, coarseBestScore = -1;
  const coarseStep = Math.max(4, Math.floor(Math.min(largeCanvas.width, largeCanvas.height) / 80));
  
  console.log(`第1段階探索開始 - ステップ: ${coarseStep}, 探索領域: ${largeCanvas.width - smallCanvas.width + 1} x ${largeCanvas.height - smallCanvas.height + 1}`);
  
  let sampleCount = 0;
  for (let y = 0; y <= largeCanvas.height - smallCanvas.height; y += coarseStep) {
    for (let x = 0; x <= largeCanvas.width - smallCanvas.width; x += coarseStep) {
      const ncc = calculateNCC(largeData, smallData, x, y, largeCanvas.width, smallCanvas.width, smallCanvas.height, coarseStep);
      sampleCount++;
      
      if (ncc > coarseBestScore) {
        coarseBestScore = ncc;
        coarseBestX = x;
        coarseBestY = y;
        console.log(`新しい最適位置発見: (${x}, ${y}), NCCスコア: ${ncc.toFixed(4)}`);
      }
    }
  }
  
  console.log(`第1段階完了 - サンプル数: ${sampleCount}`);
  
  console.log(`第1段階結果: (${coarseBestX}, ${coarseBestY}), NCCスコア: ${coarseBestScore.toFixed(4)}`);
  
  // 第2段階: 精密探索（精度重視）
  const searchRange = Math.max(coarseStep * 2, 8); // 探索範囲
  const startX = Math.max(0, coarseBestX - searchRange);
  const endX = Math.min(largeCanvas.width - smallCanvas.width, coarseBestX + searchRange);
  const startY = Math.max(0, coarseBestY - searchRange);
  const endY = Math.min(largeCanvas.height - smallCanvas.height, coarseBestY + searchRange);
  
  // 範囲の妥当性チェック
  if (startX > endX || startY > endY) {
    console.warn('探索範囲が無効です。粗い探索の結果を使用します。');
    return { x: coarseBestX, y: coarseBestY, score: coarseBestScore };
  }
  
  console.log(`第2段階探索開始 - 範囲: x[${startX}-${endX}], y[${startY}-${endY}]`);
  
  let bestX = coarseBestX, bestY = coarseBestY, bestScore = coarseBestScore;
  
  // 1ピクセル単位で精密探索
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const ncc = calculateNCC(largeData, smallData, x, y, largeCanvas.width, smallCanvas.width, smallCanvas.height, 1);
      
      if (ncc > bestScore) {
        bestScore = ncc;
        bestX = x;
        bestY = y;
      }
    }
  }
  
  console.log(`最終結果: (${bestX}, ${bestY}), NCCスコア: ${bestScore.toFixed(4)}`);
  
  return { x: bestX, y: bestY, score: bestScore };
}

// NCC計算の共通関数
function calculateNCC(largeData, smallData, offsetX, offsetY, largeWidth, smallWidth, smallHeight, step) {
  // 小さい画像の平均値を計算
  let smallMean = 0;
  let smallCount = 0;
  for (let dy = 0; dy < smallHeight; dy += step) {
    for (let dx = 0; dx < smallWidth; dx += step) {
      const idx = (dy * smallWidth + dx) * 4;
      if (idx + 2 < smallData.data.length) {
        const gray = (smallData.data[idx] + smallData.data[idx + 1] + smallData.data[idx + 2]) / 3;
        smallMean += gray;
        smallCount++;
      }
    }
  }
  if (smallCount === 0) return 0;
  smallMean /= smallCount;
  
  // 大きい画像の対応領域の平均値を計算
  let largeMean = 0;
  let largeCount = 0;
  for (let dy = 0; dy < smallHeight; dy += step) {
    for (let dx = 0; dx < smallWidth; dx += step) {
      const largeIdx = ((offsetY + dy) * largeWidth + (offsetX + dx)) * 4;
      if (largeIdx + 2 < largeData.data.length) {
        const gray = (largeData.data[largeIdx] + largeData.data[largeIdx + 1] + largeData.data[largeIdx + 2]) / 3;
        largeMean += gray;
        largeCount++;
      }
    }
  }
  if (largeCount === 0) return 0;
  largeMean /= largeCount;
  
  // 正規化相互相関の計算
  let numerator = 0;
  let largeSumSq = 0;
  let smallSumSq = 0;
  
  for (let dy = 0; dy < smallHeight; dy += step) {
    for (let dx = 0; dx < smallWidth; dx += step) {
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
  
  // テンプレートマッチングが可能かどうかで判定
  const canvas1CanContain2 = canvas1.width >= canvas2.width && canvas1.height >= canvas2.height;
  const canvas2CanContain1 = canvas2.width >= canvas1.width && canvas2.height >= canvas1.height;
  
  if (canvas1CanContain2 && !canvas2CanContain1) {
    // Canvas1のみがCanvas2を含める
    largeCanvas = canvas1;
    smallCanvas = canvas2;
    isCanvas1Large = true;
  } else if (canvas2CanContain1 && !canvas1CanContain2) {
    // Canvas2のみがCanvas1を含める
    largeCanvas = canvas2;
    smallCanvas = canvas1;
    isCanvas1Large = false;
  } else if (canvas1CanContain2 && canvas2CanContain1) {
    // 両方が可能な場合は面積で判定
    if (canvas1.width * canvas1.height > canvas2.width * canvas2.height) {
      largeCanvas = canvas1;
      smallCanvas = canvas2;
      isCanvas1Large = true;
    } else {
      largeCanvas = canvas2;
      smallCanvas = canvas1;
      isCanvas1Large = false;
    }
  } else {
    // どちらも他方を含めない場合はエラー
    alert("両画像のサイズ関係では重複領域の検出ができません。");
    return;
  }
  
  // 小さい画像が大きい画像内に収まるかチェック
  // （アスペクト比が違っても、総ピクセル数で小さい方が大きい方に含まれるべき）
  const canFitInside = smallCanvas.width <= largeCanvas.width && smallCanvas.height <= largeCanvas.height;
  
  if (!canFitInside) {
    // どちらの次元も大きい画像を超える場合のみエラー
    if (smallCanvas.width > largeCanvas.width && smallCanvas.height > largeCanvas.height) {
      alert("小さい方の画像が大きい方の画像よりも大きすぎます。比較できません。");
      return;
    }
    // 一方の次元のみ大きい場合は警告して続行
    console.warn("画像のアスペクト比が異なりますが、重複領域の検出を試行します。");
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
    
    const largeCtx = largeCanvas.getContext("2d", { willReadFrequently: true });
    const smallCtx = smallCanvas.getContext("2d", { willReadFrequently: true });
    const diffCtx = diffCanvas.getContext("2d");
    
    // 大きい画像から重複部分を切り出し
    const largeRegion = largeCtx.getImageData(match.x, match.y, overlapWidth, overlapHeight);
    const smallRegion = smallCtx.getImageData(0, 0, overlapWidth, overlapHeight);
    const diff = diffCtx.createImageData(overlapWidth, overlapHeight);
    
    let diffCount = 0;
    const threshold = 30; // 色差の許容範囲を追加
    
    for (let i = 0; i < largeRegion.data.length; i += 4) {
      const r1 = largeRegion.data[i];
      const g1 = largeRegion.data[i + 1];
      const b1 = largeRegion.data[i + 2];
      
      const r2 = smallRegion.data[i];
      const g2 = smallRegion.data[i + 1];
      const b2 = smallRegion.data[i + 2];
      
      // 色差を計算（ユークリッド距離）
      const colorDiff = Math.sqrt(
        (r1 - r2) * (r1 - r2) + 
        (g1 - g2) * (g1 - g2) + 
        (b1 - b2) * (b1 - b2)
      );
      
      // 構造的比較：白と黒の境界が重要
      const isWhite1 = (r1 + g1 + b1) / 3 > 128;
      const isWhite2 = (r2 + g2 + b2) / 3 > 128;
      const structuralDiff = isWhite1 !== isWhite2;
      
      // NCCが高い場合は構造的差分のみ重視
      const isSignificantDiff = match.score > 0.9 ? structuralDiff : colorDiff > threshold;
      
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
    const scoreInfo = match.score > 0.9 ? " (構造一致)" : ` (NCCスコア: ${match.score.toFixed(3)})`;
    document.getElementById("diffRate").textContent = 
      `差分率: ${percent}%${scoreInfo} (${largerImageName}内の位置: ${match.x}, ${match.y})`;
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

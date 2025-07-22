// 画像読み込み処理（高速化版）
let objectUrls = new Map(); // URLの管理用

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

// ドラッグ&ドロップ処理を追加
function setupDropZone(dropZoneId, inputId, canvasId) {
  const dropZone = document.getElementById(dropZoneId);
  const input = document.getElementById(inputId);
  
  // ドラッグオーバー時の処理
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  
  // ドラッグリーブ時の処理
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  
  // ドロップ時の処理
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      // FileListをinput要素に設定できないため、直接loadImageを呼ぶ
      const file = files[0];
      handleFileSelect(file, canvasId);
    } else if (files.length > 0) {
      alert('画像ファイルを選択してください。');
    }
  });
  
  // ファイル選択時の処理（既存の機能と統合）
  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      handleFileSelect(input.files[0], canvasId);
    }
  });
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

// ダークモード切り替え機能
function setupDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const body = document.body;
  
  // 保存されている設定を読み込む
  const savedDarkMode = localStorage.getItem('darkMode');
  if (savedDarkMode === 'true') {
    body.classList.add('dark-mode');
  }
  
  // システムのダークモード設定を検出（初回のみ）
  if (savedDarkMode === null) {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    }
  }
  
  // 切り替えボタンのクリックイベント
  darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode.toString());
  });
}

// イベント設定
window.onload = () => {
  // ドラッグ&ドロップの設定
  setupDropZone('dropZone1', 'image1', 'canvas1');
  setupDropZone('dropZone2', 'image2', 'canvas2');
  
  // ダークモードの設定
  setupDarkMode();

  document.getElementById("compareButton").addEventListener("click", compareImages);
};

// ページ離脱時のメモリ解放
window.addEventListener('beforeunload', () => {
  objectUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  objectUrls.clear();
});

// UI制御に関するロジック

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
      window.ImageProcessor.handleFileSelect(file, canvasId);
    } else if (files.length > 0) {
      alert('画像ファイルを選択してください。');
    }
  });
  
  // ファイル選択時の処理（既存の機能と統合）
  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      window.ImageProcessor.handleFileSelect(input.files[0], canvasId);
    }
  });
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

// ヘルプモーダル機能
function setupHelpModal() {
  const helpButton = document.getElementById('helpButton');
  const modal = document.getElementById('helpModal');
  const modalClose = document.getElementById('modalClose');
  
  // ヘルプボタンクリックでモーダル表示
  helpButton.addEventListener('click', () => {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 背景のスクロールを無効化
  });
  
  // 閉じるボタンクリックでモーダル非表示
  modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // スクロールを再有効化
  });
  
  // モーダル外クリックでも閉じる
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
  
  // ESCキーでも閉じる
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.style.display === 'block') {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
}

// エクスポート（グローバルスコープに公開）
window.UIController = {
  setupDropZone,
  setupDarkMode,
  setupHelpModal
};

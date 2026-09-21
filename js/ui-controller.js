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
    if (files.length > 0) {
      // input経由と同じ形式の検証を使う。
      const file = files[0];
      window.ImageProcessor.handleFileSelect(file, canvasId);
    }
  });
  
  // ファイル選択時の処理（既存の機能と統合）
  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      window.ImageProcessor.handleFileSelect(input.files[0], canvasId);
    }
  });

  // 視覚的に隠したinputもEnterとSpaceで選択を開く。
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
}

// ダークモード切り替え機能
function setupDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const body = document.body;
  
  // 保存されている設定を読み込む
  let savedDarkMode = null;
  try {
    const stored = localStorage.getItem('darkMode');
    if (stored === 'true' || stored === 'false') savedDarkMode = stored;
  } catch {
    // 保存領域が使えなくても、画面上での切り替えは続ける。
  }
  if (savedDarkMode === 'true') {
    body.classList.add('dark-mode');
  }
  
  // システムのダークモード設定を検出（初回のみ）
  if (savedDarkMode === null) {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      body.classList.add('dark-mode');
    }
  }
  
  // 切り替えボタンのクリックイベント
  darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    try {
      localStorage.setItem('darkMode', isDarkMode.toString());
    } catch {
      // 保存できない環境では現在のページだけに適用する。
    }
  });
}

// ヘルプモーダル機能
function setupHelpModal() {
  const helpButton = document.getElementById('helpButton');
  const modal = document.getElementById('helpModal');
  const modalClose = document.getElementById('modalClose');
  
  const background = document.querySelectorAll("header, main, footer");
  let previousOverflow = "";
  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = previousOverflow;
    background.forEach(element => { element.inert = false; });
    helpButton.focus();
  };

  // ヘルプボタンクリックでモーダル表示
  helpButton.addEventListener("click", () => {
    previousOverflow = document.body.style.overflow;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    background.forEach(element => { element.inert = true; });
    modalClose.focus();
  });
  modalClose.addEventListener("click", close);
  modal.addEventListener("click", event => {
    if (event.target === modal) close();
  });
  document.addEventListener("keydown", event => {
    if (modal.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      const focusable = Array.from(modal.querySelectorAll('button, a[href], [tabindex="0"]'));
      const current = focusable.indexOf(document.activeElement);
      if (event.shiftKey && current <= 0) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (!event.shiftKey && (current === focusable.length - 1 || current < 0)) {
        event.preventDefault();
        focusable[0].focus();
      }
    }
  });
}

// エラーと進捗を画面内へ表示する。
function showMessage(text, error = false) {
  document.getElementById("statusMessage").textContent = error ? "" : text;
  document.getElementById("errorMessage").textContent = error ? text : "";
}

// エクスポート（グローバルスコープに公開）
window.UIController = {
  setupDropZone,
  setupDarkMode,
  setupHelpModal,
  showMessage
};

// アプリケーションのメインエントリーポイント

// clearImage関数をグローバルスコープに公開（HTMLのonclickから呼び出すため）
window.clearImage = window.ImageProcessor.clearImage;

// イベント設定
window.onload = () => {
  // ドラッグ&ドロップの設定
  window.UIController.setupDropZone('dropZone1', 'image1', 'canvas1');
  window.UIController.setupDropZone('dropZone2', 'image2', 'canvas2');
  
  // ダークモードの設定
  window.UIController.setupDarkMode();
  
  // ヘルプモーダルの設定
  window.UIController.setupHelpModal();

  // 比較ボタンのイベント設定
  document.getElementById("compareButton").addEventListener("click", window.ImageProcessor.compareImages);
};

// ページ離脱時のメモリ解放
window.addEventListener('beforeunload', () => {
  window.ImageProcessor.cleanupObjectUrls();
});

// アプリケーションのメインエントリーポイント

// イベント設定
document.addEventListener("DOMContentLoaded", () => {
  // ドラッグ&ドロップの設定
  window.UIController.setupDropZone('dropZone1', 'image1', 'canvas1');
  window.UIController.setupDropZone('dropZone2', 'image2', 'canvas2');
  
  // ダークモードの設定
  window.UIController.setupDarkMode();
  
  // ヘルプモーダルの設定
  window.UIController.setupHelpModal();

  // 比較ボタンのイベント設定
  document.getElementById("compareButton").addEventListener("click", window.ImageProcessor.compareImages);
  for (const number of [1, 2]) {
    document.getElementById("clear" + number).addEventListener("click", () => {
      window.ImageProcessor.clearImage("image" + number, "canvas" + number);
    });
    document.getElementById("canvas" + number + "Copy").addEventListener("click", () => {
      window.ImageProcessor.copyHash("canvas" + number);
    });
  }
  document.getElementById("tolerance").addEventListener("input", event => {
    document.getElementById("toleranceValue").textContent = event.target.value;
    window.ImageProcessor.renderComparison();
  });
  document.getElementById("saveDiff").addEventListener("click", window.ImageProcessor.saveDiff);
});

// ページ離脱時のメモリ解放
window.addEventListener('beforeunload', () => {
  window.ImageProcessor.cleanupObjectUrls();
});

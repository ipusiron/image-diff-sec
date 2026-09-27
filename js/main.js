// アプリケーションのメインエントリーポイント

// イベント設定
document.addEventListener("DOMContentLoaded", () => {
  // 表示言語の決定。?lang → 保存値 → ブラウザーの設定の順で選ぶ
  window.I18n.init();

  // ドラッグ&ドロップの設定
  window.UIController.setupDropZone('dropZone1', 'image1', 'canvas1');
  window.UIController.setupDropZone('dropZone2', 'image2', 'canvas2');

  // ダークモードの設定
  window.UIController.setupDarkMode();
  
  // ヘルプモーダルの設定
  window.UIController.setupHelpModal();

  // 言語切り替えの設定。切り替え後は表示中の文言だけを訳し直す
  window.UIController.setupLangToggle();
  document.addEventListener("languagechange", () => {
    window.UIController.renderMessage();
    window.ImageProcessor.renderTexts();
  });

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

  // 差分画像の読み上げなど、HTMLに直書きできない初期文言を言語に合わせて描く
  window.ImageProcessor.renderTexts();
});

// ページ離脱時のメモリ解放
window.addEventListener('beforeunload', () => {
  window.ImageProcessor.cleanupObjectUrls();
});

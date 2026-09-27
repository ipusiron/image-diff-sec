/* 日本語と英語の文言。画面とロジックのスクリプトは言語ごとの文字列を持たない。 */
/* 画像フォーマット名（PNG・JPEG・GIF・WebP）、SHA-256、NCC、RGBAは規格上の識別子なので訳さない。 */
const I18n = (() => {
  const ja = {
    'app.title': 'ImageDiffSec - 2画像のピクセル差分検出ツール',
    'app.description':
      '2枚の画像をピクセル単位で比較し、視覚的な違いを可視化するセキュリティツール。QRコードの改ざん検出や証拠画像の検証などに活用可能。',
    'app.keywords': '画像差分, ピクセル比較, 改ざん検出, QRコード, フォレンジック, セキュリティツール, Canvas API',
    'app.ogDescription': '2枚の画像の違いを画素単位で可視化し、改ざんの有無を確かめられるブラウザー完結のツール。',
    'app.siteName': 'ImageDiffSec',
    'app.tagline': '画像の差分を視覚的に比較・検出するセキュリティツール',
    'app.langButton': 'English',
    'app.langAria': '言語を切り替える',
    'app.helpAria': 'ヘルプ',
    'app.darkAria': 'ダークモード切り替え',

    'upload.image1': '画像1',
    'upload.image2': '画像2',
    'upload.dropAria1': '画像1のファイル選択とドロップ',
    'upload.dropAria2': '画像2のファイル選択とドロップ',
    'upload.dropHint': 'ここに画像をドラッグ&ドロップ',
    'upload.dropOr': 'または',
    'upload.choose': 'ファイルを選択',
    'upload.clear': 'クリア',
    'upload.clearAria1': '画像1をクリア',
    'upload.clearAria2': '画像2をクリア',
    'upload.canvas1': '画像1プレビュー',
    'upload.canvas2': '画像2プレビュー',
    'upload.copyHash': 'SHA-256をコピー',
    'upload.copyAria1': '画像1のSHA-256をコピー',
    'upload.copyAria2': '画像2のSHA-256をコピー',

    'compare.toleranceLabel': '許容差（0＝厳密に比較）',
    'compare.toleranceHint': 'JPEGは保存し直すだけで全体の画素が少しずつ変わる。そういう画像どうしを比べるときに上げる',
    'compare.button': '画像を比較',

    'result.heading': '差分表示',
    'result.canvasFallback': '差分プレビュー',
    'result.canvasAriaEmpty': '差分の画像。まだ比較していません',
    'result.canvasAria': '差分の画像。{count}画素が赤で示されている',
    'result.save': '差分画像をPNGで保存',

    'diff.none': '差分なし: {total} ピクセルすべてが一致',
    'diff.found': '差分あり: {count} / {total} ピクセル（{rate}）',
    'diff.tolerance': '（許容差 {tolerance} で比較）',
    'diff.bbox': '差分の範囲: x {minX}〜{maxX}, y {minY}〜{maxY}（{width}×{height} ピクセル）',

    'rate.zero': '0%',
    'rate.below': '0.01%未満',
    'rate.value': '{percent}%',

    'match.overlay': '画像{large}の ({x}, {y}) に画像{small}を重ねて比較（位置合わせのスコア {score}）',
    'match.lowScore':
      '⚠ 位置合わせのスコアが0.90に届いていない。画像の内容が大きく違うか、位置合わせが外れている。' +
      '差分が全体に散らばっているなら、位置合わせの失敗を疑うこと',

    'hash.prefix': 'SHA-256: {prefix}…（先頭16桁）',
    'hash.unavailable': 'この環境ではSHA-256を計算できない',
    'hash.same': 'ファイルは同一（SHA-256が一致）',
    'hash.different': 'ファイルは別物（SHA-256が不一致）',
    'hash.metaOnly': '画素は一致するが、ファイルは別物である。メタデータ（Exifなど）や圧縮の設定だけが違う可能性がある',
    'hash.metaOnlyTolerance': '許容差の範囲では画素が一致するが、ファイルは別物である',

    'status.aligning': '位置合わせ中…（{step} / {total} 段）',

    'notice.downscaled':
      '⚠ 画像{number}は4096pxを超えていたので縮小して読み込んだ（{originalWidth}×{originalHeight} → {width}×{height}）。' +
      '縮小した画像では厳密な比較にならない',
    'notice.copied': 'SHA-256をコピーしました。',

    'error.unsupportedType': '対応していない形式（PNG・JPEG・GIF・WebPに対応）',
    'error.loadFailed': '画像の読み込みに失敗しました。',
    'error.pixelsUnreadable': 'この画像からは画素を読み出せない',
    'error.needBothImages': '画像1と画像2を読み込むこと',
    'error.noContainment': '両画像のサイズ関係では重複領域の検出ができません。',
    'error.unmatchable': '位置合わせ不能: 小さいほうの画像が単色で、位置を決める手がかりがない',
    'error.compareFailed': '画像の比較を完了できませんでした。画像を読み込み直してください。',
    'error.saveFailed': 'PNGを保存できませんでした。',
    'error.copyFailed': 'コピーできませんでした。SHA-256の全桁はハッシュ表示のtitleから確認できます。',

    'help.title': '📚 ImageDiffSecヘルプ',
    'help.closeAria': 'ヘルプを閉じる',
    'help.usageHeading': '🔍 使い方',
    'help.usageLoad': '画像の読み込み',
    'help.usageLoad1': '「ファイルを選択」ボタンをクリック',
    'help.usageLoad2': 'または、点線枠内に画像をドラッグ&ドロップ',
    'help.usageCompare': '画像の比較',
    'help.usageCompare1': '両方の画像を読み込んだ後、「画像を比較」ボタンをクリック',
    'help.usageCompare2': '差分がある箇所を赤色で表示',
    'help.usageCheck': '結果の確認',
    'help.usageCheck1': '異なる画素の実数と範囲を確認する',
    'help.usageCheck2': '差分率の大小だけでは、改ざんの重さは決まらない',
    'help.notesHeading': '⚠️ 注意事項',
    'help.notes1': '大きさが違うときは、小さいほうを大きいほうの中から探して重ねる。回転と拡大縮小には対応しない',
    'help.notes2': '4096pxを超える画像は縮小されるため、厳密な比較にはならない',
    'help.notes3': '処理はブラウザー内だけで行い、画像もハッシュもサーバーに送信しない',
    'help.securityHeading': '🛡 セキュリティ上の用途',
    'help.securityQr': 'QRコードの改ざん検出',
    'help.securityQrDesc': '：悪意あるリンクへの差し替えを検出',
    'help.securityDoc': '文書の偽造チェック',
    'help.securityDocDesc': '：契約書や証明書の改ざんを発見',
    'help.securityPhish': 'フィッシングサイトの検証',
    'help.securityPhishDesc': '：本物と偽物の微細な違いを検出',
    'help.tipsHeading': '💡 ヒント',
    'help.tips1': '「差分なし」と出るのは、差分が0画素のときだけである。1画素でも違えば「差分あり」と出る',
    'help.tips2': '許容差を上げると小さな色の違いを無視する。結果には使った許容差も表示する',
    'help.tips3': 'SHA-256は元ファイルのバイト列を比較する。画素が一致してもメタデータなどが違うことがある',
    'help.tips4': '「差分画像をPNGで保存」で赤い差分と青い範囲枠を保存できる',
    'help.tips5': '位置合わせのスコアが0.90未満なら警告が出る。改ざんでもスコアが下がるため、失敗とは限らない',
    'help.tips6': '単色の切り出しは位置合わせ不能。クリアボタンで画像をリセットできる',
    'help.darkHeading': '🌙 ダークモード',
    'help.darkBody': 'ヘッダーの🌞/🌙ボタンでダークモードを切り替えられます。設定はブラウザーに保存されます。',
    'help.langHeading': '🌐 表示言語',
    'help.langBody':
      'ヘッダーの「English」ボタンで日本語と英語を切り替えられます。' +
      'URLに?lang=enや?lang=jaを付けても指定でき、選んだ言語はブラウザーに保存されます。',
    'help.relatedHeading': '🔗 関連情報',
    'help.relatedRepo': 'GitHubリポジトリ',
    'help.relatedLicense': 'ライセンス: MIT License',
    'help.relatedAuthor': '作成者: ipusiron',

    'footer.repo': '🔗 GitHubリポジトリはこちら（',
    'footer.repoEnd': '）'
  };

  const en = {
    'app.title': 'ImageDiffSec - Pixel-level Image Difference Detection Tool',
    'app.description':
      'A security tool that compares two images at the pixel level and visualizes differences. ' +
      'Useful for detecting QR code tampering and verifying evidence images.',
    'app.keywords':
      'image diff, pixel comparison, tampering detection, QR code, forensics, security tool, Canvas API',
    'app.ogDescription':
      'Visualize the difference between two images pixel by pixel and check for tampering, entirely in your browser.',
    'app.siteName': 'ImageDiffSec',
    'app.tagline': 'A security tool that compares and detects image differences visually',
    'app.langButton': '日本語',
    'app.langAria': 'Switch language',
    'app.helpAria': 'Help',
    'app.darkAria': 'Toggle dark mode',

    'upload.image1': 'Image 1',
    'upload.image2': 'Image 2',
    'upload.dropAria1': 'Choose or drop a file for image 1',
    'upload.dropAria2': 'Choose or drop a file for image 2',
    'upload.dropHint': 'Drag & drop an image here',
    'upload.dropOr': 'or',
    'upload.choose': 'Choose a file',
    'upload.clear': 'Clear',
    'upload.clearAria1': 'Clear image 1',
    'upload.clearAria2': 'Clear image 2',
    'upload.canvas1': 'Preview of image 1',
    'upload.canvas2': 'Preview of image 2',
    'upload.copyHash': 'Copy SHA-256',
    'upload.copyAria1': 'Copy the SHA-256 of image 1',
    'upload.copyAria2': 'Copy the SHA-256 of image 2',

    'compare.toleranceLabel': 'Tolerance (0 = exact match)',
    'compare.toleranceHint':
      'Re-saving a JPEG alone shifts every pixel slightly. Raise this when you compare such images.',
    'compare.button': 'Compare images',

    'result.heading': 'Difference view',
    'result.canvasFallback': 'Preview of the difference',
    'result.canvasAriaEmpty': 'Difference image. Nothing has been compared yet.',
    'result.canvasAria': 'Difference image. {count} pixels are marked in red.',
    'result.save': 'Save the difference as PNG',

    'diff.none': 'No difference: all {total} pixels match',
    'diff.found': 'Difference found: {count} / {total} pixels ({rate})',
    'diff.tolerance': ' (compared with tolerance {tolerance})',
    'diff.bbox': 'Difference area: x {minX}-{maxX}, y {minY}-{maxY} ({width}×{height} pixels)',

    'rate.zero': '0%',
    'rate.below': 'under 0.01%',
    'rate.value': '{percent}%',

    'match.overlay':
      'Image {small} was placed on image {large} at ({x}, {y}) for comparison (alignment score {score})',
    'match.lowScore':
      '⚠ The alignment score is below 0.90. Either the two images differ widely, or the alignment is off. ' +
      'If the difference is scattered over the whole image, suspect a failed alignment.',

    'hash.prefix': 'SHA-256: {prefix}… (first 16 hex digits)',
    'hash.unavailable': 'SHA-256 cannot be computed in this environment',
    'hash.same': 'The files are identical (SHA-256 matches)',
    'hash.different': 'The files are different (SHA-256 does not match)',
    'hash.metaOnly':
      'The pixels match, but the files are different. Only metadata (such as Exif) or the compression settings may differ.',
    'hash.metaOnlyTolerance': 'The pixels match within the tolerance, but the files are different',

    'status.aligning': 'Aligning… ({step} / {total} levels)',

    'notice.downscaled':
      '⚠ Image {number} was larger than 4096px, so it was scaled down on load ' +
      '({originalWidth}×{originalHeight} → {width}×{height}). A scaled image gives no strict comparison.',
    'notice.copied': 'The SHA-256 was copied.',

    'error.unsupportedType': 'Unsupported format (PNG, JPEG, GIF and WebP are supported)',
    'error.loadFailed': 'The image could not be loaded.',
    'error.pixelsUnreadable': 'Pixels cannot be read from this image',
    'error.needBothImages': 'Load both image 1 and image 2',
    'error.noContainment': 'With these two image sizes, no overlapping area can be located.',
    'error.unmatchable':
      'Alignment impossible: the smaller image is a single flat color, so there is no clue to its position',
    'error.compareFailed': 'The comparison could not be finished. Please load the images again.',
    'error.saveFailed': 'The PNG could not be saved.',
    'error.copyFailed':
      'Copying failed. All 64 hex digits of the SHA-256 are available from the title of the hash line.',

    'help.title': '📚 ImageDiffSec help',
    'help.closeAria': 'Close the help',
    'help.usageHeading': '🔍 How to use',
    'help.usageLoad': 'Load the images',
    'help.usageLoad1': 'Click the "Choose a file" button',
    'help.usageLoad2': 'Or drag & drop an image into the dashed area',
    'help.usageCompare': 'Compare the images',
    'help.usageCompare1': 'Once both images are loaded, click the "Compare images" button',
    'help.usageCompare2': 'Differing areas are shown in red',
    'help.usageCheck': 'Read the result',
    'help.usageCheck1': 'Check the raw number of differing pixels and the area they cover',
    'help.usageCheck2': 'The size of the difference rate alone does not tell how serious the tampering is',
    'help.notesHeading': '⚠️ Notes',
    'help.notes1':
      'When the sizes differ, the smaller image is searched for inside the larger one. Rotation and scaling are not supported',
    'help.notes2': 'Images larger than 4096px are scaled down, so the comparison is no longer strict',
    'help.notes3': 'Everything runs inside your browser. Neither the images nor the hashes are sent to a server',
    'help.securityHeading': '🛡 Security uses',
    'help.securityQr': 'Detecting a tampered QR code',
    'help.securityQrDesc': ': spot a swap to a malicious link',
    'help.securityDoc': 'Checking a forged document',
    'help.securityDocDesc': ': find edits in a contract or a certificate',
    'help.securityPhish': 'Inspecting a phishing site',
    'help.securityPhishDesc': ': detect the small differences between the real page and the fake one',
    'help.tipsHeading': '💡 Tips',
    'help.tips1':
      '"No difference" appears only when zero pixels differ. A single differing pixel already reads as "Difference found"',
    'help.tips2': 'A higher tolerance ignores small color shifts. The tolerance used is shown with the result',
    'help.tips3':
      'SHA-256 compares the bytes of the original file. Even with matching pixels, metadata and other bytes can differ',
    'help.tips4': '"Save the difference as PNG" keeps the red difference and the blue bounding box',
    'help.tips5':
      'A warning appears when the alignment score is below 0.90. Tampering also lowers the score, so it is not always a failure',
    'help.tips6': 'A flat-color crop cannot be aligned. The clear button resets an image',
    'help.darkHeading': '🌙 Dark mode',
    'help.darkBody': 'The 🌞/🌙 button in the header switches dark mode. The choice is stored in your browser.',
    'help.langHeading': '🌐 Display language',
    'help.langBody':
      'The "日本語" button in the header switches between Japanese and English. ' +
      'You can also ask for a language with ?lang=en or ?lang=ja in the URL, and the choice is stored in your browser.',
    'help.relatedHeading': '🔗 Related links',
    'help.relatedRepo': 'GitHub repository',
    'help.relatedLicense': 'License: MIT License',
    'help.relatedAuthor': 'Author: ipusiron',

    'footer.repo': '🔗 GitHub repository (',
    'footer.repoEnd': ')'
  };

  let language = 'ja';
  const STORAGE_KEY = 'image-diff-sec-language';

  function t(key, values = {}) {
    const dict = language === 'en' ? en : ja;
    const message = dict[key];
    if (typeof message !== 'string') throw new Error('Unknown message: ' + key);
    return message.replace(/\{(\w+)\}/g, (whole, name) =>
      (Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole));
  }

  function apply(root = document) {
    document.documentElement.lang = language;
    document.title = t('app.title');
    root.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    for (const attr of ['aria-label', 'title', 'placeholder', 'alt', 'content']) {
      root.querySelectorAll('[data-i18n-' + attr + ']').forEach(element =>
        element.setAttribute(attr, t(element.getAttribute('data-i18n-' + attr))));
    }
  }

  function setLanguage(value) {
    if (value !== 'ja' && value !== 'en') return;
    language = value;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      /* 保存領域が使えなくても、画面上での切り替えは続ける。 */
    }
    apply();
    document.dispatchEvent(new Event('languagechange'));
  }

  function init() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      /* 保存領域が使えない環境では既定に従う。 */
    }
    let query = null;
    try {
      query = new URLSearchParams(location.search).get('lang');
    } catch (error) {
      /* file://で開いた場合などに検索文字列が読めなくても既定に従う。 */
    }
    const preferred = [query, saved].find(value => value === 'ja' || value === 'en');
    language = preferred || (/^ja\b/i.test(navigator.language || '') ? 'ja' : 'en');
    apply();
  }

  return { ja, en, t, apply, init, setLanguage, get language() { return language; } };
})();

if (typeof window !== 'undefined') window.I18n = I18n;
if (typeof module !== 'undefined' && module.exports) module.exports = I18n;

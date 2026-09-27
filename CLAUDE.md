# CLAUDE.md

このファイルは、ImageDiffSecを変更するAI向けの開発ガイドです。実装・テスト・README・画面の表示を一致させてください。

## Project Overview

2枚の画像を画素単位で比較する、ブラウザー完結の静的Webツールです。

- **言語**: vanilla JavaScript・HTML・CSS
- **用途**: QRコードの差し替え、文書や証拠画像の変更箇所の確認
- **制約**: ES module・Web Worker・ビルド工程・npm依存を追加しない。HTTPとfile://の両方を維持
- **プライバシー**: 画像・ハッシュの外部送信なし。外部リソースの読み込みなし

## Development Commands

- **自動テスト**: Node22以上で`npm test`（`node --test`、依存のインストール不要）
- **ローカル実行**: `index.html`を直接開く、または`python -m http.server 8000 --bind 127.0.0.1`
- **HTTP確認**: `http://127.0.0.1:8000/`を開く。CSP違反・404・consoleのエラーと警告がないことを確認
- **CI**: `.github/workflows/test.yml`がpushとpull_requestでNode22のテストを実行

## Architecture

- **index.html**: ファイル選択・許容差・比較結果・PNG保存・ヘルプのマークアップ
- **style.css**: `:root`と`body.dark-mode`の配色、600px以下のレイアウト
- **js/core/pixel-diff.js**: `comparePixels`・`cropRegion`・`formatRate`・`formatCount`・`describeResult`
- **js/core/template-match.js**: `toLuma`・`chooseLargeSmall`・`downsample`・`coarsestFactor`・`isFlat`・`matchConfidence`
- **js/core/template-match.jsの探索API**: `buildLevels`・`searchCoarsest`・`refineLevel`・`findBestMatch`
- **js/core/hash.js**: `toHex`によるSHA-256の16進表記への変換
- **js/i18n.js**: 日本語と英語の辞書、`t`・`apply`・`init`・`setLanguage`。他のスクリプトより先に読み込む
- **js/image-processor.js**: Blob URLによる画像読み込み、状態管理、段ごとの探索、差分描画、ハッシュ・PNG保存
- **js/ui-controller.js**: 入力とドロップの共通処理、テーマ、モーダル、言語切り替え、メッセージ欄
- **js/main.js**: DOMContentLoadedで初期化し、addEventListenerでイベントを登録
- **test/**: 標準Nodeテスト。supportのPNGデコーダーは同梱サンプルの2形式だけに対応
- **test-tools/**: 手動の試験画像生成ページ
- **vendor/qrcode-generator/**: 1.4.4の未改変配布物とMITライセンス。test-toolsだけが使用

### Core Algorithm

同一サイズも異サイズも、画素比較の定義は`max(|dR|, |dG|, |dB|, |dA|) > tolerance`です。
アルファを省略したり、位置合わせのスコアによって白黒二値の比較へ切り替えたりしないでください。

位置合わせはブロック平均の縮小画像を使うNCCの多段探索です。粗い段で全位置を探索し、上位5候補を保持します。
近接候補はx・yの両方が2以内ならまとめ、次の段では座標を2倍した位置の周囲±3を探索します。
スコアの比較は同じ段の中だけで行います。ブラウザーは段の間でrequestAnimationFrameを待ち、進捗を描画します。

小さい側が単色、または最良スコアが0なら位置合わせ不能とし、差分の数値を出しません。
スコア0.9以上はhigh、0.9未満はlowとして警告しますが、位置が外れたとは断定しません。
回転と拡大縮小には対応していません。

#### Canvas API Methods Used

- `getContext("2d", { willReadFrequently: true })`: 画素を読むコンテキスト
- `drawImage()`: ブラウザーによる画像の描画
- `getImageData()`: try/catchで保護してRGBAを取得
- `createImageData()`・`putImageData()`: 赤い差分と淡いグレースケールを描画
- `strokeRect()`: 差分の外接矩形の3px外側に幅2pxの青い枠
- `toBlob()`: 差分PNGの保存。生成したBlob URLは解放

## Key Implementation Notes

- coreの3ファイルはDOM・ストレージ非依存。末尾の条件付きCommonJS公開を維持
- 入力とドロップで同じMIME一覧（PNG・JPEG・GIF・WebP）を使用。SVGは拒否
- 読み込み完了は状態で管理。初期canvasの既定寸法を読み込み判定に使わない
- 許容差は0〜255、既定0。変更時は保存した比較領域だけを再比較し、探索をやり直さない
- 差分0だけ「差分なし」。1画素以上は「差分あり」と実数・率・範囲を表示
- 正の差分率が0.01%未満なら「0.01%未満」。許容差0以外では比較条件を明示
- SHA-256は元ファイル全体から計算。画素一致とファイル一致を区別
- crypto.subtleがなくても画素比較を継続。ストレージの例外でもテーマ切り替えを継続
- 比較中は再実行・画像変更を無効化。読込中の古い非同期処理は現在の状態を上書きしない
- alertやconsoleへの出力をアプリJSに入れない。エラーと進捗は画面内に表示
- 画像・入力をinnerHTMLへ埋め込まない。メッセージはtextContentを使用

### Internationalization

- **画面の文言は`js/i18n.js`の辞書に置く。**`textContent`や`setAttribute`へ日本語を直接書かない
- HTMLは`data-i18n`（本文）と`data-i18n-<属性>`（`aria-label`・`title`・`placeholder`・`alt`・`content`）で指す。
  初期テキストは`ja`の値と一致させる。JSが動かないときはそれが出る
- **JSが書き込むスロットと、状態で変わる属性に`data-i18n`を付けない。**`apply()`が無条件に上書きするため、
  結果が出ている状態で言語を切り替えると巻き戻る。`#diffCanvas`の`aria-label`・`#diffRate`・`#hashResult`・
  `#matchResult`・`#matchWarning`・`#canvasXHash`・`#canvasXNotice`・メッセージ欄が該当する
- **表示中の文言は`{ key, params }`で保持し、`languagechange`で`renderTexts()`と`renderMessage()`が訳し直す。**
  訳した文字列を状態や差し込み値に入れない。比較や位置合わせはやり直さない
- coreの3ファイルは文言を持たない。`formatRate`と`describeResult`は`{ key, params }`だけを返す
- 画像フォーマット名（PNG・JPEG・GIF・WebP）、SHA-256、NCC、RGBAは規格上の識別子なので訳さない
- 言語の保存は`js/i18n.js`の`image-diff-sec-language`だけが行う。テーマの`darkMode`とは別に扱う
- 文言を足したら`README.md`・`README.en.md`・`test/i18n.test.js`のキー数を合わせる

### Technical Limitations

ブラウザー描画後のRGBAを比べるため、色空間変換・Exifの向き補正の影響があります。
幅または高さが4096pxを超えた場合は元の計算方法で縮小し、元と縮小後の寸法を通知します。
縮小後は元解像度での厳密な比較になりません。ファイルのバイト列の一致はSHA-256で確認します。

### Performance Considerations

段ごとに小さい画像の統計を一度だけ求め、各候補のNCCは1走査で求めます。
画像サイズ・探索範囲によって負荷が変わります。大きな入力が一瞬で処理できると約束しないでください。

### Browser Compatibility

インストール済みChromiumでHTTPとfile://の読み込み・比較・SHA-256・PNG保存を確認しています。
現在のCanvas・Blob・Web Crypto・requestAnimationFrameを備えたブラウザーが対象です。
古いブラウザーの最低バージョンを根拠なく記載しないでください。

### Error Handling

- 両画像の未読込、非対応MIME、画像の読込失敗
- 相互に包含できない寸法、単色での位置合わせ
- 画素の読出し失敗、ハッシュやクリップボードの利用不能
- メッセージはrole=status／role=alertへ表示し、ダイアログで処理を止めない

## Sample Images

samplesの6枚は変更しないでください。許容差0の差分は次のとおりです。

| 組 | 大きさ | 差分の画素 | 率 |
|---|---|---|---|
| qr_legit / qr_fake | 330×330 | 16,900 / 108,900 | 15.52% |
| doc_original / doc_edited | 400×200 | 121 / 80,000 | 0.15% |
| flyer_before / flyer_after | 400×250 | 246 / 100,000 | 0.25% |

切り出し6例・合成模様7例・RGBA比較8例・率の表示11例も固定期待値としてテストします。
READMEの表・画像参照・全ファイルのツリー・HTMLコメント内のYAMLも検証対象です。
README先頭のメタデータの構造と識別値は維持してください。
日英の辞書は100キーで、キーの集合・差し込みの名前・HTMLのフォールバック文言も検証対象です。

## Context

「Day021 - 生成AIで作るセキュリティツール100」のツールです。
変更時はコード・画面・ヘルプ・README・このガイド・テストの数値を最後に突き合わせてください。

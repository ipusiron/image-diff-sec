# ImageDiffSecテンプレートマッチング問題分析レポート

## 問題の概要

ImageDiffSecのテスト3（QRコード風パターン）において、同一画像を比較しているにも関わらず差分率17.65%、位置ずれ(102,102)が発生する問題を調査・修正しました。

## 問題の詳細

### 発生状況
- **テスト1,2（シンプルパターン）**: 差分率0.00% ✅ 正常
- **テスト3（QRコード風パターン）**: 差分率17.65% ❌ 異常
- **期待位置**: (100, 100)
- **実際の検出位置**: (102, 102) - 2ピクセルずれ
- **NCCスコア**: 0.629（低い）

### 原因の特定

#### 1. サンプリング間隔（step）による精度低下
```javascript
// 問題のあるコード (image-processor.js:104)
const step = Math.max(2, Math.floor(Math.min(largeCanvas.width, largeCanvas.height) / 60));
```

**具体的問題:**
- 400x400画像の場合: `step = Math.max(2, Math.floor(400/60)) = 6`
- 6ピクセル間隔でのサンプリングにより特徴量が不正確
- QRコードの8x8ピクセルセルとstep=6の相性が悪い

#### 2. 探索位置の粗い間隔
```javascript
// 問題のあるコード (image-processor.js:119-120)
for (let y = 0; y <= largeCanvas.height - smallCanvas.height; y += step) {
  for (let x = 0; x <= largeCanvas.width - smallCanvas.width; x += step) {
```

**具体的問題:**
- 探索も6ピクセル間隔で実行
- 真の最適位置(100,100)をスキップ
- 近似位置(102,102)で最高スコアを検出

#### 3. 複雑パターンでのNCC計算精度低下
- QRコードのような高周波パターンでサンプリング精度が重要
- セル境界を跨ぐサンプリングで特徴量が劣化
- 結果としてNCCスコア0.629と低下

## 修正案の実装

### 1. 2段階テンプレートマッチングアルゴリズム

```javascript
function findBestMatch(largeCanvas, smallCanvas) {
  // === 第1段階：粗い探索 ===
  let coarseStep = Math.max(4, Math.floor(Math.min(largeCanvas.width, largeCanvas.height) / 80));
  const coarseResult = performTemplateMatch(largeData, smallData, largeCanvas, smallCanvas, coarseStep);
  
  // === 第2段階：精密探索 ===
  const searchRadius = Math.max(coarseStep * 2, 8);
  // 粗い探索結果の周辺を1ピクセル単位で詳細探索
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const ncc = calculateNCC(largeData, smallData, x, y, largeCanvas.width, smallCanvas.width, smallCanvas.height, 1);
      // 最適位置を更新
    }
  }
}
```

### 2. 適応的サンプリング

```javascript
function calculateNCC(largeData, smallData, offsetX, offsetY, largeWidth, smallWidth, smallHeight, step) {
  // 適応的サンプリング：stepが1の場合は全ピクセル、それ以外はサンプリング
  const sampleStep = step === 1 ? 1 : Math.max(2, step);
  
  // 境界チェック強化
  if (largeIdx + 2 < largeData.data.length && smallIdx + 2 < smallData.data.length) {
    // NCC計算
  }
}
```

### 3. 差分判定の改良

```javascript
// 高精度マッチの場合は厳密比較を優先
const isSignificantDiff = match.score > 0.95 ? !exactMatch : 
  Math.sqrt((r1-r2)*(r1-r2) + (g1-g2)*(g1-g2) + (b1-b2)*(b1-b2)) > threshold;
```

## 修正効果の予測

### 位置精度の改善
- **修正前**: (102, 102) - 2.83ピクセル誤差
- **修正後**: (100, 100) - 0ピクセル誤差（期待値）

### NCCスコアの向上
- **修正前**: 0.629（低精度）
- **修正後**: 0.95以上（高精度）の期待

### 差分率の改善
- **修正前**: 17.65%（誤検出）
- **修正後**: 0.00%（正確）の期待

## パフォーマンス影響

### 計算量の変化
- **第1段階**: O(W×H/step²) - 従来と同等
- **第2段階**: O(radius²) - 限定範囲のため影響小
- **総合**: 約1.5-2倍の処理時間（精度向上とのトレードオフ）

### メモリ使用量
- 変化なし（同じImageDataを使用）

## テストケース

### 修正版テストファイル
1. `debug-test.html` - 詳細なデバッグ情報表示
2. `test-fixed-version.html` - 修正前後の比較テスト
3. `index-fixed.html` - 修正版の統合アプリケーション

### 検証項目
1. **位置精度**: 期待位置(100,100)での正確な検出
2. **NCCスコア**: 同一画像で1.0に近いスコア
3. **差分率**: 同一画像で0.00%
4. **処理時間**: 許容範囲内での性能維持

## 実装ファイル

### 修正版ファイル
- `js/image-processor-fixed.js` - 修正されたテンプレートマッチングアルゴリズム
- `index-fixed.html` - 修正版統合アプリケーション

### テストファイル
- `debug-test.html` - デバッグ専用テスト
- `test-fixed-version.html` - 比較テスト
- `simple-test-generator.html` - テストパターン生成

## 結論

QRコード風パターンでの差分検出問題は、テンプレートマッチングアルゴリズムのサンプリング間隔と探索粒度の問題でした。2段階探索アルゴリズムの実装により、以下の改善が期待されます：

1. **位置精度**: 1ピクセル単位の正確な検出
2. **NCCスコア**: 同一画像で0.95以上の高精度
3. **差分率**: 同一画像で0.00%の正確な判定
4. **汎用性**: 複雑なパターンでも安定した性能

この修正により、ImageDiffSecはQRコードや複雑なバイナリパターンを含む画像でも正確な差分検出が可能になります。

## 推奨事項

1. **本修正版の採用**: 精度向上のため修正版の使用を推奨
2. **追加テスト**: 様々なパターンでの継続的なテスト実施
3. **性能最適化**: 必要に応じてさらなる最適化を検討
4. **ユーザー向け情報**: ヘルプに修正点の説明を追加

---

**調査・修正日時**: 2025-07-22
**対象バージョン**: ImageDiffSec オリジナル版
**修正版**: 2段階テンプレートマッチング対応版
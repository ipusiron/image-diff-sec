const test = require("node:test");
const assert = require("node:assert/strict");
const { comparePixels, formatRate, formatCount, cropRegion, describeResult } = require("../js/core/pixel-diff");
const { synth } = require("./support/patterns");

test("A-3: 厳密なRGBA比較8例、許容差、範囲、入力不変", () => {
  const a = synth(4, 3, () => [100, 100, 100, 255]);
  const original = a.slice();
  const cases = [
    [[], 0, 0, null],
    [[[1, 1, 0, 101]], 0, 1, [1, 1, 1, 1]],
    [[[1, 1, 0, 101]], 1, 0, null],
    [[[1, 1, 0, 111]], 10, 1, [1, 1, 1, 1]],
    [[[1, 1, 0, 110]], 10, 0, null],
    [[[3, 2, 3, 254]], 0, 1, [3, 2, 3, 2]],
    [[[0, 0, 1, 0], [3, 2, 2, 255]], 0, 2, [0, 0, 3, 2]]
  ];
  for (const [edits, tolerance, count, box] of cases) {
    const b = a.slice();
    for (const [x, y, channel, value] of edits) b[(y * 4 + x) * 4 + channel] = value;
    const savedB = b.slice();
    const result = comparePixels(a, b, 4, 3, tolerance);
    assert.equal(result.diffCount, count);
    assert.equal(result.total, 12);
    assert.ok(result.mask instanceof Uint8Array);
    assert.equal(result.mask.reduce((sum, value) => sum + value, 0), count);
    const expected = box && {
      minX: box[0], minY: box[1], maxX: box[2], maxY: box[3],
      width: box[2] - box[0] + 1, height: box[3] - box[1] + 1
    };
    assert.deepEqual(result.bbox, expected);
    assert.deepEqual(a, original);
    assert.deepEqual(b, savedB);
  }
  const transparent = synth(2, 2, () => [0, 0, 0, 0]);
  const black = synth(2, 2, () => [0, 0, 0, 255]);
  assert.equal(comparePixels(transparent, black, 2, 2).diffCount, 4);
});

test("A-4/A-5: 微小差分を0と表示しない11例と結果の文", () => {
  const cases = [
    [0, 80000, "0%"], [1, 1000000, "0.01%未満"], [49, 1000000, "0.01%未満"],
    [50, 1000000, "0.01%未満"], [99, 1000000, "0.01%未満"], [100, 1000000, "0.01%"],
    [121, 80000, "0.15%"], [246, 100000, "0.25%"], [16900, 108900, "15.52%"],
    [1, 16777216, "0.01%未満"], [80000, 80000, "100.00%"]
  ];
  for (const [count, total, expected] of cases) assert.equal(formatRate(count, total), expected);
  assert.equal(formatCount(1000000), "1,000,000");
  assert.equal(describeResult({ diffCount: 0, total: 80000 }), "差分なし: 80,000 ピクセルすべてが一致");
  const bbox = { minX: 80, minY: 42, maxX: 113, maxY: 60, width: 34, height: 19 };
  assert.equal(describeResult({ diffCount: 121, total: 80000, bbox }),
    "差分あり: 121 / 80,000 ピクセル（0.15%）\n差分の範囲: x 80〜113, y 42〜60（34×19 ピクセル）");
  assert.equal(describeResult({ diffCount: 0, total: 80000, tolerance: 10 }),
    "差分なし: 80,000 ピクセルすべてが一致（許容差 10 で比較）");
});

test("cropRegionの境界、配列長と許容差の検証", () => {
  const data = synth(4, 3, (x, y) => [x, y, 0]);
  assert.deepEqual(cropRegion(data, 4, 0, 0, 1, 1), data.slice(0, 4));
  assert.deepEqual(cropRegion(data, 4, 3, 2, 1, 1), data.slice(-4));
  assert.deepEqual(cropRegion(data, 4, 0, 0, 4, 3), data);
  for (const rect of [[-1, 0, 1, 1], [0, 0, 5, 3], [3, 2, 2, 1], [0, 0, 0, 1]]) {
    assert.throws(() => cropRegion(data, 4, ...rect), RangeError);
  }
  assert.throws(() => comparePixels(data, data.slice(4), 4, 3));
  assert.throws(() => comparePixels(data, data, 3, 3));
  for (const tolerance of [-1, 256, NaN, 0.5]) assert.throws(() => comparePixels(data, data, 4, 3, tolerance));
});

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

// 表示用の文言は表示層で訳すため、率と結果は { key, params } で返る。閾値と桁は従来どおり。
test("A-4/A-5: 微小差分を0と表示しない11例と結果の文", () => {
  const below = { key: "rate.below", params: {} };
  const value = percent => ({ key: "rate.value", params: { percent } });
  const cases = [
    [0, 80000, { key: "rate.zero", params: {} }], [1, 1000000, below], [49, 1000000, below],
    [50, 1000000, below], [99, 1000000, below], [100, 1000000, value("0.01")],
    [121, 80000, value("0.15")], [246, 100000, value("0.25")], [16900, 108900, value("15.52")],
    [1, 16777216, below], [80000, 80000, value("100.00")]
  ];
  for (const [count, total, expected] of cases) assert.deepEqual(formatRate(count, total), expected);
  assert.equal(formatCount(1000000), "1,000,000");
  assert.deepEqual(describeResult({ diffCount: 0, total: 80000 }), {
    summary: { key: "diff.none", params: { total: "80,000" } }, tolerance: null, bbox: null
  });
  const bbox = { minX: 80, minY: 42, maxX: 113, maxY: 60, width: 34, height: 19 };
  assert.deepEqual(describeResult({ diffCount: 121, total: 80000, bbox }), {
    summary: {
      key: "diff.found", params: { count: "121", total: "80,000" }, rate: value("0.15")
    },
    tolerance: null,
    bbox: { key: "diff.bbox", params: { minX: 80, maxX: 113, minY: 42, maxY: 60, width: 34, height: 19 } }
  });
  assert.deepEqual(describeResult({ diffCount: 0, total: 80000, tolerance: 10 }), {
    summary: { key: "diff.none", params: { total: "80,000" } },
    tolerance: { key: "diff.tolerance", params: { tolerance: 10 } },
    bbox: null
  });
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

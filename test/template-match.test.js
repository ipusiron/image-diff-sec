const test = require("node:test");
const assert = require("node:assert/strict");
const match = require("../js/core/template-match");
const { comparePixels, cropRegion } = require("../js/core/pixel-diff");
const { doc, photo, noise, synth, tamper } = require("./support/patterns");

test("B-2: 包含関係6例", () => {
  const cases = [
    [[400, 300, 200, 150], { large: 1 }], [[200, 150, 400, 300], { large: 2 }],
    [[400, 300, 400, 300], { same: true }], [[400, 100, 100, 400], { error: "no-containment" }],
    [[400, 300, 400, 150], { large: 1 }], [[300, 300, 400, 300], { large: 2 }]
  ];
  for (const [args, expected] of cases) assert.deepEqual(match.chooseLargeSmall(...args), expected);
});

const cases = [
  ["周期1", doc, 400, 300, 37, 41, 200, 150, null, 0, "1.0000"],
  ["周期2", doc, 400, 300, 40, 28, 200, 150, null, 0, "1.0000"],
  ["写真", photo, 400, 300, 37, 41, 200, 150, null, 0, "1.0000"],
  ["赤", photo, 400, 300, 37, 41, 200, 150, "red", 211, "0.9971"],
  ["黄ばみ", photo, 400, 300, 37, 41, 200, 150, "yellow", 2466, "0.9929"],
  ["ノイズ", noise, 400, 400, 123, 77, 200, 200, null, 0, "1.0000"],
  ["100万画素", photo, 1000, 1000, 123, 321, 500, 500, null, 0, "1.0000"]
];
for (const [name, pattern, W, H, x, y, w, h, change, count, score] of cases) {
  test("B-5: " + name, () => {
    const large = synth(W, H, pattern);
    const small = synth(w, h, (dx, dy) => tamper(dx, dy, pattern(dx + x, dy + y), change));
    const L = match.toLuma(large), S = match.toLuma(small);
    const savedL = L.slice(), savedS = S.slice();
    const result = match.findBestMatch(L, W, H, S, w, h);
    if (pattern !== doc) assert.deepEqual([result.x, result.y], [x, y]);
    else assert.ok(result.score >= 0.999999);
    assert.equal(result.score.toFixed(4), score);
    assert.equal(comparePixels(cropRegion(large, W, result.x, result.y, w, h), small, w, h).diffCount, count);
    assert.deepEqual(L, savedL);
    assert.deepEqual(S, savedS);
  });
}

test("段階API、単色、縮小率、端数と信頼度", () => {
  assert.ok(match.isFlat(new Uint16Array([5, 5, 5])));
  assert.ok(!match.isFlat(new Uint16Array([5, 5, 6])));
  for (const [args, value] of [
    [[400, 300, 200, 150], 4], [[1000, 1000, 500, 500], 8],
    [[400, 400, 20, 20], 2], [[100, 100, 10, 10], 1]
  ]) assert.equal(match.coarsestFactor(...args), value);
  assert.equal(match.matchConfidence(0.9), "high");
  assert.equal(match.matchConfidence(0.8999), "low");
  const reduced = match.downsample(new Uint16Array([1, 2, 99, 3, 4, 99, 99, 99, 99]), 3, 3, 2);
  assert.deepEqual(reduced, { data: new Float64Array([2.5]), width: 1, height: 1 });
  const L = match.toLuma(synth(100, 100, photo)), S = match.toLuma(synth(30, 30, (x, y) => photo(x + 20, y + 30)));
  const levels = match.buildLevels(L, 100, 100, S, 30, 30);
  let candidates = match.searchCoarsest(levels[0]);
  for (const level of levels.slice(1)) candidates = match.refineLevel(level, candidates);
  assert.deepEqual({ ...candidates[0], levels: levels.length }, match.findBestMatch(L, 100, 100, S, 30, 30));
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { createHash } = require("node:crypto");
const { decodePng } = require("./support/png");
const { comparePixels, cropRegion, describeResult } = require("../js/core/pixel-diff");
const { toLuma, findBestMatch, matchConfidence, isFlat } = require("../js/core/template-match");
const { toHex } = require("../js/core/hash");

const hashes = [
  ["qr_legit", 330, 330, "8b20e576f9d1ec85f3db4a272ff848b68e882205131259d269d360f3179a00d4"],
  ["qr_fake", 330, 330, "2f43da72061ef1cc09d40f4de028601bdcfc4840f232e9c1c1e3c8b952d53b6a"],
  ["doc_original", 400, 200, "1b286073341bbacf267c094d051f205da0e8e68682de9292127c9f46e5ce2d30"],
  ["doc_edited", 400, 200, "3c59def7d8c3ccd375d2c618f8a3546081b3ffd5a83cdb0fb9a49a39dbf247c0"],
  ["flyer_before", 400, 250, "83f3355e6dc73dad629e4af42c66985211a3a4eea680f956f73d6ed78e5dcff8"],
  ["flyer_after", 400, 250, "f68263564ea0fa9c4ee8abfe85d06c9f68180d5a6b72fdad501e2f76f2975359"]
];
const images = {};
for (const [name, width, height, hash] of hashes) {
  test("G-6: " + name + "の寸法とSHA-256", () => {
    const buffer = readFileSync(join(__dirname, "../samples", name + ".png"));
    const image = decodePng(buffer);
    assert.deepEqual([image.width, image.height], [width, height]);
    const digest = createHash("sha256").update(buffer).digest();
    assert.equal(digest.toString("hex"), hash);
    assert.equal(toHex(digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength)), hash);
    images[name] = image;
  });
}

const pairs = [
  ["qr_legit", "qr_fake", 16900, 108900, "15.52%", [40, 40, 289, 289]],
  ["doc_original", "doc_edited", 121, 80000, "0.15%", [80, 42, 113, 60]],
  ["flyer_before", "flyer_after", 246, 100000, "0.25%", [100, 112, 182, 120]]
];
function boxValues(box) {
  return box && [box.minX, box.minY, box.maxX, box.maxY];
}
test("G-6: サンプル3対の差分実数・範囲・率・同一画像", () => {
  for (const [left, right, count, total, rate, box] of pairs) {
    const a = images[left], b = images[right];
    const result = comparePixels(a.data, b.data, a.width, a.height);
    assert.equal(result.diffCount, count);
    assert.equal(result.total, total);
    assert.deepEqual(boxValues(result.bbox), box);
    assert.ok(describeResult(result).startsWith(
      `差分あり: ${count.toLocaleString("en-US")} / ${total.toLocaleString("en-US")} ピクセル（${rate}）`
    ));
    assert.equal(comparePixels(a.data, a.data, a.width, a.height).diffCount, 0);
  }
});
test("G-6: 許容差の全指定範囲", () => {
  for (const [left, right, count, , ,] of pairs) {
    const a = images[left], b = images[right];
    const end = left === "flyer_before" ? 128 : 254;
    for (let tolerance = 0; tolerance <= end; tolerance++) {
      assert.equal(comparePixels(a.data, b.data, a.width, a.height, tolerance).diffCount, count);
    }
    if (left === "flyer_before") assert.equal(comparePixels(a.data, b.data, a.width, a.height, 254).diffCount, 0);
    assert.equal(comparePixels(a.data, b.data, a.width, a.height, 255).diffCount, 0);
  }
});

const crops = [
  ["qr_legit", "qr_legit", 35, 35, 200, 200, "1.0000", "high", 0, null],
  ["qr_legit", "qr_fake", 35, 35, 200, 200, "0.4386", "low", 11200, [5, 5, 199, 199]],
  ["doc_original", "doc_original", 50, 20, 200, 100, "1.0000", "high", 0, null],
  ["doc_original", "doc_edited", 50, 20, 200, 100, "0.7845", "low", 121, [30, 22, 63, 40]],
  ["flyer_before", "flyer_before", 60, 90, 250, 100, "1.0000", "high", 0, null],
  ["flyer_before", "flyer_after", 60, 90, 250, 100, "0.7836", "low", 246, [40, 22, 122, 30]]
];
for (const [left, right, x, y, w, h, score, confidence, count, box] of crops) {
  test("G-6: 切り出し " + left + " / " + right, () => {
    const a = images[left], b = images[right];
    const small = cropRegion(b.data, b.width, x, y, w, h);
    const result = findBestMatch(toLuma(a.data), a.width, a.height, toLuma(small), w, h);
    assert.deepEqual([result.x, result.y], [x, y]);
    assert.equal(result.score.toFixed(4), score);
    assert.equal(matchConfidence(result.score), confidence);
    const diff = comparePixels(cropRegion(a.data, a.width, result.x, result.y, w, h), small, w, h);
    assert.equal(diff.diffCount, count);
    assert.deepEqual(boxValues(diff.bbox), box);
  });
}
test("単色の切り出しと非対応PNG形式", () => {
  const a = images.doc_original;
  assert.equal(isFlat(toLuma(cropRegion(a.data, a.width, 0, 150, 200, 50))), true);
  assert.throws(() => decodePng(Buffer.from("invalid")));
  const source = readFileSync(join(__dirname, "../samples/doc_original.png"));
  const unsupported = Buffer.from(source);
  unsupported[25] = 6;
  assert.throws(() => decodePng(unsupported), /unsupported PNG/);
  unsupported[25] = 2;
  unsupported[28] = 1;
  assert.throws(() => decodePng(unsupported), /interlaced/);
});

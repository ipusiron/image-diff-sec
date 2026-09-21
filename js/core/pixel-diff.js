// 画素の比較と表示用の文字列。画面とNodeのテストで共用する。

function validatePixels(data, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      !data || data.length !== width * height * 4) {
    throw new RangeError("size mismatch");
  }
}

function comparePixels(a, b, width, height, tolerance = 0) {
  validatePixels(a, width, height);
  validatePixels(b, width, height);
  if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 255) {
    throw new RangeError("invalid tolerance");
  }
  const mask = new Uint8Array(width * height);
  let diffCount = 0;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const delta = Math.max(
        Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]),
        Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3])
      );
      if (delta > tolerance) {
        mask[y * width + x] = 1;
        diffCount++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const bbox = diffCount === 0 ? null
    : { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
  return { diffCount, total: width * height, bbox, mask };
}

function formatRate(diffCount, total) {
  if (diffCount === 0) return "0%";
  const percent = diffCount / total * 100;
  return percent < 0.01 ? "0.01%未満" : percent.toFixed(2) + "%";
}

function formatCount(n) {
  return n.toLocaleString("en-US");
}

function cropRegion(data, width, x, y, w, h) {
  const height = data.length / (width * 4);
  validatePixels(data, width, height);
  if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || w < 1 || h < 1 ||
      x + w > width || y + h > height) {
    throw new RangeError("crop outside image");
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const start = ((y + row) * width + x) * 4;
    out.set(data.subarray(start, start + w * 4), row * w * 4);
  }
  return out;
}

function describeResult(result) {
  const { diffCount, total, bbox, tolerance = 0 } = result;
  let description = diffCount === 0
    ? `差分なし: ${formatCount(total)} ピクセルすべてが一致`
    : `差分あり: ${formatCount(diffCount)} / ${formatCount(total)} ピクセル（${formatRate(diffCount, total)}）`;
  if (tolerance !== 0) description += `（許容差 ${tolerance} で比較）`;
  if (bbox) {
    description += `\n差分の範囲: x ${bbox.minX}〜${bbox.maxX}, y ${bbox.minY}〜${bbox.maxY}` +
      `（${bbox.width}×${bbox.height} ピクセル）`;
  }
  return description;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { comparePixels, formatRate, formatCount, cropRegion, describeResult };
}

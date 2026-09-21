// 仕様で指定された合成模様。期待値と一緒に変えない。
const doc = (x, y) => ((Math.floor(x / 8) + Math.floor(y / 12)) % 3 === 0 ? [20, 20, 20] : [245, 245, 245]);
const photo = (x, y) => {
  const v = 128 + 60 * Math.sin(x / 17.3) * Math.cos(y / 23.1)
          + 40 * Math.sin((x + 2 * y) / 41.7) + 20 * Math.cos((3 * x - y) / 9.3);
  const g = Math.max(0, Math.min(255, Math.round(v)));
  const dark = ((x * 31 + y * 17) % 97 < 9) && (y % 29 < 11);
  return dark ? [25, 25, 25] : [g, g, g];
};
const noise = (x, y) => {
  let v = (x * 73856093) ^ (y * 19349663);
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  v ^= v >>> 16;
  const g = (v >>> 0) % 256;
  return [g, g, g];
};

function synth(width, height, fn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = fn(x, y);
      data.set([...pixel.slice(0, 3), pixel[3] ?? 255], (y * width + x) * 4);
    }
  }
  return data;
}

function tamper(x, y, p, mode) {
  if (x < 60 || x >= 140 || y < 40 || y >= 110) return p;
  if (mode === "red" && p[0] === 25) return [200, 0, 0];
  if (mode === "yellow" && p[0] > 150) return [p[0], p[1], p[2] - 60];
  return p;
}

module.exports = { doc, photo, noise, synth, tamper };

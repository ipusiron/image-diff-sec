// 同梱サンプル2形式だけを読む、テスト専用のデコーダー。
const { inflateSync } = require("node:zlib");

function decodePng(buf) {
  const sig = "89504e470d0a1a0a";
  if (buf.subarray(0, 8).toString("hex") !== sig) throw new Error("not a PNG");
  let pos = 8;
  let ihdr = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (!ihdr) throw new Error("missing IHDR");
  const { width, height, bitDepth, colorType, interlace } = ihdr;
  if (interlace !== 0) throw new Error("interlaced PNG is not supported");
  let channels;
  if (colorType === 2 && bitDepth === 8) channels = 3;
  else if (colorType === 0 && bitDepth === 1) channels = 1;
  else throw new Error(`unsupported PNG: colorType=${colorType} bitDepth=${bitDepth}`);

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = Math.max(1, (channels * bitDepth) >> 3);
  const stride = Math.ceil((width * channels * bitDepth) / 8);
  const lines = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw new Error("unsupported filter");
    const inOff = y * (stride + 1) + 1;
    const outOff = y * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? lines[outOff + i - bpp] : 0;
      const b = y > 0 ? lines[outOff - stride + i] : 0;
      const c = i >= bpp && y > 0 ? lines[outOff - stride + i - bpp] : 0;
      let v = raw[inOff + i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      lines[outOff + i] = v & 255;
    }
  }
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (channels === 3) {
        const s = y * stride + x * 3;
        rgba[o] = lines[s]; rgba[o + 1] = lines[s + 1]; rgba[o + 2] = lines[s + 2];
      } else {
        const bit = (lines[y * stride + (x >> 3)] >> (7 - (x & 7))) & 1;
        rgba[o] = rgba[o + 1] = rgba[o + 2] = bit ? 255 : 0;
      }
      rgba[o + 3] = 255;
    }
  }
  return { width, height, data: rgba };
}

module.exports = { decodePng };

// ブロック平均による多段探索。各段の中だけでNCCを比べる。
function toLuma(rgba) {
  if (rgba.length % 4 !== 0) throw new RangeError("invalid RGBA length");
  const out = new Uint16Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    out[j] = rgba[i] + rgba[i + 1] + rgba[i + 2];
  }
  return out;
}

function chooseLargeSmall(w1, h1, w2, h2) {
  if (w1 === w2 && h1 === h2) return { same: true };
  if (w1 >= w2 && h1 >= h2) return { large: 1 };
  if (w2 >= w1 && h2 >= h1) return { large: 2 };
  return { error: "no-containment" };
}

function downsample(G, W, H, k) {
  if (!Number.isInteger(k) || k < 1) throw new RangeError("invalid factor");
  const width = Math.floor(W / k), height = Math.floor(H / k);
  const data = new Float64Array(width * height);
  for (let by = 0; by < height; by++) {
    for (let bx = 0; bx < width; bx++) {
      let sum = 0;
      for (let dy = 0; dy < k; dy++) {
        const row = (by * k + dy) * W + bx * k;
        for (let dx = 0; dx < k; dx++) sum += G[row + dx];
      }
      data[by * width + bx] = sum / (k * k);
    }
  }
  return { data, width, height };
}

function coarsestFactor(W, H, w, h) {
  const base = Math.max(4, Math.floor(Math.min(W, H) / 80));
  const limit = Math.max(1, Math.floor(Math.min(w, h) / 8));
  let k = 1;
  while (k * 2 <= Math.min(base, limit)) k *= 2;
  return k;
}

function isFlat(G) {
  return G.every(value => value === G[0]);
}

function smallStats(S) {
  let sum = 0, sumSq = 0;
  for (const value of S) {
    sum += value;
    sumSq += value * value;
  }
  return { n: S.length, sum, variance: sumSq - sum * sum / S.length };
}

function nccAt(level, ox, oy) {
  const { L, S, stats } = level;
  let sumL = 0, sumLL = 0, sumLS = 0;
  for (let y = 0; y < S.height; y++) {
    const li = (oy + y) * L.width + ox;
    const si = y * S.width;
    for (let x = 0; x < S.width; x++) {
      const value = L.data[li + x];
      sumL += value;
      sumLL += value * value;
      sumLS += value * S.data[si + x];
    }
  }
  const numerator = sumLS - sumL * stats.sum / stats.n;
  const denominator = Math.sqrt(Math.max(0, sumLL - sumL * sumL / stats.n) * Math.max(0, stats.variance));
  return denominator > 0 ? numerator / denominator : 0;
}

function candidateOrder(a, b) {
  return b.score - a.score || a.y - b.y || a.x - b.x;
}

function pushCandidate(list, candidate) {
  // 同じ山の候補は良いほうに置き換え、上位5候補を維持する。
  for (let i = 0; i < list.length; i++) {
    if (Math.abs(list[i].x - candidate.x) <= 2 && Math.abs(list[i].y - candidate.y) <= 2) {
      if (candidateOrder(candidate, list[i]) < 0) list[i] = candidate;
      list.sort(candidateOrder);
      return;
    }
  }
  list.push(candidate);
  list.sort(candidateOrder);
  if (list.length > 5) list.length = 5;
}

function buildLevels(L, W, H, S, w, h) {
  if (![W, H, w, h].every(n => Number.isInteger(n) && n > 0) ||
      W < w || H < h || L.length !== W * H || S.length !== w * h) {
    throw new RangeError("invalid matching dimensions");
  }
  const levels = [];
  for (let k = coarsestFactor(W, H, w, h); k >= 1; k /= 2) {
    const large = k === 1 ? { data: L, width: W, height: H } : downsample(L, W, H, k);
    const small = k === 1 ? { data: S, width: w, height: h } : downsample(S, w, h, k);
    levels.push({ k, L: large, S: small, stats: smallStats(small.data) });
  }
  return levels;
}

function searchCoarsest(level) {
  const candidates = [];
  for (let y = 0; y <= level.L.height - level.S.height; y++) {
    for (let x = 0; x <= level.L.width - level.S.width; x++) {
      pushCandidate(candidates, { x, y, score: nccAt(level, x, y) });
    }
  }
  return candidates;
}

function refineLevel(level, candidates) {
  const next = [];
  for (const candidate of candidates) {
    const cx = candidate.x * 2, cy = candidate.y * 2;
    // 半径2に、縮小で捨てた端数の1画素を加える。
    for (let y = Math.max(0, cy - 3); y <= Math.min(level.L.height - level.S.height, cy + 3); y++) {
      for (let x = Math.max(0, cx - 3); x <= Math.min(level.L.width - level.S.width, cx + 3); x++) {
        pushCandidate(next, { x, y, score: nccAt(level, x, y) });
      }
    }
  }
  return next;
}

function findBestMatch(L, W, H, S, w, h) {
  const levels = buildLevels(L, W, H, S, w, h);
  let candidates = searchCoarsest(levels[0]);
  for (let i = 1; i < levels.length; i++) candidates = refineLevel(levels[i], candidates);
  return { ...candidates[0], levels: levels.length };
}

function matchConfidence(score) {
  return score >= 0.9 ? "high" : "low";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    toLuma, chooseLargeSmall, downsample, coarsestFactor, isFlat,
    findBestMatch, matchConfidence, buildLevels, searchCoarsest, refineLevel
  };
}

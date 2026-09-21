const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const { decodePng } = require("./support/png");
const { comparePixels, formatCount, formatRate } = require("../js/core/pixel-diff");
const root = join(__dirname, "..");
const readme = readFileSync(join(root, "README.md"), "utf8");

test("G-11: READMEのサンプル表3件を実ファイルから再計算", () => {
  const pattern = /^\| (\w+\.png) と (\w+\.png) \| (\d+×\d+) \| ([\d,]+ \/ [\d,]+) \| ([\d.]+%) \| (x [^|]+) \|$/gm;
  const rows = [...readme.matchAll(pattern)];
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row[1]), ["qr_legit.png", "doc_original.png", "flyer_before.png"]);
  for (const [, left, right, size, counts, rate, box] of rows) {
    const a = decodePng(readFileSync(join(root, "samples", left)));
    const b = decodePng(readFileSync(join(root, "samples", right)));
    const result = comparePixels(a.data, b.data, a.width, a.height);
    assert.equal(size, `${a.width}×${a.height}`);
    assert.equal(counts, `${formatCount(result.diffCount)} / ${formatCount(result.total)}`);
    assert.equal(rate, formatRate(result.diffCount, result.total));
    const { minX, maxX, minY, maxY } = result.bbox;
    assert.equal(box, `x ${minX}〜${maxX}, y ${minY}〜${maxY}`);
  }
});

test("G-11: YAMLの構造・識別値・画像の存在", () => {
  const match = readme.match(/^<!--\r?\n---\r?\n([\s\S]*?)\r?\n---\r?\n-->/);
  assert.ok(match, "先頭のHTMLコメント内にYAMLが必要");
  const yaml = match[1];
  for (const key of ["category_ja", "category_en", "tags"]) {
    assert.match(yaml, new RegExp("^" + key + ":\\r?\\n  - ", "m"));
  }
  const expected = {
    id: "day021", slug: "image-diff-sec", title: '"ImageDiffSec"', hub: "true",
    repo_url: '"https://github.com/ipusiron/image-diff-sec"',
    demo_url: '"https://ipusiron.github.io/image-diff-sec/"'
  };
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(yaml.match(new RegExp("^" + key + ": (.*)$", "m"))[1].trim(), value);
  }
  const images = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)]
    .map(match => match[1]).filter(path => !/^https?:\/\//.test(path));
  assert.deepEqual(images, ["assets/screenshot2.png", "assets/screenshot3.png", "assets/screenshot4.png"]);
  for (const path of images) assert.ok(existsSync(join(root, path)), path);
});

test("G-11: 全ファイルとディレクトリーを説明付きのツリーへ掲載", () => {
  const section = readme.split("## 📁 ディレクトリー構造")[1];
  assert.ok(section);
  const block = section.match(/```text\r?\n([\s\S]*?)\r?\n```/)[1];
  const lines = block.split(/\r?\n/);
  const listed = [], stack = [];
  const commentColumn = lines[0].indexOf("#");
  assert.match(lines[0], /^image-diff-sec\/ +# .+/);
  for (const line of lines) {
    assert.match(line, / +# \S.+$/);
    assert.equal(line.indexOf("#"), commentColumn, "説明開始位置をそろえる");
  }
  for (const line of lines.slice(1)) {
    const match = line.match(/^([│ ]*)(?:├── |└── )([^#]+?) +# /);
    assert.ok(match, line);
    const depth = match[1].length / 4;
    assert.ok(Number.isInteger(depth));
    const name = match[2].trim().replace(/\/$/, "");
    stack.length = depth;
    const path = [...stack, name].join("/");
    listed.push(path);
    stack[depth] = name;
  }
  const actual = [];
  function visit(directory) {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      if ([".git", ".claude"].includes(entry.name)) continue;
      const path = directory ? directory + "/" + entry.name : entry.name;
      actual.push(path);
      if (entry.isDirectory()) visit(path);
    }
  }
  visit("");
  assert.deepEqual(listed.sort(), actual.sort());
  assert.equal(new Set(listed).size, listed.length);
});

test("G-11: 誤った説明を残さず、限界と検証対象を明記", () => {
  assert.doesNotMatch(readme, /差分率: 0\.00%|偽陽性率|回転・スケール変化に対する耐性/);
  assert.match(readme, /0\.01%未満/);
  assert.match(readme, /4096px/);
  assert.match(readme, /47通り/);
  assert.match(readme, /100画素以上/);
  assert.match(readme, /0 \/ 30 \| 9 \/ 9 \| 15 \/ 15/);
  assert.match(readme, /0 \/ 22 \| 4 \/ 9 \| 32 \/ 32/);
  assert.match(readme, /vendor\/qrcode-generator\/LICENSE/);
  assert.match(readme, /npm test/);
  assert.match(readme, /file:\/\//);
  assert.ok(readme.trimEnd().endsWith("(https://akademeia.info/?page_id=42163)"));
});

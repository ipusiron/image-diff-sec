const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const root = join(__dirname, "..");
const read = name => readFileSync(join(root, name), "utf8");
const I18n = require(join(root, "js/i18n.js"));
const html = read("index.html");
const scripts = {
  "js/main.js": read("js/main.js"),
  "js/ui-controller.js": read("js/ui-controller.js"),
  "js/image-processor.js": read("js/image-processor.js"),
  "js/core/pixel-diff.js": read("js/core/pixel-diff.js")
};
// gフラグは付けない。lastIndexが残り、ループで交互にfalseになる。
const japanese = /[぀-ヿ一-鿿]/;

test("i18n: 日本語と英語でキーの集合が同じ", () => {
  assert.deepEqual(Object.keys(I18n.ja).filter(key => !(key in I18n.en)), [], "英語に無いキー");
  assert.deepEqual(Object.keys(I18n.en).filter(key => !(key in I18n.ja)), [], "日本語に無いキー");
  assert.equal(Object.keys(I18n.ja).length, 100);
});

test("i18n: 差し込みの名前が日本語と英語で一致する", () => {
  const holes = value => [...String(value).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(",");
  assert.deepEqual(Object.keys(I18n.ja).filter(key => holes(I18n.ja[key]) !== holes(I18n.en[key])), []);
});

test("i18n: index.html が指すキーはすべて辞書にある", () => {
  const keys = new Set();
  for (const match of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) keys.add(match[1]);
  assert.ok(keys.size >= 60, "data-i18n が少なすぎる: " + keys.size);
  assert.deepEqual([...keys].filter(key => !(key in I18n.ja)), []);
});

test("i18n: スクリプトが呼ぶキーはすべて辞書にある", () => {
  const keys = new Set();
  // 末尾に文字を要求する。'risk.' のような組み立ての断片を拾わないため。
  for (const source of Object.values(scripts)) {
    for (const match of source.matchAll(/["']([a-z][A-Za-z]*\.[A-Za-z][A-Za-z0-9]*)["']/g)) keys.add(match[1]);
  }
  assert.ok(keys.size >= 25, "文言キーが少なすぎる: " + keys.size);
  assert.deepEqual([...keys].filter(key => !(key in I18n.ja)), []);
  for (const key of [
    "error.unsupportedType", "status.aligning", "match.lowScore", "hash.metaOnly",
    "notice.downscaled", "diff.found", "rate.below", "result.canvasAriaEmpty"
  ]) assert.ok(keys.has(key), key);
});

test("i18n: 英語の辞書に訳し忘れの日本語が残っていない", () => {
  // 切り替えボタンは相手の言語を出すのが正しい。langBodyは「日本語」ボタンの名前を説明している。
  const allowed = ["app.langButton", "help.langBody"];
  const left = Object.keys(I18n.en).filter(key => !allowed.includes(key) && japanese.test(I18n.en[key]));
  assert.deepEqual(left, []);
  // 例外は逆方向も検査する。和文を含まなくなった許可証を残さない。
  for (const key of allowed) assert.ok(japanese.test(I18n.en[key]), key);
});

test("i18n: t() は差し込みを埋め、知らないキーで throw する", () => {
  assert.equal(I18n.t("status.aligning", { step: 2, total: 4 }), "位置合わせ中…（2 / 4 段）");
  assert.equal(I18n.t("hash.prefix", { prefix: "0123456789abcdef" }), "SHA-256: 0123456789abcdef…（先頭16桁）");
  assert.equal(I18n.t("rate.value", { percent: "0.15" }), "0.15%");
  assert.throws(() => I18n.t("no.such.key"), /Unknown message/);
  // setLanguage() は apply() を呼ぶのでNodeからは叩けない。英語は辞書の値で確かめる
  assert.equal(I18n.en["status.aligning"].replace("{step}", "2").replace("{total}", "4"),
    "Aligning… (2 / 4 levels)");
});

test("i18n: 日本語の表示が従来の文言と一致する", () => {
  // 純ロジックを { key, params } へ移しても、画面に出る日本語は変わらない
  const { describeResult } = require(join(root, "js/core/pixel-diff.js"));
  const render = parts => {
    const params = { ...parts.summary.params };
    if (parts.summary.rate) params.rate = I18n.t(parts.summary.rate.key, parts.summary.rate.params);
    let text = I18n.t(parts.summary.key, params);
    if (parts.tolerance) text += I18n.t(parts.tolerance.key, parts.tolerance.params);
    if (parts.bbox) text += "\n" + I18n.t(parts.bbox.key, parts.bbox.params);
    return text;
  };
  assert.equal(render(describeResult({ diffCount: 0, total: 80000 })), "差分なし: 80,000 ピクセルすべてが一致");
  assert.equal(render(describeResult({ diffCount: 0, total: 80000, tolerance: 10 })),
    "差分なし: 80,000 ピクセルすべてが一致（許容差 10 で比較）");
  const bbox = { minX: 80, minY: 42, maxX: 113, maxY: 60, width: 34, height: 19 };
  assert.equal(render(describeResult({ diffCount: 121, total: 80000, bbox })),
    "差分あり: 121 / 80,000 ピクセル（0.15%）\n差分の範囲: x 80〜113, y 42〜60（34×19 ピクセル）");
  assert.equal(render(describeResult({ diffCount: 1, total: 1000000 })),
    "差分あり: 1 / 1,000,000 ピクセル（0.01%未満）");
});

test("i18n: 子要素を持つ要素に data-i18n を付けていない", () => {
  // 閉じタグ内の改行に備えて </\1\s*> にする。緩めると次の同名タグまでマッチが伸びる。
  for (const match of html.matchAll(/<(\w+)[^>]*\sdata-i18n="[^"]+"[^>]*>([\s\S]*?)<\/\1\s*>/g)) {
    assert.doesNotMatch(match[2], /</, match[1] + " の中身に要素がある: " + match[2].slice(0, 40));
  }
});

test("i18n: HTMLのフォールバック文言が ja 辞書と一致する", () => {
  // JSが動かないときに出るのは初期テキスト。ずれていると「JSを切ると別の文言」になる。
  const pairs = [...html.matchAll(/data-i18n="([\w.]+)"[^>]*>([^<]*)</g)];
  assert.ok(pairs.length >= 45, "data-i18n の本文が少なすぎる: " + pairs.length);
  const mismatch = pairs.filter(([, key, text]) => I18n.ja[key] !== text).map(([, key]) => key);
  assert.deepEqual(mismatch, []);
});

test("i18n: 本文に残る和文は noscript と状態で変わる aria-label だけ", () => {
  const body = html.slice(html.indexOf("<body>")).replace(/<!--[\s\S]*?-->/g, "");
  const left = body.split(/\r?\n/).filter(line => japanese.test(line) && !/data-i18n/.test(line));
  assert.deepEqual(left.map(line => line.trim()), [
    "<noscript>このツールを使うには、ブラウザーのJavaScriptを有効にしてください。 / " +
      "To use this tool, enable JavaScript in your browser.</noscript>",
    '<canvas id="diffCanvas" role="img" aria-label="差分の画像。まだ比較していません"'
  ]);
});

test("i18n: 和文を含む meta は data-i18n-content を持つ", () => {
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(match => match[0]);
  assert.ok(metas.length >= 14, "meta が少なすぎる: " + metas.length);
  for (const meta of metas.filter(tag => japanese.test(tag))) {
    assert.match(meta, /data-i18n-content="[^"]+"/, meta.slice(0, 60));
  }
  for (const name of ["description", "keywords", "og:title", "og:description", "og:site_name",
    "twitter:title", "twitter:description"]) {
    assert.ok(metas.some(tag => tag.includes('"' + name + '"') && tag.includes("data-i18n-content")), name);
  }
  // title だけは要素なので data-i18n では置き換えず、apply() が document.title を書く
  assert.match(html, /<title>ImageDiffSec - 2画像のピクセル差分検出ツール<\/title>/);
  assert.match(read("js/i18n.js"), /document\.title = t\('app\.title'\)/);
});

test("i18n: 純ロジックの文字列に和文が残っていない", () => {
  // 注記（日本語コメント）は残す。文字列リテラルだけを見る。
  for (const name of ["js/core/pixel-diff.js", "js/core/template-match.js", "js/core/hash.js"]) {
    const source = read(name);
    const literals = [...source.matchAll(/"[^"]*"|'[^']*'|`[^`]*`/g)].map(match => match[0]);
    assert.deepEqual(literals.filter(value => japanese.test(value)), [], name);
  }
});

test("i18n: 状態で変わるスロットと属性に data-i18n を付けない", () => {
  // apply() は無条件に上書きするので、結果が出ている状態で切り替えると巻き戻る
  for (const id of ["statusMessage", "errorMessage", "matchResult", "matchWarning", "diffRate",
    "hashResult", "canvas1Hash", "canvas2Hash", "canvas1Notice", "canvas2Notice", "toleranceValue"]) {
    assert.doesNotMatch(html, new RegExp('id="' + id + '"[^>]*data-i18n'), id);
  }
  assert.doesNotMatch(html, /id="diffCanvas"[^>]*data-i18n-aria-label/);
  assert.match(scripts["js/image-processor.js"], /diffCanvas\.setAttribute\("aria-label"/);
});

test("i18n: 言語を切り替えても表示中の状態を訳し直せる", () => {
  const main = scripts["js/main.js"];
  const processor = scripts["js/image-processor.js"];
  assert.match(main, /languagechange["']\s*,\s*\(\)\s*=>\s*\{\s*window\.UIController\.renderMessage\(\);/);
  assert.match(main, /window\.ImageProcessor\.renderTexts\(\);/);
  // 比較そのものはやり直さない。保持した { key, params } を描き直すだけ
  assert.doesNotMatch(processor, /languagechange/);
  assert.match(processor, /function renderTexts\(\)/);
  assert.match(processor, /key: "notice\.downscaled"/);
  assert.match(processor, /window\.I18n\.t\("match\.overlay", matchState\.params\)/);
  assert.match(processor, /matchState\.lowScore \? window\.I18n\.t\("match\.lowScore"\)/);
  assert.match(processor, /hashMessage\.key = hash1 === hash2 \? "hash\.same" : "hash\.different"/);
  // 差し込み値には生のキーを入れ、描画の直前に訳す
  assert.match(processor, /params\.rate = window\.I18n\.t\(parts\.summary\.rate\.key/);
});

test("i18n: 状態の判定を表示中の文言で行っていない", () => {
  for (const [name, source] of Object.entries(scripts)) {
    assert.doesNotMatch(source, /textContent\s*===|textContent\.includes/, name);
  }
  assert.match(scripts["js/image-processor.js"], /matchConfidence\(match\.score\) === "low"/);
  assert.match(scripts["js/image-processor.js"], /if \(!resultState\)/);
});

test("i18n: 言語の保存は i18n.js だけが行う", () => {
  const i18n = read("js/i18n.js");
  assert.match(i18n, /localStorage\.setItem\(STORAGE_KEY, value\)/);
  assert.match(i18n, /image-diff-sec-language/);
  for (const [name, source] of Object.entries(scripts)) {
    assert.doesNotMatch(source, /image-diff-sec-language/, name);
  }
  // テーマの保存は従来どおり ui-controller.js が持つ
  assert.match(scripts["js/ui-controller.js"], /localStorage\.setItem\('darkMode'/);
});

test("i18n: i18n.js を他のスクリプトより先に読み込む", () => {
  const order = ["js/i18n.js", "js/core/pixel-diff.js", "js/core/template-match.js", "js/core/hash.js",
    "js/image-processor.js", "js/ui-controller.js", "js/main.js"]
    .map(src => html.indexOf('<script src="' + src + '"'));
  assert.deepEqual(order.filter(index => index < 0), []);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("i18n: 切り替えボタンの id は langToggle", () => {
  assert.match(html, /id="langToggle"[^>]*data-i18n="app\.langButton"/);
  assert.match(scripts["js/ui-controller.js"], /getElementById\("langToggle"\)/);
  assert.match(scripts["js/main.js"], /window\.I18n\.init\(\)/);
});

test("i18n: 規格上の識別子は訳さない", () => {
  // 画像フォーマット名・SHA-256・RGBAは固有名詞。日英どちらの辞書でもそのまま出す
  for (const dict of [I18n.ja, I18n.en]) {
    assert.match(dict["error.unsupportedType"], /PNG/);
    assert.match(dict["error.unsupportedType"], /JPEG/);
    assert.match(dict["error.unsupportedType"], /GIF/);
    assert.match(dict["error.unsupportedType"], /WebP/);
    assert.ok(dict["hash.prefix"].startsWith("SHA-256: "), "hash.prefix");
    assert.match(dict["upload.copyHash"], /SHA-256/);
  }
  assert.match(read("js/core/pixel-diff.js"), /new RangeError\("size mismatch"\)/);
  assert.match(read("js/core/template-match.js"), /"no-containment"/);
});

test("i18n: ラベルと説明の区切りが日英でそろっている", () => {
  // 和文は「：」で区切りが見えるが、英語では詰まる。3項目とも同じ形にする
  for (const key of ["help.securityQrDesc", "help.securityDocDesc", "help.securityPhishDesc"]) {
    assert.ok(I18n.ja[key].startsWith("："), "ja " + key);
    assert.ok(I18n.en[key].startsWith(": "), "en " + key);
  }
  // 英語は文の連結に空白が要る。辞書の値の側に持たせる
  assert.ok(I18n.en["diff.tolerance"].startsWith(" "), "en diff.tolerance");
  assert.ok(!I18n.ja["diff.tolerance"].startsWith(" "), "ja diff.tolerance");
});

test("i18n: README に言語リンクがあり、英語版が存在する", () => {
  const readme = read("README.md");
  const english = read("README.en.md");
  assert.match(readme, /^\[English\]\(README\.en\.md\) · 日本語$/m);
  assert.match(english, /^English · \[日本語\]\(README\.md\)$/m);
  // YAMLのHTMLコメントはファイル先頭のままにする
  assert.match(readme, /^<!--\r?\n---\r?\n/);
  for (const name of ["js/i18n.js", "README.en.md", "i18n.test.js"]) {
    assert.ok(readme.includes(name.split("/").pop()), name);
  }
  assert.match(english, /i18n\.js/);
});

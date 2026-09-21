const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const root = join(__dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");

test("G-7: CSP・メタ情報・classic script・インライン属性なし", () => {
  const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
  assert.equal(csp, "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; " +
    "connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'");
  assert.doesNotMatch(csp, /frame-ancestors|unsafe-inline|unsafe-eval/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<noscript>[^<]+<\/noscript>/);
  assert.doesNotMatch(html, /\s(?:on\w+|style)\s*=/i);
  assert.doesNotMatch(html, /<script[^>]*type=["']module["']/i);
  for (const tag of html.matchAll(/<script\s+src="([^"]+)"/g)) assert.ok(existsSync(join(root, tag[1])));
  assert.match(html, /<link rel="icon" href="assets\/favicon.svg" type="image\/svg\+xml">/);
  assert.ok(existsSync(join(root, "assets/favicon.svg")));
});

test("G-7: 主要ID・ARIA・入力形式", () => {
  for (const id of ["image1", "image2", "canvas1", "canvas2", "diffCanvas", "compareButton", "tolerance", "saveDiff", "helpModal"]) {
    assert.equal([...html.matchAll(new RegExp('id="' + id + '"', 'g'))].length, 1, id);
  }
  assert.match(html, /id="helpModal"[^>]+role="dialog"[^>]+aria-modal="true"[^>]+aria-labelledby="helpTitle"[^>]+hidden/);
  assert.match(html, /<button[^>]+id="modalClose"[^>]+aria-label="ヘルプを閉じる"/);
  assert.match(html, /id="diffCanvas"[^>]+role="img"[^>]+aria-label=/);
  assert.equal([...html.matchAll(/accept="image\/png,image\/jpeg,image\/gif,image\/webp"/g)].length, 2);
  assert.match(html, /id="statusMessage"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html, /id="errorMessage"[^>]+role="alert"/);
  assert.match(html, /id="clear1"[^>]+aria-label="画像1をクリア"/);
  assert.match(html, /id="clear2"[^>]+aria-label="画像2をクリア"/);
});

test("G-7: 全HTMLで外部リソースの読み込みなし", () => {
  for (const name of ["index.html", "test-tools/qr-test-generator.html", "test-tools/simple-test-generator.html"]) {
    const page = readFileSync(join(root, name), "utf8");
    assert.doesNotMatch(page, /<(?:script|img|link)\b[^>]*(?:src|href)=["'](?:https?:)?\/\//i, name);
    assert.match(page, /<meta name="referrer" content="no-referrer">/);
  }
  assert.match(readFileSync(join(root, "test-tools/qr-test-generator.html"), "utf8"),
    /src="\.\.\/vendor\/qrcode-generator\/qrcode.min.js"/);
});

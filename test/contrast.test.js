const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const css = readFileSync(join(__dirname, "../style.css"), "utf8");

function luminance(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

const pairs = [
  ["text", "page-bg"], ["text", "panel-bg"], ["header-text", "header-bg"],
  ["footer-link", "header-bg"], ["footer-link-hover", "header-bg"], ["drop-text", "drop-bg"],
  ["button-text", "file-bg"], ["button-text", "file-hover"],
  ["button-text", "clear-bg"], ["button-text", "clear-hover"],
  ["button-text", "compare-bg"], ["button-text", "compare-hover"],
  ["result-text", "panel-bg"], ["link", "modal-bg"], ["modal-heading", "modal-bg"],
  ["modal-close", "modal-header"], ["modal-close-hover", "modal-header"]
];
for (const selector of [":root", "body.dark-mode"]) {
  test("F-2〜F-4: " + selector + "の文字コントラスト", () => {
    const body = css.slice(css.indexOf(selector)).match(/\{([^}]+)\}/)[1];
    const variables = Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(m => [m[1], m[2]]));
    assert.equal(Object.keys(variables).length, 27, "不透明な6桁RGB変数の読取り件数");
    assert.equal(variables["button-text"], selector === ":root" ? "#ffffff" : "#0d1117");
    for (const [text, surface] of pairs) {
      assert.ok(variables[text] && variables[surface], text + "/" + surface);
      const a = luminance(variables[text]), b = luminance(variables[surface]);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert.ok(ratio >= 4.5, `${text}/${surface}: ${ratio.toFixed(3)}`);
    }
  });
}

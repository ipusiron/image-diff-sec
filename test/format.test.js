const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const root = join(__dirname, "..");

function filesAt(directory) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
    if ([".git", ".claude", "vendor", "test-tools"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesAt(path) : [path];
  });
}

test("G-9: 行長と読みやすいファイル構造", () => {
  for (const name of filesAt("")) {
    if (!/\.(?:js|css)$/.test(name) && name !== "index.html") continue;
    const limit = name === "index.html" ? 250 : 160;
    const lines = readFileSync(join(root, name), "utf8").split(/\r?\n/);
    lines.forEach((line, i) => assert.ok(line.length <= limit, `${name}:${i + 1}: ${line.length} > ${limit}`));
  }
  for (const [name, minimum] of [
    ["js/image-processor.js", 180], ["js/ui-controller.js", 80], ["js/main.js", 20],
    ["js/core/pixel-diff.js", 60], ["js/core/template-match.js", 100], ["style.css", 300], ["index.html", 100]
  ]) assert.ok(readFileSync(join(root, name), "utf8").split("\n").length >= minimum, name);
});

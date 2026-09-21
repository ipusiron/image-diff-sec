const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const { createHash } = require("node:crypto");
const root = join(__dirname, "..");
const read = name => readFileSync(join(root, name), "utf8");

test("G-10: coreの純粋性と条件付きCommonJS", () => {
  const files = readdirSync(join(root, "js/core"));
  assert.deepEqual(files.sort(), ["hash.js", "pixel-diff.js", "template-match.js"]);
  for (const name of files) {
    const code = read("js/core/" + name);
    assert.doesNotMatch(code, /\b(?:document|window|localStorage|navigator|console)\b/);
    assert.match(code, /if \(typeof module !== "undefined" && module\.exports\) \{\s*module\.exports = \{[^}]+\};\s*\}\s*$/);
    assert.doesNotMatch(code, /\bexport\s/);
  }
});

test("G-10: アプリJSにログ・alert・Worker・旧イベント設定なし", () => {
  function check(directory) {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) check(path);
      else if (path.endsWith(".js")) {
        assert.doesNotMatch(read(path), /console\.|\balert\s*\(|new\s+Worker\b|window\.(?:onload|clearImage)\s*=/, path);
      }
    }
  }
  check("js");
  assert.doesNotMatch(read("js/image-processor.js"), /function loadImage\b/);
  assert.match(read("js/main.js"), /addEventListener\("DOMContentLoaded"/);
});

test("G-10: 依存なしのNode 22 CI、削除対象とignore", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.test, "node --test");
  for (const name of ["type", "dependencies", "devDependencies"]) assert.ok(!(name in pkg));
  const workflow = read(".github/workflows/test.yml");
  assert.match(workflow, /\bpush\b/);
  assert.match(workflow, /\bpull_request\b/);
  assert.match(workflow, /node-version:\s*["']?22/);
  assert.match(workflow, /run:\s*npm test/);
  assert.doesNotMatch(read(".gitignore"), /\.github\/workflows/);
  for (const path of ["server.log", "analysis-report.md", "js/image-processor-fixed.js"]) assert.ok(!existsSync(join(root, path)));
});

test("G-10: 同梱配布物を改変していない", () => {
  for (const [name, size, hash] of [
    ["qrcode.min.js", 20387, "164fc2c1c9eaf0a03aa8dfdb855e82e41a5c6922fbad8bb3238116207e26bef7"],
    ["LICENSE", 1071, "3a850fa5f08101db6f40676c2786e10bd2cd5fff7b12ffdf1e0c434d4e49d90c"]
  ]) {
    const bytes = readFileSync(join(root, "vendor/qrcode-generator", name));
    assert.equal(bytes.length, size);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
  }
});

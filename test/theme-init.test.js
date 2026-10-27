const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const read = name => readFileSync(join(__dirname, "..", name), "utf8");

// theme-init.js を、保存値と OS 設定を差し替えた仮の window で動かし、dark-mode が付くかを返す。
function run({ saved = null, prefersDark = false, storageThrows = false } = {}) {
  const classes = new Set();
  const window = {
    localStorage: { getItem: () => { if (storageThrows) throw new Error("blocked"); return saved; } },
    matchMedia: () => ({ matches: prefersDark }),
    document: { documentElement: { classList: { add: name => classes.add(name) } } }
  };
  vm.runInNewContext(read("js/theme-init.js"), { window });
  return classes.has("dark-mode");
}

test("theme-init: 保存値がなければ OS の設定に従う", () => {
  assert.equal(run({ prefersDark: true }), true);
  assert.equal(run({ prefersDark: false }), false);
});

test("theme-init: 保存値は OS の設定より優先する", () => {
  assert.equal(run({ saved: "false", prefersDark: true }), false);
  assert.equal(run({ saved: "true", prefersDark: false }), true);
});

test("theme-init: 想定外の保存値は無視して OS の設定に従う", () => {
  assert.equal(run({ saved: "dark", prefersDark: true }), true);
  assert.equal(run({ saved: "dark", prefersDark: false }), false);
});

test("theme-init: localStorage が使えなくても落ちず、OS の設定に従う", () => {
  assert.equal(run({ storageThrows: true, prefersDark: true }), true);
  assert.equal(run({ storageThrows: true, prefersDark: false }), false);
});

test("theme-init: index.html の <head> で、stylesheet のあとに同期で読み込む", () => {
  const html = read("index.html");
  const head = html.slice(0, html.indexOf("</head>"));
  assert.ok(head.includes('<script src="js/theme-init.js"></script>'), "<head> に theme-init.js がない");
  assert.ok(head.indexOf("style.css") < head.indexOf("js/theme-init.js"));
});

test("theme-init: ダークの CSS と JS は <html> のクラスを見る", () => {
  const css = read("style.css");
  assert.doesNotMatch(css, /body\.dark-mode/);
  assert.match(css, /^html\.dark-mode body \{/m);
  const controller = read("js/ui-controller.js");
  assert.doesNotMatch(controller, /body\.classList/);
  assert.doesNotMatch(controller, /prefers-color-scheme/);
  assert.match(controller, /document\.documentElement/);
});

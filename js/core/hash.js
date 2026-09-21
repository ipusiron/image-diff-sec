// SHA-256の計算結果を小文字の16進表記にする。
function toHex(arrayBuffer) {
  return Array.from(new Uint8Array(arrayBuffer), byte => byte.toString(16).padStart(2, "0")).join("");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { toHex };
}

/**
 * theme-init - 最初の描画の前にテーマを決める。<head> で同期読み込みする。
 *
 * style.css の既定はライトで、ダークは <html> の dark-mode クラスで切り替える。
 * この判定を </body> 直前の ui-controller.js（DOMContentLoaded）で行うと、
 * ライトで描いたあとにダークへ切り替わって見える。
 *
 * 保存した選択（localStorage の darkMode）が "true" ならダーク、"false" ならライト。
 * なければ（想定外の値も）OS の設定に従う。localStorage が読めない環境でも落ちないよう try/catch で囲む。
 */
(function (global) {
  'use strict';

  var saved = null;
  try { saved = global.localStorage.getItem('darkMode'); } catch (e) { /* 使えない環境でも続行 */ }

  var prefersDark = !!(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
  var dark = (saved === 'true' || saved === 'false') ? saved === 'true' : prefersDark;

  if (dark) global.document.documentElement.classList.add('dark-mode');
})(typeof window !== 'undefined' ? window : globalThis);

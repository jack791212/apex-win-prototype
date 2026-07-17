/*
 * Apex Win｜共用遊戲設定 HL.gset（DEBT S1）
 * 跨遊戲持久化的玩家偏好（對標 Stake 遊戲齒輪慣例：設定一次、所有遊戲生效）：
 *  - fast    極速模式：跳過結果動畫（HL.instant.animate 歸零 + 自動下注縮短間隔）
 *  - anim    介面動效：off → <html> 掛 .ax-anim-off（與 prefers-reduced-motion 同套 kill-switch）
 *  - hotkeys 鍵盤熱鍵：Space 下注 · S 加倍 · A 減半 · D 最小注（instant.js 讀取）
 *  - fiatView 金額顯示幣別（S10 display-in-fiat）：""=原生 NT$；設幣別代碼時 HL.dom.money
 *              以 mock 示意匯率換算「顯示」（僅顯示層，結算仍以遊戲幣計）
 * 尚無音效層，刻意不設音效開關（避免死 flag）；音效系統落地時再加。
 * 註冊於 window.HL.gset。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var KEY = "ax:gset";
  var DEF = { fast: false, anim: true, hotkeys: false, fiatView: "" };
  var cache = null;

  function load() {
    if (cache) return cache;
    cache = Object.assign({}, DEF);
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      Object.keys(DEF).forEach(function (k) { if (typeof raw[k] === typeof DEF[k]) cache[k] = raw[k]; });
    } catch (_) {}
    return cache;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (_) {} }
  function get(k) { return load()[k]; }
  function set(k, v) {
    if (!(k in DEF)) return;
    load()[k] = (typeof DEF[k] === "boolean") ? !!v : String(v == null ? "" : v);
    save(); applyClass();
  }
  function toggle(k) { set(k, !get(k)); return get(k); }
  // 動效 off → 全站 kill-switch class（規則見 components.css 的 .ax-anim-off，與 reduced-motion 同款）
  function applyClass() {
    document.documentElement.classList.toggle("ax-anim-off", !get("anim"));
  }
  applyClass();

  HL.gset = { get: get, set: set, toggle: toggle, applyClass: applyClass };
})(window);

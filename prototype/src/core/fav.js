/*
 * Apex Win｜我的最愛（收藏）
 * 純前端、localStorage 持久化（Demo 狀態只在記憶體，收藏需自存才會跨重整保留）。
 * 提供 has/toggle/list/count 與一個共用的收藏按鈕 button()。註冊於 window.HL.fav。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var KEY = "HL_FAV";

  function load() { try { return JSON.parse(global.localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } }
  function save() { try { global.localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {} }
  var ids = load();

  function has(id) { return ids.indexOf(id) >= 0; }
  function toggle(id) {
    var i = ids.indexOf(id);
    if (i >= 0) ids.splice(i, 1); else ids.unshift(id);
    save();
    return has(id);
  }
  function list() { return ids.slice(); }
  function count() { return ids.length; }

  // 共用收藏按鈕：愛心狀態 + 切換 + toast；onChange(on) 供呼叫端在「我的最愛」分頁時重繪
  function button(id, favCount, onChange) {
    var el = HL.dom.el;
    var sym = el("span", { text: has(id) ? "♥ " : "♡ " });
    var b = el("button", { class: "ax-game__fav" + (has(id) ? " is-faved" : ""), title: "我的最愛", onClick: function (e) {
      e.stopPropagation();
      var on = toggle(id);
      b.classList.toggle("is-faved", on);
      sym.textContent = on ? "♥ " : "♡ ";
      if (HL.ui) HL.ui.toast(on ? "已加入我的最愛" : "已移除最愛", "ok");
      if (onChange) onChange(on);
    } }, [sym, el("span", { text: String(favCount || 0) })]);
    return b;
  }

  HL.fav = { has: has, toggle: toggle, list: list, count: count, button: button };
})(window);

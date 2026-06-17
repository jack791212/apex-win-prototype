/*
 * ApexWin Game Dev Kit｜輕量 HL 模擬器
 * 目的：讓一個遊戲 game.js 在「不需要整包 ApexWin 平台」的情況下也能獨立開發測試。
 * 提供與正式平台「同名同行為」的最小 API：HL.dom / HL.ui / HL.state / HL.shell /
 *   HL.gameFrame / HL.games / HL.ticker / HL.mock / HL.money / HL.router。
 * 在 Dev Kit 測好的 game.js，原封不動丟回平台 games/<暱稱>/<代號>/ 就能用。
 * 注意：這只是「夠用的模擬」，最終以正式平台行為為準。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  /* ---------- HL.dom（與平台 src/core/dom.js 同行為）---------- */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var v = props[key];
      if (v == null) return;
      if (key === "class") node.className = v;
      else if (key === "text") node.textContent = v;
      else if (key === "html") node.innerHTML = v;
      else if (key === "onClick") node.addEventListener("click", v);
      else if (key === "onInput") node.addEventListener("input", v);
      else if (key === "style") node.setAttribute("style", v);
      else node.setAttribute(key, v);
    });
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }
  function money(n) { return "NT$ " + Math.round(n).toLocaleString("en-US"); }
  HL.dom = { el: el, clear: clear, money: money };

  /* ---------- HL.ui（與平台 src/core/ui.js 同行為）---------- */
  function toast(message, type) {
    var box = document.getElementById("ax-toasts");
    if (!box) { box = el("div", { id: "ax-toasts", class: "ax-toasts" }); document.body.appendChild(box); }
    var t = el("div", { class: "ax-toast " + (type || "ok"), text: message });
    box.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 200); }, 2200);
  }
  function modal(title, bodyNodes, opts) {
    opts = opts || {};
    var mask = el("div", { class: "ax-modal-mask" });
    function close() { if (mask.parentNode) mask.parentNode.removeChild(mask); }
    mask.addEventListener("click", function (e) { if (e.target === mask) close(); });
    var body = el("div", { class: "ax-modal__body" });
    (Array.isArray(bodyNodes) ? bodyNodes : [bodyNodes]).forEach(function (n) {
      if (n == null) return;
      body.appendChild(typeof n === "string" ? el("p", { text: n }) : n);
    });
    var box = el("div", { class: "ax-modal" + (opts.wide ? " ax-modal--wide" : "") }, [
      el("div", { class: "ax-modal__head" }, [el("h3", { text: title }), el("button", { class: "ax-modal__close", text: "×", onClick: close })]),
      body
    ]);
    mask.appendChild(box); document.body.appendChild(mask);
    return { close: close, body: body };
  }
  function comingSoon(name) { modal(name || "功能建構中", [el("p", { text: "此功能在 Demo 中為示意。" }), el("span", { class: "ax-demo-tag", text: "Demo · 建構中" })]); }
  HL.ui = { toast: toast, modal: modal, comingSoon: comingSoon };

  /* ---------- HL.state（最小：含 balance）---------- */
  var INITIAL_BALANCE = 28560;
  var store = { balance: INITIAL_BALANCE, currency: "TWD", moneyMode: "casual" };
  HL.state = {
    get: function () { return store; },
    set: function (patch) { if (patch) Object.keys(patch).forEach(function (k) { store[k] = patch[k]; }); return store; }
  };

  /* ---------- HL.shell（更新頂部餘額顯示）---------- */
  HL.shell = { refreshChrome: function () { var b = document.getElementById("dk-bal"); if (b) b.textContent = money(store.balance); } };

  /* ---------- HL.gameFrame（簡化外框：只給標題列 + 舞台）---------- */
  HL.gameFrame = {
    wrap: function (node, meta) {
      meta = meta || {};
      return el("div", { class: "dk-gframe" }, [
        el("div", { class: "dk-gstage" }, [node]),
        el("div", { class: "dk-gfbar" }, [el("small", { class: "ax-muted", text: (meta.title || "遊戲") + (meta.provider ? " · " + meta.provider : "") + "　(Dev Kit 外框預覽)" })])
      ]);
    },
    isPipActive: function () { return false; }, resumeFrame: function () { return null; }, restorePip: function () {}
  };

  /* ---------- HL.ticker（每秒觸發，給動畫/倒數用）---------- */
  var tickFns = [], tickTimer = null;
  HL.ticker = {
    add: function (fn) { tickFns.push(fn); if (!tickTimer) tickTimer = setInterval(function () { tickFns.slice().forEach(function (f) { try { f(); } catch (e) {} }); }, 1000); return fn; },
    remove: function (fn) { var i = tickFns.indexOf(fn); if (i >= 0) tickFns.splice(i, 1); },
    clearAll: function () { tickFns = []; }
  };

  /* ---------- HL.mock（隨機小工具，部分遊戲會用）---------- */
  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  HL.mock = { rint: rint, pick: pick, fakeNames: ["Leo", "Mina", "Jack", "Aria", "Neo", "Zoe", "Max", "Luna", "Kai", "Ivy"] };

  /* ---------- HL.money（金流模式：Dev Kit 固定休閒）---------- */
  HL.money = {
    coinName: function () { return "遊戲幣"; }, isCasual: function () { return true; }, isReal: function () { return false; },
    mode: function () { return "casual"; }, modeLabel: function () { return "休閒模式 · 遊戲幣"; }, currencies: function () { return ["COIN"]; }
  };

  /* ---------- HL.games（登錄表：收集註冊，交給 Dev Kit 渲染）---------- */
  var list = [], byId = {};
  HL.games = {
    register: function (meta) {
      if (!meta || !meta.id) { console.warn("[Dev Kit] register 缺少 id"); return meta; }
      if (byId[meta.id]) { var i = list.indexOf(byId[meta.id]); if (i >= 0) list[i] = meta; } else list.push(meta);
      byId[meta.id] = meta; return meta;
    },
    byId: function (id) { return byId[id] || null; },
    all: function () { return list.slice(); },
    launch: function (g) { mount(g); },
    title: function (g) { return g ? g.title : ""; }
  };

  /* ---------- HL.router（Dev Kit 不切頁，重新渲染當前遊戲）---------- */
  HL.router = { go: function () {}, goGame: function (id) { mount(byId[id]); } };

  /* ---------- Dev Kit 掛載 ---------- */
  function initControls() {
    var reset = document.getElementById("dk-reset");
    if (reset && !reset._wired) { reset._wired = true; reset.addEventListener("click", function () { store.balance = INITIAL_BALANCE; HL.shell.refreshChrome(); toast("餘額已重設", "ok"); }); }
    var reload = document.getElementById("dk-reload");
    if (reload && !reload._wired) { reload._wired = true; reload.addEventListener("click", function () { global.location.reload(); }); }
  }
  function mount(g) {
    initControls();
    HL.shell.refreshChrome();
    var stage = document.getElementById("ax-stage"); if (!stage) return;
    g = g || list[list.length - 1]; // 預設渲染最後註冊的遊戲
    clear(stage);
    if (!g) { stage.appendChild(el("p", { class: "ax-muted", text: "game.js 沒有註冊任何遊戲——請確認有呼叫 HL.games.register({...})。" })); return; }
    if (typeof g.render !== "function") { stage.appendChild(el("p", { class: "ax-muted", text: "遊戲「" + (g.title || g.id) + "」沒有 render() 函式。" })); return; }
    try { stage.appendChild(g.render()); }
    catch (e) { stage.appendChild(el("pre", { class: "dk-err", text: "render() 發生錯誤：\n" + (e && e.stack || e) })); }
  }
  HL.__devkit = { mount: mount };
})(window);

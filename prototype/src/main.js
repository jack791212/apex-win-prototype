/*
 * Apex Win｜進入點
 * 負責：每秒 ticker、view router、環境即時動態、首次掛載。
 */
(function (global) {
  "use strict";
  var HL = global.HL;

  // ---- 每秒 ticker（倒數、動態演繹共用；切換畫面時清空） ----
  var tickFns = [];
  HL.ticker = {
    add: function (fn) { tickFns.push(fn); return fn; },
    remove: function (fn) { tickFns = tickFns.filter(function (f) { return f !== fn; }); },
    clearAll: function () { tickFns = []; }
  };
  setInterval(function () {
    tickFns.slice().forEach(function (f) { try { f(); } catch (e) { /* 單一 tick 失敗不影響其他 */ } });
  }, 1000);

  // ---- 環境即時動態：依活躍度定期新增假 Feed ----
  function ambientFeed() {
    var count = 0;
    HL.ticker.add(function () {
      count++;
      var act = HL.state.get().demo.activity;
      var every = act === "high" ? 2 : act === "low" ? 8 : 5;
      if (count % every !== 0) return;
      var ev = HL.mock.makeFeedEvent();
      var feed = HL.state.get().feed.slice();
      feed.unshift({ txt: ev.txt, type: ev.type });
      if (feed.length > 12) feed = feed.slice(0, 12);
      HL.state.set({ feed: feed });
    });
  }

  // ---- Router ----
  HL.router = {
    go: function (view, arg) {
      HL.ticker.clearAll();
      // 清掉殘留的 Modal 遮罩（避免換頁後仍蓋著）
      Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m) { if (m.parentNode) m.parentNode.removeChild(m); });
      HL.state.set({ view: view, activePoolId: arg || null });
      renderApp();
    }
  };

  function renderApp() {
    var root = document.getElementById("app");
    HL.dom.clear(root);
    root.appendChild(HL.shell.render());

    var s = HL.state.get();
    var viewNode;
    if (s.view === "duel") viewNode = HL.views.duel.render(s.activePoolId);
    else if (s.view === "globe") viewNode = HL.views.globe.render();
    else if (s.view === "casino") viewNode = HL.views.casino.render();
    else if (s.view === "arena") viewNode = HL.views.arena.render();
    else if (s.view === "bounty") viewNode = HL.views.bounty.render(s.activePoolId);
    else if (s.view === "vsslot") viewNode = HL.views.vsslot.render(s.activePoolId);
    else viewNode = HL.views.lobby.render();
    HL.shell.mountView(viewNode);

    ambientFeed();
  }

  function boot() {
    document.documentElement.setAttribute("data-theme", HL.state.get().theme);
    var root = document.getElementById("app");
    root.setAttribute("aria-busy", "false");
    renderApp();
    // 浮動視窗：建立並預設開啟「你的專屬夥伴」（蓋在大廳上，不影響排版）
    HL.panels.ensureBuilt();
    if (HL.state.get().aiOpen) HL.panels.openAi();
    // 競技場背景模擬：假玩家挑戰我的房間、結束自動結算（離頁也持續）
    setInterval(function () { if (HL.arenaSim) HL.arenaSim.tick(); }, 1000);
    if (global.console) {
      console.log("[Apex Win] Prototype 已啟動 · Demo 模式 · 平台:Apex Win · 玩法:對押池(競技場)");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);

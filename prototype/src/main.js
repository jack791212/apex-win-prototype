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
  var GAME_VIEWS = { duel: 1, bounty: 1, vsslot: 1, slot: 1, chicken: 1, game: 1, liveroom: 1 }; // 遊戲/直播頁：其上不補顯示房間結算
  // 公版「返回娛樂城」列要套在哪些遊戲頁（值＝返回目標）。新同仁/instant 遊戲走 view:"game"，自動繼承。
  var GAME_BACK = { slot: "casino", chicken: "casino", game: "casino" };
  function enterView(patch, view) {
    // 路由守衛：真會員模式未登入 → 一律踢回登入頁
    if (HL.auth && HL.auth.backend() && !HL.auth.user()) { renderAuthView(); return; }
    HL.ticker.clearAll();
    // 清掉殘留的 Modal 遮罩（避免換頁後仍蓋著）
    Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m) { if (m.parentNode) m.parentNode.removeChild(m); });
    HL.state.set(patch);
    renderApp();
    // 回到非遊戲頁（大廳/競技場…）時，補顯示挑戰期間排隊的「我的房間結算」
    if (!GAME_VIEWS[view] && HL.arenaSim && HL.arenaSim.flush) setTimeout(HL.arenaSim.flush, 300);
  }
  HL.router = {
    go: function (view, arg) { enterView({ view: view, activePoolId: arg || null, activeGameId: null }, view); },
    // 動態遊戲派發：登錄表中「自帶 render」的遊戲（同仁自製）→ 免在本檔新增 case
    goGame: function (gameId, arg) { enterView({ view: "game", activeGameId: gameId, activePoolId: arg || null }, "game"); }
  };

  function renderApp() {
    var root = document.getElementById("app");
    HL.dom.clear(root);
    root.appendChild(HL.shell.render());

    var s = HL.state.get();
    var viewNode;
    if (s.view === "globe") viewNode = HL.views.globe.render();
    else if (s.view === "liveroom") viewNode = HL.views.liveroom.render();
    else if (s.view === "casino") viewNode = HL.views.casino.render();
    else if (s.view === "slot") viewNode = HL.views.slot.render();
    else if (s.view === "arena") viewNode = HL.views.arena.render();
    else if (s.view === "bounty") viewNode = HL.views.bounty.render(s.activePoolId);
    else if (s.view === "vsslot") viewNode = HL.views.vsslot.render(s.activePoolId);
    else if (s.view === "chicken") viewNode = HL.views.chicken.render();
    else if (s.view === "game") viewNode = renderGameView(s);
    else viewNode = HL.views.lobby.render();
    HL.shell.mountView(viewNode, GAME_BACK[s.view] || null);

    ambientFeed();
  }

  // 動態遊戲：依登錄表派發。自帶 render() → 直接呼叫（同仁自製遊戲免改本檔）；否則退回對應既有 view
  function renderGameView(s) {
    var g = (HL.games && HL.games.byId) ? HL.games.byId(s.activeGameId) : null;
    if (g && typeof g.render === "function") return g.render(s.activePoolId);
    if (g && g.route && HL.views[g.route]) return HL.views[g.route].render(s.activePoolId);
    if (global.console) console.warn("[Apex Win] 找不到遊戲 render：", s.activeGameId);
    return HL.views.lobby.render();
  }

  // ---- Auth Gate（真會員模式才作用；Demo 模式直接 startApp） ----
  var arenaSimStarted = false, appShown = false;

  function splash() {
    return HL.dom.el("div", { class: "ax-splash" }, [
      HL.dom.el("div", { class: "ax-splash__mark", text: "A" }),
      HL.dom.el("div", { class: "ax-mm__spinner" }),
      HL.dom.el("div", { class: "ax-muted", text: "載入中…" })
    ]);
  }
  function showSplash() {
    var root = document.getElementById("app");
    root.setAttribute("aria-busy", "false");
    HL.dom.clear(root); root.appendChild(splash());
  }
  function renderAuthView() {
    appShown = false;
    if (HL.panels && HL.panels.closeAi) HL.panels.closeAi();
    if (HL.panels && HL.panels.closeChat) HL.panels.closeChat();
    if (HL.streamer && HL.streamer.close) HL.streamer.close();
    Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m) { if (m.parentNode) m.parentNode.removeChild(m); });
    HL.ticker.clearAll();
    var root = document.getElementById("app");
    root.setAttribute("aria-busy", "false");
    HL.dom.clear(root); root.appendChild(HL.views.auth.render());
  }
  function startApp() {
    document.documentElement.setAttribute("data-theme", HL.state.get().theme);
    document.getElementById("app").setAttribute("aria-busy", "false");
    renderApp();
    HL.panels.ensureBuilt();
    if (HL.state.get().aiOpen) HL.panels.openAi();
    if (!arenaSimStarted) { arenaSimStarted = true; setInterval(function () { if (HL.arenaSim) HL.arenaSim.tick(); }, 1000); }
  }
  function hydrateThenStart() {
    if (appShown) return; appShown = true;
    showSplash();
    Promise.all([HL.api.loadProfile(), HL.api.loadHistory(30)]).then(function (r) {
      var p = r[0] || {}, hist = r[1] || [], st = HL.state.get();
      var stats = Object.assign({ matches: 0, wins: 0, losses: 0, profit: 0, streak: 0, best: 0, bigWin: 0, hostNet: 0 }, p.arena_stats || {});
      stats.history = hist;
      HL.state.set({
        user: HL.auth.user(),
        profile: { display_name: p.display_name || HL.auth.displayName(), avatar: p.avatar || "👑" },
        balance: p.balance != null ? p.balance : st.balance,
        currency: p.currency || st.currency,
        wallet: p.wallet || st.wallet,
        arenaStats: stats,
        myEffectiveBet: p.wagered != null ? +p.wagered : st.myEffectiveBet // 全球獎進度 = 真累積有效押注
      });
      if (HL.persistence) HL.persistence.markSynced(); // 避免一登入就立刻多寫一次
      startApp();
    }).catch(function (e) { if (global.console) console.warn("[Apex Win] hydrate 失敗", e); startApp(); });
  }
  function onSession(session) { session ? hydrateThenStart() : renderAuthView(); }

  function boot() {
    if (!HL.auth || !HL.auth.backend()) { startApp(); if (global.console) console.log("[Apex Win] 已啟動 · Demo 訪客模式"); return; }
    showSplash();
    HL.auth.onChange(onSession);
    HL.auth.init(function (session) { onSession(session); });
    if (global.console) console.log("[Apex Win] 已啟動 · 真會員模式（Supabase）");
  }

  HL.app = { renderAuthView: renderAuthView, signOut: function () { if (HL.auth.backend()) HL.auth.signOut(); }, refresh: renderApp };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);

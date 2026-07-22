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
      if (HL.site && HL.site.isLive()) return; // 真站：無假環境動態 Feed（無假玩家加入/贏得/連勝）
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
  // 視圖登錄表：一處定義每個 view 的 render / 返回目標(backTo) / 是否遊戲頁(isGame，其上不補房間結算)。
  // 取代原本 renderApp 的 if/else 路由 + 兩份手動同步的 GAME_VIEWS / GAME_BACK。新增/改 view 只需改一列。
  var VIEWS = {
    lobby:      { render: function (s) { return HL.views.lobby.render(); } },
    globe:      { render: function (s) { return HL.views.globe.render(); } },
    casino:     { render: function (s) { return HL.views.casino.render(); } },
    arena:      { render: function (s) { return HL.views.arena.render(); } },
    tournament: { render: function (s) { return HL.views.tournament.render(); } },
    liveroom:   { render: function (s) { return HL.views.liveroom.render(); }, isGame: true },
    bounty:     { render: function (s) { return HL.views.bounty.render(s.activePoolId); }, isGame: true },
    vsslot:     { render: function (s) { return HL.views.vsslot.render(s.activePoolId); }, isGame: true },
    duel:       { render: function (s) { return HL.views.lobby.render(); }, isGame: true }, // 歷史保留：無專屬 view，僅標記「其上不補結算」
    slot:       { render: function (s) { return HL.views.slot.render(); }, isGame: true, backTo: "casino" },
    chicken:    { render: function (s) { return HL.views.chicken.render(); }, isGame: true, backTo: "casino" },
    game:       { render: function (s) { return renderGameView(s); }, isGame: true, backTo: "casino" }
  };
  function viewDef(view) { return VIEWS[view] || VIEWS.lobby; }

  function enterView(patch, view) {
    // 路由守衛：真會員模式未登入 → 一律踢回登入頁
    if (HL.auth && HL.auth.backend() && !HL.auth.user()) { renderAuthView(); return; }
    // 清掉殘留的 Modal 遮罩（避免換頁後仍蓋著）；ticker 由 renderApp 統一清（涵蓋 refresh 路徑）
    HL.ui.closeAll();
    HL.state.set(patch);
    renderApp();
    // 回到非遊戲頁（大廳/競技場…）時，補顯示挑戰期間排隊的「我的房間結算」
    if (!(VIEWS[view] && VIEWS[view].isGame) && HL.arenaSim && HL.arenaSim.flush) setTimeout(HL.arenaSim.flush, 300);
  }
  HL.router = {
    go: function (view, arg) { enterView({ view: view, activePoolId: arg || null, activeGameId: null }, view); },
    // 動態遊戲派發：登錄表中「自帶 render」的遊戲（同仁自製）→ 免在本檔新增 case
    goGame: function (gameId, arg) { enterView({ view: "game", activeGameId: gameId, activePoolId: arg || null }, "game"); }
  };

  function renderApp() {
    HL.ticker.clearAll(); // 每次全量重繪先清 ticker：涵蓋 HL.app.refresh（i18n 切語系/改資料/存檔）路徑，修 ticker 重複註冊洩漏
    var root = document.getElementById("app");
    HL.dom.clear(root);
    root.appendChild(HL.shell.render());

    var s = HL.state.get();
    var def = viewDef(s.view);
    HL.shell.mountView(def.render(s), def.backTo || null);
    if (HL.notify) HL.notify.refreshBadge(); // header 每次重繪後同步通知紅點
    if (HL.i18n && HL.i18n.apply) HL.i18n.apply(); // 每次重繪後同步在地化（非預設語系才作用）

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
    HL.ui.closeAll();
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
      // Phase 7：balance/wagered/arena_stats 由 loadProfile 依當前站別自 member_econ 取回（真站＝server 的 live 乾淨列）→ 直接採用，不再客端遮罩。
      HL.state.set({
        user: HL.auth.user(),
        profile: { display_name: p.display_name || HL.auth.displayName(), avatar: p.avatar || "👑" },
        balance: p.balance != null ? p.balance : st.balance,
        currency: p.currency || st.currency,
        wallet: p.wallet || st.wallet,
        arenaStats: stats,
        myEffectiveBet: p.wagered != null ? +p.wagered : st.myEffectiveBet // 全球獎進度 = 該站別累積有效押注
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

  // refresh（同頁重繪：i18n 切語系/改資料/存檔）保留主內容捲動位置與焦點（U6）；導覽(enterView→renderApp)不套用，換頁仍歸頂。
  function refresh() {
    var main = document.getElementById("ax-main-content");
    var sc = main ? main.scrollTop : 0;
    var ae = document.activeElement, aeId = (ae && ae.id) || null;
    renderApp();
    var m2 = document.getElementById("ax-main-content");
    if (m2 && sc) m2.scrollTop = sc;
    if (aeId) { var f = document.getElementById(aeId); if (f && f.focus) { try { f.focus(); } catch (e) {} } }
  }
  HL.app = { renderAuthView: renderAuthView, signOut: function () { if (HL.auth.backend()) HL.auth.signOut(); }, refresh: refresh };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);

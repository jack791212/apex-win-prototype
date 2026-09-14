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

  /* #181 每一個去處都要有地址。清單的唯一真相是上面的 VIEWS——**不另抄一張表**
     （抄了就會有人新增一個 view 而忘了回頭改它，那個去處從此沒有位址而畫面完全正常）。
     帶參數的兩個去處各自宣告 encode/decode；`arena` 的房號由 views/arena.js 自己註冊。 */
  if (HL.route) {
    Object.keys(VIEWS).forEach(function (v) { HL.route.register({ view: v }); });
    HL.route.register({
      view: "game",
      encode: function (s) { return (s && s.activeGameId) || ""; },
      /* 網址是外來輸入：指向不存在／已下架的遊戲時退回大廳，而不是停在一個空的遊戲頁上。 */
      decode: function (seg) {
        if (!seg) return null;
        var g = (HL.games && HL.games.byId) ? HL.games.byId(seg) : null;
        return g ? { activeGameId: seg } : null;
      }
    });
  }

  function enterView(patch, view, opts) {
    // 路由守衛：真會員模式未登入 → 一律踢回登入頁
    if (HL.auth && HL.auth.backend() && !HL.auth.user()) { renderAuthView(); return; }
    // 清掉殘留的 Modal 遮罩（避免換頁後仍蓋著）；ticker 由 renderApp 統一清（涵蓋 refresh 路徑）
    // #66：連 reveal 待播佇列一起清——否則關掉當前那則後，下一則會蓋在新頁面上（獎金早已入帳，只丟動畫）
    if (HL.reveal && HL.reveal.drain) HL.reveal.drain();
    HL.ui.closeAll();
    HL.state.set(patch);
    renderApp();
    /* #181：換頁之後把地址寫進 history。**從 popstate 回來的那一次不寫**——
       否則按一次返回會同時再 push 一筆，玩家就永遠退不出去。 */
    if (HL.route && !(opts && opts.fromPop)) HL.route.sync(HL.state.get());
    // 回到非遊戲頁（大廳/競技場…）時，補顯示挑戰期間排隊的「我的房間結算」
    if (!(VIEWS[view] && VIEWS[view].isGame) && HL.arenaSim && HL.arenaSim.flush) setTimeout(HL.arenaSim.flush, 300);
  }
  HL.router = {
    /* §5 #12：「玩家現在正在一個遊戲畫面裡嗎」的**單一真相**。
       VIEWS 的 isGame 是這個問題的唯一答案；`views/arena.js` 曾自己抄一份名單
       （`vsslot|bounty|duel|slot|game`），漏了 **liveroom 與 chicken** ⇒ 房間結算的模態
       會直接蓋在玩家正在看的直播房／正在玩的小雞過馬路上面，還會搶走焦點。 */
    isGameView: function (v) { var d = VIEWS[v || HL.state.get().view]; return !!(d && d.isGame); },
    go: function (view, arg) { enterView({ view: view, activePoolId: arg || null, activeGameId: null }, view); },
    // 動態遊戲派發：登錄表中「自帶 render」的遊戲（同仁自製）→ 免在本檔新增 case
    goGame: function (gameId, arg) { enterView({ view: "game", activeGameId: gameId, activePoolId: arg || null }, "game"); }
  };

  /* opts.rerender=true ＝同頁重繪（切語系/存檔）≠離場。離場鉤一律由 shell.mountView 開火
   * （它保證清理先於建構）；本檔不得自行 runExit——見鎖 games/arena/exit-hook-settles-escrow。 */
  function renderApp(opts) {
    HL.ticker.clearAll(); // 每次全量重繪先清 ticker：涵蓋 HL.app.refresh（i18n 切語系/改資料/存檔）路徑，修 ticker 重複註冊洩漏
    if (HL.instant && HL.instant.stopAll) HL.instant.stopAll(); // 同理清 autobet 迴圈（2026-08-20 家族 B：換頁不停＝背景繼續扣款）
    var root = document.getElementById("app");
    HL.dom.clear(root);
    root.appendChild(HL.shell.render());

    var s = HL.state.get();
    var def = viewDef(s.view);
    HL.shell.mountView(function () { return def.render(s); }, def.backTo || null, opts);
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
    if (HL.reveal && HL.reveal.drain) HL.reveal.drain();   // #66：登出同樣清待播佇列
    HL.ui.closeAll();
    HL.ticker.clearAll();
    if (HL.instant && HL.instant.stopAll) HL.instant.stopAll();
    // 登出/被踢回登入頁也是離場，且不經過 mountView ⇒ 少了這行＝對戰中被踢，賭注靜默沒收
    if (HL.shell && HL.shell.runExit) HL.shell.runExit("signed-out");
    var root = document.getElementById("app");
    root.setAttribute("aria-busy", "false");
    HL.dom.clear(root); root.appendChild(HL.views.auth.render());
  }
  /* #181 返回鍵／前進鍵。⚠️ 有在途承諾的 view 不得被重掛：對戰預扣是冪等的，
     讓 popstate 重掛等於把「同頁重繪＝免費重骰」那條 blocker 換一個入口重新開門
     （見 CLAUDE.md §4 離場鉤那一段）。被佔用時把地址寫回去，讓網址與畫面不要各說各話。 */
  var popWired = false;
  function wirePop() {
    if (popWired || !HL.route) return;
    popWired = true;
    global.addEventListener("popstate", function () {
      if (HL.shell && HL.shell.viewHeld && HL.shell.viewHeld()) { HL.route.sync(HL.state.get(), true); return; }
      var patch = HL.route.decode(global.location.hash);
      enterView(patch, patch.view, { fromPop: true });
    });
  }
  function startApp() {
    document.documentElement.setAttribute("data-theme", HL.state.get().theme);
    document.getElementById("app").setAttribute("aria-busy", "false");
    /* #181 開機先解析網址：分享出來的連結、以及裝成 App 之後的冷啟動都走這條。
       解不出來就是大廳（decode 對垃圾輸入 fail-safe），並用 replaceState 把位址補正，
       讓「網址列寫的」與「畫面上的」從第一秒起就一致。 */
    if (HL.route) {
      var entry = HL.route.decode(global.location.hash);
      if (entry.view && entry.view !== HL.state.get().view) HL.state.set(entry);
      else if (entry.activeGameId) HL.state.set(entry);
      wirePop();
    }
    renderApp();
    if (HL.route) HL.route.sync(HL.state.get(), true);
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
    // 有在途承諾的遊戲頁不得被重繪打斷（否則同一份注可重骰到贏）⇒ 只翻新 chrome 與在地化
    if (HL.shell && HL.shell.viewHeld && HL.shell.viewHeld()) {
      HL.shell.refreshChrome();
      if (HL.i18n && HL.i18n.apply) HL.i18n.apply();
      return;
    }
    var main = document.getElementById("ax-main-content");
    var sc = main ? main.scrollTop : 0;
    var ae = document.activeElement, aeId = (ae && ae.id) || null;
    renderApp({ rerender: true });   // 同頁重繪≠離場：不得結掉在途賭注（見 renderApp 註記）
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

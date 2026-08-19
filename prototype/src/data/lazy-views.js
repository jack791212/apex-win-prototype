/*
 * Apex Win｜整頁 view 延遲載入器（code-splitting 容器 · 非遊戲）  #110
 * ---------------------------------------------------------------------------
 * 為什麼存在（卡 #110／船長指令 M6·M8 首屏預算）：
 *   #80 的 `lazyGames` 只收「用 HL.games.register 上架、走 goGame 派發」的遊戲檔；
 *   但 src/views/ 還有一批**不是遊戲**的整頁 view：它們註冊的是 `HL.views.<id>`（路由表），
 *   `HL.games` 這條路碰不到它們 ⇒ #80 的容器對它們**在結構上不適用**（不是漏搬）。
 *   本檔＝同一形制的第二個容器（同一套心智模型、同一個注入原語 core/lazy-load.js），
 *   把它們改成「按下入口才抓檔」。首屏實測 1540KB → 1465KB（門檻 1600）。
 *
 * 清單一列一檔，兩種被延後的表面：
 *   views:   [{ id, methods? }] → 佔位進 HL.views[id]（render 必備；methods 是 render 以外
 *            會被別的檔同步呼叫的方法，例：liveroom.enter 被 global-prize 呼叫）
 *   globals: [{ ns, methods }]  → 佔位進 HL[ns]（例：HL.opsBoard.open 由 ⚙ DEMO 面板呼叫）
 *
 * 換手流程（與 #80 完全相同，刻意不另立一套）：
 *   1. 開機：每個 id 註冊 stub（render 同步回「載入中」占位節點）。
 *   2. 玩家點入口 → router.go(id) → renderApp 取到 stub → 占位節點上畫面 + 開始注入。
 *   3. view 檔載完 → 它自己那句 `HL.views.<id> = {...}` 覆蓋 stub（真 render 就位）。
 *   4. 玩家還停在同一個 view → HL.app.refresh() 重繪一次 → 真畫面出現。
 *   方法型（enter/open）沒有畫面可占位 ⇒ 先注入、載完再把原參數轉給真方法（使用者按下到開啟之間多一次網路往返）。
 *
 * ⚠️ 誰不能進這份清單（實作本卡時逐支查證後寫下，避免後手「順手多搬一支」白屏）：
 *   - `views/arena.js`（42KB·全庫最大）**必須留在首屏**：`views/lobby.js` 的「🔥 熱門玩家擂台」
 *     無守衛地呼叫 `HL.arenaUI.roomCard()`（大廳首屏就在渲染它），且 `main.js` 開機起一個
 *     每秒 `HL.arenaSim.tick()` 的假站環境活動 interval——延後載入等於延後那個 sim 的起跑，
 *     假站會「看起來沒人在玩」。⇒ 它的程式**真的參與首屏**，不是漏搬。
 *     已由 node 迴歸鎖 `platform/arena-first-screen-dependency` 釘住這個結論。
 *   - 任何被「別的檔在開機時同步讀取」的 view：本檔只能延後**互動後**才需要的東西。
 *
 * 註冊於 window.HL.lazyViews；載入序：core/lazy-load.js 之後、main.js 之前。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  var MANIFEST = [
    // 全球獎（側欄「🌐 全球獎」→ route globe）
    { src: "./src/views/global-prize.js", views: [{ id: "globe" }] },
    // 直播間（整頁；global-prize 的主播卡以 enter(idol, init) 進入）
    { src: "./src/views/liveroom.js", views: [{ id: "liveroom", methods: ["enter"] }] },
    // 賞金地雷局（競技場房卡 → route bounty）
    { src: "./src/views/bounty.js", views: [{ id: "bounty" }] },
    // 對戰 slot（競技場房卡 → route vsslot）
    { src: "./src/views/vsslot.js", views: [{ id: "vsslot" }] },
    // 營運監控儀表板（⚙ DEMO → 營運工具 → HL.opsBoard.open()）
    { src: "./src/views/ops-dashboard.js", globals: [{ ns: "opsBoard", methods: ["open"] }] }
  ];

  var _srcOfView = {};   // view id → src
  var _srcOfNs = {};     // 全域命名空間 → src

  function isNode() { return typeof module !== "undefined" && module.exports && !global.document; }
  function LL() { return HL.lazyLoad; }

  // 玩家是否仍停在這一頁（只有這時才值得重繪）
  function stillOn(id) {
    if (!HL.state || !HL.state.get) return false;
    return (HL.state.get() || {}).view === id;
  }

  // ── stub render：同步回占位節點 + 觸發載入 + 載完換手重繪 ──────────────────────
  function stubRender(src, id) {
    var fn = function () {
      // 已載入卻還走到 stub ⇒ 該檔沒有註冊這個 id（清單寫錯）→ 顯示失敗、不重繪（防迴圈）
      if (LL().state(src) === "done") {
        if (global.console) console.warn("[Apex Win] view 延遲載入清單與實際註冊不符：", id, src);
        return LL().failNode();
      }
      if (LL().state(src) === "error") return LL().failNode();
      LL().load(src).then(function (ok) {
        if (!ok || !stillOn(id) || LL().gatedOut()) return;
        var v = HL.views && HL.views[id];
        if (!v || v.__lazyStub) return; // 沒換手成功 → 不重繪
        if (HL.app && HL.app.refresh) HL.app.refresh();
      });
      return LL().loadingNode();
    };
    fn.__lazyStub = true;
    return fn;
  }

  // ── stub 方法：無畫面可占位 ⇒ 先注入，載完把原參數原封轉給真方法 ─────────────────
  function stubMethod(src, owner, name) {
    var fn = function () {
      var args = Array.prototype.slice.call(arguments);
      LL().load(src).then(function (ok) {
        var o = owner();
        if (!ok || !o || o.__lazyStub || typeof o[name] !== "function" || o[name].__lazyStub) {
          if (HL.ui && HL.ui.toast) HL.ui.toast("載入失敗，請稍後再試", "warn");
          return;
        }
        o[name].apply(o, args);
      });
    };
    fn.__lazyStub = true;
    return fn;
  }

  // ── 開機：註冊全部 stub ───────────────────────────────────────────────────────
  function boot() {
    HL.views = HL.views || {};
    MANIFEST.forEach(function (e) {
      (e.views || []).forEach(function (v) {
        _srcOfView[v.id] = e.src;
        var stub = { render: stubRender(e.src, v.id), __lazyStub: true };
        (v.methods || []).forEach(function (m) {
          stub[m] = stubMethod(e.src, function () { return HL.views[v.id]; }, m);
        });
        HL.views[v.id] = stub;
      });
      (e.globals || []).forEach(function (g) {
        _srcOfNs[g.ns] = e.src;
        var stub = { __lazyStub: true };
        (g.methods || []).forEach(function (m) {
          stub[m] = stubMethod(e.src, function () { return HL[g.ns]; }, m);
        });
        HL[g.ns] = stub;
      });
    });
  }

  // ── 公開 API ─────────────────────────────────────────────────────────────────
  function viewIds() { return Object.keys(_srcOfView); }
  function nsIds() { return Object.keys(_srcOfNs); }
  function srcOf(id) { return _srcOfView[id] || _srcOfNs[id] || null; }
  function load(id) {
    var src = srcOf(id);
    return src ? LL().load(src) : global.Promise.resolve(false);
  }
  // 全載（自我檢測／開發用：讓瀏覽器端需要這些命名空間的測項能先備齊）
  function loadAll() {
    return MANIFEST.map(function (e) { return e.src; }).reduce(function (p, s) {
      return p.then(function () { return LL().load(s); });
    }, global.Promise.resolve()).then(function () {
      if (!LL().gatedOut() && HL.app && HL.app.refresh) HL.app.refresh();
      return true;
    });
  }

  HL.lazyViews = {
    manifest: MANIFEST, boot: boot, viewIds: viewIds, nsIds: nsIds,
    srcOf: srcOf, load: load, preload: load, loadAll: loadAll,
    state: function (id) { var s = srcOf(id); return s ? LL().state(s) : "idle"; }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = HL.lazyViews; // node：供迴歸鎖比對清單
  if (!isNode()) boot();
})(typeof window !== "undefined" ? window : globalThis);

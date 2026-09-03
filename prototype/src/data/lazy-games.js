/*
 * Apex Win｜內建遊戲延遲載入器（code-splitting 容器）  #80
 * ------------------------------------------------------------------
 * 為什麼存在（船長指令 [M8]／維護軌 M6 首屏預算）：
 *   19 個「自帶 render 的內建遊戲 view」共約 235KB，過去全部以 <script> 靜態掛在 index.html，
 *   但玩家開站只會看到大廳——**這些程式在首屏一行都用不到**。
 *   2026-08-07 實測首屏 1559KB / 97 scripts，距 M6 硬門檻 1600KB 僅剩 41KB、每個平台建置輪 +20~48KB。
 *   本檔把「大廳卡需要的 meta」與「遊戲程式本體」拆開：meta 開機即註冊（卡照樣出現在娛樂城），
 *   程式本體在玩家**第一次開啟該遊戲**時才注入。
 *
 * 設計＝容器先於內容（對齊 platform-modules 擴充性模式）：
 *   - 新增一款內建遊戲 → 在 MANIFEST 加一列，**不必改核心、不必改 index.html**
 *     （與同仁放置區 games/registry.json + games-loader.js 同構，刻意複用同一套心智模型）。
 *   - **view 檔本身零改動**：它照舊在自己載入時呼叫 HL.games.register({... render})，
 *     那一呼叫就是「換手」動作——同 id 覆蓋掉本檔註冊的 stub，於是真 render 上線。
 *
 * 換手流程（stub → 注入 → 換手 → 重繪）：
 *   1. 開機：MANIFEST 每款以 meta + stubRender 註冊進 HL.games（大廳卡與改版前逐欄相同）。
 *   2. 玩家點卡 → HL.games.launch → router.goGame → renderGameView 取到 stubRender。
 *   3. stubRender 同步回傳「載入中」占位節點（render 契約要求同步回節點），同時開始注入該 src。
 *   4. 該 src 載入完 → view 檔自己的 HL.games.register 覆蓋 stub（真 render 就位）
 *      → 若玩家還停在同一款遊戲頁，呼叫 HL.app.refresh() 重繪一次 → 真畫面出現。
 *
 * 防呆：
 *   - 注入失敗（離線/404）→ 顯示「載入失敗，請稍後再試」節點，**不重繪、不無限迴圈**。
 *   - 檔案載入成功但沒註冊該 id（清單寫錯 src/id）→ 同樣走失敗節點而非重繪迴圈
 *     （靠 lazyLoad.state(src)==='done' 時 render 仍是 stub 來判定；stub 帶 __lazyStub 標記）。
 *   - 只在「玩家仍停在這款遊戲」時 refresh，避免玩家已離開卻被硬拉回重繪。
 *
 * MANIFEST 的 meta 是**大廳卡的單一資料來源**（載入前後都用它）。與 view 檔內 register 的
 * meta 若漂移，大廳卡會在載入瞬間跳動 → 已由 node 迴歸鎖 `platform/lazy-games-manifest`
 * 機械比對兩邊（見 prototype/tests/checks-platform.js），漂移即 FAIL。
 *
 * 載入順序：core/lazy-load.js 與 games.js 之後（需 HL.lazyLoad／HL.games.register）、main.js 之前（大廳渲染前 stub 須就位）。
 * 註冊於 window.HL.lazyGames。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ── 清單：一列一檔；games[] 為該檔會註冊的遊戲 meta（不含 render）──────────────
  // 欄位語意見 data/games.js 的 norm()。刻意不設 route：走 goGame 動態派發路徑。
  var MANIFEST = [
    { src: "./src/views/instant-games.js", games: [
      { id: "dice",  title: "Dice",  provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1e3a6e", c2: "#0a162a" },
      { id: "limbo", title: "Limbo", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e1e4a", c2: "#2a0a1e" },
      { id: "plinko", title: "Plinko", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e5a1e", c2: "#2a2410" }
    ] },
    { src: "./src/views/instant-crash-mines.js", games: [
      { id: "crash-x", title: "Crash X", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1e6e5a", c2: "#0a2a24" },
      { id: "mines",   title: "Mines",   provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#3a1e6e", c2: "#160a2a" }
    ] },
    { src: "./src/views/instant-towers.js", games: [
      { id: "towers", title: "Towers 爬塔", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e4a1e", c2: "#2a1a0a" }
    ] },
    { src: "./src/views/instant-moles.js", games: [
      { id: "moles", title: "Moles 打地鼠", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#3f6e1e", c2: "#16290a" }
    ] },
    { src: "./src/views/instant-hilo.js", games: [
      { id: "hilo", title: "Hilo 猜高低", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1e4a6e", c2: "#0a1a2a" }
    ] },
    { src: "./src/views/instant-keno.js", games: [
      { id: "keno", title: "Keno 賓果彩", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#4a1e6e", c2: "#1a0a2a" }
    ] },
    { src: "./src/views/instant-duel.js", games: [
      { id: "dice-duel", title: "Dice Duel 骰子對決", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e1e3a", c2: "#2a0a14" }
    ] },
    { src: "./src/views/instant-picks.js", games: [
      { id: "picks", title: "ApexWin Picks 賽事預測", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1b5e43", c2: "#0a1f18" }
    ] },
    { src: "./src/views/instant-pump.js", games: [
      { id: "pump", title: "Pump 打氣", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#b3145a", c2: "#3a0a22" }
    ] },
    { src: "./src/views/instant-cases.js", games: [
      { id: "cases", title: "Cases 開箱", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#c026d3", c2: "#3b0a3a" }
    ] },
    { src: "./src/views/table-baccarat.js", games: [
      { id: "baccarat", title: "百家樂 Baccarat", provider: "Apex Studio", type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true, author: "Apex", c1: "#0e7a5f", c2: "#0a3320" }
    ] },
    { src: "./src/views/table-roulette.js", games: [
      { id: "european-roulette", title: "輪盤 Roulette", provider: "Apex Studio", type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true, author: "Apex", c1: "#7a1020", c2: "#2a0a12" }
    ] },
    { src: "./src/views/table-dragon-tiger.js", games: [
      { id: "dragon-tiger", title: "龍虎鬥 Dragon Tiger", provider: "Apex Studio", type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true, author: "Apex", c1: "#c9962b", c2: "#7a1414" }
    ] },
    { src: "./src/views/table-sicbo.js", games: [
      { id: "sic-bo", title: "骰寶 Sic Bo", provider: "Apex Studio", type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true, author: "Apex", c1: "#16a3a3", c2: "#0a3f3f" }
    ] },
    { src: "./src/views/table-moneywheel.js", games: [
      { id: "money-wheel", title: "幸運轉盤 Money Wheel", provider: "Apex Studio", type: "table", cat: "gameshow", playable: true, comingSoon: false, isNew: true, hot: true, author: "Apex", c1: "#e0872a", c2: "#5a1010" }
    ] },
    { src: "./src/views/table-andar-bahar.js", games: [
      { id: "andar-bahar", title: "安達巴哈 Andar Bahar", provider: "Apex Studio", type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true, author: "Apex", c1: "#d98a2b", c2: "#7a3a10" }
    ] },
    { src: "./src/views/slot-pirots.js", games: [
      { id: "pirots", title: "Pirots 探險", provider: "Apex Studio", type: "slot", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#7c3aed", c2: "#1e1b4b" }
    ] },
    { src: "./src/views/slot-dead-by-noon.js", games: [
      { id: "dead-by-noon", title: "Dead By Noon 正午對決", provider: "Apex Studio", type: "slot", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#b45309", c2: "#431407" }
    ] },
    { src: "./src/views/slot-golden-toad.js", games: [
      { id: "golden-toad", title: "金蟾聚寶 Golden Toad", provider: "Apex Studio", type: "slot", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#ca8a04", c2: "#3f2d0a" }
    ] },
    { src: "./src/views/slot-gem-storm.js", games: [
      { id: "gem-storm", title: "寶石狂潮 Gem Storm", provider: "Apex Studio", type: "slot", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#7c3aed", c2: "#1e1043" }
    ] }
  ];

  var _srcOf = {}; // id → src

  function isNode() { return typeof module !== "undefined" && module.exports && !global.document; }

  // ── 注入／載入態／占位節點：一律向 core/lazy-load.js 借（#110 起唯一真相）───────
  //   為什麼不留在本檔：lazyViews 也要注入，兩份載入態表會讓同一個 src 被注入兩次
  //   （view 檔重複執行＝計時器與註冊重複）。
  function LL() { return HL.lazyLoad; }
  function loadSrc(src) { return LL().load(src); }
  function srcState(src) { return LL() ? LL().state(src) : "idle"; }
  function loadingNode() { return LL().loadingNode(); }
  function failNode() { return LL().failNode(); }
  function gatedOut() { return LL() ? LL().gatedOut() : false; }

  // 玩家是否仍停在這一款遊戲頁（只有這時才值得重繪）
  function stillOn(id) {
    if (!HL.state || !HL.state.get) return false;
    var s = HL.state.get() || {};
    return s.view === "game" && s.activeGameId === id;
  }

  // ── stub render：同步回占位節點 + 觸發載入 + 載完換手重繪 ─────────────────────
  function stubRender(src, id) {
    var fn = function () {
      // 已載入卻還走到 stub ⇒ 該檔沒有註冊這個 id（清單 src/id 寫錯）→ 顯示失敗，不重繪（防迴圈）
      if (srcState(src) === "done") {
        if (global.console) console.warn("[Apex Win] 延遲載入清單與實際註冊不符，id 未被覆蓋：", id, src);
        return failNode();
      }
      var failed = srcState(src) === "error";
      loadSrc(src).then(function (ok) {
        if (!stillOn(id) || gatedOut()) return;
        var g = ok && HL.games && HL.games.byId ? HL.games.byId(id) : null;
        if (ok ? (g && typeof g.render === "function" && g.render.__lazyStub) : failed) return; // 沒換手成功／失敗畫面 → 不重繪
        if (HL.app && HL.app.refresh) HL.app.refresh();
      });
      return failed ? failNode() : loadingNode();
    };
    fn.__lazyStub = true;
    return fn;
  }

  // ── 開機：註冊全部 stub（大廳卡即刻可見）──────────────────────────────────────
  function boot() {
    if (!HL.games || !HL.games.register) return;
    MANIFEST.forEach(function (entry) {
      (entry.games || []).forEach(function (meta) {
        _srcOf[meta.id] = entry.src;
        var m = {};
        Object.keys(meta).forEach(function (k) { m[k] = meta[k]; });
        m.render = stubRender(entry.src, meta.id);
        HL.games.register(m);
      });
    });
  }

  // ── 公開 API ────────────────────────────────────────────────────────────────
  function ids() { return Object.keys(_srcOf); }
  function srcOf(id) { return _srcOf[id] || null; }
  function isLoaded(id) { return srcState(_srcOf[id]) === "done"; }
  // 預載（例如卡片 hover 時可呼叫）；不強制接線，留給 UI 決定
  function preload(id) {
    var src = _srcOf[id];
    if (!src) return global.Promise.resolve(false);
    return loadSrc(src);
  }
  // 全載（給自我檢測／開發用：讓瀏覽器端需要遊戲數學命名空間的測項能先備齊）
  function loadAll() {
    var srcs = MANIFEST.map(function (e) { return e.src; });
    return srcs.reduce(function (p, s) {
      return p.then(function () { return loadSrc(s); });
    }, global.Promise.resolve()).then(function () {
      if (!gatedOut() && HL.app && HL.app.refresh) HL.app.refresh();
      return true;
    });
  }

  HL.lazyGames = {
    manifest: MANIFEST, boot: boot, ids: ids, srcOf: srcOf,
    isLoaded: isLoaded, preload: preload, load: preload, loadAll: loadAll,
    state: function (id) { return srcState(_srcOf[id]); }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = HL.lazyGames; // node：供迴歸鎖比對清單
  if (!isNode()) boot(); // 自動啟動（瀏覽器）
})(typeof window !== "undefined" ? window : globalThis);

/*
 * Apex Win｜內建遊戲延遲載入器（code-splitting 容器）  #80 · #110 · #189
 * ------------------------------------------------------------------
 * 契約（完整設計與沿革 → intel/lazy-game-container-2026-09-13.md）：
 *   - MANIFEST 一列一檔：`src` 遊戲程式、選用 `dep` 前置程式（多款共用的純函式模組）、選用 `css` 該款專用樣式、
 *     `games[]` 為大廳卡 meta（不含 render）。
 *     新增一款＝加一列，不必改核心、不必改 index.html（同 games/registry.json 的心智模型）。
 *   - 開機只註冊 meta + stubRender（大廳卡即刻可見）；玩家首次開啟該遊戲才注入程式與樣式。
 *   - view 檔零改動：它自己的 HL.games.register 同 id 覆蓋 stub＝換手，之後才 HL.app.refresh() 重繪。
 *   - MANIFEST 的 meta ＝大廳卡單一真相；與 view 內 register 漂移即由鎖 platform/lazy-games-manifest 判紅。
 *   - 載入順序：core/lazy-load.js 與 games.js 之後、main.js 之前。註冊於 window.HL.lazyGames。
 * ⚠️ 本檔是 **eager／開機即載**：每一個位元組（含註解）都直接吃 platform/first-screen-budget 的餘裕，
 *    所以長篇理由一律寫在上面那份 intel，不寫在這裡。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ── 清單：一列一檔；games[] 為該檔會註冊的遊戲 meta（不含 render）──────────────
  // 欄位語意見 data/games.js 的 norm()。刻意不設 route：走 goGame 動態派發路徑。
  // 卡片欄位預設：展開於 boot 前，顯式值一律勝出（含顯式 false）。理由與反向不變量見鎖 games/lazy-manifest-defaults。
  var CARD_DEFAULTS = { provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true };
  function fillDefaults(list) {
    (list || []).forEach(function (entry) {
      (entry.games || []).forEach(function (meta) {
        for (var k in CARD_DEFAULTS) { if (!Object.prototype.hasOwnProperty.call(meta, k)) meta[k] = CARD_DEFAULTS[k]; }
      });
    });
    return list;
  }
  var MANIFEST = [
    { src: "./src/views/instant-games.js", games: [
      { id: "dice",  title: "Dice",  c1: "#1e3a6e", c2: "#0a162a" },
      { id: "limbo", title: "Limbo", c1: "#6e1e4a", c2: "#2a0a1e" },
      { id: "plinko", title: "Plinko", c1: "#6e5a1e", c2: "#2a2410" }
    ] },
    { src: "./src/views/instant-crash-mines.js", games: [
      { id: "crash-x", title: "Crash X", c1: "#1e6e5a", c2: "#0a2a24" },
      { id: "mines",   title: "Mines",   c1: "#3a1e6e", c2: "#160a2a" }
    ] },
    { src: "./src/views/instant-towers.js", games: [
      { id: "towers", title: "Towers 爬塔", c1: "#6e4a1e", c2: "#2a1a0a" }
    ] },
    { src: "./src/views/instant-moles.js", games: [
      { id: "moles", title: "Moles 打地鼠", c1: "#3f6e1e", c2: "#16290a" }
    ] },
    { src: "./src/views/instant-hilo.js", games: [
      { id: "hilo", title: "Hilo 猜高低", c1: "#1e4a6e", c2: "#0a1a2a" }
    ] },
    { src: "./src/views/instant-keno.js", games: [
      { id: "keno", title: "Keno 賓果彩", c1: "#4a1e6e", c2: "#1a0a2a" }
    ] },
    { src: "./src/views/instant-duel.js", games: [
      { id: "dice-duel", title: "Dice Duel 骰子對決", c1: "#6e1e3a", c2: "#2a0a14" }
    ] },
    { src: "./src/views/instant-picks.js", games: [
      { id: "picks", title: "ApexWin Picks 賽事預測", c1: "#1b5e43", c2: "#0a1f18" }
    ] },
    { src: "./src/views/instant-pump.js", games: [
      { id: "pump", title: "Pump 打氣", c1: "#b3145a", c2: "#3a0a22" }
    ] },
    { src: "./src/views/instant-cases.js", games: [
      { id: "cases", title: "Cases 開箱", c1: "#c026d3", c2: "#3b0a3a" }
    ] },
    { src: "./src/views/table-baccarat.js", dep: "./src/core/table-tier.js", games: [
      { id: "baccarat", title: "百家樂 Baccarat", type: "table", cat: "table", author: "Apex", c1: "#0e7a5f", c2: "#0a3320" }
    ] },
    { src: "./src/views/table-roulette.js", dep: "./src/core/table-tier.js", games: [
      { id: "european-roulette", title: "輪盤 Roulette", type: "table", cat: "table", author: "Apex", c1: "#7a1020", c2: "#2a0a12" }
    ] },
    { src: "./src/views/table-dragon-tiger.js", dep: "./src/core/table-tier.js", games: [
      { id: "dragon-tiger", title: "龍虎鬥 Dragon Tiger", type: "table", cat: "table", author: "Apex", c1: "#c9962b", c2: "#7a1414" }
    ] },
    { src: "./src/views/table-sicbo.js", dep: "./src/core/table-tier.js", games: [
      { id: "sic-bo", title: "骰寶 Sic Bo", type: "table", cat: "table", author: "Apex", c1: "#16a3a3", c2: "#0a3f3f" }
    ] },
    { src: "./src/views/table-moneywheel.js", dep: "./src/core/table-tier.js", games: [
      { id: "money-wheel", title: "幸運轉盤 Money Wheel", type: "table", cat: "gameshow", author: "Apex", c1: "#e0872a", c2: "#5a1010" }
    ] },
    { src: "./src/views/table-andar-bahar.js", games: [
      { id: "andar-bahar", title: "安達巴哈 Andar Bahar", type: "table", cat: "table", author: "Apex", c1: "#d98a2b", c2: "#7a3a10" }
    ] },
    { src: "./src/views/slot-pirots.js", games: [
      { id: "pirots", title: "Pirots 探險", type: "slot", c1: "#7c3aed", c2: "#1e1b4b" }
    ] },
    { src: "./src/views/slot-dead-by-noon.js", games: [
      { id: "dead-by-noon", title: "Dead By Noon 正午對決", type: "slot", c1: "#b45309", c2: "#431407" }
    ] },
    { src: "./src/views/slot-golden-toad.js", games: [
      { id: "golden-toad", title: "金蟾聚寶 Golden Toad", type: "slot", c1: "#ca8a04", c2: "#3f2d0a" }
    ] },
    { src: "./src/views/slot-gem-storm.js", css: "./src/styles/game-gem-storm.css", games: [
      { id: "gem-storm", title: "寶石狂潮 Gem Storm", type: "slot", c1: "#7c3aed", c2: "#1e1043" }
    ] },
    { src: "./src/views/slot-abyssal-surge.js", css: "./src/styles/game-abyssal-surge.css", games: [
      { id: "abyssal-surge", title: "深淵氣湧 Abyssal Surge", type: "slot", c1: "#0e7490", c2: "#082f49" }
    ] },
    { src: "./src/views/slot-emerald-sprite.js", css: "./src/styles/game-emerald-sprite.css", games: [
      { id: "emerald-sprite", title: "翡翠妖精 Emerald Sprite", type: "slot", c1: "#059669", c2: "#052e16" }
    ] }
  ];
  fillDefaults(MANIFEST);


  var _srcOf = {}; // id → src
  var _cssOf = {}; // src → 該款專用樣式（#189；無則首屏 components.css 已含）
  var _depOf = {}; // src → 前置程式（T52；多款共用的純函式模組）

  function isNode() { return typeof module !== "undefined" && module.exports && !global.document; }

  // ── 注入／載入態／占位節點：一律向 core/lazy-load.js 借（#110 起唯一真相）───────
  //   為什麼不留在本檔：lazyViews 也要注入，兩份載入態表會讓同一個 src 被注入兩次
  //   （view 檔重複執行＝計時器與註冊重複）。
  function LL() { return HL.lazyLoad; }
  /* #189：一列可再帶一支 `css`（該款專用樣式）。程式與樣式**併發載入、兩者都到齊才換手**——
   * 少了「都到齊」這一條，真 render 會在樣式抵達前先畫一次 ⇒ 玩家看到一瞬間沒有樣式的盤面。
   * 回傳值只看 src：樣式失敗不該讓一款能玩的遊戲變成「載入失敗」（退化＝無樣式但可玩）。
   * T52 的 `dep` 語意相反（它是程式）：必須先於 src 執行、失敗即該款載入失敗。見 intel/DEBT.md T52。 */
  function loadSrc(src) {
    var dep = _depOf[src], css = _cssOf[src];
    // dep 先呼叫＝先注入＝先執行（injectScript 的 async=false 保留注入序）
    var pDep = dep ? LL().load(dep) : global.Promise.resolve(true);
    var pSrc = LL().load(src);
    var pCss = css ? LL().load(css) : global.Promise.resolve(true);
    return global.Promise.all([pDep, pSrc, pCss]).then(function (r) { return r[0] && r[1]; });
  }
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
      if (entry.css) _cssOf[entry.src] = entry.css;
      if (entry.dep) _depOf[entry.src] = entry.dep;
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
    cardDefaults: CARD_DEFAULTS, fillDefaults: fillDefaults,
    isLoaded: isLoaded, preload: preload, load: preload, loadAll: loadAll,
    state: function (id) { return srcState(_srcOf[id]); }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = HL.lazyGames; // node：供迴歸鎖比對清單
  if (!isNode()) boot(); // 自動啟動（瀏覽器）
})(typeof window !== "undefined" ? window : globalThis);

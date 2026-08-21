/*
 * Apex Win｜對戰節奏常數的單一真相 HL.battleTempo
 * ---------------------------------------------------------------------------
 * 【為什麼需要這個檔】2026-08-21 船長點名「節奏停留怎麼停」。稽核與外部研究的結論一致：
 *   Slots Battle 的節拍原本是**散落在兩支 view 裡的裸常數**（vsslot 的 1500/500/700/380×sp、
 *   fgboard 的 820/800/650/250/400/80×SP），而且缺了整整五拍：
 *     ① 硬性 commit 倒數（封盤宣告）② 逐輪結果停留 ③ 決勝輪蓄勢 ④ 勝負懸念 ⑤ 勝負高潮。
 *   最要命的是 ②：一輪跑完只有 `380×0.6 = 228ms` 就進下一輪 ⇒ **全場沒有任何一拍屬於
 *   「這一輪誰贏了」**，十輪讀起來是一段連續動畫、沒有斷點。
 *
 * 【設計】
 *   - 節拍分兩類：**演出拍**（轉輪/彈分/消除…）隨速度線性縮放；
 *     **結構拍**（承諾/懸念/高潮）縮放但有下限 `STRUCT_FLOOR`——這些拍不是等待，縮太短就沒有張力。
 *   - 真站（HL.site.isLive()）額外夾住：每輪總長 ≥ LIVE_ROUND_MIN_MS、且不提供 ultra
 *     （對標 UKGC RTS 14D/14E：禁止 turbo/slam-stop、單局最短時長）。
 *   - 每一拍都有名字，view 只問 `ms("round_result", sp)`；**禁止再在 view 裡寫裸毫秒**。
 *
 * 【外部對照（研究來源見 intel 的 arena 規格）】case battle 一手實作實測
 *   ROLL 3500–5000ms → DWELL 500ms → GAP 200ms（單人單盤面）；我們是 N 欄並排、10 輪，
 *   故 ROLL 縮短、GAP 加長，並補上跨席位錯開讓眼睛有掃視順序。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;

  var SPEED = { normal: 1.00, fast: 0.60, ultra: 0.35 };
  var STRUCT_FLOOR = 0.70;      // 結構拍的縮放下限
  var LIVE_ROUND_MIN_MS = 2500; // 真站每輪下限

  /* struct:true ＝結構拍（縮放有下限）。tier ＝分級演出用（見 dwellFor）。 */
  var BEATS = {
    match_search:     { ms: 1200, struct: false },  // 配對搜尋（改成席位逐格填入，不再放 spinner）
    seat_fill:        { ms: 380,  struct: false },  // 席位逐格填入（每席）
    commit:           { ms: 3000, struct: true },   // 鎖房承諾倒數＝唯一的硬性 commit（原本不存在）
    first_spin_lead:  { ms: 600,  struct: false },  // 倒數 0 → 第一輪起轉（原本 demo 500 / member 300 兩套值）
    spin_stagger:     { ms: 120,  struct: false },  // 起轉跨席位錯開（原本 0：N 個盤面同一 tick 全炸開）
    roll:             { ms: 900,  struct: false },  // 轉輪減速
    dwell_small:      { ms: 400,  struct: false },  // 命中停留（分級：小獎）
    dwell_mid:        { ms: 700,  struct: false },  //   中獎
    dwell_big:        { ms: 1200, struct: false },  //   大獎
    pop:              { ms: 700,  struct: false },  // 彈分存活（**不縮放**，見 popMs）
    clear:            { ms: 250,  struct: false },  // 消除
    drop:             { ms: 400,  struct: false },  // 落下
    cascade_gap:      { ms: 80,   struct: false },  // 連爆間隔
    round_result:     { ms: 700,  struct: true },   // 逐輪結果停留（全場最缺的一拍）
    reveal_stagger:   { ms: 400,  struct: false },  // 揭曉跨席位錯開（最差者先、領先者最後）
    round_gap:        { ms: 500,  struct: false },  // 輪間間隔
    final_prep:       { ms: 800,  struct: true },   // 決勝輪蓄勢（terminal 另有加成，見 finalPrepMs）
    final_prep_term:  { ms: 1500, struct: true },   //   terminal：只有這一輪算分，需要更長
    suspense:         { ms: 3000, struct: true },   // 最後一輪 → 勝負揭曉
    climax_lose:      { ms: 600,  struct: true },   // 高潮①敗方灰化（先掃輸）
    climax_win:       { ms: 800,  struct: true },   // 高潮②獎池飛向勝方（**之後**才更新餘額）
    settle_card:      { ms: 300,  struct: false }   // 結算卡淡入
  };

  function speedOf(prefs) {
    prefs = prefs || {};
    if (prefs.ultra) return SPEED.ultra;
    if (prefs.fast) return SPEED.fast;
    return SPEED.normal;
  }
  function isLive() { return !!(global.HL && global.HL.site && global.HL.site.isLive && global.HL.site.isLive()); }

  /* 取某一拍的毫秒數。sp 省略時視為常速。
   * 結構拍：縮放不得低於 STRUCT_FLOOR（3000ms 的承諾倒數在 ultra 下仍有 2100ms）。
   * 真站：不提供 ultra（夾到 fast），以符合「禁 turbo/slam stop」。 */
  function ms(name, sp, opts) {
    var b = BEATS[name];
    if (!b) return 0;
    var s = typeof sp === "number" && isFinite(sp) && sp > 0 ? sp : 1;
    var live = opts && typeof opts.live === "boolean" ? opts.live : isLive();
    if (live && s < SPEED.fast) s = SPEED.fast;
    var f = b.struct ? Math.max(STRUCT_FLOOR, s) : s;
    return Math.round(b.ms * f);
  }
  // 彈分刻意不隨速度縮短：它是唯一的逐爆得分回饋，縮短就等於被自己的清場動作吃掉（見 fgboard 註記）
  function popMs() { return BEATS.pop.ms; }
  /* 命中停留分級：以「本次連爆贏額 ÷ 本輪注額」決定。贏 1× 與贏 500× 不該演一樣長。 */
  function dwellFor(winAmount, bet, sp, opts) {
    var x = (+bet > 0) ? (+winAmount || 0) / +bet : 0;
    var name = x >= 20 ? "dwell_big" : x >= 5 ? "dwell_mid" : "dwell_small";
    return Math.max(ms(name, sp, opts), popMs());   // 停留不得短於彈分壽命，否則彈分會被硬切
  }
  function finalPrepMs(mode, sp, opts) {
    return ms(mode === "terminal" ? "final_prep_term" : "final_prep", sp, opts);
  }
  // 真站每輪最短時長：把「這一輪已經花掉多少」補到下限（回傳還需要補的毫秒）
  function liveRoundPad(spentMs, opts) {
    var live = opts && typeof opts.live === "boolean" ? opts.live : isLive();
    if (!live) return 0;
    return Math.max(0, LIVE_ROUND_MIN_MS - (+spentMs || 0));
  }

  var API = {
    SPEED: SPEED, STRUCT_FLOOR: STRUCT_FLOOR, LIVE_ROUND_MIN_MS: LIVE_ROUND_MIN_MS,
    beats: function () { var o = {}; for (var k in BEATS) o[k] = { ms: BEATS[k].ms, struct: !!BEATS[k].struct }; return o; },
    speedOf: speedOf, ms: ms, popMs: popMs, dwellFor: dwellFor, finalPrepMs: finalPrepMs, liveRoundPad: liveRoundPad
  };

  function registerTests(st) {
    st.register({
      id: "battle-tempo/constants", group: "games", env: "both", tier: "fast",
      title: "對戰節奏：結構拍有縮放下限、彈分不被停留吃掉、真站有每輪下限且不給 ultra",
      run: function (t) {
        // 結構拍：ultra 也不得低於 ×0.7
        t.equal(ms("commit", 1, { live: false }), 3000, "常速承諾倒數 3000ms");
        t.equal(ms("commit", SPEED.ultra, { live: false }), Math.round(3000 * STRUCT_FLOOR), "ultra 下承諾倒數仍有 2100ms（結構拍下限）");
        t.equal(ms("suspense", SPEED.ultra, { live: false }), Math.round(3000 * STRUCT_FLOOR), "懸念拍同樣受下限保護");
        // 演出拍照比例縮
        t.equal(ms("roll", SPEED.fast, { live: false }), 540, "轉輪在 fast 下為 540ms（線性縮放）");
        t.equal(ms("round_gap", SPEED.ultra, { live: false }), Math.round(500 * SPEED.ultra), "輪間間隔線性縮放");
        // 逐輪結果停留必須存在且是結構拍（這是全場最缺的一拍）
        t.ok(ms("round_result", SPEED.ultra, { live: false }) >= Math.round(700 * STRUCT_FLOOR), "逐輪結果停留在 ultra 下仍有下限");
        // 彈分：不縮放，且停留恆 ≥ 彈分壽命（否則彈分在全亮時被硬切＝一輪十次殘影）
        t.equal(popMs(), 700, "彈分壽命為單一常數 700ms（不隨速度縮短）");
        [1, SPEED.fast, SPEED.ultra].forEach(function (s) {
          [10, 100, 5000].forEach(function (winAmt) {
            t.ok(dwellFor(winAmt, 10, s, { live: false }) >= popMs(), "命中停留不得短於彈分壽命（sp=" + s + " win=" + winAmt + "）");
          });
        });
        // 分級演出：贏得越多停越久
        t.ok(dwellFor(200, 10, 1, { live: false }) > dwellFor(20, 10, 1, { live: false }), "大獎停留必須長於小獎（分級演出）");
        // 真站：不給 ultra + 每輪下限
        t.equal(ms("roll", SPEED.ultra, { live: true }), ms("roll", SPEED.fast, { live: true }), "真站不提供 ultra（夾到 fast）");
        t.equal(liveRoundPad(1000, { live: true }), LIVE_ROUND_MIN_MS - 1000, "真站每輪需補到 2500ms 下限");
        t.equal(liveRoundPad(1000, { live: false }), 0, "假站不補");
        // 未知拍名回 0（呼叫端打錯字不會靜默拿到某個別的拍）
        t.equal(ms("nope", 1, { live: false }), 0, "未知拍名必須回 0");
        // 速度解析
        t.equal(speedOf({ ultra: true }), SPEED.ultra, "ultra 優先");
        t.equal(speedOf({ fast: true }), SPEED.fast, "fast");
        t.equal(speedOf({}), SPEED.normal, "預設常速");
      }
    });
  }
  if (isNode) {
    module.exports = API;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 以下為瀏覽器區 =====================
  var HL = (global.HL = global.HL || {});
  HL.battleTempo = API;
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

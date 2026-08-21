/*
 * Apex Win｜對戰模式語意的單一真相 HL.battleMode
 * ---------------------------------------------------------------------------
 * 【為什麼需要這個檔】Slots Battle 有三種模式，而「畫面上顯示的量」與「決定勝負的量」不一定相同：
 *   normal   ＝累計總分最高勝
 *   crazy    ＝累計總分**最低**勝（分數越高越糟）
 *   terminal ＝比**最後一輪的增量**（累計總分完全不是判準）
 * 2026-08-21 船長回報「競技場有顯示 BUG」，實測復現的兩例都是同一個根因——**排名的規則被各表面各自
 * 硬寫成「總分越高越好」**：
 *   ① 回放長條圖：crazy 局（我 200／對手 600、紀錄 win:true）→ 我的條最短且「領先」高亮掛在對手身上，
 *      底下卻寫「🏆 你贏了！」＝畫面與結果互相矛盾。
 *   ② 回放/歷史在 terminal 局顯示累計總分（我 1050 > 對手 800）並標我領先，實際我因最後一輪只 +50 而輸。
 *
 * 【為什麼不是「讀 vsslot 的 CORE 就好」】對戰本體 `views/vsslot.js` 是 **#110 延遲載入**的，
 *   而大廳/戰績/回放（`views/arena.js`）是**開站就在**的。玩家上一次連線打過對戰、這一次一進站就開
 *   「戰績與回放」⇒ `HL.vsslot` 還不存在。第一版修法就是這樣**靜默退回錯的排名**（實測 metricOf 取不到），
 *   而畫面看起來一切正常＝「修了一半卻看不出來」的典型。
 * ⇒ 規則搬到 core（開站即載、node 可 require），對戰本體反過來讀它。**一份真相、與載入序無關。**
 *
 * 【誰該讀這裡】任何要回答下列問題的表面：
 *   「誰領先？」「這個數字越大越好嗎？」「勝負條件是什麼（要寫給玩家看）？」「名次怎麼排？」
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;

  /* metric: 用哪一個量排名（total＝累計分／last＝最後一輪增量）
   * lowerBetter: 該量是否越低越好
   * winCond: **要寫給玩家看**的勝負條件（各表面不得自己另寫一句，否則又是第二份真相） */
  var SPECS = {
    normal: { id: "normal", label: "標準模式", metric: "total", lowerBetter: false, winCond: "最高總分勝" },
    crazy: { id: "crazy", label: "Crazy Mode", metric: "total", lowerBetter: true, winCond: "最低總分勝" },
    terminal: { id: "terminal", label: "Terminal Mode", metric: "last", lowerBetter: false, winCond: "最後一輪增量最高勝" }
  };
  var MODES = ["normal", "crazy", "terminal"];

  function spec(mode) { return SPECS[mode] || SPECS.normal; }   // 未知模式一律退化成 normal（零回歸）
  function labelOf(mode) { return spec(mode).label; }
  function winCondOf(mode) { return spec(mode).winCond; }
  function lowerBetter(mode) { return !!spec(mode).lowerBetter; }

  // entry 形狀：{ total, last }（last＝最後一輪增量）。刻意只吃這兩個欄位，讓各表面都能組得出來。
  function metricOf(mode, e) {
    e = e || {};
    return spec(mode).metric === "last" ? (+e.last || 0) : (+e.total || 0);
  }
  // a 是否比 b 好（唯一的「比較」出口——各表面不得自己寫 > 或 <）
  function better(mode, a, b) { return lowerBetter(mode) ? a < b : a > b; }

  // entries=[{i,...,total,last}] → 依模式排序（最佳在前）。與 vsslot 的名次同一份規則。
  function rankBy(mode, entries) {
    return entries.slice().sort(function (x, y) {
      var mx = metricOf(mode, x), my = metricOf(mode, y);
      return lowerBetter(mode) ? mx - my : my - mx;
    });
  }
  // 誰領先（回傳 entries 的索引位置）。空陣列回 -1。
  function leaderIndex(mode, entries) {
    var best = -1;
    entries.forEach(function (e, i) { if (best < 0 || better(mode, metricOf(mode, e), metricOf(mode, entries[best]))) best = i; });
    return best;
  }
  /* 進度條長度該畫多長（0–1）：**代表「表現好壞」而不是「分數大小」**，才會與「領先」同軸。
   * crazy 下分數越低越好 ⇒ 反向歸一。數字本身仍應顯示真實分數（不動事實，只動長度的語意）。 */
  function barFrac(mode, v, maxAbs) {
    var m = Math.max(1, +maxAbs || 1), x = Math.max(0, Math.min(m, +v || 0));
    return lowerBetter(mode) ? (m - x) / m : x / m;
  }

  var API = {
    MODES: MODES, spec: spec, labelOf: labelOf, winCondOf: winCondOf, lowerBetter: lowerBetter,
    metricOf: metricOf, better: better, rankBy: rankBy, leaderIndex: leaderIndex, barFrac: barFrac
  };

  // 自我檢測（node 與瀏覽器同一份；比照 core/score-axis.js 的收尾形狀）
  function registerTests(st) {
    st.register({
      id: "battle-mode/single-truth", group: "games", env: "both", tier: "fast",
      title: "對戰模式語意：三模式的排名量/方向/文案齊備，且未知模式退化成 normal",
      run: function (t) {
        MODES.forEach(function (m) {
          var s = spec(m);
          t.ok(s.metric === "total" || s.metric === "last", m + " 的 metric 必須是 total 或 last");
          t.ok(!!s.winCond && !!s.label, m + " 必須有給玩家看的 winCond 與 label");
        });
        t.equal(spec("nope").id, "normal", "未知模式必須退化成 normal");
        t.equal(metricOf("terminal", { total: 999, last: 5 }), 5, "terminal 必須取最後一輪增量");
        t.equal(metricOf("crazy", { total: 999, last: 5 }), 999, "crazy 排名量仍是累計總分（只是越低越好）");
        t.ok(better("crazy", 100, 600), "crazy：100 應該比 600 好");
        t.ok(better("normal", 600, 100), "normal：600 應該比 100 好");
        t.equal(leaderIndex("crazy", [{ total: 600 }, { total: 200 }]), 1, "crazy 的領先者是分數低的那個");
        t.equal(leaderIndex("terminal", [{ total: 1050, last: 50 }, { total: 800, last: 700 }]), 1,
          "terminal 的領先者由最後一輪增量決定（不是總分）");
        // 條長必須與「領先」同軸：crazy 下分數低的條要比較長
        t.ok(barFrac("crazy", 200, 600) > barFrac("crazy", 600, 600), "crazy：分數低的條必須比較長（否則畫面與勝負反向）");
        t.ok(barFrac("normal", 600, 600) > barFrac("normal", 200, 600), "normal：分數高的條比較長");
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
  HL.battleMode = API;
  // 載入序脫鉤（#101）：本檔早於 core/selftest.js ⇒ 先排隊，由 selftest.js 載入時清算。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

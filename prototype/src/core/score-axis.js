/*
 * Apex Win｜競賽計分軸註冊表 HL.scoreAxis（自我進化引擎 #85）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 Stake.us「Weekly Wrapped」——獎池掛在**當週精選遊戲**上，決勝不是比誰押得多，
 *   而是**每款遊戲各出一名優勝者**：`Big Win`＝該款最大贏額、`Lucky Win`＝該款最高倍數。
 *
 * 解決的問題：`core/tournament.js:54` 的 `record(bet)` 是 `o.score += bet`＝**寫死的單一計分軸**
 *   （純流水），名次由單一全站榜決定。想辦一場「比最高倍數」或「每款遊戲各自一榜」的賽事，
 *   只能改結算程式。`core/achievements.js` 雖有 bestMult/bestWin，但那是**個人終身門檻成就**、
 *   與競賽資料流完全分離 ⇒ 競賽這條線上沒有任何「憑什麼排名」的抽象。
 *
 * 三軸拼圖的最後一塊（容器先於內容）：
 *   #64＝資格的**遊戲**軸（要在哪些遊戲做到什麼）／#83＝**分配**軸（達標後怎麼分）／
 *   本檔＝**計分**軸（憑什麼排名）。三軸齊備後，「六款遊戲各打倍數目標者均分池」＝填三張表。
 *
 * 核心契約：
 *   - **未宣告 axis 時逐位等於現行流水軸**：`get(undefined)`／`get("typo")` 一律回 `turnover`，
 *     而 `turnover.accum(cur, ctx) === cur + bet`＝原 `o.score += bet` 的純函式化（見測項 zero-regression）。
 *   - **max 型軸取最大值而非累加**：累加會讓「刷量又贏一次」變回流水軸（見測項 max-not-sum）。
 *   - **bet<=0 不得產生倍數**：旗艦 slot 把同一局拆成 `record(bet,0)` 與 `record(0,win)` 兩次結算
 *     （`views/slot.js:434/477`、`views/chicken.js` 同型）⇒ 倍數軸只在**同一次呼叫同時帶 bet>0 與 win>0**
 *     時才計分，否則會算出無限大倍數（見測項 no-mult-without-bet）。
 *   - **無變化即無副作用**：`accum` 回傳與 `cur` 相同的值時，呼叫端（tournament）不寫檔不通知
 *     ⇒ win-only 那半在流水軸下是**完全的 no-op**。
 *
 * 雙環境契約（比照 #50 edge／#54 release／#65 progressSrc）：純資料/純函式區以 `module.exports`
 *   暴露供 node 直接 require ⇒ `prototype/tests/run.js` 驗的即瀏覽器跑的同一份。
 * 註冊於 window.HL.scoreAxis = { register, get, ids, accum, groupKey, splitPool, AXES }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純函式區（node 可 require · 無 DOM 相依）=====================

  var DEFAULT_ID = "turnover";   // 未宣告/未知一律退化到此軸＝零回歸的錨點

  /* 計分軸描述子（加一種計分方式＝加一筆註冊，不改 tournament 的結算程式）：
   *   id / label   識別與顯示片語（label 為純片語 ⇒ i18n 可整節點翻譯，見 P3 契約）
   *   unit         "coin"（金額，呼叫端以 money() 呈現）｜"mult"（倍數，呈現為 x.xx×）
   *   accum(cur,ctx)  純函式：回傳新分數。ctx = { bet, win, game }。**必須單調不減**（見測項）
   *   round(v)     落地精度（流水/贏額取整；倍數保留兩位＝取整會把 1.85× 變成 2×）
   *   botScore(rint)  demo 假榜的分數尺度（真站 bots 恆為空陣列，見 tournament.freshEvent）
   */
  var AXES = {};
  function define(spec) { AXES[spec.id] = spec; return spec; }

  define({
    id: "turnover", label: "有效押注", unit: "coin",
    accum: function (cur, ctx) { var b = ctx && ctx.bet > 0 ? ctx.bet : 0; return cur + b; },
    round: function (v) { return Math.round(v); },
    botScore: function (rint) { return rint(1500, 90000); }
  });
  define({
    id: "bestWin", label: "最大贏額", unit: "coin",
    accum: function (cur, ctx) { var w = ctx && ctx.win > 0 ? ctx.win : 0; return w > cur ? w : cur; },
    round: function (v) { return Math.round(v); },
    botScore: function (rint) { return rint(500, 250000); }
  });
  define({
    id: "bestMult", label: "最高倍數", unit: "mult",
    // ⚠️ 兩個條件缺一不可：bet>0（否則除以 0＝無限大倍數）且 win>0（沒贏不產生倍數）
    accum: function (cur, ctx) {
      if (!ctx || !(ctx.bet > 0) || !(ctx.win > 0)) return cur;
      var m = ctx.win / ctx.bet;
      return m > cur ? m : cur;
    },
    round: function (v) { return Math.round(v * 100) / 100; },
    botScore: function (rint) { return rint(120, 50000) / 100; }
  });

  function register(spec) {
    if (!spec || !spec.id || typeof spec.accum !== "function") return null;
    if (typeof spec.round !== "function") spec.round = function (v) { return Math.round(v); };
    if (typeof spec.botScore !== "function") spec.botScore = function (rint) { return rint(1, 100); };
    if (!spec.unit) spec.unit = "coin";
    if (!spec.label) spec.label = spec.id;
    return define(spec);
  }
  // 未知/未宣告 → 退化為流水軸。刻意不回 null：計分是每一注都會走的路徑，
  //   拼錯軸名若讓全場零分會是「所有人都不得分」這種難以歸因的靜默失效；
  //   退化到預設軸＝行為等同「沒宣告」，而拼錯本身由 tournament 的宣告測項擋。
  function get(id) { return AXES[id] || AXES[DEFAULT_ID]; }
  function ids() { return Object.keys(AXES); }
  function accum(id, cur, ctx) { return get(id).accum(cur || 0, ctx || {}); }

  /* 分組鍵：groupBy "none" 恆為 ""（＝單一全站榜＝現況）；"game" 以遊戲名分組。
   * 未帶 game 的結算（理論上不該發生）落到具名的其他桶，**不丟棄記錄**。 */
  function groupKey(groupBy, ctx) {
    if (groupBy !== "game") return "";
    var g = ctx && ctx.game;
    return (g === 0 || g) ? String(g) : "其他";
  }

  /* 分組獎池切分：n 組平分 pool，餘數留在房家（**Σ 恆 ≤ pool**＝成本不會因為分組而變多）。
   * 這是本檔唯一與金額有關的函式，故做成恆等式而非宣稱（見測項 pool-never-exceeds）。 */
  function splitPool(pool, n) {
    pool = Math.max(0, Math.round(pool || 0));
    n = Math.max(1, Math.round(n || 1));
    return Math.floor(pool / n);
  }

  var CORE = {
    AXES: AXES, DEFAULT_ID: DEFAULT_ID,
    register: register, get: get, ids: ids, accum: accum, groupKey: groupKey, splitPool: splitPool
  };

  // ===================== 測項（雙環境同一份定義）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    st.register({
      id: "scoreAxis/zero-regression", group: "scoreAxis", title: "未宣告計分軸＝逐位等於原流水累加",
      run: function (t) {
        // 這是本卡的相容性契約：turnover.accum 必須是原 `o.score += bet` 的純函式化
        [0, 1, 7, 250, 99999].forEach(function (cur) {
          [1, 10, 3333, 100000].forEach(function (bet) {
            t.equal(accum(undefined, cur, { bet: bet, win: 0 }), cur + bet, "未宣告軸應逐位等於 cur+bet（" + cur + "+" + bet + "）");
            t.equal(accum("turnover", cur, { bet: bet, win: bet * 3 }), cur + bet,
              "流水軸只看 bet，win 不得影響分數（cur=" + cur + "）");
          });
          // win-only 那半（slot 拆成兩次結算）在流水軸下必須是完全的 no-op
          t.equal(accum("turnover", cur, { bet: 0, win: 500000 }), cur, "bet=0 的 win-only 結算在流水軸下不得改變分數");
        });
        t.equal(get("typo-不存在的軸"), get("turnover"), "未知軸名應退化為預設流水軸（等同沒宣告）");
        t.equal(get(undefined), get("turnover"), "未指定軸應為流水軸");
        t.equal(groupKey("none", { game: "dice" }), "", "groupBy=none 時分組鍵恆為空＝單一全站榜");
        t.equal(groupKey(undefined, { game: "dice" }), "", "未宣告 groupBy 時亦為單一全站榜");
      }
    });

    st.register({
      id: "scoreAxis/max-not-sum", group: "scoreAxis", title: "max 型軸取最大值而非累加（刷量不得等於高分）",
      run: function (t) {
        // (b) 累加會讓「刷量又贏一次」變回流水軸 ⇒ 必須取 max
        var cur = 0;
        [100, 900, 300, 50].forEach(function (w) { cur = accum("bestWin", cur, { bet: 10, win: w }); });
        t.equal(cur, 900, "bestWin 連續四筆後應為最大值 900 而非總和 1350");
        var m = 0;
        [[10, 50], [10, 200], [100, 300], [10, 30]].forEach(function (p) { m = accum("bestMult", m, { bet: p[0], win: p[1] }); });
        t.equal(m, 20, "bestMult 應為最高倍數 20×（200/10）而非累加或最後一筆");
        // 單調不減：任何 ctx 都不得讓既有分數下降（否則排行榜會倒退）
        ids().forEach(function (id) {
          var base = 12345;
          [{ bet: 0, win: 0 }, { bet: 0, win: 999 }, { bet: 5, win: 0 }, { bet: 5, win: 6 }].forEach(function (ctx) {
            t.ok(accum(id, base, ctx) >= base, "軸 " + id + " 必須單調不減（ctx=" + JSON.stringify(ctx) + "）");
          });
          var a = get(id);
          t.ok(!!a.label, "軸 " + id + " 應有 label");
          t.ok(a.unit === "coin" || a.unit === "mult", "軸 " + id + " 的 unit 應為 coin 或 mult");
          t.isFn(a.round, "軸 " + id + " 應有 round");
          t.isFn(a.botScore, "軸 " + id + " 應有 botScore（demo 假榜尺度）");
        });
      }
    });

    st.register({
      id: "scoreAxis/no-mult-without-bet", group: "scoreAxis", title: "bet<=0 不得產生倍數（slot 拆兩次結算的陷阱）",
      run: function (t) {
        // (c) 旗艦 slot：views/slot.js:434 record(0, win)／:477 record(bet, 0) ⇒ 若只看 win 會算出無限大倍數
        t.equal(accum("bestMult", 0, { bet: 0, win: 999999 }), 0, "bet=0 的 win-only 結算不得產生倍數");
        t.equal(accum("bestMult", 3, { bet: 0, win: 999999 }), 3, "bet=0 亦不得覆寫既有倍數");
        t.equal(accum("bestMult", 0, { bet: 100, win: 0 }), 0, "沒贏不產生倍數");
        t.equal(accum("bestMult", 0, { bet: -5, win: 100 }), 0, "負押注（不該發生）亦不得產生倍數");
        t.ok(isFinite(accum("bestMult", 0, { bet: 0, win: 1 })), "任何情形下倍數皆須為有限數");
        // bestWin 反過來：win-only 那半正是它唯一的資料來源，必須收得到
        t.equal(accum("bestWin", 0, { bet: 0, win: 8000 }), 8000, "bestWin 必須收得到 win-only 結算（否則旗艦 slot 永遠零分）");
        t.equal(get("bestMult").round(1.8549), 1.85, "倍數軸須保留兩位小數（取整會把 1.85× 變成 2×）");
        t.equal(get("turnover").round(1234.6), 1235, "金額軸維持取整");
      }
    });

    st.register({
      id: "scoreAxis/grouping-and-pool", group: "scoreAxis", title: "分組鍵不丟記錄 + 分組獎池 Σ 恆 ≤ 總池",
      run: function (t) {
        t.equal(groupKey("game", { game: "dice" }), "dice", "groupBy=game 應以遊戲名為鍵");
        t.equal(groupKey("game", {}), "其他", "未帶遊戲名的結算不得被丟棄，應落到具名的其他桶");
        t.equal(groupKey("game", { game: 0 }), "0", "遊戲名為 0 時仍應成鍵（非 falsy 陷阱）");
        // 成本恆等式：分組只會讓總支出 ≤ 原獎池（餘數留在房家），不會因為多開幾組而變多
        [1, 2, 3, 6, 7, 10, 33, 50].forEach(function (n) {
          var per = splitPool(1000000, n);
          t.ok(per * n <= 1000000, n + " 組時 Σ 分組獎池（" + per * n + "）不得超過總池 1000000");
          t.ok(1000000 - per * n < n, "餘數應小於組數（＝真的平分，不是隨手截斷）");
        });
        t.equal(splitPool(1000000, 1), 1000000, "單組時應逐位等於總池（零回歸）");
        t.equal(splitPool(1000000, 0), 1000000, "組數 0（不該發生）應退化為單組而非除以零");
      }
    });

    st.register({
      id: "scoreAxis/registry-extensible", group: "scoreAxis", title: "註冊即擴充（加一種計分方式＝加一筆）",
      run: function (t) {
        var before = ids().length;
        register({ id: "_test_streak", label: "測試軸", unit: "coin", accum: function (cur) { return cur + 1; } });
        t.equal(ids().length, before + 1, "註冊後軸數應 +1");
        t.equal(accum("_test_streak", 5, { bet: 999 }), 6, "新軸應可被 accum 取用");
        t.isFn(get("_test_streak").round, "未給 round 應補上預設");
        t.isFn(get("_test_streak").botScore, "未給 botScore 應補上預設");
        delete AXES._test_streak;
        t.equal(ids().length, before, "清理後軸數應回復");
        t.equal(register({ id: "x" }), null, "缺 accum 的註冊應被拒（不得產生只會回 undefined 的軸）");
        t.equal(register(null), null, "空註冊應被拒");
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 以下為瀏覽器區 =====================
  HL.scoreAxis = CORE;
  registerTests(HL.selftest);
})(typeof window !== "undefined" ? window : globalThis);

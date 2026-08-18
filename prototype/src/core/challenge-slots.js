/*
 * Apex Win｜限量挑戰名額仲裁 HL.chalSlots（自我進化引擎 #57 的純數學層）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 **Shuffle 2026-07-31 刷新**：其 challenges 除個人達標型外另有一類明載
 *   「the first player to complete a challenge will win」——獎品是**單一名額、先搶先贏、
 *   被領走即消失**。ApexWin 既有 `core/challenges.js` 三條 DAILY 全是純個人累進
 *   （各自 claim、`claimed` 只記自己），**「競逐同一份限量獎」這條留存力學完全空白**。
 *
 * 【本檔只做一件事】回答「此刻這個限量挑戰還剩幾個名額、被誰拿走了」，
 *   **不碰 DOM、不碰 localStorage、不碰站別**——全部由呼叫端餵進來（純函式 ⇒ node 可 require）。
 *   雙環境契約比照 #50 edge／#63 sla／#71 bonusTtl：純函式區以 `module.exports` 出口，
 *   node 驗的就是瀏覽器跑的那一份，不是複製品。
 *
 * 【為什麼要獨立成檔】名額仲裁是本卡唯一有「可算錯」空間的部分（超賣、負數、
 *   開場即滿、玩家名額被 bot 覆寫），而 `challenges.js` 因 `HL.dom.el` 在模組頂層取用
 *   而 node 不可 require ⇒ 把可算錯的部分搬進純函式，鎖才咬得到東西。
 *
 * 【四條刻意的紀律（皆有對應測項）】
 *   ① **未宣告 `slots` ＝ 無限名額**：`state()` 回 `{unlimited:true, remaining:Infinity}`，
 *      呼叫端逐位如舊 ⇒ 既有三條 DAILY 的零回歸靠「這個欄位不存在」而非比對行為。
 *   ② **不可超賣**：`taken ≤ total` 為**結構保證**——玩家搶走的那一格會從 bot 排程尾端
 *      扣掉一格（`botCount = total - (mine?1:0)`），而不是「bot 照排、玩家再加一」。
 *   ③ **開窗當下必定全空**：bot 名額最早只在窗口 15% 處落下 ⇒ 每天開場 `remaining === total`。
 *      （沒有這條，一個「每日限量」挑戰會在每天 0 點就已經被搶光＝生下來就是死的。）
 *   ④ **玩家的名額不可撤銷**：`grabbedAt` 一旦有值，`mine` 恆為 true，與之後任何 bot 時刻無關。
 *
 * 【真站（live）的誠實邊界】本層可用 `bots:false` 關掉模擬對手，但那樣「先搶先贏」就只剩
 *   一個玩家在搶＝必贏 ⇒ 名額是**假的稀缺**、且送幣成本高於假站（違反 §11 方向）。
 *   ⇒ 真正的仲裁權在伺服器。呼叫端（challenges.js）在真站且無仲裁者時**不提供**限量挑戰，
 *   而不是靜默退化成無限名額。本檔只負責把 `bots:false` 算對，不負責決定要不要顯示。
 *
 * 註冊於 window.HL.chalSlots = { schedule, state, hash }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純函式區（node 可 require · 無 DOM／localStorage／站別相依）=====================

  var LEAD = 0.15;   // bot 名額最早落點（窗口比例）——紀律 ③ 的來源：開窗當下必定全空
  var TAIL = 0.95;   // bot 名額最晚落點；留 5% 尾巴避免「最後一秒才被搶走」的體感

  // 確定性雜湊（沿用 guild.js/tournament.js 家族的 32-bit 混合；同輸入必同輸出、跨 session 穩定）
  function hash(s) {
    var h = 2166136261, i;
    s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }

  /* 產生 n 個 bot 搶走名額的時刻（毫秒），**升冪**、且全部落在 [start+15%, start+95%] 窗口內。
   * 純確定性：同一個 seed 在任何裝置／任何時間重算都得到同一組時刻 ⇒ 玩家看到的「剩幾格」
   * 不會因為重新整理而跳動（這是模擬型稀缺唯一會被玩家一眼看穿的破綻）。 */
  function schedule(seed, n, startMs, endMs) {
    n = Math.max(0, Math.floor(n || 0));
    var span = Math.max(0, (endMs || 0) - (startMs || 0));
    if (!n || !span) return [];
    var us = [], i;
    for (i = 0; i < n; i++) us.push((hash(seed + "|slot|" + i) % 100000) / 100000);
    us.sort(function (a, b) { return a - b; });
    return us.map(function (u) { return startMs + Math.round((LEAD + u * (TAIL - LEAD)) * span); });
  }

  /* 此刻的名額狀態。
   * 入參（全部由呼叫端提供，本層不去讀任何全域狀態）：
   *   { slots, startMs, endMs, now, seed, grabbedAt, bots, names }
   *   - slots     名額數；null/undefined ＝ 無限（既有 DAILY 的語意）
   *   - grabbedAt 玩家搶到的時刻（0/null ＝ 尚未搶到）
   *   - bots      是否有模擬對手（真站傳 false）
   *   - names     bot 名字池（不傳則以編號代替；本層不相依 HL.mock）
   * 回傳：{ unlimited, total, taken, remaining, mine, closed, open, takenBy[] }
   *   - open      ＝ 現在還搶得到（remaining>0 且未過期且自己還沒搶）
   *   - closed    ＝ 名額已滿或窗口已過（此時 mine 若為 false 就是「被搶走了」） */
  function state(o) {
    o = o || {};
    var now = +o.now || 0, startMs = +o.startMs || 0, endMs = +o.endMs || 0;
    var mine = !!o.grabbedAt;
    var expired = endMs > 0 && now >= endMs;

    if (o.slots == null) {
      // 紀律 ①：未宣告名額＝無限，呼叫端逐位如舊
      return { unlimited: true, total: 0, taken: 0, remaining: Infinity, mine: mine, closed: expired, open: !expired, takenBy: [] };
    }

    var total = Math.max(0, Math.floor(o.slots));
    // 紀律 ②：玩家佔走的那一格從 bot 排程扣掉 ⇒ taken 結構上不可能超過 total
    var botCount = Math.max(0, total - (mine ? 1 : 0));
    var times = (o.bots === false) ? [] : schedule(o.seed || "", botCount, startMs, endMs);
    var names = o.names && o.names.length ? o.names : null;

    var takenBy = [], i;
    for (i = 0; i < times.length; i++) {
      if (times[i] > now) break;                                  // 升冪 ⇒ 第一個未到即可停
      takenBy.push({ name: names ? names[hash((o.seed || "") + "|name|" + i) % names.length] : "#" + (i + 1), at: times[i] });
    }
    var taken = takenBy.length + (mine ? 1 : 0);
    var remaining = Math.max(0, total - taken);
    return {
      unlimited: false, total: total, taken: taken, remaining: remaining,
      mine: mine,                                                  // 紀律 ④：搶到就是搶到，之後不再受 bot 影響
      closed: remaining <= 0 || expired,
      open: remaining > 0 && !expired && !mine,
      takenBy: takenBy
    };
  }

  var CORE = { schedule: schedule, state: state, hash: hash, LEAD: LEAD, TAIL: TAIL };

  /* ---------- 測項（雙環境同一份；node 由 tests/run.js 跑、瀏覽器由 ⚙ 自我檢測跑） ---------- */
  function registerTests(selftest) {
    if (!selftest || !selftest.register) return;
    var DAY = 86400000;
    selftest.register({
      id: "platform/chal-slots-invariants", group: "platform", env: "both", tier: "fast",
      title: "#57 名額仲裁四條紀律：無限退化／不可超賣／開窗全空／名額不可撤銷",
      run: function (t) {
        var s0 = 1000 * DAY, s1 = s0 + DAY;
        // ① 未宣告 slots ＝ 無限（既有三條 DAILY 的零回歸來源）
        var u = state({ startMs: s0, endMs: s1, now: s0 + DAY / 2, seed: "x" });
        t.ok(u.unlimited === true && u.remaining === Infinity, "未宣告 slots 必須退化為無限名額");
        t.equal(u.takenBy.length, 0, "無限名額不得產生任何被搶走紀錄");
        /* ③ 開窗後必須有一段**真的**空窗期。
         * ⚠️ 首版這條寫成「now === startMs 時 remaining === total」，負向擾動實測**把 LEAD 改成 0 仍全綠**
         *   ——因為 bot 落點是 u∈[0,1) 的連續值，恰好等於開窗那一毫秒的機率趨近 0，
         *   於是「開窗當下沒人搶」對任何 LEAD 都成立＝那條斷言**鎖不到 LEAD**。
         *   真正要守的是「玩家有一段來得及參與的時間」⇒ 改為直接對 LEAD 邊界斷言。 */
        var i, seeds = ["a", "b", "c", "d", "e", "f", "g", "h"];
        var guard = s0 + LEAD * DAY;
        t.ok(LEAD > 0.05, "LEAD 必須留出有意義的空窗期（實測 " + LEAD + "）");
        for (i = 0; i < seeds.length; i++) {
          var times = schedule(seeds[i], 3, s0, s1);
          t.equal(times.length, 3, "seed " + seeds[i] + " 應排出 3 個名額時刻");
          t.ok(times[0] >= guard, "seed " + seeds[i] + " 最早的名額不得落在空窗期內（" + times[0] + " < " + guard + "）");
          // 空窗期內任一時刻查詢都必須是滿格（取樣點必須落在 [s0, guard) 內＝以「距開窗多久」計，
          //   ⚠️ 首版誤寫成 `s0 + guard*0.001`——guard 是絕對時戳，乘完直接飛出窗口，clean tree 就紅）
          [s0, s0 + (guard - s0) * 0.5, guard - 1].forEach(function (n) {
            var st = state({ slots: 3, startMs: s0, endMs: s1, now: n, seed: seeds[i] });
            t.equal(st.remaining, 3, "seed " + seeds[i] + " 在空窗期內應剩滿 3 格（實測 " + st.remaining + "）");
          });
        }
        // ② 不可超賣 + 單調性：掃過整個窗口，taken 只增不減且恆 ≤ total
        var prev = -1, k;
        for (k = 0; k <= 100; k++) {
          var stk = state({ slots: 4, startMs: s0, endMs: s1, now: s0 + (DAY * k) / 100, seed: "mono" });
          t.ok(stk.taken >= prev, "taken 必須單調不減（k=" + k + "：" + prev + "→" + stk.taken + "）");
          t.ok(stk.taken <= stk.total && stk.remaining >= 0, "taken 不得超賣（k=" + k + "）");
          prev = stk.taken;
        }
        // ② 的結構面：玩家搶走一格後，bot 最多只能再拿 total-1 格（不是「bot 照排、玩家再加一」）
        var full = state({ slots: 2, startMs: s0, endMs: s1, now: s1 - 1, seed: "mono" });
        var withMine = state({ slots: 2, startMs: s0, endMs: s1, now: s1 - 1, seed: "mono", grabbedAt: s0 + 10 });
        t.equal(full.taken, 2, "窗口末端 bot 應吃滿名額");
        t.equal(withMine.taken, 2, "玩家佔一格時總佔用仍為 2（不得變成 3）");
        t.equal(withMine.takenBy.length, 1, "玩家佔一格 ⇒ bot 佔用者只剩 1 位");
        // ④ 玩家名額不可撤銷：即使窗口已滿、已過期，mine 仍為 true
        var late = state({ slots: 1, startMs: s0, endMs: s1, now: s1 + DAY, seed: "mono", grabbedAt: s0 + 5 });
        t.ok(late.mine === true, "已搶到的名額不得因過期而被撤銷");
        t.ok(late.open === false && late.closed === true, "過期後不得再是可搶狀態");
        // 真站無 bot：名額不會自己消失（＝為什麼呼叫端必須另有仲裁者，見檔頭）
        var nb = state({ slots: 1, startMs: s0, endMs: s1, now: s1 - 1, seed: "mono", bots: false });
        t.equal(nb.remaining, 1, "bots:false 時名額不得被模擬對手吃掉");
        // 確定性：同輸入必同輸出（玩家重新整理不得看到不同的剩餘格數）
        var a1 = schedule("det", 5, s0, s1), a2 = schedule("det", 5, s0, s1);
        t.equal(a1.join(","), a2.join(","), "同 seed 的名額排程必須完全確定");
        for (i = 1; i < a1.length; i++) t.ok(a1[i] >= a1[i - 1], "排程必須升冪（state 的提早中斷依賴它）");
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 瀏覽器區 =====================
  HL.chalSlots = CORE;
  // 載入序脫鉤（#101）：不假設 selftest.js 已載入，改用它的佇列形狀（`HL._selftestQ`，載入時清算）
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

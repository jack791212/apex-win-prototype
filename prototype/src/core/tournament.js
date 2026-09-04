/*
 * Apex Win｜錦標賽 / Slot Race（#15）限時積分賽
 * 玩法：限時賽期內「有效押注（turnover）」即積分；即時排行榜（mock bot 持續爬升 + 真玩家以
 *   中央掛鉤 HL.liveStats.record 計分）；賽末依名次階梯自動派彩到獎金錢包 HL.bonus，並開新一期。
 * 純前端 localStorage、零牌照。掛鉤：live-stats.js 的 record() 尾端呼叫 HL.tournament.record(bet, win, game)。
 * 註冊於 window.HL.tournament。
 *
 * #85 計分軸容器化（2026-08-12）：原本 `record(bet)` 直接 `o.score += bet`＝**寫死的單一流水軸**。
 *   現改為向 `HL.scoreAxis`（core/score-axis.js）取軸：賽事宣告 `axis`（turnover/bestWin/bestMult…）
 *   與 `groupBy`（none/game）兩個欄位即可換一種賽制，**兩者都不填＝逐位維持原行為**（零回歸契約）。
 *   - `groupBy:"game"` ⇒ 每款遊戲各自一份榜與各自一份獎池（總池平分、餘數留房家＝Σ 恆 ≤ 原池）。
 *   - 對標 Stake.us Weekly Wrapped「每款遊戲各出一名優勝者（最大贏額／最高倍數）」。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;  // T20：收斂至共用 localStorage 持久化出口
  var rint = HL.dom.rint;                          // T21：收斂至 HL.dom.rint（原逐字相同）

  var KEY_T = "HL_TOURNEY", KEY_L = "HL_TOURNEY_LAST", KEY_H = "HL_TOURNEY_HIST";
  // hist()：往期賽果，最新在前，保留 8 期。KEY_L 為舊單筆格式，首讀時遷入。理由見 tests/checks-platform.js
  function hist() { var h = ls(KEY_H, null); if (h) return h; var l = ls(KEY_L, null); return l ? [l] : []; }
  var DURATION = 3 * 3600 * 1000;         // 一期 3 小時
  var POOL = 1000000;                      // 對齊促銷卡「100 萬獎池」
  // S12 付獎曲線：前 30 名陡頭長尾（對齊 Stake Daily Race「付獎深」）。頭部 10 名 73.4% 陡減、
  //   11–20 名各 1.5%、21–30 名各 1.16%；合計恰 100%（0.734 + 0.15 + 0.116）。
  var SPLIT = [
    0.25, 0.14, 0.09, 0.065, 0.05, 0.04, 0.032, 0.026, 0.022, 0.019,
    0.015, 0.015, 0.015, 0.015, 0.015, 0.015, 0.015, 0.015, 0.015, 0.015,
    0.0116, 0.0116, 0.0116, 0.0116, 0.0116, 0.0116, 0.0116, 0.0116, 0.0116, 0.0116
  ];
  var BOTS = 49; // 榜深：49 bot + 你 = 50 人榜（原 11+1=12，淺過付獎深度）
  var NAMES = ["週末 Slots 衝刺賽", "黃金時段積分賽", "Originals 大亂鬥", "百萬獎池週賽", "深夜極速賽"];
  var subs = [];

  /* ---- #85 計分軸：唯一取軸出口 ----
   * scoreAxis 未載入時退化為內建流水軸（漏載只退化、不整組失效；比照 #65 的 fallback 紀律）。 */
  var FALLBACK_AXIS = {
    id: "turnover", label: "有效押注", unit: "coin",
    accum: function (cur, ctx) { return cur + (ctx && ctx.bet > 0 ? ctx.bet : 0); },
    round: function (v) { return Math.round(v); },
    botScore: function (r) { return r(1500, 90000); }
  };
  function axisFor(id) { return (HL.scoreAxis && HL.scoreAxis.get) ? HL.scoreAxis.get(id) : FALLBACK_AXIS; }
  function groupKeyOf(o, ctx) {
    if (!o || o.groupBy !== "game") return "";
    return (HL.scoreAxis && HL.scoreAxis.groupKey) ? HL.scoreAxis.groupKey("game", ctx) : (ctx.game || "其他");
  }
  function splitPool(pool, n) {
    return (HL.scoreAxis && HL.scoreAxis.splitPool) ? HL.scoreAxis.splitPool(pool, n) : Math.floor(pool / Math.max(1, n));
  }
  function groupKeys(o) { return o && o.groups ? Object.keys(o.groups) : []; }
  function groupPool(o) { return o.groupBy === "game" ? splitPool(POOL, Math.max(1, groupKeys(o).length)) : POOL; }

  function nowMs() { return Date.now(); }
  function botPool() { return (HL.mock && HL.mock.fakeNames) ? HL.mock.fakeNames.slice() : ["Ace", "Neo", "Luna", "Rex", "Max", "Kai", "Zoe", "Sky", "Fox", "Jin", "Mia", "Leo"]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* demo 假榜的 bot 名單：分數尺度由計分軸自己決定（流水 1500–90000／倍數 1.20–500×），
   * 否則「比最高倍數」的榜上會出現 87,000× 這種明顯假的數字。真站恆為空陣列（§4 假活動閘）。 */
  function seedBots(axis) {
    if (HL.site && HL.site.isLive()) return [];
    var pool = shuffle(botPool()), bots = [];
    for (var i = 0; i < BOTS; i++) bots.push({ name: pool[i % pool.length] + rint(10, 99), score: axis.botScore(rint) });
    return bots;
  }

  /* spec 可宣告 { name, axis, groupBy }；三者皆不填＝與 #85 之前逐位相同的流水賽。 */
  function freshEvent(spec) {
    spec = spec || {};
    var live = HL.site && HL.site.isLive();
    var axis = axisFor(spec.axis);
    return {
      id: "T" + nowMs(), name: spec.name || NAMES[rint(0, NAMES.length - 1)],
      startAt: nowMs(), endAt: nowMs() + DURATION, pool: POOL, score: 0,
      axis: spec.axis || "turnover", groupBy: spec.groupBy === "game" ? "game" : "none", groups: {},
      bots: seedBots(axis), players: live ? 0 : rint(3000, 12000)
    };
  }
  function load() { var o = ls(KEY_T, null); if (!o || !o.id || !o.bots) { o = freshEvent(); save(KEY_T, o); } return o; }
  function notify() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }

  /* gkey 為空＝全站榜（現況）；帶 gkey＝該遊戲分組榜（bots 與獎池皆為該組自己的）。 */
  function leaderboard(o, gkey) {
    o = o || load();
    var axis = axisFor(o.axis);
    var g = gkey ? (o.groups || {})[gkey] : null;
    var bots = g ? (g.bots || []) : o.bots;
    var mine = g ? (g.score || 0) : o.score;
    var pool = gkey ? groupPool(o) : POOL;
    var rows = bots.map(function (b) { return { name: b.name, score: axis.round(b.score), you: false }; });
    rows.push({ name: "你", score: axis.round(mine), you: true });
    rows.sort(function (a, b) { var d = b.score - a.score; return d !== 0 ? d : (a.you ? -1 : b.you ? 1 : (a.name < b.name ? -1 : 1)); }); // 同分玩家優先
    rows.forEach(function (r, i) { r.rank = i + 1; r.prize = prizeFor(i + 1, pool); });
    return rows;
  }
  function prizeFor(rank, pool) { return rank <= SPLIT.length ? Math.round((pool == null ? POOL : pool) * SPLIT[rank - 1]) : 0; }
  function myRank(o, gkey) { o = o || load(); var lb = leaderboard(o, gkey); for (var i = 0; i < lb.length; i++) if (lb[i].you) return lb[i].rank; return lb.length; }

  /* 中央掛鉤：每筆結算 → 依賽事宣告的計分軸累積（先處理逾期結算，避免把分數加到已結束的期）。
   * ⚠️ 旗艦 slot／小雞把同一局拆成 `record(bet,0)` 與 `record(0,win)` 兩次結算（views/slot.js:434/477）
   *   ⇒ win-only 那半也必須進得來，否則 bestWin 軸永遠收不到 slot 的贏分。
   * ⚠️ **分數沒變就完全不動**（不結算、不寫檔、不通知）＝流水軸下 win-only 呼叫是完全的 no-op，
   *   這正是「新增一條餵入路徑卻零回歸」的所在（見 selftest scoreAxis/zero-regression）。 */
  function record(bet, win, game) {
    bet = Math.round(bet || 0); win = Math.round(win || 0);
    if (bet <= 0 && win <= 0) return;
    var ctx = { bet: bet, win: win, game: game || "" };
    var o = load(), axis = axisFor(o.axis), gkey = groupKeyOf(o, ctx);
    var g = gkey ? (o.groups || {})[gkey] : null, curG = g ? g.score : 0;
    // 尚未建立的分組亦以 0 試算 ⇒ 分數不會變時連「建組（含種 49 個 bot）」都不做
    if (axis.accum(o.score, ctx) === o.score && !(gkey && axis.accum(curG, ctx) !== curG)) return;
    maybeSettle();
    o = load(); axis = axisFor(o.axis);
    o.score = axis.accum(o.score, ctx);
    if (gkey) {
      o.groups = o.groups || {};
      if (!o.groups[gkey]) o.groups[gkey] = { score: 0, bots: seedBots(axis) };
      o.groups[gkey].score = axis.accum(o.groups[gkey].score, ctx);
    }
    save(KEY_T, o); notify();
  }

  function settle(o) {
    o = o || load();
    if (o.settled) return ls(KEY_L, null) || { rank: 0, prize: 0, total: 0 }; // 冪等：同一期不重複派彩
    var lb = leaderboard(o), rank = myRank(o), prize = prizeFor(rank), groups = [];
    if (o.groupBy === "game") {
      // 分組賽：每組各自一份榜、各自一份獎池（總池平分、餘數留房家）⇒ Σ 支出 ≤ 原池
      var keys = groupKeys(o), per = groupPool(o), best = null;
      prize = 0;
      keys.forEach(function (k) {
        var gr = myRank(o, k), gp = prizeFor(gr, per);
        prize += gp;
        groups.push({ game: k, rank: gr, prize: gp, total: leaderboard(o, k).length });
        if (!best || gr < best.rank) best = { rank: gr, total: leaderboard(o, k).length };
      });
      if (best) { rank = best.rank; lb = { length: best.total }; }
    }
    o.settled = true; save(KEY_T, o); // 先落地已結算旗標，再派彩，杜絕重入雙倍
    if (prize > 0 && HL.bonus) HL.bonus.add(prize, { source: "錦標賽獎金" });
    var res = { eventName: o.name, rank: rank, prize: prize, total: lb.length, when: nowMs(), groups: groups };
    var prior = hist();   // 先取，否則遷移分支讀回本筆
    save(KEY_L, res);
    save(KEY_H, [res].concat(prior).slice(0, 8));
    if (prize > 0) {
      if (HL.ui) HL.ui.toast("🏆 錦標賽第 " + rank + " 名！獎金 " + money(prize) + " 已入獎金錢包", "ok");
      if (HL.notify) HL.notify.add({ ic: "🏆", title: "錦標賽結算：第 " + rank + " 名", text: o.name + " 獎金 " + money(prize) + " 已入獎金錢包。" });
    } else if (HL.notify) {
      HL.notify.add({ ic: "🏁", title: "錦標賽結算：第 " + rank + " 名", text: o.name + " 已結束，本期未進獎金名次，下期再衝！" });
    }
    return res;
  }
  function startNew(spec) { var ne = freshEvent(spec); save(KEY_T, ne); notify(); return ne; }
  function cycleEvent(spec) { var r = settle(load()); startNew(spec); return r; }      // 唯一結算路徑：結算→開新期
  function maybeSettle() { if (nowMs() >= load().endAt) { cycleEvent(); return true; } return false; } // 逾期自動結算（懶觸發）
  function settleAndCycle(spec) { return cycleEvent(spec); }                    // Demo 立即結算本期（可指定下一期賽制）

  // bot 爬升：僅在賽事頁觀看時由 view 每秒呼叫（離頁不爬升＝不暴衝、不空轉 localStorage）
  function climbBots() { var o = load(); for (var i = 0; i < o.bots.length; i++) o.bots[i].score += rint(0, 120); save(KEY_T, o); notify(); }
  function viewTick() { if (maybeSettle()) return; climbBots(); }

  function status(gkey) {
    maybeSettle();
    var o = load(), axis = axisFor(o.axis);
    var g = gkey ? (o.groups || {})[gkey] : null;
    var mine = g ? (g.score || 0) : o.score;
    var pool = gkey ? groupPool(o) : POOL;
    return {
      id: o.id, name: o.name, endAt: o.endAt, pool: pool, players: o.players,
      score: axis.round(mine), myRank: myRank(o, gkey), leaderboard: leaderboard(o, gkey),
      prizeFor: function (rank) { return prizeFor(rank, pool); }, lastResult: hist()[0] || null,
      axis: { id: axis.id || o.axis || "turnover", label: axis.label, unit: axis.unit },
      groupBy: o.groupBy || "none", groups: groupKeys(o), group: gkey || ""
    };
  }
  function subscribe(fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }

  HL.tournament = {
    record: record, status: status, leaderboard: leaderboard, myRank: myRank, prizeFor: prizeFor,
    settleAndCycle: settleAndCycle, viewTick: viewTick, subscribe: subscribe, SPLIT: SPLIT, pool: function () { return POOL; },
    history: hist,
    startNew: startNew   // #85：開一期指定賽制的新賽事 startNew({ name, axis:"bestMult", groupBy:"game" })
  };
})(window);

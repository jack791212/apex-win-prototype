/*
 * Apex Win｜錦標賽 / Slot Race（#15）限時積分賽
 * 玩法：限時賽期內「有效押注（turnover）」即積分；即時排行榜（mock bot 持續爬升 + 真玩家以
 *   中央掛鉤 HL.liveStats.record 計分）；賽末依名次階梯自動派彩到獎金錢包 HL.bonus，並開新一期。
 * 純前端 localStorage、零牌照。掛鉤：live-stats.js 的 record() 尾端呼叫 HL.tournament.record(bet)。
 * 註冊於 window.HL.tournament。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;  // T20：收斂至共用 localStorage 持久化出口
  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  var KEY_T = "HL_TOURNEY", KEY_L = "HL_TOURNEY_LAST";
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

  function nowMs() { return Date.now(); }
  function botPool() { return (HL.mock && HL.mock.fakeNames) ? HL.mock.fakeNames.slice() : ["Ace", "Neo", "Luna", "Rex", "Max", "Kai", "Zoe", "Sky", "Fox", "Jin", "Mia", "Leo"]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function freshEvent() {
    var pool = shuffle(botPool()), bots = [];
    for (var i = 0; i < BOTS; i++) bots.push({ name: pool[i % pool.length] + rint(10, 99), score: rint(1500, 90000) });
    return { id: "T" + nowMs(), name: NAMES[rint(0, NAMES.length - 1)], startAt: nowMs(), endAt: nowMs() + DURATION, pool: POOL, score: 0, bots: bots, players: rint(3000, 12000) };
  }
  function load() { var o = ls(KEY_T, null); if (!o || !o.id || !o.bots) { o = freshEvent(); save(KEY_T, o); } return o; }
  function notify() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }

  function leaderboard(o) {
    o = o || load();
    var rows = o.bots.map(function (b) { return { name: b.name, score: Math.round(b.score), you: false }; });
    rows.push({ name: "你", score: Math.round(o.score), you: true });
    rows.sort(function (a, b) { var d = b.score - a.score; return d !== 0 ? d : (a.you ? -1 : b.you ? 1 : (a.name < b.name ? -1 : 1)); }); // 同分玩家優先
    rows.forEach(function (r, i) { r.rank = i + 1; r.prize = prizeFor(i + 1); });
    return rows;
  }
  function prizeFor(rank) { return rank <= SPLIT.length ? Math.round(POOL * SPLIT[rank - 1]) : 0; }
  function myRank(o) { o = o || load(); var lb = leaderboard(o); for (var i = 0; i < lb.length; i++) if (lb[i].you) return lb[i].rank; return lb.length; }

  // 中央掛鉤：每筆有效押注 → 累積積分（先處理逾期結算，避免把分數加到已結束的期）
  function record(bet) { bet = Math.round(bet || 0); if (bet <= 0) return; maybeSettle(); var o = load(); o.score += bet; save(KEY_T, o); notify(); }

  function settle(o) {
    o = o || load();
    if (o.settled) return ls(KEY_L, null) || { rank: 0, prize: 0, total: 0 }; // 冪等：同一期不重複派彩
    var lb = leaderboard(o), rank = myRank(o), prize = prizeFor(rank);
    o.settled = true; save(KEY_T, o); // 先落地已結算旗標，再派彩，杜絕重入雙倍
    if (prize > 0 && HL.bonus) HL.bonus.add(prize);
    var res = { eventName: o.name, rank: rank, prize: prize, total: lb.length, when: nowMs() };
    save(KEY_L, res);
    if (prize > 0) {
      if (HL.ui) HL.ui.toast("🏆 錦標賽第 " + rank + " 名！獎金 " + money(prize) + " 已入獎金錢包", "ok");
      if (HL.notify) HL.notify.add({ ic: "🏆", title: "錦標賽結算：第 " + rank + " 名", text: o.name + " 獎金 " + money(prize) + " 已入獎金錢包。" });
    } else if (HL.notify) {
      HL.notify.add({ ic: "🏁", title: "錦標賽結算：第 " + rank + " 名", text: o.name + " 已結束，本期未進獎金名次，下期再衝！" });
    }
    return res;
  }
  function startNew() { var ne = freshEvent(); save(KEY_T, ne); notify(); return ne; }
  function cycleEvent() { var r = settle(load()); startNew(); return r; }      // 唯一結算路徑：結算→開新期
  function maybeSettle() { if (nowMs() >= load().endAt) { cycleEvent(); return true; } return false; } // 逾期自動結算（懶觸發）
  function settleAndCycle() { return cycleEvent(); }                            // Demo 立即結算本期

  // bot 爬升：僅在賽事頁觀看時由 view 每秒呼叫（離頁不爬升＝不暴衝、不空轉 localStorage）
  function climbBots() { var o = load(); for (var i = 0; i < o.bots.length; i++) o.bots[i].score += rint(0, 120); save(KEY_T, o); notify(); }
  function viewTick() { if (maybeSettle()) return; climbBots(); }

  function status() {
    maybeSettle();
    var o = load();
    return { id: o.id, name: o.name, endAt: o.endAt, pool: o.pool, players: o.players, score: Math.round(o.score), myRank: myRank(o), leaderboard: leaderboard(o), prizeFor: prizeFor, lastResult: ls(KEY_L, null) };
  }
  function subscribe(fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }

  HL.tournament = {
    record: record, status: status, leaderboard: leaderboard, myRank: myRank, prizeFor: prizeFor,
    settleAndCycle: settleAndCycle, viewTick: viewTick, subscribe: subscribe, SPLIT: SPLIT, pool: function () { return POOL; }
  };
})(window);

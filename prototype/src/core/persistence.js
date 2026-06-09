/*
 * Apex Win｜玩家資料自動寫回
 * 訂閱 HL.state，只比對「玩家資料切片」(balance/currency/wallet/arenaStats摘要)，
 * 切片有變才 debounce 寫回 Supabase。每秒的假房間 tick 因切片未變被過濾，
 * 因此所有 view 的扣加分程式碼一行都不用改。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var last = null, timer = null;

  function summaryOnly(stats) {
    var s = stats || {};
    return { matches: s.matches || 0, wins: s.wins || 0, losses: s.losses || 0, profit: s.profit || 0, streak: s.streak || 0, best: s.best || 0, bigWin: s.bigWin || 0, hostNet: s.hostNet || 0 };
  }
  function sliceKey(s) { return JSON.stringify({ b: s.balance, c: s.currency, w: s.wallet, a: summaryOnly(s.arenaStats) }); }

  if (HL.state && HL.state.subscribe) {
    HL.state.subscribe(function (s) {
      if (!HL.auth || !HL.auth.backend() || !HL.auth.user()) return; // 未登入 / Demo 模式 不寫
      var key = sliceKey(s);
      if (key === last) return;            // 玩家切片沒變 → 跳過（過濾房間 tick 等）
      last = key;
      clearTimeout(timer);
      timer = setTimeout(function () {
        HL.api.saveProfile({ balance: s.balance, currency: s.currency, wallet: s.wallet, arena_stats: summaryOnly(s.arenaStats) });
      }, 800);                              // debounce：連續扣分只寫最後一次
    });
  }

  // 供 hydrate 後設定基準，避免一登入就立刻寫一次
  HL.persistence = { markSynced: function () { last = HL.state ? sliceKey(HL.state.get()) : null; } };
})(window);

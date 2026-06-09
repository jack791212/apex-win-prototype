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

  // Phase 4 防作弊：balance 與 arena_stats 改由伺服器 RPC(play_battle) 原子結算與擁有，
  // 前端「不再寫回」這兩項（否則 console 改餘額仍會被存）。前端只寫純顯示偏好(currency)。
  function sliceKey(s) { return JSON.stringify({ c: s.currency, w: s.wallet }); }

  if (HL.state && HL.state.subscribe) {
    HL.state.subscribe(function (s) {
      if (!HL.auth || !HL.auth.backend() || !HL.auth.user()) return; // 未登入 / Demo 模式 不寫
      var key = sliceKey(s);
      if (key === last) return;            // 顯示偏好沒變 → 跳過
      last = key;
      clearTimeout(timer);
      timer = setTimeout(function () {
        HL.api.saveProfile({ currency: s.currency, wallet: s.wallet }); // 不含 balance / arena_stats（伺服器擁有）
      }, 800);
    });
  }

  // 供 hydrate 後設定基準，避免一登入就立刻寫一次
  HL.persistence = { markSynced: function () { last = HL.state ? sliceKey(HL.state.get()) : null; } };
})(window);

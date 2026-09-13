/* Apex Win｜桌遊分級回饋／淨額 roll-up 的單一真相（T52；5 款桌遊原各存一份逐字相同的副本）。
 * 瀏覽器＝掛 HL.tableTier 供延遲載入的桌遊 view 取用；node＝各 view require 後原樣再匯出＝「驗的即玩的」。
 * ⚠️ 本檔**不在首屏**（不在 index.html）：由 lazy-games 清單的 `dep` 帶著走，只有玩家真的開桌遊時才下載。
 *   理由＝eager 放法實測要吃掉 1,949B／當時全部餘裕 2,229B 的近九成；完整量測與判準見 intel/DEBT.md T52。 */
(function (global) {
  "use strict";
  var TIER_EPIC = 50, TIER_MEGA = 15, TIER_BIG = 5;   // 回收倍數門檻（gross return multiple）
  var ROLLUP_STEPS = 14, ROLLUP_MS = 616;             // 淨額 count-up 分步數（>1＝不是一次跳號）／總時長
  function winMult(payout, staked) { return staked > 0 ? payout / staked : 0; }
  function winTier(payout, staked) {
    var x = winMult(payout, staked);
    return x >= TIER_EPIC ? "epic" : x >= TIER_MEGA ? "mega" : x >= TIER_BIG ? "big" : "";
  }
  function tierLabel(tier) { return tier === "epic" ? "史詩大獎 EPIC！" : tier === "mega" ? "超級大獎 MEGA！" : tier === "big" ? "大獎 BIG！" : ""; }
  function rollupSteps() { return ROLLUP_STEPS; }
  function rollupStepMs() { return Math.round(ROLLUP_MS / ROLLUP_STEPS); }
  function rollupValueAt(net, step) { return step >= ROLLUP_STEPS ? net : Math.round(net * step / ROLLUP_STEPS); } // 末步精確＝net
  var API = {
    TIER_EPIC: TIER_EPIC, TIER_MEGA: TIER_MEGA, TIER_BIG: TIER_BIG, ROLLUP_STEPS: ROLLUP_STEPS, ROLLUP_MS: ROLLUP_MS,
    winMult: winMult, winTier: winTier, tierLabel: tierLabel,
    rollupSteps: rollupSteps, rollupStepMs: rollupStepMs, rollupValueAt: rollupValueAt
  };
  (global.HL = global.HL || {}).tableTier = API;   // 瀏覽器出口（缺它＝view 載入即 throw＝失敗可見，不會靜默退化）
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);

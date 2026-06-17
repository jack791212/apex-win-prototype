/*
 * Apex Win｜雙金流模式抽象（目標 4）
 * 休閒模式 casual：遊戲幣（點數）；可商城購買、玩家間交易；官方不提供真金兌換。
 * 真金模式 real  ：法幣 + 加密貨幣；儲值/提款/兌換功能先做好，但「待牌照核發」才開放。
 * 依市場/管轄(jurisdiction)切換。預設 casual（最安全：無真金）。
 * 模式切換：站內 ⚙ DEMO → 金流模式 / 真金牌照（存於 state，不用網址參數）。註冊於 window.HL.money。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  function st() { return (HL.state && HL.state.get) ? HL.state.get() : {}; }

  // 金流模式由站內設定（⚙ DEMO → 金流模式）切換、存於 state；不用網址參數
  function mode() { return st().moneyMode || "casual"; }
  function isCasual() { return mode() === "casual"; }
  function isReal() { return mode() === "real"; }
  function jurisdiction() { return st().jurisdiction || "TW"; }
  function licensed() { return !!st().realLicensed; }              // 真金牌照是否核發（預設 false）
  function canWithdraw() { return isReal() && licensed(); }        // 提款/真金兌換：真金模式 + 已核照才開放
  function canTrade() { return isCasual(); }                       // 玩家間交易：休閒模式才有（遊戲幣）
  function canBuyCoins() { return isCasual(); }                    // 商城購買遊戲幣：休閒模式
  function coinName() { return isCasual() ? "遊戲幣" : "真金餘額"; }
  function modeLabel() { return isCasual() ? "休閒模式 · 遊戲幣" : (licensed() ? "真金模式" : "真金模式（待牌照）"); }
  // 各模式允許的幣別（真金未核照前仍可顯示介面、但不可實際提款）
  function currencies() { return isCasual() ? ["COIN"] : ["TWD", "USD", "BTC", "ETH", "USDT"]; }

  function setMode(m) {
    if (m !== "casual" && m !== "real") return;
    HL.state.set({ moneyMode: m });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.app && HL.app.refresh) HL.app.refresh();
  }
  function setJurisdiction(j) { HL.state.set({ jurisdiction: j }); }

  HL.money = {
    mode: mode, isCasual: isCasual, isReal: isReal, jurisdiction: jurisdiction,
    licensed: licensed, canWithdraw: canWithdraw, canTrade: canTrade, canBuyCoins: canBuyCoins,
    coinName: coinName, modeLabel: modeLabel, currencies: currencies,
    setMode: setMode, setJurisdiction: setJurisdiction
  };
})(window);

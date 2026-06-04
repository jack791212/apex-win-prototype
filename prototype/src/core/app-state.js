/*
 * Apex Win｜全域狀態
 * 單機 Prototype：狀態僅存在記憶體，重新整理即重置。
 * 註冊於 window.HL.state。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  var INITIAL_BALANCE = 28560; // 對齊設計圖 NT$ 28,560

  var state = {
    theme: "dark",
    isDemo: true,
    view: "lobby", // lobby | duel
    activePoolId: null,
    balance: INITIAL_BALANCE, // 台幣(TWD) 可玩餘額
    currency: "TWD", // 目前顯示幣別，預設台幣
    wallet: { USD: 0, BTC: 0, ETH: 0.03, LTC: 0, TRX: 0, XRP: 0, DOGE: 0, SOL: 0, BNB: 0 }, // 其他幣別 Demo 餘額（假儲值之後做）
    aiOpen: true, // 你的專屬夥伴面板開關
    lossLimitRemaining: 5000, // 安全遊戲：今日剩餘額度
    leaderboard: HL.mock.makeLeaderboard(),
    feed: [],
    bigWins: HL.mock.seedBigWins(14), // 大獎牆資料（最多保留 200）
    // 全球獎
    myFaction: null, // ally | horde | null（本期選擇後不可更換）
    war: { cells: HL.mock.initWarCells(), winner: null }, // 國戰地圖
    myEffectiveBet: 680, // WORLD EVENT 我的有效押注（Demo 進度）
    globeFeed: [], // 全球獎事件動態
    arenaRooms: HL.mock.makeArenaRooms(9), // 競技場玩家開房房間
    roomSeq: 2000, // 開房流水號
    // Demo 測試工具設定
    demo: {
      result: "random", // random | win | lose | fakeBig
      activity: "normal", // low | normal | high
      bigWinSpeed: "normal" // slow | normal | fast（大獎牆刷新速度）
    }
  };

  var listeners = [];
  function get() { return state; }
  function set(patch) {
    Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    listeners.forEach(function (fn) { fn(state); });
  }
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  function resetBalance() {
    set({ balance: INITIAL_BALANCE, lossLimitRemaining: 5000 });
  }
  function resetLeaderboard() {
    set({ leaderboard: HL.mock.makeLeaderboard() });
  }

  HL.state = {
    get: get, set: set, subscribe: subscribe,
    resetBalance: resetBalance, resetLeaderboard: resetLeaderboard,
    INITIAL_BALANCE: INITIAL_BALANCE
  };
})(window);

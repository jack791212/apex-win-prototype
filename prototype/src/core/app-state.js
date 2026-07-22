/*
 * Apex Win｜全域狀態
 * 單機 Prototype：狀態僅存在記憶體，重新整理即重置。
 * 註冊於 window.HL.state。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // 真站(live)：從 0 起、要玩先「儲值」（決策3）；假站(demo)：對齊設計圖 NT$ 28,560
  var LIVE = !!(HL.site && HL.site.isLive());
  var INITIAL_BALANCE = LIVE ? 0 : 28560;

  var state = {
    theme: "dark",
    isDemo: true,
    user: null, // 真會員模式登入後的 Supabase user（Demo 模式為 null）
    profile: null, // 真會員個人資料 { display_name, avatar }（Demo 模式為 null）
    view: "lobby", // lobby | casino | slot | chicken | arena | bounty | vsslot | globe | game(動態註冊遊戲)
    activePoolId: null,
    activeGameId: null, // view==="game" 時，對應 HL.games 登錄表的遊戲 id
    balance: INITIAL_BALANCE, // 台幣(TWD) 可玩餘額
    currency: "TWD", // 目前顯示幣別，預設台幣
    moneyMode: "casual", // 金流模式：casual(休閒/遊戲幣) | real(真金:法幣+加密，待牌照才開放)
    jurisdiction: "TW",  // 市場/管轄（之後依此切換可用模式與幣別）
    realLicensed: false, // 真金牌照核發後改 true，才開放提款/兌換
    wallet: { USD: 0, BTC: 0, ETH: LIVE ? 0 : 0.03, LTC: 0, TRX: 0, XRP: 0, DOGE: 0, SOL: 0, BNB: 0 }, // 其他幣別餘額（真站全 0）
    walletTxns: [], // Demo 模式儲值/提款紀錄（會員模式由 wallet_txns 資料表記帳）
    aiOpen: true, // 你的專屬夥伴面板開關
    lossLimitRemaining: 5000, // 安全遊戲：今日剩餘額度
    leaderboard: LIVE ? [] : HL.mock.makeLeaderboard(), // 真站：無假玩家排行榜
    feed: [],
    bigWins: LIVE ? [] : HL.mock.seedBigWins(14), // 大獎牆資料（真站無假報獎；最多保留 200）
    // 全球獎
    myEffectiveBet: LIVE ? 0 : 680, // WORLD EVENT 我的有效押注（真站從 0）
    arenaRooms: LIVE ? [] : HL.mock.makeArenaRooms(9), // 競技場玩家開房房間（真站：無假房）
    roomSeq: 2000, // 開房流水號
    // 對押競技玩家生涯戰績（你主動挑戰的 1v1；history 含逐局分數供回放，上限 30 場）
    arenaStats: { matches: 0, wins: 0, losses: 0, profit: 0, streak: 0, best: 0, bigWin: 0, hostNet: 0, history: [] },
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
  function resetArenaStats() {
    set({ arenaStats: { matches: 0, wins: 0, losses: 0, profit: 0, streak: 0, best: 0, bigWin: 0, hostNet: 0, history: [] } });
  }

  HL.state = {
    get: get, set: set, subscribe: subscribe,
    resetBalance: resetBalance, resetLeaderboard: resetLeaderboard, resetArenaStats: resetArenaStats,
    INITIAL_BALANCE: INITIAL_BALANCE
  };
})(window);

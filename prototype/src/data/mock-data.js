/*
 * Apex Win｜集中式 Mock Data
 * =============================================================
 * 全部為 Demo 假資料：非真實玩家、非真實金額、非真實遊戲、非正式服務。
 * 無後端、無資料庫，僅存在前端記憶體。
 * 所有需要假資料的模組一律從 window.HL.mock 取用，不得各自硬寫。
 * =============================================================
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  var DEMO_NOTICE = "Demo 假資料";

  // 假玩家名單（供對押池 / Feed / 排行榜共用）
  var fakeNames = [
    "WinMaster", "CryptoKing", "LuckyStar", "PoolHunter", "BigBoss",
    "MoonLover", "Allen162", "BillyDemon", "Good777", "NeonCat",
    "DragonX", "QueenB", "HighRoller", "NightOwl", "AcePilot",
    "GoldRush", "SilentBet", "TurboWin", "MegaFox", "ZenMode"
  ];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rint(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }

  // 世界活動（Hero）
  var worldEvent = {
    tag: "世界活動 · WORLD EVENT",
    title: "DRAGON SIEGE",
    subtitle: "全服玩家共同挑戰，擊退魔龍解鎖宇宙寶藏！",
    pool: 18745320,
    prizeLabel: "全服累積總獎池",
    pct: 78,
    players: 12480, // 參與玩家數
    endsInSec: 2 * 86400 + 14 * 3600 + 32 * 60 + 18 // 02天 14:32:18
  };

  // 对押池（核心玩法）— A vs B 類型，含平台抽水 2%
  var pools = [
    {
      id: "pool_ab", name: "A vs B", icon: "A", color: "#36a6ff",
      a: { label: "A", pct: 62, color: "#36a6ff" },
      b: { label: "B", pct: 38, color: "#9d80ff" },
      pool: 512450, rakePct: 2, endsInSec: 88
    },
    {
      id: "pool_rb", name: "紅或黑", icon: "♦", color: "#ff5d6c",
      a: { label: "紅", pct: 45, color: "#ff5d6c" },
      b: { label: "黑", pct: 55, color: "#8895b3" },
      pool: 345770, rakePct: 2, endsInSec: 135
    },
    {
      id: "pool_bs", name: "大或小", icon: "🎲", color: "#2fd17a",
      a: { label: "大", pct: 48, color: "#2fd17a" },
      b: { label: "小", pct: 52, color: "#36a6ff" },
      pool: 210890, rakePct: 2, endsInSec: 45
    },
    {
      id: "pool_oe", name: "單或雙", icon: "⚅", color: "#ffb524",
      a: { label: "單", pct: 51, color: "#ffb524" },
      b: { label: "雙", pct: 49, color: "#9d80ff" },
      pool: 178660, rakePct: 2, endsInSec: 62
    }
  ];

  // 假排行榜（今日）
  function makeLeaderboard() {
    return fakeNames.slice(0, 8).map(function (n, i) {
      return {
        rank: i + 1,
        name: n,
        profit: rint(5, 200) * 1000 - i * 8000,
        streak: rint(0, 9),
        vip: rint(1, 6)
      };
    }).sort(function (a, b) { return b.profit - a.profit; })
      .map(function (r, i) { r.rank = i + 1; return r; });
  }

  // 動態 Feed 範本（隨機生成）
  function makeFeedEvent() {
    var name = pick(fakeNames) + rint(10, 99);
    var kinds = [
      function () { return { txt: name + " 加入了對押池", type: "join" }; },
      function () { return { txt: name + " 贏得 " + HL.dom.money(rint(2, 120) * 1000), type: "win" }; },
      function () { return { txt: name + " 達成 " + rint(3, 8) + " 連勝", type: "streak" }; },
      function () { return { txt: name + " 押注 " + pick(["A", "B", "紅", "黑", "大", "小"]), type: "bet" }; }
    ];
    return pick(kinds)();
  }

  // 幣別（Demo）：TWD 為預設，其餘為日後假儲值用
  var currencies = [
    { code: "TWD", name: "台幣", ic: "NT", color: "#ffb524" },
    { code: "USD", name: "美元", ic: "$", color: "#2fd17a" },
    { code: "BTC", name: "Bitcoin", ic: "₿", color: "#f7931a" },
    { code: "ETH", name: "Ethereum", ic: "Ξ", color: "#627eea" },
    { code: "LTC", name: "Litecoin", ic: "Ł", color: "#9aa3b2" },
    { code: "TRX", name: "TRON", ic: "T", color: "#ff4b4b" },
    { code: "XRP", name: "XRP", ic: "X", color: "#23b6e6" },
    { code: "DOGE", name: "Dogecoin", ic: "Ð", color: "#c2a633" },
    { code: "SOL", name: "Solana", ic: "S", color: "#9945ff" },
    { code: "BNB", name: "BNB", ic: "B", color: "#f3ba2f" }
  ];

  // 遊戲卡（Demo）：熱門 / 最新（封面以漸層 + 文字 placeholder）
  var hotGames = [
    { title: "3 Cursed Chests", provider: "Hacksaw Gaming", fav: 235, c1: "#0e7a5f", c2: "#0a3f5f" },
    { title: "Hot Fiesta", provider: "Pragmatic Play", fav: 3774, c1: "#5a5a5a", c2: "#222831" },
    { title: "Neon Sweet World", provider: "Ludoland", fav: 384, c1: "#19c37d", c2: "#0e6a4f" },
    { title: "Munchies", provider: "Nolimit City", fav: 247, c1: "#2b6cff", c2: "#1a2a6e" },
    { title: "Leatherheads", provider: "Kitsune Studios", fav: 107, c1: "#c0392b", c2: "#6e1a1a" },
    { title: "Clash of Gods", provider: "BGaming", fav: 126, c1: "#1f3a8a", c2: "#0e1a4a" },
    { title: "Mummy Mischief", provider: "Relax Gaming", fav: 236, c1: "#54606e", c2: "#1a1f2a" }
  ];
  var newGames = [
    { title: "Rise of Fortuna", provider: "Hacksaw Gaming", fav: 68, c1: "#ff9f1c", c2: "#b85c00" },
    { title: "Sanatorium Secrets", provider: "Pragmatic Play", fav: 286, c1: "#6b6b6b", c2: "#2b2b2b" },
    { title: "True Grit 2", provider: "Nolimit City", fav: 299, c1: "#16a3a3", c2: "#0e5a5a" },
    { title: "Wild West Express", provider: "Novomatic", fav: 75, c1: "#ff7a1c", c2: "#b83a00" },
    { title: "The Sopranos", provider: "Peter & Sons", fav: 65, c1: "#7c3aed", c2: "#3a1a6e" },
    { title: "Candy Rush", provider: "Pragmatic Play", fav: 262, c1: "#9aa3b2", c2: "#4a4f5a" },
    { title: "Gearlab Genius", provider: "Bullshark Games", fav: 11, c1: "#ff7a3c", c2: "#b83a1a" }
  ];

  // 促銷活動橫幅（Demo）
  var promos = [
    { tag: "新玩家專屬", title: "100% 首儲獎金", sub: "最高 NT$30,000 + 200 免費旋轉", ic: "🎰", c1: "#3b1e6e", c2: "#7c5cff" },
    { tag: "天天回饋", title: "每日返水 1.5%", sub: "當日下注自動回饋彩金", ic: "💰", c1: "#16345f", c2: "#36a6ff" },
    { tag: "限時活動", title: "對押池抽水減半", sub: "競技場狂歡，現在加入", ic: "⚔️", c1: "#6e1e3a", c2: "#ff5d6c" },
    { tag: "尊榮禮遇", title: "VIP 俱樂部開放", sub: "升級解鎖專屬獎勵", ic: "💎", c1: "#13524a", c2: "#2fd17a" },
    { tag: "週末加碼", title: "週末充值送彩金", sub: "儲值最高加贈 50%", ic: "🎁", c1: "#5f4a13", c2: "#ffb524" },
    { tag: "好友同樂", title: "推薦好友共享獎勵", sub: "邀請越多，回饋越多", ic: "🤝", c1: "#3a1e6e", c2: "#9d80ff" }
  ];

  // 大獎牆（Demo）
  var winTypes = [
    { t: "SLOT", ic: "🎰", color: "#9d80ff", games: ["Gates of Olympus", "Sweet Bonanza 1000", "Dragon Spire", "Sugar Rush 1000", "Wanted Dead or A Wild"] },
    { t: "對戰", ic: "⚔️", color: "#36a6ff", games: ["A vs B 對押池", "紅或黑", "大或小", "單或雙"] },
    { t: "JACKPOT", ic: "💎", color: "#ffb524", games: ["Mega Jackpot", "Galaxy Rush", "Dragon Siege"] }
  ];
  function makeBigWin() {
    var gt = pick(winTypes);
    var hidden = Math.random() < 0.15;
    var name = hidden ? "隱身玩家" : (pick(fakeNames).slice(0, 4) + "***" + rint(10, 99));
    var bet = pick([100, 200, 500, 1000, 2000, 5000]);
    var win = bet * pick([5, 8, 12, 20, 38, 66, 120, 250]);
    return { time: Date.now(), type: gt.t, ic: gt.ic, color: gt.color, name: name, hidden: hidden, game: pick(gt.games), bet: bet, win: win };
  }
  function seedBigWins(n) {
    var arr = [];
    for (var i = 0; i < n; i++) { var w = makeBigWin(); w.time = Date.now() - i * 12000; arr.push(w); }
    return arr;
  }

  // 聊天室（Demo）
  var chatLines = ["這房好熱 🔥", "剛剛有人爆了", "競技場適合刷手感", "差一點進前三", "再來一局", "Hot Streak 今天很兇", "GG", "上車 🚀", "恭喜樓上", "求帶", "穩住", "梭了"];
  function makeChatMsg() {
    if (Math.random() < 0.12) return { bot: true, name: "RainBot", text: rint(100, 500) + " 位玩家共獲得 NT$" + rint(20, 99) + ".00 雨露" };
    return { name: pick(fakeNames) + rint(10, 99), text: pick(chatLines), vip: rint(1, 6) };
  }

  // ===== 全球獎（全平台事件中心）=====
  // WORLD EVENT 全服事件
  var globeEvent = {
    name: "Dragon Siege", period: 27, pool: 18745320, players: 12480,
    threshold: 1000, endsInSec: 2 * 86400 + 14 * 3600 + 32 * 60 + 18, drawAt: "06/06 21:00"
  };
  function makeLastWinners() {
    var arr = [];
    for (var i = 0; i < 6; i++) arr.push({
      name: pick(fakeNames).slice(0, 4) + "***" + rint(10, 99),
      prize: pick([50, 80, 120, 200, 360, 500]) * 1000,
      type: pick(["全服彩池", "幸運抽選", "貢獻加碼"]),
      at: "06/03 21:00"
    });
    return arr.sort(function (a, b) { return b.prize - a.prize; });
  }
  function makeContributors() {
    var arr = [];
    for (var i = 0; i < 8; i++) arr.push({ name: pick(fakeNames) + rint(10, 99), bet: rint(5, 200) * 1000, score: rint(500, 9999) });
    arr.sort(function (a, b) { return b.score - a.score; });
    return arr.map(function (r, i) { r.rank = i + 1; return r; });
  }

  // 虛擬偶像直播主
  var idols = [
    { name: "AI Luna", style: "甜美", game: "百家樂", emoji: "🧝‍♀️", c1: "#7c5cff", c2: "#3a1f6e", fans: 128400 },
    { name: "Aurora", style: "冷靜", game: "骰寶", emoji: "💃", c1: "#36a6ff", c2: "#143a6e", fans: 86200 },
    { name: "Blaze", style: "熱血", game: "對押挑戰", emoji: "🦸‍♀️", c1: "#ff5d6c", c2: "#6e1a2a", fans: 73900 },
    { name: "Nyx", style: "神秘", game: "小遊戲", emoji: "🧛‍♀️", c1: "#9d80ff", c2: "#2a1f4f", fans: 51200 }
  ];

  // 國戰勢力
  var factions = {
    ally: { key: "ally", name: "聯盟", emoji: "🛡️", color: "#36a6ff" },
    horde: { key: "horde", name: "部落", emoji: "⚔️", color: "#ff5d6c" }
  };
  function initWarCells() {
    var n = 11, cells = [];
    for (var i = 0; i < n; i++) cells.push({ i: i, owner: i <= 1 ? "ally" : (i >= 9 ? "horde" : null), last: null });
    return cells;
  }

  // ===== 娛樂城（傳統 web casino）遊戲目錄 =====
  var casinoProviders = ["Pragmatic Play", "Evolution", "Play'n GO", "Hacksaw Gaming", "Nolimit City", "Red Tiger", "Relax Gaming", "BGaming", "Push Gaming", "PG Soft"];
  var casinoCats = [
    { key: "originals", name: "Originals" }, // Apex 自製原創遊戲館（之後在此實作遊戲）
    { key: "slots", name: "老虎機" },
    { key: "live", name: "真人娛樂" },
    { key: "table", name: "桌上遊戲" },
    { key: "jackpot", name: "累積彩金" },
    { key: "gameshow", name: "遊戲節目" }
  ];
  var _titles = {
    slots: ["Sugar Rush 1000", "Gates of Olympus", "Sweet Bonanza", "Big Bass Bonanza", "Book of Dead", "Wanted Dead or A Wild", "Le Bandit", "San Quentin", "Money Train 3", "Starlight Princess", "The Dog House", "Fruit Party", "Rise of Olympus", "Reactoonz", "Fire in the Hole 2", "Mental"],
    live: ["Lightning Roulette", "Blackjack VIP", "Speed Baccarat", "Dream Catcher", "Mega Ball", "Lightning Dice", "Football Studio", "Immersive Roulette"],
    table: ["European Roulette", "Blackjack Classic", "Baccarat", "Casino Hold'em", "Sic Bo", "Dragon Tiger", "Three Card Poker", "Pai Gow"],
    jackpot: ["Mega Moolah", "Divine Fortune", "Hall of Gods", "Major Millions", "Jackpot Giant", "Wheel of Wishes"],
    gameshow: ["Crazy Time", "Monopoly Big Baller", "Funky Time", "Deal or No Deal", "Mega Wheel", "Lightning Storm"]
  };
  var _palette = {
    slots: [["#7c3aed", "#3a1a6e"], ["#ff7a1c", "#b83a00"], ["#19c37d", "#0e6a4f"], ["#ff5d6c", "#6e1a2a"]],
    live: [["#2b6cff", "#102a6e"], ["#36a6ff", "#143a6e"]],
    table: [["#0e7a5f", "#0a3f3f"], ["#16a3a3", "#0e5a5a"]],
    jackpot: [["#ffcd5b", "#9a6a00"], ["#ffb524", "#8a5a00"]],
    gameshow: [["#ff4bd1", "#7a1a6e"], ["#9d80ff", "#3a1f6e"]]
  };
  function buildCasino() {
    var arr = [];
    Object.keys(_titles).forEach(function (cat) {
      _titles[cat].forEach(function (t, i) {
        var pal = _palette[cat][i % _palette[cat].length];
        arr.push({ title: t, provider: pick(casinoProviders), cat: cat, c1: pal[0], c2: pal[1], fav: rint(20, 4000), hot: Math.random() < 0.32, isNew: Math.random() < 0.25 });
      });
    });
    return arr;
  }
  // Apex 自製原創遊戲館（之後在此實作遊戲）：暗影儀式已可玩，其餘為「即將推出」佔位
  var originals = [
    { title: "暗影儀式 Shadow Ritual", provider: "Apex Studio", cat: "originals", c1: "#6e1a2a", c2: "#1a0a12", fav: 9999, hot: true, isNew: true, playable: true, route: "slot" },
    { title: "小雞過馬路 Chicken Cross", provider: "Apex Studio", cat: "originals", c1: "#1e5a2a", c2: "#0a2012", fav: 8888, hot: true, isNew: true, playable: true, route: "chicken" },
    { title: "Crash X", provider: "Apex Studio", cat: "originals", c1: "#1e6e5a", c2: "#0a2a24", fav: 0, comingSoon: true },
    { title: "Mines", provider: "Apex Studio", cat: "originals", c1: "#3a1e6e", c2: "#160a2a", fav: 0, comingSoon: true },
    { title: "Plinko", provider: "Apex Studio", cat: "originals", c1: "#6e5a1e", c2: "#2a2410", fav: 0, comingSoon: true },
    { title: "Dice", provider: "Apex Studio", cat: "originals", c1: "#1e3a6e", c2: "#0a162a", fav: 0, comingSoon: true },
    { title: "Limbo", provider: "Apex Studio", cat: "originals", c1: "#6e1e4a", c2: "#2a0a1e", fav: 0, comingSoon: true }
  ];
  var casinoGames = originals.concat(buildCasino());

  // 娛樂城專屬促銷輪播（6 連播，行銷偏向娛樂城遊戲）
  var casinoPromos = [
    { tag: "獨家原創", title: "Originals 遊戲館上線", sub: "暗影儀式 Shadow Ritual 立即試玩", ic: "🎰", c1: "#6e1a2a", c2: "#ff5d6c", cat: "originals" },
    { tag: "老虎機狂歡", title: "Slots 競賽 100 萬獎池", sub: "Drop & Wins 每日掉落彩金", ic: "🍬", c1: "#3b1e6e", c2: "#7c5cff", cat: "slots" },
    { tag: "真人現場", title: "真人娛樂首儲免傭金", sub: "百家樂・輪盤 24h 不打烊", ic: "🎴", c1: "#16345f", c2: "#36a6ff", cat: "live" },
    { tag: "累積彩金", title: "Jackpot 隨時引爆", sub: "Mega Moolah 千萬獎池等你", ic: "💎", c1: "#5f4a13", c2: "#ffb524", cat: "jackpot" },
    { tag: "遊戲節目", title: "Crazy Time 加倍時刻", sub: "現場遊戲節目派對開跑", ic: "🎡", c1: "#6e1e3a", c2: "#ff4bd1", cat: "gameshow" },
    { tag: "新游搶先", title: "每週新游首發體驗", sub: "搶先試玩最新上架遊戲", ic: "✨", c1: "#13524a", c2: "#2fd17a", cat: "new" }
  ];

  // ===== 競技場 =====
  // 開房玩法
  var roomGames = { flip: { key: "flip", name: "翻牌" }, mine: { key: "mine", name: "踩地雷" } };
  // 震盪（獎項分布）— 對應每次押注的賠付倍數池
  var volatility = {
    high: { key: "high", name: "高震盪", mults: [0, 0, 0, 0, 0, 2, 3, 5, 10, 25] },
    mid: { key: "mid", name: "中震盪", mults: [0, 0, 1, 1, 2, 2, 3, 3, 5, 8] },
    low: { key: "low", name: "低震盪", mults: [0, 1, 1, 1, 2, 2, 2, 2, 3, 3] }
  };
  // 翻牌：10 張卡固定彩金的分布權重（依震盪集中度）
  var flipWeights = {
    high: [6, 3, 1, 1, 0, 0, 0, 0, 0, 0],
    mid: [3, 2, 2, 1, 1, 1, 0, 0, 0, 0],
    low: [2, 2, 1, 1, 1, 1, 1, 1, 0, 0]
  };
  // 產生 10 張卡彩金：總和 = poolPer（單次挑戰總彩金），依震盪配比、已洗牌
  // poolPer = 每次費用 × 10 / 翻牌數 → 翻 K/10 的期望值 = 費用（RTP 100%）
  function flipScaled(poolPer, vol) {
    var w = (flipWeights[vol] || flipWeights.mid).slice();
    var sw = w.reduce(function (a, b) { return a + b; }, 0);
    var arr = w.map(function (x) { return Math.round((x / sw) * poolPer / 100) * 100; });
    var diff = poolPer - arr.reduce(function (a, b) { return a + b; }, 0);
    var mi = 0; for (var i = 1; i < arr.length; i++) if (arr[i] > arr[mi]) mi = i;
    arr[mi] = Math.max(0, arr[mi] + diff);
    return arr;
  }
  function flipPrizes(poolPer, vol) {
    var arr = flipScaled(poolPer, vol);
    for (var j = arr.length - 1; j > 0; j--) { var t = Math.floor(Math.random() * (j + 1)); var tmp = arr[j]; arr[j] = arr[t]; arr[t] = tmp; }
    return arr;
  }
  // 配比預覽（降冪、不洗牌）：開房時讓房主看見 10 張卡的彩金分布
  function flipPreview(poolPer, vol) { return flipScaled(poolPer, vol).sort(function (a, b) { return b - a; }); }
  var hostAvatars = ["🦊", "🐯", "🐲", "🦁", "🐺", "🦅", "🐸", "🐧", "🦄", "🐙", "🐳", "🦖"];
  function makeHost() { return { name: pick(fakeNames) + rint(10, 99), av: pick(hostAvatars) }; }
  // Slots Battle 可選遊戲庫（縮圖示意；引擎僅暗影儀式可真玩，其餘跑同一 FG）
  // 排除小雞過馬路：它是步進式 Originals，不是 slot，不進對戰遊戲庫
  var battleGameLib = casinoGames.filter(function (g) { return (g.cat === "originals" || g.cat === "slots") && g.route !== "chicken"; });
  function pickBattleGame() { var g = pick(battleGameLib); return { title: g.title, c1: g.c1, c2: g.c2, playable: !!g.playable }; }
  function makeBattleSeats(pc, mine) {
    var seats = [mine ? { name: "你", av: "👑" } : makeHost()]; // seat 0 = 房主
    for (var i = 1; i < pc; i++) seats.push(Math.random() < 0.5 ? makeHost() : null);
    if (seats.indexOf(null) < 0 && pc > 1) seats[pc - 1] = null; // 保留至少一個空位可加入
    return seats;
  }
  function makeArenaRoom(seq) {
    // hostEdge / challEdge：房主 vs 挑戰者累積收益，用於熱度條
    var base = { id: "room_" + seq, host: makeHost(), endsInSec: rint(150, 1500), hostEdge: rint(2, 40) * 100, challEdge: rint(2, 40) * 100 };
    if (Math.random() < 0.55) {
      var plays = pick([10, 50, 100]), vol = pick(["high", "mid", "low"]), done = rint(0, Math.floor(plays * 0.4));
      if (Math.random() < 0.6) {
        var cost = pick([1000, 2000, 5000]), flips = pick([3, 5]), dep = cost * plays;
        return Object.assign(base, { type: "bounty", game: "flip", cards: 10, vol: vol, cost: cost, flips: flips, plays: plays, playsLeft: plays - done, deposit: dep, prizePool: dep, done: done, challenges: done });
      }
      var maxBet = pick([50, 100, 200, 500]), maxMult = pick([5, 10, 20]), dep2 = maxBet * maxMult * plays;
      return Object.assign(base, { type: "bounty", game: "mine", cards: 10, vol: vol, maxBet: maxBet, maxMult: maxMult, plays: plays, playsLeft: plays - done, deposit: dep2, prizePool: dep2, done: done, challenges: done });
    }
    // Slots Battle（多人 1v1 / 1v1v1 / 1v1v1v1，1+ 款遊戲 = N 輪）
    var pc = pick([2, 2, 2, 3, 3, 4]);
    var gn = pick([1, 1, 2, 2, 3]);
    var games = []; for (var gi = 0; gi < gn; gi++) games.push(pickBattleGame());
    var mr = Math.random(); var mode = mr < 0.12 ? "crazy" : mr < 0.2 ? "terminal" : "normal";
    var prefs = { fast: Math.random() < 0.5, ultra: Math.random() < 0.12, priv: Math.random() < 0.1, sponsored: Math.random() < 0.12 };
    var vdone = rint(0, 8);
    return Object.assign(base, {
      type: "vsslot", battle: true, players: pc, games: games, rounds: 10, mode: mode, prefs: prefs,
      seats: makeBattleSeats(pc, false), wager: pick([100, 500, 1000, 2000, 5000]), slot: games[0].title,
      plays: 20, done: vdone, matches: vdone, challenges: vdone, buys: gn
    });
  }
  function makeArenaRooms(n) { var a = []; for (var i = 0; i < n; i++) a.push(makeArenaRoom(1000 + i)); return a; }

  HL.mock = {
    DEMO_NOTICE: DEMO_NOTICE,
    fakeNames: fakeNames,
    currencies: currencies,
    casinoGames: casinoGames,
    casinoProviders: casinoProviders,
    casinoCats: casinoCats,
    casinoPromos: casinoPromos,
    roomGames: roomGames,
    volatility: volatility,
    flipWeights: flipWeights,
    flipPrizes: flipPrizes,
    flipPreview: flipPreview,
    makeHost: makeHost,
    makeArenaRoom: makeArenaRoom,
    makeArenaRooms: makeArenaRooms,
    battleGameLib: battleGameLib,
    pickBattleGame: pickBattleGame,
    makeBattleSeats: makeBattleSeats,
    makeHost: makeHost,
    globeEvent: globeEvent,
    makeLastWinners: makeLastWinners,
    makeContributors: makeContributors,
    idols: idols,
    factions: factions,
    initWarCells: initWarCells,
    pick: pick,
    rint: rint,
    worldEvent: worldEvent,
    pools: pools,
    hotGames: hotGames,
    newGames: newGames,
    promos: promos,
    makeBigWin: makeBigWin,
    seedBigWins: seedBigWins,
    makeChatMsg: makeChatMsg,
    makeLeaderboard: makeLeaderboard,
    makeFeedEvent: makeFeedEvent
  };
})(window);

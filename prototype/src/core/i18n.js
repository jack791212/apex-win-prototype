/*
 * Apex Win｜輕量 i18n（接 header 🌐，目標3）
 * 設計：以「zh-Hant 介面文字」為 key 的片語字典 → 自動翻譯整個 DOM 文字節點 +
 *   title/placeholder 屬性；MutationObserver 接住之後動態產生的 Modal/Toast/換頁/聊天。
 *   ⇒ 擴充覆蓋＝在 DICT 加一條（key=畫面上的中文）即可，免逐檔包字串。
 * 預設 zh-Hant＝原文（不翻、observer 關閉、零成本）。切換語言：存檔→HL.app.refresh
 *   重繪原文→walk 翻成目標語。zh-Hans 只列「與繁體不同」的字，其餘留原文。
 * 註冊於 window.HL.i18n；t(k,def) 為相容用的 passthrough（回 def，交給 DOM 翻譯層）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  function lsGet(k, d) { try { var v = global.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { global.localStorage.setItem(k, v); } catch (e) {} }

  var KEY_L = "HL_LANG";
  var LANGS = [
    { code: "zh-Hant", name: "繁體中文", flag: "🇹🇼" },
    { code: "zh-Hans", name: "简体中文", flag: "🇨🇳" },
    { code: "en", name: "English", flag: "🇬🇧" }
  ];

  var EN = {
    // 側欄 / header / 底部列
    "大廳": "Lobby", "全球獎": "Global Prize", "競技場": "Arena", "娛樂城": "Casino", "更多": "More",
    "通知": "Notifications", "語言": "Language", "錢包": "Wallet", "錢包設定": "Wallet settings",
    "每日任務": "Daily Tasks", "獎勵中心": "Rewards", "負責任博弈": "Responsible Gaming", "可驗證公平": "Provably Fair", "VIP 俱樂部": "VIP Club", "夥伴": "Buddy", "聊天": "Chat",
    "幸運轉盤": "Lucky Spin", "🎡 每日幸運轉盤": "🎡 Daily Lucky Spin", "立即免費轉": "Spin for free", "今日已轉，明天再來": "Spun today — come back tomorrow", "轉動中…": "Spinning…", "今日已轉 ✓": "Spun today ✓", "獎品依 VIP 等級放大": "Prizes scale with VIP tier", "每日一次免費 · 中獎入獎金錢包 · Demo": "One free spin daily · winnings to bonus wallet · Demo",
    "每週抽獎": "Weekly Raffle", "🎟️ 每週抽獎": "🎟️ Weekly Raffle", "押注換券": "Wager for tickets",
    "本期彩池": "Prize pool", "本期剩餘": "Ends in", "我的抽獎券": "My tickets", "預估中獎機率": "Est. win chance",
    "尚無抽獎券": "No tickets yet", "本期參與人數": "Players", "得獎名額": "Winners", "獎級": "Prize tiers",
    "我的開獎紀錄": "My draw history", "未中獎": "No win", "尚無開獎紀錄。": "No draws yet.",
    "🎲 立即開獎（Demo 測試）": "🎲 Draw now (Demo)", "已開獎並開啟新一期": "Drawn — new round started",
    "押注換券 · 週期自動開獎 · 中獎入獎金錢包 · Demo": "Wager for tickets · auto weekly draw · winnings to bonus wallet · Demo",
    "兌換碼": "Redeem Code", "🎫 兌換碼": "🎫 Redeem Code", "輸入領獎金": "Enter to claim", "輸入兌換碼": "Enter redeem code",
    "輸入活動兌換碼領取獎金": "Enter a promo code to claim bonus", "兌換": "Redeem", "兌換成功": "Redeemed", "已入獎金錢包": "added to bonus wallet",
    "請先輸入兌換碼。": "Please enter a code.", "兌換碼無效。": "Invalid code.", "兌換碼已過期。": "Code expired.", "這組兌換碼已經領取過了。": "This code was already claimed.",
    "我的兌換紀錄": "My redeem history", "尚無兌換紀錄。": "No redeems yet.",
    "輸入碼即領 · 每碼限領一次 · 中獎入獎金錢包 · Demo": "Enter to claim · once per code · winnings to bonus wallet · Demo",
    "🔥 現在最多人玩": "🔥 Trending now", "即時熱度 · 依近期下注": "Live · by recent bets", "火熱": "On Fire", "冰冷": "Ice Cold",
    // VIP 週期 Reload（#24）
    "週期紅利": "Reloads", "🔄 週期紅利 Reload": "🔄 Reloads", "你的等級": "Your tier",
    "每日紅利": "Daily Reload", "每週紅利": "Weekly Reload", "每月紅利": "Monthly Reload",
    "已領取 ✓": "Claimed ✓", "本期可領": "Available now", "下次可領倒數：": "Next in: ", "本期已領": "Claimed this period", "VIP 週期禮": "VIP reloads",
    "等級越高，每日/每週/每月可領紅利越多。到期可領，逾期不累積。": "Higher tiers unlock bigger daily/weekly/monthly reloads. Claim each period — they don’t stack.",
    "前往領取中心 →": "Go to Rewards →", "依 VIP 等級 · 週期可領 · 入獎金錢包 · Demo": "By VIP tier · periodic claim · to bonus wallet · Demo",
    "🔄 領週期紅利（每日/週/月）→": "🔄 Claim Reloads (daily/weekly/monthly) →",
    // Towers 爬塔
    "🗼 Towers 爬塔": "🗼 Towers", "Towers 爬塔": "Towers", "下一層": "Next row", "難度": "Difficulty",
    "簡單": "Easy", "普通": "Medium", "困難": "Hard",
    "選難度、按「開始」，逐層往上爬，隨時兌現 🗼": "Pick a difficulty, hit Start, climb row by row, cash out anytime 🗼",
    "從最底層往上爬，選對的格子累乘倍數": "Climb from the bottom — each safe tile multiplies your win",
    "至少爬一層再兌現": "Climb at least one row before cashing out", "🏆 登頂！": "🏆 Reached the top!",
    "1% 莊家優勢 · Demo · 逐層爬升累乘，踩陷阱歸零 · 可驗證公平（一層一注）": "1% house edge · Demo · climb to multiply, hit a trap and lose · provably fair (one bet per row)",
    "使命宣言": "Our mission", "如何驗證": "How to verify", "返回娛樂城": "Back to Casino",
    "你的專屬夥伴": "Your buddy", "聊天室": "Chat room", "Demo 測試工具": "Demo tools",
    // 錢包 / 帳號
    "選擇遊戲幣套餐（遊戲幣僅供娛樂，官方不提供真金兌換）：": "Choose a coin pack (coins are for fun only; no cash-out):",
    "轉贈遊戲幣給其他玩家（休閒模式專屬 · Demo）：": "Gift coins to another player (casual mode only · Demo):",
    "對方暱稱 / ID": "Recipient nickname / ID", "送出": "Send",
    "⚠️ 遊戲幣交易僅供娛樂，無真實金錢價值。": "⚠️ Coin transfers are for entertainment only and have no real cash value.",
    "確認儲值": "Confirm deposit", "法幣": "Fiat", "加密貨幣": "Crypto",
    "🔒 真金提款尚未開放": "🔒 Real-money withdrawal not yet available",
    "真金提款 / 兌換功能已就緒，待取得合法牌照後開放。目前餘額僅供遊戲娛樂。": "Real-money withdrawal/exchange is ready and will open once licensed. Balance is for entertainment only for now.",
    "提款地址（USDT-TRC20）": "Withdrawal address (USDT-TRC20)", "提款帳戶": "Withdrawal account", "全部": "All", "確認提款": "Confirm withdrawal",
    "載入中…": "Loading…", "尚無交易紀錄。": "No transactions yet.",
    "頭像 / 暱稱": "Avatar / Nickname", "餘額": "Balance", "點數與戰績已跨裝置雲端同步。": "Points and stats are synced across devices.",
    "編輯個人資料": "Edit profile", "登出": "Sign out", "Demo · 虛擬點數": "Demo · virtual points",
    "暱稱（1–16 字）": "Nickname (1–16 chars)", "頭像": "Avatar", "暱稱": "Nickname", "取消": "Cancel", "儲存": "Save",
    // 大廳
    "剛剛": "just now", "活動結束倒數": "Event ends in", "參與玩家": "Players", "已達成": " reached",
    "Demo 活動演繹": "Demo event", "🔥 新上線遊戲館": "🔥 New game studio", "暗影儀式": "Shadow Ritual",
    "Shadow Ritual · 連爆 ways slot": "Shadow Ritual · cascading ways slot", "立即遊玩 ▶": "Play now ▶",
    "🎁 促銷活動": "🎁 Promotions", "立即參加": "Join now", "🔥 熱門玩家擂台": "🔥 Hot player arenas", "查看全部 ›": "View all ›",
    "▶ 可玩": "▶ Playable", "🏆 最新巨獎": "🏆 Latest big wins", "Demo：更多內容建構中": "Demo: more coming soon", "✓ 真": "✓ real",
    // 競技場
    "房主": "Host", "賞金池": "Prize pool", "發起挑戰": "Start challenge", "挑戰次數": "Challenges", "我的房間": "My room",
    "挑戰": "Challenge", "賭注": "Stake", "我的對戰": "My battles", "加入": "Join", "👁 觀戰": "👁 Watch", "Demo 假資料": "Demo data",
    "目前沒有房間，按「開房」發起第一場挑戰！": "No rooms yet — tap “Open room” to start the first challenge!",
    "你的房間無法自行挑戰，正在等待玩家挑戰…結束時會自動結算回報。": "You can’t challenge your own room; waiting for challengers… results settle automatically.",
    "押": "Bet", "你": "You", "本場無人挑戰。": "No challengers this round.", "看過程": "View replay", "知道了": "Got it",
    "我的 Slots Battle 戰績": "My Slots Battle record", "你參與的對戰（1v1 / 1v1v1 / 1v1v1v1）": "Battles you joined (1v1 / 1v1v1 / 1v1v1v1)",
    "戰績與回放 ›": "Record & replays ›", "回放": "Replay", "尚無紀錄。": "No records yet.",
    "Demo · 紀錄存於本次連線，重整即清空": "Demo · records last for this session; refresh clears them",
    "準備開始…": "Getting ready…", "↻ 重新播放": "↻ Replay", "關閉": "Close", "Demo · 逐輪重播": "Demo · round-by-round replay",
    "由你當局主，發起一場挑戰：": "Be the host and start a challenge:", "賞金局": "Bounty", "翻牌 / 踩地雷，放賞金讓人挑戰": "Flip / Mines — post a bounty for challengers",
    "1v1 / 1v1v1 / 1v1v1v1，多遊戲比分": "1v1 / 1v1v1 / 1v1v1v1, multi-game scoring", "Demo · 不扣真錢": "Demo · no real money charged",
    "開房押金（賠付用）": "Room deposit (for payouts)", "平台開房費（2%）": "Platform fee (2%)", "合計需準備": "Total required", "確認開房": "Open room", "遊戲畫面 / 配比預覽": "Game / payout preview",
    "固定 10 輪；可選多款遊戲輪流出場。引擎僅暗影儀式可真玩，其餘跑同一 FG 示意。": "Fixed 10 rounds; pick multiple games to rotate. Only Shadow Ritual is fully playable; others run a shared demo.",
    "＋ 開房發起挑戰": "＋ Open room & challenge", "搜尋": "Search",
    // 直播間
    "直播房玩法": "How the live room works", "可純觀看，不一定要下注。": "You can just watch — betting is optional.",
    "想參與時切換為跟注模式。": "Switch to follow mode to join in.", "跟注需再次確認後才加入本局，確認即扣遊戲幣。": "Following requires confirmation and deducts coins for the round.",
    "本局以真桌（RNG 真開牌）結果結算，命中真派彩（莊 1.95×／閒 2×／和退本）。": "Rounds settle on a real RNG table; wins pay out for real (Banker 1.95× / Player 2× / Tie returns stake).",
    "開獎前離開直播間會退回未結算的跟注。": "Leaving the room before the draw refunds any unsettled follow bet.",
    "虛擬主持 · Demo 演繹 · 非真人": "Virtual host · Demo · not a real person", "虛擬主持 · 非真人直播": "Virtual host · not a real broadcast",
    "目前：觀看模式（點此切換跟注）": "Now: Watch mode (tap to follow)", "目前：跟注模式（點此切回觀看）": "Now: Follow mode (tap to watch)",
    "確認跟注": "Confirm follow", "確認加入本局": "Join this round", "風險提示": "Risk notice", "可能全部輸掉": "You may lose it all",
    "跟注金額": "Follow amount", "直播主本局選擇": "Host’s pick this round", "真扣真派 · 以真桌結果結算 · Demo 遊戲幣": "Real debit/payout · settled on a real table · Demo coins",
    "📺 切換子母畫面": "📺 Picture-in-picture", "說點什麼…（Demo）": "Say something… (Demo)", "‹ 返回": "‹ Back",
    "👁 在線": "👁 Online", "💰 本局總跟注": "💰 Round follow total", "⏱ 本局倒數": "⏱ Round countdown", "🏆 本局大獎": "🏆 Round jackpot", "玩法說明 ›": "How to play ›",
    // 娛樂城
    "娛樂城 CASINO": "CASINO", "你喜愛的遊戲，盡在一處。所有遊戲為 Demo 示意。": "All your favorite games in one place. All games are demos.", "Demo · 未接入真實遊戲": "Demo · not real games",
    "搜尋遊戲或供應商…": "Search games or providers…", "🎲 隨機遊戲": "🎲 Random game",
    "熱門": "Hot", "最新": "New", "♥ 收藏": "♥ Favorites",
    "老虎機": "Slots", "真人娛樂": "Live Casino", "桌上遊戲": "Table Games", "累積彩金": "Jackpots", "遊戲節目": "Game Shows",
    "🔥 熱門遊戲": "🔥 Hot Games", "⭐ 最新遊戲": "⭐ New Games", "♥ 我的最愛": "♥ My Favorites", "🕘 最近遊玩": "🕘 Recently Played",
    "🧪 同仁開發遊戲（放置區）": "🧪 Community Games", "🎨 我們的開發者（依暱稱）": "🎨 Our Developers", "🏢 遊戲供應商": "🏢 Providers",
    "排序": "Sort", "推薦": "Recommended", "▶ 試玩": "▶ Demo", "💵 真錢": "💵 Real", "找不到符合的遊戲。": "No matching games.", "款遊戲": "games",
    // 遊戲共用
    "ℹ 賠付表": "ℹ Paytable", "ℹ 規則 / 賠率": "ℹ Rules / Payouts", "ℹ 規則 / 中獎": "ℹ Rules / Winners",
    "下注": "Bet", "自動": "Auto", "手動": "Manual", "開始自動": "Start auto", "停止": "Stop", "旋轉": "Spin", "開牌": "Deal", "兌現": "Cash out",
    "清除": "Clear", "復原": "Undo", "重押": "Rebet", "籌碼": "Chips", "本局總注": "Total bet",
    "方向": "Direction", "目標倍數": "Target multiplier", "排數": "Rows", "風險": "Risk", "低": "Low", "中": "Med", "高": "High",
    // 彩金 / 通知 / VIP / 返水
    "🎰 累積彩金 JACKPOT": "🎰 JACKPOT", "● 即時累積中": "● accruing live", "近期中獎": "Recent winners", "🎬 預覽中獎演出（Demo）": "🎬 Preview win animation (Demo)",
    "🔔 通知中心": "🔔 Notifications", "目前沒有通知。": "No notifications.",
    "💎 VIP 俱樂部": "💎 VIP Club", "目前等級": "Current tier", "累積有效押注": "Lifetime wager", "💧 Rakeback 返水": "💧 Rakeback", "領取": "Claim",
    "💧 每日返水": "💧 Daily Rakeback", "每日返水": "Daily Rakeback", "逾期作廢，剩餘": "Expires in", "暫無可領返水": "Nothing to claim",
    "返水明細 / 各級費率 →": "Rakeback details / rates →", "今日可領返水": "Claimable today", "本桶逾期作廢，剩餘": "Bucket expires in",
    "🎁 領取中心 · 獎金錢包": "🎁 Rewards · Bonus wallet", "📋 每日任務": "📋 Daily Tasks",
    "🏟️ 玩家擂台": "🏟️ Player Arena",
    // 競技場賞金局 / 熱度條
    "秒": "s", "翻牌": "Flip", "踩地雷": "Mines", "賞金": "Bounty", "翻牌賞金": "Flip Bounty", "踩雷賞金": "Mines Bounty",
    "低震盪": "Low vol.", "中震盪": "Med vol.", "高震盪": "High vol.", "勢均力敵": "Even match", "挑戰者": "Challenger", "輪": "rounds",
    "房主優勢": "Host edge", "挑戰者火熱": "Challenger hot",
    "伺服器種子": "Server seed", "客戶端種子": "Client seed",
    // 錦標賽 / Slot Race
    "🏆 限時錦標賽 · SLOT RACE": "🏆 Timed Race · SLOT RACE", "Slots 競賽 · 100 萬獎池": "Slots Race · 1M Pool",
    "我的名次": "My Rank", "即時排行榜": "Live Leaderboard", "名次": "Rank", "玩家": "Player", "積分": "Score", "可得獎金": "Prize",
    "🎮 前往遊玩賺積分": "🎮 Play to earn points", "玩法 / 獎金階梯": "Rules / Prize ladder", "⏱ Demo 立即結算本期": "⏱ Demo: settle now",
    "本期剩餘": "Time left", "你（我）": "You", "‹ 返回大廳": "‹ Back to Lobby", "🏆 錦標賽玩法": "🏆 Tournament rules",
    "限時賽期內，於任一遊戲完成的有效押注（含跟注）即累積積分。": "During the timed period, valid wagers on any game (incl. follow-bets) accrue points.",
    "排行榜即時更新；賽末依名次自動派發獎金到「獎金錢包」。": "The leaderboard updates live; prizes auto-pay to your Bonus wallet by rank at the end.",
    "前 8 名分得獎池：40% / 24% / 14% / 9% / 6% / 4% / 2% / 1%。": "Top 8 share the pool: 40% / 24% / 14% / 9% / 6% / 4% / 2% / 1%.",
    "賽事循環進行，一期結束立即開新一期。": "Events run continuously; a new period starts when one ends.",
    "純前端 Demo · 積分與派彩為遊戲幣": "Frontend Demo · points & payouts are game coins",
    "🏁 本期結算": "🏁 Period result", "你的名次": "Your rank", "獲得獎金": "Prize won", "新一期已開始 · Demo": "New period started · Demo",
    "🏆 限時錦標賽 · 進行中": "🏆 Timed Race · Live", "立即參賽 →": "Join now →"
  };

  // 「標籤＋動態值」串接成單一文字節點時，用前綴/後綴比對（精確比對失敗才走這裡）
  var PREFIX = {
    en: { "房主 ": "Host ", "挑戰次數 ": "Challenges ", "加入 ": "Join ", "押 ": "Bet ", "你 ": "You ", "投 ": "Wager ", "搜尋 ": "Search ", "正在玩：": "Playing: ", "本局遊戲：": "Game: ", "直播主本局選擇：": "Host pick: ", "世界活動 · ": "World Event · " },
    "zh-Hans": { "挑戰次數 ": "挑战次数 ", "賭注 ": "赌注 ", "搜尋 ": "搜索 ", "直播主本局選擇：": "主播本局选择：", "世界活動 · ": "世界活动 · " }
  };
  var SUFFIX = {
    en: { " 秒前": "s ago", " 分前": "m ago", " 小時前": "h ago", " 挑戰者": " Challenger", " 玩家": " players", " 輪": " rounds", " 秒": "s" },
    "zh-Hans": { " 挑戰者": " 挑战者" }
  };

  var HANS = {
    "全球獎": "全球奖", "競技場": "竞技场", "娛樂城": "娱乐城", "錢包": "钱包", "錢包設定": "钱包设置",
    "語言": "语言", "獎勵中心": "奖励中心", "負責任博弈": "负责任博弈", "可驗證公平": "可验证公平", "VIP 俱樂部": "VIP 俱乐部", "夥伴": "伙伴", "聊天室": "聊天室",
    "每日任務": "每日任务", "如何驗證": "如何验证", "返回娛樂城": "返回娱乐城", "你的專屬夥伴": "你的专属伙伴", "Demo 測試工具": "Demo 测试工具",
    "幸運轉盤": "幸运转盘", "🎡 每日幸運轉盤": "🎡 每日幸运转盘", "立即免費轉": "立即免费转", "今日已轉，明天再來": "今日已转，明天再来", "轉動中…": "转动中…", "今日已轉 ✓": "今日已转 ✓", "獎品依 VIP 等級放大": "奖品依 VIP 等级放大", "每日一次免費 · 中獎入獎金錢包 · Demo": "每日一次免费 · 中奖入奖金钱包 · Demo",
    "每週抽獎": "每周抽奖", "🎟️ 每週抽獎": "🎟️ 每周抽奖", "押注換券": "押注换券",
    "本期彩池": "本期彩池", "本期剩餘": "本期剩余", "我的抽獎券": "我的抽奖券", "預估中獎機率": "预估中奖机率",
    "尚無抽獎券": "尚无抽奖券", "本期參與人數": "本期参与人数", "得獎名額": "得奖名额", "獎級": "奖级",
    "我的開獎紀錄": "我的开奖纪录", "未中獎": "未中奖", "尚無開獎紀錄。": "尚无开奖纪录。",
    "🎲 立即開獎（Demo 測試）": "🎲 立即开奖（Demo 测试）", "已開獎並開啟新一期": "已开奖并开启新一期",
    "押注換券 · 週期自動開獎 · 中獎入獎金錢包 · Demo": "押注换券 · 周期自动开奖 · 中奖入奖金钱包 · Demo",
    "🔥 現在最多人玩": "🔥 现在最多人玩", "即時熱度 · 依近期下注": "实时热度 · 依近期下注", "火熱": "火热", "冰冷": "冰冷",
    "週期紅利": "周期红利", "🔄 週期紅利 Reload": "🔄 周期红利 Reload", "你的等級": "你的等级",
    "每日紅利": "每日红利", "每週紅利": "每周红利", "每月紅利": "每月红利",
    "已領取 ✓": "已领取 ✓", "本期可領": "本期可领", "下次可領倒數：": "下次可领倒数：", "本期已領": "本期已领", "VIP 週期禮": "VIP 周期礼",
    "等級越高，每日/每週/每月可領紅利越多。到期可領，逾期不累積。": "等级越高，每日/每周/每月可领红利越多。到期可领，逾期不累积。",
    "前往領取中心 →": "前往领取中心 →", "依 VIP 等級 · 週期可領 · 入獎金錢包 · Demo": "依 VIP 等级 · 周期可领 · 入奖金钱包 · Demo",
    "🔄 領週期紅利（每日/週/月）→": "🔄 领周期红利（每日/周/月）→",
    "選擇遊戲幣套餐（遊戲幣僅供娛樂，官方不提供真金兌換）：": "选择游戏币套餐（游戏币仅供娱乐，官方不提供真金兑换）：",
    "轉贈遊戲幣給其他玩家（休閒模式專屬 · Demo）：": "转赠游戏币给其他玩家（休闲模式专属 · Demo）：",
    "對方暱稱 / ID": "对方昵称 / ID", "送出": "送出", "⚠️ 遊戲幣交易僅供娛樂，無真實金錢價值。": "⚠️ 游戏币交易仅供娱乐，无真实金钱价值。",
    "確認儲值": "确认充值", "加密貨幣": "加密货币", "🔒 真金提款尚未開放": "🔒 真金提款尚未开放",
    "真金提款 / 兌換功能已就緒，待取得合法牌照後開放。目前餘額僅供遊戲娛樂。": "真金提款 / 兑换功能已就绪，待取得合法牌照后开放。目前余额仅供游戏娱乐。",
    "提款帳戶": "提款账户", "確認提款": "确认提款", "載入中…": "加载中…", "尚無交易紀錄。": "尚无交易记录。",
    "頭像 / 暱稱": "头像 / 昵称", "餘額": "余额", "點數與戰績已跨裝置雲端同步。": "点数与战绩已跨设备云端同步。",
    "編輯個人資料": "编辑个人资料", "登出": "登出", "Demo · 虛擬點數": "Demo · 虚拟点数", "暱稱（1–16 字）": "昵称（1–16 字）", "頭像": "头像", "暱稱": "昵称", "儲存": "保存",
    "活動結束倒數": "活动结束倒数", "參與玩家": "参与玩家", "已達成": " 已达成", "Demo 活動演繹": "Demo 活动演绎",
    "🔥 新上線遊戲館": "🔥 新上线游戏馆", "暗影儀式": "暗影仪式", "Shadow Ritual · 連爆 ways slot": "Shadow Ritual · 连爆 ways slot", "立即遊玩 ▶": "立即游玩 ▶",
    "🎁 促銷活動": "🎁 促销活动", "立即參加": "立即参加", "🔥 熱門玩家擂台": "🔥 热门玩家擂台", "查看全部 ›": "查看全部 ›",
    "▶ 可玩": "▶ 可玩", "🏆 最新巨獎": "🏆 最新巨奖", "Demo：更多內容建構中": "Demo：更多内容建设中", "✓ 真": "✓ 真",
    "房主": "房主", "賞金池": "赏金池", "發起挑戰": "发起挑战", "挑戰次數": "挑战次数", "我的房間": "我的房间", "挑戰": "挑战", "賭注": "赌注", "我的對戰": "我的对战", "加入": "加入", "👁 觀戰": "👁 观战", "Demo 假資料": "Demo 假数据",
    "目前沒有房間，按「開房」發起第一場挑戰！": "目前没有房间，按「开房」发起第一场挑战！",
    "你的房間無法自行挑戰，正在等待玩家挑戰…結束時會自動結算回報。": "你的房间无法自行挑战，正在等待玩家挑战…结束时会自动结算回报。",
    "本場無人挑戰。": "本场无人挑战。", "看過程": "看过程", "知道了": "知道了",
    "我的 Slots Battle 戰績": "我的 Slots Battle 战绩", "你參與的對戰（1v1 / 1v1v1 / 1v1v1v1）": "你参与的对战（1v1 / 1v1v1 / 1v1v1v1）",
    "戰績與回放 ›": "战绩与回放 ›", "回放": "回放", "尚無紀錄。": "尚无记录。", "Demo · 紀錄存於本次連線，重整即清空": "Demo · 记录存于本次连线，刷新即清空",
    "準備開始…": "准备开始…", "↻ 重新播放": "↻ 重新播放", "關閉": "关闭", "Demo · 逐輪重播": "Demo · 逐轮重播",
    "由你當局主，發起一場挑戰：": "由你当局主，发起一场挑战：", "賞金局": "赏金局", "翻牌 / 踩地雷，放賞金讓人挑戰": "翻牌 / 踩地雷，放赏金让人挑战",
    "1v1 / 1v1v1 / 1v1v1v1，多遊戲比分": "1v1 / 1v1v1 / 1v1v1v1，多游戏比分", "Demo · 不扣真錢": "Demo · 不扣真钱",
    "開房押金（賠付用）": "开房押金（赔付用）", "平台開房費（2%）": "平台开房费（2%）", "合計需準備": "合计需准备", "確認開房": "确认开房", "遊戲畫面 / 配比預覽": "游戏画面 / 配比预览",
    "固定 10 輪；可選多款遊戲輪流出場。引擎僅暗影儀式可真玩，其餘跑同一 FG 示意。": "固定 10 轮；可选多款游戏轮流出场。引擎仅暗影仪式可真玩，其余跑同一 FG 示意。",
    "＋ 開房發起挑戰": "＋ 开房发起挑战", "搜尋": "搜索",
    "直播房玩法": "直播房玩法", "可純觀看，不一定要下注。": "可纯观看，不一定要下注。", "想參與時切換為跟注模式。": "想参与时切换为跟注模式。",
    "跟注需再次確認後才加入本局，確認即扣遊戲幣。": "跟注需再次确认后才加入本局，确认即扣游戏币。",
    "本局以真桌（RNG 真開牌）結果結算，命中真派彩（莊 1.95×／閒 2×／和退本）。": "本局以真桌（RNG 真开牌）结果结算，命中真派彩（庄 1.95×／闲 2×／和退本）。",
    "開獎前離開直播間會退回未結算的跟注。": "开奖前离开直播间会退回未结算的跟注。",
    "虛擬主持 · Demo 演繹 · 非真人": "虚拟主持 · Demo 演绎 · 非真人", "虛擬主持 · 非真人直播": "虚拟主持 · 非真人直播",
    "目前：觀看模式（點此切換跟注）": "目前：观看模式（点此切换跟注）", "目前：跟注模式（點此切回觀看）": "目前：跟注模式（点此切回观看）",
    "確認跟注": "确认跟注", "確認加入本局": "确认加入本局", "風險提示": "风险提示", "可能全部輸掉": "可能全部输掉", "跟注金額": "跟注金额", "直播主本局選擇": "主播本局选择",
    "真扣真派 · 以真桌結果結算 · Demo 遊戲幣": "真扣真派 · 以真桌结果结算 · Demo 游戏币", "📺 切換子母畫面": "📺 切换子母画面", "說點什麼…（Demo）": "说点什么…（Demo）", "‹ 返回": "‹ 返回",
    "💰 本局總跟注": "💰 本局总跟注", "⏱ 本局倒數": "⏱ 本局倒数", "🏆 本局大獎": "🏆 本局大奖", "玩法說明 ›": "玩法说明 ›",
    "娛樂城 CASINO": "娱乐城 CASINO", "你喜愛的遊戲，盡在一處。所有遊戲為 Demo 示意。": "你喜爱的游戏，尽在一处。所有游戏为 Demo 示意。", "Demo · 未接入真實遊戲": "Demo · 未接入真实游戏",
    "搜尋遊戲或供應商…": "搜索游戏或供应商…", "🎲 隨機遊戲": "🎲 随机游戏", "熱門": "热门", "♥ 收藏": "♥ 收藏",
    "老虎機": "老虎机", "真人娛樂": "真人娱乐", "桌上遊戲": "桌上游戏", "累積彩金": "累积彩金", "遊戲節目": "游戏节目",
    "🔥 熱門遊戲": "🔥 热门游戏", "⭐ 最新遊戲": "⭐ 最新游戏", "♥ 我的最愛": "♥ 我的收藏", "🕘 最近遊玩": "🕘 最近游玩",
    "🧪 同仁開發遊戲（放置區）": "🧪 同仁开发游戏（放置区）", "🎨 我們的開發者（依暱稱）": "🎨 我们的开发者（依昵称）", "🏢 遊戲供應商": "🏢 游戏供应商",
    "推薦": "推荐", "▶ 試玩": "▶ 试玩", "💵 真錢": "💵 真钱", "找不到符合的遊戲。": "找不到符合的游戏。", "款遊戲": "款游戏",
    "ℹ 賠付表": "ℹ 赔付表", "ℹ 規則 / 賠率": "ℹ 规则 / 赔率", "ℹ 規則 / 中獎": "ℹ 规则 / 中奖",
    "開始自動": "开始自动", "開牌": "开牌", "兌現": "兑现", "復原": "复原", "重押": "重押", "籌碼": "筹码", "本局總注": "本局总注",
    "🎰 累積彩金 JACKPOT": "🎰 累积彩金 JACKPOT", "● 即時累積中": "● 即时累积中", "近期中獎": "近期中奖", "🎬 預覽中獎演出（Demo）": "🎬 预览中奖演出（Demo）",
    "目前沒有通知。": "目前没有通知。", "💎 VIP 俱樂部": "💎 VIP 俱乐部", "目前等級": "当前等级", "累積有效押注": "累积有效押注", "💧 Rakeback 返水": "💧 Rakeback 返水", "領取": "领取",
    "🎁 領取中心 · 獎金錢包": "🎁 领取中心 · 奖金钱包", "📋 每日任務": "📋 每日任务",
    "低震盪": "低震荡", "中震盪": "中震荡", "高震盪": "高震荡", "勢均力敵": "势均力敌", "挑戰者": "挑战者", "翻牌賞金": "翻牌赏金", "踩雷賞金": "踩雷赏金", "賞金": "赏金",
    "房主優勢": "房主优势", "挑戰者火熱": "挑战者火热",
    "伺服器種子": "服务器种子", "客戶端種子": "客户端种子",
    "🏆 限時錦標賽 · SLOT RACE": "🏆 限时锦标赛 · SLOT RACE", "Slots 競賽 · 100 萬獎池": "Slots 竞赛 · 100 万奖池",
    "即時排行榜": "即时排行榜", "積分": "积分", "可得獎金": "可得奖金", "🎮 前往遊玩賺積分": "🎮 前往游玩赚积分",
    "玩法 / 獎金階梯": "玩法 / 奖金阶梯", "⏱ Demo 立即結算本期": "⏱ Demo 立即结算本期", "本期剩餘": "本期剩余",
    "‹ 返回大廳": "‹ 返回大厅", "🏆 錦標賽玩法": "🏆 锦标赛玩法",
    "限時賽期內，於任一遊戲完成的有效押注（含跟注）即累積積分。": "限时赛期内，于任一游戏完成的有效押注（含跟注）即累积积分。",
    "排行榜即時更新；賽末依名次自動派發獎金到「獎金錢包」。": "排行榜即时更新；赛末依名次自动派发奖金到「奖金钱包」。",
    "前 8 名分得獎池：40% / 24% / 14% / 9% / 6% / 4% / 2% / 1%。": "前 8 名分得奖池：40% / 24% / 14% / 9% / 6% / 4% / 2% / 1%。",
    "賽事循環進行，一期結束立即開新一期。": "赛事循环进行，一期结束立即开新一期。",
    "純前端 Demo · 積分與派彩為遊戲幣": "纯前端 Demo · 积分与派彩为游戏币",
    "🏁 本期結算": "🏁 本期结算", "獲得獎金": "获得奖金", "新一期已開始 · Demo": "新一期已开始 · Demo",
    "🏆 限時錦標賽 · 進行中": "🏆 限时锦标赛 · 进行中", "立即參賽 →": "立即参赛 →",
    "逾期作廢，剩餘": "逾期作废，剩余", "暫無可領返水": "暂无可领返水", "返水明細 / 各級費率 →": "返水明细 / 各级费率 →",
    "今日可領返水": "今日可领返水", "本桶逾期作廢，剩餘": "本桶逾期作废，剩余"
  };

  var DICT = { en: EN, "zh-Hans": HANS };
  var OBS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "placeholder"] };
  var observer = null;
  function lang() { return HL.lang || "zh-Hant"; }
  function dict() { return DICT[lang()]; }

  function tText(node, d) {
    var raw = node.nodeValue, k = raw.trim();
    if (!k) return;
    if (d[k] != null) { node.nodeValue = raw.replace(k, d[k]); return; }
    var pre = PREFIX[lang()], p;
    if (pre) for (p in pre) { if (k.indexOf(p) === 0) { node.nodeValue = raw.replace(p, pre[p]); return; } }
    var suf = SUFFIX[lang()], s;
    if (suf) for (s in suf) { if (k.length > s.length && k.slice(-s.length) === s) { node.nodeValue = raw.replace(k, k.slice(0, k.length - s.length) + suf[s]); return; } }
  }
  function tAttrs(elm, d) {
    if (!elm.getAttribute) return;
    ["title", "placeholder"].forEach(function (a) { var v = elm.getAttribute(a); if (v) { var k = v.trim(); if (d[k] != null) elm.setAttribute(a, d[k]); } });
  }
  function walk(root) {
    var d = dict(); if (!d || !root) return;
    if (root.nodeType === 3) { tText(root, d); return; }
    if (root.nodeType !== 1) return;
    tAttrs(root, d);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n; while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(function (t) { tText(t, d); });
    var withAttr = root.querySelectorAll ? root.querySelectorAll("[title],[placeholder]") : [];
    Array.prototype.forEach.call(withAttr, function (e) { tAttrs(e, d); });
  }

  function startObserver() {
    if (observer || lang() === "zh-Hant") return;
    observer = new MutationObserver(function (muts) {
      if (lang() === "zh-Hant") return;
      observer.disconnect();
      var d = dict();
      muts.forEach(function (m) {
        if (m.type === "childList") Array.prototype.forEach.call(m.addedNodes, function (node) { walk(node); });
        else if (m.type === "characterData") tText(m.target, d);
        else if (m.type === "attributes" && m.target) tAttrs(m.target, d);
      });
      observer.observe(document.body, OBS);
    });
    observer.observe(document.body, OBS);
  }
  function stopObserver() { if (observer) { observer.disconnect(); observer = null; } }

  function apply() {
    if (lang() === "zh-Hant") { stopObserver(); return; }
    if (document.body) walk(document.body);
    startObserver();
  }

  function setLang(code) {
    if (!code) return;
    HL.lang = code; lsSet(KEY_L, code);
    try { document.documentElement.setAttribute("lang", code); } catch (e) {}
    stopObserver();
    if (HL.app && HL.app.refresh) HL.app.refresh(); // 重繪回原文(zh-Hant)
    apply();                                          // 再翻成目標語
  }

  function open() {
    var cur = lang();
    var m = HL.ui.modal("語言 / Language", [
      el("div", { class: "ax-lang" }, LANGS.map(function (L) {
        return el("button", { class: "ax-lang__opt" + (L.code === cur ? " is-current" : ""), onClick: function () { m.close(); if (L.code !== cur) setLang(L.code); } }, [
          el("span", { class: "ax-lang__flag", text: L.flag }),
          el("span", { text: L.name }),
          L.code === cur ? el("span", { class: "ax-lang__chk", text: "✓" }) : null
        ]);
      })),
      el("span", { class: "ax-demo-tag", text: "輕量 i18n · 介面文字逐步在地化 · Demo" })
    ]);
  }

  function t(k, def) { return def; } // 相容 passthrough：實際翻譯由 DOM 層處理

  HL.lang = lsGet(KEY_L, "zh-Hant");
  if (document.documentElement) try { document.documentElement.setAttribute("lang", HL.lang); } catch (e) {}
  // 首次：等 DOM 內容出現後套用（main.js 之後 render）；observer 會接住首屏
  if (lang() !== "zh-Hant") {
    if (document.readyState === "loading") global.addEventListener("DOMContentLoaded", apply);
    else apply();
    startObserver();
  }

  HL.i18n = { t: t, setLang: setLang, current: lang, open: open, langs: LANGS, apply: apply };
})(window);

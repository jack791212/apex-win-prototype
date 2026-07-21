/*
 * Apex Win｜輕量 i18n（接 header 🌐，目標3）
 * 設計：以「zh-Hant 介面文字」為 key 的片語字典 → 自動翻譯整個 DOM 文字節點 +
 *   title/placeholder/aria-label 屬性；MutationObserver 接住之後動態產生的 Modal/Toast/換頁/聊天。
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
    // 遊戲卡即時人數（S9）
    "在玩": "playing", "線上遊玩人數（模擬）": "Live players online (simulated)",
    // 側欄收合（S14）
    "收合": "Collapse", "收合側欄": "Collapse sidebar", "展開側欄": "Expand sidebar",
    // VIP 福利矩陣（S11）
    "等級": "Level", "累積押注": "Total Wager", "返水": "Rakeback", "升級獎金": "Level-up Bonus", "下一級": "Next",
    "各級福利一覽（返水率隨等級放大、升級發獎金）": "Benefits by tier (rakeback grows with level; level-up pays a bonus)",
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
    // 餘額救濟金 Faucet（#39）— 直接補主餘額；"下次可領倒數：" 沿用 Reload 既有鍵
    "💧 餘額救濟金": "💧 Balance Faucet", "領救濟金": "Claim Faucet", "救濟金": "Faucet", "已入主餘額": "added to your balance",
    "目前可玩餘額": "Current balance", "餘額見底，可領救濟金續玩": "Balance is low — claim a relief top-up to keep playing",
    "餘額充足時無需領取。": "No need to claim while your balance is healthy.",
    "餘額不足時可領一筆救濟金續玩，每 8 小時一次。": "Low on balance? Claim a relief top-up to keep playing — once every 8 hours.",
    "餘額歸零救濟 · 防流失鉤子 · Demo": "Zero-balance relief · anti-churn hook · Demo",
    // Chat Rain 聊天灑幣（#25）— 鍵須為 trimmed 形式（walker 以 raw.trim() 查表）；"已領取 ✓" 沿用 Reload 既有鍵
    "紅包雨進行中": "Rain is live", "領取雨露": "Claim",
    "先在聊天室發言即可參與": "Chat once to join the rain", "🌧️ 下一場紅包雨": "🌧️ Next rain",
    // 點數商城 / Reward Market（#36）
    "🛍️ 點數商城": "🛍️ Reward Market", "點數商城": "Reward Market", "我的點數": "My points", "點": "pts",
    "小獎金券": "Small Voucher", "中獎金券": "Medium Voucher", "大獎金券": "Large Voucher", "神秘獎勵包": "Mystery Box",
    "命運寶箱": "Fortune Chest", "🎰 命運寶箱": "🎰 Fortune Chest",
    "兌換": "Redeem", "已兌換 ✓": "Redeemed ✓", "獎勵": "Reward", "VIP 折扣": "VIP discount",
    "本日已兌換 · 下次": "Redeemed today · next", "本週已兌換 · 下次": "Redeemed this week · next",
    "有效押注累積點數（每 NT$100 = 1 點）。兌換獎勵入獎金錢包，各品項有冷卻。": "Wagers earn points (NT$100 = 1 pt). Redeems go to your bonus wallet; each item has a cooldown.",
    "賺→逛→換 · 點數消耗端 · Demo": "Earn → browse → redeem · points sink · Demo",
    // 黃金之城 meta 層（#37）
    "🏰 黃金之城": "🏰 Golden City", "黃金之城": "Golden City", "我的金磚": "My bricks", "金磚": "bricks",
    "營地": "Camp", "市集": "Market", "港灣": "Harbor", "神殿": "Temple", "王城": "Citadel",
    "投入金磚": "Invest bricks", "建設中：": "Building: ", "完成獎勵": "Milestone", "建設進度": "Progress",
    "蓋城市領里程碑": "Build & earn",
    "⛺ 營地 建成！": "⛺ Camp built!", "🏪 市集 建成！": "🏪 Market built!", "⚓ 港灣 建成！": "⚓ Harbor built!",
    "🏛️ 神殿 建成！": "🏛️ Temple built!", "🏰 王城 建成！": "🏰 Citadel built!", "🎁 神秘獎勵包": "🎁 Mystery Box",
    "🏆 黃金之城已建成！": "🏆 Golden City complete!", "累計里程碑獎勵": "Total milestones earned",
    "有效押注累積金磚（每 NT$200 = 1 塊）。投入建設，每完成一階領里程碑獎入獎金錢包，進度離線保留。": "Wagers earn bricks (NT$200 = 1). Invest to build; each completed tier pays a milestone to your bonus wallet. Progress persists offline.",
    "賺金磚 → 蓋城市 → 領里程碑 · Demo": "Earn bricks → build city → milestones · Demo",
    // 通用揭曉型領獎（#38）
    "🎁 揭曉獎勵": "🎁 Reveal your reward", "🎉 恭喜獲得": "🎉 You won", "太棒了，收下 ✓": "Awesome, claim ✓",
    // Hilo 猜高低（#27）＋補齊 Towers/Mines 共用 stat 標籤既有缺口
    "🃏 Hilo 猜高低": "🃏 Hilo", "Hilo 猜高低": "Hilo", "更高": "Higher", "更低": "Lower", "連對": "Streak", "開始": "Start",
    "目前": "Current", "可贏": "Win", "下注金額": "Bet amount", "投注額": "Bet amount", "主選單": "Main menu", "餘額不足（Demo）": "Insufficient balance (Demo)",
    // Keno 賓果彩（#32）
    "🎱 Keno 賓果彩": "🎱 Keno", "Keno 賓果彩": "Keno", "開獎": "Draw", "隨機選號": "Quick pick",
    "命中": "Hits", "倍數": "Multiplier", "派彩": "Payout",
    "點選 1–10 個號碼，按「開獎」抽 20 球 🎱": "Pick 1–10 numbers, then press Draw for 20 balls 🎱",
    "先選號碼查看賠付表": "Pick numbers to see the paytable", "最多選 10 個號碼": "Pick at most 10 numbers", "請先選 1–10 個號碼": "Pick 1–10 numbers first",
    "🎉 中獎": "🎉 Win", "回收": "Returned", "未達起付命中數": "Below the paying hit count",
    "1% 莊家優勢（各選號數精算）": "1% house edge (exact per pick count)", "選 1–10 號開 20 球": "pick 1–10, draw 20", "可驗證公平（一球一注）": "Provably fair (one nonce per ball)",
    // 遊戲資訊列（S4 共用段落：HL.ui.gameInfoBar 逐段文字節點）
    "1% 莊家優勢": "1% house edge", "~1% 莊家優勢": "~1% house edge", "最高": "Max",
    "拖動握把設目標、切換 大於/小於": "drag the slider to set a target · over/under",
    "崩盤倍數 ≥ 目標即贏": "win if the crash multiplier ≥ your target",
    "落點決定倍數，邊槽高賠率高風險": "landing slot sets the payout — edge slots pay big, risk big",
    "崩盤前兌現即贏 押注×當前倍數": "cash out before the crash to win bet × current multiplier",
    "翻安全格累乘，踩雷歸零": "safe tiles multiply, hit a mine and lose",
    "理論值（示意）": "theoretical (illustrative)",
    // ApexWin Picks 賽事預測（#43，社交運彩 pick'em）
    "🎯 ApexWin Picks 賽事預測": "🎯 ApexWin Picks", "ApexWin Picks 賽事預測": "ApexWin Picks",
    "獨贏": "Moneyline", "大小": "Totals", "主": "Home", "客": "Away", "大": "Over", "小": "Under",
    "我的預測": "My pick", "預估回報": "Est. return", "下單開賽": "Place bet",
    "先在上方選一個盤口 🎯": "Pick a market above 🎯",
    "選一場賽事的盤口，用主餘額下單，開賽後見真章 ⚽🏀": "Choose a market, stake from your balance, then kick off ⚽🏀",
    "模擬賽事非真實賽果": "simulated fixtures, not real results", "可驗證公平（一單一注）": "Provably fair (one nonce per bet)",
    // 淨損 Cashback / Lossback（#33）
    "淨損回饋": "Lossback", "淨輸返現": "Net-loss rebate", "💸 淨損 Cashback": "💸 Net-loss Cashback", "淨損 Cashback": "Net-loss Cashback",
    "目前回饋率": "Current rate", "本週淨損": "Net loss this week", "可領 Cashback": "Claimable cashback",
    "本桶跨週作廢，剩餘": "Resets weekly in", "目前無可領 Cashback": "No cashback to claim yet",
    "只在你「淨輸」時回饋（贏局自動抵銷），與返水互補、零流水。本週未領跨週即作廢。": "Paid only when you're net-down (wins offset losses); complements rakeback, zero wagering. Unclaimed resets weekly.",
    "淨損回饋 · 與返水互補 · 零流水 · Demo": "Net-loss cashback · complements rakeback · zero wagering · Demo",
    "本週淨損回饋": "This week's net-loss cashback",
    // 遞增連登階梯 + 里程碑（#34）
    "🎁 每日簽到 · 連登階梯": "🎁 Daily Check-in · Streak Ladder", "連續簽到": "Streak", "天": " days",
    "連越久單日獎越大 · 第 8/15/22/30 天有里程碑大禮": "Longer streaks pay more · milestone gifts on days 8/15/22/30",
    "今日已領，明天再來": "Claimed today — come back tomorrow", "今日已領取 ✓": "Claimed today ✓",
    "休閒模式 · 日獎進主餘額 · 里程碑進獎金錢包 · Demo": "Casual · daily to balance · milestones to bonus wallet · Demo",
    "連登里程碑": "Streak milestone", "連登": "Streak", "天里程碑": "-day milestone", "簽到成功": "Checked in",
    "每日簽到": "Daily Check-in", "今日可簽": "Check in today",
    // Happy Hour 限時加成（#35）
    "⚡ Happy Hour 限時加成": "⚡ Happy Hour Boost", "進行中，剩餘": "Live — ends in", "下一場倒數": "Next window in",
    "進行中": "Live now", "返水 ×2": "Rakeback ×2", "限時返水加成": "Timed rakeback boost", "返水×2 進行中": "Rakeback ×2 live",
    "每日三個固定時段，窗內所有押注的返水率 ×2（經 💧 返水日桶累積）。": "Three fixed windows daily — all wagers earn double rakeback (accrues to the 💧 daily bucket).",
    "前往 Rakeback 返水 →": "Go to Rakeback →", "排程型時間窗口 · 催時段回訪 · Demo": "Scheduled windows · time-of-day retention · Demo",
    "Happy Hour 開始": "Happy Hour started", "限時返水 ×2 進行中（一小時），把握時段！": "Double rakeback live for one hour — make it count!",
    "⚡ Happy Hour：返水 ×2 進行中": "⚡ Happy Hour: rakeback ×2 live",
    // 紅利/流水引擎（#20）
    "🔒 待解鎖紅利": "🔒 Locked bonuses", "當前解鎖進度": "Unlocking now", "其餘排隊中": "Queued",
    "🎁 領取中心 · 獎金錢包": "🎁 Rewards · Bonus wallet", "可領取獎金": "Claimable bonus", "領取": "Claim", "到主餘額": "to balance",
    "目前沒有可領取獎金": "Nothing to claim yet", "去完成每日任務 →": "Do daily tasks →",
    "有效押注會自動累進流水，達標的紅利自動解鎖為可領取。": "Wagers count toward the rollover automatically; bonuses unlock to claimable when met.",
    "活動獎金先入「待解鎖」，以有效押注累進流水；達標自動轉為可領取，領取後入主餘額。": "Promo bonuses start locked; wagers roll them over. Once met they become claimable, then claim to your balance.",
    "分離記帳 · 流水達標解鎖 · Demo": "Split ledger · unlock by rollover · Demo",
    "🔒 另有待解鎖紅利": "🔒 Locked bonuses pending:", "流水中（不可轉出，達標後至領取中心領取）": "in rollover (not transferable; claim at Rewards once met)",
    "紅利解鎖": "Bonus unlocked",
    // VIP 子級+大階雙層獎金（#29）
    "⭐ 子等級": "⭐ Level", "距下一級": "To next level", "每級獎金": "Per-level bonus",
    "押注即累積 · 子級+大階雙層獎金 · Demo": "Wager to progress · level + tier dual bonuses · Demo",
    "按「開始」翻第一張牌，猜下一張更高或更低 🃏": "Press Start to flip the first card, then guess higher or lower 🃏",
    "✅ 猜對！可繼續或兌現": "✅ Correct! Continue or cash out", "💥 猜錯，這局結束": "💥 Wrong — round over",
    "猜下一張比": "Will the next card beat", "更高還是更低？同點算輸": "— higher or lower? Ties lose", "已兌現": "Cashed out",
    "至少猜對一次再兌現": "Win at least one guess before cashing out",
    "連對累乘，同點算輸": "streak multiplies, ties lose", "可驗證公平（一牌一注）": "Provably fair (one nonce per card)",
    // 新手限時啟用窗口（#28）
    "⏳ 新手啟用大禮包": "⏳ Starter Bonus", "🎁 新手啟用大禮包": "🎁 Starter Bonus", "新手啟用大禮包": "Starter Bonus", "啟用大禮包": "Starter bonus", "啟用禮": "Starter",
    "剩餘時間": "Time left", "完成首注（任一遊戲下注一次）": "Place your first bet (any game)", "完成每日簽到": "Claim the daily check-in",
    "去簽到 →": "Check in →", "領取啟用大禮包": "Claim starter bonus", "啟用窗口已結束": "Activation window ended",
    "進站 6 小時內完成兩項任務，即可領取啟用大禮包（入獎金錢包）。逾期不補發。": "Finish both tasks within 6 hours of arriving to claim the starter bonus (to bonus wallet). No make-ups after expiry.",
    "限時啟用窗口 · 首日轉化鉤子 · Demo": "Timed activation window · day-one hook · Demo",
    "刮開卡片揭曉獎勵": "Scratch the card to reveal", "戳破泡泡揭曉獎勵": "Pop the bubbles to reveal", "轉動轉輪揭曉獎勵": "Spin the wheel to reveal",
    "轉動": "Spin",
    // Towers 爬塔
    "🗼 Towers 爬塔": "🗼 Towers", "Towers 爬塔": "Towers", "下一層": "Next row", "難度": "Difficulty",
    "簡單": "Easy", "普通": "Medium", "困難": "Hard", "專家": "Expert",
    // 小雞過馬路 難度鈕（emoji+詞為單一文字節點；S7 統一詞彙 簡單/普通/困難/專家）
    "🐣 簡單": "🐣 Easy", "🐔 普通": "🐔 Medium", "🔥 困難": "🔥 Hard", "💀 專家": "💀 Expert",
    "選難度、按「開始」，逐層往上爬，隨時兌現 🗼": "Pick a difficulty, hit Start, climb row by row, cash out anytime 🗼",
    // Dice Duel 骰子對決（#30，首個 PvP 對戰維度）
    "⚔️ Dice Duel 骰子對決": "⚔️ Dice Duel", "Dice Duel 骰子對決": "Dice Duel", "對手": "Opponent", "對戰": "Battle",
    "設定賭注，向對手發起 1v1 骰子對決 ⚔️": "Set your bet and challenge an opponent to a 1v1 dice duel ⚔️",
    "擲骰中…": "Rolling…", "🏆 你贏了！贏家通吃": "🏆 You win! Winner takes all", "💥 你輸了，賭注歸對手": "💥 You lose — your bet goes to the opponent",
    "1% 莊家優勢（贏家通吃扣 1% 抽水）": "1% house edge (winner takes the pot minus 1% rake)", "平手重擲": "ties reroll", "可驗證公平（一擲一注）": "Provably fair (one nonce per roll)",
    "從最底層往上爬，選對的格子累乘倍數": "Climb from the bottom — each safe tile multiplies your win",
    "至少爬一層再兌現": "Climb at least one row before cashing out", "🏆 登頂！": "🏆 Reached the top!",
    "逐層爬升累乘，踩陷阱歸零": "climb to multiply, hit a trap and lose", "可驗證公平（一層一注）": "Provably fair (one bet per row)",
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
    "🔥 熱門遊戲": "🔥 Hot Games", "⭐ 最新遊戲": "⭐ New Games", "♥ 我的最愛": "♥ My Favorites", "🕘 最近遊玩": "🕘 Recently Played", "我的最愛": "My Favorites",
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
    "前 30 名分得獎池：第 1 名 25%、第 2 名 14%、第 3 名 9%，逐名遞減；第 11–20 名各 1.5%、第 21–30 名各 1.16%（陡頭長尾、派獎更深）。": "Top 30 share the pool: 25% / 14% / 9% for the podium, tapering by rank; #11–20 get 1.5% each and #21–30 get 1.16% each (steep head, long tail).",
    "限時錦標賽": "Timed Race", "衝榜分獎池": "Race for the pool",
    "賽事循環進行，一期結束立即開新一期。": "Events run continuously; a new period starts when one ends.",
    "純前端 Demo · 積分與派彩為遊戲幣": "Frontend Demo · points & payouts are game coins",
    "🏁 本期結算": "🏁 Period result", "你的名次": "Your rank", "獲得獎金": "Prize won", "新一期已開始 · Demo": "New period started · Demo",
    "🏆 限時錦標賽 · 進行中": "🏆 Timed Race · Live", "立即參賽 →": "Join now →",
    // 實時統計浮窗（live-stats）
    "📈 實時統計": "📈 Live Stats", "盈虧": "Profit", "投注數": "Bets", "中獎數": "Wins",
    "總投注": "Total wagered", "總贏分": "Total won", "最大單筆": "Biggest win", "最近遊戲": "Recent game",
    "🔗 分享戰績": "🔗 Share results", "重置統計": "Reset stats", "實時統計已重置": "Live stats reset",
    "🔒 伺服器結算資料": "🔒 Server-settled data", "Demo 客端資料": "Demo client data", "本瀏覽器工作階段": "This browser session",
    // 虛擬主播 PiP 靜態標籤
    "虛擬主播": "Virtual host", "跟注 ▶": "Follow ▶", "已跟注 ✓ 取消": "Followed ✓ Cancel"
  };

  // 「標籤＋動態值」串接成單一文字節點時，用前綴/後綴比對（精確比對失敗才走這裡）
  var PREFIX = {
    en: { "房主 ": "Host ", "挑戰次數 ": "Challenges ", "加入 ": "Join ", "押 ": "Bet ", "你 ": "You ", "投 ": "Wager ", "搜尋 ": "Search ", "正在玩：": "Playing: ", "本局遊戲：": "Game: ", "直播主本局選擇：": "Host pick: ", "世界活動 · ": "World Event · " },
    "zh-Hans": { "挑戰次數 ": "挑战次数 ", "賭注 ": "赌注 ", "搜尋 ": "搜索 ", "直播主本局選擇：": "主播本局选择：", "世界活動 · ": "世界活动 · " }
  };
  var SUFFIX = {
    en: { " 秒前": "s ago", " 分前": "m ago", " 小時前": "h ago", " 挑戰者": " Challenger", " 玩家": " players", " 輪": " rounds", " 秒": "s", " 金磚": " bricks", " 點": " pts" },
    "zh-Hans": { " 挑戰者": " 挑战者", " 金磚": " 金砖", " 點": " 分" }
  };

  var HANS = {
    // 遊戲卡即時人數（S9，「在玩」簡繁同形不列）
    "線上遊玩人數（模擬）": "在线游玩人数（模拟）",
    // 側欄收合（S14，收合簡繁同形不列）
    "收合側欄": "收合侧栏", "展開側欄": "展开侧栏",
    // VIP 福利矩陣（S11，返水簡繁同形不列）
    "等級": "等级", "累積押注": "累计押注", "升級獎金": "升级奖金", "下一級": "下一级",
    "各級福利一覽（返水率隨等級放大、升級發獎金）": "各级福利一览（返水率随等级放大、升级发奖金）",
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
    "💧 餘額救濟金": "💧 余额救济金", "領救濟金": "领救济金", "救濟金": "救济金", "已入主餘額": "已入主余额",
    "目前可玩餘額": "目前可玩余额", "餘額見底，可領救濟金續玩": "余额见底，可领救济金续玩",
    "餘額充足時無需領取。": "余额充足时无需领取。",
    "餘額不足時可領一筆救濟金續玩，每 8 小時一次。": "余额不足时可领一笔救济金续玩，每 8 小时一次。",
    "餘額歸零救濟 · 防流失鉤子 · Demo": "余额归零救济 · 防流失钩子 · Demo",
    "🔥 現在最多人玩": "🔥 现在最多人玩", "即時熱度 · 依近期下注": "实时热度 · 依近期下注", "火熱": "火热", "冰冷": "冰冷",
    "週期紅利": "周期红利", "🔄 週期紅利 Reload": "🔄 周期红利 Reload", "你的等級": "你的等级",
    "每日紅利": "每日红利", "每週紅利": "每周红利", "每月紅利": "每月红利",
    "已領取 ✓": "已领取 ✓", "本期可領": "本期可领", "下次可領倒數：": "下次可领倒数：", "本期已領": "本期已领", "VIP 週期禮": "VIP 周期礼",
    "等級越高，每日/每週/每月可領紅利越多。到期可領，逾期不累積。": "等级越高，每日/每周/每月可领红利越多。到期可领，逾期不累积。",
    "前往領取中心 →": "前往领取中心 →", "依 VIP 等級 · 週期可領 · 入獎金錢包 · Demo": "依 VIP 等级 · 周期可领 · 入奖金钱包 · Demo",
    "🔄 領週期紅利（每日/週/月）→": "🔄 领周期红利（每日/周/月）→",
    // Chat Rain 聊天灑幣（#25）— 鍵須為 trimmed 形式；"已領取 ✓" 沿用 Reload 既有鍵
    "紅包雨進行中": "红包雨进行中", "領取雨露": "领取雨露",
    "先在聊天室發言即可參與": "先在聊天室发言即可参与", "🌧️ 下一場紅包雨": "🌧️ 下一场红包雨",
    // 點數商城 / Reward Market（#36）
    "🛍️ 點數商城": "🛍️ 积分商城", "點數商城": "积分商城", "我的點數": "我的积分", "點": "分",
    "小獎金券": "小奖金券", "中獎金券": "中奖金券", "大獎金券": "大奖金券", "神秘獎勵包": "神秘奖励包",
    "命運寶箱": "命运宝箱", "🎰 命運寶箱": "🎰 命运宝箱",
    "兌換": "兑换", "已兌換 ✓": "已兑换 ✓", "獎勵": "奖励", "VIP 折扣": "VIP 折扣",
    "本日已兌換 · 下次": "本日已兑换 · 下次", "本週已兌換 · 下次": "本周已兑换 · 下次",
    "有效押注累積點數（每 NT$100 = 1 點）。兌換獎勵入獎金錢包，各品項有冷卻。": "有效投注累积积分（每 NT$100 = 1 分）。兑换奖励入奖金钱包，各品项有冷却。",
    "賺→逛→換 · 點數消耗端 · Demo": "赚→逛→换 · 积分消耗端 · Demo",
    // 黃金之城 meta 層（#37）
    "🏰 黃金之城": "🏰 黄金之城", "黃金之城": "黄金之城", "我的金磚": "我的金砖", "金磚": "金砖",
    "營地": "营地", "港灣": "港湾", "投入金磚": "投入金砖", "建設中：": "建设中：",
    "完成獎勵": "完成奖励", "建設進度": "建设进度", "蓋城市領里程碑": "盖城市领里程碑",
    "⛺ 營地 建成！": "⛺ 营地 建成！", "⚓ 港灣 建成！": "⚓ 港湾 建成！", "🎁 神秘獎勵包": "🎁 神秘奖励包", "已入獎金錢包": "已入奖金钱包",
    "🏆 黃金之城已建成！": "🏆 黄金之城已建成！", "累計里程碑獎勵": "累计里程碑奖励",
    "有效押注累積金磚（每 NT$200 = 1 塊）。投入建設，每完成一階領里程碑獎入獎金錢包，進度離線保留。": "有效投注累积金砖（每 NT$200 = 1 块）。投入建设，每完成一阶领里程碑奖入奖金钱包，进度离线保留。",
    "賺金磚 → 蓋城市 → 領里程碑 · Demo": "赚金砖 → 盖城市 → 领里程碑 · Demo",
    // 通用揭曉型領獎（#38）
    "🎁 揭曉獎勵": "🎁 揭晓奖励", "🎉 恭喜獲得": "🎉 恭喜获得", "太棒了，收下 ✓": "太棒了，收下 ✓",
    // Hilo 猜高低（#27）＋補齊共用 stat 標籤
    "連對": "连对", "可贏": "可赢", "下注金額": "下注金额", "投注額": "投注额", "主選單": "主选单", "餘額不足（Demo）": "余额不足（Demo）",
    // Keno 賓果彩（#32）
    "🎱 Keno 賓果彩": "🎱 Keno 宾果彩", "Keno 賓果彩": "Keno 宾果彩", "開獎": "开奖", "隨機選號": "随机选号", "倍數": "倍数",
    "點選 1–10 個號碼，按「開獎」抽 20 球 🎱": "点选 1–10 个号码，按「开奖」抽 20 球 🎱",
    "先選號碼查看賠付表": "先选号码查看赔付表", "最多選 10 個號碼": "最多选 10 个号码", "請先選 1–10 個號碼": "请先选 1–10 个号码",
    "🎉 中獎": "🎉 中奖", "未達起付命中數": "未达起付命中数",
    "1% 莊家優勢（各選號數精算）": "1% 庄家优势（各选号数精算）", "選 1–10 號開 20 球": "选 1–10 号开 20 球", "可驗證公平（一球一注）": "可验证公平（一球一注）",
    // 遊戲資訊列（S4 共用段落：HL.ui.gameInfoBar 逐段文字節點）
    "1% 莊家優勢": "1% 庄家优势", "~1% 莊家優勢": "~1% 庄家优势",
    "拖動握把設目標、切換 大於/小於": "拖动握把设目标、切换 大于/小于",
    "崩盤倍數 ≥ 目標即贏": "崩盘倍数 ≥ 目标即赢",
    "落點決定倍數，邊槽高賠率高風險": "落点决定倍数，边槽高赔率高风险",
    "崩盤前兌現即贏 押注×當前倍數": "崩盘前兑现即赢 押注×当前倍数",
    "翻安全格累乘，踩雷歸零": "翻安全格累乘，踩雷归零",
    "理論值（示意）": "理论值（示意）",
    "逐層爬升累乘，踩陷阱歸零": "逐层爬升累乘，踩陷阱归零", "可驗證公平（一層一注）": "可验证公平（一层一注）",
    // 難度選擇器統一詞彙（S7：Towers/小雞 共用階梯 簡單/普通/困難/專家；普通 繁簡同形免列）
    "難度": "难度", "下一層": "下一层", "簡單": "简单", "困難": "困难", "專家": "专家",
    "🐣 簡單": "🐣 简单", "🔥 困難": "🔥 困难", "💀 專家": "💀 专家",
    // ApexWin Picks 賽事預測（#43，社交運彩 pick'em）
    "🎯 ApexWin Picks 賽事預測": "🎯 ApexWin Picks 赛事预测", "ApexWin Picks 賽事預測": "ApexWin Picks 赛事预测",
    "獨贏": "独赢", "大小": "大小", "主": "主", "客": "客", "大": "大", "小": "小",
    "我的預測": "我的预测", "預估回報": "预估回报", "下單開賽": "下单开赛",
    "先在上方選一個盤口 🎯": "先在上方选一个盘口 🎯",
    "選一場賽事的盤口，用主餘額下單，開賽後見真章 ⚽🏀": "选一场赛事的盘口，用主余额下单，开赛后见真章 ⚽🏀",
    "模擬賽事非真實賽果": "模拟赛事非真实赛果", "可驗證公平（一單一注）": "可验证公平（一单一注）",
    // 淨損 Cashback / Lossback（#33）
    "淨損回饋": "净损回馈", "淨輸返現": "净输返现", "💸 淨損 Cashback": "💸 净损 Cashback", "淨損 Cashback": "净损 Cashback",
    "目前回饋率": "当前回馈率", "本週淨損": "本周净损", "可領 Cashback": "可领 Cashback",
    "本桶跨週作廢，剩餘": "本桶跨周作废，剩余", "目前無可領 Cashback": "当前无可领 Cashback",
    "只在你「淨輸」時回饋（贏局自動抵銷），與返水互補、零流水。本週未領跨週即作廢。": "只在你「净输」时回馈（赢局自动抵销），与返水互补、零流水。本周未领跨周即作废。",
    "淨損回饋 · 與返水互補 · 零流水 · Demo": "净损回馈 · 与返水互补 · 零流水 · Demo",
    "本週淨損回饋": "本周净损回馈",
    // 遞增連登階梯 + 里程碑（#34）
    "🎁 每日簽到 · 連登階梯": "🎁 每日签到 · 连登阶梯", "連續簽到": "连续签到",
    "連越久單日獎越大 · 第 8/15/22/30 天有里程碑大禮": "连越久单日奖越大 · 第 8/15/22/30 天有里程碑大礼",
    "今日已領，明天再來": "今日已领，明天再来", "今日已領取 ✓": "今日已领取 ✓",
    "休閒模式 · 日獎進主餘額 · 里程碑進獎金錢包 · Demo": "休闲模式 · 日奖进主余额 · 里程碑进奖金钱包 · Demo",
    "連登里程碑": "连登里程碑", "連登": "连登", "簽到成功": "签到成功",
    "每日簽到": "每日签到", "今日可簽": "今日可签",
    // Happy Hour 限時加成（#35）
    "⚡ Happy Hour 限時加成": "⚡ Happy Hour 限时加成", "進行中，剩餘": "进行中，剩余", "下一場倒數": "下一场倒数",
    "進行中": "进行中", "限時返水加成": "限时返水加成", "返水×2 進行中": "返水×2 进行中",
    "每日三個固定時段，窗內所有押注的返水率 ×2（經 💧 返水日桶累積）。": "每日三个固定时段，窗内所有押注的返水率 ×2（经 💧 返水日桶累积）。",
    "排程型時間窗口 · 催時段回訪 · Demo": "排程型时间窗口 · 催时段回访 · Demo",
    "Happy Hour 開始": "Happy Hour 开始", "限時返水 ×2 進行中（一小時），把握時段！": "限时返水 ×2 进行中（一小时），把握时段！",
    "⚡ Happy Hour：返水 ×2 進行中": "⚡ Happy Hour：返水 ×2 进行中",
    // 紅利/流水引擎（#20）
    "🔒 待解鎖紅利": "🔒 待解锁红利", "當前解鎖進度": "当前解锁进度", "其餘排隊中": "其余排队中",
    "🎁 領取中心 · 獎金錢包": "🎁 领取中心 · 奖金钱包", "可領取獎金": "可领取奖金", "領取": "领取", "到主餘額": "到主余额",
    "目前沒有可領取獎金": "目前没有可领取奖金", "去完成每日任務 →": "去完成每日任务 →",
    "有效押注會自動累進流水，達標的紅利自動解鎖為可領取。": "有效投注会自动累进流水，达标的红利自动解锁为可领取。",
    "活動獎金先入「待解鎖」，以有效押注累進流水；達標自動轉為可領取，領取後入主餘額。": "活动奖金先入「待解锁」，以有效投注累进流水；达标自动转为可领取，领取后入主余额。",
    "分離記帳 · 流水達標解鎖 · Demo": "分离记账 · 流水达标解锁 · Demo",
    "🔒 另有待解鎖紅利": "🔒 另有待解锁红利", "流水中（不可轉出，達標後至領取中心領取）": "流水中（不可转出，达标后至领取中心领取）",
    "紅利解鎖": "红利解锁",
    // VIP 子級+大階雙層獎金（#29）
    "⭐ 子等級": "⭐ 子等级", "距下一級": "距下一级", "每級獎金": "每级奖金",
    "押注即累積 · 子級+大階雙層獎金 · Demo": "押注即累积 · 子级+大阶双层奖金 · Demo",
    "按「開始」翻第一張牌，猜下一張更高或更低 🃏": "按「开始」翻第一张牌，猜下一张更高或更低 🃏",
    "✅ 猜對！可繼續或兌現": "✅ 猜对！可继续或兑现", "💥 猜錯，這局結束": "💥 猜错，这局结束",
    "猜下一張比": "猜下一张比", "更高還是更低？同點算輸": "更高还是更低？同点算输", "已兌現": "已兑现", "開始": "开始",
    "至少猜對一次再兌現": "至少猜对一次再兑现",
    "連對累乘，同點算輸": "连对累乘，同点算输", "可驗證公平（一牌一注）": "可验证公平（一牌一注）",
    // 新手限時啟用窗口（#28）
    "⏳ 新手啟用大禮包": "⏳ 新手启用大礼包", "🎁 新手啟用大禮包": "🎁 新手启用大礼包", "新手啟用大禮包": "新手启用大礼包", "啟用大禮包": "启用大礼包", "啟用禮": "启用礼",
    "剩餘時間": "剩余时间", "完成首注（任一遊戲下注一次）": "完成首注（任一游戏下注一次）", "完成每日簽到": "完成每日签到",
    "去簽到 →": "去签到 →", "領取啟用大禮包": "领取启用大礼包", "啟用窗口已結束": "启用窗口已结束",
    "進站 6 小時內完成兩項任務，即可領取啟用大禮包（入獎金錢包）。逾期不補發。": "进站 6 小时内完成两项任务，即可领取启用大礼包（入奖金钱包）。逾期不补发。",
    "限時啟用窗口 · 首日轉化鉤子 · Demo": "限时启用窗口 · 首日转化钩子 · Demo",
    "刮開卡片揭曉獎勵": "刮开卡片揭晓奖励", "戳破泡泡揭曉獎勵": "戳破泡泡揭晓奖励", "轉動轉輪揭曉獎勵": "转动转轮揭晓奖励",
    "轉動": "转动",
    // Dice Duel 骰子對決（#30）
    "⚔️ Dice Duel 骰子對決": "⚔️ Dice Duel 骰子对决", "Dice Duel 骰子對決": "Dice Duel 骰子对决", "對手": "对手", "對戰": "对战",
    "設定賭注，向對手發起 1v1 骰子對決 ⚔️": "设定赌注，向对手发起 1v1 骰子对决 ⚔️",
    "擲骰中…": "掷骰中…", "🏆 你贏了！贏家通吃": "🏆 你赢了！赢家通吃", "💥 你輸了，賭注歸對手": "💥 你输了，赌注归对手",
    "1% 莊家優勢（贏家通吃扣 1% 抽水）": "1% 庄家优势（赢家通吃扣 1% 抽水）", "平手重擲": "平手重掷", "可驗證公平（一擲一注）": "可验证公平（一掷一注）",
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
    "🔥 熱門遊戲": "🔥 热门游戏", "⭐ 最新遊戲": "⭐ 最新游戏", "♥ 我的最愛": "♥ 我的收藏", "🕘 最近遊玩": "🕘 最近游玩", "我的最愛": "我的收藏",
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
    "前 30 名分得獎池：第 1 名 25%、第 2 名 14%、第 3 名 9%，逐名遞減；第 11–20 名各 1.5%、第 21–30 名各 1.16%（陡頭長尾、派獎更深）。": "前 30 名分得奖池：第 1 名 25%、第 2 名 14%、第 3 名 9%，逐名递减；第 11–20 名各 1.5%、第 21–30 名各 1.16%（陡头长尾、派奖更深）。",
    "限時錦標賽": "限时锦标赛", "衝榜分獎池": "冲榜分奖池",
    "賽事循環進行，一期結束立即開新一期。": "赛事循环进行，一期结束立即开新一期。",
    "純前端 Demo · 積分與派彩為遊戲幣": "纯前端 Demo · 积分与派彩为游戏币",
    "🏁 本期結算": "🏁 本期结算", "獲得獎金": "获得奖金", "新一期已開始 · Demo": "新一期已开始 · Demo",
    "🏆 限時錦標賽 · 進行中": "🏆 限时锦标赛 · 进行中", "立即參賽 →": "立即参赛 →",
    "逾期作廢，剩餘": "逾期作废，剩余", "暫無可領返水": "暂无可领返水", "返水明細 / 各級費率 →": "返水明细 / 各级费率 →",
    "今日可領返水": "今日可领返水", "本桶逾期作廢，剩餘": "本桶逾期作废，剩余",
    // 實時統計浮窗（live-stats）
    "📈 實時統計": "📈 实时统计", "盈虧": "盈亏", "投注數": "投注数", "中獎數": "中奖数",
    "總投注": "总投注", "總贏分": "总赢分", "最大單筆": "最大单笔", "最近遊戲": "最近游戏",
    "🔗 分享戰績": "🔗 分享战绩", "重置統計": "重置统计", "實時統計已重置": "实时统计已重置",
    "🔒 伺服器結算資料": "🔒 服务器结算资料", "Demo 客端資料": "Demo 客户端资料", "本瀏覽器工作階段": "本浏览器工作阶段",
    // 虛擬主播 PiP 靜態標籤（「跟注 ▶」等簡繁同形者依慣例不列）
    "虛擬主播": "虚拟主播"
  };

  var DICT = { en: EN, "zh-Hans": HANS };
  var OBS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "placeholder", "aria-label"] };
  var observer = null;
  function lang() { return HL.lang || "zh-Hant"; }
  function dict() { return DICT[lang()]; }

  // U15：翻譯前保存原文（expando）——setLang 先走 restore() 還原，掛 body 的持久浮動元件
  // （panels/pip/live-stats/faucet pill…不在全量重繪範圍）切語系往返才能回到 zh-Hant 原文。
  function tText(node, d) {
    var raw = node.nodeValue, k = raw.trim();
    if (!k) return;
    if (d[k] != null) { if (node.__i18nOrig == null) node.__i18nOrig = raw; node.nodeValue = raw.replace(k, d[k]); return; }
    var pre = PREFIX[lang()], p;
    if (pre) for (p in pre) { if (k.indexOf(p) === 0) { if (node.__i18nOrig == null) node.__i18nOrig = raw; node.nodeValue = raw.replace(p, pre[p]); return; } }
    var suf = SUFFIX[lang()], s;
    if (suf) for (s in suf) { if (k.length > s.length && k.slice(-s.length) === s) { if (node.__i18nOrig == null) node.__i18nOrig = raw; node.nodeValue = raw.replace(k, k.slice(0, k.length - s.length) + suf[s]); return; } }
  }
  function tAttrs(elm, d) {
    if (!elm.getAttribute) return;
    ["title", "placeholder", "aria-label"].forEach(function (a) {
      var v = elm.getAttribute(a); if (!v) return;
      var k = v.trim(); if (d[k] == null) return;
      var o = elm.__i18nOrigA || (elm.__i18nOrigA = {});
      if (o[a] == null) o[a] = v;
      elm.setAttribute(a, d[k]);
    });
  }
  function restoreAttrs(elm) {
    var o = elm.__i18nOrigA;
    if (!o) return;
    for (var a in o) { if (o[a] != null && elm.getAttribute(a) != null) elm.setAttribute(a, o[a]); }
    elm.__i18nOrigA = null;
  }
  function restore() {
    var root = document.body; if (!root) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n; while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(function (t) { if (t.__i18nOrig != null) { t.nodeValue = t.__i18nOrig; t.__i18nOrig = null; } });
    var withA = root.querySelectorAll("[title],[placeholder],[aria-label]");
    Array.prototype.forEach.call(withA, restoreAttrs);
  }
  function walk(root) {
    var d = dict(); if (!d || !root) return;
    if (root.nodeType === 3) { tText(root, d); return; }
    if (root.nodeType !== 1) return;
    tAttrs(root, d);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n; while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(function (t) { tText(t, d); });
    var withAttr = root.querySelectorAll ? root.querySelectorAll("[title],[placeholder],[aria-label]") : [];
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
        else if (m.type === "characterData") { if (m.target) m.target.__i18nOrig = null; tText(m.target, d); } // app 重寫內容＝新原文，捨棄舊存檔（U15）
        else if (m.type === "attributes" && m.target) { if (m.target.__i18nOrigA) m.target.__i18nOrigA[m.attributeName] = null; tAttrs(m.target, d); }
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
    restore();                                        // 先還原全 DOM 原文——含掛 body 的持久浮動元件（U15，重繪只救得了 views）
    if (HL.app && HL.app.refresh) HL.app.refresh(); // 重繪回原文(zh-Hant)（renderApp 尾端會 apply 翻譯）
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

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
    // #55 成長進度可停靠面板（HL.dock 第二代註冊者）——平台軌落地時同步補譯（船長 P3 紀律：不再只出繁中）
    "成長": "Growth", "成長進度": "Growth", "季票 · 成就 · 公會": "Pass · Badges · Guild",
    "季票進度": "Season Pass", "進階軌": "Premium", "免費軌": "Free", "已結束": "Ended",
    "階級": "Tier", "距下一階（經驗）": "To next tier (XP)", "已滿階": "Max tier",
    "可領獎勵": "Claimable", "剩餘天數": "Days left", "賽季狀態": "Season status",
    "前往領取": "Claim now", "開啟季票": "Open Season Pass",
    "成就進度": "Achievements", "徽章解鎖": "Badges unlocked",
    "成就點數": "Achievement points", "完成度": "Completion", "開啟徽章牆": "Open badge wall",
    "公會": "Guild", "尚未加入公會": "Not in a guild", "招募中公會": "Guilds recruiting",
    "瀏覽公會": "Browse guilds", "公會週貢獻": "Guild contribution", "本週排名": "Weekly rank",
    "我的貢獻": "My contribution", "可領任務": "Claimable quests", "領取公會任務": "Claim guild quests",
    "開啟公會": "Open guild", "成長模組尚未載入。": "Growth modules not loaded.",
    "進度隨每筆有效押注即時累積（走中央結算點）。": "Progress accrues from every qualifying wager (via the central settlement hook).",
    "成長進度（季票·成就·公會）": "Growth (Pass · Badges · Guild)",
    // #45 成就徽章牆 open() 面板內容（船長 P3：#45–#49 五面板字典零覆蓋 → 維護軌 i18n 覆蓋輪逐一補；本輪 #45）
    //   已於他區覆蓋：累積押注/成就點數/完成度/前往領取中心 →；「N 點」「完成度 N%」「✓ 已解鎖…」走 SUFFIX/PREFIX
    "下注里程碑": "Betting Milestones", "勝利": "Victories", "大獎 · 高倍": "Big Wins · Multipliers",
    "探索": "Exploration", "忠誠": "Loyalty",
    "初試身手": "First Steps", "百戰之路": "Path of a Hundred Battles", "千局老手": "Thousand-Round Veteran",
    "小試流水": "First Taste of Wagering", "流水達人": "Wagering Expert", "百萬流水": "Million in Wagers",
    "常勝之始": "Winning Streak Begins", "勝場常客": "Regular Winner",
    "初嘗大獎": "First Big Win", "一擲萬金": "All In", "十倍時刻": "10× Moment",
    "百倍傳說": "100× Legend", "千倍神話": "1000× Myth",
    "廣泛涉獵": "Broad Explorer", "遍歷賭城": "City Wanderer",
    "黃金會員": "Gold Member", "鑽石之巔": "Diamond Peak", "一週不斷": "A Week Straight", "月度全勤": "Perfect Month",
    "完成第一次下注": "Place your first bet", "累積下注 100 次": "Place 100 bets", "累積下注 1,000 次": "Place 1,000 bets",
    "累積有效押注 NT$10,000": "Wager NT$10,000 total", "累積有效押注 NT$100,000": "Wager NT$100,000 total", "累積有效押注 NT$1,000,000": "Wager NT$1,000,000 total",
    "累積贏 50 局": "Win 50 rounds", "累積贏 500 局": "Win 500 rounds",
    "單筆贏分達 NT$5,000": "Win NT$5,000 in a single payout", "單筆贏分達 NT$50,000": "Win NT$50,000 in a single payout",
    "單局命中 10× 以上": "Hit 10× or more in one round", "單局命中 100× 以上": "Hit 100× or more in one round", "單局命中 1,000× 以上": "Hit 1,000× or more in one round",
    "玩過 5 款不同遊戲": "Play 5 different games", "玩過 12 款不同遊戲": "Play 12 different games",
    "VIP 等級達到黃金": "Reach VIP Gold", "VIP 等級達到鑽石": "Reach VIP Diamond",
    "連續簽到 7 天": "Check in 7 days straight", "連續簽到 30 天": "Check in 30 days straight",
    "已解鎖徽章": "Badges unlocked", "🏅 成就徽章牆": "🏅 Achievement Badge Wall",
    "下注即累積終身進度 · 解鎖即發獎金與成就點數 · Demo": "Every bet builds lifetime progress · unlock for bonuses and points · Demo",
    // #46 季票 Season Pass open() 面板（船長 P3：#45–#49 五面板逐一補；本輪 #46）——賽季名「暗影賽季 · 第一季」刻意不列（渲染時與 icon/notify 串接＝非整文字節點、DOM walker 翻不到）；bonus source「季票·進階軌/免費軌」為帳本成本標籤非 UI 文字故不列；「階級/免費軌/領取」已於 #55 覆蓋
    "💎 進階軌已解鎖！已達階級的進階獎勵現可回溯領取": "💎 Premium track unlocked! Rewards for reached tiers are now claimable retroactively",
    "季票進階軌已解鎖": "Season Pass Premium unlocked", "✓ 已領": "✓ Claimed",
    "🔒 需進階": "🔒 Premium only", "🔒 未達": "🔒 Locked",
    "本賽季已結束 · 仍可領取已達階級": "Season ended · reached tiers still claimable",
    "已達頂階 🏁": "Max tier reached 🏁", "賽季經驗已滿": "Season XP maxed",
    "💎 進階軌已解鎖 · 進階獎勵全數開放": "💎 Premium track unlocked · all premium rewards open",
    "🔓 解鎖進階軌": "🔓 Unlock Premium track", "解鎖": "Unlock",
    "暫無可領取": "Nothing to claim", "目前沒有可領取的階級獎勵": "No tier rewards available to claim right now",
    "💎 進階軌": "💎 Premium",
    "下注累積賽季經驗 · 免費軌人人可領 · 進階軌以成就點數解鎖 · Demo": "Bets earn season XP · free track for all · premium unlocked with achievement points · Demo",
    "🎟️ 季票 · Season Pass": "🎟️ Season Pass",
    // 遊戲卡即時人數（S9）
    "在玩": "playing", "線上遊玩人數（模擬）": "Live players online (simulated)",
    // 側欄收合（S14）
    "收合側欄": "Collapse sidebar", "展開側欄": "Expand sidebar",
    // Pump 打氣（新遊戲）
    "🎈 Pump 打氣": "🎈 Pump", "Pump 打氣": "Pump", "打氣 +": "Pump +", "下一步": "Next", "爆裂率": "Burst %",
    "一刺一注": "1 spike = 1 bet", "2% 莊家優勢": "2% house edge",
    "逐次打氣累乘，爆裂率逐次上升，隨時兌現": "Pump to multiply; burst chance rises each pump; cash out anytime",
    "選難度、按「開始」，逐次打氣衝倍數，隨時兌現 🎈": "Pick difficulty, hit Start, pump to build the multiplier, cash out anytime 🎈",
    // Cases 開箱（新遊戲）
    "🎁 Cases 開箱": "🎁 Cases", "Cases 開箱": "Cases", "開箱 🎁": "Open case 🎁", "說明": "Info",
    "可驗證公平（一注一轉）": "Provably fair (one nonce per spin)", "≈1.5% 莊家優勢": "≈1.5% house edge",
    "滾輪停在指針下的倍數即為本局賠付；難度只改分布、RTP 不變": "The multiplier under the pointer is your payout; difficulty changes only the spread, not the RTP",
    // 福利中心 hub（底部列 IA 去扁平化）
    "福利中心": "Rewards Hub", "🎁 福利中心": "🎁 Rewards Hub", "全部獎勵領取": "All rewards & claims",
    "每日領取": "Daily Claims", "獎金回饋": "Bonus & Cashback", "成長 · 商城": "Progress · Shop", "信任 · 資訊": "Trust · Info",
    // U22 玩法頁動態組字（HL.i18n.fmt 模板，{name} 為運行時佔位符）
    "第 {n} 次打氣成功，可繼續或兌現": "Pump #{n} OK — keep going or cash out",
    "💥 爆了！這局結束（第 {n} 次打氣）": "💥 Boom! Round over (pump #{n})",
    "兌現 {m}×　贏 +{amt}": "Cashed out {m}×　won +{amt}",
    "下一次：{m}　成功率 {p}%": "Next: {m}　win rate {p}%",
    "最高 {m}　RTP 98.5%": "Max {m}　RTP 98.5%",
    "第 {k} 格": "Cell {k}",
    "第 {p} 期　|　預計開獎 {d}": "Round {p}　|　draw {d}",
    // VIP 福利矩陣（S11）
    "等級": "Level", "累積押注": "Total Wager", "返水": "Rakeback", "升級獎金": "Level-up Bonus", "下一級": "Next",
    "各級福利一覽（返水率隨等級放大、升級發獎金）": "Benefits by tier (rakeback grows with level; level-up pays a bonus)",
    // 側欄 / header / 底部列
    "大廳": "Lobby", "全球獎": "Global Prize", "競技場": "Arena", "娛樂城": "Casino", "更多": "More",
    "通知": "Notifications", "語言": "Language", "錢包": "Wallet", "錢包設定": "Wallet settings",
    "每日任務": "Daily Tasks", "獎勵中心": "Rewards", "負責任博弈": "Responsible Gaming", "可驗證公平": "Provably Fair", "VIP 俱樂部": "VIP Club", "夥伴": "Buddy", "聊天": "Chat",
    // VIP 服務水準軸 #63（分階提領時效／日・週・月額度／客服層級）
    "🚚 服務水準": "🚚 Service Level",
    "🚚 服務水準（提領時效／額度）→": "🚚 Service Level (payout speed / limits) →",
    "🚚 服務水準（依 VIP 段位）→": "🚚 Service Level (by VIP tier) →",
    "提領處理時效": "Payout processing time", "客服層級": "Support level",
    "每日提領上限": "Daily withdrawal limit", "每週提領上限": "Weekly withdrawal limit", "每月提領上限": "Monthly withdrawal limit",
    "標準客服": "Standard support", "優先客服": "Priority support", "專屬客戶經理": "Dedicated account manager",
    "小時": "hours", "小時內": "hours or less", "（目前）": "(current)",
    "預計到帳時間": "Estimated payout time", "各段位服務水準一覽": "Service level by tier",
    // #74 紅利流水倍數（條款軸的第五個維度）
    "紅利流水倍數": "Bonus wagering multiplier", "紅利流水": "Bonus wagering",
    "紅利流水倍數同屬服務水準：段位越高，同一筆獎金越早解鎖——金額完全不變，只是拿到得更快。":
      "The bonus wagering multiplier is part of the service level too: the higher your tier, the sooner the same bonus unlocks — the amount never changes, you just get it faster.",
    "本期剩餘額度": "Remaining this period", "本日剩餘額度": "Remaining today",
    "本週剩餘額度": "Remaining this week", "本月剩餘額度": "Remaining this month",
    "VIP 不只決定拿多少獎金，也決定「拿錢這件事」的服務水準：提領處理時效、各週期額度上限與客服層級皆隨段位提升。":
      "VIP is not only about how much you get — it also sets the service level for getting paid: payout speed, per-period limits and support level all improve with your tier.",
    "每日提領上限刻意全段位一致——分階的是處理速度與長週期額度，不把新手鎖在極低的日限。":
      "The daily limit is deliberately the same for every tier — what scales is speed and the longer-period limits, not locking newcomers into a tiny daily cap.",
    "真站保守模式：額度較緊、時效較長。": "Live mode (conservative): tighter limits, longer processing time.",
    "假站寬鬆模式：額度較寬、時效較短。": "Demo mode (generous): looser limits, faster processing.",
    "提領時效為預估值 · 額度依段位 · Demo": "Processing time is an estimate · limits by tier · Demo",
    // 負責任博弈 #67（限額註冊表 + 冷靜期 + 現實檢查）
    "🛡️ 負責任博弈": "🛡️ Responsible Gaming", "設定限額與冷靜期": "Set limits & cool-off",
    "限額已啟用": "Limits active", "冷靜期進行中": "Cool-off in progress", "自我約束工具": "Self-control tools",
    "每日淨損上限": "Daily net-loss limit", "每日投注額上限": "Daily wager limit", "單注上限": "Max single bet", "每日遊玩時間上限": "Daily play-time limit",
    // #70 儲值側限額閘：兩軸分段標題 + 三型別 + 週/月「已用」標籤（日型別沿用既有「今日已用」）
    // 註：舊的分段標題鍵「限額」已由「下注限額／儲值限額」取代並移除，避免留下死鍵（DEBT U31 同型）
    "下注限額": "Betting limits", "儲值限額": "Deposit limits",
    "每日儲值上限": "Daily deposit limit", "每週儲值上限": "Weekly deposit limit", "每月儲值上限": "Monthly deposit limit",
    "本週已用": "Used this week", "本月已用": "Used this month",
    "冷靜期進行中，暫停儲值": "Cool-off in progress — deposits paused",
    // 註：「目前」「取消」既有鍵已在本檔他處定義（158／269 行），此處刻意不重複宣告（重複＝靜默覆蓋，見 DEBT U31）
    "未設定": "Not set", "輸入數值": "Enter a value", "套用": "Apply", "今日已用": "Used today",
    "請輸入有效數值": "Please enter a valid value", "限額已立即生效": "Limit applied immediately", "調升將於 24 小時後生效": "Increase takes effect in 24 hours",
    "移除限額": "Remove limit", "調升為": "Raise to", "剩餘": "Remaining",
    // 刻意不用既有鍵「進行中，剩餘」（他處為 Happy Hour 專用，EN 作 "Live — ends in"，語意不合冷靜期）
    "冷靜期": "Cool-off", "冷靜期剩餘": "Cool-off ends in", "24 小時": "24 hours", "7 天": "7 days", "30 天": "30 days",
    "冷靜期已啟動": "Cool-off started", "期間將暫停下注，時間到自動解除。": "Betting is paused until it ends automatically.",
    "冷靜期進行中，暫停下注": "Cool-off in progress — betting paused",
    "選一段時間暫停下注，時間到自動解除。啟動後無法提前解除。": "Pause betting for a set period; it lifts automatically. It cannot be ended early.",
    "現實檢查": "Reality check", "每隔一段時間提醒你已遊玩時長與今日淨損。": "Periodically reminds you of your play time and today's net loss.",
    "提醒間隔（分鐘）": "Reminder interval (minutes)", "已開啟": "On", "已關閉": "Off",
    "今日已遊玩": "Played today", "今日淨損": "Net loss today", "今日淨贏": "Net win today",
    "這些工具由你自己設定，用來控制遊玩節奏。調降或新設限額立即生效；調升或移除須等 24 小時，期間可隨時取消。": "You set these tools yourself to control your pace of play. Lowering or setting a limit takes effect immediately; raising or removing one takes 24 hours and can be cancelled at any time.",
    "自我約束工具 · 本瀏覽器 · 站別獨立": "Self-control tools · this browser · per-site",
    "幸運轉盤": "Lucky Spin", "🎡 每日幸運轉盤": "🎡 Daily Lucky Spin", "立即免費轉": "Spin for free", "今日已轉，明天再來": "Spun today — come back tomorrow", "轉動中…": "Spinning…", "今日已轉 ✓": "Spun today ✓", "獎品依 VIP 等級放大": "Prizes scale with VIP tier", "每日一次免費 · 中獎入獎金錢包 · Demo": "One free spin daily · winnings to bonus wallet · Demo",
    "每週抽獎": "Weekly Raffle", "🎟️ 每週抽獎": "🎟️ Weekly Raffle", "押注換券": "Wager for tickets",
    "本期彩池": "Prize pool", "我的抽獎券": "My tickets", "預估中獎機率": "Est. win chance",
    "尚無抽獎券": "No tickets yet", "本期參與人數": "Players", "得獎名額": "Winners", "獎級": "Prize tiers",
    "我的開獎紀錄": "My draw history", "未中獎": "No win", "尚無開獎紀錄。": "No draws yet.",
    "🎲 立即開獎（Demo 測試）": "🎲 Draw now (Demo)", "已開獎並開啟新一期": "Drawn — new round started",
    "押注換券 · 週期自動開獎 · 中獎入獎金錢包 · Demo": "Wager for tickets · auto weekly draw · winnings to bonus wallet · Demo",
    "兌換碼": "Redeem Code", "🎫 兌換碼": "🎫 Redeem Code", "輸入領獎金": "Enter to claim", "輸入兌換碼": "Enter redeem code",
    "輸入活動兌換碼領取獎金": "Enter a promo code to claim bonus", "兌換成功": "Redeemed", "已入獎金錢包": "added to bonus wallet",
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
    // #66 里程碑揭曉的五個註冊標題（reveal.js MILESTONES；modal 標題為單一文字節點，整句成 key 才翻得到）
    "👑 VIP 段位晉升": "👑 VIP Rank Up", "⭐ VIP 等級提升": "⭐ VIP Level Up", "🎯 每日任務達成": "🎯 Daily Mission Complete",
    "🎫 季票階梯獎勵": "🎫 Season Pass Reward", "🏅 成就徽章解鎖": "🏅 Achievement Unlocked",
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
    // #76 簽到揭曉層（「已入主餘額」既有覆蓋、語意相符，grep-first 後刻意不重列＝避免 dup 死鍵）
    "🎁 簽到揭曉": "🎁 Check-in Reveal",
    "今日獎勵以揭曉方式發放 · 平均值與階梯相同": "Today's reward is revealed · the average matches the ladder",
    "連越久單日獎越大 · 第 8/15/22/30 天有里程碑大禮": "Longer streaks pay more · milestone gifts on days 8/15/22/30",
    "今日已領，明天再來": "Claimed today — come back tomorrow", "今日已領取 ✓": "Claimed today ✓",
    "休閒模式 · 日獎進主餘額 · 里程碑進獎金錢包 · Demo": "Casual · daily to balance · milestones to bonus wallet · Demo",
    "連登里程碑": "Streak milestone", "連登": "Streak", "天里程碑": "-day milestone", "簽到成功": "Checked in",
    "每日簽到": "Daily Check-in", "今日可簽": "Check in today",
    // Happy Hour 限時加成（#35）
    "⚡ Happy Hour 限時加成": "⚡ Happy Hour Boost", "進行中，剩餘": "Live — ends in", "下一場倒數": "Next window in",
    "進行中": "Live now", "返水 ×2": "Rakeback ×2", "限時返水加成": "Timed rakeback boost", "返水×2 進行中": "Rakeback ×2 live",
    // #81 觸發型加成（領取即開窗）
    "領取加成窗口": "Claim boost window", "返水加成已開啟": "Rakeback boost activated",
    "每日三個固定時段，窗內所有押注的返水率 ×2（經 💧 返水日桶累積）。": "Three fixed windows daily — all wagers earn double rakeback (accrues to the 💧 daily bucket).",
    "前往 Rakeback 返水 →": "Go to Rakeback →", "排程型時間窗口 · 催時段回訪 · Demo": "Scheduled windows · time-of-day retention · Demo",
    "Happy Hour 開始": "Happy Hour started", "限時返水 ×2 進行中（一小時），把握時段！": "Double rakeback live for one hour — make it count!",
    "⚡ Happy Hour：返水 ×2 進行中": "⚡ Happy Hour: rakeback ×2 live",
    // #52 促銷 opt-in「我的優惠」+ 返水加成排程表（「加入」「限時返水加成」已於他區覆蓋，不重複列＝U31 去重紀律）
    "Happy Hour": "Happy Hour", "新手高返水窗口": "New player boost window", "加成": "Boost",
    "已加入": "Joined", "退出": "Leave", "今日已加入": "Joined today", "已加入的優惠": "Joined offers",
    // #49 row() 的名稱節點是「icon + 空格 + name」單一文字節點 ⇒ 需整句 key 才翻得到（比照 PREFIX 的 VIP 段位名做法）
    "💧 限時返水加成": "💧 Timed rakeback boost",
    "已退出此優惠": "Left this offer", "已加入優惠，開始生效": "Offer joined — now active",
    "我的優惠": "My offers", "目前沒有可加入的優惠。": "No offers to join right now.",
    "優惠需主動加入才會生效，並會在時限到期後自動結束。": "Offers only apply once you join, and end automatically when the timer runs out.",
    "加成生效中 · 剩": "Boost live · ends in", "加入即開啟返水加成": "Join to switch on a rakeback boost",
    "目前無返水加成生效。": "No rakeback boost is active.",
    "當前返水加成": "Current rakeback boost", "加成剩餘時間": "Boost time remaining",
    "多個加成同時符合時，只套用最高的一個（不相乘）。": "When several boosts qualify, only the highest applies (they do not multiply).",
    "其他符合但未套用的加成：": "Other qualifying boosts not applied:",
    "前往活動日曆加入優惠 →": "Open the promo calendar to join offers →",
    // #49 活動日曆 promo-cal.js 面板靜態標籤（U33 收官面板；grep-first 全站字典命中 0、跨檔零碰撞；短鍵刻意用「週日」等 2 字組合避開 日/一/週 單字全域碰撞；「進行中/已結束/加入/退出/已加入/今日已加入/我的優惠/加成」等已於 #52 覆蓋不重列）
    "📅 活動日曆": "📅 Event Calendar", "清單": "List", "時間軸": "Timeline",
    "常設開放": "Always on", "前往 →": "Go →", "無活動": "No events",
    "今天": "Today", "明天": "Tomorrow",
    "週日": "Sun", "週一": "Mon", "週二": "Tue", "週三": "Wed", "週四": "Thu", "週五": "Fri", "週六": "Sat",
    "抽獎": "Raffle", "競賽": "Race", "賽季": "Season", "保險": "Insurance", "每日": "Daily", "社群": "Community",
    "今日可轉": "Spin available today", "今日已轉 · 明日再來": "Spun today · back tomorrow",
    "在聊天室活躍即可分得": "Stay active in chat to share the drop",
    "目前沒有進行中或即將到來的活動。": "No live or upcoming events right now.",
    "一處看完全站活動：進行中、即將開始、常設開放。點「前往」直接進入該活動。": "See every event in one place — live, upcoming and always-on. Tap \"Go\" to jump straight in.",
    "排程註冊表 · 活動一處總覽 · Demo": "Schedule registry · all events in one view · Demo",
    // 紅利/流水引擎（#20）
    "🔒 待解鎖紅利": "🔒 Locked bonuses", "當前解鎖進度": "Unlocking now", "其餘排隊中": "Queued",
    "可領取獎金": "Claimable bonus", "到主餘額": "to balance",
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
    "載入中…": "Loading…", "尚無交易紀錄。": "No transactions yet.", "載入失敗，請稍後再試": "Failed to load. Please try again later.",
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
    "收合": "Collapse", "展開": "Expand", "收合面板": "Collapse panel", "展開面板": "Expand panel", "關閉面板": "Close panel",
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
    "下注": "Bet", "自動": "Auto", "手動": "Manual", "開始自動": "Start auto", "停止": "Stop", "旋轉": "Spin", "開牌": "Deal", "發牌": "Deal", "搖骰": "Roll", "發牌中…": "Dealing…", "搖骰中…": "Rolling…", "兌現": "Cash out",
    "清除": "Clear", "復原": "Undo", "重押": "Rebet", "籌碼": "Chips", "本局總注": "Total bet",
    "方向": "Direction", "目標倍數": "Target multiplier", "排數": "Rows", "風險": "Risk", "低": "Low", "中": "Med", "高": "High",
    // 幸運轉盤 Money Wheel（gameshow · U25 i18n 覆蓋；「旋轉」「ℹ 規則 / 賠率」已於上方遊戲共用區，「近況」通吃五桌遊 histBar 標籤）
    "🎡 幸運轉盤 Money Wheel": "🎡 Money Wheel", "幸運轉盤 Money Wheel": "Money Wheel", "幸運轉盤 Money Wheel · 規則 / 賠率": "Money Wheel · Rules / Payouts",
    "近況": "Recent", "轉盤旋轉中…": "Wheel spinning…",
    "在號碼上下注後按「旋轉」，指針停在哪個號碼即為開獎 🎡": "Bet on a number then press “Spin”; the number the pointer lands on is the result 🎡",
    "在 1 / 2 / 5 / 10 / 20 / 40 六個號碼上下注。轉盤停在哪個號碼、押中該號碼就贏，賠付＝號碼:1（例如押 10 中 10 → 賠 10 倍）。對標 Evolution Dream Catcher，54 段。": "Bet on any of the six numbers 1 / 2 / 5 / 10 / 20 / 40. The wheel stops on a number; back the winning number and it pays number-to-1 (e.g. back 10 and hit 10 → pays 10×). Modeled on Evolution Dream Catcher, 54 segments.",
    "號碼 10": "Number 10", "10:1；4 段。edge 3.42%（頭條最低莊家優勢、RTP 96.58%）": "10:1; 4 segments. Edge 3.42% (lowest house edge, RTP 96.58%)",
    "號碼 1 / 2": "Number 1 / 2", "1:1（23 段）/ 2:1（15 段）。edge 4.66% / 4.49%（最常見主注）": "1:1 (23 segments) / 2:1 (15 segments). Edge 4.66% / 4.49% (most common main bets)",
    "號碼 5 / 20 / 40": "Number 5 / 20 / 40", "5:1（7 段）/ 20:1（2 段）/ 40:1（1 段）。edge 8.76% / 7.26% / 9.19%（高賠側注）": "5:1 (7 segments) / 20:1 (2 segments) / 40:1 (1 segment). Edge 8.76% / 7.26% / 9.19% (high-pay side bets)",
    "乘數段 ×2 / ×7": "Multiplier ×2 / ×7", "轉到乘數：全部注保留、乘數累乘後再轉一次；最終停在號碼時以累積乘數放大彩金（可連乘）。": "Land on a multiplier: all bets stay, the multiplier compounds and the wheel spins again; when it finally stops on a number the payout is scaled by the accumulated multiplier (can stack).",
    "本桌採可驗證公平（HMAC-SHA256）· Demo：每次旋轉取一個浮點 f，段＝⌊f×54⌋，乘數重轉再取新浮點，可事後重算。點「近況」珠可開驗證面板。": "This table is provably fair (HMAC-SHA256) · Demo: each spin draws a float f, segment = ⌊f×54⌋; a multiplier re-spin draws a fresh float, all reproducible afterwards. Click a “Recent” bead to open the verification panel.",
    // 桌遊三款（U26 i18n 覆蓋：龍虎鬥／骰寶／安達巴哈；「近況」「ℹ 規則 / 賠率」「發牌」「搖骰」「發牌中…」「搖骰中…」「籌碼」「本局總注」皆共用區已覆蓋）
    // 龍虎鬥 Dragon Tiger（table）
    "🐉 龍虎鬥 Dragon Tiger": "🐉 Dragon Tiger", "龍虎鬥 Dragon Tiger": "Dragon Tiger", "龍虎鬥 · 規則 / 賠率": "Dragon Tiger · Rules / Payouts",
    "龍、虎各發一張牌，比點數大小（A 最小 → K 最大，花色不影響龍/虎勝負），大者該邊贏。採 8 副牌靴。": "Dragon and Tiger each draw one card and compare rank (A lowest → K highest; suit does not decide Dragon/Tiger); the higher side wins. Dealt from an 8-deck shoe.",
    "龍 DRAGON / 虎 TIGER": "Dragon / Tiger", "1:1（贏家退 2×）；和局時退回一半注": "1:1 (winner returns 2×); on a tie half the bet is returned",
    "和 TIE": "Tie", "8:1（退 9×）；龍虎點數相同即和": "8:1 (returns 9×); a tie when Dragon and Tiger share the same rank",
    "同花和 SUITED TIE": "Suited Tie", "50:1（退 51×）；和局且龍虎同花色": "50:1 (returns 51×); a tie where Dragon and Tiger share the same suit",
    "本桌採可驗證公平（HMAC-SHA256）發牌 · Demo：每局取兩個浮點 f，龍＝⌊f₁×416⌋、虎為剩餘 415 張均勻抽樣，可事後重算。點「近況」珠可開驗證面板。龍/虎主注 house edge 3.735%（RTP 96.27%）。": "This table deals provably fair (HMAC-SHA256) · Demo: each round draws two floats f; Dragon = ⌊f₁×416⌋ and Tiger is sampled uniformly from the remaining 415 cards, all reproducible afterwards. Click a “Recent” bead to open the verification panel. Dragon/Tiger main-bet house edge 3.735% (RTP 96.27%).",
    "下注後按「發牌」，龍 vs 虎比點數，大者贏 🐉🐯": "Place bets then press “Deal”; Dragon vs Tiger compare ranks, higher wins 🐉🐯",
    "龍 DRAGON": "Dragon", "虎 TIGER": "Tiger", "同花和 SUITED": "Suited Tie",
    // 骰寶 Sic Bo（table）
    "🎲 骰寶 Sic Bo": "🎲 Sic Bo", "骰寶 Sic Bo": "Sic Bo", "骰寶 Sic Bo · 規則 / 賠率": "Sic Bo · Rules / Payouts",
    "搖三顆骰子求和，於各注區下注。下列賠付與莊家優勢對標真實娛樂城標準（大/小為頭條主注 RTP 97.22%）。": "Roll three dice for a total and bet across the layout. The payouts and house edges below match real-casino standards (Big/Small are the headline main bets, RTP 97.22%).",
    "大 BIG / 小 SMALL": "Big / Small", "1:1；小=總點 4–10、大=11–17，逢任何圍骰(三同)皆輸。edge 2.78%": "1:1; Small = total 4–10, Big = 11–17; any triple loses. Edge 2.78%",
    "全圍 ANY TRIPLE": "Any Triple", "30:1；任意三顆同點。edge 13.89%": "30:1; any three dice the same. Edge 13.89%",
    "指定圍骰 TRIPLE": "Specific Triple", "180:1；指定某點三顆全同。edge 16.20%": "180:1; a chosen number on all three dice. Edge 16.20%",
    "單骰 SINGLE": "Single", "指定點出現 1/2/3 顆 → 賠 1/2/3 倍。edge 7.87%": "A chosen number appearing on 1/2/3 dice → pays 1/2/3×. Edge 7.87%",
    "對子 DOUBLE": "Double", "10:1；指定某點至少兩顆。edge 18.52%": "10:1; a chosen number on at least two dice. Edge 18.52%",
    "總點 TOTAL": "Total", "4/17→60:1、5/16→30:1、6/15→17:1、7/14→12:1、8/13→8:1、9-12→6:1": "4/17→60:1, 5/16→30:1, 6/15→17:1, 7/14→12:1, 8/13→8:1, 9-12→6:1",
    "本桌採可驗證公平（HMAC-SHA256）搖骰 · Demo：每局取三個浮點 f，每骰＝⌊f×6⌋+1，可事後重算。點「近況」珠可開驗證面板。": "This table rolls provably fair (HMAC-SHA256) · Demo: each round draws three floats f, each die = ⌊f×6⌋+1, all reproducible afterwards. Click a “Recent” bead to open the verification panel.",
    "下注後按「搖骰」，三骰求和決定各注區輸贏 🎲": "Place bets then press “Roll”; the three-dice total decides each bet 🎲",
    "大 / 小": "Big / Small", "圍骰": "Triples", "單骰（出現次數 → 1/2/3 倍）": "Single (occurrences → 1/2/3×)", "對子": "Doubles",
    "小 SMALL": "Small", "大 BIG": "Big", "全圍 ANY": "Any",
    // 安達巴哈 Andar Bahar（table）
    "🂡 安達巴哈 Andar Bahar": "🂡 Andar Bahar", "安達巴哈 Andar Bahar": "Andar Bahar", "安達巴哈 Andar Bahar · 規則 / 賠率": "Andar Bahar · Rules / Payouts",
    "翻開一張「莊牌」定出目標點數，接著交替往 Andar（先發側）/ Bahar 兩堆發牌，先出現與莊牌同點數者該側贏。花色不影響勝負。": "Turn over a “Joker” card to set the target rank, then deal alternately onto the Andar (first-deal) and Bahar piles; the first side to match the Joker’s rank wins. Suit does not matter.",
    "Andar （安達・先發）": "Andar (first deal)", "0.9:1（贏退 1.9×）；勝率略高 51.50%。house edge 2.15%（頭條主注）": "0.9:1 (win returns 1.9×); win rate slightly higher at 51.50%. House edge 2.15% (headline main bet)",
    "Bahar （巴哈・後發）": "Bahar (second deal)", "1:1（贏退 2.0×）；勝率 48.50%。house edge 3.00%": "1:1 (win returns 2.0×); win rate 48.50%. House edge 3.00%",
    "先發側 Andar 多一個發牌位、勝率略高，故 canonical 賠率略低為 0.9:1（非不公平，而是進場優勢的對價）。": "Andar deals first and gets one extra card position, so its win rate is slightly higher; its canonical odds are therefore a touch lower at 0.9:1 — the price of that edge, not unfairness.",
    "本桌採可驗證公平（HMAC-SHA256）發牌 · Demo：一局取多個浮點 f，先抽莊牌（⌊f×52⌋），再逐張均勻抽剩牌交替發，可事後重算。點「近況」珠可開驗證面板。": "This table deals provably fair (HMAC-SHA256) · Demo: a round draws several floats f — first the Joker (⌊f×52⌋), then the remaining cards sampled uniformly and dealt alternately, all reproducible afterwards. Click a “Recent” bead to open the verification panel.",
    "下注後按「發牌」，翻開莊牌後交替發牌至配對 🂡": "Place bets then press “Deal”; the Joker is turned over and cards are dealt alternately until a match 🂡",
    "安達・先發": "Andar · first", "巴哈・後發": "Bahar · second", "Andar 安達": "Andar", "Bahar 巴哈": "Bahar", "🎯 莊牌": "🎯 Joker",
    // SLOT 品類兩款（U27 i18n 覆蓋：Pirots 探險／Dead By Noon 正午對決；兩款 gameInfoBar fair 同串→wrap 後單一 key 共用；「旋轉」純字在共用區、含 emoji 者各自列）
    // Pirots 探險（slot · games 軌 07-24 首款；U26 結論誤列「已覆蓋」實則零覆蓋，本卡實補）
    "🦜 Pirots 探險": "🦜 Pirots", "Pirots 探險": "Pirots", "Apex Studio（對標 ELK）": "Apex Studio (à la ELK)",
    "旋轉 🦜": "Spin 🦜", "4% 莊家優勢": "4% house edge", "購買免費遊戲 103.7×": "Buy Free Spins 103.7×",
    "直接進免費遊戲（乘數持續暴走）": "Straight into free spins (the multiplier keeps snowballing)",
    "可驗證公平（一注一種子·可驗證）": "Provably fair (1 seed per spin)",
    "連通同色 ≥6 鳥即收集→cascade+漸進乘數→集滿擴張網格 6→8；⭐×3 進免費遊戲乘數暴走，最高 10000×。對標 ELK『Pirots 5』玩法": "Link ≥6 same-colour birds to collect → cascade + rising multiplier → fill the meter to expand the grid 6→8; ⭐×3 enters free spins where the multiplier snowballs, up to 10000×. Modeled on ELK’s “Pirots 5”.",
    // Dead By Noon 正午對決（slot · games 軌 07-26 第六款，U26 後落地）
    "🤠 Dead By Noon 正午對決": "🤠 Dead By Noon", "Dead By Noon 正午對決": "Dead By Noon", "Apex Studio（對標 Hacksaw）": "Apex Studio (à la Hacksaw)",
    "旋轉 🤠": "Spin 🤠", "5×4 · 14 線": "5×4 · 14 lines", "3.73% 莊家優勢": "3.73% house edge", "購買免費遊戲 43.4×": "Buy Free Spins 43.4×",
    "🥃 +免費次數！": "🥃 +Free spins!", "直接進生死決鬥免費遊戲": "Straight into Draw or Die free spins",
    "5×4 · 14 線；中獎觸發 Row Cascade（移除底列+下落補新）；彈膛 🎯 化 Wild 露 1–9 由左到右串接成乘數（2·5·1→×251）套用中獎；⭐3/4 進免費遊戲。對標 Hacksaw『Dead By Noon』": "5×4, 14 lines; a win triggers a Row Cascade (bottom row removed, everything drops, a fresh top row fills in); Chips 🎯 turn Wild and reveal 1–9, concatenating left-to-right into a multiplier (2·5·1 → ×251) applied to the win; ⭐3/4 enters free spins. Modeled on Hacksaw’s “Dead By Noon”.",
    // Golden Toad 金蟾聚寶（slot · games 軌 07-26 第七款＝SLOT 品類第三款保真 slot，U27 後落地；fair 串同上→wrap 後共用 U27「可驗證公平（一注一種子·可驗證）」key；動態結算行/pop 為 runtime concat 留尾巴）
    "🐸 金蟾聚寶 Golden Toad": "🐸 Golden Toad", "金蟾聚寶 Golden Toad": "Golden Toad",
    "旋轉 🐸": "Spin 🐸", "5×3 · 10 線": "5×3 · 10 lines", "3.7% 莊家優勢": "3.7% house edge",
    "購買 Hold & Win 86.4×": "Buy Hold & Win 86.4×", "直接觸發 Hold & Win（保證 6 金幣起手）": "Trigger Hold & Win directly (6 coins guaranteed to start)",
    "5×3 · 10 線；🪙金幣 ≥6 觸發 Hold & Win（約 1/98）：鎖定金幣、3 次重旋、落新幣重置次數；派彩=金幣值加總，滿盤再加 GRAND +200×。忠實復刻業界標準 Hold & Win 玩法": "5×3, 10 lines; ≥6 🪙 coins trigger Hold & Win (about 1/98): existing coins lock, 3 respins begin, and every fresh coin resets the respins; the payout is the sum of all coin values, and filling the whole grid adds a GRAND +200×. A faithful take on the industry-standard Hold & Win format.",
    // Gem Storm 寶石狂潮（slot · games 軌 07-27 第八款＝SLOT 品類第四款保真 slot，U28 後落地；fair 串同上→wrap 後共用 U27「可驗證公平（一注一種子·可驗證）」key；rtp 純數字免 key；動態結算行/label 為 runtime concat 留尾巴）
    "💎 寶石狂潮 Gem Storm": "💎 Gem Storm", "寶石狂潮 Gem Storm": "Gem Storm",
    "6×5 · 任位計數（8+ 同符即中）": "6×5 · pay-anywhere (8+ same symbol pays)", "旋轉 💎": "Spin 💎",
    "購買免費遊戲 82×": "Buy Free Spins 82×", "直接觸發免費遊戲（保證 4 ⭐ 起手）": "Trigger free spins directly (4 ⭐ guaranteed to start)", "3.5% 莊家優勢": "3.5% house edge",
    "💎 寶石狂潮 · 免費遊戲！": "💎 Gem Storm · Free Spins!",
    "6×5 任位計數：同一寶石在盤面任意位置 ≥8 個即中獎（8-9/10-11/12+ 三級賠付），無 payline。中獎符號消失、連鎖掉落（tumble）補新可連續中；⭐≥4 觸發免費遊戲（約 1/240），免費中 💣乘數炸彈值加總乘上該轉贏分。忠實復刻業界標準 pay-anywhere/tumble 玩法": "6×5 pay-anywhere: any single gem pays when ≥8 of them land anywhere on the grid (8-9/10-11/12+ pay tiers), no paylines. Winning symbols vanish and new ones tumble in for back-to-back wins; ⭐≥4 triggers free spins (about 1/240), where 💣 multiplier bombs are summed and multiply that spin's win. A faithful take on the industry-standard pay-anywhere/tumble format.",
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
    "虛擬主播": "Virtual host", "跟注 ▶": "Follow ▶", "已跟注 ✓ 取消": "Followed ✓ Cancel",
    // U19：留存/金流面板 i18n 覆蓋補完（VIP/Rakeback 詳情、多倍數挑戰、每日任務、通知中心、聊天室紅包雨）
    "已達最高等級 💎": "Max tier reached 💎",
    "💧 返水率（本級）": "💧 Rakeback rate (this tier)", "可領取返水": "Claimable rakeback",
    "目前返還比例（占莊家優勢）": "Current share of house edge", "尚無可領取返水": "No rakeback to claim",
    "各等級返還比例（占該注莊家優勢）": "Share of the bet's house edge returned, by tier",
    "以莊家優勢計價 · 每日桶逾期作廢 · Demo": "Priced on house edge · daily bucket expires · Demo",
    "返水以「這一注理論上莊家賺多少」計價：莊家優勢越高的遊戲，同樣的押注額返得越多；等級越高，返還的比例越高。返水進「每日桶」，當日未領跨日即作廢，記得每天回來領。": "Rakeback is priced on what the house theoretically earns from each bet: the higher a game's house edge, the more the same stake pays back, and higher tiers return a larger share. Rakeback goes to a daily bucket — claim it the same day or it expires. Come back daily.",
    "同樣押注 NT$1,000，不同遊戲的返水（依該遊戲莊家優勢）": "Rakeback on the same NT$1,000 stake, by each game's house edge",
    "骰寶 Dice（1.00% 莊優）": "Dice (1.00% house edge)", "Pirots（3.855% 莊優）": "Pirots (3.855% house edge)",
    "🎯 多倍數挑戰": "🎯 Multiplier Challenges", "多倍數挑戰": "Multiplier Challenges", "獎金錢包": "Bonus wallet", "挑戰獎勵": "Challenge reward",
    "在任一遊戲的「單局」達成目標倍數即解鎖獎金（倍數＝該局贏分÷押注）。": "Hit the target multiplier in a single round of any game to unlock the bonus (multiplier = round win ÷ bet).",
    "每日 0 點重置 · 獎勵入獎金錢包 · Demo": "Resets daily at 0:00 · rewards to bonus wallet · Demo",
    "🎯 單局命中 2× 倍數 5 次": "🎯 Hit 2× in a round 5 times", "🚀 單局命中 10× 倍數": "🚀 Hit 10× in a round", "💥 單局命中 50× 倍數": "💥 Hit 50× in a round",
    "去簽到": "Check in", "任務獎勵": "Task reward",
    "今日下注 10 次": "Bet 10 times today", "今日贏 5 次": "Win 5 times today", "今日累積押注 NT$2,000": "Wager NT$2,000 today",
    "歡迎來到 Apex Win": "Welcome to Apex Win", "完成每日簽到、衝 VIP 等級、挑戰三級累積彩金！": "Claim your daily check-in, climb VIP tiers, and chase the three-tier jackpot!",
    "每日簽到已開啟": "Daily check-in is open", "連續登入領遊戲幣，記得別斷簽。": "Log in daily for coins — keep your streak alive.",
    "VIP 與返水上線": "VIP & Rakeback are live", "押注即累積有效投注，等級越高返水越多。": "Wagers build your lifetime total; higher tiers earn more rakeback.",
    "通知來自你的遊戲事件（VIP 升級、彩金中獎…）· Demo": "Notifications come from your game events (VIP promotions, jackpot wins…) · Demo",
    "聊天室紅包雨": "Chat rain", "紅包雨開始，45 秒內在聊天室領取雨露！": "Rain has started — claim it in chat within 45 seconds!", "紅包雨": "Rain",
    // ===== 成本加權 XP HL.edge（#50，2026-07-31 平台軌）=====
    // ⚠️「遊戲」一鍵已在下方 betlog 區存在，此處刻意不重複（07-31 維護軌 U31 才剛清掉 8 個靜默覆蓋重複鍵）
    "XP 成本加權": "Cost-weighted XP", "莊家優勢": "House edge", "經驗倍率": "XP multiplier",
    "⚖️ XP 成本加權（各遊戲倍率）→": "⚖️ Cost-weighted XP (per-game multipliers) →",
    "VIP 與賽季經驗依各遊戲的理論莊家成本加權：對莊家成本較高的遊戲，每一注累積較多經驗。實際下注金額、返水、彩金與帳目一律不受影響。": "VIP and season XP are weighted by each game's theoretical cost to the house: games that cost the house more earn more XP per bet. Your actual stake, rakeback, jackpot contributions and ledger records are never affected.",
    "真站中性模式：全站平均倍率為 1.00×，只重新分配經驗、不額外加發。": "Live-site neutral mode: the site-wide average multiplier is 1.00×, so XP is redistributed rather than inflated.",
    "假站寬鬆模式：最低倍率為 1.00×，沒有任何遊戲比改版前更慢。": "Demo-site generous mode: the floor is 1.00×, so no game earns XP more slowly than before.",
    "未列出的遊戲一律為 1.00×，不受加權影響。": "Games not listed stay at 1.00× and are unaffected by weighting.",
    // ===== 進度來源註冊表 HL.progressSrc（#65，2026-08-06 平台軌）=====
    // ⚠️ grep-first：「經驗倍率」(上方 edge 區)／「儲值」(錢包區)／「每日簽到」(獎勵區) 三鍵既有且語意相符，刻意不重列
    "進度來源": "Progress sources", "遊戲押注": "Game wagers", "累積經驗": "Total XP", "累積 VIP 經驗": "Total VIP XP",
    "每日上限": "Daily cap", "已用": "used", "不設上限": "No cap", "真站關閉": "Off on live",
    "📊 進度來源（押注以外的累積）→": "📊 Progress sources (beyond wagering) →",
    "押注/儲值/簽到皆累積 · 子級+大階雙層獎金 · Demo": "Wagers, deposits & check-ins all count · level + tier dual bonuses · Demo",
    "除了遊戲押注，儲值與每日簽到也會累積 VIP 經驗與賽季經驗。這些來源只累積進度，不影響任何金額、返水、彩金或帳目。": "Besides game wagers, deposits and daily check-ins also build VIP and season XP. These sources add progress only — they never affect any balance, rakeback, jackpot or ledger record.",
    "真站僅計入遊戲押注：非投注來源一律關閉，避免同一筆錢被重複計為進度。": "On the live site only game wagers count: non-wagering sources are switched off so the same money is never counted twice as progress.",
    "假站已開啟全部來源，各來源設有每日上限。": "All sources are enabled on the demo site, each with a daily cap.",
    "未列出的行為不累積進度。": "Actions not listed do not build progress.",
    // #75 加速層（grep-first：「加成」既有作 Boost、術語沿用 rakeboost 同族的 boost/qualify 用字）
    "季票進階軌加速": "Season Pass premium boost", "限時經驗加速": "Limited-time XP boost",
    "加入即開啟經驗加速": "Join to switch on an XP boost", "當前經驗加速": "Current XP boost",
    "加速剩餘時間": "Boost time remaining", "真站不套用經驗加速。": "XP boosts do not apply on the live site.",
    "目前無經驗加速生效。": "No XP boost is active.", "其他符合但未套用的加速：": "Other qualifying boosts not applied:",
    "多個加速同時符合時只套用最高的一個（不相乘），且加速不會提高每日上限。": "When several boosts qualify, only the highest applies (they do not multiply), and boosts never raise the daily cap.",
    // ===== 遊戲上架排程 × 受眾分層 HL.release（#54，2026-08-05 平台軌）=====
    "⚡ 搶先體驗": "⚡ Early Access", "🔒 搶先體驗中": "🔒 Early Access Only", "🗓️ 即將上架": "🗓️ Coming Soon",
    "全體玩家": "All players", "VIP 段位": "VIP level", "季票階級": "Season tier", "公會成員": "Guild members", "限定受眾": "Restricted audience",
    "開放階段": "Release stage", "搶先體驗期": "Early access period", "尚未開放": "Not yet open", "目前可玩": "Who can play now",
    "搶先體驗開始倒數": "Early access starts in", "全站開放倒數": "Opens to everyone in",
    "這款遊戲採分批上架：先開放給指定族群搶先體驗，時間到才全站開放。": "This game rolls out in stages: a selected audience gets early access first, and it opens to everyone once the schedule reaches its launch time.",
    "查看活動日曆": "View event calendar", "上架排程 · 資料驅動": "Release schedule · data-driven",
    "新上架": "New release", "你已可搶先體驗": "You already have early access",
    "搶先體驗中 · 你尚未符合資格": "Early access under way · you are not eligible yet",
    "尚未開放 · 即將排定上架": "Not open yet · launch is scheduled",
    "已全站開放": "Open to everyone", "這款遊戲尚未上線": "This game is not live yet",

    // ===== 注單／投注歷史 HL.betlog（#51，2026-07-31 平台軌）=====
    "📜 注單／投注歷史": "📜 Bet History", "📜 我的注單": "📜 My Bets", "注單中心尚未就緒": "Bet history is not ready yet",
    "編號": "ID", "時間": "Time", "遊戲": "Game", "押注": "Bet", "贏分": "Win", "淨額": "Net",
    "驗算": "Verify", "驗算 →": "Verify →", "遊戲篩選": "Filter by game", "全部遊戲": "All games",
    "只看贏": "Wins only", "只看輸": "Losses only", "已記錄注單": "Bets recorded",
    "⬇ 匯出 CSV": "⬇ Export CSV", "已匯出 CSV": "CSV exported", "匯出失敗（瀏覽器不支援）": "Export failed (browser unsupported)",
    "清空紀錄": "Clear history",
    "尚無注單紀錄。玩一局就會出現在這裡。": "No bets yet. Play a round and it will show up here.",
    "確定清空本機注單紀錄？此動作不影響餘額與戰績。": "Clear local bet history? This does not affect your balance or stats.",
    "僅顯示最新 200 筆；CSV 匯出為全部篩選結果。": "Showing the latest 200 rows; CSV exports every filtered row.",
    "nonce 為結算當下的「下一注」序號（該局最後取數的上界）；驗算會帶入前一個 nonce。僅採用可驗證公平的遊戲提供驗算入口。": "The nonce is the next-bet counter at settlement (an exclusive upper bound for this round); Verify opens with the preceding nonce. Only provably fair games expose a verify entry.",
    "純前端：紀錄存於本機、依真假站分開；部分遊戲把押注與贏分拆兩次回報，故可能落成兩列。": "Front-end only: history is stored locally and kept separate per site mode. Some games report bet and win in two calls, so one round may appear as two rows.",

    // ===== 營運帳本 · 站內移轉 HL.ledger（#56，2026-07-31 平台軌）=====
    // 註：「儲值／提款／轉贈」原本是「標籤＋動態時間」串接成單一文字節點＝永遠翻不到（P3 那條雷），
    //     本輪 txnRow 改為標籤獨立文字節點後才首次可譯。
    "儲值": "Deposit", "提款": "Withdraw", "轉贈": "Transfer", "站內轉贈": "P2P transfers",
    "玩家間移轉（不計入淨現金流）": "Player-to-player transfer (excluded from net cash flow)",
    "Demo 無收款方入帳": "No recipient is credited in Demo",
    "儲值 − 提款（不含站內轉贈）": "Deposits − withdrawals (excludes P2P transfers)",
    "ℹ️ Demo 模式沒有真實收款方，轉出的遊戲幣不會實際入帳給對方；此筆記為「站內移轉」，不計入營運淨現金流。": "ℹ️ Demo mode has no real recipient — transferred coins are never credited to anyone. This is booked as an internal transfer and excluded from operator net cash flow.",

    // ===== 公會 · 團隊戰 HL.guild（#47，2026-08-06 維護軌·U33 i18n 覆蓋）=====
    // 註：QUEST 里程碑標題（先鋒/主力/精銳/傳奇）恆與「　+獎金」串接＝非整文字節點、walker 翻不到（P3 陷阱）故不列；
    //   「加入/領取/✓ 已領/我的貢獻」已於既有字典覆蓋（grep 證語意相符：Join/Claim/✓ Claimed/My contribution）故不重列，避免 dup 死鍵。
    "加入一個公會，你的每筆有效押注都會計入團隊週榜。與其他公會競爭名次，週末依名次發放團隊獎金，並沿途解鎖個人貢獻任務。": "Join a guild and every valid bet counts toward your team's weekly leaderboard. Compete with other guilds for rank, earn team rewards by final placement at week's end, and unlock personal contribution quests along the way.",
    "團隊獎金已入獎金錢包": "Team reward credited to bonus wallet",
    "公會貢獻任務達標": "Guild contribution quest reached",
    "團隊週榜 · team-vs-team": "Weekly Team Leaderboard · team-vs-team",
    "真站模式：不顯示模擬對手隊伍，僅計你所屬公會的真實貢獻。": "Live mode: simulated rival guilds are hidden; only your guild's real contribution counts.",
    "本週貢獻榜（隊內）": "This Week's Contributors (in-guild)",
    "換公會 / 瀏覽全部": "Switch Guild / Browse All",
    "退出公會": "Leave Guild", "已退出公會": "Left the guild",
    "下注即累積公會貢獻 · 週末結算團隊獎金 · 純前端骨架（社交層待後端）· Demo": "Bets accrue guild contribution · team rewards settle weekly · front-end skeleton (social layer pending backend) · Demo",
    "⚔️ 公會 · 團隊戰": "⚔️ Guilds · Team Battle",
    // 公會名 + 隊訓（專名；EN 提供風味翻譯；渲染於卡片/週榜對手列/頭部皆為整文字節點）
    "暗影狼群": "Shadow Wolves", "黃金龍族": "Golden Dragons", "霓虹辛迪加": "Neon Syndicate",
    "幸運草會": "Lucky Clover", "赤紅騎士團": "Crimson Order", "虛空行者": "Void Runners",
    "月下同行，永不獨獵": "Together under the moon, never hunt alone",
    "逐金而生，一擲千金": "Born to chase gold, bet it all",
    "不夜之城，勝率永燃": "City that never sleeps, odds ever ablaze",
    "四葉在手，好運長留": "Four leaves in hand, fortune stays",
    "以榮譽下注，以團隊致勝": "Bet with honor, win as a team",
    "衝破極限，倍數無界": "Break every limit, multipliers unbound",
    // ===== 限時損失保險 · 新手安全網 HL.safetynet（#48，2026-08-07 維護軌·U33 i18n 覆蓋）=====
    // 僅列 whole-text-node 純 key；icon 前綴標題（🛡️ 新手安全網／🛡️ …·限時損失保險）與「保障中·剩餘 N 天／註冊後前 N 天／退還封頂 X（已達封頂）」等 dynamic-adjacent 串接依 P3 陷阱刻意不列（DOM walker 翻不到整節點）；「天」亦僅出現於串接情境故不列
    "保障已結束": "Coverage ended",
    "保障窗口": "Coverage window",
    "淨損退還率": "Net-loss refund rate",
    "窗口內累計淨損": "Cumulative net loss in window",
    "已自動退還": "Auto-refunded",
    "目前累積待退": "Currently pending refund",
    "退還封頂": "Refund cap",
    "去獎金錢包領取 →": "Claim in Bonus wallet →",
    "保障窗口已結束，淨損退還已全數結清。": "The coverage window has ended; all net-loss refunds are settled.",
    "僅在你「淨輸」時退還（贏局自動抵銷）。每日自動把窗口內累計淨損 × 退還率退回獎金錢包，零流水；逾窗自動結清退場。": "Refunded only when you're net-down (wins offset losses). Each day it auto-returns your cumulative net loss × refund rate to your Bonus wallet, zero wagering; auto-settles and exits when the window ends.",
    "前 N 日淨損自動退還 · 零流水 · Demo": "First N days' net loss auto-refunded · zero wagering · Demo"
  };

  // 「標籤＋動態值」串接成單一文字節點時，用前綴/後綴比對（精確比對失敗才走這裡）
  var PREFIX = {
    // U19：VIP 段位名「icon+空格+name」單節點——PREFIX 覆蓋標準渲染（VIP 矩陣/目前等級/rakeback 段位列/reload/header 迷你等級/「（目前）」尾標）；
    //   中段內嵌如「50%（🥇 黃金）」屬動態值串接，片語字典無法切分，為已知尾巴。
    en: { "🥉 青銅": "🥉 Bronze", "🥈 白銀": "🥈 Silver", "🥇 黃金": "🥇 Gold", "💠 白金": "💠 Platinum", "💎 鑽石": "💎 Diamond", "房主 ": "Host ", "挑戰次數 ": "Challenges ", "加入 ": "Join ", "押 ": "Bet ", "你 ": "You ", "投 ": "Wager ", "搜尋 ": "Search ", "正在玩：": "Playing: ", "本局遊戲：": "Game: ", "直播主本局選擇：": "Host pick: ", "世界活動 · ": "World Event · ", "完成度 ": "Completion ", "✓ 已解鎖": "✓ Unlocked" },
    "zh-Hans": { "🥉 青銅": "🥉 青铜", "🥈 白銀": "🥈 白银", "🥇 黃金": "🥇 黄金", "💎 鑽石": "💎 钻石", "挑戰次數 ": "挑战次数 ", "賭注 ": "赌注 ", "搜尋 ": "搜索 ", "直播主本局選擇：": "主播本局选择：", "世界活動 · ": "世界活动 · ", "✓ 已解鎖": "✓ 已解锁" }
  };
  var SUFFIX = {
    // U19：通知時間戳 ago() 產「N 分鐘前」「N 天前」（notify.js）——原 SUFFIX 僅「分前/小時前/秒前」漏此二式
    en: { " 秒前": "s ago", " 分鐘前": "m ago", " 分前": "m ago", " 小時前": "h ago", " 天前": "d ago", " 挑戰者": " Challenger", " 玩家": " players", " 輪": " rounds", " 秒": "s", " 金磚": " bricks", " 點": " pts" },
    "zh-Hans": { " 分鐘前": " 分钟前", " 小時前": " 小时前", " 挑戰者": " 挑战者", " 金磚": " 金砖", " 點": " 分" }
  };

  var HANS = {
    // #55 成長進度可停靠面板（只列與繁體不同的字；「成長/公會/階級」等簡繁異體字仍需列）
    "成長": "成长", "成長進度": "成长进度", "季票 · 成就 · 公會": "季票 · 成就 · 公会",
    "季票進度": "季票进度", "進階軌": "进阶轨", "免費軌": "免费轨", "已結束": "已结束",
    "階級": "阶级", "距下一階（經驗）": "距下一阶（经验）", "已滿階": "已满阶",
    "可領獎勵": "可领奖励", "剩餘天數": "剩余天数", "賽季狀態": "赛季状态",
    "前往領取": "前往领取", "開啟季票": "开启季票",
    "成就進度": "成就进度", "徽章解鎖": "徽章解锁", "成就點數": "成就点数",
    "開啟徽章牆": "开启徽章墙", "公會": "公会", "尚未加入公會": "尚未加入公会",
    "招募中公會": "招募中公会", "瀏覽公會": "浏览公会", "公會週貢獻": "公会周贡献",
    "本週排名": "本周排名", "我的貢獻": "我的贡献", "可領任務": "可领任务",
    "領取公會任務": "领取公会任务", "開啟公會": "开启公会", "成長模組尚未載入。": "成长模块尚未载入。",
    "進度隨每筆有效押注即時累積（走中央結算點）。": "进度随每笔有效押注即时累积（走中央结算点）。",
    "成長進度（季票·成就·公會）": "成长进度（季票·成就·公会）",
    // #45 成就徽章牆 open() 面板內容（船長 P3；本輪維護軌補）——僅列與繁體不同者
    //   簡繁同形不列：下注里程碑/探索/千局老手/月度全勤/完成第一次下注
    "勝利": "胜利", "大獎 · 高倍": "大奖 · 高倍", "忠誠": "忠诚",
    "初試身手": "初试身手", "百戰之路": "百战之路", "小試流水": "小试流水", "流水達人": "流水达人",
    "百萬流水": "百万流水", "常勝之始": "常胜之始", "勝場常客": "胜场常客", "初嘗大獎": "初尝大奖",
    "一擲萬金": "一掷万金", "十倍時刻": "十倍时刻", "百倍傳說": "百倍传说", "千倍神話": "千倍神话",
    "廣泛涉獵": "广泛涉猎", "遍歷賭城": "遍历赌城", "黃金會員": "黄金会员", "鑽石之巔": "钻石之巅", "一週不斷": "一周不断",
    "累積下注 100 次": "累积下注 100 次", "累積下注 1,000 次": "累积下注 1,000 次",
    "累積有效押注 NT$10,000": "累积有效押注 NT$10,000", "累積有效押注 NT$100,000": "累积有效押注 NT$100,000", "累積有效押注 NT$1,000,000": "累积有效押注 NT$1,000,000",
    "累積贏 50 局": "累积赢 50 局", "累積贏 500 局": "累积赢 500 局",
    "單筆贏分達 NT$5,000": "单笔赢分达 NT$5,000", "單筆贏分達 NT$50,000": "单笔赢分达 NT$50,000",
    "單局命中 10× 以上": "单局命中 10× 以上", "單局命中 100× 以上": "单局命中 100× 以上", "單局命中 1,000× 以上": "单局命中 1,000× 以上",
    "玩過 5 款不同遊戲": "玩过 5 款不同游戏", "玩過 12 款不同遊戲": "玩过 12 款不同游戏",
    "VIP 等級達到黃金": "VIP 等级达到黄金", "VIP 等級達到鑽石": "VIP 等级达到钻石",
    "連續簽到 7 天": "连续签到 7 天", "連續簽到 30 天": "连续签到 30 天",
    "已解鎖徽章": "已解锁徽章", "🏅 成就徽章牆": "🏅 成就徽章墙",
    "下注即累積終身進度 · 解鎖即發獎金與成就點數 · Demo": "下注即累积终身进度 · 解锁即发奖金与成就点数 · Demo",
    // #46 季票 Season Pass open() 面板（本輪維護軌補）——僅列與繁體不同者；「🎟️ 季票 · Season Pass」簡繁同形不列
    "💎 進階軌已解鎖！已達階級的進階獎勵現可回溯領取": "💎 进阶轨已解锁！已达阶级的进阶奖励现可回溯领取",
    "季票進階軌已解鎖": "季票进阶轨已解锁", "✓ 已領": "✓ 已领",
    "🔒 需進階": "🔒 需进阶", "🔒 未達": "🔒 未达",
    "本賽季已結束 · 仍可領取已達階級": "本赛季已结束 · 仍可领取已达阶级",
    "已達頂階 🏁": "已达顶阶 🏁", "賽季經驗已滿": "赛季经验已满",
    "💎 進階軌已解鎖 · 進階獎勵全數開放": "💎 进阶轨已解锁 · 进阶奖励全数开放",
    "🔓 解鎖進階軌": "🔓 解锁进阶轨", "解鎖": "解锁",
    "暫無可領取": "暂无可领取", "目前沒有可領取的階級獎勵": "目前没有可领取的阶级奖励",
    "💎 進階軌": "💎 进阶轨",
    "下注累積賽季經驗 · 免費軌人人可領 · 進階軌以成就點數解鎖 · Demo": "下注累积赛季经验 · 免费轨人人可领 · 进阶轨以成就点数解锁 · Demo",
    // 遊戲卡即時人數（S9，「在玩」簡繁同形不列）
    "線上遊玩人數（模擬）": "在线游玩人数（模拟）",
    // 側欄收合（S14，收合簡繁同形不列）
    "收合側欄": "收合侧栏", "展開側欄": "展开侧栏",
    // Pump 打氣（新遊戲，下一步/爆裂率/一刺一注 簡繁同形不列）
    "🎈 Pump 打氣": "🎈 Pump 打气", "Pump 打氣": "Pump 打气", "打氣 +": "打气 +", "2% 莊家優勢": "2% 庄家优势",
    "逐次打氣累乘，爆裂率逐次上升，隨時兌現": "逐次打气累乘，爆裂率逐次上升，随时兑现",
    "選難度、按「開始」，逐次打氣衝倍數，隨時兌現 🎈": "选难度、按「开始」，逐次打气冲倍数，随时兑现 🎈",
    // Cases 開箱（新遊戲，轉→转、說→说、莊優勢 異體）
    "🎁 Cases 開箱": "🎁 Cases 开箱", "Cases 開箱": "Cases 开箱", "開箱 🎁": "开箱 🎁", "說明": "说明",
    "可驗證公平（一注一轉）": "可验证公平（一注一转）", "≈1.5% 莊家優勢": "≈1.5% 庄家优势",
    "滾輪停在指針下的倍數即為本局賠付；難度只改分布、RTP 不變": "滚轮停在指针下的倍数即为本局赔付；难度只改分布、RTP 不变",
    // 福利中心 hub（简体差異字）
    "全部獎勵領取": "全部奖励领取", "每日領取": "每日领取", "獎金回饋": "奖金回馈", "成長 · 商城": "成长 · 商城", "信任 · 資訊": "信任 · 资讯",
    // U22 玩法頁動態組字（簡繁差異者；下一次/最高/第 N 格 簡繁同形不列）
    "第 {n} 次打氣成功，可繼續或兌現": "第 {n} 次打气成功，可继续或兑现",
    "💥 爆了！這局結束（第 {n} 次打氣）": "💥 爆了！这局结束（第 {n} 次打气）",
    "兌現 {m}×　贏 +{amt}": "兑现 {m}×　赢 +{amt}",
    "第 {p} 期　|　預計開獎 {d}": "第 {p} 期　|　预计开奖 {d}",
    // VIP 福利矩陣（S11，返水簡繁同形不列）
    "等級": "等级", "累積押注": "累计押注", "升級獎金": "升级奖金", "下一級": "下一级",
    "各級福利一覽（返水率隨等級放大、升級發獎金）": "各级福利一览（返水率随等级放大、升级发奖金）",
    "全球獎": "全球奖", "競技場": "竞技场", "娛樂城": "娱乐城", "錢包": "钱包", "錢包設定": "钱包设置",
    "語言": "语言", "獎勵中心": "奖励中心", "負責任博弈": "负责任博弈", "可驗證公平": "可验证公平", "VIP 俱樂部": "VIP 俱乐部", "夥伴": "伙伴", "聊天室": "聊天室",
    "每日任務": "每日任务", "如何驗證": "如何验证", "返回娛樂城": "返回娱乐城", "你的專屬夥伴": "你的专属伙伴", "Demo 測試工具": "Demo 测试工具",
    // VIP 服務水準軸 #63（只列與繁體不同者）
    "🚚 服務水準": "🚚 服务水准",
    "🚚 服務水準（提領時效／額度）→": "🚚 服务水准（提取时效／额度）→",
    "🚚 服務水準（依 VIP 段位）→": "🚚 服务水准（依 VIP 段位）→",
    "提領處理時效": "提取处理时效", "客服層級": "客服层级",
    "每日提領上限": "每日提取上限", "每週提領上限": "每周提取上限", "每月提領上限": "每月提取上限",
    "標準客服": "标准客服", "優先客服": "优先客服", "專屬客戶經理": "专属客户经理",
    "小時內": "小时内", "小時": "小时",
    "預計到帳時間": "预计到账时间", "各段位服務水準一覽": "各段位服务水准一览",
    // #74（兩鍵皆因「紅→红」而有簡繁差異 ⇒ 皆須列；逐字複核過、非等值死鍵）
    "紅利流水倍數": "红利流水倍数", "紅利流水": "红利流水",
    "紅利流水倍數同屬服務水準：段位越高，同一筆獎金越早解鎖——金額完全不變，只是拿到得更快。":
      "红利流水倍数同属服务水准：段位越高，同一笔奖金越早解锁——金额完全不变，只是拿到得更快。",
    "本期剩餘額度": "本期剩余额度", "本日剩餘額度": "本日剩余额度",
    "本週剩餘額度": "本周剩余额度", "本月剩餘額度": "本月剩余额度",
    "VIP 不只決定拿多少獎金，也決定「拿錢這件事」的服務水準：提領處理時效、各週期額度上限與客服層級皆隨段位提升。":
      "VIP 不只决定拿多少奖金，也决定「拿钱这件事」的服务水准：提取处理时效、各周期额度上限与客服层级皆随段位提升。",
    "每日提領上限刻意全段位一致——分階的是處理速度與長週期額度，不把新手鎖在極低的日限。":
      "每日提取上限刻意全段位一致——分阶的是处理速度与长周期额度，不把新手锁在极低的日限。",
    "真站保守模式：額度較緊、時效較長。": "真站保守模式：额度较紧、时效较长。",
    "假站寬鬆模式：額度較寬、時效較短。": "假站宽松模式：额度较宽、时效较短。",
    "提領時效為預估值 · 額度依段位 · Demo": "提取时效为预估值 · 额度依段位 · Demo",
    // 負責任博弈 #67（只列與繁體不同者）
    "🛡️ 負責任博弈": "🛡️ 负责任博弈", "設定限額與冷靜期": "设置限额与冷静期",
    "限額已啟用": "限额已启用", "冷靜期進行中": "冷静期进行中", "自我約束工具": "自我约束工具",
    "每日淨損上限": "每日净损上限", "每日投注額上限": "每日投注额上限", "單注上限": "单注上限", "每日遊玩時間上限": "每日游玩时间上限",
    // #70 儲值側限額閘
    "下注限額": "下注限额", "儲值限額": "储值限额",
    "每日儲值上限": "每日储值上限", "每週儲值上限": "每周储值上限", "每月儲值上限": "每月储值上限",
    "本週已用": "本周已用",
    // 註：「本月已用」「今日已用」四字簡繁完全相同 ⇒ **刻意不宣告**（HANS 字典只列與繁體不同者；宣告等值鍵＝無作用的死鍵，DEBT U31 同型）。
    //   「今日已用」原有一筆等值死鍵已於 2026-08-06 維護軌 #46 i18n 覆蓋輪順手清除（平台軌 08-05 交辦的 i18n 維度既存項；移除零行為＝walker 對 key==value 本就無動作）。EN 側 "今日已用": "Used today" 為真譯保留。
    "冷靜期進行中，暫停儲值": "冷静期进行中，暂停储值",
    "未設定": "未设置", "輸入數值": "输入数值", "套用": "应用",
    "請輸入有效數值": "请输入有效数值", "限額已立即生效": "限额已立即生效", "調升將於 24 小時後生效": "调升将于 24 小时后生效",
    "移除限額": "移除限额", "調升為": "调升为", "剩餘": "剩余",
    "冷靜期": "冷静期", "冷靜期剩餘": "冷静期剩余",
    "冷靜期已啟動": "冷静期已启动", "期間將暫停下注，時間到自動解除。": "期间将暂停下注，时间到自动解除。",
    "冷靜期進行中，暫停下注": "冷静期进行中，暂停下注",
    "選一段時間暫停下注，時間到自動解除。啟動後無法提前解除。": "选一段时间暂停下注，时间到自动解除。启动后无法提前解除。",
    "現實檢查": "现实检查", "每隔一段時間提醒你已遊玩時長與今日淨損。": "每隔一段时间提醒你已游玩时长与今日净损。",
    "提醒間隔（分鐘）": "提醒间隔（分钟）", "已開啟": "已开启", "已關閉": "已关闭",
    "今日已遊玩": "今日已游玩", "今日淨損": "今日净损", "今日淨贏": "今日净赢",
    "這些工具由你自己設定，用來控制遊玩節奏。調降或新設限額立即生效；調升或移除須等 24 小時，期間可隨時取消。": "这些工具由你自己设置，用来控制游玩节奏。调降或新设限额立即生效；调升或移除须等 24 小时，期间可随时取消。",
    "自我約束工具 · 本瀏覽器 · 站別獨立": "自我约束工具 · 本浏览器 · 站别独立",
    "幸運轉盤": "幸运转盘", "🎡 每日幸運轉盤": "🎡 每日幸运转盘", "立即免費轉": "立即免费转", "今日已轉，明天再來": "今日已转，明天再来", "轉動中…": "转动中…", "今日已轉 ✓": "今日已转 ✓", "獎品依 VIP 等級放大": "奖品依 VIP 等级放大", "每日一次免費 · 中獎入獎金錢包 · Demo": "每日一次免费 · 中奖入奖金钱包 · Demo",
    "每週抽獎": "每周抽奖", "🎟️ 每週抽獎": "🎟️ 每周抽奖", "押注換券": "押注换券",
    "本期彩池": "本期彩池", "我的抽獎券": "我的抽奖券", "預估中獎機率": "预估中奖机率",
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
    // #66 里程碑揭曉標題（五條簡繁皆有差異：晉升/等級/任務達成/階梯獎勵/解鎖，非等值死鍵）
    "👑 VIP 段位晉升": "👑 VIP 段位晋升", "⭐ VIP 等級提升": "⭐ VIP 等级提升", "🎯 每日任務達成": "🎯 每日任务达成",
    "🎫 季票階梯獎勵": "🎫 季票阶梯奖励", "🏅 成就徽章解鎖": "🏅 成就徽章解锁",
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
    // #76 簽到揭曉層（兩鍵簡繁皆不同形故列入；「已入主餘額」既有覆蓋不重列）
    "🎁 簽到揭曉": "🎁 签到揭晓",
    "今日獎勵以揭曉方式發放 · 平均值與階梯相同": "今日奖励以揭晓方式发放 · 平均值与阶梯相同",
    "連越久單日獎越大 · 第 8/15/22/30 天有里程碑大禮": "连越久单日奖越大 · 第 8/15/22/30 天有里程碑大礼",
    "今日已領，明天再來": "今日已领，明天再来", "今日已領取 ✓": "今日已领取 ✓",
    "休閒模式 · 日獎進主餘額 · 里程碑進獎金錢包 · Demo": "休闲模式 · 日奖进主余额 · 里程碑进奖金钱包 · Demo",
    "連登里程碑": "连登里程碑", "連登": "连登", "簽到成功": "签到成功",
    "每日簽到": "每日签到", "今日可簽": "今日可签",
    // Happy Hour 限時加成（#35）
    "⚡ Happy Hour 限時加成": "⚡ Happy Hour 限时加成", "進行中，剩餘": "进行中，剩余", "下一場倒數": "下一场倒数",
    "進行中": "进行中", "限時返水加成": "限时返水加成", "返水×2 進行中": "返水×2 进行中",
    // #81：「領取加成窗口」四字簡繁同形故刻意不列（避免 U31 等值死鍵）；「返水加成已開啟」僅「啟」有差
    "返水加成已開啟": "返水加成已开启",
    "每日三個固定時段，窗內所有押注的返水率 ×2（經 💧 返水日桶累積）。": "每日三个固定时段，窗内所有押注的返水率 ×2（经 💧 返水日桶累积）。",
    "排程型時間窗口 · 催時段回訪 · Demo": "排程型时间窗口 · 催时段回访 · Demo",
    "Happy Hour 開始": "Happy Hour 开始", "限時返水 ×2 進行中（一小時），把握時段！": "限时返水 ×2 进行中（一小时），把握时段！",
    "⚡ Happy Hour：返水 ×2 進行中": "⚡ Happy Hour：返水 ×2 进行中",
    // #52 促銷 opt-in「我的優惠」+ 返水加成排程表
    //   （zh-Hans 只列**與繁體逐字不同**者：「新手高返水窗口」「加成生效中 · 剩」「其他符合但未套用的加成：」
    //     三條簡繁同形，依檔頭紀律刻意不列＝留原文）
    "已退出此優惠": "已退出此优惠", "已加入優惠，開始生效": "已加入优惠，开始生效",
    "已加入的優惠": "已加入的优惠", "💧 限時返水加成": "💧 限时返水加成",
    "我的優惠": "我的优惠", "目前沒有可加入的優惠。": "目前没有可加入的优惠。",
    "優惠需主動加入才會生效，並會在時限到期後自動結束。": "优惠需主动加入才会生效，并会在时限到期后自动结束。",
    "加入即開啟返水加成": "加入即开启返水加成",
    "目前無返水加成生效。": "目前无返水加成生效。",
    "當前返水加成": "当前返水加成", "加成剩餘時間": "加成剩余时间",
    "多個加成同時符合時，只套用最高的一個（不相乘）。": "多个加成同时符合时，只套用最高的一个（不相乘）。",
    "前往活動日曆加入優惠 →": "前往活动日历加入优惠 →",
    // #49 活動日曆 promo-cal.js（zh-Hans 只列與繁體逐字不同者；「前往 →」「今天」「明天」「每日」「社群」簡繁同形故不列＝避免 U31 等值死鍵）
    "📅 活動日曆": "📅 活动日历", "清單": "清单", "時間軸": "时间轴",
    "常設開放": "常设开放", "無活動": "无活动",
    "週日": "周日", "週一": "周一", "週二": "周二", "週三": "周三", "週四": "周四", "週五": "周五", "週六": "周六",
    "抽獎": "抽奖", "競賽": "竞赛", "賽季": "赛季", "保險": "保险",
    "今日可轉": "今日可转", "今日已轉 · 明日再來": "今日已转 · 明日再来",
    "在聊天室活躍即可分得": "在聊天室活跃即可分得",
    "目前沒有進行中或即將到來的活動。": "目前没有进行中或即将到来的活动。",
    "一處看完全站活動：進行中、即將開始、常設開放。點「前往」直接進入該活動。": "一处看完全站活动：进行中、即将开始、常设开放。点「前往」直接进入该活动。",
    "排程註冊表 · 活動一處總覽 · Demo": "排程注册表 · 活动一处总览 · Demo",
    // 紅利/流水引擎（#20）
    "🔒 待解鎖紅利": "🔒 待解锁红利", "當前解鎖進度": "当前解锁进度", "其餘排隊中": "其余排队中",
    "可領取獎金": "可领取奖金", "到主餘額": "到主余额",
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
    "提款帳戶": "提款账户", "確認提款": "确认提款", "載入中…": "加载中…", "尚無交易紀錄。": "尚无交易记录。", "載入失敗，請稍後再試": "加载失败，请稍后再试",
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
    "開始自動": "开始自动", "開牌": "开牌", "發牌": "发牌", "搖骰": "摇骰", "發牌中…": "发牌中…", "搖骰中…": "摇骰中…", "兌現": "兑现", "復原": "复原", "重押": "重押", "籌碼": "筹码", "本局總注": "本局总注",
    "🎡 幸運轉盤 Money Wheel": "🎡 幸运转盘 Money Wheel", "幸運轉盤 Money Wheel": "幸运转盘 Money Wheel", "幸運轉盤 Money Wheel · 規則 / 賠率": "幸运转盘 Money Wheel · 规则 / 赔率",
    "近況": "近况", "轉盤旋轉中…": "转盘旋转中…",
    "在號碼上下注後按「旋轉」，指針停在哪個號碼即為開獎 🎡": "在号码上下注后按「旋转」，指针停在哪个号码即为开奖 🎡",
    "在 1 / 2 / 5 / 10 / 20 / 40 六個號碼上下注。轉盤停在哪個號碼、押中該號碼就贏，賠付＝號碼:1（例如押 10 中 10 → 賠 10 倍）。對標 Evolution Dream Catcher，54 段。": "在 1 / 2 / 5 / 10 / 20 / 40 六个号码上下注。转盘停在哪个号码、押中该号码就赢，赔付＝号码:1（例如押 10 中 10 → 赔 10 倍）。对标 Evolution Dream Catcher，54 段。",
    "號碼 10": "号码 10", "10:1；4 段。edge 3.42%（頭條最低莊家優勢、RTP 96.58%）": "10:1；4 段。edge 3.42%（头条最低庄家优势、RTP 96.58%）",
    "號碼 1 / 2": "号码 1 / 2", "1:1（23 段）/ 2:1（15 段）。edge 4.66% / 4.49%（最常見主注）": "1:1（23 段）/ 2:1（15 段）。edge 4.66% / 4.49%（最常见主注）",
    "號碼 5 / 20 / 40": "号码 5 / 20 / 40", "5:1（7 段）/ 20:1（2 段）/ 40:1（1 段）。edge 8.76% / 7.26% / 9.19%（高賠側注）": "5:1（7 段）/ 20:1（2 段）/ 40:1（1 段）。edge 8.76% / 7.26% / 9.19%（高赔侧注）",
    "乘數段 ×2 / ×7": "乘数段 ×2 / ×7", "轉到乘數：全部注保留、乘數累乘後再轉一次；最終停在號碼時以累積乘數放大彩金（可連乘）。": "转到乘数：全部注保留、乘数累乘后再转一次；最终停在号码时以累积乘数放大彩金（可连乘）。",
    "本桌採可驗證公平（HMAC-SHA256）· Demo：每次旋轉取一個浮點 f，段＝⌊f×54⌋，乘數重轉再取新浮點，可事後重算。點「近況」珠可開驗證面板。": "本桌采可验证公平（HMAC-SHA256）· Demo：每次旋转取一个浮点 f，段＝⌊f×54⌋，乘数重转再取新浮点，可事后重算。点「近况」珠可开验证面板。",
    // 桌遊三款（U26 i18n 覆蓋：僅列與繁體不同者）
    "🐉 龍虎鬥 Dragon Tiger": "🐉 龙虎斗 Dragon Tiger", "龍虎鬥 Dragon Tiger": "龙虎斗 Dragon Tiger", "龍虎鬥 · 規則 / 賠率": "龙虎斗 · 规则 / 赔率",
    "龍、虎各發一張牌，比點數大小（A 最小 → K 最大，花色不影響龍/虎勝負），大者該邊贏。採 8 副牌靴。": "龙、虎各发一张牌，比点数大小（A 最小 → K 最大，花色不影响龙/虎胜负），大者该边赢。采 8 副牌靴。",
    "龍 DRAGON / 虎 TIGER": "龙 DRAGON / 虎 TIGER", "1:1（贏家退 2×）；和局時退回一半注": "1:1（赢家退 2×）；和局时退回一半注",
    "8:1（退 9×）；龍虎點數相同即和": "8:1（退 9×）；龙虎点数相同即和", "50:1（退 51×）；和局且龍虎同花色": "50:1（退 51×）；和局且龙虎同花色",
    "本桌採可驗證公平（HMAC-SHA256）發牌 · Demo：每局取兩個浮點 f，龍＝⌊f₁×416⌋、虎為剩餘 415 張均勻抽樣，可事後重算。點「近況」珠可開驗證面板。龍/虎主注 house edge 3.735%（RTP 96.27%）。": "本桌采可验证公平（HMAC-SHA256）发牌 · Demo：每局取两个浮点 f，龙＝⌊f₁×416⌋、虎为剩余 415 张均匀抽样，可事后重算。点「近况」珠可开验证面板。龙/虎主注 house edge 3.735%（RTP 96.27%）。",
    "下注後按「發牌」，龍 vs 虎比點數，大者贏 🐉🐯": "下注后按「发牌」，龙 vs 虎比点数，大者赢 🐉🐯", "龍 DRAGON": "龙 DRAGON",
    "🎲 骰寶 Sic Bo": "🎲 骰宝 Sic Bo", "骰寶 Sic Bo": "骰宝 Sic Bo", "骰寶 Sic Bo · 規則 / 賠率": "骰宝 Sic Bo · 规则 / 赔率",
    "搖三顆骰子求和，於各注區下注。下列賠付與莊家優勢對標真實娛樂城標準（大/小為頭條主注 RTP 97.22%）。": "摇三颗骰子求和，于各注区下注。下列赔付与庄家优势对标真实娱乐城标准（大/小为头条主注 RTP 97.22%）。",
    "1:1；小=總點 4–10、大=11–17，逢任何圍骰(三同)皆輸。edge 2.78%": "1:1；小=总点 4–10、大=11–17，逢任何围骰(三同)皆输。edge 2.78%",
    "全圍 ANY TRIPLE": "全围 ANY TRIPLE", "30:1；任意三顆同點。edge 13.89%": "30:1；任意三颗同点。edge 13.89%",
    "指定圍骰 TRIPLE": "指定围骰 TRIPLE", "180:1；指定某點三顆全同。edge 16.20%": "180:1；指定某点三颗全同。edge 16.20%",
    "單骰 SINGLE": "单骰 SINGLE", "指定點出現 1/2/3 顆 → 賠 1/2/3 倍。edge 7.87%": "指定点出现 1/2/3 颗 → 赔 1/2/3 倍。edge 7.87%",
    "對子 DOUBLE": "对子 DOUBLE", "10:1；指定某點至少兩顆。edge 18.52%": "10:1；指定某点至少两颗。edge 18.52%",
    "總點 TOTAL": "总点 TOTAL",
    "本桌採可驗證公平（HMAC-SHA256）搖骰 · Demo：每局取三個浮點 f，每骰＝⌊f×6⌋+1，可事後重算。點「近況」珠可開驗證面板。": "本桌采可验证公平（HMAC-SHA256）摇骰 · Demo：每局取三个浮点 f，每骰＝⌊f×6⌋+1，可事后重算。点「近况」珠可开验证面板。",
    "下注後按「搖骰」，三骰求和決定各注區輸贏 🎲": "下注后按「摇骰」，三骰求和决定各注区输赢 🎲",
    "圍骰": "围骰", "單骰（出現次數 → 1/2/3 倍）": "单骰（出现次数 → 1/2/3 倍）", "對子": "对子", "全圍 ANY": "全围 ANY",
    "🂡 安達巴哈 Andar Bahar": "🂡 安达巴哈 Andar Bahar", "安達巴哈 Andar Bahar": "安达巴哈 Andar Bahar", "安達巴哈 Andar Bahar · 規則 / 賠率": "安达巴哈 Andar Bahar · 规则 / 赔率",
    "翻開一張「莊牌」定出目標點數，接著交替往 Andar（先發側）/ Bahar 兩堆發牌，先出現與莊牌同點數者該側贏。花色不影響勝負。": "翻开一张「庄牌」定出目标点数，接着交替往 Andar（先发侧）/ Bahar 两堆发牌，先出现与庄牌同点数者该侧赢。花色不影响胜负。",
    "Andar （安達・先發）": "Andar （安达・先发）", "0.9:1（贏退 1.9×）；勝率略高 51.50%。house edge 2.15%（頭條主注）": "0.9:1（赢退 1.9×）；胜率略高 51.50%。house edge 2.15%（头条主注）",
    "Bahar （巴哈・後發）": "Bahar （巴哈・后发）", "1:1（贏退 2.0×）；勝率 48.50%。house edge 3.00%": "1:1（赢退 2.0×）；胜率 48.50%。house edge 3.00%",
    "先發側 Andar 多一個發牌位、勝率略高，故 canonical 賠率略低為 0.9:1（非不公平，而是進場優勢的對價）。": "先发侧 Andar 多一个发牌位、胜率略高，故 canonical 赔率略低为 0.9:1（非不公平，而是进场优势的对价）。",
    "本桌採可驗證公平（HMAC-SHA256）發牌 · Demo：一局取多個浮點 f，先抽莊牌（⌊f×52⌋），再逐張均勻抽剩牌交替發，可事後重算。點「近況」珠可開驗證面板。": "本桌采可验证公平（HMAC-SHA256）发牌 · Demo：一局取多个浮点 f，先抽庄牌（⌊f×52⌋），再逐张均匀抽剩牌交替发，可事后重算。点「近况」珠可开验证面板。",
    "下注後按「發牌」，翻開莊牌後交替發牌至配對 🂡": "下注后按「发牌」，翻开庄牌后交替发牌至配对 🂡",
    "安達・先發": "安达・先发", "巴哈・後發": "巴哈・后发", "Andar 安達": "Andar 安达", "🎯 莊牌": "🎯 庄牌",
    // SLOT 品類兩款（U27 i18n 覆蓋：僅列與繁體不同者）
    "🦜 Pirots 探險": "🦜 Pirots 探险", "Pirots 探險": "Pirots 探险", "Apex Studio（對標 ELK）": "Apex Studio（对标 ELK）",
    "旋轉 🦜": "旋转 🦜", "4% 莊家優勢": "4% 庄家优势", "購買免費遊戲 103.7×": "购买免费游戏 103.7×",
    "直接進免費遊戲（乘數持續暴走）": "直接进免费游戏（乘数持续暴走）",
    "可驗證公平（一注一種子·可驗證）": "可验证公平（一注一种子·可验证）",
    "連通同色 ≥6 鳥即收集→cascade+漸進乘數→集滿擴張網格 6→8；⭐×3 進免費遊戲乘數暴走，最高 10000×。對標 ELK『Pirots 5』玩法": "连通同色 ≥6 鸟即收集→cascade+渐进乘数→集满扩张网格 6→8；⭐×3 进免费游戏乘数暴走，最高 10000×。对标 ELK『Pirots 5』玩法",
    "🤠 Dead By Noon 正午對決": "🤠 Dead By Noon 正午对决", "Dead By Noon 正午對決": "Dead By Noon 正午对决", "Apex Studio（對標 Hacksaw）": "Apex Studio（对标 Hacksaw）",
    "旋轉 🤠": "旋转 🤠", "5×4 · 14 線": "5×4 · 14 线", "3.73% 莊家優勢": "3.73% 庄家优势", "購買免費遊戲 43.4×": "购买免费游戏 43.4×",
    "🥃 +免費次數！": "🥃 +免费次数！", "直接進生死決鬥免費遊戲": "直接进生死决斗免费游戏",
    "5×4 · 14 線；中獎觸發 Row Cascade（移除底列+下落補新）；彈膛 🎯 化 Wild 露 1–9 由左到右串接成乘數（2·5·1→×251）套用中獎；⭐3/4 進免費遊戲。對標 Hacksaw『Dead By Noon』": "5×4 · 14 线；中奖触发 Row Cascade（移除底列+下落补新）；弹膛 🎯 化 Wild 露 1–9 由左到右串接成乘数（2·5·1→×251）套用中奖；⭐3/4 进免费游戏。对标 Hacksaw『Dead By Noon』",
    // Golden Toad 金蟾聚寶（slot · games 軌第七款，U27 後落地）
    "🐸 金蟾聚寶 Golden Toad": "🐸 金蟾聚宝 Golden Toad", "金蟾聚寶 Golden Toad": "金蟾聚宝 Golden Toad",
    "旋轉 🐸": "旋转 🐸", "5×3 · 10 線": "5×3 · 10 线", "3.7% 莊家優勢": "3.7% 庄家优势",
    "購買 Hold & Win 86.4×": "购买 Hold & Win 86.4×", "直接觸發 Hold & Win（保證 6 金幣起手）": "直接触发 Hold & Win（保证 6 金币起手）",
    "5×3 · 10 線；🪙金幣 ≥6 觸發 Hold & Win（約 1/98）：鎖定金幣、3 次重旋、落新幣重置次數；派彩=金幣值加總，滿盤再加 GRAND +200×。忠實復刻業界標準 Hold & Win 玩法": "5×3 · 10 线；🪙金币 ≥6 触发 Hold & Win（约 1/98）：锁定金币、3 次重旋、落新币重置次数；派彩=金币值加总，满盘再加 GRAND +200×。忠实复刻业界标准 Hold & Win 玩法",
    // Gem Storm 寶石狂潮（slot · games 軌第八款，U28 後落地）
    "💎 寶石狂潮 Gem Storm": "💎 宝石狂潮 Gem Storm", "寶石狂潮 Gem Storm": "宝石狂潮 Gem Storm",
    "6×5 · 任位計數（8+ 同符即中）": "6×5 · 任位计数（8+ 同符即中）", "旋轉 💎": "旋转 💎",
    "購買免費遊戲 82×": "购买免费游戏 82×", "直接觸發免費遊戲（保證 4 ⭐ 起手）": "直接触发免费游戏（保证 4 ⭐ 起手）", "3.5% 莊家優勢": "3.5% 庄家优势",
    "💎 寶石狂潮 · 免費遊戲！": "💎 宝石狂潮 · 免费游戏！",
    "6×5 任位計數：同一寶石在盤面任意位置 ≥8 個即中獎（8-9/10-11/12+ 三級賠付），無 payline。中獎符號消失、連鎖掉落（tumble）補新可連續中；⭐≥4 觸發免費遊戲（約 1/240），免費中 💣乘數炸彈值加總乘上該轉贏分。忠實復刻業界標準 pay-anywhere/tumble 玩法": "6×5 任位计数：同一宝石在盘面任意位置 ≥8 个即中奖（8-9/10-11/12+ 三级赔付），无 payline。中奖符号消失、连锁掉落（tumble）补新可连续中；⭐≥4 触发免费游戏（约 1/240），免费中 💣乘数炸弹值加总乘上该转赢分。忠实复刻业界标准 pay-anywhere/tumble 玩法",
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
    "虛擬主播": "虚拟主播",
    // U19：留存/金流面板 i18n 覆蓋補完（簡繁同形如「目前返水率/今日下注 10 次」依慣例不列）
    "已達最高等級 💎": "已达最高等级 💎",
    "💧 返水率（本級）": "💧 返水率（本级）", "可領取返水": "可领取返水",
    "尚無可領取返水": "尚无可领取返水",
    "目前返還比例（占莊家優勢）": "目前返还比例（占庄家优势）",
    "各等級返還比例（占該注莊家優勢）": "各等级返还比例（占该注庄家优势）",
    "以莊家優勢計價 · 每日桶逾期作廢 · Demo": "以庄家优势计价 · 每日桶逾期作废 · Demo",
    "返水以「這一注理論上莊家賺多少」計價：莊家優勢越高的遊戲，同樣的押注額返得越多；等級越高，返還的比例越高。返水進「每日桶」，當日未領跨日即作廢，記得每天回來領。": "返水以「这一注理论上庄家赚多少」计价：庄家优势越高的游戏，同样的押注额返得越多；等级越高，返还的比例越高。返水进「每日桶」，当日未领跨日即作废，记得每天回来领。",
    "同樣押注 NT$1,000，不同遊戲的返水（依該遊戲莊家優勢）": "同样押注 NT$1,000，不同游戏的返水（依该游戏庄家优势）",
    "骰寶 Dice（1.00% 莊優）": "骰宝 Dice（1.00% 庄优）", "Pirots（3.855% 莊優）": "Pirots（3.855% 庄优）",
    "🎯 多倍數挑戰": "🎯 多倍数挑战", "多倍數挑戰": "多倍数挑战", "獎金錢包": "奖金钱包", "挑戰獎勵": "挑战奖励",
    "在任一遊戲的「單局」達成目標倍數即解鎖獎金（倍數＝該局贏分÷押注）。": "在任一游戏的「单局」达成目标倍数即解锁奖金（倍数＝该局赢分÷押注）。",
    "每日 0 點重置 · 獎勵入獎金錢包 · Demo": "每日 0 点重置 · 奖励入奖金钱包 · Demo",
    "🎯 單局命中 2× 倍數 5 次": "🎯 单局命中 2× 倍数 5 次", "🚀 單局命中 10× 倍數": "🚀 单局命中 10× 倍数", "💥 單局命中 50× 倍數": "💥 单局命中 50× 倍数",
    "去簽到": "去签到", "任務獎勵": "任务奖励",
    "今日贏 5 次": "今日赢 5 次", "今日累積押注 NT$2,000": "今日累积押注 NT$2,000",
    "歡迎來到 Apex Win": "欢迎来到 Apex Win", "完成每日簽到、衝 VIP 等級、挑戰三級累積彩金！": "完成每日签到、冲 VIP 等级、挑战三级累积彩金！",
    "每日簽到已開啟": "每日签到已开启", "連續登入領遊戲幣，記得別斷簽。": "连续登入领游戏币，记得别断签。",
    "VIP 與返水上線": "VIP 与返水上线", "押注即累積有效投注，等級越高返水越多。": "押注即累积有效投注，等级越高返水越多。",
    "通知來自你的遊戲事件（VIP 升級、彩金中獎…）· Demo": "通知来自你的游戏事件（VIP 升级、彩金中奖…）· Demo",
    "聊天室紅包雨": "聊天室红包雨", "紅包雨開始，45 秒內在聊天室領取雨露！": "红包雨开始，45 秒内在聊天室领取雨露！", "紅包雨": "红包雨",
    // ===== 成本加權 XP HL.edge（#50）：僅列與繁體不同者（「遊戲」已在下方 betlog 區故不重複）=====
    // 「莊家優勢」首版誤判為簡繁同形而漏列 → preview 三語驗證抓到簡中殘留繁體，已補（莊→庄、優勢→优势）
    "XP 成本加權": "XP 成本加权", "經驗倍率": "经验倍率", "莊家優勢": "庄家优势",
    "⚖️ XP 成本加權（各遊戲倍率）→": "⚖️ XP 成本加权（各游戏倍率）→",
    "VIP 與賽季經驗依各遊戲的理論莊家成本加權：對莊家成本較高的遊戲，每一注累積較多經驗。實際下注金額、返水、彩金與帳目一律不受影響。": "VIP 与赛季经验依各游戏的理论庄家成本加权：对庄家成本较高的游戏，每一注累积较多经验。实际下注金额、返水、彩金与账目一律不受影响。",
    "真站中性模式：全站平均倍率為 1.00×，只重新分配經驗、不額外加發。": "真站中性模式：全站平均倍率为 1.00×，只重新分配经验、不额外加发。",
    "假站寬鬆模式：最低倍率為 1.00×，沒有任何遊戲比改版前更慢。": "假站宽松模式：最低倍率为 1.00×，没有任何游戏比改版前更慢。",
    // ===== 進度來源註冊表 HL.progressSrc（#65）：僅列與繁體不同者 =====
    // 刻意不列「每日上限」「已用」（四字/二字簡繁同形＝U31 型等值死鍵）；「經驗倍率/儲值/每日簽到」既有覆蓋
    "進度來源": "进度来源", "遊戲押注": "游戏押注", "累積經驗": "累积经验", "累積 VIP 經驗": "累积 VIP 经验",
    "不設上限": "不设上限", "真站關閉": "真站关闭",
    "📊 進度來源（押注以外的累積）→": "📊 进度来源（押注以外的累积）→",
    "押注/儲值/簽到皆累積 · 子級+大階雙層獎金 · Demo": "押注/储值/签到皆累积 · 子级+大阶双层奖金 · Demo",
    "除了遊戲押注，儲值與每日簽到也會累積 VIP 經驗與賽季經驗。這些來源只累積進度，不影響任何金額、返水、彩金或帳目。": "除了游戏押注，储值与每日签到也会累积 VIP 经验与赛季经验。这些来源只累积进度，不影响任何金额、返水、彩金或账目。",
    "真站僅計入遊戲押注：非投注來源一律關閉，避免同一筆錢被重複計為進度。": "真站仅计入游戏押注：非投注来源一律关闭，避免同一笔钱被重复计为进度。",
    "假站已開啟全部來源，各來源設有每日上限。": "假站已开启全部来源，各来源设有每日上限。",
    "未列出的行為不累積進度。": "未列出的行为不累积进度。",
    // #75 加速層（刻意不列「其他符合但未套用的加速：」＝逐字簡繁同形，列了就是 U31 型等值死鍵）
    "季票進階軌加速": "季票进阶轨加速", "限時經驗加速": "限时经验加速",
    "加入即開啟經驗加速": "加入即开启经验加速", "當前經驗加速": "当前经验加速",
    "加速剩餘時間": "加速剩余时间", "真站不套用經驗加速。": "真站不套用经验加速。",
    "目前無經驗加速生效。": "目前无经验加速生效。",
    "多個加速同時符合時只套用最高的一個（不相乘），且加速不會提高每日上限。": "多个加速同时符合时只套用最高的一个（不相乘），且加速不会提高每日上限。",
    "未列出的遊戲一律為 1.00×，不受加權影響。": "未列出的游戏一律为 1.00×，不受加权影响。",
    // ===== 遊戲上架排程 × 受眾分層 HL.release（#54）：僅列與繁體不同者 =====
    "⚡ 搶先體驗": "⚡ 抢先体验", "🔒 搶先體驗中": "🔒 抢先体验中", "🗓️ 即將上架": "🗓️ 即将上架",
    "全體玩家": "全体玩家", "季票階級": "季票阶级", "公會成員": "公会成员", "限定受眾": "限定受众",
    "開放階段": "开放阶段", "搶先體驗期": "抢先体验期", "尚未開放": "尚未开放",
    "搶先體驗開始倒數": "抢先体验开始倒数", "全站開放倒數": "全站开放倒数",
    "這款遊戲採分批上架：先開放給指定族群搶先體驗，時間到才全站開放。": "这款游戏采分批上架：先开放给指定族群抢先体验，时间到才全站开放。",
    "查看活動日曆": "查看活动日历", "上架排程 · 資料驅動": "上架排程 · 数据驱动",
    "你已可搶先體驗": "你已可抢先体验", "搶先體驗中 · 你尚未符合資格": "抢先体验中 · 你尚未符合资格",
    "尚未開放 · 即將排定上架": "尚未开放 · 即将排定上架",
    "已全站開放": "已全站开放", "這款遊戲尚未上線": "这款游戏尚未上线",

    // ===== 注單／投注歷史 HL.betlog（#51）：僅列與繁體不同者 =====
    "📜 注單／投注歷史": "📜 注单／投注历史", "📜 我的注單": "📜 我的注单", "注單中心尚未就緒": "注单中心尚未就绪",
    "編號": "编号", "時間": "时间", "遊戲": "游戏", "贏分": "赢分", "淨額": "净额",
    "驗算": "验算", "驗算 →": "验算 →", "遊戲篩選": "游戏筛选", "全部遊戲": "全部游戏",
    "只看贏": "只看赢", "只看輸": "只看输", "已記錄注單": "已记录注单",
    "⬇ 匯出 CSV": "⬇ 导出 CSV", "已匯出 CSV": "已导出 CSV", "匯出失敗（瀏覽器不支援）": "导出失败（浏览器不支持）",
    "清空紀錄": "清空记录",
    "尚無注單紀錄。玩一局就會出現在這裡。": "尚无注单记录。玩一局就会出现在这里。",
    "確定清空本機注單紀錄？此動作不影響餘額與戰績。": "确定清空本机注单记录？此动作不影响余额与战绩。",
    "僅顯示最新 200 筆；CSV 匯出為全部篩選結果。": "仅显示最新 200 笔；CSV 导出为全部筛选结果。",
    "nonce 為結算當下的「下一注」序號（該局最後取數的上界）；驗算會帶入前一個 nonce。僅採用可驗證公平的遊戲提供驗算入口。": "nonce 为结算当下的「下一注」序号（该局最后取数的上界）；验算会带入前一个 nonce。仅采用可验证公平的游戏提供验算入口。",
    "純前端：紀錄存於本機、依真假站分開；部分遊戲把押注與贏分拆兩次回報，故可能落成兩列。": "纯前端：记录存于本机、依真假站分开；部分游戏把押注与赢分拆两次回报，故可能落成两列。",

    // ===== 營運帳本 · 站內移轉 HL.ledger（#56）：僅列與繁體不同者（「提款」簡繁同形故不列）=====
    "儲值": "储值", "轉贈": "转赠", "站內轉贈": "站内转赠",
    "玩家間移轉（不計入淨現金流）": "玩家间移转（不计入净现金流）",
    "Demo 無收款方入帳": "Demo 无收款方入账",
    "儲值 − 提款（不含站內轉贈）": "储值 − 提款（不含站内转赠）",
    "ℹ️ Demo 模式沒有真實收款方，轉出的遊戲幣不會實際入帳給對方；此筆記為「站內移轉」，不計入營運淨現金流。": "ℹ️ Demo 模式没有真实收款方，转出的游戏币不会实际入账给对方；此笔记为「站内移转」，不计入营运净现金流。",

    // ===== 公會 · 團隊戰 HL.guild（#47）：僅列與繁體不同者（「暗影狼群/霓虹辛迪加」四字簡繁同形故不列；「加入/領取/✓ 已領/我的貢獻」既有覆蓋）=====
    "加入一個公會，你的每筆有效押注都會計入團隊週榜。與其他公會競爭名次，週末依名次發放團隊獎金，並沿途解鎖個人貢獻任務。": "加入一个公会，你的每笔有效押注都会计入团队周榜。与其他公会竞争名次，周末依名次发放团队奖金，并沿途解锁个人贡献任务。",
    "團隊獎金已入獎金錢包": "团队奖金已入奖金钱包",
    "公會貢獻任務達標": "公会贡献任务达标",
    "團隊週榜 · team-vs-team": "团队周榜 · team-vs-team",
    "真站模式：不顯示模擬對手隊伍，僅計你所屬公會的真實貢獻。": "真站模式：不显示模拟对手队伍，仅计你所属公会的真实贡献。",
    "本週貢獻榜（隊內）": "本周贡献榜（队内）",
    "換公會 / 瀏覽全部": "换公会 / 浏览全部",
    "退出公會": "退出公会", "已退出公會": "已退出公会",
    "下注即累積公會貢獻 · 週末結算團隊獎金 · 純前端骨架（社交層待後端）· Demo": "下注即累积公会贡献 · 周末结算团队奖金 · 纯前端骨架（社交层待后端）· Demo",
    "⚔️ 公會 · 團隊戰": "⚔️ 公会 · 团队战",
    "黃金龍族": "黄金龙族", "幸運草會": "幸运草会", "赤紅騎士團": "赤红骑士团", "虛空行者": "虚空行者",
    "月下同行，永不獨獵": "月下同行，永不独猎",
    "逐金而生，一擲千金": "逐金而生，一掷千金",
    "不夜之城，勝率永燃": "不夜之城，胜率永燃",
    "四葉在手，好運長留": "四叶在手，好运长留",
    "以榮譽下注，以團隊致勝": "以荣誉下注，以团队致胜",
    "衝破極限，倍數無界": "冲破极限，倍数无界",
    // ===== 限時損失保險 · 新手安全網 HL.safetynet（#48）：僅列與繁體不同者（「保障窗口」四字簡繁同形故不列＝避免 U31 等值死鍵）=====
    "保障已結束": "保障已结束",
    "淨損退還率": "净损退还率",
    "窗口內累計淨損": "窗口内累计净损",
    "已自動退還": "已自动退还",
    "目前累積待退": "目前累积待退",
    "退還封頂": "退还封顶",
    "去獎金錢包領取 →": "去奖金钱包领取 →",
    "保障窗口已結束，淨損退還已全數結清。": "保障窗口已结束，净损退还已全数结清。",
    "僅在你「淨輸」時退還（贏局自動抵銷）。每日自動把窗口內累計淨損 × 退還率退回獎金錢包，零流水；逾窗自動結清退場。": "仅在你「净输」时退还（赢局自动抵销）。每日自动把窗口内累计净损 × 退还率退回奖金钱包，零流水；逾窗自动结清退场。",
    "前 N 日淨損自動退還 · 零流水 · Demo": "前 N 日净损自动退还 · 零流水 · Demo"
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
    var fmts = root.querySelectorAll("[data-i18n-fmt]"); // 格式化元件依當前語系重繪（切回 zh-Hant→模板中文；救得了 body 常駐元件）
    Array.prototype.forEach.call(fmts, function (s) { renderFmt(s, dict()); });
  }
  // U22：動態組字格式化元件。模板（畫面中文，含 {name} 佔位符）為字典 key、值運行時填。
  // 回傳帶 data-i18n-fmt/vars 的 span；walk 週期會依當前語系整體重繪（解決「中文＋變數＋中文」
  // concat 無法命中整節點 walker 的 EN 缺口，如「第 N 次」「已翻 N / M 張」「最高 X×」）。
  function renderFmt(span, d) {
    var tpl = (span.getAttribute && span.getAttribute("data-i18n-fmt"));
    if (tpl == null) return;
    var vars = {}; try { vars = JSON.parse(span.getAttribute("data-i18n-vars") || "{}"); } catch (e) {}
    var trans = (d && d[tpl] != null) ? d[tpl] : tpl; // 模板譯文，或 zh-Hant 用模板本身
    span.textContent = trans.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; });
  }
  function fmt(template, vars) {
    var span = el("span", { "data-i18n-fmt": template, "data-i18n-vars": JSON.stringify(vars || {}) });
    renderFmt(span, dict()); // 建立當下即以當前語系渲染（zh-Hant→模板中文、EN/Hans→譯文）
    return span;
  }

  function walk(root) {
    var d = dict(); if (!d || !root) return;
    if (root.nodeType === 3) { tText(root, d); return; }
    if (root.nodeType !== 1) return;
    if (root.hasAttribute && root.hasAttribute("data-i18n-fmt")) { renderFmt(root, d); return; } // 格式化元件整體重繪，不逐字節點翻
    tAttrs(root, d);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n; while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(function (t) { tText(t, d); });
    var withAttr = root.querySelectorAll ? root.querySelectorAll("[title],[placeholder],[aria-label]") : [];
    Array.prototype.forEach.call(withAttr, function (e) { tAttrs(e, d); });
    var fmts = root.querySelectorAll ? root.querySelectorAll("[data-i18n-fmt]") : [];
    Array.prototype.forEach.call(fmts, function (e) { renderFmt(e, d); });
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

  // dict()：唯讀取得字典（供 HL.selftest 的 i18n 冒煙測驗有無空值／非字串；請勿在外部改寫）
  HL.i18n = { t: t, fmt: fmt, setLang: setLang, current: lang, open: open, langs: LANGS, apply: apply,
              dict: function () { return DICT; } };
})(window);

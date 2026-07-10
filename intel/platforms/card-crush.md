# Card Crush — 調研檔

- **平台**：Card Crush（cardcrush.com）
- **營運**：Vision NL Limited，2025-12 上線
- **tier / priority**：3 / 63
- **regions**：northamerica, global（48 州，僅 NV/WA 除外，21+）
- **category**：social, sweepstakes, casino, gamification, meta-progression, pvp, collectibles
- **調研日期**：2026-07-10（首次深挖）
- **來源**：sweepskings / rg.org / casino.org / betstamp / covers / crush-card.com how-it-works / onepiece.gg / cardcrush.com game-rules

---

## 定位一句話
把「**RPG 收藏卡牌對戰（deck-building + PvP）**」疊在賭場遊戲之上的新 sweepstakes 替代——刻意**不用 GC/SC 標準框架**，改用 **Cards + Mystery Coins (MC)** 幣制以規避部分州 sweeps 禁令（CA/NY 也可玩）。258 遊戲（BetSoft/Fugaso/Iconic21 等 6 家：249 slots + 8 真人）。招牌不是賭場遊戲，而是**卡牌收藏戰鬥 meta 層**。

## 特色表

### 遊戲 / 招牌玩法
- **Card Battles（核心招牌）**：best-of-5，兩副 **5 張牌組**對戰，先贏 3 回合者勝。**牌序開局鎖定**——你的 Card1 對他的 Card1、Card2 對 Card2…依序比到第 5 回合。開賽前可調整牌序。
- **回合勝負判定**：比 **Battle Score = Power + Affinity Bonus（Affinity Wheel 親和輪加成）**；平手用 **Speed** 與 **Team Initiative** 當 tiebreaker。全程透明、可看近期對戰與逐回合結果。
- **賭場遊戲**：249 主題 slots + 8 真人；用 MC 遊玩。

### 收藏 / 養成（deck-building）
- **卡片稀有度 4 階**：Common / Rare / Epic / Legendary；越高越稀有、越有價值、性能潛力越強。
- **升級機制**：所有卡從 **Level 1** 起；**蒐集足夠同名重複卡 → 可升級該卡**，提升 Power 和/或 Speed。＝典型的「抽重複 → 合成升階」收藏養成軸。
- **帳號等級**：升級解鎖更高 **Luck Boosts** 與更好的 **loot chests（寶箱）**。

### 競技 / 排行
- **ELO 式技巧排行榜**：每場勝負**即時**更新排名，非固定；對手當前排名影響漲跌幅（打贏高排名者漲更多）。
- **錦標賽**：tournament 對排名的推力大於一般對戰＝競技標準的真正驅動力。
- 贏一場自動爬榜，並可獲得 **Mystery Coins / Loyalty Club 點數 或兩者**。

### 幣制 / 金流（**avoid，只記錄**）
- **Mystery Coins (MC)** 一律**購買 Mystery Box 取得**（Box 內含 MC + Cards，定價制）。
- 註冊禮：驗證 email 後 **2 MC + 5 Cards**；首購 66% 加碼（$9.99 → 25 MC + 5 Cards）。
- **兌現**：MC 經賭場遊戲 **1x 流水**變成 Eligible MC → 現金 75 MC 起 / 禮品卡 10 MC 起；銀行轉帳或禮品卡最長 10 天。
- **no-loss safeguard**：主打「購買價值不流失」。
- → 真金購買 Box / 真人荷官 / 兌現 = CONTROL.avoid，僅取前端呈現。

## ApexWin 對照

| 維度 | Card Crush 有 | ApexWin 現況 |
|---|---|---|
| 收藏卡牌 + 稀有度 + 合成升階 | ✅ 4 階、重複卡升級 | ❌ **完全空白**（有收藏遊戲 #17，但無「可蒐集/升級的卡片資產」） |
| Deck-building + PvP 卡牌對戰 | ✅ best-of-5 牌序對決 | ❌ **完全空白**（僅 #30 Dice Duel 1v1 候補、且是比點數非策略牌組） |
| ELO 技巧排行榜 | ✅ 勝負即時 ELO | ⚠️ #15 錦標賽是**押注量積分賽**，非勝負 ELO 技巧榜（不同競技模型） |
| 揭曉開箱 | ✅ Mystery Box / loot chests | ✅ #38 reveal（scratch/bubble/wheel）、#36 商城神秘包 已可複用 |
| 點數商城消耗端 | ✅ Loyalty Club 點數 | ✅ #36 Reward Market 已具賺→逛→換閉環 |
| 持久養成 meta | ✅ 卡牌收藏養成 | ⚠️ #37「黃金之城」是**資源型城市重建**，風味不同（卡牌收藏 vs 蓋城） |

**與 BigPirate 島戰 / Dorados Lost City raid 三方共識**：皆為「賭場之上的持久養成/PvP meta 層」大主題，但 **Card Crush 風味＝收藏卡牌對戰（deck-building + skill PvP）**，與另兩家的「資源島戰/城市重建」是不同軸線，可作為 meta 層的第二種風味素材。

## 可落地點子（pure-frontend）

1. **【最強新素材】收藏卡牌對戰 v1（Card Battles）** — L
   對標：Card Crush best-of-5 牌序對決 + Affinity/Power/Speed 判定。
   純前端做法：一副可蒐集卡片（rarity 4 階，屬性 Power/Speed/Affinity），玩家組 5 張牌組，與 mock bot（複用 #15 leaderboard bot 池 + `HL.fair` 保證可驗證亂數）打 best-of-5、牌序鎖定逐回合比 Battle Score。掛 `HL.liveStats.record` 餵 VIP/任務。**ApexWin 完全空白的全新內容軸線**，也是與 #30 Dice Duel（比點數）本質不同的策略型 PvP。零牌照。

2. **卡片收藏 + 稀有度 + 重複卡合成升階** — M
   對標：Card Crush Common/Rare/Epic/Legendary + 集重複卡升 Level → 加 Power/Speed。
   純前端做法：卡冊 UI（已擁有/未解鎖/重複計數），從既有發獎點（Lucky Spin #17 / loot chest / 商城 #36）派卡；集滿 N 張同卡 → 升級動畫（複用 #38 reveal）。是「先做卡資產、再接對戰」的低風險前置卡，可獨立上線收集樂趣。

3. **ELO 技巧排行榜（勝負制競技榜）** — S–M
   對標：Card Crush 每場即時 ELO、對手排名影響漲跌。
   純前端做法：延展 #15 錦標賽框架新增一種「勝負 ELO 榜」（非押注量積分），對戰結果即時更新分數 + 對手權重；補齊 ApexWin 目前只有「量榜」缺「技巧榜」的競技維度。依賴點子 1 的對戰產出勝負事件。

4. **Mystery Box / Loot Chest 開箱（帳號等級解鎖）** — S
   對標：Card Crush 帳號升級解鎖更好 loot chests + Luck Boosts。
   純前端做法：把 #38 reveal 包成「寶箱」皮膚，箱內派**卡片 + 獎金**混合內容，帳號 XP 越高箱子越好；直接複用 #38 揭曉 + #42 gacha 機率派發。是點子 2 的天然發卡來源。

## 排程
- 已回填：`status: done`、`last_investigated: 2026-07-10`、`next_due: 2026-08-09`（tier3 +30 天）。

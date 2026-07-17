# Stake (stake.com) — 調研檔

- **調研日期**：2026-07-17（刷新）／ 2026-07-10（刷新）／ 2026-07-03（刷新）／ 初調 2026-06-26
- **tier**：1（全球頂級 · 7 天刷新）
- **regions**：global
- **category**：crypto / originals / casino / sportsbook / streamer
- **定位**：加密賭場龍頭，Stake Originals 自製玩法 + 主播/贊助生態（UFC/Everton/Drake）的標竿。

## 🔄 2026-07-17 刷新（7 天例行 reconfirm · 零淨新機制缺口）

- **Pump Original**：續為線上活躍 Original（up to 3,203,384.80×），狀態不變＝仍是 ApexWin 互動回合家族可補的一款（S–M，見下方點子 A）。
- **Weekly Raffle**：續為 $75k/週、每 $1,000 押注自動得 1 券、每週六 14:00 GMT 直播開獎——**與既有頭號待辦點子 1（每週抽獎）完全一致**，無變更。
- **Daily Race / Wheel Wars**：Daily Race 不變；「Wheel Wars」為 Pragmatic Play 遊戲的第三方月度促銷（2/1–7/19 期間 $150k），**非 Stake 自製新 Original**，僅為 #15 錦標賽的一種第三方運營皮，無新軸線。
- **結論**：本輪 Stake 純 reconfirm，**無淨新機制缺口**；頭號待辦仍是每週抽獎 Raffle（Stake+BC.Game 共識）與 Pump Original。Stake 續居全球對標基準。

## 🔄 2026-07-10 刷新（僅記與 07-03 不同處 · 無淨新機制缺口）

- **VIP 階梯數字來源分歧**：本輪多個評測站描述為 **15 級**（含每 10 分/每小時/每日分次發放的 Platinum+ reload），與 07-03 記錄的「16 級到 Obsidian」略有出入——各站計法/是否含 Obsidian 不一，**非事實變更**；ApexWin #29 已補「每段 5 子級 + 跨段大獎」雙層模型，方向已對齊，差距僅規模感，**非新缺口**。
- **「所有遊戲皆以全額計入 VIP 進度」**（slots / Originals / 真人桌 / 運彩同權重）＝設計哲學記錄；ApexWin 中央掛鉤 `HL.liveStats.record` 本就統一計數，已對齊。
- **VIP Originals 限定排行榜促銷**（如「$9,000 Quest for Glory」：在指定 Original 衝最高倍數、貼有效 bet ID 上榜）＝**把既有 Original + 排行榜組成限時主題賽事**——ApexWin #15 錦標賽 + #35 命名活動日已可組出同款，**無新缺口**，僅記錄為 #15/#35 的一種運營玩法範例。
- **Pump（07-03 記錄的新 Original）**：續為 ApexWin 互動回合家族可補的一款（S–M），狀態不變。

**結論**：本輪 Stake 為 7 天例行 reconfirm，**無帶來淨新機制缺口**；頭號待辦仍是 07-03 已記的 **每週抽獎 Raffle（Stake+BC.Game 共識）** 與 **Pump Original**。

## 🔄 2026-07-03 刷新（本輪新增，僅記與 06-26 不同處）

- **VIP 已擴為 16 級**（Bronze → … → **Obsidian**，門檻 Bronze $10k wager → Obsidian $1,000,000,000 lifetime；**終身累積、永不重置**）。ApexWin 原 5 段位，**已於 #29 補「每段 5 子級 + 跨段大獎」雙層模型**＝方向已對齊，差在 Stake 是「16 個有名稱的完整階梯」的規模感（差距不大、非新缺口）。
- **新 Original「Pump」（充氣氣球）**＝2026 新推互動回合玩法：4 難度（Easy/Med/Hard/Expert），每按一次 pump 氣球爆裂機率↑、成功則倍數↑，隨時 cashout；**莊家優勢 2%**（比 Dice 系 1% 高）、Expert 最大 3,203,384.80×。機制近 Crash/Limbo，但獨特在「**手動逐步充氣、風險自己一格一格加**」的張力（hover 顯示下一步倍數＋成功機率）。**ApexWin 互動回合家族已有 Crash/Mines/Towers/Hilo，缺 Pump**＝可補的 Original（S–M）。
- 促銷面續舊：Daily Race（每日 $100k / 社交版 50M GC top100 自動入榜）、Weekly Raffle $75k、Pragmatic Drops & Wins $2M/月——ApexWin 對應項（#15 錦標賽/#18 Raffle）已落地，無新缺口。

### 本輪新可落地點子
- **A. 新 Original「Pump 充氣氣球」**（對標 Stake Pump）：複用 `HL.instant` 互動回合 + `HL.fair`（每次 pump 取一注定爆裂、一步一 nonce＝逐步可驗證，同 Towers/Hilo 家族做法），4 難度曲線、hover 顯示下一步倍數/機率、隨時兌現、掛中央掛鉤 `HL.liveStats.record("pump",…)`。**工作量 S–M**。← 與 #23 Towers/#27 Hilo 同族、複用度最高。
- **B. VIP 升級贈免費 Lucky Spin**（對標 Stake/BC.Game「level-up 送轉」）：把既有 #17 Lucky Spin 與 #29 VIP 升級事件掛鉤，升級（子級或大階）觸發額外一次免費轉。**工作量 S**。

## 特色快照

### 遊戲 / Originals
- 31 款 Stake Originals 自製玩法：Dice、Mines、Plinko、Limbo、Keno、Crash、**Dragon Tower**、**Wheel（命運轉盤）**、Baccarat 等。
- Originals 房屋優勢約 1%（RTP 98–99%），與 ApexWin 既有引擎一致。

### 留存系統
- **VIP 五級**：Bronze→Silver→Gold→Platinum→Diamond，以累積押注解鎖（Bronze 門檻 ~$10k wager）。
- **Rakeback 返水**：Bronze 起約 5%，隨等級成長。
- **Reload 反覆儲值獎勵**：Platinum 起每日 reload，依過去 7–42 天押注量計；Platinum IV+ 配專屬 VIP host 可發 renewable reload。
- **Level-up / 週獎 / 月獎**：升級即發獎金，週 boost 固定時間發放。

### 促銷 / 競賽
- **Daily Race（每日競賽）**：玩任何遊戲自動入榜，每日 $100k 獎池發前 100 名；00:00 UTC 重置、排行榜每分鐘更新。
- **Weekly Raffle（週抽獎）**：每週 $75k，押注換抽獎券（slots/originals 每 $1 一張、live 每 $10 一張），週五開獎。
- Pragmatic Drops & Wins（$2M/月）等供應商活動。

### UX / 社群 / 直播
- 主播生態 + 大型體育贊助拉品牌聲量。

### 金流 / 模式（⚠️ CONTROL.avoid，只記錄不推進）
- 純加密 + sweepstakes（.us）雙形態，依管轄切換。

## ApexWin 對照

| 項目 | Stake | ApexWin 現況 |
|---|---|---|
| Originals 五天王 | ✅ | ✅ Dice/Limbo/Crash/Mines/Plinko |
| 命運轉盤 Wheel | ✅ | ❌ **缺**（有輪盤 Roulette，但無 Stake 式倍數 Wheel original）|
| Dragon Tower | ✅ | ❌ 缺 |
| VIP / Rakeback | ✅ | ✅ HL.vip + HL.rakeback |
| 累積彩金 | 供應商 | ✅ HL.jackpot 三級 |
| 每日簽到 | — | ✅ HL.rewards streak |
| **Daily Race 競賽** | ✅ 自動入榜+即時榜 | 🟡 已有錦標賽/Slot Race(#15)，但非「每日自動入榜、午夜重置」型 |
| **Weekly Raffle 週抽獎** | ✅ 押注換券 | ❌ **缺**（無抽獎券系統）|
| **Reload 定期儲值獎勵** | ✅ | 🟡 有獎金錢包，無「依近期押注量的週期 reload」|

## 可落地點子（pure-frontend，餵給 evolve）

1. **每週抽獎 Raffle**（對標 Stake $75k raffle / BC.Game lottery）：押注經 `HL.liveStats.record` 中央掛鉤累積抽獎券（每 $X 一張），週期到自動開獎發 `HL.bonus`，UI 顯示我的券數/倒數/歷史中獎。**工作量 M**。← 兩大平台都有、留存力強、純前端。
2. **命運轉盤 Wheel（Stake Original）**：複用 `HL.instant` 單注引擎，可選風險段 + 倍數環，落點派彩。補滿 Originals。**工作量 S–M**。
3. **每日/週期 Reload 獎勵**：依玩家近 N 天押注量，每日可領一筆 reload 到 `HL.bonus`，綁 VIP 係數。掛現有簽到/VIP 體系。**工作量 S**。
4. **Dragon Tower**：爬塔式翻格（類 Mines 變體），掛 `HL.instant`。**工作量 M**。

# Stake (stake.com) — 調研檔

- **調研日期**：2026-06-26
- **tier**：1（全球頂級 · 7 天刷新）
- **regions**：global
- **category**：crypto / originals / casino / sportsbook / streamer
- **定位**：加密賭場龍頭，Stake Originals 自製玩法 + 主播/贊助生態（UFC/Everton/Drake）的標竿。

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

# Roobet — 調研檔

- **平台**：Roobet ｜ url: https://roobet.com
- **調研日期**：2026-06-26
- **tier**：2（crypto casino，拉美 / 串流社群強）
- **regions**：global / latam
- **定位**：crypto-first 社群型賭場，SiGMA Awards 2025「最佳加密賭場」。與 Stake/BC.Game 同屬 ApexWin 直接對標族群（純前端玩法 + 留存鉤子高度可學）。

---

## 特色表

### 遊戲 / Originals
- **Roobet Originals**（皆 Provably Fair）：Crash、Dice、Mines、Plinko、**Keno**、**Towers**、**Coinflip**、獨家 **Mission Uncrossable**（過馬路式 crash 變體）。
- → ApexWin 已有 Crash/Dice/Mines/Plinko；**缺 Keno / Towers / Coinflip / Mission Uncrossable**。

### 留存系統（Roowards — 招牌）
- **Roowards** 全員開放、依押注即時累積，多層級回饋：
  - **Instant rakeback**：每 30 分鐘可領一次、永不過期。
  - **Daily**：每日一次、UTC 午夜刷新、24h 過期（**逾期作廢 = 催促每日回訪**）。
  - **Weekly**：每週六 00:00 UTC 更新。
  - **Monthly**：每月 1 號一次。
- **Roospins**：定期免費轉盤（對標 ApexWin #17 Lucky Spin）。
- Cash drops、月底 leaderboard races。

### 促銷 / 紅利
- **每週 $100,000 抽獎**給 100 名：每押注 $1,000 得 1 張券，每週一公布（對標 ApexWin #18 Weekly Raffle）。

### UX / 上手（最有價值的差異化）
- **Live RTP（即時 RTP）**：顯示熱門 slot 的「實際近期回報率」（取自其他玩家近期實戰數據，非廠商理論值）。
- **「On Fire」🔥 / 「Ice Cold」🧊 標籤**：把 slot 依近期回報冷熱標記，玩家可比較挑選 → **極強的純前端發現性 / 探索鉤子，ApexWin 完全沒有**。

### 金流 / 模式（只記錄，不推進）
- crypto-first（BTC 等）、真金提款 → **avoid**。

---

## ApexWin 對照

| Roobet 有 | ApexWin 現況 |
|---|---|
| Originals: Crash/Dice/Mines/Plinko | ✅ 四款皆有（且有 Provably Fair `HL.fair`） |
| Keno / Towers / Coinflip / Mission Uncrossable | ❌ 缺（皆純前端可做、可掛 `HL.instant`/`HL.fair`） |
| **Live RTP + On Fire/Ice Cold 冷熱標籤** | ❌ **完全缺**——高價值差異化發現鉤子 |
| 分層 rakeback（即時/日/週/月、逾期作廢） | ⚠️ 部分：`HL.rakeback` 有即時累積/領取，**但無「日/週/月分桶 + 逾期作廢」的回訪催促節奏** |
| Roospins 每日轉盤 | 🏗️ 進行中：#17 Lucky Spin |
| 每週 $100k 抽獎（押注換券） | 🟦 已開卡：#18 Weekly Raffle |

**ApexWin 最關鍵缺口**：
1. **Live RTP「熱度 / On Fire・Ice Cold」標籤系統**——零成本、強發現性、頂級平台獨門，ApexWin 完全空缺。
2. **新 Originals：Keno / Towers / Coinflip**（補滿對標 Originals 陣容）。

---

## 可落地點子（pure-frontend）

1. **遊戲熱度標籤：On Fire 🔥 / Ice Cold 🧊 + Live RTP 牆**（對標 Roobet Live RTP）
   - 用 `HL.liveStats` 已記錄的近期下注/輸贏，計算各遊戲/slot 的「近期回報熱度」，在卡片角標 🔥/🧊 並做一面「即時 RTP」牆。純前端、零牌照、複用既有中央掛鉤。
   - 可與 bet365「當下最熱」模組合併成統一「遊戲熱度」面板（見 bet365.md 點子 3）。
   - **對標來源**：Roobet Live RTP / On Fire・Ice Cold。**工作量 S–M**。
2. **新 Original：Towers（爬塔）**（對標 Roobet Towers）
   - 逐層選格、選對往上累乘、踩雷歸零、隨時兌現——機制近 Mines，可大量複用 `HL.instant` 互動回合 + `HL.fair`。
   - **對標來源**：Roobet/Stake Towers。**工作量 M**。
3. **新 Original：Keno**（對標 Roobet Keno）
   - 80 號選 1–10 個、開 20 號、依命中數賠付表。純前端 + `HL.fair` 可重算。
   - **對標來源**：Roobet/Stake Keno。**工作量 S–M**。
4. **新 Original：Coinflip**（對標 Roobet Coinflip）
   - 最輕量：50/50（含莊家優勢）翻幣、可連勝累乘。掛 `HL.instant` + `HL.fair`。
   - **對標來源**：Roobet Coinflip。**工作量 S**。
5. **Rakeback 回訪節奏升級：日 / 週分桶 + 逾期作廢**（對標 Roowards 分層）
   - 在現有 `HL.rakeback` 上加「每日可領桶（24h 逾期作廢）」催促每日回訪，沿用 #17 Lucky Spin 的 daily gate 模式。
   - **對標來源**：Roowards Instant/Daily/Weekly。**工作量 S–M**。

---

## 來源
- https://roobet.com/
- https://worldpokerdeals.com/online-casinos/roobet-casino-review
- https://www.bitdegree.org/crypto/roobet-review
- https://cryptocasinos.com/reviews/roobet

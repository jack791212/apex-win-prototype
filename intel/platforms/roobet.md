# Roobet — 調研檔

- **平台**：Roobet ｜ url: https://roobet.com
- **調研日期**：2026-06-26（初）／2026-07-10（刷新，見文末附錄）
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

## 附錄：2026-07-10 刷新（T2 每 14 天到期）

本輪深挖出**兩個進展**（自 06-26 起）：

### 1. Roowards 新增「Vault 金庫」— 每日可領 3 次的額外獎勵（🆕 唯一淨新機制）
Roowards 現含 Instant / Daily / Weekly / Monthly **＋ Vault**：Vault 讓玩家**每日最多領 3 次**額外獎勵。這是與 ApexWin 既有領取節奏**不同粒度**的新軸線：
- ApexWin 現況：#22 rakeback＝**每日一桶**（24h 逾期作廢）、#24 Reload＝日/週/月**各一次**、#33 Cashback＝**每週桶**——**全站無「同一天內可多次領取（intra-day 多槽）」的節奏**。
- **可學維度＝「每日 N 槽」領取節奏**：把某個獎勵池切成一天 3 個時段槽（各自 gate、領完等下一槽），比「每日一次」更催高頻回訪、且與 #35 Happy Hour（固定時段加成）天然相鄰（可共用時段骨架）。
- 工作量 **S–M**（複用 #22 日桶的 accrue/claim/逾期骨架，把單槽改為 dayNum×slotIndex 三槽 gate；純前端零牌照）。**建議 evolve 評估開卡**（與 #22/#24 相鄰、屬節奏擴充非新管道）。

### 2. Originals 陣容更新 — 補回缺口進度
2026 Originals 清單：Crash、Mines、**Towers**、Plinko、Dice、**CoinFlip**、**Mission Uncrossable**、Roulette、**Keno**、**Snoops HotBox**。對照 ApexWin 進度：
- ✅ 已補：Crash/Mines/Plinko/Dice（原生）、**Towers（#23 done）**、**Keno（#32 done）**、Roulette（#7b done）。
- ❌ 仍缺（純前端可做、皆可掛 `HL.instant`+`HL.fair`）：
  - **Coinflip**——最輕量（S），已列 BACKLOG 候補（Toshi 來源）；Roobet 再添一筆共識，**建議升為下輪優先候補**。
  - **Mission Uncrossable**（過馬路式 crash 變體，逐步前進、隨時兌現、踩雷歸零）——機制近 Crash+Towers 混血，**M**，ApexWin 未碰的 crash 變體，尚未開卡。
  - **Snoops HotBox**——疑涉品牌授權（Snoop Dogg IP）＝**avoid**，僅記錄不推進。

其餘（Instant/Daily/Weekly/Monthly 分桶、每週 $100k 抽獎、Live RTP 冷熱標籤）皆已被 #22/#24/#33/#18/#21 涵蓋或落地，無淨新缺口。金流（crypto 真金/快速出金）＝avoid。

> 結論：本輪淨新 = **Vault 每日多槽領取節奏（S–M，建議 evolve 評估）** + **Coinflip 升優先候補 / Mission Uncrossable 新 crash 變體缺口**。下次到期 2026-07-24。

---

## 來源
- https://bonusriver.com/casino/roobet-review (2026-07 刷新)
- https://www.igamingtoday.com/casino/roobet/ (2026-07 刷新)
- https://roobet.com/
- https://worldpokerdeals.com/online-casinos/roobet-casino-review
- https://www.bitdegree.org/crypto/roobet-review
- https://cryptocasinos.com/reviews/roobet

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

---

## 2026-07-28 刷新（re-investigate · 逾 07-24 到期）

- **reconfirm 四桶返水**：**Instant**（押注比例、每 **30 分鐘**可領）／**Daily**（累積至 **72h**、每 24h 領一次）／**Weekly**／**Monthly**（各一次）。全部**無流水綁定**。
- **reconfirm rewards vault 獎勵保管庫**：部分返水進入獨立 vault，**保留至 14 天**、**每日最多 3 次領取**。→ 即 07-10 已記的「**Vault 每日多槽領取節奏**（S–M 候補）」，**非新缺口**，續留候補（ApexWin 全站仍無 intra-day 多槽領取節奏）。
- **VIP**：邀請制，含專屬客戶經理、加成返水、專屬錦標賽、IRL 活動、個人化獎勵，以及 **Loss Back 損失回饋**（eligible losses 退還）。→ **已被 2026-07-28 落地的 #48 `HL.safetynet`（限時窗口淨損自動退還）+ #33 cashback（每週桶）覆蓋**，無淨新。
- **淨新訊號＝rakeback 等級為「30 級制」且升級因子是成本導向的複合條件**：等級不只看累計押注，而是由 **押注活動 + 存/提頻率 + win/loss 戰績 + 遊戲選擇（game choices）** 共同決定可領比例。
  - **＝依「玩家對莊家的實際成本貢獻」計權**，而非平權流水。
  - **與 BC.Game 2026『BC Engine』(07-27 深挖：XP 改依每局實際成本/house edge 計權) 形成兩平台共識** → ApexWin `live-stats.js` 現行 `HL.vip.addWager(bet)` 的**平權流水記點**（每 $1 押注等值、不分遊戲 RTP）自「單平台觀察到的精進點」**升級為跨平台共識缺口**。
  - **ApexWin 落地角度**：結算時已同時知道 `game` 與 `bet`（中央點 `HL.liveStats.record`），只需一張「每遊戲 edge 係數」config 表即可把 VIP/賽季/成就的進度改為成本加權；不填係數即退回平權（零回歸）。→ **本輪開卡 #50**（M，純前端）。
- Originals 缺口進度不變：**Coinflip**（S，多平台共識候補）、**Mission Uncrossable**（M，crash 變體）仍未做；Snoops HotBox = 品牌授權 avoid。

> **本輪結論**：淨新 = **成本加權 VIP/XP 進度（兩平台共識 → 開卡 #50）**；Vault 多槽節奏續為候補、Loss Back 已由 #48 覆蓋。下次到期 2026-08-11。

### 本輪來源
- [Roobet Review 2026: Features, Rewards & Availability（BitDegree）](https://www.bitdegree.org/crypto/roobet-review)
- [Roobet Rakeback Guide 2026（CompleteSports）](https://www.completesports.com/reviews/roobet/rakeback/)
- [Roobet VIP Club Membership Explained 2026（GameChampions）](https://www.gamechampions.com/en/reviews/roobet/rewards/)
- [Roobet Review 2026（OddsPortal）](https://www.oddsportal.com/reviews/roobet/)
- [Roobet Casino Review 2026（CryptoCashSpin）](https://cryptocashspin.com/roobet-casino-review/)

---

## 2026-08-11 刷新（平台軌 08:00 窗｜tier-2、`next_due` 08-11 到期）

**淨新缺口 ≈ 0：本輪逐項查證，四個看似新的訊號有三個經 grep 證實早已覆蓋，據實記低增量、不硬湊卡。**

- **RakeBoost（"Rewards 2.0 & RakeBoost" 主打）**：實查定義＝「**限時**提高 rakeback 百分比，可持續 1 小時至一天以上」；新玩家 10% / 24h，完成 Level 2 驗證後 20% / 72h。
  - ⇒ 這**正是 ApexWin `core/rakeboost.js` 已經在做的事**（窗口 + 百分比 + 站別 CAP），而「新手註冊後一段時間」就是既有 `newcomer` 種子。**#81（08-10 落地）的 `registerTriggered` 容器連「驗證完成後再開一段窗」都已是加一行**。⇒ **零增量、不開卡**。
- **$100,000 每週抽獎**：實查＝**依押注量發抽獎券**（每 $1,000 押注 1 券，另有來源記 $250/券），**發給 100 位玩家**。
  - ⇒ `core/raffle.js` **同形制且更完整**：`TICKET_PER = 2000`（每 NT$2,000 押注 1 券）、`WINNERS`、`prizeFor(rank)`、券數/中獎機率面板、開獎後券重置。**連「依名次分池」都一樣** ⇒ **零增量**。
  - ⚠️ 同時**再次確認它不是 #83 的佐證**（100 位依名次分，非所有達標者均分）。
- **Rewards 2.0 四桶（即時每 30 分／日累積至 72h／週六釋出／月初釋出）+ Vault 7 天/14 天日曆**：四桶節奏與 `core/rakeback.js` 的累積+領取路徑重疊；**唯一仍未覆蓋的是「獎勵被切成多日日曆、每片各自到期、未領即作廢」**。
  - ⚠️ **這是本站第三次被記下同一件事**（07-10 首記「Vault 每日多槽領取節奏」候補、07-28 複記、本輪三記）＝08-06 記載的「**處置管道沒有帳可查**」家族。依 08-10 對 #82 的先例（三次審計未認領的 `stowable_note` 升格為卡），**本輪不再只記候補**，但因 `max_cards_per_run` 已被 #85/#86 佔滿而**只寫進台帳 `stowable_note` 並在此明載下輪應開卡**——避免第四次蒸發。
  - 附帶觀察（值得後續注意的**反向**經濟性質）：這機制是**成本下修**而非上修（未領即作廢＝房家留下），與 #83 的「固定池均分」同屬「送幣模組的成本上蓋」家族。
- **31 級 rank + 成本加權（押注量/存提頻率/戰績/遊戲選擇共同決定）**：已由 **#50 `HL.edge`**（07-31 落地）覆蓋；本輪僅複驗描述未變。
- **Loss Back**：續由 #48 `safetynet` + #33 cashback 覆蓋。Originals 缺口（Coinflip S／Mission Uncrossable M）狀態不變。

> **本輪結論**：**增量歸零（第 1/2 次）**——四項訊號三項已覆蓋、一項（Vault 多日到期日曆）為三度重記且已升格待開卡。記 `saturation_watch: 1/2`；tier-2，若 08-25 複驗仍零增量即達 `saturated` 判準。下次到期 2026-08-25。

### 本輪來源
- [Roobet Rewards Explained — Rakeback, Vault, Daily/Weekly/Monthly Bonuses & Rakeboosts](https://www.roobetcasinorewards.com/roobet-rewards)
- [Roobet Promo Code LIMIT (2026) – Rewards 2.0 & RakeBoost（VGOPromo）](https://www.vgopromo.com/roobet-promo-code/)
- [Roobet Promo Code 2026: Weekly Raffle（CoinGape）](https://coingape.com/roobet-promo-codes/)
- [Roobet Rewards Program（Strafe）](https://www.strafe.com/esports-betting/reviews/roobet/rewards/)
- [Roobet Review 2026（BitDegree）](https://www.bitdegree.org/crypto/roobet-review)


---

## 2026-08-25 刷新（平台軌 08:00 窗 · 逾 08-25 到期）— **watch 2/2 ⇒ `saturated`**

**結論**：**缺口層面連二輪零增量**，達 tier-2 的 `2/2` 判準 ⇒ `status: done → saturated`（仍留庫、依 `refresh_interval_days` 低頻複驗；出現新機制即降回 `done`）。

**但規格層面不是零**，這是本輪唯一值得記的東西：

### ⭐ Vault 的形狀跟我們前三輪寫下的不一樣（已回寫 #87）

| | 07-10／07-28／08-11 三輪的記載 | 2026-08-25 實查 |
|---|---|---|
| 拆法 | 「獎勵切成 7/14 天**日曆**、每片各自到期」 | **每一次 Instant Rakeback 領取時當場對半拆**：50% 立即入下注餘額、50% 進 Rakeback Vault |
| 解鎖節奏 | （未記） | Vault **每 8 小時解鎖一次、一天三次** |
| 逐片到期 | 「未領即作廢」 | **每片解鎖後 24 小時內未領即作廢** |
| 保管上限 | 7/14 天 | **14 天** |

⇒ 兩者**目的不同**：日曆型是「每天回來看一次」；50/50 型是把**每一次領取行為本身**變成下一次回訪的鉤（你領的當下就有一半被押後）。
**照舊敘述做會做出錯的形狀**——#87 若按「日曆」實作，玩家不會有那個「領一半」的張力。已把上表整段抄進 #87 卡體。
⇒ 記進取材通則：**同一個機制被記三輪，不代表記對了**；`saturation_watch` 量的是「有沒有新缺口」，不是「既有記載有沒有失真」——**達 saturated 的那一輪反而是最該把既有記載逐項對一次的時候**（因為之後就低頻了）。

### 其餘複驗（全數已覆蓋、零增量）
- RakeBoost 限時提高 rakeback ＝ `core/rakeboost.js` 既有形制、#81 `registerTriggered` 已容器化。
- $100,000 每週抽獎（依押注量發券、依名次分池）＝ `core/raffle.js` 同形制且更完整。
- 31/30 級成本加權 rank（押注量＋存提頻率＋戰績＋遊戲選擇）＝ #50 `HL.edge` 已落地。
- Loss Back 損失回饋 ＝ #48 safetynet + #33 cashback。
- **新增一筆版本事件（非缺口）**：Roobet 已改版忠誠制度，舊點數全數轉入新階梯、最低階獎勵優於舊制。

### 本輪來源
- [Roobet Rewards Program（Strafe）](https://www.strafe.com/esports-betting/reviews/roobet/rewards/)
- [Roobet Review 2026: Features, Rewards, & Availability（BitDegree）](https://www.bitdegree.org/crypto/roobet-review)
- [Roobet Bonuses 2026（TheSpike.gg）](https://www.thespike.gg/reviews/roobet/bonus)
- [Roobet Promo Code 2026（CoinGape）](https://coingape.com/roobet-promo-codes/)
- [Roobet VIP Program Explained 2026（TheGameday）](https://thegameday.com/en/reviews/roobet/vip/)

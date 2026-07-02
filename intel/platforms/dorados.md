# Dorados — 調研檔

- **平台**：Dorados（Rafflefy Limited）
- **url**：https://dorados.com
- **調研日期**：2026-07-02（首次）
- **tier / regions**：T3 · northamerica, global
- **定位**：2026-03 上線的 sweepstakes 社交賭場（3,000+ 遊戲），主打「探險/養成」風格的遊戲化獎勵生態。純前端社交模式（GC 娛樂 + Gems 可兌獎），無真金；部分州禁＝定位貼合、只取玩法與 UX。

---

## 特色表（聚焦純前端可學）

### ⭐ 招牌一：三幣經濟（GC + Gems + Elixir）
- **GC（Gold Coins）**：娛樂幣。**Gems**：等同 SC、可兌獎。**Elixir**：第三幣，**專供 meta 玩法/消耗**（不是拿來玩一般 slot 的）。
- 註冊禮：20,000 GC + 2 Free Gems + 2 Elixirs（無需 promo code）。
- ＝在雙幣（娛樂/可兌）之上，多疊一層**功能型/消耗型貨幣**驅動養成玩法。

### ⭐ 招牌二：Lost City 持久 PvP 養成 meta 層
- 「Lost City of Dorados」是一個**獨立於賭場核心**的多層 minigame 生態：
  - 玩 **Dorados slot minigame**（用 Elixir 轉）→賺 **Coins**（meta 專用資源）。
  - slot 落 **3 個 Axe（斧）符號** → 可 **raid 其他玩家的城市搶奪 Coins**（Attacks/Thief 機制）。
  - 把 Coins 投入**分層 Upgrades（重建 Lost City：修神廟/建設…）**，每完成一層**解鎖里程碑 SC/Gem 獎勵**。
- ＝賭場之上一層「離線也累積、可 PvP 互搶、階梯升級」的資源養成層。**與昨日雷達收編的 BigPirate（島戰 Adventure Mode）形成雙平台強共識。**

### ⭐ 招牌三：Reward Market 點數商城（消耗端經濟閉環）
- 用 **Elixir** 到 **Reward Market** 兌換：Claw Machine 代幣、指定遊戲 free spins、**Raid tokens**、**Shields（防被搶）**等。
- ＝「賺資源 → 逛商城 → 花掉換獎勵/道具」的完整消耗閉環。**與 Chancer「Bonus Shop 點數商城」共識。**

### 週期事件 / 促銷
- **Lost City Challenges**：每日/每週的 in-game 任務。
- **Monthly Race**：頂尖玩家分 2,500 Gem 獎池。
- **Wheel of Gold**：累玩 100,000 GC 後轉輪拿 free spins。
- **Daily Login Bonus**：每日 1 個 free Elixir（驅動回訪去玩 meta 層）。
- 首購 150% 加值：250,000 GC + 25 Gems + 1 Elixir + 1 Claw Machine 代幣（$9.99）。

### 金流 / 模式（avoid，只記錄）
- sweepstakes GC/Gems 模式、Gems 可兌獎、部分州禁＝法規層 avoid。

---

## ApexWin 對照

| 維度 | Dorados | ApexWin 現況 |
|---|---|---|
| 持久養成 meta 層（跨場、離線累積） | ✅ **Lost City 重建升級** | ❌ 完全空白（VIP/任務/連登/Reload 全在賭場**之內**）|
| PvP 互搶資源 | ✅ **raid 別人城市搶 Coins（Axe/Shield 攻防）** | ⚠️ 僅 #30 PvP Dice Duel（1v1 對局），**無「搶對方累積資源」的非對稱 PvP** |
| 消耗型貨幣 + 點數商城 | ✅ **Elixir → Reward Market 換道具/spins** | ❌ 一堆「發錢進 `HL.bonus`」的賺取端，**完全無消耗端 + 商品目錄**（與 Chancer 共識）|
| 多幣分層 | ✅ GC + Gems + Elixir | ⚠️ 只有 `HL.money` + `HL.bonus`（現金/紅利兩層），無功能型第三幣 |
| 月度積分賽 | ✅ Monthly Race（Gem 池） | ⚠️ #15 錦標賽（限時 Slot Race）為近親，可延展成月度常設 |
| 累玩解鎖轉輪 | ✅ Wheel of Gold（100k GC 門檻） | ⚠️ #17 Lucky Spin（每日閘）為近親，缺「累積押注門檻解鎖」 |
| 每日登入給消耗幣 | ✅ 每日 1 Elixir | ⚠️ #17 每日轉盤/簽到給現金，非「餵養 meta 層的資源」 |

**最關鍵缺口（兩個全新、未被既有卡涵蓋）**：
1. **賭場之上的持久養成 meta 層 + 非對稱 PvP raid**——ApexWin 完全空白的全新軸線，且**已成 BigPirate + Dorados 雙平台共識**。
2. **消耗型貨幣 + Reward Market 點數商城**——補齊「賺→逛→換」經濟閉環（與 Chancer Bonus Shop 共識），ApexWin 目前只有賺取端。

---

## 可落地點子（pure-frontend）

1. **持久養成 meta 層「基地/城市重建」+ 資源累積（島戰 meta 卡的核心）** — 對標 Dorados Lost City + BigPirate Adventure Mode。
   - 玩任一遊戲的有效押注（中央掛鉤 `HL.liveStats.record`）→累積一種 meta 專用資源（如「金磚」）；資源投入**分層 Upgrades**（3–5 層建設），每完成一層解鎖里程碑獎入 `HL.bonus`。資源**離線也保留**（localStorage），登入即見進度。
   - 加速器：複用 `HL.liveStats` 累資源 + `HL.bonus` 派里程碑獎 + #24 modal 骨架；新增 `core/meta.js`（暫名 HL.base）+ 一個 meta 頁/面板。工作量 **M–L**（是全新軸線，建議 evolve 拆成「基地養成」與「PvP raid」兩張卡分批）。

2. **Reward Market 點數商城（消耗端閉環）** — 對標 Dorados Reward Market + Chancer Bonus Shop。
   - 新增一種可累積「點數」（複用既有 XP/押注累積或 meta 資源），開一個**商品目錄 modal**：花點數換 free spins / Lucky Spin 次數 / 臨時 boost / 頭像框等純前端獎勵；VIP 越高折扣越好。
   - 加速器：複用 `HL.liveStats` 累點 + `HL.bonus` 兌換派發 + #24 modal 骨架。**與既有多個「發錢」機制天然互補**（給它們一個花費出口）。工作量 **M**。

3. **非對稱 PvP raid（搶對方累積資源）** — 對標 Dorados Axe raid / BigPirate 島戰。
   - 觸發（如落特定符號或 meta 事件）→可對「對手（複用 #15 leaderboard bot 池）」發動 raid 搶一定比例其展示資源；設 **Shield 道具**（在點數商城買）可防守。純 mock、無真實他人資料，狀態全 localStorage。
   - 加速器：複用 bot 命名/頭像池 + `HL.fair` 決定 raid 成敗（透明）。工作量 **M**。**建議接在點子 1 的基地系統之後做（依賴其資源層）。**

4. **（佐證既有近親，不新開）月度常設積分賽**：Dorados Monthly Race 可作為 #15 錦標賽延展為「月度榜」的佐證；**Wheel of Gold「累玩門檻解鎖轉輪」** 可作為 #17 Lucky Spin 增加「押注門檻解鎖高階轉盤」的佐證。

---

## 來源
- [SweepsKings — Dorados Social Casino Review 2026](https://sweepskings.com/reviews/dorados/)
- [Casino.org — Dorados Casino Review 2026](https://www.casino.org/us/sweepstakes-casinos/dorados/)
- [Next.io — Dorados Casino Review 2026](https://next.io/sweepstakes-casinos-us/dorados/)
- [Covers — Dorados Promo Code 2026](https://www.covers.com/casino/bonuses/dorados-promo-code)
- [GamingToday — Dorados Casino Review](https://www.gamingtoday.com/sweepstakes/dorados-casino/)

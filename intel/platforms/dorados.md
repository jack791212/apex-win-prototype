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

## 2026-08-04 刷新（tier-3 逾期 3 天 · 第二次調研）

### ⭐ 淨新招牌：VIP 階級 = 服務水準協議（SLA）+ 兌獎額度，不只是給錢多寡
| 維度 | Dorados | ApexWin 現況 |
|---|---|---|
| 兌獎/提領**處理速度**隨 VIP 遞減 | ✅ **72h → 42h → 24h**（L1→L5） | ❌ 完全缺（提款為單一固定體驗，VIP 不影響） |
| **每月**兌獎上限隨 VIP 遞增 | ✅ **30,000 → 60,000 Gems** | ❌ 缺（無分階額度概念） |
| 每日兌獎上限 | ⚠️ 全階同為 2,500 Gems（**刻意不分階**） | ❌ 缺 |
| 「兌獎速度」作為對外競爭軸 | ✅ 業界已有專題橫評（sportsgambler「Fastest Redemptions」） | — |

- 五階制與 07-02 記載一致：低階僅 live chat，高階加生日禮 / 專屬購買包 / 免費 Elixir / 專屬 VIP 經理。
- **為何重要**：ApexWin 的 VIP（#1/#50）目前只延伸到「返水率、升級金、經驗加權」＝**全是送錢軸**。
  Dorados 證明 VIP 還能延伸到**服務水準（等多久拿到錢）與額度（一次能領多少）**——這對 ApexWin 特別划算：
  純前端可完整表達（處理中狀態 + 分階額度 + 進度提示），**零牌照、零真金**，且真金上線後這層抽象直接沿用。
- 07-02 已記載的 Lost City meta 層 / Reward Market / Bonus Wheel（100k GC 門檻）/ Claw Machine /
  每日 1 Elixir / Monthly Race（2,500 Gems 池）**全部維持無變更**；遊戲庫成長至 3,000+ 款、45+ 供應商。

### 新增可落地點子
5. **VIP 分階提領 SLA + 分階額度（容器優先）** — 對標 Dorados L1→L5。
   - `wallet` 提款流程加一層「處理中」狀態：依 `HL.vip.status().index` 查一張 `tier → {slaHours, dailyCap, monthlyCap}`
     表決定顯示的預計到帳時間與可提上限；表為 config 化資料（真金上線後換成真 SLA 即可，介面不動）。
   - 加速器：`HL.vip` 已有段位、`wallet` 已有 demo 提款交易流、`HL.ledger` 已記 withdraw。工作量 **S–M**。**已開成 #63。**

---

## 來源
- [SweepsKings — Dorados Social Casino Review 2026](https://sweepskings.com/reviews/dorados/)
- [Covers — Dorados Casino Review 2026（VIP 處理時間 72h→24h、兌獎上限）](https://www.covers.com/casino/reviews/dorados)
- [SportsGambler — Fastest Redemptions: 5 Sweepstakes Sites（兌獎速度為獨立競爭軸）](https://www.sportsgambler.com/sweepstakes-casinos/blog/fastest-redemptions-sweepstakes-sites-came-out-on-top/)
- [Casino.org — Dorados Casino Review 2026](https://www.casino.org/us/sweepstakes-casinos/dorados/)
- [Next.io — Dorados Casino Review 2026](https://next.io/sweepstakes-casinos-us/dorados/)
- [Covers — Dorados Promo Code 2026](https://www.covers.com/casino/bonuses/dorados-promo-code)
- [GamingToday — Dorados Casino Review](https://www.gamingtoday.com/sweepstakes/dorados-casino/)

---

## 2026-09-03（平台軌·08:00 窗 · 第三巡）

**淨新資訊近乎零 ⇒ 已 triage 為 45 天保鮮。**

- 三巡交叉一致（07-02／08-04／09-03）：Lost City（Elixir 驅動的獨立轉輪 → Coins → 分層 Upgrades → 每層解鎖免費 Gem/SC）、Axe×3 觸發玩家間 raid、shield 防守、Reward Market（Elixir 換 free spins／Raid tokens／Shields／claw machine）、三幣經濟（GC／Gems=SC／Elixir）、五階 VIP、Monthly Race。
- **唯一新增細節（值得對照）**：Lost City 的**特殊符號會跨轉輪保留 24 小時** ⇒ 該 meta 層自帶一條**與主遊戲無關的持久化時窗**。這是「賭場之上的養成層」把 session 黏起來的具體手法：玩家為了不浪費那 24 小時的加成而回來，回來的理由**不是**某一局的期望值。
- 口徑校正：遊戲庫 3,000+ → **3,100+（含 100+ live dealer、45+ 供應商）**；上線月份確認為 **2026-03**。
- **ApexWin 對照**：持久 PvP 養成 meta 層仍**完全空白**（與 BigPirate 島戰形成雙平台共識）。ApexWin 已有的最近親是公會 meta 與季票，但兩者都沒有「玩 slot 的結果會改變另一個持久世界的狀態」這條迴路。
- **triage 理由**：連兩巡只回同一批結構 ⇒ 30 天一巡的邊際價值已低於重驗成本（比照遊戲軌 09-02 對候選庫的 shelf 分類紀律）。招牌軸線已完整記入 `db/platforms.json` 該筆，未來輪只需 clock-refresh。

來源：igamingfuture／next.io／covers／casino.org／sweepskings／gamingtoday／fruityslots（2026 年度評測，多榜交叉）。

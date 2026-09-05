# GoKong Casino — 調研檔

- **平台**：GoKong Casino｜ url: https://gokong.com
- **調研日期**：2026-08-06（雷達新進場 + 同輪首次深挖）
- **tier**：3（2026 新站，遊戲化取向）｜**priority**：58｜**confidence**：medium
- **regions**：global / europe / northamerica（評測以 CAD/EUR 計價為主）
- **來源**：cryptonews 2026-08「新 crypto casino」榜（點名其 gamified extras）＋ AskGamblers / casinocanada / clashofslots / slotsjudge 四家評測交叉
- **定位**：**「獎勵系統本身就是一個遊戲」的遊戲化取向新站**。真金/加密投入端＝`CONTROL.avoid`，本檔只取**前端結構**。

---

## 特色表

### ★ 招牌新維度：挑戰「完成量」本身是一層獎勵（meta-mission）
- **40+ 挑戰**，分「每週型」與「一次型」，完成後產出 **Coins**（平台內進度/兌換貨幣）。
- ⭐ **關鍵**：除了每個挑戰各自的獎勵，**每週完成 20 個／40 個挑戰另有額外 Coin 獎**。
  ⇒ 獎勵的不是「你完成了哪個任務」，而是「**你完成了幾個任務**」。
- **ApexWin 對照**：`HL.tasks` 只在「單一任務達成」時 `bump` 並發該任務的獎；**「本週完成 N 個」這個維度完全不存在**
  （`HL.achievements` #45 是「終身里程碑」、`HL.season` #46 是「XP 總量」，都不是**期間內的完成計數**）。
  ⇒ 本輪開卡 **#77**（容器：把「完成計數」做成 `HL.tasks` 的一個可註冊階梯，而非硬寫兩個門檻）。

### Coins 經濟（＝進度貨幣 + 商城）
- **來源三條**：儲值（**C$200 → 1 Coin**、另有 5% 加值）、真錢投注、挑戰完成。
- **出口**：Bonus Shop 兌 free spins／紅利金／free bet（明碼 **90 Coins → C$20**）。
- **ApexWin 對照**：`shop.js` 點數來自 `record(bet)`＝投注衍生；**#65 `HL.progressSrc`（本專案 08-06 14:00 窗落地）已把 deposit/checkin 納為進度來源**
  ⇒ 本站是 **#65 的第五平台佐證**，且「儲值也算進度」與我們落地的兩個新來源**完全對上**（前四：Spree／BigPirate／DoND／CapySpin）。
  ⚠️ 但**不改動 ApexWin 現制**：#65 已把真站非投注來源一律設 `xpPerLive:0`（恆等式在案），本站的 5% 儲值加值正是那條套利路徑的實例。

### VIP：五級 + **依「最近 90 天活動」重算**
- 級別由 **gameplay / 存款 / 提款 / 已領紅利**四項綜合評定，**評估窗＝最近 90 天** ⇒ 停下來就會掉級。
- **L3/L4/L5 才有 cashback（5% / 10% / 15%）**；L5 提款 **日限 €1,500、月限 €20,000**。
- **ApexWin 對照**：
  - **滾動窗評級 ⇒ #59「近 30 天活躍光環」第三平台佐證**。前兩筆：Punkz（XP 6 週過期、每週重算**會掉階**）／反例 Stake（**終身累計永不重置**）。GoKong 落在 Punkz 一派 ⇒ **不開重複卡**，寫進 #59 並上調優先序；#59 原設計（核心等級不倒退、只讓額外光環層衰減）**仍是兩派交集**，維持。
  - **cashback 只有 L3+ 才有 ⇒ #73「進度解鎖內容而非只解鎖錢」第三平台佐證**（前有 DoND、Jackpotter）。
  - **分階提款額度 ⇒ #63 `HL.sla` 再驗**（已落地，日/週/月三期額度軸）。

### Bonus Crab：爪機式揭曉
- 虛擬爪機，抓到不同物件對應紅利/現金/free spins/Coins。
- **ApexWin 對照**：`core/reveal.js`（#38）＋ #66 里程碑揭曉層已在位、`luckyspin` 也在位
  ⇒ **併入本輪 #76**（把「固定值直接入帳」的每日獎改成**等期望值的揭曉**），不另開卡。

---

## ApexWin 對照總表

| 它有 | ApexWin 已有 | ApexWin 缺口 |
|---|---|---|
| 40+ 挑戰 + **完成量階梯**（週 20／40 個） | `HL.tasks` 每日/每週任務 + 中央掛鉤 `bump` | ⭐ **期間內「完成計數」維度完全不存在** → **#77** |
| Coins 來自儲值/投注/挑戰 | #65 `HL.progressSrc` 註冊表（wager/deposit/checkin） | 無（本站為第五平台佐證，且真站恆等式刻意封住儲值路徑） |
| VIP 依最近 90 天重算、會掉級 | VIP 終身累計不重置 + 賽季另計 | #59 已在佇列（第三平台佐證，優先序上調） |
| cashback 僅 L3+ | #33 cashback（全段位） | #73 已在佇列（第三平台佐證） |
| L5 日/月提款額度 | #63 `HL.sla` 日/週/月三期額度 | 無 |
| Bonus Crab 爪機揭曉 | #38 `HL.reveal` + #66 + `luckyspin` | 併入 **#76**（每日獎揭曉化） |

## 純前端可落地點子（附工作量）
1. **完成量階梯**（`HL.tasks` 加一個可註冊的「本期完成 N 個」階梯，資料驅動、不硬寫門檻）— **S–M** → 已開 **#77**
2. **每日獎揭曉化（等期望值）**（把 `rewards.js` 固定日獎改成走 `HL.reveal`／`luckyspin` 呈現，**期望值恆等**）— **S** → 已開 **#76**
3. 儲值加值率（5%）＝**刻意不做**：真站 XP 恆等式（#65）與 §11 收斂方向明確排除。
4. VIP 評估窗滾動化 — 已在 **#59**，本輪只上調優先序、不重複開卡。

---

## 🔄 2026-09-05 複查刷新（平台軌 20:00 窗｜到期當日｜台帳輪替＝**前端UI/UX**）

⚠️ **取材限制照實記在最前面**：`WebFetch` 對 clashofslots **403**；本輪**唯一直取成功**的來源是 **casinolandia（HTTP 200）**，其餘（tribuna／casinomentor／online.casino／casinocanada／bonkku／emstructural／araichelle）皆為 **WebSearch 二手摘要**。下面每一條都標了來源強度；**未親眼看到的畫面細節一律不臆造**。

### ⭐ 本輪三筆新事實 —— 三筆都剛好壓在「前端 UI/UX」這一輪

1. **遊戲庫規模 30,000+ 款，且分群軸明載四條**（直取 casinolandia）：
   「slots by **return-to-player rates, volatility levels, themes, and features**」。
   - **ApexWin 對照**：台帳「大廳分群軸（節奏／波動／RTP 型）Playstyle Filters」判 **partial** —— 本站是它的**外部形制佐證**（不是新缺口）。
     我方 RTP 軸的阻塞事實已在案（各遊戲 RTP 只以顯示字串存在、#94/#98 家族），**本輪不重新發現、也不重複開卡**。

2. **搜尋列同時命中遊戲／供應商／分類**（二手，評測逐字『more advanced than most online casino sites』；casinolandia 側佐證「filtering capabilities」）。
   - **ApexWin 對照**：台帳「搜尋與發現（搜尋詞彙 × 零結果出口 × 最近搜尋）」判 **partial ⇒ 已開卡 #163**。本站列為 #163 的又一外部佐證，**不開新卡**。

3. ⭐ **「玩家自訂（Player Customization）」被評測當成一個獨立段落來寫，內容＝11 種語言 ＋ 幣別選項**（直取 casinolandia：
   「accommodates diverse user preferences through **multiple supported languages and currency options**」，語言逐一列出 Canadian English／Canadian French／Czech／Finnish／Hungarian／Italian／Norwegian／Polish／Portuguese／Slovak／Slovenian）。
   - ⭐ **這一條是本輪的取材價值所在**：它把「語言」與「顯示幣別」**並列為帳戶層的玩家偏好**。
     而我方的**顯示幣別（`HL.gset.fiatView`）只能從遊戲外框的 ⚙ 齒輪改**——玩家在大廳想換金額顯示幣別，得先進一款遊戲。
   - ⇒ 本輪據此**新開取材維度 13「玩家偏好的安放處」**（`db/sourcing-methods.md`），並開卡 **#171**。
     維度 13 的第一個外部形制是 **Stake 的站層 `/settings/preferences` 專頁**（本地幣別顯示就設在那裡、支援 25 種法幣），GoKong 是第二個。

### 手機導覽：同一站兩說並存（**記為待證、不採信任一方**）

- 正面（多份二手）：一鍵導覽 + 有效篩選、慢速行動網路下載入仍快。
- 反面（另一份二手）：『interface navigation could be **refined** for mobile users』。
- ⇒ 兩說皆二手且互相矛盾 ⇒ **本檔不下結論**，也不拿它當我方任何判斷的依據。

### 前次（2026-08-06）三筆結論的複驗

| 08-06 結論 | 2026-09-05 複驗 |
|---|---|
| 挑戰**完成量**本身是一層獎勵（每週完成 20／40 個另有 Coin 獎）⇒ 開卡 #77 | ✅ 仍成立（評測續載 challenges/missions 生態 + casino shop 兌換），**#77 仍在佇列** |
| VIP 依**最近 90 天活動**重算 ⇒ #59 第三平台佐證 | ✅ 仍成立（本輪二手續載分層權益：exclusive bonuses／cashback／casino shop 特獎） |
| Coins 來源含**存款**（C$200→1 Coin）⇒ #65 `HL.progressSrc` 第五平台佐證 | ✅ 仍成立，**不改動我方現制**（#65 已把真站非投注來源設 `xpPerLive: 0`） |

### 本輪處置

- **無淨新卡自本站的既有維度生出**；唯一的新缺口（偏好的安放處）已寫進 **#171**，並補上維度 13。
- 回填：`last_investigated` 2026-08-06 → **2026-09-05**、`next_due` → **2026-10-05**、`last_verified` → 2026-09-05。

# Punkz（CasinoPunkz）— 調研檔

- **平台**：Punkz / CasinoPunkz
- **url**：https://punkz.com（亦見 casinopunkz.io）
- **調研日期**：2026-06-29（首次）
- **tier / regions**：T3 · global, europe
- **定位**：2024 上線的 no-KYC crypto casino（5,000+ 遊戲），punk 視覺主題，鎖定 Gen-Z／trading 客群。匿名/真金/€20,000 welcome＝avoid，**只取遊戲化與純前端 UX**。

---

## 特色表（聚焦純前端可學）

### ⭐ 招牌一：Loot Box 寶箱（XP 解鎖、分層、每日多開）
- 以**遊玩賺 XP** 解鎖寶箱：**Daily Box 20 XP / Silver Box 200 XP / Punkz's Heart Box 7,000 XP**。
- XP 計算：**每 €1 有效押注 = 10 × house edge** 的點數。
- **每日最多開 3 個**寶箱；箱內隨機掉落（現金、free spins、XP boost、其他 bonus）。
- ＝把「累積押注 → 解鎖 → 開箱揭曉」做成分層、可重複的每日儀式。

### ⭐ 招牌二：鏈上 RNG 種子「即時可視化解出」
- gamified UI 把 on-chain 資料原生視覺化，玩家可**即時看著 provably-fair 的 RNG 種子被解出**（watch the seed resolve），Aviator 等遊戲可逐回合用 hash 驗證未被竄改。
- ＝把「事後開驗證器」升級為「下注當下的視覺揭露時刻」＝純前端 provably-fair 呈現創新。

### XP 忠誠階梯（逾期作廢）
- Premium Club 6 級 VIP，**完全以 XP 計**；**6 週內需累積 ≥80,000 XP 才解任何獎勵，XP 每 6 週重置**（不活躍就掉段）＝滾動視窗衰減式留存。
- slots $1=10 XP、live/table 較少、**provably-fair 遊戲給 0 XP**（引導玩高 edge 遊戲）。
- 各級 perks：rakeback、cashback（每週四 13:00 UTC 派）、高階解週 reload（每週三 15:00 UTC 派）。

### 週期事件 / 任務
- **每日/每週/每月任務**（跨不同遊戲的 objectives）→ 完成領 bonus funds / free spins / XP。
- **週末限定**：週六 free bet（依上週活躍度）、Weekend Spins（週四–週六玩 slot 給獎）＝時間窗口型循環。
- 週排行榜：玩任一 slot 拚最大倍數，top 10 分 $500 池。

### 註冊 / UX
- 10 秒註冊、復古 punk 視覺、沉浸式互動。

### 金流 / 模式（avoid，只記錄）
- no-KYC 匿名、crypto 真金、€20,000 welcome、provably-fair 真金＝法規/牌照層 avoid。

---

## ApexWin 對照

| 維度 | Punkz | ApexWin 現況 |
|---|---|---|
| 隨機獎勵容器 | ✅ **Loot Box（XP 解鎖、3 層、每日多開）** | ⚠️ #17 Lucky Spin（每日 1 次轉盤）為近親，但**無 XP 解鎖／分層／每日多開／開箱儀式**＝缺口 |
| Provably-fair 呈現 | ✅ **下注當下即時看種子解出** | ⚠️ #16 `HL.fair` 已可逐注重算，但為**事後驗證器 modal**，缺「當下動畫揭露」|
| 衰減式 VIP（滾動視窗 + XP 逾期） | ✅ 6 週 80k XP、過期重置 | ❌（#6/#31 VIP 只升不降；與 WOW Vegas Star System 同維度缺口，**本輪再獲佐證**）|
| 多倍數目標任務 | ✅ 拚最大倍數排行 | ⚠️ 已開卡 #26 多倍數目標型挑戰（覆蓋）|
| 時間窗口循環事件 | ✅ 週末 free bet / Weekend Spins | ⚠️ 與既浮現的「時間窗口型限時 boost」同維度（WOW Happy Hour / Toshi Boost）|
| 週期 reload / cashback 固定派發日 | ✅ 週三 reload／週四 cashback | ⚠️ 已開卡 #24 VIP 週期 Reload（覆蓋）|

**最關鍵缺口（兩個全新、未被既有卡涵蓋）**：
1. **Loot Box 寶箱系統**——XP 解鎖、分層、每日多開的「開箱揭曉」儀式，是與 Lucky Spin 不同的隨機獎勵維度（綁押注進度而非純每日閘）。
2. **Provably-fair 即時種子揭露動畫**——把已有的 `HL.fair` 從「事後驗證器」升級成「下注當下的視覺時刻」，純前端、複用既有引擎、差異化賣點。

---

## 可落地點子（pure-frontend）

1. **Loot Box 寶箱系統（XP 解鎖、分層、每日多開）** — 對標 Punkz Daily/Silver/Heart Box。
   - 用既有押注累積（`HL.vip.addWager` / `HL.liveStats.record`）換算「今日 XP」，達門檻解鎖對應層寶箱（如 小/中/大三層），**每日上限 N 個**；開箱隨機掉落入 `HL.bonus`（現金/免費轉券/XP boost）。開箱動畫＋掉落揭曉。
   - 加速器：複用 #17 Lucky Spin 的隨機派發 + daily-gate + `HL.bonus.add`；XP 來源直接接中央掛鉤。與 Lucky Spin 差異＝綁押注進度解鎖 + 分層 + 每日多開。新增 `core/lootbox.js`、底部列入口。工作量 **M**。

2. **Provably-fair 即時種子揭露動畫（升級 #16）** — 對標 Punkz「watch the seed resolve」。
   - 在下注結算當下，於 GameFrame 角落彈出迷你動畫：顯示 serverSeed hash → clientSeed:nonce → HMAC 逐位元「解出」→ 對到本局結果，並提供「一鍵展開完整驗證」連到既有 `HL.fair` 驗證器。
   - 加速器：`HL.fair` 已能逐注重算（資料齊），純粹加一層 UI 揭露。純前端零牌照。工作量 **S–M**。

3. **（佐證既有缺口，不新開）滾動視窗衰減 VIP**：Punkz「6 週 80k XP、過期重置」再次佐證 WOW Vegas Star System 浮現的「只升不降 vs 滾動衰減」根本性差異——建議 evolve 時把此維度正式成卡（與 #31 VIP 微等級可相乘：微等級給推進感、衰減給「不玩會掉」的回訪壓力）。

---

## 來源
- [Bitcoin.com — Punkz Review 2026](https://www.bitcoin.com/gambling/reviews/punkz/)
- [BanklessTimes — CasinoPunkz Review 2026](https://www.banklesstimes.com/crypto-gambling/casinopunkz-review/)
- [CryptoCashSpin — Punkz Bonuses, Weekly Cashback & Crypto Games](https://cryptocashspin.com/punkz-casino-review/)
- [Money-Mentor — CasinoPunkz 100% Welcome Bonus Review](https://www.money-mentor.org/casinopunkz-casino-review/)
- [Sportsgambler — Punkz Promo Code 2026](https://www.sportsgambler.com/review/punkz/promo-code/)

---

## 2026-08-05 刷新（第 2 次調研 · tier-3 逾期 7 天＝當時最久逾期群之首）

首查（06-29）已記到「XP 升等忠誠階梯（XP 6 週過期＝逾期作廢式留存）」，但**沒有數值、也沒有機制細節**。本輪補齊：

### ⭐ VIP 數值表（首次取得）
| 階級 | 累積 XP 門檻 | Cashback |
|---|---|---|
| Rookie | 0 | 0% |
| Riser | 12,000 | 5% |
| Outlaw | 24,000 | 7.5% |
| Hotshot | 1,000,000 | 10% |
| Maverick | 4,000,000 | 12.5% |
| **Apex** | 8,000,000 | 15% |

### ⭐ 結構性事實一：XP 依「遊戲區塊」分級累積
- **slots：$1 = 10 XP**
- **live casino / table games / sports：$1 = 1 XP**
- **provably-fair 遊戲：一律 0 XP（完全不計）**

⇒ 這是「**對莊家成本低的遊戲不給進度**」做到極端的版本。ApexWin **#50 `HL.edge` 成本加權進度**（22 款 edge 係數 → 只加權 VIP/賽季經驗）**方向完全一致**，且我們的做法更細（逐遊戲係數 vs 它的三檔粗分），但它更易懂。**⇒ 外部佐證成立，無淨新缺口**；順帶注意：它把 PF 遊戲設為 0 是因為 PF originals 莊優極低（~1%），與我們 edge 係數把低莊優遊戲降權同源。

### ⭐ 結構性事實二：XP 6 週過期 + 每週重算段位 ⇒ **段位會下降**
- XP **收集後 6 週失效**；平台**每週重新計算**玩家 status。
- 明確**非 rolling**（不是「達標即永久保有」）——不維持活躍就會掉階。

⇒ **#59「近 30 天活躍度光環層（滾動視窗）」的第三家共識**（前有 WOW Vegas 星星 30 天過期；本站首查已記過過期、本輪補上「每週重算、rank 可掉」）。#59 開卡於 07-31 仍 🟦待做，**本輪據此提升其優先序並在卡內補共識與具體形狀**。

### 促銷發放節奏（本輪新增觀察）
- **15% 週 cashback：固定每週四 13:00 UTC 發放**，依前一週淨損計、發放後**零流水可直接提**。
- 每日 rakeback 上限 **$2,000**。
- **月度 wager boost：固定每月 1 日發放**。
- 週末 free spins；**loot box 最多 3 個**、獎品品質隨 VIP 階提升。

⇒ 值得記的軸線＝**「固定發放時刻」本身就是回訪錨點**（「每週四來看錢」）。ApexWin `HL.cashback` 是**週桶 + 玩家自己隨時領 + 跨週作廢**＝有「截止壓力」但**沒有「發放時刻」**。兩者各有優劣（我們的作廢機制其實更催促），**本輪不開卡**，僅記入台帳「活動」分類的候補觀察，待該分類輪替時複審。

---

## ApexWin 對照（本輪新增）

| 維度 | Punkz | ApexWin 現況 | 結論 |
|---|---|---|---|
| 進度依莊家成本加權 | ✅ 10× / 1× / 0× 三檔 | ✅ **#50 `HL.edge`** 22 款逐遊戲係數 | 無缺口（外部佐證） |
| **XP 過期 + 每週重算 → 會掉階** | ✅ 6 週 | ❌ `HL.vip.addWager` 為**終身累計、只升不降** | 佐證 **#59**（第三共識，已提升優先序） |
| 分階 loot box | ✅ 品質隨階提升 | 🏗️ `HL.reveal`(#38) 元件有、`instant-cases`(開箱遊戲)有，但**非里程碑發放載體** | 併入 **#66** |
| 固定發放時刻 | ✅ 週四 13:00 UTC／每月 1 日 | ⚠️ 週桶 + 隨時領 + 跨週作廢（無發放時刻） | 記入台帳候補，本輪不開卡 |
| 高階 cashback 15% | ✅ | ✅ 真站 2–6%／假站更寬（刻意，見 CLAUDE.md §11） | 真金前經濟重調範疇 |

---

## 來源（本輪新增）
- [Casinoz — Punkz Casino Review 2026](https://www.casinoz.club/casino/punkz.html)（VIP 數值表 / XP 分級 / 6 週過期的權威來源）
- [Bitcoin.com — Punkz Review 2026](https://www.bitcoin.com/gambling/reviews/punkz/)（週四 13:00 UTC 發放 / 每月 1 日 boost / loot box 上限 3）
- [SportsGambler — Punkz Review 2026](https://www.sportsgambler.com/review/punkz/)

---

## 🔄 2026-09-04 複查（tier-3 到期 30 天；**沿新開的維度 #11「帳戶安全與隱私自控」深挖**）

- ⭐ **本輪唯一淨新訊號＝新裝置登入的 email 告警**：評測明載「**新裝置登入會觸發 email 告警**」，2FA 走 **Google Authenticator**（評測實測「啟用過程無問題」），
  另有明載的反串通/反 bot 政策。
  - → **這是 #125「登入活動／裝置與 session 清單」第一個正面形制佐證**。此前這一格的證據只有：Stake Help Center（一手）、
    1xbet（裝置/session 清單＋五層保護）、以及 **Thrill 的反面佐證**（有 2FA 但**無不明 IP／提款 email 告警**＝評測列為扣分項）。
    ⇒ 現在同一件事有**正面（Punkz 有）與反面（Thrill 缺被扣分）兩側證據** ⇒ 「新裝置/異常登入要告知玩家」是**評測會計分的項目**，不只是我方自審偏好。
- **隱私自控（ghost mode／隱藏統計／賽事榜隱藏）**：逐項追問 **無任何評測提及** ⇒ 本站零證據（本站主打的是 no-KYC 的**身分**隱私，不是**站內可見度**的隱私；兩者不可互相類推）。
- **提款安全鎖（白名單／新地址冷卻）**：無提及；安全敘述停在 SSL 128-bit ＋ 冷錢包保管 ＋ 不與第三方共享個資。
- **維度 #10「活動的收尾面」複驗（本站是這維度目前最有料的一家，但仍不到「封存」）**：
  首頁**內嵌排行榜且「得獎者名單持續更新」**、週賽 1,000 USDT／月度 wager race 10,000 USDT／2,500 USDT 抽獎（10 名各 250）；
  甚至查得到**2024-12 那場 13,000+ USDT 的實時流水賽**這種歷史事實。
  ⚠️ 但**逐項追問「往期完整成績／得獎名單封存／排行榜歷史」仍為無**（評測明說要看得回官網）。
  ⇒ 據實界定：本站是**「進行中的名單看得很清楚」**，不是**「賽後看得回去」** ⇒ 維度 #10 的第 **4/5** 個零封存平台。
  ⇒ 對 ApexWin 的意義：#167 已把錦標賽的往期八期做出來，**下一步不是再做第二份，而是收斂成登記簿**（本輪開卡 #169）。

### ApexWin 對照（本輪新增）

| 維度 | Punkz | ApexWin 現況 |
|---|---|---|
| 新裝置登入告警 | ✅ email 告警（評測明載） | ❌ 無任何登入活動面（#125，卡在 [P-FS]） |
| 2FA | ✅ Google Authenticator（實測可用） | ❌ absent（純前端無帳號安全層；真金前才需要，但**登入活動/裝置清單這半是純前端可做的**） |
| 站內可見度隱私 | 無證據（其隱私＝no-KYC 身分匿名） | ❌ absent（#127） |
| 活動收尾面 | 進行中榜單詳盡、賽後封存無 | 🟡 partial（#167 錦標賽往期 8 期已有、抽獎最近 6 筆已有、**無登記簿**⇒#169） |

## 來源（2026-09-04 補）
- [GameChampions — Punkz Review & Ratings 2026](https://www.gamechampions.com/en/reviews/punkz/)
- [CryptoAdventure — Punkz Review 2026](https://cryptoadventure.com/punkz-review-2026/)
- [CryptoLists — Casino Punkz: New Monthly Races & Exciting Features](https://www.cryptolists.com/casino-punkz-new-monthly-races-exciting-features/)
- [Bitcoin.com — Punkz Review 2026](https://www.bitcoin.com/gambling/reviews/punkz/)

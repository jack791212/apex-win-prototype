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

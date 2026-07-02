# Spree — 調研檔

- **平台**：Spree（Spree.com）
- **url**：https://www.spree.com
- **調研日期**：2026-07-02（首次）
- **tier / regions**：T3 · northamerica, global
- **定位**：sweepstakes 社交賭場（1,300+ 遊戲含 exclusives），多榜點名「當前成長最快、最均衡無短板」。純前端社交模式（GC + Spree Coins/SC），無真金＝定位貼合，只取留存玩法與 UX。

---

## 特色表（聚焦純前端可學）

### ⭐ 招牌一：XP Loyalty Program（每 10 級解鎖 + 獎勵以 mini-game 揭曉）
- **無傳統 VIP 段位**，改以 **XP 等級**驅動留存：**每達 10 個 XP 等級**解鎖一批獎勵。
- 解鎖的獎勵**不是直接發錢，而是一組「揭曉型 mini-game」**：free SC、**刮刮卡（scratch-offs）**、**bubble bursts（戳泡泡）**、**prize wheels（獎輪）**、gift spins。
- ＝把「等級進度」與「開獎儀式（互動揭曉）」結合——進度式留存 + 每次領獎都有驚喜演出。

### ⭐ 招牌二：Spinvasion 隨機掉落（Prize Drops）
- 月間隨機釋出 **Gift Spins**：平均約 **90 名玩家**各拿 25 Gift Spins。
- ＝時間不定的「天降獎勵」驚喜維度，催持續在線/回訪。

### 留存 / 促銷
- **每日登入禮**：點 Login 拿 2,000 GC + 2.5 SC（每 24h 一次）。
- **Referral 推薦**：分享專屬連結，好友驗證帳號 + 購買 $15+ GC 包後，推薦人得 10 free SC。
- 註冊禮 25,000 GC + 2.5 SC；首購 30,000 GC + 30 SC（$9.99）。

### UX / 遊戲庫
- 1,300+ slots（含 exclusives）、桌遊、真人荷官；多榜評「均衡無明顯短板」、行動體驗佳。

### 金流 / 模式（avoid，只記錄）
- sweepstakes GC/SC 模式、SC 可兌獎＝法規層 avoid。

---

## ApexWin 對照

| 維度 | Spree | ApexWin 現況 |
|---|---|---|
| XP 等級式留存（非段位 VIP） | ✅ 每 10 級解鎖獎勵批 | ⚠️ #6/#31 VIP 段位 + 微等級為近親，但**獎勵是直接派發**，缺「等級解鎖 → 揭曉儀式」|
| 揭曉型 mini-game 領獎（刮刮/戳泡/獎輪） | ✅ **scratch-off / bubble burst / prize wheel** | ❌ ApexWin 領獎多為直接入帳，**缺「互動揭曉」領獎演出**（呼應候補「Throw the Dice 擲骰揭曉」維度）|
| Prize Drops 隨機掉落 | ✅ Spinvasion（月間隨機給 ~90 人） | ⚠️ 已在候補（SpinBlitz/Mega Dice 共識），**Spree 再獲一家佐證** |
| Referral 推薦 | ✅ 好友購買後給 10 SC | ⚠️ 已在候補（WOW Vegas），**Spree 再獲佐證**（ApexWin 完全空白的病毒成長維度）|
| 每日登入禮 | ✅ 2,000 GC + 2.5 SC | ✅ #17 每日轉盤/簽到（覆蓋）|

**最關鍵缺口（一個較新、其餘佐證既有）**：
1. **「揭曉型 mini-game 領獎層」**——把既有的獎勵派發（連登/任務/里程碑/Reload）包一層可選的**互動揭曉**（刮刮卡/戳泡泡/轉輪），提升每次領獎的期待感與儀式感。這與 #17 Lucky Spin（單一每日轉盤）不同，是**一組可複用在多處領獎點的揭曉元件**。
2. （佐證）**Referral** 與 **Prize Drops** 皆再獲一家共識，強化候補優先序。

---

## 可落地點子（pure-frontend）

1. **通用「揭曉型領獎」元件（刮刮卡 / 戳泡泡 / 獎輪）** — 對標 Spree XP 解鎖的 mini-game 領獎。
   - 做一個 `HL.reveal` 小元件：傳入「獎勵內容 + 揭曉樣式（scratch/bubble/wheel）」，回傳玩家互動揭曉後再入 `HL.bonus`。可掛在**任何既有領獎點**（連登里程碑 #34、任務完成 #6、Reload #24、Lucky Spin），把「直接入帳」升級為「先揭曉再入帳」。
   - 加速器：純 UI 層、不改任何派發金額邏輯（只在派發前插一層動畫）；複用既有 modal。工作量 **M**。差異化＝一次做、多處複用。

2. **XP 等級解鎖軌（Battle Pass 式進度）** — 對標 Spree XP Loyalty + 續佐證 Zonko 8-Day Track / WOW Vegas / Stake.us / SpinBlitz 共識。
   - 用中央掛鉤累積 XP → 進度軌每達 N 級解鎖一批獎勵（可搭點子 1 的揭曉領取）。**此主題 CONTROL 已多輪標「建議 evolve 成卡」**，Spree + Zonko 本輪再各加一家硬佐證。
   - 加速器：複用 `HL.liveStats`/`HL.vip.addWager` 累積 + `HL.bonus` 派發 + #24 modal。工作量 **M**。

3. **（佐證既有候補，不新開）**：Referral 推薦（WOW Vegas + Spree 共識）、Prize Drops 隨機掉落（SpinBlitz + Mega Dice + Spree 共識）——建議 evolve 時把兩者的優先序上調。

---

## 來源
- [SweepsKings — Spree Casino Review 2026](https://sweepskings.com/reviews/spree/)
- [Next.io — Spree Casino Review 2026](https://next.io/sweepstakes-casinos-us/spree/)
- [Deadspin — Spree Casino Promo Code](https://deadspin.com/sweepstakes-casinos/reviews/spree/promo-code/)
- [LegalSportsReport — Spree Casino Review June 2026](https://www.legalsportsreport.com/sweepstakes-casinos/spree-casino/)
- [SportsGambler — Spree Review June 2026](https://www.sportsgambler.com/review/spree/)

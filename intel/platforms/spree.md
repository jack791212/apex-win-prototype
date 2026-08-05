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

---

## 2026-08-05 刷新（第 3 次調研 · tier-3 逾期 4 天補刷 · 船長 08-04 db 點名）

**本輪唯一重大進展＝終於查到忠誠結構的完整形狀。** 前兩輪（07-02 首查、07-09 reconfirm）都只記到「無 VIP/忠誠方案，只有促銷」，本輪從官方 `promotions/loyalty-program` 頁 + 多家評測交叉，確認其實有一套完整的 **XP Rewards Loyalty Program**：

### ⭐ 招牌：XP 忠誠方案（100 級 + 3 層 VIP）
| 維度 | Spree 做法 |
|---|---|
| 入場 | **需主動 enroll（free to join）**——不是自動計入 |
| XP 來源 | **遊玩 ＋ 選購 GC 幣包**（購買行為也累積進度） |
| 階梯 | **100 個等級**，其上另有 **Emerald / Ruby / Diamond VIP** 三階 |
| 里程碑獎勵 | **每 10 級一份禮物，且禮物本身是一種開獎玩法**：Gift Spins / Scratch-Offs / Bubble Bursts / Wonder Wheels / 純 SC / 純 GC |
| 頂階權益 | 每週禮、生日禮、專屬 promo code、**personal host** |
| 過期 | 未見任何 XP 過期/重置敘述（與 Punkz 的 6 週過期相反） |

### 其他
- **每日登入**：2,000 GC + 0.3 SC（每 24h 一次）。
- **Referral**：好友需**驗證帳號且購買 $50+** 才發 25 SC ⇒ 與 SpinBlitz「分階段釋放」同屬**防刷形狀**（第二家共識，強化 #58 卡的實作形狀）。
- **錦標賽**：Spin Rush、Turbo Time（後者獎池 2,500 SC）。
- **UX**：GC/SC **雙幣切換可在遊戲內直接進行**、大廳刻意不做過多分類、獎項資格追蹤透明。

### ⚠️ 來源分歧（依「只記共識不臆造」原則處理）
sportsgambler 8 月評測明確稱其「**無 XP/等級系統、無錦標賽、獎勵僅偶發**」，與官方頁及 next.io/sweepskings/ats 等多家相左。⇒ **採官方頁 + 多家一致的版本**並記錄分歧（合理推測：評測者未 enroll，故該層對他不可見——這本身也是「需 opt-in 的方案對未加入者等於不存在」的實例）。

---

## ApexWin 對照（本輪新增）

| 維度 | Spree | ApexWin 現況 | 結論 |
|---|---|---|---|
| 忠誠方案需 opt-in | ✅ enroll 才計 | ✅ #52 促銷 opt-in「我的優惠」已做 | 無缺口 |
| **XP 來自「購買」而非只有投注** | ✅ 遊玩＋買幣包 | ❌ **全站進度只認投注**（`liveStats.record` 是唯一入口，儲值/商城消費零進度） | **⇒ 開卡 #65** |
| 里程碑獎勵＝開獎玩法 | ✅ 4 種載體 | 🏗️ **元件已有**（#38 `HL.reveal` 三樣式 scratch/bubble/wheel），但只接了 meta/onboarding/shop 三處；**VIP 升級金／季票階梯／成就／任務四大里程碑仍直接入帳** | **⇒ 開卡 #66**（接線缺口，非缺元件） |
| 100 級細粒度階梯 | ✅ | ✅ #31 VIP 微等級 Lv 1–21 + #46 季票階梯 | 無缺口 |
| referral 分階段釋放 | ✅ 需購買 $50+ | ⬜ #58 待做（已標「務必採此形狀」） | 佐證既有卡 |

---

## 來源（本輪新增）
- [Spree 官方 — Loyalty Program](https://spree.com/promotions/loyalty-program)（403 不可直取，內容經多家評測與搜尋摘要交叉）
- [SportsGambler — Spree Review August 2026](https://www.sportsgambler.com/review/spree/)（分歧來源，見上）
- [Deadspin — Spree Casino Review 2026](https://deadspin.com/sweepstakes-casinos/reviews/spree/)

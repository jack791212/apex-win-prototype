# Jackpotter — 調研檔

- **URL**: https://jackpotter.com
- **調研日期**: 2026-08-06（首次取材 + 深挖，平台軌 14:00 窗）
- **tier**: 3 ｜ **priority**: 55 ｜ **regions**: global, europe
- **category**: crypto, casino, gamification, vip
- **confidence**: medium（AskGamblers / WizardOfOdds / Trustpilot 皆有正式評測頁＝有實體；
  但**未取得絕對流量名次**，故不升 tier）
- **模式**: crypto casino（真金/加密投入端＝`CONTROL.avoid`，本檔只取前端結構與留存設計）

---

## 一句話定位
2026-08 多份 crypto casino 榜（cryptonews / coingape / bitedge）把 Jackpotter 與 **Thrill**（本庫已有）
並列為「新上線 bitcoin casino 的標準設定者」。產品面沒有自研 originals 新玩法，
**價值全在 VIP 系統的設計取向**：它把「VIP 段位」當成**條款軸（terms）**在賣，而不只是**金額軸（amounts）**。

---

## 為什麼值得收進庫（本輪最強新素材）

### ⭐ ① VIP 專屬「wager-free／極低流水」獎勵 → 直接對照出 ApexWin 的扁平流水
- 該站 BOX 系統的 Free Spins 與 VIP 獎勵**常為 no-wagering 或極低流水**，並作為 VIP 賣點行銷。
  2026-08 crypto 榜的通則描述亦同：「loyalty bonuses include … **lower wagering requirements**」。
- **ApexWin 現況（本輪 grep 機械實證）**：`core/progress.js:31`
  `var WAGER_MULT = (HL.site && HL.site.isLive()) ? 8 : 1;`
  ＝**扁平常數**，只分站別（真站 8× / 假站 1×）、**完全不分 VIP 段位**，
  且是 **module 級 `var`、載入期一次求值**（連動態改都做不到）。
  全站唯一的流水豁免是 `badd(n, {wagerFree:true})` ＝**由「來源」決定**（#33 cashback 等），
  **不是由「玩家段位」決定**。
- ⇒ **流水倍數從未成為 VIP 維度**。這正是 #63 `HL.sla`（VIP＝服務水準軸）已建立的思路
  ——VIP 決定「拿錢這件事的條款」——但 #63 只覆蓋提領時效/額度/客服，**沒覆蓋紅利解鎖門檻**。
  ⇒ **本輪開卡 #74**（可註冊維度表已存在，本卡是它的下一個消費者）。

### ⭐ ② 獎勵「節奏」隨段位解鎖 → #73 由單平台升為兩平台
- Instant Rakeback 5% 全員；**Daily Bonuses 需 Sorcerer+、Weekly 需 Mage+、Monthly 需 Wizard+**
  ＝低階拿不到「每週/每月」這個**節奏**本身。
- ⇒ 與 DoND（07 段 Stars 階梯解鎖 hidden missions / tournaments）獨立收斂
  ⇒ **#73「進度解鎖內容而非只解鎖錢」從單平台佐證升為兩平台**（卡上「誠實標註僅單平台」一句已可撤下）。

### ③ Mystery Box 品質隨段位提升 → #66 第三平台佐證（**已做，不開卡**）
- 13 階 box：Wooden / Stone / Iron / Bronze / Silver / Gold / Platinum / Ruby / Emerald / Diamond /
  Uranium / Cosmic / Custom；**階越高箱子越好**，內容可為現金 / XP / free spins。
- ⇒ 與 Punkz「loot box 品質隨 VIP 階提升」同構。**ApexWin #66 已於 2026-08-06 08:00 窗落地**
  （`HL.reveal` 里程碑層，層級→樣式註冊表 `vip-rank`→wheel／`season`/`badge`→bubble／`vip-sub`/`task`→scratch）
  ⇒ **刻意不開卡＝已覆蓋**（遵「斷言缺 X 前先 grep」紀律，已查證 `core/reveal.js` 現況）。

### ④ 明文行銷「XP 與段位永不重置」→ **ApexWin 已對齊，刻意不開卡**
- 原文：「your XP and rank **never reset**, so you can't lose progress」＝把「永久性」當成減壓賣點講出來。
- **ApexWin 現況**：`HL_VIP.wager` 累積**從不重置**（只有賽季 `season.js` 依 `SEASON.id` 換季歸零，
  屬刻意的賽季制設計）。⇒ **產品面已對齊、無缺口**；可學的只有「**把永久性明講出來**」這個溝通面，
  屬 #72 支援與透明度中心的一條說明條目（已有卡承接）⇒ 不另開卡。

---

## ⚠️ 來源衝突（兩記不擇一，未取單一版本）
段位命名有兩套並存的說法：**Wooden→Cosmic 13 階**（VIP box 階）與 **Sorcerer / Mage / Wizard**（法師系）。
合理推測是「box 階」與「VIP 階」兩套系統並行，但本輪**未查證到單一權威來源**，
故兩者並記、不擇一、不據此推導任何數值。

---

## ApexWin 對照

| 維度 | 它有 | ApexWin 已有 | ApexWin 缺口 |
|---|---|---|---|
| 流水要求 | 隨 VIP 段位降低 / wager-free | 扁平 `WAGER_MULT`（8×/1×，只分站別）+ 依來源的 `wagerFree` | **段位維度**（→ #74） |
| 獎勵節奏 | Daily/Weekly/Monthly 依段位解鎖 | #33/#22 等各自固定週期，全員同節奏 | 節奏本身作為解鎖物（→ #73，本輪升兩平台） |
| 開箱品質 | 13 階 box、階越高越好 | ✅ #66 `HL.reveal` 里程碑層（層級→樣式） | 無 |
| XP 永久性 | 明文「永不重置」 | ✅ VIP 累積不重置（賽季另計） | 無（僅溝通面 → #72） |
| Rakeback | Instant 5% | ✅ #60 以莊家優勢計價 + 每日桶 | 無 |

---

## 純前端可落地點子
1. **#74 紅利流水倍數成為 VIP 維度**（S–M）——本輪已開卡，見 `BACKLOG.md`。
2. **#73 補強**（既有卡）——把「Daily/Weekly/Monthly 節奏依段位解鎖」寫進 #73 作為第二平台佐證。
3. **（不做）box 階梯視覺化**：#66 已覆蓋機制，純視覺擴充留待維護軌，勿在成長軌重複開卡。

---

## 給後續輪的訊號
- 本站**產品玩法面無新素材**（無自研 originals），價值集中在「VIP 賣條款而非賣金額」這一個取向
  ——這與 #63（服務水準）、#74（流水門檻）是同一族，**建議後續把「VIP 條款軸」當成一條有意識的產品線收斂**，
  而不是每次遇到一個新條款就開一張新卡。
- 下次刷新（`next_due` 2026-09-05）重點：查證段位命名的單一權威版本、以及 box 內容的機率是否公開
  （若公開＝#72 透明度中心的可對標素材）。

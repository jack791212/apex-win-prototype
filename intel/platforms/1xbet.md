# 1xBet (1xbet.com) — 調研檔

- **調研日期**：2026-06-26
- **tier**：2（地區頂級 · 14 天刷新）
- **regions**：asia / africa / europe / latam
- **category**：sportsbook / casino / live
- **定位**：新興市場覆蓋極廣的體育博彩 + 娛樂城巨頭；核心（真金體育/真人荷官/真金流）屬 avoid 牌照範疇，**可學的是密集到近乎工業化的「遊戲化留存層」**。

## 🔄 2026-07-10 刷新（reconfirm + 一處 nuance）

本輪（T2 14 天到期）重查，**留存層與可學缺口全數維持**，追加：

- **忠誠等級確認為 8 級**：VIP Cashback 註冊即入會、持續押注升級領更高 cashback%（原記「持續押注升級」現補上『**8 級**』粒度）→ 對應 ApexWin `HL.vip`（5 級），與 Rollbit 27 級一同佐證「**細分段位、永遠差一點**」的推進感共識（見 #29 VIP 階梯）。
- **Weekly Wheel Drops = 既有 Lucky Wheel 集片再確認**：每週 opt-in、押注掉隨機碎片、集滿 3 片轉全螢幕大轉盤領獎 → 與本檔既記的「Lucky Wheel 集片解鎖」完全一致，**非新缺口**（ApexWin 對應點子＝#17 Lucky Spin 加集片解鎖迴圈，仍為標準未解缺口 S–M）。
- **WORLD WIN 26（事件式活動 · nuance）**：綁真實賽事（World Cup）的**限時活動**——押注累積活動專屬幣 **1xCoins**、完成里程碑領獎、並入大抽獎池。機制＝**限時事件 + 事件專屬貨幣 + 里程碑軌 + 事件抽獎**。→ 落在既浮現的「Battle Pass / 里程碑進度軌」主題（Zonko 8 日軌 / CapySpin 季票）疊加 #35 Happy Hour 的限時盒子；**是既有主題的『事件皮』，非新軸線**（真金賽事結算＝avoid，只取『限時事件里程碑軌 + 事件幣』前端結構）。
- **結論**：本輪為 **reconfirm**。標準未解缺口續為 → Promo Points 積分商城（ROADMAP LATER，賺點→兌換目錄，M）、Lucky Spin 集片解鎖（S–M）、每日任務賺額外轉次（S）、錦標賽總贏倍數計分 + 免流水變體（S）。反面教材（介面過度雜亂）續守：只學機制、保持乾淨資訊架構。

## 特色快照

### 遊戲 / Originals
- 10,000+ 款 slots/桌遊/真人/特殊遊戲（皆供應商接入 = avoid）。自家 instant/crash 類（Jet Rush 等活動）多為第三方（Smartsoft）冠名。

### 留存系統（重點：高度遊戲化）
- **Promo Points 積分商城**：遊玩/參與活動累積 Promo Points，可在**兌換商城**換單注/串關/特定運動投注金/特定遊戲試玩金等（多數品項名目 50 點）。＝完整的「積分→商城兌換」經濟。
- **忠誠等級**：註冊即入會，持續押注升級 → 更高 cashback %。
- **Lucky Wheel（集片轉盤）**：真金轉特定遊戲收集**隨機轉盤碎片**，集滿 3 片即可轉一次**全螢幕大轉盤**領獎。
- **每日 Cash Drops / 轉盤點數**：以押注/倍數任務每日最多賺 10 次轉盤次數，轉盤給隨機點數計入排行榜。

### 促銷 / 紅利
- **每日錦標賽**：以**總贏倍數**計分上榜搶現金獎，且**獎金免流水**。
- 海量 tournaments / cash drops / 時段 jackpot / 網絡連線獎、歡迎金 + 免費旋轉。

### UX / 上手（⚠️ 反面教材）
- 近期改版仍被評**桌面與 App 介面過度雜亂、難導航**——對 ApexWin 是「**別學的密度**」：留存機制要學，資訊架構要保持乾淨。

### 金流 / 模式（⚠️ CONTROL.avoid，只記錄不推進）
- 真金體育/真人/真金流、廣域多幣別 — 需牌照，不推進。

## ApexWin 對照

| 項目 | 1xBet | ApexWin 現況 |
|---|---|---|
| **Promo Points 積分商城** | ✅ 賺點→商城兌換目錄 | ❌ **缺**（有獎金錢包，但無「積分→兌換目錄」經濟；#19 兌換碼是輸入碼，非賺點兌換）|
| **Lucky Wheel 集片解鎖** | ✅ 集 3 片才轉 | 🟡 #17 Lucky Spin 為「每日免費直接轉」，無「靠遊玩集片解鎖」迴圈 |
| 每日錦標賽（倍數計分·免流水） | ✅ | 🟡 #15 錦標賽為押注額積分，可學「總贏倍數計分 + 獎金免流水」變體 |
| 每日 Cash Drops / 多次轉盤 | ✅ 每日最多 10 轉 | 🟡 #17 每日僅 1 轉；可學「任務賺額外轉次」 |
| 忠誠等級 cashback | ✅ | ✅ HL.vip + HL.rakeback |
| 乾淨資訊架構 | ❌（雜亂） | ✅ ApexWin 維持乾淨——**守住此優勢** |

## 可落地點子（pure-frontend，餵給 evolve）

1. **Promo Points 積分商城**（對標 1xBet Promo Points Store）：押注經 `HL.liveStats.record` 中央掛鉤累積積分（與 VIP/返水並列），開「兌換商城」目錄頁——以點數兌換 `HL.bonus` 紅利/免費 Lucky Spin 次數/兌換碼等品項，每品項可設庫存/限領。與 #19 兌換碼互補（一個賺點換、一個輸碼領）。**工作量 M**。← 強留存經濟、純前端、共用中央掛鉤。
2. **Lucky Spin 集片解鎖**（對標 1xBet Lucky Wheel）：在現有 #17 Lucky Spin 上加一條「靠遊玩掉碎片、集滿 N 片解鎖一次額外轉」的迴圈，把「每日 1 轉」升級為「玩越多、轉越多」。掛 `HL.liveStats.record` 掉片。**工作量 S–M**。
3. **每日任務賺轉盤次數**（對標 1xBet Daily Cash Drops 每日最多 10 轉）：把每日任務 #6 完成度接到 Lucky Spin，達標解鎖額外轉次，串起任務↔轉盤兩個既有系統。**工作量 S**。
4. **錦標賽「總贏倍數計分 + 獎金免流水」變體**（對標 1xBet 每日錦標賽）：在 #15 加一種以單注最高倍數/總贏倍數計分的賽制，並把派彩標記為免流水（待 #20 流水引擎上線後可對接）。**工作量 S**。

> ⚠️ 反面教材：1xBet 留存機制密集但介面雜亂。ApexWin 採其「機制」、棄其「擁擠」，保持乾淨資訊架構為差異化優勢。

---

## 2026-07-29 刷新（re-investigate）

- **reconfirm（無淨新缺口）**：8 階忠誠（Copper → VIP，高階解鎖生日禮／加碼 cashback／專屬客服）、**Promo Code Store**（每筆下注累積積點 → 兌換 free bets／免費轉／加碼碼）、Drops & Wins 類供應商聯網積分賽、weekly new releases、provider／熱度／類型三軸篩選。
- **ApexWin 對照**：
  - Promo Code Store → **已覆蓋**：`core/shop.js` + `core/redeem.js` 已是「積點/兌換碼 → 獎勵」骨架，非新缺口。
  - 聯網積分賽 → **已覆蓋**：#15 錦標賽 / Slot Race。
  - 三軸篩選 → **已覆蓋**：資料驅動 GameList（provider/type/cat/author）。
  - 8 階忠誠 vs ApexWin VIP 5 階 → **可選深化、非缺口**（階數是資料而非架構；且 #50 成本加權 VIP 卡才是更高價值的同區改動）。
- **反面教材續記**：介面資訊密度過高、促銷入口散落多處 —— 與 ApexWin「容器先於內容、用不到能收起來」的哲學正好相反，續為 UI 密度上限的參照。

> **本輪結論**：1xBet 本輪 **零淨新缺口**（其留存工業化的主要形態 ApexWin 皆已有同構物）。刷新週期維持 14 天。

---

## 2026-08-11 刷新（re-investigate · tier-2 到期深挖）

**結論：淨新缺口＝0，據實記 `saturation_watch 1/2`（不硬湊）。** 四項訊號逐一 grep 覆核，**四項全數已覆蓋**：

| 1xBet 機制（實查） | ApexWin 現況（機械證據） | 判定 |
|---|---|---|
| **Promo Code Store**：下注累積點數 → 兌換促銷碼（免費投注/保險/返現） | `core/shop.js`（#42，點數消費 + 加權抽層）＋ `core/redeem.js`（**兌換碼**入口，`HL.redeem = { redeem, open }`） | **已覆蓋**（且 ApexWin 把「點數商城」與「碼兌換」拆成兩個出口＝更正交） |
| **「為投注累積點數」需在帳戶頁 opt-in 開關** | #52 promo opt-in 已落地；`progress-src.js:728` 有 `optIn: true` / `optInTtlMs` / `optInDaily` | 已覆蓋 |
| 點數也可由**非投注行為**取得（帳號驗證、手機綁定、參加賽事） | #65 `HL.progressSrc.register({ id, kind, xpPer, xpPerLive })`＝**來源註冊表**，`kind` 已含 social/purchase 等非投注類 | **已覆蓋（容器已在）**：新增「綁手機給點」＝註冊一筆 spec，非新卡 ⇒ 寫進 #65 卡體當第二平台佐證 |
| VIP 八階返現 | `HL.vip` + 返現/返水軸（#50 成本加權） | 已覆蓋 |
| 每日賽事送實體獎（GoPro）／體育 Toto/Advancebet | 實體獎與體育博彩皆 **CONTROL.avoid / ROADMAP LATER** | 不推進 |

⇒ **本輪連續「先 grep 再斷言」再省下四張假卡。** 記 `saturation_watch: 1/2`（**tier-2**，與兩張 tier-1 不同：2026-09-10 複驗仍零增量即可正式改 `status=saturated`、`refresh_interval_days` 拉到 180）。

**⚠️ 仍保留的教材價值（不因飽和而降級）**：1xBet 的 UX 一直是本庫登記的**反面教材**（資訊密度過載），該定位與「有無可抄機制」是兩件事。

**下次複驗**：2026-09-10。

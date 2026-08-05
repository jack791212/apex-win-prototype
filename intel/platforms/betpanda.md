# BetPanda — 調研檔

- **URL**：https://betpanda.io
- **調研日期**：2026-07-02（首次深挖）
- **tier**：3　**priority**：65
- **regions**：global
- **category**：crypto / casino / live
- **定位**：2026 多家 Stake-alternative 榜續點名為「出金最快」crypto casino（Bitcoin Lightning <30s）、6,000+ 遊戲含 200+ Evolution 真人。

> ⚠️ **avoid 佔比高**：核心是**真金流 / Bitcoin Lightning 金流 / 真人荷官 / no-KYC 匿名**——皆屬牌照範疇，只記錄、不推進。本檔只萃取**純前端可學**的留存/UX 訊號。

---

## 🔄 2026-08-05 複查刷新（平台軌 20:00 窗｜逾期 4 天，為全庫最久 × 逾期群 priority 最高〔65〕）

**站仍在營運、定位未變**（Stake-alternative 榜續在、6,000+ 遊戲、Lightning 秒出）。本次刷新的重點不是又數一遍它有什麼，而是**三筆可機械對照的新事實**：

1. **忠誠方案已更名 `Path of the Panda`**（07-02 本檔記為 `XP Club`）——**六段位名稱完全未變**（Panda Cub → Bamboo Guardian → Majestic Panda → Panda Commander → Emperor Panda → Uncharted Territory），改的是外殼命名。⇒ **對 ApexWin 的意義：段位表是資料、包裝是文案**，`HL.vip` 的段位陣列與面板標題本就分離，這種改名在我們這邊是改一條 i18n key 的事，記此一筆作為「命名層不該寫死在邏輯裡」的外部佐證。
2. **每日 rakeback 依段位 5% → 10% 遞增；Gold 段起配專屬客戶經理；高段位「提高各項限額」** ⇒ **這是 #63 `HL.sla`（VIP＝服務水準軸）的第六個平台佐證**（前五：Dorados 兌獎時效／Chancer 提領上限+商城折扣／BigPirate 客服+客戶經理／Kaasino／Coinsback）。**維度形制再次不同**：本站是「rakeback **比率**隨段位遞增」＋「限額隨段位放寬」，前者屬既有 #60 返水係數（已在位）、後者正是 #63 已落地的 `wd-cap-*` 三週期額度 ⇒ **#63 的註冊表設計被第六站驗證為正確抽象**（各站維度都不同，固定欄位必然接不住）。
3. ⭐ **本次最有價值的新事實＝紅利的「流水倍數 × 到期天數」被明碼寫出**：歡迎禮 100% 至 1 BTC，**80× 流水、7 天內未達標即失效**。另一側是**明確派發時鐘**：每日 rakeback 於 **08:00 UTC 自動入帳、免 opt-in**；每週 10% 淨損 cashback 於 **週三 13:00 UTC 自動入帳、無流水、可立即提領**（07-02 記為 12:00 UTC，各家評測口徑不一，**不硬斷絕對時刻**，只採「有一個公告的固定結算時鐘」這個形制）。
   - ⇒ **對照出 ApexWin 一個真缺口（已開卡 #71）**：`HL.bonus` 的 `unlocked`（可領取獎金）與 `entries`（待解鎖紅利）**兩者皆永不到期**——紅利可以無限期躺著。而**同站內早已有兩個逾期作廢的先例**（`HL.rakeback` 每日桶跨日作廢、#33 `HL.cashback` 逾期作廢）⇒ 不是「要不要有到期」的路線爭議，而是**同一個房規在 bonus 主軸上漏掉了**。
   - ⚠️ 已用 `git log`/grep 機械複核，避免重演 07-30 的假缺口事故（當時台帳記「缺 no-wager 零流水紅利」，實際 `wagerFree` 自 #20 即存在）：本次確認 `progress.js` 的 `badd/bstate/bclaim` **全無任何時間欄位**（無 `at`/`expireAt`/`ttl`），`entries` 逐筆只有 `{amt, req, prog}`。

**回填**：`last_investigated` 2026-07-02 → **2026-08-05**、`next_due` → 2026-09-04。

---

## 特色表（各維度重點）

### 留存系統 — XP Club（招牌）
- **6 段位 × 每段 5 級**（第一段除外）＝約 30 個微等級：Panda Cub → Bamboo Guardian → Majestic Panda → Panda Commander → Emperor Panda → Uncharted Territory。
- **每 $1 押注給 XP，但依遊戲類別加權**：slots **10 XP/$1**、live casino **2 XP/$1**、桌遊（百家樂除外）**1 XP/$1**。← **本檔最值得學的新 nuance**。
- 各段每升一級給該段固定 **free spins**（10→20→30→40→50 隨段位遞增）＋ 10% 週返水；最高段 Uncharted 另附 Super VIP 專屬客服。
- 段位門檻跨度極大（Panda Cub 約 12,500 XP → Uncharted 100 億 XP），營造「長尾養成」。
- **每日 rakeback**：到一定段位後每日依「總押注（不論輸贏）」發放。

### 促銷/紅利
- **每週 10% 淨損 cashback**：窗口固定 **週三 12:00 UTC → 次週三 12:00 UTC**，期末以「淨損 ×10%」入帳，**無流水**。← 命名結算日 + 明確窗口。
- **週末 slot 錦標賽**：週四 08:00 UTC 開跑、週一 08:00 UTC 結束，瓜分 $7,000 獎池。← 週末專屬時間窗。
- **wager-free free spins**：所有免費旋轉贏額直接入可提餘額、**零 rollover**，以「無流水」當賣點。

### UX/上手
- 60 秒低摩擦註冊；即時到帳的**出金秒數/進度可視化**（金流本身 avoid，只可學這個「速度可視化」前端呈現）。

### 金流/模式（avoid，只記錄）
- 真金 crypto（ETH/USDT/DOGE/XRP/SHIB…）、Bitcoin Lightning 秒出、Evolution 真人荷官、no-KYC。

---

## ApexWin 對照

| BetPanda 機制 | ApexWin 現況 | 判定 |
|---|---|---|
| XP Club 6 段 × 5 級微等級 | 已有 `HL.vip` 5 段位（#6） | 大致有；缺「每段內多級微進度」的細分呈現（同 LeoVegas 99 層 VIP Bar 共識） |
| **XP 依遊戲類別加權**（slots 10× / 桌遊 1×） | VIP/rakeback 押注**一律等權**累積 | **缺口 nuance**（全新） |
| 每週 10% 淨損 cashback（Wed→Wed、無流水） | #33 淨損 Cashback/Lossback（⬜已開卡） | 已規劃；BetPanda 提供**具體窗口/結算日 UI 規格** |
| 每日 rakeback | 已有 `HL.rakeback`（#8） | 有 |
| 週末 slot 錦標賽（Thu→Mon 窗口） | 已有 `HL.tournament` 錦標賽（#15） | 有；可學「週末專屬時段」變體 |
| wager-free free spins（零 rollover） | #20 流水/rollover 引擎（⬜待批准） | 反向佐證——BetPanda 把「無流水」當賣點，與 #20 記帳需求形成張力，設計時可保留「wager-free 標記」 |
| 出金秒數/進度可視化 | 無（且金流 avoid） | 僅記錄，不推進 |

---

## 可落地點子（pure-frontend）

1. **VIP 進度「遊戲類別加權」係數**（對標：BetPanda XP Club 差異化 XP）——`HL.liveStats.record` 中央掛鉤已知道每注來自哪款遊戲，可為 VIP/rakeback 累積加一層 category 權重表（slots ×N、桌遊 ×1…），讓不同遊戲對養成貢獻不同、鼓勵探索多元玩法。**S**（純係數表 + 既有中央掛鉤，零逐遊戲改裝）。
2. **VIP 段內「微等級進度條」**（對標：BetPanda 6×5 微等級 + LeoVegas 99 層 VIP Bar 共識）——把現有 5 段位每段細分數個微級，VIP 面板顯示「距下一微級還差多少押注 + 升級即得 free spins」，強化短期回饋感。**S–M**（複用 `HL.vip`，純呈現層）。
3. **#33 cashback 的「Wed→Wed 窗口 + 命名結算日」UI 規格**（對標：BetPanda 週三結算窗口）——實作 #33 時直接採用「固定週期窗口 + 期末某日一次派發 + 無流水標記」的視覺（進度中的窗口倒數 + 本期累積淨損預估）。**（併入 #33，非獨立卡）**。

---

## 給 evolve 的結論
- BetPanda **絕大多數是既有缺口的再確認**（cashback #33、tournament #15、micro-VIP、rakeback #8）——不急著開新卡。
- 唯一**全新可落地 nuance ＝「VIP/rakeback 依遊戲類別加權」**（S，複用中央掛鉤），可考慮成一張小卡或併入未來 VIP 強化。
- 其餘（Lightning 金流、真人荷官、no-KYC）＝ avoid，只記錄。

# BetPanda — 調研檔

- **URL**：https://betpanda.io
- **調研日期**：2026-07-02（首次深挖）
- **tier**：3　**priority**：65
- **regions**：global
- **category**：crypto / casino / live
- **定位**：2026 多家 Stake-alternative 榜續點名為「出金最快」crypto casino（Bitcoin Lightning <30s）、6,000+ 遊戲含 200+ Evolution 真人。

> ⚠️ **avoid 佔比高**：核心是**真金流 / Bitcoin Lightning 金流 / 真人荷官 / no-KYC 匿名**——皆屬牌照範疇，只記錄、不推進。本檔只萃取**純前端可學**的留存/UX 訊號。

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

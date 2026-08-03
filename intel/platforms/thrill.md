# Thrill（thrill.com）調研檔

- **URL**：https://thrill.com
- **調研日期**：2026-06-29（首次深挖）
- **tier**：3（新興，30 天刷新）
- **regions**：global
- **category**：crypto, casino, originals, crash
- **定位**：2025 上線的 provably-fair crypto casino，主打「**不靠歡迎禮、靠持續返饋**」（rewards-first），最高 70% rakeback + 淨損 cashback、零流水。USDT/USDC 跨多鏈。

## 特色表（純前端可學維度）

### 遊戲 / Originals
- 自研 Originals 目前 **4 款 live**：Mines、Dice、Limbo、Keno（Crash 由「Coming Soon」轉正、續開發 Blackjack / Hi-Lo，宣稱共 9 款規劃）。皆 provably-fair（server seed + client seed 可重算）。
- 賠付上限：Mines/Dice/Limbo ≈ $200k，Keno 高至 $500k；支援極小注 micro-bet。
- 第三方 slots 3,100+（Pragmatic/Hacksaw 等）。

### 留存系統（核心賣點）
- **Instant Rakeback 即時返水**：每注後即時回最高 **70%** 莊家優勢，比率隨 VIP 段位 + 押注量遞增。
- **Loss Cashback 淨損返現**：Level 4 起最高 **10% 淨損 cashback，即時入帳、零流水、無時間限制**。← 與 rakeback **不同維度**（rakeback 算所有押注的 edge；cashback 算淨輸金額）。
- **VIP 6 段位**（Base → Bronze → … → Emerald），**升段解鎖「功能」而非只有獎金**：
  - Bronze：開始有 level-up 升級獎金
  - Gold：解鎖 **Vault X**（金庫）
  - Platinum：解鎖 **Level Up Reloads**（週期 reload）
  - Emerald I：配 **專屬 VIP host**
- 週期紅利：Weekly Bonus（週五 13:00 UTC 投放、下次投放前須領，依 VIP 段位/押注量/edge）、Monthly Bonus（約每月 15 號投放、須在下次投放前領，另計 profit）；**逾期作廢**。

### UX / 上手
- 註冊 ≈ 2 分鐘（email/密碼 或 Google）；**完全無傳統歡迎禮**，主打 PWA「輕快」體感、桌機/行動一致。
- 大廳依 provider / 波動度 / 玩法分類篩選。

### 金流 / 模式（CONTROL.avoid，只記錄）
- 真金 crypto（USDT/USDC 多鏈秒出）、no-KYC 傾向 → 牌照/合規範疇，**不推進**。

## ApexWin 對照

| 維度 | Thrill 有 | ApexWin 現況 |
|---|---|---|
| Rakeback 即時返水 | ✅ 最高 70%、隨段位遞增 | ✅ 已有 `HL.rakeback` + #22 每日領桶 |
| **淨損 Cashback / Lossback** | ✅ 最高 10%、零流水、無時限 | ❌ **完全缺**（只有 rakeback，無「淨輸返現」維度） |
| 週期 reload（日/週/月、逾期作廢） | ✅ Platinum 解鎖 | 🟦 已開卡 #24 待做 |
| VIP **升段解鎖功能**（Vault X / Reloads / host） | ✅ 功能門禁式 | ⚠️ `HL.vip` 只發獎金、**無「解鎖功能」門禁** |
| Provably Fair | ✅ | ✅ 已有 `HL.fair` |
| Originals（Mines/Dice/Limbo/Keno/Crash） | ✅ | ✅ 已有 5 天王 + Towers；Keno 在 #32 |

## 可落地點子（pure-frontend）

1. **【最高優先 · 全新維度】淨損 Cashback / Lossback 引擎** — 對標 Thrill 10% + Mega Dice 15%（本輪兩家共識）。在中央掛鉤 `HL.liveStats.record` 累計「淨輸」，依 VIP 段位給 %（即時或每日結），零流水入 `HL.bonus`/主餘額。與既有 rakeback **互補不重疊**（rakeback 算 turnover，cashback 算 net loss）。工作量 **M**。
2. **VIP 段位「功能解鎖」門禁** — 對標 Thrill（Gold 解 Vault X / Platinum 解 Reloads / Emerald 配 host）。把現有純發獎金的 `HL.vip` 升級，跨段時**解鎖 UI 功能/專區**（例：某段位才開「每日領桶上限提高」「專屬轉盤」），呼應 LeoVegas「The Club」候補項。工作量 **S–M**。
3. **「rewards-first / 零歡迎禮」資訊架構呈現** — 對標 Thrill「無歡迎禮、強調持續返饋」的敘事，把 ApexWin 既有返水/reload/cashback 在錢包頁聚合成「你的持續返饋」儀表（今日/本週累計回饋），強化長期價值感。工作量 **S**。

## 備註
- 本檔多來源交叉（cryptomaniaks / provencrypto / cryptoslate / worldpokerdeals 評測 2026），官網直連被 CDN 擋（ECONNREFUSED/403），數據以多篇評測共識為準；VIP 段位名（Base→Emerald）與解鎖門檻取自 cryptomaniaks 詳評，後續刷新可再驗證。

---

## 🔄 2026-08-03 複查（平台軌·tier-3 到期刷新）

**取材**：casino.org / cryptomaniaks / worldpokerdeals / cryptoslate / webopedia / sportsgambler 2026 評測交叉（官網仍被 CDN 擋，維持 06-29 的多來源共識法）。

**淨新增量＝回饋率的「計價基準」**（本輪唯一真新缺口）：
- Thrill 的 Instant Rakeback 明載為「**up to 70% rakeback on the house edge of every bet you place**」——即時計算、隨時自 rewards dashboard 領取。
- 計價基準是 **house edge**（該注對莊家的理論價值），**不是押注額**。
- 制度骨架同步定型：刻意**不做**傳統 100%-up-to-1BTC 註冊配對金，改把所有玩家（新舊一律）導入 8 階／16 級（Base → Obsidian）Rewards Program＝即時返水 + 滾動現金紅利 + 升級獎 + reload + VIP host；另有淨損 **10% lossback**、推薦人抽被邀者所產生 **house edge 的 10%**。
- 大廳 IA：Thrill Originals / Slots / Live Casino / Game Shows / Table Games，2,300+ 遊戲（Pragmatic / Hacksaw / Evolution / NetEnt / Quickspin / 3 Oaks / Slotmill / Red Tiger / BGaming…）。

**ApexWin 對照（本輪實測，非臆測）**：
- ApexWin `HL.rakeback`（`core/progress.js:246 rbAccrue`）＝`bet × VIP段位率 × happyhour倍數`，**全遊戲一律同率、與該遊戲莊家優勢無關**。
- 後果（實測 `core/edge.js` 的 EDGE 表配 RB_RATES）：同一個率在 1.00% edge 的 originals 家族＝**吐回莊家收入的 30%**，在 3.7% edge 的 slot＝只吐 **8%** ⇒ **同一制度對不同遊戲的實際慷慨度差 3.75 倍**，且方向與平台意圖無關（純屬「基準選錯」的副作用）。
- 更關鍵：`progress.js:233` 的既有註解自己寫著「返水率 ≥ 莊優＝結構性虧損」——但**現行架構無法機械保證這件事**（率是常數、edge 逐遊戲不同）。假站頂段 1.8%×happyhour 2× ＝ 3.6%，對 1% edge 的 Dice 即 **360% of house edge**（假站刻意慷慨、依 §11 非 bug，但正說明「無結構性護欄」）。
- 改用 edge 基準後該不變量變成**數學恆真**（rakeback = edge × pct，pct<1 ⇒ 永不可能超過 edge）。

**⇒ 開卡 #60**（見 BACKLOG）。與 Mega Dice 本輪發現為**兩平台獨立收斂**。

**未開卡（依去重紀律）**：lossback 10% 已由 #48 損失保險覆蓋；referral 10% 已由 #58 覆蓋；VIP 段位功能解鎖門禁（06-29 點子 2）仍未做但非本輪新訊號，留佇列自然排序。

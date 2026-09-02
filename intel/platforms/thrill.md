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

## 🔄 2026-09-02 複查（平台軌·tier-3 到期刷新·資安輪）

**取材**：thespike.gg / bitdegree / cryptoslate / provencrypto / worldpokerdeals / coinbettors / cryptomaniaks / webopedia / cryptogamble 2026 評測交叉（官網仍被 CDN 擋，維持多來源共識法）。

**本輪的取材鏡頭刻意換成「玩家保護」**（該維度 2026-08-16 才補進 sourcing 清單，見 SKILL 第 1 步的警語），因為本輪台帳輪替到**資安**分類。

**淨新增量＝一則「反面形制」：Thrill 的責任博弈工具是全站最薄的一環**
- **帳戶安全**：SSL/TLS（SHA-256）＋ **2FA（Google Authenticator）**；**但無「不明 IP／提款」的 email 告警**。
- **責任博弈**：自我排除**有**（最短 24h 起，可往上加長）且運作順暢；**但無自助儲值限額、無注額限額、無 session 時長限額、無 timeout、無活動提醒（reality check）** ⇒ 多家評測直接判定其責任博弈水準「極低」，且明指缺的是**面板上的限額滑桿與自動冷靜期**。

**ApexWin 對照（本輪實測，非臆測）**：
- **我方在「工具齊備度」上完勝**：七種限額型別（loss-daily／wager-daily／bet-single／time-daily／deposit-daily/weekly/monthly）＋暫停註冊表兩 kind（cool 3 檔／exclude 4 檔含永久）＋reality check ＋全部自助 ⇒ Thrill 缺的每一項我方都有。**故本輪在「有沒有這個工具」這條軸上零缺口、不開卡。**
- ⭐ **但這面鏡子照出了另一條軸**：評測衡量的是「**工具存不存在**」，而本輪台帳自審問的是「**工具攔不攔得住**」——**這兩件事在我方是分開壞掉的**。詳見下節，這是本輪真正的產出。

**⭐ 本輪真缺口（在自審而非取材中查獲）：限額的「執行面」沒有蓋滿，而「記帳面」蓋滿了**
- `layout/streamer.js`（子母畫面 PiP 跟注）**真扣餘額、真派彩、真記中央結算點**，卻**完全不問 `HL.rg`** ⇒ 玩家在**自我排除進行中**照樣跟得下去。
- 而通往 PiP 的按鈕就在整頁直播間**那顆已經被擋住的跟注鈕旁邊**（`views/liveroom.js` 的「📺 切換子母畫面」）⇒ **被擋 → 換個表面 → 照下**。
- **外部同型佐證**：BBC 2019 調查記錄過一名已自我排除的玩家「**改一下自己的姓名拼法就又賭得下去**」——同一家族（排除在某一條路上成立，第二條路沒被蓋到）。⇒ 我方這一格**不是理論風險，是業界反覆出現的實體失效模式**。
- 修法與常駐鎖見 BACKLOG 2026-09-02 平台軌條目；**本輪已修並落地**。

**未開卡（依去重紀律）**：
- 「不明 IP／提款 email 告警」＝Thrill 自己也缺，且我方 `帳戶安全自助中心` 模組（absent）的 **#125** 已涵蓋「登入活動／裝置與 session 清單」⇒ 不重複開卡，僅把 Thrill 記為**第三個獨立佐證**（此前為 Stake 一手 + 2026 平台側材料）。
- 限額工具本身我方全備 ⇒ 無卡可開。

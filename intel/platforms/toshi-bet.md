# Toshi.bet — 調研檔

- **URL**：https://toshi.bet
- **調研日期**：2026-06-29（首次）
- **tier**：2 ｜ **priority**：72 ｜ **regions**：global
- **category**：crypto, casino, originals, gamification
- **定位**：2023 上線的 no-KYC crypto casino，自述「以最佳易用性 + 獎勵系統 + 遊戲化打造最具吸引力的賭博體驗」。5,000+ 遊戲、Tron/Solana 穩定幣秒出。**核心真金/匿名/無牌照＝avoid，僅取遊戲化與 UX**。

---

## 特色表（聚焦純前端可學）

### 遊戲/Originals — Toshi's Dojo
- 自研 provably-fair 套件：**Crash、Mines、Plinko/Marbles、Limbo、Dice、Coin Flip、多人 Roulette**。
- 第三方：Nolimit City、Evolution、Pragmatic、Hacksaw 等 5,000+。
- 自述設計準則：快節奏、可調風險、即時結果（fast gameplay / adjustable risk / instant results）。

### 留存系統 — 遊戲化（招牌）
- **XP / 等級**：每注得 XP，升等解鎖更大獎勵。
- **🔑 Daily Dollar / Daily Dollar Hunt**：依等級每日可領「Daily Dollar」現金額（等級越高領越多），在 Rewards 儀表板/下拉領取。**Daily Dollar Hunt 為 Toshi 獨有的額外尋寶式日獎層**。
- **主題化 VIP 階梯**：以生物命名（Tadpole → Fish → …），初始門檻 wager 2,500 由 Tadpole 升 Fish，逐階解鎖頂級 VIP。
- **Rewards Calendar 獎勵日曆**：升等現金獎、每週獎入「rewards calendar」可視化領取。

### 週期獎勵
- **升等/升階獎金**：每達新等級/階即發現金入餘額 + 日曆。
- **每週 cashback（週五）**：依前 7 天活躍/押注發現金。
- **🔑 Rakeback Boosts（時間窗口型）**：每日 **3 次**，固定於 UTC 6am / 2pm / 10pm 解鎖，限時拉高返水率。
- 歡迎禮：首三存 200%/150%/100%（avoid，real-money deposit）。

### 金流/模式（avoid，僅記錄）
- crypto-only、no-KYC、秒出（Tron/Solana 穩定幣）、無正式牌照、VIP 實物獎（手錶等）曾傳縮水爭議 — 屬牌照/合規/真金範疇，**僅學前端機制**。

---

## ApexWin 對照

| Toshi.bet 有 | ApexWin 現況 |
|---|---|
| Dojo Originals（Crash/Mines/Plinko/Limbo/Dice/CoinFlip/Roulette） | ✅ 多數已有（五天王 + 輪盤）；**Coin Flip 尚缺** |
| XP/等級 + 升等獎金 | ✅ #6 VIP 等級 + 升級獎金 |
| 每日返水 | ✅ #22 Rakeback 每日領桶 |
| 每週 cashback | 近似 #22/未獨立週桶（候補項已記 rakeback 週/月桶） |
| **時間窗口型獎勵 boost（每日 3 個固定時段）** | ❌ **缺口**：#22 是「24h 日桶」非「固定時段限時 boost」 |
| **Rewards Calendar 可視化領取日曆** | ❌ **缺口**：ApexWin 領取分散在各模組，無統一日曆視圖 |
| **主題化遊戲生物 VIP 命名階梯** | ⚠️ 部分：#31 微等級在排隊，但缺「主題化命名」沉浸感 |
| Daily Dollar Hunt 尋寶式日獎 | 近似 #17 Lucky Spin / 每日任務，但無「等級放大的固定日領現金」 |

---

## 可落地點子（pure-frontend，餵 evolve）

1. **時間窗口型獎勵 Boost（每日數個固定時段限時加成）** — 對標 Toshi Rakeback Boosts（每日 3 時段）；在固定時段（如 12:00/18:00/22:00）開啟限時返水/任務 ×N 窗口，附「下個 boost 倒數 / 進行中」UI。延伸 #22 日桶、與 WOW Vegas Happy Hour 點子合流。**工作量 S**。
2. **Rewards Calendar 統一領取日曆** — 對標 Toshi rewards calendar；把分散的 #1 簽到 / #17 Lucky Spin / #18 Raffle / #22 Rakeback / #24 Reload 整合進一個「可視化日曆 + 一處全領」儀表板，提升領取摩擦↓與回訪。**工作量 M**。
3. **主題化 VIP 命名階梯（沉浸感層）** — 對標 Tadpole→Fish 生物階梯；給 `HL.vip` 既有段位疊一層主題化命名/圖示（純展示層，不改派發），強化爬階沉浸感。與 #31 微等級相乘。**工作量 S**。
4. **新 Original：Coin Flip 拋硬幣** — 對標 Toshi's Dojo Coin Flip；最輕量的 provably-fair 即時遊戲，複用 `HL.instant` + `HL.fair`（近 Limbo），補可玩數。**工作量 S**。

> 最關鍵缺口：**① 時間窗口型限時 boost**（與 WOW Vegas Happy Hour 雙平台共識，催「特定時段回訪」）＋ **② Rewards Calendar 統一領取日曆**（ApexWin 領取已分散在 5+ 模組，整合 ROI 高）。

---

## 🔄 刷新 2026-07-30（tier-2 逾期 1 天補刷）

**定位 reconfirm**：續為「成長最快 / 最快出金」的 no-KYC crypto casino + sportsbook（sub-2 分鐘出金、Toshi's Dojo 自製遊戲）。核心（真金/no-KYC 合規）仍屬 `avoid`。

**本輪淨新訊號**：

1. **rakeback 無門檻 + 可被限時放大**：2026 評測指其 5% rakeback **自註冊即生效、無最低押注門檻**（對比多數平台要 $10,000+ 累積），另有需啟用的「**50% Rakeback Boost**」特別優惠；VIP 含 level-up 獎勵 / rakeback boosts / 每日獎 / 每週抽獎 / leaderboard races。
   - **ApexWin 對照**：`HL.rakeback`（#8）已是無門檻即時回饋、`HL.raffle`(#18)/`HL.tournament`(#15) 已覆蓋每週抽獎與排行榜賽 ⇒ **本項不是新缺口，而是既有卡 #52「促銷 opt-in +限時返水加成(rakeboost)」的第三個獨立平台共識訊號**（原為 bet365 opt-in + Rollbit 時間窗階梯兩家）。⇒ **本輪處置＝不開新卡，改為替 #52 加註共識強度**（三平台獨立收斂），提升其排序權重。
2. **三段式歡迎序列**（首存 200% / 二存 150% / 三存 100%）：ApexWin 有 reload 但無「跨前三筆存款的遞減歡迎序列」。屬 **活動** 分類的小缺口，記錄於此待該分類輪替時審（本輪審的是 金流 分類）。

**本輪判定**：**零新開卡**（依 CONTROL 去重紀律：訊號歸併到既有 #52 而非重複開卡）。既有 4 個點子中「時間窗口型 boost」已由 #52 涵蓋、「Rewards Calendar」已於 #49 落地；剩「主題化 VIP 命名階梯」(S)、「Coin Flip original」(S)。

**下次到期**：2026-08-29（+30 天）。

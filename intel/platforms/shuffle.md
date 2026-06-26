# Shuffle — 平台調研檔

- **URL**：https://shuffle.com （社交版 https://shuffle.us）
- **調研日期**：2026-06-26（首次）
- **tier**：3（priority 68）
- **regions**：global
- **category**：crypto, casino, originals, sportsbook

---

## 特色表（聚焦純前端可學）

### 遊戲 / Originals
- **11 款自製 Originals**：Crash、Roulette、Plinko、Mines、Wheel… RTP 最高 99%，全部 provably fair（可自行驗算）。
- 平台總量 15,000+：Originals + slots + live casino + game shows。
- → ApexWin 的 Originals 五天王（Dice/Limbo/Crash/Mines/Plinko）+ Wheel(Lucky Spin) 基本對齊，無明顯新玩法缺口。

### 留存系統（重點缺口來源）
- **9 級 VIP**：Bronze 起即享 **instant rakeback**（即時返水，無流水、無等待，$1,000 注 ×1% → $10 立即可提）。
- **多週期 reload 固定紅利**：每個 VIP 階各有 **daily / weekly / monthly reload**（固定額、按週期可領）。
- **level-up bonus + tier-up bonus**：升級即發、跨大階再發。
- 個人客戶經理（高階，屬營運非前端）。

### 促銷 / 紅利 / 賽事
- **$100k Weekly Race**（招牌）：以總押注爬榜，**每週**結算，top 20 分獎池（第1名 $40,000 → 第20名 $100，BTC 派發無流水）。即時 leaderboard。
- **Daily / Weekly Challenges**：設定具體目標（命中某倍數、完成 N 局、達到某 payout）→ 達標領對應獎金（數百~數萬）。「beat a multiplier target while wagering ≥ min bet」型挑戰。
- 社交版 shuffle.us：Daily/Weekly Wager Race（Gold Coins / Shuffle Coins 雙幣），sweepstakes 模式。

### UX / 上手
- 響應式設計，桌機/行動皆順，載入快，免 App；遊戲/促銷/帳戶皆三兩下可達；乾淨直覺佈局。

### 金流 / 模式（**僅記錄，CONTROL.avoid，不推進**）
- 真金 crypto + SHFL token airdrop + 雙幣 sweepstakes（.us）→ 真金流 / 代幣，屬 avoid。

---

## ApexWin 對照

| Shuffle 特色 | ApexWin 現況 | 判定 |
|---|---|---|
| Originals（Crash/Mines/Plinko/Wheel/Roulette） | 五天王 + Lucky Spin + 輪盤皆有 | ✅ 已有 |
| Provably fair 可驗算 | #16 `HL.fair` 已上線 | ✅ 已有 |
| Instant rakeback | `HL.rakeback` 即時累積 | ✅ 已有（#22 將加每日領桶） |
| 週賽 wager race / top-20 leaderboard | #15 錦標賽/Slot Race（即時排行+階梯派彩） | ✅ 已有（賽制近似） |
| 週期大獎抽獎 | #18 Raffle 每週開獎 | ✅ 已有 |
| **VIP daily/weekly/monthly reload 固定紅利** | VIP 只有升級獎金，**無週期 reload 可領** | ❌ **缺口** |
| **level-up + tier-up 雙層獎金** | 有升級獎金，無跨大階 tier-up | ⚠️ 半缺 |
| **多倍數目標型挑戰（命中 X 倍領獎）** | 每日任務以下注/贏/押注計，**無「命中倍數目標」挑戰** | ❌ **缺口** |

---

## 可落地點子（pure-frontend）

1. **VIP 週期 Reload 領取中心（daily / weekly / monthly）** — 對標 Shuffle 9 級 VIP 的固定 reload。在既有 `HL.vip` 上，依等級給三檔週期固定紅利（沿用 #17 Lucky Spin 的 daily-gate + #18 Raffle 的週期倒數模式），到期可領入 `HL.bonus`。**工作量 M**。與 BC.Game/Roobet 的分桶返水共識，ROI 高。
2. **多倍數目標型挑戰（Multiplier Challenges）** — 對標 Shuffle Daily/Weekly Challenges。新增一類任務：「在 X 遊戲命中 ≥N 倍」即解鎖獎金，掛既有 `HL.liveStats.record`（已帶單局倍數）判定。補足 ApexWin 任務只計次/計額、缺「技巧型目標」的維度。**工作量 S–M**。
3. **tier-up 大階獎金** — 在升級獎金外，跨越大階（如 Bronze→Silver 段）再給一筆較大 tier-up bonus，強化長期爬階動機。**工作量 S**（擴 `HL.vip` 既有升級派發）。
4. **週賽「我的名次 + 距前一名差距」即時提示** — Shuffle 週賽強調 live standings；可在 #15 錦標賽排行榜加「再押 NT$X 即可超車上一名」提示，提升競賽黏著。**工作量 S**。

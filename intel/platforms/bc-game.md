# BC.Game (bcgame.com) — 調研檔

- **調研日期**：2026-06-26
- **tier**：1（全球頂級 · 7 天刷新）
- **regions**：global / asia
- **category**：crypto / originals / casino
- **定位**：2017 起的 crypto 賭場，8,000+ 遊戲，主打**任務/抽獎/Lucky Spin 等高頻每日鉤子**與社群。

## 特色快照

### 遊戲 / Originals
- BC Originals：Crash、Plinko、Dice、Hi-Lo、Wheel、Keno 等 + 大量 slots/桌遊。

### 留存系統（這家的強項）
- **VIP / Rakeback**：$1 押注起算；VIP 5 起 Originals 每注**即時返還 100% 房屋優勢**為 rakeback；含 cashback、實體豪禮（旅遊）。
- **Daily Tasks / Quest Hub**：每日+每週任務（登入、首注、設 2FA、驗信箱、試新遊戲類、押注里程碑、參加活動），完成發 BCD。任務輪替。
- **Lucky Spin（每日幸運轉盤）**：儀表板內每 24h 一次免費轉，獎品依 VIP 等級變好（最高每日 1 BTC）；VIP 8 起升級也送轉。轉盤獎金 60x 流水。
- **Welcome Lottery / Weekly Lottery（抽獎）**：每週 150 名分 $20k 獎池，靠每日押注自動拿券（單日 $100+、某日破 $1,000 拿額外券）；歡迎彩 $100k Jackpot 靠完成每日任務累積（≥$10 有效注領券）。
- **Daily provably-fair 鏈上彩票**：每期結果可驗證。

### 促銷 / 紅利
- **Shitcode（兌換碼）**：限時促銷碼，輸入即解鎖免費旋轉 / bonus credit / 特定幣加碼。← 經典低成本拉新/回流鉤子。

### 金流 / 模式（⚠️ CONTROL.avoid，只記錄不推進）
- 純加密、多幣別。

## ApexWin 對照

| 項目 | BC.Game | ApexWin 現況 |
|---|---|---|
| VIP / Rakeback | ✅（VIP5 返 100% edge）| ✅ HL.vip + HL.rakeback（係數可參考其曲線）|
| 每日任務 / Quest | ✅ 日+週、輪替 | 🟡 有每日任務(#6)，**缺週任務/輪替任務池** |
| **Lucky Spin 每日轉盤** | ✅ | ❌ **缺**（有簽到 streak，無「轉盤式」每日獎勵）|
| **Weekly Lottery / 抽獎券** | ✅ 押注換券 | ❌ **缺** |
| **Shitcode 兌換碼** | ✅ | ❌ **缺**（無兌換碼輸入框）|
| Provably Fair | 鏈上彩票 | ✅ 已做 #16（Dice/Limbo/Plinko），**未涵蓋彩票**|
| 每日簽到 | （Lucky Spin 取代）| ✅ HL.rewards |

## 可落地點子（pure-frontend，餵給 evolve）

1. **每日 Lucky Spin 幸運轉盤**（對標 BC.Game）：每 24h 一次免費轉，獎品池依 `HL.vip` 等級放大，中獎入 `HL.bonus`，UI 旋轉動畫 + 今日已轉/倒數。與既有簽到並存或整合。**工作量 S–M**。← 高頻每日鉤子、純前端、爽度高。
2. **兌換碼系統（Promo / Redeem Code）**：大廳/錢包加「輸入兌換碼」框，比對碼表（localStorage / 內嵌設定）發 `HL.bonus`，每碼限領一次、可設到期。**工作量 S**。← 行銷/回流神器、實作極輕。
3. **每週抽獎 Lottery（與 Stake 點子1 同源、可合併做一個系統）**：押注經中央掛鉤換券、週期開獎。**工作量 M**。
4. **週任務 + 輪替任務池**：擴充現有每日任務為「日/週 + 隨機輪替」，提高回訪。**工作量 S**。

## 跨平台共識（兩家都有 → evolve 應優先）
- **每日轉盤式獎勵**（BC.Game Lucky Spin）＋ **押注換券的週期抽獎**（Stake Raffle / BC.Game Lottery）＝ 兩大頂級平台共有、ApexWin 皆缺、且純前端可做、直接掛 `HL.liveStats.record` 中央點。**最高優先**。

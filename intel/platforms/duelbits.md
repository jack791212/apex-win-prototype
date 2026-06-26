# Duelbits — 調研檔

- **URL**：https://duelbits.com
- **調研日期**：2026-06-26
- **Tier**：3（新興/利基 crypto，30 天刷新）
- **Regions**：global
- **定位**：crypto casino + sportsbook；主打**長期返水（rakeback）優先於短期紅利**的 VIP 哲學，Originals 自製遊戲線完整，並有少見的 **PvP「Duel」對戰模式**。

## 特色表（聚焦純前端可學）

### 遊戲 / Originals
- **Duelbits Originals**：Crash、Dice、Plinko、Mines、Hi-Lo、Keno、**Moonshot**、Roulette、Blackjack，外加刮刮樂、彩票、**duel modes（對戰模式）**。
- **Dice Duels（PvP 1v1）**：玩家對玩家的骰子對戰（over/under 預測），主打「全站最透明」。**這是 ApexWin 完全沒有的 PvP 維度**——目前所有 Originals 都是單人對莊。

### 留存系統（招牌）
- **Ace Lounge / Ace's Rewards**：入門即可用的永久 cashback 系統，依押注沿等級階梯漸進發放。
- **四桶 rakeback 結構**：
  - **Instant Bits** — 即時返水（up to 10%）
  - **Daily Bits** — 每日返水（5%–12.5%）
  - **Weekly Bits** — 每週返水（5%–12.5%）
  - **Monthly Bits** — 額外月度獎勵
- **VIP 階梯**：Rookie → … → Ace → **Duelbits King**，純押注累積推進；rakeback 率由 5% 起，封頂 12.5%。

### 促銷 / 紅利
- **Weekly Originals Tournament**：每週 $10,000 獎池，玩 Crash/Mines/Plinko/Blackjack 等計分。
- **Daily & Weekly Leaderboards** + **Drops & Wins**。

### 金流/模式（只記錄，**不推進** — CONTROL.avoid）
- 真金、加密入金、KYC、提款 — 牌照範疇，不開卡。

## ApexWin 對照

| Duelbits 有 | ApexWin 狀態 |
|---|---|
| Originals：Crash/Dice/Plinko/Mines/Roulette/Blackjack | ✅ 全有 |
| Originals：**Hi-Lo / Keno / Moonshot / Towers 類** | ❌ 缺（Towers 已開卡 #23；Hi-Lo/Keno/Moonshot 未有） |
| **PvP Duel（1v1 對戰）** | ❌ 完全缺：ApexWin 無任何玩家對戰維度 |
| 四桶 rakeback（Instant/Daily/Weekly/Monthly） | ⚠️ 部分：`HL.rakeback` 有即時；**日桶待做 #22**；週/月桶未規劃 |
| VIP 多階 + 押注推進 + rakeback 隨階上升 | ✅ 已有 5 段 `HL.vip` + `HL.rakeback`（係數綁等級） |
| 週賽 $10k + 日/週排行榜 | ✅ 已有錦標賽 #15 |

## 可落地點子（pure-frontend）

1. **PvP 對戰模式：Dice Duel（vs Bot）** — 對標 Duelbits Dice Duels。新增 1v1 對戰：玩家下注後與「對手（首版可 mock bot，沿用 #15 leaderboard bot 模式）」比骰，贏家通吃。複用 `HL.instant` 下注面板 + `HL.fair` 可驗證亂數確保透明。**為 ApexWin 開出全新 PvP 維度**，與既有單人 Originals 互補。工作量 **M**。
2. **rakeback 週/月桶（補齊四桶結構）** — 對標 Duelbits Instant/Daily/Weekly/Monthly Bits。在 #22（日桶）之上規劃週/月返水桶，形成「即時即爽 + 日/週/月回訪鉤」完整層級。建議併入 #22 設計時預留桶位。工作量 **S**（與 #22 共構）。
3. **新 Original：Hi-Lo 比大小** — 對標 Duelbits/多數平台共識 Original。猜下一張牌比當前高/低、連對累乘、隨時兌現（機制近 Mines/Towers 互動回合）。大量複用 `HL.instant` + `HL.fair`，補可玩遊戲數。工作量 **M**。
4. **新 Original：Keno** — 對標 Duelbits Keno。10×8 號碼盤選號 + 開獎命中倍數表，純前端 RNG（接 `HL.fair`）。工作量 **M**。

> 與既有任務的關係：點子 2 與 #22 直接相依，應合併考量；點子 1（PvP）是**差異化最大、ApexWin 完全空白的維度**，建議列為下一輪 evolve 高優先候選。Towers（#23）已涵蓋一款互動 Original，Hi-Lo/Keno 為後續補強。

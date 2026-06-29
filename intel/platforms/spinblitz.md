# SpinBlitz — 調研檔

- **平台**：SpinBlitz（Spin Blitz）
- **url**：https://spinblitz.com
- **調研日期**：2026-06-29（首次）
- **tier / regions**：T3 · northamerica, global
- **定位**：B-Two Limited（Hello Millions / Jackpota 同集團）營運的美國雙幣社交/sweepstakes 賭場，2024 由 Scratchful Casino 轉生。純前端社交模式（無真金）＝與 ApexWin GC/SC 定位高度貼合。

---

## 特色表（聚焦純前端可學）

### 雙幣經濟 / 註冊禮
- 雙幣：**Gold Coins（GC，純娛樂）** + **Sweeps Coins（SC，可兌獎）**。
- 註冊禮：7,500 GC + 2.5 SC；Day-1 登入再 +200 GC / +0.1 SC（合計首日 7,700 GC + 2.6 SC）。
- 首購包：130,000 GC + 60 free SC / $29.99（真金購買＝avoid，只記錄）。
- 兌獎門檻：禮品卡需 ≥10 SC、現金需 ≥75 SC（需 wager + KYC＝avoid）。

### ⭐ 招牌：三層 Blitz Jackpot（含「社群共享」維度）
- **三層彩池**：Hourly（每小時掉落，最頻繁）/ Daily（每 24h 一次、池更大）/ **Blitz Community（社群池）**，每池隨每次遊玩貢獻持續長大。
- **貢獻制**：每轉貢獻「GC 餘額的 0.5% 或 100 GC 取大者」，**均分進三個彩池**。全體玩家自動參加。
- **🔑 社群池分配（與一般 winner-takes-all 的根本差異）**：社群池觸發時，**50% 給觸發者，另 50% 平分給「近 24h 內有貢獻」的 100 名隨機玩家**。→ 讓「最近有玩」的所有人都覺得自己是利害關係人＝強社群留存鉤。
- **時間型掉落**：Hourly/Daily 屬「依時間排程必掉」型，與 per-bet 機率型互補。

### 其他留存
- **遞增式每日登入禮**：Day-1 1,500 GC + 0.2 SC，後續逐日加碼（escalating，非定額）。
- 旋轉式 promotions、player perks。

### 遊戲 / 供應商
- 第三方 slots + 桌遊為主（Swintt、Iconic21 等）；無自研 Originals 主打。

### 金流 / 模式（avoid，只記錄）
- sweepstakes 雙幣、真金購買 GC 包、SC 兌現需 KYC／部分州禁＝法規層 avoid。

---

## ApexWin 對照

| 維度 | SpinBlitz | ApexWin 現況 |
|---|---|---|
| 雙幣 GC/SC | ✅ 核心 | ✅ 已是 GC/SC 定位 |
| 累積彩金 Jackpot | ✅ 三層 | ✅ #9 三級 MEGA/MAJOR/MINI（**per-bet 機率觸發、winner-takes-all**）|
| **社群共享彩池** | ✅ 觸發者 50% + 100 名隨機近期貢獻者 50% | ❌ **完全缺**（彩金只給命中者一人）|
| **時間排程型掉落**（Hourly/Daily 必掉）| ✅ | ❌（#9 為純機率，無「依時間必掉」）|
| 遞增式每日登入禮 | ✅ 逐日加碼 | ⚠️ #1 有每日簽到 streak，但是否逐日加碼獎勵待確認（多半為固定/連續天數鏡頭）|
| 自研 Originals | ❌（純第三方）| ✅ ApexWin 反而更強（7+ Originals）|

**最關鍵缺口**：**「社群共享彩池」維度**——ApexWin 的 #9 Jackpot 命中只派給一個人，缺「一人觸發、雨露均霑給近期所有活躍玩家」的社群分配模式。這是把既有彩池機制延伸出社交黏著度的高 ROI 點。

---

## 可落地點子（pure-frontend）

1. **社群共享彩池 Community Jackpot（在 #9 上加第四級「社群池」）** — 對標 SpinBlitz Blitz Community Jackpot。
   - 在既有 `HL.jackpot` 加一個「社群池」：累積到門檻或懶觸發時，**50% 給觸發的真玩家、50% 平分給「近 24h 有下注」的 N 名（含 mock bot + 真玩家）**。命中演出列出「與你同分得獎的 100 人」名單滾動。
   - 加速器：複用 `HL.jackpot` 遞增/命中演出 + `HL.liveStats.record` 判定「近期有貢獻」+ #15 leaderboard 的 bot 命名/頭像池湊滿名單。純前端零牌照。工作量 **M**。

2. **時間排程型彩金掉落 Hourly/Daily Drop（必掉倒數）** — 對標 SpinBlitz Hourly/Daily Jackpot（也與 LeoVegas Ready-to-Drop 候補項共識）。
   - 為 `HL.jackpot` 某一級加「每小時/每日必掉一次」的倒數呈現（懶觸發、到期把當前池額派給近期一名活躍者）。把純機率彩金補上「看得到倒數、時間到一定掉」的期待感。
   - 加速器：沿用 #18 Raffle 的週期倒數 + 懶觸發冪等開獎模式。工作量 **S–M**。

3. **遞增式每日登入禮（簽到逐日加碼）** — 對標 SpinBlitz escalating daily bonus。
   - 若 #1 簽到目前是固定獎勵，升級為「連續天數越多、單日獎越大」的階梯表（斷簽歸零）。強化連續回訪動機。
   - 加速器：擴既有簽到 streak 的派發表即可，沿用 daily-gate。工作量 **S**。

---

## 來源
- [PlayUSA SpinBlitz Review 2026](https://www.playusa.com/sweepstakes-casinos/spinblitz/)
- [Casino.org SpinBlitz Review](https://www.casino.org/us/sweepstakes-casinos/spin-blitz/)
- [Dimers — Blitz Jackpot Win 50,000 SC With Hourly & Daily Drops](https://www.dimers.com/sweepstakes-casinos/loot/spinblitz-blitz-jackpot-win-50000-sc-with-hourly-and-daily-drops)
- [SweepsKings — SpinBlitz Community Jackpot vs Winner-Takes-All](https://sweepskings.com/guides/spinblitz-community-jackpot-vs-winner-takes-all-jackpots/)

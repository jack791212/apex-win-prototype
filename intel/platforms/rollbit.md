# Rollbit (rollbit.com) — 調研檔

- **調研日期**：2026-06-26
- **tier**：2（地區頂級 · 14 天刷新）
- **regions**：global
- **category**：crypto / casino / originals / trading
- **定位**：crypto casino + 槓桿交易（Futures）+ NFT 的三合一混合平台；以「自製 X-系列 Originals + RLB 代幣經濟 + 社群對戰」為差異化。

## 🔄 2026-07-10 刷新（reconfirm + 兩處 nuance）

本輪（T2 14 天到期）重查，**核心定位與可學缺口全數維持**，追加：

- **Rakeback 費率更新**：多家 2026 評測改口徑為「每注自動返 **10–20%**」（原記 5% 全押注 + Originals 50% instant）。屬**費率描述刷新**，不改「自動、高頻、無前置大禮、聚焦終身價值」的機制本質 → ApexWin `HL.rakeback` 已同構，**非新缺口**。競品續強調 **$1M/月排行榜、Daily/Weekly/Monthly reload、Daily Races** → 對應 ApexWin #15 錦標賽 / #22 日桶返水，**已涵蓋**。
- **Duel Arena（新 Original，RuneScape 風 0% edge 1v1 PvP 戰鬥）**：兩玩家各 990 HP，輪流出拳（可格擋、1~112 傷害含爆擊），血量歸零者輸、贏家收走賭注；provably-fair、最低 $10、可押 cash/RLB/NFT。**機制上＝把「1v1 對賭」包成一層 HP 戰鬥動畫**。→ **強化既有 #30 Dice Duel（1v1 PvP，ApexWin 唯一 PvP 空白）+ Duelbits Dice Duels + 本檔 Bonus Battles 的 PvP 共識**；戰鬥 HP 呈現只是 UI 皮，非新軸線。**NFT 質押/RLB 賭注端＝avoid，只取『1v1 對賭 + 戰鬥揭曉動畫』前端骨架**。
- **結論**：本輪為 **reconfirm**。標準未解缺口續為 → X-Roulette 倍數輪盤 Original（無卡，S–M）、Rakeback header 快領下拉（無卡，S）、VIP 細分子級（27 級觀感，S–M）、Bonus Battles/Duel 式 PvP（併入 #30 Dice Duel 候補）。

## 特色快照

### 遊戲 / Originals
- **X-Crash / X-Roulette**：自製可驗證公平玩法。X-Roulette = 輪盤外觀但帶**倍數機制**（與傳統輪盤不同的數值玩法），Rollercoaster 亦同家族。
- **Bonus Battles（紅利對戰）**：社群玩法——多名玩家**買入同一個 slot bonus 回合**，比拼總贏額排名。屬「共享回合 PvP」競技。
- **Game Shows**：30+ 款（Crazy Time、Monopoly、Lightning Dice、Balloon Race…，多為供應商真人）。

### 留存系統
- **Rank-Up Bonus（VIP）**：27 級 / 7 段位（Bronze→Silver→Gold→Platinum→Diamond→Blood Diamond），門檻以累積押注計（Bronze L5 ~$30k 起）。**層級粒度遠細於一般 5 級**。
- **Rakeback**：全押注 5% 返水 + Originals 50% instant rakeback、0% house edge；**每 30 分鐘**可從下拉選單或 Rewards 頁領取。
- **RLB Lottery**：質押 RLB 代幣入抽獎池，獎池由平台每日利潤 20% 撥入分配（⚠️ 代幣/質押屬 avoid 範疇，只記錄）。

### 促銷 / 紅利
- Rakeboost（提升返水率）、週期促銷碼。

### UX / 上手
- **高密度行動 UI**：底部導覽 3 大產品（casino / sportsbook / crypto 衍生品）一鍵直達。
- **深色「Bloomberg 終端」風**：炭黑底 + 點綴光，資訊密度高、偏專業交易感。

### 金流 / 模式（⚠️ CONTROL.avoid，只記錄不推進）
- 純加密；含真槓桿交易（Futures）、NFT、RLB 代幣質押——皆需牌照/真金流，不推進。

## ApexWin 對照

| 項目 | Rollbit | ApexWin 現況 |
|---|---|---|
| Originals 五天王 | 部分 | ✅ Dice/Limbo/Crash/Mines/Plinko |
| **X-Roulette（倍數輪盤 original）** | ✅ | ❌ **缺**（有標準歐式輪盤 #7b，無倍數型 X-Roulette original）|
| **Bonus Battles（共享回合 PvP 對戰）** | ✅ | 🟡 有錦標賽 #15（個人積分），無「多人買入同回合比總贏額」對戰 |
| VIP / Rakeback | ✅ 27 級 + 30 分領 | ✅ HL.vip(5 級) + HL.rakeback（VIP 面板領）|
| Rakeback 快速領（下拉/週期） | ✅ 每 30 分下拉領 | 🟡 僅 VIP 面板領，無 header 下拉快領 |
| 週期抽獎 | ✅(代幣質押) | 🟦 #18 Raffle 實作中（不走代幣，押注換券）|
| Game Shows | ✅ 供應商真人 | ❌（屬供應商接入 = avoid）|

## 可落地點子（pure-frontend，餵給 evolve）

1. **Bonus Battles 對戰模式**（對標 Rollbit Bonus Battles）：多名玩家（真玩家 + mock bot）買入**同一場限定回合**，以本回合總贏額排名分獎池。可複用 `HL.tournament` 排行榜/派彩 + `HL.liveStats.record`，差異是「同回合、買入制、比單場總贏」而非長時積分賽。**工作量 M**。← 社群競技差異化、純前端、與 #15 共骨架。
2. **X-Roulette 倍數輪盤 Original**（對標 Rollbit X-Roulette）：複用 `HL.instant` 單注引擎 + 環形倍數段（非標準賠率桌），落點派倍數。與既有歐式輪盤 #7b 區隔、補 Originals。**工作量 S–M**。
3. **Rakeback 快速領下拉**（對標 Rollbit「每 30 分下拉領」）：header 加返水快領下拉，顯示可領額 + 倒數，一鍵領入餘額；底層直接接既有 `HL.rakeback`。降低領取摩擦、提高回訪頻次。**工作量 S**。
4. **VIP 細分段位（27 級觀感）**（對標 Rollbit Rank-Up）：在現有 5 大段位內加子級進度（如 Bronze I–V），升子級即發小獎，強化「下一級就到」的推進感。掛現有 `HL.vip`。**工作量 S–M**。

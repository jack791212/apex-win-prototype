# BC.Game (bcgame.com) — 調研檔

- **調研日期**：2026-07-03（刷新）／ 初調 2026-06-26
- **tier**：1（全球頂級 · 7 天刷新）
- **regions**：global / asia
- **category**：crypto / originals / casino
- **定位**：2017 起的 crypto 賭場，8,000+ 遊戲，主打**任務/抽獎/Lucky Spin 等高頻每日鉤子**與社群。

## 🔄 2026-07-03 刷新（本輪頭號情報 · 全新缺口軸線）

### ⭐ BC Engine（2026-04 上線）＝「押注即質押 → 每小時被動 drip 派息」引擎
BC.Game 把獎勵從「一次性紅利」升級為**持續性的每小時被動收入**，是本輪最值得學的全新維度：
- **賺取公式**：`有效押注 × 房屋優勢 × 10% = 即時取得 $BC`（不需任何 VIP 門檻、全員可用；VIP 越高 $BC 累積越快）。
- **自動質押**：取得的 $BC **自動 auto-stake**，形成一個**會持續生息的本金池**（不是會過期的桶）。
- **每小時派息**：質押的本金**每小時**派發一次 BCD（平台穩定幣）到帳＝**一天 24 個回訪觸點**；**零流水要求**（no wagering req）、隨時可提。
- **鎖倉規則**：本金需質押滿當前整點才算該輪；**7 天內提前解質押罰 1% 銷毀**，滿 7 天全額無損返還。
- **儀表板欄位**（可直接對標的 UX）：`Your Stake（本金）`／`Your Earnings（累計收益）`／`Unclaimed Earnings（待領）`／`Next Payout（下次整點倒數）`／`Stakers Have Earned（全站累計）`。

**與 ApexWin 對照**：ApexWin 有 **#22 Rakeback 每日領桶（24h 逾期作廢）**、**#8 rakeback**、**#33 淨損 cashback（候補）**——但**全部是「桶會清空/事後結算」模型**。BC Engine 是**根本不同的三點**：①**本金會累積且持續生息**（不清空、越玩越大），②**每小時 drip 節奏**（vs 每日一次，回訪觸點 ×24），③**「被動收入/質押」的敘事 + 本金與收益即時跳動的儀表板**。→ **ApexWin 全空白的新留存軸線＝「押注質押被動收入引擎」**。

### 其他 2026 更新
- **VIP 8 起，每次升級加送一次免費 Lucky Spin**（升級愈多、免費轉愈多）＝可把 ApexWin #17 Lucky Spin 綁到 #29 VIP 升級事件（與 Stake 共識，S）。
- **Quest Hub**：3 個每日任務 + **一組滾動的每週任務**（各 0.1–0.7 BCD）。ApexWin #6 為每日任務，**「每週/滾動輪替任務池」仍是既有缺口**（前輪已記，續確認）。

### 本輪新可落地點子
- **A.（頭號）押注質押被動收入引擎 `HL.engine`**（對標 BC Engine）：有效押注經中央掛鉤 `HL.liveStats.record` 依 `bet × edge × k%` 累積「引擎積分」→ 自動歸入一個**持續本金池**→ **每小時 drip 派一筆入 `HL.bonus`**（懶觸發：讀取時依「距上次派息經過幾個整點」補派、冪等）→ 儀表板顯示本金/累計收益/待領/下次整點倒數（即時跳動）。可選 7 天軟鎖。**工作量 M**。**⚠️ 與 #20 流水引擎相依**：這是「往 `HL.bonus` 灌錢」的**又一新來源**、且是高頻 drip，會複利放大 #20 缺口；建議 evolve 開卡時標明「派彩走 `HL.bonus`，待 #20 上線改走流水記帳、玩法邏輯不改」。
- **B. VIP 升級贈免費 Lucky Spin**（Stake/BC.Game 共識）：#17 ↔ #29 掛鉤，升級觸發額外免費轉。**工作量 S**。
- **C. 每週/滾動輪替任務池**：擴充 #6 每日任務為「日 + 週 + 隨機輪替」，提高週回訪。**工作量 S**。

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

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

---

## 2026-07-31 刷新（平台軌 catchup 輪 · 逾期 5 天補刷）

**定位不變**：新興 crypto casino + sportsbook，Curaçao 牌照、5,000–10,000+ 遊戲、匿名 + 2–15 分鐘出金。

**校正既有記載**：
- VIP **9 階**（Wood/Bronze/Silver/Gold/Platinum/Sapphire/Ruby/Emerald/Diamond）**確認不變**，純押注量自動晉級、無邀請制；rakeback 自第 1 階即生效並逐階遞增，高階解鎖 loss-back / reload / **Level Up Reloads（升階即自動入帳）**。
- Originals 由舊記 **11 款 → 13 款**（provably fair，官方稱與玩家社群共同開發）。
- 週賽仍為 **$100k Weekly Race**；另有 $150k Vegas WSOP Invitational（需達合格押注門檻）。

**舊記三缺口已全部關閉**（本輪 grep 實證，非推測）：
- 「VIP 週期 reload」→ `core/reload.js` 已落地。
- 「多倍數目標型挑戰」→ `core/challenges.js` 已落地（檔頭即註明對標 Shuffle，單局 `win/bet` 達門檻累進）。
- 「tier-up 大階獎金 / 週賽名次提示」→ VIP 與 #15 錦標賽已覆蓋主體。

**淨新訊號（本輪唯一真增量）＝「首位完成者獨得」的限量挑戰**：
Shuffle 的 challenges 除了個人達標型，另有一類明載 **「the first player to complete a challenge will win」／週任務要「be the first to catch a specified bet multiplier」**——獎品是**單一名額、先搶先贏、被領走即消失**，而非人人達標人人有獎。
- **ApexWin 對照**：`core/challenges.js` 的 DAILY 三條（2×/10×/50×）是**純個人日常**——每位玩家各自累進、各自 claim，`claimed` 只記自己，**沒有任何「名額」或「已被誰搶走」的概念**；`HL.tournament` 是排名分潤（人人有份、只是多寡）。⇒ **「稀缺性/競逐同一份獎」這條軸線 ApexWin 完全空白**。
- 為何值得：這是與「人人有獎」正交的留存力學（製造即時上線動機與錯過成本），且純前端可做（假站以既有 bot/假玩家模式模擬被搶走，比照 arena sim / tournament bots 的 `isLive()` 閘）。→ 本輪開卡 **#57**。

**未達開卡門檻、僅記錄**：Highest Multiplier Challenges（Hacksaw 專屬遊戲、搶前 50 高倍）＝上述限量機制的變體，同一張卡涵蓋。

---

## 2026-08-30 重新調研（平台軌 08:00 窗｜到期複查｜維度＝前端UI/UX 配對取材）

**本輪取材角度**：同 wow-vegas，本窗以「**前台外觀/瀏覽層**」為鏡頭重讀（台帳輪替到 `前端UI/UX`）。

**訊號（多份 2026 評測共識）**
- 介面被列為本站強項：乾淨、快、低延遲，**依 provider 與 game type 過濾 + 快速搜尋**，各裝置平均載入 <1.5s。
- 反面訊號一則（誠實記下）：新玩家會覺得**功能與獎勵的密度一開始偏亂**（"busy appearance … overwhelming at first"）。
- 自研 Originals 線：Crash / Mines / HiLo / Chicken / Dice / Plinko / Limbo / Keno / Blackjack / Wheel / Shuffle Roulette / Waifu Tower。
- 代幣 SHFL 驅動 airdrop / races / weekly lottery；獎勵模型走 **no-wagering rakeback + reload**，非單一黏性 welcome bonus。

**ApexWin 對照（本輪逐項機械複驗）**

| Shuffle 前台瀏覽層 | ApexWin 現況（可複跑） |
|---|---|
| 快速搜尋（遊戲/供應商） | ✅ `views/casino.js:186–192` 搜尋框 + **220ms 防抖**；`:41` 比對 title/provider/**author 暱稱**三欄 |
| 依 provider / game type 過濾 | ✅ `:110–119` provider 列可點即成過濾詞；分類 tab + `author:` 過濾（目標 2 的暱稱軸） |
| Originals 自研線 | ✅ Apex Studio originals + 同仁放置區；本庫 Crash/Mines/HiLo/Dice/Plinko/Limbo/Keno/Wheel 皆已有對應款 |
| no-wagering rakeback / reload | ✅ `core/rakeback.js`（綁 VIP 係數）＋ `core/reload.js` 皆已落地（前輪確認） |
| 代幣/airdrop 經濟 | ⏸️ 屬 `CONTROL.avoid`（真金/代幣發行），僅記錄不推進 |

**本輪結論＝乾淨的負向結果，據實記錄**：Shuffle 這次被評測點名的前台強項（搜尋、雙軸過濾、載入速度）
**在本庫已全數有對應出口**，且不是概念相似而是同形（連「搜尋同時比對供應商」這個細節都一致）。
⇒ **本輪不從 shuffle 開卡**。這一筆的價值在於它把 `大廳/遊戲牆` present 的判定**第一次以對手同形制逐欄對表**確認過，
而不是只靠本庫自審——先前該模組的 evidence 三輪都在辯論「佔位卡 51 筆」這件內部帳，從未對過外部形制。

**一則對 ApexWin 有效的反面訊號（比正面訊號更值得記）**：Shuffle 被評「功能與獎勵密度對新手偏亂」。
本庫的密度只多不少（VIP/任務/獎金錢包/簽到/收藏/返水/累積彩金/錦標賽/季票/公會/成就/保險/促銷…），
而本庫已有的解法是 `HL.dock` 佈局底座（可開關/可收合/可拖曳）＋ #93 導覽入口註冊表（未做）。
⇒ 這條**不另開卡**（#93 已是同一出口，開卡即雙胞胎——比照 08-26 20:00 窗訂下的「開卡前先對本庫既有純函式層做反向搜尋」紀律），
但把它記成 **#93 的一條外部佐證**：導覽入口過載不是本庫特有的整潔問題，是這個品類共通的 UX 稅。

**回填**：`last_investigated=2026-08-30`、`next_due` 依 `refresh_interval_days` 順延。

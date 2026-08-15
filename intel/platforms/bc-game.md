# BC.Game (bcgame.com) — 調研檔

- **調研日期**：2026-07-17（刷新）／ 2026-07-10（刷新）／ 2026-07-03（刷新）／ 初調 2026-06-26
- **tier**：1（全球頂級 · 7 天刷新）
- **regions**：global / asia
- **category**：crypto / originals / casino
- **定位**：2017 起的 crypto 賭場，8,000+ 遊戲，主打**任務/抽獎/Lucky Spin 等高頻每日鉤子**與社群。

## 🔄 2026-07-17 刷新（僅記與 07-10 不同處 · 1 個淨新缺口）

### ⭐ Coco Find / Catch Coco（隱藏吉祥物限時彈出 · intra-day 預約型獎勵）＝全新可學維度
BC.Game 招牌吉祥物 Coco（鱷魚）**每 6 小時**在大廳/遊戲庫**隨機位置彈出一個短時窗口**（約 60 秒～10 分鐘），玩家**在窗口內點中它**即**即時**入帳一筆 BCD：
- **獎勵公式**：`Coco 基礎獎 × 2% ×（VIP 等級 × 10% + 1）`（VIP 越高越多、14+ 最佳），**0x 流水**、入帳即可用/可提。
- **為何是新軸線**：ApexWin 現有高頻鉤子皆為「**每日一次/週期一次**」節奏（簽到 streak、每日任務 #6、Lucky Spin 候補、#35 Happy Hour 時段盒）——**完全沒有「一天內多次（4 槽）、在指定短窗口內主動 spot & tap 隱藏物件」的 intra-day 預約/驚喜出現型獎勵**。它同時觸發三種留存力：①**intra-day 多次回訪**（每 6h 一窗＝一天 4 次登入誘因）→ 正呼應 07-14 雷達浮現的「**session 內即時發獎優於 24h 批次**」訊號 + Roobet Vault 每日 3 槽 intra-day 共識；②**大廳探索**（必須正在瀏覽才找得到）；③**點擊揭曉爽感**（複用 #38 揭曉型領獎 + #17 隨機派發）。
- **與既有卡關係**：與 #35 Happy Hour（限時段盒）相鄰但角度不同——Happy Hour 是「時段內下注加成」，Coco 是「短窗口內主動找+點=一次性領獎」，不需下注、純出席獎勵。

### 本輪新可落地點子
- **E. 隱藏吉祥物限時彈出獎勵 `HL.spotReward`（對標 BC.Game Coco Find）**：每 6h（可設）在 shell/大廳的隨機位置，於窗口內冒出一個小吉祥物/圖示約 60 秒，點中即入 `HL.bonus`（金額依 `HL.vip` 縮放、0x 流水、每窗限領一次）；localStorage 記錄上次領取的窗口序號防重領；懶觸發（讀取時依「距上次經過幾個 6h 整窗」決定當前窗是否已領）。**工作量 S–M**。**⚠️ 與 #20 流水引擎相依**：又一 `HL.bonus` 來源，evolve 開卡時標明「待 #20 上線改走記帳、玩法不改」。**建議 evolve 評估**：與 07-14 雷達「intra-day 即時發獎」＋ Roobet Vault 每日多槽形成跨源共識，是目前少數真正 ApexWin 空白的高頻留存軸線。

**其餘皆 reconfirm**：BC Engine（押注質押被動收入引擎，07-03 頭號情報，續運轉）、Welcome Shield（首局損失保險，07-10 記）、Lucky Spin（每日轉盤，續；新增「註冊前可先玩、最高贏 $5」拉新細節）、Quest Hub 日+週任務、Shitcode 兌換碼——與前輪一致，無變更。

## 🔄 2026-07-10 刷新（僅記與 07-03 不同處 · 1 個淨新缺口）

### ⭐ Welcome Shield（首次遊戲局損失保險）＝全新可學維度
BC.Game 2026 把獎勵系統重整為「daily / weekly / monthly + level-up bonus + **Welcome Shield**」，其中 Welcome Shield 是**過去未記錄的新鉤子**：
- **內容**：新玩家**第一次遊戲 session** 給予損失保護——**淨輸的 20% 退回（loseback），最高退 $1,000，0x 流水**（退回即為可提取餘額、無附加條件）。
- **與既有 cashback 的關鍵差別**：ApexWin #33（淨損 cashback，候補）與各家 rakeback 都是**常態、週期性**結算；Welcome Shield 是**「僅限首局、一次性、限定新手」的損失保險**——目的是把「新玩家第一次就大輸→立刻流失」這個最脆弱的時刻用安全網接住。這與 **#28 新手限時啟用窗口**（已落地：6h 窗口 + 首注/簽到雙任務）**角度互補**：#28 是「引導完成前幾個動作」，Welcome Shield 是「保護前幾個動作不因手氣壞而勸退」。
- **BC Engine 追蹤驗證**：BC Engine（07-03 頭號情報）上線數週已派發 **$2.1M+ BCD**、$BC 觸及歷史新高——**佐證「押注質押被動收入引擎」方向的真實留存吸引力**（點子 A 的市場驗證），非新缺口。

### 本輪新可落地點子
- **D. 首局損失保險 `Welcome Shield`**（對標 BC.Game）：偵測玩家**首個 session**（或首註冊後 N 分鐘/首 M 注窗口），窗口內累計淨損的 X%（如 20%）在窗口結束時一次退回 `HL.bonus`、設封頂、0x 流水、限領一次。**建議掛進 #28 新手窗口內**（同一 FTUE 生命週期、共用倒數/儀式），不另開獨立管道。**工作量 S–M**。**⚠️ 與 #20 流水引擎相依**：又一 `HL.bonus` 來源，evolve 開卡時標明「待 #20 上線改走記帳、玩法不改」。

**其餘皆 reconfirm**：VIP5 返 100% edge、Quest Hub 日+週任務、Lucky Spin、Weekly/Welcome Lottery、Shitcode 兌換碼——與 07-03 一致，無變更。

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

## 2026-07-27 深挖刷新（platform 軌·次逾 07-24 到期補跑）
多訊號交叉（btcgambling / tech-insider / covers / bcgame-ng / win.gg）：**2026 重大改版「BC Engine + Revenue Sharing」**。
- ① **XP/等級系統重構＝XP 依「每局實際成本（house edge／理論損失）」計**，策略型/低-edge 遊戲終獲對等 XP。⇐ 對照 ApexWin 現行 `HL.vip.addWager` 為**平權流水記點**（每 $1 wager 等值），**新可學缺口＝成本加權 XP/VIP**（不同 RTP 遊戲對 VIP 進度貢獻不同）。純前端可做（結算已知 bet 與遊戲類型 → 掛 `HL.liveStats.record` 尾端以每遊戲 edge 係數加權 addWager）。**工作量 M**。
- ② **72 小時新手安全網＝前 3 日虧損 20% cashback、無流水綁定**。與 #28 新手窗口／#33 cashback 相鄰但角度＝**限時損失保險**（onboarding 留存鉤）。**工作量 S–M**。
- ③ VIP 全面重建、年度多場 VIP 賽事、L7 公共聊天 Coin Drops（≈既有 rain 灑幣）、L8 玩家互 tip；④ 150+ 幣種、10,000+ 遊戲、新增 Novomatic/Spinomenal/Spadegaming/JILI slot、BC.Game Esports 部門。
- 淨新缺口＝**成本加權 XP** + **限時新手損失保險**（已寫入 platform-modules 台帳待開卡）；其餘（coin drops/tipping/quest/lottery）ApexWin 已覆蓋。
- `last_investigated`→2026-07-27、`next_due`→2026-08-03。

## 2026-08-10 深挖刷新（platform 軌 20:00 窗；tier-1、`next_due` 08-11 與 stake 並列全庫最早到期）

**本輪對 ApexWin 的淨新缺口＝0。四項逐一查證，兩項本來看起來像新的、實查皆已覆蓋。**（據實記零增量，不硬湊缺口。）

- **Roll Competition＝每日榜前段「split a shared prize pool」**：⚠️ 這**不是**本輪 stake 那條「達標即均分」——它仍是**依名次分配一個固定池**，而 `core/tournament.js:50` 的 `prizeFor(rank)=Math.round(POOL*SPLIT[rank-1])` **正是同一個形制** ⇒ **已覆蓋**（本輪 #83 只收 stake/shuffle 的「門檻資格 + 均分」那一支，不把這條算成佐證）。
- **Lucky Spin「獎額依 VIP 段位與進度放大（最高至 5 BTC）」**：實查 `core/luckyspin.js:27-29` ＝ `vipIdx()` → `VIP_MULT[...]` → `prizeAt(i)=SEG[i].amt * mult()` ⇒ **段位縮放本來就在**、**已覆蓋**（這是本輪第二筆「看似新其實已有」，同 08-10 catchup 輪 bet365 的 `wagerFree`／`HL.shop` 兩筆——**先 grep 再斷言**的紀律連續生效）。
- **Quest Hub 日/週任務**：`HL.tasks`（#6）＋ `HL.challenges`（#26）已覆蓋日/週兩層。**Weekly Lottery/Raffle（池常破 $20k）**：`HL.raffle`（#18）已覆蓋。
- **四段儲值紅利（首四筆合計最高 470%）＋ 專屬 VIP host／實體贈品**：前者屬**真金儲值誘因**（ApexWin 的 `pushDemoTxn` 為 Demo 儲值、真站待牌照）、後者需人工營運 ⇒ **皆屬 CONTROL.avoid，只記不開卡**。
- ⇒ **本站本輪增量歸零（第 1 筆）**。⚠️ 但它是 **tier-1 旗艦**，依 08-07 立下的 `saturated` 判準需「連續 ≥2 輪增量歸零」才可汰除，且 tier-1 汰除應更保守（同 bet365 的 `saturation_watch` 處置）⇒ 本輪只記 **`saturation_watch: 1/2`**、不動 `refresh_interval_days`。
- `last_investigated`→2026-08-10、`next_due`→2026-08-17。

來源：[bitcoin.com review](https://www.bitcoin.com/gambling/reviews/bc-game/)、[banklesstimes](https://www.banklesstimes.com/casinos/bcgame-review/)、[sportsgambler lucky spin](https://www.sportsgambler.com/review/bc-game/lucky-spin/)、[gamechampions lucky spin](https://www.gamechampions.com/en/reviews/bc-game/bonus/lucky-spin/)

---

## 2026-08-15 深挖刷新（平台軌 08:00 窗 · 提前 2 天做掉 08-17 到期票 · **增量歸零第 2 筆 ⇒ saturation_watch 2/2**）

**逐項對照（五個當期獎勵軸，全數已覆蓋或屬另一垂直）**

| BC.Game 現況 | ApexWin 對照 | 判定 |
|---|---|---|
| 週/月 cashback，依 wagered，最高淨損 **25%** | #33 `HL.cashback` 週桶 + VIP 分段（假站 5–15%／真站 2–6%）；月桶由 #91 `HL.reload` 的 Daily/Weekly/Monthly 檔期軸承接 | **已覆蓋**（兩半都有容器） |
| 每日轉盤，獎額依 VIP 段位放大 | #17 `HL.luckyspin`（08-10 已實查 `luckyspin.js:27-29` vipIdx()→VIP_MULT→prizeAt=SEG.amt*mult()） | **已覆蓋**（「看似新其實已有」第 3 次） |
| crash 錦標賽 + 排行榜獎池 | #15 `HL.tournament`（含 #85 計分軸） | **已覆蓋** |
| BC Engine 成本加權 XP／72h 新手安全網 | #50 `HL.edge`（22 款 edge 係數加權 VIP/賽季經驗）／#48 損失保險 | **已覆蓋**（08-04 即判定，本輪僅複核未變） |
| 體育書加成、VIP 22+ 每週體育紅利（最高 $1,000） | ApexWin **無體育書產品線** | **另開一個垂直，不是缺口** ⇒ 只記錄 |

⭐ **08-04 記下的唯一開放缺口本輪確認已關閉**：當時的淨新缺口＝「支援/透明度中心」（把『錢與帳號發生什麼事』做成可讀的公開面，而非只藏在客服對話）——**已由 2026-08-14 落地的 #72 `HL.support` 關閉**（規則的擁有者各自註冊說明、`body` 一律函式當場求值、可搜尋面板、側欄「更多」由 `comingSoon` 死巷改真入口）。

**處置：刻意不採 `status: saturated`（tier-1 旗艦保守紀律）**
本筆 08-10 自己寫下的判準是「即使達 2/2 也建議只延長 `refresh_interval_days` 而非改 status」——理由是旗艦改版頻率高，且它是多數 `Stake alternatives` 榜的**基準點**，汰掉會失去對照基線。本輪遵守該紀律：
- `refresh_interval_days` **7 → 21**（釋出調研配額，但保留旗艦監看）
- `status` 維持 `done`、`next_due` → 2026-09-05
- ⚠️ **因此 active 計數不減（仍 33 > CONTROL 的「≤ 約 32」）**——bc-game 這條路徑**結構上無法**幫 active 降下來。要降只能汰 tier-3：最近的一張是 `cybet`（`saturation_watch` 1/2，08-14 起算），其次是 08-30 到期的 shuffle／gamdom／duelbits。

**淨新缺口＝0，不開卡。** `last_investigated`→2026-08-15、`next_due`→2026-09-05。

來源：[jaxon.gg BC.Game VIP 2026](https://www.jaxon.gg/gambling/bc-game/vip/)、[bcgame-ng.org VIP levels](https://bcgame-ng.org/vip/)、[BTC Gambling — BC Engine 2026 upgrade](https://btcgambling.com/bc-game-launches-major-2026-upgrade-introducing-the-bc-engine-and-revenue-sharing/)、[sportytrader review](https://www.sportytrader.com/en/betting-sites/bc-game/)

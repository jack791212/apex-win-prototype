# Stake.us — 調研檔

- **平台**：Stake.us（Stake 的美國社交/sweepstakes 版）
- **url**：https://stake.us
- **調研日期**：2026-06-29
- **tier**：2　**priority**：80
- **regions**：global, northamerica
- **category**：social, sweepstakes, originals, casino
- **定位**：純前端社交模式（無真金博弈），雙幣制（Gold Coins 純娛樂 + Stake Cash 可兌獎）。**與 ApexWin GC/SC 定位最貼合的對標。**

---

## 特色表（聚焦純前端可學）

### 雙幣經濟（核心）
- **Gold Coins (GC)**：純娛樂、**永不可兌換**，故無流水要求。
- **Stake Cash (SC)**：可兌獎，**帶 3x playthrough（流水）**——bonus SC 需玩過 3 倍才轉成可提取餘額。
- 兌獎（真金/禮卡）= 牌照範疇 → **avoid，只學前端記帳/流水/雙餘額呈現**。

### 留存系統
- **每日登入**：固定 10,000 GC + 1 SC，登入後到 Wallet 一鍵領，無需碼。
- **31 天延展歡迎包**：歡迎禮 250k GC + 25 SC（輸入碼領），其餘 310k GC + 31 SC 要**連續登入 31 天逐日解鎖**（首月最高 560k GC + 56 SC）——典型「長尾連登階梯」。
- **每日挑戰**：完成任務領 GC + SC。
- **Slot races / 賽事 / 社群贈獎**頻繁。

### 促銷：Bonus Drops（招牌、ApexWin 最缺）
- 每天在站外（X / Telegram / Instagram）+ 站內掉**限時兌換碼**，**單筆 1–5 SC、會過期、要搶在失效前領**，於 `Settings > Offers` 兌換。
- **每週六 10:00 EDT 老闆「Eddie」在 Kick 直播**釋出高價值碼（5–50 SC）——把「限時掉碼」與**直播**綁定的病毒鉤子。

### 遊戲 / Originals
- 18 款 Stake Originals：Crash / Keno / Limbo / Plinko / Wheel / Scarab Spin…+ 2,000+ 第三方（Hacksaw 等）。
- 流水友善玩法引導（Dice 設 98% 勝率低風險刷流水、Plinko Low 8–10 排穩刷）——**把流水要求做成「玩法引導」而非懲罰**。

### UX
- 沿用 Stake 乾淨深色資訊架構；Wallet 為領獎中樞。

---

## ApexWin 對照

| 維度 | Stake.us 有 | ApexWin 現況 |
|---|---|---|
| 雙幣制（GC 純娛樂 / SC 帶流水可兌） | ✅ 核心 | ⚠️ 有 casual/real 模式 + 單一 HL.money，**無 GC/SC 雙餘額 + 流水分離**（=待批准 #20 流水引擎缺口） |
| 每日登入領獎 | ✅ 固定 + 31 天延展 | ✅ 7 天簽到 streak（**但無連登長尾階梯/里程碑日**） |
| 兌換碼 | ✅ **限時、會過期、頻掉** | ✅ #19 Redeem（**靜態碼表、不過期、不推播**） |
| 每日挑戰領獎 | ✅ | ✅ #6 每日任務（已涵蓋） |
| Originals | ✅ 18 款 | ✅ 7 款（Towers/Hilo/Keno 已排佇列補） |
| 直播掉碼 | ✅ Eddie 週六直播 | ⚠️ 有虛擬主播 + 直播間（**未與掉碼/領獎綁定**） |

---

## 可落地點子（pure-frontend）

1. **限時 Bonus Drop 掉碼系統（招牌缺口）** — M。把 #19 靜態 Redeem 升級為「**排程掉碼**」：碼帶 `start/expire` 時戳 + 倒數，到期作廢；掉碼時經 `HL.notify` 推播紅點 + 通知中心一條「⏰ 限時禮包，X 分後失效」，導去輸入框。對標 Stake.us Bonus Drops。複用既有 `HL.redeem` + `HL.notify` + #17 daily-gate 計時 + #22 逾期作廢模式。
2. **連登長尾階梯 + 里程碑日** — S–M。現有 7 天簽到擴成「**遞增獎勵 + 第 8/15/22/30 天里程碑大禮**」（Stake.us 31 天 / Crown Coins 里程碑日共識）。複用既有簽到 streak 狀態，純加值。
3. **直播間掉碼綁定** — S–M。把點子 1 的限時碼**在直播間/主播 PiP 浮層彈出**（對標 Eddie 週六直播放碼），觀看直播時專屬掉落 → 把既有虛擬主播從「裝飾」變「領獎入口」，與留存相乘。
4. **GC/SC 雙幣 + 流水呈現** — L（**=已待批准 #20**）。Stake.us 的 SC 3x playthrough 正是 #20 紅利/流水引擎要做的「bonus vs cash 分離 + 流水進度」；本調研**強化 #20 優先度**（兌獎本身=avoid，只做前端記帳/進度條/閘控）。
5. **流水「玩法引導」而非懲罰** — S。在帶流水的 bonus 旁提示「用 Dice 98% / Plinko Low 低風險刷流水」捷徑（待 #20 上線後接）。

> **最關鍵缺口**：①限時/會過期的 **Bonus Drop 掉碼**（ApexWin 兌換碼是靜態的，缺「限時搶領」的緊迫感與推播）；②**連登長尾階梯 + 里程碑日**（簽到只有平 7 天循環）。

---

## 2026-07-13 刷新（re-investigate）

- **reconfirm 既有招牌**：每日登入 10,000 GC + 1 SC（首 30 天累積上看 300k GC + 30 SC）、Bonus Drops 仍為每日站外/站內掉限時碼（1–10 SC、無流水），核心缺口（限時掉碼 vs #19 靜態碼、連登長尾階梯）**不變、續為本檔最高優先**。
- **新訊號（非新缺口）＝Daily Race 每日免費積分賽**：每日 50,000,000 GC 獎池、**開玩即自動入賽**、每局推進排行榜、賽末 **top 100** 分獎。→ **ApexWin 已有 #15 錦標賽/Slot Race（即時 leaderboard + 獎池階梯派彩）覆蓋此軸線**，故**不開新卡**；可借鑑的細節＝「**開玩即自動入賽**（免報名）」+「每日固定循環」的呈現，作為 #15 上線後的體驗微調素材。
- 另確認 weekly/monthly reload 與 VIP 活躍度獎勵存在（與既有 #29 VIP / reload 佇列重疊，無淨新）。

> **本輪結論**：Stake.us 已是成熟對標，無淨新缺口；既有兩大缺口（限時 Bonus Drop 掉碼、連登長尾階梯+里程碑日）維持最高優先，交由 evolve 消費（與 crown-coins 里程碑日為同一張合併卡）。

---

## 來源
- [Stake.us Bonus Drop Codes July 2026（TheLines）](https://www.thelines.com/casino/sweepstakes/stake-us/bonus-drop-codes/)
- [Stake.us Daily Login Bonus（VegasInsider）](https://www.vegasinsider.com/sweepstakes-casinos/stake-us/login-bonus/)
- [Stake.us Daily Bonus（Strafe）](https://www.strafe.com/esports-betting/reviews/stake-us/daily-bonus/)
- [Stake.us Review 560K GC + $56 SC（Casino.org）](https://www.casino.org/us/sweepstakes-casinos/stake/)
- [Stake.us Bonus Drop Codes（Next.io）](https://next.io/sweepstakes-casinos-us/stake-us/bonus-drop-codes/)
- [Stake.us Bonus Drops（Deadspin）](https://deadspin.com/sweepstakes-casinos/reviews/stake-us/bonus-drop-code/)
- [Stake.us 官網](https://stake.us/)

---

## 2026-07-28 刷新（re-investigate · 逾 07-27 到期）

- **reconfirm 既有招牌**：每日登入 **10,000 GC + 1 SC**（tap lobby daily bonus）、註冊禮 250k GC + 25 SC、**Daily Race 5,000 萬 GC 獎池 / 開玩即自動入賽 / top 100 分獎**、SC **3× playthrough** 才可兌獎。皆為既有記錄，無變化。
- **VIP 階梯校正**：實為 **Bronze → Silver & Gold → Platinum I-III → Platinum IV-VI → Diamond I-VI → Obsidian**，門檻自 **10K wager** 起算（與母站 Stake 07-27 校正的 14 階同構）。舊檔未記細節，此處補齊。**非缺口**（ApexWin #29 VIP 階梯已覆蓋）。
- **淨新訊號＝「每週輪替促銷排程」weekly promotion schedule**：站上促銷不是一份靜態清單，而是**每週重設/換一批的排程**——raffles、races、jackpots、poker events 週期性輪替，玩家能看到「本週在跑什麼」。
  - **交叉業界共識**：多家 casino 促銷頁同時提供 **calendar view + list view**，讓玩家**預先看到即將到來的活動**並安排回訪；weekly reload 固定在特定日（常見週四）。→ 這是一條**跨平台共識的呈現層設計**，不是單站特色。
  - **ApexWin 對照**：既有 `HL.raffle`/`HL.tournament`（startAt/endAt）、`HL.happyhour`（排程型時段 boost）、`HL.season`（config 賽季排程）、`HL.safetynet`（#48 campaign 窗口）**各自都有時間窗口，但彼此不知道對方**；**無統一排程註冊表、無任何一處能看到「全部活動 + 即將到來」**。玩家只能靠逐個入口點進去猜。
  - **缺口性質＝容器（擴充性槓桿）**：對齊台帳 `促銷/活動框架 weak`「統一事件驅動 campaign 引擎（A-B/排程/分群）仍缺」的**排程軸**。→ **本輪開卡 #49 促銷排程註冊表 + 活動日曆 `HL.promoCal`**（S–M，純前端；既有模組 register 自己的窗口即上架，比照 `HL.dock`/`HL.achievements`/`HL.guild` 註冊表家族）。

> **本輪結論**：Stake.us 續為成熟對標；既有兩大缺口（限時 Bonus Drop 掉碼、連登長尾階梯+里程碑日）維持在列。**淨新＝促銷排程/活動日曆容器（#49）**。下次到期 2026-08-11。

### 本輪來源
- [Stake.us Casino Review July 2026（Casino.org）](https://www.casino.org/us/sweepstakes-casinos/stake/)
- [Stake.us Review 2026（Deadspin）](https://deadspin.com/sweepstakes-casinos/reviews/stake-us/)
- [Stake.us Review 2026（RG.org）](https://rg.org/casinos/review/stake)
- [Stake.us Review July 2026（iGamingFuture）](https://igamingfuture.com/sweepstakes-casinos/reviews/stake-us/)
- [Stake.us Review 2026（SweepsKings）](https://sweepskings.com/reviews/stake-us/)
- [Best Online Casino Bonuses & Promotions July 2026（LegalSportsReport）](https://www.legalsportsreport.com/online-casinos/bonus/)
- [Casino Promotions Calendar（Red Wind Casino）](https://www.redwindcasino.com/calendar)

---

## 2026-08-11 刷新（平台軌 08:00 窗｜tier-2、`next_due` 08-11 到期）

**⭐ 淨新＝「計分軸」——每款遊戲各自產生自己的優勝者，而不是一張全站流水榜。**

- **Weekly Wrapped**（進行中的每週檔期，本輪查得 07-24→07-31 一期）：獎池 **50,000 SC / 500,000,000 GC**，掛在**當週 10 款精選（新上市）遊戲**上；資格門檻極低（單局 ≥ .10 SC 或 1,000 GC）。
- **關鍵在於它怎麼決勝，兩條並行且都不是名次階梯**：
  - **Big Win**＝該款遊戲上**最大贏額**者得獎；
  - **Lucky Win**＝該款遊戲上**最高倍數**者得獎；
  - 平手規則明訂：Lucky Win 同倍數時比**押注額**，仍相同則**均分**。
  - 「玩家只能以一種貨幣中獎」（同時符合 SC/GC 兩池時取先入榜者）。
- **ApexWin 對照（grep 機械實證）**：
  - **它有**：每款遊戲**各自**一個優勝者、且優勝的定義可以是「最大贏額」或「最高倍數」。
  - **ApexWin 已有**：`core/tournament.js:54` `record(bet)` → `o.score += bet`＝**計分軸只有「流水」一種**；名次由 `prizeFor(rank)=POOL*SPLIT[rank-1]` 決定＝單一全站榜。`core/achievements.js:106` 有 `bestMult`／`bestWin`，但那是**個人終身門檻型成就**（`mult-10/100/1000`），不是競賽用的「本期本款最高者」。
  - **ApexWin 缺口**：`tournament` 的**計分函式是寫死的**（`score += bet`），無法宣告「本期以最高倍數計分」或「每款遊戲各結算一個優勝者」。→ **本輪開卡 #85 計分軸（`HL.scoreAxis` 註冊表 + per-game 分組結算）**。
- ⚠️ **刻意不記為 #83（均分池）的第三平台佐證**：本活動的分配法是**per-game 超群獎（每款一名）**，只有「平手時均分」那個尾巴才涉及均分，與 #83 的「所有達標者均分固定池」**不是同一形制**——不把兩平台共識講得比實情強（同 08-10 對 bc-game Roll Competition 的處置）。
- **併入既有卡、不另開**：「當週 10 款精選（**新上市**）遊戲」＝**#64 的第五平台佐證**，且它把遊戲組綁在「**本週新上市**」這個述詞上——ApexWin 的 `core/release.js`（#54）**正好已經知道哪些遊戲是新上市**，故 #64 的 `rotateEvery` 候選池可直接委派 `HL.release` 而不必另建名單（已寫入 #64 卡體）。
- 既有兩大缺口（限時 Bonus Drop 掉碼、連登長尾階梯+里程碑日）**狀態不變**；每日登入 10,000 GC + 1 SC、Daily Race 50M GC 池 top 100 分獎、SC 3× playthrough 皆複驗如舊（#15/#20 覆蓋）。

> **本輪結論**：淨新 = **計分軸（per-game 超群獎 → 開卡 #85）**；#64 得第五平台佐證並找到 `HL.release` 這個現成候選池出口。**刻意不記為 #83 佐證**。下次到期 2026-08-25。

### 本輪來源
- [Weekly Wrapped 官方活動頁（Stake.us）](https://stake.us/promotions/promotion/weekly-wrapped)
- [Stake.us Weekly Wrapped: Win on New Releases and Share 50K Stake Cash（WhichCasino）](https://www.whichcasino.com/promotions/stake-usa-weekly-wrapped-20260327-0005/)
- [Stake.us Weekly Wrapped Promo（RG.org, 2026-07）](https://rg.org/news/gambling-industry/stake-us-weekly-wrapped-promo-july-2026)
- [Stake.us Promo Code August 2026（LegalSportsReport）](https://www.legalsportsreport.com/sweepstakes-casinos/stake-us/promo-code/)
- [Stake.us Latest Bonus Code（RotoWire, 2026-08）](https://www.rotowire.com/news/stakeus-latest-bonus-code-rotowire-in-august-250000-gold-coins-25-stake-cash-125632)


---

## 2026-08-25 刷新（平台軌 08:00 窗 · 逾 08-25 到期）

**取材路線**：先照 SKILL 的教訓分兩段——**查排名才用流量榜、查維度一律用官方 Help Center**。第一段的一般性搜尋（「新功能/促銷變動」）回來的仍是促銷碼內容農場（6 筆有 5 筆是 bonus-code 導購頁），只撿到站慶事實；第二段改打 `help.stake.us` 官方條目才撈到真正的維度訊號。⇒ **08-24 20:00 窗記下的那條取材通則本輪再次驗證有效**。

### 它有 / ApexWin 已有 / ApexWin 缺口

| 維度 | Stake.us 現況（2026-08） | ApexWin | 判定 |
|---|---|---|---|
| 站慶檔期 | 四週年（2026-08-02；2022-08 上線）＝新遊戲＋撲克 jackpot＋加碼紅利同期投放 | `core/content.js` 排程內容註冊表（#61）＋促銷排程（#107/#71）已可承載檔期 | **已覆蓋**（容器在，內容是營運事） |
| 遊戲庫規模 | 2,000+ 款、**Originals 逾 30 款**（近期 Packs／Prime Dice／**Chicken**／Tarot／**Moles**／Drill） | 25 款登錄可玩；**Chicken 與 Moles 皆已復刻**（Moles 為遊戲軌 08-21 新上） | **正向交叉驗證**——遊戲軌的選案方向與對標站 originals 擴充方向重合，不是缺口 |
| Buy-in bonus | 100+ 款支援用 Stake Cash 直接買入 bonus round | 既有「購買功能」（暗影儀式 buyBaphomet／buyCursed 等） | **已覆蓋** |
| 兌換碼投放 | bonus drop code 每隔數日經官方 Telegram 投放 | 兌換碼面板（#65） | **已覆蓋**（投放通道屬營運，非前端缺口） |
| 推薦碼 rakeback | 專屬推薦碼帶 3.5% rakeback | #50 `HL.edge` 成本加權 + #58 推薦/聯盟 | **已覆蓋** |
| 每日登入 / Weekly Wrapped | 10,000 GC + 1 SC；per-game 超群獎 | #15／#20／#85 | **已覆蓋**（連三輪同一組，零增量） |
| **玩家可見度自控** | **Ghost Mode**（遊戲不進 public feed 與 game previews）／**Hidden Statistics**（隱藏帳號整體狀態與相關數據）／**Race Statistics 隱藏**（賽事榜個人表現不對外）；入口＝帳號→設定→Preferences | **零控制權** | 🆕 **缺口 ⇒ 開卡 #127 + 台帳新模組** |

### ⭐ 本輪唯一淨新訊號：玩家可見度自控（Ghost Mode）

官方 Help Center〈Controlling Visibility and Sharing〉明載三個**玩家自己可切**的曝光開關。這一格值得記，因為它問的問題是**既有六個資安模組沒有一個會問到的**：
真/假站軸問的是工程、風控問的是營運怎麼看玩家、KYC 問法遵、責任博弈問玩家怎麼管自己的錢與時間、權限角色問營運端授權、帳戶安全自助中心（08-24 新增）問玩家怎麼保護帳號——
**沒有一個問「玩家能不能決定自己出不出現在別人眼前」**。⇒ 台帳盲點第 3 例（前兩例＝08-16 玩家保護維度、08-24 商城硬寫目錄／帳號安全）。

**ApexWin 的對照事實（本輪機械查證，非推論）**：
- 會把「我」推上公開面的表面至少五個：大獎牆（`views/lobby.js` `bigWinsWall`）、全球獎 hero + 榜、競技場戰績與回放（`views/arena.js`）、聊天、錦標賽/抽獎榜。
- `grep -rniE "ghostmode|隱身|hideStats|隱藏統計|privacy"` 全 `prototype/src` **命中 1 筆**，且該筆**不是功能**：
  `data/mock-data.js:140` — `var hidden = Math.random() < 0.15; var name = hidden ? "隱身玩家" : (...)`。
  ⇒ **那是發給假玩家的 15% 機率裝飾**：大獎牆上真的會滾出「隱身玩家」，看起來這個功能存在。
  而真實會員路徑 `views/lobby.js:180` 的 `realRows` map 是 `name: r.name || "玩家"`，**連 `hidden` 欄位都沒有** ⇒ 真站玩家的名字原樣上牆、無退出鍵。
  ⚠️ **這是「grep 命中 ≠ 功能出現」的第 4 例，也是最會騙人的一種**：前三例是同詞不同義（驗證器／title／role），
  這一例是**畫面在替一個玩家用不到的功能打廣告**——它不只讓 grep 誤判，還讓**任何人在畫面上目視都會誤判**。
  ⇒ 歸入 CLAUDE.md §4「修一半而看不出來」的新形狀：**先做了裝飾、沒做功能**（前四種都是「功能做了一半」，這一種是「零功能但有完整外觀」）。

### 純前端可落地點子
1. **可見度註冊表 `HL.visibility`（S–M，容器優先）** — 每個公開表面 `register({id, name, surface})` 自陳「我會把玩家推到台前」，單一偏好閘 `HL.visibility.shows(id)` 決定「我」出不出現；表面加一行註冊即納管，**閘的邏輯一行不改**。⇒ 已開 **#127**。
2. **假玩家的 `hidden` 與真玩家的偏好收斂成同一個真相（S）** — 目前假資料自帶 `hidden`、真資料沒有；納管後兩條路徑都問同一個閘。
3. **可見度摘要列（S）** — 設定面上直接列出「你目前會出現在這 N 個地方」，而不是 N 個各自散落的開關（比 Stake 的三顆開關更可擴充）。

### 本輪來源
- [Controlling Visibility and Sharing — Stake.us Help Center（官方）](https://help.stake.us/en/articles/8570741-controlling-visibility-and-sharing)
- [Stake Help Center（官方首頁）](https://help.stake.com/en/)
- [Stake.us Marks Fourth Anniversary With New Games, Bonuses（RG.org, 2026-08）](https://rg.org/news/gambling-industry/stake-us-fourth-anniversary-2026)
- [Stake.us Casino Review August 2026（Casino.org）](https://www.casino.org/us/sweepstakes-casinos/stake/)
- [Stake.us Promo Code August 2026（LegalSportsReport）](https://www.legalsportsreport.com/sweepstakes-casinos/stake-us/promo-code/)

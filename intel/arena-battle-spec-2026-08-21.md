# 競技場 Slots Battle — 流程／節奏／資訊顯示規格（2026-08-21 前景產出）

> **這是什麼**：船長 2026-08-21 指派「競技場的流程和節奏還有資訊顯示都要優化，而且有一些顯示 BUG，
> 可以參考有類似的 web casino 怎麼做」。本檔＝一輪 14 個 agent 的產出：
> **5 份外部研究**（case battles／slot battles／揭曉節奏／game-show 節拍／PvP 大廳）
> ＋ **4 批現況稽核 → 逐批敵對複驗**（32 條存活、29 CONFIRMED）→ **合成規格**。
>
> **落檔原因**：節奏表與 IA 清單是要被後續每一輪反覆對照的東西，留在對話裡會消失。
> **逐條狀態請就地標記**（✅/🏗️/⬜），勿另開第二份真相。

## 已落地（2026-08-21 前景，commit 見括號）

- ✅ 顯示 BUG 根因：排名規則被四個表面各自硬寫成「總分越高越好」→ 新增 `core/battle-mode.js` 單一真相（`1621620`）
- ✅ 自建房雙扣（贏一場實際淨 0、卡上寫 +1,000）+ mine:false 家族（`eb5ab3c`）
- ✅ 關掉子母畫面後對戰在隱形 DOM 跑完並自行結算（`21a3beb`）
- ✅ 換頁沒收賭注／對手開打前被換掉／平手一律判你贏／對戰沒有公平入口（`dc34965`）
- ✅ 對戰中資訊顯示：名次#k/N、本輪增量、與第一名差距、常駐勝負條件、進行中/已完成（`fa16a0b`）
- ✅ 節奏五拍：承諾倒數/逐輪結果停留/決勝蓄勢/懸念/高潮 + 節拍收進 `core/battle-tempo.js`（`45e7775`）
- ✅ 彈分被硬切（預設 fast 下一輪十次殘影）+ 命中停留分級 + crazy 反向色調（`35c5a89`）
- ✅ **§5 #11**：房間淨利兩套公式（進行中 `prizePool−deposit`／結算 `−openFee`，差一個開房費）→ 收斂成單一出口 `roomNet(r)`，進行中資訊列補押金/開房費兩列使其可對帳；常駐鎖 `games/arena/room-net-single-truth`、負向擾動 4/4（2026-09-04 遊戲軌）

## 仍待做（依規格 §6 的波次）

- ⬜ **§5 #1/#2**：會員模式 F5 後戰績每列「敗 · −NT$ NaN」——伺服器 payload 缺前端讀的欄位、全 repo 無 normalize
- ⬜ **§5 #7/#8/#9/#10**：賞金池原地更新漏掉、canJoin 不重算（滿房仍寫「加入」）、大廳熱門擂台是凍結快照、房卡無 done/plays 進度
- ✅ **§5 #11**：淨利兩套公式（差一個開房費）→ 已收斂單一出口 roomNet（2026-09-04 遊戲軌，見上「已落地」）
- ⬜ **§5 #12/#21**：isBusyView 與 VIEWS.isGame 兩份真相、空狀態文案不分頁籤
- ⬜ **§2 缺的狀態**：ROOM_OPEN／SEAT_FILLING／SPECTATE／EXPIRED（房間開著等人、觀戰、逾時退款）
- ⬜ **§4.4 結算卡**：兩欄制（本局分數／派彩）、平手裁決可見化、再戰一局印原價、比分矩陣
- ⬜ **§3 #22**：跳過本輪演出（Enter／點畫面）；#7 落點抖動與中線指示器

---
# ApexWin 競技場 Slots Battle — 流程／節奏／資訊顯示規格（可直接實作）

基準版本：`HEAD = eb5ab3c` + 工作區（`prototype/src/views/vsslot.js` mtime 13:12、`prototype/src/views/game-frame.js` 已改，均未提交）。所有行號以此為準。
**已在 HEAD／工作區修掉、本規格不重修**：自建房雙扣（`arena.js:674-694` 已不扣款）、`mine:false` 導致的「加入自己的房」（`arena.js:89-90` `iAmSeated/isMineRoom` + `119-126` CTA「回到對戰 ›」）、sponsored 假承諾（`arena.js:644` 改標「示意」）、關 PiP 後孤兒對戰（`game-frame.js:190-199` closePip 真移除 stage + 呼 `onTeardown`；`vsslot.js:355`）、view 內返回連結棄局提示（`vsslot.js:80-84,173`）。

---

## 1. 對照表

| 環節 | 外部平台怎麼做 | ApexWin 現在怎麼做 | 建議 |
|---|---|---|---|
| **大廳房卡** | 付錢前必揭露：遊戲/箱組、每席入場費、模式徽章、座位「已滿/總數」+ 頭像格、**輪數與即時回合進度**（cases.gg 實測 25 秒內從 10/14 走到 12/14）、整條盤面序列縮圖、房主皇冠、私房標記、含 bot 標記、Watch 旁觀入口。狀態分「可加入／進行中（可觀戰）／已結束」三態，進行中的房**不從大廳消失** | `arena.js:92-130` 已有：模式徽章、賭注、席位格、`filled/players`、⏱ 倒數、prefs emoji。**缺回合進度維度**（結束條件 `(r.done||0)>=r.plays`，plays 固定 20、每 tick 15%，房會在 ⏱ 還剩十幾分鐘時消失，卡上無任何提示）。`updateCard:440-451` 只更新 ⏱/`.ax-rc-done`/`.ax-heat` → 賞金池凍結、`canJoin`/CTA/onClick 不重算。大廳「🔥 熱門玩家擂台」（`lobby.js:104-112`）是永久凍結快照 | 房卡加 **10 格輪次序列（已完成/進行中/未開三態）** 取代「10 輪」文字；`updateCard` 補 `.ax-room-card__prize`、重算 `canJoin` 並換 CTA 與 onClick；`lobby` 熱門擂台接 `HL.ticker`（同檔 182 已有通道，**不要新開 setInterval**）並移除已 splice 的鬼房；房卡標「含 AI 對手」與 RTP |
| **建房** | 四步：① 模式卡（每張一行白話規則）② 人數分「單人/團隊」兩組 ③ 附加 toggle（Fast/Crazy/私房/借入場費）④ 盤面排序輔助鈕（升序/降序/隨機化/清除）。底部主鈕印「建立 $X」且未選盤面時 disabled | `arena.js:592-660` 已是四區塊表單，`fast:true` 預設（593），`cost()` 已修成單一 `p.wager`（602）。模式無白話規則行；sponsored/Shared 只 toast「示意」 | 每個模式選項旁掛 `HL.battleMode.winCondOf(mode)`（**不要再自己寫字串**）；速度三檔改成建房表單第一級選項並在開賽後鎖定（同房不同節奏會讓並排比分看起來像 bug）；盤面多選加「隨機化／清除」兩鈕 |
| **等待與配對** | 公開加入窗 5 分鐘（Rollbit 明文），逾時自動解散退款；空位是**可點的 Join** 或「叫機器人」兩顆按鈕；bot 有固定人格化名字與頭像（Casey 家族）；斷線者顯示「(已斷線)」而不是消失；**等待中不准放 spinner** | `createBattle:694` 建完**立刻** `router.go("vsslot")` → `phaseSearching:117-127` 放 `ax-mm__spinner`（`components.css:1756`）+ 寫死 1500ms 假配對。房間留在大廳被 `simVsslot` 推進但零回報。**沒有「房間開著等人」這個狀態** | 新增 `ROOM_OPEN` 狀態（見 §2）：房卡 5:00 加入窗倒數、逾時退款並在通知中心留一筆；等待畫面用**席位逐格填入**取代 spinner；空位給「邀請／叫 AI 對手」兩顆鈕 |
| **開打前確認** | 硬性 commit 倒數是整套節奏的支點：cases.gg 實測 createdAt→startsAt **6.2–6.9s**（等 EOS +8 區塊）；Crazy Time 15s、Lightning Roulette 18s，歸零時荷官按開關＝「No more bets」。控件改 **disabled 而非隱藏**（讓玩家看見鎖住了） | `phaseFound:130-166` 有接受/拒絕與逐一 ✔（500ms/家，163），全員就緒後 700ms（161）直接進場。**沒有任何倒數、沒有封盤宣告、沒有種子承諾** | 新增 `LOCKED_COMMIT` 狀態：3000ms 倒數（3-2-1 逐秒 tick 變色），期間席位全亮、模式勝負條件浮現、10 個輪次格點亮成空槽、顯示 serverSeed commit hash 前 8 碼＋「種子已鎖定，房主也無法預知結果」 |
| **逐輪揭曉** | 全員同一輪開同款、並排同步；一手實作實測 **ROLL 3500–5000ms（強 ease-out）→ DWELL 500ms →GAP 200ms**；中獎格放條帶 N−5 附近做 near-miss；落點 ±40–60px 抖動；1px 中線指示器只在滾動時出現；Fast <2s/輪；Quick Unbox 瞬開 | `vsslot.js:248` N 個盤面**同一 tick 全起轉、跨盤面零錯開**；`fgboard.js:73` 滾動 `820*SP+90`、`115` 命中停留 `800*SP`、`113` 消除 `250*SP`/連爆 `80*SP`、`99` 落下 `400*SP`；`vsslot.js:246` 輪間 `380*sp`（預設 fast → **228ms**）。無中線、無抖動、無 skip、無分級 | 見 §3 節奏表。加起轉錯開 120ms/席、揭曉錯開 400ms/席（**最差者先、領先者最後**）、中線指示器、落點抖動、Enter/點畫面跳過本輪演出（只改演出不改結果與記帳時序） |
| **進行中排名資訊** | live scoreboard 逐輪累加、每人一欄 running total；每欄名次徽章 + **距第一名差距**；crash 側欄「誰還在、誰已出場」；Crazy 必須把排序方向反過來明示；排行榜只顯示領先者＋你附近那一段 | `vsslot.js:180-201`：每席只有頭像/名字/盤面/一個數字，小字**寫死「總分」**（186）。`infoBar` 只有 `Round n/10`、遊戲名、模式徽章、速度徽章。**全檔沒有 rank/lead/delta 元素**（`components.css` 只有 `.ax-vs__side.me/.opp` 兩種邊框，`is-lead` 只存在回放 1810）。名次第一次出現是結算卡 | **顯示的量必須等於排名的量**：一律走 `HL.battleMode.metricOf/leaderIndex/barFrac/winCondOf`。每席加：#k/N 徽章、本輪 +X（獨立一行）、距第一名差距（第一名顯示「+X 領先」）、領先高亮。infoBar 加常駐勝負條件一行 + 「還剩 R 輪」 |
| **勝負高潮** | 全員跑完不立刻彈結果：Rollbit 插 20s 揭曉倒數；結算是不可打斷的固定儀式「標記 → 先掃輸 → 再由外而內派贏 → 移除標記」；terminal 類在最後一箱前壓暗其他 UI | `vsslot.js:230` `rIdx>=rounds` → `finish()`，經同一個 `later(runRound, 380*sp)` 進場＝**與輪間空檔同長（228ms）**；第 10 輪與第 3 輪節奏完全一樣；結算卡 `271` 直接 append，餘額由 `escrowSettle:297` 在渲染前就跳 | 插入四拍：決勝輪蓄勢（terminal 1500ms 壓暗＋只留末輪盤面）→ 揭曉倒數 3000ms（分數定格、名次條動畫收攏成最終序）→ 敗方灰化 600ms → 獎池飛向勝方 800ms，**餘額數字必須排在動畫之後**（現在比動畫先跳＝「顯示 BUG」的體感來源） |
| **結算與後續動作** | 兩欄制：Balance（本局分數）與 Prize Won（派彩）分開列；贏家綠鈕**把金額寫在鈕上**、敗者中性/紅色「關閉」；三顆鈕：重播／**重新創建（鈕上印原價）**／返回；平手是**可見的裁決動作**（加賽輪 R11 或公平抽籤），不是靜默隨機；戰報永久可回看 | `vsslot.js:260-282` 已有名次表 + 三顆鈕（看過程/返回競技場/再來一場）+ 生涯摘要。**`268` 的第四欄在 terminal 悄悄換成 `o.last` 且無欄名**；席位面板仍掛著累計值 ⇒ 兩組互斥數字同時在畫面上；贏敗共用同一顆按鈕文案；平手由 `battle-mode.js:51-56` 比較器回 0 → V8 穩定排序 → **一律判索引 0（你）贏** | 名次表補欄名並拆兩欄（本局分數／派彩）；結算卡出現時把席位面板收成一行摘要；「再來一場」改 REBET 語意（同 mode/人數/賭注/速度，鈕上印價）；平手改 `HL.fair` 抽籤並把 roll 值印在卡上 |
| **可驗證公平揭露** | client seed 在**全員加入後**才定案（EOS block hash）⇒ 房主無法預算；nonce 是複合鍵 `eosBlockSeed-roundNumber-playerPosition`（座位由左至右 1–N）；開打前只給 hashed server seed、結束後揭真 seed；入口是小而恆在的盾牌 icon／Fairness 頁籤 + 「Verify a Game」 | `fgboard.js:16` 出象確實走 `HL.fair.floatOr("vsslot")`，但 `fair.js:91-98` 的 nonce 是**單一全域遞增計數**、無房間層 commit、無 `round:slot` 複合鍵。**且 `fair.js:209-213` 的 `PF_GAMES` 沒有 `vsslot`**，而 `game-frame.js` 的 ✓ 鈕條件是 `HL.fair.isPF(meta.key)`、`meta.key` 是 `"vsslot:<roomId>"` ⇒ **對戰外框完全沒有公平入口** | ① `PF_GAMES` 加 `vsslot`，`isPF` 改成吃 `key.split(":")[0]`；② nonce 改複合鍵 `battleId:round:seat`（seat＝畫面由左至右 0..N−1）；③ 鎖房瞬間才產生 clientSeed（全體席位名 + 加入序 + 鎖房時戳的雜湊，房主不可控）；④ 結算卡加公平面板：commit hash → 事後 serverSeed → 每格 `seed:round:seat` 字串 + 一鍵重算 10 輪×N 席 |

---

## 2. 建議流程（狀態機）

標記：**［缺］**＝現在完全沒有這個狀態；**［半］**＝有但不完整。

| 狀態 | 玩家看到什麼 | 可以做什麼 | 離開事件 |
|---|---|---|---|
| `S0 LOBBY_BROWSE` | 四頁籤（全部/我的房間/賞金局/Slots Battle）+ 房卡格線；每卡：模式徽章、賭注、席位格、**10 格輪次序列**、⏱、含 AI 標記 | 篩選、開房、加入、觀戰、看戰績 | 點卡（可加入→`S2`／已滿→`S14`／已入座→回 `S5`）、按開房→`S1` |
| `S1 ROOM_CREATE` | 模式卡（各帶 `winCondOf`）、人數、速度三檔、私房、盤面多選、底部「建立 NT$X」 | 改參數、建立、取消 | 建立成功→**`S2`（不再直接進場）**、取消→`S0` |
| **`S2 ROOM_OPEN`［缺］** | 房間頁（公開 URL）：席位格（我已就座）、空位是「邀請／叫 AI 對手」兩顆鈕、**5:00 加入窗倒數**、「種子尚未生成，房主也無法預知結果」、房主專屬「解散並退款」 | 邀請、叫 bot、解散退款、離開（房間仍開著） | 席位填滿→`S3`；倒數歸零且未滿→`S15`；房主解散→`S15` |
| **`S3 SEAT_FILLING`［缺］** | 席位逐格填入（每 380ms 一格 + pop）、每席狀態字（等待加入／已就緒） | 無（自動推進） | 最後一格亮起→`S4` |
| **`S4 LOCKED_COMMIT`［缺］** | 3-2-1 倒數（最後 3 秒逐秒變色）、「已封盤」、勝負條件全句、10 個空輪次槽點亮、serverSeed commit hash 前 8 碼 | **不能做任何事**（控件 disabled 而非隱藏） | 倒數歸零→`S5`；此刻才 `escrowTake`（硬性 commit 的唯一扣款點） |
| `S5 ROUND_SPIN(k)`［半］ | `Round k/10`、本輪遊戲名與面額、N 個盤面錯開 120ms 起轉、中線指示器 | 跳過本輪演出（Enter／點畫面）、切 PiP／全螢幕 | 全席位 cascade 完成（join barrier）→`S6` |
| **`S6 ROUND_REVEAL(k)`［缺］** | 各席位依「最差者先、領先者最後」錯開 400ms 揭曉本輪增量；分級 DWELL（小/中/大獎三檔） | 同上 | 最後一席揭曉完→`S7` |
| **`S7 ROUND_SCORE(k)`［缺］** | 本輪 +X count-up → 全部跑完才做名次條重排（transform 位移）；本輪最高者邊框閃 400ms；差距數字更新 | 同上 | 停留 `ROUND_RESULT_MS` 後：k<9→`S5(k+1)`；k=9→`S8` |
| **`S8 FINAL_ROUND_PREP`［缺］** | terminal：壓暗其他 UI、只留末輪盤面、打出「只有這一輪算分」；normal/crazy：打「決勝輪」標記 | 無 | 蓄勢時間到→`S5(10)`→`S6`→`S7` |
| **`S9 SUSPENSE`［缺］** | 分數定格、3 秒倒數、名次條動畫收攏成最終排序 | 無 | 倒數歸零→`S10` |
| **`S10 CLIMAX`［缺］** | ① 敗方 tile 灰化+劃線淡出（600ms）② 獎池數字從中央飛向勝方（800ms）③ **最後**才更新餘額數字 | 無 | 動畫結束→`S11` |
| `S11 SETTLED`［半］ | 結算卡淡入；名次表**帶欄名**且拆「本局分數／派彩」兩欄；席位面板收成一行摘要；平手時顯示 `HL.fair` 裁決 roll 值；近失（差距 ≤5%）標「差 N 分」 | 無（等玩家選 `S12`） | 玩家點任一動作鈕 |
| `S12 POST_ACTIONS`［半］ | 贏＝綠鈕印金額「領取 12,480」／敗＝中性「關閉」；「再戰一局（同設定）NT$1,000」；「看過程」；「公平驗證」；「返回」 | 全部 | 再戰→`S2`（同參數建新房）；返回→`S0`；驗證→公平面板 |
| `S13 FORFEIT`［半］ | toast「已棄局，賭注 NT$X 不退還」+ 記一筆真實敗局 | 無 | 已覆蓋：view 內返回鈕（`vsslot.js:173`）、關 PiP（`game-frame.js:198`）。**未覆蓋：底部導覽／抽屜換頁 ⇒ 錢靜默沒收**（見 §5 #4） |
| **`S14 SPECTATE`［缺］** | 只讀的對戰畫面（同 `S5-S7` 但無操作），公開 URL | 離開 | 對戰結束→`S11` 的只讀戰報 |
| **`S15 EXPIRED`［缺］** | 「房間已過期，已退款 NT$X」（通知中心留一筆） | 重新開房 | →`S0` |

**現在缺的狀態共 9 個**：`S2 ROOM_OPEN`、`S3 SEAT_FILLING`、`S4 LOCKED_COMMIT`、`S6 ROUND_REVEAL`、`S7 ROUND_SCORE`、`S8 FINAL_ROUND_PREP`、`S9 SUSPENSE`、`S10 CLIMAX`、`S14 SPECTATE`、`S15 EXPIRED`。其中 `S4/S6/S7/S9/S10` 是本輪「節奏停留怎麼停」的全部答案。

---

## 3. 節奏表（最重要）

**單一常數表放新檔 `prototype/src/core/battle-tempo.js`**（node 可 `require`、可掛 selftest；禁止 `vsslot.js`/`fgboard.js`/`bounty.js` 各自硬寫）：

```
SPEED        = { normal: 1.00, fast: 0.60, ultra: 0.35 }   // 沿用現有三檔（vsslot.js:102）
STRUCT_FLOOR = 0.70   // 結構拍（承諾/懸念/高潮）的縮放下限 —— 這些拍不是等待，縮太短就沒有張力
LIVE_ROUND_MIN_MS = 2500   // 真站每輪下限（UKGC RTS 14D）；HL.site.isLive() 時 fast/ultra 一律夾到此值
```

| # | 拍 | 現況（實測自程式） | 建議（常速 ×1.0） | fast ×0.6 | ultra ×0.35 | 這一拍的張力工作 |
|---|---|---|---|---|---|---|
| 1 | 配對搜尋 `MATCH_SEARCH_MS` | **1500ms**（`vsslot.js:126`，畫面是 `ax-mm__spinner`） | **1200ms**，且改成席位逐格填入 | 720 | 420 | 研究一致：等待中不准放 spinner。改成「系統在等誰」可讀 |
| 2 | 席位逐格填入 `SEAT_FILL_STAGGER_MS` | **500ms/家**（`vsslot.js:163`） | **380ms/家** | 228 | 133 | 外部 300–400ms/格；讓陣容被「一個一個看清」 |
| 3 | 全員就緒 → 開打 | **700ms**（`vsslot.js:161`） | 併入 #4（刪除這個裸常數） | — | — | 現在是空拍，沒有任何承諾語意 |
| 4 | **鎖房承諾倒數 `COMMIT_MS`** | **0（不存在）** | **3000ms**（結構拍，下限 2100） | 2100 | 2100 | 唯一的硬性 commit。cases.gg 實測 6.2–6.9s，但那是等 EOS +8 區塊；我們沒有區塊錨點 ⇒ 只需「夠讓 N 格頭像亮完 + 讀完規則」＝3s |
| 5 | 倒數 0 → 第一輪起轉 `FIRST_SPIN_LEAD_MS` | **500ms(demo, :324) / 300ms(member, :333)** — 兩路不同 | **600ms（兩路統一）** | 360 | 210 | 讓「0」有落地感；兩路不同值＝同一畫面兩種手感 |
| 6 | **起轉跨席位錯開 `SPIN_STAGGER_MS`** | **0**（`vsslot.js:248` 同一 tick 全起轉） | **120ms/席** | 72 | 42 | 四個盤面同時炸開＝視覺無層次；錯開後眼睛有掃視順序 |
| 7 | 轉輪減速 `ROLL_MS` | **820×SP+90**（`fgboard.js:73`；reel 間 80ms、easing `cubic-bezier(.2,.78,.25,1)`） | **900ms**，easing 改 `cubic-bezier(0,0,.2,1)`（末段極慢）+ 落點 ±40–60px 抖動 | 540 | 315 | 一手實作全為強 ease-out（`1-(1-t)^8` / `ease-out`），線性只出現在最粗糙的實作。抖動避免「每次停死正中」被讀成假 |
| 8 | 命中停留 `DWELL_MS`（**改分級**） | **800×SP 單一值**（`fgboard.js:115`）— 贏 1× 與贏 500× 演出一模一樣 | 小獎 <5×本輪注 **400** ／中獎 5–20× **700** ／大獎 ≥20× **1200** | 240/420/720 | 140/245/420 | 一手依據：CaseBattleClient 停格後硬停 500ms、loot_reel 高亮 220ms。**多輪疲勞的正解是分級慶祝，不是統一縮短** |
| 9 | 彈分存活 `POP_MS` | **DOM 900×SP（`fgboard.js:111`+`113`）vs CSS 固定 700ms（`components.css:1773`，80% 才淡出＝560ms）** ⇒ fast 540ms／ultra 315ms 被硬切 | **700ms 單一常數同時驅動 JS 與 CSS**，且強制 `DWELL_MS ≥ POP_MS`；小獎級另給 350ms 輕量版 `.ax-fgb__pop--sm` | 700(不縮) | 700(不縮) | 這是 §5 #15 的正解：**唯一的逐爆得分回饋不得被自己的清場動作吃掉** |
| 10 | 消除 `CLEAR_MS` | 250×SP（`fgboard.js:113`） | 250（不動） | 150 | 88 | — |
| 11 | 落下 `DROP_MS` | 400×SP（`fgboard.js:99`） | 400（不動） | 240 | 140 | — |
| 12 | 連爆間隔 `CASCADE_GAP_MS` | 80×SP（`fgboard.js:113`） | 80（不動） | 48 | 28 | — |
| 13 | **逐輪結果停留 `ROUND_RESULT_MS`** | **0（不存在）** | **700ms** | 420 | 245 | 全場最缺的一拍。做三件事：本輪 +X count-up → 本輪最高者邊框閃 400ms → **名次條重排**（重排是這個玩法的「掃籌碼」時刻，必須獨立成拍、不可與 delta 同時） |
| 14 | **揭曉跨席位錯開 `REVEAL_STAGGER_MS`** | **0** | **400ms/席**，順序＝目前最差者先、**領先者最後** | 240 | 140 | 領先者永遠是最後一拍 ⇒「他會不會被超車」每輪重演一次 |
| 15 | 輪間間隔 `ROUND_GAP_MS` | **380×sp ＝ 228ms（預設 fast）／133ms（ultra）**（`vsslot.js:246`） | **500ms** | 300 | 175 | 現況 228ms 讓十輪讀起來像一段連續動畫、沒有斷點。一手 GAP 是 200ms 但那是單人單盤面；N 欄並排需要更長讓眼睛掃完 |
| 16 | **決勝輪蓄勢 `FINAL_ROUND_PREP_MS`** | **0**（第 10 輪與第 3 輪節奏完全一樣，`vsslot.js:246` 無 rIdx 分支） | terminal **1500ms**（壓暗其他 UI、只留末輪盤面）／normal·crazy **800ms**（打「決勝輪」標記） | 1050/560 | 1050/560 | 結構拍，下限 ×0.7。terminal 的「只有最後一箱算分」現在完全沒有節奏支撐 |
| 17 | **最後一輪 → 勝負揭曉 `SUSPENSE_MS`** | **228ms**（`vsslot.js:246` 同一個 `later` 直接進 `finish()`） | **3000ms**（結構拍，下限 2100） | 2100 | 2100 | Rollbit 用 20s，但那是在等 10–50 位真人各自跑完 bonus buy；我們同步跑完、無真人長尾，20s 會變純空轉 ⇒ 縮到 3s，並在這 3s 內做名次條收攏動畫 |
| 18 | **勝負高潮·敗方灰化 `CLIMAX_LOSE_MS`** | **0** | **600ms** | 420 | 420 | 輪盤 take-and-pay 慣例：**先掃輸、後派贏**。先清空失敗才騰出畫面讓贏被看見 |
| 19 | **勝負高潮·獎池飛向勝方 `CLIMAX_WIN_MS`** | **0**（`escrowSettle:297` 在 `renderResult:302` 之前就改餘額） | **800ms**，**結束後才更新餘額數字** | 560 | 560 | 餘額比動畫先跳＝「顯示 BUG」的體感來源之一 |
| 20 | 結算卡出現 `SETTLE_CARD_MS` | 228ms 後直接 `append`（`vsslot.js:271`），**席位面板仍掛著另一組數字** | CLIMAX 結束後 **300ms 淡入**，同時把席位面板收成一行摘要 | 180 | 105 | 消滅「兩組互斥數字同時在畫面上」（terminal 局的 5,030 vs 620） |
| 21 | 逾時自動代選 `AUTO_PICK_MS` | 無此環節 | **10000ms** + 該席位標「自動選擇」徽章 | 不縮放 | 不縮放 | 預留給未來選擇型環節。Crazy Time 官方作法：節奏歸平台，不歸最慢的玩家；順帶解掉斷線 |
| 22 | 跳過本輪演出 | **無** | Enter／點畫面 → `clearTimeout` 立即結算本輪 | — | — | 明確界定：只影響本機演出，**不改結果、不改記帳時序**（3–10 輪不疲勞的最低成本解） |

**總長估算**：常速 ≈ 3.5–4.5s/輪 × 10 + COMMIT 3s + SUSPENSE 3s + CLIMAX 1.4s ≈ **48s**；fast ≈ **28s**；ultra ≈ **18s**。對照外部：非 Fast case battle 10 輪約 80–120s（實測 8–12s/輪）、Fast 約 15–25s ⇒ 我們常速比外部快、fast 落在外部 Fast 區間，合理。
**真站閘**：`HL.site.isLive()` 時 ① 每輪總長夾到 ≥2500ms（RTS 14D）② 該輪回收 ≤ 投注額時禁播與「贏」關聯的音效與金色特效（RTS 14F）③ 不提供 ultra（RTS 14E 禁 turbo/slam stop）。
**可驗證性要求**：每一拍結束時把狀態寫進 DOM（`data-beat="round-reveal"` / `class` 切換），因為 headless 驗不到 rAF 與 CSS transition，但**驗得到 class、disabled 狀態與計時器行為**。不狀態化，這輪改好的節奏下一輪就會被改壞。

---

## 4. 資訊顯示 IA

### 4.1 房卡（`arena.js:92-130` + `lobby.js:104-112`）

| | 項目 |
|---|---|
| **必須顯示** | 遊戲名/縮圖 ｜ 模式徽章 + **`HL.battleMode.winCondOf()` 短句**（crazy/terminal 是反直覺規則，只給徽章玩家必看反） ｜ 每人入場費 ｜ 席位格「已佔位頭像／虛線空位」+ `filled/players` ｜ **10 格輪次序列（三態）** ｜ ⏱ 剩餘 ｜ 三態 CTA（可加入「加入 NT$X」／已入座「回到對戰 ›」／已滿「👁 觀戰」）｜ 含 AI 對手標記 ｜ 房主皇冠 ｜ 私房標記 ｜ 速度徽章（FAST/ULTRA） |
| **可選** | 該盤面 RTP 與波動度（Acebet 直接印在卡上）｜ 房主勝率熱度條（**零樣本必須印「尚無資料」**）｜ 賞金池（賞金局）｜ 加入窗 5:00 倒數條 |
| **不該顯示** | 進行中的房被隱藏（讓玩家看得到進行中的對局可以拉長媒合窗）｜ 已入座卻寫「加入 NT$X」｜ 與 CTA 狀態不同步的席位格（`updateCard:448-450` 現在就是）｜ 一堆無註解的 prefs emoji（`prefIcons:73` 進 `battleInfoModal` 的「偏好」欄只是把同一串 emoji 再貼一次） |

### 4.2 等待中（`S2/S3`，新畫面）

| | 項目 |
|---|---|
| **必須顯示** | 每個席位一格 + **狀態字**（等待加入／已就緒／已斷線）｜ 空位＝可點的「邀請／叫 AI 對手」｜ 加入窗剩餘 mm:ss ｜ 「種子尚未生成，房主也無法預知結果」｜ 模式勝負條件全句 ｜ 房主專屬「解散並退款」 |
| **可選** | 房內聊天/表情列（downtime activity）｜ 候位按鈕（滿房時）｜ 分享連結（私房） |
| **不該顯示** | **spinner**（`ax-mm__spinner`，`components.css:1756`）｜ 「配對中…」這類不說明在等誰的文案 ｜ 假的倒數（現況 1500ms 寫死，與人數/空位數無關） |

### 4.3 對戰中（`vsslot.js:180-201`）— 本輪最大缺口

| | 項目 |
|---|---|
| **必須顯示（缺一個就會產生「看不懂誰在贏」的體感 BUG）** | ① `Round k / 10` + **還剩 R 輪** ② 每席**主數字＝`HL.battleMode.metricOf(mode, entry)`**（normal/crazy＝累計；**terminal＝本輪增量**），累計退成副行 ③ 每席**本輪 +X**（獨立一行，crazy 用反向色與「越低越好」語意，**不得用金色「+」**）④ 每席**名次徽章 #k/N** ⑤ 每席**差距**：非第一名「−1,240（距第一）」、第一名「+1,240 領先」⑥ 領先者高亮（`is-lead`，走 `leaderIndex`，不得自己寫 `>`）⑦ **常駐勝負條件一行**（`winCondOf`，不是只有徽章）⑧ 本輪盤面名稱與面額 ⑨ 已跑完的席位顯示「已完成 · 本輪 +X」並淡化盤面，未跑完顯示「進行中」（**留白會被玩家當成顯示 BUG**）⑩ 公平入口盾牌 icon |
| **可選** | 總獎池 ｜ 即時勝率 %（normal＝分數佔比；crazy＝(1/分數) 正規化，此公式已用 cases.gg 實際數字驗證誤差 <0.01pp；**terminal 不要編假勝率**，改顯示「最後一輪決勝・目前不計」）｜ 中線指示器 ｜ 近失標記 |
| **不該顯示** | **terminal 局把累計總分當主數字**（`vsslot.js:186` 寫死「總分」+ `218/240` 只填累計 ⇒ 十輪裡九輪的數字與勝負無關）｜ **crazy 局的金色上升大數字與 `"+"` 彈分**（`fgboard.js:44` + `components.css:1550/1562`）｜ 席位面板與結算卡兩組互斥數字並存 ｜ Demo 路徑各盤面即時各自寫總分（`vsslot.js:222`）造成空窗期畫面上並存本輪值與上一輪值 ⇒ 並排比較會判錯領先者（**會員模式反而在 `237-241` 一起揭曉＝同一畫面兩種一致性語意，必須統一為「一起揭曉」**） |

**模式語意鐵律**：`顯示的量 ≡ 排名的量`。任何表面要回答「誰領先／這數字越大越好嗎／勝負條件是什麼／名次怎麼排」，一律呼叫 `HL.battleMode`（`core/battle-mode.js:70-73`），**禁止自寫字串或比較子**。`vsslot.js:103 modeLabel()` 與 `vsslot.js:272` 的勝負句是目前僅存的兩份違規真相。

### 4.4 結算卡（`vsslot.js:260-282`）

| | 項目 |
|---|---|
| **必須顯示** | 名次表：**帶欄名**、且第四欄的量與對戰中主數字同軸（terminal 標「最後一輪增量」）｜ **兩欄制**「本局分數／派彩」分開列 ｜ 贏敗分流按鈕（贏＝綠底印金額；敗＝中性「關閉」，**不共用文案**）｜ 平手時的可見裁決（`HL.fair` roll 值 + 「平手 → 公平抽籤（可驗證）」）｜ 「再戰一局（同設定）NT$X」印原價 ｜ 完整比分矩陣 N 席 × 10 輪（含本輪加成標記）｜ 公平揭露（commit hash → serverSeed → 每格 `seed:round:seat` + 一鍵重算） |
| **可選** | 生涯摘要（現有）｜ 近失「差 N 分」（差距 ≤5%）｜ 安慰派獎明細（若實作，須 `HL.ledger.record` 帶 source）｜ 分享 |
| **不該顯示** | 席位面板的另一組數字仍掛著 ｜ 無欄名的量替換（`268` 現況）｜ 自寫的勝負條件字串（`272` 寫「最後一輪決勝」而 `winCondOf` 是「最後一輪增量最高勝」）｜ 餘額在動畫前就跳 |

---

## 5. 顯示 BUG 清單（CONFIRMED，依 severity 排序）

**HIGH**

1. `prototype/src/core/api.js:46-48` + `prototype/src/main.js:140` + `prototype/src/views/arena.js:258-283`｜會員模式 F5 後戰績每一列變「敗 · −NT$ NaN · 你 NT$ 0」、對手名空白：伺服器 payload（`docs/supabase-phase7.sql:164`）只有 `seats:[{idx,total,rounds}]/winnerIdx/roster/game/players/mode`，缺前端讀的 `net/win/vs/myTotal/totals/rounds` 與 `seats[].name/av/me`，而 `select("payload")` 又把表上現成的 `vs/wager/net/win` 欄位丟掉，全 repo 無任何 normalize｜**S**
2. `prototype/src/views/arena.js:306-400`（replayModal）｜同源：`rec.rounds` 不存在 ⇒ 10 輪縮成 1 輪、條長全 0%（crazy 因 `barFrac` 反向歸一全 100%）、四個席位標籤全空、`seats[i].me` 皆 undefined 使自己那條被畫成 opp、終局卡「你輸了 −NT$ NaN」｜**S**（吃同一個 normalize）
3. `prototype/src/views/vsslot.js:186,222,240,268`｜Terminal 局席位小字寫死「總分」且十輪都填累計，結算 `268` 悄悄換成末輪增量且無欄名 ⇒ 玩家看了十輪的數字與名次無關；結算卡是 `append` 在同一個 root（`271`），席位面板仍掛著累計值 ⇒ 兩組互斥數字同時可見｜**M**
4. `prototype/src/layout/app-shell.js:692-700` + `prototype/src/views/vsslot.js:62-66,80-84,173`｜用底部導覽／抽屜離開對戰＝已 escrow 預扣的賭注被**靜默沒收**：不記敗局、不記 `liveStats`/`ledger`、無 toast；`leaveBattle` 只綁在 view 內的返回連結，`mountView` 唯一的離場清理是 `HL.instant.stopAll()`，`vsslot.js:342` 下次進場還把 escrow 標記清成 0｜**M**
5. `prototype/src/views/vsslot.js:99,131,170`｜`buildPlayers()` 被呼叫兩次、空席位每次現抽 `HL.mock.makeHost()`（`mock-data.js:285` 每次都是新人）⇒ 接受配對時看到的對手不是開打時的對手（1v1 自建房 100% 換人，因 `98` 把 `name!=="你"` 濾掉後 pool 為空），戰績 `makeRec:254` 記的是後者｜**S**
6. `prototype/src/views/vsslot.js:180-201` + `prototype/src/styles/components.css:1545-1562`｜對戰十輪全程沒有名次、沒有與領先者的差距、沒有本輪增量、沒有領先高亮；四人房只有四個等權裸數字並排（`is-lead` 只存在於回放 `1810`）｜**M**

**MEDIUM**

7. `prototype/src/views/arena.js:440-451` vs `53`｜`updateCard` 只更新 `[data-room-time]`/`.ax-rc-done`/`.ax-heat`，賞金局卡最大的數字 `.ax-room-card__prize` 不在清單，而 `simBounty:400` 每次模擬挑戰都改 `prizePool` ⇒ 挑戰次數在跳、賞金池凍到下一次整頁重繪（`struct` 受 `rooms.length<10`（`466`）擋住，穩態常卡在 10 間），進房後 `bounty.js` refreshInfo 是另一個數字｜**S**
8. `prototype/src/views/arena.js:96,98,119-126,448-450`｜`canJoin` 只算一次並被閉包進卡片 onClick 與 CTA；`updateCard` 的對戰分支只換席位格與人數文字，不重算 `canJoin`/不換按鈕/不換 onClick ⇒ 滿房仍寫「加入 NT$X」（點下去付錢進滿房，`buildPlayers` 只取 `pool[0]` 靜默擠掉一名 bot），席位被 `simVsslot` 清空後仍寫「👁 觀戰」｜**S**
9. `prototype/src/views/lobby.js:104-112` + `prototype/src/views/arena.js:458-471`｜大廳「🔥 熱門玩家擂台」是凍結快照：`tick` 的 DOM 更新被 `view === "arena"` 閘住、`updateCard` 只在 arena 的 `gridEl` 內找卡、`HL.state.set` 全 repo 唯一訂閱者是 `persistence.js` ⇒ 倒數不動、賞金池過時、已被 `splice`（`464`）的鬼房還在賣，點進去只拿到「此對戰已結束」｜**M**（lobby 已有 `HL.ticker` 通道在 `182`，**不要新開 setInterval**）
10. `prototype/src/views/arena.js:112-115` vs `464`｜對戰卡 footer 被 prefs emoji + `filled/players 玩家` 佔滿，沒有 `done/plays` 進度維度（`updateCard` 也無可更新的節點），而結束條件是 `(r.done||0) >= r.plays`（plays 固定 20、每 tick 15%）⇒ 房間在 ⏱ 還剩十幾分鐘時憑空消失｜**S**
11. `prototype/src/views/arena.js:166` vs `426`｜「目前淨利」兩套公式：進行中 `prizePool − deposit`、結算 `prizePool − deposit − openFee` ⇒ 同一間房兩個數字恆差一個開房費（押金的 2%，`OPEN_FEE_RATE:489`），且進行中那張資訊列（`168`）沒有開房費欄位｜**S**
12. `prototype/src/views/arena.js:420`（`isBusyView`）vs `prototype/src/main.js` 的 `VIEWS[].isGame`｜同一個「是否遊戲中」有兩份真相：`isBusyView` 只認 `vsslot|bounty|duel|slot|game`，`liveroom` 在 VIEWS 標 `isGame:true` 卻不在名單 ⇒ 結算模態會蓋住直播房；`core/ui.js` 的 modal 每次新建 mask 疊上去且 `box.focus()` ⇒ 也會蓋在玩家開著的儲值/規則模態上並搶焦點｜**M**
13. `prototype/src/core/battle-mode.js:51-56` + `prototype/src/views/vsslot.js:27-35`｜`rankBy` 比較器平手回 0 ⇒ V8 穩定排序維持席位建立順序 ⇒ **平手一律判索引 0（你）贏**；terminal 末輪雙 0 的機率實測 1v1 約 1.72%（單輪 0 分 13.12%），畫面顯示全員 NT$0 卻給你獎盃，三個模式都沒有 tie-break｜**S**
14. `prototype/src/views/fgboard.js:44,110` + `prototype/src/views/vsslot.js:221` + `prototype/src/styles/components.css:1550,1562`｜Crazy 局全程用「得分＝好事」的視覺語言演出你正在輸：彈分文字寫死 `"+" + money(amount)`、總分金色（`--ax-gold-2`）持續上升，而 `battle-mode.js:32` 的 crazy 是 `lowerBetter:true`；對戰中唯一線索是 `195` 的純文字徽章｜**S**
15. `prototype/src/views/fgboard.js:46,111,113` + `prototype/src/styles/components.css:1773,1640`｜彈分 DOM 壽命＝`650×SP + 250×SP = 900×SP`（被 `tumbleAnim → drawStatic → HL.dom.clear` 清掉），CSS 動畫固定 0.7s 且 80% 才開始淡出（560ms）⇒ 預設的 fast（SP=0.6）＝540ms、ultra（0.35）＝315ms，彈分在**全不透明時被硬切**、一輪十個連爆閃十次殘影；而 `arena.js:593` 預設就是 `fast:true`｜**S**
16. `prototype/src/views/vsslot.js:246,126,161,163,324,333`｜十輪之間只有 `380×0.6 = 228ms`，全檔沒有任何一拍屬於「這輪誰贏了」；`230` 對第 10 輪（決勝輪）與第 3 輪完全一視同仁；`finish()` 也是經同一個 `later(runRound, 228)` 進場 ⇒ 結算卡與輪間空檔同長、讀起來沒有斷點；配對 1500ms／全員接受 700ms／首輪 500ms(demo) vs 300ms(member) 都是寫死常數、與人數無關｜**M**
17. `prototype/src/views/vsslot.js:248,235-236,222,237-241`｜N 個盤面同一 tick 全起轉、跨盤面零錯開（錯開只存在同一盤面的 reel 間，`fgboard.js:69`）；一輪等最慢的盤面（`236` join barrier）；先跑完的席位沒有任何狀態節點可放「已完成、等 N 家」；Demo 路徑各盤面即時各自寫總分（`222`）⇒ 空窗期畫面上並存本輪值與上一輪值，並排比較會判錯領先者（會員模式反而在 `237-241` 一起揭曉）｜**M**
18. `prototype/src/views/fgboard.js:108-115,43-47,99` + `prototype/src/views/vsslot.js:246`｜揭曉停留是固定常數（800/650/250/80/400 ×SP）且與 `ev.total` 或倍數毫無關聯，贏 1× 與贏 500× 的演出一模一樣（popup 只有一個 class、一種文案）；無分級慶祝、無決勝輪蓄勢 ⇒ 1v1v1v1 要連看 40 次等長循環｜**M**
19. `prototype/src/views/vsslot.js:103,272` vs `prototype/src/core/battle-mode.js:38-39`｜對戰本體自己另寫一份 `modeLabel()` 與勝負條件字串，沒走 `HL.battleMode.labelOf/winCondOf` ⇒ `battle-mode.js` 檔頭明令的「一份真相」在對戰本體還沒收斂（`272` 寫「最後一輪決勝」，`winCondOf` 是「最後一輪增量最高勝」）｜**S**
20. `prototype/src/core/fair.js:209-215` + `prototype/src/views/game-frame.js`（✓ 鈕條件 `HL.fair.isPF(meta.key)`）+ `prototype/src/views/vsslot.js:354`（`key: "vsslot:" + roomId`）｜盤面出象確實走 `HL.fair.floatOr("vsslot")`（`fgboard.js:16`），但 `PF_GAMES` 沒有 `vsslot` 且 `isPF` 吃的是裸 id ⇒ **對戰外框完全不顯示公平入口**，玩家無從得知這局可驗算｜**S**
21. `prototype/src/views/arena.js:157,695-700`｜空狀態文案不分頁籤：「我的房間」沒房時說「目前沒有房間，按『開房』發起第一場挑戰！」而大廳明明有 10 間；`HL.ui.tabs` 只印 label、四個 tab 無計數旁註｜**S**

**LOW**

22. `prototype/src/views/vsslot.js:221,305` + `prototype/src/core/api.js:69-71`｜會員模式 `play_battle` 失敗會退回前端結算（`305 finishLocal`），但 `noPopup: memberMode` 在 `221` 建盤面時已定死、`fgBoard.create` 回傳物件無法事後改 opts ⇒ 降級路線十輪沒有任何中央彈分（`is-win` 高亮與總分文字仍在）；`api.js` 兩條失敗路徑都只 `console.warn` 後 return null＝玩家端完全靜默｜**S**

### PLAUSIBLE（需目視確認，不要在 headless 輪就當 bug 修）

- `prototype/src/views/arena.js:27-30`｜熱度條零樣本印「房主 50%／勢均力敵／50% 挑戰者」而無「尚無資料」態（`createBounty:573` 明確帶 `hostEdge:0, challEdge:0`）；且分母不同軸（`simBounty:400` 累加金額淨額、`simVsslot` 累加場次×wager，同一條 bar 兩種單位而 label 只寫「房主 50%」）。**需目視**：同卡 footer 已顯示「挑戰次數 0/10」，玩家看得到樣本數為零 ⇒「以為已有戰況樣本」的傷害未被證明。mock 房的假熱度（`mock-data.js:298`）屬 Demo 刻意假活動，不該當 bug 修。
- `prototype/src/views/arena.js:157,466` + `renderGrid`｜新房 `unshift` 到最前 + `clear` 後全重建 ⇒ 整列下移一格、卡片在手指下位移。位移是程式事實，**「點錯房」的實際發生率需 preview 目視**（`struct` 只在有房結束/新增時為真，節律是每十幾到數十秒一次，不是每 5.5 秒）。
- `prototype/src/views/arena.js:119-126` + `vsslot.js:279`｜自建對戰房「再付一次錢打自己的房」是否為刻意的重賽流程（`279` 的「再來一場」就是同一個 `router.go`，同樣再收一份注）。工作區已把 CTA 改成「回到對戰 ›」；剩下的「房留在大廳被 `simVsslot` 推進卻零回報給房主、`hostNet` 恆 0（`endMyRoom` 的累加被 `r.type==="vsslot"` 圈住而 mine 房只有 bounty）」是否算缺陷，**需產品裁決而非目視**。
- `prototype/src/styles/components.css:1550,1562`｜席位主數字實際字級是 `1562` 以更高特異性覆寫的 `--ax-icon-30`（30px），不是 `1550` 的 46px。四個等權裸數字的**視覺量級與層級是否足以讀出排名，需目視**。

---

## 6. 分波實作建議

### Wave 1 — headless 可安全落地（純資料／狀態／文案／顯示正確性）

修 §5 的 #1、#2、#3（顯示語意那半）、#4、#5、#7、#8、#10、#11、#12、#13、#14（文案與正負號那半）、#19、#20、#21、#22。

| 檔案 | 動什麼 |
|---|---|
| `prototype/src/core/api.js` | `loadHistory` 的 `select` 補 `vs,mode,wager,net,win`；新增 `normalizeBattleRec(row)` 把伺服器形狀補成客端 rec（`seats[].name/av/me` 由 `payload.roster` + `winnerIdx` 推、`rounds` 由 `seats[].rounds` 轉置、`myTotal = seats[0].total`）。**注意 `phase7.sql:164` 的 `mode` 欄位存的是站別 `v_site`，遊戲模式在 `payload.mode`** |
| `prototype/src/main.js` | hydrate 走 `normalizeBattleRec`，不要直接 `stats.history = hist` |
| `prototype/src/core/battle-mode.js` | `rankBy` 加 tie-break（`HL.fair` roll 值裁決，`lowerBetter` 決定取高/取低）並回傳裁決依據；新增 `displayMetricLabel(mode)`（normal/crazy→「總分」、terminal→「本輪增量」）與 `gapTo(mode, a, b)` |
| `prototype/src/core/fair.js` | `PF_GAMES` 加 `vsslot`；`isPF` 改成 `key.split(":")[0]`；`float` 支援複合 nonce `battleId:round:seat` |
| `prototype/src/views/vsslot.js` | 席位小字改 `displayMetricLabel`、主數字改 `metricOf`（terminal＝本輪增量、累計退副行）；`buildPlayers()` 只算一次並寫回 `room.seats`；`modeLabel()`/`272` 改走 `labelOf/winCondOf`；`noPopup` 改成可事後切換（`fgBoard` 回傳物件加 `setPopup`）；`onWin` 的 Demo 即時寫入改成與會員模式一致的「一起揭曉」 |
| `prototype/src/views/fgboard.js` | popup 的正負號、顏色、class 由 `opts.popupSign/popupTone` 決定（crazy 傳負向）；`POP_MS` 常數化 |
| `prototype/src/views/arena.js` | `updateCard` 補 `.ax-room-card__prize`、重算 `canJoin` 並替換 CTA 與 onClick；`battleCard` footer 加 `done/plays`；空狀態依頁籤分文案；tabs 加計數；`myRoomStatusModal` 補「平台開房費」列；`isBusyView` 改讀 `VIEWS[view].isGame`；`historyModal`/`replayModal` 吃 normalize |
| `prototype/src/views/lobby.js` | 熱門擂台改用 `HL.ticker`（同檔 182 的既有通道）逐卡更新 + 移除已 splice 的鬼房 |
| `prototype/src/layout/app-shell.js` | `mountView` 加 `onLeave/teardown` 鉤，讓 `vsslot` 的棄局路徑收斂（同時解掉 §5 #4） |
| `prototype/src/core/selftest.js` | 加測項：normalize 後 9 個欄位齊備；tie-break 不再由索引決定；`metricOf` 與席位顯示同軸 |

### Wave 2 — 需節奏調整（可用 node/DOM 量測驗證）

修 §5 的 #15、#16、#17、#18，實作 §2 的 `S4/S6/S7/S8/S9/S10` 與 §3 全表。

| 檔案 | 動什麼 |
|---|---|
| **新檔 `prototype/src/core/battle-tempo.js`** | §3 的常數表 + `SPEED`/`STRUCT_FLOOR`/`LIVE_ROUND_MIN_MS` + `ms(beat, speed, {live})`；node 可 require、掛 selftest（驗常數關係：`DWELL_MS ≥ POP_MS`、live 下每輪 ≥2500ms、結構拍不低於 ×0.7） |
| `prototype/src/views/vsslot.js` | 新增 `LOCKED_COMMIT` 倒數（`escrowTake` 移到倒數歸零那一刻）、`ROUND_REVEAL`/`ROUND_SCORE` 兩拍、起轉與揭曉錯開、決勝輪蓄勢、`SUSPENSE` 倒數、`CLIMAX` 先輸後贏（**餘額更新排在最後**）、結算卡淡入時收起席位面板；**每拍把狀態寫進 `data-beat`** |
| `prototype/src/views/fgboard.js` | `DWELL_MS` 分級（依 `ev.total / BET` 三檔）、`POP_MS` 單一常數同時驅動 JS 與 CSS、落點 ±40–60px 抖動、中線指示器、`skip()` API（Enter／點畫面 → `clearTimeout` 立即結算本輪，不改結果與記帳時序） |
| `prototype/src/views/arena.js` | 建房表單速度三檔升為第一級選項、開賽後鎖定；房卡加 FAST/ULTRA 徽章 |
| `prototype/src/core/site-mode.js` 消費點 | 真站閘：`isLive()` 時每輪夾 ≥2500ms、不提供 ultra、該輪回收 ≤ 投注額時禁播贏的音效與金色特效 |

驗證配方（依 CLAUDE.md §9）：直接把 view 掛進 DOM（`await HL.lazyGames.load` → `g.render()` → `document.body.appendChild`），量 `data-beat` 切換時序、按鈕 disabled 序列、`HL.state` 餘額逐筆帳目、同步連點的併發（**背景分頁 `setTimeout` 被夾到 ≥1s，不要 await**）；測完 `h.remove()`。

### Wave 3 — 需目視（動畫／版面／視覺層級）

| 檔案 | 動什麼 |
|---|---|
| `prototype/src/styles/components.css` | 席位排名徽章／差距數字／領先高亮（`is-lead` 從回放推廣到對戰）／名次條重排位移動畫；crazy 反向視覺（不用 `--ax-gold-2`）；彈分分級（`--sm` 輕量版）與 `POP_MS` 對齊；決勝輪壓暗遮罩；`.ax-vs__total` 字級與層級重定（現況 `1562` 覆寫成 30px，四欄等權讀不出排名）；順帶收斂 9 個雜亂斷點 |
| `prototype/src/views/fgboard.js`（視覺分支） | reel easing 改 `cubic-bezier(0,0,.2,1)` 或 `1-(1-t)^8`；中獎格放條帶 N−5 附近做 near-miss；極稀有時全條唯一金卡（`#e8c40c`）必中的期待升溫分支 |
| `prototype/src/views/arena.js`（視覺） | 房卡 10 格輪次序列三態；席位空位的「邀請／叫 AI 對手」兩鈕版面；`S2 ROOM_OPEN` 等待畫面（取代 spinner） |
| 音效／觸覺 | 滾動期逐格 tick 隨 ease-out 自然稀疏、收尾一記 reveal 音；震動排在視覺停格之後 0–50ms（早於視覺 >20ms 就會被感知為不同步） |

---

## 7. 誠實聲明

**研究裡屬推估、非實測的部分**
- **開場／鎖房倒數 3000ms**：外部只證實「座位填滿即自動開賽」，沒有任何平台公布倒數秒數。cases.gg 實測的 6.2–6.9s 是**等 EOS +8 個區塊**（每塊 0.5s ≈ 4s + 餘裕）的技術後果，我們沒有區塊錨點，所以那個數字不可直接套。3s ＝「夠讓 N 格頭像亮完 + 讀完規則」的推估。
- **揭曉倒數 3000ms**：Rollbit 的 20s 是實測公布值，但它在等 10–50 位真人各自跑完 bonus buy；我們同步跑完、無真人長尾，照抄會變純空轉。3s 是推估。
- **輪間 500/300ms、揭曉錯開 400ms、起轉錯開 120ms、DWELL 三檔門檻（5×/20×）、結構拍下限 ×0.7、逾時代選 10s**：全部是推估。可比的一手依據只有 CaseBattleClient 的 ROLL 4000／DWELL 500／GAP 200、CSGOCaseOpeningSimulator 的 3500／auto 200、loot_reel 的 5000／高亮 220，以及 Clash.GG 宣稱的「每輪 <2 秒」。
- **三檔速度切分（1.0/0.6/0.35）**：沿用現有實作值，不是外部對照表——沒有任何平台公布 Fast/Instant 的官方秒數（CSGORoll Help 只說「以更快速度開箱」）。
- **滾動期 tick 音間隔（起跑 30–50ms/格 → 末段 250–400ms/格）**：無任何來源給實測值，由 easing 與格寬反推。
- **音效長度慣例（5s/10s/20s）與觸覺 0–50ms 窗**：僅取得搜尋摘要，原頁未讀成功（media.io TLS 拒絕；觸覺研究只有摘要）。

**外部研究中原頁未讀到、僅憑搜尋摘要的**：CSGORoll Fast Mode 秒數與 Quick Unbox、rain.gg 與 cases.gg 的 fairness 頁、Hellcase FAQ、Videoslots battleofslots FAQ、Stake Crash 的 5 秒下注窗、Crazy Time 的 15 秒下注窗（Evolution 第一方頁面**地區封鎖**，只能靠營運商與評測站，且 livecasinocomparer 同一頁自相矛盾寫 13 秒）、Cash Hunt 選擇時間（10／10–15／20 三種互相矛盾）、Monopoly Live 15–20 秒、Clash.gg 的 Double Down 與 Borrow、撲克大廳候位慣例。
**量測誤差**：cases.gg「每輪 8–12s」是用 25.3 秒長基線除以輪數得出，較可靠；「~1s/輪」那筆基線只有 2.1 秒，僅供參考。瀏覽器面板隱藏時 `setInterval` 被夾到 ≥1 秒 ⇒ 單次間隔誤差 ±1 秒。
**Top Slot 揭曉順序**有來源衝突：Wizard of Odds 與 theScore 官方說明頁寫「Top Slot 先停（左輪→右輪）」，livecasinocentral 寫反；本規格採前者。

**稽核覆蓋不到的**
- **所有動畫、視覺層級、版面**：headless 輪瀏覽器不合成影格 ⇒ `requestAnimationFrame` 不觸發、CSS transition 不推進、screenshot 逾時。所以 §3 的 easing、抖動、金卡分支、名次條重排的**視覺結果一律 UNVERIFIED**，只有「時序常數」與「DOM/class/disabled 狀態」被驗證過。保真閘第 10/11 項的 UNVERIFIED 紀律在此仍然成立。
- **會員模式（後端路徑）**：Supabase phase7 SQL 未部署。§5 #1/#2/#22 的結論是**讀 SQL 形狀 + node 餵真形狀 payload 跑同一段渲染運算式**推出來的逐字輸出，未在真後端跑過。`play_battle` 的實際回傳、`ops_log_srv` 的副作用都沒有實機驗證。
- **真站（`HL.site.isLive()`）**：`arena.js:453` 的 tick 首行直接 return ⇒ 競技場整套假房/假挑戰在真站不存在。因此 §1「大廳房卡」與 §5 #7/#8/#9/#10 的所有結論**只對 demo 站成立**；真站的競技場大廳現在是什麼樣子，本輪完全沒有稽核。
- **對手行為的真實性**：Demo 的對手分數是同一份 `fgBoard` iid 抽樣（`vsslot.js` 檔頭已載明），不是真人。§3/§4 所有關於「差距／名次／超車張力」的設計都建立在這個假設上；真人多人（伺服器預扣與仲裁，#104/#105）沒有做，所以「對手也逃單」前端無從得知（`vsslot.js:59-60` 已自認）。
- **沒稽核到的相鄰表面**：`bounty.js` 本體的節奏（只從 arena 側看到房卡與結算）、`duel.js`、`liveroom`、觀戰與公平揭露（**完全不存在，所以無從稽核，只能設計**）。
- **行號穩定性**：`arena.js` 在稽核期間被另一個 session 寫（mtime 13:05），`vsslot.js`（13:12）與 `game-frame.js` 目前**未提交**。本規格行號以 `HEAD = eb5ab3c` + 該工作區為準；任何一個檔再被動就會漂，實作前重跑一次 grep 定位。
- **PLAUSIBLE 四條**（熱度條零樣本、卡片位移誤點率、自建房重賽是否刻意、席位數字視覺量級）**沒有結論**，需 preview 目視或產品裁決，不要在 Wave 1 就改。
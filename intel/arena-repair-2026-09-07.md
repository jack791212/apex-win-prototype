# 競技場全面檢修 — 2026-09-07（前景輪 · 船長提報「競技場配對系統壞了、沒辦法玩」）

> 這是事故報告 + 修法記錄 + institutional lesson。程式碼裡只留一行指標到這裡與對應的鎖，
> 因為 `views/arena.js`／`layout/app-shell.js`／`main.js` **都在首屏預算內**（#118 現況餘裕僅數百位元組）。
> 修完當下：`node prototype/tests/run.js` → **346 項全綠**；負向擾動 **34/34 CAUGHT**。

---

## 0. 一句話

**Slots Battle（競技場對戰）從 2026-08-21 起完全不能玩了 17 天**——配對畫面永遠停在
「配對中…等待玩家加入」。根因是 08-21 我自己為了修「換頁沒收賭注」而加的離場鉤，
**被它自己那一次掛載開火**，把配對相位剛排下去的計時器清掉。
同一輪還發現大廳房卡的「加入／觀戰」按鈕**每秒都在說謊**（滿房寫「加入」、空房寫「觀戰」）。

---

## 1. P0：離場鉤把自己那一場殺掉（blocker，17 天不能玩）

### 現象（preview 實測）
點大廳任一張「加入 NT$X」→ 進入對戰頁 → 畫面顯示「配對中…等待玩家加入」→ **永遠不動**
（3000ms 後仍在搜尋；60s 後仍在搜尋）。零 console error、零網路錯誤。

### 根因（求值順序）
```js
// main.js（舊）
HL.shell.mountView(def.render(s), def.backTo || null);
//                 ^^^^^^^^^^^^^ 參數先被求值 ⇒ 新 view 的 render() 已經跑完了

// app-shell.js（舊）
function mountView(node, backTo) {
  if (HL.instant && HL.instant.stopAll) HL.instant.stopAll();
  runExit("view-left");            // ← 此時 exitFns 裡躺的是「新 view 剛註冊的鉤子」
  HL.dom.clear(main);
  main.appendChild(node);
}
```
`views/vsslot.js` 的鉤子是 `clearTimers(); forfeitEscrow();`。
`render()` 內 `phaseSearching()` 已經排了 `later(phaseFound, ms("match_search"))`，
接著 mountView 的 `runExit` 就把它清掉 ⇒ **配對永遠不會推進到下一相位**。

`renderApp` 還在 render 之前**另外**呼叫了一次 `runExit("app-rerender")`，
所以離場鉤在一次換頁裡被開火兩次：第一次打對象（離場的 view），第二次打錯對象（進場的 view）。

### 為什麼 225 項自我檢測全綠、手測也看不出來
1. 當時立的鎖 `games/arena/exit-hook-settles-escrow` 守的是
   「mountView 有沒有跑 runExit」「vsslot 有沒有註冊鉤子」「runExit 是不是一次性」——
   **全部成立，而遊戲是壞的**。它守「有沒有寫」，沒守「掛載完之後那個鉤子還活著嗎」。
2. 2026-08-21 的 preview 驗證照 CLAUDE.md §9 的配方走：
   `var h=document.createElement("div"); document.body.appendChild(h); h.appendChild(g.render());`
   ——**這個配方刻意繞過 `mountView`**（它就是為了繞過登入 gate 而生的）。
   缺陷剛好落在被繞過的那一段路上。

⇒ **CLAUDE.md §4「修一半而看不出來」家族的第 6 種形狀：
修法本身引進的缺陷，落在「驗證配方刻意繞過的那一段路」上。**

### 修法（由構造上排除，而不是靠呼叫端自律）
`mountView` 不再收「已經做好的節點」，改收**工廠函式**：
```js
function mountView(build, backTo, opts) {
  if (typeof build !== "function") throw new Error("[Apex Win] mountView 只收工廠函式");
  var rerender = !!(opts && opts.rerender);
  if (HL.instant && HL.instant.stopAll) HL.instant.stopAll();
  if (rerender) dropExit();          // 同頁重繪：同一場，丟掉不開火
  else runExit("view-left");
  HL.dom.clear(main);
  if (backTo) main.appendChild(gameBackBar(backTo));
  main.appendChild(build());          // ← 建構一律晚於清理
}
```
＋ `main.js`：`renderApp` **不再自行 runExit**（開火時機收斂到 mountView 一處）；
`refresh()` 改走 `renderApp({ rerender: true })`。

### 順帶修掉的兩個同族缺陷
- **同頁重繪＝沒收賭注**：`HL.app.refresh()`（切語系／改資料／存檔）走同一個 renderApp，
  舊版會開火離場鉤 ⇒ **對戰中切一次語系，賭注被沒收並記一筆敗局**，然後畫面從配對重新開始。
  現在 rerender 走 `dropExit`（丟掉不開火）；而為了讓上一次 render 的計時器不要在
  已脫離的節點上跑完，`vsslot.later()` 自帶存活閘（家族 B 的 `body.contains` 型防禦）。
- **登出／session 失效＝賭注靜默沒收**：`renderAuthView()` 不經過 mountView，
  舊版完全沒有結帳點。現在補 `HL.shell.runExit("signed-out")`。
- **在途賭注會從帳上消失**：`render()` 舊版一進場就 `escrow = 0`，而餘額早就扣掉了。
  現在扣款當下同時寫 `room._escrow`，`render()` 改為**認領**，`escrowTake` 冪等。

---

## 2. 大廳房卡的 CTA 每秒都在說謊（high，直接造成「配對系統壞了」的體感）

### 現象（preview 實測，同一畫面同時出現）
- `Slots Battle · 1v1v1v1 … 4/4 玩家` → 按鈕寫 **「加入 NT$ 100」**（點進去會擠掉一位在座玩家）
- `Slots Battle · 1v1 … 1/2 玩家` → 按鈕寫 **「👁 觀戰」**，點卡片彈出「此房已滿，僅供觀戰」

### 根因
`battleCard()` 在 **render 當下**算 `canJoin`，然後把答案烙進三個地方：
① 按鈕文字 ② 按鈕的 onClick ③ 整張卡的 onClick 閉包。
而 `arenaSim.tick()` **每秒**都在 mutate `r.seats`：
```js
if (emptyIdx >= 0) { seats[emptyIdx] = HL.mock.makeHost(); … return; }   // 空位補 bot
…
for (var m = 1; m < n; m++) seats[m] = Math.random() < 0.4 ? HL.mock.makeHost() : null;  // 打完重置
if (seats.indexOf(null) < 0 && n > 1) seats[n - 1] = null;               // 末尾強制清一席
```
`updateCard()` 卻**只換了席位格與「n/N 玩家」字串**——按鈕從此永遠是舊快照。
（＝§4 家族第 5 種形狀「原地更新只更新了一部分節點」。）

### 修法
`views/arena.js` 新增三個出口：
- `joinability(r)` → `{cap, filled, seated, mine, priv, canJoin, full}`＝**可加入性單一真相**（純函式，node 可直接求值）
- `battleCta(r)` → 狀態到按鈕節點的單一出口（render 與 updateCard 共用同一份）
- `cardAction(r)` → **點擊當下重新判定**（渲染到點擊之間可能已經過了好幾個 tick）

`updateCard` 每秒連按鈕一起 `replaceChild`。滿房點擊改吐
「這間房剛剛滿了，改為觀戰（Demo）」而不是靜默進場。

### 目的地也補了門
`vsslot.render` 以純判定 `noSeatFor(room)` 擋「你不在座而且已經滿了」。
沒有這道門，`buildPlayers()` 會把「你」寫進索引 0 並回寫 `room.seats`
⇒ **4 人滿房必然把最後一位在座玩家擠掉**（他從此不在這場對戰裡，畫面上零交代）。

### 同一張卡順手修掉
`(r.mode === "crazy" ? "Crazy" : "Terminal")` 是**第 5 個各自硬寫模式語意的表面**，
而且與前一段文字連在一起顯示成 **「10 輪 · 1v1v1Crazy」**（少了分隔）。
改問 `HL.battleMode.labelOf(r.mode)`。

---

## 3. 棄局的帳（high · 兩個方向都錯）

| | 舊行為 | 現在 |
|---|---|---|
| 落後就用底部導覽走人 | 只記 `HL.liveStats`（流水/VIP/任務側）⇒ **生涯戰績一動也不動**：0 勝 0 敗、餘額卻少一份賭注 ⇒ 逃單不留痕 | 記一筆生涯敗局（`win:false, net:-lost, forfeit:true`） |
| 勝負已定、高潮演出還在播的那 2–4 秒離場 | 一律走棄局 ⇒ **你已經贏了，錢照樣被沒收**；而 `arenaStats` 早在 `finishLocal` 就記了一筆「勝」⇒ 戰績說你贏、餘額說你輸 | `pendingSettle` 記下應付金額，離場時據實付回（不再算逃單） |

---

## 4. 立的鎖與負向擾動（34/34 CAUGHT）

| 鎖 | 守什麼 | 擾動 |
|---|---|---|
| `games/arena/exit-hook-settles-escrow`（**改寫**） | mountView 只收工廠、傳節點要 throw、`build()` 排在 runExit 與 clear 之後、**所有呼叫端一律傳函式**、renderApp 不得自行 runExit、refresh 必須明示 rerender、dropExit 只准清空不准開火、登出也要 runExit、`later()` 要有存活閘 | P1–P8（8/8） |
| `games/arena/room-cta-not-stale`（**新**） | 可加入性單一出口、原地更新涵蓋按鈕、點擊當下重判、`joinability` 六種情境的純邏輯、滿房守門 | P9–P13＋P14a–P14f（11/11） |
| `games/vsslot/forfeit-is-honest`（**新**） | 逃單留痕、勝負已定不算棄局、順序、`escrowSettle` 要清 pendingSettle、扣款/入帳各一個出口 | Q1a–Q10（15/15） |
| `games/arena/battle-single-charge`（**改寫**） | 同一組不變量改守新形狀（`joinability` 而非 `battleCard` 的區域變數）＋新增「自己的房不賣自己入場」「已入座必須先於加入判定」 | 連帶 |

### ⭐ 擾動本身抓出兩條「空綠」的鎖（這一輪最有價值的產出）
1. **P14｜判準只認一種寫法**：第一版寫 `/filledHere >= room.players/.test(rn)`，
   擾動 `if (false && filledHere >= room.players)` 照樣命中 ⇒ 鎖全綠而門是壞的。
   改成「純判定 `noSeatFor` ＋逐字的守衛形狀 `if (noSeatFor(room)) return noSeatPanel();`
   ＋在 node 直接跑那個判定」三件一起守。
2. **Q1｜呼叫被短路掉**：`/HL.arenaStats.record\(/` 這種斷言，
   擾動 `void 0 && HL.arenaStats.record({…})` 照樣命中。
   改成釘「它是**敘述句開頭**」＋「包住它的條件**逐字**是預期的那一組」。

⇒ 兩者是同一條教訓的兩個實例：**斷言認的是概念，還是某一種寫法？**
（已寫進 `~/.claude/.../memory/apexwin-half-fix-pattern.md`。）

---

## 5. 驗證（誠實分界）

**preview 實測到的（demo 模式、`?demo=1`）**
- 配對推進：`配對中…` →（1.2s）→ `✅ 配對成功！`＋接受鈕 ✅（修前 60s 不動）
- 承諾倒數 3-2-1 → 歸零扣款**恰一次**（28,560 → 26,060，賭注 2,000）✅
- 10 輪全跑完（`round-spin → round-reveal → round-score → round-gap` 循環 ×9 → `final-prep` → 決勝輪）✅
- 對戰中資訊：名次 `#1/3`、本輪增量、與第一名差距、領先高亮、常駐勝負條件 —— 皆正確 ✅
- 大廳 CTA 一致性：連續 7 個 tick 逐卡比對「當下 seats vs 按鈕文字」⇒ **0 筆不一致** ✅
  （實測畫面：`2/3 → 回到對戰 ›`｜`1/2 → 加入`｜`2/2 → 👁 觀戰`｜`1/2 🔒 → 🔒 私密房`）
- 零 console error、零重載

**preview 驗不到（環境限制，非程式問題）— 照 §9 標 UNVERIFIED**
- 高潮四拍（懸念→敗方灰化→獎池飛向勝方→結算卡）的**目視**：
  面板隱藏時瀏覽器不合成影格 ⇒ `requestAnimationFrame` 不觸發、CSS transition 不推進。
- **Chrome intensive throttling**：分頁隱藏超過 5 分鐘後 `setTimeout` 被降到**約每分鐘一次**
  ⇒ 一場 10 輪對戰在這個環境要跑十幾分鐘（實測；播無聲音訊的豁免招在此環境無效）。
  ⇒ 結算卡與派彩那一段只有 node 鎖（`escrow-equivalence`／`forfeit-is-honest`／`tempo-beats`）覆蓋。
  **請船長在真機開一場確認結算卡的觀感。**

---

## 6. 制度性後果（寫進 CLAUDE.md）

1. **§9 的 headless 配方要加一句警告**：它繞過 `mountView`／`renderApp`，
   所以**掛載與離場路徑上的缺陷用那個配方一定驗不到**。
   驗這一類要嘛走真實路徑（`HL.router.go` + 繞登入 gate 的旗標），要嘛立源碼鎖。
2. **§4 家族補第 6 種形狀**：修法本身引進的缺陷，落在驗證配方刻意繞過的那段路上。
3. **鎖的斷言要問「認概念還是認寫法」**（本輪兩個實例都是這樣被抓到的）。

---

---

## 6.5 第二波：9 角度平行巡檢把「第一波的修法」也打回來了

第一波推上線後跑了一輪 9 角度平行巡檢（掛載競態／房間狀態機／金流／顯示真相／節奏／
會員模式／玩家死路／鎖的空洞／CSS 自適應），**94 條 finding**。逐條讀完去重約 20 個家族。
其中**四條直接打在第一波的修法上**——`node` 全綠、preview 也綠，但缺陷是真的：

| # | 第一波留下的洞 | 為什麼看起來正常 |
|---|---|---|
| 1 | `later()` 的存活閘寫成 `!body.contains(root)`，而 **`root` 是模組級變數**、下一次 render 會把它換成新的且 attached 的節點 ⇒ **閘永遠通過**。更糟：所有相位都寫同一個模組 `root` ⇒ 舊鏈把上一場的相位**畫進新畫面** | 畫面永遠「有東西」；而我為它立的斷言只認 `body.contains(root)` 這串字＝**空綠** |
| 2 | 同頁重繪把對戰倒回「配對中」，而 `escrowTake` 是冪等的 ⇒ **同一份賭注可以無限重骰到贏**（blocker）。第一波的 rerender 修法讓它從「切語系＝沒收」變成「切語系＝免費重骰」 | 每一次重骰畫面都正常，餘額也只扣一次 |
| 3 | `render()` 第一行 `resumeFrame` 命中就早退 ⇒ **離場鉤根本沒被裝上**、`room._escrow` 也沒認領。＝P0 的鏡像（P0 是鉤子被殺掉，這條是鉤子沒裝上） | 外框重建、盤面回到原視窗，一切如常 |
| 4 | 開 PiP 後換頁：離場鉤棄局並宣告「賭注不退還」，而 PiP 裡的對戰**繼續跑完並派全額獎池** ⇒ 同一場既記棄局敗又記正式勝負、流水記兩份。fgboard 那批 `setTimeout` **不在 `timers` 裡**，`clearTimers` 從來只是一半的清理 | 玩家只看到一句 toast，之後把 PiP 裡的結算卡當成殘影 |

### 第二波修法
- **世代閘 `epoch`**（比照 `bounty.js` 既有形制）取代「節點還在文件裡嗎」：
  `later()` 在**排程當下捕捉**世代、開火時比對；`runRound()`／盤面回呼 `d()` 的**第一個敘述句**也問世代；
  離場鉤與 `onTeardown` 推進世代 ⇒ 連 fgboard 那批不在 `timers` 裡的裸 `setTimeout` 續命回來也動不了錢與戰績。
- **佔用宣告 `HL.shell.holdView(fn)`**：有在途賭注的 view 不得被同頁重繪重掛；
  `refresh()` 改走輕量路徑（只翻新 chrome 與在地化）⇒ 重骰漏洞消失，切語系也不再中斷對戰。
- **`adoptRoom` / `registerExit` 抽成出口**，`resumeFrame` 續播分支也走一遍。
- **離場鉤先問 `HL.gameFrame.isPipActive(key)`**：續播中換頁不是離場 ⇒ 不棄局。
  （順帶讓 `isPipActive` 有了它的**第一個使用者**——它原本是零消費者的容器。）
- **`releaseSeat()`**：結算與棄局都把你的席位還給房間。
  `buildPlayers` 會把「你」寫進 `room.seats[0]`，而 `simVsslot` 的席位重置只跑 `seats[1..n-1]`
  ⇒ seat 0 永遠留著你 ⇒ 那間房**永久顯示「回到對戰 ›」，而按下去其實是重開一場並再扣一份賭注**。
- **`playBattle` 改走 `rpc()` 包裝**：它原本是全 `api.js` 唯一直接呼 `HL.sb.rpc` 的結算 RPC
  ⇒ 沒帶 Phase 7 的 `p_site` ⇒ **真站的對戰讀寫假站的經濟列，回傳的餘額再蓋回真站畫面**＝真站印錢。
  Demo 模式（唯一常被驗的模式）根本走不到這條路。
- **CTA 指紋 `data-cta`**：原地更新只在狀態真的變了才換節點（無條件每秒 `replaceChild` 會每秒偷走鍵盤焦點）。

### 第二波的鎖與擾動
新鎖 `games/arena/member-rpc-carries-site`；`exit-hook-settles-escrow` 與 `room-cta-not-stale` 各補一整組。
**負向擾動 19/19 CAUGHT**（兩波合計 **53/53**）。

### ⭐ 第三條被擾動抓出來的空綠鎖
`R4`：斷言寫 `/stale\(myEpoch\)/.test(body(vs, "runRound"))`，而 **`d()` 是巢狀在 `runRound` 裡的**
⇒ 把 `runRound` 自己的閘拿掉之後，`d()` 那道閘讓斷言照樣命中。
⇒ 改成釘「函式標頭之後的**第一個敘述句**」。
**三條空綠鎖、三種不同的漏法（認寫法／被短路／巢狀洩漏），全部是我自己寫的、全部是擾動抓出來的。**

### 第二波實測（preview）
- 配對推進、承諾倒數扣款恰一次（28,560 → 23,560）✅
- **重骰漏洞已封**：對戰中 `HL.app.refresh()` 與切語系 ⇒ 回合數/席位/餘額全不變、不回到配對 ✅
- **棄局的帳**：離場後 seat 0 釋放為 `null`、`_lineup` 清掉、房卡 CTA 從「回到對戰 ›」回到「加入 NT$5,000」；
  生涯戰績記 `matches 1 / losses 1 / profit −5,000 / forfeit:true`（第一波之前這裡全是 0）✅
- 零 console error ✅

### ⚠️ 首屏餘裕只剩 72 bytes
兩波的修法在三支 eager 檔（`app-shell.js`／`main.js`／`arena.js`）淨增約 1.6KB **程式碼**
（`joinability`／`battleCta`／`cardAction`／`ctaSig`／`holdView`／`viewHeld`／refresh 閘）。
長註解已全數搬進本檔與鎖，餘裕從 230B 降到 **72B** ⇒ **平台軌下一輪任何 eager 改動都會撞牆**（#118）。
下面那條「大廳整表重繪會偷走鍵盤焦點」就是因此**刻意不修**的（需再約 250B）。

---

## 7. 仍待做（承接 BACKLOG #113）

> **94 條的完整逐條清單**（含每一條的 `file:line`／why／repro／fix／confidence）＝
> [arena-inspection-2026-09-07.md](arena-inspection-2026-09-07.md)。下面只列家族與優先序。

### 9 角度巡檢的 94 條裡，本輪**未處理**的家族（依價值排序）
1. **會員模式的 escrow 是純客端幻覺**：`play_battle` 在**開打前**就已在伺服器原子結算並寫進
   `battle_history`；客端棄局又 `recordBattle` 插第二列 ⇒ 同一場兩列（一勝一敗），
   而 F5 後餘額採伺服器值 ⇒ **「賭注不退還」在會員模式是假的**。＝#113 ① 的同一根因（無 normalize）。
2. **`battle_history.mode` 一欄兩義**（伺服器寫站別、客端寫遊戲模式）＋`loadHistory` 完全不依站別過濾
   ⇒ 真站的戰績與回放會列出 demo 場次。
3. **`playBattle` 沒有 timeout**，而承諾倒數已經扣過款 ⇒ 連線卡住時玩家永遠停在「連線對戰伺服器…」，
   唯一出路是棄局賠掉賭注。
4. **`battleInfoModal` 是模式語意的第五個表面**（自寫「Crazy Mode（最低分勝）」等三套文案），
   而 `mode-semantics-single-truth` 鎖抓不到它；`simVsslot` 與結算名次表也各自寫了一份比較子
   （後者的鎖只認舊字面 ⇒ 又一條空綠）。
5. **`tieAtTop` 零消費者**：平手裁決完全不可見，terminal 末輪雙 0 時結算卡照樣寫「🏆 你贏了！」；
   對戰中同一件平手還被渲染成互相矛盾的兩句（名次 `#2/#3` ＋「並列第一」）。
6. **節拍單一真相只做了一半**：`fgboard` 仍自寫 6 個裸常數、`ms("roll")`／`ms("drop")`／`speedOf()`
   零實際消費者 ⇒ **真站「不提供 ultra」對轉輪完全無效**；分級命中停留被彈分下限壓平成 700/700/720。
7. **本輪增量／名次／差距在下一輪起轉時不重置** ⇒ 整個轉輪階段顯示的是上一輪的值。
8. **`i18n` 零容忍棘輪的射程漏了 `core/battle-mode.js`**（被 `SPEC_HOSTS` 整檔排除）
   ⇒ 對戰的勝負條件與名次資訊切到 EN／简中後**全留繁中**，而棘輪全綠。（＝又一條「量測式本身是空的」）
9. **CSS/自適應**：3/4 人房的配對成功畫面在窄螢幕橫向溢出並被 `body{overflow-x:hidden}` 靜默裁掉
   （JS 有 `ax-mm__vs--multi`，CSS 從未寫）；`tokens.css` 承諾的「760 以下收單欄」被沒包 media 的
   `.ax-vs--n3/--n4` 蓋掉；消除動畫 JS 250ms×SP 對上 CSS 固定 0.3s；兩處冒牌 gold；
   `.ax-btn-ghost` 無 `:disabled` 視覺（承諾倒數期間「拒絕」看起來還能按）。
10. **大廳整表重繪（`renderGrid`）每次結構變動就把鍵盤焦點丟回 body**（實測 5 tick 掉 3 次）——
    修法需保留焦點約 250B，**受首屏餘裕 72B 阻塞，刻意不做**。
11. 其餘：`liveroom` 的「離開時退回未結算跟注」是死碼、賞金局翻牌中途離場整注消失於帳外、
    賞金局開 PiP 後換房會對新房扣費、`isBusyView` 是「是否遊戲頁」的第二份真相（缺 chicken／liveroom）、
    自建對戰房永遠 `mine:false` ⇒ 房主結算整條路徑零使用者、私密房是永遠進不去的狀態、
    真站的 Slots Battle 用 `HL.mock.makeHost()` 當對手（全檔無 `HL.site.isLive()` 閘）、
    `loadHistory` 把軟錯誤折成空陣列、建房精靈四個偏好開關無 `aria-label`／`aria-pressed`。

本輪只處理「不能玩」與「按鈕說謊／帳目說謊」。#113 上其餘項目未動：
會員模式 F5 後戰績 `−NT$ NaN`（伺服器 payload 缺欄位、全 repo 無 normalize）、
賞金池原地更新缺漏、大廳「🔥 熱門玩家擂台」是凍結快照、房卡無回合進度、
四個缺的狀態（ROOM_OPEN／SEAT_FILLING／SPECTATE／EXPIRED）、
結算卡兩欄化與可見的平手裁決、「再戰一局」帶價、跳過本輪（Enter）。
另有一輪 9 角度平行巡檢的結果待併入（見同日 loop-journal 條目）。

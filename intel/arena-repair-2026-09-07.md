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

## 7. 仍待做（承接 BACKLOG #113）

本輪只處理「不能玩」與「按鈕說謊／帳目說謊」。#113 上其餘項目未動：
會員模式 F5 後戰績 `−NT$ NaN`（伺服器 payload 缺欄位、全 repo 無 normalize）、
賞金池原地更新缺漏、大廳「🔥 熱門玩家擂台」是凍結快照、房卡無回合進度、
四個缺的狀態（ROOM_OPEN／SEAT_FILLING／SPECTATE／EXPIRED）、
結算卡兩欄化與可見的平手裁決、「再戰一局」帶價、跳過本輪（Enter）。
另有一輪 9 角度平行巡檢的結果待併入（見同日 loop-journal 條目）。

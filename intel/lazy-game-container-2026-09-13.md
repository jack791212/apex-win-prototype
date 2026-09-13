# 內建遊戲延遲載入容器 — 設計全文（#80 → #110 → #189）

> 2026-09-13 遊戲軌·10:00 窗：本文是 `prototype/src/data/lazy-games.js` 原檔頭註解的**完整搬遷**（該檔是
> **eager／開機即載**，長註解逐位元組吃首屏預算；照 CLAUDE.md §10 既有作法「長註解搬進 intel 與鎖」）。
> 出貨檔只留契約摘要 + 本檔連結。**此處是這套容器的唯一完整說明。**

---

## 1. 為什麼存在（船長指令 [M8]／維護軌 M6 首屏預算）

19 個「自帶 render 的內建遊戲 view」共約 235KB，過去全部以 `<script>` 靜態掛在 `index.html`，
但玩家開站只會看到大廳——**這些程式在首屏一行都用不到**。
2026-08-07 實測首屏 1559KB / 97 scripts，距 M6 硬門檻 1600KB 僅剩 41KB、每個平台建置輪 +20~48KB。

本檔把「大廳卡需要的 meta」與「遊戲程式本體」拆開：meta 開機即註冊（卡照樣出現在娛樂城），
程式本體在玩家**第一次開啟該遊戲**時才注入。

## 2. 設計＝容器先於內容（對齊 platform-modules 擴充性模式）

- 新增一款內建遊戲 → 在 `MANIFEST` 加一列，**不必改核心、不必改 index.html**
  （與同仁放置區 `games/registry.json` + `games-loader.js` 同構，刻意複用同一套心智模型）。
- **view 檔本身零改動**：它照舊在自己載入時呼叫 `HL.games.register({... render})`，
  那一呼叫就是「換手」動作——同 id 覆蓋掉本檔註冊的 stub，於是真 render 上線。

## 3. 換手流程（stub → 注入 → 換手 → 重繪）

1. 開機：`MANIFEST` 每款以 meta + `stubRender` 註冊進 `HL.games`（大廳卡與改版前逐欄相同）。
2. 玩家點卡 → `HL.games.launch` → `router.goGame` → `renderGameView` 取到 `stubRender`。
3. `stubRender` 同步回傳「載入中」占位節點（render 契約要求同步回節點），同時開始注入該 src。
4. 該 src 載入完 → view 檔自己的 `HL.games.register` 覆蓋 stub（真 render 就位）
   → 若玩家還停在同一款遊戲頁，呼叫 `HL.app.refresh()` 重繪一次 → 真畫面出現。

## 4. 防呆

- 注入失敗（離線/404）→ 顯示「載入失敗，請稍後再試」節點，**不重繪、不無限迴圈**。
- 檔案載入成功但沒註冊該 id（清單寫錯 src/id）→ 同樣走失敗節點而非重繪迴圈
  （靠 `lazyLoad.state(src)==='done'` 時 render 仍是 stub 來判定；stub 帶 `__lazyStub` 標記）。
- 只在「玩家仍停在這款遊戲」時 refresh，避免玩家已離開卻被硬拉回重繪。

## 5. MANIFEST 的 meta ＝大廳卡的單一資料來源

載入前後都用它。與 view 檔內 register 的 meta 若漂移，大廳卡會在載入瞬間跳動
→ 已由 node 迴歸鎖 `platform/lazy-games-manifest` 機械比對兩邊（見 `prototype/tests/checks-platform.js`），漂移即 FAIL。

卡片欄位預設（`CARD_DEFAULTS` + `fillDefaults`，2026-09-12 遊戲軌）：展開於 boot 前、**顯式值一律勝出**（含顯式 `false`），
把 23 列裡逐列重複的 7 個欄位收成一張預設表 ⇒ 每款新遊戲的邊際成本 ~310 → ~90 bytes。
理由與反向不變量見鎖 `games/lazy-manifest-defaults`。

## 6. 載入順序

`core/lazy-load.js` 與 `games.js` 之後（需 `HL.lazyLoad`／`HL.games.register`）、`main.js` 之前（大廳渲染前 stub 須就位）。
註冊於 `window.HL.lazyGames`。

---

## 7. 🆕 #189（2026-09-13）：樣式也延遲——容器原本只搬了一半

### 發現

`#80`／`#110` 把**遊戲程式**搬離首屏，但**每一款的樣式仍整包留在首屏 `components.css`**。
實測：`components.css` 為 243,163 bytes，其中依 class 前綴歸戶的**各遊戲專用樣式合計約 33.5KB**
（單款 slot 典型 3.1–3.3KB：`.ax-gem` 3,330／`.ax-toad` 3,132／`.ax-pir` 3,103／`.ax-dbn` 3,062…）。
⇒ **玩家一次都沒點開的遊戲，樣式照樣在開站時下載。** 延遲載入容器的節省被自己漏掉的那一半抵銷。

這件事在本輪之所以浮上來，是因為它**擋住了整條遊戲管線**：進場時首屏餘裕僅 **33 bytes**，
而一款新 slot 的首屏成本 ≈ 3,300（CSS）+ ~350（manifest／rtp／edge 三張註冊表）⇒ **任何新遊戲都上不了架**。
4 筆 `specd` 候選卡在管線頂端、本軌自 08-21（Moles）起 23 天沒有新遊戲上線——
過去逐輪記的阻塞理由是「需可靠 preview」（09-12 已證否），**真正的硬牆其實是首屏預算**。

### 落地

`core/lazy-load.js` 的 `load(src)` 依副檔名分派：`.css` → `injectCss`（`<link rel=stylesheet>`），其餘 → `injectScript`。
**刻意走同一個出口**：同一份載入態表 ⇒ 併發只注入一次、可查 `state`、失敗語意一致，不必第二套冪等保證。

`data/lazy-games.js` 的一列可再帶 `css:`；`loadSrc` 對有樣式的列走 `Promise.all([js, css])`——
**兩者都到齊才換手**。少了「都到齊」這一條，真 render 會在樣式抵達前先畫一次 ⇒ 玩家看到一瞬間沒有樣式的盤面。
回傳值只看 `src`：**樣式失敗不該讓一款能玩的遊戲變成「載入失敗」**（退化＝無樣式但可玩）。

### 現況與下一步

- 首款採用者＝`abyssal-surge`（本輪上架）：其 3.4KB 樣式住在 `src/styles/game-abyssal-surge.css`，**首屏零位元組**。
- **既有 25 款尚未遷移**（約 33.5KB 仍在首屏）。刻意不在本輪一起搬：那是 25 款的視覺回歸面，
  本輪沒有能證明「搬完長得一樣」的量具（headless 驗不到 CSS 套用後的版面）。已開卡 **#190**。
- 鎖 `games/lazy-css-rides-with-game` 守三條：① 宣告的 css 檔必須存在；② 有 css 的列必須等兩者到齊才換手；
  ③ **帶自己樣式的遊戲，其 class 前綴不得同時留在首屏 `components.css`**（否則等於兩邊各一份、首屏根本沒省到）。

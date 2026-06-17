# ApexWin Game Dev Kit（獨立測試包）

讓你**不需要整包 ApexWin 平台**，也能獨立開發、測試一款遊戲 `game.js`。
這整包是你的「**測試台**」；最後**只有 `game.js` 是要交回去的成品**。

## 怎麼用（3 步）

1. 把這包解壓到任何地方（桌面也行）。資料夾名字不重要、可改可不改——它只是你的測試台，不是要交回的東西。
2. **打開 `index.html`**：
   - 最簡單：直接用瀏覽器開啟 `index.html`（雙擊即可）。
   - 若你的遊戲要載入圖片/音效等外部檔案，改用小型伺服器避免瀏覽器限制：
     在資料夾內執行 `python -m http.server 8000` 或 `npx serve`，再開 `http://localhost:8000`。
3. **只編輯 `game.js`**（其他檔案不用動）寫你的玩法 → **重新整理頁面**看效果。頂部有餘額顯示、「重設餘額」「重新載入」。有圖就在同資料夾開一個 `assets/`。

## 完成後怎麼交（重要）

**只把 `game.js` 傳回給平台方**（有圖再附一個 `assets/` 資料夾）——
`index.html` / `hl-stub.js` / `styles.css` 是測試台，**不用回傳**。
另外告訴平台方：你的 **暱稱** 和想要的 **遊戲代號**（例 `space-dice`）。

> 你交回的不是「一包資料夾」，而是「一支 `game.js`（＋選用 `assets/`）＋ 暱稱 ＋ 代號」。
> 平台方會把它放進 `games/<暱稱>/<代號>/`、在 `registry.json` 加一行就上架。完整流程見 `../README.md`。

## 檔案說明

| 檔案 | 作用 | 要不要改 |
|---|---|---|
| `game.js` | **你的遊戲**（預設是 Lucky 7 範本） | ✅ 改這支 |
| `index.html` | 測試頁（載入模擬器 + 你的遊戲） | 通常不用 |
| `hl-stub.js` | 輕量 `window.HL` 模擬器 | ❌ 不要改 |
| `styles.css` | 近似平台外觀的樣式 | 不用 |

## 模擬器提供的服務（和正式平台同名同行為）

`HL.dom.el / HL.dom.money / HL.dom.clear`、`HL.ui.toast / modal / comingSoon`、
`HL.state.get / set`（含 `balance`）、`HL.shell.refreshChrome`、`HL.gameFrame.wrap`、
`HL.games.register`、`HL.ticker.add / remove`、`HL.mock.pick / rint / fakeNames`、`HL.money.*`。

> ⚠️ 這是「夠用的模擬」，不是完整平台。版面細節、子母畫面、真正的金流以**正式平台**為準；
> Dev Kit 用來快速把遊戲邏輯與畫面做出來、跑得動。

## 常見問題

- **畫面空白 / 一片黑**：打開瀏覽器 Console（F12）看錯誤。多半是 `game.js` 語法錯，或忘了呼叫 `HL.games.register({...})`。
- **餘額沒變**：改完餘額記得呼叫 `HL.shell.refreshChrome()`（範本已示範）。
- **想重玩**：點頂部「重設餘額」或「重新載入」。

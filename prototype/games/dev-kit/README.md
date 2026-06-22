# ApexWin 遊戲開發包（給同仁）

## 最簡單的 4 步（零環境，不用安裝任何東西）

1. **解壓**這個資料夾到任何地方（桌面也行）。
2. **雙擊 `index.html`** → 立刻看到一個可玩的範例遊戲（先確認跑得起來）。
3. 用 **Claude 改 `game.js`** 成你的玩法（指令可直接複製，見下方〈1. 用 Claude 改 game.js〉）。
4. 做好後，把**成品資料夾**交回平台方（見下方〈3. 完成後怎麼交〉）。

> 這一包就是你需要的**全部**：本說明 ＋ 測試台 ＋ 一個可跑的起手 `game.js`。不需要 ApexWin 整包平台。
> 下面是每一步的細節。

---

## 1. 用 Claude 改 game.js

**你要改的，就是這包裡的 `game.js`**（它現在是一個可以跑的「Lucky 7」範例）。
**不用另外建新檔**，直接把它改成你的玩法。兩種方式：

- **若你會用 Claude Code**：在這個資料夾裡開 Claude，跟它說「把 `game.js` 改成一款 ___（你的玩法）」，它會直接讀並改 `game.js`。
- **若用 claude.ai 網頁版**：把下面這段指令、**連同你 `game.js` 目前的內容**一起貼給 Claude：

```
你要幫我改一支放到「ApexWin Casino」H5 平台的小遊戲 game.js。平台純前端、功能掛在全域 window.HL。
請維持這個結構：用 IIFE 包起來、render() 回傳一個 DOM 節點、最後用 HL.games.register({...}) 自我上架。
可用服務：
- HL.dom.el(tag, props, children)、HL.dom.money(n)
- 餘額(Demo)：讀 HL.state.get().balance；改完餘額後呼叫 HL.shell.refreshChrome()
- 提示：HL.ui.toast(訊息, "ok" 或 "warn")
- 可重用樣式 class：ax-btn-primary、ax-stakes + ax-stake(選中加 is-picked)、ax-muted、ax-demo-tag
我把目前的 game.js 內容附在最後當範例，請照它的結構改成這個玩法：
______（描述：玩法、怎麼下注、賠率、畫面長相）______

（以下是我目前的 game.js，請照這個結構改）
<<在這裡貼上你資料夾裡 game.js 的全部內容>>
```

> `register({...})` 裡記得填：`title`(遊戲名)、`author`(你的暱稱)。其餘照範例即可。

## 2. 測試

- 雙擊 `index.html` 即可開啟。
  （若遊戲要載入圖片/音效，瀏覽器對「雙擊開檔」有限制，改用小 server：在資料夾內執行 `python -m http.server 8000` 或 `npx serve`，再開 `http://localhost:8000`。）
- 改完 `game.js` → **重新整理頁面**看效果。頂部有餘額、「重設餘額」、「重新載入」。
- 圖片/音效放進 `assets/`，在 `game.js` 用相對路徑引用（例 `assets/icon.png`）。

## 3. 完成後怎麼交（重要）

新建一個資料夾，名稱用**平台方給你的編號**：`<編號>_<遊戲名>(<你的暱稱>)`
例：`003_Kill n all(Allen)`。裡面**只放**：
- `game.js`（你的成品）
- `assets/`（有圖才要）

壓成 zip 傳回平台方即可。

> ⚠️ 測試台檔案（`index.html` / `hl-stub.js` / `styles.css` / 本說明 / 範例的 `assets`）**不用回傳**——那是你的工作台。
> 這樣平台方直接整包丟進去就能上架，不必幫你改名搬檔。

---

## 檔案說明

| 檔案 | 作用 | 要不要改 |
|---|---|---|
| `game.js` | **你的遊戲**（現在是 Lucky 7 範例） | ✅ 改這支 |
| `index.html` | 測試頁（載入模擬器 + 你的遊戲） | 不用 |
| `hl-stub.js` | 輕量 `window.HL` 模擬器 | ❌ 不要改 |
| `styles.css` | 近似平台外觀的樣式 | 不用 |
| `assets/` | 放你的圖片/音效（有需要才用） | 有圖才放 |

## 模擬器提供的服務（和正式平台同名同行為）

`HL.dom.el / money / clear`、`HL.ui.toast / modal / comingSoon`、`HL.state.get / set`（含 `balance`）、
`HL.shell.refreshChrome`、`HL.gameFrame.wrap`、`HL.games.register`、`HL.ticker.add / remove`、
`HL.mock.pick / rint / fakeNames`、`HL.money.*`。

> ⚠️ 這是「夠用的模擬」，不是完整平台。版面細節、子母畫面、真正的金流以**正式平台**為準；
> Dev Kit 的用途是讓你把遊戲邏輯與畫面快速做出來、跑得動。

## 常見問題

- **畫面空白 / 一片黑**：打開瀏覽器 Console（F12）看錯誤。多半是 `game.js` 語法錯，或忘了呼叫 `HL.games.register({...})`。
- **餘額沒變**：改完餘額記得呼叫 `HL.shell.refreshChrome()`（範例已示範）。
- **想重玩**：點頂部「重設餘額」或「重新載入」。

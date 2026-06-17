# ApexWin｜同仁開發遊戲放置區（Game SDK）

把同仁（可用 Claude 開發）做的遊戲掛上 ApexWin 平台。**一個資料夾 = 一款遊戲**，自我上架，不用改平台任何核心檔。

---

## 三步上架

1. **複製範例資料夾**
   `games/mina/lucky-seven/` → 改成 `games/<你的暱稱>/<遊戲代號>/`
   例：`games/jack/space-dice/`

2. **改 `game.js`**：把遊戲邏輯寫進 `render()`，並填好 `HL.games.register({...})` 的 metadata（見下）。

3. **登記到清單**：在 `games/registry.json` 的 `games[]` 加一行你的入口路徑：
   ```json
   {
     "games": [
       "games/mina/lucky-seven/game.js",
       "games/jack/space-dice/game.js"
     ]
   }
   ```

存檔重整 → 你的遊戲就會出現在 **娛樂城 → 🧪 同仁開發遊戲（放置區）**，並依暱稱歸到「我們的開發者」。

---

## 資料夾結構

```
games/
  registry.json            ← 遊戲清單（唯一要共同編輯的檔）
  <暱稱>/
    <遊戲代號>/
      game.js              ← 入口：register() + render()（必要）
      assets/              ← 圖片/音效（選用，用相對路徑引用）
```

---

## `game.js` 契約

```js
(function (global) {
  "use strict";
  var HL = global.HL; if (!HL || !HL.games) return;
  var el = HL.dom.el;

  function render() {
    // 1) 用 el(tag, props, children) 組出你的遊戲 DOM
    var node = el("div", { /* ... */ }, [ /* ... */ ]);
    // 2) 回傳節點；可選擇套平台通用外框（全螢幕/劇院/子母畫面/幣別）
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "我的遊戲", key: "my-game" }) : node;
  }

  HL.games.register({
    id: "my-game",        // 全站唯一（英數-）
    title: "我的遊戲",
    author: "你的暱稱",    // 依此分類
    provider: "你的工作室", // 卡片副標
    type: "slot",         // slot | table | live | special | original
    cat: "community",
    community: true,       // 放進「放置區」專區
    playable: true,
    isNew: true,
    c1: "#3a1e6e", c2: "#160a2a", // 無縮圖時的卡片漸層
    // thumb: "games/你的暱稱/遊戲/assets/icon.png", // 有圖更好
    render: render
  });
})(window);
```

### `register()` 欄位

| 欄位 | 必要 | 說明 |
|---|---|---|
| `id` | ✅ | 全站唯一識別（英數與 `-`） |
| `title` | ✅ | 遊戲名稱 |
| `render` | ✅ | 回傳遊戲 DOM 節點的函式 |
| `author` | 建議 | 你的暱稱（大廳依此分組） |
| `community` | 建議 | `true` → 進「同仁開發放置區」專區 |
| `provider` | 選用 | 卡片副標（工作室名） |
| `type` / `cat` | 選用 | 型別 / 分類 |
| `playable` | 選用 | `true` 才會顯示「▶ 可玩」並可進入 |
| `thumb` | 選用 | 縮圖路徑；缺則用 `c1`/`c2` 漸層 |
| `c1` / `c2` | 選用 | 卡片漸層色 |
| `isNew` / `hot` | 選用 | 出現在「最新 / 熱門」區 |

### `render()` 規則
- 回傳「**一個 DOM 節點**」即可，平台會把它掛進遊戲頁。
- 自己的版面/動畫/音效自理；要全螢幕或子母畫面就用 `HL.gameFrame.wrap(node, meta)`。
- 樣式建議**自帶**（inline style 或自己的 class，前綴用遊戲代號避免撞名），不要依賴平台私有 class。

---

## 可用平台服務

| 服務 | 用途 | 範例 |
|---|---|---|
| `HL.dom.el(tag, props, children)` | 建 DOM | `el("button", { onClick: fn }, ["開始"])` |
| `HL.dom.money(n)` | 依目前幣別格式化金額 | `HL.dom.money(1500)` |
| `HL.state.get()` / `HL.state.set({...})` | 讀寫全域狀態（含 `balance`） | 見下方「下注/派彩」 |
| `HL.shell.refreshChrome()` | 改完餘額後刷新頂部顯示 | — |
| `HL.ui.toast(msg, "ok"\|"warn")` | 提示訊息 | `HL.ui.toast("中獎！","ok")` |
| `HL.ui.modal(title, nodes)` | 彈窗（規則/結算） | — |
| `HL.gameFrame.wrap(node, meta)` | 通用外框 | — |
| `HL.money.coinName()` / `isCasual()` | 目前金流模式 | — |

### 下注 / 派彩（Demo 寫法）
```js
function bal() { return HL.state.get().balance; }
function setBal(v) { HL.state.set({ balance: Math.max(0, Math.round(v)) }); HL.shell.refreshChrome(); }

// 扣注
if (bal() < bet) return HL.ui.toast("餘額不足", "warn");
setBal(bal() - bet);
// 派彩
if (win) setBal(bal() + payout);
```
> 目前是純前端 Demo（不扣真錢）。未來接真金時，下注/派彩會改成呼叫後端 API（由平台統一處理），你的遊戲介面不用大改。

---

## 本機測試

1. 把遊戲資料夾放進 `prototype/games/...`、登記進 `registry.json`。
2. 跑本機伺服器：`prototype/serve.ps1`（會印出網址，例如 `http://localhost:8200/?demo=1`）。
3. 開網址 → 娛樂城 → 找到你的遊戲卡 → 點進去玩。
   - 沒出現？打開瀏覽器 Console 看有沒有 `放置區遊戲載入失敗`，多半是 `registry.json` 路徑或 `game.js` 語法問題。

---

## 給 Claude 的開發提示（範本）

> 請依照 `prototype/games/README.md` 的 Game SDK 契約，在 `prototype/games/<暱稱>/<代號>/game.js`
> 做一款「（描述你的遊戲玩法）」。要求：自帶 render() 回傳 DOM、用 HL.games.register 自我上架、
> 下注/派彩用 HL.state.balance 的 Demo 寫法、樣式自帶且 class 前綴用遊戲代號、套 HL.gameFrame.wrap。
> 參考現有範例 `games/mina/lucky-seven/game.js`。

---

## 之後的進階（給平台維護者）

目前是**方案 B**：遊戲與平台同一個頁面執行（適合內部信任的同仁，開發最快）。
要開放給外部、或上真金前，可升級為 **方案 C：iframe 沙箱 + postMessage SDK**——
遊戲變成獨立 mini-site，用訊息橋接下注/餘額/開獎，外部碼被隔離。屆時 `registry.json`
的載入器只需把「注入 script」換成「載入 iframe」，契約其餘不變。

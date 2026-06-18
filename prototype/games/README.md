# ApexWin｜遊戲開發 + 上架流程手冊

同仁（可用 Claude）做的遊戲 → 上架 ApexWin 平台。

> **這份手冊是給平台方（你）看的**：怎麼把開發包交給同仁、怎麼收件上架、SDK 參考、升級路徑。
> **同仁不需要讀這份**——你只要把 `dev-kit/` 那一包（zip）給他們即可，裡面已含他們需要的完整說明（`dev-kit/README.md`）＋ 測試台 ＋ 一個可跑的起手 `game.js`，自成一包。

---

## 0. 30 秒總覽

- **一個資料夾 = 一款遊戲**。遊戲就是一支 `game.js`，自己呼叫 `HL.games.register()` 上架，**不用改平台任何核心檔**。
- 兩種角色：**同仁**（做遊戲）／**平台方**（收檔、上架）。
- 開發測試用 **Dev Kit**（`dev-kit/`）獨立測試包——不需要整包平台也能跑；測好的 `game.js` 原封不動丟回平台。
- 遊戲會出現在 **娛樂城 → 🧪 同仁開發遊戲（放置區）**，並依暱稱歸到「我們的開發者」。
- 目前隔離方案＝**B**（與平台同頁執行，適合內部信任、開發最快）。路線：**B（現況）→ C（iframe 沙箱）→ D（後端＋後台審核）**，見最後一節。

---

## 1. 同仁：怎麼做一款遊戲

> **先決條件（平台方提供）**：同仁是從零開始、不會有專案或 `games/` 路徑。所以**由平台方把 `games/dev-kit/` 這個資料夾打包成 zip，給同仁下載**（Slack／雲端硬碟皆可）。
> 打包很簡單：在檔案總管對 `prototype\games\dev-kit` 資料夾按右鍵 →「壓縮成 ZIP」→ 把這個 zip 傳給同仁即可。同仁只需要這一包，不需要整包平台。
> **派工時順便告訴同仁他的「編號」**（例 `003`），他就能把交付資料夾命名正確，你收到後直接丟進去、不用再改名。

### 1-1　用 Dev Kit 開發（獨立、免整包平台）

1. 解壓拿到的 `dev-kit` zip 到任何地方（桌面也行）。**這個資料夾是你的「測試台」**，名字不重要、可改可不改——它不是要交回的成品。
2. 打開 `index.html`（雙擊即可；要載入圖片/音效再改用小 server：在資料夾內跑 `python -m http.server 8000` 或 `npx serve`）。
3. **只編輯裡面的 `game.js`**（其他檔案不用動）寫你的玩法 → **重新整理頁面**看效果。頂部有餘額、「重設餘額」「重新載入」。有圖就在同資料夾開一個 `assets/`，用相對路徑引用。

> 不需要懂整個平台、不需要架環境。會描述玩法、會把 game.js 傳出來就行。

### 1-2　把玩法交給 Claude（可直接複製的自包含指令）

打開 Claude，**整段貼上**下面內容，把最後一行 `______` 換成你的玩法描述：

```
你要幫我做一款放到「ApexWin Casino」H5 平台的小遊戲。平台純前端、沒有打包工具，
功能都掛在全域 window.HL。請給我「單一檔案 game.js」（一個 IIFE），照規格自我上架，
render() 回傳一個 DOM 節點即可，平台會幫我嵌進遊戲頁。

【檔案骨架】
(function (global) {
  "use strict";
  var HL = global.HL; if (!HL || !HL.games) return;
  var el = HL.dom.el;        // 建 DOM：el(標籤字串, 屬性物件, 子節點陣列)
  var money = HL.dom.money;  // 數字 → 金額字串

  function render() {
    var node = el("div", { style: "text-align:center;padding:18px;" }, [ /* 你的遊戲 */ ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "遊戲名", key: "遊戲代號" }) : node;
  }

  HL.games.register({
    id: "遊戲代號",          // 全站唯一，英數與 -
    title: "遊戲名",
    author: "我的暱稱",       // 平台依暱稱分類
    provider: "我的工作室",
    type: "special",          // slot | table | live | special | original
    cat: "community", community: true,  // 放進「同仁開發放置區」
    playable: true, isNew: true,
    c1: "#3a1e6e", c2: "#160a2a",       // 卡片漸層（沒縮圖時用）
    render: render
  });
})(window);

【可用平台服務】
- el(tag, props, children)：props 可放 class/text/style/onClick/src；children 是陣列（節點或字串）。
- money(n)：金額字串。
- 餘額（Demo，不扣真錢）：
    function bal(){ return HL.state.get().balance; }
    function setBal(v){ HL.state.set({ balance: Math.max(0, Math.round(v)) }); if (HL.shell) HL.shell.refreshChrome(); }
    扣注：if (bal() < bet) return HL.ui.toast("餘額不足","warn"); setBal(bal() - bet);
    派彩：if (win) setBal(bal() + payout);
- 提示：HL.ui.toast(訊息, "ok" 或 "warn")；彈窗：HL.ui.modal(標題, [節點...])
- 可重用平台 class：ax-btn-primary（金色主按鈕）、ax-stakes + ax-stake（下注鈕，選中加 is-picked）、
  ax-muted（灰字）、ax-demo-tag（Demo 標籤）。其餘樣式自帶 inline style，自訂 class 用「遊戲代號-」前綴避免撞名。

【參考範例：Lucky 7】（可直接照抄結構）
(function (global) {
  "use strict";
  var HL = global.HL; if (!HL || !HL.games) return;
  var el = HL.dom.el, money = HL.dom.money;
  function bal(){ return HL.state.get().balance; }
  function setBal(v){ HL.state.set({ balance: Math.max(0, Math.round(v)) }); if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome(); }
  function render() {
    var bet = 50;
    var balEl = el("b", { text: money(bal()) });
    var bigEl = el("div", { text: "7", style: "font-size:88px;font-weight:900;" });
    var resultEl = el("div", { text: "選好金額，按開抽", style: "min-height:22px;margin-top:10px;font-weight:700;" });
    function syncBal(){ balEl.textContent = money(bal()); }
    var betWrap = el("div", { class: "ax-stakes" });
    [10,50,100,500].forEach(function (v) {
      betWrap.appendChild(el("button", { class: "ax-stake" + (v===bet?" is-picked":""), text: String(v),
        onClick: function () { bet = v; Array.prototype.forEach.call(betWrap.children, function(c){c.classList.remove("is-picked");}); this.classList.add("is-picked"); } }));
    });
    function play(){
      if (bal() < bet) return HL.ui.toast("餘額不足（Demo）","warn");
      setBal(bal() - bet); syncBal();
      var n = 1 + Math.floor(Math.random()*7);
      var win = n===7 ? bet*7 : (n>=5 ? bet*2 : 0);
      bigEl.textContent = String(n);
      if (win) { setBal(bal()+win); syncBal(); resultEl.textContent = "🎉 開出 "+n+" 中獎 +"+money(win); HL.ui.toast("中獎 +"+money(win),"ok"); }
      else { resultEl.textContent = "開出 "+n+" 未中"; }
    }
    var node = el("div", { style:"text-align:center;padding:18px;max-width:520px;margin:0 auto;" }, [
      el("div", { style:"display:flex;justify-content:space-between;align-items:center;" }, [ el("h2",{text:"🎰 Lucky 7"}), el("span",{class:"ax-muted"},["餘額 ",balEl]) ]),
      el("div", { style:"padding:24px;border:1px solid #444;border-radius:16px;" }, [bigEl, resultEl]),
      el("div", { style:"margin:16px 0;text-align:left;" }, [ el("small",{class:"ax-muted",text:"下注金額"}), betWrap ]),
      el("button", { class:"ax-btn-primary", text:"開抽 ▶", onClick: play }),
      el("div", { style:"margin-top:12px;" }, [ el("span",{class:"ax-demo-tag",text:"Demo 不扣真錢"}) ])
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title:"Lucky 7", key:"lucky-seven" }) : node;
  }
  HL.games.register({ id:"lucky-seven", title:"Lucky 7", author:"Mina", provider:"Mina Studio",
    type:"special", cat:"community", community:true, playable:true, isNew:true, c1:"#b8860b", c2:"#3a2400", render: render });
})(window);

【我的任務】
請照上面規格，做一款：______（描述：玩法、怎麼下注、賠率、畫面長相）______
完成後給我：1) 完整 game.js　2) 遊戲名與我的暱稱　3) registry.json 要加的那一行
（路徑格式 games/<編號>_<遊戲名>(<我的暱稱>)/game.js，編號由平台方提供，我會回填）。
```

### 1-3　完成後交付（直接建好「交付資料夾」，平台方不用再改）

把成品整理成**一個資料夾**，名稱用平台方給你的編號，格式：

```
<編號>_<遊戲名>(<你的暱稱>)        例：003_Kill n all(Allen)
```

這個資料夾裡**只放**：
- `game.js`（你的成品）
- `assets/`（有圖才要）

然後把這個資料夾壓成 zip 傳回平台方，完成！

> ⚠️ **不要**把測試台檔案（`index.html` / `hl-stub.js` / `styles.css` / dev-kit 的 README）放進交付資料夾——那些只是你的工作台，不用回傳。
> 這樣平台方收到後**直接整包丟進去就能用**，不必幫你改名或搬檔。
>
> 命名小提醒：資料夾名可含中文、空格與括號（已實測平台能正常載入）。萬一日後圖片/音效載不出來，把空格改成 `-` 即可。

---

## 2. 平台方：怎麼上架（白話 3 步）

同仁已照命名慣例建好整個資料夾（例 `003_Kill n all(Allen)/`，內含 `game.js` ［＋`assets/`］），所以你**不用改名、不用搬檔**：

1. 把整個資料夾丟進 `prototype/games/`（變成 `prototype/games/003_Kill n all(Allen)/`）。
2. 打開 `prototype/games/registry.json`，在 `games[]` 加一行那個資料夾的 `game.js` 路徑：
   ```json
   {
     "games": [
       "games/mina/lucky-seven/game.js",
       "games/003_Kill n all(Allen)/game.js"
     ]
   }
   ```
3. 推上正式（`git push`）。等 1–2 分鐘 → 娛樂城「🧪 同仁開發遊戲（放置區）」就會出現。

> **編號由你（平台方）統一分配**（派工時告訴同仁），避免兩位同仁撞號。資料夾名稱平台不限制——loader 只認 `registry.json` 裡的路徑；`<編號>_<遊戲名>(<開發者>)` 只是與你 `Game assets/00N_…` 一致的團隊慣例。

> 想先本機看：跑 `prototype/serve.ps1`，開它印出的網址（`/?demo=1`）→ 娛樂城。
> 沒出現？開瀏覽器 Console 看有沒有「放置區遊戲載入失敗」，多半是路徑或 `game.js` 語法問題。
>
> 你永遠只做「**丟檔 + 加一行 + push**」，不用改任何程式。

---

## 3. Game SDK 契約（參考）

### `register()` 欄位

| 欄位 | 必要 | 說明 |
|---|---|---|
| `id` | ✅ | 全站唯一識別（英數與 `-`） |
| `title` | ✅ | 遊戲名稱 |
| `render` | ✅ | 回傳遊戲 DOM 節點的函式 |
| `author` | 建議 | 你的暱稱（大廳依此分組） |
| `community` | 建議 | `true` → 進「同仁開發放置區」專區 |
| `provider` | 選用 | 卡片副標（工作室名） |
| `type` / `cat` | 選用 | 型別（slot/table/live/special/original）/ 分類 |
| `playable` | 選用 | `true` 才顯示「▶ 可玩」並可進入 |
| `thumb` | 選用 | 縮圖路徑；缺則用 `c1`/`c2` 漸層 |
| `c1` / `c2` | 選用 | 卡片漸層色 |
| `isNew` / `hot` | 選用 | 出現在「最新 / 熱門」區 |

### `render()` 規則
- 回傳「**一個 DOM 節點**」即可，平台會把它掛進遊戲頁。
- 自己的版面/動畫/音效自理；要全螢幕或子母畫面就用 `HL.gameFrame.wrap(node, meta)`。
- 樣式建議**自帶**（inline style 或自訂 class、前綴用遊戲代號），不要依賴平台私有 class。

### 可用平台服務

| 服務 | 用途 |
|---|---|
| `HL.dom.el(tag, props, children)` | 建 DOM |
| `HL.dom.money(n)` / `HL.dom.clear(node)` | 金額字串 / 清空節點 |
| `HL.state.get()` / `HL.state.set({...})` | 讀寫全域狀態（含 `balance`） |
| `HL.shell.refreshChrome()` | 改完餘額後刷新頂部顯示 |
| `HL.ui.toast(msg, "ok"\|"warn")` | 提示訊息 |
| `HL.ui.modal(title, [nodes])` | 彈窗（規則/結算） |
| `HL.gameFrame.wrap(node, meta)` | 通用外框（全螢幕/劇院/子母畫面/幣別） |
| `HL.ticker.add(fn)` / `remove(fn)` | 每秒動畫/倒數（換頁自動停） |
| `HL.mock.pick(arr)` / `rint(a,b)` | 隨機小工具 |
| `HL.money.coinName()` / `isCasual()` | 目前金流模式 |

### 下注 / 派彩（Demo 寫法）
```js
function bal() { return HL.state.get().balance; }
function setBal(v) { HL.state.set({ balance: Math.max(0, Math.round(v)) }); HL.shell.refreshChrome(); }
if (bal() < bet) return HL.ui.toast("餘額不足", "warn");
setBal(bal() - bet);          // 扣注
if (win) setBal(bal() + payout); // 派彩
```
> 目前是純前端 Demo（不扣真錢）。未來接真金時，下注/派彩改成呼叫後端 API（平台統一處理），遊戲介面不用大改。

---

## 4. 兩種交付方式

- **同仁沒 clone 專案**：用 Dev Kit 開發 → 把 `game.js` 傳給平台方 → 平台方做第 2 節 3 步。
- **同仁有 clone 專案**：直接在專案資料夾用 Claude Code 開發，自己把遊戲放進 `games/<暱稱>/<代號>/`、在 `registry.json` 加一行 → 發 PR 給平台方 merge。

---

## 5. 疑難排解

- **大廳沒出現遊戲**：Console 看「放置區遊戲載入失敗」→ 多半是 `registry.json` 路徑或 `game.js` 語法。
- **Dev Kit 畫面空白**：Console（F12）看錯誤；常見是忘了呼叫 `HL.games.register({...})`。
- **餘額沒變**：改完餘額要呼叫 `HL.shell.refreshChrome()`（範本已示範）。

---

## 6. 進階：升級路徑（給平台維護者）

- **B（現況）**：遊戲與平台同頁執行。最快，適合**內部信任**的同仁。
- **C**：iframe 沙箱 + postMessage SDK。遊戲變獨立 mini-site，用訊息橋接下注/餘額/開獎，**外部碼被隔離**、框架自由。要開放給外部或上真金前升級；屆時 `registry.json` 的載入器把「注入 script」換成「載入 iframe」，契約其餘不變。
- **D**：後端遊戲註冊表 + 後台審核上下架（配 C），完整產品形態（目標 2 + 5）。

---

### 相關檔案
- `games/registry.json` — 遊戲清單（平台方加一行的地方）
- `games/dev-kit/` — 獨立測試包（同仁開發用；內含精簡 README）
- `games/mina/lucky-seven/game.js` — 線上可玩的真實範例

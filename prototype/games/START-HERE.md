# 同仁做遊戲・最白話版（START HERE）

兩種角色：**同仁（做遊戲的人）** 和 **平台方（你）**。各自只要做幾步。

---

## 👩‍💻 同仁：怎麼開始（白話 5 步）

1. 想一個小遊戲玩法（例：猜大小、轉盤、骰子、刮刮樂…）。
2. 打開 Claude，把下面「**複製給 Claude 的指令**」整段貼進去，把最後一行 `______` 換成你的玩法描述。
3. Claude 會給你一個 `game.js`。把它存成檔案。
4. （有圖的話）把圖片放同一個資料夾的 `assets/` 裡，在程式裡用相對路徑引用。
5. 把 `game.js`（和圖）傳給平台方（你），告訴他你的**暱稱**和**遊戲名**。完成！

> 不需要懂整個平台、不需要架環境。會描述玩法、會把檔案傳出來就行。

---

## 📋 複製給 Claude 的指令（整段貼上）

```
你要幫我做一款放到「ApexWin Casino」H5 平台的小遊戲。平台是純前端、沒有打包工具，
所有功能掛在全域物件 window.HL 上。請產出「單一檔案 game.js」，是一個 IIFE，照下面規格自我上架。
只要回傳一個 DOM 節點即可，平台會幫我嵌進遊戲頁。

【檔案骨架】
(function (global) {
  "use strict";
  var HL = global.HL; if (!HL || !HL.games) return;
  var el = HL.dom.el;        // 建 DOM：el(標籤字串, 屬性物件, 子節點陣列)
  var money = HL.dom.money;  // 把數字格式化成金額字串

  function render() {
    // 在這裡組出遊戲畫面與邏輯，最後回傳一個 DOM 節點
    var node = el("div", { style: "text-align:center;padding:18px;" }, [ /* ... */ ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "遊戲名", key: "遊戲代號" }) : node;
  }

  HL.games.register({
    id: "遊戲代號",          // 全站唯一，英數與 -
    title: "遊戲名",
    author: "我的暱稱",       // 平台會依暱稱分類
    provider: "我的工作室",
    type: "special",          // slot | table | live | special | original
    cat: "community", community: true,  // 放進「同仁開發放置區」
    playable: true, isNew: true,
    c1: "#3a1e6e", c2: "#160a2a",       // 卡片漸層（沒縮圖時用）
    render: render
  });
})(window);

【可用的平台服務】
- el(tag, props, children)
    props 可放：class / text / style / onClick / src ...；children 是陣列（可放節點或字串）。
    例：el("button", { class: "ax-btn-primary", text: "開始", onClick: play })
- money(n)：金額字串，例 money(1500)
- 餘額讀寫（Demo，不扣真錢）：
    function bal(){ return HL.state.get().balance; }
    function setBal(v){ HL.state.set({ balance: Math.max(0, Math.round(v)) }); if (HL.shell) HL.shell.refreshChrome(); }
    扣注：if (bal() < bet) return HL.ui.toast("餘額不足","warn"); setBal(bal() - bet);
    派彩：if (win) setBal(bal() + payout);
- 提示訊息：HL.ui.toast(訊息, "ok") 或 HL.ui.toast(訊息, "warn")
- 彈窗（規則/結算用）：HL.ui.modal(標題, [節點...])
- 可直接重用的平台樣式 class：
    ax-btn-primary（金色主按鈕）、ax-stakes + ax-stake（下注金額鈕，被選中的加 is-picked）、
    ax-muted（灰字）、ax-demo-tag（Demo 標籤）。
    其餘樣式請自帶 inline style；自訂 class 請用「遊戲代號-」當前綴避免撞名。

【參考範例：Lucky 7（可直接照抄結構）】
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
請照上面規格，做一款：______（在這裡描述：玩法、怎麼下注、賠率、畫面長相）______
完成後請給我：
1) 完整的 game.js
2) 建議資料夾路徑：games/<我的暱稱小寫>/<遊戲代號>/
3) 要加進 registry.json 的那一行（例： "games/mina/lucky-seven/game.js"）
```

---

## 🧑‍🔧 平台方（你）：收到遊戲後做什麼（白話 3 步）

1. 把同仁給的檔案放進：`prototype/games/<暱稱>/<遊戲代號>/game.js`（有圖就連 `assets/` 一起放）。
2. 打開 `prototype/games/registry.json`，在 `games[]` 加一行那個路徑：
   ```json
   {
     "games": [
       "games/mina/lucky-seven/game.js",
       "games/<暱稱>/<遊戲代號>/game.js"
     ]
   }
   ```
3. 推上正式（git push）。等 1–2 分鐘 → 娛樂城「🧪 同仁開發遊戲（放置區）」就會出現這款遊戲。

> 想先在本機看：跑 `prototype/serve.ps1`，開它印出的網址（`/?demo=1`）→ 娛樂城。
> 沒出現的話：開瀏覽器 Console 看有沒有「放置區遊戲載入失敗」，多半是路徑或 game.js 語法問題。

（進階：若同仁自己有 clone 專案，可直接在專案資料夾用 Claude Code 開發、自己加 registry.json 那行、發 PR 給你；你只要 merge。）

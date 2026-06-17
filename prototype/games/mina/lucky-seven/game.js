/*
 * 範例遊戲：Lucky 7（同仁開發放置區示範）
 * 這支檔案示範「一個資料夾 = 一款遊戲」如何自我上架到 ApexWin：
 *   - 自帶 render()，回傳遊戲 DOM 節點（可用 HL.gameFrame.wrap 套通用外框）
 *   - 透過 HL.games.register() 掛進大廳（不需修改任何核心檔）
 *   - 使用平台服務：餘額(HL.state.balance) / 提示(HL.ui.toast) / 幣別格式(HL.dom.money)
 * 作者把這個資料夾複製改名，就能做出自己的遊戲。詳見 games/README.md。
 */
(function (global) {
  "use strict";
  var HL = global.HL;
  if (!HL || !HL.games) return; // 平台未就緒則略過
  var el = HL.dom.el;
  var money = HL.dom.money;

  // 平台餘額（Demo：直接調整本機 state；正式接金流時改呼叫後端 API）
  function bal() { return HL.state.get().balance; }
  function setBal(v) {
    HL.state.set({ balance: Math.max(0, Math.round(v)) });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome(); // 同步頂部餘額顯示
  }

  function render() {
    var bet = 50;
    var balEl = el("b", { text: money(bal()) });
    var bigEl = el("div", { text: "7", style: "font-size:88px;font-weight:900;line-height:1;background:linear-gradient(180deg,#ffd76a,#b8860b);-webkit-background-clip:text;background-clip:text;color:transparent;" });
    var resultEl = el("div", { text: "選好金額，按「開抽」試試手氣", style: "min-height:22px;margin-top:10px;font-weight:700;color:var(--ax-text-muted);" });
    function syncBal() { balEl.textContent = money(bal()); }

    var betWrap = el("div", { class: "ax-stakes" });
    [10, 50, 100, 500].forEach(function (v) {
      betWrap.appendChild(el("button", {
        class: "ax-stake" + (v === bet ? " is-picked" : ""), text: String(v),
        onClick: function () { bet = v; Array.prototype.forEach.call(betWrap.children, function (c) { c.classList.remove("is-picked"); }); this.classList.add("is-picked"); }
      }));
    });

    function play() {
      if (bal() < bet) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      setBal(bal() - bet); syncBal();
      var n = 1 + Math.floor(Math.random() * 7);              // 1..7
      var win = n === 7 ? bet * 7 : (n >= 5 ? bet * 2 : 0);   // 7→7x、5/6→2x、其餘不中
      bigEl.textContent = String(n);
      if (win) {
        setBal(bal() + win); syncBal();
        resultEl.textContent = "🎉 開出 " + n + "　中獎 +" + money(win);
        resultEl.style.color = "var(--ax-green, #34d399)";
        HL.ui.toast("Lucky 7 中獎 +" + money(win) + "（Demo）", "ok");
      } else {
        resultEl.textContent = "開出 " + n + "　未中，再試一次";
        resultEl.style.color = "var(--ax-text-muted)";
      }
    }

    var node = el("div", { style: "text-align:center;padding:18px;max-width:520px;margin:0 auto;" }, [
      el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;" }, [
        el("h2", { text: "🎰 Lucky 7", style: "margin:0;" }),
        el("span", { class: "ax-muted" }, ["餘額 ", balEl])
      ]),
      el("div", { style: "padding:24px;border:1px solid var(--ax-border-soft);border-radius:16px;background:rgba(255,255,255,0.02);" }, [bigEl, resultEl]),
      el("div", { style: "margin:16px 0 12px;text-align:left;" }, [el("small", { class: "ax-muted", text: "下注金額" }), betWrap]),
      el("button", { class: "ax-btn-primary", text: "開抽 ▶", onClick: play }),
      el("div", { style: "margin-top:12px;" }, [el("span", { class: "ax-demo-tag", text: "同仁開發範例 · Demo 不扣真錢" })])
    ]);

    // 套用平台通用外框（全螢幕 / 劇院 / 子母畫面 / 幣別）
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Lucky 7", provider: "Mina Studio", key: "lucky-seven" }) : node;
  }

  HL.games.register({
    id: "lucky-seven",
    title: "Lucky 7",
    author: "Mina",            // 依暱稱分類（大廳「我們的開發者」）
    provider: "Mina Studio",
    type: "special",
    cat: "community",
    community: true,           // 放進娛樂城「同仁開發放置區」
    playable: true,
    isNew: true,
    c1: "#b8860b", c2: "#3a2400", // 大廳卡片漸層（無縮圖時）
    render: render
  });
})(window);

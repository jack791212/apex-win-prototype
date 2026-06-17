/*
 * 你的遊戲就寫在這支檔案。預設放了「Lucky 7」當起手範本，直接改成你的玩法即可。
 * 開發流程：改這支 → 重新整理 index.html → 看效果。
 * 完成後把「這支 game.js」原封不動丟回 ApexWin 的 games/<暱稱>/<遊戲代號>/game.js。
 * 規格與完整流程見 ../README.md（開發+上架流程手冊）。
 */
(function (global) {
  "use strict";
  var HL = global.HL;
  if (!HL || !HL.games) return;
  var el = HL.dom.el;
  var money = HL.dom.money;

  function bal() { return HL.state.get().balance; }
  function setBal(v) {
    HL.state.set({ balance: Math.max(0, Math.round(v)) });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
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
      var n = 1 + Math.floor(Math.random() * 7);
      var win = n === 7 ? bet * 7 : (n >= 5 ? bet * 2 : 0);
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
        el("h2", { text: "🎰 Lucky 7" }),
        el("span", { class: "ax-muted" }, ["餘額 ", balEl])
      ]),
      el("div", { style: "padding:24px;border:1px solid var(--ax-border-soft);border-radius:16px;background:rgba(255,255,255,0.02);" }, [bigEl, resultEl]),
      el("div", { style: "margin:16px 0 12px;text-align:left;" }, [el("small", { class: "ax-muted", text: "下注金額" }), betWrap]),
      el("button", { class: "ax-btn-primary", text: "開抽 ▶", onClick: play }),
      el("div", { style: "margin-top:12px;" }, [el("span", { class: "ax-demo-tag", text: "同仁開發範例 · Demo 不扣真錢" })])
    ]);

    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Lucky 7", provider: "Mina Studio", key: "lucky-seven" }) : node;
  }

  HL.games.register({
    id: "lucky-seven",
    title: "Lucky 7",
    author: "Mina",
    provider: "Mina Studio",
    type: "special",
    cat: "community",
    community: true,
    playable: true,
    isNew: true,
    c1: "#b8860b", c2: "#3a2400",
    render: render
  });
})(window);

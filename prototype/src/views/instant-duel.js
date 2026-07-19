/*
 * Apex Win｜即時遊戲：Dice Duel 骰子對決（PvP vs Bot，重用 HL.instant 餘額/金額欄 + HL.fair 可驗證亂數）
 * 機制（對標 Duelbits Dice Duels 1v1）：玩家與一位對手（mock bot，沿用 #15 leaderboard bot 命名/頭像池）
 *   各擲一次點數（0–99），高者勝、贏家通吃「雙方賭注池」扣 1% 平台抽水＝1% 莊家優勢。
 *   平手則重擲（各多取一個 nonce）直到分出勝負。
 * 每次擲點 = HL.fair.float("dice-duel") 一注（一擲一 nonce）：point = floor(f*100)＝逐擲可驗證重算。
 * 派彩 = floor(bet * 1.98)（floor 而非 round：小注時 round 會反轉 1% edge，floor 保證 edge 恆 ≥1%）。
 * ApexWin 首個 PvP 對戰維度（此前所有 Originals 皆單人對莊）。以 register 新增 originals 可玩卡（id: dice-duel）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var RAKE = 0.99;          // 贏家通吃扣 1% 抽水 → 派彩 = bet*(2*RAKE)=bet*1.98
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return (HL.fair && HL.fair.float) ? HL.fair.float("dice-duel") : Math.random(); }
  function roll() { return Math.floor(rnd() * 100); } // 0..99，一擲一 nonce
  var pad = HL.dom.pad; // 沿用共用 helper（見 core/dom.js）

  function duelGame() {
    var busy = false;
    var amt = HL.instant.amountField(50);

    // 對戰雙方面板
    var youScore = el("b", { class: "ax-ddu__score", text: "—" });
    var oppScore = el("b", { class: "ax-ddu__score", text: "—" });
    var youCard = el("div", { class: "ax-ddu__side is-you" }, [
      el("div", { class: "ax-ddu__av", text: "👑" }),
      el("div", { class: "ax-ddu__name", text: "你" }),
      youScore
    ]);
    var oppName = el("div", { class: "ax-ddu__name", text: "對手" });
    var oppAv = el("div", { class: "ax-ddu__av", text: "🤖" });
    var oppCard = el("div", { class: "ax-ddu__side is-opp" }, [oppAv, oppName, oppScore]);
    var board = el("div", { class: "ax-ddu__board" }, [youCard, el("div", { class: "ax-ddu__vs", text: "VS" }), oppCard]);

    var histEl = HL.ui.histBar({ cls: "ax-ddu__hist", itemCls: "ax-ddu__h", max: 10, fair: true });
    var statusEl = el("div", { class: "ax-inst__last ax-muted" }, [el("span", { text: "設定賭注，向對手發起 1v1 骰子對決 ⚔️" })]);
    var battleBtn = el("button", { class: "ax-btn-primary", text: "對戰" });

    function setStatus(nodes, cls) {
      HL.dom.clear(statusEl);
      nodes.forEach(function (n) { statusEl.appendChild(n); });
      statusEl.className = "ax-inst__last " + (cls || "ax-muted");
    }
    function record(bet, payout) { if (HL.liveStats) HL.liveStats.record("dice-duel", bet, payout); }
    function pushHist(you, opp, win) { histEl.push(pad(you) + " : " + pad(opp), win ? "is-win" : "is-lose"); }
    function clearMarks() { youCard.classList.remove("is-winner", "is-loser"); oppCard.classList.remove("is-winner", "is-loser"); }

    function battle() {
      if (busy) return;
      var bet = amt.get();
      if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      busy = true; battleBtn.disabled = true;
      setBal(bal() - bet);

      // 配對一位對手（bot 池）
      var opp = HL.mock.makeHost();
      oppAv.textContent = opp.av; oppName.textContent = opp.name;
      clearMarks(); youScore.textContent = "—"; oppScore.textContent = "—";

      // 先用可驗證亂數定勝負（平手重擲，各多取一 nonce；guard 防理論無限迴圈）
      var you, oth, guard = 0;
      do { you = roll(); oth = roll(); guard++; } while (you === oth && guard < 30);
      var win = you > oth;
      var payout = win ? Math.floor(bet * (2 * RAKE)) : 0; // 贏家通吃扣 1% 抽水

      // 立即同步結算＝房規「先入帳再演出」：中途離場也不漏帳（不把金流綁在動畫回呼上）
      if (payout) setBal(bal() + payout);
      record(bet, payout);

      // 擲骰演出（純視覺）：以 setTimeout 收尾（背景分頁也會觸發，不依賴會被暫停的 rAF），揭曉可驗證結果
      setStatus([el("span", { text: "擲骰中…" })], "ax-muted");
      youScore.classList.add("is-rolling"); oppScore.classList.add("is-rolling");
      youScore.textContent = "?"; oppScore.textContent = "?";
      setTimeout(function () {
        youScore.classList.remove("is-rolling"); oppScore.classList.remove("is-rolling");
        youScore.textContent = pad(you); oppScore.textContent = pad(oth);
        pushHist(you, oth, win);
        youCard.classList.add(win ? "is-winner" : "is-loser");
        oppCard.classList.add(win ? "is-loser" : "is-winner");
        if (win) setStatus([el("span", { text: "🏆 你贏了！贏家通吃 " }), el("b", { class: "ax-gold", text: "+" + money(payout - bet) })], "ax-green");
        else setStatus([el("span", { text: "💥 你輸了，賭注歸對手 " }), el("b", { text: "-" + money(bet) })], "ax-red");
        busy = false; battleBtn.disabled = false;
      }, 800);
    }
    battleBtn.addEventListener("click", battle);

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "⚔️ Dice Duel 骰子對決" }),
      el("div", { class: "ax-inst__stage ax-ddu" }, [board, histEl.node]),
      amt.node,
      el("div", { class: "ax-crash__btns" }, [battleBtn]),
      statusEl,
      HL.ui.gameInfoBar({ fair: "一擲一注", edge: "1% 莊家優勢（贏家通吃扣 1% 抽水）", note: "平手重擲" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Dice Duel 骰子對決", provider: "Apex Studio", key: "dice-duel" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "dice-duel", title: "Dice Duel 骰子對決", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e1e3a", c2: "#2a0a14", render: duelGame });
  }
})(window);

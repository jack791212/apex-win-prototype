/*
 * Apex Win｜即時遊戲：Hilo 猜高低（互動式回合，重用 HL.instant 餘額/金額欄 + HL.fair 可驗證亂數）
 * 機制（對標 Stake/Gamdom Hilo）：翻一張牌，猜下一張比它「更高」或「更低」（嚴格比較、同點算輸，
 *   賠率已按機率定價）：p(更高)=(12-r)/13、p(更低)=r/13（r=0..12，A 最小 K 最大），
 *   單步倍數 = EDGE/p（1% 莊家優勢）→ 連對累乘，隨時可兌現帶走；K 只能猜更低、A 只能猜更高。
 * 每張牌 = HL.fair.float("hilo") 一注（一牌一 nonce）：card = floor(f*52)，rank = card%13、花色純裝飾＝逐牌可驗證重算。
 * 以 register 新增 originals 可玩卡（id: hilo）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var EDGE = 0.99;
  var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var SUITS = ["♠", "♥", "♦", "♣"];
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return (HL.fair && HL.fair.float) ? HL.fair.float("hilo") : Math.random(); }

  function drawCard() { var c = Math.floor(rnd() * 52); return { rank: c % 13, suit: Math.floor(c / 13) }; }
  function pHi(rank) { return (12 - rank) / 13; }  // 嚴格更高的機率
  function pLo(rank) { return rank / 13; }         // 嚴格更低的機率

  function hiloGame() {
    var active = false, roundBet = 0, mult = 1, streak = 0, cur = null;

    var amt = HL.instant.amountField(50);
    var multEl = el("b", { class: "ax-mines__mult", text: "1.00×" });
    var winEl = el("b", { class: "ax-gold", text: "—" });
    var streakEl = el("b", { text: "0" });
    var cardEl = el("div", { class: "ax-hilo__card is-back", text: "🂠" });
    var histEl = el("div", { class: "ax-hilo__hist" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted" }, [el("span", { text: "按「開始」翻第一張牌，猜下一張更高或更低 🃏" })]);
    var startBtn = el("button", { class: "ax-btn-primary", text: "開始" });
    var cashBtn = el("button", { class: "ax-btn-primary ax-crash__cash", text: "兌現", disabled: "disabled" });
    var hiBtn = el("button", { class: "ax-hilo__guess", disabled: "disabled" });
    var loBtn = el("button", { class: "ax-hilo__guess", disabled: "disabled" });

    function setStatus(nodes, cls) {
      HL.dom.clear(statusEl);
      nodes.forEach(function (n) { statusEl.appendChild(n); });
      statusEl.className = "ax-inst__last " + (cls || "ax-muted");
    }
    function record(payout) { if (HL.liveStats) HL.liveStats.record("hilo", roundBet, payout); }
    function potWin() { return Math.floor(roundBet * mult); } // floor 而非 round：小注時 round 會反轉 1% edge（如 bet 3 × 1.17 = 3.51 → 4 ＝玩家正 EV 可刷），floor 保證 edge 恆 ≥1%

    function cardFace(c) { return RANKS[c.rank] + SUITS[c.suit]; }
    function paintCard(c) {
      cardEl.textContent = cardFace(c);
      cardEl.className = "ax-hilo__card" + (c.suit === 1 || c.suit === 2 ? " is-red" : "");
      cardEl.classList.remove("flip"); void cardEl.offsetWidth; cardEl.classList.add("flip");
    }
    function pushHist(c, good) {
      histEl.appendChild(el("span", { class: "ax-hilo__h" + (good == null ? "" : good ? " is-win" : " is-lose") + (c.suit === 1 || c.suit === 2 ? " is-red" : ""), text: cardFace(c) }));
      while (histEl.children.length > 10) histEl.removeChild(histEl.firstChild);
    }

    // 猜測鈕：顯示方向 + 單步倍數 +（機率）。機率為 0 的方向鎖住（K 無更高、A 無更低）。
    function refreshGuess() {
      var canHi = active && pHi(cur.rank) > 0, canLo = active && pLo(cur.rank) > 0;
      HL.dom.clear(hiBtn);
      hiBtn.appendChild(el("span", { text: "⬆ " }));
      hiBtn.appendChild(el("span", { text: "更高" }));
      if (canHi) hiBtn.appendChild(document.createTextNode(" " + (EDGE / pHi(cur.rank)).toFixed(2) + "× (" + Math.round(pHi(cur.rank) * 100) + "%)"));
      HL.dom.clear(loBtn);
      loBtn.appendChild(el("span", { text: "⬇ " }));
      loBtn.appendChild(el("span", { text: "更低" }));
      if (canLo) loBtn.appendChild(document.createTextNode(" " + (EDGE / pLo(cur.rank)).toFixed(2) + "× (" + Math.round(pLo(cur.rank) * 100) + "%)"));
      if (canHi) hiBtn.removeAttribute("disabled"); else hiBtn.setAttribute("disabled", "disabled");
      if (canLo) loBtn.removeAttribute("disabled"); else loBtn.setAttribute("disabled", "disabled");
    }
    function refreshStats() {
      multEl.textContent = mult.toFixed(2) + "×";
      streakEl.textContent = String(streak);
      winEl.textContent = active && streak > 0 ? money(potWin()) : "—";
      multEl.classList.remove("bump"); void multEl.offsetWidth; multEl.classList.add("bump");
    }
    function endLock() { active = false; cashBtn.disabled = true; startBtn.disabled = false; refreshGuess(); }

    function guess(dir) { // dir: 1=更高、-1=更低
      if (!active) return;
      var p = dir > 0 ? pHi(cur.rank) : pLo(cur.rank);
      if (p <= 0) return;
      var next = drawCard(); // 一牌一 nonce
      var good = dir > 0 ? next.rank > cur.rank : next.rank < cur.rank;
      paintCard(next); pushHist(next, good);
      if (good) {
        mult *= EDGE / p; streak++;
        cur = next; refreshGuess(); refreshStats();
        setStatus([el("span", { text: "✅ 猜對！可繼續或兌現" })], "ax-green");
      } else {
        record(0); endLock(); winEl.textContent = "—";
        setStatus([el("span", { text: "💥 猜錯，這局結束" })], "ax-red");
      }
    }

    function start() {
      if (active) return;
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      setBal(bal() - bet); roundBet = bet; mult = 1; streak = 0; active = true;
      HL.dom.clear(histEl);
      cur = drawCard(); paintCard(cur); pushHist(cur, null);
      cashBtn.disabled = false; startBtn.disabled = true;
      refreshGuess(); refreshStats();
      setStatus([el("span", { text: "猜下一張比" }), el("span", { text: " " + cardFace(cur) + " " }), el("span", { text: "更高還是更低？同點算輸" })], "ax-muted");
    }
    function cashOut() {
      if (!active) return;
      if (streak === 0) { HL.ui.toast("至少猜對一次再兌現", "warn"); return; }
      var payout = potWin(); setBal(bal() + payout); record(payout);
      setStatus([el("span", { text: "已兌現" }), el("span", { text: " " + mult.toFixed(2) + "× +" + money(payout - roundBet) })], "ax-green");
      endLock(); refreshStats();
    }

    startBtn.addEventListener("click", start);
    cashBtn.addEventListener("click", cashOut);
    hiBtn.addEventListener("click", function () { guess(1); });
    loBtn.addEventListener("click", function () { guess(-1); });
    refreshGuess();

    function stat(l, n) { return el("div", { class: "ax-mines__stat" }, [el("small", { class: "ax-muted", text: l }), n]); }
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🃏 Hilo 猜高低" }),
      el("div", { class: "ax-inst__stage ax-hilo" }, [
        el("div", { class: "ax-mines__top" }, [stat("目前", multEl), stat("連對", streakEl), stat("可贏", winEl)]),
        cardEl,
        histEl,
        el("div", { class: "ax-hilo__btns" }, [hiBtn, loBtn])
      ]),
      amt.node,
      el("div", { class: "ax-crash__btns" }, [startBtn, cashBtn]),
      statusEl,
      el("span", { class: "ax-demo-tag", text: "1% 莊家優勢 · Demo · 連對累乘，同點算輸 · 可驗證公平（一牌一注）" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Hilo 猜高低", provider: "Apex Studio", key: "hilo" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "hilo", title: "Hilo 猜高低", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1e4a6e", c2: "#0a1a2a", render: hiloGame });
  }
})(window);

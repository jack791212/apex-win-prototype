/*
 * Apex Win｜百家樂 Baccarat（掛在 HL.table 共用桌遊引擎上）
 * 真開牌：標準補牌規則（閒 0–5 補、莊依閒第三張補牌表）、天牌 8/9 停。
 * 注區：閒 1:1、莊 1:1(扣 5% 傭金=1.95)、和 8:1、閒對/莊對 11:1。
 * 結算走 HL.table（扣注/派彩/餘額同步 + 掛 HL.liveStats.record）。
 * 以 HL.games.register 覆蓋 mock 的「Baccarat」占位卡（id: baccarat）為可玩。
 * 載入順序：data/games.js 之後（覆蓋 seed）、core/table.js 之後。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;

  var SUITS = ["♠", "♥", "♦", "♣"];
  var RANKS = [
    { r: "A", v: 1 }, { r: "2", v: 2 }, { r: "3", v: 3 }, { r: "4", v: 4 }, { r: "5", v: 5 },
    { r: "6", v: 6 }, { r: "7", v: 7 }, { r: "8", v: 8 }, { r: "9", v: 9 },
    { r: "10", v: 0 }, { r: "J", v: 0 }, { r: "Q", v: 0 }, { r: "K", v: 0 }
  ];
  function drawCard() {
    var rk = RANKS[Math.floor(Math.random() * RANKS.length)];
    var st = SUITS[Math.floor(Math.random() * SUITS.length)];
    return { rank: rk.r, val: rk.v, suit: st, red: st === "♥" || st === "♦" };
  }
  function pointOf(cards) { var s = 0; cards.forEach(function (c) { s += c.val; }); return s % 10; }

  // 真開牌：回傳完整一手（含補牌、點數、勝方、對子）
  function dealHands() {
    var P = [drawCard(), drawCard()], B = [drawCard(), drawCard()];
    var pt = pointOf(P), bt = pointOf(B);
    var natural = pt >= 8 || bt >= 8;
    var p3 = null;
    if (!natural) {
      if (pt <= 5) { p3 = drawCard(); P.push(p3); }       // 閒：0–5 補、6–7 停
      var draw = false;
      if (p3 === null) { draw = bt <= 5; }                  // 閒停 → 莊 0–5 補
      else {                                                // 閒補 → 莊依補牌表（v=閒第三張點值 0–9）
        var v = p3.val;
        if (bt <= 2) draw = true;
        else if (bt === 3) draw = v !== 8;
        else if (bt === 4) draw = v >= 2 && v <= 7;
        else if (bt === 5) draw = v >= 4 && v <= 7;
        else if (bt === 6) draw = v >= 6 && v <= 7;
        else draw = false;                                 // 莊 7 停
      }
      if (draw) B.push(drawCard());
    }
    pt = pointOf(P); bt = pointOf(B);
    return {
      P: P, B: B, pt: pt, bt: bt,
      winner: pt > bt ? "player" : (bt > pt ? "banker" : "tie"),
      pPair: P[0].rank === P[1].rank,
      bPair: B[0].rank === B[1].rank
    };
  }
  // 各注區總賠付倍數（輸=0、和退本=1）
  function returnsOf(o) {
    return {
      player: o.winner === "player" ? 2 : (o.winner === "tie" ? 1 : 0),
      banker: o.winner === "banker" ? 1.95 : (o.winner === "tie" ? 1 : 0),
      tie: o.winner === "tie" ? 9 : 0,
      ppair: o.pPair ? 12 : 0,
      bpair: o.bPair ? 12 : 0
    };
  }

  function infoModal() {
    HL.ui.modal("百家樂 · 規則 / 賠率", [
      el("p", { class: "ax-muted", text: "閒/莊各發兩張，依標準補牌規則開牌；點數＝各牌點和個位數（10/J/Q/K=0、A=1），最接近 9 者勝。" }),
      el("ul", { class: "ax-bacc__rules" }, [
        el("li", {}, [el("b", { text: "閒 PLAYER " }), el("span", { text: "1:1（贏家退 2×）" })]),
        el("li", {}, [el("b", { text: "莊 BANKER " }), el("span", { text: "1:1，扣 5% 傭金（退 1.95×）" })]),
        el("li", {}, [el("b", { text: "和 TIE " }), el("span", { text: "8:1（退 9×）；和局時閒/莊退回本金" })]),
        el("li", {}, [el("b", { text: "閒對 / 莊對 " }), el("span", { text: "前兩張同點＝對子，11:1（退 12×）" })])
      ]),
      el("p", { class: "ax-muted", text: "天牌：任一方前兩張為 8 或 9 即停牌。本桌為 RNG（亂數）開牌 · Demo。" })
    ]);
  }

  function baccaratGame() {
    var spotEls = {};
    var playerCards = el("div", { class: "ax-bacc__cards" });
    var bankerCards = el("div", { class: "ax-bacc__cards" });
    var pTotal = el("div", { class: "ax-bacc__pt", text: "–" });
    var bTotal = el("div", { class: "ax-bacc__pt", text: "–" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "下注後按「開牌」，閒/莊比點數，最接近 9 者勝 🎴" });
    var history = el("div", { class: "ax-bacc__history" });

    function hand(label, cardsEl, totalEl, cls) {
      return el("div", { class: "ax-bacc__hand " + cls }, [
        el("div", { class: "ax-bacc__handhead" }, [el("span", { class: "ax-bacc__handlbl", text: label }), totalEl]),
        cardsEl
      ]);
    }

    function spot(id, label, odds, cls) {
      var badge = el("div", { class: "ax-bacc__stake" });
      var box = el("button", { class: "ax-bacc__spot " + cls, onClick: function () { area.place(id); } }, [
        el("div", { class: "ax-bacc__spotlbl", text: label }),
        el("small", { class: "ax-bacc__odds", text: odds }),
        badge
      ]);
      spotEls[id] = { badge: badge, box: box };
      return box;
    }

    function renderStakes() {
      for (var id in spotEls) {
        var v = area.staked(id);
        spotEls[id].badge.textContent = v ? money(v) : "";
        spotEls[id].box.classList.toggle("is-staked", v > 0);
      }
    }

    var area = HL.table.betArea({ game: "baccarat", onChange: renderStakes });

    function renderHand(container, cards) {
      HL.dom.clear(container);
      cards.forEach(function (c, i) {
        container.appendChild(el("div", { class: "ax-card ax-card--in" + (c.red ? " is-red" : ""), style: "animation-delay:" + (i * 0.12).toFixed(2) + "s" }, [
          el("span", { class: "ax-card__r", text: c.rank }),
          el("span", { class: "ax-card__s", text: c.suit })
        ]));
      });
    }
    function clearTable() {
      HL.dom.clear(playerCards); HL.dom.clear(bankerCards);
      pTotal.textContent = "–"; bTotal.textContent = "–";
      pTotal.className = "ax-bacc__pt"; bTotal.className = "ax-bacc__pt";
      for (var id in spotEls) spotEls[id].box.classList.remove("is-win");
    }
    function pushHistory(o) {
      var k = o.winner === "player" ? "P" : (o.winner === "banker" ? "B" : "T");
      var pill = el("span", { class: "ax-bacc__bead is-" + o.winner, text: k });
      history.insertBefore(pill, history.firstChild);
      while (history.children.length > 18) history.removeChild(history.lastChild);
    }

    function onDeal() {
      var snap = area.commit(); if (!snap) return;
      area.lock(true); ctrls.dealBtn.disabled = true;
      clearTable();
      statusEl.textContent = "開牌中…"; statusEl.className = "ax-inst__last ax-muted";

      var o = dealHands();          // 立即算出整局結果
      var ret = returnsOf(o);
      renderHand(playerCards, o.P); // CSS 交錯動畫進場（視覺盡力）
      renderHand(bankerCards, o.B);

      // 單一 setTimeout 閘門保證結算（背景分頁/無 rAF 也成立）
      var revealMs = 250 + Math.max(o.P.length, o.B.length) * 130 + 250;
      setTimeout(function () {
        pTotal.textContent = String(o.pt); bTotal.textContent = String(o.bt);
        pTotal.className = "ax-bacc__pt" + (o.winner === "player" ? " is-win" : "");
        bTotal.className = "ax-bacc__pt" + (o.winner === "banker" ? " is-win" : "");
        // 亮出中獎注區
        var winSpots = { player: o.winner === "player", banker: o.winner === "banker", tie: o.winner === "tie", ppair: o.pPair, bpair: o.bPair };
        for (var id in spotEls) if (winSpots[id]) spotEls[id].box.classList.add("is-win");

        var r = area.settle(snap, ret);
        var who = o.winner === "player" ? "閒贏" : (o.winner === "banker" ? "莊贏" : "和局");
        var pairTxt = (o.pPair ? " · 閒對" : "") + (o.bPair ? " · 莊對" : "");
        statusEl.textContent = "閒 " + o.pt + " : " + o.bt + " 莊 — " + who + pairTxt + "　"
          + (r.net >= 0 ? "贏 +" + money(r.net) : "輸 " + money(-r.net));
        statusEl.className = "ax-inst__last " + (r.net >= 0 ? "ax-green" : "ax-red");
        pushHistory(o);
        area.lock(false); area.clear(); ctrls.dealBtn.disabled = false; // 清空本局籌碼，下一局重新下注（重押用「重押」鈕）
      }, revealMs);
    }

    var ctrls = area.controls(onDeal, "開牌");

    var node = el("div", { class: "ax-inst ax-bacc ax-fade-in" }, [
      el("div", { class: "ax-bacc__titlerow" }, [
        el("h2", { class: "ax-inst__title", text: "🎴 百家樂 Baccarat" }),
        el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal })
      ]),
      el("div", { class: "ax-bacc__felt" }, [
        el("div", { class: "ax-bacc__hands" }, [
          hand("閒 PLAYER", playerCards, pTotal, "is-player"),
          el("div", { class: "ax-bacc__vs", text: "VS" }),
          hand("莊 BANKER", bankerCards, bTotal, "is-banker")
        ]),
        statusEl
      ]),
      el("div", { class: "ax-bacc__bets" }, [
        el("div", { class: "ax-bacc__pairs" }, [
          spot("ppair", "閒對", "11:1", "ax-bacc__spot--ppair"),
          spot("bpair", "莊對", "11:1", "ax-bacc__spot--bpair")
        ]),
        el("div", { class: "ax-bacc__main" }, [
          spot("player", "閒 PLAYER", "1:1", "ax-bacc__spot--player"),
          spot("tie", "和 TIE", "8:1", "ax-bacc__spot--tie"),
          spot("banker", "莊 BANKER", "1:1 −5%", "ax-bacc__spot--banker")
        ])
      ]),
      el("div", { class: "ax-bacc__histrow" }, [el("small", { class: "ax-muted", text: "近況" }), history]),
      el("div", { class: "ax-inst__panel ax-tbl__panel" }, [
        el("div", { class: "ax-tbl__chiprow" }, [el("small", { class: "ax-muted", text: "籌碼" }), area.chipRail]),
        el("div", { class: "ax-tbl__totalrow" }, [el("small", { class: "ax-muted", text: "本局總注" }), area.totalEl]),
        ctrls.node
      ])
    ]);

    renderStakes();
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "百家樂 Baccarat", provider: "Apex Studio", key: "baccarat" }) : node;
  }

  // 對外暴露真開牌（供主播跟注 7c 等複用同一套 RNG 真桌結果）
  HL.baccarat = { deal: dealHands, returnsOf: returnsOf };

  if (HL.games && HL.games.register) {
    HL.games.register({
      id: "baccarat", title: "百家樂 Baccarat", provider: "Apex Studio",
      type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true,
      author: "Apex", c1: "#0e7a5f", c2: "#0a3320", render: baccaratGame
    });
  }
})(window);

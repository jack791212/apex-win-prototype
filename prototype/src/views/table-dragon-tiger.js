/*
 * Apex Win｜龍虎鬥 Dragon Tiger（掛在 HL.table 共用桌遊引擎上）
 * 最輕量的亞洲賭桌：每局各發 1 張牌，龍 vs 虎比點數大小（A 最小 → K 最大，花色不參與主注比較）。
 * 8 副牌靴（416 張、抽兩張不重複），對標 live-casino 標準：龍/虎 1:1、平手退一半注（house edge 3.735%）；
 *   和 TIE 8:1（退 9×，edge 32.77%）；同花和 SUITED TIE 50:1（退 51×，edge 13.98%）。宣告 RTP 96.27%（龍/虎主注）。
 * 可驗證公平：每局取兩個 HL.fair.floatOr 浮點 → floor(f×416)/skip-technique 映射不重複兩張牌（可事後重算）。
 * 結算走 HL.table（扣注/派彩/餘額同步 + 掛 HL.liveStats.record 中央點）。
 * 以 HL.games.register 覆蓋 mock 的「Dragon Tiger」占位卡（id: dragon-tiger）為可玩。
 * 載入順序：data/games.js 之後（覆蓋 seed）、core/table.js 之後。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;

  var SUITS = ["♠", "♥", "♦", "♣"];                         // suitIdx 0..3；♥♦ 為紅
  var RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]; // rankIdx 0=A 最小 → 12=K 最大

  // 8 副牌靴 = 416 張（32×13）。idx 0..415：rank = idx%13（52%13==0 故整靴 rank 均勻）；suit = ⌊(idx%52)/13⌋。
  function cardOf(idx) {
    var rankIdx = idx % 13, suitIdx = Math.floor((idx % 52) / 13);
    return { rankIdx: rankIdx, suitIdx: suitIdx, rank: RANK_LABELS[rankIdx], suit: SUITS[suitIdx], red: suitIdx === 1 || suitIdx === 2 };
  }

  // 真開局：龍/虎各抽一張不重複牌（skip-technique 保證第二張均勻落在剩 415 張）
  function dealRound() {
    var f1 = HL.fair.floatOr("dragon-tiger"), f2 = HL.fair.floatOr("dragon-tiger");
    var d = Math.floor(f1 * 416); if (d > 415) d = 415;
    var t0 = Math.floor(f2 * 415); if (t0 > 414) t0 = 414;
    var t = t0 >= d ? t0 + 1 : t0;
    var D = cardOf(d), T = cardOf(t);
    var winner = D.rankIdx > T.rankIdx ? "dragon" : (T.rankIdx > D.rankIdx ? "tiger" : "tie");
    var suited = winner === "tie" && D.suitIdx === T.suitIdx;
    return { D: D, T: T, winner: winner, suited: suited };
  }
  // 各注區「總賠付倍數」（輸=0、和局龍/虎退半=0.5、和 8:1=9、同花和 50:1=51）
  function returnsOf(o) {
    return {
      dragon: o.winner === "dragon" ? 2 : (o.winner === "tie" ? 0.5 : 0),
      tiger:  o.winner === "tiger"  ? 2 : (o.winner === "tie" ? 0.5 : 0),
      tie:    o.winner === "tie" ? 9 : 0,
      suited: o.suited ? 51 : 0
    };
  }

  function infoModal() {
    HL.ui.modal("龍虎鬥 · 規則 / 賠率", [
      el("p", { class: "ax-muted", text: "龍、虎各發一張牌，比點數大小（A 最小 → K 最大，花色不影響龍/虎勝負），大者該邊贏。採 8 副牌靴。" }),
      el("ul", { class: "ax-dt__rules" }, [
        el("li", {}, [el("b", { text: "龍 DRAGON / 虎 TIGER " }), el("span", { text: "1:1（贏家退 2×）；和局時退回一半注" })]),
        el("li", {}, [el("b", { text: "和 TIE " }), el("span", { text: "8:1（退 9×）；龍虎點數相同即和" })]),
        el("li", {}, [el("b", { text: "同花和 SUITED TIE " }), el("span", { text: "50:1（退 51×）；和局且龍虎同花色" })])
      ]),
      el("p", { class: "ax-muted", text: "本桌採可驗證公平（HMAC-SHA256）發牌 · Demo：每局取兩個浮點 f，龍＝⌊f₁×416⌋、虎為剩餘 415 張均勻抽樣，可事後重算。點「近況」珠可開驗證面板。龍/虎主注 house edge 3.735%（RTP 96.27%）。" })
    ]);
  }

  function dragonTigerGame() {
    var spotEls = {};
    var dragonCard = el("div", { class: "ax-dt__cards" });
    var tigerCard = el("div", { class: "ax-dt__cards" });
    var dRank = el("div", { class: "ax-dt__rk", text: "–" });
    var tRank = el("div", { class: "ax-dt__rk", text: "–" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "下注後按「發牌」，龍 vs 虎比點數，大者贏 🐉🐯" });
    var history = HL.ui.histBar({ cls: "ax-dt__history", itemCls: "ax-dt__bead", max: 18, fair: true }); // 已接 HL.fair → 近況珠可點開驗證面板

    function hand(label, cardsEl, rankEl, cls) {
      return el("div", { class: "ax-dt__hand " + cls }, [
        el("div", { class: "ax-dt__handhead" }, [el("span", { class: "ax-dt__handlbl", text: label }), rankEl]),
        cardsEl
      ]);
    }

    function spot(id, label, odds, cls) {
      var badge = el("div", { class: "ax-dt__stake" });
      var box = el("button", { class: "ax-dt__spot " + cls, onClick: function () { area.place(id); } }, [
        el("div", { class: "ax-dt__spotlbl", text: label }),
        el("small", { class: "ax-dt__odds", text: odds }),
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

    var area = HL.table.betArea({ game: "dragon-tiger", onChange: renderStakes });

    function renderCard(container, c) {
      HL.dom.clear(container);
      container.appendChild(el("div", { class: "ax-card ax-card--in" + (c.red ? " is-red" : "") }, [
        el("span", { class: "ax-card__r", text: c.rank }),
        el("span", { class: "ax-card__s", text: c.suit })
      ]));
    }
    function clearTable() {
      HL.dom.clear(dragonCard); HL.dom.clear(tigerCard);
      dRank.textContent = "–"; tRank.textContent = "–";
      dRank.className = "ax-dt__rk"; tRank.className = "ax-dt__rk";
      for (var id in spotEls) spotEls[id].box.classList.remove("is-win");
    }
    function pushHistory(o) {
      var k = o.winner === "dragon" ? "龍" : (o.winner === "tiger" ? "虎" : "和");
      history.push(k, "is-" + o.winner);
    }

    function onDeal() {
      var snap = area.commit(); if (!snap) return;
      area.lock(true); ctrls.dealBtn.disabled = true;
      clearTable();
      statusEl.textContent = "發牌中…"; statusEl.className = "ax-inst__last ax-muted";

      var o = dealRound();          // 立即算出整局結果
      var ret = returnsOf(o);
      renderCard(dragonCard, o.D);  // CSS 進場動畫（視覺盡力）
      renderCard(tigerCard, o.T);

      // 單一 setTimeout 閘門保證結算（背景分頁/無 rAF 也成立）
      setTimeout(function () {
        dRank.textContent = o.D.rank; tRank.textContent = o.T.rank;
        dRank.className = "ax-dt__rk" + (o.winner === "dragon" ? " is-win" : "");
        tRank.className = "ax-dt__rk" + (o.winner === "tiger" ? " is-win" : "");
        var winSpots = { dragon: o.winner === "dragon", tiger: o.winner === "tiger", tie: o.winner === "tie", suited: o.suited };
        for (var id in spotEls) if (winSpots[id]) spotEls[id].box.classList.add("is-win");

        var r = area.settle(snap, ret);
        var who = o.winner === "dragon" ? "龍贏" : (o.winner === "tiger" ? "虎贏" : (o.suited ? "同花和局" : "和局"));
        statusEl.textContent = "龍 " + o.D.rank + " : " + o.T.rank + " 虎 — " + who + "　"
          + (r.net >= 0 ? "贏 +" + money(r.net) : "輸 " + money(-r.net));
        statusEl.className = "ax-inst__last " + (r.net >= 0 ? "ax-green" : "ax-red");
        pushHistory(o);
        area.lock(false); area.clear(); ctrls.dealBtn.disabled = false; // 清空本局籌碼，下一局重新下注（重押用「重押」鈕）
      }, 620);
    }

    var ctrls = area.controls(onDeal, "發牌");

    var node = el("div", { class: "ax-inst ax-dt ax-fade-in" }, [
      el("div", { class: "ax-dt__titlerow" }, [
        el("h2", { class: "ax-inst__title", text: "🐉 龍虎鬥 Dragon Tiger" }),
        el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal })
      ]),
      el("div", { class: "ax-dt__felt" }, [
        el("div", { class: "ax-dt__hands" }, [
          hand("龍 DRAGON", dragonCard, dRank, "is-dragon"),
          el("div", { class: "ax-dt__vs", text: "VS" }),
          hand("虎 TIGER", tigerCard, tRank, "is-tiger")
        ]),
        statusEl
      ]),
      el("div", { class: "ax-dt__bets" }, [
        el("div", { class: "ax-dt__main" }, [
          spot("dragon", "龍 DRAGON", "1:1", "ax-dt__spot--dragon"),
          spot("tiger", "虎 TIGER", "1:1", "ax-dt__spot--tiger")
        ]),
        el("div", { class: "ax-dt__ties" }, [
          spot("tie", "和 TIE", "8:1", "ax-dt__spot--tie"),
          spot("suited", "同花和 SUITED", "50:1", "ax-dt__spot--suited")
        ])
      ]),
      el("div", { class: "ax-dt__histrow" }, [el("small", { class: "ax-muted", text: "近況" }), history.node]),
      HL.table.panel(area, ctrls)
    ]);

    renderStakes();
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "龍虎鬥 Dragon Tiger", provider: "Apex Studio", key: "dragon-tiger" }) : node;
  }

  // 對外暴露真開局（供主播跟注等複用同一套 RNG 真桌結果 / 供驗證器對照）
  HL.dragonTiger = { deal: dealRound, returnsOf: returnsOf, cardOf: cardOf };

  if (HL.games && HL.games.register) {
    HL.games.register({
      id: "dragon-tiger", title: "龍虎鬥 Dragon Tiger", provider: "Apex Studio",
      type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true,
      author: "Apex", c1: "#c9962b", c2: "#7a1414", render: dragonTigerGame
    });
  }
})(window);

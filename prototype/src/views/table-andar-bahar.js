/*
 * Apex Win｜安達巴哈 Andar Bahar（掛在 HL.table 共用桌遊引擎上）
 * 印度／南亞國民賭桌牌戲，對 ApexWin 是全新「發牌循環 + 懸念累積」互動維度：
 *   翻開一張「莊牌 Joker」定出目標點數 → 交替往 Andar（先發側）/ Bahar 兩堆發牌，
 *   先出現與莊牌同點數（rank）者，該側贏。每局發牌張數不固定（懸念隨發牌累積）——
 *   不同於百家樂／龍虎鬥固定張數，是 ApexWin 桌遊的新節奏。
 *
 * 對標 live-casino canonical 賠付／edge（來源 Wizard of Odds 交叉查證，Andar 先發約定）：
 *   Andar（先發側，勝率略高 51.50%）0.9:1（贏退 1.9×）—— house edge 2.15%、RTP 97.85%（頭條主注）
 *   Bahar（後發側，勝率 48.50%）    1:1（贏退 2.0×）  —— house edge 3.00%、RTP 97.00%
 *   先發側勝率略高（多一個奇數發牌位）故賠率略低 0.9:1，是本遊戲的 canonical 賠率不對稱。
 * 可驗證公平：一局取多個 HL.fair.floatOr 浮點 → 先抽莊牌，再逐張均勻抽剩餘牌交替發牌（可事後重算）。
 * 結算走 HL.table（扣注／派彩／餘額同步 + 掛 HL.liveStats.record 中央點通吃 VIP/任務/返水/JP/帳本）。
 * 以 HL.games.register 新增可玩「安達巴哈 Andar Bahar」卡（id: andar-bahar，TABLE 品類第三補位）。
 * 載入順序：data/games.js 之後、core/table.js 之後。
 * 純數學區以 module.exports 暴露供 node 驗證器 → 驗的即玩家玩的同一份。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = !isNode ? (global.HL = global.HL || {}) : null;

  // ── 純數學區（node 驗證器與瀏覽器共用同一份）────────────────────────────
  var SUITS = ["♠", "♥", "♦", "♣"];                 // suitIdx 0..3；♥♦ 為紅
  var RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]; // rankIdx 0..12

  // 單副 52 張。idx 0..51：rankIdx = idx%13、suitIdx = ⌊idx/13⌋。
  function cardOf(idx) {
    var rankIdx = idx % 13, suitIdx = Math.floor(idx / 13);
    return { idx: idx, rankIdx: rankIdx, suitIdx: suitIdx, rank: RANK_LABELS[rankIdx], suit: SUITS[suitIdx], red: suitIdx === 1 || suitIdx === 2 };
  }

  // 開局：next() 提供 [0,1) 均勻浮點。先抽莊牌，再從剩 51 張交替發牌至配對。
  //   Andar 為先發側（發第 1、3、5… 張）；先出現同 rank 者該側贏。
  function resolveRound(next) {
    var j = Math.floor(next() * 52); if (j > 51) j = 51; if (j < 0) j = 0;
    var joker = cardOf(j);
    var remaining = [];
    for (var i = 0; i < 52; i++) if (i !== j) remaining.push(i);   // 剩 51 張
    var seq = [], side = "andar", winner = null, andar = 0, bahar = 0, guard = 0;
    while (remaining.length) {
      if (++guard > 60) break;                                     // 保險絲（配對必於第 49 張前出現）
      var pos = Math.floor(next() * remaining.length);
      if (pos >= remaining.length) pos = remaining.length - 1; if (pos < 0) pos = 0;
      var idx = remaining.splice(pos, 1)[0];                       // 均勻抽一張（等價 Fisher–Yates 逐步）
      var c = cardOf(idx);
      seq.push({ card: c, side: side });
      if (side === "andar") andar++; else bahar++;
      if (c.rankIdx === joker.rankIdx) { winner = side; break; }   // 配對＝該側贏
      side = side === "andar" ? "bahar" : "andar";                 // 交替
    }
    return { joker: joker, seq: seq, winner: winner, andarCount: andar, baharCount: bahar };
  }

  // 各注區「總賠付倍數」（輸=0）。payout = 注 × returns[id]
  //   Andar 0.9:1 → 贏退 1.9×；Bahar 1:1 → 贏退 2.0×。
  function returnsOf(o) {
    return {
      andar: o.winner === "andar" ? 1.9 : 0,
      bahar: o.winner === "bahar" ? 2.0 : 0
    };
  }

  var CORE = { cardOf: cardOf, resolveRound: resolveRound, returnsOf: returnsOf, RANK_LABELS: RANK_LABELS, SUITS: SUITS };
  if (isNode) { module.exports = CORE; return; }
  HL.andarBahar = CORE; // 對外暴露純解析（供主播跟注/驗證器對照）

  // ── 瀏覽器 UI 區 ──────────────────────────────────────────────────────
  var el = HL.dom.el, money = HL.dom.money;

  // 真開局：以 HL.fair 供給浮點（可驗證公平、可事後重算）
  function dealRound() {
    return resolveRound(function () { return HL.fair.floatOr("andar-bahar"); });
  }
  CORE.deal = dealRound; HL.andarBahar.deal = dealRound;

  function infoModal() {
    HL.ui.modal("安達巴哈 Andar Bahar · 規則 / 賠率", [
      el("p", { class: "ax-muted", text: "翻開一張「莊牌」定出目標點數，接著交替往 Andar（先發側）/ Bahar 兩堆發牌，先出現與莊牌同點數者該側贏。花色不影響勝負。" }),
      HL.ui.payoutRules([
        { term: "Andar （安達・先發）", desc: "0.9:1（贏退 1.9×）；勝率略高 51.50%。house edge 2.15%（頭條主注）" },
        { term: "Bahar （巴哈・後發）", desc: "1:1（贏退 2.0×）；勝率 48.50%。house edge 3.00%" }
      ], { cls: "ax-ab__rules" }),
      el("p", { class: "ax-muted", text: "先發側 Andar 多一個發牌位、勝率略高，故 canonical 賠率略低為 0.9:1（非不公平，而是進場優勢的對價）。" }),
      el("p", { class: "ax-muted", text: "本桌採可驗證公平（HMAC-SHA256）發牌 · Demo：一局取多個浮點 f，先抽莊牌（⌊f×52⌋），再逐張均勻抽剩牌交替發，可事後重算。點「近況」珠可開驗證面板。" })
    ]);
  }

  function andarBaharGame() {
    var spotEls = {};
    var jokerBox = el("div", { class: "ax-ab__joker" });
    var andarCards = el("div", { class: "ax-ab__cards" });
    var baharCards = el("div", { class: "ax-ab__cards" });
    var andarCount = el("span", { class: "ax-ab__cnt", text: "0" });
    var baharCount = el("span", { class: "ax-ab__cnt", text: "0" });
    var andarHand, baharHand;
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "下注後按「發牌」，翻開莊牌後交替發牌至配對 🂡" });
    var history = HL.ui.histBar({ cls: "ax-ab__history", itemCls: "ax-ab__bead", max: 18, fair: true });

    function spot(id, label, sub, odds, cls) {
      var badge = el("div", { class: "ax-ab__stake" });
      var box = el("button", { class: "ax-ab__spot " + cls, onClick: function () { area.place(id); } }, [
        el("div", { class: "ax-ab__spotlbl", text: label }),
        el("small", { class: "ax-ab__spotsub", text: sub }),
        el("small", { class: "ax-ab__odds", text: odds }),
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

    var area = HL.table.betArea({ game: "andar-bahar", onChange: renderStakes });

    function cardNode(c) {
      return el("div", { class: "ax-card ax-card--in" + (c.red ? " is-red" : "") }, [
        el("span", { class: "ax-card__r", text: c.rank }),
        el("span", { class: "ax-card__s", text: c.suit })
      ]);
    }
    function renderJoker(c) {
      HL.dom.clear(jokerBox);
      jokerBox.appendChild(cardNode(c));
    }
    function clearTable() {
      HL.dom.clear(jokerBox); HL.dom.clear(andarCards); HL.dom.clear(baharCards);
      andarCount.textContent = "0"; baharCount.textContent = "0";
      andarHand.classList.remove("is-win"); baharHand.classList.remove("is-win");
      for (var id in spotEls) spotEls[id].box.classList.remove("is-win");
    }
    function pushHistory(o) {
      if (o.winner === "andar") history.push("A", "is-andar");
      else history.push("B", "is-bahar");
    }

    function onDeal() {
      var snap = area.commit(); if (!snap) return;
      area.lock(true); ctrls.dealBtn.disabled = true;
      clearTable();
      statusEl.textContent = "發牌中…"; statusEl.className = "ax-inst__last ax-muted";

      var o = dealRound();          // 立即算出整局結果（RNG 回合開始就 commit）
      var ret = returnsOf(o);
      var stagger = Math.max(55, Math.min(150, Math.round(1600 / Math.max(1, o.seq.length))));
      var startAt = 460;

      setTimeout(function () { renderJoker(o.joker); statusEl.textContent = "目標點數：" + o.joker.rank + "，發牌中…"; }, 120);

      var a = 0, b = 0;
      o.seq.forEach(function (step, i) {
        setTimeout(function () {
          if (step.side === "andar") { andarCards.appendChild(cardNode(step.card)); andarCount.textContent = String(++a); }
          else { baharCards.appendChild(cardNode(step.card)); baharCount.textContent = String(++b); }
          if (i === o.seq.length - 1) (o.winner === "andar" ? andarHand : baharHand).classList.add("is-win");
        }, startAt + i * stagger);
      });

      // 單一 setTimeout 閘門保證結算（背景分頁/無 rAF 也成立）
      setTimeout(function () {
        var winSpots = { andar: o.winner === "andar", bahar: o.winner === "bahar" };
        for (var id in spotEls) if (winSpots[id]) spotEls[id].box.classList.add("is-win");
        var r = area.settle(snap, ret);
        var who = o.winner === "andar" ? "Andar 贏" : "Bahar 贏";
        statusEl.textContent = "目標 " + o.joker.rank + " — " + who + "（共 " + o.seq.length + " 張）　"
          + (r.net >= 0 ? "贏 +" + money(r.net) : "輸 " + money(-r.net));
        statusEl.className = "ax-inst__last " + (r.net >= 0 ? "ax-green" : "ax-red");
        pushHistory(o);
        area.lock(false); area.clear(); ctrls.dealBtn.disabled = false;
      }, startAt + o.seq.length * stagger + 340);
    }

    var ctrls = area.controls(onDeal, "發牌");

    andarHand = el("div", { class: "ax-ab__hand is-andar" }, [
      el("div", { class: "ax-ab__handhead" }, [el("span", { class: "ax-ab__handlbl", text: "Andar 安達" }), andarCount]),
      andarCards
    ]);
    baharHand = el("div", { class: "ax-ab__hand is-bahar" }, [
      el("div", { class: "ax-ab__handhead" }, [el("span", { class: "ax-ab__handlbl", text: "Bahar 巴哈" }), baharCount]),
      baharCards
    ]);

    var node = el("div", { class: "ax-inst ax-ab ax-fade-in" }, [
      el("div", { class: "ax-ab__titlerow" }, [
        el("h2", { class: "ax-inst__title", text: "🂡 安達巴哈 Andar Bahar" }),
        el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal })
      ]),
      el("div", { class: "ax-ab__felt" }, [
        el("div", { class: "ax-ab__jokerrow" }, [
          el("span", { class: "ax-ab__jokerlbl", text: "🎯 莊牌" }),
          jokerBox
        ]),
        andarHand,
        baharHand,
        statusEl
      ]),
      el("div", { class: "ax-ab__bets" }, [
        spot("andar", "Andar", "安達・先發", "0.9:1", "ax-ab__spot--andar"),
        spot("bahar", "Bahar", "巴哈・後發", "1:1", "ax-ab__spot--bahar")
      ]),
      el("div", { class: "ax-ab__histrow" }, [el("small", { class: "ax-muted", text: "近況" }), history.node]),
      HL.table.panel(area, ctrls)
    ]);

    renderStakes();
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "安達巴哈 Andar Bahar", provider: "Apex Studio", key: "andar-bahar" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({
      id: "andar-bahar", title: "安達巴哈 Andar Bahar", provider: "Apex Studio",
      type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true,
      author: "Apex", c1: "#d98a2b", c2: "#7a3a10", render: andarBaharGame
    });
  }
})(typeof window !== "undefined" ? window : this);

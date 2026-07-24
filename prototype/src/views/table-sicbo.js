/*
 * Apex Win｜骰寶 Sic Bo（掛在 HL.table 共用桌遊引擎上）
 * 三顆骰的多下注區亞洲賭桌：搖三骰求和，玩家在豐富的注區（近輪盤複雜度）押注。
 * 對 ApexWin 是全新「骰類 bet-area」維度（現有 TABLE 僅百家樂/輪盤/龍虎鬥皆發牌）；三骰純數學 → HL.fair 天然契合、可驗證公平最純。
 *
 * 對標 live-casino canonical 賠付/edge（來源 Wizard of Odds 標準 Macau 賠付表交叉查證）：
 *   大 Big(11-17,非圍) / 小 Small(4-10,非圍) 1:1 —— 逢任何圍骰(triple)皆輸；house edge 2.78%、RTP 97.22%（頭條主注）
 *   全圍 Any Triple 30:1（edge 13.89%）
 *   指定圍骰 Specific Triple ×6 180:1（edge 16.20%）
 *   單骰 Single ×6：出現 1/2/3 次 → 1:1 / 2:1 / 3:1（edge 7.87%）
 *   指定對子 Double ×6：該點 ≥2 顆 10:1（edge 18.52%）
 *   總點 Sum 4-17：canonical 逐點賠付（4/17=60:1、5/16=30:1、6/15=17:1、7/14=12:1、8/13=8:1、9/12/10/11=6:1）
 * 可驗證公平：每局取三個 HL.fair.floatOr 浮點 → ⌊f×6⌋+1（可事後重算）。
 * 結算走 HL.table（扣注/派彩/餘額同步 + 掛 HL.liveStats.record 中央點通吃 VIP/任務/返水/JP/帳本）。
 * 以 HL.games.register 覆蓋 mock 的「Sic Bo」占位卡（id: sic-bo）為可玩。
 * 載入順序：data/games.js 之後（覆蓋 seed）、core/table.js 之後。
 * 純數學區以 module.exports 暴露供 node 驗證器 → 驗的即玩家玩的同一份。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = !isNode ? (global.HL = global.HL || {}) : null;

  // ── 純數學區（node 驗證器與瀏覽器共用同一份）────────────────────────────
  var DIE_GLYPH = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]; // index 1..6

  // 總點 X:1 賠付表（canonical Macau 標準）。return = payout + 1（含本金）
  var SUM_PAY = { 4: 60, 5: 30, 6: 17, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 17, 16: 30, 17: 60 };

  function die(f) { var v = Math.floor(f * 6) + 1; return v > 6 ? 6 : (v < 1 ? 1 : v); }

  function summarize(d) {
    var sum = d[0] + d[1] + d[2];
    var counts = [0, 0, 0, 0, 0, 0, 0]; // index 1..6
    for (var i = 0; i < 3; i++) counts[d[i]]++;
    var triple = d[0] === d[1] && d[1] === d[2];
    return { dice: d, sum: sum, counts: counts, triple: triple, tripleFace: triple ? d[0] : 0 };
  }

  // 各注區「總賠付倍數」（輸=0）。與 HL.table.settle 的 returns 對接：payout = 注 × returns[id]
  function returnsOf(o) {
    var R = {}, n, sum = o.sum, c = o.counts, tri = o.triple;
    R.small = (!tri && sum >= 4 && sum <= 10) ? 2 : 0;            // 1:1，逢圍骰輸
    R.big   = (!tri && sum >= 11 && sum <= 17) ? 2 : 0;           // 1:1，逢圍骰輸
    R.anytriple = tri ? 31 : 0;                                   // 30:1
    for (n = 1; n <= 6; n++) {
      R["triple" + n] = (tri && o.tripleFace === n) ? 181 : 0;    // 指定圍骰 180:1
      R["double" + n] = (c[n] >= 2) ? 11 : 0;                     // 指定對子 10:1
      R["single" + n] = c[n] >= 1 ? (1 + c[n]) : 0;              // 單骰 1/2/3 次 → 1:1/2:1/3:1
    }
    for (n = 4; n <= 17; n++) R["sum" + n] = (sum === n) ? (SUM_PAY[n] + 1) : 0; // 總點逐點
    return R;
  }

  var CORE = { die: die, summarize: summarize, returnsOf: returnsOf, SUM_PAY: SUM_PAY, DIE_GLYPH: DIE_GLYPH };
  if (isNode) { module.exports = CORE; return; }
  HL.sicBo = CORE; // 對外暴露純解析（供主播跟注/驗證器對照）

  // ── 瀏覽器 UI 區 ──────────────────────────────────────────────────────
  var el = HL.dom.el, money = HL.dom.money;

  // 真開局：三顆骰各取一浮點 → ⌊f×6⌋+1
  function rollRound() {
    var d = [die(HL.fair.floatOr("sic-bo")), die(HL.fair.floatOr("sic-bo")), die(HL.fair.floatOr("sic-bo"))];
    return summarize(d);
  }
  CORE.roll = rollRound; HL.sicBo.roll = rollRound;

  function infoModal() {
    HL.ui.modal("骰寶 Sic Bo · 規則 / 賠率", [
      el("p", { class: "ax-muted", text: "搖三顆骰子求和，於各注區下注。下列賠付與莊家優勢對標真實娛樂城標準（大/小為頭條主注 RTP 97.22%）。" }),
      el("ul", { class: "ax-sb__rules" }, [
        el("li", {}, [el("b", { text: "大 BIG / 小 SMALL " }), el("span", { text: "1:1；小=總點 4–10、大=11–17，逢任何圍骰(三同)皆輸。edge 2.78%" })]),
        el("li", {}, [el("b", { text: "全圍 ANY TRIPLE " }), el("span", { text: "30:1；任意三顆同點。edge 13.89%" })]),
        el("li", {}, [el("b", { text: "指定圍骰 TRIPLE " }), el("span", { text: "180:1；指定某點三顆全同。edge 16.20%" })]),
        el("li", {}, [el("b", { text: "單骰 SINGLE " }), el("span", { text: "指定點出現 1/2/3 顆 → 賠 1/2/3 倍。edge 7.87%" })]),
        el("li", {}, [el("b", { text: "對子 DOUBLE " }), el("span", { text: "10:1；指定某點至少兩顆。edge 18.52%" })]),
        el("li", {}, [el("b", { text: "總點 TOTAL " }), el("span", { text: "4/17→60:1、5/16→30:1、6/15→17:1、7/14→12:1、8/13→8:1、9-12→6:1" })])
      ]),
      el("p", { class: "ax-muted", text: "本桌採可驗證公平（HMAC-SHA256）搖骰 · Demo：每局取三個浮點 f，每骰＝⌊f×6⌋+1，可事後重算。點「近況」珠可開驗證面板。" })
    ]);
  }

  function sicBoGame() {
    var spotEls = {};
    var diceRow = el("div", { class: "ax-sb__dice" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "下注後按「搖骰」，三骰求和決定各注區輸贏 🎲" });
    var history = HL.ui.histBar({ cls: "ax-sb__history", itemCls: "ax-sb__bead", max: 18, fair: true });

    function spot(id, label, odds, cls, glyph) {
      var badge = el("div", { class: "ax-sb__stake" });
      var kids = [];
      if (glyph) kids.push(el("div", { class: "ax-sb__glyph", text: glyph }));
      kids.push(el("div", { class: "ax-sb__spotlbl", text: label }));
      if (odds) kids.push(el("small", { class: "ax-sb__odds", text: odds }));
      kids.push(badge);
      var box = el("button", { class: "ax-sb__spot " + (cls || ""), onClick: function () { area.place(id); } }, kids);
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

    var area = HL.table.betArea({ game: "sic-bo", onChange: renderStakes });

    function section(title, gridCls, spots) {
      return el("div", { class: "ax-sb__section" }, [
        el("div", { class: "ax-sb__sechd", text: title }),
        el("div", { class: "ax-sb__grid " + gridCls }, spots)
      ]);
    }

    // 注區組裝
    var bigSmall = section("大 / 小", "ax-sb__grid--2", [
      spot("small", "小 SMALL", "1:1 · 4–10", "ax-sb__spot--sm"),
      spot("big", "大 BIG", "1:1 · 11–17", "ax-sb__spot--big")
    ]);
    var triples = section("圍骰", "ax-sb__grid--triples", [
      spot("anytriple", "全圍 ANY", "30:1", "ax-sb__spot--any")
    ].concat([1, 2, 3, 4, 5, 6].map(function (n) {
      return spot("triple" + n, "", "180:1", "ax-sb__spot--tri", DIE_GLYPH[n] + DIE_GLYPH[n] + DIE_GLYPH[n]);
    })));
    var singles = section("單骰（出現次數 → 1/2/3 倍）", "ax-sb__grid--6", [1, 2, 3, 4, 5, 6].map(function (n) {
      return spot("single" + n, "", "1:1", "ax-sb__spot--single", DIE_GLYPH[n]);
    }));
    var doubles = section("對子", "ax-sb__grid--6", [1, 2, 3, 4, 5, 6].map(function (n) {
      return spot("double" + n, "", "10:1", "ax-sb__spot--dbl", DIE_GLYPH[n] + DIE_GLYPH[n]);
    }));
    var sums = section("總點 TOTAL", "ax-sb__grid--sums", [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(function (n) {
      return spot("sum" + n, String(n), SUM_PAY[n] + ":1", "ax-sb__spot--sum");
    }));

    function renderDice(o, revealed) {
      HL.dom.clear(diceRow);
      for (var i = 0; i < 3; i++) {
        var g = revealed ? DIE_GLYPH[o.dice[i]] : "🎲";
        diceRow.appendChild(el("div", { class: "ax-sb__die" + (revealed ? " is-in" : " is-roll") }, [
          el("span", { class: "ax-sb__diepip", text: g })
        ]));
      }
    }
    function clearTable() {
      for (var id in spotEls) spotEls[id].box.classList.remove("is-win");
    }
    function pushHistory(o) {
      if (o.triple) history.push("圍", "is-triple");
      else if (o.sum >= 11) history.push("大", "is-big");
      else history.push("小", "is-small");
    }

    function onRoll() {
      var snap = area.commit(); if (!snap) return;
      area.lock(true); ctrls.dealBtn.disabled = true;
      clearTable();
      statusEl.textContent = "搖骰中…"; statusEl.className = "ax-inst__last ax-muted";

      var o = rollRound();          // 立即算出整局結果（RNG 回合開始就 commit）
      var ret = returnsOf(o);
      renderDice(o, false);          // 先顯示搖動骰盅

      setTimeout(function () {       // 單一 setTimeout 閘門保證結算（背景分頁/無 rAF 也成立）
        renderDice(o, true);
        var winSpots = {};
        for (var id in ret) if (ret[id] > 0) winSpots[id] = true;
        for (var sid in spotEls) if (winSpots[sid]) spotEls[sid].box.classList.add("is-win");

        var r = area.settle(snap, ret);
        var kind = o.triple ? ("圍骰 " + o.dice[0]) : (o.sum >= 11 ? "大" : "小");
        statusEl.textContent = "🎲 " + o.dice.join(" · ") + " ＝ " + o.sum + "（" + kind + "）　"
          + (r.net >= 0 ? "贏 +" + money(r.net) : "輸 " + money(-r.net));
        statusEl.className = "ax-inst__last " + (r.net >= 0 ? "ax-green" : "ax-red");
        pushHistory(o);
        area.lock(false); area.clear(); ctrls.dealBtn.disabled = false;
      }, 680);
    }

    var ctrls = area.controls(onRoll, "搖骰");

    var node = el("div", { class: "ax-inst ax-sb ax-fade-in" }, [
      el("div", { class: "ax-sb__titlerow" }, [
        el("h2", { class: "ax-inst__title", text: "🎲 骰寶 Sic Bo" }),
        el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal })
      ]),
      el("div", { class: "ax-sb__felt" }, [diceRow, statusEl]),
      el("div", { class: "ax-sb__bets" }, [bigSmall, triples, singles, doubles, sums]),
      el("div", { class: "ax-sb__histrow" }, [el("small", { class: "ax-muted", text: "近況" }), history.node]),
      HL.table.panel(area, ctrls)
    ]);

    renderDice({ dice: [0, 0, 0] }, false);
    renderStakes();
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "骰寶 Sic Bo", provider: "Apex Studio", key: "sic-bo" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({
      id: "sic-bo", title: "骰寶 Sic Bo", provider: "Apex Studio",
      type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true,
      author: "Apex", c1: "#16a3a3", c2: "#0a3f3f", render: sicBoGame
    });
  }
})(typeof window !== "undefined" ? window : this);

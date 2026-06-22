/*
 * Apex Win｜即時遊戲：Dice + Limbo（掛在 HL.instant 共用引擎上）
 * 兩款皆 1% 莊家優勢、單步結果（最易接 provably fair）。
 * 以 HL.games.register 覆蓋 mock 的 comingSoon 占位卡（id: dice / limbo）為可玩。
 * 載入順序：data/games.js 之後（覆蓋 seed）、core/instant.js 之後。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var EDGE = 0.99; // 1% house edge

  /* ---------------- Dice：滾出小於目標 ---------------- */
  function diceGame() {
    var target = 50; // 2..98
    var rollEl = el("div", { class: "ax-dice__roll", text: "00.00" });
    var targetEl = el("b", {});
    var chanceEl = el("b", {});
    var multEl = el("b", {});
    function mult() { return EDGE * 100 / target; }
    function sync() {
      targetEl.textContent = "< " + target;
      chanceEl.textContent = target.toFixed(0) + "%";
      multEl.textContent = mult().toFixed(2) + "×";
    }
    var slider = el("input", { type: "range", min: "2", max: "98", value: "50", class: "ax-dice__slider" });
    slider.addEventListener("input", function () { target = HL.instant.clampInt(slider.value, 2, 98); sync(); });

    function playRound(bet) {
      var roll = Math.random() * 100;
      var win = roll < target;
      rollEl.textContent = roll.toFixed(2);
      rollEl.className = "ax-dice__roll " + (win ? "is-win" : "is-lose");
      return { win: win, multiplier: mult(), label: "擲出 " + roll.toFixed(2) };
    }

    var panel = HL.instant.betPanel({ initial: 50, playText: "擲骰 🎲", playRound: playRound });
    var stage = el("div", { class: "ax-inst__stage ax-dice" }, [
      rollEl,
      el("div", { class: "ax-dice__ctrl" }, [
        el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "滾出目標" }), targetEl]),
        slider,
        el("div", { class: "ax-dice__odds" }, [
          el("span", {}, ["中獎率 ", chanceEl]),
          el("span", {}, ["賠率 ", multEl])
        ])
      ])
    ]);
    sync();
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🎲 Dice" }), stage, panel.node,
      el("span", { class: "ax-demo-tag", text: "1% 莊家優勢 · Demo · 滾出小於目標即贏" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Dice", provider: "Apex Studio", key: "dice" }) : node;
  }

  /* ---------------- Limbo：崩盤倍數 ≥ 目標即贏 ---------------- */
  function limboGame() {
    var bigEl = el("div", { class: "ax-limbo__mult", text: "1.00×" });
    var chanceEl = el("b", {});
    var tIn = el("input", { type: "number", min: "1.01", max: "1000", step: "0.01", value: "2.00", class: "ax-limbo__target" });
    function target() { var t = +tIn.value || 1.01; return Math.max(1.01, Math.min(1000, t)); }
    function sync() { chanceEl.textContent = (EDGE * 100 / target()).toFixed(2) + "%"; }
    tIn.addEventListener("input", sync);

    function playRound(bet) {
      var t = target();
      var r = Math.random();
      var crash = Math.max(1, EDGE / (1 - r)); // P(crash>=t) = EDGE/t → 1% 優勢
      var win = crash >= t;
      bigEl.textContent = crash.toFixed(2) + "×";
      bigEl.className = "ax-limbo__mult " + (win ? "is-win" : "is-lose");
      return { win: win, multiplier: win ? t : 0, label: "崩盤 " + crash.toFixed(2) + "× / 目標 " + t.toFixed(2) + "×" };
    }

    var panel = HL.instant.betPanel({ initial: 50, playText: "開始 🚀", playRound: playRound });
    var stage = el("div", { class: "ax-inst__stage ax-limbo" }, [
      bigEl,
      el("div", { class: "ax-inst__row" }, [
        el("small", { class: "ax-muted", text: "目標倍數" }), tIn,
        el("span", { class: "ax-limbo__chance" }, ["中獎率 ", chanceEl])
      ])
    ]);
    sync();
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🚀 Limbo" }), stage, panel.node,
      el("span", { class: "ax-demo-tag", text: "1% 莊家優勢 · Demo · 崩盤倍數 ≥ 你的目標即贏" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Limbo", provider: "Apex Studio", key: "limbo" }) : node;
  }

  /* ---------------- Plinko：落球進倍數槽（8 排，9 槽，皆 ~1% 莊家優勢） ---------------- */
  function plinkoGame() {
    var ROWS = 8, risk = "medium";
    var MULT = {
      low: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
      medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
    };
    var pegs = el("div", { class: "ax-plinko__pegs" });
    for (var r = 0; r < ROWS; r++) {
      var row = el("div", { class: "ax-plinko__pegrow" });
      for (var p = 0; p < r + 3; p++) row.appendChild(el("span", { class: "ax-plinko__peg" }));
      pegs.appendChild(row);
    }
    var ball = el("div", { class: "ax-plinko__ball" });
    var board = el("div", { class: "ax-plinko__board" }, [pegs, ball]);
    var bucketsEl = el("div", { class: "ax-plinko__buckets" });
    function bucketCls(m) { return m >= 5 ? "is-hot" : m >= 1 ? "is-mid" : "is-cool"; }
    function renderBuckets() {
      HL.dom.clear(bucketsEl);
      MULT[risk].forEach(function (m) { bucketsEl.appendChild(el("div", { class: "ax-plinko__bucket " + bucketCls(m), text: m + "×" })); });
    }
    var riskSel = el("div", { class: "ax-inst__amt" });
    [["low", "低"], ["medium", "中"], ["high", "高"]].forEach(function (rk) {
      riskSel.appendChild(el("button", { class: "ax-inst__chip" + (rk[0] === risk ? " is-active" : ""), text: rk[1] + "風險", onClick: function () {
        risk = rk[0]; Array.prototype.forEach.call(riskSel.children, function (c) { c.classList.remove("is-active"); }); this.classList.add("is-active"); renderBuckets();
      } }));
    });
    function drop(idx) {
      var pct = (idx + 0.5) / (ROWS + 1) * 100;
      ball.style.transition = "none"; ball.style.opacity = "1"; ball.style.top = "0%"; ball.style.left = "50%";
      setTimeout(function () { ball.style.transition = "top .5s ease-in, left .5s ease-in"; ball.style.top = "100%"; ball.style.left = pct + "%"; }, 20);
      setTimeout(function () { var b = bucketsEl.children[idx]; if (b) { b.classList.add("is-hit"); setTimeout(function () { b.classList.remove("is-hit"); }, 480); } }, 520);
    }
    function playRound() {
      var rights = 0; for (var i = 0; i < ROWS; i++) if (Math.random() < 0.5) rights++;
      var m = MULT[risk][rights];
      drop(rights);
      return { multiplier: m, label: m + "× 槽" };
    }
    renderBuckets();
    var panel = HL.instant.betPanel({ initial: 50, playText: "投球 ⚪", playRound: playRound });
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🔻 Plinko" }),
      el("div", { class: "ax-inst__stage ax-plinko" }, [board, bucketsEl]),
      panel.node,
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "風險" }), riskSel]),
      el("span", { class: "ax-demo-tag", text: "~1% 莊家優勢 · Demo · 落點決定倍數，邊槽高賠率高風險" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Plinko", provider: "Apex Studio", key: "plinko" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "dice", title: "Dice", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1e3a6e", c2: "#0a162a", render: diceGame });
    HL.games.register({ id: "limbo", title: "Limbo", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e1e4a", c2: "#2a0a1e", render: limboGame });
    HL.games.register({ id: "plinko", title: "Plinko", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e5a1e", c2: "#2a2410", render: plinkoGame });
  }
})(window);

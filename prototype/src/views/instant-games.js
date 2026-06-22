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

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "dice", title: "Dice", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1e3a6e", c2: "#0a162a", render: diceGame });
    HL.games.register({ id: "limbo", title: "Limbo", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e1e4a", c2: "#2a0a1e", render: limboGame });
  }
})(window);

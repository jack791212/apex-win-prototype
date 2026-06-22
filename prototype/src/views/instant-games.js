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
  var money = HL.dom.money;
  var EDGE = 0.99; // 1% house edge

  /* ---------------- Dice：滾出小於目標 ---------------- */
  function diceGame() {
    var target = 50, dir = "under"; // under: roll<target 贏；over: roll>target 贏
    function winChance() { return dir === "under" ? target : 100 - target; }
    function mult() { return EDGE * 100 / winChance(); }

    var rollBadge = el("div", { class: "ax-dice__roll", text: "00.00" });
    var zoneWin = el("div", { class: "ax-dice__zone is-win" });
    var zoneLose = el("div", { class: "ax-dice__zone is-lose" });
    var pointer = el("div", { class: "ax-dice__pointer" });
    var thumbLbl = el("b", {});
    var thumb = el("div", { class: "ax-dice__thumb" }, [thumbLbl]);
    var track = el("div", { class: "ax-dice__track" }, [zoneWin, zoneLose, pointer, thumb]);
    var multEl = el("b", {}), chanceEl = el("b", {}), profitEl = el("b", {});
    var dirBtn = el("button", { class: "ax-inst__chip ax-dice__dir" });
    var history = el("div", { class: "ax-dice__history" });
    var panel = null;

    function layout() {
      thumb.style.left = target + "%"; thumbLbl.textContent = String(target);
      var winLeft = dir === "under", lo = winLeft ? zoneWin : zoneLose, hi = winLeft ? zoneLose : zoneWin;
      lo.style.left = "0%"; lo.style.width = target + "%";
      hi.style.left = target + "%"; hi.style.width = (100 - target) + "%";
    }
    function sync() {
      layout();
      var bet = panel ? panel.getBet() : 50;
      multEl.textContent = mult().toFixed(2) + "×";
      chanceEl.textContent = winChance().toFixed(0) + "%";
      profitEl.textContent = money(Math.round(bet * (mult() - 1)));
      dirBtn.textContent = (dir === "under" ? "滾出 < " : "滾出 > ") + target;
    }
    dirBtn.addEventListener("click", function () { dir = dir === "under" ? "over" : "under"; sync(); });

    var dragging = false;
    function setFromX(cx) { var r = track.getBoundingClientRect(); target = HL.instant.clampInt((cx - r.left) / r.width * 100, 2, 98); sync(); }
    track.addEventListener("pointerdown", function (e) { dragging = true; try { track.setPointerCapture(e.pointerId); } catch (x) {} setFromX(e.clientX); });
    track.addEventListener("pointermove", function (e) { if (dragging) setFromX(e.clientX); });
    function endDrag() { dragging = false; }
    track.addEventListener("pointerup", endDrag); track.addEventListener("pointercancel", endDrag);

    function addPill(roll, win) {
      history.insertBefore(el("span", { class: "ax-dice__pill " + (win ? "is-win" : "is-lose"), text: roll.toFixed(2) }), history.firstChild);
      while (history.children.length > 12) history.removeChild(history.lastChild);
    }

    function playRound(bet, ctx) {
      var roll = Math.floor(Math.random() * 10000) / 100; // 0.00–99.99
      var win = dir === "under" ? roll < target : roll > target;
      var fast = !!(ctx && ctx.turbo), from = parseFloat(rollBadge.textContent) || 0;
      rollBadge.className = "ax-dice__roll"; pointer.classList.remove("is-bounce");
      pointer.style.left = roll + "%"; // CSS transition 平滑滑到落點（不依賴 rAF）
      if (!fast) HL.instant.animate(from, roll, 280, function (v) { rollBadge.textContent = v.toFixed(2); }); // 數字 count-up（盡力）
      // 結算閘門用 setTimeout 保證觸發（背景分頁/無 rAF 也成立）
      var done = new Promise(function (resolve) {
        setTimeout(function () {
          rollBadge.textContent = roll.toFixed(2);
          rollBadge.className = "ax-dice__roll " + (win ? "is-win" : "is-lose");
          pointer.classList.add("is-bounce"); addPill(roll, win);
          resolve();
        }, fast ? 0 : 300);
      });
      return { multiplier: win ? mult() : 0, label: "擲出 " + roll.toFixed(2), done: done };
    }

    panel = HL.instant.betPanel({ initial: 50, playText: "擲骰 🎲", playRound: playRound, onBetChange: sync });
    function card(label, node) { return el("div", { class: "ax-dice__card" }, [el("small", { class: "ax-muted", text: label }), node]); }
    sync();
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🎲 Dice" }),
      el("div", { class: "ax-inst__stage ax-dice" }, [rollBadge, track, history]),
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "方向" }), dirBtn]),
      el("div", { class: "ax-dice__info" }, [card("賠率", multEl), card("中獎率", chanceEl), card("可贏", profitEl)]),
      panel.node,
      el("span", { class: "ax-demo-tag", text: "1% 莊家優勢 · Demo · 拖動握把設目標、切換 大於/小於" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Dice", provider: "Apex Studio", key: "dice" }) : node;
  }

  /* ---------------- Limbo：崩盤倍數 ≥ 目標即贏 ---------------- */
  function limboGame() {
    var bigEl = el("div", { class: "ax-limbo__mult", text: "1.00×" });
    var tIn = el("input", { type: "number", min: "1.01", max: "1000000", step: "0.01", value: "2.00", class: "ax-limbo__target" });
    var multEl = el("b", {}), chanceEl = el("b", {}), profitEl = el("b", {});
    var history = el("div", { class: "ax-limbo__hist" });
    var panel = null;
    function target() { return Math.max(1.01, Math.min(1e6, +tIn.value || 1.01)); }
    function sync() {
      var t = target(), bet = panel ? panel.getBet() : 50;
      multEl.textContent = t.toFixed(2) + "×";
      chanceEl.textContent = (EDGE * 100 / t).toFixed(2) + "%";
      profitEl.textContent = money(Math.round(bet * (t - 1)));
    }
    tIn.addEventListener("input", sync);
    function addPill(crash, win) { history.insertBefore(el("span", { class: "ax-limbo__chip " + (win ? "is-win" : "is-lose"), text: crash.toFixed(2) + "×" }), history.firstChild); while (history.children.length > 12) history.removeChild(history.lastChild); }

    function playRound(bet, ctx) {
      var t = target(), r = Math.random(), crash = Math.max(1, EDGE / (1 - r)), win = crash >= t; // P(crash>=t)=EDGE/t
      var fast = !!(ctx && ctx.turbo), from = parseFloat(bigEl.textContent) || 1;
      bigEl.className = "ax-limbo__mult";
      if (!fast) HL.instant.animate(from, crash, 600, function (v) { bigEl.textContent = v.toFixed(2) + "×"; }); // 快速滾動上升（盡力）
      var done = new Promise(function (resolve) {
        setTimeout(function () {
          bigEl.textContent = crash.toFixed(2) + "×";
          bigEl.className = "ax-limbo__mult"; void bigEl.offsetWidth; // reflow 讓動畫可重播
          bigEl.className = "ax-limbo__mult " + (win ? "is-win" : "is-lose");
          addPill(crash, win); resolve();
        }, fast ? 0 : 620);
      });
      return { multiplier: win ? t : 0, label: "崩盤 " + crash.toFixed(2) + "×", done: done };
    }

    panel = HL.instant.betPanel({ initial: 50, playText: "開始 🚀", playRound: playRound, onBetChange: sync });
    function card(l, n) { return el("div", { class: "ax-dice__card" }, [el("small", { class: "ax-muted", text: l }), n]); }
    sync();
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🚀 Limbo" }),
      el("div", { class: "ax-inst__stage ax-limbo" }, [history, bigEl]),
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "目標倍數" }), tIn]),
      el("div", { class: "ax-dice__info" }, [card("賠率", multEl), card("中獎率", chanceEl), card("可贏", profitEl)]),
      panel.node,
      el("span", { class: "ax-demo-tag", text: "1% 莊家優勢 · Demo · 崩盤倍數 ≥ 目標即贏" })
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

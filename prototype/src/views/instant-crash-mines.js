/*
 * Apex Win｜即時遊戲：Crash + Mines（互動式回合，重用 HL.instant 的餘額/下注欄）
 * Crash：倍數從 1.00× 爬升，崩盤前兌現；可設自動兌現倍數。1% 莊家優勢。
 * Mines：5×5 翻格，每翻一安全格倍數累乘，隨時兌現；踩雷則輸。1% 莊家優勢。
 * 以 register 覆蓋 mock 的 comingSoon 占位卡（id: crash-x / mines）為可玩。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var EDGE = 0.99;
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }

  /* ---------------- Crash ---------------- */
  function crashGame() {
    var active = false, cashed = false, mult = 1, crashAt = 0, roundBet = 0, timer = null, autoTarget = 0;
    var amt = HL.instant.amountField(50);
    var multEl = el("div", { class: "ax-crash__mult", text: "1.00×" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "設好金額，按「下注」起飛 🚀" });
    var autoIn = el("input", { type: "number", min: "0", step: "0.01", value: "0", class: "ax-inst__num", title: "自動兌現倍數(0=關)" });
    var betBtn = el("button", { class: "ax-btn-primary", text: "下注 🚀" });
    var cashBtn = el("button", { class: "ax-btn-primary ax-crash__cash", text: "兌現", disabled: "disabled" });

    function stop() { if (timer) { clearInterval(timer); timer = null; } active = false; betBtn.disabled = false; cashBtn.disabled = true; }
    function bust() { stop(); multEl.className = "ax-crash__mult is-lose"; if (!cashed) { statusEl.textContent = "💥 崩盤 " + mult.toFixed(2) + "× — 沒兌現"; statusEl.className = "ax-inst__last ax-red"; } }
    function cashOut() {
      if (!active || cashed) return;
      cashed = true; var payout = Math.round(roundBet * mult);
      setBal(bal() + payout);
      multEl.className = "ax-crash__mult is-win";
      statusEl.textContent = "兌現 @" + mult.toFixed(2) + "× 　贏 +" + money(payout - roundBet); statusEl.className = "ax-inst__last ax-green";
      stop();
    }
    function start() {
      if (active) return;
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      setBal(bal() - bet); roundBet = bet; cashed = false; active = true; mult = 1;
      var r = Math.random(); crashAt = Math.max(1, EDGE / (1 - r));
      autoTarget = Math.max(0, +autoIn.value || 0);
      betBtn.disabled = true; cashBtn.disabled = false; multEl.className = "ax-crash__mult is-live"; multEl.textContent = "1.00×";
      statusEl.textContent = "上升中…到頂前按兌現"; statusEl.className = "ax-inst__last ax-muted";
      timer = setInterval(function () {
        if (!multEl.isConnected) { stop(); return; } // 離開頁面 → 收掉
        mult = +(mult + (mult - 1) * 0.07 + 0.02).toFixed(2); // 加速爬升（越高越快）
        if (mult >= crashAt) { mult = +crashAt.toFixed(2); multEl.textContent = mult.toFixed(2) + "×"; bust(); return; }
        multEl.textContent = mult.toFixed(2) + "×";
        if (autoTarget && !cashed && mult >= autoTarget) cashOut();
      }, 90);
    }
    betBtn.addEventListener("click", start);
    cashBtn.addEventListener("click", cashOut);

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🚀 Crash X" }),
      el("div", { class: "ax-inst__stage ax-crash" }, [multEl]),
      amt.node,
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "自動兌現倍數(0=關)" }), autoIn]),
      el("div", { class: "ax-crash__btns" }, [betBtn, cashBtn]),
      statusEl,
      el("span", { class: "ax-demo-tag", text: "1% 莊家優勢 · Demo · 崩盤前兌現即贏 押注×當前倍數" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Crash X", provider: "Apex Studio", key: "crash-x" }) : node;
  }

  /* ---------------- Mines ---------------- */
  function minesGame() {
    var N = 25, mines = 3, active = false, safeCount = 0, roundBet = 0, minePos = {};
    var amt = HL.instant.amountField(50);
    var multEl = el("b", { class: "ax-mines__mult", text: "1.00×" });
    var nextEl = el("span", { class: "ax-muted ax-mines__next", text: "" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "選地雷數、按「開始」，翻格累乘，隨時兌現 💎" });
    var startBtn = el("button", { class: "ax-btn-primary", text: "開始" });
    var cashBtn = el("button", { class: "ax-btn-primary ax-crash__cash", text: "兌現", disabled: "disabled" });
    var cells = [], gridEl = el("div", { class: "ax-mines__grid" });

    function fairMult(k) { var m = 1; for (var i = 0; i < k; i++) m *= (N - i) / (N - mines - i); return EDGE * m; }
    function refreshMult() { multEl.textContent = fairMult(safeCount).toFixed(2) + "×"; nextEl.textContent = active ? ("下一格 " + fairMult(safeCount + 1).toFixed(2) + "×") : ""; }
    function lockAll(showMines) { cells.forEach(function (c, i) { c.classList.add("is-locked"); if (showMines && minePos[i] && !c.classList.contains("is-open")) { c.textContent = "💣"; c.classList.add("is-mine"); } }); cashBtn.disabled = true; startBtn.disabled = false; active = false; }

    var minesSel = el("div", { class: "ax-inst__amt" });
    [1, 3, 5, 10].forEach(function (mv) {
      minesSel.appendChild(el("button", { class: "ax-inst__chip" + (mv === mines ? " is-active" : ""), text: mv + " 雷", onClick: function () {
        if (active) return; mines = mv; Array.prototype.forEach.call(minesSel.children, function (c) { c.classList.remove("is-active"); }); this.classList.add("is-active"); refreshMult();
      } }));
    });

    function reveal(i) {
      if (!active) return; var c = cells[i]; if (c.classList.contains("is-open") || c.classList.contains("is-mine")) return;
      if (minePos[i]) { c.classList.add("is-open", "is-mine"); c.textContent = "💣"; statusEl.textContent = "💣 踩到地雷，這局結束"; statusEl.className = "ax-inst__last ax-red"; lockAll(true); refreshMult(); return; }
      c.classList.add("is-open"); c.textContent = "💎"; safeCount++; refreshMult();
      if (safeCount === N - mines) cashOut(); // 全翻完
    }
    function start() {
      if (active) return;
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      setBal(bal() - bet); roundBet = bet; safeCount = 0; active = true;
      minePos = {}; var placed = 0; while (placed < mines) { var p = Math.floor(Math.random() * N); if (!minePos[p]) { minePos[p] = 1; placed++; } }
      cells.forEach(function (c) { c.className = "ax-mines__cell"; c.textContent = ""; });
      cashBtn.disabled = false; startBtn.disabled = true; refreshMult();
      statusEl.textContent = "翻開安全格累乘，隨時可兌現"; statusEl.className = "ax-inst__last ax-muted";
    }
    function cashOut() {
      if (!active) return;
      if (safeCount === 0) { HL.ui.toast("至少翻一格再兌現", "warn"); return; }
      var payout = Math.round(roundBet * fairMult(safeCount));
      setBal(bal() + payout);
      statusEl.textContent = "兌現 " + fairMult(safeCount).toFixed(2) + "× 　贏 +" + money(payout - roundBet); statusEl.className = "ax-inst__last ax-green";
      lockAll(true);
    }
    for (var i = 0; i < N; i++) { (function (idx) { var c = el("div", { class: "ax-mines__cell", onClick: function () { reveal(idx); } }); cells.push(c); gridEl.appendChild(c); })(i); }
    startBtn.addEventListener("click", start);
    cashBtn.addEventListener("click", cashOut);

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "💣 Mines" }),
      el("div", { class: "ax-inst__stage ax-mines" }, [
        el("div", { class: "ax-mines__top" }, [el("span", {}, ["目前 ", multEl]), nextEl]),
        gridEl
      ]),
      amt.node,
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "地雷數" }), minesSel]),
      el("div", { class: "ax-crash__btns" }, [startBtn, cashBtn]),
      statusEl,
      el("span", { class: "ax-demo-tag", text: "1% 莊家優勢 · Demo · 翻安全格累乘，踩雷歸零" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Mines", provider: "Apex Studio", key: "mines" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "crash-x", title: "Crash X", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1e6e5a", c2: "#0a2a24", render: crashGame });
    HL.games.register({ id: "mines", title: "Mines", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#3a1e6e", c2: "#160a2a", render: minesGame });
  }
})(window);

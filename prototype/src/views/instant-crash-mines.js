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
    var active = false, cashed = false, mult = 1, crashAt = 0, roundBet = 0, timer = null, autoTarget = 0, startTs = 0;
    var K = 0.55, W = 300, H = 170; // 爬升係數：1→2× 約 1.26s
    var amt = HL.instant.amountField(50);
    var graph = el("div", { class: "ax-crash__graph" });
    graph.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">'
      + '<defs><linearGradient id="axCrashG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#36a6ff"/><stop offset="1" stop-color="#ffd76a"/></linearGradient></defs>'
      + '<path class="ax-crash__fill" d=""/><path class="ax-crash__line" d="" fill="none" stroke="url(#axCrashG)" stroke-width="3" stroke-linejoin="round"/>'
      + '<text class="ax-crash__rocket" x="0" y="' + H + '">🚀</text></svg>';
    var pathLine = graph.querySelector(".ax-crash__line"), pathFill = graph.querySelector(".ax-crash__fill"), rocket = graph.querySelector(".ax-crash__rocket");
    var multEl = el("div", { class: "ax-crash__mult", text: "1.00×" });
    var hist = HL.ui.histBar({ cls: "ax-crash__hist", itemCls: "ax-crash__chip", max: 14, fair: true });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "設好金額，按「下注」起飛 🚀" });
    var autoIn = el("input", { type: "number", min: "0", step: "0.01", value: "0", class: "ax-inst__num", title: "自動兌現倍數(0=關)" });
    var betBtn = el("button", { class: "ax-btn-primary", text: "下注 🚀" });
    var cashBtn = el("button", { class: "ax-btn-primary ax-crash__cash", text: "兌現", disabled: "disabled" });

    function addHist(v) { hist.push(v.toFixed(2) + "×", v < 2 ? "is-lo" : (v < 10 ? "is-mid" : "is-hi")); }
    function plot(elapsed, m) {
      var maxY = Math.max(2, m * 1.12), TV = Math.max(4, elapsed * 1.05), N = 36;
      function X(t) { return Math.min(W, t / TV * W); }
      function Y(v) { return H - 3 - (v - 1) / (maxY - 1) * (H - 8); }
      var d = "M 0 " + Y(1).toFixed(1);
      for (var i = 1; i <= N; i++) { var t = elapsed * i / N; d += " L " + X(t).toFixed(1) + " " + Y(Math.exp(K * t)).toFixed(1); }
      pathLine.setAttribute("d", d);
      pathFill.setAttribute("d", d + " L " + X(elapsed).toFixed(1) + " " + H + " L 0 " + H + " Z");
      rocket.setAttribute("x", X(elapsed).toFixed(1)); rocket.setAttribute("y", Y(m).toFixed(1));
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } active = false; betBtn.disabled = false; cashBtn.disabled = true; }
    function spark() {
      var rx = parseFloat(rocket.getAttribute("x")) / W * 100, ry = parseFloat(rocket.getAttribute("y")) / H * 100;
      for (var i = 0; i < 10; i++) { var s = el("span", { class: "ax-crash__spark" }); s.style.left = rx + "%"; s.style.top = ry + "%"; s.style.setProperty("--dx", (Math.random() * 120 - 60).toFixed(0) + "px"); s.style.setProperty("--dy", (Math.random() * 120 - 60).toFixed(0) + "px"); graph.appendChild(s); (function (sp) { setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 600); })(s); }
    }
    function bust() {
      stop(); multEl.className = "ax-crash__mult is-lose"; pathLine.setAttribute("stroke", "var(--ax-red, #ff5d6c)");
      graph.classList.add("is-boom"); setTimeout(function () { graph.classList.remove("is-boom"); }, 500); spark();
      if (!cashed) { statusEl.textContent = "💥 崩盤 " + mult.toFixed(2) + "× — 沒兌現"; statusEl.className = "ax-inst__last ax-red"; if (HL.liveStats) HL.liveStats.record("crash-x", roundBet, 0); }
      addHist(crashAt);
    }
    function cashOut() {
      if (!active || cashed) return;
      cashed = true; var payout = Math.round(roundBet * mult);
      setBal(bal() + payout); if (HL.liveStats) HL.liveStats.record("crash-x", roundBet, payout);
      multEl.className = "ax-crash__mult is-win";
      statusEl.textContent = "兌現 @" + mult.toFixed(2) + "× 　贏 +" + money(payout - roundBet); statusEl.className = "ax-inst__last ax-green";
      var f = el("div", { class: "ax-crash__float", text: "+" + money(payout - roundBet) }); graph.appendChild(f); setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 800);
      cashBtn.disabled = true; addHist(crashAt); stop();
    }
    function start() {
      if (active) return;
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      setBal(bal() - bet); roundBet = bet; cashed = false; active = true; mult = 1;
      var r = (HL.fair ? HL.fair.float("crash-x") : Math.random()); crashAt = Math.max(1, EDGE / (1 - r)); // S3：結果亂數走可驗證公平
      autoTarget = Math.max(0, +autoIn.value || 0);
      betBtn.disabled = true; cashBtn.disabled = false; cashBtn.textContent = "兌現";
      multEl.className = "ax-crash__mult is-live"; multEl.textContent = "1.00×";
      pathLine.setAttribute("stroke", "url(#axCrashG)"); graph.classList.remove("is-boom");
      statusEl.textContent = "上升中…到頂前按兌現"; statusEl.className = "ax-inst__last ax-muted";
      startTs = (global.performance && performance.now) ? performance.now() : Date.now();
      timer = setInterval(function () {
        if (!multEl.isConnected) { stop(); return; }
        var now = (global.performance && performance.now) ? performance.now() : Date.now();
        var elapsed = (now - startTs) / 1000;
        mult = Math.exp(K * elapsed);
        if (mult >= crashAt) { mult = crashAt; multEl.textContent = mult.toFixed(2) + "×"; plot(elapsed, mult); bust(); return; }
        multEl.textContent = mult.toFixed(2) + "×"; plot(elapsed, mult);
        if (!cashed) cashBtn.textContent = "兌現 " + money(Math.round(roundBet * mult));
        if (autoTarget && !cashed && mult >= autoTarget) cashOut();
      }, 60);
    }
    betBtn.addEventListener("click", start);
    cashBtn.addEventListener("click", cashOut);

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🚀 Crash X" }),
      hist.node,
      el("div", { class: "ax-inst__stage ax-crash" }, [graph, multEl]),
      amt.node,
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "自動兌現倍數(0=關)" }), autoIn]),
      el("div", { class: "ax-crash__btns" }, [betBtn, cashBtn]),
      statusEl,
      HL.ui.gameInfoBar({ fair: true, edge: "1% 莊家優勢", note: "崩盤前兌現即贏 押注×當前倍數" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Crash X", provider: "Apex Studio", key: "crash-x" }) : node;
  }

  /* ---------------- Mines ---------------- */
  function minesGame() {
    var N = 25, mines = 3, active = false, safeCount = 0, roundBet = 0, minePos = {};
    var amt = HL.instant.amountField(50);
    var multEl = el("b", { class: "ax-mines__mult", text: "1.00×" });
    var nextEl = el("b", {});
    var winEl = el("b", { class: "ax-gold", text: "—" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "選地雷數、按「開始」，翻格累乘，隨時兌現 💎" });
    var startBtn = el("button", { class: "ax-btn-primary", text: "開始" });
    var randBtn = el("button", { class: "ax-btn-ghost ax-mines__rand", text: "🎲 隨機", disabled: "disabled" });
    var cashBtn = el("button", { class: "ax-btn-primary ax-crash__cash", text: "兌現", disabled: "disabled" });
    var cells = [], gridEl = el("div", { class: "ax-mines__grid" });

    function fairMult(k) { var m = 1; for (var i = 0; i < k; i++) m *= (N - i) / (N - mines - i); return EDGE * m; }
    function potWin() { return Math.round(roundBet * fairMult(safeCount)); }
    function record(payout) { if (HL.liveStats) HL.liveStats.record("mines", roundBet, payout); }
    function refreshMult() {
      multEl.textContent = fairMult(safeCount).toFixed(2) + "×";
      nextEl.textContent = active ? (fairMult(safeCount + 1).toFixed(2) + "×") : (fairMult(1).toFixed(2) + "×");
      winEl.textContent = active ? money(potWin()) : "—";
      multEl.classList.remove("bump"); void multEl.offsetWidth; multEl.classList.add("bump");
    }
    function lockAll(showMines) { cells.forEach(function (c, i) { c.classList.add("is-locked"); if (showMines && minePos[i] && !c.classList.contains("is-open")) { c.textContent = "💣"; c.classList.add("is-mine"); } }); cashBtn.disabled = true; randBtn.disabled = true; startBtn.disabled = false; active = false; }
    function revealRestSafe() { var d = 0; cells.forEach(function (c, i) { if (!minePos[i] && !c.classList.contains("is-open")) { (function (cc, dd) { setTimeout(function () { cc.classList.add("is-open"); cc.textContent = "💎"; }, dd); })(c, d); d += 30; } }); }

    var minesSel = el("div", { class: "ax-inst__amt" });
    [1, 3, 5, 10, 24].forEach(function (mv) {
      minesSel.appendChild(el("button", { class: "ax-inst__chip" + (mv === mines ? " is-active" : ""), text: String(mv), onClick: function () {
        if (active) return; mines = mv; Array.prototype.forEach.call(minesSel.children, function (c) { c.classList.remove("is-active"); }); this.classList.add("is-active"); refreshMult();
      } }));
    });

    function reveal(i) {
      if (!active) return; var c = cells[i]; if (c.classList.contains("is-open") || c.classList.contains("is-mine")) return;
      if (minePos[i]) {
        c.classList.add("is-open", "is-mine", "is-boom"); c.textContent = "💣";
        gridEl.classList.add("shake"); setTimeout(function () { gridEl.classList.remove("shake"); }, 400);
        statusEl.textContent = "💣 踩到地雷，這局結束"; statusEl.className = "ax-inst__last ax-red";
        record(0); lockAll(true); winEl.textContent = "—"; return;
      }
      c.classList.add("is-open", "is-flip"); c.textContent = "💎"; safeCount++; refreshMult();
      if (safeCount === N - mines) cashOut(); // 全翻完
    }
    function randomPick() {
      if (!active) return; var avail = [];
      for (var i = 0; i < N; i++) if (!cells[i].classList.contains("is-open") && !cells[i].classList.contains("is-mine")) avail.push(i);
      if (avail.length) reveal(avail[Math.floor(Math.random() * avail.length)]);
    }
    function start() {
      if (active) return;
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      setBal(bal() - bet); roundBet = bet; safeCount = 0; active = true;
      minePos = {}; var placed = 0; while (placed < mines) { var p = Math.floor((HL.fair ? HL.fair.float("mines") : Math.random()) * N); if (!minePos[p]) { minePos[p] = 1; placed++; } } // S3：佈雷亂數走可驗證公平（每顆雷一次抽數、皆入 nonce 序列）
      cells.forEach(function (c) { c.className = "ax-mines__cell"; c.textContent = ""; });
      gridEl.classList.remove("is-win"); cashBtn.disabled = false; randBtn.disabled = false; startBtn.disabled = true; refreshMult();
      statusEl.textContent = "翻開安全格累乘，隨時可兌現"; statusEl.className = "ax-inst__last ax-muted";
    }
    function cashOut() {
      if (!active) return;
      if (safeCount === 0) { HL.ui.toast("至少翻一格再兌現", "warn"); return; }
      var payout = potWin(); setBal(bal() + payout); record(payout);
      statusEl.textContent = "兌現 " + fairMult(safeCount).toFixed(2) + "× 　贏 +" + money(payout - roundBet); statusEl.className = "ax-inst__last ax-green";
      gridEl.classList.add("is-win"); revealRestSafe(); lockAll(true);
    }
    for (var i = 0; i < N; i++) { (function (idx) { var c = HL.dom.pressable(el("div", { class: "ax-mines__cell", onClick: function () { reveal(idx); } })); cells.push(c); gridEl.appendChild(c); })(i); }
    startBtn.addEventListener("click", start);
    cashBtn.addEventListener("click", cashOut);
    randBtn.addEventListener("click", randomPick);
    refreshMult();

    function stat(l, n) { return HL.ui.stat(l, n, "ax-mines__stat"); }
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "💣 Mines" }),
      el("div", { class: "ax-inst__stage ax-mines" }, [
        el("div", { class: "ax-mines__top" }, [stat("目前", multEl), stat("下一格", nextEl), stat("可贏", winEl)]),
        gridEl
      ]),
      amt.node,
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "地雷數" }), minesSel]),
      el("div", { class: "ax-crash__btns" }, [startBtn, randBtn, cashBtn]),
      statusEl,
      HL.ui.gameInfoBar({ fair: true, edge: "1% 莊家優勢", note: "翻安全格累乘，踩雷歸零" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Mines", provider: "Apex Studio", key: "mines" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "crash-x", title: "Crash X", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1e6e5a", c2: "#0a2a24", render: crashGame });
    HL.games.register({ id: "mines", title: "Mines", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#3a1e6e", c2: "#160a2a", render: minesGame });
  }
})(window);

/*
 * Apex Win｜即時遊戲：Crash + Mines（互動式回合，重用 HL.instant 的餘額/下注欄）
 * Crash：倍數從 1.00× 爬升，崩盤前兌現；可設自動兌現倍數。1% 莊家優勢。
 * Mines：5×5 翻格，每翻一安全格倍數累乘，隨時兌現；踩雷則輸。1% 莊家優勢。
 * 以 register 覆蓋 mock 的 comingSoon 占位卡（id: crash-x / mines）為可玩。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學（HL.crashX/HL.mines）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var EDGE = 0.99; // 1% house edge

  // ---- Crash X：崩盤倍數 crash = max(1, EDGE/(1-f))；兌現目標 m 時 crash≥m 即贏（賠 m×）。
  //      與 Limbo 同一數學（差別僅連續兌現 vs 預設目標）：P(crash≥m)=EDGE/m ⇒ **任何兌現點 RTP=EDGE**（與 m 無關）；
  //      重尾 1/m 分布、P(≥2×)=EDGE/2=0.495=(1-houseEdge)/2、instant-bust P(f<1-EDGE)=0.01（崩在 1.00×）。 ----
  var Crash = {
    edge: EDGE,
    crashOf: function (f) { return Math.max(1, EDGE / (1 - f)); },
    winChancePct: function (m) { return EDGE * 100 / m; },      // 顯示/驗證用（%）
    resolve: function (f, m) { var c = Crash.crashOf(f), win = c >= m; return { crash: c, win: win, multiplier: win ? m : 0 }; }
  };

  // ---- Mines：N 格、mines 雷；翻 k 安全格賠率 fairMult(k)=EDGE·Π_{i=0}^{k-1}(N-i)/(N-mines-i)。
  //      P(k 安全)=Π_{i=0}^{k-1}(N-mines-i)/(N-i) ⇒ **任何 (mines,k) 策略 RTP=P(k安全)·fairMult(k)=EDGE**。 ----
  var Mines = {
    edge: EDGE, N: 25,
    fairMult: function (k, mines, N) { N = N || 25; var m = 1; for (var i = 0; i < k; i++) m *= (N - i) / (N - mines - i); return EDGE * m; },
    pSafe: function (k, mines, N) { N = N || 25; var p = 1; for (var i = 0; i < k; i++) p *= (N - mines - i) / (N - i); return p; }
  };

  HL.crashX = Crash; HL.mines = Mines;
  if (typeof module !== "undefined" && module.exports) { module.exports = { crash: Crash, mines: Mines }; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;
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
      if (HL.rg && !HL.rg.check(bet)) return;   // #86：本檔自帶下注面板(amountField，未走 betPanel) ⇒ 需自帶閘；未設限時恆真＝零回歸
      setBal(bal() - bet); roundBet = bet; cashed = false; active = true; mult = 1;
      var r = HL.fair.floatOr("crash-x"); crashAt = Crash.crashOf(r); // S3：結果亂數走可驗證公平（T11：統一後援出口）；數學走純函式=node 驗的即玩的
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
        /* 家族「求值順序」（2026-08-20 手感巡檢·high）：自動兌現必須先於崩盤判定求值，
         * 而且要以**目標倍數**兌現、不是以「這一拍算到的倍數」。
         * 【舊版錯在哪】一拍 60ms，倍數在一拍內可能同時跨過 autoTarget 與 crashAt，而 bust 排在前面
         *   ⇒ 崩盤點其實**高於**玩家目標的回合仍被判輸（玩家設 2.00×、實際崩在 2.50×，照樣輸）。
         * 【順便修掉反向的錯】沒崩的時候舊版按「這一拍的 mult」派彩，那是超過目標的溢出量＝多賠；
         *   夾成 autoTarget 才是自動兌現的語意，也才對得上 P(reach m)×m 的模型。 */
        if (autoTarget && !cashed && mult >= autoTarget && autoTarget <= crashAt) {
          mult = autoTarget; multEl.textContent = mult.toFixed(2) + "×"; plot(elapsed, mult); cashOut(); return;
        }
        if (mult >= crashAt) { mult = crashAt; multEl.textContent = mult.toFixed(2) + "×"; plot(elapsed, mult); bust(); return; }
        multEl.textContent = mult.toFixed(2) + "×"; plot(elapsed, mult);
        if (!cashed) cashBtn.textContent = "兌現 " + money(Math.round(roundBet * mult));
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
    var epoch = 0;   // 局世代（家族 B）：開新局即 +1，跨局殘留的揭曉階梯一律作廢

    function fairMult(k) { return Mines.fairMult(k, mines, N); } // 走純函式=node 驗的即玩的同一份
    function potWin() { return Math.round(roundBet * fairMult(safeCount)); }
    function record(payout) { if (HL.liveStats) HL.liveStats.record("mines", roundBet, payout); }
    function refreshMult() {
      multEl.textContent = fairMult(safeCount).toFixed(2) + "×";
      /* 家族 F：「下一格」在翻完最後一格時是 fairMult(N-mines+1)＝除以零＝`Infinity×`，
       * 而 cashOut → lockAll 不重算計分板 ⇒ 那個 Infinity× 會一路留到下一局開局才被蓋掉。 */
      var maxSafe = N - mines;
      nextEl.textContent = !active ? (fairMult(1).toFixed(2) + "×")
        : (safeCount + 1 <= maxSafe ? (fairMult(safeCount + 1).toFixed(2) + "×") : "—");
      winEl.textContent = active ? money(potWin()) : "—";
      multEl.classList.remove("bump"); void multEl.offsetWidth; multEl.classList.add("bump");
    }
    function lockAll(showMines) { cells.forEach(function (c, i) { c.classList.add("is-locked"); if (showMines && minePos[i] && !c.classList.contains("is-open")) { c.textContent = "💣"; c.classList.add("is-mine"); } }); cashBtn.disabled = true; randBtn.disabled = true; startBtn.disabled = false; active = false; refreshMult(); }
    /* 家族 B（2026-08-20 手感巡檢·high）：這條 30ms 階梯的 setTimeout 過去**從不取消**。
     * 兌現後 0.66 秒內開新局（24 格時 23×30ms），殘留的階梯會把 💎/is-open 畫到**新棋盤**上，
     * 那些格子從此點不動（reveal 會被 is-open 擋掉），全清自動兌現也永不成立＝局面直接壞掉。
     * 修法用「局世代」ep：開新局就 epoch++，舊階梯自己失效（同 chicken.js / vsslot.js 既有寫法）。 */
    function revealRestSafe() {
      var d = 0, ep = epoch;
      cells.forEach(function (c, i) {
        if (!minePos[i] && !c.classList.contains("is-open")) {
          (function (cc, dd) {
            setTimeout(function () { if (ep !== epoch || !cc.isConnected) return; cc.classList.add("is-open"); cc.textContent = "💎"; }, dd);
          })(c, d);
          d += 30;
        }
      });
    }

    // U17：地雷數單選群改走 HL.ui.segmented（保留 ax-inst__amt/ax-inst__chip/is-active 外觀＋補 aria-pressed；
    //   局中鎖定＝onPick 回傳 false 取消切換，語意同原 if(active) return）
    var minesSel = HL.ui.segmented([1, 3, 5, 10, 24].map(function (mv) { return { v: mv, t: String(mv) }; }), mines, function (mv) {
      if (active) return false; mines = mv; refreshMult();
    }, { cls: "ax-inst__amt", btnCls: "ax-inst__chip", activeCls: "is-active" });

    function reveal(i) {
      if (!active) return; var c = cells[i]; if (c.classList.contains("is-open") || c.classList.contains("is-mine")) return;
      if (minePos[i]) {
        c.classList.add("is-open", "is-mine", "is-boom"); c.textContent = "💣";
        gridEl.classList.add("shake"); setTimeout(function () { gridEl.classList.remove("shake"); }, 400);
        statusEl.textContent = "💣 踩到地雷，這局結束"; statusEl.className = "ax-inst__last ax-red";
        record(0); revealRestSafe(); lockAll(true); winEl.textContent = "—"; return;   // #30 incomplete-reveal：踩雷收局也要翻出剩下的💎（比照兌現路徑 cashOut 的 revealRestSafe()+lockAll(true)），否則輸的那次揭曉是殘缺的（只翻雷不翻鑽）＝與真實 Mines(Stake) 收局全揭不符

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
      if (HL.rg && !HL.rg.check(bet)) return;   // #86：本檔自帶下注面板(amountField，未走 betPanel) ⇒ 需自帶閘；未設限時恆真＝零回歸
      setBal(bal() - bet); roundBet = bet; safeCount = 0; active = true; epoch++;   // epoch++：上一局的揭曉階梯就此失效
      minePos = {}; var placed = 0; while (placed < mines) { var p = Math.floor(HL.fair.floatOr("mines") * N); if (!minePos[p]) { minePos[p] = 1; placed++; } } // S3：佈雷亂數走可驗證公平（每顆雷一次抽數、皆入 nonce 序列；T11：統一後援出口）
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
})(typeof window !== "undefined" ? window : globalThis);

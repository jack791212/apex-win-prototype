/*
 * Apex Win｜即時遊戲共用引擎 HL.instant
 * 給 Dice/Limbo/Crash/Mines/Plinko 等 instant 遊戲共用：
 *  - 下注金額面板（輸入 + ½ / 2× / Max）
 *  - 手動 / 自動 切換；自動下注(局數、贏後+%/輸後+%、止盈、止損、Turbo)
 *  - 統一扣注 / 派彩 / 餘額同步（Demo：HL.state.balance）
 * 各遊戲只需提供 playRound(bet) → { win, multiplier(總賠付倍數,輸=0), label? }，
 * 並在 playRound 內更新自己的 stage 視覺。本面板負責金流與 autobet。註冊於 window.HL.instant。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;

  function bal() { return HL.state.get().balance; }
  function setBal(v) { HL.state.set({ balance: Math.max(0, Math.round(v)) }); if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome(); }
  function clampInt(v, lo, hi) { v = Math.round(+v || 0); return Math.max(lo, Math.min(hi, v)); }

  function betPanel(opts) {
    opts = opts || {};
    var state = { bet: opts.initial || 50, running: false };
    var base = state.bet, timer = null;

    var input = el("input", { type: "number", min: "1", value: String(state.bet), class: "ax-inst__bet" });
    function notifyBet() { if (opts.onBetChange) opts.onBetChange(state.bet); }
    function readBet() { state.bet = clampInt(input.value, 1, 9e9); input.value = String(state.bet); return state.bet; }
    function writeBet(v) { state.bet = clampInt(v, 1, 9e9); input.value = String(state.bet); notifyBet(); }
    input.addEventListener("input", function () { state.bet = clampInt(input.value, 1, 9e9); notifyBet(); });
    function chip(t, fn) { return el("button", { class: "ax-inst__chip", text: t, onClick: fn }); }
    var amountRow = el("div", { class: "ax-inst__row" }, [
      el("small", { class: "ax-muted", text: "下注金額" }),
      el("div", { class: "ax-inst__amt" }, [
        input,
        chip("½", function () { writeBet(Math.max(1, Math.floor(state.bet / 2))); }),
        chip("2×", function () { writeBet(state.bet * 2); }),
        chip("Max", function () { writeBet(bal()); })
      ])
    ]);

    var manualWrap = el("div", { class: "ax-inst__manual" });
    var autoWrap = el("div", { class: "ax-inst__auto", style: "display:none" });
    var tabM = el("button", { class: "ax-inst__tab is-active", text: "手動" });
    var tabA = el("button", { class: "ax-inst__tab", text: "自動" });
    function setMode(auto) {
      tabM.classList.toggle("is-active", !auto); tabA.classList.toggle("is-active", auto);
      manualWrap.style.display = auto ? "none" : "block";
      autoWrap.style.display = auto ? "block" : "none";
    }
    tabM.addEventListener("click", function () { if (!state.running) setMode(false); });
    tabA.addEventListener("click", function () { if (!state.running) setMode(true); });

    var lastEl = el("div", { class: "ax-inst__last ax-muted", text: "—" });
    // res.multiplier = 總賠付倍數（輸=0；可為 <1 的部分賠付，如 Plinko）。以淨值判定輸贏顯示。
    // res.done（選用）= Promise：有動畫的遊戲(Dice/Limbo)在動畫結束才結算派彩，回傳 Promise。
    function settle(bet, res) {
      setBal(bal() - bet); // 立即扣注
      function finish() {
        var payout = Math.round(bet * (res.multiplier || 0));
        if (payout) setBal(bal() + payout);
        if (HL.liveStats) HL.liveStats.record(opts.game || "instant", bet, payout); // 進實時統計 + 餵 VIP/任務
        var net = payout - bet;
        lastEl.textContent = (net >= 0 ? "贏 +" + money(net) : "輸 " + money(-net)) + (res.label ? "　" + res.label : "");
        lastEl.className = "ax-inst__last " + (net >= 0 ? "ax-green" : "ax-red");
        return { payout: payout, net: net };
      }
      return (res && res.done && typeof res.done.then === "function") ? res.done.then(finish) : finish();
    }

    var playBtn = el("button", { class: "ax-btn-primary", text: opts.playText || "下注", onClick: function () {
      if (state.running || playBtn.disabled) return;
      var bet = readBet();
      if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      playBtn.disabled = true;
      Promise.resolve(settle(bet, opts.playRound(bet, { turbo: false }))).then(function () { playBtn.disabled = false; });
    } });
    manualWrap.appendChild(playBtn);

    var aCount = el("input", { type: "number", min: "0", value: "10", class: "ax-inst__num" });
    var aWin = el("input", { type: "number", min: "0", value: "0", class: "ax-inst__num" });
    var aLoss = el("input", { type: "number", min: "0", value: "0", class: "ax-inst__num" });
    var aTP = el("input", { type: "number", min: "0", value: "0", class: "ax-inst__num" });
    var aSL = el("input", { type: "number", min: "0", value: "0", class: "ax-inst__num" });
    var turbo = el("input", { type: "checkbox" });
    var startBtn = el("button", { class: "ax-btn-primary", text: "開始自動" });
    function field(label, node) { return el("label", { class: "ax-inst__field" }, [el("small", { class: "ax-muted", text: label }), node]); }
    autoWrap.appendChild(el("div", { class: "ax-inst__grid" }, [
      field("局數(0=∞)", aCount), field("贏後+%", aWin), field("輸後+%", aLoss), field("止盈", aTP), field("止損", aSL),
      el("label", { class: "ax-inst__field ax-inst__turbo" }, [el("small", { class: "ax-muted", text: "Turbo" }), turbo])
    ]));
    autoWrap.appendChild(startBtn);

    function stopAuto() { state.running = false; if (timer) { clearTimeout(timer); timer = null; } startBtn.textContent = "開始自動"; startBtn.classList.remove("is-stop"); playBtn.disabled = false; }
    function startAuto() {
      base = readBet();
      var left = clampInt(aCount.value, 0, 1e9);
      var winPct = Math.max(0, +aWin.value || 0), lossPct = Math.max(0, +aLoss.value || 0);
      var tp = Math.max(0, +aTP.value || 0), sl = Math.max(0, +aSL.value || 0), profit = 0;
      state.running = true; startBtn.textContent = "停止"; startBtn.classList.add("is-stop"); playBtn.disabled = true;
      (function step() {
        if (!state.running) return;
        var bet = state.bet;
        if (bet > bal()) { HL.ui.toast("餘額不足，自動停止", "warn"); stopAuto(); return; }
        Promise.resolve(settle(bet, opts.playRound(bet, { turbo: turbo.checked }))).then(function (s) {
          if (!state.running) return; // 動畫期間被停止
          profit += s.net;
          state.bet = s.net >= 0
            ? (winPct ? Math.max(1, Math.round(bet * (1 + winPct / 100))) : base)
            : (lossPct ? Math.max(1, Math.round(bet * (1 + lossPct / 100))) : base);
          input.value = String(state.bet);
          if (left > 0 && --left === 0) { stopAuto(); return; }
          if (tp && profit >= tp) { HL.ui.toast("已達止盈 +" + money(profit), "ok"); stopAuto(); return; }
          if (sl && -profit >= sl) { HL.ui.toast("已達止損 " + money(profit), "warn"); stopAuto(); return; }
          timer = setTimeout(step, turbo.checked ? 110 : 470);
        });
      })();
    }
    startBtn.addEventListener("click", function () { state.running ? stopAuto() : startAuto(); });

    var panel = el("div", { class: "ax-inst__panel" }, [
      amountRow,
      el("div", { class: "ax-inst__tabs" }, [tabM, tabA]),
      manualWrap, autoWrap, lastEl
    ]);
    return { node: panel, getBet: function () { return state.bet; }, stop: stopAuto };
  }

  // 獨立「下注金額欄」(輸入 + ½ / 2× / Max)，給互動式遊戲(Crash/Mines)自帶回合流程時重用。
  function amountField(initial) {
    var input = el("input", { type: "number", min: "1", value: String(clampInt(initial || 50, 1, 9e9)), class: "ax-inst__bet" });
    function get() { return clampInt(input.value, 1, 9e9); }
    function set(v) { input.value = String(clampInt(v, 1, 9e9)); }
    function chip(t, fn) { return el("button", { class: "ax-inst__chip", text: t, onClick: fn }); }
    var node = el("div", { class: "ax-inst__row" }, [
      el("small", { class: "ax-muted", text: "下注金額" }),
      el("div", { class: "ax-inst__amt" }, [
        input,
        chip("½", function () { set(Math.max(1, Math.floor(get() / 2))); }),
        chip("2×", function () { set(get() * 2); }),
        chip("Max", function () { set(bal()); })
      ])
    ]);
    return { node: node, get: get, set: set, input: input };
  }

  // 共用數值動畫（count-up）：from→to，回傳 Promise（動畫完成 resolve）。easeOutCubic 預設。
  function animate(from, to, ms, onFrame, easing) {
    easing = easing || function (p) { return 1 - Math.pow(1 - p, 3); };
    return new Promise(function (resolve) {
      if (ms <= 0) { onFrame(to, 1); resolve(to); return; }
      var start = null;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / ms);
        onFrame(from + (to - from) * easing(p), p);
        if (p < 1) requestAnimationFrame(frame); else resolve(to);
      }
      requestAnimationFrame(frame);
    });
  }

  HL.instant = { bal: bal, setBal: setBal, betPanel: betPanel, amountField: amountField, clampInt: clampInt, animate: animate };
})(window);

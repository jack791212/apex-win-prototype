/*
 * Apex Win｜即時遊戲：Keno 賓果彩（選號開獎類，與互動回合類 Towers/Hilo 互補）
 * 機制（對標 Duelbits/Roobet Keno、經典 80 球）：8×10 號碼盤（1–80）選 1–10 個號，開 20 球，
 *   依命中數查倍數表派彩。倍數表**由超幾何分佈於載入時精算**：p(k|n)=C(n,k)C(80−n,20−k)/C(80,20)
 *   （以對數和計算避免 C(80,20)≈3.5e18 溢位），付 k≥門檻、權重 5^(k−t)，整體縮放至 EV＝精確 EDGE(0.99)。
 *   派彩 floor(bet×mult)（floor 而非 round：小注時 round 會反轉 edge，#27 審查教訓）。
 * 開獎＝一球一注 HL.fair.float("keno")：第 i 球 = 剩餘池 floor(f×(80−i)) ＝逐球可驗證重算。
 * 房規：同步結算（按開獎即抽球+入帳+record），逐球揭曉動畫僅呈現，中途離場不漏帳。
 * 以 register 新增 originals 可玩卡（id: keno）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var EDGE = 0.99, POOL = 80, BALLS = 20, MAX_PICK = 10;
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return (HL.fair && HL.fair.float) ? HL.fair.float("keno") : Math.random(); }
  // 顯示用倍數＝無條件捨去到 2 位小數：賠付表絕不高報實付（實付 = floor(bet×全精度 mult)）
  function fmtMult(m) { return (Math.floor(m * 100) / 100).toFixed(2); }

  /* ---- 倍數表：超幾何精算 + EV 縮放（載入時算一次） ---- */
  function lnC(a, b) { if (b < 0 || b > a) return -Infinity; var s = 0, i; for (i = 0; i < b; i++) s += Math.log(a - i) - Math.log(i + 1); return s; }
  function pHits(n, k) { return Math.exp(lnC(n, k) + lnC(POOL - n, BALLS - k) - lnC(POOL, BALLS)); }
  var THRESH = [0, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5]; // 各選號數的起付命中門檻
  var TABLES = [];                                 // TABLES[n][k] = 倍數（k<門檻＝0）
  (function build() {
    for (var n = 1; n <= MAX_PICK; n++) {
      var t = THRESH[n], ev = 0, k;
      for (k = t; k <= n; k++) ev += pHits(n, k) * Math.pow(5, k - t);
      var s = EDGE / ev, row = [];
      for (k = 0; k <= n; k++) row[k] = k < t ? 0 : s * Math.pow(5, k - t);
      TABLES[n] = row;
    }
  })();

  function kenoGame() {
    var picked = {}, pickCount = 0, busy = false;

    var amt = HL.instant.amountField(50);
    var hitsEl = el("b", { class: "ax-mines__mult", text: "—" });
    var multEl = el("b", { text: "—" });
    var winEl = el("b", { class: "ax-gold", text: "—" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted" }, [el("span", { text: "點選 1–10 個號碼，按「開獎」抽 20 球 🎱" })]);
    var startBtn = el("button", { class: "ax-btn-primary", text: "開獎" });
    var quickBtn = el("button", { class: "ax-btn-ghost", text: "隨機選號" });
    var clearBtn = el("button", { class: "ax-btn-ghost", text: "清除" });
    var payEl = el("div", { class: "ax-keno__pay" });
    var gridEl = el("div", { class: "ax-keno__grid" });
    var cells = [];

    for (var i = 1; i <= POOL; i++) {
      (function (num) {
        var c = el("button", { class: "ax-keno__cell", text: String(num) });
        c.addEventListener("click", function () {
          if (busy) return;
          if (picked[num]) { delete picked[num]; pickCount--; c.classList.remove("is-sel"); }
          else { if (pickCount >= MAX_PICK) { HL.ui.toast("最多選 10 個號碼", "warn"); return; } picked[num] = true; pickCount++; c.classList.add("is-sel"); }
          renderPay();
        });
        cells[num] = c; gridEl.appendChild(c);
      })(i);
    }

    function clearMarks() { cells.forEach(function (c) { if (c) { c.classList.remove("is-ball", "is-hit"); } }); }
    function clearAll() {
      if (busy) return;
      picked = {}; pickCount = 0;
      cells.forEach(function (c) { if (c) c.classList.remove("is-sel", "is-ball", "is-hit"); });
      renderPay();
    }
    function quickPick() {
      if (busy) return;
      clearAll();
      var pool = []; for (var i = 1; i <= POOL; i++) pool.push(i);
      for (var p = 0; p < 5; p++) { // 快選 5 個（Math.random 僅選號用、非開獎亂數）
        var idx = Math.floor(Math.random() * pool.length);
        var num = pool.splice(idx, 1)[0];
        picked[num] = true; pickCount++; cells[num].classList.add("is-sel");
      }
      renderPay();
    }

    // 當前選號數的賠付表（命中→倍數 chips）
    function renderPay() {
      HL.dom.clear(payEl);
      if (pickCount < 1) { payEl.appendChild(el("small", { class: "ax-muted", text: "先選號碼查看賠付表" })); return; }
      var row = TABLES[pickCount];
      for (var k = THRESH[pickCount]; k <= pickCount; k++) {
        payEl.appendChild(el("span", { class: "ax-keno__chip" }, [
          el("b", { text: k + "✕" }), document.createTextNode(" " + fmtMult(row[k]) + "×")
        ]));
      }
    }

    function record(bet, payout) { if (HL.liveStats) HL.liveStats.record("keno", bet, payout); }

    function start() {
      if (busy) return;
      if (pickCount < 1) { HL.ui.toast("請先選 1–10 個號碼", "warn"); return; }
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      busy = true; startBtn.setAttribute("disabled", "disabled");
      clearMarks();
      setBal(bal() - bet);

      // 同步抽球+結算（一球一 nonce；動畫僅呈現）
      var pool = []; for (var i = 1; i <= POOL; i++) pool.push(i);
      var balls = [];
      for (var b = 0; b < BALLS; b++) balls.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      var hits = 0;
      balls.forEach(function (num) { if (picked[num]) hits++; });
      var mult = (TABLES[pickCount][hits] || 0);
      var payout = Math.floor(bet * mult);
      if (payout > 0) setBal(bal() + payout);
      record(bet, payout);

      // 逐球揭曉（帳已同步、動畫僅呈現）；背景分頁 timer 被節流 → 直接瞬間全揭曉
      var bi = 0;
      (function reveal() {
        if (bi < balls.length) {
          var num = balls[bi++];
          var c = cells[num];
          if (c) { c.classList.add("is-ball"); if (picked[num]) c.classList.add("is-hit"); }
          hitsEl.textContent = String(countShown());
          if (global.document.hidden) { reveal(); return; } // 背景分頁：同步跑完
          global.setTimeout(reveal, 90);
          return;
        }
        hitsEl.textContent = hits + " / " + pickCount;
        multEl.textContent = mult > 0 ? (fmtMult(mult) + "×") : "0×";
        winEl.textContent = payout > 0 ? money(payout) : "—";
        HL.dom.clear(statusEl);
        if (payout > bet) { statusEl.appendChild(el("span", { text: "🎉 中獎" })); statusEl.appendChild(document.createTextNode(" " + hits + "✕ · +" + money(payout - bet))); statusEl.className = "ax-inst__last ax-green"; }
        else if (payout > 0) { statusEl.appendChild(el("span", { text: "回收" })); statusEl.appendChild(document.createTextNode(" " + hits + "✕ · " + money(payout))); statusEl.className = "ax-inst__last ax-muted"; }
        else { statusEl.appendChild(el("span", { text: "未達起付命中數" })); statusEl.className = "ax-inst__last ax-red"; }
        busy = false; startBtn.removeAttribute("disabled");
      })();
      function countShown() { var n = 0; cells.forEach(function (c) { if (c && c.classList.contains("is-hit")) n++; }); return n; }
    }

    startBtn.addEventListener("click", start);
    quickBtn.addEventListener("click", quickPick);
    clearBtn.addEventListener("click", clearAll);
    renderPay();

    function stat(l, n) { return HL.ui.stat(l, n, "ax-mines__stat"); }
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🎱 Keno 賓果彩" }),
      el("div", { class: "ax-inst__stage ax-keno" }, [
        el("div", { class: "ax-mines__top" }, [stat("命中", hitsEl), stat("倍數", multEl), stat("派彩", winEl)]),
        gridEl,
        payEl
      ]),
      amt.node,
      el("div", { class: "ax-crash__btns" }, [startBtn, quickBtn, clearBtn]),
      statusEl,
      HL.ui.gameInfoBar({ fair: "一球一注", edge: "1% 莊家優勢（各選號數精算）", note: "選 1–10 號開 20 球" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Keno 賓果彩", provider: "Apex Studio", key: "keno" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "keno", title: "Keno 賓果彩", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#4a1e6e", c2: "#1a0a2a", render: kenoGame });
  }
})(window);

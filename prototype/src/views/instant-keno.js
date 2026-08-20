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

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用 HL.keno）=====================
  var EDGE = 0.99, POOL = 80, BALLS = 20, MAX_PICK = 10;

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

  // 純結算：開 BALLS 球（無替換，一球一 rndFn()＝一球一 HL.fair nonce）→ 命中→倍數→floor 派彩。
  // 瀏覽器 start() 與 node RTP 驗證器共用同一份 → 驗的即玩的同一份數學。
  var Keno = {
    EDGE: EDGE, POOL: POOL, BALLS: BALLS, MAX_PICK: MAX_PICK, THRESH: THRESH, tables: TABLES,
    lnC: lnC, pHits: pHits,
    // 開球序列（供逐球揭曉動畫）：與 duelbits/roobet 經典 keno 相同的無替換抽 20 球
    draw: function (rndFn) {
      var pool = [], i; for (i = 1; i <= POOL; i++) pool.push(i);
      var balls = []; for (var b = 0; b < BALLS; b++) balls.push(pool.splice(Math.floor(rndFn() * pool.length), 1)[0]);
      return balls;
    },
    hitsOf: function (picks, balls) { var h = 0; for (var j = 0; j < balls.length; j++) if (picks[balls[j]]) h++; return h; },
    multOf: function (n, hits) { return (TABLES[n] && TABLES[n][hits]) || 0; },
    payoutOf: function (bet, n, hits) { return Math.floor(bet * Keno.multOf(n, hits)); } // floor＝莊家安全側（#27 審查教訓）
  };

  HL.keno = Keno;
  if (typeof module !== "undefined" && module.exports) { module.exports = { keno: Keno }; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return HL.fair.floatOr("keno"); } // T11：統一後援出口（float 語意不變）
  // 顯示用倍數＝無條件捨去到 2 位小數：賠付表絕不高報實付（實付 = floor(bet×全精度 mult)）
  function fmtMult(m) { return (Math.floor(m * 100) / 100).toFixed(2); }

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
      /* 家族「毀滅性控件」：舊版無條件 clearAll() 後固定只選 5 個 ⇒ 玩家在 10 星注型上按一下「隨機選號」，
       * 10 個選號全消失、賠付表整張換掉且無法還原（只能一格一格點回來）。改為「照目前星數重抽」。 */
      var want = pickCount > 0 ? pickCount : 5;
      clearAll();
      var pool = []; for (var i = 1; i <= POOL; i++) pool.push(i);
      for (var p = 0; p < want; p++) { // 照目前星數重抽（Math.random 僅選號用、非開獎亂數）
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
      if (HL.rg && !HL.rg.check(bet)) return;   // #86：本檔自帶下注面板(amountField，未走 betPanel) ⇒ 需自帶閘；未設限時恆真＝零回歸
      busy = true; startBtn.setAttribute("disabled", "disabled");
      clearMarks();
      /* 家族 F：新局的 1.8 秒揭曉不得掛著上一局的倍數／派彩／綠色「🎉 中獎」。 */
      hitsEl.textContent = "0 / " + pickCount; multEl.textContent = "—"; winEl.textContent = "—";
      HL.dom.clear(statusEl); statusEl.appendChild(el("span", { text: "開獎中…" })); statusEl.className = "ax-inst__last ax-muted";
      setBal(bal() - bet);

      // 同步抽球+結算（一球一 nonce；動畫僅呈現）＝走共用純數學 HL.keno（node 驗證器同一份）
      var balls = Keno.draw(rnd);
      var hits = Keno.hitsOf(picked, balls);
      var mult = Keno.multOf(pickCount, hits);
      var payout = Keno.payoutOf(bet, pickCount, hits);
      /* 家族「派彩先於揭曉」：舊版在第一顆球亮起之前就把派彩寫進餘額，而 setBal → refreshChrome →
       * 頁首錢包立刻變數字（header 與 #ax-main-content 同層、不隨換頁重建）⇒ 20 顆球那 1.8 秒毫無懸念。
       * 但**不能只是往後搬**：原本先結算是為了「背景分頁被節流也不會漏帳」。
       * 故改為 settleNow() 冪等結算 + 三個必達出口：揭曉結束、背景分頁同步跑完、換頁時立刻結清。 */
      var settled = false;
      function settleNow() { if (settled) return; settled = true; if (payout > 0) setBal(bal() + payout); record(bet, payout); }

      // 逐球揭曉；背景分頁 timer 被節流 → 直接瞬間全揭曉
      var bi = 0;
      (function reveal() {
        if (!gridEl.isConnected) { settleNow(); busy = false; return; }   // 換頁：帳一定要結，動畫不必演
        if (bi < balls.length) {
          var num = balls[bi++];
          var c = cells[num];
          if (c) { c.classList.add("is-ball"); if (picked[num]) c.classList.add("is-hit"); }
          hitsEl.textContent = String(countShown());
          if (global.document.hidden) { reveal(); return; } // 背景分頁：同步跑完
          global.setTimeout(reveal, 90);
          return;
        }
        settleNow();   // 揭曉走完才入帳＝錢包不再提前洩漏結果
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
})(typeof window !== "undefined" ? window : globalThis);

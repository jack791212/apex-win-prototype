/*
 * Apex Win｜即時遊戲：Towers 爬塔（互動式回合，重用 HL.instant 餘額/金額欄 + HL.fair 可驗證亂數）
 * 機制（對標 Stake/Roobet Tower、近 Mines）：由下往上逐層選一格，選到安全格往上一層、倍數累乘，
 *   踩到陷阱整局歸零，隨時可兌現帶走。難度決定每層格數與安全率：
 *   簡單 4 格 1 陷阱（×4/3）／普通 3 格 1 陷阱（×3/2）／困難 2 格 1 陷阱（×2）。共 8 層。
 * 開局即用 HL.fair.float("towers") 對每層各取一注（一層一 nonce）定陷阱位置＝逐層可驗證重算。
 * 以 register 新增 originals 可玩卡（id: towers）。1% 莊家優勢。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var EDGE = 0.99, ROWS = 8;
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return (HL.fair && HL.fair.float) ? HL.fair.float("towers") : Math.random(); }

  // 難度：tiles=每層格數、safe=安全格數（陷阱數 = tiles-safe，固定 1）
  var DIFFS = [
    { key: "easy", label: "簡單", tiles: 4, safe: 3 },
    { key: "med", label: "普通", tiles: 3, safe: 2 },
    { key: "hard", label: "困難", tiles: 2, safe: 1 }
  ];

  function towersGame() {
    var diff = DIFFS[1];                 // 預設普通
    var active = false, roundBet = 0, cur = 0, trap = [], rowEls = [];

    var amt = HL.instant.amountField(50);
    var multEl = el("b", { class: "ax-mines__mult", text: "1.00×" });
    var nextEl = el("b", {});
    var winEl = el("b", { class: "ax-gold", text: "—" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "選難度、按「開始」，逐層往上爬，隨時兌現 🗼" });
    var startBtn = el("button", { class: "ax-btn-primary", text: "開始" });
    var cashBtn = el("button", { class: "ax-btn-primary ax-crash__cash", text: "兌現", disabled: "disabled" });
    var towerEl = el("div", { class: "ax-tower__grid" });

    // 倍數：清 k 層 = EDGE × (tiles/safe)^k
    function fairMult(k) { return EDGE * Math.pow(diff.tiles / diff.safe, k); }
    function potWin() { return Math.floor(roundBet * fairMult(cur)); } // floor 而非 round：小注時 round 會反轉 1% edge（bet 2 easy × 1.32 → 3 ＝玩家正 EV 可刷），floor 保證 edge 恆 ≥1%（#27 審查發現的同族漏洞）
    function record(payout) { if (HL.liveStats) HL.liveStats.record("towers", roundBet, payout); }
    function refreshMult() {
      multEl.textContent = fairMult(cur).toFixed(2) + "×";
      nextEl.textContent = active ? (fairMult(cur + 1).toFixed(2) + "×") : (fairMult(1).toFixed(2) + "×");
      winEl.textContent = active ? money(potWin()) : "—";
      multEl.classList.remove("bump"); void multEl.offsetWidth; multEl.classList.add("bump");
    }

    // 建塔（上層在上、第 0 層在下）；每層 tiles 格
    function buildTower() {
      HL.dom.clear(towerEl); rowEls = [];
      for (var r = ROWS - 1; r >= 0; r--) {
        var cells = [], rowNode = el("div", { class: "ax-tower__row" });
        for (var t = 0; t < diff.tiles; t++) {
          (function (rr, tt) {
            var c = el("div", { class: "ax-tower__cell", onClick: function () { pick(rr, tt); } });
            cells.push(c); rowNode.appendChild(c);
          })(r, t);
        }
        rowEls[r] = { node: rowNode, cells: cells };
        towerEl.appendChild(rowNode);
      }
    }
    function markRows() {
      for (var r = 0; r < ROWS; r++) {
        var ro = rowEls[r]; if (!ro) continue;
        ro.node.classList.toggle("is-cur", active && r === cur);
        ro.node.classList.toggle("is-pending", active && r > cur);
        ro.node.classList.toggle("is-done", active && r < cur);
      }
    }
    function revealTraps() {
      for (var r = 0; r < ROWS; r++) {
        var ro = rowEls[r]; if (!ro) continue;
        var tp = trap[r];
        if (ro.cells[tp] && !ro.cells[tp].classList.contains("is-open")) { ro.cells[tp].textContent = "💥"; ro.cells[tp].classList.add("is-trap"); }
      }
    }
    function endLock() { active = false; cashBtn.disabled = true; startBtn.disabled = false; markRows(); }

    function pick(r, t) {
      if (!active || r !== cur) return;
      var ro = rowEls[r]; if (!ro || ro.cells[t].classList.contains("is-open") || ro.cells[t].classList.contains("is-trap")) return;
      if (t === trap[r]) {                 // 踩到陷阱
        ro.cells[t].classList.add("is-open", "is-trap", "is-boom"); ro.cells[t].textContent = "💥";
        towerEl.classList.add("shake"); setTimeout(function () { towerEl.classList.remove("shake"); }, 400);
        statusEl.textContent = "💥 踩到陷阱，這局結束（第 " + (r + 1) + " 層）"; statusEl.className = "ax-inst__last ax-red";
        record(0); revealTraps(); endLock(); winEl.textContent = "—"; return;
      }
      ro.cells[t].classList.add("is-open", "is-flip"); ro.cells[t].textContent = "💎";
      // 該層其餘格鎖住
      ro.cells.forEach(function (c, i) { if (i !== t) c.classList.add("is-dim"); });
      cur++; refreshMult(); markRows();
      if (cur === ROWS) {                  // 登頂自動兌現
        statusEl.textContent = "🏆 登頂！"; cashOut(); return;
      }
      statusEl.textContent = "已上第 " + cur + " 層，可繼續或兌現"; statusEl.className = "ax-inst__last ax-muted";
    }

    function start() {
      if (active) return;
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      setBal(bal() - bet); roundBet = bet; cur = 0; active = true;
      trap = []; for (var r = 0; r < ROWS; r++) trap[r] = Math.floor(rnd() * diff.tiles); // 一層一 nonce（可驗證）
      buildTower(); refreshMult(); markRows();
      cashBtn.disabled = false; startBtn.disabled = true;
      statusEl.textContent = "從最底層往上爬，選對的格子累乘倍數"; statusEl.className = "ax-inst__last ax-muted";
    }
    function cashOut() {
      if (!active) return;
      if (cur === 0) { HL.ui.toast("至少爬一層再兌現", "warn"); return; }
      var payout = potWin(); setBal(bal() + payout); record(payout);
      statusEl.textContent = "兌現 " + fairMult(cur).toFixed(2) + "× 　贏 +" + money(payout - roundBet); statusEl.className = "ax-inst__last ax-green";
      towerEl.classList.add("is-win"); revealTraps(); endLock();
    }

    // 難度選擇（未開局時可切換；S7 收斂為共用 HL.ui.segmented，外觀沿用 ax-inst__chip）
    var diffSel = HL.ui.segmented(DIFFS.map(function (d) { return { v: d.key, t: d.label }; }), diff.key, function (v) {
      if (active) return false;
      diff = DIFFS.filter(function (d) { return d.key === v; })[0];
      buildTower(); refreshMult();
    }, { cls: "ax-inst__amt", btnCls: "ax-inst__chip", activeCls: "is-active" });

    buildTower();
    startBtn.addEventListener("click", start);
    cashBtn.addEventListener("click", cashOut);
    refreshMult();

    function stat(l, n) { return el("div", { class: "ax-mines__stat" }, [el("small", { class: "ax-muted", text: l }), n]); }
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🗼 Towers 爬塔" }),
      el("div", { class: "ax-inst__stage ax-tower" }, [
        el("div", { class: "ax-mines__top" }, [stat("目前", multEl), stat("下一層", nextEl), stat("可贏", winEl)]),
        towerEl
      ]),
      amt.node,
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "難度" }), diffSel]),
      el("div", { class: "ax-crash__btns" }, [startBtn, cashBtn]),
      statusEl,
      HL.ui.gameInfoBar({ fair: "一層一注", edge: "1% 莊家優勢", note: "逐層爬升累乘，踩陷阱歸零" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Towers 爬塔", provider: "Apex Studio", key: "towers" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "towers", title: "Towers 爬塔", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e4a1e", c2: "#2a1a0a", render: towersGame });
  }
})(window);

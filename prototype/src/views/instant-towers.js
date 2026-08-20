/*
 * Apex Win｜即時遊戲：Towers 爬塔（互動式回合，重用 HL.instant 餘額/金額欄 + HL.fair 可驗證亂數）
 * 機制（對標 Stake/Roobet Tower、近 Mines）：由下往上逐層選一格，選到安全格往上一層、倍數累乘，
 *   踩到陷阱整局歸零，隨時可兌現帶走。難度決定每層格數與安全率：
 *   簡單 4 格 1 陷阱（×4/3）／普通 3 格 1 陷阱（×3/2）／困難 2 格 1 陷阱（×2）。共 8 層。
 * 開局即用 HL.fair.float("towers") 對每層各取一注（一層一 nonce）定陷阱位置＝逐層可驗證重算。
 * 以 register 新增 originals 可玩卡（id: towers）。1% 莊家優勢。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學（HL.towers）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var EDGE = 0.99, ROWS = 8; // 1% 莊家優勢、共 8 層

  // 難度：tiles=每層格數、safe=安全格數（陷阱數 = tiles-safe，固定 1）
  var DIFFS = [
    { key: "easy", label: "簡單", tiles: 4, safe: 3 },
    { key: "med", label: "普通", tiles: 3, safe: 2 },
    { key: "hard", label: "困難", tiles: 2, safe: 1 }
  ];

  // 倍數：清 k 層 = EDGE × (tiles/safe)^k；存活到第 k 層機率 = (safe/tiles)^k。
  // ⇒ 任一難度、任一兌現目標層 k：RTP(k)=pReach(k)·fairMult(k)=(S/T)^k·EDGE·(T/S)^k=EDGE（與 k、難度皆無關，零抽樣誤差）。
  //   兌現值 potWin=floor(bet·fairMult) ≤ bet·fairMult ⇒ 實際 RTP ≤ EDGE（確定性上界，<95% 或 >100% 皆數學排除）。
  var Towers = {
    edge: EDGE, rows: ROWS, DIFFS: DIFFS,
    diffOf: function (key) { for (var i = 0; i < DIFFS.length; i++) if (DIFFS[i].key === key) return DIFFS[i]; return DIFFS[1]; },
    fairMult: function (k, diff) { return EDGE * Math.pow(diff.tiles / diff.safe, k); },
    potWin: function (bet, k, diff) { return Math.floor(bet * Towers.fairMult(k, diff)); }, // floor 而非 round：小注時 round 會反轉 1% edge（bet 2 easy × 1.32 → 3 ＝玩家正 EV 可刷），floor 保證 edge 恆 ≥1%（#27 審查發現的同族漏洞）
    pReach: function (k, diff) { return Math.pow(diff.safe / diff.tiles, k); },            // 存活到第 k 層機率
    trapOf: function (f, diff) { return Math.floor(f * diff.tiles); }                       // 一層一浮點 → 陷阱格位置（可事後重算）
  };

  HL.towers = Towers;
  if (typeof module !== "undefined" && module.exports) { module.exports = { towers: Towers }; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return HL.fair.floatOr("towers"); } // T11：統一後援出口（float 語意不變）

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

    // 倍數/彩金委派純數學區 Towers（＝node 驗證器 require 的同一份），render 只負責顯示
    function fairMult(k) { return Towers.fairMult(k, diff); }
    function potWin() { return Towers.potWin(roundBet, cur, diff); }
    function record(payout) { if (HL.liveStats) HL.liveStats.record("towers", roundBet, payout); }
    function refreshMult() {
      multEl.textContent = fairMult(cur).toFixed(2) + "×";
      nextEl.textContent = !active ? (fairMult(1).toFixed(2) + "×") : (cur + 1 <= ROWS ? (fairMult(cur + 1).toFixed(2) + "×") : "—");
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
            var c = HL.dom.pressable(el("div", { class: "ax-tower__cell", onClick: function () { pick(rr, tt); } }));
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
    function endLock() { active = false; cashBtn.disabled = true; startBtn.disabled = false; markRows(); refreshMult(); }

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
      cur++; cashBtn.disabled = false; refreshMult(); markRows();   // 有東西可兌現了才解鎖
      if (cur === ROWS) {                  // 登頂自動兌現
        cashOut(true); return;   // 家族 F：高潮文字原本在同一 task 內被 cashOut 覆寫＝死碼，最高張力點的回饋與「爬一層就兌現」完全一樣
      }
      statusEl.textContent = "已上第 " + cur + " 層，可繼續或兌現"; statusEl.className = "ax-inst__last ax-muted";
    }

    function start() {
      if (active) return;
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      if (HL.rg && !HL.rg.check(bet)) return;   // #86：本檔自帶下注面板(amountField，未走 betPanel) ⇒ 需自帶閘；未設限時恆真＝零回歸
      setBal(bal() - bet); roundBet = bet; cur = 0; active = true;
      trap = []; for (var r = 0; r < ROWS; r++) trap[r] = Towers.trapOf(rnd(), diff); // 一層一 nonce（可驗證）
      towerEl.classList.remove("is-win");   // 家族「殘留視覺」：勝利光環只 add 從不 remove ⇒ 之後每一局（含輸局）整座塔都亮綠
      buildTower(); refreshMult(); markRows();
      cashBtn.disabled = true; startBtn.disabled = true;   // 家族「說謊的控件」：此刻按下去 100% 被拒並吐 warn toast ⇒ 別先亮成可按的主 CTA
      statusEl.textContent = "從最底層往上爬，選對的格子累乘倍數"; statusEl.className = "ax-inst__last ax-muted";
    }
    function cashOut(summit) {
      if (!active) return;
      if (cur === 0) { HL.ui.toast("至少爬一層再兌現", "warn"); return; }
      var payout = potWin(); setBal(bal() + payout); record(payout);
      statusEl.textContent = (summit ? "🏆 登頂！　" : "") + "兌現 " + fairMult(cur).toFixed(2) + "× 　贏 +" + money(payout - roundBet); statusEl.className = "ax-inst__last ax-green";
      towerEl.classList.add("is-win"); revealTraps(); endLock();
    }

    // 難度選擇（未開局時可切換；S7 收斂為共用 HL.ui.segmented，外觀沿用 ax-inst__chip）
    var diffSel = HL.ui.segmented(DIFFS.map(function (d) { return { v: d.key, t: d.label }; }), diff.key, function (v) {
      if (active) return false;
      diff = Towers.diffOf(v);
      buildTower(); refreshMult();
    }, { cls: "ax-inst__amt", btnCls: "ax-inst__chip", activeCls: "is-active" });

    buildTower();
    startBtn.addEventListener("click", start);
    cashBtn.addEventListener("click", function () { cashOut(); });   // ⚠️ 不可直接把 cashOut 當 listener：click 會把 MouseEvent 當成第一個參數傳進去
    refreshMult();

    function stat(l, n) { return HL.ui.stat(l, n, "ax-mines__stat"); }
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

  HL.games.register({ id: "towers", title: "Towers 爬塔", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e4a1e", c2: "#2a1a0a", render: towersGame });
})(typeof window !== "undefined" ? window : this);

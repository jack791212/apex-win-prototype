/*
 * Apex Win｜即時遊戲：Moles 打地鼠（互動式回合，重用 HL.instant 餘額/金額欄 + HL.fair 可驗證亂數）
 * 機制（對標 Stake Originals「Moles」）：7 個洞，玩家先選 M∈{1..6} 顆地鼠決定波動（地鼠愈多愈好中、波動愈低）。
 *   每一步敲一個洞：命中地鼠 → 乘數累乘、可繼續或兌現；空洞 → 回合結束、輸掉本金。
 *   **無版面消耗（no depletion）**＝每一步都是獨立試驗、命中機率恆為 p = M/7；最多 8 次命中（達 8 強制兌現）。
 * 付款律（策略無關、精確 98%）：兌現於第 k 次命中的乘數 = EDGE·(7/M)^k、存活到第 k 步機率 = (M/7)^k
 *   ⇒ ∀(M,k)：RTP = (M/7)^k · EDGE·(7/M)^k = EDGE = 0.98（零抽樣誤差，見 games-catalog spec_proof）。
 * 可驗證公平：每一步用 HL.fair.floatOr("moles") 取一浮點（serverSeed 開局承諾、nonce 每步遞增），
 *   由浮點導出「本步地鼠所在的 M 個洞」（旋轉區塊 × 固定洗牌排列，對每個洞 P=M/7、可事後重算），
 *   玩家點的洞是否落在其中＝命中/落空。禁用 Math.random。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學（HL.moles）。
 * 家族＝Towers/fixed-p-per-step（幾何累積可兌現）；唯二新形制：連續 6 級波動選擇器 + whack-a-mole 主題。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var EDGE = 0.98, HOLES = 7, MAX_HITS = 8;   // 2% 莊家優勢、7 個洞、最多 8 次命中
  var MOLE_RANGE = [1, 2, 3, 4, 5, 6];        // 可選地鼠數（波動選擇器）
  // 固定洗牌排列：讓「旋轉連續區塊」映射到分散的實體洞位（雙射 ⇒ 每洞命中機率仍精確 M/7）
  var SCRAMBLE = [0, 3, 6, 2, 5, 1, 4];

  // 兌現於第 k 次命中的乘數 = EDGE·(7/M)^k；存活到第 k 步機率 = (M/7)^k。
  // ⇒ 任一 M、任一兌現目標 k：RTP(M,k) = pReach·fairMult = (M/7)^k·EDGE·(7/M)^k = EDGE（與 M、策略皆無關，零抽樣誤差）。
  //   兌現值 potWin = floor(bet·fairMult) ≤ bet·fairMult ⇒ 實際 RTP ≤ EDGE（確定性上界，>100% 數學排除）。
  var Moles = {
    edge: EDGE, holes: HOLES, maxHits: MAX_HITS, molesRange: MOLE_RANGE,
    clampMoles: function (M) { var n = Math.round(+M); if (!isFinite(n)) n = 3; return n < 1 ? 1 : (n > 6 ? 6 : n); }, // 注意：不可用 `+M||3`——0 是 falsy 會被誤導成 3（out-of-range 應夾到 1）
    pOf: function (M) { return M / HOLES; },                                   // 每步命中機率
    fairMult: function (M, k) { return EDGE * Math.pow(HOLES / M, k); },       // 第 k 次命中的兌現乘數
    potWin: function (bet, M, k) { return Math.floor(bet * Moles.fairMult(M, k)); }, // floor：小注時 round 會反轉 edge（同 Towers #27 家族）
    pReach: function (M, k) { return Math.pow(M / HOLES, k); },                // 存活到第 k 步機率
    // 本步地鼠所在的 M 個洞：r=floor(f·7) 起、連續區塊，經 SCRAMBLE 打散（對任一固定洞位 P=M/7、可事後重算）
    moleSet: function (f, M) {
      var r = Math.floor(f * HOLES); if (r >= HOLES) r = HOLES - 1; if (r < 0) r = 0;
      var set = []; for (var i = 0; i < M; i++) set.push(SCRAMBLE[(r + i) % HOLES]);
      return set;
    },
    isHit: function (f, M, hole) { return Moles.moleSet(f, M).indexOf(hole) >= 0; }
  };

  HL.moles = Moles;
  if (typeof module !== "undefined" && module.exports) { module.exports = { moles: Moles }; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return HL.fair.floatOr("moles"); } // 統一後援出口（float 語意不變）

  function molesGame() {
    var M = 3;                              // 預設 3 顆地鼠
    var active = false, roundBet = 0, hits = 0, stepLock = false, holeEls = [];

    var amt = HL.instant.amountField(50);
    var multEl = el("b", { class: "ax-mines__mult", text: "1.00×" });
    var nextEl = el("b", {});
    var hitsEl = el("b", {});
    var winEl = el("b", { class: "ax-gold", text: "—" });
    var hintEl = el("small", { class: "ax-muted" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "選地鼠數（調波動）、按「開始」，逐洞敲擊，隨時兌現 🕳️" });
    var startBtn = el("button", { class: "ax-btn-primary", text: "開始" });
    var cashBtn = el("button", { class: "ax-btn-primary ax-crash__cash", text: "兌現", disabled: "disabled" });
    var boardEl = el("div", { class: "ax-moles__board" });

    // 倍數/彩金委派純數學區 Moles（＝node 驗證器 require 的同一份），render 只負責顯示
    function fairMult(k) { return Moles.fairMult(M, k); }
    function potWin() { return Moles.potWin(roundBet, M, hits); }
    function record(payout) { if (HL.liveStats) HL.liveStats.record("moles", roundBet, payout); }
    function refreshHint() {
      hintEl.textContent = "地鼠 " + M + " / " + HOLES + "　命中率 " + Math.round(Moles.pOf(M) * 100) + "%　每步 ×" + (HOLES / M).toFixed(2);
    }
    function refreshMult() {
      multEl.textContent = (hits >= 1 ? fairMult(hits).toFixed(2) : "1.00") + "×";
      nextEl.textContent = hits < MAX_HITS ? (fairMult(hits + 1).toFixed(2) + "×") : "—";
      hitsEl.textContent = hits + " / " + MAX_HITS;
      winEl.textContent = (active && hits >= 1) ? money(potWin()) : "—";
      multEl.classList.remove("bump"); void multEl.offsetWidth; multEl.classList.add("bump");
    }

    function buildBoard() {
      HL.dom.clear(boardEl); holeEls = [];
      for (var h = 0; h < HOLES; h++) {
        (function (hh) {
          var c = HL.dom.pressable(el("div", { class: "ax-moles__hole", onClick: function () { pick(hh); } }));
          holeEls.push(c); boardEl.appendChild(c);
        })(h);
      }
    }
    function resetHoles() {
      holeEls.forEach(function (c) { c.className = "ax-moles__hole"; c.textContent = ""; });
    }
    function endLock() { active = false; stepLock = false; cashBtn.disabled = true; startBtn.disabled = false; refreshMult(); }

    function pick(hole) {
      if (!active || stepLock) return;
      var f = rnd();
      var set = Moles.moleSet(f, M);
      if (set.indexOf(hole) >= 0) {           // 命中地鼠
        holeEls[hole].classList.add("is-hit", "is-flip"); holeEls[hole].textContent = "🦔";
        hits++; cashBtn.disabled = false; refreshMult();  // 有東西可兌現了才解鎖（家族「說謊的控件」）
        if (hits === MAX_HITS) { cashOut(true); return; } // 達上限自動兌現
        statusEl.textContent = "命中第 " + hits + " 隻，可繼續或兌現"; statusEl.className = "ax-inst__last ax-green";
        stepLock = true;                        // 敲下一洞前鎖住，重整版面（無版面消耗＝新一步全新獨立試驗）
        setTimeout(function () { if (active) { resetHoles(); stepLock = false; } }, 520);
      } else {                                  // 空洞：回合結束
        set.forEach(function (mh) { if (mh !== hole && holeEls[mh]) { holeEls[mh].classList.add("is-mole"); holeEls[mh].textContent = "🦔"; } });
        holeEls[hole].classList.add("is-boom"); holeEls[hole].textContent = "💥";
        boardEl.classList.add("shake"); setTimeout(function () { boardEl.classList.remove("shake"); }, 400);
        statusEl.textContent = "💥 空洞！這局結束（已命中 " + hits + " 隻）"; statusEl.className = "ax-inst__last ax-red";
        record(0); winEl.textContent = "—"; endLock();
      }
    }

    function start() {
      if (active) return;
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      if (HL.rg && !HL.rg.check(bet)) return;   // #86：自帶下注面板 ⇒ 需自帶下注前限額閘；未設限時恆真＝零回歸
      setBal(bal() - bet); roundBet = bet; hits = 0; active = true; stepLock = false;
      boardEl.classList.remove("is-win");        // 家族「殘留視覺」：勝利光環只 add 從不 remove ⇒ 之後每局都亮綠
      buildBoard(); refreshMult();
      cashBtn.disabled = true; startBtn.disabled = true;  // 家族「說謊的控件」：此刻按兌現 100% 被拒
      statusEl.textContent = "敲一個洞——命中地鼠累乘倍數、空洞歸零"; statusEl.className = "ax-inst__last ax-muted";
    }
    function cashOut(summit) {
      if (!active) return;
      if (hits === 0) { HL.ui.toast("至少命中一隻再兌現", "warn"); return; }
      var payout = potWin(); setBal(bal() + payout); record(payout);
      statusEl.textContent = (summit ? "🏆 滿命中！　" : "") + "兌現 " + fairMult(hits).toFixed(2) + "× 　贏 +" + money(payout - roundBet); statusEl.className = "ax-inst__last ax-green";
      boardEl.classList.add("is-win"); endLock();
    }

    // 地鼠數選擇（＝波動選擇器；未開局時可切換）
    var moleSel = HL.ui.segmented(MOLE_RANGE.map(function (n) { return { v: String(n), t: String(n) }; }), String(M), function (v) {
      if (active) return false;
      M = Moles.clampMoles(v);
      refreshHint(); refreshMult();
    }, { cls: "ax-inst__amt", btnCls: "ax-inst__chip", activeCls: "is-active" });

    buildBoard(); refreshHint();
    startBtn.addEventListener("click", start);
    cashBtn.addEventListener("click", function () { cashOut(); });   // ⚠️ 不可直接把 cashOut 當 listener：click 會把 MouseEvent 當第一個參數傳進去
    refreshMult();

    function stat(l, n) { return HL.ui.stat(l, n, "ax-mines__stat"); }
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🕳️ Moles 打地鼠" }),
      el("div", { class: "ax-inst__stage ax-moles" }, [
        el("div", { class: "ax-mines__top" }, [stat("目前", multEl), stat("下一擊", nextEl), stat("命中", hitsEl), stat("可贏", winEl)]),
        boardEl
      ]),
      amt.node,
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "地鼠數" }), moleSel]),
      el("div", { class: "ax-inst__row" }, [hintEl]),
      el("div", { class: "ax-crash__btns" }, [startBtn, cashBtn]),
      statusEl,
      HL.ui.gameInfoBar({ fair: "每步一注", edge: "2% 莊家優勢", note: "選地鼠數調波動，逐洞敲擊累乘，隨時兌現" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Moles 打地鼠", provider: "Apex Studio", key: "moles" }) : node;
  }

  HL.games.register({ id: "moles", title: "Moles 打地鼠", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#3f6e1e", c2: "#16290a", render: molesGame });
})(typeof window !== "undefined" ? window : this);

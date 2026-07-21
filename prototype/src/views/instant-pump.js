/*
 * Apex Win｜即時遊戲：Pump 打氣（互動式 cash-or-continue，重用 HL.instant 餘額/金額欄 + HL.fair 可驗證亂數）
 * 機制（對標 Stake 2026 Original「Pump」）：對氣球逐次打氣，每次成功倍數↑、爆裂機率↑，隨時可兌現；
 *   打到尖刺則氣球爆裂、整局歸零。ApexWin 互動回合家族（Crash/Mines/Towers/Hilo）獨缺的一款。
 * 模型（hypergeometric，同 Mines）：每難度定 slots=25 槽、spikes 隱藏尖刺數。開局以 HL.fair.floatOr("pump")
 *   逐一預抽 spikes 個尖刺位置（一尖刺一 nonce＝逐步可驗證，同 Mines）。逐次揭示 0..slots-1：
 *   安全→存活、倍數累乘；遇尖刺→爆裂。剩餘安全槽遞減＝爆裂率逐次上升。
 * 公平倍數 mult(k) = EDGE × Π_{i<k} (slots-i)/(slots-spikes-i) ＝存活累積機率倒數（Mines/Towers 同原理）。
 *   最大倍數 = EDGE × C(slots, spikes)：Expert(25,10)=0.98×3,268,760=3,203,384.8×（恰為 Stake 標稱值）。
 *   EDGE=0.98（2% 莊家優勢，高於 Dice 家族 1%）；floor 派彩防小注反轉 edge（同 Towers）。
 *   EV 在任一狀態皆為 martingale＝不論何時兌現 edge 恆 2%。
 * 以 register 新增 originals 可玩卡（id: pump）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var EDGE = 0.98, SLOTS = 25;
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return HL.fair.floatOr("pump"); } // 統一後援出口（float 語意不變）

  // 難度：spikes=隱藏尖刺數（越多＝爆裂快、變異大、天花板高）。max 倍數 = EDGE × C(25, spikes)。
  var DIFFS = [
    { key: "easy", label: "簡單", spikes: 1 },   // max 24.5×
    { key: "med", label: "普通", spikes: 3 },     // max 2,254×
    { key: "hard", label: "困難", spikes: 5 },    // max 52,067×
    { key: "expert", label: "專家", spikes: 10 }  // max 3,203,384.8×
  ];

  function pumpGame() {
    var diff = DIFFS[1];                 // 預設普通
    var active = false, roundBet = 0, cur = 0, bomb = {}, maxSafe = 0;

    var amt = HL.instant.amountField(50);
    var balloonEl = el("div", { class: "ax-pump__balloon", text: "🎈" });
    var multEl = el("b", { class: "ax-mines__mult", text: "1.00×" });
    var nextEl = el("b", {});
    var winEl = el("b", { class: "ax-gold", text: "—" });
    var riskEl = el("b", {});
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "選難度、按「開始」，逐次打氣衝倍數，隨時兌現 🎈" });
    var startBtn = el("button", { class: "ax-btn-primary", text: "開始" });
    var pumpBtn = el("button", { class: "ax-btn-primary ax-pump__go", text: "打氣 +", disabled: "disabled" });
    var cashBtn = el("button", { class: "ax-btn-primary ax-crash__cash", text: "兌現", disabled: "disabled" });

    // 倍數：mult(k) = EDGE × Π_{i<k} (SLOTS-i)/(SLOTS-spikes-i)
    function fairMult(k) { var m = EDGE; for (var i = 0; i < k; i++) m *= (SLOTS - i) / (SLOTS - diff.spikes - i); return m; }
    function potWin() { return Math.floor(roundBet * fairMult(cur)); } // floor（同 Towers L40：round 會反轉小注 edge）
    function survPct(k) { return ((SLOTS - diff.spikes - k) / (SLOTS - k)) * 100; } // 下一次打氣成功率（剩餘安全/剩餘）
    function record(payout) { if (HL.liveStats) HL.liveStats.record("pump", roundBet, payout); }
    function fmtMult(m) { return m >= 1000 ? Math.round(m).toLocaleString("en-US") + "×" : m.toFixed(2) + "×"; }

    function refreshHUD() {
      multEl.textContent = fairMult(cur).toFixed(2) + "×";
      nextEl.textContent = active && cur < maxSafe ? fmtMult(fairMult(cur + 1)) : (active ? "極限" : fmtMult(fairMult(1)));
      winEl.textContent = active ? money(potWin()) : "—";
      riskEl.textContent = active && cur < maxSafe ? (100 - survPct(cur)).toFixed(1) + "%" : (active ? "—" : (100 - survPct(0)).toFixed(1) + "%");
      riskEl.className = active ? ((100 - survPct(cur)) >= 50 ? "ax-red" : "") : "";
      var scale = 1 + Math.min(cur, 16) * 0.062;         // 氣球隨打氣脹大（視覺上限）
      balloonEl.style.transform = "scale(" + scale.toFixed(3) + ")";
      multEl.classList.remove("bump"); void multEl.offsetWidth; multEl.classList.add("bump");
    }

    function endLock() { active = false; pumpBtn.disabled = true; cashBtn.disabled = true; startBtn.disabled = false; }

    function pump() {
      if (!active) return;
      if (bomb[cur]) {                    // 打到尖刺＝爆裂
        balloonEl.textContent = "💥"; balloonEl.classList.add("is-pop");
        statusEl.textContent = "💥 爆了！這局結束（第 " + (cur + 1) + " 次打氣）"; statusEl.className = "ax-inst__last ax-red";
        record(0); endLock(); winEl.textContent = "—"; return;
      }
      cur++; refreshHUD();
      if (cur >= maxSafe) {               // 撐到極限（安全槽用盡）＝自動兌現最大倍數
        statusEl.textContent = "🎈 撐到極限！"; cashOut(); return;
      }
      statusEl.textContent = "第 " + cur + " 次打氣成功，可繼續或兌現"; statusEl.className = "ax-inst__last ax-muted";
    }

    function start() {
      if (active) return;
      var bet = amt.get(); if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      setBal(bal() - bet); roundBet = bet; cur = 0; active = true;
      maxSafe = SLOTS - diff.spikes;
      bomb = {}; var placed = 0; while (placed < diff.spikes) { var p = Math.floor(rnd() * SLOTS); if (!bomb[p]) { bomb[p] = 1; placed++; } } // 一尖刺一 nonce（可驗證）
      balloonEl.textContent = "🎈"; balloonEl.classList.remove("is-pop");
      refreshHUD();
      pumpBtn.disabled = false; cashBtn.disabled = false; startBtn.disabled = true;
      statusEl.textContent = "打氣衝倍數；爆裂機率逐次上升，見好就收"; statusEl.className = "ax-inst__last ax-muted";
    }
    function cashOut() {
      if (!active) return;
      if (cur === 0) { HL.ui.toast("至少打一次氣再兌現", "warn"); return; }
      var payout = potWin(); setBal(bal() + payout); record(payout);
      statusEl.textContent = "兌現 " + fairMult(cur).toFixed(2) + "×　贏 +" + money(payout - roundBet); statusEl.className = "ax-inst__last ax-green";
      balloonEl.classList.add("is-win"); endLock();
      setTimeout(function () { balloonEl.classList.remove("is-win"); }, 700);
    }

    // 難度選擇（未開局才可切換；S7 共用 HL.ui.segmented，外觀沿用 ax-inst__chip）
    var diffSel = HL.ui.segmented(DIFFS.map(function (d) { return { v: d.key, t: d.label }; }), diff.key, function (v) {
      if (active) return false;
      diff = DIFFS.filter(function (d) { return d.key === v; })[0];
      refreshHUD();
    }, { cls: "ax-inst__amt", btnCls: "ax-inst__chip", activeCls: "is-active" });

    // hover 打氣鈕：預覽下一步倍數 + 成功機率（規格點）
    pumpBtn.addEventListener("mouseenter", function () {
      if (!active || cur >= maxSafe) return;
      statusEl.textContent = "下一次：" + fmtMult(fairMult(cur + 1)) + "　成功率 " + survPct(cur).toFixed(1) + "%";
      statusEl.className = "ax-inst__last ax-muted";
    });

    startBtn.addEventListener("click", start);
    pumpBtn.addEventListener("click", pump);
    cashBtn.addEventListener("click", cashOut);
    refreshHUD();

    function stat(l, n) { return HL.ui.stat(l, n, "ax-mines__stat"); }
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🎈 Pump 打氣" }),
      el("div", { class: "ax-inst__stage ax-pump" }, [
        el("div", { class: "ax-mines__top" }, [stat("目前", multEl), stat("下一步", nextEl), stat("爆裂率", riskEl), stat("可贏", winEl)]),
        el("div", { class: "ax-pump__stage" }, [balloonEl])
      ]),
      amt.node,
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "難度" }), diffSel]),
      el("div", { class: "ax-crash__btns" }, [startBtn, pumpBtn, cashBtn]),
      statusEl,
      HL.ui.gameInfoBar({ fair: "一刺一注", edge: "2% 莊家優勢", note: "逐次打氣累乘，爆裂率逐次上升，隨時兌現" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Pump 打氣", provider: "Apex Studio", key: "pump" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "pump", title: "Pump 打氣", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#b3145a", c2: "#3a0a22", render: pumpGame });
  }
})(window);

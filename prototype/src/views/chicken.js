/*
 * Apex Win｜小雞過馬路 Chicken Cross（Originals 原創小遊戲）
 * 玩法：投注後「出發」讓小雞往前過一條車道；每成功一格賠率升一級、可隨時「兌現」。
 *       小雞可能被車撞、掉進井蓋、或被井蓋竄出的火焰燒死 → 本輪結束、押注失效。
 *       道路無終點（車道無限延伸），賠率上限 5000x（達標自動兌現）。
 *
 * 機率模型（RTP ≤ 100%，固定 97%）：
 *   第 k 格存活率 p(k) = max(pMin, pStart − dec×(k−1))   （難度越高 pStart 越低、衰減越快）
 *   累積存活率 cum(k) = Π p(i)，賠率 m(k) = floor2(RTP ÷ cum(k))（捨去到小數 2 位）
 *   → 任何時點兌現的期望值 = 押注 × m(k) × cum(k) ≤ 押注 × 0.97，RTP 恆 ≤ 97% < 100%。
 *
 * 會員模式：每一步由伺服器 RPC（chicken_start / chicken_step / chicken_cashout）決定並
 *   原子結算餘額（防作弊）；RPC 未部署時自動降級為「練習模式」（不動真實餘額）。
 * 美術為原創（emoji + 自繪 SVG 車輛），非複製任何商業素材。註冊於 window.HL.views.chicken。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;

  var RTP = 0.97, MAXX = 5000, MIN_BET = 10, MAX_BET = 1000;
  var DIFFS = [
    { key: "easy", name: "簡單", ic: "🐣", pStart: 0.96, dec: 0.004, pMin: 0.85 },
    { key: "mid", name: "中等", ic: "🐔", pStart: 0.90, dec: 0.007, pMin: 0.72 },
    { key: "hard", name: "困難", ic: "🔥", pStart: 0.83, dec: 0.010, pMin: 0.60 },
    { key: "hell", name: "地獄", ic: "💀", pStart: 0.72, dec: 0.012, pMin: 0.45 }
  ];
  function diffOf(key) { return DIFFS.filter(function (d) { return d.key === key; })[0] || DIFFS[1]; }
  function stepP(diffKey, k) { var d = diffOf(diffKey); return Math.max(d.pMin, d.pStart - d.dec * (k - 1)); }
  function multAt(diffKey, k) {
    var cum = 1;
    for (var i = 1; i <= k; i++) cum *= stepP(diffKey, i);
    return Math.min(MAXX, Math.floor((RTP / cum) * 100) / 100); // 顯示與派彩同步以 5000x 封頂
  }
  function fmtX(m) { return (m >= 100 ? String(Math.round(m)) : m.toFixed(2)) + "x"; }

  // 會員/餘額（同 slot 的 Phase 4b 模式：會員餘額只由伺服器回應設定）
  function isMember() { return !!(HL.auth && HL.auth.backend() && HL.auth.user()); }
  function bal() { return HL.state.get().balance; }
  function spend(delta) { if (!isMember()) { HL.state.set({ balance: HL.state.get().balance + delta }); HL.shell.refreshChrome(); } }
  function setBalance(v) { if (v != null) { HL.state.set({ balance: +v }); HL.shell.refreshChrome(); } }

  var st;
  var epoch = 0; // render 世代：換頁後殘留的 RPC 回呼不得再動新頁面的狀態
  function freshState() { return { bet: 20, diff: "mid", step: 0, active: false, busy: false, mult: 0, practice: false }; }

  var trackEl, rvEl, chickEl, lanes, goBtn, cashBtn, betInput, betRowEl, diffWrap, statusEl, nextEl, bannerEl;

  /* ---------- 道路 ---------- */
  var CAR_COLORS = ["#ff5d6c", "#36a6ff", "#ffb524", "#2fd17a", "#9d80ff", "#ff9f1c", "#dde5f5"];
  function carSvg(color) {
    return '<svg viewBox="0 0 40 68" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="2" y="8" width="4" height="11" rx="2" fill="#1b2236"/><rect x="34" y="8" width="4" height="11" rx="2" fill="#1b2236"/>' +
      '<rect x="2" y="47" width="4" height="11" rx="2" fill="#1b2236"/><rect x="34" y="47" width="4" height="11" rx="2" fill="#1b2236"/>' +
      '<rect x="4" y="2" width="32" height="64" rx="10" fill="' + color + '"/>' +
      '<rect x="8" y="13" width="24" height="11" rx="3" fill="rgba(8,12,22,.55)"/>' +
      '<rect x="8" y="44" width="24" height="9" rx="3" fill="rgba(8,12,22,.38)"/>' +
      '<rect x="7" y="2" width="6" height="4" rx="2" fill="rgba(255,255,255,.75)"/><rect x="27" y="2" width="6" height="4" rx="2" fill="rgba(255,255,255,.75)"/></svg>';
  }
  function carNode() {
    var c = el("div", { class: "ax-chx__car" });
    c.innerHTML = carSvg(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
    c.style.animationDuration = (1.5 + Math.random() * 1.9).toFixed(2) + "s";
    c.style.animationDelay = (-Math.random() * 3.2).toFixed(2) + "s";
    return c;
  }
  function laneNode(k) {
    return el("div", { class: "ax-chx__lane" }, [
      el("div", { class: "ax-chx__barrier", text: "🚧" }),
      carNode(),
      el("div", { class: "ax-chx__hole" }),
      el("div", { class: "ax-chx__mult", text: fmtX(multAt(st.diff, k)) })
    ]);
  }
  var LANE_KEEP = 14; // 小雞前方至少保留的車道數（無限道路：邊走邊長）
  function ensureLanes() {
    while (lanes.length < st.step + LANE_KEEP) {
      var ln = laneNode(lanes.length + 1);
      lanes.push(ln); trackEl.appendChild(ln);
    }
  }
  function laneW() { return lanes[0] ? lanes[0].getBoundingClientRect().width || 96 : 96; }
  function sideW() { var s = trackEl.querySelector(".ax-chx__side"); return s ? s.getBoundingClientRect().width || 72 : 72; }
  function positionChick() {
    var w = laneW(), sw = sideW();
    var x = st.step === 0 ? sw / 2 : sw + (st.step - 1) * w + w / 2;
    chickEl.style.left = x + "px";
    trackEl.style.transform = "translateX(" + (-Math.max(0, st.step - 2) * w) + "px)"; // 小雞保持在第 3 格視野
  }
  function refreshLanes() {
    for (var i = 0; i < lanes.length; i++) {
      var k = i + 1;
      lanes[i].classList.toggle("is-passed", st.active && k <= st.step);
      lanes[i].classList.toggle("is-cur", st.active && !st.busy && k === st.step + 1);
    }
  }
  function buildRoad() {
    HL.dom.clear(trackEl);
    trackEl.style.transform = "translateX(0)";
    lanes = [];
    trackEl.appendChild(el("div", { class: "ax-chx__side" }, [el("span", { text: "🌱" }), el("span", { text: "🌼" }), el("span", { text: "🌱" })]));
    chickEl = el("div", { class: "ax-chx__chick", text: "🐔" });
    trackEl.appendChild(chickEl);
    ensureLanes();
    refreshLanes();
    positionChick();
  }

  /* ---------- HUD ---------- */
  function setStatus(t) { if (statusEl) statusEl.textContent = t || ""; }
  function refreshNext() {
    if (!nextEl) return;
    var k = st.step + 1, p = stepP(st.diff, k), m = multAt(st.diff, k);
    var cur = st.active && st.step >= 1 ? "目前 " + fmtX(st.mult) + "（兌現 " + money(Math.floor(st.bet * st.mult)) + "）· " : "";
    nextEl.textContent = cur + "下一格 " + fmtX(m) + " · 存活率 " + (p * 100).toFixed(1) + "%";
  }
  function updateButtons() {
    if (!goBtn) return;
    goBtn.disabled = st.busy;
    goBtn.textContent = st.active ? "出發 ▶" : "出發（押 " + money(st.bet) + "）";
    var canCash = st.active && st.step >= 1 && !st.busy;
    cashBtn.disabled = !canCash;
    cashBtn.textContent = st.active && st.step >= 1 ? "兌現 " + money(Math.floor(st.bet * st.mult)) : "兌現";
    var lockBet = st.active || st.busy; // 開局 RPC 在途時也要鎖住，避免 st.bet 與伺服器扣注脫鉤
    betInput.disabled = lockBet;
    if (betRowEl) Array.prototype.forEach.call(betRowEl.querySelectorAll(".ax-stake"), function (b) { b.disabled = lockBet; });
    Array.prototype.forEach.call(diffWrap.children, function (b) { b.disabled = lockBet; });
    refreshNext();
    HL.shell.refreshChrome();
  }
  function setBusy(b) { st.busy = b; updateButtons(); refreshLanes(); }

  /* ---------- 回合流程 ---------- */
  function go() {
    if (st.busy) return;
    st.active ? doStep() : startRound();
  }
  function startRound() {
    var b = Math.floor(+betInput.value || 0);
    if (b < MIN_BET) { HL.ui.toast("最低押注 " + MIN_BET, "warn"); return; }
    if (b > MAX_BET) { HL.ui.toast("最高押注 " + MAX_BET, "warn"); return; }
    if (!st.practice && b > bal()) { HL.ui.toast("餘額不足", "err"); return; }
    st.bet = b; betInput.value = String(b);
    if (isMember() && !st.practice) {
      setBusy(true);
      var tk = epoch;
      HL.api.chickenStart(b, st.diff).then(function (R) {
        if (!R) { if (tk === epoch) { setBusy(false); enterPractice(); } return; } // 只有「RPC 未部署」才降級練習
        if (R.error || R.balance == null) {
          if (tk === epoch) { setBusy(false); HL.ui.toast(/insufficient/i.test(R.error || "") ? "餘額不足（以伺服器為準）" : "開局失敗，請再試一次", "warn"); }
          return;
        }
        setBalance(R.balance); // 伺服器已扣注：餘額是全域狀態，換頁了也要同步
        if (HL.liveStats) HL.liveStats.record("小雞過馬路", +R.bet || b, 0);
        if (tk !== epoch) return; // 已換頁：伺服器回合視同放棄（下次開局會覆蓋）
        if (R.bet != null) { st.bet = +R.bet; betInput.value = String(st.bet); } // 以伺服器扣的注為準
        beginRound(); doStep();
      });
      return;
    }
    if (!st.practice) { spend(-b); if (HL.liveStats) HL.liveStats.record("小雞過馬路", b, 0); }
    beginRound(); doStep();
  }
  function beginRound() {
    st.active = true; st.step = 0; st.mult = 0; st.busy = false;
    buildRoad(); updateButtons();
    setStatus("🐔 出發！注意車流、井蓋與火焰…");
  }
  function doStep() {
    if (!st.active || st.busy) return;
    setBusy(true);
    var k = st.step + 1;
    if (isMember() && !st.practice) {
      var tk = epoch;
      HL.api.chickenStep().then(function (R) {
        if (R && R.cashed) { // 達上限自動兌現：伺服器已派彩，無論頁面是否還在都同步餘額/統計
          setBalance(+R.balance);
          if (HL.liveStats) HL.liveStats.record("小雞過馬路", 0, +R.win);
          if (tk !== epoch) return;
          hopTo(k, function () { st.mult = +R.mult; celebrate(+R.win, true); });
          return;
        }
        if (tk !== epoch) return;
        if (R && R.error === "no active round") { resyncRound(); return; } // 回合已在伺服器結束（斷線/他分頁）
        if (!R || R.error || R.alive == null) { setBusy(false); HL.ui.toast("伺服器忙線，請再按一次出發", "warn"); return; }
        if (!R.alive) { hopDeath(k); return; }
        hopTo(k, function () { st.mult = +R.mult; survive(); });
      });
      return;
    }
    // Demo / 練習：客端 RNG（同一機率模型）
    if (Math.random() < stepP(st.diff, k)) {
      var m = multAt(st.diff, k);
      hopTo(k, function () {
        st.mult = Math.min(m, MAXX);
        if (m >= MAXX) cashLocal(true); else survive();
      });
    } else hopDeath(k);
  }
  function hopTo(k, done) {
    st.step = k; ensureLanes(); positionChick();
    chickEl.classList.remove("is-hop"); void chickEl.offsetWidth; chickEl.classList.add("is-hop");
    setTimeout(done, 380);
  }
  function survive() {
    setBusy(false);
    setStatus("✅ 第 " + st.step + " 格安全！目前 " + fmtX(st.mult) + " · 可兌現 " + money(Math.floor(st.bet * st.mult)));
  }

  /* ---------- 死亡演出（撞車 / 掉井蓋 / 火燒）---------- */
  function fxAt(cls, text) {
    var n = el("div", { class: cls, text: text || "" });
    n.style.left = chickEl.style.left;
    trackEl.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 1300);
    return n;
  }
  function hopDeath(k) {
    st.step = k; ensureLanes(); positionChick();
    chickEl.classList.remove("is-hop"); void chickEl.offsetWidth; chickEl.classList.add("is-hop");
    var kind = ["car", "hole", "fire"][Math.floor(Math.random() * 3)];
    setTimeout(function () { playDeath(kind); }, 400);
  }
  function playDeath(kind) {
    var ln = lanes[st.step - 1];
    if (kind === "car" && ln) {
      var killer = el("div", { class: "ax-chx__car ax-chx__car--kill" });
      killer.innerHTML = carSvg(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
      ln.appendChild(killer);
      setTimeout(function () {
        chickEl.classList.add("is-hit");
        fxAt("ax-chx__boom", "💥"); fxAt("ax-chx__feather", "🪶");
        afterDeath("被車撞飛了！");
      }, 330);
    } else if (kind === "hole") {
      chickEl.classList.add("is-fall");
      afterDeath("踩空掉進井蓋裡…");
    } else {
      fxAt("ax-chx__fire", "🔥");
      chickEl.classList.add("is-burn");
      afterDeath("被井蓋竄出的火焰燒到了！");
    }
  }
  function afterDeath(msg) {
    setStatus("💀 " + msg + " 本輪結束，押注輸掉。");
    HL.ui.toast("小雞陣亡 · 輸掉 " + money(st.bet), "err");
    st.active = false; st.mult = 0;
    setTimeout(resetRound, 1500);
  }

  /* ---------- 兌現 ---------- */
  function cashout() {
    if (!st.active || st.step < 1 || st.busy) return;
    if (isMember() && !st.practice) {
      setBusy(true);
      var tk = epoch;
      HL.api.chickenCashout().then(function (R) {
        if (R && R.win != null) { // 伺服器已派彩：餘額/統計無條件同步
          setBalance(+R.balance);
          if (HL.liveStats) HL.liveStats.record("小雞過馬路", 0, +R.win);
        }
        if (tk !== epoch) return;
        if (R && R.error === "no active round") { resyncRound(); return; }
        if (!R || R.win == null) { setBusy(false); HL.ui.toast("伺服器忙線，請再試一次", "warn"); return; }
        st.mult = +R.mult;
        celebrate(+R.win, false);
      });
      return;
    }
    cashLocal(false);
  }
  function cashLocal(capped) {
    var win = Math.floor(st.bet * st.mult);
    if (!st.practice) { spend(win); if (HL.liveStats) HL.liveStats.record("小雞過馬路", 0, win); }
    celebrate(win, capped);
  }
  // 客端以為回合進行中、伺服器端卻已結束（回應遺失/另一分頁玩掉）→ 重置並以伺服器餘額為準
  function resyncRound() {
    st.active = false; st.mult = 0; st.busy = false;
    HL.ui.toast("本輪已在伺服器結束，已重新同步", "warn");
    if (HL.api.loadProfile) HL.api.loadProfile().then(function (p) { if (p && p.balance != null) setBalance(+p.balance); });
    resetRound();
  }
  function celebrate(win, capped) {
    setStatus("💰 兌現 " + fmtX(st.mult) + "，獲得 " + money(win) + (capped ? "（達 " + MAXX + "x 上限自動兌現）" : "") + (st.practice ? "（練習模式，不計餘額）" : ""));
    HL.ui.toast("兌現獲得 " + money(win), "ok");
    fxAt("ax-chx__pop", "+ " + money(win));
    chickEl.classList.add("is-cash");
    st.active = false;
    setTimeout(resetRound, 1500);
  }
  function resetRound() {
    if (st.active) return; // 已開新局則不重置
    st.step = 0; st.mult = 0; st.busy = false;
    buildRoad(); updateButtons();
    setStatus(st.practice ? "🧪 練習模式：不影響真實餘額。" : "設定押注與難度，按「出發」開始。");
  }
  function enterPractice() {
    st.practice = true;
    if (bannerEl) { bannerEl.textContent = "🧪 練習模式 · 伺服器尚未部署小雞 RPC（supabase-phase5.sql），本頁不影響真實餘額"; bannerEl.style.display = ""; }
    HL.ui.toast("伺服器未部署小雞開獎服務，改為練習模式", "warn");
    updateButtons();
  }

  /* ---------- 規則 / 機率模型 ---------- */
  function infoModal() {
    var d = diffOf(st.diff);
    var sample = [1, 2, 3, 5, 8, 12].map(function (k) {
      return el("div", { class: "ax-row" }, [
        el("span", { style: "width:54px", class: "ax-muted", text: "第 " + k + " 格" }),
        el("span", { class: "nm", text: "存活率 " + (stepP(st.diff, k) * 100).toFixed(1) + "%" }),
        el("b", { class: "ax-gold", text: fmtX(multAt(st.diff, k)) })
      ]);
    });
    HL.ui.modal("遊戲規則 · 小雞過馬路", [
      el("ul", { class: "ax-rules" }, [
        el("li", { text: "投注後按「出發」，小雞往前過一條車道；每成功一格，賠率升一級。" }),
        el("li", { text: "第一步之後隨時可「兌現」帶走目前賠率，別貪心讓小雞出事。" }),
        el("li", { text: "小雞可能被車撞、掉進井蓋、或被井蓋竄出的火焰燒到——任一意外即結束本輪，押注失效。" }),
        el("li", { text: "難度越高每格存活率越低、賠率攀升越快。道路無終點，" + MAXX + "x 達標自動兌現。" })
      ]),
      el("div", { class: "ax-panel" }, [el("p", { class: "ax-muted", text: "目前難度「" + d.name + "」賠率表（節錄）：" })].concat(sample)),
      el("p", { class: "ax-muted", text: "公平性：賠率 = 0.97 ÷ 累積存活率（捨去至小數 2 位）。任何時點兌現的理論期望值 = 押注 × 97%，理論 RTP 恆為 97%（≤ 100%）。" }),
      el("span", { class: "ax-demo-tag", text: isMember() && !st.practice ? "🔒 伺服器逐步開獎" : "Demo · 原創玩法" })
    ]);
  }

  /* ---------- 版面 ---------- */
  function render() {
    if (HL.gameFrame && HL.gameFrame.resumeFrame) {
      var resumed = HL.gameFrame.resumeFrame("chicken");
      if (resumed) return resumed;
    }
    st = freshState(); epoch++; // 換頁重進 → 舊回呼全部失效

    betInput = el("input", { type: "number", value: "20", min: String(MIN_BET), max: String(MAX_BET) });
    function nudge(f) { var v = Math.floor((+betInput.value || MIN_BET) * f); betInput.value = String(Math.max(MIN_BET, Math.min(MAX_BET, v))); st.bet = +betInput.value; updateButtons(); }
    betRowEl = el("div", { class: "ax-chx__betrow" }, [
      el("div", { class: "ax-search ax-wallet-input" }, [el("span", { class: "ax-search__ic", text: "NT$" }), betInput]),
      el("button", { class: "ax-stake", text: "½", onClick: function () { nudge(0.5); } }),
      el("button", { class: "ax-stake", text: "2×", onClick: function () { nudge(2); } })
    ]);
    var betBox = el("div", { class: "ax-chx__betbox" }, [
      el("small", { class: "ax-muted", text: "投注額" }),
      betRowEl
    ]);
    betInput.addEventListener("input", function () { var v = Math.floor(+betInput.value || 0); if (v >= MIN_BET && v <= MAX_BET) { st.bet = v; updateButtons(); } });

    diffWrap = el("div", { class: "ax-chx__diffs" }, DIFFS.map(function (d) {
      return el("button", {
        class: "ax-chx__diff" + (d.key === st.diff ? " is-on" : ""), text: d.ic + " " + d.name,
        onClick: function () {
          if (st.active) return;
          st.diff = d.key;
          Array.prototype.forEach.call(diffWrap.children, function (c) { c.classList.remove("is-on"); });
          this.classList.add("is-on");
          buildRoad(); updateButtons();
        }
      });
    }));

    cashBtn = el("button", { class: "ax-btn-ghost ax-chx__cash", text: "兌現", disabled: "", onClick: cashout });
    goBtn = el("button", { class: "ax-btn-primary ax-chx__go", text: "出發", onClick: go });
    nextEl = el("div", { class: "ax-chx__next" });
    statusEl = el("div", { class: "ax-chx__status" });

    var panel = el("div", { class: "ax-chx__panel" }, [
      betBox,
      el("div", {}, [el("small", { class: "ax-muted", text: "難度" }), diffWrap]),
      cashBtn, goBtn, nextEl
    ]);

    trackEl = el("div", { class: "ax-chx__track" });
    rvEl = el("div", { class: "ax-chx__rv" }, [trackEl]);

    bannerEl = el("div", { class: "ax-practice", style: "display:none" });
    var memberBanner = isMember() ? el("div", { class: "ax-practice" }, [el("span", { text: "🔒 伺服器逐步開獎 · 每一步與餘額由後端決定（防作弊）" })]) : null;

    var node = el("div", { class: "ax-chx ax-fade-in" }, [
      el("div", { class: "ax-slot__top" }, [
        el("a", { class: "ax-duel__back", text: "‹ 返回娛樂城", onClick: function () { HL.router.go("casino"); } }),
        el("div", { class: "ax-slot__title", text: "小雞過馬路 · Chicken Cross" }),
        el("div", { class: "ax-slot__topr" }, [
          el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal }),
          el("span", { class: "ax-demo-tag", text: "Originals · RTP 97%" })
        ])
      ]),
      memberBanner, bannerEl,
      el("div", { class: "ax-chx__main" }, [panel, el("div", { class: "ax-chx__right" }, [rvEl, statusEl])]),
      el("p", { class: "ax-muted", style: "text-align:center", text: "無限車道 · 每格賠率遞增 · 隨時兌現 · 最大 " + MAXX + "x 自動兌現" })
    ]);

    buildRoad(); updateButtons();
    setStatus("設定押注與難度，按「出發」開始。");

    return HL.gameFrame
      ? HL.gameFrame.wrap(node, { title: "小雞過馬路 Chicken Cross", provider: "Apex Originals", key: "chicken", maxWidth: "1100px" })
      : node;
  }

  HL.views = HL.views || {};
  HL.views.chicken = { render: render };
})(window);

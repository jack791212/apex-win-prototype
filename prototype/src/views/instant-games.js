/*
 * Apex Win｜即時遊戲：Dice + Limbo + Plinko（掛在 HL.instant 共用引擎上）
 * Dice/Limbo 皆 1% 莊家優勢、單步結果（最易接 provably fair）；Plinko U 形賠付表 1% 優勢（中央槽吸收捨入殘差、RTP 有精確解析式）。
 * 以 HL.games.register 覆蓋 mock 的 comingSoon 占位卡（id: dice / limbo / plinko）為可玩。
 * 載入順序：data/games.js 之後（覆蓋 seed）、core/instant.js 之後。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學（HL.dice/HL.limbo/HL.plinko）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var EDGE = 0.99; // 1% house edge

  // ---- Dice：滾出 0.00–99.99，under: roll<target 贏；over: roll>target 贏 ----
  var Dice = {
    edge: EDGE,
    rollOf: function (f) { return Math.floor(f * 10000) / 100; },          // float→0.00–99.99（可驗證公平）
    winChance: function (target, dir) { return dir === "under" ? target : 100 - target; }, // 顯示用（%）
    mult: function (target, dir) { return EDGE * 100 / Dice.winChance(target, dir); },
    resolve: function (f, target, dir) {
      var roll = Dice.rollOf(f), win = dir === "under" ? roll < target : roll > target;
      return { roll: roll, win: win, multiplier: win ? Dice.mult(target, dir) : 0 };
    }
  };

  // ---- Limbo：崩盤倍數 crash = max(1, EDGE/(1-f))；crash ≥ 目標 t 即贏（賠 t×）。P(crash≥t)=EDGE/t ----
  var Limbo = {
    edge: EDGE,
    crashOf: function (f) { return Math.max(1, EDGE / (1 - f)); },
    winChancePct: function (t) { return EDGE * 100 / t; },                  // 顯示用（%）
    resolve: function (f, t) {
      var crash = Limbo.crashOf(f), win = crash >= t;
      return { crash: crash, win: win, multiplier: win ? t : 0 };
    }
  };

  // ---- Plinko：8/12/16 排 U 形賠付表（邊高中低），含 ~1% 莊家優勢；程式生成故任何排數/風險 RTP 皆≈0.99 ----
  var Plinko = {
    edge: EDGE,
    comb: function (n, k) { var r = 1; for (var i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; },
    // 顯示友善捨入：邊緣槽保留漂亮整數/一位/兩位小數（＝玩家看到的行銷倍數值）
    roundDisp: function (m) { return m >= 10 ? Math.round(m) : m >= 1 ? Math.round(m * 10) / 10 : Math.round(m * 100) / 100; },
    // 生成倍數表：a=風險曲率；未捨入前 Σ p[k]·m[k] = EDGE（精確）。
    // 直接捨入所有槽會破壞該恆等式、引入 ±0.5~1.3pp 漂移（16med 曾漂到 >100%＝玩家有利）。
    // 修法：邊緣槽照舊捨成漂亮值，再讓「中央槽」(機率最高、倍數最小 <1) 吸收殘差，
    //       使 Σ p·m ≤ EDGE（floor＝莊家安全側，永不 >100%）且落在宣告 RTP ±0.5pp 內。
    //       n 為偶(8/12/16) → 單一中央槽 k=n/2。桶機率 = C(n,k)/2^n（dirsOf 取 n 個獨立位元＝二項分布），
    //       故 RTP 有精確解析式 Σ p·m，不受蒙地卡羅重尾雜訊影響（見 gate_log）。
    buildTable: function (n, rk) {
      var a = rk === "low" ? 0.55 : rk === "high" ? 1.6 : 1.0, p = [], w = [], denom = 0, k;
      for (k = 0; k <= n; k++) { p[k] = Plinko.comb(n, k) / Math.pow(2, n); w[k] = Math.pow(1 / p[k], a); denom += p[k] * w[k]; }
      var t = []; for (k = 0; k <= n; k++) t[k] = Plinko.roundDisp(EDGE * w[k] / denom);
      var c = n >> 1, others = 0; for (k = 0; k <= n; k++) if (k !== c) others += p[k] * t[k];
      t[c] = Math.max(0.01, Math.floor((EDGE - others) / p[c] * 100) / 100);
      return t;
    },
    // float→各排左右（低 n 位元）與落點槽 index。排數 ≤ 16（single float 取 16 位元）。
    dirsOf: function (f, n) {
      var bits = Math.floor(f * 65536), dirs = [], rights = 0;
      for (var i = 0; i < n; i++) { var d = (bits >> i) & 1; dirs.push(d); rights += d; }
      return { dirs: dirs, rights: rights };
    },
    resolve: function (f, n, rk) {
      var t = Plinko.buildTable(n, rk), d = Plinko.dirsOf(f, n);
      return { dirs: d.dirs, rights: d.rights, multiplier: t[d.rights], table: t };
    }
  };

  HL.dice = Dice; HL.limbo = Limbo; HL.plinko = Plinko;
  if (typeof module !== "undefined" && module.exports) { module.exports = { dice: Dice, limbo: Limbo, plinko: Plinko }; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el;
  var money = HL.dom.money;

  /* ---------------- Dice：滾出小於目標 ---------------- */
  function diceGame() {
    var target = 50, dir = "under"; // under: roll<target 贏；over: roll>target 贏
    function winChance() { return Dice.winChance(target, dir); }
    function mult() { return Dice.mult(target, dir); }

    var rollBadge = el("div", { class: "ax-dice__roll", text: "00.00" });
    var zoneWin = el("div", { class: "ax-dice__zone is-win" });
    var zoneLose = el("div", { class: "ax-dice__zone is-lose" });
    var pointer = el("div", { class: "ax-dice__pointer" });
    var thumbLbl = el("b", {});
    var thumb = el("div", { class: "ax-dice__thumb" }, [thumbLbl]);
    var track = el("div", { class: "ax-dice__track" }, [zoneWin, zoneLose, pointer, thumb]);
    var multEl = el("b", {}), chanceEl = el("b", {}), profitEl = el("b", {});
    var dirBtn = el("button", { class: "ax-inst__chip ax-dice__dir" });
    var history = HL.ui.histBar({ cls: "ax-dice__history", itemCls: "ax-dice__pill", max: 12, fair: true });
    var panel = null;

    function layout() {
      thumb.style.left = target + "%"; thumbLbl.textContent = String(target);
      var winLeft = dir === "under", lo = winLeft ? zoneWin : zoneLose, hi = winLeft ? zoneLose : zoneWin;
      lo.style.left = "0%"; lo.style.width = target + "%";
      hi.style.left = target + "%"; hi.style.width = (100 - target) + "%";
    }
    function sync() {
      layout();
      var bet = panel ? panel.getBet() : 50;
      multEl.textContent = mult().toFixed(2) + "×";
      chanceEl.textContent = winChance().toFixed(0) + "%";
      profitEl.textContent = money(Math.round(bet * (mult() - 1)));
      dirBtn.textContent = (dir === "under" ? "滾出 < " : "滾出 > ") + target;
    }
    dirBtn.addEventListener("click", function () { dir = dir === "under" ? "over" : "under"; sync(); });

    var dragging = false;
    function setFromX(cx) { var r = track.getBoundingClientRect(); target = HL.instant.clampInt((cx - r.left) / r.width * 100, 2, 98); sync(); }
    track.addEventListener("pointerdown", function (e) { dragging = true; try { track.setPointerCapture(e.pointerId); } catch (x) {} setFromX(e.clientX); });
    track.addEventListener("pointermove", function (e) { if (dragging) setFromX(e.clientX); });
    function endDrag() { dragging = false; }
    track.addEventListener("pointerup", endDrag); track.addEventListener("pointercancel", endDrag);

    function addPill(roll, win) { history.push(roll.toFixed(2), win ? "is-win" : "is-lose"); }

    function playRound(bet, ctx) {
      var res = Dice.resolve(HL.fair.floatOr("dice"), target, dir); // 可驗證公平；純數學與 node 驗證器同一份
      var roll = res.roll, win = res.win;
      var fast = !!(ctx && ctx.turbo), from = parseFloat(rollBadge.textContent) || 0;
      rollBadge.className = "ax-dice__roll"; pointer.classList.remove("is-bounce");
      pointer.style.left = roll + "%"; // CSS transition 平滑滑到落點（不依賴 rAF）
      if (!fast) HL.instant.animate(from, roll, 280, function (v) { rollBadge.textContent = v.toFixed(2); }); // 數字 count-up（盡力）
      // 結算閘門用 setTimeout 保證觸發（背景分頁/無 rAF 也成立）
      var done = new Promise(function (resolve) {
        setTimeout(function () {
          rollBadge.textContent = roll.toFixed(2);
          rollBadge.className = "ax-dice__roll " + (win ? "is-win" : "is-lose");
          pointer.classList.add("is-bounce"); addPill(roll, win);
          resolve();
        }, fast ? 0 : 300);
      });
      return { multiplier: res.multiplier, label: "擲出 " + roll.toFixed(2), done: done };
    }

    // game 必填：betPanel 未帶 game 會以 "instant" 回報中央結算點，使 Dice/Limbo/Plinko
    // 三款共用同一個假 key（連帶讓熱度/注單/成就/#50 成本加權都無法逐款歸屬）。2026-07-31 #50 修。
    panel = HL.instant.betPanel({ game: "dice", initial: 50, playText: "擲骰 🎲", playRound: playRound, onBetChange: sync });
    function card(label, node) { return HL.ui.stat(label, node, "ax-dice__card"); }
    sync();
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🎲 Dice" }),
      el("div", { class: "ax-inst__stage ax-dice" }, [rollBadge, track, history.node]),
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "方向" }), dirBtn]),
      el("div", { class: "ax-dice__info" }, [card("賠率", multEl), card("中獎率", chanceEl), card("可贏", profitEl)]),
      panel.node,
      HL.ui.gameInfoBar({ fair: true, edge: "1% 莊家優勢", note: "拖動握把設目標、切換 大於/小於" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Dice", provider: "Apex Studio", key: "dice" }) : node;
  }

  /* ---------------- Limbo：崩盤倍數 ≥ 目標即贏 ---------------- */
  function limboGame() {
    var bigEl = el("div", { class: "ax-limbo__mult", text: "1.00×" });
    var tIn = el("input", { type: "number", min: "1.01", max: "1000000", step: "0.01", value: "2.00", class: "ax-limbo__target", "aria-label": "目標倍數" });
    var multEl = el("b", {}), chanceEl = el("b", {}), profitEl = el("b", {});
    var history = HL.ui.histBar({ cls: "ax-limbo__hist", itemCls: "ax-limbo__chip", max: 12, fair: true });
    var panel = null;
    function target() { return Math.max(1.01, Math.min(1e6, +tIn.value || 1.01)); }
    function sync() {
      var t = target(), bet = panel ? panel.getBet() : 50;
      multEl.textContent = t.toFixed(2) + "×";
      chanceEl.textContent = Limbo.winChancePct(t).toFixed(2) + "%";
      profitEl.textContent = money(Math.round(bet * (t - 1)));
    }
    tIn.addEventListener("input", sync);
    function addPill(crash, win) { history.push(crash.toFixed(2) + "×", win ? "is-win" : "is-lose"); }

    function playRound(bet, ctx) {
      var t = target(), res = Limbo.resolve(HL.fair.floatOr("limbo"), t), crash = res.crash, win = res.win; // 可驗證公平；P(crash>=t)=EDGE/t
      var fast = !!(ctx && ctx.turbo), from = parseFloat(bigEl.textContent) || 1;
      bigEl.className = "ax-limbo__mult";
      if (!fast) HL.instant.animate(from, crash, 600, function (v) { bigEl.textContent = v.toFixed(2) + "×"; }); // 快速滾動上升（盡力）
      var done = new Promise(function (resolve) {
        setTimeout(function () {
          bigEl.textContent = crash.toFixed(2) + "×";
          bigEl.className = "ax-limbo__mult"; void bigEl.offsetWidth; // reflow 讓動畫可重播
          bigEl.className = "ax-limbo__mult " + (win ? "is-win" : "is-lose");
          addPill(crash, win); resolve();
        }, fast ? 0 : 620);
      });
      return { multiplier: res.multiplier, label: "崩盤 " + crash.toFixed(2) + "×", done: done };
    }

    panel = HL.instant.betPanel({ game: "limbo", initial: 50, playText: "開始 🚀", playRound: playRound, onBetChange: sync });
    function card(l, n) { return HL.ui.stat(l, n, "ax-dice__card"); }
    sync();
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🚀 Limbo" }),
      el("div", { class: "ax-inst__stage ax-limbo" }, [history.node, bigEl]),
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "目標倍數" }), tIn]),
      el("div", { class: "ax-dice__info" }, [card("賠率", multEl), card("中獎率", chanceEl), card("可贏", profitEl)]),
      panel.node,
      HL.ui.gameInfoBar({ fair: true, edge: "1% 莊家優勢", note: "崩盤倍數 ≥ 目標即贏" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Limbo", provider: "Apex Studio", key: "limbo" }) : node;
  }

  /* ---------------- Plinko：落球進倍數槽（8/12/16 排，皆 ~1% 莊家優勢） ---------------- */
  function plinkoGame() {
    var rows = 8, risk = "medium";
    var table = Plinko.buildTable(rows, risk);
    var pegs = el("div", { class: "ax-plinko__pegs" });
    // ⚠️ 刻意沒有「一顆共用的球」：每次投球 new 一顆、落地自銷毀（見下方 bounce 的檔內註記）。
    var board = el("div", { class: "ax-plinko__board" }, [pegs]);
    var bucketsEl = el("div", { class: "ax-plinko__buckets" });
    var history = HL.ui.histBar({ cls: "ax-plinko__hist", itemCls: "ax-plinko__chip", max: 10, fair: true });
    function bucketCls(m) { return m >= 5 ? "is-hot" : m >= 1 ? "is-mid" : "is-cool"; }
    function buildBoard() {
      HL.dom.clear(pegs);
      for (var r = 0; r < rows; r++) { var row = el("div", { class: "ax-plinko__pegrow" }); for (var pp = 0; pp < r + 3; pp++) row.appendChild(el("span", { class: "ax-plinko__peg" })); pegs.appendChild(row); }
      HL.dom.clear(bucketsEl); bucketsEl.style.gridTemplateColumns = "repeat(" + (rows + 1) + ",1fr)";
      table.forEach(function (m) { bucketsEl.appendChild(el("div", { class: "ax-plinko__bucket " + bucketCls(m), text: (m >= 100 ? Math.round(m) : m) + "×" })); });
    }
    function chipSel(items, cur, onPick) { // S7：薄轉接到共用 HL.ui.segmented，外觀沿用 ax-inst__chip
      return HL.ui.segmented(items.map(function (it) { return { v: it[0], t: it[1] }; }), cur(), onPick,
        { cls: "ax-inst__amt", btnCls: "ax-inst__chip", activeCls: "is-active" });
    }
    var rowsSel = chipSel([[8, "8"], [12, "12"], [16, "16"]], function () { return rows; }, function (v) { rows = v; table = Plinko.buildTable(rows, risk); buildBoard(); });
    var riskSel = chipSel([["low", "低"], ["medium", "中"], ["high", "高"]], function () { return risk; }, function (v) { risk = v; table = Plinko.buildTable(rows, risk); buildBoard(); });
    function addHist(m) { history.push((m >= 100 ? Math.round(m) : m) + "×", bucketCls(m)); }

    // 逐排彈跳：閘門用單一 setTimeout 保證結算（背景分頁/節流也成立）；逐排動畫為盡力而為。
    /* ⚠️⚠️ 這裡有一個踩過的雷，改動前務必讀完（2026-08-19 船長目視回報「連按投球時球會從底部飛上去」）：
     *  【現象】第一顆以後的每一顆球，開場都會從上一顆的落點（底部 top:92%）**往上飛**回第一排。
     *  【根因】舊版共用同一顆球元素，重置寫成
     *          ball.style.transition="none"; ball.style.top="0%";   // 想「無過場」瞬移回頂端
     *          （同一個 JS task 內）vstep() 立刻又把 transition 設回 .09s 並寫第一排的 top
     *        瀏覽器一個 task 只算一次 style：`transition:none` 與 `top:0%` **從未被觀測到**，
     *        after-change style 是「有 transition + top≈11%」、before 是上一顆的 92% ⇒ 直接插值＝倒飛。
     *        （這不是偶發競態，是每一顆都會發生；連按只是讓它更明顯。）
     *  【canonical 修法】起點必須先被「提交」才能接動畫 —— 同 views/slot.js 與 views/instant-cases.js 的
     *        `void el.offsetWidth; // reflow`。本檔曾是全 repo 唯一漏掉這一步的動畫。
     *  【本版做法（比補 reflow 更強）】每次投球 **new 一顆球元素**、落地後自銷毀：
     *        ① 新元素沒有「上一顆的舊位置」可插值 ⇒ 倒飛在結構上不可能發生（不只是被 reflow 遮住）。
     *        ② 每顆球擁有自己的計時器與自己的排數 n ⇒ 上一局的 setTimeout 不可能再去改下一顆球
     *           （舊版落地後 +250ms 的隱藏計時器會把**下一顆**球中途變透明），飛行中切排數也不會改寫空中的球。
     *        ③ 順帶把「多球同時在空中」的路鋪好：真實 Plinko 是 fire-and-forget，
     *           現在唯一還在鎖併發的是共用引擎 HL.instant.betPanel 的單注輪次鎖（見 BACKLOG 遊戲軌卡）。
     *  ⇒ 不要把球元素搬回外層變成單例，也不要拿掉 void board.offsetWidth。 */
    function bounce(dirs, idx, fast) {
      var n = rows;                                   // 釘住本顆球的排數：飛行中切換排數不得改寫已在空中的球
      var unit = 100 / (n + 1), total = fast ? 0 : n * 90 + 40;
      var ball = el("div", { class: "ax-plinko__ball" });
      ball.style.opacity = "1"; ball.style.left = "50%"; ball.style.top = "0%";
      board.appendChild(ball);
      void board.offsetWidth;                         // 強制 reflow 提交起點（同 slot.js / instant-cases.js）
      var timers = [];
      function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
      if (!fast) {
        var step = 0, rights = 0;
        (function vstep() {
          if (step >= n) return;
          if (dirs[step]) rights++; step++;
          ball.style.transition = "left .09s linear, top .09s linear";
          ball.style.left = (50 + (rights - step / 2) * unit) + "%";
          ball.style.top = (step / n * 92) + "%";
          later(vstep, 90);
        })();
      }
      return new Promise(function (resolve) {
        later(function () {
          ball.style.left = (50 + (idx - n / 2) * unit) + "%"; ball.style.top = "92%";
          var b = bucketsEl.children[idx]; if (b) { b.classList.add("is-hit"); later(function () { b.classList.remove("is-hit"); }, 460); }
          later(function () { if (ball.parentNode) ball.parentNode.removeChild(ball); }, 250);  // 這顆球退場（只動自己）
          resolve();
        }, total);
      });
    }
    function playRound(bet, ctx) {
      // 可驗證公平：一注一個 nonce，由單一 float 取 rows 位元決定各排左右（純數學與 node 驗證器同一份）
      var res = Plinko.resolve(HL.fair.floatOr("plinko"), rows, risk);
      var m = res.multiplier, fast = !!(ctx && ctx.turbo);
      var done = bounce(res.dirs, res.rights, fast).then(function () { addHist(m); });
      return { multiplier: m, label: m + "× 槽", done: done };
    }
    buildBoard();
    var panel = HL.instant.betPanel({ game: "plinko", initial: 50, playText: "投球 ⚪", playRound: playRound });
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🔻 Plinko" }),
      history.node,
      el("div", { class: "ax-inst__stage ax-plinko" }, [board, bucketsEl]),
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "排數" }), rowsSel]),
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "風險" }), riskSel]),
      panel.node,
      HL.ui.gameInfoBar({ fair: true, edge: "~1% 莊家優勢", note: "落點決定倍數，邊槽高賠率高風險" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Plinko", provider: "Apex Studio", key: "plinko" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "dice", title: "Dice", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1e3a6e", c2: "#0a162a", render: diceGame });
    HL.games.register({ id: "limbo", title: "Limbo", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e1e4a", c2: "#2a0a1e", render: limboGame });
    HL.games.register({ id: "plinko", title: "Plinko", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e5a1e", c2: "#2a2410", render: plinkoGame });
  }
})(typeof window !== "undefined" ? window : globalThis);

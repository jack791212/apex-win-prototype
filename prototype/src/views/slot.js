/*
 * Apex Win｜暗影儀式 Shadow Ritual（原創主題可玩老虎機 Demo）
 * 連爆 ways-slot：滾輪旋轉 → 愛心(Scatter)優先結算(壓扁化血流入儀式條) →
 *   一般符號連線 → 中獎演出(1s) → 中央贏分(0.7s) → 消除(0.3s) → 落下補位 → 連爆。
 * 美術與名稱為原創（emoji），非複製任何商業遊戲素材。單機 Demo。
 * 註冊於 window.HL.views.slot。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var rint = function (a, b) { return HL.mock.rint(a, b); };

  var SYM = {
    H1: { ic: "🧛", kind: "high", pay: { 3: 2.5, 4: 4, 5: 8 } },
    H2: { ic: "🐺", kind: "high", pay: { 3: 2, 4: 3, 5: 6 } },
    H3: { ic: "😈", kind: "high", pay: { 3: 1.5, 4: 2.5, 5: 5 } },
    H4: { ic: "🐍", kind: "high", pay: { 3: 1, 4: 2, 5: 4 } },
    H5: { ic: "🦅", kind: "high", pay: { 3: 0.75, 4: 1.5, 5: 3 } },
    M1: { ic: "👻", kind: "med", pay: { 3: 0.5, 4: 1, 5: 1.5 } },
    M2: { ic: "🐕", kind: "med", pay: { 3: 0.4, 4: 0.8, 5: 1.2 } },
    M3: { ic: "🐐", kind: "med", pay: { 3: 0.4, 4: 0.8, 5: 1.2 } },
    M4: { ic: "🦂", kind: "med", pay: { 3: 0.3, 4: 0.6, 5: 0.9 } },
    M5: { ic: "🐦", kind: "med", pay: { 3: 0.3, 4: 0.6, 5: 0.9 } },
    L1: { ic: "🜍", kind: "low", pay: { 3: 0.2, 4: 0.4, 5: 0.6 } },
    L2: { ic: "🜎", kind: "low", pay: { 3: 0.1, 4: 0.2, 5: 0.3 } },
    L3: { ic: "🝳", kind: "low", pay: { 3: 0.1, 4: 0.2, 5: 0.3 } },
    L4: { ic: "🜚", kind: "low", pay: { 3: 0.05, 4: 0.1, 5: 0.15 } },
    L5: { ic: "🜛", kind: "low", pay: { 3: 0.05, 4: 0.1, 5: 0.15 } },
    W: { ic: "🩸", kind: "wild" },
    S: { ic: "❤", kind: "scatter" }
  };
  var REELS = 5, GAP = 8, THRESH = [20, 30, 40, 60, 80], MAXWIN_X = 6666, BETS = [10, 20, 50, 100];
  // 素材載入：放入「自有／已授權」圖檔到 prototype/assets/symbols/（檔名 L1.png…H5.png、W.png、S.png）
  // 後將 ART_ENABLED 改為 true 即自動套用；找不到圖檔會回退 emoji。請勿使用未授權的他人商業素材。
  var ART_ENABLED = false, ART_BASE = "./assets/symbols/";

  // 符號池依儀式等級演進：
  //  lv0(NG)：L1-5 + M1-5（無 H）
  //  lv1：L5→H5、lv2：L4→H4 … lv5(FG)：L 全消、僅 M1-5 + H1-5（10 種）
  function pool(level, cursed) {
    var lv = cursed ? 5 : level, p = [];
    function add(id, n) { for (var i = 0; i < n; i++) p.push(id); }
    var lowCount = Math.max(0, 5 - lv);                                  // 還剩幾種低分符號
    for (var i = 1; i <= lowCount; i++) add("L" + i, 6);
    ["M1", "M2", "M3", "M4", "M5"].forEach(function (m) { add(m, 7); }); // 中分恆在
    for (var h = 6 - lv; h <= 5; h++) if (h >= 1) add("H" + h, 6);       // 已解鎖的高分（lv1:H5 … lv5:H1-5）
    add("W", 2 + lv); add("S", lv >= 5 ? 1 : 2);
    return p;
  }
  function drawSym(level, cursed) { var p = pool(level, cursed); return p[Math.floor(Math.random() * p.length)]; }
  function makeGrid(rows, level, cursed) {
    var g = [];
    for (var r = 0; r < REELS; r++) { var col = []; for (var y = 0; y < rows; y++) col.push(drawSym(level, cursed)); g.push(col); }
    return g;
  }

  // 一般符號 ways 連線（不含 Scatter；Scatter 已先結算移除）
  function evaluate(g, bet) {
    var wins = [], cells = {}, ritual = 0, total = 0;
    Object.keys(SYM).forEach(function (id) {
      var s = SYM[id]; if (s.kind === "wild" || s.kind === "scatter") return;
      var cnt = [], pos = [];
      for (var r = 0; r < g.length; r++) { var c = 0, pp = []; for (var y = 0; y < g[r].length; y++) { if (g[r][y] === id || g[r][y] === "W") { c++; pp.push(y); } } cnt.push(c); pos.push(pp); }
      var n = 0, ways = 1;
      for (var r = 0; r < g.length; r++) { if (cnt[r] > 0) { n++; ways *= cnt[r]; } else break; }
      if (n >= 3 && s.pay[n]) {
        total += Math.round(s.pay[n] * ways * bet);
        wins.push({ id: id, n: n });
        for (var r = 0; r < n; r++) pos[r].forEach(function (y) { cells[r + "_" + y] = true; });
        var per = s.kind === "high" ? 2 : (s.kind === "med" ? 1 : 0); // 高分+2、中分+1、低分不加
        if (per) for (var r = 0; r < n; r++) ritual += per * pos[r].length;
      }
    });
    return { wins: wins, total: total, cells: cells, ritual: ritual };
  }
  function findScatters(g) { var a = []; for (var r = 0; r < g.length; r++) for (var y = 0; y < g[r].length; y++) if (g[r][y] === "S") a.push(r + "_" + y); return a; }

  // 連爆落下：只有被消除格「上方的倖存圖示」往下掉、頂部補新；其餘原地不動
  function tumbleAnimate(removed, cb) {
    var rows = st.grid[0].length, offsets = [];
    for (var r = 0; r < REELS; r++) {
      var k = 0, survivors = [];
      for (var y = 0; y < rows; y++) { if (removed[r + "_" + y]) k++; else survivors.push({ sym: st.grid[r][y], oldY: y }); }
      var col = [], colOff = [];
      for (var i = 0; i < k; i++) { col.push(drawSym(st.level, st.mode === "cursed")); colOff.push(-(k - i)); } // 新符號從盤面上方落下
      survivors.forEach(function (s) { col.push(s.sym); colOff.push(null); });
      // 換算每格落下距離（新位置 - 舊位置；新符號用負索引代表來自上方）
      var finalOff = [];
      for (var ny = 0; ny < col.length; ny++) { finalOff.push(colOff[ny] == null ? (ny - survivors[ny - k].oldY) : (ny - colOff[ny])); }
      st.grid[r] = col; offsets.push(finalOff);
    }
    drawReels(st.grid);
    var fc = reelEl.querySelector(".ax-sym");
    var step = (fc ? fc.getBoundingClientRect().height : 60) + GAP;
    var moved = [];
    for (var r2 = 0; r2 < REELS; r2++) {
      var colEl = reelEl.children[r2];
      for (var y2 = 0; y2 < rows; y2++) {
        var off = offsets[r2][y2];
        if (off > 0) { var cell = colEl.children[y2]; cell.style.transition = "none"; cell.style.transform = "translateY(" + (-(off * step)) + "px)"; moved.push(cell); }
      }
    }
    void reelEl.offsetWidth;
    moved.forEach(function (cell) { cell.style.transition = "transform 0.4s cubic-bezier(.33,.66,.3,1)"; cell.style.transform = "translateY(0)"; });
    setTimeout(cb, 430);
  }

  var st;
  function freshState() { return { bet: 10, rows: 4, level: 0, bar: 0, mode: "base", candle: 0, cursed: 0, grid: null, busy: false, roundWin: 0, spinWin: 0, sticky: {} }; }

  var reelEl, stageEl, barFill, barLevel, winEl, spinBtn, betEl, freeEl, msgEl, buyBtn;

  function symEl(id, cls) {
    var inner;
    if (ART_ENABLED) {
      inner = el("img", { class: "ax-sym__img", src: ART_BASE + id + ".png", alt: id });
      inner.addEventListener("error", function () { var s = el("span", { text: SYM[id] ? SYM[id].ic : "?" }); if (this.parentNode) this.parentNode.replaceChild(s, this); });
    } else {
      inner = el("span", { text: SYM[id] ? SYM[id].ic : "?" });
    }
    return el("div", { class: "ax-sym ax-sym--" + (SYM[id] ? SYM[id].kind : "low") + (cls ? " " + cls : "") }, [inner]);
  }
  function drawReels(g, cells, drop) {
    HL.dom.clear(reelEl);
    reelEl.style.gridTemplateColumns = "repeat(" + REELS + ",1fr)";
    for (var r = 0; r < g.length; r++) {
      var col = el("div", { class: "ax-reel" });
      for (var y = 0; y < g[r].length; y++) {
        var winCell = cells && cells[r + "_" + y];
        col.appendChild(symEl(g[r][y], (winCell ? "is-win" : "") + (drop ? " is-drop" : "")));
      }
      reelEl.appendChild(col);
    }
  }

  function setMsg(t) { if (msgEl) msgEl.textContent = t || ""; }
  function refreshHUD() {
    if (betEl) betEl.textContent = money(st.bet);
    if (winEl) winEl.textContent = money(st.roundWin);
    if (barFill) barFill.style.width = Math.min(100, (st.bar / THRESH[Math.min(st.level, 4)]) * 100) + "%";
    if (barLevel) barLevel.textContent = "儀式 Lv." + st.level + "　" + st.bar + " / " + THRESH[Math.min(st.level, 4)];
    if (freeEl) freeEl.textContent = st.mode === "base" ? "" : (st.mode === "candle" ? "🕯 Candle Spins 剩 " + st.candle : "🔥 Cursed Spins 剩 " + st.cursed);
    HL.shell.refreshChrome();
  }

  // 中央贏分彈出（0.7s）
  function centerPopup(amount) {
    if (!stageEl) return;
    var p = el("div", { class: "ax-slot__pop", text: "+ " + money(amount) });
    stageEl.appendChild(p);
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 750);
  }

  // ===== 滾輪旋轉動畫 =====
  function animateSpin(finalGrid, cb) {
    st.busy = true;
    var rows = finalGrid[0].length;
    HL.dom.clear(reelEl);
    reelEl.style.gridTemplateColumns = "repeat(" + REELS + ",1fr)";
    var wins = [];
    for (var r = 0; r < REELS; r++) { var w = el("div", { class: "ax-reel ax-reel--roll" }); reelEl.appendChild(w); wins.push(w); }
    var cellW = wins[0].clientWidth || 60;
    var step = cellW + GAP, F = 7;
    var strips = [];
    wins.forEach(function (w, r) {
      w.style.height = (rows * cellW + (rows - 1) * GAP) + "px";
      var strip = el("div", { class: "ax-reel__strip" });
      // 最終盤面放最上方：停輪在 translateY(0) 時，視窗顯示的就是最終結果
      for (var y = 0; y < rows; y++) strip.appendChild(symEl(finalGrid[r][y]));
      // 下方為滾動用填充符號
      for (var k = 0; k < F; k++) strip.appendChild(symEl(drawSym(st.level, st.mode === "cursed")));
      strip.style.transition = "none";
      strip.style.transform = "translateY(" + (-(F * step)) + "px)"; // 起始捲到下方填充處
      w.appendChild(strip); strips.push(strip);
    });
    void reelEl.offsetWidth; // reflow
    strips.forEach(function (strip, r) {
      var dur = 0.7 + r * 0.1; // 0.7s 起，逐輪 +0.1s 停輪；往下滾回最終盤面
      strip.style.transition = "transform " + dur + "s cubic-bezier(.2,.75,.25,1)";
      strip.style.transform = "translateY(0)";
    });
    setTimeout(function () { drawReels(finalGrid); cb(); }, (0.7 + (REELS - 1) * 0.1) * 1000 + 120);
  }

  function addRitual(amount) {
    st.bar += amount;
    while (st.level < 5 && st.bar >= THRESH[Math.min(st.level, 4)]) { st.bar -= THRESH[Math.min(st.level, 4)]; st.level++; onLevelUp(); }
  }
  function replaceOnBoard(from, to) {
    if (!st.grid) return;
    for (var r = 0; r < st.grid.length; r++) for (var y = 0; y < st.grid[r].length; y++) if (st.grid[r][y] === from) st.grid[r][y] = to;
  }
  function onLevelUp() {
    var lv = st.level, n = 6 - lv; // lv1→L5/H5、lv2→L4/H4 … lv5→L1/H1
    if (n >= 1 && n <= 5) replaceOnBoard("L" + n, "H" + n); // 先把場上該替換的符號換掉，後續才計算連線
    if (lv >= 5) { st.mode = "cursed"; st.cursed += 6; st.rows = 5; HL.ui.toast("🔥 進入 Cursed Spins！+6 免費", "ok"); setMsg("Cursed Spins：5×5 · 僅 M+H 符號"); }
    else { st.candle += 2; if (st.mode === "base") st.mode = "candle"; HL.ui.toast("🕯 儀式 Lv." + lv + "：L" + n + "→H" + n + "，+2 Candle", "ok"); }
  }

  // ===== 愛心(Scatter)優先：壓扁化血流入儀式條 =====
  function scatterPhase(cb) {
    var scs = findScatters(st.grid);
    if (!scs.length) return cb();
    var map = {}; scs.forEach(function (p) { map[p] = true; });
    drawReels(st.grid);            // 正常繪製（不加 is-win，避免動畫互相覆蓋導致沒被壓扁）
    markSticky();
    reelEl.querySelectorAll(".ax-sym--scatter").forEach(function (n) { n.classList.add("is-crush"); });
    bloodToBar(scs.length);
    setMsg("🩸 獻祭之心流入儀式…");
    setTimeout(function () {
      addRitual(scs.length * 10);
      if (st.mode === "cursed") st.cursed += scs.length; // Cursed 中 +1 免費
      refreshHUD();
      tumbleAnimate(map, function () { setMsg(""); scatterPhase(cb); }); // 補位後再檢查，新落下的愛心也會被壓扁
    }, 950);
  }
  function bloodToBar(n) {
    if (!stageEl) return;
    for (var i = 0; i < n; i++) (function (i) {
      var d = el("div", { class: "ax-blood", text: "🩸" });
      d.style.left = (30 + rint(0, 40)) + "%"; d.style.top = "30%";
      stageEl.appendChild(d);
      setTimeout(function () { d.classList.add("go"); }, 30 + i * 80);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 950);
    })(i);
  }

  // ===== Sticky Wild（第 2-5 輪，免費遊戲中黏在底部，直到中獎或新一注） =====
  function applySticky(g) {
    var rows = g[0].length;
    for (var r = 1; r < REELS; r++) {
      if (st.sticky[r]) { g[r][rows - 1] = "W"; }            // 既有黏性 Wild 固定在底部
      else {
        for (var y = 0; y < rows; y++) {                       // 新落下的 Wild → 下沉到底並變黏性
          if (g[r][y] === "W") { if (y !== rows - 1) g[r][y] = drawSym(st.level, st.mode === "cursed"); g[r][rows - 1] = "W"; st.sticky[r] = true; break; }
        }
      }
    }
  }
  function clearWonSticky(cells) {
    var rows = st.grid[0].length;
    for (var r = 1; r < REELS; r++) if (st.sticky[r] && cells[r + "_" + (rows - 1)]) st.sticky[r] = false;
  }
  function markSticky() {
    if (!reelEl) return;
    var rows = st.grid[0].length;
    for (var r = 1; r < REELS; r++) { if (st.sticky[r]) { var c = reelEl.children[r]; if (c && c.children[rows - 1]) c.children[rows - 1].classList.add("is-sticky"); } }
  }
  // ===== xSplit（Cursed 中，分裂一輪 → 符號 ×2 放大、提升 ways） =====
  function maybeXSplit(g) {
    if (st.mode !== "cursed" || Math.random() > 0.3) return;
    var rows = g[0].length, r = rint(1, REELS - 1), sym = g[r][rint(0, rows - 1)];
    if (sym === "S" || sym === "W") sym = "H" + rint(1, 5);
    for (var y = 0; y < rows; y++) g[r][y] = sym;
    st._xsplit = r + 1;
  }

  // ===== 主流程：愛心優先 → 一般連線 → 演出 → 贏分 → 消除 → 落下 → 連爆 =====
  function processBoard(cb) {
    scatterPhase(function () {                 // 每次連消前都先結算愛心（含補位落下的新愛心）
      var ev = evaluate(st.grid, st.bet);
      if (ev.total <= 0) return cb();
      clearWonSticky(ev.cells);
      drawReels(st.grid, ev.cells); markSticky();   // ① 中獎連線演出（1s）
      setTimeout(function () {
        st.spinWin += ev.total; st.roundWin += ev.total;
        if (ev.ritual) addRitual(ev.ritual);
        refreshHUD();
        centerPopup(ev.total);                       // ② 中央贏分（0.7s）
        if (st.roundWin >= MAXWIN_X * st.bet) { setMsg("💥 THE PACT IS SEALED！最大贏分 " + MAXWIN_X + "x"); return cb(); }
        setTimeout(function () {
          reelEl.querySelectorAll(".ax-sym.is-win").forEach(function (n) { n.classList.add("is-removing"); }); // ③ 消除（0.3s）
          setTimeout(function () {
            tumbleAnimate(ev.cells, function () { markSticky(); setTimeout(function () { processBoard(cb); }, 100); }); // ④ 落下補位 → 連爆
          }, 320);
        }, 720);
      }, 1000);
    });
  }

  function finishRound(cb) {
    if (st.spinWin > 0) HL.state.set({ balance: HL.state.get().balance + st.spinWin });
    refreshHUD();
    st.busy = false;
    if (cb) cb();
  }

  function spin() {
    if (st.busy) return;
    if (st.mode === "base") {
      if (st.bet > HL.state.get().balance) { HL.ui.toast("餘額不足", "err"); return; }
      HL.state.set({ balance: HL.state.get().balance - st.bet });
      st.bar = 0; st.level = 0; st.rows = 4; st.roundWin = 0; st.sticky = {}; setMsg("");
    } else if (st.mode === "candle") { if (st.candle <= 0) return endCandle(); st.candle--; }
    else if (st.mode === "cursed") { if (st.cursed <= 0) return endCursed(); st.cursed--; st.rows = 5; }
    st.spinWin = 0;
    refreshHUD(); updateSpinBtn();
    var g = makeGrid(st.rows, st.level, st.mode === "cursed");
    if (st.mode !== "base") applySticky(g);   // 免費遊戲：黏性 Wild
    maybeXSplit(g);                            // Cursed：xSplit
    st.grid = g;
    if (st._xsplit) { var xr = st._xsplit; st._xsplit = 0; setTimeout(function () { HL.ui.toast("✖ xSplit 分裂！第 " + xr + " 輪", "ok"); }, (0.7 + (REELS - 1) * 0.1) * 1000); }
    animateSpin(g, function () {
      processBoard(function () {
        finishRound(function () {
          if (st.mode === "candle") { st.candle > 0 ? setTimeout(spin, 800) : endCandle(); }
          else if (st.mode === "cursed") { st.cursed > 0 ? setTimeout(spin, 800) : endCursed(); }
          updateSpinBtn();
        });
      });
    });
  }
  // Candle Spins 結束：體驗上接近 Respins，不顯示結算窗，直接回基本玩法
  function endCandle() {
    if (st.mode !== "candle") return;
    HL.ui.toast("Candle Spins 結束", "ok");
    st.mode = "base"; st.level = 0; st.bar = 0; st.candle = 0; st.rows = 4; st.sticky = {};
    refreshHUD(); updateSpinBtn(); setMsg("");
  }
  // Cursed Spins 結束：才是真正的 Free Game，顯示總結算
  function endCursed() {
    HL.ui.modal("Cursed Spins 結束", [
      el("div", { class: "ax-result win" }, [el("div", { class: "ax-result__title", text: "🩸 Free Game 總贏得" }), el("div", { class: "ax-result__amount", text: money(st.roundWin) })]),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料" })
    ]);
    st.mode = "base"; st.level = 0; st.bar = 0; st.candle = 0; st.cursed = 0; st.rows = 4; st.sticky = {};
    refreshHUD(); updateSpinBtn(); setMsg("");
  }
  function updateSpinBtn() {
    if (!spinBtn) return;
    spinBtn.classList.toggle("is-busy", st.busy);
    spinBtn.innerHTML = st.mode === "base" ? "⟳" : (st.mode === "candle" ? "🕯<small>" + st.candle + "</small>" : "🔥<small>" + st.cursed + "</small>");
    if (buyBtn) buyBtn.style.visibility = st.mode === "base" ? "visible" : "hidden";
  }

  function buyMenu() {
    HL.ui.modal("購買功能", [
      el("p", { class: "ax-muted", text: "直接購買進入特色遊戲（Demo · 不扣真錢）：" }),
      el("div", { class: "ax-modal__actions" }, [
        el("button", { class: "ax-btn-ghost", text: "Baphomet Rite — 直升 Lv.3 + 6 Candle（" + money(st.bet * 50) + "）", onClick: function () { closeM(); buyBaphomet(); } }),
        el("button", { class: "ax-btn-ghost", text: "Cursed Spins — +10 免費（" + money(st.bet * 100) + "）", onClick: function () { closeM(); buyCursed(); } })
      ]),
      el("span", { class: "ax-demo-tag", text: "Demo" })
    ]);
  }
  function closeM() { Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m) { m.remove(); }); }
  function buyBaphomet() {
    var cost = st.bet * 50; if (cost > HL.state.get().balance) { HL.ui.toast("餘額不足", "err"); return; }
    HL.state.set({ balance: HL.state.get().balance - cost });
    st.bar = 0; st.level = 3; st.rows = 4; st.roundWin = 0; st.mode = "candle"; st.candle += 6;
    HL.ui.toast("Baphomet Rite：直升 Lv.3 +6 Candle", "ok"); refreshHUD(); updateSpinBtn(); spin();
  }
  function buyCursed() {
    var cost = st.bet * 100; if (cost > HL.state.get().balance) { HL.ui.toast("餘額不足", "err"); return; }
    HL.state.set({ balance: HL.state.get().balance - cost });
    st.bar = 0; st.level = 5; st.mode = "cursed"; st.cursed += 10; st.rows = 5; st.roundWin = 0;
    HL.ui.toast("Cursed Spins：+10 免費", "ok"); refreshHUD(); updateSpinBtn(); spin();
  }

  function buildGame(root) {
    st = freshState();
    reelEl = el("div", { class: "ax-reels" });
    barFill = el("i"); barLevel = el("div", { class: "ax-rb__lv" });
    var barEl = el("div", { class: "ax-rb" }, [el("div", { class: "ax-rb__track" }, [barFill]), barLevel]);
    stageEl = el("div", { class: "ax-slot__stage" }, [reelEl, barEl]);
    winEl = el("b", { class: "ax-gold" }); betEl = el("b"); freeEl = el("div", { class: "ax-slot__free" }); msgEl = el("div", { class: "ax-slot__msg" });

    spinBtn = el("button", { class: "ax-slot__spin", onClick: spin });
    buyBtn = el("button", { class: "ax-slot__rbtn ax-slot__rbtn--buy", title: "購買功能", text: "⭐", onClick: buyMenu });
    function betBtn(d) { return el("button", { class: "ax-slot__rbtn", text: d < 0 ? "−" : "＋", onClick: function () { var i = BETS.indexOf(st.bet) + d; if (i >= 0 && i < BETS.length) { st.bet = BETS[i]; refreshHUD(); } } }); }

    var rail = el("div", { class: "ax-slot__rail" }, [
      buyBtn,
      el("div", { class: "ax-slot__railwin" }, [el("small", { class: "ax-muted", text: "本輪贏得" }), winEl]),
      spinBtn,
      el("div", { class: "ax-slot__betbox" }, [el("small", { class: "ax-muted", text: "押注" }), el("div", { class: "ax-slot__betrow" }, [betBtn(-1), betEl, betBtn(1)])])
    ]);

    var node = el("div", { class: "ax-slot ax-fade-in" }, [
      el("div", { class: "ax-slot__top" }, [
        el("a", { class: "ax-duel__back", text: "‹ 返回娛樂城", onClick: function () { HL.router.go("casino"); } }),
        el("div", { class: "ax-slot__title", text: "暗影儀式 · Shadow Ritual" }),
        el("span", { class: "ax-demo-tag", text: "Demo · 原創主題" })
      ]),
      freeEl,
      el("div", { class: "ax-slot__main" }, [el("div", { class: "ax-slot__left" }, [stageEl, msgEl]), rail]),
      el("p", { class: "ax-muted", style: "text-align:center", text: "1024 ways · 連爆 · 愛心獻祭儀式條 · Candle/Cursed 免費遊戲 · 最大 " + MAXWIN_X + "x" })
    ]);

    HL.dom.clear(root); root.appendChild(node);
    st.grid = makeGrid(4, 0, false);
    drawReels(st.grid);
    refreshHUD(); updateSpinBtn();
  }

  function render() {
    var root = el("div", {});
    var bar = el("i");
    root.appendChild(el("div", { class: "ax-slot-loading" }, [
      el("div", { class: "ax-slot-loading__logo", text: "🩸" }),
      el("div", { class: "ax-slot-loading__name", text: "暗影儀式 · Shadow Ritual" }),
      el("div", { class: "ax-slot-loading__track" }, [bar]),
      el("div", { class: "ax-slot-loading__tip", text: "載入資源中…" })
    ]));
    var pct = 0;
    var iv = setInterval(function () {
      pct += rint(7, 20); if (pct > 100) pct = 100; bar.style.width = pct + "%";
      if (pct >= 100) { clearInterval(iv); setTimeout(function () { buildGame(root); }, 350); }
    }, 180);
    return root;
  }

  HL.views = HL.views || {};
  HL.views.slot = { render: render };
})(window);

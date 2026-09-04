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

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用 HL.shadowRitual）=====================
  // 符號集與賠付表（moved-up：node 端 require 時 HL.dom 不存在，故所有純數學必須在 guard 之前完成）。
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
  var REELS = 5, THRESH = [20, 30, 40, 60, 80], MAXWIN_X = 6666;
  // ── 特色回合經濟參數＝單一真相：CORE(node 鏡像) 與 DOM(動畫) 皆讀此物 ──
  //   2026-08-03 遊戲軌（DEBT S-slot-rtp 前置重構）：原本 CORE 的 _onLevelUp/_maybeXSplit/simulateBuy* 與
  //   DOM 的 onLevelUp/maybeXSplit/buyBaphomet/buyCursed **各寫一份魔數**（xSplit 機率、Candle/Cursed 給數、
  //   買入等級/給數/價格）→ 改一份忘另一份即 node RTP 量測與實玩漂移（正是「驗的即玩的」失真的結構性根因）。
  //   收斂到此 CFG 後：① 兩份共讀＝杜絕漂移 ② 買入價由**單一常數**同時驅動按鈕文字＋扣款（血淚條款第 14 項，
  //   原本 label 與 cost 兩處硬編 50/100）③ 未來重平衡特色回合 RTP 只需改這一塊、node 驗證即反映實玩。
  var CFG = {
    thresh: THRESH, maxWinX: MAXWIN_X,
    xSplitP: 0.3,           // Cursed 中每輪「分裂一輪→整輪同符號」的觸發機率
    candlePerLevel: 2,      // 每次儀式升級（Lv<5）給的 Candle Spins 數
    cursedOnEntry: 6,       // 升到 Lv5 進入 Cursed 時給的免費次數
    buyBaphomet: { level: 3, candle: 6, priceX: 50 },   // Baphomet Rite 買入：直升等級＋Candle 給數＋價（×bet）
    buyCursed: { level: 5, cursed: 10, priceX: 100 }    // Cursed Spins 買入：等級＋免費給數＋價（×bet）
  };

  // pool/drawSym/makeGrid/evaluate/findScatters/tumblePure 為 function 宣告（hoisted）＝在此 CORE 區與下方 DOM 區同一份。
  // ── node 端 RTP 量測：全回合鏡像（忠實對映 DOM 的 spin()/processBoard()/scatterPhase()/免費遊戲迴圈）──
  //   驗證原則：pool/drawSym/makeGrid/evaluate/tumblePure＝「驗的即玩的同一份」（DOM render 亦呼叫這些）；
  //   回合編排（下列 _* 純狀態函式）為 DOM 動畫流程的**忠實無 DOM 鏡像**，其正確性由「關閉 ritual 的純連爆 RTP≈97%
  //   （對齊設計目標）」交叉驗證。**2026-08-03 遊戲軌收斂 CFG（見上）後**：CORE 與 DOM 的特色回合魔數改為共讀
  //   同一 CFG，故 node RTP 量測不再有「鏡像漂移」風險＝驗的即玩的更硬。⚠️ 實測（bet=10，evaluate 對派彩取整故 bet
  //   影響 RTP）：基礎連爆 RTP≈97.7%（健康），但**特色回合（Candle→Cursed 黏性 Wild＋等級鎖高分＋xSplit）暴衝
  //   至全回合 RTP≈1140%、兩買入 586%/530%（皆 ≫100%＝可套利印錢）**。此為既存經濟缺陷（見 DEBT S-slot-rtp）：
  //   根因＝**基礎連爆單獨已吃掉整個 ≤100% 預算**，故正解須「調降賠付表（每個可見贏分都變）＋弱化特色回合＋
  //   重定買入價」＝改動玩法手感、需可靠 preview 逐態手感驗，非 headless 一輪可安全上線（質>量）。node 已驗證一組
  //   達標配置（PAY_SCALE≈0.85、thresh×1.5、xSplitP 0.12、Candle/Cursed 給數減半、買入 50→~21×/100→~233×
  //   ⇒ total≈96.5%、兩買入 buyRTP≤100%），存於 DEBT S-slot-rtp／catalog 待 preview 手感輪落地。本輪只落地
  //   CFG 收斂（零玩法變更、node+preview 驗 browser==node），不動任何數值。
  function _rint(a, b, rng) { return a + Math.floor(rng() * (b - a + 1)); }
  function _replaceOnBoard(grid, from, to) { for (var r = 0; r < grid.length; r++) for (var y = 0; y < grid[r].length; y++) if (grid[r][y] === from) grid[r][y] = to; }
  function _onLevelUp(st) {
    var lv = st.level, n = 6 - lv;
    if (n >= 1 && n <= 5) _replaceOnBoard(st.grid, "L" + n, "H" + n);
    if (lv >= 5) { st.mode = "cursed"; st.cursed += CFG.cursedOnEntry; st.rows = 5; }
    else { st.candle += CFG.candlePerLevel; if (st.mode === "base") st.mode = "candle"; }
  }
  function _addRitual(st, amount) {
    if (st.mode === "cursed") return;
    st.bar += amount;
    while (st.level < 5 && st.bar >= THRESH[Math.min(st.level, 4)]) { st.bar -= THRESH[Math.min(st.level, 4)]; st.level++; _onLevelUp(st); }
  }
  function _applySticky(st, g, rng) {
    var rows = g[0].length;
    for (var r = 1; r < REELS; r++) {
      if (st.sticky[r]) { g[r][rows - 1] = "W"; }
      else { for (var y = 0; y < rows; y++) { if (g[r][y] === "W") { if (y !== rows - 1) g[r][y] = drawSym(st.level, st.mode === "cursed", rng); g[r][rows - 1] = "W"; st.sticky[r] = true; break; } } }
    }
  }
  function _clearWonSticky(st, cells) { var rows = st.grid[0].length; for (var r = 1; r < REELS; r++) if (st.sticky[r] && cells[r + "_" + (rows - 1)]) st.sticky[r] = false; }
  function _maybeXSplit(st, g, rng) {
    if (st.mode !== "cursed" || rng() > CFG.xSplitP) return;
    var rows = g[0].length, r = _rint(1, REELS - 1, rng), sym = g[r][_rint(0, rows - 1, rng)];
    if (sym === "S" || sym === "W") sym = "H" + _rint(1, 5, rng);
    for (var y = 0; y < rows; y++) g[r][y] = sym;
  }
  function _scatterPhase(st, rng) {
    while (true) {
      var scs = findScatters(st.grid); if (!scs.length) return;
      var map = {}; scs.forEach(function (p) { map[p] = true; });
      _addRitual(st, scs.length * 10);
      if (st.mode === "cursed") st.cursed += scs.length;
      st.grid = tumblePure(st.grid, map, st.level, st.mode === "cursed", rng);
    }
  }
  function _runSpin(st, rng, noRitual) {
    st.spinWin = 0;
    while (true) {
      if (noRitual) { while (true) { var sc = findScatters(st.grid); if (!sc.length) break; var mm = {}; sc.forEach(function (p) { mm[p] = true; }); st.grid = tumblePure(st.grid, mm, st.level, false, rng); } }
      else _scatterPhase(st, rng);
      var ev = evaluate(st.grid, st.bet);
      if (ev.total <= 0) return;
      if (!noRitual) _clearWonSticky(st, ev.cells);
      st.spinWin += ev.total; st.roundWin += ev.total;
      if (!noRitual && ev.ritual) _addRitual(st, ev.ritual);
      if (st.roundWin >= MAXWIN_X * st.bet) return;
      st.grid = tumblePure(st.grid, ev.cells, st.level, st.mode === "cursed", rng);
    }
  }
  function _freeSpinLoop(st, rng) {
    var guard = 0;
    while (true) {
      if (st.mode === "candle") {
        if (st.candle <= 0) { st.mode = "base"; break; }
        st.candle--; st.grid = makeGrid(st.rows, st.level, false, rng); _applySticky(st, st.grid, rng); _runSpin(st, rng, false);
      } else if (st.mode === "cursed") {
        if (st.cursed <= 0) { st.mode = "base"; break; }
        st.cursed--; st.rows = 5; st.grid = makeGrid(5, st.level, true, rng); _applySticky(st, st.grid, rng); _maybeXSplit(st, st.grid, rng); _runSpin(st, rng, false);
      } else break;
      if (++guard > 200000) break;
    }
  }
  function _fresh(bet) { return { bet: bet, rows: 4, level: 0, bar: 0, mode: "base", candle: 0, cursed: 0, grid: null, roundWin: 0, spinWin: 0, sticky: {} }; }
  function simulateBase(bet, rng) { var st = _fresh(bet); st.grid = makeGrid(4, 0, false, rng); _runSpin(st, rng, false); _freeSpinLoop(st, rng); return st.roundWin; }
  function simulateBaseCascade(bet, rng) { var st = _fresh(bet); st.grid = makeGrid(4, 0, false, rng); _runSpin(st, rng, true); return st.roundWin; } // 純連爆（關閉 ritual/免費遊戲）＝基礎連爆理論 RTP
  function simulateBaphomet(bet, rng) { var st = _fresh(bet); st.level = CFG.buyBaphomet.level; st.mode = "candle"; st.candle = CFG.buyBaphomet.candle; _freeSpinLoop(st, rng); return st.roundWin; } // 買入：直升 + Candle（價 bet×CFG.buyBaphomet.priceX）
  function simulateCursed(bet, rng) { var st = _fresh(bet); st.level = CFG.buyCursed.level; st.mode = "cursed"; st.cursed = CFG.buyCursed.cursed; st.rows = 5; _freeSpinLoop(st, rng); return st.roundWin; } // 買入：Cursed 免費（價 bet×CFG.buyCursed.priceX）
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // 自動旋轉步進（#9 off-by-one 修正的單一真相）：一次 ×N 自動旋轉必須「恰好跑 N 局基本旋轉」。
  //   舊寫法 `if(st.auto>0){st.auto--; spin}` 是「先檢查再遞減再無條件續」＝檢查在遞減前 ⇒ 啟動那一局沒被計數、×10 實跑 11 局。
  //   正解：每完成一局基本旋轉就 autoStep 一次＝遞減後再決定要不要續（next>0 才續）。啟動局帶 auto=N，跑完 N 局後 next 觸 0 停止。
  //   純函式＝node 可驗（見 checks-games 的 shadow-ritual/autospin-count-exact）；render 閉包三處續轉點（base 續轉／Candle 結束回 base／Cursed 結束回 base）一律走它。
  function autoStep(auto) { var next = auto > 0 ? auto - 1 : 0; return { next: next, cont: next > 0 }; }

  var CORE = {
    SYM: SYM, REELS: REELS, THRESH: THRESH, MAXWIN_X: MAXWIN_X, CFG: CFG,
    pool: pool, drawSym: drawSym, makeGrid: makeGrid, evaluate: evaluate, findScatters: findScatters, tumblePure: tumblePure,
    simulateBase: simulateBase, simulateBaseCascade: simulateBaseCascade, simulateBaphomet: simulateBaphomet, simulateCursed: simulateCursed,
    BUY_BAPHOMET_X: CFG.buyBaphomet.priceX, BUY_CURSED_X: CFG.buyCursed.priceX, mulberry32: mulberry32, autoStep: autoStep
  };
  HL.shadowRitual = CORE;
  if (typeof module !== "undefined" && module.exports) { module.exports = { shadowRitual: CORE }; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.ui) return;
  var el = HL.dom.el;
  var money = HL.dom.money;
  var rint = function (a, b) { return HL.mock.rint(a, b); };                                   // 純美術亂數（血滴位置/載入進度）
  var frnd = function () { return (HL.fair && HL.fair.floatOr) ? HL.fair.floatOr("slot") : Math.random(); }; // 出象亂數＝可驗證公平（一象一 HMAC 浮點、事後可重算；與 Math.random 同一均勻分布＝玩家可見機率零變更）
  function frint(a, b) { return a + Math.floor(frnd() * (b - a + 1)); }                          // 出象用整數（xSplit 選輪/選符號）

  var GAP = 0, BETS = [10, 20, 50, 100]; // GAP=0：符號全出血無縫拼接（SYM/REELS/THRESH/MAXWIN_X 已上移至 CORE 區共用）
  var SLOT_LIVE_SCALE = 0.90; // 真站：對總贏分套莊家利潤 scalar（暗影儀式基礎連爆理論 RTP≈97%；特色回合經濟未校準＝實測全回合 RTP≈1165%，見 DEBT S-slot-rtp。此 scalar 為粗略防護，真正校準需伺服器數學模型＋重平衡特色回合）
  // 素材載入：放入「自有／已授權」圖檔到 prototype/assets/symbols/（檔名 L1.png…H5.png、W.png、S.png）
  // 後將 ART_ENABLED 改為 true 即自動套用；找不到圖檔會回退 emoji。請勿使用未授權的他人商業素材。
    var ART_ENABLED = true, ART_BASE = "./assets/symbols/", GAME_LOGO_SRC = "./assets/shadow-ritual/GAME_LOGO.png";
  // 場景背景依儀式模式切換由 CSS 單一真相負責（components.css .ax-slot__stage / .mode-candle / .mode-cursed 掛 bg0/1/2.jpg），此處不再持第二份 JS 對照表。

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
    add("W", 2 + lv); add("S", lv >= 5 ? 0 : 2);                          // FG（lv5/Cursed）不再出現愛心
    return p;
  }
  function drawSym(level, cursed, rng) { var p = pool(level, cursed); return p[Math.floor((rng || Math.random)() * p.length)]; } // rng 缺省＝Math.random（純美術/向後相容）；出象路徑一律顯式傳 fair
  function makeGrid(rows, level, cursed, rng) {
    var g = [];
    for (var r = 0; r < REELS; r++) { var col = []; for (var y = 0; y < rows; y++) col.push(drawSym(level, cursed, rng)); g.push(col); }
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
  // 純函式落下（供引擎重用，不動 DOM）：回傳新盤面（不 mutate 入參）。cursed/rng 缺省＝向後相容（slotEngine 舊呼叫）。
  function tumblePure(g, cells, level, cursed, rng) {
    var rows = g[0].length, out = [];
    for (var r = 0; r < REELS; r++) {
      var keep = [];
      for (var y = 0; y < rows; y++) if (!cells[r + "_" + y]) keep.push(g[r][y]);
      while (keep.length < rows) keep.unshift(drawSym(level, cursed, rng));
      out.push(keep);
    }
    return out;
  }

  // 連爆落下：只有被消除格「上方的倖存圖示」往下掉、頂部補新；其餘原地不動
  function tumbleAnimate(removed, cb) {
    var rows = st.grid[0].length, offsets = [];
    for (var r = 0; r < REELS; r++) {
      var k = 0, survivors = [];
      for (var y = 0; y < rows; y++) { if (removed[r + "_" + y]) k++; else survivors.push({ sym: st.grid[r][y], oldY: y }); }
      var col = [], colOff = [];
      for (var i = 0; i < k; i++) { col.push(drawSym(st.level, st.mode === "cursed", frnd)); colOff.push(-(k - i)); } // 新符號從盤面上方落下（出象走 fair）
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
  function freshState() { return { bet: 10, rows: 4, level: 0, bar: 0, mode: "base", candle: 0, cursed: 0, grid: null, busy: false, roundWin: 0, spinWin: 0, sticky: {}, auto: 0 }; }

  var reelEl, stageEl, barFill, barLevel, winEl, spinBtn, betEl, freeEl, msgEl, buyBtn, ritualBarEl, autoBtn;
  // Phase 4b｜會員模式：開獎/餘額由伺服器 RPC(slot_spin/slot_buy) 決定並原子結算（防作弊）；
  //   前端只播動畫，spend() 對真實餘額 no-op（餘額僅由伺服器回應設定）。Demo 模式維持前端結算。
  function isMember() { return !!(HL.auth && HL.auth.isMember()); }
  function bal() { return HL.state.get().balance; }
  function spend(delta) { if (!isMember()) HL.state.set({ balance: HL.state.get().balance + delta }); }
  function setBalance(v) { if (v != null) { HL.state.set({ balance: v }); HL.shell.refreshChrome(); } }
  // #63 家族 B 離場自停（rationale/測項見 checks-games.js detached-spin-stops-before-spend）
  function alive() { return !!(reelEl && reelEl.isConnected); }

  function symEl(id, cls) {
    var inner;
    if (ART_ENABLED) {
      // 載入順序：原廠 .png（本機素材）→ .svg（committed 占位）→ emoji，找不到逐級回退
      inner = el("img", { class: "ax-sym__img", src: ART_BASE + id + ".png", alt: id });
      var triedSvg = false;
      inner.addEventListener("error", function () {
        if (!triedSvg) { triedSvg = true; this.src = ART_BASE + id + ".svg"; return; }
        var s = el("span", { text: SYM[id] ? SYM[id].ic : "?" }); if (this.parentNode) this.parentNode.replaceChild(s, this);
      });
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
    if (ritualBarEl) ritualBarEl.style.display = st.mode === "cursed" ? "none" : ""; // FG 移除儀式條
    if (stageEl) { stageEl.classList.toggle("mode-candle", st.mode === "candle"); stageEl.classList.toggle("mode-cursed", st.mode === "cursed"); } // 場景背景改由 CSS class 切換（相對路徑可靠）
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
    var cellH = cellW * (110 / 144);            // Symbol 規格 144×110（非正方形）
    var step = cellH + GAP, F = 7;
    var strips = [];
    wins.forEach(function (w, r) {
      w.style.height = (rows * cellH + (rows - 1) * GAP) + "px";
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
    if (st.mode === "cursed") return; // 已進入 FG：儀式條不再累積
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
    if (lv >= 5) { st.mode = "cursed"; st.cursed += CFG.cursedOnEntry; st.rows = 5; HL.ui.toast("🔥 進入 Cursed Spins！+" + CFG.cursedOnEntry + " 免費", "ok"); setMsg("Cursed Spins：5×5 · 僅 M+H 符號"); }
    else { st.candle += CFG.candlePerLevel; if (st.mode === "base") st.mode = "candle"; HL.ui.toast("🕯 儀式 Lv." + lv + "：L" + n + "→H" + n + "，+" + CFG.candlePerLevel + " Candle", "ok"); }
  }

  // ===== 愛心(Scatter)優先：壓扁化血流入儀式條 =====
  function scatterPhase(cb) {
    var scs = findScatters(st.grid);
    if (!scs.length) return cb();
    var map = {}; scs.forEach(function (p) { map[p] = true; });
    drawReels(st.grid);            // 正常繪製（不加 is-win，避免動畫互相覆蓋導致沒被壓扁）
    markSticky();
    scs.forEach(function (p) {
      var rc = p.split("_"), r = +rc[0], y = +rc[1], col = reelEl.children[r];
      if (col && col.children[y]) col.children[y].classList.add("is-crush"); // 只壓扁心臟本身；上方整排由後續 tumble 一起落下補位
    });
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
          if (g[r][y] === "W") { if (y !== rows - 1) g[r][y] = drawSym(st.level, st.mode === "cursed", frnd); g[r][rows - 1] = "W"; st.sticky[r] = true; break; }
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
    if (st.mode !== "cursed" || frnd() > CFG.xSplitP) return;               // xSplit 觸發＝出象亂數（走 fair）
    var rows = g[0].length, r = frint(1, REELS - 1), sym = g[r][frint(0, rows - 1)];
    if (sym === "S" || sym === "W") sym = "H" + frint(1, 5);
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
    // 真站：客端結算的 slot 總贏分套莊家利潤上限（見 SLOT_LIVE_SCALE）；假站不動、維持爽度
    if (st.spinWin > 0 && !isMember() && HL.site && HL.site.isLive()) st.spinWin = Math.round(st.spinWin * SLOT_LIVE_SCALE);
    if (st.spinWin > 0) spend(st.spinWin);
    if (st.spinWin > 0 && !isMember() && HL.liveStats) HL.liveStats.record("暗影儀式", 0, st.spinWin); // 會員模式贏分改由伺服器回應回報
    refreshHUD();
    var x = st.bet ? st.spinWin / st.bet : 0;
    if (st.spinWin > 0 && x >= 15) { // 大獎慶祝期間維持鎖定，避免手動再轉
      bigWin(st.spinWin, x, function () { st.busy = false; updateSpinBtn(); if (cb) cb(); });
      return;
    }
    st.busy = false;
    if (cb) cb();
  }

  // 大獎慶祝動畫（含贏分 count-up；點擊可略過）
  function bigWin(amount, x, done) {
    if (!stageEl) { if (done) done(); return; }
    var tier = x >= 100 ? { t: "史詩大獎 EPIC WIN", c: "epic" } : x >= 40 ? { t: "超級大獎 MEGA WIN", c: "mega" } : { t: "大獎 BIG WIN", c: "big" };
    var amtEl = el("div", { class: "ax-bigwin__amt", text: money(0) });
    var ov = el("div", { class: "ax-bigwin ax-bigwin--" + tier.c }, [
      el("div", { class: "ax-bigwin__burst" }),
      el("div", { class: "ax-bigwin__title", text: tier.t }),
      amtEl,
      el("div", { class: "ax-bigwin__tip", text: "點擊略過" })
    ]);
    stageEl.appendChild(ov);
    var dur = 1400 + Math.min(1600, x * 8), t0 = null, raf;
    function finish() { if (raf) cancelAnimationFrame(raf); amtEl.textContent = money(amount); setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); if (done) done(); }, 600); }
    var doneOnce = false;
    function end() { if (doneOnce) return; doneOnce = true; finish(); }
    ov.addEventListener("click", end);
    function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur); amtEl.textContent = money(Math.round(amount * p)); if (p < 1 && !doneOnce) raf = requestAnimationFrame(step); else if (!doneOnce) end(); }
    raf = requestAnimationFrame(step);
  }

  // #61/#62 回合中鎖押注/買入（測項 controls-locked-during-round）
  function betLocked() { return st.busy || st.mode !== "base"; }

  function spin() {
    if (!alive()) return;   // #63：離場後續轉在扣款前自停
    if (st.busy) return;
    if (st.mode === "base") {
      if (st.bet > bal()) { HL.ui.toast("餘額不足", "err"); if (st.auto > 0) { st.auto = 0; updateSpinBtn(); } return; } // #7：餘額見底時同步停掉自動旋轉，否則 st.auto 殘留成殭屍計數、下次手動旋轉會自動接續剩下局數（比照 :479 RG 閘與 instant.js 的 stopAuto）
      // #86 負責任博弈：下注前閘。未設限額時 HL.rg.check 恆真＝零回歸（rg/zero-regression 已釘死）。
      // 只閘 base（真正扣款的那一次）；candle/cursed 免費遊戲不扣款故不閘，否則會在免費輪中途被擋成死局。
      // 撞限額時一併關掉自動旋轉——否則 st.auto 會留著假的剩餘次數（同 instant.js:120 的 stopAuto）。
      if (HL.rg && !HL.rg.check(st.bet)) { if (st.auto > 0) { st.auto = 0; updateSpinBtn(); } return; }
      spend(-st.bet);
      // 會員：統計只記「伺服器確認結算」的注與贏分（RPC 失敗時餘額沒動，不能记假投注）；Demo 才同步記
      if (isMember()) HL.api.playSlotSpin(st.bet).then(function (R) { setBalance(R && R.balance); if (R && HL.liveStats) HL.liveStats.record("暗影儀式", st.bet, R.totalWin); }); // 伺服器決定整次旋轉(含特色)總分並原子結算
      else if (HL.liveStats) HL.liveStats.record("暗影儀式", st.bet, 0);
      st.bar = 0; st.level = 0; st.rows = 4; st.roundWin = 0; st.sticky = {}; setMsg("");
    } else if (st.mode === "candle") { if (st.candle <= 0) return endCandle(); st.candle--; }
    else if (st.mode === "cursed") { if (st.cursed <= 0) return endCursed(); st.cursed--; st.rows = 5; }
    st.spinWin = 0;
    refreshHUD(); updateSpinBtn();
    var g = makeGrid(st.rows, st.level, st.mode === "cursed", frnd);        // 出象走 fair（可驗證公平）
    if (st.mode !== "base") applySticky(g);   // 免費遊戲：黏性 Wild
    maybeXSplit(g);                            // Cursed：xSplit
    st.grid = g;
    if (st._xsplit) { var xr = st._xsplit; st._xsplit = 0; setTimeout(function () { HL.ui.toast("✖ xSplit 分裂！第 " + xr + " 輪", "ok"); }, (0.7 + (REELS - 1) * 0.1) * 1000); }
    animateSpin(g, function () {
      processBoard(function () {
        finishRound(function () {
          if (!alive()) return;   // #63：動畫途中換頁 ⇒ 不排下一轉、不彈 modal
          if (st.mode === "candle") { st.candle > 0 ? setTimeout(spin, 800) : endCandle(); }
          else if (st.mode === "cursed") { st.cursed > 0 ? setTimeout(spin, 800) : endCursed(); }
          else if (st.mode === "base" && st.auto > 0) { var _a = CORE.autoStep(st.auto); st.auto = _a.next; if (_a.cont) setTimeout(spin, 700); } // 自動旋轉（#9：autoStep＝遞減後才續，×N 恰跑 N 局）
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
    if (st.auto > 0) { var _a = CORE.autoStep(st.auto); st.auto = _a.next; if (_a.cont) setTimeout(spin, 700); } // #9：特色回合結束回到基本旋轉的續轉，同走 autoStep
  }
  // Cursed Spins 結束：才是真正的 Free Game，顯示總結算
  function endCursed() {
    HL.ui.modal("Cursed Spins 結束", [
      HL.ui.resultBlock(true, "🩸 Free Game 總贏得", money(st.roundWin), null, { share: { game: "暗影儀式 Shadow Ritual" } }),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料" })
    ]);
    st.mode = "base"; st.level = 0; st.bar = 0; st.candle = 0; st.cursed = 0; st.rows = 4; st.sticky = {};
    refreshHUD(); updateSpinBtn(); setMsg("");
    if (st.auto > 0) { var _a = CORE.autoStep(st.auto); st.auto = _a.next; if (_a.cont) setTimeout(spin, 700); } // #9：特色回合結束回到基本旋轉的續轉，同走 autoStep
  }
  function updateSpinBtn() {
    if (!spinBtn) return;
    spinBtn.classList.toggle("is-busy", st.busy);
    spinBtn.innerHTML = st.mode === "base" ? "⟳" : (st.mode === "candle" ? "🕯<small>" + st.candle + "</small>" : "🔥<small>" + st.cursed + "</small>");
    if (buyBtn) buyBtn.style.visibility = st.mode === "base" ? "visible" : "hidden";
    if (autoBtn) {
      var on = st.auto > 0;
      autoBtn.classList.toggle("is-on", on);
      autoBtn.innerHTML = on ? "⏹<small>" + st.auto + "</small>" : "↻";
      autoBtn.title = on ? "停止自動旋轉" : "自動旋轉 ×10";
      autoBtn.setAttribute("aria-label", on ? "停止自動旋轉" : "自動旋轉 ×10");
      autoBtn.style.visibility = st.mode === "base" ? "visible" : "hidden";
    }
  }

  function buyMenu() {
    if (betLocked()) { HL.ui.toast("旋轉中無法購買功能", "warn"); return; }
    HL.ui.modal("購買功能", [
      el("p", { class: "ax-muted", text: "直接購買進入特色遊戲（Demo · 不扣真錢）：" }),
      el("div", { class: "ax-modal__actions" }, [
        el("button", { class: "ax-btn-ghost", text: "Baphomet Rite — 直升 Lv." + CFG.buyBaphomet.level + " + " + CFG.buyBaphomet.candle + " Candle（" + money(st.bet * CFG.buyBaphomet.priceX) + "）", onClick: function () { closeM(); buyBaphomet(); } }),
        el("button", { class: "ax-btn-ghost", text: "Cursed Spins — +" + CFG.buyCursed.cursed + " 免費（" + money(st.bet * CFG.buyCursed.priceX) + "）", onClick: function () { closeM(); buyCursed(); } })
      ]),
      el("span", { class: "ax-demo-tag", text: "Demo" })
    ]);
  }
  function closeM() { HL.ui.closeAll(); }
  function buyBaphomet() {
    if (betLocked()) return;
    var cost = st.bet * CFG.buyBaphomet.priceX; if (cost > bal()) { HL.ui.toast("餘額不足", "err"); return; }
    if (HL.rg && !HL.rg.check(cost)) return;   // #86：買入＝一次大額押注，以實付價入閘
    spend(-cost);
    if (isMember()) HL.api.playSlotBuy("baphomet", st.bet).then(function (R) { setBalance(R && R.balance); if (R && HL.liveStats) HL.liveStats.record("暗影儀式", cost, R.totalWin); });
    else if (HL.liveStats) HL.liveStats.record("暗影儀式", cost, 0);
    st.bar = 0; st.level = CFG.buyBaphomet.level; st.rows = 4; st.roundWin = 0; st.mode = "candle"; st.candle += CFG.buyBaphomet.candle;
    HL.ui.toast("Baphomet Rite：直升 Lv." + CFG.buyBaphomet.level + " +" + CFG.buyBaphomet.candle + " Candle", "ok"); refreshHUD(); updateSpinBtn(); spin();
  }
  function buyCursed() {
    if (betLocked()) return;
    var cost = st.bet * CFG.buyCursed.priceX; if (cost > bal()) { HL.ui.toast("餘額不足", "err"); return; }
    if (HL.rg && !HL.rg.check(cost)) return;   // #86：買入＝一次大額押注，以實付價入閘
    spend(-cost);
    if (isMember()) HL.api.playSlotBuy("cursed", st.bet).then(function (R) { setBalance(R && R.balance); if (R && HL.liveStats) HL.liveStats.record("暗影儀式", cost, R.totalWin); });
    else if (HL.liveStats) HL.liveStats.record("暗影儀式", cost, 0);
    st.bar = 0; st.level = CFG.buyCursed.level; st.mode = "cursed"; st.cursed += CFG.buyCursed.cursed; st.rows = 5; st.roundWin = 0;
    HL.ui.toast("Cursed Spins：+" + CFG.buyCursed.cursed + " 免費", "ok"); refreshHUD(); updateSpinBtn(); spin();
  }

  function toggleAuto() {
    if (st.auto > 0) { st.auto = 0; HL.ui.toast("已停止自動旋轉", "warn"); updateSpinBtn(); return; }
    if (st.mode !== "base") { HL.ui.toast("免費遊戲中無法啟動", "warn"); return; }
    st.auto = 10; HL.ui.toast("自動旋轉 ×10", "ok"); updateSpinBtn();
    if (!st.busy) spin();
  }
  function paytableModal() {
    var rows = [];
    [["H", 5], ["M", 5], ["L", 5]].forEach(function (g) {
      for (var i = 1; i <= g[1]; i++) {
        var id = g[0] + i, s = SYM[id];
        rows.push(el("div", { class: "ax-pt__row" }, [
          el("div", { class: "ax-pt__ic" }, [symEl(id)]),
          el("div", { class: "ax-pt__pays" }, [el("span", { text: "5　x" + s.pay[5] }), el("span", { text: "4　x" + s.pay[4] }), el("span", { text: "3　x" + s.pay[3] })])
        ]));
      }
    });
    rows.push(el("div", { class: "ax-pt__row" }, [el("div", { class: "ax-pt__ic" }, [symEl("W")]), el("div", { class: "ax-pt__pays" }, [el("span", { text: "Wild · 替代除 Scatter 外所有符號" })])]));
    rows.push(el("div", { class: "ax-pt__row" }, [el("div", { class: "ax-pt__ic" }, [symEl("S")]), el("div", { class: "ax-pt__pays" }, [el("span", { text: "Scatter · 儀式 +10（FG 中不出現）" })])]));
    HL.ui.modal("賠付表 · 暗影儀式", [
      el("p", { class: "ax-muted", text: "賠付 = 倍率 × 押注 × ways；1024 ways，連線由最左連到右。" }),
      el("div", { class: "ax-pt" }, rows),
      el("div", { class: "ax-panel" }, [
        el("p", { class: "ax-muted", text: "儀式條 5 級（" + CFG.thresh.join("/") + "）：升級把低分換成高分並給 " + CFG.candlePerLevel + " Candle Spins；Lv.5 進入 Cursed Spins（5×5 僅 M+H）。" }),
        el("p", { class: "ax-muted", text: "Sticky Wild（FG 第 2-5 輪黏底）、xSplit（Cursed 分裂一輪）、最大贏分 " + MAXWIN_X + "x。" })
      ]),
      HL.ui.gameInfoBar({ rtp: "~97%（基礎連爆）", note: "Demo · 特色回合偏慷慨未校準" })
    ], { wide: true });
  }

  function buildGame(root) {
    st = freshState();
    reelEl = el("div", { class: "ax-reels" });
    barFill = el("i"); barLevel = el("div", { class: "ax-rb__lv" });
    ritualBarEl = el("div", { class: "ax-rb" }, [el("div", { class: "ax-rb__track" }, [barFill]), barLevel]);
    stageEl = el("div", { class: "ax-slot__stage" }, [el("div", { class: "ax-reels-window" }, [reelEl]), ritualBarEl]);
    winEl = el("b", { class: "ax-gold" }); betEl = el("b"); freeEl = el("div", { class: "ax-slot__free" }); msgEl = el("div", { class: "ax-slot__msg" });

    spinBtn = el("button", { class: "ax-slot__spin", onClick: spin });
    buyBtn = el("button", { class: "ax-slot__rbtn ax-slot__rbtn--buy", title: "購買功能", "aria-label": "購買功能", text: "⭐", onClick: buyMenu });
    autoBtn = el("button", { class: "ax-slot__rbtn ax-slot__rbtn--auto", title: "自動旋轉 ×10", "aria-label": "自動旋轉 ×10", text: "↻", onClick: toggleAuto });
    function betBtn(d) { return el("button", { class: "ax-slot__rbtn", text: d < 0 ? "−" : "＋", onClick: function () { if (betLocked()) return; var i = BETS.indexOf(st.bet) + d; if (i >= 0 && i < BETS.length) { st.bet = BETS[i]; refreshHUD(); } } }); }

    var rail = el("div", { class: "ax-slot__rail" }, [
      el("div", { class: "ax-slot__railtop" }, [buyBtn, autoBtn]),
      el("div", { class: "ax-slot__railwin" }, [el("small", { class: "ax-muted", text: "本輪贏得" }), winEl]),
      spinBtn,
      el("div", { class: "ax-slot__betbox" }, [el("small", { class: "ax-muted", text: "押注" }), el("div", { class: "ax-slot__betrow" }, [betBtn(-1), betEl, betBtn(1)])])
    ]);

    var memberBanner = isMember() ? el("div", { class: "ax-practice" }, [
      el("span", { text: "🔒 伺服器結算 · 開獎與餘額由後端決定（防作弊）" })
    ]) : null;

    var node = el("div", { class: "ax-slot ax-fade-in" }, [
      el("div", { class: "ax-slot__top" }, [
        el("div", { class: "ax-slot__title", text: "暗影儀式 · Shadow Ritual" }),
        el("div", { class: "ax-slot__topr" }, [
          el("button", { class: "ax-slot__info", title: "賠付表", text: "ℹ 賠付表", onClick: paytableModal }),
          el("span", { class: "ax-demo-tag", text: "Demo · 原創主題" })
        ])
      ]),
      memberBanner,
      freeEl,
      el("div", { class: "ax-slot__main" }, [el("div", { class: "ax-slot__left" }, [stageEl, msgEl]), rail]),
      el("p", { class: "ax-muted", style: "text-align:center", text: "1024 ways · 連爆 · 愛心獻祭儀式條 · Candle/Cursed 免費遊戲 · 最大 " + MAXWIN_X + "x" })
    ]);

    HL.dom.clear(root); root.appendChild(node);
    st.grid = makeGrid(4, 0, false);
    drawReels(st.grid);
    refreshHUD(); updateSpinBtn();
  }

  var GAME_META = { title: "暗影儀式 Shadow Ritual", provider: "Apex Studio", key: "slot" };
  function render() {
    // 子母畫面播放中又回到 slot 頁 → 取回 PiP 的遊戲、重建外框（不重新載入）
    if (HL.gameFrame && HL.gameFrame.resumeFrame) {
      var resumed = HL.gameFrame.resumeFrame("slot");
      if (resumed) return resumed;
    }
    var root = el("div", {});
    var bar = el("i");
    // 遊戲 Logo：原廠 PNG（本機占位，之後換成自製/授權）→ 載入失敗回退 🩸 emoji
    var logoImg = el("img", { class: "ax-slot-loading__logoimg", src: GAME_LOGO_SRC, alt: "Shadow Ritual" });
    var logoBox = el("div", { class: "ax-slot-loading__logo" }, [logoImg]);
    logoImg.addEventListener("error", function () { HL.dom.clear(logoBox); logoBox.appendChild(el("span", { text: "🩸" })); });
    root.appendChild(el("div", { class: "ax-slot-loading" }, [
      logoBox,
      el("div", { class: "ax-slot-loading__name", text: "暗影儀式 · Shadow Ritual" }),
      el("div", { class: "ax-slot-loading__track" }, [bar]),
      el("div", { class: "ax-slot-loading__tip", text: "載入資源中…" })
    ]));
    var pct = 0;
    var iv = setInterval(function () {
      if (!bar.isConnected) { clearInterval(iv); return; } pct += rint(7, 20); if (pct > 100) pct = 100; bar.style.width = pct + "%";
      if (pct >= 100) { clearInterval(iv); setTimeout(function () { buildGame(root); }, 350); }
    }, 180);
    // 外框公版：把遊戲嵌入通用視窗（全螢幕/劇院/實時統計/子母畫面）
    return HL.gameFrame ? HL.gameFrame.wrap(root, GAME_META) : root;
  }

  HL.views = HL.views || {};
  HL.views.slot = { render: render };
  // 對外引擎（供「對押競技」重用 FG 計算與符號渲染）
  HL.slotEngine = {
    FG_LEVEL: 5,
    makeGrid: function (rows, level, rng) { return makeGrid(rows, level, false, rng); }, // rng 選填：注入可驗證公平（fgBoard/vsslot 用）；省略＝Math.random 向後相容
    drawSym: function (level, rng) { return drawSym(level, false, rng); },               // 同上：出象路徑顯式傳 fair、純美術省略
    evaluate: evaluate,
    tumble: tumblePure,
    symEl: function (id) { return symEl(id); }
  };
})(typeof window !== "undefined" ? window : this);

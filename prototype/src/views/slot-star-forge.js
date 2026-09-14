/*
 * Apex Win｜星鑄 Star Forge ⚒️（6×6 cluster-merge / 符號 9 級 level-up · 忠實復刻 BGaming「Space Knight Merge Up 2」格式 · 原創星際鍛造主題）
 * ─────────────────────────────────────────────────────────────────────
 * 新互動維度（ApexWin 現有 27 款皆無）＝**符號等級演進（9 級 tier progression）**：
 *   相連的同階符號成群就「合併升階」——整群消失、於錨點生成 **一個高一階**的符號。
 *   低階合併**不計獎**（純進度），只有升出 **T5 以上**才計獎 ⇒ 玩家看的是「這一串連鎖能爬到第幾階」，
 *   而不是「這一轉中了多少線」。既有 Gem Storm 是 pay-anywhere（與位置無關）、Emerald Sprite 是
 *   cluster-adjacency（連通就賠、符號不變），**都沒有「符號會變成另一個符號」這一層**。
 * ⚠️ 成群門檻**隨階級遞減**（CFG.need：低階 4 塊、高階 2 塊、T9 一顆就結晶）。這不是調味，
 *   是讓 9 級階梯真的到得了的唯一辦法——固定 4 時實測 20,000 局內 T6 以上 0 次、💣 0 顆、T9 0 次，
 *   而所有數值測項照樣全綠。詳見 CFG.need 的註與 intel/star-forge-tier-ladder-2026-09-14.md。
 * 位置乘數（canonical）：同一格每次**中獎**乘數翻倍，×2 起、上限 ×128。base 局只翻錨點；
 *   **免費遊戲翻整群每一格**（升溫引擎）且**整段不重置**——連同「T≥5 符號跨轉不冷卻」的黏著盤，
 *   合起來就是本作的招牌張力，也是 10000× 尾巴與 T7 以上的唯一來源。
 * 炸彈（base 局限定）：base 局的階梯到 CFG.bombTier(=6) 為止——該階成群會**過熱炸開**生 💣，
 *   下一拍引爆清掉周圍 8 格、把那 8 格乘數各翻一倍，自身轉為 🌀 躍遷信標。
 *   **T7 以上只存在於免費遊戲** ⇒ 「base 帶你進熔爐、熔爐帶你上頂階」。
 *   （canonical 寫 T8 成群生 💣；我們的階梯在 base 局爬不到 T8，照抄就是 0 顆炸彈 ⇒ 刻意下移，見 catalog note）
 * 🌀≥3 觸發免費遊戲 13/16/21/31 轉（轉中 🌀≥3 再 +6）。三種買入（canonical 的 3-buy 結構）。
 * RTP 96.5%（宣告·**分層估計**定版：base局期望 + 觸發率 × E[免費整段]，CI95 ±0.125pp）。
 *   波動 medium–high（端到端 SD 10.80）。max 10000×（硬上限，實測觀測到 + 構造式證明）。
 *   命中 67.3%（任何派彩）／**12.5%（≥1× 本金）**——畫面上的輸贏一律以 **≥1× 本金**為界，不是以 0 為界。
 * 可驗證公平：一注一 HL.fair 種子 → 決定性 PRNG（mulberry32）跑完整局（base + 免費所有轉、
 *   所有補位、所有炸彈），單一 float 可事後重算整局。
 * 掛 HL.instant.betPanel 共用引擎（金流/autobet/中央結算掛鉤 liveStats.record 通吃 VIP/任務/返水/JP/帳本）。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學。
 * 樣式隨本檔延遲載入（manifest 的 css 欄位）＝首屏零位元組，見 data/lazy-games.js。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var COLS = 6, ROWS = 6, CELLS = COLS * ROWS, MAXWIN = 10000;
  // 符號編碼：0=空、1..9=階級 T1..T9、10=🌀 scatter、11=💣 bomb
  var EMPTY = 0, TOPTIER = 9, SCAT = 10, BOMB = 11;

  // 賠付（×總注）：pay = PAY[升出的階] × 群大小 × 該格位置乘數。
  //   PAY[10] ＝ T9 成群（頂階、不再升階）的整群賠付。
  //   ⚠️ RTP 對整個 PAY 向量嚴格線性 ⇒ 定版時只需解一個比例係數（見 gate_log 的校準法）。
  var PAY = { 5: 0.42, 6: 1.9, 7: 9.4, 8: 52, 9: 310, 10: 1500 };
  // 設計比例（上表）× **單一校準鈕**（CFG.payScale）＝實付。RTP 對 payScale 嚴格線性 ⇒ 定版只要解一個數。
  function payOf(key){ return PAY[key] * CFG.payScale; }

  var CFG = {
    /* 成群門檻**隨階級遞減**：低階要 4 塊才熔得動，高階 2 塊就能對撞。
     * ⚠️ 這不是調味，是**讓 9 級階梯真的到得了**的唯一辦法：每升一階要消耗 need 個同階符號，
     *   固定 need=4 時逐階質量 ÷4 且「4 個要正交相鄰」在高階幾乎不可能——實測 20,000 局內
     *   T5 只升出 412 次、**T6 以上 0 次、炸彈 0 顆、T9 群 0 次** ⇒ PAY[7..10]、💣、頂階整群
     *   全部是「寫在說明裡而程式永遠走不到」的裝飾（CLAUDE.md §4「承諾與行為不一致」家族）。
     *   遞減門檻讓每一階的實際可達性都被 checks-games 的 tier-ladder-reachable 常駐盯著。 */
    need: [0, 4, 4, 4, 3, 3, 2, 2, 2, 1],   // index = 階級 T1..T9（[0] 不用；T9=1 ⇒ 一出現就結晶兌現）

    tierW: [0.52, 0.32, 0.16],     // 新生符號只出 T1/T2/T3（T4..T9 只能靠合併升上去）
    scat: 0.0080,                  // 🌀 落地率（**只在每一轉的初始盤面**；連鎖補位一律不生）
    bombTier: 6,                   // base 局「過熱」階（該階成群 → 💣）；T7 以上為免費遊戲限定
    stickyFrom: 5,                 // 免費遊戲中「不冷卻」的階級下界（T5 以上跨轉保留）
    pmCap: 128,                    // 位置乘數上限（canonical ×128）
    fsSpins: { 3: 13, 4: 16, 5: 21, 6: 31 },
    fsRetrig: 6,                   // 免費中 🌀≥3 → +6 轉
    buyStartPm: 2,                 // 買入 B/C：每格起始乘數
    payScale: 0.0796470,           // ⭐ RTP 校準鈕（唯一）：實付 = PAY[階] × payScale × 群大小 × 位置乘數
    maxWin: MAXWIN,
    rtp: 0.965                     // 宣告 RTP（買入價的唯一驅動來源，見 buyPrice）
  };

  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  // idx = c*ROWS + r（column-major；r=0 為頂端、重力往 r 大的方向落）
  function rowOf(i){ return i % ROWS; }
  function colOf(i){ return (i / ROWS) | 0; }

  // 新生符號：allowScat=true 只用於「每一轉的初始盤面」。
  //   ⚠️ 補位不得生 🌀——否則一次長連鎖就能無限重新觸發免費遊戲，RTP 與段長雙雙失控
  //   （同 emerald-sprite 立過的那一條，見 checks-games 的兩向斷言）。
  function drawSym(rng, allowScat) {
    if (allowScat && rng() < CFG.scat) return SCAT;
    var r = rng(), w = CFG.tierW;
    if (r < w[0]) return 1;
    if (r < w[0] + w[1]) return 2;
    return 3;
  }

  function newGrid(rng) {
    var g = new Int8Array(CELLS), i;
    for (i = 0; i < CELLS; i++) g[i] = drawSym(rng, true);
    return g;
  }
  function countScat(g){ var n = 0, i; for (i = 0; i < CELLS; i++) if (g[i] === SCAT) n++; return n; }

  /* 找出所有「同階且正交相連、大小 ≥ minCluster」的群。
   * 回傳 [{tier, cells:[idx...], anchor}]，anchor＝群中最底、同底則最左的格（升階符號落在這裡）。
   * ⭐ 這是本款存在的理由：退化成「數盤面上有幾個同階符號」（pay-anywhere）畫面完全正常、
   *    RTP 只差一點點，而新維度當場消失 ⇒ checks-games 用構造盤兩個方向打它。 */
  var _seen = new Int32Array(CELLS), _gen = 0, _stack = new Int32Array(CELLS), _cells = new Int32Array(CELLS);
  function findClusters(g) {
    var out = null, i, j;
    _gen++;
    for (i = 0; i < CELLS; i++) {
      var t = g[i];
      if (_seen[i] === _gen || t < 1 || t > TOPTIER) continue;
      _seen[i] = _gen; _stack[0] = i; _cells[0] = i;
      var sp = 1, nc = 1, anchor = i, ar = rowOf(i), ac = colOf(i);
      while (sp) {
        var cur = _stack[--sp], r = rowOf(cur), c = colOf(cur);
        for (j = 0; j < 4; j++) {
          var n = j === 0 ? (r > 0 ? cur - 1 : -1)
                : j === 1 ? (r < ROWS - 1 ? cur + 1 : -1)
                : j === 2 ? (c > 0 ? cur - ROWS : -1)
                : (c < COLS - 1 ? cur + ROWS : -1);
          if (n < 0 || _seen[n] === _gen || g[n] !== t) continue;
          _seen[n] = _gen; _stack[sp++] = n; _cells[nc++] = n;
          var nr = rowOf(n), ncl = colOf(n);
          if (nr > ar || (nr === ar && ncl < ac)) { anchor = n; ar = nr; ac = ncl; }
        }
      }
      if (nc >= CFG.need[t]) {
        var cells = new Array(nc);
        for (j = 0; j < nc; j++) cells[j] = _cells[j];
        (out = out || []).push({ tier: t, cells: cells, anchor: anchor });
      }
    }
    if (out && out.length > 1) out.sort(function (a, b) { return a.anchor - b.anchor; });
    return out || EMPTY_LIST;
  }
  var EMPTY_LIST = [];

  function bump(pm, i) { var v = pm[i] * 2; pm[i] = v > CFG.pmCap ? CFG.pmCap : v; return pm[i]; }

  /* 一個「拍」＝① 先引爆盤上既有的 💣 ② 掃群、合併升階、計獎 ③ 重力 + 補位。
   * 回傳本拍的事件（給演出用）與贏額（×總注）。沒有可解的東西時回 null＝連鎖結束。 */
  function stepOnce(rng, g, pm, isFS, rec) {
    var i, j, win = 0, blasts = null, merges = null, acted = false;

    // ① 炸彈引爆：清周圍 8 格、那 8 格乘數各翻倍、自身轉 🌀（canonical）
    for (i = 0; i < CELLS; i++) {
      if (g[i] !== BOMB) continue;
      acted = true;
      var br = rowOf(i), bc = colOf(i), hit = [];
      for (var dc = -1; dc <= 1; dc++) for (var dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue;
        var nc = bc + dc, nr = br + dr;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        var ni = nc * ROWS + nr;
        if (g[ni] === SCAT) continue;               // 信標不被炸掉
        g[ni] = EMPTY; bump(pm, ni); hit.push(ni);
      }
      g[i] = SCAT;
      if (rec) { blasts = blasts || []; blasts.push({ at: i, hit: hit }); }
    }

    // ② 掃群 → 合併升階 → 計獎
    var cls = findClusters(g);
    for (i = 0; i < cls.length; i++) {
      var cl = cls[i], T = cl.tier, n = cl.cells.length, a = cl.anchor;
      var produced, payKey;
      /* 升階／炸彈／頂階三選一：
       *  · base 局的階梯到 CFG.bombTier 為止——該階成群會**過熱炸開**（生 💣），下一拍引爆後轉 🌀，
       *    ＝基礎局通往免費遊戲的第二條路。**T7 以上只存在於免費遊戲**（熔爐裡才煉得出來）。
       *  · 免費遊戲照常一路往上升到 T9。
       *  · T9 成群＝頂階、不再升階，整群賠 PAY[10]。 */
      if (!isFS && T === CFG.bombTier) { produced = BOMB; payKey = T + 1; }
      else if (T <= 7) { produced = T + 1; payKey = T + 1; }
      else if (T === 8) { produced = 9; payKey = 9; }
      else { produced = EMPTY; payKey = 10; }
      // 位置乘數：**只有計獎的那一次**才翻倍（canonical「每次同格中獎翻倍」）。
      //   ⚠️ 曾試過「免費遊戲中每一次合併都推進」＝RTP 直接失控到 11,000%（低階合併每轉數十次）。
      var pays = payKey >= 5, mult = 1;
      if (pays) {
        // 免費遊戲：計獎合併把**整群每一格**的乘數各翻一倍（base 局只翻錨點）＝免費段的升溫引擎，
        //   配合「整段不重置」就是本作的招牌張力，也是 RTP 中 bonus 佔比的主要來源。
        if (isFS) { for (j = 0; j < n; j++) if (cl.cells[j] !== a) bump(pm, cl.cells[j]); }
        mult = bump(pm, a);
        win += payOf(payKey) * n * mult;
      }
      for (j = 0; j < n; j++) g[cl.cells[j]] = EMPTY;
      if (produced !== EMPTY) g[a] = produced;
      acted = true;
      if (rec) { merges = merges || []; merges.push({ tier: T, size: n, anchor: a, cells: cl.cells.slice(), produced: produced, pay: pays ? payOf(payKey) * n * mult : 0, mult: pays ? mult : 0 }); }
    }
    if (!acted) return null;

    // ③ 重力 + 補位（補位不生 🌀）
    for (var c = 0; c < COLS; c++) {
      var base = c * ROWS, write = ROWS - 1;
      for (var r = ROWS - 1; r >= 0; r--) {
        var v = g[base + r];
        if (v !== EMPTY) { g[base + write] = v; write--; }
      }
      for (; write >= 0; write--) g[base + write] = drawSym(rng, false);
    }
    return { win: win, merges: merges, blasts: blasts };
  }

  /* 一轉（base 或免費）：建盤 → 連鎖跑到收斂。pm 由呼叫端持有（免費遊戲整段共用）。
   * keep＝免費遊戲的「不冷卻」黏著盤（見 playFS）：開盤後把上一轉留下的 T≥stickyFrom 蓋回原格。 */
  function spinOnce(rng, pm, isFS, rec, preBomb, keep) {
    var g = newGrid(rng), ki;
    if (keep) for (ki = 0; ki < CELLS; ki++) if (keep[ki] >= CFG.stickyFrom) g[ki] = keep[ki];
    if (preBomb) g[(2 * ROWS) + 3] = BOMB;              // 買入 C：引信預置（固定格，非抽樣）
    var win = 0, steps = rec ? [] : null, guard = 0, s;
    if (rec) steps.push({ grid: Array.prototype.slice.call(g), pm: Array.prototype.slice.call(pm), win: 0, merges: null, blasts: null });
    while (guard++ < 400) {
      s = stepOnce(rng, g, pm, isFS, rec);
      if (!s) break;
      win += s.win;
      if (rec) steps.push({ grid: Array.prototype.slice.call(g), pm: Array.prototype.slice.call(pm), win: s.win, merges: s.merges, blasts: s.blasts });
    }
    return { win: win, scat: countScat(g), steps: steps, cascades: guard - 1, grid: g };
  }

  function fsCount(n){ return CFG.fsSpins[n >= 6 ? 6 : n] || 0; }

  /* 免費遊戲一整段。spins＝轉數；opts.startPm／opts.preBomb 為買入變體。
   * ⭐ 兩件事整段不重置，合起來就是本作的招牌張力，也是 10000× 尾巴與 9 級階梯的唯一來源：
   *   ① **位置乘數**不重置；
   *   ② **T≥5 的符號「不冷卻」**——轉與轉之間留在原格（黏著盤）。少了②，高階符號每轉都被
   *      洗掉重來，實測 20,000 局 **T7 以上一次都升不出來**、💣 與 T9 群永遠是死字（見 CFG.need 的註）。 */
  function playFS(rng, spins, rec, opts) {
    opts = opts || {};
    var pm = new Float64Array(CELLS), i;
    for (i = 0; i < CELLS; i++) pm[i] = opts.startPm || 1;
    var keep = new Int8Array(CELLS);
    var left = spins, planned = spins, no = 0, win = 0, list = rec ? [] : null, guard = 0;
    while (left > 0 && guard++ < 400) {
      left--; no++;
      var pre = opts.preBomb && no === 1;
      var s = spinOnce(rng, pm, true, rec, pre, keep), add = 0;
      if (s.scat >= 3) { add = CFG.fsRetrig; left += add; planned += add; }
      win += s.win;
      for (i = 0; i < CELLS; i++) keep[i] = s.grid[i] >= CFG.stickyFrom && s.grid[i] <= TOPTIER ? s.grid[i] : 0;
      if (rec) list.push({ s: s, no: no, planned: planned, retrig: add, win: s.win });
    }
    return { win: win, spins: list, count: planned };
  }

  /* 整局：base 一轉（+可能的免費遊戲）。rec=true 時保留時間軸給演出。 */
  function simSpin(rng, rec) {
    var pm = new Float64Array(CELLS), i;
    for (i = 0; i < CELLS; i++) pm[i] = 1;
    var b = spinOnce(rng, pm, false, rec, false);
    var trig = b.scat >= 3, fs = null, fsWin = 0;
    if (trig) { fs = playFS(rng, fsCount(b.scat), rec, {}); fsWin = fs.win; }
    var total = b.win + fsWin;
    if (total > CFG.maxWin) total = CFG.maxWin;
    return { mult: total, base: b, baseWin: b.win, fsWin: fsWin, fs: fs, trig: trig, scat: b.scat };
  }

  // node RTP 驗證器入口（與玩家玩的同一份數學；rec=false 不改抽樣順序）
  function fullSpin(rng) {
    var r = simSpin(rng, false);
    return { win: r.mult, base: r.baseWin, fs: r.fsWin, trig: r.trig, scat: r.scat, cascades: r.base.cascades };
  }

  /* ── 三種買入（canonical 的 3-buy 結構）────────────────────────────────────
   * BUYS 的 `ev` ＝該路徑的實測期望倍數（保真閘第 14 項的量測結果，見 games-catalog gate_log）。
   * **價格由單一程式常數求值**（buyPrice）同時驅動按鈕文字與扣款——禁止兩處硬編（Dead By Noon 血訓）。
   * 觸發轉數：買入不走 🌀，改由 BUY_SPINS 的權重抽（＝自然觸發的階梯分布，實測比例）。 */
  var BUY_SPINS = { vals: [13, 16, 21, 31], wts: [0.9375, 0.0588, 0.0036, 0.0001] };
  var BUYS = [
    { key: "std",  name: "標準鍛造", ev: 87.06,  spins: 0,  startPm: 1, preBomb: false },
    { key: "dual", name: "雙倍熔爐", ev: 132.84, spins: 0,  startPm: 2, preBomb: false },
    { key: "full", name: "熔爐全開", ev: 566.75, spins: 31, startPm: 2, preBomb: true  }
  ];
  function buyPrice(b){ return Math.round(b.ev / CFG.rtp); }     // ⇐ 唯一價格來源
  function buyOf(key){ var i; for (i = 0; i < BUYS.length; i++) if (BUYS[i].key === key) return BUYS[i]; return null; }
  function drawBuySpins(rng) {
    var r = rng(), a = 0, i;
    for (i = 0; i < BUY_SPINS.vals.length; i++) { a += BUY_SPINS.wts[i]; if (r < a) return BUY_SPINS.vals[i]; }
    return BUY_SPINS.vals[0];
  }
  function simBuy(rng, key, rec) {
    var b = buyOf(key) || BUYS[0];
    var fs = playFS(rng, b.spins || drawBuySpins(rng), rec, { startPm: b.startPm, preBomb: b.preBomb });
    var total = fs.win > CFG.maxWin ? CFG.maxWin : fs.win;
    return { mult: total, fs: fs, buy: b, price: buyPrice(b) };
  }

  /* 免費遊戲 HUD 此刻該顯示的總轉數（純函式·node 可驗）。
   * landed=false（盤面還在落定）時必須回**還沒加上本轉 retrigger** 的數字——
   * sp.planned 已經含了本轉加的轉數，落定前就寫上去＝**結果先被說出口**
   * （保真閘第 9 項 client 不可偷看／第 10 項期待感；emerald-sprite 2026-09-13 正是在這一格被抓到）。 */
  function fsHudSpins(sp, landed) { return landed ? sp.planned : sp.planned - sp.retrig; }

  /* 節拍配速（純函式·node 可驗·刻意住在數學區）：一局動輒 20+ 拍、免費段 300+ 拍 ⇒ 不能每拍固定毫秒。
   * 給一個總預算，除以拍數並夾在 [min,max]；極速模式走 fast 常數。
   * ⚠️ 住在數學區而非 render 區，是因為 node 走不到 render 區（HL.dom 不存在就提前返回）
   *   ⇒ 放在下面就等於「寫著可驗、實際驗不到」。 */
  function paceOf(steps, budget, min, max, fast) {
    if (fast) return 10;
    if (steps <= 0) return max;
    var d = Math.round(budget / steps);
    return d < min ? min : (d > max ? max : d);
  }

  // 落定排程（純函式·node 可驗）：逐欄由左而右落定；極速模式一次到位。語意同 gem-storm/abyssal-surge。
  function revealPlan(cols, fast){ if (fast) return [cols]; var p = [], i; for (i = 0; i <= cols; i++) p.push(i); return p; }

  HL.starForge = { simSpin: simSpin, fullSpin: fullSpin, spinOnce: spinOnce, playFS: playFS, simBuy: simBuy,
    findClusters: findClusters, stepOnce: stepOnce, newGrid: newGrid, drawSym: drawSym, countScat: countScat,
    mulberry32: mulberry32, revealPlan: revealPlan, fsCount: fsCount, buyPrice: buyPrice, buyOf: buyOf,
    drawBuySpins: drawBuySpins, bump: bump, rowOf: rowOf, colOf: colOf, paceOf: paceOf, fsHudSpins: fsHudSpins,
    PAY: PAY, payOf: payOf, CFG: CFG, BUYS: BUYS, BUY_SPINS: BUY_SPINS,
    COLS: COLS, ROWS: ROWS, CELLS: CELLS, EMPTY: EMPTY, SCAT: SCAT, BOMB: BOMB, TOPTIER: TOPTIER };
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.starForge; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el;
  var fmtX = HL.dom && HL.dom.fmtX;

  var GLYPH = { 0: "", 1: "⚙️", 2: "🔩", 3: "🧲", 4: "🔋", 5: "🔶", 6: "🔷", 7: "💠", 8: "🌟", 9: "🛡️", 10: "🌀", 11: "💣" };
  function symChar(v){ return GLYPH[v] !== undefined ? GLYPH[v] : ""; }
  // 落定前的裝飾符池（刻意排除 🌀/💣——未落定的格子顯示信標或炸彈會謊報結果）
  var SPIN_SYMS = [1, 2, 3, 1, 2, 3, 4];
  function spinChar(){ return symChar(SPIN_SYMS[(Math.random() * SPIN_SYMS.length) | 0]); }   // 視覺裝飾·非公平關鍵

  function forgeGame() {
    var board = el("div", { class: "ax-forge__board" });
    var modeBadge = el("div", { class: "ax-forge__mode", text: "6×6 · 合併升階 · 9 級星鑄" });
    var spinBadge = el("div", { class: "ax-forge__resp", style: "display:none" });
    var potBadge = el("div", { class: "ax-forge__pot", style: "display:none" });
    var tierBadge = el("div", { class: "ax-forge__tier", style: "display:none" });
    var stage = el("div", { class: "ax-forge__stage" }, [
      el("div", { class: "ax-forge__hud" }, [ modeBadge, spinBadge, potBadge, tierBadge ]),
      board
    ]);
    var history = HL.ui.histBar({ cls: "ax-forge__hist", itemCls: "ax-forge__pill", max: 12, fair: true });

    function beat(name){ if (stage.dataset) stage.dataset.beat = name; }
    function delay(ms){ return new Promise(function (r){ setTimeout(r, ms); }); }

    /* 畫盤。opts.stoppedCols＝左邊幾欄已落定（其餘畫裝飾符）；opts.mark＝要高亮的格（合併中）；
     * opts.blast＝被炸掉的格；opts.pm＝位置乘數陣列（>1 才畫角標）。 */
    function draw(grid, pm, opts) {
      opts = opts || {};
      var stopped = opts.stoppedCols === undefined ? COLS : opts.stoppedCols;
      var mark = opts.mark || {}, blast = opts.blast || {};
      board.innerHTML = "";
      var c, r;
      for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
        var i = c * ROWS + r, live = c < stopped, v = live && grid ? grid[i] : EMPTY;
        var cls = "ax-forge__cell";
        if (!live) cls += " is-spin";
        else {
          if (v >= 1 && v <= TOPTIER) cls += " is-t" + v;
          if (v === SCAT) cls += " is-scat";
          if (v === BOMB) cls += " is-bomb";
          if (mark[i]) cls += " is-merge";
          if (blast[i]) cls += " is-blast";
        }
        var kids = [ el("span", { class: "ax-forge__sym", text: live ? symChar(v) : spinChar() }) ];
        if (live && pm && pm[i] > 1) kids.push(el("span", { class: "ax-forge__pm", text: "×" + pm[i] }));
        board.appendChild(el("div", { class: cls }, kids));
      }
    }

    function pop(text, cls) {
      var n = el("div", { class: "ax-forge__pop " + (cls || ""), text: text });
      stage.appendChild(n);
      setTimeout(function (){ if (n.parentNode) n.parentNode.removeChild(n); }, 1300);
    }
    function setSpins(no, planned) { spinBadge.style.display = ""; spinBadge.textContent = "免費遊戲 " + no + " / " + planned; }
    function setPot(v) { potBadge.style.display = ""; potBadge.textContent = "累積 " + fmtX(v); }
    function setTier(t) { tierBadge.style.display = ""; tierBadge.textContent = "最高階 T" + t; }

    // 逐欄落定（左到右）＝slot 的期待階段
    function revealSpin(grid, pm, fast) {
      var plan = revealPlan(COLS, fast), i = 0;
      beat("reveal");
      function nextCol() {
        if (i >= plan.length) return Promise.resolve();
        draw(grid, pm, { stoppedCols: plan[i] });
        i++;
        return delay(fast ? 18 : 90).then(nextCol);
      }
      return nextCol();
    }

    /* 一轉的連鎖演出：steps[k].merges 是「在 steps[k-1].grid 上」發生的合併
     *   ⇒ 先在舊盤上高亮那些格（期待），再畫新盤（結果）。⭐ 分級回饋：升出的階越高停留越久。 */
    function playSteps(s, fast, ctx) {
      var steps = s.steps, k = 1, d = ctx.d;
      function nextStep() {
        if (k >= steps.length) return Promise.resolve();
        var cur = steps[k], prev = steps[k - 1], mark = {}, blast = {}, top = 0, paid = 0, j, q;
        if (cur.merges) for (j = 0; j < cur.merges.length; j++) {
          var g = cur.merges[j];
          for (q = 0; q < g.cells.length; q++) mark[g.cells[q]] = 1;
          if (g.tier + 1 > top) top = g.tier + 1;
          paid += g.pay;
        }
        if (cur.blasts) for (j = 0; j < cur.blasts.length; j++)
          for (q = 0; q < cur.blasts[j].hit.length; q++) blast[cur.blasts[j].hit[q]] = 1;
        beat(cur.blasts ? "blast" : "merge");
        draw(prev.grid, prev.pm, { mark: mark, blast: blast });
        if (top > ctx.best) { ctx.best = top; setTier(Math.min(top, TOPTIER)); }
        // 分級回饋：升出 T7 以上＝本作的高光時刻，停留加長並彈分
        var hold = d + (top >= 7 ? (fast ? 30 : 520) : top >= 5 ? (fast ? 10 : 180) : 0);
        if (paid > 0 && !fast) pop((top >= 9 ? "🛡️ 星鑄核心 " : top >= 7 ? "💠 " : "") + fmtX(paid), top >= 7 ? "is-big" : "");
        if (cur.blasts && !fast) pop("💣 過熱引爆！", "is-bomb");
        return delay(hold).then(function () {
          draw(cur.grid, cur.pm, {});
          k++;
          return delay(Math.round(d * 0.6)).then(nextStep);
        });
      }
      return nextStep();
    }

    // 一整段免費遊戲的演出（總預算固定 ⇒ 轉數/拍數再多也不會變成無盡等待）
    /* 一整段免費遊戲的演出。三件事刻意這樣排：
     *  · **一個 d 管整段**（由總拍數與固定預算求得）⇒ 一段 31 轉、上千拍的免費遊戲不會變成無盡等待；
     *  · **fsstart 拍要活得過一幀**才立刻接下一拍（emerald-sprite 踩過：兩拍同毫秒相接 ⇒ 該拍從未存在過）；
     *  · ⭐ **retrigger 的公告與 HUD 轉數上修排在盤面落定「之後」**——sp.planned 已含本轉加的轉數，
     *    在 revealSpin 之前就寫上去等於**結果先被說出口**（保真閘第 9 項 client 不可偷看／第 10 項期待感；
     *    emerald-sprite 2026-09-13 就是在這一格被抓到並修掉的）。 */
    function playFsRun(fsRun, fast, startPot) {
      var acc = startPot || 0, si = 0, ctx = { best: 0, d: 0 };
      var totalSteps = 0, i;
      for (i = 0; i < fsRun.spins.length; i++) totalSteps += fsRun.spins[i].s.steps.length;
      ctx.d = paceOf(totalSteps, 5200, 14, 70, fast);
      var dense = totalSteps > 160;
      beat("fsstart");
      if (!fast) pop("⚒️ 星鑄熔爐 · 免費遊戲！", "is-fsstart");
      function nextSpin() {
        if (si >= fsRun.spins.length) return Promise.resolve();
        var sp = fsRun.spins[si++];
        setSpins(sp.no, fsHudSpins(sp, false));      // 落定前只能顯示「還沒加轉」的那個數
        beat("fsspin");
        return revealSpin(sp.s.steps[0].grid, sp.s.steps[0].pm, fast || dense)
          .then(function () { return playSteps(sp.s, fast, ctx); })
          .then(function () {
            if (sp.retrig) {                           // 盤面落定後才承認加轉
              setSpins(sp.no, fsHudSpins(sp, true));
              beat("retrig");
              if (!fast) { pop("🔄 +" + sp.retrig + " 免費轉數！", "is-fsstart"); return delay(420); }
            }
          })
          .then(function () { acc += sp.win; setPot(Math.min(acc, CFG.maxWin)); return delay(fast ? 12 : 80).then(nextSpin); });
      }
      return (fast ? Promise.resolve() : delay(620)).then(nextSpin);
    }

    function finish(totalMult) {
      beat("settle");
      history.push(fmtX(totalMult), totalMult >= 1 ? "is-win" : "is-lose");
      if (totalMult >= 100) pop("💥 " + fmtX(totalMult) + " MEGA WIN！", "is-mega");
      else if (totalMult >= 10) pop("🎉 " + fmtX(totalMult), "is-big");
      if (board.dataset) board.dataset.result = totalMult >= 1 ? "win" : "lose";
    }

    function playRound(bet, ctx) {
      var fast = !!(ctx && ctx.turbo);
      var seed = Math.floor(HL.fair.floatOr("star-forge") * 4294967296);
      var rng = mulberry32(seed);
      var res = simSpin(rng, true);
      var totalMult = res.mult;
      var done = Promise.resolve().then(function () {
        spinBadge.style.display = "none"; potBadge.style.display = "none"; tierBadge.style.display = "none";
        modeBadge.style.display = "";
        return revealSpin(res.base.steps[0].grid, res.base.steps[0].pm, fast);
      }).then(function () {
        return playSteps(res.base, fast, { best: 0, d: paceOf(res.base.steps.length, 1600, 30, 150, fast) });
      }).then(function () {
        if (!res.fs) return;
        modeBadge.style.display = "none";
        return playFsRun(res.fs, fast, 0);
      }).then(function () { finish(totalMult); });
      return { multiplier: totalMult, label: (res.trig ? "⚒️ 免費遊戲 " : "") + "開出 " + fmtX(totalMult), done: done };
    }

    var panel = HL.instant.betPanel({ initial: 50, game: "star-forge", playText: "鍛造 ⚒️", playRound: playRound });

    /* 三種買入。⭐ 價格**只有一個來源**＝buyPrice(b)（由該路徑實測 EV / 宣告 RTP 求得）：
     * 同一個求值同時驅動按鈕文字與扣款 ⇒ 不可能出現「按鈕寫 80×、實扣 80× 而 EV 只有 41×」
     * 那種暗虧（Dead By Noon 首版的血訓，保真閘第 14 項）。 */
    var buyBtns = BUYS.map(function (b) {
      var price = buyPrice(b);
      /* 名稱與價格分成兩個文字節點：i18n 引擎是**整個文字節點**比對字典，
       *   寫成 name+" "+price+"×" 會讓那一節點永遠查不到（記憶裡的 passthrough 陷阱）。 */
      var btn = el("button", { class: "ax-forge__buy", onClick: function () {
        if (btn.disabled || panel.isBusy()) return;
        var bet = panel.getBet ? panel.getBet() : 50;
        var cost = Math.round(bet * price);
        if (cost > HL.instant.bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
        if (HL.rg && !HL.rg.check(cost)) return;    // 買入繞過 betPanel 自行扣款 ⇒ 需自帶自設限額閘
        buyBtns.forEach(function (x) { x.disabled = true; });
        panel.lock(true);
        HL.instant.setBal(HL.instant.bal() - cost);
        var fast = !!(HL.gset && HL.gset.get("fast"));
        var seed = Math.floor(HL.fair.floatOr("star-forge") * 4294967296);
        var r = simBuy(mulberry32(seed), b.key, true);
        spinBadge.style.display = "none"; potBadge.style.display = "none"; tierBadge.style.display = "none";
        modeBadge.style.display = "none";
        /* ⚠️ 錢的了結**不掛在演出成功這條路上**：扣款已經發生，若演出中途拋例外，
         *   舊寫法會讓派彩、中央掛鉤、面板解鎖**全部不發生**——玩家被扣了錢、按鈕永遠是灰的、
         *   而那一注對 liveStats 下游 21 個子系統不存在，且**零錯誤訊息**（§4「修一半而看不出來」）。
         *   ⇒ settle 走 .catch 之後的 .then，無論演出成不成功都恰好跑一次。 */
        var settle = function () {
          var payout = Math.round(bet * r.mult);
          if (payout) HL.instant.setBal(HL.instant.bal() + payout);
          if (HL.liveStats) HL.liveStats.record("star-forge", cost, payout);
          if (panel.setLast) panel.setLast(cost, payout, "⚒️ " + b.name);
          HL.ui.toast("⚒️ " + b.name + "：贏 " + HL.dom.money(payout) + "（本 " + HL.dom.money(cost) + "）", payout >= cost ? "ok" : "warn");
          buyBtns.forEach(function (x) { x.disabled = false; });
          panel.lock(false);
          modeBadge.style.display = "";
        };
        playFsRun(r.fs, fast, 0)
          .then(function () { finish(r.mult); })
          .catch(function (e) { if (global.console && console.error) console.error("star-forge buy render failed", e); })
          .then(settle);
      } }, [ el("span", { text: b.name }), el("span", { class: "ax-forge__price", text: " " + price + "×" }) ]);
      return btn;
    });

    // 待機盤（固定種子·不影響公平抽樣）
    var restPm = new Float64Array(CELLS);
    for (var ri = 0; ri < CELLS; ri++) restPm[ri] = 1;
    draw(newGrid(mulberry32(0x57A2)), restPm, {});

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "⚒️ 星鑄 Star Forge" }),
      stage,
      history.node,
      panel.node,
      el("div", { class: "ax-forge__buyrow" }, buyBtns.concat([
        el("small", { class: "ax-muted", text: "直接進星鑄熔爐（免費遊戲）" })
      ])),
      HL.ui.gameInfoBar({ fair: "一注一種子·可驗證", edge: HL.gameRtp.edgeOf("star-forge"), rtp: HL.gameRtp.of("star-forge"),
        note: "6×6 盤面、無賠付線。相連的同階符號成群就**合併升階**（低階要 4 塊、高階 2 塊就能對撞），只有升出第 5 階以上才計獎——你在看的是「這串連鎖能爬到第幾階」。同一格每次中獎位置乘數翻倍（×2 起、上限 ×128）。基礎局第 6 階會過熱生 💣，引爆清掉周圍 8 格並拉高鄰格乘數、殘骸凝成 🌀 信標；第 7 階以上只在熔爐（免費遊戲）裡煉得出來——熔爐中位置乘數與第 5 階以上的符號整段都不冷卻。🌀≥3 觸發 13/16/21/31 轉。忠實復刻 BGaming『Space Knight Merge Up 2』的 cluster-merge 9 級階梯格式" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "星鑄 Star Forge", provider: "Apex Studio（對標 BGaming）", key: "star-forge" }) : node;
  }

  HL.games.register({ id: "star-forge", title: "星鑄 Star Forge", provider: "Apex Studio", type: "slot",
    cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#f59e0b", c2: "#3b0764", render: forgeGame });
})(typeof window !== "undefined" ? window : globalThis);

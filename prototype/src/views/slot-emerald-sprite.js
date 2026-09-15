/*
 * Apex Win｜翡翠妖精 Emerald Sprite 🧚（6×5 cluster-pays + 金格位置乘數 + 超級連鎖 + 免費進度乘數
 *   · 忠實復刻 Hacksaw「Le Prechaun」格式 · 原創翡翠森林主題）
 * ─────────────────────────────────────────────────────────────────────
 * 新互動維度（ApexWin 現有 26 款皆無）＝**cluster-adjacency（相鄰連通團）計分拓樸**：
 *   同符號正交相鄰連通 ≥5 格成團，團越大賠越多；🧚 wild 是**萬用連接子**（能把兩片分離的同符併成一團）。
 *   既有款沒有任何一款看「位置」：Gem Storm 是 pay-anywhere（任位計數·與位置無關）、Pirots 是格位收集、
 *   Dead By Noon 是彈膛、Golden Toad 是 Hold&Win、Abyssal Surge 的框是覆蓋不是連通。
 *   ⇒ 本作首度把「誰挨著誰」本身變成計分規則。
 * 規則：6×5=30 格、無 payline；判團 → 金格位置乘數（2/3/5/10/25·同團加總封頂 ≤100×）→ 中獎格消失、
 *   重力落下補新（超級連鎖）→ 續判到無團。⭐≥4 觸發免費遊戲 10 轉：**進度乘數 level 每次中獎連鎖 +1、
 *   整段不重置（封頂 ×100）**＝極尾來源；免費中 ⭐≥3 加發 5 轉。
 * RTP 96.28%（宣告；蒙地卡羅定版·見 games-catalog gate_log）。波動 medium、max 15000×（硬上限）。
 * 可驗證公平：一注一 HL.fair 種子 → 決定性 PRNG（mulberry32）跑完整局（base + 免費所有轉、金格、乘數），
 *   單一 float 可事後重算整局。
 * 掛 HL.instant.betPanel 共用引擎（金流/autobet/中央結算掛鉤 liveStats.record 通吃 VIP/任務/返水/JP/帳本）。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學。
 * 樣式隨本檔延遲載入（manifest 的 css 欄位）＝首屏零位元組，見 data/lazy-games.js。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var COLS = 6, ROWS = 5, MINCLUSTER = 5, MAXWIN = 15000;
  // 符號：0=🧚 wild（替代＋連接）、1-7 賠付符（低→高）、8=⭐ scatter（不參與成團）
  var W = 0, SCAT = 8, NSYM = 7;

  // 每符基礎賠（×總注），低→高。乘 sizeMult(團大小) 再乘標量 G。
  var SYMBASE = { 1: 0.20, 2: 0.28, 3: 0.40, 4: 0.60, 5: 0.95, 6: 1.6, 7: 3.0 };

  var CFG = {
    // 落地權重：wild / scatter 為絕對機率，7 個賠付符依比例瓜分其餘份額
    wild: 0.022,
    scat: 0.0254,                       // 初始盤面才生 ⇒ ⭐≥4 約 1/144
    symW: { 1: 0.2503, 2: 0.2062, 3: 0.1691, 4: 0.1350, 5: 0.1059, 6: 0.0780, 7: 0.0555 },
    goldP: 0.09,                        // 中獎格成為金格的機率
    goldVals: [2, 3, 5, 10, 25],
    goldWts: [40, 30, 18, 9, 3],
    goldCap: 100,                       // 同團金格乘數加總上限
    fsSpins: 10,                        // ⭐≥4 觸發轉數
    fsRetrig: 5,                        // 免費中 ⭐≥3 加發
    fsLevelCap: 100,                    // 進度乘數封頂（15000× 極尾的來源）
    G: 0.674016,                        // **RTP 校準鈕**：RTP 對 G 嚴格線性（除 maxWin 夾）
    maxWin: MAXWIN
  };

  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  // 符號分布：賠付符依 symW 比例佔滿「1 − wild − scatter」的份額（衍生而非手抄，避免轉寫漂移）
  function dist(withScat) {
    var tot = 0, k, o = {};
    for (k in CFG.symW) tot += CFG.symW[k];
    var sc = withScat ? CFG.scat : 0;
    var share = 1 - CFG.wild - sc;
    for (k in CFG.symW) o[k] = CFG.symW[k] / tot * share;
    o[W] = CFG.wild;
    if (sc > 0) o[SCAT] = sc;
    return o;
  }
  var WT_INIT = dist(true), WT_FILL = dist(false);   // 補位不生 ⭐（否則連鎖可無限 retrigger）

  function makePool(wt){ var pool=[], tot=0, k; for(k in wt){ if(wt[k]>0){ tot+=wt[k]; pool.push({k:+k, acc:tot}); } } return {pool:pool, tot:tot}; }
  var POOL_INIT = makePool(WT_INIT), POOL_FILL = makePool(WT_FILL);
  function drawSym(rng, pool){ var r=rng()*pool.tot, i; for(i=0;i<pool.pool.length;i++) if(r<pool.pool[i].acc) return pool.pool[i].k; return 1; }
  function wdraw(rng, vals, wts){ var t=0,i; for(i=0;i<wts.length;i++) t+=wts[i]; var r=rng()*t, a=0; for(i=0;i<wts.length;i++){ a+=wts[i]; if(r<a) return vals[i]; } return vals[0]; }

  // 團大小 → 倍率分級（spec 的 sizeMult 表）
  function sizeMult(n){
    if (n >= 21) return 140; if (n >= 17) return 55; if (n >= 13) return 22;
    if (n >= 10) return 9;   if (n >= 8)  return 4.5; if (n === 7) return 2.5;
    if (n === 6) return 1.6; return 1;
  }

  // grid = array[COLS] of array[ROWS]（column-major；row 0 = 頂端）
  function newGrid(rng){ var g=[],c,r; for(c=0;c<COLS;c++){ g[c]=[]; for(r=0;r<ROWS;r++) g[c][r]=drawSym(rng,POOL_INIT); } return g; }
  function countScat(g){ var n=0,c,r; for(c=0;c<COLS;c++)for(r=0;r<ROWS;r++) if(g[c][r]===SCAT) n++; return n; }

  /* 判團＝本作的核心拓樸。逐賠付符 s 做一次 flood fill，成員＝「格 === s 或 === wild」，
   * 連通定義為正交四鄰。**wild 可同時屬於多個符號的團**（它是萬用連接子），
   * 但**純 wild 團不計獎**（需至少一個真符），否則一片 wild 會憑空賠 7 次。 */
  function findClusters(g) {
    var out = [], s, c, r, i;
    for (s = 1; s <= NSYM; s++) {
      var vis = {};
      for (c = 0; c < COLS; c++) for (r = 0; r < ROWS; r++) {
        var key0 = c + "," + r;
        if (vis[key0]) continue;
        var v0 = g[c][r];
        if (v0 !== s && v0 !== W) continue;
        var stack = [[c, r]], comp = [], real = 0;
        vis[key0] = 1;
        while (stack.length) {
          var p = stack.pop(), pc = p[0], pr = p[1];
          comp.push(pc + "," + pr);
          if (g[pc][pr] === s) real++;
          var nb = [[pc-1,pr],[pc+1,pr],[pc,pr-1],[pc,pr+1]];
          for (i = 0; i < 4; i++) {
            var nc = nb[i][0], nr = nb[i][1];
            if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
            var k = nc + "," + nr;
            if (vis[k]) continue;
            var vv = g[nc][nr];
            if (vv !== s && vv !== W) continue;
            vis[k] = 1; stack.push([nc, nr]);
          }
        }
        if (comp.length >= MINCLUSTER && real >= 1) out.push({ sym: s, cells: comp, size: comp.length });
      }
    }
    return out;
  }

  /* 一次連鎖步：判團 → 每團抽金格（中獎格才可能是金格）→ 算該團贏分 → 回報要消除的格。
   * 金格乘數在**同一團內加總**（封頂 goldCap），而不是相乘——這是 Le Prechaun 的位置乘數語意。 */
  function stepEval(rng, g, lvl) {
    var cl = findClusters(g);
    if (!cl.length) return null;
    var kill = {}, total = 0, detail = [], i, j;
    for (i = 0; i < cl.length; i++) {
      var cs = cl[i], gold = 0, golds = [];
      for (j = 0; j < cs.cells.length; j++) {
        kill[cs.cells[j]] = 1;
        if (rng() < CFG.goldP) {
          var gv = wdraw(rng, CFG.goldVals, CFG.goldWts);
          gold += gv; golds.push({ cell: cs.cells[j], mult: gv });
        }
      }
      if (gold > CFG.goldCap) gold = CFG.goldCap;
      var base = SYMBASE[cs.sym] * sizeMult(cs.size) * CFG.G;
      var win = base * (gold > 0 ? gold : 1) * lvl;
      total += win;
      detail.push({ sym: cs.sym, size: cs.size, cells: cs.cells, gold: gold, golds: golds, win: win });
    }
    return { win: total, kill: kill, clusters: detail };
  }

  // 重力：被消除的格移除，同欄上方符號落下，頂端補新（補位不生 ⭐）
  function tumble(rng, g, kill) {
    var c, r, ng = [];
    for (c = 0; c < COLS; c++) {
      var keep = [];
      for (r = 0; r < ROWS; r++) if (!kill[c + "," + r]) keep.push(g[c][r]);
      var col = [];
      for (r = 0; r < ROWS - keep.length; r++) col.push(drawSym(rng, POOL_FILL));
      ng[c] = col.concat(keep);
    }
    return ng;
  }

  /* 單轉（base 或免費）：建盤 → 連鎖判團到無團。
   * lvl0＝進場進度乘數（base 恆 1；免費為該段累進值），回傳結束時的 level 供下一轉延續。 */
  function spinOnce(rng, lvl0, rec) {
    var g = newGrid(rng), scat = countScat(g), lvl = lvl0 || 1, win = 0, guard = 0;
    var steps = rec ? [{ grid: g, phase: "land" }] : null;
    while (guard++ < 60) {
      var ev = stepEval(rng, g, lvl);
      if (!ev) break;
      win += ev.win;
      if (rec) steps.push({ grid: g, phase: "win", ev: ev, lvl: lvl });
      g = tumble(rng, g, ev.kill);
      if (lvl < CFG.fsLevelCap) lvl++;          // 每次「中獎連鎖」推進一級（封頂）
      if (rec) steps.push({ grid: g, phase: "drop", lvl: lvl });
    }
    return { grid: g, win: win, scat: scat, lvl: lvl, steps: steps };
  }

  /* 整局：base 一轉（+可能的免費序列）。
   * base 的 level 不累進（每轉重置為 1）；免費段的 level **整段不重置**＝招牌高潮與極尾來源。 */
  function simSpin(rng, rec) {
    var b = spinOnce(rng, 1, rec), fsWin = 0, spins = rec ? [] : null, guard = 0;
    var trig = b.scat >= 4;
    if (trig) {
      var left = CFG.fsSpins, planned = left, no = 0, lvl = 1;
      while (left > 0 && guard++ < 400) {
        left--; no++;
        var f = spinOnce(rng, lvl, rec), add = 0;
        lvl = f.lvl;
        if (f.scat >= 3) { add = CFG.fsRetrig; left += add; planned += add; }
        fsWin += f.win;
        if (rec) spins.push({ s: f, no: no, planned: planned, retrig: add, win: f.win, lvlIn: f.steps ? 0 : 0 });
      }
    }
    var total = b.win + fsWin;
    if (total > CFG.maxWin) total = CFG.maxWin;
    return { mult: total, base: b, baseWin: b.win, fsWin: fsWin, fs: spins, trig: trig };
  }

  // node RTP 驗證器入口（與玩家玩的同一份數學；rec=false 不改抽樣順序）
  function fullSpin(rng) {
    var r = simSpin(rng, false);
    return { win: r.mult, base: r.baseWin, fs: r.fsWin, trig: r.trig };
  }

  // 落定排程（純函式·node 可驗）：逐欄由左而右落定；極速模式一次到位。語意同 abyssal-surge/gem-storm。
  function revealPlan(cols, fast){ if (fast) return [cols]; var p=[],i; for(i=0;i<=cols;i++) p.push(i); return p; }

  /* 免費遊戲的公告排程（純函式·node 可驗）＝本檔演出層的單一真相。兩條不變量：
   * ① **公告不得早於見證它的那一次落定**：retrigger 的轉數上修與彈分排在「那一轉 reveal 之後」。
   *    （2026-09-13 22:00 窗線上實測：舊版在該轉**開始旋轉的同一毫秒**就把 HUD 從 4/10 改成 4/15 並彈
   *      「🔄 +5」，而第 3 顆 ⭐ 要到 373ms 後才落地、整排要到 733ms 後才停 ⇒ 結果先被說出口。）
   * ② **結構拍要有寬度**：進場與 retrigger 各自帶可被觀測到的停留（極速仍保留最小可辨識值）。
   *    （舊版 beat("fsstart") 與下一拍 reveal 同步相接＝該拍零幀，任何 [data-beat=fsstart] 的樣式或
   *      觀測者永遠看不到它。）
   * 演出細節見 intel/emerald-sprite-fs-announce-2026-09-13.md。 */
  function fsPlan(spins, fast, pace) {
    pace = pace || 1;
    var p = [{ act: "announce", kind: "enter", beat: "fsstart", ms: fast ? 60 : Math.max(420, Math.round(900 * pace)) }], i;
    for (i = 0; i < spins.length; i++) {
      var sp = spins[i], add = sp.retrig || 0;
      p.push({ act: "hud", idx: i, no: sp.no, planned: sp.planned - add });   // 落定前只能顯示「還沒算進 retrigger」的計畫轉數
      p.push({ act: "reveal", idx: i });
      if (add > 0) p.push({ act: "announce", kind: "retrig", beat: "retrig", idx: i, no: sp.no,
        planned: sp.planned, add: add, ms: fast ? 40 : Math.max(260, Math.round(620 * pace)) });
      p.push({ act: "steps", idx: i });
      p.push({ act: "tail", idx: i, ms: fast ? 20 : Math.round((sp.win > 0 ? 300 : 110) * pace) });
    }
    return p;
  }

  /* 播排程（依賴注入·node 可直接以記錄用 ops 驅動＝行為級可驗，不需 DOM）。
   * ops: {announce,hud,reveal,steps,tail,delay}；帶 ms 的拍在該拍效果之後才 delay。
   * ⚠️ 刻意寫成「效果同步就同步往下走、遇到 thenable 才轉非同步」：瀏覽器裡 reveal/steps/delay 都回
   *   promise ⇒ 行為與一般 promise 鏈完全相同；而 node 的自我檢測是同步的，這樣才能用記錄用 ops
   *   把整條拍序**真的跑一遍**再斷言順序（否則只能讀原始碼猜順序＝§4 形狀⑦「認寫法」）。 */
  function playFsPlan(plan, ops) {
    var i = 0;
    function wait(a) { return a.ms ? ops.delay(a.ms) : null; }
    function step() {
      while (i < plan.length) {
        var a = plan[i++];
        var r = ops[a.act] ? ops[a.act](a) : null;
        if (r && typeof r.then === "function") return r.then(function () { return thenWait(a); });
        var d = wait(a);
        if (d && typeof d.then === "function") return d.then(step);
      }
      return null;
    }
    function thenWait(a) {
      var d = wait(a);
      return (d && typeof d.then === "function") ? d.then(step) : step();
    }
    return step();
  }

  HL.emeraldSprite = { simSpin:simSpin, fullSpin:fullSpin, spinOnce:spinOnce, stepEval:stepEval,
    findClusters:findClusters, tumble:tumble, newGrid:newGrid, countScat:countScat, sizeMult:sizeMult,
    mulberry32:mulberry32, revealPlan:revealPlan, dist:dist, fsPlan:fsPlan, playFsPlan:playFsPlan,
    SYMBASE:SYMBASE, CFG:CFG, WT_INIT:WT_INIT, WT_FILL:WT_FILL,
    COLS:COLS, ROWS:ROWS, MINCLUSTER:MINCLUSTER, SCAT:SCAT, W:W, NSYM:NSYM };
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.emeraldSprite; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el;
  var fmtX = HL.dom && HL.dom.fmtX;

  var GLYPH = { 0:"🧚", 1:"🍀", 2:"🫐", 3:"🍄", 4:"🔔", 5:"💍", 6:"👒", 7:"💎", 8:"⭐" };
  function symChar(v){ return GLYPH[v] !== undefined ? GLYPH[v] : ""; }

  // 賠付表（G5③）：實付 = SYMBASE[符號] × sizeMult(團大小) × CFG.G ×（金格倍數）×（免費進度乘數）。
  //   表列的是前三項＝沒有任何加成時的每團倍率；兩個乘數在 notes 說明。
  function ptSpec(){
    var PT = HL.slotPaytable, SIZES = [21, 13, 8, 5], rows = [];
    for (var k = NSYM; k >= 1; k--) {
      (function(k){
        rows.push({ ic: GLYPH[k], pays: SIZES.map(function(s){
          return PT.payText(s, SYMBASE[k] * sizeMult(s) * CFG.G);
        }) });
      })(k);
    }
    rows.push({ ic: GLYPH[W], pays: ["Wild · 替代任一賠付符，可把兩塊同色連成一團"] });
    rows.push({ ic: GLYPH[SCAT], pays: ["Scatter · 不參與成團，4 個起觸發免費遊戲"] });
    return { title:"翡翠妖精 Emerald Sprite", rows: rows,
      intro: "相連同符 " + MINCLUSTER + " 顆起算一團（上下左右相鄰）；左欄為「團大小　x每團倍率 × 總注」（顯示值四捨五入，未含金格與進度加成）。",
      notes: [
        "團越大倍率跳級：" + [5,6,7,8,10,13,17,21].map(function(s){ return s + "→×" + PT.fmtX(sizeMult(s)); }).join("、") + "（21 顆以上同級）。",
        "金格：中獎團的每一格有機會變成金格（值 " + CFG.goldVals.map(function(v){ return v + "×"; }).join("、") + "）；同一團的金格「相加」後整團乘上去，上限 " + CFG.goldCap + "×。",
        "⭐ 4 個 ⇒ 免費遊戲 " + CFG.fsSpins + " 次；期間 ⭐ 3 個 +" + CFG.fsRetrig + " 次。免費段的進度乘數每次連鎖 +1 且「整段不重置」（封頂 ×" + CFG.fsLevelCap + "）＝本款極尾的來源。",
        "本款無買入入口；最大贏分 " + CFG.maxWin + "×總注（達上限即截斷）。"
      ] };
  }
  // 落定前的裝飾符池（刻意排除 ⭐——未落定的格子顯示 scatter 會謊報「快觸發了」）
  var SPIN_SYMS = [0,1,2,3,4,5,6,7];
  function spinChar(){ return symChar(SPIN_SYMS[(Math.random()*SPIN_SYMS.length)|0]); }   // 視覺裝飾·非公平關鍵

  function spriteGame() {
    var board = el("div", { class: "ax-sprite__board" });
    var modeBadge = el("div", { class: "ax-sprite__mode", text: "6×5 · 相鄰連通 5+ 成團" });
    var spinBadge = el("div", { class: "ax-sprite__resp", style: "display:none" });
    var lvlBadge = el("div", { class: "ax-sprite__lvl", style: "display:none" });
    var potBadge = el("div", { class: "ax-sprite__pot", style: "display:none" });
    var stage = el("div", { class: "ax-sprite__stage" }, [
      el("div", { class: "ax-sprite__hud" }, [ modeBadge, spinBadge, lvlBadge, potBadge ]),
      el("div", { class: "ax-sprite__wrap" }, [ board ])
    ]);
    var history = HL.ui.histBar({ cls: "ax-sprite__hist", itemCls: "ax-sprite__pill", max: 12, fair: true });

    function beat(name){ if (stage.dataset) stage.dataset.beat = name; }
    function delay(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

    // 畫盤：stoppedCols 為「左邊這幾欄已落定」，其餘畫裝飾符；win/gold 供高亮
    function draw(grid, opts) {
      opts = opts || {};
      var stopped = opts.stoppedCols === undefined ? COLS : opts.stoppedCols;
      var win = opts.winCells || {}, gold = opts.goldCells || {};
      board.innerHTML = "";
      var c, r;
      for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
        var live = c < stopped, s = live && grid ? grid[c][r] : 1;
        var key = c + "," + r, cls = "ax-sprite__cell";
        if (!live) cls += " is-spin";
        if (win[key]) cls += " is-win";
        if (gold[key]) cls += " is-gold";
        if (live && s === SCAT) cls += " is-scat";
        if (live && s === W) cls += " is-wild";
        var kids = [ el("span", { class: "ax-sprite__sym", text: live ? symChar(s) : spinChar() }) ];
        if (gold[key]) kids.push(el("span", { class: "ax-sprite__gm", text: "×" + gold[key] }));
        board.appendChild(el("div", { class: cls }, kids));
      }
    }

    function pop(text, cls) {
      var n = el("div", { class: "ax-sprite__pop " + (cls||""), text: text });
      stage.appendChild(n);
      setTimeout(function(){ if (n.parentNode) n.parentNode.removeChild(n); }, 1400);
    }
    function setSpins(no, planned) { spinBadge.style.display = ""; spinBadge.textContent = "免費遊戲 " + no + " / " + planned; }
    function setLvl(v) { lvlBadge.style.display = ""; lvlBadge.textContent = "進度乘數 ×" + v; }
    function setPot(v) { potBadge.style.display = ""; potBadge.textContent = "累積 " + fmtX(v); }

    // 逐欄落定（左到右）＝slot 的期待階段
    function revealSpin(grid, fast) {
      var plan = revealPlan(COLS, fast), i = 0;
      beat("reveal");
      function step() {
        if (i >= plan.length) return Promise.resolve();
        draw(grid, { stoppedCols: plan[i] });
        i++;
        return delay(fast ? 24 : 110).then(step);
      }
      return step();
    }

    /* 一轉的演出＝把 steps 時間軸播出來：land → (win 高亮＋金格揭曉) → drop（落下補新）→ …
     * 分級回饋：團越大停留越久；金格與進度乘數各自有自己的彈分。 */
    function playSteps(s, fast, isFS) {
      var steps = s.steps || [], i = 1, acc = 0;   // steps[0] 已由 revealSpin 畫完
      function next() {
        if (i >= steps.length) return Promise.resolve(acc);
        var st = steps[i++];
        if (st.phase === "drop") {
          beat("drop");
          draw(st.grid);
          if (isFS) setLvl(st.lvl);
          return delay(fast ? 30 : 240).then(next);
        }
        // phase === "win"
        beat("clusterwin");
        var winCells = {}, goldCells = {}, j, k, big = 0, stepWin = 0;
        for (j = 0; j < st.ev.clusters.length; j++) {
          var cu = st.ev.clusters[j];
          for (k = 0; k < cu.cells.length; k++) winCells[cu.cells[k]] = 1;
          for (k = 0; k < cu.golds.length; k++) goldCells[cu.golds[k].cell] = cu.golds[k].mult;
          if (cu.size > big) big = cu.size;
          stepWin += cu.win;
        }
        acc += stepWin;
        draw(st.grid, { winCells: winCells, goldCells: goldCells });
        if (!fast) {
          var goldSum = 0;
          for (j = 0; j < st.ev.clusters.length; j++) goldSum += st.ev.clusters[j].gold;
          if (goldSum > 0) pop("金格 ×" + goldSum, "is-gold");
          pop(fmtX(stepWin), big >= 10 ? "is-big" : "");
        }
        // 分級回饋：大團多停一會兒（結構拍，極速仍保留可辨識的最小值）
        return delay(fast ? 40 : Math.round(300 + Math.min(big, 16) * 22)).then(next);
      }
      return next();
    }

    function playRound(bet, ctx) {
      var fast = !!(ctx && ctx.turbo);
      var seed = Math.floor(HL.fair.floatOr("emerald-sprite") * 4294967296);
      var rng = mulberry32(seed);
      var res = simSpin(rng, true);
      var totalMult = res.mult;

      var done = Promise.resolve().then(function () {
        spinBadge.style.display = "none"; potBadge.style.display = "none"; lvlBadge.style.display = "none";
        modeBadge.style.display = "";
        return revealSpin(res.base.steps[0].grid, fast);
      }).then(function () {
        return playSteps(res.base, fast, false);
      }).then(function () {
        if (!res.fs || !res.fs.length) return;
        modeBadge.style.display = "none";
        var acc = 0;
        // 長 bonus（retrigger）自動壓縮節奏，讓總時長有界
        var pace = Math.max(0.25, Math.min(1, 12 / Math.max(1, res.fs.length)));
        // 拍序由 fsPlan 決定（公告晚於落定、結構拍有寬度）；這裡只負責把每一拍畫出來。
        return playFsPlan(fsPlan(res.fs, fast, pace), {
          announce: function (a) {
            beat(a.beat);
            if (a.kind === "enter") { if (!fast) pop("🧚 翡翠妖精 · 免費遊戲！", "is-fsstart"); return; }
            setSpins(a.no, a.planned);
            if (!fast) pop("🔄 +" + a.add + " 免費轉數！", "is-fsstart");
          },
          hud: function (a) { setSpins(a.no, a.planned); },
          reveal: function (a) { return revealSpin(res.fs[a.idx].s.steps[0].grid, fast || pace < 0.5); },
          steps: function (a) { return playSteps(res.fs[a.idx].s, fast, true); },
          tail: function (a) {
            var sp = res.fs[a.idx];
            acc += sp.win;
            setLvl(sp.s.lvl);
            setPot(Math.min(acc, CFG.maxWin));
          },
          delay: delay
        });
      }).then(function () {
        beat("settle");
        history.push(fmtX(totalMult), totalMult >= 1 ? "is-win" : "is-lose");
        if (totalMult >= 100) pop("💥 " + fmtX(totalMult) + " MEGA WIN！", "is-mega");
        else if (totalMult >= 10) pop("🎉 " + fmtX(totalMult), "is-big");
        // 結果盤留在畫面上（不重繪待機盤）——下一注的 revealSpin 才覆蓋它
        if (board.dataset) board.dataset.result = totalMult >= 1 ? "win" : "lose";
      });

      return { multiplier: totalMult, label: (res.trig ? "🎁 免費遊戲 " : "") + "開出 " + fmtX(totalMult), done: done };
    }

    // 待機盤（固定種子·不影響公平抽樣）
    var rest = mulberry32(0x3EA7);
    draw(newGrid(rest));

    var panel = HL.instant.betPanel({ initial: 50, game: "emerald-sprite", playText: "旋轉 🧚", playRound: playRound });

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      HL.slotPaytable.titleRow(el("h2", { class: "ax-inst__title", text: "🧚 翡翠妖精 Emerald Sprite" }), "emerald-sprite", ptSpec),
      stage,
      history.node,
      panel.node,
      HL.ui.gameInfoBar({ fair: "一注一種子·可驗證", edge: HL.gameRtp.edgeOf("emerald-sprite"), rtp: HL.gameRtp.of("emerald-sprite"),
        note: "6×5 盤面無 payline：同符號**上下左右相鄰連通 ≥5 格**成團即中獎，團越大賠越多（5／6／7／8-9／10-12／13-16／17-20／21+ 八級）。🧚 是萬用連接子，能把兩片分離的同符併成一團。中獎格有機率變成金格，帶位置乘數 ×2/3/5/10/25（同團加總、封頂 ×100）；中獎格消失後重力落下補新＝超級連鎖，可連續中。⭐≥4 觸發免費遊戲 10 轉：**進度乘數每次中獎連鎖 +1、整段不重置（封頂 ×100）**，⭐≥3 再加 5 轉。忠實復刻業界 cluster-pays 相鄰連通玩法" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "翡翠妖精 Emerald Sprite", provider: "Apex Studio", key: "emerald-sprite" }) : node;
  }

  HL.games.register({ id: "emerald-sprite", title: "翡翠妖精 Emerald Sprite", provider: "Apex Studio", type: "slot",
    cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#059669", c2: "#052e16", render: spriteGame });
})(typeof window !== "undefined" ? window : globalThis);

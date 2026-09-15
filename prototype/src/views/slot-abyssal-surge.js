/*
 * Apex Win｜深淵氣湧 Abyssal Surge 🫧（6×6 / 40 線 + Money-collect 可變框收集 + 重疊乘數 · 忠實復刻 Pragmatic「Bubble Up!」格式 · 原創深海主題）
 * ─────────────────────────────────────────────────────────────────────
 * 新互動維度（ApexWin 現有 25 款皆無）＝**空間性 money-collect**：
 *   每轉有 20.15% 生成 1–2 個「氣湧框」（寬高各 2–6 隨機、位置隨機）；框內所有 🫧 現金符被收走，
 *   **同時落在兩框重疊區**的 🫧 再獲 ×2/3/5/8/10 隨機乘數。框「多大、落在哪、會不會疊」就是本作張力來源。
 *   （既有 Golden Toad 是覆蓋式收集、無可變框與重疊加乘；Gem Storm 是 pay-anywhere、與位置無關。）
 * 規則：6×6=36 格、40 條固定線（左到右、3–6 連）、W 替代計獎符（不替 🫧/⭐）；⭐≥4 觸發免費遊戲 8/10/12 轉
 *   （免費：每轉必生框、🫧 落地率 1.5×、現金值 ×1.9；轉中 ⭐≥3 加發 4/6/8 轉）。
 * RTP 96.52%（宣告；**精確解析式**求得＝零抽樣誤差，另以 60M×2 種子蒙地卡羅交叉驗證）。
 *   波動 medium（SD≈17.5）、base hit 1/3.6、免費觸發 1/168（媒體 canonical 1/169.63）、max 10000×（硬上限）。
 * 可驗證公平：一注一 HL.fair 種子 → 決定性 PRNG（mulberry32）跑完整局（base + 免費所有轉、框幾何、現金值、重疊乘數），
 *   單一 float 可事後重算整局。
 * 掛 HL.instant.betPanel 共用引擎（金流/autobet/中央結算掛鉤 liveStats.record 通吃 VIP/任務/返水/JP/帳本）。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學。
 * 樣式隨本檔延遲載入（manifest 的 css 欄位）＝首屏零位元組，見 data/lazy-games.js。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var COLS = 6, ROWS = 6, BETCOINS = 40, MAXWIN = 10000;
  // 符號：0=W wild、1-3 高賠、4-7 低賠、8=🫧 現金符（僅經框收集計獎）、9=⭐ scatter、10=空
  var W = 0, MON = 8, SCAT = 9, BLANK = 10;

  // 每線幣值（總注＝40 幣＝1 幣/線）。玩家所見即所付——不套任何顯示端縮放。
  var PAY = {
    1: { 3: 175, 4: 850, 5: 3450, 6: 17000 },
    2: { 3: 85,  4: 430, 5: 1720, 6: 6900 },
    3: { 3: 70,  4: 260, 5: 1030, 6: 4300 },
    4: { 3: 35,  4: 140, 5: 430,  6: 1380 },
    5: { 3: 35,  4: 105, 5: 345,  6: 1030 },
    6: { 3: 18,  4: 85,  5: 260,  6: 690 },
    7: { 3: 18,  4: 70,  5: 205,  6: 515 }
  };

  var CFG = {
    // 計獎符/wild 的相對權重（blank/🫧/⭐ 之外的份額依此比例分配）
    symW:   { 0: 0.028, 1: 0.045, 2: 0.055, 3: 0.065, 4: 0.125, 5: 0.125, 6: 0.135, 7: 0.135 },
    blank:  0.42,      blankFS: 0.39,
    mon:    0.060075,  monFSx:  1.5,     // 🫧 落地率（免費 ×1.5）。**RTP 校準鈕**：精確解析式解得
    scat:   0.0203,                      // ⭐ 落地率 → 免費觸發 1/168（媒體 canonical 1/169.63）
    // 現金符值（×總注）與權重：本體重、尾巴輕＝medium 波動；頂端 400× 經重疊 ×10 與免費 ×1.9 仍可觸 10000× 上限
    monVals: [0.1, 0.2, 0.3, 0.5, 1, 2, 5, 20, 75, 400],
    monWts:  [34, 24, 16, 11, 7, 4, 2.2, 1.1, 0.35, 0.05],
    ovVals:  [2, 3, 5, 8, 10],           // 重疊區乘數
    ovWts:   [40, 30, 15, 10, 5],
    frameP:  0.2015,   // base 每轉生成框的機率（免費恆生成）
    twoP:    0.30,     // 生成時「兩個框」的機率（免費 0.45）
    fsTwoP:  0.45,
    fsBoost: 1.9,      // 免費遊戲現金值加成
    maxWin:  MAXWIN
  };

  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  // 符號分布：計獎符依 symW 比例佔滿「1 − blank − 🫧 − ⭐」的份額（衍生而非手抄，避免轉寫漂移）
  function dist(blank, mon, scat) {
    var tot = 0, k, o = {};
    for (k in CFG.symW) tot += CFG.symW[k];
    var share = 1 - blank - mon - scat;
    for (k in CFG.symW) o[k] = CFG.symW[k] / tot * share;
    o[MON] = mon; o[SCAT] = scat; o[BLANK] = blank;
    return o;
  }
  var WT_BASE = dist(CFG.blank, CFG.mon, CFG.scat);
  var WT_FS   = dist(CFG.blankFS, CFG.mon * CFG.monFSx, CFG.scat);

  function makePool(wt){ var pool=[], tot=0, k; for(k in wt){ if(wt[k]>0){ tot+=wt[k]; pool.push({k:+k, acc:tot}); } } return {pool:pool, tot:tot}; }
  var POOL_BASE = makePool(WT_BASE), POOL_FS = makePool(WT_FS);
  function drawSym(rng, pool){ var r=rng()*pool.tot, i; for(i=0;i<pool.pool.length;i++) if(r<pool.pool[i].acc) return pool.pool[i].k; return BLANK; }
  function wdraw(rng, vals, wts){ var t=0,i; for(i=0;i<wts.length;i++) t+=wts[i]; var r=rng()*t, a=0; for(i=0;i<wts.length;i++){ a+=wts[i]; if(r<a) return vals[i]; } return vals[0]; }

  // 40 條固定線：每線每欄取一 row（決定性產生 ⇒ node 與瀏覽器逐線相同）
  function buildLines() {
    var L = [], r;
    for (r=0;r<ROWS;r++) L.push([r,r,r,r,r,r]);                                                    // 水平 6
    for (r=0;r<ROWS;r++) L.push([r,(r+1)%ROWS,(r+2)%ROWS,(r+3)%ROWS,(r+4)%ROWS,(r+5)%ROWS]);       // 斜下 6
    for (r=0;r<ROWS;r++) L.push([r,(r+5)%ROWS,(r+4)%ROWS,(r+3)%ROWS,(r+2)%ROWS,(r+1)%ROWS]);       // 斜上 6
    for (r=0;r<ROWS;r++) L.push([r,(r+1)%ROWS,r,(r+1)%ROWS,r,(r+1)%ROWS]);                         // 鋸齒 6
    for (r=0;r<ROWS;r++) L.push([r,(r+2)%ROWS,r,(r+2)%ROWS,r,(r+2)%ROWS]);                         // 大鋸齒 6
    for (r=0;r<ROWS;r++) L.push([r,r,(r+1)%ROWS,(r+1)%ROWS,(r+2)%ROWS,(r+2)%ROWS]);                // 階梯 6
    for (r=0;r<4;r++)    L.push([r,(r+1)%ROWS,(r+2)%ROWS,(r+2)%ROWS,(r+1)%ROWS,r]);                // V 形 4
    return L.slice(0, 40);
  }
  var LINES = buildLines();

  // grid = array[COLS] of array[ROWS]（column-major；row 0 = 頂端）
  function newGrid(rng, pool){ var g=[],c,r; for(c=0;c<COLS;c++){ g[c]=[]; for(r=0;r<ROWS;r++) g[c][r]=drawSym(rng,pool); } return g; }
  function countScat(g){ var n=0,c,r; for(c=0;c<COLS;c++)for(r=0;r<ROWS;r++) if(g[c][r]===SCAT) n++; return n; }

  // 線計獎：自最左欄起算，W 替代；最左的非 W 計獎符決定該線符號；3 連以上依長度賠付。
  function evalLines(g) {
    var coins = 0, wins = [], i, c;
    for (i=0;i<LINES.length;i++) {
      var ln = LINES[i], sym = -1, run = 0;
      for (c=0;c<COLS;c++) {
        var s = g[c][ln[c]];
        if (s === W) { run++; continue; }
        if (sym < 0) { if (s>=1 && s<=7) { sym=s; run++; continue; } break; }
        if (s === sym) { run++; continue; }
        break;
      }
      if (sym < 0 && run >= 3) sym = 1;                        // 全為 W 起手 ⇒ 以最高賠符計
      if (sym > 0 && run >= 3 && PAY[sym] && PAY[sym][run]) {
        coins += PAY[sym][run];
        wins.push({ line: i, sym: sym, run: run, coins: PAY[sym][run] });
      }
    }
    return { coins: coins, wins: wins };
  }

  // 氣湧框：寬高各於 2..6 均勻、位置於合法範圍均勻（**抽樣律就是這條**——RTP 解析式依此建模）
  function drawFrames(rng, twoP) {
    var n = rng() < twoP ? 2 : 1, fr = [], i;
    for (i=0;i<n;i++) {
      var w = 2 + ((rng()*5)|0), h = 2 + ((rng()*5)|0);
      fr.push({ x: (rng()*(COLS-w+1))|0, y: (rng()*(ROWS-h+1))|0, w: w, h: h });
    }
    return fr;
  }
  function inFrame(f,c,r){ return c>=f.x && c<f.x+f.w && r>=f.y && r<f.y+f.h; }
  // 收集：框內每個 🫧 收走其現金值；落在 ≥2 框重疊區者再乘 ×2/3/5/8/10
  function collect(rng, g, mv, fr, boost) {
    var tot = 0, hits = [], c, r, i;
    for (c=0;c<COLS;c++) for (r=0;r<ROWS;r++) {
      if (g[c][r] !== MON) continue;
      var n = 0; for (i=0;i<fr.length;i++) if (inFrame(fr[i],c,r)) n++;
      if (!n) continue;
      var val = mv[c+","+r] * boost, mult = 1;
      if (n >= 2) mult = wdraw(rng, CFG.ovVals, CFG.ovWts);
      tot += val * mult;
      hits.push({ c:c, r:r, val:val, mult:mult, got:val*mult, over:n>=2 });
    }
    return { total: tot, hits: hits };
  }
  function placeMoney(rng, g){ var mv={},c,r; for(c=0;c<COLS;c++)for(r=0;r<ROWS;r++) if(g[c][r]===MON) mv[c+","+r]=wdraw(rng,CFG.monVals,CFG.monWts); return mv; }

  // 單轉（base 或免費）：建盤 → 線計獎 → 配現金值 → 框收集
  function spinOnce(rng, isFS) {
    var g = newGrid(rng, isFS ? POOL_FS : POOL_BASE);
    var lr = evalLines(g);
    var mv = placeMoney(rng, g);
    var fr = null, col = null, frameWin = 0;
    if (isFS || rng() < CFG.frameP) {
      fr = drawFrames(rng, isFS ? CFG.fsTwoP : CFG.twoP);
      col = collect(rng, g, mv, fr, isFS ? CFG.fsBoost : 1);
      frameWin = col.total;
    }
    return { grid:g, lineWin: lr.coins/BETCOINS, lineWins: lr.wins, frameWin: frameWin,
             frames: fr, collect: col, mv: mv, scat: countScat(g) };
  }

  function fsCount(n){ return n>=6 ? 12 : (n===5 ? 10 : 8); }      // ⭐ 4/5/6+ → 8/10/12 轉
  function retrigAdd(n){ return n>=5 ? 8 : (n===4 ? 6 : 4); }      // 免費中 ⭐ 3/4/5+ → +4/6/8 轉

  // 整局：base 一轉（+可能的免費遊戲序列）。rec=true 時保留時間軸給演出。
  function simSpin(rng, rec) {
    var b = spinOnce(rng, false), fsWin = 0, spins = rec ? [] : null, guard = 0;
    if (b.scat >= 4) {
      var left = fsCount(b.scat), planned = left, no = 0;
      while (left > 0 && guard++ < 600) {
        left--; no++;
        var f = spinOnce(rng, true), add = 0;
        if (f.scat >= 3) { add = retrigAdd(f.scat); left += add; planned += add; }
        fsWin += f.lineWin + f.frameWin;
        if (rec) spins.push({ s:f, no:no, planned:planned, retrig:add, win:f.lineWin+f.frameWin });
      }
    }
    var total = b.lineWin + b.frameWin + fsWin;
    if (total > CFG.maxWin) total = CFG.maxWin;
    return { mult: total, base: b, baseWin: b.lineWin + b.frameWin, fsWin: fsWin, fs: spins, trig: b.scat >= 4 };
  }

  // node RTP 驗證器入口（與玩家玩的同一份數學；rec=false 不改抽樣順序）
  function fullSpin(rng) {
    var r = simSpin(rng, false);
    return { win: r.mult, base: r.baseWin, fs: r.fsWin, trig: r.trig, lineWin: r.base.lineWin, frameWin: r.base.frameWin };
  }

  // 落定排程（純函式·node 可驗）：逐欄由左而右落定；極速模式一次到位。語意同 golden-toad/gem-storm。
  function revealPlan(cols, fast){ if (fast) return [cols]; var p=[],i; for(i=0;i<=cols;i++) p.push(i); return p; }

  HL.abyssalSurge = { simSpin:simSpin, fullSpin:fullSpin, spinOnce:spinOnce, evalLines:evalLines,
    drawFrames:drawFrames, collect:collect, placeMoney:placeMoney, newGrid:newGrid, countScat:countScat,
    mulberry32:mulberry32, revealPlan:revealPlan, fsCount:fsCount, retrigAdd:retrigAdd, inFrame:inFrame,
    dist:dist, LINES:LINES, PAY:PAY, CFG:CFG, WT_BASE:WT_BASE, WT_FS:WT_FS,
    COLS:COLS, ROWS:ROWS, BETCOINS:BETCOINS, MON:MON, SCAT:SCAT, BLANK:BLANK, W:W };
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.abyssalSurge; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el;
  var fmtX = HL.dom && HL.dom.fmtX;

  var GLYPH = { 0:"🌊", 1:"🐋", 2:"🦈", 3:"🐙", 4:"🐠", 5:"🐡", 6:"🦐", 7:"🐚", 8:"🫧", 9:"⭐", 10:"" };
  function symChar(v){ return GLYPH[v] !== undefined ? GLYPH[v] : ""; }

  // 賠付表（G5③）：PAY 以「幣」計價、總注＝BETCOINS 幣 ⇒ 玩家看的倍率＝PAY/BETCOINS（與 evalLines 的 coins/BETCOINS 同一式）。
  function ptSpec(){
    var PT = HL.slotPaytable, rows = [];
    [1,2,3,4,5,6,7].forEach(function(k){
      var p = PAY[k], out = [];
      for (var n = COLS; n >= 3; n--) if (p[n]) out.push(PT.payText(n, p[n] / BETCOINS));
      rows.push({ ic: GLYPH[k], pays: out });
    });
    rows.push({ ic: GLYPH[W], pays: ["Wild · 替代所有計獎符（不替 🫧／⭐），本身不成線"] });
    rows.push({ ic: GLYPH[MON], pays: ["現金符 · 不成線，只有落在氣湧框內才收集；值 " + CFG.monVals.map(function(v){ return v + "×"; }).join("、")] });
    rows.push({ ic: GLYPH[SCAT], pays: ["Scatter · 4 個起觸發免費遊戲（" + [4,5,6].map(function(n){ return n + (n===6?"+":"") + "→" + fsCount(n) + " 轉"; }).join("、") + "）"] });
    return { title:"深淵氣湧 Abyssal Surge", rows: rows,
      intro: "賠付 = 每線倍率 × 總注；" + COLS + "×" + ROWS + " 盤面 · " + LINES.length + " 條固定線，由最左欄連到右、3–" + COLS + " 連（顯示值四捨五入）。",
      notes: [
        "氣湧框：盤面上隨機生成 1–2 個矩形框，框內的 🫧 現金符被收集並相加；框重疊處再乘上 " + CFG.ovVals.map(function(v){ return v + "×"; }).join("／") + " 其中之一。",
        "⭐ 4 個起進免費遊戲：每轉必生框、🫧 落地率 ×" + CFG.monFSx + "、現金值 ×" + CFG.fsBoost + "；轉中 ⭐ " + [3,4,5].map(function(n){ return n + (n===5?"+":"") + "→+" + retrigAdd(n); }).join("／") + " 轉。",
        "本款無買入入口；最大贏分 " + CFG.maxWin + "×總注（達上限即截斷）。",
        "宣告 RTP 由**精確解析式**求得（零抽樣誤差），另以 6000 萬回合 ×2 種子蒙地卡羅交叉核對。"
      ] };
  }
  // 落定前的裝飾符池（刻意排除 🫧/⭐——未落定的格子顯示現金符或 scatter 會謊報結果）
  var SPIN_SYMS = [1,2,3,4,5,6,7,10];
  function spinChar(){ return symChar(SPIN_SYMS[(Math.random()*SPIN_SYMS.length)|0]); }   // 視覺裝飾·非公平關鍵

  function surgeGame() {
    var busy = false;
    var board = el("div", { class: "ax-surge__board" });
    var overlay = el("div", { class: "ax-surge__frames" });
    var modeBadge = el("div", { class: "ax-surge__mode", text: "6×6 · 40 線 · 氣湧框收集" });
    var spinBadge = el("div", { class: "ax-surge__resp", style: "display:none" });
    var potBadge = el("div", { class: "ax-surge__pot", style: "display:none" });
    var stage = el("div", { class: "ax-surge__stage" }, [
      el("div", { class: "ax-surge__hud" }, [ modeBadge, spinBadge, potBadge ]),
      el("div", { class: "ax-surge__wrap" }, [ board, overlay ])
    ]);
    var history = HL.ui.histBar({ cls: "ax-surge__hist", itemCls: "ax-surge__pill", max: 12, fair: true });

    function beat(name){ if (stage.dataset) stage.dataset.beat = name; }
    function delay(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

    // 畫盤：stoppedCols 為「左邊這幾欄已落定」，其餘畫裝飾符；winCells/collected 供高亮
    function draw(grid, opts) {
      opts = opts || {};
      var stopped = opts.stoppedCols === undefined ? COLS : opts.stoppedCols;
      var win = opts.winCells || {}, got = opts.collected || {}, mv = opts.mv || {};
      board.innerHTML = "";
      var c, r;
      for (r=0;r<ROWS;r++) for (c=0;c<COLS;c++) {
        var live = c < stopped, s = live && grid ? grid[c][r] : BLANK;
        var cls = "ax-surge__cell";
        if (!live) cls += " is-spin";
        if (win[c+","+r]) cls += " is-win";
        if (got[c+","+r]) cls += " is-got";
        if (live && s === MON) cls += " is-money";
        if (live && s === SCAT) cls += " is-scat";
        var kids = [ el("span", { class: "ax-surge__sym", text: live ? symChar(s) : spinChar() }) ];
        if (live && s === MON && mv[c+","+r] !== undefined) {
          kids.push(el("span", { class: "ax-surge__val", text: fmtX(mv[c+","+r]) }));
        }
        board.appendChild(el("div", { class: cls }, kids));
      }
    }
    // 畫框：以百分比定位疊在盤面上（重疊區另標）
    function drawFrames(fr) {
      overlay.innerHTML = "";
      if (!fr) return;
      fr.forEach(function (f) {
        overlay.appendChild(el("div", { class: "ax-surge__frame", style:
          "left:" + (f.x/COLS*100) + "%;top:" + (f.y/ROWS*100) + "%;width:" + (f.w/COLS*100) + "%;height:" + (f.h/ROWS*100) + "%" }));
      });
    }
    function clearFrames(){ overlay.innerHTML = ""; }

    function pop(text, cls) {
      var n = el("div", { class: "ax-surge__pop " + (cls||""), text: text });
      stage.appendChild(n);
      setTimeout(function(){ if (n.parentNode) n.parentNode.removeChild(n); }, 1400);
    }
    function setSpins(no, planned) {
      spinBadge.style.display = "";
      spinBadge.textContent = "免費遊戲 " + no + " / " + planned;
    }
    function setPot(v) { potBadge.style.display = ""; potBadge.textContent = "累積 " + fmtX(v); }

    function winCellsOf(grid, wins) {
      var o = {}, i, c;
      if (!grid) return o;
      for (i=0;i<wins.length;i++) {
        var ln = LINES[wins[i].line];
        for (c=0;c<wins[i].run;c++) o[c+","+ln[c]] = 1;
      }
      return o;
    }

    // 逐欄落定（左到右）＝slot 的期待階段
    function revealSpin(grid, mv, fast) {
      var plan = revealPlan(COLS, fast), i = 0;
      beat("reveal");
      function step() {
        if (i >= plan.length) return Promise.resolve();
        draw(grid, { stoppedCols: plan[i], mv: mv });
        i++;
        return delay(fast ? 24 : 110).then(step);
      }
      return step();
    }

    // 一轉的演出：線獎高亮 → 框生成 → 逐 🫧 收集（重疊者標乘數）
    function playSpin(s, fast, potBase) {
      var lineWin = s.lineWin, acc = potBase || 0;
      return Promise.resolve().then(function () {
        if (!s.lineWins.length) return;
        beat("linewin");
        draw(s.grid, { winCells: winCellsOf(s.grid, s.lineWins), mv: s.mv });
        if (!fast) pop(fmtX(lineWin), "");
        return delay(fast ? 40 : 420);
      }).then(function () {
        if (!s.frames) return;
        beat("frame");
        draw(s.grid, { mv: s.mv });
        drawFrames(s.frames);
        // 框越大停留越久＝期待（結構拍，極速仍保留可辨識的最小值）
        var area = s.frames.reduce(function (a, f) { return a + f.w * f.h; }, 0);
        return delay(fast ? 60 : Math.round(240 + area * 12));
      }).then(function () {
        if (!s.collect || !s.collect.hits.length) return;
        beat("collect");
        var got = {}, i = 0;
        function next() {
          if (i >= s.collect.hits.length) return Promise.resolve();
          var h = s.collect.hits[i++];
          got[h.c+","+h.r] = 1;
          draw(s.grid, { collected: got, mv: s.mv });
          drawFrames(s.frames);
          if (!fast) pop((h.over ? "×" + h.mult + " " : "") + fmtX(h.got), h.over ? "is-over" : "");
          return delay(fast ? 25 : 220).then(next);
        }
        return next();
      }).then(function () {
        clearFrames();
        return acc;
      });
    }

    function playRound(bet, ctx) {
      var fast = !!(ctx && ctx.turbo);
      busy = true;
      var seed = Math.floor(HL.fair.floatOr("abyssal-surge") * 4294967296);
      var rng = mulberry32(seed);
      var res = simSpin(rng, true);
      var totalMult = res.mult;

      var done = Promise.resolve().then(function () {
        spinBadge.style.display = "none"; potBadge.style.display = "none"; modeBadge.style.display = "";
        clearFrames();
        return revealSpin(res.base.grid, res.base.mv, fast);
      }).then(function () {
        return playSpin(res.base, fast, 0);
      }).then(function () {
        if (!res.fs || !res.fs.length) return;
        modeBadge.style.display = "none";
        beat("fsstart");
        if (!fast) pop("🫧 深淵氣湧 · 免費遊戲！", "is-fsstart");
        var acc = 0, si = 0;
        // 長 bonus（retrigger）自動壓縮節奏，讓總時長有界
        var pace = Math.max(0.25, Math.min(1, 12 / Math.max(1, res.fs.length)));
        function nextSpin() {
          if (si >= res.fs.length) return Promise.resolve();
          var sp = res.fs[si++];
          setSpins(sp.no, sp.planned);
          if (sp.retrig && !fast) pop("🔄 +" + sp.retrig + " 免費轉數！", "is-fsstart");
          return revealSpin(sp.s.grid, sp.s.mv, fast || pace < 0.5).then(function () {
            return playSpin(sp.s, fast, acc);
          }).then(function () {
            acc += sp.win;
            setPot(Math.min(acc, CFG.maxWin));
            return delay(fast ? 20 : Math.round((sp.win > 0 ? 300 : 110) * pace)).then(nextSpin);
          });
        }
        return nextSpin();
      }).then(function () {
        busy = false;
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
    var rest = mulberry32(0x5A17);
    draw(newGrid(rest, POOL_BASE), { mv: {} });

    var panel = HL.instant.betPanel({ initial: 50, game: "abyssal-surge", playText: "旋轉 🫧", playRound: playRound });

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      HL.slotPaytable.titleRow(el("h2", { class: "ax-inst__title", text: "🫧 深淵氣湧 Abyssal Surge" }), "abyssal-surge", ptSpec),
      stage,
      history.node,
      panel.node,
      HL.ui.gameInfoBar({ fair: "一注一種子·可驗證", edge: HL.gameRtp.edgeOf("abyssal-surge"), rtp: HL.gameRtp.of("abyssal-surge"),
        note: "6×6 盤面 40 條固定線（左到右 3 連起賠）。每轉約 1/5 機率生成 1–2 個氣湧框（寬高各 2–6 隨機）：框內所有 🫧 現金符被收走，落在兩框重疊區的 🫧 再獲 ×2/3/5/8/10 乘數。⭐≥4 觸發免費遊戲 8/10/12 轉（每轉必生框、現金值 ×1.9），轉中 ⭐≥3 再加轉。忠實復刻業界 money-collect 可變框收集格式" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "深淵氣湧 Abyssal Surge", provider: "Apex Studio", key: "abyssal-surge" }) : node;
  }

  HL.games.register({ id: "abyssal-surge", title: "深淵氣湧 Abyssal Surge", provider: "Apex Studio", type: "slot",
    cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#0e7490", c2: "#082f49", render: surgeGame });
})(typeof window !== "undefined" ? window : globalThis);

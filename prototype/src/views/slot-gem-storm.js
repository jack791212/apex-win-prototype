/*
 * Apex Win｜寶石狂潮 Gem Storm 💎（pay-anywhere 任位計數 + tumble 連鎖掉落 + 免費遊戲乘數炸彈 · 忠實復刻業界標準 pay-anywhere/scatter-pays 玩法 · 原創主題）
 * ─────────────────────────────────────────────────────────────────────
 * 機制（pay-anywhere / scatter-pays + tumble，ApexWin 全新 slot 互動維度：完全無「線」概念，靠「任意位置同符號數量」計獎）：
 *   6×5 = 30 格。**沒有 payline**——同一種寶石在盤面「任意位置」出現 ≥8 個即中獎（8-9 / 10-11 / 12+ 三級賠付），與位置/相鄰無關。
 *   ★ Tumble（連鎖掉落）：中獎符號全部消失 → 上方符號重力下落 → 頂部補新符號 → 重新計數，直到無中獎才停（一次 spin 可連續多次 tumble 累積）。
 *   ★ SCATTER ⭐ ≥4 個（任意位置）→ 觸發免費遊戲 10 轉（約 1/240）；免費中再 ≥3 ⭐ retrigger +5 轉。
 *   ★ 免費遊戲乘數炸彈 💣：僅免費遊戲出現，各帶 2×–250× 乘數值；一轉的 tumble 序列結束時，盤上所有炸彈值「加總」乘以該轉總贏分（Sweet Bonanza 招牌，本作忠實復刻此格式、原創主題）。
 * 可驗證公平：一注一 HL.fair 種子 → 決定性 PRNG（mulberry32）跑完整局（含 base 所有 tumble + 免費遊戲所有轉+炸彈值），單一 float 可事後重算整局。
 * RTP 96.5%（宣告；100M 蒙地卡羅實測 96.5697%±0.19pp、40M 交叉 96.5988%，皆 ±0.5% 內）。base RTP 63.7% + 免費遊戲 RTP 32.9%。
 *   波動 SD≈9.7（中高）、hit 35.0%、免費觸發 1/240、max 5000×（100M 實測命中 cap）。以標量 G=2.30 依頻率/賠付/炸彈分布校準；賠付即玩家所見、不套顯示端縮放（honesty）。
 *   購買免費遊戲 82×＝買入 RTP 96.0%（E[FS]=78.6× / 82 ≈ base，公平非坑）。
 * 掛 HL.instant.betPanel 共用引擎（金流/autobet/中央結算掛鉤 liveStats.record 通吃 VIP/任務/返水/JP/帳本）。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var COLS = 6, ROWS = 5, CELLS = COLS * ROWS; // 30
  // 符號：0-4 低賠寶石、5-7 高賠寶石、8 SCATTER(⭐觸發免費·不計獎)、9 BOMB(💣乘數炸彈·僅免費·不計獎)
  var SCAT = 8, BOMB = 9;
  // pay-anywhere 賠付表[sym][tier]  tier: 數量 8-9 → t0、10-11 → t1、12+ → t2（每項以「總注」為單位）
  var PAY = {
    0:[0.20,0.80,3.0], 1:[0.20,0.80,3.0], 2:[0.30,1.0,4.0], 3:[0.40,1.5,6.0], 4:[0.60,2.0,8.0],
    5:[1.0,3.5,15.0], 6:[1.5,6.0,25.0], 7:[2.5,12.0,50.0]
  };
  function tierOf(cnt){ if(cnt<8) return -1; if(cnt<=9) return 0; if(cnt<=11) return 1; return 2; }

  var CFG = {
    // 每格獨立加權抽樣（base / 免費；免費多一個 BOMB 符號）
    wtBase: { 0:15,1:14,2:13,3:12,4:11, 5:9,6:7,7:5, 8:1.95 },
    wtFS:   { 0:15,1:14,2:13,3:12,4:11, 5:9,6:7,7:5, 8:1.95, 9:15.0 },
    fsScat: 4,            // ⭐≥N 觸發免費遊戲
    fsSpins: 10,          // 免費遊戲轉數
    fsRetrig: 3,          // 免費中 ⭐≥N retrigger
    fsRetrigAdd: 5,       // retrigger 加轉
    // 乘數炸彈值(×)與權重（強偏小值、抑制重尾以保可驗證 RTP 收斂）
    bombVals: [[2,28],[3,19],[4,13],[5,9],[6,7],[8,5.5],[10,4.5],[12,3.2],[15,2.6],[20,2.0],[25,1.5],[50,1.1],[100,0.8],[200,0.35],[250,0.15]],
    buyCost: 82,          // 購買免費遊戲（×總注）＝買入 RTP≈96.0%
    maxWin: 5000,         // 派彩上限（×總注）
    G: 2.300              // 校準標量（以頻率/賠付/炸彈分布校準；賠付即玩家所見、不套顯示縮放）
  };

  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  function makePool(wt){ var pool=[],tot=0; for(var k in wt){ if(wt.hasOwnProperty(k) && wt[k]>0){ tot+=wt[k]; pool.push({k:+k,acc:tot}); } } return {pool:pool,tot:tot}; }
  var POOL_BASE=makePool(CFG.wtBase), POOL_FS=makePool(CFG.wtFS);
  function drawSym(rng,pool){ var r=rng()*pool.tot; for(var i=0;i<pool.pool.length;i++){ if(r<pool.pool[i].acc) return pool.pool[i].k; } return 0; }
  var _bvT=0; function bombTot(){ if(_bvT) return _bvT; for(var i=0;i<CFG.bombVals.length;i++) _bvT+=CFG.bombVals[i][1]; return _bvT; }
  function drawBomb(rng){ var t=bombTot(),r=rng()*t,acc=0; for(var i=0;i<CFG.bombVals.length;i++){ acc+=CFG.bombVals[i][1]; if(r<acc) return CFG.bombVals[i][0]; } return 2; }

  // grid = array[COLS] of array[ROWS]（column-major，重力＝每欄）。row 0 = 頂端。
  function newGrid(rng,pool){ var g=[]; for(var c=0;c<COLS;c++){ g[c]=[]; for(var r=0;r<ROWS;r++) g[c][r]=drawSym(rng,pool); } return g; }
  function countSym(g){ var cnt={}; for(var c=0;c<COLS;c++)for(var r=0;r<ROWS;r++){ var s=g[c][r]; cnt[s]=(cnt[s]||0)+1; } return cnt; }
  function countScat(g){ var n=0; for(var c=0;c<COLS;c++)for(var r=0;r<ROWS;r++) if(g[c][r]===SCAT) n++; return n; }
  function snap(g){ var s=[],c,r; for(c=0;c<COLS;c++){ s[c]=[]; for(r=0;r<ROWS;r++) s[c][r]=g[c][r]; } return s; }
  function cloneMap(m){ var o={}; for(var k in m) if(m.hasOwnProperty(k)) o[k]=m[k]; return o; }

  // 評盤：任一計獎符號數量 ≥8 即賠；回傳 { win, winSyms:{sym:true} }（× 總注單位）
  function evalBoard(g){
    var cnt=countSym(g), win=0, winSyms={}, s;
    for(s in cnt){ if(!cnt.hasOwnProperty(s)) continue; s=+s; if(s===SCAT||s===BOMB) continue; var t=tierOf(cnt[s]); if(t>=0 && PAY[s]){ win+=PAY[s][t]; winSyms[s]=true; } }
    return { win:win, winSyms:winSyms };
  }
  // tumble：移除中獎符號、每欄重力下落、頂部補新符號抽樣。bv=炸彈值圖（"c,r"->值），同步維護。
  function tumble(g, winSyms, rng, pool, bv){
    for(var c=0;c<COLS;c++){
      var keep=[],keepv=[],r; for(r=0;r<ROWS;r++){ var s=g[c][r]; if(!winSyms[s]){ keep.push(s); if(bv) keepv.push(s===BOMB?bv[c+","+r]:0); } }
      var need=ROWS-keep.length, col=[],colv=[],i;
      for(i=0;i<need;i++){ var ns=drawSym(rng,pool); col.push(ns); if(bv) colv.push(ns===BOMB?drawBomb(rng):0); }  // 新符號在頂
      for(i=0;i<keep.length;i++){ col.push(keep[i]); if(bv) colv.push(keepv[i]); }
      g[c]=col;
      if(bv){ for(r=0;r<ROWS;r++) delete bv[c+","+r]; for(r=0;r<ROWS;r++){ if(col[r]===BOMB) bv[c+","+r]=colv[r]; } }
    }
  }
  function sumBv(bv){ var s=0; for(var k in bv) if(bv.hasOwnProperty(k)) s+=bv[k]; return s; }

  // #72：免費遊戲「總贏分」pot 計分板的顯示值＝單一真相（純函式·node 可驗）。
  //   confirmedPreG＝已結算各轉 seqWin 的跨轉總和（炸彈乘數已套、CFG.G 尚未套）；liveRaw＝當轉 tumble 進行中的原始贏分（未套炸彈、未套 G）。
  //   一律 (confirmedPreG + liveRaw) × CFG.G 並夾 maxWin ⇒ 全程同尺同源、跨轉累積、單調不退。
  //   舊病根＝tumble 進行中顯示「當轉 running.acc × G」（每轉重置），轉間卻顯示「跨轉 acc.v（漏乘 G）」
  //   ⇒ 兩個不同尺/不同範圍交替寫同一顆 badge：數字每轉倒退，且免費結束顯示值恰為實付 FS 派彩的 1/2.3。
  //   因 runFS 的實付 FS 派彩＝(Σ sp.seqWin) × CFG.G（見下方 total*=CFG.G），故 fsPotDisplay(Σ sp.seqWin, 0) 必等於實付（夾頂前）。
  function fsPotDisplay(confirmedPreG, liveRaw){ var v=(confirmedPreG+(liveRaw||0))*CFG.G; return v>CFG.maxWin?CFG.maxWin:v; }

  // #22：tumble 連鎖缺少「消除」中間影格 → 上一鎖的中獎高亮還亮著、下一鎖的完整新盤就直接取代，玩家數不出連了幾鎖。
  //   把 rec 的 steps（[{grid,winSyms,win}…]，最後一步 win=0＝靜止盤）展開成「逐拍」序列：每個 win>0 的 step 產生
  //   highlight（中獎符號亮）→ eliminate（中獎格清空）兩拍，接著才是下一個 step 的新盤（refill）；win=0 的靜止盤為
  //   單一 rest 拍（末端恰一個）。⇒ 每次連鎖都有「亮→消失→補位」可辨識節奏、可數鎖數（對照 dead-by-noon win/cascade 兩拍）。
  //   純資料轉換（不改抽樣/RTP/派彩）：只重新編排既有 steps 的呈現拍，grid/winSyms 逐位取自原 step。
  function cascadeBeats(steps){
    var out=[], i, s;
    for(i=0;i<steps.length;i++){
      s=steps[i];
      if(s.win>0){
        out.push({ phase:"highlight", grid:s.grid, winSyms:s.winSyms, bv:s.bv||null, win:s.win });
        out.push({ phase:"eliminate", grid:s.grid, winSyms:s.winSyms, bv:s.bv||null, win:s.win });
      } else {
        out.push({ phase:"rest", grid:s.grid, winSyms:{}, bv:s.bv||null, win:0 });
      }
    }
    return out;
  }

  // 免費遊戲：每轉建盤(炸彈帶值)→tumble 序列→序列有贏則乘上盤面炸彈值加總。rec 時記錄事件時間軸。
  function runFS(rng, rec){
    var spins=CFG.fsSpins, total=0, spin=0, evSpins= rec?[]:null, retrig=0, guard0=0;
    while(spin<spins && guard0++<400){
      spin++;
      var g=[], bv={}, c, r;
      for(c=0;c<COLS;c++){ g[c]=[]; for(r=0;r<ROWS;r++){ var s=drawSym(rng,POOL_FS); g[c][r]=s; if(s===BOMB) bv[c+","+r]=drawBomb(rng); } }
      var initScat=countScat(g);
      var seqWin=0, guard=0, steps= rec?[]:null;
      while(guard++<100){
        var e=evalBoard(g);
        if(rec) steps.push({ grid:snap(g), bv:cloneMap(bv), winSyms: e.win>0?cloneMap(e.winSyms):{}, win:e.win });
        if(e.win<=0) break;
        seqWin+=e.win; tumble(g, e.winSyms, rng, POOL_FS, bv);
      }
      var msum=sumBv(bv), applied=0;
      if(seqWin>0 && msum>0){ applied=msum; seqWin*=msum; }
      total+=seqWin;
      var retrigHere=initScat>=CFG.fsRetrig;                                // #23：本轉是否 retrigger（免費中 ⭐≥fsRetrig）
      if(retrigHere){ spins+=CFG.fsRetrigAdd; retrig++; }
      if(spins>200) spins=200;
      // #23：先加轉再 push ⇒ spinsPlanned（分母）在 retrigger 當轉就變大、不再延後一轉；retrig 旗標供 render 即時慶祝（原本 runFS 回傳的 retrig 從未被 render 使用）
      if(rec) evSpins.push({ init:steps.length?steps[0].grid:snap(g), steps:steps, msum:msum, applied:applied, seqWin:seqWin, spinNo:spin, spinsPlanned:spins, retrig:retrigHere, retrigAdd:retrigHere?CFG.fsRetrigAdd:0 });
    }
    total*=CFG.G; if(total>CFG.maxWin) total=CFG.maxWin;
    return { total:total, spins:evSpins, retrig:retrig };
  }

  // base spin（tumble 序列）。rec 時記錄每步。回傳 { win, scat, steps }
  function baseRun(rng, rec){
    var g=newGrid(rng,POOL_BASE), scat=countScat(g), win=0, guard=0, steps= rec?[]:null;
    while(guard++<100){
      var e=evalBoard(g);
      if(rec) steps.push({ grid:snap(g), winSyms: e.win>0?cloneMap(e.winSyms):{}, win:e.win });
      if(e.win<=0) break;
      win+=e.win; tumble(g, e.winSyms, rng, POOL_BASE, null);
    }
    return { win:win*CFG.G, scat:scat, steps:steps };
  }

  // 完整一注：base +（⭐≥fsScat 或 force）免費遊戲。force=true 為購買路徑（只計免費遊戲，等價 runFS，買入 RTP 對齊）。
  function simSpin(rng, force, rec){
    if(force){
      var fr=runFS(rng, rec);
      return { mult:fr.total, mode:"fs", scat:CFG.fsScat, baseWin:0, fsWin:fr.total, timeline: rec?{ base:null, fs:fr }:null };
    }
    var b=baseRun(rng, rec), win=b.win, mode=null, fsWin=0, fs=null;
    if(b.scat>=CFG.fsScat){ mode="fs"; fs=runFS(rng, rec); fsWin=fs.total; win+=fsWin; }
    if(win>CFG.maxWin) win=CFG.maxWin;
    return { mult:win, mode:mode, scat:b.scat, baseWin:b.win, fsWin:fsWin, timeline: rec?{ base:b.steps, fs:fs }:null };
  }

  // node RTP 驗證器入口（與玩家玩的同一份數學；rec=false 不改抽樣順序）
  function fullSpin(rng){ var r=simSpin(rng,false,false); return { win:r.mult, base:r.baseWin, fs:r.fsWin, trig:r.mode==="fs" }; }
  function buySpin(rng){ return simSpin(rng,true,false).mult; }

  HL.gemStorm = { simSpin:simSpin, fullSpin:fullSpin, buySpin:buySpin, runFS:runFS, baseRun:baseRun, evalBoard:evalBoard, tumble:tumble, newGrid:newGrid, countSym:countSym, countScat:countScat, drawSym:drawSym, drawBomb:drawBomb, mulberry32:mulberry32, tierOf:tierOf, fsPotDisplay:fsPotDisplay, cascadeBeats:cascadeBeats, CFG:CFG, PAY:PAY, COLS:COLS, ROWS:ROWS, SCAT:SCAT, BOMB:BOMB };
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.gemStorm; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;

  var GLYPH = { 0:"🔷", 1:"💚", 2:"💜", 3:"🧡", 4:"❤️", 5:"💎", 6:"🔱", 7:"👑", 8:"⭐", 9:"💣" };
  function symChar(v){ return GLYPH[v]!==undefined ? GLYPH[v] : ""; }
  var fmtX = HL.dom && HL.dom.fmtX;  // T25：收斂至 HL.dom 單一出口（原四款 slot 逐字複製）；短路守衛＝node RTP 驗證器 require 時 HL.dom 未載也不拋（fmtX 僅 render 閉包內用），呼叫端零改動
  function winCellsOf(grid, winSyms){ var o={},c,r; if(!grid) return o; for(c=0;c<COLS;c++)for(r=0;r<ROWS;r++){ if(winSyms[grid[c][r]]) o[c+","+r]=1; } return o; }

  function gemGame(){
    var busy=false;
    var board=el("div",{class:"ax-gem__board"});
    var modeBadge=el("div",{class:"ax-gem__mode",text:"6×5 · 任位計數（8+ 同符即中）"});
    var spinBadge=el("div",{class:"ax-gem__resp",style:"display:none"});
    var potBadge=el("div",{class:"ax-gem__pot",style:"display:none"});
    var stage=el("div",{class:"ax-gem__stage"},[
      el("div",{class:"ax-gem__hud"},[ modeBadge, spinBadge, potBadge ]),
      board
    ]);
    var history=HL.ui.histBar({ cls:"ax-gem__hist", itemCls:"ax-gem__pill", max:12, fair:true });

    // grid(column-major); winCells:{"c,r":1}; bv:{"c,r":value 炸彈}
    function renderGrid(grid, winCells, bv, clearCells){
      HL.dom.clear(board);
      for(var r=0;r<ROWS;r++) for(var c=0;c<COLS;c++){
        var key=c+","+r, s=grid?grid[c][r]:0, cls="ax-gem__cell";
        if(clearCells && clearCells[key]){   // #22：消除中間影格＝中獎格清空（亮→消失→補位）。內聯樣式＝零首屏 CSS 成本，不動 components.css
          board.appendChild(el("div",{class:cls+" is-clear",style:"opacity:.16;transform:scale(.72)"})); continue;
        }
        if(s===SCAT) cls+=" is-scat";
        if(s===BOMB) cls+=" is-bomb";
        if(winCells && winCells[key]) cls+=" is-win";
        if(s===BOMB && bv && bv[key]){
          board.appendChild(el("div",{class:cls},[ el("div",{class:"ax-gem__glyph",text:"💣"}), el("div",{class:"ax-gem__bombv",text:bv[key]+"×"}) ]));
        } else {
          board.appendChild(el("div",{class:cls,text:grid?symChar(s):""}));
        }
      }
    }
    function setSpins(n,total){ spinBadge.style.display=""; spinBadge.textContent="🎁 免費 "+n+"/"+total; }
    function setPot(v){ potBadge.style.display=""; potBadge.textContent="💰 "+fmtX(v); }
    function pop(text,cls){ return HL.dom.floatPop(stage, "ax-gem__pop "+(cls||""), text, 1100); }
    function renderResting(){ var rng=mulberry32(0x6E33); renderGrid(newGrid(rng,POOL_BASE),null,null); modeBadge.style.display=""; spinBadge.style.display="none"; potBadge.style.display="none"; }
    var delay = HL.dom.delay;

    // 播放 tumble 序列（steps: [{grid,winSyms,win}...]，最後一步 win=0 為靜止盤）。pace: 1=base 從容、0.55=免費遊戲較快。回傳 Promise。
    //   #22：先把 steps 展開成 cascadeBeats（highlight→eliminate→…→rest），讓每次連鎖有「亮→消失→補位」可辨識節奏、可數鎖數。
    function playSteps(steps, fast, running, pace){
      var beats=cascadeBeats(steps), i=0, p=(pace||1);
      function step(){
        if(i>=beats.length) return Promise.resolve();
        var b=beats[i++];
        if(b.phase==="eliminate"){   // 中獎格清空的中間影格（不改 acc/pot；只是把「這些消失了」演出來）
          renderGrid(b.grid, null, b.bv||null, winCellsOf(b.grid, b.winSyms));
          if(board.dataset) board.dataset.beat="eliminate";
          return delay(fast?22:Math.round(160*p)).then(step);
        }
        var wc=b.win>0? winCellsOf(b.grid, b.winSyms):null;
        renderGrid(b.grid, wc, b.bv||null, null);
        if(board.dataset) board.dataset.beat=b.phase;
        if(b.win>0){
          if(running){ running.acc+=b.win; setPot(fsPotDisplay(running.base, running.acc)); }   // #72：跨轉 base + 當轉原始贏分，同尺(×G)顯示 ⇒ 不再每轉重置倒退
          if(!fast && !running) pop(fmtX(b.win), "");   // base 才逐步 pop 贏分；免費靠 pot 累積避免刷屏
          return delay(fast?40:Math.round(360*p)).then(step);
        }
        return delay(fast?18:Math.round(200*p)).then(step);
      }
      return step();
    }

    function playRound(bet, ctx){
      var fast=!!(ctx&&ctx.turbo), forced=(ctx&&ctx.forceBonus)||0;
      busy=true;
      var seed=Math.floor(HL.fair.floatOr("gem-storm")*4294967296);
      var rng=mulberry32(seed);
      var res=simSpin(rng, forced?1:0, true);
      var totalMult=res.mult, tl=res.timeline;

      var done=Promise.resolve().then(function(){
        spinBadge.style.display="none"; potBadge.style.display="none"; modeBadge.style.display="";
        if(tl.base){ return playSteps(tl.base, fast, null, 1); }
      }).then(function(){
        if(!tl.fs) return;
        // 免費遊戲
        modeBadge.style.display="none";
        if(!fast) pop("💎 寶石狂潮 · 免費遊戲！","is-fsstart");
        var acc={ v:0 }, fs=tl.fs, si=0;
        // 長 bonus（retrigger）自動壓縮節奏，讓總時長有界（10 轉從容、越多轉越快）
        var paceFS=Math.max(0.2, Math.min(0.55, 0.55*12/Math.max(1,fs.spins.length)));
        function nextSpin(){
          if(si>=fs.spins.length) return Promise.resolve();
          var sp=fs.spins[si++];
          setSpins(sp.spinNo, sp.spinsPlanned);
          if(sp.retrig && !fast) pop("🔄 +"+sp.retrigAdd+" 免費轉數！","is-fsstart");   // #23：retrigger 即時慶祝（分母已於 sp.spinsPlanned 同轉變大）
          var run={ acc:0, base: acc.v };   // #72：base＝已結算跨轉總和(pre-G) ⇒ tumble 進行中顯示 (base+當轉原始)×G，跨轉累積不重置
          return playSteps(sp.steps, fast, run, paceFS).then(function(){
            if(sp.applied>0 && sp.seqWin>0){
              if(!fast) pop("💣 ×"+sp.applied+" 炸彈加乘！","is-chippop");
            }
            acc.v += sp.seqWin;
            setPot(fsPotDisplay(acc.v, 0));   // #72：結算後顯示跨轉總和×G（＝實付 FS 派彩尺，原本漏乘 G 恰為 1/2.3）
            return delay(fast?25:Math.round((sp.seqWin>0?340:110)*(paceFS/0.55))).then(nextSpin);
          });
        }
        return nextSpin();
      }).then(function(){
        busy=false;
        history.push(fmtX(totalMult), totalMult>=1?"is-win":"is-lose");
        if(totalMult>=100) pop("💥 "+fmtX(totalMult)+" MEGA WIN！","is-mega");
        else if(totalMult>=10) pop("🎉 "+fmtX(totalMult),"is-big");
        renderResting();
      });
      return { multiplier: totalMult, label:(res.mode?"🎁 免費遊戲 ":"")+"開出 "+fmtX(totalMult), done:done };
    }

    var panel=HL.instant.betPanel({ initial:50, game:"gem-storm", playText:"旋轉 💎", playRound:playRound });

    var buyBtn=el("button",{class:"ax-gem__buy",text:"購買免費遊戲 "+CFG.buyCost+"×",onClick:function(){
      if(busy||buyBtn.disabled||panel.isBusy()) return;   // 家族 A：面板的回合在途時也不准買入（否則兩局動畫演在同一個 board 上）
      var bet=panel.getBet?panel.getBet():50;
      var cost=Math.round(bet*CFG.buyCost);   // 買入 RTP≈96.0%（E[FS]=78.6× / 82 ≈ base 96.5%，公平非坑）
      if(cost>HL.instant.bal()){ HL.ui.toast("餘額不足（Demo）","warn"); return; }
      if(HL.rg && !HL.rg.check(cost)) return;   // #86：買入繞過 betPanel 自行扣款 ⇒ 需自帶閘（正常旋轉已由 instant.js:89/:120 閘住）
      buyBtn.disabled=true; panel.lock(true); HL.instant.setBal(HL.instant.bal()-cost);
      var r=playRound(bet,{turbo:!!(HL.gset && HL.gset.get("fast")),forceBonus:1});   // 家族 C：買入動畫也要吃極速模式（p90 20 秒的乾等）
      r.done.then(function(){
        var payout=Math.round(bet*r.multiplier);
        if(payout) HL.instant.setBal(HL.instant.bal()+payout);
        if(HL.liveStats) HL.liveStats.record("gem-storm", cost, payout);
        HL.ui.toast("💎 免費遊戲結果：贏 "+HL.dom.money(payout)+"（本 "+HL.dom.money(cost)+"）", payout>=cost?"ok":"warn");
        buyBtn.disabled=false; panel.lock(false);
      });
    }});

    renderResting();

    var node=el("div",{class:"ax-inst ax-fade-in"},[
      el("h2",{class:"ax-inst__title",text:"💎 寶石狂潮 Gem Storm"}),
      stage,
      history.node,
      panel.node,
      el("div",{class:"ax-gem__buyrow"},[ buyBtn, el("small",{class:"ax-muted",text:"直接觸發免費遊戲（保證 4 ⭐ 起手）"}) ]),
      HL.ui.gameInfoBar({ fair:"一注一種子·可驗證", edge:HL.gameRtp.edgeOf("gem-storm"), rtp:HL.gameRtp.of("gem-storm"), note:"6×5 任位計數：同一寶石在盤面任意位置 ≥8 個即中獎（8-9/10-11/12+ 三級賠付），無 payline。中獎符號消失、連鎖掉落（tumble）補新可連續中；⭐≥4 觸發免費遊戲（約 1/240），免費中 💣乘數炸彈值加總乘上該轉贏分。忠實復刻業界標準 pay-anywhere/tumble 玩法" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node,{ title:"寶石狂潮 Gem Storm", provider:"Apex Studio", key:"gem-storm" }) : node;
  }

  HL.games.register({ id:"gem-storm", title:"寶石狂潮 Gem Storm", provider:"Apex Studio", type:"slot", cat:"originals", playable:true, comingSoon:false, isNew:true, hot:true, c1:"#7c3aed", c2:"#1e1043", render: gemGame });
})(typeof window !== "undefined" ? window : globalThis);

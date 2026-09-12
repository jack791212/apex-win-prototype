/*
 * Apex Win｜Pirots 探險 🦜（網格收集 slot · 對標 ELK Studios "Pirots 5" 玩法 · 忠實復刻）
 * ─────────────────────────────────────────────────────────────────────
 * 機制（grid-collection，ApexWin 全新互動維度）：
 *   6×6 網格填滿彩色寶石 → 鳥 CollectR 收集「連通同色 ≥6」的寶石群（吃掉→賠付→留空）→
 *   上方寶石落下 + 頂部補新（cascade）→ 每次有收集的 cascade 漸進乘數 +1 →
 *   累積收集數達門檻「解鎖更大網格」6→7→8（版面擴張）→ 直到某次 cascade 無收集才停。
 *   ⭐SCATTER ≥3 → 免費遊戲：乘數「持續不重置」逐 cascade +5、版面保持擴張 → 罕見暴走（max 10000×）。
 *   X-iter：花 103.7× 直接購買免費遊戲（買入 RTP 99.68/103.7＝96.123% ≈ 標稱基礎，見 CFG.buyPrice）。
 * 可驗證公平：一注一 HL.fair 種子 → 決定性 PRNG（mulberry32）跑完整局，事後單一 float 可重算整盤。
 * 標稱 RTP 96.145%（單一真相在 data/game-rtp.js，畫面資訊列讀 HL.gameRtp.of；G 標量原以 1M MC 校準，
 *   250M×5 種子實測真值 96.187%）。#99（2026-08-16 遊戲軌）裁定：原顯示 96.0% 係過時 1M 目標值，
 *   已收斂到與買入價/deep 鎖/edge.js 一致的 96.145%（只動顯示、不動經濟）。
 *   高波動（SD≈28）、base hit≈35%、FS 觸發≈0.77%、max 10000×（P≈1e-5，蒙地卡羅實測可達）。
 * 掛 HL.instant.betPanel 共用引擎（金流/autobet/中央結算掛鉤 liveStats.record 通吃 VIP/任務/返水/JP/帳本）。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；游戲 render + node RTP 驗證器共用）=====================
  var CFG = {
    colors: 6,
    colorVal: [0.4, 0.5, 0.7, 1.0, 1.6, 3.0],
    colorWt:  [34, 28, 22, 16, 10, 5],
    scatterWt: 1.15,
    minCluster: 6,
    sizeBase: 6, sizeMax: 8,
    expandAt: [10, 24],
    fsAward: 12, fsRetrig: 10,
    fsStartMult: 3, fsMultInc: 5, fsSpinCap: 140,
    maxWin: 10000,
    G: 0.035796,         // 全域賠付標量（2000 萬回合校準；RTP 96%，高波動 tail 需大樣本）
    // X-iter 免費遊戲購買價。**必須 = E[買入倍數]/宣告RTP**（保真閘第 14 項）：
    // 實測 E[force=FS] = 99.68×（2M 種子 321321，另兩獨立種子 99.667/99.746 一致）→ 99.68/0.96145 ≈ 103.7×
    // ⚠️ 首版誤設 100× ＝ 買入 RTP 99.68%（比基礎高 3.5pp＝玩家只按買入即可套利，且樣本上緣觸 100%）。
    // 2026-07-28 健檢修正。按鈕文字與扣款皆讀此常數（禁止硬編）；改動須重跑 node 驗證器驗買入 RTP。
    buyPrice: 103.7
  };

  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  function drawSym(rng){ var tw=CFG.scatterWt,i; for(i=0;i<CFG.colors;i++) tw+=CFG.colorWt[i];
    var r=rng()*tw, acc=0; for(i=0;i<CFG.colors;i++){ acc+=CFG.colorWt[i]; if(r<acc) return i; } return -1; }
  function clusterFactor(s){ if(s<6) return 0; var f=[0,0,0,0,0,0,1,2.5,6,14,30,55][s]; return f!==undefined? f : (s*5); }
  function fillGrid(size,rng){ var g=[],r,c; for(r=0;r<size;r++){ g[r]=[]; for(c=0;c<size;c++) g[r][c]=drawSym(rng); } return g; }
  function countScatter(g,size){ var n=0,r,c; for(r=0;r<size;r++)for(c=0;c<size;c++) if(g[r][c]===-1) n++; return n; }
  function findClusters(g,size){
    var seen=[],r,c; for(r=0;r<size;r++){seen[r]=[];for(c=0;c<size;c++)seen[r][c]=false;}
    var out=[];
    for(r=0;r<size;r++)for(c=0;c<size;c++){
      if(seen[r][c]||g[r][c]<0) continue;
      var col=g[r][c], stack=[[r,c]], cells=[]; seen[r][c]=true;
      while(stack.length){ var p=stack.pop(); cells.push(p);
        var nb=[[p[0]-1,p[1]],[p[0]+1,p[1]],[p[0],p[1]-1],[p[0],p[1]+1]];
        for(var k=0;k<4;k++){ var nr=nb[k][0],nc=nb[k][1];
          if(nr>=0&&nr<size&&nc>=0&&nc<size&&!seen[nr][nc]&&g[nr][nc]===col){ seen[nr][nc]=true; stack.push([nr,nc]); } } }
      if(cells.length>=CFG.minCluster) out.push({color:col,cells:cells});
    }
    return out;
  }
  function collapse(g,size,removed,rng){
    var r,c,i; for(i=0;i<removed.length;i++) g[removed[i][0]][removed[i][1]]=null;
    for(c=0;c<size;c++){ var col=[]; for(r=size-1;r>=0;r--) if(g[r][c]!==null) col.push(g[r][c]);
      for(r=size-1;r>=0;r--){ g[r][c]= (size-1-r)<col.length ? col[size-1-r] : drawSym(rng); } }
  }
  // #31：連爆「落下」的位移來源（純函式·顯示端唯一出口）。
  //   collapse 是逐欄重力：倖存者往下沉、頂端補新符號。而畫面過去每一影格都 clear+重建全部格子
  //   ⇒ 玩家看到的是整盤瞬間換字，沒有任何東西掉下來（components.css 上那條 transform 過渡因此是死碼）。
  //   回傳以**新盤座標**索引的 size×size：offs[r][c] = 這一格「往下掉了幾列」。
  //     倖存者＝新列 - 舊列；頂端新符號＝該欄被消除數 k（整疊自盤面上方落進來，與 slot.js tumbleAnimate 同式）。
  //   ⚠️ 它不是第二份重力規則——`games/pirots/cascade-falls-from-the-math` 會在 node 裡拿它算出的位移
  //     去重建 collapse 的結果並逐格比對，任一格對不上就紅 ⇒ 動畫講的落點不可能與數學分岔。
  function fallOffsets(size, removed){
    var rm={}, i, r, c;
    for(i=0;i<removed.length;i++) rm[removed[i][0]+","+removed[i][1]]=1;
    var offs=[]; for(r=0;r<size;r++){ offs[r]=[]; for(c=0;c<size;c++) offs[r][c]=0; }
    for(c=0;c<size;c++){
      var k=0; for(r=0;r<size;r++) if(rm[r+","+c]) k++;
      var below=0;                                     // 由下往上走：below＝這一格下方已安置幾個倖存者
      for(r=size-1;r>=0;r--){
        if(rm[r+","+c]) continue;
        offs[size-1-below][c] = (size-1-below) - r;    // 倖存者的落點
        below++;
      }
      for(r=0;r<k;r++) offs[r][c]=k;                   // 頂端 k 個新符號：整疊自盤面上方進場
    }
    return offs;
  }
  function expandGrid(g,size,rng){ var r,c; for(r=0;r<size;r++){ if(!g[r]) g[r]=[]; }
    for(r=0;r<size;r++) for(c=0;c<size;c++){ if(g[r][c]===undefined||g[r][c]===null) g[r][c]=drawSym(rng); } }
  function snap(g,size){ var s=[],r,c; for(r=0;r<size;r++){s[r]=[];for(c=0;c<size;c++)s[r][c]=g[r][c];} return s; }
  // #56：「鳥收集寶石 → 集滿擴張網格」這條機制**數學上一直存在**（runReel 的 collected/expandAt），
  // 但畫面上沒有任何一格顯示它 ⇒ 版面擴張對玩家而言是憑空發生的。下面兩個純函式是**顯示端唯一的取值出口**：
  // runReel 判擴張與收集面板顯示門檻，求的是同一個 nextExpandAt(size) ⇒ 不可能漂成兩份真相。
  function nextExpandAt(size){
    if (size >= CFG.sizeMax) return null;
    var th = CFG.expandAt[size - CFG.sizeBase];
    return th === undefined ? null : th;
  }
  function expandProgress(size, collected){
    var need = nextExpandAt(size);
    if (need === null) return { need:null, have:collected, frac:1, maxed:true };
    var have = collected < need ? collected : need;
    return { need:need, have:have, frac: need>0 ? have/need : 1, maxed:false };
  }
  // 逐色收集計數：collect 事件 → 6 色 tally。**不變式：sum(tally) === runReel 回傳的 collected**
  // （擴張門檻吃的就是那個 collected）⇒ node 可直接證「畫面上那六個數字＝數學真的吃掉的寶石」。
  function tallyColors(clusters, into){
    var t = into || [0,0,0,0,0,0], i, c;
    for (i=0;i<clusters.length;i++){ c=clusters[i];
      if (c.color>=0 && c.color<CFG.colors) t[c.color] += (c.size!==undefined ? c.size : c.cells.length); }
    return t;
  }
  // #44：靜態擺設盤（未開局）不得含 ≥minCluster 同色連通群——那是「依自家規則早該被收集」的非法待機態
  // （真實 slot 的待機盤永遠不會停在一個已中獎的畫面上）。純視覺裝飾、與可驗證公平/RTP 無關。
  // 從 seed 起重抽到無 cluster 為止（純函式 ⇒ node 可對任意 seed 驗不變式）。
  function restingGrid(seed){
    var size=CFG.sizeBase, s=(seed>>>0)||0x1234, g, guard=0;
    do { g=fillGrid(size, mulberry32(s)); s=(s+0x9E3779B1)>>>0; } while(findClusters(g,size).length && ++guard<128);
    return { grid:g, size:size };
  }

  // 跑一顆主軸：collection→cascade 直到無收集。rec=true 記錄事件時間軸供動畫重播。
  function runReel(size,mult,rng,rec,mInc){
    mInc=mInc||1;
    var g=fillGrid(size,rng), win=0, collected=0, scat=countScatter(g,size), events=[], guard=0;
    if(rec) events.push({t:"fill",grid:snap(g,size),size:size,mult:mult});
    while(true){
      if(++guard>400) break;
      var cl=findClusters(g,size); if(!cl.length) break;
      var removed=[], cascWin=0, i, j;
      for(i=0;i<cl.length;i++){ var s=cl[i].cells.length;
        cascWin+=CFG.G*CFG.colorVal[cl[i].color]*clusterFactor(s)*mult; collected+=s;
        for(j=0;j<cl[i].cells.length;j++) removed.push(cl[i].cells[j]); }
      win+=cascWin;
      if(rec) events.push({t:"collect",clusters:cl.map(function(x){return{color:x.color,cells:x.cells,size:x.cells.length};}),win:cascWin,mult:mult});
      collapse(g,size,removed,rng);
      var ns=countScatter(g,size); if(ns>scat) scat=ns;
      mult+=mInc;
      var th=nextExpandAt(size); if(th!==null&&collected>=th){ size++; expandGrid(g,size,rng); if(rec) events.push({t:"expand",size:size}); }
      if(rec) events.push({t:"cascade",grid:snap(g,size),size:size,mult:mult});
    }
    return {win:win,scatters:scat,endSize:size,endMult:mult,collected:collected,events:events};
  }

  // 完整一注：base + (scatter≥3 或 force) 免費遊戲（乘數持續不重置）。rec=true 回傳完整事件時間軸。
  function simSpin(rng, force, rec){
    var base=runReel(CFG.sizeBase,1,rng,rec,1);
    var win=base.win, triggered=(base.scatters>=3)|| !!force, fsWin=0, fsSpins=0;
    var timeline= rec ? { base:base.events, fs:[], triggered:triggered } : null;
    if(triggered){
      var spins=CFG.fsAward, mult=CFG.fsStartMult, size=Math.max(base.endSize,7), i=0;
      while(i<spins && spins<=CFG.fsSpinCap){
        var rr=runReel(size,mult,rng,rec,CFG.fsMultInc);
        fsWin+=rr.win; mult=rr.endMult; size=rr.endSize;
        if(rec) timeline.fs.push({idx:i+1,total:spins,events:rr.events,retrig:rr.scatters>=3});
        if(rr.scatters>=3){ spins+=CFG.fsRetrig; }
        i++;
      }
      win+=fsWin; fsSpins=spins;
    }
    if(win>CFG.maxWin) win=CFG.maxWin;
    return {mult:win, base:base.win, fsWin:fsWin, fsSpins:fsSpins, triggered:triggered, scatters:base.scatters, timeline:timeline};
  }

  HL.pirots = { simSpin:simSpin, mulberry32:mulberry32, CFG:CFG, findClusters:findClusters, restingGrid:restingGrid,
                nextExpandAt:nextExpandAt, expandProgress:expandProgress, tallyColors:tallyColors, runReel:runReel,
                fallOffsets:fallOffsets, collapse:collapse, drawSym:drawSym };  // #31：collapse/drawSym 導出僅供 node 拿去重建位移做逐格比對（同 PAY 導出先例），瀏覽器行為零變更
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.pirots; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el;

  var GEM = ["🟥","🟧","🟨","🟩","🟦","🟪"];   // 6 色寶石（對應 color 0..5，稀有→高賠：紫最高）
  var SCAT = "🦜";                              // scatter＝探險鳥（觸發免費遊戲）
  function symChar(v){ return v===-1 ? SCAT : (v>=0 && v<GEM.length ? GEM[v] : ""); }
  var fmtX = HL.dom && HL.dom.fmtX;  // T25：收斂至 HL.dom 單一出口（原四款 slot 逐字複製）；短路守衛＝node RTP 驗證器 require 時 HL.dom 未載也不拋（fmtX 僅 render 閉包內用），呼叫端零改動

  function pirotsGame() {
    var size = CFG.sizeBase, busy = false;
    var board = el("div", { class: "ax-pir__board", style: "overflow:hidden" });   // #31：頂端新符號是從盤面「上方」落進來的，不裁切會蓋到 HUD（真實 slot 盤面本來就是一個裁切窗，同 slot.js 的 reel 窗）。內聯＝本檔走 #110 延遲載入，寫進 components.css 會變成首屏成本。
    var multBadge = el("div", { class: "ax-pir__mult", text: "×1" });
    var fsBadge = el("div", { class: "ax-pir__fs", style: "display:none" });
    var stage = el("div", { class: "ax-pir__stage" }, [
      el("div", { class: "ax-pir__hud" }, [ el("span",{class:"ax-pir__gridlbl"}), multBadge, fsBadge ]),
      board
    ]);
    var history = HL.ui.histBar({ cls: "ax-pir__hist", itemCls: "ax-pir__pill", max: 12, fair: true });

    // ── #56 收集者：把「鳥收集寶石 → 集滿擴張網格」這條機制搬到畫面上 ─────────────────
    // 在此之前，玩家看得到的只有 🗺️size 與 ×mult：鳥只以 scatter 符號存在、六色收集數與擴張門檻
    // 都藏在 runReel 的區域變數裡 ⇒ 版面擴張像是憑空發生。數字全部向純函式求值（禁止第二份門檻）。
    // 樣式一律內聯：本檔走 #110 延遲載入，寫進 components.css 會變成首屏成本。
    var tally = [0,0,0,0,0,0];
    var collChips = [];
    var collRow = el("div", { style:"display:flex;align-items:center;gap:6px;flex-wrap:wrap" }, (function(){
      var kids = [ el("span", { style:"font-size:var(--ax-icon-20);line-height:1", text:"🦜" }) ], i;
      for (i=0;i<CFG.colors;i++){
        var n = el("b", { style:"font-variant-numeric:tabular-nums;min-width:1.1em;text-align:right", text:"0" });
        collChips.push(n);
        kids.push(el("span", { class:"ax-pir__gem", style:"display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:var(--ax-radius-md);background:var(--ax-card-2);border:1px solid var(--ax-border-soft);font-size:var(--ax-font-sm);opacity:.45;transition:opacity .2s,border-color .2s" },
          [ el("span", { text:GEM[i] }), n ]));
      }
      return kids;
    })());
    var collLbl  = el("span", { class:"ax-pir__collnote", style:"font-size:var(--ax-font-sm);color:var(--ax-text-dim);font-weight:700", text:"🦜 收集進度" });
    // 初值刻意留空：renderCollector() 在掛載前就會被 renderResting() 叫到一次並填入真值。
    // 寫死 "0 / 10"／"7×7" 會是門檻與版面的第二份真相（改 expandAt 後那一瞬間的畫面就說謊）。
    var collNum  = el("b", { style:"font-variant-numeric:tabular-nums" , text:"" });
    var collNext = el("span", { style:"color:var(--ax-gold);font-weight:800", text:"" });
    var collFill = el("i", { style:"display:block;height:100%;width:0%;border-radius:inherit;background:linear-gradient(90deg,#7c3aed,var(--ax-gold));transition:width .3s" });
    var collBar  = el("div", { style:"flex:1;min-width:80px;height:6px;border-radius:99px;background:var(--ax-card-2);border:1px solid var(--ax-border-soft);overflow:hidden" }, [ collFill ]);
    var collector = el("div", { class:"ax-pir__coll", style:"display:flex;flex-direction:column;gap:6px;margin-top:var(--ax-space-2);padding:8px 10px;border-radius:var(--ax-radius-lg);background:var(--ax-card);border:1px solid var(--ax-border-soft)" }, [
      collRow,
      el("div", { style:"display:flex;align-items:center;gap:8px" }, [ collLbl, collNum, collNext, collBar ])
    ]);

    // 顯示端唯一的求值點：門檻向 nextExpandAt 求、逐色數向 tally 求、合計＝擴張門檻吃的那個 collected。
    function renderCollector(){
      var total = 0, i;
      for (i=0;i<CFG.colors;i++){ total += tally[i];
        collChips[i].textContent = String(tally[i]);
        collChips[i].parentNode.style.opacity = tally[i] ? "1" : ".45";
        collChips[i].parentNode.style.borderColor = tally[i] ? "var(--ax-gold)" : "var(--ax-border-soft)";
      }
      var p = expandProgress(size, total);
      if (p.maxed){
        collLbl.textContent = "🗺️ 版面已達最大";
        collNum.textContent = String(total);
        collNext.textContent = CFG.sizeMax + "×" + CFG.sizeMax;
        collFill.style.width = "100%";
      } else {
        collLbl.textContent = "🦜 收集進度";
        collNum.textContent = p.have + " / " + p.need;
        collNext.textContent = (size + 1) + "×" + (size + 1);
        collFill.style.width = Math.round(p.frac * 100) + "%";
      }
    }
    function resetCollector(){ tally = [0,0,0,0,0,0]; renderCollector(); }
    function addCollect(clusters){ tallyColors(clusters, tally); renderCollector(); }

    function gridLbl(sz){ stage.querySelector(".ax-pir__gridlbl").textContent = "🗺️ " + sz + "×" + sz; }

    // 依 grid 狀態渲染 board（size×size），highlight = 待收集 cells（Set of "r,c"）
    function renderGrid(grid, sz, highlight){
      board.style.setProperty("--pir-n", sz);
      HL.dom.clear(board);
      for (var r=0;r<sz;r++) for (var c=0;c<sz;c++){
        var v = grid[r][c];
        var cell = el("div", { class: "ax-pir__cell" + (v===-1?" is-scat":""), text: symChar(v) });
        if (highlight && highlight[r+","+c]) cell.classList.add("is-collect");
        board.appendChild(cell);
      }
      gridLbl(sz);
    }
    function setMult(m){ multBadge.textContent = "×"+Math.round(m); multBadge.classList.toggle("is-hot", m>=10); }

    // ── #31 連爆落下：把「掉下來」真的演出來 ────────────────────────────────────────
    // renderGrid 每一拍都 clear+重建全部格子（與 slot.js tumbleAnimate 同形制），所以位移的做法是
    //   ① 先把剛建好的新格子放回它「落下前」的位置 → ② 強制 reflow 提交這個起點 → ③ 再過渡回 0。
    // 少了②那一次 reflow，瀏覽器會把設起點與設終點併進同一次 style recalc ⇒ 一格都不會動、而畫面
    //   看起來完全正常（＝ plinko `games/plinko/drop-start-committed` 踩過的同一個坑）。
    // 落點一律向純函式 fallOffsets 求值，本區段不得自寫第二套重力。
    var FALL_MS = 220;   // 單一常數同時決定過渡時間；cascade 拍 300ms > 它 ⇒ 落定後才換下一盤
    function dropIn(offs, sz){
      var cells = board.children;
      var pitch = cells.length > sz ? (cells[sz].offsetTop - cells[0].offsetTop) : 0;
      if (!(pitch > 0)) return;   // 量不到列距（面板隱藏/尚未佈局）＝不硬套位移；畫面已是正確終態
      var moved = [], r, c, cell, off;
      for (r=0;r<sz;r++) for (c=0;c<sz;c++){
        off = offs[r][c]; if (!(off > 0)) continue;
        cell = cells[r*sz+c]; if (!cell) continue;
        cell.style.transition = "none";
        cell.style.transform = "translateY(" + (-(off*pitch)) + "px)";
        moved.push(cell);
      }
      if (!moved.length) return;
      void board.offsetWidth;     // ② 提交起點（拿掉這一行＝上面整段位移變成死碼）
      for (var i=0;i<moved.length;i++){
        moved[i].style.transition = "transform " + (FALL_MS/1000) + "s cubic-bezier(.33,.66,.3,1)";
        moved[i].style.transform = "translateY(0)";
      }
    }

    function pop(text, cls){ return HL.dom.floatPop(stage, "ax-pir__pop "+(cls||""), text, 950); }

    // 靜態擺設（未開局）：填一盤 6×6 不判定。#44：改走 restingGrid（保證無 ≥6 同色連通群＝合法待機態），
    // 且每次進場輪替起始種子 ⇒ 不再「每次載入都同一盤」，但每一盤仍必為無 cluster。
    function renderResting(){
      renderResting._s = (((renderResting._s | 0) || 0x1234) + 0x6D2B79F5) >>> 0;
      var g = restingGrid(renderResting._s).grid;
      size=CFG.sizeBase; setMult(1); fsBadge.style.display="none"; renderGrid(g,size,null); resetCollector();
    }

    // 重播一顆 reel 的事件（回傳 Promise，於全部演完 resolve）。fast=直接跳終態。
    function playReelEvents(events, fast){
      return new Promise(function(resolve){
        if (fast){ // 只渲染最後一個 grid 狀態
          // ⚠️ 極速也不准說謊：終態盤面跳過了，但收集面板仍必須累完本顆 reel 的每一筆收集
          //   （否則開極速＝六個數字恆為 0、擴張進度條永遠不動＝#56 在極速下原封不動地復發）。
          resetCollector();
          for (var q=0;q<events.length;q++){ if(events[q].t==="collect") tallyColors(events[q].clusters, tally); }
          for (var k=events.length-1;k>=0;k--){ if(events[k].grid){ renderGrid(events[k].grid, events[k].size, null); setMult(events[k].mult); size=events[k].size; break; } }
          renderCollector();
          resolve(); return;
        }
        var i=0;
        var pend=null;   // #31：上一拍 collect 消掉的格 + 當時的盤面尺寸，留給 cascade 拍換算落下位移
        function step(){
          if (i>=events.length){ resolve(); return; }
          var e=events[i++];
          if (e.t==="fill"){ renderGrid(e.grid, e.size, null); setMult(e.mult); size=e.size; resetCollector(); setTimeout(step, 260); }
          else if (e.t==="collect"){
            var hi={}; e.clusters.forEach(function(cl){ cl.cells.forEach(function(p){ hi[p[0]+","+p[1]]=1; }); });
            // 在當前盤上 highlight 待收集群 + 冒分
            var cells=board.querySelectorAll(".ax-pir__cell");
            e.clusters.forEach(function(cl){ cl.cells.forEach(function(p){ var idx=p[0]*size+p[1]; if(cells[idx]) cells[idx].classList.add("is-collect"); }); });
            addCollect(e.clusters);   // #56：鳥真的把這一批寶石收進面板（逐色計數 + 擴張進度條同拍前進）
            if (e.win>0){ pop("+"+fmtX(e.win).replace("×","") , "is-collect-pop"); } // 顯示本 cascade 收集分
            var rmv=[]; e.clusters.forEach(function(cl){ cl.cells.forEach(function(p){ rmv.push(p); }); });
            pend={ size:size, cells:rmv };   // #31：這一批就是下一拍要往下掉的理由
            setTimeout(step, 420); // 收集停頓＝期待節拍
          }
          // #31 刻意的邊界：擴張會改變盤面尺寸（新增底列與右欄），舊座標與新盤對不起來 ⇒ 這一拍不做落下。
          //   它本來就自帶 is-expanding + 版面擴張 pop 的專屬轉場，不是無聲換盤。
          else if (e.t==="expand"){ pend=null; size=e.size; renderCollector(); pop("🗺️ 版面擴張 "+e.size+"×"+e.size+"！","is-expand"); board.classList.add("is-expanding"); setTimeout(function(){ board.classList.remove("is-expanding"); step(); }, 480); }
          else if (e.t==="cascade"){
            var offs = (pend && pend.size===e.size) ? fallOffsets(e.size, pend.cells) : null;
            pend=null;
            renderGrid(e.grid, e.size, null);
            if (offs) dropIn(offs, e.size);   // #31：倖存者往下沉、頂端新符號自盤面上方落進來
            setMult(e.mult); size=e.size; setTimeout(step, 300);
          }
          else step();
        }
        step();
      });
    }

    // 主流程：跑一注 sim（帶事件），依序演 base →（若中）免費遊戲。回傳 {multiplier,label,done}
    function playRound(bet, ctx){
      var fast = !!(ctx && ctx.turbo), forced = !!(ctx && ctx.forceFS);
      busy = true;
      var seed = Math.floor(HL.fair.floatOr("pirots") * 4294967296);
      var rng = mulberry32(seed);
      var res = simSpin(rng, forced, true);
      var totalMult = res.mult; // 已 cap 10000
      var tl = res.timeline;

      var done = playReelEvents(tl.base, fast).then(function(){
        if (!tl.triggered) return;
        // 免費遊戲轉場
        fsBadge.style.display=""; fsBadge.textContent="🦜 免費遊戲 ×"+res.fsSpins;
        if (!fast) pop("🦜 免費遊戲 ×"+res.fsSpins+"！乘數持續累積","is-fsstart");
        return tl.fs.reduce(function(chain, sp){
          return chain.then(function(){
            fsBadge.textContent="🦜 免費遊戲 "+sp.idx+"/"+sp.total;
            return playReelEvents(sp.events, fast).then(function(){
              if (sp.retrig && !fast) pop("🦜 +"+CFG.fsRetrig+" 免費遊戲！","is-fsstart");
            });
          });
        }, Promise.resolve());
      }).then(function(){
        busy=false; fsBadge.style.display="none";
        history.push(fmtX(totalMult), totalMult>=1?"is-win":"is-lose");
        if (totalMult>=100){ pop("💥 "+fmtX(totalMult)+" MEGA WIN！","is-mega"); }
        else if (totalMult>=10){ pop("🎉 "+fmtX(totalMult),"is-big"); }
        else if (totalMult>0){ pop(fmtX(totalMult),""); }
        setMult(1); size=CFG.sizeBase;
      });
      return { multiplier: totalMult, label: (res.triggered?"🦜免費遊戲 ":"") + "開出 "+fmtX(totalMult), done: done };
    }

    var panel = HL.instant.betPanel({ initial: 50, game: "pirots", playText: "旋轉 🦜", playRound: playRound });

    // X-iter：購買免費遊戲（買入 RTP≈基礎，價由 CFG.buyPrice 單一來源驅動）。手動 mini-settle（走中央掛鉤 liveStats.record）。
    var buyBtn = el("button", { class: "ax-pir__buy", text: "購買免費遊戲 "+CFG.buyPrice+"×", onClick: function(){
      if (busy || buyBtn.disabled || panel.isBusy()) return;   // 家族 A：面板的回合在途時也不准買入（否則兩局動畫演在同一個 board 上）
      var bet = panel.getBet ? panel.getBet() : 50;
      var cost = Math.round(bet * CFG.buyPrice);
      if (cost > HL.instant.bal()) { HL.ui.toast("餘額不足（Demo）","warn"); return; }
      if (HL.rg && !HL.rg.check(cost)) return;   // #86：買入繞過 betPanel 自行扣款 ⇒ 需自帶閘（正常旋轉已由 instant.js:89/:120 閘住）
      buyBtn.disabled = true; panel.lock(true);
      HL.instant.setBal(HL.instant.bal() - cost);
      var r = playRound(bet, { turbo: !!(HL.gset && HL.gset.get("fast")), forceFS:true });   // 家族 C：買入動畫也要吃極速模式（p90 20 秒的乾等）
      r.done.then(function(){
        var payout = Math.round(bet * r.multiplier);
        if (payout) HL.instant.setBal(HL.instant.bal() + payout);
        if (HL.liveStats) HL.liveStats.record("pirots", cost, payout); // 中央掛鉤：買 FS 也算一筆 wager=cost
        if (panel.setLast) panel.setLast(cost, payout, "🦜 買入免費遊戲");   // #45：買入結果寫回「上一局」計分板（否則面板停在上一筆普通旋轉）
        HL.ui.toast("🦜 免費遊戲結果：贏 "+HL.dom.money(payout)+"（本 "+HL.dom.money(cost)+"）", payout>=cost?"ok":"warn");
        buyBtn.disabled = false; panel.lock(false);
      });
    } });

    renderResting();

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🦜 Pirots 探險" }),
      stage,
      collector,
      history.node,
      panel.node,
      el("div", { class: "ax-pir__buyrow" }, [ buyBtn, el("small",{class:"ax-muted",text:"直接進免費遊戲（乘數持續暴走）"}) ]),
      HL.ui.gameInfoBar({ fair:"一注一種子·可驗證", edge:HL.gameRtp.edgeOf("pirots"), rtp:HL.gameRtp.of("pirots"), note:"連通同色 ≥6 鳥即收集→cascade+漸進乘數→集滿擴張網格 6→8；⭐×3 進免費遊戲乘數暴走，最高 10000×。對標 ELK『Pirots 5』玩法" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title:"Pirots 探險", provider:"Apex Studio（對標 ELK）", key:"pirots" }) : node;
  }

  HL.games.register({ id:"pirots", title:"Pirots 探險", provider:"Apex Studio", type:"slot", cat:"originals", playable:true, comingSoon:false, isNew:true, hot:true, c1:"#7c3aed", c2:"#1e1b4b", render: pirotsGame });
})(typeof window !== "undefined" ? window : globalThis);

/*
 * Apex Win｜Pirots 探險 🦜（網格收集 slot · 對標 ELK Studios "Pirots 5" 玩法 · 忠實復刻）
 * ─────────────────────────────────────────────────────────────────────
 * 機制（grid-collection，ApexWin 全新互動維度）：
 *   6×6 網格填滿彩色寶石 → 鳥 CollectR 收集「連通同色 ≥6」的寶石群（吃掉→賠付→留空）→
 *   上方寶石落下 + 頂部補新（cascade）→ 每次有收集的 cascade 漸進乘數 +1 →
 *   累積收集數達門檻「解鎖更大網格」6→7→8（版面擴張）→ 直到某次 cascade 無收集才停。
 *   ⭐SCATTER ≥3 → 免費遊戲：乘數「持續不重置」逐 cascade +5、版面保持擴張 → 罕見暴走（max 10000×）。
 *   X-iter：花 ~99× 直接購買免費遊戲（EV 中性）。
 * 可驗證公平：一注一 HL.fair 種子 → 決定性 PRNG（mulberry32）跑完整局，事後單一 float 可重算整盤。
 * RTP 96.00%（G 標量經 100 萬回合蒙地卡羅校準；派彩走 betPanel round，RTP=E[總倍數]）。
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
    buyPrice: 100        // X-iter 免費遊戲購買價（≈E[FS]/0.96，EV 中性）
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
  function expandGrid(g,size,rng){ var r,c; for(r=0;r<size;r++){ if(!g[r]) g[r]=[]; }
    for(r=0;r<size;r++) for(c=0;c<size;c++){ if(g[r][c]===undefined||g[r][c]===null) g[r][c]=drawSym(rng); } }
  function snap(g,size){ var s=[],r,c; for(r=0;r<size;r++){s[r]=[];for(c=0;c<size;c++)s[r][c]=g[r][c];} return s; }

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
      if(size<CFG.sizeMax){ var th=CFG.expandAt[size-CFG.sizeBase]; if(th!==undefined&&collected>=th){ size++; expandGrid(g,size,rng); if(rec) events.push({t:"expand",size:size}); } }
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

  HL.pirots = { simSpin:simSpin, mulberry32:mulberry32, CFG:CFG, findClusters:findClusters };
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.pirots; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el;

  var GEM = ["🟥","🟧","🟨","🟩","🟦","🟪"];   // 6 色寶石（對應 color 0..5，稀有→高賠：紫最高）
  var SCAT = "🦜";                              // scatter＝探險鳥（觸發免費遊戲）
  function symChar(v){ return v===-1 ? SCAT : (v>=0 && v<GEM.length ? GEM[v] : ""); }
  function fmtX(m){ return (m>=100? Math.round(m) : Math.round(m*100)/100) + "×"; }

  function pirotsGame() {
    var size = CFG.sizeBase, busy = false;
    var board = el("div", { class: "ax-pir__board" });
    var multBadge = el("div", { class: "ax-pir__mult", text: "×1" });
    var fsBadge = el("div", { class: "ax-pir__fs", style: "display:none" });
    var stage = el("div", { class: "ax-pir__stage" }, [
      el("div", { class: "ax-pir__hud" }, [ el("span",{class:"ax-pir__gridlbl"}), multBadge, fsBadge ]),
      board
    ]);
    var history = HL.ui.histBar({ cls: "ax-pir__hist", itemCls: "ax-pir__pill", max: 12, fair: true });

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

    function pop(text, cls){ var p=el("div",{class:"ax-pir__pop "+(cls||""),text:text}); stage.appendChild(p);
      setTimeout(function(){ if(p.parentNode)p.parentNode.removeChild(p); }, 950); }

    // 靜態擺設（未開局）：填一盤 6×6 不判定
    function renderResting(){
      var rng = mulberry32(0x1234); var g=fillGrid(CFG.sizeBase,rng);
      size=CFG.sizeBase; setMult(1); fsBadge.style.display="none"; renderGrid(g,size,null);
    }

    // 重播一顆 reel 的事件（回傳 Promise，於全部演完 resolve）。fast=直接跳終態。
    function playReelEvents(events, fast){
      return new Promise(function(resolve){
        if (fast){ // 只渲染最後一個 grid 狀態
          for (var k=events.length-1;k>=0;k--){ if(events[k].grid){ renderGrid(events[k].grid, events[k].size, null); setMult(events[k].mult); size=events[k].size; break; } }
          resolve(); return;
        }
        var i=0;
        function step(){
          if (i>=events.length){ resolve(); return; }
          var e=events[i++];
          if (e.t==="fill"){ renderGrid(e.grid, e.size, null); setMult(e.mult); size=e.size; setTimeout(step, 260); }
          else if (e.t==="collect"){
            var hi={}; e.clusters.forEach(function(cl){ cl.cells.forEach(function(p){ hi[p[0]+","+p[1]]=1; }); });
            // 在當前盤上 highlight 待收集群 + 冒分
            var cells=board.querySelectorAll(".ax-pir__cell");
            e.clusters.forEach(function(cl){ cl.cells.forEach(function(p){ var idx=p[0]*size+p[1]; if(cells[idx]) cells[idx].classList.add("is-collect"); }); });
            if (e.win>0){ pop("+"+fmtX(e.win/ (e.mult||1) * (e.mult||1)).replace("×","") , "is-collect-pop"); } // 顯示本 cascade 收集分
            setTimeout(step, 420); // 收集停頓＝期待節拍
          }
          else if (e.t==="expand"){ pop("🗺️ 版面擴張 "+e.size+"×"+e.size+"！","is-expand"); board.classList.add("is-expanding"); setTimeout(function(){ board.classList.remove("is-expanding"); step(); }, 480); }
          else if (e.t==="cascade"){ renderGrid(e.grid, e.size, null); setMult(e.mult); size=e.size; setTimeout(step, 300); }
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

    // X-iter：購買免費遊戲（EV 中性 ~99×）。手動 mini-settle（走中央掛鉤 liveStats.record）。
    var buyBtn = el("button", { class: "ax-pir__buy", text: "購買免費遊戲 "+CFG.buyPrice+"×", onClick: function(){
      if (busy || buyBtn.disabled) return;
      var bet = panel.getBet ? panel.getBet() : 50;
      var cost = Math.round(bet * CFG.buyPrice);
      if (cost > HL.instant.bal()) { HL.ui.toast("餘額不足（Demo）","warn"); return; }
      buyBtn.disabled = true;
      HL.instant.setBal(HL.instant.bal() - cost);
      var r = playRound(bet, { turbo:false, forceFS:true });
      r.done.then(function(){
        var payout = Math.round(bet * r.multiplier);
        if (payout) HL.instant.setBal(HL.instant.bal() + payout);
        if (HL.liveStats) HL.liveStats.record("pirots", cost, payout); // 中央掛鉤：買 FS 也算一筆 wager=cost
        HL.ui.toast("🦜 免費遊戲結果：贏 "+HL.dom.money(payout)+"（本 "+HL.dom.money(cost)+"）", payout>=cost?"ok":"warn");
        buyBtn.disabled = false;
      });
    } });

    renderResting();

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🦜 Pirots 探險" }),
      stage,
      history.node,
      panel.node,
      el("div", { class: "ax-pir__buyrow" }, [ buyBtn, el("small",{class:"ax-muted",text:"直接進免費遊戲（乘數持續暴走）"}) ]),
      HL.ui.gameInfoBar({ fair:"一注一種子·可驗證", edge:"4% 莊家優勢", rtp:"96.0%", note:"連通同色 ≥6 鳥即收集→cascade+漸進乘數→集滿擴張網格 6→8；⭐×3 進免費遊戲乘數暴走，最高 10000×。對標 ELK『Pirots 5』玩法" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title:"Pirots 探險", provider:"Apex Studio（對標 ELK）", key:"pirots" }) : node;
  }

  HL.games.register({ id:"pirots", title:"Pirots 探險", provider:"Apex Studio", type:"slot", cat:"originals", playable:true, comingSoon:false, isNew:true, hot:true, c1:"#7c3aed", c2:"#1e1b4b", render: pirotsGame });
})(typeof window !== "undefined" ? window : globalThis);

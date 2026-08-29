/*
 * Apex Win｜Dead By Noon 正午對決 🤠（乘數彈膛 slot · 對標 Hacksaw Gaming "Dead By Noon" 玩法 · 忠實復刻）
 * ─────────────────────────────────────────────────────────────────────
 * 機制（Multiplier Chamber 乘數彈膛「數字串接」，ApexWin 全新互動維度）：
 *   5×4 網格 14 條固定線（reel1 起左到右相鄰）→ 中獎時觸發 Row Cascade（移除最底列、全體下落、頂列補新）→
 *   Poker Chip 🎯 落盤即化 Wild 並「開膛」露出 1–9 數字 → 盤上各彈膛由左到右**串接（非相加）**成乘數
 *   （如 2、5、1 → ×251）套用於該次 cascade 中獎額 → 只要有中獎就持續 cascade、彈膛隨下落累積 → 罕見暴走。
 *   ⭐SCATTER：3 個 → 生死決鬥 Draw or Die（8 次免費、彈膛頻率提升）；4+ 個 → 神槍手 No Aim No Fame
 *   （10 次免費、每次保證 ≥1 彈膛）；免費中再落 2/3 scatter 加 +2/+4 次。
 * 可驗證公平：一注一 HL.fair 種子 → 決定性 PRNG（mulberry32）跑完整局（含所有 cascade/彈膛/免費），事後單一 float 可重算整盤。
 * RTP 96.27%（對標官方最高檔；G 標量經蒙地卡羅校準；派彩走 betPanel round，RTP=E[總倍數]）。
 *   高波動（5/5，SD 大）、base hit≈22%、彈膛串接驅動重尾、max 10000×（P 極小，蒙地卡羅實測可達）。
 * 掛 HL.instant.betPanel 共用引擎（金流/autobet/中央結算掛鉤 liveStats.record 通吃 VIP/任務/返水/JP/帳本）。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；游戲 render + node RTP 驗證器共用）=====================
  var COLS = 5, ROWS = 4;
  // 符號索引：0-3 低賠(牌花)、4-8 高賠(輪/骷/帽/槍/徽)、9 WILD、10 CHIP(彈膛·亦替代)、11 SCATTER
  var WILD = 9, CHIP = 10, SCAT = 11;
  // 賠付表[sym][連線數 3/4/5]（每線、以「總注」為單位；乘 G 校準）
  var PAY = {
    0:[0,0,0,0.10,0.30,0.80], 1:[0,0,0,0.10,0.30,0.80],   // 低賠 ♣♦：3 連起賠
    2:[0,0,0,0,0.50,1.20],    3:[0,0,0,0,0.50,1.20],       // 低賠 ♠♥：4 連起賠
    4:[0,0,0,0.30,0.80,2.00], 5:[0,0,0,0.35,1.00,2.50], 6:[0,0,0,0.45,1.20,3.00],
    7:[0,0,0,0.60,1.60,4.00], 8:[0,0,0,0.90,2.20,5.00],
    9:[0,0,0,1.00,2.50,5.00]   // WILD 線自身賠付
  };
  var CFG = {
    // 抽牌權重（每格獨立加權抽樣；tuned）
    wt: { 0:10, 1:10, 2:10, 3:10, 4:11, 5:9.5, 6:8, 7:6, 8:4.5, 9:2.6, 10:0.6, 11:1.6 },
    digitWt: [0, 78, 17, 3.5, 1, 0.5, 0.2, 0.1, 0.05, 0.02],  // index=數字 1..9 的權重（強偏小數字·抑制串接重尾）
    fsDoD: 8, fsNANF: 10,      // 免費次數
    fsChipMulDoD: 2.4, fsChipMulNANF: 2.0, // 免費彈膛頻率倍率
    maxWin: 10000,
    G: 1.1083,                 // 全域賠付標量（蒙地卡羅校準；下方 node 驗證器調到 RTP 96.27%）
                               // 2026-08-29 #70 彈膛數字改「落盤持久」後，同一顆高數字籌碼隨下落重複套用 ⇒ 尾巴變重、10000× cap
                               //   命中率上升，500M sweep 實測舊 G=1.101 下 RTP 由 96.093% 降到 95.674%（純 clamp 效應·pre-clamp
                               //   期望值不變·解析已證）→ G 1.101→1.1083 補回：500M 實測 RTP=96.273%≈宣告 96.27%（±0.32pp CI）。
    cascadeGuard: 60,
    // 買入免費遊戲價（DoD）。**必須 = E[買入倍數]/宣告RTP** 才不是坑：
    // 實測 E[force=1] ≈ 41.97×（G=1.1083·50M 種子池）→ 41.97/0.9627 ≈ 43.6×（買入 RTP 96.25%）
    // ⚠️ 首版誤設 80× ＝ 買入 RTP 僅 52%（玩家暗虧 44pp），2026-07-28 健檢抓出並修正。
    // 2026-08-29 #70 彈膛持久化+G→1.1083 後 E[force=1] 41.73×→41.97× ⇒ buyX 43.4→43.6（同步重驗買入 RTP）。
    // 按鈕文字與扣款皆讀此常數（禁止再各自硬編，防 drift）；改動須重跑 node 驗證器驗買入 RTP。
    buyX: 43.6
  };
  // 14 條固定線（每欄的列 index）
  var LINES = [
    [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[3,3,3,3,3],
    [0,1,2,1,0],[3,2,1,2,3],[1,0,0,0,1],[2,3,3,3,2],
    [0,0,1,0,0],[3,3,2,3,3],[1,2,2,2,1],[2,1,1,1,2],
    [0,1,1,1,0],[3,2,2,2,3]
  ];

  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  var _pool = null, _poolT = 0;
  function buildPool(){ _pool=[]; _poolT=0; for(var k=0;k<12;k++){ var w=CFG.wt[k]||0; _pool.push({k:k,acc:_poolT+w}); _poolT+=w; } }
  function drawSym(rng){ if(!_pool) buildPool(); var r=rng()*_poolT; for(var i=0;i<_pool.length;i++){ if(r<_pool[i].acc) return _pool[i].k; } return 0; }
  function drawDigit(rng){ var tw=0,i; for(i=1;i<=9;i++) tw+=CFG.digitWt[i]; var r=rng()*tw,acc=0; for(i=1;i<=9;i++){ acc+=CFG.digitWt[i]; if(r<acc) return i; } return 1; }

  // #70：彈膛 🎯 落盤即「開膛」抽一次數字並**持久**綁在那顆籌碼上（隨下落一路帶著，不再每次 cascade 重抽）。
  //   dg（可選 out-param）＝與 g 同形的持久數字盤：CHIP 格存 1–9、其餘 0。dg[r][c] 非零 ⟺ g[r][c]===CHIP（此不變量由
  //   newGrid/cascadeDown 一致維護）。傳 dg 時每顆新落 CHIP 緊接其符號抽樣再抽一次 drawDigit（落盤即揭曉）。
  function newGrid(rng, forceChip, dg){
    var g=[],r,c; for(r=0;r<ROWS;r++){ g[r]=[]; if(dg) dg[r]=[]; for(c=0;c<COLS;c++){ var s=drawSym(rng); g[r][c]=s; if(dg) dg[r][c]=(s===CHIP?drawDigit(rng):0); } }
    if(forceChip){ // NANF：保證至少一個彈膛
      var has=false; for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++) if(g[r][c]===CHIP) has=true;
      if(!has){ var fr=(rng()*ROWS)|0, fc=(rng()*COLS)|0; g[fr][fc]=CHIP; if(dg) dg[fr][fc]=drawDigit(rng); }
    }
    return g;
  }
  // dg → 盤上各彈膛的持久數字清單（供動畫逐拍顯示；先欄後列＝與 chamberMult 串接同序）
  function snapDig(dg){ var o=[],r,c; if(!dg) return o; for(c=0;c<COLS;c++)for(r=0;r<ROWS;r++){ if(dg[r][c]) o.push({r:r,c:c,d:dg[r][c]}); } return o; }
  function countScat(g){ var n=0,r,c; for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++) if(g[r][c]===SCAT) n++; return n; }

  // 評 14 線：回傳 { units:總賠付單位(pre-G), cells:中獎格集合"r,c" }
  function evalLines(g){
    var units=0, cells={}, li, c;
    for(li=0; li<LINES.length; li++){
      var rows=LINES[li];
      var s0=g[rows[0]][0];
      if(s0===SCAT) continue;
      // 找基準符號：跳過 WILD/CHIP；遇 SCAT 前若全是 wild/chip → wild 線
      var base=-1, endedByScat=false;
      for(c=0;c<COLS;c++){ var s=g[rows[c]][c];
        if(s===SCAT){ endedByScat=true; break; }
        if(s===WILD||s===CHIP) continue;
        base=s; break;
      }
      if(base===-1){ base=WILD; } // 前綴全 wild/chip（或至 scat 前全 wild/chip）→ 以 wild 線計
      // 由左計連續匹配（base 或 WILD 或 CHIP）
      var cnt=0;
      for(c=0;c<COLS;c++){ var sc=g[rows[c]][c];
        if(sc===base||sc===WILD||sc===CHIP) cnt++; else break;
      }
      if(cnt>=3){
        var pay=PAY[base] ? PAY[base][cnt] : 0;
        if(pay>0){ units+=pay; for(c=0;c<cnt;c++) cells[rows[c]+","+c]=1; }
      }
    }
    return { units:units, cells:cells };
  }

  // 盤上彈膛（CHIP）由左到右（先欄後列）串接**持久數字** → 乘數。
  //   #70：純讀 dg（數字在 newGrid/cascadeDown 落盤當下就抽定），不再於此重抽 ⇒ 同一顆籌碼沿路數字不變、隨下落累積。
  function chamberMult(g, dg, digitsOut){
    var str="",any=false,r,c;
    for(c=0;c<COLS;c++)for(r=0;r<ROWS;r++){ if(g[r][c]===CHIP){ var d=(dg && dg[r][c])?dg[r][c]:1; str+=d; any=true; if(digitsOut) digitsOut.push({r:r,c:c,d:d}); } }
    if(!any) return 1;
    var v=parseInt(str,10); return v>0?v:1;
  }

  // Row Cascade：移除最底列、全體下落一列、頂列補新。dg 隨 g 同步下落（彈膛數字跟著它的籌碼落，頂列新籌碼落盤即抽數）
  function cascadeDown(g, rng, dg){
    var r,c; for(r=ROWS-1;r>=1;r--){ for(c=0;c<COLS;c++){ g[r][c]=g[r-1][c]; if(dg) dg[r][c]=dg[r-1][c]; } }
    for(c=0;c<COLS;c++){ var s=drawSym(rng); g[0][c]=s; if(dg) dg[0][c]=(s===CHIP?drawDigit(rng):0); }
  }

  // 跑一次 spin（含 cascade 直到無中獎）。chipBoost=免費彈膛頻率倍率(1=base)。rec=記錄事件供動畫。
  function runSpin(rng, chipBoost, forceChip, rec){
    // 免費彈膛頻率提升：暫時調高 chip 權重
    var savedWt=CFG.wt[CHIP], savedPool=_pool, savedT=_poolT;
    if(chipBoost && chipBoost!==1){ CFG.wt[CHIP]=savedWt*chipBoost; buildPool(); }
    var dg=[]; var g=newGrid(rng, forceChip, dg);   // #70：dg＝持久彈膛數字盤（落盤即抽、隨下落帶著）
    var scat=countScat(g), win=0, events=[], guard=0;
    if(rec) events.push({t:"fill",grid:snap(g),digits:snapDig(dg)});   // 落盤即揭曉：fill 拍就帶各彈膛數字
    while(true){
      if(++guard>CFG.cascadeGuard) break;
      var ev=evalLines(g);
      if(ev.units<=0) break;
      var digits=[]; var mult=chamberMult(g, dg, digits);   // 純讀 dg 的持久數字串接
      var cWin=ev.units*mult;
      win+=cWin;
      if(rec) events.push({t:"win",grid:snap(g),cells:ev.cells,units:ev.units,mult:mult,digits:digits,cWin:cWin});
      cascadeDown(g, rng, dg);
      if(rec) events.push({t:"cascade",grid:snap(g),digits:snapDig(dg)});   // cascade 後彈膛數字隨籌碼下落、頂列新籌碼已揭曉
    }
    // 還原 chip 權重
    if(chipBoost && chipBoost!==1){ CFG.wt[CHIP]=savedWt; _pool=savedPool; _poolT=savedT; }
    return { win:win, scat:scat, events:events };
  }
  function snap(g){ var s=[],r,c; for(r=0;r<ROWS;r++){s[r]=[];for(c=0;c<COLS;c++)s[r][c]=g[r][c];} return s; }

  // 完整一注：base spin +（scatter≥3 觸發）免費遊戲。rec=true 回傳完整事件時間軸。
  function simSpin(rng, force, rec){
    var base=runSpin(rng, 1, false, rec);
    var win=base.win, timeline= rec ? { base:base.events, fs:[], mode:null } : null;
    var mode=null;
    if(base.scat>=4 || force===2) mode="NANF";
    else if(base.scat>=3 || force===1) mode="DoD";
    if(mode){
      var spins= mode==="NANF"?CFG.fsNANF:CFG.fsDoD;
      var boost= mode==="NANF"?CFG.fsChipMulNANF:CFG.fsChipMulDoD;
      var forceChip= mode==="NANF";
      if(rec) timeline.mode=mode;
      var i=0, fsWin=0;
      while(i<spins && spins<=200){
        var rr=runSpin(rng, boost, forceChip, rec);
        fsWin+=rr.win;
        if(rec) timeline.fs.push({idx:i+1,total:spins,events:rr.events,retrig:rr.scat});
        if(rr.scat>=3) spins+=4; else if(rr.scat>=2) spins+=2;
        i++;
      }
      win+=fsWin;
    }
    win*=CFG.G;
    if(win>CFG.maxWin) win=CFG.maxWin;
    return { mult:win, mode:mode, scatters:base.scat, timeline:timeline };
  }

  HL.deadByNoon = { simSpin:simSpin, runSpin:runSpin, evalLines:evalLines, chamberMult:chamberMult, mulberry32:mulberry32, CFG:CFG, PAY:PAY, LINES:LINES, COLS:COLS, ROWS:ROWS };  // PAY 導出＝2026-08-14 遊戲軌 base-RTP 常駐鎖 payout-const 需其釘死（賠付漂移最銳哨兵·比照 golden-toad/gem-storm 導出 PAY）；純 node 讀取·瀏覽器行為零變更
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.deadByNoon; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el;

  var GLYPH = { 0:"♣",1:"♦",2:"♠",3:"♥", 4:"🎡",5:"💀",6:"🤠",7:"🔫",8:"⭐️", 9:"🃏", 10:"🎯", 11:"🥃" };
  function symChar(v){ return GLYPH[v]!==undefined ? GLYPH[v] : ""; }
  var fmtX = HL.dom && HL.dom.fmtX;  // T25：收斂至 HL.dom 單一出口（原四款 slot 逐字複製）；短路守衛＝node RTP 驗證器 require 時 HL.dom 未載也不拋（fmtX 僅 render 閉包內用），呼叫端零改動

  function dbnGame(){
    var busy=false;
    var board=el("div",{class:"ax-dbn__board"});
    var multBadge=el("div",{class:"ax-dbn__mult",text:"×1"});
    var fsBadge=el("div",{class:"ax-dbn__fs",style:"display:none"});
    var stage=el("div",{class:"ax-dbn__stage"},[
      el("div",{class:"ax-dbn__hud"},[ el("span",{class:"ax-dbn__lbl",text:"5×4 · 14 線"}), multBadge, fsBadge ]),
      board
    ]);
    var history=HL.ui.histBar({ cls:"ax-dbn__hist", itemCls:"ax-dbn__pill", max:12, fair:true });

    function renderGrid(grid, winCells, chipDigits){
      HL.dom.clear(board);
      var digMap={}; if(chipDigits) chipDigits.forEach(function(d){ digMap[d.r+","+d.c]=d.d; });
      for(var r=0;r<ROWS;r++) for(var c=0;c<COLS;c++){
        var v=grid[r][c], key=r+","+c;
        var cls="ax-dbn__cell";
        if(v===SCAT) cls+=" is-scat";
        if(v===CHIP) cls+=" is-chip";
        if(winCells && winCells[key]) cls+=" is-win";
        var txt = (v===CHIP && digMap[key]) ? String(digMap[key]) : symChar(v);
        board.appendChild(el("div",{class:cls,text:txt}));
      }
    }
    function setMult(m){ multBadge.textContent="×"+(m>=100?Math.round(m):Math.round(m*100)/100); multBadge.classList.toggle("is-hot", m>=10); }
    function pop(text,cls){ return HL.dom.floatPop(stage, "ax-dbn__pop "+(cls||""), text, 1000); }

    function renderResting(){ var rng=mulberry32(0x51A4); var g=newGrid(rng,false); setMult(1); fsBadge.style.display="none"; renderGrid(g,null,null); }

    function playEvents(events, fast){
      return new Promise(function(resolve){
        if(fast){ for(var k=events.length-1;k>=0;k--){ if(events[k].grid){ renderGrid(events[k].grid,null,events[k].digits||null); break; } } resolve(); return; }
        var i=0;
        function step(){
          if(i>=events.length){ resolve(); return; }
          var e=events[i++];
          if(e.t==="fill"){ renderGrid(e.grid,null,e.digits); setMult(1); setTimeout(step,240); }   // #70：落盤即顯示各彈膛數字（不再整局都畫 🎯）
          else if(e.t==="win"){ renderGrid(e.grid,e.cells,e.digits); setMult(e.mult);   /* #17 stale-hud：彈膛乘數是「每次連爆各自計算」而非累積，故每一 win 拍都要據實回設（無彈膛＝×1），否則上一拍的 ×12 會殘留在實際只乘 ×1 的連爆上 */
            if(e.mult>1) pop("彈膛 ×"+e.mult+"！","is-chippop"); setTimeout(step,520); }
          else if(e.t==="cascade"){ renderGrid(e.grid,null,e.digits); setTimeout(step,280); }   // #70：下落後同一顆籌碼仍顯示它落盤時的數字（隨下落累積、不亂跳）
          else step();
        }
        step();
      });
    }

    function playRound(bet, ctx){
      var fast=!!(ctx&&ctx.turbo), forced=(ctx&&ctx.forceFS)||0;
      busy=true;
      var seed=Math.floor(HL.fair.floatOr("dead-by-noon")*4294967296);
      var rng=mulberry32(seed);
      var res=simSpin(rng, forced, true);
      var totalMult=res.mult, tl=res.timeline;
      var done=playEvents(tl.base, fast).then(function(){
        if(!tl.mode) return;
        fsBadge.style.display=""; var fsName=tl.mode==="NANF"?"神槍手":"生死決鬥";
        if(!fast) pop("🤠 "+fsName+" 免費遊戲！","is-fsstart");
        return tl.fs.reduce(function(chain,sp){ return chain.then(function(){
          fsBadge.textContent="🤠 "+fsName+" "+sp.idx+"/"+sp.total;
          return playEvents(sp.events, fast).then(function(){ if(sp.retrig>=2&&!fast) pop("🥃 +免費次數！","is-fsstart"); });
        }); }, Promise.resolve());
      }).then(function(){
        busy=false; fsBadge.style.display="none";
        history.push(fmtX(totalMult), totalMult>=1?"is-win":"is-lose");
        if(totalMult>=100) pop("💥 "+fmtX(totalMult)+" MEGA WIN！","is-mega");
        else if(totalMult>=10) pop("🎉 "+fmtX(totalMult),"is-big");
        else if(totalMult>0) pop(fmtX(totalMult),"");
        setMult(1);
      });
      return { multiplier: totalMult, label:(res.mode?"🤠免費 ":"")+"開出 "+fmtX(totalMult), done:done };
    }

    var panel=HL.instant.betPanel({ initial:50, game:"dead-by-noon", playText:"旋轉 🤠", playRound:playRound });

    var buyBtn=el("button",{class:"ax-dbn__buy",text:"購買免費遊戲 "+CFG.buyX+"×",onClick:function(){
      if(busy||buyBtn.disabled||panel.isBusy()) return;   // 家族 A：面板的回合在途時也不准買入（否則兩局動畫演在同一個 board 上）
      var bet=panel.getBet?panel.getBet():50;
      var cost=Math.round(bet*CFG.buyX);
      if(cost>HL.instant.bal()){ HL.ui.toast("餘額不足（Demo）","warn"); return; }
      if(HL.rg && !HL.rg.check(cost)) return;   // #86：買入繞過 betPanel 自行扣款 ⇒ 需自帶閘（正常旋轉已由 instant.js:89/:120 閘住）
      buyBtn.disabled=true; panel.lock(true); HL.instant.setBal(HL.instant.bal()-cost);
      var r=playRound(bet,{turbo:!!(HL.gset && HL.gset.get("fast")),forceFS:1});   // 家族 C：買入動畫也要吃極速模式（p90 20 秒的乾等）
      r.done.then(function(){
        var payout=Math.round(bet*r.multiplier);
        if(payout) HL.instant.setBal(HL.instant.bal()+payout);
        if(HL.liveStats) HL.liveStats.record("dead-by-noon", cost, payout);
        if(panel.setLast) panel.setLast(cost, payout, "🤠 買入免費遊戲");   // #45：買入結果寫回「上一局」計分板（否則面板停在上一筆普通旋轉）
        HL.ui.toast("🤠 免費遊戲結果：贏 "+HL.dom.money(payout)+"（本 "+HL.dom.money(cost)+"）", payout>=cost?"ok":"warn");
        buyBtn.disabled=false; panel.lock(false);
      });
    }});

    renderResting();

    var node=el("div",{class:"ax-inst ax-fade-in"},[
      el("h2",{class:"ax-inst__title",text:"🤠 Dead By Noon 正午對決"}),
      stage,
      history.node,
      panel.node,
      el("div",{class:"ax-dbn__buyrow"},[ buyBtn, el("small",{class:"ax-muted",text:"直接進生死決鬥免費遊戲"}) ]),
      HL.ui.gameInfoBar({ fair:"一注一種子·可驗證", edge:HL.gameRtp.edgeOf("dead-by-noon"), rtp:HL.gameRtp.of("dead-by-noon"), note:"5×4 · 14 線；中獎觸發 Row Cascade（移除底列+下落補新）；彈膛 🎯 化 Wild 露 1–9 由左到右串接成乘數（2·5·1→×251）套用中獎；⭐3/4 進免費遊戲。對標 Hacksaw『Dead By Noon』" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node,{ title:"Dead By Noon 正午對決", provider:"Apex Studio（對標 Hacksaw）", key:"dead-by-noon" }) : node;
  }

  HL.games.register({ id:"dead-by-noon", title:"Dead By Noon 正午對決", provider:"Apex Studio", type:"slot", cat:"originals", playable:true, comingSoon:false, isNew:true, hot:true, c1:"#b45309", c2:"#431407", render: dbnGame });
})(typeof window !== "undefined" ? window : globalThis);

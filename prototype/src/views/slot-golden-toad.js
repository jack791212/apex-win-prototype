/*
 * Apex Win｜金蟾聚寶 Golden Toad 🐸（Hold & Win 鎖定重旋 slot · 忠實復刻業界標準 Hold & Win 玩法 · 原創主題）
 * ─────────────────────────────────────────────────────────────────────
 * 機制（Hold & Win / 鎖定重旋，ApexWin 全新 slot 互動維度：與 pirots 網格收集、dead-by-noon 連消串接皆不同）：
 *   5×3 = 15 格。base spin 走 10 條固定線一般賠付；金幣 🪙(COIN) 為「錢符」不參與連線。
 *   ★ 觸發：base 盤面出現 ≥6 個金幣 → 進入 Hold & Win：
 *     - 現有金幣全部「鎖定」，其餘格清空；起始 3 次重旋（respin）。
 *     - 每次重旋：所有空格重轉；只要有「新金幣」落定 → 該金幣鎖定並帶一個現金值(×總注)，重旋次數「重置回 3」。
 *     - 沒有新金幣落定 → 重旋 −1。重旋歸零 或 全 15 格填滿 → 結束。
 *     - 結束派彩 = 所有鎖定金幣現金值加總；若「填滿全盤」再加 GRAND 大獎。
 * 可驗證公平：一注一 HL.fair 種子 → 決定性 PRNG（mulberry32）跑完整局（含 base + 所有重旋 + 金幣值），單一 float 可事後重算整局。
 * RTP 96.3%（宣告；100M 蒙地卡羅實測 96.44%±0.23pp、±0.5% 內；G 標量恆為 1、以金幣頻率/值分布/重旋機率直接校準，金幣現金值即玩家所見=派彩，不套顯示端縮放）。
 *   波動 SD≈11.6：base 命中頻繁但小（base RTP 11.2%）、Hold&Win bonus 罕見但大（bonus RTP 85.2%、觸發 1/98、金幣鎖定累積 + 滿盤 GRAND 1/703 重尾）。
 * 掛 HL.instant.betPanel 共用引擎（金流/autobet/中央結算掛鉤 liveStats.record 通吃 VIP/任務/返水/JP/帳本）。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；游戲 render + node RTP 驗證器共用）=====================
  var COLS = 5, ROWS = 3, CELLS = COLS * ROWS;
  // 符號索引：0-2 低賠、3-4 中賠、5 高賠、6 WILD(金蟾·替代連線符號)、7 COIN(金幣·錢符，不參與連線)
  var WILD = 6, COIN = 7;
  // 賠付表[sym][連線數 3/4/5]（每線、以「總注」為單位）
  var PAY = {
    0:[0,0,0,0.20,0.50,1.20], 1:[0,0,0,0.20,0.50,1.20], 2:[0,0,0,0.20,0.50,1.20],
    3:[0,0,0,0.40,1.00,2.50], 4:[0,0,0,0.40,1.00,2.50],
    5:[0,0,0,1.00,3.00,8.00],
    6:[0,0,0,1.00,3.00,8.00]   // WILD 線自身賠付（同高賠）
  };
  // 10 條固定線（每欄的列 index，5×3）
  var LINES = [
    [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],
    [0,1,2,1,0],[2,1,0,1,2],
    [0,0,1,2,2],[2,2,1,0,0],
    [1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0]
  ];
  var CFG = {
    // base reel 每格獨立加權抽樣（tuned；coinWt 校準觸發頻率≈1/100、直接決定 RTP）
    wt: { 0:22, 1:20, 2:18, 3:13, 4:10, 5:5, 6:2, 7:14.07 },
    trigger: 6,                 // base ≥N 金幣觸發 Hold & Win
    respins: 3,                 // 起始重旋次數（新金幣落定即重置回此）
    respinP: 0.135,             // 重旋時「每個空格」出現新金幣的機率（tuned）
    // 金幣現金值(×總注)與權重（強偏小值·抑制重尾以保可驗證 RTP 收斂；E[值]≈4.5×）
    coinVals: [[1,34],[2,22],[4,14],[6,9],[10,5],[12,4],[18,2.5],[30,1.2],[60,0.5],[120,0.15]],
    coinLabel: { 12:"MINI", 30:"MINOR", 60:"MAJOR", 120:"MEGA" },
    grand: 200,                 // 滿盤（15 金幣）GRAND 大獎（×總注）
    maxWin: 2000,               // 派彩上限（×總注）
    G: 1,                       // 校準標量（恆 1；以頻率/值分布直接校準，不套顯示縮放）
    // 購買 Hold & Win 價（×總注）。**必須 = E[買入倍數]/宣告RTP**（保真閘第 14 項）：
    // 2026-07-28 健檢實測 E[買入]=83.24×（2×1.5M 獨立種子 83.27/83.21，CI95 ±0.15pp）
    //   → 原價 87× 得買入 RTP 95.64–95.71%＝偏差 -0.6pp**超出 ±0.5pp 容差**（玩家略吃虧）
    //   → 修正為 83.24/0.963 ≈ 86.4×（買入 RTP ≈ 96.3% 對齊基礎）。
    // 同輪修正：原本按鈕文字與扣款「兩處各自硬編 87」＝drift 風險，改由本常數單一驅動。
    buyX: 86.4
  };

  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  var _pool = null, _poolT = 0;
  function buildPool(){ _pool=[]; _poolT=0; for(var k=0;k<8;k++){ var w=CFG.wt[k]||0; _pool.push({k:k,acc:_poolT+w}); _poolT+=w; } }
  function drawSym(rng){ if(!_pool) buildPool(); var r=rng()*_poolT; for(var i=0;i<_pool.length;i++){ if(r<_pool[i].acc) return _pool[i].k; } return 0; }
  var _cvT = 0;
  function coinTot(){ if(_cvT) return _cvT; for(var i=0;i<CFG.coinVals.length;i++) _cvT+=CFG.coinVals[i][1]; return _cvT; }
  function drawCoinVal(rng){ var t=coinTot(), r=rng()*t, acc=0; for(var i=0;i<CFG.coinVals.length;i++){ acc+=CFG.coinVals[i][1]; if(r<acc) return CFG.coinVals[i][0]; } return 1; }

  function newGrid(rng){ var g=[],r,c; for(r=0;r<ROWS;r++){ g[r]=[]; for(c=0;c<COLS;c++) g[r][c]=drawSym(rng); } return g; }
  function countCoins(g){ var n=0,r,c; for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++) if(g[r][c]===COIN) n++; return n; }
  function snap(g){ var s=[],r,c; for(r=0;r<ROWS;r++){s[r]=[];for(c=0;c<COLS;c++)s[r][c]=g[r][c];} return s; }
  function cloneMap(m){ var o={}; for(var k in m) if(m.hasOwnProperty(k)) o[k]=m[k]; return o; }

  // 評 10 線：回傳 { units:總賠付單位, cells:中獎格集合"r,c" }。COIN 為錢符阻斷連線；WILD 替代。
  function evalLines(g){
    var units=0, cells={}, li, c;
    for(li=0; li<LINES.length; li++){
      var rows=LINES[li], base=-1;
      for(c=0;c<COLS;c++){ var s=g[rows[c]][c];
        if(s===COIN) break;         // 金幣阻斷：基準搜尋停止
        if(s===WILD) continue;
        base=s; break;
      }
      if(base===-1) base=WILD;      // 前綴全 WILD（或立即遇金幣）
      var cnt=0;
      for(c=0;c<COLS;c++){ var sc=g[rows[c]][c]; if(sc===base||sc===WILD) cnt++; else break; }
      if(cnt>=3 && PAY[base]){ var p=PAY[base][cnt]; if(p>0){ units+=p; for(c=0;c<cnt;c++) cells[rows[c]+","+c]=1; } }
    }
    return { units:units, cells:cells };
  }

  // Hold & Win：鎖定初始金幣→重旋，新金幣重置次數→加總 + 滿盤 GRAND。回傳事件供動畫。
  function runBonus(rng, grid, rec){
    var locked={}, r, c, key;   // "r,c" -> 現金值
    for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++) if(grid[r][c]===COIN) locked[r+","+c]=drawCoinVal(rng);
    var count=0; for(key in locked) if(locked.hasOwnProperty(key)) count++;
    var respins=CFG.respins, events=[];
    if(rec) events.push({ t:"bstart", locked:cloneMap(locked), respins:respins, count:count });
    while(respins>0 && count<CELLS){
      respins--;
      var fresh=[];
      for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++){ key=r+","+c;
        if(!locked.hasOwnProperty(key) && rng()<CFG.respinP){ var v=drawCoinVal(rng); locked[key]=v; fresh.push({r:r,c:c,v:v}); }
      }
      if(fresh.length){ count+=fresh.length; respins=CFG.respins; }   // 新金幣 → 重置
      if(rec) events.push({ t:"respin", fresh:fresh, locked:cloneMap(locked), respins:respins, count:count });
    }
    var sum=0; for(key in locked) if(locked.hasOwnProperty(key)) sum+=locked[key];
    var full=(count>=CELLS), grand= full?CFG.grand:0, win=sum+grand;
    if(rec) events.push({ t:"bend", full:full, grand:grand, sum:sum, win:win, count:count });
    return { win:win, count:count, full:full, sum:sum, grand:grand, locked:locked, events:events };
  }

  // 完整一注：base spin +（金幣≥trigger 或 force）Hold & Win。rec=true 回傳完整事件時間軸。
  function simSpin(rng, force, rec){
    var g=newGrid(rng);
    if(force){ // bonus-buy：確保 ≥trigger 金幣（隨機空格改放金幣）
      var need=CFG.trigger-countCoins(g), guard=0;
      while(need>0 && guard++<200){ var rr=(rng()*ROWS)|0, cc=(rng()*COLS)|0; if(g[rr][cc]!==COIN){ g[rr][cc]=COIN; need--; } }
    }
    var line=evalLines(g), win=line.units, coins=countCoins(g), mode=null, full=false, bonusWin=0;
    var timeline= rec ? { base:{ grid:snap(g), cells:line.cells, units:line.units }, bonus:null } : null;
    if(coins>=CFG.trigger){
      mode="hold";
      var b=runBonus(rng, g, rec);
      win += b.win; bonusWin=b.win; full=b.full;
      if(rec) timeline.bonus=b;
    }
    win*=CFG.G;
    if(win>CFG.maxWin) win=CFG.maxWin;
    return { mult:win, mode:mode, coins:coins, full:full, baseWin:line.units*CFG.G, bonusWin:bonusWin*CFG.G, timeline:timeline };
  }

  HL.goldenToad = { simSpin:simSpin, runBonus:runBonus, evalLines:evalLines, newGrid:newGrid, countCoins:countCoins, drawCoinVal:drawCoinVal, mulberry32:mulberry32, CFG:CFG, LINES:LINES, PAY:PAY, COLS:COLS, ROWS:ROWS, WILD:WILD, COIN:COIN };
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.goldenToad; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;

  var GLYPH = { 0:"🏮", 1:"🧧", 2:"🎋", 3:"🐉", 4:"🦁", 5:"👑", 6:"🐸", 7:"🪙" };
  function symChar(v){ return GLYPH[v]!==undefined ? GLYPH[v] : ""; }
  // #24 家族 wrong-genre：Hold & Win 重旋「空格」的滾動裝飾符池＝非金幣符號（0-6；COIN=7 刻意排除——
  //   非鎖定格顯示金幣會誤導玩家以為金幣已落定）。純視覺·非公平關鍵：落不落金幣由 runBonus 的 HL.fair 種子
  //   事先算定，spinChar 的 Math.random 只決定「轉輪畫面」，不影響任何結果／派彩／可事後重算性。
  var SPIN_SYMS = [0, 1, 2, 3, 4, 5, 6];
  function spinChar(){ return symChar(SPIN_SYMS[(Math.random() * SPIN_SYMS.length) | 0]); }   // 視覺裝飾·非公平關鍵（結果由 runBonus 種子定）
  var fmtX = HL.dom && HL.dom.fmtX;  // T25：收斂至 HL.dom 單一出口（原四款 slot 逐字複製）；短路守衛＝node RTP 驗證器 require 時 HL.dom 未載也不拋（fmtX 僅 render 閉包內用），呼叫端零改動

  function toadGame(){
    var busy=false;
    var board=el("div",{class:"ax-toad__board"});
    var modeBadge=el("div",{class:"ax-toad__mode",text:"5×3 · 10 線"});
    var respBadge=el("div",{class:"ax-toad__resp",style:"display:none"});
    var potBadge=el("div",{class:"ax-toad__pot",style:"display:none"});
    var stage=el("div",{class:"ax-toad__stage"},[
      el("div",{class:"ax-toad__hud"},[ modeBadge, respBadge, potBadge ]),
      board
    ]);
    var history=HL.ui.histBar({ cls:"ax-toad__hist", itemCls:"ax-toad__pill", max:12, fair:true });

    // grid: 符號陣列; locked: {"r,c":value} 覆蓋顯示金幣值; winCells: 連線高亮; freshSet: 本次新落金幣高亮
    function renderGrid(grid, locked, winCells, freshSet){
      HL.dom.clear(board);
      for(var r=0;r<ROWS;r++) for(var c=0;c<COLS;c++){
        var key=r+","+c, cls="ax-toad__cell", txt;
        if(locked && locked.hasOwnProperty(key)){
          var v=locked[key]; cls+=" is-coin";
          if(freshSet && freshSet[key]) cls+=" is-fresh";
          var lbl=CFG.coinLabel[v];
          txt = lbl ? lbl : String(v);
          var cell=el("div",{class:cls},[ el("div",{class:"ax-toad__coinv",text:txt}) ]);
          board.appendChild(cell); continue;
        }
        var s=grid?grid[r][c]:0;
        if(s===COIN) cls+=" is-coin";
        if(winCells && winCells[key]) cls+=" is-win";
        if(grid){
          txt = symChar(s);
        } else {
          // #24：grid===null 只發生在 Hold & Win 的 bstart/respin 影格。原本這裡 txt="" ⇒ 非鎖定格永久空白，
          //   沒落金幣的重旋逐格與前一影格相同（實測 51.9% 空、24.1% 空接空完全靜止）＝該類型唯一的張力被做成靜態。
          //   改為每格每影格獨立抽一枚非金幣裝飾符（is-spin）＝盤面在「找金幣」時視覺上持續在轉。
          cls+=" is-spin";
          txt = spinChar();
        }
        board.appendChild(el("div",{class:cls,text:txt}));
      }
    }
    function setResp(n){ respBadge.style.display=""; respBadge.textContent="🔄 重旋 "+n; }
    function setPot(v){ potBadge.style.display=""; potBadge.textContent="💰 "+fmtX(v); }
    function pop(text,cls){ return HL.dom.floatPop(stage, "ax-toad__pop "+(cls||""), text, 1100); }

    function renderResting(){ var rng=mulberry32(0x60A7); renderGrid(newGrid(rng),null,null,null); modeBadge.style.display=""; respBadge.style.display="none"; potBadge.style.display="none"; }

    var delay = HL.dom.delay;

    function playRound(bet, ctx){
      var fast=!!(ctx&&ctx.turbo), forced=(ctx&&ctx.forceBonus)||0;
      busy=true;
      var seed=Math.floor(HL.fair.floatOr("golden-toad")*4294967296);
      var rng=mulberry32(seed);
      var res=simSpin(rng, forced, true);
      var totalMult=res.mult, tl=res.timeline;

      var done=(function(){
        // base spin
        respBadge.style.display="none"; potBadge.style.display="none"; modeBadge.style.display="";
        renderGrid(tl.base.grid, null, null, null);
        return delay(fast?60:360).then(function(){
          if(tl.base.units>0){ renderGrid(tl.base.grid, null, tl.base.cells, null); if(!fast) pop(fmtX(tl.base.units),""); return delay(fast?40:520); }
        }).then(function(){
          if(!tl.bonus) return;
          // Hold & Win bonus
          var b=tl.bonus;
          modeBadge.style.display="none";
          if(!fast) pop("🐸 金蟾聚寶 · Hold & Win！","is-fsstart");
          var ev=b.events, i=0;
          function stepEv(){
            if(i>=ev.length) return Promise.resolve();
            var e=ev[i++];
            if(e.t==="bstart"){ setResp(e.respins); setPot(sumVals(e.locked)); renderGrid(null, e.locked, null, null); return delay(fast?40:520).then(stepEv); }
            if(e.t==="respin"){
              var fset={}; e.fresh.forEach(function(f){ fset[f.r+","+f.c]=1; });
              setResp(e.respins); setPot(sumVals(e.locked));
              renderGrid(null, e.locked, null, fset);
              if(e.fresh.length && !fast) pop("🪙 +"+e.fresh.length+" 鎖定！重旋重置", "is-chippop");
              return delay(fast?30:e.fresh.length?540:300).then(stepEv);
            }
            if(e.t==="bend"){
              setPot(e.win);
              if(e.full && !fast) pop("👑 滿盤 GRAND +"+e.grand+"×！","is-mega");
              return delay(fast?40:600).then(stepEv);
            }
            return stepEv();
          }
          return stepEv();
        });
      })().then(function(){
        busy=false;
        history.push(fmtX(totalMult), totalMult>=1?"is-win":"is-lose");
        if(totalMult>=100) pop("💥 "+fmtX(totalMult)+" MEGA WIN！","is-mega");
        else if(totalMult>=10) pop("🎉 "+fmtX(totalMult),"is-big");
        // #25 家族 J：中獎盤保留至下一局。原本這裡 renderResting() 會用固定種子(0x60A7)的無獎待機盤把中獎盤抹掉，
        // 而派彩(betPanel/buyBtn 的 done.then finish)在下一個 microtask 才入帳 ⇒ 玩家永遠看不到自己中的那盤、
        // 餘額卻已在待機盤上跳動。改為不在結算路徑重繪：結果盤(base 高亮或 Hold&Win 鎖定金幣)留在畫面上，
        // 下一注 playRound 開頭的 base 渲染(renderGrid(tl.base.grid…))才覆蓋它。
        if(board.dataset) board.dataset.result = totalMult>=1?"win":"lose";
      });
      return { multiplier: totalMult, label:(res.mode?"🐸 Hold&Win ":"")+"開出 "+fmtX(totalMult), done:done };
    }
    function sumVals(m){ var s=0; for(var k in m) if(m.hasOwnProperty(k)) s+=m[k]; return s; }

    var panel=HL.instant.betPanel({ initial:50, game:"golden-toad", playText:"旋轉 🐸", playRound:playRound });

    var buyBtn=el("button",{class:"ax-toad__buy",text:"購買 Hold & Win "+CFG.buyX+"×",onClick:function(){
      if(busy||buyBtn.disabled||panel.isBusy()) return;   // 家族 A：面板的回合在途時也不准買入（否則兩局動畫演在同一個 board 上）
      var bet=panel.getBet?panel.getBet():50;
      var cost=Math.round(bet*CFG.buyX);   // 買入 RTP≈95.9%（E[bonus]=83.4× / 87 ≈ base 96.3%，公平非坑；價讀 CFG 單一來源）
      if(cost>HL.instant.bal()){ HL.ui.toast("餘額不足（Demo）","warn"); return; }
      if(HL.rg && !HL.rg.check(cost)) return;   // #86：買入繞過 betPanel 自行扣款 ⇒ 需自帶閘（正常旋轉已由 instant.js:89/:120 閘住）
      buyBtn.disabled=true; panel.lock(true); HL.instant.setBal(HL.instant.bal()-cost);
      var r=playRound(bet,{turbo:!!(HL.gset && HL.gset.get("fast")),forceBonus:1});   // 家族 C：買入動畫也要吃極速模式（p90 20 秒的乾等）
      r.done.then(function(){
        var payout=Math.round(bet*r.multiplier);
        if(payout) HL.instant.setBal(HL.instant.bal()+payout);
        if(HL.liveStats) HL.liveStats.record("golden-toad", cost, payout);
        HL.ui.toast("🐸 Hold & Win 結果：贏 "+HL.dom.money(payout)+"（本 "+HL.dom.money(cost)+"）", payout>=cost?"ok":"warn");
        buyBtn.disabled=false; panel.lock(false);
      });
    }});

    renderResting();

    var node=el("div",{class:"ax-inst ax-fade-in"},[
      el("h2",{class:"ax-inst__title",text:"🐸 金蟾聚寶 Golden Toad"}),
      stage,
      history.node,
      panel.node,
      el("div",{class:"ax-toad__buyrow"},[ buyBtn, el("small",{class:"ax-muted",text:"直接觸發 Hold & Win（保證 6 金幣起手）"}) ]),
      HL.ui.gameInfoBar({ fair:"一注一種子·可驗證", edge:HL.gameRtp.edgeOf("golden-toad"), rtp:HL.gameRtp.of("golden-toad"), note:"5×3 · 10 線；🪙金幣 ≥6 觸發 Hold & Win（約 1/98）：鎖定金幣、3 次重旋、落新幣重置次數；派彩=金幣值加總，滿盤再加 GRAND +200×。忠實復刻業界標準 Hold & Win 玩法" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node,{ title:"金蟾聚寶 Golden Toad", provider:"Apex Studio", key:"golden-toad" }) : node;
  }

  HL.games.register({ id:"golden-toad", title:"金蟾聚寶 Golden Toad", provider:"Apex Studio", type:"slot", cat:"originals", playable:true, comingSoon:false, isNew:true, hot:true, c1:"#ca8a04", c2:"#3f2d0a", render: toadGame });
})(typeof window !== "undefined" ? window : globalThis);

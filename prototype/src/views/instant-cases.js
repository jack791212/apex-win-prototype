/*
 * Apex Win｜即時遊戲：Cases 開箱（單軸水平滾輪，掛在 HL.instant.betPanel 共用引擎上）
 * 機制（對標 Stake 2026 Original「Cases / 開箱收集」）：單發下注 → 水平滾輪滾過多個倍數格、
 *   減速停在指針下的一格＝該局賠付倍數。單步結果（最易接 provably fair）。
 * 模型：每難度一張 {mult, weight} 加權表，落點 = HL.fair.floatOr("cases") 對當前表加權累積選取
 *   （沿用 luckyspin.js pick() 加權法，改用 fair float 種子＝一注一 nonce 可驗證）。
 *   四難度僅改「分布形狀」＝變異度遞增（簡單多集中 1× 附近；專家多為 0×＋極少數頂倍），RTP 不變。
 *   RTP≈98.5%（各表 Σ(w×mult)/Σw 由 tune-cases 解析法命中 0.984–0.986；派彩走 betPanel 的 round，
 *   小注舍入對稱、對 RTP 影響可忽略）。max 倍數 = 5× / 25× / 150× / 1000×。
 * 滾輪動畫：沿用 slot.js animateSpin 的「條帶技術」——中獎格放在已知索引，量測 offsetLeft 求出
 *   把該格置中於指針的 translateX，cubic-bezier ease-out 減速 + 單一 setTimeout 收尾（把 slot 的
 *   translateY 改為 translateX）。done Promise 讓 betPanel 等滾輪停穩才結算派彩。
 * 以 register 新增 originals 可玩卡（id: cases）；零 main.js 改動。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  // 四難度加權表 [mult, weight]（0× 桶權重由 tune-cases 解析法墊到 RTP≈0.985；變異度 easy<med<hard<expert）
  var DIFFS = [
    { key: "easy", label: "簡單", tbl: [[0, 8], [0.5, 15], [0.8, 20], [1, 25], [1.2, 15], [1.5, 10], [2, 6], [5, 1]] },
    { key: "med", label: "普通", tbl: [[0, 33], [0.4, 22], [0.9, 16], [1, 11], [1.4, 8], [2, 5.5], [4, 3], [12, 1.5], [25, 0.5]] },
    { key: "hard", label: "困難", tbl: [[0, 55], [0.3, 18], [0.8, 14], [1.5, 9], [3, 4.5], [8, 2.8], [25, 1], [75, 0.1], [150, 0.03]] },
    { key: "expert", label: "專家", tbl: [[0, 279], [0.2, 15], [1, 8], [4, 5], [15, 2.5], [60, 1], [250, 0.35], [1000, 0.09]] }
  ];
  var FILL_BEFORE = 44, TRAIL = 10, DUR = 2.6; // 中獎格前置填充數 / 後方留白數 / 正常滾動秒數

  function rnd() { return HL.fair.floatOr("cases"); } // 統一後援出口（float 語意不變）
  // 加權累積選取（同 luckyspin.js pick()，改吃 [0,1) float 種子）
  function pickMult(tbl, f) {
    var total = 0, i; for (i = 0; i < tbl.length; i++) total += tbl[i][1];
    var r = f * total, acc = 0;
    for (i = 0; i < tbl.length; i++) { acc += tbl[i][1]; if (r < acc) return tbl[i][0]; }
    return tbl[tbl.length - 1][0];
  }
  function fmtMult(m) { return (m >= 1000 ? m.toLocaleString("en-US") : m) + "×"; }
  function tierCls(m) {
    if (m === 0) return "is-zero";
    if (m < 1) return "is-t0";
    if (m < 2) return "is-t1";
    if (m < 10) return "is-t2";
    if (m < 100) return "is-t3";
    return "is-t4";
  }

  function casesGame() {
    var diff = DIFFS[1];        // 預設普通
    var spinning = false;

    var reelWrap = el("div", { class: "ax-cases__reelwrap" });
    var strip = el("div", { class: "ax-cases__strip" });
    reelWrap.appendChild(el("div", { class: "ax-cases__ptr" }));
    reelWrap.appendChild(strip);
    var maxHint = el("small", { class: "ax-muted" });
    var history = HL.ui.histBar({ cls: "ax-cases__hist", itemCls: "ax-cases__pill", max: 12, fair: true });

    function cellEl(m, hit) { return el("div", { class: "ax-cases__cell " + tierCls(m) + (hit ? " is-hit" : ""), text: fmtMult(m) }); }
    function fillerCell() { return cellEl(pickMult(diff.tbl, Math.random()), false); } // 純視覺填充（非公平關鍵）
    function maxMult() { return diff.tbl.reduce(function (a, r) { return Math.max(a, r[0]); }, 0); }

    // 置中某格於指針（量測 offsetLeft，免硬編格寬／間距，天然吃 responsive）
    function centerOn(cell, animate) {
      var target = -(cell.offsetLeft + cell.offsetWidth / 2 - reelWrap.clientWidth / 2);
      if (animate) {
        strip.style.transition = "transform " + DUR + "s cubic-bezier(.12,.72,.2,1)";
      } else {
        strip.style.transition = "none";
      }
      strip.style.transform = "translateX(" + target + "px)";
    }

    // 未開局的靜態擺設：一排填充格置中，指針落在中間格
    function renderResting() {
      HL.dom.clear(strip);
      for (var i = 0; i < 15; i++) strip.appendChild(fillerCell());
      strip.style.transition = "none"; strip.style.transform = "translateX(0)";
      global.requestAnimationFrame(function () { if (reelWrap.clientWidth) centerOn(strip.children[7], false); });
      HL.dom.clear(maxHint); maxHint.appendChild(HL.i18n.fmt("最高 {m}　RTP 98.5%", { m: fmtMult(maxMult()) })); // U22：動態組字走 fmt（EN 不顯中文）
    }

    // 一局滾動：winMult 為公平抽出的落點倍數；回傳滾停 Promise
    function spinTo(winMult, fast) {
      HL.dom.clear(strip);
      var i;
      for (i = 0; i < FILL_BEFORE; i++) strip.appendChild(fillerCell());
      var winCell = cellEl(winMult, true);
      strip.appendChild(winCell);
      for (i = 0; i < TRAIL; i++) strip.appendChild(fillerCell());
      // 起點：置中於第 6 格（給一段跑道），無過場
      strip.style.transition = "none";
      centerOn(strip.children[6], false);
      void reelWrap.offsetWidth; // 同步 reflow 提交起點（不依賴合成/rAF，同 slot.js）
      return new Promise(function (resolve) {
        // 落定：無過場重新斷言終點＝保證置中（即使 transition 被中斷/背景分頁/reduced-motion）
        function land() { centerOn(winCell, false); winCell.classList.add("is-land"); resolve(winCell); }
        if (fast) { land(); return; }
        centerOn(winCell, true); // 啟動 2.6s cubic-bezier 減速滾動（顯示分頁會動畫、背景分頁直接跳終值）
        // 結算/落定閘門用 setTimeout 保證觸發（背景分頁/無 rAF 也成立，同 dice）
        setTimeout(land, DUR * 1000 + 80);
      });
    }

    function centerPop(text, cls) {
      var p = el("div", { class: "ax-cases__pop " + (cls || ""), text: text });
      reelWrap.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 900);
    }

    function playRound(bet, ctx) {
      var fast = !!(ctx && ctx.turbo);
      spinning = true;
      var m = pickMult(diff.tbl, rnd()); // 公平落點（一注一 nonce）
      var done = spinTo(m, fast).then(function (winCell) {
        spinning = false;
        history.push(fmtMult(m), m >= 1 ? "is-win" : "is-lose");
        if (m >= 10) { winCell.classList.add("is-bigwin"); centerPop(fmtMult(m) + " 🎉", "is-big"); }
        else if (m >= 1) { centerPop(fmtMult(m), ""); }
      });
      return { multiplier: m, label: "開出 " + fmtMult(m), done: done };
    }

    var panel = HL.instant.betPanel({ initial: 50, game: "cases", playText: "開箱 🎁", playRound: playRound });

    // 難度選擇（開局中禁切；S7 共用 HL.ui.segmented，外觀沿用 ax-inst__chip）
    var diffSel = HL.ui.segmented(DIFFS.map(function (d) { return { v: d.key, t: d.label }; }), diff.key, function (v) {
      if (spinning) return false;
      diff = DIFFS.filter(function (d) { return d.key === v; })[0];
      renderResting();
    }, { cls: "ax-inst__amt", btnCls: "ax-inst__chip", activeCls: "is-active" });

    renderResting();

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🎁 Cases 開箱" }),
      el("div", { class: "ax-inst__stage ax-cases" }, [reelWrap, history.node]),
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "難度" }), diffSel]),
      el("div", { class: "ax-inst__row" }, [el("small", { class: "ax-muted", text: "說明" }), maxHint]),
      panel.node,
      HL.ui.gameInfoBar({ fair: "一注一轉", edge: "≈1.5% 莊家優勢", rtp: "98.5%", note: "滾輪停在指針下的倍數即為本局賠付；難度只改分布、RTP 不變" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Cases 開箱", provider: "Apex Studio", key: "cases" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "cases", title: "Cases 開箱", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#c026d3", c2: "#3b0a3a", render: casesGame });
  }
})(window);

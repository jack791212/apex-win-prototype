/*
 * Apex Win｜可重用「Free Game 盤面」元件（暗影儀式 FG 的動畫流程）
 * 每個實例獨立：滾輪旋轉 → 中獎演出 → 中央彈分 → 消除 → 落下補位 → 連爆。
 * 重用 HL.slotEngine（5×5、M+H、連爆 ways）與原創符號。供「對押競技」雙盤面使用。
 * 註冊於 window.HL.fgBoard。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;

  function create(container, opts) {
    opts = opts || {};
    var E = HL.slotEngine;
    var ROWS = opts.rows || 5, LEVEL = (opts.level == null ? 5 : opts.level), BET = opts.bet || 10, GAP = 6;
    var SP = opts.animSpeed || 1; // 動畫速度乘數（Fast Spins 0.6 / Ultra 0.35）
    var grid = E.makeGrid(ROWS, LEVEL), total = 0, busy = false;
    container.style.position = "relative";

    function drawStatic(g, cells) {
      HL.dom.clear(container);
      container.style.display = "grid";
      container.style.gridTemplateColumns = "repeat(" + g.length + ",1fr)";
      container.style.gap = GAP + "px";
      for (var r = 0; r < g.length; r++) {
        var col = el("div", { class: "ax-reel" }); col.style.gap = GAP + "px";
        for (var y = 0; y < g[r].length; y++) {
          var cell = E.symEl(g[r][y]);
          if (cells && cells[r + "_" + y]) cell.classList.add("is-win");
          col.appendChild(cell);
        }
        container.appendChild(col);
      }
    }
    drawStatic(grid);

    function popup(amount) {
      var p = el("div", { class: "ax-fgb__pop", text: "+" + money(amount) });
      container.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 700);
    }

    function animateRoll(finalGrid, cb) {
      HL.dom.clear(container);
      container.style.display = "grid";
      container.style.gridTemplateColumns = "repeat(" + finalGrid.length + ",1fr)";
      container.style.gap = GAP + "px";
      var wins = [];
      for (var r = 0; r < finalGrid.length; r++) { var w = el("div", { class: "ax-reel ax-reel--roll" }); container.appendChild(w); wins.push(w); }
      var cellW = wins[0].clientWidth || 40, cellH = cellW * (110 / 144), step = cellH + GAP, F = 6;
      var strips = [];
      wins.forEach(function (w, r) {
        w.style.height = (ROWS * cellH + (ROWS - 1) * GAP) + "px";
        var strip = el("div", { class: "ax-reel__strip" }); strip.style.gap = GAP + "px";
        for (var y = 0; y < ROWS; y++) strip.appendChild(E.symEl(finalGrid[r][y]));
        for (var k = 0; k < F; k++) strip.appendChild(E.symEl(E.drawSym(LEVEL)));
        strip.style.transition = "none";
        strip.style.transform = "translateY(" + (-(F * step)) + "px)";
        w.appendChild(strip); strips.push(strip);
      });
      void container.offsetWidth;
      strips.forEach(function (strip, r) {
        var dur = (0.5 + r * 0.08) * SP;
        strip.style.transition = "transform " + dur + "s cubic-bezier(.2,.78,.25,1)";
        strip.style.transform = "translateY(0)";
      });
      setTimeout(function () { drawStatic(finalGrid); cb(); }, (0.5 + (finalGrid.length - 1) * 0.08) * 1000 * SP + 90);
    }

    function tumbleAnim(removed, cb) {
      var offsets = [];
      for (var r = 0; r < grid.length; r++) {
        var k = 0, surv = [];
        for (var y = 0; y < grid[r].length; y++) { if (removed[r + "_" + y]) k++; else surv.push({ sym: grid[r][y], oldY: y }); }
        var col = [], colOff = [];
        for (var i = 0; i < k; i++) { col.push(E.drawSym(LEVEL)); colOff.push(-(k - i)); }
        surv.forEach(function (s) { col.push(s.sym); colOff.push(null); });
        var fo = [];
        for (var ny = 0; ny < col.length; ny++) fo.push(colOff[ny] == null ? (ny - surv[ny - k].oldY) : (ny - colOff[ny]));
        grid[r] = col; offsets.push(fo);
      }
      drawStatic(grid);
      var fc = container.querySelector(".ax-sym"), step = (fc ? fc.getBoundingClientRect().height : 40) + GAP, moved = [];
      for (var r2 = 0; r2 < grid.length; r2++) {
        var colEl = container.children[r2];
        for (var y2 = 0; y2 < grid[r2].length; y2++) {
          var off = offsets[r2][y2];
          if (off > 0) { var cell = colEl.children[y2]; cell.style.transition = "none"; cell.style.transform = "translateY(" + (-(off * step)) + "px)"; moved.push(cell); }
        }
      }
      void container.offsetWidth;
      moved.forEach(function (cell) { cell.style.transition = "transform " + (0.38 * SP) + "s cubic-bezier(.33,.66,.3,1)"; cell.style.transform = "translateY(0)"; });
      setTimeout(cb, 400 * SP);
    }

    function cascade(cb) {
      function step() {
        if (!document.body.contains(container)) return; // 已離開頁面
        var ev = E.evaluate(grid, BET);
        if (ev.total <= 0) return cb();
        drawStatic(grid, ev.cells);                 // 中獎演出
        setTimeout(function () {
          total += ev.total; if (opts.onWin) opts.onWin(ev.total, total);
          popup(ev.total);                          // 中央彈分
          setTimeout(function () {
            container.querySelectorAll(".ax-sym.is-win").forEach(function (n) { n.classList.add("is-removing"); }); // 消除
            setTimeout(function () { tumbleAnim(ev.cells, function () { setTimeout(step, 80 * SP); }); }, 250 * SP); // 落下 → 連爆
          }, 650 * SP);
        }, 800 * SP);
      }
      step();
    }

    function spin(cb) {
      if (busy) return; busy = true;
      var g = E.makeGrid(ROWS, LEVEL);
      animateRoll(g, function () { grid = g; cascade(function () { busy = false; if (cb) cb(); }); });
    }

    return { spin: spin, getTotal: function () { return total; }, el: container };
  }

  HL.fgBoard = { create: create };
})(window);

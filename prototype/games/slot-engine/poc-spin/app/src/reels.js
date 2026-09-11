/*
 * Slot Engine POC · Spin — 3×5 盤面與逐軸停輪（PixiJS v8）
 *
 * 座標模型
 *   每軸有一個連續位置 pos（單位＝格）。第 i 個轉輪帶格子的 y = (pos - i) * PITCH（PITCH = CELL + GAP）。
 *   pos 遞增 → 符號向下捲動；pos 為整數時對齊：row0 顯示 i=pos、row1 顯示 i=pos-1、row2 顯示 i=pos-2。
 *   停輪目標 stop（整數）在 spin 開始時就決定，faceAt() 讓 i ∈ [stop-2, stop] 直接回傳最終盤面，
 *   其餘 i 用可重現的雜湊亂數當填充 → 符號進入視野時已是最終結果，不會有「跳號」。
 *
 * 註冊於 window.PocReels。
 */
(function (global) {
  "use strict";

  var PIXI = global.PIXI;
  var M = global.PocMath;

  var CELL = 100, GAP = 6, REELS = M.REELS, ROWS = M.ROWS;
  var PITCH = CELL + GAP;                            // 106：一格的實際間距（含格間空隙）
  var BOARD_W = REELS * CELL + (REELS - 1) * GAP;   // 524
  var BOARD_H = ROWS * PITCH - GAP;                  // 312（第 4 格起始於 318 → 被遮罩完全裁掉）
  var SLOTS = 5;                                     // 每軸的可見+緩衝格數

  // 可重現的填充亂數（同 reel/index 永遠同一個面）
  function hash01(a, b) {
    var h = (a * 374761393 + b * 668265263) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function makeSymbol() {
    var c = new PIXI.Container();
    var bg = new PIXI.Graphics();
    var txt = new PIXI.Text({ text: "", style: { fontFamily: "Arial Black, Arial, sans-serif", fontSize: 52, fontWeight: "900", fill: 0xffffff, align: "center" } });
    txt.anchor.set(0.5);
    txt.x = CELL / 2; txt.y = CELL / 2;
    c.addChild(bg); c.addChild(txt);
    c._bg = bg; c._txt = txt; c._face = -1;
    c.setFace = function (i) {
      if (c._face === i) return;
      c._face = i;
      var s = M.SYMBOLS[i];
      bg.clear();
      bg.roundRect(2, 2, CELL - 4, CELL - 4, 12).fill({ color: 0x171533 });
      bg.roundRect(2, 2, CELL - 4, CELL - 4, 12).stroke({ width: 2, color: s.color, alpha: 0.5 });
      txt.text = s.glyph;
      txt.style.fontSize = s.glyph.length > 1 ? 30 : 54;
      txt.style.fill = s.color;
    };
    return c;
  }

  function create(app) {
    var root = new PIXI.Container();

    // ---- 底板 ----
    var plate = new PIXI.Graphics();
    plate.roundRect(-14, -14, BOARD_W + 28, BOARD_H + 28, 18).fill({ color: 0x0f0e20 });
    plate.roundRect(-14, -14, BOARD_W + 28, BOARD_H + 28, 18).stroke({ width: 2, color: 0x35306b });
    root.addChild(plate);

    // ---- 遮罩 + 各軸 ----
    var window_ = new PIXI.Container();
    var mask = new PIXI.Graphics().rect(0, 0, BOARD_W, BOARD_H).fill({ color: 0xffffff });
    window_.addChild(mask);
    window_.mask = mask;
    root.addChild(window_);

    var reels = [];
    for (var r = 0; r < REELS; r++) {
      var col = new PIXI.Container();
      col.x = r * (CELL + GAP);
      var slots = [];
      for (var k = 0; k < SLOTS; k++) { var s = makeSymbol(); col.addChild(s); slots.push(s); }
      window_.addChild(col);
      reels.push({ node: col, slots: slots, pos: 0, stop: null, grid: null });
    }

    var winLayer = new PIXI.Graphics();
    root.addChild(winLayer);

    // ---- 面決定 ----
    function faceAt(r, i) {
      var rl = reels[r];
      if (rl.stop != null && rl.grid) {
        var row = rl.stop - i;
        if (row >= 0 && row < ROWS) return rl.grid[row];
      }
      return M.STRIP[Math.floor(hash01(r + 1, i) * M.STRIP.length) % M.STRIP.length];
    }

    function paint(r) {
      var rl = reels[r];
      var base = Math.floor(rl.pos);
      for (var k = 0; k < SLOTS; k++) {
        var i = base + 1 - k;
        var slot = rl.slots[k];
        slot.setFace(faceAt(r, i));
        slot.y = (rl.pos - i) * PITCH;
      }
    }

    // 初始靜態盤面
    for (var q = 0; q < REELS; q++) { reels[q].pos = 20 + q * 7; paint(q); }

    // ---- 轉輪 ----
    var anim = null, guard = null;
    function spin(finalGrid, onReelStop) {
      clearWin();
      return new Promise(function (resolve) {
        var t0 = performance.now();
        var finished = false;
        function finish() {
          if (finished) return;
          finished = true;
          if (guard) { clearTimeout(guard); guard = null; }
          if (anim) { app.ticker.remove(anim); anim = null; }
          resolve();
        }
        var plan = [];
        for (var r = 0; r < REELS; r++) {
          var rl = reels[r];
          var from = Math.ceil(rl.pos);
          var dist = 14 + r * 5;                 // 走的格數（越右邊越多 → 逐軸停）
          rl.stop = from + dist;
          rl.grid = finalGrid[r];
          plan.push({ from: rl.pos, dur: 900 + r * 320, stopped: false });
        }
        var total = plan[REELS - 1].dur;

        anim = function () {
          var now = performance.now();
          var allDone = true;
          for (var r = 0; r < REELS; r++) {
            var p = plan[r], rl = reels[r];
            var t = (now - t0) / p.dur;
            if (t >= 1) {
              rl.pos = rl.stop;
              if (!p.stopped) { p.stopped = true; if (onReelStop) onReelStop(r); }
            } else {
              allDone = false;
              var d = rl.stop - p.from;
              // 0～88%：加速→減速到超出 0.35 格；88～100%：彈回定位
              if (t < 0.88) rl.pos = p.from + (d + 0.35) * easeOutCubic(t / 0.88);
              else rl.pos = (rl.stop + 0.35) - 0.35 * easeOutCubic((t - 0.88) / 0.12);
            }
            paint(r);
          }
          if (allDone && now - t0 >= total) finish();
        };
        app.ticker.add(anim);

        // 看門狗：requestAnimationFrame 在分頁被切到背景時會停擺（ticker 不再跑）。
        // 若無此保護，spin 的 Promise 永不 resolve → 該注永遠不會 bet:settle（契約第 3 節「未結算注」）。
        // setTimeout 在背景仍會觸發：逾時就把各軸直接吸附到 stop 定位並收尾。
        guard = setTimeout(function () {
          for (var r2 = 0; r2 < REELS; r2++) {
            reels[r2].pos = reels[r2].stop;
            paint(r2);
            if (!plan[r2].stopped) { plan[r2].stopped = true; if (onReelStop) onReelStop(r2); }
          }
          finish();
        }, total + 900);
      });
    }

    // ---- 中獎線 ----
    var winFade = null;
    function clearWin() {
      winLayer.clear();
      if (winFade) { app.ticker.remove(winFade); winFade = null; }
      winLayer.alpha = 1;
    }
    function showWin(hits) {
      clearWin();
      if (!hits || !hits.length) return;
      hits.forEach(function (h) {
        var line = M.LINES[h.line];
        var color = M.SYMBOLS.filter(function (s) { return s.key === h.key; })[0].color;
        for (var r = 0; r < h.count; r++) {
          var cx = r * (CELL + GAP), cy = line.rows[r] * (CELL + GAP);
          winLayer.roundRect(cx + 1, cy + 1, CELL - 2, CELL - 2, 12).stroke({ width: 4, color: color, alpha: 0.95 });
        }
        winLayer.moveTo(CELL / 2, line.rows[0] * (CELL + GAP) + CELL / 2);
        for (var q2 = 1; q2 < h.count; q2++) {
          winLayer.lineTo(q2 * (CELL + GAP) + CELL / 2, line.rows[q2] * (CELL + GAP) + CELL / 2);
        }
        winLayer.stroke({ width: 3, color: color, alpha: 0.65 });
      });
      var born = performance.now();
      winFade = function () {
        var e = performance.now() - born;
        winLayer.alpha = 0.45 + 0.55 * Math.abs(Math.cos(e / 380));
        if (e > 2600) { clearWin(); }
      };
      app.ticker.add(winFade);
    }

    return {
      container: root,
      width: BOARD_W, height: BOARD_H,
      spin: spin, showWin: showWin, clearWin: clearWin
    };
  }

  global.PocReels = { create: create, BOARD_W: BOARD_W, BOARD_H: BOARD_H, CELL: CELL, GAP: GAP, PITCH: PITCH };
})(window);

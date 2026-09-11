/*
 * Slot Engine POC · Spin — 遊戲數學核心（純函式）
 *
 * POC 範圍：賠付表寫死幾條、不做 RTP 驗證（TC-008 明列不包含）。
 * 但刻意寫成「純函式 + 可 module.exports」，對齊 House-Light 平台既有慣例
 * （每款 slot 的數學核心可被 Node 蒙地卡羅重算，「驗的即玩的」）。
 *
 * 盤面座標：grid[reel][row]，reel 0..4（左→右）、row 0..2（上→下）。
 * 註冊於 window.PocMath（瀏覽器）／module.exports（Node）。
 */
(function (global) {
  "use strict";

  // 符號表：weight 決定轉輪帶出現機率；pay 為「× 單線注」倍數
  var SYMBOLS = [
    { key: "SEVEN", glyph: "7",   color: 0xffd76a, weight: 1, pay: { 3: 10, 4: 50, 5: 250 } },
    { key: "BAR",   glyph: "BAR", color: 0xb48cff, weight: 2, pay: { 3: 5,  4: 20, 5: 100 } },
    { key: "STAR",  glyph: "★",   color: 0x6ad7ff, weight: 3, pay: { 3: 3,  4: 10, 5: 50 } },
    { key: "DIA",   glyph: "♦",   color: 0xff6b8a, weight: 4, pay: { 3: 2,  4: 6,  5: 25 } },
    { key: "CLUB",  glyph: "♣",   color: 0x7ee787, weight: 5, pay: { 3: 1,  4: 4,  5: 15 } }
  ];

  // 5 條固定線（值為 row index）：中 / 上 / 下 / V / Λ
  var LINES = [
    { name: "L1 中線", rows: [1, 1, 1, 1, 1] },
    { name: "L2 上線", rows: [0, 0, 0, 0, 0] },
    { name: "L3 下線", rows: [2, 2, 2, 2, 2] },
    { name: "L4 ∨",   rows: [0, 1, 2, 1, 0] },
    { name: "L5 ∧",   rows: [2, 1, 0, 1, 2] }
  ];

  // 依 weight 展開的轉輪帶（5 軸共用同一條帶）
  var STRIP = (function () {
    var a = [];
    SYMBOLS.forEach(function (s, i) { for (var k = 0; k < s.weight; k++) a.push(i); });
    return a;
  })();

  var REELS = 5, ROWS = 3;

  function pickFace(rand) { return STRIP[Math.floor(rand() * STRIP.length) % STRIP.length]; }

  // 產生一次盤面結果
  function spinGrid(rand) {
    rand = rand || Math.random;
    var grid = [];
    for (var r = 0; r < REELS; r++) {
      var col = [];
      for (var y = 0; y < ROWS; y++) col.push(pickFace(rand));
      grid.push(col);
    }
    return grid;
  }

  // 算分：回傳 { win, lineBet, hits:[{ line, key, count, pay }] }
  function evaluate(grid, bet) {
    var lineBet = Math.max(1, Math.round(bet / LINES.length));
    var win = 0, hits = [];
    LINES.forEach(function (line, li) {
      var first = grid[0][line.rows[0]];
      var count = 1;
      for (var r = 1; r < REELS; r++) {
        if (grid[r][line.rows[r]] === first) count++; else break;
      }
      var mult = SYMBOLS[first].pay[count];
      if (count >= 3 && mult) {
        var pay = mult * lineBet;
        win += pay;
        hits.push({ line: li, lineName: line.name, key: SYMBOLS[first].key, count: count, pay: pay });
      }
    });
    return { win: win, lineBet: lineBet, hits: hits };
  }

  var api = {
    SYMBOLS: SYMBOLS, LINES: LINES, STRIP: STRIP, REELS: REELS, ROWS: ROWS,
    pickFace: pickFace, spinGrid: spinGrid, evaluate: evaluate
  };

  if (global) global.PocMath = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node 驗算用
})(typeof window !== "undefined" ? window : null);

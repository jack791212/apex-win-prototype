/*
 * Apex Win｜輪盤 Roulette（歐式單零，掛在 HL.table 共用桌遊引擎上）
 * 真開：0–36 亂數開號。注區：直注 35:1(36×)、紅黑/單雙/大小 1:1(2×)、打/列 2:1(3×)。
 * 結算走 HL.table（扣注/派彩/餘額同步 + 掛 HL.liveStats.record）。
 * 以 HL.games.register 覆蓋 mock 的「European Roulette」占位卡（id: european-roulette）為可玩。
 * 載入順序：data/games.js 之後（覆蓋 seed）、core/table.js 之後。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;

  var RED = { 1: 1, 3: 1, 5: 1, 7: 1, 9: 1, 12: 1, 14: 1, 16: 1, 18: 1, 19: 1, 21: 1, 23: 1, 25: 1, 27: 1, 30: 1, 32: 1, 34: 1, 36: 1 };
  function colorOf(n) { return n === 0 ? "green" : (RED[n] ? "red" : "black"); }
  function colorName(n) { return n === 0 ? "綠" : (RED[n] ? "紅" : "黑"); }

  // 開出 n → 各中獎注區的「總賠付倍數」（未列＝輸=0）
  function returnsOf(n) {
    var r = {};
    r["n" + n] = 36;                       // 直注 35:1
    if (n !== 0) {
      r[RED[n] ? "red" : "black"] = 2;     // 紅黑 1:1
      r[(n % 2 === 0) ? "even" : "odd"] = 2; // 單雙 1:1
      r[(n <= 18) ? "low" : "high"] = 2;   // 大小 1:1
      r["d" + (n <= 12 ? 1 : n <= 24 ? 2 : 3)] = 3; // 打(12) 2:1
      r["c" + (((n - 1) % 3) + 1)] = 3;    // 列 2:1（1,4,7..=c1；2,5,8..=c2；3,6,9..=c3）
    }
    return r;
  }

  function infoModal() {
    HL.ui.modal("輪盤 · 規則 / 賠率", [
      el("p", { class: "ax-muted", text: "歐式單零輪盤（0–36，共 37 格，莊家優勢 2.7%）。下注後旋轉，開出號碼即結算。" }),
      el("ul", { class: "ax-bacc__rules" }, [
        el("li", {}, [el("b", { text: "直注（單一號碼）" }), el("span", { text: "　35:1（退 36×）" })]),
        el("li", {}, [el("b", { text: "紅 / 黑、單 / 雙、大(1–18) / 小(19–36)" }), el("span", { text: "　1:1（退 2×）" })]),
        el("li", {}, [el("b", { text: "打（1–12 / 13–24 / 25–36）、列（2 to 1）" }), el("span", { text: "　2:1（退 3×）" })])
      ]),
      el("p", { class: "ax-muted", text: "開出 0 時，所有場外注（紅黑/單雙/大小/打/列）皆輸。本桌採可驗證公平（HMAC-SHA256）開號 · Demo，點「近況」珠可開驗證面板。" })
    ]);
  }

  function rouletteGame() {
    var spotEls = {};
    var pocket = el("div", { class: "ax-rou__pocket", text: "?" });
    var wheel = el("div", { class: "ax-rou__wheel" }, [el("div", { class: "ax-rou__pointer" }), pocket]);
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "下注後按「旋轉」，開出號碼即結算 🎯" });
    var history = HL.ui.histBar({ cls: "ax-rou__hist", itemCls: "ax-rou__histpill", max: 16, fair: true }); // 已接 HL.fair → 近況珠可點開驗證面板

    function spot(id, label, cls) {
      var badge = el("div", { class: "ax-tbl__stake" });
      var box = el("button", { class: "ax-rou__spot " + (cls || ""), onClick: function () { area.place(id); } }, [
        el("span", { class: "ax-rou__spotlbl", text: label }), badge
      ]);
      spotEls[id] = { badge: badge, box: box };
      return box;
    }
    function renderStakes() {
      for (var id in spotEls) {
        var v = area.staked(id);
        spotEls[id].badge.textContent = v ? (v >= 1000 ? Math.round(v / 1000) + "k" : v) : "";
        spotEls[id].box.classList.toggle("is-staked", v > 0);
      }
    }
    var area = HL.table.betArea({ game: "roulette", onChange: renderStakes });

    // ---- 賭桌佈局 ----
    // 上半：0（左、跨 3 列）+ 12×3 號碼格 + 右側 3 個「2 to 1」列注
    var grid = el("div", { class: "ax-rou__grid" });
    var zero = spot("n0", "0", "ax-rou__cell is-green ax-rou__zero");
    grid.appendChild(zero);
    for (var i = 0; i < 12; i++) {
      // 上列 3,6,..36 / 中列 2,5,..35 / 下列 1,4,..34
      [3 * (i + 1), 3 * (i + 1) - 1, 3 * (i + 1) - 2].forEach(function (num, rowIdx) {
        var cell = spot("n" + num, String(num), "ax-rou__cell is-" + colorOf(num));
        cell.style.gridColumn = String(2 + i);
        cell.style.gridRow = String(rowIdx + 1);
        grid.appendChild(cell);
      });
    }
    // 右側列注（c3=上列、c2=中列、c1=下列）
    [["c3", 1], ["c2", 2], ["c1", 3]].forEach(function (cr) {
      var cb = spot(cr[0], "2:1", "ax-rou__colbet");
      cb.style.gridColumn = "14"; cb.style.gridRow = String(cr[1]);
      grid.appendChild(cb);
    });

    // 下半：打（dozens）+ 場外（1-18/單/紅/黑/雙/19-36）
    var dozens = el("div", { class: "ax-rou__dozens" }, [
      spot("d1", "第 1 打 (1–12)", "ax-rou__obet"),
      spot("d2", "第 2 打 (13–24)", "ax-rou__obet"),
      spot("d3", "第 3 打 (25–36)", "ax-rou__obet")
    ]);
    var outside = el("div", { class: "ax-rou__outside" }, [
      spot("low", "1–18", "ax-rou__obet"),
      spot("even", "雙", "ax-rou__obet"),
      spot("red", "紅", "ax-rou__obet is-red"),
      spot("black", "黑", "ax-rou__obet is-black"),
      spot("odd", "單", "ax-rou__obet"),
      spot("high", "19–36", "ax-rou__obet")
    ]);

    // ---- 旋轉 / 結算 ----
    function setPocket(n) {
      pocket.textContent = String(n);
      pocket.className = "ax-rou__pocket is-" + colorOf(n);
    }
    function clearWins() { for (var id in spotEls) spotEls[id].box.classList.remove("is-win"); }
    function pushHistory(n) { history.push(String(n), "is-" + colorOf(n)); }

    function onSpin() {
      var snap = area.commit(); if (!snap) return;
      area.lock(true); ctrls.dealBtn.disabled = true;
      clearWins();
      statusEl.textContent = "旋轉中…"; statusEl.className = "ax-inst__last ax-muted";
      wheel.classList.add("is-spinning"); pocket.className = "ax-rou__pocket is-spin"; pocket.textContent = "·";

      var result = Math.floor(HL.fair.floatOr("roulette") * 37); // 立即定結果（可驗證公平 HMAC-SHA256；下方 flick 僅視覺滾號、不決結果）
      var ret = returnsOf(result);
      var flick = setInterval(function () { pocket.textContent = String(Math.floor(Math.random() * 37)); }, 60); // 滾號（視覺盡力）

      // 單一 setTimeout 閘門保證結算（背景分頁/無 rAF 也成立）
      setTimeout(function () {
        clearInterval(flick);
        wheel.classList.remove("is-spinning");
        setPocket(result);
        for (var id in spotEls) if (ret[id]) spotEls[id].box.classList.add("is-win");
        var r = area.settle(snap, ret);
        statusEl.textContent = "開出 " + result + "（" + colorName(result) + "）　"
          + (r.net >= 0 ? "贏 +" + money(r.net) : "輸 " + money(-r.net));
        statusEl.className = "ax-inst__last " + (r.net >= 0 ? "ax-green" : "ax-red");
        pushHistory(result);
        area.lock(false); area.clear(); ctrls.dealBtn.disabled = false;
      }, 2200);
    }

    var ctrls = area.controls(onSpin, "旋轉");

    var node = el("div", { class: "ax-inst ax-rou ax-fade-in" }, [
      el("div", { class: "ax-bacc__titlerow" }, [
        el("h2", { class: "ax-inst__title", text: "🎯 輪盤 Roulette" }),
        el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal })
      ]),
      el("div", { class: "ax-rou__stage" }, [wheel, statusEl,
        el("div", { class: "ax-rou__histrow" }, [el("small", { class: "ax-muted", text: "近況" }), history.node])
      ]),
      el("div", { class: "ax-rou__board" }, [grid, el("div", { class: "ax-rou__below" }, [dozens, outside])]),
      HL.table.panel(area, ctrls)
    ]);

    renderStakes();
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "輪盤 Roulette", provider: "Apex Studio", key: "roulette" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({
      id: "european-roulette", title: "輪盤 Roulette", provider: "Apex Studio",
      type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true,
      author: "Apex", c1: "#7a1020", c2: "#2a0a12", render: rouletteGame
    });
  }
})(window);

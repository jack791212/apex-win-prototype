/*
 * Apex Win｜對押競技（玩家開房）
 * 房主指定一款 SLOT，雙方各跑一段「Free Game」（5×5、M+H、連爆 ways，
 * 直接重用老虎機引擎 HL.slotEngine 計算分數），總分高者贏得賭注；輸方支付賭注。
 * 註冊於 window.HL.views.vsslot。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;

  var room, timer;
  var FG_SPINS = 6, SCORE_BET = 10, ROWS = 5;

  function findRoom(id) { return HL.state.get().arenaRooms.filter(function (r) { return r.id === id; })[0]; }
  var engine = function () { return HL.slotEngine; };

  // 跑一個 Free Game spin（含連爆），回傳初始盤面、首消中獎格、總分
  function fgSpin() {
    var E = engine();
    var grid = E.makeGrid(ROWS, E.FG_LEVEL);
    var first = E.evaluate(grid, SCORE_BET);
    var total = first.total;
    if (total > 0) {
      var g = E.tumble(grid, first.cells, E.FG_LEVEL), guard = 0;
      while (guard++ < 12) { var ev = E.evaluate(g, SCORE_BET); if (ev.total <= 0) break; total += ev.total; g = E.tumble(g, ev.cells, E.FG_LEVEL); }
    }
    return { grid: grid, winCells: first.cells, total: total };
  }
  function renderBoard(container, grid, winCells) {
    var E = engine();
    HL.dom.clear(container);
    container.style.gridTemplateColumns = "repeat(5,1fr)";
    for (var r = 0; r < grid.length; r++) {
      var col = el("div", { class: "ax-reel" });
      for (var y = 0; y < grid[r].length; y++) {
        var cell = E.symEl(grid[r][y]);
        if (winCells && winCells[r + "_" + y]) cell.classList.add("is-win");
        col.appendChild(cell);
      }
      container.appendChild(col);
    }
  }
  function seedBoard(container) {
    var E = engine(), g = E.makeGrid(ROWS, E.FG_LEVEL);
    renderBoard(container, g, null);
  }

  function render(roomId) {
    room = findRoom(roomId);
    if (!room || !HL.slotEngine) {
      return el("div", { class: "ax-duel" }, [el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }), el("div", { class: "ax-panel", text: !room ? "此房間已結束。" : "老虎機引擎未載入。" })]);
    }
    var oppName = room.host.name === "你" ? "挑戰者" : room.host.name;
    var meTotal = 0, oppTotal = 0, spinNo = 0, running = false;

    var meBoard = el("div", { class: "ax-vs__board" });
    var opBoard = el("div", { class: "ax-vs__board" });
    var meTotalEl = el("div", { class: "ax-vs__total", text: "0" });
    var opTotalEl = el("div", { class: "ax-vs__total", text: "0" });
    var meLast = el("div", { class: "ax-vs__spin ax-muted", text: "—" });
    var opLast = el("div", { class: "ax-vs__spin ax-muted", text: "—" });
    var fgEl = el("b", { text: "FG 0 / " + FG_SPINS });
    var resultEl = el("div", { class: "ax-vs__result" });
    var startBtn = el("button", { class: "ax-btn-primary", text: "開始 Free Game 對決（賭注 " + money(room.wager) + "）" });

    seedBoard(meBoard); seedBoard(opBoard);

    function finish() {
      running = false;
      var win = meTotal === oppTotal ? (Math.random() < 0.5) : meTotal > oppTotal;
      var st = HL.state.get();
      HL.state.set({ balance: st.balance + (win ? room.wager : -room.wager) });
      HL.shell.refreshChrome();
      room.challenges++; room.done = (room.done || 0) + 1; room.matches = (room.matches || 0) + 1;
      if (win) room.challEdge = (room.challEdge || 0) + room.wager; else room.hostEdge = (room.hostEdge || 0) + room.wager;
      HL.dom.clear(resultEl);
      resultEl.appendChild(el("div", { class: "ax-result " + (win ? "win" : "lose") }, [
        el("div", { class: "ax-result__title", text: win ? "🎉 你贏了！" : "你輸了" }),
        el("div", { class: "ax-result__amount", text: (win ? "+" : "-") + money(room.wager) }),
        el("p", { class: "ax-muted", text: "你 " + money(meTotal) + "　vs　" + oppName + " " + money(oppTotal) }),
        el("div", { class: "ax-result__actions" }, [
          el("button", { class: "ax-btn-ghost", text: "返回競技場", onClick: function () { HL.router.go("arena"); } }),
          el("button", { class: "ax-btn-primary", text: "再來一場", onClick: function () { HL.router.go("vsslot", room.id); } })
        ])
      ]));
    }

    function start() {
      if (running) return;
      running = true; startBtn.setAttribute("disabled", "");
      timer = setInterval(function () {
        if (!document.body.contains(meBoard)) { clearInterval(timer); return; }
        spinNo++;
        var me = fgSpin(), op = fgSpin();
        renderBoard(meBoard, me.grid, me.winCells);
        renderBoard(opBoard, op.grid, op.winCells);
        meTotal += me.total; oppTotal += op.total;
        meTotalEl.textContent = money(meTotal); opTotalEl.textContent = money(oppTotal);
        meLast.textContent = me.total > 0 ? "+" + money(me.total) : "未中"; meLast.className = "ax-vs__spin " + (me.total >= SCORE_BET * 20 ? "ax-gold" : "ax-muted");
        opLast.textContent = op.total > 0 ? "+" + money(op.total) : "未中"; opLast.className = "ax-vs__spin " + (op.total >= SCORE_BET * 20 ? "ax-gold" : "ax-muted");
        fgEl.textContent = "FG " + spinNo + " / " + FG_SPINS;
        if (spinNo >= FG_SPINS) { clearInterval(timer); setTimeout(finish, 600); }
      }, 900);
    }
    startBtn.addEventListener("click", start);

    function side(name, av, boardEl, totalEl, lastEl, cls) {
      return el("div", { class: "ax-vs__side " + cls }, [
        el("div", { class: "ax-vs__head" }, [el("span", { class: "ax-vs__av", text: av }), el("span", { class: "ax-vs__name", text: name })]),
        boardEl,
        el("div", { class: "ax-vs__score" }, [el("small", { class: "ax-muted", text: "總分" }), totalEl, lastEl])
      ]);
    }

    return el("div", { class: "ax-duel ax-fade-in" }, [
      el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }),
      el("div", { class: "ax-duel__top" }, [
        el("div", {}, [el("div", { class: "ax-duel__title", text: "對押競技 · " + room.slot }), el("span", { class: "ax-demo-tag", text: "Demo · 雙方各跑 " + FG_SPINS + " 轉 Free Game 比分" })]),
        el("div", { class: "ax-duel__stats" }, [
          el("div", { class: "ax-stat" }, [el("small", { text: "賭注" }), el("b", { class: "ax-gold", text: money(room.wager) })]),
          el("div", { class: "ax-stat" }, [el("small", { text: "你的餘額" }), el("b", { id: "ax-duel-balance", text: money(HL.state.get().balance) })])
        ])
      ]),
      el("div", { class: "ax-arena" }, [
        el("div", { class: "ax-vs ax-vs--fg" }, [
          side("你", "👑", meBoard, meTotalEl, meLast, "me"),
          el("div", { class: "ax-vs__mid" }, [el("div", { class: "ax-vs__vs", text: "VS" }), fgEl, el("div", { class: "ax-muted", text: room.slot })]),
          side(oppName, room.host.name === "你" ? "🦊" : room.host.av, opBoard, opTotalEl, opLast, "opp")
        ]),
        el("div", { class: "ax-vs__ctl" }, [startBtn]),
        resultEl
      ])
    ]);
  }

  HL.views = HL.views || {};
  HL.views.vsslot = { render: render };
})(window);

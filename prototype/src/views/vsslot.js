/*
 * Apex Win｜對押競技（1v1 匹配對戰）
 * 流程：進房 → 尋找對手 → 匹配成功通知（玩家按「接受」）→ 對手接受（Demo 模擬）→ 進入對戰。
 * 對戰：左=你、右=對手，兩個盤面各自跑「暗影儀式 Free Game」完整流程（滾輪→中獎→連爆），
 *       跑完比總分，高者贏得賭注。無「挑戰次數」，只有押注額。
 * 註冊於 window.HL.views.vsslot。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;

  var room, root, timers;
  var FG_SPINS = 5, SCORE_BET = 10;

  function findRoom(id) { return HL.state.get().arenaRooms.filter(function (r) { return r.id === id; })[0]; }
  function clearTimers() { (timers || []).forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function backArena() { clearTimers(); HL.router.go("arena"); }
  function oppInfo() { return { name: room.host.name === "你" ? "挑戰者" : room.host.name, av: room.host.name === "你" ? "🦊" : room.host.av }; }

  function header(sub) {
    return el("div", { class: "ax-duel__top" }, [
      el("div", {}, [el("div", { class: "ax-duel__title", text: "對押競技 · " + room.slot }), el("span", { class: "ax-demo-tag", text: sub })]),
      el("div", { class: "ax-duel__stats" }, [
        el("div", { class: "ax-stat" }, [el("small", { text: "賭注" }), el("b", { class: "ax-gold", text: money(room.wager) })]),
        el("div", { class: "ax-stat" }, [el("small", { text: "你的餘額" }), el("b", { id: "ax-duel-balance", text: money(HL.state.get().balance) })])
      ])
    ]);
  }

  /* ---------- 1) 尋找對手 ---------- */
  function phaseSearching() {
    HL.dom.clear(root);
    root.appendChild(el("a", { class: "ax-duel__back", text: "‹ 取消匹配", onClick: backArena }));
    root.appendChild(header("1v1 匹配對戰"));
    root.appendChild(el("div", { class: "ax-mm" }, [
      el("div", { class: "ax-mm__spinner" }),
      el("div", { class: "ax-mm__txt", text: "尋找對手中…" }),
      el("div", { class: "ax-muted", text: "賭注 " + money(room.wager) + "　·　Demo 將自動為你媒合" })
    ]));
    later(phaseFound, 1700);
  }

  /* ---------- 2) 匹配成功 → 接受 ---------- */
  function phaseFound() {
    var opp = oppInfo();
    HL.dom.clear(root);
    root.appendChild(header("1v1 匹配對戰"));
    var countText = el("span", { text: "10" });
    var statusEl = el("div", { class: "ax-mm__status ax-muted", text: "雙方接受後開始對戰" });
    var acceptBtn = el("button", { class: "ax-btn-primary ax-mm__accept", text: "接受對戰", onClick: accept });
    var declineBtn = el("button", { class: "ax-btn-ghost", text: "拒絕", onClick: backArena });

    var meCard = el("div", { class: "ax-mm__p me" }, [el("div", { class: "ax-mm__av", text: "👑" }), el("b", { text: "你" }), el("span", { class: "ax-mm__ok", text: "" })]);
    var opCard = el("div", { class: "ax-mm__p opp" }, [el("div", { class: "ax-mm__av", text: opp.av }), el("b", { text: opp.name }), el("span", { class: "ax-mm__ok", text: "" })]);

    root.appendChild(el("div", { class: "ax-mm ax-mm--found" }, [
      el("div", { class: "ax-mm__found", text: "✅ 匹配成功！" }),
      el("div", { class: "ax-mm__vs" }, [meCard, el("div", { class: "ax-mm__vsbadge", text: "VS" }), opCard]),
      statusEl,
      el("div", { class: "ax-mm__actions" }, [declineBtn, acceptBtn]),
      el("div", { class: "ax-mm__count" }, ["⏱ ", countText, " 秒"])
    ]));

    var left = 10;
    var iv = setInterval(function () {
      if (!document.body.contains(countText)) { clearInterval(iv); return; }
      left--; countText.textContent = left;
      if (left <= 0) { clearInterval(iv); backArena(); }
    }, 1000); timers.push(iv);

    function accept() {
      clearTimers();
      acceptBtn.setAttribute("disabled", ""); declineBtn.setAttribute("disabled", "");
      meCard.querySelector(".ax-mm__ok").textContent = "✔ 已接受";
      meCard.classList.add("is-ok");
      statusEl.textContent = "等待對手接受…";
      later(function () {
        opCard.querySelector(".ax-mm__ok").textContent = "✔ 已接受";
        opCard.classList.add("is-ok");
        statusEl.textContent = "對手已接受，準備開始！";
        later(phaseGame, 900);
      }, 1100);
    }
  }

  /* ---------- 3) 對戰：左=你、右=對手，雙方各跑 FG ---------- */
  function phaseGame() {
    var opp = oppInfo();
    HL.dom.clear(root);
    root.appendChild(el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: backArena }));
    root.appendChild(header("1v1 · 雙方各跑 " + FG_SPINS + " 轉 Free Game"));

    var meBoardEl = el("div", { class: "ax-vs__board" });
    var opBoardEl = el("div", { class: "ax-vs__board" });
    var meTotalEl = el("div", { class: "ax-vs__total", text: "0" });
    var opTotalEl = el("div", { class: "ax-vs__total", text: "0" });
    var fgEl = el("b", { text: "FG 0 / " + FG_SPINS });
    var resultEl = el("div", { class: "ax-vs__result" });

    function side(name, av, boardEl, totalEl, cls) {
      return el("div", { class: "ax-vs__side " + cls }, [
        el("div", { class: "ax-vs__head" }, [el("span", { class: "ax-vs__av", text: av }), el("span", { class: "ax-vs__name", text: name })]),
        boardEl,
        el("div", { class: "ax-vs__score" }, [el("small", { class: "ax-muted", text: "總分" }), totalEl])
      ]);
    }

    root.appendChild(el("div", { class: "ax-arena" }, [
      el("div", { class: "ax-vs ax-vs--fg" }, [
        side("你", "👑", meBoardEl, meTotalEl, "me"),                 // 你永遠在左邊
        el("div", { class: "ax-vs__mid" }, [el("div", { class: "ax-vs__vs", text: "VS" }), fgEl, el("div", { class: "ax-muted", text: room.slot })]),
        side(opp.name, opp.av, opBoardEl, opTotalEl, "opp")
      ]),
      resultEl
    ]));

    var meBoard = HL.fgBoard.create(meBoardEl, { bet: SCORE_BET, onWin: function (a, t) { meTotalEl.textContent = money(t); } });
    var opBoard = HL.fgBoard.create(opBoardEl, { bet: SCORE_BET, onWin: function (a, t) { opTotalEl.textContent = money(t); } });

    var round = 0;
    function runRound() {
      if (!document.body.contains(meBoardEl)) return;
      if (round >= FG_SPINS) return finish();
      round++; fgEl.textContent = "FG " + round + " / " + FG_SPINS;
      var done = 0;
      function d() { if (++done === 2) later(runRound, 450); }
      meBoard.spin(d); opBoard.spin(d);
    }
    function finish() {
      var meTotal = meBoard.getTotal(), opTotal = opBoard.getTotal();
      var win = meTotal === opTotal ? (Math.random() < 0.5) : meTotal > opTotal;
      var st = HL.state.get();
      HL.state.set({ balance: st.balance + (win ? room.wager : -room.wager) });
      HL.shell.refreshChrome();
      room.challenges = (room.challenges || 0) + 1; room.matches = (room.matches || 0) + 1;
      if (win) room.challEdge = (room.challEdge || 0) + room.wager; else room.hostEdge = (room.hostEdge || 0) + room.wager;
      resultEl.appendChild(el("div", { class: "ax-result " + (win ? "win" : "lose") }, [
        el("div", { class: "ax-result__title", text: win ? "🎉 你贏了！" : "你輸了" }),
        el("div", { class: "ax-result__amount", text: (win ? "+" : "-") + money(room.wager) }),
        el("p", { class: "ax-muted", text: "你 " + money(meTotal) + "　vs　" + opp.name + " " + money(opTotal) }),
        el("div", { class: "ax-result__actions" }, [
          el("button", { class: "ax-btn-ghost", text: "返回競技場", onClick: backArena }),
          el("button", { class: "ax-btn-primary", text: "再匹配一場", onClick: function () { HL.router.go("vsslot", room.id); } })
        ])
      ]));
    }
    later(runRound, 600);
  }

  function render(roomId) {
    room = findRoom(roomId); timers = [];
    if (!room || !HL.fgBoard || !HL.slotEngine) {
      return el("div", { class: "ax-duel" }, [el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }), el("div", { class: "ax-panel", text: !room ? "此房間已結束。" : "遊戲引擎未載入。" })]);
    }
    root = el("div", { class: "ax-duel ax-fade-in" });
    phaseSearching();
    return root;
  }

  HL.views = HL.views || {};
  HL.views.vsslot = { render: render };
})(window);

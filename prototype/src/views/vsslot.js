/*
 * Apex Win｜對押競技（玩家開房）
 * 房主指定一款 SLOT，雙方各演示 10 局 FG，總分高者贏得賭注；
 * 輸方支付賭注給贏方。註冊於 window.HL.views.vsslot。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var rint = function (a, b) { return HL.mock.rint(a, b); };

  var room, timer;

  function findRoom(id) { return HL.state.get().arenaRooms.filter(function (r) { return r.id === id; })[0]; }
  function spinScore() { var s = rint(0, 150); if (Math.random() < 0.22) s += rint(200, 800); return s; }

  function render(roomId) {
    room = findRoom(roomId);
    if (!room) {
      return el("div", { class: "ax-duel" }, [el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }), el("div", { class: "ax-panel", text: "此房間已結束。" })]);
    }
    var oppName = room.host.name === "你" ? "挑戰者" : room.host.name;
    var meTotal = 0, oppTotal = 0, fg = 0, running = false;

    var meTotalEl = el("div", { class: "ax-vs__total", text: "0" });
    var oppTotalEl = el("div", { class: "ax-vs__total", text: "0" });
    var meSpin = el("div", { class: "ax-vs__spin ax-muted", text: "—" });
    var oppSpin = el("div", { class: "ax-vs__spin ax-muted", text: "—" });
    var fgEl = el("b", { text: "FG 0 / 10" });
    var resultEl = el("div", { class: "ax-vs__result" });

    var startBtn = el("button", { class: "ax-btn-primary", text: "開始對押競技（賭注 " + money(room.wager) + "）" });

    function finish() {
      running = false;
      var win = meTotal === oppTotal ? (Math.random() < 0.5) : meTotal > oppTotal; // 平手隨機定勝負
      if (meTotal === oppTotal) { if (win) meTotal++; else oppTotal++; meTotalEl.textContent = meTotal; oppTotalEl.textContent = oppTotal; }
      var st = HL.state.get();
      HL.state.set({ balance: st.balance + (win ? room.wager : -room.wager) });
      HL.shell.refreshChrome();
      room.challenges++; room.done = (room.done || 0) + 1; room.matches = (room.matches || 0) + 1;
      if (win) room.challEdge = (room.challEdge || 0) + room.wager; else room.hostEdge = (room.hostEdge || 0) + room.wager;
      HL.dom.clear(resultEl);
      resultEl.appendChild(el("div", { class: "ax-result " + (win ? "win" : "lose") }, [
        el("div", { class: "ax-result__title", text: win ? "🎉 你贏了！" : "你輸了" }),
        el("div", { class: "ax-result__amount", text: (win ? "+" : "-") + money(room.wager) }),
        el("p", { class: "ax-muted", text: "你 " + meTotal + " 分　vs　" + oppName + " " + oppTotal + " 分" }),
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
        if (!document.body.contains(meTotalEl)) { clearInterval(timer); return; }
        fg++;
        var ms = spinScore(), os = spinScore();
        meTotal += ms; oppTotal += os;
        meSpin.textContent = "本局 +" + ms; oppSpin.textContent = "本局 +" + os;
        meSpin.className = "ax-vs__spin " + (ms >= 200 ? "ax-gold" : "ax-muted");
        oppSpin.className = "ax-vs__spin " + (os >= 200 ? "ax-gold" : "ax-muted");
        meTotalEl.textContent = meTotal; oppTotalEl.textContent = oppTotal;
        fgEl.textContent = "FG " + fg + " / 10";
        if (fg >= 10) { clearInterval(timer); setTimeout(finish, 500); }
      }, 380);
    }
    startBtn.addEventListener("click", start);

    function side(name, av, totalEl, spinEl, cls) {
      return el("div", { class: "ax-vs__side " + cls }, [
        el("div", { class: "ax-vs__av", text: av }),
        el("div", { class: "ax-vs__name", text: name }),
        totalEl, spinEl
      ]);
    }

    return el("div", { class: "ax-duel ax-fade-in" }, [
      el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }),
      el("div", { class: "ax-duel__top" }, [
        el("div", {}, [el("div", { class: "ax-duel__title", text: "對押競技 · " + room.slot }), el("span", { class: "ax-demo-tag", text: "Demo · 雙方各 10 局 FG 比分" })]),
        el("div", { class: "ax-duel__stats" }, [
          el("div", { class: "ax-stat" }, [el("small", { text: "賭注" }), el("b", { class: "ax-gold", text: money(room.wager) })]),
          el("div", { class: "ax-stat" }, [el("small", { text: "你的餘額" }), el("b", { id: "ax-duel-balance", text: money(HL.state.get().balance) })])
        ])
      ]),
      el("div", { class: "ax-arena" }, [
        el("div", { class: "ax-vs" }, [
          side("你", "👑", meTotalEl, meSpin, "me"),
          el("div", { class: "ax-vs__mid" }, [el("div", { class: "ax-vs__vs", text: "VS" }), fgEl, el("div", { class: "ax-muted", text: room.slot })]),
          side(oppName, room.host.name === "你" ? "🦊" : room.host.av, oppTotalEl, oppSpin, "opp")
        ]),
        el("div", { class: "ax-vs__ctl" }, [startBtn]),
        resultEl
      ])
    ]);
  }

  HL.views = HL.views || {};
  HL.views.vsslot = { render: render };
})(window);

/*
 * Apex Win｜錦標賽 / Slot Race 賽事頁（限時積分賽）
 * 顯示：賽事 Hero（名稱/倒數/獎池/參賽數）＋我的排名＋即時排行榜（每秒更新）＋獎金階梯＋動作。
 * 積分來源＝全遊戲有效押注（HL.tournament 掛中央掛鉤）。註冊於 window.HL.views.tournament。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmt(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60); }
  function medal(rank) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "#" + rank; }

  function rulesModal() {
    HL.ui.modal("🏆 錦標賽玩法", [
      el("ul", { class: "ax-rules" }, [
        el("li", { text: "限時賽期內，於任一遊戲完成的有效押注（含跟注）即累積積分。" }),
        el("li", { text: "排行榜即時更新；賽末依名次自動派發獎金到「獎金錢包」。" }),
        el("li", { text: "前 8 名分得獎池：40% / 24% / 14% / 9% / 6% / 4% / 2% / 1%。" }),
        el("li", { text: "賽事循環進行，一期結束立即開新一期。" })
      ]),
      el("span", { class: "ax-demo-tag", text: "純前端 Demo · 積分與派彩為遊戲幣" })
    ]);
  }

  function render() {
    var cdEl = el("b", { class: "ax-tny__cd" });
    var poolEl = el("div", { class: "ax-tny__pool" });
    var playersEl = el("span", {});
    var myRankEl = el("b", { class: "ax-gold" });
    var myScoreEl = el("b", {});
    var myGapEl = el("small", { class: "ax-muted" });
    var boardEl = el("div", { class: "ax-tny__board" });

    function renderBoard(st) {
      HL.dom.clear(boardEl);
      st.leaderboard.slice(0, 12).forEach(function (r) {
        boardEl.appendChild(el("div", { class: "ax-tny__row" + (r.you ? " is-you" : "") + (r.rank <= 3 ? " is-top" : "") }, [
          el("span", { class: "ax-tny__rank", text: medal(r.rank) }),
          el("span", { class: "ax-tny__name", text: r.you ? "你（我）" : r.name }),
          el("span", { class: "ax-tny__score", text: money(r.score) }),
          el("span", { class: "ax-tny__prize ax-gold", text: r.prize > 0 ? money(r.prize) : "—" })
        ]));
      });
    }
    function refresh() {
      var st = HL.tournament.status();
      cdEl.textContent = fmt(st.endAt - Date.now());
      poolEl.textContent = money(st.pool);
      playersEl.textContent = "👥 " + (st.players + 1).toLocaleString();
      myRankEl.textContent = medal(st.myRank);
      myScoreEl.textContent = money(st.score) + " 分";
      var lb = st.leaderboard, me = null, above = null;
      for (var i = 0; i < lb.length; i++) { if (lb[i].you) { me = lb[i]; above = lb[i - 1] || null; break; } }
      var myPrize = st.prizeFor(st.myRank);
      myGapEl.textContent = (above ? "距上一名 " + money(above.score - me.score) + " 分" : "目前第一！") + (myPrize > 0 ? "　· 目前可得 " + money(myPrize) : "　· 衝進前 8 名分獎池");
      renderBoard(st);
    }

    var hero = el("div", { class: "ax-tny__hero" }, [
      el("div", { class: "ax-tny__heroL" }, [
        el("div", { class: "ax-hero__tag", text: "🏆 限時錦標賽 · SLOT RACE" }),
        el("h1", { class: "ax-tny__title", text: "Slots 競賽 · 100 萬獎池" }),
        el("div", { class: "ax-muted" }, ["獎池 ", poolEl, "　", playersEl])
      ]),
      el("div", { class: "ax-tny__timer" }, [el("small", { class: "ax-muted", text: "本期剩餘" }), cdEl])
    ]);

    var myCard = el("div", { class: "ax-tny__me ax-panel" }, [
      el("div", {}, [el("small", { class: "ax-muted", text: "我的名次" }), el("div", {}, [myRankEl, el("span", { text: "　" }), myScoreEl])]),
      myGapEl
    ]);

    var actions = el("div", { class: "ax-tny__actions" }, [
      el("button", { class: "ax-btn-primary", text: "🎮 前往遊玩賺積分", onClick: function () { HL.router.go("casino"); } }),
      el("button", { class: "ax-btn-ghost", text: "玩法 / 獎金階梯", onClick: rulesModal }),
      el("button", { class: "ax-btn-ghost", text: "⏱ Demo 立即結算本期", onClick: function () {
        var r = HL.tournament.settleAndCycle();
        HL.ui.modal("🏁 本期結算", [
          el("div", { class: "ax-panel" }, [
            el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "你的名次" }), el("b", { class: "ax-gold", text: "第 " + r.rank + " 名 / " + r.total }) ]),
            el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "獲得獎金" }), el("b", { class: r.prize > 0 ? "ax-gold" : "ax-muted", text: r.prize > 0 ? money(r.prize) + "（已入獎金錢包）" : "未進獎金名次" })])
          ]),
          el("span", { class: "ax-demo-tag", text: "新一期已開始 · Demo" })
        ]);
        refresh();
      } })
    ]);

    var root = el("div", { class: "ax-tourney ax-fade-in" }, [
      HL.dom.linkable(el("a", { class: "ax-link ax-tny__back", text: "‹ 返回大廳", onClick: function () { HL.router.go("lobby"); } })),
      hero, myCard,
      el("div", { class: "ax-section-title" }, [el("h2", { text: "即時排行榜" }), el("span", { class: "ax-bw__live", text: "● LIVE" })]),
      el("div", { class: "ax-tny__boardhd" }, [el("span", { text: "名次" }), el("span", { text: "玩家" }), el("span", { text: "積分" }), el("span", { text: "可得獎金" })]),
      boardEl,
      actions
    ]);

    refresh();
    var tickFn = HL.ticker.add(function () {
      if (!root.isConnected) { HL.ticker.remove(tickFn); return; }       // 離頁清除
      if (document.querySelector(".ax-modal-mask")) return;              // 浮層開啟時暫停刷新
      if (HL.tournament.viewTick) HL.tournament.viewTick();              // 觀看時推進 bot + 逾期自動結算
      refresh();
    });
    return root;
  }

  HL.views = HL.views || {};
  HL.views.tournament = { render: render };
})(window);

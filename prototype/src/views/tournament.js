/*
 * Apex Win｜錦標賽 / Slot Race 賽事頁（限時積分賽）
 * 顯示：賽事 Hero（名稱/倒數/獎池/參賽數）＋我的排名＋即時排行榜（每秒更新）＋獎金階梯＋動作。
 * 積分來源＝全遊戲有效押注（HL.tournament 掛中央掛鉤）。註冊於 window.HL.views.tournament。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var pad = HL.dom.pad; // 沿用共用 helper（見 core/dom.js）
  function fmt(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60); }
  function medal(rank) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "#" + rank; }
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  /* #85：分數的呈現由賽事的計分軸決定——金額軸走 money()（＝流水賽時逐位維持原樣），
   * 倍數軸走 x.xx×（拿 money() 呈現 12.5 倍會變成「$12」＝把倍數當錢顯示）。 */
  function sfmt(st, v) {
    if (st && st.axis && st.axis.unit === "mult") return (Math.round(v * 100) / 100).toFixed(2) + "×";
    return money(v);
  }
  // 金額軸沿用原本的「… 分」後綴（＝流水賽逐字不變）；倍數軸的「×」已在值裡，再加「分」會變成「12.50× 分」
  function unitTail(st) { return (st && st.axis && st.axis.unit === "mult") ? "" : " 分"; }

  function rulesModal() {
    var st = HL.tournament.status();
    HL.ui.modal("🏆 錦標賽玩法", [
      // ⚠️ P3 契約：翻譯只發生在「整個文字節點等於一條 key」⇒ 標籤與軸名各自成節點，不串接
      HL.ui.kv(t("本期計分方式", "本期計分方式"), t(st.axis.label, st.axis.label), { valCls: "ax-gold" }),
      HL.ui.rules([
        "限時賽期內，於任一遊戲完成的有效押注（含跟注）即累積積分。",
        "排行榜即時更新；賽末依名次自動派發獎金到「獎金錢包」。",
        "前 30 名分得獎池：第 1 名 25%、第 2 名 14%、第 3 名 9%，逐名遞減；第 11–20 名各 1.5%、第 21–30 名各 1.16%（陡頭長尾、派獎更深）。",
        "賽事循環進行，一期結束立即開新一期。"
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
    var axisEl = el("b", { class: "ax-gold" });
    var groupBar = el("div", { class: "ax-tny__groups", style: "display:flex;gap:6px;flex-wrap:wrap;margin:6px 0" });
    var curGroup = "";                 // "" ＝全站榜（未分組賽事恆為此值＝零回歸）

    /* 分組賽才出現的分頁列：每款遊戲一份榜、一份獎池。未分組時整列不生成（不佔位）。 */
    function renderGroups(st) {
      HL.dom.clear(groupBar);
      if (st.groupBy !== "game" || !st.groups.length) { groupBar.style.display = "none"; return; }
      groupBar.style.display = "flex";
      st.groups.forEach(function (k) {
        groupBar.appendChild(el("button", {
          class: k === curGroup ? "ax-btn-primary ax-btn-primary--inline" : "ax-btn-ghost",
          text: k, onClick: function () { curGroup = k; refresh(); }
        }));
      });
    }

    function renderBoard(st) {
      HL.dom.clear(boardEl);
      // S12 榜深＝付獎深（前 30 名全列）；我在圈外時補「⋯＋我的列」不失焦
      var depth = HL.tournament.SPLIT.length, rows = st.leaderboard.slice(0, depth), me = null;
      for (var i = depth; i < st.leaderboard.length; i++) if (st.leaderboard[i].you) { me = st.leaderboard[i]; break; }
      function row(r) {
        boardEl.appendChild(el("div", { class: "ax-tny__row" + (r.you ? " is-you" : "") + (r.rank <= 3 ? " is-top" : "") }, [
          el("span", { class: "ax-tny__rank", text: medal(r.rank) }),
          el("span", { class: "ax-tny__name", text: r.you ? "你（我）" : r.name }),
          el("span", { class: "ax-tny__score", text: sfmt(st, r.score) }),
          el("span", { class: "ax-tny__prize ax-gold", text: r.prize > 0 ? money(r.prize) : "—" })
        ]));
      }
      rows.forEach(row);
      if (me) {
        boardEl.appendChild(el("div", { class: "ax-tny__row" }, [
          el("span", { class: "ax-tny__rank ax-muted", text: "⋯" }),
          el("span", { class: "ax-tny__name" }), el("span", { class: "ax-tny__score" }), el("span", { class: "ax-tny__prize" })
        ]));
        row(me);
      }
    }
    function refresh() {
      var st = HL.tournament.status(curGroup);
      // 分組賽首次進頁：預設看第一組（分組賽的獎金是逐組計算的，停在全站合計榜會誤導可得獎金）
      if (st.groupBy === "game" && st.groups.length && st.groups.indexOf(curGroup) < 0) {
        curGroup = st.groups[0];
        st = HL.tournament.status(curGroup);
      }
      cdEl.textContent = fmt(st.endAt - Date.now());
      poolEl.textContent = money(st.pool);
      playersEl.textContent = "👥 " + (st.players + 1).toLocaleString();
      axisEl.textContent = t(st.axis.label, st.axis.label);
      myRankEl.textContent = medal(st.myRank);
      myScoreEl.textContent = sfmt(st, st.score) + unitTail(st);
      var lb = st.leaderboard, me = null, above = null;
      for (var i = 0; i < lb.length; i++) { if (lb[i].you) { me = lb[i]; above = lb[i - 1] || null; break; } }
      var myPrize = st.prizeFor(st.myRank);
      myGapEl.textContent = (above ? "距上一名 " + sfmt(st, above.score - me.score) + unitTail(st) : "目前第一！") + (myPrize > 0 ? "　· 目前可得 " + money(myPrize) : "　· 衝進前 " + HL.tournament.SPLIT.length + " 名分獎池");
      renderGroups(st);
      renderBoard(st);
    }

    var hero = el("div", { class: "ax-tny__hero" }, [
      el("div", { class: "ax-tny__heroL" }, [
        el("div", { class: "ax-hero__tag", text: "🏆 限時錦標賽 · SLOT RACE" }),
        el("h1", { class: "ax-tny__title", text: "Slots 競賽 · 100 萬獎池" }),
        el("div", { class: "ax-muted" }, ["獎池 ", poolEl, "　", playersEl]),
        // #85：賽事憑什麼排名現在是可宣告的，故必須寫在畫面上（玩家看得到才知道要衝什麼）
        el("div", { class: "ax-muted" }, [el("span", { text: "計分方式 " }), axisEl])
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
            HL.ui.kv("你的名次", "第 " + r.rank + " 名 / " + r.total, { valCls: "ax-gold" }),
            HL.ui.kv("獲得獎金", r.prize > 0 ? money(r.prize) + "（已入獎金錢包）" : "未進獎金名次", { valCls: r.prize > 0 ? "ax-gold" : "ax-muted" })
          ]),
          el("span", { class: "ax-demo-tag", text: "新一期已開始 · Demo" })
        ]);
        refresh();
      } })
    ]);

    var root = el("div", { class: "ax-tourney ax-fade-in" }, [
      HL.dom.linkable(el("a", { class: "ax-link ax-tny__back", text: "‹ 返回大廳", onClick: function () { HL.router.go("lobby"); } })),
      hero, myCard,
      HL.ui.sectionTitle("即時排行榜", { extras: [el("span", { class: "ax-bw__live", text: "● LIVE" })] }),
      groupBar,
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

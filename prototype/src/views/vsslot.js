/*
 * Apex Win｜Slots Battle（多人對戰，1v1 / 1v1v1 / 1v1v1v1）
 * 流程：配對/補位 → 全員接受 → 對戰（N 位玩家並排，rounds = 選的遊戲數，每輪各跑一次暗影儀式 FG）
 *       → 依模式計分（標準=最高總分／Crazy=最低總分／Terminal=最後一輪最高）→ 名次結算，贏家通吃。
 * 你永遠在最前。引擎僅暗影儀式，其他遊戲以名稱示意、跑同一 FG。註冊於 window.HL.views.vsslot。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;

  var room, root, timers;
  var SCORE_BET = 10;

  function findRoom(id) { return HL.state.get().arenaRooms.filter(function (r) { return r.id === id; })[0]; }
  function clearTimers() { (timers || []).forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function backArena() { clearTimers(); HL.router.go("arena"); }

  // 向後相容：補齊舊房間缺的 battle 欄位
  function normalize() {
    if (!room) return;
    room.players = room.players || 2;
    if (!room.games || !room.games.length) room.games = [{ title: room.slot || "暗影儀式 Shadow Ritual" }];
    room.rounds = 10; // 統一所有 Slots Battle 為 10 輪（遊戲以 games[rIdx % games.length] 循環出場）
    room.mode = room.mode || "normal";
    room.prefs = room.prefs || {};
  }
  function buildPlayers() {
    var n = room.players;
    var list = [{ name: "你", av: "👑", me: true }];
    var pool = (room.seats || []).filter(function (s) { return s && s.name !== "你"; });
    for (var i = 1; i < n; i++) { var p = pool[i - 1] || HL.mock.makeHost(); list.push({ name: p.name, av: p.av, me: false }); }
    return list;
  }
  function speed() { var p = room.prefs || {}; return p.ultra ? 0.35 : p.fast ? 0.6 : 1; }
  function modeLabel() { return room.mode === "crazy" ? "Crazy Mode" : room.mode === "terminal" ? "Terminal Mode" : "標準模式"; }
  function vsLabel() { return room.players >= 4 ? "1v1v1v1" : room.players === 3 ? "1v1v1" : "1v1"; }

  function header(sub) {
    return el("div", { class: "ax-duel__top" }, [
      el("div", {}, [el("div", { class: "ax-duel__title", text: "Slots Battle · " + vsLabel() }), el("span", { class: "ax-demo-tag", text: sub })]),
      el("div", { class: "ax-duel__stats" }, [
        el("div", { class: "ax-stat" }, [el("small", { text: "賭注" }), el("b", { class: "ax-gold", text: money(room.wager) })]),
        el("div", { class: "ax-stat" }, [el("small", { text: "你的餘額" }), el("b", { id: "ax-duel-balance", text: money(HL.state.get().balance) })])
      ])
    ]);
  }

  /* ---------- 1) 配對 / 補位 ---------- */
  function phaseSearching() {
    HL.dom.clear(root);
    root.appendChild(el("a", { class: "ax-duel__back", text: "‹ 取消", onClick: backArena }));
    root.appendChild(header(vsLabel() + " · " + room.rounds + " 輪"));
    root.appendChild(el("div", { class: "ax-mm" }, [
      el("div", { class: "ax-mm__spinner" }),
      el("div", { class: "ax-mm__txt", text: "配對中…等待玩家加入" }),
      el("div", { class: "ax-muted", text: "賭注 " + money(room.wager) + "　·　" + vsLabel() + "　·　Demo 自動補位" })
    ]));
    later(phaseFound, 1500);
  }

  /* ---------- 2) 配對成功（N 席位）→ 接受 ---------- */
  function phaseFound() {
    var players = buildPlayers();
    HL.dom.clear(root);
    root.appendChild(header(vsLabel() + " · " + room.rounds + " 輪"));
    var statusEl = el("div", { class: "ax-mm__status ax-muted", text: "全員接受後開始對戰" });
    var acceptBtn = el("button", { class: "ax-btn-primary ax-mm__accept", text: "接受對戰", onClick: accept });
    var declineBtn = el("button", { class: "ax-btn-ghost", text: "拒絕", onClick: backArena });
    var cards = players.map(function (p) {
      return el("div", { class: "ax-mm__p " + (p.me ? "me" : "opp") }, [el("div", { class: "ax-mm__av", text: p.av }), el("b", { text: p.name }), el("span", { class: "ax-mm__ok", text: "" })]);
    });
    var vsRow = [];
    cards.forEach(function (c, i) { if (i) vsRow.push(el("div", { class: "ax-mm__vsbadge", text: "VS" })); vsRow.push(c); });

    root.appendChild(el("div", { class: "ax-mm ax-mm--found" }, [
      el("div", { class: "ax-mm__found", text: "✅ 配對成功！" }),
      el("div", { class: "ax-mm__vs ax-mm__vs--multi" }, vsRow),
      statusEl,
      el("div", { class: "ax-mm__actions" }, [declineBtn, acceptBtn])
    ]));

    function accept() {
      clearTimers();
      acceptBtn.setAttribute("disabled", ""); declineBtn.setAttribute("disabled", "");
      cards[0].querySelector(".ax-mm__ok").textContent = "✔ 已接受"; cards[0].classList.add("is-ok");
      statusEl.textContent = "等待對手接受…";
      var i = 1;
      (function next() {
        if (i >= cards.length) { statusEl.textContent = "全員就緒，開始！"; later(phaseGame, 700); return; }
        cards[i].querySelector(".ax-mm__ok").textContent = "✔ 已接受"; cards[i].classList.add("is-ok"); i++;
        later(next, 500);
      })();
    }
  }

  /* ---------- 3) 對戰：N 玩家並排，每輪各跑一次 FG ---------- */
  function phaseGame() {
    var players = buildPlayers();
    var games = room.games, rounds = room.rounds, sp = speed();
    HL.dom.clear(root);
    root.appendChild(el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: backArena }));
    root.appendChild(header(vsLabel() + " · " + rounds + " 輪 · " + modeLabel()));

    var roundEl = el("b", { text: "Round 1 / " + rounds });
    var gameEl = el("span", { class: "ax-gold", text: games[0].title });
    var resultEl = el("div", { class: "ax-vs__result" });

    var sides = players.map(function (p) {
      var boardEl = el("div", { class: "ax-vs__board" });
      var totalEl = el("div", { class: "ax-vs__total", text: money(0) });
      var side = el("div", { class: "ax-vs__side " + (p.me ? "me" : "opp") }, [
        el("div", { class: "ax-vs__head" }, [el("span", { class: "ax-vs__av", text: p.av }), el("span", { class: "ax-vs__name", text: p.name })]),
        boardEl,
        el("div", { class: "ax-vs__score" }, [el("small", { class: "ax-muted", text: "總分" }), totalEl])
      ]);
      return { p: p, boardEl: boardEl, totalEl: totalEl, side: side, board: null };
    });

    var vsNodes = [];
    sides.forEach(function (s, i) {
      if (i) vsNodes.push(el("div", { class: "ax-vs__mid" }, [el("div", { class: "ax-vs__vs", text: "VS" })]));
      vsNodes.push(s.side);
    });

    var infoBar = el("div", { class: "ax-battle__info" }, [
      roundEl, el("span", { class: "ax-muted", text: "　·　" }), gameEl,
      room.mode !== "normal" ? el("span", { class: "ax-battle__mode", text: modeLabel() }) : null,
      sp < 1 ? el("span", { class: "ax-battle__fast", text: sp <= 0.35 ? "⚡⚡ 超快" : "⚡ 快速" }) : null
    ]);

    root.appendChild(el("div", { class: "ax-arena" }, [
      infoBar,
      el("div", { class: "ax-vs ax-vs--fg ax-vs--n" + sides.length }, vsNodes),
      resultEl
    ]));

    sides.forEach(function (s) {
      s.board = HL.fgBoard.create(s.boardEl, { bet: SCORE_BET, animSpeed: sp, onWin: function (a, t) { s.totalEl.textContent = money(t); } });
    });

    var roundData = []; // 每輪：各 side 累計分（對齊 sides 索引），供回放
    var rIdx = 0;
    function runRound() {
      if (!document.body.contains(sides[0].boardEl)) return;
      if (rIdx >= rounds) return finish();
      var g = games[rIdx % games.length];
      roundEl.textContent = "Round " + (rIdx + 1) + " / " + rounds;
      gameEl.textContent = g.title;
      var done = 0;
      function d() {
        if (++done < sides.length) return;
        roundData.push(sides.map(function (s) { return s.board.getTotal(); }));
        rIdx++; later(runRound, 380 * sp);
      }
      sides.forEach(function (s) { s.board.spin(d); });
    }

    function makeRec(totals, rd, win, net, winnerName) {
      return {
        ts: Date.now(), vs: vsLabel(), players: sides.length, mode: room.mode, wager: room.wager,
        seats: sides.map(function (s) { return { name: s.p.name, av: s.p.av, me: !!s.p.me }; }),
        game: games.map(function (g) { return g.title; }).join(" / "),
        totals: totals, rounds: rd, win: win, net: net, myTotal: totals[0], winnerName: winnerName
      };
    }
    // 共用：依分數渲染名次 + 結算卡
    function renderResult(totals, lastDelta, win, net, rec) {
      var rank = sides.map(function (s, i) { return { i: i, p: s.p, total: totals[i], last: lastDelta[i] }; });
      var metric = function (o) { return room.mode === "terminal" ? o.last : o.total; };
      rank.sort(function (a, b) { return room.mode === "crazy" ? metric(a) - metric(b) : metric(b) - metric(a); });
      var sum = HL.arenaStats ? HL.arenaStats.summary() : null;
      var standRows = rank.map(function (o, idx) {
        return el("div", { class: "ax-stand__row" + (o.i === 0 ? " me" : "") }, [
          el("span", { class: "ax-stand__rk", text: "#" + (idx + 1) }),
          el("span", { class: "ax-stand__av", text: o.p.av }),
          el("span", { class: "ax-stand__nm", text: o.p.name }),
          el("b", { class: idx === 0 ? "ax-gold" : "ax-muted", text: money(room.mode === "terminal" ? o.last : o.total) })
        ]);
      });
      resultEl.appendChild(HL.ui.resultBlock(win, win ? "🏆 你贏了！" : "你輸了", (net >= 0 ? "+" : "-") + money(Math.abs(net)), [
        room.mode !== "normal" ? el("p", { class: "ax-muted", text: room.mode === "crazy" ? "Crazy Mode：總分最低者獲勝" : "Terminal Mode：最後一輪決勝" }) : null,
        HL.auth && HL.auth.backend() && HL.auth.user() ? el("p", { class: "ax-muted", text: "🔒 伺服器結算（防作弊）" }) : null,
        el("div", { class: "ax-stand" }, standRows),
        sum ? el("p", { class: "ax-muted ax-result__career", text: "生涯 " + sum.wins + " 勝 " + sum.losses + " 敗 · 勝率 " + sum.winRate + "% · 累積 " + (sum.profit >= 0 ? "+" : "-") + money(Math.abs(sum.profit)) }) : null,
        el("div", { class: "ax-result__actions ax-result__actions--3" }, [
          el("button", { class: "ax-btn-ghost", text: "看過程", onClick: function () { if (HL.arenaStats) HL.arenaStats.replay(rec); } }),
          el("button", { class: "ax-btn-ghost", text: "返回競技場", onClick: backArena }),
          el("button", { class: "ax-btn-primary", text: "再來一場", onClick: function () { HL.router.go("vsslot", room.id); } })
        ])
      ], { share: { game: "拉霸對戰 Slots Battle" } }));
    }
    function bumpRoom(win) {
      room.challenges = (room.challenges || 0) + 1; room.matches = (room.matches || 0) + 1;
      if (win) room.challEdge = (room.challEdge || 0) + room.wager; else room.hostEdge = (room.hostEdge || 0) + room.wager;
    }
    function lastDeltas(totals, rd) {
      var last = rd[rd.length - 1] || totals, prev = rd.length > 1 ? rd[rd.length - 2] : sides.map(function () { return 0; });
      return totals.map(function (_, i) { return last[i] - prev[i]; });
    }
    // Demo / 降級：前端結算
    function finishLocal() {
      var totals = sides.map(function (s) { return s.board.getTotal(); });
      var lastDelta = lastDeltas(totals, roundData);
      var rank = sides.map(function (s, i) { return { i: i, total: totals[i], last: lastDelta[i] }; });
      var metric = function (o) { return room.mode === "terminal" ? o.last : o.total; };
      rank.sort(function (a, b) { return room.mode === "crazy" ? metric(a) - metric(b) : metric(b) - metric(a); });
      var win = rank[0].i === 0, net = win ? room.wager * (sides.length - 1) : -room.wager;
      HL.state.set({ balance: HL.state.get().balance + net }); HL.shell.refreshChrome();
      if (HL.liveStats) HL.liveStats.record("Slots Battle", room.wager, win ? room.wager * sides.length : 0);
      bumpRoom(win);
      var rec = makeRec(totals, roundData, win, net, sides[rank[0].i].p.name);
      if (!room.mine && HL.arenaStats && HL.arenaStats.record) HL.arenaStats.record(rec);
      renderResult(totals, lastDelta, win, net, rec);
    }
    function finish() {
      var memberMode = HL.auth && HL.auth.backend() && HL.auth.user();
      if (!memberMode) return finishLocal();
      // 會員：伺服器決定分數/勝負/餘額（防作弊）
      HL.api.playBattle({
        wager: room.wager, players: sides.length, mode: room.mode, rounds: rounds,
        roster: sides.map(function (s) { return { name: s.p.name, av: s.p.av }; }),
        game: games.map(function (g) { return g.title; }).join(" / ")
      }).then(function (R) {
        if (!R || !R.seats) return finishLocal(); // RPC 未部署 / 失敗 → 前端結算（不破壞）
        var totals = sides.map(function (_, i) { return (R.seats[i] && +R.seats[i].total) || 0; });
        sides.forEach(function (s, i) { s.totalEl.textContent = money(totals[i]); }); // 盤面顯示收斂到伺服器分數
        var rd = [];
        for (var r = 0; r < rounds; r++) rd.push(sides.map(function (_, i) { return (R.seats[i] && +R.seats[i].rounds[r]) || 0; }));
        var win = !!R.win, net = +R.net, winnerName = (sides[R.winnerIdx] && sides[R.winnerIdx].p.name) || "—";
        var rec = makeRec(totals, rd, win, net, winnerName);
        // 餘額 + 戰績以伺服器為準（伺服器已原子更新 profiles + 寫 battle_history）
        var oldHist = (HL.state.get().arenaStats && HL.state.get().arenaStats.history) || [];
        HL.state.set({ balance: +R.balance, arenaStats: Object.assign({ history: [rec].concat(oldHist).slice(0, 30) }, R.stats) });
        HL.shell.refreshChrome();
        if (HL.liveStats) HL.liveStats.record("Slots Battle", room.wager, win ? room.wager + net : 0); // 伺服器結算值
        bumpRoom(win);
        renderResult(totals, lastDeltas(totals, rd), win, net, rec);
      });
    }
    later(runRound, 500);
  }

  function render(roomId) {
    // 子母畫面播放中又回到同一場對戰 → 取回 PiP 遊戲、重建外框
    if (HL.gameFrame && HL.gameFrame.resumeFrame) { var resumed = HL.gameFrame.resumeFrame("vsslot:" + roomId); if (resumed) return resumed; }
    room = findRoom(roomId); timers = [];
    if (!room || !HL.fgBoard || !HL.slotEngine) {
      return el("div", { class: "ax-duel" }, [el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }), el("div", { class: "ax-panel", text: !room ? "此對戰已結束。" : "遊戲引擎未載入。" })]);
    }
    normalize();
    root = el("div", { class: "ax-duel ax-fade-in" });
    phaseSearching();
    // 套入遊戲外框公版（全螢幕/劇院/子母畫面）
    return HL.gameFrame ? HL.gameFrame.wrap(root, { title: "Slots Battle · " + vsLabel(), provider: "Apex Arena", key: "vsslot:" + roomId, maxWidth: "1180px" }) : root;
  }

  HL.views = HL.views || {};
  HL.views.vsslot = { render: render };
})(window);

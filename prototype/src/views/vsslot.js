/*
 * Apex Win｜Slots Battle（多人對戰，1v1 / 1v1v1 / 1v1v1v1）
 * 流程：配對/補位 → 全員接受 → 對戰（N 位玩家並排，rounds = 選的遊戲數，每輪各跑一次暗影儀式 FG）
 *       → 依模式計分（標準=最高總分／Crazy=最低總分／Terminal=最後一輪最高）→ 名次結算，贏家通吃。
 * 你永遠在最前。引擎僅暗影儀式，其他遊戲以名稱示意、跑同一 FG。註冊於 window.HL.views.vsslot。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var isNode = typeof module !== "undefined" && module.exports;

  // ===================== 純數學區（PvP 名次/勝負/派彩·無 DOM，node 與瀏覽器同一份）=====================
  // Slots Battle 是 N 人零和對戰：各席位以同一 fgBoard 引擎獨立抽樣（iid）跑 10 輪 FG，
  // 依模式比分決名次、贏家通吃。你恆為索引 0。
  //   standard(normal) 最高總分勝 / crazy 最低總分勝 / terminal 最後一輪增量最高勝。
  // 公平性＝零和 + 對稱：分布相同 ⇒ P(你#1)=1/N ⇒ 期望 net = (1/N)·wager·(N-1) − ((N-1)/N)·wager = 0（demo 無抽水）。
  /* ⚠️ 模式語意（排名用哪個量、方向、給玩家看的勝負條件）**不在這裡定義**——
   * 它住在 core/battle-mode.js，因為大廳/戰績/回放是開站即載、而本檔是 #110 延遲載入：
   * 規則若定義在本檔，那三個表面在「還沒載入對戰本體」時就取不到，會靜默退回錯的排名
   * （2026-08-21 實測過的真實 bug：回放在 crazy/terminal 局把輸家標成領先）。本檔只是消費者。 */
  var BM = isNode ? require("../core/battle-mode.js") : (global.HL && global.HL.battleMode);
  var CORE = {
    MODES: BM.MODES,
    metricOf: function (mode, e) { return BM.metricOf(mode, e); },
    rankBy: function (mode, entries) { return BM.rankBy(mode, entries); },
    // 結算一場：totals/lastDeltas 皆對齊席位索引；myIdx 預設 0（你）。回傳 {win,net,winnerIdx,order}
    resolve: function (mode, totals, lastDeltas, wager, myIdx) {
      myIdx = myIdx || 0;
      var n = totals.length;
      var entries = totals.map(function (t, i) { return { i: i, total: t, last: (lastDeltas && lastDeltas[i]) || 0 }; });
      var order = CORE.rankBy(mode, entries);
      var winnerIdx = order[0].i;
      var win = winnerIdx === myIdx;
      var net = win ? wager * (n - 1) : -wager; // 贏家通吃：贏 → 收其餘 N−1 份注、輸 → 付 1 份注（全桌 net 和恆為 0＝零和）
      return { win: win, net: net, winnerIdx: winnerIdx, order: order.map(function (o) { return o.i; }) };
    }
  };
  if (isNode) { module.exports = { vsslot: CORE }; return; }
  HL.vsslot = CORE;

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 已於上方提前返回）=====================
  var el = HL.dom.el;
  var money = HL.dom.money;

  var room, root, timers;
  var SCORE_BET = 10;

  function findRoom(id) { return HL.state.get().arenaRooms.filter(function (r) { return r.id === id; })[0]; }
  function clearTimers() { (timers || []).forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function backArena() { clearTimers(); HL.router.go("arena"); }

  /* ---- 賭注預扣（escrow）｜2026-08-20 手感巡檢 high · 船長裁定「先做純前端能做的那半」-------
   * 【缺陷】舊版**全場都沒有硬性 commit**：接受配對不預扣，只有 finish() 才動餘額（贏 +wager×(N−1)、
   *   輸 −wager），而對戰畫面又大方擺著「‹ 返回競技場」⇒ **落後就走、零成本逃單**，
   *   等於玩家永遠只在會贏的那些局結算＝這個玩法的零和前提被破壞。
   * 【純前端能做的那半】接受配對的當下就把賭注押進 escrow（餘額立刻 −wager），結算時付回
   *   `wager + net`（淨效果與舊版相同）；中途離開＝棄局，escrow 不退還並記一筆真實的敗局。
   * 【仍待伺服器的那半】多人真站要的是**伺服器端預扣與仲裁**（同 #104/#105 的形狀）——
   *   本機 escrow 只能約束自己這一端，對手若也逃單前端無從得知。已在 CONTROL/BACKLOG 記明。 */
  var escrow = 0;
  function escrowTake(amount) {
    escrow = amount;
    HL.state.set({ balance: HL.state.get().balance - amount });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }
  function escrowSettle(payout) {                 // payout＝贏家通吃的總額（輸＝0）
    escrow = 0;
    if (payout) { HL.state.set({ balance: HL.state.get().balance + payout }); }
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }
  function leaveBattle() {                         // 對戰進行中按返回＝棄局
    if (escrow > 0) {
      var lost = escrow;
      escrow = 0;                                  // 已預扣、不退還
      if (HL.liveStats) HL.liveStats.record("Slots Battle", lost, 0);   // 據實記一筆敗局（餘額已扣）
      HL.ui.toast("已棄局，賭注 " + HL.dom.money(lost) + " 不退還", "warn");
    }
    backArena();
  }

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
    root.appendChild(HL.dom.linkable(el("a", { class: "ax-duel__back", text: "‹ 取消", onClick: backArena })));
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
      // #86 負責任博弈：對戰押注前閘（賭注＝room.wager，一接受即進入零和結算）。未設限時恆真＝零回歸。
      if (HL.rg && !HL.rg.check(room.wager)) return;
      if (room.wager > HL.state.get().balance) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      escrowTake(room.wager);   // 硬性 commit：接受的當下錢就離開錢包（見檔頭 escrow 註記）
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
    root.appendChild(HL.dom.linkable(el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: leaveBattle })));
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

    /* 家族「錯的真相來源」（2026-08-20 手感巡檢 high · 純前端那半）：
     * 【缺陷】會員模式下 10 輪的分數是**客端 RNG** 演出來的，勝負與餘額卻由伺服器**另一組 RNG**
     *   決定，最後一刻整批覆蓋 ⇒ 玩家看的過程與結果毫無因果（看著自己領先卻被判輸）。
     * 【純前端能做的那半】把 RPC 從「結算時才呼叫」提前到「開打前呼叫」：伺服器結果先到，
     *   逐輪的計分板改為**揭曉伺服器的那一輪分數**（轉輪動畫仍在，但它不再冒充分數的來源），
     *   結算沿用同一份結果、不再有事後覆蓋。RPC 未部署/失敗 → 原樣退回純前端結算（零回歸）。
     * 【仍待伺服器的那半】要讓轉輪的符號本身也對得上分數，得由伺服器下發盤面/種子讓客端重演。 */
    var SRV = null;
    var memberMode = !!(HL.auth && HL.auth.backend() && HL.auth.user());
    sides.forEach(function (s) {
      s.board = HL.fgBoard.create(s.boardEl, {
        bet: SCORE_BET, animSpeed: sp,
        noPopup: memberMode,                 // 伺服器模式：不彈客端分數（那不是最終分）
        onWin: function (a, t) { if (!SRV) s.totalEl.textContent = money(t); }
      });
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
        if (SRV) {   // 揭曉伺服器的這一輪分數（累計）＝計分板與最終結果同源
          sides.forEach(function (s, i) {
            var cum = (SRV.seats[i] && +SRV.seats[i].rounds[rIdx]) || 0;
            s.totalEl.textContent = money(cum);
          });
          roundData.push(sides.map(function (_, i) { return (SRV.seats[i] && +SRV.seats[i].rounds[rIdx]) || 0; }));
        } else {
          roundData.push(sides.map(function (s) { return s.board.getTotal(); }));
        }
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
      var rank = CORE.rankBy(room.mode, sides.map(function (s, i) { return { i: i, p: s.p, total: totals[i], last: lastDelta[i] }; })); // 名次＝純數學同一份 CORE.rankBy
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
      var R = CORE.resolve(room.mode, totals, lastDelta, room.wager, 0); // 勝負/派彩＝純數學同一份 CORE.resolve（你恆為索引 0）
      var win = R.win, net = R.net;
      escrowSettle(win ? room.wager * sides.length : 0);   // escrow 已扣 wager ⇒ 贏家通吃付回全桌注（淨效果同 net）
      if (HL.liveStats) HL.liveStats.record("Slots Battle", room.wager, win ? room.wager * sides.length : 0);
      bumpRoom(win);
      var rec = makeRec(totals, roundData, win, net, sides[R.winnerIdx].p.name);
      if (!room.mine && HL.arenaStats && HL.arenaStats.record) HL.arenaStats.record(rec);
      renderResult(totals, lastDelta, win, net, rec);
    }
    function finish() {
      if (!SRV) return finishLocal();   // 純前端模式，或 RPC 未部署/失敗（開打前已試過）
      (function (R) {
        var totals = sides.map(function (_, i) { return (R.seats[i] && +R.seats[i].total) || 0; });
        sides.forEach(function (s, i) { s.totalEl.textContent = money(totals[i]); }); // 盤面顯示收斂到伺服器分數
        var rd = [];
        for (var r = 0; r < rounds; r++) rd.push(sides.map(function (_, i) { return (R.seats[i] && +R.seats[i].rounds[r]) || 0; }));
        var win = !!R.win, net = +R.net, winnerName = (sides[R.winnerIdx] && sides[R.winnerIdx].p.name) || "—";
        var rec = makeRec(totals, rd, win, net, winnerName);
        // 餘額 + 戰績以伺服器為準（伺服器已原子更新 profiles + 寫 battle_history）
        var oldHist = (HL.state.get().arenaStats && HL.state.get().arenaStats.history) || [];
        escrow = 0;   // 伺服器的 R.balance 是權威值（已含本局結算）⇒ 這裡只清 escrow 標記，不得再重複加
        HL.state.set({ balance: +R.balance, arenaStats: Object.assign({ history: [rec].concat(oldHist).slice(0, 30) }, R.stats) });
        HL.shell.refreshChrome();
        if (HL.liveStats) HL.liveStats.record("Slots Battle", room.wager, win ? room.wager + net : 0); // 伺服器結算值
        bumpRoom(win);
        renderResult(totals, lastDeltas(totals, rd), win, net, rec);
      })(SRV);
    }
    /* 開打前先向伺服器要結果（會員模式）。拿不到就照舊純前端演＋純前端結算＝零回歸。 */
    if (!memberMode) { later(runRound, 500); }
    else {
      resultEl.appendChild(el("div", { class: "ax-muted", text: "連線對戰伺服器…" }));
      HL.api.playBattle({
        wager: room.wager, players: sides.length, mode: room.mode, rounds: rounds,
        roster: sides.map(function (s) { return { name: s.p.name, av: s.p.av }; }),
        game: games.map(function (g) { return g.title; }).join(" / ")
      }).then(function (R) {
        if (R && R.seats) SRV = R;
        HL.dom.clear(resultEl); later(runRound, 300);
      }).catch(function () { HL.dom.clear(resultEl); later(runRound, 300); });
    }
  }

  function render(roomId) {
    // 子母畫面播放中又回到同一場對戰 → 取回 PiP 遊戲、重建外框
    if (HL.gameFrame && HL.gameFrame.resumeFrame) { var resumed = HL.gameFrame.resumeFrame("vsslot:" + roomId); if (resumed) return resumed; }
    room = findRoom(roomId); timers = [];
    escrow = 0;   // 新進場＝沒有任何在途賭注（若上一場是從殼層導航離開，錢已扣、這裡只是清標記）
    if (!room || !HL.fgBoard || !HL.slotEngine) {
      return el("div", { class: "ax-duel" }, [HL.dom.linkable(el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } })), el("div", { class: "ax-panel", text: !room ? "此對戰已結束。" : "遊戲引擎未載入。" })]);
    }
    normalize();
    root = el("div", { class: "ax-duel ax-fade-in" });
    phaseSearching();
    // 套入遊戲外框公版（全螢幕/劇院/子母畫面）
    return HL.gameFrame ? HL.gameFrame.wrap(root, { title: "Slots Battle · " + vsLabel(), provider: "Apex Arena", key: "vsslot:" + roomId, maxWidth: "1180px" }) : root;
  }

  HL.views = HL.views || {};
  HL.views.vsslot = { render: render };
})(typeof window !== "undefined" ? window : this);

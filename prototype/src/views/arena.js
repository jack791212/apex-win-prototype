/*
 * Apex Win｜競技場（本次 Demo 核心）
 * 上方：官方對戰池橫幅（聯盟 vs 部落，定期輪換，非玩家開房）。
 * 下方：玩家開房擂台（格狀卡片，類似遊戲館排版）。
 * 開房類型：賞金局（翻牌 / 踩地雷）、對押競技（指定 SLOT 比分）。
 * 註冊於 window.HL.views.arena。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var rint = function (a, b) { return HL.mock.rint(a, b); };

  var filter = "all"; // all | bounty | vsslot
  var gridEl, tabsEl;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtLeft(sec) {
    if (sec >= 3600) return Math.floor(sec / 3600) + "時" + pad(Math.floor((sec % 3600) / 60)) + "分";
    return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60);
  }
  function seg(options, current, onPick) {
    var wrap = el("div", { class: "ax-seg" });
    options.forEach(function (o) {
      wrap.appendChild(el("button", {
        class: "ax-seg-btn" + (o.v === current ? " is-on" : ""), text: o.t,
        onClick: function () { onPick(o.v); Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove("is-on"); }); this.classList.add("is-on"); }
      }));
    });
    return wrap;
  }

  /* ---------- 房間卡 ---------- */
  // 房主 vs 挑戰者 收益熱度條
  function heatBar(r) {
    var h = r.hostEdge || 0, c = r.challEdge || 0, tot = h + c;
    var hp = tot ? Math.round((h / tot) * 100) : 50;
    var label = hp >= 58 ? "房主優勢" : hp <= 42 ? "挑戰者火熱" : "勢均力敵";
    return el("div", { class: "ax-heat" }, [
      el("div", { class: "ax-heat__labels" }, [
        el("span", { class: "ax-gold", text: "房主 " + hp + "%" }),
        el("span", { class: "ax-muted", text: label }),
        el("span", { class: "ax-red", text: (100 - hp) + "% 挑戰者" })
      ]),
      el("div", { class: "ax-heat__bar" }, [el("i", { style: "width:" + hp + "%" })])
    ]);
  }

  function roomCard(r) { return r.type === "bounty" ? bountyCard(r) : battleCard(r); }

  function bountyCard(r) {
    var sub = HL.mock.roomGames[r.game].name + " · " + HL.mock.volatility[r.vol].name;
    return el("div", { class: "ax-room-card is-bounty" + (r.mine ? " is-mine" : ""), "data-room-id": r.id, onClick: function () { r.mine ? myRoomStatusModal(r) : enterRoom(r); } }, [
      el("div", { class: "ax-room-card__top" }, [
        el("span", { class: "ax-room-card__type", text: (r.mine ? "我的 · " : "") + "賞金局" }),
        el("span", { class: "ax-room-card__time" }, ["⏱ ", el("span", { "data-room-time": r.id, text: fmtLeft(r.endsInSec) })])
      ]),
      el("div", { class: "ax-room-card__icon", text: r.game === "flip" ? "🃏" : "💣" }),
      el("div", { class: "ax-room-card__title", text: HL.mock.roomGames[r.game].name + "賞金" }),
      el("div", { class: "ax-room-card__sub", text: sub }),
      el("div", { class: "ax-room-card__prize" }, [el("small", { class: "ax-muted", text: "賞金池" }), el("b", { class: "ax-gold", text: money(r.prizePool) })]),
      heatBar(r),
      el("div", { class: "ax-room-card__host" }, [
        el("span", { class: "ax-room-card__av", text: r.host.av }),
        el("div", {}, [el("div", { class: "ax-room-card__hn", text: r.host.name }), el("small", { class: "ax-muted", text: "發起挑戰" })])
      ]),
      el("div", { class: "ax-room-card__foot" }, [
        el("span", { class: "ax-muted ax-rc-done", text: "挑戰次數 " + (r.done || 0) + "/" + r.plays }),
        r.mine
          ? el("button", { class: "ax-btn-join", text: "我的房間", disabled: "", onClick: function (e) { e.stopPropagation(); } })
          : el("button", { class: "ax-btn-join", text: "挑戰", onClick: function (e) { e.stopPropagation(); enterRoom(r); } })
      ])
    ]);
  }

  function vsTag(r) { return (r.players || 2) >= 4 ? "1v1v1v1" : (r.players || 2) === 3 ? "1v1v1" : "1v1"; }
  function prefIcons(r) {
    var p = r.prefs || {}, arr = [];
    if (p.ultra) arr.push("⚡⚡"); else if (p.fast) arr.push("⚡");
    if (p.priv) arr.push("🔒");
    if (p.sponsored) arr.push("🤝");
    return arr;
  }
  // 席位列：已填=頭像方塊、空位=「+」，以 ⚔ 分隔
  function seatRow(r) {
    var seats = r.seats || [], n = r.players || 2, nodes = [];
    for (var i = 0; i < n; i++) {
      if (i) nodes.push(el("span", { class: "ax-vsx", text: "⚔" }));
      var s = seats[i];
      nodes.push(s ? el("div", { class: "ax-seat filled" + (s.name === "你" ? " me" : ""), title: s.name }, [el("span", { text: s.av })]) : el("div", { class: "ax-seat empty", text: "+" }));
    }
    return el("div", { class: "ax-seat-grid" }, nodes);
  }
  function battleCard(r) {
    var g0 = (r.games && r.games[0]) || { title: r.slot || "暗影儀式", c1: "#3a1e6e", c2: "#160a2a" };
    var filled = (r.seats || []).filter(Boolean).length;
    var canJoin = filled < (r.players || 2) && !(r.prefs && r.prefs.priv);
    var pis = prefIcons(r);
    return el("div", { class: "ax-room-card is-vs is-battle" + (r.mine ? " is-mine" : ""), "data-room-id": r.id, onClick: function () { canJoin ? enterRoom(r) : battleInfoModal(r); } }, [
      el("div", { class: "ax-room-card__top" }, [
        el("span", { class: "ax-room-card__type", text: "Slots Battle · " + vsTag(r) }),
        el("span", { class: "ax-room-card__time" }, ["⏱ ", el("span", { "data-room-time": r.id, text: fmtLeft(r.endsInSec) })])
      ]),
      el("div", { class: "ax-room-card__icon", style: "background:linear-gradient(160deg," + g0.c1 + "," + g0.c2 + ")", text: "🎰" }),
      el("div", { class: "ax-room-card__title", text: g0.title + (r.games && r.games.length > 1 ? "  +" + (r.games.length - 1) : "") }),
      el("div", { class: "ax-room-card__sub" }, [
        el("span", { text: (r.rounds || 1) + " 輪 · " + vsTag(r) }),
        (r.mode && r.mode !== "normal") ? el("span", { class: "ax-room-card__mode", text: r.mode === "crazy" ? "Crazy" : "Terminal" }) : null
      ]),
      el("div", { class: "ax-room-card__prize" }, [el("small", { class: "ax-muted", text: "賭注" }), el("b", { class: "ax-gold", text: money(r.wager) })]),
      seatRow(r),
      el("div", { class: "ax-room-card__foot" }, [
        el("span", { class: "ax-muted ax-rc-done" }, [
          pis.length ? el("span", { class: "ax-prefs", text: pis.join(" ") + "　" }) : null,
          el("span", { text: filled + "/" + (r.players || 2) + " 玩家" })
        ]),
        r.mine
          ? el("button", { class: "ax-btn-join", text: "我的對戰", disabled: "", onClick: function (e) { e.stopPropagation(); } })
          : canJoin
            ? el("button", { class: "ax-btn-join", text: "加入 " + money(r.wager), onClick: function (e) { e.stopPropagation(); enterRoom(r); } })
            : el("button", { class: "ax-btn-ghost ax-btn-watch", text: "👁 觀戰", onClick: function (e) { e.stopPropagation(); battleInfoModal(r); } })
      ])
    ]);
  }
  function battleInfoModal(r) {
    var pis = prefIcons(r);
    HL.ui.modal("Slots Battle · " + vsTag(r), [
      el("div", { class: "ax-panel" }, rowsKV([
        ["人數", vsTag(r) + "（" + (r.players || 2) + " 人）"],
        ["遊戲 / 輪數", (r.games || []).map(function (g) { return g.title; }).join("、") + " · " + (r.rounds || 1) + " 輪"],
        ["模式", r.mode === "crazy" ? "Crazy Mode（最低分勝）" : r.mode === "terminal" ? "Terminal Mode（末輪決勝）" : "標準模式"],
        ["賭注", money(r.wager)],
        ["偏好", pis.length ? pis.join(" ") : "—"]
      ])),
      el("p", { class: "ax-muted", text: r.prefs && r.prefs.priv ? "🔒 私密房：僅限分享連結加入（Demo 觀戰）。" : "此房已滿，僅供觀戰（Demo）。" }),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料" })
    ]);
  }

  function enterRoom(r) {
    if (r.type === "bounty") HL.router.go("bounty", r.id);
    else HL.router.go("vsslot", r.id);
  }

  function visibleRooms() {
    return HL.state.get().arenaRooms.filter(function (r) {
      return filter === "all" ? true : filter === "mine" ? !!r.mine : r.type === filter;
    });
  }
  function renderGrid() {
    if (!gridEl) return;
    HL.dom.clear(gridEl);
    var rooms = visibleRooms();
    if (!rooms.length) { gridEl.appendChild(el("p", { class: "ax-muted", text: "目前沒有房間，按「開房」發起第一場挑戰！" })); return; }
    rooms.forEach(function (r) { gridEl.appendChild(roomCard(r)); });
  }

  /* ---------- 我的房間：狀態 / 結算 ---------- */
  function rowsKV(pairs) {
    return pairs.map(function (p) {
      return el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: p[0] }), el("b", { text: p[1] })]);
    });
  }
  function myRoomStatusModal(r) {
    var net = r.type === "bounty" ? (r.prizePool - r.deposit) : (r.net || 0);
    var info = r.type === "bounty"
      ? rowsKV([["玩法", "賞金局 · " + HL.mock.roomGames[r.game].name], ["賞金池", money(r.prizePool)], ["目前淨利", (net >= 0 ? "+" : "-") + money(Math.abs(net))], ["剩餘次數", r.playsLeft + " / " + r.plays], ["挑戰人次", String(r.challenges)]])
      : rowsKV([["玩法", "對押競技 · " + r.slot], ["賭注 / 場", money(r.wager)], ["目前淨利", (net >= 0 ? "+" : "-") + money(Math.abs(net))], ["對戰場次", String(r.matches || 0)], ["挑戰人次", String(r.challenges)]]);
    HL.ui.modal("我的房間 · 進行中", [
      el("p", { class: "ax-muted", text: "你的房間無法自行挑戰，正在等待玩家挑戰…結束時會自動結算回報。" }),
      el("div", { class: "ax-panel" }, info),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料" })
    ]);
  }
  // 過程明細（看過程）：列出每一場挑戰的結果
  function processModal(r, kind) {
    var rows = (r.log || []).slice().reverse().map(function (e) {
      if (kind === "bounty") {
        var hostNet = e.bet - e.win;
        return el("div", { class: "ax-row" }, [el("span", { class: "av", text: (e.name || "?").charAt(0) }), el("span", { class: "nm", text: e.name }), el("span", { class: "ax-muted", text: "押" + money(e.bet) + (e.flip ? "" : " · x" + e.mult) }), el("b", { class: hostNet >= 0 ? "ax-green" : "ax-red", text: (hostNet >= 0 ? "+" : "-") + money(Math.abs(hostNet)) })]);
      }
      return el("div", { class: "ax-row" }, [el("span", { class: "av", text: (e.name || "?").charAt(0) }), el("span", { class: "nm", text: e.name }), el("span", { class: "ax-muted", text: "你 " + e.my + " : " + e.opp + " 對手" }), el("b", { class: e.win ? "ax-green" : "ax-red", text: e.win ? "你勝" : "對手勝" })]);
    });
    HL.ui.modal("房間過程明細（共 " + (r.log || []).length + " 場）", [
      el("p", { class: "ax-muted", text: kind === "bounty" ? "每一位挑戰者的押注與結果（金額為房主淨收）：" : "每一場 1v1 對戰的比分與勝負：" }),
      el("div", { class: "ax-panel", style: "max-height:50vh;overflow:auto" }, rows.length ? rows : [el("p", { class: "ax-muted", text: "本場無人挑戰。" })]),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料" })
    ]);
  }
  function settlement(r, net, kind, onDone) {
    var up = net >= 0;
    var info = kind === "bounty"
      ? rowsKV([["投入押金", money(r.deposit)], ["平台開房費", money(r.openFee || 0)], ["取回賞金池", money(r.prizePool)], ["總挑戰人次", String(r.challenges)]])
      : rowsKV([["賭注 / 場", money(r.wager)], ["對戰場次", String(r.matches || 0)], ["總挑戰人次", String(r.challenges)]]);
    var ref = HL.ui.modal("我的房間結算 · " + (kind === "bounty" ? "賞金局" : "對押競技"), [
      el("div", { class: "ax-result " + (up ? "win" : "lose") }, [
        el("div", { class: "ax-result__title", text: up ? "押金漲了！" : "押金賠了" }),
        el("div", { class: "ax-result__amount", text: (up ? "+" : "-") + money(Math.abs(net)) })
      ]),
      el("div", { class: "ax-panel" }, info),
      el("div", { class: "ax-result__actions" }, [
        el("button", { class: "ax-btn-ghost", text: "看過程", onClick: function () { processModal(r, kind); } }),
        el("button", { class: "ax-btn-primary", text: "知道了", onClick: function () { ref.close(); if (onDone) onDone(); } })
      ]),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料" })
    ]);
  }

  /* ---------- 對押競技：玩家生涯戰績 + 逐局回放 ---------- */
  function defStats() { return { matches: 0, wins: 0, losses: 0, profit: 0, streak: 0, best: 0, bigWin: 0, hostNet: 0, history: [] }; }
  // 記錄一場「主動挑戰」的對戰結果（由 vsslot.finish() 呼叫）
  function statRecord(rec) {
    var s = HL.state.get().arenaStats || defStats();
    s.matches++;
    if (rec.win) { s.wins++; s.streak = s.streak >= 0 ? s.streak + 1 : 1; }
    else { s.losses++; s.streak = s.streak <= 0 ? s.streak - 1 : -1; }
    if (s.streak > s.best) s.best = s.streak;
    s.profit += rec.net;
    if (rec.net > s.bigWin) s.bigWin = rec.net;
    s.history = [rec].concat(s.history).slice(0, 30);
    HL.state.set({ arenaStats: s });
    if (HL.api && HL.api.recordBattle) HL.api.recordBattle(rec); // 逐場入庫（真會員模式才寫，Demo 為 no-op）
  }
  function statSummary() {
    var s = HL.state.get().arenaStats || defStats();
    var m = s.matches || 0;
    return {
      matches: m, wins: s.wins || 0, losses: s.losses || 0,
      winRate: m ? Math.round((s.wins || 0) / m * 100) : 0,
      profit: s.profit || 0, streak: s.streak || 0, best: s.best || 0,
      bigWin: s.bigWin || 0, hostNet: s.hostNet || 0, history: s.history || []
    };
  }
  function statTile(label, val, cls) {
    return el("div", { class: "ax-astats__tile" }, [el("small", { class: "ax-muted", text: label }), el("b", { class: cls || "", text: val })]);
  }
  function statTiles(s) {
    var streakTxt = s.streak > 0 ? (s.streak + " 連勝") : s.streak < 0 ? (Math.abs(s.streak) + " 連敗") : "—";
    return [
      statTile("勝率", s.matches ? s.winRate + "%" : "—", s.winRate >= 50 ? "ax-green" : ""),
      statTile("戰績", s.wins + " 勝 " + s.losses + " 敗"),
      statTile("累積收益", (s.profit >= 0 ? "+" : "-") + money(Math.abs(s.profit)), s.profit >= 0 ? "ax-green" : "ax-red"),
      statTile("目前連續", streakTxt, s.streak > 0 ? "ax-green" : s.streak < 0 ? "ax-red" : ""),
      statTile("最高連勝", s.best ? s.best + " 連勝" : "—"),
      statTile("單場最佳", s.bigWin ? "+" + money(s.bigWin) : "—", "ax-gold")
    ];
  }
  // 競技場頂部戰績面板
  function statsPanel() {
    var s = statSummary();
    return el("div", { class: "ax-astats" }, [
      el("div", { class: "ax-astats__head" }, [
        el("div", {}, [el("b", { text: "我的 Slots Battle 戰績" }), el("small", { class: "ax-muted", text: "　你參與的對戰（1v1 / 1v1v1 / 1v1v1v1）" })]),
        el("button", { class: "ax-btn-ghost ax-astats__more", text: "戰績與回放 ›", onClick: function () { s.matches ? historyModal() : HL.ui.toast("尚無對戰紀錄，先去打一場！", "warn"); } })
      ]),
      el("div", { class: "ax-astats__grid" }, statTiles(s))
    ]);
  }
  // 戰績清單（每筆可逐輪回放）
  function historyModal() {
    var s = statSummary();
    var rows = s.history.map(function (rec) {
      var seats = rec.seats || [], opps = seats.filter(function (x) { return !x.me; });
      var myT = rec.myTotal != null ? rec.myTotal : ((rec.totals || [0])[0]);
      var modeTag = rec.mode && rec.mode !== "normal" ? (" · " + (rec.mode === "crazy" ? "Crazy" : "Terminal")) : "";
      return el("div", { class: "ax-row ax-vsh" }, [
        el("span", { class: "av", text: opps.length > 1 ? "👥" : (opps[0] ? opps[0].av : "🤖") }),
        el("div", { class: "ax-vsh__main" }, [
          el("div", { class: "nm", text: (rec.vs || "1v1") + " vs " + (opps.map(function (o) { return o.name; }).join("、") || "對手") }),
          el("small", { class: "ax-muted", text: (rec.game || "Battle") + " · 你 " + money(myT) + modeTag })
        ]),
        el("span", { class: (rec.win ? "ax-green" : "ax-red") + " ax-vsh__res", text: rec.win ? "勝" : "敗" }),
        el("b", { class: rec.net >= 0 ? "ax-green" : "ax-red", text: (rec.net >= 0 ? "+" : "-") + money(Math.abs(rec.net)) }),
        el("button", { class: "ax-btn-ghost ax-vsh__replay", text: "回放", onClick: function () { replayModal(rec); } })
      ]);
    });
    var body = [
      el("div", { class: "ax-astats__grid ax-astats__grid--modal" }, statTiles(s)),
      el("div", { class: "ax-panel", style: "max-height:46vh;overflow:auto" }, rows.length ? rows : [el("p", { class: "ax-muted", text: "尚無紀錄。" })]),
      el("span", { class: "ax-demo-tag", text: "Demo · 紀錄存於本次連線，重整即清空" })
    ];
    HL.ui.modal("Slots Battle · 戰績與回放（最近 " + s.history.length + " 場）", body, { wide: true });
  }
  // 逐輪回放：用每輪各玩家累計分，動畫重播 N 條分數競賽 + 終局結果
  function replayModal(rec) {
    var seats = rec.seats || [{ name: "你", av: "👑", me: true }];
    var rounds = (rec.rounds && rec.rounds.length) ? rec.rounds : [(rec.totals || [0])];
    var maxv = Math.max.apply(null, [1].concat(rec.totals || [1]));
    var roundLbl = el("div", { class: "ax-replay__round", text: "準備開始…" });
    var bars = seats.map(function (p) {
      var fill = el("i"), num = el("b", { class: "ax-replay__num", text: money(0) });
      var bar = el("div", { class: "ax-replay__bar " + (p.me ? "me" : "opp") }, [
        el("span", { class: "ax-replay__plabel" }, [el("span", { text: p.av }), el("span", { text: p.name })]),
        el("div", { class: "ax-replay__track" }, [fill]), num
      ]);
      return { fill: fill, num: num, bar: bar };
    });
    var deltaEl = el("div", { class: "ax-replay__delta ax-muted" });
    var finalEl = el("div", { class: "ax-replay__final" });
    var replayBtn = el("button", { class: "ax-btn-ghost", text: "↻ 重新播放" });
    var headNodes = [];
    seats.forEach(function (p, i) {
      if (i) headNodes.push(el("div", { class: "ax-replay__vs", text: "VS" }));
      headNodes.push(el("div", { class: "ax-replay__p " + (p.me ? "me" : "opp") }, [el("span", { class: "ax-replay__av", text: p.av }), el("span", { text: p.name })]));
    });
    var body = el("div", { class: "ax-replay" }, [
      el("div", { class: "ax-replay__head" }, headNodes),
      roundLbl,
      el("div", { class: "ax-replay__bars" }, bars.map(function (b) { return b.bar; })),
      deltaEl, finalEl
    ]);
    var ref = HL.ui.modal("對戰回放 · " + (rec.vs || "") + (rec.game ? " · " + rec.game : ""), [
      body,
      el("div", { class: "ax-result__actions" }, [replayBtn, el("button", { class: "ax-btn-primary", text: "關閉", onClick: function () { stopR(); ref.close(); } })]),
      el("span", { class: "ax-demo-tag", text: "Demo · 逐輪重播" })
    ], { wide: true });

    var rtimers = [];
    function stopR() { rtimers.forEach(function (t) { clearTimeout(t); }); rtimers = []; }
    function laterR(fn, ms) { var t = setTimeout(fn, ms); rtimers.push(t); return t; }
    function showFinal() {
      roundLbl.textContent = "對戰結束";
      HL.dom.clear(finalEl);
      finalEl.appendChild(el("div", { class: "ax-result " + (rec.win ? "win" : "lose") }, [
        el("div", { class: "ax-result__title", text: rec.win ? "🏆 你贏了！" : (rec.winnerName ? "優勝：" + rec.winnerName : "你輸了") }),
        el("div", { class: "ax-result__amount", text: (rec.net >= 0 ? "+" : "-") + money(Math.abs(rec.net)) })
      ]));
    }
    function play() {
      stopR(); HL.dom.clear(finalEl);
      bars.forEach(function (b) { b.fill.style.width = "0%"; b.num.textContent = money(0); b.bar.classList.remove("is-lead"); });
      roundLbl.textContent = "準備開始…"; deltaEl.textContent = "";
      rounds.forEach(function (rd, r) {
        laterR(function () {
          if (!document.body.contains(bars[0].fill)) { stopR(); return; }
          roundLbl.textContent = "Round " + (r + 1) + " / " + rounds.length;
          var prev = r > 0 ? rounds[r - 1] : seats.map(function () { return 0; });
          var leadIdx = 0; for (var k = 1; k < rd.length; k++) { if (rd[k] > rd[leadIdx]) leadIdx = k; }
          var youDelta = "";
          bars.forEach(function (b, i) {
            var v = rd[i] || 0;
            b.fill.style.width = (v / maxv * 100) + "%"; b.num.textContent = money(v);
            b.bar.classList.toggle("is-lead", i === leadIdx);
            if (seats[i].me) youDelta = "你本輪 <b class='ax-gold'>+" + money(v - (prev[i] || 0)) + "</b>";
          });
          deltaEl.innerHTML = youDelta;
          if (r === rounds.length - 1) laterR(showFinal, 850);
        }, 700 * (r + 1));
      });
    }
    replayBtn.addEventListener("click", play);
    play();
  }
  HL.arenaStats = { record: statRecord, summary: statSummary, panel: statsPanel, history: historyModal, replay: replayModal };

  /* ---------- 背景模擬：假玩家挑戰我的房間（全域，離頁也持續） ---------- */
  function simBounty(r) {
    var name = HL.mock.pick(HL.mock.fakeNames) + HL.mock.rint(10, 99), bet, win, entry;
    if (r.game === "flip") {
      bet = r.cost;
      var poolPer = Math.round(r.cost * 10 / r.flips);
      var prizes = HL.mock.flipPrizes(poolPer, r.vol);
      win = 0; for (var k = 0; k < r.flips; k++) win += prizes[k];
      entry = { name: name, bet: bet, win: win, flip: true };
    } else {
      var bets = [10, 50, 100, 200, 500].filter(function (b) { return b <= r.maxBet; });
      bet = HL.mock.pick(bets.length ? bets : [r.maxBet]);
      var mult = Math.min(HL.mock.pick(HL.mock.volatility[r.vol].mults), r.maxMult);
      win = bet * mult;
      entry = { name: name, bet: bet, mult: mult, win: win };
    }
    r.prizePool = Math.max(0, r.prizePool + bet - win);
    r.playsLeft--; r.done = (r.done || 0) + 1; r.challenges++;
    var net = bet - win; // 房主每局淨收 = 費用 - 賠付
    if (net >= 0) r.hostEdge = (r.hostEdge || 0) + net; else r.challEdge = (r.challEdge || 0) + (-net);
    (r.log = r.log || []).push(entry);
  }
  // 背景模擬 Slots Battle：空位先補 bot，全滿則跑一場（依模式定勝者）後重置非房主席位
  function simVsslot(r) {
    var n = r.players || 2, seats = r.seats || (r.seats = []);
    var emptyIdx = -1; for (var i = 0; i < n; i++) { if (!seats[i]) { emptyIdx = i; break; } }
    if (emptyIdx >= 0) { seats[emptyIdx] = HL.mock.makeHost(); r.challenges = (r.challenges || 0) + 1; return; }
    var scores = []; for (var j = 0; j < n; j++) scores.push(HL.mock.rint(700, 2600) * (r.rounds || 1));
    var best = 0; for (var k = 1; k < n; k++) { if (r.mode === "crazy" ? scores[k] < scores[best] : scores[k] > scores[best]) best = k; }
    r.matches = (r.matches || 0) + 1; r.done = (r.done || 0) + 1;
    if (best === 0) r.hostEdge = (r.hostEdge || 0) + r.wager; else r.challEdge = (r.challEdge || 0) + r.wager;
    (r.log = r.log || []).push({ winner: (seats[best] || {}).name, scores: scores });
    for (var m = 1; m < n; m++) seats[m] = Math.random() < 0.4 ? HL.mock.makeHost() : null;
    if (seats.indexOf(null) < 0 && n > 1) seats[n - 1] = null;
  }
  var settleQueue = [];
  function isBusyView() { var v = HL.state.get().view; return v === "vsslot" || v === "bounty" || v === "duel" || v === "slot"; }
  function endMyRoom(r) {
    var st = HL.state.get();
    var member = HL.auth && HL.auth.backend() && HL.auth.user();
    var net;
    // 會員模式：自建房為沙盒，不動真實雲端餘額（真實餘額只由伺服器 RPC 變動）
    if (r.type === "bounty") { if (!member) HL.state.set({ balance: st.balance + r.prizePool }); net = r.prizePool - r.deposit - (r.openFee || 0); }
    else { if (!member) HL.state.set({ balance: st.balance + (r.net || 0) }); net = r.net || 0; }
    HL.shell.refreshChrome();
    if (r.type === "vsslot") { var s = HL.state.get().arenaStats || defStats(); s.hostNet = (s.hostNet || 0) + net; HL.state.set({ arenaStats: s }); } // 開房（被挑戰）淨收
    var item = { r: r, net: net, kind: r.type };
    if (isBusyView()) settleQueue.push(item);              // 玩家正在挑戰別的房 → 先排隊，回大廳/競技場再顯示
    else settlement(item.r, item.net, item.kind);
  }
  function flushSettlements() {
    if (!settleQueue.length || isBusyView()) return;
    var item = settleQueue.shift();
    settlement(item.r, item.net, item.kind, function () { setTimeout(flushSettlements, 200); }); // 關閉後顯示下一筆
  }
  // 原地更新單張卡（倒數 / 挑戰次數 / 熱度），避免整張重繪造成閃爍與難點擊
  function updateCard(r) {
    if (!gridEl) return;
    var card = gridEl.querySelector('[data-room-id="' + r.id + '"]'); if (!card) return;
    var t = card.querySelector("[data-room-time]"); if (t) t.textContent = fmtLeft(r.endsInSec);
    if (r.type === "bounty") {
      var d = card.querySelector(".ax-rc-done"); if (d) d.textContent = "挑戰次數 " + (r.done || 0) + "/" + r.plays;
      var h = card.querySelector(".ax-heat"); if (h) { var nh = heatBar(r); h.parentNode.replaceChild(nh, h); }
    } else {
      var sg = card.querySelector(".ax-seat-grid"); if (sg) { var ns = seatRow(r); sg.parentNode.replaceChild(ns, sg); }
      var cnt = card.querySelector(".ax-rc-done span:last-child"); if (cnt) cnt.textContent = (r.seats || []).filter(Boolean).length + "/" + (r.players || 2) + " 玩家";
    }
  }
  function tick() {
    var st = HL.state.get(), rooms = st.arenaRooms, ended = [], seq = st.roomSeq, struct = false;
    var activeId = st.activePoolId; // 玩家正在遊玩的房間，暫停模擬
    for (var i = rooms.length - 1; i >= 0; i--) {
      var r = rooms[i];
      if (r.id === activeId) continue;
      r.endsInSec--;
      // 假玩家挑戰機率（已降低約一半）
      if (r.type === "bounty") { if (r.playsLeft > 0 && Math.random() < (r.mine ? 0.28 : 0.15)) simBounty(r); }
      else { if ((r.done || 0) < r.plays && Math.random() < 0.15) simVsslot(r); }
      var fin = (r.type === "bounty" ? r.playsLeft <= 0 : (r.done || 0) >= r.plays) || r.endsInSec <= 0;
      if (fin) { rooms.splice(i, 1); if (r.mine) ended.push(r); struct = true; continue; }
    }
    if (rooms.length < 10 && Math.random() < 0.18) { rooms.unshift(HL.mock.makeArenaRoom(seq)); seq++; struct = true; }
    HL.state.set({ arenaRooms: rooms, roomSeq: seq });
    ended.forEach(endMyRoom);
    if (HL.state.get().view === "arena" && gridEl && document.body.contains(gridEl)) {
      if (struct) { renderTabs(); renderGrid(); }
      else visibleRooms().forEach(updateCard);
    }
  }
  HL.arenaSim = { tick: tick, flush: flushSettlements };

  /* ---------- 開房精靈 ---------- */
  function createModal() {
    HL.ui.modal("開房 · 選擇玩法", [
      el("p", { class: "ax-muted", text: "由你當局主，發起一場挑戰：" }),
      el("div", { class: "ax-create-pick" }, [
        el("button", { class: "ax-create-opt", onClick: function () { closeModals(); bountyForm(); } }, [el("div", { class: "ax-create-opt__ic", text: "🃏" }), el("b", { text: "賞金局" }), el("small", { class: "ax-muted", text: "翻牌 / 踩地雷，放賞金讓人挑戰" })]),
        el("button", { class: "ax-create-opt", onClick: function () { closeModals(); createBattleForm(); } }, [el("div", { class: "ax-create-opt__ic", text: "⚔️" }), el("b", { text: "Slots Battle" }), el("small", { class: "ax-muted", text: "1v1 / 1v1v1 / 1v1v1v1，多遊戲比分" })])
      ]),
      el("span", { class: "ax-demo-tag", text: "Demo · 不扣真錢" })
    ]);
  }
  function closeModals() { Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m) { m.remove(); }); }

  var OPEN_FEE_RATE = 0.02; // 平台開房費（佔押金）
  function bountyDeposit(p) { return p.game === "flip" ? p.cost * p.plays : p.maxBet * p.maxMult * p.plays; }
  function bountyFee(p) { return Math.round(bountyDeposit(p) * OPEN_FEE_RATE); }

  function bountyForm() {
    var p = { game: "flip", vol: "high", cost: 5000, flips: 5, maxBet: 100, maxMult: 10, plays: 10 };
    var depositEl = el("b", { class: "ax-gold" }), feeEl = el("b", {}), totalEl = el("b", { class: "ax-gold" });
    var paramsEl = el("div"), previewEl = el("div", { class: "ax-create-preview" }), noteEl = el("p", { class: "ax-muted" });

    function renderPreview() {
      HL.dom.clear(previewEl);
      if (p.game === "flip") {
        var poolPer = Math.round(p.cost * 10 / p.flips);
        var prizes = HL.mock.flipPreview(poolPer, p.vol);
        previewEl.appendChild(el("div", { class: "ax-muted", style: "margin-bottom:8px", text: "10 張卡彩金配比（單次總彩金 " + money(poolPer) + "）" }));
        var g = el("div", { class: "ax-preview-grid" });
        prizes.forEach(function (v) { g.appendChild(el("div", { class: "ax-preview-card" + (v > 0 ? " has" : "") }, [el("b", { text: v > 0 ? money(v).replace("NT$ ", "") : "0" })])); });
        previewEl.appendChild(g);
        previewEl.appendChild(el("p", { class: "ax-muted", style: "margin-top:8px", text: "玩家每次翻 " + p.flips + "/10 張，期望值 = 費用，RTP 100%。" }));
      } else {
        var bombs = p.vol === "high" ? 4 : p.vol === "mid" ? 3 : 2;
        previewEl.appendChild(el("div", { class: "ax-muted", style: "margin-bottom:8px", text: "12 格 · 地雷 " + bombs + " 顆" }));
        var gm = el("div", { class: "ax-preview-mine" });
        for (var i = 0; i < 12; i++) gm.appendChild(el("div", { class: "ax-preview-tile", text: "?" }));
        previewEl.appendChild(gm);
        previewEl.appendChild(el("p", { class: "ax-muted", style: "margin-top:8px", text: "每翻開安全格累積倍數，可隨時兌現；踩雷則輸，最高 " + p.maxMult + "x。" }));
      }
    }
    function refresh() {
      depositEl.textContent = money(bountyDeposit(p));
      feeEl.textContent = money(bountyFee(p));
      totalEl.textContent = money(bountyDeposit(p) + bountyFee(p));
      noteEl.textContent = p.game === "flip"
        ? "押金 = 每次費用 × 次數，用於賠付玩家；平台另收開房費。"
        : "押金 = 最高押注 × 最高倍數 × 次數，確保每局賠得出。";
      renderPreview();
    }
    function renderParams() {
      HL.dom.clear(paramsEl);
      if (p.game === "flip") {
        paramsEl.appendChild(row("每次挑戰費用", seg([{ v: 1000, t: "1000" }, { v: 2000, t: "2000" }, { v: 5000, t: "5000" }], p.cost, function (v) { p.cost = v; refresh(); })));
        paramsEl.appendChild(row("每次翻牌數（共 10 張）", seg([{ v: 3, t: "3 張" }, { v: 5, t: "5 張" }], p.flips, function (v) { p.flips = v; refresh(); })));
      } else {
        paramsEl.appendChild(row("每次最高押注額", seg([{ v: 50, t: "50" }, { v: 100, t: "100" }, { v: 200, t: "200" }, { v: 500, t: "500" }], p.maxBet, function (v) { p.maxBet = v; refresh(); })));
        paramsEl.appendChild(row("最高賠付倍數", seg([{ v: 5, t: "5x" }, { v: 10, t: "10x" }, { v: 20, t: "20x" }], p.maxMult, function (v) { p.maxMult = v; refresh(); })));
      }
      refresh();
    }
    renderParams();

    var settings = el("div", {}, [
      row("遊戲", seg([{ v: "flip", t: "翻牌" }, { v: "mine", t: "踩地雷" }], p.game, function (v) { p.game = v; renderParams(); })),
      row("獎項震盪（官方推薦）", seg([{ v: "high", t: "高震盪" }, { v: "mid", t: "中震盪" }, { v: "low", t: "低震盪" }], p.vol, function (v) { p.vol = v; refresh(); })),
      paramsEl,
      row("結束條件（挑戰次數）", seg([{ v: 10, t: "10" }, { v: 50, t: "50" }, { v: 100, t: "100" }], p.plays, function (v) { p.plays = v; refresh(); })),
      el("div", { class: "ax-deposit" }, [el("span", { text: "開房押金（賠付用）" }), depositEl]),
      el("div", { class: "ax-deposit ax-deposit--sub" }, [el("span", { text: "平台開房費（2%）" }), feeEl]),
      el("div", { class: "ax-deposit ax-deposit--total" }, [el("span", { text: "合計需準備" }), totalEl]),
      noteEl,
      el("button", { class: "ax-btn-primary", text: "確認開房", onClick: function () { createBounty(p); } })
    ]);

    HL.ui.modal("開房 · 賞金局", [
      el("div", { class: "ax-create-wide" }, [
        settings,
        el("div", {}, [el("div", { class: "ax-muted", style: "font-weight:700;margin-bottom:8px", text: "遊戲畫面 / 配比預覽" }), previewEl])
      ]),
      el("span", { class: "ax-demo-tag", text: "Demo · 不扣真錢" })
    ], { wide: true });
  }
  function row(label, node) { return el("div", { class: "ax-tool-row" }, [el("label", { class: "ax-muted", text: label }), node]); }

  function createBounty(p) {
    var deposit = bountyDeposit(p), fee = bountyFee(p), total = deposit + fee;
    var st = HL.state.get();
    var member = HL.auth && HL.auth.backend() && HL.auth.user();
    if (total > st.balance) { HL.ui.toast("餘額不足以支付押金 + 開房費", "err"); return; }
    // 會員模式：開房為沙盒（不動真實雲端餘額；真實餘額只由伺服器 RPC 變動）
    if (!member) { HL.state.set({ balance: st.balance - total }); HL.shell.refreshChrome(); }
    var room = {
      id: "room_" + st.roomSeq, host: { name: "你", av: "👑" }, type: "bounty",
      game: p.game, cards: 10, vol: p.vol,
      plays: p.plays, playsLeft: p.plays, deposit: deposit, prizePool: deposit, openFee: fee,
      endsInSec: 3600, challenges: 0, done: 0, hostEdge: 0, challEdge: 0, mine: true, log: []
    };
    if (p.game === "flip") { room.cost = p.cost; room.flips = p.flips; }
    else { room.maxBet = p.maxBet; room.maxMult = p.maxMult; }
    var rooms = st.arenaRooms.slice(); rooms.unshift(room);
    HL.state.set({ arenaRooms: rooms, roomSeq: st.roomSeq + 1 });
    closeModals(); HL.ui.toast("開房成功！押金 " + money(deposit) + " + 開房費 " + money(fee) + "（Demo）", "ok");
    filter = "all"; renderTabs(); renderGrid();
  }

  // 偏好開關列
  function prefRow(icon, label, desc, get, set) {
    var tg = el("button", { class: "ax-tgl" + (get() ? " on" : ""), onClick: function () { set(!get()); tg.classList.toggle("on", get()); } }, [el("span", { class: "ax-tgl__k" })]);
    return el("div", { class: "ax-prefrow" }, [
      el("div", { class: "ax-prefrow__ic", text: icon }),
      el("div", { class: "ax-prefrow__txt" }, [el("b", { text: label }), el("small", { class: "ax-muted", text: desc })]),
      tg
    ]);
  }
  function createBattleForm() {
    var p = { btype: "standard", players: 2, mode: "normal", fast: true, ultra: false, priv: false, sponsored: false, wager: 1000, games: [] };
    var lib = HL.mock.battleGameLib;
    var gamesGrid = el("div", { class: "ax-bgrid" });
    var searchInput = el("input", { type: "text", class: "ax-bsearch__in", placeholder: "搜尋 " + lib.length + " 款遊戲…" });
    var footEl = el("div", { class: "ax-bfoot" });
    function isSel(g) { return p.games.indexOf(g) >= 0; }
    function cost() { var base = p.wager * Math.max(1, p.games.length); return p.sponsored ? base * p.players : base; }
    function renderGames() {
      var q = (searchInput.value || "").toLowerCase();
      HL.dom.clear(gamesGrid);
      lib.filter(function (g) { return !q || g.title.toLowerCase().indexOf(q) >= 0; }).forEach(function (g) {
        gamesGrid.appendChild(el("div", { class: "ax-bcard" + (isSel(g) ? " is-sel" : ""), style: "background:linear-gradient(160deg," + g.c1 + "," + g.c2 + ")", onClick: function () { toggleG(g); } }, [
          g.playable ? el("span", { class: "ax-bcard__play", text: "▶ 可玩" }) : null,
          el("span", { class: "ax-bcard__chk", text: isSel(g) ? "✓" : "" }),
          el("div", { class: "ax-bcard__name", text: g.title })
        ]));
      });
    }
    function toggleG(g) {
      var i = p.games.indexOf(g);
      if (i >= 0) p.games.splice(i, 1);
      else { if (p.games.length >= 5) { HL.ui.toast("最多選 5 款遊戲", "warn"); return; } p.games.push(g); }
      renderGames(); refreshFoot();
    }
    searchInput.addEventListener("input", renderGames);
    function refreshFoot() {
      HL.dom.clear(footEl);
      var c = cost(), bal = HL.state.get().balance, ok = p.games.length > 0 && c <= bal;
      function stat(v, t, cls) { return el("div", { class: "ax-bfoot__stat" }, [el("b", { class: cls || "", text: v }), el("small", { class: "ax-muted", text: t })]); }
      footEl.appendChild(stat(String(p.games.length), "Games"));
      footEl.appendChild(stat(String(p.games.length), "Rounds"));
      footEl.appendChild(stat(money(c), "投入", "ax-gold"));
      footEl.appendChild(el("button", { class: "ax-btn-primary ax-bfoot__go" + (ok ? "" : " is-off"), text: p.games.length ? "建立對戰 ⚔" : "選至少一款遊戲", onClick: function () { ok ? createBattle(p) : (p.games.length ? HL.ui.toast("餘額不足", "err") : HL.ui.toast("請選至少一款遊戲", "warn")); } }));
    }

    HL.ui.modal("建立對戰 · Create Battle", [
      el("div", { class: "ax-battlecreate" }, [
        el("div", { class: "ax-bc__left" }, [
          row("對戰類型", seg([{ v: "standard", t: "Standard" }, { v: "shared", t: "Shared" }, { v: "team", t: "Team" }], p.btype, function (v) { p.btype = v; if (v !== "standard") HL.ui.toast(v === "shared" ? "Shared（費用均分）示意" : "Team（隊伍對抗）示意", "warn"); })),
          row("人數", seg([{ v: 2, t: "1v1" }, { v: 3, t: "1v1v1" }, { v: 4, t: "1v1v1v1" }], p.players, function (v) { p.players = v; refreshFoot(); })),
          row("模式", seg([{ v: "normal", t: "標準" }, { v: "crazy", t: "Crazy" }, { v: "terminal", t: "Terminal" }], p.mode, function (v) { p.mode = v; })),
          el("div", { class: "ax-bc__prefs" }, [
            prefRow("⚡", "快速旋轉 Fast Spins", "加速 FG 動畫", function () { return p.fast; }, function (v) { p.fast = v; if (v) p.ultra = false; renderPrefs(); }),
            prefRow("⚡⚡", "超快旋轉 Ultra", "極速 FG 動畫", function () { return p.ultra; }, function (v) { p.ultra = v; if (v) p.fast = false; renderPrefs(); }),
            prefRow("🔒", "私密房間 Private", "僅分享連結可加入", function () { return p.priv; }, function (v) { p.priv = v; }),
            prefRow("🤝", "贊助房間 Sponsored", "你負擔所有玩家入場費", function () { return p.sponsored; }, function (v) { p.sponsored = v; refreshFoot(); })
          ]),
          row("賭注", seg([{ v: 100, t: "100" }, { v: 500, t: "500" }, { v: 1000, t: "1000" }, { v: 2000, t: "2000" }, { v: 5000, t: "5000" }], p.wager, function (v) { p.wager = v; refreshFoot(); }))
        ]),
        el("div", { class: "ax-bc__right" }, [
          el("div", { class: "ax-bsearch" }, [el("span", { class: "ax-search__ic", text: "🔍" }), searchInput]),
          el("p", { class: "ax-muted ax-bc__hint", text: "選遊戲＝選回合（每款 1 輪）。引擎僅暗影儀式可真玩，其餘跑同一 FG 示意。" }),
          gamesGrid
        ])
      ]),
      footEl,
      el("span", { class: "ax-demo-tag", text: "Demo · 不扣真錢" })
    ], { wide: true });
    // fast/ultra 互斥：重繪兩顆開關狀態
    function renderPrefs() { var box = document.querySelector(".ax-bc__prefs"); if (!box) return; var tgs = box.querySelectorAll(".ax-tgl"); tgs[0].classList.toggle("on", p.fast); tgs[1].classList.toggle("on", p.ultra); }
    renderGames(); refreshFoot();
  }
  function createBattle(p) {
    var st = HL.state.get();
    var member = HL.auth && HL.auth.backend() && HL.auth.user();
    var c = p.wager * Math.max(1, p.games.length) * (p.sponsored ? p.players : 1);
    if (!p.games.length) { HL.ui.toast("請選至少一款遊戲", "warn"); return; }
    if (c > st.balance) { HL.ui.toast("餘額不足", "err"); return; }
    // 會員模式：建房不先扣費，賭注由 play_battle 在對戰結束時伺服器原子結算（防作弊）
    if (!member) { HL.state.set({ balance: st.balance - c }); HL.shell.refreshChrome(); }
    var seats = [{ name: "你", av: "👑" }];
    for (var i = 1; i < p.players; i++) seats.push(null); // 其餘對戰時由 bot 補位
    var room = {
      id: "room_" + st.roomSeq, host: { name: "你", av: "👑" }, type: "vsslot", battle: true, mine: false,
      battleType: p.btype, players: p.players, games: p.games.map(function (g) { return { title: g.title, c1: g.c1, c2: g.c2, playable: !!g.playable }; }),
      rounds: p.games.length, mode: p.mode, prefs: { fast: p.fast, ultra: p.ultra, priv: p.priv, sponsored: p.sponsored },
      seats: seats, wager: p.wager, slot: p.games[0].title, buys: p.games.length,
      plays: 20, endsInSec: 1800, hostEdge: 0, challEdge: 0, done: 0, matches: 0, challenges: 0, net: 0, log: []
    };
    var rooms = st.arenaRooms.slice(); rooms.unshift(room);
    HL.state.set({ arenaRooms: rooms, roomSeq: st.roomSeq + 1 });
    closeModals(); HL.ui.toast("對戰已建立，開始配對！（Demo）", "ok");
    HL.router.go("vsslot", room.id); // 立即進入對戰
  }

  /* ---------- Tabs ---------- */
  function renderTabs() {
    if (!tabsEl) return;
    HL.dom.clear(tabsEl);
    [{ k: "all", n: "全部" }, { k: "mine", n: "我的房間" }, { k: "bounty", n: "賞金局" }, { k: "vsslot", n: "Slots Battle" }].forEach(function (t) {
      tabsEl.appendChild(el("button", { class: "ax-tab" + (filter === t.k ? " is-active" : ""), text: t.n, onClick: function () { filter = t.k; renderTabs(); renderGrid(); } }));
    });
  }

  function render() {
    filter = "all";
    gridEl = el("div", { class: "ax-room-grid" });
    tabsEl = el("div", { class: "ax-tabs" });
    renderTabs(); renderGrid();
    return el("div", { class: "ax-arena-pg ax-fade-in" }, [
      el("div", { class: "ax-section-title" }, [
        el("h2", {}, ["🏟️ 玩家擂台"]),
        el("button", { class: "ax-btn-primary ax-arena__create", text: "＋ 開房發起挑戰", onClick: createModal })
      ]),
      statsPanel(),
      tabsEl,
      gridEl
    ]);
  }

  HL.views = HL.views || {};
  HL.views.arena = { render: render };
  // 對外開放房間卡渲染（供大廳「熱門玩家擂台」重用）
  HL.arenaUI = { roomCard: roomCard, enterRoom: enterRoom, heatBar: heatBar };
})(window);

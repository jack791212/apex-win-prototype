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

  var pad = HL.dom.pad; // 沿用共用 helper（見 core/dom.js）
  function fmtLeft(sec) {
    if (sec >= 3600) return Math.floor(sec / 3600) + "時" + pad(Math.floor((sec % 3600) / 60)) + "分";
    return HL.dom.mmss(sec);
  }
  var seg = HL.ui.segmented; // 分段控制沿用共用 primitive（見 core/ui.js）

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

  function roomCard(r) { return HL.dom.pressable(r.type === "bounty" ? bountyCard(r) : battleCard(r)); }

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
  /* 我是否已在這間房裡有座位（自己建的對戰房 seats[0] 就是你）。
   * 缺陷：舊版只看 `r.mine`，而 createBattle 寫死 `mine: false` ⇒ 自建房既不進「我的房間」頁籤，
   * 卡上還把你算進 `filled` 卻同時渲染「加入 NT$1,000」＝賣你一個你已經坐著的位子。 */
  function iAmSeated(r) { return (r.seats || []).some(function (s) { return s && s.name === "你"; }); }
  function isMineRoom(r) { return !!r.mine || iAmSeated(r); }

  function battleCard(r) {
    var g0 = (r.games && r.games[0]) || { title: r.slot || "暗影儀式", c1: "#3a1e6e", c2: "#160a2a" };
    var filled = (r.seats || []).filter(Boolean).length;
    var seated = iAmSeated(r);
    var canJoin = !seated && filled < (r.players || 2) && !(r.prefs && r.prefs.priv);
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
        seated
          // 已在房內：給「回到對戰」而不是再賣你一次入場（且不得再收一次賭注）
          ? el("button", { class: "ax-btn-join", text: "回到對戰 ›", onClick: function (e) { e.stopPropagation(); enterRoom(r); } })
          : r.mine
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
      // 「我的房間」＝我開的（賞金局 mine:true）**或**我已入座的（自建對戰房）——舊版只看 mine ⇒ 該頁籤對自建對戰房永遠是空的
      return filter === "all" ? true : filter === "mine" ? isMineRoom(r) : r.type === filter;
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
    return pairs.map(function (p) { return HL.ui.kv(p[0], p[1], { row: true }); });
  }
  // 房間淨利單一出口（§5 #11：賞金房＝取回−押金−開房費，含開房費那份才對）。理由/反向錨見 checks-games.js「room-net-single-truth」鎖。
  function roomNet(r) {
    return r.type === "bounty" ? (r.prizePool - r.deposit - (r.openFee || 0)) : (r.net || 0);
  }
  function myRoomStatusModal(r) {
    var net = roomNet(r);
    var info = r.type === "bounty"
      ? rowsKV([["玩法", "賞金局 · " + HL.mock.roomGames[r.game].name], ["賞金池", money(r.prizePool)], ["投入押金", money(r.deposit)], ["平台開房費", money(r.openFee || 0)], ["目前淨利", (net >= 0 ? "+" : "-") + money(Math.abs(net))], ["剩餘次數", r.playsLeft + " / " + r.plays], ["挑戰人次", String(r.challenges)]])
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
      el("div", { class: "ax-panel", style: "max-height:50vh;max-height:50dvh;overflow:auto" }, rows.length ? rows : [el("p", { class: "ax-muted", text: "本場無人挑戰。" })]),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料" })
    ]);
  }
  function settlement(r, net, kind, onDone) {
    var up = net >= 0;
    var info = kind === "bounty"
      ? rowsKV([["投入押金", money(r.deposit)], ["平台開房費", money(r.openFee || 0)], ["取回賞金池", money(r.prizePool)], ["總挑戰人次", String(r.challenges)]])
      : rowsKV([["賭注 / 場", money(r.wager)], ["對戰場次", String(r.matches || 0)], ["總挑戰人次", String(r.challenges)]]);
    var ref = HL.ui.modal("我的房間結算 · " + (kind === "bounty" ? "賞金局" : "對押競技"), [
      HL.ui.resultBlock(up, up ? "押金漲了！" : "押金賠了", (up ? "+" : "-") + money(Math.abs(net))),
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
    return HL.ui.stat(label, el("b", { class: cls || "", text: val }), "ax-astats__tile"); // T13：薄轉接 HL.ui.stat（DOM byte-identical）
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
      /* 同一個 bug 的第二個表面：清單一律只寫「你 <總分>」，但 terminal 模式的判準是**最後一輪增量**
       * ⇒ 玩家會看到「你 1,050」旁邊掛著「敗」而無從理解。terminal 就把那個判準也寫出來。 */
      var myLast = null;
      if (HL.battleMode.spec(rec.mode).metric === "last" && rec.rounds && rec.rounds.length) {
        var L = rec.rounds[rec.rounds.length - 1] || [], P = rec.rounds[rec.rounds.length - 2] || [];
        myLast = (L[0] || 0) - (P[0] || 0);
      }
      // 勝負條件也走同一個出口（各表面不得自己另寫一句）
      var modeTag = rec.mode && rec.mode !== "normal"
        ? (" · " + HL.battleMode.labelOf(rec.mode) + "（" + HL.battleMode.winCondOf(rec.mode) + "）") : "";
      return el("div", { class: "ax-row ax-vsh" }, [
        el("span", { class: "av", text: opps.length > 1 ? "👥" : (opps[0] ? opps[0].av : "🤖") }),
        el("div", { class: "ax-vsh__main" }, [
          el("div", { class: "nm", text: (rec.vs || "1v1") + " vs " + (opps.map(function (o) { return o.name; }).join("、") || "對手") }),
          el("small", { class: "ax-muted", text: (rec.game || "Battle") + " · 你 " + money(myT)
            + (myLast != null ? "（最後一輪 +" + money(myLast) + "）" : "") + modeTag })
        ]),
        el("span", { class: (rec.win ? "ax-green" : "ax-red") + " ax-vsh__res", text: rec.win ? "勝" : "敗" }),
        el("b", { class: rec.net >= 0 ? "ax-green" : "ax-red", text: (rec.net >= 0 ? "+" : "-") + money(Math.abs(rec.net)) }),
        el("button", { class: "ax-btn-ghost ax-vsh__replay", text: "回放", onClick: function () { replayModal(rec); } })
      ]);
    });
    var body = [
      el("div", { class: "ax-astats__grid ax-astats__grid--modal" }, statTiles(s)),
      el("div", { class: "ax-panel", style: "max-height:46vh;max-height:46dvh;overflow:auto" }, rows.length ? rows : [el("p", { class: "ax-muted", text: "尚無紀錄。" })]),
      el("span", { class: "ax-demo-tag", text: "Demo · 紀錄存於本次連線，重整即清空" })
    ];
    HL.ui.modal("Slots Battle · 戰績與回放（最近 " + s.history.length + " 場）", body, { wide: true });
  }
  // 逐輪回放：用每輪各玩家累計分，動畫重播 N 條分數競賽 + 終局結果
  /* ---- 回放（2026-08-21 前景·船長回報「競技場有顯示 BUG」實測復現）---------------------
   * 【缺陷】長條圖與「領先」高亮**都硬寫成「累計總分越高越好」**，而勝負依模式而定：
   *   crazy＝最低總分勝、terminal＝比最後一輪增量。於是回放會與它自己記錄的結果互相矛盾。
   * 【live 實測復現】
   *   crazy（我 200／對手 600、紀錄 win:true）→ 我的條 33.3% 無高亮、對手條 100% 掛 `is-lead`，
   *     底下卻寫「🏆 你贏了！+NT$100」＝畫面說對手屠殺我、結果說我贏。
   *   terminal（我總分 1050／對手 800，但我最後一輪只 +50、對手 +700，紀錄 win:false）→
   *     我的條 100% 且掛 `is-lead`，底下寫「優勝：對手 −NT$100」＝畫面說我領先、結果說我輸。
   * 【修法】排名的量只有一份真相：`HL.vsslot.metricOf(mode, entry)`（對戰本體排名用的同一支）。
   *   ① 領先高亮改用該量 ② 條長改用該量的**歸一化**（crazy 下「分數越低越好」故以 max−v 反向歸一，
   *      條長 = 表現好壞，與 is-lead 同軸；數字仍顯示真實分數，不動事實）
   *   ③ 標頭明說勝負條件（玩家才知道為什麼短的條反而贏）④ terminal 每一席都顯示本輪增量（那才是判準）。
   * ⚠️ 不要把條長改回「一律用總分」——那正是這個 bug。 */
  function replayModal(rec) {
    var seats = rec.seats || [{ name: "你", av: "👑", me: true }];
    var rounds = (rec.rounds && rec.rounds.length) ? rec.rounds : [(rec.totals || [0])];
    var mode = rec.mode || "normal";
    var BM = HL.battleMode;   // 開站即載的單一真相（刻意不讀 HL.vsslot：它是延遲載入，會靜默退回錯的排名）
    // 這一輪各席位的 entry：{total 累計分, last 本輪增量} —— 由 BM 決定要用哪一個排名
    function entryAt(rd, prev, i) { return { total: rd[i] || 0, last: (rd[i] || 0) - ((prev && prev[i]) || 0) }; }
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
    // 勝負條件必須寫在畫面上：否則 crazy 模式「條短的反而贏」在玩家眼裡就是壞掉
    var ref = HL.ui.modal("對戰回放 · " + (rec.vs || "") + (rec.game ? " · " + rec.game : "")
      + " · " + BM.labelOf(mode) + "（" + BM.winCondOf(mode) + "）", [
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
      finalEl.appendChild(HL.ui.resultBlock(rec.win, rec.win ? "🏆 你贏了！" : (rec.winnerName ? "優勝：" + rec.winnerName : "你輸了"), (rec.net >= 0 ? "+" : "-") + money(Math.abs(rec.net)), null, { share: { game: "對押競技 Arena" } }));
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
          // 領先＝依模式的排名量（不是「總分最高」）；條長＝表現好壞（crazy 反向）——兩者同一個出口
          var entries = rd.map(function (_, i) { return entryAt(rd, prev, i); });
          var leadIdx = BM.leaderIndex(mode, entries);
          var youDelta = "";
          bars.forEach(function (b, i) {
            var v = rd[i] || 0, d = v - (prev[i] || 0);
            b.fill.style.width = (BM.barFrac(mode, BM.metricOf(mode, entries[i]),
              BM.spec(mode).metric === "last" ? Math.max(1, maxv / rounds.length) : maxv) * 100) + "%";
            b.num.textContent = money(v) + (BM.spec(mode).metric === "last" ? "（本輪 +" + money(d) + "）" : "");
            b.bar.classList.toggle("is-lead", i === leadIdx);
            if (seats[i].me) youDelta = "你本輪 <b class='ax-gold'>+" + money(d) + "</b>";
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

  /* ---- #115 報表中心的外部註冊者 ----
   * 為什麼是這個檔：戰績只活在 `historyModal()` 裡（最近 30 場、重整即清空），**看得到、帶不走**；
   *   而這是全站唯一「玩家對玩家」的結果資料 ⇒ 最該有 CSV 出口的一份。
   * ⭐ 排名的量一律向 `HL.battleMode` 求 —— 這正是 08-21 那個顯示 BUG 的根因（四個表面各自硬寫
   *   「總分越高越好」，於是回放把輸家標成領先）。**報表是第五個表面，不得再寫第五份比較子**：
   *   欄名（總分／本輪增量）走 `displayMetricLabel`、值走 `metricOf`、模式與勝負條件走 `labelOf`／`winCondOf`。
   * ⚠️ 載入序：`views/arena.js` 在 index.html 排在 `core/reports.js` **之後**才有 `HL.reports`；
   *   且本檔是 #111 判定必須留在首屏的三支之一（⛔ 不得移入延遲清單）——
   *   **把一個註冊過東西的檔搬離首屏，掛在它上面的註冊項會跟著消失且不報錯**（#114 收尾記下的那條）。
   *   兩件事都由常駐鎖 `platform/reports-registrars-load-order` 盯著。 */
  function battleRows() {
    var hist = statSummary().history || [];
    return hist.map(function (rec) {
      var rds = rec.rounds || [], L = rds[rds.length - 1] || [], P = rds[rds.length - 2] || [];
      var myLast = (L[0] || 0) - (P[0] || 0);
      var mode = rec.mode || "normal";
      var opps = (rec.seats || []).filter(function (x) { return !x.me; }).map(function (x) { return x.name; });
      return {
        ts: rec.ts || 0, vs: rec.vs || "1v1", mode: mode, game: rec.game || "",
        wager: rec.wager || 0, rounds: rds.length,
        metric: HL.battleMode.metricOf(mode, { total: rec.myTotal || 0, last: myLast }),
        win: !!rec.win, net: rec.net || 0, opp: opps.join("、"), winner: rec.winnerName || ""
      };
    });
  }
  if (HL.reports && HL.reports.register) {
    HL.reports.register({
      id: "arena-battles", cat: "play", aud: "player", icon: "⚔", name: "Slots Battle 逐場戰績",
      cols: [
        { key: "ts",   label: "時間", csv: "time", cell: function (r) { return r.ts ? new Date(r.ts).toISOString().slice(0, 16).replace("T", " ") : "—"; }, raw: function (r) { return r.ts ? new Date(r.ts).toISOString() : ""; } },
        { key: "vs",   label: "形式", csv: "format", cell: function (r) { return r.vs; }, raw: function (r) { return r.vs; } },
        { key: "mode", label: "模式", csv: "mode", cell: function (r) { return HL.battleMode.labelOf(r.mode); }, raw: function (r) { return r.mode; } },
        { key: "cond", label: "勝負條件", csv: "win_condition", cell: function (r) { return HL.battleMode.winCondOf(r.mode); }, raw: function (r) { return HL.battleMode.winCondOf(r.mode); } },
        { key: "game", label: "遊戲", csv: "game", cell: function (r) { return r.game; }, raw: function (r) { return r.game; } },
        { key: "rounds", label: "回合", csv: "rounds", cell: function (r) { return String(r.rounds); }, raw: function (r) { return r.rounds; } },
        { key: "wager", label: "賭注", csv: "wager", cell: function (r) { return money(r.wager); }, raw: function (r) { return r.wager; } },
        // 欄名依模式而變＝報表不自己宣稱「總分越高越好」（terminal 模式的判準是最後一輪增量）
        { key: "metric", label: "我的排名量", csv: "my_metric", cell: function (r) { return money(r.metric) + "（" + HL.battleMode.displayMetricLabel(r.mode) + "）"; }, raw: function (r) { return r.metric; } },
        { key: "opp",  label: "對手", csv: "opponents", cell: function (r) { return r.opp; }, raw: function (r) { return r.opp; } },
        { key: "win",  label: "勝負", csv: "result", cell: function (r) { return r.win ? "勝" : "敗"; }, raw: function (r) { return r.win ? "win" : "lose"; } },
        { key: "net",  label: "淨額", csv: "net", cell: function (r) { return (r.net >= 0 ? "+" : "-") + money(Math.abs(r.net)); }, raw: function (r) { return r.net; } }
      ],
      rows: function () { return battleRows(); },
      avail: function () { return !!(HL.battleMode && statSummary().matches); }
    });
  }

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
  function isBusyView() { var v = HL.state.get().view; return v === "vsslot" || v === "bounty" || v === "duel" || v === "slot" || v === "game"; }
  function endMyRoom(r) {
    var st = HL.state.get();
    var member = HL.auth && HL.auth.backend() && HL.auth.user();
    var net;
    // 會員模式：自建房為沙盒，不動真實雲端餘額（真實餘額只由伺服器 RPC 變動）
    if (r.type === "bounty") { if (!member) HL.state.set({ balance: st.balance + r.prizePool }); }
    else { if (!member) HL.state.set({ balance: st.balance + (r.net || 0) }); }
    net = roomNet(r);   // §5 #11：回報淨額走單一出口；上面的餘額變動語意不變
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
    if (HL.site && HL.site.isLive()) return; // 真站：無假競技場房間、無假玩家挑戰模擬（不再生成/推進假房）
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
  function closeModals() { HL.ui.closeAll(); }

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
    if (HL.rg && !HL.rg.check(total)) return;   // #86：開賞金房＝把押金+開房費投入賭局 ⇒ 同受玩家自設限額；check() 只評估不累加（累加仍只在 liveStats）
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
    /* 你真正會被扣的錢＝**一份賭注**，而且是在對戰開打前（vsslot 的 escrow）才扣。
     * 舊版 footer 寫的是 `wager × 遊戲數 × (贊助 ? 人數 : 1)`（例：3 款 → 「投入 NT$3,000」），
     * 那個數字既是建房時真的被扣掉的（且無回頭路），又與整場只用 1 份注結算的事實矛盾。 */
    function cost() { return p.wager; }
    function renderGames() {
      var q = (searchInput.value || "").toLowerCase();
      HL.dom.clear(gamesGrid);
      lib.filter(function (g) { return !q || g.title.toLowerCase().indexOf(q) >= 0; }).forEach(function (g) {
        gamesGrid.appendChild(HL.dom.pressable(el("div", { class: "ax-bcard" + (isSel(g) ? " is-sel" : ""), style: "background:linear-gradient(160deg," + g.c1 + "," + g.c2 + ")", onClick: function () { toggleG(g); } }, [
          g.playable ? el("span", { class: "ax-bcard__play", text: "▶ 可玩" }) : null,
          el("span", { class: "ax-bcard__chk", text: isSel(g) ? "✓" : "" }),
          el("div", { class: "ax-bcard__name", text: g.title })
        ])));
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
      footEl.appendChild(stat("10", "Rounds"));
      footEl.appendChild(stat(money(c), "賭注（開打時扣）", "ax-gold"));
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
            /* 🤝 曾經寫「你負擔所有玩家入場費」，但對戰本體完全不看這個旗標（vsslot 全檔零命中 sponsored）
             * ⇒ 建房端照 `× 人數` 收了錢、卻沒有任何一席被豁免＝收了錢什麼都沒發生。
             * 與同一張表單的 Shared／Team 一樣改標「示意」（未實作），不再收費、也不再承諾。 */
            prefRow("🤝", "贊助房間 Sponsored（示意）", "對戰本體尚未實作豁免，目前僅標記", function () { return p.sponsored; }, function (v) { p.sponsored = v; if (v) HL.ui.toast("Sponsored（房主代付）示意，本版不改變收費", "warn"); refreshFoot(); })
          ]),
          row("賭注", seg([{ v: 100, t: "100" }, { v: 500, t: "500" }, { v: 1000, t: "1000" }, { v: 2000, t: "2000" }, { v: 5000, t: "5000" }], p.wager, function (v) { p.wager = v; refreshFoot(); }))
        ]),
        el("div", { class: "ax-bc__right" }, [
          el("div", { class: "ax-bsearch" }, [el("span", { class: "ax-search__ic", text: "🔍" }), searchInput]),
          el("p", { class: "ax-muted ax-bc__hint", text: "固定 10 輪；可選多款遊戲輪流出場。引擎僅暗影儀式可真玩，其餘跑同一 FG 示意。" }),
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
  /* ---- 建立對戰（2026-08-21 前景·修「結算宣稱 +1,000 但餘額零變動」）--------------------
   * 【缺陷】收費有**兩條互不知情的路**：
   *   ① 這裡建房時扣 `c = wager × 遊戲數 × (贊助 ? 人數 : 1)`
   *   ② 進場後 `vsslot.accept()` 再 `escrowTake(room.wager)` 扣一次
   *   而結算只用 `wager` 計（`escrowSettle(win ? wager×N : 0)`、卡上寫 `net = win ? wager×(N−1) : −wager`）。
   *   ⇒ 1v1／1 款／賭注 1000：贏 = −1000−1000+2000 = **0**，結算卡卻寫「+NT$1,000」；輸 = **−2000**，卡上寫「−1,000」。
   *   選 3 款則建房扣 3,000，整場仍只用 1,000 結算 ⇒ 贏了淨 −2,000、畫面照樣寫 +1,000。
   * 【為什麼 `c` 沒有回頭路】建出來的房寫死 `mine: false` ⇒ `tick` 的 `if (r.mine)` 永不成立 ⇒
   *   `endMyRoom` 的 `balance + (r.net||0)` 走不到；而 `r.net` 全 repo 從未被寫入（grep `\.net =` 零命中）。
   *   也就是說那筆錢不是「押金」，是**憑空消失**。
   * 【修法】收費只留**一個出口**＝對戰本體的 escrow（開打前預扣、離場即棄局、結算付回全桌注，
   *   而且那條路已有 node 恆等測項證明淨額等於卡上的 net）。建房端只做「買得起嗎」的前置檢查，不扣款。
   *   ⇒ 這也讓「多選幾款遊戲」不再偷偷變成「賭注乘以款數」——款數只決定出場遊戲，不決定你付多少。 */
  function createBattle(p) {
    var st = HL.state.get();
    if (!p.games.length) { HL.ui.toast("請選至少一款遊戲", "warn"); return; }
    if (p.wager > st.balance) { HL.ui.toast("餘額不足", "err"); return; }
    // 責任博弈只在**真正扣款那一刻**評估＝vsslot.accept()；這裡不重複 check（會把同一注算兩次）
    var seats = [{ name: "你", av: "👑" }];
    for (var i = 1; i < p.players; i++) seats.push(null); // 其餘對戰時由 bot 補位
    var room = {
      id: "room_" + st.roomSeq, host: { name: "你", av: "👑" }, type: "vsslot", battle: true, mine: false,
      battleType: p.btype, players: p.players, games: p.games.map(function (g) { return { title: g.title, c1: g.c1, c2: g.c2, playable: !!g.playable }; }),
      rounds: 10, mode: p.mode, prefs: { fast: p.fast, ultra: p.ultra, priv: p.priv, sponsored: p.sponsored },
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
    HL.ui.tabs(tabsEl, [{ k: "all", n: "全部" }, { k: "mine", n: "我的房間" }, { k: "bounty", n: "賞金局" }, { k: "vsslot", n: "Slots Battle" }],
      function (k) { filter = k; renderTabs(); renderGrid(); },
      { isActive: function (it) { return filter === it.k; } });
  }

  function render() {
    filter = "all";
    gridEl = el("div", { class: "ax-room-grid" });
    tabsEl = el("div", { class: "ax-tabs" });
    renderTabs(); renderGrid();
    return el("div", { class: "ax-arena-pg ax-fade-in" }, [
      HL.ui.sectionTitle("🏟️ 玩家擂台", { extras: [
        el("button", { class: "ax-btn-primary ax-arena__create", text: "＋ 開房發起挑戰", onClick: createModal })
      ] }),
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

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
    rankBy: function (mode, entries, tieRoll) { return BM.rankBy(mode, entries, tieRoll); },
    tieAtTop: function (mode, entries) { return BM.tieAtTop(mode, entries); },
    // 結算一場：totals/lastDeltas 皆對齊席位索引；myIdx 預設 0（你）。回傳 {win,net,winnerIdx,order}
    /* tieRoll（選用，0–1）：平手時的公平裁決值。不給的話 rankBy 會退回席位順序＝索引 0（你）恆勝，
     * 所以**玩家面向的呼叫必須給**（下方 finishLocal 從 HL.fair 取）。node 測項可省略以保持可重現。 */
    resolve: function (mode, totals, lastDeltas, wager, myIdx, tieRoll) {
      myIdx = myIdx || 0;
      var n = totals.length;
      var entries = totals.map(function (t, i) { return { i: i, total: t, last: (lastDeltas && lastDeltas[i]) || 0 }; });
      var order = CORE.rankBy(mode, entries, tieRoll);
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
  // 棄局：escrow 已預扣、不退還，據實記一筆敗局。回傳是否真的有在途賭注（供呼叫端決定要不要提示）。
  function forfeitEscrow() {
    if (escrow <= 0) return false;
    var lost = escrow;
    escrow = 0;                                    // 已預扣、不退還
    if (HL.liveStats) HL.liveStats.record("Slots Battle", lost, 0);   // 據實記一筆敗局（餘額已扣）
    return lost;
  }
  function leaveBattle() {                         // 對戰進行中按返回＝棄局
    var lost = forfeitEscrow();
    if (lost) HL.ui.toast("已棄局，賭注 " + HL.dom.money(lost) + " 不退還", "warn");
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
  /* ---- 陣容（2026-08-21 · 修「接受配對時看到的對手不是開打時的對手」）--------------------
   * 【缺陷】buildPlayers() 被 phaseFound 與 phaseGame **各叫一次**，而空席位是每次現抽
   *   `HL.mock.makeHost()`（每次都是新人）⇒ 你在「✅ 配對成功」看到的頭像與名字，開打後全換掉；
   *   1v1 自建房是 **100% 換人**（seats 濾掉「你」之後 pool 為空，必抽新的），戰績記的是後者。
   * 【修法】陣容只決定一次並**寫回 room.seats**（同一間房再進來也是同一批人），
   *   之後兩個相位都讀同一份。 */
  function buildPlayers() {
    var n = room.players;
    if (room._lineup && room._lineup.length === n) return room._lineup;
    var list = [{ name: "你", av: "👑", me: true }];
    var pool = (room.seats || []).filter(function (s) { return s && s.name !== "你"; });
    for (var i = 1; i < n; i++) { var p = pool[i - 1] || HL.mock.makeHost(); list.push({ name: p.name, av: p.av, me: false }); }
    room._lineup = list;
    room.seats = list.map(function (p) { return { name: p.name, av: p.av }; });   // 大廳的席位格也對上同一批人
    return list;
  }
  function speed() { var p = room.prefs || {}; return p.ultra ? 0.35 : p.fast ? 0.6 : 1; }
  // 模式名稱與勝負條件一律走 core/battle-mode.js（檔頭明令的一份真相；本檔曾自寫兩份）
  function modeLabel() { return HL.battleMode.labelOf(room.mode); }
  function winCondText() { return HL.battleMode.winCondOf(room.mode); }
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
    later(phaseFound, HL.battleTempo.ms("match_search", speed()));
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
      clearTimers();
      acceptBtn.setAttribute("disabled", ""); declineBtn.setAttribute("disabled", "");
      cards[0].querySelector(".ax-mm__ok").textContent = "✔ 已接受"; cards[0].classList.add("is-ok");
      statusEl.textContent = "等待對手接受…";
      var i = 1;
      (function next() {
        if (i >= cards.length) { commitCountdown(statusEl); return; }
        cards[i].querySelector(".ax-mm__ok").textContent = "✔ 已接受"; cards[i].classList.add("is-ok"); i++;
        later(next, HL.battleTempo.ms("seat_fill", speed()));
      })();
    }

    /* ---- 鎖房承諾倒數（S4）：整套節奏的支點，原本完全不存在 ------------------------------
     * 【舊版】全員就緒後一個裸 700ms 空拍就直接進場：沒有倒數、沒有封盤宣告、沒有承諾語意，
     *   而賭注是在「按下接受」的瞬間就扣掉的——玩家還沒看清陣容錢就沒了。
     * 【現在】3-2-1 逐秒倒數（結構拍，ultra 也有 2.1s），期間畫面明說勝負條件，
     *   **倒數歸零才是唯一的扣款點**（escrowTake）。倒數期間離開＝還沒扣錢，不必棄局。
     * 對照外部：cases.gg 實測 createdAt→startsAt 6.2–6.9s（等 EOS +8 區塊）、Crazy Time 15s、
     *   Lightning Roulette 18s；我們沒有區塊錨點，只需「夠讓 N 格頭像亮完 + 讀完規則」＝3s。 */
    function commitCountdown(statusEl) {
      var sp = speed(), total = HL.battleTempo.ms("commit", sp);
      if (root) root.setAttribute("data-beat", "commit");
      var n = Math.max(1, Math.round(total / 1000));
      var tick = Math.round(total / n);
      (function step(k) {
        if (k <= 0) {
          statusEl.textContent = "已封盤 · 開始！";
          escrowTake(room.wager);        // ← 唯一的硬性 commit（倒數歸零那一刻才扣）
          later(phaseGame, Math.min(300, tick));
          return;
        }
        HL.dom.clear(statusEl);
        statusEl.appendChild(el("b", { class: "ax-gold", text: String(k) }));
        statusEl.appendChild(document.createTextNode(
          "　全員就緒 · " + HL.battleMode.labelOf(room.mode) + "：" + HL.battleMode.winCondOf(room.mode) + " · 賭注將於歸零時扣款"));
        later(function () { step(k - 1); }, tick);
      })(n);
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

    /* ---- 對戰中的資訊顯示（2026-08-21 · 規格點名「本輪最大缺口」）------------------------
     * 【缺陷】每席只有頭像/名字/盤面/一個數字，小字寫死「總分」，而 crazy 是最低分勝、
     *   terminal 是比最後一輪增量 ⇒ 十輪裡九輪的數字與勝負無關，玩家看著分數上升其實正在輸。
     *   全檔沒有名次、沒有與領先者的差距、沒有本輪增量、沒有領先高亮、沒有勝負條件——
     *   名次第一次出現是在結算卡。四人房就是四個等權裸數字並排。
     * 【修法】每席補：名次徽章 #k/N ／主數字＝`metricOf`（terminal 就是本輪增量、累計退副行）／
     *   本輪增量獨立一行 ／ 與第一名的差距 ／ 領先高亮（走 `leaderIndex`）／ 跑完狀態字；
     *   infoBar 補常駐勝負條件與「還剩 R 輪」。**所有語意一律問 HL.battleMode，不自己比大小。** */
    var BM = HL.battleMode, T = HL.battleTempo;
    var sides = players.map(function (p, idx) {
      var boardEl = el("div", { class: "ax-vs__board" });
      var rankEl = el("span", { class: "ax-vs__rank", text: "#" + (idx + 1) + "/" + players.length });
      var stateEl = el("span", { class: "ax-vs__state ax-muted", text: "" });
      var totalEl = el("div", { class: "ax-vs__total", text: money(0) });
      var metricLbl = el("small", { class: "ax-muted", text: BM.displayMetricLabel(room.mode) });
      var subEl = el("small", { class: "ax-vs__sub ax-muted", text: "" });     // 副行：累計（terminal 用）
      var deltaEl = el("small", { class: "ax-vs__delta ax-muted", text: "" }); // 本輪增量
      var gapEl = el("small", { class: "ax-vs__gap ax-muted", text: "" });     // 與第一名的差距
      var side = el("div", { class: "ax-vs__side " + (p.me ? "me" : "opp") }, [
        el("div", { class: "ax-vs__head" }, [
          rankEl, el("span", { class: "ax-vs__av", text: p.av }), el("span", { class: "ax-vs__name", text: p.name }), stateEl
        ]),
        boardEl,
        el("div", { class: "ax-vs__score" }, [metricLbl, totalEl, subEl, deltaEl, gapEl])
      ]);
      return {
        p: p, boardEl: boardEl, totalEl: totalEl, side: side, board: null,
        rankEl: rankEl, stateEl: stateEl, subEl: subEl, deltaEl: deltaEl, gapEl: gapEl,
        cum: 0, last: 0
      };
    });

    /* 一次把「誰第幾名、差多少、誰領先」全部重算並寫上畫面。
     * 只有這一個出口會動這些節點 ⇒ 不會出現兩處各自計算而漂移。 */
    function refreshStandings() {
      var entries = sides.map(function (s) { return { total: s.cum, last: s.last }; });
      var order = BM.rankBy(room.mode, entries);          // 最佳在前
      var leadIdx = BM.leaderIndex(room.mode, entries);
      var leaderMetric = leadIdx >= 0 ? BM.metricOf(room.mode, entries[leadIdx]) : 0;
      var isLast = BM.spec(room.mode).metric === "last";
      sides.forEach(function (s, i) {
        var e = entries[i], m = BM.metricOf(room.mode, e);
        var rank = order.indexOf(e) + 1;
        s.rankEl.textContent = "#" + rank + "/" + sides.length;
        s.rankEl.classList.toggle("is-lead", i === leadIdx);
        s.side.classList.toggle("is-lead", i === leadIdx);
        s.totalEl.textContent = money(m);
        s.subEl.textContent = isLast ? ("累計 " + money(s.cum)) : "";
        // crazy 下「得分」是壞事 ⇒ 不用金色「+」語意
        s.deltaEl.textContent = s.last ? ("本輪 " + (BM.lowerBetter(room.mode) ? "+" + money(s.last) + "（越低越好）" : "+" + money(s.last))) : "";
        s.deltaEl.className = "ax-vs__delta " + (BM.lowerBetter(room.mode) ? "ax-red" : "ax-green");
        var gap = BM.gapTo(room.mode, m, leaderMetric);
        // 差距 0 且不是領先者＝與第一名同分（開局全 0 時每一席都是這樣）⇒ 別寫「距第一 NT$ 0」
        s.gapEl.textContent = i === leadIdx
          ? (sides.length > 1 ? "領先" : "")
          : (gap === 0 ? "並列第一" : "距第一 " + money(gap));
      });
    }

    var vsNodes = [];
    sides.forEach(function (s, i) {
      if (i) vsNodes.push(el("div", { class: "ax-vs__mid" }, [el("div", { class: "ax-vs__vs", text: "VS" })]));
      vsNodes.push(s.side);
    });

    // 勝負條件必須**常駐**（不是只有一顆徽章）：crazy/terminal 是反直覺規則，只給徽章玩家必看反
    var leftEl = el("span", { class: "ax-battle__left ax-muted", text: "還剩 " + rounds + " 輪" });
    var infoBar = el("div", { class: "ax-battle__info" }, [
      roundEl, el("span", { class: "ax-muted", text: "　·　" }), leftEl,
      el("span", { class: "ax-muted", text: "　·　" }), gameEl,
      el("span", { class: "ax-battle__mode", text: modeLabel() + "：" + winCondText() }),
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
        popTone: BM.lowerBetter(room.mode) ? "bad" : "good",   // crazy：得分是壞事 ⇒ 彈分不用金色
        /* ⚠️ 刻意**不再**在這裡即時寫計分板（舊版 Demo 路徑是 `s.totalEl.textContent = money(t)`）：
         * 各盤面連爆長度不同 ⇒ 空窗期畫面上會並存「本輪值」與「上一輪值」，並排比較會判錯領先者。
         * 會員模式本來就是一起揭曉（237-241），兩條路徑的一致性語意必須統一 ⇒ 一律等本輪全員跑完再揭曉。 */
        onWin: function () { /* 逐爆演出留給 fgboard 自己（popup/高亮）；分數統一在輪末揭曉 */ }
      });
    });

    var roundData = []; // 每輪：各 side 累計分（對齊 sides 索引），供回放
    var rIdx = 0;
    /* 每一拍把狀態寫進 DOM：headless 驗不到 rAF 與 CSS transition，但**驗得到 class 與 data 屬性**。
     * 不狀態化的話，這輪調好的節奏下一輪就會被改壞而沒人發現。 */
    function setBeat(name) { if (root) root.setAttribute("data-beat", name); }
    function runRound() {
      if (!document.body.contains(sides[0].boardEl)) return;
      if (rIdx >= rounds) return finish();
      // 決勝輪蓄勢：第 10 輪與第 3 輪原本節奏完全一樣，勝負就這樣「掉出來」
      if (rIdx === rounds - 1 && !runRound._prepped) {
        runRound._prepped = true;
        setBeat("final-prep");
        root.classList.add("is-final-round");
        var prepMs = T.finalPrepMs(room.mode, sp);
        roundEl.textContent = "決勝輪 " + rounds + " / " + rounds;
        leftEl.textContent = BM.spec(room.mode).metric === "last" ? "只有這一輪算分" : "最後一輪";
        later(runRound, prepMs);
        return;
      }
      var g = games[rIdx % games.length];
      roundEl.textContent = "Round " + (rIdx + 1) + " / " + rounds;
      leftEl.textContent = "還剩 " + (rounds - rIdx) + " 輪";
      gameEl.textContent = g.title;
      sides.forEach(function (s) { s.stateEl.textContent = "進行中"; s.side.classList.remove("is-done"); });
      var done = 0;
      function d(who) {
        if (who) { who.stateEl.textContent = "已完成"; who.side.classList.add("is-done"); }  // 先跑完的席位不再死寂
        if (++done < sides.length) return;
        /* ── 本輪全員跑完 → 揭曉 → 停留 → 下一輪。這三拍原本全部不存在（只有 380×sp 一個空檔）──
         * ROUND_REVEAL：跨席位錯開，順序刻意是「目前最差者先、領先者最後」
         *   ⇒ 每一輪都重演一次「他會不會被超車」。
         * ROUND_SCORE（round_result）：這是全場最缺的一拍——沒有它，玩家沒有時間讀「這輪誰贏了」。 */
        var prev = roundData.length ? roundData[roundData.length - 1] : sides.map(function () { return 0; });
        var cums = SRV
          ? sides.map(function (_, i) { return (SRV.seats[i] && +SRV.seats[i].rounds[rIdx]) || 0; })
          : sides.map(function (s) { return s.board.getTotal(); });
        // 揭曉順序：依「揭曉前的名次」由差到好（領先者最後）
        var pre = sides.map(function (s, i) { return { i: i, total: s.cum, last: s.last }; });
        var worstFirst = BM.rankBy(room.mode, pre).slice().reverse().map(function (e) { return e.i; });
        setBeat("round-reveal");
        var stg = T.ms("reveal_stagger", sp);
        worstFirst.forEach(function (si, k) {
          later(function () {
            sides[si].cum = cums[si]; sides[si].last = cums[si] - (prev[si] || 0);
            sides[si].side.classList.add("is-reveal");
            refreshStandings();
            later(function () { sides[si].side.classList.remove("is-reveal"); }, stg);
          }, k * stg);
        });
        var revealTotal = worstFirst.length * stg;
        later(function () {
          setBeat("round-score");
          roundData.push(cums);
          rIdx++;
          var pad = T.liveRoundPad(revealTotal + T.ms("roll", sp));   // 真站：每輪總長下限
          later(function () { setBeat("round-gap"); later(runRound, T.ms("round_gap", sp)); },
            T.ms("round_result", sp) + pad);
        }, revealTotal);
      }
      /* 起轉跨席位錯開：原本 N 個盤面同一 tick 全炸開＝視覺無層次、眼睛沒有掃視順序。 */
      setBeat("round-spin");
      sides.forEach(function (s, i) {
        later(function () { s.board.spin(function () { d(s); }); }, i * T.ms("spin_stagger", sp));
      });
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
        room.mode !== "normal" ? el("p", { class: "ax-muted", text: modeLabel() + "：" + winCondText() }) : null,
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
    /* ---- 勝負揭曉的四拍（S9 懸念 → S10 高潮 → 結算卡）------------------------------------
     * 【舊版】最後一輪跑完後經**同一個 380×sp 空檔**直接 finish()：第 10 輪與第 3 輪節奏一樣、
     *   結算卡與輪間空檔同長、而 `escrowSettle` 在 `renderResult` 之前就把餘額改掉
     *   ⇒ **餘額比動畫先跳**（規格點名這是「顯示 BUG」的體感來源之一）。
     * 【現在】懸念（分數定格）→ 敗方灰化（先掃輸，輪盤 take-and-pay 慣例）→ 獎池飛向勝方
     *   → **最後才更新餘額** → 結算卡淡入。四拍都走節奏表、都寫 data-beat 供驗證。 */
    function climaxThen(winnerIdx, payout, done) {
      setBeat("suspense");
      root.classList.add("is-suspense");
      later(function () {
        setBeat("climax-lose");
        sides.forEach(function (s, i) { if (i !== winnerIdx) s.side.classList.add("is-eliminated"); });
        later(function () {
          setBeat("climax-win");
          if (sides[winnerIdx]) sides[winnerIdx].side.classList.add("is-champion");
          later(function () {
            escrowSettle(payout);          // ← 餘額在動畫**之後**才動
            setBeat("settled");
            root.classList.remove("is-suspense");
            later(done, T.ms("settle_card", sp));
          }, T.ms("climax_win", sp));
        }, T.ms("climax_lose", sp));
      }, T.ms("suspense", sp));
    }

    function finishLocal() {
      var totals = sides.map(function (s) { return s.board.getTotal(); });
      var lastDelta = lastDeltas(totals, roundData);
      var tieRoll = (HL.fair && HL.fair.floatOr) ? HL.fair.floatOr("vsslot") : Math.random();
      var R = CORE.resolve(room.mode, totals, lastDelta, room.wager, 0, tieRoll); // 平手由可驗證公平裁決，不再由席位順序決定
      var win = R.win, net = R.net;
      var payout = win ? room.wager * sides.length : 0;   // escrow 已扣 wager ⇒ 贏家通吃付回全桌注（淨效果同 net）
      if (HL.liveStats) HL.liveStats.record("Slots Battle", room.wager, payout);
      bumpRoom(win);
      var rec = makeRec(totals, roundData, win, net, sides[R.winnerIdx].p.name);
      if (!room.mine && HL.arenaStats && HL.arenaStats.record) HL.arenaStats.record(rec);
      climaxThen(R.winnerIdx, payout, function () { renderResult(totals, lastDelta, win, net, rec); });
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
        if (HL.liveStats) HL.liveStats.record("Slots Battle", room.wager, win ? room.wager + net : 0); // 伺服器結算值
        bumpRoom(win);
        // 兩條路徑同一套高潮節奏；**餘額也一律排在動畫之後**（伺服器權威值同樣不得比動畫先跳）
        climaxThen(R.winnerIdx, 0, function () {
          var oldHist = (HL.state.get().arenaStats && HL.state.get().arenaStats.history) || [];
          escrow = 0;   // 伺服器的 R.balance 是權威值（已含本局結算）⇒ 這裡只清 escrow 標記，不得再重複加
          HL.state.set({ balance: +R.balance, arenaStats: Object.assign({ history: [rec].concat(oldHist).slice(0, 30) }, R.stats) });
          HL.shell.refreshChrome();
          renderResult(totals, lastDeltas(totals, rd), win, net, rec);
        });
      })(SRV);
    }
    refreshStandings();   // 開場就把名次/勝負條件/差距擺上畫面（不要等第一輪跑完才出現）
    /* 開打前先向伺服器要結果（會員模式）。拿不到就照舊純前端演＋純前端結算＝零回歸。 */
    if (!memberMode) { later(runRound, T.ms("first_spin_lead", sp)); }
    else {
      resultEl.appendChild(el("div", { class: "ax-muted", text: "連線對戰伺服器…" }));
      HL.api.playBattle({
        wager: room.wager, players: sides.length, mode: room.mode, rounds: rounds,
        roster: sides.map(function (s) { return { name: s.p.name, av: s.p.av }; }),
        game: games.map(function (g) { return g.title; }).join(" / ")
      }).then(function (R) {
        if (R && R.seats) SRV = R;
        HL.dom.clear(resultEl); later(runRound, T.ms("first_spin_lead", sp));
      }).catch(function () { HL.dom.clear(resultEl); later(runRound, T.ms("first_spin_lead", sp)); });
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
    /* 離場鉤：底部導覽／側邊抽屜換頁走的是 mountView，不經過 view 內的返回連結，
     * 也不經過關閉 PiP ⇒ 沒有這一行，已預扣的賭注會被靜默沒收（不記敗局、無 toast）。 */
    if (HL.shell && HL.shell.onExit) HL.shell.onExit(function () {
      clearTimers();
      var lost = forfeitEscrow();
      if (lost && HL.ui && HL.ui.toast) HL.ui.toast("已離開對戰，賭注 " + HL.dom.money(lost) + " 不退還", "warn");
    });
    root = el("div", { class: "ax-duel ax-fade-in" });
    phaseSearching();
    // 套入遊戲外框公版（全螢幕/劇院/子母畫面）
    /* onTeardown：外框被真正關掉（例如關閉子母畫面而原視窗已不在）時，這一場必須據實了結——
     * 有 escrow 在途就算棄局（錢已扣、記一筆敗局），並停掉所有計時器。
     * 不接這個鉤子的話，對戰會在一個看不見的 DOM 裡跑完並自行結算餘額（已修的 high 缺陷）。 */
    return HL.gameFrame ? HL.gameFrame.wrap(root, {
      title: "Slots Battle · " + vsLabel(), provider: "Apex Arena", key: "vsslot:" + roomId, maxWidth: "1180px",
      onTeardown: function () { clearTimers(); forfeitEscrow(); }
    }) : root;
  }

  HL.views = HL.views || {};
  HL.views.vsslot = { render: render };
})(typeof window !== "undefined" ? window : this);

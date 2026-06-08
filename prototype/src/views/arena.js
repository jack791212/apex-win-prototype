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

  function roomCard(r) {
    var isBounty = r.type === "bounty";
    var typeName = isBounty ? "賞金局" : "對押競技";
    var sub = isBounty ? (HL.mock.roomGames[r.game].name + " · " + HL.mock.volatility[r.vol].name) : ("SLOT · " + r.slot);
    var prizeLabel = isBounty ? "賞金池" : "賭注";
    var prizeVal = isBounty ? r.prizePool : r.wager;
    return el("div", { class: "ax-room-card" + (isBounty ? " is-bounty" : " is-vs") + (r.mine ? " is-mine" : ""), "data-room-id": r.id, onClick: function () { r.mine ? myRoomStatusModal(r) : enterRoom(r); } }, [
      el("div", { class: "ax-room-card__top" }, [
        el("span", { class: "ax-room-card__type", text: (r.mine ? "我的 · " : "") + typeName }),
        el("span", { class: "ax-room-card__time" }, ["⏱ ", el("span", { "data-room-time": r.id, text: fmtLeft(r.endsInSec) })])
      ]),
      el("div", { class: "ax-room-card__icon", text: isBounty ? (r.game === "flip" ? "🃏" : "💣") : "🎰" }),
      el("div", { class: "ax-room-card__title", text: isBounty ? HL.mock.roomGames[r.game].name + "賞金" : r.slot }),
      el("div", { class: "ax-room-card__sub", text: sub }),
      el("div", { class: "ax-room-card__prize" }, [el("small", { class: "ax-muted", text: prizeLabel }), el("b", { class: "ax-gold", text: money(prizeVal) })]),
      heatBar(r),
      el("div", { class: "ax-room-card__host" }, [
        el("span", { class: "ax-room-card__av", text: r.host.av }),
        el("div", {}, [el("div", { class: "ax-room-card__hn", text: r.host.name }), el("small", { class: "ax-muted", text: "發起挑戰" })])
      ]),
      el("div", { class: "ax-room-card__foot" }, [
        el("span", { class: "ax-muted ax-rc-done", text: isBounty ? ("挑戰次數 " + (r.done || 0) + "/" + r.plays) : "1v1 匹配對戰" }),
        r.mine
          ? el("button", { class: "ax-btn-join", text: "我的房間", disabled: "", onClick: function (e) { e.stopPropagation(); } })
          : el("button", { class: "ax-btn-join", text: isBounty ? "挑戰" : "接受挑戰", onClick: function (e) { e.stopPropagation(); enterRoom(r); } })
      ])
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
  function simVsslot(r) {
    var my = HL.mock.rint(700, 2600), opp = HL.mock.rint(700, 2600);
    var w = my >= opp; // 房主勝
    r.net = (r.net || 0) + (w ? r.wager : -r.wager);
    r.matches = (r.matches || 0) + 1; r.done = (r.done || 0) + 1; r.challenges++;
    if (w) r.hostEdge = (r.hostEdge || 0) + r.wager; else r.challEdge = (r.challEdge || 0) + r.wager;
    (r.log = r.log || []).push({ name: HL.mock.pick(HL.mock.fakeNames) + HL.mock.rint(10, 99), my: my, opp: opp, win: w });
  }
  var settleQueue = [];
  function isBusyView() { var v = HL.state.get().view; return v === "vsslot" || v === "bounty" || v === "duel" || v === "slot"; }
  function endMyRoom(r) {
    var st = HL.state.get();
    var net;
    if (r.type === "bounty") { HL.state.set({ balance: st.balance + r.prizePool }); net = r.prizePool - r.deposit - (r.openFee || 0); }
    else { HL.state.set({ balance: st.balance + (r.net || 0) }); net = r.net || 0; }
    HL.shell.refreshChrome();
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
    var d = card.querySelector(".ax-rc-done"); if (d) d.textContent = r.type === "bounty" ? ("挑戰次數 " + (r.done || 0) + "/" + r.plays) : "1v1 匹配對戰";
    var h = card.querySelector(".ax-heat"); if (h) { var nh = heatBar(r); h.parentNode.replaceChild(nh, h); }
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
        el("button", { class: "ax-create-opt", onClick: function () { closeModals(); vsslotForm(); } }, [el("div", { class: "ax-create-opt__ic", text: "🎰" }), el("b", { text: "對押競技" }), el("small", { class: "ax-muted", text: "指定 SLOT，雙方比分定輸贏" })])
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
    if (total > st.balance) { HL.ui.toast("餘額不足以支付押金 + 開房費（Demo）", "err"); return; }
    HL.state.set({ balance: st.balance - total }); HL.shell.refreshChrome();
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

  function vsslotForm() {
    var slots = HL.mock.casinoGames.filter(function (g) { return g.cat === "slots"; }).map(function (g) { return g.title; });
    var p = { slot: slots[0], wager: 1000 };
    var sel = el("select", { class: "ax-select" }, slots.map(function (s) { return el("option", { value: s, text: s }); }));
    sel.addEventListener("change", function () { p.slot = sel.value; });
    HL.ui.modal("開房 · 對押競技", [
      row("指定 SLOT 遊戲", sel),
      row("賭注額", seg([{ v: 500, t: "500" }, { v: 1000, t: "1000" }, { v: 2000, t: "2000" }, { v: 5000, t: "5000" }], p.wager, function (v) { p.wager = v; })),
      el("p", { class: "ax-muted", text: "雙方各演示 10 局 FG，總分高者贏得賭注；輸方支付賭注給贏方。" }),
      el("button", { class: "ax-btn-primary", text: "確認開房", onClick: function () { createVsslot(p); } }),
      el("span", { class: "ax-demo-tag", text: "Demo · 不扣真錢" })
    ]);
  }
  function createVsslot(p) {
    var st = HL.state.get();
    if (p.wager > st.balance) { HL.ui.toast("餘額不足以對此賭注開房（Demo）", "err"); return; }
    var room = { id: "room_" + st.roomSeq, host: { name: "你", av: "👑" }, type: "vsslot", slot: p.slot, wager: p.wager, plays: 5, endsInSec: 1800, challenges: 0, done: 0, hostEdge: 0, challEdge: 0, mine: true, net: 0, matches: 0, log: [] };
    var rooms = st.arenaRooms.slice(); rooms.unshift(room);
    HL.state.set({ arenaRooms: rooms, roomSeq: st.roomSeq + 1 });
    closeModals(); HL.ui.toast("開房成功！賭注 " + money(p.wager) + " 已託管（Demo）", "ok");
    filter = "all"; renderTabs(); renderGrid();
  }

  /* ---------- Tabs ---------- */
  function renderTabs() {
    if (!tabsEl) return;
    HL.dom.clear(tabsEl);
    [{ k: "all", n: "全部" }, { k: "mine", n: "我的房間" }, { k: "bounty", n: "賞金局" }, { k: "vsslot", n: "對押競技" }].forEach(function (t) {
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
      tabsEl,
      gridEl
    ]);
  }

  HL.views = HL.views || {};
  HL.views.arena = { render: render };
  // 對外開放房間卡渲染（供大廳「熱門玩家擂台」重用）
  HL.arenaUI = { roomCard: roomCard, enterRoom: enterRoom, heatBar: heatBar };
})(window);

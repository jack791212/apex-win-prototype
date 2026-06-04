/*
 * Apex Win｜賞金局（玩家開房挑戰）
 * 玩法：局主放賞金，挑戰者付押注挑戰，命中倍數即從賞金池領取。
 *   翻牌：10 張牌各藏倍數，選一張開牌；win = 押注 × min(倍數, 最高倍數)。
 *   踩地雷：避開地雷翻格累積倍數，可兌現；踩雷則輸掉本注。
 * 結束條件（次數）用盡或賞金池不足即結算，並回報局主。
 * 註冊於 window.HL.views.bounty。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var rint = function (a, b) { return HL.mock.rint(a, b); };

  var room, bet, playEl, infoEl;
  // mine round 狀態
  var mineActive, mineMult, mineBombs, mineTiles;

  function findRoom(id) { return HL.state.get().arenaRooms.filter(function (r) { return r.id === id; })[0]; }

  function refreshInfo() {
    if (!infoEl) return;
    HL.dom.clear(infoEl);
    var V = HL.mock.volatility[room.vol], G = HL.mock.roomGames[room.game];
    [["局主", room.host.av + " " + room.host.name], ["遊戲", G.name], ["震盪", V.name], ["賞金池", money(room.prizePool)], ["每次最高押注", money(room.maxBet)], ["最高倍數", room.maxMult + "x"], ["剩餘次數", room.playsLeft + " / " + room.plays]].forEach(function (kv) {
      infoEl.appendChild(el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: kv[0] }), el("b", { text: kv[1] })]));
    });
  }

  function endRoom() {
    var refund = room.host.name === "你" ? room.prizePool : 0;
    if (refund) { HL.state.set({ balance: HL.state.get().balance + refund }); HL.shell.refreshChrome(); }
    HL.ui.modal("賞金局結算", [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "總挑戰次數" }), el("b", { text: String(room.challenges) })]),
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "賞金池剩餘" }), el("b", { class: "ax-gold", text: money(room.prizePool) })]),
        room.host.name === "你" ? el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "退還局主（你）" }), el("b", { class: "ax-green", text: money(refund) })]) : null
      ]),
      el("p", { class: "ax-muted", text: "已將本場結算回報局主。" }),
      el("button", { class: "ax-btn-primary", text: "返回競技場", onClick: function () { Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m) { m.remove(); }); removeRoom(); HL.router.go("arena"); } }),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料" })
    ]);
  }
  function removeRoom() {
    var rooms = HL.state.get().arenaRooms.filter(function (r) { return r.id !== room.id; });
    HL.state.set({ arenaRooms: rooms });
  }

  function chargeOK() {
    if (room.playsLeft <= 0) { HL.ui.toast("本場次數已用盡", "warn"); return false; }
    if (bet > HL.state.get().balance) { HL.ui.toast("餘額不足", "err"); return false; }
    return true;
  }
  function afterPlay(win) {
    var st = HL.state.get();
    HL.state.set({ balance: st.balance - bet + win });
    room.prizePool = Math.max(0, room.prizePool + bet - win);
    room.playsLeft--; room.done = (room.done || 0) + 1; room.challenges++;
    var net = bet - win;
    if (net >= 0) room.hostEdge = (room.hostEdge || 0) + net; else room.challEdge = (room.challEdge || 0) + (-net);
    HL.shell.refreshChrome(); refreshInfo();
    if (room.playsLeft <= 0 || room.prizePool < room.maxBet * room.maxMult) {
      setTimeout(endRoom, 800);
    }
  }

  /* ---------- 翻牌 ---------- */
  function renderFlip() {
    HL.dom.clear(playEl);
    var mults = HL.mock.volatility[room.vol].mults.slice();
    // 洗牌
    for (var i = mults.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = mults[i]; mults[i] = mults[j]; mults[j] = t; }
    var grid = el("div", { class: "ax-flip-grid" });
    var picked = false;
    mults.forEach(function (m) {
      var card = el("button", { class: "ax-flip" }, [el("span", { class: "ax-flip__back", text: "?" })]);
      card.addEventListener("click", function () {
        if (picked) return;
        if (!chargeOK()) return;
        picked = true;
        var mult = Math.min(m, room.maxMult);
        var win = bet * mult;
        card.classList.add(win > 0 ? "is-win" : "is-zero");
        HL.dom.clear(card); card.appendChild(el("span", { class: "ax-flip__face", text: "x" + m }));
        HL.ui.toast(win > 0 ? "命中 x" + mult + "，領取 " + money(win) : "未命中（x0）", win > 0 ? "ok" : "warn");
        afterPlay(win);
        // 短暫顯示後可再抽一批
        setTimeout(function () { if (room.playsLeft > 0) renderFlip(); }, 900);
      });
      grid.appendChild(card);
    });
    playEl.appendChild(el("p", { class: "ax-muted", text: "選一張牌開牌挑戰（每次扣押注 " + money(bet) + "）" }));
    playEl.appendChild(grid);
  }

  /* ---------- 踩地雷 ---------- */
  function renderMine() {
    HL.dom.clear(playEl);
    mineActive = false; mineMult = 0;
    mineBombs = room.vol === "high" ? 4 : room.vol === "mid" ? 3 : 2;
    var step = mineBombs * 0.4 + 0.2;
    var TILES = 12;

    var statusEl = el("div", { class: "ax-mine__status", text: "按「開始挑戰」翻格累積倍數，踩雷則輸；隨時可兌現。" });
    var multEl = el("b", { class: "ax-gold", text: "x0.00" });
    var grid = el("div", { class: "ax-mine-grid" });

    function layout() {
      HL.dom.clear(grid);
      mineTiles = [];
      var bombSet = {};
      while (Object.keys(bombSet).length < mineBombs) bombSet[rint(0, TILES - 1)] = true;
      for (var k = 0; k < TILES; k++) (function (idx) {
        var bomb = !!bombSet[idx];
        var tile = el("button", { class: "ax-mine" }, [el("span", { text: "?" })]);
        tile.addEventListener("click", function () {
          if (!mineActive || tile.classList.contains("done")) return;
          tile.classList.add("done");
          if (bomb) {
            tile.classList.add("is-bomb"); HL.dom.clear(tile); tile.appendChild(el("span", { text: "💣" }));
            mineActive = false; statusEl.textContent = "踩到地雷！本注輸掉。";
            HL.ui.toast("踩雷，輸掉 " + money(bet), "err");
            afterPlay(0);
            setTimeout(function () { if (room.playsLeft > 0) renderMine(); }, 1100);
          } else {
            tile.classList.add("is-gem"); HL.dom.clear(tile); tile.appendChild(el("span", { text: "💎" }));
            mineMult += step; multEl.textContent = "x" + mineMult.toFixed(2);
          }
        });
        mineTiles.push(tile); grid.appendChild(tile);
      })(k);
    }
    layout();

    var startBtn = el("button", { class: "ax-btn-primary", text: "開始挑戰（押 " + money(bet) + "）" });
    var cashBtn = el("button", { class: "ax-btn-ghost", text: "兌現", disabled: "" });
    startBtn.addEventListener("click", function () {
      if (mineActive) return;
      if (!chargeOK()) return;
      mineActive = true; mineMult = 0; multEl.textContent = "x0.00";
      cashBtn.removeAttribute("disabled");
      statusEl.textContent = "翻開格子；💎 累積倍數，💣 出局。地雷數：" + mineBombs;
      layout();
    });
    cashBtn.addEventListener("click", function () {
      if (!mineActive) return;
      mineActive = false; cashBtn.setAttribute("disabled", "");
      var mult = Math.min(mineMult, room.maxMult);
      var win = Math.round(bet * mult);
      statusEl.textContent = "兌現 x" + mult.toFixed(2) + "，獲得 " + money(win);
      HL.ui.toast("兌現獲得 " + money(win), win > 0 ? "ok" : "warn");
      afterPlay(win);
      setTimeout(function () { if (room.playsLeft > 0) renderMine(); }, 1100);
    });

    playEl.appendChild(el("div", { class: "ax-mine__bar" }, [statusEl, el("div", {}, ["目前倍數 ", multEl])]));
    playEl.appendChild(grid);
    playEl.appendChild(el("div", { class: "ax-mine__btns" }, [startBtn, cashBtn]));
  }

  function renderPlay() { room.game === "flip" ? renderFlip() : renderMine(); }

  function stakeBar() {
    var opts = [10, 50, 100, 500].filter(function (v) { return v <= room.maxBet; });
    if (!opts.length) opts = [room.maxBet];
    bet = opts[Math.min(1, opts.length - 1)];
    var wrap = el("div", { class: "ax-stakes" });
    opts.forEach(function (v) {
      wrap.appendChild(el("button", { class: "ax-stake" + (v === bet ? " is-picked" : ""), text: String(v), onClick: function () { bet = v; Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove("is-picked"); }); this.classList.add("is-picked"); renderPlay(); } }));
    });
    return wrap;
  }

  function render(roomId) {
    room = findRoom(roomId);
    if (!room) {
      return el("div", { class: "ax-duel" }, [el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }), el("div", { class: "ax-panel", text: "此房間已結束。" })]);
    }
    infoEl = el("div", { class: "ax-room-info" });
    playEl = el("div", { class: "ax-room-play" });
    refreshInfo();

    var node = el("div", { class: "ax-duel ax-fade-in" }, [
      el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }),
      el("div", { class: "ax-duel__top" }, [
        el("div", {}, [el("div", { class: "ax-duel__title", text: "賞金局 · " + HL.mock.roomGames[room.game].name }), el("span", { class: "ax-demo-tag", text: "Demo 玩法" })]),
        el("div", { class: "ax-stat" }, [el("small", { text: "你的餘額" }), el("b", { id: "ax-duel-balance", text: money(HL.state.get().balance) })])
      ]),
      el("div", { class: "ax-room-detail" }, [
        el("div", {}, [infoEl, el("div", { class: "ax-room-stake" }, [el("div", { class: "ax-muted", text: "選擇押注額" }), stakeBar()])]),
        el("div", { class: "ax-arena" }, [playEl])
      ])
    ]);
    renderPlay();
    return node;
  }

  HL.views = HL.views || {};
  HL.views.bounty = { render: render };
})(window);

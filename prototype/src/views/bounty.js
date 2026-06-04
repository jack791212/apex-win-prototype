/*
 * Apex Win｜賞金局（玩家開房挑戰）
 * 翻牌（新版）：10 張卡依震盪配置「固定彩金」，總和 = 每次費用 × 10 / 翻牌數（RTP 100%）。
 *   流程：開始挑戰（扣費用）→ 逐一開卡（最多翻 K 張，開到彩金有動畫）→
 *         翻滿 K 張 → 其餘卡壓黑揭示 → 結算本次贏得 → 再挑戰 / 結束。
 * 踩地雷：避雷翻格累積倍數、可兌現（沿用）。
 * 次數用盡即整場結算，回報局主。註冊於 window.HL.views.bounty。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var rint = function (a, b) { return HL.mock.rint(a, b); };

  var room, bet, playEl, infoEl;
  // 翻牌狀態
  var fCards, fFlipped, fWin, fPhase;
  // 踩地雷狀態
  var mineActive, mineMult, mineBombs;

  function findRoom(id) { return HL.state.get().arenaRooms.filter(function (r) { return r.id === id; })[0]; }
  function removeRoom() { HL.state.set({ arenaRooms: HL.state.get().arenaRooms.filter(function (r) { return r.id !== room.id; }) }); }

  function refreshInfo() {
    if (!infoEl) return;
    HL.dom.clear(infoEl);
    var V = HL.mock.volatility[room.vol], G = HL.mock.roomGames[room.game];
    var kv = room.game === "flip"
      ? [["局主", room.host.av + " " + room.host.name], ["遊戲", G.name], ["震盪", V.name], ["賞金池", money(room.prizePool)], ["每次費用", money(room.cost)], ["每次翻牌", room.flips + " / 10 張"], ["剩餘次數", room.playsLeft + " / " + room.plays]]
      : [["局主", room.host.av + " " + room.host.name], ["遊戲", G.name], ["震盪", V.name], ["賞金池", money(room.prizePool)], ["每次最高押注", money(room.maxBet)], ["最高倍數", room.maxMult + "x"], ["剩餘次數", room.playsLeft + " / " + room.plays]];
    kv.forEach(function (p) { infoEl.appendChild(el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: p[0] }), el("b", { text: p[1] })])); });
  }

  function endRoom() {
    var refund = room.host.name === "你" ? room.prizePool : 0;
    if (refund) { HL.state.set({ balance: HL.state.get().balance + refund }); HL.shell.refreshChrome(); }
    HL.ui.modal("賞金局結束", [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: "總挑戰次數" }), el("b", { text: String(room.challenges) })]),
        el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: "賞金池剩餘" }), el("b", { class: "ax-gold", text: money(room.prizePool) })])
      ]),
      el("p", { class: "ax-muted", text: "本場已結算並回報局主。" }),
      el("button", { class: "ax-btn-primary", text: "返回競技場", onClick: function () { Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m) { m.remove(); }); removeRoom(); HL.router.go("arena"); } }),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料" })
    ]);
  }

  /* ===================== 翻牌（新版） ===================== */
  function flipChargeOK() {
    if (room.playsLeft <= 0) { HL.ui.toast("本場次數已用盡", "warn"); return false; }
    if (room.cost > HL.state.get().balance) { HL.ui.toast("餘額不足", "err"); return false; }
    return true;
  }
  var fHeadWin, fHeadCount, fBoard, fCardEls;
  function buildCard(c, i, active) {
    var node = el("div", { class: "ax-fcard" }, [
      el("div", { class: "ax-fcard__inner" }, [
        el("div", { class: "ax-fcard__front", text: "?" }),
        el("div", { class: "ax-fcard__back" }, [el("span", { class: "ax-fcard__amt" }), el("span", { class: "ax-fcard__miss" })])
      ])
    ]);
    if (active) { node.classList.add("is-active"); node.addEventListener("click", function () { pickCard(i, node); }); }
    return node;
  }
  function revealCardEl(node, c, picked) {
    node.classList.add("is-flipped"); node.classList.remove("is-active");
    node.classList.add(picked ? (c.prize > 0 ? "is-win" : "is-zero") : "is-dim");
    node.querySelector(".ax-fcard__amt").textContent = c.prize > 0 ? money(c.prize).replace("NT$ ", "") : "—";
    node.querySelector(".ax-fcard__miss").textContent = picked ? "" : "未選";
  }
  function flipHead() {
    fHeadWin = el("div", { class: "ax-fwin", text: money(fWin || 0) });
    fHeadCount = el("div", { class: "ax-fcount", text: fPhase === "playing" ? ("已翻 " + fFlipped + " / " + room.flips + " 張") : "每次可翻 " + room.flips + " 張" });
    return el("div", { class: "ax-fhead" }, [el("div", {}, [el("small", { class: "ax-muted", text: "本次累計贏得" }), fHeadWin]), fHeadCount]);
  }
  function renderIdle() {
    HL.dom.clear(playEl);
    fCards = null; fFlipped = 0; fWin = 0; fPhase = "idle";
    playEl.appendChild(flipHead());
    fBoard = el("div", { class: "ax-fboard" });
    for (var i = 0; i < 10; i++) fBoard.appendChild(buildCard({ prize: 0 }, i, false));
    playEl.appendChild(fBoard);
    var canStart = room.playsLeft > 0;
    playEl.appendChild(el("button", { class: "ax-btn-primary", text: canStart ? ("開始挑戰（押 " + money(room.cost) + "）") : "本場已結束", disabled: canStart ? null : "", onClick: startFlip }));
    playEl.appendChild(el("p", { class: "ax-muted", style: "text-align:center;margin-top:10px", text: "10 張卡含固定彩金，翻 " + room.flips + " 張；其餘將於結束後揭示。" }));
  }
  function startFlip() {
    if (!flipChargeOK()) return;
    HL.state.set({ balance: HL.state.get().balance - room.cost });
    room.prizePool += room.cost; // 局主收取費用
    HL.shell.refreshChrome();
    var poolPer = Math.round(room.cost * 10 / room.flips);
    fCards = HL.mock.flipPrizes(poolPer, room.vol).map(function (v) { return { prize: v, revealed: false, picked: false }; });
    fFlipped = 0; fWin = 0; fPhase = "playing";
    HL.dom.clear(playEl);
    playEl.appendChild(flipHead());
    fBoard = el("div", { class: "ax-fboard" }); fCardEls = [];
    fCards.forEach(function (c, i) { var n = buildCard(c, i, true); fCardEls.push(n); fBoard.appendChild(n); });
    playEl.appendChild(fBoard);
    playEl.appendChild(el("p", { class: "ax-muted", style: "text-align:center;margin-top:12px", text: "點選卡片開牌（開到 0 不扣不加）" }));
  }
  function pickCard(idx, node) {
    if (fPhase !== "playing" || fCards[idx].revealed || fFlipped >= room.flips) return;
    var c = fCards[idx]; c.revealed = true; c.picked = true; fFlipped++; fWin += c.prize;
    revealCardEl(node, c, true); // 只翻這一張，不重繪整桌（避免已開卡閃爍）
    fHeadWin.textContent = money(fWin); fHeadWin.classList.remove("ax-pulse"); void fHeadWin.offsetWidth; fHeadWin.classList.add("ax-pulse");
    fHeadCount.textContent = "已翻 " + fFlipped + " / " + room.flips + " 張";
    if (c.prize > 0) HL.ui.toast("開到 " + money(c.prize) + "！", "ok");
    if (fFlipped >= room.flips) {
      fPhase = "revealing";
      fCardEls.forEach(function (n) { n.classList.remove("is-active"); });
      setTimeout(finishFlip, 650);
    }
  }
  function finishFlip() {
    fCards.forEach(function (c, i) { if (!c.revealed) { c.revealed = true; revealCardEl(fCardEls[i], c, false); } });
    room.prizePool = Math.max(0, room.prizePool - fWin);
    HL.state.set({ balance: HL.state.get().balance + fWin });
    room.playsLeft--; room.done = (room.done || 0) + 1; room.challenges++;
    var net = room.cost - fWin;
    if (net >= 0) room.hostEdge = (room.hostEdge || 0) + net; else room.challEdge = (room.challEdge || 0) + (-net);
    (room.log = room.log || []).push({ name: "你", bet: room.cost, win: fWin, flip: true });
    HL.shell.refreshChrome(); refreshInfo(); // 左側剩餘次數即時更新
    fPhase = "done";
    playEl.appendChild(el("div", { class: "ax-fsettle ax-fade-in" }, [
      el("div", { class: "ax-result " + (fWin >= room.cost ? "win" : "lose") }, [
        el("div", { class: "ax-result__title", text: fWin >= room.cost ? "🎉 本次獲利！" : (fWin > 0 ? "本次小賺" : "本次槓龜") }),
        el("div", { class: "ax-result__amount", text: "贏得 " + money(fWin) }),
        el("p", { class: "ax-muted", text: "押 " + money(room.cost) + " · 淨 " + (fWin - room.cost >= 0 ? "+" : "-") + money(Math.abs(fWin - room.cost)) })
      ]),
      el("div", { class: "ax-result__actions" }, [
        el("button", { class: "ax-btn-ghost", text: "結束離開", onClick: function () { HL.router.go("arena"); } }),
        room.playsLeft > 0
          ? el("button", { class: "ax-btn-primary", text: "再挑戰一次（押 " + money(room.cost) + "）", onClick: startFlip })
          : el("button", { class: "ax-btn-primary", text: "本場已結束", disabled: "" })
      ])
    ]));
  }
  function renderFlip() { renderIdle(); }

  /* ===================== 踩地雷（沿用） ===================== */
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
  }
  function renderMine() {
    HL.dom.clear(playEl);
    mineActive = false; mineMult = 0;
    mineBombs = room.vol === "high" ? 4 : room.vol === "mid" ? 3 : 2;
    var step = mineBombs * 0.4 + 0.2, TILES = 12;
    var statusEl = el("div", { class: "ax-mine__status", text: "按「開始挑戰」翻格累積倍數，踩雷則輸；隨時可兌現。" });
    var multEl = el("b", { class: "ax-gold", text: "x0.00" });
    var grid = el("div", { class: "ax-mine-grid" });
    function layout() {
      HL.dom.clear(grid);
      var bombSet = {}; while (Object.keys(bombSet).length < mineBombs) bombSet[rint(0, TILES - 1)] = true;
      for (var k = 0; k < TILES; k++) (function (idx) {
        var bomb = !!bombSet[idx];
        var tile = el("button", { class: "ax-mine" }, [el("span", { text: "?" })]);
        tile.addEventListener("click", function () {
          if (!mineActive || tile.classList.contains("done")) return;
          tile.classList.add("done");
          if (bomb) {
            tile.classList.add("is-bomb"); HL.dom.clear(tile); tile.appendChild(el("span", { text: "💣" }));
            mineActive = false; statusEl.textContent = "踩到地雷！本注輸掉。";
            HL.ui.toast("踩雷，輸掉 " + money(bet), "err"); afterPlay(0);
            setTimeout(function () { if (room.playsLeft > 0) renderMine(); }, 1100);
          } else {
            tile.classList.add("is-gem"); HL.dom.clear(tile); tile.appendChild(el("span", { text: "💎" }));
            mineMult += step; multEl.textContent = "x" + mineMult.toFixed(2);
          }
        });
        grid.appendChild(tile);
      })(k);
    }
    layout();
    var over = room.playsLeft <= 0;
    var startBtn = el("button", { class: "ax-btn-primary", text: over ? "本場已結束" : "開始挑戰（押 " + money(bet) + "）", disabled: over ? "" : null });
    var cashBtn = el("button", { class: "ax-btn-ghost", text: "兌現", disabled: "" });
    startBtn.addEventListener("click", function () {
      if (mineActive) return; if (!chargeOK()) return;
      mineActive = true; mineMult = 0; multEl.textContent = "x0.00"; cashBtn.removeAttribute("disabled");
      statusEl.textContent = "翻開格子；💎 累積倍數，💣 出局。地雷數：" + mineBombs; layout();
    });
    cashBtn.addEventListener("click", function () {
      if (!mineActive) return; mineActive = false; cashBtn.setAttribute("disabled", "");
      var mult = Math.min(mineMult, room.maxMult), win = Math.round(bet * mult);
      statusEl.textContent = "兌現 x" + mult.toFixed(2) + "，獲得 " + money(win);
      HL.ui.toast("兌現獲得 " + money(win), win > 0 ? "ok" : "warn"); afterPlay(win);
      setTimeout(function () { if (room.playsLeft > 0) renderMine(); }, 1100);
    });
    playEl.appendChild(el("div", { class: "ax-mine__bar" }, [statusEl, el("div", {}, ["目前倍數 ", multEl])]));
    playEl.appendChild(grid);
    playEl.appendChild(el("div", { class: "ax-mine__btns" }, [startBtn, cashBtn]));
  }
  function mineStakeBar() {
    var opts = [10, 50, 100, 500].filter(function (v) { return v <= room.maxBet; });
    if (!opts.length) opts = [room.maxBet];
    bet = opts[Math.min(1, opts.length - 1)];
    var wrap = el("div", { class: "ax-stakes" });
    opts.forEach(function (v) {
      wrap.appendChild(el("button", { class: "ax-stake" + (v === bet ? " is-picked" : ""), text: String(v), onClick: function () { bet = v; Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove("is-picked"); }); this.classList.add("is-picked"); } }));
    });
    return el("div", { class: "ax-room-stake" }, [el("div", { class: "ax-muted", text: "選擇押注額" }), wrap]);
  }

  /* ===================== 進入點 ===================== */
  function render(roomId) {
    room = findRoom(roomId);
    if (!room) {
      return el("div", { class: "ax-duel" }, [el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }), el("div", { class: "ax-panel", text: "此房間已結束。" })]);
    }
    infoEl = el("div", { class: "ax-room-info" });
    playEl = el("div", { class: "ax-room-play" });
    refreshInfo();

    var leftCol;
    if (room.game === "flip") { fCards = null; fPhase = "idle"; fFlipped = 0; fWin = 0; leftCol = el("div", {}, [infoEl]); }
    else { leftCol = el("div", {}, [infoEl, mineStakeBar()]); }

    var node = el("div", { class: "ax-duel ax-fade-in" }, [
      el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } }),
      el("div", { class: "ax-duel__top" }, [
        el("div", {}, [el("div", { class: "ax-duel__title", text: "賞金局 · " + HL.mock.roomGames[room.game].name }), el("span", { class: "ax-demo-tag", text: "Demo 玩法 · RTP 100%" })]),
        el("div", { class: "ax-stat" }, [el("small", { text: "你的餘額" }), el("b", { id: "ax-duel-balance", text: money(HL.state.get().balance) })])
      ]),
      el("div", { class: "ax-room-detail" }, [leftCol, el("div", { class: "ax-arena" }, [playEl])])
    ]);
    room.game === "flip" ? renderFlip() : renderMine();
    return node;
  }

  HL.views = HL.views || {};
  HL.views.bounty = { render: render };
})(window);

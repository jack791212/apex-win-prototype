/*
 * Apex Win｜虛擬主播・子母畫面 (PiP)
 * 流程：在「全球獎」點偶像 → 進入直播間(整頁 view，HL.views.liveroom) → 按「切換子母畫面」才進到這裡。
 * 子母畫面：主播畫面(16:9，assets/streamer/live.png) + hashtag + 跟注 + 獨立直播聊天。
 * 為 fixed overlay 掛 document.body → 換頁仍在，可邊看主播邊逛其他頁。
 * 跟注 = 跟著主播本局下注（看主播畫面，不跳轉遊戲）：點跟注即「真扣」HL.money，
 *        本局以「真桌（HL.baccarat 真開牌）」結果結算，命中真派彩（莊 1.95 / 閒 2.0、和退本），
 *        並掛 HL.liveStats.record（餵 VIP/任務）。註冊於 window.HL.streamer。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;

  function bal() { return HL.instant ? HL.instant.bal() : HL.state.get().balance; }
  function setBal(v) {
    if (HL.instant) { HL.instant.setBal(v); return; }
    HL.state.set({ balance: Math.max(0, Math.round(v)) });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }

  // 主播預設（rail 直接開或無 idol 時的後備）
  var CONF = { name: "AI Luna", viewers: "1,284", gameName: "百家樂", side: "莊", bet: 20, idol: null };

  var panelEl = null, isOpen = false, streamChat = null;
  var following = false, roundTimer = null, followBet = 0;
  var cur = assign({}, CONF);

  function assign(t, a, b) {
    for (var k in a) if (a.hasOwnProperty(k)) t[k] = a[k];
    if (b) for (var j in b) if (b.hasOwnProperty(j) && b[j] != null) t[j] = b[j];
    return t;
  }
  function noSpace(s) { return String(s || "").replace(/\s+/g, ""); }

  // 主播押注方向正規化到百家樂真桌（莊/閒）；其他主題的偶像預設押莊
  function hostSide() { var s = String(cur.side || ""); return (s.indexOf("閒") >= 0 || /player/i.test(s)) ? "player" : "banker"; }
  function sideLabel() { return hostSide() === "player" ? "閒" : "莊"; }
  // 跟注該方向的總賠付倍數：和退本(1)、莊勝 1.95、閒勝 2、輸 0
  function followMult(winner, side) { if (winner === "tie") return 1; if (winner === side) return side === "banker" ? 1.95 : 2; return 0; }

  function cam() {
    var img = el("img", { class: "ax-streamer__cam-img", src: "./assets/streamer/live.png", alt: "主播畫面" });
    img.addEventListener("error", function () { if (this.parentNode) this.parentNode.removeChild(this); }); // 無圖→顯示預留位
    return el("div", { class: "ax-streamer__cam" }, [
      el("div", { class: "ax-streamer__ph" }, [
        el("span", { class: "ax-streamer__ph-live", text: "🔴 LIVE" }),
        el("small", { text: "主播畫面預留位（放假圖：assets/streamer/live.png）" })
      ]),
      img,
      el("div", { class: "ax-streamer__bar" }, [
        el("span", { class: "ax-streamer__live", text: "● LIVE" }),
        el("span", { class: "ax-streamer__nm", text: cur.name }),
        el("span", { class: "ax-streamer__viewers", text: "👥 " + cur.viewers })
      ])
    ]);
  }

  function tagsRow() {
    var tags = ["#" + noSpace(cur.gameName), "#" + noSpace(cur.name), "#ApexWin"];
    var kids = [el("span", { class: "ax-streamer__taglive", text: "● LIVE" }), el("b", { class: "ax-streamer__tagnm", text: cur.name })];
    tags.forEach(function (t) { kids.push(el("span", { class: "ax-streamer__tag", text: t })); });
    return el("div", { class: "ax-streamer__tags" }, kids);
  }

  function infoText() {
    return cur.gameName + (cur.side ? " · " + cur.side : "") + " · 押 " + HL.dom.money(cur.bet);
  }

  function syncFollowBtn() {
    if (!panelEl) return;
    var b = panelEl.querySelector(".ax-streamer__followbtn");
    if (!b) return;
    b.textContent = following ? "已跟注 ✓ 取消" : "跟注 ▶";
    b.classList.toggle("is-following", following);
  }

  // 取消跟注：未結算時退回已扣的本金
  function cancelFollow(refund) {
    if (following && refund && followBet > 0) setBal(bal() + followBet);
    following = false; followBet = 0; syncFollowBtn();
  }

  // 跟注：跟著主播本局下注（不跳轉遊戲）。點下即「真扣」本金，下一局以真桌結果結算。
  function follow() {
    if (!following) {
      var b = cur.bet;
      if (b > bal()) { HL.ui.toast("餘額不足，無法跟注（Demo）", "warn"); return; }
      setBal(bal() - b); following = true; followBet = b; syncFollowBtn();
      HL.ui.toast("已跟注 " + cur.name + "（" + sideLabel() + " · 押 " + money(b) + "，已扣）", "ok");
      if (streamChat) streamChat.addMsg({ name: "你", text: "跟注 " + money(b) + "（" + cur.gameName + " · " + sideLabel() + "）", vip: 4 });
    } else {
      var refund = followBet;
      cancelFollow(true);
      HL.ui.toast("已取消本局跟注，退回 " + money(refund), "");
    }
  }

  function followBar() {
    return el("div", { class: "ax-streamer__follow" }, [
      el("div", { class: "ax-streamer__playing" }, [
        el("small", { class: "ax-muted", text: "主播本局" }),
        el("b", { class: "ax-streamer__game", text: infoText() })
      ]),
      el("button", { class: "ax-streamer__followbtn", text: "跟注 ▶", onClick: follow })
    ]);
  }

  // 切回整頁直播間，關閉子母畫面，並帶回押注方向/金額/觀看數維持連續
  function toBig() {
    var idol = cur.idol;
    var init = { side: cur.side, bet: cur.bet, viewers: cur.viewers };
    close();
    if (idol && HL.views && HL.views.liveroom && HL.views.liveroom.enter) HL.views.liveroom.enter(idol, init);
    else if (HL.router) HL.router.go("globe");
  }

  function build() {
    streamChat = HL.chat.createRoom();
    var body = el("div", { class: "ax-float__body" });
    streamChat.fillScroll(body);
    panelEl = el("div", { class: "ax-float ax-float--streamer" }, [
      el("div", { class: "ax-float__head" }, [
        el("div", { class: "ax-float__title" }, [
          el("span", { class: "ic", text: "🔴" }),
          el("span", { text: "虛擬主播" }),
          el("span", { class: "ax-float__sub", text: "LIVE · 👥 " + cur.viewers })
        ]),
        el("button", { class: "ax-streamer__expand", title: "切回大畫面直播間", "aria-label": "切回大畫面直播間", text: "⛶", onClick: toBig }),
        el("button", { class: "ax-float__close", text: "×", title: "關閉", "aria-label": "關閉", onClick: close })
      ]),
      cam(),
      tagsRow(),
      followBar(),
      body,
      streamChat.footer()
    ]);
    panelEl.style.display = "none";
    document.body.appendChild(panelEl);
  }

  function teardown() {
    stopRounds();
    cancelFollow(true); // 退回未結算的跟注本金
    if (streamChat) streamChat.stopAuto();
    if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
    panelEl = null; streamChat = null; following = false; followBet = 0;
  }

  // 本局結算：用「真桌」(HL.baccarat 真開牌)決定主播勝負，取代舊的 Math.random。
  function resolveRound() {
    var side = hostSide();
    var o = (HL.baccarat && HL.baccarat.deal) ? HL.baccarat.deal() : null;
    var winner, resultText;
    if (o) { winner = o.winner; resultText = "閒 " + o.pt + " : " + o.bt + " 莊"; }
    else { winner = Math.random() < 0.5 ? side : (side === "banker" ? "player" : "banker"); resultText = ""; } // 後備（百家樂模組未載入）
    var push = winner === "tie", hostWin = winner === side;
    if (streamChat) streamChat.addMsg({ bot: true, text: "本局開牌 " + (resultText ? resultText + " — " : "") + "主播(" + sideLabel() + ") " + (push ? "和局" : (hostWin ? "勝 🎉" : "敗")) });
    if (following) {
      var staked = followBet, payout = Math.round(staked * followMult(winner, side)), net = payout - staked;
      if (payout) setBal(bal() + payout);
      if (HL.liveStats) HL.liveStats.record("跟注·百家樂", staked, payout); // 跟注也進實時統計 + 餵 VIP/任務
      var msg = push ? ("本局和局，退回跟注 " + money(staked))
        : (hostWin ? ("跟注命中！跟 " + cur.name + " 同勝 +" + money(net)) : ("本局未命中 " + money(net)));
      HL.ui.toast(msg, push ? "" : (hostWin ? "ok" : "warn"));
      if (streamChat) streamChat.addMsg({ name: "你", text: msg, vip: 4 });
      following = false; followBet = 0; syncFollowBtn();
    }
  }
  // 用 setInterval（不用 HL.ticker，換頁時 ticker 會被 clearAll，子母畫面要持續）
  function startRounds() {
    if (roundTimer) return;
    roundTimer = setInterval(resolveRound, 18000);
  }
  function stopRounds() { if (roundTimer) { clearInterval(roundTimer); roundTimer = null; } }

  // open(opts)：opts.idol（全球獎偶像）優先；亦可帶 {name,gameName,side,bet,viewers}
  function open(opts) {
    if (opts) {
      var o = { name: opts.name, viewers: opts.viewers, gameName: opts.gameName, side: opts.side, bet: opts.bet, idol: opts.idol || null };
      if (opts.idol) { o.name = opts.idol.name; o.gameName = opts.idol.game; o.idol = opts.idol; }
      cur = assign({}, CONF, o);
      if (panelEl) teardown(); // teardown 內會退回未結算跟注並重置
    }
    if (!panelEl) build();
    isOpen = true; panelEl.style.display = "flex";
    streamChat.startAuto(); startRounds(); syncFollowBtn();
  }
  function close() { cancelFollow(true); if (panelEl) panelEl.style.display = "none"; isOpen = false; stopRounds(); if (streamChat) streamChat.stopAuto(); }
  function toggle() { isOpen ? close() : open(); }

  HL.streamer = { open: open, close: close, toggle: toggle, __resolveRound: resolveRound };
})(window);

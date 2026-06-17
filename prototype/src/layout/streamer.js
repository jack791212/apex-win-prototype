/*
 * Apex Win｜虛擬主播・子母畫面 (PiP)
 * 流程：在「全球獎」點偶像 → 進入直播間(整頁 view，HL.views.liveroom) → 按「切換子母畫面」才進到這裡。
 * 子母畫面：主播畫面(16:9，assets/streamer/live.png) + hashtag + 跟注 + 獨立直播聊天。
 * 為 fixed overlay 掛 document.body → 換頁仍在，可邊看主播邊逛其他頁。
 * 跟注 = 跟著主播本局下注（看主播畫面，不跳轉遊戲）；開獎/結算為 Demo 演繹，
 *        未來再整合「跟注系統 × 主播系統 × 遊戲開獎」。註冊於 window.HL.streamer。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  // 主播預設（rail 直接開或無 idol 時的後備）
  var CONF = { name: "AI Luna", viewers: "1,284", gameName: "百家樂", side: "莊", bet: 20, idol: null };

  var panelEl = null, isOpen = false, streamChat = null;
  var following = false, roundTimer = null;
  var cur = assign({}, CONF);

  function assign(t, a, b) {
    for (var k in a) if (a.hasOwnProperty(k)) t[k] = a[k];
    if (b) for (var j in b) if (b.hasOwnProperty(j) && b[j] != null) t[j] = b[j];
    return t;
  }
  function noSpace(s) { return String(s || "").replace(/\s+/g, ""); }

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

  // 跟注：跟著主播本局下注，畫面停留在主播（不跳轉遊戲）。Demo：只記錄+聊天提示。
  function follow() {
    following = !following;
    syncFollowBtn();
    if (following) {
      HL.ui.toast("已跟注 " + cur.name + " 本局（押 " + HL.dom.money(cur.bet) + "）· Demo", "ok");
      if (streamChat) streamChat.addMsg({ name: "你", text: "跟注 " + HL.dom.money(cur.bet) + "（" + cur.gameName + "）", vip: 4 });
    } else {
      HL.ui.toast("已取消本局跟注", "");
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
        el("button", { class: "ax-streamer__expand", title: "切回大畫面直播間", text: "⛶", onClick: toBig }),
        el("button", { class: "ax-float__close", text: "×", title: "關閉", onClick: close })
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
    if (streamChat) streamChat.stopAuto();
    if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
    panelEl = null; streamChat = null; following = false;
  }

  // 本局演繹：用 setInterval（不用 HL.ticker，換頁時 ticker 會被 clearAll，子母畫面要持續）
  function startRounds() {
    if (roundTimer) return;
    roundTimer = setInterval(function () {
      var win = Math.random() < 0.5;
      if (streamChat) streamChat.addMsg({ bot: true, text: "本局結算：主播 " + (win ? "勝 🎉" : "敗") + "（" + cur.gameName + "）" });
      if (following) {
        HL.ui.toast(win ? ("跟注命中！本局跟 " + cur.name + " 同勝（Demo）") : "本局未命中，下一局再跟（Demo）", win ? "ok" : "");
        following = false; syncFollowBtn();
      }
    }, 18000);
  }
  function stopRounds() { if (roundTimer) { clearInterval(roundTimer); roundTimer = null; } }

  // open(opts)：opts.idol（全球獎偶像）優先；亦可帶 {name,gameName,side,bet,viewers}
  function open(opts) {
    if (opts) {
      var o = { name: opts.name, viewers: opts.viewers, gameName: opts.gameName, side: opts.side, bet: opts.bet, idol: opts.idol || null };
      if (opts.idol) { o.name = opts.idol.name; o.gameName = opts.idol.game; o.idol = opts.idol; }
      cur = assign({}, CONF, o);
      following = false;
      if (panelEl) teardown();
    }
    if (!panelEl) build();
    isOpen = true; panelEl.style.display = "flex";
    streamChat.startAuto(); startRounds(); syncFollowBtn();
  }
  function close() { if (panelEl) panelEl.style.display = "none"; isOpen = false; stopRounds(); if (streamChat) streamChat.stopAuto(); }
  function toggle() { isOpen ? close() : open(); }

  HL.streamer = { open: open, close: close, toggle: toggle };
})(window);

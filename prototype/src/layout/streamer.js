/*
 * Apex Win｜虛擬偶像直播主（從「全球獎」頁進入）
 * 右側面板：主播畫面(16:9，放 assets/streamer/live.jpg 即套用) + LIVE/hashtag + 跟注 + 獨立直播聊天。
 * 為 fixed overlay 掛 document.body → 換頁仍在(子母畫面)，可邊看邊去其他頁遊玩。
 * 與右下角「夥伴(AI客服)/聊天室」為各自獨立功能。註冊於 window.HL.streamer。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  // 主播預設（之後可做成可切換多主播 / 後台設定）
  var CONF = {
    name: "AI Luna", viewers: "1,284",
    gameId: "chicken-cross", gameName: "小雞過馬路", bet: 20,
    tags: ["#小雞過馬路", "#ChickenCross", "#ApexWin"]
  };

  var panelEl = null, isOpen = false, streamChat = null;
  var cur = assign({}, CONF); // 目前播出中的主播（可被 open(opts) 覆蓋成被點的偶像）

  function assign(t, a, b) {
    for (var k in a) if (a.hasOwnProperty(k)) t[k] = a[k];
    if (b) for (var j in b) if (b.hasOwnProperty(j) && b[j] != null) t[j] = b[j];
    return t;
  }

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
    var kids = [el("span", { class: "ax-streamer__taglive", text: "● LIVE" }), el("b", { class: "ax-streamer__tagnm", text: cur.name })];
    (cur.tags || []).forEach(function (t) { kids.push(el("span", { class: "ax-streamer__tag", text: t })); });
    return el("div", { class: "ax-streamer__tags" }, kids);
  }

  function follow() {
    HL.ui.toast("已跟注主播：" + cur.gameName + "（押 " + HL.dom.money(cur.bet) + "）", "ok");
    var g = (HL.games && HL.games.byId) ? HL.games.byId(cur.gameId) : null;
    if (g && HL.games.launch) HL.games.launch(g);
    else if (HL.router) HL.router.go("chicken");
    // 本面板為 body overlay，換頁後仍在 → 子母畫面邊看邊玩
  }

  function followBar() {
    return el("div", { class: "ax-streamer__follow" }, [
      el("div", { class: "ax-streamer__playing" }, [
        el("small", { class: "ax-muted", text: "主播正在玩" }),
        el("b", { text: cur.gameName + " · 押 " + HL.dom.money(cur.bet) })
      ]),
      el("button", { class: "ax-btn-primary ax-streamer__followbtn", text: "跟注 ▶", onClick: follow })
    ]);
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
    if (streamChat) streamChat.stopAuto();
    if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
    panelEl = null; streamChat = null;
  }

  // open(opts)：可帶入被點偶像 {name, gameName, gameId, bet, tags, viewers} 覆蓋預設並重建
  function open(opts) {
    if (opts) { cur = assign({}, CONF, opts); if (panelEl) teardown(); }
    if (!panelEl) build();
    isOpen = true; panelEl.style.display = "flex"; streamChat.startAuto();
  }
  function close() { if (panelEl) panelEl.style.display = "none"; isOpen = false; if (streamChat) streamChat.stopAuto(); }
  function toggle() { isOpen ? close() : open(); }

  HL.streamer = { open: open, close: close, toggle: toggle, conf: CONF };
})(window);

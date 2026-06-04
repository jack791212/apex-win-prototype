/*
 * Apex Win｜聊天室（Demo）內容
 * 浮動視窗用內容：訊息 scroll 區 + 輸入 footer。
 * 假玩家訊息自動輪播（由 panels 在開啟時啟動）。註冊於 window.HL.chat。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  var msgsEl;
  var autoTimer = null;

  function row(m) {
    if (m.bot) {
      return el("div", { class: "ax-cmsg" }, [
        el("span", { class: "ax-cmsg__av", style: "background:#36a6ff", text: "🤖" }),
        el("div", {}, [
          el("div", { class: "ax-cmsg__name" }, [el("span", { class: "ax-cmsg__bot", text: "BOT" }), el("span", { class: "ax-blue", text: " RainBot" })]),
          el("div", { class: "ax-cmsg__text", text: m.text })
        ])
      ]);
    }
    return el("div", { class: "ax-cmsg ax-feed-item" }, [
      el("span", { class: "ax-cmsg__av", text: (m.name || "?").charAt(0) }),
      el("div", {}, [
        el("div", { class: "ax-cmsg__name" }, [
          el("span", { class: "ax-vip-badge", text: "V" + m.vip }),
          el("span", { text: " " + m.name })
        ]),
        el("div", { class: "ax-cmsg__text", text: m.text })
      ])
    ]);
  }

  function addMsg(m) {
    if (!msgsEl) return;
    msgsEl.appendChild(row(m));
    while (msgsEl.children.length > 60) msgsEl.removeChild(msgsEl.firstChild);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function fillScroll(s) {
    msgsEl = s;
    s.classList.add("ax-chatroom");
    for (var i = 0; i < 8; i++) addMsg(HL.mock.makeChatMsg());
  }

  function footer() {
    var input = el("input", { type: "text", placeholder: "開始輸入…" });
    function submit() {
      var v = input.value.trim(); if (!v) return;
      addMsg({ name: "你", text: v, vip: 4 });
      input.value = "";
    }
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    return el("div", { class: "ax-chat__input" }, [
      input,
      el("button", { class: "ax-chat__send", text: "➤", onClick: submit })
    ]);
  }

  // 自動輪播假訊息（開啟時啟動，關閉時停止）
  function startAuto() {
    if (autoTimer) return;
    autoTimer = setInterval(function () { addMsg(HL.mock.makeChatMsg()); }, 2800);
  }
  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  HL.chat = { fillScroll: fillScroll, footer: footer, startAuto: startAuto, stopAuto: stopAuto };
})(window);

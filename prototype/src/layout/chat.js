/*
 * Apex Win｜聊天室（Demo）內容 — 工廠版
 * createRoom() 回傳一個獨立聊天實例（各自 msgsEl / 自動輪播 timer），
 * 讓「平台聊天室」與「虛擬主播的直播聊天」可同時存在、互不干擾。
 * HL.chat 為平台聊天室單例（相容原 API）；HL.chat.createRoom() 供虛擬主播建立獨立聊天。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  function createRoom() {
    var msgsEl = null;
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

    function startAuto() {
      if (autoTimer) return;
      autoTimer = setInterval(function () { addMsg(HL.mock.makeChatMsg()); }, 2800);
    }
    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }

    return { fillScroll: fillScroll, footer: footer, startAuto: startAuto, stopAuto: stopAuto, addMsg: addMsg };
  }

  HL.chat = createRoom();        // 平台聊天室（單例，相容原 API）
  HL.chat.createRoom = createRoom; // 供虛擬主播等建立獨立聊天實例
})(window);

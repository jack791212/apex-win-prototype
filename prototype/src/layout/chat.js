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

  function createRoom(isPlatform) {
    var msgsEl = null;
    var autoTimer = null;
    var rainTimer = null;   // 僅平台聊天室：每秒推進紅包雨狀態機（隨面板開關啟停）
    var rainBanner = null;  // 紅包雨橫幅節點（sticky 於聊天頂部，不可被訊息裁切移除）

    function row(m) {
      if (m.bot) {
        return el("div", { class: "ax-cmsg" }, [
          el("span", { class: "ax-cmsg__av", style: "background:var(--ax-blue)", text: "🤖" }),
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
      // 裁切最舊訊息，但保留頂部的紅包雨橫幅（若為 firstChild 則刪其後一個）
      while (msgsEl.children.length > (rainBanner ? 61 : 60)) {
        var first = msgsEl.firstChild;
        if (first === rainBanner && msgsEl.children.length > 1) msgsEl.removeChild(msgsEl.children[1]);
        else msgsEl.removeChild(first);
      }
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    function fillScroll(s) {
      msgsEl = s;
      s.classList.add("ax-chatroom");
      // 平台聊天室頂部掛「紅包雨」橫幅（sticky）；虛擬主播的獨立聊天室不掛
      if (isPlatform && HL.rain) {
        rainBanner = HL.rain.mount(addMsg);
        if (rainBanner) s.appendChild(rainBanner);
      }
      for (var i = 0; i < 8; i++) addMsg(HL.mock.makeChatMsg());
    }

    function footer() {
      var input = el("input", { type: "text", placeholder: "開始輸入…" });
      function submit() {
        var v = input.value.trim(); if (!v) return;
        addMsg({ name: "你", text: v, vip: 4 });
        if (isPlatform && HL.rain) HL.rain.markMessage(); // 發言＝取得紅包雨領取資格
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
      // 平台聊天室開啟時，每秒推進紅包雨狀態機（面板為獨立 overlay，故不依賴會被切頁清空的 HL.ticker）
      if (isPlatform && HL.rain && !rainTimer) { HL.rain.tick(); rainTimer = setInterval(HL.rain.tick, 1000); }
    }
    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      if (rainTimer) { clearInterval(rainTimer); rainTimer = null; }
    }

    return { fillScroll: fillScroll, footer: footer, startAuto: startAuto, stopAuto: stopAuto, addMsg: addMsg };
  }

  HL.chat = createRoom(true);        // 平台聊天室（單例，相容原 API；掛紅包雨）
  HL.chat.createRoom = createRoom;   // 供虛擬主播等建立獨立聊天實例（不掛紅包雨）
})(window);

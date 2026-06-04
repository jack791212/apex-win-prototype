/*
 * Apex Win｜浮動視窗控制（你的專屬夥伴 / 聊天室）
 * 兩個視窗都「蓋在大廳之上」，為 fixed overlay，掛在 document.body，
 * 不嵌入 App Shell，開關不影響大廳排版。各自有獨立 scroll 區。
 * 註冊於 window.HL.panels。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  var partnerEl = null, chatEl = null;
  var partnerOpen = false, chatOpen = false;

  function makePanel(opts) {
    var scroll = el("div", { class: "ax-float__body" });
    opts.buildScroll(scroll);
    var panel = el("div", { class: "ax-float " + opts.cls }, [
      el("div", { class: "ax-float__head" }, [
        el("div", { class: "ax-float__title" }, [
          opts.icon ? el("span", { class: "ic", text: opts.icon }) : null,
          el("span", { text: opts.title }),
          opts.sub ? el("span", { class: "ax-float__sub", text: opts.sub }) : null
        ]),
        el("button", { class: "ax-float__close", text: "×", title: "關閉", onClick: opts.onClose })
      ]),
      scroll,
      opts.buildFooter ? opts.buildFooter() : null
    ]);
    panel.style.display = "none";
    document.body.appendChild(panel);
    return panel;
  }

  function ensureBuilt() {
    if (!partnerEl) {
      partnerEl = makePanel({
        cls: "ax-float--partner", icon: "🧝‍♀️", title: "你的專屬夥伴", sub: "● 在線",
        onClose: closeAi,
        buildScroll: function (s) { HL.partner.fillScroll(s); },
        buildFooter: function () { return HL.partner.footer(); }
      });
    }
    if (!chatEl) {
      chatEl = makePanel({
        cls: "ax-float--chat", icon: "💬", title: "聊天室", sub: "👥 2,314 在線",
        onClose: closeChat,
        buildScroll: function (s) { HL.chat.fillScroll(s); },
        buildFooter: function () { return HL.chat.footer(); }
      });
    }
  }

  // 依開啟狀態，從右側依序排列（夥伴最右、聊天在其左）
  function relayout() {
    var order = [];
    if (partnerOpen) order.push(partnerEl);
    if (chatOpen) order.push(chatEl);
    order.forEach(function (p, i) { p.style.right = (16 + i * 372) + "px"; });
  }

  function openAi() { ensureBuilt(); partnerOpen = true; partnerEl.style.display = "flex"; relayout(); }
  function closeAi() { if (partnerEl) partnerEl.style.display = "none"; partnerOpen = false; relayout(); }
  function toggleAi() { partnerOpen ? closeAi() : openAi(); }

  function openChat() { ensureBuilt(); chatOpen = true; chatEl.style.display = "flex"; HL.chat.startAuto(); relayout(); }
  function closeChat() { if (chatEl) chatEl.style.display = "none"; chatOpen = false; HL.chat.stopAuto(); relayout(); }
  function toggleChat() { chatOpen ? closeChat() : openChat(); }

  HL.panels = {
    ensureBuilt: ensureBuilt,
    openAi: openAi, closeAi: closeAi, toggleAi: toggleAi,
    openChat: openChat, closeChat: closeChat, toggleChat: toggleChat
  };
})(window);

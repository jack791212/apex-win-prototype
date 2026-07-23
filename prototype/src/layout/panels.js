/*
 * Apex Win｜浮動視窗（你的專屬夥伴 / 聊天室）
 * ─────────────────────────────────────────────────────────────────────
 * 2026-07-23 起改掛到 HL.dock 可停靠面板系統（見 dock.js）：本檔只負責把
 * 夥伴 / 聊天兩個面板「註冊」進 dock，內容(fillScroll/footer)仍來自 HL.partner /
 * HL.chat。開 / 關 / 收合 / 桌機拖曳自由擺放 / 跨站持久佈局全由 dock 統一提供。
 * 對外仍保留 HL.panels 舊 API（app-shell FAB、main.js 都靠這組呼叫，零改動）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  var registered = false;
  function ensureRegistered() {
    if (registered) return;
    registered = true;
    HL.dock
      .register({
        id: "partner", cls: "ax-float--partner", icon: "🧝‍♀️",
        title: "你的專屬夥伴", sub: "● 在線", mobileExclusive: true,
        buildScroll: function (s) { HL.partner.fillScroll(s); },
        buildFooter: function () { return HL.partner.footer(); }
      })
      .register({
        id: "chat", cls: "ax-float--chat", icon: "💬",
        title: "聊天室", sub: "👥 2,314 在線", mobileExclusive: true,
        buildScroll: function (s) { HL.chat.fillScroll(s); },
        buildFooter: function () { return HL.chat.footer(); },
        onOpen: function () { HL.chat.startAuto(); },
        onClose: function () { HL.chat.stopAuto(); }
      });
  }

  // 舊 API 表面：呼叫端（app-shell FAB / main.js）零改動，內部改走 HL.dock
  HL.panels = {
    ensureBuilt: function () { ensureRegistered(); HL.dock.build("partner"); HL.dock.build("chat"); },
    openAi: function () { ensureRegistered(); HL.dock.open("partner"); },
    closeAi: function () { HL.dock.close("partner"); },
    toggleAi: function () { ensureRegistered(); HL.dock.toggle("partner"); },
    openChat: function () { ensureRegistered(); HL.dock.open("chat"); },
    closeChat: function () { HL.dock.close("chat"); },
    toggleChat: function () { ensureRegistered(); HL.dock.toggle("chat"); }
  };
})(window);

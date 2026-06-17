/*
 * Apex Win｜虛擬主播面板（右側浮窗：主播畫面 + 即時聊天室）
 * Stake 式版型：上方主播直播畫面（16:9，預留圖位，放 assets/streamer/live.jpg 即套用），
 * 下方即時聊天室（沿用 HL.chat）。fixed overlay，掛 document.body，不佔大廳排版。
 * 註冊於 window.HL.panels。聊天已併入本面板，原獨立聊天視窗的呼叫沿用同一面板（相容別名）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  var streamerEl = null;
  var streamerOpen = false;

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
      opts.buildTop ? opts.buildTop() : null,
      scroll,
      opts.buildFooter ? opts.buildFooter() : null
    ]);
    panel.style.display = "none";
    document.body.appendChild(panel);
    return panel;
  }

  // 主播畫面：16:9 預留位（找不到圖時顯示斜紋預留位），放 prototype/assets/streamer/live.jpg 即自動套用
  function buildCam() {
    var img = el("img", { class: "ax-streamer__cam-img", src: "./assets/streamer/live.jpg", alt: "主播畫面" });
    img.addEventListener("error", function () { if (this.parentNode) this.parentNode.removeChild(this); }); // 無圖 → 顯示預留位
    return el("div", { class: "ax-streamer__cam" }, [
      el("div", { class: "ax-streamer__ph" }, [
        el("span", { class: "ax-streamer__ph-live", text: "🔴 LIVE" }),
        el("small", { text: "主播畫面預留位（放假圖：assets/streamer/live.jpg）" })
      ]),
      img,
      el("div", { class: "ax-streamer__bar" }, [
        el("span", { class: "ax-streamer__live", text: "● LIVE" }),
        el("span", { class: "ax-streamer__nm", text: "AI Luna" }),
        el("span", { class: "ax-streamer__viewers", text: "👥 1,284" })
      ])
    ]);
  }

  function ensureBuilt() {
    if (streamerEl) return;
    streamerEl = makePanel({
      cls: "ax-float--streamer", icon: "🔴", title: "虛擬主播", sub: "LIVE",
      onClose: closeAi,
      buildTop: buildCam,
      buildScroll: function (s) { HL.chat.fillScroll(s); },
      buildFooter: function () { return HL.chat.footer(); }
    });
  }

  function isMobile() { return (document.documentElement.clientWidth || window.innerWidth) <= 720; }

  function openAi() {
    ensureBuilt();
    streamerOpen = true;
    streamerEl.style.display = "flex";
    streamerEl.style.right = isMobile() ? "" : "16px";
    HL.chat.startAuto();
  }
  function closeAi() {
    if (streamerEl) streamerEl.style.display = "none";
    streamerOpen = false;
    HL.chat.stopAuto();
  }
  function toggleAi() { streamerOpen ? closeAi() : openAi(); }

  HL.panels = {
    ensureBuilt: ensureBuilt,
    openAi: openAi, closeAi: closeAi, toggleAi: toggleAi,
    // 相容：聊天已併入虛擬主播面板，舊呼叫導向同一面板
    openChat: openAi, closeChat: closeAi, toggleChat: toggleAi
  };
})(window);

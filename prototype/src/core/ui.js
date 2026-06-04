/*
 * Apex Win｜共用 UI：Toast + Modal
 * 提供統一的點擊回饋與彈窗（登入/註冊/錢包/活動/客服/建構中…）。
 * 註冊於 window.HL.ui。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  // ---- Toast ----
  function toast(message, type) {
    var box = document.getElementById("ax-toasts");
    if (!box) {
      box = el("div", { id: "ax-toasts", class: "ax-toasts" });
      document.body.appendChild(box);
    }
    var t = el("div", { class: "ax-toast " + (type || "ok"), text: message });
    box.appendChild(t);
    setTimeout(function () {
      t.style.opacity = "0";
      setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 200);
    }, 2200);
  }

  // ---- Modal ----
  function modal(title, bodyNodes, opts) {
    opts = opts || {};
    var mask = el("div", { class: "ax-modal-mask" });

    function close() {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
    }
    mask.addEventListener("click", function (e) {
      if (e.target === mask) close();
    });

    var body = el("div", { class: "ax-modal__body" });
    (Array.isArray(bodyNodes) ? bodyNodes : [bodyNodes]).forEach(function (n) {
      if (n == null) return;
      body.appendChild(typeof n === "string" ? el("p", { text: n }) : n);
    });

    var box = el("div", { class: "ax-modal" + (opts.wide ? " ax-modal--wide" : "") }, [
      el("div", { class: "ax-modal__head" }, [
        el("h3", { text: title }),
        el("button", { class: "ax-modal__close", text: "×", onClick: close })
      ]),
      body
    ]);
    mask.appendChild(box);
    document.body.appendChild(mask);
    return { close: close, body: body };
  }

  // 「建構中 / Demo」通用彈窗
  function comingSoon(name) {
    modal(name || "功能建構中", [
      el("p", {
        text: "此功能在本 Demo 中為示意，尚未實作正式流程。"
      }),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料 · 建構中" })
    ]);
  }

  HL.ui = { toast: toast, modal: modal, comingSoon: comingSoon };
})(window);

/*
 * Apex Win｜延遲注入原語（單一真相）  #110
 * ---------------------------------------------------------------------------
 * 為什麼存在：#80 的 `lazyGames` 自帶一份 script 注入器＋載入態表＋占位/失敗節點；
 *   #110 要把「非遊戲的整頁 view」也搬離首屏（`lazyViews`），如果各寫一份，
 *   兩份「某個 src 載到哪了」的狀態表就會各說各話——同一個 src 若同時被兩邊
 *   要求，會被注入兩次（view 檔重複執行 = 計時器/註冊重複）。
 *   ⇒ 注入與載入態只准有一份，兩個容器都向本檔要。
 *
 * API（window.HL.lazyLoad）：
 *   load(src)  → Promise<bool>   冪等；同一 src 併發只注入一次，後到者等同一個 Promise。
 *   state(src) → idle|loading|done|error
 *   loadingNode() / failNode()   render 契約要求「同步回一個節點」時的占位（兩容器共用同一視覺）。
 *   gatedOut()                   真會員模式未登入 ⇒ 不可 refresh（renderApp 不檢查登入，會蓋掉登入頁）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var _state = {};   // src → idle/loading/done/error
  var _waiting = {}; // src → [resolve]

  function injectScript(src) {
    return new global.Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false; // 保留註冊順序（同 games-loader.js）
      s.onload = function () { resolve(true); };
      s.onerror = function () {
        if (global.console) console.warn("[Apex Win] 延遲載入失敗：", src);
        resolve(false);
      };
      document.head.appendChild(s);
    });
  }

  function load(src) {
    if (_state[src] === "done") return global.Promise.resolve(true);
    if (_state[src] === "error") return global.Promise.resolve(false);
    if (_state[src] === "loading") {
      return new global.Promise(function (res) { (_waiting[src] = _waiting[src] || []).push(res); });
    }
    _state[src] = "loading";
    return injectScript(src).then(function (ok) {
      _state[src] = ok ? "done" : "error";
      var qs = _waiting[src] || []; _waiting[src] = [];
      qs.forEach(function (r) { r(ok); });
      return ok;
    });
  }

  var BOX = "min-height:min(60vh,420px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;";
  function loadingNode() {
    return HL.dom.el("div", { class: "ax-lazygame", style: BOX }, [
      HL.dom.el("div", { class: "ax-mm__spinner" }),
      HL.dom.el("div", { class: "ax-muted", text: "載入中…" })
    ]);
  }
  function failNode() {
    return HL.dom.el("div", { class: "ax-lazygame", style: BOX }, [
      HL.dom.el("div", { class: "ax-muted", text: "載入失敗，請稍後再試" })
    ]);
  }

  function gatedOut() {
    return !!(HL.auth && HL.auth.backend && HL.auth.backend() && HL.auth.user && !HL.auth.user());
  }

  HL.lazyLoad = {
    load: load,
    state: function (src) { return _state[src] || "idle"; },
    loadingNode: loadingNode,
    failNode: failNode,
    gatedOut: gatedOut
  };

  if (typeof module !== "undefined" && module.exports) module.exports = HL.lazyLoad;
})(typeof window !== "undefined" ? window : globalThis);

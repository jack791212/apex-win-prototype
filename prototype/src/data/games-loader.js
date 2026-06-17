/*
 * Apex Win｜同仁開發遊戲・動態載入器（放置區 loader）
 * 讀 games/registry.json 列出的每個遊戲入口(game.js)，依序注入頁面執行；
 * 每個 game.js 內部呼叫 HL.games.register({...,render}) 自我上架（免改任何核心檔）。
 * 載入完成後，若 App 已渲染則刷新一次，讓新遊戲卡立即出現在娛樂城「放置區」。
 * 找不到 registry.json 或載入失敗 → 安靜略過（不影響主站）。
 * 載入順序：games.js 之後（HL.games 已存在）。註冊於 window.HL.gamesLoader。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var MANIFEST = "./games/registry.json";

  function injectScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false; // 保留註冊順序
      s.onload = function () { resolve(true); };
      s.onerror = function () { if (global.console) console.warn("[Apex Win] 放置區遊戲載入失敗：", src); resolve(false); };
      document.head.appendChild(s);
    });
  }

  function entrySrc(entry) {
    var raw = typeof entry === "string" ? entry : (entry && entry.entry);
    if (!raw) return null;
    return "./" + String(raw).replace(/^\.?\//, ""); // 一律相對 index.html
  }

  function boot() {
    if (!global.fetch || !global.Promise) return; // 環境不支援 → 略過
    fetch(MANIFEST, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var list = (data && data.games) || [];
        if (!list.length) return null;
        return list.reduce(function (p, entry) {
          var src = entrySrc(entry);
          return p.then(function () { return src ? injectScript(src) : null; });
        }, Promise.resolve()).then(function () {
          // 讓大廳出現新遊戲；但真會員模式未登入時不可刷新（renderApp 不檢查登入，會蓋掉登入頁）
          var gatedOut = HL.auth && HL.auth.backend && HL.auth.backend() && HL.auth.user && !HL.auth.user();
          if (!gatedOut && HL.app && HL.app.refresh) HL.app.refresh();
        });
      })
      .catch(function () { /* 安靜略過：無 registry 或離線 */ });
  }

  HL.gamesLoader = { boot: boot, manifest: MANIFEST };
  boot(); // 自動啟動
})(window);

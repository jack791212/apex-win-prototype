/*
 * HL.offline（#175）——「離線可用性」是一個**量測得出來的事實**，不是一句宣稱。
 *
 * 【為什麼需要它】在 #175 之前，「離線可用」寫在 sw.js 檔頭、寫在 index.html 註解、在 BACKLOG #14
 *   打了 ✅、在平台台帳判了 8 輪 present——而 `PRECACHE` 只有 4 筆、**0 個可執行資產**，
 *   離線冷啟動永遠是白畫面。最惡劣的一點是：**用來證明 PWA 還活著的那個數字（bump CACHE），
 *   正是每天把離線語料清空三次以上的那個動作**——稽核指標與破壞行為是同一件事，
 *   所以每一輪複查都回報「健康」。⇒ 這支檔不做任何承諾，只回答一個問題：
 *   **「現在這台裝置上，殼的幾個檔真的在快取裡？」**
 *
 * 【清單的唯一真相＝這份文件自己】不手抄陣列，直接讀 `script[src]` / `link[href]`
 *   （與 sw.js install 時解析 index.html 是同一條紀律，見 §4「第二份真相」）。
 *   ⚠️ 快照時機取 `DOMContentLoaded`：那時靜態標籤都解析完了，而延遲載入（#110/#189/#190）
 *   的遊戲程式與樣式還沒被注入 ⇒ 它們**不算**在殼裡（它們本來就是要用到才抓的）。
 *   若有東西在 DOMContentLoaded 之前就注入自己，那它每次開站都會載入＝算進殼裡才是對的。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  function t(k, d) { d = d || k; return HL.i18n ? HL.i18n.t(k, d) : d; }

  var shell = null;     // DOMContentLoaded 當下的殼快照
  var last = null;      // 最近一次量測結果

  function collect() {
    var out = [], seen = {}, nodes, i, u;
    try { nodes = global.document.querySelectorAll("script[src], link[href]"); } catch (e) { return out; }
    for (i = 0; i < nodes.length; i++) {
      u = nodes[i].getAttribute("src") || nodes[i].getAttribute("href");
      // 帶協定或以 // 開頭的是第三方 CDN，離線本來就沒有它、也不該替它擋
      if (!u || u.charAt(0) === "#" || u.indexOf("//") === 0 || /^[a-z][a-z0-9+.-]*:/i.test(u)) continue;
      if (!seen[u]) { seen[u] = 1; out.push(u); }
    }
    return out;
  }

  function shellUrls() {
    if (!shell) shell = collect();
    return shell.slice();
  }

  function supported() {
    return !!(global.caches && global.navigator && global.navigator.serviceWorker);
  }

  /* 逐筆問快取。回傳 Promise；不支援快取的環境回 null（＝「這個問題在這裡不適用」，
     不要回 0%——那會把「不支援」講成「一個檔都沒有」，是兩件完全不同的事）。 */
  function measure() {
    if (!supported()) return Promise.resolve(null);
    var urls = shellUrls();
    if (!urls.length) return Promise.resolve(null);
    return Promise.all(urls.map(function (u) {
      return global.caches.match(u).then(function (m) { return m ? null : u; }).catch(function () { return u; });
    })).then(function (miss) {
      var missing = miss.filter(Boolean);
      last = {
        total: urls.length,
        cached: urls.length - missing.length,
        missing: missing,
        pct: Math.round(((urls.length - missing.length) / urls.length) * 100),
        at: Date.now()
      };
      return last;
    });
  }

  function snapshot() { return last; }
  function ready() { return !!(last && last.missing.length === 0); }

  /* 玩家看得到的那一句。刻意**不含**任何「離線可用」式的承諾字樣——它只陳述量到的數字，
     並在沒補滿時直說會是白畫面。這是 #175 唯一的玩家可見產物。 */
  function describe() {
    if (!supported()) {
      return t("這個瀏覽器不支援離線快取（或這一頁不是從 https／localhost 開啟），所以沒有離線副本。");
    }
    var s = last;
    if (!s) return t("還沒檢查過。按下面的「重新檢查」就會量一次。");
    /* ⚠️ 以下兩句刻意**不包 t()**（2026-09-14 實測後改的）：
       `HL.i18n.t(k, def)` 是 passthrough（直接回 def），真正翻譯的是 DOM walker，
       而它比對的是**整個文字節點**——句子裡一旦嵌進量測到的數字，節點就再也對不上任何字典鍵。
       包了 t() 只會在兩支語言包裡留下**永遠查不到**的條目（本專案稱「補了也翻不到」的假缺漏），
       比不翻更糟：它會讓覆蓋率讀數說謊。
       這個限制是整個說明中心共有的（面板自己的提示就寫著「這裡的數字都是即時讀取平台當下設定值」），
       不是本條特有。上面那兩句沒有數字，所以它們是**真的**翻得到的（實測切 EN 會變英文）。 */
    if (s.missing.length === 0) {
      return "✅ " + s.cached + "/" + s.total + "（100%）　開站需要的檔案全部都有離線副本。" +
        "現在把網路斷掉再重開這一頁，畫面仍然畫得出來。（遊戲玩法檔是點開才抓的，沒玩過的遊戲斷網時不會有。）";
    }
    return "⚠️ " + s.cached + "/" + s.total + "（" + s.pct + "%）　還缺 " + s.missing.length + " 個。" +
      "在補滿之前，斷網重開會是一片空白——不是「部分功能」，是整個介面畫不出來。通常保持連線幾秒鐘就會自動補齊。";
  }

  HL.offline = {
    shellUrls: shellUrls, measure: measure, snapshot: snapshot,
    ready: ready, describe: describe, supported: supported
  };

  /* 快照 + 首次量測：等靜態標籤都解析完再做。量測本身只是查快取，不發網路請求。 */
  function boot() {
    shell = collect();
    var idle = global.requestIdleCallback || function (fn) { return global.setTimeout(fn, 800); };
    idle(function () { measure(); });
  }
  if (global.document && global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }

  /* 說明中心註冊一條（#175 ②）。body 是**函式**＝每次展開都讀當下真值，不快取、不手抄。 */
  if (HL.support && HL.support.register) {
    HL.support.register({
      id: "offline/availability", cat: "other", order: 40,
      title: t("斷網的時候，這個站還開得起來嗎？"),
      keys: ["offline", "pwa", "離線", "斷網", "快取", "cache", "安裝"],
      body: describe,
      action: {
        label: t("重新檢查"),
        run: function () {
          measure().then(function () {
            if (HL.support && HL.support.open) HL.support.open();
          });
        }
      }
    });
  }
})(window);

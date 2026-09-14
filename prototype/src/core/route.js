/*
 * HL.route（#181）——這個站有 36 個去處，在此之前**一個地址都沒有**。
 *
 * 【修的是什麼】`HL.router.go` 的實作只有兩件事：`HL.state.set(patch)` 與 `renderApp()`，
 *   **完全不碰 URL**。於是全庫 `history.pushState`／`replaceState`／`location.hash`／`popstate`
 *   ／`hashchange` 命中 **0**，而去處有 `router.go` 34 個呼叫點 ＋ `goGame` 1 ＋ 12 筆 view 登錄
 *   ＋ 24 款遊戲。三個後果都是實測出來的，不是推理：
 *     ① 5 顆「🔗 分享戰績」的訊息**點名了遊戲**（「我在 ApexWin 玩「X」贏得 Y」），
 *        而 👉 後面那條網址是**大廳大門**——收到的人不知道是哪一款。
 *     ② `manifest.webmanifest` 是 `display: standalone`（Android 恆有返回鍵）而 history 裡一筆都沒有
 *        ⇒ **裝成 App 之後第一次按返回就直接離開**。
 *     ③ 建對戰房時可以勾「🔒 私密房間」，副標曾逐字寫「僅分享連結可加入」——而連結機制不存在。
 *
 * 【形制】比照 `HL.gameAxes`／`HL.support`／`HL.reports`：**由各 view 自己註冊一列**，
 *   不由 `main.js` 代寫一張大表（那會變成第二份真相：新增一個去處時沒有人會想到回頭改它）。
 *
 * 🔴 兩條紅線
 *   ① **只寫 hash，永遠不碰 `location.search`。** `?demo=1`（後端開關）與 `?ref=`（推薦歸因）
 *      是**入站**語意：把它們寫進分享出去的連結，等於替收件人切換後端、或洗掉他自己的歸因。
 *      站別旗標 `HL_SITE_MODE` 走 localStorage、同理**不上網址**（收件人不該被切站）。
 *   ② **`decode` 收到的是外來輸入。** 任何看不懂的東西、指向已下架遊戲的位址、丟例外的 spec，
 *      一律退回大廳——**不得丟例外**（一個壞網址不該讓整個站開不起來）。
 *
 * 雙環境契約：node 可 `require`（純邏輯區無 DOM 相依），供 tests 取用同一份實作。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? {} : (global.HL = global.HL || {});

  var SPECS = {};   // view → spec
  var ORDER = [];   // 註冊先後

  function register(spec) {
    if (!spec || !spec.view) return API;          // 缺身分＝忽略，不當機
    if (!SPECS[spec.view]) ORDER.push(spec.view);
    SPECS[spec.view] = spec;
    return API;                                    // 可鏈式（比照 HL.dock／HL.support）
  }
  function views() { return ORDER.slice(); }
  function specOf(v) { return SPECS[v] || null; }
  function reset() { SPECS = {}; ORDER = []; return API; }   // 測試用：造合成註冊表

  /* 位址片段只允許 [A-Za-z0-9_-]：它會被塞進 URL，而且會從 URL 讀回來。
     過濾放在**容器**而不是各 spec 裡——否則每個註冊者都要自己記得一次。 */
  function safeSeg(s) { return String(s == null ? "" : s).replace(/[^A-Za-z0-9_-]/g, ""); }

  /* state → 位址片段。未註冊的 view 沒有地址 ⇒ 退回大廳（而不是編一個進不去的位址出來）。 */
  function encode(st) {
    var v = (st && st.view) || "lobby";
    if (!SPECS[v]) return "lobby";
    var seg = "";
    try { seg = SPECS[v].encode ? safeSeg(SPECS[v].encode(st)) : ""; } catch (e) { seg = ""; }
    return seg ? (v + "/" + seg) : v;
  }

  /* 位址片段 → state patch。外來輸入，一律 fail-safe 回大廳。
     ⚠️ 一定要把 `activeGameId`／`activePoolId` 明確歸零：少了這兩行，從遊戲頁按返回回到大廳時
     舊的 id 會留在 state 上，下一次重繪又把那一款畫回來（＝返回鍵看起來沒有反應）。 */
  function decode(hash) {
    var raw = String(hash == null ? "" : hash).replace(/^#/, "").replace(/^\/+/, "").replace(/\/+$/, "");
    if (!raw) return { view: "lobby", activeGameId: null, activePoolId: null };
    var i = raw.indexOf("/");
    var v = i < 0 ? raw : raw.slice(0, i);
    var seg = i < 0 ? "" : raw.slice(i + 1);
    var sp = SPECS[v];
    if (!sp) return { view: "lobby", activeGameId: null, activePoolId: null };
    var patch = { view: v, activeGameId: null, activePoolId: null };
    if (!sp.decode) return patch;
    var extra;
    try { extra = sp.decode(safeSeg(seg)); } catch (e) { extra = null; }
    if (!extra || typeof extra !== "object") return { view: "lobby", activeGameId: null, activePoolId: null };
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) patch[k] = extra[k];
    return patch;
  }

  function addr(st) { return "#/" + encode(st); }

  /* 分享用的完整網址：保留 search（收件人的 `?demo=1` 由**他自己**的連結決定，我們不動它），
     只換 hash。這是「連結回得到那一款遊戲」的唯一出口。 */
  function urlFor(st) {
    var loc = global.location;
    if (!loc) return "";
    return (loc.origin || "") + (loc.pathname || "") + (loc.search || "") + addr(st);
  }

  /* 把當前 state 寫進 history。同一個地址不重複塞（否則按一次返回要按很多下才動）。 */
  function sync(st, replace) {
    var h = global.history, loc = global.location;
    if (!h || !h.pushState || !loc) return false;
    var next = addr(st);
    if ((loc.hash || "") === next) return false;
    /* ⚠️ 刻意**不寫成** `h[replace ? "replaceState" : "pushState"](…)`：那種計算成員存取在
       「剝掉字串字面量之後」看不到任何 `pushState` 字樣 ⇒ 普查型的鎖會判定「這個站沒有路由能力」
       而全綠（`platform/url-as-address-census` 的負向擾動 R1 當場證實）。明寫兩行也比較好讀。 */
    try {
      if (replace) h.replaceState(null, "", next);
      else h.pushState(null, "", next);
    } catch (e) { return false; }
    return true;
  }

  function current() { return decode(global.location ? global.location.hash : ""); }

  var API = {
    register: register, views: views, specOf: specOf, reset: reset,
    encode: encode, decode: decode, addr: addr, urlFor: urlFor, sync: sync, current: current
  };
  HL.route = API;
  if (isNode) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);

/*
 * sw-install-probe — 把 `prototype/sw.js` 的 install 在沙箱裡**真的跑一遍**，回報它到底把哪些 URL
 * 放進了快取。供 `platform/offline-shell-precache-ratchet`（#175）判讀。
 *
 * 【為什麼要獨立成一支、由鎖同步 spawn】自我檢測的 harness 是**嚴格同步**的（`selftest.js` 的
 *   `for` 迴圈裡直接 `s.run(t)`，不 await 任何東西），而 install 全程是 Promise。
 *   兩條路可走：① 在沙箱裡塞一個「同步 Promise」墊片 ② 另開一個 process 用**真** Promise 跑完再回值。
 *   選 ②，因為墊片一旦有 bug，「鎖沒抓到」與「墊片把結果吞了」在輸出上完全同形
 *   （CLAUDE.md §4 形狀⑦：harness 缺陷會讓負向擾動打空）。這裡寧可多花 ~50ms 開一個 process。
 *
 * 【三個情境】
 *   normal  ── 真的 index.html：install 應該把**每一支**本地 script/link 都放進快取。
 *   one404  ── 其中一支 script 回 404：其餘**仍應全部**進快取（證明 addAll 的「全有全無」已消失）。
 *   newfile ── 在 html 裡插入一支 sw.js 從沒聽過的新 script：它應該**自動**被快取
 *              （證明清單真的是從 index.html 解析出來的，沒有第二份手抄清單）。
 *
 * 用法：node prototype/tests/sw-install-probe.js   → stdout 一行 JSON
 */
"use strict";
var vm = require("vm"), fs = require("fs"), path = require("path");

var ROOT = path.join(__dirname, "..");
var SW_PATH = path.join(ROOT, "sw.js");
var INDEX_PATH = path.join(ROOT, "index.html");
var NEW_FILE = "./src/core/__probe_brand_new__.js";

function drive(html, failUrls) {
  return new Promise(function (done) {
    var put = [], fetched = [], usedAddAll = false, listeners = {}, err = null;
    var cache = {
      put: function (u, res) { put.push(String(u && u.url ? u.url : u)); return Promise.resolve(); },
      addAll: function () { usedAddAll = true; return Promise.resolve(); },
      match: function () { return Promise.resolve(null); }
    };
    function res(ok, body) {
      return {
        ok: ok, status: ok ? 200 : 404,
        clone: function () { return res(ok, body); },
        text: function () { return Promise.resolve(body || ""); }
      };
    }
    var ctx = {
      self: {
        addEventListener: function (k, fn) { listeners[k] = fn; },
        skipWaiting: function () {},
        clients: { claim: function () { return Promise.resolve(); } },
        location: { origin: "http://probe.local" }
      },
      caches: {
        open: function () { return Promise.resolve(cache); },
        keys: function () { return Promise.resolve([]); },
        "delete": function () { return Promise.resolve(true); },
        match: function () { return Promise.resolve(null); }
      },
      fetch: function (req) {
        var u = (req && req.url) ? String(req.url) : String(req);
        fetched.push(u);
        if (failUrls.indexOf(u) >= 0) return Promise.resolve(res(false, ""));
        // 只有 index.html（與根路徑）回得出 html 內容，其餘給空 body
        var isIndex = /(^|\/)index\.html$/.test(u) || u === "./" || u === "/";
        return Promise.resolve(res(true, isIndex ? html : ""));
      },
      Request: function (u, init) { this.url = String(u); this.init = init; },
      Response: function (b, init) { this.body = b; this.init = init; },
      URL: URL, Promise: Promise, console: console
    };
    vm.createContext(ctx);
    try { vm.runInContext(fs.readFileSync(SW_PATH, "utf8"), ctx, { filename: "sw.js" }); }
    catch (e) { return done({ put: [], fetched: [], usedAddAll: false, err: "sw.js 求值失敗：" + e.message }); }

    if (typeof listeners.install !== "function") {
      return done({ put: [], fetched: [], usedAddAll: false, err: "sw.js 沒有註冊 install 監聽器" });
    }
    var waited = null;
    try { listeners.install({ waitUntil: function (p) { waited = p; } }); }
    catch (e) { err = "install 同步段丟例外：" + e.message; }
    if (waited == null && !err) err = "install 沒有呼叫 waitUntil ⇒ 瀏覽器不會等它，預快取可能在中途被砍";

    Promise.resolve(waited).then(function () {
      done({ put: put, fetched: fetched, usedAddAll: usedAddAll, err: err });
    }, function (e) {
      done({ put: put, fetched: fetched, usedAddAll: usedAddAll, err: err || ("install 的 waitUntil 被 reject：" + String(e)) });
    });
  });
}

var html = fs.readFileSync(INDEX_PATH, "utf8");
// 挑一支真實存在的首屏 script 當「壞掉的那一個」
var firstScript = (html.match(/<script[^>]*src="(\.[^"]+\.js)"/) || [])[1] || "";
// 插一支 sw.js 不可能知道的新檔（放在 </body> 之前，形狀與其他 script 相同）
var htmlNew = html.replace(/<\/body>/i, '  <script src="' + NEW_FILE + '"></script>\n</body>');

Promise.all([
  drive(html, []),
  drive(html, [firstScript]),
  drive(htmlNew, [])
]).then(function (r) {
  process.stdout.write(JSON.stringify({
    firstScript: firstScript,
    newFile: NEW_FILE,
    normal: r[0], one404: r[1], newfile: r[2]
  }));
}).catch(function (e) {
  process.stdout.write(JSON.stringify({ fatal: String((e && e.stack) || e) }));
});

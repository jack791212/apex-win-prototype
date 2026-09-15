/*
 * Apex Win｜Service Worker（#14 PWA ／ #175 離線骨架補完）
 * 策略：network-first + cache 後備（線上永遠拿最新，避免開發/驗證拿到舊檔）。
 *  - install：預快取**整份 app shell**——清單不寫在這裡，而是 install 當下抓 index.html 自己解析出來。
 *  - fetch：同源 GET 先打網路、成功就更新快取；失敗（離線）回快取，導航類再退回 index.html。
 *  - activate：清掉舊版快取。改版時 bump CACHE 版本即可。
 *
 * ── #175 修的是什麼（2026-09-14 前景）──────────────────────────────────────
 * 在此之前這支檔的開頭就寫著「離線可用」「讓首次離線也能開」，index.html 註解寫著「離線載入」，
 * BACKLOG #14 打了 ✅，平台台帳判了 8 輪 present——而 PRECACHE 只有 4 筆、**0 個可執行資產**。
 * `<div id="app">` 是空的、整個介面由 90+ 支執行期 script 畫出來
 * ⇒ **離線冷啟動＝拿得到殼、拿不到任何程式碼＝永遠停在白畫面**，而且失敗是靜默的（504 空回應）。
 * 更糟的是：每一輪用來證明「PWA 還活著」的那個動作（bump CACHE）**正是 activate 清空離線語料的那個動作**，
 * 自動補回來的只有那 4 筆 0 個可執行檔 ⇒ 稽核指標與破壞行為是同一件事，所以每次複查都回報「健康」。
 *
 * 🔴 兩條紅線（回頭改這支檔前先讀）：
 *   ① **不得在這支檔手抄第二份檔案清單。** 唯一真相是 index.html。
 *      理由不是潔癖：新增一支 `<script>` 時沒有人會想到回頭改 sw.js，而離線語料會**安靜地**少一個檔，
 *      少一個就是白畫面（介面 100% 由執行期程式碼畫出來）。⇒ install 時自己去解析。
 *   ② **不得用 `addAll`。** 它是全有全無：清單裡任何一個路徑 404，整份 precache 就靜默 no-op，
 *      而畫面、console 與所有既有測項全部照常綠。⇒ 逐筆各自 catch，一個壞路徑只損失那一個檔。
 * 兩條都由 `platform/offline-shell-precache-ratchet` 守著，而且是**行為級**的
 * （在沙箱裡真的把 install 跑一遍，看它到底把哪些 URL 放進快取），不是掃字串。
 */
var CACHE = "apexwin-v318";

/* 不必解析就知道要的四筆——**這不是檔案清單，是解析的起點**（沒有 index.html 就沒有東西可解析）。 */
var SHELL_SEED = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

/* 從 index.html 解析出殼的其餘部分。
   只收相對路徑：帶協定或以 // 開頭的是第三方 CDN（Supabase），離線本來就沒有它、也不該替它擋。 */
function shellFrom(html) {
  var out = [], seen = {}, re = /<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/gi, m;
  while ((m = re.exec(html))) {
    var u = m[1];
    if (!u || u.charAt(0) === "#" || u.indexOf("//") === 0 || /^[a-z][a-z0-9+.-]*:/i.test(u)) continue;
    if (!seen[u]) { seen[u] = 1; out.push(u); }
  }
  return out;
}

/* 逐筆各自 catch（紅線 ②）。回傳 { ok, failed, total } 供診斷；**不 reject**——
   一個檔抓不到不該讓整個 install 失敗（那會退回「一個檔都沒有」＝比半份更糟）。 */
function cacheEach(cache, urls) {
  var seen = {}, list = [];
  for (var i = 0; i < urls.length; i++) { if (!seen[urls[i]]) { seen[urls[i]] = 1; list.push(urls[i]); } }
  var ok = 0, failed = [];
  return Promise.all(list.map(function (u) {
    return fetch(new Request(u, { cache: "reload" })).then(function (res) {
      if (!res || !res.ok) throw new Error("bad-response");
      return cache.put(u, res).then(function () { ok++; });
    }).catch(function () { failed.push(u); });
  })).then(function () { return { ok: ok, failed: failed, total: list.length }; });
}

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 先把 index.html 抓下來：它同時是「要快取的一個檔」與「其餘清單的來源」，所以只抓一次、clone 一份。
      return fetch(new Request("./index.html", { cache: "reload" })).then(function (res) {
        if (!res || !res.ok) return "";
        var copy = res.clone();
        return c.put("./index.html", copy).then(function () { return res.text(); });
      }).catch(function () { return ""; }).then(function (html) {
        // index.html 第一趟就已經放進去了；只有第一趟失敗（html 為空）才讓 seed 再試它一次。
        var seed = html ? SHELL_SEED.filter(function (u) { return u !== "./index.html"; }) : SHELL_SEED;
        return cacheEach(c, seed.concat(shellFrom(html)));
      });
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // 第三方（Supabase CDN 等）不攔
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (m) {
        if (m) return m;
        if (req.mode === "navigate") return caches.match("./index.html"); // 離線導航退回 app shell
        return new Response("", { status: 504, statusText: "offline" });
      });
    })
  );
});

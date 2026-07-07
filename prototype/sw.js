/*
 * Apex Win｜Service Worker（#14 PWA）
 * 策略：network-first + cache 後備（離線可用、線上永遠拿最新，避免開發/驗證拿到舊檔）。
 *  - install：預快取最小 app shell（含 index.html）讓首次離線也能開。
 *  - fetch：同源 GET 先打網路、成功就更新快取；失敗（離線）回快取，導航類再退回 index.html。
 *  - activate：清掉舊版快取。改版時 bump CACHE 版本即可。
 */
var CACHE = "apexwin-v16";
var PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE).catch(function () {}); }));
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

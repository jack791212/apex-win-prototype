/*
 * Apex Win｜輕量 i18n 引擎（接 header 🌐，目標3）
 * 設計：以「zh-Hant 介面文字」為 key 的片語字典 → 自動翻譯整個 DOM 文字節點 +
 *   title/placeholder/aria-label 屬性；MutationObserver 接住之後動態產生的 Modal/Toast/換頁/聊天。
 *   ⇒ 擴充覆蓋＝在語言包加一條（key=畫面上的中文）即可，免逐檔包字串。
 * 預設 zh-Hant＝原文（不翻、observer 關閉、零成本）。切換語言：存檔→HL.app.refresh
 *   重繪原文→walk 翻成目標語。zh-Hans 只列「與繁體不同」的字，其餘留原文。
 * 註冊於 window.HL.i18n；t(k,def) 為相容用的 passthrough（回 def，交給 DOM 翻譯層）。
 *
 * ── #100 按語言拆檔（平台軌 2026-08-16 20:00 窗）─────────────────────────────
 * 本檔**只剩引擎**，字典搬到 `src/i18n/<code>.js`，由各包自行 `HL.i18n.register(code, pack)` 上架
 *（形制同 data/lazy-games.js 的 MANIFEST：**新增一種語言＝ LANGS 加一筆 + 一個檔，引擎一行不改**）。
 * 為什麼要拆：拆檔前本檔 160KB＝全站最大單檔，而**預設語言 zh-Hant 一份字典都用不到**
 *   ⇒ 絕大多數 session 的首屏白帶約 140KB 從不執行的資料（M8 結案時即點名、首屏預算連四輪逼近門檻）。
 * 載入時機（兩條路，都必須在 main.js 首次 render 之前把字典就位，否則會閃一整屏中文）：
 *   ① 開機已存有非預設語言偏好 → `ensureSync`：剖析期以 document.write 注入，**阻塞剖析**直到執行完，
 *      與拆檔前「字典是本檔的一部分」在時序上等價（本檔於 index.html 第 98 行、main.js 第 156 行）。
 *   ② 玩家在語言選單切換 → `ensure`：非同步注入，**載完才 commitLang**（否則先重繪中文再閃外語）。
 * ⚠️ 改本檔或 sw.js 後在 preview 驗證會被 PWA Service Worker + HTTP 快取餵舊檔 ⇒ 先清 SW/caches 或帶 cache-buster。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  function lsGet(k, d) { try { var v = global.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { global.localStorage.setItem(k, v); } catch (e) {} }

  var KEY_L = "HL_LANG";

  // ── #100 語言包註冊表 ────────────────────────────────────────────────────────
  // zh-Hant 是**原文本身**，沒有也不需要字典檔（故無 src）；其餘語言各一支 pack。
  var LANGS = [
    { code: "zh-Hant", name: "繁體中文", flag: "🇹🇼" },
    { code: "zh-Hans", name: "简体中文", flag: "🇨🇳", src: "./src/i18n/zh-Hans.js" },
    { code: "en", name: "English", flag: "🇬🇧", src: "./src/i18n/en.js" }
  ];

  var PACKS = {};        // code → { dict, prefix, suffix }
  var _pending = {};     // code → Promise（同一語言併發只注入一次）

  function srcOf(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i].src || null;
    return null;
  }
  function loaded(code) { return code === "zh-Hant" || !!PACKS[code]; }

  // 語言包唯一上架入口（pack.dict 必要；prefix/suffix 選用）
  function register(code, pack) {
    if (!code || !pack || !pack.dict) return false;
    PACKS[code] = { dict: pack.dict, prefix: pack.prefix || null, suffix: pack.suffix || null };
    return true;
  }

  // 開機期同步載入：剖析仍在進行時，document.write 的 <script src> 會阻塞剖析直到執行完
  //（＝拆檔前的時序）。剖析已結束（例如從 console 呼叫）則回 false，交給呼叫端走非同步路。
  function ensureSync(code) {
    if (loaded(code)) return true;
    var src = srcOf(code);
    if (!src || document.readyState !== "loading") return false;
    try { document.write('<script src="' + src + '"><\/script>'); return true; } catch (e) { return false; }
  }

  // 按需載入：回 Promise（切換語言、或 ensureSync 走不通時用）
  function ensure(code) {
    var Pr = global.Promise;
    if (loaded(code)) return Pr.resolve(true);
    var src = srcOf(code);
    if (!src) return Pr.resolve(false);
    if (_pending[code]) return _pending[code];
    _pending[code] = new Pr(function (res) {
      var s = document.createElement("script");
      s.src = src; s.async = false;
      s.onload = function () { res(!!PACKS[code]); };
      s.onerror = function () {
        if (global.console) global.console.warn("[Apex Win] 語言包載入失敗，維持當前語言：", src);
        res(false);
      };
      document.head.appendChild(s);
    });
    return _pending[code];
  }

  var OBS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "placeholder", "aria-label"] };
  var observer = null;
  function lang() { return HL.lang || "zh-Hant"; }
  function dict() { var p = PACKS[lang()]; return p ? p.dict : null; }

  // U15：翻譯前保存原文（expando）——setLang 先走 restore() 還原，掛 body 的持久浮動元件
  // （panels/pip/live-stats/faucet pill…不在全量重繪範圍）切語系往返才能回到 zh-Hant 原文。
  function tText(node, d) {
    var raw = node.nodeValue, k = raw.trim();
    if (!k) return;
    if (d[k] != null) { if (node.__i18nOrig == null) node.__i18nOrig = raw; node.nodeValue = raw.replace(k, d[k]); return; }
    var pk = PACKS[lang()] || {};
    var pre = pk.prefix, p;
    if (pre) for (p in pre) { if (k.indexOf(p) === 0) { if (node.__i18nOrig == null) node.__i18nOrig = raw; node.nodeValue = raw.replace(p, pre[p]); return; } }
    var suf = pk.suffix, s;
    if (suf) for (s in suf) { if (k.length > s.length && k.slice(-s.length) === s) { if (node.__i18nOrig == null) node.__i18nOrig = raw; node.nodeValue = raw.replace(k, k.slice(0, k.length - s.length) + suf[s]); return; } }
  }
  function tAttrs(elm, d) {
    if (!elm.getAttribute) return;
    ["title", "placeholder", "aria-label"].forEach(function (a) {
      var v = elm.getAttribute(a); if (!v) return;
      var k = v.trim(); if (d[k] == null) return;
      var o = elm.__i18nOrigA || (elm.__i18nOrigA = {});
      if (o[a] == null) o[a] = v;
      elm.setAttribute(a, d[k]);
    });
  }
  function restoreAttrs(elm) {
    var o = elm.__i18nOrigA;
    if (!o) return;
    for (var a in o) { if (o[a] != null && elm.getAttribute(a) != null) elm.setAttribute(a, o[a]); }
    elm.__i18nOrigA = null;
  }
  function restore() {
    var root = document.body; if (!root) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n; while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(function (t) { if (t.__i18nOrig != null) { t.nodeValue = t.__i18nOrig; t.__i18nOrig = null; } });
    var withA = root.querySelectorAll("[title],[placeholder],[aria-label]");
    Array.prototype.forEach.call(withA, restoreAttrs);
    var fmts = root.querySelectorAll("[data-i18n-fmt]"); // 格式化元件依當前語系重繪（切回 zh-Hant→模板中文；救得了 body 常駐元件）
    Array.prototype.forEach.call(fmts, function (s) { renderFmt(s, dict()); });
  }
  // U22：動態組字格式化元件。模板（畫面中文，含 {name} 佔位符）為字典 key、值運行時填。
  // 回傳帶 data-i18n-fmt/vars 的 span；walk 週期會依當前語系整體重繪（解決「中文＋變數＋中文」
  // concat 無法命中整節點 walker 的 EN 缺口，如「第 N 次」「已翻 N / M 張」「最高 X×」）。
  function renderFmt(span, d) {
    var tpl = (span.getAttribute && span.getAttribute("data-i18n-fmt"));
    if (tpl == null) return;
    var vars = {}; try { vars = JSON.parse(span.getAttribute("data-i18n-vars") || "{}"); } catch (e) {}
    var trans = (d && d[tpl] != null) ? d[tpl] : tpl; // 模板譯文，或 zh-Hant 用模板本身
    span.textContent = trans.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; });
  }
  function fmt(template, vars) {
    var span = el("span", { "data-i18n-fmt": template, "data-i18n-vars": JSON.stringify(vars || {}) });
    renderFmt(span, dict()); // 建立當下即以當前語系渲染（zh-Hant→模板中文、EN/Hans→譯文）
    return span;
  }

  function walk(root) {
    var d = dict(); if (!d || !root) return;
    if (root.nodeType === 3) { tText(root, d); return; }
    if (root.nodeType !== 1) return;
    if (root.hasAttribute && root.hasAttribute("data-i18n-fmt")) { renderFmt(root, d); return; } // 格式化元件整體重繪，不逐字節點翻
    tAttrs(root, d);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n; while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(function (t) { tText(t, d); });
    var withAttr = root.querySelectorAll ? root.querySelectorAll("[title],[placeholder],[aria-label]") : [];
    Array.prototype.forEach.call(withAttr, function (e) { tAttrs(e, d); });
    var fmts = root.querySelectorAll ? root.querySelectorAll("[data-i18n-fmt]") : [];
    Array.prototype.forEach.call(fmts, function (e) { renderFmt(e, d); });
  }

  function startObserver() {
    if (observer || lang() === "zh-Hant") return;
    observer = new MutationObserver(function (muts) {
      if (lang() === "zh-Hant") return;
      observer.disconnect();
      var d = dict();
      muts.forEach(function (m) {
        if (m.type === "childList") Array.prototype.forEach.call(m.addedNodes, function (node) { walk(node); });
        else if (m.type === "characterData") { if (m.target) m.target.__i18nOrig = null; tText(m.target, d); } // app 重寫內容＝新原文，捨棄舊存檔（U15）
        else if (m.type === "attributes" && m.target) { if (m.target.__i18nOrigA) m.target.__i18nOrigA[m.attributeName] = null; tAttrs(m.target, d); }
      });
      observer.observe(document.body, OBS);
    });
    observer.observe(document.body, OBS);
  }
  function stopObserver() { if (observer) { observer.disconnect(); observer = null; } }

  function apply() {
    if (lang() === "zh-Hant") { stopObserver(); return; }
    if (document.body) walk(document.body);
    startObserver();
  }

  function setLang(code) {
    if (!code) return;
    // 字典可能尚未載入（拆檔後語言包是按需載的）⇒ 先確保就位再切，否則會先重繪成中文再閃成外語。
    ensure(code).then(function () { commitLang(code); });
  }

  function commitLang(code) {
    HL.lang = code; lsSet(KEY_L, code);
    try { document.documentElement.setAttribute("lang", code); } catch (e) {}
    stopObserver();
    restore();                                        // 先還原全 DOM 原文——含掛 body 的持久浮動元件（U15，重繪只救得了 views）
    if (HL.app && HL.app.refresh) HL.app.refresh(); // 重繪回原文(zh-Hant)（renderApp 尾端會 apply 翻譯）
    apply();                                          // 再翻成目標語
  }

  function open() {
    var cur = lang();
    var m = HL.ui.modal("語言 / Language", [
      el("div", { class: "ax-lang" }, LANGS.map(function (L) {
        return el("button", { class: "ax-lang__opt" + (L.code === cur ? " is-current" : ""), onClick: function () { m.close(); if (L.code !== cur) setLang(L.code); } }, [
          el("span", { class: "ax-lang__flag", text: L.flag }),
          el("span", { text: L.name }),
          L.code === cur ? el("span", { class: "ax-lang__chk", text: "✓" }) : null
        ]);
      })),
      el("span", { class: "ax-demo-tag", text: "輕量 i18n · 介面文字逐步在地化 · Demo" })
    ]);
  }

  function t(k, def) { return def; } // 相容 passthrough：實際翻譯由 DOM 層處理

  HL.lang = lsGet(KEY_L, "zh-Hant");
  if (document.documentElement) try { document.documentElement.setAttribute("lang", HL.lang); } catch (e) {}
  // 首次：等 DOM 內容出現後套用（main.js 之後 render）；observer 會接住首屏
  if (lang() !== "zh-Hant") {
    // #100：字典已不在本檔內 ⇒ 必須在 main.js 首次 render 前就位，否則會先閃一整屏中文
    //（那比省下的 KB 更糟）。ensureSync 走 document.write 的剖析阻塞路徑；失敗才退回非同步。
    if (!ensureSync(lang())) ensure(lang()).then(apply);
    if (document.readyState === "loading") global.addEventListener("DOMContentLoaded", apply);
    else apply();
    startObserver();
  }

  // dict()：唯讀取得字典（供 HL.selftest 的 i18n 冒煙測驗有無空值／非字串；請勿在外部改寫）
  HL.i18n = { t: t, fmt: fmt, setLang: setLang, current: lang, open: open, langs: LANGS, apply: apply,
              register: register, ensure: ensure, loaded: loaded,
              dict: function () {                       // 唯讀快照（供 HL.selftest 的 i18n 冒煙測驗；請勿在外部改寫）
                var out = {};
                Object.keys(PACKS).forEach(function (c) { out[c] = PACKS[c].dict; });
                return out;
              } };
})(window);

/*
 * Apex Win｜註冊表擴充點探針（單一真相）— 平台軌 2026-08-26 20:00 窗
 * ---------------------------------------------------------------------------
 * 【為什麼有這個檔】本專案的招牌哲學是「容器先於內容」——`HL.games.register`／
 *   `HL.achievements.register`／`HL.promoCal.register`／`HL.support.register`… 全站現有 24 個
 *   `HL.<ns>.register` 擴充點（其中 10 個有程式碼外部呼叫點；2026-08-31 20:00 窗修掉篩子後的口徑，
 *   在那之前是 14／10——四支只靠檔頭註解站在①那邊，見下面 `nonCodeMask` 的說明）。
 *   而 repo 內已**五次**記錄同一種缺陷：**容器做好了、接線沒補完**
 *   （P4 的 `HL.dock` 外部註冊者為零／07-31 台帳的 `promoCal` 外部註冊者為零／#66 的 `HL.reveal`／
 *   `app-state.lossLimitRemaining` 宣告了但全站零讀取者／#67 前身「已對外宣告但點進去是空的」）。
 *   ⇒ 這是 CLAUDE.md §4「修一半而看不出來」家族在**擴充層**的形狀：register 函式在、
 *   面板也在、畫面完全正常，只是**沒有任何東西證明「註冊進去真的會出現」**。
 *
 * 【本檔量的是什麼 · 以及刻意不量什麼】
 *   量：**每個擴充點有沒有「被證明得到」的路**，以及**負向那半有沒有守住**。
 *     · `externallyExercised`＝owner 檔以外至少有一個 `HL.<ns>.register(` 呼叫點
 *       ⇒ 壞掉會在行為上現形（有人真的在用）。
 *     · `nodeVerifiable`＝該模組 node 可 require、CORE 匯出 `register`、且有 ≥1 個列舉器
 *       （`ids`／`list`／`all`／`count`／`keys`）⇒ 測項有能力自己註冊一筆再斷言它出現。
 *     · `unproven`＝兩者皆非 ⇒ 這個擴充點在**兩個環境裡都沒有任何東西走過**。
 *   不量：「register 有沒有被呼叫過幾次」這種**代理指標**。2026-08-17 的
 *     `SELFTEST_ORDER_DEBT` 棘輪就是栽在這裡——它用 grep 載入位置代理「收不到測項」，
 *     對 7 支誤報 4 支。⇒ 本檔的主斷言是**行為的**（真的呼叫 register 再看列舉器），
 *     只有覆蓋面那一半才是清單式，且清單附明列的基線例外。
 *
 * 【射程與已知偏差（讀數時一起讀）】
 *   · 只掃 `prototype/src/**\/*.js`；口徑沿用專案硬規則「只認呼叫、不認提及」的精神：
 *     命中形狀為 `HL.<ns>.register(`，**且必須落在程式碼上**——註解與字串裡的提及只計入
 *     `docMentions`，不算呼叫點（2026-08-31 20:00 窗才真的做到；在那之前這句話是**只寫在檔頭
 *     沒寫進實作**的，實測 10 個命名空間共 17 筆非程式碼命中被算成了呼叫點）。
 *     因此**內建品項只走檔內區域 register() 的目錄**
 *     （如 `core/shop.js` 的 `BUILTIN.forEach(register)`）**不在射程內**——它沒有任何
 *     `HL.shop.register(` 字面。那一類已由各自的結構鎖守（見 shop 的
 *     「CATALOG 只允許在 register() 內被 push」），本檔不重複覆蓋、也不假裝看得到。
 *   · owner 檔＝「同時出現 `HL.<ns> =` 賦值且檔內有 `register` 成員」的檔。一個 ns 可有多個
 *     owner 檔（別名重新賦值），全部視為 owner ⇒ **偏保守**：會少算外部註冊者，不會多算。
 *   · 行為探針只 require **`tests/run.js` 本來就會 require 的模組** ＋ 無測項的模組。
 *     理由：require 一支帶 `registerTests` 的新模組會讓自我檢測**總項數改變**，
 *     使「N 項全綠」這個跨輪可比的數字失真（2026-08-26 20:00 窗實測：加進本檔後 281→282，增量恰為本輪新增的那一條鎖）。⇒ 探針絕不因為想多量一支而動到套組規模。
 *   · 負向探針送進去的都是**壞 spec**（null／undefined／`{}`／只有 id）⇒ 正常實作會拒收，
 *     不會污染任何真實登記簿；成功註冊一筆真 spec 的**正向**斷言由各模組自己的測項擁有
 *     （`econCfg` 的「探針表已註冊即出現於 all()」、`scoreAxis/registry-extensible`、
 *     `reveal` 的「註冊即可擴充」、`reports` 的「容器零內建」…）⇒ 本檔補的是**沒人擁有的那兩半**：
 *     跨全部註冊表的**負向**（壞 spec 不得進場）與**覆蓋面**（不得有無法證明的擴充點）。
 *
 * 消費者兩個，共讀本檔（不得各自實作正則，比照 i18n-key-scan.js 的紀律）：
 *   ① 常駐鎖 `platform/registry-extension-fail-closed`（tests/checks-platform.js）
 *   ② 情報側報告 `node intel/tools/registry-gaps.js`
 */
"use strict";
var fs = require("fs");
var path = require("path");

var SRC = path.join(__dirname, "..", "src");

/* 已知的 unproven 基線（零成長棘輪的允許清單）。
 * 2026-08-29 20:00 窗起為**空清單**——原本唯一的基線例外 `guild` 已由第三條路脫離，說明見下面
 * `boot()` 檔頭的「第三個環境」。留著這個常數（而不是刪掉）是刻意的：鎖的基線防腐斷言仍會
 * 要求「基線列出的每一項都必須真的還無法證明」，空清單時該斷言退化為 no-op，而下一次真的
 * 出現無法證明的擴充點時，棘轍會直接轉紅、不需要先回頭把機制重建一次。 */
var UNPROVEN_BASELINE = [];

var ENUMERATORS = ["ids", "list", "all", "count", "keys"];

/* 探針可安全 require 的模組（見檔頭「射程」第三條：不得改變套組規模）。
 * 值＝相對 src/ 的路徑；未列於此的 ns 一律只做靜態分類，不做行為探針。 */
var PROBEABLE = {
  edge: "core/edge.js",
  progressSrc: "core/progress-src.js",
  econCfg: "core/econ-config.js",
  support: "core/support.js",          // 無 registerTests ⇒ require 不增項（2026-08-26 實測 0）
  selftest: "core/selftest.js",        // 執行器自身，run.js 第一個 require 的就是它
  // 以下六支屬「internalOnly」（零外部註冊者），但 run.js 本來就 require 它們
  // ⇒ 加進行為探針**不改變套組規模**，而它們正是最需要負向覆蓋的一群：
  // 沒有任何外部呼叫者走過，壞掉不會在行為上現形。
  scoreAxis: "core/score-axis.js",
  bonusTtl: "core/bonus-ttl.js",
  content: "core/content.js",
  rg: "core/responsible.js",
  sla: "core/service-level.js",
  wagerScope: "core/wager-scope.js"
};

/* 壞 spec 樣本：正常實作必須全數拒收（不得讓列舉器變長）。 */
var BAD_SPECS = [null, undefined, {}, { id: "__probe_bad__" }, { label: "__probe_bad__" }];

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * 第三個環境：vm 沙箱（2026-08-29 20:00 窗新增）
 * ------------------------------------------------------------------------------------------
 * 【為什麼要有它 · 以及為什麼它推翻了本檔自己寫過的一句話】
 *   本檔 08-26 建檔時把「證明得到」定義成**兩個**環境：① 有外部註冊者（壞掉會在行為上現形）
 *   ② node 可 `require`。`HL.guild` 兩條都不成立（`core/guild.js` 頂層取用 `window` ⇒ require 即拋，
 *   外部註冊者為零），於是被寫進 UNPROVEN_BASELINE，並開成卡 #135，卡上把脫離之道寫成
 *   「補一個外部註冊者」或「加 `module.exports`」——後者是**首屏位元組**，撞 [P-FS] 的 3-byte 邊界，
 *   所以 #135 被標成「卡在 #118」，連續四輪台帳審都照抄這個結論。
 *   ⇒ 但那個成本模型在 **2026-08-29 14:00 窗**就已經過期了：#145 為了證明「同 id 再註冊會不會
 *   洗掉欄位」，在 `checks-platform.js` 裡建了一個 **vm 沙箱**——`window` 是我們自己造的物件，
 *   於是「頂層取用 window」不再是障礙。同一天 20:00 窗實測：把 `index.html` 的**首屏 76 支
 *   script 全部**丟進沙箱，**0 支載入失敗**，`HL.guild.register` 正向可註冊、負向 fail-closed。
 *   ⇒ #135 真正需要的位元組是 **0**（全部落在 `tests/`，不出貨、不進首屏預算）。
 *   ⭐ 教訓與 08-24「零首屏成本 ≠ 不加 script」同型，但方向相反：**那次是成本被低估，這次是
 *   成本被高估**——而高估同樣會造成損失（一張 S 卡被四輪誤判為受阻）。台帳/卡片上的「阻塞事實」
 *   跟 evidence 一樣會過期，**新工具落地時要回頭問「它讓哪些卡的前置條件失效了」**。
 *
 * 【射程與偏差】
 *   · 只跑 `index.html` 裡 `./src/` 開頭、且**不在 layout/ views/ main.js**的 script（＝核心層）。
 *     排除的那三類會碰真實 DOM 佈局，shim 成本高且與「登記簿證明」無關。
 *   · shim 是**最小可跑**而非擬真瀏覽器：DOM 節點是啞物件、`crypto` 是確定性的、計時器不排程。
 *     ⇒ 沙箱能證明的是**登記簿與純邏輯**，**不能**證明畫面。任何「看起來對不對」仍屬 preview 領域
 *     （而排程軌拿不到 preview，見 CONTROL 船長區 08-24 20:00 的機械證據）。
 *   · 沙箱是**獨立的 HL**：裡面的 `HL.selftest` 收到的註冊不會流進真實套組
 *     ⇒ booting 不改變「N 項全綠」這個跨輪可比的數字（本檔檔頭第三條射程紀律仍然成立）。
 *   · 一次 boot ≈ 80ms，模組層快取（`_cached`），全套只付一次。
 * ═════════════════════════════════════════════════════════════════════════════════════════ */
var ROOT = path.join(__dirname, "..");
var SANDBOX_SKIP = ["layout/", "views/", "main.js"];

/* 首屏 script 清單的單一真相＝`index.html` 本身（不得在測項裡抄第二份清單，否則新增 script 時
 * 沙箱會靜默漏掉它而所有斷言仍然全綠＝本專案反覆踩過的「兩份真相各自漂移」）。 */
function firstScreenScripts() {
  var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  var m = html.match(/<script src="\.\/src\/[^"]*"/g) || [];
  return m.map(function (s) { return s.replace(/^.*src="\.\/src\//, "").replace(/"$/, ""); });
}

function makeStubEl() {
  var e = {
    style: {}, dataset: {}, children: [],
    classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    setAttribute: function () {}, getAttribute: function () { return null; }, removeAttribute: function () {},
    appendChild: function (c) { this.children.push(c); return c; }, insertBefore: function (c) { this.children.push(c); return c; },
    append: function () {}, remove: function () {}, focus: function () {}, click: function () {},
    addEventListener: function () {}, removeEventListener: function () {},
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, contains: function () { return false; }
  };
  Object.defineProperty(e, "textContent", { get: function () { return this._t || ""; }, set: function (v) { this._t = v; } });
  Object.defineProperty(e, "innerHTML", { get: function () { return this._h || ""; }, set: function (v) { this._h = v; } });
  return e;
}

/* 通用沙箱：把 `files`（相對 src/ 的路徑）依序跑進一個乾淨的 vm context，回傳該 context。
 * 呼叫端拿 `g.HL`。載入失敗**不吞**——記進 `g.__failed`，由呼叫端決定要不要 FAIL。 */
function boot(files) {
  var vm = require("vm");
  var g = {};
  g.window = g; g.globalThis = g; g.self = g;
  g.console = { log: function () {}, warn: function () {}, error: function () {}, info: function () {} };
  g.Promise = Promise; g.setTimeout = setTimeout; g.clearTimeout = clearTimeout;
  g.setInterval = function () { return 0; }; g.clearInterval = function () {};
  g.requestAnimationFrame = function () { return 0; }; g.cancelAnimationFrame = function () {};
  g.localStorage = {
    _d: {}, getItem: function (k) { return this._d[k] || null; },
    setItem: function (k, v) { this._d[k] = String(v); }, removeItem: function (k) { delete this._d[k]; },
    key: function (i) { return Object.keys(this._d)[i] || null; },
    get length() { return Object.keys(this._d).length; }
  };
  g.document = {
    createElement: makeStubEl, createDocumentFragment: makeStubEl,
    createTextNode: function (t) { return { nodeValue: t, nodeType: 3 }; },
    head: makeStubEl(), body: makeStubEl(), documentElement: makeStubEl(),
    getElementById: function () { return null; }, querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {}, removeEventListener: function () {},
    createTreeWalker: function () { return { nextNode: function () { return null; } }; }
  };
  g.navigator = { language: "zh-TW", userAgent: "node", serviceWorker: { register: function () { return Promise.resolve(); } } };
  g.location = { href: "http://localhost/", search: "", hash: "", pathname: "/", protocol: "http:", reload: function () {} };
  g.matchMedia = function () { return { matches: false, addEventListener: function () {}, addListener: function () {} }; };
  g.MutationObserver = function () { return { observe: function () {}, disconnect: function () {} }; };
  g.fetch = function () { return Promise.resolve({ ok: false, json: function () { return Promise.resolve({}); } }); };
  g.CustomEvent = function () {}; g.Event = function () {};
  g.addEventListener = function () {}; g.removeEventListener = function () {};
  // 確定性亂數：沙箱裡的任何抽樣都不得讓斷言隨機轉紅
  g.crypto = { getRandomValues: function (a) { for (var i = 0; i < a.length; i++) a[i] = (i * 2654435761) >>> 0; return a; } };
  vm.createContext(g);
  g.__failed = [];
  files.forEach(function (rel) {
    try { vm.runInContext(fs.readFileSync(path.join(SRC, rel), "utf8"), g, { filename: rel }); }
    catch (e) { g.__failed.push(rel + " :: " + String((e && e.message) || e).split("\n")[0]); }
  });
  return g;
}

/* 首屏「核心層」清單（濾掉 layout/ views/ main.js）＝沙箱要跑的那一份。
 * 由 `sandbox()` 與各測項共用，**不得各自複製這段 filter**（否則射程會兩邊漂移）。 */
function coreScripts() {
  return firstScreenScripts().filter(function (r) {
    return !SANDBOX_SKIP.some(function (p) { return r.indexOf(p) === 0; });
  });
}

/* 全新的一份首屏核心層沙箱。**會寫入的測項請用這個**（`sandbox()` 是共用快取，
 * 在裡面 register/join 會污染其他讀者）。 */
function freshSandbox() {
  var files = coreScripts();
  var g;
  try { g = boot(files); }
  catch (e) { return { HL: null, failed: ["boot threw :: " + String((e && e.message) || e)], loaded: 0 }; }
  return { HL: g.HL || null, failed: g.__failed, loaded: files.length };
}

var _sandbox = null;
/* 首屏核心層沙箱（快取一次·**唯讀用途**）。回傳 { HL, failed, loaded }。 */
function sandbox() {
  if (!_sandbox) _sandbox = freshSandbox();
  return _sandbox;
}

function walk(dir, out) {
  var names;
  try { names = fs.readdirSync(dir); } catch (e) { return out; }
  names.forEach(function (n) {
    var p = path.join(dir, n);
    var st;
    try { st = fs.statSync(p); } catch (e) { return; }
    if (st.isDirectory()) walk(p, out);
    else if (/\.js$/.test(n)) out.push(p);
  });
  return out;
}

function rel(p) { return p.split(path.sep).join("/").replace(/^.*\/prototype\/src\//, ""); }

/* ---------------------------------------------------------------------------
 * 「只認呼叫、不認提及」的篩子（2026-08-31 20:00 窗補·本檔檔頭第一天就寫著這條紀律，
 *  但**實作從來沒有做到**）——原 scanStatic 直接對整份原始碼跑 `HL.<ns>.register(` 正則，
 *  於是**註解與字串裡的提及**一律被算成呼叫點。實測污染 10 個命名空間、共 17 筆非程式碼命中，
 *  其中三筆造成台帳讀數直接錯：
 *    · `i18n/en.js:47`（註解）  ⇒ `HL.econCfg` 外部註冊者被報成 15（真值 14）
 *    · `core/reports.js:726`（字串）⇒ `HL.achievements` 多出一個**從未註冊過任何成就**的註冊者檔
 *    · `data/games-loader.js:4`（註解）⇒ `HL.games` 同上（它讀 registry.json 注入 game.js，
 *      註冊是各遊戲檔自己做的，它本人一次都沒呼叫）
 *  更嚴重的是**分類邊界**由註解決定：`sites.length > 0` 是 ①（有呼叫點）／②（檔內登記簿）的分水嶺，
 *  而 `edge`／`guild`／`progressSrc`／`selftest` 四支的**唯一**命中都是自己檔頭註解裡的用法示範
 *  ⇒ 它們被歸進①「有外部呼叫點（壞掉會在行為上現形）」，而真實 code 呼叫點是 0。
 *  ⇒ CLAUDE.md §4「修一半而看不出來」在**量測層**的一例，且與 08-31 14:00 窗的
 *    〔功能／中央掛鉤〕名冊同型：**數字看起來穩定，成員是錯的**。
 *
 *  篩法：單趟字元狀態機標出 `//`、/* *\/、'…'、"…"、`…` 的射程（0=程式碼 1=註解 2=字串），
 *  只採 mask 為 0 的命中。刻意不用正則移除註解——本檔多處註解裡就寫著 `HL.x.register(` 範例，
 *  移除法會讓行號位移、`docMentions` 也就報不出「在哪一行提及」。
 * --------------------------------------------------------------------------- */
function nonCodeMask(s) {
  var m = new Uint8Array(s.length), i = 0, n = s.length;
  while (i < n) {
    var c = s[i], d = s[i + 1];
    if (c === "/" && d === "/") { while (i < n && s[i] !== "\n") { m[i] = 1; i++; } continue; }
    if (c === "/" && d === "*") {
      m[i] = m[i + 1] = 1; i += 2;
      while (i < n && !(s[i] === "*" && s[i + 1] === "/")) { m[i] = 1; i++; }
      if (i < n) { m[i] = m[i + 1] = 1; i += 2; }
      continue;
    }
    if (c === "\"" || c === "'" || c === "`") {
      var q = c; m[i] = 2; i++;
      while (i < n && s[i] !== q) { if (s[i] === "\\") { m[i] = 2; i++; } if (i < n) { m[i] = 2; i++; } }
      if (i < n) { m[i] = 2; i++; }
      continue;
    }
    i++;
  }
  return m;
}

/* 純函式出口（供常駐鎖用 fixture 打篩子本身，不必碰真實檔案）：
 * 回傳 { code: [line…], doc: [{line, kind}…] }。 */
function registerSitesIn(text, ns) {
  var m = nonCodeMask(text);
  var re = new RegExp("HL\\." + ns + "\\.register\\s*\\(", "g");
  var out = { code: [], doc: [] }, mm;
  while ((mm = re.exec(text))) {
    var line = text.slice(0, mm.index).split("\n").length;
    if (m[mm.index] === 0) out.code.push(line);
    else out.doc.push({ line: line, kind: m[mm.index] === 1 ? "comment" : "string" });
  }
  return out;
}

/* 靜態面：找出所有 HL.<ns>.register 擴充點 + 逐個算 owner/外部呼叫點。 */
function scanStatic() {
  var files = walk(SRC, []);
  var src = {};
  files.forEach(function (f) { try { src[f] = fs.readFileSync(f, "utf8"); } catch (e) { src[f] = ""; } });

  // owner：同一檔內既有 `HL.<ns> =` 賦值、又有 register 成員
  var owners = {};
  files.forEach(function (f) {
    var s = src[f];
    if (!/\bregister\s*[:=]/.test(s)) return;
    var m = s.match(/(?:window\.)?HL\.([A-Za-z0-9_$]+)\s*=/g) || [];
    m.forEach(function (g) {
      var ns = g.match(/HL\.([A-Za-z0-9_$]+)/)[1];
      (owners[ns] = owners[ns] || []).push(f);
    });
  });

  var rows = [], internalOnly = [];
  Object.keys(owners).forEach(function (ns) {
    if (ns === "_selftestQ") return;   // 延後註冊佇列（陣列），不是命名空間
    var sites = [], docs = [];
    files.forEach(function (f) {
      var got = registerSitesIn(src[f], ns);
      got.code.forEach(function (line) { sites.push({ file: f, line: line }); });
      got.doc.forEach(function (d) { docs.push({ file: f, line: d.line, kind: d.kind }); });
    });
    var docFiles = docs.map(function (x) { return rel(x.file); }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (!sites.length) {                           // 無**程式碼**呼叫點＝不在棘輪射程（見檔頭射程第一條）
      // 但仍回報，供情報側追；docMentions 一併帶著，否則「它為什麼曾經被歸進①」下一輪就查不到了
      internalOnly.push({ ns: ns, owners: owners[ns].map(rel), docMentions: docs.length, docMentionFiles: docFiles });
      return;
    }
    var own = owners[ns];
    var ext = sites.filter(function (x) { return own.indexOf(x.file) < 0; });
    rows.push({
      ns: ns,
      owners: own.map(rel),
      total: sites.length,
      external: ext.length,
      externalFiles: ext.map(function (x) { return rel(x.file); }).filter(function (v, i, a) { return a.indexOf(v) === i; }),
      docMentions: docs.length,
      docMentionFiles: docFiles
    });
  });
  rows.sort(function (a, b) { return a.external - b.external || (a.ns < b.ns ? -1 : 1); });
  internalOnly.sort(function (a, b) { return a.ns < b.ns ? -1 : 1; });
  return { rows: rows, internalOnly: internalOnly };
}

/* 漏斗檢測（**與正式探針共用同一段程式**，供鎖的反向錨拿假登記簿自我驗證：
 * 一個「什麼都收」的假 register 必須被判 failClosed:false，否則這把尺是空心的）。 */
function leakCheck(m) {
  var out = { hasRegister: false, enumerators: [], leaks: [], failClosed: null, size: -1 };
  if (!m || typeof m !== "object") return out;
  out.hasRegister = typeof m.register === "function";
  ENUMERATORS.forEach(function (k) { if (typeof m[k] === "function") out.enumerators.push(k); });
  if (!out.hasRegister || !out.enumerators.length) return out;

  var reader = out.enumerators[0];
  function size() {
    var v = m[reader]();
    return typeof v === "number" ? v : (v && v.length) || 0;
  }
  var before = size();
  out.size = before;
  BAD_SPECS.forEach(function (spec, i) {
    var rv;
    try { rv = m.register(spec); } catch (e) { rv = "threw"; }
    if (size() !== before) out.leaks.push({ caseIndex: i, ret: String(rv) });
  });
  out.failClosed = out.leaks.length === 0;
  return out;
}

/* 行為面：對 PROBEABLE 的模組實際 require，量列舉器與負向拒收。 */
function probe(ns) {
  var out = { ns: ns, requireable: false, hasRegister: false, enumerators: [], failClosed: null, leaks: [], error: "" };
  if (!PROBEABLE[ns]) return out;
  var m;
  try { m = require(path.join(SRC, PROBEABLE[ns])); }
  catch (e) { out.error = String(e && e.message || e).split("\n")[0]; return out; }
  out.requireable = true;
  var lc = leakCheck(m);
  out.hasRegister = lc.hasRegister;
  out.enumerators = lc.enumerators;
  out.leaks = lc.leaks;
  out.failClosed = lc.failClosed;
  out.size = lc.size;
  return out;
}

function scan() {
  var st = scanStatic();
  var registries = st.rows;
  var probes = {};
  registries.forEach(function (r) { probes[r.ns] = probe(r.ns); });
  st.internalOnly.forEach(function (r) { r.probe = probe(r.ns); });

  /* 第三個環境：沙箱裡有 register + 至少一個列舉器 ⇒ 測項有能力自己註冊一筆再斷言它出現。
   * 這一格是 2026-08-29 20:00 窗補的；在那之前「證明得到」只認 externallyExercised / nodeVerifiable
   * 兩格，於是 `guild`（唯一兩格皆否者）被記成「無法證明」並被誤判為受 [P-FS] 阻塞四輪。 */
  var sb = sandbox();
  function sandboxVerifiableOf(ns) {
    var m = sb.HL && sb.HL[ns];
    if (!m || typeof m.register !== "function") return false;
    return ENUMERATORS.some(function (k) { return typeof m[k] === "function"; });
  }

  function verifiabilityOf(ns, p) {
    p = p || {};
    var nodeVerifiable = !!(p.requireable && p.hasRegister && p.enumerators && p.enumerators.length);
    var sandboxVerifiable = sandboxVerifiableOf(ns);
    return { nodeVerifiable: nodeVerifiable, sandboxVerifiable: sandboxVerifiable };
  }

  var classified = registries.map(function (r) {
    var p = probes[r.ns];
    var v = verifiabilityOf(r.ns, p);
    return {
      ns: r.ns,
      owners: r.owners,
      total: r.total,
      external: r.external,
      externalFiles: r.externalFiles,
      docMentions: r.docMentions,
      docMentionFiles: r.docMentionFiles,
      externallyExercised: r.external > 0,
      nodeVerifiable: v.nodeVerifiable,
      sandboxVerifiable: v.sandboxVerifiable,
      probe: p,
      unproven: r.external === 0 && !v.nodeVerifiable && !v.sandboxVerifiable
    };
  });

  /* ② 那張清單也一併算出可證明性（2026-08-31 20:00 窗新增·**只回報、不進棘輪**）。
   * 為什麼要算：①／② 的分水嶺是「有沒有 `HL.<ns>.register(` 命中」，而在本輪修掉篩子之前
   * 那個命中**可以是一句註解**——`edge`／`guild`／`progressSrc`／`selftest` 四支的唯一命中都是
   * 自己檔頭的用法示範。篩子修好後它們正確地落到 ②，但 `unproven` 只算 ① ⇒ **射程等於少了四支**。
   * 為什麼**不**把 unproven 的射程直接擴到 ②（本輪實測後撤回的一版）：以「對外公開 register」
   * 界定射程時，`rg`／`shop`／`sla` 三支會立刻被判 unproven，而原因是 `ENUMERATORS` 詞彙表
   * （ids/list/all/count/keys）**收不到它們的列舉器**（`shop.catalog`／`sla.dims`／`sla.caps`／
   * `rg.pauseOptions`）；同時 `dock` 會被判「不是擴充點」，只因 layout/ 不進沙箱——
   * 一邊三個誤報、一邊一個漏報。⇒ 那是**詞彙表射程**的問題，不是這裡能順手解的，
   * 硬擴射程只會製造假警報疲勞（同 08-30 20:00 窗「刻意不鎖正向」的判斷）。已開卡追。
   * 折衷＝**把四支的可證明性照樣算出來並回報**，讓「它們今天仍然證明得到」有機械讀數，
   * 且由本輪新鎖 `platform/registry-sites-code-only` 釘住「分類邊界只由程式碼呼叫點決定」。 */
  st.internalOnly.forEach(function (r) {
    var v = verifiabilityOf(r.ns, r.probe);
    r.nodeVerifiable = v.nodeVerifiable;
    r.sandboxVerifiable = v.sandboxVerifiable;
    r.external = 0;
  });

  return {
    registries: classified,
    internalOnly: st.internalOnly,
    sandbox: { loaded: sb.loaded, failed: sb.failed.slice(), ready: !!sb.HL },
    unproven: classified.filter(function (c) { return c.unproven; }).map(function (c) { return c.ns; }),
    baseline: UNPROVEN_BASELINE.slice(),
    // leaky／probed 橫跨兩張清單（in-scope + internalOnly）＝行為斷言的真實射程
    leaky: classified.concat(st.internalOnly).filter(function (c) { return c.probe && c.probe.failClosed === false; }).map(function (c) { return c.ns; }),
    probed: classified.concat(st.internalOnly).filter(function (c) { return c.probe && c.probe.failClosed !== null; }).map(function (c) { return c.ns; })
  };
}

/* ══ 結算詞彙探針（2026-09-01 平台軌 08:00 窗 · 金流台帳輪替時查獲）═══════════════
 * 【量什麼】一注最終以什麼字串抵達中央結算掛鉤 `HL.liveStats.record(game, …)`
 *   （＝「結算詞彙」），以及那個字串能不能被 `HL.games.byId` 解析（＝「登錄表 id 詞彙」）。
 *
 * 【為什麼要量 · 這是既有兩層鎖都看不到的第三層】
 *   同一條中央掛鉤上已經有兩條鎖，但它們問的是**別的問題**：
 *     · `platform/central-hook-fanout-roster`      → 下游**收不收到** game？
 *     · `platform/central-hook-game-arg-consumed`  → 下游**讀不讀** game？
 *   兩條都綠。**沒有任何一條問「讀到的那個值，在它要查的那本字典裡查得到嗎」** ⇒
 *   實測全站有**兩套詞彙**：結算端有一批寫的是顯示名（`暗影儀式`／`小雞過馬路`／
 *   `跟注·百家樂`／`賞金局 · 翻牌`／`Slots Battle`）或舊 slug（`roulette`），
 *   登錄表用的是正式 slug id（`shadow-ritual`／`chicken-cross`／`european-roulette`）。
 *   ⇒ CLAUDE.md §4「修一半而看不出來」在**量測層**的形狀：兩層驗證面全綠，
 *   第三層從來沒有人立過。
 *
 * 【它為什麼是錢的問題，不是命名潔癖】
 *   `core/heat.js` 的 `matchGame()` **已經知道**這件事，並自己寫了一個 fuzzy 比對器繞過去
 *   （檔內註解原句：「名稱字串各遊戲不一致，找不到不致命」）——那裡確實不致命（只是熱度沒加溫）。
 *   但 `core/wager-scope.js` 的 `typeOf()` 走的是**精確** `HL.games.byId(id)`，查不到回 `UNKNOWN`，
 *   而 `weightFor()` 對未列出的類別取 `w.rest`、沒有 `rest` 就 0，且出貨的 `standard` preset
 *   （`{slot:1, original:1, special:1, table:0.1, live:0.1}`）**正好沒有 `rest`** ⇒ 權重 **0**。
 *   ⇒ 一旦有任何紅利宣告 `scope`，押在**旗艦 slot 暗影儀式**上的流水對那筆紅利貢獻 **0**，
 *   而 `standard` 的賣點正是「slot 全額、桌遊一折」＝與意圖完全相反，且畫面上看不出任何異常。
 *   今天之所以還沒出事，只因為**全站零筆紅利宣告 `scope`**（`weightFor` 的零回歸錨點直接回 1）。
 *   ⇒ 這是**潛伏**缺陷：#89 的功能一被用上就立刻變成活缺陷。這也是本探針的鎖
 *   （`platform/settle-vocab-scoped-bonus-interlock`）採**互鎖**而非直接斷言的原因——
 *   真正的修法要動首屏 `core/wager-scope.js`，而 #118 未解前首屏餘裕只有 27 bytes。
 *
 * 【射程：兩個來源，刻意分開記】
 *   一注抵達掛鉤有兩條路，兩條都要量，否則讀數會漏掉大半個遊戲庫：
 *     · `direct`＝各 view 自己呼叫 `HL.liveStats.record("鍵", …)`（旗艦 slot／小雞／賞金局／
 *       對戰／跟注／各 instant 小遊戲走這條）。
 *     · `engine`＝經共用引擎轉手：`HL.instant.betPanel({ game:"鍵" })`／
 *       `HL.table.betArea({ game:"鍵" })`，引擎再於結算時把 `opts.game` 餵進掛鉤
 *       （`core/instant.js` 與 `core/table.js` 各一處，值域＝呼叫端的 `game:` 字面量）。
 *   ⚠️ **只量 direct 會漏掉 10 款以上**（所有 dice／limbo／plinko／cases 與六款桌遊都走 engine），
 *      而唯一那個「舊 slug」型不符（`roulette`）恰好只出現在 engine 側 ⇒ 少量一邊，
 *      這條鎖會對它完全無感。分開記是為了讓讀數可歸因，不是為了擴射程。
 *
 * 【已知偏差（讀數時一起讀）】
 *   · 沿用本檔硬規則「只認呼叫、不認提及」：`HL.liveStats.record(`／引擎呼叫必須落在程式碼上
 *     （`nonCodeMask` 判 0），註解／字串裡的提及只計入 `docMentions`。
 *   · 只認**字面量字串**。`"彩金·" + t.name`（jackpot 分級名）、`opts.game || "instant"`／
 *     `opts.game || "table"`（引擎自己的後備）這類**組合式**收進 `composed`，刻意不試圖求值。
 *     ⚠️ 那兩個 `||` 後備本身就是「呼叫端漏傳 game 時靜默吸收」的形制（＝2026-08-29
 *     `bonus.add` source 那條教訓的同一形狀），但它們是引擎的**內部後備**、不是詞彙表成員，
 *     故不計入 `unresolved`，僅列在 `composed` 供人讀。
 *     ⇒ 本探針**偏保守**：會少報不可解析的鍵，不會多報。
 *   · 登錄表 id 取自共用**唯讀沙箱** `sandbox().HL.games.all()`（權威值，非 grep 推導）。
 */
var SETTLE_HOOK_RE = /HL\.liveStats\.record\s*\(/g;
/* 共用引擎入口：值域＝呼叫端傳的 `game:` 字面量，引擎再轉手餵進掛鉤 */
var SETTLE_ENGINE_RE = /HL\.(?:instant\.betPanel|table\.betArea)\s*\(\s*\{/g;

/* 從 `(` 或 `{` 之後的位置起，取到第一個頂層分隔符為止的原文（括號/引號感知）。
 * stop＝要停下來的頂層字元集合。回 { raw, end }。 */
function sliceTopLevel(text, from, stop) {
  var depth = 0, q = null, raw = "", i = from;
  for (; i < text.length; i++) {
    var c = text[i];
    if (q) {
      if (c === "\\") { raw += c + (text[i + 1] || ""); i++; continue; }
      if (c === q) q = null;
      raw += c; continue;
    }
    if (c === '"' || c === "'" || c === "`") { q = c; raw += c; continue; }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") { if (depth === 0) break; depth--; }
    else if (depth === 0 && stop.indexOf(c) >= 0) break;
    raw += c;
  }
  return { raw: raw, end: i };
}

function asLiteral(raw) {
  raw = String(raw).trim();
  var m = /^"((?:[^"\\]|\\.)*)"$/.exec(raw) || /^'((?:[^'\\]|\\.)*)'$/.exec(raw);
  return m ? m[1] : null;
}

/* 單檔掃描：回 { direct:[{key|expr,line}], engine:[…], docMentions:n } */
function settleKeysIn(text) {
  var mask = nonCodeMask(text);
  var out = { direct: [], engine: [], docMentions: 0 }, mm;

  SETTLE_HOOK_RE.lastIndex = 0;
  while ((mm = SETTLE_HOOK_RE.exec(text))) {
    if (mask[mm.index] !== 0) { out.docMentions++; continue; }
    var line = text.slice(0, mm.index).split("\n").length;
    var raw = sliceTopLevel(text, mm.index + mm[0].length, ",").raw;
    var lit = asLiteral(raw);
    out.direct.push(lit != null ? { key: lit, line: line } : { expr: raw.trim(), line: line });
  }

  SETTLE_ENGINE_RE.lastIndex = 0;
  while ((mm = SETTLE_ENGINE_RE.exec(text))) {
    if (mask[mm.index] !== 0) { out.docMentions++; continue; }
    var eline = text.slice(0, mm.index).split("\n").length;
    // 逐個頂層屬性掃到 `game:`（屬性順序各檔不同，不能假設在第一個）
    var pos = mm.index + mm[0].length, found = null;
    while (pos < text.length) {
      var seg = sliceTopLevel(text, pos, ",");
      var s = seg.raw.trim();
      if (!s && seg.end <= pos) break;
      var g = /^game\s*:\s*([\s\S]+)$/.exec(s);
      if (g) { found = g[1].trim(); break; }
      if (text[seg.end] !== ",") break;      // 到物件結尾
      pos = seg.end + 1;
    }
    if (found == null) { out.engine.push({ expr: "(無 game 屬性)", line: eline }); continue; }
    var elit = asLiteral(found);
    out.engine.push(elit != null ? { key: elit, line: eline } : { expr: found, line: eline });
  }
  return out;
}

/* 全庫掃描 + 對登錄表求解。回：
 *   { keys:[…唯一字面量鍵…], at:{key→[檔:行]}, srcOf:{key→"direct"|"engine"|"both"},
 *     sites:n, composed:[…], docMentions:n, ids:[…], typeOfId:{id→type},
 *     resolved:[…], unresolved:[…], sandboxFailed:[…] } */
function settleVocab() {
  var files = walk(SRC, []).filter(function (f) { return /\.js$/.test(f); });
  var keys = {}, srcOf = {}, composed = [], sites = 0, docMentions = 0;
  files.forEach(function (f) {
    var r = settleKeysIn(fs.readFileSync(f, "utf8"));
    docMentions += r.docMentions;
    var rel = path.relative(SRC, f).replace(/\\/g, "/");
    ["direct", "engine"].forEach(function (kind) {
      r[kind].forEach(function (x) {
        sites++;
        if (x.key == null) { composed.push({ expr: x.expr, at: rel + ":" + x.line, via: kind }); return; }
        (keys[x.key] = keys[x.key] || []).push(rel + ":" + x.line + "(" + kind + ")");
        srcOf[x.key] = (srcOf[x.key] && srcOf[x.key] !== kind) ? "both" : kind;
      });
    });
  });
  var sb = sandbox();
  var all = (sb.HL && sb.HL.games && sb.HL.games.all) ? (sb.HL.games.all() || []) : [];
  var ids = {};
  all.forEach(function (g) { if (g && g.id) ids[String(g.id)] = g.type || null; });
  var list = Object.keys(keys).sort();
  return {
    keys: list, at: keys, srcOf: srcOf, sites: sites, composed: composed, docMentions: docMentions,
    ids: Object.keys(ids).sort(), typeOfId: ids,
    resolved: list.filter(function (k) { return ids.hasOwnProperty(k); }),
    unresolved: list.filter(function (k) { return !ids.hasOwnProperty(k); }),
    sandboxFailed: sb.failed || []
  };
}

/* 宣告了 `scope` 的紅利呼叫端（owner 檔 `core/progress.js` 除外＝它是引擎，讀 opts.scope 是本分）。
 * 回 [{ at, arg }]。只認程式碼、只認 `HL.bonus.add(` 的引數文字內出現 `scope`。 */
function scopedBonusSites() {
  var files = walk(SRC, []).filter(function (f) { return /\.js$/.test(f); });
  var out = [];
  files.forEach(function (f) {
    var rel = path.relative(SRC, f).replace(/\\/g, "/");
    if (rel === "core/progress.js") return;
    var text = fs.readFileSync(f, "utf8");
    var mask = nonCodeMask(text);
    var re = /HL\.bonus\.add\s*\(/g, mm;
    while ((mm = re.exec(text))) {
      if (mask[mm.index] !== 0) continue;
      var line = text.slice(0, mm.index).split("\n").length;
      var args = sliceTopLevel(text, mm.index + mm[0].length, "").raw;
      if (/\bscope\b/.test(args)) out.push({ at: rel + ":" + line, arg: args.trim() });
    }
  });
  return out;
}

module.exports = {
  scan: scan, leakCheck: leakCheck, boot: boot, sandbox: sandbox, freshSandbox: freshSandbox,
  firstScreenScripts: firstScreenScripts, coreScripts: coreScripts,
  UNPROVEN_BASELINE: UNPROVEN_BASELINE, ENUMERATORS: ENUMERATORS, BAD_SPECS: BAD_SPECS, PROBEABLE: PROBEABLE,
  registerSitesIn: registerSitesIn, nonCodeMask: nonCodeMask,
  settleKeysIn: settleKeysIn, settleVocab: settleVocab, scopedBonusSites: scopedBonusSites
};

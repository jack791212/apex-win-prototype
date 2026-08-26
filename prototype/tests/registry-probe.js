/*
 * Apex Win｜註冊表擴充點探針（單一真相）— 平台軌 2026-08-26 20:00 窗
 * ---------------------------------------------------------------------------
 * 【為什麼有這個檔】本專案的招牌哲學是「容器先於內容」——`HL.games.register`／
 *   `HL.achievements.register`／`HL.promoCal.register`／`HL.support.register`… 全站現有 14 個
 *   `HL.<ns>.register` 擴充點。而 repo 內已**五次**記錄同一種缺陷：**容器做好了、接線沒補完**
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
 *     命中形狀為 `HL.<ns>.register(`。因此**內建品項只走檔內區域 register() 的目錄**
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
 * guild：`core/guild.js` 頂層取用 `window` ⇒ node 不可 require，且外部註冊者為零。
 *   它的公會目錄目前全是檔內種子，`HL.guild.register` 從未被任何東西走過。
 *   要脫離本清單有兩條路：補一個外部註冊者，或比照 #50/#54/#65 把純資料/純函式區
 *   以 module.exports 暴露（後者受 [P-FS] 首屏位元組凍結阻塞 ⇒ 排在 #118 之後）。 */
var UNPROVEN_BASELINE = ["guild"];

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
    var sites = [];
    files.forEach(function (f) {
      var s = src[f];
      var re = new RegExp("HL\\." + ns + "\\.register\\s*\\(", "g");
      var mm;
      while ((mm = re.exec(s))) sites.push({ file: f, line: s.slice(0, mm.index).split("\n").length });
    });
    if (!sites.length) {                           // 無呼叫點＝不在棘輪射程（見檔頭射程第一條）
      internalOnly.push({ ns: ns, owners: owners[ns].map(rel) });   // 但仍回報，供情報側追
      return;
    }
    var own = owners[ns];
    var ext = sites.filter(function (x) { return own.indexOf(x.file) < 0; });
    rows.push({
      ns: ns,
      owners: own.map(rel),
      total: sites.length,
      external: ext.length,
      externalFiles: ext.map(function (x) { return rel(x.file); }).filter(function (v, i, a) { return a.indexOf(v) === i; })
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

  var classified = registries.map(function (r) {
    var p = probes[r.ns];
    var nodeVerifiable = !!(p.requireable && p.hasRegister && p.enumerators.length);
    return {
      ns: r.ns,
      owners: r.owners,
      total: r.total,
      external: r.external,
      externalFiles: r.externalFiles,
      externallyExercised: r.external > 0,
      nodeVerifiable: nodeVerifiable,
      probe: p,
      unproven: r.external === 0 && !nodeVerifiable
    };
  });

  return {
    registries: classified,
    internalOnly: st.internalOnly,
    unproven: classified.filter(function (c) { return c.unproven; }).map(function (c) { return c.ns; }),
    baseline: UNPROVEN_BASELINE.slice(),
    // leaky／probed 橫跨兩張清單（in-scope + internalOnly）＝行為斷言的真實射程
    leaky: classified.concat(st.internalOnly).filter(function (c) { return c.probe && c.probe.failClosed === false; }).map(function (c) { return c.ns; }),
    probed: classified.concat(st.internalOnly).filter(function (c) { return c.probe && c.probe.failClosed !== null; }).map(function (c) { return c.ns; })
  };
}

module.exports = {
  scan: scan, leakCheck: leakCheck,
  UNPROVEN_BASELINE: UNPROVEN_BASELINE, ENUMERATORS: ENUMERATORS, BAD_SPECS: BAD_SPECS, PROBEABLE: PROBEABLE
};

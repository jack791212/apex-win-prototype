#!/usr/bin/env node
/*
 * ApexWin｜「這支 view 能不能搬出首屏」— 算出來的，不是看 KB 數猜的   #111
 * ---------------------------------------------------------------------------
 * 用法：
 *   node intel/tools/first-screen-deps.js                 # 掃仍靜態掛載的 views/
 *   node intel/tools/first-screen-deps.js --scope all     # 連 layout/ core/ data/ 一起評（過去完全未被評估過）
 *   node intel/tools/first-screen-deps.js --file ./src/views/slot.js
 *   node intel/tools/first-screen-deps.js --json          # 給常駐鎖/其他工具消費
 *   node intel/tools/first-screen-deps.js --verify        # 自我校準：已延遲的 5 支必須不被判 bound
 *
 * 【為什麼要有這支工具】
 *   #80（送走 19 支）與 #110（送走 5 支）兩輪的判準全靠人工 grep + 人工判斷。#110 當輪
 *   差點把大廳弄白屏：候選清單把 42KB 的 `arena.js` 標成「非開站必要」（**KB 數最大＝誘因最強**），
 *   實測它是大廳首屏的同步依賴（`lobby.js:110` 無守衛呼叫 `HL.arenaUI.roomCard`）。
 *   ⇒ **判準不是 KB 數，是「首屏那一次渲染有沒有同步碰到它的全域」**，而那件事是可以算的。
 *   這種錯只會在真實瀏覽器現形（排程輪連 dev server 都起不來）⇒ 必須在 node 端就算得出來。
 *
 * 【三欄輸出（卡上指定）】
 *   ① 它對外掛上的全域：`HL.<ns> =` 與 `HL.views.<id> =`
 *   ② 首屏渲染路徑中引用那些全域的位置（附行號、附分類）
 *   ③ 結論：safe-to-lazy ／ needs-methods:[...] ／ first-screen-bound
 *   ＋ 可回收 KB 總量
 *
 * ── 分類模型（首版的兩個誤判就是砍在這裡，故把模型寫在檔頭）─────────────────────
 *   **A `load-sync`**   載入即執行或首屏渲染鏈上的引用（模組頂層／開機可達的具名函式／
 *                       **預設路由**的 render 內）→ 搬走即 TypeError。
 *   **B `boot-timer`**  開機時就註冊的計時器／ticker 回呼內的引用，**即使有守衛也算**：
 *                       搬走不會報錯，會**靜默少一項行為**（arena 的假站環境活動不跑）。
 *                       ⇒ 這就是卡上先抄進來的阻塞事實：「無守衛」必須比 `if (HL.x)` 更寬，
 *                       否則工具會把 arena 判成 safe。
 *   **R `route`**       位於 router 登錄表 `VIEWS` 中**非預設路由**的 render 閉包內 → 不是首屏。
 *                       （首版把這類全判成 A ⇒ 連 casino/slot/chicken 都成了 bound；
 *                       而 #110 已成功延遲的 globe/liveroom/bounty/vsslot **引用點正是這張表**，
 *                       它們是本工具的地面真相：判成 bound 就是模型錯了，見 --verify。）
 *   **C `deferred`**    事件處理器（onClick/on* /addEventListener）、開/關面板類函式內的引用。
 *   A 或 B 任一成立 ⇒ `first-screen-bound`。R/C 只列出參考。
 *
 * 【誠實界定】
 *   靜態啟發式、**誤報率不為零**，且**刻意偏保守**：兩種錯的代價不對稱——誤判 bound 只是少省一點 KB，
 *   誤判 safe 是線上白屏。故不確定時一律留在首屏。字串/註解已遮罩（首版就是被註解與字串裡的大括號
 *   騙到，把整個 main.js 都算成「setInterval 回呼內」）。判 safe 的仍建議在有 preview 的輪目視一次。
 */
"use strict";
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..", "..", "prototype");
var INDEX = path.join(ROOT, "index.html");

/* ── 首屏渲染路徑（卡上定義：main.js／layout/*／views/lobby.js／shell）──────────
 * 具名函式而非散在程式裡的常數，才能被稽核：日後首屏路徑變了，只改這裡一處。 */
function firstScreenPathFiles() {
  var out = [path.join(ROOT, "src", "main.js")];
  var lay = path.join(ROOT, "src", "layout");
  try {
    fs.readdirSync(lay).forEach(function (f) { if (/\.js$/.test(f)) out.push(path.join(lay, f)); });
  } catch (e) { /* 無 layout 目錄則略過 */ }
  var lobby = path.join(ROOT, "src", "views", "lobby.js");
  if (fs.existsSync(lobby)) out.push(lobby);
  return out.filter(function (f) { return fs.existsSync(f); });
}

function readFile(f) { return fs.readFileSync(f, "utf8"); }
function rel(f) { return path.relative(ROOT, f).replace(/\\/g, "/"); }
function lineOf(src, idx) { return src.slice(0, idx).split("\n").length; }

/* ── 字串／註解遮罩：所有括號配對都在遮罩後的副本上做 ─────────────────────────
 * 首版沒有這一層，於是 main.js:16 那個頂層 setInterval 的回呼被算成「一直沒閉合」，
 * 導致整個檔的引用都被標成「setInterval 回呼內」。遮罩後長度不變 ⇒ 索引仍可直接對回原檔。 */
function maskSrc(src) {
  var out = src.split(""), i = 0, n = src.length;
  function blank(a, b) { for (var k = a; k < b && k < n; k++) if (out[k] !== "\n") out[k] = " "; }
  while (i < n) {
    var c = src[i], c2 = src[i + 1];
    if (c === "/" && c2 === "/") { var e = src.indexOf("\n", i); e = e < 0 ? n : e; blank(i, e); i = e; continue; }
    if (c === "/" && c2 === "*") { var e2 = src.indexOf("*/", i + 2); e2 = e2 < 0 ? n : e2 + 2; blank(i, e2); i = e2; continue; }
    if (c === '"' || c === "'" || c === "`") {
      var j = i + 1;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === c) break;
        j++;
      }
      blank(i, Math.min(j + 1, n)); i = Math.min(j + 1, n); continue;
    }
    i++;
  }
  return out.join("");
}

/* 從 `{` 位置配對到對應 `}`（輸入須為遮罩後字串） */
function matchBrace(m, open) {
  var depth = 0;
  for (var i = open; i < m.length; i++) {
    if (m[i] === "{") depth++;
    else if (m[i] === "}") { depth--; if (depth === 0) return i; }
  }
  return m.length - 1;
}

/* ── 函式範圍表（含名稱與巢狀）───────────────────────────────────────────── */
function functionRanges(src, m) {
  var out = [], re = /function\s*([A-Za-z_$][\w$]*)?\s*\(/g, x;
  while ((x = re.exec(m))) {
    var pOpen = m.indexOf("(", x.index + 8);
    if (pOpen < 0) continue;
    var depth = 0, k = pOpen, pClose = -1;
    for (; k < m.length; k++) {
      if (m[k] === "(") depth++;
      else if (m[k] === ")") { depth--; if (depth === 0) { pClose = k; break; } }
    }
    if (pClose < 0) continue;
    var b = m.indexOf("{", pClose);
    if (b < 0) continue;
    if (!/^\s*$/.test(m.slice(pClose + 1, b))) continue; // ) 與 { 之間須只有空白
    var end = matchBrace(m, b);
    // 名稱：具名 function、或 `NAME: function`／`NAME = function`
    var name = x[1] || null;
    if (!name) {
      var head = m.slice(Math.max(0, x.index - 60), x.index);
      var mm = head.match(/([A-Za-z_$][\w$]*)\s*[:=]\s*$/);
      if (mm) name = mm[1];
    }
    out.push({ name: name, start: x.index, bodyStart: b, end: end });
  }
  return out;
}

function enclosingChain(ranges, idx) {
  return ranges.filter(function (r) { return idx > r.bodyStart && idx < r.end; })
    .sort(function (a, b) { return (a.end - a.bodyStart) - (b.end - b.bodyStart); });
}

/* ── 模組 IIFE：`(function (global) { … })(window)` 的那一層不算「函式內」──────── */
function moduleIife(ranges, len) {
  var best = null;
  ranges.forEach(function (r) {
    if (r.start < 200 && (r.end - r.start) > len * 0.6) {
      if (!best || (r.end - r.start) > (best.end - best.start)) best = r;
    }
  });
  return best;
}

/* ── 開機可達的具名函式（同檔名稱式呼叫圖）──────────────────────────────────
 * 起點＝模組頂層（IIFE 直屬）出現的 `NAME(` 呼叫；再沿著這些函式體內的呼叫遞移展開。
 * 名稱式呼叫圖會**高報**（同名不同物、條件分支都算），方向與本工具的保守偏誤一致。 */
function bootReachable(m, ranges, iife) {
  var byName = {};
  ranges.forEach(function (r) { if (r.name) (byName[r.name] = byName[r.name] || []).push(r); });
  function callsIn(a, b) {
    var seg = m.slice(a, b), out = [], re = /([A-Za-z_$][\w$]*)\s*\(/g, x;
    while ((x = re.exec(seg))) if (byName[x[1]]) out.push(x[1]);
    return out;
  }
  // 頂層＝在 IIFE 內、但不在任何更內層函式內的區段
  var inner = ranges.filter(function (r) { return r !== iife && (!iife || (r.start > iife.bodyStart && r.end < iife.end)); });
  var topSegs = [], cur = iife ? iife.bodyStart + 1 : 0, endAll = iife ? iife.end : m.length;
  inner.filter(function (r) { return !inner.some(function (o) { return o !== r && r.start > o.bodyStart && r.end < o.end; }); })
    .sort(function (a, b) { return a.start - b.start; })
    .forEach(function (r) { topSegs.push([cur, r.start]); cur = r.end + 1; });
  topSegs.push([cur, endAll]);

  var seen = {}, queue = [];
  topSegs.forEach(function (s) { callsIn(s[0], s[1]).forEach(function (n) { queue.push(n); }); });
  while (queue.length) {
    var n = queue.shift();
    if (seen[n]) continue;
    seen[n] = true;
    (byName[n] || []).forEach(function (r) { callsIn(r.bodyStart, r.end).forEach(function (c) { if (!seen[c]) queue.push(c); }); });
  }
  return { names: seen, topSegs: topSegs, byName: byName };
}

/* ── 開機時註冊的計時器／ticker 回呼範圍（B 類的來源）───────────────────────── */
function bootTimerBodies(m, ranges, boot, iife) {
  var out = [], re = /\b(setInterval|setTimeout)\s*\(|HL\.ticker\.add\s*\(/g, x;
  function isBootPos(i) {
    var ch = enclosingChain(ranges, i).filter(function (r) { return r !== iife; });
    if (!ch.length) return true;                       // 模組頂層
    return ch.some(function (r) { return r.name && boot.names[r.name]; });
  }
  while ((x = re.exec(m))) {
    if (!isBootPos(x.index)) continue;
    var cb = ranges.filter(function (r) { return r.start > x.index && r.start < x.index + 40; })
      .sort(function (a, b) { return a.start - b.start; })[0];
    if (cb) out.push({ kind: x[1] || "ticker.add", body: cb });
  }
  return out;
}

/* ── router 登錄表 VIEWS：每個 route 的閉包範圍 + 預設路由 ─────────────────── */
function routeTable(m, ranges) {
  var i = m.search(/var\s+VIEWS\s*=\s*\{/);
  if (i < 0) return null;
  var open = m.indexOf("{", i), end = matchBrace(m, open);
  var keys = [], re = /([A-Za-z_$][\w$]*)\s*:\s*\{/g, x;
  var seg = m.slice(open, end);
  while ((x = re.exec(seg))) {
    var kStart = open + x.index, kEnd = matchBrace(m, open + x.index + x[0].length - 1);
    keys.push({ route: x[1], start: kStart, end: kEnd });
  }
  var dm = m.slice(end, end + 400).match(/VIEWS\[[^\]]*\]\s*\|\|\s*VIEWS\.([A-Za-z_$][\w$]*)/);
  return { start: open, end: end, keys: keys, defaultRoute: dm ? dm[1] : "lobby" };
}

/* ── 單一符號在首屏路徑各檔的引用分類 ──────────────────────────────────────── */
function classifyRefs(files, sym, cache) {
  var out = [];
  var esc = sym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  files.forEach(function (f) {
    var c = cache[f] || (cache[f] = (function () {
      var src = readFile(f), m = maskSrc(src), ranges = functionRanges(src, m);
      var iife = moduleIife(ranges, src.length);
      var boot = bootReachable(m, ranges, iife);
      return {
        src: src, m: m, ranges: ranges, iife: iife, boot: boot,
        timers: bootTimerBodies(m, ranges, boot, iife),
        table: routeTable(m, ranges),
        base: path.basename(f)
      };
    })());
    var re = new RegExp(esc + "(?![\\w$])", "g"), x;
    while ((x = re.exec(c.m))) {          // 掃遮罩後的副本 ⇒ 註解/字串裡的提及不算引用
      var i = x.index, cls, why = [];
      var chain = enclosingChain(c.ranges, i).filter(function (r) { return r !== c.iife; });

      // R：router 登錄表內非預設路由的閉包
      if (c.table && i > c.table.start && i < c.table.end) {
        var hit = c.table.keys.filter(function (k) { return i > k.start && i < k.end; })[0];
        if (hit && hit.route !== c.table.defaultRoute) {
          out.push(mk("R", "VIEWS." + hit.route + " 路由閉包（非預設路由 " + c.table.defaultRoute + "）"));
          continue;
        }
        if (hit) { out.push(mk("A", "VIEWS." + hit.route + "＝預設路由，首屏就渲染")); continue; }
      }
      // B：開機時註冊的計時器／ticker 回呼內（有守衛也算）
      var tm = c.timers.filter(function (t) { return i > t.body.bodyStart && i < t.body.end; })[0];
      if (tm) { out.push(mk("B", tm.kind + " 回呼（開機時註冊）內，搬走＝行為靜默減少")); continue; }
      // C：事件處理器／開關面板類
      var ev = chain.filter(function (r) { return r.name && /^(on[A-Z]|open|close|toggle|show|hide|handle)/.test(r.name); })[0];
      var evProp = /(?:onClick|onInput|onChange|onSubmit|addEventListener)\s*[:(]\s*$/.test(
        c.m.slice(Math.max(0, (chain[0] || { start: i }).start - 40), (chain[0] || { start: i }).start));
      if (ev || evProp) { out.push(mk("C", "事件處理器內（僅使用者操作時才跑）")); continue; }
      // A：模組頂層／開機可達具名函式／預設路由 view 的 render
      if (!chain.length) { out.push(mk("A", "模組頂層，載入即執行")); continue; }
      var bootFn = chain.filter(function (r) { return r.name && c.boot.names[r.name]; })[0];
      if (bootFn) { out.push(mk("A", "開機可達函式 " + bootFn.name + "() 內")); continue; }
      if (c.base === "lobby.js") { out.push(mk("A", "預設路由 lobby 的渲染鏈上")); continue; }
      out.push(mk("C", "延遲閉包（無法證明在首屏鏈上）"));

      function mk(cls2, why2) {
        return {
          file: rel(f), line: lineOf(c.src, i), sym: sym, cls: cls2, why: why2,
          text: (function () {
            var a = c.src.lastIndexOf("\n", i) + 1, b = c.src.indexOf("\n", i);
            return c.src.slice(a, b < 0 ? c.src.length : b).trim().slice(0, 130);
          })()
        };
      }
    }
  });
  return out;
}

/* ── ① 這支檔對外掛上的全域 ────────────────────────────────────────────────
 * 只認賦值（`=`），不認讀取——否則每支檔都會「宣稱」自己擁有它讀到的全域。 */
function declaredSurfaces(src) {
  var m = maskSrc(src), views = {}, nss = {}, x;
  var reV = /HL\.views\.([A-Za-z_$][\w$]*)\s*=[^=]/g;
  while ((x = reV.exec(m))) views[x[1]] = true;
  var reVq = /HL\.views\[\s*["']([\w-]+)["']\s*\]\s*=[^=]/g;
  while ((x = reVq.exec(src))) views[x[1]] = true;   // 鍵在字串裡 ⇒ 讀原檔
  var reN = /(?:^|[^\w$.])HL\.([A-Za-z_$][\w$]*)\s*=[^=]/gm;
  while ((x = reN.exec(m))) { if (x[1] !== "views") nss[x[1]] = true; }
  return { views: Object.keys(views).sort(), globals: Object.keys(nss).sort() };
}

/* ── ③ 跨檔同步成員呼叫（needs-methods）────────────────────────────────────
 * 首屏之外的檔若同步呼叫 `HL.views.<id>.<member>`／`HL.<ns>.<member>`，延遲載入時那些
 * 成員必須先有 stub（#110 的 `methods: []`），否則「點了沒反應」與「還在載入」完全同形。 */
function crossFileMembers(allFiles, ownerAbs, surfaces) {
  var need = {}, SKIP = { "lazy-views.js": 1, "lazy-games.js": 1, "lazy-load.js": 1 };
  allFiles.forEach(function (f) {
    if (f === ownerAbs || SKIP[path.basename(f)]) return;
    var m = maskSrc(readFile(f)), x;
    surfaces.views.forEach(function (id) {
      var re = new RegExp("HL\\.views\\." + id + "\\.([A-Za-z_$][\\w$]*)", "g");
      while ((x = re.exec(m))) if (x[1] !== "render") need["views." + id + "." + x[1]] = true;
    });
    surfaces.globals.forEach(function (ns) {
      var re = new RegExp("HL\\." + ns + "\\.([A-Za-z_$][\\w$]*)", "g");
      while ((x = re.exec(m))) need[ns + "." + x[1]] = true;
    });
  });
  return Object.keys(need).sort();
}

function srcDirFiles() {
  var out = [];
  (function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(function (e) {
      var p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name)) out.push(p);
    });
  })(path.join(ROOT, "src"));
  return out;
}

function staticScripts() {
  var html = readFile(INDEX), out = [], re = /<script[^>]*src="(\.[^"]+)"/g, x;
  while ((x = re.exec(html))) out.push(x[1]);
  return out;
}

function candidates(scope) {
  var dirs = scope === "all" ? ["views", "layout", "core", "data"]
    : scope === "layout" ? ["layout"] : scope === "core" ? ["core"] : ["views"];
  return staticScripts().filter(function (s) {
    return dirs.some(function (d) { return s.indexOf("./src/" + d + "/") === 0; });
  });
}

var _cache = {};
function analyze(relSrc) {
  var abs = path.join(ROOT, relSrc.replace(/^\.\//, ""));
  if (!fs.existsSync(abs)) return null;
  var src = readFile(abs), surfaces = declaredSurfaces(src);
  var fsPath = firstScreenPathFiles().filter(function (f) { return f !== abs; });
  var refs = [];
  surfaces.views.forEach(function (id) { refs = refs.concat(classifyRefs(fsPath, "HL.views." + id, _cache)); });
  surfaces.globals.forEach(function (ns) { refs = refs.concat(classifyRefs(fsPath, "HL." + ns, _cache)); });
  // 同一行出現同一符號兩次（`if (HL.x) HL.x.tick()`）只算一處引用，否則報表會虛胖
  var seenRef = {};
  refs = refs.filter(function (r) {
    var k = r.file + ":" + r.line + ":" + r.sym + ":" + r.cls;
    if (seenRef[k]) return false; seenRef[k] = true; return true;
  });
  function of(c) { return refs.filter(function (r) { return r.cls === c; }); }
  var A = of("A"), B = of("B"), R = of("R"), C = of("C");
  var need = crossFileMembers(srcDirFiles(), abs, surfaces);
  var verdict = (A.length || B.length) ? "first-screen-bound" : (need.length ? "needs-methods" : "safe-to-lazy");
  return {
    src: relSrc, kb: +(fs.statSync(abs).size / 1024).toFixed(1), surfaces: surfaces, verdict: verdict,
    reason: A.length ? "A 類首屏同步引用 " + A.length + " 處（搬走即 TypeError）"
      : B.length ? "B 類開機計時器回呼 " + B.length + " 處（搬走不報錯，行為靜默減少）"
        : need.length ? "跨檔同步成員 " + need.length + " 個需先有 stub"
          : "首屏路徑零同步引用",
    A: A, B: B, R: R, C: C, needs: need
  };
}

/* ── 自我校準：已經延遲成功的檔就是地面真相 ─────────────────────────────────
 * #80／#110 送走的檔今天都活著（線上沒白屏）⇒ 本工具若把它們判 bound，是模型錯了不是它們錯了。
 * 這一項同時是常駐鎖 `platform/lazy-list-not-first-screen-bound` 的判準來源。 */
function lazyManifestSrcs() {
  var out = [];
  ["lazy-games.js", "lazy-views.js"].forEach(function (f) {
    try {
      var mod = require(path.join(ROOT, "src", "data", f));
      var mf = mod && (mod.manifest || mod.MANIFEST);
      (Array.isArray(mf) ? mf : []).forEach(function (e) { if (e && e.src) out.push(e.src); });
    } catch (e) { /* 檔不存在或不 export ⇒ 由呼叫端決定要不要 skip */ }
  });
  return out;
}

function verify() {
  var srcs = lazyManifestSrcs(), bad = [];
  srcs.forEach(function (s) {
    var r = analyze(s);
    if (!r) return;
    if (r.verdict === "first-screen-bound") bad.push({ src: s, reason: r.reason, hits: r.A.concat(r.B) });
  });
  console.log("自我校準：已延遲清單 " + srcs.length + " 支");
  if (!bad.length) { console.log("✅ 全部未被判 bound＝模型與地面真相一致"); return true; }
  bad.forEach(function (b) {
    console.log("❌ " + b.src + " 被判 bound（但它已在線上延遲載入且沒白屏）→ " + b.reason);
    b.hits.forEach(function (h) { console.log("   " + h.cls + " " + h.file + ":" + h.line + " " + h.why); });
  });
  return false;
}

function run(argv) {
  argv = argv || [];
  if (argv.indexOf("--verify") >= 0) { process.exitCode = verify() ? 0 : 1; return; }
  var scope = "views", only = null, asJson = argv.indexOf("--json") >= 0;
  var si = argv.indexOf("--scope"); if (si >= 0) scope = argv[si + 1] || "views";
  var fi = argv.indexOf("--file"); if (fi >= 0) only = argv[fi + 1];
  var rows = (only ? [only] : candidates(scope)).map(analyze).filter(Boolean);
  if (asJson) { process.stdout.write(JSON.stringify({ scope: scope, rows: rows }, null, 1) + "\n"); return rows; }

  console.log("首屏依賴分析（scope=" + scope + "、候選 " + rows.length + " 支）");
  console.log("首屏渲染路徑＝" + firstScreenPathFiles().map(rel).join("、"));
  console.log("");
  var reclaim = 0;
  rows.sort(function (a, b) { return b.kb - a.kb; }).forEach(function (r) {
    var mark = r.verdict === "safe-to-lazy" ? "✅" : r.verdict === "needs-methods" ? "🟡" : "⛔";
    console.log(mark + " " + r.src + "  " + r.kb + "KB  → " + r.verdict +
      (r.verdict === "needs-methods" ? ":[" + r.needs.join(",") + "]" : ""));
    console.log("   ① 全域：" + (r.surfaces.globals.map(function (g) { return "HL." + g; })
      .concat(r.surfaces.views.map(function (v) { return "HL.views." + v; })).join(" ") || "（無）"));
    console.log("   ② " + r.reason);
    r.A.concat(r.B).forEach(function (x) {
      console.log("      " + x.cls + " " + x.file + ":" + x.line + " — " + x.why + "\n         " + x.text);
    });
    if (r.R.length || r.C.length) {
      console.log("      （R 路由閉包 " + r.R.length + " 處、C 事件驅動 " + r.C.length + " 處＝不阻擋）");
    }
    if (r.verdict !== "first-screen-bound") reclaim += r.kb;
  });
  console.log("");
  console.log("可回收 KB 總量（safe-to-lazy + needs-methods）＝ " + reclaim.toFixed(1) + "KB");
  var bound = rows.filter(function (r) { return r.verdict === "first-screen-bound"; });
  console.log("⛔ first-screen-bound：" + (bound.map(function (r) { return path.basename(r.src); }).join("、") || "（無）"));
  console.log("");
  console.log("⚠️ 靜態啟發式、誤報率不為零且**刻意偏保守**（誤判 bound 只少省 KB，誤判 safe 是線上白屏）。");
  console.log("   判 bound 的請逐筆讀行號確認；判 safe 的仍建議在有 preview 的輪目視一次。");
  return rows;
}

module.exports = {
  analyze: analyze, candidates: candidates, firstScreenPathFiles: firstScreenPathFiles,
  lazyManifestSrcs: lazyManifestSrcs, verify: verify, run: run
};

if (require.main === module) run(process.argv.slice(2));

#!/usr/bin/env node
/*
 * 台帳共用探針電池（intel/tools/ledger-probe.js）— 平台軌 2026-09-14 20:00 窗 · BACKLOG #193
 * ---------------------------------------------------------------------------
 * 【它治什麼病】分類輪替每輪都會跑一組固定的「共用探針電池」（`HL.nav` 命中數／`isPF`／
 *   `ui.comingSoon(`／斷點 distinct／各登記簿的外部註冊者…），但在本檔存在之前，**讀數是人眼看
 *   grep 輸出、再打進 `platform-modules.json` 的 evidence 字串裡的**，而那段字串**被逐字複製進
 *   該分類全部 10 格** ⇒ 抄錯一次＝錯十份，而且讀任何單一格的人**分不出那一行是為這一格量的、
 *   還是繼承來的**。2026-09-14 08:00 窗實測抓到兩筆自 09-08 寫下**當天就不對**、存活六天的讀數
 *   （`ui.comingSoon(` 記 27／當日實際 28；`HL.gameAxes` 記「出口 13 個齊備」／vm 實跑 12）。
 *
 * 【根因不是粗心，是「形容詞沒有反向」】evidence 寫「齊備」「零漂移」「仍只在某某檔」時，
 *   後面那個數字**沒有任何測項、任何複核在對**，所以它可以錯一整輪而永遠不會被碰到。
 *   ⇒ 本檔把那組讀數從「散文裡的數字」變成「**可求值、可重跑、可對任意 git ref 重算**的量」。
 *
 * 【用法】
 *   node intel/tools/ledger-probe.js                    # 全部探針
 *   node intel/tools/ledger-probe.js --category 後台     # 只跑某分類
 *   node intel/tools/ledger-probe.js --ref 548fef8      # 對某個 git ref 重跑同一把尺
 *   node intel/tools/ledger-probe.js --json             # 給後續工具吃
 *   node intel/tools/ledger-probe.js --selftest         # 跑 (a)–(e) 五條不變量
 *   常駐鎖 `platform/ledger-probe-fail-closed`（prototype/tests/checks-platform.js）require 本檔跑 selftest。
 *
 * 【五條不變量（卡上明列，每條都配了負向擾動）】
 *   (a) **探針回的是值，不是形容詞**：`run()` 必須回 `{ raw, effective }`（可求值的量）。
 *       回 undefined／拋例外 ⇒ **大聲失敗**（該列印 ❌、exit code 1），**不得靜默從報表消失**——
 *       「用少印一行的方式說謊」正是本卡要治的病的升級版。
 *   (b) **兩段式口徑是一等公民**：`isPF`（原始 9／去重 6）與 `ui.comingSoon(`（原始 28／呼叫點 27）
 *       證明「原始命中」與「有效數」本來就是兩個量。每一列都同時印 raw 與 effective。
 *   (c) **可對任意 git ref 重跑**：`--ref <sha>` 走 `git show <ref>:<path>`。沒有這個能力，
 *       「當天就錯」與「後來變了」在台帳上**完全同形**，而兩者該做的事完全相反。
 *   (d) **它不是第二份真相**：本檔**只印讀數，不判 present/partial/weak/absent**，
 *       而且**不讀 `platform-modules.json`**（結構上做不到「自己對自己交差」）。狀態判定留在人那一側。
 *   (e) **每一條探針都必須帶一個活見證者（witness）**：故意改壞它的來源時，該探針的 effective
 *       **必須當場變值且不得改成報錯**。`register()` 對沒有 witness 的探針 **fail-closed 拒收**。
 *       ⇒ 「全部零漂移」不可能只是因為工具根本沒讀到檔。
 *
 * 【立這五條的來歷（CLAUDE.md §4 形狀⑦）】本庫反覆踩「鎖／尺全綠而性質從未成立」：
 *   · (h) **尺的量程漏了一段，而防空心的保險也架在同一段量程裡**（2026-09-14 遊戲軌·#190：
 *     判「該款獨有前綴」只掃 `src/views/`，漏掉 `core/table.js` 畫的六款共用外殼）。
 *     ⇒ 本檔每一條探針都**必須自陳 `scope`（量程）**並印在報表上：一個讀數旁邊沒有寫「這把尺看得到哪些檔」，
 *     它就沒辦法被下一個人質疑。後台分類自己就出過這個事故——「營運儀表板寫入面恆為 2、連十二輪零漂移」
 *     為真，但那把尺只掃 `views/ops-dashboard.js`，而**真正的營運開關在 `core/demo-tools.js`**。
 *   · (i) **反空綠的錨，本身也只認寫法不認概念** ⇒ (e) 的見證者是**真的把來源改掉再跑一次**，
 *     不是「證明本檔有一個叫 witness 的欄位」。
 *
 * 【與 ledger-card-sweep.js 的界線（反重複）】那支問「**evidence 裡的缺口敘述是不是已經被我們自己的卡
 *   關閉了**」（台帳 × BACKLOG 的一致性）；本檔問「**evidence 裡的那個數字是不是真的**」
 *   （台帳 × 原始碼的一致性）。同一種形制、射程不重疊。
 *
 * 【單一把尺】程式碼／註解／字串的切分一律向 `prototype/tests/registry-probe.js` 的 `nonCodeMask`
 *   求值（本庫既有、已被 `platform/registry-sites-code-only` 守著），**不在本檔另寫一份**——
 *   「同一把尺被抄成兩份然後 drift」是本庫踩過最多次的一種。
 */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var cp = require("child_process");

var ROOT = path.join(__dirname, "..", "..");
var nonCodeMask = require(path.join(ROOT, "prototype", "tests", "registry-probe.js")).nonCodeMask;

/* ═══ 來源存取層 ═════════════════════════════════════════════════════════════
 * 探針**只准**經由 ctx 讀檔。這是 (c) `--ref` 能成立的唯一理由：換一個 source 實作，
 * 同一批探針就在另一個 git ref 上重算。誰要是在探針裡直接 `fs.readFileSync`，--ref 就會
 * 靜默量到工作區（讀數看起來完全正常）⇒ selftest 的 (c) 用一個**只存在於 overlay 的差異**去打它。 */

function walk(dir, out) {
  var ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  ents.forEach(function (e) {
    var p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p.split(path.sep).join("/").slice(ROOT.split(path.sep).join("/").length + 1));
  });
  return out;
}

function worktreeSource() {
  var cache = null;
  return {
    ref: "WORKTREE",
    read: function (rel) {
      try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch (e) { return null; }
    },
    list: function () {
      if (!cache) cache = walk(path.join(ROOT, "prototype"), []);
      return cache.slice();
    }
  };
}

function gitSource(ref) {
  var names = cp.execFileSync("git", ["ls-tree", "-r", "--name-only", "-z", ref],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 }).split("\0").filter(Boolean);
  /* ⚠️ 每讀一個檔就 spawn 一次 `git show` 在 Windows 上是**分鐘級**的（22 條探針 × 上百支檔）。
   *   快取是必要的，不是優化：沒有它，`--ref` 會慢到沒有人會去用它，而那等於這條能力不存在。 */
  var cache = {};
  return {
    ref: ref,
    read: function (rel) {
      if (Object.prototype.hasOwnProperty.call(cache, rel)) return cache[rel];
      var v;
      try {
        v = cp.execFileSync("git", ["show", ref + ":" + rel],
          { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] });
      } catch (e) { v = null; }
      cache[rel] = v;
      return v;
    },
    list: function () { return names.slice(); }
  };
}

/* overlay：在既有 source 上疊一層「假的檔案內容」。(e) 見證者與 (c) 的反空綠錨都用它，
 * 它**不碰磁碟** ⇒ 見證者永遠不會把工作區留在擾動態（本庫 2026-09-14 平台軌踩過那一次）。 */
function overlaySource(base, files) {
  return {
    ref: base.ref + "+overlay",
    read: function (rel) {
      return Object.prototype.hasOwnProperty.call(files, rel) ? files[rel] : base.read(rel);
    },
    /* ⚠️ overlay 也必須能**新增/移除檔案**，否則凡是「量檔名」的探針（例：後台專用 view 檔）
     *   就沒有見證者可寫——改內容改不動它，而那正好是它唯一會出錯的方向。 */
    list: function () {
      var l = base.list().filter(function (p) { return files[p] !== null; });
      Object.keys(files).forEach(function (p) {
        if (files[p] !== null && l.indexOf(p) < 0) l.push(p);
      });
      return l;
    }
  };
}

/* ═══ ctx：探針拿得到的全部能力 ════════════════════════════════════════════ */

function makeCtx(source) {
  /* 逐檔快取：同一支檔會被十幾條探針各讀一次，而剝註解是 O(檔長) 的掃描。 */
  var rawCache = {}, codeCache = {};
  var ctx = {
    ref: source.ref,
    read: function (rel) {
      if (!Object.prototype.hasOwnProperty.call(rawCache, rel)) rawCache[rel] = source.read(rel);
      return rawCache[rel];
    },
    /* 剝掉註解／字串／正則字面量後的同長度文字（被剝掉的位置補空白，行號與位移不變）。
     * 「註解與字串是同一類東西——都是不會被求值的字」（CLAUDE.md §4 形狀⑦-(e)）。 */
    code: function (rel) {
      if (!Object.prototype.hasOwnProperty.call(codeCache, rel)) {
        var s = ctx.read(rel);
        codeCache[rel] = s == null ? null : ctx.codeOf(s);
      }
      return codeCache[rel];
    },
    codeOf: function (s) {
      var m = nonCodeMask(s), out = "";
      for (var i = 0; i < s.length; i++) out += m[i] === 0 ? s[i] : (s[i] === "\n" ? "\n" : " ");
      return out;
    },
    /* 列出 repo 內符合條件的檔（永遠回 repo-relative 路徑）。 */
    files: function (prefix, extRe) {
      return source.list().filter(function (p) {
        return p.indexOf(prefix) === 0 && (!extRe || extRe.test(p));
      }).sort();
    },
    count: function (text, re) {
      if (text == null) return 0;
      var r = new RegExp(re.source, re.flags.indexOf("g") >= 0 ? re.flags : re.flags + "g");
      var n = 0;
      while (r.exec(text)) n++;
      return n;
    },
    /* 跨檔「命中行數」：grep -rn 的口徑（一行命中幾次只算一次）。
     * 為什麼要有兩種口徑：evidence 裡的數字有的是 `grep -o | wc -l`（次數）、有的是 `grep -rn`（行數），
     * 而兩者在同一個關鍵詞上可以差一倍（`isPF` 次數 12／行數 9）。口徑不寫下來，
     * 下一輪換個人用另一條 grep 就會把它讀成漂移——本庫 2026-08-23 為 `審核|review_queue` 踩過一次。 */
    lineHits: function (files, re) {
      var raw = 0, code = 0, rawFiles = [], codeFiles = [];
      files.forEach(function (f) {
        var s = ctx.read(f);
        if (s == null) return;
        var a = 0, b = 0;
        var rl = s.split("\n"), cl = (ctx.code(f) || "").split("\n");
        for (var i = 0; i < rl.length; i++) {
          if (re.test(rl[i])) a++;
          if (re.test(cl[i] || "")) b++;
        }
        if (a) { raw += a; rawFiles.push(f + "×" + a); }
        if (b) { code += b; codeFiles.push(f + "×" + b); }
      });
      return { raw: raw, code: code, rawFiles: rawFiles, codeFiles: codeFiles };
    },
    /* 跨檔命中：同時回 raw（含註解/字串）與 code（只認會被求值的字）兩個口徑 —— 不變量 (b)。 */
    hits: function (files, re, opts) {
      var o = opts || {};
      var raw = 0, code = 0, rawFiles = [], codeFiles = [];
      files.forEach(function (f) {
        if (o.exclude && o.exclude.indexOf(f) >= 0) return;
        var s = ctx.read(f);
        if (s == null) return;
        var a = ctx.count(s, re);
        var b = ctx.count(ctx.code(f), re);
        if (a) { raw += a; rawFiles.push(f + "×" + a); }
        if (b) { code += b; codeFiles.push(f + "×" + b); }
      });
      return { raw: raw, code: code, rawFiles: rawFiles, codeFiles: codeFiles };
    },
    /* 在 vm 沙箱裡實跑一支 src 檔，回沙箱本身。
     * 為什麼要有這條路：`HL.gameAxes` 那筆錯讀數就是「數原始碼」數出來的；
     * 出口有幾個要**向物件求值**，不是數 `function` 有幾個。 */
    vm: function (rel, setup) {
      var s = source.read(rel);
      if (s == null) throw new Error("讀不到 " + rel);
      var box = setup ? setup() : {};
      box.console = { log: function () {}, warn: function () {}, error: function () {} };
      box.globalThis = box;
      vm.createContext(box);
      vm.runInContext(s, box, { filename: rel, timeout: 5000 });
      return box;
    }
  };
  return ctx;
}

/* ═══ 探針登記簿 ════════════════════════════════════════════════════════════
 * 容器零內建：本檔下半部登記的每一條都是「內容」，加一條探針＝表上加一列。 */

var PROBES = [];

function register(spec) {
  /* fail-closed（不變量 (a)(e)）：缺任何一個必填欄位就**當場拋**，不得半殘進場。
   * 特別是 witness——少了它，這條探針哪天讀不到檔也會安安靜靜回一個看起來很正常的 0。 */
  ["id", "category", "label", "scope", "run", "witness"].forEach(function (k) {
    if (!spec || spec[k] == null) throw new Error("探針缺 " + k + "：" + JSON.stringify(spec && spec.id));
  });
  if (typeof spec.run !== "function") throw new Error("探針 run 必須是函式：" + spec.id);
  /* scope（量程）必須是**非空**清單：一個讀數旁邊沒有寫「這把尺看得到哪些檔」，
   * 它就沒辦法被下一個人質疑——後台分類「連十二輪零漂移」的那個讀數就是這樣活了十二輪。 */
  if (!Array.isArray(spec.scope) || !spec.scope.length) {
    throw new Error("探針必須自陳非空的 scope（量程）：" + spec.id);
  }
  if (typeof spec.witness.mutate !== "function" || !spec.witness.file) {
    throw new Error("探針 witness 必須是 { file, mutate }：" + spec.id);
  }
  if (PROBES.some(function (p) { return p.id === spec.id; })) throw new Error("探針 id 重複：" + spec.id);
  PROBES.push(spec);
  return spec;
}

function val(v, note) { return { raw: v, effective: v, note: note || "" }; }
function two(raw, eff, note) { return { raw: raw, effective: eff, note: note || "" }; }

/* 跑一條探針，把「拋例外／回 undefined／回不出 effective」一律轉成 **ok:false 的一列**
 * （不變量 (a)：大聲失敗，但**仍然佔一列**——報表列數必須恆等於登記數）。 */
function runOne(p, ctx) {
  var row = { id: p.id, category: p.category, label: p.label, scope: p.scope, ok: true,
              raw: null, effective: null, note: "", error: null };
  try {
    var r = p.run(ctx);
    if (r == null || typeof r !== "object" || !("effective" in r) || r.effective == null) {
      throw new Error("探針未回傳可求值的量（缺 effective）");
    }
    row.raw = r.raw == null ? r.effective : r.raw;
    row.effective = r.effective;
    row.note = r.note || p.note || "";
  } catch (e) {
    row.ok = false;
    row.error = (e && e.message) || String(e);
  }
  return row;
}

function report(opts) {
  var o = opts || {};
  var source = o.source || (o.ref ? gitSource(o.ref) : worktreeSource());
  var ctx = makeCtx(source);
  var list = PROBES.filter(function (p) { return !o.category || p.category === o.category; });
  var rows = list.map(function (p) { return runOne(p, ctx); });
  return {
    ref: source.ref,
    rows: rows,
    total: rows.length,
    failed: rows.filter(function (r) { return !r.ok; }).length
  };
}

/* ═══ (e) 見證者：故意改壞來源，該探針必須當場變值 ═══════════════════════════
 * 回每一條的 { id, before, after, flipped, brokeInstead }。
 * `brokeInstead` 是這條錨自己的反空綠：見證者**不可以靠「把探針弄壞」來過關**
 * （那會讓「值變了」與「探針死了」同形＝本庫最常見的那種同形陷阱）。 */
function witnessCheck(ids) {
  var base = worktreeSource();
  var baseCtx = makeCtx(base);
  return PROBES.filter(function (p) { return !ids || ids.indexOf(p.id) >= 0; }).map(function (p) {
    var before = runOne(p, baseCtx);
    var src = base.read(p.witness.file);
    var files = {};
    /* mutate 連 null 都收得到（檔案不存在時 src === null）＝見證者可以「新增一個檔」。 */
    files[p.witness.file] = p.witness.mutate(src);
    var after = runOne(p, makeCtx(overlaySource(base, files)));
    return {
      id: p.id, file: p.witness.file,
      before: before.ok ? String(before.effective) : "ERR:" + before.error,
      after: after.ok ? String(after.effective) : "ERR:" + after.error,
      baseOk: before.ok, mutOk: after.ok,
      flipped: before.ok && after.ok && String(before.effective) !== String(after.effective),
      brokeInstead: before.ok && !after.ok
    };
  });
}

/* ═══ selftest：(a)–(e) 五條不變量 ═════════════════════════════════════════ */
function selftest() {
  var out = [];
  function ok(cond, id, msg) { out.push({ id: id, pass: !!cond, msg: msg }); }

  // 反空綠錨 ⓪：登記簿不得是空的／退化成一兩條（否則下面每一條都在空集合上恆真）。
  ok(PROBES.length >= 40, "anchor/probe-count",
    "登記的探針只有 " + PROBES.length + " 條（要求 ≥40）⇒ 本 selftest 會在近乎空集合上恆真");
  var cats = {};
  PROBES.forEach(function (p) { cats[p.category] = 1; });
  ok(Object.keys(cats).length >= 8, "anchor/probe-categories",
    "只有 " + Object.keys(cats).length + " 個分類（要求 ≥8＝台帳輪替的全部分類）⇒ " +
    "#194 買到的『八個分類都不再手抄』會靜默退回『只有兩個分類有尺』，而本 selftest 照樣全綠");

  // (a) 值而不是形容詞 + fail-closed：現況全部跑得出可求值的量。
  var rep = report({});
  ok(rep.failed === 0, "a/all-evaluable",
    "有 " + rep.failed + " 條探針回不出可求值的量：" +
    rep.rows.filter(function (r) { return !r.ok; }).map(function (r) { return r.id + "（" + r.error + "）"; }).join("、"));
  ok(rep.total === PROBES.length, "a/one-row-each",
    "報表 " + rep.total + " 列 ≠ 登記 " + PROBES.length + " 條 ⇒ 有探針用「少印一行」的方式消失了");
  // (a) 的反向：壞掉的探針**必須**被算成失敗，而不是被吞掉。用合成探針直接打 runOne。
  var boom = runOne({ id: "x", category: "x", label: "x", scope: [],
    run: function () { throw new Error("BOOM"); } }, makeCtx(worktreeSource()));
  ok(boom.ok === false && /BOOM/.test(boom.error || ""), "a/throw-is-loud",
    "拋例外的探針沒有被記成失敗 ⇒ fail-closed 不成立");
  var mute = runOne({ id: "x", category: "x", label: "x", scope: [],
    run: function () { return undefined; } }, makeCtx(worktreeSource()));
  ok(mute.ok === false, "a/undefined-is-loud", "回 undefined 的探針竟被當成成功");
  // (a) 的第三種壞法：register 對缺欄位的 spec 必須拒收（含缺 witness）。
  var W = { file: "f", mutate: function (s) { return s; } };
  var rejected = 0, bads = [
    { id: "z1", category: "c", label: "l", scope: ["x"], run: function () {} },                    // 缺 witness
    { id: "z2", category: "c", label: "l", scope: ["x"], witness: W },                             // 缺 run
    { id: "z3", category: "c", label: "l", scope: ["x"], run: function () {}, witness: { mutate: W.mutate } }, // witness 缺 file
    { id: "z4", category: "c", label: "l", scope: [], run: function () {}, witness: W },           // scope 空清單
    { id: "z5", category: "c", label: "l", run: function () {}, witness: W },                      // 完全沒有 scope
    { id: PROBES[0].id, category: "c", label: "l", scope: ["x"], run: function () {}, witness: W } // id 重複
  ];
  bads.forEach(function (bad) { try { register(bad); } catch (e) { rejected++; } });
  ok(rejected === bads.length, "a/register-fail-closed",
    "只有 " + rejected + "/" + bads.length + " 個壞 spec 被拒收 ⇒ 登記簿來者不拒" +
    "（沒有 witness／沒有量程／撞 id 的探針進得去）");
  ok(PROBES.every(function (p) { return Array.isArray(p.scope) && p.scope.length; }),
    "a/every-probe-declares-scope", "有探針沒有自陳量程 ⇒ 它的讀數無法被質疑");

  // (b) 兩段式口徑是一等公民：必須真的有探針的 raw ≠ effective，否則這條能力沒有見證者。
  var twoStage = rep.rows.filter(function (r) { return r.ok && String(r.raw) !== String(r.effective); });
  ok(twoStage.length >= 2, "b/two-stage-witnessed",
    "只有 " + twoStage.length + " 條探針的 raw ≠ effective ⇒ 兩段式口徑在真實資料上沒有見證者" +
    "（下一個人又會把「原始命中」當成「有效數」）");
  /* (b2) ⭐ **剝註解那一層必須自己有活見證者**（2026-09-14 負向擾動 P9 當場開出來的洞）：
   *   把 `hits()` 的 code 直接回 raw（＝註解/字串又被算成呼叫點，正是 2026-08-31 把 7 讀成 8 的那個錯）
   *   之後，上面那條 (b) **照樣全綠**——因為 twoStage 的見證者還有別條路（例：檔名型探針的 raw/effective）。
   *   ⇒ 這裡指名兩個**必須走 hits 這條路**的活見證者，讓那一層有自己的紅線。 */
  var byId = {};
  rep.rows.forEach(function (r) { byId[r.id] = r; });
  var CODE_WITNESSES = ["ui/coming-soon-sites", "backend/econ-cfg-registrars"];
  var flat = CODE_WITNESSES.filter(function (id) {
    var r = byId[id];
    return !r || !r.ok || !(Number(r.raw) > Number(r.effective));
  });
  ok(flat.length === 0, "b2/comment-stripping-has-a-live-witness",
    "指名的活見證者 " + flat.join("／") + " 的 raw 不再大於 effective ⇒ 「剝註解/字串」那一層可能整個失效了" +
    "（這兩條的差額正好各是一筆註解：ui.comingSoon( 的 responsible.js、econCfg 的 i18n/en.js）。" +
    "若哪天那兩筆註解真的被刪掉，請換一個同樣『raw>effective』的見證者，**不要放寬這條**");
  // (b3) 剝註解的判定子本身：用合成輸入直接打它（live 資料若哪天沒有註解，上面那條就沒東西可證）。
  var synth = makeCtx(worktreeSource()).codeOf("var a = 1; // HL.zzz.register(\nHL.zzz.register();\n");
  ok(synth.indexOf("//") < 0 && synth.indexOf("HL.zzz.register();") >= 0,
    "b3/code-strips-comments-pure",
    "codeOf 對合成輸入的行為不對（註解沒剝掉或把程式碼也剝了）：" + JSON.stringify(synth));

  // (c) --ref：同一批探針必須真的走 ctx 讀檔，而不是自己 fs.readFileSync。
  //    作法＝拿一個**只存在於 overlay** 的差異去打它；讀得到 ⇒ 它真的經過來源層。
  var creg = /ctx\.read\s*\(|ctx\.code\s*\(|ctx\.files\s*\(|ctx\.hits\s*\(|ctx\.vm\s*\(/;
  var selfSrc = fs.readFileSync(__filename, "utf8");
  ok(!/fs\.readFileSync\s*\([^)]*ROOT/.test(selfSrc.slice(selfSrc.indexOf("═══ 探針登記簿"))),
    "c/probes-go-through-ctx",
    "探針區有人直接用 fs 讀檔 ⇒ --ref 會靜默量到工作區（讀數看起來完全正常）");
  ok(creg.test(selfSrc), "c/ctx-is-used", "沒有任何探針經由 ctx 讀檔 ⇒ 來源層形同虛設");

  // (d) 不是第二份真相：本檔不得讀台帳、不得印出狀態判定。
  ok(selfSrc.indexOf("platform-modules") < 0 || /反重複|界線|不讀/.test(selfSrc),
    "d/not-a-second-truth", "本檔讀了 platform-modules.json ⇒ 變成第二份真相");
  var statusWords = ["present", "partial", "weak", "absent"];
  var leaked = rep.rows.filter(function (r) {
    return r.ok && statusWords.some(function (w) { return String(r.effective).toLowerCase() === w; });
  });
  ok(leaked.length === 0, "d/no-status-verdict",
    "有探針直接回了狀態判定（" + leaked.map(function (r) { return r.id; }).join("、") + "）⇒ 判斷應留在人那一側");

  // (e) 每一條探針都要有活見證者，而且見證者不可以靠「把探針弄壞」過關。
  var w = witnessCheck();
  var dead = w.filter(function (x) { return !x.flipped; });
  ok(dead.length === 0, "e/every-probe-has-a-living-witness",
    "有 " + dead.length + " 條探針改壞來源後讀數沒變：" +
    dead.map(function (x) { return x.id + "（" + x.before + "→" + x.after + (x.brokeInstead ? "·改成報錯" : "") + "）"; }).join("、") +
    "。⇒ 它可能根本沒讀到那個檔，而「全部零漂移」會是假的");
  var broke = w.filter(function (x) { return x.brokeInstead; });
  ok(broke.length === 0, "e/witness-must-not-break-the-probe",
    "有 " + broke.length + " 條見證者是把探針弄壞而不是改值：" + broke.map(function (x) { return x.id; }).join("、"));

  return { results: out, failed: out.filter(function (r) { return !r.pass; }).length };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 探針（內容）。每一條都必須自陳 `scope`＝**這把尺看得到哪些檔**。
 * 為什麼 scope 是必填而不是註解：後台分類自己出過事故——「營運儀表板寫入面恆為 2、
 * 連十二輪零漂移」為真，但那把尺只掃 `views/ops-dashboard.js`，而真正的營運開關在
 * `core/demo-tools.js`（8 個寫入面、真站可達 5 個、3 個連 confirm 都沒有）。
 * 一個讀數旁邊沒有寫「量程到哪」，它就沒辦法被下一個人質疑。
 * ═════════════════════════════════════════════════════════════════════════ */

var SRC = "prototype/src/";
var JS = /\.js$/;
var CSS = /\.css$/;
function srcJs(ctx) { return ctx.files(SRC, JS); }

function appendCode(line) { return function (src) { return src + "\n" + line + "\n"; }; }

/* ── 後台（2026-09-14 20:00 窗輪替審的分類；讀數沿用 09-11 起的既有口徑）──────── */

register({
  id: "backend/ops-dashboard-write-surfaces",
  category: "後台", label: "營運儀表板的寫入面（onClick|onInput|onChange）",
  scope: ["prototype/src/views/ops-dashboard.js"],
  note: "⚠️ 量程只到這一支檔。真正能改變世界的營運開關在 core/demo-tools.js（見下一條）——" +
        "「連十二輪零漂移」為真，但它證明的是隔壁那支檔沒動。",
  witness: { file: "prototype/src/views/ops-dashboard.js", mutate: appendCode("var __w = { onClick: 1 };") },
  run: function (ctx) {
    var f = "prototype/src/views/ops-dashboard.js";
    var re = /onClick|onInput|onChange/;
    return two(ctx.count(ctx.read(f), re), ctx.count(ctx.code(f), re),
      "raw＝含註解/字串；effective＝只認會被求值的字");
  }
});

register({
  id: "backend/ops-switch-write-surfaces",
  category: "後台", label: "⚙ 營運工具面板的寫入面（core/demo-tools.js）",
  scope: ["prototype/src/core/demo-tools.js"],
  witness: { file: "prototype/src/core/demo-tools.js", mutate: appendCode("var __w = { onClick: 1 };") },
  run: function (ctx) {
    var f = "prototype/src/core/demo-tools.js";
    var re = /onClick|onInput|onChange/;
    return two(ctx.count(ctx.read(f), re), ctx.count(ctx.code(f), re),
      "這才是「營運者按下去會改變世界」的那批開關所在");
  }
});

register({
  id: "backend/ops-audit-hooked-writes",
  category: "後台", label: "留痕的營運寫入面（demo-tools 內 aud( 呼叫點）",
  scope: ["prototype/src/core/demo-tools.js"],
  witness: { file: "prototype/src/core/demo-tools.js", mutate: function (s) { return s.replace(/aud\(/, "noAud("); } },
  run: function (ctx) {
    var f = "prototype/src/core/demo-tools.js";
    var raw = ctx.count(ctx.read(f), /aud\(/);
    var code = ctx.count(ctx.code(f), /aud\(/);
    return two(raw, code, "#182 的接線點；含函式定義本身一筆 ⇒ 實際寫入面 = effective − 1");
  }
});

register({
  id: "backend/ops-audit-kind-registry",
  category: "後台", label: "營運軌跡的動作型別登記簿（BASELINE 筆數，vm 求值）",
  scope: ["prototype/src/core/ops-audit.js"],
  witness: {
    file: "prototype/src/core/ops-audit.js",
    /* 見證者要打的是 effective（去重後的 id 數）⇒ 造一個**重複 id**：容器若哪天讓第二筆同 id 進場，
     * effective 就會不等於 raw，這條探針當場說得出來。 */
    mutate: function (s) { return s.replace('["demo.result"', '["site.mode"'); }
  },
  run: function (ctx) {
    /* 向物件求值，不數原始碼——`HL.gameAxes` 那筆錯讀數正是「數原始碼」數出來的。 */
    var box = ctx.vm("prototype/src/core/ops-audit.js", function () {
      var m = { exports: {} };
      return { module: m, exports: m.exports };
    });
    var core = box.module.exports;
    var ids = core.BASELINE.map(function (k) { return k.id; });
    return two(ids.length, ids.filter(function (v, i) { return ids.indexOf(v) === i; }).length,
      "raw＝表上列數／effective＝去重後的 id 數（重複 id 進得去就是 fail-open）：" + ids.join(","));
  }
});

register({
  id: "backend/cms-hardcoded-arrays",
  category: "後台", label: "CMS 內容仍硬寫在程式裡（mock-data.js 的模組級 var）",
  scope: ["prototype/src/data/mock-data.js"],
  witness: { file: "prototype/src/data/mock-data.js", mutate: appendCode("  var __w = [];") },
  run: function (ctx) {
    var s = ctx.read("prototype/src/data/mock-data.js");
    return val(ctx.count(s, /^ {2}var /m), "口徑＝行首恰兩格縮排的 var（模組級陣列）");
  }
});

register({
  id: "backend/gamelist-manifest-entries",
  category: "後台", label: "GameList 延遲載入清單（lazy-games MANIFEST 列數／帶自己樣式者）",
  scope: ["prototype/src/data/lazy-games.js"],
  witness: { file: "prototype/src/data/lazy-games.js", mutate: function (s) { return s.replace(/css:\s*"/, "cssX: \""); } },
  run: function (ctx) {
    /* 在 code-only 文字上數（字串字面量已被遮成空白，故不帶引號比對）。 */
    var code = ctx.code("prototype/src/data/lazy-games.js");
    var rows = ctx.count(code, /\{\s*src:\s*/);
    if (!rows) throw new Error("MANIFEST 列數為 0 ⇒ 清單形狀變了，這條探針會靜默回 0");
    return two(rows, ctx.count(code, /\bcss:\s*/),
      "raw＝清單列數（每列一支遊戲程式）／effective＝其中帶 css: 的列數（#189/#190 的樣式隨遊戲走）");
  }
});

register({
  id: "backend/community-registry-entries",
  category: "後台", label: "同仁放置區入口數（games/registry.json）",
  scope: ["prototype/games/registry.json"],
  witness: {
    file: "prototype/games/registry.json",
    /* 見證者不可以用「把 JSON 弄壞」過關——那會讓「值變了」與「探針死了」同形。
     * 所以走 parse → push → stringify，產出的仍是合法 JSON。 */
    mutate: function (s) {
      var j = JSON.parse(s);
      var arr = Array.isArray(j) ? j : (j.games || j.entries);
      arr.push("__witness__/game.js");
      return JSON.stringify(j, null, 2);
    }
  },
  run: function (ctx) {
    var s = ctx.read("prototype/games/registry.json");
    var j = JSON.parse(s);
    var arr = Array.isArray(j) ? j : (j.games || j.entries || []);
    return val(arr.length,
      "純路徑字串、零 metadata（下架/分類仍要改檔）。⚠️ 工作區與 HEAD 可能不同（本檔長期有他人 WIP）" +
      "⇒ 台帳一律以 `--ref HEAD` 的讀數為準");
  }
});

register({
  id: "backend/admin-view-files",
  category: "後台", label: "後台專用 view 檔（admin|cms|backoffice）",
  scope: ["prototype/src/views/"],
  /* ⚠️ 這條量的是**檔名**，改內容改不動它 ⇒ 見證者是「新增一個檔」（overlay 的 list() 支援）。 */
  witness: { file: "prototype/src/views/admin-console.js", mutate: function () { return "/* witness */\n"; } },
  run: function (ctx) {
    var names = ctx.files(SRC + "views/", JS);
    var re = /(admin|cms|backoffice)/i;
    var hit = names.filter(function (p) { return re.test(p.split("/").pop()); });
    return two(names.length, hit.length, "raw＝views 檔總數（量程證明：尺沒瞎）／effective＝命中數");
  }
});

register({
  id: "backend/promo-cal-registrars",
  category: "後台", label: "活動行事曆的外部註冊者（HL.promoCal.register）",
  scope: [SRC + "**/*.js（排除 owner core/promo-cal.js）"],
  witness: { file: "prototype/src/core/activity.js", mutate: function (s) { return s.replace(/HL\.promoCal\.register\s*\(/, "HL.promoCalX.register("); } },
  run: function (ctx) {
    var owner = SRC + "core/promo-cal.js";
    var h = ctx.hits(srcJs(ctx), /HL\.promoCal\.register\s*\(/, { exclude: [owner] });
    return two(h.raw, h.code,
      "raw 含註解/字串（2026-08-31 就是它把 7 讀成 8）／effective＝程式碼呼叫點：" + h.codeFiles.join(", "));
  }
});

register({
  id: "backend/econ-cfg-registrars",
  category: "後台", label: "經濟旋鈕自我描述層的外部註冊者（HL.econCfg.register）",
  scope: [SRC + "**/*.js（排除 owner core/econ-config.js）"],
  witness: { file: "prototype/src/core/faucet.js", mutate: function (s) { return s.replace(/HL\.econCfg\.register\s*\(/, "HL.econCfgX.register("); } },
  run: function (ctx) {
    var owner = SRC + "core/econ-config.js";
    var h = ctx.hits(srcJs(ctx), /HL\.econCfg\.register\s*\(/, { exclude: [owner] });
    return two(h.raw, h.code, "2026-08-31 釘正過一次：raw 含 i18n/en.js 的一句用法說明");
  }
});

register({
  id: "backend/jurisdiction-external-readers",
  category: "後台", label: "法域旋鈕的外部讀者（jurisdiction，排除定義處）",
  scope: [SRC + "**/*.js（排除 core/money.js、core/app-state.js）"],
  /* 見證者要落在**量程之內**：money.js 是被排除的定義處，改它動不了 effective。 */
  witness: { file: "prototype/src/core/demo-tools.js", mutate: appendCode("HL.x = HL.jurisdiction;") },
  run: function (ctx) {
    var excl = [SRC + "core/money.js", SRC + "core/app-state.js"];
    var h = ctx.hits(srcJs(ctx), /jurisdiction/, { exclude: excl });
    var all = ctx.hits(srcJs(ctx), /jurisdiction/, {});
    return two(all.code, h.code,
      "raw＝含定義處（證明尺沒瞎）／effective＝外部讀者。0＝『旋鈕在、線沒接』，牌照前的正確狀態");
  }
});

register({
  id: "backend/ops-automation-tokens",
  category: "後台", label: "營運自動化規則的任何痕跡（opsAuto|rules|playerTag|assignTag|tags）",
  scope: [SRC + "**/*.js"],
  witness: { file: "prototype/src/core/demo-tools.js", mutate: appendCode("HL.opsAuto = {};") },
  run: function (ctx) {
    var re = /HL\.opsAuto|HL\.rules|playerTag|assignTag|HL\.tags/;
    var h = ctx.hits(srcJs(ctx), re, {});
    return two(h.raw, h.code, "0＝容器不存在；解封條件是 #173（第一個真的 action 來源）");
  }
});

register({
  id: "backend/player-request-channel",
  category: "後台", label: "玩家請求通道的任何痕跡（requests|tickets|contact|mailto:）",
  scope: [SRC + "**/*.js"],
  witness: { file: "prototype/src/layout/ai-concierge.js", mutate: appendCode("HL.tickets = {};") },
  run: function (ctx) {
    var files = srcJs(ctx);
    var a = ctx.hits(files, /HL\.requests|HL\.tickets|HL\.contact/, {});
    var b = ctx.hits(files, /mailto:/, {});
    return two(a.raw + b.raw, a.code + b.code, "玩家端出口／請求狀態／營運端收件匣三樣全缺＝#173");
  }
});

/* ── 前端UI/UX（把 09-08 起被逐字抄進十格的那組讀數搬成可求值的量）────────────── */

register({
  id: "ui/hl-nav-sites",
  category: "前端UI/UX", label: "導覽入口註冊表 HL.nav（#93）",
  scope: [SRC + "**/*.js"],
  witness: { file: "prototype/src/main.js", mutate: appendCode("HL.nav = {};") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /HL\.nav\b/, {});
    return two(h.raw, h.code, "0＝#93 仍未落地（導覽入口仍是各檔各自硬寫）");
  }
});

register({
  id: "ui/provably-fair-entries",
  category: "前端UI/UX", label: "遊戲框的可驗證公平入口（isPF 白名單）",
  scope: [SRC + "**/*.js"],
  /* ⚠️ 改成 `isPFX` **仍然含有 `isPF`** ⇒ 那種見證者是空的（本輪負向擾動當場抓到）。 */
  witness: { file: "prototype/src/views/game-frame.js", mutate: function (s) { return s.split("isPF").join("isXX"); } },
  note: "⚠️ 本探針釘正一個口徑：09-08 起 evidence 記「原始命中 9（去重後 6 種圖示）」——" +
        "9 與 6 其實是 **grep -rn 的命中行數**（原始 9／剝掉註解後 6），不是「6 種圖示」" +
        "（實際圖示出口只有 2 個：遊戲框的 🔒 與子母畫面的 ✓）。數字對、名字錯，" +
        "而名字錯的那一半沒有任何東西在對它。",
  run: function (ctx) {
    var files = srcJs(ctx);
    var h = ctx.lineHits(files, /isPF/);
    return two(h.raw, h.code, "命中行：" + h.codeFiles.join(", ") + "（口徑＝行數，不是次數）");
  }
});

register({
  id: "ui/coming-soon-sites",
  category: "前端UI/UX", label: "死巷入口 ui.comingSoon(（原始命中／實際呼叫點）",
  scope: [SRC + "**/*.js"],
  note: "2026-09-14 08:00 窗釘正過：09-08 記 27、當日實際 28（漏記 core/responsible.js 的一筆註解）。" +
        "raw 與 effective 本來就是兩個量，分開印才不會被讀成「又多了一個死巷入口」。",
  witness: { file: "prototype/src/layout/app-shell.js", mutate: function (s) { return s.replace(/ui\.comingSoon\(/, "ui.comingSoonX("); } },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /ui\.comingSoon\(/, {});
    return two(h.raw, h.code, "raw＝含註解；effective＝真的會被求值的呼叫點");
  }
});

register({
  id: "ui/settings-modal-owner",
  category: "前端UI/UX", label: "settingsModal( 的持有檔數（站層設定出口是否只有一個）",
  scope: [SRC + "**/*.js"],
  witness: { file: "prototype/src/views/game-frame.js", mutate: function (s) { return s.split("settingsModal(").join("settingsModalX("); } },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /settingsModal\(/, {});
    return two(h.code, h.codeFiles.length, "raw＝呼叫點數／effective＝持有檔數：" + h.codeFiles.join(", "));
  }
});

register({
  id: "ui/theme-switch-consumers",
  category: "前端UI/UX", label: "主題切換的消費端（出貨 JS 的 data-theme／CSS 的 [data-theme｜prefers-color-scheme）",
  scope: [SRC + "**/*.js", SRC + "styles/*.css"],
  /* 見證者打的是 effective（CSS 側消費端）——這一格的缺口本來就在 CSS 那一半。 */
  witness: {
    file: "prototype/src/styles/components.css",
    mutate: function (s) { return s + "\n[data-theme=\"dark\"] .ax-w { color: red; }\n"; }
  },
  run: function (ctx) {
    /* JS 側用 raw：`data-theme` 天生是**字串字面量**（`setAttribute("data-theme", …)`），
     * 用 code-only 去數它必然得 0——那會是一個看起來完全正常的假讀數。 */
    var js = ctx.lineHits(srcJs(ctx), /data-theme/);
    var css = ctx.lineHits(ctx.files(SRC + "styles/", CSS), /\[data-theme|prefers-color-scheme/);
    return two(js.raw, css.raw,
      "raw＝出貨 JS 的 data-theme 命中行（" + js.rawFiles.join(", ") + "）／effective＝CSS 側消費端。" +
      "effective 0 ＝旗標寫得出去、沒有人在看");
  }
});

register({
  id: "ui/breakpoint-ladder",
  category: "前端UI/UX", label: "CSS @media 斷點 distinct（canonical 5 階＋刻意例外）",
  scope: [SRC + "styles/*.css"],
  witness: {
    file: "prototype/src/styles/components.css",
    mutate: function (s) { return s + "\n@media (max-width: 999px) { .ax-x { color: red; } }\n"; }
  },
  run: function (ctx) {
    var seen = {}, total = 0;
    ctx.files(SRC + "styles/", CSS).forEach(function (f) {
      var s = ctx.read(f) || "";
      var re = /@media[^{]*?\((?:min|max)-width:\s*(\d+)px\)/g, m;
      while ((m = re.exec(s))) { seen[m[1]] = (seen[m[1]] || 0) + 1; total++; }
    });
    var ks = Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
    return two(total, ks.length, "raw＝@media 宣告總數／effective＝distinct 斷點：" + ks.join("/"));
  }
});

register({
  id: "ui/game-axes-exports",
  category: "前端UI/UX", label: "大廳分群軸 HL.gameAxes 的出口數（vm 求值，非數原始碼）",
  scope: [SRC + "core/game-axes.js"],
  note: "2026-09-14 08:00 窗釘正：09-08 記「出口 13 個齊備」，vm 實跑 Object.keys 實測 12。" +
        "「齊備」是個沒有反向的形容詞——它後面那個數字在此之前沒有任何東西在對。",
  witness: {
    file: "prototype/src/core/game-axes.js",
    mutate: function (s) { return s.replace(/HL\.gameAxes\s*=\s*\{/, "HL.gameAxes = { __w: 1,"); }
  },
  run: function (ctx) {
    var box = ctx.vm(SRC + "core/game-axes.js", function () {
      var w = { HL: { support: { register: function () {} } } };
      w.window = w;
      return w;
    });
    var ax = box.HL.gameAxes;
    if (!ax) throw new Error("HL.gameAxes 未掛上 ⇒ 載入序或全域名變了");
    var keys = Object.keys(ax);
    return two(keys.length, keys.length, keys.sort().join(","));
  }
});

register({
  id: "ui/i18n-dictionary-size",
  category: "前端UI/UX", label: "語言包條目數（en／zh-Hans）",
  scope: [SRC + "i18n/en.js", SRC + "i18n/zh-Hans.js"],
  note: "舊探針問的是「src/i18n/ 有幾支檔」——那個數字自 #100 拆檔後不會再變，" +
        "而這一格真正的表面六天內改了 12 次 ⇒ 零漂移量的是隔壁那支檔。",
  witness: { file: "prototype/src/i18n/zh-Hans.js", mutate: function (s) { return s.replace(/var DICT = \{/, "var DICT = { \"__w\": \"w\","); } },
  run: function (ctx) {
    /* 求值而不是數原始碼：`last-wins` 的重複鍵在原始碼上看得見兩行、在字典裡只有一條
     * （2026-07-31 維護軌 U31 就是在處理那批「靜默覆蓋」的重複鍵）⇒ 數行數會高報。 */
    function packOf(rel) {
      var got = null;
      ctx.vm(rel, function () {
        var w = { HL: { i18n: { register: function (lang, pack) { got = pack; } } } };
        w.window = w;
        return w;
      });
      if (!got || !got.dict) throw new Error(rel + " 沒有註冊出語言包 ⇒ 形制變了");
      return Object.keys(got.dict).length;
    }
    return two(packOf(SRC + "i18n/en.js"), packOf(SRC + "i18n/zh-Hans.js"),
      "求值後的字典條目（raw=en、effective=zh-Hans）；重複鍵在此只算一條");
  }
});

register({
  id: "ui/route-registrars",
  category: "前端UI/UX", label: "網址作為地址：HL.route 的註冊點與 pushState 消費端（#181）",
  scope: [SRC + "**/*.js"],
  /* 見證者打 effective（history API 消費端）＝#181 真正買到的那一半。 */
  /* ⚠️ 第二次踩同一個坑：改成 `pushStateX` **仍然含有 `pushState`**。見證者的改名必須是「不再含有原字串」。 */
  witness: { file: "prototype/src/core/route.js", mutate: function (s) { return s.split("pushState").join("puZZ").split("replaceState").join("reZZ"); } },
  run: function (ctx) {
    var files = srcJs(ctx);
    var reg = ctx.hits(files, /HL\.route\.register\s*\(/, {});
    var hist = ctx.hits(files, /pushState|replaceState|popstate/, {});
    return two(reg.code, hist.code,
      "raw＝register 呼叫點／effective＝history API 消費端（#181 之前兩者皆 0）：" + reg.codeFiles.join(", "));
  }
});

/* ── 金流（#194 第一批：把〈金流〉七格 evidence 裡的手抄讀數搬成可求值的量）──────
 * 開卡當下就量到一筆已經過期的：〈交易狀態面〉09-14 寫「`HL.sla.valueOf(` 從 1 個呼叫點變成 2 個」，
 * 而本輪實測是 **3**（#174 收尾又多接了一處）⇒ 手抄的數字連一天都撐不住。 */

register({
  id: "cashflow/ledger-record-sites",
  category: "金流", label: "營運帳本的插樁點（HL.ledger.record 命中行數）",
  scope: [SRC + "**/*.js"],
  note: "口徑＝grep -rn（命中行數，一行多次只算一次）。raw 含 core/reports.js 的 `src:` 字串述詞 ⇒ " +
        "台帳長期記的「raw 10 行／真插樁點 9 行」正是這兩個數。",
  witness: { file: "prototype/src/core/ledger.js", mutate: appendCode("HL.ledger.record(\"w\", 1, {});") },
  run: function (ctx) {
    var h = ctx.lineHits(srcJs(ctx), /HL\.ledger\.record\s*\(/);
    return two(h.raw, h.code, "effective＝只認會被求值的字：" + h.codeFiles.join(", "));
  }
});

register({
  id: "cashflow/withdraw-review-vocab",
  category: "金流", label: "提款審核佇列的詞彙（審核|review_queue|pending_withdraw）",
  scope: [SRC + "**/*.js"],
  note: "這一格是 CONTROL.avoid 的「維持 absent」。raw 一路從 4 漲到 8，但**每一筆都在描述本功能不存在**" +
        "（註解 + UI 文案 + 兩支語言包）⇒ effective 才是台帳該引用的數。raw 漲而 effective 不動＝正確的 absent。",
  witness: { file: "prototype/src/core/service-level.js", mutate: appendCode("var review_queue = 1;") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /審核|review_queue|pending_withdraw/, {});
    return two(h.raw, h.code, "effective 0＝沒有任何會被求值的審核狀態機");
  }
});

register({
  id: "cashflow/sla-valueof-consumers",
  category: "金流", label: "服務時效承諾的消費者（HL.sla.valueOf 呼叫點）",
  scope: [SRC + "**/*.js"],
  note: "⚠️ 本探針出生當天就打臉一筆手抄讀數：〈交易狀態面〉2026-09-14 記「從 1 個變成 2 個」，" +
        "2026-09-15 實測 3（app-shell.js 的 etaSuffix／pushDemoTxn／提款送出各一）。",
  witness: {
    file: "prototype/src/layout/app-shell.js",
    mutate: function (s) { return s.split("HL.sla.valueOf(").join("HL.sla.vZZ("); }
  },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /HL\.sla\.valueOf\s*\(/, {});
    return two(h.raw, h.code, "0＝#63 的承諾表沒有任何消費者（那是它 08-2x 的狀態）：" + h.codeFiles.join(", "));
  }
});

register({
  id: "cashflow/txn-kind-states",
  category: "金流", label: "交易型別數 × 其中帶生命週期維度者（TXN_KINDS）",
  scope: ["prototype/src/layout/app-shell.js"],
  note: "raw＝型別數（deposit/withdraw/p2p_out）／effective＝其中宣告了 states 的型別數。" +
        "effective 0＝#174 落地的是「提款這一條路」，交易的**狀態維度**這個容器仍未長出來。",
  witness: {
    file: "prototype/src/layout/app-shell.js",
    mutate: function (s) { return s.replace(/deposit:\s*\{/, "deposit:  { states: [\"sent\"],"); }
  },
  run: function (ctx) {
    var code = ctx.code("prototype/src/layout/app-shell.js");
    var i = code.indexOf("var TXN_KINDS = {");
    if (i < 0) throw new Error("找不到 TXN_KINDS ⇒ 形狀變了，這條探針會靜默回 0");
    var j = code.indexOf("\n  };", i);
    if (j < 0) throw new Error("TXN_KINDS 區塊沒有收尾 ⇒ 量程判定失效");
    var blk = code.slice(i, j);
    var kinds = ctx.count(blk, /^\s{4}\w+:\s*\{/m);
    if (!kinds) throw new Error("TXN_KINDS 型別數為 0 ⇒ 縮排口徑變了");
    return two(kinds, ctx.count(blk, /\bstates\s*:/), "量程只到這一個字面量區塊");
  }
});

register({
  id: "cashflow/currency-two-truths",
  category: "金流", label: "幣別的兩份真相：money-mode 契約的消費者 × mock 清單的消費者",
  scope: [SRC + "**/*.js（raw 排除 owner core/money.js）"],
  note: "raw＝`money.js currencies()`（各模式允許的幣別）的外部消費者／effective＝`HL.mock.currencies`" +
        "（錢包實際列出來的那份）的消費者。raw 0 而 effective >0＝**宣告的那份沒人讀、被讀的那份不問模式**＝#183。",
  witness: {
    file: "prototype/src/layout/app-shell.js",
    mutate: function (s) { return s.split("HL.mock.currencies").join("HL.mock.cZZ"); }
  },
  run: function (ctx) {
    var files = srcJs(ctx);
    var owner = SRC + "core/money.js";
    var a = ctx.hits(files, /\.currencies\s*\(/, { exclude: [owner] });
    var b = ctx.hits(files, /HL\.mock\.currencies/, {});
    return two(a.code, b.code, "被讀的那份在：" + b.codeFiles.join(", "));
  }
});

register({
  id: "cashflow/vault-tokens",
  category: "金流", label: "資金分倉／保險庫的任何痕跡（vault|保險庫|分倉|金庫）",
  scope: [SRC + "**/*.js"],
  note: "0＝容器不存在（#132）。這一格連續多輪「零命中逐位未動」——現在那句話有尺可以重跑了。",
  witness: { file: "prototype/src/core/money.js", mutate: appendCode("var vault = {};") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /vault|Vault|保險庫|分倉|金庫/, {});
    return two(h.raw, h.code, "raw 含註解/字串＝證明尺沒瞎；兩者同為 0 才是真的 absent");
  }
});

register({
  id: "cashflow/cashier-channels",
  category: "金流", label: "收銀台通道註冊表（首批註冊的通道數 × 消費端數）",
  scope: ["prototype/src/layout/app-shell.js", SRC + "**/*.js"],
  note: "#82 的容器是零內建的 ⇒ 通道字面一個都不在 core/cashier.js 裡，首批註冊在 app-shell.js。" +
        "effective＝`HL.cashier.` 的消費點（register 一處 + 儲值側 + 提款側兩處）；" +
        "「儲值側與提款側讀同一張表」這條性質另有常駐鎖 (B4) 逐函式體釘住。",
  witness: { file: "prototype/src/core/money.js", mutate: appendCode("HL.cashier.all({});") },
  run: function (ctx) {
    var code = ctx.code("prototype/src/layout/app-shell.js");
    if (code == null) throw new Error("讀不到 app-shell.js");
    var i = code.indexOf("HL.cashier.register(");
    if (i < 0) throw new Error("找不到收銀台首批註冊 ⇒ #82 的形制變了");
    var h = ctx.hits(srcJs(ctx), /HL\.cashier\./, {});
    var owner = ctx.read(SRC + "core/cashier.js");
    if (owner == null) throw new Error("core/cashier.js 不存在 ⇒ 容器沒了");
    return two(ctx.count(code.slice(0, i), /\{\s*id:\s*/), h.code,
      "raw＝註冊迴圈前的通道字面量數（量程只到首批註冊那個陣列）／effective＝全庫消費點");
  }
});

register({
  id: "cashflow/p2p-trade-gate",
  category: "金流", label: "玩家間交易的 money-mode 閘（canTrade 命中）",
  scope: [SRC + "**/*.js"],
  note: "台帳這一格 `partial` 的單一理由自 2026-08-05 收斂後未變＝**單向且無對手方**。" +
        "effective 1＝只有 core/money.js 的定義端，沒有任何第二個消費者在問「現在能不能交易」。",
  witness: { file: "prototype/src/layout/app-shell.js", mutate: appendCode("if (HL.money.canTrade()) { }") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /canTrade\s*\(/, {});
    if (!h.code) throw new Error("canTrade 零命中 ⇒ money-mode 閘不見了");
    return two(h.raw, h.code, "命中處：" + h.codeFiles.join(", "));
  }
});

register({
  id: "cashflow/bonus-wager-mult-overrides",
  category: "金流", label: "逐筆紅利的流水倍數覆寫（wagerMult）",
  scope: [SRC + "**/*.js"],
  note: "台帳連七輪記「`wagerMult` 全 src 仍 1 命中且仍是 core/econ-config.js:5 的**註解**」——" +
        "raw 1／effective 0 正是那句話的兩個數，而過去它只以散文存在。" +
        "effective 一旦 >0，代表逐筆紅利 spec 真的長出覆寫維度了（#191 的落地訊號）。",
  witness: { file: "prototype/src/core/bonus-ttl.js", mutate: appendCode("var wagerMult = 1;") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /wagerMult/, {});
    return two(h.raw, h.code, "raw 的唯一命中：" + (h.rawFiles.join(", ") || "（無）"));
  }
});

/* ── 功能 ──────────────────────────────────────────────────────────────────── */

register({
  id: "feature/achievement-registrars",
  category: "功能", label: "成就牆的外部註冊者（HL.achievements.register）",
  scope: [SRC + "**/*.js（排除 owner core/achievements.js）"],
  note: "raw 含 challenges.js 檔頭那句**自我描述的量測說明**（它自己寫著『非註解命中數＝N』）⇒ " +
        "拿 raw 當讀數會把「描述這個量的那句話」也算進這個量裡。",
  witness: { file: "prototype/src/core/activity.js", mutate: function (s) { return s.replace(/HL\.achievements\.register\s*\(/, "HL.achievementsX.register("); } },
  run: function (ctx) {
    var owner = SRC + "core/achievements.js";
    var h = ctx.hits(srcJs(ctx), /HL\.achievements\.register\s*\(/, { exclude: [owner] });
    return two(h.raw, h.code, "effective＝真正會把徽章掛上牆的呼叫點：" + h.codeFiles.join(", "));
  }
});

register({
  id: "feature/support-entries",
  category: "功能", label: "支援/透明度中心的條目註冊點（HL.support.register）",
  scope: [SRC + "**/*.js（排除 owner core/support.js）"],
  witness: { file: "prototype/src/core/responsible.js", mutate: function (s) { return s.replace(/HL\.support\.register\s*\(/, "HL.supportX.register("); } },
  run: function (ctx) {
    var owner = SRC + "core/support.js";
    var h = ctx.hits(srcJs(ctx), /HL\.support\.register\s*\(/, { exclude: [owner] });
    if (!h.raw) throw new Error("支援中心零註冊者 ⇒ #72/#95 的容器形狀變了");
    return two(h.raw, h.code, "全庫註冊者最多的登記簿之一：" + h.codeFiles.length + " 支檔");
  }
});

register({
  id: "feature/collection-sets",
  category: "功能", label: "收集套組與圖鑑的任何痕跡（HL.collection|圖鑑|收集套組）",
  scope: [SRC + "**/*.js"],
  note: "0＝#134 的容器不存在（`achievements` 的判定只有純量門檻，「集滿 N 件才成套」無處可表達）。",
  witness: { file: "prototype/src/core/achievements.js", mutate: appendCode("HL.collection = {};") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /HL\.collection\b|圖鑑|收集套組/, {});
    return two(h.raw, h.code, "raw 也是 0 ⇒ 連在註解裡被提過都沒有");
  }
});

/* ── 活動 ──────────────────────────────────────────────────────────────────── */

register({
  id: "event/ingame-promo-surface",
  category: "活動", label: "遊戲內活動掛件的任何痕跡（inGamePromo|gamePromoWidget|活動掛件）",
  scope: [SRC + "**/*.js"],
  note: "0＝#136。台帳說「`HL.promoCal` 的 7 個註冊者沒有任何一個能出現在玩家真正花時間的那個畫面上」，" +
        "這條就是那句話的尺。",
  witness: { file: "prototype/src/views/game-frame.js", mutate: appendCode("HL.inGamePromo = {};") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /inGamePromo|gamePromoWidget|活動掛件/, {});
    return two(h.raw, h.code, "兩者同為 0 才是真的 absent");
  }
});

register({
  id: "event/referral-attestor",
  category: "活動", label: "推薦歸因的見證者（attestor|referralWitness）",
  scope: [SRC + "**/*.js"],
  note: "#105（⬜待批准·含後端）的尺。raw>0 而 effective 可能為 0 ⇒ 差額就是「我們寫過它、但沒有接線」。",
  witness: { file: "prototype/src/core/referral-core.js", mutate: appendCode("var attestor = 1;") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /attestor|referralWitness/, {});
    return two(h.raw, h.code, "命中處：" + (h.rawFiles.join(", ") || "（無）"));
  }
});

register({
  id: "event/post-event-results-owners",
  category: "活動", label: "各自存一份「往期成績」的活動數（#186 的重複源）",
  scope: [SRC + "core/**/*.js"],
  note: "口徑＝grep -rn 命中檔數（不是命中次數）。#186 要治的正是「第三個活動要有結果面就得再抄第三份」。",
  witness: { file: "prototype/src/core/raffle.js", mutate: appendCode("var lastResult = null;") },
  run: function (ctx) {
    var files = ctx.files(SRC + "core/", JS);
    var h = ctx.lineHits(files, /lastResult|prevWinners|往期|上一期/);
    return two(h.rawFiles.length, h.codeFiles.length,
      "effective＝程式碼命中檔數：" + (h.codeFiles.join(", ") || "（無）"));
  }
});

/* ── 資安 ──────────────────────────────────────────────────────────────────── */

register({
  id: "sec/rbac-consumers",
  category: "資安", label: "營運身分述詞 HL.rbac 的消費者檔數（排除 owner）",
  scope: [SRC + "**/*.js（排除 owner core/rbac.js）"],
  note: "#117 落地後這個數**恆為 1**（只有 core/reports.js）直到 #182 把 `HL.opsAudit.actor()` 接上去＝2。" +
        "一個容器有沒有第二個消費者，是本庫判「容器是不是活的」最可靠的一條線。",
  witness: { file: "prototype/src/core/ops-audit.js", mutate: function (s) { return s.split("HL.rbac").join("HL.rbacX"); } },
  run: function (ctx) {
    var owner = SRC + "core/rbac.js";
    var h = ctx.lineHits(srcJs(ctx).filter(function (f) { return f !== owner; }), /HL\.rbac\s*[.&]/);
    return two(h.rawFiles.length, h.codeFiles.length, "effective＝真的呼叫它的檔：" + h.codeFiles.join(", "));
  }
});

register({
  id: "sec/kyc-tokens",
  category: "資安", label: "KYC/合規的任何痕跡（kyc|KYC|身分驗證）",
  scope: [SRC + "**/*.js"],
  note: "台帳這一格是 `absent` 且**刻意維持**（CONTROL.avoid）。raw>0／effective 0＝" +
        "「我們寫過它為什麼不做」，不是「做了一半」——這正是 raw 與 effective 要分開印的理由。",
  witness: { file: "prototype/src/core/auth.js", mutate: appendCode("var kyc = 1;") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /kyc|KYC|身分驗證/, {});
    return two(h.raw, h.code, "命中處：" + (h.rawFiles.join(", ") || "（無）"));
  }
});

register({
  id: "sec/visibility-selfcontrol",
  category: "資安", label: "玩家可見度自控的任何痕跡（HL.visibility|ghostMode|隱身）",
  scope: [SRC + "**/*.js"],
  note: "0＝#127。五個表面都會把玩家推到台前（排行榜/大獎牆/聊天/熱度牆/競技場），而他一顆開關都沒有。",
  witness: { file: "prototype/src/core/responsible.js", mutate: appendCode("HL.visibility = {};") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /HL\.visibility\b|ghostMode|隱身/, {});
    return two(h.raw, h.code,
      "raw 的唯一命中是 data/mock-data.js 的假玩家名「隱身玩家」＝字串字面量、與玩家開關無關" +
      "（一個名字裡有那兩個字，不代表那個功能存在）⇒ effective 0 才是這一格的讀數");
  }
});

/* ── 資料 ──────────────────────────────────────────────────────────────────── */

register({
  id: "data/betlog-ring-cap",
  category: "資料", label: "注單環形緩衝上界（core/betlog.js 的 CAP）",
  scope: ["prototype/src/core/betlog.js"],
  note: "#151 的核心事實之一：玩家看到的「已記錄注單 N / CAP」在第 CAP+1 局把最舊的丟掉，" +
        "而報表中心對玩家說的是「匯出為全部資料」。這個上界過去只以 evidence 裡的散文存在。",
  witness: { file: "prototype/src/core/betlog.js", mutate: function (s) { return s.replace(/var CAP = \d+/, "var CAP = 777"); } },
  run: function (ctx) {
    var m = /var CAP = (\d+)/.exec(ctx.code("prototype/src/core/betlog.js") || "");
    if (!m) throw new Error("讀不到 CAP ⇒ 形狀變了（別讓它靜默回 0）");
    return val(Number(m[1]), "求值自原始碼常數，不是抄的");
  }
});

register({
  id: "data/activity-retention-days",
  category: "資料", label: "活躍度環形桶的保留天數 × 評估窗（KEEP_DAYS / WINDOW_DAYS）",
  scope: ["prototype/src/core/activity.js"],
  note: "raw＝KEEP_DAYS（任何消費者可問的最長視窗）／effective＝WINDOW_DAYS（光環的評估窗）。" +
        "兩者被混用過一次：「保留 90 天」與「只看 30 天」是兩件事。",
  witness: { file: "prototype/src/core/activity.js", mutate: function (s) { return s.replace(/var WINDOW_DAYS = \d+/, "var WINDOW_DAYS = 7"); } },
  run: function (ctx) {
    var c = ctx.code("prototype/src/core/activity.js") || "";
    var k = /var KEEP_DAYS\s*=\s*(\d+)/.exec(c), w = /var WINDOW_DAYS\s*=\s*(\d+)/.exec(c);
    if (!k || !w) throw new Error("讀不到 KEEP_DAYS/WINDOW_DAYS ⇒ 形狀變了");
    return two(Number(k[1]), Number(w[1]), "桶數上界恆為 KEEP_DAYS+1（測項 activity/ring-bounded）");
  }
});

register({
  id: "data/local-storage-keys",
  category: "資料", label: "本機存檔的相異 key 數（\"HL_*\" 字面量）",
  scope: [SRC + "**/*.js"],
  note: "⚠️ 這條**必須數 raw 文字**：key 是字串字面量，剝字串之後它們全部消失（effective 會是 0，" +
        "而那是 codeOf 的正確行為、不是這個量的答案）⇒ raw 才是讀數，effective 是「有幾個是用常數拼出來的」。" +
        "台帳〈本機存檔台帳〉2026-08-27 記的是 42 個，本輪實測已不同 ⇒ 又一筆到期的手抄讀數。",
  witness: { file: "prototype/src/core/app-state.js", mutate: appendCode("var W = \"HL_WITNESS_KEY\";") },
  run: function (ctx) {
    var seen = {};
    srcJs(ctx).forEach(function (f) {
      var s = ctx.read(f);
      if (s == null) return;
      var re = /"(HL_[A-Z0-9_]+)"/g, m;
      while ((m = re.exec(s))) seen[m[1]] = 1;
    });
    var n = Object.keys(seen).length;
    if (!n) throw new Error("零個 HL_ key ⇒ 這條探針量空了");
    return two(n, n, "相異 key（去重後）；上界與清除出口＝#138");
  }
});

/* ── 擴充性 ────────────────────────────────────────────────────────────────── */

register({
  id: "ext/registry-namespaces",
  category: "擴充性", label: "有 register( 出口的登記簿命名空間數（相異 HL.<ns>）",
  scope: [SRC + "**/*.js"],
  note: "口徑＝相異命名空間（不是呼叫點數）。raw 含註解/字串裡被提到的命名空間 ⇒ " +
        "差額就是「文件裡有、程式裡沒有」的那幾個。逐簿的可證明性另見 intel/tools/registry-gaps.js。",
  witness: { file: "prototype/src/core/season.js", mutate: appendCode("HL.zzWitness.register({});") },
  run: function (ctx) {
    function nsOf(text) {
      var out = {}, re = /HL\.([a-zA-Z][a-zA-Z0-9]*)\.register\s*\(/g, m;
      while ((m = re.exec(text || ""))) out[m[1]] = 1;
      return out;
    }
    var raw = {}, code = {};
    srcJs(ctx).forEach(function (f) {
      var a = nsOf(ctx.read(f)); Object.keys(a).forEach(function (k) { raw[k] = 1; });
      var b = nsOf(ctx.code(f)); Object.keys(b).forEach(function (k) { code[k] = 1; });
    });
    var ck = Object.keys(code).sort();
    if (!ck.length) throw new Error("零個登記簿 ⇒ 這條探針量空了");
    return two(Object.keys(raw).length, ck.length, ck.join(","));
  }
});

register({
  id: "ext/feature-flags",
  category: "擴充性", label: "Feature Flags / 灰度上線的任何痕跡（HL.flags|featureFlag）",
  scope: [SRC + "**/*.js"],
  note: "0＝台帳這一格 `absent` 的尺。注意它與 `HL.release`（上架排程×受眾）不是同一件事——" +
        "後者管「什麼時候給誰看」，flags 管「這段程式要不要跑」。",
  witness: { file: "prototype/src/core/release.js", mutate: appendCode("HL.flags = {};") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /HL\.flags\b|featureFlag|HL\.ff\b/, {});
    return two(h.raw, h.code, "兩者同為 0 才是真的 absent");
  }
});

register({
  id: "ext/lobby-slot-registry",
  category: "擴充性", label: "大廳版位登記簿的任何痕跡（HL.lobby|lobbySlot|HL.sections）",
  scope: [SRC + "**/*.js"],
  note: "0＝#139（全站流量最高的畫面是唯一沒有登記簿的表面：大廳的區塊清單、順序與「給誰看」全硬寫在 view 裡）。",
  witness: { file: "prototype/src/views/casino.js", mutate: appendCode("HL.lobby = {};") },
  run: function (ctx) {
    var h = ctx.hits(srcJs(ctx), /HL\.lobby\b|lobbySlot|HL\.sections\b/, {});
    return two(h.raw, h.code, "兩者同為 0 才是真的 absent");
  }
});

/* ── #197：首屏餘裕（全庫被引用最多、也錯得最兇的那個手抄數字）────────────────
 * 這條刻意**不自己量**：它 require `prototype/tests/checks-platform.js` 的 `firstScreenMeasure`，
 * 也就是常駐鎖 `platform/first-screen-budget` 用的**同一份程式碼**。理由見那支檔的出口註解——
 * 這把尺本來就存在而且是對的，缺的只是「沒有出口」，於是每個引用者都只能抄一個會過期的數。
 *
 * ⚠️ **require 寫在 run() 裡面而不是檔頭，這不是風格問題**：`checks-platform.js` 反過來
 * require 本檔（常駐鎖 `platform/ledger-probe-fail-closed` 要跑本檔的 selftest）⇒ 檔頭 require
 * 會造成**循環相依**，而 node 對循環相依的處理是「回一個半成品 exports 物件」——
 * `firstScreenMeasure` 會是 undefined，而錯誤會長得像「工具壞了」而不是「相依成環」。
 * 延到 run() 時再取，兩邊都已載入完畢。取不到就**拋**（框架不變量 (a)：大聲失敗、仍佔一列）。 */
register({
  id: "ext/first-screen-headroom",
  category: "擴充性", label: "首屏餘裕 bytes（預算 1600KB − 首屏 LF 正規化位元組）",
  scope: ["prototype/index.html", "prototype/index.html 上 <script src=\"./…\"> 與 <link href=\"./….css\"> 指到的每一支檔"],
  note: "raw＝首屏總位元組、effective＝**餘裕**（預算減掉它）。兩個口徑都要印，因為文件引用的是餘裕、" +
        "而判「超標了沒」用的是總量。⚠️ script 數的口徑：本尺數 94，而 index.html 有 95 個 `<script src=`——" +
        "差的那一支是 `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`（外部 CDN、不吃我們的位元組）。" +
        "**兩個數都對，只是口徑不同**。讀數為 LF 正規化＝git blob＝Pages 服務的位元組（.gitattributes 之後三者恆等）。",
  witness: {
    file: "prototype/index.html",
    /* 見證者＝往 index.html 多掛一支**真的存在**的 script。
     * 刻意不用假路徑：假路徑只會讓它掉進 missing、位元組一位都不動＝見證者形同虛設
     * （那正是 §4 形狀⑦「斷言認的是寫法不是概念」的一個現成入口）。 */
    mutate: appendCode("<script src=\"./src/core/site-mode.js\"></script>")
  },
  run: function (ctx) {
    var fsb = require(path.join(ROOT, "prototype", "tests", "checks-platform.js"));
    if (!fsb || typeof fsb.firstScreenMeasure !== "function" || !fsb.BUDGET_KB) {
      throw new Error("checks-platform.js 取不到 firstScreenMeasure/BUDGET_KB ⇒ 首屏餘裕又沒有出口了");
    }
    var r = fsb.firstScreenMeasure(null, function (rel) { return ctx.read(rel); });
    if (r.missing.length) throw new Error("首屏清單有 " + r.missing.length + " 支讀不到：" + r.missing.join("、"));
    if (r.scripts < 50) throw new Error("只掃到 " + r.scripts + " 支 script ⇒ 量空了");
    return two(r.bytes, fsb.BUDGET_KB * 1024 - r.bytes,
      "首屏 " + (r.bytes / 1024).toFixed(1) + "KB / " + r.scripts + " 支本地 script（預算 " + fsb.BUDGET_KB + "KB / " + fsb.BUDGET_SCRIPTS + " 支）");
  }
});

/* ═══ CLI ═════════════════════════════════════════════════════════════════ */

module.exports = {
  PROBES: PROBES, register: register, report: report, selftest: selftest,
  witnessCheck: witnessCheck, makeCtx: makeCtx,
  worktreeSource: worktreeSource, gitSource: gitSource, overlaySource: overlaySource,
  runOne: runOne
};

if (require.main === module) {
  var argv = process.argv.slice(2);
  function opt(name) { var i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; }

  if (argv.indexOf("--selftest") >= 0) {
    var st = selftest();
    st.results.forEach(function (r) {
      console.log((r.pass ? "✅ " : "❌ ") + r.id + (r.pass ? "" : "\n      → " + r.msg));
    });
    console.log("\n共 " + st.results.length + " 條不變量｜失敗 " + st.failed);
    process.exitCode = st.failed ? 1 : 0;
  } else if (argv.indexOf("--witness") >= 0) {
    witnessCheck().forEach(function (w) {
      console.log((w.flipped ? "✅ " : "❌ ") + w.id + "  " + w.before + " → " + w.after +
        "  （改壞 " + w.file + "）" + (w.brokeInstead ? "  ⚠️ 改成報錯而不是改值" : ""));
    });
  } else {
    var rep = report({ category: opt("--category"), ref: opt("--ref") });
    if (argv.indexOf("--json") >= 0) {
      console.log(JSON.stringify(rep, null, 2));
    } else {
      console.log("台帳共用探針電池｜來源 " + rep.ref + "｜" + rep.total + " 條" +
        (rep.failed ? "（❌ 失敗 " + rep.failed + "）" : ""));
      console.log("讀數是求值出來的，不是抄的；每一列的「量程」就是它的射程邊界——超出量程的事實它看不見。\n");
      var cat = "";
      rep.rows.forEach(function (r) {
        if (r.category !== cat) { cat = r.category; console.log("── " + cat + " ──"); }
        if (!r.ok) {
          console.log("  ❌ " + r.id + "  探針失敗：" + r.error);
          return;
        }
        console.log("  " + r.id);
        console.log("     " + r.label);
        console.log("     原始 " + r.raw + "｜有效 " + r.effective);
        console.log("     量程 " + (Array.isArray(r.scope) ? r.scope.join("、") : r.scope));
        if (r.note) console.log("     註 " + r.note);
      });
      console.log("\n（本工具只印讀數，不判 present/partial/weak/absent——狀態判定留在台帳那一側。）");
    }
    process.exitCode = rep.failed ? 1 : 0;
  }
}

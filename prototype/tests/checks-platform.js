/*
 * Apex Win｜平台載入架構測項（node 端·掛在 HL.selftest 註冊表上）  #80
 * ---------------------------------------------------------------------------
 * 守三件事：
 *   1. lazy-games 清單完整性     — src 檔存在、id 不重複、不與靜態掛載重疊、容器本身有掛。
 *   2. 清單 meta 與 view 檔不漂移 — 大廳卡在「載入前(清單)／載入後(view 自己 register)」必須逐欄一致，
 *                                  否則玩家會看到卡片在開啟瞬間變色/改名。這是延遲載入唯一的新風險面。
 *   3. 首屏預算（M6 門檻）自動化 — 過去是維護軌每輪手打 node 一行量、**沒有任何機械閘**，
 *                                  於是 08-07 首屏悄悄長到距門檻只剩 41KB 才被看見（船長指令 [M8]）。
 *                                  這裡把 >1600KB / >120 scripts 變成會 FAIL 的常駐鎖。
 *
 * 為什麼 meta 比對要「重新解析 view 檔」而不是 require 它：
 *   這些 view 檔的 HL.games.register 呼叫在 DOM guard 之後（node require 會提早 return），
 *   拿不到那個 meta 物件 ⇒ 只能靜態解析。用 brace matching（會跳過字串內的括號）而非 regex 抓 {...}。
 */
"use strict";
var path = require("path");
var fs = require("fs");
var selftest = require(path.join(__dirname, "..", "src", "core", "selftest.js"));

var ROOT = path.join(__dirname, "..");
var INDEX = path.join(ROOT, "index.html");

// lazy-games.js 走 module.exports（檔尾），node 端不會 boot()
var lazy = (function () {
  try { return require(path.join(ROOT, "src", "data", "lazy-games.js")); }
  catch (e) { return null; }
})();

function indexHtml() { return fs.readFileSync(INDEX, "utf8"); }

// #100 後字典已不在 core/i18n.js 裡，而是散在 src/i18n/<code>.js 各語言包。
// 凡「掃字典原始碼」的測項一律改讀本函式，否則拆檔那天它們會**靜默轉綠**（掃到的檔裡一條鍵都沒有）。
var I18N_DIR = path.join(ROOT, "src", "i18n");
function i18nPackFiles() {
  try { return fs.readdirSync(I18N_DIR).filter(function (f) { return /\.js$/.test(f); }).sort(); }
  catch (e) { return []; }
}
function i18nPacksSrc() {
  return i18nPackFiles().map(function (f) { return fs.readFileSync(path.join(I18N_DIR, f), "utf8"); }).join("\n");
}

// index.html 內所有本地 <script src>（排除 CDN）
function staticScripts(html) {
  var out = [], re = /<script[^>]*src="(\.[^"]+)"/g, m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

// 從 view 原始碼以 brace matching 抽出所有 HL.games.register({...}) 的 meta（render 置為 null）
function extractRegisters(src) {
  var out = [], needle = "HL.games.register(", i = -1;
  while ((i = src.indexOf(needle, i + 1)) !== -1) {
    var j = src.indexOf("{", i + needle.length - 1);
    if (j === -1) continue;
    if (!/^\s*$/.test(src.slice(i + needle.length, j))) continue; // ( 與 { 之間須只有空白
    var depth = 0, k = j, inStr = null, esc = false;
    for (; k < src.length; k++) {
      var c = src[k];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (c === "\\") { esc = true; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) break; }
    }
    if (depth !== 0) continue;
    var lit = src.slice(j, k + 1).replace(/render\s*:\s*(?:function\s*\([^)]*\)|[A-Za-z_$][\w$]*)/g, "render:null");
    var obj = null;
    try { obj = eval("(" + lit + ")"); } catch (e) { obj = null; } // eslint-disable-line no-eval
    if (obj && obj.id) out.push(obj);
  }
  return out;
}

// ── 1. 清單完整性 ───────────────────────────────────────────────────────────
selftest.register({
  id: "platform/lazy-games-manifest", group: "platform", env: "node", tier: "fast",
  title: "延遲載入清單完整性：src 存在／id 不重複／不與靜態掛載重疊／容器已掛",
  run: function (t) {
    if (!lazy || !lazy.manifest) t.skip("lazy-games.js 未載入");
    var man = lazy.manifest;
    t.ok(man.length > 0, "清單不得為空");

    var html = indexHtml(), statics = staticScripts(html);
    t.ok(statics.indexOf("./src/data/lazy-games.js") >= 0,
      "index.html 必須掛載 lazy-games.js，否則所有延遲遊戲整批從大廳消失");

    var seen = {}, ids = [];
    man.forEach(function (e) {
      t.ok(!!e.src, "清單每列都要有 src");
      var f = path.join(ROOT, e.src.replace(/^\.\//, ""));
      t.ok(fs.existsSync(f), "清單 src 不存在：" + e.src);
      // 關鍵：延遲載入的檔**不得**同時還靜態掛在 index.html（否則首屏一點沒省，且會雙重註冊）
      t.ok(statics.indexOf(e.src) < 0, "已列入延遲載入卻仍靜態掛載：" + e.src);
      t.ok((e.games || []).length > 0, e.src + " 沒有列任何遊戲 meta");
      (e.games || []).forEach(function (g) {
        t.ok(!!g.id, e.src + " 有一筆 meta 缺 id");
        t.ok(!seen[g.id], "id 重複：" + g.id);
        seen[g.id] = e.src; ids.push(g.id);
        t.ok(!g.route, g.id + " 不得設 route（延遲遊戲一律走 goGame 動態派發）");
        t.ok(!g.render, g.id + " 清單內不得帶 render（render 由 view 檔載入後接手）");
        t.ok(!!g.title, g.id + " 缺 title（大廳卡在載入前就要顯示它）");
      });
    });
    t.ok(ids.length >= 19, "延遲遊戲數異常偏少：" + ids.length);
  }
});

// ── 2. 清單 meta 與 view 檔 register 不漂移（延遲載入唯一新風險面）─────────────
selftest.register({
  id: "platform/lazy-games-meta-parity", group: "platform", env: "node", tier: "fast",
  title: "清單 meta ≡ view 檔自己 register 的 meta（大廳卡不得在載入瞬間跳動）",
  run: function (t) {
    if (!lazy || !lazy.manifest) t.skip("lazy-games.js 未載入");
    // 只比對「會影響大廳卡外觀/行為」的欄位；render 本身天然不同故排除
    var FIELDS = ["title", "provider", "type", "cat", "author", "playable", "comingSoon", "isNew", "hot", "c1", "c2", "thumb", "community"];
    var compared = 0;
    lazy.manifest.forEach(function (e) {
      var src = fs.readFileSync(path.join(ROOT, e.src.replace(/^\.\//, "")), "utf8");
      var actual = extractRegisters(src), byId = {};
      actual.forEach(function (o) { byId[o.id] = o; });
      t.ok(actual.length > 0, e.src + " 靜態解析不到任何 HL.games.register（清單可能指錯檔）");
      (e.games || []).forEach(function (g) {
        var a = byId[g.id];
        t.ok(!!a, e.src + " 實際並未註冊清單宣告的 id：" + g.id +
          "（實際為 " + Object.keys(byId).join("/") + "）⇒ 玩家點卡會看到載入失敗");
        FIELDS.forEach(function (k) {
          var mv = g[k], av = a[k];
          if (mv === undefined && av === undefined) return;
          // view 檔沒寫的欄位由 games.js norm() 補預設；清單也沒寫＝一致，不算漂移
          if (mv === undefined && (av === undefined || av === null)) return;
          t.equal(mv, av, g.id + " 的 " + k + " 在清單與 " + e.src + " 之間漂移");
        });
        compared++;
      });
    });
    t.ok(compared >= 19, "實際比對筆數偏少：" + compared);
  }
});

// ── 3. 首屏預算閘（把 M6 的手動 node 一行變成常駐鎖）──────────────────────────
var BUDGET_KB = 1600, BUDGET_SCRIPTS = 120;
selftest.register({
  id: "platform/first-screen-budget", group: "platform", env: "node", tier: "fast",
  title: "首屏預算：JS+CSS+html ≤ " + BUDGET_KB + "KB 且 <script> ≤ " + BUDGET_SCRIPTS + " 支（M6 門檻）",
  run: function (t) {
    var html = indexHtml(), bytes = Buffer.byteLength(html), missing = [];
    var scripts = staticScripts(html);
    scripts.forEach(function (s) {
      var f = path.join(ROOT, s.replace(/^\.\//, ""));
      try { bytes += fs.statSync(f).size; } catch (e) { missing.push(s); }
    });
    var cre = /<link[^>]*href="(\.[^"]+\.css)"/g, m;
    while ((m = cre.exec(html))) {
      var cf = path.join(ROOT, m[1].replace(/^\.\//, ""));
      try { bytes += fs.statSync(cf).size; } catch (e) { missing.push(m[1]); }
    }
    t.equal(missing.length, 0, "index.html 指向不存在的本地檔：" + missing.join("、"));
    var kb = bytes / 1024;
    t.ok(kb <= BUDGET_KB, "首屏 " + kb.toFixed(0) + "KB 超出預算 " + BUDGET_KB +
      "KB ⇒ 依 M6 協定應開 code-splitting／lazy-load 卡（可把遊戲 view 加入 lazy-games 清單）");
    t.ok(scripts.length <= BUDGET_SCRIPTS, "首屏 " + scripts.length + " 支 script 超出預算 " + BUDGET_SCRIPTS + " 支");
  }
});

// ── 4. 負責任博弈覆蓋鎖（#86 · 反向 grep）────────────────────────────────────
// 為什麼需要這條：#67/#70 把限額閘掛在 HL.instant.betPanel / HL.table.betArea / 儲值三處，
//   但**自帶下注面板**的 view（自己 amt.get() + setBal(bal()-bet)）完全繞過那三處。
//   2026-08-11 實測 `grep -rl "HL.rg" views/` 命中 0 ⇒ 17 個會扣款的 view 全數未閘：
//   玩家設了「每日投注上限」，slot/keno/towers/hilo/pump/picks/duel/crash/mines/賞金局/跟注/競技場
//   照樣押得下去，而累積側 live-stats.js:48 卻是全通的 ⇒ 額度被吃光、卻永遠不被擋（承諾與行為不一致）。
// 規則（刻意用「行為」而非檔名清單，才擋得住**下一個**新遊戲）：
//   凡 src/views/*.js 出現「直接扣餘額」的痕跡，該檔就必須出現 HL.rg。
//   新增一款自帶面板卻忘了掛閘的遊戲 ⇒ 這條會 FAIL 並指名該檔。
var VIEWS_DIR = path.join(ROOT, "src", "views");
// 直接扣餘額的四種既有寫法（涵蓋 instant 系 setBal、slot 系 spend(-)、state.set({balance）
var DEDUCT_RE = /HL\.instant\.setBal\s*\(|(^|[^\w.])spend\s*\(\s*-|HL\.state\.set\s*\(\s*\{\s*balance|(^|[^\w.])setBal\s*\(\s*bal\(\)\s*-/;
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
}
selftest.register({
  id: "platform/rg-bet-gate-coverage", group: "platform", env: "node", tier: "fast",
  title: "負責任博弈：每個會扣餘額的 view 都必須掛 HL.rg 下注前閘（#86）",
  run: function (t) {
    var files = fs.readdirSync(VIEWS_DIR).filter(function (f) { return /\.js$/.test(f); });
    var deducting = [], ungated = [];
    files.forEach(function (f) {
      var clean = stripComments(fs.readFileSync(path.join(VIEWS_DIR, f), "utf8"));
      if (!DEDUCT_RE.test(clean)) return;
      deducting.push(f);
      if (!/HL\.rg/.test(clean)) ungated.push(f);
    });
    t.equal(ungated.length, 0,
      "這些 view 會扣餘額卻沒有下注前閘（請補一行 `if (HL.rg && !HL.rg.check(bet)) return;`）：" + ungated.join("、"));
    // 防「規則被改鬆到抓不到東西」＝樣本量本身也要是鎖（2026-08-11 基準 17 個）
    t.ok(deducting.length >= 17,
      "偵測到的扣款 view 只有 " + deducting.length + " 個（基準 17）⇒ DEDUCT_RE 可能被改窄或檔案被搬走，此鎖已失效");
  }
});

// ── 5. 紅利可用範圍軸的 game 傳遞鎖（#89 · 反向 grep）──────────────────────────
// 為什麼需要這條：本卡的根因是「中央結算點帶著 game，卻在傳給下游時被丟掉」。
//   2026-08-12 實測 `HL.bonus.onWager(bet)` 少一個參數 ⇒ 紅利在架構上不可能知道押在哪一款。
//   同型缺陷 #85 才在 tournament 上修過一次 ⇒ **這是會復發的形狀**，用鎖釘住而非靠記憶。
// 規則：凡呼叫 `HL.bonus.onWager(`，實參必須 ≥2 個（第二個即 game）。
//   下一個新結算點若又只傳 bet，這條會 FAIL 並指名該檔行號。
selftest.register({
  id: "platform/bonus-onwager-carries-game", group: "platform", env: "node", tier: "fast",
  title: "紅利流水掛鉤必須帶 game（#89：防 game 軸再次在下游被丟掉）",
  run: function (t) {
    var SRC = path.join(ROOT, "src");
    var offenders = [], callSites = 0;
    (function walk(dir) {
      fs.readdirSync(dir).forEach(function (f) {
        var p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) return walk(p);
        if (!/\.js$/.test(f)) return;
        stripComments(fs.readFileSync(p, "utf8")).split("\n").forEach(function (line, i) {
          var m = line.match(/HL\.bonus\.onWager\s*\(([^)]*)\)/);
          if (!m) return;
          callSites++;
          // 實參以頂層逗號切分（本專案此處無巢狀呼叫，故簡單切分即足）
          if (m[1].split(",").filter(function (s) { return s.trim(); }).length < 2) {
            offenders.push(path.relative(ROOT, p).replace(/\\/g, "/") + ":" + (i + 1));
          }
        });
      });
    })(SRC);
    t.equal(offenders.length, 0,
      "這些 onWager 呼叫端沒有把 game 傳下去（紅利將無法判斷可用範圍）：" + offenders.join("、"));
    // 樣本量鎖：呼叫端消失＝這條鎖變成空殼（2026-08-12 基準 1 個）
    t.ok(callSites >= 1,
      "找不到任何 HL.bonus.onWager 呼叫端（基準 1）⇒ 掛鉤被移除或改名，此鎖已失效");
  }
});

/* ---------------------------------------------------------------------------
 * #91 週期獎勵「檔期軸」：reload 的 PERIODS 升為可註冊出口 + VIP 階級解鎖閘
 * 這兩條鎖守卡片列的五個不變量：
 *   (a) 未宣告 minTier 時零回歸  (b) 階級閘擋在 claim() 本體、不可繞過
 *   (c) claimableCount 排除被鎖桶  (d) 註冊即擴充  (e) PERIODS 不得外露
 * 為何用 shim 載入而非 require：reload.js 是瀏覽器 IIFE，載入期就取 HL.dom.el ⇒ node 無法直接 require。
 * shim 載入的是「玩家跑的同一份原始碼」（不重寫演算法，重寫等於驗一份 copy）。
 * ------------------------------------------------------------------------- */
var RELOAD_SRC = path.join(ROOT, "src", "core", "reload.js");

// 以固定假時鐘 + 最小 HL shim 載入 reload.js，回傳 { HL, store, bonusCalls }
function loadReload(vipIndex, store, fakeNow) {
  var NOW = fakeNow || 1786000000000;
  var bonusCalls = [];
  var HL = {
    dom: {
      el: function () { return {}; }, money: function (n) { return "$" + n; },
      dayNum: function () { return Math.floor(NOW / 86400000); },
      weekNum: function () { return Math.floor(NOW / 604800000); },
      dhm: function (ms) { return "dhm:" + ms; },
      lsGet: function (k, d) { return store[k] === undefined ? d : JSON.parse(JSON.stringify(store[k])); },
      lsSet: function (k, v) { store[k] = JSON.parse(JSON.stringify(v)); }
    },
    vip: { status: function () { return { index: vipIndex, name: "T" + vipIndex, icon: "🥉" }; } },
    bonus: { add: function (amt, meta) { bonusCalls.push([amt, meta && meta.source]); } },
    ticker: { add: function () { }, remove: function () { } },
    ui: { toast: function () { }, modal: function () { return { close: function () { } }; } }
  };
  var origNow = Date.now;
  Date.now = function () { return NOW; };
  try {
    new Function("window", "document", fs.readFileSync(RELOAD_SRC, "utf8"))(
      { HL: HL }, { createTextNode: function (x) { return { t: x }; } });
  } finally { Date.now = origNow; }
  return { HL: HL, store: store, bonusCalls: bonusCalls };
}

selftest.register({
  id: "platform/reload-period-outlet", group: "platform", env: "node", tier: "fast",
  title: "週期紅利檔期軸必須只經 register() 擴充，PERIODS 不得外露（#91 不變量 e）",
  run: function (t) {
    var SRC = path.join(ROOT, "src");
    var leaks = [];
    (function walk(dir) {
      fs.readdirSync(dir).forEach(function (f) {
        var p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) return walk(p);
        if (!/\.js$/.test(f)) return;
        if (path.resolve(p) === path.resolve(RELOAD_SRC)) return;   // 定義處本身不算外露
        stripComments(fs.readFileSync(p, "utf8")).split("\n").forEach(function (line, i) {
          if (/\bPERIODS\b/.test(line)) leaks.push(path.relative(ROOT, p).replace(/\\/g, "/") + ":" + (i + 1));
        });
      });
    })(SRC);
    t.equal(leaks.length, 0,
      "這些檔直接碰了 reload 的私有 PERIODS（應改走 HL.reload.register）：" + leaks.join("、"));

    // 出口本身必須在（否則上面那條反向鎖會變成「因為根本沒有檔期軸」而恆綠）
    var s = loadReload(0, {});
    t.equal(typeof s.HL.reload.register, "function", "HL.reload.register 不見了＝檔期軸的註冊出口被移除");
    t.equal(typeof s.HL.reload.keys, "function", "HL.reload.keys 不見了");
    // 樣本量鎖：種子三檔（2026-08-14 基準）——種子若被搬走，本組鎖的覆蓋面就空了
    t.ok(s.HL.reload.keys().length >= 3,
      "reload 種子檔期少於 3 檔（基準 daily/weekly/monthly），實際 " + JSON.stringify(s.HL.reload.keys()));
  }
});

selftest.register({
  id: "platform/reload-tier-gate", group: "platform", env: "node", tier: "fast",
  title: "檔期桶階級解鎖閘不可繞過，且未宣告 minTier 時零回歸（#91 不變量 a/b/c/d）",
  run: function (t) {
    // (a) 零回歸錨點：三檔種子皆不宣告 minTier ⇒ 全等級 locked 恆 false
    [0, 1, 2, 3, 4].forEach(function (v) {
      loadReload(v, {}).HL.reload.status().forEach(function (r) {
        t.equal(r.locked, false, "種子檔期 " + r.key + " 在 VIP " + v + " 竟被鎖住（種子不該有 minTier）");
        t.equal(r.minTier, null, "種子檔期 " + r.key + " 不該宣告 minTier");
      });
    });

    var SPEC = {
      key: "t_gated", ic: "⭐", label: "測試桶", amts: [0, 3000, 7000, 15000, 30000],
      minTier: 1, minTierLabel: "🥈 白銀",
      num: function () { return 1; }, msToNext: function () { return 1; }
    };

    // (d) 註冊即擴充；(b)(c) 未達階級時：不可領、不計數、claim 不派彩也不寫旗標
    var lo = loadReload(0, {});
    t.equal(lo.HL.reload.register(SPEC), true, "register 應回傳 true");
    t.equal(lo.HL.reload.status().length, 4, "register 後 status() 應多一筆");
    t.equal(lo.HL.reload.register(SPEC), false, "同 key 重複註冊應被拒");
    t.equal(lo.HL.reload.register({ key: "x", msToNext: function () { return 1; } }), false, "缺 num() 的 spec 應被拒");
    var row = lo.HL.reload.status().filter(function (r) { return r.key === "t_gated"; })[0];
    t.equal(row.locked, true, "VIP 0 未達 minTier 1，該桶應為 locked");
    t.equal(row.claimable, false, "被鎖的桶不得回報 claimable");
    t.equal(lo.HL.reload.claimableCount(), 3, "claimableCount 必須排除被鎖的桶（否則紅點說可領、點進去領不到）");
    t.equal(lo.HL.reload.claim("t_gated"), 0, "claim() 本體必須擋住未解鎖的桶（只在 UI 隱藏＝console 一行就繞過）");
    t.equal(lo.bonusCalls.length, 0, "被階級閘擋下時不得派彩");
    t.ok(!(lo.store.HL_RELOAD && lo.store.HL_RELOAD.t_gated !== undefined),
      "被階級閘擋下時不得寫入已領旗標（否則解鎖後直接變成已領）");

    // 達階級後：同一支桶可領、金額走該等級檔位、二次領取仍被週期閘擋
    var hi = loadReload(1, {});
    hi.HL.reload.register(SPEC);
    t.equal(hi.HL.reload.status().filter(function (r) { return r.key === "t_gated"; })[0].locked, false,
      "VIP 1 已達 minTier，該桶應解鎖");
    t.equal(hi.HL.reload.claimableCount(), 4, "解鎖後 claimableCount 應含該桶");
    t.equal(hi.HL.reload.claim("t_gated"), 3000, "解鎖後應可領且金額取 amts[VIP index]");
    t.equal(hi.bonusCalls.length, 1, "解鎖後領取應派彩一次入獎金錢包");
    t.equal(hi.HL.reload.claim("t_gated"), 0, "同期二次領取應被週期閘擋（階級閘不得覆蓋週期閘）");

    // sub-day 節奏（15 分鐘桶）：num/msToNext 由註冊者提供，架構本身不需改
    var sd = loadReload(4, {});
    sd.HL.reload.register({ key: "t_15min", ic: "⏱️", label: "每 15 分", amts: [10, 20, 30, 40, 50],
      num: function () { return Math.floor(Date.now() / 900000); }, msToNext: function () { return 900000; } });
    t.equal(sd.HL.reload.claim("t_15min"), 50, "次日級（sub-day）週期桶應可正常註冊並領取");
  }
});

// ── #92 主播跟注的真桌結果單一出口 ─────────────────────────────────────────────
var LIVETABLE_SRC = path.join(ROOT, "src", "core", "live-table.js");
// 以 new Function 載入「真的那份 live-table.js」並注入假 window（每次呼叫都是乾淨實例，
// 不污染 node 的 globalThis，也不倚賴 module.exports＝驗的就是瀏覽器跑的同一份程式碼）
function loadLiveTable(hl) {
  var win = { HL: hl || {} };
  new Function("window", fs.readFileSync(LIVETABLE_SRC, "utf8"))(win);
  return { core: win.HL.liveTable, HL: win.HL };
}

selftest.register({
  id: "platform/live-table-no-fabrication", group: "platform", env: "node", tier: "fast",
  title: "真桌未就緒時必須回 null 而非編造勝負，且 ensure() 會請延遲載入器補上（#92）",
  run: function (t) {
    // (a) 取不到真桌 ⇒ 恆 null。跑多次以排除「偶爾回 null、偶爾翻硬幣」的隨機分支
    var a = loadLiveTable({});
    t.equal(a.core.available(), false, "沒有 HL.baccarat 時 available() 應為 false");
    for (var i = 0; i < 50; i++) {
      t.equal(a.core.result(), null, "真桌未就緒時 result() 必須回 null（回了勝負＝又在編造，正是 #92 要修的事）");
    }

    // (b) 有真桌 ⇒ 原樣傳回真開牌結果（不得自己加工/覆寫 winner）
    var deals = 0;
    var b = loadLiveTable({ baccarat: { deal: function () { deals++; return { winner: "player", pt: 8, bt: 6 }; } } });
    t.equal(b.core.available(), true, "有 HL.baccarat.deal 時 available() 應為 true");
    var r = b.core.result();
    t.equal(r && r.winner, "player", "有真桌時應原樣傳回 deal() 的 winner");
    t.equal(r && r.pt, 8, "點數應原樣傳回（消費端要用它渲染『閒 x : y 莊』）");
    t.equal(deals, 1, "result() 每呼叫一次只能開一次牌（多開＝吃掉 fair 的 nonce 序列）");

    // (c) 殘缺結果（有物件但無 winner）也算取不到 ⇒ null，不得讓 undefined 流進派彩計算
    var c = loadLiveTable({ baccarat: { deal: function () { return {}; } } });
    t.equal(c.core.result(), null, "deal() 回了沒有 winner 的物件時應視為取不到（否則 followMult 收到 undefined）");

    // (c2) 自癒：result() 取不到時必須順手請載入（否則消費端入口漏喊 ensure() 就會「永遠」不結算，
    //      而非只有第一局不結算——負向擾動實測到的真實退化路徑）
    var selfHeal = [];
    var sh = loadLiveTable({ lazyGames: { load: function (id) { selfHeal.push(id); } } });
    t.equal(sh.core.result(), null, "真桌未就緒時 result() 仍須回 null");
    t.equal(selfHeal.join(","), "baccarat", "result() 取不到真桌時應自動請延遲載入器補上（自癒），實際：" + JSON.stringify(selfHeal));
    for (var k = 0; k < 5; k++) sh.core.result();
    t.equal(selfHeal.length, 1, "自癒請求也必須冪等（每局重請＝重複注入 <script>）");

    // (d) ensure()：冪等、只請一次；已可用時不請；沒有延遲載入器時安靜略過不拋
    var asked = [];
    var d = loadLiveTable({ lazyGames: { load: function (id) { asked.push(id); } } });
    t.equal(d.core.ensure(), true, "真桌未就緒且有延遲載入器時，ensure() 應請它載入");
    t.equal(d.core.ensure(), false, "ensure() 必須冪等（重複請求會重複注入 <script>）");
    t.equal(asked.join(","), "baccarat", "ensure() 應向延遲載入器要 baccarat，實際：" + JSON.stringify(asked));
    var e = loadLiveTable({ baccarat: { deal: function () { return { winner: "tie" }; } }, lazyGames: { load: function () { asked.push("SHOULD-NOT"); } } });
    t.equal(e.core.ensure(), false, "已可取得真桌時不該再請載入");
    t.equal(asked.length, 1, "已可用時仍呼叫了延遲載入器");
    var f = loadLiveTable({});                     // 無 lazyGames（例如同仁 dev-kit 環境）
    t.equal(f.core.ensure(), false, "沒有延遲載入器時 ensure() 應安靜回 false");
    t.equal(f.core.result(), null, "沒有延遲載入器時仍不得編造結果");
  }
});

selftest.register({
  id: "platform/live-table-consumers", group: "platform", env: "node", tier: "fast",
  title: "跟注的勝負決定不得出現 Math.random，且兩個真扣真派消費端都要走同一出口（#92 反向鎖）",
  run: function (t) {
    var CONSUMERS = [                                    // 樣本量下限＝2；少一個就是漏修或被搬走
      { f: "src/views/liveroom.js", why: "整頁直播間跟注" },
      { f: "src/layout/streamer.js", why: "子母畫面(PiP)跟注" }
    ];
    t.ok(CONSUMERS.length >= 2, "真扣真派的跟注消費端樣本量下限為 2（liveroom + streamer）");

    var fakeChat = 0;
    CONSUMERS.forEach(function (c) {
      var raw = fs.readFileSync(path.join(ROOT, c.f), "utf8");
      var code = stripComments(raw);

      // (a) 必須走單一出口取真桌結果
      t.ok(/HL\.liveTable\.result\s*\(/.test(code), c.f + "（" + c.why + "）未走 HL.liveTable.result()＝可能又自己接了一份真桌來源");
      // ⚠️ 這條守的是「入口先拉」這個最佳化（開獎前就位＝玩家看不到任何退回局）。
      //    正確性本身由 result() 的自癒負責，故拿掉這句只會讓第一局退回、不會永遠退回。
      t.ok(/HL\.liveTable\.ensure\s*\(/.test(code), c.f + " 入口未呼叫 HL.liveTable.ensure()＝真桌自 #80 起是延遲載入，不先拉會白白多一局退回");
      // (b) 不得再自己碰 HL.baccarat（繞過出口＝#92 的後備分支會以另一種形式長回來）
      t.equal(/HL\.baccarat/.test(code), false, c.f + " 仍直接引用 HL.baccarat（應一律走 HL.liveTable）");

      // (c) 決定勝負的那幾行不得出現 Math.random
      code.split("\n").forEach(function (line, i) {
        if (!/\bwinner\b/.test(line)) return;
        t.equal(/Math\.random/.test(line), false,
          c.f + ":" + (i + 1) + " 用 Math.random 決定 winner（該路徑真扣真派，玩家輸贏必須可驗算）");
      });

      // (d) 反向鎖的「不空心」證明：假聊天/假活動的 Math.random 本來就該留著
      //     （若某天全檔零 Math.random，代表有人為了讓本鎖變綠而把假活動也一起改掉＝#92 卡上明列的禁區，
      //      那會吃掉 HL.fair 的 nonce 序列，使 betlog 的 nonce_end 對不回該局）
      fakeChat += (code.match(/Math\.random/g) || []).length;
    });
    t.ok(fakeChat >= 1,
      "兩個消費端加起來連一處假活動用的 Math.random 都沒有＝本反向鎖恐已空心（或假聊天被誤改走 fair）");

    // (e) 出口本身要真的掛在 index.html（否則瀏覽器端 HL.liveTable 不存在 → 兩個消費端當場拋錯）
    t.ok(/src\/core\/live-table\.js/.test(indexHtml()), "index.html 未掛載 core/live-table.js");
  }
});

/* ===================== #72 說明中心 HL.support（合併 #95） ===================== */

selftest.register({
  id: "platform/support-registry", group: "platform", env: "node", tier: "fast",
  title: "說明條目登記表：註冊即出現、when() 為 false 兩處都不出現、空登記表不炸、describe() 不洩漏可寫參考",
  run: function (t) {
    var S = require(path.join(ROOT, "src", "core", "support.js"));

    // (d) 未註冊任何條目時只是空清單，不得整頁壞掉（同 #90 不變量 c）
    S._reset();
    t.equal(S.list().length, 0, "空登記表的 list() 應為空陣列");
    t.equal(S.cats().length, 0, "空登記表不得憑空生出分群（空群不佔位）");
    t.equal(S.search("提款").length, 0, "空登記表搜尋應為空");

    // (a) 註冊即出現——加一條說明不必改面板 render
    S.register({ id: "x/a", cat: "payment", title: "提款要多久", body: "三天", keys: ["withdraw"] });
    t.equal(S.list().length, 1, "註冊一筆後 list() 應有 1 筆");
    t.equal(S.list("payment")[0].title, "提款要多久", "應可依分群取出");
    t.equal(S.search("withdraw").length, 1, "keys 應可被搜尋命中（英文/簡體別名）");
    t.equal(S.search("三天").length, 1, "body 內文應可被搜尋命中");
    t.equal(S.search("不存在的詞").length, 0, "不相關查詢不得命中");

    // body 為函式＝每次求值（讀活值，不快取、不手抄）
    var n = 0;
    S.register({ id: "x/live", cat: "rules", title: "活值", body: function () { n++; return "v" + n; } });
    var first = S.list().filter(function (e) { return e.id === "x/live"; })[0].body;
    var second = S.list().filter(function (e) { return e.id === "x/live"; })[0].body;
    t.equal(first !== second, true, "body 為函式時必須每次重新求值（否則說明會凍結在載入當下的舊數字）");

    // body 求值丟例外時只讓該條為空，不得讓整份清單壞掉
    S.register({ id: "x/boom", cat: "rules", title: "會爆的", body: function () { throw new Error("boom"); } });
    t.equal(S.list().filter(function (e) { return e.id === "x/boom"; })[0].body, "",
      "body 丟例外時應退為空字串（一條說明壞掉不該炸掉整個面板）");

    // (b) when() 為 false ⇒ **面板與搜尋兩處都不出現**（只藏其一等於沒藏）
    var on = false;
    S.register({ id: "x/cond", cat: "account", title: "只在 Demo 顯示", body: "demo only",
                 when: function () { return on; }, keys: ["demoonly"] });
    t.equal(S.list().filter(function (e) { return e.id === "x/cond"; }).length, 0, "when()=false 的條目不得出現在清單");
    t.equal(S.search("demoonly").length, 0, "when()=false 的條目不得被搜尋搜到（只藏其一等於沒藏）");
    t.equal(S.cats().filter(function (c) { return c.key === "account"; }).length, 0,
      "分群內全部條目都被 when() 藏住時，該分群不得出現（空群不佔位）");
    on = true;
    t.equal(S.list().filter(function (e) { return e.id === "x/cond"; }).length, 1, "when()=true 後應出現在清單");
    t.equal(S.search("demoonly").length, 1, "when()=true 後應可被搜尋到");

    // when() 丟例外＝保守視為不顯示
    S.register({ id: "x/badwhen", cat: "rules", title: "壞述詞", body: "x", when: function () { throw new Error("nope"); } });
    t.equal(S.list().filter(function (e) { return e.id === "x/badwhen"; }).length, 0,
      "when() 丟例外時應保守隱藏（寧可少顯示，不要顯示不該顯示的）");

    // 缺 id/title 者忽略而非當機；同 id 覆蓋而非重複
    S.register({ cat: "rules", title: "沒有 id" });
    S.register({ id: "x/a", cat: "payment", title: "提款要多久", body: "改成五天" });
    t.equal(S.list().filter(function (e) { return e.id === "x/a"; }).length, 1, "同 id 應覆蓋而非長出第二筆");
    t.equal(S.list().filter(function (e) { return e.id === "x/a"; })[0].body, "改成五天", "同 id 覆蓋應取最新內容");

    // 未知 cat 併入「其他」而非消失（否則註冊者打錯字＝說明人間蒸發）
    S.register({ id: "x/unknown", cat: "沒這個分類", title: "落單的", body: "y" });
    t.equal(S.list().filter(function (e) { return e.id === "x/unknown"; })[0].cat, "other",
      "未知 cat 應併入 other（不得靜默消失）");

    // describe() 為純值副本：改它不得改到登錄表（同 #90 不變量 a）
    var d = S.describe();
    d.forEach(function (r) { r.title = "TAMPERED"; r.order = -999; });
    t.equal(S.list().filter(function (e) { return e.id === "x/unknown"; })[0].title, "落單的",
      "describe() 回傳值被竄改後不得影響登錄表（必須是純值副本）");

    S._reset();
  }
});

selftest.register({
  id: "platform/support-owners", group: "platform", env: "node", tier: "fast",
  title: "說明由擁有規則的模組自己註冊，且不得手抄數字（#72 反向鎖 · 樣本量下限 5）",
  run: function (t) {
    // 「誰擁有規則誰負責解釋」＝這五個模組各自 register 自己那條說明。
    // 樣本量下限 5：少一個就是有人把說明搬回面板行內硬寫（＝第二份真相，必然漂移）。
    var OWNERS = [
      { f: "src/core/fair.js", why: "可驗證公平" },
      { f: "src/core/edge.js", why: "逐遊戲莊家優勢" },
      { f: "src/core/service-level.js", why: "提領時效與分階額度" },
      { f: "src/core/responsible.js", why: "負責任博弈工具" },
      { f: "src/core/progress.js", why: "紅利流水規則" },
      // #106（2026-08-18 平台軌 20:00 窗）：三個後補的擁有者。game-axes 這一筆同時是**下面那條載入序
      //   斷言的主要看守對象**——它原本排在 support.js 之前，於是它想註冊也註冊不到（＝#66/#101
      //   「排在註冊表之前就整組靜默不註冊」那個坑的第三次；本輪把 support.js 上移到 dom.js 之後根治）。
      { f: "src/core/challenges.js", why: "限量挑戰先搶先贏" },
      { f: "src/core/referral.js", why: "推薦分階釋放與真站不供獎" },
      { f: "src/core/game-axes.js", why: "大廳體感分群軸怎麼分" }
    ];
    t.ok(OWNERS.length >= 8, "註冊者樣本量下限為 8（#106 後）");

    OWNERS.forEach(function (o) {
      var code = stripComments(fs.readFileSync(path.join(ROOT, o.f), "utf8"));
      t.ok(/HL\.support\.register\s*\(/.test(code),
        o.f + "（" + o.why + "）未自行註冊說明條目＝規則的擁有者沒有負責解釋它");
      // 軟依賴守衛：support.js 若未載入，這些模組必須安靜略過而不是拋錯。
      // ⚠️ 守衛必須是**規範形狀** `if (HL.support && HL.support.register) {`——不可只檢查
      //    「出現過 HL.support && HL.support.register」，否則 `if (false && HL.support && …)`
      //    這種把註冊整段停用的改動會照樣通過（＝本專案反覆遇到的『出口 vs 提及』：
      //    文字還在不代表那段真的會跑）。負向擾動 ④ 即為此而設。
      t.ok(/if\s*\(\s*HL\.support\s*&&\s*HL\.support\.register\s*\)\s*\{/.test(code),
        o.f + " 的 HL.support 註冊守衛不是規範形狀 if (HL.support && HL.support.register) {"
            + "（缺守衛＝載入序一變整檔拋錯；被額外條件短路＝註冊被靜默停用）");
    });

    // 出口本身要真的掛在 index.html，且必須早於所有註冊者（否則軟依賴會靜默略過＝容器做好卻沒人上架）
    var html = indexHtml();
    t.ok(/src\/core\/support\.js/.test(html), "index.html 未掛載 core/support.js");
    var iSupport = html.indexOf("src/core/support.js");
    OWNERS.forEach(function (o) {
      var iOwner = html.indexOf(o.f.replace(/^src\//, "src/"));
      if (iOwner < 0) return;                       // 延遲載入的檔不在 index.html，跳過
      t.ok(iSupport < iOwner, "core/support.js 必須早於 " + o.f + " 載入，否則該模組的說明不會上架");
    });
  }
});

selftest.register({
  id: "platform/support-entry", group: "platform", env: "node", tier: "fast",
  title: "說明中心必須有入口，且不得新增第 N 顆常駐導覽鈕（#95 設計原則 · 側欄「更多」死巷改為真入口）",
  run: function (t) {
    var shell = stripComments(fs.readFileSync(path.join(ROOT, "src", "layout", "app-shell.js"), "utf8"));

    // (a) 入口存在：側欄「更多」原為 ui.comingSoon 死巷，現指向說明中心
    t.ok(/HL\.support\.open\s*\(/.test(shell), "app-shell 沒有任何開啟說明中心的入口＝容器做好卻碰不到（本卡要治的正是這個病）");
    t.equal(/soon:\s*"更多"/.test(shell), false, "側欄「更多」仍是 ui.comingSoon 死巷（未改為真入口）");

    // (b) 不得新增第 N 顆常駐導覽鈕：SIDE 維持 5 筆（#95 明列「不新增第 N 顆常駐底部列按鈕」）
    var m = shell.match(/var SIDE = \[([\s\S]*?)\n  \];/);
    t.ok(!!m, "找不到 SIDE 主導覽陣列（結構被改動時本鎖需同步更新）");
    var items = (m[1].match(/\{\s*ic:/g) || []).length;
    t.equal(items, 5, "主導覽 SIDE 應維持 5 筆＝本卡沒有新增任何一顆常駐導覽鈕（實得 " + items + "）");

    // (c) 側欄與抽屜必須仍讀同一份 SIDE（不得為了加入口而長出第二份主導覽清單＝#93 不變量 c）
    var uses = (shell.match(/SIDE\.(map|forEach)\s*\(/g) || []).length;
    t.ok(uses >= 2, "側欄與抽屜應都遍歷同一份 SIDE（實得 " + uses + " 處）");

    // (d) 兩個表面都要處理 it.open，否則會出現「桌機點得開、手機點了說建構中」的分歧。
    // ⚠️ 這裡**不能**用全檔數 `it.open()` 的筆數：福利中心 hub（另一個同名區域變數 it）也有一處
    //    `it.open()`，全檔計數會得 3、於是抽屜漏掉時仍有 2 而「測項照樣綠」＝典型 naive 口徑陷阱。
    //    正確做法＝逐表面各自檢查自己的 render 區塊。
    [{ k: "SIDE.map(", s: "桌機側欄" }, { k: "SIDE.forEach(", s: "手機抽屜" }].forEach(function (surf) {
      var at = shell.indexOf(surf.k);
      t.ok(at > -1, "找不到 " + surf.s + " 遍歷 SIDE 的區塊（結構被改動時本鎖需同步更新）");
      var region = shell.slice(at, at + 700);
      t.ok(/it\.open\s*\(\s*\)/.test(region),
        surf.s + " 未處理 SIDE 的 open 分支＝同一顆導覽鈕在兩個表面行為不一致（一邊開得了、一邊說建構中）");
    });
  }
});

selftest.register({
  id: "platform/support-title-i18n", group: "platform", env: "node", tier: "fast",
  title: "每條說明條目：標題須有 whole-key i18n（EN+zh-Hans）且 body 必須是函式（#106 · 把 P3 紀律機械化）",
  run: function (t) {
    /* 為什麼要這條鎖（兩件事都是 #106 落地當輪的實證，不是預防性猜測）：
     *  (a) **標題兩語**——條目標題是 `el("h4",{text:e.title})` 的整個文字節點，也是 support 面板裡
     *      唯一翻得到的部分（body 是「中文＋當下數值」串接，依 P3 契約永遠翻不到）。而 #71 的
     *      「紅利有效期限」08-17 落地時**兩語皆漏**、四輪無人察覺——漏翻不會報錯，只會在切語言時
     *      靜靜露出中文。⇒ 把「落地時同步補」從紀律升級為機械閘。
     *  (b) **body 必須是函式**——字串 body 在結構上不可能讀活值，只能手抄；手抄＝第二份真相，
     *      來源表一改說明就開始說謊（#72 卡明訂的核心契約，此前只靠人自律）。 */
    var files = [], I18N = path.join(ROOT, "src", "i18n");
    (function walk(d) {
      fs.readdirSync(d).forEach(function (f) {
        var q = path.join(d, f);
        if (fs.statSync(q).isDirectory()) { if (q !== I18N) walk(q); }
        else if (/[.]js$/.test(f)) files.push(q);
      });
    })(path.join(ROOT, "src"));
    var packs = i18nPacksSrc();
    t.ok(packs.length > 0, "找不到任何語言包（src/i18n/*.js）⇒ 本鎖會空掃而假綠");

    var found = 0;
    files.forEach(function (q) {
      var src = fs.readFileSync(q, "utf8"), i = 0, rel = path.relative(ROOT, q);
      while ((i = src.indexOf("HL.support.register(", i)) >= 0) {
        var seg = src.slice(i, i + 1500);
        var mt = /title:\s*"([^"]*)"/.exec(seg);
        var mb = /body:\s*(function|")/.exec(seg);
        if (mt) {
          found++;
          var key = mt[1];
          var occ = packs.split(String.fromCharCode(34) + key + String.fromCharCode(34) + ":").length - 1;
          t.ok(occ >= 2, rel + " 的說明標題「" + key + "」缺 whole-key i18n（EN+zh-Hans 各需一條，實得 "
                       + occ + "）⇒ 切語言時該條目會露出未翻中文");
          t.equal(mb && mb[1], "function", rel + " 的說明條目「" + key
                       + "」body 不是函式＝數字只能手抄（第二份真相，來源表一改說明就開始說謊）");
        }
        i += 20;
      }
    });
    // 樣本量下限：少於 10 就是掃描器沒抓到既有註冊者（有人改了註冊寫法而本鎖沒跟上＝假綠）
    t.ok(found >= 10, "掃到的說明條目僅 " + found + " 條（下限 10）⇒ 掃描器與實際註冊寫法脫節");
  }
});

selftest.register({
  id: "platform/support-concierge-zero-regression", group: "platform", env: "node", tier: "fast",
  title: "AI Luna 既有罐頭答案逐字零回歸（說明中心只在 KB 未命中時才接手）",
  run: function (t) {
    var code = stripComments(fs.readFileSync(path.join(ROOT, "src", "layout", "ai-concierge.js"), "utf8"));

    // KB 命中優先於 HL.support：原有答案必須逐字不變（本卡是加法，不是改寫既有問答）
    // ⚠️ 比對必須限縮在 answer() 的**函式本體**內：`function fromSupport(q)` 這行宣告本身
    //    也含 "fromSupport(q)"，且宣告在 answer() 之前 ⇒ 全檔比對會把宣告當成呼叫而誤判順序。
    var body = code.slice(code.indexOf("function answer(q)"));
    var iKb = body.indexOf("KB[i].a");
    var iSup = body.indexOf("fromSupport(");
    t.ok(iKb > -1 && iSup > -1, "ai-concierge 的 answer() 應同時保有 KB 與 HL.support 兩條路徑");
    t.ok(iKb < iSup, "KB 命中必須早於 HL.support 查詢＝既有罐頭答案零回歸（順序反了就是改寫既有行為）");

    // 反向鎖：說明中心的規則文案不得被複製回罐頭 KB（那就是第二份真相，正是本卡要根治的漂移）
    t.equal(/流水倍數為/.test(code), false, "紅利流水規則被手抄進 ai-concierge KB＝製造第二份真相（應改為註冊進 HL.support）");
    t.equal(/莊家優勢/.test(code), false, "莊家優勢說明被手抄進 ai-concierge KB＝製造第二份真相");

    // 軟依賴：HL.support 不存在時必須安靜退回原本行為
    t.ok(/if\s*\(\s*!HL\.support/.test(code), "fromSupport 缺少 HL.support 不存在時的軟依賴守衛");
  }
});

/* ===================== #90 經濟旋鈕自我描述層：反向覆蓋鎖 =====================
 * 不列白名單檔名，而是**宣告一條性質**：凡 `src/core/*.js` 出現「站別分歧的經濟常數」
 *   （`{ demo: <值>, live: <值> }` 表，或 `isLive() ? [...] : [...]` 的載入期三元式），
 *   該檔就必須向 `HL.econCfg` 註冊自我描述 ⇒ **擋得住下一張還沒被寫出來的經濟表**
 *   （同 #86 `platform/rg-bet-gate-coverage` 的行為型反向鎖形制，而非檔名清單）。
 * 樣本量下限 8＝自我保護：防有人把規則改窄到抓不到東西而假綠（#72 那次「鎖是空的」的教訓）。
 * ⚠️ 本檔（econ-config.js）自己是**登記表本體**、不是旋鈕表 ⇒ 明確排除。
 */
selftest.register({
  id: "platform/econ-cfg-coverage", group: "platform", tier: "fast",
  title: "#90 經濟旋鈕：站別分歧的經濟表都必須註冊自我描述（反向覆蓋鎖）",
  run: function (t) {
    var coreDir = path.join(ROOT, "src", "core");
    var files = fs.readdirSync(coreDir).filter(function (f) { return /\.js$/.test(f); });
    var SELF = "econ-config.js";
    // 站別分歧常數的兩種寫法（去註解後掃，避免把說明文字算成命中）
    var TABLE_FORM = /\{\s*demo\s*:\s*[-\[0-9]/;
    // ⚠️ `[\s)]*` 不可省：真實寫法是 `(HL.site && HL.site.isLive()) ? [...]`，
    //    `isLive()` 與 `?` 之間隔著 `&&` 群組的右括號。首版漏了它 ⇒ 這條鎖對**它要禁的那個形制本身**
    //    完全無效（負向擾動②當場抓到）。只驗綠燈看不出鎖是空的。
    var TERNARY_FORM = /isLive\s*\(\s*\)[\s)]*\?\s*\[/;
    /* #97 第三形制：**純量型**站別旋鈕 `<站別檢查> ? NUM : NUM`。
     *   ⚠️ 站別檢查必須含**本地別名**：`faucet.js`／`jackpot.js` 寫的是 `liveOn()`，只掃 `isLive()`
     *      會整個漏掉（探針實測：只掃 isLive 抓不到 faucet 那筆 300/1000）。同 08-15「擾動要用真實
     *      世界會出現的形狀」的教訓——別名是真實寫法，不是假想。
     *   ⚠️ **兩臂都必須是數字字面量**才算旋鈕。這條限制不是為了好看，是**鑑別力**：`raffle.js` 寫
     *      `botTickets: isLive() ? 0 : rint(6000, 18000)` ＝假券氛圍量、不是可調旋鈕；單看「一臂是數字」
     *      的 naive 版會把它算進來（探針實測 naive 4 檔 vs 精確 2 檔）⇒ 下面有一條專門盯住這件事的測項。 */
    var SITE_CHK = "(?:isLive|liveOn)\\s*\\(\\s*\\)";
    var NUM_LIT = "-?[0-9]+(?:\\.[0-9]+)?";
    var SCALAR_TERNARY_FORM = new RegExp(SITE_CHK + "[\\s)]*\\?\\s*" + NUM_LIT + "\\s*:\\s*" + NUM_LIT);
    var found = [], missing = [];
    files.forEach(function (f) {
      if (f === SELF) return;
      var code = stripComments(fs.readFileSync(path.join(coreDir, f), "utf8"));
      if (!TABLE_FORM.test(code) && !TERNARY_FORM.test(code)) return;
      found.push(f);
      if (!/econCfg\s*\.\s*register\s*\(/.test(code)) missing.push(f);
    });
    t.ok(found.length >= 7,
      "偵測到的站別分歧經濟表僅 " + found.length + " 個（下限 7）：規則被改窄到抓不到東西＝這條鎖已空心");
    t.equal(missing.join(","), "",
      "下列 core 檔有站別分歧的經濟常數卻未註冊自我描述（儀表板將看不到它的旋鈕）：" + missing.join(", "));

    /* 採用度下限（與上面那條互補）：偵測規則只抓得到「用 {demo,live} 表或三元式」的檔，
     * 但站別分歧也可以是**函式式**的（`edge.js` 走 `scaleFor(mode)` 就沒有這種字面量表）
     * ⇒ 那類表是自願註冊的，只能用「總註冊檔數」盯住，防某輪重構把它們一併拆掉。 */
    var registrants = files.filter(function (f) {
      if (f === SELF) return false;
      return /econCfg\s*\.\s*register\s*\(/.test(stripComments(fs.readFileSync(path.join(coreDir, f), "utf8")));
    });
    t.ok(registrants.length >= 11,
      "已註冊自我描述的經濟表僅 " + registrants.length + " 個（下限 11：rakeback/cashback/rakeboost/edge/" +
      "progress-src/sla/safetynet/grace ＋ #97 新增 faucet/vip-upgrade(progress)/jackpot）");

    // 載入期三元式是「不可描述」的形制：只看得到自己站別那一排 ⇒ 經濟表不得再用它
    //   （#90 已把 cashback.js 由此形制改為兩站別並存的表；#97 再把 faucet/progress 的**純量版**
    //    一併收掉；這條鎖防兩者回退）
    var ternary = [];
    files.forEach(function (f) {
      if (f === SELF) return;
      var code = stripComments(fs.readFileSync(path.join(coreDir, f), "utf8"));
      if (TERNARY_FORM.test(code) || SCALAR_TERNARY_FORM.test(code)) ternary.push(f);
    });
    t.equal(ternary.join(","), "",
      "經濟表不得用載入期站別三元式宣告值（陣列型 `isLive() ? [..] : [..]` 或純量型 `liveOn() ? 300 : 1000`；" +
      "執行期只看得到一站、無法被描述）：" + ternary.join(", "));

    /* ⭐ 鎖自身的鑑別力（#72／#90 那兩次「鎖是空的」的教訓：只驗綠燈看不出規則有沒有在做事）。
     *   兩件事都要證：① 純量規則抓得到它該抓的形制；② 它**不會**把氛圍量誤當旋鈕。 */
    t.ok(SCALAR_TERNARY_FORM.test("var RELIEF = liveOn() ? 300 : 1000;"),
      "純量規則抓不到 `liveOn() ? 300 : 1000`＝這條規則是空的（本卡的起點就是它漏掉這個形制）");
    t.ok(SCALAR_TERNARY_FORM.test("var M = (HL.site && HL.site.isLive()) ? 8 : 1;"),
      "純量規則抓不到帶 `&&` 群組右括號的真實寫法＝同 #90 首版那個空心鎖");
    t.equal(SCALAR_TERNARY_FORM.test("botTickets: (HL.site && HL.site.isLive()) ? 0 : rint(6000, 18000)"), false,
      "純量規則把「站別行為閘／氛圍量」誤判為經濟旋鈕（raffle.js 的假券數就是這形狀）＝規則過寬、會逼出假的 register");

    // 出口必須真的掛在 index.html，且**早於**所有旋鈕表（否則註冊時 HL.econCfg 還不存在＝靜默漏註冊）
    var html = indexHtml();
    var iSelf = html.indexOf("core/econ-config.js");
    t.ok(iSelf > -1, "econ-config.js 未掛載於 index.html（所有 register 會靜默失效）");
    found.forEach(function (f) {
      var i = html.indexOf("core/" + f);
      if (i > -1) t.ok(iSelf < i, "econ-config.js 必須早於 core/" + f + " 掛載，否則該表的 register 會靜默漏掉");
    });
  }
});

/* #97：儀表板的風險文案不得再手抄經濟數字（它們正是 describe() 已能當場求值的東西）。 */
selftest.register({
  id: "platform/ops-risks-no-hardcoded-numbers", group: "platform", tier: "fast",
  title: "#97 儀表板風險文案：由 HL.econCfg 當場求值，不得手抄百分比/金額（反向鎖）",
  run: function (t) {
    var src = fs.readFileSync(path.join(ROOT, "src", "views", "ops-dashboard.js"), "utf8");
    // 只取 STATIC_RISKS 的定義區塊（去註解後），避免把上下文的其他數字算進來
    var body = stripComments(src);
    var i = body.indexOf("var STATIC_RISKS");
    t.ok(i > -1, "找不到 STATIC_RISKS（本鎖失去對象＝鎖已空心）");
    var seg = body.slice(i, body.indexOf("function riskLines", i));
    t.ok(seg.length > 200, "STATIC_RISKS 區塊取樣過短（切法壞掉＝鎖已空心）");

    // (b) 反向鎖：區塊內不得再出現百分比/倍數/金額字面量
    var bad = seg.match(/[0-9]+(?:\.[0-9]+)?\s*(?:%|×|x\b)|\b[0-9]{3,}\b/g) || [];
    t.equal(bad.join(","), "",
      "STATIC_RISKS 內仍有手抄的數字字面量（應改讀 HL.econCfg 當場求值）：" + bad.join(", "));

    // 樣本量下限 5：防有人把整段改成不帶任何取值的空文案而假綠
    var calls = seg.match(/knobSpan\s*\(/g) || [];
    t.ok(calls.length >= 5,
      "風險文案只做了 " + calls.length + " 次 knobSpan 取值（下限 5＝原本手抄的 5 組數字）：規則被繞過");

    // (c) 軟依賴：取值一律經 knobRow/knobSpan，兩者都有 try/catch 與 null 退路
    t.ok(/function knobRow[\s\S]{0,400}try\s*\{/.test(body), "knobRow 未包 try（HL.econCfg 缺席時會炸掉整個風險區塊）");
    t.ok(/function riskLines[\s\S]{0,300}try\s*\{[\s\S]{0,120}catch/.test(body),
      "riskLines 未逐條 try/catch（單條拋錯會讓整個風險區塊消失＝不變量 c 破功）");
    t.ok(/HL\.ui\.rules\(riskLines\(\)\)/.test(body), "風險區塊未改用 riskLines() 求值出口（仍在渲染未求值的函式陣列）");
  }
});

/* #90 附帶收斂：舊制返水率只能有一份真相（progress.js 曾自帶逐位相同的第二份字面量）。 */
selftest.register({
  id: "platform/rakeback-legacy-single-truth", group: "platform", tier: "fast",
  title: "#90 舊制返水率單一真相：progress.js 不得自帶第二份字面量，須取自 rakeback-core",
  run: function (t) {
    var prog = stripComments(fs.readFileSync(path.join(ROOT, "src", "core", "progress.js"), "utf8"));
    var core = require(path.join(ROOT, "src", "core", "rakeback-core.js"));
    t.ok(/rakebackCore[\s\S]{0,120}LEGACY_RATES/.test(prog),
      "progress.js 未從 HL.rakebackCore.LEGACY_RATES 取舊制返水率（第二份真相會再長回來）");
    // 反向鎖：不得再出現「一整排小數費率」的字面量（就是被收斂掉的那種寫法）
    t.equal(/\[\s*0\.0\d+\s*,\s*0\.0\d+\s*,\s*0\.0\d+/.test(prog), false,
      "progress.js 出現整排費率字面量＝第二份真相復辟（舊制返水率請一律取自 core/rakeback-core.js）");
    // 單一真相本身仍須維持兩站別、同長、真站不寬鬆（rakeback-core 自己的測項只驗新制 EDGE_PCT）
    var d = core.LEGACY_RATES.demo, l = core.LEGACY_RATES.live;
    t.equal(d.length, l.length, "LEGACY_RATES 兩站別長度須一致");
    for (var i = 0; i < d.length; i++) t.ok(l[i] <= d[i], "舊制返水率真站第 " + (i + 1) + " 段不得高於假站");
  }
});

/* 儀表板必須真的**遍歷**登記表，而不是硬列 N 張表（本卡的重點是容器，不是那五/八張表）。 */
selftest.register({
  id: "platform/econ-cfg-dashboard", group: "platform", tier: "fast",
  title: "#90 經濟旋鈕：儀表板遍歷已註冊者 + 健檢由描述子推導",
  run: function (t) {
    var code = stripComments(fs.readFileSync(path.join(ROOT, "src", "views", "ops-dashboard.js"), "utf8"));
    t.ok(/HL\.econCfg\s*&&\s*HL\.econCfg\.all/.test(code) || /HL\.econCfg\.all\s*\(/.test(code),
      "儀表板未透過 HL.econCfg.all() 取得旋鈕快照");
    t.ok(/HL\.econCfg\.audit\s*\(/.test(code), "儀表板未把 econCfg.audit() 推導出的健檢併入警示");
    /* 反向鎖：**旋鈕面板**不得硬列表 id（那就退回「硬列 N 張」，第 N+1 張表加了也不會出現）。
     * ⚠️ #97 把範圍由「整檔」收斂為「面板區塊」，並補上一條正向要求——理由不是為了讓新碼過關，
     *   而是本檔現在有**兩種都正當、但需求相反**的消費者：
     *     ① `knobSection()`＝面板，必須 **id 無關**地遍歷（第 N+1 張表自動出現，這才是 #90 的不變量）；
     *     ② `STATIC_RISKS`＝風險敘述，**本質上就是逐條指名**（「返水率是多少」這句話必然指名 rakeback）。
     *   整檔黑名單分不出這兩者，只會逼敘述層改回手抄數字——那正是 #97 要根除的東西。
     *   收斂後仍不鬆手：面板區塊零 id，且**全檔任何 id 字面量都必須是 `knobSpan(` 的引數**，
     *   不得以裸清單形式出現 ⇒ 「硬列 N 張表」這個真正的退化路徑依然被擋住。 */
    var IDS = ["\"edge\"", "\"rakeback\"", "\"sla\"", "\"safetynet\"", "\"cashback\"", "\"jackpot\"", "\"faucet\"", "\"vip-upgrade\""];
    var iPanel = code.indexOf("function knobSection");
    var panel = iPanel > -1 ? code.slice(iPanel, code.indexOf("function snapLocal", iPanel)) : "";
    t.ok(panel.length > 200, "取不到 knobSection 區塊（切法壞掉＝這條鎖已空心）");
    var hard = IDS.filter(function (s) { return panel.indexOf(s) > -1; });
    t.equal(hard.join(","), "", "旋鈕面板硬寫了表 id（應遍歷 all()）：" + hard.join(", "));
    // 正向要求：面板真的在遍歷快照的列，而不是取用某幾張表
    t.ok(/tables\s*\.\s*forEach|for\s*\([^)]*tables\.length/.test(panel) && /\.rows/.test(panel),
      "旋鈕面板未遍歷 all() 回傳的表與其 rows（#90 的核心不變量）");
    // 全檔：id 字面量只能出現在 knobSpan( 的引數位置（擋掉「裸列 N 張表」的退化）
    var bareIds = IDS.filter(function (s) {
      if (code.indexOf(s) === -1) return false;
      return !new RegExp("knobSpan\\s*\\(\\s*" + s.replace(/"/g, '"')).test(code);
    });
    t.equal(bareIds.join(","), "",
      "旋鈕表 id 出現在 knobSpan() 引數以外的位置（疑似退回硬列表）：" + bareIds.join(", "));
    // 不變量 c：未載入任一表時只是少一區、不得整頁壞掉 ⇒ 必須有零表的空態分支與 try 保護
    t.ok(/tables\.length/.test(code) && /catch/.test(code), "缺少「零註冊表」空態分支或 try 保護（不變量 c）");
    // 唯讀：儀表板不得對旋鈕做寫入型呼叫
    t.equal(/econCfg\.(set|update|write|apply)/.test(code), false, "儀表板出現寫入型旋鈕呼叫（本層刻意唯讀）");
  }
});

// ── #94 大廳分群軸（容器 core/game-axes.js + 內容 data/game-traits.js）───────────
var AXES_SRC = path.join(ROOT, "src", "core", "game-axes.js");
var TRAITS_SRC = path.join(ROOT, "src", "data", "game-traits.js");
var CASINO_SRC = path.join(ROOT, "src", "views", "casino.js");

// 以 new Function 載入「真的那兩份檔」並注入假 window（每次乾淨實例，不污染 node 的 globalThis，
// 也不倚賴 module.exports＝驗的就是瀏覽器跑的同一份程式碼；比照 #92 loadLiveTable）
function loadAxes(withTraits) {
  var win = { HL: {} };
  new Function("window", fs.readFileSync(AXES_SRC, "utf8"))(win);
  if (withTraits !== false) new Function("window", fs.readFileSync(TRAITS_SRC, "utf8"))(win);
  return win.HL;
}

// 大廳實際會拿到的 24 款可玩遊戲（22 延遲 + mock-data 的 2 筆 seed），id 算法同 games.js 的 slug()
function playableGames() {
  var out = [];
  (lazy && lazy.manifest ? lazy.manifest : []).forEach(function (e) {
    (e.games || []).forEach(function (g) { out.push({ id: g.id, title: g.title }); });
  });
  var mock = fs.readFileSync(path.join(ROOT, "src", "data", "mock-data.js"), "utf8");
  var re = /\{[^{}]*playable:\s*true[^{}]*\}/g, m;
  while ((m = re.exec(mock))) {
    var ti = /title:\s*"([^"]+)"/.exec(m[0]);
    if (!ti) continue;
    out.push({ id: String(ti[1]).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), title: ti[1] });
  }
  return out;
}

selftest.register({
  id: "platform/game-axes-container", group: "platform", env: "node", tier: "fast",
  title: "分群軸容器：缺值不進任何桶／空桶與單桶軸不渲染／軸 key 解析（#94 不變量 a·b）",
  run: function (t) {
    var HLa = loadAxes(false);                                  // 只載容器，零內容
    var ax = HLa.gameAxes;
    t.ok(!!ax, "core/game-axes.js 必須掛出 HL.gameAxes");
    t.equal(ax.all().length, 0, "容器本身不得內建任何一條軸（容器先於內容）");
    t.equal(ax.tabs([{ id: "x" }]).length, 0, "沒有註冊任何軸時不得長出頁籤");

    ax.register({ key: "demo", label: "示範", field: "dm", buckets: [{ key: "a", label: "A" }, { key: "b", label: "B" }] });
    t.equal(ax.register({ key: "demo", label: "重複", field: "dm", buckets: [{ key: "a" }] }), false, "同 key 重複註冊必須被拒（否則兩份定義並存）");

    var G = [{ id: "g1", dm: "a" }, { id: "g2", dm: "b" }, { id: "g3" }, { id: "g4", dm: "" }, { id: "g5", dm: null }];
    // 不變量 (a)：缺值遊戲不得出現在任何分群軸結果中
    ["a", "b"].forEach(function (b) {
      ["g3", "g4", "g5"].forEach(function (id) {
        var g = G.filter(function (x) { return x.id === id; })[0];
        t.equal(ax.match(g, ax.keyOf("demo", b)), false, id + " 缺值卻進了 demo:" + b + " 桶（不變量 a）");
      });
    });
    t.equal(ax.match(G[0], ax.keyOf("demo", "a")), true, "有值的遊戲應進對應桶");
    t.equal(ax.match(G[0], ax.keyOf("demo", "b")), false, "有值的遊戲不得進別的桶");
    t.equal(ax.match(G[0], "hot"), null, "非軸 key 必須回 null（讓 casino.js 既有分支照原樣處理）");
    t.equal(ax.match(G[0], ax.keyOf("nope", "a")), null, "未註冊的軸必須回 null 而非 false");

    // 空桶不渲染、單桶軸整條不渲染
    t.equal(ax.tabs(G).length, 2, "兩個桶都有內容時應有 2 個頁籤，實際：" + JSON.stringify(ax.tabs(G).map(function (x) { return x.k; })));
    var onlyA = [{ id: "g1", dm: "a" }, { id: "g2", dm: "a" }];
    t.equal(ax.tabs(onlyA).length, 0, "只剩一個非空桶時整條軸不得渲染（那不是分群，是『全部』的同義詞）");
    t.equal(ax.tabs([{ id: "g3" }]).length, 0, "全部缺值時整條軸不得渲染");

    // 三桶其中一桶為空 ⇒ 只出 2 個頁籤（空桶＝點進去空白牆的死巷）
    var HLb = loadAxes(false), ax2 = HLb.gameAxes;
    ax2.register({ key: "d3", field: "dm", label: "三桶", buckets: [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C" }] });
    var tabs3 = ax2.tabs([{ id: "1", dm: "a" }, { id: "2", dm: "b" }]);
    t.equal(tabs3.length, 2, "空桶必須不出現，實際頁籤：" + JSON.stringify(tabs3.map(function (x) { return x.k; })));
    t.equal(tabs3.map(function (x) { return x.bucket; }).join(","), "a,b", "非空桶的順序應依 order");

    // enabled:false 的軸完全不出現、也不 match
    var HLc = loadAxes(false), ax3 = HLc.gameAxes;
    ax3.register({ key: "off", field: "dm", enabled: false, buckets: [{ key: "a" }, { key: "b" }] });
    t.equal(ax3.tabs(G).length, 0, "enabled:false 的軸不得出現在頁籤列");
    t.equal(ax3.match(G[0], ax3.keyOf("off", "a")), null, "enabled:false 的軸不得參與 match");
  }
});

selftest.register({
  id: "platform/game-axes-pace-rubric", group: "platform", env: "node", tier: "fast",
  title: "節奏軸的值必須可機械複驗：stepwise ⟺ view 檔真的有局中兌現控制（#94 不變量 d 的可建版本）",
  run: function (t) {
    var HLa = loadAxes(), tr = HLa.gameTraits, ax = HLa.gameAxes;
    t.ok(!!tr, "data/game-traits.js 必須掛出 HL.gameTraits");
    // #102 後為 2 條（節奏 + 回報率）。這個數字**刻意寫死**：它是「有人加了軸卻沒補結果牆 i18n／沒補
    // 覆蓋率鎖」的提醒鈴，改它的人必須同時去看 game-axes-title-i18n 與 game-axes-rtp 兩條鎖。
    t.equal(ax.all().length, 2, "註冊軸數與預期不符（加/減軸時請同步更新本數字與 i18n·覆蓋率兩鎖），實際：" + ax.all().map(function (a) { return a.key; }).join(","));

    // (1) 側表的每一筆都必須對得上一款真的可玩遊戲（不得有幽靈 id ⇒ 值永遠不會被用到卻看起來有覆蓋）
    var real = {}, games = playableGames();
    games.forEach(function (g) { real[g.id] = true; });
    var ghosts = tr.ids().filter(function (id) { return !real[id]; });
    t.equal(ghosts.join(","), "", "側表有對不到任何登錄遊戲的 id：" + ghosts.join(", "));

    // (2) stepwise 的判準可複驗：該款 view 檔必須含「局中兌現」控制；instant 的必須沒有
    var VIEWS = path.join(ROOT, "src", "views");
    var srcById = {};
    fs.readdirSync(VIEWS).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
      var code = fs.readFileSync(path.join(VIEWS, f), "utf8");
      extractRegisters(code).forEach(function (meta) { if (meta && meta.id) srcById[meta.id] = code; });
    });
    srcById["shadow-ritual"] = fs.readFileSync(path.join(VIEWS, "slot.js"), "utf8");   // seed 遊戲：走 route 非 register
    srcById["chicken-cross"] = fs.readFileSync(path.join(VIEWS, "chicken.js"), "utf8");

    var hasCashout = function (code) { return /兌現|cash\s?out|cashout/i.test(code); };
    var checked = 0, stepwise = 0;
    tr.ids().forEach(function (id) {
      var code = srcById[id];
      if (!code) return;                       // 找不到原始碼者不強求（同仁自製遊戲走 games/ 目錄）
      checked++;
      var pace = tr.value(id, "pace");
      if (pace === "stepwise") {
        stepwise++;
        t.ok(hasCashout(code), id + " 標為 stepwise，但它的 view 檔沒有任何局中兌現控制（判準不成立）");
      } else if (pace === "instant") {
        t.equal(hasCashout(code), false, id + " 標為 instant，但它的 view 檔有局中兌現控制 ⇒ 應為 stepwise");
      }
    });
    t.ok(checked >= 20, "能對上原始碼的遊戲太少（樣本量下限 20），實際：" + checked);
    t.equal(stepwise, 7, "stepwise 款數與實測不符（新增/移除遊戲時請重跑判準），實際：" + stepwise);

    // (3) 覆蓋率：可玩遊戲不得有一半以上沒值（有值才有分群意義；缺值本身合法但不能是常態）
    var covered = games.filter(function (g) { return tr.value(g.id, "pace"); }).length;
    t.ok(covered >= games.length - 2, "節奏值覆蓋不足：" + covered + "/" + games.length);

    // (4) 真實資料下，節奏軸應渲染 2 個桶（pending 目前 0 款 ⇒ 空桶不出現，這是「空的不渲染」的實證）
    // ⚠️ #102 後 tabs() 是**多條軸的扁平串接**，這裡只該問節奏軸那幾個桶（原本沒 filter，
    //   加第二條軸的當下就會紅——那是「測項把『目前只有一條軸』當成不變量」的典型）。
    var tabs = ax.tabs(games.map(function (g) { return { id: g.id }; })).filter(function (x) { return x.axis === "pace"; });
    t.equal(tabs.length, 2, "真實 roster 下節奏軸應只出 2 個桶，實際：" + JSON.stringify(tabs.map(function (x) { return x.bucket; })));
    t.equal(tabs.map(function (x) { return x.bucket; }).join(","), "instant,stepwise", "桶順序不符 order");
  }
});

selftest.register({
  id: "platform/game-axes-no-second-rtp", group: "platform", env: "node", tier: "fast",
  title: "反向鎖：大廳層不得自己抄一份 RTP／casino.js 不得硬寫任何一條軸（#94 不變量 b·d）",
  run: function (t) {
    var traits = fs.readFileSync(TRAITS_SRC, "utf8");
    var axes = fs.readFileSync(AXES_SRC, "utf8");
    var casino = fs.readFileSync(CASINO_SRC, "utf8");
    var strip = function (s) { return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1"); };

    // (d) RTP 已有一份玩家看得到的真相＝各遊戲 view 的 gameInfoBar({rtp:...})；
    //     在大廳層再抄一次就是第二份真相，而且是「遊戲軌改了不會想到來改」的那一種。
    var owners = 0, VIEWS = path.join(ROOT, "src", "views");
    fs.readdirSync(VIEWS).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
      var c = fs.readFileSync(path.join(VIEWS, f), "utf8");
      var re = /gameInfoBar\(\{[^}]*\brtp\s*:/g;
      while (re.exec(c)) owners++;
    });
    t.ok(owners >= 8, "gameInfoBar 的 rtp 是既有的單一真相，命中數異常偏低＝可能已被搬走，請重新確認本鎖的前提：" + owners);
    // ⚠️ 首版只驗 `rtp:`（物件字面量形），負向擾動當場證明它是空的：真實會出現的另一種寫法是
    //    `put(id, "rtp", 96.5)`＝欄位名走字串引數，整條鎖抓不到。⇒ 改為「欄位名以任何形式出現都算」。
    var mentionsRtp = function (code) { return /\brtp\b\s*:/i.test(code) || /["']rtp["']/i.test(code); };
    // ⚠️ #98 落地後**放寬而非刪除**（#98 不變量 (d) 明文要求）：本鎖原本禁止 game-traits.js 出現 rtp，
    //   理由是「大廳層再抄一份數字」。#98 之後單一真相＝`HL.gameRtp`，所以正確的規則不是「不准提 rtp」，
    //   而是「**要提就只能向單一真相要**、不得自己寫值」⇒ 允許 `HL.gameRtp.of(...)`，仍禁止任何數字字面量。
    var traitsCode = strip(traits);
    if (mentionsRtp(traitsCode)) {
      t.ok(/HL\.gameRtp\s*\.\s*(of|gateOf|list|atLeast)\s*\(/.test(traitsCode),
        "game-traits.js 提到 rtp 卻沒有向 HL.gameRtp 取值＝又抄了第二份（#98 之後唯一合法來源是 HL.gameRtp）");
      t.equal(/\brtp\b[^\n]*?\b9[0-9](\.\d+)?\b/.test(traitsCode), false,
        "game-traits.js 出現 RTP 數字字面量＝第二份真相（值只能由 HL.gameRtp 求得）");
    }
    t.equal(mentionsRtp(strip(axes)), false, "容器層不得認識 rtp 這個欄位");

    // (b) 新增一軸只需加一筆 config、不得改 render ⇒ casino.js 不得出現任何軸/桶的名字
    var NAMES = ["pace", "instant", "stepwise", "pending", "節奏", "一鍵見分", "逐步兌現"];
    var leaked = NAMES.filter(function (n) { return strip(casino).indexOf(n) >= 0; });
    t.equal(leaked.join(","), "", "casino.js 硬寫了軸/桶的名字（加一條軸就得回來改 render）：" + leaked.join(", "));
    // 且它真的是「遍歷容器」而非自己拼頁籤
    t.ok(/gameAxes\.tabs\(/.test(casino), "casino.js 必須向容器要頁籤（gameAxes.tabs）");
    t.ok(/gameAxes\.match\(/.test(casino), "casino.js 必須向容器問 match（否則篩選邏輯又散回大廳）");
    t.ok(/gameAxes\.labelOf\(/.test(casino), "結果牆標題必須由軸自己提供（否則標題會與桶定義漂移）");

    // 容器與內容都必須真的掛在 index.html，且順序為容器先於內容
    var html = indexHtml(), s = staticScripts(html);
    var iA = s.indexOf("./src/core/game-axes.js"), iT = s.indexOf("./src/data/game-traits.js");
    t.ok(iA >= 0, "index.html 未掛載 core/game-axes.js（整條軸從大廳消失）");
    t.ok(iT >= 0, "index.html 未掛載 data/game-traits.js（軸在但沒有內容）");
    t.ok(iA < iT, "載入序錯：容器必須早於內容，否則 game-traits.js 的 register 會被靜默略過");
    t.ok(iT < s.indexOf("./src/views/casino.js"), "軸必須早於 casino.js");
  }
});

selftest.register({
  id: "platform/game-axes-rtp", group: "platform", env: "node", tier: "fast",
  title: "#102 回報率軸：值只能向 HL.gameRtp 求（側表零副本）／缺登記者不進任何桶／三桶皆非空／casino.js 零改動",
  run: function (t) {
    var HLa = loadAxes();                        // 容器 + 內容（真的那兩份檔）
    var ax = HLa.gameAxes, tr = HLa.gameTraits;
    var R = require(RTP_SRC);
    HLa.gameRtp = R;                             // 瀏覽器端由 index.html 掛載；此處注入同一份模組

    var axis = ax.all().filter(function (a) { return a.key === "rtp"; })[0];
    t.ok(!!axis, "回報率軸未註冊（#102 的出口就是它）");
    t.equal(axis.field, "rtp", "軸的 field 必須是 rtp");

    // 不變量 (a)：值必須真的來自 HL.gameRtp，且側表自己一個數字都沒存 ⇒ 拔掉單一真相後**全部缺值**
    var games = playableGames();
    var withVal = games.filter(function (x) { return tr.value(x.id, "rtp") != null; });
    t.ok(withVal.length >= 14, "回報率覆蓋數異常偏低（" + withVal.length + "）⇒ 軸會分不到遊戲");
    t.equal(tr.value("pirots", "rtp"), R.of("pirots"), "側表回的值與單一真相不一致＝中間又有一份副本");
    delete HLa.gameRtp;                          // 模擬「單一真相不存在」
    var orphan = games.filter(function (x) { return tr.value(x.id, "rtp") != null; });
    t.equal(orphan.length, 0,
      "拔掉 HL.gameRtp 後仍有 " + orphan.length + " 款有 rtp 值＝側表私藏了副本（本軸的核心不變量）");
    HLa.gameRtp = R;

    // 不變量 (b)：未登記者不得進任何桶（不是被歸進最差那一格，而是完全不出現）
    var UNREG = ["plinko", "baccarat", "european-roulette", "sic-bo", "dragon-tiger", "andar-bahar", "money-wheel", "shadow-ritual"];
    UNREG.forEach(function (id) {
      t.equal(R.of(id), null, id + " 竟已登記＝本段前提已變，請重新確認未覆蓋清單");
      axis.buckets.forEach(function (b) {
        t.equal(ax.match({ id: id }, ax.keyOf("rtp", b.key)), false, id + " 缺登記卻進了 rtp:" + b.key + " 桶");
      });
    });

    // 真實 roster 下三桶皆非空（若哪天某桶空了＝依容器規則它會靜默消失，這條鎖讓「靜默」變成紅燈）
    var tabs = ax.tabs(games.map(function (x) { return { id: x.id }; })).filter(function (x) { return x.axis === "rtp"; });
    t.equal(tabs.length, 3, "回報率軸應渲染 3 桶，實際：" + JSON.stringify(tabs.map(function (x) { return x.bucket; })));
    t.equal(tabs.map(function (x) { return x.bucket; }).join(","), "top,high,mid", "桶順序不符 order");

    // 分桶正確性：逐款以登記值反推它「應該」在哪一桶，與容器實際判定逐一對照
    var expect = function (v) { return v >= 99 ? "top" : v >= 98 ? "high" : v >= 96 ? "mid" : null; };
    var counted = 0;
    games.forEach(function (x) {
      var v = R.of(x.id);
      if (v == null) return;
      counted++;
      var want = expect(v);
      axis.buckets.forEach(function (b) {
        t.equal(ax.match({ id: x.id }, ax.keyOf("rtp", b.key)), b.key === want,
          x.id + "(" + v + "%) 應在 " + want + " 桶，但 rtp:" + b.key + " 的判定不符");
      });
    });
    t.ok(counted >= 14, "逐款對照的樣本數過少（" + counted + "）⇒ 本鎖可能空掃");

    // 桶必須**窮盡所有登記值**：有登記值卻落不進任何桶＝該款在軸上**靜默消失**（而它明明有值）。
    //   這不是假設性的：mid 桶下界是 96，任何日後以 92% 登記的遊戲都會恰好掉進裂縫裡，
    //   而依容器規則「缺值不進軸」的外觀與「有值但沒有桶收」完全一樣 ⇒ 沒有這條鎖就查不出來。
    //   （實作當輪的負向擾動證實：只把桶界從 96 改成 90 是**擾動本身是空的**——現行最低登記值
    //    96.145% 落在兩者之間，行為零變化。真正該鎖的不是界線的數字，是「不准有值掉出全部桶」。）
    var homeless = games.filter(function (x) {
      var v = R.of(x.id);
      if (v == null) return false;
      return !axis.buckets.some(function (b) { return b.is(v); });
    }).map(function (x) { return x.id + "(" + R.of(x.id) + "%)"; });
    t.equal(homeless.join(","), "", "有登記 RTP 卻不屬於任何桶＝在軸上靜默消失：" + homeless.join(", "));
    // 且不得同時落進兩個桶（桶界重疊會讓同一款遊戲在兩個頁籤下都出現，計數也會虛胖）
    var doubled = games.filter(function (x) {
      var v = R.of(x.id);
      if (v == null) return false;
      return axis.buckets.filter(function (b) { return b.is(v); }).length > 1;
    }).map(function (x) { return x.id; });
    t.equal(doubled.join(","), "", "同一款遊戲落進多個桶（桶界重疊）：" + doubled.join(", "));

    // 不變量 (c)：加這條軸不得改動 casino.js（#94 已把「軸名不得洩進大廳」寫成鎖，這裡再證新軸也守住）
    var casino = fs.readFileSync(CASINO_SRC, "utf8");
    ["rtp", "回報率", "RTP 99", "98–99", "96–98"].forEach(function (n) {
      t.equal(casino.indexOf(n) >= 0, false, "casino.js 出現了回報率軸的名字「" + n + "」＝render 又被改了");
    });
  }
});

selftest.register({
  id: "platform/game-axes-title-i18n", group: "platform", env: "node", tier: "fast",
  title: "結果牆標題（labelOf 串接）每個可渲染桶都必須有 whole-key i18n（U36·P3 串接陷阱：否則 EN/zh-Hans 顯示未翻中文）",
  run: function (t) {
    // 大廳選中某條軸的桶時，結果牆標題＝labelOf(filter)＝`軸label · 桶label`（casino.js:140-142），
    // 整串是一個文字節點；i18n walker 只能「整節點等於一條 key」才翻得到（且它 raw.trim() 後查表，
    // 一個節點最多做一次替換）⇒ 桶標籤自己是 key 也沒用，必須為每個可渲染桶的**串接後標題**各補一條 whole-key。
    // 這條鎖捕捉：日後 pending 桶有了遊戲、或新增一條軸時，若忘了補標題翻譯就會靜默漏翻。
    // ⚠️ 2026-08-17（#102 負向擾動查獲）：本鎖原本 `loadAxes()` 後**沒有注入 HL.gameRtp**，
    //   而 rtp 軸的值全靠它求 ⇒ 在測項眼中那條軸「一個桶都非空」而**整條不渲染**、三個新標題
    //   從未被檢查過。實證：把 EN 的一條標題整行刪掉，本鎖照樣全綠。
    //   ⇒ 教訓：**用 shim 載入的鎖，少注入一個依賴不會報錯，只會讓被檢查的集合默默變小**
    //   （與 08-15 的「鎖對它唯一要禁的形制無效卻全綠」同族）。故除了注入，還要**釘死軸數**。
    var HLx = loadAxes();
    HLx.gameRtp = require(RTP_SRC);
    var ax = HLx.gameAxes;
    var games = playableGames().map(function (g) { return { id: g.id }; });
    var tabs = ax.tabs(games);
    t.ok(tabs.length >= 2, "真實 roster 下應至少渲染一條軸（≥2 桶），實際頁籤數：" + tabs.length);
    var seenAxes = {};
    tabs.forEach(function (tb) { seenAxes[tb.axis] = true; });
    t.equal(Object.keys(seenAxes).sort().join(","), "pace,rtp",
      "被檢查的軸與預期不符（少一條＝那條軸的標題翻譯無人看管），實際：" + Object.keys(seenAxes).join(",") + "｜頁籤數 " + tabs.length);
    var i18n = i18nPacksSrc();                             // #100：字典已拆到 src/i18n/<code>.js
    t.ok(i18n.length > 0, "找不到任何語言包（src/i18n/*.js）⇒ 本鎖會空掃而假綠");
    tabs.forEach(function (tb) {
      var title = ax.labelOf(tb.k);
      t.ok(!!title, "labelOf 應回傳結果牆標題：" + tb.k);
      var key = String(title).trim();                        // walker 以 raw.trim() 查表
      var occ = i18n.split('"' + key + '":').length - 1;     // 需在 EN 與 zh-Hans 兩塊各出現一次
      t.ok(occ >= 2, "結果牆標題「" + key + "」缺 whole-key i18n（EN+zh-Hans 各需一條，實得 " + occ + "）⇒ EN/zh-Hans 會顯示未翻中文");
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
 * #98 宣告 RTP 單一真相 HL.gameRtp — 常駐鎖
 * 卡上四條不變量 (a)零視覺回歸 (b)未遷移者仍可傳字串 (c)反向鎖:數值須與遊戲自身常數一致
 * (d)game-traits 收 rtp 時須放寬既有鎖而非刪除〔已在 game-axes-no-second-rtp 內就地放寬〕
 * ═════════════════════════════════════════════════════════════════════════ */
var RTP_SRC = path.join(ROOT, "src", "data", "game-rtp.js");

selftest.register({
  id: "platform/game-rtp-single-source", group: "platform", env: "node", tier: "fast",
  title: "#98(a)(c)：已遷移的 7 處 gameInfoBar 不得再出現 RTP 數字字面量，值一律向 HL.gameRtp 求",
  run: function (t) {
    var R = require(RTP_SRC);
    var MIGRATED = {
      "slot-pirots.js": "pirots",
      "slot-dead-by-noon.js": "dead-by-noon",
      "slot-golden-toad.js": "golden-toad",
      "slot-gem-storm.js": "gem-storm",
      "instant-cases.js": "cases",
      "chicken.js": "chicken-cross",
      "bounty.js": "bounty"
    };
    Object.keys(MIGRATED).forEach(function (f) {
      var id = MIGRATED[f];
      var code = fs.readFileSync(path.join(ROOT, "src", "views", f), "utf8");
      var m = /gameInfoBar\(\{[\s\S]*?\}\)/.exec(code);
      t.ok(!!m, f + " 找不到 gameInfoBar 呼叫（本鎖的前提已變，請重新確認遷移狀態）");
      var call = m[0];
      // rtp 欄位的值必須是 HL.gameRtp 呼叫，不得是字串/數字字面量
      var rtpArg = /\brtp\s*:\s*([^,}]+)/.exec(call);
      t.ok(!!rtpArg, f + " 的 gameInfoBar 少了 rtp 欄位");
      t.ok(/HL\.gameRtp\s*\.\s*(of|rtpText)\s*\(/.test(rtpArg[1]),
        f + " 的 rtp 不是向 HL.gameRtp 求得（＝又寫了第二份真相）：" + rtpArg[1].trim());
      // edge 若存在，同樣不得自己寫數字（cases 的 "≈" 前綴合法，但數字部分仍須求值）
      var edgeArg = /\bedge\s*:\s*([^,}]+)/.exec(call);
      if (edgeArg) {
        t.ok(/HL\.gameRtp\s*\.\s*(edgeOf|edgeText)\s*\(/.test(edgeArg[1]),
          f + " 的 edge 自己寫了數字（莊家優勢＝100−RTP，必須由單一真相導出）：" + edgeArg[1].trim());
        t.equal(/\d+(\.\d+)?\s*%/.test(edgeArg[1]), false, f + " 的 edge 仍含百分比字面量");
      }
      t.ok(R.of(id) != null, "登記表缺 " + id + "（view 讀得到 null ⇒ 該段直接不渲染）");
    });
  }
});

selftest.register({
  id: "platform/game-rtp-render-parity", group: "platform", env: "node", tier: "fast",
  title: "#98(a) 六款遷移零視覺回歸 ＋ #99 pirots 已裁定改為 96.145%（唯一刻意改動者）",
  run: function (t) {
    var R = require(RTP_SRC);
    // 這些字串釘死玩家實際看到的顯示。六款維持 #98 遷移前逐字相同＝零視覺回歸；
    // pirots 是**唯一刻意改動者**：#99（2026-08-16 遊戲軌）裁定顯示由 96.0% 收斂到標稱 96.145%
    // （＝買入價/deep 鎖/edge.js 一致值），莊家優勢隨之 4%→3.855%＝這是裁決要求的改動，不是回歸。
    var EXPECT = {
      "pirots":        { rtp: "96.145%", edge: "3.855% 莊家優勢" },  // #99 裁定值（非 #98 遷移前）
      "dead-by-noon":  { rtp: "96.27%", edge: "3.73% 莊家優勢" },
      "golden-toad":   { rtp: "96.3%", edge: "3.7% 莊家優勢" },
      "gem-storm":     { rtp: "96.5%", edge: "3.5% 莊家優勢" },
      "cases":         { rtp: "98.5%", edge: "1.5% 莊家優勢" },
      "chicken-cross": { rtp: "97%" },
      "bounty":        { rtp: "100%" }
    };
    Object.keys(EXPECT).forEach(function (id) {
      t.equal(R.rtpText(id), EXPECT[id].rtp, id + " 的 RTP 顯示字串不符（六款＝視覺回歸；pirots＝偏離 #99 裁定值）");
      // 數值與顯示字串必須自洽（parseFloat 顯示 === 登記值），否則兩份真相又漂開
      t.equal(R.of(id), parseFloat(EXPECT[id].rtp), id + " 的 RTP 數值與顯示字串不自洽");
      if (EXPECT[id].edge) t.equal(R.edgeText(id), EXPECT[id].edge, id + " 的莊家優勢字串不符");
    });
  }
});

selftest.register({
  id: "platform/game-rtp-derived-from-game", group: "platform", env: "node", tier: "fast",
  title: "#98(c) 反向鎖：登記的數值必須與該遊戲自己的常數/解析式一致（不得是好看但對不上的數字）",
  run: function (t) {
    var R = require(RTP_SRC);

    // ⚠️ 本段首版兩條比對都是**空的**：以為 require 直接回傳數學物件，實際上兩檔都包一層
    //    （`{chicken:{...}}` / `{cases:{...}}`），取值全 undefined ⇒ 走進 `else { t.ok(true) }` 分支、
    //    測項照樣全綠。負向擾動當場證實：把登記值改成 99 也不會紅。⇒ 改為**取不到就直接紅**，不留跳過分支。
    //    （與 08-15 08:00「鎖對它唯一要禁的形制無效卻全綠」同一條教訓的第三次應驗。）

    // chicken：遊戲自己就 export 了 rtp 常數 ⇒ 必須逐位相等
    var chicken = require(path.join(ROOT, "src", "views", "chicken.js")).chicken;
    t.ok(chicken && typeof chicken.rtp === "number", "取不到 HL.chicken.rtp＝本鎖無從比對（不得靜默跳過）");
    t.equal(R.of("chicken-cross"), chicken.rtp * 100,
      "chicken 登記值與 HL.chicken.rtp 不一致（遊戲自己的常數才是權威）");

    // cases：四張加權表各有封閉解析式 Σ(w·mult)/Σw ⇒ 宣告的標稱值須落在全部四表 ±0.5pp 內
    var cases = require(path.join(ROOT, "src", "views", "instant-cases.js")).cases;
    t.ok(cases && typeof cases.rtpOf === "function" && cases.DIFFS && cases.DIFFS.length === 4,
      "取不到 HL.cases 的解析式/難度表＝本鎖無從比對（不得靜默跳過）");
    var nominal = R.of("cases");
    cases.DIFFS.forEach(function (d) {
      var exact = cases.rtpOf(cases.tblOf(d.key)) * 100;
      t.ok(Math.abs(exact - nominal) <= 0.5,
        "cases 難度 " + d.key + " 精確 RTP " + exact.toFixed(3) + "% 偏離宣告 " + nominal + "% 超過 0.5pp");
    });

    // 四款買入型 slot：買入價 = E[買入倍數] / 宣告RTP（保真閘第 14 項）。E[] 要 MC 故留 deep，
    // 這裡鎖的是**推導所用的分母**必須就是登記表的 gateRtp，不得是另一個數字。
    var games = fs.readFileSync(path.join(ROOT, "tests", "checks-games.js"), "utf8");
    t.equal(/declaredRTP\s*:\s*0?\.\d+/.test(games), false,
      "checks-games.js 又出現寫死的 declaredRTP＝宣告 RTP 的第二份機器可讀副本（#98 已收斂為 HL.gameRtp）");
    t.ok(/gameRtp\.gateOf\(/.test(games), "checks-games.js 必須向 HL.gameRtp 取宣告 RTP");
    t.equal(R.gateOf("dead-by-noon"), 96.27, "gateOf 與保真閘原本使用的值不符＝閘的行為被無聲改動");
  }
});

selftest.register({
  id: "platform/game-rtp-derived-from-module", group: "platform", env: "node", tier: "fast",
  title: "#102：originals 11 款的登記值必須＝該遊戲模組自己算出來的解析 RTP（窮舉全參數，零離散）",
  run: function (t) {
    // 【這條鎖存在的理由】#94 定案 rtp 屬**遊戲軌**權威、平台軌無權代填。本批 10 款之所以能由平台軌
    //   登記，唯一正當性就是「值不是平台軌的判斷，是從遊戲自己的模組重算出來的」——那個正當性必須
    //   **每輪重新成立一次**，否則遊戲軌哪天調了 edge 常數，登記表就會變成一份過期的宣稱（而它是
    //   玩家在大廳 RTP 軸上看到的分群依據）。⇒ 本鎖每次都真的重算，不比對任何寫死的數字。
    var R = require(RTP_SRC);
    var V = path.join(ROOT, "src", "views");
    var req = function (f) { return require(path.join(V, f)); };
    var g = req("instant-games.js"), cm = req("instant-crash-mines.js");
    var K = req("instant-keno.js").keno, T = req("instant-towers.js").towers;
    var H = req("instant-hilo.js").hilo, P = req("instant-pump.js").pump;
    var D = req("instant-duel.js").duel, PK = req("instant-picks.js").picks;
    var MO = req("instant-moles.js").moles;

    // 每款一個「窮舉全參數空間、回傳 [min,max]」的重算器。範圍不得只取一點——單點相等會讓
    // 「只有某個 target 恰好對」的錯誤溜過去（towers/mines 的 RTP 是策略無關性質，正是要全格驗）。
    function span(fn, params) {
      var lo = Infinity, hi = -Infinity, n = 0;
      params.forEach(function (p) {
        var v = fn(p);
        if (v == null || !isFinite(v)) return;
        n++; if (v < lo) lo = v; if (v > hi) hi = v;
      });
      return { lo: lo, hi: hi, n: n };
    }
    function range(a, b, step) { var o = []; for (var x = a; x <= b; x += (step || 1)) o.push(x); return o; }

    var CASES = [
      { id: "dice", min: 40, f: function () {
          var ps = []; range(2, 98).forEach(function (tg) { ps.push([tg, true]); ps.push([tg, false]); });
          return span(function (p) { return g.dice.winChance(p[0], p[1]) / 100 * g.dice.mult(p[0], p[1]) * 100; }, ps);
        } },
      { id: "limbo", min: 40, f: function () {
          return span(function (x) { return g.limbo.winChancePct(x) / 100 * x * 100; }, range(1.05, 100, 0.25));
        } },
      { id: "crash-x", min: 40, f: function () {
          return span(function (x) { return cm.crash.winChancePct(x) / 100 * x * 100; }, range(1.05, 100, 0.25));
        } },
      { id: "mines", min: 100, f: function () {
          var ps = []; range(1, 24).forEach(function (b) { range(1, 25 - b).forEach(function (k) { ps.push([b, k]); }); });
          return span(function (p) { return cm.mines.pSafe(p[0], p[1]) * cm.mines.fairMult(p[0], p[1]) * 100; }, ps);
        } },
      { id: "keno", min: 10, f: function () {
          return span(function (n) {
            var s = 0; for (var h = 0; h <= n; h++) s += K.pHits(n, h) * K.multOf(n, h);
            return s * 100;
          }, range(1, K.MAX_PICK));
        } },
      // ⚠️ towers/pump 的參數序是 `(k, diff)`／`(k, spikes)`——**不是** `(diff, k)`。實作當輪的探測
      //   腳本兩款都傳反了，於是 `for (i=0; i<k; i++)` 因 k 是物件而一次都沒跑 ⇒ 兩函式各自回
      //   「EDGE 本身」與「1」，相乘恰好等於 edge 常數 ⇒ **看起來完美驗證通過，其實零參數被掃過**。
      //   這就是本專案反覆記載的「先懷疑量測法」家族：把 min===max===常數 當成「零離散」的鐵證，
      //   而它其實是「根本沒動過」的同義詞。⇒ 本鎖的 `min` 樣本數下限就是為了讓這種假綠變紅（它抓到了）。
      { id: "towers", min: 20, f: function () {
          var ps = []; T.DIFFS.forEach(function (d) { range(1, T.rows).forEach(function (lv) { ps.push([lv, d]); }); });
          return span(function (p) { return T.pReach(p[0], p[1]) * T.fairMult(p[0], p[1]) * 100; }, ps);
        } },
      // hilo 的 A 與 K 各有**一個方向是鎖住的**（A 不可能更低、K 不可能更高）：該方向 pHi/pLo 與
      //   stepMult 都回 0 ⇒ 那不是一個「RTP 0% 的爛注」，而是**玩家點不到的注**。故明確排除，
      //   並用 nExact 把「只准排除 2 個」釘死（若哪天變成排除 3 個＝有個真的注型被做壞了，本鎖會紅）。
      { id: "hilo", min: 24, nExact: 24, f: function () {
          var ps = []; range(0, H.RANKS.length - 1).forEach(function (r) { ps.push([r, true]); ps.push([r, false]); });
          return span(function (p) {
            var m = H.stepMult(p[0], p[1]);
            if (m === 0) return null;                       // 鎖向：不是可下的注
            return (p[1] ? H.pHi(p[0]) : H.pLo(p[0])) * m * 100;
          }, ps);
        } },
      { id: "pump", min: 20, f: function () {
          var ps = []; P.DIFFS.forEach(function (d) { range(1, P.maxSafe(d.spikes)).forEach(function (k) { ps.push([k, d.spikes]); }); });
          return span(function (p) { return P.reachProb(p[0], p[1]) * P.fairMult(p[0], p[1]) * 100; }, ps);
        } },
      { id: "dice-duel", min: 1, f: function () { return span(function () { return D.fairRTP() * 100; }, [0]); } },
      { id: "picks", min: 50, f: function () {
          return span(function (pr) { return PK.fairRTP(pr) * 100; }, range(0.05, 0.95, 0.01));
        } },
      // moles：∀地鼠數 M∈1..6 × ∀兌現目標 k∈1..8（48 組）pReach·fairMult 恰＝EDGE(98%)、策略無關（同 Towers 家族）
      { id: "moles", min: 48, nExact: 48, f: function () {
          var ps = []; MO.molesRange.forEach(function (m) { range(1, MO.maxHits).forEach(function (k) { ps.push([m, k]); }); });
          return span(function (p) { return MO.pReach(p[0], p[1]) * MO.fairMult(p[0], p[1]) * 100; }, ps);
        } }
    ];

    CASES.forEach(function (c) {
      var declared = R.of(c.id);
      t.ok(typeof declared === "number", c.id + " 未登記＝RTP 軸分不到它（本批 11 款應全數登記）");
      var s = c.f();
      t.ok(s.n >= c.min, c.id + " 重算樣本數過少（" + s.n + " < " + c.min + "）⇒ 本鎖可能空掃而假綠");
      if (c.nExact) t.equal(s.n, c.nExact, c.id + " 可下注的參數組合數變了（預期 " + c.nExact + "，實得 " + s.n + "）");
      // 零離散：全參數空間的 min 與 max 必須都等於登記值（容差留給浮點，不留給設計偏差）
      t.ok(Math.abs(s.lo - declared) < 1e-6,
        c.id + " 最差參數解析 RTP " + s.lo.toFixed(6) + "% ≠ 登記 " + declared + "%（登記值高報了玩家實得）");
      t.ok(Math.abs(s.hi - declared) < 1e-6,
        c.id + " 最佳參數解析 RTP " + s.hi.toFixed(6) + "% ≠ 登記 " + declared + "%（有參數組合超出宣告）");
      t.equal(R.entry(c.id).basis, "analytic", c.id + " 的 basis 必須是 analytic（本批的正當性就是解析可重算）");
    });

    // plinko 反向鎖：它**沒有單一 RTP**（9 種 rows×risk 組合實測 98.8164–99.1014%，賠付表取整所致），
    //   登記任何單值都會是假的。本輪據實不登記並開卡 #103 交遊戲軌裁決 ⇒ 這裡擋住往後隨手補登。
    t.equal(R.of("plinko"), null,
      "plinko 被登記了：它的 RTP 隨 rows×risk 變動（實測 98.82–99.10%）⇒ 單值宣告必為假，見 BACKLOG #103");
    var spread = span(function (p) {
      var tbl = g.plinko.buildTable(p[0], p[1]), tot = Math.pow(2, p[0]), s = 0;
      for (var i = 0; i < tbl.length; i++) s += (g.plinko.comb(p[0], i) / tot) * tbl[i];
      return s * 100;
    }, [[8, "low"], [12, "low"], [16, "low"], [8, "medium"], [12, "medium"], [16, "medium"], [8, "high"], [12, "high"], [16, "high"]]);
    t.equal(spread.n, 9, "plinko 九組設定沒有全部算到＝本反向鎖的前提未成立");
    t.ok(spread.hi - spread.lo > 0.05,
      "plinko 各設定的 RTP 已收斂到單值（實得離散 " + (spread.hi - spread.lo).toFixed(4) + "pp）⇒ 不登記的理由消失，請重新評估 #103");

    /* ── #103 裁決 (c)（2026-08-20 船長裁定）：正式承認參數化 RTP ────────────────────────
     * 於是這條鎖多守兩件事：① 它必須**有**參數化登記（不再是「什麼都問不到」）
     * ② 那 9 個登記值必須與模組現算值**逐項相符**——參數化不是放寬證據標準的後門，
     *    它和單值批次受同一條紀律：表裡的數字只是模組常數的可列舉出口，不是第二個意見。
     * ③ 而且沒有任何一種設定可以超過宣告上界 99%（房家安全側；16排/高風險曾是 99.1014%）。 */
    t.ok(R.isParameterized("plinko"), "plinko 必須有參數化 RTP 登記（#103 裁決 (c)）");
    var pr = R.rangeOf("plinko");
    t.equal(pr.values.length, 9, "參數化登記必須含全部 9 種設定（實測 " + pr.values.length + " 筆）");
    t.equal(pr.basis, "analytic", "plinko 的 basis 必須是 analytic（解析可重算）");
    var bad = [];
    pr.values.forEach(function (v) {
      var seg = String(v.k).split("/"), n = +seg[0], rk = seg[1];
      var tbl = g.plinko.buildTable(n, rk), tot = Math.pow(2, n), sum = 0;
      for (var i = 0; i < tbl.length; i++) sum += (g.plinko.comb(n, i) / tot) * tbl[i];
      var live = Math.round(sum * 1000000) / 10000;
      if (Math.abs(live - v.rtp) > 0.0002) bad.push(v.k + " 表記 " + v.rtp + "% vs 模組現算 " + live + "%");
      if (live > 99.0000001) bad.push(v.k + " 超過宣告上界 99%（實測 " + live + "%）");
    });
    t.equal(bad.length, 0, "參數化登記值與模組不符或逸出上界：" + bad.join("；"));
    // 不得同時存在單值宣告（雙向不變量，第一版只擋了一個方向、實測即被打穿）
    t.ok(R.declare("plinko", { rtp: 99, basis: "analytic" }) === false,
      "declare() 必須拒絕已被宣告為參數化的 id（否則先 declareRange 再 declare 就能造出第二份真相）");
    t.equal(R.of("plinko"), null, "被拒絕之後 plinko 仍不得出現在單值 API 裡");
  }
});

selftest.register({
  id: "platform/game-rtp-divergence-pinned", group: "platform", env: "node", tier: "fast",
  title: "#98：顯示值與保真閘值的分歧必須是**已登記的那一筆**（新分歧一出現就紅）",
  run: function (t) {
    var R = require(RTP_SRC);
    // repo 內同一款遊戲同時宣稱兩個 RTP＝保真閘第 14 項要防的形狀。實作當輪查獲 pirots 已如此
    // （玩家 96.0% vs 買入價/deep 鎖 96.145%）。rtp 屬遊戲軌權威（#94 定案）⇒ 平台軌不代改，
    // 改成登記+釘死：**再多一筆就紅**，而要關掉它必須刪掉這行＝逼出一次明確裁決。見 BACKLOG #99。
    // 2026-08-16 遊戲軌 #99 已裁決：pirots 標稱收斂到 96.145%（of===gateOf），白名單清空 ⇒ 本鎖回到
    // 「任何顯示/保真閘 RTP 分歧一出現就紅」的預設嚴格態（下一個新分歧不再有豁免）。
    var KNOWN_DIVERGENCE = [];
    var actual = R.ids().filter(function (id) { return R.of(id) !== R.gateOf(id); });
    t.equal(actual.slice().sort().join(","), KNOWN_DIVERGENCE.slice().sort().join(","),
      "顯示 RTP 與保真閘 RTP 分歧的遊戲清單變了（預期 " + KNOWN_DIVERGENCE.join(",") + "，實得 " + (actual.join(",") || "無") + "）");
    // 有分歧者必須寫明理由，否則下一輪 session 看不懂為何兩個數字
    actual.forEach(function (id) {
      t.ok((R.entry(id).note || "").length > 20, id + " 有分歧卻沒寫理由（無記憶的下一輪 session 無從判斷）");
    });
  }
});

selftest.register({
  id: "platform/game-rtp-no-false-claim", group: "platform", env: "node", tier: "fast",
  title: "#98：已知未校準的遊戲不得登記（登記＝把假數字鑄成可查詢 API）",
  run: function (t) {
    var R = require(RTP_SRC);
    // shadow-ritual 顯示 "~97%（基礎連爆）"，但 DEBT S-slot-rtp 實測 full RTP=1132.68%。
    // 登記它 ⇒ 未來 RTP 軸會把旗艦排進 97% 那一格＝用一個已知為假的數字誤導玩家。
    t.equal(R.of("shadow-ritual"), null,
      "shadow-ritual 被登記了，但 DEBT S-slot-rtp 未關（實測 full RTP 1132%）＝把已知為假的數字鑄成 API");
    // (b) 未遷移者仍須能傳字串＝漸進遷移不得變成大爆炸
    var slot = fs.readFileSync(path.join(ROOT, "src", "views", "slot.js"), "utf8");
    t.ok(/gameInfoBar\(\{[^}]*rtp\s*:\s*["']/.test(slot),
      "slot.js 的字串形 rtp 不見了：若已遷移請同步移除本鎖，若被改壞則漸進遷移的相容性已破");
    var ui = fs.readFileSync(path.join(ROOT, "src", "core", "ui.js"), "utf8");
    t.ok(/typeof\s+v\s*===\s*["']number["']/.test(ui), "gameInfoBar 必須同時支援數值與字串（漸進遷移）");
  }
});

selftest.register({
  id: "platform/game-rtp-enumerable", group: "platform", env: "node", tier: "fast",
  title: "#98：這張卡要解鎖的那個問題現在真的問得到（哪些遊戲 RTP ≥ X）+ 掛載序",
  run: function (t) {
    var R = require(RTP_SRC);
    t.ok(R.ids().length >= 7, "登記數異常偏低＝內容掉了：" + R.ids().length);
    var hi = R.atLeast(98);
    t.ok(hi.indexOf("cases") >= 0 && hi.indexOf("bounty") >= 0, "atLeast(98) 應含 cases/bounty");
    t.equal(hi.indexOf("gem-storm"), -1, "atLeast(98) 不應含 96.5% 的 gem-storm");
    t.equal(R.atLeast(101).length, 0, "門檻高於所有登記值時應為空陣列");
    // 未登記者一律回 null（缺值即不進軸；不得回 0，那會讓 RTP 軸把它排在最差那一格）
    // ⚠️ 2026-08-17（#102）：這兩行原本拿 `dice` 當「未登記」樣本，而本輪正是把 dice 登記進去的那一輪
    //   ⇒ 樣本改用真正未登記者。**教訓**：拿「目前恰好沒有的東西」當測試樣本，等於把一個會被正常
    //   演進推翻的前提寫進斷言（同 pace-rubric 的 `all().length===1`，本輪一口氣踩到兩個）。
    t.equal(R.of("baccarat"), null, "未登記的遊戲必須回 null，不得回 0（桌遊每注型 RTP 不同，刻意不登記）");
    t.equal(R.edgeOf("baccarat"), null, "未登記的遊戲 edgeOf 必須回 null");
    // 空登記表不得整站壞掉（同 #90/#72 不變量）
    var snapshot = R.list();
    R._reset();
    t.equal(R.list().length, 0, "空登記表的 list() 應為空陣列");
    t.equal(R.of("cases"), null, "空登記表求值應回 null 而非拋錯");
    snapshot.forEach(function (e) { R.declare(e.id, e); });
    t.equal(R.list().length, snapshot.length, "還原後筆數應相同（測項不得污染後續測項）");
    // 掛載：必須真的在 index.html，且早於 casino.js（RTP 軸未來要在大廳讀它）
    var s = staticScripts(indexHtml());
    var iR = s.indexOf("./src/data/game-rtp.js");
    t.ok(iR >= 0, "index.html 未掛載 data/game-rtp.js（全站問不到 RTP，等於這張卡沒落地）");
    t.ok(iR < s.indexOf("./src/views/casino.js"), "game-rtp.js 必須早於 casino.js");
  }
});

selftest.register({
  id: "platform/game-rtp-i18n-second-copy", group: "platform", env: "node", tier: "fast",
  title: "#98：i18n 字典裡那份 cases RTP 字面量必須與單一真相一致（實作當輪查獲的第三份副本）",
  run: function (t) {
    var R = require(RTP_SRC);
    // instant-cases.js:95 走 `HL.i18n.fmt("最高 {m}　RTP 98.5%")`——字典鍵本身內嵌了 98.5。
    // 它不能直接改成求值（會失去 i18n 鍵），但可以鎖住：改了 RTP 卻沒改字典 ⇒ 兩處說不同的話。
    var i18n = i18nPacksSrc();                             // #100：字典已拆到 src/i18n/<code>.js
    var hit = /RTP\s+(\d+(?:\.\d+)?)%/.exec(i18n);
    t.ok(!!hit, "i18n 字典裡的 cases RTP 鍵不見了（若已改為求值請同步移除本鎖）");
    t.equal(parseFloat(hit[1]), R.of("cases"),
      "i18n 字典寫 RTP " + hit[1] + "%，但單一真相是 " + R.of("cases") + "%＝第三份副本已漂移");
  }
});

/* ===================== #96 自我排除（platform · 2026-08-16 14:00 窗）=====================
 * 這三條鎖守的不是「功能有沒有做」，而是**它會不會在往後某一輪被安靜地做回一個假鎖**：
 *   ① 擋注若哪天退回 UI 層（面板藏起按鈕），console 一行就能繞過 ⇒ 鎖「閘讀的是 pause」。
 *   ② 期間選項若被寫死回面板，加一種期間就要改 UI ⇒ 鎖「面板讀註冊表」。
 *   ③ pause 若被任何一處直接指派成更短/更空的值，「不可提前解除」當場失效 ⇒ 鎖「唯一寫入口」。
 */
var RG_SRC = path.join(ROOT, "src", "core", "responsible.js");
function rgParts() {
  var src = fs.readFileSync(RG_SRC, "utf8");
  var i = src.indexOf("以下為瀏覽器區");
  return { all: src, pure: src.slice(0, i), browser: src.slice(i) };
}

selftest.register({
  id: "platform/self-exclusion-gate-authority", group: "platform", env: "node", tier: "fast",
  title: "#96 (a)：擋注的權威在 evaluate（純區），三個閘出口都必須把 pause 餵給它",
  run: function (t) {
    var p = rgParts();
    t.ok(/function evaluate\(/.test(p.pure), "evaluate 必須留在純函式區（node 與瀏覽器驗的是同一份）");
    t.ok(/pauseUntilOf\(coolUntil\)/.test(p.pure) && /pauseKindOf\(coolUntil\)/.test(p.pure),
      "evaluate 內必須以 pauseUntilOf/pauseKindOf 判斷暫停，否則 exclude 會退化成沒擋");
    t.ok(/function planPause\(/.test(p.pure), "planPause（單調 setter）必須在純區才能被 node 測項驗證");
    // 三個閘出口逐一檢查：只要有一個改回 o.coolUntil，自我排除在該路徑就靜默失效
    ["check", "allowed", "checkDeposit"].forEach(function (fn) {
      // ⚠️ 刻意不用 new RegExp(字串) 組樣式：字串裡的 \( \s 會先被 JS 字面量吃掉一層
      //    （本輪首版就是這樣寫的，測項因此永遠 null＝鎖是空的）。改用「切片 + 字面量正則」。
      var at = p.browser.indexOf("function " + fn + "(");
      t.ok(at >= 0, fn + " 應存在於瀏覽器區");
      var win = p.browser.slice(at, at + 400);
      // 貪婪（非 lazy）：`allowed` 寫成 `evaluate(load().limits, …)`，lazy 會停在 `load(` 的右括號
      var m = /evaluate\(([^;]*)\)/.exec(win);
      t.ok(!!m, fn + " 應呼叫 evaluate");
      t.ok(/\bpause\b/.test(m[1]) && !/coolUntil/.test(m[1]),
        fn + " 必須把 pause 物件餵給 evaluate（實測引數：" + String(m[1]).trim() + "）");
    });
  }
});

selftest.register({
  id: "platform/self-exclusion-single-writer", group: "platform", env: "node", tier: "fast",
  title: "#96 (b)：pause 只能由 planPause 的結果指派——任何直接寫入都是「可提前解除」的後門",
  run: function (t) {
    var p = rgParts();
    var re = /\.pause\s*=\s*([^;]+);/g, m, seen = [];
    while ((m = re.exec(p.all))) seen.push(m[1].trim());
    t.ok(seen.length > 0, "應至少有一處指派 pause（否則本鎖失去對象）");
    seen.forEach(function (rhs) {
      var ok = rhs === "next" || /^\{\s*until:\s*o\.coolUntil/.test(rhs);
      t.ok(ok, "pause 的指派只允許 planPause 結果或舊存檔遷移，實測：" + rhs);
    });
    t.ok(/if \(o\.pause && next === o\.pause\) return o\.pause;/.test(p.browser),
      "更短的暫停必須原樣退回（no-op），不得覆寫既有暫停");
    t.ok(!/delete\s+\w+\.pause/.test(p.all), "不得有 delete pause 的解鎖路徑");
    // (c) 站別隔離＋跨載入存活：狀態必須走 HL.dom.lsGet/lsSet（真站 r: 前綴），不得用 session 級儲存
    t.ok(/HL\.dom\.lsSet\(KEY/.test(p.browser) && /HL\.dom\.lsGet\(KEY/.test(p.browser),
      "pause 必須隨 HL_RG 一起走 lsGet/lsSet（站別命名空間 + 重新載入仍生效）");
    t.ok(!/sessionStorage/.test(p.all), "不得使用 sessionStorage（關掉分頁就解鎖＝繞過）");
  }
});

selftest.register({
  id: "platform/self-exclusion-options-config", group: "platform", env: "node", tier: "fast",
  title: "#96：期間是註冊表驅動——面板不得再出現寫死的時長字面量",
  run: function (t) {
    var p = rgParts();
    var open = p.browser.slice(p.browser.indexOf("function open()"), p.browser.indexOf("HL.rg = {"));
    t.ok(open.length > 100, "應取得 open() 面板區段");
    t.ok(/pauseOptions\(/.test(open), "面板必須讀 pauseOptions()（加一種期間＝加一筆 spec、不改 UI）");
    t.ok(!/\d+\s*\*\s*DAY/.test(open), "面板內不得再出現寫死的時長字面量（如 7 * DAY）");
    var rg = require(RG_SRC);
    t.ok(rg.pauseOptions("exclude").length >= 4, "自我排除至少 4 個期間選項");
    t.ok(rg.pauseOptions("exclude").some(function (x) { return x.permanent; }), "應含永久型");
    t.equal(rg.PERM_UNTIL, 8640000000000000, "永久以最大合法時戳表示（Infinity 無法 JSON 往返）");
  }
});

/* ===================== #100 i18n 按語言拆檔（platform · 2026-08-16 20:00 窗）=====================
 * 拆檔前 core/i18n.js 是全站最大單檔（160KB），內容是「引擎 + EN 全譯 + zh-Hans 差異補丁」綁一起，
 * 而**預設語言 zh-Hant 一份字典都不需要** ⇒ 絕大多數 session 的首屏白帶約 140KB 從不執行的資料。
 * 拆檔本身沒有玩家可見的行為，所以它的風險全部落在「拆錯了也看起來一樣」——因此鎖必須釘住四件事：
 *   (a) 語言包真的有被 register 上架、且字典不是空的（否則畫面靜默全中文，測項卻全綠）
 *   (b) 語言包**不得**出現在 index.html 首屏 <script>（否則等於沒拆，KB 一分沒省）
 *   (c) 引擎不得再長回字典（正向斷言 core/i18n.js 的體積上限，防「拆了又被塞回來」）
 *   (d) 開機同步載入路徑必須還在（非預設語言若改成純非同步載入，就會先閃一整屏中文＝比省 KB 更糟的回歸）
 * ============================================================================================ */

var I18N_ENGINE = path.join(ROOT, "src", "core", "i18n.js");

// 以 register spy 實跑語言包，取回 { code: {dict,prefix,suffix} }（不倚賴原始碼字串比對）
function loadI18nPacks() {
  var vm = require("vm"), out = {};
  i18nPackFiles().forEach(function (f) {
    var w = { HL: { i18n: { register: function (c, p) { out[c] = p; } } }, console: { warn: function () {} } };
    w.window = w;
    vm.createContext(w);
    vm.runInContext(fs.readFileSync(path.join(I18N_DIR, f), "utf8"), w, { filename: f });
  });
  return out;
}

// 引擎 LANGS 裡「帶 src」的語言（zh-Hant 是原文本身，沒有也不需要字典檔）
function langsWithSrc() {
  var eng = fs.readFileSync(I18N_ENGINE, "utf8");
  var out = [], re = /\{\s*code:\s*"([^"]+)"[^}]*?src:\s*"([^"]+)"/g, m;
  while ((m = re.exec(eng))) out.push({ code: m[1], src: m[2] });
  return out;
}

selftest.register({
  id: "platform/i18n-packs-registered", group: "platform", env: "node", tier: "fast",
  title: "#100(a)：LANGS 每個帶 src 的語言都有對應語言包，且實跑 register 後字典非空、無空值",
  run: function (t) {
    var declared = langsWithSrc();
    t.ok(declared.length >= 2, "LANGS 應宣告至少 2 個帶 src 的語言（en / zh-Hans），實得 " + declared.length);
    var packs = loadI18nPacks();
    declared.forEach(function (L) {
      var f = path.join(ROOT, L.src.replace(/^\.\//, ""));
      t.ok(fs.existsSync(f), "LANGS 宣告 " + L.code + " → " + L.src + " 但檔案不存在（語言選單會選了沒反應）");
      var p = packs[L.code];
      t.ok(!!p, "語言包未以 code「" + L.code + "」呼叫 HL.i18n.register（引擎查不到＝整屏不翻譯，但畫面不會報錯）");
      if (!p) return;
      var keys = Object.keys(p.dict || {});
      t.ok(keys.length > 200, L.code + " 字典只有 " + keys.length + " 條＝八成搬漏了（拆檔前 en 1143／zh-Hans 967）");
      var bad = keys.filter(function (k) { return typeof p.dict[k] !== "string" || !p.dict[k]; });
      t.equal(bad.length, 0, L.code + " 字典有空值/非字串譯文（會把畫面文字清空）：" + bad.slice(0, 5).join("、"));
    });
  }
});

selftest.register({
  id: "platform/i18n-packs-not-eager", group: "platform", env: "node", tier: "fast",
  title: "#100(b)：語言包不得被寫進 index.html 首屏 <script>（反向鎖——寫進去就等於沒拆）",
  run: function (t) {
    var scripts = staticScripts(indexHtml());
    var eager = scripts.filter(function (s) { return /\/src\/i18n\//.test(s); });
    t.equal(eager.length, 0,
      "index.html 首屏靜態載入了語言包：" + eager.join("、") + "＝拆檔省下的 KB 又全還回去了（語言包應由 core/i18n.js 按需注入）");
    // 不空心證明：語言包檔案確實存在，這條鎖不是因為「目錄空的」才過
    t.ok(i18nPackFiles().length >= 2, "src/i18n/ 應有 ≥2 支語言包，實得 " + i18nPackFiles().length + "（若為 0，上一條斷言會空過）");
  }
});

selftest.register({
  id: "platform/i18n-engine-size", group: "platform", env: "node", tier: "fast",
  title: "#100(c)：core/i18n.js 只准放引擎——體積上限 40KB（拆檔前 160KB，拆檔後 ~13KB）",
  run: function (t) {
    var kb = fs.statSync(I18N_ENGINE).size / 1024;
    t.ok(kb <= 40, "core/i18n.js 已達 " + kb.toFixed(1) + "KB ⇒ 字典正在回流引擎（新譯文請加進 src/i18n/<code>.js，不是這裡）");
    var eng = fs.readFileSync(I18N_ENGINE, "utf8");
    t.ok(!/^\s*var (EN|HANS) = \{/m.test(eng), "引擎內不得再出現 var EN / var HANS 字典字面量");
    // 引擎本身也必須真的是引擎（防「整個檔被清空」這種讓上面兩條都過的壞法）
    t.ok(/MutationObserver/.test(eng) && /function setLang/.test(eng), "引擎主體（observer / setLang）應仍在本檔");
  }
});

selftest.register({
  id: "platform/i18n-boot-sync-load", group: "platform", env: "node", tier: "fast",
  title: "#100(d)：開機非預設語言必須走同步載入路徑（改成純非同步＝先閃一整屏中文）",
  run: function (t) {
    var eng = fs.readFileSync(I18N_ENGINE, "utf8");
    t.ok(/function ensureSync\(/.test(eng), "ensureSync 不見了（開機同步載入路徑是零閃爍的唯一保證）");
    t.ok(/document\.write\(/.test(eng), "ensureSync 必須走 document.write 的剖析阻塞注入（動態 <script> 不阻塞剖析＝擋不住閃爍）");
    // 開機分支確實呼叫它：取 `if (lang() !== "zh-Hant") { … }` 那段來看
    var i = eng.lastIndexOf('if (lang() !== "zh-Hant")');
    t.ok(i > 0, "找不到開機的非預設語言分支");
    var boot = eng.slice(i, i + 600);
    t.ok(/ensureSync\(/.test(boot), "開機分支未呼叫 ensureSync ⇒ 字典會晚於 main.js 首次 render 到位");
    // 切換語言則相反：必須等字典載完才 commit，否則先重繪中文再閃外語
    var sl = eng.slice(eng.indexOf("function setLang("), eng.indexOf("function commitLang("));
    t.ok(/ensure\(code\)/.test(sl) && /commitLang/.test(sl), "setLang 必須 ensure(code) 後才 commitLang（否則切語言會閃）");
    // index.html 仍必須靜態載入引擎本身（引擎晚到＝register 無處可去）
    t.ok(staticScripts(indexHtml()).some(function (s) { return /core\/i18n\.js$/.test(s); }),
      "core/i18n.js 必須留在 index.html 首屏（語言包 register 的落點）");
  }
});

/* ===================== #71 紅利壽命軸（platform · 2026-08-17 08:00 窗）=====================
 * 這張卡是全站**唯一會銷毀玩家已經看到的錢**的機制 ⇒ 鎖要釘住的不是「TTL 會不會生效」
 * （那由 core/bonus-ttl.js 自帶的純函式測項驗），而是**它在 progress.js 那一側的作用域**：
 *   (a) 逾期清理**碰不到 unlocked**——「已達流水而轉入可領取的錢不得被回頭作廢」是卡上的信任紅線。
 *       這裡逐字掃 bSweep 的函式體，因為那是唯一有權刪 entry 的地方。
 *   (b) 壽命**在授予當下凍結**——`exp` 只能在 mkEntry 寫一次，任何「載入時重算」都會讓調表追溯縮短既有紅利。
 *   (c) **不得靜默蒸發**——作廢必須同時走 HL.ledger（成本可稽核）與 HL.notify（玩家看得到），面板必須顯示倒數。
 *   (d) 壽命不同**不得併筆**（沿 #89 對 scope 的同一條裁決）。
 *   (e) 帳本的回沖是**扣 promo 而非扣 bonus**——毛額與淨額都要看得到，且回沖不得大於發出去的量。
 * 為什麼只能靜態掃：progress.js 開檔第一行就取 `HL.dom.el`，沒有 node 契約、require 會直接爆
 *   ⇒ 本卡的瀏覽器側行為（倒數、通知）在排程輪無法實跑，靜態鎖是能取得的最強保證。
 * ======================================================================================== */

var PROGRESS_SRC_F = path.join(ROOT, "src", "core", "progress.js");
var BONUS_TTL_SRC = path.join(ROOT, "src", "core", "bonus-ttl.js");

// 以 brace matching 取出具名函式的函式體（會跳過字串／註解內的括號）
function fnBody(src, name) {
  var i = src.indexOf("function " + name + "(");
  if (i < 0) return "";
  var j = src.indexOf("{", i);
  if (j < 0) return "";
  var depth = 0, inStr = null, esc = false, line = false, blk = false;
  for (var k = j; k < src.length; k++) {
    var c = src[k], n = src[k + 1];
    if (line) { if (c === "\n") line = false; continue; }
    if (blk) { if (c === "*" && n === "/") { blk = false; k++; } continue; }
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "/" && n === "/") { line = true; k++; continue; }
    if (c === "/" && n === "*") { blk = true; k++; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return src.slice(j, k + 1); }
  }
  return "";
}
// 去掉註解，讓「逐字掃關鍵字」不會被說明文字誤導（本卡的註解裡就寫滿了 unlocked）
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

selftest.register({
  id: "platform/bonus-ttl-cannot-touch-unlocked", group: "platform", env: "node", tier: "fast",
  title: "#71 (a·信任紅線)：逾期清理碰不到 unlocked——已解鎖的錢不存在被回頭作廢的路徑",
  run: function (t) {
    var src = fs.readFileSync(PROGRESS_SRC_F, "utf8");
    var sweep = stripComments(fnBody(src, "bSweep"));
    t.ok(sweep.length > 100, "應取得 bSweep 函式體（實測 " + sweep.length + " 字元）");
    t.ok(!/unlocked/.test(sweep),
      "bSweep 內不得出現 unlocked——唯一有權刪 entry 的地方一旦碰得到 unlocked，紅線就只剩宣稱");
    t.ok(/HL\.bonusTtl\.sweep\(/.test(sweep), "作廢判定必須委派給純函式 HL.bonusTtl.sweep（node 驗的即瀏覽器跑的）");
    // 純函式那一側：簽章只有 (entries, now)，結構上拿不到 unlocked
    var ttl = require(BONUS_TTL_SRC);
    t.equal(ttl.sweep.length, 2, "HL.bonusTtl.sweep 的簽章必須只有 (entries, now)");
    // 達標的 entry 靠 shift() 離開 ledger ⇒ TTL 的作用域從此夠不著它
    var onw = stripComments(fnBody(src, "bOnWager"));
    t.ok(/entries\.shift\(\)/.test(onw), "bOnWager 必須以 entries.shift() 把達標的紅利移出 ledger（TTL 夠不著的前提）");
    t.ok(!/\bexp\b/.test(onw), "bOnWager 不得讀寫 exp（流水推進與壽命是兩件事，混在一起會出現「推進時順便延期/縮期」）");
    // 領取路徑同樣不得沾 TTL
    var claim = stripComments(fnBody(src, "bclaim"));
    t.ok(!/\bexp\b/.test(claim) && !/bonusTtl/.test(claim), "bclaim 不得涉及壽命（可領取的錢沒有期限）");
  }
});

selftest.register({
  id: "platform/bonus-ttl-frozen-at-grant", group: "platform", env: "node", tier: "fast",
  title: "#71 (b·紀律②)：exp 只在授予當下寫一次——不得有任何「載入時重算壽命」的路徑",
  run: function (t) {
    var raw = fs.readFileSync(PROGRESS_SRC_F, "utf8");
    var src = stripComments(raw);
    // 全檔對 e.exp / entry.exp 的**指派**只能出現在 mkEntry 裡
    var assigns = src.match(/\.exp\s*=\s*/g) || [];
    t.equal(assigns.length, 1, "全檔對 .exp 的指派只能有一處（在 mkEntry），實測 " + assigns.length + " 處");
    var mk = stripComments(fnBody(raw, "mkEntry"));
    t.ok(/e\.exp\s*=/.test(mk), "唯一那處指派必須在 mkEntry 內");
    t.ok(/if\s*\(exp\s*>\s*0\)/.test(mk),
      "壽命為 0（未註冊來源）時不得寫 exp 欄位——零回歸靠「欄位不存在」而非比對");
    // 求值出口帶站別，且只被 mkEntry / badd 的併筆判斷用
    var ttlFor = stripComments(fnBody(raw, "ttlExpFor"));
    t.ok(/isLive\(\)/.test(ttlFor) && /expAt\(/.test(ttlFor), "壽命求值必須帶站別並委派 HL.bonusTtl.expAt");
    t.ok(/!HL\.bonusTtl/.test(ttlFor), "HL.bonusTtl 未載入時必須退化為不到期（只退化、不當機）");
    // 舊存檔沒有 exp ⇒ 永不到期，這條由純函式側保證，這裡確認呼叫端沒有補寫欄位的行為
    var bs = stripComments(fnBody(raw, "bstate"));
    t.ok(!/\.exp\s*=/.test(bs), "bstate（載入路徑）不得補寫 exp——那等於對舊紅利追溯加上壽命");
  }
});

selftest.register({
  id: "platform/bonus-ttl-not-silent", group: "platform", env: "node", tier: "fast",
  title: "#71 (c·不變量 a/b)：作廢不得靜默——帳本回沖 + 玩家通知 + 面板倒數，三者缺一不可",
  run: function (t) {
    var raw = fs.readFileSync(PROGRESS_SRC_F, "utf8");
    var sweep = stripComments(fnBody(raw, "bSweep"));
    t.ok(/HL\.ledger\.record\("bonus_void"/.test(sweep), "作廢必須在 HL.ledger 記一筆 bonus_void（成本回沖可稽核）");
    t.ok(/HL\.notify\.add\(/.test(sweep), "作廢必須發通知（不得靜默蒸發玩家看得到的錢）");
    t.ok(/dueSoon\(/.test(sweep), "必須有到期前提醒（卡上不變量 a）");
    t.ok(/\.wn\s*=\s*1/.test(sweep), "提醒必須標記，否則每次載入都會重複轟炸同一筆");
    /* ⚠️ 上面四條只證明「那幾行字還在」。負向擾動實測：把守衛改成 `if (false)` 時**四條全綠**
     *   ——因為被停用的程式碼仍然存在於原始碼裡。⇒ 逐一檢查每個出口的**守衛條件本身**，
     *   比照 `platform/self-exclusion-single-writer` 的「只准這幾種右手邊」形制。
     * ⚠️ 第二個坑（第二輪擾動才抓到）：bSweep 裡有**兩個** `HL.notify.add(`（逾期作廢／到期前提醒），
     *   用 `indexOf` 只會看到第一個 ⇒ **把「已逾期」那則整行刪掉時，測項會找到「即將到期」那則而全綠**。
     *   ⇒ 改為「逐則以標題定位、逐則檢查守衛」，並釘死兩則都必須在。 */
    var NOTES = [
      { needle: 'HL.ledger.record("bonus_void"', guard: "HL.ledger", why: "逾期作廢必須回沖帳本" },
      { needle: '"紅利已逾期"', guard: "HL.notify", why: "作廢當下必須通知玩家" },
      { needle: '"紅利即將到期"', guard: "HL.notify", why: "到期前必須先提醒（不變量 a）" }
    ];
    NOTES.forEach(function (n) {
      var at = sweep.indexOf(n.needle);
      t.ok(at > 0, n.why + "：找不到 " + n.needle);
      var before = sweep.slice(Math.max(0, at - 200), at);
      var g = /if\s*\(([^)]*)\)\s*[^)]*$/.exec(before);
      t.ok(!!g, n.needle + " 應被一個 if 守衛（實測前文尾："+ before.slice(-70).trim() + "）");
      t.equal(g[1].trim(), n.guard,
        n.needle + " 的守衛只能是 " + n.guard + " 是否載入，不得是任何常數假值（被停用的程式碼仍然看得到）");
    });
    t.equal((sweep.match(/HL\.notify\.add\(/g) || []).length, 2,
      "bSweep 必須有且只有兩則通知（逾期作廢 + 到期前提醒）——刪掉其中一則不得靜默通過");
    // 面板：領取中心必須顯示倒數與規則說明
    var open = stripComments(fnBody(raw, "bonusOpen"));
    t.ok(/expLeftMs/.test(open), "領取中心必須顯示本筆紅利的到期倒數（不變量 b：面板明示壽命）");
    t.ok(/HL\.dom\.dhm\(/.test(open), "倒數應複用共用格式化出口 HL.dom.dhm（不得再刻一份）");
    // 同一個坑的第二處：面板那兩行必須**真的由 expLeftMs 決定**，不能被常數短路掉
    var cds = open.match(/st\.head\.expLeftMs != null \?\s*el\(/g) || [];
    t.equal(cds.length, 2, "倒數行與規則行都必須以 `expLeftMs != null ? el(` 渲染（實測 " + cds.length + " 處）");
    // ⚠️ 這條的首版寫成 `\b(false|0)\s*\?\s*el\(`，在**乾淨樹上就是紅的**——`\b0` 咬到了既有的
    //    `rest > 0 ? el(`（#20 的「其餘排隊中」行）。而它一紅，整輪負向擾動的每一例都會看到這條紅燈
    //    ⇒ 差點把 11 例「被抓到」全部誤判成鎖有效。**擾動前必須先確認乾淨樹全綠**，否則量的是雜訊。
    t.ok(!/(^|[^.\w>=<!])(false|true)\s*\?\s*el\(/.test(open),
      "面板不得有被常數短路掉的渲染分支（那是「看起來還在、其實不會畫」）");
    // bStatus 要把壽命一路帶到 UI，否則面板拿不到
    var stf = stripComments(fnBody(raw, "bStatus"));
    t.ok(/expLeftMs/.test(stf), "bStatus 必須輸出 expLeftMs 供面板使用");
    // 說明中心（#72）必須有一條公開條款
    var ttlSrc = fs.readFileSync(BONUS_TTL_SRC, "utf8");
    t.ok(/HL\.support\.register\(/.test(ttlSrc) && /bonus\/ttl/.test(ttlSrc),
      "壽命條款必須在說明中心有公開出口（玩家有權事先知道）");
    t.ok(/HL\.econCfg\.register\(/.test(ttlSrc), "壽命是經濟旋鈕，必須向 HL.econCfg 自我描述（#90）");
  }
});

selftest.register({
  id: "platform/bonus-ttl-merge-guard", group: "platform", env: "node", tier: "fast",
  title: "#71 (d)：壽命不同的紅利不得併筆（併了會靜默改掉其中一半的到期日）",
  run: function (t) {
    var raw = fs.readFileSync(PROGRESS_SRC_F, "utf8");
    var add = stripComments(fnBody(raw, "badd"));
    t.ok(/sameScope\(/.test(add), "併筆條件必須仍含 #89 的 sameScope（不得因本卡而弱化既有守則）");
    t.ok(/sameExp\(/.test(add), "併筆條件必須加上 sameExp（壽命不同不得併）");
    t.ok(/mkEntry\(n, sc, src\)/.test(add), "新 entry 必須把 source 傳進 mkEntry，否則壽命永遠查不到");
    var se = stripComments(fnBody(raw, "sameExp"));
    t.ok(/\(a \|\| 0\) === \(b \|\| 0\)/.test(se),
      "sameExp 必須把 undefined 與 0 視為同一種「不到期」，否則未註冊來源的併筆行為會被改掉");
  }
});

selftest.register({
  id: "platform/bonus-void-reverses-cost", group: "platform", env: "node", tier: "fast",
  title: "#71 (e)：逾期回沖扣的是 promo 不是 bonus——毛額與淨額都要看得到，且回沖不得超額",
  run: function (t) {
    var led = require(path.join(ROOT, "src", "core", "ledger.js"));
    t.ok(led.TYPES.indexOf("bonus_void") >= 0, "bonus_void 應是合法交易型別");
    t.equal(led.CASH_IN.indexOf("bonus_void"), -1, "作廢不是現金流入");
    t.equal(led.CASH_OUT.indexOf("bonus_void"), -1, "作廢不是現金流出");

    var f = led.freshTotals(), x = f.totals;
    x.bet = 100000; x.win = 90000; x.bonus = 5000; x.faucet = 1000;
    var before = led.deriveFrom(x, f.counts, {});
    t.equal(before.promo, 6000, "回沖前送幣成本＝紅利+救濟");
    t.equal(before.ngr, 4000, "回沖前 NGR＝GGR 10000 − 送幣 6000");
    t.equal(before.bonusVoid, 0, "沒有作廢事件時回沖為 0");

    x.bonus_void = 2000;
    var after = led.deriveFrom(x, f.counts, {});
    t.equal(after.bonus, 5000, "毛紅利不得被回沖改動（發出去多少仍要看得到）");
    t.equal(after.bonusVoid, 2000, "回沖額應單獨可見");
    t.equal(after.promo, 4000, "送幣成本應淨掉回沖：6000 − 2000");
    t.equal(after.ngr, 6000, "NGR 應隨成本回沖上升：10000 − 4000");
    t.equal(after.ggr, before.ggr, "回沖不得改動 GGR（那是投注面的事）");
    t.equal(after.cashNet, before.cashNet, "回沖不得汙染淨現金流（沒有錢跨越平台邊界）");

    // 超額夾住：存檔被清空而 void 事件仍進來時，負的 promo 會讓 NGR 憑空變好看
    var g = led.freshTotals(), y = g.totals;
    y.bet = 1000; y.win = 500; y.bonus = 100; y.faucet = 0; y.bonus_void = 999999;
    var clamped = led.deriveFrom(y, g.counts, {});
    t.equal(clamped.promo, 0, "回沖不得讓送幣成本變成負數");
    t.equal(clamped.bonusVoid, 100, "回沖額應被夾到「實際發出去的量」");
    t.equal(clamped.ngr, 500, "夾住後 NGR 恰等於 GGR（成本全數回沖，但不會倒貼給自己）");
    // 負值輸入不得反向灌水
    var h = led.freshTotals(), z = h.totals;
    z.bonus = 500; z.bonus_void = -800;
    t.equal(led.deriveFrom(z, h.counts, {}).promo, 500, "負的作廢額必須被視為 0，不得反向膨脹送幣成本");
  }
});

/* ===================== 測項註冊與載入序的脫鉤（platform · #101 · 2026-08-17 14:00 窗）==========
 * 【前情】08:00 窗立了一條**棘輪**（SELFTEST_ORDER_DEBT，7 支「排在 selftest.js 之前」的模組，
 *   宣稱合計 36 個測項在瀏覽器端從未註冊過），並把逐檔修復開成 #101。
 * 【本輪機械複驗推翻了那個數字】用 vm + DOM shim 依 index.html 的 <script> 序真的跑一遍、再 fire
 *   DOMContentLoaded 後讀 HL.selftest._reg，實測 **7 支裡有 4 支（econ-config 2／ledger 3／
 *   rakeback-core 6／rakeboost 9＝20 項）本來就註冊得到**——它們早有
 *   `else addEventListener("DOMContentLoaded", …)` 的延後分支（分別由 #90／#56／#60／#52 補過）。
 *   ⇒ 舊棘輪的判準是 **grep 載入位置**，而位置只是**代理指標**：它把「排得早」直接當成「收不到」，
 *   對已經自己延後註冊的模組**全部誤報**。真正的缺口是 **3 支／16 項**：
 *   `rewards.js`(6·有 if 沒 else)、`wager-scope.js`(5)、`score-axis.js`(5)（後兩者無條件呼叫，
 *   而 registerTests 對 falsy st 會 early-return ⇒ 連錯都不報）。
 * 【本輪的修法不是逐檔調位置，而是讓位置不再有意義】selftest.js 新增延後註冊佇列 `HL._selftestQ`：
 *   早於它的模組先排隊、它一載入就清算。15 支模組全部收斂成同一個形狀。
 *   ⇒ 於是**棘輪本身失去了守護對象**（載入序不再能造成靜默漏註冊），故不是「把名單清空」，
 *   而是換成守護真正的不變量：**沒有任何模組可以再寫出「拿不到 HL.selftest 就默默不註冊」的形狀**。
 * 【為什麼不留著舊棘輪】留著它＝繼續用代理指標記帳，而它已被證明會誤報 4/7；
 *   同一條 id 改守真不變量，比新增一條、放任舊條繼續紅/綠都不對要誠實。
 * ============================================================================================ */

selftest.register({
  id: "platform/selftest-registration-order", group: "platform", env: "node", tier: "fast",
  title: "測項註冊與載入序脫鉤：不得再出現「拿不到 HL.selftest 就靜默不註冊」的形狀",
  run: function (t) {
    var html = indexHtml();
    var order = [], re = /<script[^>]*src="\.\/([^"]+)"/g, m;
    while ((m = re.exec(html))) order.push(m[1]);
    t.ok(order.indexOf("src/core/selftest.js") > 0, "index.html 應載入 src/core/selftest.js");

    // ① 容器側：selftest.js 必須真的清算佇列（不是只宣告一個空陣列）
    var st = fs.readFileSync(path.join(ROOT, "src/core/selftest.js"), "utf8");
    t.ok(/HL\._selftestQ/.test(st), "selftest.js 應有延後註冊佇列 HL._selftestQ");
    t.ok(/while\s*\(q\.length\)/.test(st) && /q\.shift\(\)/.test(st),
      "selftest.js 必須把佇列**清空**（while + shift），否則排隊者只是被記下、不會被註冊");

    // ② 模組側：凡定義 registerTests 的檔，都必須是「直通 or 排隊」兩分支的形狀。
    //    反面教材（本輪修掉的三種）：有 if 沒 else／無條件呼叫／DOMContentLoaded 延後。
    var scanned = 0, bad = [];
    order.forEach(function (rel) {
      if (!/^src\//.test(rel)) return;
      var src;
      try { src = fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch (e) { return; }
      // 去註解後再判：註解裡的反面教材不算違反（08-14/08-17 兩度確立的量測紀律）
      var code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      if (!/function\s+registerTests\s*\(/.test(code)) return;
      scanned++;
      var hasDirect = /if\s*\(HL\.selftest\)\s*registerTests\(HL\.selftest\)\s*;/.test(code);
      var hasQueue = /else\s*\(HL\._selftestQ\s*=\s*HL\._selftestQ\s*\|\|\s*\[\]\)\.push\(registerTests\)\s*;/.test(code);
      if (!hasDirect || !hasQueue) bad.push(rel + (hasDirect ? "（缺 else 排隊分支）" : "（缺直通分支）"));
      // DOMContentLoaded 延後法已被佇列取代：留著它＝同一件事兩套機制，且會晚一個 tick 才註冊
      if (/DOMContentLoaded[^)]*\)\s*,?\s*function\s*\(\)\s*\{\s*registerTests/.test(code)) {
        bad.push(rel + "（仍用 DOMContentLoaded 延後註冊，應改走 HL._selftestQ）");
      }
    });
    t.equal(bad.length, 0, "以下模組的測項註冊形狀不合規：" + bad.slice(0, 6).join("、"));

    // ③ 不空心：本鎖必須真的掃到東西（否則正則寫錯時會靜默全綠）
    t.ok(order.length > 50, "應掃到全部 <script>（實測 " + order.length + " 支）");
    t.ok(scanned >= 15, "應掃到全部定義 registerTests 的模組（實測 " + scanned + " 支，2026-08-17 為 15 支）");
  }
});

/* ===================== #57 限量挑戰「先搶先贏」（2026-08-18 平台軌） =====================
 * `core/challenges.js` 因 `HL.dom.el` 在模組頂層取用而 node 不可 require ⇒ 只能靜態解析；
 * 可算錯的名額算術已另外搬進純函式 `core/challenge-slots.js`（那一側有自己的四條紀律測項）。
 * 這裡守的是**三個結構決定**，它們都是「一旦被繞過就靜默失效、外觀完全一樣」的那種：
 *   (a) 真站無伺服器仲裁者 ⇒ 限量挑戰**不供應**（不得靜默退化成無限名額＝真站比假站寬鬆，違反 §11）
 *   (b) 沒搶到名額就不得派彩（否則「先搶先贏」只是文案，人人達標人人拿）
 *   (c) 名額算術**只有一份**（委派 HL.chalSlots），challenges.js 不得自己再算一次 */
var CHALLENGES_F = path.join(ROOT, "src", "core", "challenges.js");
var CHAL_SLOTS_F = path.join(ROOT, "src", "core", "challenge-slots.js");

selftest.register({
  id: "platform/limited-challenge-live-gate", group: "platform", env: "node", tier: "fast",
  title: "#57 (a)：真站無仲裁者時限量挑戰不供應——且 DAILY 只准 specs()／hiddenCount() 兩個讀者",
  run: function (t) {
    var raw = fs.readFileSync(CHALLENGES_F, "utf8");
    var code = stripComments(raw);
    var sp = stripComments(fnBody(raw, "specs"));
    t.ok(sp.length > 20, "應取得 specs() 函式體（實測 " + sp.length + " 字元）");
    t.ok(/isLive\(\)/.test(sp) && /ARBITER/.test(sp),
      "specs() 必須同時看站別與仲裁者——少了任一個，真站就會供應一個自己仲裁不了的限量挑戰");
    t.ok(/slots\s*!=\s*null/.test(sp), "濾除條件必須以「有沒有宣告 slots」為準（未宣告者零回歸）");
    /* ⚠️ 上面三條只證明「那幾個字還在」。真正結構性的一條在下面：
     *   只要有**第二個**地方直接掃 DAILY，這道閘就被繞過了，而且測項與畫面都看不出差別。
     *   首版的 specOf 正是如此（靠 claim 的 grab 前置條件巧合擋住）⇒ 釘死讀者數。 */
    var readers = (code.match(/\bDAILY\b/g) || []).length;
    t.equal(readers, 3, "DAILY 在去註解後只准出現 3 次（宣告 + specs + hiddenCount），實測 " + readers + " 次");
    t.ok(/function\s+specOf\s*\([^)]*\)\s*\{[^}]*specs\(\)/.test(code),
      "specOf 必須查 specs() 而非 DAILY（否則真站仍找得到被濾掉的限量挑戰）");
    // 面板必須據實說明「為什麼真站少了這一條」，不得靜默消失
    t.ok(/hiddenCount\(\)/.test(code) && /真站模式：限量挑戰需伺服器仲裁名額/.test(raw),
      "真站濾掉限量挑戰時，面板必須說明原因（靜默消失＝玩家以為活動沒了）");
    // 容器留著：接上後端只要註冊仲裁者就恢復供應
    /* ⚠️ 負向擾動抓到的盲區：這條原本寫 `[^}]*setArbiter`，把出口改名成 `setArbiterX` **仍全綠**
     *   （前綴也匹配）⇒ 必須釘死冒號，鎖的是「叫這個名字的出口」而不是「出現過這串字」。 */
    t.ok(/HL\.challenges\s*=\s*\{[^}]*\bsetArbiter\s*:/.test(code),
      "必須對外出口 setArbiter（容器先於內容：後端到位時一行恢復供應）");
  }
});

selftest.register({
  id: "platform/limited-challenge-no-slot-no-pay", group: "platform", env: "node", tier: "fast",
  title: "#57 (b)：沒搶到名額就沒有獎金，且名額在「達標當下」結算而非領取時",
  run: function (t) {
    var raw = fs.readFileSync(CHALLENGES_F, "utf8");
    var claim = stripComments(fnBody(raw, "claim"));
    t.ok(claim.length > 50, "應取得 claim() 函式體");
    // 派彩前必須有「限量型且沒搶到 → return 0」的守衛，且它要排在 bonus.add 之前
    var guard = /c\.slots\s*!=\s*null\s*&&\s*!\s*\(\s*o\.grab[^)]*\)\s*\)\s*return\s+0/.test(claim);
    t.ok(guard, "claim() 必須有「限量型且無 grab 記錄即 return 0」的守衛");
    var gi = claim.search(/o\.grab/), bi = claim.indexOf("HL.bonus.add");
    t.ok(gi >= 0 && bi >= 0 && gi < bi, "該守衛必須排在 HL.bonus.add 之前（實測 grab@" + gi + " / add@" + bi + "）");
    t.ok(/HL\.bonus\.add\([^)]*source/.test(claim), "獎勵必須走 HL.bonus.add 帶 source（§4：不得直接改餘額，帳本靠 source 記帳）");
    t.ok(!/balance\s*[+\-]?=/.test(claim), "claim() 不得直接動餘額");
    /* 「先搶先贏」的語意在**達標那一刻**，不是在領獎那一刻：
     *   若把名額結算搬到 claim()，玩家可以達標後慢慢等、名額仍替他保留 ⇒ 就不是先搶先贏了。 */
    var rec = stripComments(fnBody(raw, "record"));
    t.ok(/o\.grab\[c\.id\]\s*=\s*Date\.now\(\)/.test(rec), "名額必須在 record()（達標當下）就寫入 grab");
    t.ok(/st\.open/.test(rec), "寫入前必須先問名額是否還開著（slotState().open）");
    t.ok(!/o\.grab\[[^\]]*\]\s*=/.test(claim), "claim() 不得寫入 grab（結算點只有一個）");
    // 殼層徽章不得把「達標但沒搶到」算成可領
    var cc = stripComments(fnBody(raw, "claimableCount"));
    t.ok(/limited/.test(cc) && /mine/.test(cc), "claimableCount 必須排除「達標但沒搶到名額」者，否則徽章會亮一個領不到的數字");
  }
});

selftest.register({
  id: "platform/limited-challenge-single-arithmetic", group: "platform", env: "node", tier: "fast",
  title: "#57 (c)：名額算術只有一份（委派 HL.chalSlots），且未宣告 slots 的既有挑戰零回歸",
  run: function (t) {
    var raw = fs.readFileSync(CHALLENGES_F, "utf8");
    var code = stripComments(raw);
    var ss = stripComments(fnBody(raw, "slotState"));
    t.ok(/HL\.chalSlots\.state\(/.test(ss), "名額狀態必須委派 HL.chalSlots.state（node 驗的即瀏覽器跑的那一份）");
    t.ok(/bots:\s*!isLive\(\)/.test(ss), "模擬對手必須帶站別閘（§4：真站不得有假活動）");
    t.ok(!/schedule\(/.test(code.replace(/chalSlots\.\w+/g, "")), "challenges.js 不得自行實作名額排程（單一真相）");
    // 既有三條 DAILY 必須逐位如舊：宣告區裡帶 slots 的只有本輪新增那一條
    var decl = raw.slice(raw.indexOf("var DAILY = ["), raw.indexOf("];", raw.indexOf("var DAILY = [")));
    var lines = decl.split("\n").filter(function (l) { return /\bid:\s*"/.test(l); });
    t.equal(lines.length, 4, "DAILY 應有 4 條（既有 3 + 本輪限量 1），實測 " + lines.length);
    var withSlots = lines.filter(function (l) { return /\bslots:/.test(l); });
    t.equal(withSlots.length, 1, "只有限量挑戰得宣告 slots，實測 " + withSlots.length + " 條");
    ["m2", "m10", "m50"].forEach(function (id) {
      var l = lines.filter(function (x) { return x.indexOf('id: "' + id + '"') >= 0; })[0] || "";
      t.ok(l && !/slots/.test(l), "既有挑戰 " + id + " 不得帶 slots（零回歸靠欄位不存在，不靠比對行為）");
    });
    // 純函式側確實是 node 可 require 的那一份（不是複製品）
    var cs = require(CHAL_SLOTS_F);
    t.ok(typeof cs.state === "function" && typeof cs.schedule === "function", "HL.chalSlots 必須 node 可 require");
    t.equal(cs.state({ startMs: 0, endMs: 10, now: 5 }).remaining, Infinity, "未宣告 slots 必須退化為無限名額");
    // #49 活動日曆接線（本卡指定）：限量挑戰有窗口、會結束 ⇒ 必須出現在日曆上
    t.ok(/HL\.promoCal\.register\(/.test(code) && /id:\s*"limited-challenge"/.test(code),
      "限量挑戰必須 register 進 #49 活動日曆");
    t.ok(/enabled:\s*function[^}]*specs\(\)/.test(code),
      "日曆上的啟用判斷必須即時查 specs()（真站濾掉時日曆同步不顯示，不需要第二套判斷）");
    // i18n：面板片語兩語言包都要有（P3 紀律：中文片語與數值分節點，故鍵本身不含數字）
    var packs = i18nPackFiles();
    ["剩餘名額", "名額已滿", "已被搶走"].forEach(function (k) {
      packs.forEach(function (f) {
        var src = fs.readFileSync(path.join(I18N_DIR, f), "utf8");
        t.ok(src.indexOf('"' + k + '"') >= 0, f + " 缺少限量挑戰片語鍵：" + k);
      });
    });
  }
});

/* ===================== #58 推薦/邀請好友（平台軌 2026-08-18 14:00 窗） =====================
 * 這三條鎖守的是本卡**唯一會靜默反向**的那一面：純前端沒有任何通道讓「我的裝置」知道有人
 * 用了我的碼 ⇒ 真站的推薦制若照發獎，就是「自己貼碼給自己就領錢」＝無限印幣（§11）。
 * 依 #57 立下的先例：真站無見證者時**據實不供應**、面板說明原因，而不是靜默退化。
 * ⚠️ 立鎖前先自問 #101 的教訓：「我記的這個數，是我要防的那件事本身，還是它的影子？」
 *   ⇒ 故三條都不去數載入位置／字串出現次數，而是鎖**出口的形狀**與**純函式的行為**。
 */
var REFERRAL_F = path.join(ROOT, "src", "core", "referral.js");
var REF_CORE_F = path.join(ROOT, "src", "core", "referral-core.js");

selftest.register({
  id: "platform/referral-live-gate", group: "platform", env: "node", tier: "fast",
  title: "#58 (a)：真站無見證者時不發推薦獎勵，但歸因照記（記錄 ≠ 付款）",
  run: function (t) {
    var raw = fs.readFileSync(REFERRAL_F, "utf8");
    var code = stripComments(raw);

    // 供應與否只有一個判斷式，且必須同時看站別與見證者
    var re = stripComments(fnBody(raw, "rewardsEnabled"));
    t.ok(re.length > 5, "應取得 rewardsEnabled() 函式體（實測 " + re.length + " 字元）");
    t.ok(/isLive\(\)/.test(re) && /ATTESTOR/.test(re),
      "rewardsEnabled() 必須同時看站別與見證者——少了任一個，真站就會發一筆沒人證明過的獎金");

    // 付款出口必須被這道閘擋住（鎖的是「錢的那條路」，不是面板文案）
    var pend = stripComments(fnBody(raw, "pending"));
    t.ok(/!\s*rewardsEnabled\(\)/.test(pend) && /return\s*\{/.test(pend),
      "pending() 必須在 !rewardsEnabled() 時直接回零（真站無見證者＝沒有任何可領金額）");
    var claim = stripComments(fnBody(raw, "claim"));
    t.ok(claim.indexOf("pending()") >= 0, "claim() 必須經由 pending() 取金額（不得另開一條計算路徑）");
    t.ok(/HL\.bonus\.add\([^)]*source/.test(claim),
      "獎勵必須走 HL.bonus.add 帶 source（§4：不得直接改餘額，帳本靠 source 記帳）");
    // 先寫進度、再送幣：中途失敗寧可少發也不重複發
    var si = claim.indexOf("save(o)"), bi = claim.indexOf("HL.bonus.add");
    t.ok(si >= 0 && bi >= 0 && si < bi, "claim() 必須先存進度再送幣（實測 save@" + si + " / add@" + bi + "）");

    // 歸因與付款分離：attribute() 不得被 rewardsEnabled 擋住（真站也要記，未來後端才結算得了）
    var attr = stripComments(fnBody(raw, "attribute"));
    t.ok(attr.indexOf("rewardsEnabled") < 0,
      "attribute() 不得看 rewardsEnabled——記錄不是付款，真站照記才有未來結算的依據");
    t.ok(/applyRef\(/.test(attr), "歸因必須走純函式 applyRef（寫一次/不可自我推薦由它結構保證）");

    // 真站好友清單結構上為空（本卡最重要的事實）
    var fr = stripComments(fnBody(raw, "friends"));
    t.ok(/isLive\(\)/.test(fr) && /return\s*\[\s*\]/.test(fr),
      "friends() 在真站無見證者時必須回空陣列（純前端沒有通道得知有人用了我的碼）");
    t.ok(/bots:\s*!isLive\(\)/.test(fr), "模擬好友必須綁 !isLive()（§4 假活動閘：真站不生成假社交證明）");

    // 面板據實說明，不靜默消失
    t.ok(/真站模式：推薦獎勵需伺服器見證雙方關係/.test(raw),
      "真站不發獎時面板必須說明原因（靜默不發＝玩家以為壞了）");
    // 容器留著：接上後端一行恢復供應（釘死冒號，避免 setAttestorX 這種前綴誤匹配——#57 負向擾動的教訓）
    t.ok(/HL\.referral\s*=\s*\{[\s\S]*?\bsetAttestor\s*:/.test(code),
      "必須對外出口 setAttestor（容器先於內容：後端到位時一行恢復供應）");
  }
});

selftest.register({
  id: "platform/referral-core-is-pure", group: "platform", env: "node", tier: "fast",
  title: "#58 (b)：可算錯的部分全在純函式層——node 驗的就是瀏覽器跑的那一份",
  run: function (t) {
    var core = stripComments(fs.readFileSync(REF_CORE_F, "utf8"));
    ["document", "localStorage", "HL.dom", "HL.site", "HL.ui"].forEach(function (bad) {
      t.ok(core.indexOf(bad) < 0, "referral-core.js 不得碰 " + bad + "（碰了就 node require 不動、鎖也咬不到）");
    });
    var c = require(REF_CORE_F);
    ["codeFor", "attributable", "applyRef", "tiers", "reached", "due", "settle", "simFriends"].forEach(function (k) {
      t.ok(typeof c[k] === "function", "HL.refCore 必須 node 可 require 且具備 " + k + "()");
    });
    // 殼層不得自己重算這些東西（第二份真相＝兩端會分岔）
    var shell = stripComments(fs.readFileSync(REFERRAL_F, "utf8"));
    t.ok(shell.indexOf("function settle") < 0 && shell.indexOf("function due") < 0,
      "referral.js 不得自行實作分階/結算算術（必須委派 refCore，否則會長出第二份真相）");
    t.ok(/HL\.refCore/.test(shell), "referral.js 必須取用 HL.refCore");
  }
});

selftest.register({
  id: "platform/referral-wiring", group: "platform", env: "node", tier: "fast",
  title: "#58 (c)：載入序、活動日曆、經濟旋鈕三處接線（少一處只會靜默少一塊）",
  run: function (t) {
    var html = indexHtml();
    var iCore = html.indexOf("core/referral-core.js"), iShell = html.indexOf("core/referral.js");
    var iCal = html.indexOf("core/promo-cal.js"), iEcon = html.indexOf("core/econ-config.js");
    t.ok(iCore >= 0 && iShell >= 0, "index.html 必須掛載 referral-core.js 與 referral.js");
    t.ok(iCore < iShell, "referral-core.js 必須排在 referral.js 之前（code()/tiers() 需要 HL.refCore）");
    t.ok(iCal >= 0 && iCal < iShell, "referral.js 必須排在 promo-cal.js 之後（宣告時要 register 進活動日曆）");
    t.ok(iEcon >= 0 && iEcon < iShell, "referral.js 必須排在 econ-config.js 之後（宣告時要 register 經濟旋鈕）");

    var code = stripComments(fs.readFileSync(REFERRAL_F, "utf8"));
    /* ⚠️ 負向擾動抓到的真洞（#57 教訓②「同一個字串出現兩次」的第二個變形）：
     *   這條原本寫成「全檔存在 HL.promoCal.register( 且全檔存在 id:"referral"」——但 `id: "referral"`
     *   在本檔出現**兩次**（日曆一次、econCfg 一次）⇒ 把日曆的 id 改成 "referralX"（活動日曆上整個消失）
     *   時測項**仍全綠**，因為它匹配到的是 econCfg 那一筆。⇒ 兩個 register 各自切出自己的區段再驗。 */
    var iCalReg = code.indexOf("HL.promoCal.register(");
    var iEconReg = code.indexOf("HL.econCfg.register(");
    t.ok(iCalReg >= 0, "推薦制必須 register 進 #49 活動日曆（本卡指定：把容器採用度缺口再補一個外部註冊者）");
    t.ok(iEconReg >= 0, "獎額必須 register 進 #90 經濟旋鈕表（儀表板的『真站不得比假站寬鬆』健檢才涵蓋得到）");
    t.ok(iCalReg >= 0 && /id:\s*"referral"\s*,/.test(code.slice(iCalReg, iCalReg + 400)),
      "活動日曆註冊的 id 必須是 \"referral\"（改掉＝這則活動從日曆上靜默消失）");
    t.ok(iEconReg >= 0 && /id:\s*"referral"\s*,/.test(code.slice(iEconReg, iEconReg + 400)),
      "經濟旋鈕註冊的 id 必須是 \"referral\"（改掉＝儀表板健檢靜默漏掉本卡獎額）");
    /* ⚠️ #90 紀律 ②：描述子必須**當場求值**、不得手抄數字，否則改階梯時會長出第二份真相
     *   （ops-dashboard 的 STATIC_RISKS 就是前車之鑑）。 */
    var desc = code.slice(code.indexOf("HL.econCfg.register("));
    t.ok(/tiers\(false\)/.test(desc) && /tiers\(true\)/.test(desc),
      "econCfg 描述子必須當場從 refCore.tiers() 求值（不得手抄百分比/金額字面量）");

    // 大廳入口（沒有入口＝玩家永遠找不到）
    var shellSrc = fs.readFileSync(path.join(ROOT, "src", "layout", "app-shell.js"), "utf8");
    t.ok(/HL\.referral\.open\(\)/.test(shellSrc), "福利中心必須有『邀請好友』入口（否則整張卡在畫面上不存在）");

    // i18n：面板整節點片語兩語言包都要有（P3：中文片語與數值分節點，故鍵不含數字）
    var packs = i18nPackFiles();
    ["我的邀請碼", "分享邀請連結", "我邀請的好友", "領取推薦獎勵", "套用邀請碼"].forEach(function (k) {
      packs.forEach(function (f) {
        var src = fs.readFileSync(path.join(I18N_DIR, f), "utf8");
        t.ok(src.indexOf('"' + k + '"') >= 0, f + " 缺少推薦制片語鍵：" + k);
      });
    });
  }
});

// ── #110 整頁 view 延遲載入（lazyViews）三條鎖 ────────────────────────────────
// 為什麼與上面 lazy-games 的鎖分開寫：兩者的「換手對象」不同——遊戲換的是
// HL.games 裡那筆 meta 的 render，整頁 view 換的是 HL.views[id] 這個物件本身
// （還可能帶 render 以外的方法，例 liveroom.enter）⇒ 風險面不同，鎖也不同。
var lazyViews = (function () {
  try { return require(path.join(ROOT, "src", "data", "lazy-views.js")); }
  catch (e) { return null; }
})();

function srcDirFiles() {
  var out = [];
  (function walk(d) {
    fs.readdirSync(d).forEach(function (f) {
      var full = path.join(d, f), st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.js$/.test(f)) out.push(full);
    });
  })(path.join(ROOT, "src"));
  return out;
}

selftest.register({
  id: "platform/lazy-views-manifest", group: "platform", env: "node", tier: "fast",
  title: "view 延遲載入清單完整性：src 存在／不再靜態掛載／容器已掛／宣告的 id 與方法真的存在於該檔",
  run: function (t) {
    if (!lazyViews || !lazyViews.manifest) t.skip("lazy-views.js 未載入");
    var man = lazyViews.manifest;
    t.ok(man.length > 0, "清單不得為空");

    var html = indexHtml(), statics = staticScripts(html);
    t.ok(statics.indexOf("./src/data/lazy-views.js") >= 0,
      "index.html 必須掛載 lazy-views.js，否則 globe/liveroom/bounty/vsslot/opsBoard 全數變成不存在的路由");
    t.ok(statics.indexOf("./src/core/lazy-load.js") >= 0,
      "index.html 必須掛載 core/lazy-load.js（lazyGames 與 lazyViews 共用的注入原語）");

    var seen = {};
    man.forEach(function (e) {
      t.ok(!!e.src, "清單每列都要有 src");
      var file = path.join(ROOT, e.src.replace(/^\.\//, ""));
      t.ok(fs.existsSync(file), "清單 src 不存在：" + e.src);
      // 延遲載入的檔不得同時還靜態掛著（否則首屏一點沒省，且該檔會被執行兩次）
      t.ok(statics.indexOf(e.src) < 0, "已列入延遲載入卻仍靜態掛載：" + e.src);
      t.ok((e.views || []).length + (e.globals || []).length > 0, e.src + " 沒有宣告任何 view 或 global");

      var src = fs.readFileSync(file, "utf8");
      (e.views || []).forEach(function (v) {
        t.ok(!seen[v.id], "id 重複：" + v.id);
        seen[v.id] = true;
        // 換手的唯一機制＝該檔自己那句 HL.views.<id> = {...}；沒有它 stub 永遠不會被覆蓋
        t.ok(new RegExp("HL\\.views\\." + v.id + "\\s*=").test(src),
          e.src + " 並未 `HL.views." + v.id + " = ` ⇒ stub 永遠換不掉，玩家只會看到「載入中」");
        (v.methods || []).forEach(function (m) {
          t.ok(new RegExp("[{,]\\s*" + m + "\\s*:").test(src),
            e.src + " 宣告了方法 " + m + " 但該檔的註冊物件沒有這個成員");
        });
      });
      (e.globals || []).forEach(function (g) {
        t.ok(!seen[g.ns], "命名空間重複：" + g.ns);
        seen[g.ns] = true;
        t.ok(new RegExp("HL\\." + g.ns + "\\s*=").test(src),
          e.src + " 並未 `HL." + g.ns + " = ` ⇒ 呼叫方載入後仍拿到 stub");
        t.ok((g.methods || []).length > 0, g.ns + " 未宣告任何方法（stub 會是空物件，呼叫即 TypeError）");
        (g.methods || []).forEach(function (m) {
          t.ok(new RegExp("[{,]\\s*" + m + "\\s*:").test(src),
            e.src + " 宣告了 " + g.ns + "." + m + " 但該檔沒有這個成員");
        });
      });
    });
  }
});

// 延遲載入唯一的新風險面：**有人同步呼叫了一個還沒載入的成員**。
// render 與清單宣告的 methods 有 stub 接著；其餘成員在載入前是 undefined ⇒ TypeError。
selftest.register({
  id: "platform/lazy-views-consumer-guard", group: "platform", env: "node", tier: "fast",
  title: "延遲 view 的跨檔同步呼叫只准碰 render 或清單宣告的方法（其餘在載入前是 undefined）",
  run: function (t) {
    if (!lazyViews || !lazyViews.manifest) t.skip("lazy-views.js 未載入");
    var allowView = {}, allowNs = {}, ownerOf = {};
    lazyViews.manifest.forEach(function (e) {
      var owner = path.basename(e.src);
      (e.views || []).forEach(function (v) {
        allowView[v.id] = ["render"].concat(v.methods || []);
        ownerOf["view:" + v.id] = owner;
      });
      (e.globals || []).forEach(function (g) {
        allowNs[g.ns] = (g.methods || []).slice();
        ownerOf["ns:" + g.ns] = owner;
      });
    });
    var vids = Object.keys(allowView), nss = Object.keys(allowNs);
    t.ok(vids.length > 0 || nss.length > 0, "清單未宣告任何延遲表面");

    var checked = 0;
    srcDirFiles().forEach(function (file) {
      var base = path.basename(file), src = fs.readFileSync(file, "utf8");
      if (base === "lazy-views.js") return; // 容器自己就是在造 stub
      vids.forEach(function (id) {
        if (base === ownerOf["view:" + id]) return; // 擁有者自己隨便用
        var re = new RegExp("HL\\.views\\." + id + "\\.([A-Za-z_$][\\w$]*)", "g"), m;
        while ((m = re.exec(src))) {
          checked++;
          t.ok(allowView[id].indexOf(m[1]) >= 0,
            base + " 同步呼叫 HL.views." + id + "." + m[1] +
            "，但它是延遲載入的 view 且該成員未列入清單 methods ⇒ 未載入時為 undefined。" +
            "修法：把 " + m[1] + " 加進 lazy-views.js 該列的 methods，或改走 HL.lazyViews.load('" + id + "').then(...)");
        }
      });
      nss.forEach(function (ns) {
        if (base === ownerOf["ns:" + ns]) return;
        var re = new RegExp("HL\\." + ns + "\\.([A-Za-z_$][\\w$]*)", "g"), m;
        while ((m = re.exec(src))) {
          checked++;
          t.ok(allowNs[ns].indexOf(m[1]) >= 0,
            base + " 同步呼叫 HL." + ns + "." + m[1] + "，但它是延遲載入的命名空間且該成員未列入清單 methods");
        }
      });
    });
    t.ok(checked > 0, "一個跨檔呼叫都掃不到＝正則或路徑寫壞了（這條鎖會靜默轉綠）");
  }
});

// arena.js 是全庫最大的 view（42KB），也是最容易被後手「順手搬進延遲清單」的一支。
// 但它的程式真的參與首屏：lobby 的熱門擂台無守衛呼叫 HL.arenaUI.roomCard、
// main.js 開機起每秒 HL.arenaSim.tick 的假站環境活動 ⇒ 搬走＝大廳白屏 + 假站看起來沒人在玩。
selftest.register({
  id: "platform/arena-first-screen-dependency", group: "platform", env: "node", tier: "fast",
  title: "arena.js 必須留在首屏：lobby 首屏無守衛用 HL.arenaUI、main.js 開機起 arenaSim",
  run: function (t) {
    var lobby = fs.readFileSync(path.join(ROOT, "src", "views", "lobby.js"), "utf8");
    var main = fs.readFileSync(path.join(ROOT, "src", "main.js"), "utf8");
    var usesUI = /HL\.arenaUI\./.test(lobby);
    var usesSim = /HL\.arenaSim/.test(main);
    // 若哪天這兩個依賴真的被拆掉了，本鎖應被改寫（而不是靜默失效）
    t.ok(usesUI || usesSim,
      "lobby 已不用 HL.arenaUI 且 main 已不用 HL.arenaSim ⇒ arena 可考慮延遲載入，請一併改寫本測項");
    if (!(usesUI || usesSim)) return;
    var statics = staticScripts(indexHtml());
    t.ok(statics.indexOf("./src/views/arena.js") >= 0,
      "arena.js 被移出首屏，但 lobby/main 仍同步依賴它 ⇒ 大廳會在渲染熱門擂台時 TypeError");
    if (lazyViews && lazyViews.manifest) {
      var srcs = lazyViews.manifest.map(function (e) { return e.src; });
      t.ok(srcs.indexOf("./src/views/arena.js") < 0, "arena.js 不得列入 lazyViews 清單（見上）");
    }
  }
});

// ── #111 通則鎖：延遲清單上的檔，不得被首屏依賴分析判為 first-screen-bound ──────────
// 這條取代「一支檔一條鎖」的擴散（`platform/arena-first-screen-dependency` 是那類的第一個實例，
// 兩者並存：本鎖看「清單裡的檔有沒有首屏依賴」，那條看「arena 有沒有被錯誤地移出 index.html」）。
// 工具在 intel/tools/（不被前端服務，僅 node 端），故 require 失敗一律 skip 而非 fail。
var fsDeps = (function () {
  try { return require(path.join(ROOT, "..", "intel", "tools", "first-screen-deps.js")); }
  catch (e) { return null; }
})();

selftest.register({
  id: "platform/lazy-list-not-first-screen-bound", group: "platform", env: "node", tier: "fast",
  title: "延遲載入清單上的每一支檔，首屏依賴分析必須判它不是 first-screen-bound",
  run: function (t) {
    if (!fsDeps) t.skip("intel/tools/first-screen-deps.js 不可用");
    var srcs = fsDeps.lazyManifestSrcs();
    t.ok(srcs.length > 0, "延遲清單掃不到任何檔＝清單解析或路徑寫壞了（本鎖會靜默轉綠）");

    // 反向自檢：已知**必須**留在首屏的 arena.js 一定要被判 bound。
    // 若工具因正則/遮罩壞掉而「什麼都判 safe」，上面那圈就會全綠通過 ⇒ 這條是防靜默轉綠的錨。
    var arena = fsDeps.analyze("./src/views/arena.js");
    if (arena) {
      t.ok(arena.verdict === "first-screen-bound",
        "arena.js 被判 " + arena.verdict + "，但 lobby.js 首屏無守衛用 HL.arenaUI、main.js 開機起 arenaSim ⇒ " +
        "要嘛那兩個依賴真的被拆掉了（請一併改寫本測項與 platform/arena-first-screen-dependency），" +
        "要嘛分析器壞了而正在把所有檔都判 safe");
    }

    var analyzed = 0;
    srcs.forEach(function (s) {
      var r = fsDeps.analyze(s);
      if (!r) return;
      analyzed++;
      var hits = r.A.concat(r.B).map(function (x) { return x.cls + " " + x.file + ":" + x.line + "(" + x.why + ")"; });
      t.ok(r.verdict !== "first-screen-bound",
        s + " 已列入延遲清單，但首屏依賴分析判它 first-screen-bound ⇒ " +
        r.reason + "｜" + hits.join("、") +
        "。修法：把它移回 index.html 靜態掛載，或把該依賴改成非同步（先 HL.lazy*.load 再用）");
    });
    t.ok(analyzed === srcs.length, "延遲清單 " + srcs.length + " 支中只分析到 " + analyzed + " 支（路徑對不上）");
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
 * #109 報表/匯出定義註冊表 HL.reports — 四條常駐鎖
 * ─────────────────────────────────────────────────────────────────────────────
 * 為什麼這四條：本卡的價值不在「多了一個面板」，而在三個結構性性質，而這三個性質**壞掉時畫面全對**：
 *   ① 載入序：reports.js 在載入當下讀 `HL.betlog.COLS` 註冊第一張報表 ⇒ 排在 betlog.js 之前
 *      只會**靜默少一張報表**（cols 空陣列 → register 回 null，不拋錯）。這正是 #66／#101／#106／#59
 *      同一個坑的第 N 次復發形狀 ⇒ 用鎖釘住順序，而不是靠註解記得。
 *   ② 唯一匯出出口：台帳連四輪判 partial 的那句話是「全站唯一真出口只有注單一種」。本卡把出口
 *      抽成容器後，若哪天有人「順手再寫一個下載」，台帳那句話會**再次成立而沒人發現**（新出口
 *      不會讓任何測項變紅）⇒ 這條鎖把「全 src 只有一處 new Blob」變成會 FAIL 的事。
 *   ③ 非孤兒：promoCal 的教訓（08-20 08:00 窗才剛更正過一次：台帳用來證明「容器非孤兒」的那個
 *      數字自己是錯的，因為 grep 命中的兩處都在註解裡）⇒ 這條鎖只認**非註解的呼叫**，且要求
 *      定義檔以外至少兩個消費端。
 *   ④ 受眾閘與欄位不漂移：用 shim 載入「玩家跑的同一份 reports.js」＋注入假 HL，實測
 *      (a) 玩家視角取不到營運報表的列與 CSV（連表頭都沒有）
 *      (b) 帳本 derived() 新增一個沒人取過名字的欄位時，它**自動出現**在營運彙總報表（不是靜默消失）。
 *      ⚠️ 用 shim 的鎖有個已知陷阱（08-17 平台軌實證）：少注入一個依賴不會報錯，只會讓被檢查的
 *         集合默默變小 ⇒ 本鎖第一句就斷言「註冊者數量 ≥ 5」，集合縮小即紅。
 * ══════════════════════════════════════════════════════════════════════════════ */
var REPORTS_SRC = path.join(ROOT, "src", "core", "reports.js");
var BETLOG_SRC_F = path.join(ROOT, "src", "core", "betlog.js");
var SRC_DIR = path.join(ROOT, "src");

// 全 src 的 .js（含 views/core/layout/data/i18n），供「唯一出口」與「非孤兒」兩條鎖掃描
function allSrcJs() {
  var out = [];
  (function walk(d) {
    fs.readdirSync(d).forEach(function (f) {
      var p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) return walk(p);
      if (/\.js$/.test(f)) out.push(p);
    });
  })(SRC_DIR);
  return out;
}
function noComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

selftest.register({
  id: "platform/reports-load-order", group: "platform", env: "node", tier: "fast",
  title: "#109 ①：reports.js 必須排在 betlog.js 之後（排反了只會靜默少一張報表）",
  run: function (t) {
    var scripts = staticScripts(indexHtml());
    var iB = scripts.indexOf("./src/core/betlog.js");
    var iR = scripts.indexOf("./src/core/reports.js");
    t.ok(iB > -1, "index.html 必須靜態掛載 core/betlog.js");
    t.ok(iR > -1, "index.html 必須靜態掛載 core/reports.js（少掛＝全站沒有匯出出口）");
    t.ok(iR > iB, "reports.js（第 " + iR + " 支）必須晚於 betlog.js（第 " + iB + " 支）——" +
      "前者載入當下讀 HL.betlog.COLS 註冊注單報表，排反了 register 會因 cols 為空而回 null（不拋錯）");
    // 依賴的真實性也要鎖：哪天 reports.js 不再讀 COLS，這條順序鎖就該一起改寫而非留著誤導
    t.ok(/HL\.betlog\s*&&\s*HL\.betlog\.COLS/.test(fs.readFileSync(REPORTS_SRC, "utf8")),
      "reports.js 應在註冊時沿用 HL.betlog.COLS（不抄第二份欄位定義）");
  }
});

selftest.register({
  id: "platform/reports-single-export-out", group: "platform", env: "node", tier: "fast",
  title: "#109 ②：全站只能有一個檔案匯出出口，且必須是 reports.js（台帳「唯一真出口」不得復發）",
  run: function (t) {
    var hits = [];
    allSrcJs().forEach(function (p) {
      var clean = noComments(fs.readFileSync(p, "utf8"));
      if (/new\s+Blob\s*\(/.test(clean) || /createObjectURL\s*\(/.test(clean)) hits.push(path.basename(p));
    });
    // 樣本數下限：0 命中代表正則或路徑壞了，會讓本鎖「零樣本＝完美通過」（窮舉型鎖的同形陷阱）
    t.ok(hits.length >= 1, "全 src 掃不到任何 new Blob/createObjectURL ⇒ 掃描壞了或匯出功能整個消失");
    t.equal(hits.join(","), "reports.js",
      "檔案匯出原語只允許存在於 core/reports.js（實測命中：" + hits.join("、") + "）。" +
      "要新增可匯出的東西＝多一筆 HL.reports.register，不是再寫一個下載");
    var bl = noComments(fs.readFileSync(BETLOG_SRC_F, "utf8"));
    t.equal(/new\s+Blob/.test(bl), false, "#51 betlog 的那份已遷移，不得留下 fallback 副本（留一份＝又有兩個出口）");
    t.ok(/HL\.reports\.download\s*\(/.test(bl), "betlog 的匯出鈕必須走 HL.reports.download");
  }
});

selftest.register({
  id: "platform/reports-not-orphan", group: "platform", env: "node", tier: "fast",
  title: "#109 ③：容器不得是孤兒——定義檔以外至少兩個非註解消費端（promoCal 的教訓）",
  run: function (t) {
    var consumers = [];
    allSrcJs().forEach(function (p) {
      if (path.basename(p) === "reports.js") return;                 // 定義處不算消費端
      if (path.basename(p).indexOf("i18n") === 0 || /[\\\/]i18n[\\\/]/.test(p)) return;  // 譯文字串不算
      var clean = noComments(fs.readFileSync(p, "utf8"));
      if (/HL\.reports\.(open|download|register|defineEvent)\s*\(/.test(clean)) consumers.push(path.basename(p));
    });
    t.ok(consumers.length >= 2,
      "HL.reports 的非註解消費端只有 " + consumers.length + " 個（" + consumers.join("、") + "）＝容器沒人用。" +
      "08-20 台帳更正的那一筆就是這個形狀：grep 命中兩處但兩處都在註解裡");
    t.ok(consumers.indexOf("betlog.js") > -1, "注單頁應是消費端之一（玩家路徑）");
    t.ok(consumers.indexOf("demo-tools.js") > -1, "⚙ 營運工具應是消費端之一（營運路徑，帶 ops:true）");
  }
});

/* ── #115：上面那條鎖的名字說「容器不是孤兒」，但它數的是 open|download|register|defineEvent **任一**
 *    ⇒ 實測命中的 betlog.js／demo-tools.js 用的是 download／open＝**消費端**，於是它綠著也證明不了
 *    「註冊出口有沒有人用」（實測 register 外部呼叫者＝0，6 張報表全在 reports.js 內定義）。
 *    這是「修一半而看不出來」家族的新一種：**鎖的定義比它的名字寬**。
 *    ⇒ 原條語意不動（消費端仍該有人），另立本條**只數註冊者**。兩條並存、覆蓋面不同。 */
function reportRegistrars() {
  var out = [];
  allSrcJs().forEach(function (f) {
    if (path.basename(f) === "reports.js") return;                                   // 定義處不算外部
    if (path.basename(f).indexOf("i18n") === 0 || /[\\\/]i18n[\\\/]/.test(f)) return;  // 譯文不算
    var clean = noComments(fs.readFileSync(f, "utf8"));
    if (/HL\.reports\.(register|defineEvent)\s*\(/.test(clean)) out.push(path.basename(f));
  });
  return out;
}

selftest.register({
  id: "platform/reports-register-has-external-callers", group: "platform", env: "node", tier: "fast",
  title: "#115：報表註冊出口必須有外部呼叫者（只數 register/defineEvent，不吃 open/download 的便宜）",
  run: function (t) {
    var regs = reportRegistrars();
    t.ok(regs.length >= 3,
      "HL.reports.register/defineEvent 的外部呼叫檔只有 " + regs.length + " 個（" + regs.join("、") + "）" +
      "＝註冊出口是孤兒。要新增一張報表應該是「在資料所在的檔加一筆註冊」，不是回頭改 reports.js");
    // 反向錨①：本條若與上面那條數到同一批檔，就代表兩條其實是同一把尺（那正是 #115 要拆掉的狀態）。
    var consumers = [];
    allSrcJs().forEach(function (f) {
      if (path.basename(f) === "reports.js") return;
      if (path.basename(f).indexOf("i18n") === 0 || /[\\\/]i18n[\\\/]/.test(f)) return;
      var clean = noComments(fs.readFileSync(f, "utf8"));
      if (/HL\.reports\.(open|download)\s*\(/.test(clean)) consumers.push(path.basename(f));
    });
    t.ok(consumers.length >= 1, "消費端掃描回 0 ⇒ 掃描壞了（本條的對照組沒了，等於零樣本通過）");
    var onlyConsumer = consumers.filter(function (f) { return regs.indexOf(f) < 0; });
    t.ok(onlyConsumer.length >= 1,
      "應至少有一個檔『只消費不註冊』（實測 " + onlyConsumer.join("、") + "）——" +
      "否則兩條鎖退化成同一把尺，#115 記下的『鎖的定義比名字寬』就會靜默復發");
    // 反向錨②之前先做逐筆靜態驗屍：register() 對缺件一律 **回 null 而不拋錯** ⇒ 少寫一個 aud 的
    //   後果是「那張報表從來沒存在過」，中心頁完全正常。故對每個呼叫點逐一檢查三件必填。
    regs.forEach(function (base) {
      var f = allSrcJs().filter(function (x) { return path.basename(x) === base; })[0];
      var clean = noComments(fs.readFileSync(f, "utf8"));
      var re = /HL\.reports\.register\s*\(\s*\{/g, m, n = 0;
      while ((m = re.exec(clean))) {
        var body = clean.slice(m.index, m.index + 3000); n++;
        t.ok(/aud\s*:\s*"(player|ops)"/.test(body),
          base + " 第 " + n + " 筆註冊缺 aud 或值不在 player|ops ⇒ register() 靜默回 null（報表從未存在，畫面完全正常）");
        t.ok(/cols\s*:/.test(body), base + " 第 " + n + " 筆註冊缺 cols ⇒ 同樣靜默回 null");
        t.ok(/rows\s*:\s*function/.test(body), base + " 第 " + n + " 筆註冊缺 rows() ⇒ 同樣靜默回 null");
      }
      t.ok(n >= 1, base + " 被判為註冊者卻掃不到 register( 呼叫點 ⇒ 掃描與檢查不同步（其一壞了）");
    });
    // 反向錨②：註冊出來的東西必須真的進得了容器（cols/rows/aud 三件缺一即被 register 靜默拒收回 null）
    var R = require(REPORTS_SRC).makeRegistry();
    t.equal(R.ids().length, 0, "容器本身仍不得自帶報表（拆鎖不得順手把容器變成有內建）");
  }
});

/* ── #115 ③：報表是「對戰排名」的第五個表面。
 *    08-21 那個顯示 BUG 的根因是**四個表面各自硬寫「總分越高越好」**（回放把輸家標成領先），
 *    修法是把排名語意收斂到 `HL.battleMode` 這一個出口。新增的 arena-battles 報表若自己算一份，
 *    crazy（最低總分勝）與 terminal（比最後一輪增量）兩個模式的 CSV 就會與勝負欄互相矛盾——
 *    而且**匯出檔比畫面更難被發現說謊**（沒有旁邊那個「勝/敗」立刻對照）。 */
var ARENA_SRC_F = path.join(ROOT, "src", "views", "arena.js");
selftest.register({
  id: "platform/reports-battle-metric-single-truth", group: "platform", env: "node", tier: "fast",
  title: "#115：戰績報表的排名量／欄名／勝負條件一律向 HL.battleMode 求，不得自寫第五份比較子",
  run: function (t) {
    var src = fs.readFileSync(ARENA_SRC_F, "utf8");
    // 錨在報表區塊自身的專屬子字串（不是函式名）——08-21 遊戲軌踩過「同檔同名函式取到第一個」那個坑
    var i = src.indexOf('id: "arena-battles"');
    t.ok(i > -1, "arena.js 應註冊 arena-battles 報表（找不到＝報表沒了，或 id 被改過而本條失去錨點）");
    var head = src.lastIndexOf("function battleRows()", i);
    t.ok(head > -1 && head < i, "battleRows() 應排在該註冊之前（取不到就代表本條掃錯範圍，不得靜默通過）");
    var block = src.slice(head, i + 3000);
    t.ok(/HL\.battleMode\.metricOf\s*\(/.test(block),
      "排名量必須走 HL.battleMode.metricOf —— 硬寫 myTotal 等於宣告「總分越高越好」，crazy/terminal 兩模式即說謊");
    t.ok(/HL\.battleMode\.displayMetricLabel\s*\(/.test(block),
      "欄名必須走 displayMetricLabel（terminal 模式那一欄是「本輪增量」不是「總分」）");
    t.ok(/HL\.battleMode\.winCondOf\s*\(/.test(block),
      "勝負條件必須走 winCondOf：CSV 裡沒有這一欄，讀的人就無從理解為什麼分數低的那場是勝");
    t.ok(/HL\.battleMode\.labelOf\s*\(/.test(block), "模式名稱必須走 labelOf（不得在報表側另抄一份模式字典）");
    // 反向錨：battleMode 本身必須真的提供這四個出口，否則上面四條全是在對不存在的 API 打勾
    var bm = require(path.join(ROOT, "src", "core", "battle-mode.js"));
    ["metricOf", "displayMetricLabel", "winCondOf", "labelOf"].forEach(function (k) {
      t.equal(typeof bm[k], "function", "HL.battleMode." + k + " 必須存在（報表與其餘四個表面共用的同一個出口）");
    });
  }
});

selftest.register({
  id: "platform/reports-registrars-load-order", group: "platform", env: "node", tier: "fast",
  title: "#115：每個外部註冊者都必須在 reports.js 之後靜態載入（排反了只會靜默少一張報表）",
  run: function (t) {
    var regs = reportRegistrars();
    t.ok(regs.length >= 3, "註冊者清單為空/過少 ⇒ 本條會零樣本通過（與上一條共用同一份掃描）");
    var scripts = staticScripts(indexHtml());
    var iR = scripts.indexOf("./src/core/reports.js");
    t.ok(iR > -1, "index.html 必須靜態掛載 core/reports.js");
    // lazy-views 的 manifest 是**陣列**（每筆 { src, views?, globals? }）——不是以 id 為鍵的物件；
    //   這裡明寫成陣列處理，別讓「Object.keys 剛好也能跑」把形狀誤記下來。
    var lazyFiles = ((lazyViews && lazyViews.manifest) || []).map(function (m) {
      return path.basename(String((m && m.src) || ""));
    }).filter(Boolean);
    t.ok(lazyFiles.length >= 1, "lazy-views 清單掃不到任何檔 ⇒ 下面那條「不得被延遲載入」的檢查會零樣本通過");
    regs.forEach(function (base) {
      var idx = -1;
      scripts.forEach(function (sp, i) { if (path.basename(sp) === base) idx = i; });
      t.ok(idx > -1, base + " 註冊了報表卻沒有靜態掛載在 index.html ⇒ 那張報表不存在");
      t.ok(idx > iR, base + "（第 " + idx + " 支）必須晚於 reports.js（第 " + iR + " 支）——" +
        "排在前面時 `if (HL.reports && ...)` 直接短路，報表靜默消失且不報錯");
      // 註冊過東西的檔不得被搬進延遲清單：搬走之後那筆註冊跟著消失，畫面完全正常（#114 收尾記下的那條）
      t.equal(lazyFiles.indexOf(base) > -1, false,
        base + " 註冊了報表，不得同時列在 lazy-views 清單裡（延遲載入＝那張報表在首屏後才出現，或永遠不出現）");
    });
  }
});

/* 以 new Function 載入「玩家跑的同一份 reports.js」並注入假 window（比照 loadAxes／loadLiveTable）。
   ledgerExtra：塞一個沒人取過名字的 derived 欄位，用來驗「新欄位會自動出現在報表」。 */
function loadReports(opts) {
  opts = opts || {};
  var bl = require(BETLOG_SRC_F);
  var win = { HL: {
    dom: {
      el: function () { return { appendChild: function () {}, addEventListener: function () {}, setAttribute: function () {} }; },
      money: function (v) { return "$" + v; },
      clear: function () {}
    },
    betlog: {
      COLS: bl.COLS, CAP: bl.CAP, count: function () { return (opts.betRows || []).length; },
      list: function () { return (opts.betRows || []).slice(); },
      csv: function () { return bl._csvOf(opts.betRows || []); }
    },
    ledger: {
      TYPES: ["deposit", "withdraw", "bet", "win"],
      derived: function () {
        var d = { turnover: 1000, payout: 900, ggr: 100, rtp: 0.9, ngr: 50, firstTs: 0, lastTs: 0 };
        if (opts.ledgerExtra) d[opts.ledgerExtra] = 42;
        return d;
      },
      byGame: function () { return [{ game: "dice", bet: 100, win: 99, plays: 3, ggr: 1, rtp: 0.99 }]; }
    },
    activity: opts.activity || null,
    vip: null, season: null, tasks: null, rakeback: null
  } };
  new Function("window", fs.readFileSync(REPORTS_SRC, "utf8"))(win);
  return win.HL.reports;
}

selftest.register({
  id: "platform/reports-gate-and-no-drift", group: "platform", env: "node", tier: "fast",
  title: "#109 ④：受眾閘（顯示＋匯出各一次）＋帳本新增欄位會自動出現在報表（shim 載入真檔）",
  run: function (t) {
    var Rp = loadReports({ betRows: [{ id: 1, ts: 0, game: "dice", bet: 100, win: 250, cs: "s", ne: 5 }] });
    t.ok(!!Rp, "shim 應載得出 HL.reports");
    // 集合大小自檢：少注入一個依賴時被檢查的集合會默默變小（08-17 教訓）
    t.ok(Rp.ids().length >= 5, "首批註冊者應 ≥5 張，實得 " + Rp.ids().length + "（" + Rp.ids().join("、") + "）");
    t.ok(Rp.ids().indexOf("betlog") > -1, "注單應被遷移成第一筆註冊者");

    // (a) 受眾閘：玩家視角
    var pIds = Rp.list().map(function (d) { return d.id; });
    t.equal(pIds.indexOf("ops-summary"), -1, "玩家視角不得看到營運彙總");
    t.equal(Rp.csvOf("ops-summary"), "", "玩家視角取營運 CSV 應為空（連表頭都不給）");
    t.equal(Rp.rowsOf("ops-summary").length, 0, "玩家視角取營運列應為空");
    t.ok(pIds.indexOf("betlog") > -1, "玩家視角應看得到自己的注單");

    // (b) 營運視角看得到，且注單報表的 CSV 與 #51 逐字相同（遷移不改內容）
    var oRows = Rp.rowsOf("ops-summary", {}, { ops: true });
    t.ok(oRows.length >= 5, "營運視角應取得彙總列，實得 " + oRows.length);
    t.equal(Rp.csvOf("betlog"), require(BETLOG_SRC_F)._csvOf([{ id: 1, ts: 0, game: "dice", bet: 100, win: 250, cs: "s", ne: 5 }]),
      "注單報表的 CSV 必須與 betlog 特化版逐字相同");

    // (c) 欄位不漂移：帳本多一個沒人取過名字的欄位 ⇒ 必須自動出現（用原 key），不得靜默消失
    var R2 = loadReports({ ledgerExtra: "brandNewMetric" });
    var keys = R2.rowsOf("ops-summary", {}, { ops: true }).map(function (r) { return r.k; });
    t.ok(keys.indexOf("brandNewMetric") > -1,
      "帳本 derived() 新增欄位未出現在營運彙總報表 ⇒ 標籤表變成白名單了（應為 LABELS[k] || k）");

    // (d) 事件 schema 的枚舉當場向帳本求值（不手抄）
    var evs = R2.events();
    t.ok(evs.length >= 4, "事件 schema 應 ≥4 筆，實得 " + evs.length);
    var led = evs.filter(function (e) { return e.id === "ledger.entry"; })[0];
    t.ok(!!led && /deposit \| withdraw \| bet \| win/.test(led.fields[0].d),
      "帳本分錄的 type 枚舉應當場由 HL.ledger.TYPES 求值（實得：" + (led ? led.fields[0].d : "—") + "）");
    // 注單列的欄位清單同理來自 COLS（不是抄的）
    var brow = evs.filter(function (e) { return e.id === "betlog.row"; })[0];
    t.equal(brow.fields.length, require(BETLOG_SRC_F).COLS.length, "注單列 schema 的欄位數應等於 COLS 長度");
  }
});

/* ───────────────────────────────────────────────────────────────────────────
 * #107 受眾述詞（2026-08-21 平台軌）
 * 這張卡的全部價值在於「**只有一份受眾詞彙**」：加一種受眾＝在 release.js 的 AUDIENCES 加一筆，
 * 三個消費端（#54 上架排程／#49 促銷日曆／#19 兌換碼）同時受益。
 * 它會壞掉的方式只有一種——某個消費端**自己刻一份**（一個 `if (vipLevel >= 5)`、一張自己的表），
 * 那之後兩份定義會靜靜分岔，而畫面上完全看不出來。以下三條鎖就是守這件事。
 * ─────────────────────────────────────────────────────────────────────────── */
var RELEASE_SRC_F = path.join(ROOT, "src", "core", "release.js");
var PROMOCAL_SRC_F = path.join(ROOT, "src", "core", "promo-cal.js");
var REDEEM_SRC_F = path.join(ROOT, "src", "core", "redeem.js");

selftest.register({
  id: "platform/audience-single-vocabulary", group: "platform", env: "node", tier: "fast",
  title: "#107 ①：受眾詞彙只能有一份——消費端必須向 HL.release 求，不得自建表或自刻門檻",
  run: function (t) {
    // 定義端：AUDIENCES 這個識別字只允許出現在 release.js（連測項檔自己都用字串拼接迴避）
    var owners = [];
    allSrcJs().forEach(function (p) {
      var clean = noComments(fs.readFileSync(p, "utf8"));
      if (/\bvar\s+AUDIENCES\s*=/.test(clean)) owners.push(path.basename(p));
    });
    t.equal(owners.join(","), "release.js",
      "受眾表只允許定義在 core/release.js（實測定義處：" + (owners.join("、") || "（一處都掃不到＝掃描壞了）") + "）");
    t.ok(owners.length === 1, "樣本數下限：必須恰好掃到 1 處定義，0 處代表正則或路徑壞了（零樣本＝完美通過的同形陷阱）");

    // 消費端：兩個新消費端都必須真的呼叫 matches + audienceCtx（少一個就是自己判斷了）
    [[PROMOCAL_SRC_F, "promo-cal.js"], [REDEEM_SRC_F, "redeem.js"]].forEach(function (pair) {
      var clean = noComments(fs.readFileSync(pair[0], "utf8"));
      t.ok(/HL\.release\.matches\s*\(/.test(clean), pair[1] + " 必須以 HL.release.matches() 求受眾述詞");
      t.ok(/HL\.release\.audienceCtx\s*\(/.test(clean),
        pair[1] + " 必須用 HL.release.audienceCtx() 取上下文（自己組第二份 ctx＝維度會分岔，#107 阻塞事實 (a)）");
      // 反向：不得自己讀玩家維度來判資格（那就是在刻第二份述詞）
      t.equal(/HL\.vip\.status\s*\(\s*\)\s*\.\s*level/.test(clean), false, pair[1] + " 不得自行讀 VIP 等級判資格");
      t.equal(/HL\.activity\.(wageredSince|xpSince)\s*\(/.test(clean), false, pair[1] + " 不得自行讀活躍度判資格");
    });
  }
});

selftest.register({
  id: "platform/audience-promo-hidden-not-greyed", group: "platform", env: "node", tier: "fast",
  title: "#107 ②：不符受眾的活動必須「不出現」而非灰掉（灰掉＝預告一個玩家拿不到的獎）",
  run: function (t) {
    var clean = noComments(fs.readFileSync(PROMOCAL_SRC_F, "utf8"));
    // 閘必須落在 evalSpec 的過濾路徑上（return null＝該則整個不進 list()），不是在 row() 裡改樣式
    var iEval = clean.indexOf("function evalSpec(");
    t.ok(iEval > -1, "promo-cal.js 應有 evalSpec（過濾發生處）");
    var iRow = clean.indexOf("function row(");
    t.ok(iRow > iEval, "row() 應在 evalSpec 之後（用於界定下面這段掃描範圍）");
    var evalBody = clean.slice(iEval, clean.indexOf("var RANK", iEval));
    t.ok(/audienceOk\s*\(\s*sp\s*\)/.test(evalBody) && /return\s+null/.test(evalBody),
      "受眾閘必須在 evalSpec 內以 return null 過濾掉整則活動");
    // row() 段內不得出現「因受眾而 disabled/降透明度」的處置
    var rowBody = clean.slice(iRow, clean.indexOf("function open(", iRow) + 1 || clean.length);
    t.equal(/audience[^\n]*disabled/i.test(rowBody), false, "row() 不得因受眾而 disable 任何控件");
    t.equal(/audience[^\n]*opacity/i.test(rowBody), false, "row() 不得因受眾而降透明度（灰掉）");

    // 零回歸：未宣告 audience 的 spec 必須走恆真路徑（欄位不存在即通過，不靠比對）
    t.ok(/if\s*\(\s*!sp\s*\|\|\s*!sp\.audience\s*\)\s*return\s+true/.test(clean),
      "audienceOk 必須以「未宣告即 true」開頭＝既有 7 筆種子活動逐位不變");
    // fail-closed：宣告了 audience 但 release 尚未載入 ⇒ 不放行
    t.ok(/if\s*\(\s*!\(\s*HL\.release[^\n]*\)\s*\)\s*return\s+false/.test(clean),
      "release.js 未載入時，已宣告受眾的活動必須 fail-closed（不得在載入競態下全站放出）");
  }
});

selftest.register({
  id: "platform/audience-consumers-not-orphan", group: "platform", env: "node", tier: "fast",
  title: "#107 ③：詞彙不得是孤兒——至少兩個消費端、且至少各有一個真實 audience 宣告",
  run: function (t) {
    var consumers = [];
    allSrcJs().forEach(function (p) {
      if (path.basename(p) === "release.js") return;                    // 定義處不算消費端
      if (/[\\/]i18n[\\/]/.test(p)) return;                            // 譯文字串不算
      var clean = noComments(fs.readFileSync(p, "utf8"));
      if (/HL\.release\.matches\s*\(/.test(clean)) consumers.push(path.basename(p));
    });
    t.ok(consumers.length >= 2,
      "HL.release.matches 的非註解消費端只有 " + consumers.length + " 個（" + consumers.join("、") + "）＝詞彙沒人用");

    // 光有消費端還不夠：得真的有東西宣告了 audience，否則整條路徑從沒被走過（#109 ③ 的教訓）
    var declarers = [];
    allSrcJs().forEach(function (p) {
      var clean = noComments(fs.readFileSync(p, "utf8"));
      if (/audience\s*:\s*\{\s*kind\s*:/.test(clean)) declarers.push(path.basename(p));
    });
    t.ok(declarers.length >= 3,
      "宣告 audience 的檔只有 " + declarers.length + " 個（" + declarers.join("、") + "）＝新詞彙沒有任何真實使用者");
    ["onboarding.js", "activity.js", "redeem.js"].forEach(function (f) {
      t.ok(declarers.indexOf(f) > -1, f + " 應為 #107 的真實宣告者之一");
    });

    // 新詞彙必須真的進了表（漏掉一個 kind 只會讓宣告它的地方保守變成「誰都看不到」＝靜默失效）
    var rel = require(RELEASE_SRC_F);
    ["newcomer", "active", "wagered7"].forEach(function (k) {
      t.ok(!!rel.AUDIENCES[k], "受眾表必須含 " + k + "（缺了會讓宣告它的活動對所有人隱形，而且不報錯）");
    });
    // 帳齡的單一真相：release 只能向 rakeboost 求，不得自刻第二支 localStorage 鍵
    var relSrc = noComments(fs.readFileSync(RELEASE_SRC_F, "utf8"));
    t.ok(/HL\.rakeboost\.newcomerTs\s*\(/.test(relSrc), "帳齡必須向 HL.rakeboost.newcomerTs() 求（全站唯一一份）");
    t.equal(/lsSet\s*\(/.test(relSrc), false, "release.js 不得自己寫任何 localStorage（帳齡有第二份＝新手期定義會分岔）");
  }
});

selftest.register({
  id: "platform/audience-gate-actually-filters", group: "platform", env: "node", tier: "fast",
  title: "#107 ④：閘真的會濾——用 shim 把真檔載進來實跑 list()／redeem()，不是只看源碼有沒有呼叫",
  run: function (t) {
    /* 為什麼要 shim：上面三條鎖都是**源碼級**的（誰呼叫誰、誰不准有第二張表），
     * 它們證明不了「不符合的活動真的不會出現在 list() 裡」。促銷/兌換碼兩個消費端都在
     * 瀏覽器區（module load 就取 HL.dom.el）⇒ node 無法直接 require ⇒ 以最小 shim 載入真檔。
     * ⚠️ 本測項刻意**不 skip**：載不起來就 FAIL 並印出原因。skip 會讓「shim 過時」與
     *    「閘壞掉」在輸出上同形（零樣本＝完美通過的同形陷阱）。 */
    var store = {}, HL = {};
    var doc = { readyState: "complete", addEventListener: function () {}, createTextNode: function (s) { return { t: s }; } };
    var win = { HL: HL, document: doc, setTimeout: function () {}, setInterval: function () { return 0; },
                clearInterval: function () {}, addEventListener: function () {} };
    win.window = win;
    HL.dom = {
      el: function (tag, attrs, kids) { return { tag: tag, attrs: attrs || {}, kids: kids || [] }; },
      money: function (n) { return "$" + n; }, dhm: function (ms) { return Math.round(ms / 3600000) + "h"; },
      lsGet: function (k, d) { return store[k] === undefined ? d : store[k]; },
      lsSet: function (k, v) { store[k] = v; },
      dayNum: function () { return Math.floor(Date.now() / 86400000); }
    };
    HL.ui = { toast: function () {}, modal: function () {}, kv: function () { return {}; }, closeTop: function () {} };
    HL.games = { byId: function () { return null; }, title: function (g) { return g.id; }, launch: function () {} };
    HL.bonus = { add: function () {} }; HL.notify = { add: function () {} };

    var loadErr = null;
    ["redeem.js", "promo-cal.js", "release.js"].forEach(function (f) {   // 載入序照 index.html
      if (loadErr) return;
      try { new Function("window", "document", "HL", fs.readFileSync(path.join(SRC_DIR, "core", f), "utf8"))(win, doc, HL); }
      catch (e) { loadErr = f + "：" + e.message; }
    });
    t.equal(loadErr, null, "三個真檔都要能以 shim 載入（載不起來＝shim 已過時，請修 shim 而非略過本鎖）：" + loadErr);
    if (loadErr) return;

    // 三個維度的來源以 stub 供給（本鎖只驗受眾接線，不驗 rakeboost/activity 自己的數學）
    var ageDays = 2, act = true, w7 = 0;
    HL.rakeboost = { newcomerTs: function () { return ageDays === null ? 0 : Date.now() - ageDays * 86400000; } };
    HL.activity = { status: function () { return { active: act }; }, wageredSince: function () { return w7; } };
    function ids() { return HL.promoCal.list().map(function (e) { return e.id; }); }

    HL.promoCal.register({ id: "t-plain", name: "x", sched: "always", avail: function () { return true; } });
    HL.promoCal.register({ id: "t-nc", name: "x", sched: "always", avail: function () { return true; }, audience: { kind: "newcomer", arg: 7 } });
    HL.promoCal.register({ id: "t-act", name: "x", sched: "always", avail: function () { return true; }, audience: { kind: "active" } });
    HL.promoCal.register({ id: "t-wg", name: "x", sched: "always", avail: function () { return true; }, audience: { kind: "wagered7", arg: 500 } });
    HL.promoCal.register({ id: "t-typo", name: "x", sched: "always", avail: function () { return true; }, audience: { kind: "vipp", arg: 1 } });

    t.ok(ids().indexOf("t-plain") > -1, "未宣告 audience 的活動照常出現（零回歸）");
    t.ok(ids().indexOf("t-typo") === -1, "未知 kind 的活動不得出現（拼錯不會變成全站放送）");
    ageDays = 2;   t.ok(ids().indexOf("t-nc") > -1, "帳齡 2 天應看得到新手活動");
    ageDays = 9;   t.ok(ids().indexOf("t-nc") === -1, "帳齡 9 天應整則不出現");
    ageDays = null; t.ok(ids().indexOf("t-nc") === -1, "老玩家（帳齡播種為 0）應不出現");
    act = false;   t.ok(ids().indexOf("t-act") === -1, "光環未亮應不出現");
    act = true;    t.ok(ids().indexOf("t-act") > -1, "光環亮著應看得到");
    w7 = 499;      t.ok(ids().indexOf("t-wg") === -1, "押注 499 未達 500 應不出現");
    w7 = 500;      t.ok(ids().indexOf("t-wg") > -1, "押注恰 500 應出現（>= 邊界）");

    // 取標籤快照前先把三個維度都設回「符合」，否則被濾掉的那筆在 rows 裡根本不存在
    ageDays = 2; act = true; w7 = 500;
    var rows = HL.promoCal.list();
    function row(id) { var r = rows.filter(function (e) { return e.id === id; })[0]; t.ok(!!r, "快照應含 " + id); return r || {}; }
    t.equal(row("t-plain").audienceLabel, "", "未宣告者 audienceLabel 必須是空字串");
    t.equal(row("t-wg").audienceLabel, "\u8fd1 7 \u5929\u62bc\u6ce8 500+", "帶值受眾標籤＝片語＋純數字＋「+」");
    t.equal(row("t-nc").audienceLabel, "\u65b0\u624b\u671f 7 \u5929\u5167", "帶單位受眾標籤＝片語＋純數字＋單位片語");

    // 兌換碼：資格閘不得弄壞既有的 invalid/claimed 順序
    ageDays = 9; w7 = 0;
    t.equal(HL.redeem.redeem("FIRSTWEEK").reason, "ineligible", "老玩家兌新手碼應回 ineligible");
    t.equal(HL.redeem.redeem("NOSUCH").reason, "invalid", "無效碼仍回 invalid（資格閘沒搶在前面）");
    ageDays = 1;
    t.equal(HL.redeem.redeem("FIRSTWEEK").ok, true, "新手兌新手碼應成功");
    t.equal(HL.redeem.redeem("FIRSTWEEK").reason, "claimed", "再兌一次應回 claimed（冪等未被資格閘弄壞）");
    t.equal(HL.redeem.redeem("APEXWIN").ok, true, "既有無 audience 的碼行為逐位不變");
  }
});

/* ======================= #114 成就牆的外部註冊出口（容器不得是孤兒）=======================
   卡上量測：`HL.achievements.register(` 在全 src 的非註解命中數＝0——19 枚種子走的是檔內區域變數
   `register`，不是公開出口。同型容器對照 `HL.games.register` 19／`HL.econCfg.register` 14 ⇒ 尺會動。
   本組三條鎖分工刻意不同（源碼級的鎖加起來也證明不了「出口真的收得到外面的 spec」）：
     ① 誰在註冊（源碼，含一把會動的對照尺 + live-stats 的呼叫順序）
     ② 出口真的收得到（runtime：把玩家跑的同一份 achievements.js 載進 node 實跑）
     ③ 新徽章不得變成第 N 條送幣管道（源碼 × §11）                                            */

var ACHIEVE_SRC = path.join(SRC_DIR, "core", "achievements.js");
var NEW_BADGE_FILES = ["challenges.js", "activity.js", "responsible.js", "reports.js"];

function achieveRegistrars() {
  var out = [];
  allSrcJs().forEach(function (p) {
    if (path.basename(p) === "achievements.js") return;              // 定義處不算外部註冊者
    var clean = noComments(fs.readFileSync(p, "utf8"));
    if (/HL\.achievements\.register\s*\(/.test(clean)) out.push(path.basename(p));
  });
  return out;
}

selftest.register({
  id: "platform/achievements-external-registrars", group: "platform", env: "node", tier: "fast",
  title: "#114 ①：成就牆的外部註冊出口必須真的有外部註冊者（0 個＝容器是孤兒）",
  run: function (t) {
    // 對照尺：先證明「非註解掃描」這把尺本身會動——否則 0 命中與掃描壞掉在輸出上完全同形
    var gameReg = 0;
    allSrcJs().forEach(function (p) {
      if (/HL\.games\.register\s*\(/.test(noComments(fs.readFileSync(p, "utf8")))) gameReg++;
    });
    t.ok(gameReg >= 10, "對照尺失效：HL.games.register 的外部檔數只有 " + gameReg + " 個（應 >=10）⇒ 掃描或路徑壞了，本鎖的 0 命中不可信");

    var regs = achieveRegistrars();
    t.ok(regs.length >= 4, "HL.achievements.register 的非註解外部註冊者只有 " + regs.length + " 個（" + regs.join("、") + "）＝容器是孤兒");
    NEW_BADGE_FILES.forEach(function (f) {
      t.ok(regs.indexOf(f) > -1, f + " 應是成就牆的外部註冊者之一（實測：" + regs.join("、") + "）");
    });

    /* live-stats.js 的呼叫順序＝這批 test 型徽章能否在同一注解鎖的前提：
       activity/challenges 若排到 achievements 之後，段位與名額都會晚一注才被看到
       （不會壞、但「搶到名額當下沒有徽章」與「徽章壞了」在玩家眼裡同形）。*/
    var lsSrc = noComments(fs.readFileSync(path.join(SRC_DIR, "core", "live-stats.js"), "utf8"));
    var iAch = lsSrc.indexOf("HL.achievements.record");
    var iAct = lsSrc.indexOf("HL.activity.record");
    var iChal = lsSrc.indexOf("HL.challenges.record");
    t.ok(iAch > 0 && iAct > 0 && iChal > 0, "live-stats.js 應同時呼叫 activity/challenges/achievements 三者（實測位置 " + iAct + "/" + iChal + "/" + iAch + "）");
    t.ok(iAct < iAch, "HL.activity.record 必須排在 HL.achievements.record 之前（否則光環最高段徽章晚一注才解鎖）");
    t.ok(iChal < iAch, "HL.challenges.record 必須排在 HL.achievements.record 之前（否則搶到名額當下不會解鎖）");

    // 非下注事件的兩個註冊者必須自己補 sync，否則設完限額/匯出完要等下一注才有反應
    ["responsible.js", "reports.js"].forEach(function (f) {
      var c = noComments(fs.readFileSync(path.join(SRC_DIR, "core", f), "utf8"));
      t.ok(/HL\.achievements\.sync\s*\(/.test(c), f + " 的事件不經中央結算點 ⇒ 必須自己呼 HL.achievements.sync()");
    });
  }
});

/* 把玩家跑的同一份 achievements.js 載進 node（比照 loadReports／loadAxes 的 new Function 注入假 window）。
   store＝假 localStorage；bonusCalls 記下每一次送幣，用來證明 reward:0 真的一毛都不發。 */
function loadAchievements() {
  var store = {}, bonusCalls = [], toasts = [];
  var win = { HL: {
    dom: {
      el: function () { return { appendChild: function () {}, addEventListener: function () {} }; },
      money: function (v) { return "$" + v; },
      lsGet: function (k, d) { return store[k] === undefined ? d : JSON.parse(JSON.stringify(store[k])); },
      lsSet: function (k, v) { store[k] = JSON.parse(JSON.stringify(v)); },
      dayNum: function () { return 20000; }
    },
    ui: { toast: function (m) { toasts.push(m); } },
    bonus: { add: function (n, meta) { bonusCalls.push({ n: n, src: meta && meta.source }); } }
  } };
  new Function("window", fs.readFileSync(ACHIEVE_SRC, "utf8"))(win);
  return { A: win.HL.achievements, store: store, bonusCalls: bonusCalls, toasts: toasts };
}

selftest.register({
  id: "platform/achievements-register-port-works", group: "platform", env: "node", tier: "fast",
  title: "#114 ②：register 出口實跑——外部 spec 收得到、test 型會解鎖、reward:0 一毛不發、拋錯的 test 不毒害其他人",
  run: function (t) {
    var LA = loadAchievements(), A = LA.A;
    var seeds = A.ids().length;
    t.ok(seeds >= 19, "種子目錄應至少 19 枚，實測 " + seeds);

    var flagA = false;
    A.register({ id: "x-ext-a", cat: "測試", title: "外部甲", desc: "d", pts: 7, reward: 0, test: function () { return flagA; } });
    A.register({ id: "x-ext-throw", cat: "測試", title: "外部拋錯", desc: "d", pts: 3, reward: 0, test: function () { throw new Error("boom"); } });
    A.register({ id: "x-ext-paid", cat: "測試", title: "外部有獎", desc: "d", pts: 1, reward: 250, stat: "bets", goal: 1 });
    t.equal(A.ids().length, seeds + 3, "三筆外部 spec 都應進註冊表（實測 " + A.ids().length + "）");
    t.ok(A.ids().indexOf("x-ext-a") > -1, "外部 id 應出現在 ids()");

    // 阻塞事實④：重複 id 靜默忽略、且先註冊的那筆贏
    A.register({ id: "x-ext-a", cat: "測試", title: "冒名頂替", desc: "d", pts: 999, reward: 999 });
    t.equal(A.ids().length, seeds + 3, "重複 id 不得新增一筆（register 對重複 id 靜默忽略）");
    var dup = A.status().list.filter(function (x) { return x.id === "x-ext-a"; })[0];
    t.equal(dup.pts, 7, "重複 id 靜默忽略＝先註冊的贏（實測 pts=" + dup.pts + "）⇒ 新成就撞到既有 id 時什麼都不會發生，且不報錯");

    // 一注：x-ext-paid（stat 型）達標 → 應送 250；x-ext-a 尚未達成；拋錯的那筆不得中斷流程
    A.record("dice", 100, 0);
    var got = LA.bonusCalls.filter(function (c) { return c.n === 250; });
    t.equal(got.length, 1, "reward>0 的成就解鎖應送幣一次（實測 " + LA.bonusCalls.length + " 次送幣）");
    var byId = {}; A.status().list.forEach(function (x) { byId[x.id] = x; });
    t.equal(byId["x-ext-paid"].unlocked, true, "stat 型外部成就應解鎖");
    t.equal(byId["x-ext-a"].unlocked, false, "條件未成立者不得解鎖");
    t.equal(byId["x-ext-throw"].unlocked, false, "test 拋錯者應維持未解鎖（meets 的 try/catch 回 false）");

    // 現在讓 x-ext-a 成立：reward:0 ⇒ 一毛都不能再發（§11：新徽章不是第 N 條送幣管道）
    var before = LA.bonusCalls.length;
    flagA = true;
    A.sync();
    byId = {}; A.status().list.forEach(function (x) { byId[x.id] = x; });
    t.equal(byId["x-ext-a"].unlocked, true, "sync() 應能在非下注事件下解鎖 test 型成就（責任博弈/報表兩個註冊者靠的就是這條）");
    t.equal(LA.bonusCalls.length, before, "reward:0 的成就解鎖後送幣次數必須完全不變（實測 " + before + " -> " + LA.bonusCalls.length + "）");
    t.equal(byId["x-ext-a"].prog, 1, "已解鎖者 prog 應為 1");
    t.equal(byId["x-ext-throw"].prog, 0, "test 型未達成 prog 為 0（沒有進度條＝#114 卡上阻塞事實②，本卡刻意接受）");
  }
});

selftest.register({
  id: "platform/achievements-new-badges-cost-free", group: "platform", env: "node", tier: "fast",
  title: "#114 ③：本卡新掛的 4 枚徽章一律 reward:0（不得偷偷變成送幣管道），且門檻不得複製一份",
  run: function (t) {
    var IDS = ["chal-slot-grabbed", "aura-top-tier", "rg-first-limit", "rpt-first-export"];
    var found = {};
    NEW_BADGE_FILES.forEach(function (f) {
      var src = fs.readFileSync(path.join(SRC_DIR, "core", f), "utf8");
      var m = src.match(/HL\.achievements\.register\s*\(\s*\{[\s\S]*?\n\s*\}\s*\)/g) || [];
      m.forEach(function (blk) {
        var id = (blk.match(/id:\s*"([^"]+)"/) || [])[1];
        if (id) found[id] = { file: f, blk: blk };
      });
    });
    IDS.forEach(function (id) {
      t.ok(!!found[id], "應找得到 " + id + " 的註冊區塊（實測找到：" + Object.keys(found).join("、") + "）");
      if (!found[id]) return;
      var blk = found[id].blk;
      t.ok(/reward:\s*0\b/.test(blk), id + " 必須 reward: 0——§11 真站送幣成本正在收斂，新徽章一律榮譽制（" + found[id].file + "）");
      t.ok(/test:\s*function/.test(blk), id + " 必須是 test 型（新維度不在 stats() 的 8 欄詞彙裡，硬塞會讓引擎知道各功能模組的存在）");
      t.equal(/\bstat:\s*"/.test(blk), false, id + " 不得用 stat/goal 假裝有進度條（stats() 認不得這些維度）");
    });

    // 光環那枚：門檻只能有一份真相 ⇒ 註冊區塊裡不得出現任何門檻數字（比照 #108 在 rakeboost 側零數字的紀律）
    var aura = found["aura-top-tier"] && found["aura-top-tier"].blk;
    t.ok(!!aura, "應找得到光環徽章的註冊區塊");
    if (aura) {
      t.ok(/tierIndexFor\s*\(/.test(aura), "光環徽章必須向 tierIndexFor 求段位，不得自己比大小");
      t.equal(/\b(2000|10000|40000)\b/.test(aura), false, "光環徽章的註冊區塊不得出現任何門檻數字（實測：" + aura.replace(/\s+/g, " ").slice(0, 140) + "）");
      t.ok(/TIERS\.length\s*-\s*1/.test(aura), "最高段須以 TIERS.length - 1 表達，寫死序號會在加一段後靜默指向舊的次高段");
    }

    /* 責任博弈那枚刻意只認「設定限額」：自我排除是危機動作，做成可收集的徽章是不恰當的獎勵訊號。
       這條鎖住的是方向——哪天有人把 excluded/pause 接進來會轉紅，逼他重新想一次。*/
    var rg = found["rg-first-limit"] && found["rg-first-limit"].blk;
    t.ok(!!rg, "應找得到責任博弈徽章的註冊區塊");
    if (rg) t.equal(/(excluded|pauseKind|applyPause|setPause)/.test(rg), false, "自我排除／暫停不得成為成就條件（只認設定限額）");
  }
});

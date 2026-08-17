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
      { f: "src/core/progress.js", why: "紅利流水規則" }
    ];
    t.ok(OWNERS.length >= 5, "首批註冊者樣本量下限為 5");

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
    t.equal(ax.all().length, 1, "本輪只應註冊一條軸（節奏），實際：" + ax.all().map(function (a) { return a.key; }).join(","));

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
    t.equal(stepwise, 6, "stepwise 款數與實測不符（新增/移除遊戲時請重跑判準），實際：" + stepwise);

    // (3) 覆蓋率：可玩遊戲不得有一半以上沒值（有值才有分群意義；缺值本身合法但不能是常態）
    var covered = games.filter(function (g) { return tr.value(g.id, "pace"); }).length;
    t.ok(covered >= games.length - 2, "節奏值覆蓋不足：" + covered + "/" + games.length);

    // (4) 真實資料下，節奏軸應渲染 2 個桶（pending 目前 0 款 ⇒ 空桶不出現，這是「空的不渲染」的實證）
    var tabs = ax.tabs(games.map(function (g) { return { id: g.id }; }));
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
  id: "platform/game-axes-title-i18n", group: "platform", env: "node", tier: "fast",
  title: "結果牆標題（labelOf 串接）每個可渲染桶都必須有 whole-key i18n（U36·P3 串接陷阱：否則 EN/zh-Hans 顯示未翻中文）",
  run: function (t) {
    // 大廳選中某條軸的桶時，結果牆標題＝labelOf(filter)＝`軸label · 桶label`（casino.js:140-142），
    // 整串是一個文字節點；i18n walker 只能「整節點等於一條 key」才翻得到（且它 raw.trim() 後查表，
    // 一個節點最多做一次替換）⇒ 桶標籤自己是 key 也沒用，必須為每個可渲染桶的**串接後標題**各補一條 whole-key。
    // 這條鎖捕捉：日後 pending 桶有了遊戲、或新增一條軸時，若忘了補標題翻譯就會靜默漏翻。
    var ax = loadAxes().gameAxes;
    var games = playableGames().map(function (g) { return { id: g.id }; });
    var tabs = ax.tabs(games);
    t.ok(tabs.length >= 2, "真實 roster 下應至少渲染一條軸（≥2 桶），實際頁籤數：" + tabs.length);
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
    t.equal(R.of("dice"), null, "未登記的遊戲必須回 null，不得回 0");
    t.equal(R.edgeOf("dice"), null, "未登記的遊戲 edgeOf 必須回 null");
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

/* ===================== 測項註冊的載入序棘輪（platform · 2026-08-17 08:00 窗）=====================
 * 起因：#71 首版把 bonus-ttl.js 排在 progress.js 之前（也就是 selftest.js 之前），5 個測項因此
 *   **只在 node 註冊得到、瀏覽器端整組收不到**。這正是 index.html 裡 reveal.js 那條註記
 *   （「#66 新增的 4 個測項因此在瀏覽器端整組註冊不到」）的同型重演——同一個坑第二次。
 * 自查時順手機械掃了全家族，發現**這不是我一個人踩到的**：另有 7 支既有模組同樣違反，
 *   合計 36 個測項在瀏覽器端從未註冊過（node 有、瀏覽器沒有）。
 * 為什麼不順手全修：`econ-config.js` 排在第 3 支**是必要的**——cashback/edge/faucet/jackpot/
 *   progress-src/progress 都在載入時 `if (HL.econCfg && HL.econCfg.register)` 自我註冊，
 *   把它往後移會讓那些註冊**靜默變成 no-op**（守衛是短路的）。⇒ 這是一張需要逐檔判相依的
 *   維護卡（已開 #101），不是本輪順手能安全做完的事。
 * 因此這裡立**棘輪**而非硬閘：名單不得再長。新模組一律排在 selftest.js 之後。
 * ============================================================================================ */

// 已知違反者（2026-08-17 實測）。**只能變短、不得變長**；修好一支就從這裡刪一支。
var SELFTEST_ORDER_DEBT = [
  "src/core/econ-config.js", "src/core/ledger.js", "src/core/rewards.js",
  "src/core/rakeback-core.js", "src/core/wager-scope.js", "src/core/score-axis.js",
  "src/core/rakeboost.js"
];

selftest.register({
  id: "platform/selftest-registration-order", group: "platform", env: "node", tier: "fast",
  title: "瀏覽器端測項註冊：模組不得排在 selftest.js 之前（否則 node 有、瀏覽器沒有）",
  run: function (t) {
    var html = indexHtml();
    var order = [], re = /<script[^>]*src="\.\/([^"]+)"/g, m;
    while ((m = re.exec(html))) order.push(m[1]);
    var selfAt = order.indexOf("src/core/selftest.js");
    t.ok(selfAt > 0, "index.html 應載入 src/core/selftest.js");

    var violators = [];
    order.forEach(function (rel, i) {
      if (!/^src\/core\//.test(rel)) return;
      var src;
      try { src = fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch (e) { return; }
      if (!/registerTests\(HL\.selftest\)/.test(src)) return;
      if (i < selfAt) violators.push(rel);
    });

    // 棘輪：不得出現名單外的新違反者
    violators.forEach(function (v) {
      t.ok(SELFTEST_ORDER_DEBT.indexOf(v) >= 0,
        v + " 排在 selftest.js 之前 ⇒ 它的測項在瀏覽器端整組註冊不到。新模組請排在 selftest.js 之後（#71 首版就踩了這個坑）");
    });
    // 反向：名單裡已經修好的要記得刪掉，否則棘輪會鬆掉而沒人知道
    SELFTEST_ORDER_DEBT.forEach(function (d) {
      t.ok(violators.indexOf(d) >= 0,
        d + " 已不在違反名單中（很好）——請從 SELFTEST_ORDER_DEBT 移除，否則棘輪會對它失效");
    });
    t.ok(violators.length <= SELFTEST_ORDER_DEBT.length,
      "違反者只能變少（實測 " + violators.length + " / 上限 " + SELFTEST_ORDER_DEBT.length + "）");
    // 不空心：本鎖必須真的掃到東西
    t.ok(order.length > 50, "應掃到全部 <script>（實測 " + order.length + " 支）");
  }
});

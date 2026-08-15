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
    t.equal(mentionsRtp(strip(traits)), false,
      "game-traits.js 出現 rtp 欄位＝把 gameInfoBar 已有的數字抄了第二份（會漂移）。RTP 軸的前提是先讓 gameInfoBar 的 rtp 可列舉，見 BACKLOG #98");
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

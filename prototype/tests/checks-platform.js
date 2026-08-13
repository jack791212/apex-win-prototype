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

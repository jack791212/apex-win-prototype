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

// 兩份延遲清單（lazy-games + lazy-views）上的 src；供「註冊表早於消費它的 view」判斷用
function lazySrcList() {
  var out = [];
  ["lazy-games.js", "lazy-views.js"].forEach(function (f) {
    try {
      var mod = require(path.join(ROOT, "src", "data", f));
      var mf = mod && (mod.manifest || mod.MANIFEST);
      (Array.isArray(mf) ? mf : []).forEach(function (e) { if (e && e.src) out.push(e.src); });
    } catch (e) { /* 檔不存在／不 export ⇒ 視為不在清單上 */ }
  });
  return out;
}

/* 「註冊表必須在消費它的 view 跑起來之前就緒」——這條不變量在 #112（2026-08-22 把 casino/tournament/
 * chicken 移入延遲清單）之後有**兩種合法形狀**。依 CLAUDE.md §10.1：改成守新形狀下的同一組不變量，
 * 不是放寬：
 *   ① view 仍靜態掛載 ⇒ 索引必須大於註冊表（原本那條判法，一字不動地保留在這裡）。
 *   ② view 已在延遲清單上 ⇒ 它是**開機之後**才被注入的，結構上必然晚於所有靜態 script ⇒ 順序自動成立。
 * 反向錨（兩個方向都會紅）：把 view 靜態掛回**註冊表之前** ⇒ ① 紅；把 view 從 index.html 與延遲清單
 * **兩邊都刪掉** ⇒ 本函式回 false（那不是「順序沒問題」，那是整個表面從站上消失了）。 */
function registryReadyBefore(s, viewSrc, regIdx) {
  var iV = s.indexOf(viewSrc);
  if (iV >= 0) {
    return { ok: regIdx >= 0 && regIdx < iV, how: "view 靜態掛載於索引 " + iV + "、註冊表於 " + regIdx };
  }
  if (lazySrcList().indexOf(viewSrc) >= 0) {
    return { ok: true, how: "view 已移入延遲清單（開機後才注入 ⇒ 必晚於所有靜態 script，含註冊表）" };
  }
  return { ok: false, how: "index.html 與延遲清單**兩邊都找不到** " + viewSrc + "＝該表面已從站上消失" };
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

// ── 斷點階梯 canonical（R4 收斂後把「文件化的階梯」變成 fail-closed 的網）───────
// 背景：R4（2026-07-10）把 9 個雜亂 @media 斷點收斂成 5 階（480/560/720/1024/1280）
// ＋兩個「元件特定、非任意」的刻意例外（760 Slots Battle 盤面、860 直播間），並在
// tokens.css 文件化。但那只是註解——之後遊戲/平台軌新增 view 時，任何人再寫一個
// 500/520/600/900 的斷點都不會被擋（2026-08-31 維護軌實測就撞到：andar-bahar 的
// `@media (max-width:520px)` 在 R4 後悄悄長回來，正是 R4 明文收掉的 520）。本鎖把
// 「距離最近 grep 的一次」升級成常駐網：styles/*.css 的每個 @media 寬度斷點都必須
// 落在 canonical∪exceptions 內，否則當場紅。**新增刻意例外＝在此白名單登記一次**
// （逼一個決策點：這個新斷點是任意漂移、還是元件特定的必要例外？）。
selftest.register({
  id: "platform/breakpoint-ladder-canonical", group: "platform", env: "node", tier: "fast",
  title: "@media 寬度斷點 ⊆ R4 canonical 階梯（480/560/720/1024/1280 ＋刻意例外 721/760/860）",
  run: function (t) {
    // canonical 五階（tokens.css:61-63 文件化的單一參考來源）
    var CANON = [480, 560, 720, 1024, 1280];
    // 刻意例外（每一個都要有理由，不是「懶得收」）：
    //   721 = 720 斷點的 min-width 互補側（同一條線的桌機側，非新斷點）
    //   760 = Slots Battle 盤面 .ax-vs--fg 收單欄（強收 canonical 會在平板過度堆疊）
    //   860 = 直播間 .ax-liveroom 雙欄→單欄
    var EXCEPT = [721, 760, 860];
    var ALLOWED = {};
    CANON.concat(EXCEPT).forEach(function (px) { ALLOWED[px] = 1; });

    var STYLE_DIR = path.join(ROOT, "src", "styles");
    var files;
    try { files = fs.readdirSync(STYLE_DIR).filter(function (f) { return /\.css$/.test(f); }); }
    catch (e) { files = []; }
    // 反恆真錨 ①：真的掃到 css 檔（掃 0 檔時「無違規」恆真）
    t.ok(files.length >= 2, "styles/ 只掃到 " + files.length + " 支 css ⇒ 目錄結構變了，本鎖等於沒跑");

    var reMedia = /@media[^{]*?\((?:max-width|min-width)\s*:\s*(\d+)px\)/g;
    var seen = {}, offenders = [], total = 0;
    files.forEach(function (f) {
      var s = fs.readFileSync(path.join(STYLE_DIR, f), "utf8");
      // 去掉 /* */ 註解，免得 tokens.css 文件段裡的示例數字被當成實際斷點
      var code = s.replace(/\/\*[\s\S]*?\*\//g, "");
      var m;
      while ((m = reMedia.exec(code)) !== null) {
        var px = parseInt(m[1], 10);
        total++;
        seen[px] = (seen[px] || 0) + 1;
        if (!ALLOWED[px]) offenders.push(f + " → " + px + "px");
      }
    });

    // 反恆真錨 ②：正則真的匹配到斷點（改壞正則時整鎖恆綠）
    t.ok(total >= 20, "全站只解析到 " + total + " 個 @media 寬度斷點 ⇒ 正則與寫法脫節，本鎖對新漂移是瞎的");
    // 反恆真錨 ③：canonical 主幹確實在用（若一個都沒命中，代表掃錯檔／整體失效）
    t.ok(seen[480] && seen[560] && seen[720], "canonical 主幹 480/560/720 至少一個沒出現 ⇒ 掃描目標不對");

    // 主斷言：沒有 canonical∪exceptions 以外的寬度斷點
    t.equal(offenders.length, 0,
      "有 " + offenders.length + " 個 @media 寬度斷點逸出 R4 canonical 階梯：" + offenders.join("、") +
      "。修法＝① 若是任意漂移，snap 到最近的 canonical 階（R4『更早收欄＝更多空間』方向數學安全）；" +
      "② 若確為元件特定的必要例外，在本鎖的 EXCEPT 白名單登記並在 tokens.css 斷點註記補一行理由。");
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
/* 2026-09-02 平台軌·資安輪：**把掃描範圍從 `src/views/` 擴到整個 `src/`**。
 * 為什麼改：本鎖原本只 readdir `views/`，而真扣真派的跟注有**兩個**消費端——
 *   `views/liveroom.js`（整頁直播間，#86 當時有補閘）與 `layout/streamer.js`（子母畫面 PiP，**漏了**）。
 * `DEDUCT_RE` 的 `setBal(bal() - ` 分支**本來就打得中** streamer.js 第 85 行，
 *   唯一讓它逃掉的是**目錄範圍**：它住在 `layout/`，結構上在這把尺的視野之外。
 * ⭐ 而本鎖的「防空心」保險（樣本量 ≥17）**在原設計下永遠無法發現這件事**——
 *   它數的是「範圍內」的樣本數，範圍本身漏了一整個目錄時讀數完全正常。
 *   ⇒ CLAUDE.md §4「修一半而看不出來」家族的新變體：**尺的量程漏了一段，而防空心的保險也架在同一段量程裡。**
 * ⇒ 故新增不變量 (c)：這把尺**必須量得到 `views/` 以外的檔**。沒有這條，範圍再縮回去也不會紅。 */
selftest.register({
  id: "platform/rg-bet-gate-coverage", group: "platform", env: "node", tier: "fast",
  title: "負責任博弈：每個會動餘額的檔都必須掛 HL.rg 下注前閘（#86；2026-09-02 範圍由 views/ 擴為全 src/）",
  run: function (t) {
    var SRC = path.join(ROOT, "src");
    /* 扣餘額但**不是押注**者的豁免表。每筆都必須寫得出「它動餘額的方向/性質」，
     * 且下面 (d) 會逐筆複驗理由仍成立 ⇒ 想加名字進來，得先讓 (d) 過。 */
    var EXEMPT = {
      "core/faucet.js":      "救濟金：餘額只增不減（balance + RELIEF）＝送幣，不是押注",
      "core/progress.js":    "返水/進度領取：餘額只增不減（balance + amt）＝送幣，不是押注",
      "core/rewards.js":     "簽到日獎：餘額只增不減（balance + amount）＝送幣，不是押注",
      "layout/app-shell.js": "金流（儲值/提款/P2P）：其軸是 deposit 不是 bet ⇒ 走 #70 的 HL.rg.checkDeposit，見 (e)"
    };
    var files = [];
    (function walk(d) {
      fs.readdirSync(d).forEach(function (f) {
        var p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) return walk(p);
        if (/\.js$/.test(f)) files.push(p);
      });
    })(SRC);

    var deducting = [], ungated = [], outsideViews = [];
    files.forEach(function (p) {
      var rel = path.relative(SRC, p).replace(/\\/g, "/");
      var clean = stripComments(fs.readFileSync(p, "utf8"));
      if (!DEDUCT_RE.test(clean)) return;
      deducting.push(rel);
      if (rel.indexOf("views/") !== 0) outsideViews.push(rel);
      if (EXEMPT[rel]) return;
      if (!/HL\.rg\.check\s*\(/.test(clean)) ungated.push(rel);
    });

    // (a) 主不變量：會動餘額又不在豁免表上者，一律要有下注前閘
    t.equal(ungated.length, 0,
      "這些檔會動餘額卻沒有下注前閘（請補一行 `if (HL.rg && !HL.rg.check(bet)) return;`）：" + ungated.join("、"));

    // (b) 防「規則被改鬆到抓不到東西」＝樣本量本身也是鎖（2026-09-02 全 src/ 口徑基準 25；舊 views/ 口徑為 18）
    t.ok(deducting.length >= 25,
      "偵測到的動餘額檔只有 " + deducting.length + " 個（基準 25）⇒ DEDUCT_RE 被改窄或檔案被搬走，此鎖已失效");

    /* (c) ⭐ 量程錨：這把尺必須量得到 views/ 以外的檔。
     *     這正是 2026-09-02 之前漏掉 layout/streamer.js 的那一格——
     *     少了這條，任何人把 walk 改回 readdir(VIEWS_DIR) 都不會有任何測項變紅。 */
    t.ok(outsideViews.length >= 4,
      "本鎖只量到 views/ 內的檔（views/ 外實測 " + outsideViews.length + " 個，基準 4）⇒ 掃描範圍被縮回舊口徑，" +
      "而『樣本量 ≥25』那條保險是架在範圍**內**的、抓不到這種退化。實測 views/ 外：" + JSON.stringify(outsideViews));
    t.ok(outsideViews.indexOf("layout/streamer.js") >= 0,
      "layout/streamer.js（子母畫面跟注）必須落在本鎖量程內——它就是 #86 當年漏掉的那一個");

    // (d) 豁免理由複驗：豁免表上的檔若哪天真的開始「減」餘額，豁免即失效
    Object.keys(EXEMPT).forEach(function (rel) {
      var p = path.join(SRC, rel);
      t.ok(fs.existsSync(p), "豁免表指向不存在的檔 " + rel + "（檔案被搬走時豁免必須跟著失效，否則會靜默放行）");
      if (rel === "layout/app-shell.js") return;   // 金流檔本來就會減，理由不同，見 (e)
      var clean = stripComments(fs.readFileSync(p, "utf8"));
      t.equal(/HL\.state\.set\s*\(\s*\{\s*balance\s*:[^}]*-/.test(clean), false,
        rel + " 的豁免理由是「餘額只增不減＝送幣」，但它現在出現了減餘額的寫法 ⇒ 豁免失效，請改為補下注前閘");
    });

    // (e) 金流檔的豁免是「換一條軸」不是「沒有閘」⇒ 那條軸的閘必須真的在
    var shell = stripComments(fs.readFileSync(path.join(SRC, "layout", "app-shell.js"), "utf8"));
    t.ok(/HL\.rg\.checkDeposit\s*\(/.test(shell),
      "app-shell.js 以「軸不同」為由豁免下注前閘，那它就必須有 #70 的儲值側閘 HL.rg.checkDeposit——否則等於無閘");
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
  id: "platform/auth-view-i18n", group: "platform", env: "node", tier: "fast",
  title: "登入/註冊整頁 auth-view.js 的使用者可見片語須有 i18n（EN 全譯 + zh-Hans 差異補丁）（T37 · 維護軌 08-22）",
  run: function (t) {
    /* 為什麼要這條鎖：auth-view.js 是「真會員模式」的登入/註冊整頁，上線以來 i18n 覆蓋率 0/17
     *   ——切 EN/簡中時整頁露出繁中。維護軌 08-22 12:00 窗補進字典後，用本鎖釘住這批 key，
     *   避免日後被誤刪或漏補而靜靜退回未翻（漏翻不報錯、只在切語言時露中文，同 #106 support 教訓）。
     * 兩個分池的契約不同（i18n.js 檔頭）：
     *   · EN＝全譯 ⇒ 每一條片語都必須在 en.js 有一條（缺＝EN 模式露中文）。
     *   · zh-Hans＝只補與繁體不同的字 ⇒ 兩體相同的「或」刻意不列（列了是冗餘），故只驗會分歧的 14 條。 */
    var EN_ALL = [
      "密碼（至少 6 碼）", "登入", "註冊", "建立帳號", "處理中…",
      "請輸入 Email 與密碼", "密碼至少 6 碼", "請先輸入 Email",
      "登入連結已寄出，請收信點擊。",
      "註冊成功！若有開 Email 確認請收信驗證，再回來登入。",
      "登入以保存你的點數與戰績（跨裝置同步）", "或",
      "✉ 寄登入連結（免密碼）", "用 Google 登入",
      "Demo 試做 · 帳號內為虛擬點數，不涉及真實金流。",
      "Google 登入未啟用或失敗："  // 串接前綴（PREFIX 表）
    ];
    var HANS_DIFF = EN_ALL.filter(function (k) { return k !== "或"; }); // 「或」兩體相同、zh-Hans 刻意不列
    var Q = String.fromCharCode(34);
    function occ(src, key) { return src.split(Q + key + Q + ":").length - 1; }

    var enSrc = fs.readFileSync(path.join(ROOT, "src", "i18n", "en.js"), "utf8");
    var hansSrc = fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-Hans.js"), "utf8");
    t.ok(enSrc.length > 0 && hansSrc.length > 0, "找不到 en.js／zh-Hans.js 語言包 ⇒ 本鎖會空掃而假綠");

    EN_ALL.forEach(function (k) {
      t.ok(occ(enSrc, k) >= 1, "auth-view 片語「" + k + "」缺 EN 譯（en.js 為全譯、缺＝EN 模式露繁中）");
    });
    HANS_DIFF.forEach(function (k) {
      t.ok(occ(hansSrc, k) >= 1, "auth-view 片語「" + k + "」缺 zh-Hans 譯（此條繁簡不同、需補差異補丁）");
    });
    // 反向錨：「或」兩體相同，zh-Hans 不得列（列了＝違反差異補丁契約、冗餘且易漂移）
    t.equal(occ(hansSrc, "或"), 0, "「或」繁簡相同，不應出現在 zh-Hans 差異補丁（列了是冗餘）");
    // 樣本量下限：防有人把清單改空而假綠
    t.ok(EN_ALL.length >= 16, "auth-view 片語清單被改到少於 16 條 ⇒ 覆蓋面縮水、疑似假綠");
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

/* ===================== #142 經濟旋鈕的「射程」與陣列形制的鑑別力 =====================
 * 起點是一次對 `platform/econ-cfg-coverage` 的射程盤問（08-28 20:00 窗）：那條鎖的三條斷言
 *   （found/missing、registrants 下限、三元式禁令）**全部只掃 `src/core`**。
 *   「經濟旋鈕住在 core」這條慣例本身，在此之前**沒有任何機械保證**——而 #110/#118 正在
 *   把檔案在 core / views / 延遲層之間搬來搬去，所以這不是假想風險。
 *
 * 但盤問當場撞到第二件事，而它才是真正的阻塞點：
 *   **陣列型三元式 `isLive() ? [...]` 這條規則沒有任何鑑別力。**
 *   純量型（#97）早就學過這一課——它明文要求**兩臂都是數字字面量**，理由寫在鎖裡：
 *   `raffle.js` 的 `botTickets: isLive() ? 0 : rint(...)` 是氛圍量、不是旋鈕，過寬的規則會
 *   「逼出假的 register」。**同一條禁令裡的陣列型兄弟卻從來沒拿到這個待遇。**
 *   ⇒ 這正是 CLAUDE.md §4 記的那個家族（「有沒有反向？有沒有第二個消費者？」）：
 *     一條規則修了一半，而它看起來完全正常——因為在 `src/core` 內陣列型**目前命中 0 個檔**，
 *     鑑別力不足這件事在 core 的射程內**永遠不會顯形**。
 *
 * 【今日的真實見證（不是假想）】把同一條 naive 規則往 core 外延一步就會炸：
 *   `src/views/global-prize.js:132` — `(HL.site && HL.site.isLive()) ? [] : HL.mock.makeContributors()`
 *   那是 §4 的**假資料閘**（真站不顯示假得獎人/假貢獻榜），不是經濟旋鈕。
 *   ⇒ 所以「把 econ-cfg-coverage 的掃描目錄從 core 改成 src」這個看似一行的修法，
 *     在補上鑑別規則之前**必然誤報**，而誤報的處置會是「幫假資料閘註冊一張經濟表」＝把錯的東西寫進台帳。
 *   **先有鑑別力，才談得上擴射程。這條鎖就是那個前置條件。**
 *
 * 【鑑別規則】比照純量型的「兩臂都是值」紀律，改判「**至少一臂是數字字面量陣列**」：
 *   旋鈕（真實出處 commit `a388822` 的 `cashback.js`）＝ `? [0.02,…] : [0.05,…]` 兩臂都是數字陣列；
 *   假資料閘＝ `? [] : HL.mock.makeXxx()` 一臂空陣列、一臂呼叫式 ⇒ 判非旋鈕。
 *   順帶補上 naive 版漏掉的**反序**寫法 `? HL.mock.rates() : [0.1, 0.2]`（naive 要求 `?` 後緊跟 `[`，看不到它）。
 */
selftest.register({
  id: "platform/econ-cfg-knob-form-discrimination", group: "platform", env: "node", tier: "fast",
  title: "#142 經濟旋鈕陣列形制要有鑑別力，且 core 外不得藏旋鈕（econ-cfg-coverage 的射程閉合前置）",
  run: function (t) {
    var SITE_CHK = "(?:isLive|liveOn)\\s*\\(\\s*\\)";
    var NUM = "-?[0-9]+(?:\\.[0-9]+)?";
    var NUM_ARR = "\\[\\s*" + NUM + "(?:\\s*,\\s*" + NUM + ")*\\s*,?\\s*\\]";
    // econ-cfg-coverage 現行的陣列規則（naive：`?` 後緊跟一個 `[` 就算）
    var ARR_NAIVE = new RegExp(SITE_CHK + "[\\s)]*\\?\\s*\\[");
    // 本鎖提出的鑑別版：至少一臂是「數字字面量陣列」
    var ARR_KNOB = new RegExp(SITE_CHK + "[\\s)]*\\?\\s*(?:" + NUM_ARR + "\\s*:|[^;\\n]{0,80}?:\\s*" + NUM_ARR + ")");
    var SCALAR = new RegExp(SITE_CHK + "[\\s)]*\\?\\s*" + NUM + "\\s*:\\s*" + NUM);
    var TABLE = /\{\s*demo\s*:\s*[-\[0-9]/;

    /* 四個形狀全部取自 repo 真實內容，不是為了過測而編的（同 08-15「擾動要用真實世界會出現的形狀」）。 */
    var KNOB = "var CB_RATES = (HL.site && HL.site.isLive()) ? [0.02, 0.03, 0.04, 0.05, 0.06] : [0.05, 0.07, 0.10, 0.12, 0.15];";
    var GATE = "showContributors((HL.site && HL.site.isLive()) ? [] : HL.mock.makeContributors(), false)";
    var GATE2 = "var ws = (HL.site && HL.site.isLive()) ? [] : HL.mock.makeLastWinners();";
    var REVERSED = "var R = liveOn() ? HL.mock.rates() : [0.1, 0.2];";

    /* ① 先把「缺口確實存在」釘成斷言：naive 規則對旋鈕與假資料閘**一視同仁**。
     *    這條不是裝飾——哪天有人真的把陣列規則收緊了，它會轉紅，提醒本鎖與那份收緊同步。 */
    t.equal(ARR_NAIVE.test(KNOB) && ARR_NAIVE.test(GATE), true,
      "naive 陣列規則已能分辨旋鈕與假資料閘＝本鎖的前提已改變，請同步複查 econ-cfg-coverage 的陣列規則與本鎖");

    /* ② 鑑別力正向：真旋鈕要抓到。 */
    t.ok(ARR_KNOB.test(KNOB),
      "鑑別規則抓不到真實旋鈕形狀（commit a388822 的 cashback.js CB_RATES）＝規則過窄、等於空的");

    /* ③ 鑑別力反向：假資料閘不得被誤判成旋鈕（誤判的代價＝逼出一張假的經濟表註冊）。 */
    t.equal(ARR_KNOB.test(GATE), false,
      "鑑別規則把假資料閘 `? [] : HL.mock.makeContributors()` 誤判為經濟旋鈕（global-prize.js:132 的真實寫法）");
    t.equal(ARR_KNOB.test(GATE2), false,
      "鑑別規則把假資料閘 `? [] : HL.mock.makeLastWinners()` 誤判為經濟旋鈕");

    /* ④ 順帶補回 naive 看不見的反序寫法——證明本規則不只是「naive + 過濾」，而是真的更大。 */
    t.equal(ARR_NAIVE.test(REVERSED), false,
      "naive 規則已看得到反序寫法＝本鎖 ④ 的前提已改變，請複查");
    t.ok(ARR_KNOB.test(REVERSED),
      "鑑別規則漏掉反序寫法 `? HL.mock.rates() : [0.1, 0.2]`（旋鈕放在 false 臂）");

    /* ⑤ 射程閉合：站別分歧的**經濟旋鈕**不得出現在 src/core 之外。
     *    econ-cfg-coverage 的三條斷言都只掃 core ⇒ core 外的旋鈕會靜默逃過
     *    「必須註冊自我描述」與「不得用三元式宣告」兩條紀律，儀表板從此看不到它。
     *    處置有兩條、都可接受：搬進 src/core/，或就地 `HL.econCfg.register` 並把它納入 coverage 的掃描。 */
    function walk(d, acc) {
      fs.readdirSync(d, { withFileTypes: true }).forEach(function (e) {
        var p = path.join(d, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (/\.js$/.test(e.name)) acc.push(p);
      });
      return acc;
    }
    var files = walk(path.join(ROOT, "src"), []);
    var tableHits = 0, strays = [];
    files.forEach(function (p) {
      var rel = path.relative(ROOT, p).split(path.sep).join("/");
      var code = stripComments(fs.readFileSync(p, "utf8"));
      var isKnob = TABLE.test(code) || ARR_KNOB.test(code) || SCALAR.test(code);
      if (TABLE.test(code)) tableHits++;
      if (!isKnob) return;
      if (rel.indexOf("src/core/") !== 0) strays.push(rel);
    });
    t.equal(strays.join(","), "",
      "下列 src/core 之外的檔含站別分歧的經濟旋鈕，會整個逃過 econ-cfg-coverage（它只掃 core）：" +
      strays.join(", ") + " ⇒ 請搬進 src/core/ 或就地 register 並擴充 coverage 的掃描目錄");

    /* ⑥ 自我保護（同 coverage 的樣本量下限）：掃描器壞掉/走錯目錄時，⑤ 會因為「什麼都沒掃到」而假綠。 */
    t.ok(files.length >= 60,
      "掃描只看到 " + files.length + " 支 src js 檔（下限 60）＝走錯目錄或 walker 壞了，⑤ 是假綠");
    t.ok(tableHits >= 9,
      "全 src 只掃到 " + tableHits + " 個 `{demo:…}` 經濟表（下限 9）＝表形規則被改窄，⑤ 的鑑別基礎已失效");
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
    var axOrder = registryReadyBefore(s, "./src/views/casino.js", iT);
    t.ok(axOrder.ok, "軸必須早於 casino.js 就緒（" + axOrder.how + "）");
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
    // ⚠️ 2026-09-01（平台軌 14:00 窗查獲）：`_reset()` 會同時清掉**參數化**登記表（`_p`/`_pOrder`），
    //   但 `list()` 只回單值那一半 ⇒ 舊版的「還原後筆數應相同」對參數化那半**完全免疫**，
    //   plinko 的 rangeOf/isParameterized 從此在本測項之後**永久為空**，而每一項仍全綠。
    //   ⇒ CLAUDE.md §4「修一半而看不出來」在**測試防污染**這一層的實例：防污染守衛只守了一半，
    //   被它污染的是「後面每一個讀參數化登記表的測項」，症狀是**斷言變成 vacuous 而非轉紅**。
    var pSnapshot = R.parameterizedIds().map(function (id) { return R.rangeOf(id); });
    t.ok(pSnapshot.length >= 1, "參數化登記表本來就是空的？（基準：plinko 1 筆）⇒ 下面的還原斷言會變成空對空");
    R._reset();
    t.equal(R.list().length, 0, "空登記表的 list() 應為空陣列");
    t.equal(R.parameterizedIds().length, 0, "_reset() 必須連參數化登記表一起清（兩個登記表是同一份真相的兩半）");
    t.equal(R.of("cases"), null, "空登記表求值應回 null 而非拋錯");
    snapshot.forEach(function (e) { R.declare(e.id, e); });
    pSnapshot.forEach(function (e) { R.declareRange(e.id, e); });
    t.equal(R.list().length, snapshot.length, "還原後筆數應相同（測項不得污染後續測項）");
    t.equal(R.parameterizedIds().length, pSnapshot.length,
      "參數化登記表沒還原＝本測項會靜默污染其後每一個讀 rangeOf/isParameterized 的測項");
    // 掛載：必須真的在 index.html，且早於 casino.js（RTP 軸未來要在大廳讀它）
    var s = staticScripts(indexHtml());
    var iR = s.indexOf("./src/data/game-rtp.js");
    t.ok(iR >= 0, "index.html 未掛載 data/game-rtp.js（全站問不到 RTP，等於這張卡沒落地）");
    var rtpOrder = registryReadyBefore(s, "./src/views/casino.js", iR);
    t.ok(rtpOrder.ok, "game-rtp.js 必須早於 casino.js 就緒（" + rtpOrder.how + "）");
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

/* ── #112 通則鎖：延遲清單上的檔，不得有「無法滿足的共享依賴」──────────────────
 * 【為什麼上一條擋不住這一種】上一條問的是「首屏會不會碰到它」。它結構上答不出第二個問題：
 *   「這支檔掛出去的全域，有沒有**另一支同樣被延後**的檔在用？」
 *   2026-08-22 本輪實例（工具與兩條既有鎖都放行、差一步就上線）：
 *   `views/slot.js` 掛 `HL.slotEngine`，首屏零引用（safe-to-lazy 判斷正確）；但
 *   `views/vsslot.js:508` 寫 `if (!room || !HL.fgBoard || !HL.slotEngine) …「遊戲引擎未載入。」`，
 *   而 vsslot **自己也在延遲清單上** ⇒ 誰先載入沒有保證 ⇒ 每一場 Slots Battle 都落進錯誤分支。
 *   當時：首屏 KB 真的降了、`--verify` 全過、上面那條鎖全綠、console 零錯誤 —— 只有玩家看得到壞掉。
 *   第二個盲點讓它更難發現：`views/fgboard.js:20` 寫 `var E = HL.slotEngine;` 才 `E.makeGrid(…)`
 *   ⇒ 文字上永遠不出現 `HL.slotEngine.makeGrid`，needs-methods 偵測整段失效。
 * 【本鎖的形狀】判準放在工具（`sharedRisks()`，見該檔 ④ 段落），這裡只斷言「風險筆數為 0」，
 *   並附**反向錨**防它靜默轉綠：把 slot.js 當成假想成員時必須算得出風險——
 *   工具若哪天壞成「什麼都判可滿足」，反向錨會先紅。 */
selftest.register({
  id: "platform/lazy-no-unsatisfiable-shared-dep", group: "platform", env: "node", tier: "fast",
  title: "延遲清單上的檔不得有無法滿足的共享依賴（另一支延遲檔／別名接走整個命名空間）",
  run: function (t) {
    if (!fsDeps || !fsDeps.sharedRisks) t.skip("intel/tools/first-screen-deps.js 不可用或版本過舊");
    var risks = fsDeps.sharedRisks();
    t.equal(risks.length, 0,
      "延遲清單上有 " + risks.length + " 個無法滿足的共享依賴：" +
      risks.map(function (r) {
        return r.owner + " 的 " + r.sym + " ← " + r.file + ":" + r.line + " [" + r.kind +
          (r.peerLazy ? "·peer-lazy" : "") + "]";
      }).join("；") +
      "。修法：把共享引擎抽成 core（不隨 view 一起延後），或讓消費端先 `HL.lazy*.load(...)` 再用；" +
      "**不要**只把它從清單移除就當沒事——那只是回到沒省 KB 的狀態。");

    // 反向錨：假想把 slot.js 加進清單 ⇒ 必須算得出「vsslot 以存在性守衛消費 HL.slotEngine」。
    // 沒有這一句，工具退化成「一律回可滿足」時上面那句會靜默全綠。
    var probe = fsDeps.analyze("./src/views/slot.js");
    if (probe) {
      var hasSlotEngineRisk = (probe.risks || []).some(function (r) { return /slotEngine/.test(r.sym); });
      t.ok(hasSlotEngineRisk,
        "反向錨失效：slot.js 掛的 HL.slotEngine 明明被 vsslot(延遲)／fgboard(別名) 消費，" +
        "分析器卻算不出任何風險 ⇒ 要嘛那些消費點真的被拆掉了（請一併改寫本錨與卡 #118），" +
        "要嘛 ④ 的判準壞了而正在把所有共享依賴都判成可滿足");
      t.ok(probe.verdict === "shared-dep-blocked",
        "slot.js 應被判 shared-dep-blocked（現為 " + probe.verdict + "）＝這是 #118 未落地前不得遷移它的機械理由");
    }
  }
});

/* ── 首屏分析器自身的兩條鎖（2026-08-24 平台軌 14:00 窗）──────────────────────
 * 【為什麼分析器自己需要鎖】上面兩條鎖問的都是「**清單上的檔**有沒有問題」，兩條都**以分析器的判斷為前提**。
 *   分析器本身算錯時，它們一個字都不會說——2026-08-24 實測就是這樣：
 *   `core/reports.js:69` 有一行 `var NEEDS_QUOTE = /[",\n]/;`，遮罩器不認正則字面量，
 *   把裡面那個 `"` 當成字串開頭 ⇒ 該檔遮罩自第 73 行起整個失準（最長一段吞掉 line 318→738）
 *   ⇒ `HL.reports = {…}`（line 714）**根本沒被看見** ⇒ 分析結果「① 全域：（無）」
 *   ⇒ 「首屏零引用」在沒有任何全域可查的前提下**自動成立** ⇒ 判成 `safe-to-lazy`。
 *   當時：`--verify` 全過、上面兩條鎖全綠、node 全套 269 全綠。
 *   而它偏偏落在**全庫可回收 KB 最大的一支（42.9KB）**＝誘因最強、最可能被下一輪真的搬走的位置，
 *   且那正是工具檔頭寫明「代價不對稱、誤判 safe 是線上白屏」要避免的方向。
 *   ⇒ 教訓（CLAUDE.md §4「修一半而看不出來」家族）：**最高信心的那一格，可能正是「什麼都沒看到」產生的**。
 *     「零引用」必須先證明「有東西可引用」，否則它只是**沒有證據**，不是**安全的證據**。 */
selftest.register({
  id: "platform/fsdeps-mask-no-desync", group: "platform", env: "node", tier: "fast",
  title: "首屏分析器：原檔有 HL.<ns> = 賦值時，分析結果不得算出「零全域」（遮罩失準偵測）",
  run: function (t) {
    if (!fsDeps || !fsDeps.candidates) t.skip("intel/tools/first-screen-deps.js 不可用或版本過舊");
    // 原檔粗掃＝超集偵測器：它只回答「這檔到底有沒有掛全域」，不參與任何判斷。
    var RAW = /(?:^|[^\w$.])HL\.([A-Za-z_$][\w$]*)\s*=[^=]/gm;
    var blind = [], checked = 0, withGlobals = 0;
    fsDeps.candidates("all").forEach(function (rel) {
      var abs = path.join(ROOT, rel.replace(/^\.\//, ""));
      if (!fs.existsSync(abs)) return;
      var r = fsDeps.analyze(rel);
      if (!r) return;
      checked++;
      var raw = {}, x, re = new RegExp(RAW.source, "gm");
      var src = fs.readFileSync(abs, "utf8");
      while ((x = re.exec(src))) if (x[1] !== "views") raw[x[1]] = true;
      var rawNames = Object.keys(raw);
      if (!rawNames.length) return;
      withGlobals++;
      if (!r.surfaces.globals.length && !r.surfaces.views.length) {
        blind.push(rel + "（原檔有 HL." + rawNames.join("／HL.") + " 賦值，分析卻算出零全域）");
      }
    });
    t.equal(blind.length, 0,
      "分析器對 " + blind.length + " 支檔看不見它掛出去的全域 ⇒ 這些檔的『首屏零引用』是假的，" +
      "它們會被誤判成 safe-to-lazy 而被搬離首屏（＝線上白屏或靜默壞掉）：" + blind.join("；") +
      "。最可能的原因是 maskSrc 遮罩失準（正則字面量／樣板字串／跨行字串），先修遮罩再看結論。");
    // 反向錨一：樣本量本身也是鎖。規則若被改窄到掃不到東西，上面那句會靜默全綠。
    t.ok(withGlobals >= 50,
      "只掃到 " + withGlobals + " 支「原檔有掛全域」的檔（基準 50，全庫實測 " + checked + " 支候選）" +
      " ⇒ RAW 粗掃或 candidates() 被改窄，此鎖已失效");
    // 反向錨二：具名 witness。reports.js 就是踩過這個坑的那一支，它必須看得見 HL.reports。
    var rep = fsDeps.analyze("./src/core/reports.js");
    if (rep) {
      t.ok(rep.surfaces.globals.indexOf("reports") >= 0,
        "反向錨失效：core/reports.js 明明有 `HL.reports = {…}`，分析器卻沒看見 ⇒ 遮罩又退化了" +
        "（2026-08-24 的復發：正則字面量 /[\",\\n]/ 讓遮罩自該行起整檔失準）");
    }
  }
});

/* ── ⑤ 出站註冊方向（同輪新增，理由見工具檔 ⑤ 段落）──────────────────────────
 * ①～④ 全都在問「**誰讀我**」。但本庫的擴充性主形制是**內容檔在載入當下把自己寫進別人的登記簿**
 *   （`HL.econCfg.register`／`HL.achievements.register`／`HL.reports.register`／`HL.dock.register`…）。
 *   這個方向**沒有任何人讀它的全域** ⇒ 入站分析必然算出「零引用」⇒ 自動 safe-to-lazy，
 *   而延後它的後果是那筆註冊**永遠不會發生**：容器少一格、面板少一列、成就牆少一枚，
 *   **不報錯、console 全乾淨、既有鎖全綠**。實例＝`core/faucet.js:135`，修好遮罩後它是全庫
 *   唯一一支非基礎建設的 safe-to-lazy，也正好踩在這個盲點上。
 * 本鎖釘住規則的**兩面**（只釘一面就會變成「鎖是空的」——本庫反覆踩過）：
 *   正面＝已延遲的 28 支（線上跑得好好的地面真相）不得被誤傷；
 *   反面＝全庫必須算得出 witness，且 faucet.js 這支具名 witness 必須仍被擋。 */
selftest.register({
  id: "platform/fsdeps-boot-registration-guard", group: "platform", env: "node", tier: "fast",
  title: "首屏分析器：開機出站註冊（寫進別人登記簿）必須擋得住，且不誤傷已延遲清單",
  run: function (t) {
    if (!fsDeps || !fsDeps.candidates) t.skip("intel/tools/first-screen-deps.js 不可用或版本過舊");
    var lazy = fsDeps.lazyManifestSrcs(), hurt = [];
    lazy.forEach(function (s) {
      var r = fsDeps.analyze(s);
      if (r && (r.regs || []).length) {
        hurt.push(s + " → " + r.regs.map(function (g) { return g.ns + "." + g.method + "@" + g.line; }).join("、"));
      }
    });
    t.equal(hurt.length, 0,
      "⑤ 誤傷 " + hurt.length + " 支已在線上延遲載入且沒壞的檔：" + hurt.join("；") +
      "。若該登記簿確實備有『內容遲到』協定（容器先註冊 stub、內容檔載入時以同 id 換手），" +
      "請把它加進工具的 REG_DEFERRABLE 並寫明協定出處；不要為了轉綠而放寬判準。");
    var all = fsDeps.candidates("all").map(fsDeps.analyze).filter(Boolean);
    var witness = all.filter(function (r) { return (r.regs || []).length; });
    t.ok(witness.length >= 10,
      "⑤ 在全庫只有 " + witness.length + " 個 witness（基準 10）⇒ 規則被改窄或 REG_DEFERRABLE 被濫用，等於沒開");
    var fa = fsDeps.analyze("./src/core/faucet.js");
    if (fa) {
      t.ok(fa.verdict === "boot-registration-blocked",
        "反向錨失效：core/faucet.js 在載入當下呼叫 HL.econCfg.register（#97 經濟旋鈕自我描述），" +
        "延後它＝營運面板永遠少那一格且不報錯，卻被判成 " + fa.verdict +
        "。若那段註冊真的被搬走了，請一併改寫本錨；否則就是 ⑤ 的開機位置判定又壞了" +
        "（2026-08-24 的復發：moduleIife 用『function 出現在前 200 字元內』認 IIFE，" +
        "被長檔頭註解推開後全庫取不到 IIFE ⇒ 模組頂層被當成匿名函式內）。");
    }
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
var RBAC_SRC_F = path.join(ROOT, "src", "core", "rbac.js");
// #117：受眾值域的唯一權威（測項側不得再抄一份 player|ops）
var RBAC_MOD_T = require(RBAC_SRC_F);
var RBAC_SEEDED = RBAC_MOD_T.seeded();
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
        /* §10.1 改錨（#117 · 2026-08-22）：原本這裡硬寫 `"(player|ops)"` ＝在測項側抄了一份受眾值域。
           值域改由 `HL.rbac` 提供後，那份抄本會在「新增第三種身分」時變成錯的（而且是它先變紅、
           不是產品先壞）⇒ 改成**把 aud 的值抓出來、拿去問真正的授權表**。守的不變量一字未變：
           每一筆註冊都必須明寫一個合法受眾，否則 register() 靜默回 null。 */
        var mAud = /aud\s*:\s*"([^"]*)"/.exec(body);
        t.ok(!!mAud, base + " 第 " + n + " 筆註冊完全沒寫 aud ⇒ register() 靜默回 null（報表從未存在，畫面完全正常）");
        t.ok(!!mAud && RBAC_SEEDED.knows(mAud[1]),
          base + " 第 " + n + " 筆註冊的受眾「" + (mAud ? mAud[1] : "（未寫）") +
          "」不在授權表值域內（現況：" + RBAC_SEEDED.ids().join("／") + "）⇒ register() 靜默回 null");
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
      list: function () {
        // betThrows：模擬「這張報表的 rows() 讀不出來」——本檔 platform/reports-error-not-empty 的入口
        if (opts.betThrows) throw new Error("betlog boom");
        return (opts.betRows || []).slice();
      },
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
    /* #117：受眾值域的來源。注入的是**真的 rbac.js**（種好第一批身分的實例），不是假物件
       ——假一份就等於在測項裡重建了那把被移除的硬寫值域。`opts.noRbac` 供 fail-closed 反例用。 */
    rbac: opts.noRbac ? null : RBAC_MOD_T.seeded(),
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

/* ═══════════════════════════════════════════════════════════════════════════
 * #117 營運身分的述詞註冊表 HL.rbac（2026-08-22 平台軌·20:00 窗）
 * 這張卡把「受眾值域」從 reports.js 的硬寫兩值陣列換成一個容器。它會壞掉的方式有三種，
 * 三種都**畫面完全正常**（CLAUDE.md §4「修一半而看不出來」家族）：
 *   ① 載入序排反 ⇒ reports.js 註冊 3 張 ops 報表時值域還不存在 ⇒ 靜默少三張報表；
 *   ② 某個消費端自己判一次授權（`aud === "ops"`）⇒ 第二把尺，兩份規則會靜靜分岔；
 *   ③ 容器沒有任何消費端 ⇒ 又一個孤兒註冊出口（#109 ③／#115／#114 一路踩過三次）。
 * ⚠️ 本輪**刻意沒有**立「只數 HL.rbac.register 外部呼叫者」那條鎖（#117 卡上原本要求的形狀）：
 *    唯一誠實的外部註冊者會是 demo-tools.js（它是全站唯一產生 ops 上下文的地方），但它靜態排在
 *    reports.js **之前**，把 ops 身分搬過去等於親手製造上面的失敗模式 ①。故 BASELINE 留在 rbac.js，
 *    改以「消費端非孤兒 + 顯示與匯出兩條路徑都走同一個謂詞」來守同一件事；
 *    第三種身分真的出現時，它必須排在消費端之前——那條順序鎖（rbac-load-order）現在就先立好。
 * ═══════════════════════════════════════════════════════════════════════════ */
selftest.register({
  id: "platform/rbac-load-order", group: "platform", env: "node", tier: "fast",
  title: "#117 ①：rbac.js 必須排在 reports.js 之前（排反了只會靜默少掉全部 ops 報表）",
  run: function (t) {
    var scripts = staticScripts(indexHtml());
    var iA = scripts.indexOf("./src/core/rbac.js");
    var iR = scripts.indexOf("./src/core/reports.js");
    t.ok(iA > -1, "index.html 必須靜態掛載 core/rbac.js（沒掛＝報表受眾值域為空＝報表中心整個空掉）");
    t.ok(iR > -1, "index.html 必須靜態掛載 core/reports.js");
    t.ok(iA < iR, "rbac.js（第 " + iA + " 支）必須早於 reports.js（第 " + iR + " 支）——" +
      "後者載入當下就註冊 3 張 aud:ops 的報表，值域未知時 register() 回 null 而不拋錯");
    // 依賴的真實性也要鎖：哪天 reports.js 不再向 rbac 求值域，這條順序鎖就該一起改寫而非留著誤導
    var rep = fs.readFileSync(REPORTS_SRC, "utf8");
    t.ok(/rb\.knows\s*\(\s*def\.aud\s*\)/.test(rep), "reports.js 的受眾值域閘必須向 rbac.knows(def.aud) 求");
    // rbac.js 不得被搬進延遲清單（搬走＝首屏那一批註冊全部落空）
    var lazyFiles = ((lazyViews && lazyViews.manifest) || []).map(function (m) {
      return path.basename(String((m && m.src) || ""));
    }).filter(Boolean);
    t.equal(lazyFiles.indexOf("rbac.js") > -1, false, "rbac.js 不得延遲載入（值域必須早於任何註冊者）");
  }
});

selftest.register({
  id: "platform/rbac-single-predicate", group: "platform", env: "node", tier: "fast",
  title: "#117 ②：授權只有一個謂詞——消費端不得自己比對受眾值（第二把尺會靜靜分岔）",
  run: function (t) {
    // 定義端唯一：grant 涵蓋規則（covers）只允許定義在 rbac.js
    var owners = [];
    allSrcJs().forEach(function (p) {
      var clean = noComments(fs.readFileSync(p, "utf8"));
      if (/function\s+covers\s*\(/.test(clean)) owners.push(path.basename(p));
    });
    t.equal(owners.join(","), "rbac.js",
      "述詞涵蓋規則只允許定義在 core/rbac.js（實測：" + (owners.join("、") || "（零命中＝掃描壞了）") + "）");

    // 消費端：reports.js 的授權判斷必須整段外包，且**顯示與匯出兩條路徑共用同一個閘**
    var rep = noComments(fs.readFileSync(REPORTS_SRC, "utf8"));
    t.ok(/rbac\.can\s*\(\s*def\.aud\s*,\s*ctx\s*\)/.test(rep), "受眾閘必須呼叫 rbac.can(def.aud, ctx)");
    t.equal(/def\.aud\s*===\s*"ops"/.test(rep), false,
      "reports.js 不得留下任何「aud === 'ops'」式的硬寫授權判斷（那就是第二把尺）");
    var iDl = rep.indexOf("function download(");
    t.ok(iDl > -1, "reports.js 應有 download()（匯出路徑；取不到代表本條掃錯範圍）");
    var dlBody = rep.slice(iDl, iDl + 400);
    t.ok(/R\.visible\s*\(\s*d\s*,\s*ctx\s*\)/.test(dlBody),
      "匯出路徑必須再走同一個閘一次——CSV 才是資料本體，只擋顯示的閘等於沒擋");

    // 站別軸不得被角色軸冒充（卡上的紅線 ④）
    var rb = noComments(fs.readFileSync(RBAC_SRC_F, "utf8"));
    t.equal(/HL\.site/.test(rb), false, "rbac.js 不得讀 HL.site（身分軸與站別軸正交，不得互相冒充）");
    t.equal(/lsSet\s*\(|localStorage/.test(rb), false, "rbac.js 不得自己寫任何儲存（角色不是玩家存檔）");
  }
});

selftest.register({
  id: "platform/rbac-not-orphan", group: "platform", env: "node", tier: "fast",
  title: "#117 ③：容器不得是孤兒——謂詞必須有真實消費端，且第一批身分恰為現況兩種",
  run: function (t) {
    var consumers = [];
    allSrcJs().forEach(function (p) {
      if (path.basename(p) === "rbac.js") return;                    // 定義處不算消費端
      if (/[\\/]i18n[\\/]/.test(p)) return;                          // 譯文字串不算
      var clean = noComments(fs.readFileSync(p, "utf8"));
      if (/(HL\.rbac|rbac)\.(can|knows|grantsOf|rolesOf)\s*\(/.test(clean)) consumers.push(path.basename(p));
    });
    t.ok(consumers.length >= 1,
      "HL.rbac 的非註解消費端只有 " + consumers.length + " 個 ⇒ 容器沒人用（#109 ③／#115／#114 踩過三次的形狀）");
    t.ok(consumers.indexOf("reports.js") > -1, "reports.js 應是消費端之一（受眾閘）");

    // 第一批身分＝現況兩種（值域仍封閉；多一種＝加一筆註冊，不是改這裡）
    t.equal(RBAC_SEEDED.ids().join(","), "player,ops", "種子身分必須恰為 player,ops");
    t.equal(RBAC_MOD_T.makeRbac().ids().length, 0, "容器本身不得自帶角色（拆鎖不得順手把容器變成有內建）");
    // 零回歸：三種判斷結果與改版前的硬寫閘逐位相同
    t.equal(RBAC_SEEDED.can("player", {}), true, "不給 ctx 應看得到玩家報表");
    t.equal(RBAC_SEEDED.can("ops", {}), false, "不給 ctx 不得看到營運報表");
    t.equal(RBAC_SEEDED.can("ops", { ops: true }), true, "{ops:true} 應看得到營運報表");
    /* 反向錨（本條最重要的一句）：把種子身分換成一個「什麼都授」的角色時，上面那三句必須有一句變假。
       否則本條可能在 can() 退化成恆真的情況下全綠——那正是「閘壞掉」與「閘正常」的同形陷阱。 */
    var wide = RBAC_MOD_T.makeRbac();
    wide.register({ id: "everyone", base: true, grants: ["ops", "player"] });
    t.equal(wide.can("ops", {}), true, "自檢：恆真形狀確實會讓「不給 ctx 不得看營運」那句變假（本條有辨別力）");
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

/* ===========================================================================
 * #119 — 新表面的 i18n 覆蓋棘輪閘
 * ---------------------------------------------------------------------------
 * 【為什麼是棘輪，不是又一條逐表面的鎖】
 *   既有 i18n 鎖（`support-title-i18n`／`auth-view-i18n`／`game-axes-title-i18n`）都得
 *   **有人先想到那個表面**才存在 ⇒ 對「還沒寫的表面」永遠是零覆蓋。#109 報表中心就是這樣
 *   帶著 13 個零翻譯鍵上線、node 全綠、console 零錯誤，直到後手在 #117 實作輪偶然撞見
 *   （船長 P3 紀律第 7 次被記錄）。本鎖改成「全站掃、缺漏數不得增加」——**新檔天生在射程內**。
 *
 * 【口徑與分類】全在 `tests/i18n-key-scan.js`（鎖與 `intel/tools/i18n-key-gaps.js` 共用同一份，
 *   不得各自實作正則——本專案已被「同一把尺抄成兩份然後 drift」咬過太多次）。
 *
 * 【基線＝0（2026-08-23 平台軌 08:00 窗實測後補完）】
 *   首次量測是 15 條真缺漏（EN 2／zh-Hans 13，其中 11 條是兌換碼面板整片零 zh-Hans 覆蓋），
 *   數量小到值得當輪補完 ⇒ 直接把基線壓到 0，棘輪從此是「全站零容忍」。
 *   ⚠️ 基線只准往下調，不准往上：往上調＝把「新表面可以零翻譯上線」重新合法化，正是本卡要根治的事。
 *   若哪天真有大批不可避免的缺漏（例如整批新面板一次落地），正確做法是**分批補**，
 *   或在 `I18N_BASELINE` 逐檔記一個帶日期與理由的暫時上限，而不是動總量。
 *
 * 【會不會無故轉紅】會，而且是刻意的：zh-Hans 的「需不需要補」是從既有條目反推的變化字集，
 *   所以**補了一條 zh-Hans 之後，可能讓別處某條原本判 N/A 的鍵變成缺漏**（字集學到了新字）。
 *   那不是誤報——那條鍵本來就該補，只是先前工具看不出來。
 * =========================================================================== */
var i18nScan = require(path.join(__dirname, "i18n-key-scan.js"));

var I18N_BASELINE = {};          // 逐檔缺漏上限；不在表內的檔（含所有新檔）一律 0 容忍
var I18N_BASELINE_TOTAL = 0;     // 全站缺漏總量上限

selftest.register({
  id: "platform/i18n-key-ratchet", group: "platform", env: "node", tier: "fast",
  title: "i18n 整節點鍵覆蓋棘輪：全站 t(\"中文\") 鍵的 EN/zh-Hans 缺漏不得增加，新檔零容忍（#119）",
  run: function (t) {
    var r = i18nScan.measure();
    var T = r.totals;

    /* ① 反向錨（防「掃不到任何東西＝完美通過」的同形陷阱）。
       這組下限刻意訂在實測值的七成上下：正則寫壞／掃描目錄被改掉／字典載入失敗時，
       這裡會先紅，而不是讓缺漏數變 0 假裝全站翻譯完美。 */
    t.ok(T.sites >= 350, "掃到的 t() 呼叫點只有 " + T.sites + " 個（實測基準 ~498）⇒ 掃描器多半壞了，本鎖正在空掃");
    t.ok(T.keys >= 240, "抽出的整節點鍵只有 " + T.keys + " 條（實測基準 ~334）⇒ 掃描器多半壞了");
    t.ok(T.dictEn >= 1000, "en.js 只讀到 " + T.dictEn + " 條 ⇒ 語言包載入失敗，缺漏判定不可信");
    t.ok(T.dictHans >= 800, "zh-Hans.js 只讀到 " + T.dictHans + " 條 ⇒ 語言包載入失敗，缺漏判定不可信");
    t.ok(T.changedChars >= 200, "繁→簡變化字集只有 " + T.changedChars + " 個 ⇒ zh-Hans 需求判定會全面低估");
    t.ok(T.naConcat > 0, "串接（NA_CONCAT）數為 0 ⇒ 串接判定壞了，會把補了也不生效的鍵灌進缺漏");

    /* ② 棘輪本體：逐檔 + 總量。逐檔比總量嚴，且失敗訊息直接指到檔案，不必再自己去撈。 */
    var total = 0, files = Object.keys(r.perFile).sort();
    files.forEach(function (rel) {
      var rec = r.perFile[rel];
      total += rec.gaps;
      var cap = Object.prototype.hasOwnProperty.call(I18N_BASELINE, rel) ? I18N_BASELINE[rel] : 0;
      if (rec.gaps > cap) {
        var lst = rec.missing.slice(0, 6).map(function (x) {
          return "「" + x.key + "」:" + x.line + (x.en ? " [缺EN]" : "") + (x.hans ? " [缺zh-Hans]" : "");
        }).join("／");
        t.ok(false, rel + " 的 i18n 缺漏 " + rec.gaps + " 條 > 上限 " + cap
          + "：" + lst + "。補法＝在 src/i18n/en.js（全譯）與 src/i18n/zh-Hans.js（僅繁簡不同者）各補一條，"
          + "整節點鍵須與呼叫端 trim 後逐字相同。");
      }
    });
    t.ok(total <= I18N_BASELINE_TOTAL, "全站 i18n 缺漏總量 " + total + " 條 > 基線 " + I18N_BASELINE_TOTAL
      + "（本鎖只准往下走；要調高基線＝把『新表面可以零翻譯上線』重新合法化）");

    /* ③ 基線表自身的健檢：登記在表裡卻早已補完的檔＝殘骸，會讓棘輪對它悄悄鬆開。 */
    Object.keys(I18N_BASELINE).forEach(function (rel) {
      var rec = r.perFile[rel];
      t.ok(!!rec, "I18N_BASELINE 登記了不存在（或已無 t() 呼叫）的檔：" + rel + " ⇒ 請刪除該筆");
      if (rec) t.ok(rec.gaps >= I18N_BASELINE[rel], "I18N_BASELINE 對 " + rel + " 給的上限 "
        + I18N_BASELINE[rel] + " 已高於實測 " + rec.gaps + " ⇒ 請把它調降/刪除（棘輪必須咬合）");
    });
  }
});

/*
 * i18n 前綴表：領頭標籤型單節點串接的 EN/zh-Hans 覆蓋（維護軌 2026-09-01 12:00 窗 · T48）
 * ---------------------------------------------------------------------------
 * 【為什麼上面那條棘輪抓不到，卻仍是真缺漏】上面的 `i18n-key-ratchet` 把「串接節點」
 *   （`text: "存活率 " + pct`）一律歸類 NA_CONCAT 並排除計數——它的前提是「整節點鍵
 *   trim 後精確等於一條 key 才翻得到，串接永遠翻不到」。**這個前提只對 EXACT-key 成立**：
 *   `core/i18n.js` 的 `tText()`（第 96 行）在精確比對失敗後會走 **PREFIX 表**
 *   （`k.indexOf(p)===0` ⇒ `raw.replace(p, pre[p])`），正是為了翻譯這種「領頭固定標籤＋動態值」
 *   的單一文字節點。⇒ 一批**領頭 Chinese label 的串接**其實翻得到，只是需要 PREFIX 條目，
 *   而棘輪把它們寫成 NA_CONCAT ⇒ **沒有任何鎖在守它們**：EN／zh-Hans 玩家原樣看見中文標籤
 *   （存活率／賞金局／大廳賽事提示／四個 slot 購買鈕），卻 node 全綠、繁中畫面全對。
 *   本鎖把「這些 leak site 仍存在」與「PREFIX 仍覆蓋它們」綁在一起：任一 view 仍在串接
 *   卻少了對應 PREFIX（或 PREFIX 被移除）⇒ 立刻紅。**只認領頭型**（Chinese 只在最前面、
 *   其餘是動態值或已是英數）——中段夾中文者（`供應商：X｜分類：Y`）PREFIX 只能修前半，
 *   那類屬「需拆節點」的另一支債，不在本鎖射程（見 T48 卡）。
 *
 * 【與 tText() 同構的判定】精確 → PREFIX（首個命中即回）→ SUFFIX。此處只驗 PREFIX 面，
 *   且刻意夾一條 SUFFIX 前例（`還剩 3 輪`）作反向錨：證明我們沒有加一條會搶走 SUFFIX 既有
 *   覆蓋的前綴（PREFIX 在 tText 裡優先於 SUFFIX，加錯前綴會把 `還剩 3 rounds` 打回 `Left 3 輪`）。
 */
selftest.register({
  id: "platform/i18n-prefix-leading-label-concat", group: "platform", env: "node", tier: "fast",
  title: "領頭標籤型串接節點（存活率/賞金局/大廳賽事/slot 購買鈕）須有 EN+zh-Hans PREFIX 覆蓋，且 leak site 仍在（T48）",
  run: function (t) {
    var D = i18nScan.dicts();
    var CJK = /[一-鿿]/;
    // 與 core/i18n.js tText() 同構：精確 → PREFIX（首個命中即回）→ SUFFIX。
    function tText(raw, pk) {
      var k = raw.trim(); if (!k) return raw;
      if (pk.dict[k] != null) return raw.replace(k, pk.dict[k]);
      var p; for (p in pk.prefix) { if (k.indexOf(p) === 0) return raw.replace(p, pk.prefix[p]); }
      var s; for (s in pk.suffix) { if (k.length > s.length && k.slice(-s.length) === s) return raw.replace(k, k.slice(0, k.length - s.length) + pk.suffix[s]); }
      return raw;
    }
    function esc(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

    // ── 反向錨①：字典真的載入了（否則 tText 全部回原文＝空掃假綠）
    t.ok(Object.keys(D.en.dict).length >= 1000, "en.js 只讀到 " + Object.keys(D.en.dict).length + " 條 dict ⇒ 語言包載入失敗，本鎖空掃");
    t.ok(Object.keys(D.hans.dict).length >= 800, "zh-Hans.js dict 過少 ⇒ 語言包載入失敗");
    // ── 反向錨②：一個不該被覆蓋的合成節點，tText 後仍領頭中文（證明「翻得到」有鑑別力，非恆真）
    t.ok(CJK.test(tText("絕不存在的甲乙丙丁 7", D.en)[0]), "合成未覆蓋節點竟被翻譯 ⇒ tText 判定形同虛設");
    // ── 反向錨③：既有 SUFFIX 前例未被本輪新增前綴搶走（PREFIX 於 tText 優先於 SUFFIX）
    t.equal(tText("還剩 3 輪", D.en), "還剩 3 rounds", "『還剩 N 輪』的 SUFFIX 覆蓋被破壞 ⇒ 有人加了會搶走它的前綴");

    // ── leak site × PREFIX 覆蓋 綁定表（file, 領頭字面量, 樣本值, zh-Hans 是否需異形條目）
    var SITES = [
      { f: "src/views/chicken.js", lit: "存活率 ", val: "85.3%", hansDiff: false },
      { f: "src/views/bounty.js", lit: "賞金局 · ", val: "Room", hansDiff: true },
      { f: "src/views/lobby.js", lit: "玩任一遊戲累積積分，賽末自動派彩 · 我的名次 ", val: "#7", hansDiff: true },
      { f: "src/views/slot-dead-by-noon.js", lit: "購買免費遊戲 ", val: "100×", hansDiff: true },
      { f: "src/views/slot-gem-storm.js", lit: "購買免費遊戲 ", val: "100×", hansDiff: true },
      { f: "src/views/slot-pirots.js", lit: "購買免費遊戲 ", val: "100×", hansDiff: true },
      { f: "src/views/slot-golden-toad.js", lit: "購買 Hold & Win ", val: "100×", hansDiff: true },
      // ── T50（維護軌 2026-09-02 12:00 窗）：i18n-leading-label-scan 掃出的第二批 CLEAN 領頭型串接。
      //    刻意排除 liveroom.js:95／streamer.js:88 的「跟注 …（game · sideLabel）」——動態值之後仍夾中文（sideLabel/game 名）
      //    ＝PREFIX 只能修前半、屬需拆節點的 NODE-SPLIT 債（T49 家族），不入本表。
      { f: "src/views/arena.js", lit: "10 張卡彩金配比（單次總彩金 ", val: "NT$5,000）", hansDiff: true },
      { f: "src/views/arena.js", lit: "每翻開安全格累積倍數，可隨時兌現；踩雷則輸，最高 ", val: "50x。", hansDiff: true },
      { f: "src/views/liveroom.js", lit: "確認加入本局（扣 ", val: "NT$500）", hansDiff: true },
      { f: "src/views/slot.js", lit: "Baphomet Rite — 直升 Lv.", val: "12 + 1 Candle（NT$999）", hansDiff: false },
      { f: "src/views/slot.js", lit: "Sticky Wild（FG 第 2-5 輪黏底）、xSplit（Cursed 分裂一輪）、最大贏分 ", val: "5000x。", hansDiff: true },
      { f: "src/views/slot.js", lit: "1024 ways · 連爆 · 愛心獻祭儀式條 · Candle/Cursed 免費遊戲 · 最大 ", val: "5000x", hansDiff: true },
      { f: "src/core/guild.js", lit: "週末依名次發放團隊獎金（第 1／2／3 名 = ", val: "NT$5,000／NT$2,500／NT$1,000）。", hansDiff: true }
    ];
    t.ok(SITES.length >= 14, "SITES 表被縮小到 " + SITES.length + " 條 ⇒ 覆蓋面悄悄變小（反向錨：非零且不縮）");

    SITES.forEach(function (s) {
      var full = s.lit + s.val;
      // (a) leak site 仍存在：view 檔仍在做 `"<領頭字面量>" +`（串接）。改了字面量／不再串接 ⇒ 紅，逼人回頭複驗前綴是否仍需要
      var src = "";
      try { src = fs.readFileSync(path.join(ROOT, s.f), "utf8"); } catch (e) {}
      var reConcat = new RegExp('"' + esc(s.lit) + '"\\s*\\+');
      t.ok(reConcat.test(src), s.f + " 不再包含串接 leak site 「" + s.lit + "」+ ⇒ 若已改寫請同步複驗/移除本表與 PREFIX 條目（棘輪必須咬合來源）");
      // (b) EN：tText 後不得再領頭中文（＝PREFIX 真的翻掉了領頭標籤）
      var en = tText(full, D.en);
      t.ok(!CJK.test(en[0]), s.f + " 的「" + s.lit + "…」在 EN 仍領頭中文（實得「" + en + "」）⇒ src/i18n/en.js 缺 PREFIX 條目「" + s.lit + "」");
      // (c) zh-Hans：異形者必須被轉換（不得原樣露繁體）
      if (s.hansDiff) {
        var hans = tText(full, D.hans);
        t.ok(hans !== full, s.f + " 的「" + s.lit + "…」在 zh-Hans 未轉換（原樣繁體）⇒ src/i18n/zh-Hans.js 缺 PREFIX 條目「" + s.lit + "」");
      }
    });
  }
});

/*
 * #120 i18n 棘輪第二段：DOM 綁定面（平台軌 2026-08-23 20:00 窗）
 * ---------------------------------------------------------------------------
 * 【為什麼第一段不夠】#119 的棘輪只認 `t("中文")` **呼叫點**，但本站大多數畫面文字
 *   **根本沒經過 `t()`**——`el("div", { text: "中文" })` 直接把中文餵進文字節點，
 *   靠 DOM walker 事後比對整節點翻譯。它一樣需要字典條目、一樣會在切 EN 時原樣露繁中，
 *   卻**天生不在第一段的射程內**。實測首量 630 個綁定點／494 條鍵／**267 條缺漏**，
 *   最深的是 `core/fair.js`（可驗證公平面板整片零翻譯）與 `views/ops-dashboard.js`。
 *
 * 【本輪把基線一次補到 0，所以沒有基線表】卡上原本允許「以實測值立基線、分批補」，
 *   但 267 條全數當輪補完（en.js +139／zh-Hans.js +125）⇒ 直接零容忍，
 *   **不留 I18N_DOM_BASELINE**——沒有基線表就沒有「基線殘骸讓棘輪悄悄鬆開」那個失效模式
 *   （第一段的健檢③ 正是為了防它而存在）。
 *
 * 【射程的誠實邊界】`title:` 刻意排除：它同時是 HTML title 屬性**與 `selftest.register` 的測項標題**，
 *   混在一起分母會從 615 灌到 934、多出來的幾乎全是本來就不該翻的測項標題。
 *   `aria-label`（引擎也翻它）目前多以引號鍵書寫，同樣留在射程外。兩者都要先能分辨語境才擴。
 */
selftest.register({
  id: "platform/i18n-dom-ratchet", group: "platform", env: "node", tier: "fast",
  title: "i18n DOM 綁定面棘輪：沒走 t() 的 text:／textContent=／placeholder: 中文一樣須有 EN/zh-Hans 條目，全站零容忍（#120）",
  run: function (t) {
    var r = i18nScan.measure();
    var D = r.dom.totals, P = r.dom.perFile;

    /* ① 反向錨——這一段比第一段更需要它：DOM 面的抽取器是本輪新寫的，
       只要 DOM_SHAPES 被改壞／CJK 判定失效／走檔目錄被換掉，缺漏數就會變 0 而「完美通過」。 */
    t.ok(D.sites >= 440, "掃到的 DOM 綁定點只有 " + D.sites + " 個（實測基準 ~630）⇒ 抽取器多半壞了，本鎖正在空掃");
    t.ok(D.keys >= 340, "抽出的整節點鍵只有 " + D.keys + " 條（實測基準 ~494）⇒ 抽取器多半壞了");
    t.ok(D.naConcat > 0, "串接（NA_CONCAT）數為 0 ⇒ 串接判定壞了，會把補了也不生效的鍵灌進缺漏");
    t.ok(D.naSame > 0, "繁簡同形（NA_SAME）數為 0 ⇒ zh-Hans 需求判定壞了");

    /* ②「三種形狀都還在射程內」——少掉任何一種都是**悄悄縮小射程**（缺漏數一樣會變好看）。 */
    var byShape = { text: 0, textContent: 0, placeholder: 0 };
    var probe = i18nScan.scanDomBindings(
      'el("a",{text:"中文一"});x.textContent = "中文二";el("input",{placeholder:"中文三"});el("b",{title:"中文四"});'
    );
    probe.forEach(function (h) { if (byShape[h.shape] != null) byShape[h.shape]++; });
    t.ok(byShape.text === 1, "抽取器認不出 `text:` 形狀（探針命中 " + byShape.text + "）⇒ 射程被縮小");
    t.ok(byShape.textContent === 1, "抽取器認不出 `textContent =` 形狀（探針命中 " + byShape.textContent + "）⇒ 射程被縮小");
    t.ok(byShape.placeholder === 1, "抽取器認不出 `placeholder:` 形狀（探針命中 " + byShape.placeholder + "）⇒ 射程被縮小");
    t.ok(probe.length === 3, "探針應恰好命中 3 條（`title:` 必須留在射程外，見本區塊註解）⇒ 實得 " + probe.length);

    /* ②-b 覆蓋判定必須與 `core/i18n.js` 的 `tText()` 同構（卡上阻塞事實 ②）。
       這三條探針是**刻意加的**：本輪把兩面缺漏都補到 0 之後，`covers()` 的 PREFIX/SUFFIX 分支
       在真實語料上已經沒有任何 witness ⇒ 把它拆掉，缺漏數一樣是 0、鎖一樣全綠
       （負向擾動實測 M8 是 no-op）。沒有 witness 的性質等於沒被守住 ⇒ 這裡自己造 witness。 */
    var D0 = i18nScan.dicts();
    t.ok(i18nScan.covers(D0.en, "挑戰次數 5") === true, "covers() 不認 PREFIX 表 ⇒ 會把前綴覆蓋的節點誤報成缺漏");
    t.ok(i18nScan.covers(D0.en, "3 點") === true, "covers() 不認 SUFFIX 表 ⇒ 會把後綴覆蓋的節點誤報成缺漏");
    t.ok(i18nScan.covers(D0.en, "完全不存在的片語甲乙丙丁") === false, "covers() 對不存在的片語回 true ⇒ 覆蓋判定形同虛設（本鎖會全面空掃）");

    /* ③ 棘輪本體：零容忍、逐檔指名。 */
    var total = 0;
    Object.keys(P).sort().forEach(function (rel) {
      var rec = P[rel];
      total += rec.gaps;
      if (rec.gaps > 0) {
        var lst = rec.missing.slice(0, 6).map(function (x) {
          return "「" + x.key + "」:" + x.line + "[" + x.shape + "]" + (x.en ? " 缺EN" : "") + (x.hans ? " 缺zh-Hans" : "");
        }).join("／");
        t.ok(false, rel + " 的 DOM 綁定面 i18n 缺漏 " + rec.gaps + " 條：" + lst
          + "。補法＝在 src/i18n/en.js（全譯）與 src/i18n/zh-Hans.js（僅繁簡不同者）各補一條，"
          + "key 須與程式碼裡的字面量 trim 後逐字相同。");
      }
    });
    t.ok(total === 0, "DOM 綁定面 i18n 缺漏總量 " + total + " 條（本段自 #120 起即為零容忍，沒有基線表可放寬）");
  }
});

/*
 * #121 i18n 棘輪第三段：資料面（平台軌 2026-08-24 20:00 窗）
 * ---------------------------------------------------------------------------
 * 【為什麼前兩段都不夠】前兩段問的都是「**中文寫在哪一行**」——第一段看 `t("中文")` 呼叫點，
 *   第二段看 `text:`／`textContent=`／`placeholder:` 的字面量。但本站有一整類中文
 *   **根本不在渲染那一行**：渲染端寫 `el("div", { text: p.title })`，那一行一個漢字都沒有，
 *   中文躲在 `src/data/` 的物件裡當**資料值**。⇒ 兩段抽取法對它結構性失明。
 *   實例（#61 遷移 12 張促銷卡當輪撞見）：切 EN／简中 時**大廳最顯眼的那條輪播原樣顯示繁中**，
 *   而 node 全綠、console 零錯誤、繁中下畫面完全正常。船長 P3 紀律第 8 例，
 *   也是第一個「同一件事有**三種寫法**」的證據：呼叫面／DOM 字面面／資料面。
 *
 * 【本段一次補到 0，所以同樣沒有基線表】首量 60 鍵／45 條缺漏（EN 26／zh-Hans 19），
 *   當輪全數補完（en.js +25／zh-Hans.js +19）⇒ 零容忍。沒有基線表就沒有
 *   「基線殘骸讓棘輪悄悄鬆開」那個失效模式（第一段的健檢③ 正是為它而存在）。
 *
 * 【射程的兩道閘與它們各自的反向錨（口徑全文見 tests/i18n-key-scan.js 第三面段落）】
 *   ① 檔案閘＝`src/data/**` 全目錄 + 明列 `src/core/game-axes.js`。**用目錄**是為了讓
 *      `src/data/` 下的新檔天生在射程內（本站既有 i18n 鎖全是逐表面特化，
 *      「還沒寫的表面永遠零覆蓋」正是 #119 要根治的病）。
 *   ② 欄位閘＝已驗證會走到 DOM 的 9 個欄位；刻意不含第二面的三個形狀（否則雙記）
 *      與 `icon`/`ic`/`emoji`/`av`（字形不是語言）。
 *   ③ **`title` 在本射程內是安全的**：第二面排除 `title:` 是因為它與 `selftest.register({ title })`
 *      一詞兩義（#122 要解的判別），而 `selftest.register` 在本射程 8 支檔內**零命中**
 *      ——這個前提由下方反向錨④ 每輪重驗，不是一次性人工結論。
 *
 * 【已知會誤導後手的一件事（實測踩過，寫下來省下一次）】用「裸正則掃檔」量本面會**多算一條**：
 *   `data/games.js:50` 的 `title: "我的拉霸"` 位於 dev-kit **註解範例**內。抽取器走狀態機
 *   （只認宣告、不認提及）故正確排除；而首版補字典時照裸正則的 61 條補了它，
 *   等於在字典裡留一條**沒有任何表面在消費**的死鍵 ⇒ 已移除。
 *   ⇒ 量本面的權威是 `scanDataValues`，不是 grep。
 */
selftest.register({
  id: "platform/i18n-data-ratchet", group: "platform", env: "node", tier: "fast",
  title: "i18n 資料面棘輪：src/data/** + src/views/** + src/layout/** + src/core/** 與 game-axes.js 的宣告值中文須有 EN/zh-Hans 條目，零容忍；營運受眾(OPS_ONLY)為有守衛的口徑排除（#121 → #126 批次一）",
  run: function (t) {
    var r = i18nScan.measure();
    var D = r.data.totals, P = r.data.perFile;

    /* ① 反向錨——抽取器是本輪新寫的：DATA_FIELDS 被改壞／走檔範圍被換掉／CJK 判定失效時，
       缺漏數會變 0 而「完美通過」。這組下限訂在實測值的七成上下。 */
    /* ⚠️ 基準已於 #122（2026-08-25 20:00 窗）自 382/295 下修為 **222/176**——不是射程被縮，
       是 `title` 欄整批**移交給第四面（屬性面）單一持有**（同一條宣告不得被寬鬆 `covers` 與
       嚴格 `coversExact` 兩把尺各量一次）。移交後的歸屬由屬性面自己的錨看守。 */
    t.ok(D.sites >= 155, "掃到的資料面宣告點只有 " + D.sites + " 個（#122 後實測基準 222）⇒ 抽取器多半壞了，本鎖正在空掃");
    t.ok(D.keys >= 123, "抽出的整節點鍵只有 " + D.keys + " 條（#122 後實測基準 176）⇒ 抽取器多半壞了");
    t.ok(D.naSame > 0, "繁簡同形（NA_SAME）數為 0 ⇒ zh-Hans 需求判定壞了，會把同形鍵灌進缺漏");

    /* ②「檔案閘沒有被縮成空集合」——射程一旦被縮小，缺漏數一樣會變好看。 */
    t.ok(r.data.scopeFiles.length >= 64, "資料面射程只剩 " + r.data.scopeFiles.length
      + " 支檔（#126 批次二後實測基準 92）⇒ inDataScope() 或走檔目錄被改窄，本鎖射程已被縮小");
    t.ok(r.data.scopeFiles.indexOf("src/data/mock-data.js") >= 0,
      "射程漏掉 src/data/mock-data.js ⇒ 那正是本面最深的一支（36 個宣告點、#121 的所有 witness 都在裡面）");

    /* ②-b #126 批次一：三個目錄閘每一個都必須真的有貢獻檔案。
       用「每個目錄各自要有 witness」而不是只看總數——只看總數的話，
       拿掉 `src/views/` 但 `src/data/` 還在，總數仍然很大、鎖仍然綠，
       而 30 支 view 的中文從此無人看管（正是 #119 檔頭記的「還沒寫的表面永遠零覆蓋」那個病的變形）。 */
    (r.data.dirs || []).forEach(function (dir) {
      var n = r.data.scopeFiles.filter(function (rel) { return rel.indexOf(dir) === 0; }).length;
      t.ok(n > 0, "資料面目錄閘 `" + dir + "` 在射程內零檔案 ⇒ DATA_DIRS 被拿掉一項或目錄被改名，"
        + "該目錄下的中文從此無人看管（請修正 DATA_DIRS，不要用刪目錄的方式讓本鎖轉綠）");
    });
    ["src/views/arena.js", "src/layout/app-shell.js"].forEach(function (rel) {
      t.ok(r.data.scopeFiles.indexOf(rel) >= 0, "射程漏掉 " + rel
        + " ⇒ 那是 #126 批次一最深的兩支（arena 18 條／app-shell 13 條 witness 都在裡面）");
    });

    /* ②-c **口徑必須是有守衛的口徑，否則它就是一個逃生門**（#126 範圍①的受眾決定）。
       `OPS_ONLY` 把營運受眾的表面排除在射程外——這是口徑不是缺漏。但「可以把檔案寫進一份
       清單就不必翻譯」本身就是一個誘因，所以這裡對清單上的每一支檔問三件事：
         (a) 它真的存在且真的有命中嗎？沒有＝殘骸，排除它毫無作用，只是讓清單看起來有在管事；
         (b) 它真的帶營運受眾標記嗎？沒有＝有人把玩家面的檔停在這裡躲翻譯；
         (c) 它真的被排除了嗎？（inDataScope 的實際行為，不是它的宣稱）。
       ⇒ 這是 CLAUDE.md §4 立鎖自問「這條不變量有沒有反向」的直接套用：
          正向是「營運面不必翻」，反向是「不必翻的必須真的是營運面」。 */
    var fsOps = require("fs");
    var OPS_MARK = /HL\.opsBoard|ops_admins|aud:\s*["']ops["']|營運管理員|HL\.rbac/;
    (r.data.opsOnly || []).forEach(function (rel) {
      var src = "";
      try { src = fsOps.readFileSync(path.join(ROOT, rel), "utf8"); } catch (e) { src = ""; }
      t.ok(src.length > 0, "OPS_ONLY 明列了讀不到的檔：" + rel + " ⇒ 殘骸，請刪除該筆");
      t.ok(i18nScan.scanDataValues(src).length > 0, "OPS_ONLY 明列的 " + rel
        + " 在本面零命中 ⇒ 排除它毫無作用（殘骸），請刪除該筆，別讓清單假裝有在管事");
      t.ok(OPS_MARK.test(src), "OPS_ONLY 明列的 " + rel + " 找不到任何營運受眾標記"
        + "（HL.opsBoard／ops_admins／aud:\"ops\"／營運管理員／HL.rbac）⇒ 這支檔看起來是玩家面的，"
        + "把它放進 OPS_ONLY 等於用受眾口徑當藉口躲翻譯。請移出清單並把它的中文補進語言包。");
      t.ok(r.data.scopeFiles.indexOf(rel) < 0, "OPS_ONLY 明列的 " + rel
        + " 仍出現在射程內 ⇒ inDataScope() 的排除沒生效（宣稱與行為不一致）");
    });
    r.data.extra.forEach(function (rel) {                       // 明列檔的殘骸健檢（比照第一段的健檢③）
      t.ok(r.data.scopeFiles.indexOf(rel) >= 0, "DATA_EXTRA 明列了不存在的檔：" + rel + " ⇒ 請刪除該筆");
      t.ok(P[rel] && P[rel].keys > 0, "DATA_EXTRA 明列的 " + rel
        + " 在本面零命中 ⇒ 它的中文已搬走或欄位已改名，該筆是殘骸（請刪除，別讓它假裝有在守）");
    });

    /* ③「九個欄位都還在射程內」＋「第二面的三個形狀必須留在射程外」。
       少認一個欄位＝悄悄縮小射程；多認第二面的形狀＝同一條鍵被兩段各記一次。 */
    var probe = i18nScan.scanDataValues(
      'var A=[{tag:"甲",subtitle:"乙",prizeLabel:"丙",label:"丁",name:"戊",style:"己",game:"庚",t:"辛",title:"壬"},' +
      '{text:"癸",placeholder:"子",icon:"丑",author:"寅"}];x.textContent = "卯";'
    );
    var got = {};
    probe.forEach(function (h) { got[h.shape] = (got[h.shape] || 0) + 1; });
    ["tag", "subtitle", "prizeLabel", "label", "name", "style", "game", "t"].forEach(function (f) {
      t.ok(got[f] === 1, "抽取器認不出資料面欄位 `" + f + ":`（探針命中 " + (got[f] || 0) + "）⇒ 射程被縮小");
    });
    t.ok(!got.title, "`title:` 仍留在資料面射程內 ⇒ 它已於 #122 移交第四面（屬性面）單一持有，"
      + "兩面都認會讓同一條宣告被寬鬆 covers 與嚴格 coversExact **兩把尺各量一次**（本站反覆踩的 drift 形狀）");
    t.ok(probe.length === 8, "探針應恰好命中 8 條——`text:`／`placeholder:`／`textContent=` 留給第二面、"
      + "`title:` 留給第四面（重疊會讓同一條鍵被兩段各記一次），`icon:`／`author:` 必須永久在射程外"
      + "（字形不是語言；author 是同仁暱稱＝目標 2 的身分軸，翻譯會破壞它）⇒ 實得 " + probe.length);

    /* ④ `title` 能安全納入本射程的**前提**：射程內沒有任何測項 spec 的標題。
       ⚠️ **本錨在 #126 批次二被修過一次，因為它原本只認一種寫法**（平台軌 2026-08-25 14:00 窗）：
       原版判準是 `src.indexOf("selftest.register") >= 0`，而本站的測項有兩種註冊形制——
         ① `selftest.register({…})`（檔內直接呼叫）＝原版抓得到，全庫僅 2 支；
         ② `function registerTests(st){ st.register({ id:"rg/…", title:"中文", run:… }) }`
            （**注入式**，`core/responsible.js:286` 起 12 筆即此形）＝**原版一個字都看不到**。
       實測 ② 型在 `src/core/` 有 22 支檔、光 `title:` 欄就 191 條測項標題 ⇒ 若照批次一寫在
       #126 卡上的前置（「不含 `title:` 的 core 檔是安全子集」，並點名 responsible/activity/
       progress-src 三支）直接把 core 併進射程，這 191 條會當成玩家面缺漏灌進分母，
       而**專為此而立的本錨會保持全綠**。CLAUDE.md §4「修一半而看不出來」第五例：
       **不變量只認了同一件事的其中一種寫法。**
       ⇒ 判準改用掃描器的 `hostsTestSpec()`（認 `.register({ … run: function}`，不認呼叫者名字）。 */
    var fs3 = require("fs");
    function rdRel(rel) { try { return fs3.readFileSync(path.join(ROOT, rel), "utf8"); } catch (e) { return ""; } }
    /* ⚠️ #122 起判準多了「**且真的有命中**」這半：`title` 移交屬性面後，
       `battle-tempo.js` 這類「託管測項但資料面零命中」的檔變成**兩條錨互相矛盾**——
       不列進 SPEC_HOSTS 被本錨判污染，列進去又被 ④-c 的殘骸錨判「排除毫無作用」。
       矛盾本身就是判準過時的訊號：污染要成立，得真的有東西被污染。
       （本面剩下的 8 個欄位仍會被測項夾具字串污染——`name:"探針"`／`label:"會爆的表"`／
        `name:"#58 邀請碼與歸因：…"`——所以 SPEC_HOSTS 對它們仍然必要，本錨仍有意義。） */
    var polluted = [];
    r.data.scopeFiles.forEach(function (rel) {
      var srcP = rdRel(rel);
      if (i18nScan.hostsTestSpec(srcP) && i18nScan.scanDataValues(srcP).length > 0) polluted.push(rel);
    });
    t.equal(polluted.length, 0, "資料面射程被測項污染：" + polluted.join("、")
      + " 既託管測項 spec（`register({ … run: function}`）又在本面有命中 ⇒ 測項夾具字串"
      + "（`name:\"探針\"` 這類）會被當成玩家面缺漏灌進分母，請把該檔加進 SPEC_HOSTS 並註記原因");

    /* ④-b `hostsTestSpec()` 本身的**正反雙向**探針。只驗「射程內零污染」是不夠的：
       把 hostsTestSpec 改成恆 false，上面那條一樣全綠、22 支檔一樣可以偷偷進射程。 */
    t.ok(i18nScan.hostsTestSpec('st.register({ id: "a/b", title: "測項標題", run: function (t) { } });') === true,
      "hostsTestSpec 認不出**注入式** st.register 測項 ⇒ 正是它原本漏掉 22 支 core 檔的那個盲區，錨④ 會空轉");
    t.ok(i18nScan.hostsTestSpec('register({ id: "a/b", title: "x", run: function (t) { } });') === true,
      "hostsTestSpec 認不出**裸呼叫** register( 測項 ⇒ core/selftest.js 自己就是這一形（錨④-c 首次抓到的正是它）");
    t.ok(i18nScan.hostsTestSpec('registerPause({ id: "cool-1d", kind: "cool", label: "24 小時", run: function () { } });') === false,
      "hostsTestSpec 把 registerPause( 也當成測項 ⇒ 邊界太鬆，會把 responsible.js 這類檔以錯誤理由逐出射程");
    t.ok(i18nScan.hostsTestSpec('selftest.register({ id: "a/b", title: "x", run: function (t) { } });') === true,
      "hostsTestSpec 認不出字面 selftest.register 測項 ⇒ 比原版還窄");
    t.ok(i18nScan.hostsTestSpec('HL.econCfg.register({ id: "c", label: "旋鈕", describe: function () { return []; } });') === false,
      "hostsTestSpec 把**非測項**的 register（econCfg 旋鈕）也當成測項 ⇒ 會把整批資料宣告檔誤逐出射程");

    /* ④-c `SPEC_HOSTS` 是**暫時**口徑排除（正解＝#122 逐宣告判別），四條反向錨照 OPS_ONLY 同一
       形制看守——「可以把檔名寫進一份清單就不必翻譯」本身就是誘因，清單必須自己站得住。 */
    (r.data.specHosts || []).forEach(function (rel) {
      var src = rdRel(rel);
      t.ok(src.length > 0, "SPEC_HOSTS 明列了讀不到的檔：" + rel + " ⇒ 殘骸，請刪除該筆");
      t.ok(i18nScan.hostsTestSpec(src), "SPEC_HOSTS 明列的 " + rel + " 內找不到任何測項 spec"
        + " ⇒ 它不是因為託管測項才被排除的，等於用『測項污染』當藉口躲翻譯。請移出清單並把它的中文補進語言包");
      t.ok(i18nScan.scanDataValues(src).length > 0, "SPEC_HOSTS 明列的 " + rel
        + " 在本面零命中 ⇒ 殘骸（排除它毫無作用），請刪除該筆");
      t.ok(r.data.scopeFiles.indexOf(rel) < 0, "SPEC_HOSTS 明列的 " + rel
        + " 仍出現在射程內 ⇒ inDataScope() 的排除沒生效（宣稱與行為不一致）");
    });

    /* ④-d **完備性**：`src/core/` 下任何有命中的檔，都必須落在「射程 ∪ OPS_ONLY ∪ SPEC_HOSTS」。
       為什麼需要這一條——批次一刻意用**目錄**而非檔名清單，理由是「新檔天生在射程內」
       （#119 檔頭記的病：逐表面特化的鎖，還沒寫的表面永遠零覆蓋）。批次二加了 SPEC_HOSTS
       這個**排除**清單，等於在目錄制上開了一個洞：新增一支 core 檔只要恰好被寫進排除清單、
       或哪天有人把目錄閘改窄，它就靜默逃出三份清單之外而本鎖全綠。 */
    var coreDir = path.join(ROOT, "src", "core");
    var escaped = [];
    fs3.readdirSync(coreDir).forEach(function (f) {
      if (!/\.js$/.test(f)) return;
      var rel = "src/core/" + f;
      if (i18nScan.scanDataValues(rdRel(rel)).length === 0) return;      // 本面零命中＝與本鎖無關
      if (r.data.scopeFiles.indexOf(rel) >= 0) return;
      if ((r.data.specHosts || []).indexOf(rel) >= 0) return;
      if ((r.data.opsOnly || []).indexOf(rel) >= 0) return;
      escaped.push(rel);
    });
    t.equal(escaped.length, 0, "src/core/ 有命中卻不在任何一份清單裡：" + escaped.join("、")
      + " ⇒ 它既不在射程、也不在 SPEC_HOSTS／OPS_ONLY ⇒ 這支檔的中文從此無人看管"
      + "（請把它納入射程並補譯，或說明它屬哪一種口徑排除）");

    /* ④-e 營運受眾的**逐宣告**口徑（#126 批次二的設計題）。檔案級的 OPS_ONLY 切不開
       `HL.econCfg.register({label})`——那些標籤唯一渲染端是 ops-dashboard（營運受眾）、文案帶內部
       卡號，但它們**散落在玩家面的 core 檔裡**（`progress.js` 同一支檔還有 VIP 段位名）。
       ⇒ 排除必須逐宣告。兩個方向都要錨：區間**沒解析出來**（口徑失效、缺漏暴增）與
       區間**被撐大吞掉整檔**（缺漏靜默歸零）。 */
    t.ok(D.naOps > 0, "營運受眾逐宣告計數（naOps）為 0 ⇒ econCfg 區間一條都沒解析出來，"
      + "口徑形同失效（#126 批次二實測基準 28 條）");
    t.ok((r.data.opsDeclFiles || []).length >= 4, "含 econCfg 宣告的檔只認出 "
      + ((r.data.opsDeclFiles || []).length) + " 支（實測基準 6）⇒ opsDeclRegions 的括號配對多半壞了");
    var probeOps = i18nScan.scanDataValues(
      'HL.econCfg.register({ id:"x", label:"營運旋鈕甲", describe: function(){ return [{ label:"營運旋鈕乙" }]; } });'
      + 'var P=[{ name:"玩家面丙" }];'
    );
    t.equal(probeOps.filter(function (h) { return h.ops; }).length, 2,
      "探針：econCfg 呼叫內的兩條 label 應被標 ops（實得 "
      + probeOps.filter(function (h) { return h.ops; }).length + "）⇒ 逐宣告排除沒生效");
    t.equal(probeOps.filter(function (h) { return !h.ops; }).length, 1,
      "探針：econCfg 呼叫**之外**的玩家面 name 不得被標 ops（實得 "
      + probeOps.filter(function (h) { return !h.ops; }).length
      + "）⇒ 區間被撐大到吞掉呼叫以外的宣告，真缺漏會被靜默藏掉");

    /* ⑤ 棘輪本體：零容忍、逐檔指名。 */
    var total = 0;
    Object.keys(P).sort().forEach(function (rel) {
      var rec = P[rel];
      total += rec.gaps;
      if (rec.gaps > 0) {
        var lst = rec.missing.slice(0, 6).map(function (x) {
          return "「" + x.key + "」:" + x.line + "[" + x.shape + "]" + (x.en ? " 缺EN" : "") + (x.hans ? " 缺zh-Hans" : "");
        }).join("／");
        t.ok(false, rel + " 的資料面 i18n 缺漏 " + rec.gaps + " 條：" + lst
          + "。補法＝在 src/i18n/en.js（全譯）與 src/i18n/zh-Hans.js（僅繁簡不同者）各補一條，"
          + "key 須與 data 裡的宣告值 trim 後逐字相同。");
      }
    });
    t.ok(total === 0, "資料面 i18n 缺漏總量 " + total + " 條（本段自 #121 起即為零容忍，沒有基線表可放寬）");
  }
});

/*
 * #122 i18n 棘輪第四段：屬性面 `title` / `aria-label`（平台軌 2026-08-25 20:00 窗）
 * ---------------------------------------------------------------------------
 * 【前三段合起來仍漏掉的那一面】`core/i18n.js:102` 的 `tAttrs` 翻**三個**屬性
 *   （`title`／`placeholder`／`aria-label`），`OBS.attributeFilter` 也監聽這三個；
 *   但 #120 的 DOM 面只涵蓋 `placeholder`。⇒ 另外兩個屬性的中文**寫下去就上線**、
 *   切 EN 原樣露繁中，而 `aria-label` 是**螢幕閱讀器唸出來的字**，比視覺文字更難察覺。
 *   首量：命中 353（`title:` 332／`"aria-label":` 21）、去重 156 鍵、缺 EN 3／缺 zh-Hans 6，當輪補到 0。
 *
 * 【`title` 一詞三義——本段的真正題目，也是 #120 當年直接放棄它的原因】
 *   ① HTML `title`／`aria-label` 屬性；② `register({ id, title, run: function })` 的**測項標題**（131 條）；
 *   ③ **玩家面資料欄位**（`notify.add({title})`／成就名／發行排程名）。
 *   ①③ 都需要字典條目，② 永遠不該翻。#120 的處置是把 `title:` 整個排除（誠實但等於零覆蓋），
 *   #126 批次二的處置是把 24 支託管測項的檔**整支**排除（SPEC_HOSTS，並在檔頭寫明是暫時手段）。
 *   兩者都不對：那 24 支檔裡的 172 條 title 命中中，**131 條是測項、41 條是玩家面文案**
 *   （`content.js` 促銷卡標題、`activity.js`／`responsible.js` 成就名）⇒ 逐檔排除會把 41 條真缺漏
 *   一起藏掉，方向正好是最危險的那個。本段改為**逐宣告**：同一物件字面量直屬含 `run: function` 者
 *   整段是測項 spec（`testSpecRegions`），計進看得見的 `naSpec`。
 *
 * 【第二種口徑排除 `naLocale`】`core/content.js` 的促銷 descriptor **自帶 `locales`**（#61 設計，
 *   該檔第 18 行明載「營運文案脫離字典」）⇒ 它的 title 永遠不經字典，補進語言包只會產出
 *   **沒有任何表面在消費的死鍵**（#121 已為「裸正則多算一條 dev-kit 註解範例」付過這種代價）。
 *   由 `localeDeclRegions` 逐宣告排除；它們的譯文由既有的 `content/locale-coverage` 鎖看守。
 *
 * 【覆蓋判定嚴於前三段，這是契約差異不是保守】`tText` 有 精確→PREFIX→SUFFIX 三段，
 *   `tAttrs` 只有 `if (d[k] == null) return;`＝**只精確比對**。⇒ 本段用 `coversExact`。
 *   ⚠️ 落地當輪 `strictDelta === 0`＝這條嚴格性在真實語料上**沒有 witness**
 *   （拆掉它缺漏數一樣是 0、鎖一樣全綠）⇒ 下方 ②-b 用**合成探針**替它造 witness，
 *   同 #120 健檢②-b 的教訓：沒有 witness 的性質等於沒被守住。
 *
 * 【順帶修掉的一條「尺自己把缺漏吃掉」——本輪最大的意外，寫在這裡因為它影響全四段】
 *   `segmentIsConcat` 原本無條件往外走 5 層找 `+`。第 3 層起往往已**走出物件字面量、進到函式主體**，
 *   而函式主體裡幾乎一定有某個深度 0 的 `+`（任一行 `var s = a + b;`）⇒ 撿到**別的語句**的 `+`
 *   就把本筆判成 NA_CONCAT（「補了也翻不到」）而靜默退出分母。實測**34 筆**被這樣藏起來，
 *   其中 **32 條是真缺漏**：`出發`（小雞過馬路主按鈕）／`點擊略過`／`開牌中…`／
 *   `史詩大獎 EPIC WIN`｜`超級大獎 MEGA WIN`｜`大獎 BIG WIN`（三檔大獎橫幅）／
 *   `伺服器忙線，請再試一次。`／`💣 踩到地雷，這局結束`…**而三段棘輪當時全部是綠的、全部寫著零容忍**。
 *   修法＝往外走時每層先問「還在值語境嗎」（`isValueGroup`：物件字面量／引數列／陣列／括號運算式），
 *   走進 block 就停；但 block **本身仍要量**（`x.textContent = "已翻" + n;` 這種語句層賦值的
 *   最近群組就是 block），差別在 block 要**多用 `;` 切段**，否則又會撿到兄弟語句的 `+`。
 *   ⇒ CLAUDE.md §4「修一半而看不出來」第六例，形狀是新的：**N/A 規則過度外擴，把真缺漏當成 N/A 吃掉**。
 *      反向自問從此多一條：**「這條口徑排除，會不會連它不該排的東西一起排掉？」**
 */
selftest.register({
  id: "platform/i18n-attr-ratchet", group: "platform", env: "node", tier: "fast",
  title: "i18n 屬性面棘輪：全 src/（減 OPS_ONLY）的 title/aria-label 宣告中文須有 EN/zh-Hans 精確條目，零容忍；測項 spec 與自帶 locales 的 descriptor 為逐宣告口徑排除（#122）",
  run: function (t) {
    var r = i18nScan.measure();
    var A = r.attr.totals, P = r.attr.perFile;
    var fs4 = require("fs");
    function rd4(rel) { try { return fs4.readFileSync(path.join(ROOT, rel), "utf8"); } catch (e) { return ""; } }

    /* ① 反向錨——抽取器壞掉時缺漏數會變 0 而「完美通過」。下限訂在實測值的七成上下。 */
    t.ok(A.sites >= 245, "掃到的屬性面宣告點只有 " + A.sites + " 個（#122 實測基準 353）⇒ 抽取器多半壞了，本鎖正在空掃");
    t.ok(A.keys >= 105, "抽出的屬性鍵只有 " + A.keys + " 條（#122 實測基準 156）⇒ 抽取器多半壞了");
    t.ok(A.naSame > 0, "繁簡同形（NA_SAME）數為 0 ⇒ zh-Hans 需求判定壞了，會把同形鍵灌進缺漏");

    /* ②「射程沒有被縮成空集合」。屬性面刻意是**整個 src/ 減 OPS_ONLY**（不是目錄清單）——
       屬性可以掛在任何一支檔的任何一個元素上，用清單就會重演 #119 檔頭那個病
       （逐表面特化的鎖，還沒寫的表面永遠零覆蓋）。 */
    t.ok(r.attr.scopeFiles.length >= 100, "屬性面射程只剩 " + r.attr.scopeFiles.length
      + " 支檔（實測基準 117＝全 src/ 減 OPS_ONLY）⇒ 走檔或排除清單被改窄");
    ["src/main.js", "src/layout/app-shell.js", "src/views/game-frame.js"].forEach(function (rel) {
      t.ok(r.attr.scopeFiles.indexOf(rel) >= 0, "屬性面射程漏掉 " + rel
        + "（main.js 證明射程不是目錄清單；app-shell 22 條、game-frame 11 條 witness 都在裡面）");
    });
    (r.attr.opsOnly || []).forEach(function (rel) {
      t.ok(r.attr.scopeFiles.indexOf(rel) < 0, "OPS_ONLY 明列的 " + rel + " 仍在屬性面射程內 ⇒ 排除沒生效");
    });

    /* ②-b **合成 witness**：`coversExact` 必須真的比 `covers` 嚴。真實語料今天的 strictDelta 是 0
       ⇒ 把 coversExact 直接寫成 covers，缺漏數一樣是 0、本鎖一樣全綠（負向擾動實測為 no-op）。
       這裡自己造 witness：拿一條**只被 PREFIX 表覆蓋**的鍵，要求寬鬆說有、嚴格說沒有。 */
    var D4 = i18nScan.dicts();
    t.ok(i18nScan.covers(D4.en, "挑戰次數 5") === true, "covers() 不認 PREFIX 表 ⇒ 本探針失去意義");
    t.ok(i18nScan.coversExact(D4.en, "挑戰次數 5") === false,
      "coversExact() 認了 PREFIX 表 ⇒ 它不比 covers 嚴，屬性面就會沿用 tText 的寬鬆契約"
      + "，而 tAttrs（core/i18n.js:104）只做精確比對——被前綴表『覆蓋』的屬性值執行期根本翻不到");
    t.ok(i18nScan.coversExact(D4.en, "遊戲設定") === true, "coversExact() 連字典裡明明有的鍵都說沒有 ⇒ 本段會全面誤報");
    t.equal(A.strictDelta, 0, "strictDelta＝" + A.strictDelta + "：真實語料出現了「寬鬆說有、嚴格說沒有」的屬性鍵"
      + " ⇒ 那是真缺漏（tAttrs 翻不到），請補精確條目而不是調鬆本段判定");

    /* ③ 兩種寫法都要認：裸鍵 `title:` 與引號鍵 `"aria-label":`／`"title":`。
       少認一種＝悄悄縮小射程；多認第二／三面的形狀＝同一條鍵被兩段各記一次。 */
    var probe = i18nScan.scanAttrBindings(
      'el("b",{title:"甲","aria-label":"乙","title":"丙",text:"丁",placeholder:"戊",label:"己",subtitle:"庚",titleOf:"辛"});'
    );
    var got = {};
    probe.forEach(function (h) { got[h.key] = h.shape; });
    t.equal(got["甲"], "title", "抽取器認不出裸鍵 `title:` ⇒ 屬性面最大宗的形狀（332/353）失守");
    t.equal(got["乙"], "aria-label", "抽取器認不出引號鍵 `\"aria-label\":` ⇒ 螢幕閱讀器唸的那一面失守");
    t.equal(got["丙"], "title", "抽取器認不出引號鍵 `\"title\":`（game-frame.js 同時用兩種寫法）");
    t.equal(probe.length, 3, "探針應恰好命中 3 條——`text:`／`placeholder:` 留給第二面、`label:`／`subtitle:` 留給第三面"
      + "（重疊會讓同一條鍵被兩段各記一次），`titleOf:` 是尾巴誤命中必須擋掉 ⇒ 實得 " + probe.length);

    /* ④ 測項 spec 的**逐宣告**排除，正反雙向都要錨。
       正向＝spec 內的 title 不算缺漏；反向＝spec 外的 title 不得被吞（區間撐大會靜默藏掉真缺漏）。
       這正是 #126 批次二 SPEC_HOSTS 逐檔排除做不到的事（它會連同檔 41 條玩家面文案一起藏）。 */
    t.ok(A.naSpec > 0, "測項 spec 逐宣告計數（naSpec）為 0 ⇒ testSpecRegions 一個區間都沒解析出來，"
      + "131 條測項標題會當成玩家面缺漏灌進分母（實測基準 131）");
    t.ok(r.attr.specFiles.length >= 20, "認出託管測項的檔只有 " + r.attr.specFiles.length
      + " 支（實測基準 28）⇒ testSpecRegions 的括號配對多半壞了");
    var probeSpec = i18nScan.scanAttrBindings(
      'st.register({ id:"a/b", title:"測項標題甲", run: function(t){ var x = el("i",{title:"測項內部乙"}); } });'
      + 'el("b",{ title:"玩家面丙" });'
    );
    t.equal(probeSpec.filter(function (h) { return h.spec; }).length, 2,
      "探針：測項 spec 內的兩條 title（含 run 主體內的）應被標 spec（實得 "
      + probeSpec.filter(function (h) { return h.spec; }).length + "）⇒ 逐宣告排除沒生效");
    t.equal(probeSpec.filter(function (h) { return !h.spec; }).length, 1,
      "探針：spec **之外**的玩家面 title 不得被標 spec（實得 "
      + probeSpec.filter(function (h) { return !h.spec; }).length
      + "）⇒ 區間被撐大到吞掉宣告以外的東西，真缺漏會被靜默藏掉");
    t.equal(i18nScan.testSpecRegions('el("b",{ id:"x", title:"純資料", run:"字串不是函式" });').length, 0,
      "testSpecRegions 把 `run:` 是**字串**的物件也當成測項 spec ⇒ 判準太鬆，玩家面資料會被整段吞掉");
    t.equal(i18nScan.testSpecRegions('var d = { action: { label:"開啟挑戰面板", run: function () { open(); } } };').length, 0,
      "testSpecRegions 把「帶 run 回呼的**描述子**」也當成測項 spec ⇒ 那正是 core/challenges.js:310 的形狀"
      + "（說明中心的行動描述子，label 是玩家天天看到的字）；少了 `register(` 那半條件，"
      + "任何描述子都能讓自己整段免譯而畫面完全正常");
    t.equal(i18nScan.testSpecRegions('registerPause({ id:"cool-1d", title:"暫停中文", run: function () { } });').length, 0,
      "testSpecRegions 把 `registerPause(` 當成 `register(` ⇒ 呼叫名邊界被放鬆成前綴/子字串比對，"
      + "responsible.js 的暫停期間描述子會被整段免譯（此探針無真實語料 witness——今天沒有任何 "
      + "registerPause 物件帶 CJK `title:`，所以放鬆邊界不會讓任何鎖轉紅⇒ 必須由本探針站崗。"
      + "⚠️ 負向擾動時要用 `indexOf(\"register\")===0` 這種**前綴**放鬆；用 `/register$/` 是打空的"
      + "——`registerPause` 本來就不以 register 結尾，那種擾動不會鬆到任何東西，擾動打空必須當失敗處理）");
    t.equal(i18nScan.testSpecRegions('st.register({ id:"a/b", title:"測項", run: function () { } });').length, 1,
      "testSpecRegions 連最基本的注入式 `st.register({… run: function})` 都認不出 ⇒ 131 條測項標題會灌進玩家面分母");

    /* ④-b `naSpec` 這條口徑必須指向**真的測項**：拿掉 SPEC_HOSTS 之後，唯一擋著 131 條測項標題的
       就是 `run: function` 這個結構標記。若哪天測項改用別的形制註冊，這裡要當場紅，
       而不是靜默把 131 條測項標題灌進玩家面分母（那會逼後手去「補譯」測項標題）。 */
    r.attr.specFiles.forEach(function (rel) {
      t.ok(i18nScan.hostsTestSpec(rd4(rel)), "屬性面判定 " + rel + " 託管測項，但檔案級的 hostsTestSpec 說沒有"
        + " ⇒ 兩個粒度的判準已經 drift（它們必須認同一個結構標記 `run: function`）");
    });

    /* ⑤ 自帶 `locales` 的 descriptor（`naLocale`）同樣正反雙向。
       正向＝descriptor 內的 title 脫離字典；反向＝區間不得吞掉 descriptor 以外的宣告。 */
    t.ok(A.naLocale > 0, "自帶 locales 的逐宣告計數（naLocale）為 0 ⇒ localeDeclRegions 沒解析出區間，"
      + "content.js 的 24 條促銷標題會被要求補進字典，補了也沒有任何表面在消費（實測基準 24）");
    t.ok(r.attr.localeFiles.indexOf("src/core/content.js") >= 0,
      "認不出 src/core/content.js 自帶 locales ⇒ 那是 #61 這套機制的主要使用者（12 張促銷卡）");
    var probeLoc = i18nScan.scanAttrBindings(
      'var C=[{ id:"p1", payload:{ title:"促銷甲" }, locales:{ "zh-Hans":{ title:"促销甲" } } },{ id:"p2", payload:{ title:"促銷乙" } }];'
    );
    t.equal(probeLoc.filter(function (h) { return h.locale; }).length, 2,
      "探針：自帶 locales 的 descriptor 內兩條含漢字 title（payload 原文與 locales 譯文）都應被標 locale（實得 "
      + probeLoc.filter(function (h) { return h.locale; }).length
      + "）⇒ 區間必須涵蓋整個 descriptor，而不是只涵蓋 `locales:` 那個子物件");
    t.equal(probeLoc.filter(function (h) { return !h.locale; }).length, 1,
      "探針：**沒有** locales 的 descriptor 其 title 仍是真缺漏，不得被標 locale（實得 "
      + probeLoc.filter(function (h) { return !h.locale; }).length
      + "）⇒ 區間被撐大＝任何 descriptor 只要同檔有人寫過 locales 就能免譯");

    /* ⑥ 串接判定（NA_CONCAT）不得再過度外擴——本輪修的正是它，而它一旦回退，
       全四段的缺漏都會被靜默吃掉而所有鎖保持全綠（實測 34 筆、32 條真缺漏）。
       三條探針分別釘住三種語境：物件字面量兄弟屬性／語句層賦值／兄弟語句。 */
    var CASE_SIBLING_PROP = 'HL.notify.add({ ic:"⌛", title:"甲",\n  text: money(x) + " 乙" });';
    t.equal(i18nScan.segmentIsConcat(CASE_SIBLING_PROP, CASE_SIBLING_PROP.indexOf('"甲"')), false,
      "兄弟屬性 `text:` 的 `+` 被算到 `title:` 頭上 ⇒ NA_CONCAT 過度外擴（progress.js:103 的原形）");
    var CASE_STMT = 'function f(){ st.textContent = "甲" + n; }';
    t.equal(i18nScan.segmentIsConcat(CASE_STMT, CASE_STMT.indexOf('"甲"')), true,
      "語句層賦值 `x.textContent = \"甲\" + n` 沒被判串接 ⇒ 修過頭了，補了字典也翻不到的項目會灌進分母");
    var CASE_SIBLING_STMT = 'function f(){ var s = a + b; st.textContent = "甲"; }';
    t.equal(i18nScan.segmentIsConcat(CASE_SIBLING_STMT, CASE_SIBLING_STMT.indexOf('"甲"')), false,
      "兄弟**語句**的 `+` 被算到本語句頭上 ⇒ block 內少了 `;` 這道切線");
    var CASE_TERNARY = 'el("p",{ text: t("甲") + " " + (f ? t("乙") : "") });';
    t.equal(i18nScan.segmentIsConcat(CASE_TERNARY, CASE_TERNARY.indexOf('"乙"')), true,
      "三元內的呼叫沒被判串接 ⇒ 往外走一層的能力被砍掉了（那是 #119 檔頭記的原始理由）");
    /* block 是**硬邊界**（走到 block 就停，不再往外走）——這一條在真實語料上沒有 gap 級 witness：
       拿掉它只讓呼叫面的 NA_CONCAT 由 115 變 117，而那兩條鍵剛好都已在字典裡 ⇒ 缺漏數不變、
       全套仍全綠（負向擾動實測 P1 為 no-op）。⇒ 自己造 witness：函式主體內的賦值本身沒有 `+`，
       但**再往外兩層**的物件屬性段有 `+` ⇒ 少了硬邊界就會把它誤判成串接而吃掉一條真缺漏。 */
    var CASE_OUTER_PLUS = 'var o = { m: (function(){ st.textContent = "甲"; })() + "乙" };';
    t.equal(i18nScan.segmentIsConcat(CASE_OUTER_PLUS, CASE_OUTER_PLUS.indexOf('"甲"')), false,
      "走進 block 之後仍繼續往外走，撿到**函式外面**的 `+` ⇒ block 硬邊界失效，真缺漏會被當成 NA_CONCAT 吃掉");
    t.equal(i18nScan.isValueGroup('f(){ x }', 3), false, "isValueGroup 把函式主體 `) {` 當成物件字面量 ⇒ 邊界失效");
    t.equal(i18nScan.isValueGroup('g({ a:1 })', 2), true, "isValueGroup 認不出引數位置的 `({` 物件字面量 ⇒ 會提早停止外走");

    /* ⑦ 棘輪本體：零容忍、逐檔指名。 */
    var total = 0;
    Object.keys(P).sort().forEach(function (rel) {
      var rec = P[rel];
      total += rec.gaps;
      if (rec.gaps > 0) {
        var lst = rec.missing.slice(0, 6).map(function (x) {
          return "「" + x.key + "」:" + x.line + "[" + x.shape + "]" + (x.en ? " 缺EN" : "") + (x.hans ? " 缺zh-Hans" : "");
        }).join("／");
        t.ok(false, rel + " 的屬性面 i18n 缺漏 " + rec.gaps + " 條：" + lst
          + "。補法＝在 src/i18n/en.js（全譯）與 src/i18n/zh-Hans.js（僅繁簡不同者）各補一條**精確**條目，"
          + "key 須與程式碼裡的字面量 trim 後逐字相同（tAttrs 不吃前後綴表）。");
      }
    });
    t.ok(total === 0, "屬性面 i18n 缺漏總量 " + total + " 條（本段自 #122 起即為零容忍，沒有基線表可放寬）");
  }
});

/*
 * 第五面：非中文 key 的 `t("nav.menu", "主選單")`（#129 · 平台軌 2026-08-26 08:00 窗）
 * ---------------------------------------------------------------------------
 * 【它為什麼能同時逃出前面四段棘輪】前四段各自要求一個條件，而這種寫法**每一條都不滿足**：
 *   ① 呼叫面（#119）要求 `t()` 第一引數含 CJK ⇒ `nav.menu` 純 ASCII，結構性失明；
 *   ② DOM 面（#120）／③ 資料面（#121/#126）／④ 屬性面（#122）都要求值是**引號字面量** ⇒
 *      `title: t("nav.menu","主選單")` 是**呼叫**，三面同樣看不見。
 *   ⇒ 同一件事的第五種寫法，也是 P3 紀律的第 9 例。
 *
 * 【今天實際外洩 0 條，據實記載】42 個呼叫點的 fallback 逐條回查字典**全數命中**
 *   ⇒ 渲染出中文後由 DOM walker／tAttrs 事後接住，切 EN 目前不露繁中。
 *   **這正是它至今沒咬人、也沒人發現的原因**——但沒有任何機制擋住下一個
 *   `t("nav.foo","新字串")` 的中文沒進字典；那一刻 node 全綠、console 零錯誤、
 *   畫面只在切語言時壞掉（＝#119 原始事故的形狀）。
 *   ⇒ 基線訂 0 的成本恰好是零，是立這條鎖的最佳時機。
 *
 * 【量的是 fallback 不是 key】`core/i18n.js` 的 `t(key, def)` 是 passthrough（回傳 def）。
 *   需要字典條目的是**第二引數**；那 37 個點分 key 在 en.js／zh-Hans.js 零命中、
 *   本來就不是字典鍵，拿它當量測對象只會量到一個永遠補不完的空集合。
 *
 * 【覆蓋判定依位置分流】掛在 `title:`／`"aria-label":`／`placeholder:` 上 ⇒ tAttrs 契約
 *   （`coversExact`，精確比對）；其餘落到文字節點 ⇒ tText 契約（`covers`，吃前/後綴表）。
 *   兩個判定函式由 #122 建立，此處直接取用、不自刻第三套。
 */
selftest.register({
  id: "platform/i18n-fallback-ratchet", group: "platform", env: "node", tier: "fast",
  title: "i18n 第五面棘輪：`t(<非中文 key>, <中文 fallback>)` 的 fallback 須有 EN/zh-Hans 條目，零容忍；屬性位置走精確比對（#129）",
  run: function (t) {
    var r = i18nScan.measure();
    var F = r.fb.totals, P = r.fb.perFile;

    /* ① 反向錨——抽取器一壞，缺漏數會變 0 而「完美通過」。下限訂在實測值的七成上下。 */
    t.ok(F.sites >= 30, "掃到的 fallback 呼叫點只有 " + F.sites + " 個（#129 實測基準 42）⇒ 抽取器多半壞了，本鎖正在空掃");
    t.ok(F.keys >= 24, "抽出的 fallback 鍵只有 " + F.keys + " 條（#129 實測基準 34）⇒ 抽取器多半壞了");
    t.ok(F.naSame > 0, "繁簡同形（NA_SAME）數為 0 ⇒ zh-Hans 需求判定壞了，會把同形鍵灌進缺漏");

    /* ②「射程沒有被縮成空集合」。與屬性面同口徑＝整個 src/ 減 OPS_ONLY——
       `t(key, def)` 可以寫在任何一支檔，用目錄清單就會重演 #119 檔頭那個病
       （逐表面特化的鎖，還沒寫的表面永遠零覆蓋）。 */
    t.ok(r.fb.scopeFiles.length >= 100, "第五面射程只剩 " + r.fb.scopeFiles.length
      + " 支檔（實測基準 117＝全 src/ 減 OPS_ONLY）⇒ 走檔或排除清單被改窄");
    ["src/layout/app-shell.js", "src/views/casino.js"].forEach(function (rel) {
      t.ok(r.fb.scopeFiles.indexOf(rel) >= 0, "第五面射程漏掉 " + rel
        + "（本面 42 個命中全部在這兩支檔：app-shell 17／casino 25）");
    });
    (r.fb.opsOnly || []).forEach(function (rel) {
      t.ok(r.fb.scopeFiles.indexOf(rel) < 0, "OPS_ONLY 明列的 " + rel + " 仍在第五面射程內 ⇒ 排除沒生效");
    });

    /* ③ 形狀探針：認得這一面、且**不**吃掉別面的東西。
       重疊會讓同一條鍵被兩段各記一次（#122 探針釘住的同一種病）。 */
    var probe = i18nScan.scanFallbackKeys(
      't("nav.menu","主選單"); t("中","中"); t("sort.hot","hot"); t("a.b", x); tt("c.d","丙"); HL.i18n.t("e.f","丁"); obj.t("g.h","戊");'
    );
    var keys = probe.map(function (h) { return h.key; });
    t.ok(keys.indexOf("主選單") >= 0, "抽取器認不出最基本的 `t(\"nav.menu\",\"主選單\")` ⇒ 本面失守");
    t.ok(keys.indexOf("丁") >= 0, "抽取器認不出 `HL.i18n.t(\"e.f\",\"丁\")` ⇒ 帶命名空間的呼叫形狀漏收");
    t.equal(keys.indexOf("中"), -1, "抽取器收了 `t(\"中\",\"中\")` ⇒ 那是第一面（#119）的射程，重疊會讓同一條鍵被兩段各記一次");
    t.equal(keys.indexOf("丙"), -1, "抽取器把 `tt(` 當成 `t(` ⇒ 識別字**左**邊界失效（title/toast/tt 都會被誤收）。"
      + "⚠️ 負向擾動要打 `!ID_CHAR.test(src[i - 1])` 那道左邊界才打得到；"
      + "右邊界 `!ID_CHAR.test(src[after])` 與後面的 `src[p] === \"(\"` **重複**（`tabc (` 的 p 會落在 `a` 上），"
      + "拿掉它是 no-op、擾動會打空——沿用第一面的寫法保留它是為了兩面同構，不是因為它是唯一的擋");
    t.equal(keys.indexOf("戊"), -1, "抽取器放行了 `obj.t(` ⇒ 只有 `i18n.t(` 這條點路徑該放行，別的物件的 `.t()` 不是翻譯呼叫");
    t.equal(probe.length, 2, "探針應恰好命中 2 條（主選單／丁）——純 ASCII fallback 與非字面量第二引數都不該收，實得 " + probe.length);

    /* ③-b 反向：第一面**不得**收這一面的形狀。兩把尺同時放寬時，
       一條鍵被兩段各記一次不會讓任何鎖轉紅，只會讓兩段的分母都虛胖。 */
    t.equal(i18nScan.scanSource('t("nav.menu","主選單");').length, 0,
      "第一面（scanSource）收了 `t(<非中文 key>, <中文 fallback>)` ⇒ 與本面重疊；第一面的判準是**第一引數含 CJK**");

    /* ④ 位置分流：屬性位置必須走 `coversExact`（tAttrs 只做精確比對），
       否則被前綴表「覆蓋」的屬性值執行期根本翻不到，而本鎖卻說沒事。 */
    t.ok(F.attrSites > 0, "掛在屬性鍵上的 fallback 命中數為 0（實測基準 10）⇒ 位置判定壞了，"
      + "全部退回寬鬆的 tText 契約，屬性面那一半就失去嚴格性");
    var pos = i18nScan.scanFallbackKeys(
      'el("b",{ title: t("a.a","甲"), "aria-label": t("b.b","乙"), placeholder: t("c.c","丙"),'
      + ' label: t("d.d","丁"), text: t("e.e","戊") }); x.title = t("f.f","己");'
    );
    var byKey = {};
    pos.forEach(function (h) { byKey[h.key] = h.attr; });
    t.equal(byKey["甲"], "title", "裸鍵 `title: t(…)` 沒被判為屬性位置 ⇒ 該走精確比對的走了寬鬆");
    t.equal(byKey["乙"], "aria-label", "引號鍵 `\"aria-label\": t(…)` 沒被判為屬性位置 ⇒ 螢幕閱讀器唸的那一面失去嚴格性");
    t.equal(byKey["丙"], "placeholder", "`placeholder: t(…)` 沒被判為屬性位置");
    t.equal(byKey["丁"], "", "`label:` 被判成屬性位置 ⇒ 它是文字節點（tText 契約），會被錯誤地要求精確條目");
    t.equal(byKey["戊"], "", "`text:` 被判成屬性位置 ⇒ 同上，判定過寬");
    t.equal(byKey["己"], "", "`x.title = t(…)` 被判成屬性宣告 ⇒ 屬性位置的判準是「往左第一個非空白字元是 `:`」，"
      + "賦值的 `=` 不算；少了這道要求，任何 `foo.title = t(…)` 都會被錯誤地要求精確條目");
    var pos3 = i18nScan.scanFallbackKeys('var title = t("m.m","辛");');
    t.equal(pos3.length && pos3[0].attr, "", "區域變數賦值 `var title = t(…)` 被判成屬性位置"
      + " ⇒ 屬性宣告的形狀是 `title:`（冒號），不是 `title =`；"
      + "少了那道 `:` 要求，任何叫 title 的變數都會被錯誤地要求精確條目"
      + "（此形狀在真實語料裡沒有 witness ⇒ 由本探針站崗）");
    var pos2 = i18nScan.scanFallbackKeys('var s = f ? a.title : t("k.k","庚");');
    t.equal(pos2.length && pos2[0].attr, "", "三元的 else 分支 `cond ? a.title : t(…)` 被判成屬性位置"
      + " ⇒ 往左看到的 `:` 是三元的冒號、`title` 前面那個 `.` 才是唯一的分辨線索"
      + "（此形狀在真實語料裡沒有 witness ⇒ 必須由本探針站崗：拿掉 `.` 那道擋，"
      + "缺漏數不會變、所有鎖照樣全綠）");
    t.equal(i18nScan.fbAttrKeyBefore('el("b",{subtitle: t("a","甲")});', 'el("b",{subtitle: '.length), "",
      "`subtitle:` 的尾巴被當成 `title:` ⇒ 識別字左邊界失效（`title` 是 `subtitle` 的後綴）");

    /* ④-b 嚴格判定必須真的比寬鬆嚴（沿用 #122 的合成 witness——真實語料今天 strictDelta＝0，
       把 coversExact 寫成 covers 是 no-op，負向擾動會打空）。 */
    var D5 = i18nScan.dicts();
    t.ok(i18nScan.covers(D5.en, "挑戰次數 5") === true, "covers() 不認 PREFIX 表 ⇒ 本探針失去意義");
    t.ok(i18nScan.coversExact(D5.en, "挑戰次數 5") === false, "coversExact() 認了 PREFIX 表 ⇒ 屬性位置的分流形同虛設");
    t.equal(i18nScan.fbCovers(D5.en, "挑戰次數 5", "title"), false,
      "分流決策點 fbCovers() 在**屬性位置**仍說「有覆蓋」⇒ 它沒走 coversExact；"
      + "被前綴表覆蓋的屬性值執行期根本翻不到，而本鎖會說沒事"
      + "（此探針無真實語料 witness——今天 strictDelta＝0，把 coversExact 改回 covers 是 no-op、"
      + "不會讓任何鎖轉紅 ⇒ 必須由本探針站崗）");
    t.equal(i18nScan.fbCovers(D5.en, "挑戰次數 5", ""), true,
      "分流決策點 fbCovers() 在**文字節點位置**用了嚴格比對 ⇒ 分流退化成「全部從嚴」，"
      + "會把 tText 明明翻得到的前綴表覆蓋鍵誤報成缺漏");
    t.equal(F.strictDelta, 0, "strictDelta＝" + F.strictDelta + "：屬性位置出現了「寬鬆說有、嚴格說沒有」的 fallback"
      + " ⇒ 那是真缺漏（tAttrs 翻不到），請補精確條目而不是調鬆本段判定");

    /* ⑤ 棘輪本體：零容忍、逐檔指名。基線就是今天的 0，沒有基線表可放寬。 */
    var total = 0;
    Object.keys(P).sort().forEach(function (rel) {
      var rec = P[rel];
      total += rec.gaps;
      if (rec.gaps > 0) {
        var lst = rec.missing.slice(0, 6).map(function (x) {
          return "「" + x.key + "」:" + x.line + "[key=" + x.id + (x.attr ? "／" + x.attr : "") + "]"
            + (x.en ? " 缺EN" : "") + (x.hans ? " 缺zh-Hans" : "");
        }).join("／");
        t.ok(false, rel + " 的第五面 i18n 缺漏 " + rec.gaps + " 條：" + lst
          + "。補法＝在 src/i18n/en.js（全譯）與 src/i18n/zh-Hans.js（僅繁簡不同者）各補一條，"
          + "key 須與 `t()` **第二引數**（fallback 中文）trim 後逐字相同——不是第一引數那個點分 key。");
      }
    });
    t.ok(total === 0, "第五面 i18n 缺漏總量 " + total + " 條（本段自 #129 起即為零容忍，沒有基線表可放寬）");
  }
});

/*
 * #140 i18n 屬性面「射程 ≡ 引擎」雙向等式（平台軌 2026-08-28 14:00 窗）
 * ---------------------------------------------------------------------------
 * 【前五面全部立完之後仍然開著的那個洞】五面棘輪問的都是「**這條中文有沒有字典條目**」。
 *   沒有任何一條問過**上游那個更基本的問題**：「引擎到底翻哪幾個屬性、而尺知不知道？」
 *   而「翻哪幾個屬性」這件事在 `core/i18n.js` 裡被**硬寫了三次**：
 *     · `:83  OBS.attributeFilter` ＝屬性被**改**時會不會收到通知（動態更新路徑）
 *     · `:102 tAttrs` 的 forEach 清單 ＝**真正動手翻**的那一份（地面真相）
 *     · `:151 walk()` 的 `querySelectorAll` ＝**子孫元素**會不會被走到（root 自己走 :147）
 *   尺這邊又各自宣告一次：`ATTR_QUOTED_KEYS`＋`ATTR_BARE_KEY`（第四面 #122）／
 *   `FB_ATTR_KEYS`（第五面 #129）／`DOM_SHAPES` 的 `placeholder`（第二面 #120）。
 *   ⇒ **五份副本、零機械關聯**。加第四個屬性（例圖片 `alt`）時漏改任一份，症狀全都是
 *   「畫面看起來完全正常」：漏改 :151 ⇒ 只有 root 被翻、子孫原樣繁中；漏改 :83 ⇒ 首次翻到、
 *   之後程式改該屬性就再也不翻；**漏改尺 ⇒ 那個屬性的中文永遠不進零容忍棘輪的分母**
 *   ——五面棘輪全部繼續寫著「缺漏 0」，覆蓋率單向下降且**沒有任何讀數**。
 *   ⇒ CLAUDE.md §4「修一半而看不出來」的**名冊變體**第三例（前兩例：08-27
 *   `central-hook-fanout-roster`、08-28 `audience-consumer-roster-closed`）。
 *
 * 【本輪同時修掉的一條真的「修一半」——#122 只修了兩個屬性中的兩個，第三個沒修】
 *   #122 的核心論證是**契約差異**：`tText` 有 精確→PREFIX→SUFFIX 三段，`tAttrs`（`:104`）
 *   只有 `if (d[k] == null) return;` ＝**只精確比對** ⇒ 一條只被 PREFIX 表覆蓋的屬性值，
 *   寬鬆的 `covers()` 會說「已覆蓋」，而執行期 `tAttrs` 根本翻不到、切 EN 照樣露繁中。
 *   #122 據此把 `title`／`aria-label` 收進新的屬性面並改用 `coversExact`，
 *   **但 `placeholder` 是同一個 `tAttrs` 翻的、卻仍留在第二面被寬鬆的 `covers()` 判**
 *   （`measureDom` 舊碼對所有形狀一律 `covers`）。同一條契約差異、三個屬性修了兩個，
 *   而四面棘輪全綠、`strictDelta` 這個自我揭露欄位第二面根本沒有。
 *   ⇒ 本輪把 `measureDom` 改為**逐形狀分流**（形狀 ∈ 引擎屬性集 ⇒ `coversExact`），
 *   並補上 `strictDelta`。**落地當輪 `strictDelta === 0`**（9 條 placeholder 命中全是精確覆蓋）
 *   ⇒ 零回歸、也**沒有真實 witness** ⇒ 嚴格性由下方 ④ 的合成探針站崗（同 #122／#129 的處置）。
 *
 * 【誠實聲明】本鎖今天**沒有抓到任何現存缺陷**——三份引擎副本一致、三面尺的射程聯集恰等於
 *   引擎屬性集。它買的是「以後長第四個屬性時會被抓到」，以及 placeholder 契約分流不會被改回去。
 */
selftest.register({
  id: "platform/i18n-attr-surface-closed", group: "platform", env: "node", tier: "fast",
  title: "i18n 屬性面射程閉合：core/i18n.js 三處硬寫的屬性清單（attributeFilter／tAttrs／walk 選擇器）必須互等，且三面尺的屬性射程聯集 ≡ 引擎屬性集（雙向）；屬性形狀一律走 tAttrs 的嚴格覆蓋契約（#140）",
  run: function (t) {
    var E = i18nScan.engineAttrs();
    function sorted(a) { return a.slice().sort().join("|"); }
    function uniq(a) { var s = {}, o = []; a.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }

    /* ① 反向錨（尺自身第 1 條）：三處解析都必須真的讀到東西。
       解析器一壞就是三個空集合，而**空 ≡ 空 恆真** ⇒ 本鎖會「完美通過」而一個字都沒守。
       下限取 3＝今天的實測值；真要縮到 2 個屬性是產品決定，該當場重讀本鎖而不是靜默放行。 */
    t.ok(E.tAttrs.length >= 3, "從 core/i18n.js 的 tAttrs 只解析出 " + E.tAttrs.length
      + " 個屬性（實測基準 3：title／placeholder／aria-label）⇒ 解析器多半壞了，本鎖正在空掃");
    t.ok(E.obs.length >= 3, "從 OBS.attributeFilter 只解析出 " + E.obs.length + " 個屬性 ⇒ 解析器多半壞了");
    t.ok(E.selector.length >= 3, "從 walk() 的 querySelectorAll 只解析出 " + E.selector.length
      + " 個屬性 ⇒ 解析器多半壞了（注意 `[data-i18n-fmt]` 屬 renderFmt 另一套機制，已刻意排除）");

    /* ② 引擎自己的三份副本必須互等——這是「加了屬性只改一處」的直接偵測。 */
    t.equal(sorted(E.obs), sorted(E.tAttrs), "OBS.attributeFilter（" + sorted(E.obs)
      + "）與 tAttrs 實際翻的清單（" + sorted(E.tAttrs) + "）不一致 ⇒ 差集裡的屬性"
      + "「初次渲染翻得到、之後被程式改寫就再也不翻」（或反之：白監聽），畫面上只在特定時序露繁中");
    t.equal(sorted(E.selector), sorted(E.tAttrs), "walk() 的 querySelectorAll（" + sorted(E.selector)
      + "）與 tAttrs 實際翻的清單（" + sorted(E.tAttrs) + "）不一致 ⇒ 差集裡的屬性"
      + "**只有 root 元素自己會被翻**（i18n.js:147），子孫元素原樣露繁中——這是最難目視發現的一種");

    /* ③ 雙向等式：三面尺的屬性射程聯集 ≡ 引擎屬性集。
       正向（射程 ⊇ 引擎）＝新增屬性沒人要求字典條目 ⇒ 零容忍棘輪對它永遠 0/0。
       反向（射程 ⊆ 引擎）＝尺要求了引擎根本不翻的屬性 ⇒ 補進語言包只會產生死鍵（#121 付過這種代價）。 */
    var attrFace = i18nScan.attrFaceKeys();                     // 第四面 #122：title／aria-label
    var fbFace = i18nScan.fbAttrKeys();                         // 第五面 #129：屬性位置分流用
    var domAttr = i18nScan.domShapeProps().filter(function (p) {
      return ["text", "textContent"].indexOf(p) < 0;             // 這兩個是文字注入屬性，不是 HTML 屬性
    });                                                          // 第二面 #120：placeholder
    var covered = uniq(attrFace.concat(fbFace, domAttr));
    E.tAttrs.forEach(function (a) {
      t.ok(covered.indexOf(a) >= 0, "引擎會翻屬性 `" + a + "`，但三面尺（#122 屬性面／#129 第五面／#120 DOM 面）"
        + "的射程都不含它 ⇒ 該屬性的中文寫下去就上線、切 EN 原樣露繁中，而五面棘輪全部繼續寫著「缺漏 0」。"
        + "補法＝把它加進 tests/i18n-key-scan.js 的 ATTR_QUOTED_KEYS（或 DOM_SHAPES）並重量該面基線");
    });
    covered.forEach(function (a) {
      t.ok(E.tAttrs.indexOf(a) >= 0, "尺要求屬性 `" + a + "` 的中文必須有字典條目，但 core/i18n.js 的 tAttrs "
        + "並不翻它（實際翻的是 " + sorted(E.tAttrs) + "）⇒ 補進語言包的條目沒有任何表面在消費＝死鍵；"
        + "若是引擎刻意撤掉該屬性，請同步把它從尺的射程移除");
    });

    /* ④ 契約分流（本輪的真修）＋它的合成 witness。
       `tAttrs` 只精確比對 ⇒ 屬性形狀必須用 coversExact。真實語料今天 strictDelta＝0，
       把分流改回一律 covers 是 no-op（負向擾動會打空）⇒ 這三條探針就是它的 witness。 */
    var shapes = i18nScan.attrShapeSet();
    t.ok(Object.keys(shapes).length >= 1, "attrShapeSet() 是空集合 ⇒ DOM 面的屬性形狀（今天＝placeholder）"
      + "全部靜默退回寬鬆的 covers()，#140 修的那一半又被還原、而缺漏數一樣是 0（尺自身反向錨第 2 條）");
    t.ok(shapes.placeholder === true, "placeholder 沒被判為屬性形狀 ⇒ 它是 tAttrs 翻的（i18n.js:102）、"
      + "只精確比對，被 PREFIX 表覆蓋就翻不到；用 covers() 判它會說「已覆蓋」而執行期露繁中（#122 的漏修那一半）");
    var D6 = i18nScan.dicts();
    t.ok(i18nScan.covers(D6.en, "挑戰次數 5") === true && i18nScan.coversExact(D6.en, "挑戰次數 5") === false,
      "PREFIX 覆蓋鍵在 covers()／coversExact() 上不再有差異 ⇒ 嚴格契約的合成 witness 失效，"
      + "④ 的整段分流檢查形同虛設（尺自身反向錨第 3 條）");
    t.equal(i18nScan.domCovers(D6.en, "挑戰次數 5", "placeholder"), false,
      "分流決策點 domCovers() 在**屬性形狀**仍說「有覆蓋」⇒ 它沒走 coversExact；"
      + "被前綴表覆蓋的 placeholder 執行期根本翻不到（tAttrs 只精確比對），而第二面棘輪會說沒事"
      + "（此探針無真實語料 witness——今天 strictDelta＝0，把分流改回一律 covers 是完全的 no-op、"
      + "不會讓任何鎖轉紅 ⇒ 必須由本探針站崗）");
    t.equal(i18nScan.domCovers(D6.en, "挑戰次數 5", "text"), true,
      "分流決策點 domCovers() 在**文字節點形狀**用了嚴格比對 ⇒ 分流退化成「全部從嚴」，"
      + "會把 tText 明明翻得到的前綴／後綴表覆蓋鍵誤報成缺漏（#120 卡上阻塞事實 ② 的回歸）");
    var dom = i18nScan.measure().dom.totals;
    t.ok(typeof dom.strictDelta === "number", "measureDom 沒有 strictDelta 自我揭露欄位 ⇒ "
      + "「換回寬鬆判定會少算幾條」變成不可觀測，分流被改鬆時不會有任何讀數");
    t.equal(dom.strictDelta, 0, "DOM 面 strictDelta＝" + dom.strictDelta
      + "：屬性形狀出現了「寬鬆說有覆蓋、嚴格說沒有」的宣告 ⇒ 那是真外洩（tAttrs 翻不到），"
      + "請在 src/i18n/*.js 補**精確**條目，不要把本段判定調鬆");
  }
});

/*
 * T39 餘額存取單一真相（維護軌 2026-08-23 12:00 窗·去重維度）
 * ---------------------------------------------------------------------------
 * 收斂前：jackpot/table/streamer/liveroom 四模組各自手刻
 *   `HL.instant ? HL.instant.bal() : HL.state.get().balance`（bal）
 *   `if (HL.instant){HL.instant.setBal(v);return;} HL.state.set({balance:...}); refreshChrome()`（setBal）
 * 而 HL.instant.bal/setBal 的本體與那個「後備分支」逐字相同（instant.bal 即 get().balance；
 * instant.setBal 即 set(balance)+refreshChrome）⇒「HL.instant ?」是恆等分歧、四份 setBal(193B)重複且會 drift。
 * 收斂後：唯一實作在餘額擁有者 HL.state.bal/setBal，instant 與四模組皆薄委派。
 * 最強反向錨＝「直接寫 balance 的本體全站恰 1 處」：任何模組重新內聯就 >1 而紅。
 */
selftest.register({
  id: "platform/balance-accessor-single-source", group: "platform", env: "node", tier: "fast",
  title: "餘額存取單一真相：HL.state.bal/setBal 為唯一實作，instant + jackpot/table/streamer/liveroom 皆薄委派、無人重新內聯直接寫 balance（守 T39 收斂不回退）",
  run: function (t) {
    var fs2 = require("fs");
    var SRC = path.join(ROOT, "src");
    function rd(rel) { try { return fs2.readFileSync(path.join(SRC, rel), "utf8"); } catch (e) { return ""; } }
    function strip(x) { return x.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, ""); }

    // ① 單一真相在 HL.state（app-state.js）
    var st = strip(rd("core/app-state.js"));
    t.ok(st.length > 400, "應讀到 core/app-state.js（實測 " + st.length + " 字元）"); // 反向錨：檔沒讀到別假裝通過
    t.ok(/function\s+bal\s*\(\s*\)\s*\{\s*return\s+get\(\)\.balance/.test(st),
      "app-state.js 必須定義 bal()＝get().balance（餘額讀取單一真相）");
    t.ok(/function\s+setBal\s*\(\s*v\s*\)\s*\{[\s\S]*?balance:\s*Math\.max\(0,\s*Math\.round\(v\)\)[\s\S]*?refreshChrome/.test(st),
      "app-state.js 必須定義 setBal(v)＝寫 balance(夾0/四捨五入)+refreshChrome（餘額寫入單一真相）");
    t.ok(/HL\.state\s*=\s*\{[\s\S]*?bal:\s*bal[\s\S]*?setBal:\s*setBal/.test(st),
      "bal/setBal 必須掛上 HL.state 匯出（否則 5 個委派者呼叫不到）");

    // ② 直接寫 balance 的本體全站恰 1 處（reverse anchor：重新內聯就 >1）
    function walk(d){var out=[];fs2.readdirSync(d).forEach(function(f){var p=path.join(d,f);var s=fs2.statSync(p);if(s.isDirectory())out=out.concat(walk(p));else if(/\.js$/.test(f))out.push(p);});return out;}
    var writes = 0;
    walk(SRC).forEach(function(p){ var m = strip(fs2.readFileSync(p,"utf8")).match(/balance:\s*Math\.max\(0,\s*Math\.round\(/g); if (m) writes += m.length; });
    t.equal(writes, 1, "直接寫 balance 的本體全站應恰 1 處(app-state.setBal)；實測 " + writes + " ⇒ 有模組重新內聯了餘額寫入(T39 回退)");

    // ③ 5 個委派者：呼叫 HL.state.bal/setBal，且不得殘留 HL.instant? 後備分支
    var delegators = ["core/instant.js","core/jackpot.js","core/table.js","layout/streamer.js","views/liveroom.js"];
    var bad = [];
    delegators.forEach(function (rel) {
      var c = strip(rd(rel));
      t.ok(c.length > 0, "應讀到 " + rel);
      if (!/function\s+bal\s*\(\s*\)\s*\{\s*return\s+HL\.state\.bal\(\)/.test(c)) bad.push(rel + "（bal 未委派 HL.state.bal）");
      if (!/function\s+setBal\s*\(\s*v\s*\)\s*\{\s*HL\.state\.setBal\(v\)/.test(c)) bad.push(rel + "（setBal 未委派 HL.state.setBal）");
      if (/HL\.instant\s*\?\s*HL\.instant\.bal/.test(c)) bad.push(rel + "（殘留 HL.instant? 後備分支）");
    });
    t.equal(bad.length, 0, "委派者未收斂或回退：" + (bad.join("、") || "（無）"));
  }
});

/*
 * T43 站別字串模式單一真相（維護軌 2026-08-27 00:00 窗·去重維度）
 * ---------------------------------------------------------------------------
 * 收斂前：activity/edge/progress-src/service-level 各自手刻
 *   `function mode() { return (HL.site && HL.site.isLive && HL.site.isLive()) ? "live" : "demo"; }`（×4 byte-identical 叢集）
 *   ＋ rakeboost.mode / progress.rbMode 兩個雙守衛變體＝同族共 6 個具名函式各自把站別字串重刻一次，
 *   而 core/site-mode.js 早已匯出 HL.site.mode()＝MODE ∈ {"live","demo"} 的單一真相。
 * 恆等證明：HL.site 存在時 isLive()?"live":"demo" 逐字＝MODE（MODE 已正規化為兩值之一）；HL.site 缺時兩式皆退 "demo"（守衛保留）。
 * 收斂後：6 個函式體皆委派 HL.site.mode()（零 view/呼叫點改動、純函式體收斂、首屏淨 -60B ⇒ 順帶擴 [P-FS] 餘裕 3→63 bytes）。
 * ⚠️ 刻意排除 wager-scope.js:78＝它帶 `!isNode &&` 守衛、在 node 端故意回 "demo"（決定性契約），委派 HL.site.mode() 會破壞 ⇒ 列為基線例外並防腐。
 * 反向錨：① site-mode.js 必須真的定義並匯出 mode()（委派目標不存在則整條不可假通過）；
 *         ② core/ 內「function mode/rbMode 用 isLive 三元式重刻站別字串」的具名函式總數必須恰＝基線 {wager-scope}（有人新開一份就紅＝防「修一半」）。
 */
selftest.register({
  id: "platform/site-mode-single-source", group: "platform", env: "node", tier: "fast",
  title: "站別字串單一真相：activity/edge/progress-src/service-level/rakeboost 的 mode() 與 progress 的 rbMode() 皆委派 HL.site.mode()，除 wager-scope(node 守衛) 外無人重刻站別三元式（守 T43 收斂不回退）",
  run: function (t) {
    var fs2 = require("fs");
    var CORE = path.join(ROOT, "src", "core");
    function rd(rel) { try { return fs2.readFileSync(path.join(CORE, rel), "utf8"); } catch (e) { return ""; } }
    function strip(x) { return x.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, ""); }

    // ① 反向錨：單一真相 site-mode.js 真的定義並匯出 mode()（委派目標為實，否則整條可被空委派假滿足）
    var sm = strip(rd("site-mode.js"));
    t.ok(sm.length > 200, "應讀到 core/site-mode.js（實測 " + sm.length + " 字元）");
    t.ok(/function\s+mode\s*\(\s*\)\s*\{\s*return\s+MODE;?\s*\}/.test(sm), "site-mode.js 必須定義 mode()＝return MODE（站別字串單一真相）");
    t.ok(/HL\.site\s*=\s*\{[\s\S]*?\bmode:\s*mode\b/.test(sm), "mode 必須掛上 HL.site 匯出（否則 6 個委派者呼叫不到）");

    // ② 6 個委派者：mode()/rbMode() 皆委派 HL.site.mode()（函式體逐字＝收斂後形狀；重新內聯站別三元式即紅）
    var delegators = [
      { f: "activity.js", fn: "mode" }, { f: "edge.js", fn: "mode" },
      { f: "progress-src.js", fn: "mode" }, { f: "service-level.js", fn: "mode" },
      { f: "rakeboost.js", fn: "mode" }, { f: "progress.js", fn: "rbMode" }
    ];
    var bad = [];
    delegators.forEach(function (d) {
      var body = strip(rd(d.f));
      var re = new RegExp("function\\s+" + d.fn + "\\s*\\(\\s*\\)\\s*\\{\\s*return\\s+HL\\.site\\s*&&\\s*HL\\.site\\.mode\\s*\\?\\s*HL\\.site\\.mode\\(\\)\\s*:\\s*\"demo\";\\s*\\}");
      if (!re.test(body)) bad.push(d.f + " 的 " + d.fn + "() 未委派 HL.site.mode()");
    });
    t.equal(bad.length, 0, "站別委派者未收斂或回退：" + (bad.join("、") || "（無）"));

    // ③ 反向錨：core/ 內「用 isLive 三元式重刻站別字串」的具名函式總數＝基線 {wager-scope}（防「修一半」＝新開一份就紅）
    var reImplRe = /function\s+(?:mode|rbMode)\s*\([^)]*\)\s*\{[^}]*isLive\s*\(\s*\)[^}]*\?[^}]*"live"[^}]*:[^}]*"demo"/;
    var reimpl = [];
    fs2.readdirSync(CORE).forEach(function (f) {
      if (!/\.js$/.test(f)) return;
      if (reImplRe.test(strip(fs2.readFileSync(path.join(CORE, f), "utf8")))) reimpl.push(f);
    });
    t.equal(reimpl.sort().join(","), "wager-scope.js",
      "core/ 內站別三元式重刻僅允許基線例外 wager-scope.js(node 守衛)；實測 [" + reimpl.join(", ") + "]（多出＝有人重刻站別字串，應改委派 HL.site.mode()）");
  }
});

/*
 * #61 內容資料層 HL.content（平台軌 2026-08-23 14:00 窗）
 * ---------------------------------------------------------------------------
 * 這四條鎖守的是「內容從硬寫陣列變成註冊表」之後**新產生的四種失敗方式**：
 *   ① 窗口只擋一個方向 —— CLAUDE.md §4 明列的「修一半而看不出來」型態之二（不變量只擋單向）。
 *      只判「已結束」＝未開始的內容提前上線；只判「未開始」＝過期的活動永遠掛在首屏。
 *   ② 受眾長出第二張表 —— #107 已把受眾詞彙釘在 core/release.js；新註冊表最容易順手自刻門檻。
 *      連帶守 fail-closed：拿不到述詞時必須「不顯示」，不能默認放行。
 *   ③ 解析改寫註冊表 —— 語系解析若就地改寫 descriptor，切一次語言就把原文永久換掉（第二份真相）。
 *   ④ **內容資料的 i18n 缺漏**（本輪立卡的真正理由）：#119 的棘輪掃 `t("中文")` 呼叫點，
 *      而內容是**資料**、不是呼叫點 ⇒ 促銷輪播 12 張卡曾整片零翻譯而全綠。本鎖逐則 × 逐語言掃，
 *      並帶反向錨（漢字偵測器與 descriptor 數量），避免「掃不到＝完美通過」的同形陷阱。
 * =========================================================================== */
var content = require(path.join(ROOT, "src", "core", "content.js"));

selftest.register({
  id: "content/window-both-ways", group: "platform", env: "node", tier: "fast",
  title: "內容窗口兩個方向都要擋（未開始／已結束）＋ enabled:false 不顯示（#61）",
  run: function (t) {
    var T0 = 1700000000000, HOUR = 3600000;
    var always = { id: "a", type: "lobby-promo", payload: {} };
    t.equal(content.phaseOf(always, T0), "always", "無窗口＝常設");
    t.ok(content.visibleAt(always, T0, {}, null), "常設內容應可見（未宣告受眾故不需述詞）");

    var win = { id: "b", type: "lobby-promo", payload: {}, startAt: T0, endAt: T0 + HOUR };
    t.equal(content.phaseOf(win, T0 - 1), "upcoming", "開始前一毫秒＝upcoming");
    t.equal(content.phaseOf(win, T0), "live", "startAt 當下＝live");
    t.equal(content.phaseOf(win, T0 + HOUR - 1), "live", "結束前一毫秒仍 live");
    t.equal(content.phaseOf(win, T0 + HOUR), "ended", "endAt 當下＝已結束（右開區間）");
    t.ok(!content.visibleAt(win, T0 - 1, {}, null), "未開始的內容不得提前出現");
    t.ok(!content.visibleAt(win, T0 + HOUR, {}, null), "已結束的內容不得留在畫面上");
    t.ok(content.visibleAt(win, T0 + 1, {}, null), "窗口內應可見");

    t.ok(!content.visibleAt({ id: "c", type: "lobby-promo", payload: {}, startAt: T0 }, T0 - 1, {}, null), "只有 startAt：未到不顯示");
    t.ok(content.visibleAt({ id: "c", type: "lobby-promo", payload: {}, startAt: T0 }, T0, {}, null), "只有 startAt：到了顯示");
    t.ok(!content.visibleAt({ id: "d", type: "lobby-promo", payload: {}, endAt: T0 }, T0, {}, null), "只有 endAt：過了不顯示");
    t.ok(!content.visibleAt({ id: "e", type: "lobby-promo", payload: {}, enabled: false }, T0, {}, null), "enabled:false 一律不顯示");
    t.ok(content.visibleAt({ id: "f", type: "lobby-promo", payload: {}, enabled: true }, T0, {}, null), "enabled:true 照常顯示");

    // 排序契約：priority 高者先、同 priority 維持註冊順序（遷移前的陣列順序才會逐位不變）
    var order = content.sortDescs([{ id: "a", _seq: 0 }, { id: "b", _seq: 1 }, { id: "c", _seq: 2, priority: 5 }])
      .map(function (x) { return x.id; }).join(",");
    t.equal(order, "c,a,b", "priority 高者先，同 priority 維持註冊順序");
  }
});

selftest.register({
  id: "content/audience-delegated", group: "platform", env: "node", tier: "fast",
  title: "受眾述詞一律外求（內容層不得有第二張受眾表）＋ 拿不到述詞時 fail-closed（#61 / #107 契約）",
  run: function (t) {
    var T0 = 1700000000000;
    var d = { id: "a", type: "lobby-promo", payload: {}, audience: { kind: "vip", arg: 5 } };
    var seen = null;
    var yes = function (a, ctx) { seen = { a: a, ctx: ctx }; return true; };
    var no = function () { return false; };
    var boom = function () { throw new Error("boom"); };

    t.ok(content.visibleAt(d, T0, { vipLevel: 9 }, yes), "述詞說符合＝顯示");
    t.ok(!!seen && seen.a === d.audience, "audience 描述子須原樣交給外部述詞（內容層不自行解讀 kind）");
    t.ok(!!seen && seen.ctx && seen.ctx.vipLevel === 9, "受眾 ctx 須原樣傳遞");
    t.ok(!content.visibleAt(d, T0, {}, no), "述詞說不符合＝整則不出現（非灰掉）");
    t.ok(!content.visibleAt(d, T0, {}, null), "宣告了 audience 卻拿不到述詞＝fail-closed 不顯示");
    t.ok(!content.visibleAt(d, T0, {}, boom), "述詞拋錯＝保守不顯示");
    t.ok(content.visibleAt({ id: "b", type: "lobby-promo", payload: {} }, T0, {}, no), "未宣告受眾者不問述詞＝零回歸");

    // 機械證據：content.js 的邏輯區不得自建受眾詞彙／自刻門檻欄位；瀏覽器端必須向 release 求
    var src = fs.readFileSync(path.join(ROOT, "src", "core", "content.js"), "utf8");
    var logic = src.split("種子內容")[0];
    t.ok(logic.indexOf("AUDIENCES") < 0, "content.js 邏輯區不得自建 AUDIENCES 表（唯一來源＝core/release.js）");
    t.ok(logic.indexOf("newcomer") < 0 && logic.indexOf("seasonTier") < 0, "content.js 不得自刻受眾種類/門檻欄位");
    t.ok(/HL\.release\.matches/.test(src), "content.js 必須向 HL.release.matches 求述詞（否則受眾維度是死的）");

    // 反向錨：受眾詞彙的唯一來源仍在 release.js，且 content 的 kind 皆可被它解讀
    var release = require(path.join(ROOT, "src", "core", "release.js"));
    t.ok(Object.keys(release.AUDIENCES).length >= 7, "受眾詞彙來源應仍在 release.js（實測 " + Object.keys(release.AUDIENCES).length + " 種）");
  }
});

selftest.register({
  id: "content/resolve-pure", group: "platform", env: "node", tier: "fast",
  title: "語系解析是純函式：不改寫註冊表、缺該語言退回原文、回傳值可安全改（#61）",
  run: function (t) {
    var d = { id: "a", type: "lobby-promo",
      payload: { tag: "標籤", title: "標題", ic: "🎰" },
      locales: { en: { tag: "Tag", title: "Title" } } };
    var en = content.resolveLocale(d, "en");
    t.equal(en.tag, "Tag", "有譯文者取譯文");
    t.equal(en.ic, "🎰", "未覆蓋的欄位沿用原文（淺層覆蓋，不是整包替換）");
    t.equal(content.resolveLocale(d, "zh-Hant").title, "標題", "原文語言取 payload");
    t.equal(content.resolveLocale(d, "ja").title, "標題", "沒有該語言的譯文＝退回原文（不得回 undefined 讓畫面空白）");
    t.equal(d.payload.tag, "標籤", "解析不得改寫 descriptor（註冊表永遠是那份原文）");
    en.tag = "MUTATED";
    t.equal(content.resolveLocale(d, "en").tag, "Tag", "呼叫端改了回傳值，下次解析仍為原值");
  }
});

selftest.register({
  id: "content/locale-coverage", group: "platform", env: "node", tier: "fast",
  title: "內容資料的 i18n 覆蓋：每則 descriptor × 每個非原文語言，含漢字欄位須有譯文（#61 · 補 #119 棘輪掃不到的資料型缺漏）",
  run: function (t) {
    var langs = ["en", "zh-Hans"];          // 與 core/i18n.js LANGS 對齊；新增語言時本鎖要跟著加
    var ds = content.SEED;

    // ① 反向錨（防「掃不到任何東西＝完美通過」的同形陷阱）
    t.ok(ds.length >= 12, "掃到的 descriptor 只有 " + ds.length + " 則（種子基準 12）⇒ 本鎖正在空掃");
    t.ok(content.CJK.test("首儲獎金"), "漢字偵測器對中文應為真（偵測器壞掉會讓所有缺漏變 0）");
    t.ok(!content.CJK.test("Deposit Bonus 50% 🎰"), "漢字偵測器對純英數/emoji 應為假（否則色碼/路由鍵會被當成需翻譯）");
    var probe = { id: "p", type: "lobby-promo", payload: { title: "測試", ic: "🎰", c1: "#fff" } };
    t.equal(content.needsLocale(probe, "en").join(","), "title", "needsLocale 只該點名含漢字的文字欄位");
    t.equal(content.needsLocale(probe, "zh-Hant").length, 0, "原文語言不需要譯文");
    t.ok(Object.keys(content.TYPES).length >= 2, "型別詞彙不得為空（否則 register 全數 fail-closed、畫面整片消失）");
    t.ok(!content.TYPES.notice, "尚無渲染表面的型別不得先登記（登記了沒出口＝有容器沒內容）");

    // ② 覆蓋本體：逐則 × 逐語言 × 逐欄位
    var gaps = [];
    ds.forEach(function (d) {
      t.ok(!!content.TYPES[d.type], "種子 " + d.id + " 的型別「" + d.type + "」須已登記");
      langs.forEach(function (lg) {
        var need = content.needsLocale(d, lg), L = (d.locales && d.locales[lg]) || {};
        need.forEach(function (k) {
          var v = L[k];
          if (typeof v !== "string" || !v) { gaps.push(d.id + "." + k + " [" + lg + " 缺]"); return; }
          if (lg === "en" && content.CJK.test(v)) gaps.push(d.id + "." + k + " [en 仍是中文]");
          if (lg === "zh-Hans" && v === d.payload[k] && content.CJK.test(v)) {
            // 簡繁同形是合法的（U31 等值死鍵紀律），但整句同形通常代表忘了轉 ⇒ 只在含「繁體專有字」時報
            if (/[體臺灣獎勵儲樂會員遊戲競賽賺贈開關]/.test(v)) gaps.push(d.id + "." + k + " [zh-Hans 未轉簡]");
          }
        });
      });
    });
    t.equal(gaps.length, 0, "內容資料缺譯文 " + gaps.length + " 處：" + gaps.slice(0, 8).join("／")
      + "。補法＝在該 descriptor 的 locales.<lang> 補同名欄位（內容型是整句替換，不套字典的『只補差異字』慣例）");
  }
});

/*
 * 死碼收斂（維護軌 2026-08-24 00:00 窗·escape① 死碼維度）
 * ---------------------------------------------------------------------------
 * 掃到兩處「定義後在自己檔內被引用恰 1 次＝只有定義本身」的 born-dead 符號並移除：
 *   ① core/guild.js guildBrowser()：`var lbRow = leaderboard(wk,0,null).filter(...)[0]`
 *      算完就丟、公會卡只 render g.*；且每次瀏覽器渲染對每個公會白跑一次 leaderboard()。
 *   ② views/slot.js：`var STAGE_BG = {base:bg0,candle:bg1,cursed:bg2}`——場景背景切換的
 *      單一真相其實在 CSS（.ax-slot__stage / .mode-candle / .mode-cursed 掛 bg2/bg1/bg0），
 *      這份 JS 對照表零消費者且已 drift（JS 說 base→bg0/cursed→bg2；CSS 是 base→bg2/cursed→bg0
 *      ＝互換）＝典型「死碼還會誤導」。
 * 這條鎖守「死碼不回來」，且每項都帶反向錨證明「移除的是死的那份、不是功能本身」：
 *   guild：leaderboard() 仍在 guild.js 有 3 個真呼叫（面板/週榜/settle），只是 guildBrowser 內不再有；
 *   slot ：CSS 的 mode→bg 對照仍在（功能還在，只是不再有第二份 JS 副本）。
 * =========================================================================== */
selftest.register({
  id: "platform/dead-code-swept-guild-slot", group: "platform", env: "node", tier: "fast",
  title: "死碼收斂不回退：guildBrowser 不再對每個公會白跑 leaderboard()（lbRow 已除）、slot.js 不再持第二份 STAGE_BG（場景背景單一真相在 CSS）",
  run: function (t) {
    var fs2 = require("fs");
    var SRC = path.join(ROOT, "src");
    function rd(rel) { try { return fs2.readFileSync(path.join(SRC, rel), "utf8"); } catch (e) { return ""; } }

    // ① guild.js：guildBrowser 函式體內不得再呼叫 leaderboard()
    var guild = rd("core/guild.js");
    t.ok(guild.length > 400, "應讀到 core/guild.js（實測 " + guild.length + " 字元）"); // 反向錨：沒讀到別假裝通過
    var gbm = guild.match(/function\s+guildBrowser\s*\([^)]*\)\s*\{([\s\S]*?)\n\s{2}function\s/);
    t.ok(!!gbm, "應能切出 guildBrowser 函式體（切不出＝結構被改，鎖需同步更新）");
    var gbBody = gbm ? gbm[1] : guild;
    t.ok(!/lbRow/.test(gbBody), "guildBrowser 內不得再出現死變數 lbRow");
    t.ok(!/leaderboard\s*\(/.test(gbBody), "guildBrowser 不得再對每個公會白跑 leaderboard()（公會卡只需 g.* 欄位）");
    // 反向錨：leaderboard() 仍是真函式、guild.js 其他地方仍有真呼叫（證明移的是死呼叫不是函式本身）
    t.ok(/function\s+leaderboard\s*\(/.test(guild), "leaderboard() 仍應是 guild.js 的真函式（別把函式本身刪了）");
    var lbCalls = (guild.match(/leaderboard\s*\(/g) || []).length; // 含 1 次定義
    t.ok(lbCalls >= 4, "leaderboard 仍應有定義 + ≥3 個真呼叫（面板/週榜/結算）；實測 " + lbCalls + " ⇒ 誤刪真呼叫");

    // ② slot.js：不得再定義 STAGE_BG（死的 JS 副本）
    var slot = rd("views/slot.js");
    t.ok(slot.length > 400, "應讀到 views/slot.js（實測 " + slot.length + " 字元）");
    t.ok(!/STAGE_BG/.test(slot), "slot.js 不得再持第二份 STAGE_BG 對照表（場景背景單一真相在 CSS）");
    // 反向錨：CSS 的 mode→bg 對照仍在（功能還在，只是不再有 JS 副本）
    var css = fs2.readFileSync(path.join(SRC, "styles", "components.css"), "utf8");
    // 反向錨要收在「同一個宣告區塊內」（[^}]* 不得跨過 `}`），否則 .mode-candle 的 bg 被刪、
    // 正則仍會滑到 .mode-cursed 的 bg 而假通過＝§4「擾動打空」。並要求選擇器後緊接 `{`，
    // 使 .mode-candleX 這類改名不再被 \.mode-candle 子字串誤配。
    t.ok(/\.mode-candle\s*\{[^}]*shadow-ritual\/bg/.test(css) && /\.mode-cursed\s*\{[^}]*shadow-ritual\/bg/.test(css),
      "CSS 仍應是場景背景切換的單一真相（.mode-candle/.mode-cursed 各自宣告區塊內掛 bg）；否則是把功能刪了而非去重");
  }
});

/*
 * #123 商城目錄註冊表 + 受眾資格閘（平台軌 2026-08-24 08:00 窗）
 * ---------------------------------------------------------------------------
 * 這張卡的價值有兩層，兩層都會「壞掉而畫面看起來完全正常」，所以本鎖是**功能鎖**（真的載入
 * core/shop.js 跑它），不是原始碼掃描：
 *   ① 容器：目錄改為 register() 註冊表，連內建品項都走同一道門 ⇒ 驗證器若拒絕真實形狀會當場暴露。
 *      壞法＝內建走後門（例如直接 push 進 CATALOG），那之後只有外部註冊者被檢查＝雙軌。
 *   ② 資格閘有**兩個消費者**：逛目錄的 open()/status() 與真的派錢的 redeem()。
 *      壞法＝只擋 UI 不擋 redeem() ⇒ 直接呼叫 redeem() 就領走一筆沒資格的錢，
 *      而畫面上那張卡確實是鎖著的＝CLAUDE.md §4 點名的「修一半而看不出來」型態。
 *   ③ 「該藏還是該鎖」由受眾詞彙的 goal 欄位回答（release.js），不由 shop.js 自己判斷 kind。
 *      反向：非目標型（newcomer/active30/wagered7/season＝達不到或會退）必須隱藏，否則就違反
 *      #107 platform/audience-promo-hidden-not-greyed 的「灰掉＝預告一個玩家拿不到的獎」。
 * node 端沒有 DOM，所以只走 shop.js 的純邏輯面（register/status/redeem）；open() 需要 document，
 * 本鎖刻意不碰它——UI 那一面由 status() 的 items 陣列代理（cards 與 status 讀同一個 visible()）。
 * =========================================================================== */
selftest.register({
  id: "platform/shop-registry-and-audience-gate", group: "platform", env: "node", tier: "fast",
  title: "#123 商城：目錄為註冊表（內建品項走同一道驗證門）＋受眾閘在 UI 與派彩兩側都生效，且「該藏 vs 該鎖」由 release 的 goal 欄位裁決",
  run: function (t) {
    var fs2 = require("fs");
    var SHOP_F = path.join(ROOT, "src", "core", "shop.js");
    var RELEASE_CORE = require(path.join(ROOT, "src", "core", "release.js"));

    // 最小宿主：只給 shop.js 真正會碰的東西，其餘一律不給（給多了就不是在測 shop）
    function boot(vipLevel) {
      var store = {}, bonuses = [];
      var HL = {
        dom: {
          el: function () { return {}; }, money: function (v) { return "NT$" + v; },
          lsGet: function (k, d) { return store[k] === undefined ? d : JSON.parse(JSON.stringify(store[k])); },
          lsSet: function (k, v) { store[k] = JSON.parse(JSON.stringify(v)); },
          dayNum: function () { return 1000; }, weekNum: function () { return 200; }, dhm: function () { return "1h"; }
        },
        i18n: { t: function (k, d) { return d || k; } },
        vip: { status: function () { return { index: 0, level: vipLevel }; } },
        bonus: { add: function (a, m) { bonuses.push({ amount: a, source: m && m.source }); } },
        notify: { add: function () {} },
        // release.js 的 node 匯出是 CORE（不設 HL.release）⇒ 這裡補上瀏覽器同形出口。
        // matches / isGoalAudience 是**真實作**（單一詞彙）；只有讀玩家狀態的 ctx 與標籤是宿主側。
        release: {
          AUDIENCES: RELEASE_CORE.AUDIENCES, matches: RELEASE_CORE.matches,
          isGoalAudience: RELEASE_CORE.isGoalAudience,
          audienceCtx: function () { return { vipLevel: vipLevel }; },
          audienceLabelOf: function (a) { return a && a.kind ? "VIP " + a.arg + "+" : ""; }
        }
      };
      var sandbox = { HL: HL };
      // shop.js 是瀏覽器 IIFE（無 module.exports、尾端是 })(window)）⇒ 以 Function 把參數命名為 window 注入沙箱執行
      new Function("window", fs2.readFileSync(SHOP_F, "utf8"))(sandbox);
      return { shop: sandbox.HL.shop, store: store, bonuses: bonuses };
    }

    // 反向錨：宿主與詞彙都得是真的，否則下面每一條都是空跑
    t.isFn(RELEASE_CORE.isGoalAudience, "release.js 的 node 匯出須含 isGoalAudience（缺了本鎖就在空跑）");
    var lv1 = boot(1);
    t.isFn(lv1.shop && lv1.shop.register, "HL.shop 必須匯出 register()（#123 容器出口）");
    t.isFn(lv1.shop.catalog, "HL.shop 必須匯出 catalog() 供檢視目錄");

    // ① 容器：內建品項與外部註冊者走同一道門
    var builtin = lv1.shop.catalog();
    t.ok(builtin.length >= 6, "內建品項應全數通過驗證器進表（實測 " + builtin.length + " 筆；<6 代表驗證器拒絕了真實形狀）");
    t.equal(builtin.filter(function (i) { return i.id === "v-plat"; }).length, 1, "受眾閘品項 v-plat 應在目錄中");
    t.equal(lv1.shop.register({ id: "v-s", ic: "x", name: "dup", cost: 1, kind: "bonus", value: 1, period: "daily" }), false,
      "同 id 不得覆蓋既有品項（先註冊者為主）");
    t.equal(lv1.shop.register({ id: "z1", ic: "x", name: "b", cost: 1, kind: "weird", period: "daily" }), false, "未知 kind 須被拒");
    t.equal(lv1.shop.register({ id: "z2", ic: "x", name: "b", cost: 1, kind: "bonus", period: "daily" }), false,
      "bonus 缺 value 須被拒（否則 redeem 會派出 undefined）");
    t.equal(lv1.shop.register({ id: "z3", ic: "x", name: "b", cost: 1, kind: "mystery", range: [5], period: "daily" }), false,
      "mystery 的 range 不成對須被拒");
    t.equal(lv1.shop.register({ id: "z4", ic: "x", name: "b", cost: 1, kind: "gacha", tiers: [{ value: 1, weight: 0 }], period: "daily" }), false,
      "gacha 全零權重須被拒（pickTier 會退化）");
    t.equal(lv1.shop.register({ id: "z5", ic: "x", name: "b", cost: 1, kind: "bonus", value: 5, period: "hourly" }), false, "非法 period 須被拒");
    t.equal(lv1.shop.register({ id: "z6", ic: "x", name: "b", cost: 0, kind: "bonus", value: 5, period: "daily" }), false, "cost 須 > 0");
    t.equal(lv1.shop.register({ id: "ok1", ic: "T", name: "外部獎品", cost: 10, kind: "bonus", value: 100, period: "daily" }), true,
      "合法的外部註冊必須被接受（容器不能只讓內建進得來）");
    t.equal(lv1.shop.catalog().length, builtin.length + 1, "被接受的註冊必須真的進表");

    // ② 資格閘：未達標（Lv1）
    lv1.store.HL_SHOP = { points: 99999 };                 // 點數充足 ⇒ 唯一擋得住它的只能是資格
    var plat = lv1.shop.status().items.filter(function (i) { return i.id === "v-plat"; })[0];
    t.ok(!!plat, "vip 是目標型受眾 ⇒ 未達標時品項仍應可見（那是進度目標）");
    t.equal(plat.eligible, false, "未達標時 eligible 必須為 false");
    t.equal(plat.redeemable, false, "未達標時 redeemable 必須為 false（UI 側的閘）");
    t.ok(!!plat.audience, "鎖著的品項必須帶得出受眾標籤（否則玩家看不到解鎖條件）");
    t.equal(lv1.shop.redeem("v-plat"), 0, "**派彩側**必須擋下沒資格的兌換（只擋 UI＝直接呼叫 redeem() 就繞過）");
    t.equal(lv1.bonuses.length, 0, "被擋時不得有任何錢進獎金錢包");
    t.equal(Math.floor(lv1.store.HL_SHOP.points), 99999, "被擋時不得扣點（扣了點又沒發獎＝比漏發更糟）");

    // 達標（Lv16＝白金起點）
    var lv16 = boot(16);
    lv16.store.HL_SHOP = { points: 99999 };
    var plat16 = lv16.shop.status().items.filter(function (i) { return i.id === "v-plat"; })[0];
    t.equal(plat16.eligible, true, "達標後 eligible 必須為 true（閘不能兩邊都關＝那是把品項做死）");
    var got = lv16.shop.redeem("v-plat");
    t.equal(got, 4000, "達標後必須真的能兌換並派出面額（實測 " + got + "）");
    t.equal(lv16.bonuses.length, 1, "派彩必須恰好一筆進獎金錢包");
    t.equal(Math.floor(lv16.store.HL_SHOP.points), 99599, "須扣掉 400 點（cost 與扣點不得脫鉤）");
    t.equal(lv16.shop.redeem("v-plat"), 0, "同週期內第二次兌換須被冷卻擋下（資格閘不得蓋掉既有冷卻）");

    // ③ 「該藏 vs 該鎖」由 release 的 goal 欄位裁決
    t.equal(RELEASE_CORE.isGoalAudience({ kind: "vip", arg: 16 }), true, "vip＝只升不降 ⇒ 目標型（可見但鎖著）");
    t.equal(RELEASE_CORE.isGoalAudience({ kind: "newcomer", arg: 7 }), false, "newcomer 過了永遠回不去 ⇒ 非目標型（必須隱藏）");
    t.equal(RELEASE_CORE.isGoalAudience({ kind: "active30" }), false, "active30 是會退的滾動窗 ⇒ 非目標型");
    t.equal(RELEASE_CORE.isGoalAudience({ kind: "wagered7", arg: 1 }), false, "wagered7 是會退的滾動窗 ⇒ 非目標型");
    t.equal(RELEASE_CORE.isGoalAudience(null), false, "未宣告受眾 ⇒ 非目標型（保守）");
    t.equal(RELEASE_CORE.isGoalAudience({ kind: "no-such-kind" }), false, "未知 kind ⇒ 非目標型（fail-closed）");
    var lv1b = boot(1);
    lv1b.shop.register({ id: "nc1", ic: "N", name: "新手限定", cost: 10, kind: "bonus", value: 100, period: "daily",
      audience: { kind: "newcomer", arg: 7 } });
    t.equal(lv1b.shop.status().items.filter(function (i) { return i.id === "nc1"; }).length, 0,
      "非目標型且未達標的品項必須**隱藏**（比照 #107：灰掉＝預告一個玩家拿不到的獎）");
    t.equal(lv1b.shop.redeem("nc1"), 0, "隱藏的品項同樣不得能被兌換（隱藏是展示層，閘還是要在派彩側）");

    // ④ 零回歸：既有未宣告受眾的品項行為逐位不變
    ["v-s", "v-m", "mystery", "gacha", "v-l"].forEach(function (id) {
      var it = lv1.shop.status().items.filter(function (x) { return x.id === id; })[0];
      t.ok(!!it && it.eligible === true, "既有品項 " + id + " 未宣告受眾 ⇒ 必須恆為可換（零回歸）");
      t.equal(it.audience, "", "既有品項 " + id + " 不得憑空長出受眾標籤");
    });

    // ⑤ 原始碼側：不得在 shop.js 自刻受眾述詞（比照 platform/audience-single-vocabulary）
    var clean = noComments(fs2.readFileSync(SHOP_F, "utf8"));
    t.ok(/HL\.release\.matches\s*\(/.test(clean), "shop.js 必須以 HL.release.matches() 求受眾述詞");
    t.ok(/HL\.release\.audienceCtx\s*\(/.test(clean), "shop.js 必須用 HL.release.audienceCtx() 取上下文（不得自組第二份 ctx）");
    // 目錄只能有**一個寫入口**：register()。內建品項若改成直接 push 進 CATALOG，上面那條
    // 「內建 6 筆」仍會通過（筆數一樣）＝它對這種退化免疫 ⇒ 這裡用結構把它釘死。
    t.equal((clean.match(/CATALOG\.push/g) || []).length, 1,
      "CATALOG 只允許在 register() 內被 push（多於一處＝內建或某模組繞過了驗證門）");
    t.ok(/BUILTIN\.forEach\(register\)/.test(clean),
      "內建品項必須走 register()（改成直接 push 就變成內建走後門、只有外部註冊者被檢查）");
    t.ok(/HL\.release\.isGoalAudience\s*\(/.test(clean), "「該藏 vs 該鎖」必須問 isGoalAudience，不得在 shop.js 自行判斷 kind");
    t.equal(/HL\.vip\.status\s*\(\s*\)\s*\.\s*level/.test(clean), false, "shop.js 不得自行讀 VIP 等級判資格（那是第二份述詞）");
    t.equal(/kind\s*===\s*["'](newcomer|active30|wagered7|season)["']/.test(clean), false,
      "shop.js 不得逐一列舉受眾 kind 來決定藏/鎖（goal 欄位就是為了消掉這份清單）");
  }
});

/* ===================== 註冊表擴充點：壞 spec 不得進場 + 不得有無法證明的擴充點 =============
 *                                        （platform · 2026-08-26 20:00 窗 · 台帳審「功能」分類）
 * 【守什麼】本專案的招牌哲學是「容器先於內容」，全站現有 14 個有外部呼叫點的
 *   `HL.<ns>.register` 擴充點（另有 10 個只在檔內註冊的內部登記簿）。repo 內已**五次**
 *   記錄同一種缺陷：**容器做好了、接線沒補完**（P4 的 `HL.dock` 外部註冊者為零／07-31 台帳的
 *   `promoCal` 外部註冊者為零／#66 的 `HL.reveal`／`app-state.lossLimitRemaining` 零讀取者／
 *   #67 前身「已對外宣告但點進去是空的」）。⇒ CLAUDE.md §4「修一半而看不出來」在擴充層的形狀。
 *
 * 【本輪量到的事實（先講結論：登記簿層是健康的，這條鎖是把健康狀態釘住，不是修 bug）】
 *   14 個擴充點裡 **8 個做得到 node 行為探針**，全數 **fail-closed**（壞 spec 一律拒收、
 *   列舉器逐位不變）；`unproven`（既無外部註冊者、node 也 require 不到）**只有 `guild` 一個**。
 *   ⇒ 本輪沒有發現缺陷，但**沒有任何東西在守這個性質**——下一個新登記簿只要寫成
 *   「來者不拒」就會靜默上線（畫面完全正常，直到某天有人註冊了一筆壞 spec 才在渲染端炸）。
 *
 * 【為什麼主斷言是行為的，不是清單式的】2026-08-17 的 `SELFTEST_ORDER_DEBT` 棘輪栽在
 *   **用 grep 位置代理行為**（7 支誤報 4 支）。故這裡的第 ①②③ 條都是「真的呼叫 register 再看
 *   列舉器」，第 ④ 條才是覆蓋面清單，且附零成長基線 + 基線防腐（基線項若已被證明得到就必須移除，
 *   不許養一份過時的免罪名單）。第 ③ 條是**尺自身的反向錨**：拿一個「什麼都收」的假登記簿
 *   餵同一段檢測程式，必須被判 failClosed:false——否則這把尺可能整段空心而全綠。
 *
 * 【口徑與射程全文見 tests/registry-probe.js 檔頭】鎖與 `intel/tools/registry-gaps.js`
 *   共用那一支，不存在第二把尺（比照 i18n-key-scan.js 的紀律）。
 * ==========================================================================================*/
var regProbe = require(path.join(__dirname, "registry-probe.js"));
var REG_SCAN = regProbe.scan();   // 載入期就跑完（所有 require 落在與 run.js 同一階段，不改套組規模）

selftest.register({
  id: "platform/registry-extension-fail-closed", group: "platform", env: "node", tier: "fast",
  title: "註冊表擴充點：壞 spec 不得進場（行為探針 8 支）＋不得有無法證明的擴充點（零成長）",
  run: function (t) {
    /* ① 不空心：尺必須真的掃到東西。數字寫死＝射程縮小時會轉紅（正則寫壞的最常見後果就是掃到 0）。
     * ⚠️ 2026-08-31 20:00 窗**改守形狀、不放寬**：篩子改成「只認程式碼呼叫點、不認註解／字串裡的
     * 提及」後，`edge`／`guild`／`progressSrc`／`selftest` 四支（唯一命中都是自己檔頭的用法示範）
     * 正確地由 ① 移到 ②，於是 14／10 變成 10／14。**兩個分項數字都是篩子能搬動的**，
     * 唯一搬不動的是**總數**（同一批擴充點，只是換邊站）⇒ 主錨改鎖總數 ≥24，
     * 分項各自保留下限以防某一邊被掃成 0。 */
    t.ok(REG_SCAN.registries.length + REG_SCAN.internalOnly.length >= 24,
      "應掃到全部 register 擴充點（①+②，篩子搬不動的總數；2026-08-31 實測 24，現測 " +
      (REG_SCAN.registries.length + REG_SCAN.internalOnly.length) + "）");
    t.ok(REG_SCAN.registries.length >= 10,
      "應掃到全部有**程式碼**外部呼叫點的 register 擴充點（2026-08-31 實測 10，現測 " + REG_SCAN.registries.length + "）");
    t.ok(REG_SCAN.internalOnly.length >= 14,
      "應掃到全部無程式碼呼叫點的內部登記簿（2026-08-31 實測 14，現測 " + REG_SCAN.internalOnly.length + "）");
    t.ok(REG_SCAN.probed.length >= 8,
      "行為探針射程不得縮小（2026-08-26 實測 8 支：" + REG_SCAN.probed.join("／") + "，現測 " + REG_SCAN.probed.length + "）");

    // ② 主斷言（行為）：每一支探得到的登記簿，壞 spec 都不得讓列舉器變長
    t.equal(REG_SCAN.leaky.length, 0,
      "以下登記簿的 register() 收下了壞 spec（來者不拒＝驗證門形同不存在）：" + REG_SCAN.leaky.join("、"));
    REG_SCAN.probed.forEach(function (ns) {
      var r = REG_SCAN.registries.concat(REG_SCAN.internalOnly).filter(function (x) { return x.ns === ns; })[0];
      t.ok(r.probe.enumerators.length > 0,
        "HL." + ns + " 必須有列舉器（ids/list/all/count/keys 之一），否則「註冊進去了沒有」無從斷言");
    });

    // ③ 反向錨：同一段檢測程式餵一個「什麼都收」的假登記簿，必須抓到 5 筆漏
    //    （沒有這條，②在正則/列舉器判定寫壞時會靜默全綠）
    var permissive = {
      _a: [],
      register: function (spec) { this._a.push(spec); return true; },
      ids: function () { return this._a; }
    };
    var anchor = regProbe.leakCheck(permissive);
    t.equal(anchor.failClosed, false, "反向錨：來者不拒的假登記簿必須被判 failClosed:false（否則這把尺是空心的）");
    t.equal(anchor.leaks.length, regProbe.BAD_SPECS.length,
      "反向錨：全部 " + regProbe.BAD_SPECS.length + " 筆壞 spec 都應被記為漏（實測 " + anchor.leaks.length + "）");
    var strict = { register: function () { return false; }, ids: function () { return []; } };
    t.equal(regProbe.leakCheck(strict).failClosed, true, "反向錨另一向：一律拒收的登記簿必須被判 fail-closed");

    // ④ 覆蓋面棘輪（零成長）＋基線防腐
    REG_SCAN.unproven.forEach(function (ns) {
      t.ok(REG_SCAN.baseline.indexOf(ns) >= 0,
        "HL." + ns + " 的擴充點在兩個環境裡都無法證明（無外部註冊者、node 也 require 不到）＝新的無法證明擴充點，" +
        "請補一個外部註冊者，或比照 #50/#54/#65 把純函式區以 module.exports 暴露");
    });
    REG_SCAN.baseline.forEach(function (ns) {
      t.ok(REG_SCAN.unproven.indexOf(ns) >= 0,
        "基線項 HL." + ns + " 已經證明得到了 ⇒ 必須從 UNPROVEN_BASELINE 移除（不許養過時的免罪名單）");
    });

    // ⑤ 沙箱自保（2026-08-29 20:00 窗）：unproven 歸零現在有一部分是靠 vm 沙箱撐的，
    //    沙箱若靜默壞掉（首屏新增一支會拋的 script），`sandboxVerifiable` 會整排變 false 而
    //    ④ 立刻轉紅——但錯誤訊息會指向「新的無法證明擴充點」，把人帶錯方向。這條先把真因喊出來。
    t.ok(REG_SCAN.sandbox.ready, "vm 沙箱必須啟動得起來（unproven 判定有一部分靠它）");
    t.equal(REG_SCAN.sandbox.failed.length, 0,
      "首屏核心層 " + REG_SCAN.sandbox.loaded + " 支必須全部能在沙箱裡跑起來，實測失敗：" + REG_SCAN.sandbox.failed.join("；"));
    t.ok(REG_SCAN.sandbox.loaded >= 70,
      "沙箱射程不得縮小（2026-08-29 實測 76 支首屏核心，現測 " + REG_SCAN.sandbox.loaded + "）");
  }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * 註冊表呼叫點「只認呼叫、不認提及」（2026-08-31 20:00 窗）
 * ------------------------------------------------------------------------------------------
 * 【這條鎖治什麼】`registry-probe.js` 檔頭從建檔第一天就寫著「口徑沿用專案硬規則**只認呼叫、
 *   不認提及**」，但**實作從來沒有做到**：它直接對整份原始碼跑 `HL.<ns>.register(` 正則，
 *   於是註解與字串裡的提及一律被算成呼叫點。實測污染 10 個命名空間、共 17 筆非程式碼命中。
 *   造成的兩種損害，都不是「數字醜一點」而已：
 *   ① **台帳讀數直接錯**，而且錯的那幾筆剛好是我們拿來當「零漂移證據」的：
 *      `i18n/en.js:47`（註解）把 `HL.econCfg` 報成 15 個外部註冊者（真值 14）；
 *      `core/reports.js:726`（字串）讓 `HL.achievements` 多出一個**從未註冊過任何成就**的註冊者檔
 *      （5→3）；`data/games-loader.js:4`（註解）同樣讓 `HL.games` 多一個（它讀 registry.json 注入
 *      各遊戲檔、註冊是遊戲檔自己做的，它本人一次都沒呼叫）。這三筆已在 08-31 14:00 窗被抄進
 *      CONTROL 船長區與台帳 evidence ⇒ **我們用來取代手量的那把尺，犯的是與手量同一類的錯**。
 *   ② **分類邊界由註解決定**：`sites.length > 0` 是 ①（有呼叫點）／②（檔內登記簿）的分水嶺，
 *      而 `edge`／`guild`／`progressSrc`／`selftest` 四支的**唯一**命中都是自己檔頭的用法示範
 *      ⇒ 它們被歸進①「壞掉會在行為上現形」，真實 code 呼叫點是 0。而 `unproven` 只算 ① 的成員
 *      ⇒ **把一句檔頭註解整理掉，就等於把一支擴充點移出棘輪射程，且所有既有斷言仍然全綠。**
 *   ⇒ CLAUDE.md §4「修一半而看不出來」在**量測層**的一例，與 08-31 14:00 窗〔功能／中央掛鉤〕
 *     那份「數字對、成員錯」的名冊同型（那次是兩個相反方向的錯互相抵銷）。
 *
 * 【為什麼主斷言打在 fixture 上而不是打在真實檔案上】「沒有任何非程式碼命中被算進去」這件事
 *   在篩子修好之後是**由構造成立**的（scanStatic 只採 mask===0）⇒ 拿真實檔案去斷言它等於恆真，
 *   正是本專案反覆記過的空心鎖。所以主斷言改成**餵篩子一份 fixture**：裡面同時放三種提及
 *   （`//` 行註解／`/* *\/` 區塊註解／字串）與**一個真呼叫**，要求它恰好回 1 個 code 命中。
 *   三種提及各自是**獨立的失敗模式**（只擋行註解的半修版會被字串那筆抓到，反之亦然）。
 *
 * 【反向錨】① 篩子必須答得出「有」（真呼叫那筆要在 code 裡）也答得出「沒有」（純提及回 0）；
 *   ② 全庫非程式碼命中總數 ≥15（今天 17）——若有人把篩子改回原始正則，`docMentions` 會歸零而這條轉紅；
 *   ③ 分類的結構一致性：① 的每一支都必須有 ≥1 個 code 呼叫點、② 的每一支都必須是 0；
 *   ④ 四支由本輪從①移到②的擴充點必須**仍然證明得到**（node 或沙箱任一）——它們離開了
 *      `unproven` 的射程，這條就是補上的那張網（詳見 registry-probe.js 內的取捨說明與已開的卡）。
 * ==========================================================================================*/
selftest.register({
  id: "platform/registry-sites-code-only", group: "platform", env: "node", tier: "fast",
  title: "註冊表呼叫點只認程式碼、不認註解／字串裡的提及（分類邊界不得由一句註解決定）",
  run: function (t) {
    // ── ① 主斷言：fixture 打篩子本身（三種提及 + 一個真呼叫）
    var FIX = [
      "// 用法：HL.zz.register({ id: \"x\" })            ← 行註解裡的提及",
      "/* 也可以 HL.zz.register(spec) 一行上架         ← 區塊註解裡的提及 */",
      "var doc = \"HL.zz.register(\";                    // 字串裡的提及",
      "HL.zz.register({ id: \"real\", label: \"真呼叫\" }); // ← 唯一應被採計的一筆"
    ].join("\n");
    var got = regProbe.registerSitesIn(FIX, "zz");
    t.equal(got.code.length, 1, "fixture 內只有一個真呼叫，篩子卻採計了 " + got.code.length + " 筆");
    t.equal(got.code[0], 4, "採計到的那一筆必須是第 4 行（真呼叫），實測第 " + got.code[0] + " 行");
    t.equal(got.doc.length, 3, "三筆提及都必須被歸為 doc（實測 " + got.doc.length + "）");
    var kinds = got.doc.map(function (d) { return d.kind; }).sort().join(",");
    t.equal(kinds, "comment,comment,string",
      "三種提及要被正確分型（行註解/區塊註解/字串），實測：" + kinds);

    // ── ② 反向錨：純提及必須回 0（篩子答得出「沒有」，不是一律回 0 也不是一律回全部）
    var only = regProbe.registerSitesIn("// HL.zz.register(x)\nvar s = 'HL.zz.register(';", "zz");
    t.equal(only.code.length, 0, "全是提及時仍採計到 " + only.code.length + " 筆呼叫（篩子形同不存在）");
    t.equal(only.doc.length, 2, "全是提及時應回報 2 筆 doc（實測 " + only.doc.length + "）");
    // 反向錨另一向：不得把真呼叫也誤判成提及（否則「回 0」是靠恆假拿到的）
    t.equal(regProbe.registerSitesIn("HL.zz.register({});", "zz").code.length, 1,
      "乾淨的真呼叫必須被採計（篩子不得恆判為提及）");

    // ── ③ 活體錨：全庫非程式碼命中總數（改回原始正則 ⇒ docMentions 歸零 ⇒ 本條轉紅）
    var all = REG_SCAN.registries.concat(REG_SCAN.internalOnly);
    var docTotal = all.reduce(function (a, x) { return a + (x.docMentions || 0); }, 0);
    t.ok(docTotal >= 15,
      "全庫非程式碼命中總數不得歸零（2026-08-31 實測 17，現測 " + docTotal + "）＝篩子仍在分辨兩者");

    // ── ④ 結構一致性：①／② 的分水嶺必須就是「有沒有程式碼呼叫點」
    REG_SCAN.registries.forEach(function (r) {
      t.ok(r.total >= 1, "HL." + r.ns + " 落在①卻沒有任何程式碼呼叫點（分類邊界被非程式碼命中決定）");
    });
    REG_SCAN.internalOnly.forEach(function (r) {
      t.equal(r.external, 0, "HL." + r.ns + " 落在②卻有外部呼叫點");
    });

    // ── ⑤ 本輪從①移到②的四支：離開了 unproven 射程，這裡補上「仍然證明得到」的網
    ["edge", "guild", "progressSrc", "selftest"].forEach(function (ns) {
      var r = all.filter(function (x) { return x.ns === ns; })[0];
      t.ok(!!r, "HL." + ns + " 必須仍在掃描結果中（射程縮小）");
      t.equal(r.total === undefined ? 0 : r.total, 0,
        "HL." + ns + " 的唯一命中應是自己檔頭的用法示範（若真的長出程式碼呼叫點，請改本條與台帳讀數）");
      t.ok(r.docMentions >= 1, "HL." + ns + " 的檔頭提及不見了 ⇒ 上面那句話已過期，請複查分類");
      t.ok(r.nodeVerifiable || r.sandboxVerifiable,
        "HL." + ns + " 兩個環境都證明不到了，而它已不在 unproven 射程內 ⇒ 會靜默失守");
    });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * #135 `HL.guild.register`：公會目錄註冊得進去嗎——現在有東西答得出來了
 * ------------------------------------------------------------------------------------------
 * 【這條鎖買的是什麼】`HL.guild` 是全庫 14 個「有外部呼叫點的擴充點」裡唯一長期**兩個環境都
 *   無法證明**的一個（`core/guild.js` 頂層取用 `window` ⇒ node 不可 require；外部註冊者 0 ⇒
 *   壞掉不會在行為上現形）。#135 卡上據實寫過「沒有發現它真的壞掉，這張卡買的是**以後壞掉會被抓到**」。
 *
 * 【為什麼是今天才立得起來 · 也是本輪真正的發現】#135 把脫離之道寫成「加 `module.exports`」，
 *   那是**首屏位元組**，撞 [P-FS] 的 3-byte 邊界 ⇒ 卡被標成「卡在 #118」，連續四輪台帳審照抄。
 *   但那個成本模型在同一天（2026-08-29）14:00 窗就過期了：#145 為了驗「同 id 再註冊」建了 vm 沙箱，
 *   而沙箱裡的 `window` 是我們自己造的物件 ⇒ 「頂層取用 window」不再是障礙。
 *   本輪把那個沙箱一般化進 `registry-probe.js`（首屏核心 76 支、0 失敗），#135 需要的首屏位元組＝**0**。
 *   ⭐ 教訓：**「阻塞事實」會過期，而且會往「成本被高估」的方向過期**——新工具落地時要回頭問
 *   「它讓哪些卡的前置條件失效了」。（08-24 記過反方向的那一則：零首屏成本 ≠ 不加 script。）
 *
 * 【立鎖自問（CLAUDE.md §4）：這條不變量有沒有反向？有沒有第二個消費者？】
 *   · 反向①＝**壞 spec 也進得去**（(d)）：沒有它，「註冊得進去」會退化成「什麼都進得去」。
 *   · 反向②＝**同 id 再註冊**（(e)）：`register()` 有 `|| byId[spec.id]` 守衛＝**先到先得**，
 *     與 `HL.games`（#145 後＝疊上本次宣告的欄位）與 `HL.promoCal`（整筆熱替換）**三者語意各不相同、
 *     且沒有任何一處宣告過**。這裡把 guild 的那一種釘住：日後有人為了「統一」把它改成覆蓋，
 *     公會目錄就會被第二次註冊悄悄改寫而畫面完全正常。
 *   · 第二個消費者＝(c)：只斷言 `ids()` 變長是不夠的——`ids()` 可能是一份與玩家看到的目錄
 *     平行的裝飾性清單。(c) 直接走玩家路徑（`join()` → `status().guild`）證明**新註冊的公會
 *     真的加得進去**，並用結構錨釘住 `guildBrowser` 讀的就是同一個 `GUILDS`。
 * ═════════════════════════════════════════════════════════════════════════════════════════ */
var GUILD_SRC = path.join(ROOT, "src", "core", "guild.js");

selftest.register({
  id: "platform/guild-registry-provable", group: "platform", env: "node", tier: "fast",
  title: "#135 公會登錄表：註冊得進去、進去了玩家加得到、壞 spec 進不去、同 id 再註冊為先到先得",
  run: function (t) {
    // 專屬的一份沙箱：本鎖會 register/join，不能污染 scan() 共用的那份唯讀快取
    var sb = regProbe.freshSandbox();
    t.equal(sb.failed.length, 0, "沙箱應零載入失敗，實測：" + sb.failed.join("；"));
    var G = sb.HL && sb.HL.guild;
    if (!G) { t.ok(false, "沙箱裡取不到 HL.guild（本鎖失去對象）"); return; }

    /* ── (a) 規模自保：沙箱沒載成功時不得空掃假綠 ─────────────────────────────── */
    var seeds = G.ids();
    t.equal(seeds.length, 6,
      "種子公會應為 6（權威口徑由 2026-08-18 台帳以 brace matching 複驗定案），實測 " + seeds.length + "：" + seeds.join("／"));

    /* ── (b) 本體：外部註冊一個公會，必須進得了登錄表 ─────────────────────────── */
    G.register({ id: "__probe_guild__", name: "探針公會", motto: "由測項註冊", icon: "🧪", tag: "PROBE" });
    t.ok(G.ids().indexOf("__probe_guild__") >= 0, "外部註冊的公會必須出現在 ids()");
    t.equal(G.status().count, 7, "status().count 應隨之成長為 7（count 直接讀 GUILDS.length）");
    t.equal(G.status().totalGuilds, 7, "週榜也必須看得到它（totalGuilds 來自 leaderboard(GUILDS)）");

    /* ── (c) 消費端錨：玩家路徑真的走得通（不只是 ids() 變長）───────────────────
     * 這一面是本鎖的重點：`ids()` 若是一份平行的裝飾清單，(b) 會全綠而玩家什麼都看不到。 */
    t.equal(G.join("__probe_guild__"), true, "玩家必須加得進新註冊的公會");
    var st = G.status();
    t.equal(st.joined, true, "加入後 status().joined 應為 true");
    t.equal(st.guild && st.guild.name, "探針公會", "status().guild 必須解析到新註冊的那一筆（byId 有登記）");
    var src = fs.readFileSync(GUILD_SRC, "utf8");
    t.ok(/function guildBrowser[\s\S]{0,400}GUILDS\.forEach/.test(src),
      "結構錨：玩家看到的公會目錄 guildBrowser() 必須逐一走 GUILDS（與 ids()/leaderboard 同一個陣列）");

    /* ── (d) 反向錨①：壞 spec 不得進場（否則「註冊得進去」退化成「什麼都進得去」）── */
    var n = G.ids().length;
    [null, undefined, {}, { name: "無 id" }, { icon: "🚫" }].forEach(function (bad) {
      try { G.register(bad); } catch (e) { /* 拋也算拒收，但不得改變長度 */ }
    });
    t.equal(G.ids().length, n, "全部壞 spec 都不得讓公會目錄變長（缺 id 一律拒收）");

    /* ── (e) 反向錨②：同 id 再註冊＝先到先得（釘住語意，不是釘住實作）─────────── */
    G.register({ id: "__probe_guild__", name: "改名了", icon: "🔁" });
    t.equal(G.status().guild.name, "探針公會",
      "guild 的再註冊語意是**先到先得**：第二次註冊必須完全無作用。" +
      "（與 HL.games 的『疊上本次宣告的欄位』#145、HL.promoCal 的『整筆熱替換』刻意不同 ⇒ 改動任一種都要先想清楚）");
    t.equal(G.ids().filter(function (x) { return x === "__probe_guild__"; }).length, 1,
      "再註冊不得讓同 id 長出第二筆");
    t.ok(/byId\[\s*spec\.id\s*\]\s*\)\s*return/.test(src),
      "結構錨：先到先得由 register() 的 `|| byId[spec.id]` 守衛實現（守衛被拿掉時本鎖要指得出位置）");

    /* ── (f) 棘輪錨：guild 已脫離 unproven 免罪名單，不許再被加回去 ─────────────── */
    t.ok(regProbe.UNPROVEN_BASELINE.indexOf("guild") < 0,
      "guild 已可證明 ⇒ 不得再出現在 UNPROVEN_BASELINE（免罪名單只能縮不能長）");
  }
});

// ── #52 promoCal opt-in 狀態層的行為鎖 ───────────────────────────────────────
/* 為什麼這條鎖現在才立（2026-08-27 平台軌·08:00 窗台帳審「活動」時查獲）：
 *   `core/promo-cal.js` 的 opt-in 層（#52）落地至今**零測項覆蓋**——全庫 grep
 *   `optIn|joinedToday|canJoin` 在 `tests/` 的命中只有一筆，且屬 vsslot 的入座判斷、與本層無關。
 *   而這一層裡有一條**真正的經濟不變量**，它目前**只由一行註解守著**：
 *       leave() 保留 `day` 記錄 ⇒「退出」不繞過 `optInDaily` 的每日一次限制。
 *   把 leave() 「簡化」成 `delete o[id]` 的話，玩家可 join→leave→join 無限續期
 *   `progress-src.js` 的 #49 限時經驗加速（`optInTtlMs: 6h`／`mult: 1.5×`）⇒ 賽季階梯（真獎勵）被刷穿，
 *   而**畫面每一格都是正常的**：日曆照常顯示、加成照常倒數、node 全綠、console 零錯誤。
 *   ⇒ 這正是 CLAUDE.md §4 記載的「修一半而看不出來」家族（第 ⑤ 例：不變量只寫在註解裡，沒有第二個消費者去打它）。
 *
 * 為什麼用 shim 實跑真檔而不是 grep 源碼：
 *   源碼級鎖只能證明「leave() 裡有寫 day」，證不了「限制真的擋得住」。本鎖比照 #107 ④ 的做法，
 *   以最小 shim 把**真的** `promo-cal.js` 載進來跑 join/leave/canJoin，驗的即玩的。
 *   `Date.now()` 不 mock——時間流逝改以「直接把已存記錄的起算時間往前推」模擬（確定性、零等待）。
 *   ⚠️ 刻意**不 skip**：shim 載不起來就 FAIL（skip 會讓「shim 過時」與「不變量壞掉」在輸出上同形）。 */
var OPTIN_KEY = "HL_PROMO_OPTIN";
selftest.register({
  id: "platform/promo-optin-invariants", group: "platform", env: "node", tier: "fast",
  title: "#52 opt-in 五條紀律：未宣告零行為／重複加入不得延長／退出不得繞過每日一次／跨日必須解除／TTL 逾時自動失效",
  run: function (t) {
    var store = {}, HL = {}, DAY = 20000;
    var doc = { readyState: "complete", addEventListener: function () {}, createTextNode: function (s) { return { t: s }; } };
    var win = { HL: HL, document: doc, setTimeout: function () {}, setInterval: function () { return 0; },
                clearInterval: function () {}, addEventListener: function () {} };
    win.window = win;
    HL.dom = {
      el: function (tag, attrs, kids) { return { tag: tag, attrs: attrs || {}, kids: kids || [] }; },
      money: function (n) { return "$" + n; }, dhm: function (ms) { return Math.round(ms / 3600000) + "h"; },
      lsGet: function (k, d) { return store[k] === undefined ? d : store[k]; },
      lsSet: function (k, v) { store[k] = v; },
      dayNum: function () { return DAY; }
    };
    HL.ui = { toast: function () {}, modal: function () {}, kv: function () { return {}; }, closeTop: function () {} };
    HL.games = { byId: function () { return null; }, title: function (g) { return g.id; }, launch: function () {} };
    HL.bonus = { add: function () {} }; HL.notify = { add: function () {} };

    var loadErr = null;
    try { new Function("window", "document", "HL", fs.readFileSync(path.join(SRC_DIR, "core", "promo-cal.js"), "utf8"))(win, doc, HL); }
    catch (e) { loadErr = e.message; }
    t.equal(loadErr, null, "promo-cal.js 必須能以 shim 載入（載不起來＝shim 已過時，請修 shim 而非略過本鎖）：" + loadErr);
    if (loadErr) return;
    var P = HL.promoCal;
    var TTL = 6 * 3600000;

    P.register({ id: "z-plain", name: "x", sched: "always" });                                        // 未宣告 optIn
    P.register({ id: "z-daily", name: "x", sched: "always", optIn: true, optInDaily: true, optInTtlMs: TTL });
    P.register({ id: "z-nottl", name: "x", sched: "always", optIn: true });                            // 有 optIn、無 TTL、無 daily

    // ① 零回歸：未宣告 optIn 的活動不得有任何 opt-in 行為（#52 對既有 spec 的相容承諾）
    t.equal(P.canJoin("z-plain"), false, "未宣告 optIn 的活動不得可加入");
    t.equal(P.join("z-plain"), false, "未宣告 optIn 的活動 join() 必須回 false");
    t.equal(P.isJoined("z-plain"), false, "未宣告 optIn 的活動恆為未加入");
    t.equal(P.canJoin("z-nope"), false, "未註冊的 id 不得可加入（拼錯不會變成一個誰都能加入的活動）");

    // ② 正常加入
    t.equal(P.canJoin("z-daily"), true, "宣告 optIn 且今日未加入者應可加入");
    t.equal(P.join("z-daily"), true, "join() 應成功");
    t.equal(P.isJoined("z-daily"), true, "加入後應立即生效");
    var at1 = P.joinedAt("z-daily");
    t.ok(at1 > 0, "joinedAt 應回傳起算時間，實測 " + at1);

    // ③ 重複加入不得延長（防「再按一次加入」把 6h 重新計時＝加成無限續期）
    t.equal(P.canJoin("z-daily"), false, "已加入者不得再次加入");
    t.equal(P.join("z-daily"), false, "重複 join() 必須回 false");
    t.equal(P.joinedAt("z-daily"), at1, "重複 join 不得改寫起算時間（否則按兩下就重新計時 6 小時）");

    // ④ ⭐ 核心：退出不得繞過每日一次（本輪立鎖前，這條只由 promo-cal.js 的一行註解守著）
    t.equal(P.leave("z-daily"), true, "leave() 應成功");
    t.equal(P.isJoined("z-daily"), false, "退出後應立即失去加成");
    t.equal(P.canJoin("z-daily"), false,
      "同一天退出後不得再加入——否則 join→leave→join 可無限續期 #49 的 1.5× 經驗加速（賽季階梯被刷穿，畫面完全正常）");

    // ⑤ 跨日必須解除（限制是「每日一次」，不是永久封鎖——鎖死同樣是壞掉）
    DAY += 1;
    t.equal(P.canJoin("z-daily"), true, "跨日後每日限制必須解除（否則玩家一輩子只能加入一次）");

    // ⑥ TTL 逾時自動失效，且不靠任何清理排程；到期也不等於重置每日一次
    t.equal(P.join("z-daily"), true, "新的一天應可再次加入");
    store[OPTIN_KEY]["z-daily"].at = Date.now() - (TTL + 3600000);   // 模擬時間流逝：起算時間往前推 7h
    t.equal(P.joinedAt("z-daily"), 0, "逾 optInTtlMs 後 joinedAt 必須回 0（自動失效，不需任何清理呼叫）");
    t.equal(P.isJoined("z-daily"), false, "逾時後不得仍算加入中");
    t.equal(P.canJoin("z-daily"), false, "TTL 到期不等於重置每日一次（否則等 6 小時就能當天再刷一輪）");

    // ⑦ 零回歸另一半：未宣告 optInTtlMs 者不得被任何隱含期限清掉
    t.equal(P.join("z-nottl"), true, "無 daily 限制者應可加入");
    store[OPTIN_KEY]["z-nottl"].at = Date.now() - 365 * 86400000;
    t.ok(P.joinedAt("z-nottl") > 0, "未宣告 optInTtlMs 者不得自動到期（未宣告＝不到期，非預設期限）");

    /* ⑧ 尺自身的反向錨（比照 registry-probe 的做法）：
     *    把同一段「探針」餵給一個**故意寫壞的**假實作，必須被判「限制失效」。
     *    沒有這條，④ 一旦在斷言或探針寫壞時會靜默全綠——本專案 SELFTEST_ORDER_DEBT 棘輪
     *    當年就是栽在「尺本身是空心的」。 */
    function probeDailyLimitHolds(api, id) {   // 回傳 true ＝「退出後當日不得再加入」這條成立
      api.join(id); api.leave(id);
      return api.canJoin(id) === false;
    }
    function fakeOptIn(brokenLeave) {
      var s = {}, day = 7;
      return {
        canJoin: function (id) { return !(s[id] && s[id].at) && !(s[id] && s[id].day === day); },
        join: function (id) { if (!this.canJoin(id)) return false; s[id] = { at: 1, day: day }; return true; },
        leave: function (id) {
          if (!s[id]) return false;
          if (brokenLeave) delete s[id];                       // ← 正是本鎖要防的那個「簡化」
          else s[id] = { at: 0, day: s[id].day };
          return true;
        }
      };
    }
    t.equal(probeDailyLimitHolds(fakeOptIn(false), "q"), true,
      "反向錨：保留 day 的正確實作必須被探針判為『限制成立』");
    t.equal(probeDailyLimitHolds(fakeOptIn(true), "q"), false,
      "反向錨：leave 直接 delete 記錄的壞實作必須被探針判為『限制失效』（否則這把尺是空心的）");
    DAY += 1;
    t.equal(probeDailyLimitHolds(P, "z-daily"), true,
      "同一段探針對真檔必須判『限制成立』（尺與被測物用的是同一把）");
  }
});

/*
 * 站別命名空間的儲存出口白名單（platform · 2026-08-27 14:00 窗 · 資安分類審計產出）
 * ---------------------------------------------------------------------------
 * 這條鎖守的是 CLAUDE.md §4 那句「真站與假站的經濟/留存/JP/notify/fair/ledger 資料**平行宇宙隔離**」
 * 真正的機械前提：**所有玩家存檔都必須經 `HL.dom.lsGet/lsSet` 這個唯一出口**，
 * 由它把 `HL.site.ns()`（live 回 `"r:"`、demo 回 `""`）套成 key 前綴。
 *
 * 為什麼需要立這條（§4「修一半而看不出來」的第 ⑥ 例·新漏法＝**每個檔各自守自己**）：
 *   本輪審資安分類時實測，全庫對「不得直接碰 localStorage」的防守**只有四筆、且全是單檔自守**——
 *   `core/rakeboost.js:351`（自己的 selftest 掃自己的 src）／`tests` 內對 `rbac.js`／`release.js`／
 *   `referral-core.js` 的逐檔斷言。**沒有任何一條在問「全庫現在有幾支在繞過這個出口」。**
 *   ⇒ 明天新增的任何一支經濟模組只要寫 `localStorage.setItem(...)`，它的資料就**同時屬於真站與假站**：
 *      真站（營運健檢）的餘額/流水/帳本會混進假站那份慷慨的假資料，而**兩邊畫面都完全正常**
 *      （單一站別的使用者永遠看不到異常，只有切站才會發現存檔跟著走），node 也全綠。
 *      這正是本專案反覆踩的形狀：**功能看起來正常，只有寫測項去打自己才會發現。**
 *
 * 白名單的語意：這 10 支**刻意跨站共用**，不是漏網——
 *   ① `core/dom.js`＝套前綴的那個出口本身；② `core/site-mode.js`＝站別旗標 `HL_SITE_MODE` 自己，
 *   **必須用原生 localStorage 讀寫**（若它也走前綴，切到 live 後就讀不回自己＝自我指涉陷阱，見該檔檔頭）；
 *   ③ `core/selftest.js`＝測試框架的 tmpKey 清理（同時清有前綴與無前綴兩份）；
 *   ④ `core/config.js`(HL_DEMO 開機旗標)／`core/fav.js`(收藏)／`core/game-settings.js`(ax:gset 極速/動效/熱鍵)／
 *      `core/i18n.js`(語言)／`data/games.js`(最近遊玩)／`layout/app-shell.js`(側欄收合)／`layout/dock.js`(佈局座標)
 *      ＝**UI 偏好**，CLAUDE.md §4 明列「不走此出口＝兩站共用」。
 *   ⇒ 要新增白名單成員前，先回答一句：**它存的是 UI 偏好，還是玩家的錢/進度？** 後者一律走 HL.dom。
 *
 * 反向錨（沒有這些，本鎖會在「前綴其實沒被套上」時照樣全綠）：
 *   (a) 偵測器自身要能咬得動（合成樣本必須被抓到，且不得把 `HL.dom.lsSet(` 誤判成直接存取）；
 *   (b) `dom.js` 的 `nsKey` 必須真的向 `HL.site.ns()` 求前綴，且 lsGet/lsSet 真的經過它；
 *   (c) `site-mode.js` **實跑真檔**（以 stub global 注入，不是掃字串）：demo 回 ""、live 回 "r:"、
 *       旗標本身以原生 key 讀寫、切站寫旗標後 reload。
 */
selftest.register({
  id: "platform/site-ns-storage-allowlist", group: "platform", env: "node", tier: "fast",
  title: "站別隔離：只有 UI 偏好白名單(10 支)可直接碰 localStorage，其餘玩家存檔一律走 HL.dom.lsGet/lsSet（繞過＝真站假站經濟資料靜默共用而畫面全正常）",
  run: function (t) {
    var SRC = path.join(ROOT, "src");
    function strip(s) { return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, ""); }
    // 只認**真的成員存取**：getItem/setItem/removeItem/clear/key 或 索引存取。
    // 刻意不認裸 `localStorage`（註解與 `/localStorage/` 正則字面量會誤報；rakeboost.js 的自守測項即此形）。
    var RAW = /localStorage\s*(?:\.\s*(?:getItem|setItem|removeItem|clear|key)\b|\[)/;

    /* (a) 偵測器自身的反向錨——沒有這段，寫壞正則會讓本鎖「掃不到＝完美通過」 */
    t.ok(RAW.test('localStorage.setItem(K, "1")'), "偵測器必須抓得到 setItem 直接存取");
    t.ok(RAW.test('global.localStorage.getItem(KEY)'), "偵測器必須抓得到 global.localStorage.getItem");
    t.ok(RAW.test('localStorage["x"]'), "偵測器必須抓得到索引存取");
    t.equal(RAW.test("HL.dom.lsSet(KEY, v)"), false, "走出口的寫法不得被誤判為直接存取");
    t.equal(RAW.test(strip("// 純前端 localStorage 持久化")), false, "註解提及不得被誤判（strip 後應為空）");

    /* (b) 全庫掃描：檔案集合必須逐支等於白名單 */
    var ALLOW = [
      "core/config.js", "core/dom.js", "core/fav.js", "core/game-settings.js", "core/i18n.js",
      "core/selftest.js", "core/site-mode.js", "data/games.js", "layout/app-shell.js", "layout/dock.js"
    ].sort();
    var found = [];
    (function walk(d) {
      fs.readdirSync(d).forEach(function (f) {
        var p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) return walk(p);
        if (!/\.js$/.test(f)) return;
        if (RAW.test(strip(fs.readFileSync(p, "utf8")))) {
          found.push(path.relative(SRC, p).split(path.sep).join("/"));
        }
      });
    })(SRC);
    found.sort();
    var extra = found.filter(function (f) { return ALLOW.indexOf(f) < 0; });
    var gone = ALLOW.filter(function (f) { return found.indexOf(f) < 0; });
    t.equal(extra.join(","), "",
      "有檔繞過站別命名空間直接碰 localStorage：[" + extra.join(", ") + "]。" +
      "存玩家的錢/進度請改走 HL.dom.lsGet/lsSet（否則真站與假站共用同一份存檔，而兩邊畫面都正常）；" +
      "確實是 UI 偏好才可加進本鎖白名單。");
    t.equal(gone.join(","), "",
      "白名單有成員已不再碰 localStorage（＝豁免過期，請縮小白名單）：[" + gone.join(", ") + "]");

    /* (c) 反向錨：出口真的套前綴 —— 白名單全綠但前綴沒套上，隔離一樣是假的 */
    var dom = strip(fs.readFileSync(path.join(SRC, "core", "dom.js"), "utf8"));
    t.ok(/function\s+nsKey\s*\([^)]*\)\s*\{[^}]*HL\.site\s*&&\s*HL\.site\.ns\s*\?\s*HL\.site\.ns\(\)/.test(dom),
      "dom.js 的 nsKey 必須向 HL.site.ns() 求前綴（改成回空字串＝全站失去站別隔離而一切照常運作）");
    t.ok(/function\s+lsGet\s*\([^)]*\)\s*\{[^}]*getItem\s*\(\s*nsKey\s*\(/.test(dom), "lsGet 必須經 nsKey");
    t.ok(/function\s+lsSet\s*\([^)]*\)\s*\{[^}]*setItem\s*\(\s*nsKey\s*\(/.test(dom), "lsSet 必須經 nsKey");

    /* (d) 反向錨：site-mode.js **實跑真檔**（stub global 注入），不是掃字串 */
    var smSrc = fs.readFileSync(path.join(SRC, "core", "site-mode.js"), "utf8");
    t.equal(/HL\.dom\.ls(Get|Set)\s*\(/.test(strip(smSrc)), false,
      "site-mode.js 不得經 HL.dom 讀寫旗標（自我指涉：加了前綴後切到 live 就讀不回自己）");
    function runSiteMode(seed) {
      var store = {}; if (seed != null) store.HL_SITE_MODE = seed;
      var reloads = 0;
      var stub = {
        localStorage: {
          getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
          setItem: function (k, v) { store[k] = String(v); }
        },
        location: { reload: function () { reloads += 1; } }
      };
      new Function("window", smSrc)(stub);
      return { site: stub.HL && stub.HL.site, store: store, reloads: function () { return reloads; } };
    }
    var d0 = runSiteMode(null);
    t.ok(d0.site && typeof d0.site.ns === "function", "site-mode.js 應以 stub global 實跑並掛出 HL.site");
    t.equal(d0.site.mode(), "demo", "無旗標時預設為假站 demo");
    t.equal(d0.site.ns(), "", "假站前綴必須為空字串（既有存檔不得被改名）");
    var d1 = runSiteMode("live");
    t.equal(d1.site.mode(), "live", "旗標為 live 時應讀成真站");
    t.equal(d1.site.isLive(), true, "isLive() 必須與 mode() 一致");
    t.equal(d1.site.ns(), "r:", "真站前綴必須為 r:（回空字串＝真站直接讀寫到假站那份存檔）");
    var d2 = runSiteMode(null);
    d2.site.setMode("live");
    t.equal(d2.store.HL_SITE_MODE, "live", "切站必須以**原生 key**（不帶任何前綴）寫旗標");
    t.equal(d2.reloads(), 1, "切站必須 reload 套用（否則旗標切了而前綴/後端仍是舊的半套狀態）");
    t.equal(d2.site.mode(), "demo",
      "MODE 讀一次後固定整頁生命週期：setMode 之後、reload 之前仍應回原站別" +
      "（若改成即時可變，就會出現檔頭警告的半套狀態＝旗標切了但前綴/後端還是舊的）");
    t.equal(d2.site.ns(), "", "同上：未 reload 前前綴不得先行改變（否則同一頁內會出現兩種前綴）");
    d2.site.setMode("demo");
    t.equal(d2.reloads(), 1, "切到與本頁相同的站別必須 no-op（不得重複 reload）");
    d2.site.setMode("staging");
    t.equal(d2.reloads(), 1, "非 live/demo 的值必須被拒（不得 reload）");
    t.equal(d2.store.HL_SITE_MODE, "live", "被拒的值不得污染旗標");
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 資料軸 · 中央結算掛鉤的扇出名冊（2026-08-27 平台軌 20:00 窗 · 台帳審「資料」分類時立）
 * ---------------------------------------------------------------------------
 * 守的是 CLAUDE.md §4 開頭那句話的**機械前提**：
 *   「`HL.liveStats.record(game, bet, win)` ＝全遊戲結算的中央點；任何依玩家行為觸發的
 *     留存/任務/成就/返水，掛這裡即全遊戲通吃。」
 * 這句話為真，靠的是 `core/live-stats.js` 的 `record()` 裡**一行一個下游**——20 個消費者、
 * 22 個呼叫。而本輪實測：其中 **14 支 API 全庫（去註解去字串後）只有這一個呼叫點**。
 * 也就是說：注單、成就、返水、JP、活躍度、熱度、負責任博弈…每一個子系統與「全部 25 款遊戲
 * ＋主播跟注」之間，只隔著 live-stats.js 裡的**一行**。
 *
 * 為什麼這一格之前是空的（本輪查獲）：
 *   ① 唯一在守它的 `core/selftest.js:212 core/central-hook` 是 **`env: "browser"`** ⇒
 *      `node prototype/tests/run.js`（引擎每輪唯一跑得動的閘）**從來沒有執行過它**
 *      （selftest 的 env 過濾把它整個排除，連「略過」都不會顯示）。
 *   ② 就算跑了也擋不住本檔要擋的事：它只斷言「`HL.betlog.record` 是個 function」，
 *      **沒有斷言 `record()` 真的去呼叫它**。刪掉 live-stats.js 那一行，該測項照樣全綠。
 *   ③ `checks-platform.js` 既有的 live-stats 斷言（#114 徽章輪順手立的）只涵蓋 20 個裡的 3 個
 *      （activity/challenges/achievements）。
 *   ⇒ 這正是 §4「修一半而看不出來」的教科書形狀：刪掉任一行，注單中心照開、報表照匯出、
 *      徽章牆照顯示（都是舊資料），**畫面上沒有任何一處會變**。
 *
 * 立鎖前的兩個自問（§4 要求）：
 *   「這條不變量有沒有反向？」→ 有。少一支＝子系統靜默斷線；多一支＝名冊過期（本鎖雙向都紅）。
 *   「有沒有第二個消費者？」→ 這正是 (h)：14 支 record-once API 全庫**恰一個呼叫點**。
 *      多一個＝同一局被記兩次（注單多出一列幽靈紀錄、CSV 與 `betlog.row` 事件跟著錯）。
 *
 * 手法：以 stub global **實跑 `live-stats.js` 真檔**（同 `platform/promo-optin-invariants`
 * 與 `platform/site-ns-storage-allowlist` 的形制），把下游全換成間諜函式後真的呼叫一次
 * `record()`，看**誰真的被叫到、拿到什麼參數** —— 不是掃字串，掃字串擋不住 ② 那種形狀。
 * ═══════════════════════════════════════════════════════════════════════════ */
var LIVESTATS_SRC = path.join(ROOT, "src", "core", "live-stats.js");

/* 下游模組 → 掛鉤方法（＝本鎖的名冊定義域；不在這裡的模組 stub 不會提供，等於「未載入」） */
var FANOUT_MODS = {
  ledger: ["record"], bonus: ["onWager"], activity: ["record"], progressSrc: ["grant"],
  vip: ["addWager"], season: ["record"], tasks: ["bump"], rakeback: ["accrue"],
  jackpot: ["onBet"], tournament: ["record"], raffle: ["record"], shop: ["record"],
  base: ["record"], onboard: ["record"], guild: ["record"], challenges: ["record"],
  cashback: ["record"], heat: ["record"], achievements: ["record"], betlog: ["record"],
  rg: ["record"]
};

/* 實跑真檔：omit＝故意不提供的模組（測退化路徑）；edgeMul＝#50 成本加權係數（測兩把尺） */
function runLiveStats(opts) {
  opts = opts || {};
  var omit = opts.omit || [], calls = [];
  var HL = { dom: { el: function () { return {}; }, money: function (v) { return String(v); } } };
  Object.keys(FANOUT_MODS).forEach(function (m) {
    if (omit.indexOf(m) > -1) return;                       // 不提供＝該模組未載入
    HL[m] = {};
    FANOUT_MODS[m].forEach(function (fn) {
      HL[m][fn] = function () { calls.push({ key: m + "." + fn, args: [].slice.call(arguments) }); };
    });
  });
  // edge 是 pull 型（被查詢而非被餵事件）⇒ 08-31 起也納入 omit 射程，否則 22 支裡最不像訂閱者的那一支永遠測不到
  if (omit.indexOf("edge") < 0) HL.edge = { weighted: function (g, b) { calls.push({ key: "edge.weighted", args: [g, b] }); return b * (opts.edgeMul == null ? 1 : opts.edgeMul); } };
  var stub = { HL: HL };
  new Function("window", fs.readFileSync(LIVESTATS_SRC, "utf8"))(stub);
  return {
    ls: stub.HL.liveStats,
    fire: function (game, bet, win) { calls.length = 0; stub.HL.liveStats.record(game, bet, win); return calls; },
    keysOf: function (cs) { var s = {}; cs.forEach(function (c) { s[c.key] = 1; }); return Object.keys(s).sort(); },
    argsOf: function (cs, key, i) {
      var hit = cs.filter(function (c) { return c.key === key && (i == null || String(c.args[0]) === i); })[0];
      return hit ? hit.args : null;
    }
  };
}

/* 名冊基線：一注（bet>0 且 win>0）在「下游全載入」下必須恰好觸發這 20 支。
   少一支＝該子系統對全部遊戲靜默斷線；多一支＝新下游未經登記（請連同這裡一起改，是刻意的摩擦）。
   註：vip.addWager／season.record 不在此列——它們是 progressSrc 缺席時的退化路徑，見 (g)。 */
var FANOUT_ROSTER = [
  "achievements.record", "activity.record", "base.record", "betlog.record", "bonus.onWager",
  "cashback.record", "challenges.record", "edge.weighted", "guild.record", "heat.record",
  "jackpot.onBet", "ledger.record", "onboard.record", "progressSrc.grant", "raffle.record",
  "rakeback.accrue", "rg.record", "shop.record", "tasks.bump", "tournament.record"
].sort();

/* 押注側消費者：bet<=0（跟注派彩／紅利入帳／免費贏分）時**一支都不許動**。
   動了＝零成本換到流水/等級/返水/JP/賽季進度＝白送。 */
var WAGER_SIDE = [
  "activity.record", "base.record", "bonus.onWager", "challenges.record", "edge.weighted",
  "guild.record", "jackpot.onBet", "onboard.record", "progressSrc.grant", "raffle.record",
  "rakeback.accrue", "season.record", "shop.record", "vip.addWager"
];

/* record-once：全庫（去註解去字串）呼叫點必須恰為 1，且就在 live-stats.js。
   第二個呼叫點＝同一局被記兩次（注單幽靈列／成就與返水雙計／JP 雙灌）。
   刻意不含 tasks.bump／vip.addWager／progressSrc.grant／season.record／tournament.record
   ——它們本來就有第二個合法來源（rewards.js／progress-src.js／win-only 分支）。 */
var RECORD_ONCE = [
  "betlog.record", "achievements.record", "rakeback.accrue", "jackpot.onBet", "activity.record",
  "challenges.record", "cashback.record", "heat.record", "rg.record", "onboard.record",
  "base.record", "shop.record", "guild.record", "raffle.record"
];

function noStrings(s) {
  return noComments(s)
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

selftest.register({
  id: "platform/central-hook-fanout-roster", group: "platform", env: "node", tier: "fast",
  title: "中央結算掛鉤扇出名冊：20 支下游雙向等式＋押注側零白送＋兩把尺不互冒充＋14 支 record-once",
  run: function (t) {
    /* ── (a) 反向錨：我們跑到的是真檔，不是自己捏的替身 ───────────────────── */
    var R = runLiveStats({});
    t.isFn(R.ls && R.ls.record, "live-stats.js 應以 stub global 實跑並掛出 HL.liveStats.record");
    var body = String(R.ls.record);
    t.ok(/HL\.ledger/.test(body) && /HL\.betlog/.test(body),
      "跑到的 record() 原始碼應含 HL.ledger／HL.betlog（否則本鎖驗的是替身而非真檔）");

    /* ── (b) 被驗的檔＝被出貨的檔（首屏 eager script，不是孤兒） ───────────── */
    t.ok(staticScripts(indexHtml()).indexOf("./src/core/live-stats.js") > -1,
      "index.html 必須靜態掛載 core/live-stats.js（中央結算點不得變成延遲/孤兒檔）");

    /* ── (c) 名冊雙向等式：一注觸發的下游集合 === 基線 ─────────────────────── */
    var got = R.keysOf(R.fire("dice", 100, 250));
    var missing = FANOUT_ROSTER.filter(function (k) { return got.indexOf(k) < 0; });
    var extra = got.filter(function (k) { return FANOUT_ROSTER.indexOf(k) < 0; });
    t.equal(missing.join("、"), "",
      "中央結算點少呼叫了下游 ⇒ 該子系統對**全部遊戲**靜默斷線（畫面不會有任何變化）：" + missing.join("、"));
    t.equal(extra.join("、"), "",
      "中央結算點多了未登記的下游 ⇒ 名冊過期，請連同 FANOUT_ROSTER 一起登記：" + extra.join("、"));

    /* ── (d) 集合大小自檢（08-17 教訓：少注入一個依賴時被檢查的集合會默默變小）── */
    t.ok(got.length >= 18, "扇出集合應 ≥18 支，實得 " + got.length + "（" + got.join("、") + "）");
    t.equal(FANOUT_ROSTER.length, 20, "基線名冊應為 20 支，實得 " + FANOUT_ROSTER.length);

    /* ── (e) 押注側零白送：bet<=0 時押注側一支都不許動 ─────────────────────── */
    var winOnly = R.keysOf(R.fire("dice", 0, 250));
    var leaked = WAGER_SIDE.filter(function (k) { return winOnly.indexOf(k) > -1; });
    t.equal(leaked.join("、"), "",
      "bet<=0（跟注派彩／紅利／免費贏分）不得觸發押注側下游＝零成本換流水/等級/返水/JP：" + leaked.join("、"));
    var wcalls = R.fire("dice", 0, 250);
    t.equal(R.argsOf(wcalls, "tasks.bump", "wager"), null, "bet<=0 不得 bump wager 任務進度（免費流水）");
    t.equal(R.argsOf(wcalls, "tasks.bump", "bet"), null, "bet<=0 不得 bump bet 次數任務（免費局數）");
    t.ok(R.argsOf(wcalls, "tasks.bump", "win") != null, "但 win>0 仍應 bump win 任務（反向錨：不是整段被關掉）");
    t.ok(winOnly.indexOf("betlog.record") > -1 && winOnly.indexOf("ledger.record") > -1,
      "反向錨：純派彩仍必須進注單與帳本（否則錢出去了卻查不到）");

    /* ── (f) 兩把尺不互相冒充：進度吃 #50 邊際加權值、任務吃真實流水 ─────────── */
    var W = runLiveStats({ edgeMul: 0.5 });
    var c = W.fire("dice", 100, 0);
    t.equal(String(W.argsOf(c, "progressSrc.grant", "wager")[1]), "50",
      "進度來源必須收 #50 邊際加權後的值（收原始 bet ⇒ edge 加權整套變裝飾品）");
    t.equal(String(W.argsOf(c, "tasks.bump", "wager")[1]), "100",
      "任務流水必須收**原始** bet（收加權值 ⇒ 玩家看到的流水進度與實際押注對不上）");
    var act = W.argsOf(c, "activity.record");
    t.equal(String(act[0]) + "/" + String(act[1]), "100/50",
      "活躍度必須同時收到兩把尺（真實 " + act[0] + "／加權 " + act[1] + "）＝#59 兩把尺不互相冒充");

    /* ── (g) 退化路徑：progressSrc 缺席時 vip/season 必須收到**同一個**加權值 ─── */
    var F = runLiveStats({ edgeMul: 0.5, omit: ["progressSrc"] });
    var fc = F.fire("dice", 100, 0);
    var fk = F.keysOf(fc);
    t.ok(fk.indexOf("vip.addWager") > -1 && fk.indexOf("season.record") > -1,
      "progressSrc 未載入時必須退化為直接餵 vip.addWager／season.record（否則等級與賽季全站不再前進）");
    t.equal(String(F.argsOf(fc, "vip.addWager")[0]), "50", "退化路徑的 VIP 流水仍須為加權值（改吃原始 bet ⇒ 移除一個模組就悄悄改了經濟）");
    t.equal(String(F.argsOf(fc, "season.record")[0]), "50", "退化路徑的賽季進度同上");

    /* ── (h) record-once：14 支下游全庫恰一個呼叫點，且都在 live-stats.js ───── */
    var files = allSrcJs(), multi = [], zero = [];
    RECORD_ONCE.forEach(function (api) {
      var re = new RegExp("HL\\." + api.replace(".", "\\.") + "\\s*\\(", "g");
      var sites = [];
      files.forEach(function (f) {
        var m = noStrings(fs.readFileSync(f, "utf8")).match(re);
        if (m) sites.push(path.basename(f) + "×" + m.length);
      });
      var total = sites.reduce(function (n, s) { return n + (+s.split("×")[1]); }, 0);
      if (total === 0) zero.push(api);
      else if (total > 1 || sites[0].indexOf("live-stats.js") !== 0) multi.push(api + "＝" + sites.join("+"));
    });
    t.equal(multi.join("；"), "",
      "以下下游出現第二個呼叫點（或呼叫點不在 live-stats.js）⇒ 同一局被記兩次／繞過中央點：" + multi.join("；"));
    t.equal(zero.join("、"), "",
      "以下下游一個呼叫點都找不到 ⇒ 掛鉤已消失（或本檢查的比對式失效）：" + zero.join("、"));
    t.equal(RECORD_ONCE.length, 14, "record-once 名單應為 14 支，實得 " + RECORD_ONCE.length);
  }
});

/* ===========================================================================
 * #107/#123 受眾閘「消費端名冊」封閉性  (2026-08-28 平台軌·台帳輪替「擴充性」輪)
 * ---------------------------------------------------------------------------
 * 這一條守的不是產品行為，是**網子的邊界**。
 * 受眾詞彙（`core/release.js` 的 AUDIENCES）今天有四個消費端，四支各自都有鎖：
 *   promo-cal／redeem ← `platform/audience-single-vocabulary` + `audience-gate-actually-filters`
 *   shop             ← `platform/shop-registry-and-audience-gate`
 *   content          ← `content/audience-delegated`
 * **但 `audience-single-vocabulary` 的消費端名冊是寫死的兩支**（寫下它時剛好只有兩支）——
 * #61 的 `content.js`、#123 的 `shop.js` 落地後都沒有被加進去，而那條鎖一個字也沒說。
 * ⇒ 明天再多一個消費端，它就算自己讀 `HL.vip.status().level` 判資格（＝第二份受眾述詞，
 *   維度會與詞彙表悄悄分岔），**現有每一條鎖仍然全綠**。
 * 這正是 CLAUDE.md §4 記載的「修一半而看不出來」家族：層①（每支自己的鎖）活著、
 * 層②（名冊）長不大 ⇒ 覆蓋率隨程式碼成長**單向下降**，而下降過程沒有任何讀數。
 *
 * 做法（比照 08-27 `platform/central-hook-fanout-roster` 的名冊雙向等式）：
 *   射程不是硬寫檔名，是**掃出來的地面真相**（誰在解參 `.audience`），再與宣告名冊做雙向等式。
 *   新增消費端 ⇒ 等式紅 ⇒ 逼作者顯式納冊，並當場受「必須委派／不得自刻玩家維度」兩條紀律管轄。
 * 另一半守宣告端：宣告一個 AUDIENCES 沒有的 kind ⇒ `matches()` 恆 false ⇒ 那則內容/獎品
 *   **永遠隱藏、不報錯、console 全乾淨**（同一家族的靜默失敗，只有寫測項去打自己才會發現）。
 * 尺自身的反向錨：① 拿一段 fail-open 的假消費端源碼餵**同一段** audScan，必須被抓；
 *   ② 拿被動過手腳的名冊餵**同一段** audDiff，extra／missing 必須真的非空。
 *   沒有這兩條，把規則改窄到永不命中也會全綠（08-17 SELFTEST_ORDER_DEBT 棘輪的教訓）。
 * =========================================================================== */
var AUD_OWNER = "release.js";                                                  // 詞彙定義端，不算消費端
var AUD_CONSUMERS = ["content.js", "promo-cal.js", "redeem.js", "shop.js"];    // 宣告名冊（2026-08-28 實測 4 支）

/* 單一檢測程式：測項與反向錨共用同一段（分岔就等於沒有反向錨）。 */
function audScan(src) {
  var c = noComments(src), kinds = [], m;
  var re = /audience\s*:\s*\{\s*kind\s*:\s*"([A-Za-z0-9_]+)"/g;
  while ((m = re.exec(c))) kinds.push(m[1]);
  return {
    // 解參 `.audience` ＝以受眾決定「可見／可領／可購」＝本紀律的射程（`audienceLabel` 這種不算：\b 擋掉）
    reads: /[A-Za-z_$][\w$]*\.audience\b/.test(c),
    // 向唯一詞彙求述詞。content.js 是取值注入（`matcher()` 回傳它）而非呼叫 ⇒ 不比對括號
    delegates: /HL\.release\.matches\b/.test(c),
    ownsTable: /\bvar\s+AUDIENCES\s*=/.test(c),
    // 自己讀玩家維度判資格＝在刻第二份述詞（維度一分岔，門檻就會兩邊各走各的）
    selfJudges: /HL\.vip\.status\s*\(\s*\)\s*\.\s*level/.test(c)
      || /HL\.activity\.(wageredSince|xpSince)\s*\(/.test(c)
      || /\b(accountAgeDays|seasonTier|inGuild|active30)\b/.test(c),
    kinds: kinds
  };
}
function audDiff(found, roster) {
  return {
    extra: found.filter(function (b) { return roster.indexOf(b) < 0; }).sort(),
    missing: roster.filter(function (b) { return found.indexOf(b) < 0; }).sort()
  };
}

selftest.register({
  id: "platform/audience-consumer-roster-closed", group: "platform", env: "node", tier: "fast",
  title: "#107 ⑤：受眾消費端名冊必須隨程式碼成長（雙向等式）＋每一支都委派、都不自刻玩家維度",
  run: function (t) {
    var found = [], foundPath = {}, owners = [], declared = [];
    allSrcJs().forEach(function (p) {
      var b = path.basename(p), s = audScan(fs.readFileSync(p, "utf8"));
      if (s.ownsTable) owners.push(b);
      if (b === AUD_OWNER) return;      // 定義端自帶反例（它的 selftest 刻意宣告 kind:"typo" 驗未知 kind 不放行）
      if (s.reads) { found.push(b); foundPath[b] = p; }
      s.kinds.forEach(function (k) { declared.push(b + ":" + k); });
    });
    found.sort();

    /* ① 名冊雙向等式：地面真相 ≡ 宣告名冊 */
    var d = audDiff(found, AUD_CONSUMERS);
    t.equal(d.extra.join("、"), "",
      "出現名冊外的受眾消費端 ⇒ 它不在任何一條受眾鎖的射程內，請先納冊再落地：" + d.extra.join("、"));
    t.equal(d.missing.join("、"), "",
      "名冊列了卻掃不到 ⇒ 該支已不再消費受眾（或本檢查的比對式失效）：" + d.missing.join("、"));
    t.ok(found.length >= 4,
      "witness 下限：受眾消費端至少 4 支，實測 " + found.length + " 支（0 或過少＝掃描器壞掉時『完美通過』的同形陷阱）");

    /* ② 射程＝掃出來的每一支（不是硬寫 pair），逐支驗三條紀律 */
    found.forEach(function (b) {
      var s = audScan(fs.readFileSync(foundPath[b], "utf8"));   // 用掃描當下的真實路徑，不假設消費端一定在 core/
      t.ok(s.delegates, b + " 讀了 .audience 卻沒有向 HL.release.matches 求述詞＝自己判資格");
      t.equal(s.ownsTable, false, b + " 不得自建 AUDIENCES 表（唯一來源＝core/release.js）");
      t.equal(s.selfJudges, false, b + " 不得自行讀玩家維度（VIP 等級／活躍度／帳齡／季票階）判資格＝第二份述詞");
    });

    /* ③ 定義端唯一（與舊鎖同一結論，但這裡是本鎖自己的前提，不靠它） */
    t.equal(owners.join(","), AUD_OWNER, "受眾表只允許定義在 core/" + AUD_OWNER + "，實測定義處：" + (owners.join("、") || "（零處＝掃描壞了）"));

    /* ④ 宣告端：kind 必須在詞彙表裡（孤兒 kind ⇒ matches() 恆 false ⇒ 該筆永遠隱藏且不報錯） */
    var VOCAB = Object.keys(require(path.join(ROOT, "src", "core", "release.js")).AUDIENCES);
    var orphan = declared.filter(function (x) { return VOCAB.indexOf(x.split(":")[1]) < 0; });
    t.equal(orphan.join("、"), "",
      "宣告了詞彙表沒有的受眾 kind ⇒ 那筆內容/獎品永遠隱藏、無錯誤訊息：" + orphan.join("、"));
    t.ok(declared.length >= 5,
      "witness 下限：實際宣告 audience 的筆數 ≥5，實測 " + declared.length + " 筆（零宣告＝這條詞彙從沒被走過）");

    /* ⑤ 反向錨（尺自身）：同一段程式必須抓得到刻意造出來的違規 */
    var fake = audScan("function eligible(it){ if(!it.audience) return true; return HL.vip.status().level >= 5; }");
    t.ok(fake.reads && !fake.delegates && fake.selfJudges,
      "反向錨①：fail-open 的假消費端必須被判為『讀了受眾、沒委派、且自刻維度』（三項有一項失準，②的逐支檢查就是空的）");
    t.equal(audDiff(found.concat(["ghost.js"]), AUD_CONSUMERS).extra.join("、"), "ghost.js",
      "反向錨②a：多一支未納冊的消費端時，extra 必須真的非空");
    t.equal(audDiff(found, AUD_CONSUMERS.concat(["nope.js"])).missing.join("、"), "nope.js",
      "反向錨②b：名冊列了不存在的檔時，missing 必須真的非空");
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
 * platform/bonus-add-source-attribution — 送幣成本歸屬：每一筆紅利都要說出自己是誰
 *
 * 【CLAUDE.md §4 寫下的規則】「任何新送幣/新金流務必在授予當下 HL.ledger.record(...)」。
 *   紅利側的落實方式是**單一漏斗**：17 個發放模組全部呼叫 HL.bonus.add()，由 progress.js 的
 *   badd() 統一記帳 —— 所以「有沒有記到帳」這件事架構上不會漏。
 *
 * 【但漏斗只保證總額，不保證歸屬】badd() 記的是
 *     HL.ledger.record("bonus", n, { source: (opts && opts.source) || "其他紅利" })
 *   而 ledger.js:161 用 `meta.source || "其他紅利"` 分桶、views/ops-dashboard.js 的
 *   「🎁 送幣成本明細（by 來源）」逐桶列出金額與佔比，真站還會經 ledger.js:177 的 opsLog 上雲。
 *   ⇒ 呼叫端漏傳 source，錢**照樣記進總額**，只是被併進「其他紅利」。
 *
 * 【2026-08-29 平台軌實測查獲的活缺陷】19 個呼叫點裡 18 個帶 source，只有 core/rewards.js 的
 *   連登里程碑大禮 `HL.bonus.add(st.milestone)` 沒帶 ⇒ 里程碑成本被併進雜項桶。
 *   同一個函式往上兩行才剛為日獎寫過 `{ source: "每日簽到" }` ⇒ 慣例是真的、這裡是 drift。
 *
 * 【為什麼這是 §4「修一半而看不出來」家族】玩家拿到的錢正確、餘額正確、通知正確、
 *   帳本總額正確、儀表板照樣渲染出一個看起來合理的「其他紅利」數字 ——
 *   **畫面上沒有任何一處會變**。只有當有人問「連登里程碑到底花了我們多少」時才會發現答不出來，
 *   而且會拿到一個**看起來像答案的錯答案**（把雜項桶讀成雜項）。
 *
 * 【立鎖前的兩個自問（§4 要求）】
 *   「這條不變量有沒有反向？」→ 有兩個，本鎖都守：
 *      ① ledger.js 的 `|| "其他紅利"` 後備**必須留著** —— 拿掉它，漏傳的 source 會以
 *         undefined 當 key，桶名變成字串 "undefined"，比現況更糟（本鎖 (d) 反向錨住它）。
 *      ② 只檢查「有沒有 source: 這個字」是**沒有鑑別力**的（#142 的教訓）——
 *         `{ source: "" }` 或 `{ source: undefined }` 都會過。故 (b) 要求值必須是
 *         **非空字串字面量**，三元式則**兩臂都要**是非空字面量。
 *   「有沒有第二個消費者？」→ 有三個：ledger.bySource（分桶）、ops-dashboard（本機面板）、
 *      api.opsLog（真站上雲）。三者吃同一個 source ⇒ 漏傳是一次錯三處，(e) 錨住前兩者。
 * ═══════════════════════════════════════════════════════════════════════════ */
var BONUS_ADD_MIN_SITES = 18;   // 實測 19；下限留一格容忍合法移除，低於此＝多半掃錯目錄
var BONUS_ADD_MIN_FILES = 15;   // 實測 17

/* 從 `HL.bonus.add(` 起算，括號配對取出完整呼叫文字（已去註解、已把續行攤平） */
function bonusAddCalls(flat) {
  var re = /HL\.bonus\.add\s*\(/g, m, out = [];
  while ((m = re.exec(flat))) {
    var i = flat.indexOf("(", m.index), depth = 0, end = -1;
    for (var j = i; j < flat.length && j < i + 400; j++) {
      if (flat[j] === "(") depth++;
      else if (flat[j] === ")") { depth--; if (depth === 0) { end = j; break; } }
    }
    out.push(flat.slice(m.index, end > -1 ? end + 1 : m.index + 120));
  }
  return out;
}

/* source: 的值必須是非空字串字面量；三元式則兩臂都必須是非空字串字面量。 */
function sourceVerdict(call) {
  var m = call.match(/source\s*:\s*([^,}]+)/);
  if (!m) return "缺 source";
  var v = m[1].trim();
  var lit = /^(["'])(?:[^"'\\]|\\.)*\1$/;
  function ok(x) {
    x = x.trim();
    if (!lit.test(x)) return false;
    return x.length > 2;                     // 排除 "" / ''
  }
  if (ok(v)) return null;
  var tern = v.match(/\?([^:]+):(.+)$/);
  if (tern && ok(tern[1]) && ok(tern[2])) return null;
  return "source 非非空字串字面量：" + v.slice(0, 60);
}

selftest.register({
  id: "platform/bonus-add-source-attribution", group: "platform", env: "node", tier: "fast",
  title: "送幣成本歸屬：每個 HL.bonus.add 都必須帶非空 source（漏傳＝靜默併進「其他紅利」桶）",
  run: function (t) {
    var Q = String.fromCharCode(34); // 雙引號字面量（避免本檔字串巢狀逃逸，同 :711 的既有手法）
    var files = allSrcJs(), sites = 0, hitFiles = {}, bad = [], byFile = {};
    files.forEach(function (f) {
      var flat = noComments(fs.readFileSync(f, "utf8")).replace(/\n\s*/g, " ");
      var calls = bonusAddCalls(flat);
      if (!calls.length) return;
      hitFiles[f] = 1;
      byFile[path.basename(f)] = calls;
      calls.forEach(function (c) {
        sites++;
        var v = sourceVerdict(c);
        if (v) bad.push(path.basename(f) + "：" + v);
      });
    });

    /* ── (a) 自我保護：規模沒崩（掃錯目錄／walk 壞掉會讓集合變空而假綠） ───────── */
    t.ok(sites >= BONUS_ADD_MIN_SITES,
      "HL.bonus.add 呼叫點應 ≥" + BONUS_ADD_MIN_SITES + " 個，實得 " + sites + "（過少＝多半掃錯目錄，本鎖會假綠）");
    t.ok(Object.keys(hitFiles).length >= BONUS_ADD_MIN_FILES,
      "發放紅利的檔案應 ≥" + BONUS_ADD_MIN_FILES + " 支，實得 " + Object.keys(hitFiles).length);

    /* ── (b) 主斷言：每個呼叫點都帶「非空字串字面量」的 source ────────────────── */
    t.equal(bad.join(" ｜ "), "",
      "這些送幣點的成本會被靜默併進「其他紅利」桶（總額仍對、畫面全對，只有成本歸屬問不出來）：" + bad.join(" ｜ "));

    /* ── (c) 鑑別力自檢：本鎖的判準真的分得出好壞（#142 教訓：規則要能被反例打紅）── */
    t.equal(sourceVerdict("HL.bonus.add(n)"), "缺 source", "鑑別力①：完全沒帶 source 必須判壞");
    t.ok(sourceVerdict("HL.bonus.add(n, { source: " + Q + Q + " })") != null, "鑑別力②：空字串 source 必須判壞");
    t.ok(sourceVerdict("HL.bonus.add(n, { source: undefined })") != null, "鑑別力③：undefined source 必須判壞");
    t.ok(sourceVerdict("HL.bonus.add(n, { source: v })") != null, "鑑別力④：變數 source 必須判壞（執行期才知道＝靜態擋不住空值）");
    t.equal(sourceVerdict("HL.bonus.add(n, { source: " + Q + "錦標賽獎金" + Q + " })"), null, "鑑別力⑤：正常字面量必須判好（反向錨：不是一律判壞）");
    t.equal(sourceVerdict("HL.bonus.add(n, { wagerFree: true, source: " + Q + "返現" + Q + " })"), null, "鑑別力⑥：source 不在首位仍須判好");
    t.equal(sourceVerdict("HL.bonus.add(n, { source: a ? " + Q + "甲" + Q + " : " + Q + "乙" + Q + " })"), null, "鑑別力⑦：三元式兩臂皆字面量須判好（challenges.js 現行寫法）");
    t.ok(sourceVerdict("HL.bonus.add(n, { source: a ? " + Q + "甲" + Q + " : v })") != null, "鑑別力⑧：三元式有一臂非字面量須判壞");

    /* ── (d) 反向錨：ledger 的後備桶名必須留著，且分桶確實吃 meta.source ───────── */
    var led = fs.readFileSync(path.join(SRC_DIR, "core", "ledger.js"), "utf8");
    t.ok(led.indexOf("meta.source ||") > -1,
      "ledger.js 必須保留 `meta.source || 後備桶名`：拿掉後備，漏傳的 source 會以 undefined 當桶名（比現況更糟）");
    t.ok(/bySource\[\s*s\s*\]/.test(led) || led.indexOf("d.bySource[s]") > -1,
      "ledger.js 必須以 source 當 key 分桶（否則本鎖守的 source 是裝飾品）");

    /* ── (e) 消費端錨：面板真的把 bySource 列出來、真站真的把 meta 上雲 ────────── */
    var dash = fs.readFileSync(path.join(SRC_DIR, "views", "ops-dashboard.js"), "utf8");
    t.ok(dash.indexOf("bySource") > -1,
      "ops-dashboard.js 必須消費 ledger.bySource（沒有消費端＝成本歸屬無人可讀）");
    t.ok(led.indexOf("opsLog") > -1,
      "ledger.js 必須把送幣鏡射到 api.opsLog（真站成本歸屬上雲的第二個消費者）");

    /* ── (f) 釘死本輪修掉的那一格：簽到的兩條送幣路徑不得共用同一個桶 ─────────── */
    var rw = noComments(fs.readFileSync(path.join(SRC_DIR, "core", "rewards.js"), "utf8")).replace(/\n\s*/g, " ");
    var mile = bonusAddCalls(rw);
    t.equal(mile.length, 1, "rewards.js 應恰有 1 個 HL.bonus.add（里程碑大禮），實得 " + mile.length);
    t.equal(sourceVerdict(mile[0]), null, "rewards.js 的里程碑大禮必須帶非空 source（本輪修掉的就是這一格）");
    var mileSrc = (mile[0].match(/source\s*:\s*(["'])((?:[^"'\\]|\\.)*)\1/) || [])[2];
    var daySrc = (rw.match(/ledger\.record\(\s*["']bonus["'][^)]*source\s*:\s*(["'])((?:[^"'\\]|\\.)*)\1/) || [])[2];
    t.ok(!!mileSrc && !!daySrc, "簽到的兩條送幣路徑都應取得到 source（里程碑=" + mileSrc + "／日獎=" + daySrc + "）");
    t.ok(mileSrc !== daySrc,
      "連登里程碑（入獎金錢包）與每日日獎（入主餘額）是兩條金額不同的送幣路徑，不得共用同一個成本桶：兩者皆為 " + mileSrc);
  }
});

/* ============================================================================================
 * platform/games-register-merges  ——「同 id 再註冊不得洗掉沒宣告的欄位」（2026-08-29 平台軌 14:00 窗 · #145）
 * --------------------------------------------------------------------------------------------
 * 本輪查獲的缺陷（活的、玩家看得到、但畫面上沒有任何一處會壞掉）：
 *   `data/games.js` 的 seed 依 AUTHOR 表把 Apex 原創掛上開發者暱稱（Jack/Mina/Leo）；
 *   接著 `data/lazy-games.js` 的 MANIFEST 用**同一個 id** 再註冊一次 stub（#80 換手），
 *   而舊 register() 是**整筆取代**（`var g = norm(meta)`）⇒ MANIFEST 沒宣告 author
 *   → norm 的 `m.author || null` 把它填成 null → **暱稱被靜默洗掉**。
 *   實測（真實載入序 dom→mock-data→games→lazyGames.boot）：
 *     洗掉前 Mina 3／Jack 2／Leo 2  →  洗掉後 Jack 1／Mina 1／**Leo 整個消失**。
 *   受害的五款＝dice / limbo / plinko / crash-x / mines（shadow-ritual、chicken-cross 不在
 *   MANIFEST 上，所以剛好倖存＝這正是它藏得住的原因：名單還在，只是少了三分之二）。
 *
 * 為什麼沒有人發現（§4「修一半而看不出來」的第五種形狀）：
 *   登錄表是單一漏斗 ⇒ 遊戲照樣註冊、卡片照樣渲染、`authors()` 照樣回一份**看起來合理的**名單。
 *   壞掉的只有「歸屬」——而歸屬沒有總量可以對帳。與 08-29 08:00 窗 #144（送幣成本歸屬）同型：
 *   **漏斗保證了總額，於是沒有人再問歸屬**；這一輪是它在「登錄表」上的鏡像。
 *   三個活的消費端都跟著錯：`views/casino.js` 的「🎨 我們的開發者（依暱稱）」分群、
 *   `author:<暱稱>` 篩選、搜尋比對 author，以及 `core/ui.js` 遊戲卡的「provider · 🎨暱稱」。
 *   ⇒ 直接打到 CLAUDE.md 目標 2「可依同仁暱稱分類」。
 *
 * 修法：register() 改為「疊上本次宣告的欄位」——norm() 先算出這次的值，凡**本次 meta 沒有
 *   宣告的 key**（`!(k in m)`，用 raw meta 判斷，這是「有宣告」與「被 norm 填了預設」唯一分得開的地方）
 *   就沿用前一筆。顯式寫 `author: null` 仍然清得掉（key 在 m 裡）。
 *
 * 這條鎖為什麼要有反向錨（§4 立鎖自問「這條不變量有沒有反向？」）：
 *   「合併」若寫過頭就會變成**先到先得**，#80 的 stub→真 render 換手會靜默失效
 *   （玩家永遠停在「載入中」而大廳卡完全正常）⇒ (b)(c) 兩面專門打這個反向。
 *   同理 (d) 守「顯式清空仍要有效」，否則欄位變成只能寫不能刪。
 *   (e) 守消費端還在（沒有讀者的話這條鎖守的是裝飾品）。
 * ============================================================================================ */
var GAMES_SRC = path.join(ROOT, "src", "data", "games.js");

// 以真實載入序在 vm 沙箱裡把登錄表跑起來（比對原始碼字串擋不住這種行為缺陷）
function bootGamesRegistry() {
  var vm = require("vm");
  var g = {};
  g.window = g; g.globalThis = g; g.console = { log: function () {}, warn: function () {} };
  g.Promise = Promise; g.setTimeout = setTimeout;
  g.localStorage = { _d: {}, getItem: function (k) { return this._d[k] || null; },
    setItem: function (k, v) { this._d[k] = v; }, removeItem: function (k) { delete this._d[k]; } };
  g.document = { createElement: function () { return { style: {}, setAttribute: function () {}, appendChild: function () {} }; },
    head: { appendChild: function () {} }, querySelectorAll: function () { return []; } };
  vm.createContext(g);
  ["core/dom.js", "data/mock-data.js", "data/games.js", "data/lazy-games.js"].forEach(function (rel) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "src", rel), "utf8"), g, { filename: rel });
  });
  if (g.HL && g.HL.lazyGames && g.HL.lazyGames.boot) g.HL.lazyGames.boot(); // node 端不自動 boot
  return g.HL;
}

selftest.register({
  id: "platform/games-register-merges", group: "platform", env: "node", tier: "fast",
  title: "登錄表：同 id 再註冊只覆蓋本次宣告的欄位（#80 換手不得洗掉 seed 的作者暱稱）",
  run: function (t) {
    var HL = null;
    try { HL = bootGamesRegistry(); } catch (e) { t.skip("登錄表沙箱啟動失敗：" + e.message); return; }
    if (!HL || !HL.games || !HL.games.authors) { t.skip("HL.games 未就緒"); return; }

    /* ── (a) 規模自保：沙箱沒載成功時不得空掃假綠 ─────────────────────────────── */
    var all = HL.games.all();
    t.ok(all.length >= 50, "沙箱應載出 ≥50 款登錄遊戲（實得 " + all.length + "）＝證明這輪掃的是真的登錄表");
    var srcTxt = fs.readFileSync(GAMES_SRC, "utf8");
    t.ok(/AUTHOR\s*=\s*\{/.test(srcTxt), "games.js 必須仍有 AUTHOR 暱稱表（本鎖守的資料來源）");

    /* ── (b) 本體：MANIFEST 再註冊過的五款，暱稱必須還在 ──────────────────────── */
    var EXPECT = { dice: "Jack", limbo: "Mina", plinko: "Leo", "crash-x": "Leo", mines: "Mina" };
    Object.keys(EXPECT).forEach(function (id) {
      var game = HL.games.byId(id);
      t.ok(!!game, "登錄表應找得到 " + id);
      t.equal(game && game.author, EXPECT[id],
        id + " 的作者暱稱應為 " + EXPECT[id] + "（實得 " + (game && JSON.stringify(game.author)) +
        "）＝lazy-games 的同 id 再註冊把 seed 的 author 洗掉了");
    });
    var nicks = HL.games.authors().map(function (a) { return a.nick; });
    t.ok(nicks.indexOf("Leo") >= 0,
      "authors() 必須含 Leo：他名下兩款（Plinko/Crash X）**都**在 MANIFEST 上，一被洗掉整個人就從「🎨 我們的開發者」消失，名單卻仍看似正常");
    t.ok(HL.games.byAuthor("Leo").length === 2, "byAuthor('Leo') 應為 2 款（Plinko/Crash X）");

    /* ── (c) 反向錨①：本次宣告的欄位仍必須覆蓋前一筆（否則合併退化成先到先得）── */
    var cx = HL.games.byId("crash-x");
    t.equal(cx && cx.comingSoon, false, "crash-x 的 comingSoon：seed 是 true、MANIFEST 宣告 false ⇒ 必須以 MANIFEST 為準");
    t.equal(cx && cx.type, "special", "crash-x 的 type：seed 推導為 original、MANIFEST 宣告 special ⇒ 必須以 MANIFEST 為準");

    /* ── (d) 反向錨②：#80 換手（stub → 真 render）不得被合併擋掉 ─────────────── */
    t.ok(!!(cx && cx.render && cx.render.__lazyStub), "換手前 crash-x 的 render 應是 lazy stub");
    var realFn = function () { return "REAL"; };
    HL.games.register({ id: "crash-x", title: "Crash X", provider: "Apex Studio", type: "special",
      cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, render: realFn });
    var after = HL.games.byId("crash-x");
    t.equal(after && after.render, realFn, "view 註冊真 render 後必須換手成功（合併不得讓 stub 賴著不走＝玩家會永遠停在載入中）");
    t.equal(after && after.author, "Leo", "換手後 author 仍須保留（這就是本卡要的行為）");
    t.equal(HL.games.all().filter(function (x) { return x.id === "crash-x"; }).length, 1, "再註冊不得讓同 id 長出第二筆");

    /* ── (e) 反向錨③：顯式清空仍要有效（欄位不得變成只能寫不能刪）───────────── */
    HL.games.register({ id: "crash-x", author: null });
    t.equal(HL.games.byId("crash-x").author, null, "顯式寫 author:null 必須清得掉（合併判準是「有沒有宣告」，不是「值是不是空」）");

    /* ── (f) 結構錨：合併判準必須用 raw meta 的 key，不能用 norm 後的值 ────────── */
    t.ok(/!\(\s*k\s+in\s+m\s*\)/.test(srcTxt) || /hasOwnProperty/.test(srcTxt),
      "register() 必須以「本次 meta 有沒有這個 key」判斷（`!(k in m)`）；改用 `g[k] == null` 之類的值判斷會把「宣告為 null」誤當未宣告");

    /* ── (g) 消費端錨：三個讀 author 的表面都還在（沒有讀者＝這條鎖守裝飾品）───
     * ⚠️ 這一面第一版寫成 `casino.indexOf("HL.games.authors") > -1` ⇒ **鑑別力不足**：
     *   把守衛改成 `HL.games.__authors ? HL.games.authors() : []`（＝分群整區靜默消失）時，
     *   字串仍在、鎖照樣綠（負向擾動 P5 首跑 MISSED）。改為「authorsRow() 內引用的每個
     *   HL.games.<名> 都必須真的存在於沙箱跑出來的 API 上」＝打字錯/改名/漏改都會被指名。 */
    var casino = fs.readFileSync(path.join(ROOT, "src", "views", "casino.js"), "utf8");
    var ai = casino.indexOf("function authorsRow");
    t.ok(ai > -1, "casino.js 必須仍有 authorsRow()（「🎨 我們的開發者（依暱稱）」分群的渲染者）");
    if (ai > -1) {
      var d = 0, end = ai, seen = false;
      for (; end < casino.length; end++) {
        if (casino[end] === "{") { d++; seen = true; }
        else if (casino[end] === "}") { d--; if (seen && d === 0) break; }
      }
      var body = casino.slice(ai, end + 1);
      var refs = body.match(/HL\.games\.([A-Za-z_$][\w$]*)/g) || [];
      t.ok(refs.length >= 2, "authorsRow() 應同時有守衛與呼叫兩處 HL.games.<名> 引用（實得 " + refs.length + "）");
      refs.forEach(function (r) {
        var nm = r.split(".")[2];
        t.ok(typeof HL.games[nm] === "function",
          "authorsRow() 引用的 " + r + " 在 HL.games 上不存在 ⇒ 守衛恆假、分群整區靜默消失（畫面不會報錯）");
      });
    }
    t.ok(casino.indexOf("author:") > -1, "casino.js 必須仍支援 author:<暱稱> 篩選");
    t.ok(fs.readFileSync(path.join(ROOT, "src", "core", "ui.js"), "utf8").indexOf("g.author") > -1,
      "ui.js 遊戲卡必須仍顯示 provider · 🎨暱稱");
  }
});

// ── 根元素 DOM 契約的消費端鎖（2026-08-30 平台軌 08:00 窗）─────────────────────
// 為什麼需要這條（它守的是一個**沒有任何既有的尺在量**的家族）：
//   本專案已五次記錄「容器做好了、接線沒補完」（HL.dock 外部註冊者為零／promoCal 同／
//   HL.reveal／app-state.lossLimitRemaining 零讀取者／#67 空目的地）。那五例缺的都是
//   **同一種語言裡的第二端**（JS 寫、JS 沒讀）⇒ intel/tools/registry-gaps.js 掃 HL.<ns>
//   的外部消費者就抓得到。
//   本輪查獲的第 ⑥ 例不是：main.js 每次開機把 HL.state 的 theme 寫進 <html> 的
//   `data-theme`，index.html 也硬寫了一份，但 src/styles/ 三支 CSS 對 `[data-theme` 命中 0、
//   全庫 prefers-color-scheme 命中 0、.theme 的 JS 讀取者 0、切換 UI 0。
//   ⇒ **生產端在 JS、消費端本來就該在 CSS**，跨語言 ⇒ registry-gaps 與五面 i18n 棘輪
//   **射程上就看不到它**。把 theme 改成任何值，畫面一個像素都不會變，而 node 全綠、
//   console 零錯誤、畫面完全正常 —— 正是 CLAUDE.md §4「修一半而看不出來」。
// 規則：boot 路徑寫進 <html>/<body> 的每一個屬性/class，都必須至少有一個消費端
//   （CSS 選擇器、JS 讀取，或本身是瀏覽器/AT 原生消費的標準屬性），否則就是孤兒。
// 基線防腐（比照 #135 的 UNPROVEN_BASELINE）：孤兒集合必須**逐筆等於** ORPHAN_BASELINE，
//   多一筆＝新的孤兒契約上線；少一筆＝#148 落地了卻沒把它從免罪名單移除 ⇒ 兩個方向都轉紅。
var ROOT_CONTRACT_NATIVE = ["lang", "dir", "translate", "class", "id", "style", "role"];
// 唯一已知孤兒：data-theme（#148 落地＝為它補 CSS 消費端與切換出口，屆時必須從本清單移除）
var ROOT_CONTRACT_ORPHAN_BASELINE = ["attr:data-theme"];

function stripCssComments(src) { return src.replace(/\/\*[\s\S]*?\*\//g, ""); }
// 保留行數的註解剝除（既有 stripComments 會刪掉整段區塊註解 ⇒ 行號位移，指名會指到錯的一行）
function stripCommentsKeepLines(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, " "); })
            .replace(/\/\/.*/g, "");
}

function srcJsFiles() {
  var out = [];
  (function walk(dir) {
    fs.readdirSync(dir).forEach(function (f) {
      var p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) return walk(p);
      if (/\.js$/.test(f)) out.push(p);
    });
  })(path.join(ROOT, "src"));
  return out;
}
function stylesSrc() {
  var dir = path.join(ROOT, "src", "styles");
  return fs.readdirSync(dir).filter(function (f) { return /\.css$/.test(f); })
    .map(function (f) { return stripCssComments(fs.readFileSync(path.join(dir, f), "utf8")); }).join("\n");
}

// 產生端：掃出 boot 路徑寫進根元素的契約（attr:<名> / class:<名>），附寫入點供指名。
function rootDomContracts() {
  var found = {};
  function add(kind, name, where) {
    var k = kind + ":" + name;
    (found[k] = found[k] || { kind: kind, name: name, sites: [] }).sites.push(where);
  }
  srcJsFiles().forEach(function (p) {
    var rel = path.relative(ROOT, p).replace(/\\/g, "/");
    stripCommentsKeepLines(fs.readFileSync(p, "utf8")).split("\n").forEach(function (line, i) {
      var re = /(?:documentElement|document\.body)\s*\.\s*(setAttribute|classList\s*\.\s*(?:add|toggle|remove))\s*\(\s*"([^"]+)"/g, m;
      while ((m = re.exec(line))) {
        add(/setAttribute/.test(m[1]) ? "attr" : "class", m[2], rel + ":" + (i + 1));
      }
    });
  });
  // index.html 的 <html …> 行內屬性也是同一種契約（data-theme 就有硬寫的一份）
  var htmlTag = (indexHtml().match(/<html[^>]*>/) || [""])[0];
  var am, are = /([a-zA-Z-]+)\s*=\s*"/g;
  while ((am = are.exec(htmlTag))) add("attr", am[1], "index.html:<html>");
  return Object.keys(found).sort().map(function (k) { return found[k]; });
}

// 消費端：這個契約有沒有人讀？（CSS 選擇器／JS 讀取／原生標準屬性）
// 注意：寫入點本身不算消費端 —— 只有寫沒有讀正是本鎖要抓的那個狀態。
function contractConsumers(c, css, jsAll) {
  var out = [];
  if (c.kind === "attr" && ROOT_CONTRACT_NATIVE.indexOf(c.name) > -1) out.push("native");
  // 契約名只含 [A-Za-z0-9-]；怪名一律標 unscannable（正則注入＝靜默全綠，寧可吵）
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(c.name)) { out.push("unscannable"); return out; }
  /* ⚠️ 尾端必須帶 (?![\w-]) 的字首防撞。首版這裡用 css.indexOf(".ax-anim-off") 這種**子字串**比對，
   *   於是 `.ax-anim-offZZ` 也被算成 `.ax-anim-off` 的消費端 ⇒ 負向擾動 P5（把規則改名）**MISSED**。
   *   這正是 SELFTEST_ORDER_DEBT 當年栽的同一種錯：用位置/子字串代理「真的有沒有這個選擇器」。 */
  var tail = "(?![\\w-])";
  var cssRe = c.kind === "attr"
    ? new RegExp("\\[" + c.name + tail)
    : new RegExp("\\." + c.name + tail);
  if (cssRe.test(css)) out.push("css");
  var camel = c.name.replace(/^data-/, "").replace(/-([a-z])/g, function (m0, x) { return x.toUpperCase(); });
  var jsRe = c.kind === "attr"
    ? new RegExp("getAttribute\\s*\\(\\s*[\"']" + c.name + tail + "|\\[" + c.name + tail + "|dataset\\." + camel + "\\b")
    : new RegExp("classList\\s*\\.\\s*contains\\s*\\(\\s*[\"']" + c.name + tail + "|\\." + c.name + tail);
  if (jsRe.test(jsAll)) out.push("js");
  return out;
}
selftest.register({
  id: "platform/root-dom-contract-consumers", group: "platform", env: "node", tier: "fast",
  title: "根元素 DOM 契約必須有消費端：boot 寫進 <html>/<body> 的每個屬性/class 都要有人讀（#148 家族）",
  run: function (t) {
    var css = stylesSrc();
    // JS 消費端掃描刻意排除寫入點所在的那一行 —— 見 contractConsumers 的註記。
    var jsAll = srcJsFiles().map(function (p) {
      return stripComments(fs.readFileSync(p, "utf8")).split("\n").filter(function (line) {
        return !/(?:documentElement|document\.body)\s*\.\s*(?:setAttribute|classList)/.test(line);
      }).join("\n");
    }).join("\n");

    var contracts = rootDomContracts();
    // 樣本量鎖：規則被改窄／寫入點被搬走時，這條鎖會變成永遠綠的空殼（2026-08-30 基準 3）
    t.ok(contracts.length >= 3,
      "只掃到 " + contracts.length + " 個根元素 DOM 契約（基準 3）⇒ 偵測規則已失效或寫入點被搬走，此鎖已失效");

    var orphans = [];
    contracts.forEach(function (c) {
      if (contractConsumers(c, css, jsAll).length === 0) {
        orphans.push(c.kind + ":" + c.name + "（寫入點 " + c.sites.join("、") + "）");
      }
    });
    var keys = orphans.map(function (s) { return s.split("（")[0]; }).sort();
    var base = ROOT_CONTRACT_ORPHAN_BASELINE.slice().sort();

    // ① 多出來的孤兒＝新契約寫進根元素卻沒人讀（畫面完全正常、node 以外無從察覺）
    var extra = orphans.filter(function (s) { return base.indexOf(s.split("（")[0]) < 0; });
    t.equal(extra.length, 0,
      "這些根元素 DOM 契約被寫進去卻沒有任何消費端（CSS 選擇器／JS 讀取／原生屬性皆無）＝寫了沒人讀：" + extra.join("；"));
    // ② 基線防腐：孤兒被解決了就必須從免罪名單移除，不許養過時的名單
    base.forEach(function (b) {
      t.ok(keys.indexOf(b) > -1,
        "免罪名單上的 " + b + " 已經有消費端了（或寫入點消失了）⇒ 請把它從 ROOT_CONTRACT_ORPHAN_BASELINE 移除（#148 落地時的必要一步）");
    });

    /* ③ 尺自身的反向錨（雙向）—— 沒有這兩條，正則寫壞時整條鎖會靜默全綠。
     *    #135／#139 的教訓：斷言必須能證明「這把尺量得出差別」，而不只是「今天沒有告警」。 */
    var fake = { kind: "class", name: "ax-no-such-contract-zz9" };
    t.equal(contractConsumers(fake, css, jsAll).length, 0,
      "反向錨：一個全庫不存在的假契約竟被判為有消費端 ⇒ 消費端偵測恆真，本鎖無效");
    var real = { kind: "class", name: "ax-anim-off" };
    t.ok(contractConsumers(real, css, jsAll).length > 0,
      "反向錨：已知有 CSS 消費端的 .ax-anim-off（components.css 的 kill-switch 規則）竟被判為孤兒 ⇒ 消費端偵測恆假，本鎖會誤報全站");
  }
});

/* ---------------------------------------------------------------------------
 * 死 token 掃描（常駐鎖）—— 收斂 T31 的「一次性清理」為自動閘（比照 E10 把觀測點升級成閘）。
 *   每個定義在 src/styles/*.css 的 `--ax-*` 自訂屬性，都必須有至少一個消費端：
 *     ① CSS/JS/HTML 任一處的 `var(--ax-foo)` 引用；或
 *     ② JS/HTML 內對該 token 名的字面出現（`setProperty("--ax-foo",…)`／`getPropertyValue`／字串內 var()）。
 *   未被任何 `var()` 或 JS 讀寫引用的 token＝死佈局遺留（對任何元素 computed style 零影響）。
 * 為什麼這條鎖存在：T31/T32/T33 每個死碼維護窗都各自手寫一次性掃描器，且屢次踩同一種假陽性——
 *   把 CSS 註解裡的「.ax-foo 已移除」移除註記字串誤判成活引用。這裡用 stylesSrc()〔已剝註解〕
 *   當定義來源，並以「字首防撞」正則避開 T27 家族的子字串誤匹配（`--ax-gold` vs `--ax-gold-2`）。
 * 為什麼對 token 可靠、對 class 不可靠（E12 訊噪比教訓）：token 名無動態拼接
 *   （全庫零 `"--ax-" + 變數`；已於 2026-08-30 12:00 窗查證），而 class 大量以 `"ax-badge--" + tier`
 *   動態組出 ⇒ class 掃描必然假陽性、不落地；token 掃描是乾淨的。
 * ------------------------------------------------------------------------- */
var DEAD_TOKEN_TAIL = "(?![\\w-])"; // 字首防撞：--ax-gold 不得誤匹配 --ax-gold-2
function definedAxTokens(css) {
  var set = {}, re = /(--ax-[\w-]+)\s*:/g, m;
  while ((m = re.exec(css))) set[m[1]] = true;
  return Object.keys(set);
}
function tokenConsumed(name, css, jsHtml) {
  // ① 任一處 var(--name)（CSS 選擇器值、或 JS 字串內的 var()）
  if (new RegExp("var\\(\\s*" + name + DEAD_TOKEN_TAIL).test(css)) return true;
  if (new RegExp("var\\(\\s*" + name + DEAD_TOKEN_TAIL).test(jsHtml)) return true;
  // ② JS/HTML 內任何對該 token 名的字面出現（setProperty/getPropertyValue 動態讀寫端）
  if (new RegExp(name + DEAD_TOKEN_TAIL).test(jsHtml)) return true;
  return false;
}
selftest.register({
  id: "platform/dead-token-sweep", group: "platform", env: "node", tier: "fast",
  title: "死 token 常駐鎖：styles CSS 定義的每個 --ax-* 都要有 var()/JS 消費端（收斂 T31·防死佈局 token 回流）",
  run: function (t) {
    var css = stylesSrc(); // 已剝 CSS 註解 ⇒ 移除註記字串不會被誤當活引用（T31/T32/T33 屢踩的假陽性）
    var jsHtml = srcJsFiles().map(function (p) { return fs.readFileSync(p, "utf8"); }).join("\n") + "\n" + indexHtml();

    var defined = definedAxTokens(css);
    // 樣本量鎖：正則寫壞／來源讀空時 defined 會塌到 0，這條鎖就成永遠綠的空殼（2026-08-30 基準 61）
    t.ok(defined.length >= 50,
      "只掃到 " + defined.length + " 個 --ax-* token 定義（基準 61）⇒ 定義偵測規則已失效或 CSS 讀空，此鎖已失效");

    var dead = defined.filter(function (n) { return !tokenConsumed(n, css, jsHtml); });
    t.equal(dead.length, 0,
      "這些 --ax-* token 有定義卻無任何 var()/JS 消費端＝死佈局遺留（移除不影響任何 computed style）：" + dead.join("、"));

    /* 尺自身的雙向反向錨 —— 沒有這兩條，消費端偵測寫壞時整條鎖會靜默全綠（#135/#148 教訓）。 */
    t.equal(tokenConsumed("--ax-no-such-token-zz9", css, jsHtml), false,
      "反向錨：一個全庫不存在的假 token 竟被判為有消費端 ⇒ 消費端偵測恆真，本鎖無效");
    t.equal(tokenConsumed("--ax-border", css, jsHtml), true,
      "反向錨：已知被 var(--ax-border) 消費的 token 竟被判為死 token ⇒ 消費端偵測恆假，本鎖會誤報全站");
  }
});

/* ---------------------------------------------------------------------------
 * 中央掛鉤的 game 引數「有沒有被讀」（常駐鎖）
 *   —— platform/central-hook-fanout-roster 的**互補面**，不是它的雙胞胎。
 *
 * 那條鎖問的是「**有沒有被呼叫、拿到的數量對不對**」（扇出名冊 20 支＋押注側零白送＋
 * 兩把尺不互冒充＋record-once）。它**不問**下游拿到 game 之後有沒有看它一眼。
 *
 * 這一條問的就是那件事：中央點把 game 交出去了，收的人有沒有讀。
 *
 * 為什麼這是 CLAUDE.md §4「修一半而看不出來」家族：
 *   HL.challenges.record(game, bet, win) 的**簽名承諾了遊戲感知**——參數在那裡、
 *   中央點也確實每局傳真值進去——但函式體內對 game 的讀取次數是 **0**。
 *   於是「這個挑戰只在 slot 算」「本週指定遊戲命中 25×」這一整類促銷形制
 *   （Duelbits 的 monthly challenges *for selected games*、Gamdom 的 Game of the Week）
 *   在架構上做不出來，而**每一個既有的驗證面都是綠的**：
 *     · 扇出名冊 OK（challenges.record 確實被呼叫了）
 *     · 引數值鎖 OK（bet/win 都對）
 *     · record-once OK（只有一個呼叫點）
 *     · console 零錯誤、畫面完全正常、挑戰照常達成照常發獎。
 *   唯一的症狀是一個**做不出來的能力**，而沒有任何讀數在描述它。
 *
 * 有前例可證這不是假想風險：#89 修的是同一條線的**另一半**——當年
 *   HL.bonus.onWager 是這個中央掛鉤上「最後一個**收不到** game 的大消費端」，
 *   所以「這筆紅利只能在 slot 打流水」做不出來。#89 把 game 接上去之後，
 *   下一種形狀就是**收到了卻不讀**，而它比前一種更難看見（簽名看起來是完整的）。
 *
 * 做法（比照 dead-token-sweep / root-dom-contract-consumers 的名冊雙向等式）：
 *   射程是**掃出來的地面真相**，不是硬寫檔名——
 *     (1) 從 live-stats.js 的 record() 本體（去註解去字串）掃出所有
 *         HL.<ns>.<fn>(…) 呼叫點裡，**以裸識別字 game 當頂層引數**的那些
 *         （刻意不含 HL.ledger.record("bet", bet, { game: game }) 這種包在物件裡的，
 *           因為它的形參是 meta 而不是 game，位置對應會失真）；
 *     (2) 由 HL.<ns> = 解析定義檔，再由 HL.<ns> = { <fn>: <內部名> } 解出匯出別名
 *         （onWager: bOnWager／accrue: rbAccrue 這兩支就是靠這一步才找得到實作）；
 *     (3) 取「呼叫端 game 的位置」對應到「實作端同位置的形參名」，數它在函式體內的讀取次數。
 *   然後與宣告名冊做**雙向等式**：多一個未消費者＝新孤兒上線；少一個＝#149 落地了
 *   卻沒把它移出免罪名單（兩個方向都要紅，否則這條鎖會隨時間變成裝飾品）。
 *
 * 尺自身的反向錨（沒有這些，偵測寫壞時整條鎖會靜默全綠——#135/#148 的教訓）：
 *   · 假源碼「宣告 game 卻只用 bet/win」必須判 0 讀；真的讀 game 的必須判 >0。
 *   · **註解裡提到 game 不算讀**（08-30 08:00 窗 P5 的同型陷阱：用子字串/未剝註解當代理）。
 *   · **字串裡的 game 不算讀**。
 *   · **gameId／games／nextGame 不得誤匹配 game**（T27 家族的子字串誤匹配）。
 *   · 解析失敗（定義檔不唯一／找不到實作／位置無對應形參）一律**當場轉紅**，
 *     不得靜默跳過——否則被檢查的集合會默默變小（08-17 教訓）。
 * ------------------------------------------------------------------------- */

/* 2026-08-30 平台軌·14:00 窗基線：8 支下游收到裸 game，其中 7 支真的讀它。 */
var GAME_ARG_CONSUMED_BASELINE = [
  "achievements.record", "betlog.record", "bonus.onWager", "edge.weighted",
  "heat.record", "rakeback.accrue", "tournament.record"
].sort();
/* 免罪名單＝已知「收到 game 卻不讀」的下游。#149 落地時**必須把它從這裡移走**，
   否則下面 oMissing 那個方向會轉紅（這是刻意的摩擦：修完了要來改這裡）。 */
var GAME_ARG_ORPHAN_BASELINE = ["challenges.record"].sort();

function ghBalanced(s, i, open, close) {
  var d = 0, st = i;
  for (; i < s.length; i++) {
    if (s[i] === open) d++;
    else if (s[i] === close) { d--; if (d === 0) return s.slice(st + 1, i); }
  }
  return null;
}
/* 取具名函式的 (形參) 與函式體。回傳 null＝找不到（呼叫端必須當成紅，不得當成 0 讀）。 */
function ghFnOf(src, fnName) {
  var m = new RegExp("function\\s+" + fnName + "\\s*\\(([^)]*)\\)\\s*\\{").exec(src);
  if (!m) return null;
  var params = m[1].split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  var body = ghBalanced(src, src.indexOf("{", m.index + m[0].length - 1), "{", "}");
  if (body == null) return null;
  return { params: params, body: body };
}
/* 切頂層引數（字串已抹平，故只需尊重 () [] {}）。 */
function ghSplitArgs(s) {
  var out = [], d = 0, cur = "";
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (ch === "(" || ch === "[" || ch === "{") d++;
    else if (ch === ")" || ch === "]" || ch === "}") d--;
    if (ch === "," && d === 0) { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
/* HL.<ns> = { <fn>: <內部名> } 的匯出別名（onWager: bOnWager／accrue: rbAccrue）。 */
function ghExportAlias(src, ns, fn) {
  var m = new RegExp("HL\\." + ns + "\\s*=\\s*\\{").exec(src);
  if (!m) return null;
  var obj = ghBalanced(src, src.indexOf("{", m.index + m[0].length - 1), "{", "}");
  if (obj == null) return null;
  var am = new RegExp("(?:^|[,{\\s])" + fn + "\\s*:\\s*([A-Za-z_$][\\w$]*)").exec(obj);
  return am ? am[1] : null;
}
/* 形參讀取次數：帶字界防撞（gameId／games／nextGame／o.game 都不算），來源必須已去註解去字串。 */
function ghReads(body, param) {
  return (body.match(new RegExp("(?<![\\w$.])" + param + "(?![\\w$])", "g")) || []).length;
}
/* 掃出「以裸 game 當頂層引數」的下游名冊（地面真相，非硬寫）。 */
function ghRoster(liveStatsSrc) {
  var rec = ghFnOf(liveStatsSrc, "record");
  if (!rec) return null;
  var out = [], seen = {}, re = /HL\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g, m;
  while ((m = re.exec(rec.body))) {
    var raw = ghBalanced(rec.body, m.index + m[0].length - 1, "(", ")");
    if (raw == null) continue;
    var pos = ghSplitArgs(raw).indexOf("game");
    if (pos < 0) continue;
    var key = m[1] + "." + m[2];
    if (seen[key]) continue;
    seen[key] = 1;
    out.push({ ns: m[1], fn: m[2], key: key, pos: pos });
  }
  return out;
}

selftest.register({
  id: "platform/central-hook-game-arg-consumed", group: "platform", env: "node", tier: "fast",
  title: "中央掛鉤 game 引數消費：收到 game 的 8 支下游誰真的讀它＝名冊雙向等式（防「簽名承諾了遊戲感知、函式體卻從不看它」）",
  run: function (t) {
    var files = allSrcJs();
    function clean(p) { return noStrings(noComments(fs.readFileSync(p, "utf8"))); }

    var lsPath = path.join(SRC_DIR, "core", "live-stats.js");
    t.ok(fs.existsSync(lsPath), "core/live-stats.js 必須存在（中央結算點不得改名/搬家而本鎖無感）");
    var roster = ghRoster(clean(lsPath));
    t.ok(roster != null, "live-stats.js 內找不到 function record ⇒ 本鎖的入口已失效（不是零孤兒，是量不到）");
    roster = roster || [];

    /* 樣本量鎖：正則寫壞／來源讀空時 roster 會塌到 0，這條鎖就成永遠綠的空殼 */
    t.ok(roster.length >= 6,
      "只掃到 " + roster.length + " 支收到裸 game 的下游（2026-08-30 基準 8）⇒ 掃描規則已失效，此鎖已失效");

    /* 逐支解析實作端，數對應形參的讀取次數；解析失敗一律紅（不得靜默縮小集合） */
    var consumed = [], orphan = [], unresolved = [];
    roster.forEach(function (r) {
      var defRe = new RegExp("HL\\." + r.ns + "\\s*=");
      var hits = files.filter(function (f) { return defRe.test(noComments(fs.readFileSync(f, "utf8"))); });
      if (hits.length !== 1) { unresolved.push(r.key + "＝定義檔命中 " + hits.length + " 個"); return; }
      var src = clean(hits[0]);
      var alias = ghExportAlias(src, r.ns, r.fn);
      var f = ghFnOf(src, alias || r.fn) || ghFnOf(src, r.fn);
      if (!f) { unresolved.push(r.key + "＝在 " + path.basename(hits[0]) + " 找不到實作（別名 " + alias + "）"); return; }
      var p = f.params[r.pos];
      if (!p) { unresolved.push(r.key + "＝呼叫端 game 在第 " + r.pos + " 位，實作端沒有對應形參（形參 " + f.params.length + " 個）"); return; }
      (ghReads(f.body, p) > 0 ? consumed : orphan).push(r.key);
    });
    t.equal(unresolved.join("；"), "",
      "以下下游無法解析實作端 ⇒ 本鎖的射程被靜默縮小（比「有孤兒」更危險，因為它看起來是綠的）：" + unresolved.join("；"));

    /* 名冊雙向等式：兩個方向都要紅 */
    consumed.sort(); orphan.sort();
    var cMissing = GAME_ARG_CONSUMED_BASELINE.filter(function (k) { return consumed.indexOf(k) < 0; });
    var cExtra = consumed.filter(function (k) { return GAME_ARG_CONSUMED_BASELINE.indexOf(k) < 0; });
    t.equal(cMissing.join("、"), "",
      "這些下游原本會讀 game，現在不讀了 ⇒ 遊戲感知被靜默拆掉（畫面與其他所有鎖都不會有反應）：" + cMissing.join("、"));
    t.equal(cExtra.join("、"), "",
      "這些下游新讀了 game ⇒ 請把它們從免罪名單移進 GAME_ARG_CONSUMED_BASELINE（#149 落地時就是走這裡）：" + cExtra.join("、"));

    var oMissing = GAME_ARG_ORPHAN_BASELINE.filter(function (k) { return orphan.indexOf(k) < 0; });
    var oExtra = orphan.filter(function (k) { return GAME_ARG_ORPHAN_BASELINE.indexOf(k) < 0; });
    t.equal(oExtra.join("、"), "",
      "新的『收到 game 卻從不讀』下游上線了＝簽名承諾了遊戲感知但做不到，且每個既有驗證面都會是綠的：" + oExtra.join("、"));
    t.equal(oMissing.join("、"), "",
      "免罪名單裡的下游已經開始讀 game 了（#149？）⇒ 請把它移出 GAME_ARG_ORPHAN_BASELINE，別讓名單腐爛成裝飾品：" + oMissing.join("、"));
    t.equal(consumed.length + orphan.length, roster.length,
      "分類總數應等於名冊大小（" + consumed.length + "+" + orphan.length + " vs " + roster.length + "）");

    /* 尺自身的反向錨：偵測寫壞時上面每一條都會靜默全綠 */
    var fakeIgnores = "function record(game, bet, win) { return (bet || 0) + (win || 0); }";
    t.equal(ghReads(ghFnOf(fakeIgnores, "record").body, "game"), 0,
      "反向錨：一段明顯不讀 game 的假實作竟被判為有讀 ⇒ 讀取偵測恆真，本鎖永遠零孤兒");
    var fakeReads = "function record(game, bet, win) { if (game === \"slot\") return; }";
    t.ok(ghReads(ghFnOf(fakeReads, "record").body, "game") > 0,
      "反向錨：一段明顯有讀 game 的假實作竟被判為不讀 ⇒ 讀取偵測恆假，本鎖會把全部下游誤報成孤兒");

    /* 註解／字串／子字串三種假陽性（本庫踩過的原型：08-30 08:00 窗 P5、T27 家族） */
    var cmtOnly = noStrings(noComments("function record(game, bet, win) { /* game 只在註解裡 */ // game\n return bet; }"));
    t.equal(ghReads(ghFnOf(cmtOnly, "record").body, "game"), 0,
      "反向錨：註解裡提到 game 竟被算成讀取 ⇒ 與 08-30 08:00 窗 P5 同型的代理指標錯誤");
    var strOnly = noStrings(noComments("function record(game, bet, win) { return \"game\" + 'game'; }"));
    t.equal(ghReads(ghFnOf(strOnly, "record").body, "game"), 0,
      "反向錨：字串字面量裡的 game 竟被算成讀取");
    var subOnly = "function record(game, bet, win) { var gameId = 1, games = [], o = { nextGame: 2 }; return o.game; }";
    t.equal(ghReads(ghFnOf(subOnly, "record").body, "game"), 0,
      "反向錨：gameId／games／nextGame／o.game 竟被算成讀取裸 game ⇒ 子字串誤匹配（T27 家族）");

    /* 別名解析的反向錨：沒有它，onWager／accrue 兩支會落進 unresolved 而不是被真的量到 */
    var aliasSrc = "function bOnWager(bet, game) { return game; }\nHL.bonus = { onWager: bOnWager, add: 1 };";
    t.equal(ghExportAlias(aliasSrc, "bonus", "onWager"), "bOnWager",
      "反向錨：匯出別名解不出來 ⇒ bonus.onWager／rakeback.accrue 會被誤判成無法解析");
    t.equal(ghExportAlias(aliasSrc, "bonus", "noSuchFn"), null,
      "反向錨：不存在的匯出鍵竟解得出別名 ⇒ 別名解析恆真");
  }
});

/* ── 台帳 ↔ 卡的**雙向**錨點（2026-08-30 20:00 窗立）─────────────────────────
 * 【它守的是什麼】`intel/db/platform-modules.json` 的每一格 evidence 與 `BACKLOG.md` 的每一張卡，
 *   是同一件事的兩端：台帳說「這個缺口的出口是 #N」，卡說「我來自台帳分類 X」。
 *   `intel/tools/ledger-card-sweep.js` 原本**只走一個方向**（evidence 寫了 #N ⇒ 去看 #N 的狀態），
 *   而那個方向對「evidence 根本沒寫」與「evidence 寫錯卡號」兩種情形**結構上免疫**。
 * 【已經發生過的兩個實例（不是假想）】
 *   · 08-30 08:00 窗：「外觀/主題模式」evidence 寫「⇒ 開卡 #147」，實際開的是 #148。
 *     當下兩張都是 ⬜待批准 ⇒ 單向掃描解析得出、狀態合理、**零告警**；等 #147 先落地時，
 *     工具會叫我們把主題那條線標成「已關閉」，**而它一個字都沒接** ⇒ 台帳從此低報一個真缺口。
 *   · 本輪首跑反向掃描當場掃出 3 筆：#90（後台·已✅）／#106（功能·已✅）／#137（資安·⬜）——
 *     三張卡都明寫自己來自某台帳分類，而**該分類沒有任何模組記得它們**。前兩者是
 *     「缺口被自己的卡關掉、台帳卻連那張卡存在都不知道」＝單向掃描**永遠**掃不到（沒有 #N 可走）。
 * 【形狀】判準放在工具（`reverse()`，單一真相），這裡只斷言「未回指筆數為 0」，
 *   並附四道**反向錨**防它靜默轉綠——本鎖的危險不是誤報，是**掃不到東西時仍然全綠**：
 *   ① 卡表解析不到卡（BACKLOG 格式變了）② 分類讀不到（台帳結構變了）
 *   ③ 可比對的宣告卡歸零（判準退化成空集合 ⇒ 斷言變成恆真）
 *   ④ 比對子恆真（拿一個全庫不存在的卡號去比，必須答「沒有回指」）。
 * 【刻意不鎖正向】正向的「已回填？」是關鍵詞啟發式、誤報率不為零（見工具檔頭），
 *   鎖它會製造假警報疲勞。反向錨是精確比對（有沒有 #N 這個字），才適合當常駐鎖。 */
var ledgerSweep = (function () {
  try { return require(path.join(ROOT, "..", "intel", "tools", "ledger-card-sweep.js")); }
  catch (e) { return null; }
})();

selftest.register({
  id: "platform/ledger-card-anchor-bidirectional", group: "platform", env: "node", tier: "fast",
  title: "卡宣告來自台帳某分類時，該分類至少要有一個模組 evidence 回指這張卡（反向錨）",
  run: function (t) {
    if (!ledgerSweep || !ledgerSweep.reverse) t.skip("intel/tools/ledger-card-sweep.js 不可用或版本過舊");
    var rev = ledgerSweep.reverse();

    // 反向錨 ①②：兩端都要真的讀到東西，否則下面的斷言會在空集合上恆真。
    var cards = ledgerSweep.parseCards(
      require("fs").readFileSync(path.join(ROOT, "..", "BACKLOG.md"), "utf8").split(/\r?\n/));
    t.ok(Object.keys(cards).length >= 50,
      "BACKLOG 只解析到 " + Object.keys(cards).length + " 張卡 ⇒ 卡首行格式變了，本鎖會靜默轉綠");
    t.ok(rev.cats.length >= 8,
      "台帳只讀到 " + rev.cats.length + " 個分類 ⇒ platform-modules 結構變了，本鎖會靜默轉綠");

    // 反向錨 ③：可比對的宣告卡不得歸零（判準若退化成「沒有卡宣告來自台帳」，主斷言就變恆真）。
    var claimed = rev.rows.filter(function (r) { return r.anchored !== null; });
    t.ok(claimed.length >= 20,
      "只有 " + claimed.length + " 張卡宣告來自台帳且指名分類 ⇒ 判準或「來源：」欄解析退化了");

    // 反向錨 ④：比對子必須答得出「沒有」，而且要在**兩種**壞法下都答得出來。
    //   (a) 恆真：拿一個全庫不存在的卡號比，必須是 false。
    //   (b) 前綴誤匹配：`#14` 今天不是任何一張宣告卡、evidence 亦無此號，
    //       但它是 #140／#141／#142／#144／#145／#148／#149 的**前綴** ⇒ 比對子少了 `(?!\d)`
    //       那道界線時它會變成 true。(a) 抓不到這一種（`#999` 不是任何號碼的前綴）。
    if (ledgerSweep.anchoredFor) {
      t.equal(ledgerSweep.anchoredFor("999", rev.cats), false,
        "全庫不存在的卡號 #999 竟被判為有回指 ⇒ 比對子恆真（本鎖等於沒鎖）");
      t.equal(ledgerSweep.anchoredFor("14", rev.cats), false,
        "#14 竟被判為有回指 ⇒ 比對子把 #140／#144／#148 這種**前綴**誤當命中（少了 (?!\\d) 界線）。" +
        "若哪天真的有一張 #14 被寫進台帳，請換一個同樣『未被引用且為既有號碼前綴』的哨兵號碼");
    }

    // 主斷言：每一張宣告來自台帳分類的卡，該分類都要記得它。
    var orphan = claimed.filter(function (r) { return !r.anchored; });
    t.equal(orphan.length, 0,
      "有 " + orphan.length + " 張卡宣告來自台帳分類，但該分類任何模組 evidence 都沒有回指它：" +
      orphan.map(function (r) { return "#" + r.id + "[" + r.state + "]←「" + r.cats.join("／") + "」"; }).join("、") +
      "。修法＝在該分類**真正**對應的那個模組 evidence 補一句「⇒ 開卡 #N」（或據實改成正確卡號）；" +
      "若卡的來源欄寫錯了分類，就改卡不要改台帳。");
  }
});

// ── 保留上界必須是「可查詢的出口」，不得只以檔內字面常數存在 ──────────────────
//   （2026-08-31 平台軌 08:00 窗·台帳「資料」分類輪替時立）
// 為什麼需要這條：本輪審「資料」分類實測出一個**畫面說謊**的組合——
//   報表中心頁尾寫「僅顯示前 200 列；匯出為全部資料。」（en：the export contains everything），
//   但它的兩個玩家側資料來源**都有保留上界**且都不對玩家宣告：
//     · `core/betlog.js` CAP=500（環形緩衝，第 501 局把最舊那局丟掉）
//     · `core/activity.js` KEEP_DAYS=90（日桶，第 91 天前的資料掃掉）
//   ⇒ 重度玩家匯出的「全部資料」可能只涵蓋幾天，而 CSV 裡沒有任何一列說得出這件事。
//   真正的修法（期間軸＋水平線揭露）落在 **#151**，那要動首屏 eager 檔 ⇒ 卡在 #118 的位元組閘。
// 那本鎖現在守什麼：守**下一輪能不能修得動**。#138（本機存檔清冊）與 #151 都要「讀出每個
//   存檔的保留策略」；若這兩個既有上界只以檔內字面常數存在，實作輪只能**再抄一次 500／90**
//   ⇒ 立刻長出第二份真相（本庫 #94 踩過同型：RTP「只以顯示字串存在＝不可查詢」，
//   使那張卡的不變量沒有錨點可鎖，實作輪必須當場多開一張前置卡 #98 才走得下去）。
// 形狀刻意是**具名清冊 + 反向掃描**（不是通用啟發式掃描——那條路已由維護軌 E12 判 WON'T-DO：
//   訊噪比過低）。反向那半是 08-30「台帳查核工具只有一個方向」那一課的直接套用：
//   正向只證明「清冊上的兩筆還在」，證明不了「有沒有第三個沒被登記的上界」。
var RETENTION_ROSTER = [
  { file: "src/core/betlog.js",   ident: "CAP",       value: "500",
    kind: "rows", trunc: "out.length = cap",
    // 兩個出口都要驗：node 端 require 走 CORE、瀏覽器端消費者走 HL.betlog。
    // ⚠️ 這一欄是第一版**漏掉**的東西，而漏掉的後果正是本庫最常見的缺陷形狀：
    //    第一版只問「全檔任一處有沒有 `CAP: CAP`」⇒ 把瀏覽器出口整行刪掉時，
    //    node 端的 CORE 仍寫著同一串字，本鎖照樣全綠（負向擾動 P1 當場 MISSED）。
    //    ⇒ 一個上界有幾個消費面，就要逐面驗，不能問「有沒有人轉發過」。
    exits: ["var CORE =", "HL.betlog ="],
    why: "注單環形緩衝上限：第 CAP+1 局把最舊那局丟掉" },
  { file: "src/core/activity.js", ident: "KEEP_DAYS", value: "90",
    kind: "days", trunc: "var lo = today - keep",
    exits: ["var CORE ="],
    why: "活躍日桶保留天數＝任何消費者可問的最長視窗" }
];
// 取 anchor 之後第一個 `{` 到其配對 `}` 的區塊（這兩個出口物件內無字串含大括號；
// 取不出平衡區塊時回 null，由呼叫端 FAIL，不讓它靜默略過）
function objBlockAfter(src, anchor) {
  var i = src.indexOf(anchor);
  if (i < 0) return null;
  var s = src.indexOf("{", i);
  if (s < 0) return null;
  var depth = 0;
  for (var j = s; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") { depth--; if (depth === 0) return src.slice(s, j + 1); }
  }
  return null;
}
// 反向掃描範圍：玩家資料真正落地的三層（views 只畫、不持有保留策略）
var RET_SCAN_DIRS = ["core", "layout", "data"];
// 反向訊號 ②：保留期識別字（實測本庫僅 activity.js 命中 ⇒ 零噪音）
var RET_IDENT_RE = /\b(KEEP_DAYS|RETAIN_DAYS|RETENTION_DAYS|MAX_ROWS|MAX_LOG|CAP_ROWS)\b/;
// 反向訊號 ①：就地截斷持久陣列（`x.length = 0` 是清空/drain，不是保留策略 ⇒ 排除）
var RET_TRUNC_RE = /\.length\s*=\s*(?!0\b)[A-Za-z_$][\w$]*|\.length\s*=\s*[1-9]\d*/;

selftest.register({
  id: "platform/retention-bound-queryable", group: "platform", env: "node", tier: "fast",
  title: "每個保留上界都必須經模組公開出口轉發同一個識別字（且沒有第三個未登記的上界）",
  run: function (t) {
    var srcs = {};
    RETENTION_ROSTER.forEach(function (r) {
      var p = path.join(ROOT, r.file);
      var s = "";
      try { s = fs.readFileSync(p, "utf8"); } catch (e) { s = ""; }
      srcs[r.file] = s;
      t.ok(s.length > 0, "清冊指向讀不到的檔：" + r.file + " ⇒ 清冊過期，本鎖會在空字串上靜默轉綠");
    });

    // 反恆真錨 ①：清冊本身不得縮到失去意義。
    t.ok(RETENTION_ROSTER.length >= 2,
      "保留上界清冊只剩 " + RETENTION_ROSTER.length + " 筆 ⇒ 有人把不想修的那筆刪掉就能讓本鎖轉綠");

    RETENTION_ROSTER.forEach(function (r) {
      // 一律對**去註解後**的原始碼求值：`betlog.js` 檔頭註解裡就寫著
      // 「註冊於 window.HL.betlog = { record, list, … }」——那個假出口沒有 CAP，
      // 直接掃原文會先撞上它（第一版即如此誤判）。
      var s = stripComments(srcs[r.file] || "");
      if (!s) return;
      var declRe = new RegExp("var\\s+" + r.ident + "\\s*=\\s*" + r.value + "\\b", "g");
      var decls = s.match(declRe) || [];
      t.equal(decls.length, 1,
        r.file + " 的 " + r.ident + " = " + r.value + " 宣告出現 " + decls.length +
        " 次（應恰為 1）⇒ 同一個上界有兩個宣告點＝兩份真相（" + r.why + "）");

      // 出口必須**逐個**轉發識別字，不得在出口重打一次字面值
      //（重打＝改了宣告卻沒改出口時靜默不一致；只驗「任一處有轉發」＝P1 那種漏法）
      t.ok(r.exits && r.exits.length >= 1, r.file + " 清冊未宣告任何出口 ⇒ 轉發那半等於沒驗");
      (r.exits || []).forEach(function (anchor) {
        var blk = objBlockAfter(s, anchor);
        t.ok(blk !== null, r.file + " 取不到出口 `" + anchor +
          "` 的物件區塊（錨消失或大括號不平衡）⇒ 出口改名/搬家了，清冊需同步更新");
        if (blk === null) return;
        t.ok(blk.indexOf(r.ident + ": " + r.ident) >= 0,
          r.file + " 的出口 `" + anchor + "` 沒有轉發 `" + r.ident + ": " + r.ident +
          "` ⇒ 這一面的消費者查不到保留上界，#138／#151 只能再抄一次 " + r.value +
          "（＝本庫 #94「只以顯示字串存在＝不可查詢」的同型阻塞）");
        t.ok(!new RegExp(r.ident + "\\s*:\\s*" + r.value + "\\b").test(blk),
          r.file + " 的出口 `" + anchor + "` 寫成 `" + r.ident + ": " + r.value +
          "` ＝重打字面值 ⇒ 改宣告不會改出口，消費者拿到的是過期的上界");
      });

      // 上界還必須真的被消費（截斷點消失 ⇒ 常數還在、資料卻無限成長，清冊變成謊）
      t.ok(s.indexOf(r.trunc) >= 0,
        r.file + " 找不到截斷點 `" + r.trunc + "` ⇒ 常數還在但已不生效（或寫法改了），清冊需同步更新");
    });

    // ── 反向：有沒有第三個沒被登記的保留上界？（08-30「單向查核工具」那一課）──
    var owned = {}, scanned = 0, flagged = [];
    RETENTION_ROSTER.forEach(function (r) { owned[r.file] = 1; });   // 清冊一律寫正斜線
    RET_SCAN_DIRS.forEach(function (d) {
      var dir = path.join(ROOT, "src", d);
      var files = [];
      try { files = fs.readdirSync(dir).filter(function (f) { return /\.js$/.test(f); }); }
      catch (e) { files = []; }
      files.forEach(function (f) {
        var rel = "src/" + d + "/" + f;
        var s = fs.readFileSync(path.join(dir, f), "utf8");
        scanned++;
        // 去註解：說明文字裡提到 KEEP_DAYS／.length = 不算實作
        var code = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
        if (!RET_IDENT_RE.test(code) && !RET_TRUNC_RE.test(code)) return;
        if (owned[rel]) return;
        flagged.push(rel);
      });
    });
    // 反恆真錨 ②：掃描真的走過檔案（掃 0 檔時主斷言恆真）
    t.ok(scanned >= 60, "反向只掃到 " + scanned + " 支檔 ⇒ 目錄結構變了，反向那半等於沒跑");
    // 反恆真錨 ③：清冊上的兩支自己必須被掃到（否則「排除自己」的比對子可能整個失效）
    var selfSeen = RETENTION_ROSTER.filter(function (r) {
      var s = srcs[r.file] || "";
      var code = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
      return RET_IDENT_RE.test(code) || RET_TRUNC_RE.test(code);
    }).length;
    t.equal(selfSeen, RETENTION_ROSTER.length,
      "清冊上有 " + (RETENTION_ROSTER.length - selfSeen) + " 筆連自己的訊號都掃不出來 ⇒ 反向訊號式已與實作脫節，" +
      "它對**新出現**的上界同樣是瞎的（這正是本鎖反向那半唯一的用處）");

    t.equal(flagged.length, 0,
      "有 " + flagged.length + " 支檔出現保留上界的訊號卻不在清冊上：" + flagged.join("、") +
      "。修法＝若它真的是玩家資料的保留策略，加進 RETENTION_ROSTER 並補公開出口；" +
      "若只是暫存/佇列（非持久資料），把該處寫成 `.length = 0` 的清空語意或改名，別讓它看起來像保留策略。");
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 擴充性軸 · 中央結算掛鉤「單一下游缺席」耐受度（2026-08-31 平台軌 14:00 窗 · 台帳審「擴充性」輪立）
 * ---------------------------------------------------------------------------
 * 這條是 `platform/central-hook-fanout-roster`（08-27）的**互補面，不是雙胞胎**：
 *   · 那條問「**下游全載入**時，一注會不會恰好餵到名冊上那 20 支」（少一支＝子系統靜默斷線）。
 *   · 本條問「**任一支下游缺席**時，其餘 21 支會不會跟著一起沒收到」。
 * 兩者的射程差別在一個具體的失效模式上：`record()` 裡每一個用法今天都寫成
 *   `if (HL.<ns>) HL.<ns>.xxx(...)`，而這個守衛**沒有任何機械保證**——它是 22 個呼叫累積下來的慣例。
 * 少寫一次守衛的後果不是「那一格失效」，是 `record()` 當場 throw：
 *   ⇒ **它之後的所有下游這一局全部收不到**（帳本已記了 bet／注單沒落地／任務沒推進／JP 沒累積），
 *   ⇒ 而呼叫端（各遊戲 view）多半沒有 try/catch ⇒ 連自己的結算後續也一起斷。
 * 為什麼既有那條擋不住：它只跑 `runLiveStats({})`＝**所有下游都在**的那一種世界。
 *   守衛少一個時，那個世界裡什麼事都不會發生（(c) 全綠），只有在模組真的缺席時才炸。
 * 「模組真的會缺席嗎？」會，而且這件事只會變多：
 *   ① `omit: ["progressSrc"]` 的退化路徑（(g) 面）本身就是本庫已承認的缺席情境；
 *   ② #118／#110 的方向是把 core 往延遲載入搬 ⇒ 「還沒載到」就是缺席；
 *   ③ 真站/假站與會員/Demo 的組合下，不是每支模組都保證掛得起來。
 * ⇒ 立鎖時的兩個自問（CLAUDE.md §4）：
 *   「這條不變量有沒有反向？」有——本鎖雙向都紅：缺席那支的呼叫**不得**出現（否則 omit 沒生效、
 *      本鎖驗的是假世界），其餘各支**必須**全部出現（否則就是連坐）。
 *   「有沒有第二個消費者？」有——`edge` 是唯一被 harness 無條件提供的模組（它是 pull 型：
 *      `HL.edge.weighted(game,bet)` 被查詢而非被餵事件），所以本輪把 `omit` 的射程補到它身上；
 *      不補的話 22 支裡剛好是**最不像訂閱者的那一支**永遠測不到，而它的守衛與別人一樣脆。
 * ═══════════════════════════════════════════════════════════════════════════ */

/* progressSrc 缺席時會**多**出退化路徑的兩支（見 fanout-roster 的 (g) 面）；
   其餘模組缺席時只是少掉自己那幾支。這張表是唯一的例外清單，寫死＝新增例外必須是刻意的。 */
var HUB_ABSENCE_EXTRA = { progressSrc: ["vip.addWager", "season.record"] };

selftest.register({
  id: "platform/central-hook-tolerates-absent-downstream", group: "platform", env: "node", tier: "fast",
  title: "中央結算掛鉤：任一下游缺席時 record() 不得 throw，其餘下游一支都不許連坐",
  run: function (t) {
    var R0 = runLiveStats({});
    var BASE = R0.keysOf(R0.fire("dice", 100, 250));
    // 反恆真錨 ①：基線集合本身要有意義（取不到時下面每一條比對都會退化成空對空）
    t.ok(BASE.length >= 18, "扇出基線只有 " + BASE.length + " 支（應 ≥18）⇒ harness 或真檔已變，本鎖需同步更新");

    var mods = Object.keys(FANOUT_MODS).concat(["edge"]);
    // 反恆真錨 ②：受測模組數不得縮水（少列一支＝那支的守衛永遠不被驗）
    t.ok(mods.length >= 22, "只列了 " + mods.length + " 支下游（應 ≥22）⇒ FANOUT_MODS 被縮小，本鎖射程跟著縮");

    var threw = [], collateral = [], notOmitted = [], shrank = 0;
    mods.forEach(function (m) {
      var got = null, err = null;
      try {
        var R = runLiveStats({ omit: [m] });
        got = R.keysOf(R.fire("dice", 100, 250));
      } catch (e) { err = (e && e.message) || String(e); }
      if (err !== null) { threw.push(m + "（" + err + "）"); return; }
      var expect = BASE.filter(function (k) { return k.indexOf(m + ".") !== 0; })
        .concat(HUB_ABSENCE_EXTRA[m] || []).sort();
      var lost = expect.filter(function (k) { return got.indexOf(k) < 0; });
      var ghost = got.filter(function (k) { return expect.indexOf(k) < 0; });
      if (lost.length) collateral.push(m + " 缺席時連坐：" + lost.join("、"));
      if (ghost.length) notOmitted.push(m + " 缺席時仍出現：" + ghost.join("、"));
      if (got.length < BASE.length) shrank++;
    });

    // 反恆真錨 ③：omit 真的有效——至少 18 支缺席時集合確實變小（若 omit 整個失效，
    //   每一輪的 got 都等於 BASE，上面三個清單全空＝本鎖全綠而什麼都沒驗）
    t.ok(shrank >= 18, "只有 " + shrank + " 支缺席時扇出集合真的變小（應 ≥18）⇒ omit 已失效，本鎖驗的是同一個世界 22 次");

    t.equal(threw.join("；"), "",
      "以下下游缺席時 record() 直接 throw ⇒ **它之後的所有下游這一局全部收不到**（帳本記了 bet、" +
      "注單沒落地、任務沒推進），且各遊戲 view 沒有 try/catch 會一起斷：" + threw.join("；") +
      "。修法＝把該處寫成 `if (HL.<ns>) HL.<ns>.xxx(...)`，守衛與用法同一行。");
    t.equal(collateral.join("；"), "",
      "以下情形出現**連坐**：某支下游缺席，卻讓其他下游也收不到這一局 ⇒ " + collateral.join("；") +
      "。中央點的契約是『缺一支就少一格』，不是『缺一支就整局失守』。");
    t.equal(notOmitted.join("；"), "",
      "以下情形 omit 沒生效（缺席的模組仍被呼叫）⇒ 本鎖驗的是假世界：" + notOmitted.join("；"));
  }
});

/* ═══ 結算詞彙 × 登錄表 id 的前置互鎖（2026-09-01 平台軌 08:00 窗 · 金流台帳輪替時查獲）═══
 * 【口徑與射程全文見 tests/registry-probe.js 的「結算詞彙探針」檔頭】——含「為什麼是錢的問題」、
 *   `heat.matchGame` 已 fuzzy 繞過 vs `wagerScope.typeOf` 精確查表的對比、以及兩條來源
 *   （direct／engine）為何都要量。這裡只寫**鎖的形狀與取捨**，不重複那份說明。
 *
 * 【這條鎖為什麼是「互鎖」而不是直接斷言「詞彙必須全部對得上」】
 *   直接斷言今天就會紅（實測 7 筆不符），而**正確的修法動不了**：
 *     · 改結算端傳 id ⇒ `core/edge.js` 的 EDGE 表、`HL.betlog`／`HL.achievements`／`HL.heat`
 *       的 localStorage 歷史資料都以舊字串為鍵，改鍵＝既有玩家的注單/徽章/熱度**靜默歸零**；
 *       且 `HL.fair.floatOr("roulette")` 的公平串流命名與保真閘白名單也吃同一個字串。
 *     · 改 `core/wager-scope.js` 加一層詞彙解析 ⇒ 那是**首屏 eager** 檔，而 #118 未解前
 *       首屏餘裕只有 **27 bytes**（[P-FS]）⇒ 這一輪落不了地。
 *   ⇒ 本輪的正確落地物不是「修好」，是**不讓它變成活缺陷**：既有 7 筆維持現狀（棘輪不許成長），
 *   而「一旦有紅利宣告 scope 就會踩到」這條路**先用鎖封住**。修法卡見 BACKLOG #154。
 *
 * 【三層一起看才知道這條鎖補的是哪一層】
 *   收得到 game（`central-hook-fanout-roster`）→ 讀 game（`central-hook-game-arg-consumed`）
 *   → **查得到 game**（本鎖）。前兩層今天全綠，第三層在此之前沒有任何驗證面。
 */
var SETTLE_VOCAB_UNRESOLVED_BASELINE = [
  "Slots Battle",        // views/vsslot.js ×3       — 對戰未登錄為遊戲
  "roulette",            // views/table-roulette.js  — 舊 slug，登錄表是 european-roulette
  "小雞過馬路",          // views/chicken.js ×5      — 登錄表是 chicken-cross
  "暗影儀式",            // views/slot.js ×7         — 登錄表是 shadow-ritual（旗艦 slot）
  "賞金局 · 翻牌",       // views/bounty.js ×2       — 賞金局未登錄為遊戲
  "賞金局 · 踩地雷",     // views/bounty.js ×2       — 同上
  "跟注·百家樂"          // streamer.js/liveroom.js  — 跟注未登錄為遊戲
];

/* 互鎖判準抽成純函式，好讓下面能**打 fixture** 驗它自己的三個分支。
 * 2026-08-31 20:00 窗的教訓：「修好之後由構造成立」的性質拿真實檔案斷言等於恆真 ⇒ 空心鎖。
 * 這裡真實資料只餵最後一步，判準本身由 fixture 證明有鑑別力。 */
function settleVocabInterlock(unresolved, scopedSites) {
  return unresolved.length === 0 ? [] : scopedSites.slice();
}

selftest.register({
  id: "platform/settle-vocab-scoped-bonus-interlock", group: "platform", env: "node", tier: "fast",
  title: "結算詞彙 × 登錄表 id：不符集合不得成長；且只要還有不符，就不許有任何宣告 scope 的紅利上線",
  run: function (t) {
    var v = regProbe.settleVocab();

    /* ── 反恆真錨（任一失守，下面每一條都會退化成空對空而全綠）───────────────── */
    // ① 沙箱真的 boot 起來：失敗時 ids 塌成 0 ⇒ 全部鍵都「查不到」⇒ 棘輪與互鎖同時失去意義
    t.equal((v.sandboxFailed || []).join("；"), "",
      "首屏核心沙箱有檔案載入失敗 ⇒ 登錄表 id 讀不全，本鎖的『查不到』會是假的：" + (v.sandboxFailed || []).join("；"));
    t.ok(v.ids.length >= 40,
      "沙箱只讀到 " + v.ids.length + " 筆登錄表 id（2026-09-01 基準 65）⇒ 登錄表沒 boot 完整，本鎖已失效");
    // ② 詞彙表樣本量：掛鉤正則寫壞時 keys/sites 會塌到 0
    t.ok(v.keys.length >= 25,
      "只掃到 " + v.keys.length + " 個結算詞彙鍵（2026-09-01 基準 29）⇒ 掃描規則已失效，此鎖已失效");
    t.ok(v.sites >= 45,
      "只掃到 " + v.sites + " 個結算/引擎呼叫點（2026-09-01 基準 52）⇒ 掃描規則已失效，此鎖已失效");
    // ③ 兩條來源都要有命中：少量一邊 ⇒ 那一邊的不符型別完全隱形
    //    （實測唯一的「舊 slug」型不符 `roulette` 只出現在 engine 側）
    var viaDirect = v.keys.filter(function (k) { return v.srcOf[k] === "direct" || v.srcOf[k] === "both"; });
    var viaEngine = v.keys.filter(function (k) { return v.srcOf[k] === "engine" || v.srcOf[k] === "both"; });
    t.ok(viaDirect.length >= 12,
      "direct 側只有 " + viaDirect.length + " 個鍵（基準 15）⇒ 各 view 直呼掛鉤那條路沒量到");
    t.ok(viaEngine.length >= 10,
      "engine 側只有 " + viaEngine.length + " 個鍵（基準 14）⇒ betPanel/betArea 那條路沒量到，" +
      "所有 dice/limbo/plinko/cases 與六款桌遊會一起隱形（含 roulette 型不符）");
    // ④ 比對器真的會解析成功：若鍵↔id 比對寫壞，resolved 會塌到 0 而 unresolved 變成全部
    t.ok(v.resolved.length >= 18,
      "只有 " + v.resolved.length + " 個鍵解析成功（基準 22）⇒ 鍵↔登錄表 id 的比對已寫壞");

    /* ── 棘輪：不符集合不得成長 ───────────────────────────────────────────── */
    var extra = v.unresolved.filter(function (k) { return SETTLE_VOCAB_UNRESOLVED_BASELINE.indexOf(k) < 0; });
    t.equal(extra.join("、"), "",
      "新的『結算詞彙查不到登錄表 id』上線了：" + extra.map(function (k) { return "「" + k + "」＠" + (v.at[k] || []).join("／"); }).join("；") +
      "。⇒ 它在 `HL.wagerScope.typeOf` 眼中是 unknown，一旦有紅利宣告 scope，這款遊戲的流水" +
      "對那筆紅利貢獻 0（standard preset 無 rest）。**修法＝結算端改傳登錄表 id**（`HL.games.all()` 裡的 id），" +
      "不是把它加進基線。");

    /* ── 基線防腐：基線不得腐爛成裝飾品（兩個方向都要紅）───────────────────── */
    var gone = SETTLE_VOCAB_UNRESOLVED_BASELINE.filter(function (k) { return v.keys.indexOf(k) < 0; });
    t.equal(gone.join("、"), "",
      "基線列的這些鍵已經不在結算詞彙裡了（改名或該呼叫點被刪）⇒ 請把它移出基線，" +
      "否則基線會慢慢變成一份沒人對得上的清單：" + gone.join("、"));
    var fixed = SETTLE_VOCAB_UNRESOLVED_BASELINE.filter(function (k) { return v.resolved.indexOf(k) >= 0; });
    t.equal(fixed.join("、"), "",
      "基線列的這些鍵已經對得上登錄表 id 了（有人修了！）⇒ 請把它移出 SETTLE_VOCAB_UNRESOLVED_BASELINE，" +
      "讓棘輪往下走一格：" + fixed.join("、"));

    /* ── 互鎖判準自身：打 fixture 證明三個分支都有鑑別力（不是恆回空陣列）──────── */
    t.equal(settleVocabInterlock([], [{ at: "x:1" }]).length, 0,
      "fixture：詞彙全部對得上時，互鎖必須**自動釋放**（否則它會變成永久禁令，修好也解不開）");
    t.equal(settleVocabInterlock(["k"], [{ at: "x:1" }]).length, 1,
      "fixture：還有不符 + 已有 scoped 紅利 ⇒ 必須報 1 筆違規（這條是本鎖的存在理由）");
    t.equal(settleVocabInterlock(["k"], []).length, 0,
      "fixture：還有不符但沒人用 scope ⇒ 不得誤報（今天的真實狀態就是這格）");

    /* ── 互鎖：真實資料 ──────────────────────────────────────────────────── */
    var scoped = regProbe.scopedBonusSites();
    var violations = settleVocabInterlock(v.unresolved, scoped);
    t.equal(violations.map(function (s) { return s.at; }).join("、"), "",
      "結算詞彙還有 " + v.unresolved.length + " 筆查不到登錄表 id（" + v.unresolved.join("、") + "），" +
      "卻已經有紅利宣告了 `scope`：" + violations.map(function (s) { return s.at; }).join("、") +
      "。⇒ 那些遊戲的流水對這筆紅利會**靜默計 0**，玩家看不出來、其他每個驗證面都是綠的。" +
      "先修 BACKLOG #154（結算詞彙解析），再開 scope。");
  }
});

/* ───────────────────────────────────────────────────────────────────────────
 * 莊家優勢的第二份真相：`core/edge.js` 的 EDGE 表 × `data/game-rtp.js` 的登記值
 * （平台軌 2026-09-01 14:00 窗 · 台帳輪替審「功能」時查獲）
 *
 * 【為什麼需要這條】全站有**兩處**都寫著「這款遊戲的莊家優勢是多少」：
 *   · `data/game-rtp.js`（#98/#103 的權威 RTP 登記表，`edgeOf(id)` ＝ 100 − RTP）
 *   · `core/edge.js` 的 `EDGE`（**管錢那一份**：#50 的 VIP/賽季加權 + #60 的返水計價基準）
 *   兩份在**交集的每一筆上數值完全一致**（本輪實測 12/12 逐位相同）——而這正是沒人發現
 *   問題的原因：**它們從不「打架」，只會「缺席」**，而缺席在設計上是靜默退化的：
 *     `edgeOf()` 查不到 → `weightFor()` 回 NEUTRAL 1.00×、`rakebackCore.rateFor()` 回舊制。
 *
 * 【它真的漏過一次】`moles`（2026-08-21 上架、保真閘解析證明 RTP 恰 98.0000%、已登記進
 *   `game-rtp.js`）**從未進 EDGE 表**，漏了 11 天：
 *     · 進度面：每注 VIP／賽季經驗拿 1.00× 而非 1.23×（假站）＝比同為 2.00% edge 的 `pump`
 *       少約 19%，而兩款遊戲的莊家優勢一模一樣 ⇒ 玩家可觀測、可重現的不一致。
 *     · 金錢面：返水退回 #60 之前的「押注額基準」。moles 這次的損害很小（legacy 假站頂階
 *       1.8% ÷ 理論莊收 2.0% ＝ 90%，正確值 87.5%），**但那是運氣不是設計**——因為 moles 的
 *       edge 恰好貼近校準均值 2.0613%。同樣的漏登記發生在 1.00% edge 的 originals 家族時，
 *       legacy 假站頂階會吐回理論莊收的 **180%**（每注淨虧）——而那個數字正是 #60 檔頭
 *       親口寫下、宣稱已被「型別安全」根除的那一個。⇒ **不變量被恢復了，但它的逃生門
 *       沒有守衛**：只要有人上架新遊戲而忘了登記本表，就從逃生門走回舊世界。
 *
 * 【所以本鎖鎖的是「逃生門」而不是「值」】game-rtp 登記了單值 RTP 的每一款，EDGE 必須
 *   同值覆蓋；豁免只允許**明列且寫明理由**，且豁免清單兩個方向都會腐爛告警。
 *   ⚠️ 本鎖刻意**不禁止**「未登記＝退化」這個行為本身（反向錨 ⑤ 反而斷言它還在）——
 *   漏登記仍應退化而非歸零／報錯，這是 #60「不懲罰玩家」的紀律；本鎖只保證
 *   「**已經知道 edge 的遊戲**不會走到那條退化路徑上」。
 * ─────────────────────────────────────────────────────────────────────────── */
var EDGE_RTP_EXEMPT = {
  "chicken-cross":
    "結算端傳的是顯示名「小雞過馬路」而非 id（#154 的不符集合成員）⇒ 以 `chicken-cross` 為鍵" +
    "登記進 EDGE 也永遠不會被查到，登記等於自我安慰。須待 #154 結算詞彙收斂後一併處理。",
  "bounty":
    "設計恆等式 edge＝0（費用＝期望贏額，非校準值）⇒ 以 edge 計價的返水恰為 0。" +
    "「0 edge 的遊戲要不要發返水」是產品決策，不是漏登記；且其結算鍵同樣是顯示名（#154）。"
};

selftest.register({
  id: "platform/edge-table-covers-rtp-registry", group: "platform", env: "node", tier: "fast",
  title: "莊家優勢單一真相：game-rtp 登記單值 RTP 的每一款，core/edge 必須同值覆蓋（漏登記＝返水退回舊制）",
  run: function (t) {
    var RTP = require(path.join(ROOT, "src", "data", "game-rtp.js"));
    var E = require(path.join(ROOT, "src", "core", "edge.js"));

    /* ── 反恆真錨：任一失守，下面每一條都會退化成空對空而全綠 ─────────────── */
    var ids = RTP.ids();
    t.ok(ids.length >= 18,
      "game-rtp 只列舉到 " + ids.length + " 筆（2026-09-01 基準 18）⇒ 登記表沒載齊，本鎖形同虛設");
    var edgeKeys = Object.keys(E.EDGE);
    t.ok(edgeKeys.length >= 23,
      "EDGE 表只有 " + edgeKeys.length + " 筆（2026-09-01 基準 23）⇒ 表被截斷，覆蓋比對失去意義");
    t.ok(typeof RTP.edgeOf("dice") === "number" && typeof E.edgeOf("dice") === "number",
      "兩邊的 edgeOf() 都必須對已知款回數值（任一回 null ⇒ 下面的比對全部變成 vacuous）");

    /* ── 覆蓋：單值 RTP 的每一款都要在 EDGE 裡、且同值 ───────────────────── */
    var missing = [], diff = [];
    ids.forEach(function (id) {
      if (RTP.isParameterized(id)) return;          // 參數化款見反向錨 ④（#103 裁決：不混進單值 API）
      if (EDGE_RTP_EXEMPT[id]) return;              // 明列豁免見下方棘輪
      var want = RTP.edgeOf(id), got = E.edgeOf(id);
      if (got === null) { missing.push(id + "（game-rtp 記 edge " + want.toFixed(3) + "%）"); return; }
      if (Math.abs(got - want) > 0.005) diff.push(id + "（edge.js " + got + "% vs game-rtp " + want.toFixed(3) + "%）");
    });
    t.equal(missing.join("、"), "",
      "這些遊戲的 RTP 早就登記過了，但**管錢的那份 EDGE 表沒有**：" + missing.join("、") +
      "。⇒ 它們的 VIP／賽季進度會拿 1.00×（同 edge 的其他遊戲拿更多），且返水**退回 #60 之前的" +
      "押注額基準**——低 edge 遊戲上這代表返水可能超過該注的理論莊家收入。" +
      "修法＝在 core/edge.js 的 EDGE 補一列（值取 100 − 已登記 RTP），不是把它加進豁免。");
    t.equal(diff.join("、"), "",
      "同一款遊戲的莊家優勢在兩處對不上：" + diff.join("、") +
      "。⇒ 兩份真相已經開始漂移；請以 game-rtp（保真閘證明過的那份）為準修正 EDGE。");

    /* ── 豁免清單防腐：兩個方向都要會紅 ─────────────────────────────── */
    var exemptIds = Object.keys(EDGE_RTP_EXEMPT);
    t.ok(exemptIds.length <= 2,
      "豁免清單長到 " + exemptIds.length + " 筆＝棘輪在往回走（豁免只能減不能加）");
    var rotted = exemptIds.filter(function (id) { return ids.indexOf(id) < 0; });
    t.equal(rotted.join("、"), "",
      "豁免清單列的這些 id 已經不在 game-rtp 登記表裡了（改名或被移除）⇒ 請移出豁免，" +
      "否則清單會慢慢變成沒人對得上的裝飾品：" + rotted.join("、"));
    var nowCovered = exemptIds.filter(function (id) { return E.edgeOf(id) !== null; });
    t.equal(nowCovered.join("、"), "",
      "豁免清單列的這些 id 已經被登記進 EDGE 了（有人修了！）⇒ 請移出 EDGE_RTP_EXEMPT 讓棘輪往下走一格：" +
      nowCovered.join("、"));
    exemptIds.forEach(function (id) {
      t.ok(String(EDGE_RTP_EXEMPT[id]).length >= 40, "豁免 " + id + " 必須寫明理由（空理由＝下一手看不出能不能刪）");
    });

    /* ── 反向錨 ①：本輪修好的那一格（leak site） ──────────────────────── */
    t.close(E.edgeOf("moles"), 2.00, 1e-9,
      "moles 的 edge 應為 2.00%（＝100 − 保真閘解析證明的 98.0000%）；這是本鎖成立當天補上的那一筆");
    t.close(E.weightFor("moles", "demo"), E.weightFor("pump", "demo"), 1e-9,
      "moles 與 pump 的莊家優勢同為 2.00% ⇒ 兩者的假站進度倍率必須逐位相同（漏登記時 moles 是 1.00×）");

    /* ── 反向錨 ②：返水確實吃到 edge（否則補了表也沒用） ─────────────────── */
    var RB = require(path.join(ROOT, "src", "core", "rakeback-core.js"));
    t.ok(RB.rateFor(E.edgeOf("moles"), "demo", 4) < RB.legacyRate("demo", 4),
      "補登 moles 後，其假站頂階返水率必須低於舊制退化率（＝真的改吃 edge 基準、不再走逃生門）");
    t.ok(RB.rateFor(E.edgeOf("moles"), "demo", 4) < E.edgeOf("moles") / 100,
      "返水率必須小於該注的理論莊家收入比例（#60 的核心不變量，補登後對 moles 才成立）");

    /* ── 反向錨 ③：未登記者仍須「退化而非歸零」（本鎖不得把紀律改壞） ─────────── */
    t.ok(E.edgeOf("no-such-game-xyz") === null, "未登記遊戲的 edgeOf 應為 null");
    t.close(E.weightFor("no-such-game-xyz", "demo"), 1.00, 1e-9, "未登記遊戲的加權倍率應維持中性 1.00×");
    t.ok(RB.rateFor(null, "demo", 4) > 0, "未登記遊戲的返水仍須為正（漏登記只退化、不懲罰玩家）");

    /* ── 反向錨 ④：參數化款刻意不在射程內，但不得因此變成看不見的破口 ─────────── */
    var pIds = RTP.parameterizedIds();
    t.ok(pIds.indexOf("plinko") >= 0, "plinko 應仍是參數化款（#103 裁決 (c)）；若不是，本鎖的排除條款需重寫");
    var rng = RTP.rangeOf("plinko");
    t.ok(E.edgeOf("plinko") !== null, "參數化款雖不比對數值，仍必須在 EDGE 表內（否則整款走退化路徑）");
    t.ok(E.edgeOf("plinko") <= (100 - rng.max) + 1e-9,
      "plinko 的 EDGE 單值 " + E.edgeOf("plinko") + "% 必須 ≤ 其 9 種設定中**最小**的 edge " +
      (100 - rng.max).toFixed(4) + "%（低估＝返水少發＝房家安全側；高估會讓返水超過理論莊收）");
  }
});

// ── #49 活動日曆：不得上架「在這個站別結構上不可得」的活動 ────────────────────
/* 為什麼這條鎖現在才立（2026-09-01 平台軌·20:00 窗台帳輪替審「活動」7 模組時查獲）：
 *   `core/rain.js` 紅包雨狀態機的**唯一驅動點**是 `layout/chat.js` 的 `HL.rain.tick()`，
 *   而它坐在 `startAuto()` 的 `if (HL.site.isLive()) return;` **之後**——同一道閘一次關掉
 *   假聊天訊息與 RainBot 自動紅包雨（chat.js 的行內註解也明寫了這件事）⇒ **真站上紅包雨永不發生**。
 *   但 `core/promo-cal.js` 的 rain spec 上架條件本輪之前只寫 `avail: !!HL.rain`＝模組載入了就上架、
 *   從不問站別 ⇒ 真站玩家在 #49 活動日曆看得到「🌧️ 聊天室灑幣 · 常設 · 在聊天室活躍即可分得」，
 *   點下去開聊天室、橫幅永遠空白、一場雨都不會來。
 *   **畫面每一格都是正常的：日曆照常排序、node 全綠、console 零錯誤。**
 *   ⇒ CLAUDE.md §4「修一半而看不出來」家族的又一例：閘裝在「會不會發生」那一半，
 *      沒裝在「要不要跟玩家宣告它會發生」那一半。
 *
 *   同檔另外六個活動**不是**同一形狀（本輪逐筆查過，故本鎖敢把射程放到全部 spec 而不只 rain）：
 *   raffle／tournament 的 isLive 閘只清掉假券與假 bot，機制本身在真站照跑；
 *   happyhour／luckyspin／season／safetynet 根本沒有站別閘。rain 是唯一「整台機器都在閘後面」的。
 *
 * 這條鎖刻意守**雙向**（單向會漏掉相反方向的退化）：
 *   ① 真站不得上架 rain（本輪修的那一格）。
 *   ② 假站必須照常上架 rain（不得矯枉過正，把 demo 的活動也一起關掉）。
 *   ③ 「demo 有、live 沒有」的集合必須**恰好**是 ["rain"]：多一個＝又有一個活動變成不可得，
 *      少一個＝本修法被還原。要改這份名單，得先證明那個活動在真站真的跑得起來。
 *   ④ 反向源碼錨：rain 的驅動點必須**仍在** chat.js 的 isLive 早退之後。哪天有人替真站接上
 *      真正的驅動（例如伺服器見證者），①③ 就變成錯的 ⇒ 這條會轉紅，逼人回來重看日曆這一側。
 *   ⑤ 尺自身的反向錨：對照組 spec（avail 恆真）必須在**兩個站別都上架**。
 *      沒有這條，「live 查不到 rain」可能只是因為 list() 在 live 恆空＝空心的尺。 */
selftest.register({
  id: "platform/promo-cal-hides-undrivable", group: "platform", env: "node", tier: "fast",
  title: "#49 日曆不得宣告在此站別跑不起來的活動：真站 rain 整則不出現／假站照常上架／差集恰為 [rain]／驅動點仍在 isLive 閘後",
  run: function (t) {
    var SRC = path.join(ROOT, "src");
    var store = {}, HL = {}, SITE = { m: "demo" };
    var doc = { readyState: "complete", addEventListener: function () {}, createTextNode: function (s) { return { t: s }; } };
    var win = { HL: HL, document: doc, setTimeout: function () {}, setInterval: function () { return 0; },
                clearInterval: function () {}, addEventListener: function () {} };
    win.window = win;
    HL.dom = {
      el: function (tag, attrs, kids) { return { tag: tag, attrs: attrs || {}, kids: kids || [] }; },
      money: function (n) { return "$" + n; }, dhm: function (ms) { return Math.round(ms / 3600000) + "h"; },
      lsGet: function (k, d) { return store[k] === undefined ? d : store[k]; },
      lsSet: function (k, v) { store[k] = v; },
      dayNum: function () { return 20000; }
    };
    HL.ui = { toast: function () {}, modal: function () {}, kv: function () { return {}; }, closeTop: function () {} };
    HL.games = { byId: function () { return null; }, title: function (g) { return g.id; }, launch: function () {} };
    HL.bonus = { add: function () {} }; HL.notify = { add: function () {} };
    // 真/假站軸（CLAUDE.md §4 的第三軸）：本鎖只切這一顆旋鈕，其餘輸入逐位不動
    HL.site = { mode: function () { return SITE.m; }, isLive: function () { return SITE.m === "live"; },
                ns: function () { return SITE.m === "live" ? "r:" : ""; } };

    function loadReal(rel) {
      var err = null;
      try { new Function("window", "document", "HL", fs.readFileSync(path.join(SRC, rel), "utf8"))(win, doc, HL); }
      catch (e) { err = e.message; }
      return err;
    }
    // ⚠️ 刻意不 skip：shim 載不起來就 FAIL（skip 會讓「shim 過時」與「不變量壞掉」在輸出上同形）
    var e1 = loadReal(path.join("core", "rain.js"));
    t.equal(e1, null, "rain.js 必須能以 shim 載入（驗的即玩的，不用假模組替身）：" + e1);
    var e2 = loadReal(path.join("core", "promo-cal.js"));
    t.equal(e2, null, "promo-cal.js 必須能以 shim 載入：" + e2);
    if (e1 || e2) return;
    var P = HL.promoCal;

    // 其餘活動模組給最小替身：它們在不在，兩個站別下**完全相同** ⇒ 不影響差集的意義
    HL.raffle = {}; HL.tournament = {}; HL.happyhour = {}; HL.season = {}; HL.luckyspin = {};
    HL.safetynet = { status: function () { return { enabled: true }; } };
    // ⑤ 對照組：一個不問站別的活動，用來證明 list() 在真站不是恆空（否則本鎖是空心的）
    P.register({ id: "z-control", name: "對照組", cat: "測試", sched: "always", avail: function () { return true; } });

    function idsIn(mode) {
      SITE.m = mode;
      return P.list().map(function (e) { return e.id; });
    }
    var demoIds = idsIn("demo"), liveIds = idsIn("live");

    // ⑤ 先證尺不是空心的
    t.ok(liveIds.indexOf("z-control") >= 0,
      "真站的 list() 必須仍會上架不問站別的活動（實測 live 上架 " + liveIds.length + " 則）；" +
      "若這條紅了，代表 list() 在真站恆空 ⇒ 下面「查不到 rain」什麼都證明不了");
    t.ok(demoIds.indexOf("z-control") >= 0, "假站的 list() 必須同樣上架對照組");

    // ② 假站照常（不得矯枉過正）
    t.ok(demoIds.indexOf("rain") >= 0,
      "假站必須照常上架 rain——真站關掉不代表要連 demo 一起關；demo 的聊天室每 3–5 分鐘真的會下一場");

    // ① 真站整則不出現（本輪修的那一格）
    t.ok(liveIds.indexOf("rain") < 0,
      "真站不得上架 rain：狀態機唯一驅動點在 chat.js 的 isLive 早退之後 ⇒ 一場雨都不會來，" +
      "宣告它＝預告一個玩家永遠拿不到的獎（promo-cal.js 自己的註解：不合格者一律不出現而不是灰掉）");

    // ③ 差集必須恰為 ["rain"]（棘輪：多一個＝新的不可得活動；少一個＝本修法被還原）
    var demoOnly = demoIds.filter(function (id) { return liveIds.indexOf(id) < 0; }).sort();
    t.equal(demoOnly.join(","), "rain",
      "「假站有、真站沒有」的活動集合必須恰好是 [rain]，實測 [" + demoOnly.join(",") + "]。" +
      "要加名字進來，得先證明那個活動在真站真的跑不起來；要拿掉，得先證明它跑得起來");

    /* ④ 反向源碼錨：驅動點仍須在 isLive 早退之後。
     *    這是唯一會讓 ①③ 從「正確」變成「錯誤」的改動，所以它必須也被鎖住。 */
    var chat = fs.readFileSync(path.join(SRC, "layout", "chat.js"), "utf8").split(/\r?\n/);
    var iStart = -1, iGate = -1, iTick = -1;
    chat.forEach(function (ln, i) {
      if (iStart < 0 && /function\s+startAuto/.test(ln)) iStart = i;
      if (iStart >= 0 && iGate < 0 && /isLive\(\)\)\s*return/.test(ln)) iGate = i;
      if (iTick < 0 && /HL\.rain\.tick\(\)/.test(ln)) iTick = i;
    });
    t.ok(iStart >= 0, "chat.js 必須仍有 startAuto()（rain 的驅動掛在它身上）");
    t.ok(iTick >= 0, "chat.js 必須仍是 HL.rain.tick() 的呼叫點");
    t.ok(iGate >= 0 && iGate > iStart && iGate < iTick,
      "rain 的驅動必須仍坐在 startAuto() 的 isLive 早退之後（實測 startAuto:" + (iStart + 1) +
      " 閘:" + (iGate + 1) + " tick:" + (iTick + 1) + "）。" +
      "若真站哪天接上了真正的驅動，這條會先紅——那時要回頭把日曆這一側一起改回上架");

    /* ④-b rain.js 本身不得長出第二個驅動（自己排 timer 就繞過了 chat.js 那道閘）。 */
    var rainSrc = fs.readFileSync(path.join(SRC, "core", "rain.js"), "utf8");
    t.ok(!/set(Interval|Timeout)\s*\(/.test(rainSrc),
      "rain.js 不得自己排計時器：狀態機的驅動權必須留在 chat.js 那一道站別閘後面");

    /* ⑥ 零回歸：本修法只動 rain 那一格，不得順手改到別人的上架條件。 */
    ["raffle", "tournament", "happyhour", "season", "safetynet", "luckyspin"].forEach(function (id) {
      var sp = P.sources().filter(function (s) { return s.id === id; })[0];
      t.ok(sp && !/isLive/.test(String(sp.avail)),
        id + " 的 avail 不得含站別判斷（本輪逐筆查過：它們的 isLive 閘只清假券/假 bot，機制在真站照跑）");
    });
  }
});

/* ===================== 跟注的下注前閘：行為級鎖（2026-09-02 平台軌·資安輪） =====================
 * 缺陷原文：`layout/streamer.js` 的子母畫面(PiP)跟注**真扣餘額、真派彩、真的記進中央結算點**，
 *   卻**完全不問 `HL.rg`** ⇒ 玩家設了單注上限、進入冷靜期、甚至**自我排除進行中**，
 *   在 PiP 上照樣跟得下去。而通往 PiP 的按鈕，就在整頁直播間裡那顆已經被擋住的跟注鈕旁邊
 *   （`views/liveroom.js` 的「📺 切換子母畫面」）⇒ 被擋 → 換個表面 → 照下。
 *
 * ⭐ 為什麼它能躲這麼久（比缺陷本身更值得記）：**限額的「記帳面」是普世的，「執行面」是逐點手寫的。**
 *   記帳面只有一個入口——`core/live-stats.js` 的中央結算點尾端呼叫 `HL.rg.record(bet, win)`，
 *   而 PiP 跟注**有**走中央結算點 ⇒ 這一注**照樣被算進今日已用額度**、面板數字完全正確。
 *   ⇒ 缺的是「擋」，不是「算」；於是每一個看得見的讀數都是對的，只有真的去撞限額才會發現擋不住。
 *
 * 本鎖刻意用**真的 streamer.js + 真的 responsible.js 實跑**（不用替身），只切「有沒有設限」一顆旋鈕。
 * 不變量：① 未設限時必須扣得下去（尺不是空心的）② exclude/cool/單注上限 三種都必須擋
 *        ③ 擋下時餘額逐位不變（不能「擋了但錢已經扣」）④ 兩個孿生消費端都必須有閘（源碼側）
 *        ⑤ 反向錨：記帳面必須仍掛在中央結算點（它一旦也變成逐點手寫，本缺陷的隱形機制就消失，
 *           那時這條會紅，提醒回頭重寫本鎖的敘述）。 */
selftest.register({
  id: "platform/follow-bet-rg-gate", group: "platform", env: "node", tier: "fast",
  title: "主播跟注（PiP／整頁）必須受限額閘約束：自我排除/冷靜期/單注上限下不得扣款，未設限時照常",
  run: function (t) {
    var SRC = path.join(ROOT, "src");

    function findByClass(root, cls) {
      var hit = null;
      (function w(n) {
        if (!n || hit) return;
        if (n.attrs && String(n.attrs.class || "").split(/\s+/).indexOf(cls) >= 0) { hit = n; return; }
        var k = n.kids || [];
        for (var i = 0; i < k.length && !hit; i++) w(k[i]);
      })(root);
      return hit;
    }
    function mkEl(tag, attrs, kids) {
      var node = {
        tag: tag, attrs: attrs || {}, kids: kids || [], style: {}, parentNode: null, textContent: "",
        appendChild: function (c) { this.kids.push(c); if (c) c.parentNode = this; return c; },
        removeChild: function (c) { this.kids = this.kids.filter(function (x) { return x !== c; }); return c; },
        addEventListener: function () {}, setAttribute: function () {},
        classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
        querySelector: function (sel) { return findByClass(this, String(sel).replace(/^\./, "")); }
      };
      (node.kids || []).forEach(function (c) { if (c && typeof c === "object") c.parentNode = node; });
      return node;
    }

    /* 開一個乾淨世界，載入真的 responsible.js + streamer.js，套用情境後點一次跟注鈕。
     * 回傳 {before, after, blocked, toast, loadErr}。 */
    function clickFollow(scenario) {
      var store = {}, HL = {}, toasts = [], panel = null, BAL = { v: 100000 };
      var doc = { readyState: "complete", addEventListener: function () {},
                  createTextNode: function (s) { return { t: s }; },
                  body: { appendChild: function (c) { panel = c; } } };
      var win = { HL: HL, document: doc, setTimeout: function () {}, setInterval: function () { return 0; },
                  clearInterval: function () {}, clearTimeout: function () {}, addEventListener: function () {} };
      win.window = win;
      HL.dom = { el: mkEl, money: function (n) { return "$" + n; },
                 lsGet: function (k, d) { return store[k] === undefined ? d : store[k]; },
                 lsSet: function (k, v) { store[k] = v; },
                 dayNum: function () { return 20000; }, clear: function () {} };
      HL.state = { bal: function () { return BAL.v; }, setBal: function (v) { BAL.v = v; } };
      HL.ui = { toast: function (m) { toasts.push(String(m)); }, modal: function () {},
                kv: function () { return mkEl("div"); }, closeTop: function () {} };
      HL.chat = { createRoom: function () { return { footer: function () { return mkEl("div"); },
                  fillScroll: function () {}, addMsg: function () {}, startAuto: function () {}, stopAuto: function () {} }; } };
      HL.liveTable = { ensure: function () {}, result: function () { return { winner: "banker", pt: 5, bt: 7 }; } };
      // 記帳面照真的接線走（liveStats 尾端喂 rg.record）＝重現「算得到卻擋不住」的原始條件
      HL.liveStats = { record: function (g, bet, wn) { if (HL.rg) HL.rg.record(bet, wn); } };
      HL.site = { mode: function () { return "demo"; }, isLive: function () { return false; }, ns: function () { return ""; } };
      HL.ticker = { add: function () {}, clearAll: function () {} };
      HL.router = { go: function () {} }; HL.views = {};

      function load(rel) {
        try { new Function("window", "document", "HL", fs.readFileSync(path.join(SRC, rel), "utf8"))(win, doc, HL); return null; }
        catch (e) { return e.message; }
      }
      var e1 = load(path.join("core", "responsible.js")); if (e1) return { loadErr: "responsible.js: " + e1 };
      var e2 = load(path.join("layout", "streamer.js")); if (e2) return { loadErr: "streamer.js: " + e2 };

      scenario(HL);
      HL.streamer.open({ name: "AI Luna", gameName: "百家樂", side: "banker", bet: 20, viewers: "1" });
      var btn = findByClass(panel, "ax-streamer__followbtn");
      if (!btn) return { noBtn: true };
      var before = BAL.v;
      btn.attrs.onClick();
      return { before: before, after: BAL.v, blocked: BAL.v === before, toast: toasts.slice(-1)[0] || "" };
    }

    // ① 尺不是空心的：未設任何限額時，這一注**必須真的扣得下去**
    //    沒有這條，下面三條「沒扣款」可能只是因為跟注在 shim 下根本按不動。
    var base = clickFollow(function () {});
    t.equal(base.loadErr, undefined, "真檔必須能以 shim 載入（載不起來就 FAIL，不 skip）：" + base.loadErr);
    if (base.loadErr) return;
    t.equal(base.noBtn, undefined, "找不到跟注鈕 ⇒ 本鎖無法證明任何事（面板結構被改？）");
    t.equal(base.blocked, false,
      "對照組（未設限額）必須扣得下去，實測扣了 " + (base.before - base.after) + " 元。" +
      "這條紅了代表下面三條的『沒扣款』毫無意義＝空心的尺");
    t.equal(base.before - base.after, 20, "對照組應恰好扣掉 cur.bet（20），實測 " + (base.before - base.after));

    // ②③ 三種限額都必須擋住，且擋住時餘額**逐位不變**
    [
      { id: "excl-6m", how: function (HL) { HL.rg.setPause("excl-6m"); }, why: "自我排除進行中（最強的鎖：玩家已明確要求把自己關在門外）" },
      { id: "cool-1d", how: function (HL) { HL.rg.setPause("cool-1d"); }, why: "冷靜期進行中" },
      { id: "bet-single", how: function (HL) { HL.rg.setLimit("bet-single", 5); }, why: "單注上限 5 元 < 本注 20 元" }
    ].forEach(function (c) {
      var r = clickFollow(c.how);
      t.equal(r.loadErr, undefined, c.id + " 情境載入失敗：" + r.loadErr);
      if (r.loadErr) return;
      t.equal(r.blocked, true,
        "【" + c.id + "】" + c.why + "，PiP 跟注仍扣了 " + (r.before - r.after) + " 元 ⇒ 限額擋不住跟注。" +
        "補一行 `if (HL.rg && !HL.rg.check(b)) return;` 於 streamer.js 的 follow()");
      t.equal(r.after, r.before, "【" + c.id + "】被擋下時餘額必須逐位不變（不得「擋了但錢已經扣」）");
      t.ok(/自我排除|冷靜期|已達/.test(r.toast),
        "【" + c.id + "】被擋下時必須讓玩家知道為什麼（實測 toast：" + JSON.stringify(r.toast) + "）");
    });

    // ④ 孿生消費端：兩個真扣真派的跟注表面都要有閘（源碼側，防其中一邊日後被還原）
    [
      { f: "views/liveroom.js", why: "整頁直播間跟注" },
      { f: "layout/streamer.js", why: "子母畫面(PiP)跟注" }
    ].forEach(function (c) {
      var clean = stripComments(fs.readFileSync(path.join(SRC, c.f), "utf8"));
      t.ok(/HL\.rg\.check\s*\(/.test(clean),
        c.f + "（" + c.why + "）沒有下注前閘。這兩個表面之間只隔一顆「切換子母畫面」按鈕，" +
        "一邊有閘一邊沒有＝玩家被擋住後換個表面就能繼續下注");
    });

    /* ⑤ 反向錨：記帳面必須仍掛在中央結算點。
     *    這條不是為了守記帳（那有它自己的鎖），而是**守住本鎖敘述的前提**：
     *    正因為「算」是普世的、「擋」是逐點的，漏閘才會完全隱形。哪天記帳也變成逐點手寫，
     *    這條會紅，提醒回來重寫上面那段根因說明——否則後人會照著一個已經不成立的解釋找 bug。 */
    var ls = stripComments(fs.readFileSync(path.join(SRC, "core", "live-stats.js"), "utf8"));
    t.ok(/HL\.rg\.record\s*\(/.test(ls),
      "core/live-stats.js 已不再於中央結算點呼叫 HL.rg.record ⇒ 限額的記帳面不再普世，" +
      "本鎖檔頭「算得到卻擋不住」的根因敘述需要重寫");
  }
});

/* ── 2026-09-02 平台軌（14:00 窗）：報表讀取失敗**不得與「真的沒有資料」同形** ──────────────
 * 查獲的形狀：`core/reports.js` 的 `rowsOf` 用 `catch (e) { return []; }` 把「rows() 拋錯」壓成空陣列，
 * 於是三個表面同時說了不同程度的假話——① 中心頁寫「這張報表目前沒有資料。」；② `csvOf` 回**只有表頭**的
 * 字串，而它是**非空**的 ⇒ `download()` 的 `if (!text) return false` 判不出來，真的寫出一個空檔；
 * ③ toast 因此報「已匯出 CSV」。玩家手上有 500 局注單也一樣，且 catch 不留痕、console 全乾淨。
 * ⇒ 這條鎖守的是「兩態必須可辨別」，並附三個反錨（見下），因為單看 ① 很容易做出「一律報錯」的假修法。
 * ⭐ 量程錨（照 08-02 那條「尺的量程漏了一段」的教訓）：`HL.reports.download` 的**消費者不只中心頁**
 *   ——`core/betlog.js` 的注單面板是第二個，本輪就是它讓「只修一半」現形（i18n 棘輪先抓到死鍵）。
 *   所以這裡直接數消費者、並要求每個消費者的失敗訊息都不得指定原因。 */
selftest.register({
  id: "platform/reports-error-not-empty", group: "platform", env: "node", tier: "fast",
  title: "報表 rows() 拋錯不得與「沒有資料」同形：CSV 連表頭都不給、失敗訊息不指定原因、消費者全數覆蓋",
  run: function (t) {
    // (a) 行為級·真檔真註冊：注單報表的來源拋錯
    var bad = loadReports({ betThrows: true });
    var ob = {};
    t.equal(bad.rowsOf("betlog", {}, null, ob).length, 0, "拋錯時取列應回空陣列（不得往外拋）");
    t.ok(!!ob.err, "拋錯必須經第四參數 out.err 據實回報，否則呼叫端無從分辨");
    t.equal(bad.csvOf("betlog"), "", "拋錯的報表連表頭都不給（表頭是非空字串＝download 會寫檔並報成功）");

    // (b) 反向錨①：真的沒有資料**不得**被誤報成失敗，且仍給表頭 ⇒ 兩態輸出必須不同
    var none = loadReports({ betRows: [] });
    var on = {};
    t.equal(none.rowsOf("betlog", {}, null, on).length, 0, "空注單同樣是 0 列");
    t.ok(!on.err, "真的沒有資料不得被標成失敗（擋掉「一律報錯」的假修法）");
    t.ok(none.csvOf("betlog").length > 0, "真的沒有資料仍應給得出表頭");
    t.ok(bad.csvOf("betlog") !== none.csvOf("betlog"), "「壞掉」與「沒資料」的 CSV 輸出必須不同（本鎖的核心）");

    var rp = fs.readFileSync(REPORTS_SRC, "utf8");
    // (c) 反向錨②：(a) 之所以有意義，靠的是 download() 那條「csvOf 回空就寫不出檔」的連結still
    t.ok(rp.indexOf("if (!text) return false;") > -1,
      "download() 必須保留 `if (!text) return false`——沒有它，(a) 的空字串斷言等於空心");
    t.ok(/catch \(e\) \{ if \(out\) out\.err = e; return \[\]; \}/.test(rp),
      "rowsOf 的 catch 必須把失敗寫進 out（回到裸 return [] 就是回到缺陷）");

    // (d) 中心頁必須把兩態分開講（只修資料層、畫面照樣寫「沒有資料」＝修一半）
    t.ok(rp.indexOf("o.err || !rows.length") > -1, "draw() 的空狀態判斷必須把 o.err 算進去");
    t.ok(rp.indexOf("這張報表讀取時出錯") > -1, "中心頁必須有一句「讀取出錯」而不是沿用「沒有資料」");
    t.ok(rp.indexOf("o.err ? \"—\"") > -1, "「報表列數」在失敗時不得照報 0（0 是一個看起來很正常的謊）");

    // (e) 失敗訊息不得指定原因 + (f) 量程錨：download 的消費者全數覆蓋
    var CAUSE = /匯出失敗（[^）]*(瀏覽器|不支援)/;
    var consumers = [];
    (function walk(dir) {
      fs.readdirSync(dir).forEach(function (n) {
        var p = path.join(dir, n), st = fs.statSync(p);
        if (st.isDirectory()) return walk(p);
        if (!/\.js$/.test(n)) return;
        var src = fs.readFileSync(p, "utf8");
        // reports.js 自己是第一個消費者（它呼叫的是本檔內的 download）；其餘一律經 HL.reports.download
        if (/reports\.download\s*\(/.test(src) || n === "reports.js") consumers.push(p);
        t.equal(CAUSE.test(src), false,
          path.relative(ROOT, p) + " 的匯出失敗訊息指定了原因（瀏覽器不支援）——報表讀取出錯時那句話是假的");
      });
    })(SRC_DIR);
    t.ok(consumers.length >= 2,
      "只數到 " + consumers.length + " 個 download 消費者（應 ≥2：中心頁 + 注單面板）⇒ 尺的量程漏了一段，" +
      "而下面「每個消費者都用同一句」的檢查會零樣本通過");
    consumers.forEach(function (p) {
      t.ok(fs.readFileSync(p, "utf8").indexOf("匯出失敗（未寫出檔案）") > -1,
        path.relative(ROOT, p) + " 呼叫了 download 卻沒有那句不指定原因的失敗訊息＝這個表面被漏掉了");
    });
  }
});

/*
 * 可停靠面板還原座標必須落在當前視窗內（平台軌 2026-09-02 20:00 窗 · 擴充性輪）
 * ---------------------------------------------------------------------------
 * 缺陷原文：`HL.dock` 把玩家拖曳後的座標持久化在 `ax:dock:v1`（跨站原生 key），而
 *   `relayout()` 的自訂座標分支**原樣套用**存下的 px。夾法只寫在 `HL.dom.makeDraggable`
 *   的 pointermove 裡 ⇒ **只守了「寫入」那半**：拖曳中確實拖不出畫面，但「還原」那半
 *   沒有任何守衛。於是在寬視窗（雙螢幕／最大化）把聊天室拖到右側存下 `left:2190px`，
 *   之後換窄視窗（筆電螢幕／半寬視窗／**瀏覽器放大縮放也會縮 innerWidth**）開站，
 *   面板**整塊落在畫面外**。
 * ⭐ 為什麼它完全不像壞了（§4「修一半而看不出來」家族）：
 *   · `isOpen(id)` 仍回 true、`order` 仍含它 ⇒ 每個讀數都是對的。
 *   · FAB 只是把一個看不見的面板原地開/關（toggle → close → open 回到同一組座標）。
 *   · 專為「避免堆疊座標殘留」而存在的 resize 重排，**刻意 early-return 跳過自訂座標者**
 *     ＝正好跳過唯一會出畫面的那一群。
 *   · 全站**沒有任何重設佈局的出口**（`grep ax:dock:v1` 僅 dock.js 自己）⇒ 玩家在這台
 *     裝置上永久失去該面板（夥伴／聊天／成長進度三者之一），只能自己清 localStorage。
 * ⭐ 只有 dock 有這個形狀：`makeDraggable` 另兩個消費者（live-stats 浮窗、GameFrame PiP）
 *   都是 session 內拖曳、**不持久化座標** ⇒ 沒有「還原」那半可以漏。故本鎖把「唯一會還原
 *   持久化座標的表面」釘死在 dock，多一個表面開始存座標時 (e) 會紅、要求它一起走 clampPos。
 * 修法：夾法抽成 `HL.dom.clampPos`（單一份），拖曳與還原**兩個消費者共用**；還原時
 *   刻意**不回寫** `layout`——夾是「這次怎麼顯示」，不是「玩家擺哪」，回到寬視窗要回到原位。
 * 本鎖用**真的 core/dom.js + 真的 layout/dock.js 實跑**（不用替身），只切「視窗多寬」一顆旋鈕。
 */
selftest.register({
  id: "platform/dock-restores-onscreen", group: "platform", env: "node", tier: "fast",
  title: "可停靠面板還原持久化座標時必須夾進當前視窗（拖曳與還原共用同一份夾法，且不得覆寫玩家擺放）",
  run: function (t) {
    var SRCD = path.join(ROOT, "src");
    var PANEL_W = 360, PANEL_H = 480;

    function mkEl() {
      var n = {
        attrs: {}, kids: [], style: {}, textContent: "",
        appendChild: function (c) { if (c) n.kids.push(c); return c; },
        addEventListener: function () {}, setAttribute: function () {},
        classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
        getBoundingClientRect: function () { return { left: 0, top: 0, width: PANEL_W, height: PANEL_H }; },
        offsetWidth: PANEL_W, offsetHeight: PANEL_H
      };
      return n;
    }

    /* 開一個乾淨世界：載入真的 dom.js + dock.js，套用「視窗尺寸 + 已存座標」後開一個面板。
     * 回傳 { left, top, right, isOpen, resize(), reopen(), stored(), loadErr }。 */
    function world(vw, vh, stored) {
      var store = {}, HL = {}, listeners = {};
      if (stored) store["ax:dock:v1"] = JSON.stringify(stored);
      var doc = { documentElement: { clientWidth: vw }, body: mkEl(),
                  createElement: mkEl, createTextNode: function (s) { return { t: s }; } };
      var win = { HL: HL, document: doc, innerWidth: vw, innerHeight: vh,
        localStorage: { getItem: function (k) { return store[k] === undefined ? null : store[k]; },
                        setItem: function (k, v) { store[k] = String(v); } },
        setTimeout: function () { return 0; }, clearTimeout: function () {},
        addEventListener: function (ev, f) { (listeners[ev] = listeners[ev] || []).push(f); } };
      win.window = win;
      var err = null;
      ["core/dom.js", "layout/dock.js"].forEach(function (rel) {
        if (err) return;
        try { new Function("window", "document", "HL", fs.readFileSync(path.join(SRCD, rel), "utf8"))(win, doc, HL); }
        catch (e) { err = rel + ": " + e.message; }
      });
      if (err) return { loadErr: err };
      HL.dom.el = mkEl;                        // el() 需要真 document；本鎖只量座標
      HL.dom.makeDraggable = function () {};   // 拖曳綁定不在射程（夾法本身另由 (f) 驗）
      HL.dock.register({ id: "chat", title: "聊天室" });
      HL.dock.open("chat");
      var root = HL.dock.build("chat").root;
      return {
        left: function () { return root.style.left; }, top: function () { return root.style.top; },
        right: function () { return root.style.right; },
        isOpen: function () { return HL.dock.isOpen("chat"); },
        resize: function () { (listeners.resize || []).forEach(function (f) { f(); }); HL.dock.relayout(); },
        reopen: function () { HL.dock.toggle("chat"); HL.dock.toggle("chat"); },
        stored: function () { try { return JSON.parse(store["ax:dock:v1"]).chat.pos; } catch (e) { return null; } },
        clamp: function (x, y) { return HL.dom.clampPos(root, x, y); }
      };
    }

    // (a) 尺不是空心的：沒有存座標時，桌機面板必須真的被排出來（走 right 堆疊、left 留空）。
    //     沒有這條，下面「還原後在畫面內」可能只是因為面板在 shim 下根本沒被定位。
    var base = world(1280, 900, null);
    t.equal(base.loadErr, undefined, "真檔必須能以 shim 載入（載不起來就 FAIL，不 skip）：" + base.loadErr);
    if (base.loadErr) return;
    t.equal(base.isOpen(), true, "對照組面板必須真的開著（否則本鎖在量一個沒開的面板）");
    t.equal(base.right(), "16px", "對照組應走自動堆疊（right:16px），實際：" + base.right());
    t.equal(base.left(), "", "對照組不應有內聯 left（那是自訂座標分支的痕跡）");

    // (b) 正向：在寬視窗存下的座標（left:2190 於 2560 寬視窗合法），換 1280 寬視窗還原後
    //     面板必須**整塊在畫面內**（可見上界 left ≤ 1280-360 = 920）。
    var narrow = world(1280, 900, { chat: { pos: { left: "2190px", top: "120px" } } });
    var lx = parseFloat(narrow.left()), ty = parseFloat(narrow.top());
    t.ok(lx + PANEL_W <= 1280, "還原後面板右緣超出視窗：left=" + narrow.left() +
      "（視窗寬 1280、面板寬 " + PANEL_W + " ⇒ 上界 920）⇒ 玩家在這台裝置上再也看不到這個面板");
    t.ok(lx >= 0, "還原後面板左緣為負：left=" + narrow.left());
    t.equal(narrow.left(), "920px", "還原應夾到可見上界（920px），實際：" + narrow.left());
    t.equal(narrow.top(), "120px", "縱向本來就在畫面內，不該被動到，實際：" + narrow.top());

    // (c) 夾完之後仍必須站得住：resize 重排一次、以及玩家按 FAB 關再開，都不得又跑出畫面。
    //     （resize 那條特別重要：那個 handler 刻意跳過自訂座標者，正是缺陷藏身處。）
    narrow.resize();
    t.equal(narrow.left(), "920px", "resize 重排後又跑掉了：" + narrow.left());
    narrow.reopen();
    t.equal(narrow.left(), "920px", "關再開後又跑掉了：" + narrow.left());

    // (d) 縱向同理：視窗高 900、面板高 480 ⇒ 可見上界 top = 420。
    var low = world(1280, 900, { chat: { pos: { left: "100px", top: "860px" } } });
    t.equal(low.top(), "420px", "還原後面板下緣超出視窗（縱向沒夾）：top=" + low.top());
    t.equal(low.left(), "100px", "橫向本來就在畫面內，不該被動到：" + low.left());

    // (e) **不得覆寫玩家的擺放**：夾是「這次怎麼顯示」。回到寬視窗必須逐位回到玩家原本擺的位置，
    //     且存檔不得被夾後的值改寫（否則「換一次小視窗」就永久沒收了玩家的佈局）。
    t.equal(JSON.stringify(narrow.stored()), JSON.stringify({ left: "2190px", top: "120px" }),
      "還原時把夾後的座標回寫進存檔＝玩家原本的擺放被小視窗永久沒收，實際：" + JSON.stringify(narrow.stored()));
    var wide = world(2560, 1400, { chat: { pos: { left: "2190px", top: "120px" } } });
    t.equal(wide.left(), "2190px", "回到寬視窗應原樣還原玩家座標，實際：" + wide.left());
    t.equal(wide.top(), "120px", "回到寬視窗應原樣還原玩家座標，實際：" + wide.top());

    // (f) 夾法不是恆等函式（反向錨：防「clampPos 被改成 return {left:x,top:y}」而上面全綠）。
    var c1 = base.clamp(99999, 99999);
    t.equal(c1.left, 1280 - PANEL_W, "clampPos 沒有夾右緣（可能已被改成恆等），實得 " + c1.left);
    t.equal(c1.top, 900 - PANEL_H, "clampPos 沒有夾下緣，實得 " + c1.top);
    var c2 = base.clamp(-500, -500);
    t.equal(c2.left, 0, "clampPos 沒有夾左緣，實得 " + c2.left);
    t.equal(c2.top, 8, "clampPos 沒有夾頂緣（應為 8），實得 " + c2.top);
    // 視窗比面板還窄 ⇒ 下界優先，不得回負值（否則面板會被推到畫面左外側）
    var c3 = base.clamp(900, 40);
    t.ok(c3.left >= 0, "視窗窄於面板時 clampPos 回了負值：" + c3.left);

    // (g) **只有一份夾法**（量程錨）：dock.js 不得自己算夾法，必須向 HL.dom.clampPos 要；
    //     而 makeDraggable 也必須走同一份 ⇒ 兩個消費者共用一條規則，不會各自漂移。
    var strip = function (s) { return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1"); };
    var dockSrc = strip(fs.readFileSync(path.join(SRCD, "layout", "dock.js"), "utf8"));
    var domSrc = strip(fs.readFileSync(path.join(SRCD, "core", "dom.js"), "utf8"));
    t.ok(/HL\.dom\.clampPos\s*\(/.test(dockSrc), "dock.js 還原座標時必須呼叫 HL.dom.clampPos（否則夾法會被抄成第二份）");
    /* ⚠️ 這條的口徑刻意**不是**「dock.js 不得讀視窗寬」——首版就是那樣寫的，當場被自己的
     *   基線抓紅：`isMobile()` 本來就合法地讀 clientWidth||innerWidth 判 720px 斷點。
     *   夾法的**辨識特徵是「視窗尺寸減去面板尺寸」**，即 offsetWidth/offsetHeight 那一半
     *   （dock.js 現況 0 命中）＋ Math.min/max 夾取。⇒ 只禁這兩樣，不禁讀斷點。 */
    t.equal(/offsetWidth|offsetHeight/.test(dockSrc), false,
      "dock.js 出現面板尺寸運算＝夾法有了第二份真相（會與拖曳那份漂移），請一律走 HL.dom.clampPos");
    t.equal(/Math\.(min|max)\s*\(/.test(dockSrc), false,
      "dock.js 自己夾座標＝夾法有了第二份真相，請一律走 HL.dom.clampPos");
    t.ok(/function clampPos/.test(domSrc), "core/dom.js 必須是 clampPos 的唯一定義處");
    t.ok(/clampPos\s*\(host,\s*ox\s*\+/.test(domSrc) || /=\s*clampPos\s*\(/.test(domSrc),
      "makeDraggable 的 pointermove 必須也走 clampPos（兩個消費者共用同一份夾法）");
    var clampBodies = domSrc.split("Math.max(8,").length - 1;
    t.equal(clampBodies, 1, "core/dom.js 出現 " + clampBodies + " 份「頂緣 8」夾法＝夾法被抄成多份");

    // (h) 載入序錨：dock.js 的還原路徑硬相依 HL.dom.clampPos（刻意不寫成「取不到就沿用舊行為」，
    //     那正是 #110 的反面教訓：規則靜默退回舊行為而畫面看起來完全正常）⇒ dom.js 必須先載入。
    var s = staticScripts(indexHtml());
    var iDom = s.indexOf("./src/core/dom.js"), iDock = s.indexOf("./src/layout/dock.js");
    t.ok(iDom >= 0 && iDock >= 0, "index.html 必須同時掛載 core/dom.js 與 layout/dock.js");
    t.ok(iDom < iDock, "載入序錯：core/dom.js 必須早於 layout/dock.js（否則還原座標時 clampPos 不存在會拋）");

    // (i) 唯一會「還原持久化座標」的表面仍然只有 dock（多一個就得一起走 clampPos）。
    //     形制同 promo-cal 的 rain 差集棘輪：把「恰好是誰」釘死，多或少都要回來重想。
    var restorers = [];
    (function walk(dir) {
      fs.readdirSync(dir).forEach(function (f) {
        var p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) return walk(p);
        if (!/\.js$/.test(f)) return;
        var c = strip(fs.readFileSync(p, "utf8"));
        // 「把存下來的座標寫回 style」的痕跡：同檔同時有持久化 key 的讀取與 style.left 指派
        if (/localStorage|lsGet/.test(c) && /style\.left\s*=/.test(c) && /pos\b/.test(c)) {
          restorers.push(path.relative(SRCD, p).replace(/\\/g, "/"));
        }
      });
    })(SRCD);
    t.equal(restorers.join(","), "layout/dock.js",
      "會還原持久化座標的表面集合變了（實際：" + restorers.join("、") + "）⇒ 新表面必須也走 clampPos，" +
      "否則它會重演本鎖修掉的那個缺陷；確認後把本斷言的期望值一併更新");
  }
});

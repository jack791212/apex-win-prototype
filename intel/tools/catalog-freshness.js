#!/usr/bin/env node
/*
 * 遊戲候選庫新鮮度判準（intel/tools/catalog-freshness.js）— 維護軌 2026-09-12 12:00 窗
 * ---------------------------------------------------------------------------------
 * 【它取代了什麼】`apexwin-maintain` SKILL 第 2 步舊的 G6 一行判準：
 *     status === "candidate" && (now - last_verified) > stale_days   ⇒ 警報
 *   這條規則在 2026-09-12 被遊戲軌當場拆穿（CONTROL 已回應區·10:00 窗），而拆穿的方式是
 *   **逐筆去問那 30 個名字各自是什麼**：LOW 15／LOW-MED 11／NONE 1／UNASSESSED 2／MED 1。
 *   ⇒ **29/30 早就下過定論**，而那句定論一律是「這款機制有沒有被我方 built 覆蓋」。
 *
 * 【病根｜這是 CLAUDE.md §4 家族的又一形狀：射程排除了真相所在的位置】
 *   ① **它催的東西不隨日曆腐壞**：「rage-of-egypt 與 Gem Storm 重疊」講的是**我們自己的遊戲庫**，
 *      不是外面的世界。它只在**我方 built[] 改變**時才需要重算；拿日曆去催，每一次都只是把
 *      同一句話重打一遍＝`ban_busywork_heartbeat` 要擋的那種工作（08-05~08-14 四輪 G6 重驗
 *      有大半是這樣過去的）。
 *   ② **它對真正會腐壞的那一類是盲的**：規則寫死 `status === "candidate"`，於是
 *      **`specd`（已寫完保真規格、排在建置管線頂端的那些）被結構性排除**。實測四筆 specd
 *      有三筆同樣超過 7 天（outsourced-2 9.2d＝我方宣告的第一順位建置候選、space-knight 10.2d、
 *      bubble-up 7.2d），**警報一聲都不出**。
 *   ③ **缺 `last_verified` 的條目被 `continue` 靜默跳過**——最該被催的（完全沒驗過）反而不計。
 *
 * 【新判準｜把「會不會腐壞」寫成兩個獨立的軸，而不是一條日曆】
 *   軸 A（日曆）＝ decayable：這筆的內容**取決於外面的世界**，所以會隨時間腐壞。
 *      · status "specd"          → 建置管線頂端，永遠算（②的正面修法）
 *      · status "upcoming_watch" → 「尚未發行」本身就是會腐壞的宣稱
 *                                  （the-necrobeats 實例：我們記下的發行日根本沒發生）
 *      · status "candidate" 且**尚未下過「別做」的定論**（無 shelf、novelty 非 LOW／NONE）
 *      缺 `last_verified` ⇒ 視為無限舊（③）。
 *   軸 B（版次）＝ verdictStale：已下定論的那一大群不進日曆，但它們的定論
 *      **在我方 built[] 變動時就該重算**。水位＝ built[].fidelity_verified 的最大值；
 *      定論日期早於水位者列出來。⇒ 「永久排除」不等於「從此沒人看」。
 *
 * 【fail-open 是刻意的】`novelty` 缺漏／看不懂前綴 ⇒ 判 decayable（＝會被催），
 *   不是判排除。排除必須由人寫下明確的定論（shelf 或 LOW／NONE 前綴）才成立。
 *
 * 【與常駐鎖的關係】`platform/catalog-freshness-ruler`（prototype/tests/checks-platform.js）
 *   require 本檔＝同一把尺，不存在第二份（本專案反覆踩「尺被抄成兩份然後 drift」）。
 *
 * 【怎麼用】
 *   node intel/tools/catalog-freshness.js          # 人讀報告（SKILL 第 2 步引用）
 *   node intel/tools/catalog-freshness.js --json   # 給後續工具吃
 */
"use strict";
var path = require("path");
var DB = path.join(__dirname, "..", "db");

var STALE_DAYS = 7;          // 與 CONTROL.stale_days 同義；呼叫端可覆寫
var DAY = 864e5;

/* 「已下過『別做』的定論」＝這筆的結論講的是我方遊戲庫的覆蓋關係，與日曆無關。
 * 兩種寫法都認：① shelf 欄位（物件或 true）② novelty 以 LOW / LOW-MED / NONE 起頭。 */
function hasVerdict(e) {
  if (e.shelf) return true;
  return /^\s*(LOW|NONE)/i.test(String(e.novelty || ""));
}

/* 軸 A：這筆會不會隨日曆腐壞。回傳 {decayable, why}。 */
function classify(e) {
  var s = e && e.status;
  if (s === "specd") return { decayable: true, why: "specd＝建置管線頂端" };
  if (s === "upcoming_watch") return { decayable: true, why: "尚未發行＝發行日本身會腐壞" };
  if (s !== "candidate") return { decayable: false, why: "已 built／非候選" };
  if (hasVerdict(e)) return { decayable: false, why: "已下定論（shelf／LOW*／NONE）＝只隨 built[] 變動而腐壞" };
  return { decayable: true, why: "仍是未定論的建置候選" };
}

function ageDays(iso, now) {
  if (!iso) return Infinity;                 // 缺 last_verified ＝ 無限舊（舊規則在這裡 continue）
  return (now - new Date(iso)) / DAY;
}

/* 軸 B 的水位：我方 built[] 最後一次變動。built 條目帶 fidelity_verified 日期。 */
function builtWatermark(cat) {
  var best = null;
  (cat.built || []).forEach(function (b) {
    var d = b && b.fidelity_verified;
    if (d && (!best || d > best)) best = d;
  });
  return best;
}

function scan(cat, providers, opts) {
  opts = opts || {};
  var now = opts.now ? new Date(opts.now) : new Date();
  var staleDays = opts.staleDays == null ? STALE_DAYS : opts.staleDays;
  var list = (cat && cat.candidates) || [];
  var wm = builtWatermark(cat || {});

  var decayable = [], excluded = [], stale = [], verdictStale = [];
  list.forEach(function (e) {
    var c = classify(e);
    var age = ageDays(e.last_verified, now);
    var row = { slug: e.slug, status: e.status, last_verified: e.last_verified || null, age: age, why: c.why };
    if (c.decayable) {
      decayable.push(row);
      if (age > staleDays) stale.push(row);
    } else {
      excluded.push(row);
      /* 軸 B：定論早於「我方最後一次上線新遊戲」⇒ 該定論可能已經不成立。
       * ⚠️ 只對**仍是候選**的那一群成立：status "built" 的列是「這款我們做了」的紀錄，
       *   它的 last_verified 再舊也不代表要重算（那正是 g6_hygiene 早就裁定的已知假陽性，
       *   本檔初版在軸 B 上原封不動地把它重新引進了一次——LOW/NONE 那 62 筆裡有 11 筆是 built）。 */
      if (wm && e.status === "candidate" && e.last_verified && e.last_verified < wm) verdictStale.push(row);
    }
  });

  var pv = (providers && providers.providers) || [];
  var pStale = pv.filter(function (p) { return p.last_verified && ageDays(p.last_verified, now) > staleDays; });

  return {
    staleDays: staleDays,
    total: list.length,
    decayable: decayable, excluded: excluded,
    stale: stale, verdictStale: verdictStale,
    builtWatermark: wm,
    providers: { total: pv.length, stale: pStale.map(function (p) { return p.slug || p.name; }) },
    // 門檻：軸 A 有任何一筆 stale、或 provider stale 佔比 >50% ⇒ 警報 ON
    alarm: stale.length > 0 || (pv.length > 0 && pStale.length / pv.length > 0.5)
  };
}

function load() {
  return scan(require(path.join(DB, "games-catalog.json")), require(path.join(DB, "providers.json")));
}

module.exports = { hasVerdict: hasVerdict, classify: classify, builtWatermark: builtWatermark, scan: scan, load: load, STALE_DAYS: STALE_DAYS };

if (require.main === module) {
  var s = load();
  if (process.argv.indexOf("--json") >= 0) { console.log(JSON.stringify(s, null, 2)); process.exit(0); }
  console.log("遊戲候選庫新鮮度（stale_days=" + s.staleDays + "）");
  console.log("  軸 A 日曆：decayable " + s.decayable.length + "/" + s.total + "｜其中 stale " + s.stale.length);
  s.stale.forEach(function (r) {
    console.log("    ! " + r.slug + " [" + r.status + "] lv=" + (r.last_verified || "(缺)") +
      " age=" + (r.age === Infinity ? "∞" : r.age.toFixed(1) + "d") + "　← " + r.why);
  });
  console.log("  已排除（結論型，不隨日曆腐壞）" + s.excluded.length + " 筆");
  console.log("  軸 B 版次：built 水位 " + (s.builtWatermark || "(無)") + "｜定論早於水位 " + s.verdictStale.length + " 筆");
  s.verdictStale.forEach(function (r) { console.log("    ? " + r.slug + " 定論 " + r.last_verified + " < 水位 " + s.builtWatermark); });
  console.log("  provider stale >" + s.staleDays + "d：" + s.providers.stale.length + "/" + s.providers.total);
  console.log(s.alarm ? "⚠️ 新鮮度警報 ON" : "ok");
}

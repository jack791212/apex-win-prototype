#!/usr/bin/env node
/*
 * 註冊表擴充點缺口報告（intel/tools/registry-gaps.js）— 平台軌 2026-08-26 20:00 窗
 * ---------------------------------------------------------------------------
 * 【它回答什麼】「容器先於內容」是本專案的招牌哲學，但 repo 內已**五次**記錄同一種缺陷：
 *   容器做好了、接線沒補完（`HL.dock` 外部註冊者為零／`promoCal` 外部註冊者為零／`HL.reveal`／
 *   `app-state.lossLimitRemaining` 零讀取者／#67 前身「已對外宣告但點進去是空的」）。
 *   本報告把「每個 `HL.<ns>.register` 擴充點有沒有被證明得到」變成可重現的機械讀數，
 *   供台帳審「擴充性 / 功能」分類時直接引用，不必每輪重新 grep 一遍。
 *
 * 【與常駐鎖的關係】兩者 require 同一支 `prototype/tests/registry-probe.js`，
 *   不存在第二把尺（本專案反覆踩「同一把尺被抄成兩份然後 drift」：T26/T28/#94 側表 rtp…）。
 *   鎖＝`platform/registry-extension-fail-closed`（壞 spec 不得進場 + 無法證明的擴充點零成長）。
 *
 * 【怎麼用】
 *   node intel/tools/registry-gaps.js          # 三段報告
 *   node intel/tools/registry-gaps.js --json   # 給後續工具吃
 *
 * 【讀數注意】射程與已知偏差全文在 `prototype/tests/registry-probe.js` 檔頭，讀數時一起讀。
 *   最重要的一條：`internalOnly`（零外部呼叫點）**不等於**壞——多數是「內建品項走檔內
 *   register()」的正常形狀，且其中一半有自己的正向測項。真正該行動的只有 `unproven`。
 */
"use strict";
var path = require("path");
var probe = require(path.join(__dirname, "..", "..", "prototype", "tests", "registry-probe.js"));

var s = probe.scan();

if (process.argv.indexOf("--json") >= 0) {
  console.log(JSON.stringify(s, null, 2));
  process.exit(0);
}

function pad(x, n) { x = String(x); while (x.length < n) x += " "; return x; }

console.log("註冊表擴充點缺口報告");
console.log("  有程式碼呼叫點的擴充點 " + s.registries.length + " 個｜無程式碼呼叫點的登記簿 " + s.internalOnly.length + " 個" +
  "（合計 " + (s.registries.length + s.internalOnly.length) + " 個擴充點）");
console.log("  行為探針射程 " + s.probed.length + " 支｜壞 spec 進場（leaky）" + s.leaky.length + " 支｜無法證明（unproven）" + s.unproven.length + " 支");
console.log("  vm 沙箱：首屏核心 " + s.sandbox.loaded + " 支載入、失敗 " + s.sandbox.failed.length + " 支" +
  (s.sandbox.failed.length ? "（" + s.sandbox.failed.join("；") + "）" : ""));
console.log("");

function docCol(r) {
  return r.docMentions ? "｜文件提及 " + r.docMentions + "（" + r.docMentionFiles.join(",") + "）" : "";
}

console.log("── ① 有**程式碼**呼叫點（壞掉會在行為上現形）──");
s.registries.forEach(function (r) {
  console.log("  " + (r.unproven ? "🔴" : "  ") + " HL." + pad(r.ns, 14) +
    "外部註冊者 " + pad(r.external, 3) +
    "node可驗 " + pad(r.nodeVerifiable ? "是" : "否", 3) +
    "沙箱可驗 " + pad(r.sandboxVerifiable ? "是" : "否", 3) +
    "壞spec拒收 " + pad(r.probe.failClosed === null ? "（未探）" : (r.probe.failClosed ? "是" : "❌否"), 8) +
    "owner " + r.owners.join(",") + docCol(r));
  if (r.external) console.log("        ← " + r.externalFiles.join(", "));
});

console.log("");
console.log("── ② 無程式碼呼叫點（多為內建品項走區域 register()；不在 unproven 棘輪射程）──");
s.internalOnly.forEach(function (r) {
  var p = r.probe || {};
  console.log("     HL." + pad(r.ns, 14) +
    "壞spec拒收 " + pad(p.failClosed === null ? "（CORE 未匯出 register，未探）" : (p.failClosed ? "是" : "❌否"), 30) +
    "node可驗 " + pad(r.nodeVerifiable ? "是" : "否", 3) +
    "沙箱可驗 " + pad(r.sandboxVerifiable ? "是" : "否", 3) +
    "owner " + r.owners.join(",") + docCol(r));
});
console.log("  ⚠️ 這張清單 2026-08-31 20:00 窗由 10 筆變 14 筆，**不是新增了四個登記簿**：篩子改成");
console.log("     「只認程式碼呼叫點、不認註解／字串裡的提及」後，`edge`／`guild`／`progressSrc`／`selftest`");
console.log("     四支（唯一命中都是自己檔頭的用法示範）由 ① 移到這裡。它們今天仍 node/沙箱可驗，");
console.log("     但 `unproven` 只算 ① ⇒ 這四支已離開棘輪射程，改由 `platform/registry-sites-code-only` ⑤ 守著。");

console.log("");
console.log("── ③ 該行動的清單 ──");
if (!s.leaky.length && !s.unproven.filter(function (x) { return s.baseline.indexOf(x) < 0; }).length) {
  console.log("  ✅ 無新增缺口（leaky 0；unproven 恰為基線 " + JSON.stringify(s.baseline) + "）");
} else {
  if (s.leaky.length) console.log("  ❌ 來者不拒（壞 spec 進得去）：" + s.leaky.join("、"));
  s.unproven.forEach(function (ns) {
    if (s.baseline.indexOf(ns) < 0) console.log("  ❌ 新的無法證明擴充點：HL." + ns);
  });
}
console.log("  基線（已知無法證明、允許存在）：" + JSON.stringify(s.baseline) +
  (s.baseline.length
    ? "  ← 脫離之道＝補一個外部註冊者／node 可 require／能在 vm 沙箱裡跑起來（三條路任一即可）"
    : "  ← 2026-08-29 20:00 窗起清空：原唯一例外 guild 已由第三條路（vm 沙箱）脫離，見 registry-probe.js 的 boot() 檔頭"));

#!/usr/bin/env node
/* onexit-ordering-probe.js — 可重現證明「HL.shell.onExit 離場鉤被進場當輪的雙重 runExit 立即消費」
 *
 * 由維護軌 2026-09-05 12:00 窗開出的 DEBT T53 佐證。純讀原始碼 + 模型模擬，零 prototype/ 寫入。
 * 用法：node intel/tools/onexit-ordering-probe.js
 *
 * 病根（原始碼事實，本探針會逐一 assert）：
 *   ① main.js renderApp() 進場先 `HL.shell.runExit("app-rerender")`（清「上一個 view」的鉤子）。
 *   ② 同一個 renderApp 隨即 `HL.shell.mountView(def.render(s), …)`：引數 def.render(s) **先**同步求值，
 *      view 的 render() 在此時 `HL.shell.onExit(...)` 登記「本 view」的離場鉤子。
 *   ③ 接著 mountView 內部 **又** `runExit("view-left")`（app-shell.js）——把「本 view」剛登記、
 *      根本還沒離場的鉤子**立刻**跑掉並清空。
 *   ⇒ 一次進場後 exitFns 恆為空；玩家真正用底部導覽離場時，該清的帳（vsslot escrow／duel settlePending／
 *      bounty 離場 epoch++）**一條都不會跑**＝2026-08-21 那批「家族 B 離場鉤」在執行期被靜默中和。
 *      來源層測項（checks-games / arena）只驗「有沒有登記 onExit」＝守的是代理指標，抓不到這個時序。
 *
 * 修法方向（本探針同時驗證）：移除 mountView 內的 runExit（保留 renderApp 進場那一次）＝
 *   FIX A。鉤子活到下一次 renderApp 進場才被以「離場」語意跑掉＝正確。（保留 mountView、移除 renderApp
 *   那次＝FIX B，仍是同一個 bug。）⚠️ FIX A 有 refresh（同頁重繪 i18n/存檔）路徑副作用需 preview 驗，故此為
 *   surface-not-touch 卡、不在無人值守輪落地。
 */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.resolve(__dirname, "..", "..");
function rd(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

var fails = 0;
function ok(cond, msg) { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) fails++; }

console.log("== 原始碼事實（本探針模型所根據的四條）==");
var main = rd("prototype/src/main.js");
var shell = rd("prototype/src/layout/app-shell.js");

// ① renderApp 進場的 runExit
ok(/function renderApp\(\)[\s\S]*?runExit\("app-rerender"\)/.test(main),
  "main.js renderApp() 內有 runExit(\"app-rerender\")");
// ② mountView 以 def.render(s) 為引數（render 先求值、onExit 在此登記）
ok(/mountView\(def\.render\(s\)/.test(main),
  "main.js renderApp() 以 mountView(def.render(s), …) 呼叫（render 先於 mountView 求值）");
// ③ mountView 內部又 runExit
ok(/function mountView\([\s\S]*?runExit\("view-left"\)/.test(shell),
  "app-shell.js mountView() 內部又有 runExit(\"view-left\")");
// runExit 語意：跑完清空
ok(/function runExit\([\s\S]*?exitFns = \[\]/.test(shell),
  "app-shell.js runExit() 跑完把 exitFns 清空（一次性）");
// 至少一個 view 在 render 內同步登記 onExit（vsslot / instant-duel）
var vss = rd("prototype/src/views/vsslot.js");
var duel = rd("prototype/src/views/instant-duel.js");
ok(/onExit\(function \(\) \{[\s\S]*?forfeitEscrow\(\)/.test(vss),
  "vsslot.render() 內同步登記 onExit → forfeitEscrow（離場沒收 escrow）");
ok(/onExit\(function \(\) \{ clearTimers\(\); settlePending\(\); \}\)/.test(duel),
  "instant-duel.render() 內同步登記 onExit → settlePending（離場補結未入帳派彩）");

console.log("\n== 時序模型（忠實複刻上述四條的執行順序）==");
function model(withRenderAppRunExit, withMountViewRunExit) {
  var exitFns = [];
  function onExit(fn) { exitFns.push(fn); }
  function runExit(r) { if (!exitFns.length) return; var f = exitFns; exitFns = []; f.forEach(function (g) { g(r); }); }
  function mountView() { if (withMountViewRunExit) runExit("view-left"); }
  function renderApp(def) { if (withRenderAppRunExit) runExit("app-rerender"); mountView(def()); }
  return { onExit: onExit, renderApp: renderApp, len: function () { return exitFns.length; } };
}
// 場景：進 vsslot（登記離場鉤）→ 玩到一半 escrow 已扣（不經 renderApp）→ 用底部導覽去大廳
function run(cfg) {
  var fired = [];
  var s = model(cfg[0], cfg[1]);
  var vsslot = function () { s.onExit(function (r) { fired.push(r); }); return 1; };
  var lobby = function () { return 1; };
  s.renderApp(vsslot);                 // 進場
  var afterEntry = s.len();
  s.renderApp(lobby);                  // 離場到大廳（此刻才該沒收 escrow）
  return { firedOnEntry: fired.length >= 1, firedOnLeave: fired.indexOf("app-rerender") >= 0 && fired.length >= 1, afterEntryLen: afterEntry, fired: fired };
}

var cur = run([true, true]);
ok(cur.afterEntryLen === 0 && cur.fired.length === 1 && cur.fired[0] === "view-left",
  "CURRENT（兩處 runExit 都在）：離場鉤在**進場當輪**就被 mountView 的 runExit 跑掉並清空（exitFns 進場後=0）＝真正離場時一條都不跑＝BUG 重現");

var fixA = run([true, false]);
ok(fixA.afterEntryLen === 1 && fixA.fired.length === 1 && fixA.fired[0] === "app-rerender",
  "FIX A（移除 mountView 的 runExit）：離場鉤活過進場（exitFns=1），在真正離場那次 renderApp 才以離場語意跑掉＝正確");

var fixB = run([false, true]);
ok(fixB.afterEntryLen === 0 && fixB.fired.length === 1 && fixB.fired[0] === "view-left",
  "FIX B（移除 renderApp 的 runExit）：仍在進場當輪被消費＝同一個 bug（故正解是 FIX A 方向）");

console.log("\n" + (fails ? "❌ " + fails + " 條不符——原始碼可能已改，請重讀 T53" : "✅ CONFIRMED：離場鉤被進場當輪雙重 runExit 立即消費（見 DEBT T53）"));
process.exit(fails ? 1 : 0);

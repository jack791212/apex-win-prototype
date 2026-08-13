#!/usr/bin/env node
/*
 * Apex Win｜自我檢測 node 執行器
 * ---------------------------------------------------------------------------
 * 用法：
 *   node prototype/tests/run.js              # 只跑 fast 冒煙測（秒級，適合每次提交前）
 *   node prototype/tests/run.js --deep       # 加跑 deep（蒙地卡羅買入 RTP 等，較慢）
 *   node prototype/tests/run.js --group games
 *   AX_DEEP_SIMS=2000000 node prototype/tests/run.js --deep    # 精算級樣本數
 *
 * 失敗時 exit code = 1（可直接當遊戲軌保真閘的一道自動檢查）。
 */
"use strict";
var path = require("path");
var selftest = require(path.join(__dirname, "..", "src", "core", "selftest.js"));
require(path.join(__dirname, "checks-games.js"));
require(path.join(__dirname, "checks-platform.js")); // #80 載入架構：延遲載入清單完整性 / meta 不漂移 / 首屏預算閘(M6)
// 核心模組自帶測項（純函式區以 module.exports 暴露，載入即 register）：
require(path.join(__dirname, "..", "src", "core", "betlog.js"));   // #51 注單中心：環形緩衝 / CSV 描述子
require(path.join(__dirname, "..", "src", "core", "edge.js"));     // #50 成本加權：edge 係數表 / demo 地板 / live 中性
require(path.join(__dirname, "..", "src", "core", "ledger.js"));   // #56 營運帳本：現金流分類表 / 站內移轉不汙染 cashNet
require(path.join(__dirname, "..", "src", "core", "progress-src.js")); // #65 進度來源註冊表：投注恆等 / 真站非投注恰 0 / 每日上限 / 註冊即擴充
require(path.join(__dirname, "..", "src", "core", "rakeback-core.js")); // #60 返水以莊家優勢計價：不變量 / 成本中性 / 未登記退化
require(path.join(__dirname, "..", "src", "core", "rakeboost.js")); // #52 返水加成排程表：取最大不相乘 / 真站含加成仍守不變量
require(path.join(__dirname, "..", "src", "core", "release.js"));  // #54 上架排程×受眾分層：三階段邊界 / 受眾閘 / 未宣告零回歸
require(path.join(__dirname, "..", "src", "core", "score-axis.js")); // #85 競賽計分軸：未宣告零回歸 / max 不累加 / bet=0 不產生倍數 / 分組池 Σ≤總池
require(path.join(__dirname, "..", "src", "core", "wager-scope.js")); // #89 紅利可用範圍軸：未宣告零回歸 / 權重≤1 / 真站不更寬鬆 / 查無登錄表 fail-open
require(path.join(__dirname, "..", "src", "core", "reveal.js"));   // #66 里程碑揭曉：層級→樣式 / 四種不播情形 / 註冊即可擴充 / 零派彩契約
require(path.join(__dirname, "..", "src", "core", "rewards.js"));  // #76 簽到揭曉層：期望值恆等(整數等式) / 檔位邊界 / 加權抽取分布
require(path.join(__dirname, "..", "src", "core", "responsible.js")); // #67 負責任博弈：限額閘邊界 / 調升 24h 冷卻不對稱 / 未設限零回歸
require(path.join(__dirname, "..", "src", "core", "service-level.js")); // #63 VIP 服務水準軸：單調性 / 日限刻意不分階 / 真站不更寬鬆 / 三週期額度閘

var argv = process.argv.slice(2);
var deep = argv.indexOf("--deep") >= 0;
var gi = argv.indexOf("--group");
var group = gi >= 0 ? argv[gi + 1] : null;

function runTier(tier) {
  var opts = { env: "node", tier: tier };
  if (group) opts.group = group;
  return selftest.run(opts);
}

function report(label, res) {
  console.log("\n── " + label + " ──");
  res.results.forEach(function (r) {
    var mark = r.status === "pass" ? "✅" : (r.status === "fail" ? "❌" : "⏭ ");
    console.log(" " + mark + " " + r.id + "  " + r.title + "  (" + r.ms.toFixed(0) + "ms)" +
      (r.msg ? "\n      → " + r.msg : ""));
  });
  console.log("   共 " + res.total + " 項｜通過 " + res.pass + "｜失敗 " + res.fail + "｜略過 " + res.skip);
  return res.fail;
}

var fails = report("fast（結構性不變量）", runTier("fast"));
if (deep) fails += report("deep（蒙地卡羅）", runTier("deep"));
else console.log("\n（deep 測項未執行；加 --deep 以驗買入 RTP 等重測）");

console.log(fails ? "\n❌ 自我檢測未通過：" + fails + " 項失敗" : "\n✅ 自我檢測全數通過");
process.exit(fails ? 1 : 0);

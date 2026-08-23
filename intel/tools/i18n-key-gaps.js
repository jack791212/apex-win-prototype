#!/usr/bin/env node
/*
 * i18n 整節點鍵缺漏報告（intel/tools/i18n-key-gaps.js）— #119
 * ---------------------------------------------------------------------------
 * 【與 intel/tools/i18n-coverage.js 的分工，別混用】
 *   · `i18n-coverage.js`＝**粗尺**：把「引號內含 CJK 的字面量」通通當候選，量的是逐檔相對覆蓋率。
 *     它自帶三個已知偏差（測試訊息灌大分母／串接低估／全站聚合值不可跨輪相減），
 *     所以只能拿來排序「哪一檔最需要補」，**不能當閘**。
 *   · 本檔＝**精尺**：只認 `t("中文")`／`HL.i18n.t("中文")` 的**呼叫**（狀態機走過原始碼，
 *     字串內與註解內的一律不算），並把「補了也不會生效」的串接鍵判成 N/A。
 *     它產出的數字**就是常駐鎖 `platform/i18n-key-ratchet` 在數的那個數**——
 *     兩者 require 同一支 `prototype/tests/i18n-key-scan.js`，不存在第二把尺。
 *
 * 【怎麼用】
 *   node intel/tools/i18n-key-gaps.js            # 逐檔缺漏排行 + 每條缺漏的鍵與行號
 *   node intel/tools/i18n-key-gaps.js --json     # 給後續工具吃
 *   node intel/tools/i18n-key-gaps.js --all      # 連零缺漏的檔也列（看覆蓋面）
 *
 * 【補法】在 `prototype/src/i18n/en.js`（全譯）與 `zh-Hans.js`（只補繁簡不同者）各補一條，
 *   key 必須與呼叫端 **trim 後**逐字相同（DOM walker 查表前會 trim）。
 */
"use strict";
var path = require("path");
var scan = require(path.join(__dirname, "..", "..", "prototype", "tests", "i18n-key-scan.js"));

var args = process.argv.slice(2);
var AS_JSON = args.indexOf("--json") >= 0;
var SHOW_ALL = args.indexOf("--all") >= 0;

var r = scan.measure();
if (AS_JSON) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }

var T = r.totals;
console.log("i18n 整節點鍵缺漏報告");
console.log("  呼叫點 " + T.sites + "／整節點鍵 " + T.keys
  + "（N/A：串接 " + T.naConcat + "、繁簡同形 " + T.naSame + "）");
console.log("  字典：en " + T.dictEn + " 條、zh-Hans " + T.dictHans + " 條（可靠的繁→簡變化字 " + T.changedChars + " 個）");
console.log("  缺漏：EN " + T.enMissing + " ＋ zh-Hans " + T.hansMissing + " ＝ " + T.gaps + " 條");
console.log("");

/* #120（平台軌 08-23 20:00 窗）：第二面。呼叫面與 DOM 綁定面**分開列**，
   因為它們的補法出口相同（都是補字典）但**發現方式不同**——
   呼叫面看 `t("…")`，DOM 面看 `text:`／`textContent=`／`placeholder:` 的字面量。
   兩面共用同一支掃描器，這裡只是把同一份量測分兩段呈現。 */
var DT = r.dom.totals;
console.log("i18n DOM 綁定面缺漏報告（#120：沒走 t() 的那一面）");
console.log("  綁定點 " + DT.sites + "／整節點鍵 " + DT.keys
  + "（N/A：串接 " + DT.naConcat + "、繁簡同形 " + DT.naSame + "）");
console.log("  缺漏：EN " + DT.enMissing + " ＋ zh-Hans " + DT.hansMissing + " ＝ " + DT.gaps + " 條");
console.log("");

function report(label, perFile) {
  var rows = Object.keys(perFile).map(function (k) { return { rel: k, rec: perFile[k] }; })
    .filter(function (x) { return SHOW_ALL || x.rec.gaps > 0; })
    .sort(function (a, b) { return b.rec.gaps - a.rec.gaps || a.rel.localeCompare(b.rel); });

  console.log("── " + label + " ──");
  if (!rows.length) { console.log("✅ 零缺漏（棘輪基線 0 成立）"); console.log(""); return; }

  rows.forEach(function (x) {
    console.log(String(x.rec.gaps).padStart(4) + "  " + x.rel
      + "  (EN " + x.rec.enMissing + " / zh-Hans " + x.rec.hansMissing + " / 鍵 " + x.rec.keys + ")");
    x.rec.missing.forEach(function (mi) {
      console.log("        :" + mi.line + "  「" + mi.key + "」"
        + (mi.shape ? " <" + mi.shape + ">" : "")
        + (mi.en ? " [缺EN]" : "") + (mi.hans ? " [缺zh-Hans]" : ""));
    });
  });
  console.log("");
}

report("呼叫面 t(\"中文\")", r.perFile);
report("DOM 綁定面 text:／textContent=／placeholder:", r.dom.perFile);

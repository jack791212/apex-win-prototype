#!/usr/bin/env node
/*
 * i18n 覆蓋率量測器（intel/tools/i18n-coverage.js）
 * ---------------------------------------------------------------------------
 * 【為什麼有這個檔】`platform-modules.json` 的「多語系前端 i18n」自 2026-08-04 起就以
 *   「逐檔 UI 字面量覆蓋率」當作 partial 的判定依據，但**那把尺從來只存在於各輪的一次性
 *   `node -e` 裡**。結果是 08-14、08-16、08-17 連三輪都不敢回填 `last_audited`：
 *   每一輪重寫的正則都略有出入，數字對不上前輪，依「同法才可比」的紀律就只能標 stale。
 *   ⇒ 這不是量測太難，是**量測工具沒有被寫下來**。本檔把那把尺固定下來，從此可重現、可比較。
 *
 * 【方法】① 以 vm 實跑 `src/i18n/en.js`，攔截 `HL.i18n.register` 取得權威 EN 鍵集
 *          （#100 拆檔後字典不在 i18n.js 裡，正則數 key 會把巢狀引號算進去＝假數字）。
 *        ② 掃 views/layout/core 的 .js，抽出「引號內含 CJK 且長度 ≤40」的字面量當候選 UI 字串。
 *        ③ 命中 EN 鍵集者記為已覆蓋。
 *
 * 【已知偏差·讀數時務必一起讀】
 *   - **測試訊息密集的檔會把分母灌大**（selftest/rakeback-core/wager-scope 的 t.ok() 斷言訊息
 *     本來就不該翻譯）⇒ 本指標**只對面板型 UI 檔有效**。
 *   - **字串串接本來就翻不到**（HL.i18n 只翻「整個文字節點等於一條 key」者，見 CLAUDE.md §4
 *     與船長 P3）⇒ 低估。
 *   - ⇒ **全站聚合值不可當 KPI、不可跨輪相減**（歷輪分母 2404／3634／6808 各不相同就是因為
 *     每輪的尺不一樣）。只看**逐檔相對排序**與**同一把尺下的逐輪變化**。
 *
 * 用法：node intel/tools/i18n-coverage.js [--json] [--min-sample N]
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");
const P = path.join(ROOT, "prototype");
const SCAN_DIRS = ["src/views", "src/layout", "src/core"];   // 口徑固定，改這裡等於換尺
const MAX_LITERAL_LEN = 40;
const args = process.argv.slice(2);
const AS_JSON = args.indexOf("--json") >= 0;
const MIN_SAMPLE = (() => {
  const i = args.indexOf("--min-sample");
  return i >= 0 ? parseInt(args[i + 1], 10) || 8 : 8;
})();

// ---------- ① 權威 EN 鍵集 ----------
function enKeys() {
  const packs = {};
  const sb = { console };
  sb.window = sb; sb.globalThis = sb;
  sb.HL = { i18n: { register: function (code, o) { packs[code] = o; } } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(P, "src/i18n/en.js"), "utf8"), sb, { filename: "en.js" });
  const d = (packs.en && packs.en.dict) || {};
  return new Set(Object.keys(d));
}

// ---------- ② 候選 UI 字面量 ----------
const LITERAL = new RegExp("[\"']([^\"'\\\\\\n]{1," + MAX_LITERAL_LEN + "})[\"']", "g");
const HAS_CJK = /[一-鿿]/;

function scanFile(abs, EN) {
  const src = fs.readFileSync(abs, "utf8");
  let m, hit = 0, total = 0;
  LITERAL.lastIndex = 0;
  while ((m = LITERAL.exec(src))) {
    const v = m[1];
    if (!HAS_CJK.test(v)) continue;
    total++;
    if (EN.has(v)) hit++;
  }
  return { hit, total };
}

function main() {
  const EN = enKeys();
  const rows = [];
  let gh = 0, gt = 0;
  SCAN_DIRS.forEach((d) => {
    const dir = path.join(P, d);
    let names;
    try { names = fs.readdirSync(dir); } catch (e) { return; }
    names.filter((f) => f.endsWith(".js")).forEach((f) => {
      const r = scanFile(path.join(dir, f), EN);
      gh += r.hit; gt += r.total;
      if (r.total >= MIN_SAMPLE) {
        rows.push({ file: d + "/" + f, hit: r.hit, total: r.total, pct: +(r.hit / r.total * 100).toFixed(1) });
      }
    });
  });
  rows.sort((a, b) => a.pct - b.pct);
  const out = {
    measured_at: new Date().toISOString().slice(0, 10),
    en_keys: EN.size,
    scan_dirs: SCAN_DIRS,
    max_literal_len: MAX_LITERAL_LEN,
    min_sample: MIN_SAMPLE,
    aggregate: { hit: gh, total: gt, pct: +(gh / gt * 100).toFixed(1) },
    files: rows
  };
  if (AS_JSON) { console.log(JSON.stringify(out, null, 1)); return; }

  console.log("i18n 覆蓋率（尺＝intel/tools/i18n-coverage.js，口徑固定故可跨輪比較）");
  console.log("EN 權威鍵集：" + EN.size + " 鍵｜掃描：" + SCAN_DIRS.join("、") + "｜樣本下限：" + MIN_SAMPLE);
  console.log("");
  console.log("全站聚合：" + gh + "/" + gt + " = " + out.aggregate.pct + "%  ⚠️ 不可當 KPI（見檔頭已知偏差）");
  console.log("");
  console.log("覆蓋率最低 10 檔（面板型才有意義；測試訊息密集者屬預期偏低）：");
  rows.slice(0, 10).forEach((r) => {
    console.log("  " + String(r.pct + "%").padStart(6) + "  " + String(r.hit + "/" + r.total).padStart(8) + "  " + r.file);
  });
  console.log("");
  console.log("覆蓋率最高 5 檔：");
  rows.slice(-5).reverse().forEach((r) => {
    console.log("  " + String(r.pct + "%").padStart(6) + "  " + String(r.hit + "/" + r.total).padStart(8) + "  " + r.file);
  });
}

main();

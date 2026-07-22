/*
 * Apex Win｜站別模式（真站 / 假站）＝與「休閒/真金(HL.money)」「後端(config)」正交的第三軸
 * ---------------------------------------------------------------------------
 * demo（假站，預設）：現況＝一堆假玩家/假流水/假送幣/假 JP/假報獎，純展示體驗。
 * live（真站，健檢）：關掉所有假活動、乾淨起帳、每筆金流記入 HL.ledger 當真實營收，
 *                     用來全面健檢暫代金流與規則（抽水/送幣/世界活動）是否有缺陷。
 *
 * 設計要點：
 *  - 本旗標「決定 localStorage 命名空間前綴」(見 dom.js lsGet/lsSet)，所以它自己的 key
 *    HL_SITE_MODE 必須用「原生 localStorage」讀寫、絕不加前綴，否則切站後讀不回自己。
 *  - MODE 於載入時讀一次並固定整個頁面生命週期；切站一律 location.reload() 套用，
 *    避免「假活動關了但前綴/後端沒跟著切」的半套狀態。
 *  - 載入順序：必須排在 app-state.js / money.js / config.js 之前（它們要讀站別決定
 *    起始餘額、開機種子、是否連後端）。boot 期只依賴 dom.js（已在最前）。
 * 註冊於 window.HL.site。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var KEY = "HL_SITE_MODE"; // 原生讀寫、不加命名空間前綴

  function readRaw() { try { return global.localStorage.getItem(KEY); } catch (e) { return null; } }
  function writeRaw(v) { try { global.localStorage.setItem(KEY, v); } catch (e) {} }

  // 讀一次、固定整頁生命週期（切站以 reload 套用）
  var MODE = readRaw() === "live" ? "live" : "demo";

  function mode() { return MODE; }
  function isLive() { return MODE === "live"; }
  function isDemo() { return MODE === "demo"; }
  // localStorage 命名空間前綴：真站資料與假站完全隔離（平行宇宙）
  function ns() { return MODE === "live" ? "r:" : ""; }
  function label() { return MODE === "live" ? "真站（營運健檢）" : "假站（展示 Demo）"; }

  // 切站：寫旗標 → 重載套用（呼叫端負責先跳確認）。相同則 no-op。
  function setMode(m) {
    if (m !== "live" && m !== "demo") return;
    if (m === MODE) return;
    writeRaw(m);
    global.location.reload();
  }

  HL.site = { mode: mode, isLive: isLive, isDemo: isDemo, ns: ns, label: label, setMode: setMode };
})(window);

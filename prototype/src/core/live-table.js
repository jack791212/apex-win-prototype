/*
 * Apex Win｜主播跟注的「真桌結果」單一出口 HL.liveTable  #92
 * ------------------------------------------------------------------
 * 為什麼存在（2026-08-14 平台軌實作 #92 時的機械量測結果）：
 *   虛擬主播跟注是**真扣真派**（走真 HL.baccarat 開牌、扣真 HL.money、掛 HL.liveStats），
 *   但兩個消費端各自寫了同一段「取不到真桌結果就 Math.random() 翻硬幣」的後備分支：
 *     views/liveroom.js:140（整頁直播間）、layout/streamer.js:156（子母畫面 PiP）。
 *   ⭐ 這個後備分支在 2026-08-07 的 #80（內建遊戲延遲載入）之後，**從「幾乎不會走到」變成「預設會走到」**：
 *     table-baccarat.js 自 #80 起改為 lazy（不在 index.html），而 liveroom.js/streamer.js 仍是靜態載入
 *     ⇒ 玩家只要**沒開過百家樂**，HL.baccarat 就不存在 ⇒ 每一局都由不可驗算的 Math.random 決定真實輸贏。
 *   ⇒ 通則：**延遲載入會把休眠的「防呆分支」升級成「預設分支」**；改載入方式時要重掃所有 `HL.<模組> &&` 形式的守衛。
 *
 * 本模組的契約（刻意極小）：
 *   - result()    真桌結果或 **null**——取不到時**絕不編造勝負**（舊版的硬幣翻轉即為「編造」）。
 *   - ensure()    請 #80 的延遲載入器把 baccarat 檔拉進來（冪等、失敗不拋）；進直播間/開 PiP 時呼叫一次即可。
 *   - available() 目前是否已可取得真桌結果。
 *   消費端拿到 null 時的正確處置＝**退回未結算跟注、本局不結算**（比照 liveroom.js:134 離開直播間、
 *   streamer.js:144 teardown 兩處既有形制），而不是換一個「比較公平的隨機數」——因為 50/50 硬幣
 *   與百家樂真實勝率／莊 1.95× 賠付本來就對不上，改走 HL.fair 只會讓它「可驗算地錯」。
 *
 * 載入順序：任意（只在被呼叫時才碰 HL.baccarat / HL.lazyGames）；index.html 置於 core 區。
 * 註冊於 window.HL.liveTable；同時 module.exports 給 node 迴歸鎖（驗的就是玩家跑的同一份）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  var TABLE_GAME_ID = "baccarat";   // 真桌＝百家樂（HL.baccarat.deal 為對外真開牌 API，見 table-baccarat.js 檔首純數學區）
  var _asked = false;               // ensure() 冪等旗標：只請延遲載入器拉一次

  // 真桌結果；取不到＝回 null（**不得**以隨機數編造勝負），並順手請載入器補上 ⇒ 下一局就會就緒。
  // ⚠️ 自癒設計是刻意的：消費端在入口忘了呼叫 ensure() 時，最壞只是「第一局不結算」而非「永遠不結算」。
  //    （負向擾動實測：把入口那句 ensure() 拿掉，若沒有這裡的自癒，就會退化成每一局都退回跟注。）
  function result() {
    if (!available()) { ensure(); return null; }
    var d = HL.baccarat.deal();
    return (d && d.winner) ? d : null;
  }

  function available() { return !!(HL.baccarat && HL.baccarat.deal); }

  // 請 #80 延遲載入器注入 baccarat；冪等、無延遲載入器時安靜略過、任何失敗都不拋
  function ensure() {
    if (available() || _asked) return false;
    _asked = true;
    try {
      if (HL.lazyGames && HL.lazyGames.load) { HL.lazyGames.load(TABLE_GAME_ID); return true; }
    } catch (e) { /* 載入失敗＝維持不可用，消費端會退回跟注而非編造結果 */ }
    return false;
  }

  var CORE = { result: result, available: available, ensure: ensure, gameId: TABLE_GAME_ID };
  HL.liveTable = CORE;
  if (typeof module !== "undefined" && module.exports) { module.exports = CORE; }
})(typeof window !== "undefined" ? window : globalThis);

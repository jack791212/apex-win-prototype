/*
 * Apex Win｜時間窗口型限時 Boost · Happy Hour（自我進化引擎 #35）
 * 對標 WOW Vegas（Happy Hour 限時加成）+ Toshi.bet（Rakeback Boosts 每日 3 個固定時段）——兩家共識。
 * ApexWin 原本無「排程型時間窗口 boost」（#22 rakeback 是 24h 日桶、非固定時段限時）＝催「特定時段回訪」的缺口。
 * 玩法：每日三個固定時段（本地時間 12:00–13:00 / 18:00–19:00 / 22:00–23:00），窗內**返水率 ×2**——
 *   掛進 progress.js 的 rbAccrue（rb = bet × rbRate × HL.happyhour.mult()）＝真加成走既有返水路徑，非裝飾。
 * UI：底部列 ⚡ 入口 + 時段表 modal（進行中剩餘 / 下一場倒數，自管 interval 節點離場即停）；
 *   窗口開啟時 boot interval 發一次通知（localStorage 冪等：每日每窗只通知一次）。
 * 純前端零牌照。註冊於 window.HL.happyhour = { status, mult, open }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_HAPPYHOUR";
  var MULT = 2;                                     // 窗內返水倍率
  var WINDOWS = [12, 18, 22];                       // 每日三場（本地整點起、各 1 小時）

  function load() { return HL.dom.lsGet(KEY, {}); }  // T20+站別命名空間（見 dom.js）
  function save(o) { HL.dom.lsSet(KEY, o); }

  // 目前狀態：active＝在窗內；msLeft＝距本窗結束；nextStart＝下一場起始 Date；msToNext＝距下一場
  function status() {
    var now = new Date();
    var h = now.getHours();
    var idx = -1;
    for (var i = 0; i < WINDOWS.length; i++) if (h === WINDOWS[i]) idx = i;
    if (idx >= 0) {
      var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), WINDOWS[idx] + 1, 0, 0, 0);
      return { active: true, windowIndex: idx, msLeft: end.getTime() - now.getTime(), msToNext: 0, mult: MULT, windows: WINDOWS.slice() };
    }
    // 找下一場（今天剩餘場次，否則明天第一場）
    var next = null;
    for (var j = 0; j < WINDOWS.length; j++) {
      var st = new Date(now.getFullYear(), now.getMonth(), now.getDate(), WINDOWS[j], 0, 0, 0);
      if (st.getTime() > now.getTime()) { next = st; break; }
    }
    if (!next) next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, WINDOWS[0], 0, 0, 0);
    return { active: false, windowIndex: -1, msLeft: 0, msToNext: next.getTime() - now.getTime(), mult: 1, windows: WINDOWS.slice() };
  }

  // 返水加成倍率（progress.js rbAccrue 讀取；非窗內＝1）
  function mult() { return status().active ? MULT : 1; }

  var fmtLeft = HL.dom.hms; // 倒數格式（h/m/s 級聯）收斂至 HL.dom.hms（本輪淺審計 · 原多一組冗餘括號 (m)＝輸出與 faucet/onboarding 逐字同）
  function fmtWindow(hh) { return (hh < 10 ? "0" + hh : hh) + ":00–" + ((hh + 1) < 10 ? "0" + (hh + 1) : (hh + 1)) + ":00"; }

  function open() {
    var st = status();
    var cdVal = el("span", { text: fmtLeft(st.active ? st.msLeft : st.msToNext) });
    var stateLine = el("div", { class: "ax-kv" }, [
      el("span", { class: "ax-muted", text: st.active ? t("進行中，剩餘", "進行中，剩餘") : t("下一場倒數", "下一場倒數") }),
      el("b", { class: st.active ? "ax-gold" : "" }, [cdVal])
    ]);
    var rows = WINDOWS.map(function (hh, i) {
      var isNow = st.active && st.windowIndex === i;
      return el("div", { class: "ax-kv" + (isNow ? " ax-vip__cur" : "") }, [
        el("span", { text: "⚡ " + fmtWindow(hh) }),
        el("b", { class: isNow ? "ax-gold" : "ax-muted" }, [
          el("span", { text: isNow ? t("進行中", "進行中") : t("返水 ×2", "返水 ×2") })
        ])
      ]);
    });
    var m = HL.ui.modal(t("⚡ Happy Hour 限時加成", "⚡ Happy Hour 限時加成"), [
      el("div", { class: "ax-panel" }, [
        stateLine,
        el("small", { class: "ax-muted", text: t("每日三個固定時段，窗內所有押注的返水率 ×2（經 💧 返水日桶累積）。", "每日三個固定時段，窗內所有押注的返水率 ×2（經 💧 返水日桶累積）。") })
      ]),
      el("div", { class: "ax-panel" }, rows),
      el("button", { class: "ax-btn-ghost", text: t("前往 Rakeback 返水 →", "前往 Rakeback 返水 →"), onClick: function () { m.close(); if (HL.rakeback) HL.rakeback.open(); } }),
      el("span", { class: "ax-demo-tag", text: t("排程型時間窗口 · 催時段回訪 · Demo", "排程型時間窗口 · 催時段回訪 · Demo") })
    ]);
    // 倒數即時更新（modal 存活期間；跨越窗口邊界時重開以刷新狀態）
    var wasActive = st.active;
    var iv = global.setInterval(function () {
      if (!document.body.contains(cdVal)) { global.clearInterval(iv); return; }
      var now = status();
      cdVal.textContent = fmtLeft(now.active ? now.msLeft : now.msToNext);
      if (now.active !== wasActive) { global.clearInterval(iv); m.close(); open(); }
    }, 1000);
  }

  // 窗口開啟時通知一次（每日每窗冪等；boot interval 30s 檢查）
  var lastNotified = null; // 閉包鏡像：localStorage 寫入失敗（如隱私模式）時退化為每次載入最多一次，防 30s 洗版
  var lastBbText = null;   // 底部列 ⚡ 副標快取：只在跨窗界時改字（底部列是 render-time 快照，這裡補即時性）
  function notifyTick() {
    var st = status();
    // 底部列副標隨時鐘同步（≤30s 延遲；文字為字典鍵、MutationObserver 會接手翻譯）
    var bbText = st.active ? "返水×2 進行中" : "限時返水加成";
    if (bbText !== lastBbText) {
      var bb = global.document.getElementById("ax-bb-hh");
      if (bb) { bb.textContent = bbText; lastBbText = bbText; } // 元素在場才鎖快取（首次 tick 可能早於 shell render）
    }
    if (!st.active || !HL.notify) return;
    var day = HL.dom.dayNum();  // T12：收斂至共用 epoch-bucket
    var tag = day + ":" + st.windowIndex;
    var s = load();
    if (s.notified === tag || lastNotified === tag) return;
    lastNotified = tag;
    s.notified = tag; save(s);
    HL.notify.add({ ic: "⚡", title: t("Happy Hour 開始", "Happy Hour 開始"), text: t("限時返水 ×2 進行中（一小時），把握時段！", "限時返水 ×2 進行中（一小時），把握時段！") });
    if (HL.ui && HL.ui.toast) HL.ui.toast("⚡ " + t("Happy Hour：返水 ×2 進行中", "Happy Hour：返水 ×2 進行中"), "ok");
  }
  function boot() { notifyTick(); global.setInterval(notifyTick, 30000); }
  if (document.readyState === "loading") global.addEventListener("DOMContentLoaded", boot);
  else boot();

  HL.happyhour = { status: status, mult: mult, open: open };
})(window);

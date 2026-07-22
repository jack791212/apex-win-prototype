/*
 * Apex Win｜Chat Rain 聊天灑幣（自我進化引擎 #25）
 * 對標 Gamdom 招牌 Rain（聊天室不定時下雨灑免費幣，窗口內活躍者按 claim 分得）。
 * ApexWin 原本聊天室有 RainBot 假訊息（mock-data「XXX 位玩家共獲得 NT$XX 雨露」）卻無真機制——本檔把死招牌通真電。
 * 玩法：平台聊天室每隔一段時間「下紅包雨」，開一個限時領取窗口；
 *   「近 N 分鐘在聊天室發過言」的使用者（＝資格）可按領取鈕分得雨露入獎金錢包 HL.bonus。
 *   每場雨每裝置限領一次（localStorage 冪等）。純前端、零牌照、不改任何派發金額邏輯以外的東西。
 * 由 chat.js（僅平台單例）掛鉤：發言→markMessage 記資格；面板開→每秒 tick 推進狀態機並刷新橫幅。
 * 註冊於 window.HL.rain = { mount, tick, claim, markMessage, status, trigger }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }

  var KEY = "HL_RAIN";
  var WINDOW_MS = 45000;       // 每場紅包雨的可領窗口（45 秒）
  var ELIG_MS = 10 * 60000;    // 近 10 分鐘內發過言＝有資格
  var FIRST_DELAY = 25000;     // 首次載入後 25 秒來第一場（demo 友善、看得到）
  function nextGap() { return 180000 + Math.floor(Math.random() * 120000); } // 之後每場間隔 3–5 分鐘

  function load() { return HL.dom.lsGet(KEY, {}); }  // T20+站別命名空間（見 dom.js）
  function save(o) { HL.dom.lsSet(KEY, o); }

  var bannerEl = null;   // 聊天面板頂部的紅包雨橫幅（sticky）
  var postMsg = null;    // 由 chat.js 傳入，可往聊天室貼 RainBot 訊息

  function eligible() { var s = load(); return s.lastMsg && (Date.now() - s.lastMsg) <= ELIG_MS; }

  // 目前是否有進行中的紅包雨（並負責過期收尾＝排下一場）
  function activeEvent() {
    var s = load(), now = Date.now();
    if (s.ev) {
      if (now < s.ev.endsAt) return s.ev;
      // 過期：收掉並排下一場
      s.ev = null; s.next = now + nextGap(); save(s);
    }
    return null;
  }

  function startRain() {
    var s = load(), now = Date.now();
    var share = 30 + Math.floor(Math.random() * 120);   // 本玩家可領份額 NT$30–149
    var n = 100 + Math.floor(Math.random() * 400);      // 共享玩家數（氣氛值，對齊原 mock 100–500）
    s.ev = { id: "r" + now, endsAt: now + WINDOW_MS, share: share, n: n };
    s.next = null; save(s);
    if (postMsg) postMsg({ bot: true, name: "RainBot",
      text: "🌧️ " + t("紅包雨來了！", "紅包雨來了！") + " " + n + " " + t("位玩家共享雨露，點上方領取！", "位玩家共享雨露，點上方領取！") });
    if (HL.notify) HL.notify.add({ ic: "🧧", title: t("聊天室紅包雨", "聊天室紅包雨"),
      text: t("紅包雨開始，45 秒內在聊天室領取雨露！", "紅包雨開始，45 秒內在聊天室領取雨露！") });
  }

  // 每秒推進狀態機（僅在聊天面板開啟時由 chat.js 驅動）
  function tick() {
    var s = load(), now = Date.now();
    if (!s.ev && !s.next) { s.next = now + FIRST_DELAY; save(s); }
    var ev = activeEvent();
    if (!ev) {
      s = load();
      if (s.next && now >= s.next) { startRain(); }
    }
    render();
  }

  // 領取本場雨露：需進行中 + 有資格 + 本場未領。回傳金額或 0。
  function claim() {
    var ev = activeEvent(); if (!ev) return 0;
    if (!eligible()) return 0;
    var s = load();
    s.claimed = s.claimed || {};
    if (s.claimed[ev.id]) return 0;
    s.claimed[ev.id] = true; save(s);
    HL.bonus.add(ev.share, { source: "紅包雨 Rain" });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.notify) HL.notify.add({ ic: "🧧", title: t("紅包雨", "紅包雨"),
      text: t("雨露", "雨露") + " " + money(ev.share) + " " + t("已入獎金錢包。", "已入獎金錢包。") });
    return ev.share;
  }

  function claimed(ev) { var s = load(); return !!(ev && s.claimed && s.claimed[ev.id]); }

  function fmtSec(ms) { return Math.max(0, Math.ceil(ms / 1000)) + "s"; }
  function fmtLeft(ms) {
    ms = Math.max(0, ms); var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    return (m > 0 ? m + "m " : "") + (s % 60) + "s";
  }

  // 依狀態重繪橫幅（不重建節點、只換內容，避免破壞 sticky）
  function render() {
    if (!bannerEl) return;
    var now = Date.now(), ev = activeEvent(), s = load();
    while (bannerEl.firstChild) bannerEl.removeChild(bannerEl.firstChild);

    if (ev) {
      bannerEl.className = "ax-rain is-active";
      var head = el("div", { class: "ax-rain__head" }, [
        el("span", { class: "ax-rain__ic", text: "🧧" }),
        el("b", { class: "ax-rain__title", text: t("紅包雨進行中", "紅包雨進行中") }),
        el("span", { class: "ax-rain__timer", text: "⏳ " + fmtSec(ev.endsAt - now) })
      ]);
      var btn;
      if (claimed(ev)) {
        btn = el("button", { class: "ax-btn-ghost", disabled: "disabled" },
          [el("span", { text: t("已領取 ✓ ", "已領取 ✓ ") }), document.createTextNode(money(ev.share))]);
      } else if (eligible()) {
        btn = el("button", { class: "ax-btn-primary" },
          [el("span", { text: t("領取雨露 ", "領取雨露 ") }), document.createTextNode(money(ev.share))]);
        btn.addEventListener("click", function () {
          var got = claim();
          if (got > 0) { HL.ui.toast("🧧 " + money(got) + " " + t("已入獎金錢包", "已入獎金錢包"), "ok"); render(); }
        });
      } else {
        btn = el("button", { class: "ax-btn-ghost", disabled: "disabled" },
          [el("span", { text: t("先在聊天室發言即可參與", "先在聊天室發言即可參與") })]);
      }
      bannerEl.appendChild(head);
      bannerEl.appendChild(btn);
    } else if (s.next) {
      bannerEl.className = "ax-rain";
      bannerEl.appendChild(el("span", { class: "ax-rain__hint" }, [
        el("span", { text: "🌧️ " + t("下一場紅包雨", "下一場紅包雨") }),
        el("span", { text: " " + fmtLeft(s.next - now) })
      ]));
    } else {
      bannerEl.className = "ax-rain";
    }
  }

  // chat.js 平台單例呼叫：建立橫幅、記住貼訊息用的 addMsg，回傳橫幅節點（插到聊天頂部）
  function mount(addMsg) {
    postMsg = addMsg || postMsg;
    if (!bannerEl) bannerEl = el("div", { class: "ax-rain" });
    render();
    return bannerEl;
  }

  function markMessage() { var s = load(); s.lastMsg = Date.now(); save(s); render(); }

  function status() { var ev = activeEvent(); return { active: !!ev, event: ev, eligible: eligible() }; }

  // demo/測試用：立刻開一場紅包雨
  function trigger() { var s = load(); s.ev = null; s.next = Date.now(); save(s); tick(); }

  HL.rain = { mount: mount, tick: tick, claim: claim, markMessage: markMessage, status: status, trigger: trigger };
})(window);

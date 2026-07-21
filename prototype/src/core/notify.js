/*
 * Apex Win｜通知中心（接 header 🔔 badge）
 * 純前端 localStorage 通知佇列：未讀數→鈴鐺紅點；點開為通知中心 Modal（開啟即標已讀）。
 * 由真實事件餵入：VIP 升級、累積彩金中獎…（見 progress.js / jackpot.js 的 HL.notify.add 呼叫）。
 * 註冊於 window.HL.notify。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;  // T20：收斂至共用 localStorage 持久化出口

  var KEY_N = "HL_NOTIFY";
  function now() { return Date.now(); }
  function seed() {
    var t = now();
    var o = { list: [
      { id: "w1", ic: "🎉", title: "歡迎來到 Apex Win", text: "完成每日簽到、衝 VIP 等級、挑戰三級累積彩金！", t: t, read: false },
      { id: "w2", ic: "🎁", title: "每日簽到已開啟", text: "連續登入領遊戲幣，記得別斷簽。", t: t - 3600000, read: false },
      { id: "w3", ic: "💧", title: "VIP 與返水上線", text: "押注即累積有效投注，等級越高返水越多。", t: t - 7200000, read: false }
    ] };
    save(KEY_N, o); return o;
  }
  function load() { return ls(KEY_N, null) || seed(); }

  function add(n) {
    var o = load();
    o.list.unshift({
      id: (n && n.id) || (String(now()) + Math.floor(Math.random() * 1000)),
      ic: (n && n.ic) || "🔔", title: (n && n.title) || "通知", text: (n && n.text) || "", t: now(), read: false
    });
    if (o.list.length > 50) o.list = o.list.slice(0, 50);
    save(KEY_N, o); refreshBadge();
  }
  function unreadCount() { return load().list.filter(function (x) { return !x.read; }).length; }
  function markAllRead() { var o = load(); o.list.forEach(function (x) { x.read = true; }); save(KEY_N, o); refreshBadge(); }

  function refreshBadge() {
    var b = document.getElementById("ax-notif-badge"); if (!b) return;
    var n = unreadCount();
    if (n > 0) { b.textContent = n > 99 ? "99+" : String(n); b.style.display = ""; }
    else b.style.display = "none";
  }

  function ago(t) {
    var s = Math.max(0, Math.floor((now() - t) / 1000));
    if (s < 60) return "剛剛";
    if (s < 3600) return Math.floor(s / 60) + " 分鐘前";
    if (s < 86400) return Math.floor(s / 3600) + " 小時前";
    return Math.floor(s / 86400) + " 天前";
  }

  function open() {
    var o = load();
    var rows = o.list.length ? o.list.map(function (x) {
      return el("div", { class: "ax-notif" + (x.read ? "" : " is-unread") }, [
        el("span", { class: "ax-notif__ic", text: x.ic }),
        el("div", { class: "ax-notif__body" }, [
          el("div", { class: "ax-notif__title", text: x.title }),
          x.text ? el("div", { class: "ax-notif__text", text: x.text }) : null,
          el("div", { class: "ax-notif__time", text: ago(x.t) })
        ]),
        x.read ? null : el("span", { class: "ax-notif__dot" })
      ]);
    }) : [el("p", { class: "ax-muted", text: "目前沒有通知。" })];
    HL.ui.modal("🔔 通知中心", [
      el("div", { class: "ax-notif-list" }, rows),
      el("span", { class: "ax-demo-tag", text: "通知來自你的遊戲事件（VIP 升級、彩金中獎…）· Demo" })
    ]);
    markAllRead(); // 開啟即視為已讀（清紅點）
  }

  HL.notify = { add: add, open: open, unreadCount: unreadCount, markAllRead: markAllRead, refreshBadge: refreshBadge };
})(window);

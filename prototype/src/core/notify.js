/*
 * Apex Win｜通知中心（接 header 🔔 badge）
 * 純前端 localStorage 通知佇列：未讀數→鈴鐺紅點；點開為通知中心 Modal（開啟即標已讀）。
 * 由真實事件餵入：VIP 升級、累積彩金中獎…（見 progress.js / jackpot.js 的 HL.notify.add 呼叫）。
 * 註冊於 window.HL.notify。
 *
 * #178 第三波｜行銷通訊面：通知是業界自我排除「五面」裡的第 3 面（第 2＋4 面已由第一波關掉）。
 * 每一則通知**自陳 `kind`**，抑制策略是資料（`HL.rg.SUP_BY_PAUSE`），這裡只求值 ⇒ 新增一個
 * 通知表面＝標一個 kind，閘與政策皆零改動。詳見鎖 `platform/rg-pause-scope-census`。
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

  /* 通知的四種身分。**沒自陳＝當成 comms**（fail-closed）：忘了標一則新的促銷通知，
     結果是它在排除期間被擋住（開發者當場看得到），而不是它溜出去（畫面完全正常、沒人會發現）。 */
  var NKIND = { rg: 1, account: 1, reward: 1, comms: 1 };
  function kindOf(n) { var k = n && n.kind; return NKIND[k] ? k : "comms"; }
  /* `rg` 是業界唯一的例外——ESPN BET 說明逐字「除了確認自我排除流程以外，不會再收到任何訊息」。
     這裡**硬性放行**而不是靠「政策表沒列它」：一旦有人把 rg 寫進政策表，玩家按下「永久自我排除」
     會什麼都看不到，而那是唯一無法補救的一格。求值出錯一律視為抑制，同第一波紀律。 */
  function passes(k) {
    if (k === "rg") return true;
    try { return !(HL.rg && HL.rg.suppressed && HL.rg.suppressed(k)); } catch (e) { return false; }
  }

  function add(n) {
    var k = kindOf(n);
    /* 不得把承諾換成黑洞：擋下來要留一筆數得出來的痕跡（通知中心會顯示，見 open()）。 */
    if (!passes(k)) { var b = load(); b.blocked = (b.blocked || 0) + 1; save(KEY_N, b); return false; }
    var o = load();
    o.list.unshift({
      id: (n && n.id) || (String(now()) + Math.floor(Math.random() * 1000)),
      ic: (n && n.ic) || "🔔", title: (n && n.title) || "通知", text: (n && n.text) || "", t: now(), read: false
    });
    if (o.list.length > 50) o.list = o.list.slice(0, 50);
    save(KEY_N, o); refreshBadge(); return true;
  }
  function blockedCount() { return load().blocked || 0; }
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
    /* 被擋下的促銷通知不是消失，是被記下來了。句子嵌了數字 ⇒ 必須走 fmt（`HL.i18n.t` 是 passthrough，
       真正翻譯的 DOM walker 比對的是**整個**文字節點，補進字典也永遠查不到）。 */
    var nb = load().blocked || 0;
    if (nb > 0) {
      var tpl = "自我排除期間已為你擋下 {n} 則促銷通知（獎勵沒有消失，只是這段期間不再向你招攬）。";
      rows.push(el("p", { class: "ax-muted ax-notif-blocked" }, [HL.i18n
        ? HL.i18n.fmt(tpl, { n: nb })
        : document.createTextNode(tpl.replace("{n}", nb))]));
    }
    HL.ui.modal("🔔 通知中心", [
      el("div", { class: "ax-notif-list" }, rows),
      el("span", { class: "ax-demo-tag", text: "通知來自你的遊戲事件（VIP 升級、彩金中獎…）· Demo" })
    ]);
    markAllRead(); // 開啟即視為已讀（清紅點）
  }

  HL.notify = { add: add, open: open, unreadCount: unreadCount, markAllRead: markAllRead,
    refreshBadge: refreshBadge, kindOf: kindOf, blockedCount: blockedCount };
})(window);

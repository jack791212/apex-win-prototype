/*
 * Apex Win｜VIP 週期 Reload 領取中心（自我進化引擎 #24）
 * 對標 Shuffle（9 級 VIP 各含 daily/weekly/monthly reload）+ Gamdom（Reload Rewards）+ Roobet/BC.Game 分桶。
 * ApexWin VIP 原本只有「升級獎金」，無週期可領 reload；本檔補上每日/每週/每月三檔固定紅利。
 * 玩法：依 VIP 等級給三檔固定紅利，各有獨立週期閘（沿用 #17 Lucky Spin 的 daily-gate
 *   + #18 Raffle 的週期倒數懶判定模式），到期可領入獎金錢包 HL.bonus，已領則顯示倒數至下次。
 * 純前端 localStorage、零牌照、不改 HL.vip 派發邏輯（只讀等級放大金額）。
 * 註冊於 window.HL.reload = { status, claim, claimableCount, open }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_RELOAD";
  var DAY = 86400000;

  function dayNum() { return Math.floor(Date.now() / DAY); }
  function weekNum() { return Math.floor(Date.now() / (7 * DAY)); }
  function monthNum() { return Math.floor(Date.now() / (30 * DAY)); }

  // 三檔週期：金額依 VIP 等級（青銅→鑽石，index 0..4）放大。
  var PERIODS = [
    { key: "daily",   ic: "📅", label: "每日紅利", amts: [120, 250, 500, 1000, 2000],
      num: dayNum,   msToNext: function () { return (dayNum() + 1) * DAY - Date.now(); } },
    { key: "weekly",  ic: "🗓️", label: "每週紅利", amts: [600, 1300, 2800, 5800, 11000],
      num: weekNum,  msToNext: function () { return (weekNum() + 1) * 7 * DAY - Date.now(); } },
    { key: "monthly", ic: "📆", label: "每月紅利", amts: [2500, 5500, 12000, 25000, 50000],
      num: monthNum, msToNext: function () { return (monthNum() + 1) * 30 * DAY - Date.now(); } }
  ];

  function load() { try { return JSON.parse(global.localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(o) { try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function vipIdx() { return HL.vip ? HL.vip.status().index : 0; }
  function amountOf(p) { return p.amts[Math.min(vipIdx(), p.amts.length - 1)]; }
  function pBy(key) { for (var i = 0; i < PERIODS.length; i++) if (PERIODS[i].key === key) return PERIODS[i]; return null; }

  // 某檔是否可領：當期序號 !== 已領序號（懶判定，跨期自動可領）
  function claimable(p) { var s = load(); return s[p.key] !== p.num(); }

  function status() {
    return PERIODS.map(function (p) {
      return { key: p.key, ic: p.ic, label: p.label, amount: amountOf(p), claimable: claimable(p), msToNext: p.msToNext() };
    });
  }
  function claimableCount() { var n = 0; PERIODS.forEach(function (p) { if (claimable(p)) n++; }); return n; }

  // 領取某檔：設當期已領旗標 + 派彩入獎金錢包。回傳金額或 0。
  function claim(key) {
    var p = pBy(key); if (!p || !claimable(p)) return 0;
    var amt = amountOf(p), s = load();
    s[key] = p.num(); save(s);
    HL.bonus.add(amt);
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.notify) HL.notify.add({ ic: p.ic, title: t(p.label, p.label), text: t(p.label, p.label) + " " + money(amt) + " 已入獎金錢包。" });
    return amt;
  }

  // 語言中性的精簡倒數（d/h/m），避免「標籤＋值」混排時中文單位無法翻譯（t() 為 passthrough）
  function fmtLeft(ms) {
    ms = Math.max(0, ms);
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return d + "d " + h + "h";
    if (h > 0) return h + "h " + m + "m";
    return m + "m";
  }

  function open() {
    var vip = HL.vip ? HL.vip.status() : { icon: "🥉", name: "青銅" };
    var timers = []; // 收集倒數節點，由 ticker 統一刷新
    var modalRef;    // 領取後關掉當前 modal 再重開，避免堆疊（同 tasks/rakeback 模式）

    function card(p) {
      var avail = claimable(p);
      var amt = amountOf(p);
      // 標籤節點獨立可被 DOM 翻譯層精確命中；數值/倒數另置文字節點（語言中性），ticker 只更新倒數值。
      var sub;
      if (avail) {
        sub = el("small", { class: "ax-muted" }, [el("span", { text: t("本期可領", "本期可領") })]);
      } else {
        var val = el("span", { text: fmtLeft(p.msToNext()) });
        sub = el("small", { class: "ax-muted" }, [el("span", { text: t("下次可領倒數：", "下次可領倒數：") }), val]);
        timers.push({ node: val, p: p });
      }
      var btn = el("button", { class: avail ? "ax-btn-primary" : "ax-btn-ghost", disabled: avail ? null : "disabled" },
        avail ? [el("span", { text: t("領取", "領取") }), document.createTextNode(" " + money(amt))]
              : [el("span", { text: t("已領取 ✓", "已領取 ✓") })]);
      btn.addEventListener("click", function () {
        var got = claim(p.key);
        if (got > 0) { HL.ui.toast(p.ic + " " + money(got) + " 已入獎金錢包", "ok"); if (modalRef && modalRef.close) modalRef.close(); open(); }
      });
      return el("div", { class: "ax-reload__card" + (avail ? " is-ready" : "") }, [
        el("div", { class: "ax-reload__head" }, [
          el("span", { class: "ax-reload__ic", text: p.ic }),
          el("div", {}, [
            el("div", { class: "ax-reload__name", text: t(p.label, p.label) }),
            el("b", { class: "ax-gold", text: money(amt) })
          ])
        ]),
        sub,
        btn
      ]);
    }

    var cards = PERIODS.map(card);

    // 倒數每秒刷新（沿用 raffle 的 ticker + 節點存活檢查）
    var anchor = cards[0];
    HL.ticker.add(function tick() {
      if (!document.body.contains(anchor)) { HL.ticker.remove(tick); return; }
      timers.forEach(function (x) { x.node.textContent = fmtLeft(x.p.msToNext()); });
    });

    modalRef = HL.ui.modal(t("🔄 週期紅利 Reload", "🔄 週期紅利 Reload"), [
      el("div", { class: "ax-reload" }, [
        el("div", { class: "ax-reload__vip" }, [
          el("span", { class: "ax-muted", text: t("你的等級", "你的等級") }),
          el("b", { class: "ax-gold", text: vip.icon + " " + vip.name })
        ]),
        el("div", { class: "ax-reload__grid" }, cards),
        el("small", { class: "ax-muted", text: t("等級越高，每日/每週/每月可領紅利越多。到期可領，逾期不累積。", "等級越高，每日/每週/每月可領紅利越多。到期可領，逾期不累積。") }),
        el("button", { class: "ax-btn-ghost", text: t("前往領取中心 →", "前往領取中心 →"), onClick: function () { if (modalRef && modalRef.close) modalRef.close(); HL.bonus.open(); } }),
        el("span", { class: "ax-demo-tag", text: t("依 VIP 等級 · 週期可領 · 入獎金錢包 · Demo", "依 VIP 等級 · 週期可領 · 入獎金錢包 · Demo") })
      ])
    ]);
  }

  HL.reload = { status: status, claim: claim, claimableCount: claimableCount, open: open };
})(window);

/*
 * Apex Win｜淨損 Cashback / Lossback 引擎（自我進化引擎 #33）
 * 對標 Thrill（10% 淨損 cashback、零流水、即時）+ Mega Dice（15% 淨損 cashback）——兩家共識的全新留存維度。
 * 與 #22 Rakeback 互補不重疊：rakeback 算「所有押注 turnover×率」，cashback 算「淨輸 net loss×率」。
 * 淨輸 = max(0, Σ有效押注 − Σ贏分)（真淨輸，贏局自然抵銷；非逐局 Σmax(0,bet−win) 那種高估法）。
 * 週期＝每週桶（對標 Thrill 週結；與 rakeback 每日桶區隔）：本週淨輸×VIP 率＝可領額，
 *   隨輸持續累積、隨後續贏局回落（已領部分不追回＝claimed 只增），跨週未領即歸零重計。
 * 領取入獎金錢包 HL.bonus、零流水。純前端 localStorage、複用 #22 桶骨架（accrue/claim/逾期作廢 + 面板領取）。
 * 註冊於 window.HL.cashback = { record, netLoss, pot, rate, claim, msToReset, status, open }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_CASHBACK";
  var WEEK = 7 * 86400000;
  var CB_RATES = [0.05, 0.07, 0.10, 0.12, 0.15]; // 青銅→鑽石：5%→15%（涵蓋 Thrill 10% / Mega Dice 15%）

  function weekNum() { return Math.floor(Date.now() / WEEK); }
  function load() { try { return JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(o) { try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  // 本週桶：跨週未領即歸零重計（wagered/won/claimed 全清）；舊資料無 week 欄位→蓋今週不清值
  function state() {
    var o = load();
    if (!o) { o = { week: weekNum(), wagered: 0, won: 0, claimed: 0 }; save(o); return o; }
    if (o.week == null) { o.week = weekNum(); save(o); }
    else if (o.week !== weekNum()) { o = { week: weekNum(), wagered: 0, won: 0, claimed: 0 }; save(o); }
    return o;
  }
  function rate() { var i = HL.vip ? HL.vip.status().index : 0; return CB_RATES[Math.min(i, CB_RATES.length - 1)]; }
  function netLoss() { var o = state(); return Math.max(0, (o.wagered || 0) - (o.won || 0)); }
  function accrued() { return Math.floor(netLoss() * rate()); }          // 本週已賺 cashback 總額
  function pot() { var o = state(); return Math.max(0, accrued() - (o.claimed || 0)); } // 目前可領（已領不追回）
  function msToReset() { return (weekNum() + 1) * WEEK - Date.now(); }

  // 中央掛鉤：每次結算累積本週押注/贏分（bet 或 win 可只帶其一）
  function record(bet, win) {
    bet = Math.round(bet || 0); win = Math.round(win || 0);
    if (bet <= 0 && win <= 0) return;
    var o = state();
    o.wagered = (o.wagered || 0) + Math.max(0, bet);
    o.won = (o.won || 0) + Math.max(0, win);
    save(o);
  }

  function claim() {
    var amt = pot(); if (amt <= 0) return 0;
    var o = state(); o.claimed = (o.claimed || 0) + amt; save(o);
    HL.bonus.add(amt);
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.notify) HL.notify.add({ ic: "💸", title: t("淨損 Cashback", "淨損 Cashback"), text: t("本週淨損回饋", "本週淨損回饋") + " " + money(amt) + " " + t("已入獎金錢包。", "已入獎金錢包。") });
    return amt;
  }

  function status() { return { rate: rate(), netLoss: netLoss(), pot: pot(), claimed: state().claimed || 0, msToReset: msToReset() }; }

  function fmtLeft(ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600); return d + "d " + h + "h"; } // 語言中性 d/h（避免「值+單位」串接節點翻不到）

  function open() {
    var s = HL.vip ? HL.vip.status() : { icon: "🥉", name: "青銅", index: 0 };
    var claimable = pot();
    // VIP 率表（沿用 rakeback 面板風格；用固定段位名稱避免相依 ranks API）
    var TIERS = [["🥉", "青銅"], ["🥈", "白銀"], ["🥇", "黃金"], ["💠", "白金"], ["💎", "鑽石"]];
    var rows = TIERS.map(function (r, i) {
      return el("div", { class: "ax-kv" + (i === s.index ? " ax-vip__cur" : "") }, [
        el("span", { text: r[0] + " " + t(r[1], r[1]) + (i === s.index ? t("（目前）", "（目前）") : "") }),
        el("b", { class: "ax-muted", text: (CB_RATES[i] * 100).toFixed(0) + "% cashback" })
      ]);
    });
    var m = HL.ui.modal(t("💸 淨損 Cashback", "💸 淨損 Cashback"), [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: t("目前回饋率", "目前回饋率") }), el("b", { class: "ax-gold", text: (rate() * 100).toFixed(0) + "%（" + s.icon + " " + t(s.name, s.name) + "）" })]),
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: t("本週淨損", "本週淨損") }), el("b", { text: money(netLoss()) })]),
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: t("可領 Cashback", "可領 Cashback") }), el("b", { class: "ax-gold", text: money(claimable) })]),
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: t("本桶跨週作廢，剩餘", "本桶跨週作廢，剩餘") }), el("b", { text: fmtLeft(msToReset()) })]),
        el("small", { class: "ax-muted", text: t("只在你「淨輸」時回饋（贏局自動抵銷），與返水互補、零流水。本週未領跨週即作廢。", "只在你「淨輸」時回饋（贏局自動抵銷），與返水互補、零流水。本週未領跨週即作廢。") })
      ]),
      el("button", { class: claimable > 0 ? "ax-btn-primary" : "ax-btn-ghost", disabled: claimable > 0 ? null : "disabled" },
        claimable > 0 ? [el("span", { text: t("領取", "領取") }), document.createTextNode(" " + money(claimable))] : [el("span", { text: t("目前無可領 Cashback", "目前無可領 Cashback") })]),
      el("div", { class: "ax-panel" }, rows),
      el("span", { class: "ax-demo-tag", text: t("淨損回饋 · 與返水互補 · 零流水 · Demo", "淨損回饋 · 與返水互補 · 零流水 · Demo") })
    ]);
    // 領取鈕（在 modal 建立後綁，領完關舊開新，沿用 rakeback/reload 模式）
    var btn = m.body.querySelector("button.ax-btn-primary, button.ax-btn-ghost");
    if (btn) btn.addEventListener("click", function () {
      var got = claim();
      if (got > 0) { HL.ui.toast("💸 " + money(got) + " " + t("已入獎金錢包", "已入獎金錢包"), "ok"); m.close(); open(); }
    });
  }

  HL.cashback = { record: record, netLoss: netLoss, pot: pot, rate: rate, claim: claim, msToReset: msToReset, status: status, open: open };
})(window);

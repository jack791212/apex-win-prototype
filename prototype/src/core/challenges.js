/*
 * Apex Win｜多倍數目標型挑戰（Multiplier Challenges，自我進化引擎 #26）
 * 對標 Shuffle（Daily/Weekly Challenges：命中某倍數/達某 payout 即領獎）。
 * 補足 ApexWin 每日任務只計「次數/金額」、缺「技巧型目標（單局命中 ≥N 倍）」的維度。
 * 玩法：任一遊戲的「單局」結算倍數（= 本局贏分 / 本局押注）達門檻即累進挑戰進度，
 *   達標可領入獎金錢包 HL.bonus。純前端 localStorage、每日 0 點重置（沿用 tasks 的 dayNum 模式）。
 * 資料源：HL.liveStats.record(game,bet,win) 中央點在「bet>0 且 win>0」（同一局結算）時呼叫本檔 record。
 *   ⇒ 只吃「同一局同時帶 bet+win」的遊戲（instant/table/crash/mines/towers/賞金/vsslot/跟注），
 *      slot/chicken 等把 bet 與 win 拆兩次回報者不誤判倍數（自然排除、無假陽性）。
 * 註冊於 window.HL.challenges = { record, list, claim, claimableCount, open }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_CHALLENGES";
  var dayNum = HL.dom.dayNum;  // T12：收斂至共用 epoch-bucket（原 var DAY 僅此處用，一併移除）
  function bar(pct) { return HL.ui.progress(pct); }  // 薄轉接 → HL.ui.progress（T6，clamp 入 primitive）

  // 每日挑戰：單局倍數門檻（mult）× 需達成次數（goal）。名稱為完整片語，供 DOM 翻譯層精確命中。
  var DAILY = [
    { id: "m2",  name: "單局命中 2× 倍數 5 次", mult: 2,  goal: 5, reward: 200,  ic: "🎯" },
    { id: "m10", name: "單局命中 10× 倍數",     mult: 10, goal: 1, reward: 500,  ic: "🚀" },
    { id: "m50", name: "單局命中 50× 倍數",     mult: 50, goal: 1, reward: 1500, ic: "💥" }
  ];

  function load() {
    var o = HL.dom.lsGet(KEY, null);  // T20+站別命名空間（見 dom.js）
    if (!o || o.day !== dayNum()) { o = { day: dayNum(), prog: {}, claimed: {} }; save(o); }
    return o;
  }
  function save(o) { HL.dom.lsSet(KEY, o); }

  // 由中央掛鉤呼叫：一局同時帶 bet+win 才算倍數（win/bet），達門檻的挑戰 +1（封頂 goal）。
  function record(game, bet, win) {
    bet = bet || 0; win = win || 0;
    if (bet <= 0 || win <= 0) return;
    var mult = win / bet;
    var o = load(), changed = false;
    DAILY.forEach(function (c) {
      if (mult < c.mult) return;
      var was = o.prog[c.id] || 0;
      if (was >= c.goal) return;
      var cur = Math.min(c.goal, was + 1);
      o.prog[c.id] = cur; changed = true;
      if (cur >= c.goal && was < c.goal) { // 剛達標：提示 + 推播（尚未領取）
        HL.ui.toast(c.ic + " 挑戰達成：" + t(c.name, c.name) + " — 去領 +" + money(c.reward), "ok");
        if (HL.notify) HL.notify.add({ ic: c.ic, title: t("多倍數挑戰", "多倍數挑戰"), text: t(c.name, c.name) + " 已達成，獎金 " + money(c.reward) + " 可領取。" });
      }
    });
    if (changed) { save(o); if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome(); }
  }

  function list() {
    var o = load();
    return DAILY.map(function (c) {
      var cur = o.prog[c.id] || 0;
      return { id: c.id, name: c.name, mult: c.mult, goal: c.goal, reward: c.reward, ic: c.ic, cur: cur, done: cur >= c.goal, claimed: !!o.claimed[c.id] };
    });
  }
  function claimableCount() { return list().filter(function (c) { return c.done && !c.claimed; }).length; }

  function claim(id) {
    var o = load(), c = null; DAILY.forEach(function (x) { if (x.id === id) c = x; });
    if (!c) return 0;
    var cur = o.prog[id] || 0;
    if (cur < c.goal || o.claimed[id]) return 0;
    o.claimed[id] = true; save(o); HL.bonus.add(c.reward, { source: "倍數挑戰" });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return c.reward;
  }

  function open() {
    var modalRef;
    function row(c) {
      // 按鈕標籤獨立節點供 DOM 翻譯層命中；數值/進度語言中性
      var btn;
      if (c.claimed) btn = el("button", { class: "ax-btn-ghost", disabled: "disabled" }, [el("span", { text: t("已領取 ✓", "已領取 ✓") })]);
      else if (c.done) btn = el("button", { class: "ax-btn-primary" }, [el("span", { text: t("領取", "領取") }), document.createTextNode(" +" + money(c.reward))]);
      else btn = el("button", { class: "ax-btn-ghost", disabled: "disabled", text: c.cur + "/" + c.goal });
      if (c.done && !c.claimed) btn.addEventListener("click", function () {
        var got = claim(c.id);
        if (got > 0) { HL.ui.toast(t("挑戰獎勵", "挑戰獎勵") + " +" + money(got) + " " + t("已入獎金錢包", "已入獎金錢包"), "ok"); if (modalRef && modalRef.close) modalRef.close(); open(); }
      });
      return el("div", { class: "ax-task" }, [
        el("div", { class: "ax-task__main" }, [
          el("div", { class: "ax-task__name", text: (c.done ? "✓ " : c.ic + " ") + t(c.name, c.name) }),
          bar(c.goal ? (c.cur / c.goal) * 100 : 0)
        ]),
        btn
      ]);
    }
    var rows = list().map(row);
    modalRef = HL.ui.modal(t("🎯 多倍數挑戰", "🎯 多倍數挑戰"), [
      el("div", { class: "ax-tasks" }, rows),
      HL.ui.kv(t("獎金錢包", "獎金錢包"), money(HL.bonus.balance()), { valCls: "ax-gold" }),
      el("small", { class: "ax-muted", text: t("在任一遊戲的「單局」達成目標倍數即解鎖獎金（倍數＝該局贏分÷押注）。", "在任一遊戲的「單局」達成目標倍數即解鎖獎金（倍數＝該局贏分÷押注）。") }),
      el("button", { class: "ax-btn-ghost", text: t("前往領取中心 →", "前往領取中心 →"), onClick: function () { if (modalRef && modalRef.close) modalRef.close(); HL.bonus.open(); } }),
      el("span", { class: "ax-demo-tag", text: t("每日 0 點重置 · 獎勵入獎金錢包 · Demo", "每日 0 點重置 · 獎勵入獎金錢包 · Demo") })
    ]);
  }

  HL.challenges = { record: record, list: list, claim: claim, claimableCount: claimableCount, open: open };
})(window);

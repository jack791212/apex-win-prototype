/*
 * Apex Win｜多倍數目標型挑戰（Multiplier Challenges，自我進化引擎 #26）
 * 對標 Shuffle（Daily/Weekly Challenges：命中某倍數/達某 payout 即領獎）。
 * 補足 ApexWin 每日任務只計「次數/金額」、缺「技巧型目標（單局命中 ≥N 倍）」的維度。
 * 玩法：任一遊戲的「單局」結算倍數（= 本局贏分 / 本局押注）達門檻即累進挑戰進度，
 *   達標可領入獎金錢包 HL.bonus。純前端 localStorage、每日 0 點重置（沿用 tasks 的 dayNum 模式）。
 * 資料源：HL.liveStats.record(game,bet,win) 中央點在「bet>0 且 win>0」（同一局結算）時呼叫本檔 record。
 *   ⇒ 只吃「同一局同時帶 bet+win」的遊戲（instant/table/crash/mines/towers/賞金/vsslot/跟注），
 *      slot/chicken 等把 bet 與 win 拆兩次回報者不誤判倍數（自然排除、無假陽性）。
 *
 * ─────────── #57 限量挑戰「先搶先贏」（稀缺性獎勵軸 · 2026-08-18 平台軌） ───────────
 * 對標 **Shuffle 2026-07-31 刷新**：其挑戰另有一類明載「the first player to complete a challenge
 *   will win」——獎品**單一名額、先搶先贏、被領走即消失**。本檔原本三條 DAILY 全是純個人累進
 *   （各自 claim、`claimed` 只記自己，沒有任何「名額／剩幾份／被誰搶走」的概念），
 *   `HL.tournament` 又是排名分潤（人人有份、只差多寡）⇒ **「競逐同一份限量獎」這條留存力學空白**。
 *
 * 【容器先於內容】spec 新增兩個**選用資料描述子**：`slots`（名額數）+ `expiresAt`（窗口結束，
 *   函式或毫秒；不給則預設當日 0 點重置邊界）。新增一條限量挑戰＝加一筆 spec，
 *   record/claim/面板一行都不改。**未宣告 `slots` 者行為逐位如舊**（零回歸靠「欄位不存在」，
 *   不靠比對）——名額算術全部委派純函式 `HL.chalSlots`（core/challenge-slots.js，node 可 require）。
 *
 * 【「搶」不是「領」】限量挑戰在**達標當下**就結算名額（先搶先贏的語意就在這一刻），
 *   搶到才寫 `grab[id]`；獎金仍是事後 claim。⇒ 「達標了但名額已滿」是一個真的、看得見的結局。
 *
 * 【真站的誠實邊界（§11 + §4）】模擬對手一律加 `isLive()` 閘。但關掉 bot 之後，
 *   「先搶先贏」就只剩玩家一人在搶＝**必贏**：名額是假的稀缺，且送幣成本高於假站
 *   （違反 §11「真站不得比假站寬鬆」）。⇒ 真站在**沒有伺服器仲裁者**時**根本不提供**限量挑戰
 *   （`specs()` 直接濾掉、面板明說原因），而不是靜默退化成無限名額。
 *   接上後端那天：`HL.challenges.setArbiter(fn)` 一行即恢復供應——容器留在這裡，內容等權威。
 *
 * 註冊於 window.HL.challenges = { record, list, claim, claimableCount, open, setArbiter, arbiter }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_CHALLENGES";
  var DAY = 86400000;
  var dayNum = HL.dom.dayNum;  // T12：收斂至共用 epoch-bucket（原 var DAY 僅此處用，一併移除）
  function bar(pct) { return HL.ui.progress(pct); }  // 薄轉接 → HL.ui.progress（T6，clamp 入 primitive）
  function isLive() { return !!(HL.site && HL.site.isLive()); }

  // 每日挑戰：單局倍數門檻（mult）× 需達成次數（goal）。名稱為完整片語，供 DOM 翻譯層精確命中。
  //   選用欄位 `slots`（#57）＝限量名額；未宣告者為既有的個人無限名額語意。
  var DAILY = [
    { id: "m2",  name: "單局命中 2× 倍數 5 次", mult: 2,  goal: 5, reward: 200,  ic: "🎯" },
    { id: "m10", name: "單局命中 10× 倍數",     mult: 10, goal: 1, reward: 500,  ic: "🚀" },
    { id: "m50", name: "單局命中 50× 倍數",     mult: 50, goal: 1, reward: 1500, ic: "💥" },
    // 限量挑戰（#57 首位註冊者）：名額 3、達標當下就搶，搶完即消失、隔日 0 點重開。
    { id: "rush25", name: "限量搶先：單局命中 25× 倍數", mult: 25, goal: 1, reward: 3000, ic: "🏁", slots: 3 }
  ];

  /* 伺服器仲裁者（容器）：真站要提供限量挑戰必須有權威來源決定「名額是否還在」。
   * 純前端無從仲裁多人競逐 ⇒ 未註冊時真站不供應限量挑戰（見檔頭）。 */
  var ARBITER = null;
  function setArbiter(fn) { ARBITER = (typeof fn === "function") ? fn : null; return HL.challenges; }
  function arbiter() { return ARBITER; }

  // 本輪實際供應的挑戰清單。真站無仲裁者 ⇒ 濾掉所有限量挑戰（不靜默退化為無限名額）。
  function specs() {
    var hide = isLive() && !ARBITER;
    return DAILY.filter(function (c) { return !(hide && c.slots != null); });
  }
  /* ⚠️ 單一入口紀律：**除了 `specs()` 與 `hiddenCount()` 以外，任何人都不得直接讀 `DAILY`**。
   * 只要有一個消費端繞過 specs()，真站的「無仲裁者就不供應限量挑戰」那道閘就等於不存在
   * （首版的 specOf 正是直接掃 DAILY——雖然 claim 另有 grab 前置條件擋著，但那是**巧合上的安全**，
   *  不是結構上的）。由 `platform/limited-challenge-live-gate` 的「DAILY 只有兩個讀者」條款釘死。 */
  function specOf(id) { var r = null; specs().forEach(function (c) { if (c.id === id) r = c; }); return r; }
  function hiddenCount() { return DAILY.length - specs().length; }

  function windowOf(c) {
    var start = dayNum() * DAY;
    var end = (typeof c.expiresAt === "function") ? +c.expiresAt() : (c.expiresAt != null ? +c.expiresAt : start + DAY);
    return { start: start, end: end };
  }
  function botNames() { return (HL.mock && HL.mock.fakeNames) ? HL.mock.fakeNames : null; }

  /* 名額狀態：算術全部委派 HL.chalSlots（純函式、node 可 require）。
   * 有仲裁者時以它為權威（真站）；否則走本機確定性模擬（假站）。 */
  function slotState(c, o) {
    if (c.slots == null) return { unlimited: true, remaining: Infinity, mine: false, open: true, closed: false, total: 0, taken: 0, takenBy: [] };
    var w = windowOf(c), grabbedAt = (o.grab && o.grab[c.id]) || 0;
    if (ARBITER) {
      var srv = null;
      try { srv = ARBITER(c, { now: Date.now(), start: w.start, end: w.end, grabbedAt: grabbedAt }); } catch (e) { srv = null; }
      if (srv) return srv;
    }
    if (!HL.chalSlots) return { unlimited: true, remaining: Infinity, mine: !!grabbedAt, open: true, closed: false, total: 0, taken: 0, takenBy: [] };
    return HL.chalSlots.state({
      slots: c.slots, startMs: w.start, endMs: w.end, now: Date.now(),
      seed: c.id + "|" + dayNum(), grabbedAt: grabbedAt,
      bots: !isLive(), names: botNames()
    });
  }

  function load() {
    var o = HL.dom.lsGet(KEY, null);  // T20+站別命名空間（見 dom.js）
    if (!o || o.day !== dayNum()) { o = { day: dayNum(), prog: {}, claimed: {}, grab: {} }; save(o); }
    if (!o.grab) o.grab = {};         // 舊存檔升級：沒有 grab 欄位＝從未搶過（不追溯任何名額）
    return o;
  }
  function save(o) { HL.dom.lsSet(KEY, o); }

  // 由中央掛鉤呼叫：一局同時帶 bet+win 才算倍數（win/bet），達門檻的挑戰 +1（封頂 goal）。
  function record(game, bet, win) {
    bet = bet || 0; win = win || 0;
    if (bet <= 0 || win <= 0) return;
    var mult = win / bet;
    var o = load(), changed = false;
    specs().forEach(function (c) {
      if (mult < c.mult) return;
      var was = o.prog[c.id] || 0;
      if (was >= c.goal) return;
      var cur = Math.min(c.goal, was + 1);
      o.prog[c.id] = cur; changed = true;
      if (cur >= c.goal && was < c.goal) { // 剛達標
        if (c.slots == null) {             // 個人型：提示 + 推播（尚未領取）
          HL.ui.toast(c.ic + " 挑戰達成：" + t(c.name, c.name) + " — 去領 +" + money(c.reward), "ok");
          if (HL.notify) HL.notify.add({ ic: c.ic, title: t("多倍數挑戰", "多倍數挑戰"), text: t(c.name, c.name) + " 已達成，獎金 " + money(c.reward) + " 可領取。" });
        } else {                           // #57 限量型：**達標當下就結算名額**（先搶先贏的語意在這一刻）
          var st = slotState(c, o);
          if (st.open) {
            o.grab[c.id] = Date.now();
            HL.ui.toast("🏁 " + t("搶到限量名額", "搶到限量名額") + "！" + t(c.name, c.name) + " — " + t("去領", "去領") + " +" + money(c.reward), "ok");
            if (HL.notify) HL.notify.add({ ic: c.ic, title: t("限量挑戰", "限量挑戰"), text: t(c.name, c.name) + " " + t("名額已搶到", "名額已搶到") + "，獎金 " + money(c.reward) + " 可領取。" });
          } else {
            HL.ui.toast("🏁 " + t("你達標了，但名額已被搶光", "你達標了，但名額已被搶光"), "warn");
            if (HL.notify) HL.notify.add({ ic: c.ic, title: t("限量挑戰", "限量挑戰"), text: t("你達標了，但名額已被搶光", "你達標了，但名額已被搶光") + "。" + t("明日 0 點重新開放", "明日 0 點重新開放") + "。" });
          }
        }
      }
    });
    if (changed) { save(o); if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome(); }
  }

  function list() {
    var o = load();
    return specs().map(function (c) {
      var cur = o.prog[c.id] || 0, st = slotState(c, o);
      var done = cur >= c.goal;
      return {
        id: c.id, name: c.name, mult: c.mult, goal: c.goal, reward: c.reward, ic: c.ic,
        cur: cur, done: done, claimed: !!o.claimed[c.id],
        // #57：限量軸（未宣告 slots 者 limited=false，其餘欄位不影響既有呼叫端）
        limited: !st.unlimited, slots: st.total, remaining: st.remaining, taken: st.taken,
        mine: st.mine, takenBy: st.takenBy || [],
        // 達標了卻沒搶到＝「被搶走」；這是限量型獨有的結局，個人型永遠為 false
        missed: !st.unlimited && done && !st.mine
      };
    });
  }
  // 可領取數（餵給殼層徽章）：限量型必須**先搶到名額**才算可領（達標但沒搶到不算）
  function claimableCount() {
    return list().filter(function (c) { return c.done && !c.claimed && (!c.limited || c.mine); }).length;
  }

  function claim(id) {
    var o = load(), c = specOf(id);
    if (!c) return 0;
    var cur = o.prog[id] || 0;
    if (cur < c.goal || o.claimed[id]) return 0;
    if (c.slots != null && !(o.grab && o.grab[id])) return 0;   // #57：沒搶到名額就沒有獎金
    o.claimed[id] = true; save(o);
    HL.bonus.add(c.reward, { source: c.slots != null ? "限量挑戰" : "倍數挑戰" });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return c.reward;
  }

  function open() {
    var modalRef;
    function slotDots(c) {
      // 名額視覺：實心＝已被拿走、金色＝自己搶到的那格、空心＝還在
      var dots = [], i;
      for (i = 0; i < c.slots; i++) {
        var mineDot = c.mine && i === c.taken - 1;
        dots.push(el("span", {
          style: "width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:4px;"
            + (mineDot ? "background:var(--ax-gold,#e8c26a)" : (i < c.taken ? "background:var(--ax-text-dim,#8b93a7)" : "border:1px solid var(--ax-text-dim,#8b93a7)"))
        }));
      }
      // ⚠️ P3 紀律：`HL.i18n` 只翻譯「整個文字節點等於一條 key」者 ⇒ 中文片語與數值**必須拆成兩個節點**
      //   （「剩 2/3」這種串接永遠翻不到）。以下一律「中文全片語一節點 + 語言中性值一節點」。
      var who = c.takenBy.length ? c.takenBy.map(function (x) { return x.name; }).join("、") : "";
      var kids = [el("span", { style: "display:inline-flex;align-items:center" }, dots)];
      if (c.remaining > 0) {
        kids.push(el("small", { class: "ax-muted", text: t("剩餘名額", "剩餘名額") }));
        kids.push(el("small", { class: "ax-muted", text: c.remaining + "/" + c.slots }));
      } else {
        kids.push(el("small", { class: "ax-muted", text: t("名額已滿", "名額已滿") }));
      }
      if (who) {
        kids.push(el("small", { class: "ax-muted", text: t("已被搶走", "已被搶走") }));
        kids.push(el("small", { class: "ax-muted", text: who }));
      }
      return el("div", { style: "display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap" }, kids);
    }
    function row(c) {
      // 按鈕標籤獨立節點供 DOM 翻譯層命中；數值/進度語言中性
      var btn;
      if (c.claimed) btn = el("button", { class: "ax-btn-ghost", disabled: "disabled" }, [el("span", { text: t("已領取 ✓", "已領取 ✓") })]);
      else if (c.missed) btn = el("button", { class: "ax-btn-ghost", disabled: "disabled" }, [el("span", { text: t("名額已滿", "名額已滿") })]);
      else if (c.done) btn = el("button", { class: "ax-btn-primary" }, [el("span", { text: t("領取", "領取") }), document.createTextNode(" +" + money(c.reward))]);
      else btn = el("button", { class: "ax-btn-ghost", disabled: "disabled", text: c.cur + "/" + c.goal });
      if (c.done && !c.claimed && !c.missed) btn.addEventListener("click", function () {
        var got = claim(c.id);
        if (got > 0) { HL.ui.toast(t("挑戰獎勵", "挑戰獎勵") + " +" + money(got) + " " + t("已入獎金錢包", "已入獎金錢包"), "ok"); if (modalRef && modalRef.close) modalRef.close(); open(); }
      });
      return el("div", { class: "ax-task" }, [
        el("div", { class: "ax-task__main" }, [
          el("div", { class: "ax-task__name", text: (c.done ? "✓ " : c.ic + " ") + t(c.name, c.name) }),
          bar(c.goal ? (c.cur / c.goal) * 100 : 0),
          c.limited ? slotDots(c) : null
        ].filter(Boolean)),
        btn
      ]);
    }
    var rows = list().map(row);
    var hidden = hiddenCount();
    modalRef = HL.ui.modal(t("🎯 多倍數挑戰", "🎯 多倍數挑戰"), [
      el("div", { class: "ax-tasks" }, rows),
      HL.ui.kv(t("獎金錢包", "獎金錢包"), money(HL.bonus.balance()), { valCls: "ax-gold" }),
      el("small", { class: "ax-muted", text: t("在任一遊戲的「單局」達成目標倍數即解鎖獎金（倍數＝該局贏分÷押注）。", "在任一遊戲的「單局」達成目標倍數即解鎖獎金（倍數＝該局贏分÷押注）。") }),
      el("small", { class: "ax-muted", text: t("限量挑戰為先搶先贏：達標當下就結算名額，搶完即消失，隔日 0 點重新開放。", "限量挑戰為先搶先贏：達標當下就結算名額，搶完即消失，隔日 0 點重新開放。") }),
      // 真站無仲裁者時據實說明「為什麼這裡少了限量挑戰」，不假裝它不存在
      hidden > 0 ? el("small", { class: "ax-muted", text: t("真站模式：限量挑戰需伺服器仲裁名額，尚未接入前不提供（不以單機模擬冒充先搶先贏）。", "真站模式：限量挑戰需伺服器仲裁名額，尚未接入前不提供（不以單機模擬冒充先搶先贏）。") }) : null,
      el("button", { class: "ax-btn-ghost", text: t("前往領取中心 →", "前往領取中心 →"), onClick: function () { if (modalRef && modalRef.close) modalRef.close(); HL.bonus.open(); } }),
      el("span", { class: "ax-demo-tag", text: t("每日 0 點重置 · 獎勵入獎金錢包 · Demo", "每日 0 點重置 · 獎勵入獎金錢包 · Demo") })
    ].filter(Boolean));
  }

  HL.challenges = { record: record, list: list, claim: claim, claimableCount: claimableCount, open: open, setArbiter: setArbiter, arbiter: arbiter };

  /* #49 活動日曆：限量挑戰是**有窗口、會結束、名額會消失**的活動 ⇒ 它本來就該出現在
   * 「現在／即將」軸上（本卡指定的接線）。求值一律即時（promoCal 的契約），
   * 真站無仲裁者時 specs() 自然為空 ⇒ 日曆同步不顯示，不需要第二套判斷。 */
  if (HL.promoCal && HL.promoCal.register) {
    HL.promoCal.register({
      id: "limited-challenge", name: "限量挑戰", icon: "🏁", sched: "window",
      enabled: function () { return specs().some(function (c) { return c.slots != null; }); },
      resolve: function () {
        var lim = specs().filter(function (c) { return c.slots != null; })[0];
        if (!lim) return null;
        var w = windowOf(lim);
        return { startAt: w.start, endAt: w.end };
      },
      note: function () {
        var lim = list().filter(function (c) { return c.limited; })[0];
        if (!lim) return "";
        return lim.mine ? "你已搶到名額" : (lim.remaining > 0 ? ("先搶先贏 · 剩 " + lim.remaining + "/" + lim.slots + " 個名額") : "名額已被搶光");
      },
      open: function () { open(); }
    });
  }

  /* #106 說明中心（#72 容器）：**規則的擁有者自己解釋自己**。
   * 「先搶先贏」是本站唯一「達標了也可能拿不到」的獎勵形狀，而玩家在真站還會看到它**整條消失**
   * ——兩件事都必須有地方可查，否則就是 #72 卡自己寫下的病「有內容沒出口」。
   * 數字一律當場由 `list()` / `hiddenCount()` 求值（**不手抄**，且不新增第三個 DAILY 讀者，
   * 沿用第 65 行釘死的單一入口紀律）。 */
  if (HL.support && HL.support.register) {
    HL.support.register({
      id: "rules/limited-challenge", cat: "rules", order: 20,
      title: "限量挑戰的「先搶先贏」是怎麼算的？",
      keys: ["限量", "名額", "先搶先贏", "搶", "challenge", "limited", "slots", "挑戰"],
      body: function () {
        var lim = list().filter(function (c) { return c.limited; });
        var hidden = hiddenCount();
        if (!lim.length) {
          return hidden > 0
            ? "限量挑戰目前不提供。它的名額是「誰先達標誰先拿」，多人競逐同一份獎勵必須有伺服器當仲裁者；"
              + "真站尚未接入權威來源前，本站選擇**據實不提供**，而不是讓你在單機模擬裡「必勝」。"
              + "一般（不限量）的倍數挑戰不受影響，照常可玩可領。"
            : "目前沒有限量挑戰在檔期內。限量挑戰是有名額、會被搶光的挑戰，開檔時會出現在挑戰面板與活動日曆。";
        }
        var rows = lim.map(function (c) {
          return c.name + "：名額 " + c.slots + " 個，目前剩 " + c.remaining + " 個"
               + (c.mine ? "（你已搶到）" : (c.missed ? "（你已達標但名額已被搶走）" : ""));
        });
        return "限量挑戰採**先搶先贏**：" + rows.join("；") + "。"
             + "名額在你**達成條件的那一刻**就結算（不是領獎那一刻）——搶到才會保留給你，獎金之後再領；"
             + "沒搶到就是沒搶到，面板會據實顯示「已被搶走」而不是把進度藏起來。"
             + "每日 0 點重置後名額重新開放。獎金一律入獎金錢包。";
      },
      action: { label: "開啟挑戰面板", run: function () { open(); } }
    });
  }
})(window);

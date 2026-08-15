/*
 * Apex Win｜限時損失保險 / 新手安全網 HL.safetynet（自我進化引擎 #48）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 BC.Game 2026『BC Engine』72 小時新手安全網（前 3 日淨損 20% cashback、無流水綁定）——
 *   頂級平台驗證過的高效 onboarding 留存鉤：降低新玩家早期爆倉流失。
 * 與 #33 淨損 Cashback 互補不重疊：cashback 為「每週桶、隨 VIP 分級、需按鈕領取」的常駐回饋；
 *   本作為「註冊後前 N 日一次性窗口、每日自動退還、零流水」的限時保險（逾窗自動退場）。
 *
 * 核心哲學＝容器先於內容（擴充性優先）：一份 CAMPAIGN 設定就是一張可換的促銷排程——
 *   windowDays / rate / cap / enabled 皆 config；未來「週末損失保險」等變體＝換一份 CAMPAIGN
 *   （id 不符即自動重置窗口），不動這支引擎。用不到時 enabled:false 即整檔靜默退場。
 *
 * 淨損來源＝營運帳本 HL.ledger（liveStats.record 為唯一入口 → 記的即玩家真實 bet/win）：
 *   enrollment 當下 snapshot ledger totals，窗口淨損 = max(0, Δbet − Δwin)（贏局自然抵銷）。
 *   窗口內每日冪等退還 min(cap, 淨損×rate) − 已退，逾窗做最後結清；退還一律零流水入 HL.bonus。
 * 站別命名空間隔離（demo/live 平行宇宙，比照 cashback/ledger）：假站慷慨、真站保守併入 §11。
 * 懶觸發（比照 raffle/guild 週期）：boot / status() / open() 各跑一次 tick() 結算，無需常駐計時。
 * 註冊於 window.HL.safetynet = { status, open, tick, setCampaign }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money, dayNum = HL.dom.dayNum;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;   // T20＋站別命名空間（見 dom.js）
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_SAFETYNET";
  var DAY = 86400000;

  // ---- Campaign 設定（可換的促銷排程 · 容器先於內容）----
  //   rate/cap 支援 {demo,live} 分站別（resolved() 依 HL.site 取值）；純量亦可。
  //   換變體：setCampaign({ id:"weekend-insurance-v1", windowDays:2, rate:{demo:.15,live:.05}, ... })。
  var CAMPAIGN = {
    id: "newbie-safetynet-v1",
    name: "新手安全網",
    icon: "🛡️",
    windowDays: 7,                       // 註冊後前 N 日（BC.Game 3 日 → ApexWin 放寬 7 日 onboarding 窗口）
    rate: { demo: 0.20, live: 0.10 },    // 淨損退還率（假站慷慨展示；真站保守，須小於莊優不侵蝕利潤 §11）
    cap: { demo: 5000, live: 500 },      // 累計退還封頂
    enabled: true
  };
  function setCampaign(cfg) { if (cfg && cfg.id) CAMPAIGN = cfg; return HL.safetynet; } // 換季/白標出口

  function resolved() {
    var live = !!(HL.site && HL.site.isLive());
    var pick = function (v) { return (v && typeof v === "object") ? (live ? v.live : v.demo) : v; };
    return {
      id: CAMPAIGN.id, name: CAMPAIGN.name, icon: CAMPAIGN.icon,
      windowDays: CAMPAIGN.windowDays, rate: pick(CAMPAIGN.rate), cap: pick(CAMPAIGN.cap),
      enabled: CAMPAIGN.enabled !== false
    };
  }

  // ---- 帳本淨損（窗口 delta；ledger 唯一 bet/win 入口＝liveStats）----
  function ledgerTotals() {
    try { var x = HL.ledger ? HL.ledger.totals() : null; return { bet: (x && x.bet) || 0, win: (x && x.win) || 0 }; }
    catch (e) { return { bet: 0, win: 0 }; }
  }
  function windowNetLoss(s) {
    var lt = ledgerTotals();
    return Math.max(0, (lt.bet - (s.snapBet || 0)) - (lt.win - (s.snapWin || 0)));
  }
  function eligibleTotal(s, c) { return Math.min(c.cap, Math.floor(windowNetLoss(s) * c.rate)); }

  // ---- 窗口狀態（站別命名空間；cid 不符＝新 campaign 自動重置）----
  function ensure() {
    var c = resolved(), s = ls(KEY, null);
    if (!s || s.cid !== c.id) {
      var lt = ledgerTotals();
      s = { cid: c.id, startTs: Date.now(), snapBet: lt.bet, snapWin: lt.win, refunded: 0, lastDay: -1, done: false };
      save(KEY, s);
    }
    return s;
  }
  function daysElapsed(s) { return Math.floor((Date.now() - (s.startTs || Date.now())) / DAY); }
  function daysLeft(s, c) { return Math.max(0, c.windowDays - daysElapsed(s)); }
  function expired(s, c) { return Date.now() >= (s.startTs || 0) + c.windowDays * DAY; }

  function grant(amt, c) {
    amt = Math.round(amt); if (amt <= 0) return;
    if (HL.bonus) HL.bonus.add(amt, { wagerFree: true, source: "新手安全網" }); // 零流水（比照 #33），授予當下自動入 ledger
    if (HL.notify) HL.notify.add({ ic: c.icon, title: c.name, text: "前 " + c.windowDays + " 日淨損退還 " + money(amt) + " 已入獎金錢包（零流水）。" });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }

  // ---- 懶觸發結算：窗口內每日冪等退、逾窗最後結清 ----
  function tick() {
    var c = resolved();
    if (!c.enabled) return 0;
    var s = ensure();
    if (s.done) return 0;
    var elig = eligibleTotal(s, c), paid = 0;
    if (expired(s, c)) {                       // 逾窗：結清剩餘可退（一次）後退場
      var due = elig - (s.refunded || 0);
      if (due > 0) { grant(due, c); s.refunded = (s.refunded || 0) + due; paid = due; }
      s.done = true; save(KEY, s);
      return paid;
    }
    var today = dayNum();                       // 窗口內：每個自然日最多退一次當日新增可退（refunded 累計＝永不超付）
    if (s.lastDay !== today) {
      var due2 = elig - (s.refunded || 0);
      if (due2 > 0) { grant(due2, c); s.refunded = (s.refunded || 0) + due2; paid = due2; s.lastDay = today; save(KEY, s); }
    }
    return paid;
  }

  function status() {
    var c = resolved();
    tick();                                     // 懶觸發：讀狀態前先結算任何到期/當日應退
    var s = ensure();
    var elig = eligibleTotal(s, c);
    return {
      id: c.id, name: c.name, icon: c.icon, enabled: c.enabled,
      windowDays: c.windowDays, rate: c.rate, cap: c.cap,
      active: !s.done && !expired(s, c), done: !!s.done,
      daysLeft: daysLeft(s, c), netLoss: windowNetLoss(s),
      refunded: s.refunded || 0,
      pending: Math.max(0, elig - (s.refunded || 0)),   // 目前累積待退（下次每日/到期自動退）
      capReached: elig >= c.cap
    };
  }

  // ---- 面板（純資訊：自動退還、非按鈕領取）----
  function open() {
    var st = status();
    var pct = st.cap > 0 ? Math.min(100, (st.refunded / st.cap) * 100) : 0;
    var head = el("div", { class: "ax-panel ax-snet__hd" }, [
      el("div", { class: "ax-snet__title" }, [
        el("b", { text: st.icon + " " + t("新手安全網", "新手安全網") }),
        el("small", { class: "ax-muted", text: st.done
          ? t("保障已結束", "保障已結束")
          : (t("保障中 · 剩餘", "保障中 · 剩餘") + " " + st.daysLeft + " " + t("天", "天")) })
      ]),
      HL.ui.kv(t("保障窗口", "保障窗口"), t("註冊後前", "註冊後前") + " " + st.windowDays + " " + t("天", "天")),
      HL.ui.kv(t("淨損退還率", "淨損退還率"), (st.rate * 100).toFixed(0) + "%", { valCls: "ax-gold" }),
      HL.ui.kv(t("窗口內累計淨損", "窗口內累計淨損"), money(st.netLoss)),
      HL.ui.kv(t("已自動退還", "已自動退還"), money(st.refunded), { valCls: "ax-gold" }),
      HL.ui.kv(t("目前累積待退", "目前累積待退"), money(st.pending)),
      HL.ui.progress(pct),
      el("small", { class: "ax-muted", text: t("退還封頂", "退還封頂") + " " + money(st.cap)
        + (st.capReached ? t("（已達封頂）", "（已達封頂）") : "") })
    ]);
    var note = el("small", { class: "ax-muted", style: "display:block;margin-top:8px", text: st.done
      ? t("保障窗口已結束，淨損退還已全數結清。", "保障窗口已結束，淨損退還已全數結清。")
      : t("僅在你「淨輸」時退還（贏局自動抵銷）。每日自動把窗口內累計淨損 × 退還率退回獎金錢包，零流水；逾窗自動結清退場。", "僅在你「淨輸」時退還（贏局自動抵銷）。每日自動把窗口內累計淨損 × 退還率退回獎金錢包，零流水；逾窗自動結清退場。") });
    var goBonus = el("button", { class: "ax-btn-ghost", text: t("去獎金錢包領取 →", "去獎金錢包領取 →"), onClick: function () { HL.ui.closeTop(); if (HL.bonus) HL.bonus.open(); } });
    HL.ui.modal(st.icon + " " + t("新手安全網 · 限時損失保險", "新手安全網 · 限時損失保險"), [
      head, note, goBonus,
      el("span", { class: "ax-demo-tag", text: t("前 N 日淨損自動退還 · 零流水 · Demo", "前 N 日淨損自動退還 · 零流水 · Demo") })
    ]);
  }

  HL.safetynet = { status: status, open: open, tick: tick, setCampaign: setCampaign };

  /* #90 經濟旋鈕自我描述：退還率與封頂皆為**送幣型** ⇒ strict:"le"。
   * 直接讀 `CAMPAIGN`（換季/白標經 `setCampaign()` 抽換後，儀表板自動顯示新檔的值）。 */
  if (HL.econCfg && HL.econCfg.register) {
    HL.econCfg.register({
      id: "safetynet", label: "新手安全網保險（#48）", icon: "🛡️", order: 60,
      describe: function () {
        var pick = function (v, m) { return (v && typeof v === "object") ? v[m] : v; };
        return [
          { key: "id", label: "當期檔案", demo: CAMPAIGN.id, live: CAMPAIGN.id, unit: "", note: CAMPAIGN.enabled !== false ? "啟用中" : "已停用" },
          { key: "rate", label: "淨損退還率", demo: Math.round(pick(CAMPAIGN.rate, "demo") * 1000) / 10, live: Math.round(pick(CAMPAIGN.rate, "live") * 1000) / 10, unit: "%", strict: "le",
            note: "須小於莊家優勢才不侵蝕利潤（§11）" },
          { key: "cap", label: "累計退還封頂", demo: pick(CAMPAIGN.cap, "demo"), live: pick(CAMPAIGN.cap, "live"), unit: " 元", strict: "le" },
          { key: "windowDays", label: "註冊後可用天數", demo: CAMPAIGN.windowDays, live: CAMPAIGN.windowDays, unit: " 日", note: "兩站同值" }
        ];
      }
    });
  }

  // 開機懶觸發：確保窗口起算 + 結算任何到期/當日應退（無需常駐計時器）
  try { if (HL.ledger) tick(); } catch (e) {}
})(window);

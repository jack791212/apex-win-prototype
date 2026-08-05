/*
 * Apex Win｜負責任博弈 HL.rg（自我進化引擎 #67）
 * ─────────────────────────────────────────────────────────────────────
 * 來源：2026-08-05 平台軌審「資安」分類。此模組**不是**憑空新增的功能，而是把三個
 *   早已存在卻懸空的零件接起來——2026-07-28 台帳即記載本項「並非乾淨的 absent，
 *   而是『已對外宣告但點進去是空的』」，並列為「下一輪平台軌首選候選」，其後 8 天未被認領：
 *     ① `layout/app-shell.js` 福利中心 hub 的 `🛡️ 負責任博弈` 只呼叫 `ui.comingSoon()` ＝死巷入口
 *     ② `core/app-state.js` 的 `lossLimitRemaining: 5000`（註解「安全遊戲：今日剩餘額度」）
 *        有宣告、有 reset()，但**全站零讀取者＝死欄位**
 *     ③ `core/i18n.js` 早已備妥 key「負責任博弈」→ Responsible Gaming／负责任博弈
 *   ⇒ 缺的只有中間這層引擎。這是引擎第四次遇到「元件/欄位做好但接線沒補完」
 *     （前有 P4 的 `HL.dock`、07-31 台帳的 `promoCal` 外部註冊者為零、#66 的 `HL.reveal`）。
 *
 * 與 CONTROL.avoid 的界線（重要）：avoid 列的是「法定合規」＝法域強制、認證、報送、KYC。
 *   本檔做的是**玩家自願的自我約束工具**，屬純前端 UX，不涉牌照與任何外部審查
 *   ⇒ 台帳 07-28 即已判定「可做」，KYC 則維持 absent 且不開卡。
 *
 * 核心哲學＝容器先於內容（擴充性優先）：
 *   - **限額型別是註冊表**：`register(spec)` 自我上架（比照 `HL.games.register`／
 *     `HL.achievements.register`／`HL.promoCal.register`）。新增一種限額＝加一筆 spec，
 *     **不改閘、不改面板、不改任何遊戲檔**——面板逐筆渲染、閘逐筆求值。
 *   - 每筆 spec ＝ `{ id, label, unit, period, measure(st), fmt }`：`measure` 說「這型別現在用掉多少」，
 *     `period` 說「多久歸零」。閘只做一件事：`measure(st) + 本注 > limit ⇒ 擋`。
 *   - **未設限額者行為逐位不變＝零回歸**：`check()` 在無任何生效限額時回 `{ok:true}`，
 *     不碰餘額、不碰結算、不生成任何 DOM（見 selftest rg/zero-regression）。
 *
 * 完整性關鍵＝**調升冷卻（cool-down on increase）**：限額若能隨時調高，工具就只是裝飾
 *   （玩家上頭時一鍵放寬＝等於沒有）。故採業界標準的不對稱規則：
 *     **調降/新設 → 立即生效；調升/移除 → 排程 24 小時後才生效**（期間可隨時取消）。
 *   這條不對稱性是本檔最重要的不變量，由 selftest 逐向驗證。
 *
 * 冷靜期（cooling-off）＝玩家自選一段時間內全站停止下注，時間到自動解除。
 * 現實檢查（reality check）＝每 N 分鐘提醒已玩時長與淨損（可關）。
 *
 * 站別隔離：一律走 `HL.dom.lsGet/lsSet`（真站 `r:` 前綴）⇒ demo/live 各自一份限額。
 * 樣式走 inline（維護軌正在 components.css 作業，避免跨軌衝突；比照 #48/#49/#52/#54）。
 *
 * 雙環境契約（比照 #50 edge／#51 betlog／#54 release／#56 ledger）：純資料/純函式區
 *   （TYPES/rollover/effective/evaluate/planChange）以 `module.exports` 暴露供 node require
 *   ⇒ **`prototype/tests/run.js` 驗的即瀏覽器跑的同一份**。
 * 註冊於 window.HL.rg。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  var DAY = 86400000;
  var RAISE_DELAY_MS = DAY;          // 調升/移除限額的冷卻期（業界標準 24h）
  var IDLE_CAP_MS = 60000;           // 兩次結算間最多計入的「遊玩時間」（防掛機灌時數）
  var KEY = "HL_RG";

  function dayOf(ts) { return Math.floor(ts / DAY); }

  /* ===================== 限額型別註冊表 =====================
   * measure(st) 回傳「本期已用量」，與 limit 同單位。period："day" 每日歸零／"none" 不累積（逐注比較）。
   * perBet:true 表示此型別比較的是「單注本身」而非累積量。 */
  var TYPES = [];
  function register(spec) {
    if (!spec || !spec.id || typeof spec.measure !== "function") return null;
    for (var i = 0; i < TYPES.length; i++) {
      if (TYPES[i].id === spec.id) { TYPES[i] = normalize(spec); return TYPES[i]; }  // 同 id 覆蓋（重載安全）
    }
    var n = normalize(spec);
    TYPES.push(n);
    return n;
  }
  function normalize(s) {
    return {
      id: s.id,
      label: s.label || s.id,
      unit: s.unit || "money",                       // money | minutes
      period: s.period === "none" ? "none" : "day",
      perBet: !!s.perBet,
      measure: s.measure,
      hint: s.hint || ""
    };
  }
  function typeOf(id) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i]; return null; }

  register({
    id: "loss-daily", label: "每日淨損上限", unit: "money", period: "day",
    hint: "今日輸掉（押注扣掉贏分）達到此金額後，今日不再能下注。",
    measure: function (st) { return Math.max(0, (st.wagered || 0) - (st.won || 0)); }
  });
  register({
    id: "wager-daily", label: "每日投注額上限", unit: "money", period: "day",
    hint: "今日累計押注總額達到此金額後，今日不再能下注（不論輸贏）。",
    measure: function (st) { return st.wagered || 0; }
  });
  register({
    id: "bet-single", label: "單注上限", unit: "money", period: "none", perBet: true,
    hint: "單筆押注不得超過此金額。",
    measure: function () { return 0; }
  });
  register({
    id: "time-daily", label: "每日遊玩時間上限", unit: "minutes", period: "day",
    hint: "今日累計遊玩時間達到此分鐘數後，今日不再能下注。",
    measure: function (st) { return Math.floor((st.playMs || 0) / 60000); }
  });

  /* ===================== 純邏輯（決定性、可 node 驗）===================== */

  function blank(now) { return { day: dayOf(now), wagered: 0, won: 0, playMs: 0, lastAt: 0 }; }

  // 跨日歸零：只清「每日」量，限額設定本身不動
  function rollover(st, now) {
    if (!st) return blank(now);
    if (st.day !== dayOf(now)) {
      st.day = dayOf(now); st.wagered = 0; st.won = 0; st.playMs = 0; st.lastAt = 0;
    }
    return st;
  }

  /* 生效值：pending 調升到期後即成為正式值。
   * 回 { value, pending } —— value 為「此刻真正生效」的限額（null＝未設限）。 */
  function effective(lim, now) {
    if (!lim) return { value: null, pending: null };
    var v = (lim.value == null ? null : lim.value);
    var p = lim.pending || null;
    if (p && now >= p.at) { v = (p.value == null ? null : p.value); p = null; }
    return { value: v, pending: p };
  }

  /* 變更計畫：調降/新設立即生效；調升/移除排 RAISE_DELAY_MS 後生效。
   * 回新的 lim 物件（純函式，不改入參）。next=null 代表移除限額。 */
  function planChange(lim, next, now) {
    var cur = effective(lim, now).value;
    var immediate =
      (next != null) && (cur == null || next <= cur);   // 新設 或 調降 ⇒ 立即
    if (immediate) return { value: next, pending: null };
    if (next != null && cur != null && next === cur) return { value: cur, pending: null };
    // 調升或移除 ⇒ 排程；期間原限額仍生效
    return { value: cur, pending: { value: next, at: now + RAISE_DELAY_MS } };
  }

  /* 閘：回 { ok, id, limit, used, kind }。kind："cool"（冷靜期）／"limit"（限額）。
   * limits＝{ [typeId]: limObj }。無任何生效限額且非冷靜期 ⇒ { ok:true }（零回歸契約）。 */
  function evaluate(limits, st, bet, now, coolUntil) {
    if (coolUntil && now < coolUntil) return { ok: false, kind: "cool", until: coolUntil };
    bet = Math.max(0, bet || 0);
    st = st || blank(now);
    limits = limits || {};
    for (var i = 0; i < TYPES.length; i++) {
      var ty = TYPES[i];
      var e = effective(limits[ty.id], now);
      if (e.value == null) continue;
      var used = ty.measure(st);
      var after = ty.perBet ? (ty.unit === "money" ? bet : 0) : used + (ty.unit === "money" ? bet : 0);
      if (after > e.value) {
        return { ok: false, kind: "limit", id: ty.id, limit: e.value, used: used, unit: ty.unit, perBet: ty.perBet };
      }
    }
    return { ok: true };
  }

  var CORE = {
    TYPES: TYPES, register: register, typeOf: typeOf,
    dayOf: dayOf, blank: blank, rollover: rollover,
    effective: effective, planChange: planChange, evaluate: evaluate,
    RAISE_DELAY_MS: RAISE_DELAY_MS, IDLE_CAP_MS: IDLE_CAP_MS
  };

  // ===================== 測項（雙環境同一份定義）=====================
  function registerTests(st) {
    if (!st || !st.register) return;
    var T0 = 1700000000000;   // 固定基準時刻（決定性：不用 Date.now）

    st.register({
      id: "rg/zero-regression", group: "rg", title: "未設任何限額時閘為恆真（不影響既有玩法）",
      run: function (t) {
        var s = blank(T0);
        [0, 1, 100, 1e9].forEach(function (b) {
          t.equal(evaluate({}, s, b, T0, 0).ok, true, "未設限額時押注 " + b + " 應放行");
          t.equal(evaluate(null, null, b, T0, null).ok, true, "limits/st 皆缺時押注 " + b + " 仍應放行");
        });
        // 限額設為 null（曾設過又移除）亦視為未設限
        t.equal(evaluate({ "loss-daily": { value: null, pending: null } }, s, 1e9, T0, 0).ok, true,
          "限額值為 null 應等同未設限");
      }
    });

    st.register({
      id: "rg/limit-gate", group: "rg", title: "四種限額型別的邊界與跨日歸零",
      run: function (t) {
        // 每日淨損：已輸 800，限 1000 ⇒ 再押 200 剛好到頂（不擋），201 才擋
        var s1 = { day: dayOf(T0), wagered: 1000, won: 200, playMs: 0, lastAt: 0 };
        var L = { "loss-daily": { value: 1000 } };
        t.equal(evaluate(L, s1, 200, T0, 0).ok, true, "淨損 800+200=1000 恰達上限應放行（>而非>=）");
        t.equal(evaluate(L, s1, 201, T0, 0).ok, false, "淨損超過上限應擋");
        // 每日投注額
        var s2 = { day: dayOf(T0), wagered: 4900, won: 0, playMs: 0, lastAt: 0 };
        t.equal(evaluate({ "wager-daily": { value: 5000 } }, s2, 100, T0, 0).ok, true, "投注額恰達上限應放行");
        t.equal(evaluate({ "wager-daily": { value: 5000 } }, s2, 101, T0, 0).ok, false, "投注額超過上限應擋");
        // 單注上限：比較單注本身，與累積量無關
        var s3 = { day: dayOf(T0), wagered: 999999, won: 0, playMs: 0, lastAt: 0 };
        t.equal(evaluate({ "bet-single": { value: 500 } }, s3, 500, T0, 0).ok, true, "單注恰達上限應放行");
        t.equal(evaluate({ "bet-single": { value: 500 } }, s3, 501, T0, 0).ok, false, "單注超過上限應擋");
        // 遊玩時間：60 分上限，已玩 59 分放行、61 分擋（時間型別不受本注金額影響）
        var s4 = { day: dayOf(T0), wagered: 0, won: 0, playMs: 59 * 60000, lastAt: 0 };
        t.equal(evaluate({ "time-daily": { value: 60 } }, s4, 1e9, T0, 0).ok, true, "遊玩 59<60 分應放行");
        s4.playMs = 61 * 60000;
        t.equal(evaluate({ "time-daily": { value: 60 } }, s4, 1, T0, 0).ok, false, "遊玩 61>60 分應擋");
        // 跨日歸零：同一份 state 換到隔天，累積量全清 ⇒ 重新放行
        var s5 = rollover({ day: dayOf(T0), wagered: 9999, won: 0, playMs: 99 * 60000, lastAt: T0 }, T0 + DAY);
        t.equal(s5.wagered, 0, "跨日應清空 wagered");
        t.equal(s5.playMs, 0, "跨日應清空 playMs");
        t.equal(evaluate({ "wager-daily": { value: 5000 } }, s5, 100, T0 + DAY, 0).ok, true, "跨日後應重新放行");
      }
    });

    st.register({
      id: "rg/raise-cooldown", group: "rg", title: "調降立即生效、調升須等 24h（本檔最重要的不對稱不變量）",
      run: function (t) {
        // 新設 ⇒ 立即
        var a = planChange(null, 1000, T0);
        t.equal(effective(a, T0).value, 1000, "首次設定應立即生效");
        // 調降 ⇒ 立即
        var b = planChange(a, 300, T0);
        t.equal(effective(b, T0).value, 300, "調降應立即生效");
        t.equal(!!effective(b, T0).pending, false, "調降不應留下 pending");
        // 調升 ⇒ 排程，期間仍受舊（較嚴）限額約束
        var c = planChange(b, 5000, T0);
        t.equal(effective(c, T0).value, 300, "調升在冷卻期內應仍套用舊限額");
        t.equal(effective(c, T0 + RAISE_DELAY_MS - 1).value, 300, "冷卻期最後一毫秒仍為舊限額");
        t.equal(effective(c, T0 + RAISE_DELAY_MS).value, 5000, "冷卻期屆滿應生效為新限額（含邊界）");
        // 移除限額 ⇒ 同樣須等 24h
        var d = planChange(b, null, T0);
        t.equal(effective(d, T0).value, 300, "移除限額在冷卻期內應仍受限");
        t.equal(effective(d, T0 + RAISE_DELAY_MS).value, null, "冷卻期屆滿後限額才真正移除");
        // 冷卻期內「再調降」應立即生效並取消 pending（不能被 pending 卡住而變不嚴）
        var e = planChange(c, 100, T0 + 1000);
        t.equal(effective(e, T0 + 1000).value, 100, "冷卻期內再調降應立即生效");
        t.equal(!!e.pending, false, "再調降應清掉未生效的調升");
        // 閘實際套用生效值：調升冷卻期間，超過舊限額的注仍被擋
        var s = { day: dayOf(T0), wagered: 0, won: 0, playMs: 0, lastAt: 0 };
        t.equal(evaluate({ "bet-single": c }, s, 1000, T0, 0).ok, false, "冷卻期內超過舊限額應仍被擋");
        t.equal(evaluate({ "bet-single": c }, s, 1000, T0 + RAISE_DELAY_MS, 0).ok, true, "冷卻屆滿後同一注應放行");
      }
    });

    st.register({
      id: "rg/cooling-off", group: "rg", title: "冷靜期內全站擋注、到期自動解除",
      run: function (t) {
        var s = blank(T0);
        var until = T0 + 3600000;
        var r = evaluate({}, s, 1, T0, until);
        t.equal(r.ok, false, "冷靜期內即使未設任何限額也應擋注");
        t.equal(r.kind, "cool", "冷靜期應以 kind=cool 回報（供 UI 分流訊息）");
        t.equal(evaluate({}, s, 1, until - 1, until).ok, false, "冷靜期最後一毫秒仍應擋");
        t.equal(evaluate({}, s, 1, until, until).ok, true, "冷靜期屆滿應自動解除（含邊界）");
        // 冷靜期優先於限額：即使限額充足也擋
        t.equal(evaluate({ "bet-single": { value: 1e9 } }, s, 1, T0, until).kind, "cool",
          "冷靜期應優先於限額判定");
      }
    });

    st.register({
      id: "rg/registry", group: "rg", title: "限額型別註冊表：可擴充且每筆描述子齊備",
      run: function (t) {
        t.ok(TYPES.length >= 4, "應至少註冊 4 種限額型別");
        TYPES.forEach(function (ty) {
          t.isFn(ty.measure, "型別 " + ty.id + " 應有 measure 述詞");
          t.ok(!!ty.label, "型別 " + ty.id + " 應有 label");
          t.ok(ty.unit === "money" || ty.unit === "minutes", "型別 " + ty.id + " 單位應為 money/minutes");
          t.ok(ty.period === "day" || ty.period === "none", "型別 " + ty.id + " 週期應為 day/none");
        });
        // 擴充性契約：新增一種限額＝加一筆 spec，閘立刻認得它，且不影響既有型別
        var before = TYPES.length;
        register({ id: "__probe", label: "測試用", unit: "money", period: "day", measure: function (s) { return s.wagered || 0; } });
        t.equal(TYPES.length, before + 1, "register 應把新型別掛進註冊表");
        var s = { day: dayOf(T0), wagered: 900, won: 0, playMs: 0, lastAt: 0 };
        t.equal(evaluate({ "__probe": { value: 1000 } }, s, 50, T0, 0).ok, true, "新型別未超限應放行");
        t.equal(evaluate({ "__probe": { value: 1000 } }, s, 200, T0, 0).ok, false, "新型別超限應由閘擋下（零改閘）");
        // 同 id 覆蓋不重複追加
        register({ id: "__probe", label: "測試用2", unit: "money", period: "day", measure: function () { return 0; } });
        t.equal(TYPES.length, before + 1, "同 id 重複註冊應覆蓋而非追加");
        TYPES.pop();   // 還原，避免污染後續測項/面板
        t.equal(TYPES.length, before, "測試後應還原註冊表");
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 以下為瀏覽器區 =====================
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }

  function load() {
    var o = HL.dom.lsGet(KEY, null);
    if (!o) o = { limits: {}, coolUntil: 0, rc: { on: false, everyMin: 30, lastAt: 0 }, st: blank(Date.now()) };
    if (!o.limits) o.limits = {};
    if (!o.rc) o.rc = { on: false, everyMin: 30, lastAt: 0 };
    o.st = rollover(o.st || blank(Date.now()), Date.now());
    return o;
  }
  function save(o) { HL.dom.lsSet(KEY, o); }

  // 把「今日剩餘淨損額度」餵回 app-state 的既有欄位（07-28 台帳記載的死欄位，本卡接線）
  function syncState(o) {
    if (!HL.state || !HL.state.set) return;
    var e = effective(o.limits["loss-daily"], Date.now());
    if (e.value == null) return;                       // 未設淨損限額 ⇒ 不動該欄位
    var used = typeOf("loss-daily").measure(o.st);
    HL.state.set({ lossLimitRemaining: Math.max(0, e.value - used) });
  }

  /* 中央結算點掛鉤：累積今日押注/贏分/遊玩時間。
   * 遊玩時間＝兩次結算的間隔（單次最多計入 IDLE_CAP_MS，防掛機灌時數）。 */
  function record(bet, win) {
    bet = Math.round(bet || 0); win = Math.round(win || 0);
    if (bet <= 0 && win <= 0) return;
    var now = Date.now(), o = load();
    o.st.wagered += Math.max(0, bet);
    o.st.won += Math.max(0, win);
    if (o.st.lastAt) o.st.playMs += Math.min(now - o.st.lastAt, IDLE_CAP_MS);
    o.st.lastAt = now;
    save(o);
    syncState(o);
    maybeRealityCheck(o, now);
  }

  /* 下注前閘（由 HL.instant／HL.table 呼叫）：回 true＝放行。
   * 被擋時自行 toast 說明原因並回 false ⇒ 呼叫端一行即可接。 */
  function check(bet) {
    var now = Date.now(), o = load();
    var r = evaluate(o.limits, o.st, bet, now, o.coolUntil);
    if (r.ok) return true;
    if (r.kind === "cool") {
      HL.ui.toast(t("冷靜期進行中，暫停下注", "冷靜期進行中，暫停下注") + "（" + fmtLeft(r.until - now) + "）", "warn");
    } else {
      var ty = typeOf(r.id);
      var val = ty.unit === "minutes" ? (r.limit + " min") : money(r.limit);
      HL.ui.toast(t("已達" + ty.label, "已達" + ty.label) + "（" + val + "）", "warn");
    }
    return false;
  }
  function allowed(bet) { return evaluate(load().limits, load().st, bet, Date.now(), load().coolUntil).ok; }

  function fmtLeft(ms) {
    ms = Math.max(0, ms);
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? (h + "h " + m + "m") : (m + "m");
  }

  // ===== 現實檢查：每 N 分鐘提醒已玩時長與淨損 =====
  function maybeRealityCheck(o, now) {
    var rc = o.rc;
    if (!rc.on) return;
    if (!rc.lastAt) { rc.lastAt = now; save(o); return; }
    if (now - rc.lastAt < rc.everyMin * 60000) return;
    rc.lastAt = now; save(o);
    var net = (o.st.wagered || 0) - (o.st.won || 0);
    if (HL.notify) {
      HL.notify.add({
        ic: "⏱️", title: t("現實檢查", "現實檢查"),
        text: t("今日已遊玩", "今日已遊玩") + " " + Math.floor((o.st.playMs || 0) / 60000) + " min · " +
          (net >= 0 ? t("今日淨損", "今日淨損") : t("今日淨贏", "今日淨贏")) + " " + money(Math.abs(net))
      });
    }
    HL.ui.toast("⏱️ " + t("現實檢查", "現實檢查"), "info");
  }

  // ===== 對外查詢 =====
  function status() {
    var now = Date.now(), o = load();
    var out = { cooling: !!(o.coolUntil && now < o.coolUntil), coolUntil: o.coolUntil || 0, rc: o.rc, limits: [] };
    TYPES.forEach(function (ty) {
      var e = effective(o.limits[ty.id], now);
      out.limits.push({
        id: ty.id, label: ty.label, unit: ty.unit, value: e.value,
        pending: e.pending, used: ty.measure(o.st), perBet: ty.perBet
      });
    });
    return out;
  }

  function setLimit(id, next) {
    if (!typeOf(id)) return false;
    var now = Date.now(), o = load();
    o.limits[id] = planChange(o.limits[id], (next == null ? null : Math.max(0, Math.round(next))), now);
    save(o); syncState(o);
    return effective(o.limits[id], now);
  }
  function cancelPending(id) {
    var o = load();
    if (o.limits[id]) { o.limits[id].pending = null; save(o); }
  }
  function coolOff(ms) {
    var o = load();
    o.coolUntil = Date.now() + Math.max(0, ms || 0);
    save(o);
    if (HL.notify) HL.notify.add({ ic: "🛡️", title: t("冷靜期已啟動", "冷靜期已啟動"), text: t("期間將暫停下注，時間到自動解除。", "期間將暫停下注，時間到自動解除。") });
    return o.coolUntil;
  }
  function setRealityCheck(on, everyMin) {
    var o = load();
    o.rc.on = !!on;
    if (everyMin) o.rc.everyMin = Math.max(5, Math.round(everyMin));
    o.rc.lastAt = Date.now();
    save(o);
    return o.rc;
  }

  // ===================== 面板 =====================
  function limitRow(L) {
    var valTxt = L.value == null ? t("未設定", "未設定")
      : (L.unit === "minutes" ? (L.value + " min") : money(L.value));
    var usedTxt = L.perBet ? "—" : (L.unit === "minutes" ? (L.used + " min") : money(L.used));

    var input = el("input", {
      class: "ax-input", type: "number", min: "0", placeholder: t("輸入數值", "輸入數值"),
      value: L.value == null ? "" : String(L.value)
    });
    input.style.cssText = "width:110px;padding:6px 8px;border-radius:8px;border:1px solid var(--ax-border);background:var(--ax-bg-2);color:var(--ax-text);";

    // ⚠️ UI 品質：`.ax-btn-ghost` 預設 display:block + 撐滿容器寬，直接用會讓「套用」變成一條長條
    //    （UI 品質清單記載的既知反例）。此處收成內容寬的行內按鈕。
    var apply = el("button", { class: "ax-btn-ghost", text: t("套用", "套用") });
    apply.style.cssText = "width:auto;flex:0 0 auto;display:inline-block;padding:8px 14px";
    apply.addEventListener("click", function () {
      var raw = input.value.trim();
      var next = raw === "" ? null : Number(raw);
      if (raw !== "" && (!isFinite(next) || next < 0)) { HL.ui.toast(t("請輸入有效數值", "請輸入有效數值"), "warn"); return; }
      var cur = L.value;
      setLimit(L.id, next);
      var immediate = (next != null) && (cur == null || next <= cur);
      HL.ui.toast(immediate ? t("限額已立即生效", "限額已立即生效") : t("調升將於 24 小時後生效", "調升將於 24 小時後生效"), immediate ? "ok" : "info");
      HL.ui.closeTop(); open();
    });

    var kids = [
      el("div", { style: "flex:1;min-width:0" }, [
        el("div", { text: t(L.label, L.label) }),
        // ⚠️ P3 契約：DOM walker 只翻「整個文字節點 == 一條 key」者，故中文片語與數值必須各自成節點
        //    （寫成 "目前 未設定 · 今日已用 NT$0" 一整串就永遠翻不到——本輪 preview 實測過這個錯）。
        el("small", { class: "ax-muted" }, [
          el("span", { text: t("目前", "目前") }),
          document.createTextNode(" "),
          (L.value == null ? el("span", { text: t("未設定", "未設定") }) : document.createTextNode(valTxt)),
          document.createTextNode(" · "),
          el("span", { text: t("今日已用", "今日已用") }),
          document.createTextNode(" " + usedTxt)
        ])
      ]),
      input, apply
    ];
    var row = el("div", { class: "ax-kv" }, kids);
    row.style.cssText = "display:flex;gap:8px;align-items:center;flex-wrap:wrap";

    var box = el("div", {}, [row]);
    if (L.pending) {
      box.appendChild(el("div", { class: "ax-muted", style: "display:flex;gap:8px;align-items:center;padding:4px 0 8px" }, [
        el("small", {
          text: "⏳ " + (L.pending.value == null ? t("移除限額", "移除限額") : (t("調升為", "調升為") + " " +
            (L.unit === "minutes" ? (L.pending.value + " min") : money(L.pending.value)))) +
            " · " + t("剩餘", "剩餘") + " " + fmtLeft(L.pending.at - Date.now())
        }),
        (function () {
          var b = el("button", { class: "ax-btn-ghost", text: t("取消", "取消") });
          b.style.cssText = "width:auto;flex:0 0 auto;display:inline-block;padding:4px 10px";
          b.addEventListener("click", function () { cancelPending(L.id); HL.ui.closeTop(); open(); });
          return b;
        })()
      ]));
    }
    return box;
  }

  function open() {
    var s = status();
    var rows = s.limits.map(limitRow);

    // 冷靜期
    var coolWrap = el("div", { class: "ax-panel" }, [
      el("div", { text: t("冷靜期", "冷靜期") }),
      el("small", { class: "ax-muted", text: t("選一段時間暫停下注，時間到自動解除。啟動後無法提前解除。", "選一段時間暫停下注，時間到自動解除。啟動後無法提前解除。") })
    ]);
    if (s.cooling) {
      coolWrap.appendChild(el("div", { class: "ax-kv" }, [
        el("span", { text: t("冷靜期剩餘", "冷靜期剩餘") }),
        el("b", { class: "ax-gold", text: fmtLeft(s.coolUntil - Date.now()) })
      ]));
    } else {
      var btns = el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;padding-top:8px" });
      [[t("24 小時", "24 小時"), DAY], [t("7 天", "7 天"), 7 * DAY], [t("30 天", "30 天"), 30 * DAY]].forEach(function (p) {
        var b = el("button", { class: "ax-btn-ghost", text: p[0] });
        b.style.cssText = "width:auto;flex:0 0 auto;display:inline-block;padding:8px 14px";  // 三選項應為並排 chip 而非三條長條
        b.addEventListener("click", function () {
          coolOff(p[1]);
          HL.ui.toast(t("冷靜期已啟動", "冷靜期已啟動"), "ok");
          HL.ui.closeTop(); open();
        });
        btns.appendChild(b);
      });
      coolWrap.appendChild(btns);
    }

    // 現實檢查
    var rcBtn = el("button", { class: s.rc.on ? "ax-btn-primary" : "ax-btn-ghost", text: s.rc.on ? t("已開啟", "已開啟") : t("已關閉", "已關閉") });
    rcBtn.style.cssText = "width:auto;flex:0 0 auto;display:inline-block;padding:8px 14px";  // 開/關切換鈕，非主要 CTA，不該撐滿
    rcBtn.addEventListener("click", function () { setRealityCheck(!s.rc.on); HL.ui.closeTop(); open(); });
    var rcWrap = el("div", { class: "ax-panel" }, [
      el("div", { text: t("現實檢查", "現實檢查") }),
      el("small", { class: "ax-muted", text: t("每隔一段時間提醒你已遊玩時長與今日淨損。", "每隔一段時間提醒你已遊玩時長與今日淨損。") }),
      el("div", { class: "ax-kv" }, [el("span", { text: t("提醒間隔（分鐘）", "提醒間隔（分鐘）") }), el("b", { text: String(s.rc.everyMin) })]),
      el("div", { style: "padding-top:8px" }, [rcBtn])
    ]);

    HL.ui.modal(t("🛡️ 負責任博弈", "🛡️ 負責任博弈"), [
      el("div", { class: "ax-panel" }, [
        el("small", {
          class: "ax-muted",
          text: t("這些工具由你自己設定，用來控制遊玩節奏。調降或新設限額立即生效；調升或移除須等 24 小時，期間可隨時取消。",
            "這些工具由你自己設定，用來控制遊玩節奏。調降或新設限額立即生效；調升或移除須等 24 小時，期間可隨時取消。")
        })
      ]),
      HL.ui.sectionTitle ? HL.ui.sectionTitle(t("限額", "限額")) : el("div", { text: t("限額", "限額") }),
      el("div", { class: "ax-panel" }, rows),
      coolWrap,
      rcWrap,
      el("span", { class: "ax-demo-tag", text: t("自我約束工具 · 本瀏覽器 · 站別獨立", "自我約束工具 · 本瀏覽器 · 站別獨立") })
    ]);
  }

  HL.rg = {
    register: register, TYPES: TYPES, typeOf: typeOf,
    check: check, allowed: allowed, record: record, status: status,
    setLimit: setLimit, cancelPending: cancelPending,
    coolOff: coolOff, setRealityCheck: setRealityCheck, open: open,
    effective: effective, planChange: planChange, evaluate: evaluate, rollover: rollover
  };

  registerTests(HL.selftest);
})(typeof window !== "undefined" ? window : globalThis);

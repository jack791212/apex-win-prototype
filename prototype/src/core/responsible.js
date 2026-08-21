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
  var WEEK = 7 * DAY;
  var RAISE_DELAY_MS = DAY;          // 調升/移除限額的冷卻期（業界標準 24h）
  var IDLE_CAP_MS = 60000;           // 兩次結算間最多計入的「遊玩時間」（防掛機灌時數）
  var KEY = "HL_RG";

  function dayOf(ts) { return Math.floor(ts / DAY); }
  // #70：週/月桶**刻意沿用 #63 service-level.js 的同一口徑**（day/week 固定長度桶、month 走曆月），
  //   兩個模組的「期間」語意不得分岔——否則同一位玩家的提領週限與儲值週限會在不同的日子換期。
  function weekOf(ts) { return Math.floor(ts / WEEK); }
  function monthOf(ts) { var d = new Date(ts); return d.getFullYear() * 12 + d.getMonth(); }
  var PERIOD_OF = { day: dayOf, week: weekOf, month: monthOf };

  /* ===================== 限額型別註冊表 =====================
   * measure(st) 回傳「本期已用量」，與 limit 同單位。period："day"/"week"/"month" 到期歸零／"none" 不累積（逐注比較）。
   * perBet:true 表示此型別比較的是「單注本身」而非累積量。
   * axis（#70 新增）："bet" 下注側（預設）／"deposit" 儲值側——**閘依 axis 過濾型別**，
   *   否則「單注上限 500」會擋掉「儲值 1000」＝災難級誤擋。漏傳 axis 即退化為 "bet"（既有呼叫點零改動）。 */
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
      period: s.period === "none" ? "none" : (PERIOD_OF[s.period] ? s.period : "day"),
      axis: s.axis === "deposit" ? "deposit" : "bet",
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

  /* #70 儲值側三型別：業界最標準、幾乎每個負責任博弈頁面第一項的限額。
   * 三筆 spec 共用同一個 measure 工廠 ⇒ 新增一種週期（例如「每季」）只要加一筆、不改閘。 */
  function depMeasure(period) { return function (st) { return depUsed(st, period); }; }
  register({
    id: "deposit-daily", label: "每日儲值上限", unit: "money", period: "day", axis: "deposit",
    hint: "今日累計儲值達到此金額後，今日不再能儲值。", measure: depMeasure("day")
  });
  register({
    id: "deposit-weekly", label: "每週儲值上限", unit: "money", period: "week", axis: "deposit",
    hint: "本週累計儲值達到此金額後，本週不再能儲值。", measure: depMeasure("week")
  });
  register({
    id: "deposit-monthly", label: "每月儲值上限", unit: "money", period: "month", axis: "deposit",
    hint: "本月累計儲值達到此金額後，本月不再能儲值。", measure: depMeasure("month")
  });

  /* ===================== 暫停型別註冊表（#96 冷靜期 × 自我排除）=====================
   * 為什麼把「冷靜期」與「自我排除」做成**同一張註冊表的兩個 kind**，而不是兩套機制：
   *   兩者對閘的要求逐字相同（期間內全站擋注/擋儲值、不可提前解除、到期自動恢復），
   *   差別只有**長度**與**入口文案/確認強度**。做成兩套 ⇒ 閘就有兩個入口 ⇒ 第二個入口
   *   哪天漏接就是一個「UI 擋得住、console 擋不住」的洞（正是本卡不變量 (a) 要防的事）。
   *   ⇒ 這裡只留**一個**被閘讀取的欄位 `pause.until`，新增一種期間＝加一筆 spec。
   *
   * 調研佐證（2026-08-16 平台軌 · 兩來源交叉）：
   *   - Stake「Break in Play」＝1 天／2 天／1 週／1 個月（＝我們既有冷靜期 24h/7d/30d 的同一族）；
   *     其 self-exclusion 則是**無限期、最短 6 個月起跳**，期滿還需「formal return to play review」才復場。
   *   - 業界通用期間為 **6 個月／1 年／5 年 + 永久**（非本卡當初推測的 90/180 天／1 年）⇒ 依調研採前者。
   *   ⚠️ **刻意未做「期滿需人工復場審查」**：那需要客服/後端裁決（CONTROL.avoid：法定合規/後端），
   *     純前端只能做成假流程。本檔採「期滿自動恢復」＝與卡上不變量 (d) 一致，永久型則永不恢復。
   *
   * PERM_UNTIL ＝ ECMAScript 合法最大時戳。用它表示「永久」而非 Infinity，是因為
   *   `JSON.stringify(Infinity)` 會變成 `null` ⇒ 存進 localStorage 再讀回來**鎖就自己開了**。
   *   用最大時戳則 `now < until` 這條唯一的判斷式不必為永久型加任何特例。 */
  var PERM_UNTIL = 8640000000000000;
  var PAUSES = [];
  function registerPause(spec) {
    if (!spec || !spec.id) return null;
    var n = {
      id: spec.id, kind: spec.kind === "exclude" ? "exclude" : "cool",
      label: spec.label || spec.id, ms: Math.max(0, spec.ms || 0), permanent: !!spec.permanent
    };
    for (var i = 0; i < PAUSES.length; i++) if (PAUSES[i].id === n.id) { PAUSES[i] = n; return n; }
    PAUSES.push(n);
    return n;
  }
  function pauseSpecOf(id) { for (var i = 0; i < PAUSES.length; i++) if (PAUSES[i].id === id) return PAUSES[i]; return null; }
  function pauseOptions(kind) { return PAUSES.filter(function (p) { return p.kind === kind; }); }

  // 冷靜期：既有三選項由面板硬寫遷入註冊表（值逐位不變＝零回歸）
  registerPause({ id: "cool-1d", kind: "cool", label: "24 小時", ms: DAY });
  registerPause({ id: "cool-7d", kind: "cool", label: "7 天", ms: 7 * DAY });
  registerPause({ id: "cool-30d", kind: "cool", label: "30 天", ms: 30 * DAY });
  // 自我排除：長期／永久，啟動後不可撤銷
  registerPause({ id: "excl-6m", kind: "exclude", label: "6 個月", ms: 180 * DAY });
  registerPause({ id: "excl-1y", kind: "exclude", label: "1 年", ms: 365 * DAY });
  registerPause({ id: "excl-5y", kind: "exclude", label: "5 年", ms: 1825 * DAY });
  registerPause({ id: "excl-perm", kind: "exclude", label: "永久", ms: 0, permanent: true });

  /* ===================== 純邏輯（決定性、可 node 驗）===================== */

  function blank(now) {
    return { day: dayOf(now), wagered: 0, won: 0, playMs: 0, lastAt: 0, dep: blankDep(now) };
  }

  /* 儲值累計器（#70）：三個週期各記自己的桶號與已用量。
   * **跨日只清日、不清週/月**——否則玩家可用「跨日」繞過週限、用「跨週」繞過月限。 */
  function blankDep(now) {
    return { day: dayOf(now), week: weekOf(now), month: monthOf(now), used: { day: 0, week: 0, month: 0 } };
  }
  function rollDep(u, now) {
    if (!u || !u.used) return blankDep(now);
    if (u.day !== dayOf(now)) { u.day = dayOf(now); u.used.day = 0; }
    if (u.week !== weekOf(now)) { u.week = weekOf(now); u.used.week = 0; }
    if (u.month !== monthOf(now)) { u.month = monthOf(now); u.used.month = 0; }
    return u;
  }
  function addDep(u, amount, now) {
    u = rollDep(u, now);
    amount = Math.max(0, Math.round(amount || 0));
    u.used.day += amount; u.used.week += amount; u.used.month += amount;
    return u;
  }
  function depUsed(st, period) {
    var u = st && st.dep;
    return (u && u.used && u.used[period]) || 0;
  }

  // 跨期歸零：只清「已到期的量」，限額設定本身不動
  function rollover(st, now) {
    if (!st) return blank(now);
    if (st.day !== dayOf(now)) {
      st.day = dayOf(now); st.wagered = 0; st.won = 0; st.playMs = 0; st.lastAt = 0;
    }
    st.dep = rollDep(st.dep, now);            // 儲值三桶各自到期（與下注側的日桶正交）
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

  /* #96 暫停狀態的**唯一寫入口**——單調不可縮短。
   * 不變量 (b)「生效期間任何前端路徑都不得縮短或取消它」不是靠 UI 藏起按鈕來保證的（那種保證
   * console 一行就破），而是**結構上做不到**：狀態只有這一個 setter，它對更短的 until 直接原樣回傳。
   * ⇒ 已排除 5 年的人再點 24 小時冷靜期＝no-op；已永久排除的人點任何選項都＝no-op。 */
  function planPause(cur, spec, now) {
    if (!spec) return cur || null;
    var next = spec.permanent ? PERM_UNTIL : now + (spec.ms || 0);
    var curUntil = (cur && cur.until) || 0;
    if (next <= curUntil) return cur || null;          // 只能加長，永遠不能縮短或取消
    return { until: next, kind: spec.kind, id: spec.id, at: now };
  }
  // 閘與面板都經這兩個讀取器 ⇒ 第 5 參數可為舊格式數字（既有 27 個閘呼叫點與既有測項零改動）
  function pauseUntilOf(p) { return (p && typeof p === "object") ? (p.until || 0) : (p || 0); }
  function pauseKindOf(p) { return (p && typeof p === "object" && p.kind === "exclude") ? "exclude" : "cool"; }

  /* 閘：回 { ok, id, limit, used, kind }。kind："cool"（冷靜期）／"exclude"（自我排除·#96）／"limit"（限額）。
   * limits＝{ [typeId]: limObj }。無任何生效限額且非冷靜期 ⇒ { ok:true }（零回歸契約）。
   * axis（#70）：只求值同軸型別，預設 "bet" ⇒ **既有 16 個下注呼叫點漏傳亦行為不變**。
   * 冷靜期對**兩軸都擋**：冷靜期＝暫停賭博，期間還能儲值等於工具漏了一半（#70 唯一刻意改變既有行為處）。 */
  function evaluate(limits, st, amount, now, coolUntil, axis) {
    axis = axis === "deposit" ? "deposit" : "bet";
    // #96：冷靜期與自我排除共用這**唯一一條**判斷式 ⇒ 不存在「只有 UI 擋、閘沒擋」的第二條路
    var pu = pauseUntilOf(coolUntil);
    if (pu && now < pu) return { ok: false, kind: pauseKindOf(coolUntil), until: pu, axis: axis };
    amount = Math.max(0, amount || 0);
    st = st || blank(now);
    limits = limits || {};
    for (var i = 0; i < TYPES.length; i++) {
      var ty = TYPES[i];
      if (ty.axis !== axis) continue;
      var e = effective(limits[ty.id], now);
      if (e.value == null) continue;
      var used = ty.measure(st);
      var after = ty.perBet ? (ty.unit === "money" ? amount : 0) : used + (ty.unit === "money" ? amount : 0);
      if (after > e.value) {
        return { ok: false, kind: "limit", id: ty.id, limit: e.value, used: used, unit: ty.unit, perBet: ty.perBet, axis: axis };
      }
    }
    return { ok: true };
  }

  var CORE = {
    TYPES: TYPES, register: register, typeOf: typeOf,
    dayOf: dayOf, weekOf: weekOf, monthOf: monthOf, blank: blank, rollover: rollover,
    blankDep: blankDep, rollDep: rollDep, addDep: addDep, depUsed: depUsed,
    effective: effective, planChange: planChange, evaluate: evaluate,
    PAUSES: PAUSES, registerPause: registerPause, pauseSpecOf: pauseSpecOf,
    pauseOptions: pauseOptions, planPause: planPause, PERM_UNTIL: PERM_UNTIL,
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

    /* ===== #96 自我排除：卡上四條不變量逐條寫成測項 ===== */
    st.register({
      id: "rg/self-exclusion-gate", group: "rg", title: "#96 (a) 自我排除擋在閘本身：下注與儲值兩軸都擋，且限額再寬也擋",
      run: function (t) {
        var s = blank(T0);
        var p = { until: T0 + 180 * 86400000, kind: "exclude", id: "excl-6m", at: T0 };
        var r = evaluate({}, s, 1, T0, p);
        t.equal(r.ok, false, "自我排除期間即使未設任何限額也應擋注");
        t.equal(r.kind, "exclude", "應以 kind=exclude 回報，不得退化成 cool（UI 訊息與強度不同）");
        t.equal(evaluate({}, s, 1, T0, p, "deposit").ok, false, "自我排除期間儲值也必須被擋");
        t.equal(evaluate({ "bet-single": { value: 1e9 } }, s, 1, T0, p).kind, "exclude",
          "自我排除應優先於限額判定（限額再寬也擋）");
        // 相容性：第 5 參數仍可是舊格式數字 ⇒ 既有 27 個閘呼叫點與既有測項零改動
        t.equal(evaluate({}, s, 1, T0, T0 + 1000).kind, "cool", "數字形（舊格式）應仍判為冷靜期");
      }
    });

    st.register({
      id: "rg/self-exclusion-monotone", group: "rg", title: "#96 (b) 不可提前解除：暫停只能加長，任何更短的設定都是 no-op",
      run: function (t) {
        var six = pauseSpecOf("excl-6m"), day = pauseSpecOf("cool-1d"), perm = pauseSpecOf("excl-perm");
        t.ok(!!six && !!day && !!perm, "三筆種子 spec 應都在註冊表內");
        var p1 = planPause(null, six, T0);
        t.equal(p1.until, T0 + 180 * 86400000, "首次設定應照 spec 計算到期時刻");
        // 排除期間改設 24 小時冷靜期（＝縮短）：必須原樣退回，連 kind 都不能被降級
        var p2 = planPause(p1, day, T0 + 1000);
        t.equal(p2, p1, "更短的暫停應原樣退回同一個物件（不得縮短、不得改寫）");
        t.equal(p2.kind, "exclude", "kind 不得被較弱的暫停降級");
        // 加長允許
        var p3 = planPause(p1, perm, T0 + 1000);
        t.equal(p3.until, PERM_UNTIL, "改為永久應被接受（加長）");
        // 永久之後任何設定都無效
        t.equal(planPause(p3, six, T0 + 2000), p3, "永久排除後再設任何期間都應 no-op");
        t.equal(planPause(p3, day, T0 + 2000), p3, "永久排除後設冷靜期同樣 no-op");
      }
    });

    st.register({
      id: "rg/self-exclusion-expiry", group: "rg", title: "#96 (d) 到期自動恢復、無殘留半鎖；永久型永不到期",
      run: function (t) {
        var s = blank(T0), until = T0 + 180 * 86400000;
        var p = { until: until, kind: "exclude", id: "excl-6m", at: T0 };
        t.equal(evaluate({}, s, 1, until - 1, p).ok, false, "屆滿前一毫秒仍應擋");
        t.equal(evaluate({}, s, 1, until, p).ok, true, "屆滿當下應自動恢復（含邊界）");
        t.equal(evaluate({}, s, 1, until, p, "deposit").ok, true, "恢復後儲值側也不得殘留半鎖狀態");
        var perm = { until: PERM_UNTIL, kind: "exclude", id: "excl-perm", at: T0 };
        t.equal(evaluate({}, s, 1, PERM_UNTIL - 1, perm).ok, false, "永久型在任何可表示的時刻都應仍擋");
        // 永久必須用「可 JSON 往返」的表示法：Infinity 存進 localStorage 讀回來會變 null＝鎖自己開了
        t.equal(JSON.parse(JSON.stringify(perm)).until, PERM_UNTIL, "永久值必須能 JSON 往返而不失真");
      }
    });

    st.register({
      id: "rg/pause-registry", group: "rg", title: "#96 暫停期間是註冊表驅動：加一種期間＝加一筆 spec",
      run: function (t) {
        t.ok(pauseOptions("cool").length >= 3, "冷靜期應至少 3 個選項（既有 24h/7d/30d 遷入）");
        t.ok(pauseOptions("exclude").length >= 4, "自我排除應至少 4 個選項（6 個月/1 年/5 年/永久）");
        t.equal(pauseOptions("exclude").filter(function (p) { return p.permanent; }).length, 1, "永久型應恰好一筆");
        PAUSES.forEach(function (p) {
          t.ok(!!p.label, "暫停 " + p.id + " 應有 label");
          t.ok(p.kind === "cool" || p.kind === "exclude", "暫停 " + p.id + " kind 應為 cool/exclude");
          t.ok(p.permanent || p.ms > 0, "暫停 " + p.id + " 非永久型應有正的 ms");
        });
        // 每個 exclude 選項都必須比最長的 cool 選項長，否則「自我排除」名不副實
        var maxCool = Math.max.apply(null, pauseOptions("cool").map(function (p) { return p.ms; }));
        pauseOptions("exclude").forEach(function (p) {
          t.ok(p.permanent || p.ms > maxCool, "自我排除 " + p.id + " 應長於最長的冷靜期");
        });
        var before = PAUSES.length;
        registerPause({ id: "__probe", kind: "exclude", label: "測試用", ms: 9 * 86400000 });
        t.equal(PAUSES.length, before + 1, "registerPause 應把新期間掛進註冊表");
        t.equal(planPause(null, pauseSpecOf("__probe"), T0).until, T0 + 9 * 86400000, "新期間應立即被 planPause 認得");
        registerPause({ id: "__probe", kind: "exclude", label: "測試用2", ms: 10 * 86400000 });
        t.equal(PAUSES.length, before + 1, "同 id 重複註冊應覆蓋而非追加");
        PAUSES.pop();
        t.equal(PAUSES.length, before, "測試後應還原註冊表");
      }
    });

    st.register({
      id: "rg/registry", group: "rg", title: "限額型別註冊表：可擴充且每筆描述子齊備",
      run: function (t) {
        t.ok(TYPES.length >= 7, "應至少註冊 7 種限額型別（下注側 4 + #70 儲值側 3）");
        TYPES.forEach(function (ty) {
          t.isFn(ty.measure, "型別 " + ty.id + " 應有 measure 述詞");
          t.ok(!!ty.label, "型別 " + ty.id + " 應有 label");
          t.ok(ty.unit === "money" || ty.unit === "minutes", "型別 " + ty.id + " 單位應為 money/minutes");
          t.ok(["day", "week", "month", "none"].indexOf(ty.period) >= 0, "型別 " + ty.id + " 週期應為 day/week/month/none");
          t.ok(ty.axis === "bet" || ty.axis === "deposit", "型別 " + ty.id + " 軸應為 bet/deposit");
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

    /* ===================== #70 儲值側限額閘 ===================== */

    st.register({
      id: "rg/deposit-axis-isolation", group: "rg", title: "#70 兩軸互不可見：下注閘看不到儲值限額、儲值閘看不到下注限額",
      run: function (t) {
        var s = blank(T0);
        // 設一個極嚴的「單注上限 10」——**絕不能**擋掉儲值 1000（誤擋等級：災難）
        t.equal(evaluate({ "bet-single": { value: 10 } }, s, 1000, T0, 0, "deposit").ok, true,
          "單注上限不得約束儲值（axis=deposit 應忽略下注側型別）");
        // 反向：設「每日儲值上限 10」不得擋掉押注 1000
        t.equal(evaluate({ "deposit-daily": { value: 10 } }, s, 1000, T0, 0).ok, true,
          "儲值上限不得約束下注（預設 axis=bet 應忽略儲值側型別）");
        t.equal(evaluate({ "deposit-daily": { value: 10 } }, s, 1000, T0, 0, "bet").ok, true,
          "明確傳 axis=bet 亦同");
        // 漏傳 axis ＝退化為 bet（既有 16 個呼叫點的相容契約）
        t.equal(evaluate({ "deposit-daily": { value: 10 } }, s, 99999, T0, 0, undefined).ok, true,
          "axis 漏傳應退化為 bet（既有呼叫點零改動的相容契約）");
        // 兩軸各自生效：同一份 limits 同時設兩軸，各自擋各自的
        var L = { "bet-single": { value: 10 }, "deposit-daily": { value: 500 } };
        t.equal(evaluate(L, s, 50, T0, 0, "bet").ok, false, "押注 50 應被單注上限 10 擋下");
        t.equal(evaluate(L, s, 50, T0, 0, "deposit").ok, true, "同時儲值 50 應放行（未達 500）");
        t.equal(evaluate(L, s, 600, T0, 0, "deposit").ok, false, "儲值 600 應被每日儲值上限 500 擋下");
        t.equal(evaluate(L, s, 600, T0, 0, "deposit").id, "deposit-daily", "應由儲值型別回報，而非下注型別");
      }
    });

    st.register({
      id: "rg/deposit-gate", group: "rg", title: "#70 儲值三週期邊界與短週期先報",
      run: function (t) {
        var s = blank(T0);
        s.dep = addDep(s.dep, 4900, T0);                     // 今日/本週/本月皆已儲 4900
        var L = { "deposit-daily": { value: 5000 } };
        t.equal(evaluate(L, s, 100, T0, 0, "deposit").ok, true, "儲值 4900+100=5000 恰達上限應放行（> 而非 >=）");
        t.equal(evaluate(L, s, 101, T0, 0, "deposit").ok, false, "超過上限 1 元即應擋");
        var r = evaluate(L, s, 101, T0, 0, "deposit");
        t.equal(r.used, 4900, "被擋時應回報本期已用量供 UI 說明");
        // 三週期同時設限時，**最短週期先報**（訊息最貼近玩家當下感受，與 #63 sla/cap-gate 同紀律）
        var L3 = { "deposit-daily": { value: 5000 }, "deposit-weekly": { value: 5000 }, "deposit-monthly": { value: 5000 } };
        t.equal(evaluate(L3, s, 200, T0, 0, "deposit").id, "deposit-daily", "三週期皆超時應由日限先報");
        // 只設週限時由週限報
        t.equal(evaluate({ "deposit-weekly": { value: 5000 } }, s, 200, T0, 0, "deposit").id, "deposit-weekly",
          "只設週限時應由週限報");
      }
    });

    st.register({
      id: "rg/deposit-period-rollover", group: "rg", title: "#70 跨日只清日桶——跨日不得清掉週/月累計（否則可繞過長週期限額）",
      run: function (t) {
        // 前提：挑一個「與隔日同週」的基準時刻，否則測項自身會誤過（#63 sla/period-rollover 記載過同一個坑）
        var base = weekOf(T0) * WEEK + 2 * DAY;
        t.equal(weekOf(base), weekOf(base + DAY), "測項前提：base 與隔日必須同週");
        var u = addDep(blankDep(base), 1000, base);
        t.equal(u.used.day, 1000, "同一筆儲值應計入日桶");
        t.equal(u.used.week, 1000, "同一筆儲值應計入週桶");
        t.equal(u.used.month, 1000, "同一筆儲值應計入月桶");
        var d1 = rollDep(JSON.parse(JSON.stringify(u)), base + DAY);
        t.equal(d1.used.day, 0, "跨日後日桶應歸零");
        t.equal(d1.used.week, 1000, "同週內跨日不得清掉週累計（否則玩家可用跨日繞過週限）");
        t.equal(d1.used.month, 1000, "同月內跨日不得清掉月累計");
        var w1 = rollDep(JSON.parse(JSON.stringify(u)), base + WEEK);
        t.equal(w1.used.week, 0, "跨週後週桶應歸零");
        // 跨月：從基準往後推 40 天必然跨月（曆月語意）
        var m1 = rollDep(JSON.parse(JSON.stringify(u)), base + 40 * DAY);
        t.equal(m1.used.month, 0, "跨月後月桶應歸零");
        // 整份 st 的 rollover 也要把 dep 一起帶到期（load() 依賴此行為）
        var s = blank(base);
        s.dep = addDep(s.dep, 700, base);
        s.wagered = 500;
        var s2 = rollover(JSON.parse(JSON.stringify(s)), base + DAY);
        t.equal(s2.wagered, 0, "跨日應清下注側日量");
        t.equal(s2.dep.used.day, 0, "跨日應同時清儲值日桶");
        t.equal(s2.dep.used.week, 700, "跨日不得清儲值週桶（兩側到期彼此正交）");
        // 舊資料相容：既有玩家的 st 沒有 dep 欄位，rollover/measure 不得炸
        var legacy = rollover({ day: dayOf(base), wagered: 1, won: 0, playMs: 0, lastAt: 0 }, base);
        t.ok(!!legacy.dep, "舊資料（無 dep 欄位）應被補上空累計器");
        t.equal(evaluate({ "deposit-daily": { value: 100 } }, legacy, 50, base, 0, "deposit").ok, true,
          "舊資料在儲值閘下應正常求值（不得因缺欄位擋人或丟例外）");
      }
    });

    st.register({
      id: "rg/deposit-cooling-off", group: "rg", title: "#70 冷靜期一併擋儲值（暫停賭博期間還能儲值＝工具漏一半）",
      run: function (t) {
        var s = blank(T0), until = T0 + 3600000;
        var r = evaluate({}, s, 1000, T0, until, "deposit");
        t.equal(r.ok, false, "冷靜期內即使未設任何儲值限額也應擋儲值");
        t.equal(r.kind, "cool", "應以 kind=cool 回報供 UI 分流訊息");
        t.equal(evaluate({}, s, 1000, until - 1, until, "deposit").ok, false, "冷靜期最後一毫秒仍應擋");
        t.equal(evaluate({}, s, 1000, until, until, "deposit").ok, true, "冷靜期屆滿應自動放行（含邊界）");
      }
    });

    st.register({
      id: "rg/deposit-raise-cooldown", group: "rg", title: "#70 調升冷卻對儲值型別同樣生效（不對稱不變量不得只保護下注側）",
      run: function (t) {
        var s = blank(T0);
        s.dep = addDep(s.dep, 0, T0);
        var a = planChange(null, 1000, T0);                  // 新設 1000 ⇒ 立即
        t.equal(effective(a, T0).value, 1000, "首次設定儲值上限應立即生效");
        var b = planChange(a, 200, T0);                      // 調降 ⇒ 立即
        t.equal(effective(b, T0).value, 200, "調降儲值上限應立即生效");
        var c = planChange(b, 50000, T0);                    // 調升 ⇒ 排程 24h
        t.equal(effective(c, T0).value, 200, "調升儲值上限在冷卻期內應仍套用舊（較嚴）值");
        t.equal(evaluate({ "deposit-daily": c }, s, 1000, T0, 0, "deposit").ok, false,
          "冷卻期內超過舊儲值上限的儲值應仍被擋");
        t.equal(evaluate({ "deposit-daily": c }, s, 1000, T0 + RAISE_DELAY_MS, 0, "deposit").ok, true,
          "冷卻屆滿後同一筆儲值應放行");
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
    // #96 遷移：舊存檔只有 coolUntil（純數字）⇒ 升級為 pause 物件，**進行中的冷靜期不得因改版而消失**
    if (!o.pause && o.coolUntil) o.pause = { until: o.coolUntil, kind: "cool", id: "cool-legacy", at: 0 };
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
    var r = evaluate(o.limits, o.st, bet, now, o.pause);
    if (r.ok) return true;
    if (r.kind === "exclude") {
      HL.ui.toast(t("自我排除進行中，帳戶已鎖定", "自我排除進行中，帳戶已鎖定") + "（" + fmtUntil(r.until) + "）", "warn");
    } else if (r.kind === "cool") {
      HL.ui.toast(t("冷靜期進行中，暫停下注", "冷靜期進行中，暫停下注") + "（" + fmtUntil(r.until) + "）", "warn");
    } else {
      var ty = typeOf(r.id);
      var val = ty.unit === "minutes" ? (r.limit + " min") : money(r.limit);
      HL.ui.toast(t("已達" + ty.label, "已達" + ty.label) + "（" + val + "）", "warn");
    }
    return false;
  }
  function allowed(bet) { return evaluate(load().limits, load().st, bet, Date.now(), load().pause).ok; }

  /* ===== #70 儲值側：閘 + 累積（由錢包 doDeposit 呼叫）=====
   * checkDeposit 回 true＝放行；被擋時自行 toast 並回 false ⇒ 呼叫端一行即可接。 */
  function checkDeposit(amount) {
    var now = Date.now(), o = load();
    var r = evaluate(o.limits, o.st, amount, now, o.pause, "deposit");
    if (r.ok) return true;
    if (r.kind === "exclude") {
      HL.ui.toast(t("自我排除進行中，帳戶已鎖定", "自我排除進行中，帳戶已鎖定") + "（" + fmtUntil(r.until) + "）", "warn");
    } else if (r.kind === "cool") {
      HL.ui.toast(t("冷靜期進行中，暫停儲值", "冷靜期進行中，暫停儲值") + "（" + fmtUntil(r.until) + "）", "warn");
    } else {
      HL.ui.toast(t("已達" + typeOf(r.id).label, "已達" + typeOf(r.id).label) + "（" + money(r.limit) + "）", "warn");
    }
    return false;
  }
  function recordDeposit(amount) {
    amount = Math.round(amount || 0);
    if (amount <= 0) return;
    var o = load();
    o.st.dep = addDep(o.st.dep, amount, Date.now());
    save(o);
  }

  function fmtLeft(ms) {
    ms = Math.max(0, ms);
    // #96：自我排除長達 6 個月–5 年，沿用純小時制會印出「43800h 0m」這種讀不出意義的數字
    //   ⇒ ≥ 1 天改以「N 天」為單位（既有 7 天/30 天冷靜期原本也是印 168h／720h，一併變好讀）。
    if (ms >= DAY) return Math.floor(ms / DAY) + "d";
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? (h + "h " + m + "m") : (m + "m");
  }
  // 永久型不印倒數（`PERM_UNTIL - now` ≈ 2700 億天＝噪音）
  function fmtUntil(until) { return until >= PERM_UNTIL ? t("永久", "永久") : fmtLeft(until - Date.now()); }

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
    var pUntil = (o.pause && o.pause.until) || 0;
    var pKind = (o.pause && o.pause.kind) || "cool";
    var active = !!(pUntil && now < pUntil);
    var out = {
      // 既有欄位語意不變（app-shell 的徽章文案讀 cooling）：cooling 專指「冷靜期」
      cooling: active && pKind === "cool", coolUntil: active && pKind === "cool" ? pUntil : 0,
      // #96 新欄位：paused＝任一種暫停生效中；excluded＝自我排除生效中
      paused: active, pauseKind: active ? pKind : null, pauseUntil: active ? pUntil : 0,
      pauseId: active ? (o.pause.id || null) : null,
      excluded: active && pKind === "exclude", permanent: active && pUntil >= PERM_UNTIL,
      rc: o.rc, limits: []
    };
    TYPES.forEach(function (ty) {
      var e = effective(o.limits[ty.id], now);
      out.limits.push({
        id: ty.id, label: ty.label, unit: ty.unit, value: e.value, axis: ty.axis, period: ty.period,
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
    /* #114：設限額**不是下注事件** ⇒ 成就引擎不會被中央結算點喚起（`HL.achievements.record` 只在
       liveStats 尾端跑）。若不主動 sync，這枚徽章要等玩家下一次下注才解鎖＝設完限額沒有任何回饋。
       形制沿用 rewards.js 簽到後那一行（`HL.achievements.sync()`），**必須排在 save(o) 之後**：
       成就的 test 走 load() 讀 localStorage，先 sync 會讀到舊值（＝與沒接線同形）。 */
    if (HL.achievements && HL.achievements.sync) HL.achievements.sync();
    return effective(o.limits[id], now);
  }
  function cancelPending(id) {
    var o = load();
    if (o.limits[id]) { o.limits[id].pending = null; save(o); }
  }
  /* #96：暫停狀態的唯一寫入口。所有 UI 路徑（冷靜期 chip、自我排除確認鈕、舊 coolOff API）
   * 都收斂到這裡 ⇒ `planPause` 的「只能加長」是**唯一**能改到 pause 的地方。 */
  function applyPause(spec) {
    if (!spec) return null;
    var now = Date.now(), o = load();
    var next = planPause(o.pause, spec, now);
    if (o.pause && next === o.pause) return o.pause;      // 更短 ⇒ no-op（不覆寫、不通知）
    o.pause = next;
    o.coolUntil = next.kind === "cool" ? next.until : 0;  // 舊欄位僅供舊版客端相容，非權威
    save(o);
    if (HL.notify) {
      HL.notify.add(next.kind === "exclude"
        ? { ic: "🔒", title: t("自我排除已啟動", "自我排除已啟動"), text: t("期間內無法下注或儲值，且無法提前解除。", "期間內無法下注或儲值，且無法提前解除。") }
        : { ic: "🛡️", title: t("冷靜期已啟動", "冷靜期已啟動"), text: t("期間將暫停下注，時間到自動解除。", "期間將暫停下注，時間到自動解除。") });
    }
    return o.pause;
  }
  function setPause(id) { return applyPause(pauseSpecOf(id)); }
  // 舊 API 保留（以毫秒指定冷靜期）：改走同一個單調 setter，故一樣不能縮短既有暫停
  function coolOff(ms) {
    var p = applyPause({ id: "cool-adhoc", kind: "cool", label: "冷靜期", ms: Math.max(0, ms || 0) });
    return p ? p.until : 0;
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
    // #70：週/月型別的「已用」標籤必須跟著週期走，否則月儲值上限旁邊寫「今日已用」＝直接誤導
    var usedLabel = L.period === "week" ? "本週已用" : (L.period === "month" ? "本月已用" : "今日已用");

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
          el("span", { text: t(usedLabel, usedLabel) }),
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
    // #70：兩軸各自成段（下注／儲值）。分段規則走 spec 的 axis 欄位 ⇒ 未來新增第三軸（例如提領）
    //   只要 spec 宣告 axis 並在此加一筆 SECTIONS，面板不需再改結構。
    var SECTIONS = [
      { axis: "bet", title: "下注限額" },
      { axis: "deposit", title: "儲值限額" }
    ];
    function sectionOf(sec) {
      var rows = s.limits.filter(function (L) { return (L.axis || "bet") === sec.axis; }).map(limitRow);
      if (!rows.length) return null;
      return el("div", {}, [
        HL.ui.sectionTitle ? HL.ui.sectionTitle(t(sec.title, sec.title)) : el("div", { text: t(sec.title, sec.title) }),
        el("div", { class: "ax-panel" }, rows)
      ]);
    }

    /* 暫停區（冷靜期／自我排除）＝同一個渲染函式吃註冊表的兩個 kind。
     * #96 卡上第 ③ 條：**生效期間入口本身要收起來**（不是點進去才擋）——
     *   所以 `s.paused` 時整段只顯示狀態，一顆點不動的按鈕都不留。 */
    function chip(label, onClick) {
      var b = el("button", { class: "ax-btn-ghost", text: label });
      b.style.cssText = "width:auto;flex:0 0 auto;display:inline-block;padding:8px 14px";  // 並排 chip 而非數條長條
      b.addEventListener("click", onClick);
      return b;
    }
    function pauseSection(kind, title, desc) {
      var wrap = el("div", { class: "ax-panel" }, [
        el("div", { text: t(title, title) }),
        el("small", { class: "ax-muted", text: t(desc, desc) })
      ]);
      if (s.paused) {
        // 只有「當前生效的那一種」顯示倒數，另一種整段收起（避免兩塊都在講同一個鎖）
        if (s.pauseKind !== kind) return null;
        wrap.appendChild(el("div", { class: "ax-kv" }, [
          el("span", { text: t(kind === "exclude" ? "自我排除剩餘" : "冷靜期剩餘", kind === "exclude" ? "自我排除剩餘" : "冷靜期剩餘") }),
          el("b", { class: "ax-gold", text: fmtUntil(s.pauseUntil) })
        ]));
        return wrap;
      }
      var btns = el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;padding-top:8px" });
      pauseOptions(kind).forEach(function (p) {
        btns.appendChild(chip(t(p.label, p.label), function () {
          if (kind === "exclude") confirmExclude(p); else { setPause(p.id); HL.ui.toast(t("冷靜期已啟動", "冷靜期已啟動"), "ok"); HL.ui.closeTop(); open(); }
        }));
      });
      wrap.appendChild(btns);
      return wrap;
    }

    /* 二次確認：這是全站**唯一刻意讓玩家更難完成**的流程 ⇒ 不套用一般 CTA 的順滑設計。
     * 確認鈕不是主色 CTA、也不預設聚焦；取消才是視覺上的預設出口。 */
    function confirmExclude(p) {
      var warn = p.permanent
        ? t("永久自我排除將立即鎖定此帳戶，且沒有任何解除方式。", "永久自我排除將立即鎖定此帳戶，且沒有任何解除方式。")
        : t("自我排除期間無法下注或儲值，且無法提前解除。", "自我排除期間無法下注或儲值，且無法提前解除。");
      var row = el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;padding-top:8px" });
      row.appendChild(chip(t("取消", "取消"), function () { HL.ui.closeTop(); }));
      var yes = chip(t("我了解，確認鎖定", "我了解，確認鎖定"), function () {
        setPause(p.id);
        HL.ui.closeAll(); open();
      });
      yes.style.cssText += ";border-color:var(--ax-danger,#e5484d);color:var(--ax-danger,#e5484d)";
      row.appendChild(yes);
      HL.ui.modal(t("🔒 確認自我排除", "🔒 確認自我排除"), [
        el("div", { class: "ax-panel" }, [
          el("div", { class: "ax-kv" }, [el("span", { text: t("期間", "期間") }), el("b", { text: t(p.label, p.label) })]),
          el("small", { class: "ax-muted", text: warn }),
          row
        ])
      ]);
    }

    var coolWrap = pauseSection("cool", "冷靜期", "選一段時間暫停下注，時間到自動解除。啟動後無法提前解除。");
    var exclWrap = pauseSection("exclude", "自我排除", "更長期的自我鎖定：期間內無法下注或儲值，且無法提前解除、客服也無法代為解除。永久型不會自動恢復。");

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
      sectionOf(SECTIONS[0]),
      sectionOf(SECTIONS[1]),
      coolWrap,
      exclWrap,
      rcWrap,
      el("span", { class: "ax-demo-tag", text: t("自我約束工具 · 本瀏覽器 · 站別獨立", "自我約束工具 · 本瀏覽器 · 站別獨立") })
    ]);
  }

  HL.rg = {
    register: register, TYPES: TYPES, typeOf: typeOf,
    check: check, allowed: allowed, record: record, status: status,
    checkDeposit: checkDeposit, recordDeposit: recordDeposit,   // #70 儲值側閘 + 累積
    setLimit: setLimit, cancelPending: cancelPending,
    coolOff: coolOff, setRealityCheck: setRealityCheck, open: open,
    // #96 暫停註冊表：新增一種期間＝呼叫 registerPause 一次，面板與閘都不必改
    PAUSES: PAUSES, registerPause: registerPause, pauseOptions: pauseOptions, setPause: setPause, PERM_UNTIL: PERM_UNTIL,
    effective: effective, planChange: planChange, planPause: planPause, evaluate: evaluate, rollover: rollover
  };

  /* ---- #114 成就徽章牆的外部註冊者 ----
   * **`reward: 0` 是硬性的**（#114 卡明訂）：付錢請人替自己設限額是反向誘因——會長出「設一個天文數字的
   *   限額領錢再改掉」這條路。本枚只給成就點數（榮譽），且限額調寬本來就要等 24h（planChange 的既有紀律）。
   * **刻意只認「設定限額」，不認自我排除／冷靜期**：設限額是健康的自我掌控，值得給個肯定；
   *   自我排除是危機動作，把它做成可收集的徽章是不恰當的獎勵訊號（#114 卡把兩者並列為候選，此處據實收斂為前者）。
   * 真相取自本檔存檔的 `limits` × `effective()`（與面板、與閘讀的是同一個出口）⇒ 欄位漂移會同時弄壞面板，
   *   不會只有徽章靜默失效。⚠️ 這一點很重要：`meets()` 把 `test` 包在 try/catch 裡回 false
   *   ⇒ 讀錯欄位的徽章會**永遠鎖著而完全不報錯**（就是 CLAUDE.md 那條「修一半而看不出來」的形狀）。
   * `test` 型無進度條，但「有沒有替自己設過限額」本來就沒有進度可言。 */
  function anyLimitSet() {
    var o = load(), now = Date.now();
    for (var i = 0; i < TYPES.length; i++) {
      var e = effective(o.limits[TYPES[i].id], now);
      if (e && e.value != null) return true;
    }
    return false;
  }
  if (HL.achievements && HL.achievements.register) {
    HL.achievements.register({
      id: "rg-first-limit", cat: "平台里程碑", icon: "🛡️",
      title: "為自己畫線", desc: "首次為自己設定任一遊玩限額",
      tier: "bronze", pts: 10, reward: 0,
      test: function () { return anyLimitSet(); }
    });
  }

  /* #72 說明中心：責任博弈工具由本模組自己解釋。限額型別讀 TYPES 當下註冊值，
   * 新增一種限額型別時說明自動涵蓋，不必回頭改文案。 */
  if (HL.support && HL.support.register) {
    HL.support.register({
      id: "rg/limits", cat: "account", order: 10,
      title: "我可以怎麼替自己設限？調寬會立刻生效嗎？",
      keys: ["responsible", "限額", "冷靜期", "自我控制", "上限", "cool off"],
      body: function () {
        var names = (TYPES || []).map(function (x) { return x.label || x.id; });
        return "可設定的限額共 " + names.length + " 種："
             + (names.length ? names.join("、") : "（尚未載入）") + "。"
             + "⚠️ 調降或新設限額**立即生效**；調寬或移除必須等 24 小時（等待期間可取消）"
             + "——否則上頭時一鍵放寬，工具就形同裝飾。另可啟動暫停："
             + pauseOptions("cool").map(function (p) { return p.label; }).join("／") + "的冷靜期（到期自動恢復），"
             + "或更長期的自我排除（" + pauseOptions("exclude").map(function (p) { return p.label; }).join("／") + "）。"
             + "兩者**一旦啟動都不可提前解除**，期間內下注與儲值全站被擋；永久型不會自動恢復。";
      },
      action: { label: "開啟負責任博弈", run: function () { open(); } }
    });
  }

  // 載入序脫鉤（#101）：現排在 selftest.js 之後走直通；else 分支保證重排也不會靜默掉測項。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

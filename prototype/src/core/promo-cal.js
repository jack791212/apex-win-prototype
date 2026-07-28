/*
 * Apex Win｜促銷排程註冊表 + 活動日曆 HL.promoCal（自我進化引擎 #49）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 Stake.us 2026「每週輪替促銷排程」（raffles/races/jackpots/poker 每週重設或換一批，
 *   站上以排程呈現「本週在跑什麼」）＋ 業界共識：促銷頁同時提供 calendar view + list view，
 *   讓玩家**預先看到即將到來的活動**並安排回訪。
 *
 * 解決的問題：ApexWin 既有 raffle/tournament（startAt/endAt）、happyhour（排程時段）、
 *   season（config 賽季）、safetynet（#48 窗口）**各自都有時間窗口，卻彼此不知道對方**；
 *   玩家沒有任何一處能看到「全部活動 + 即將到來者」，只能逐個入口點進去猜。
 *
 * 核心哲學＝容器先於內容（擴充性優先）：本檔是**排程註冊表**，不認識任何特定活動。
 *   任何模組 `HL.promoCal.register(spec)` 一行即上架（比照 HL.dock / HL.achievements /
 *   HL.guild 的資料驅動註冊表家族），日曆自動排序與呈現；下架＝unregister 或 enabled:false。
 *   三種排程型別：
 *     - "window"    絕對窗口，resolve() → { startAt, endAt }（raffle / tournament / safetynet / season）
 *     - "recurring" 每日固定時段，hours:[12,18,22] + durationMs（happyhour）
 *     - "always"    常設無窗口（luckyspin / rain）
 *
 * 讀取一律「即時求值」：spec 只存 resolve()/note() 函式，list() 當下才呼叫 →
 *   載入順序無關（模組未載入即自動跳過）、不快取過期時間、不需常駐計時器。
 * 樣式沿用既有 utility class（ax-panel/ax-muted/ax-gold/ax-seg…）+ 少量 inline，
 *   刻意不動 components.css（維護軌正在該檔上作業，避免跨軌衝突；比照 #48 safetynet）。
 * 註冊於 window.HL.promoCal = { register, unregister, list, counts, open, sources }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money, dhm = HL.dom.dhm;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var DAY = 86400000, HOUR = 3600000;
  var VIEW_DAYS = 7;                 // 時間軸檢視天數（對標業界 calendar view）

  var SOURCES = [];                  // 排程註冊表（資料驅動；順序不影響輸出，list() 自行排序）

  /* ---------- 註冊表 API ---------- */
  function register(spec) {
    if (!spec || !spec.id) return HL.promoCal;
    SOURCES = SOURCES.filter(function (s) { return s.id !== spec.id; });  // 同 id 覆蓋＝可熱替換
    SOURCES.push(spec);
    return HL.promoCal;
  }
  function unregister(id) { SOURCES = SOURCES.filter(function (s) { return s.id !== id; }); return HL.promoCal; }
  function sources() { return SOURCES.slice(); }

  /* ---------- 排程求值（即時，不快取） ---------- */
  function now() { return Date.now(); }
  function call(v, dflt) { try { return typeof v === "function" ? v() : (v === undefined ? dflt : v); } catch (e) { return dflt; } }

  // 每日固定時段：找出「當下所在的場次」或「下一場」
  function evalRecurring(sp) {
    var hours = call(sp.hours, []) || [], dur = sp.durationMs || HOUR, n = now(), best = null;
    var d0 = new Date();
    for (var d = 0; d <= VIEW_DAYS; d++) {
      for (var i = 0; i < hours.length; i++) {
        var st = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + d, hours[i], 0, 0, 0).getTime();
        var en = st + dur;
        if (n >= st && n < en) return { phase: "live", startAt: st, endAt: en, endsIn: en - n };
        if (st > n && (best === null || st < best)) best = st;
      }
    }
    if (best !== null) return { phase: "upcoming", startAt: best, endAt: best + dur, startsIn: best - n };
    return null;
  }

  function evalSpec(sp) {
    if (call(sp.enabled, true) === false) return null;
    if (!call(sp.avail, true)) return null;                 // 模組未載入/未啟用＝不上架
    if (sp.sched === "always") return { phase: "always" };
    if (sp.sched === "recurring") return evalRecurring(sp);
    var w = call(sp.resolve, null);                          // "window"
    if (!w) return null;
    var n = now(), s = w.startAt || 0, e = w.endAt || 0;
    if (w.ended || (e && n >= e)) return { phase: "ended", startAt: s, endAt: e };
    if (s && n < s) return { phase: "upcoming", startAt: s, endAt: e, startsIn: s - n };
    return { phase: "live", startAt: s, endAt: e, endsIn: e ? e - n : 0 };
  }

  var RANK = { live: 0, upcoming: 1, always: 2, ended: 3 };  // live → upcoming → 常設 → 已結束

  function list() {
    var out = [];
    SOURCES.forEach(function (sp) {
      var ev = evalSpec(sp);
      if (!ev) return;
      out.push({
        id: sp.id, name: call(sp.name, sp.id), icon: sp.icon || "🎁", cat: sp.cat || "",
        sched: sp.sched, phase: ev.phase,
        startAt: ev.startAt || 0, endAt: ev.endAt || 0,
        startsIn: ev.startsIn || 0, endsIn: ev.endsIn || 0,
        note: call(sp.note, "") || "", open: sp.open || null
      });
    });
    out.sort(function (a, b) {
      if (RANK[a.phase] !== RANK[b.phase]) return RANK[a.phase] - RANK[b.phase];
      if (a.phase === "live") return (a.endsIn || Infinity) - (b.endsIn || Infinity);      // 快結束的先提醒
      if (a.phase === "upcoming") return a.startsIn - b.startsIn;                          // 最快開始的在前
      if (a.phase === "ended") return b.endAt - a.endAt;
      return 0;
    });
    return out;
  }

  function counts() {
    var c = { live: 0, upcoming: 0, always: 0, ended: 0, total: 0 };
    list().forEach(function (e) { c[e.phase]++; c.total++; });
    return c;
  }

  /* ---------- 呈現 helper ---------- */
  function phaseLabel(e) {
    if (e.phase === "live") return e.endsIn > 0 ? (t("進行中 · 剩", "進行中 · 剩") + " " + dhm(e.endsIn)) : t("進行中", "進行中");
    if (e.phase === "upcoming") return t("即將開始 ·", "即將開始 ·") + " " + dhm(e.startsIn) + t("後", "後");
    if (e.phase === "always") return t("常設開放", "常設開放");
    return t("已結束", "已結束");
  }
  function phaseColor(e) {
    return e.phase === "live" ? "#39d98a" : e.phase === "upcoming" ? "var(--ax-gold, #e8c26a)" : e.phase === "always" ? "#36a6ff" : "var(--ax-text-dim, #8b93a7)";
  }

  function row(e) {
    var dot = el("span", { style: "flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:" + phaseColor(e) + ";margin-top:7px" });
    var body = el("div", { style: "flex:1 1 auto;min-width:0" }, [
      el("div", { style: "display:flex;align-items:baseline;gap:6px;flex-wrap:wrap" }, [
        el("b", { text: e.icon + " " + e.name }),
        e.cat ? el("small", { class: "ax-muted", text: e.cat }) : null
      ].filter(Boolean)),
      el("small", { style: "display:block;color:" + phaseColor(e), text: phaseLabel(e) }),
      e.note ? el("small", { class: "ax-muted", style: "display:block", text: e.note }) : null
    ].filter(Boolean));
    var kids = [dot, body];
    if (e.open && e.phase !== "ended") {
      kids.push(el("button", {
        // width:auto 覆蓋 .ax-btn-ghost 的 width:100%（否則按鈕撐滿整列、把文字擠成 0 寬＝
        // apexwin-ui-quality 反例③「CTA width:100% 撐成長條」；nowrap 保「前往 →」不折行）
        class: "ax-btn-ghost", style: "flex:0 0 auto;align-self:center;width:auto;white-space:nowrap",
        text: t("前往", "前往") + " →",
        onClick: function () { HL.ui.closeTop(); try { e.open(); } catch (err) {} }
      }));
    }
    return el("div", {
      style: "display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--ax-line, rgba(255,255,255,.08))"
    }, kids);
  }

  /* ---------- 清單檢視 ---------- */
  function listView() {
    var items = list();
    if (!items.length) return el("small", { class: "ax-muted", text: t("目前沒有進行中或即將到來的活動。", "目前沒有進行中或即將到來的活動。") });
    var c = counts();
    var head = el("small", { class: "ax-muted", style: "display:block;margin-bottom:6px",
      text: c.live + " " + t("項進行中", "項進行中") + " · " + c.upcoming + " " + t("項即將開始", "項即將開始") + " · " + c.always + " " + t("項常設", "項常設") });
    return el("div", {}, [head].concat(items.map(row)));
  }

  /* ---------- 時間軸檢視（未來 VIEW_DAYS 天 · 對標 calendar view） ---------- */
  var WD = ["日", "一", "二", "三", "四", "五", "六"];
  function dayStart(offset) {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, 0, 0, 0, 0).getTime();
  }
  // 某活動是否覆蓋該日（recurring 依 hours 展開；always 視為每日；window 依區間相交）
  function occursOn(sp, e, ds, de) {
    if (e.phase === "always") return true;
    if (e.phase === "ended") return false;
    if (sp.sched === "recurring") {
      var hours = call(sp.hours, []) || [];
      return hours.length > 0;                                  // 每日固定時段＝每天都有
    }
    var s = e.startAt || 0, en = e.endAt || 0;
    if (!en) return ds <= now() && de > now();                  // 無結束時間＝只算今天
    return s < de && en > ds;                                   // 區間相交
  }
  function timelineView() {
    var items = list(), rows = [];
    for (var d = 0; d < VIEW_DAYS; d++) {
      var ds = dayStart(d), de = ds + DAY;
      var dt = new Date(ds);
      var label = d === 0 ? t("今天", "今天") : d === 1 ? t("明天", "明天")
        : (t("週", "週") + WD[dt.getDay()]);
      var hit = items.filter(function (e) {
        var sp = null;
        for (var i = 0; i < SOURCES.length; i++) if (SOURCES[i].id === e.id) { sp = SOURCES[i]; break; }
        return sp ? occursOn(sp, e, ds, de) : false;
      });
      var chips = hit.length
        ? el("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, hit.map(function (e) {
            return el("span", {
              title: e.name + " · " + phaseLabel(e),
              style: "font-size:12px;padding:2px 8px;border-radius:999px;border:1px solid " + phaseColor(e)
                + ";color:" + phaseColor(e), text: e.icon + " " + e.name
            });
          }))
        : el("small", { class: "ax-muted", text: t("無活動", "無活動") });
      rows.push(el("div", { style: "display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--ax-line, rgba(255,255,255,.08))" }, [
        el("div", { style: "flex:0 0 76px" }, [
          el("b", { text: label }),
          el("small", { class: "ax-muted", style: "display:block", text: (dt.getMonth() + 1) + "/" + dt.getDate() })
        ]),
        el("div", { style: "flex:1 1 auto;min-width:0" }, [chips])
      ]));
    }
    return el("div", {}, rows);
  }

  /* ---------- 面板（清單 / 時間軸 雙檢視） ---------- */
  function open() {
    var body = el("div", { class: "ax-panel" });
    function paint(v) { HL.dom.clear(body); body.appendChild(v === "cal" ? timelineView() : listView()); }
    var seg = HL.ui.segmented(
      [{ v: "list", t: t("清單", "清單") }, { v: "cal", t: t("時間軸", "時間軸") }],
      "list", function (v) { paint(v); }
    );
    paint("list");
    HL.ui.modal("📅 " + t("活動日曆", "活動日曆"), [
      seg, body,
      el("small", { class: "ax-muted", style: "display:block;margin-top:8px",
        text: t("一處看完全站活動：進行中、即將開始、常設開放。點「前往」直接進入該活動。", "一處看完全站活動：進行中、即將開始、常設開放。點「前往」直接進入該活動。") }),
      el("span", { class: "ax-demo-tag", text: t("排程註冊表 · 活動一處總覽 · Demo", "排程註冊表 · 活動一處總覽 · Demo") })
    ], { wide: true });
  }

  HL.promoCal = { register: register, unregister: unregister, list: list, counts: counts, open: open, sources: sources };

  /* ---------- 種子註冊：把既有各自為政的排程模組收進同一份日曆 ----------
   * 這些 spec 全部走「即時求值」，故本檔可先於任何模組載入；模組不存在＝avail() false 自動跳過。
   * 未來新活動只要在自己的檔案裡 HL.promoCal.register({...}) 一行即上架，不需改本檔。 */
  register({
    id: "raffle", name: "每週抽獎", icon: "🎟️", cat: "抽獎", sched: "window",
    avail: function () { return !!HL.raffle; },
    resolve: function () { return { endAt: HL.raffle.status().endAt }; },
    note: function () { var s = HL.raffle.status(); return t("我的券數", "我的券數") + " " + s.tickets + " · " + t("獎池", "獎池") + " " + money(s.pool); },
    open: function () { HL.raffle.open(); }
  });
  register({
    id: "tournament", name: "限時錦標賽", icon: "🏆", cat: "競賽", sched: "window",
    avail: function () { return !!HL.tournament; },
    resolve: function () { return { endAt: HL.tournament.status().endAt }; },
    note: function () { var s = HL.tournament.status(); return t("第", "第") + " " + s.myRank + " " + t("名", "名") + " · " + t("獎池", "獎池") + " " + money(s.pool); },
    open: function () { if (HL.router) HL.router.go("tournament"); }
  });
  register({
    id: "happyhour", name: "Happy Hour", icon: "⚡", cat: "加成", sched: "recurring",
    avail: function () { return !!HL.happyhour; },
    hours: function () { return HL.happyhour.status().windows || []; }, durationMs: HOUR,
    note: function () { return t("返水", "返水") + " ×" + HL.happyhour.status().mult + " · " + t("每日三場", "每日三場"); },
    open: function () { HL.happyhour.open(); }
  });
  register({
    id: "season", name: "季票 Season Pass", icon: "🎫", cat: "賽季", sched: "window",
    avail: function () { return !!HL.season; },
    resolve: function () {
      var s = HL.season.status();
      return { endAt: now() + (s.daysLeft || 0) * DAY, ended: !!s.ended };
    },
    note: function () { var s = HL.season.status(); return "Tier " + s.tier + " / " + s.total + (s.claimable > 0 ? (" · " + s.claimable + " " + t("項可領取", "項可領取")) : ""); },
    open: function () { HL.season.open(); }
  });
  register({
    id: "safetynet", name: "新手安全網", icon: "🛡️", cat: "保險", sched: "window",
    avail: function () { return !!HL.safetynet && HL.safetynet.status().enabled; },
    resolve: function () {
      var s = HL.safetynet.status();
      return { endAt: now() + (s.daysLeft || 0) * DAY, ended: !!s.done };
    },
    note: function () { var s = HL.safetynet.status(); return s.pending > 0 ? (t("待退", "待退") + " " + money(s.pending)) : (t("淨損退還率", "淨損退還率") + " " + (s.rate * 100).toFixed(0) + "%"); },
    open: function () { HL.safetynet.open(); }
  });
  register({
    id: "luckyspin", name: "幸運轉盤", icon: "🎡", cat: "每日", sched: "always",
    avail: function () { return !!HL.luckyspin; },
    note: function () { return HL.luckyspin.status().canSpin ? t("今日可轉", "今日可轉") : t("今日已轉 · 明日再來", "今日已轉 · 明日再來"); },
    open: function () { HL.luckyspin.open(); }
  });
  register({
    id: "rain", name: "聊天室灑幣", icon: "🌧️", cat: "社群", sched: "always",
    avail: function () { return !!HL.rain; },
    note: function () { return t("在聊天室活躍即可分得", "在聊天室活躍即可分得"); },
    open: function () { if (HL.panels && HL.panels.openChat) HL.panels.openChat(); }
  });
})(window);

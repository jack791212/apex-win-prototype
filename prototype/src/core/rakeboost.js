/* =============================================================================
 * rakeboost.js — #52 限時返水加成排程表 HL.rakeboost（純數學核心 + 註冊表 · 雙環境契約）
 * -----------------------------------------------------------------------------
 * 【這張卡在補什麼】
 *   #60 已把返水改成 `bet × edge × 段位返還比例 × boost`，**boost 這個入口卻只有一個硬編來源**
 *   （progress.js:262 直接讀 `HL.happyhour.mult()`）。於是：
 *     · 想加「新手前 24 小時高返水」（Rollbit 2026：首 24h 每注 15%、之後常態 5%）→ 得再改一次
 *       progress.js，第三個加成再改第四次＝每加一個活動就動一次金流熱路徑。
 *     · #49 `HL.promoCal` 排好了全站活動排程，**卻與回饋率完全沒接線**——活動歸活動、費率歸費率。
 *   本檔＝**容器先於內容**：加成是一張可註冊的表，happyhour / 新手窗口 / opt-in 活動都只是其中一筆，
 *   progress.js 從此只問一句 `HL.rakeboost.mult()`。新增加成＝register 一行，不動金流路徑。
 *
 * 【解析規則＝取最大值，不是相乘｜刻意的設計決策】
 *   相乘會讓成本無上界（兩個 ×2 疊成 ×4、三個 ×8），§11 剛把真站 NGR 調正就會被一次活動疊穿。
 *   故採「**最高適用加成勝出**」（也是玩家對「最優惠自動套用」的預期）＋每站別硬上限 CAP。
 *   ⇒ 只有 happyhour 生效時 `mult()===HL.happyhour.mult()` **逐位相同＝#35 零回歸**。
 *
 * 【與 #60 不變量的關係｜本檔把「只在 boost=1 成立」的證明補成「含加成也成立」】
 *   #60 證的是 `rakeback < 該注理論莊家收入`，但那組測項全部跑在 boost=1 下。實際線上
 *   happyhour ×2 時，假站頂階 0.875 × 2 = 1.75 ⇒ **早已可超過莊優**（#60 未涵蓋的既存事實）。
 *   本檔據 §11「假站刻意慷慨、真站須留住利潤」把它明確分軌並機械化：
 *     · 真站：`maxPct(live) × CAP.live = 0.145 × 1.5 = 0.2175 < 1` ⇒ **含加成仍恆真**（硬測項）
 *     · 假站：明載刻意超發（頂階 ×2 加成期間會吐超過莊優），只斷言不失控（< 3）
 *   ⇒ 真站的保證比 #60 出貨時**更強**，且假站的超發從「沒人算過」變成「寫明並被測項盯著」。
 *
 * 雙環境契約（比照 #50 edge.js／#60 rakeback-core.js）：純資料/純函式以 module.exports 供
 * `node prototype/tests/run.js` 驗證，瀏覽器註冊於 window.HL.rakeboost。
 * ========================================================================== */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  var HOUR = 3600000;

  // ===== 純資料：各加成的乘數（站別感知 · §11 假站慷慨／真站保守）=====
  var MULTS = {
    demo: { newcomer: 2.0, optin: 1.5 },
    live: { newcomer: 1.2, optin: 1.1 }
  };
  // 每站別「解析後」硬上限。真站上限須滿足 maxPct×CAP < 1（見檔頭；有常駐測項盯）。
  var CAP = { demo: 3.0, live: 1.5 };

  var NEWCOMER_MS = 24 * HOUR;   // 新手高返水窗口（Rollbit：首 24 小時）
  var OPTIN_MS = 6 * HOUR;       // opt-in 加成一次的有效時長（加入後起算）

  function modeKey(mode) { return mode === "live" ? "live" : "demo"; }
  function multOf(kind, mode) { var m = MULTS[modeKey(mode)]; return (m && m[kind]) || 1; }
  function capOf(mode) { return CAP[modeKey(mode)]; }

  /* 解析：從「已生效加成的乘數陣列」求最終乘數。取最大值、夾在 [1, CAP]。
   * 空陣列/全無效 ⇒ 1（＝完全維持無加成行為）。 */
  function resolve(mults, mode) {
    var best = 1;
    for (var i = 0; i < (mults || []).length; i++) {
      var v = +mults[i];
      if (isFinite(v) && v > best) best = v;
    }
    var cap = capOf(mode);
    if (best > cap) best = cap;
    return best < 1 ? 1 : best;
  }

  var CORE = {
    MULTS: MULTS, CAP: CAP, NEWCOMER_MS: NEWCOMER_MS, OPTIN_MS: OPTIN_MS,
    multOf: multOf, capOf: capOf, resolve: resolve
  };

  // ===================== 測項（雙環境同一批）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    st.register({
      id: "rakeboost/resolve-is-max-not-product", group: "rakeback",
      title: "加成解析＝取最大值（不相乘）且夾在 [1, CAP]", env: "both",
      run: function (t) {
        t.ok(CORE.resolve([], "demo") === 1, "無加成應為 ×1");
        t.ok(CORE.resolve(null, "demo") === 1, "null 應為 ×1");
        t.ok(CORE.resolve([1], "demo") === 1, "只有 ×1 應為 ×1");
        t.ok(CORE.resolve([2, 1.5], "demo") === 2, "兩筆應取最大 2（相乘會是 3）");
        t.ok(CORE.resolve([1.5, 2, 1.2], "demo") === 2, "三筆應取最大 2（相乘會是 3.6）");
        t.ok(CORE.resolve([0.5], "demo") === 1, "小於 1 的乘數不得減損返水");
        t.ok(CORE.resolve([NaN, 2], "demo") === 2, "NaN 應被忽略");
        t.ok(CORE.resolve([99], "demo") === CORE.capOf("demo"), "超上限應被夾到假站 CAP");
        t.ok(CORE.resolve([99], "live") === CORE.capOf("live"), "超上限應被夾到真站 CAP");
        t.ok(CORE.capOf("live") < CORE.capOf("demo"), "真站上限必須低於假站上限");
      }
    });

    st.register({
      id: "rakeboost/live-invariant-survives-boost", group: "rakeback",
      title: "真站：含加成後返水仍低於該注理論莊家收入（#60 不變量的加成版）", env: "both",
      run: function (t) {
        var C = loadCore();
        if (!C) { t.skip("rakeback-core 不可用"); return; }
        var cap = CORE.capOf("live"), worst = 0;
        for (var i = 0; i < C.tiers(); i++) {
          var pct = C.edgePctFor("live", i);
          if (pct > worst) worst = pct;
          t.ok(pct * cap < 1, "真站段位 " + i + " 返還比例 " + pct + " × 上限 " + cap +
            " = " + (pct * cap).toFixed(4) + " 必須 < 1（否則加成期間每注淨虧）");
        }
        // 逐遊戲實算：最壞情況（頂階 × 上限加成）仍須低於該遊戲莊優
        var edge = loadEdge();
        if (edge) {
          var ks = edge.keys();
          for (var k = 0; k < ks.length; k++) {
            var e = edge.edgeOf(ks[k]);
            var boosted = C.rateFor(e, "live", C.tiers() - 1) * cap;
            t.ok(boosted < e / 100, "真站/" + ks[k] + " 最壞加成返水率 " + boosted.toFixed(6) +
              " 必須低於莊優 " + (e / 100).toFixed(6));
          }
        }
        t.ok(worst * cap < 1, "真站最壞組合 " + (worst * cap).toFixed(4) + " < 1");
      }
    });

    st.register({
      id: "rakeboost/demo-generous-but-bounded", group: "rakeback",
      title: "假站：刻意超發但不失控（明載既存事實，非新增漏洞）", env: "both",
      run: function (t) {
        var C = loadCore();
        if (!C) { t.skip("rakeback-core 不可用"); return; }
        var cap = CORE.capOf("demo");
        var top = C.edgePctFor("demo", C.tiers() - 1);
        // 誠實記錄：假站頂階 × 加成上限**會**超過莊優（§11 假站刻意慷慨；真站才是要留利潤的那條）
        t.ok(top * cap > 1, "假站頂階 " + top + " × " + cap + " 預期 >1＝刻意慷慨（若此項失敗代表假站已被收斂，請同步更新檔頭說明）");
        t.ok(top * cap < 3, "假站超發仍須有界（< 3 倍莊優），實際 " + (top * cap).toFixed(3));
        // 假站每一筆加成都不得低於真站對應筆（慷慨度方向不可反轉）
        ["newcomer", "optin"].forEach(function (kind) {
          t.ok(CORE.multOf(kind, "demo") >= CORE.multOf(kind, "live"),
            kind + "：假站乘數不得低於真站");
          t.ok(CORE.multOf(kind, "live") >= 1, kind + "：真站乘數不得低於 1");
        });
        t.ok(CORE.multOf("nonexistent-kind", "demo") === 1, "未登記的加成種類應退化為 ×1");
      }
    });

    if (isNode) return;

    st.register({
      id: "rakeboost/wired", group: "rakeback",
      title: "返水熱路徑改讀加成表，且 happyhour 單獨生效時逐位等於舊行為", env: "browser",
      run: function (t) {
        t.isFn(HL && HL.rakeboost && HL.rakeboost.mult, "HL.rakeboost.mult 應存在");
        t.isFn(HL && HL.rakeback && HL.rakeback.accrue, "HL.rakeback.accrue 應存在");
        t.ok(/rakeboost/.test(String(HL.rakeback.accrue)), "rbAccrue 應改讀 HL.rakeboost");
        var m = HL.rakeboost.mult();
        t.ok(m >= 1 && m <= HL.rakeboost.cap(), "當前乘數 " + m + " 應落在 [1, cap]");
        // #35 零回歸：只有 happyhour 生效時，表解析結果必須等於 happyhour 自己的乘數
        var others = HL.rakeboost.active().filter(function (a) { return a.id !== "happyhour"; });
        if (HL.happyhour && !others.length) {
          t.ok(m === HL.happyhour.mult(), "僅 happyhour 生效時應逐位等於 HL.happyhour.mult()，實際 " +
            m + " vs " + HL.happyhour.mult());
        } else t.skip("另有其他加成生效（新手窗口/opt-in），本項僅驗單獨情境");
        // opt-in 加成必須真的被 opt-in 閘住：未加入 ⇒ 不在 active() 內
        var joined = HL.promoCal && HL.promoCal.isJoined && HL.promoCal.isJoined("rakeboost");
        var inActive = HL.rakeboost.active().some(function (a) { return a.id === "rakeboost"; });
        t.ok(!!joined === inActive, "opt-in 加成的生效狀態必須與「是否已加入」一致（joined=" + !!joined + " active=" + inActive + "）");
      }
    });
  }

  function loadCore() {
    try {
      if (isNode) return require("./rakeback-core.js");
      return (HL && HL.rakebackCore) ? HL.rakebackCore : null;
    } catch (e) { return null; }
  }
  function loadEdge() {
    try {
      if (isNode) return require("./edge.js");
      return (HL && HL.edge && HL.edge.edgeOf) ? HL.edge : null;
    } catch (e) { return null; }
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  /* =========================== 瀏覽器：加成註冊表 =========================== */
  var el = HL.dom.el, dhm = HL.dom.dhm;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  function mode() { return (HL.site && HL.site.isLive()) ? "live" : "demo"; }

  var ENTRIES = [];   // 加成註冊表（資料驅動；比照 HL.promoCal / HL.dock 家族）

  /* register(spec)：
   *   id       唯一鍵（同 id 覆蓋＝可熱替換）
   *   name/icon 顯示用（name 為可翻譯的完整片語）
   *   avail()  模組是否可用（false ⇒ 整筆跳過，載入序無關）
   *   mult()   當下乘數（1 ＝未生效）
   *   msLeft() 剩餘毫秒（0/未給 ⇒ 不顯示倒數）
   */
  function register(spec) {
    if (!spec || !spec.id) return HL.rakeboost;
    ENTRIES = ENTRIES.filter(function (e) { return e.id !== spec.id; });
    ENTRIES.push(spec);
    return HL.rakeboost;
  }
  function unregister(id) { ENTRIES = ENTRIES.filter(function (e) { return e.id !== id; }); return HL.rakeboost; }
  function entries() { return ENTRIES.slice(); }

  function call(v, dflt) { try { return typeof v === "function" ? v() : (v === undefined ? dflt : v); } catch (e) { return dflt; } }

  // 當下所有「已生效」的加成（mult > 1）
  function active() {
    var out = [];
    ENTRIES.forEach(function (sp) {
      if (!call(sp.avail, true)) return;
      var m = +call(sp.mult, 1) || 1;
      if (!(m > 1)) return;
      out.push({ id: sp.id, name: call(sp.name, sp.id), icon: sp.icon || "💧", mult: m, msLeft: +call(sp.msLeft, 0) || 0 });
    });
    out.sort(function (a, b) { return b.mult - a.mult; });   // 最高加成在前（＝實際生效的那筆）
    return out;
  }

  // 最終乘數（progress.js 的 rbAccrue 唯一入口）
  function mult() {
    return resolve(active().map(function (a) { return a.mult; }), mode());
  }
  function cap() { return capOf(mode()); }

  /* ---------- 種子：既有 + 新增加成，全部只是表裡的一筆 ---------- */

  // ① Happy Hour（#35）：委派給既有模組＝單一真相，行為與改版前逐位相同
  register({
    id: "happyhour", name: function () { return t("Happy Hour", "Happy Hour"); }, icon: "⚡",
    avail: function () { return !!(HL.happyhour && HL.happyhour.mult); },
    mult: function () { return HL.happyhour.mult(); },
    msLeft: function () { var s = HL.happyhour.status(); return s.active ? s.msLeft : 0; }
  });

  // ② 新手窗口（Rollbit 2026：首 24 小時高返水）
  //    起算時間戳惰性播種；播種當下若已有終身押注（＝老玩家）則直接記 0＝永不啟用，
  //    避免「加了這個功能就讓所有既有玩家白拿一輪」。
  var KEY_N = "HL_RB_NEWCOMER";
  function newcomerTs() {
    var o = HL.dom.lsGet(KEY_N, null);
    if (o && typeof o.ts === "number") return o.ts;
    var veteran = !!(HL.vip && HL.vip.status && HL.vip.status().wager > 0);
    var ts = veteran ? 0 : Date.now();
    HL.dom.lsSet(KEY_N, { ts: ts, seededVeteran: veteran });
    return ts;
  }
  function newcomerLeft() {
    var ts = newcomerTs();
    if (!ts) return 0;
    return Math.max(0, ts + NEWCOMER_MS - Date.now());
  }
  register({
    id: "newcomer", name: function () { return t("新手高返水窗口", "新手高返水窗口"); }, icon: "🌱",
    avail: function () { return newcomerTs() > 0; },
    mult: function () { return newcomerLeft() > 0 ? multOf("newcomer", mode()) : 1; },
    msLeft: newcomerLeft
  });

  // ③ opt-in 限時加成（bet365 2026「每個促銷需主動 opt-in」＋ Rollbit Rakeboost）
  //    生效條件＝玩家在 #49 活動日曆按下「加入」；一次有效 OPTIN_MS，每日限加入一次。
  function optinLeft() {
    if (!(HL.promoCal && HL.promoCal.joinedAt)) return 0;
    var at = HL.promoCal.joinedAt("rakeboost");
    if (!at) return 0;
    return Math.max(0, at + OPTIN_MS - Date.now());
  }
  register({
    id: "rakeboost", name: function () { return t("限時返水加成", "限時返水加成"); }, icon: "💧",
    avail: function () { return !!(HL.promoCal && HL.promoCal.joinedAt); },
    mult: function () { return optinLeft() > 0 ? multOf("optin", mode()) : 1; },
    msLeft: optinLeft
  });

  // ---- 接進 #49 活動日曆：活動排程 × 回饋率首次接線（opt-in 由日曆那顆「加入」驅動）----
  function registerPromo() {
    if (!HL.promoCal || !HL.promoCal.register) return;
    HL.promoCal.register({
      id: "rakeboost", name: function () { return t("限時返水加成", "限時返水加成"); },
      icon: "💧", cat: t("加成", "加成"), sched: "always",
      optIn: true, optInTtlMs: OPTIN_MS, optInDaily: true,
      avail: function () { return !!HL.rakeback; },
      // ⚠️ P3 契約 × #49 現況：promoCal 的 `note` 是**單一字串→單一文字節點**，故「中文＋動態值」
      //   一律翻不到（本檔七個既有 note 全有此形狀＝#49 的既存 i18n 債，非本卡新增）。
      //   因此未加入時刻意**不把 ×N 塞進 note**（改成純片語＝可翻譯），倍率在返水面板的加成區塊呈現；
      //   已加入時的倒數必須帶值，屬不可避免者，留給維護軌隨 #49 note 形狀一併處理。
      note: function () {
        var left = optinLeft();
        if (left > 0) return t("加成生效中 · 剩", "加成生效中 · 剩") + " " + dhm(left);
        return t("加入即開啟返水加成", "加入即開啟返水加成");
      },
      open: function () { if (HL.rakeback) HL.rakeback.open(); }
    });
  }

  /* ---------- 呈現 helper：供返水面板顯示「當前加成 + 剩餘」---------- */
  function summaryNode() {
    var list = active(), m = mult();
    if (m <= 1) {
      return el("small", { class: "ax-muted", style: "display:block",
        text: t("目前無返水加成生效。", "目前無返水加成生效。") });
    }
    var top = list[0];
    var kids = [
      el("div", { class: "ax-kv" }, [
        el("span", { text: t("當前返水加成", "當前返水加成") }),
        // ⚠️ P3 契約：值節點保持「×數字」，語意/單位一律放進可翻譯的整句 label
        el("b", { class: "ax-gold", text: "×" + m })
      ])
    ];
    if (top.msLeft > 0) {
      kids.push(el("div", { class: "ax-kv" }, [
        el("span", { text: t("加成剩餘時間", "加成剩餘時間") }),
        el("b", { text: dhm(top.msLeft) })
      ]));
    }
    kids.push(el("small", { class: "ax-muted", style: "display:block",
      text: t("多個加成同時符合時，只套用最高的一個（不相乘）。", "多個加成同時符合時，只套用最高的一個（不相乘）。") }));
    if (list.length > 1) {
      kids.push(el("small", { class: "ax-muted", style: "display:block",
        text: t("其他符合但未套用的加成：", "其他符合但未套用的加成：") + " " +
          list.slice(1).map(function (a) { return a.icon + " " + a.name + " ×" + a.mult; }).join(" · ") }));
    }
    return el("div", { class: "ax-panel" }, kids);
  }

  HL.rakeboost = {
    register: register, unregister: unregister, entries: entries,
    active: active, mult: mult, cap: cap, summaryNode: summaryNode,
    NEWCOMER_MS: NEWCOMER_MS, OPTIN_MS: OPTIN_MS, core: CORE
  };

  // 載入序：本檔早於 core/promo-cal.js 與 core/selftest.js ⇒ 兩者皆延後掛（比照 #56/#60 踩過的坑）
  if (HL.promoCal) registerPromo();
  else if (global.addEventListener) global.addEventListener("DOMContentLoaded", registerPromo);
  if (HL.selftest) registerTests(HL.selftest);
  else if (global.addEventListener) global.addEventListener("DOMContentLoaded", function () { registerTests(HL.selftest); });
})(typeof window !== "undefined" ? window : globalThis);

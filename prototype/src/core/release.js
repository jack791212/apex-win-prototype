/*
 * Apex Win｜遊戲上架排程 × 受眾分層 HL.release（自我進化引擎 #54）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 Crown Coins「Early Bird 新遊戲搶先體驗／獨家標題」——新遊戲**依排程分批開放**
 *   （先給特定族群/階級搶先玩）而非全站同時上架；同源訊號「Crown Bingo Live 每日固定時段開局房型」。
 *
 * 解決的問題：`HL.games` 註冊表原本是「註冊即全站可見」的**二元狀態**（playable / comingSoon），
 *   **沒有任何『何時、對誰』開放的維度** ⇒ 新遊戲只能全站同時可見，做不到搶先體驗／限時回歸／
 *   VIP 專屬首發。#49 `HL.promoCal` 已鋪好排程軸（window/recurring/always + 日曆/清單雙檢視），
 *   但**遊戲上架不在其中**＝促銷有排程、內容沒有。
 *
 * 核心哲學＝容器先於內容（擴充性優先）：
 *   - **排程與受眾皆為資料描述子**：一款遊戲宣告一筆 `declare({game, earlyAt, startAt, audience})`，
 *     不改任何遊戲檔、不改 `HL.games`。受眾述詞在 `AUDIENCES` 表裡（**加一種受眾＝加一筆定義**），
 *     不是散在各處的 if。
 *   - **未宣告排程的遊戲，行為逐位不變＝零回歸**：`stateOf()` 回 null、`playable()` 直接退化回
 *     `g.playable`、卡片不生成任何角標。這是本檔最重要的相容性契約（見 selftest release/zero-regression）。
 *   - 排程本身**自動 register 進 #49 promoCal** ⇒ 遊戲上架與促銷共用同一條排程軸與同一個活動日曆，
 *     且**可為尚未實作的遊戲先排程**（`game` 尚未註冊時只出現在日曆，不影響大廳）＝真實的上架流程。
 *
 * 三個階段（phaseOf）：
 *   upcoming  未到 earlyAt（或無 earlyAt 且未到 startAt）＝尚未開放，任何人皆不可玩
 *   early     已過 earlyAt、未到 startAt＝**搶先體驗期**，僅符合 audience 者可玩
 *   open      已過 startAt＝全站開放（audience 不再生效）
 *
 * 一律「即時求值」（比照 #49）：不快取、不常駐計時器，`Date.now()` 當下判定 → 跨午夜/跨窗自動正確。
 * 樣式走 inline（刻意不動 components.css：維護軌正在該檔作業，避免跨軌衝突；比照 #48/#49/#52）。
 *
 * 雙環境契約（比照 #50 edge／#51 betlog／#56 ledger）：純資料/純函式區（AUDIENCES/phaseOf/
 *   eligibleAt/gateOf）以 `module.exports` 暴露供 node 直接 require ⇒ **`prototype/tests/run.js`
 *   驗的即瀏覽器跑的同一份**，不會重蹈「一次性 node -e 驗完就消失」（#53 的立卡理由）。
 * 註冊於 window.HL.release = { declare, undeclare, stateOf, playable, badge, all, AUDIENCES }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  var DAY = 86400000;
  var CAL_TAIL_MS = 7 * DAY;   // 上架後仍在活動日曆列為「新上架」的天數

  // ===================== 純函式區（node 可 require · 無 DOM 相依）=====================

  /* 受眾述詞表（資料描述子：加一種受眾＝加一筆）。
   * test(ctx, arg) → 可否在「搶先體驗期」進場；label 為純片語（i18n 可翻），需帶值者由呼叫端接。
   * ctx 由瀏覽器端 audienceCtx() 組出：{ vipLevel, seasonTier, inGuild }；node 測項直接給假 ctx。
   * ⚠️ 未知 kind 一律**保守不放行**（false）＝拼錯受眾不會意外把未上架遊戲全站放出去。 */
  var AUDIENCES = {
    all:    { label: "全體玩家",  needsArg: false, test: function () { return true; } },
    vip:    { label: "VIP 段位",  needsArg: true,  test: function (ctx, arg) { return (ctx.vipLevel || 0) >= arg; } },
    season: { label: "季票階級",  needsArg: true,  test: function (ctx, arg) { return (ctx.seasonTier || 0) >= arg; } },
    guild:  { label: "公會成員",  needsArg: false, test: function (ctx) { return !!ctx.inGuild; } }
  };

  function phaseOf(rel, n) {
    if (!rel) return null;
    var open = rel.startAt || 0, early = rel.earlyAt || 0;
    if (open && n >= open) return "open";
    if (early && n >= early) return "early";
    if (!open && !early) return "open";          // 兩者皆無＝視同已開放（等於沒排程）
    return "upcoming";
  }

  // 是否可進場：open 一律可、upcoming 一律不可、early 依 audience 述詞
  function eligibleAt(rel, ctx, n) {
    var ph = phaseOf(rel, n);
    if (ph === "open") return true;
    if (ph !== "early") return false;
    var a = rel.audience;
    if (!a || !a.kind) return true;               // 搶先期未指定受眾＝開放給所有人搶先
    var d = AUDIENCES[a.kind];
    if (!d) return false;                         // 未知受眾＝保守不放行
    try { return !!d.test(ctx || {}, a.arg); } catch (e) { return false; }
  }

  /* 單一真相的閘：把「遊戲自身可玩性」與「排程可玩性」合成最終結果。
   * rel 為 null（未宣告）→ 逐位回傳 basePlayable＝零回歸契約的所在。 */
  function gateOf(rel, basePlayable, ctx, n) {
    if (!rel) return { scheduled: false, phase: null, eligible: true, playable: !!basePlayable };
    var ph = phaseOf(rel, n), ok = eligibleAt(rel, ctx, n);
    return { scheduled: true, phase: ph, eligible: ok, playable: !!basePlayable && ok };
  }

  var CORE = { AUDIENCES: AUDIENCES, phaseOf: phaseOf, eligibleAt: eligibleAt, gateOf: gateOf, CAL_TAIL_MS: CAL_TAIL_MS };

  // ===================== 測項（雙環境同一份定義）=====================
  function registerTests(st) {
    if (!st || !st.register) return;
    var T0 = 1000000000000;                       // 固定基準時刻（決定性：不用 Date.now）
    var REL = { game: "x", earlyAt: T0, startAt: T0 + 2 * DAY, audience: { kind: "vip", arg: 5 } };

    st.register({
      id: "release/phase-boundaries", group: "release", title: "三階段邊界與受眾閘（決定性）",
      run: function (t) {
        t.equal(phaseOf(REL, T0 - 1), "upcoming", "earlyAt 前一毫秒應為 upcoming");
        t.equal(phaseOf(REL, T0), "early", "earlyAt 當刻應進入搶先期（含邊界）");
        t.equal(phaseOf(REL, T0 + 2 * DAY - 1), "early", "startAt 前一毫秒仍為搶先期");
        t.equal(phaseOf(REL, T0 + 2 * DAY), "open", "startAt 當刻應全站開放（含邊界）");
        // 受眾只在 early 期生效
        t.equal(eligibleAt(REL, { vipLevel: 9 }, T0 - 1), false, "upcoming 期任何段位皆不可進");
        t.equal(eligibleAt(REL, { vipLevel: 4 }, T0), false, "搶先期未達段位應被擋");
        t.equal(eligibleAt(REL, { vipLevel: 5 }, T0), true, "搶先期達標段位應放行（>= 而非 >）");
        t.equal(eligibleAt(REL, { vipLevel: 0 }, T0 + 2 * DAY), true, "全站開放後受眾不再生效");
        // 未知受眾＝保守不放行（拼錯不會把未上架遊戲放出去）
        t.equal(eligibleAt({ earlyAt: T0, startAt: T0 + DAY, audience: { kind: "typo" } }, { vipLevel: 99 }, T0), false,
          "未知受眾 kind 應保守不放行");
        t.equal(eligibleAt({ earlyAt: T0, startAt: T0 + DAY }, {}, T0), true, "搶先期未指定受眾＝開放搶先");
        // 受眾表本身：每個 kind 都要有 label 與 test
        Object.keys(AUDIENCES).forEach(function (k) {
          t.isFn(AUDIENCES[k].test, "受眾 " + k + " 應有 test 述詞");
          t.ok(!!AUDIENCES[k].label, "受眾 " + k + " 應有 label");
        });
      }
    });

    st.register({
      id: "release/zero-regression", group: "release", title: "未宣告排程的遊戲行為逐位不變",
      run: function (t) {
        // 這是本卡的相容性契約：沒有 rel 時，gateOf 必須是 basePlayable 的恆等函式
        [true, false].forEach(function (base) {
          var g = gateOf(null, base, {}, T0);
          t.equal(g.playable, base, "未宣告排程時 playable 應等於原 g.playable（" + base + "）");
          t.equal(g.scheduled, false, "未宣告排程時 scheduled 應為 false");
          t.equal(g.phase, null, "未宣告排程時不應有階段");
          t.equal(g.eligible, true, "未宣告排程時不應被受眾擋");
        });
        // 有排程但玩家不符 → 只擋「可玩」，不會反過來把不可玩的變成可玩
        t.equal(gateOf(REL, true, { vipLevel: 1 }, T0).playable, false, "搶先期不符受眾應不可玩");
        t.equal(gateOf(REL, false, { vipLevel: 9 }, T0 + 2 * DAY).playable, false,
          "本來就不可玩的遊戲不因排程開放而變可玩（閘只會收緊、不會放寬）");
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 以下為瀏覽器區 =====================
  var el = HL.dom.el;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  function dhm(ms) { return HL.dom.dhm ? HL.dom.dhm(ms) : Math.round(ms / 3600000) + "h"; }

  var TABLE = {};                                  // gameId → rel（宣告即生效；同 id 覆蓋）

  // 受眾判定用的玩家上下文（即時取用，模組未載入則該維度自動視為未達成）
  function audienceCtx() {
    var vip = 0, tier = 0, guild = false;
    try { if (HL.vip && HL.vip.status) vip = HL.vip.status().level || 0; } catch (e) {}
    try { if (HL.season && HL.season.status) tier = HL.season.status().tier || 0; } catch (e) {}
    try { if (HL.guild && HL.guild.status) guild = !!HL.guild.status().joined; } catch (e) {}
    return { vipLevel: vip, seasonTier: tier, inGuild: guild };
  }

  function audienceLabel(rel) {
    var a = rel && rel.audience;
    if (!a || !a.kind) return t("全體玩家", "全體玩家");
    var d = AUDIENCES[a.kind];
    if (!d) return t("限定受眾", "限定受眾");
    if (!d.needsArg) return t(d.label, d.label);
    return t(d.label, d.label) + " " + a.arg + "+";
  }

  /* 宣告一筆上架排程。game 可以是**尚未註冊的遊戲 id**（先排程後實作＝真實流程），
   * 此時只會出現在活動日曆，不影響大廳任何卡片。 */
  function declare(rel) {
    if (!rel || !rel.game) return HL.release;
    TABLE[rel.game] = rel;
    registerPromo(rel);
    return HL.release;
  }
  function undeclare(gameId) {
    delete TABLE[gameId];
    if (HL.promoCal && HL.promoCal.unregister) HL.promoCal.unregister("release:" + gameId);
    return HL.release;
  }
  function relOf(gameId) { return TABLE[gameId] || null; }
  function all() { return Object.keys(TABLE).map(function (k) { return TABLE[k]; }); }

  function titleOf(rel) {
    var g = HL.games && HL.games.byId ? HL.games.byId(rel.game) : null;
    return g ? HL.games.title(g) : (rel.title || rel.game);
  }

  /* 對外主查詢：未宣告排程 → null（呼叫端據此走原路徑＝零回歸）。 */
  function stateOf(gameId) {
    var rel = relOf(gameId);
    if (!rel) return null;
    var n = Date.now(), g = gateOf(rel, true, audienceCtx(), n);
    return {
      game: gameId, phase: g.phase, eligible: g.eligible,
      earlyAt: rel.earlyAt || 0, startAt: rel.startAt || 0,
      toOpen: rel.startAt ? Math.max(0, rel.startAt - n) : 0,
      toEarly: rel.earlyAt ? Math.max(0, rel.earlyAt - n) : 0,
      audience: audienceLabel(rel), title: titleOf(rel)
    };
  }

  // 最終可玩性：唯一該被 UI 呼叫的判斷（合成 g.playable 與排程閘）
  function playable(g) {
    if (!g) return false;
    var s = gateOf(relOf(g.id), g.playable, audienceCtx(), Date.now());
    return s.playable;
  }

  /* 卡面角標（inline style，不動 components.css）。未宣告排程 → null＝卡片逐位不變。 */
  function badge(g) {
    var s = g ? stateOf(g.id) : null;
    if (!s || s.phase === "open") return null;      // 全站開放後角標自動消失（無需清資料）
    var early = s.phase === "early", ok = s.eligible;
    var bg = early ? (ok ? "rgba(57,217,138,.92)" : "rgba(12,14,20,.86)") : "rgba(12,14,20,.86)";
    var col = early && ok ? "#08120c" : "var(--ax-gold, #e8c26a)";
    return el("span", {
      class: "ax-release__badge",
      style: "position:absolute;left:6px;bottom:6px;z-index:3;padding:2px 7px;border-radius:999px;" +
        "font-size:var(--ax-fs-xs, 11px);font-weight:700;white-space:nowrap;background:" + bg + ";color:" + col +
        ";border:1px solid rgba(255,255,255,.14)",
      text: early ? (ok ? t("⚡ 搶先體驗", "⚡ 搶先體驗") : t("🔒 搶先體驗中", "🔒 搶先體驗中")) : t("🗓️ 即將上架", "🗓️ 即將上架")
    });
  }

  /* 未達受眾/未上架時的說明 modal（取代原本「直接進遊戲」）。
   * 刻意講清楚三件事：現在什麼階段、誰現在能玩、我什麼時候能玩＝不讓玩家撞到無解釋的牆。 */
  function explain(g) {
    var s = stateOf(g.id);
    if (!s) return false;
    var rows = [
      HL.ui.kv(t("開放階段", "開放階段"), s.phase === "early" ? t("搶先體驗期", "搶先體驗期") : t("尚未開放", "尚未開放")),
      HL.ui.kv(t("目前可玩", "目前可玩"), s.audience, { valCls: "ax-gold" })
    ];
    // ⚠️ P3 契約：翻譯只發生在「整個文字節點等於一條 key」時，故倒數值與標籤必須分開——
    //   「倒數」二字放在標籤（純片語＝可翻），值只留純數字時間（本來就不需翻）。
    if (s.phase === "upcoming" && s.toEarly > 0) rows.push(HL.ui.kv(t("搶先體驗開始倒數", "搶先體驗開始倒數"), dhm(s.toEarly)));
    if (s.toOpen > 0) rows.push(HL.ui.kv(t("全站開放倒數", "全站開放倒數"), dhm(s.toOpen)));
    HL.ui.modal("🗓️ " + s.title, [
      el("p", { class: "ax-muted", text: t("這款遊戲採分批上架：先開放給指定族群搶先體驗，時間到才全站開放。", "這款遊戲採分批上架：先開放給指定族群搶先體驗，時間到才全站開放。") }),
      el("div", {}, rows),
      el("div", { class: "ax-modal__actions" }, [
        HL.promoCal ? el("button", { class: "ax-btn-ghost", text: t("查看活動日曆", "查看活動日曆"), onClick: function () { HL.ui.closeTop(); HL.promoCal.open(); } }) : null
      ].filter(Boolean)),
      el("span", { class: "ax-demo-tag", text: t("上架排程 · 資料驅動", "上架排程 · 資料驅動") })
    ]);
    return true;
  }

  /* ---- 接進 #49 活動日曆：一筆排程＝一則日曆項（含尚未實作的遊戲）----
   * 上架後保留 CAL_TAIL_MS 當「新上架」，之後自動 ended（日曆自己排序到最後）。*/
  function registerPromo(rel) {
    if (!HL.promoCal || !HL.promoCal.register) return;
    HL.promoCal.register({
      id: "release:" + rel.game,
      name: function () { return titleOf(rel); },
      icon: "🗓️", cat: t("新上架", "新上架"), sched: "window",
      resolve: function () {
        var n = Date.now(), start = rel.earlyAt || rel.startAt || 0;
        return { startAt: start, endAt: (rel.startAt || start) + CAL_TAIL_MS, ended: n >= (rel.startAt || start) + CAL_TAIL_MS };
      },
      // ⚠️ #49 note 為單一文字節點＝「中文＋動態值」翻不到（P3 已記契約）→ 這裡只用純片語
      note: function () {
        var s = stateOf(rel.game);
        if (!s) return "";
        if (s.phase === "early") return s.eligible ? t("你已可搶先體驗", "你已可搶先體驗") : t("搶先體驗中 · 你尚未符合資格", "搶先體驗中 · 你尚未符合資格");
        if (s.phase === "upcoming") return t("尚未開放 · 即將排定上架", "尚未開放 · 即將排定上架");
        return t("已全站開放", "已全站開放");
      },
      open: function () {
        var g = HL.games && HL.games.byId ? HL.games.byId(rel.game) : null;
        if (g && playable(g)) { HL.games.launch(g); return; }
        if (g) { explain(g); return; }
        HL.ui.toast(t("這款遊戲尚未上線", "這款遊戲尚未上線"), "warn");
      }
    });
  }

  HL.release = {
    declare: declare, undeclare: undeclare, stateOf: stateOf, playable: playable,
    badge: badge, explain: explain, all: all, relOf: relOf,
    AUDIENCES: AUDIENCES, phaseOf: phaseOf, eligibleAt: eligibleAt, gateOf: gateOf
  };

  /* ---- 種子排程（示範兩種真實用法；固定日期＝到期自動生效/失效，不需回頭清資料）----
   * ① 既有遊戲的搶先體驗：Gem Storm 已開放搶先，門檻 Lv 1（＝人人達標）⇒ 只會多一枚「⚡ 搶先體驗」
   *    角標，**不鎖任何人**（刻意：demo 站不該把玩家原本玩得到的遊戲關起來）。08-08 後自動全站開放、角標消失。
   * ② 尚未實作的遊戲先排程：Aurora Rush 尚未註冊進 HL.games ⇒ 只出現在活動日曆的「新上架」，
   *    大廳完全不受影響＝證明「先排程、後實作」這條真實流程可行。 */
  declare({
    game: "gem-storm",
    earlyAt: new Date(2026, 7, 1, 0, 0, 0).getTime(),      // 2026-08-01 起搶先
    startAt: new Date(2026, 7, 8, 20, 0, 0).getTime(),     // 2026-08-08 20:00 全站開放
    audience: { kind: "vip", arg: 1 }
  });
  declare({
    game: "aurora-rush", title: "極光衝刺 Aurora Rush",
    earlyAt: new Date(2026, 7, 12, 20, 0, 0).getTime(),    // 2026-08-12 20:00 VIP 搶先
    startAt: new Date(2026, 7, 15, 20, 0, 0).getTime(),    // 2026-08-15 20:00 全站開放
    audience: { kind: "vip", arg: 8 }
  });

  // 載入序脫鉤（#101）：現排在 selftest.js 之後走直通；else 分支保證重排也不會靜默掉測項。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

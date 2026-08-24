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
   * test(ctx, arg) → 該玩家是否落在這群人裡；label 為純片語（i18n 可翻），需帶值者由呼叫端接。
   * ctx 由瀏覽器端 audienceCtx() 組出（見下）；node 測項直接給假 ctx。
   * `unit` 為選用的值單位片語：有 unit 者顯示成「label 值 unit」（新手期 7 天內），
   *   無 unit 的 needsArg 者顯示成「label 值+」（VIP 段位 5+）＝兩種都是「片語＋純數字」的組合，
   *   符合 P3 契約（翻譯只發生在整個文字節點等於一條 key 時，故數字必須自成一段）。
   * ⚠️ 未知 kind 一律**保守不放行**（false）＝拼錯受眾不會意外把限定內容全站放出去。
   *
   * 🔑 這張表是**全站唯一一份受眾詞彙**（#107）。消費端有三：
   *   ① #54 遊戲上架排程的「搶先體驗期」（eligibleAt，帶階段語意）
   *   ② #49 促銷/活動日曆（HL.promoCal，整段窗口語意）
   *   ③ #19 兌換碼（HL.redeem，領取當下語意）
   * **加一種受眾＝在這裡加一筆，三處同時受益**；任何消費端都不得自建第二張表或自刻門檻數字
   * （常駐鎖 `platform/audience-single-vocabulary` 會 FAIL）。 */
  var AUDIENCES = {
    all:      { label: "全體玩家",     needsArg: false, test: function () { return true; } },
    /* goal:true ＝**只會單向前進、玩家可憑持續遊玩自行達成** ⇒ 消費端得把未達標的標的「可見但鎖著」
     * 展示（那是目標，不是空頭承諾）。未標 goal 者一律必須**隱藏**：newcomer 過了永遠回不去、
     * active30/wagered7 是滾動窗會退、season 每季歸零。#107 `audience-promo-hidden-not-greyed`
     * （灰掉＝預告一個拿不到的獎）是這條原則的第一個實例；#123 把它從「promo-cal 的個案風格」升級成
     * **詞彙自帶的欄位**，讓「該藏還是該鎖」由這張表回答，而非各消費端各自判斷。(2026-08-24 #123)
     * vip：`status().level` 由**終身**押注導出＝只升不降（progress.js 明載）⇒ 目前唯一的 goal。 */
    vip:      { label: "VIP 段位",     needsArg: true,  goal: true,
                test: function (ctx, arg) { return (ctx.vipLevel || 0) >= arg; } },
    season:   { label: "季票階級",     needsArg: true,  test: function (ctx, arg) { return (ctx.seasonTier || 0) >= arg; } },
    guild:    { label: "公會成員",     needsArg: false, test: function (ctx) { return !!ctx.inGuild; } },
    // ↓ #107 新增三個維度。三者皆由**既有的單一真相**供給（見 audienceCtx 註解），本表不自刻門檻。
    newcomer: { label: "新手期", unit: "天內", needsArg: true,
      // accountAgeDays 為 null＝「不知道你何時來的」或「播種當下就已是老玩家」⇒ 保守不算新手
      test: function (ctx, arg) { var d = ctx.accountAgeDays; return typeof d === "number" && d >= 0 && d < (arg || 7); } },
    active:   { label: "近 30 天活躍",  needsArg: false, test: function (ctx) { return !!ctx.active30; } },
    // 「近 7 天押注達標」＝Stake Bonus Drops 形制。⚠️ 用真實金額尺（wageredSince）而非 edge 加權尺（xpSince）：
    //   兩把尺刻意分開存，混用會讓門檻在高 edge 遊戲上被悄悄放寬（#59 卡上明文警告）。
    wagered7: { label: "近 7 天押注",   needsArg: true,  test: function (ctx, arg) { return (ctx.wagered7 || 0) >= arg; } }
  };

  /* 純述詞求值（**無階段語意**）：未宣告 audience＝全體、未知 kind＝保守 false、test 拋錯＝false。
   * #54 的 eligibleAt 在此之上再疊「只有 early 期才問受眾」的階段語意；
   * #49/#19 則是「整段期間/領取當下」都問 ⇒ 述詞共用、階段語意各自定義（#107 卡上點名的阻塞事實 (b)）。 */
  function matches(a, ctx) {
    if (!a || !a.kind) return true;
    var d = AUDIENCES[a.kind];
    if (!d) return false;
    try { return !!d.test(ctx || {}, a.arg); } catch (e) { return false; }
  }

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
    // 搶先期未指定受眾＝開放給所有人搶先；未知受眾＝保守不放行（兩者皆由 matches 統一定義）
    return matches(rel.audience, ctx);
  }

  /* 單一真相的閘：把「遊戲自身可玩性」與「排程可玩性」合成最終結果。
   * rel 為 null（未宣告）→ 逐位回傳 basePlayable＝零回歸契約的所在。 */
  function gateOf(rel, basePlayable, ctx, n) {
    if (!rel) return { scheduled: false, phase: null, eligible: true, playable: !!basePlayable };
    var ph = phaseOf(rel, n), ok = eligibleAt(rel, ctx, n);
    return { scheduled: true, phase: ph, eligible: ok, playable: !!basePlayable && ok };
  }

  /* 「未達標時該藏、還是該當目標展示？」由詞彙自己回答（見 AUDIENCES.vip 上方）。
   * 未宣告／未知 kind ⇒ false（不知道就別展示一個可能拿不到的標的）。 */
  function isGoalAudience(a) {
    if (!a || !a.kind) return false;
    var d = AUDIENCES[a.kind];
    return !!(d && d.goal);
  }

  var CORE = { AUDIENCES: AUDIENCES, matches: matches, phaseOf: phaseOf, eligibleAt: eligibleAt, gateOf: gateOf, isGoalAudience: isGoalAudience, CAL_TAIL_MS: CAL_TAIL_MS };

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

    /* #107：受眾詞彙升格為平台級之後，`matches` 是三個消費端共用的那一個述詞求值器。
     * 這裡守的是**述詞本身**（階段語意各自定義、不在此驗）：
     *   ① 未宣告＝全體、未知 kind＝保守 false、test 拋錯＝false（三種退化都不得放寬）
     *   ② 三個新維度的邊界（含「不知道帳齡」與「老玩家」兩種 null 情形）
     *   ③ matches 與 eligibleAt 不得分叉——後者必須是前者疊上階段語意，不是第二份實作 */
    st.register({
      id: "release/audience-vocabulary", group: "release", title: "#107 受眾述詞：退化一律收緊、三個新維度邊界、與階段閘同源",
      run: function (t) {
        // ① 三種退化
        t.equal(matches(null, {}), true, "未宣告 audience＝全體玩家");
        t.equal(matches({}, {}), true, "audience 物件無 kind＝視同未宣告");
        t.equal(matches({ kind: "typo" }, { vipLevel: 99 }), false, "未知 kind 必須保守不放行（拼錯不得變成全站開放）");
        var boom = { kind: "boom" };
        AUDIENCES.boom = { label: "x", needsArg: false, test: function () { throw new Error("boom"); } };
        t.equal(matches(boom, {}), false, "test 拋錯必須當作不符合（不得因例外而放行）");
        delete AUDIENCES.boom;

        // ② newcomer：ctx.accountAgeDays 為 null（不知道／老玩家）時一律不成立
        var NC = { kind: "newcomer", arg: 7 };
        t.equal(matches(NC, { accountAgeDays: null }), false, "帳齡未知（老玩家播種為 0）不得算新手");
        t.equal(matches(NC, {}), false, "ctx 完全沒有帳齡維度時不得算新手");
        t.equal(matches(NC, { accountAgeDays: 0 }), true, "剛註冊（0 天）應算新手");
        t.equal(matches(NC, { accountAgeDays: 6.99 }), true, "第 7 天結束前仍算新手");
        t.equal(matches(NC, { accountAgeDays: 7 }), false, "滿 7 天當刻即不算新手（< 而非 <=）");
        t.equal(matches({ kind: "newcomer" }, { accountAgeDays: 6 }), true, "未帶 arg 時應退回預設 7 天");

        // ② active：只認 ctx.active30 這一個布林（門檻定義在 HL.activity，不在本表）
        t.equal(matches({ kind: "active" }, { active30: true }), true, "光環亮著應符合");
        t.equal(matches({ kind: "active" }, { active30: false }), false, "光環未亮不符合");
        t.equal(matches({ kind: "active" }, {}), false, "缺維度＝不符合（模組未載入時保守）");

        // ② wagered7：真實金額尺（>=），且不得被 xp 尺冒充
        var W = { kind: "wagered7", arg: 500 };
        t.equal(matches(W, { wagered7: 499.99 }), false, "未達門檻應被擋");
        t.equal(matches(W, { wagered7: 500 }), true, "恰達門檻應放行（>= 而非 >）");
        t.equal(matches(W, {}), false, "缺維度視為 0");
        t.equal(matches(W, { xpSince7: 99999 }), false,
          "只有 edge 加權尺（xp）不得讓金額門檻成立——兩把尺刻意分開存，混用會讓門檻在高 edge 遊戲上被悄悄放寬");

        // ③ 同源：對同一組 (audience, ctx)，搶先期的 eligibleAt 必須與 matches 逐一相同
        var CASES = [
          [{ kind: "vip", arg: 5 }, { vipLevel: 5 }], [{ kind: "vip", arg: 5 }, { vipLevel: 4 }],
          [{ kind: "guild" }, { inGuild: true }], [{ kind: "guild" }, {}],
          [NC, { accountAgeDays: 1 }], [NC, { accountAgeDays: 99 }],
          [{ kind: "active" }, { active30: true }], [W, { wagered7: 500 }], [{ kind: "typo" }, {}], [null, {}]
        ];
        CASES.forEach(function (c, i) {
          var rel = { game: "x", earlyAt: T0, startAt: T0 + DAY, audience: c[0] };
          t.equal(eligibleAt(rel, c[1], T0), matches(c[0], c[1]),
            "第 " + i + " 組：搶先期的 eligibleAt 必須等於 matches（分叉＝又有第二份述詞實作）");
        });

        // 受眾表本身：needsArg 的 kind 必須真的用得到 arg（否則 UI 會顯示一個沒有意義的數字）
        t.ok(Object.keys(AUDIENCES).length >= 7, "受眾詞彙樣本數下限（實測 " + Object.keys(AUDIENCES).length + " 種）——" +
          "零樣本時下面的逐項檢查會『完美通過』");
        Object.keys(AUDIENCES).forEach(function (k) {
          var d = AUDIENCES[k];
          if (!d.needsArg) t.equal(d.test.length <= 1, true, "不需帶值的受眾 " + k + " 的 test 不該吃第二個參數");
          if (d.unit) t.equal(d.needsArg, true, "帶單位的受眾 " + k + " 必然需要帶值");
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

  /* 受眾判定用的玩家上下文（即時取用，模組未載入則該維度自動視為未達成）。
   * ⚠️ #107 契約：**所有消費端共用這一份 ctx**——缺維度就加在這裡，不准在 promo-cal/redeem 自己組第二份。
   * 每一維度都向既有的單一真相求值，本函式自己不存任何狀態：
   *   vipLevel/seasonTier/inGuild → HL.vip / HL.season / HL.guild
   *   accountAgeDays             → HL.rakeboost.newcomerTs()（#52 已有的「首次見到這位玩家」時間戳；
   *                                 老玩家播種為 0 ⇒ 這裡回 null＝新手述詞保守不成立）
   *   active30 / wagered7        → HL.activity（#59 環形桶；status().active 與 wageredSince(7)） */
  function audienceCtx() {
    var vip = 0, tier = 0, guild = false, ageDays = null, act30 = false, w7 = 0;
    try { if (HL.vip && HL.vip.status) vip = HL.vip.status().level || 0; } catch (e) {}
    try { if (HL.season && HL.season.status) tier = HL.season.status().tier || 0; } catch (e) {}
    try { if (HL.guild && HL.guild.status) guild = !!HL.guild.status().joined; } catch (e) {}
    try {
      if (HL.rakeboost && HL.rakeboost.newcomerTs) {
        var ts = HL.rakeboost.newcomerTs();
        if (ts > 0) ageDays = Math.max(0, (Date.now() - ts) / 86400000);
      }
    } catch (e) {}
    try { if (HL.activity && HL.activity.status) act30 = !!HL.activity.status().active; } catch (e) {}
    try { if (HL.activity && HL.activity.wageredSince) w7 = HL.activity.wageredSince(7) || 0; } catch (e) {}
    return { vipLevel: vip, seasonTier: tier, inGuild: guild, accountAgeDays: ageDays, active30: act30, wagered7: w7 };
  }

  /* 受眾描述子 → 玩家看得懂的片語。**這是全站唯一的受眾標籤產生器**（#107 消費端都呼叫它）。
   * 組法一律「可翻片語 + 純數字 (+ 可翻單位)」＝P3 契約下每一段各自翻得到。 */
  function audienceLabelOf(a) {
    if (!a || !a.kind) return t("全體玩家", "全體玩家");
    var d = AUDIENCES[a.kind];
    if (!d) return t("限定受眾", "限定受眾");
    if (!d.needsArg) return t(d.label, d.label);
    if (d.unit) return t(d.label, d.label) + " " + a.arg + " " + t(d.unit, d.unit);
    return t(d.label, d.label) + " " + a.arg + "+";
  }
  function audienceLabel(rel) { return audienceLabelOf(rel && rel.audience); }

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
    AUDIENCES: AUDIENCES, phaseOf: phaseOf, eligibleAt: eligibleAt, gateOf: gateOf,
    // #107：受眾述詞的公用出口（促銷日曆 / 兌換碼 / 未來的任務投放都吃這三個，不另立第二套）
    matches: matches, audienceCtx: audienceCtx, audienceLabelOf: audienceLabelOf,
    // #123：「該藏 vs 該當目標鎖著」的唯一裁判（消費端不自行判斷 kind）
    isGoalAudience: isGoalAudience
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

  /* ---- #115 報表中心的外部註冊者 ----
   * 為什麼是這個檔：`all()` 的排程表是**有內容沒出口**的典型——玩家端只看得到卡片上那枚角標，
   *   營運端想知道「現在有幾款在搶先期、誰卡在受眾閘外」只能開 console。註冊一筆即得表格＋CSV。
   * `aud: "ops"` 是刻意的：受眾閘（誰現在玩得到）是**投放策略**，不是玩家自己的資料。
   *   （`cat` 只管分群、不參與授權——reports.js 檔頭那條分離契約。）
   * ⚠️ 載入序：本檔在 index.html 排在 `core/reports.js` **之後**才有 `HL.reports`。
   *   排反了 `if` 直接短路＝這張報表靜默消失（不報錯）⇒ 常駐鎖 `platform/reports-registrars-load-order` 盯著。
   * 一切數字向 `stateOf()` 當下求值，不快取、不手抄——與大廳角標讀的是同一個出口。 */
  if (HL.reports && HL.reports.register) {
    HL.reports.register({
      id: "release-schedule", cat: "ops", aud: "ops", icon: "🗓️", name: "上架排程與受眾閘",
      cols: [
        { key: "game",  label: "遊戲 id", csv: "game",     cell: function (r) { return r.game; },  raw: function (r) { return r.game; } },
        { key: "title", label: "名稱",   csv: "title",    cell: function (r) { return r.title; }, raw: function (r) { return r.title; } },
        { key: "phase", label: "階段",   csv: "phase",    cell: function (r) { return r.phase; }, raw: function (r) { return r.phase; } },
        { key: "elig",  label: "我可玩", csv: "eligible", cell: function (r) { return r.eligible ? "是" : "否"; }, raw: function (r) { return r.eligible ? 1 : 0; } },
        { key: "aud",   label: "受眾",   csv: "audience", cell: function (r) { return r.audience; }, raw: function (r) { return r.audience; } },
        { key: "early", label: "搶先開始", csv: "early_at", cell: function (r) { return tsTxt(r.earlyAt); }, raw: function (r) { return tsTxt(r.earlyAt); } },
        { key: "open",  label: "全站開放", csv: "start_at", cell: function (r) { return tsTxt(r.startAt); }, raw: function (r) { return tsTxt(r.startAt); } }
      ],
      rows: function () {
        return all().map(function (rel) { return stateOf(rel.game); }).filter(Boolean);
      },
      avail: function () { return all().length > 0; }
    });
  }
  function tsTxt(ms) { return ms ? new Date(ms).toISOString().slice(0, 16).replace("T", " ") : "—"; }

  // 載入序脫鉤（#101）：現排在 selftest.js 之後走直通；else 分支保證重排也不會靜默掉測項。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

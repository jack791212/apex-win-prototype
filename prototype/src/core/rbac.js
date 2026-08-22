/*
 * Apex Win｜營運身分的述詞註冊表 HL.rbac（自我進化引擎 #117）
 * ─────────────────────────────────────────────────────────────────────
 * 為什麼要有（台帳「資安／權限角色」自 08-05 起連五輪 partial 的那個缺口，08-22 才被釘成兩個坐標）：
 *   ① 全站唯一產生「營運視角」授權上下文的產品程式碼只有一行——`core/demo-tools.js` 的
 *      `HL.reports.open({ ops: true })` ⇒ **前端的「你是營運」＝「你打開了 ⚙ DEMO 面板」**；
 *   ② 受眾值域是 `core/reports.js` 裡硬寫的兩值陣列，且常駐測項還有一條
 *      `AUDS.join(",") === "player,ops"` **把它釘成恰好兩值**。
 *   ⇒ 要新增第三種營運身分（客服／風控／行銷）＝**改值域 + 改測項**，而不是加一筆註冊。
 *      這與 `HL.games`／`HL.support`／`HL.promoCal`／`HL.reports`／`HL.release` 一路建立的
 *      「加一筆 spec」形制**背道而馳**——本檔就是把那條值域換成一個容器。
 *
 * 形制（容器先於內容 · 一筆角色＝一筆 spec）：
 *   `register({ id, label, icon, grants: [...], base?, ctxFlag?, avail? })`
 *   —— `grants` 是**授權述詞的集合**（例：`ops-finance` 授 `["ops.ledger", "ops.release"]`），
 *   `can(grant, ctx)` 是**唯一的謂詞**。消費端只認 grant 字串，永遠不認得角色清單本身
 *   ⇒ 多一種營運身分＝多一筆 `register`，消費端一行不改。
 *
 * 【grant 是有層級的（點號前綴），這是刻意的】
 *   `covers("ops", "ops.ledger") === true`：持有 `ops` 者涵蓋所有 `ops.*` 子述詞。
 *   為什麼要層級：現況只有粗粒度的 `ops` 一種，但將來一定會需要「只看帳本、不看發佈排程」。
 *   若無層級，那天必須回頭把每個消費端的 grant 字串逐一改細＝又一次「改值域」；
 *   有層級的話，**今天寫 `aud: "ops.ledger"` 的報表，今天的 `ops` 角色就已經看得到**，
 *   而明天新增的 `ops-finance` 角色只授 `ops.ledger` 就自動只看得到那一張。
 *
 * 【權威在伺服器 —— 本檔不得假裝解決那件事（卡上的紅線 ③）】
 *   前端**零權威**：伺服器權威目前只覆蓋 `ops_summary` 一支 RPC（回 `{error:'forbidden'}`），
 *   其餘 ops 報表全由本機資料就地產生 ⇒ 本註冊表只決定「**提供什麼**」，不決定「**准不准**」。
 *   台帳 08-05 記下的「權威在伺服器＝設計本身正確」不因本卡被推翻；報表中心須據實說明
 *   （比照 #57／#105 無見證者時的據實不供應）。改這裡**不會**讓任何一支 RPC 變得可繞過。
 *
 * 【真站/假站正交（卡上的紅線 ④）】
 *   角色是**身分軸**，`HL.site` 是**站別軸**，兩者不得互相冒充。本檔一個字都不讀 `HL.site`
 *   （常駐鎖 `platform/rbac-single-predicate` 盯著）——真站沒有角色伺服器，真站的營運面仍只有
 *   `ops_summary` 那一支是真的，這件事由站別軸自己說，不由角色軸代言。
 *
 * 【零回歸的形狀（比照 #54 release 的相容性契約）】
 *   第一批註冊者＝現況的兩種身分：`player`（`base: true` ＝恆生效，人人都是玩家）與
 *   `ops`（`ctxFlag: "ops"` ＝相容既有 `{ ops: true }` 呼叫端）。⇒ 沒宣告角色的呼叫端走原路徑：
 *   `can("player", {})` 真、`can("ops", {})` 假、`can("ops", { ops: true })` 真 —— 與舊 `visible()`
 *   的三種結果逐位相同。⚠️ `ops` 若被誤標 `base: true`，全站營運報表會對所有玩家可見而畫面完全正常
 *   ⇒ 常駐鎖 `rbac/baseline-is-current-two-identities` 有一條反向錨專門守這件事。
 *
 * 【為什麼 BASELINE 定義在本檔、而不是由「擁有那個身分的檔」外部註冊】
 *   最誠實的形制應該是「誰擁有身分來源，誰註冊它」（那就會是 demo-tools.js 註冊 ops）。
 *   刻意不那樣做的理由是**載入序**：`reports.js` 在載入當下就註冊 5 張報表，其中 3 張 `aud: "ops"`；
 *   若 `ops` 這個 grant 要等 demo-tools.js 載入才存在，那 3 張會因值域未知而被 `register()`
 *   **靜默拒收（回 null 不拋錯）＝畫面完全正常但少三張報表**（#66／#101／#106／#115 同一個坑）。
 *   ⇒ BASELINE 留在本檔、本檔靜態排在 `reports.js` 之前（常駐鎖 `platform/rbac-load-order`），
 *   換來確定性；而「第三種身分由外部註冊」這條路仍然開著（`register` 是公開出口），
 *   屆時它必須同樣排在消費端之前——那條順序鎖現在就先立好。
 *
 * 雙環境契約（比照 #50 edge／#51 betlog／#109 reports）：純函式區可被 node `require`，
 * 測項與瀏覽器端跑的是同一份定義。註冊於 window.HL.rbac。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純函式區（node 可 require · 無 DOM 相依）=====================

  /* grant 字串格式：小寫點號分段（`ops`／`ops.ledger`）。
     為什麼要格式閘：grant 是**跨模組共用的字串**，一旦有人寫 `"Ops"`／`"ops "`／`"ops.*"`，
     它會安安靜靜地誰都對不上＝那筆授權從未生效，而註冊看起來成功了。 */
  var GRANT_RE = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/;

  // 前綴涵蓋：持有 held 是否涵蓋 want（見檔頭「grant 是有層級的」）
  function covers(held, want) {
    return held === want || want.indexOf(held + ".") === 0;
  }

  /* 註冊表工廠：**本身零內建角色**（容器先於內容；測項 rbac/container-empty 盯著）。
     每個實例互不干擾（node 測項每條各開一個，不共用全域狀態）。 */
  function makeRbac() {
    var roles = {}, order = [];

    function register(spec) {
      if (!spec || !spec.id || typeof spec.id !== "string") return null;
      if (roles[spec.id]) return null;                                  // 不得覆蓋＝不會出現兩份真相
      if (!Array.isArray(spec.grants) || !spec.grants.length) return null;   // 空殼角色拒收
      for (var i = 0; i < spec.grants.length; i++) {
        if (typeof spec.grants[i] !== "string" || !GRANT_RE.test(spec.grants[i])) return null;
      }
      var r = {
        id: spec.id,
        label: spec.label || spec.id,
        icon: spec.icon || "",
        grants: spec.grants.slice(),
        base: !!spec.base,
        ctxFlag: typeof spec.ctxFlag === "string" ? spec.ctxFlag : "",
        avail: typeof spec.avail === "function" ? spec.avail : null
      };
      roles[r.id] = r; order.push(r.id);
      return r;
    }

    function get(id) { return roles[id] || null; }
    function ids() { return order.slice(); }
    function usable(r) { return !!r && (!r.avail || !!r.avail()); }

    /* ctx → 生效角色。三條來源，全部 fail-closed（不認得就當沒有，不是當有）：
         ① `base: true` 的角色恆生效（player）；
         ② `ctx.roles: [id]` 明指（未註冊或 avail() 為假者忽略）；
         ③ `ctxFlag`＝相容既有布林旗標呼叫端（`{ ops: true }`）。 */
    function rolesOf(ctx) {
      var out = [], seen = {};
      function add(id) {
        if (seen[id]) return;
        var r = roles[id];
        if (!usable(r)) return;
        seen[id] = 1; out.push(r);
      }
      order.forEach(function (id) { if (roles[id].base) add(id); });
      if (ctx && Array.isArray(ctx.roles)) {
        ctx.roles.forEach(function (id) { if (typeof id === "string") add(id); });
      }
      if (ctx) order.forEach(function (id) { var r = roles[id]; if (r.ctxFlag && ctx[r.ctxFlag]) add(id); });
      return out;
    }

    function grantsOf(ctx) {
      var out = [], seen = {};
      rolesOf(ctx).forEach(function (r) {
        r.grants.forEach(function (g) { if (!seen[g]) { seen[g] = 1; out.push(g); } });
      });
      return out;
    }

    // 唯一的謂詞（消費端只呼叫這一個；非字串/空字串一律假＝fail-closed）
    function can(grant, ctx) {
      if (!grant || typeof grant !== "string") return false;
      var held = grantsOf(ctx);
      for (var i = 0; i < held.length; i++) if (covers(held[i], grant)) return true;
      return false;
    }

    /* 值域封閉性：這個 grant 有沒有被**任何**已註冊角色宣告（含前綴涵蓋）。
       消費端拿它當「受眾值必須明寫且合法」的閘（reports.js 的 aud 就是走這裡）
       ⇒ 打錯字的受眾＝註冊失敗，而不是「一個誰都看不到的報表」那種靜默。 */
    function knows(grant) {
      if (!grant || typeof grant !== "string" || !GRANT_RE.test(grant)) return false;
      for (var i = 0; i < order.length; i++) {
        var gs = roles[order[i]].grants;
        for (var j = 0; j < gs.length; j++) if (covers(gs[j], grant)) return true;
      }
      return false;
    }

    // 唯讀快照（面板用；不外流內部物件，避免有人在外面改 grants）
    function list() {
      return order.map(function (id) {
        var r = roles[id];
        return { id: r.id, label: r.label, icon: r.icon, grants: r.grants.slice(),
                 base: r.base, ctxFlag: r.ctxFlag, usable: usable(r) };
      });
    }

    return {
      register: register, get: get, ids: ids, list: list,
      can: can, knows: knows, rolesOf: rolesOf, grantsOf: grantsOf,
      covers: covers, GRANT_RE: GRANT_RE
    };
  }

  /* 第一批註冊者＝**現況的兩種身分**（本卡不新增也不減少任何一種身分；見檔頭「零回歸的形狀」）。
     刻意是純資料陣列而非寫死在 makeRbac 裡 ⇒ 容器仍是空的，兩者都可被測項分別檢查。 */
  var BASELINE = [
    { id: "player", label: "玩家", icon: "🙂", base: true, grants: ["player"] },
    { id: "ops", label: "營運（⚙ 工具面板）", icon: "⚙", ctxFlag: "ops", grants: ["ops"] }
  ];

  // 種好第一批的實例（瀏覽器端與 node 測項共用同一份 BASELINE，不抄第二份）
  function seeded() {
    var r = makeRbac();
    BASELINE.forEach(function (s) { r.register(s); });
    return r;
  }

  var CORE = { makeRbac: makeRbac, seeded: seeded, BASELINE: BASELINE, covers: covers, GRANT_RE: GRANT_RE };

  // ===================== 測項（雙環境同一份定義）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    st.register({
      id: "rbac/container-empty", group: "rbac", tier: "fast",
      title: "#117 ①：容器本身零內建角色，且空殼／格式錯／同 id 覆蓋一律拒收",
      run: function (t) {
        var R = makeRbac();
        t.equal(R.ids().length, 0, "makeRbac() 不得自帶任何角色（容器先於內容）");
        t.equal(R.register(null), null, "空 spec 應拒絕");
        t.equal(R.register({ id: "a" }), null, "無 grants 應拒絕（沒授權的角色＝空殼）");
        t.equal(R.register({ id: "a", grants: [] }), null, "空 grants 陣列應拒絕");
        t.equal(R.register({ id: "a", grants: "ops" }), null, "grants 非陣列應拒絕");
        t.equal(R.register({ id: "a", grants: ["Ops"] }), null, "grant 大寫不合格式應拒絕（打錯字＝誰都對不上）");
        t.equal(R.register({ id: "a", grants: ["ops ledger"] }), null, "grant 含空白應拒絕");
        t.equal(R.register({ id: "a", grants: ["ops.*"] }), null, "grant 含通用字元應拒絕（層級由前綴涵蓋，不用萬用符）");
        t.equal(R.ids().length, 0, "以上都不該進表");
        t.ok(!!R.register({ id: "a", grants: ["ops.ledger"] }), "齊備者應收下");
        t.equal(R.register({ id: "a", grants: ["player"] }), null, "同 id 不得覆蓋（避免兩份真相）");
        t.equal(R.get("a").grants.join(","), "ops.ledger", "被拒絕的覆蓋不得改動既有角色");
        // 外流的必須是快照：在外面改 list() 的結果不得回寫進表
        var snap = R.list()[0]; snap.grants.push("player");
        t.equal(R.get("a").grants.length, 1, "list() 給的是快照，改它不得污染註冊表");
      }
    });

    st.register({
      id: "rbac/grant-hierarchy-and-fail-closed", group: "rbac", tier: "fast",
      title: "#117 ②：述詞層級（前綴涵蓋）＋一切不確定一律 fail-closed",
      run: function (t) {
        t.equal(covers("ops", "ops.ledger"), true, "持有 ops 應涵蓋 ops.ledger");
        t.equal(covers("ops", "ops"), true, "同名應涵蓋");
        t.equal(covers("ops.ledger", "ops"), false, "細粒度不得反向涵蓋粗粒度");
        t.equal(covers("ops", "opsx"), false, "前綴涵蓋只認點號邊界（opsx 不是 ops 的子述詞）");

        var R = makeRbac();
        R.register({ id: "fin", label: "財務", grants: ["ops.ledger"] });
        R.register({ id: "boss", label: "全營運", grants: ["ops"] });
        t.equal(R.can("ops.ledger", { roles: ["fin"] }), true, "細粒度角色應持有自己的述詞");
        t.equal(R.can("ops.release", { roles: ["fin"] }), false, "細粒度角色不得持有沒授的述詞");
        t.equal(R.can("ops.release", { roles: ["boss"] }), true, "粗粒度角色應涵蓋所有子述詞");
        // fail-closed 三態
        t.equal(R.can("ops.ledger", null), false, "無 ctx 不得放行");
        t.equal(R.can("", { roles: ["boss"] }), false, "空 grant 不得放行");
        t.equal(R.can(null, { roles: ["boss"] }), false, "非字串 grant 不得放行");
        t.equal(R.can("ops", { roles: ["nobody"] }), false, "未註冊的角色 id 應被忽略（不是當它存在）");
        // avail() 為假的角色即使被明指也不生效
        R.register({ id: "gone", grants: ["ops"], avail: function () { return false; } });
        t.equal(R.can("ops", { roles: ["gone"] }), false, "avail() 為假的角色不得生效");
        t.equal(R.rolesOf({ roles: ["gone", "fin"] }).length, 1, "不可用角色不得進生效清單");
        // 值域封閉性
        t.equal(R.knows("ops.ledger"), true, "已被宣告的述詞應在值域內");
        t.equal(R.knows("ops.release"), true, "被粗粒度涵蓋的述詞也算在值域內");
        t.equal(R.knows("admin"), false, "沒有任何角色宣告的述詞不得在值域內");
        t.equal(R.knows("OPS"), false, "格式不合者不得在值域內");
      }
    });

    st.register({
      id: "rbac/baseline-is-current-two-identities", group: "rbac", tier: "fast",
      title: "#117 ③：第一批＝現況兩種身分，且三種判斷結果與舊硬寫閘逐位相同（零回歸）",
      run: function (t) {
        t.equal(BASELINE.map(function (s) { return s.id; }).join(","), "player,ops",
          "第一批註冊者必須恰為現況兩種身分（本卡不新增也不減少身分；多一種＝加一筆註冊，不是改這裡）");
        var R = seeded();
        t.equal(R.ids().join(","), "player,ops", "種子實例應恰有兩個角色");
        // 舊 visible() 的三種結果（reports.js 改寫前的行為）：
        t.equal(R.can("player", {}), true, "玩家述詞：不給 ctx 也必須為真（人人都是玩家）");
        t.equal(R.can("player", { ops: true }), true, "營運視角同樣看得到玩家報表（舊行為：aud:player 對誰都可見）");
        t.equal(R.can("ops", {}), false, "營運述詞：不給 ctx 必須為假（預設拒絕營運報表）");
        t.equal(R.can("ops", { ops: true }), true, "營運述詞：帶 { ops: true } 必須為真（相容既有呼叫端）");
        // ⚠️ 反向錨：ops 一旦被誤標 base，營運報表會對所有玩家可見而畫面完全正常
        var ops = BASELINE.filter(function (s) { return s.id === "ops"; })[0];
        t.equal(!!ops.base, false, "ops 不得是 base 角色（誤標＝莊家帳目對所有玩家可見，且畫面看不出來）");
        t.equal(ops.ctxFlag, "ops", "ops 必須靠 ctxFlag 啟用（相容 { ops: true } 的唯一橋）");
        var pl = BASELINE.filter(function (s) { return s.id === "player"; })[0];
        t.equal(!!pl.base, true, "player 必須是 base 角色（否則不帶 ctx 時連自己的注單都看不到）");
        t.equal(pl.grants.indexOf("ops"), -1, "player 不得持有任何 ops 述詞");
        // 第三種身分＝加一筆註冊（本卡的全部價值；註冊表以外一行不改）
        var R2 = seeded();
        R2.register({ id: "ops-finance", label: "財務", grants: ["ops.ledger"] });
        t.equal(R2.can("ops.ledger", { roles: ["ops-finance"] }), true, "新身分應立即持有自己的述詞");
        t.equal(R2.can("ops", { roles: ["ops-finance"] }), false, "新身分不得因此取得全部營運述詞");
        t.equal(R2.ids().length, 3, "多一種身分＝多一筆註冊");
      }
    });

    st.register({
      id: "rbac/browser-baseline", group: "rbac", tier: "fast", env: "browser",
      title: "#117 ④：瀏覽器端 HL.rbac 到位，且與 node 端同一份 BASELINE",
      run: function (t) {
        var R = HL && HL.rbac;
        t.ok(!!R, "HL.rbac 應存在（缺席時 reports 會 fail-closed 到零張報表）");
        t.equal(R.ids().join(","), "player,ops", "瀏覽器端角色表應與 BASELINE 一致");
        t.equal(R.can("ops", {}), false, "玩家視角不得持有營運述詞");
        t.equal(R.can("ops", { ops: true }), true, "⚙ 工具面板路徑（{ops:true}）應持有營運述詞");
        t.isFn(R.knows, "值域閘 knows() 應對外公開（reports.js 的受眾閘向它求）");
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 以下為瀏覽器區 =====================
  var R = seeded();

  HL.rbac = {
    register: R.register, get: R.get, ids: R.ids, list: R.list,
    can: R.can, knows: R.knows, rolesOf: R.rolesOf, grantsOf: R.grantsOf,
    covers: covers, GRANT_RE: GRANT_RE
  };

  // 載入序脫鉤（#101）：排在 selftest.js 前或後都註冊得到
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

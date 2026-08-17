/*
 * Apex Win｜紅利可用範圍軸 HL.wagerScope（自我進化引擎 #89）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 LeoVegas「Golden Chips」——該站的紅利明載 **"can be used only in Playtech games"**，
 *   而「slot 算 100%、桌遊只算 10%」更是全業界最標準的紅利條款之一。
 *
 * 解決的問題（架構層的斷線，不是缺一個活動）：
 *   中央結算點 `HL.liveStats.record(game, bet, win)` 明明帶著 `game`，卻只把它傳給
 *   `edge`／`rakeback`／`challenges`／`heat`／`achievements`／`betlog`；送到紅利引擎時
 *   `HL.bonus.onWager(bet)` **簽章裡沒有 game**（live-stats.js:31）⇒ 紅利在架構上**不可能**
 *   知道這一注押在哪款遊戲，「這筆紅利只能在 slot 打流水」這類條款做不出來。
 *   2026-08-12 實測 `grep -rn "eligibleGames|allowedGames|gameScope|onlyGames" core` **0 命中**。
 *
 * 它是 `game` 軸的最後一塊：#85（競賽計分軸）已修掉 `tournament.record(bet)` 的同型缺陷，
 *   `bonus` 是這個中央掛鉤上最後一個收不到 `game` 的大消費端。接上之後，「紅利限定遊戲範圍」
 *   只是第一個消費者；「某遊戲不計流水」「不同遊戲流水權重不同」都變成填一張表。
 *
 * 核心契約：
 *   - **未宣告範圍時逐位零回歸**：`weightFor(undefined, …) === 1` 且**完全不查表**
 *     ⇒ `bOnWager` 的 FIFO 推進、連鎖解鎖、`wagerFree` 全部逐位不變（見測項 zero-regression）。
 *   - **權重恆在 [0,1]**：>1 等於「押 1 塊算 2 塊」的隱形加速，與 #65 `BOOST_CAP` 真站 1.0
 *     是同一條紅線（見測項 weight-never-exceeds-one）。
 *   - **不符範圍只是不推進，絕不倒扣**：權重 0 ⇒ 該注對進度的貢獻為 0，既有 prog 一分不減。
 *   - **真站不得比假站寬鬆**：`wLive` 未宣告時恆等於 `w` ⇒ 該不變量今日是**恆等式**而非宣稱
 *     （沿 #63/#81 形制，見測項 live-never-looser）。
 *   - **無從得知時 fail-open**：遊戲登錄表尚未載入（`registryReady()` 為 false）時一律回 1。
 *     理由：兩種錯誤不對稱——「紅利在不該解鎖的遊戲上解鎖了」在純前端 demo 只是留存機制走快一點，
 *     而「因為查不到遊戲類別而永遠鎖住玩家的錢」是不可接受的靜默失效。
 *
 * 類別軸沿用既有單一真相 `HL.games` 的 `type`（slot｜table｜live｜special｜original），
 *   **刻意不逐款列舉**（比照 #50 EDGE 的教訓：逐款表會讓每款新遊戲都得回頭改表）。
 *
 * 雙環境契約（比照 #50 edge／#85 scoreAxis）：純資料/純函式區以 `module.exports` 暴露供 node
 *   直接 require ⇒ `prototype/tests/run.js` 驗的即瀏覽器跑的同一份。
 * 註冊於 window.HL.wagerScope = { weightFor, typeOf, get, ids, register, describe, PRESETS, ... }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純函式區（node 可 require · 無 DOM 相依）=====================

  var CATS = ["slot", "table", "live", "special", "original"];  // 即 HL.games 的 type 值域
  var UNKNOWN = "unknown";

  /* 具名範圍描述子（加一種紅利條款＝加一筆註冊，不改紅利引擎）：
   *   id / label    識別與顯示片語（label 為純片語 ⇒ i18n 可整節點翻譯，見 P3 契約）
   *   games[]       逐款白名單（在清單內＝1、否則 0）。與 w 二選一，games 優先。
   *   w             每類別權重（假站）。**未宣告的類別吃 `rest`，`rest` 未宣告則為 0**
   *                 ⇒ 「只有我列出的類別算流水」是預設語義（業界標準）。
   *   wLive         真站權重（選用）。不給＝與 w 相同 ⇒ live-never-looser 成為恆等式。
   */
  var PRESETS = {};
  function define(spec) { PRESETS[spec.id] = spec; return spec; }

  // 顯式的「不限制」＝與「沒宣告」等價，供活動想把條款寫清楚時使用
  define({ id: "all", label: "全部遊戲", w: { rest: 1 } });
  define({ id: "slotOnly", label: "限 SLOT 類遊戲", w: { slot: 1 } });
  define({ id: "originalsOnly", label: "限 Originals 類遊戲", w: { original: 1 } });
  // 業界最標準的一張表：slot 全額、桌遊/真人打一折
  define({ id: "standard", label: "標準權重（SLOT 100%／桌遊 10%）",
           w: { slot: 1, original: 1, special: 1, table: 0.1, live: 0.1 } });

  // NaN（非數字）視為 0；其餘一律夾進 [0,1]——含 Infinity ⇒ 與「5 夾成 1」同一條規則，
  //   避免出現「寫 5 被夾成 1、寫 Infinity 反而變 0」這種不一致（實測抓到的第一個 bug）。
  function clamp01(v) { v = +v; if (isNaN(v) || v <= 0) return 0; return v > 1 ? 1 : v; }
  function get(id) { return PRESETS[id] || null; }
  function ids() { return Object.keys(PRESETS); }

  function register(spec) {
    if (!spec || !spec.id) return null;
    if (!spec.games && !spec.w) return null;      // 拒絕「什麼都沒宣告」的空殼描述子
    if (!spec.label) spec.label = spec.id;
    return define(spec);
  }

  function mode() { return (!isNode && HL && HL.site && HL.site.isLive()) ? "live" : "demo"; }

  // 權重表取用（真站優先 wLive，未宣告則與假站同一份）
  function weightsOf(spec, md) {
    return ((md || mode()) === "live" && spec.wLive) ? spec.wLive : spec.w;
  }

  function gameId(game) {
    if (game && typeof game === "object") return game.id || null;
    return (game === 0 || game) ? String(game) : null;
  }

  /* 解析器：瀏覽器走 HL.games（單一真相）；node 測項注入 resolve(id) → { type }。
   * registryReady 為 false ⇒ 無從判斷類別 ⇒ weightFor 一律 fail-open 回 1。 */
  function resolverOf(resolve) {
    if (typeof resolve === "function") return resolve;
    if (!isNode && HL && HL.games && HL.games.byId && HL.games.all && HL.games.all().length) {
      return function (id) { return HL.games.byId(id); };
    }
    return null;
  }
  function registryReady(resolve) { return !!resolverOf(resolve); }

  function typeOf(game, resolve) {
    if (game && typeof game === "object" && game.type) return game.type;
    var id = gameId(game); if (!id) return UNKNOWN;
    var r = resolverOf(resolve); if (!r) return UNKNOWN;
    var g = null; try { g = r(id); } catch (e) { g = null; }
    return (g && g.type) ? g.type : UNKNOWN;
  }

  /* 本檔的唯一出口：這一注對「這筆紅利」的流水貢獻權重（0..1）。
   * scope 可為 preset id 字串或行內描述子物件；null/undefined＝沒宣告＝1（零回歸錨點）。 */
  function weightFor(scope, game, opts) {
    if (scope == null || scope === "") return 1;               // ← 零回歸錨點：完全不查表
    opts = opts || {};
    var spec = (typeof scope === "string") ? get(scope) : scope;
    // 拼錯 preset 名 ⇒ 退化為「沒宣告」（比照 #85 未知軸名退回預設軸）。
    //   刻意不回 0：拼錯字若讓紅利永遠鎖住，是難以歸因的靜默失效。
    if (!spec) return 1;
    if (spec.games) {
      var id = gameId(game);
      if (!id) return registryReady(opts.resolve) ? 0 : 1;
      return spec.games.indexOf(id) >= 0 ? 1 : 0;
    }
    var w = weightsOf(spec, opts.mode); if (!w) return 1;
    if (!registryReady(opts.resolve)) return 1;                // ← fail-open：查不到登錄表不鎖錢
    var cat = typeOf(game, opts.resolve);
    var v = (w[cat] != null) ? w[cat] : (w.rest != null ? w.rest : 0);
    return clamp01(v);
  }

  // 顯示用片語（領取中心對受限紅利顯示一行）。無宣告 → null＝不顯示任何多餘的行。
  function labelOf(scope) {
    if (scope == null || scope === "") return null;
    var spec = (typeof scope === "string") ? get(scope) : scope;
    if (!spec) return null;
    if (spec.label) return spec.label;
    return spec.games ? "限定指定遊戲" : "限定部分遊戲";
  }

  /* 唯讀自我描述（#90「經濟旋鈕自我描述層」的前置相容：回傳純值副本，改它不會改到旋鈕）。 */
  function describe() {
    return ids().map(function (id) {
      var s = PRESETS[id], d = {}, l = {};
      CATS.concat(["rest"]).forEach(function (c) {
        var wd = s.w || {}, wl = weightsOf(s, "live") || {};
        if (wd[c] != null) d[c] = wd[c];
        if (wl[c] != null) l[c] = wl[c];
      });
      return { key: id, label: s.label, demo: d, live: l, unit: "×",
               note: s.games ? ("逐款白名單 " + s.games.length + " 款") : "每類別權重（未列類別吃 rest，預設 0）" };
    });
  }

  var CORE = {
    CATS: CATS, UNKNOWN: UNKNOWN, PRESETS: PRESETS,
    weightFor: weightFor, typeOf: typeOf, labelOf: labelOf,
    get: get, ids: ids, register: register, describe: describe,
    mode: mode, weightsOf: weightsOf, registryReady: registryReady
  };

  // ===================== 測項（雙環境同一份定義）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    // node 測項用的假登錄表（瀏覽器走真 HL.games）
    var FAKE = { dice: "original", pirots: "slot", baccarat: "table", "live-room": "live", chicken: "special" };
    var RS = function (id) { return FAKE[id] ? { id: id, type: FAKE[id] } : null; };

    st.register({
      id: "wagerScope/zero-regression", group: "wagerScope", title: "未宣告範圍＝權重恆為 1（紅利引擎逐位零回歸）",
      run: function (t) {
        // (a) 本卡最重要的相容性契約：沒宣告 scope 的紅利必須與改版前一模一樣
        [undefined, null, ""].forEach(function (sc) {
          ["dice", "pirots", "baccarat", "不存在的遊戲", 0, undefined].forEach(function (g) {
            t.equal(weightFor(sc, g, { resolve: RS }), 1,
              "未宣告 scope（" + String(sc) + "）在遊戲 " + String(g) + " 上的權重必須恰為 1");
          });
        });
        t.equal(weightFor("typo-不存在的範圍", "baccarat", { resolve: RS }), 1,
          "拼錯 preset 名應退化為『沒宣告』（權重 1），不得靜默鎖住紅利");
        t.equal(weightFor("all", "baccarat", { resolve: RS }), 1, "顯式 all 應與沒宣告等價");
        t.equal(weightFor("all", "不在表內的新遊戲", { resolve: RS }), 1, "all 的 rest=1 應覆蓋未知類別");
      }
    });

    st.register({
      id: "wagerScope/weight-never-exceeds-one", group: "wagerScope", title: "權重恆在 [0,1]（>1＝隱形加速，同 #65 紅線）",
      run: function (t) {
        // (b) 任何註冊表/行內宣告都不得產出 >1 的權重
        ids().forEach(function (id) {
          var s = get(id);
          ["demo", "live"].forEach(function (md) {
            var w = weightsOf(s, md) || {};
            Object.keys(w).forEach(function (c) {
              t.ok(w[c] <= 1, "preset " + id + "（" + md + "）的 " + c + " 權重 " + w[c] + " 不得 >1");
              t.ok(w[c] >= 0, "preset " + id + "（" + md + "）的 " + c + " 權重不得為負");
            });
          });
        });
        // 行內宣告的惡意/手誤值必須被夾住
        t.equal(weightFor({ id: "x", w: { slot: 5 } }, "pirots", { resolve: RS }), 1, "權重 5 必須被夾到 1");
        t.equal(weightFor({ id: "x", w: { slot: -3 } }, "pirots", { resolve: RS }), 0, "負權重必須被夾到 0");
        t.equal(weightFor({ id: "x", w: { slot: Infinity } }, "pirots", { resolve: RS }), 1, "Infinity 必須被夾到 1");
        t.equal(weightFor({ id: "x", w: { slot: NaN } }, "pirots", { resolve: RS }), 0, "NaN 必須被夾到 0");
      }
    });

    st.register({
      id: "wagerScope/scope-semantics", group: "wagerScope", title: "類別權重與白名單語義（未宣告類別預設 0）",
      run: function (t) {
        t.equal(weightFor("slotOnly", "pirots", { resolve: RS }), 1, "slotOnly 在 slot 類應為 1");
        t.equal(weightFor("slotOnly", "baccarat", { resolve: RS }), 0, "slotOnly 在桌遊應為 0（不推進）");
        t.equal(weightFor("slotOnly", "dice", { resolve: RS }), 0, "slotOnly 在 originals 應為 0");
        t.equal(weightFor("standard", "pirots", { resolve: RS }), 1, "standard 在 slot 應為 100%");
        t.equal(weightFor("standard", "baccarat", { resolve: RS }), 0.1, "standard 在桌遊應為 10%");
        t.equal(weightFor("standard", "live-room", { resolve: RS }), 0.1, "standard 在真人應為 10%");
        t.equal(weightFor("standard", "dice", { resolve: RS }), 1, "standard 在 originals 應為 100%");
        // 未宣告的類別吃 rest，rest 未宣告則為 0＝「只有我列出的算流水」
        t.equal(weightFor({ id: "x", w: { slot: 1 } }, "chicken", { resolve: RS }), 0, "未列出的類別預設不算流水");
        t.equal(weightFor({ id: "x", w: { slot: 1, rest: 0.5 } }, "chicken", { resolve: RS }), 0.5, "rest 應覆蓋未列出的類別");
        // 逐款白名單
        var wl = { id: "wl", games: ["dice", "pirots"] };
        t.equal(weightFor(wl, "dice", { resolve: RS }), 1, "白名單內應為 1");
        t.equal(weightFor(wl, "baccarat", { resolve: RS }), 0, "白名單外應為 0");
        t.equal(typeOf("baccarat", RS), "table", "typeOf 應由登錄表解析類別");
        t.equal(typeOf("查無此款", RS), "unknown", "查不到的遊戲應為 unknown");
      }
    });

    st.register({
      id: "wagerScope/live-never-looser", group: "wagerScope", title: "真站權重不得比假站寬鬆（未宣告 wLive 時為恆等式）",
      run: function (t) {
        // (d) 沿 #63/#81 形制。今日全部 preset 皆未宣告 wLive ⇒ 這是恆等式而非宣稱
        ids().forEach(function (id) {
          var s = get(id);
          var d = s.w || {}, l = weightsOf(s, "live") || {};
          CATS.concat(["rest"]).forEach(function (c) {
            var dv = d[c] != null ? d[c] : (d.rest != null ? d.rest : 0);
            var lv = l[c] != null ? l[c] : (l.rest != null ? l.rest : 0);
            t.ok(lv <= dv, "preset " + id + " 的真站 " + c + " 權重（" + lv + "）不得寬於假站（" + dv + "）");
          });
        });
        // 機制本身要是活的：註冊一個真站更緊的描述子，證明 wLive 這條路徑真的會被走到
        //   （否則上面那圈在「沒人宣告 wLive」時是空殼＝#81 t.skip 事故的同型陷阱）
        var probe = { id: "_probe", w: { slot: 1 }, wLive: { slot: 0.2 } };
        t.equal(weightFor(probe, "pirots", { resolve: RS, mode: "demo" }), 1, "探針在假站應為 1");
        t.equal(weightFor(probe, "pirots", { resolve: RS, mode: "live" }), 0.2, "探針在真站應走 wLive＝0.2");
        t.ok(weightFor(probe, "pirots", { resolve: RS, mode: "live" }) <
             weightFor(probe, "pirots", { resolve: RS, mode: "demo" }), "wLive 路徑必須真的會被走到");
      }
    });

    st.register({
      id: "wagerScope/fail-open-and-describe", group: "wagerScope", title: "查不到登錄表時 fail-open + describe() 不洩漏可寫參考",
      run: function (t) {
        // 無 resolver（登錄表未載入）⇒ 一律 1，絕不因為查不到類別而鎖住玩家的錢
        var noRS = function () { return null; };
        t.equal(weightFor("slotOnly", "pirots", { resolve: null }), 1,
          "登錄表不可用時必須 fail-open 回 1（不得因查不到類別而永久鎖住紅利）");
        t.equal(weightFor("slotOnly", "pirots", { resolve: noRS }), 0,
          "登錄表可用但查無該款時，未列類別仍依 rest 語義（此處 0）");
        // describe()：純值副本（#90 前置相容）
        var d1 = describe(), d2 = describe();
        t.ok(d1.length === ids().length, "describe 應涵蓋所有 preset");
        d1[0].demo.slot = 999;
        t.ok(d2[0].demo.slot !== 999, "describe() 回傳值被改動不得影響旋鈕表本身");
        t.ok(get(d1[0].key).w.slot !== 999, "describe() 不得洩漏可寫入的參考");
        t.equal(labelOf(null), null, "沒宣告範圍時不得產生多餘的顯示行");
        t.ok(!!labelOf("slotOnly"), "受限紅利應有可顯示的片語");
        // 註冊即擴充
        var before = ids().length;
        register({ id: "_t_scope", label: "測試範圍", w: { slot: 1 } });
        t.equal(ids().length, before + 1, "註冊後 preset 數應 +1");
        t.equal(weightFor("_t_scope", "pirots", { resolve: RS }), 1, "新 preset 應可被取用");
        delete PRESETS._t_scope;
        t.equal(ids().length, before, "清理後應回復");
        t.equal(register({ id: "empty" }), null, "什麼都沒宣告的空殼描述子應被拒");
        t.equal(register(null), null, "空註冊應被拒");
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 以下為瀏覽器區 =====================
  HL.wagerScope = CORE;
  // 載入序脫鉤（#101）：本檔早於 core/selftest.js ⇒ 先排隊，由 selftest.js 載入時清算。
  //   （改版前是無條件呼叫、而 registerTests 對 falsy st 會 early-return ⇒ 本檔 5 個測項
  //    在瀏覽器端從未註冊過，且因為它「不報錯」而完全無聲。）
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

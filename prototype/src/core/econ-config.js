/* ApexWin — #90 經濟旋鈕的「自我描述」層 `HL.econCfg`
 * ---------------------------------------------------------------------------
 * 【問題】儀表板（views/ops-dashboard.js）看得到「已發生的結果」（ledger 事件彙總出的
 *   GGR/NGR/RTP），卻**看不到「旋鈕現在被設成幾」**——faucet 上限、VIP 升級金、
 *   rakeboost CAP、edge 係數、段位 wagerMult 全都只存在於程式碼裡。實測（2026-08-15）
 *   `grep "HL\.(edge|rakeback|progressSrc|rakeboost|sla|ledger)" views/ops-dashboard.js`
 *   只命中 `HL.ledger`／`HL.site` ⇒ **一個具名經濟旋鈕表都沒讀**。
 *
 * 【解法·容器先於內容】本檔只是一個**登記表**，一個經濟數字都不新增、不改變。
 *   每張經濟表**自己註冊自己的描述子**（誰擁有旋鈕誰負責解釋，同 #72 `HL.support` 的
 *   「規則的擁有者自己註冊說明」），儀表板**遍歷已註冊者**而非硬列 N 張
 *   ⇒ 第 N+1 張表加一句 `register` 就自動出現在面板與健檢裡。
 *
 * 【三條刻意的紀律】
 *   ① **唯讀**：`all()` 回的是**凍結的純值副本**，改它不會改到旋鈕本體
 *      （不做半套的「線上改參數」——那需要權威在伺服器，屬 §11 真金前項目）。
 *   ② **讀活值、不手抄數字**：`describe()` 一律**當場從常數/出口求值**，
 *      不得手寫百分比字面量。否則就會長出第二份真相（`ops-dashboard.js` 的
 *      `STATIC_RISKS` 正是前車之鑑：文案裡的「返水 0.1–0.3%」是手抄的，
 *      改表時不會自己跟著改）。
 *   ③ **健檢由描述子推導**：宣告 `strict` 的維度自動被「真站不得比假站寬鬆」
 *      這條成本中性紀律盯住（§11），不必逐條硬寫規則。
 *
 * 註冊於 window.HL.econCfg = { register, list, all, audit, count }；node 端 module.exports 同形。
 */
(function (global) {
  "use strict";
  var isNode = typeof window === "undefined";
  var HL = isNode ? null : (global.HL = global.HL || {});

  var TABLES = [];   // [{ id, label, icon, order, describe }]

  function norm(spec) {
    return {
      id: String(spec.id),
      label: String(spec.label || spec.id),
      icon: spec.icon || "🎛️",
      order: isFinite(+spec.order) ? +spec.order : 100,
      describe: spec.describe
    };
  }

  /* 註冊一張經濟表。同 id 覆蓋（重複載入不會長出兩筆）。 */
  function register(spec) {
    if (!spec || !spec.id || typeof spec.describe !== "function") return false;
    var n = norm(spec);
    for (var i = 0; i < TABLES.length; i++) {
      if (TABLES[i].id === n.id) { TABLES[i] = n; return true; }
    }
    TABLES.push(n);
    return true;
  }

  function list() { return TABLES.map(function (t) { return t.id; }); }
  function count() { return TABLES.length; }

  /* 值的純副本：數字/字串原樣、陣列淺拷貝後凍結。**不回傳任何原始參考** ⇒
   * 呼叫端拿到的東西改不動旋鈕（不變量 a，有常駐測項）。 */
  function pureVal(v) {
    if (Array.isArray(v)) return Object.freeze(v.map(function (x) { return x; }));
    if (v && typeof v === "object") return Object.freeze({});   // 物件不外流（描述子應攤平成純值）
    return v;
  }

  function pureRow(r) {
    return Object.freeze({
      key: String(r.key || ""),
      label: String(r.label || r.key || ""),
      demo: pureVal(r.demo),
      live: pureVal(r.live),
      unit: r.unit == null ? "" : String(r.unit),
      note: r.note == null ? "" : String(r.note),
      strict: (r.strict === "le" || r.strict === "ge") ? r.strict : ""
    });
  }

  /* 全部旋鈕的唯讀快照。單張表的 describe() 拋錯不得拖垮整份快照
   * （不變量 c：儀表板未載入任一表時只是少一區、不得整頁壞掉）。 */
  function all() {
    var out = [];
    TABLES.slice().sort(function (a, b) { return a.order - b.order || (a.id < b.id ? -1 : 1); })
      .forEach(function (t) {
        var rows = [];
        try {
          var raw = t.describe() || [];
          for (var i = 0; i < raw.length; i++) if (raw[i] && raw[i].key) rows.push(pureRow(raw[i]));
        } catch (e) { rows = []; }
        out.push(Object.freeze({ id: t.id, label: t.label, icon: t.icon, rows: Object.freeze(rows) }));
      });
    return out;
  }

  /* ===== 由描述子推導的健檢 =====
   * 唯一一條通則（§11 成本中性紀律）：**真站任一維度不得比假站寬鬆**。
   *   strict:"le" ＝送幣型（回饋率/上限/次數）→ live 必須 ≤ demo
   *   strict:"ge" ＝摩擦型（流水倍數/門檻）  → live 必須 ≥ demo
   * 未宣告 strict 的維度不推導（例如兩站刻意同值、或方向本來就無意義者）。
   */
  function cmpPairs(demo, live) {
    // 回傳 [[d,l], …]；長度不一或非數字則略過該維度（不誤報）
    var ds = Array.isArray(demo) ? demo : [demo];
    var ls = Array.isArray(live) ? live : [live];
    if (ds.length !== ls.length) return null;
    var out = [];
    for (var i = 0; i < ds.length; i++) {
      var d = +ds[i], l = +ls[i];
      if (!isFinite(d) || !isFinite(l)) return null;
      out.push([d, l]);
    }
    return out;
  }

  function audit() {
    var warns = [];
    all().forEach(function (tb) {
      tb.rows.forEach(function (r) {
        if (!r.strict) return;
        var pairs = cmpPairs(r.demo, r.live);
        if (!pairs) return;
        for (var i = 0; i < pairs.length; i++) {
          var d = pairs[i][0], l = pairs[i][1];
          var bad = (r.strict === "le") ? (l > d) : (l < d);
          if (bad) {
            warns.push("🟠 經濟旋鈕「" + tb.label + " · " + r.label + "」真站比假站寬鬆（真站 " +
              l + (r.unit || "") + " vs 假站 " + d + (r.unit || "") +
              "，本維度宣告真站應 " + (r.strict === "le" ? "≤" : "≥") + " 假站）：真金模式會倒貼（§11）。");
            break;   // 同一維度只報一次（陣列型不逐段位洗版）
          }
        }
      });
    });
    return warns;
  }

  var CORE = { register: register, list: list, all: all, audit: audit, count: count, _pureRow: pureRow, _cmpPairs: cmpPairs };

  function registerTests(st) {
    if (!st || !st.register) return;
    st.register({
      id: "platform/econ-cfg-readonly", group: "platform", tier: "fast",
      title: "經濟旋鈕自我描述層：唯讀（回傳純值副本，改副本不得改到旋鈕）",
      run: function (t) {
        var probe = { r: 0.2, arr: [1, 2, 3] };
        register({
          id: "__probe_econ", label: "探針", order: 999,
          describe: function () {
            return [{ key: "r", label: "率", demo: probe.r, live: probe.r, unit: "" },
                    { key: "arr", label: "陣列", demo: probe.arr, live: probe.arr, unit: "" }];
          }
        });
        var snap = all().filter(function (x) { return x.id === "__probe_econ"; })[0];
        t.ok(!!snap, "探針表已註冊即出現於 all()（註冊即擴充）");
        var row = snap.rows[1];
        // 嘗試竄改回傳值（凍結物件在非嚴格模式下靜默失敗、嚴格模式拋錯 ⇒ 兩種都不得影響本體）
        try { row.demo[0] = 999; } catch (e) {}
        try { row.demo.push(4); } catch (e) {}
        t.equal(probe.arr[0], 1, "改副本陣列元素不得改到旋鈕本體");
        t.equal(probe.arr.length, 3, "改副本陣列長度不得改到旋鈕本體");
        t.ok(Object.isFrozen(row) && Object.isFrozen(row.demo), "回傳的列與陣列皆已凍結");
        t.ok(snap.rows[0].demo === 0.2, "純量值原樣傳回");
        // 描述子拋錯不得拖垮整份快照（不變量 c）
        register({ id: "__probe_boom", label: "會爆的表", order: 998, describe: function () { throw new Error("boom"); } });
        var full = all();
        t.ok(full.length >= 2, "有表的 describe() 拋錯時 all() 仍回傳完整清單");
        t.equal(full.filter(function (x) { return x.id === "__probe_boom"; })[0].rows.length, 0, "爆掉的表只是零列、不得中斷其他表");
        // 清理探針（唯讀測項紀律：不留殘留狀態）
        TABLES = TABLES.filter(function (x) { return x.id.indexOf("__probe") !== 0; });
      }
    });
    st.register({
      id: "platform/econ-cfg-strict-audit", group: "platform", tier: "fast",
      title: "經濟旋鈕自我描述層：真站不得比假站寬鬆（由描述子推導的健檢有鑑別力）",
      run: function (t) {
        var base = audit().length;
        register({
          id: "__probe_loose", label: "寬鬆探針", order: 999,
          describe: function () {
            return [
              { key: "give", label: "送幣型", demo: 0.10, live: 0.20, unit: "", strict: "le" },   // 真站更慷慨＝違規
              { key: "fric", label: "摩擦型", demo: 8, live: 6, unit: "×", strict: "ge" },        // 真站更鬆＝違規
              { key: "same", label: "同值", demo: 1, live: 1, unit: "", strict: "le" },           // 合規
              { key: "free", label: "未宣告", demo: 1, live: 99, unit: "" }                        // 不推導
            ];
          }
        });
        t.equal(audit().length, base + 2, "兩個違規維度各報一則、合規與未宣告者不報");
        // 陣列型（逐段位）也要抓得到，且同一維度只報一次
        TABLES = TABLES.filter(function (x) { return x.id.indexOf("__probe") !== 0; });
        register({
          id: "__probe_arr", label: "陣列探針", order: 999,
          describe: function () {
            return [{ key: "byTier", label: "逐段位", demo: [1, 2, 3], live: [1, 2, 9], unit: "", strict: "le" }];
          }
        });
        t.equal(audit().length, base + 1, "陣列型逐元素比較：任一段位寬鬆即報，且同維度只報一次");
        // 長度不一 / 非數字 ⇒ 不誤報
        TABLES = TABLES.filter(function (x) { return x.id.indexOf("__probe") !== 0; });
        register({
          id: "__probe_bad", label: "不可比探針", order: 999,
          describe: function () {
            return [{ key: "a", label: "長度不一", demo: [1, 2], live: [1], unit: "", strict: "le" },
                    { key: "b", label: "非數字", demo: "不限", live: "無", unit: "", strict: "le" }];
          }
        });
        t.equal(audit().length, base, "無法逐位比較的維度一律不推導（寧可漏報也不誤報）");
        TABLES = TABLES.filter(function (x) { return x.id.indexOf("__probe") !== 0; });
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  HL.econCfg = CORE;
  // 載入序脫鉤（#101）：本檔早於 core/selftest.js，此刻 HL.selftest 還不存在 ⇒ 先排隊，
  //   由 selftest.js 載入時清算。排在它前面或後面都成立，不必再調整 index.html 的順序。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

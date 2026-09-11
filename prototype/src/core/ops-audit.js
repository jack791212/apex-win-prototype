/*
 * Apex Win｜營運操作軌跡 HL.opsAudit（#182，2026-09-11 平台軌）
 * 營運面 9 個會改變世界的開關在此之前按下去不留任何一個字；完整理由與四條不變量見
 * tests/checks-platform.js 的 platform/ops-writes-leave-a-trace（首屏預算，長註解不放這裡）。
 * 形制同 HL.rbac / HL.reports / HL.econCfg：容器先於內容、fail-closed、回唯讀純值副本。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純函式區（node 可 require · 無 DOM 相依）=====================

  var ID_RE = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/;
  var SEV = ["info", "config", "destructive"];
  var CAP = 200;

  function normKind(spec) {
    if (!spec || !ID_RE.test(String(spec.id || ""))) return null;
    return {
      id: String(spec.id),
      label: String(spec.label || spec.id),
      icon: spec.icon || "•",
      severity: SEV.indexOf(spec.severity) >= 0 ? spec.severity : "info"
    };
  }
  function txt(v) { return v == null ? "" : String(v); }
  function pureEntry(e) {
    return { ts: +e.ts || 0, kind: txt(e.kind), actor: txt(e.actor), before: txt(e.before), after: txt(e.after) };
  }

  // 登記簿工廠：本身零內建型別；每個實例互不干擾
  function makeAudit(cap) {
    var kinds = {}, order = [], log = [], max = cap > 0 ? cap : CAP;
    function registerKind(spec) {
      var k = normKind(spec);
      if (!k || kinds[k.id]) return null;
      kinds[k.id] = k; order.push(k.id); return k;
    }
    function kindList() { return order.map(function (id) { return normKind(kinds[id]); }); }
    function record(id, d) {
      if (!kinds[id]) return null;           // fail-closed：未宣告的動作寫不進來
      d = d || {};
      var e = pureEntry({ ts: d.ts || Date.now(), kind: id, actor: d.actor || "", before: d.before, after: d.after });
      log.push(e);
      while (log.length > max) log.shift();
      return pureEntry(e);
    }
    function list(n) {
      var from = n > 0 ? Math.max(0, log.length - n) : 0;
      return log.slice(from).map(pureEntry).reverse();   // 最新在前
    }
    function count() { return log.length; }
    function dump() { return log.map(pureEntry); }
    function hydrate(arr) {
      if (!arr || !arr.length) return 0;
      for (var i = 0; i < arr.length; i++) {
        var e = pureEntry(arr[i] || {});
        if (kinds[e.kind]) log.push(e);      // 讀回來的同樣是外來輸入，走同一道閘
      }
      while (log.length > max) log.shift();
      return log.length;
    }
    return { registerKind: registerKind, kinds: kindList, record: record, list: list, count: count, dump: dump, hydrate: hydrate };
  }

  // 第一批登記者＝現況的 9 個營運寫入面（純資料，故容器仍是空的，兩者可分別檢查）
  var BASELINE = [
    ["site.mode", "切換站別（真站/假站）", "🚦", "destructive"],
    ["ledger.reset", "重置本機營運帳本", "🧹", "destructive"],
    ["balance.reset", "重置餘額", "💰", "destructive"],
    ["leaderboard.reset", "重置排行榜", "🏆", "destructive"],
    ["money.mode", "金流模式", "💱", "config"],
    ["money.licence", "真金牌照（開放提款）", "📜", "config"],
    ["demo.result", "演出：下一局結果", "🎬", "config"],
    ["demo.activity", "演出：社群活躍度", "🎬", "info"],
    ["demo.bigwin-speed", "演出：大獎牆速度", "🎬", "info"]
  ].map(function (r) { return { id: r[0], label: r[1], icon: r[2], severity: r[3] }; });

  var CORE = { makeAudit: makeAudit, normKind: normKind, pureEntry: pureEntry, BASELINE: BASELINE, SEV: SEV, CAP: CAP };

  if (isNode) { module.exports = CORE; return; }

  // ===================== 以下為瀏覽器區 =====================

  var ls = HL.dom.lsGet, save = HL.dom.lsSet;
  var KEY = "HL_OPSAUDIT";   // ⚠️ 刻意不是 HL_LEDGER：清帳本不得清掉「誰清了帳本」

  var inst = makeAudit(CAP);
  for (var i = 0; i < BASELINE.length; i++) inst.registerKind(BASELINE[i]);
  inst.hydrate(ls(KEY, null));

  function actor() { return (HL.rbac && HL.rbac.can("ops", { ops: true })) ? "ops" : "unknown"; }

  // 不做 debounce：切站別會立刻 location.reload()，慢一拍就沒了
  function record(id, d) {
    d = d || {};
    if (!d.actor) d.actor = actor();
    var e = inst.record(id, d);
    if (e) save(KEY, inst.dump());
    return e;
  }

  HL.opsAudit = {
    registerKind: inst.registerKind, kinds: inst.kinds,
    record: record, list: inst.list, count: inst.count
  };
})(typeof window !== "undefined" ? window : globalThis);

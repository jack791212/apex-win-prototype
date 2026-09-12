/* Apex Win｜收銀台通道註冊表 HL.cashier（#82 · 容器零內建，首批內容在 layout/app-shell.js）
 * 述詞層而已：不接真 PSP、不碰真錢。不變量見 tests/checks-platform.js 的 platform/cashier-*。 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var KINDS = ["fiat", "crypto"], FLOWS = ["deposit", "withdraw"], TABLE = [];
  function arr(v, f) { v = Object.prototype.toString.call(v) === "[object Array]" ? v : []; return f ? v.filter(f) : v.slice(); }
  function register(spec) {           // fail-closed：id/kind 不合規或重複 ⇒ 一個字都寫不進去
    if (!spec || typeof spec.id !== "string" || !spec.id || KINDS.indexOf(spec.kind) < 0) return false;
    for (var i = 0; i < TABLE.length; i++) if (TABLE[i].id === spec.id) return false;
    TABLE.push({ id: spec.id, kind: spec.kind,
      name: String(spec.name || spec.code || spec.id), icon: String(spec.icon || ""),
      code: String(spec.code || ""), net: String(spec.net || ""),
      enabled: spec.enabled === true, // 預設全關：沒明講開就是關的
      flows: arr(spec.flows, function (f) { return FLOWS.indexOf(f) >= 0; }),
      regions: arr(spec.regions), currencies: arr(spec.currencies), networks: arr(spec.networks),
      min: +spec.min || 0, max: +spec.max || 0, order: spec.order == null ? TABLE.length : +spec.order });
    return true;
  }
  function all(o) {                   // 唯一取用出口，關掉的在此就被濾掉（不是只隱藏）
    o = o || {};
    return TABLE.filter(function (c) {
      return c.enabled && (!o.kind || c.kind === o.kind) && (!o.flow || c.flows.indexOf(o.flow) >= 0) &&
        (!o.region || !c.regions.length || c.regions.indexOf(o.region) >= 0);
    }).sort(function (a, b) { return a.order - b.order; }).map(function (c) { return JSON.parse(JSON.stringify(c)); });
  }
  function get(id, o) { var r = all(o), i = 0; for (; i < r.length; i++) if (r[i].id === id) return r[i]; return null; }
  HL.cashier = { register: register, all: all, get: get, KINDS: KINDS.slice(), FLOWS: FLOWS.slice(),
    kinds: function (flow) { return KINDS.filter(function (k) { return all({ kind: k, flow: flow }).length > 0; }); },
    count: function () { return TABLE.length; } };
  if (typeof module !== "undefined" && module.exports) module.exports = HL.cashier;
})(typeof window !== "undefined" ? window : global);

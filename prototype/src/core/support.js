/*
 * Apex Win｜說明中心 `HL.support`（自我進化引擎 #72，合併 #95）
 *
 * 【這張卡在補什麼】平台的規則其實很齊——逐遊戲莊家優勢（#50 `HL.edge`）、提領時效與分階額度
 *   （#63 `HL.sla`）、負責任博弈工具（#67 `HL.rg`）、可驗證公平承諾（`HL.fair`）、紅利流水倍數
 *   （#20/#74 `HL.progress`）——但**全部只存在於各自的面板與引擎裡，玩家沒有一個「主動去查」的入口**。
 *   本檔只做**承載說明的架子**：一張可註冊的說明條目表 + 一個可搜尋的分群面板。
 *   **本卡不新增任何一條規則的「內容真相」**：每則說明的數字一律由擁有該規則的模組**當場求值**，
 *   不手抄（手抄＝第二份真相，必然漂移；`ai-concierge.js:18-19` 記錄的「指向不存在 UI 的過期指路」
 *   就是漂移的活體樣本）。
 *
 * 【誰擁有規則誰負責解釋】說明條目由**擁有該規則的模組自己註冊**（`fair` 註冊公平性、`sla` 註冊提領、
 *   `rg` 註冊負責任博弈、`edge` 註冊莊家優勢、`progress` 註冊紅利流水），比照 `HL.dock` / `HL.promoCal`
 *   / `HL.achievements` 的資料驅動註冊表家族。新增一條說明＝在自己的檔案裡加一筆 `register`，
 *   **不必改本檔的 render**。
 *
 * spec 欄位（`id`/`title` 必填，其餘可選）：
 *   { id, cat, title,                 // 身分與分群（cat 見 CATS，未知 cat 併入「其他」）
 *     body,                           // 說明內文：字串，或 **函式**（每次開面板/搜尋時求值＝讀活值）
 *     keys[],                         // 搜尋關鍵詞（除 title/body 外的額外命中詞，如英文/簡體）
 *     order,                          // 同群排序（小的在前，預設 100）
 *     when,                           // 選用述詞：回 false ⇒ **面板與搜尋兩處都不出現**（見不變量 b）
 *     action: { label, run } }        // 選用「前往」鈕（通常是開該規則自己的面板）
 *
 * ⚠️ `when()` 的語義是「這條說明現在不適用」（例：Demo 站才適用的儲值說明），
 *   **不是**「隱藏起來但搜得到」——只藏其一等於沒藏，故 `visible()` 是面板與搜尋的**唯一**入口。
 *
 * 註冊於 window.HL.support = { register, list, cats, search, open, ids, describe, ... }。
 * node 可 require（純邏輯區無 DOM 相依），供 tests/checks-platform.js 取用同一份實作。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純函式區（node 可 require · 無 DOM 相依）=====================

  // 分群次序＝面板由上而下的顯示序（未列的 cat 併入 other）
  var CATS = [
    { key: "rules", label: "玩法與規則" },
    { key: "fairness", label: "公平性" },
    { key: "payment", label: "儲值與提款" },
    { key: "bonus", label: "紅利與獎勵" },
    { key: "account", label: "帳戶與責任博弈" },
    { key: "other", label: "其他" }
  ];
  function catKeys() { return CATS.map(function (c) { return c.key; }); }
  function catLabel(k) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].key === k) return CATS[i].label;
    return "其他";
  }
  function normCat(k) { return catKeys().indexOf(k) >= 0 ? k : "other"; }

  var SPECS = {};   // id → spec
  var ORDER = [];   // 註冊先後（同 order 時的穩定序）

  function register(spec) {
    if (!spec || !spec.id || !spec.title) return API;   // 缺身分＝忽略，不當機
    if (!SPECS[spec.id]) ORDER.push(spec.id);
    SPECS[spec.id] = spec;
    return API;                                          // 可鏈式（比照 HL.dock）
  }
  function ids() { return ORDER.slice(); }

  /* body 可以是字串或函式；函式**每次求值**＝說明永遠讀該模組的當下真值（不快取、不手抄）。
   * 求值丟例外時退回空字串＝某一條說明壞掉不會讓整個面板炸掉（同 #90 不變量 c 的精神）。 */
  function bodyOf(spec) {
    try {
      var b = typeof spec.body === "function" ? spec.body() : spec.body;
      return b == null ? "" : String(b);
    } catch (e) { return ""; }
  }

  /* `when()` 的唯一求值出口。**面板與搜尋都只能經由這裡取條目**，否則會出現
   * 「面板藏了但搜尋搜得到」＝只藏其一等於沒藏。未宣告 when ＝恆真。
   * when() 丟例外時**視為不顯示**（保守：述詞壞掉時寧可少顯示，不要顯示不該顯示的） */
  function visible(spec) {
    if (!spec) return false;
    if (typeof spec.when !== "function") return true;
    try { return !!spec.when(); } catch (e) { return false; }
  }

  function entryOf(spec) {
    return {
      id: spec.id, cat: normCat(spec.cat), title: spec.title,
      body: bodyOf(spec), order: spec.order == null ? 100 : spec.order,
      hasAction: !!(spec.action && typeof spec.action.run === "function"),
      actionLabel: (spec.action && spec.action.label) || null
    };
  }

  // 全部「當下可見」的條目（依 cat 次序 → order → 註冊序）
  function all() {
    var out = [];
    ORDER.forEach(function (id, i) {
      var s = SPECS[id];
      if (!visible(s)) return;
      var e = entryOf(s); e._seq = i; out.push(e);
    });
    var ck = catKeys();
    out.sort(function (a, b) {
      return (ck.indexOf(a.cat) - ck.indexOf(b.cat)) || (a.order - b.order) || (a._seq - b._seq);
    });
    return out.map(function (e) { delete e._seq; return e; });
  }

  function list(cat) {
    var a = all();
    return cat == null ? a : a.filter(function (e) { return e.cat === normCat(cat); });
  }

  // 目前有可見條目的分群（空群不佔位＝避免入口擠壓，同 #93/#94 設計原則）
  function cats() {
    var seen = {};
    all().forEach(function (e) { seen[e.cat] = true; });
    return catKeys().filter(function (k) { return seen[k]; })
                    .map(function (k) { return { key: k, label: catLabel(k) }; });
  }

  /* 搜尋：比對 title / body / keys。**經由同一個 all()** ⇒ when() 為 false 者搜不到。
   * 空字串＝回全部（面板初始態）。 */
  function search(q) {
    var s = String(q == null ? "" : q).trim().toLowerCase();
    if (!s) return all();
    return all().filter(function (e) {
      var spec = SPECS[e.id];
      var hay = (e.title + " " + e.body + " " + ((spec && spec.keys) || []).join(" ")).toLowerCase();
      return hay.indexOf(s) >= 0;
    });
  }

  /* 唯讀自我描述（比照 #90 家族：回傳純值副本，改它不會改到登錄表） */
  function describe() {
    return ORDER.map(function (id) {
      var s = SPECS[id];
      return { id: s.id, cat: normCat(s.cat), title: s.title, order: s.order == null ? 100 : s.order,
               conditional: typeof s.when === "function", visible: visible(s) };
    });
  }

  var API = {
    CATS: CATS, catLabel: catLabel, normCat: normCat,
    register: register, ids: ids, list: list, cats: cats, search: search,
    describe: describe, visible: visible, bodyOf: bodyOf,
    _specs: function (id) { return SPECS[id]; },
    _reset: function () { SPECS = {}; ORDER = []; return API; }   // 測項用（瀏覽器端不呼叫）
  };

  if (isNode) { module.exports = API; return; }

  // ===================== 以下為瀏覽器區 =====================
  var el = HL.dom.el;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }

  function rowOf(e) {
    var spec = SPECS[e.id];
    var kids = [
      el("h4", { class: "ax-help__q", text: e.title }),
      el("p", { class: "ax-help__a", text: e.body })
    ];
    if (e.hasAction) {
      kids.push(el("button", {
        class: "ax-btn-ghost ax-help__go", text: e.actionLabel || t("前往", "前往"),
        onClick: function () { try { spec.action.run(); } catch (_) {} }
      }));
    }
    return el("div", { class: "ax-help__item" }, kids);
  }

  function renderInto(box, q) {
    HL.dom.clear(box);
    var rows = search(q);
    if (!rows.length) {
      // 空狀態（含「一條都沒註冊」）＝面板照樣開得起來，不整頁壞掉
      box.appendChild(el("p", { class: "ax-help__empty", text: t("找不到相關說明", "找不到相關說明") }));
      return;
    }
    var byCat = {};
    rows.forEach(function (e) { (byCat[e.cat] = byCat[e.cat] || []).push(e); });
    catKeys().forEach(function (ck) {
      if (!byCat[ck]) return;
      box.appendChild(el("h5", { class: "ax-help__cat", text: catLabel(ck) }));
      byCat[ck].forEach(function (e) { box.appendChild(rowOf(e)); });
    });
  }

  function open() {
    var box = el("div", { class: "ax-help__list" });
    var input = el("input", {
      type: "search", class: "ax-help__search",
      placeholder: t("搜尋說明…", "搜尋說明…"), "aria-label": t("搜尋說明…", "搜尋說明…")
    });
    input.addEventListener("input", function () { renderInto(box, input.value); });
    renderInto(box, "");
    return HL.ui.modal(t("說明中心", "說明中心"), [
      el("p", { class: "ax-help__hint", text: t("這裡的數字都是即時讀取平台當下設定值。", "這裡的數字都是即時讀取平台當下設定值。") }),
      input, box
    ], { wide: true });
  }

  API.open = open;
  HL.support = API;
})(typeof window !== "undefined" ? window : globalThis);

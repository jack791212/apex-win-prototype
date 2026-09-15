/* Apex Win｜延遲載入 slot 的「賠付表／玩法說明」單一容器（G5③；7 款延遲 slot 原本一個都沒有）。
 * 瀏覽器＝掛 HL.slotPaytable 供延遲載入的 slot view 取用；node＝原樣 module.exports（純函式可直接驗）。
 * ⚠️ 本檔**不在首屏**（不在 index.html）：由 lazy-games 清單的 `dep` 帶著走，只有玩家真的開該款 slot 才下載
 *   （同 core/table-tier.js 的形制；立卡當下首屏餘裕只剩 1,227B，eager 放法一支就吃光）。
 *
 * 契約（容器不認得任何一款遊戲）：
 *   - 容器只認得 spec 的**形狀**，不認得任何遊戲 id、任何一個賠率數字、任何一條規則。
 *     加一款＝那支 view 自己 register 一個 spec 建構式並掛上按鈕，本檔一行不改。
 *   - spec 建構式**必須是函式**（開啟當下才求值）：賠付若隨等級/模式變動，玩家看到的就是當下那一份。
 *   - ⭐ **賠率數字一律由該款自己的純數學常數求值，禁止在 spec 裡重打一遍**。
 *     這是本專案反覆踩到的「第二份真相」：賠付表改了只會去改數學區，沒人會想到回來改說明面。
 *     由鎖 games/slot-paytable-numbers-are-derived 用**活見證者**守著（擾動該款的賠付常數 ⇒
 *     顯示出來的數字必須跟著變；重打一遍的那一款會當場紅）。
 *   - 登記簿（register/specOf/ids）存在的理由不只是查表：**它讓 spec 在不 render 的情況下也拿得到**，
 *     否則那條鎖只能掃字串，而掃字串正好擋不住「數字是自己打的」這件事。
 *   - RTP 不由 spec 提供：容器自己向 HL.gameRtp（#98 的單一真相）求值，spec 連 id 都不必帶。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ── 純函式區（無 DOM；node 可直接驗）────────────────────────────────────────
  /* 約 3 位有效數字。賠率是「校準鈕 × 設計比例」的乘積 ⇒ 幾乎都是長小數：
   * 逐位照印不可讀，而無條件兩位小數會把 0.0334 這種小值壓成 0.03（失真一個數量級）。
   * 各款 spec 需在 intro/notes 註明顯示值為四捨五入——畫面值是近似，結算值才是實付。 */
  function fmtX(x) {
    var a = Math.abs(x), d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.1 ? 3 : 4;
    var p = Math.pow(10, d);
    return String(Math.round(x * p) / p);
  }
  // 「n 連　x倍率」。x 為 0/undefined ⇒ 該連線數不賠，回 null（呼叫端過濾掉）。
  function payText(n, x) { return x ? (n + "　x" + fmtX(x)) : null; }
  // 把 [,,,a,b,c]（index = 連線數）轉成由高到低的字串陣列；scale 缺省 1。
  function linePays(row, scale) {
    var out = [], n;
    if (!row) return out;
    for (n = row.length - 1; n >= 0; n--) {
      var t = payText(n, row[n] == null ? 0 : row[n] * (scale == null ? 1 : scale));
      if (t) out.push(t);
    }
    return out;
  }

  // ── 登記簿 ────────────────────────────────────────────────────────────────
  var SPECS = {};
  function register(id, build) {
    if (!id || typeof build !== "function") throw new Error("slotPaytable.register 需要 (id, 建構函式)");
    SPECS[id] = build;
  }
  function specOf(id) { return SPECS[id] || null; }
  function ids() { var a = [], k; for (k in SPECS) if (SPECS.hasOwnProperty(k)) a.push(k); return a; }

  var API = {
    fmtX: fmtX, payText: payText, linePays: linePays,
    register: register, specOf: specOf, ids: ids,
    open: open, button: button, titleRow: titleRow
  };

  HL.slotPaytable = API;   // 缺它＝view 載入即 throw＝失敗可見，不會靜默退化成「按鈕悄悄不見」
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  // ── 表面（DOM）──────────────────────────────────────────────────────────────
  function el() { return HL.dom.el.apply(null, arguments); }
  // ic 可為字串（emoji/文字）或 DOM 節點（各款自己的符號元件）⇒ 容器不需要認得任何一款的美術。
  function icNode(ic) {
    if (ic == null) return el("span", { text: "?" });
    return typeof ic === "object" && ic.nodeType ? ic : el("span", { class: "ax-sym", text: String(ic) });
  }

  function open(id) {
    var build = SPECS[id];
    if (!build) return;                                          // fail-closed：沒登記就不開
    var s = build();
    if (!s || !s.rows || !s.rows.length) return;                 // fail-closed：不開空表
    var rows = s.rows.map(function (r) {
      var pays = (r.pays || []).filter(function (p) { return p != null && p !== ""; });
      return el("div", { class: "ax-pt__row" }, [
        el("div", { class: "ax-pt__ic" }, [icNode(r.ic)]),
        el("div", { class: "ax-pt__pays" }, pays.map(function (p) { return el("span", { text: p }); }))
      ]);
    });
    var body = [];
    if (s.intro) body.push(el("p", { class: "ax-muted", text: s.intro }));
    body.push(el("div", { class: "ax-pt" }, rows));
    if (s.notes && s.notes.length) {
      body.push(el("div", { class: "ax-panel" }, s.notes.map(function (n) { return el("p", { class: "ax-muted", text: n }); })));
    }
    // RTP 只有一個來源＝HL.gameRtp（#98 的單一真相）⇒ spec 刻意無從提供它，想寫也寫不進來。
    var bar = { fair: "一注一種子·可驗證" };
    if (HL.gameRtp) {
      var r = HL.gameRtp.of(id); if (r != null) bar.rtp = r;
      var e = HL.gameRtp.edgeOf ? HL.gameRtp.edgeOf(id) : null; if (e != null) bar.edge = e;
    }
    body.push(HL.ui.gameInfoBar(bar));
    HL.ui.modal("賠付表 · " + (s.title || ""), body, { wide: true });
  }

  function button(id) {
    return el("button", { class: "ax-slot__info", type: "button", title: "賠付表", text: "ℹ 賠付表", onClick: function () { open(id); } });
  }
  /* 頂列：把該款既有的標題節點原樣收進來（不改它的 class ⇒ 標題視覺逐位不變），按鈕靠右。
   * ⚠️ **登記刻意發生在這裡（render 內），不在模組頂層**：各 slot view 都是延遲載入的，
   *   模組頂層的 `HL.<別人>.register(` 會被 `platform/fsdeps-boot-registration-guard` ⑤ 判為
   *   「開機出站註冊被延後 ⇒ 那一格永遠是空的」。本容器不適用那個危險（登記簿與它唯一的消費者
   *   〔同一次 render 生出來的按鈕〕在**同一個延遲載入單元**內，由 manifest 的 `dep` 一起到達），
   *   但與其去放寬那條守則的判準，不如讓登記真的不在開機路徑上——這樣兩邊都不必讓步。 */
  function titleRow(titleNode, id, build) {
    if (build) register(id, build);
    var b = button(id); b.style.marginLeft = "auto";
    return el("div", { class: "ax-slot__top" }, [titleNode, b]);
  }
})(typeof window !== "undefined" ? window : globalThis);

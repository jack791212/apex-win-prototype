/*
 * Apex Win｜報表/匯出定義註冊表 HL.reports（自我進化引擎 #109）
 * ─────────────────────────────────────────────────────────────────────
 * 為什麼要有（台帳連四輪 partial 的那個缺口）：
 *   `intel/db/platform-modules.json`「後台／報表與匯出」自 08-05 起連四輪判 partial，理由每輪同一句：
 *   **全站唯一的真匯出出口只有注單一種，加一張報表＝改程式**。08-19 的機械複驗把它釘死：
 *   naive grep `csv|CSV|Blob|download` 命中 5 檔／36 行，逐筆確認**只有 `core/betlog.js` 是真出口**
 *   （`new Blob` + `createObjectURL` + `<a download>`），其餘皆為註解或 i18n 譯文
 *   （⚠️ 命中檔數 4→5 是 #100 拆 i18n 造成的**量測假上升**，不是第二個出口）。
 *
 * 形制（容器先於內容 · 沿 #51 已證可行的欄位描述子）：
 *   `register({ id, cat, aud, name, icon, cols, rows(f), avail(), file })`
 *   —— `cols` 即 #51 `betlog.COLS` 那套描述子（`label` 餵表頭／`cell` 餵明細／`csv`+`raw` 餵 CSV，
 *   三處由同一份定義生成）⇒ **新增一張報表＝加一筆註冊，中心頁與匯出程式一行不改**。
 *
 * 【`cat` 與 `aud` 是兩個欄位，這是本卡刻意的設計，不是冗餘】
 *   卡上先抄進去的阻塞事實：`HL.ledger`／`opsBoard` 的彙總是**莊家視角**資料，真站含真實金流語意
 *   ⇒ 報表中心若對玩家開放，必須分「玩家可見／營運可見」兩類，而**不能讓一個 `cat` 同時承載
 *   「分類」與「權限」**（那是把授權寫進顯示層，日後很難拆）。故：
 *     · `cat` ＝**純分群**（中心頁怎麼排），改它永遠不影響誰看得到；
 *     · `aud` ＝**受眾**（`player`｜`ops`），是唯一的閘。**必須明寫**，沒寫或寫錯值＝拒絕註冊
 *       （不給預設值：預設 player 會讓忘記標的營運報表洩漏，預設 ops 會讓玩家報表靜默消失，
 *        兩種靜默都比「註冊失敗」難發現）。
 *   閘同時管**顯示與匯出**（`download()` 自己再驗一次）——只擋顯示的閘等於沒擋，因為 CSV 才是資料本體。
 *
 * 【唯一的檔案匯出出口】
 *   `saveText()` 是全站唯一的 `new Blob` + `<a download>`（#51 betlog 那份已遷移進來、原地刪除，
 *   不是再寫一份）。常駐鎖 `platform/reports-single-export-out` 盯住「全 src 只有本檔一處」，
 *   否則下一次有人想匯出東西時又會長出第二個出口，而台帳那句「唯一真出口」會再次成立。
 *
 * 【第二批註冊者＝事件 schema（依 #95/#72 前例併進本卡，不另開雙胞胎卡）】
 *   `defineEvent({ id, name, src, fields })` + `events()`：台帳「資料/分析」模組要的東西。
 *   `grep eventSchema|funnel|cohort|retentionCohort` 於 `prototype/src` 連三輪 0 命中＝產品側分析
 *   完全從零；但 #59 之後「時間維度」已真的存在（`wageredSince/xpSince/betsSince` 任意窗長、
 *   日桶保留 90 天）⇒ 缺的是**定義與出口**、不是資料。`fields` 允許給函式 ⇒ 型別枚舉當場向
 *   `HL.ledger.TYPES`／`HL.betlog.COLS` 求值，**不手抄任何一份清單**（沿 #90 econCfg 的形制）。
 *
 * 雙環境契約（比照 #50 edge／#51 betlog／#89 wagerScope）：純函式區（CSV 生成器 + 註冊表工廠 +
 *   受眾閘）以 `module.exports` 暴露供 node 直接 require ⇒ `prototype/tests/run.js` 驗的即瀏覽器
 *   跑的同一份，不會重蹈「一次性 node -e 驗完就消失」（#53 的立卡理由）。
 * 註冊於 window.HL.reports = { register, list, get, cats, rowsOf, csvOf, download, open, defineEvent, events, ... }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  var PREVIEW_ROWS = 200;          // 中心頁只畫前 N 列（匯出一律全量，頁尾明示）
  var AUDS = ["player", "ops"];    // 受眾值域（唯一的閘；`cat` 不參與授權）

  // ===================== 純函式區（node 可 require · 無 DOM 相依）=====================

  // CSV 跳脫與生成：規則與 #51 betlog._csvOf 逐位相同（那份是綁死 COLS 的特化版，
  //   這份把 cols 變成參數＝通用版；測項 reports/csv-matches-betlog 證明兩者輸出相等）。
  var NEEDS_QUOTE = /[",\n]/;
  function _esc(v) {
    var s = v == null ? "" : String(v);
    return NEEDS_QUOTE.test(s) ? '"' + s.split('"').join('""') + '"' : s;
  }
  function _csvOf(cols, rows) {
    cols = cols || [];
    var head = cols.map(function (c) { return c.csv; }).join(",");
    var body = (rows || []).map(function (r) {
      return cols.map(function (c) { return _esc(c.raw ? c.raw(r) : r[c.key]); }).join(",");
    });
    return [head].concat(body).join("\n");
  }

  /* 受眾閘（純謂詞·唯一的授權判斷）。
     ctx = { ops: true } 才看得到 aud:"ops"；不給 ctx ＝ 玩家視角（**預設拒絕**營運報表）。
     ⚠️ 本函式**刻意不讀 def.cat**——這就是「分類不得承載權限」在程式上的落點，
        測項 reports/cat-is-not-permission 用「cat:'ops' 但 aud:'player'」與其反例把它釘死。 */
  function visible(def, ctx) {
    if (!def) return false;
    if (def.aud === "ops" && !(ctx && ctx.ops)) return false;
    if (!(ctx && ctx.all) && typeof def.avail === "function" && !def.avail()) return false;
    return true;
  }

  /* 註冊表工廠：**本身零內建報表**（容器先於內容；測項 reports/container-empty 盯著）。
     回傳的物件即 HL.reports 的純資料半部，瀏覽器區再補 open/download 等 DOM 出口。 */
  function makeRegistry() {
    var defs = {}, order = [], evs = {}, evOrder = [];

    function register(def) {
      if (!def || !def.id) return null;
      if (defs[def.id]) return null;                              // 不得覆蓋＝不會出現兩份真相
      if (AUDS.indexOf(def.aud) < 0) return null;                 // 受眾必須明寫（見檔頭）
      if (!def.cols || !def.cols.length) return null;             // 空殼描述子拒收
      if (typeof def.rows !== "function") return null;
      if (!def.cat) def.cat = "other";
      if (!def.name) def.name = def.id;
      if (!def.file) def.file = "apexwin-" + def.id + ".csv";
      defs[def.id] = def; order.push(def.id);
      return def;
    }

    function get(id) { return defs[id] || null; }
    function ids() { return order.slice(); }
    function list(ctx) {
      return order.map(function (id) { return defs[id]; }).filter(function (d) { return visible(d, ctx); });
    }
    /* 分群（註冊序）：回傳 [{ cat, items:[def] }]，中心頁照這個順序畫。
       cat 只影響這裡的排列，不影響上面 list 的過濾＝分類與權限的分離在結構上看得見。 */
    function cats(ctx) {
      var seen = {}, out = [];
      list(ctx).forEach(function (d) {
        if (!seen[d.cat]) { seen[d.cat] = { cat: d.cat, items: [] }; out.push(seen[d.cat]); }
        seen[d.cat].items.push(d);
      });
      return out;
    }

    // 取列：閘不通過一律回空陣列（不是「回全部」也不是丟例外）
    function rowsOf(id, f, ctx) {
      var d = get(id);
      if (!d || !visible(d, ctx)) return [];
      try { return d.rows(f || {}) || []; } catch (e) { return []; }
    }
    // 取 CSV：閘不通過時連表頭都不給（否則欄位名本身就是一種洩漏）
    function csvOf(id, f, ctx) {
      var d = get(id);
      if (!d || !visible(d, ctx)) return "";
      return _csvOf(d.cols, rowsOf(id, f, ctx));
    }

    // ---- 事件 schema（第二批註冊者）----
    function defineEvent(spec) {
      if (!spec || !spec.id || evs[spec.id]) return null;
      if (!spec.fields) return null;
      evs[spec.id] = spec; evOrder.push(spec.id);
      return spec;
    }
    // fields 允許是函式 ⇒ 枚舉/欄位清單當場求值，不手抄（見檔頭）
    function events() {
      return evOrder.map(function (id) {
        var e = evs[id], f = e.fields;
        return {
          id: e.id, name: e.name || e.id, src: e.src || "",
          fields: (typeof f === "function" ? (f() || []) : f) || []
        };
      });
    }

    return {
      register: register, get: get, ids: ids, list: list, cats: cats,
      rowsOf: rowsOf, csvOf: csvOf, visible: visible,
      defineEvent: defineEvent, events: events,
      AUDS: AUDS, PREVIEW_ROWS: PREVIEW_ROWS, _csvOf: _csvOf, _esc: _esc
    };
  }

  // 通用「項目／數值」兩欄描述子（快照型報表共用：進度快照、營運彙總、事件 schema）
  function kvCols(itemLabel, valueLabel) {
    return [
      { key: "k", label: itemLabel || "項目", csv: "item",  cell: function (r) { return r.k; }, raw: function (r) { return r.k; } },
      { key: "v", label: valueLabel || "數值", csv: "value", cell: function (r) { return r.v; }, raw: function (r) { return r.v; } }
    ];
  }

  var CORE = { makeRegistry: makeRegistry, visible: visible, kvCols: kvCols, _csvOf: _csvOf, _esc: _esc, AUDS: AUDS };

  // ===================== 測項（雙環境同一份定義）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    function fixture() {
      var R = makeRegistry();
      R.register({ id: "p1", cat: "play", aud: "player", name: "玩家報表",
                   cols: kvCols(), rows: function () { return [{ k: "a", v: 1 }]; } });
      R.register({ id: "o1", cat: "ops", aud: "ops", name: "營運報表",
                   cols: kvCols(), rows: function () { return [{ k: "ggr", v: 999 }]; } });
      return R;
    }

    st.register({
      id: "reports/container-empty", group: "reports", tier: "fast",
      title: "容器先於內容：註冊表本身不得內建任何報表，且拒收空殼描述子",
      run: function (t) {
        var R = makeRegistry();
        t.equal(R.ids().length, 0, "容器不得自帶報表");
        t.equal(R.list({ ops: true, all: true }).length, 0, "空容器不得長出任何一列");
        t.equal(R.register({ id: "x", aud: "player", cols: kvCols() }), null, "缺 rows() 應拒絕");
        t.equal(R.register({ id: "x", aud: "player", rows: function () { return []; } }), null, "缺 cols 應拒絕");
        t.equal(R.register({ id: "x", aud: "player", cols: [], rows: function () { return []; } }), null, "空 cols 應拒絕");
        t.equal(R.ids().length, 0, "被拒絕的註冊不得留下殘骸");
        t.ok(!!R.register({ id: "x", aud: "player", cols: kvCols(), rows: function () { return []; } }), "齊備者應收下");
        t.equal(R.register({ id: "x", aud: "ops", cols: kvCols(), rows: function () { return []; } }), null, "同 id 不得覆蓋（避免兩份真相）");
        t.equal(R.get("x").aud, "player", "被拒絕的覆蓋不得改動既有定義");
      }
    });

    st.register({
      id: "reports/aud-must-be-explicit", group: "reports", tier: "fast",
      title: "受眾必須明寫：沒寫或寫錯值一律拒絕註冊（不給預設值）",
      run: function (t) {
        var R = makeRegistry();
        var base = { cols: kvCols(), rows: function () { return []; } };
        t.equal(R.register({ id: "a", cat: "play", cols: base.cols, rows: base.rows }), null, "未寫 aud 應拒絕");
        t.equal(R.register({ id: "b", aud: "admin", cols: base.cols, rows: base.rows }), null, "aud 值不在值域應拒絕");
        t.equal(R.register({ id: "c", aud: "", cols: base.cols, rows: base.rows }), null, "空字串 aud 應拒絕");
        t.equal(R.ids().length, 0, "以上三筆都不該進表");
        t.equal(AUDS.join(","), "player,ops", "受眾值域應恰為 player,ops");
      }
    });

    st.register({
      id: "reports/cat-is-not-permission", group: "reports", tier: "fast",
      title: "分類不得承載權限：cat 換值不改變誰看得到，aud 才是唯一的閘（#109 卡上的紅線）",
      run: function (t) {
        var R = makeRegistry();
        // 陷阱形狀：cat 叫 "ops" 但受眾是玩家 ⇒ 玩家必須看得到（若閘讀 cat 就會誤擋）
        R.register({ id: "trap", cat: "ops", aud: "player", cols: kvCols(), rows: function () { return []; } });
        // 反例：cat 叫 "play" 但受眾是營運 ⇒ 玩家必須看不到（若閘讀 cat 就會誤放）
        R.register({ id: "anti", cat: "play", aud: "ops", cols: kvCols(), rows: function () { return []; } });
        var asPlayer = R.list().map(function (d) { return d.id; });
        t.equal(asPlayer.join(","), "trap", "玩家視角應只看到 aud:player（不管 cat 叫什麼）");
        var asOps = R.list({ ops: true }).map(function (d) { return d.id; });
        t.equal(asOps.join(","), "trap,anti", "營運視角應兩張都看得到");
        // 直接把謂詞的原始碼釘住：讀 cat 就是把授權寫進顯示層
        t.equal(/\.cat\b/.test(String(visible)), false, "visible() 不得引用 def.cat");
      }
    });

    st.register({
      id: "reports/gate-covers-export", group: "reports", tier: "fast",
      title: "閘同時管顯示與匯出：擋不住 CSV 的閘等於沒擋（連表頭都不給）",
      run: function (t) {
        var R = fixture();
        t.equal(R.rowsOf("o1").length, 0, "玩家視角取營運報表的列應為空");
        t.equal(R.csvOf("o1"), "", "玩家視角取營運報表的 CSV 應為空字串（欄位名本身也是洩漏）");
        t.equal(R.rowsOf("o1", {}, { ops: true }).length, 1, "營運視角應取得列");
        t.ok(R.csvOf("o1", {}, { ops: true }).indexOf("ggr") > -1, "營運視角應取得 CSV 內容");
        t.equal(R.csvOf("nope", {}, { ops: true }), "", "不存在的 id 應回空字串而非拋錯");
        t.equal(R.rowsOf("p1").length, 1, "玩家報表在玩家視角應照常取得");
      }
    });

    st.register({
      id: "reports/csv-single-truth", group: "reports", tier: "fast",
      title: "CSV 由 cols 描述子單一真相生成（表頭＝csv 名／RFC4180 跳脫／空資料只有表頭）",
      run: function (t) {
        var cols = kvCols();
        var out = _csvOf(cols, [{ k: 'a,b"c', v: 1 }, { k: "x\ny", v: 2 }]);
        var lines = out.split("\n");
        t.equal(lines[0], "item,value", "表頭應等於 cols 的 csv 名");
        t.ok(lines[1].indexOf('"a,b""c"') > -1, "含逗號與引號應被 RFC4180 式跳脫");
        t.ok(out.indexOf('"x\ny"') > -1, "含換行的欄位應被引號包住");
        t.equal(_csvOf(cols, []).split("\n").length, 1, "空資料應只有表頭");
        t.equal(_csvOf(cols, [{ k: null, v: undefined }]).split("\n")[1], ",", "null/undefined 應輸出空欄而非字面 null");
      }
    });

    st.register({
      id: "reports/csv-matches-betlog", group: "reports", tier: "fast", env: "node",
      title: "通用 CSV 生成器與 #51 betlog 特化版逐位相等（遷移不得改變既有匯出內容）",
      run: function (t) {
        var bl = null;
        try { bl = require("./betlog.js"); } catch (e) {}
        t.ok(!!(bl && bl.COLS && bl._csvOf), "應能 require betlog 的純函式區");
        var rows = [
          { id: 7, ts: 0, game: 'a,b"c', bet: 100, win: 250, cs: "seed", ne: 42 },
          { id: 8, ts: 86400000, game: "", bet: 0, win: 500, cs: "", ne: null }
        ];
        t.equal(_csvOf(bl.COLS, rows), bl._csvOf(rows), "同一份 COLS + 同一批列 ⇒ 兩個生成器輸出必須逐字相同");
      }
    });

    st.register({
      id: "reports/event-schema-no-handcopy", group: "reports", tier: "fast",
      title: "事件 schema：fields 給函式時當場求值（枚舉不手抄）＋拒收無 fields 的空殼",
      run: function (t) {
        var R = makeRegistry();
        var live = ["deposit", "bet"];
        R.defineEvent({ id: "e1", name: "測試事件", src: "X.y()", fields: function () {
          return [{ k: "type", t: "enum", d: live.join("|") }];
        } });
        t.equal(R.events().length, 1, "應收下一筆");
        t.equal(R.events()[0].fields[0].d, "deposit|bet", "函式型 fields 應當場求值");
        live.push("win");
        t.equal(R.events()[0].fields[0].d, "deposit|bet|win", "上游清單變動時 schema 應跟著變（＝沒有手抄的第二份）");
        t.equal(R.defineEvent({ id: "e2", name: "沒欄位" }), null, "無 fields 應拒絕");
        t.equal(R.defineEvent({ id: "e1", fields: [] }), null, "同 id 不得覆蓋");
        t.equal(R.events().length, 1, "被拒絕者不得進表");
      }
    });

    st.register({
      id: "reports/rows-failure-is-empty", group: "reports", tier: "fast",
      title: "某張報表的 rows() 拋錯只讓那一張空白，不得炸掉整個中心頁",
      run: function (t) {
        var R = makeRegistry();
        R.register({ id: "bad", cat: "play", aud: "player", cols: kvCols(),
                     rows: function () { throw new Error("boom"); } });
        R.register({ id: "good", cat: "play", aud: "player", cols: kvCols(),
                     rows: function () { return [{ k: "ok", v: 1 }]; } });
        t.equal(R.rowsOf("bad").length, 0, "拋錯的報表應回空陣列");
        t.equal(R.csvOf("bad"), "item,value", "拋錯的報表仍應給得出表頭（空資料）");
        t.equal(R.rowsOf("good").length, 1, "同一輪其他報表不受影響");
        t.equal(R.list().length, 2, "清單本身不受某張報表壞掉影響");
      }
    });

    st.register({
      id: "reports/browser-registrants", group: "reports", tier: "fast", env: "browser",
      title: "瀏覽器端：首批註冊者到位、玩家視角看不到營運報表、betlog 走同一個出口",
      run: function (t) {
        var R = HL && HL.reports;
        t.ok(!!R, "HL.reports 應存在");
        t.ok(R.ids().length >= 5, "首批註冊者應至少 5 張（實得 " + R.ids().length + "）");
        t.ok(R.ids().indexOf("betlog") > -1, "betlog 應被遷移成註冊者（不是另寫一份匯出）");
        var pl = R.list().map(function (d) { return d.aud; });
        t.equal(pl.filter(function (a) { return a === "ops"; }).length, 0, "玩家視角不得出現營運報表");
        t.ok(R.list({ ops: true }).length > R.list().length, "營運視角應嚴格多於玩家視角");
        t.isFn(R.saveText, "檔案匯出原語應由本模組提供");
        t.equal(String(HL.betlog.csv({}) === R.csvOf("betlog")), "true", "注單報表的 CSV 應與 betlog.csv() 逐字相同");
        t.equal(R.events().length >= 4, true, "事件 schema 應至少 4 筆");
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
  function money(v) { return HL.dom.money(v); }

  var R = makeRegistry();

  /* 全站唯一的檔案匯出原語（#51 betlog 那份已遷移進來、原地刪除）。
     常駐鎖 platform/reports-single-export-out 盯著「全 src 只有這一處 new Blob」。 */
  /* #114：「匯出過報表」是本模組自己的事件維度，不在 achievements 的 8 欄終身統計裡（也不該塞進去）。
     旗標寫在**唯一的匯出原語**上而不是 download() 上 ⇒ 將來多一條匯出路徑（直呼 saveText 的）也算得到，
     不會出現「新出口不算成就」這種第二份真相。走 HL.dom.lsGet/lsSet ⇒ 自動吃站別命名空間（真假站各自一份）。 */
  var XKEY = "HL_RPT_EXPORTED";
  function everExported() { return !!HL.dom.lsGet(XKEY, 0); }
  function markExported() {
    if (everExported()) return;                       // 只寫一次；之後每次匯出都是純讀
    HL.dom.lsSet(XKEY, 1);
    /* 匯出不是下注事件 ⇒ 成就引擎不會被中央結算點喚起，必須主動 sync（比照 rewards.js 簽到後那一行）。
       排在 lsSet 之後是必要的：test 走 lsGet 讀存檔，先 sync 會讀到舊值＝與沒接線同形。 */
    if (HL.achievements && HL.achievements.sync) HL.achievements.sync();
  }

  function saveText(name, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var a = el("a", { href: url, download: name });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      markExported();
      return true;
    } catch (e) { return false; }
  }

  // 匯出：閘再驗一次（見檔頭）；回 false ＝ 沒有寫出任何檔案
  function download(id, f, ctx) {
    var d = R.get(id);
    if (!d || !R.visible(d, ctx)) return false;
    var text = R.csvOf(id, f, ctx);
    if (!text) return false;
    return saveText(d.file, text);
  }

  // ---------- 首批註冊者（全部是「有內容沒出口」的既有資料，本卡幾乎不產生新資料）----------

  // ① 注單／投注歷史（#51）：**遷移**既有 CSV 出口，cols 直接沿用該檔的 COLS（不抄第二份）
  R.register({
    id: "betlog", cat: "play", aud: "player", icon: "📜", name: "注單／投注歷史",
    file: "apexwin-betlog.csv",
    cols: (HL.betlog && HL.betlog.COLS) || [],
    rows: function (f) { return HL.betlog.list(f || {}); },
    avail: function () { return !!(HL.betlog && HL.betlog.list); }
  });

  /* ② 每日活躍（#59 日桶）：`HL.activity` 只公開視窗合計，沒有「逐日」出口 ⇒ 這裡用
     **相鄰視窗差分**還原逐日值（sumSince(i+1) − sumSince(i)＝第 i 天前那一桶），
     刻意不去改 activity.js 的公開介面（差分只用已文件化的 API、且零風險）。
     只列有活動的日子（90 天大多是 0，全列會讓匯出檔充滿零列）。 */
  function activityRows() {
    var a = HL.activity;
    if (!a) return [];
    var keep = 90, out = [], prevW = 0, prevX = 0, prevN = 0;
    var dayMs = 86400000, now = Date.now();
    for (var i = 0; i < keep; i++) {
      var d = i + 1;
      var W = a.wageredSince(d), X = a.xpSince(d), N = a.betsSince(d);
      var w = W - prevW, x = X - prevX, n = N - prevN;
      prevW = W; prevX = X; prevN = N;
      if (w === 0 && x === 0 && n === 0) continue;
      out.push({ ago: i, date: new Date(now - i * dayMs).toISOString().slice(0, 10), w: w, x: x, n: n });
    }
    return out;
  }
  R.register({
    id: "activity-daily", cat: "activity", aud: "player", icon: "🔥", name: "每日活躍（近 90 天）",
    cols: [
      { key: "date", label: "日期",   csv: "date",     cell: function (r) { return r.date; },   raw: function (r) { return r.date; } },
      { key: "ago",  label: "距今天數", csv: "days_ago", cell: function (r) { return String(r.ago); }, raw: function (r) { return r.ago; } },
      { key: "w",    label: "真實押注", csv: "wagered",  cell: function (r) { return money(r.w); }, raw: function (r) { return r.w; } },
      { key: "x",    label: "加權經驗", csv: "xp",       cell: function (r) { return String(Math.round(r.x)); }, raw: function (r) { return r.x; } },
      { key: "n",    label: "注數",    csv: "bets",     cell: function (r) { return String(r.n); }, raw: function (r) { return r.n; } }
    ],
    rows: function () { return activityRows(); },
    avail: function () { return !!(HL.activity && HL.activity.wageredSince); }
  });

  /* ③ 進度快照（VIP／任務／季票／返水／光環）：**當場向各模組求值**，一個數字都不手抄
     ⇒ 上游改門檻時本報表跟著改（沿 #90 econCfg 與 #72 說明中心的形制）。 */
  function progressRows() {
    var out = [];
    function push(k, v) { out.push({ k: k, v: v }); }
    if (HL.vip && HL.vip.status) {
      var v = HL.vip.status();
      push("VIP 段位", v.icon + " " + v.name + "（Lv " + v.level + " / " + v.maxLevel + "）");
      push("VIP 累積押注", money(v.wager));
      push("距下一段位", v.next ? money(v.toNext) : "已封頂");
      if (v.activity) push("活躍光環（近 " + v.activity.days + " 天）", v.activity.tier + " · 經驗 " + Math.round(v.activity.last30));
    }
    if (HL.season && HL.season.status) {
      var s = HL.season.status();
      push("賽季", s.icon + " " + s.name);
      push("賽季階級", s.tier + " / " + s.total + (s.prem ? "（已解鎖進階軌）" : ""));
      push("賽季剩餘天數", String(s.daysLeft));
      push("可領取獎勵", String(s.claimable));
    }
    if (HL.tasks && HL.tasks.list) {
      var done = 0, tl = HL.tasks.list();
      tl.forEach(function (x) { if (x.done) done++; });
      push("今日任務完成", done + " / " + tl.length);
    }
    if (HL.rakeback && HL.rakeback.pot) push("待領返水", money(HL.rakeback.pot()));
    if (HL.betlog && HL.betlog.count) push("已記錄注單", String(HL.betlog.count()) + " / " + HL.betlog.CAP);
    return out;
  }
  R.register({
    id: "progress", cat: "progress", aud: "player", icon: "🏅", name: "進度快照（VIP／賽季／任務）",
    cols: kvCols("項目", "數值"),
    rows: function () { return progressRows(); },
    avail: function () { return !!(HL.vip && HL.vip.status); }
  });

  /* ④ 營運彙總（`HL.ledger.derived()`）：**欄位由 derived() 當場列舉**，LABELS 只是顯示名，
     查不到名字就用原 key ⇒ 帳本日後新增欄位會**自動出現在報表**（不會靜默消失，見常駐測項）。 */
  var LEDGER_LABELS = {
    turnover: "總流水", payout: "總派彩", ggr: "GGR（毛收益）", rtp: "RTP", ngr: "NGR（淨收益）",
    bonus: "紅利發出", faucet: "水龍頭發出", bonusVoid: "紅利逾期回沖", promo: "送幣成本（淨）",
    deposit: "儲值", withdraw: "提款", cashNet: "淨現金流", shop: "商城消費",
    p2pOut: "站內轉出", p2pIn: "站內轉入", p2pNet: "站內移轉淨額",
    jpSeed: "JP 累積投入", jpHit: "JP 派出", jpNet: "JP 淨額",
    coins: "流通幣", players: "玩家數", betCount: "投注筆數", winCount: "派彩筆數",
    firstTs: "首筆時間", lastTs: "末筆時間"
  };
  var PCT_KEYS = { rtp: 1 };
  var TS_KEYS = { firstTs: 1, lastTs: 1 };
  function ledgerRows() {
    var d = (HL.ledger && HL.ledger.derived) ? HL.ledger.derived() : null;
    if (!d) return [];
    var out = [];
    Object.keys(d).forEach(function (k) {
      var v = d[k];
      if (PCT_KEYS[k]) v = (v * 100).toFixed(2) + "%";
      else if (TS_KEYS[k]) v = v ? new Date(v).toISOString() : "—";
      else if (typeof v === "number") v = String(Math.round(v * 100) / 100);
      out.push({ k: LEDGER_LABELS[k] || k, v: String(v) });
    });
    return out;
  }
  R.register({
    id: "ops-summary", cat: "ops", aud: "ops", icon: "📊", name: "營運彙總（GGR／NGR／RTP）",
    cols: kvCols("指標", "數值"),
    rows: function () { return ledgerRows(); },
    avail: function () { return !!(HL.ledger && HL.ledger.derived); }
  });

  // ⑤ 逐遊戲營運彙總（帳本 byGame）：真站含真實金流語意 ⇒ 與 ④ 同為 ops 受眾
  R.register({
    id: "ops-by-game", cat: "ops", aud: "ops", icon: "🎮", name: "逐遊戲營運彙總",
    cols: [
      { key: "game",  label: "遊戲",  csv: "game",  cell: function (r) { return r.game; }, raw: function (r) { return r.game; } },
      { key: "plays", label: "局數",  csv: "plays", cell: function (r) { return String(r.plays); }, raw: function (r) { return r.plays; } },
      { key: "bet",   label: "流水",  csv: "turnover", cell: function (r) { return money(r.bet); }, raw: function (r) { return r.bet; } },
      { key: "win",   label: "派彩",  csv: "payout",   cell: function (r) { return money(r.win); }, raw: function (r) { return r.win; } },
      { key: "ggr",   label: "GGR",  csv: "ggr",   cell: function (r) { return money(r.ggr); }, raw: function (r) { return r.ggr; } },
      { key: "rtp",   label: "RTP",  csv: "rtp",   cell: function (r) { return (r.rtp * 100).toFixed(2) + "%"; }, raw: function (r) { return r.rtp; } }
    ],
    rows: function () { return (HL.ledger && HL.ledger.byGame) ? HL.ledger.byGame() : []; },
    avail: function () { return !!(HL.ledger && HL.ledger.byGame); }
  });

  // ---------- 第二批註冊者：事件 schema（枚舉/欄位一律當場求值）----------
  R.defineEvent({
    id: "settle", name: "投注結算（全站中央點）", src: "HL.liveStats.record(game, bet, win)",
    fields: [
      { k: "game", t: "string", d: "遊戲 id（HL.games 的單一真相）" },
      { k: "bet",  t: "number", d: "本局押注（0 ＝ 只回報贏分的那一半）" },
      { k: "win",  t: "number", d: "本局贏分（0 ＝ 只回報押注的那一半）" }
    ]
  });
  R.defineEvent({
    id: "ledger.entry", name: "營運帳本分錄", src: "HL.ledger.record(type, amount, meta)",
    fields: function () {
      var types = (HL.ledger && HL.ledger.TYPES) ? HL.ledger.TYPES : [];
      return [
        { k: "type",   t: "enum",   d: (types.join ? types.join(" | ") : Object.keys(types).join(" | ")) },
        { k: "amount", t: "number", d: "金額（一律正值，方向由 type 決定）" },
        { k: "source", t: "string", d: "送幣來源（僅 bonus 型別帶）" }
      ];
    }
  });
  R.defineEvent({
    id: "betlog.row", name: "注單列（#51 環形緩衝）", src: "HL.betlog.record(game, bet, win)",
    fields: function () {
      return ((HL.betlog && HL.betlog.COLS) || []).map(function (c) {
        return { k: c.csv, t: "mixed", d: c.label };
      });
    }
  });
  R.defineEvent({
    id: "activity.day", name: "活躍日桶（#59 · 保留 90 天）", src: "HL.activity.record(real, xp)",
    fields: [
      { k: "date",    t: "date",   d: "日（環形桶鍵）" },
      { k: "wagered", t: "number", d: "真實押注（未經 edge 加權）" },
      { k: "xp",      t: "number", d: "edge 加權經驗（#50）" },
      { k: "bets",    t: "number", d: "注數" }
    ]
  });
  // 事件 schema 自己也要有出口（否則又是一張「有內容沒出口」的表）
  R.register({
    id: "event-schemas", cat: "meta", aud: "ops", icon: "🧬", name: "事件 schema 清單",
    cols: [
      { key: "ev",   label: "事件",  csv: "event", cell: function (r) { return r.ev; },   raw: function (r) { return r.ev; } },
      { key: "src",  label: "來源",  csv: "source", cell: function (r) { return r.src; }, raw: function (r) { return r.src; } },
      { key: "f",    label: "欄位",  csv: "field", cell: function (r) { return r.f; },    raw: function (r) { return r.f; } },
      { key: "ty",   label: "型別",  csv: "type",  cell: function (r) { return r.ty; },   raw: function (r) { return r.ty; } },
      { key: "d",    label: "說明",  csv: "desc",  cell: function (r) { return r.d; },    raw: function (r) { return r.d; } }
    ],
    rows: function () {
      var out = [];
      R.events().forEach(function (e) {
        e.fields.forEach(function (f) {
          out.push({ ev: e.name, src: e.src, f: f.k, ty: f.t, d: f.d });
        });
      });
      return out;
    }
  });

  // ---------- 中心頁（只做分群＋選擇＋匯出；一行都不認識任何一張報表）----------
  var CAT_LABELS = { play: "遊戲紀錄", activity: "活躍與時間", progress: "進度與獎勵", ops: "營運彙總", meta: "資料定義", other: "其他" };

  function open(opts) {
    opts = opts || {};
    var ctx = { ops: !!opts.ops };
    var groups = R.cats(ctx);
    var flat = R.list(ctx);
    if (!flat.length) { HL.ui.toast(t("目前沒有可用的報表", "目前沒有可用的報表"), "warn"); return; }

    var cur = (opts.id && R.get(opts.id) && R.visible(R.get(opts.id), ctx)) ? opts.id : flat[0].id;
    var host = el("div", { class: "ax-betlog" });     // 沿用 #51 已存在的表格樣式，零新 CSS
    var meta = el("div", {});

    function draw() {
      var def = R.get(cur);
      var rows = R.rowsOf(cur, {}, ctx);
      HL.dom.clear(host); HL.dom.clear(meta);

      meta.appendChild(HL.ui.kv(t("報表列數", "報表列數"), String(rows.length)));
      if (def.aud === "ops") {
        meta.appendChild(el("small", { class: "ax-muted" }, [
          el("span", { text: t("營運視角資料（莊家帳目），不對玩家開放。", "營運視角資料（莊家帳目），不對玩家開放。") })
        ]));
      }
      if (!rows.length) {
        host.appendChild(el("p", { class: "ax-muted" }, [
          el("span", { text: t("這張報表目前沒有資料。", "這張報表目前沒有資料。") })
        ]));
        return;
      }
      var head = el("tr", {}, def.cols.map(function (c) {
        return el("th", { class: "ax-muted" }, [el("span", { text: t(c.label, c.label) })]);
      }));
      var body = rows.slice(0, PREVIEW_ROWS).map(function (r) {
        return el("tr", {}, def.cols.map(function (c) {
          return el("td", { text: String(c.cell ? c.cell(r) : r[c.key]) });
        }));
      });
      host.appendChild(el("div", { class: "ax-betlog__scroll" }, [
        el("table", { class: "ax-betlog__t" }, [el("thead", {}, [head]), el("tbody", {}, body)])
      ]));
      if (rows.length > PREVIEW_ROWS) {
        host.appendChild(el("small", { class: "ax-muted" }, [
          el("span", { text: t("僅顯示前 200 列；匯出為全部資料。", "僅顯示前 200 列；匯出為全部資料。") })
        ]));
      }
    }

    // 報表選單：以 cat 分群（optgroup），選單本身不認識任何一張報表的內容
    var sel = el("select", { class: "ax-fair__in", "aria-label": t("選擇報表", "選擇報表") },
      groups.map(function (g) {
        return el("optgroup", { label: t(CAT_LABELS[g.cat] || g.cat, CAT_LABELS[g.cat] || g.cat) },
          g.items.map(function (d) {
            return el("option", { value: d.id, text: (d.icon ? d.icon + " " : "") + t(d.name, d.name) });
          }));
      }));
    sel.value = cur;
    sel.addEventListener("change", function () { cur = sel.value; draw(); });

    draw();

    HL.ui.modal(t("📊 報表中心", "📊 報表中心"), [
      el("div", { class: "ax-betlog__bar" }, [sel]),
      host,
      meta,
      el("div", { class: "ax-modal__actions" }, [
        el("button", { class: "ax-btn-primary", onClick: function () {
          var ok = download(cur, {}, ctx);
          HL.ui.toast(ok ? t("已匯出 CSV", "已匯出 CSV") : t("匯出失敗（瀏覽器不支援）", "匯出失敗（瀏覽器不支援）"), ok ? "ok" : "warn");
        } }, [el("span", { text: t("⬇ 匯出這張報表", "⬇ 匯出這張報表") })])
      ]),
      el("span", { class: "ax-demo-tag" }, [
        el("span", { text: t("純前端：報表由本機資料即時生成，依真假站分開；加一張報表＝加一筆註冊。", "純前端：報表由本機資料即時生成，依真假站分開；加一張報表＝加一筆註冊。") })
      ])
    ], { wide: true });
  }

  HL.reports = {
    register: R.register, get: R.get, ids: R.ids, list: R.list, cats: R.cats,
    rowsOf: R.rowsOf, csvOf: R.csvOf, visible: R.visible,
    defineEvent: R.defineEvent, events: R.events,
    download: download, saveText: saveText, open: open,
    AUDS: AUDS, PREVIEW_ROWS: PREVIEW_ROWS, kvCols: kvCols
  };

  /* ---- #114 成就徽章牆的外部註冊者 ----
   * `reward: 0`（§11）；`test` 型無進度條——「匯出過沒有」本來就沒有進度。
   * 這枚的用途不只是收集：它是把「你的資料你自己拿得走」推到玩家眼前的一個提示（#109 報表中心的導流）。 */
  if (HL.achievements && HL.achievements.register) {
    HL.achievements.register({
      id: "rpt-first-export", cat: "平台里程碑", icon: "📤",
      title: "留下紀錄", desc: "首次匯出任一報表",
      tier: "bronze", pts: 10, reward: 0,
      test: function () { return everExported(); }
    });
  }

  // 載入序脫鉤（#101）：排在前或後都註冊得到（HL._selftestQ 由 selftest.js 載入時清算）
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

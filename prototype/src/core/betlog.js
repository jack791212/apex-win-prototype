/*
 * Apex Win｜注單／投注歷史中心 HL.betlog（自我進化引擎 #51）
 *
 * 為什麼要有：ApexWin 先前**全站無任何逐局紀錄落地**——`HL.liveStats` 是工作階段記憶體統計
 *   （`fresh()` 每次歸零）、`HL.fair` 只在記憶體留最近 12 筆種子/nonce、app-shell「交易紀錄」
 *   只有 deposit/withdraw 不含遊戲局。⇒ 玩家無法回看昨天玩了什麼，且 **#16 可驗證公平實質半殘**：
 *   承諾雜湊能驗算，但「要驗哪一局」查不到（2026-07-31 平台軌審「可驗證公平」模組實證的缺口②）。
 *
 * 寫入點只有一處：中央結算點 `HL.liveStats.record(game, bet, win)` 尾端呼叫本檔 record。
 *   ⇒ **不動任何遊戲檔即全遊戲＋主播跟注通吃**（比照 #45/#46/#47/#55 的中央掛鉤範式）。
 *
 * ⚠️ 兩點誠實限制（面板頁尾亦明示，勿在文件裡假裝沒有）：
 *   1. **一局兩列**：slot/chicken 等把 bet 與 win 拆兩次回報中央點的遊戲，會落成兩筆紀錄
 *      （與 `challenges.js` 只吃「同局同時帶 bet+win」是同一個中央點特性）。
 *   2. **nonce 為「結算當下的下一注 nonce」＝該局最後一次取數的排他上界**，非該局起始 nonce。
 *      故僅對**確實採用 HL.fair 的遊戲**（`HL.fair.isPF`）提供驗算入口；其餘顯示「—」並停用按鈕，
 *      不對非可驗證公平的局偽造可驗證性。
 *
 * 擴充性：欄位為**資料描述子陣列 COLS**（加欄位＝加一筆定義，表頭／明細／CSV 三處同步生成）。
 *   環形緩衝上限 CAP 防 localStorage 膨脹；站別命名空間（HL.dom.lsGet/lsSet）→ demo/live 平行宇宙隔離。
 *
 * 雙環境契約（比照 12 款過保真閘遊戲）：純資料/純函式區（COLS/_push/_csvOf）以 `module.exports`
 *   暴露供 node 直接 require ⇒ **`prototype/tests/run.js` 驗的即瀏覽器跑的同一份**，
 *   不會重蹈「一次性 node -e 驗完就消失、沒有東西會再跑它」（#53 的立卡理由）。
 * 註冊於 window.HL.betlog = { record, list, games, count, csv, clear, open, ... }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  var CAP = 500;                     // 環形緩衝上限（超過丟最舊）

  // ===================== 純函式區（node 可 require · 無 DOM 相依）=====================
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function tsShort(ms) {
    var d = new Date(ms);
    return pad2(d.getMonth() + 1) + "/" + pad2(d.getDate()) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  }
  function multOf(r) { return r.bet > 0 ? r.win / r.bet : null; }
  // cell 只在瀏覽器被呼叫；此處延遲取用 HL.dom.money，讓 COLS 本身保持可在 node 載入
  function fmtMoney(v) { return (HL && HL.dom && HL.dom.money) ? HL.dom.money(v) : String(v); }

  // 欄位資料描述子：表頭／明細／CSV 單一真相（加欄位＝加一筆）
  var COLS = [
    { key: "id",    label: "編號",      csv: "bet_id",      cell: function (r) { return "#" + r.id; },                                              raw: function (r) { return r.id; } },
    { key: "ts",    label: "時間",      csv: "time_iso",    cell: function (r) { return tsShort(r.ts); },                                           raw: function (r) { return new Date(r.ts).toISOString(); } },
    { key: "game",  label: "遊戲",      csv: "game",        cell: function (r) { return r.game || "—"; },                                           raw: function (r) { return r.game || ""; } },
    { key: "bet",   label: "押注",      csv: "bet",         cell: function (r) { return r.bet > 0 ? fmtMoney(r.bet) : "—"; },                       raw: function (r) { return r.bet; } },
    { key: "win",   label: "贏分",      csv: "win",         cell: function (r) { return r.win > 0 ? fmtMoney(r.win) : "—"; },                       raw: function (r) { return r.win; } },
    { key: "mult",  label: "倍數",      csv: "multiplier",  cell: function (r) { var m = multOf(r); return m == null ? "—" : m.toFixed(2) + "×"; }, raw: function (r) { var m = multOf(r); return m == null ? "" : m.toFixed(4); } },
    { key: "net",   label: "淨額",      csv: "net",         cell: function (r) { return fmtMoney(r.win - r.bet); },                                 raw: function (r) { return r.win - r.bet; } },
    { key: "cs",    label: "客戶端種子", csv: "client_seed", cell: function (r) { return r.cs ? r.cs.slice(0, 10) + "…" : "—"; },                    raw: function (r) { return r.cs || ""; } },
    { key: "nonce", label: "nonce",     csv: "nonce_end",   cell: function (r) { return r.ne == null ? "—" : String(r.ne); },                       raw: function (r) { return r.ne == null ? "" : r.ne; } }
  ];

  // 環形插入：最新在前，超過 cap 丟最舊。回傳新陣列（不就地改參數）。
  function _push(rows, row, cap) {
    var out = [row].concat(rows || []);
    if (out.length > cap) out.length = cap;
    return out;
  }
  var NEEDS_QUOTE = /[",\n]/;
  function _esc(v) {
    var s = v == null ? "" : String(v);
    return NEEDS_QUOTE.test(s) ? '"' + s.split('"').join('""') + '"' : s;
  }
  function _csvOf(rows) {
    var head = COLS.map(function (c) { return c.csv; }).join(",");
    var body = (rows || []).map(function (r) {
      return COLS.map(function (c) { return _esc(c.raw(r)); }).join(",");
    });
    return [head].concat(body).join("\n");
  }

  var CORE = { COLS: COLS, CAP: CAP, _push: _push, _csvOf: _csvOf, _esc: _esc };

  // ===================== 測項（雙環境同一份定義）=====================
  function registerTests(st) {
    if (!st || !st.register) return;
    st.register({
      id: "betlog/ring-cap", group: "betlog", title: "環形緩衝上限與新舊順序",
      run: function (t) {
        var rows = [];
        for (var i = 1; i <= CAP + 25; i++) rows = _push(rows, { id: i, ts: 0, bet: 1, win: 0 }, CAP);
        t.equal(rows.length, CAP, "長度應被夾在 CAP");
        t.equal(rows[0].id, CAP + 25, "最新在最前");
        t.equal(rows[CAP - 1].id, 26, "最舊者應已被丟棄");
      }
    });
    st.register({
      id: "betlog/csv-shape", group: "betlog", title: "CSV 表頭與跳脫由 COLS 單一真相生成",
      run: function (t) {
        var out = _csvOf([{ id: 7, ts: 0, game: 'a,b"c', bet: 100, win: 250, cs: "seed", ne: 42 }]);
        var lines = out.split("\n");
        t.equal(lines.length, 2, "一列資料應輸出兩行");
        t.equal(lines[0], COLS.map(function (c) { return c.csv; }).join(","), "表頭應等於 COLS 的 csv 名");
        t.ok(lines[1].indexOf('"a,b""c"') > -1, "含逗號與引號的欄位應被 RFC4180 式跳脫");
        t.ok(lines[1].indexOf("2.5000") > -1, "倍數欄應為 win/bet");
        t.equal(_csvOf([]).split("\n").length, 1, "空資料應只有表頭");
      }
    });
    st.register({
      id: "betlog/central-hook", group: "betlog", title: "已掛上中央結算點（非破壞結構檢查）",
      env: "browser",
      run: function (t) {
        t.isFn(HL && HL.betlog && HL.betlog.record, "HL.betlog.record 應存在");
        t.isFn(HL && HL.liveStats && HL.liveStats.record, "中央結算點應存在");
        t.ok(/HL\.betlog/.test(String(HL.liveStats.record)), "liveStats.record 原始碼應引用 HL.betlog");
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
  var KEY = "HL_BETLOG";

  function load() {
    var o = HL.dom.lsGet(KEY, null);
    if (!o || !o.rows) o = { seq: 0, rows: [] };
    return o;
  }
  function save(o) { HL.dom.lsSet(KEY, o); }

  // 由中央結算點呼叫 · hot path 保持輕量（單次 lsSet）
  function record(game, bet, win) {
    bet = +bet || 0; win = +win || 0;
    if (bet <= 0 && win <= 0) return;                       // 純空事件不落帳
    var f = (HL.fair && HL.fair.info) ? HL.fair.info() : null;
    var o = load();
    o.seq = (o.seq || 0) + 1;
    o.rows = _push(o.rows, {
      id: o.seq, ts: Date.now(), game: game || "", bet: bet, win: win,
      cs: f ? f.clientSeed : "", ne: f ? f.nonce : null
    }, CAP);
    save(o);
  }

  function all() { return load().rows.slice(); }
  function count() { return load().rows.length; }
  function games() {
    var seen = {}, out = [];
    all().forEach(function (r) { var g = r.game || "—"; if (!seen[g]) { seen[g] = 1; out.push(g); } });
    return out.sort();
  }
  function list(f) {
    f = f || {};
    return all().filter(function (r) {
      if (f.game && f.game !== "all" && (r.game || "—") !== f.game) return false;
      if (f.outcome === "win" && !(r.win > r.bet)) return false;
      if (f.outcome === "loss" && !(r.win < r.bet)) return false;
      return true;
    });
  }
  function csv(f) { return _csvOf(list(f)); }
  function clear() { save({ seq: load().seq, rows: [] }); }   // 保留 seq＝編號不重用
  function isPF(game) { return !!(HL.fair && HL.fair.isPF && HL.fair.isPF(game)); }

  function download(name, text) {
    try {
      var blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var a = el("a", { href: url, download: name });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) { return false; }
  }

  function open() {
    var m, state = { game: "all", outcome: "all" };
    var host = el("div", { class: "ax-betlog" });

    function table() {
      var rows = list(state);
      HL.dom.clear(host);
      if (!rows.length) {
        host.appendChild(el("p", { class: "ax-muted" }, [
          el("span", { text: t("尚無注單紀錄。玩一局就會出現在這裡。", "尚無注單紀錄。玩一局就會出現在這裡。") })
        ]));
        return;
      }
      var head = el("tr", {}, COLS.map(function (c) {
        return el("th", { class: "ax-muted" }, [el("span", { text: t(c.label, c.label) })]);
      }).concat([el("th", { class: "ax-muted" }, [el("span", { text: t("驗算", "驗算") })])]));

      var body = rows.slice(0, 200).map(function (r) {
        var tds = COLS.map(function (c) {
          var cls = c.key === "net" ? (r.win - r.bet >= 0 ? "ax-gold" : "ax-red") : "";
          return el("td", { class: cls, text: c.cell(r) });
        });
        var can = isPF(r.game) && r.ne != null && r.cs;
        var btn = can
          ? el("button", { class: "ax-link" }, [el("span", { text: t("驗算 →", "驗算 →") })])
          : el("span", { class: "ax-muted", text: "—" });
        if (can) btn.addEventListener("click", function () {
          m.close();
          // ne 為排他上界 → 帶入該局最後一次取數的 nonce
          HL.fair.verifyModal({ clientSeed: r.cs, nonce: Math.max(0, r.ne - 1) });
        });
        tds.push(el("td", {}, [btn]));
        return el("tr", {}, tds);
      });

      host.appendChild(el("div", { class: "ax-betlog__scroll" }, [
        el("table", { class: "ax-betlog__t" }, [el("thead", {}, [head]), el("tbody", {}, body)])
      ]));
      if (rows.length > 200) {
        host.appendChild(el("small", { class: "ax-muted" }, [
          el("span", { text: t("僅顯示最新 200 筆；CSV 匯出為全部篩選結果。", "僅顯示最新 200 筆；CSV 匯出為全部篩選結果。") })
        ]));
      }
    }

    var gameSel = el("select", { class: "ax-fair__in", "aria-label": t("遊戲篩選", "遊戲篩選") },
      [{ v: "all", l: t("全部遊戲", "全部遊戲") }].concat(games().map(function (g) { return { v: g, l: g }; }))
        .map(function (o) { return el("option", { value: o.v, text: o.l }); }));
    gameSel.addEventListener("change", function () { state.game = gameSel.value; table(); });

    var outRow = HL.ui.segmented(
      [{ v: "all", t: t("全部", "全部") }, { v: "win", t: t("只看贏", "只看贏") }, { v: "loss", t: t("只看輸", "只看輸") }],
      "all",
      function (v) { state.outcome = v; table(); }
    );

    table();

    m = HL.ui.modal(t("📜 注單／投注歷史", "📜 注單／投注歷史"), [
      el("div", { class: "ax-betlog__bar" }, [gameSel, outRow]),
      host,
      HL.ui.kv(t("已記錄注單", "已記錄注單"), String(count()) + " / " + CAP),
      el("div", { class: "ax-modal__actions" }, [
        el("button", { class: "ax-btn-primary", onClick: function () {
          var ok = download("apexwin-betlog.csv", csv(state));
          HL.ui.toast(ok ? t("已匯出 CSV", "已匯出 CSV") : t("匯出失敗（瀏覽器不支援）", "匯出失敗（瀏覽器不支援）"), ok ? "ok" : "warn");
        } }, [el("span", { text: t("⬇ 匯出 CSV", "⬇ 匯出 CSV") })]),
        el("button", { class: "ax-btn-ghost", onClick: function () {
          if (!global.confirm(t("確定清空本機注單紀錄？此動作不影響餘額與戰績。", "確定清空本機注單紀錄？此動作不影響餘額與戰績。"))) return;
          clear(); m.close(); open();
        } }, [el("span", { text: t("清空紀錄", "清空紀錄") })])
      ]),
      el("small", { class: "ax-muted" }, [
        el("span", { text: t("nonce 為結算當下的「下一注」序號（該局最後取數的上界）；驗算會帶入前一個 nonce。僅採用可驗證公平的遊戲提供驗算入口。", "nonce 為結算當下的「下一注」序號（該局最後取數的上界）；驗算會帶入前一個 nonce。僅採用可驗證公平的遊戲提供驗算入口。") })
      ]),
      el("span", { class: "ax-demo-tag" }, [
        el("span", { text: t("純前端：紀錄存於本機、依真假站分開；部分遊戲把押注與贏分拆兩次回報，故可能落成兩列。", "純前端：紀錄存於本機、依真假站分開；部分遊戲把押注與贏分拆兩次回報，故可能落成兩列。") })
      ])
    ], { wide: true });
  }

  HL.betlog = {
    record: record, list: list, all: all, games: games, count: count,
    csv: csv, clear: clear, open: open, COLS: COLS, CAP: CAP,
    _push: _push, _csvOf: _csvOf
  };

  // 載入序脫鉤（#101）：本檔已排在 core/selftest.js 之後，走直通分支；保留 else 是為了
  //   「哪天 index.html 被重排也不會靜默掉測項」——形狀與早於 selftest.js 的模組一致。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

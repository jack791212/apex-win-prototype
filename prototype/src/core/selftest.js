/*
 * Apex Win｜自我檢測底座 HL.selftest（Self-Test Harness）
 * ---------------------------------------------------------------------------
 * 【為什麼有這個檔】平台長期零測試基建（platform-modules 台帳「自動化測試」= absent），
 *   驗證全靠人工 preview + 一次性 `node -e`。2026-07-28 健檢實證代價：`Dead By Noon` 買入價
 *   誤設 80× 而 E[買入]≈41.7×（買入 RTP 僅 52%、玩家暗虧 44pp）竟被記「13/13 PASS」上線——
 *   一次性驗證做完就消失，沒有任何東西會在下一輪重跑它。
 *
 * 【設計＝擴充性優先：容器先於內容】本檔只提供「註冊表 + 執行器 + 斷言 + 面板」，不綁死任何測項。
 *   任何模組（含未來的遊戲/平台功能）一行 `HL.selftest.register(spec)` 即納入檢測，
 *   比照 HL.games / HL.dock / HL.achievements 既有的資料驅動註冊表家族。
 *
 * 【雙環境】瀏覽器（⚙ 工具面板 →「🧪 自我檢測」）與 node（`node prototype/tests/run.js`）共用同一份引擎與同一批測項，
 *   node 端可納入遊戲軌保真閘＝驗的就是玩家玩的同一份。
 *
 * 【分層】tier: "fast"（秒級冒煙，預設全跑）／"deep"（蒙地卡羅等重測，需明確指定才跑）。
 * 【鐵律】測項必須**唯讀、非破壞性**：不得動餘額/流水/成就，不得呼叫 HL.liveStats.record。
 *   需要暫存 localStorage 時請用 `t.tmpKey()` 取得可自動清除的 key。
 *
 * 註冊於 window.HL.selftest；node 端另以 module.exports 匯出同一物件。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  var IS_NODE = (typeof window === "undefined");
  var REG = [];              // 測項註冊表
  var SEQ = 0;

  // ===================== 斷言（丟出 Error 即為 FAIL；t.skip 標記略過）=====================
  function SkipSignal(reason) { this.reason = reason; this.__skip = true; }

  function makeCtx(spec) {
    var tmpKeys = [];
    return {
      env: IS_NODE ? "node" : "browser",
      // 基本斷言
      ok: function (cond, msg) {
        if (!cond) throw new Error(msg || "期望為真，實際為 falsy");
      },
      equal: function (actual, expected, msg) {
        if (actual !== expected) {
          throw new Error((msg || "值不相等") + "（期望 " + fmt(expected) + "、實際 " + fmt(actual) + "）");
        }
      },
      // 數值近似（tol 為絕對容差）
      close: function (actual, expected, tol, msg) {
        if (typeof actual !== "number" || !isFinite(actual)) {
          throw new Error((msg || "數值") + " 非有限數：" + fmt(actual));
        }
        if (Math.abs(actual - expected) > tol) {
          throw new Error((msg || "數值超出容差") + "（期望 " + expected + " ±" + tol + "、實際 " + actual +
            "、差 " + (actual - expected).toFixed(6) + "）");
        }
      },
      finite: function (v, msg) {
        if (typeof v !== "number" || !isFinite(v)) throw new Error((msg || "應為有限數") + "，實際 " + fmt(v));
      },
      isFn: function (v, msg) {
        if (typeof v !== "function") throw new Error((msg || "應為 function") + "，實際 " + fmt(v));
      },
      // 略過（環境不符/相依模組未載入時使用，不算失敗）
      skip: function (reason) { throw new SkipSignal(reason || "略過"); },
      // 可自動清除的暫存 localStorage key（測項不得污染玩家資料）
      tmpKey: function (suffix) {
        var k = "ax:selftest:tmp:" + (spec.id || "x") + ":" + (suffix || (++SEQ));
        tmpKeys.push(k);
        return k;
      },
      _cleanup: function () {
        if (IS_NODE || typeof localStorage === "undefined") return;
        var ns = (HL.site && HL.site.ns) ? HL.site.ns() : "";
        for (var i = 0; i < tmpKeys.length; i++) {
          try { localStorage.removeItem(tmpKeys[i]); localStorage.removeItem(ns + tmpKeys[i]); } catch (e) {}
        }
      }
    };
  }

  function fmt(v) {
    if (typeof v === "string") return '"' + v + '"';
    if (typeof v === "function") return "function";
    if (v && typeof v === "object") { try { return JSON.stringify(v).slice(0, 80); } catch (e) { return "[object]"; } }
    return String(v);
  }

  // ===================== 註冊 =====================
  /**
   * register(spec)
   *   id     必填，唯一字串（如 "core/central-hook"）
   *   group  分組（core / ui / games / i18n / engine…），預設取 id 的第一段
   *   title  人看的一句話
   *   tier   "fast"（預設）| "deep"
   *   env    "both"（預設）| "browser" | "node"
   *   run(t) 執行體；丟出 Error＝FAIL、t.skip()＝SKIP、正常返回＝PASS
   */
  function register(spec) {
    if (!spec || !spec.id || typeof spec.run !== "function") return null;
    for (var i = 0; i < REG.length; i++) {
      if (REG[i].id === spec.id) { REG[i] = normalize(spec); return REG[i]; }   // 同 id 覆蓋（重載安全）
    }
    var n = normalize(spec);
    REG.push(n);
    return n;
  }

  function normalize(spec) {
    return {
      id: spec.id,
      group: spec.group || String(spec.id).split("/")[0] || "misc",
      title: spec.title || spec.id,
      tier: spec.tier === "deep" ? "deep" : "fast",
      env: (spec.env === "browser" || spec.env === "node") ? spec.env : "both",
      run: spec.run
    };
  }

  function list(filter) {
    filter = filter || {};
    var env = filter.env || (IS_NODE ? "node" : "browser");
    return REG.filter(function (s) {
      if (s.env !== "both" && s.env !== env) return false;
      if (filter.tier && s.tier !== filter.tier) return false;
      if (!filter.tier && s.tier === "deep") return false;        // 預設不跑 deep
      if (filter.group && s.group !== filter.group) return false;
      if (filter.id && s.id !== filter.id) return false;
      return true;
    });
  }

  function groups() {
    var seen = {}, out = [];
    for (var i = 0; i < REG.length; i++) { if (!seen[REG[i].group]) { seen[REG[i].group] = 1; out.push(REG[i].group); } }
    return out;
  }

  // ===================== 執行 =====================
  function run(opts) {
    opts = opts || {};
    var specs = list(opts);
    var results = [], pass = 0, fail = 0, skip = 0;
    for (var i = 0; i < specs.length; i++) {
      var s = specs[i], t = makeCtx(s), started = nowMs(), r;
      try {
        s.run(t);
        r = { id: s.id, group: s.group, title: s.title, tier: s.tier, status: "pass", ms: nowMs() - started };
        pass++;
      } catch (e) {
        if (e && e.__skip) {
          r = { id: s.id, group: s.group, title: s.title, tier: s.tier, status: "skip", msg: e.reason, ms: nowMs() - started };
          skip++;
        } else {
          r = { id: s.id, group: s.group, title: s.title, tier: s.tier, status: "fail",
                msg: (e && e.message) || String(e), ms: nowMs() - started };
          fail++;
        }
      }
      t._cleanup();
      results.push(r);
    }
    return { total: specs.length, pass: pass, fail: fail, skip: skip, results: results };
  }

  function nowMs() {
    return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  }

  HL.selftest = { register: register, list: list, run: run, groups: groups, _reg: REG };
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.selftest; }

  // ===================== 內建測項：平台不變量（瀏覽器）=====================
  // 這些是「壞了就整站壞」的架構鐵律（CLAUDE.md §4），每次開面板即重驗。
  register({
    id: "core/namespace", title: "HL 命名空間關鍵模組齊備", env: "browser",
    run: function (t) {
      var must = ["dom", "ui", "state", "liveStats", "fair", "instant", "table", "games", "ledger", "site", "i18n"];
      for (var i = 0; i < must.length; i++) t.ok(HL[must[i]], "HL." + must[i] + " 未載入（index.html script 序或檔案錯誤）");
    }
  });

  register({
    id: "core/central-hook", title: "中央結算掛鉤 liveStats.record 及其下游齊備", env: "browser",
    run: function (t) {
      t.isFn(HL.liveStats && HL.liveStats.record, "HL.liveStats.record 必須是 function（全遊戲結算中央點）");
      // 下游：模組存在時，其掛鉤必須是 function（缺一即代表留存/返水/帳本會靜默漏記）
      var chain = [
        ["vip", "addWager"], ["tasks", "bump"], ["rakeback", "accrue"],
        ["jackpot", "onBet"], ["tournament", "record"], ["ledger", "record"]
      ];
      for (var i = 0; i < chain.length; i++) {
        var mod = HL[chain[i][0]];
        if (!mod) continue;                                  // 模組未載入＝不強制
        t.isFn(mod[chain[i][1]], "HL." + chain[i][0] + "." + chain[i][1] + " 應為 function（中央結算下游）");
      }
    }
  });

  register({
    id: "core/site-namespace", title: "真/假站命名空間前綴隔離正確", env: "browser",
    run: function (t) {
      if (!HL.site || !HL.dom || !HL.dom.lsGet) t.skip("HL.site / HL.dom.lsGet 未載入");
      var ns = HL.site.ns();
      t.ok(ns === "" || ns === "r:", 'HL.site.ns() 應為 "" 或 "r:"，實際 ' + fmt(ns));
      t.equal(HL.site.isLive(), ns === "r:", "isLive() 與 ns() 前綴必須一致");
      // 寫入→讀回→清除（僅動自己的暫存 key，不碰玩家資料）
      var k = t.tmpKey("ns"), v = "v" + Math.floor(nowMs());
      HL.dom.lsSet(k, v);
      t.equal(HL.dom.lsGet(k, null), v, "lsSet/lsGet 往返值不符");
      t.equal(localStorage.getItem(ns + k), JSON.stringify(v),
        "實際落地的 key 必須帶站別前綴 " + fmt(ns) + "（前綴斷掉＝真站假站資料互相污染）");
    }
  });

  register({
    id: "games/registry", title: "遊戲註冊表資料完整（無重複 id、可玩者launch得起來）", env: "browser",
    run: function (t) {
      if (!HL.games || !HL.games.all) t.skip("HL.games.all 未提供");
      var all = HL.games.all() || [], seen = {};
      t.ok(all.length > 0, "遊戲註冊表為空");
      for (var i = 0; i < all.length; i++) {
        var g = all[i];
        t.ok(g.id, "第 " + i + " 款遊戲缺 id");
        t.ok(!seen[g.id], "遊戲 id 重複：" + g.id + "（後註冊者會蓋掉前者）");
        seen[g.id] = 1;
        t.ok(g.title, g.id + " 缺 title");
        // 可玩＝launch() 走得通。games.js 的 launch() 有兩條合法路徑：
        //   ① render function → router.goGame ② route 字串 → router.go（如 shadow-ritual route:"slot"）
        // 兩者皆無才是真的點了打不開。
        if (g.playable && !g.comingSoon) {
          t.ok(typeof g.render === "function" || (g.route && typeof g.route === "string"),
            g.id + " 標為可玩，但既無 render 也無 route＝點了開不起來");
        }
      }
    }
  });

  register({
    id: "ui/tokens", title: "--ax-* 設計 token 皆有值（換膚底座未斷）", env: "browser",
    run: function (t) {
      if (typeof getComputedStyle === "undefined") t.skip("無 getComputedStyle");
      var cs = getComputedStyle(document.documentElement);
      var must = ["--ax-gold", "--ax-bg", "--ax-text", "--ax-text-dim"];
      for (var i = 0; i < must.length; i++) {
        t.ok(String(cs.getPropertyValue(must[i]) || "").trim() !== "", must[i] + " 未定義或為空（token 斷鏈）");
      }
    }
  });

  register({
    id: "i18n/dict", title: "i18n 字典無空值（翻譯不會把畫面清空）", env: "browser",
    run: function (t) {
      if (!HL.i18n || !HL.i18n.dict) t.skip("HL.i18n.dict 未公開");
      var d = HL.i18n.dict(), langs = Object.keys(d), bad = [];
      for (var i = 0; i < langs.length; i++) {
        var tbl = d[langs[i]] || {}, keys = Object.keys(tbl);
        for (var j = 0; j < keys.length; j++) {
          if (typeof tbl[keys[j]] !== "string" || tbl[keys[j]] === "") bad.push(langs[i] + " / " + keys[j]);
        }
      }
      t.ok(bad.length === 0, "字典有空值或非字串：" + bad.slice(0, 5).join("、") + (bad.length > 5 ? " …共 " + bad.length + " 筆" : ""));
    }
  });

  register({
    id: "games/buyin-price-single-source", title: "買入型入口價＝單一常數驅動（保真閘第 14 項防線）", env: "browser",
    run: function (t) {
      // 2026-07-28 血淚條款：買入價若在「按鈕文字」與「扣款」兩處各自硬編就會 drift。
      // 這裡只驗「常數存在且為合理有限數」；買入 RTP 的數值正確性由 node deep 測項負責。
      var mods = [
        { k: "pirots", ns: HL.pirots, field: "buyPrice" },
        { k: "dead-by-noon", ns: HL.deadByNoon, field: "buyX" },
        { k: "golden-toad", ns: HL.goldenToad, field: "buyX" },
        { k: "gem-storm", ns: HL.gemStorm, field: "buyCost" }
      ];
      var checked = 0;
      for (var i = 0; i < mods.length; i++) {
        var m = mods[i];
        if (!m.ns || !m.ns.CFG) continue;
        var v = m.ns.CFG[m.field];
        t.finite(v, m.k + " 的買入價常數 CFG." + m.field + " 應為有限數");
        t.ok(v > 0 && v < 1000, m.k + " 買入價 " + v + "× 超出合理範圍(0,1000)");
        checked++;
      }
      if (!checked) t.skip("四款買入型 slot 皆未載入");
    }
  });

  // ===================== 瀏覽器面板（node 端到此為止）=====================
  if (IS_NODE || !HL.dom || !HL.ui) return;
  var el = HL.dom.el;

  function statusChip(st) {
    var map = { pass: ["ax-green", "✅ PASS"], fail: ["ax-red", "❌ FAIL"], skip: ["ax-muted", "⏭ SKIP"] };
    var m = map[st] || map.skip;
    return el("b", { class: "ax-self__chip " + m[0], text: m[1] });
  }

  function render(box, opts) {
    HL.dom.clear(box);
    var res = run(opts);
    var tone = res.fail ? "ax-red" : (res.skip ? "ax-muted" : "ax-green");

    box.appendChild(el("div", { class: "ax-self__sum" }, [
      el("b", { class: tone, text: res.fail ? ("❌ " + res.fail + " 項失敗") : "✅ 全數通過" }),
      el("small", { class: "ax-muted", text: "共 " + res.total + " 項 · 通過 " + res.pass + " · 失敗 " + res.fail + " · 略過 " + res.skip })
    ]));

    var rows = res.results.map(function (r) {
      return el("div", { class: "ax-self__row" + (r.status === "fail" ? " ax-self__row--fail" : "") }, [
        statusChip(r.status),
        el("div", { class: "ax-self__meta" }, [
          el("b", { text: r.title }),
          el("small", { class: "ax-muted", text: r.id + " · " + r.tier + " · " + r.ms.toFixed(1) + "ms" }),
          r.msg ? el("small", { class: r.status === "fail" ? "ax-red" : "ax-muted", text: r.msg }) : null
        ])
      ]);
    });
    box.appendChild(el("div", { class: "ax-self__list" }, rows));
  }

  function open() {
    var box = el("div", { class: "ax-self__body" });
    var body = [
      el("p", { class: "ax-muted ax-self__intro", text:
        "唯讀冒煙測：驗架構鐵律（中央結算掛鉤／站別隔離／註冊表／token／i18n／買入價常數）是否還在。不會動到餘額或任何玩家資料。" }),
      el("div", { class: "ax-self__bar" }, [
        el("button", { class: "ax-btn-primary", text: "▶ 重新執行", onClick: function () { render(box, {}); } }),
        el("button", { class: "ax-btn-ghost", text: "🧮 含重測（deep）", onClick: function () { render(box, { tier: "deep" }); } })
      ]),
      box
    ];
    HL.ui.modal("🧪 自我檢測（Self-Test）", body, { wide: true });
    render(box, {});
  }

  HL.selftest.open = open;
})(typeof window !== "undefined" ? window : globalThis);

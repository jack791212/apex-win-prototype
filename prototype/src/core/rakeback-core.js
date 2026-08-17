/* =============================================================================
 * rakeback-core.js — #60 返水改以「莊家優勢」為計價基準（純數學核心 · 雙環境契約）
 * -----------------------------------------------------------------------------
 * 【這張卡在改什麼】
 *   舊制：rakeback = bet × VIP段位率 × boost      ← 計價基準＝「押注額」，與遊戲無關
 *   新制：rakeback = bet × 該遊戲莊家優勢 × VIP段位「返還比例」 × boost
 *                                                  ← 計價基準＝「這注理論上莊家賺多少」
 *
 * 【為什麼非改不可｜結構性問題，不是調參】
 *   progress.js 的既有註解自己寫著「返水率 ≥ 莊優＝結構性虧損」，但舊架構**無法機械保證**
 *   這件事（率是常數、edge 逐遊戲不同）。以 #50 的 EDGE 表實算，舊制假站頂階 1.8%：
 *     · 在 1.00% edge 的 originals（dice/limbo/…）＝ 吐回莊家理論收入的 **180%**（每注淨虧）
 *     · 在 3.855% edge 的 pirots            ＝ 只吐 **47%**
 *   同一制度對不同遊戲的實際慷慨度差 **3.75 倍**，且此差異純屬「基準選錯」的副作用。
 *   改用 edge 基準後，不變量成為**數學恆真**：rakeback = bet × edge × pct 且 pct < 1
 *   ⇒ 永不可能超過該注的理論莊家收入。**把口頭紀律變成型別安全**，即本卡最大價值。
 *
 * 【校準｜改版前後總返水成本大致中性（重分配，不是加發／減發）】
 *   基準＝#50 EDGE 表 22 款的平均莊優 CALIB_MEAN_EDGE_PCT = 2.0613%。
 *   取 pct_i ≈ legacy_i / (meanEdge/100) 使「均勻遊戲分布下的總成本」與舊制相等，再：
 *     · demo 一律**向上**取整 ⇒ 假站總成本零退步（不會因改版讓玩家拿更少）
 *     · live 一律**向下**取整 ⇒ 真站總成本不增加（不鬆動 §11 剛轉正的 NGR）
 *   兩性質皆為常駐 node 測項（rakeback/cost-neutral-demo｜-live），表一改就會被叫出來。
 *
 * 【與 #50 `HL.edge` 的契約差異｜⚠️ 勿誤讀為違反 #50】
 *   #50 的承諾是「edge 只加權**進度**（VIP／賽季經驗），金錢與帳目一律真實」。
 *   本卡**不是**把加權額當押注額餵進派彩——餵進 accrue 的仍是**真實 bet**，
 *   改變的是**返水公式本身的計價基準**。兩者是不同的事，故不牴觸 #50 的 edge/wired 測項
 *   （該測項斷言帳本必須記真實 bet，本卡未動帳本）。
 *
 * 【未登記遊戲的退化紀律】
 *   edge 表未收錄者（Shadow Ritual `slot`、`chicken` —— 兩者尚無 RTP 數學模型，#50 刻意不猜）
 *   一律**退回舊制** `LEGACY_RATES`＝行為與本卡之前完全相同。**不是 0 返水**——漏登記只
 *   退化、不懲罰玩家（沿 #50「未列出一律 1.00×」的同一紀律）。
 *
 * 雙環境契約（比照 #50 edge.js／#51 betlog.js／#56 ledger.js）：純資料/純函式以 module.exports
 * 暴露供 `node prototype/tests/run.js` 驗證，瀏覽器註冊於 window.HL.rakebackCore。
 * ========================================================================== */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===== 純資料：舊制押注比例（現僅作為「未登記 edge 遊戲」的 fallback）=====
  // 真站低於莊優才留得住利潤；假站慷慨展示。數值與 #60 之前的 RB_RATES 逐位相同。
  var LEGACY_RATES = {
    demo: [0.005, 0.008, 0.011, 0.014, 0.018],
    live: [0.001, 0.0015, 0.002, 0.0025, 0.003]
  };

  // ===== 純資料：新制「返還該注理論莊家收入的百分比」（依 VIP 段位）=====
  var EDGE_PCT = {
    demo: [0.245, 0.390, 0.535, 0.680, 0.875],
    live: [0.048, 0.072, 0.096, 0.121, 0.145]
  };

  var CALIB_MEAN_EDGE_PCT = 2.0613;  // 校準基準（#50 EDGE 表 22 款平均），改表時需重跑校準
  var MAX_PCT = 1;                   // 硬上界：返還比例必須 < 100% 莊優，否則每注淨虧

  function modeKey(mode) { return mode === "live" ? "live" : "demo"; }
  function pick(arr, i) { i = i | 0; if (i < 0) i = 0; return arr[Math.min(i, arr.length - 1)]; }

  function legacyRate(mode, vipIndex) { return pick(LEGACY_RATES[modeKey(mode)], vipIndex); }
  function edgePctFor(mode, vipIndex) { return pick(EDGE_PCT[modeKey(mode)], vipIndex); }

  /* 單注返水率（占「押注額」的比例）。
   * edgeOfGame＝該遊戲理論莊家優勢(%)，null/未定義/非有限數 ⇒ 退化舊制。 */
  function rateFor(edgeOfGame, mode, vipIndex) {
    if (edgeOfGame === null || edgeOfGame === undefined || !isFinite(+edgeOfGame)) {
      return legacyRate(mode, vipIndex);
    }
    return (+edgeOfGame / 100) * edgePctFor(mode, vipIndex);
  }

  /* 單注實際返水額（未取整；呼叫端沿用既有「入桶不取整、領取時 floor」的語意）。 */
  function accrualFor(bet, edgeOfGame, mode, vipIndex, boost) {
    bet = +bet || 0;
    if (bet <= 0) return 0;
    boost = (boost === undefined || boost === null || !isFinite(+boost)) ? 1 : +boost;
    return bet * rateFor(edgeOfGame, mode, vipIndex) * boost;
  }

  var CORE = {
    LEGACY_RATES: LEGACY_RATES, EDGE_PCT: EDGE_PCT,
    CALIB_MEAN_EDGE_PCT: CALIB_MEAN_EDGE_PCT, MAX_PCT: MAX_PCT,
    legacyRate: legacyRate, edgePctFor: edgePctFor,
    rateFor: rateFor, accrualFor: accrualFor,
    tiers: function () { return EDGE_PCT.demo.length; }
  };

  // ===================== 測項（雙環境同一批）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    st.register({
      id: "rakeback/never-exceeds-edge", group: "rakeback",
      title: "返水永不超過該注理論莊家收入（不變量數學恆真）", env: "both",
      run: function (t) {
        ["demo", "live"].forEach(function (mode) {
          for (var i = 0; i < CORE.tiers(); i++) {
            var pct = CORE.edgePctFor(mode, i);
            t.ok(pct < CORE.MAX_PCT, mode + " 段位 " + i + " 返還比例須 <100% 莊優，實際 " + pct);
            t.ok(pct > 0, mode + " 段位 " + i + " 返還比例須為正，實際 " + pct);
          }
        });
        // 對每一款已登記 edge 的遊戲逐一驗證（表增修後自動涵蓋新遊戲）
        var edge = loadEdge();
        if (!edge) { t.skip("edge 表不可用"); return; }
        var ks = edge.keys();
        ["demo", "live"].forEach(function (mode) {
          for (var i = 0; i < CORE.tiers(); i++) {
            for (var k = 0; k < ks.length; k++) {
              var e = edge.edgeOf(ks[k]);
              var rate = CORE.rateFor(e, mode, i);
              t.ok(rate < e / 100, mode + "/" + ks[k] + "/段位" + i +
                " 返水率 " + rate.toFixed(6) + " 必須低於莊優 " + (e / 100).toFixed(6));
            }
          }
        });
      }
    });

    st.register({
      id: "rakeback/cost-neutral-demo", group: "rakeback",
      title: "假站：改版後總返水成本零退步（不得整體變少）", env: "both",
      run: function (t) {
        var edge = loadEdge();
        if (!edge) { t.skip("edge 表不可用"); return; }
        var meanEdgeFrac = meanEdge(edge) / 100;
        for (var i = 0; i < CORE.tiers(); i++) {
          var oldCost = CORE.legacyRate("demo", i);              // 每 1 元押注的舊成本
          var newCost = meanEdgeFrac * CORE.edgePctFor("demo", i); // 均勻遊戲分布下的新成本
          t.ok(newCost >= oldCost - 1e-12, "假站段位 " + i + " 新成本 " + newCost.toFixed(6) +
            " 不得低於舊成本 " + oldCost.toFixed(6));
          t.ok(newCost <= oldCost * 1.05, "假站段位 " + i + " 新成本 " + newCost.toFixed(6) +
            " 不應顯著高於舊成本 " + oldCost.toFixed(6) + "（中性重分配，非加發）");
        }
      }
    });

    st.register({
      id: "rakeback/cost-neutral-live", group: "rakeback",
      title: "真站：改版後總返水成本不得增加（不鬆動 NGR）", env: "both",
      run: function (t) {
        var edge = loadEdge();
        if (!edge) { t.skip("edge 表不可用"); return; }
        var meanEdgeFrac = meanEdge(edge) / 100;
        for (var i = 0; i < CORE.tiers(); i++) {
          var oldCost = CORE.legacyRate("live", i);
          var newCost = meanEdgeFrac * CORE.edgePctFor("live", i);
          t.ok(newCost <= oldCost + 1e-12, "真站段位 " + i + " 新成本 " + newCost.toFixed(6) +
            " 不得高於舊成本 " + oldCost.toFixed(6));
          t.ok(newCost >= oldCost * 0.95, "真站段位 " + i + " 新成本 " + newCost.toFixed(6) +
            " 不應顯著低於舊成本 " + oldCost.toFixed(6) + "（中性重分配，非減發）");
        }
      }
    });

    st.register({
      id: "rakeback/unknown-degrades", group: "rakeback",
      title: "未登記 edge 的遊戲退回舊制（漏登記只退化、不歸零）", env: "both",
      run: function (t) {
        ["demo", "live"].forEach(function (mode) {
          for (var i = 0; i < CORE.tiers(); i++) {
            var legacy = CORE.legacyRate(mode, i);
            t.ok(CORE.rateFor(null, mode, i) === legacy, mode + " 段位 " + i + " null edge 應退回舊制率");
            t.ok(CORE.rateFor(undefined, mode, i) === legacy, mode + " 段位 " + i + " undefined edge 應退回舊制率");
            t.ok(CORE.rateFor(NaN, mode, i) === legacy, mode + " 段位 " + i + " NaN edge 應退回舊制率");
            t.ok(CORE.rateFor(null, mode, i) > 0, "退化後必須仍為正返水，不得歸零");
          }
        });
        // Shadow Ritual／chicken＝#50 刻意未登記者，須走退化路徑
        var edge = loadEdge();
        if (edge) {
          t.ok(edge.edgeOf("slot") === null, "Shadow Ritual 應為未登記");
          t.ok(CORE.rateFor(edge.edgeOf("slot"), "demo", 4) === CORE.legacyRate("demo", 4),
            "Shadow Ritual 應退回舊制頂階率");
        }
      }
    });

    st.register({
      id: "rakeback/monotone-and-shape", group: "rakeback",
      title: "返水隨段位單調不減；高莊優遊戲每注返水較多", env: "both",
      run: function (t) {
        ["demo", "live"].forEach(function (mode) {
          for (var i = 1; i < CORE.tiers(); i++) {
            t.ok(CORE.edgePctFor(mode, i) >= CORE.edgePctFor(mode, i - 1),
              mode + " 段位 " + i + " 返還比例不應低於前一段位");
          }
          // 同段位、同注額下，3.855% 的 pirots 應比 1% 的 dice 返更多（本卡核心行為）
          t.ok(CORE.accrualFor(10000, 3.855, mode, 2, 1) > CORE.accrualFor(10000, 1.00, mode, 2, 1),
            mode + "：高莊優遊戲每注返水應多於低莊優遊戲");
        });
        // 邊界：零注/負注不生返水；boost 為線性乘數
        t.ok(CORE.accrualFor(0, 1.00, "demo", 0, 1) === 0, "零注不得生返水");
        t.ok(CORE.accrualFor(-100, 1.00, "demo", 0, 1) === 0, "負注不得生返水");
        t.close(CORE.accrualFor(1000, 2.00, "demo", 1, 2),
          CORE.accrualFor(1000, 2.00, "demo", 1, 1) * 2, 1e-9, "boost 應為線性乘數");
        t.ok(CORE.accrualFor(1000, 2.00, "demo", 1, undefined) === CORE.accrualFor(1000, 2.00, "demo", 1, 1),
          "boost 未給定應等同 ×1");
      }
    });

    if (isNode) return;

    st.register({
      id: "rakeback/wired", group: "rakeback",
      title: "返水確實改吃 edge 基準且中央結算點有傳 game", env: "browser",
      run: function (t) {
        t.isFn(HL && HL.rakeback && HL.rakeback.accrue, "HL.rakeback.accrue 應存在");
        t.isFn(HL && HL.liveStats && HL.liveStats.record, "中央結算點應存在");
        t.ok(/rakeback\.accrue\( *bet *, *game/.test(String(HL.liveStats.record)),
          "liveStats.record 應把 game 一路傳進 rakeback.accrue");
        t.ok(/rakebackCore/.test(String(HL.rakeback.accrue)), "accrue 應改走 rakebackCore 計價");
        // 同注額下，高莊優遊戲的實得返水率確實較高（走真實 HL.edge 查表）
        if (HL.rakeback.rateOf) {
          t.ok(HL.rakeback.rateOf("pirots") > HL.rakeback.rateOf("dice"),
            "pirots(3.855%) 的返水率應高於 dice(1.00%)");
          t.ok(HL.rakeback.rateOf("slot") === HL.rakeback.rateOf("no-such-game-xyz"),
            "未登記遊戲應與 Shadow Ritual 同走退化路徑");
        }
      }
    });
  }

  // edge 表存取（node: require／browser: HL.edge），失敗回 null 讓測項 skip 而非炸掉
  function loadEdge() {
    try {
      if (isNode) return require("./edge.js");
      return (HL && HL.edge && HL.edge.edgeOf) ? HL.edge : null;
    } catch (e) { return null; }
  }
  function meanEdge(edge) {
    var ks = edge.keys ? edge.keys() : Object.keys(edge.EDGE || {});
    if (!ks.length) return CORE.CALIB_MEAN_EDGE_PCT;
    var s = 0;
    for (var i = 0; i < ks.length; i++) s += edge.edgeOf(ks[i]);
    return s / ks.length;
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  HL.rakebackCore = CORE;

  /* #90 經濟旋鈕自我描述：返水是**送幣型**旋鈕 ⇒ 逐段位宣告 strict:"le"（真站 ≤ 假站）。 */
  if (HL.econCfg && HL.econCfg.register) {
    HL.econCfg.register({
      id: "rakeback", label: "返水率（#60）", icon: "💧", order: 10,
      describe: function () {
        var pc = function (a) { return a.map(function (v) { return Math.round(v * 1000) / 10; }); };
        return [
          { key: "edgePct", label: "返還莊家收入比例（逐段位）", demo: pc(EDGE_PCT.demo), live: pc(EDGE_PCT.live), unit: "%", strict: "le",
            note: "新制：返還「該注理論莊家收入」的百分比（青銅→鑽石）" },
          { key: "legacy", label: "舊制返水率（逐段位）", demo: pc(LEGACY_RATES.demo), live: pc(LEGACY_RATES.live), unit: "%", strict: "le",
            note: "改制前的「流水 ×固定比例」，保留作對照基準" },
          { key: "maxPct", label: "返還比例硬上界", demo: Math.round(MAX_PCT * 100), live: Math.round(MAX_PCT * 100), unit: "%",
            note: "必須 <100% 莊優，否則每注淨虧（有常駐測項盯）" }
        ];
      }
    });
  }

  // 載入序脫鉤（#101）：本檔早於 core/selftest.js ⇒ 先排隊，由 selftest.js 載入時清算。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

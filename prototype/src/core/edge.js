/*
 * Apex Win｜成本加權進度引擎 HL.edge（自我進化引擎 #50）
 *
 * 為什麼要有：ApexWin 的 VIP／賽季經驗長年是**純押注金額**累積——中央結算點
 *   `HL.liveStats.record(game, bet, win)` 明明帶著 `game`，但下游 `HL.vip.addWager(bet)`／
 *   `HL.season.record(bet)` 只收到金額、**遊戲識別在此被丟掉**。⇒ 在 1% 莊家優勢的 Dice 上刷
 *   NT$10,000 與在 3.9% 的 Pirots 上刷 NT$10,000 得到完全相同的進度，儘管前者對莊家的
 *   理論成本只有後者的四分之一。全站**沒有任何一張「每遊戲 edge 係數」表**（本檔即該表）。
 *
 * 三平台共識（platform-modules 台帳「VIP」模組已記）：
 *   · BC.Game 2026「BC Engine」：XP 改依每局實際成本／house edge 計權。
 *   · Roobet 2026 刷新：rakeback 30 級制由押注活動＋戰績＋**遊戲選擇**複合決定。
 *   · Duelbits 2026（本輪 07-31 刷新）：Ace Lounge 明載為「基於 **house edge** 的永久 cashback
 *     系統，而非傳統 VIP 階梯」＝獨立收斂到同一設計。
 *
 * 【設計＝一條曲線、兩種縮放（站別感知）】
 *   `SHAPE(edge)` 把理論莊家優勢線性映射到 [1.00, 1.00+SPAN]（EDGE_MIN..EDGE_MAX 之間），
 *   再乘上依站別選定的 `SCALE`：
 *     · **假站 demo（寬鬆）**：SCALE=1 ⇒ 最低倍率恰為 **1.00×**——**沒有任何遊戲比改版前更慢**
 *       （只有高成本遊戲變快）。避免「懲罰感」＝ wow-vegas 調研檔早就記下的設計教訓。
 *     · **真站 live（中性）**：SCALE=1/mean(SHAPE) ⇒ 全站**平均倍率恰為 1.00×**，
 *       純粹「重新分配」而非「加發」經驗 ⇒ **不會鬆動經濟**（CLAUDE.md §11：真站 NGR 剛轉正，
 *       禁不起 VIP/賽季獎金發放量整體上調）。此即 §11 既有的「把經濟數值做成站別感知」範式。
 *   兩個性質（demo 地板＝1.00、live 平均＝1.00）都在本檔測項中**機械驗證**，非口頭宣稱。
 *
 * 【只加權「進度」，不動錢】本引擎只餵 VIP 經驗與賽季經驗。
 *   `bet`/`win` 本身、返水 `rakeback`、彩金 `jackpot`、抽獎券 `raffle`、任務「押注 NT$X」目標、
 *   公會貢獻額、帳本 `ledger` **一律維持真實金額**——加權金額若外流到派彩或帳目就會失真。
 *
 * 擴充性：`EDGE` 是純資料 config 表，新遊戲一行 `HL.edge.register("slug", 3.7)` 即納入
 *   （或直接在表中加一列）。**未列出的遊戲一律 1.00×**（不受影響、不猜測），
 *   故漏登記只會退化成舊行為，不會產生錯誤加權。
 *
 * 雙環境契約（比照 #51 betlog 與 12 款過保真閘遊戲）：純資料/純函式區以 `module.exports` 暴露，
 *   `prototype/tests/run.js` 驗的即瀏覽器跑的同一份。
 * 註冊於 window.HL.edge = { weight, weighted, edgeOf, register, list, mode, open, ... }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純資料：每遊戲理論莊家優勢（%）=====================
  // 值一律來自該遊戲**程式內實際的 edge 常數或已過保真閘的實測 RTP**（非行銷值、非臆測）。
  // 多注型遊戲取「頭條主注」的 edge，並在註記寫明其餘注型的範圍。
  var EDGE = {
    // — originals 家族：EDGE 常數 0.99（1% 莊家優勢），floor 派彩保證 edge ≥1% —
    "dice": 1.00, "limbo": 1.00, "plinko": 1.00, "crash-x": 1.00, "mines": 1.00,
    "towers": 1.00, "hilo": 1.00, "keno": 1.00, "picks": 1.00,
    "dice-duel": 1.00,          // 贏家通吃抽水 1%（RAKE=0.99）
    "cases": 1.50,              // gameInfoBar 明載 RTP 98.5%
    "pump": 2.00,               // EDGE=0.98，檔頭明載「高於 Dice 家族 1%」
    // — 桌遊：canonical live-casino 賠付（Wizard of Odds 交叉，見 games-catalog gate_log）—
    "baccarat": 1.20,           // 莊 1.05% / 閒 1.24%（取近似中值；和/對子另高）
    "roulette": 2.70,           // 歐式單零 1/37
    "sic-bo": 2.778,            // 大/小 頭條主注（其餘 35 格更高）
    "andar-bahar": 2.15,        // Andar 先發主注（Bahar 3.00%）
    "dragon-tiger": 3.735,      // 龍/虎主注（和 32.77% / 同花和 13.98%）
    "money-wheel": 4.50,        // 六號碼 3.42%–9.19% 的近似中值
    // — SLOT：已過保真閘的實測 RTP（100% − RTP）—
    "pirots": 3.855,            // 實測 96.145%
    "dead-by-noon": 3.73,       // 宣告 96.27%
    "golden-toad": 3.70,        // 宣告 96.30%
    "gem-storm": 3.50           // 宣告 96.50%
    // 未列：slot（Shadow Ritual）與 chicken —— 兩者尚無 RTP 數學模型（games-catalog 已記為
    //   剩餘最大真缺口）⇒ 刻意不猜，落入「未列出＝1.00×」路徑。
  };

  // ===================== 純函式：形狀與縮放 =====================
  var EDGE_MIN = 1.00;   // 對應倍率 1.00×（originals 家族基準線）
  var EDGE_MAX = 4.50;   // 對應倍率 1.00+SPAN（目前最高 edge＝money-wheel）
  var SPAN = 0.80;       // 倍率跨幅：1.00× → 1.80×
  var NEUTRAL = 1.00;    // 未登記遊戲的倍率（＝維持舊行為）

  function round2(x) { return Math.round(x * 100) / 100; }

  // 線性映射 + 兩端夾住（夾住只影響超出 [EDGE_MIN, EDGE_MAX] 的未來遊戲，現表內無一被夾）
  function shape(edgePct) {
    var e = +edgePct;
    if (!isFinite(e)) return 1;
    if (e < EDGE_MIN) e = EDGE_MIN;
    if (e > EDGE_MAX) e = EDGE_MAX;
    return 1 + SPAN * (e - EDGE_MIN) / (EDGE_MAX - EDGE_MIN);
  }

  function keys() { return Object.keys(EDGE); }

  // 全表 SHAPE 平均（真站中性縮放的分母；隨表增修自動重算，不寫死魔術數）
  function meanShape() {
    var ks = keys();
    if (!ks.length) return 1;
    var s = 0;
    for (var i = 0; i < ks.length; i++) s += shape(EDGE[ks[i]]);
    return s / ks.length;
  }

  // 站別縮放：demo 寬鬆（地板 1.00×）／live 中性（平均 1.00×）
  function scaleFor(mode) { return mode === "live" ? (1 / meanShape()) : 1; }

  function edgeOf(game) {
    var e = EDGE[game];
    return (typeof e === "number") ? e : null;
  }

  function weightFor(game, mode) {
    var e = edgeOf(game);
    if (e === null) return NEUTRAL;                 // 未登記＝不加權（退化成舊行為）
    return round2(scaleFor(mode) * shape(e));
  }

  function weightedFor(game, bet, mode) {
    bet = +bet || 0;
    if (bet <= 0) return 0;
    return Math.round(bet * weightFor(game, mode));
  }

  // 表內所有遊戲的平均倍率（測項用；nomode = 依站別）
  function meanWeight(mode) {
    var ks = keys(), s = 0;
    for (var i = 0; i < ks.length; i++) s += weightFor(ks[i], mode);
    return ks.length ? s / ks.length : 1;
  }

  function registerEdge(game, edgePct) {
    if (!game || typeof edgePct !== "number" || !isFinite(edgePct) || edgePct <= 0) return CORE;
    EDGE[game] = edgePct;
    return CORE;
  }

  var CORE = {
    EDGE: EDGE, EDGE_MIN: EDGE_MIN, EDGE_MAX: EDGE_MAX, SPAN: SPAN, NEUTRAL: NEUTRAL,
    shape: shape, meanShape: meanShape, scaleFor: scaleFor, keys: keys,
    edgeOf: edgeOf, weightFor: weightFor, weightedFor: weightedFor, meanWeight: meanWeight,
    register: registerEdge, round2: round2
  };

  // ===================== 測項（node + 瀏覽器共用同一份純函式）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    st.register({
      id: "edge/table-sane", group: "edge", title: "edge 係數表數值合理且非空", env: "both",
      run: function (t) {
        var ks = CORE.keys();
        t.ok(ks.length >= 15, "係數表至少應涵蓋 15 款遊戲，實際 " + ks.length);
        for (var i = 0; i < ks.length; i++) {
          var e = CORE.EDGE[ks[i]];
          t.ok(typeof e === "number" && e > 0.5 && e < 15,
            ks[i] + " 的 edge 應在 (0.5%, 15%) 合理區間，實際 " + e);
        }
      }
    });

    st.register({
      id: "edge/demo-floor", group: "edge", title: "假站：無任何遊戲倍率低於 1.00×（零退步）", env: "both",
      run: function (t) {
        var ks = CORE.keys();
        for (var i = 0; i < ks.length; i++) {
          var w = CORE.weightFor(ks[i], "demo");
          t.ok(w >= 1.00, ks[i] + " 假站倍率不得低於 1.00×，實際 " + w);
          t.ok(w <= 1 + CORE.SPAN + 1e-9, ks[i] + " 假站倍率不得高於上限，實際 " + w);
        }
      }
    });

    st.register({
      id: "edge/live-neutral", group: "edge", title: "真站：全表平均倍率＝1.00×（重分配不加發）", env: "both",
      run: function (t) {
        var m = CORE.meanWeight("live");
        t.ok(Math.abs(m - 1) <= 0.02, "真站平均倍率應為 1.00×（±0.02），實際 " + m.toFixed(4));
      }
    });

    st.register({
      id: "edge/monotone", group: "edge", title: "倍率隨莊家成本單調不減", env: "both",
      run: function (t) {
        var ks = CORE.keys().slice().sort(function (a, b) { return CORE.EDGE[a] - CORE.EDGE[b]; });
        ["demo", "live"].forEach(function (mode) {
          for (var i = 1; i < ks.length; i++) {
            var lo = CORE.weightFor(ks[i - 1], mode), hi = CORE.weightFor(ks[i], mode);
            t.ok(hi >= lo - 1e-9, mode + " 模式下 " + ks[i] + "(" + CORE.EDGE[ks[i]] + "%) 的倍率 " +
              hi + " 不應低於較低成本的 " + ks[i - 1] + "(" + CORE.EDGE[ks[i - 1]] + "%) 的 " + lo);
          }
        });
      }
    });

    st.register({
      id: "edge/unknown-neutral", group: "edge", title: "未登記遊戲一律 1.00×（漏登記只退化不出錯）", env: "both",
      run: function (t) {
        t.ok(CORE.edgeOf("no-such-game-xyz") === null, "未登記遊戲的 edgeOf 應為 null");
        ["demo", "live"].forEach(function (mode) {
          t.ok(CORE.weightFor("no-such-game-xyz", mode) === 1, mode + " 模式未登記遊戲應恰為 1.00×");
          t.ok(CORE.weightedFor("no-such-game-xyz", 1234, mode) === 1234, mode + " 模式未登記遊戲加權後應等於原額");
        });
        t.ok(CORE.weightFor("slot", "demo") === 1, "Shadow Ritual（無 RTP 模型）應走未登記路徑＝1.00×");
      }
    });

    st.register({
      id: "edge/weighted-int", group: "edge", title: "加權金額為非負整數且零注不放大", env: "both",
      run: function (t) {
        ["demo", "live"].forEach(function (mode) {
          t.ok(CORE.weightedFor("dice", 0, mode) === 0, "零注加權後應為 0");
          t.ok(CORE.weightedFor("dice", -50, mode) === 0, "負注加權後應為 0");
          var w = CORE.weightedFor("pirots", 1000, mode);
          t.ok(w === Math.round(w) && w > 0, mode + " 模式加權金額應為正整數，實際 " + w);
        });
        // 假站高成本遊戲確實比低成本遊戲累積更多（本卡的核心行為）
        t.ok(CORE.weightedFor("pirots", 10000, "demo") > CORE.weightedFor("dice", 10000, "demo"),
          "假站：3.855% 的 pirots 每注應比 1% 的 dice 累積更多經驗");
      }
    });

    if (isNode) return;

    st.register({
      id: "edge/wired", group: "edge", title: "中央結算點確實採用 HL.edge 加權 VIP／賽季", env: "browser",
      run: function (t) {
        t.isFn(HL && HL.edge && HL.edge.weighted, "HL.edge.weighted 應存在");
        t.isFn(HL && HL.liveStats && HL.liveStats.record, "中央結算點應存在");
        var src = String(HL.liveStats.record);
        t.ok(/HL\.edge/.test(src), "liveStats.record 原始碼應引用 HL.edge");
        // 加權金額只能餵進度，不得外流到帳本/彩金/返水
        t.ok(/HL\.ledger\.record\("bet", *bet\b/.test(src), "帳本必須記真實 bet，不得記加權額");
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

  // 站別感知：真站中性、假站寬鬆（切站＝reload，故每次即時讀即可）
  function mode() { return HL.site && HL.site.mode ? HL.site.mode() : "demo"; }
  function weight(game) { return weightFor(game, mode()); }
  function weighted(game, bet) { return weightedFor(game, bet, mode()); }

  // 依倍率高→低列出（附遊戲顯示名，取 HL.games 標題、無則用 key）
  function list() {
    var m = mode();
    return keys().map(function (k) {
      var g = (HL.games && HL.games.byId) ? HL.games.byId(k) : null;
      return { key: k, title: (g && g.title) || k, edge: EDGE[k], weight: weightFor(k, m) };
    }).sort(function (a, b) { return b.weight - a.weight || a.key.localeCompare(b.key); });
  }

  function row(r) {
    return el("div", { class: "ax-edge__row" }, [
      el("span", { class: "ax-edge__name", text: r.title }),
      el("small", { class: "ax-muted", text: r.edge.toFixed(2) + "%" }),
      el("b", { class: "ax-edge__mult", text: r.weight.toFixed(2) + "×" })
    ]);
  }

  function open() {
    var live = mode() === "live";
    var head = el("div", { class: "ax-edge__row ax-edge__row--head" }, [
      el("span", { text: t("遊戲", "遊戲") }),
      el("small", { text: t("莊家優勢", "莊家優勢") }),
      el("b", { text: t("經驗倍率", "經驗倍率") })
    ]);
    var body = el("div", { class: "ax-edge__list" }, [head].concat(list().map(row)));
    // ⚠️ HL.ui.modal 為位置引數 modal(title, bodyNodes, opts)——非物件形式（首版誤用物件、preview 抓到零列渲染）
    HL.ui.modal(t("XP 成本加權", "XP 成本加權"), [
      el("div", {}, [
        el("p", { class: "ax-muted", style: "margin:0 0 8px",
          text: t("VIP 與賽季經驗依各遊戲的理論莊家成本加權：對莊家成本較高的遊戲，每一注累積較多經驗。實際下注金額、返水、彩金與帳目一律不受影響。",
                  "VIP 與賽季經驗依各遊戲的理論莊家成本加權：對莊家成本較高的遊戲，每一注累積較多經驗。實際下注金額、返水、彩金與帳目一律不受影響。") }),
        el("p", { class: "ax-muted", style: "margin:0 0 10px",
          text: live ? t("真站中性模式：全站平均倍率為 1.00×，只重新分配經驗、不額外加發。",
                         "真站中性模式：全站平均倍率為 1.00×，只重新分配經驗、不額外加發。")
                     : t("假站寬鬆模式：最低倍率為 1.00×，沒有任何遊戲比改版前更慢。",
                         "假站寬鬆模式：最低倍率為 1.00×，沒有任何遊戲比改版前更慢。") }),
        body,
        el("p", { class: "ax-muted", style: "margin:10px 0 0",
          text: t("未列出的遊戲一律為 1.00×，不受加權影響。", "未列出的遊戲一律為 1.00×，不受加權影響。") })
      ])
    ], { wide: true });
  }

  HL.edge = {
    weight: weight, weighted: weighted, edgeOf: edgeOf, register: registerEdge,
    list: list, keys: keys, mode: mode, open: open,
    weightFor: weightFor, weightedFor: weightedFor, meanWeight: meanWeight, meanShape: meanShape
  };

  /* #72 說明中心：莊家優勢由本模組自己解釋。**逐款數字直接讀 list()**，
   * 不手抄任何一個百分比 ⇒ 調整 EDGE 表時說明自動跟著改，不會出現兩份真相。 */
  if (HL.support && HL.support.register) {
    HL.support.register({
      id: "edge/table", cat: "rules", order: 10,
      title: "每款遊戲的莊家優勢（house edge）是多少？",
      keys: ["house edge", "莊家優勢", "抽水", "rtp", "賠率"],
      body: function () {
        var rows = list() || [];
        if (!rows.length) return "逐遊戲莊家優勢表尚未載入。";
        var lo = null, hi = null;
        rows.forEach(function (r) {
          var e = +r.edge; if (!(e >= 0)) return;
          if (lo == null || e < lo) lo = e; if (hi == null || e > hi) hi = e;
        });
        return "平台已為 " + rows.length + " 款遊戲逐一列出莊家優勢，目前區間約 "
             + (lo == null ? "—" : (lo * 100).toFixed(2) + "%") + " 至 "
             + (hi == null ? "—" : (hi * 100).toFixed(2) + "%") + "。"
             + "莊家優勢越低，長期期望損耗越小；本表同時決定成長進度的成本加權（#50），"
             + "亦即低莊優遊戲累積 VIP／賽季經驗較慢，但金額與帳目一律照實計算。";
      },
      action: { label: "查看逐款對照表", run: function () { open(); } }
    });
  }

  /* #90 經濟旋鈕自我描述：本表的旋鈕全部**當場從 EDGE 表求值**，不手抄任何數字
   * ⇒ 加一款遊戲或改一個 edge 值，儀表板顯示的平均倍率自動跟著改。
   * 刻意**不宣告 strict**：本表只縮放 VIP/賽季經驗（金錢與帳目一律真實），
   * 且兩站的縮放性質不同（假站地板 1.00×／真站平均 1.00×）＝方向比較無意義。 */
  if (HL.econCfg && HL.econCfg.register) {
    HL.econCfg.register({
      id: "edge", label: "成本加權係數（#50）", icon: "⚖️", order: 30,
      describe: function () {
        return [
          { key: "games", label: "已登記遊戲數", demo: keys().length, live: keys().length, unit: " 款", note: "未登記者一律走中性倍率" },
          { key: "neutral", label: "未登記遊戲倍率", demo: NEUTRAL, live: NEUTRAL, unit: "×", note: "＝維持加權前的舊行為" },
          { key: "span", label: "倍率跨幅 SPAN", demo: SPAN, live: SPAN, unit: "×", note: "edge " + EDGE_MIN + "%→" + EDGE_MAX + "% 線性映射到 1.00×→" + round2(1 + SPAN) + "×" },
          { key: "mean", label: "全表平均倍率", demo: round2(meanWeight("demo")), live: round2(meanWeight("live")), unit: "×", note: "真站以全表平均為 1.00× 中性縮放；假站以最低 edge 為地板" }
        ];
      }
    });
  }

  // 載入序脫鉤（#101）：現排在 selftest.js 之後走直通；else 分支保證重排也不會靜默掉測項。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : this);

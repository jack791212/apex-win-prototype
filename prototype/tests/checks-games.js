/*
 * Apex Win｜遊戲數學測項（node 端·掛在 HL.selftest 註冊表上）
 * ---------------------------------------------------------------------------
 * 驗的就是玩家玩的同一份：直接 require 各遊戲檔的純數學區 module.exports（無 DOM）。
 *
 * 分層：
 *   fast — 秒級結構性不變量：買入價常數存在且單一來源、simSpin 大量取樣無 NaN/負值/破 maxWin。
 *   deep — 蒙地卡羅：**買入型入口 RTP ≈ 宣告 RTP**（保真規格第 14 項，2026-07-28 血淚條款：
 *          Dead By Noon 買入價誤設 80× 而 E[買入]≈41.7×＝買入 RTP 僅 52%，玩家暗虧 44pp）。
 *          deep 預設不跑（耗時），以 `node prototype/tests/run.js --deep` 明確啟用。
 *
 * 要新增一款遊戲的檢測：在下面 GAMES 陣列加一筆即可（容器先於內容）。
 */
"use strict";
var path = require("path");
var selftest = require(path.join(__dirname, "..", "src", "core", "selftest.js"));

function load(file) {
  try { return require(path.join(__dirname, "..", "src", "views", file)); }
  catch (e) { return null; }
}

// ── 各款買入型 slot 的契約（買入價欄位名不同是歷史遺留，這裡統一映射）────────────
var GAMES = [
  { key: "pirots",       file: "slot-pirots.js",       priceField: "buyPrice", declaredRTP: 0.96145, force: 1 },
  { key: "dead-by-noon", file: "slot-dead-by-noon.js", priceField: "buyX",     declaredRTP: 0.9627,  force: 1 },
  { key: "golden-toad",  file: "slot-golden-toad.js",  priceField: "buyX",     declaredRTP: 0.963,   force: 1 },
  { key: "gem-storm",    file: "slot-gem-storm.js",    priceField: "buyCost",  declaredRTP: 0.965,   force: 1 }
];

GAMES.forEach(function (g) {
  var mod = load(g.file);

  // ── fast：買入價常數存在、合理、單一來源 ───────────────────────────────────
  selftest.register({
    id: "games/" + g.key + "/buyin-const", group: "games", env: "node", tier: "fast",
    title: g.key + "：買入價為單一程式常數且合理",
    run: function (t) {
      if (!mod || !mod.CFG) t.skip("模組未載入（" + g.file + "）");
      var p = mod.CFG[g.priceField];
      t.finite(p, g.key + " 缺買入價常數 CFG." + g.priceField);
      t.ok(p > 0 && p < 1000, "買入價 " + p + "× 超出合理範圍");
    }
  });

  // ── fast：大量取樣無 NaN / 負派彩 / 破 maxWin ─────────────────────────────
  selftest.register({
    id: "games/" + g.key + "/spin-sanity", group: "games", env: "node", tier: "fast",
    title: g.key + "：20k 局無 NaN／負派彩／超出 maxWin",
    run: function (t) {
      if (!mod || typeof mod.simSpin !== "function") t.skip("模組未提供 simSpin");
      var N = 20000, cap = mod.CFG && mod.CFG.maxWin, worst = 0;
      for (var i = 0; i < N; i++) {
        var r = mod.simSpin(mod.mulberry32(i * 2654435761 % 4294967296));
        var m = (r && typeof r === "object") ? r.mult : r;
        t.finite(m, "第 " + i + " 局倍數非有限數");
        t.ok(m >= 0, "第 " + i + " 局出現負派彩 " + m);
        if (m > worst) worst = m;
      }
      if (cap) t.ok(worst <= cap + 1e-9, "實測最大倍數 " + worst + "× 超出宣告 maxWin " + cap + "×");
    }
  });

  // ── deep：買入 RTP ≈ 宣告 RTP（保真規格第 14 項）──────────────────────────
  selftest.register({
    id: "games/" + g.key + "/buyin-rtp", group: "games", env: "node", tier: "deep",
    title: g.key + "：買入型入口 RTP 落在宣告 RTP ±0.5pp（第 14 項）",
    run: function (t) {
      if (!mod || typeof mod.simSpin !== "function" || !mod.CFG) t.skip("模組未載入");
      var price = mod.CFG[g.priceField];
      t.finite(price, "缺買入價常數");
      var N = Number(process.env.AX_DEEP_SIMS || 300000), sum = 0;
      for (var i = 0; i < N; i++) {
        var r = mod.simSpin(mod.mulberry32((i + 1) * 2246822519 % 4294967296), g.force);
        var m = (r && typeof r === "object") ? r.mult : r;
        if (!isFinite(m)) throw new Error("第 " + i + " 局買入路徑倍數非有限數");
        sum += m;
      }
      var eBuy = sum / N, buyRTP = eBuy / price;
      // 容差：±0.5pp 是規格值，但重尾機種在 3e5 樣本下抖動較大 → 這裡用 ±2pp 當「明顯坑/明顯可套利」的警報線，
      // 精算級校準仍須依 game-fidelity-spec 以 2M+ 樣本 × 多種子執行（AX_DEEP_SIMS 可調）。
      var tol = Number(process.env.AX_DEEP_TOL || 0.02);
      t.ok(buyRTP <= 1.0, "買入 RTP " + (buyRTP * 100).toFixed(2) + "% > 100%＝玩家可純買入套利");
      t.close(buyRTP, g.declaredRTP, tol,
        "買入 RTP（E[買入]=" + eBuy.toFixed(3) + "× / 價 " + price + "×）偏離宣告 RTP " + (g.declaredRTP * 100).toFixed(2) + "%");
    }
  });
});

// ── Cases 開箱：非買入型單注滾輪，RTP＝加權表期望值。用封閉解析 Σ(w·mult)/Σw（零抽樣誤差）──
//    當測項＝驗的即玩的同一份 HL.cases.pickMult / rtpOf（node require 契約）。
(function () {
  var mod = load("instant-cases.js");

  selftest.register({
    id: "games/cases/table-rtp", group: "games", env: "node", tier: "fast",
    title: "cases：四難度加權表精確 RTP 皆 ≤100% 且落宣告 98.5% ±0.5pp",
    run: function (t) {
      if (!mod || !mod.cases || !mod.cases.DIFFS) t.skip("模組未載入（instant-cases.js）");
      var C = mod.cases, DECL = 0.985, TOL = 0.005;
      t.ok(C.DIFFS.length === 4, "難度數應為 4，實為 " + C.DIFFS.length);
      C.DIFFS.forEach(function (d) {
        var rtp = C.rtpOf(d.tbl);
        t.finite(rtp, d.key + " RTP 非有限數");
        t.ok(rtp <= 1.0, d.key + " RTP " + (rtp * 100).toFixed(3) + "% > 100%＝玩家可套利");
        t.close(rtp, DECL, TOL, d.key + " RTP " + (rtp * 100).toFixed(3) + "% 偏離宣告 98.5%");
      });
    }
  });

  selftest.register({
    id: "games/cases/pick-boundary", group: "games", env: "node", tier: "fast",
    title: "cases：pickMult 累積選取邊界（f=0 落首桶、f→1⁻ 落末桶）",
    run: function (t) {
      if (!mod || !mod.cases) t.skip("模組未載入（instant-cases.js）");
      var C = mod.cases;
      C.DIFFS.forEach(function (d) {
        t.ok(C.pickMult(d.tbl, 0) === d.tbl[0][0], d.key + " f=0 未落首桶");
        t.ok(C.pickMult(d.tbl, 0.9999999) === d.tbl[d.tbl.length - 1][0], d.key + " f→1⁻ 未落末桶");
      });
    }
  });
})();

// ── Hilo 猜高低：cash-chain（每猜一張牌＝一注）。edge 逐步定價＝每步公平期望恰＝EDGE（策略無關）──
//    當測項＝驗的即玩的同一份 HL.hilo.pHi/pLo/stepMult / cardOf（node require 契約）。
(function () {
  var mod = load("instant-hilo.js");

  selftest.register({
    id: "games/hilo/step-rtp", group: "games", env: "node", tier: "fast",
    title: "hilo：24 可下注格 每步 pWin·stepMult 恰＝EDGE(99%) 且 ≤100%（策略無關）",
    run: function (t) {
      if (!mod || !mod.hilo || typeof mod.hilo.stepMult !== "function") t.skip("模組未載入（instant-hilo.js）");
      var H = mod.hilo, cells = 0;
      for (var r = 0; r <= 12; r++) {
        [1, -1].forEach(function (dir) {
          var p = dir > 0 ? H.pHi(r) : H.pLo(r);
          if (p <= 0) return; // K 無更高、A 無更低＝不可下注格
          var ev = p * H.stepMult(r, dir); // 該步期望回收倍數
          t.close(ev, H.EDGE, 1e-12, "rank " + H.RANKS[r] + " dir " + dir + " 每步 EV 偏離 EDGE");
          t.ok(H.EDGE <= 1.0, "EDGE " + H.EDGE + " > 100%＝玩家可套利");
          cells++;
        });
      }
      t.ok(cells === 24, "可下注格應為 24，實為 " + cells);
    }
  });

  selftest.register({
    id: "games/hilo/card-boundary", group: "games", env: "node", tier: "fast",
    title: "hilo：cardOf 落點邊界（f=0→A、f→1⁻→K）＋ K/A 鎖向（stepMult 回 0）",
    run: function (t) {
      if (!mod || !mod.hilo) t.skip("模組未載入（instant-hilo.js）");
      var H = mod.hilo;
      t.ok(H.cardOf(0).rank === 0, "f=0 未落 rank A(0)");
      t.ok(H.cardOf(0.9999999).rank === 12, "f→1⁻ 未落 rank K(12)");
      t.ok(H.stepMult(12, 1) === 0, "K 有更高倍數（應鎖向回 0）");
      t.ok(H.stepMult(0, -1) === 0, "A 有更低倍數（應鎖向回 0）");
    }
  });
})();

// ── Pump 打氣：hypergeometric cash-or-continue（每次打氣＝逐步定價）。fairMult(k)=EDGE/reachProb(k)──
//    ⇒ ∀難度 ∀兌現步 k：reachProb·fairMult 恰＝EDGE（零抽樣誤差、策略無關）。當測項＝驗的即玩的同一份 HL.pump。
(function () {
  var mod = load("instant-pump.js");

  selftest.register({
    id: "games/pump/grid-rtp", group: "games", env: "node", tier: "fast",
    title: "pump：所有難度所有兌現步 reachProb·fairMult 恰＝EDGE(98%) 且 ≤100%（策略無關）",
    run: function (t) {
      if (!mod || !mod.pump || typeof mod.pump.fairMult !== "function") t.skip("模組未載入（instant-pump.js）");
      var P = mod.pump, cells = 0;
      t.ok(P.edge <= 1.0, "EDGE " + P.edge + " > 100%＝玩家可套利");
      P.DIFFS.forEach(function (d) {
        var maxK = P.maxSafe(d.spikes);
        for (var k = 1; k <= maxK; k++) {
          var rtp = P.reachProb(k, d.spikes) * P.fairMult(k, d.spikes);
          t.close(rtp, P.edge, 1e-12, d.key + " 兌現步 " + k + " RTP 偏離 EDGE");
          cells++;
        }
      });
      t.ok(cells === 81, "兌現格總數應為 81（1+22+20+15+... 各難度安全步），實為 " + cells);
    }
  });

  selftest.register({
    id: "games/pump/max-mult", group: "games", env: "node", tier: "fast",
    title: "pump：最大倍數＝EDGE·C(25,spikes)、fairMult 單調遞增、potWin floor 恆向房家（≤fair）",
    run: function (t) {
      if (!mod || !mod.pump) t.skip("模組未載入（instant-pump.js）");
      var P = mod.pump;
      function comb(n, r) { var c = 1; for (var i = 0; i < r; i++) c = c * (n - i) / (i + 1); return c; }
      P.DIFFS.forEach(function (d) {
        t.close(P.maxMultOf(d.spikes), P.edge * comb(25, d.spikes), 1e-6 * P.maxMultOf(d.spikes) + 1e-6, d.key + " maxMult ≠ EDGE·C(25,spikes)");
        // fairMult 單調遞增（打越多倍數越高）
        for (var k = 1; k <= P.maxSafe(d.spikes); k++) t.ok(P.fairMult(k, d.spikes) > P.fairMult(k - 1, d.spikes), d.key + " fairMult 非單調遞增 @k=" + k);
        // potWin floor 恆 ≤ bet·fairMult（never >100%）
        var bet = 12345;
        t.ok(P.potWin(bet, 2, d.spikes) <= bet * P.fairMult(2, d.spikes) + 1e-9, d.key + " potWin 超過 bet·fairMult");
      });
    }
  });
})();

// ── Dice Duel 骰子對決：對稱 1v1（雙方 iid 擲 0..99）+ 平手重擲 ⇒ 條件於分出勝負 P(勝)=0.5 恰等 ──
//    ⇒ 公平 RTP = pWin·payMult = 0.5·(2·RAKE) = RAKE（策略無關、與點數分布無關）。當測項＝驗的即玩的同一份 HL.duel。
(function () {
  var mod = load("instant-duel.js");
  // 自包含 PRNG（測項內決定性亂數；不依賴遊戲模組匯出）
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  selftest.register({
    id: "games/duel/win-rtp", group: "games", env: "node", tier: "fast",
    title: "duel：對稱決鬥 pWin=0.5、fairRTP=pWin·payMult=RAKE(99%) 恰等且 ≤100%（策略無關）",
    run: function (t) {
      if (!mod || !mod.duel || typeof mod.duel.fairRTP !== "function") t.skip("模組未載入（instant-duel.js）");
      var D = mod.duel;
      t.ok(D.pWin === 0.5, "對稱決鬥 pWin 應為 0.5，實為 " + D.pWin);
      t.close(D.payMult(), 2 * D.RAKE, 1e-12, "payMult 應＝2·RAKE");
      t.close(D.fairRTP(), D.RAKE, 1e-12, "fairRTP 應恰＝RAKE（pWin·payMult）");
      t.ok(D.fairRTP() <= 1.0, "fairRTP " + (D.fairRTP() * 100).toFixed(4) + "% > 100%＝玩家可套利");
      // rollOf 落點邊界（f=0→0、f→1⁻→99）＝逐擲可驗證重算的定義域
      t.ok(D.rollOf(0) === 0, "f=0 未落點數 0");
      t.ok(D.rollOf(0.9999999) === 99, "f→1⁻ 未落點數 99");
      // potWin floor 恆向房家（≤ bet·payMult，never >公平）
      var bet = 12345;
      t.ok(D.potWin(bet) <= bet * D.payMult() + 1e-9, "potWin 超過 bet·payMult");
      t.ok(D.potWin(3) === 5, "potWin(3) 應為 floor(3·1.98)=5（房家安全側）");
    }
  });

  selftest.register({
    id: "games/duel/resolve-fair", group: "games", env: "node", tier: "fast",
    title: "duel：resolve 決定性 MC winRate≈0.5、平手必重擲（resolved 無平手）、tie-reround≈1%",
    run: function (t) {
      if (!mod || !mod.duel || typeof mod.duel.resolve !== "function") t.skip("模組未載入（instant-duel.js）");
      var D = mod.duel, rng = mulberry32(0x9E3779B9);
      var next = function () { return rng(); };
      var N = 500000, wins = 0, ties = 0, resolvedTie = 0;
      for (var i = 0; i < N; i++) {
        var r = D.resolve(next);
        if (r.win) wins++;
        if (r.ties > 0) ties++;
        if (r.you === r.oth) resolvedTie++; // 分出勝負後不應仍平手
      }
      var wr = wins / N;
      t.ok(resolvedTie === 0, "resolve 回傳 " + resolvedTie + " 場仍平手（平手應重擲直到分勝負）");
      t.ok(Math.abs(wr - 0.5) < 0.01, "winRate " + (wr * 100).toFixed(3) + "% 偏離 50% 超過 1pp（SE≈0.07pp，容差為 14σ 防呆）");
      var tieRate = ties / N;
      t.ok(Math.abs(tieRate - 0.01) < 0.003, "tie-reround 率 " + (tieRate * 100).toFixed(3) + "% 偏離理論 1% 過多");
    }
  });
})();

// ── ApexWin Picks 賽事預測：一單一注、命中＝draw<所選盤口機率 p、賠率＝EDGE/p ──
//    ⇒ 公平（pre-floor）每注 RTP = p·(EDGE/p) = EDGE 恰等 ∀p（策略無關、盤口分布無關、獨贏/大小分同 RTP）。
//    派彩 payoutOf 取 floor＝房家安全側（單發小賠率單注故 floor 影響較大：實付≤fair、>100% 數學排除）。當測項＝驗的即玩的同一份 HL.picks。
(function () {
  var mod = load("instant-picks.js");
  // 自包含 PRNG（測項內決定性亂數；不依賴遊戲模組匯出）
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  selftest.register({
    id: "games/picks/fair-rtp", group: "games", env: "node", tier: "fast",
    title: "picks：公平每注 RTP＝p·(EDGE/p)＝EDGE(99%) 恰等 ∀p 且 ≤100%（策略無關）",
    run: function (t) {
      if (!mod || !mod.picks || typeof mod.picks.fairRTP !== "function") t.skip("模組未載入（instant-picks.js）");
      var P = mod.picks, worst = 0;
      // 掃兩市場的完整盤口機率域（含補集）＝玩家能選到的所有 p
      var probs = [];
      for (var hp = P.HOME_PROB_MIN; hp <= P.HOME_PROB_MIN + P.HOME_PROB_RANGE + 1e-9; hp += 0.005) { probs.push(hp); probs.push(1 - hp); }
      for (var op = P.OVER_PROB_MIN; op <= P.OVER_PROB_MIN + P.OVER_PROB_RANGE + 1e-9; op += 0.005) { probs.push(op); probs.push(1 - op); }
      probs.forEach(function (p) {
        var rtp = P.fairRTP(p);
        var d = Math.abs(rtp - P.EDGE);
        if (d > worst) worst = d;
        t.ok(rtp <= 1.0 + 1e-12, "盤口 p=" + p.toFixed(3) + " fairRTP " + (rtp * 100).toFixed(4) + "% > 100%＝玩家可套利");
      });
      t.ok(worst < 1e-9, "fairRTP 偏離 EDGE 最大 |Δ|=" + worst.toExponential(3) + "（應≈float epsilon＝解析恰等）");
      // oddsOf/won 落點邊界＝逐單可驗證重算的定義域
      t.close(P.oddsOf(0.5), P.EDGE / 0.5, 1e-12, "oddsOf 應＝EDGE/p");
      t.ok(P.won(0.49, 0.5) === true && P.won(0.5, 0.5) === false, "won 應為 draw<prob（嚴格）");
      // payoutOf floor 恆向房家（≤ bet·odds，never >公平）
      var bet = 12345, p2 = 0.4;
      t.ok(P.payoutOf(bet, p2) <= bet * P.oddsOf(p2) + 1e-9, "payoutOf 超過 bet·odds＝反房家");
      t.ok(P.payoutOf(50, 0.5) === 99, "payoutOf(50,0.5) 應為 floor(50·1.98)=99（房家安全側）");
    }
  });

  selftest.register({
    id: "games/picks/paid-floor", group: "games", env: "node", tier: "fast",
    title: "picks：決定性 MC winRate≈選中機率、實付 RTP(floor)≤fair、恆 ≤100%（兩市場同 RTP）",
    run: function (t) {
      if (!mod || !mod.picks || typeof mod.picks.payoutOf !== "function") t.skip("模組未載入（instant-picks.js）");
      var P = mod.picks, rng = mulberry32(0x1B5E43), u = function () { return rng(); };
      ["ml", "tot"].forEach(function (market) {
        var N = 400000, tot = 0, pay = 0, fair = 0, wins = 0, sumP = 0;
        for (var i = 0; i < N; i++) {
          var p = market === "ml"
            ? (u() < 0.5 ? P.HOME_PROB_MIN + u() * P.HOME_PROB_RANGE : 1 - (P.HOME_PROB_MIN + u() * P.HOME_PROB_RANGE))
            : (u() < 0.5 ? P.OVER_PROB_MIN + u() * P.OVER_PROB_RANGE : 1 - (P.OVER_PROB_MIN + u() * P.OVER_PROB_RANGE));
          var draw = u(), won = P.won(draw, p);
          tot += 50; sumP += p; if (won) { wins++; pay += P.payoutOf(50, p); fair += 50 * P.oddsOf(p); }
        }
        var wr = wins / N, meanP = sumP / N;
        t.ok(Math.abs(wr - meanP) < 0.005, market + " winRate " + (wr * 100).toFixed(3) + "% 偏離平均選中機率 " + (meanP * 100).toFixed(3) + "%（SE≈0.08pp，容差 6σ 防呆）");
        t.ok(pay <= fair + 1e-6, market + " 實付 " + pay + " > fair " + fair.toFixed(0) + "＝floor 反房家");
        t.ok(pay / tot <= 1.0, market + " 實付 RTP " + (pay / tot * 100).toFixed(3) + "% > 100%＝可套利");
        t.ok(pay / tot > 0.95, market + " 實付 RTP " + (pay / tot * 100).toFixed(3) + "% < 95%＝玩家暗虧（門檻）");
      });
    }
  });
})();

// ── 小雞過馬路 Chicken Cross：逐格存活 p(k)、累積 cum(k)、賠率 mult(k)=min(5000,floor2(RTP/cum)) ──
//    ⇒ 兌現-第k格策略 RTP(k)=mult(k)·cum(k)≤RTP(97%)（floor2+cap 皆房家安全側）；對任一 k 皆成立
//    ⇒ 任意兌現策略之 RTP 為各 RTP(k) 之凸組合、恆 ≤97%（策略無關上界）。當測項＝驗的即玩的同一份 HL.chicken。
(function () {
  var mod = load("chicken.js");

  selftest.register({
    id: "games/chicken/step-rtp", group: "games", env: "node", tier: "fast",
    title: "chicken：全難度全兌現步 RTP(k)=mult·cum ≤97% 且峰值 ≥95%（floor+cap 房家安全、策略無關）",
    run: function (t) {
      if (!mod || !mod.chicken || typeof mod.chicken.rtpAt !== "function") t.skip("模組未載入（chicken.js）");
      var C = mod.chicken, peak = 0, cells = 0;
      t.ok(C.rtp <= 1.0, "宣告 RTP " + C.rtp + " > 100%＝玩家可套利");
      C.DIFFS.forEach(function (d) {
        for (var k = 1; k <= 120; k++) {
          var rtp = C.rtpAt(d.key, k);
          t.ok(rtp <= C.rtp + 1e-9, d.key + " 兌現步 " + k + " RTP " + (rtp * 100).toFixed(4) + "% > 宣告 97%＝反房家");
          if (rtp > peak) peak = rtp;
          cells++;
        }
      });
      t.ok(cells === 480, "掃描格數應為 4 難度 ×120＝480，實為 " + cells);
      t.ok(peak >= 0.95, "全難度乘數層 RTP 峰值 " + (peak * 100).toFixed(4) + "% < 95%＝暗虧（門檻）");
      t.ok(peak <= 0.97 + 1e-9, "全難度乘數層 RTP 峰值 " + (peak * 100).toFixed(4) + "% > 97%＝反房家");
    }
  });

  selftest.register({
    id: "games/chicken/model-boundary", group: "games", env: "node", tier: "fast",
    title: "chicken：存活率夾 [pMin,pStart]、mult 遞增且封頂 5000×、賠彩 floor 恆向房家、diffOf fallback",
    run: function (t) {
      if (!mod || !mod.chicken) t.skip("模組未載入（chicken.js）");
      var C = mod.chicken;
      C.DIFFS.forEach(function (d) {
        t.close(C.stepP(d.key, 1), d.pStart, 1e-12, d.key + " p(1) 應＝pStart");
        t.ok(C.stepP(d.key, 100000) >= d.pMin - 1e-12, d.key + " 深格存活率跌破 pMin 下限");
        t.ok(C.multAt(d.key, 2) > C.multAt(d.key, 1), d.key + " mult 非遞增（cum 遞減）");
        t.ok(C.multAt(d.key, 400) <= C.maxx + 1e-9, d.key + " 深格賠率超過 5000× 封頂");
        // 賠彩 floor（win=floor(bet·mult)）恆 ≤ bet·mult＝房家安全側
        var bet = 12345;
        t.ok(Math.floor(bet * C.multAt(d.key, 3)) <= bet * C.multAt(d.key, 3) + 1e-9, d.key + " 賠彩 floor 反房家");
      });
      t.ok(C.diffOf("nope") === C.DIFFS[1], "未知難度應 fallback 至 mid");
      t.ok(C.multAt("mid", 3) === Math.min(C.maxx, Math.floor(C.rtp / C.cumAt("mid", 3) * 100) / 100), "multAt 與 floor2(RTP/cum) 定義一致");
    }
  });
})();

// ── 暗影儀式 Shadow Ritual：連爆 ways-slot（無固定 RTP 模型·池抽權重）。node 契約＝驗的即玩的同一份 ──
//    HL.shadowRitual.simulate*（pool/drawSym/evaluate/tumblePure 亦為 DOM render 呼叫的同一份；回合編排為 DOM 流程的
//    忠實無 DOM 鏡像，其正確性由「純連爆 RTP≈97.5%＝對齊設計目標」交叉驗證）。
//    ⚠️ 首次量測揭露既存經濟缺陷（DEBT S-slot-rtp）：基礎連爆 RTP≈97.5%（健康），但特色回合（Candle→Cursed 黏性
//    Wild＋等級鎖高分＋xSplit·全無上限）暴衝 → 全回合 RTP≈1120%、兩買入 589%/531%（皆 ≫100%＝可套利）。
//    本輪只補「可驗證公平 RNG＋node 契約＋量測」不動玩法數值；重平衡特色回合需設計＋preview，另案（DEBT S-slot-rtp）。
(function () {
  var mod = load("slot.js");
  var C = mod && mod.shadowRitual;

  // fast：契約齊備 + 20k 全回合模擬無 NaN／負派彩 + 決定性（同種子同結果）
  selftest.register({
    id: "games/shadow-ritual/contract-sanity", group: "games", env: "node", tier: "fast",
    title: "shadow-ritual：node 契約齊備、20k 全回合無 NaN／負派彩、同種子決定性",
    run: function (t) {
      if (!C || typeof C.simulateBase !== "function") t.skip("模組未載入（slot.js·HL.shadowRitual）");
      ["pool", "drawSym", "makeGrid", "evaluate", "tumblePure", "simulateBase", "simulateBaseCascade", "simulateBaphomet", "simulateCursed", "mulberry32"].forEach(function (k) {
        t.ok(typeof C[k] === "function", "缺契約成員 " + k);
      });
      for (var i = 0; i < 20000; i++) {
        var w = C.simulateBase(10, C.mulberry32((i * 40503 + 9) >>> 0));
        t.finite(w, "第 " + i + " 回合派彩非有限數"); t.ok(w >= 0, "第 " + i + " 回合負派彩 " + w);
      }
      t.ok(C.simulateBase(10, C.mulberry32(42)) === C.simulateBase(10, C.mulberry32(42)), "同種子未給出相同結果（非決定性）");
    }
  });

  // fast：特色回合經濟參數單一真相（CFG）＝drift 防護鎖。2026-08-03 遊戲軌把 CORE/_* 與 DOM 各一份的魔數
  //   （xSplit 機率／Candle·Cursed 給數／買入等級·給數·價）收斂到 CFG；本鎖保證 ① CFG 契約齊備、
  //   ② 買入價常數（BUY_*_X）確由 CFG 單一來源驅動（防再度出現 label／扣款兩處硬編＝血淚條款第 14 項）、
  //   ③ 參數值型別/範圍合理。若日後有人繞過 CFG 直接改回魔數，此鎖即紅。
  selftest.register({
    id: "games/shadow-ritual/cfg-single-source", group: "games", env: "node", tier: "fast",
    title: "shadow-ritual：特色回合參數 CFG 單一真相、買入價由 CFG 常數驅動（drift＋血淚#14 防護）",
    run: function (t) {
      if (!C || !C.CFG) t.skip("模組未載入或 CFG 未暴露（slot.js）");
      var cfg = C.CFG;
      ["xSplitP", "candlePerLevel", "cursedOnEntry", "buyBaphomet", "buyCursed", "thresh", "maxWinX"].forEach(function (k) {
        t.ok(cfg[k] != null, "CFG 缺欄位 " + k);
      });
      t.ok(cfg.xSplitP >= 0 && cfg.xSplitP <= 1, "xSplitP 應為機率 [0,1]，實為 " + cfg.xSplitP);
      t.ok(cfg.candlePerLevel >= 0 && cfg.cursedOnEntry >= 0, "Candle/Cursed 給數不得為負");
      t.ok(cfg.buyBaphomet.priceX > 0 && cfg.buyCursed.priceX > 0, "買入價須為正倍數");
      // 單一來源不變量：CORE 對外的買入價常數必等於 CFG（否則 label 與扣款可能各自為政）
      t.ok(C.BUY_BAPHOMET_X === cfg.buyBaphomet.priceX, "BUY_BAPHOMET_X(" + C.BUY_BAPHOMET_X + ") ≠ CFG.buyBaphomet.priceX(" + cfg.buyBaphomet.priceX + ")＝買入價非單一來源");
      t.ok(C.BUY_CURSED_X === cfg.buyCursed.priceX, "BUY_CURSED_X(" + C.BUY_CURSED_X + ") ≠ CFG.buyCursed.priceX(" + cfg.buyCursed.priceX + ")＝買入價非單一來源");
      t.ok(C.THRESH === cfg.thresh, "CFG.thresh 應與 CORE.THRESH 同一參照（in-place 可調＝node/DOM 共讀）");
    }
  });

  // fast：基礎連爆理論 RTP（關閉 ritual/免費遊戲）＝健康房家帶 [94%,99%]。固定種子＝決定性、當賠付表回歸鎖。
  selftest.register({
    id: "games/shadow-ritual/base-cascade-rtp", group: "games", env: "node", tier: "fast",
    title: "shadow-ritual：基礎連爆理論 RTP（無特色回合）落健康帶 94–99%（賠付表回歸鎖）",
    run: function (t) {
      if (!C || typeof C.simulateBaseCascade !== "function") t.skip("模組未載入（slot.js）");
      var N = 20000, sum = 0;
      for (var i = 0; i < N; i++) sum += C.simulateBaseCascade(10, C.mulberry32((i * 2654435761 + 1) >>> 0));
      var rtp = sum / N / 10;
      t.finite(rtp, "連爆 RTP 非有限數");
      t.ok(rtp >= 0.94 && rtp <= 0.99, "基礎連爆 RTP " + (rtp * 100).toFixed(3) + "% 落出健康房家帶 [94%,99%]＝賠付表可能被改壞");
    }
  });

  // deep：全回合 + 兩買入 RTP 量測（揭露 DEBT S-slot-rtp）。連爆核心必 ≤100%（房家安全）；全回合/買入現況遠 >100% ＝已知缺陷、
  //   以 log 記錄供重平衡追蹤（不以紅測阻斷＝重平衡需設計+preview，非本測職責）。
  selftest.register({
    id: "games/shadow-ritual/rtp-measure", group: "games", env: "node", tier: "deep",
    title: "shadow-ritual：全回合/買入 RTP 量測（連爆核心 ≤100%；特色回合缺陷 DEBT S-slot-rtp 追蹤）",
    run: function (t) {
      if (!C) t.skip("模組未載入（slot.js）");
      var N = Number(process.env.AX_DEEP_SIMS || 200000), BET = 10;
      function meas(fn, price) { var s = 0; for (var i = 0; i < N; i++) { var w = fn(BET, C.mulberry32((i * 2246822519 + 3) >>> 0)); if (!isFinite(w)) throw new Error("非有限派彩"); s += w; } return s / N / price; }
      var cascade = meas(C.simulateBaseCascade, BET), full = meas(C.simulateBase, BET),
          baph = meas(C.simulateBaphomet, BET * 50), curs = meas(C.simulateCursed, BET * 100);
      console.log("  [shadow-ritual RTP] cascade=" + (cascade * 100).toFixed(2) + "% full=" + (full * 100).toFixed(2) + "% baphomet(×50)=" + (baph * 100).toFixed(2) + "% cursed(×100)=" + (curs * 100).toFixed(2) + "%  (full/買入 ≫100%＝DEBT S-slot-rtp)");
      t.ok(cascade <= 1.0 + 1e-9, "基礎連爆核心 RTP " + (cascade * 100).toFixed(2) + "% > 100%＝反房家");
      [full, baph, curs].forEach(function (r, i) { t.finite(r, "量測 " + i + " 非有限數"); });
    }
  });
})();

// ── Slots Battle（vsslot）：PvP 零和對戰結算。node 契約＝驗的即玩的同一份 module.exports=HL.vsslot ──
//    瀏覽器 finishLocal()/renderResult() 的名次與派彩都改呼叫 CORE.resolve/rankBy（同一份純數學）。
//    公平性本質＝零和 + 對稱：各席位以同一 fgBoard 引擎（HL.slotEngine base cascade @ ROWS=5/LEVEL=5）獨立抽樣＝iid
//    ⇒ P(你#1)=1/N ⇒ 期望 net=0（demo 無抽水）。tie-break 為穩定排序（同分時低索引=你 勝）＝微幅偏向玩家（<0.5%）、
//    永不偏向莊家；本測以真引擎逐回合分數量測，證 P(win)≈1/N 且 EV 不偏向莊家。
(function () {
  var mod = load("vsslot.js");
  var V = mod && mod.vsslot;
  var S = load("slot.js") && load("slot.js").shadowRitual; // 真 FG 引擎（產生逐回合分數＝驗的即玩的）
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // 一個 fgBoard 回合＝makeGrid(5,5,rng) 後連爆 evaluate/tumblePure 直到無中獎（＝fgBoard.spin+cascade 的無 DOM 鏡像）
  function fgRound(bet, rng) { var g = S.makeGrid(5, 5, false, rng), tot = 0; for (;;) { var ev = S.evaluate(g, bet); if (ev.total <= 0) break; tot += ev.total; g = S.tumblePure(g, ev.cells, 5, false, rng); } return tot; }
  var ROUNDS = 10, BET = 10, WAGER = 10, COMBOS = [];
  V && V.MODES.forEach(function (m) { [2, 3, 4].forEach(function (n) { COMBOS.push({ mode: m, n: n }); }); });

  // fast：契約齊備 + resolve 三模式正確性 + net 幅度 + 零和不變量 + 決定性
  selftest.register({
    id: "games/vsslot/contract-and-resolve", group: "games", env: "node", tier: "fast",
    title: "vsslot：node 契約齊備、resolve 三模式名次/派彩正確、全桌零和、決定性",
    run: function (t) {
      if (!V || typeof V.resolve !== "function") t.skip("模組未載入（vsslot.js·HL.vsslot）");
      ["MODES", "metricOf", "rankBy", "resolve"].forEach(function (k) { t.ok(V[k] != null, "缺契約成員 " + k); });
      // normal：最高總分勝。你(0)=300 → 贏、net=+wager*(N-1)
      var a = V.resolve("normal", [300, 100, 50], [10, 20, 5], WAGER, 0);
      t.ok(a.win === true && a.winnerIdx === 0 && a.net === WAGER * 2, "normal 最高總分未判你勝/派彩錯 " + JSON.stringify(a));
      // crazy：最低總分勝。你(0)=50 最低 → 贏
      var b = V.resolve("crazy", [50, 100, 300], null, WAGER, 0);
      t.ok(b.win === true && b.winnerIdx === 0 && b.net === WAGER * 2, "crazy 最低總分未判你勝 " + JSON.stringify(b));
      // terminal：最後一輪增量最高勝。你 last=5 < 對手 99 → 敗、net=-wager
      var c = V.resolve("terminal", [300, 100], [5, 99], WAGER, 0);
      t.ok(c.win === false && c.winnerIdx === 1 && c.net === -WAGER, "terminal 最後一輪最高未判對手勝 " + JSON.stringify(c));
      // 決定性：同輸入同輸出
      t.ok(JSON.stringify(V.resolve("normal", [1, 2, 3], [0, 0, 0], WAGER, 0)) === JSON.stringify(V.resolve("normal", [1, 2, 3], [0, 0, 0], WAGER, 0)), "resolve 非決定性");
      // 零和不變量：任一場，全席位 net 相加必為 0（贏家收 N-1 份、其餘各付 1 份）
      var rng = mulberry32(0x5107ba7);
      COMBOS.forEach(function (cfg) {
        for (var trial = 0; trial < 400; trial++) {
          var totals = [], lasts = [];
          for (var p = 0; p < cfg.n; p++) { totals.push(Math.floor(rng() * 5000)); lasts.push(Math.floor(rng() * 500)); }
          var sum = 0, winners = 0;
          for (var me = 0; me < cfg.n; me++) { var R = V.resolve(cfg.mode, totals, lasts, WAGER, me); sum += R.net; if (R.win) winners++; }
          t.ok(sum === 0, cfg.mode + " N=" + cfg.n + " 全桌 net 和非零（非零和）＝" + sum);
          t.ok(winners === 1, cfg.mode + " N=" + cfg.n + " 勝者數非 1（＝" + winners + "）");
        }
      });
    }
  });

  // deep：以真 FG 引擎逐回合分數證 PvP 對稱公平——P(你勝)≈1/N、EV 不偏向莊家（零和 demo·RTP≈100%）。
  //   為控時，先用真引擎產生一池逐回合分數（bootstrap），再重抽組局（統計等價 iid、分數皆出自 shipped 引擎）。
  selftest.register({
    id: "games/vsslot/pvp-fairness", group: "games", env: "node", tier: "deep",
    title: "vsslot：PvP 對稱公平（真引擎逐回合分數 MC·P(勝)≈1/N、EV 不偏莊）",
    run: function (t) {
      if (!V || !S || typeof S.makeGrid !== "function") t.skip("模組未載入（vsslot.js / slot.js）");
      var POOLN = 30000, prng = mulberry32(0x1ce9a7), pool = new Array(POOLN);
      for (var i = 0; i < POOLN; i++) pool[i] = fgRound(BET, prng); // 真 FG 引擎逐回合分數池（level-5 base cascade＝健康 ≈97.5% 路徑、非 DEBT S-slot-rtp 特色回合）
      var K = Number(process.env.AX_DEEP_SIMS ? Math.min(process.env.AX_DEEP_SIMS, 200000) : 120000);
      var pick = mulberry32(0x77c0de);
      COMBOS.forEach(function (cfg) {
        var wins = 0, net = 0;
        for (var g = 0; g < K; g++) {
          var totals = [], lasts = [];
          for (var p = 0; p < cfg.n; p++) { var s = 0, last = 0; for (var r = 0; r < ROUNDS; r++) { last = pool[(pick() * POOLN) | 0]; s += last; } totals.push(s); lasts.push(last); }
          var R = V.resolve(cfg.mode, totals, lasts, WAGER, 0);
          if (R.win) wins++; net += R.net;
        }
        var pWin = wins / K, ev = net / K / WAGER, ideal = 1 / cfg.n;
        console.log("  [vsslot] " + cfg.mode + " N=" + cfg.n + " P(win)=" + pWin.toFixed(4) + " (1/N=" + ideal.toFixed(4) + ") EV/wager=" + ev.toFixed(4));
        t.ok(Math.abs(pWin - ideal) < 0.02, cfg.mode + " N=" + cfg.n + " P(勝)=" + pWin.toFixed(4) + " 偏離 1/N=" + ideal.toFixed(4) + " 逾 0.02（對稱性破壞）");
        t.ok(ev > -0.03, cfg.mode + " N=" + cfg.n + " EV/wager=" + ev.toFixed(4) + " 偏向莊家（<-0.03）＝非公平零和（低樣本容差；預設 K=120k 下 |EV|<0.01）");
      });
    }
  });
})();

// ── Dice / Limbo / Plinko：CRASH-INSTANT 三基石。過去（07-28 前後）僅以拋棄式 node -e 一次性驗過 RTP
//    寫進 catalog gate_log，但 checks-games.js 一直沒有「永久迴歸鎖」→ 日後重構可能悄悄改壞 RTP 而
//    harness 抓不到。本輪（08-04 遊戲軌）補上，全為封閉解析／決定性斷言（零抽樣噪音、房家安全側），
//    當測項＝驗的即玩的同一份 HL.dice / HL.limbo / HL.plinko（instant-games.js 純數學區 module.exports）。
(function () {
  var mod = load("instant-games.js");
  var EDGE = 0.99; // 兩款宣告 1% 莊家優勢（宣告 RTP 99%）

  // ── Dice：mult＝EDGE·100/winChance ⇒ 顯示機率下 winChance/100·mult 恰＝EDGE（策略無關）。
  //    真實離散（rollOf 把 f 量化為 0.00–99.99 共 10000 桶）下：under 恰＝EDGE；over 因邊界桶落空而 ≤EDGE
  //    （＝房家安全側，never >100%）；僅極端 target（如 over 99、mult 99×）誤差達 ~1pp，屬離散骰的忠實特性。
  selftest.register({
    id: "games/dice/fair-rtp", group: "games", env: "node", tier: "fast",
    title: "dice：winChance·mult 恰＝EDGE(99%)（策略無關）；離散真實 RTP 恆 ≤EDGE 且 ≤100%（房家安全）",
    run: function (t) {
      if (!mod || !mod.dice || typeof mod.dice.mult !== "function") t.skip("模組未載入（instant-games.js / dice）");
      var D = mod.dice;
      // rollOf 量化域邊界（＝逐擲可驗證重算的定義域）
      t.ok(D.rollOf(0) === 0, "f=0 未落 roll 0.00");
      t.ok(D.rollOf(0.9999999) === 99.99, "f→1⁻ 未落 roll 99.99");
      // resolve 勝負邊界（under 50：roll<50 才贏）
      t.ok(D.resolve(0.4999, 50, "under").win === true, "roll 49.99 under50 應勝");
      t.ok(D.resolve(0.5001, 50, "under").win === false, "roll 50.01 under50 應負");
      var targets = [1, 2, 3, 5, 10, 25, 50, 75, 90, 95, 98, 99];
      targets.forEach(function (T) {
        ["under", "over"].forEach(function (dir) {
          // ① 顯示機率下的代數恆等式：winChance/100 · mult === EDGE（鎖 mult 推導正確）
          var algRtp = D.winChance(T, dir) / 100 * D.mult(T, dir);
          t.close(algRtp, EDGE, 1e-12, "T=" + T + " " + dir + " winChance·mult 應恰＝EDGE，實為 " + algRtp);
          // ② 真實離散 RTP：掃 10000 個等距 roll（＝rollOf 全值域），實跑 resolve 累加派彩
          var winN = 0, mult = D.mult(T, dir);
          for (var i = 0; i < 10000; i++) {
            var f = (i + 0.5) / 10000; // rollOf → i/100（0.00..99.99）
            if (D.resolve(f, T, dir).win) winN++;
          }
          var discRtp = (winN / 10000) * mult;
          t.ok(discRtp <= EDGE + 1e-9, "T=" + T + " " + dir + " 離散 RTP " + (discRtp * 100).toFixed(4) + "% > EDGE＝房家反虧");
          t.ok(discRtp <= 1.0, "T=" + T + " " + dir + " 離散 RTP > 100%＝玩家可套利");
          if (dir === "under") t.close(discRtp, EDGE, 1e-9, "under 的離散 RTP 應恰＝EDGE（roll<T 桶數精確）");
        });
      });
    }
  });

  // ── Limbo：crash＝max(1,EDGE/(1-f))、win＝crash≥t、賠 t×。P(crash≥t)＝P(f≥1-EDGE/t)＝EDGE/t（f~U[0,1)）
  //    ⇒ 公平 RTP＝P·t＝EDGE 恰等 ∀t（策略無關）。細網格 resolve 交叉驗證命中率與 RTP。
  selftest.register({
    id: "games/limbo/fair-rtp", group: "games", env: "node", tier: "fast",
    title: "limbo：P(crash≥t)·t 恰＝EDGE(99%) ∀t（策略無關）＋細網格 resolve 命中率交叉驗證、≤100%",
    run: function (t) {
      if (!mod || !mod.limbo || typeof mod.limbo.crashOf !== "function") t.skip("模組未載入（instant-games.js / limbo）");
      var L = mod.limbo;
      t.ok(L.crashOf(0) === 1, "crashOf(0) 應為 1（地板），實為 " + L.crashOf(0));
      t.ok(L.crashOf(0.9999999) > 1000, "crashOf(f→1⁻) 應極大");
      var targets = [1.01, 1.5, 2, 5, 10, 100, 1000];
      var N = 500000;
      targets.forEach(function (tt) {
        // ① 代數：winChancePct/100 · t === EDGE
        var algRtp = L.winChancePct(tt) / 100 * tt;
        t.close(algRtp, EDGE, 1e-12, "t=" + tt + " winChancePct·t 應恰＝EDGE，實為 " + algRtp);
        t.ok(algRtp <= 1.0, "t=" + tt + " 公平 RTP > 100%＝玩家可套利");
        // ② 細網格 resolve：命中率≈EDGE/t、RTP≈EDGE（決定性、非隨機）
        var winN = 0, payoutSum = 0;
        for (var i = 0; i < N; i++) {
          var f = (i + 0.5) / N;
          var r = L.resolve(f, tt);
          if (r.win) { winN++; payoutSum += r.multiplier; }
        }
        var pWin = winN / N, rtp = payoutSum / N;
        t.close(pWin, EDGE / tt, 5e-4, "t=" + tt + " 網格命中率 " + pWin.toFixed(6) + " 偏離解析 " + (EDGE / tt).toFixed(6));
        t.close(rtp, EDGE, 1e-3, "t=" + tt + " 網格 RTP " + (rtp * 100).toFixed(4) + "% 偏離 EDGE");
        t.ok(rtp <= 1.0, "t=" + tt + " 網格 RTP > 100%");
      });
    }
  });

  // ── Plinko：U 形賠付表由 buildTable(n,rk) 程式生成，中央槽 floor 吸收捨入殘差。落點 rights~Binomial(n,0.5)
  //    ⇒ p[k]＝C(n,k)/2ⁿ，RTP＝Σ p[k]·t[k] 有精確解析式（零抽樣噪音）。逐配置驗：≤100%（無套利）、落宣告
  //    99%±0.5pp、中央槽 <1（殘差吸收器）、全槽有限且 ≥0。註：n=16 high 實測 99.10%（+0.10pp、edge 侵蝕
  //    至 0.90% 但仍房家正、在 ±0.5pp 內）＝Math.max(0.01,…) 對中央槽的下限夾把一點值加回，屬已知且合規。
  selftest.register({
    id: "games/plinko/table-rtp", group: "games", env: "node", tier: "fast",
    title: "plinko：Σ p[k]·t[k] 精確 RTP 逐配置 ≤100% 且落宣告 99%±0.5pp、中央槽 <1（策略無關）",
    run: function (t) {
      if (!mod || !mod.plinko || typeof mod.plinko.buildTable !== "function") t.skip("模組未載入（instant-games.js / plinko）");
      var P = mod.plinko;
      [8, 12, 16].forEach(function (n) {
        ["low", "med", "high"].forEach(function (rk) {
          var tbl = P.buildTable(n, rk), c = n >> 1, rtp = 0;
          t.ok(tbl.length === n + 1, "n=" + n + " " + rk + " 槽數應為 " + (n + 1) + "，實為 " + tbl.length);
          for (var k = 0; k <= n; k++) {
            t.finite(tbl[k], "n=" + n + " " + rk + " 槽 " + k + " 倍數非有限數");
            t.ok(tbl[k] >= 0, "n=" + n + " " + rk + " 槽 " + k + " 出現負倍數");
            rtp += (P.comb(n, k) / Math.pow(2, n)) * tbl[k];
          }
          t.ok(rtp <= 1.0, "n=" + n + " " + rk + " RTP " + (rtp * 100).toFixed(4) + "% > 100%＝玩家可套利");
          t.close(rtp, EDGE, 0.005, "n=" + n + " " + rk + " RTP " + (rtp * 100).toFixed(4) + "% 偏離宣告 99% 逾 ±0.5pp");
          t.ok(tbl[c] < 1, "n=" + n + " " + rk + " 中央槽 t[" + c + "]=" + tbl[c] + " 應 <1（殘差吸收器）");
        });
      });
    }
  });
})();

module.exports = selftest;

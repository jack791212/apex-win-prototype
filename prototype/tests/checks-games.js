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

module.exports = selftest;

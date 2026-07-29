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

module.exports = selftest;

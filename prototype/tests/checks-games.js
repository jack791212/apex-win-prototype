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
// #98：`declaredRTP` 原本是**寫死在本表的第二份宣告 RTP**（0.96145/0.9627/0.963/0.965），
//   與玩家看到的 gameInfoBar 字串各自為政、可無聲漂移（pirots 曾漂：顯示 96.0% vs 本表 96.145%，
//   已由 #99〔2026-08-16 遊戲軌〕裁定收斂到 96.145%、of===gateOf、無分歧）。
//   ⇒ 改讀單一真相 `src/data/game-rtp.js`。用 gateOf() 而非 of()：保真閘要對齊的是**買入價推導所用的值**，
//   兩者不同時代表 repo 內存在未裁決的分歧（見該檔檔頭），此處刻意保持閘的行為不變。
var gameRtp = require(path.join(__dirname, "..", "src", "data", "game-rtp.js"));
var GAMES = [
  { key: "pirots",       file: "slot-pirots.js",       priceField: "buyPrice", force: 1 },
  { key: "dead-by-noon", file: "slot-dead-by-noon.js", priceField: "buyX",     force: 1 },
  { key: "golden-toad",  file: "slot-golden-toad.js",  priceField: "buyX",     force: 1 },
  { key: "gem-storm",    file: "slot-gem-storm.js",    priceField: "buyCost",  force: 1 }
].map(function (g) { g.declaredRTP = gameRtp.gateOf(g.key) / 100; return g; });

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

// ── golden-toad 基礎局 RTP 常駐迴歸鎖（賠付常數硬鎖 + 深度 MC 邏輯/RTP 交叉驗）─────────────
//    緣起：四款買入型 slot 先前只有 buyin-rtp（僅蓋買入路徑）+ spin-sanity（僅無 NaN/負/破 cap），
//    base 局宣告 RTP 只在建置輪 gate_log 以一次性 MC 證過、無自動迴歸鎖 → 賠付表漂移可能靜默過關
//    （games-catalog._quality_gaps① 追蹤）。本輪（2026-08-13 遊戲軌·deep 校準輪）以 250M 蒙地卡羅×5 種子
//    定案 golden-toad：pooled RTP=96.47%、CI95±0.144pp、band[96.326,96.614]（宣告 96.3% ±0.5pp 內·+0.17pp）；
//    分解 base-line 11.193% / bonus 85.277% / 觸發 1/97.84 / 滿盤 GRAND 1/701.6，**與建置輪 100M 錨點
//    (96.4423%·base 11.19%·bonus 85.25%) 逐項吻合** ⇒ 先前 1M 抽測的 -1.61pp 確認＝重尾 bonus 抽樣不足的
//    取樣噪聲、非真漂移，黃旗解除。其餘 3 款買入 slot 待各自 deep 校準後比照補鎖。
//    設計＝雙鎖互補：① **payout-const（fast·決定性零抽樣噪聲）＝賠付表/權重/金幣值/買入價逐一釘死**＝
//    對「有人改動經濟常數」的最銳哨兵（實測 300k MC 對高賠符改動僅移 base-line ~0.0017≈噪聲量級、
//    抓不到，故不倚賴 MC 當賠付哨兵，比照 baccarat/payout-const 直接鎖常數）；② **base-rtp（deep·MC）＝
//    抓「模擬邏輯而非常數漂移」**（evalLines WILD 替代/COIN 阻斷、runBonus 重旋累積若被改壞則常數沒動但
//    RTP 位移）＋文件化 250M 錨點；因重尾在 300k 抖 ±5pp，全局 RTP 只放健康帶，精算 ±0.5pp 僅 N≥20M 啟用。
(function () {
  var mod = load("slot-golden-toad.js");

  // ① fast：賠付/權重/金幣/買入常數逐一釘死（決定性·零抽樣噪聲·賠付表漂移最銳哨兵）
  selftest.register({
    id: "games/golden-toad/payout-const", group: "games", env: "node", tier: "fast",
    title: "golden-toad：賠付表/符號權重/金幣值/買入價常數釘死（RTP 命脈）",
    run: function (t) {
      if (!mod || !mod.CFG || !mod.PAY) t.skip("模組未載入（slot-golden-toad.js）");
      var J = JSON.stringify;
      // 賠付表（每線·以總注為單位）：低賠 0-2 / 中賠 3-4 / 高賠 5 / WILD 6 同高賠
      t.ok(J(mod.PAY[0]) === J([0,0,0,0.20,0.50,1.20]) && J(mod.PAY[1]) === J(mod.PAY[0]) && J(mod.PAY[2]) === J(mod.PAY[0]), "低賠符 0-2 賠付表漂移，現為 " + J(mod.PAY[0]));
      t.ok(J(mod.PAY[3]) === J([0,0,0,0.40,1.00,2.50]) && J(mod.PAY[4]) === J(mod.PAY[3]), "中賠符 3-4 賠付表漂移，現為 " + J(mod.PAY[3]));
      t.ok(J(mod.PAY[5]) === J([0,0,0,1.00,3.00,8.00]) && J(mod.PAY[6]) === J(mod.PAY[5]), "高賠符 5/WILD 賠付表漂移，現為 " + J(mod.PAY[5]));
      // base reel 符號權重（coinWt=wt[7] 直接校準觸發頻率≈1/98→決定 RTP）
      t.ok(J(mod.CFG.wt) === J({0:22,1:20,2:18,3:13,4:10,5:5,6:2,7:14.07}), "符號權重表漂移，現為 " + J(mod.CFG.wt));
      // 金幣現金值×權重（E[值]≈4.5×·強偏小值抑重尾保 RTP 收斂）
      t.ok(J(mod.CFG.coinVals) === J([[1,34],[2,22],[4,14],[6,9],[10,5],[12,4],[18,2.5],[30,1.2],[60,0.5],[120,0.15]]), "金幣值/權重表漂移，現為 " + J(mod.CFG.coinVals));
      // 玩法結構常數
      t.ok(mod.CFG.trigger === 6, "Hold&Win 觸發門檻應為 6 金幣，現為 " + mod.CFG.trigger);
      t.ok(mod.CFG.respins === 3, "起始重旋次數應為 3，現為 " + mod.CFG.respins);
      t.ok(mod.CFG.respinP === 0.135, "重旋落新幣機率應為 0.135，現為 " + mod.CFG.respinP);
      t.ok(mod.CFG.grand === 200, "滿盤 GRAND 應為 200×，現為 " + mod.CFG.grand);
      t.ok(mod.CFG.maxWin === 2000, "派彩上限應為 2000×，現為 " + mod.CFG.maxWin);
      t.ok(mod.CFG.G === 1, "校準標量 G 應恆為 1（不套顯示縮放），現為 " + mod.CFG.G);
      // 買入價＝單一常數驅動（保真閘第 14 項）：86.4× ≈ E[買入]83.24× / 宣告 96.3%
      t.ok(mod.CFG.buyX === 86.4, "買入價應為 86.4×（E[買入]/宣告RTP·單一來源），現為 " + mod.CFG.buyX);
    }
  });

  // ② deep：MC 交叉驗證（抓模擬邏輯漂移·非常數）＋ 文件化 250M 錨點
  selftest.register({
    id: "games/golden-toad/base-rtp", group: "games", env: "node", tier: "deep",
    title: "golden-toad：基礎局 RTP 結構鎖（low-var 硬鎖 + 全局健康帶 + N≥20M 精算 ±0.5pp）",
    run: function (t) {
      if (!mod || typeof mod.simSpin !== "function" || !mod.CFG) t.skip("模組未載入（slot-golden-toad.js）");
      var N = Number(process.env.AX_DEEP_SIMS || 300000);
      var rng = mod.mulberry32(2654435761 >>> 0);
      var tot = 0, base = 0, trig = 0, full = 0;
      for (var i = 0; i < N; i++) {
        var r = mod.simSpin(rng, false, false);
        if (!isFinite(r.mult)) throw new Error("第 " + i + " 局倍數非有限數");
        tot += r.mult; base += r.baseWin;
        if (r.mode === "hold") trig++;
        if (r.full) full++;
      }
      var fullRTP = tot / N, baseLine = base / N, trigRate = trig / N, grandRate = full / N;
      // 低變異量硬鎖（8 種子×300k 實測皆落內、留 >10σ 餘裕＝非 flaky·抓 evalLines/runBonus 邏輯漂移）
      t.close(baseLine, 0.1119, 0.006, "base-line RTP " + (baseLine * 100).toFixed(3) + "%（連線邏輯漂移哨兵）偏離錨點 11.19%");
      t.close(trigRate, 0.01022, 0.0015, "Hold&Win 觸發率 1/" + (1 / trigRate).toFixed(1) + " 偏離錨點 1/97.8");
      t.close(grandRate, 0.001437, 0.0005, "滿盤 GRAND 率 1/" + (1 / grandRate).toFixed(0) + " 偏離錨點 1/702");
      // 全基礎局 RTP：300k 下重尾抖 ±5pp → 只放健康帶抓粗漂移；≤100% 誠實性由 250M 另證
      t.ok(fullRTP >= 0.88 && fullRTP <= 1.05, "全基礎局 RTP " + (fullRTP * 100).toFixed(3) + "% 逸出健康帶 [88%,105%]（重尾粗漂移哨兵）");
      // 精算級 ±0.5pp 僅在抽樣足夠深時啟用（CI95≤~0.5pp 需 N≳20M；預設 300k 不啟用避 flaky）
      if (N >= 20000000) t.close(fullRTP, 0.963, 0.005, "全基礎局 RTP " + (fullRTP * 100).toFixed(4) + "% 偏離宣告 96.3% ±0.5pp");
    }
  });
})();

// ── gem-storm 基礎局 RTP 常駐迴歸鎖（賠付常數硬鎖 + 深度 MC 邏輯/RTP 交叉驗）─────────────
//    緣起同 golden-toad（games-catalog._quality_gaps①）：四款買入型 slot 先前只有 buyin-rtp + spin-sanity，
//    base 局宣告 RTP 只在建置輪一次性 MC 證過、無自動迴歸鎖 → 賠付表漂移可能靜默過關。本輪
//    （2026-08-13 遊戲軌·22:00 deep 校準輪）以 50M 蒙地卡羅×5 種子定案 gem-storm：pooled 全局 RTP=96.72%、
//    perSpinSD≈9.9、CI95±0.27pp、band[96.44,96.99]（**宣告 96.5% ±0.5pp 內·+0.22pp·房家 3.28%**）；
//    分解 base-line 63.676% / 免費遊戲觸發 1/239.1（⭐≥4）。10M 抽測 96.58%、50M 96.72% 皆貼合宣告 ⇒
//    先前 1M 抽測的『+0.01pp 近完美』確認為抽樣噪聲區間內、base 局無漂移，**無黃旗**（對照 golden-toad
//    需 250M 解 -1.61pp 黃旗，gem-storm 收斂乾淨）。設計同 golden-toad 雙鎖互補：
//    ① **payout-const（fast·決定性零抽樣噪聲）＝賠付表/雙抽樣權重(base+FS)/炸彈值分布/觸發結構/買入價逐一
//       釘死**＝賠付漂移最銳哨兵（實測 300k MC 對高賠符改動僅移 base-line ~噪聲量級抓不到，故不倚賴 MC 當
//       賠付哨兵，比照 baccarat/payout-const 直接鎖常數）；② **base-rtp（deep·MC）＝抓「模擬邏輯而非常數
//       漂移」**（evalBoard tier 判定/tumble 重力補牌/runFS 炸彈乘數累積若被改壞則常數沒動但 RTP 位移）
//       ＋文件化 50M 錨點；因重尾在 300k 抖 ±2.3pp（實測 10 種子 range[93.5,101.6]），全局 RTP 只放健康帶，
//       精算 ±0.5pp 僅 N≥16M 啟用（SD≈9.9 → CI95≤0.5pp 需 N≳15.4M）避 flaky。
(function () {
  var mod = load("slot-gem-storm.js");

  // ① fast：賠付/雙權重/炸彈/觸發結構/買入常數逐一釘死（決定性·零抽樣噪聲·賠付表漂移最銳哨兵）
  selftest.register({
    id: "games/gem-storm/payout-const", group: "games", env: "node", tier: "fast",
    title: "gem-storm：賠付表/base+FS 權重/炸彈值/觸發結構/買入價常數釘死（RTP 命脈）",
    run: function (t) {
      if (!mod || !mod.CFG || !mod.PAY) t.skip("模組未載入（slot-gem-storm.js）");
      var J = JSON.stringify;
      // pay-anywhere 賠付表[sym][tier]（tier: 8-9/10-11/12+，每項以總注為單位）
      t.ok(J(mod.PAY[0]) === J([0.20,0.80,3.0]) && J(mod.PAY[1]) === J(mod.PAY[0]), "低賠符 0-1 賠付表漂移，現為 " + J(mod.PAY[0]));
      t.ok(J(mod.PAY[2]) === J([0.30,1.0,4.0]), "符 2 賠付表漂移，現為 " + J(mod.PAY[2]));
      t.ok(J(mod.PAY[3]) === J([0.40,1.5,6.0]), "符 3 賠付表漂移，現為 " + J(mod.PAY[3]));
      t.ok(J(mod.PAY[4]) === J([0.60,2.0,8.0]), "符 4 賠付表漂移，現為 " + J(mod.PAY[4]));
      t.ok(J(mod.PAY[5]) === J([1.0,3.5,15.0]), "高賠符 5 賠付表漂移，現為 " + J(mod.PAY[5]));
      t.ok(J(mod.PAY[6]) === J([1.5,6.0,25.0]), "高賠符 6 賠付表漂移，現為 " + J(mod.PAY[6]));
      t.ok(J(mod.PAY[7]) === J([2.5,12.0,50.0]), "高賠符 7 賠付表漂移，現為 " + J(mod.PAY[7]));
      // 每格獨立加權抽樣（base / 免費；免費多一個 BOMB 符號 9），權重直接校準頻率→決定 RTP
      t.ok(J(mod.CFG.wtBase) === J({0:15,1:14,2:13,3:12,4:11,5:9,6:7,7:5,8:1.95}), "base reel 符號權重表漂移，現為 " + J(mod.CFG.wtBase));
      t.ok(J(mod.CFG.wtFS) === J({0:15,1:14,2:13,3:12,4:11,5:9,6:7,7:5,8:1.95,9:15.0}), "免費遊戲 reel 符號權重表漂移，現為 " + J(mod.CFG.wtFS));
      // 乘數炸彈值×權重（強偏小值抑重尾保 RTP 收斂）
      t.ok(J(mod.CFG.bombVals) === J([[2,28],[3,19],[4,13],[5,9],[6,7],[8,5.5],[10,4.5],[12,3.2],[15,2.6],[20,2.0],[25,1.5],[50,1.1],[100,0.8],[200,0.35],[250,0.15]]), "炸彈值/權重表漂移，現為 " + J(mod.CFG.bombVals));
      // 玩法結構常數（免費觸發/轉數/retrigger 直接決定 bonus 貢獻）
      t.ok(mod.CFG.fsScat === 4, "免費遊戲觸發門檻應為 4 ⭐，現為 " + mod.CFG.fsScat);
      t.ok(mod.CFG.fsSpins === 10, "免費遊戲起始轉數應為 10，現為 " + mod.CFG.fsSpins);
      t.ok(mod.CFG.fsRetrig === 3 && mod.CFG.fsRetrigAdd === 5, "免費 retrigger 門檻/加轉應為 3/+5，現為 " + mod.CFG.fsRetrig + "/+" + mod.CFG.fsRetrigAdd);
      t.ok(mod.CFG.maxWin === 5000, "派彩上限應為 5000×，現為 " + mod.CFG.maxWin);
      t.ok(mod.CFG.G === 2.3, "校準標量 G 應恆為 2.3（賠付即所見·不套顯示縮放），現為 " + mod.CFG.G);
      // 買入價＝單一常數驅動（保真閘第 14 項）：82× ≈ E[買入]78.8× / 宣告 96.5%（買入 RTP 96.1%）
      t.ok(mod.CFG.buyCost === 82, "買入價應為 82×（E[買入]/宣告RTP·單一來源），現為 " + mod.CFG.buyCost);
    }
  });

  // ② deep：MC 交叉驗證（抓模擬邏輯漂移·非常數）＋ 文件化 50M 錨點
  selftest.register({
    id: "games/gem-storm/base-rtp", group: "games", env: "node", tier: "deep",
    title: "gem-storm：基礎局 RTP 結構鎖（low-var 硬鎖 + 全局健康帶 + N≥16M 精算 ±0.5pp）",
    run: function (t) {
      if (!mod || typeof mod.simSpin !== "function" || !mod.CFG) t.skip("模組未載入（slot-gem-storm.js）");
      var N = Number(process.env.AX_DEEP_SIMS || 300000);
      var rng = mod.mulberry32(2654435761 >>> 0);
      var tot = 0, base = 0, trig = 0;
      for (var i = 0; i < N; i++) {
        var r = mod.simSpin(rng, false, false);
        if (!isFinite(r.mult)) throw new Error("第 " + i + " 局倍數非有限數");
        tot += r.mult; base += r.baseWin;
        if (r.mode === "fs") trig++;
      }
      var fullRTP = tot / N, baseLine = base / N, trigRate = trig / N;
      // 低變異量硬鎖（300k 種子間 sd：base-line 0.27pp／trig 0.016pp，容差留 >10σ 餘裕＝非 flaky·抓 evalBoard/tumble/runFS 邏輯漂移）
      t.close(baseLine, 0.6368, 0.03, "base-line RTP " + (baseLine * 100).toFixed(3) + "%（連線/tumble 邏輯漂移哨兵）偏離錨點 63.68%");
      t.close(trigRate, 0.004182, 0.0018, "免費遊戲觸發率 1/" + (1 / trigRate).toFixed(1) + " 偏離錨點 1/239.1");
      // 全基礎局 RTP：300k 下重尾抖 ±2.3pp（實測 range[93.5,101.6]）→ 只放健康帶抓粗漂移；≤100% 誠實性由 50M 另證（96.72%）
      t.ok(fullRTP >= 0.87 && fullRTP <= 1.08, "全基礎局 RTP " + (fullRTP * 100).toFixed(3) + "% 逸出健康帶 [87%,108%]（重尾粗漂移哨兵）");
      // 精算級 ±0.5pp 僅在抽樣足夠深時啟用（SD≈9.9 → CI95≤0.5pp 需 N≳15.4M；預設 300k 不啟用避 flaky）
      if (N >= 16000000) t.close(fullRTP, 0.965, 0.005, "全基礎局 RTP " + (fullRTP * 100).toFixed(4) + "% 偏離宣告 96.5% ±0.5pp");
    }
  });
})();

// ── pirots 基礎局 RTP 常駐迴歸鎖（賠付常數硬鎖 + 深度 MC 邏輯/RTP 交叉驗）────────────────────
//    緣起同 golden-toad/gem-storm（games-catalog._quality_gaps①）：四款買入型 slot 先前只有 buyin-rtp
//    （僅蓋買入路徑）+ spin-sanity（僅無 NaN/負/破 cap），base 局宣告 RTP 只在建置輪 gate_log 以一次性
//    MC 證過、無自動迴歸鎖 → 賠付表漂移可能靜默過關。本輪（2026-08-14 遊戲軌·10:00 deep 校準輪）以
//    250M 蒙地卡羅×5 種子定案 pirots：pooled 基礎局 RTP=**96.187%**、perSpinSD≈27.69、CI95±0.343pp、
//    band[95.844,96.530]（**宣告 96.145% ±0.5pp 內·+0.042pp＝近乎正中·房家 3.81%**）；分解 base-line
//    9.226% / 免費遊戲觸發 1/124.26（scatter≥3）。⭐ 先前 08-12 抽測的『+0.68pp』與單種子 2M 的『100.11%』
//    確認皆為重尾取樣噪聲（此機種 SD≈27.7＝四款買入 slot 最高、1M CI95 達 ±5.4pp、單 2M 種子可漂 +4pp），
//    base 局無漂移、**無黃旗**（收斂乾淨如 gem-storm，非 golden-toad 的 -1.61pp 需 250M 平反）。設計同前
//    兩款雙鎖互補：① **payout-const（fast·決定性零抽樣噪聲）＝色值/色權/scatter 權重/免費經濟/擴張門檻/G/
//       買入價逐一釘死**＝賠付漂移最銳哨兵（實測 300k MC 對高賠符改動僅移 base-line ~噪聲量級抓不到，故不
//       倚賴 MC 當賠付哨兵，比照 baccarat/payout-const 直接鎖常數）；② **base-rtp（deep·MC）＝抓「模擬邏輯
//       而非常數漂移」**（findClusters flood-fill 連通判定 / clusterFactor 群大小賠付曲線〔非 CFG export＝
//       只能 MC 捕獲〕 / collapse 重力補牌 / runReel 漸進乘數 / simSpin 免費遊戲乘數持續不重置若被改壞則
//       常數沒動但 RTP 位移）＋文件化 250M 錨點；因重尾在 300k 抖 ±5.75pp（實測 40 種子 range[82.9,106.9]），
//       全局 RTP 只放健康帶，精算 ±0.5pp 僅 N≥120M 啟用（SD≈27.7 → CI95≤0.5pp 需 N≳118M）避 U34 flaky。
(function () {
  var mod = load("slot-pirots.js");

  // ① fast：色值/色權/scatter 權重/免費經濟/擴張門檻/校準標量/買入價常數逐一釘死（決定性·零抽樣噪聲·賠付漂移最銳哨兵）
  selftest.register({
    id: "games/pirots/payout-const", group: "games", env: "node", tier: "fast",
    title: "pirots：色值/色權/scatter 權重/免費經濟/G/買入價常數釘死（RTP 命脈）",
    run: function (t) {
      if (!mod || !mod.CFG) t.skip("模組未載入（slot-pirots.js）");
      var J = JSON.stringify, C = mod.CFG;
      // 6 色寶石賠付值×抽樣權重（連通同色≥6 收集賠付＝base-line RTP 主體）
      t.ok(C.colors === 6, "顏色數應為 6，現為 " + C.colors);
      t.ok(J(C.colorVal) === J([0.4,0.5,0.7,1,1.6,3]), "色值賠付表漂移，現為 " + J(C.colorVal));
      t.ok(J(C.colorWt) === J([34,28,22,16,10,5]), "色抽樣權重表漂移，現為 " + J(C.colorWt));
      // scatter 權重＝免費遊戲觸發頻率直接槓桿（1/124↔RTP bonus 貢獻）
      t.ok(C.scatterWt === 1.15, "scatter 權重應為 1.15（觸發頻率槓桿），現為 " + C.scatterWt);
      t.ok(C.minCluster === 6, "最小連通群應為 6，現為 " + C.minCluster);
      // 版面擴張結構（收集門檻 6→7→8＝波動/尾巴放大器）
      t.ok(C.sizeBase === 6 && C.sizeMax === 8, "網格尺寸 base/max 應為 6/8，現為 " + C.sizeBase + "/" + C.sizeMax);
      t.ok(J(C.expandAt) === J([10,24]), "版面擴張門檻漂移，現為 " + J(C.expandAt));
      // 免費遊戲經濟（起始乘數/每 cascade 遞增/轉數/retrigger/上限＝bonus 貢獻主體·max 10000× 尾巴來源）
      t.ok(C.fsAward === 12, "免費遊戲起始轉數應為 12，現為 " + C.fsAward);
      t.ok(C.fsRetrig === 10, "免費 retrigger 加轉應為 10，現為 " + C.fsRetrig);
      t.ok(C.fsStartMult === 3, "免費起始乘數應為 3，現為 " + C.fsStartMult);
      t.ok(C.fsMultInc === 5, "免費每 cascade 乘數遞增應為 5，現為 " + C.fsMultInc);
      t.ok(C.fsSpinCap === 140, "免費轉數硬上限應為 140，現為 " + C.fsSpinCap);
      t.ok(C.maxWin === 10000, "派彩上限應為 10000×，現為 " + C.maxWin);
      // 全域賠付標量（G＝RTP 命脈總縮放；20M 校準 96.145%）
      t.ok(C.G === 0.035796, "校準標量 G 應為 0.035796（RTP 命脈），現為 " + C.G);
      // 買入價＝單一常數驅動（保真閘第 14 項）：103.7× ≈ E[買入]99.68× / 宣告 96.145%（買入 RTP 96.1%）
      t.ok(C.buyPrice === 103.7, "買入價應為 103.7×（E[買入]/宣告RTP·單一來源），現為 " + C.buyPrice);
    }
  });

  // ② deep：MC 交叉驗證（抓模擬邏輯漂移·非常數）＋ 文件化 250M 錨點
  selftest.register({
    id: "games/pirots/base-rtp", group: "games", env: "node", tier: "deep",
    title: "pirots：基礎局 RTP 結構鎖（low-var 硬鎖 + 全局健康帶 + N≥120M 精算 ±0.5pp）",
    run: function (t) {
      if (!mod || typeof mod.simSpin !== "function" || !mod.CFG) t.skip("模組未載入（slot-pirots.js）");
      var N = Number(process.env.AX_DEEP_SIMS || 300000);
      var rng = mod.mulberry32(2654435761 >>> 0);
      var tot = 0, base = 0, trig = 0;
      for (var i = 0; i < N; i++) {
        var r = mod.simSpin(rng, false, false);
        if (!isFinite(r.mult)) throw new Error("第 " + i + " 局倍數非有限數");
        tot += r.mult; base += r.base; if (r.triggered) trig++;
      }
      var fullRTP = tot / N, baseLine = base / N, trigRate = trig / N;
      // 決定性硬鎖（固定種子 2654435761＝非隨機·零 flaky·同 golden-toad/gem-storm）：base-line 錨定 250M 真值
      //   9.226%，容差 0.0015＝① 對固定種子 300k 實測 9.242%（dev 0.016pp）留 ~9x 餘裕、對 AX_DEEP_SIMS 加深
      //   （50M 種子測 dev≤0.006pp）恆內；② 緊到足以捕獲 clusterFactor 群大小賠付曲線漂移（非 CFG export＝
      //   唯此 MC 可捕獲；實證 [size6]1→1.3 使 base-line +0.215pp 已被此鎖抓）。base-line 漂移≈全 RTP 漂移
      //   （base 局線性貢獻），故任何逼近 ±0.5pp 規格門檻的 findClusters/collapse/runReel/clusterFactor 漂移
      //   都會先在此觸發（免費遊戲貢獻另由 scatterWt/fs 常數在 payout-const 決定性釘死）。
      t.close(baseLine, 0.09226, 0.0015, "base-line RTP " + (baseLine * 100).toFixed(3) + "%（連通收集/clusterFactor/collapse 邏輯漂移哨兵·容差 0.15pp）偏離錨點 9.226%");
      t.close(trigRate, 0.008048, 0.0016, "免費遊戲觸發率 1/" + (1 / trigRate).toFixed(1) + " 偏離錨點 1/124.3（scatterWt 已於 payout-const 決定性釘死·此為雙重覆蓋）");
      // 全基礎局 RTP：300k 下重尾抖 ±5.75pp（實測 40 種子 range[82.9,106.9]）→ 只放健康帶抓粗漂移；≤100% 誠實性由 250M 另證（96.187%）
      t.ok(fullRTP >= 0.80 && fullRTP <= 1.13, "全基礎局 RTP " + (fullRTP * 100).toFixed(3) + "% 逸出健康帶 [80%,113%]（重尾粗漂移哨兵）");
      // 精算級 ±0.5pp 僅在抽樣足夠深時啟用（SD≈27.7 → CI95≤0.5pp 需 N≳118M；預設 300k 不啟用避 flaky）
      if (N >= 120000000) t.close(fullRTP, 0.96145, 0.005, "全基礎局 RTP " + (fullRTP * 100).toFixed(4) + "% 偏離宣告 96.145% ±0.5pp");
    }
  });
})();

// ── dead-by-noon 基礎局 RTP 常駐迴歸鎖（賠付常數硬鎖 + 深度 MC 邏輯/RTP 交叉驗）── 四款買入 slot 補完 4/4 ──
//    緣起同 golden-toad/gem-storm/pirots（games-catalog._quality_gaps①）：四款買入型 slot 先前只有 buyin-rtp
//    （僅蓋買入路徑）+ spin-sanity（僅無 NaN/負/破 cap），base 局宣告 RTP 只在建置輪 gate_log 以一次性
//    MC 證過、無自動迴歸鎖 → 賠付表漂移可能靜默過關。本輪（2026-08-14 遊戲軌·16:00 deep 校準輪）以
//    250M 蒙地卡羅×5 種子定案 dead-by-noon：pooled 基礎局 RTP=**96.093%**、perSpinSD≈36.14（四款最高）、
//    CI95±0.448pp、band[95.645,96.541]（**宣告 96.27% ±0.5pp 內·-0.177pp＝房家 3.91%**）；per-seed 緊聚
//    [95.98,96.21]。⭐ 先前 08-12 抽測的『-2.53pp @1M』確認為重尾取樣噪聲（此機種 SD≈36.1＝四款買入 slot 最高、
//    max 10000× 極尾＝彈膛「數字串接」2·5·1→×251 驅動，1M CI95 達 ±7pp、單 2M 種子可漂 ±4pp），base 局
//    無漂移、**無黃旗**（同 golden-toad -1.61pp / pirots +0.68pp 皆平反）。⚠️ **與前三款關鍵不同＝base-line
//    本身重尾不可當緊哨兵**：dead-by-noon 的 runSpin 無 maxWin cap 且 base 局 cascade 亦生彈膛乘數，故 base-line
//    ~73% 在 300k 跨種子抖 ±5pp（實測 5 種子 [65.7,76.1]），pirots 式「base-line 硬鎖 tol 0.15pp」在此必 flaky。
//    改用**低變異邏輯哨兵三件組**（皆二項/截尾＝殺重尾）：① hit-rate P(base win>0)（抓 evalLines/cascade 中獎
//    判定邏輯）② trig-rate P(scat≥3)（抓 newGrid/countScat 觸發邏輯）③ **截尾 RTP@30×**＝E[min(base win×G,30)]
//    （殺 10000× 重尾後的賠付曲線哨兵·抓 PAY/chamber/cascade 賠付幅度漂移）。設計仍同前三款雙鎖互補：
//    ① **payout-const（fast·決定性零抽樣噪聲）＝PAY 賠付表/符號權重 wt/數字權重 digitWt/免費經濟/G/買入價/
//       14 線結構逐一釘死**＝賠付漂移最銳哨兵（MC 對賠付常數改動僅移噪聲量級抓不到，故不倚賴 MC 當賠付哨兵，
//       比照 baccarat/golden-toad/gem-storm/pirots 直接鎖常數；PAY 本輪新導出供此鎖釘死）；② **base-rtp（deep·
//       MC）＝抓「模擬邏輯而非常數漂移」**（evalLines 連線判定 / chamberMult 數字串接 / cascadeDown 列下落補牌
//       / runSpin cascade 迴圈若被改壞則常數沒動但 RTP 位移）＋文件化 250M 錨點；因重尾在 300k 抖 ±5.75pp，
//       全局 RTP 只放健康帶，精算 ±0.5pp 僅 N≥500M 啟用（SD≈36.1·真值-宣告 -0.177pp → 單種子需 CI95≤0.32pp
//       ＝N≳481M 才穩不 flaky·預設 300k 絕不啟用避 U34 flaky）。
//    ⭐ 2026-08-29 #70（彈膛數字落盤持久化）後重校：機制改為「數字落盤即抽定、隨籌碼下落一路帶著」（見 slot-dead-by-noon.js），
//       高數字籌碼存活多輪 ⇒ 尾巴變重、10000× cap 命中率上升。**pre-clamp 期望值解析上不變**（每格 cascade 的 E[乘數|籌碼數]
//       與重抽同分布、數字獨立於符號/連線過程），差異純由 clamp 造成：500M sweep 實測舊 G=1.101 下 RTP 由 96.093% 降到 95.674%。
//       G 補回 1.101→1.1083 使真值回 96.273%（500M·≈宣告 96.27%）。hit/trig 為符號域＝不受影響（20M 重測 0.22035/0.006224≈原錨），
//       僅 truncRTP@30 隨機制+G 重錨 46.516%→46.611%（20M）、全局精算錨 96.093%→96.27%。另立行為鎖 chamber-digit-persists 守持久性。
(function () {
  var mod = load("slot-dead-by-noon.js");

  // ① fast：PAY 賠付表/符號權重/數字權重/免費經濟/G/買入價/14 線結構逐一釘死（決定性·零抽樣噪聲·賠付漂移最銳哨兵）
  selftest.register({
    id: "games/dead-by-noon/payout-const", group: "games", env: "node", tier: "fast",
    title: "dead-by-noon：PAY 賠付表/wt/digitWt/免費經濟/G/買入價/14 線常數釘死（RTP 命脈）",
    run: function (t) {
      if (!mod || !mod.CFG || !mod.PAY) t.skip("模組未載入（slot-dead-by-noon.js）");
      var J = JSON.stringify, C = mod.CFG;
      // 賠付表（每線 3/4/5 連·pre-G·base-line RTP 主體）——最銳漂移哨兵
      t.ok(J(mod.PAY) === J({0:[0,0,0,0.10,0.30,0.80],1:[0,0,0,0.10,0.30,0.80],2:[0,0,0,0,0.50,1.20],3:[0,0,0,0,0.50,1.20],4:[0,0,0,0.30,0.80,2.00],5:[0,0,0,0.35,1.00,2.50],6:[0,0,0,0.45,1.20,3.00],7:[0,0,0,0.60,1.60,4.00],8:[0,0,0,0.90,2.20,5.00],9:[0,0,0,1.00,2.50,5.00]}), "PAY 賠付表漂移，現為 " + J(mod.PAY));
      // 符號抽樣權重（決定符號分布＝中獎頻率/彈膛頻率）
      t.ok(J(C.wt) === J({0:10,1:10,2:10,3:10,4:11,5:9.5,6:8,7:6,8:4.5,9:2.6,10:0.6,11:1.6}), "符號抽樣權重 wt 漂移，現為 " + J(C.wt));
      // 數字權重（彈膛數字串接分布＝max 10000× 重尾主要驅動·強偏小數字抑制重尾）
      t.ok(J(C.digitWt) === J([0,78,17,3.5,1,0.5,0.2,0.1,0.05,0.02]), "彈膛數字權重 digitWt 漂移（重尾驅動），現為 " + J(C.digitWt));
      // 免費遊戲經濟（次數/彈膛頻率倍率＝bonus 貢獻與尾巴）
      t.ok(C.fsDoD === 8 && C.fsNANF === 10, "免費次數 DoD/NANF 應為 8/10，現為 " + C.fsDoD + "/" + C.fsNANF);
      t.ok(C.fsChipMulDoD === 2.4 && C.fsChipMulNANF === 2.0, "免費彈膛頻率倍率應為 2.4/2.0，現為 " + C.fsChipMulDoD + "/" + C.fsChipMulNANF);
      t.ok(C.maxWin === 10000, "派彩上限應為 10000×，現為 " + C.maxWin);
      t.ok(C.cascadeGuard === 60, "cascade 迴圈上限應為 60，現為 " + C.cascadeGuard);
      // 全域賠付標量（G＝RTP 命脈總縮放；蒙地卡羅校準）。2026-08-29 #70 彈膛持久化後 clamp 加重，1.101→1.1083 補回真值 96.27%（500M）
      t.ok(C.G === 1.1083, "校準標量 G 應為 1.1083（#70 後·RTP 命脈），現為 " + C.G);
      // 買入價＝單一常數驅動（保真閘第 14 項）：43.6× ≈ E[force=1]41.97×(G=1.1083·50M) / 宣告 96.27%（買入 RTP 96.25%）
      t.ok(C.buyX === 43.6, "買入價應為 43.6×（E[買入]/宣告RTP·單一來源·#70 後重驗），現為 " + C.buyX);
      // 網格與 14 條固定線結構（base-line 幾何主體）
      t.ok(mod.COLS === 5 && mod.ROWS === 4, "網格應為 5×4，現為 " + mod.COLS + "×" + mod.ROWS);
      t.ok(J(mod.LINES) === J([[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[3,3,3,3,3],[0,1,2,1,0],[3,2,1,2,3],[1,0,0,0,1],[2,3,3,3,2],[0,0,1,0,0],[3,3,2,3,3],[1,2,2,2,1],[2,1,1,1,2],[0,1,1,1,0],[3,2,2,2,3]]), "14 條固定線結構漂移，現為 " + J(mod.LINES));
    }
  });

  // ② deep：MC 交叉驗證（低變異邏輯哨兵三件組 + 全局健康帶 + N≥500M 精算 ±0.5pp）＋文件化 250M 錨點
  selftest.register({
    id: "games/dead-by-noon/base-rtp", group: "games", env: "node", tier: "deep",
    title: "dead-by-noon：基礎局 RTP 結構鎖（hit/trig/截尾@30× 低變異哨兵 + 健康帶 + N≥500M 精算 ±0.5pp）",
    run: function (t) {
      if (!mod || typeof mod.simSpin !== "function" || !mod.CFG) t.skip("模組未載入（slot-dead-by-noon.js）");
      var N = Number(process.env.AX_DEEP_SIMS || 300000), G = mod.CFG.G;
      // 迴圈①：全基礎局 RTP（force=false）＋有限性檢查
      var rng = mod.mulberry32(2654435761 >>> 0), tot = 0;
      for (var i = 0; i < N; i++) {
        var r = mod.simSpin(rng, false, false);
        if (!isFinite(r.mult)) throw new Error("第 " + i + " 局倍數非有限數");
        tot += r.mult;
      }
      var fullRTP = tot / N;
      // 迴圈②：base 局低變異邏輯哨兵（runSpin 純 base·固定種子·殺重尾）
      var rngB = mod.mulberry32(2654435761 >>> 0), hit = 0, trig = 0, trunc = 0;
      for (var j = 0; j < N; j++) {
        var b = mod.runSpin(rngB, 1, false, false);
        if (b.win > 0) hit++;
        if (b.scat >= 3) trig++;
        var w = b.win * G; trunc += (w < 30 ? w : 30);
      }
      var hitRate = hit / N, trigRate = trig / N, truncRTP = trunc / N;
      // 低變異邏輯哨兵（皆二項/截尾＝殺 10000× 重尾·300k 跨種子實測 spread 皆 < tol/2·錨定 20M 收斂值）：
      //   base-line 本身重尾（±5pp @300k）不可硬鎖，改由此三件組捕獲模擬邏輯漂移。
      t.close(hitRate, 0.22017, 0.003, "base 命中率 " + (hitRate * 100).toFixed(3) + "%（evalLines/cascade 中獎判定邏輯漂移哨兵·錨點 22.017%）");
      t.close(trigRate, 0.006222, 0.0007, "免費遊戲觸發率 1/" + (1 / trigRate).toFixed(1) + "（newGrid/countScat 觸發邏輯漂移哨兵·錨點 1/160.7）");
      t.close(truncRTP, 0.46611, 0.008, "base 截尾@30× RTP " + (truncRTP * 100).toFixed(3) + "%（殺重尾後 PAY/chamberMult/cascade 賠付曲線漂移哨兵·錨點 46.611%＝2026-08-29 #70 彈膛持久化+G→1.1083 後 20M 重測值，舊 46.516% 為 G=1.101 舊機制）");
      // 全基礎局 RTP：300k 下重尾抖 ±5.75pp → 只放健康帶抓粗漂移；≤100% 誠實性由 500M 另證（96.273%）
      t.ok(fullRTP >= 0.80 && fullRTP <= 1.13, "全基礎局 RTP " + (fullRTP * 100).toFixed(3) + "% 逸出健康帶 [80%,113%]（重尾粗漂移哨兵）");
      // 精算級 ±0.5pp 僅在抽樣極深時啟用（SD≈36+·單種子需 CI95≤0.32pp＝N≳481M；預設 300k 絕不啟用避 flaky）
      //   2026-08-29 #70：彈膛數字改「落盤持久」後尾巴變重、10000× clamp 命中↑ ⇒ 舊 G=1.101 真值由 96.093% 降到 95.674%（500M）；
      //   G 補回 1.101→1.1083 使真值回 96.273%（500M 實測·≈宣告 96.27%·pre-clamp 期望值不變·差異純 clamp·解析已證）。錨點改 96.27%。
      if (N >= 500000000) t.close(fullRTP, 0.9627, 0.005, "全基礎局 RTP " + (fullRTP * 100).toFixed(4) + "% 偏離真值 96.27%（#70 後 G=1.1083·500M 實測 96.273%·±0.5pp 規格 PASS）");
    }
  });
})();

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

// ── Crash X / Mines / Keno / Towers：CRASH-INSTANT+special 四款基石補永久迴歸鎖。
//    此四款過去（07-30~07-31 遊戲軌）雖已暴露 module.exports 純數學區並以拋棄式 node -e 一次性驗過 RTP、
//    寫進 catalog gate_log，但 checks-games.js 一直無「永久迴歸鎖」→ 日後重構可能悄悄改壞 RTP／賠付表而
//    harness 抓不到（＝驗證耐久性缺口，同 08-04 16:00 dice/limbo/plinko 三基石）。本輪（08-04 22:00 遊戲軌）補齊，
//    全為封閉解析／決定性斷言（零抽樣噪音、皆房家安全側），當測項＝驗的即玩的同一份
//    HL.crashX / HL.mines（instant-crash-mines.js）、HL.keno（instant-keno.js）、HL.towers（instant-towers.js）。

// ── Crash X：crash＝max(1,EDGE/(1-f))（與 Limbo 同一數學，差別僅預設兌現目標 vs 連續兌現）。
//    P(crash≥m)＝EDGE/m ⇒ 任一兌現目標 RTP＝P·m＝EDGE 恰等（策略無關）。crash 家重尾特徵：
//    存在 instant-bust（f<1-EDGE ⇒ crash＝1.00× 崩在起飛點）、P(≥2×)＝(1-houseEdge)/2＝EDGE/2。
(function () {
  var mod = load("instant-crash-mines.js");
  var EDGE = 0.99;

  selftest.register({
    id: "games/crash-x/fair-rtp", group: "games", env: "node", tier: "fast",
    title: "crash-x：P(crash≥m)·m 恰＝EDGE(99%) ∀m（策略無關）＋instant-bust P=1% + P(≥2×)=EDGE/2 + 細網格交叉、≤100%",
    run: function (t) {
      if (!mod || !mod.crash || typeof mod.crash.crashOf !== "function") t.skip("模組未載入（instant-crash-mines.js / crash）");
      var C = mod.crash;
      // crashOf 落點邊界（＝逐局可驗證重算的定義域）
      t.ok(C.crashOf(0) === 1, "crashOf(0) 應為 1.00×（地板/instant-bust），實為 " + C.crashOf(0));
      t.ok(C.crashOf(0.9999999) > 1000, "crashOf(f→1⁻) 應極大（重尾）");
      t.ok(C.crashOf(0.5) === 1.98, "crashOf(0.5) 應為 EDGE/0.5=1.98，實為 " + C.crashOf(0.5));
      // resolve 勝負邊界：兌現目標 m=2 時 crash≥2 才贏（crashOf(0.5)=1.98<2 應負、crashOf(0.51)≈2.02≥2 應勝）
      t.ok(C.resolve(0.5, 2).win === false, "f=0.5(crash 1.98) 兌現 2× 應負");
      t.ok(C.resolve(0.51, 2).win === true, "f=0.51(crash≈2.02) 兌現 2× 應勝");
      var targets = [1.01, 1.5, 2, 5, 10, 100, 1000];
      var N = 500000;
      targets.forEach(function (m) {
        // ① 代數恆等式：winChancePct/100 · m === EDGE（鎖 mult 推導正確）
        var algRtp = C.winChancePct(m) / 100 * m;
        t.close(algRtp, EDGE, 1e-12, "m=" + m + " winChancePct·m 應恰＝EDGE，實為 " + algRtp);
        t.ok(algRtp <= 1.0, "m=" + m + " 公平 RTP > 100%＝玩家可套利");
        // ② 細網格 resolve：命中率≈EDGE/m、RTP≈EDGE（決定性、非隨機）
        var winN = 0, payoutSum = 0;
        for (var i = 0; i < N; i++) {
          var f = (i + 0.5) / N, r = C.resolve(f, m);
          if (r.win) { winN++; payoutSum += r.multiplier; }
        }
        var pWin = winN / N, rtp = payoutSum / N;
        t.close(pWin, EDGE / m, 5e-4, "m=" + m + " 網格命中率 " + pWin.toFixed(6) + " 偏離解析 " + (EDGE / m).toFixed(6));
        t.close(rtp, EDGE, 1e-3, "m=" + m + " 網格 RTP " + (rtp * 100).toFixed(4) + "% 偏離 EDGE");
        t.ok(rtp <= 1.0, "m=" + m + " 網格 RTP > 100%");
      });
      // ③ crash 家重尾特徵：instant-bust（crash===1）機率＝1-EDGE、P(≥2×)＝EDGE/2（細網格）
      var bustN = 0, ge2N = 0, GN = 1000000;
      for (var j = 0; j < GN; j++) { var g = C.crashOf((j + 0.5) / GN); if (g <= 1 + 1e-12) bustN++; if (g >= 2) ge2N++; }
      t.close(bustN / GN, 1 - EDGE, 5e-4, "instant-bust 機率 " + (bustN / GN * 100).toFixed(4) + "% 偏離 (1-EDGE)=1%");
      t.close(ge2N / GN, EDGE / 2, 5e-4, "P(≥2×) " + (ge2N / GN * 100).toFixed(4) + "% 偏離 EDGE/2=49.5%（重尾特徵）");
    }
  });

  // ── Mines：翻 k 安全格 fairMult(k)=EDGE·Π(N-i)/(N-mines-i)、pSafe(k)=Π(N-mines-i)/(N-i)
  //    ⇒ 任一 (mines,k) 策略 RTP=pSafe·fairMult=EDGE 恰等（零抽樣誤差、策略無關）。掃全合法 (mines,k) 格。
  selftest.register({
    id: "games/mines/fair-rtp", group: "games", env: "node", tier: "fast",
    title: "mines：全合法(雷數,安全格) pSafe·fairMult 恰＝EDGE(99%)（策略無關）＋fairMult 遞增、pSafe 遞減、≤100%",
    run: function (t) {
      if (!mod || !mod.mines || typeof mod.mines.fairMult !== "function") t.skip("模組未載入（instant-crash-mines.js / mines）");
      var M = mod.mines, N = M.N || 25, cells = 0;
      t.ok(M.edge <= 1.0, "EDGE " + M.edge + " > 100%＝玩家可套利");
      t.close(M.fairMult(0, 3), EDGE, 1e-12, "fairMult(0)（未翻格）應恰＝EDGE，實為 " + M.fairMult(0, 3));
      t.ok(M.pSafe(0, 3) === 1, "pSafe(0) 應為 1（未翻＝必存活）");
      [1, 3, 5, 10, 24].forEach(function (mines) {
        var maxK = N - mines; // 最多可翻的安全格數
        for (var k = 0; k <= maxK; k++) {
          var rtp = M.pSafe(k, mines) * M.fairMult(k, mines);
          t.close(rtp, EDGE, 1e-9, "雷=" + mines + " 翻=" + k + " RTP 偏離 EDGE，實為 " + rtp);
          t.ok(rtp <= 1.0 + 1e-12, "雷=" + mines + " 翻=" + k + " RTP > 100%＝玩家可套利");
          cells++;
          // fairMult 單調遞增、pSafe 單調遞減（翻越多倍數越高、越難存活）
          if (k > 0) {
            t.ok(M.fairMult(k, mines) > M.fairMult(k - 1, mines) - 1e-12, "雷=" + mines + " fairMult 非遞增 @k=" + k);
            t.ok(M.pSafe(k, mines) <= M.pSafe(k - 1, mines) + 1e-12, "雷=" + mines + " pSafe 非遞減存活 @k=" + k);
          }
        }
      });
      t.ok(cells === 25 + 23 + 21 + 16 + 2, "合法格數應為 Σ(N-mines+1)=25+23+21+16+2，實為 " + cells);
    }
  });
})();

// ── Keno：8×10 選 1–10 號開 20 球（超幾何無替換）。倍數表 TABLES[n][k]＝s·5^(k−t)（k<門檻＝0），
//    縮放常數 s 使 Σ_k pHits(n,k)·TABLES[n][k]＝EDGE 恰等 ∀n（載入時精算）。當測項＝驗的即玩的同一份 HL.keno。
(function () {
  var mod = load("instant-keno.js");
  var EDGE = 0.99;

  selftest.register({
    id: "games/keno/table-rtp", group: "games", env: "node", tier: "fast",
    title: "keno：每選號數 Σp=1（分布合法）＋Σ pHits·mult 精確 RTP 恰＝EDGE(99%)、payoutOf(floor)≤fair、≤100%",
    run: function (t) {
      if (!mod || !mod.keno || typeof mod.keno.pHits !== "function") t.skip("模組未載入（instant-keno.js）");
      var K = mod.keno, MAX = K.MAX_PICK || 10;
      t.ok(K.EDGE <= 1.0, "EDGE " + K.EDGE + " > 100%");
      for (var n = 1; n <= MAX; n++) {
        var psum = 0, rtp = 0;
        for (var k = 0; k <= n; k++) {
          var p = K.pHits(n, k);
          t.finite(p, "n=" + n + " k=" + k + " pHits 非有限數");
          t.ok(p >= 0, "n=" + n + " k=" + k + " pHits 負機率");
          psum += p;
          rtp += p * K.multOf(n, k);
          // 起付門檻以下倍數必為 0
          if (k < K.THRESH[n]) t.ok(K.multOf(n, k) === 0, "n=" + n + " k=" + k + "(<門檻" + K.THRESH[n] + ") 倍數應為 0，實為 " + K.multOf(n, k));
        }
        t.close(psum, 1, 1e-9, "n=" + n + " 超幾何分布 Σp=" + psum.toFixed(9) + " ≠ 1（分布不合法）");
        t.close(rtp, EDGE, 1e-9, "n=" + n + " 賠付表精確 RTP " + (rtp * 100).toFixed(6) + "% 偏離宣告 EDGE 99%");
        t.ok(rtp <= 1.0 + 1e-12, "n=" + n + " RTP > 100%＝玩家可套利");
      }
      // payoutOf floor 恆向房家（≤ bet·mult，never >公平）；小注時 floor 才不反轉 edge（#27 教訓）
      var bet = 12345;
      t.ok(K.payoutOf(bet, 5, 5) <= bet * K.multOf(5, 5) + 1e-9, "payoutOf 超過 bet·mult＝floor 反房家");
      t.ok(K.payoutOf(50, 5, 5) === Math.floor(50 * K.multOf(5, 5)), "payoutOf 未採 floor（房家安全側）");
      t.ok(K.payoutOf(bet, 3, 0) === 0, "命中 0（<門檻）派彩應為 0");
    }
  });
})();

// ── Towers：清 k 層 fairMult(k)=EDGE·(T/S)^k、存活到 k 層 pReach(k)=(S/T)^k
//    ⇒ 任一難度、任一兌現層 k：RTP=pReach·fairMult=EDGE 恰等（零抽樣誤差、與 k/難度皆無關）。當測項＝驗的即玩的同一份 HL.towers。
(function () {
  var mod = load("instant-towers.js");
  var EDGE = 0.99;

  selftest.register({
    id: "games/towers/fair-rtp", group: "games", env: "node", tier: "fast",
    title: "towers：全難度全兌現層 pReach·fairMult 恰＝EDGE(99%)（策略無關）＋fairMult 遞增、potWin(floor)≤fair、trapOf 邊界、diffOf fallback",
    run: function (t) {
      if (!mod || !mod.towers || typeof mod.towers.fairMult !== "function") t.skip("模組未載入（instant-towers.js）");
      var T = mod.towers, ROWS = T.rows || 8, cells = 0;
      t.ok(T.edge <= 1.0, "EDGE " + T.edge + " > 100%");
      T.DIFFS.forEach(function (d) {
        t.close(T.fairMult(0, d), EDGE, 1e-12, d.key + " fairMult(0) 應恰＝EDGE");
        t.ok(T.pReach(0, d) === 1, d.key + " pReach(0) 應為 1（未爬＝必存活）");
        for (var k = 0; k <= ROWS; k++) {
          var rtp = T.pReach(k, d) * T.fairMult(k, d);
          t.close(rtp, EDGE, 1e-9, d.key + " 兌現層 " + k + " RTP 偏離 EDGE，實為 " + rtp);
          t.ok(rtp <= 1.0 + 1e-12, d.key + " 兌現層 " + k + " RTP > 100%＝玩家可套利");
          cells++;
          if (k > 0) t.ok(T.fairMult(k, d) > T.fairMult(k - 1, d), d.key + " fairMult 非遞增 @k=" + k);
        }
        // potWin floor 恆向房家（≤ bet·fairMult，never >公平）；#27 教訓：round 會反轉小注 edge
        var bet = 12345;
        t.ok(T.potWin(bet, 3, d) <= bet * T.fairMult(3, d) + 1e-9, d.key + " potWin 超過 bet·fairMult＝floor 反房家");
        t.ok(T.potWin(bet, 3, d) === Math.floor(bet * T.fairMult(3, d)), d.key + " potWin 未採 floor");
        // trapOf 落點邊界（f=0→0、f→1⁻→tiles-1）＝逐層可驗證重算的定義域
        t.ok(T.trapOf(0, d) === 0, d.key + " trapOf(0) 未落格 0");
        t.ok(T.trapOf(0.9999999, d) === d.tiles - 1, d.key + " trapOf(f→1⁻) 未落末格 " + (d.tiles - 1));
      });
      t.ok(cells === T.DIFFS.length * (ROWS + 1), "掃描格數應為 " + T.DIFFS.length + "×" + (ROWS + 1) + "，實為 " + cells);
      t.ok(T.diffOf("nope") === T.DIFFS[1], "未知難度應 fallback 至 med");
    }
  });
})();

// ── Moles 打地鼠：命中第 k 次 fairMult(M,k)=EDGE·(7/M)^k、存活到第 k 步 pReach(M,k)=(M/7)^k
//    ⇒ 任一地鼠數 M∈1..6、任一兌現目標 k∈1..8：RTP=pReach·fairMult=EDGE(98%) 恰等（零抽樣誤差、與 M/策略皆無關）。
//    當測項＝驗的即玩的同一份 HL.moles（＝game-rtp 登記值與大廳玩法共用來源）。
(function () {
  var mod = load("instant-moles.js");
  var EDGE = 0.98;

  selftest.register({
    id: "games/moles/fair-rtp", group: "games", env: "node", tier: "fast",
    title: "moles：全地鼠數全兌現次 pReach·fairMult 恰＝EDGE(98%)（策略無關）＋fairMult 遞增、potWin(floor)≤fair、moleSet 命中機率精確 M/7、clampMoles 邊界",
    run: function (t) {
      if (!mod || !mod.moles || typeof mod.moles.fairMult !== "function") t.skip("模組未載入（instant-moles.js）");
      var M = mod.moles, HOLES = M.holes || 7, MAXH = M.maxHits || 8, cells = 0;
      t.ok(M.edge <= 1.0, "EDGE " + M.edge + " > 100%");
      M.molesRange.forEach(function (m) {
        t.ok(M.pReach(m, 0) === 1, "M=" + m + " pReach(0) 應為 1（未擊＝必存活）");
        for (var k = 1; k <= MAXH; k++) {
          var rtp = M.pReach(m, k) * M.fairMult(m, k);
          t.close(rtp, EDGE, 1e-12, "M=" + m + " 兌現次 " + k + " RTP 偏離 EDGE，實為 " + rtp);
          t.ok(rtp <= 1.0 + 1e-12, "M=" + m + " 兌現次 " + k + " RTP > 100%＝玩家可套利");
          cells++;
          t.ok(M.fairMult(m, k) > M.fairMult(m, k - 1), "M=" + m + " fairMult 非遞增 @k=" + k);
        }
        // potWin floor 恆向房家（≤ bet·fairMult，never >公平）；#27 教訓：round 會反轉小注 edge
        var bet = 12345;
        t.ok(M.potWin(bet, m, 3) <= bet * M.fairMult(m, 3) + 1e-9, "M=" + m + " potWin 超過 bet·fairMult＝floor 反房家");
        t.ok(M.potWin(bet, m, 3) === Math.floor(bet * M.fairMult(m, 3)), "M=" + m + " potWin 未採 floor");
        // moleSet 命中機率：列舉全部 7 個起點 r，每個固定洞位 h 恰被 M 個起點命中 ⇒ P(h∈set)=M/7 精確
        for (var h = 0; h < HOLES; h++) {
          var cnt = 0;
          for (var r = 0; r < HOLES; r++) { if (M.moleSet((r + 0.5) / HOLES, m).indexOf(h) >= 0) cnt++; }
          t.ok(cnt === m, "M=" + m + " hole=" + h + " 命中起點數 " + cnt + " ≠ M（命中機率偏離 M/7）");
        }
      });
      t.ok(cells === M.molesRange.length * MAXH, "掃描格數應為 " + M.molesRange.length + "×" + MAXH + "，實為 " + cells);
      // clampMoles 邊界（滑出 1..6 一律夾回；波動選擇器不得越界）
      t.ok(M.clampMoles(0) === 1 && M.clampMoles(9) === 6 && M.clampMoles(3) === 3, "clampMoles 邊界夾制不正確");
    }
  });
})();

/* ═══════════════════════════════════════════════════════════════════════════
 * TABLE 家族永久迴歸鎖（2026-08-06 遊戲軌 22:00 建置輪）
 * ---------------------------------------------------------------------------
 * 背景：baccarat/roulette/dragon-tiger/sic-bo/money-wheel 五款 07-24~07-30 過保真閘時
 *   RTP 僅以「拋棄式 node -e 蒙地卡羅」一次性驗、checks-games.js 無任何常駐鎖 ＝ 與 08-04
 *   為 CRASH/INSTANT 家族（dice/limbo/plinko/…）補鎖前完全同型的「驗證耐久性缺口」：
 *   一旦未來重構動到賠付表/開牌映射，沒有任何機械閘會叫出漏改（同 #60 RB_RATES 靜默 2 天）。
 * 本輪補齊 ＝ 驗的即玩的同一份 module.exports；四款有封閉/窮舉解（零抽樣誤差）故為 fast，
 *   baccarat 無廉價精確式 → fast 釘賠付常數（含 5% 傭金＝經濟最關鍵）＋ deep 決定性 MC 護開牌規則。
 * ═══════════════════════════════════════════════════════════════════════════ */

// ── Roulette：37 格窮舉。任一注型 RTP＝Σ_n returnsOf(n)[bet]/37 恰＝36/37（歐式單零 2.70% edge）
//    當測項＝驗的即玩的同一份 HL.roulette（node require 契約）。零抽樣誤差。
(function () {
  var mod = load("table-roulette.js");
  (function () {
    selftest.register({
      id: "games/roulette/table-rtp", group: "games", env: "node", tier: "fast",
      title: "roulette：37 格窮舉每注型 RTP 恰＝36/37(97.2973%)、≤100%、注型數＝49（歐式單零 canonical）",
      run: function (t) {
        if (!mod || typeof mod.returnsOf !== "function") t.skip("模組未載入（table-roulette.js）");
        var POCK = mod.POCKETS, EDGE = 36 / 37, agg = {};
        t.ok(POCK === 37, "POCKETS 應為 37（歐式單零），實為 " + POCK);
        for (var n = 0; n < POCK; n++) {
          var ret = mod.returnsOf(n);
          for (var k in ret) { t.finite(ret[k], "開 " + n + " 注型 " + k + " 賠付非有限數"); agg[k] = (agg[k] || 0) + ret[k]; }
        }
        var keys = Object.keys(agg);
        keys.forEach(function (k) {
          var rtp = agg[k] / POCK;
          t.close(rtp, EDGE, 1e-12, "注型 " + k + " RTP " + (rtp * 100).toFixed(6) + "% 偏離 36/37（賠付表漂移）");
          t.ok(rtp <= 1.0 + 1e-12, "注型 " + k + " RTP > 100%＝玩家可套利");
        });
        t.ok(keys.length === 49, "注型數應為 49（37 直注＋紅黑/單雙/大小/打×3/列×3），實為 " + keys.length);
        // 直注 0 只由開 0 賠 36×；場外注開 0 全輸（returnsOf(0) 僅含 n0）
        t.ok(mod.returnsOf(0).n0 === 36 && mod.returnsOf(0).red === undefined, "開 0 應只賠直注 n0、場外注全輸");
      }
    });
  })();
})();

// ── Sic Bo：6³=216 窮舉。大/小恰＝35/36(97.2222%)，各注型皆 ≤100% 且對齊 canonical Macau 賠付。
//    當測項＝驗的即玩的同一份 CORE.summarize/returnsOf。零抽樣誤差。
(function () {
  var mod = load("table-sicbo.js");
  selftest.register({
    id: "games/sicbo/table-rtp", group: "games", env: "node", tier: "fast",
    title: "sicbo：216 窮舉大/小恰＝35/36(97.2222%)＋全 35 注型 ≤100% 且對齊 canonical（全圍 186/216、指定圍 181/216）",
    run: function (t) {
      if (!mod || typeof mod.returnsOf !== "function" || typeof mod.summarize !== "function") t.skip("模組未載入（table-sicbo.js）");
      var agg = {}, N = 0;
      for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) for (var c = 1; c <= 6; c++) {
        N++;
        var ret = mod.returnsOf(mod.summarize([a, b, c]));
        for (var k in ret) { t.finite(ret[k], "骰 " + a + b + c + " 注型 " + k + " 非有限數"); agg[k] = (agg[k] || 0) + ret[k]; }
      }
      t.ok(N === 216, "應窮舉 216 結果，實為 " + N);
      var keys = Object.keys(agg);
      keys.forEach(function (k) { t.ok(agg[k] / N <= 1.0 + 1e-12, "注型 " + k + " RTP > 100%＝玩家可套利（實 " + (agg[k] / N * 100).toFixed(4) + "%）"); });
      // 頭條主注：大/小 = 35/36（逢圍骰輸 → 105 個中獎面 × 2 / 216 = 210/216 = 35/36）
      t.close(agg.small / N, 35 / 36, 1e-12, "小 RTP 偏離 35/36（canonical 大/小 edge 2.7778%）");
      t.close(agg.big / N, 35 / 36, 1e-12, "大 RTP 偏離 35/36");
      // canonical 高 edge 側注（賠付表釘死，防靜默改賠率）
      t.close(agg.anytriple / N, 186 / 216, 1e-12, "全圍 RTP 偏離 186/216（30:1）");
      t.close(agg.triple1 / N, 181 / 216, 1e-12, "指定圍骰1 RTP 偏離 181/216（180:1）");
      t.close(agg.double1 / N, 176 / 216, 1e-12, "對子1 RTP 偏離 176/216（10:1）");
      t.ok(keys.length === 35, "注型數應為 35（大小2＋全圍1＋指定圍6＋對子6＋單骰6＋總點14），實為 " + keys.length);
    }
  });

  // ── 分階段揭曉節拍鎖（修 game-feel #10 flat-single-tick-round）───────────────
  //   舊版：搖骰後單一 680ms setTimeout **同一 tick** 揭三骰＋亮贏區＋派彩＋文字＋歷史＋清籌碼＋解鎖
  //   ⇒ 三顆骰同時全現、無逐顆揭骰儀式，也無「先看到點數、錢才動」的張力間隔。
  //   本鎖守兩件事（同 #16 dragon-tiger／#55 dice-duel 家族）：
  //   ① 純節拍函式五不變量（逐顆揭骰 die1<die2<die3 sequential／判定在三顆後／結算晚於判定／可讀地板＋上界）；
  //   ② 源碼結構——三顆骰被 setTimeout 拆開（非同一 tick）、判定與結算各排在自己那一拍、拍延遲走純函式（非裸毫秒）、
  //      舊的單一 680ms 一次結算不得殘留、五拍各寫一個 data-beat（headless 驗得到拍序）。
  //   為何要 ② 源碼鎖：純函式可全對，而 onRoll 仍被改回「同 tick 三骰＋單一結算」＝函式在、行為復發（§4「修一半」家族）。
  selftest.register({
    id: "games/sicbo/staged-reveal", group: "games", env: "node", tier: "fast",
    title: "sicbo：逐顆揭骰分階段（die1<die2<die3 sequential＋判定在三顆後＋結算晚於判定＝有張力間隔、非同 tick）＝修 game-feel #10 flat-single-tick-round",
    run: function (t) {
      if (!mod || typeof mod.die1AtMs !== "function" || typeof mod.die2AtMs !== "function"
        || typeof mod.die3AtMs !== "function" || typeof mod.judgeAtMs !== "function" || typeof mod.settleAtMs !== "function") {
        t.skip("模組未載入或未匯出節拍純函式（table-sicbo.js die1AtMs/die2AtMs/die3AtMs/judgeAtMs/settleAtMs）"); return;
      }
      var d1 = mod.die1AtMs(), d2 = mod.die2AtMs(), d3 = mod.die3AtMs(), jA = mod.judgeAtMs(), sA = mod.settleAtMs();
      // (a) 三顆骰逐顆嚴格遞增、且各留可讀間隔（sequential reveal，非同一 tick；舊版三骰同在單一 680ms）
      t.ok(d2 - d1 >= 200, "die1→die2 間隔 " + (d2 - d1) + "ms < 200ms（逐顆揭骰儀式喪失／退回同 tick）");
      t.ok(d3 - d2 >= 200, "die2→die3 間隔 " + (d3 - d2) + "ms < 200ms（逐顆揭骰儀式喪失）");
      // (b) 判定必在三顆骰都落定之後、且留一個可讀間隔
      t.ok(jA - d3 >= 200, "判定距第三顆落定 " + (jA - d3) + "ms < 200ms（骰還沒站定就宣判）");
      // (c) 結算嚴格晚於判定（結果先看到、錢才動＝張力間隔；舊版揭曉與結算同一 tick）
      t.ok(sA - jA >= 200, "結算距判定 " + (sA - jA) + "ms < 200ms（揭曉與結算擠同一 tick）");
      // (d) 五拍嚴格遞增 + 首拍可讀地板 + 總時長理智上界
      t.ok(d1 < d2 && d2 < d3 && d3 < jA && jA < sA, "五拍非嚴格遞增：" + [d1, d2, d3, jA, sA].join("/"));
      t.ok(d1 >= 60, "首拍過早 " + d1 + "ms（<60ms 幾乎與搖骰同幀）");
      t.ok(sA <= 3000, "總時長 " + sA + "ms > 3000ms 上界（乾等過久）");

      // ② 源碼結構鎖
      var fs = require("fs");
      var raw = fs.readFileSync(path.join(__dirname, "..", "src", "views", "table-sicbo.js"), "utf8");
      var code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, ""); // 去註解後才比對（反面教材不算違反）
      // 三顆骰逐顆揭：三個 renderDice(o, 1/2/3) 依序出現且被 setTimeout 拆開
      var i1 = code.indexOf("renderDice(o, 1)");
      var i2 = code.indexOf("renderDice(o, 2)");
      var i3 = code.indexOf("renderDice(o, 3)");
      t.ok(i1 >= 0 && i2 > i1 && i3 > i2, "onRoll 未逐顆揭骰（renderDice(o,1)→(o,2)→(o,3) 源碼掃描失敗／順序錯）");
      t.ok(code.slice(i1, i2).indexOf("setTimeout") >= 0, "die1/die2 之間無 setTimeout＝退回同一 tick 揭骰（missing-staged-reveal 復發）");
      t.ok(code.slice(i2, i3).indexOf("setTimeout") >= 0, "die2/die3 之間無 setTimeout＝退回同一 tick 揭骰");
      // 五拍延遲都用純節拍函式（防裸毫秒繞過節拍鎖，§10.2）
      ["die1AtMs()", "die2AtMs()", "die3AtMs()", "judgeAtMs()", "settleAtMs()"].forEach(function (fn) {
        t.ok(code.indexOf("}, " + fn) >= 0, "節拍 " + fn + " 未作為 setTimeout 延遲使用（可能改回裸毫秒）");
      });
      // 舊的單一 680ms 一次結算不得殘留（否則退回同 tick 揭曉+結算）
      t.ok(code.indexOf("}, 680)") < 0, "舊的單一 680ms 一次結算不得殘留（否則退回同 tick 三骰＋結算）");
      // 結算（settleStaged）必須排在判定那一拍之後：其位置晚於 judgeAtMs 的 setTimeout 收尾
      var iJudgeTimer = code.indexOf("}, judgeAtMs())");
      var iSettle = code.indexOf("area.settleStaged(");
      t.ok(iJudgeTimer >= 0 && iSettle > iJudgeTimer, "結算 settleStaged 未排在判定之後（結果未先於錢揭曉／揭曉結算又擠同 tick）");
      // 五拍各寫一個 data-beat（headless 驗拍序；rAF/transition 驗不到，data-beat 驗得到）
      ["reveal-1", "reveal-2", "reveal-3", "judge", "settle"].forEach(function (b) {
        t.ok(raw.indexOf(String.fromCharCode(34) + b + String.fromCharCode(34)) >= 0, "缺 data-beat=" + b);
      });
    }
  });

  // ── 分級贏分回饋鎖（修 game-feel #13 flat-feedback-no-tiering）───────────────
  //   舊版：結算只寫一行綠字＋單一 is-win／ax-green，180:1 指定圍骰與 1:1 大小視覺重量相同、
  //   淨額一次跳到終值（無 roll-up）。本鎖守三件事（同 §4「修一半」家族＝純函式＋源碼結構雙鎖）：
  //   ① 分級門檻純函式 winTier/winMult 的邊界正確（epic≥50×／mega≥15×／big≥5×）與單調性，並與真實 returnsOf 賠付對齊；
  //   ② roll-up 純函式 rollupSteps/rollupStepMs/rollupValueAt——確是分步（>1 步）、可讀（步距地板）、末步精確等於淨額、單調不減；
  //   ③ 源碼結構——結算贏支路由 winTier(r.payout,r.staked) 寫 data-tier、淨額走 money(rollupValueAt(...))＋setTimeout(tick, rollupStepMs())、
  //      舊的一次性 money(r.net) 贏分寫入不得殘留、data-beat rollup/settled 皆在（headless 驗得到分步與收尾）。
  //   為何要 ③：純函式可全對，而 settle 仍可能被改回「一行綠字 money(r.net)、無分級無 roll-up」＝函式在、行為復發。
  selftest.register({
    id: "games/sicbo/tiered-feedback", group: "games", env: "node", tier: "fast",
    title: "sicbo：贏分分級（epic≥50×/mega≥15×/big≥5×·對齊 returnsOf）＋淨額分步 roll-up（末步精確·單調）＝修 game-feel #13 flat-feedback-no-tiering",
    run: function (t) {
      if (!mod || typeof mod.winTier !== "function" || typeof mod.winMult !== "function"
        || typeof mod.rollupSteps !== "function" || typeof mod.rollupStepMs !== "function" || typeof mod.rollupValueAt !== "function") {
        t.skip("模組未載入或未匯出分級/roll-up 純函式（table-sicbo.js winTier/winMult/rollupSteps/rollupStepMs/rollupValueAt）"); return;
      }
      // ① 分級門檻邊界（staked=100；x=payout/staked）
      t.ok(mod.winTier(499, 100) === "", "x=4.99 應為普通贏（無分級），實 " + mod.winTier(499, 100));
      t.ok(mod.winTier(500, 100) === "big", "x=5 應為 big，實 " + mod.winTier(500, 100));
      t.ok(mod.winTier(1499, 100) === "big", "x=14.99 應仍為 big，實 " + mod.winTier(1499, 100));
      t.ok(mod.winTier(1500, 100) === "mega", "x=15 應為 mega，實 " + mod.winTier(1500, 100));
      t.ok(mod.winTier(4999, 100) === "mega", "x=49.99 應仍為 mega，實 " + mod.winTier(4999, 100));
      t.ok(mod.winTier(5000, 100) === "epic", "x=50 應為 epic，實 " + mod.winTier(5000, 100));
      t.ok(mod.winTier(100, 100) === "" && mod.winTier(200, 100) === "" && mod.winTier(0, 100) === "", "x≤2 或無贏應為普通/無分級");
      t.close(mod.winMult(200, 100), 2, 1e-12, "winMult(200,100) 應＝2");
      t.ok(mod.winMult(5000, 0) === 0, "staked=0 時 winMult 應＝0（除零守衛）");
      // 單調：payout 增大分級 rank 不減（防門檻方向倒置）
      var rank = { "": 0, big: 1, mega: 2, epic: 3 }, prev = -1, bad = 0;
      for (var p = 0; p <= 12000; p += 100) { var rk = rank[mod.winTier(p, 100)]; if (rk < prev) bad++; prev = rk; }
      t.ok(bad === 0, "winTier 非單調（payout 增大時分級倒退 " + bad + " 次）");
      // 與真實 returnsOf 賠付對齊（驗的即玩的）：單注 staked=100
      var triple = mod.returnsOf(mod.summarize([1, 1, 1]));         // 指定圍骰1 = 181×
      t.ok(mod.winTier(100 * triple.triple1, 100) === "epic", "指定圍骰(181×) 應觸發 epic");
      t.ok(mod.winTier(100 * triple.anytriple, 100) === "mega", "全圍(31×) 應觸發 mega");
      var dbl = mod.returnsOf(mod.summarize([1, 1, 3]));            // 對子1 = 11×
      t.ok(mod.winTier(100 * dbl.double1, 100) === "big", "對子(11×) 應觸發 big");
      var bigHit = mod.returnsOf(mod.summarize([5, 6, 6]));         // 和 17、大 = 2×
      t.ok(mod.winTier(100 * bigHit.big, 100) === "", "大(2×) 應為普通贏（無分級）＝#13 修前後對照");
      // ② roll-up 純函式
      var N = mod.rollupSteps();
      t.ok(N >= 6, "roll-up 步數 " + N + " < 6＝幾乎一次跳號（退回無 roll-up）");
      t.ok(N === mod.ROLLUP_STEPS, "rollupSteps() 與 ROLLUP_STEPS 常數不一致");
      t.ok(mod.rollupStepMs() >= 20, "roll-up 步距 " + mod.rollupStepMs() + "ms < 20ms＝不可讀（退回瞬時）");
      t.ok(mod.rollupStepMs() <= 200, "roll-up 步距 " + mod.rollupStepMs() + "ms > 200ms＝過慢");
      [18100, 12345, 7, 1, 200].forEach(function (net) {
        t.ok(mod.rollupValueAt(net, N) === net, "roll-up 末步淨額 " + net + " 不精確（實 " + mod.rollupValueAt(net, N) + "）");
        t.ok(mod.rollupValueAt(net, 1) >= 0, "roll-up 首步 " + net + " 為負");
      });
      t.ok(mod.rollupValueAt(18100, 1) < 18100, "roll-up 首步未低於終值＝一次跳號（無累進）");
      var mono = true, last = -1;
      for (var s = 0; s <= N; s++) { var v = mod.rollupValueAt(12345, s); if (v < last) mono = false; last = v; }
      t.ok(mono, "roll-up 淨額累進非單調不減");
      // ③ 源碼結構鎖
      var fs = require("fs");
      var raw = fs.readFileSync(path.join(__dirname, "..", "src", "views", "table-sicbo.js"), "utf8");
      var code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, "");
      t.ok(code.indexOf("winTier(r.payout, r.staked)") >= 0, "結算未以 winTier(r.payout,r.staked) 分級（分級路由喪失）");
      // 錨定「贏支路由」而非泛 data-tier 存在——輸支也寫 data-tier=loss，泛掃有第二消費者會漏（§4「同一字串出現兩次」）
      t.ok(code.indexOf('setAttribute("data-tier", tier || "win")') >= 0, "贏支未以 winTier 結果寫 data-tier（分級路由喪失；輸支的 data-tier=loss 不算）");
      t.ok(code.indexOf("money(rollupValueAt(r.net, step))") >= 0, "淨額未走 roll-up 純函式（可能改回一次跳號）");
      t.ok(code.indexOf("setTimeout(tick, rollupStepMs())") >= 0, "roll-up 未用 rollupStepMs() 純節拍排程（可能改回裸毫秒/瞬時）");
      t.ok(code.indexOf("money(r.net)") < 0, "殘留舊的一次性贏分寫入 money(r.net)＝flat-feedback 復發");
      t.ok(raw.indexOf(String.fromCharCode(34) + "rollup" + String.fromCharCode(34)) >= 0, "缺 data-beat=rollup（roll-up 分步標記；此拍僅贏支有）");
      // roll-up 收尾拍：錨定贏支的 settled+unlock 同一行（輸支的 "settled" 跨行、不匹配 ⇒ 破壞贏支收尾會被抓）
      t.ok(code.indexOf('"settled"); unlock();') >= 0, "roll-up 完成拍（贏支 data-beat=settled 緊接 unlock）喪失（輸支的 settled 不算）");
    }
  });
})();

// ── Dragon Tiger：416×415 窮舉（透過真 resolveRound 驅動＝驗的即玩的）。龍/虎對稱 RTP 恰＝
//    2·Pwin+0.5·Ptie＝96.2651%、和 9·Ptie＝67.2289%、同花和 51·Psuit＝86.0241%（8 副靴 canonical）。
(function () {
  var mod = load("table-dragon-tiger.js");
  selftest.register({
    id: "games/dragon-tiger/table-rtp", group: "games", env: "node", tier: "fast",
    title: "dragon-tiger：416×415 窮舉龍=虎 RTP 恰＝166192/172640(96.2651%)、和 67.2289%、同花和 86.0241%、皆≤100%（8 副靴 canonical）",
    run: function (t) {
      if (!mod || typeof mod.resolveRound !== "function") t.skip("模組未載入（table-dragon-tiger.js）");
      var agg = { dragon: 0, tiger: 0, tie: 0, suited: 0 }, N = 0;
      var seq = [0, 0], si = 0;
      function nx() { return seq[si++]; }
      for (var d = 0; d < 416; d++) {
        seq[0] = (d + 0.5) / 416;
        for (var t0 = 0; t0 < 415; t0++) {
          seq[1] = (t0 + 0.5) / 415; si = 0;
          var ret = mod.returnsOf(mod.resolveRound(nx));
          agg.dragon += ret.dragon; agg.tiger += ret.tiger; agg.tie += ret.tie; agg.suited += ret.suited;
          N++;
        }
      }
      t.ok(N === 416 * 415, "應窮舉 416×415=" + (416 * 415) + " 有序對，實為 " + N);
      // 精確有理值（8 副靴：P(tie)=12896/172640、P(win)=79872/172640、P(suited)=2912/172640）
      t.close(agg.dragon / N, 166192 / 172640, 1e-12, "龍 RTP 偏離 canonical 96.2651%（2·Pwin+0.5·Ptie）");
      t.close(agg.tiger / N, 166192 / 172640, 1e-12, "虎 RTP 偏離 canonical 96.2651%");
      t.ok(Math.abs(agg.dragon - agg.tiger) < 1e-9, "龍/虎 RTP 應對稱相等");
      t.close(agg.tie / N, 116064 / 172640, 1e-12, "和 RTP 偏離 9·Ptie=67.2289%（8:1）");
      t.close(agg.suited / N, 148512 / 172640, 1e-12, "同花和 RTP 偏離 51·Psuit=86.0241%（50:1）");
      ["dragon", "tiger", "tie", "suited"].forEach(function (k) { t.ok(agg[k] / N <= 1.0 + 1e-12, k + " RTP > 100%＝玩家可套利"); });
    }
  });

  // ── 分階段揭曉節拍鎖（修 game-feel #16 missing-staged-reveal）───────────────
  //   舊版：兩張牌同一 tick 落下 + 單一 620ms setTimeout 一次做完揭點數/高亮/結算
  //   ⇒ 0.32s 就可讀勝負卻空等到 620ms（~300ms 死等）、且龍虎同時落下無發牌儀式。
  //   本鎖守兩件事：① 純節拍函式的四不變量（sequential/比點在兩張後/結算晚於比點/可讀地板+上界）；
  //   ② 源碼結構——兩張牌必須被 setTimeout 拆開（非同一 tick）、結算掛在比點之後那一拍。
  //   為何要 ② 源碼鎖：純函式可以全對，而 onDeal 仍被人改回「同 tick 渲染兩張 + 單一結算」＝
  //   函式在、行為復發（§4「修一半」家族）；只有守寫法才守得住現象。
  selftest.register({
    id: "games/dragon-tiger/staged-reveal", group: "games", env: "node", tier: "fast",
    title: "dragon-tiger：發牌分階段（龍→虎 sequential＋比點在兩張後＋結算晚於比點＝有張力間隔、非同 tick）＝修 game-feel #16 missing-staged-reveal",
    run: function (t) {
      if (!mod || typeof mod.dragonAtMs !== "function" || typeof mod.tigerAtMs !== "function"
        || typeof mod.compareAtMs !== "function" || typeof mod.settleAtMs !== "function") {
        t.skip("模組未載入或未匯出節拍純函式（table-dragon-tiger.js dragonAtMs/tigerAtMs/compareAtMs/settleAtMs）");
      }
      var dA = mod.dragonAtMs(), tA = mod.tigerAtMs(), cA = mod.compareAtMs(), sA = mod.settleAtMs();
      // (a) 龍嚴格早於虎（sequential deal，非同一 tick；舊版兩張同在 t=0＝gap 0）
      t.ok(tA - dA >= 200, "龍→虎 間隔 " + (tA - dA) + "ms < 200ms（sequential deal 感喪失／退回同 tick）");
      // (b) 比點必在兩張牌都落定之後、且留一個可讀間隔
      t.ok(cA - tA >= 200, "比點距虎落定 " + (cA - tA) + "ms < 200ms（牌還沒站定就宣判）");
      // (c) 結算嚴格晚於比點（結果先看到、錢才動＝張力間隔；舊版揭曉與結算同一 tick）
      t.ok(sA - cA >= 200, "結算距比點 " + (sA - cA) + "ms < 200ms（揭曉與結算擠同一 tick＝~300ms 死等的反面：無間隔）");
      // (d) 四拍嚴格遞增 + 每拍可讀地板 + 總時長理智上界
      t.ok(dA < tA && tA < cA && cA < sA, "四拍非嚴格遞增：" + [dA, tA, cA, sA].join("/"));
      t.ok(dA >= 60, "首拍過早 " + dA + "ms（<60ms 幾乎與提交同幀）");
      t.ok(sA <= 3000, "總時長 " + sA + "ms > 3000ms 上界（乾等過久）");

      // ② 源碼結構鎖：兩張牌被 setTimeout 拆開、結算掛在比點之後那一拍
      var fs = require("fs");
      var raw = fs.readFileSync(path.join(__dirname, "..", "src", "views", "table-dragon-tiger.js"), "utf8");
      var code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, ""); // 去註解後才比對（反面教材不算違反）
      var iDragon = code.indexOf("renderCard(dragonCard");
      var iTiger = code.indexOf("renderCard(tigerCard");
      t.ok(iDragon >= 0 && iTiger >= 0, "onDeal 未渲染龍/虎牌（源碼掃描失敗）");
      // 兩張 renderCard 之間必須夾至少一個 setTimeout（證明非同一同步 block）
      var between = code.slice(iDragon, iTiger);
      t.ok(between.indexOf("setTimeout") >= 0, "龍/虎兩張牌之間無 setTimeout＝退回同一 tick 渲染（missing-staged-reveal 復發）");
      // 四拍延遲都用純節拍函式（防裸毫秒繞過節拍鎖，§10.2）
      ["dragonAtMs()", "tigerAtMs()", "compareAtMs()", "settleAtMs()"].forEach(function (fn) {
        t.ok(code.indexOf("}, " + fn) >= 0, "節拍 " + fn + " 未作為 setTimeout 延遲使用（可能改回裸毫秒）");
      });
      // 結算（settleStaged）必須排在比點那一拍之後：其位置晚於 compareAtMs 的 setTimeout 收尾
      var iCompareTimer = code.indexOf("}, compareAtMs())");
      var iSettle = code.indexOf("area.settleStaged(");
      t.ok(iCompareTimer >= 0 && iSettle > iCompareTimer, "結算 settleStaged 未排在比點之後（結果未先於錢揭曉／揭曉結算又擠同 tick）");
    }
  });
})();

// ── Money Wheel：乘數重轉＝幾何級數，閉式 RTP(N)=s_N/numSegs + N·s_N/(total·(1-ratio))＝s_N/52+N·s_N/45。
//    從 SPEC 導出係數（防 config 漂移）＋以真 resolveRound 驗乘數鏈組合（驗的即玩的）。
(function () {
  var mod = load("table-moneywheel.js");
  selftest.register({
    id: "games/money-wheel/table-rtp", group: "games", env: "node", tier: "fast",
    title: "money-wheel：SPEC 導出閉式 RTP(N)=s_N/52+N·s_N/45 對齊 canonical（10→96.58%…40→90.81%）、≤100%＋乘數鏈 resolveRound 結構驗",
    run: function (t) {
      if (!mod || typeof mod.resolveRound !== "function" || !mod.SPEC) t.skip("模組未載入（table-moneywheel.js）");
      var total = mod.SEG_COUNT, numSegs = 0, multVals = [], sN = {};
      mod.SPEC.forEach(function (s) {
        if (s.type === "num") { numSegs += s.count; sN[s.v] = (sN[s.v] || 0) + s.count; }
        else for (var k = 0; k < s.count; k++) multVals.push(s.v);
      });
      t.ok(total === 54, "段數應 54，實為 " + total);
      t.ok(numSegs === 52, "號碼段應 52，實為 " + numSegs);
      t.ok(multVals.length === 2, "乘數段應 2（×2/×7），實為 " + multVals.length);
      var eMultPerHit = multVals.reduce(function (a, b) { return a + b; }, 0) / multVals.length; // 4.5
      var ratio = (multVals.length / total) * eMultPerHit;                                        // 9/54
      var eMultAtStop = (numSegs / total) * (1 / (1 - ratio));                                    // 52/45
      t.close(eMultAtStop, 52 / 45, 1e-12, "E[累積乘數] 偏離 52/45（幾何級數）");
      // canonical 各號碼 RTP（Wizard of Odds Dream Catcher 交叉）
      var canon = { 1: 0.9534188, 2: 0.9551282, 5: 0.9123932, 10: 0.9658120, 20: 0.9273504, 40: 0.9081197 };
      mod.NUMS.forEach(function (n) {
        var Pfinal = sN[n] / numSegs;
        var rtp = Pfinal + n * Pfinal * eMultAtStop; // = s_N/52 + N·s_N/45
        t.close(rtp, canon[n], 1e-6, "號碼 " + n + " RTP " + (rtp * 100).toFixed(4) + "% 偏離 canonical（段數 config 漂移）");
        t.ok(rtp <= 1.0 + 1e-12, "號碼 " + n + " RTP > 100%＝玩家可套利");
      });
      // 結構：crafted next() 打 ×7→×2→號碼10 → mult=14、number=10、returnsOf.n10=1+10·14=141
      var iM7 = mod.SEGMENTS.findIndex(function (s) { return s.type === "mult" && s.v === 7; });
      var iM2 = mod.SEGMENTS.findIndex(function (s) { return s.type === "mult" && s.v === 2; });
      var iN10 = mod.SEGMENTS.findIndex(function (s) { return s.type === "num" && s.v === 10; });
      var fl = [(iM7 + 0.5) / 54, (iM2 + 0.5) / 54, (iN10 + 0.5) / 54], j = 0;
      var rr = mod.resolveRound(function () { return fl[j++]; });
      t.ok(rr.mult === 14 && rr.number === 10, "乘數鏈 ×7→×2→10 應得 mult=14 number=10，實為 mult=" + rr.mult + " number=" + rr.number);
      t.ok(mod.returnsOf(rr).n10 === 141, "returnsOf.n10 應為 1+10·14=141，實為 " + mod.returnsOf(rr).n10);
    }
  });

  // ── game-feel #60：Money Wheel 乘數段（招牌高潮）舞台時間。舊版 STAGE=1400／badge@1280／next@1400
  //    ⇒ ×N 徽章只有 120ms 就被下一轉抹掉（淡入到 ~60%）。新模型讓乘數落定當拍即揭曉徽章、再停留
  //    MULT_HOLD 才重轉。本鎖掃 stage 域守四不變量（缺任一都會靜默讓「climax 被秒切」復發）：
  //    (a) 徽章揭曉拍 == 該段落定時刻（不在轉盤過場中途淡入）；(b) 徽章在台上 dwell（＝下一轉起拍 −
  //    揭曉拍）≥ 可讀高潮地板 600ms〔舊版僅 120ms〕；(c) 一局總時長對段數嚴格遞增；(d) 最終號碼段
  //    ≥ 乘數段轉盤時長。純函式 spinMsOf/stageStartOf/multBadgeAt/multHoldMs/totalMsOf＝驗的即玩的同一份。
  selftest.register({
    id: "games/money-wheel/mult-climax-stage-time", group: "games", env: "node", tier: "fast",
    title: "money-wheel：乘數段招牌高潮有可讀舞台時間（徽章落定當拍揭曉＋停留≥600ms 才重轉＋總時長遞增於段數）＝修 game-feel #60 missing-tension-beat",
    run: function (t) {
      if (!mod || typeof mod.multBadgeAt !== "function" || typeof mod.stageStartOf !== "function" ||
          typeof mod.spinMsOf !== "function" || typeof mod.multHoldMs !== "function" ||
          typeof mod.totalMsOf !== "function") t.skip("模組未載入或未匯出演出節拍純函式（table-moneywheel.js spinMsOf/stageStartOf/multBadgeAt/multHoldMs/totalMsOf）");
      // 掃可能的乘數段索引（一局最多數個乘數段在前、最後一個號碼段收局；取 0..8 含餘裕）
      var badFade = 0, minHold = Infinity;
      for (var i = 0; i <= 8; i++) {
        var landing = mod.stageStartOf(i) + mod.spinMsOf(false); // 該乘數段轉盤落定時刻
        if (mod.multBadgeAt(i) !== landing) badFade = i + 1;      // 揭曉拍偏離落定＝在過場中途淡入
        var visible = mod.stageStartOf(i + 1) - mod.multBadgeAt(i); // 徽章在台上到下一轉起拍
        if (visible < minHold) minHold = visible;
      }
      // (a) 徽章不在轉盤過場中途揭曉（必須落定當拍才亮）
      t.ok(badFade === 0, "乘數徽章揭曉拍偏離段落定時刻於 i=" + (badFade - 1) + "（在轉盤過場中途淡入＝#60 病症）");
      // (b) 招牌高潮可讀地板：徽章在台 ≥600ms 才重轉（舊版僅 120ms）
      t.ok(minHold >= 600, "乘數徽章舞台時間 " + minHold + "ms < 600ms 可讀高潮地板（#60：120ms 被秒切復發）");
      // multHoldMs 與實測 dwell 一致（單一真相：純函式常數 == 掃描出的可視窗）
      t.ok(mod.multHoldMs() === (mod.stageStartOf(1) - mod.multBadgeAt(0)), "multHoldMs(" + mod.multHoldMs() + ") 與實測乘數段停留不一致");
      t.ok(mod.multHoldMs() > 120, "multHoldMs(" + mod.multHoldMs() + ") 未超過舊版 120ms 病症值");
      // (c) 一局總時長對段數嚴格遞增（多一個乘數段＝多一段高潮＝讀起來更久）
      var prevTot = null, nonMonoAt = 0;
      for (var k = 1; k <= 8; k++) {
        var tot = mod.totalMsOf(k);
        if (prevTot !== null && !(tot > prevTot)) nonMonoAt = k;
        prevTot = tot;
      }
      t.ok(nonMonoAt === 0, "一局總時長非嚴格遞增於段數 k=" + nonMonoAt + "（多一個乘數段沒有更久）");
      // (d) 最終號碼段轉盤時長 ≥ 乘數段（收局長轉、不比中途短）
      t.ok(mod.spinMsOf(true) >= mod.spinMsOf(false), "最終號碼段轉盤時長(" + mod.spinMsOf(true) + ") < 乘數段(" + mod.spinMsOf(false) + ")");
    }
  });

  // ── 分級贏分回饋鎖（修 game-feel #13 flat-feedback-no-tiering · Money Wheel 側）─────────────
  //   與 games/sicbo/tiered-feedback 同一把尺（家族鎖）。舊版：結算只寫一行綠字＋單一 ax-green，押 40 中
  //   ×7×2 放大到 561× 與押 1 中 2× 視覺重量相同、淨額一次跳到終值（無 roll-up）。本鎖守三件事：
  //   ① 分級門檻純函式 winTier/winMult 邊界正確（epic≥50×／mega≥15×／big≥5×）與單調性，並與真實 returnsOf 賠付對齊；
  //   ② roll-up 純函式 rollupSteps/rollupStepMs/rollupValueAt——確是分步、可讀、末步精確、單調不減；
  //   ③ 源碼結構——結算贏支路由 winTier(r.payout,r.staked) 寫 data-tier、淨額走 money(rollupValueAt(...))＋
  //      setTimeout(tick, rollupStepMs())、舊的一次性 money(r.net) 贏分寫入不得殘留、data-beat rollup/settled 皆在。
  selftest.register({
    id: "games/money-wheel/tiered-feedback", group: "games", env: "node", tier: "fast",
    title: "money-wheel：贏分分級（epic≥50×/mega≥15×/big≥5×·對齊 returnsOf）＋淨額分步 roll-up（末步精確·單調）＝修 game-feel #13 flat-feedback-no-tiering（Money Wheel 側）",
    run: function (t) {
      if (!mod || typeof mod.winTier !== "function" || typeof mod.winMult !== "function"
        || typeof mod.rollupSteps !== "function" || typeof mod.rollupStepMs !== "function" || typeof mod.rollupValueAt !== "function") {
        t.skip("模組未載入或未匯出分級/roll-up 純函式（table-moneywheel.js winTier/winMult/rollupSteps/rollupStepMs/rollupValueAt）"); return;
      }
      // ① 分級門檻邊界（staked=100；x=payout/staked）
      t.ok(mod.winTier(499, 100) === "", "x=4.99 應為普通贏（無分級），實 " + mod.winTier(499, 100));
      t.ok(mod.winTier(500, 100) === "big", "x=5 應為 big，實 " + mod.winTier(500, 100));
      t.ok(mod.winTier(1499, 100) === "big", "x=14.99 應仍為 big，實 " + mod.winTier(1499, 100));
      t.ok(mod.winTier(1500, 100) === "mega", "x=15 應為 mega，實 " + mod.winTier(1500, 100));
      t.ok(mod.winTier(4999, 100) === "mega", "x=49.99 應仍為 mega，實 " + mod.winTier(4999, 100));
      t.ok(mod.winTier(5000, 100) === "epic", "x=50 應為 epic，實 " + mod.winTier(5000, 100));
      t.ok(mod.winTier(200, 100) === "" && mod.winTier(0, 100) === "", "x≤2 或無贏應為普通/無分級");
      t.close(mod.winMult(200, 100), 2, 1e-12, "winMult(200,100) 應＝2");
      t.ok(mod.winMult(5000, 0) === 0, "staked=0 時 winMult 應＝0（除零守衛）");
      // 單調：payout 增大分級 rank 不減
      var rank = { "": 0, big: 1, mega: 2, epic: 3 }, prev = -1, bad = 0;
      for (var p = 0; p <= 60000; p += 100) { var rk = rank[mod.winTier(p, 100)]; if (rk < prev) bad++; prev = rk; }
      t.ok(bad === 0, "winTier 非單調（payout 增大時分級倒退 " + bad + " 次）");
      // 與真實 returnsOf 賠付對齊（驗的即玩的）：單注 staked=100
      t.ok(mod.winTier(100 * mod.returnsOf({ number: 1, mult: 1 }).n1, 100) === "", "押 1 中(2×) 應為普通贏（無分級）＝#13 修前後對照");
      t.ok(mod.winTier(100 * mod.returnsOf({ number: 5, mult: 1 }).n5, 100) === "big", "押 5 中(6×) 應觸發 big");
      t.ok(mod.winTier(100 * mod.returnsOf({ number: 10, mult: 1 }).n10, 100) === "big", "押 10 中(11×) 應觸發 big");
      t.ok(mod.winTier(100 * mod.returnsOf({ number: 40, mult: 1 }).n40, 100) === "mega", "押 40 中(41×) 應觸發 mega");
      t.ok(mod.winTier(100 * mod.returnsOf({ number: 40, mult: 2 }).n40, 100) === "epic", "押 40 中×2(81×) 應觸發 epic");
      t.ok(mod.winTier(100 * mod.returnsOf({ number: 40, mult: 14 }).n40, 100) === "epic", "押 40 中×7×2(561×) 應觸發 epic");
      // ② roll-up 純函式
      var N = mod.rollupSteps();
      t.ok(N >= 6, "roll-up 步數 " + N + " < 6＝幾乎一次跳號（退回無 roll-up）");
      t.ok(N === mod.ROLLUP_STEPS, "rollupSteps() 與 ROLLUP_STEPS 常數不一致");
      t.ok(mod.rollupStepMs() >= 20, "roll-up 步距 " + mod.rollupStepMs() + "ms < 20ms＝不可讀（退回瞬時）");
      t.ok(mod.rollupStepMs() <= 200, "roll-up 步距 " + mod.rollupStepMs() + "ms > 200ms＝過慢");
      [56100, 12345, 7, 1, 200].forEach(function (net) {
        t.ok(mod.rollupValueAt(net, N) === net, "roll-up 末步淨額 " + net + " 不精確（實 " + mod.rollupValueAt(net, N) + "）");
        t.ok(mod.rollupValueAt(net, 1) >= 0, "roll-up 首步 " + net + " 為負");
      });
      t.ok(mod.rollupValueAt(56100, 1) < 56100, "roll-up 首步未低於終值＝一次跳號（無累進）");
      var mono = true, last = -1;
      for (var s = 0; s <= N; s++) { var v = mod.rollupValueAt(12345, s); if (v < last) mono = false; last = v; }
      t.ok(mono, "roll-up 淨額累進非單調不減");
      // ③ 源碼結構鎖
      var fs = require("fs");
      var raw = fs.readFileSync(path.join(__dirname, "..", "src", "views", "table-moneywheel.js"), "utf8");
      var code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, "");
      t.ok(code.indexOf("winTier(r.payout, r.staked)") >= 0, "結算未以 winTier(r.payout,r.staked) 分級（分級路由喪失）");
      // 錨定「贏支路由」而非泛 data-tier 存在——輸支也寫 data-tier=loss，泛掃有第二消費者會漏（§4「同一字串出現兩次」）
      t.ok(code.indexOf('setAttribute("data-tier", tier || "win")') >= 0, "贏支未以 winTier 結果寫 data-tier（分級路由喪失；輸支的 data-tier=loss 不算）");
      t.ok(code.indexOf("money(rollupValueAt(r.net, step))") >= 0, "淨額未走 roll-up 純函式（可能改回一次跳號）");
      t.ok(code.indexOf("setTimeout(tick, rollupStepMs())") >= 0, "roll-up 未用 rollupStepMs() 純節拍排程（可能改回裸毫秒/瞬時）");
      t.ok(code.indexOf("money(r.net)") < 0, "殘留舊的一次性贏分寫入 money(r.net)＝flat-feedback 復發");
      t.ok(raw.indexOf(String.fromCharCode(34) + "rollup" + String.fromCharCode(34)) >= 0, "缺 data-beat=rollup（roll-up 分步標記；此拍僅贏支有）");
      // roll-up 收尾拍：錨定贏支的 settled+unlock 同一行（輸支的 "settled" 跨行、不匹配 ⇒ 破壞贏支收尾會被抓）
      t.ok(code.indexOf('"settled"); unlock();') >= 0, "roll-up 完成拍（贏支 data-beat=settled 緊接 unlock）喪失（輸支的 settled 不算）");
    }
  });
})();

// ── Baccarat：無廉價精確式（8 副靴發牌 + 補牌表）。fast 釘賠付常數（含 5% 傭金＝經濟最關鍵、
//    靜默改回 2.0 即抹掉莊家 edge）；deep 決定性 MC 護開牌/補牌規則（頻率偏移即抓）。
(function () {
  var mod = load("table-baccarat.js");
  // fast：賠付常數釘死（驅動真 returnsOf；零 RNG、瞬時、決定性）
  selftest.register({
    id: "games/baccarat/payout-const", group: "games", env: "node", tier: "fast",
    title: "baccarat：賠付常數釘死（閒 2 / 莊 1.95＝5% 傭金 / 和 9 / 對 12 / 和局閒莊退本 1）＝經濟不變量",
    run: function (t) {
      if (!mod || typeof mod.returnsOf !== "function") t.skip("模組未載入（table-baccarat.js）");
      var P = mod.returnsOf({ winner: "player", pPair: false, bPair: false });
      var B = mod.returnsOf({ winner: "banker", pPair: false, bPair: false });
      var T = mod.returnsOf({ winner: "tie", pPair: false, bPair: false });
      var PR = mod.returnsOf({ winner: "player", pPair: true, bPair: true });
      t.ok(P.player === 2, "閒勝賠付應 2（1:1），實為 " + P.player);
      t.ok(B.banker === 1.95, "莊勝賠付應 1.95（1:1 扣 5% 傭金）＝莊家 edge 命脈，實為 " + B.banker);
      t.ok(B.player === 0 && P.banker === 0, "非中獎側賠付應為 0");
      t.ok(T.tie === 9, "和賠付應 9（8:1），實為 " + T.tie);
      t.ok(T.player === 1 && T.banker === 1, "和局時閒/莊應退本 1（push），實為 " + T.player + "/" + T.banker);
      t.ok(PR.ppair === 12 && PR.bpair === 12, "對子賠付應 12（11:1），實為 " + PR.ppair + "/" + PR.bpair);
    }
  });
  // deep：決定性 MC（seeded mulberry32）護開牌/補牌規則。bounds 寬鬆（吸收 seeded-PRNG 對無替換的
  //   微偏＋MC 噪聲）但仍能抓「傭金抹除→莊 RTP>100%」「補牌表壞→頻率偏移」。AX_DEEP_SIMS 可調精度。
  selftest.register({
    id: "games/baccarat/shoe-rtp", group: "games", env: "node", tier: "deep",
    title: "baccarat：決定性 MC 驗 8 副靴開牌頻率/RTP 落 canonical 帶（莊 45.86%/閒 44.62%/和 9.52%、莊>閒、RTP≤100%、對 7.47%）",
    run: function (t) {
      if (!mod || typeof mod.dealWith !== "function") t.skip("模組未載入（table-baccarat.js）");
      function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
      var rnd = mulberry32(0x51ce77);
      var N = Number(process.env.AX_DEEP_SIMS || 300000);
      var cB = 0, cP = 0, cT = 0, pPair = 0, bPair = 0, rB = 0, rP = 0, rT = 0;
      for (var i = 0; i < N; i++) {
        var o = mod.dealWith(rnd);
        if (o.winner === "banker") cB++; else if (o.winner === "player") cP++; else cT++;
        if (o.pPair) pPair++; if (o.bPair) bPair++;
        var r = mod.returnsOf(o); rB += r.banker; rP += r.player; rT += r.tie;
      }
      var Pb = cB / N, Pp = cP / N, Pt = cT / N, RB = rB / N, RP = rP / N, RT = rT / N;
      t.ok(Pb >= 0.450 && Pb <= 0.466, "P(莊)=" + (Pb * 100).toFixed(3) + "% 逸出 canonical 帶 [45.0,46.6]（補牌表/開牌壞）");
      t.ok(Pp >= 0.440 && Pp <= 0.452, "P(閒)=" + (Pp * 100).toFixed(3) + "% 逸出 [44.0,45.2]");
      t.ok(Pt >= 0.088 && Pt <= 0.100, "P(和)=" + (Pt * 100).toFixed(3) + "% 逸出 [8.8,10.0]");
      t.ok(Pb > Pp + 0.005, "莊勝率應顯著高於閒（補牌不對稱＝莊優來源）：莊 " + (Pb * 100).toFixed(3) + "% 閒 " + (Pp * 100).toFixed(3) + "%");
      t.ok(RB <= 1.0 && RB >= 0.984 && RB <= 0.995, "莊 RTP=" + (RB * 100).toFixed(3) + "% 逸出 [98.4,99.5]（>100%＝傭金被抹除）");
      t.ok(RP <= 1.0 && RP >= 0.982 && RP <= 0.993, "閒 RTP=" + (RP * 100).toFixed(3) + "% 逸出 [98.2,99.3]");
      t.ok(RT >= 0.83 && RT <= 0.88, "和 RTP=" + (RT * 100).toFixed(3) + "% 逸出 canonical 85.64% 附近帶");
      t.ok(pPair / N >= 0.070 && pPair / N <= 0.080, "閒對頻率=" + (pPair / N * 100).toFixed(3) + "% 逸出 8 副靴 7.47% 帶");
      t.ok(bPair / N >= 0.070 && bPair / N <= 0.080, "莊對頻率=" + (bPair / N * 100).toFixed(3) + "% 逸出帶");
    }
  });

  // ── 分階段揭曉節拍鎖（修 game-feel #4 baccarat missing-staged-reveal）──────────
  //   舊版：onDeal 用 renderHand 在同一同步 tick 把閒/莊兩手整手渲染完（閒莊平行落牌）、
  //     第三張與前兩張同一波（CSS 0.12s×i 交錯）、點數等單一 ~890ms setTimeout 才顯示
  //     ⇒ 無 canonical 發牌序、補牌不獨立、~890ms 死等（同 #16 dragon-tiger 家族）。
  //   本鎖守兩件事：① 純發牌序/節拍函式的不變量（canonical 閒1→莊1→閒2→莊2＋補牌獨立較晚拍
  //     ＋比點在全牌後＋結算晚於比點＋可讀地板/上界）；② 源碼結構——逐張落牌被 setTimeout 拆開
  //     （非同一 tick）、結算掛在比點之後那一拍、且舊的 renderHand 整手渲染已移除。
  //   為何要 ② 源碼鎖：純函式可以全對，而 onDeal 仍被改回「同 tick 渲染整手 + 單一結算」＝
  //     函式在、行為復發（§4「修一半」家族）；只有守寫法才守得住現象。
  selftest.register({
    id: "games/baccarat/staged-reveal", group: "games", env: "node", tier: "fast",
    title: "baccarat：發牌分階段（閒1→莊1→閒2→莊2 sequential＋補牌獨立拍＋比點在全牌後＋結算晚於比點）＝修 game-feel #4 missing-staged-reveal",
    run: function (t) {
      if (!mod || typeof mod.dealSequence !== "function" || typeof mod.cardAtMs !== "function"
        || typeof mod.compareAtMs !== "function" || typeof mod.settleAtMs !== "function") {
        t.skip("模組未載入或未匯出節拍純函式（table-baccarat.js dealSequence/cardAtMs/compareAtMs/settleAtMs）");
      }
      // (a) canonical 發牌序：前四張嚴格＝閒1,莊1,閒2,莊2（非閒莊平行同一 tick）
      var seq4 = mod.dealSequence({ P: [1, 2], B: [3, 4] });
      var head = seq4.map(function (s) { return s.side + s.i; }).join(",");
      t.ok(head === "player0,banker0,player1,banker1", "前四張發牌序非 閒1→莊1→閒2→莊2：" + head);
      t.ok(seq4.length === 4, "無補牌局應恰 4 張，實為 " + seq4.length);
      // (b) 補牌（第三張）獨立且較晚：閒補牌 → 莊補牌，皆排在前四張之後
      var seq6 = mod.dealSequence({ P: [1, 2, 3], B: [4, 5, 6] });
      var tail = seq6.slice(4).map(function (s) { return s.side + s.i; }).join(",");
      t.ok(seq6.length === 6 && tail === "player2,banker2", "補牌序非（閒3 早於莊3、皆排最後）：len=" + seq6.length + " tail=" + tail);
      var seq5 = mod.dealSequence({ P: [1, 2, 3], B: [4, 5] });
      t.ok(seq5.length === 5 && seq5[4].side === "player" && seq5[4].i === 2, "單邊（閒）補牌局應 5 張且第 5 張為閒3");
      // (c) 逐張落牌拍嚴格遞增、每拍可讀地板
      var last = -1;
      for (var k = 0; k < 6; k++) {
        var v = mod.cardAtMs(k);
        t.ok(v > last, "逐張落牌拍非嚴格遞增 @k=" + k + "：" + v + " ≤ " + last);
        if (k > 0) t.ok(v - last >= 180, "第 " + k + " 張距前一張 " + (v - last) + "ms < 180ms（sequential deal 感喪失／退回同波）");
        last = v;
      }
      t.ok(mod.cardAtMs(0) >= 60, "首張過早 " + mod.cardAtMs(0) + "ms（<60ms 幾乎與提交同幀）");
      // (d) 比點在全牌落定之後、留可讀間隔；結算嚴格晚於比點；總時長理智上界（4/5/6 張皆驗）
      [4, 5, 6].forEach(function (n) {
        var lastCard = mod.cardAtMs(n - 1), cmp = mod.compareAtMs(n), stl = mod.settleAtMs(n);
        t.ok(cmp - lastCard >= 200, "n=" + n + " 比點距末張 " + (cmp - lastCard) + "ms < 200ms（牌沒站定就宣判）");
        t.ok(stl - cmp >= 200, "n=" + n + " 結算距比點 " + (stl - cmp) + "ms < 200ms（揭曉與結算擠同一 tick）");
        t.ok(lastCard < cmp && cmp < stl, "n=" + n + " 拍非嚴格遞增：" + [lastCard, cmp, stl].join("/"));
        t.ok(stl <= 3000, "n=" + n + " 總時長 " + stl + "ms > 3000ms 上界（乾等過久）");
      });

      // ② 源碼結構鎖
      var fs = require("fs");
      var raw = fs.readFileSync(path.join(__dirname, "..", "src", "views", "table-baccarat.js"), "utf8");
      var code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, ""); // 去註解後才比對（反面教材不算違反）
      // 舊的整手渲染 renderHand 必須不存在（防退回「同一 tick 渲染整手 + 單一結算」）
      t.ok(code.indexOf("renderHand(") === -1, "onDeal 仍呼叫 renderHand（整手同一 tick 渲染＝missing-staged-reveal 復發）");
      // 逐張落牌 placeCard 必須包在 cardAtMs 驅動的 setTimeout 內（非同步一次擺完整手）
      var iSeqEach = code.indexOf("seq.forEach(");
      t.ok(iSeqEach >= 0, "onDeal 未以 seq.forEach 逐張落牌（源碼掃描失敗）");
      var iPlace = code.indexOf("placeCard(", iSeqEach);
      var iCardTimer = code.indexOf("}, HL.baccarat.cardAtMs(k)");
      t.ok(iPlace > iSeqEach && iCardTimer > iPlace, "placeCard 未包在 cardAtMs 驅動的 setTimeout 內（逐張落牌被繞過）");
      // 三類拍延遲都用純節拍函式（防裸毫秒繞過節拍鎖，§10.2）
      ["cardAtMs(k)", "compareAtMs(n)", "settleAtMs(n)"].forEach(function (fn) {
        t.ok(code.indexOf("}, HL.baccarat." + fn) >= 0, "節拍 " + fn + " 未作為 setTimeout 延遲使用（可能改回裸毫秒）");
      });
      // 結算 settleStaged 必須排在比點那一拍之後
      var iCompareTimer = code.indexOf("}, HL.baccarat.compareAtMs(n)");
      var iSettle = code.indexOf("area.settleStaged(");
      t.ok(iCompareTimer >= 0 && iSettle > iCompareTimer, "結算 settleStaged 未排在比點之後（結果未先於錢揭曉／揭曉結算又擠同 tick）");
    }
  });
})();

// ── Andar Bahar：TABLE 家族第 6 款、08-06 22:00 補鎖輪漏補的一款（同型驗證耐久性缺口）。
//    模型：抽莊牌（rank R）後剩 51 張、其中恰 3 張同 rank；從 51 張隨機序中交替發牌（Andar＝先發＝奇數位、
//    Bahar＝偶數位），第一張同 rank 者該側贏。∴ 勝負只取決於「3 張同 rank 中最先出現者落奇數位或偶數位」，
//    與莊牌 rank/花色無關 ⇒ P(Andar)＝Σ_{k 奇} C(51-k,2)/C(51,3)＝429/833（精確有理、零抽樣誤差）。
//    canonical 賠率不對稱：Andar 0.9:1（退 1.9×）RTP＝429/833·1.9＝815.1/833＝97.851%（edge 2.149%、頭條主注）、
//    Bahar 1:1（退 2.0×）RTP＝404/833·2＝808/833＝96.999%（edge 3.001%）；先發側勝率略高但賠率略低、
//    兩者 RTP 皆 ≤100% 且 Andar>Bahar（先發優勢未被完全定價出去＝andar 為低 edge 頭條的 canonical 特性）。
//    fast＝賠付常數釘死（驅動真 returnsOf＝經濟命脈，靜默把 andar 1.9→2.0 即 RTP 101.9%>100% 可套利）＋
//    精確解析 RTP（自賽制推導、鎖宣告值與 ≤100%）＋crafted next() 驅動真 resolveRound 的發牌邏輯邊界
//    （andar 先發、首張配對即收局、交替）；deep＝seeded MC 過真 resolveRound 證 P/RTP 落 canonical 帶。
(function () {
  var mod = load("table-andar-bahar.js");
  function comb(n, r) { if (r < 0 || r > n) return 0; var c = 1; for (var i = 0; i < r; i++) c = c * (n - i) / (i + 1); return c; }
  // 自包含 PRNG（deep MC 用；不依賴遊戲模組匯出）
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // fast：賠付常數 + 精確解析 RTP + 發牌邏輯邊界（皆決定性、零 RNG／零抽樣誤差）
  selftest.register({
    id: "games/andar-bahar/payout-const", group: "games", env: "node", tier: "fast",
    title: "andar-bahar：賠付常數釘死（Andar 1.9／Bahar 2.0／輸 0）＋解析 RTP＝429/833·1.9 & 404/833·2 皆≤100% 且 Andar>Bahar＋發牌邏輯邊界（andar 先發/首配即收/交替）",
    run: function (t) {
      if (!mod || typeof mod.returnsOf !== "function" || typeof mod.resolveRound !== "function") t.skip("模組未載入（table-andar-bahar.js）");
      // ① 賠付常數（驅動真 returnsOf＝經濟命脈；改回 2.0 即抹掉 Andar edge）
      var A = mod.returnsOf({ winner: "andar" });
      var B = mod.returnsOf({ winner: "bahar" });
      t.ok(A.andar === 1.9, "Andar 勝賠付應 1.9（0.9:1）＝頭條 edge 命脈，實為 " + A.andar);
      t.ok(A.bahar === 0, "Andar 勝時 Bahar 側賠付應 0，實為 " + A.bahar);
      t.ok(B.bahar === 2.0, "Bahar 勝賠付應 2.0（1:1），實為 " + B.bahar);
      t.ok(B.andar === 0, "Bahar 勝時 Andar 側賠付應 0，實為 " + B.andar);
      // ② 精確解析 P(Andar)：3 張同 rank 於 51 位隨機序中「首張落奇數位」的機率＝Σ_{k 奇} C(51-k,2)/C(51,3)
      var denom = comb(51, 3), sumOdd = 0;
      for (var k = 1; k <= 49; k += 2) sumOdd += comb(51 - k, 2);
      var pAndar = sumOdd / denom, pBahar = 1 - pAndar;
      t.close(pAndar, 429 / 833, 1e-12, "P(Andar) 解析值 " + pAndar.toFixed(9) + " 偏離 canonical 429/833(51.5006%)");
      t.close(pBahar, 404 / 833, 1e-12, "P(Bahar) 解析值 " + pBahar.toFixed(9) + " 偏離 canonical 404/833(48.4994%)");
      // ③ 解析 RTP＝P·賠付常數（用真 returnsOf 的常數）＝429/833·1.9 & 404/833·2
      var rtpAndar = pAndar * A.andar, rtpBahar = pBahar * B.bahar;
      t.close(rtpAndar, 815.1 / 833, 1e-9, "Andar RTP " + (rtpAndar * 100).toFixed(4) + "% 偏離 canonical 97.851%（賠付/勝率漂移）");
      t.close(rtpBahar, 808 / 833, 1e-9, "Bahar RTP " + (rtpBahar * 100).toFixed(4) + "% 偏離 canonical 96.999%");
      t.ok(rtpAndar <= 1.0, "Andar RTP > 100%＝玩家可套利（賠付被調高？）");
      t.ok(rtpBahar <= 1.0, "Bahar RTP > 100%＝玩家可套利");
      t.ok(rtpAndar > rtpBahar, "Andar RTP 應 > Bahar RTP（先發低 edge 頭條 canonical 特性）：" + (rtpAndar * 100).toFixed(3) + "% vs " + (rtpBahar * 100).toFixed(3) + "%");
      // ④ 發牌邏輯邊界：crafted next() 驅動真 resolveRound（joker=idx0＝A♠，同 rank＝idx13/26/39）
      //    (a) 首張（Andar）即配對 A♥(idx13) → Andar 1 張收局
      var f1 = [0.5 / 52, 12.5 / 51], i1 = 0;
      var o1 = mod.resolveRound(function () { return f1[i1++]; });
      t.ok(o1.joker.rankIdx === 0, "crafted joker 應為 rank A(idx0)，實為 rankIdx " + o1.joker.rankIdx);
      t.ok(o1.winner === "andar" && o1.seq.length === 1 && o1.seq[0].side === "andar", "首張 Andar 配對應 Andar 1 張收局，實為 winner=" + o1.winner + " len=" + o1.seq.length);
      // (b) Andar 首張非配對(2♠ idx1)、Bahar 次張配對 A♥(idx13) → Bahar 2 張收局（驗交替）
      var f2 = [0.5 / 52, 0.5 / 51, 11.5 / 50], i2 = 0;
      var o2 = mod.resolveRound(function () { return f2[i2++]; });
      t.ok(o2.winner === "bahar" && o2.seq.length === 2, "Andar 未中→Bahar 中應 2 張 Bahar 收局，實為 winner=" + o2.winner + " len=" + o2.seq.length);
      t.ok(o2.seq[0].side === "andar" && o2.seq[1].side === "bahar", "發牌應 andar→bahar 交替，實為 " + o2.seq[0].side + "→" + o2.seq[1].side);
      t.ok(o2.andarCount === 1 && o2.baharCount === 1, "Bahar 2 張收局時 andar/bahar 各 1，實為 " + o2.andarCount + "/" + o2.baharCount);
    }
  });

  // deep：seeded MC 過真 resolveRound＋returnsOf，證 P/RTP 落 canonical 帶（護發牌邏輯＋賠付表整條鏈）。
  //   N=3e5 下 SE(P)≈0.09pp、SE(RTP_andar)≈0.17pp；帶寬 ±0.5pp(P)/~±0.7pp(RTP)＝數 σ 防呆但仍能抓
  //   「起始側反了→P 對調」「賠付被抹→RTP 逸出/>100%」。AX_DEEP_SIMS 可調精度。
  selftest.register({
    id: "games/andar-bahar/deal-rtp", group: "games", env: "node", tier: "deep",
    title: "andar-bahar：決定性 MC 過真 resolveRound 驗 P(Andar)≈51.50%/P(Bahar)≈48.50%、RTP Andar≈97.85%/Bahar≈97.00% 皆≤100%、每局必有勝方",
    run: function (t) {
      if (!mod || typeof mod.resolveRound !== "function") t.skip("模組未載入（table-andar-bahar.js）");
      var rnd = mulberry32(0xa2da4ba7), next = function () { return rnd(); };
      var N = Number(process.env.AX_DEEP_SIMS || 300000);
      var cA = 0, cB = 0, nullW = 0, rA = 0, rB = 0;
      for (var i = 0; i < N; i++) {
        var o = mod.resolveRound(next);
        if (o.winner === "andar") cA++; else if (o.winner === "bahar") cB++; else nullW++;
        var r = mod.returnsOf(o); rA += r.andar; rB += r.bahar;
      }
      var Pa = cA / N, Pb = cB / N, RA = rA / N, RB = rB / N;
      t.ok(nullW === 0, "有 " + nullW + " 局無勝方（3 張同 rank 於 51 張中必於第 49 張前配對＝應恆有勝方）");
      t.ok(Math.abs(Pa + Pb - 1) < 1e-12, "P(Andar)+P(Bahar) 應恰＝1（每局必有勝方），實為 " + (Pa + Pb));
      t.ok(Pa >= 0.510 && Pa <= 0.520, "P(Andar)=" + (Pa * 100).toFixed(3) + "% 逸出 canonical 帶 [51.0,52.0]（起始側/發牌邏輯壞）");
      t.ok(Pb >= 0.480 && Pb <= 0.490, "P(Bahar)=" + (Pb * 100).toFixed(3) + "% 逸出 [48.0,49.0]");
      t.ok(RA <= 1.0 && RA >= 0.973 && RA <= 0.984, "Andar RTP=" + (RA * 100).toFixed(3) + "% 逸出 [97.3,98.4]（>100%＝賠付被調高／勝率壞）");
      t.ok(RB <= 1.0 && RB >= 0.965 && RB <= 0.975, "Bahar RTP=" + (RB * 100).toFixed(3) + "% 逸出 [96.5,97.5]");
      t.ok(RA > RB, "Andar RTP 應 > Bahar RTP（先發低 edge 頭條）：" + (RA * 100).toFixed(3) + "% vs " + (RB * 100).toFixed(3) + "%");
    }
  });

  // fast：發牌節奏「張力不反向」棘輪（games-feel #58·high·2026-08-25 遊戲軌 10:00 窗）
  //   舊 bug＝stagger=clamp(round(1600/len),55,150)：整局發牌時長鎖固定預算再除張數 ⇒ 張數越多每張越快
  //   （len49→55ms、len10→150ms），最該緊張的長局讀起來最快、mid-range 總時長被壓成幾乎不變(~1.6s)。
  //   本鎖守四條不變量（缺任一都會靜默讓 inverted-tension 復發）：
  //   (a) 長局 per-card 不得比短局更短（no inverted tension）；(b) 總發牌時長對張數嚴格遞增（懸念隨發牌累積）；
  //   (c) per-card ≥ 可讀地板 100ms；(d) per-card ≤ 理智上界 400ms。純函式 dealStaggerOf/dealTotalMs＝驗的即玩的同一份。
  //   ⚠️ 這是「量測本身」的鎖：只有把整個張數域掃過、逐點比對，才抓得到「只有某段張數才反向」的半修（§4 修一半型態）。
  selftest.register({
    id: "games/andar-bahar/deal-pacing", group: "games", env: "node", tier: "fast",
    title: "andar-bahar：發牌節奏張力不反向（長局 per-card 不更短＋總時長對張數嚴格遞增＋per-card 落可讀地板[100,400]）＝修 game-feel #58 inverted-tension",
    run: function (t) {
      if (!mod || typeof mod.dealStaggerOf !== "function" || typeof mod.dealTotalMs !== "function") t.skip("模組未載入或未匯出發牌節奏純函式（table-andar-bahar.js dealStaggerOf/dealTotalMs）");
      // 掃整個可能張數域（1..52；實測 seq 長度 1..49，取 52 含邊界餘裕）
      var LO = 1, HI = 52, prevStag = null, prevTot = null;
      var minStag = Infinity, maxStag = -Infinity, invertedAt = 0, nonMonoAt = 0;
      for (var L = LO; L <= HI; L++) {
        var s = mod.dealStaggerOf(L), tot = mod.dealTotalMs(L);
        if (s < minStag) minStag = s; if (s > maxStag) maxStag = s;
        if (prevStag !== null && s < prevStag - 1e-9) invertedAt = L;     // 長局 per-card 更短＝張力反向
        if (prevTot !== null && !(tot > prevTot - 1e-9 + 1)) nonMonoAt = L; // 總時長沒有嚴格遞增（+1 容忍浮點）
        prevStag = s; prevTot = tot;
      }
      // (a) no inverted tension：整域內長局 per-card 不得比前一（更短的局）更小
      t.ok(invertedAt === 0, "張力反向：len=" + invertedAt + " 的 per-card 間隔比更短的局還小（舊 1600/len 病症復發）");
      // (b) 總發牌時長對張數嚴格遞增（長局＝越懸疑＝讀起來越久）
      t.ok(nonMonoAt === 0, "總發牌時長非嚴格遞增於 len=" + nonMonoAt + "（懸念未隨發牌累積；舊版 mid-range 被壓平）");
      // (c) per-card 可讀地板：任何張數都 ≥100ms（舊版 len29+ 觸底 55ms＝一團閃影無法數清）
      t.ok(minStag >= 100, "最小 per-card 間隔 " + minStag + "ms < 100ms 可讀地板（長局讀不清）");
      // (d) per-card 理智上界：≤400ms（避免另一個方向的過慢乾等）
      t.ok(maxStag <= 400, "最大 per-card 間隔 " + maxStag + "ms > 400ms 上界（乾等過久）");
      // 具體錨點：舊 bug 的兩個代表值必須不再成立
      t.ok(mod.dealStaggerOf(49) >= mod.dealStaggerOf(10) - 1e-9, "len49 per-card(" + mod.dealStaggerOf(49) + ") 不得 < len10(" + mod.dealStaggerOf(10) + ")＝招牌反向病症");
      t.ok(mod.dealTotalMs(29) > mod.dealTotalMs(11), "len29 總時長(" + mod.dealTotalMs(29) + ") 必須 > len11(" + mod.dealTotalMs(11) + ")（舊版兩者皆≈1595ms）");
    }
  });
})();

/* ===================== Plinko 落球動畫的結構鎖（games · 2026-08-19 前景修）=====================
 * 【起因】船長目視回報「一直按投球的時候，球會突然從底部飛上去」。缺陷不在數學，在**動畫起點沒有被提交**：
 *   舊版共用同一顆球元素，重置寫 transition:none 再寫 top 回頂端，但**同一個 JS task 內**就把 transition
 *   設回 .09s 並寫第一排位置 ⇒ 瀏覽器一個 task 只算一次 style、中間那個「回到頂端」從未被觀測到，
 *   於是從上一顆球的落點（底部）往上插值＝倒飛。**不是偶發競態，是第一顆以後每一顆都會發生。**
 *   本檔曾是全 repo 唯一漏掉 `void el.offsetWidth`（views/slot.js 與 views/instant-cases.js 的 canonical
 *   修法）的動畫；修法改為「每次投球 new 一顆球、落地自銷毀」＝新元素沒有舊位置可插值，倒飛結構上不可能。
 * 【為什麼是源碼鎖而不是行為測項】倒飛由瀏覽器 style-recalc 時序造成，node 無 layout、任何 DOM stub 都
 *   無法重現「一個 task 只算一次 style」⇒ 只有守住**寫法**才守得住現象。去註解後才比對（註解裡的反面
 *   教材不算違反——同 platform/selftest-registration-order 立下的量測紀律）。
 * 【四條各守不同的東西，缺任一條都會靜默復發】
 *   (a) 不得回到共用單例球　(b) 起點與第一段動畫之間必須夾一次強制 reflow
 *   (c) 退場必須是移除自己這顆（不得用「把共用球變透明」——那個計時器會在下一顆飛行中開火）
 *   (d) 飛行中的球不得再讀外層可變的 rows，且計時器一律經 later() 由該顆球自己持有
 * ============================================================================================ */
(function plinkoDropLocks() {
  var fs = require("fs");
  var SRC = path.join(__dirname, "..", "src", "views", "instant-games.js");
  function stripComments(s) {
    return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, ""); // 本檔零 "://"，故行內註解可安全剝除
  }
  function fnBody(code, name) {
    var i = code.indexOf("function " + name + "(");
    if (i < 0) return "";
    var j = code.indexOf("{", i);
    if (j < 0) return "";
    for (var d = 0, k = j; k < code.length; k++) {
      if (code[k] === "{") d++;
      else if (code[k] === "}" && !--d) return code.slice(j, k + 1);
    }
    return "";
  }

  selftest.register({
    id: "games/plinko/drop-start-committed", group: "games", env: "node", tier: "fast",
    title: "plinko：每次投球一顆新球 + 起點經強制 reflow 提交（守住「球從底部倒飛回頂端」不復發）",
    run: function (t) {
      var code = stripComments(fs.readFileSync(SRC, "utf8"));
      var body = fnBody(code, "bounce");

      // ── 不空心：正則寫錯時不得靜默全綠 ──────────────────────────────────────────
      t.ok(/function\s+plinkoGame\s*\(/.test(code), "應在 instant-games.js 找到 plinkoGame()");
      t.ok(body.length > 400, "應取得 bounce() 函式體（實測 " + body.length + " 字元）");

      // ── (a) 不得回到共用單例球 ─────────────────────────────────────────────────
      var creates = (code.match(/class:\s*"ax-plinko__ball"/g) || []).length;
      t.equal(creates, 1, "球元素只准有一個建立點（實測 " + creates + " 處）");
      t.ok(body.indexOf('class: "ax-plinko__ball"') >= 0,
        "球必須在 bounce() 內建立＝每次投球一顆；一旦搬回 view 層變單例，倒飛與「上一局計時器改到下一顆球」會同時復活");
      t.ok(/class:\s*"ax-plinko__board"\s*\}\s*,\s*\[\s*pegs\s*\]/.test(code),
        "board 的子節點只准有 pegs（球不是版面的一部分，是每一局的產物）");

      // ── (b) 起點必須先被提交，才能接第一段動畫（本缺陷的正根） ────────────────
      var p0 = body.search(/\.top\s*=\s*"0%"/);
      var pf = body.search(/void\s+\w+\.(offsetWidth|offsetHeight)|getBoundingClientRect\(/);
      var pt = body.search(/\.transition\s*=/);
      t.ok(p0 >= 0, "bounce() 必須把起點寫在頂端（top = \"0%\"）");
      t.ok(pf > p0, "起點之後必須有一次強制 reflow 讀取把它提交（void el.offsetWidth，同 slot.js / instant-cases.js）"
        + "；實測 起點@" + p0 + " / reflow@" + pf);
      t.ok(pt > pf, "第一次寫 transition 必須排在該 reflow 之後——順序反了就是倒飛本身（實測 reflow@" + pf + " / transition@" + pt + "）");

      // ── (c) 退場只動自己這顆 ──────────────────────────────────────────────────
      t.ok(/parentNode\.removeChild\(\s*ball\s*\)/.test(body), "落地後必須移除自己這顆球");
      t.ok(!/opacity\s*=\s*"0"/.test(body),
        "不得用「把球變透明」當退場：舊版那個 +250ms 的計時器會在**下一顆**球飛行途中把它變不見");

      // ── (d) 飛行中不得讀外層可變狀態；計時器一律由該顆球自己持有 ──────────────
      var rowsRefs = (body.match(/\brows\b/g) || []).length;
      t.equal(rowsRefs, 1, "bounce() 內只准出現一次 rows（var n = rows 釘住本顆球的排數）——"
        + "否則飛行中切換排數會改寫已在空中的球（實測 " + rowsRefs + " 次）");
      var raws = (body.match(/setTimeout\(/g) || []).length;
      t.equal(raws, 1, "bounce() 內只准有一個裸 setTimeout（later() 裡那一個），其餘一律走 later()"
        + "＝每顆球擁有自己的計時器（實測 " + raws + " 個）");

      // ── 引用的 canonical 前例不得腐爛（註解與鎖都指向它們） ────────────────────
      ["slot.js", "instant-cases.js"].forEach(function (f) {
        var ref = fs.readFileSync(path.join(__dirname, "..", "src", "views", f), "utf8");
        t.ok(/void\s+\w+\.offset(Width|Height)/.test(ref),
          "canonical 前例 views/" + f + " 應仍有強制 reflow 提交起點的寫法（本鎖的說明引用了它）");
      });
    }
  });
})();

/* ===================== 遊戲手感結構鎖（2026-08-20 前景巡檢 Wave 1）=========================
 * 來源：船長目視查驗 Plinko 後的全面巡檢（intel/game-feel-audit-2026-08-20.md，78 條存活/69 CONFIRMED）。
 * 這一批修的是**跨多款重複出現的家族**，根因都在共用檔，所以鎖也立在共用檔上。
 * 為什麼是源碼鎖：這些缺陷全是「時序/狀態」型（換頁後計時器還在跑、一拍內兩個判定的先後、
 *   動畫起點沒重設），node 無 layout、也沒有換頁殼層，行為測項測不到；能守住的只有寫法。
 *   去註解後才比對（註解裡的反面教材不算違反——同 platform/selftest-registration-order 的量測紀律）。
 * ============================================================================================ */
(function gameFeelLocks() {
  var fs = require("fs");
  var SRC = path.join(__dirname, "..", "src");
  function rd(rel) { try { return fs.readFileSync(path.join(SRC, rel), "utf8"); } catch (e) { return ""; } }
  function strip(x) { return x.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, ""); }
  function body(code, name) {
    var i = code.indexOf("function " + name + "(");
    if (i < 0) return "";
    var j = code.indexOf("{", i); if (j < 0) return "";
    for (var d = 0, k = j; k < code.length; k++) {
      if (code[k] === "{") d++;
      else if (code[k] === "}" && !--d) return code.slice(j, k + 1);
    }
    return "";
  }
  var BUY_SLOTS = ["views/slot-pirots.js", "views/slot-dead-by-noon.js", "views/slot-gem-storm.js", "views/slot-golden-toad.js"];

  selftest.register({
    id: "games/instant-engine/teardown", group: "games", env: "node", tier: "fast",
    title: "家族 B：換頁必須停掉 autobet（否則離開遊戲頁後迴圈仍每 470ms 繼續扣款派彩）",
    run: function (t) {
      var eng = strip(rd("core/instant.js"));
      t.ok(/HL\.instant\s*=\s*\{[\s\S]*?stopAll\s*:/.test(eng), "HL.instant 必須對外出口 stopAll（殼層要呼叫得到）");
      t.ok(/livePanels\.push\(api\)/.test(eng), "每個 betPanel 必須登記進活面板簿，否則 stopAll 找不到它");
      /* ⚠️ 這一條是 2026-08-20 preview 實測踩到的雷：註冊時「順手 purge 已離場面板」會把**自己**刪掉
       * （betPanel() 回傳的當下 panel 還沒被掛進文件、isConnected 為 false）⇒ 登記簿恆空、層① 形同
       * 不存在，而畫面上一切正常（層② 的存活檢查會補上）＝**修了一半卻看不出來**。 */
      t.ok(!/livePanels\.push\(api\);\s*stopAll\(/.test(eng),
        "註冊 betPanel 時不得順手呼叫 stopAll：panel 尚未掛進文件，會把自己從登記簿刪掉（層① 靜默失效）");
      // ⚠️ 關鍵在**順序**：存活檢查必須排在扣款之前。放到 .then() 裡就已經扣掉一注了。
      var auto = body(eng, "startAuto");
      t.ok(auto.length > 200, "應取得 startAuto() 函式體（實測 " + auto.length + " 字元）");
      /* 守的是**順序**，不是某個函式名：存活檢查必須排在「會扣錢的那一步」之前。
       * 扣錢那一步 2026-08-20 由 settle() 改成 launch()（G7 把扣款+演出+結算收成一個出口），
       * 所以這裡取兩者中先出現的那個當基準——換名字可以，把檢查搬到扣款之後不行。 */
      var iConn = auto.indexOf("panel.isConnected");
      var iPay = [auto.indexOf("launch("), auto.indexOf("settle(")].filter(function (x) { return x >= 0; }).sort(function (a, b) { return a - b; })[0];
      t.ok(iConn >= 0, "startAuto 內必須有 panel.isConnected 存活檢查");
      t.ok(iPay >= 0 && iConn < iPay, "存活檢查必須排在扣款（launch/settle）之前（實測 isConnected@" + iConn + " / 扣款@" + iPay + "）");
      t.ok(/settle\(bet,\s*opts\.playRound/.test(body(eng, "launch")), "launch() 必須是「扣款+演出+結算」的單一出口（settle 只准在這裡被呼叫）");
      // 兩條換頁路徑都要清（少一條就從那條路漏出去）
      var shell = strip(rd("layout/app-shell.js")), main = strip(rd("main.js"));
      var mv = body(shell, "mountView");
      t.ok(/HL\.instant\.stopAll\(\)/.test(mv), "app-shell.mountView 必須呼叫 HL.instant.stopAll()");
      t.ok(mv.indexOf("stopAll") < mv.indexOf("HL.dom.clear"), "stopAll 必須排在 HL.dom.clear 之前（先停還在跑的，再拔 DOM）");
      t.ok(/HL\.instant\.stopAll\(\)/.test(body(main, "renderApp")), "main.renderApp 必須呼叫 HL.instant.stopAll()（比照既有 HL.ticker.clearAll）");
    }
  });

  selftest.register({
    id: "games/instant-engine/round-lock", group: "games", env: "node", tier: "fast",
    title: "家族 A：回合鎖是面板的公開狀態（買入型入口與旋轉鈕不得各自為政）",
    run: function (t) {
      var eng = strip(rd("core/instant.js"));
      t.ok(/lock\s*:\s*setBusy/.test(eng) && /isBusy\s*:\s*isBusy/.test(eng), "betPanel api 必須出口 lock 與 isBusy");
      var sync = body(eng, "syncLock");
      t.ok(sync.length > 80, "應取得 syncLock() 函式體");
      // 整組鎖：只鎖按鈕沒有用——注額欄與 ½/2×/Max 才是「改到已付款那一注」的入口
      // 非併發（12 款單注遊戲）的路徑必須鎖 playBtn；併發模式（G7·Plinko）刻意不鎖，見下方 G7 專鎖。
      t.ok(/playBtn\.disabled\s*=[^;]*\boff\b/.test(sync), "syncLock 的非併發分支必須把 playBtn 鎖成 off");
      t.ok(/input\.disabled\s*=\s*off/.test(sync), "syncLock 必須鎖注額輸入框（否則動畫途中還能改注）");
      t.ok(/chips\.forEach/.test(sync), "syncLock 必須鎖 ½/2×/Max 三顆 chip");
      t.ok(/startBtn\.disabled\s*=\s*!!state\.busy/.test(sync),
        "startBtn 只准看 state.busy——自動執行中它的身分是「停止」，一起鎖住就沒人能停下自動下注");
      // playBtn 的守衛要問 isBusy()，不能只看自己那顆鈕 disabled
      t.ok(/if\s*\(isBusy\(\)\)\s*return;/.test(eng), "playBtn 的守衛必須是 isBusy()（涵蓋遊戲自己開的回合）");
      // 四款買入 slot 都必須接上這兩個出口
      BUY_SLOTS.forEach(function (f) {
        var c = strip(rd(f));
        t.ok(/panel\.isBusy\(\)/.test(c), f + " 的買入鈕必須先問 panel.isBusy()（否則面板回合在途仍可買入）");
        t.ok(/panel\.lock\(true\)/.test(c) && /panel\.lock\(false\)/.test(c), f + " 買入期間必須 panel.lock(true) 並在結束時 lock(false)");
      });
    }
  });

  selftest.register({
    id: "games/fast-mode-reaches-every-path", group: "games", env: "node", tier: "fast",
    title: "家族 C：極速模式對玩家承諾「全遊戲生效」，手動與買入路徑不得硬寫 turbo:false",
    run: function (t) {
      var eng = strip(rd("core/instant.js"));
      t.ok(!/turbo:\s*false/.test(eng), "core/instant.js 不得再出現硬寫的 turbo: false（手動路徑因此永遠拿不到極速）");
      t.ok(/launch\(bet,\s*\{\s*turbo:\s*fastMode\(\)\s*\}\)/.test(eng), "手動路徑必須把 fastMode() 傳進投注出口 launch()");
      t.ok(/turbo:\s*turbo\.checked\s*\|\|\s*fastMode\(\)/.test(eng), "自動路徑的 turbo 必須是 checkbox 或極速模式");
      BUY_SLOTS.forEach(function (f) {
        var c = strip(rd(f));
        t.ok(!/turbo\s*:\s*false/.test(c), f + " 的買入呼叫不得硬寫 turbo:false（買入動畫 p90 十幾秒，極速要吃得到）");
        t.ok(/gset\s*&&\s*HL\.gset\.get\("fast"\)/.test(c), f + " 的買入呼叫必須讀 HL.gset 的 fast 設定");
      });
      // 設定面板對玩家的承諾字樣還在（承諾與實作要一起改，不准只改一邊）
      t.ok(/全遊戲生效/.test(rd("views/game-frame.js")), "game-frame 的極速模式說明應仍寫著「全遊戲生效」（改字前先確認實作真的做到）");
    }
  });

  selftest.register({
    id: "games/crash-x/auto-cashout-before-bust", group: "games", env: "node", tier: "fast",
    title: "crash-x：自動兌現必須先於崩盤判定求值，且以目標倍數兌現（一拍 60ms 可同時跨過兩者）",
    run: function (t) {
      var c = strip(rd("views/instant-crash-mines.js"));
      var iAuto = c.indexOf("autoTarget && !cashed"), iBust = c.indexOf("mult >= crashAt");
      t.ok(iAuto >= 0 && iBust >= 0, "應同時找到自動兌現與崩盤兩個判定");
      t.ok(iAuto < iBust, "自動兌現必須排在崩盤判定之前——順序反了，崩盤點高於玩家目標的回合仍會被判輸（實測 auto@" + iAuto + " / bust@" + iBust + "）");
      t.ok(/autoTarget\s*<=\s*crashAt/.test(c), "自動兌現必須確認目標確實低於崩盤點（否則會把該輸的局賠出去）");
      t.ok(/mult\s*=\s*autoTarget;/.test(c), "必須把 mult 夾成 autoTarget 才派彩：按「這一拍算到的倍數」會多賠溢出那一段");
    }
  });

  selftest.register({
    id: "games/mines/reveal-epoch", group: "games", env: "node", tier: "fast",
    title: "mines：揭曉階梯必須綁局世代（跨局殘留會把 💎 畫到新棋盤上、那些格子從此點不動）",
    run: function (t) {
      var c = strip(rd("views/instant-crash-mines.js"));
      var rev = body(c, "revealRestSafe");
      t.ok(rev.length > 80, "應取得 revealRestSafe() 函式體（實測 " + rev.length + " 字元）");
      t.ok(/var\s+d\s*=\s*0,\s*ep\s*=\s*epoch/.test(rev), "revealRestSafe 必須在排程前先鎖定當前局世代 ep");
      t.ok(/ep\s*!==\s*epoch/.test(rev), "每一階的回呼必須檢查世代是否已經換局");
      t.ok(/epoch\+\+/.test(c), "start() 必須 epoch++ 讓上一局的階梯失效");
      t.ok(!/Infinity/.test(c), "不得留下會算出 Infinity× 的路徑（下一格倍數在翻完最後一格時是除以零）");
      t.ok(/safeCount \+ 1 <= maxSafe/.test(c), "「下一格」必須夾在可翻上限內");
    }
  });

  selftest.register({
    id: "games/bounty/mine-cashout-needs-one-pick", group: "games", env: "node", tier: "fast",
    title: "賞金局踩地雷：0 格不得兌現（否則 x0.00 直接輸整注並吃掉一次挑戰次數）",
    run: function (t) {
      /* 【缺陷 #14】cashBtn 在「開始挑戰」後立即解鎖、mineMult 從 0 起算 ⇒ 開局誤按一下兌現＝
       * Math.round(bet*0)=0 ⇒ afterPlay(0)＝扣光整注 + playsLeft--。同專案的 Mines 明文擋這件事
       * （instant-crash-mines.js: safeCount===0 → toast「至少翻一格再兌現」→ return）。此鎖釘死同一守衛。 */
      /* 2026-08-22 遊戲軌 16:00：#37 把兌現重構成單一出口 function cashNow(auto)（手動鈕 + 全安全格翻完自動終局共用），
       * 守衛從 cashBtn 內移進 cashNow。依 §10.1 改守新形狀下的同一不變量（非放寬）：
       *   ① 守衛仍在兌現路徑內、② 仍排在結算(mineActive=false)之前、③ 仍 return、
       *   ④ 反向錨：cashBtn 必須真的路由到 cashNow（否則守衛雖在卻不護按鈕＝借鄰函式作偽證）。 */
      var c = strip(rd("views/bounty.js"));
      var i = c.indexOf("function cashNow");
      t.ok(i >= 0, "應找到兌現單一出口 function cashNow");
      var seg = c.slice(i, i + 500);
      var iGuard = seg.indexOf("mineMult <= 0");
      var iSettle = seg.indexOf("mineActive = false");
      t.ok(iGuard >= 0, "兌現出口必須有『mineMult<=0 就擋』的守衛（0 格＝零倍＝白輸整注）");
      t.ok(iSettle >= 0, "應找到結算起點 mineActive = false");
      t.ok(iGuard < iSettle, "守衛必須排在結算(mineActive=false/扣款)之前，否則擋不住白輸那一注（實測 guard@" + iGuard + " / settle@" + iSettle + "）");
      t.ok(/mineMult <= 0[^}]{0,90}return;/.test(seg), "守衛命中後必須 return（錨死到下一個 } 之前，不得 fall-through 到結算）");
      t.ok(/cashBtn\.addEventListener\([^;]{0,80}cashNow\(/.test(c), "反向錨：兌現鈕必須路由到 cashNow（守衛才真的護得到手動兌現）");
    }
  });

  // ── #37 賞金局踩地雷：全部安全格翻完＝回合封頂終局，必須自動兌現＋鎖盤（不得掛著等玩家去踩剩下的雷）──
  //   對照同專案正牌 Mines(instant-crash-mines.js:170 safeCount===N-mines⇒cashOut)。負向擾動：拿掉 safeFlipped>=safeTotal 的自動兌現即紅。
  selftest.register({
    id: "games/bounty/all-safe-auto-terminal", group: "games", env: "node", tier: "fast",
    title: "賞金局踩地雷：全部安全格翻完必須自動兌現終局（cashNow(true)），不得引導玩家去踩剩下的雷",
    run: function (t) {
      var c = strip(rd("views/bounty.js"));
      t.ok(/safeTotal\s*=\s*TILES\s*-\s*mineBombs/.test(c), "終局判定分母 safeTotal 必須 = TILES - mineBombs");
      t.ok(/var\s+safeFlipped\s*=\s*0/.test(c), "safeFlipped 必須每次 renderMine 開頭歸零（否則跨局殘留提早觸發終局）");
      t.ok(c.indexOf("safeFlipped++") >= 0, "每翻開一個安全格(💎 分支)必須 safeFlipped++");
      t.ok(/safeFlipped\s*>=\s*safeTotal[^;{}]{0,40}cashNow\(true\)/.test(c),
        "全部安全格翻完(safeFlipped>=safeTotal)必須立即 cashNow(true) 自動兌現（錨死同一 statement，不得借鄰句作偽證）");
      // 反向錨：自動終局走的 cashNow 必然把 mineActive 設 false ⇒ 剩餘雷格的 tile click 守衛(!mineActive)即擋下＝鎖盤
      t.ok(/function cashNow[\s\S]{0,400}mineActive\s*=\s*false/.test(c), "cashNow 必須設 mineActive=false（自動終局後剩餘雷格因 !mineActive 守衛而不可點＝鎖盤）");
    }
  });

  // ── #65 賞金局翻牌：開局 RPC 在途期間「開始挑戰」鈕仍留在 DOM ⇒ 連點兩下送兩次 bounty_flip（扣兩次費、兩條揭示鏈互踩同一組模組全域）──
  //   同專案的踩地雷路徑(startBtn: if(mineActive)return + mineActive=true 排在 RPC 前)與 chicken.js 都有做，只有翻牌漏了。
  //   修：加閉包旗標 fBusy＝翻牌 in-flight 閘（startFlip 進場 if(fBusy)return；startFlipServer 於 RPC 前設 true、.then 首行還原 false）。
  //   rpc() 失敗必解析為 null（api.js 有 .catch→null）⇒ .then 恆執行、fBusy 不會鎖死。
  //   負向擾動：P1 刪 startFlip 的 if(fBusy)return／P2 把旗標搬到 RPC 之後／P3 刪 fBusy=true／P4 刪 .then 的還原 ⇒ 對應斷言各自轉紅。
  selftest.register({
    id: "games/bounty/flip-inflight-lock", group: "games", env: "node", tier: "fast",
    title: "賞金局翻牌：開局 RPC 在途必須鎖住（連點兩下不得送出兩次 bounty_flip / 兩次扣費）",
    run: function (t) {
      var c = strip(rd("views/bounty.js"));
      // ① startFlip 進場守衛：if (fBusy) return，且排在派彩路徑(startFlipServer/startFlipClient)之前
      var iSF = c.indexOf("function startFlip(");
      t.ok(iSF >= 0, "應找到開局入口 function startFlip");
      var seg = c.slice(iSF, iSF + 300);
      var iGuard = seg.indexOf("if (fBusy) return");
      var iDispatch = seg.indexOf("startFlipServer()");
      t.ok(iGuard >= 0, "startFlip 進場必須有 in-flight 守衛 if (fBusy) return（第二次點擊在此早退）");
      t.ok(iDispatch >= 0, "反向錨：startFlip 必須真的路由到 startFlipServer（守衛才護得到 RPC 在途那條路）");
      t.ok(iGuard >= 0 && iDispatch >= 0 && iGuard < iDispatch,
        "守衛必須排在派發 RPC(startFlipServer) 之前（實測 guard@" + iGuard + " / dispatch@" + iDispatch + "）");
      // ② startFlipServer：旗標於 RPC 前設 true
      var iSS = c.indexOf("function startFlipServer(");
      t.ok(iSS >= 0, "應找到會員伺服器路徑 function startFlipServer");
      var segS = c.slice(iSS, iSS + 400);
      var iSet = segS.indexOf("fBusy = true");
      var iRpc = segS.indexOf("HL.api.playBountyFlip");
      t.ok(iSet >= 0, "startFlipServer 必須設 fBusy = true（否則旗標恆 false＝守衛形同虛設）");
      t.ok(iRpc >= 0, "應找到 HL.api.playBountyFlip 派發點");
      t.ok(iSet >= 0 && iRpc >= 0 && iSet < iRpc,
        "旗標必須在派發 RPC 之前設（放到之後＝第一次點擊已把 RPC 送出去了，實測 set@" + iSet + " / rpc@" + iRpc + "）");
      // ③ .then 首段：先 #15 epoch 世代閘、緊接還原 fBusy = false（rpc 失敗亦解析為 null ⇒ 不會鎖死；且結果卡「再挑戰一次」才能再開局）
      t.ok(/playBountyFlip\([^;]*\)\.then\(function \(R\) \{\s*if \(tk !== epoch\) return;\s*fBusy = false/.test(c),
        "RPC .then 首段必須先 if (tk !== epoch) return;（#15 世代閘）再 fBusy = false 還原（非 stale 路徑照常解鎖、不鎖死）");
      // ③b stale 路徑（tk !== epoch）早退不解鎖 ⇒ render() 進新掛載必須 fBusy = false 重置（否則離場中 RPC 未回、再進場被舊旗標鎖死）
      t.ok(body(c, "render").indexOf("fBusy = false") >= 0,
        "render() 進場必須 fBusy = false（#15：stale .then 早退不解鎖，靠新掛載重置以免鎖死）");
    }
  });

  // ── #38 Crash X：自動兌現倍數在 start() 只讀一次(:autoTarget 快照)，起飛後輸入必須鎖住，杜絕「可打字卻被靜默丟棄」的假控件──
  //   真實 crash 的自動兌現亦是起飛前設定、飛行中不可改。負向擾動：拿掉起飛鎖(autoIn.disabled=true)或 stop 解鎖即紅。
  selftest.register({
    id: "games/crash-x/auto-cashout-input-locked", group: "games", env: "node", tier: "fast",
    title: "Crash X：起飛時定格 autoTarget 後必須鎖住 autoIn 輸入、回合結束(stop)才解鎖（不得留可打字卻無效的假控件）",
    run: function (t) {
      var c = strip(rd("views/instant-crash-mines.js"));
      t.ok(/autoTarget\s*=\s*Math\.max\(0,[^;]*\);\s*autoIn\.disabled\s*=\s*true/.test(c),
        "start() 定格 autoTarget(Math.max) 後必須緊接 autoIn.disabled=true（值已快照 ⇒ 輸入須誠實地不可再改）");
      t.ok(/function stop\(\)[\s\S]{0,240}autoIn\.disabled\s*=\s*false/.test(c),
        "回合結束 stop() 必須解鎖 autoIn.disabled=false（下一局起飛前才能改）");
    }
  });

  // ── #69 Crash X（2026-08-28 遊戲軌·high·wrong-genre）：兌現後回合必須繼續飛到崩盤點才揭曉──
  //   舊版 cashOut() 一兌現就 stop()（clearInterval 凍結火箭）＋ addHist(crashAt)（立刻貼出玩家沒看到的崩盤倍數）。
  //   ⇒ crash 類型最核心的「看它後來飛到哪」揭曉被吞掉、歷史記的是未演出的結果。
  //   修法＝兌現只鎖定派彩(setBal 當下入帳＋cashed=true 防重複兌現)，讓 60ms 迴圈續爬到 crashAt，
  //        由 bust() 在真正抵達那刻唯一一次 stop()+addHist(crashAt)；bust 的 !cashed 守衛防重複記損。
  //   為何是源碼結構鎖：純數學(Crash.crashOf)不變，缺陷純在 render 的收尾時機 ⇒ 守「兌現路徑不得結束回合、
  //        崩盤揭曉是 stop/addHist 的唯一發生點、迴圈保留崩盤判定」才守得住現象（§4「修一半」家族）。
  //   負向擾動：P1 cashOut 補回 stop()／P2 補回 addHist(crashAt)／P3 拿掉 cashed=true／P4 bust 拿掉 addHist(crashAt)／
  //        P5 bust 拿掉 stop()／P6 bust 拿掉 !cashed 守衛／P7 迴圈拿掉 mult>=crashAt 分支 ⇒ 對應斷言各自轉紅。
  selftest.register({
    id: "games/crash-x/round-continues-after-cashout", group: "games", env: "node", tier: "fast",
    title: "Crash X：兌現後回合不結束、火箭續飛到崩盤點才揭曉（stop/addHist 只在 bust 發生）＝修 game-feel #69 wrong-genre",
    run: function (t) {
      var c = strip(rd("views/instant-crash-mines.js"));
      var co = body(c, "cashOut"), bu = body(c, "bust");
      t.ok(co.length > 40, "應取得 crash cashOut() 函式體（實測 " + co.length + " 字元）");
      t.ok(bu.length > 40, "應取得 crash bust() 函式體（實測 " + bu.length + " 字元）");
      // ① 兌現路徑不得結束回合、不得記錄歷史（那是玩家沒看到的崩盤倍數）
      t.ok(co.indexOf("stop()") < 0, "兌現後不得結束回合：cashOut 內不得呼叫 stop()（否則火箭凍結、看不到後來飛到哪）");
      t.ok(co.indexOf("addHist(") < 0, "兌現時不得 addHist：crashAt 是玩家沒看到的崩盤倍數，只能在 bust() 真正抵達時記錄");
      // ② 派彩仍在兌現當下入帳（money 不延後）＋鎖住重複兌現
      t.ok(/cashed\s*=\s*true/.test(co), "兌現必須 cashed=true 鎖住重複兌現（也讓迴圈之後略過自動兌現分支）");
      t.ok(/setBal\(bal\(\)\s*\+\s*payout\)/.test(co), "兌現必須當下入帳 setBal(bal()+payout)（贏額不因延後揭曉而延後入帳）");
      // ③ 崩盤揭曉是 stop()+addHist(crashAt) 的唯一發生點
      t.ok(bu.indexOf("addHist(crashAt)") >= 0, "bust() 必須在抵達 crashAt 時 addHist(crashAt)（歷史記真正崩盤點）");
      t.ok(bu.indexOf("stop()") >= 0, "bust() 必須 stop() 結束回合（兌現後續飛到此才收尾）");
      // ④ bust 的重複記損守衛仍在（兌現過的回合到崩盤不得再記一次敗局/liveStats）
      t.ok(/if\s*\(\s*!cashed\s*\)/.test(bu), "bust() 必須 !cashed 守衛：兌現過的回合抵達崩盤時不得再記一次敗局/liveStats");
      // ⑤ 迴圈仍保留崩盤判定：兌現後火箭要真的飛得到 crashAt 才揭曉（不得早停迴圈）
      t.ok(/mult\s*>=\s*crashAt/.test(c), "60ms 迴圈必須保留崩盤判定(mult>=crashAt→bust)，兌現後才續飛得到崩盤揭曉");
    }
  });

  // ── #44 Pirots 靜態擺設盤：不得含 ≥minCluster 同色連通群（那是依自家規則早該被收集的非法待機態）──
  //   功能鎖：載入 restingGrid 純函式、對多個 seed 實算 findClusters ⇒ 全部必為 0 群。
  //   反向錨：對一個「不過濾 cluster」的對照盤(fillGrid 原始種子)必須測得出 cluster，證明量測法本身抓得到（否則 restingGrid 退化成直接 fillGrid 也會全綠）。
  selftest.register({
    id: "games/pirots/resting-board-no-cluster", group: "games", env: "node", tier: "fast",
    title: "Pirots 待機盤：restingGrid 對任意 seed 都不得含 ≥minCluster 同色連通群（合法待機態）",
    run: function (t) {
      var P = load("slot-pirots.js");
      t.ok(P && typeof P.restingGrid === "function", "slot-pirots 應匯出 restingGrid");
      if (!P || !P.restingGrid) return;
      var bad = 0, tot = 0, controlHit = 0;
      for (var i = 0; i < 300; i++) {
        var seed = (i * 2654435761) >>> 0;
        var r = P.restingGrid(seed);
        if (P.findClusters(r.grid, r.size).length) bad++;
        tot++;
        // 對照：同 seed 直接 fillGrid（不過濾）— 量測法須至少對某些種子測得出 cluster，否則 findClusters 形同虛設
        var raw = []; var rng = P.mulberry32(seed), sz = P.CFG.sizeBase, rr, cc;
        for (rr = 0; rr < sz; rr++) { raw[rr] = []; for (cc = 0; cc < sz; cc++) raw[rr][cc] = (function () { var tw = P.CFG.scatterWt, k; for (k = 0; k < P.CFG.colors; k++) tw += P.CFG.colorWt[k]; var x = rng() * tw, acc = 0; for (k = 0; k < P.CFG.colors; k++) { acc += P.CFG.colorWt[k]; if (x < acc) return k; } return -1; })(); }
        if (P.findClusters(raw, sz).length) controlHit++;
      }
      t.equal(bad, 0, "restingGrid 產出的待機盤必須全部無 ≥minCluster 群（實測非法盤 " + bad + "/" + tot + "）");
      t.ok(controlHit > 0, "反向錨：未過濾的原始盤必須有部分含 cluster（證明 findClusters 抓得到，量測法非恆 0）");
    }
  });

  // ── #9 shadow-ritual 自動旋轉不得 off-by-one（×N 恰跑 N 局；啟動那一局也要計數）──
  //   這條是三種鎖裡最強的一種：不是 grep 源碼形狀，而是**把 autoStep 純函式載進 node、依 render 閉包的
  //   真實流程模擬整段自動旋轉、實算跑了幾局**。舊寫法 `if(st.auto>0){st.auto--; spin}`（先檢查再遞減再無條件續）
  //   會讓 ×10 實跑 11 局；正解走 CORE.autoStep（遞減後才續）。負向擾動：把 autoStep 改回「遞減前檢查」即紅。
  selftest.register({
    id: "games/shadow-ritual/autospin-count-exact", group: "games", env: "node", tier: "fast",
    title: "shadow-ritual：自動旋轉 ×N 必須恰跑 N 局（啟動局計數在內，不得 off-by-one 跑成 N+1）",
    run: function (t) {
      var mod = load("slot.js"), C = mod && mod.shadowRitual;
      if (!C || typeof C.autoStep !== "function") t.skip("模組未載入或未暴露 autoStep（slot.js·HL.shadowRitual）");
      // 依 render 閉包實際流程模擬純基本模式的自動旋轉：toggleAuto 直接 spin 一次（啟動局），
      // 其後每完成一局基本旋轉就 autoStep 一次；cont 為真才續下一局。guard 防壞變異造成無窮迴圈。
      function runAuto(N) {
        var auto = N, spins = 0, guard = 0;
        if (auto > 0) spins++;                       // 啟動局（toggleAuto 的 `if(!st.busy) spin()`）
        while (guard++ < 100000) {
          var a = C.autoStep(auto); auto = a.next;
          if (a.cont) spins++; else break;
        }
        return spins;
      }
      [0, 1, 2, 3, 5, 10, 25].forEach(function (N) {
        t.ok(runAuto(N) === N, "×" + N + " 自動旋轉應恰跑 " + N + " 局，實跑 " + runAuto(N) + " 局（off-by-one＝啟動局未計數／續轉判斷寫在遞減前）");
      });
      // autoStep 契約：cont 恆等於「遞減後仍 >0」，即最後一局後必停
      t.ok(C.autoStep(1).cont === false && C.autoStep(1).next === 0, "autoStep(1) 應為最後一局（next=0、cont=false）");
      t.ok(C.autoStep(10).cont === true && C.autoStep(10).next === 9, "autoStep(10) 應遞減為 9 且續轉");
      t.ok(C.autoStep(0).next === 0 && C.autoStep(0).cont === false, "autoStep(0) 不得回負或續轉");
      // 結構：render 閉包三處續轉點（base 續轉／endCandle／endCursed）一律走 CORE.autoStep，
      //   且舊的「遞減後無條件續」寫法不得殘留（否則某條路徑仍會 off-by-one）。
      var src = strip(rd("views/slot.js"));
      var n = (src.match(/CORE\.autoStep\(st\.auto\)/g) || []).length;
      t.ok(n >= 3, "自動旋轉三處續轉點都要走 CORE.autoStep（實測命中 " + n + " 處，應 ≥3）");
      t.ok(!/st\.auto--;\s*setTimeout\(spin/.test(src), "不得殘留舊寫法 `st.auto--; setTimeout(spin)`（先檢查再遞減再無條件續＝off-by-one 病根）");
    }
  });

  // ── #17 dead-by-noon 乘數徽章不得留上一拍的殘影（每次連爆的彈膛乘數是各自計算，非累積）──
  selftest.register({
    id: "games/dead-by-noon/mult-badge-per-cascade", group: "games", env: "node", tier: "fast",
    title: "dead-by-noon：每一 win 拍都要據實回設乘數徽章（無彈膛＝×1），不得只在 >1 時更新而留殘影",
    run: function (t) {
      /* 【缺陷 #17 stale-hud】彈膛乘數（chamberMult）是**每次 cascade 各自計算**（無彈膛則 =1），並非累積；
       * 但徽章舊寫法 `if(e.mult>1) setMult(e.mult)` 只在 >1 時更新 ⇒ 上一拍的 ×12 會留在實際只乘 ×1 的
       * 連爆上，玩家看到的乘數與該拍實付倍數矛盾。修法：win 拍一律 setMult(e.mult)（pop 仍保留 >1 才彈）。 */
      var play = body(strip(rd("views/slot-dead-by-noon.js")), "playEvents");
      t.ok(play.length > 100, "應取得 playEvents() 函式體（實測 " + play.length + " 字元）");
      t.ok(/e\.t==="win"[\s\S]{0,120}setMult\(e\.mult\)/.test(play), "win 拍必須呼叫 setMult(e.mult) 據實回設徽章");
      t.ok(!/if\s*\(\s*e\.mult\s*>\s*1\s*\)\s*setMult/.test(play), "setMult 不得再被 `e.mult>1` 守住（那正是殘影病根：×1 拍不回設）");
      t.ok(/e\.mult>1[\s\S]{0,40}pop\(/.test(play), "「彈膛 ×N！」pop 應仍只在 e.mult>1 時彈（×1 沒有彈膛，不該喊彈膛）");
    }
  });

  // ── #70 dead-by-noon 乘數彈膛「數字持久」：彈膛落盤即開膛抽定、隨下落一路帶著（不再每次 cascade 重抽亂跳）──
  (function () {
    var dmod = load("slot-dead-by-noon.js");
    var COLS = dmod && dmod.COLS, ROWS = dmod && dmod.ROWS, CHIP = 10;
    selftest.register({
      id: "games/dead-by-noon/chamber-digit-persists", group: "games", env: "node", tier: "fast",
      title: "dead-by-noon：彈膛數字落盤即揭曉且隨下落持久（同一顆籌碼沿路數字不變、非每 cascade 重抽）",
      run: function (t) {
        if (!dmod || typeof dmod.simSpin !== "function" || !ROWS) t.skip("模組未載入（slot-dead-by-noon.js）");
        /* 【缺陷 #70 wrong-genre】招牌機制「乘數彈膛」原本每次 cascade 都對盤上每顆 🎯 重抽 drawDigit ⇒ 同一顆籌碼
         * 沿路數字亂跳、且落盤當下不揭曉（只在 win 拍才畫數字）。檔頭/資訊列卻承諾「落盤即開膛露 1–9、隨下落串接
         * 累積」＝文案與程式打架。修法：數字在 newGrid/cascadeDown 落盤當下抽定並綁在持久 dg 上（隨籌碼下落），
         * chamberMult 純讀不再抽 ⇒ 沿路數字恆定、落盤即揭曉、隨下落累積。此鎖同守三面（結構+持久+揭曉）。 */
        // ① 源碼結構：chamberMult 純讀（不得 drawDigit）；newGrid + cascadeDown 落盤/補位時 drawDigit（揭曉+持久之源）
        var src = strip(rd("views/slot-dead-by-noon.js"));
        var cm = body(src, "chamberMult"), ng = body(src, "newGrid"), cd = body(src, "cascadeDown");
        t.ok(cm.length > 30 && ng.length > 30 && cd.length > 30, "應取得 chamberMult/newGrid/cascadeDown 函式體");
        t.ok(!/drawDigit\s*\(/.test(cm), "chamberMult 不得再呼叫 drawDigit（須純讀持久 dg，否則每 cascade 重抽＝亂跳病根）");
        t.ok(/drawDigit\s*\(/.test(ng), "newGrid 落盤時必須 drawDigit 開膛（落盤即揭曉之源）");
        t.ok(/drawDigit\s*\(/.test(cd), "cascadeDown 頂列補位時必須 drawDigit（新落籌碼開膛）");
        // ② 行為：籌碼沿下落保持同一數字（win 拍某 r<ROWS-1 的籌碼 → 下一 cascade 拍應於 r+1 同數字現身）
        function dmap(list) { var o = {}; (list || []).forEach(function (d) { o[d.r + "," + d.c] = d.d; }); return o; }
        var checked = 0, viol = 0, ex = "";
        for (var seed = 1; seed < 400000 && checked < 500; seed++) {
          var ev = dmod.simSpin(dmod.mulberry32(seed), 0, true).timeline.base;
          for (var i = 0; i + 1 < ev.length; i++) {
            if (ev[i].t === "win" && ev[i + 1].t === "cascade") {
              var pre = dmap(ev[i].digits), post = dmap(ev[i + 1].digits), k;
              for (k in pre) { if (!pre.hasOwnProperty(k)) continue; var p = k.split(","), r = +p[0], c = +p[1];
                if (r < ROWS - 1) { checked++; var nk = (r + 1) + "," + c;
                  if (post[nk] !== pre[k]) { viol++; if (!ex) ex = "seed " + seed + " 籌碼 " + k + " d=" + pre[k] + "→" + nk + " 得 " + post[nk]; } } }
            }
          }
        }
        t.ok(checked >= 200, "應蒐集足量『籌碼下落』轉場樣本（實測 " + checked + "，需 ≥200）");
        t.ok(viol === 0, "籌碼下落後數字改變 " + viol + " 例（持久性破損：" + ex + "）");
        // ③ 行為：落盤即揭曉——初盤含籌碼的局，fill 拍必須帶出等量籌碼數字（不得整局只畫 🎯）
        var fillChk = 0, fillMiss = 0;
        for (var s2 = 1; s2 < 400000 && fillChk < 100; s2++) {
          var f = dmod.simSpin(dmod.mulberry32(s2), 0, true).timeline.base[0];
          if (f && f.t === "fill" && f.grid) {
            var chips = 0, r2, c2; for (r2 = 0; r2 < ROWS; r2++) for (c2 = 0; c2 < COLS; c2++) if (f.grid[r2][c2] === CHIP) chips++;
            if (chips > 0) { fillChk++; if (!f.digits || f.digits.length !== chips) fillMiss++; }
          }
        }
        t.ok(fillChk >= 30, "應蒐集足量『初盤含籌碼』樣本（實測 " + fillChk + "）");
        t.ok(fillMiss === 0, "初盤含籌碼卻在 fill 拍未揭曉數字 " + fillMiss + " 例（落盤即揭曉破損）");
      }
    });
  })();

  // ── #30 Mines 收局揭曉必須完整：踩雷收局也要翻出剩下的💎（不只翻雷）──
  selftest.register({
    id: "games/mines/loss-reveals-all", group: "games", env: "node", tier: "fast",
    title: "mines：踩雷收局要翻出剩下的💎（比照兌現收局），否則輸的那次揭曉殘缺（只翻雷不翻鑽）",
    run: function (t) {
      /* 【缺陷 #30 incomplete-reveal】reveal() 的踩雷分支原本只 lockAll(true)（翻雷），
       * 而 cashOut() 是 revealRestSafe()+lockAll(true)（雷+鑽全翻）⇒ 輸的那次盤面殘缺。
       * 真實 Mines(Stake) 收局全揭。修法：踩雷分支也呼叫 revealRestSafe()（有 epoch 世代閘＝跨局安全）。 */
      var rev = body(strip(rd("views/instant-crash-mines.js")), "reveal");
      t.ok(rev.length > 100, "應取得 reveal() 函式體（實測 " + rev.length + " 字元）");
      // 踩雷分支：record(0) 之後、lockAll(true) 之前必須 revealRestSafe()
      t.ok(/record\(0\);\s*revealRestSafe\(\);\s*lockAll\(true\)/.test(rev),
        "踩雷收局必須 record(0)→revealRestSafe()→lockAll(true)（先翻剩下的鑽，再翻雷並鎖盤）");
      // 兌現收局也必須維持全揭（回歸鎖：兩條收局路徑都得翻鑽）。用 mines 專屬的 is-win+revealRestSafe 錨點，
      //   避免撞到同檔 crashGame 也有的 cashOut()（body("cashOut") 只會取到第一個）。
      var src = strip(rd("views/instant-crash-mines.js"));
      t.ok(/gridEl\.classList\.add\("is-win"\);\s*revealRestSafe\(\);\s*lockAll\(true\)/.test(src),
        "兌現收局也必須 revealRestSafe()（回歸鎖：兩條收局路徑都得翻鑽）");
    }
  });

  // ── #7 shadow-ritual 餘額見底時必須停掉自動旋轉（不得留 st.auto 殭屍計數）──
  selftest.register({
    id: "games/shadow-ritual/lowbal-stops-autospin", group: "games", env: "node", tier: "fast",
    title: "shadow-ritual：餘額見底時必須停掉自動旋轉（不得留 st.auto 殭屍計數、下次手動旋轉自動接續）",
    run: function (t) {
      /* 【缺陷 #7 missing-control】spin() 的餘額不足分支原本只 toast+return、未清 st.auto ⇒
       * 自動旋轉途中把錢燒完後 st.auto 殘留 >0、自動鈕仍顯示剩餘次數；玩家日後手動按一次旋轉，
       * finishRound 的 `st.mode==="base" && st.auto>0` 分支就自動接續剩下局數（殭屍計數）。
       * 正解：比照同函式 RG 限額早退分支與 instant.js 的 stopAuto，餘額不足時也清 st.auto=0。 */
      var sp = body(strip(rd("views/slot.js")), "spin");
      t.ok(sp.length > 100, "應取得 spin() 函式體（實測 " + sp.length + " 字元）");
      // 餘額不足分支：toast("餘額不足") 之後**緊接**必須是 `if (st.auto > 0) { st.auto = 0`。
      //   ⚠️ 不可用寬鬆的 [\s\S]{0,N} 前瞻——那會越過本分支、命中緊鄰 RG 早退分支的 st.auto=0，
      //   造成「刪掉餘額分支的歸零仍全綠」（負向擾動 #7-M1 實測踩到＝『鎖的定義比它守的那件事寬』家族）。
      t.ok(/餘額不足"[^;]*;\s*if\s*\(\s*st\.auto\s*>\s*0\s*\)\s*\{\s*st\.auto\s*=\s*0/.test(sp),
        "餘額不足 toast 之後必須緊接 `if (st.auto>0){st.auto=0}` 清殭屍計數（不得只清緊鄰的 RG 分支＝#7 病根）");
      // 回歸鎖：RG 限額早退分支也必須停自動旋轉（兩條早退都得清，否則另一路徑仍會殘留）
      t.ok(/HL\.rg[\s\S]{0,90}st\.auto\s*=\s*0/.test(sp),
        "RG 限額早退分支也必須清 st.auto=0（回歸鎖：兩條早退都得停自動旋轉）");
    }
  });

  // ── #61/#62 shadow-ritual 回合進行中必須鎖住押注 ± 與購買功能（no-commit-lock）──
  //   病根：暗影儀式自帶控件面板（不走 betPanel），故家族 A 的 betPanel lock/isBusy 引擎修從沒覆蓋到它。
  //   #61＝押注 ± 在旋轉/連爆/免費遊戲全程無鎖 ⇒ 改注會改變「已付款那一注」剩餘連爆與整輪免費遊戲的結算基準；
  //   #62＝購買功能鈕在回合進行中仍可點 ⇒ 買入立刻扣款並把進行中回合的 mode/roundWin/rows 當場清掉。
  //   正解：單一謂詞 betLocked()＝`st.busy || st.mode!=="base"`（旋轉中或處於免費遊戲），betBtn/買入函式進場即問它。
  //   ⚠️ 這些是 DOM 閉包處理器、node 無 layout 跑不動 ⇒ 用源碼結構鎖，且必須錨「守衛排在會改動狀態的那一步之前」
  //     （只驗「有出現 betLocked」會被『把守衛搬到扣款/改注之後』的擾動打空＝『鎖的定義比它守的那件事寬』家族）。
  selftest.register({
    id: "games/shadow-ritual/controls-locked-during-round", group: "games", env: "node", tier: "fast",
    title: "shadow-ritual：回合進行中必須鎖住押注 ±／購買功能（#61/#62，守衛須排在改注/扣款之前）",
    run: function (t) {
      var src = strip(rd("views/slot.js"));
      // ① 謂詞本身：betLocked 必須同時看 st.busy 與 st.mode（不得被弱化成恆 false／只看其一）
      var bl = body(src, "betLocked");
      t.ok(bl.length > 0, "slot.js 必須有 betLocked() 謂詞（實測 " + bl.length + " 字元）");
      t.ok(/st\.busy/.test(bl) && /st\.mode\s*!==\s*"base"/.test(bl),
        "betLocked 必須同時涵蓋 st.busy（動畫/連爆）與 st.mode!==\"base\"（免費遊戲），不得只守其一或恆 false（#61/#62 病根）");
      // ② #61 押注 ±：betBtn 的 onClick 內，betLocked() 守衛必須排在 `st.bet = BETS` 改注之前
      var bb = body(src, "betBtn");
      t.ok(bb.length > 0, "應取得 betBtn() 函式體（實測 " + bb.length + " 字元）");
      var iG = bb.indexOf("betLocked"), iSet = bb.indexOf("st.bet = BETS");
      t.ok(iG >= 0 && iSet >= 0 && iG < iSet,
        "betBtn 必須在改注（st.bet = BETS）之前先 `if (betLocked()) return`（實測 guard@" + iG + " / set@" + iSet + "）");
      // ③ #62 購買（權威閘）：buyBaphomet／buyCursed 進場守衛必須排在 spend(-cost) 扣款之前
      ["buyBaphomet", "buyCursed"].forEach(function (fn) {
        var fb = body(src, fn);
        t.ok(fb.length > 0, "應取得 " + fn + "() 函式體");
        var ig = fb.indexOf("betLocked"), isp = fb.indexOf("spend(-cost)");
        t.ok(ig >= 0 && isp >= 0 && ig < isp,
          fn + " 必須在扣款（spend(-cost)）之前先 `if (betLocked()) return`（權威閘·實測 guard@" + ig + " / spend@" + isp + "）");
      });
      // ④ 回歸鎖：buyMenu 也要在開選單前擋掉（UX 層，避免選單開著跨過狀態變更）
      var bm = body(src, "buyMenu");
      var img = bm.indexOf("betLocked"), imodal = bm.indexOf("HL.ui.modal");
      t.ok(img >= 0 && imodal >= 0 && img < imodal,
        "buyMenu 必須在開啟購買選單（HL.ui.modal）之前先問 betLocked（回歸鎖·實測 guard@" + img + " / modal@" + imodal + "）");
    }
  });

  // ── shadow-ritual 載入進度計時器離場自清（家族 B·計時器洩漏）──
  //   病根：載入畫面用 setInterval 每 180ms 假推進進度條，100% 時 clearInterval 並 setTimeout(buildGame(root))。
  //     若玩家在 ~2.5s 載入期間離場（底部導覽/返回），該計時器**過去無存活守衛** ⇒ 續跑對 detached bar 寫 width，
  //     且到 100% 仍對已 detached 的 root 跑 buildGame（建整套 slot DOM 到永不顯示的樹＝白工＋次生洩漏）。
  //   兄弟閘現成形制：crash 計時器（instant-crash-mines.js:105 `!multEl.isConnected`）、
  //     roulette 滾號（table-roulette.js:130 `!pocket.isConnected`）皆已自清，唯獨此載入器漏掉。
  //   正解：回呼首行 `if (!bar.isConnected) { clearInterval(iv); return; }`（掛載時 isConnected 恆真＝零行為變更）。
  //   ⚠️ DOM 閉包、node 無 layout ⇒ 源碼結構鎖，且守衛須排在 pct 遞增（會續跑的副作用）之前，且必須真的 clearInterval。
  selftest.register({
    id: "games/shadow-ritual/loader-interval-self-guards-on-exit", group: "games", env: "node", tier: "fast",
    title: "shadow-ritual：載入進度計時器離場自清（!bar.isConnected 守衛須排在 pct 遞增前並 clearInterval，否則續跑並對 detached root 跑 buildGame）",
    run: function (t) {
      var src = strip(rd("views/slot.js"));
      var iBar = src.indexOf("bar.style.width");
      t.ok(iBar >= 0, "slot.js 應有載入進度條計時器（bar.style.width）");
      var iGuard = src.indexOf("!bar.isConnected");
      var iMut = src.indexOf("pct += rint");
      t.ok(iGuard >= 0, "載入器回呼必須有 `!bar.isConnected` 存活守衛（離場後續跑並對 detached root 跑 buildGame＝家族 B 洩漏）");
      t.ok(iGuard >= 0 && iMut >= 0 && iGuard < iMut,
        "守衛必須排在 pct 遞增之前（實測 guard@" + iGuard + " / mut@" + iMut + "），否則『鎖比它守的那件事寬』");
      var seg = src.slice(iGuard, iGuard + 60);
      t.ok(/clearInterval\(iv\)/.test(seg), "守衛內必須 clearInterval(iv)（只 return 不清 ⇒ 計時器每 180ms 續跑不止）");
    }
  });

  // ── #1 chicken 結算後控件必須立刻回「靜止態」（家族 F·說謊的控件）──
  //   病根：celebrate() 只設 st.active=false 卻不刷新控件 ⇒ 兌現後 1.5 秒（resetRound 前）兌現鈕仍亮著、
  //     按下被 cashout() 的 `!st.active` 守衛靜默吞掉；出發鈕仍寫「出發 ▶」但語意已成扣款開新局、不顯示押注額。
  //   正解：st.active=false 後**立刻** updateButtons()（順序必須在 active=false 之後，否則刷的是進行中態）。
  //   ⚠️ DOM 閉包、node 無 layout ⇒ 源碼結構鎖，且必須錨「updateButtons 排在 st.active=false 之後」
  //     （只驗「有出現 updateButtons」會被『把它擺到 active=false 之前』的擾動打空＝『鎖比它守的那件事寬』家族）。
  selftest.register({
    id: "games/chicken/controls-refresh-on-settle", group: "games", env: "node", tier: "fast",
    title: "chicken：兌現結算後 celebrate 必須立刻 updateButtons（排在 st.active=false 之後，杜絕 1.5s 說謊控件）",
    run: function (t) {
      var src = strip(rd("views/chicken.js"));
      var cb = body(src, "celebrate");
      t.ok(cb.length > 0, "應取得 celebrate() 函式體（實測 " + cb.length + " 字元）");
      // ① celebrate 內必須把回合設為非進行中（結算語意）
      var iActive = cb.indexOf("st.active = false");
      t.ok(iActive >= 0, "celebrate 必須設 st.active = false（結算＝回合結束）");
      // ② 必須刷新控件，且排在 st.active=false 之後（否則刷的是進行中態＝兌現鈕仍亮、出發鈕仍寫「出發 ▶」）
      var iUpd = cb.indexOf("updateButtons");
      t.ok(iUpd >= 0, "celebrate 必須呼叫 updateButtons()（否則兌現後 1.5s 控件不刷新＝#1 說謊控件病根）");
      t.ok(iActive >= 0 && iUpd >= 0 && iActive < iUpd,
        "updateButtons 必須排在 st.active=false 之後（實測 active@" + iActive + " / update@" + iUpd + "），否則刷的是進行中態、控件照樣說謊");
      // ③ 一併還原 busy（會員兌現路徑 setBusy(true) 未歸位）：不還原則 updateButtons 後出發鈕恆 disabled
      t.ok(cb.indexOf("st.busy = false") >= 0,
        "celebrate 必須把 st.busy 還原為 false（會員兌現走 setBusy(true)，不還原則刷新後出發鈕恆 disabled）");
      // ④ 回歸錨（給 ② 一個 witness）：updateButtons 本身仍以 st.active 決定出發鈕標籤與兌現鈕可用性
      var ub = body(src, "updateButtons");
      t.ok(/goBtn\.textContent\s*=\s*st\.active\s*\?/.test(ub),
        "updateButtons 必須以 st.active 決定出發鈕標籤（active「出發 ▶」／否則「出發（押…）」），否則 ② 的刷新無效");
      t.ok(/cashBtn\.disabled\s*=\s*!\s*canCash/.test(ub) && /canCash\s*=\s*st\.active/.test(ub),
        "updateButtons 必須以 st.active 決定兌現鈕可用性（canCash 含 st.active），否則結算後兌現鈕不轉灰");
    }
  });

  // ── #49 chicken 死亡演出三段計時器必須帶 epoch 世代閘（家族 stale-timer）──
  //   病根：本檔每個 RPC 回呼都有 `var tk = epoch; if (tk !== epoch) return;`（:162/:190/:272），
  //     唯獨 Demo 路徑的死亡三段裸 setTimeout（hopDeath→playDeath 400ms／playDeath 撞飛 330ms／afterDeath→resetRound 1500ms）
  //     沒有 ⇒ 換頁後 render() epoch++，殘留計時器仍動模組全域 st/lanes/chickEl，在剛進來的乾淨待機頁
  //     上演幽靈死亡 + 冒「小雞陣亡 · 輸掉」toast（並讓 lanes[st.step-1] 在 st.step===0 取 lanes[-1]，撞車靜默降級成火燒）。
  //   正解：三段計時器各自 `var tk = epoch` 捕捉、回呼首列 `if (tk !== epoch) return;`（比照 RPC 回呼閘）。
  //   ⚠️ 死亡路徑**零金錢**（注在 startRound 已扣）⇒ 閘住純視覺、不會吞掉派彩；hopTo 蓄意不閘（其 done 走 cashLocal
  //     會動 Demo 自動兌現派彩，閘它＝吞玩家贏分）。故本鎖同時錨「三段死亡體內不得出現送幣呼叫」，防未來把結算搬進閘後。
  selftest.register({
    id: "games/chicken/death-timers-epoch-gated", group: "games", env: "node", tier: "fast",
    title: "chicken：死亡演出三段計時器（hopDeath/playDeath/afterDeath）必須帶 epoch 世代閘（杜絕換頁後幽靈死亡 toast）",
    run: function (t) {
      var src = strip(rd("views/chicken.js"));
      var hd = body(src, "hopDeath"), pd = body(src, "playDeath"), ad = body(src, "afterDeath");
      t.ok(hd.length > 0 && pd.length > 0 && ad.length > 0,
        "應取得 hopDeath/playDeath/afterDeath 三函式體（實測 " + hd.length + "/" + pd.length + "/" + ad.length + " 字元）");
      // ① hopDeath：捕捉 epoch，且 400ms 計時器回呼在呼叫 playDeath 前先閘
      t.ok(hd.indexOf("var tk = epoch") >= 0, "hopDeath 必須 `var tk = epoch` 捕捉世代");
      t.ok(/tk\s*!==\s*epoch\s*\)\s*return;\s*playDeath/.test(hd),
        "hopDeath 的 setTimeout 回呼必須先 `if (tk !== epoch) return;` 再 playDeath（否則換頁後仍在新頁演死亡）");
      // ② playDeath：捕捉 epoch，且撞飛（330ms）計時器回呼在動 chickEl 前先閘
      t.ok(pd.indexOf("var tk = epoch") >= 0, "playDeath 必須 `var tk = epoch` 捕捉世代");
      t.ok(/tk\s*!==\s*epoch\s*\)\s*return;\s*chickEl\.classList\.add\("is-hit"\)/.test(pd),
        "playDeath 撞車第二段計時器必須先閘再加 is-hit（否則換頁後仍演撞飛+冒 boom）");
      // ③ afterDeath：捕捉 epoch，且 resetRound 前先閘（否則在新頁 buildRoad 清掉玩家剛進的新局盤）
      t.ok(ad.indexOf("var tk = epoch") >= 0, "afterDeath 必須 `var tk = epoch` 捕捉世代");
      t.ok(/tk\s*!==\s*epoch\s*\)\s*return;\s*resetRound/.test(ad),
        "afterDeath 的 setTimeout 回呼必須先閘再 resetRound（否則換頁後在新頁重建道路）");
      // ④ 金錢安全錨：死亡三段體內不得出現任何送幣/派彩呼叫（注已於 startRound 扣，閘純視覺才不會吞派彩）
      t.ok(!/spend\(|cashLocal\(|liveStats\.record/.test(hd + pd + ad),
        "死亡三段（hopDeath/playDeath/afterDeath）不得含 spend/cashLocal/liveStats.record（含＝閘會吞玩家派彩＝把視覺閘做成金錢閘）");
    }
  });

  // ── #15 bounty 房間切換 stale-timer/RPC 世代閘（家族 stale-timer；比照 sibling chicken 的 epoch 閘）──
  //   病根：本檔全狀態皆模組全域（room/playEl/fCardEls…），6 處 setTimeout ＋ 2 條 RPC .then 皆「延遲後」才動這些全域。
  //     玩家中途離場 → render() 進新房把 room/playEl/fCardEls 重指「下一間房」，殘留回呼卻照舊 room.playsLeft--/prizePool 改、
  //     往新房 playEl 貼結算卡（翻牌房被畫成踩地雷房、新房次數/賞金池被扣＝audit CONFIRMED·M）。
  //   正解＝epoch 世代閘：render() 進場 epoch++ + onExit 離場亦 epoch++；每個計時器/RPC.then 進場前 `var tk = epoch`、
  //     回呼首列 `if (tk !== epoch) return;`。⚠️ epoch 同時閘 RPC .then 本體（非只計時器）——clearTimers 型防禦擋不住
  //     「離場後才 resolve 的 .then 直接改 room」。本鎖把「每個 setTimeout 首列必為閘」寫成負向可擾動的硬不變量。
  selftest.register({
    id: "games/bounty/stale-timer-epoch-gated", group: "games", env: "node", tier: "fast",
    title: "bounty：所有 setTimeout 回呼與兩條 RPC .then 必須帶 epoch 世代閘，render 進場/離場皆 epoch++（杜絕換房後殘留回呼污染新房）",
    run: function (t) {
      var src = strip(rd("views/bounty.js"));
      t.ok(src.length > 0, "應讀到 bounty.js 原始碼");
      // ① epoch 世代計數宣告
      t.ok(/var epoch = 0/.test(src), "應宣告 var epoch = 0（世代計數）");
      // ② render 進場 epoch++ + 註冊 onExit 使離場亦 epoch++（底部導覽/抽屜換頁走 mountView、不經 view 內返回連結）
      var rb = body(src, "render");
      t.ok(rb.length > 0, "應取得 render() 函式體（實測 " + rb.length + " 字元）");
      // 精確錨進場那一次 epoch++（緊接 fBusy 重置）——否則 rb 內 onExit 閉包也有 epoch++、去掉進場那次仍看不出來（修一半）
      t.ok(/epoch\+\+;\s*fBusy = false/.test(rb), "render 進場必須 epoch++; fBusy = false（新掛載＝作廢上一房殘留回呼；與 onExit 閉包的 epoch++ 區分）");
      t.ok(/onExit\(function \(\) \{ epoch\+\+; \}\)/.test(rb),
        "render 必須註冊 onExit(function () { epoch++; })（離場亦作廢殘留回呼；比照 vsslot onExit）");
      // ③ 每個 setTimeout(function () { 回呼首列必為 epoch 閘 ⇒ 沒有任何裸計時器可在換房後污染新房
      var parts = src.split("setTimeout(function () {");
      t.ok(parts.length - 1 >= 6, "至少應有 6 處 setTimeout（實測 " + (parts.length - 1) + "）");
      for (var i = 1; i < parts.length; i++) {
        t.ok(/^\s*if \(tk !== epoch\) return;/.test(parts[i]),
          "第 " + i + " 個 setTimeout 回呼首列必須是 if (tk !== epoch) return;（否則換房後裸計時器污染新房）；實測起頭：「" + parts[i].slice(0, 40).replace(/\n/g, "⏎") + "」");
      }
      // ④ 兩條 RPC .then 本體首列亦必為 epoch 閘（離場後才 resolve 的 .then 會直接改 room；clearTimers 擋不住）
      t.ok(/playBountyFlip\([^)]*\)\.then\(function \(R\) \{\s*if \(tk !== epoch\) return;/.test(src),
        "playBountyFlip 的 .then 首列必須 if (tk !== epoch) return;（離場後 resolve 不得改 room/貼新房）");
      t.ok(/playBountyMine\([^)]*\)\.then\(function \(R\) \{\s*if \(tk !== epoch\) return;/.test(src),
        "playBountyMine 的 .then 首列必須 if (tk !== epoch) return;（離場後 resolve 不得改 room/重繪）");
      // ⑤ 各排程作用域須先捕捉世代（否則 .then/計時器內 tk 未定義）：flip-server/finish/mine-bust/member-mine/cashNow ≥ 5 處
      var caps = (src.match(/var tk = epoch/g) || []).length;
      t.ok(caps >= 5, "至少 5 處 var tk = epoch 捕捉點（實測 " + caps + "）");
    }
  });

  // ── #23 gem-storm 免費遊戲 retrigger 必須即時回饋（分母同轉變大 + 記錄帶 retrig 旗標供 render 慶祝）──
  //   這條是功能鎖：把 runFS 純函式載進 node、掃一小段決定性種子、實算 retrigger 記錄的分母是否「當轉就變大」。
  //   舊病根＝先 push 再加轉 ⇒ retrig 當轉仍顯示舊分母、下一轉才悄悄變大，且回傳的 retrig 從未被 render 用。
  selftest.register({
    id: "games/gem-storm/fs-retrig-feedback", group: "games", env: "node", tier: "fast",
    title: "gem-storm：免費遊戲 retrigger 分母必須同轉變大且記錄帶旗標（不得延後一轉、不得無回饋）",
    run: function (t) {
      var m = load("slot-gem-storm.js");
      if (!m || typeof m.runFS !== "function" || !m.CFG || typeof m.mulberry32 !== "function") t.skip("模組未載入（slot-gem-storm.js·HL.gemStorm）");
      var add = m.CFG.fsRetrigAdd, base = m.CFG.fsSpins;
      var sawRetrig = 0;
      // 掃一小段決定性種子（seed 3 已知 retrig=2；掃 1..80 讓鎖不倚賴單一魔術種子）
      for (var seed = 1; seed <= 80; seed++) {
        var fr = m.runFS(m.mulberry32(seed), true);
        var recs = fr.spins;
        var flagged = recs.filter(function (r) { return r.retrig === true; }).length;
        t.ok(flagged === fr.retrig, "seed " + seed + "：帶 retrig 旗標的記錄數(" + flagged + ") 必須等於回傳 retrig(" + fr.retrig + ")");
        for (var i = 0; i < recs.length; i++) {
          if (!recs[i].retrig) continue;
          sawRetrig++;
          t.ok(recs[i].retrigAdd === add, "retrig 記錄的 retrigAdd 應為 fsRetrigAdd=" + add + "，實為 " + recs[i].retrigAdd);
          // 分母必須在 retrigger「當轉」就變大、不得延後一轉：本記錄 spinsPlanned = 前一記錄分母 + add
          var prev = i > 0 ? recs[i - 1].spinsPlanned : base;
          t.ok(recs[i].spinsPlanned === prev + add,
            "seed " + seed + " 第 " + recs[i].spinNo + " 轉 retrigger：分母應同轉由 " + prev + " 變 " + (prev + add) + "，實為 " + recs[i].spinsPlanned + "（延後一轉＝#23 病根）");
        }
      }
      t.ok(sawRetrig > 0, "掃描種子中至少要出現一次 retrigger，否則此鎖形同虛設（實測 " + sawRetrig + " 次）");
      // 結構鎖：① render nextSpin 必須真的消費 sp.retrig 觸發慶祝 pop；② push 必須在加轉後、帶 retrig 旗標
      var src = strip(rd("views/slot-gem-storm.js"));
      t.ok(/sp\.retrig\s*&&[\s\S]{0,50}pop\(/.test(src),
        "render nextSpin 必須消費 sp.retrig 觸發慶祝 pop（原缺陷＝runFS.retrig 從未被 render 使用）");
      t.ok(/spinsPlanned:\s*spins,\s*retrig:\s*retrigHere/.test(src),
        "evSpins.push 必須帶 retrig:retrigHere（且在加轉後才 push＝分母同轉變大）");
    }
  });

  // ── #72 gem-storm 免費遊戲「總贏分」pot 計分板：顯示值必須＝實付 FS 派彩（同尺·跨轉累積·不倒退）──
  //   舊病根＝tumble 進行中顯示「當轉 running.acc × G」(每轉重置)，轉間卻顯示「跨轉 acc.v(漏乘 G)」：兩個不同尺/不同範圍
  //   交替寫同一顆 badge ⇒ 數字每轉倒退(seed 1 實測 61.6× → 0.46×)，且免費結束顯示值恰為實付 FS 派彩的 1/2.3。
  //   功能鎖：fsPotDisplay(Σ sp.seqWin, 0) 必等於 runFS 回傳的實付 total（跨 seeds，含 bomb-applied 路徑）。
  selftest.register({
    id: "games/gem-storm/fs-pot-equals-payout", group: "games", env: "node", tier: "fast",
    title: "gem-storm：免費遊戲 pot 顯示值必須＝實付 FS 派彩（套 CFG.G、夾 maxWin、跨轉累積不重置）",
    run: function (t) {
      var m = load("slot-gem-storm.js");
      if (!m || typeof m.runFS !== "function" || typeof m.fsPotDisplay !== "function" || !m.CFG || typeof m.mulberry32 !== "function") t.skip("模組未載入（slot-gem-storm.js·HL.gemStorm）");
      var G = m.CFG.G, maxWin = m.CFG.maxWin;
      // 單位鎖：fsPotDisplay 必須套 G（未達上限）、confirmed 與 liveRaw 同尺相加、並在 maxWin 夾頂
      t.ok(Math.abs(m.fsPotDisplay(10, 0) - 10 * G) < 1e-9, "fsPotDisplay 必須套 CFG.G（10 → " + (10 * G) + "）；漏乘 G＝#72 顯示值 1/" + G + " 病根");
      t.ok(Math.abs(m.fsPotDisplay(3, 7) - (3 + 7) * G) < 1e-9, "fsPotDisplay 必須把 confirmed 與 liveRaw 同尺相加後套 G");
      t.ok(m.fsPotDisplay(maxWin, 0) === maxWin, "fsPotDisplay 必須夾在 maxWin（不得顯示超過可派上限）");
      // 功能鎖：免費結束顯示值(fsPotDisplay(Σ sp.seqWin,0)) 必等於實付 FS 派彩(fr.total＝(Σ seqWin)×G 夾頂)
      var checked = 0, sawWin = 0, sawBomb = 0;
      for (var seed = 1; seed <= 300; seed++) {
        var fr = m.runFS(m.mulberry32(seed), true);
        var confirmedPreG = fr.spins.reduce(function (a, s) { return a + s.seqWin; }, 0);
        var disp = m.fsPotDisplay(confirmedPreG, 0);
        t.ok(Math.abs(disp - fr.total) < 1e-6,
          "seed " + seed + "：免費 pot 最終顯示值(" + disp + ") 必須等於實付 FS 派彩(" + fr.total + ")；差＝漏乘 G 或漏套炸彈");
        checked++;
        if (fr.total > 0) sawWin++;
        if (fr.spins.some(function (s) { return s.applied > 0; })) sawBomb++;
      }
      t.ok(checked >= 300, "樣本數下限：至少掃 300 seed（實測 " + checked + "）");
      t.ok(sawWin > 0, "掃描種子中至少要有一次 FS 有贏分，否則鎖形同虛設（實測 " + sawWin + "）");
      t.ok(sawBomb > 0, "掃描種子中至少要有一次炸彈乘數生效，否則沒驗到 bomb-applied 路徑（實測 " + sawBomb + "）");
      // 結構鎖：render 兩處 pot 顯示都必須走 fsPotDisplay，且每轉 run 帶跨轉 base；舊病根形態不得殘留
      var src = strip(rd("views/slot-gem-storm.js"));
      t.ok(src.indexOf("fsPotDisplay(running.base, running.acc)") >= 0,
        "render tumble 進行中的 pot 必須走 fsPotDisplay(running.base,…)（跨轉 base），不得回到每轉重置的 running.acc*CFG.G");
      t.ok(src.indexOf("fsPotDisplay(acc.v, 0)") >= 0,
        "render 轉間結算的 pot 必須走 fsPotDisplay(acc.v,0)（跨轉總和×G），不得回到裸 setPot(acc.v)＝漏乘 G");
      t.ok(src.indexOf("base: acc.v") >= 0,
        "每轉 run 物件必須帶 base: acc.v（跨轉累積起點），否則 pot 會每轉重置倒退");
      t.ok(src.indexOf("setPot(running.acc*CFG.G)") < 0, "不得殘留舊寫法 setPot(running.acc*CFG.G)（每轉重置＝#72 倒退病根）");
      t.ok(src.indexOf("setPot(acc.v)") < 0, "不得殘留舊寫法 setPot(acc.v)（漏乘 G＝#72 顯示值 1/" + G + " 病根）");
    }
  });

  // ── #22 gem-storm tumble 連鎖必須有「消除」中間影格（亮→消失→補位、玩家可數鎖數）──
  //   舊病根＝playSteps 逐 step 直接把「中獎高亮盤」換成「完整新盤」，中間沒有一拍把中獎格清空 ⇒ 看起來像整盤瞬換、數不出連了幾鎖。
  //   修法＝純函式 cascadeBeats 把 rec.steps 展開成 highlight→eliminate（每個中獎 step 兩拍）→…→rest（單一末拍）。
  //   功能鎖：掃決定性種子，實算 eliminate 拍數＝中獎步數、每個 highlight 緊跟同盤 eliminate、rest 恰一個在末。
  //   反向錨：無中獎的單步序列不得產生任何 eliminate 拍（否則靜止盤也閃「消除」＝把非連鎖誤演成連鎖）。
  selftest.register({
    id: "games/gem-storm/cascade-eliminate-beat", group: "games", env: "node", tier: "fast",
    title: "gem-storm：tumble 連鎖每一鎖必須有獨立「消除」拍（highlight→eliminate→…→rest；不得整盤瞬換）",
    run: function (t) {
      var m = load("slot-gem-storm.js");
      if (!m || typeof m.cascadeBeats !== "function" || typeof m.baseRun !== "function" || typeof m.mulberry32 !== "function") t.skip("模組未載入（slot-gem-storm.js·HL.gemStorm）");
      var checked = 0, sawMulti = 0;
      for (var seed = 1; seed <= 200; seed++) {
        var b = m.baseRun(m.mulberry32(seed), true);
        var steps = b.steps;
        var winSteps = steps.filter(function (s) { return s.win > 0; }).length;
        var beats = m.cascadeBeats(steps);
        var elim = beats.filter(function (x) { return x.phase === "eliminate"; }).length;
        var hl = beats.filter(function (x) { return x.phase === "highlight"; }).length;
        var rest = beats.filter(function (x) { return x.phase === "rest"; }).length;
        t.ok(elim === winSteps, "seed " + seed + "：eliminate 拍數(" + elim + ") 必須＝中獎步數(" + winSteps + ")＝可數鎖數");
        t.ok(hl === winSteps, "seed " + seed + "：highlight 拍數(" + hl + ") 必須＝中獎步數(" + winSteps + ")");
        t.ok(rest === 1, "seed " + seed + "：靜止盤 rest 必須恰一拍在末（實測 " + rest + "）");
        // 每個 highlight 緊跟同盤 eliminate（先亮再清同一盤，才是「這些消失了」而非「換了一盤」）
        for (var i = 0; i < beats.length; i++) {
          if (beats[i].phase === "highlight") {
            var nx = beats[i + 1];
            t.ok(nx && nx.phase === "eliminate" && nx.grid === beats[i].grid && nx.winSyms === beats[i].winSyms,
              "seed " + seed + " 拍 " + i + "：highlight 後必須緊跟同盤同 winSyms 的 eliminate 拍");
          }
        }
        // 末拍必為 rest
        t.ok(beats[beats.length - 1].phase === "rest", "seed " + seed + "：最後一拍必為 rest（靜止盤）");
        checked++;
        if (winSteps >= 2) sawMulti++;
      }
      t.ok(checked >= 200, "樣本數下限：至少掃 200 seed（實測 " + checked + "）");
      t.ok(sawMulti > 0, "掃描種子中至少要有一次多鎖連爆（winSteps≥2），否則沒驗到『數鎖數』情境（實測 " + sawMulti + "）");
      // 反向錨：無中獎的單步序列 → 只有 rest、零 eliminate
      var r0 = m.cascadeBeats([{ win: 0, grid: [[0]], winSyms: {} }]);
      t.ok(r0.length === 1 && r0[0].phase === "rest", "反向錨：無中獎單步必須只產生一個 rest 拍");
      t.ok(r0.filter(function (x) { return x.phase === "eliminate"; }).length === 0, "反向錨：無中獎不得產生任何 eliminate 拍（否則靜止盤也閃消除）");
      // 結構鎖：render 的 playSteps 必須消費 cascadeBeats，且 eliminate 拍必須以清空格渲染（走 clearCells 參數）
      var src = strip(rd("views/slot-gem-storm.js"));
      t.ok(/var\s+beats\s*=\s*cascadeBeats\(steps\)/.test(src),
        "playSteps 必須把 steps 展開成 cascadeBeats（否則回到逐 step 瞬換、無消除拍）");
      t.ok(/b\.phase\s*===\s*"eliminate"[\s\S]{0,160}winCellsOf\(b\.grid,\s*b\.winSyms\)/.test(src),
        "eliminate 拍必須把中獎格當 clearCells 傳給 renderGrid（把「消失」演出來），否則消除拍與高亮拍同形");
      t.ok(/clearCells\s*&&\s*clearCells\[key\]/.test(src),
        "renderGrid 必須支援 clearCells＝中獎格清空渲染（is-clear），這是消除中間影格的落地");
    }
  });

  selftest.register({
    id: "games/limbo/climb-from-one", group: "games", env: "node", tier: "fast",
    title: "limbo：倍數必須從 1.00× 往上爬，不得拿上一局的崩盤倍數當起點（半數局會倒數下來）",
    run: function (t) {
      var c = strip(rd("views/instant-games.js"));
      t.ok(!/parseFloat\(bigEl\.textContent\)/.test(c),
        "不得拿 bigEl 現有文字當動畫起點——全檔只有這個動畫會寫它，所以那個值恆為上一局結果");
      t.ok(/from\s*=\s*1;/.test(c), "起點必須是 1（崩盤類型的語意是往上爬）");
      t.ok(/bigEl\.textContent\s*=\s*"1\.00×"/.test(c), "開場也要把畫面重設成 1.00×，否則起點只有在程式裡成立");
    }
  });

  selftest.register({
    id: "games/arena/tempo-beats", group: "games", env: "node", tier: "fast",
    title: "節奏：五拍必須存在（承諾/逐輪結果/決勝蓄勢/懸念/高潮），且 view 不得再寫裸毫秒",
    run: function (t) {
      var vs = strip(rd("views/vsslot.js"));
      var T = (function () { try { return require(path.join(__dirname, "..", "src", "core", "battle-tempo.js")); } catch (e) { return null; } })();
      if (!T) { t.skip("模組未載入（core/battle-tempo.js）"); return; }
      function has(needle, msg) { t.ok(vs.indexOf(needle) >= 0, msg); }
      /* 【缺陷】節拍原本是散落在兩支 view 的裸常數（1500/500/700/380×sp…），而且缺整整五拍：
       * 承諾倒數、逐輪結果停留、決勝輪蓄勢、勝負懸念、勝負高潮。最要命的是「逐輪結果停留」＝0，
       * 一輪跑完只有 228ms（預設 fast）就進下一輪 ⇒ 全場沒有任何一拍屬於「這一輪誰贏了」。 */
      ["commit", "round_result", "suspense", "climax_lose", "climax_win", "reveal_stagger", "spin_stagger", "round_gap", "first_spin_lead", "match_search", "seat_fill"]
        .forEach(function (b) { has(b, "節奏拍 " + b + " 必須由 vsslot 使用（不得回到裸毫秒）"); });
      has("function commitCountdown", "必須有承諾倒數（S4，整套節奏的支點）");
      has("function climaxThen", "必須有勝負高潮流程（S9/S10）");
      has("T.finalPrepMs(room.mode", "必須有決勝輪蓄勢，且 terminal 要更長");
      // 不得再出現這些已被節奏表取代的裸常數
      t.ok(vs.indexOf("380 * sp") < 0, "輪間間隔不得再寫 380 * sp");
      t.ok(vs.indexOf("later(phaseFound, 1500)") < 0, "配對節拍不得再寫裸 1500");
      t.ok(vs.indexOf("later(phaseGame, 700)") < 0, "全員就緒不得再是裸 700ms 空拍（要走承諾倒數）");
      // 每一拍都要寫進 DOM：headless 驗不到 rAF/transition，但驗得到 data-beat
      has("function setBeat", "必須把節奏狀態寫進 DOM（data-beat）供驗證");
      ["round-spin", "round-reveal", "round-score", "round-gap", "final-prep", "suspense", "climax-lose", "climax-win", "settled"]
        .forEach(function (b) { has(String.fromCharCode(34) + b + String.fromCharCode(34), "必須標記 data-beat=" + b); });
      // 常數表本身的關係（詳細斷言在 battle-tempo/constants）
      t.ok(T.ms("round_result", 1, { live: false }) > 0, "逐輪結果停留必須是正數（原本是 0＝這一拍不存在）");
      t.ok(T.ms("suspense", T.SPEED.ultra, { live: false }) >= Math.round(3000 * T.STRUCT_FLOOR), "懸念拍受結構下限保護");
    }
  });

  selftest.register({
    id: "games/arena/in-play-standings", group: "games", env: "node", tier: "fast",
    title: "對戰中必須顯示名次/本輪增量/與第一名差距/勝負條件，且主數字＝排名用的量",
    run: function (t) {
      var vs = strip(rd("views/vsslot.js"));
      var rs = body(vs, "refreshStandings");
      var Q = String.fromCharCode(34);   // 雙引號（避免這條鎖自己被轉義層數搞死）
      function has(hay, needle, msg) { t.ok(hay.indexOf(needle) >= 0, msg); }
      function hasNot(hay, needle, msg) { t.ok(hay.indexOf(needle) < 0, msg); }
      /* 【缺陷】每席只有頭像/名字/盤面/一個數字，小字寫死「總分」；crazy 是最低分勝、terminal 比末輪增量
       * ⇒ 十輪裡九輪的數字與勝負無關，玩家看著分數上升其實正在輸。全檔沒有名次、差距、本輪增量、
       * 領先高亮，名次第一次出現是在結算卡；四人房就是四個等權裸數字並排。
       * 這條鎖守的是「有沒有走那個出口」，所以用字串包含而不是模式比對。 */
      t.ok(rs.length > 300, "必須有單一出口 refreshStandings 且非空（實測 " + rs.length + " 字元）");
      has(rs, "BM.rankBy(room.mode", "名次必須走 battleMode.rankBy");
      has(rs, "BM.leaderIndex(room.mode", "領先必須走 leaderIndex（不得自己比大小）");
      has(rs, "BM.metricOf(room.mode", "主數字必須是 metricOf（terminal＝本輪增量）");
      has(rs, "BM.gapTo(room.mode", "差距必須走 gapTo（方向由模式決定）");
      has(rs, "BM.lowerBetter(room.mode)", "crazy 的「得分是壞事」必須反映在文案/配色上");
      has(vs, "displayMetricLabel(room.mode)", "席位小字必須用 displayMetricLabel");
      hasNot(vs, "text: " + Q + "總分" + Q, "不得再出現寫死的「總分」標籤（terminal 局那是假的）");
      has(vs, "winCondText()", "infoBar 必須常駐勝負條件（不是只有一顆徽章）");
      has(vs, "還剩 " + Q + " + (rounds - rIdx)", "必須顯示還剩幾輪");
      // 一起揭曉：Demo 路徑不得再即時寫分數（否則空窗期並排比較會判錯領先者）
      hasNot(vs, "if (!SRV) s.totalEl.textContent", "Demo 路徑不得在 onWin 即時寫計分板");
      /* 一起揭曉的形狀在 2026-08-21 節奏改造後變了：join barrier 之後跑一個「最差者先、領先者最後」
       * 的錯開揭曉迴圈。守的不變量沒變——分數只能在**全員跑完之後**才寫上畫面。 */
      has(vs, "var cums = SRV", "本輪分數必須在 join barrier 之後才算出（全員跑完再揭曉）");
      has(vs, "worstFirst", "揭曉順序必須是「目前最差者先、領先者最後」（每輪重演一次會不會被超車）");
      has(vs, "reveal_stagger", "跨席位揭曉必須錯開（原本 0＝四個數字同時跳）");
      // 先跑完的席位要有狀態，不得留白
      has(vs, "已完成", "每席必須有「已完成」狀態（留白會被玩家當成顯示 BUG）");
      has(vs, "進行中", "每席必須有「進行中」狀態");
    }
  });

  selftest.register({
    id: "games/arena/exit-hook-settles-escrow", group: "games", env: "node", tier: "fast",
    title: "離場鉤：用底部導覽/抽屜換頁也必須據實了結對戰（否則已預扣的賭注被靜默沒收）",
    run: function (t) {
      var sh = strip(rd("layout/app-shell.js")), mn = strip(rd("main.js")), vs = strip(rd("views/vsslot.js"));
      /* 【這條鎖在守什麼】escrow 的了結入口原本只有兩個：view 內的返回連結、關閉 PiP。
       * 玩家用底部導覽／側邊抽屜換頁走的是 mountView ⇒ 兩個入口都沒經過：錢扣了、不記敗局、
       * 不進 liveStats、連 toast 都沒有＝靜默沒收（而且下次進場還會把 escrow 標記清成 0，痕跡也沒了）。 */
      t.ok(/HL\.shell = \{[\s\S]*?onExit: onExit[\s\S]*?runExit: runExit/.test(sh), "HL.shell 必須出口 onExit/runExit");
      var mv = body(sh, "mountView");
      t.ok(/runExit\(/.test(mv), "mountView 必須跑離場鉤");
      t.ok(mv.indexOf("runExit(") < mv.indexOf("HL.dom.clear"), "離場鉤必須排在清 DOM 之前（清掉之後 view 就沒機會結帳了）");
      t.ok(/HL\.shell\.runExit\(/.test(body(mn, "renderApp")), "renderApp（全量重繪）也必須跑離場鉤");
      // 一次性：跑完要清空，否則舊 view 的鉤子會在後面每次換頁都再開火
      var re = body(sh, "runExit");
      t.ok(/exitFns = \[\]/.test(re), "runExit 必須把清單清空（一次性）");
      // 對戰必須註冊，且註冊的動作要真的了結（清計時器 + 棄局）
      t.ok(/HL\.shell\.onExit\(/.test(vs), "vsslot 必須註冊離場鉤");
      var reg = vs.slice(vs.indexOf("HL.shell.onExit("), vs.indexOf("HL.shell.onExit(") + 400);
      t.ok(/clearTimers\(\)/.test(reg) && /forfeitEscrow\(\)/.test(reg), "離場鉤內必須 clearTimers + forfeitEscrow");
    }
  });

  selftest.register({
    id: "games/arena/tie-break-and-fairness", group: "games", env: "node", tier: "fast",
    title: "平手不得由席位順序決定（原本一律判索引 0＝你贏），且對戰要有可驗證公平入口",
    run: function (t) {
      var BM = (function () { try { return require(path.join(__dirname, "..", "src", "core", "battle-mode.js")); } catch (e) { return null; } })();
      if (!BM) { t.skip("模組未載入"); return; }
      /* 【缺陷】rankBy 的比較器平手回 0 ⇒ V8 穩定排序保持席位建立順序 ⇒ 平手一律判索引 0（你）贏。
       * terminal 末輪雙 0 在 1v1 實測約 1.72%：畫面顯示全員 NT$0 卻給你獎盃。 */
      var tie = [{ i: 0, total: 0, last: 0 }, { i: 1, total: 0, last: 0 }];
      t.equal(BM.rankBy("terminal", tie, 0.05)[0].i, 0, "tieRoll 低 → 席位 0 勝");
      t.equal(BM.rankBy("terminal", tie, 0.95)[0].i, 1, "tieRoll 高 → 席位 1 勝（不再恆為索引 0）");
      t.equal(BM.tieAtTop("terminal", tie), 2, "tieAtTop 必須查得出榜首平手人數（UI 要據實說「平手→抽籤」）");
      t.equal(BM.tieAtTop("normal", [{ total: 9 }, { total: 1 }]), 0, "非平手時 tieAtTop 必須是 0");
      // 非平手不得被 tieRoll 影響
      var clear = [{ i: 0, total: 100 }, { i: 1, total: 900 }];
      t.equal(BM.rankBy("normal", clear, 0.99)[0].i, 1, "非平手的名次不得被 tieRoll 動到");
      // 呼叫端必須真的把可驗證公平值傳進去（不傳＝退回席位順序＝bug 復活）
      var vs = strip(rd("views/vsslot.js"));
      t.ok(/resolve: function \(mode, totals, lastDeltas, wager, myIdx, tieRoll\)/.test(vs), "resolve 必須收 tieRoll");
      t.ok(/rankBy\(mode, entries, tieRoll\)/.test(vs), "resolve 必須把 tieRoll 傳給 rankBy");
      t.ok(/HL\.fair\.floatOr\("vsslot"\)/.test(vs), "玩家面向的結算必須從 HL.fair 取裁決值（可事後重算）");
      // 對戰的公平入口：PF 名單要收 vsslot，且 isPF 要吃得下 "vsslot:<roomId>" 這種複合 key
      var fair = strip(rd("core/fair.js"));
      t.ok(/vsslot: 1/.test(fair), "PF_GAMES 必須包含 vsslot（盤面出象本來就走 HL.fair）");
      t.ok(/split\(":"\)\[0\]/.test(fair), "isPF 必須支援複合 key（game-frame 傳的是 vsslot:<roomId>）");
      // 模式文案不得再有第二份真相
      t.ok(!/Crazy Mode：總分最低者獲勝|Terminal Mode：最後一輪決勝/.test(vs), "vsslot 不得自寫勝負條件字串");
      t.ok(/HL\.battleMode\.labelOf\(room\.mode\)/.test(vs), "modeLabel 必須走 battleMode.labelOf");
    }
  });

  selftest.register({
    id: "games/game-frame/close-pip-tears-down", group: "games", env: "node", tier: "fast",
    title: "關閉子母畫面必須真的把遊戲移出 DOM（只設 display:none ⇒ 遊戲在看不見的節點裡跑完並自行結算）",
    run: function (t) {
      var gf = strip(rd("views/game-frame.js"));
      var cp = body(gf, "closePip");
      t.ok(cp.length > 120, "應取得 closePip() 函式體（實測 " + cp.length + " 字元）");
      /* 【這條鎖在守什麼】各遊戲的存活檢查寫的是 `document.body.contains(container)`。
       * 舊版關閉 PiP 只把 pipHost 設成 display:none、stage 仍掛在 body 上 ⇒ 那個檢查**仍然為真**，
       * 於是對戰照樣跑完 10 輪、餘額自己變動、戰績入帳、結算卡渲染在沒人看得到的 DOM 裡（high）。
       * ⇒ 關閉時若移不回原外框，就必須真的 removeChild。 */
      t.ok(/removeChild\(stage\)/.test(cp), "closePip 必須把 stage 真的移出 DOM（否則存活檢查抓不到）");
      t.ok(/document\.body\.contains\(frame\)/.test(cp), "必須先判斷原外框是否還在（還在就移回去＝原行為不變）");
      t.ok(/onTeardown/.test(cp), "必須呼叫遊戲登記的 onTeardown（有錢在途的遊戲要能據實了結）");
      var iRestore = cp.indexOf("restorePip()"), iRemove = cp.indexOf("removeChild(stage)");
      t.ok(iRestore >= 0 && iRestore < iRemove, "可移回時要走 restorePip 並 return，不得直接拆掉（實測 restore@" + iRestore + " / remove@" + iRemove + "）");
      // 反向：不得只靠 display:none 當關閉
      t.ok(!/^\s*restorePip\(\);\s*$/m.test(cp), "closePip 不得退回「只呼叫 restorePip」的單行實作");
    }
  });

  selftest.register({
    id: "games/arena/battle-single-charge", group: "games", env: "node", tier: "fast",
    title: "競技場：一場對戰只准收一次賭注（建房端不得扣款；結算宣稱的淨額必須等於實際變動）",
    run: function (t) {
      var ar = strip(rd("views/arena.js")), vs = strip(rd("views/vsslot.js"));
      var cb = body(ar, "createBattle");
      t.ok(cb.length > 150, "應取得 createBattle() 函式體（實測 " + cb.length + " 字元）");
      /* 【這條鎖在守什麼】收費曾經有兩條互不知情的路：建房扣 `wager × 遊戲數 × (贊助 ? 人數 : 1)`，
       * 進場再 escrowTake(wager) 扣一次，而結算只用 wager 計 ⇒ 1v1／1 款／1000：贏了淨 0、卡上寫 +1,000；
       * 輸了淨 −2,000、卡上寫 −1,000。而且建房那筆錢**沒有任何回頭路**（房寫死 mine:false ⇒ endMyRoom
       * 不可達、r.net 全 repo 從未被寫入）＝憑空消失。⇒ 收費點只准有一個。 */
      t.ok(!/balance:\s*st\.balance\s*-/.test(cb), "createBattle 不得扣款：賭注只准由對戰本體的 escrow 收一次");
      t.ok(!/HL\.rg\.check/.test(cb), "createBattle 不得再 check 一次責任博弈（真正扣款那一刻才評估，否則同一注被算兩次）");
      t.ok(/wager > st\.balance/.test(cb), "仍須保留「買不買得起」的前置檢查（用一份賭注，不是乘完的數字）");
      // 表單顯示的金額必須等於真的會被扣的金額
      var cost = body(ar, "cost");
      t.ok(/return p\.wager;/.test(cost), "建房表單的金額必須是一份賭注（不得再乘遊戲數/人數）");
      t.ok(!/p\.games\.length/.test(cost) && !/p\.players/.test(cost), "cost() 不得再用遊戲數或人數放大");
      // escrow 仍是唯一收費點，且淨額恆等式的既有鎖還在
      /* 扣款點 2026-08-21 從 accept() 移到承諾倒數歸零那一刻（S4 LOCKED_COMMIT）＝真正的硬性 commit。
       * 守的不變量：整場只扣一次、且必須在第一輪起轉之前。 */
      t.ok(/escrowTake\(room\.wager\)/.test(vs), "對戰本體必須在開打前預扣一份賭注");
      t.ok(vs.indexOf("escrowTake(room.wager)") > vs.indexOf("function commitCountdown"),
        "扣款必須發生在承諾倒數內（倒數歸零才是封盤點；放在 accept() 等於玩家還沒看清陣容錢就沒了）");
      t.ok(vs.indexOf("escrowTake(room.wager)") < vs.indexOf("later(phaseGame"),
        "扣款必須排在進場之前");
      t.equal((vs.match(/escrowTake\(/g) || []).length, 2, "escrowTake 只准有宣告與呼叫各一處（實測 " +
        (vs.match(/escrowTake\(/g) || []).length + "）");
      // 已入座就不得再賣一次入場；「我的房間」要看得到自建對戰房
      t.ok(/function iAmSeated\(/.test(ar) && /function isMineRoom\(/.test(ar), "需有「我是否已入座／這是不是我的房」兩個判定");
      var bc = body(ar, "battleCard");
      t.ok(/!seated &&/.test(bc), "canJoin 必須先排除「我已入座」");
      t.ok(/回到對戰/.test(bc), "已入座時按鈕必須是回到對戰，不得是「加入 NT$X」");
      t.ok(/isMineRoom\(r\)/.test(body(ar, "visibleRooms")), "「我的房間」頁籤必須用 isMineRoom（否則自建對戰房永遠不出現）");
      // 🤝 不得再承諾對戰本體做不到的事
      t.ok(!/你負擔所有玩家入場費/.test(ar), "Sponsored 不得再寫「你負擔所有玩家入場費」——對戰本體零命中 sponsored");
      t.ok(!/sponsored/.test(vs), "反向確認：對戰本體確實不認得 sponsored（若哪天實作了，請一併回頭改文案與本鎖）");
    }
  });

  selftest.register({
    id: "games/arena/mode-semantics-single-truth", group: "games", env: "node", tier: "fast",
    title: "競技場：排名量/方向/勝負文案只准來自 core/battle-mode.js（各表面不得自己硬寫「總分越高越好」）",
    run: function (t) {
      var BM = (function () { try { return require(path.join(__dirname, "..", "src", "core", "battle-mode.js")); } catch (e) { return null; } })();
      if (!BM) { t.skip("模組未載入（core/battle-mode.js）"); return; }
      /* 【這條鎖在守什麼】2026-08-21 船長回報的「競技場顯示 BUG」根因是**同一條排名規則被四個表面各自硬寫**：
       * 對戰中的計分板、回放的長條圖、回放的「領先」高亮、歷史清單，全都寫成「累計總分越高越好」，
       * 而 crazy 是最低分勝、terminal 是比最後一輪增量 ⇒ 畫面與它自己記錄的勝負互相矛盾（已 live 復現）。
       * 【為什麼規則必須住在 core 而不是對戰本體】對戰本體是 #110 延遲載入的，大廳/戰績/回放是開站即載：
       * 規則放在對戰本體 ⇒ 那三個表面在還沒載入時取不到，會**靜默退回錯的排名**（第一版修法實測踩到）。 */
      t.ok(/battle-mode\.js/.test(fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8")),
        "core/battle-mode.js 必須在 index.html 首屏載入（延遲載入會讓大廳/回放取不到規則）");
      var idx = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
      t.ok(idx.indexOf("core/battle-mode.js") < idx.indexOf("views/arena.js"),
        "battle-mode.js 必須排在 views/arena.js 之前");

      // ① 對戰本體必須是消費者、不得自己定義規則
      var vs = strip(rd("views/vsslot.js"));
      t.ok(/require\("\.\.\/core\/battle-mode\.js"\)/.test(vs) && /HL\.battleMode/.test(vs),
        "vsslot 必須讀 core/battle-mode.js（node 與瀏覽器兩條路徑都要）");
      t.ok(!/mode === "terminal" \? e\.last : e\.total/.test(vs),
        "vsslot 不得自己再寫一份 metricOf（那就是第二份真相）");
      t.ok(!/mode === "crazy" \? m\(a\) - m\(b\)/.test(vs), "vsslot 不得自己再寫一份排序方向");

      // ② 回放/歷史必須讀同一個出口，且不得殘留「總分最高＝領先」的寫法
      var ar = strip(rd("views/arena.js"));
      t.ok(/HL\.battleMode/.test(ar), "arena.js 必須讀 HL.battleMode");
      t.ok(/BM\.leaderIndex\(/.test(ar), "回放的「領先」高亮必須走 BM.leaderIndex（不得自己比大小）");
      t.ok(/BM\.barFrac\(/.test(ar), "回放的條長必須走 BM.barFrac（crazy 下要反向，才會與領先同軸）");
      t.ok(!/if \(rd\[k\] > rd\[leadIdx\]\)/.test(ar), "不得回到「總分最高＝領先」的硬寫法（這正是原 bug）");
      t.ok(/BM\.winCondOf\(|battleMode\.winCondOf\(/.test(ar), "勝負條件文案必須來自同一個出口（畫面要寫給玩家看）");
      t.ok(!/HL\.vsslot && HL\.vsslot\.metricOf/.test(ar),
        "arena.js 不得改讀 HL.vsslot（延遲載入 ⇒ 開站直接開戰績時會靜默退回錯的排名）");

      // ③ 語意本身：crazy 的領先者是低分、terminal 由增量決定、條長與領先同軸
      t.equal(BM.leaderIndex("crazy", [{ total: 600 }, { total: 200 }]), 1, "crazy 領先者＝分數低者");
      t.equal(BM.leaderIndex("terminal", [{ total: 1050, last: 50 }, { total: 800, last: 700 }]), 1, "terminal 領先者由增量決定");
      var loserBar = BM.barFrac("crazy", 600, 600), winnerBar = BM.barFrac("crazy", 200, 600);
      t.ok(winnerBar > loserBar, "crazy 下贏家（低分）的條必須比較長，否則畫面與勝負反向");
    }
  });

  selftest.register({
    id: "games/vsslot/escrow-equivalence", group: "games", env: "node", tier: "fast",
    title: "vsslot：賭注預扣＋贏家通吃付回，淨效果必須恆等於舊版的 net（不得因為加了 escrow 就改變經濟）",
    run: function (t) {
      var CORE = (function () { try { return require(path.join(__dirname, "..", "src", "views", "vsslot.js")).vsslot; } catch (e) { return null; } })();
      if (!CORE) { t.skip("模組未載入（vsslot.js）"); return; }
      /* 【為什麼要這條】escrow 是為了擋「落後就走、零成本逃單」而加的**硬性 commit**，
       * 但它動的是金流：接受時 −wager、結算時付回 `win ? wager×N : 0`。
       * 這條鎖證明兩件事合起來**恆等於**舊版的 `balance += net`——也就是說修掉逃單漏洞的同時
       * 沒有偷偷改變任何一場對戰的期望值（零和性質不變）。 */
      var bad = [];
      [2, 3, 4].forEach(function (n) {
        ["normal", "crazy", "terminal"].forEach(function (mode) {
          [true, false].forEach(function (iWin) {
            var wager = 100;
            // 造出「我(索引0)贏」或「我輸」的分數：standard 比總分、crazy 比最低、terminal 比最後一輪
            var totals = [], last = [], i;
            for (i = 0; i < n; i++) { totals.push(i === 0 ? (iWin ? 900 : 100) : 500); last.push(i === 0 ? (iWin ? 90 : 10) : 50); }
            if (mode === "crazy") { for (i = 0; i < n; i++) totals[i] = (i === 0 ? (iWin ? 100 : 900) : 500); }
            var R = CORE.resolve(mode, totals, last, wager, 0);
            if (R.win !== iWin) { bad.push(mode + "/n=" + n + " 造分沒有造出預期的勝負（測項自身的前提壞了）"); return; }
            var escrowNet = -wager + (R.win ? wager * n : 0);   // 新版：預扣 + 付回
            if (escrowNet !== R.net) bad.push(mode + "/n=" + n + "/" + (iWin ? "win" : "lose") + "：escrow 淨額 " + escrowNet + " ≠ CORE.net " + R.net);
          });
        });
      });
      t.equal(bad.length, 0, bad.join("；"));

      // 形狀鎖：三個「一旦被拿掉就靜默回到逃單」的接線點
      var v = strip(rd("views/vsslot.js"));
      /* 扣款點 2026-08-21 移到承諾倒數歸零那一刻（S4 LOCKED_COMMIT）＝真正的封盤。
       * accept() 只做「買不買得起」與責任博弈的前置檢查，此時尚未扣款（倒數期間離開不必棄局）。
       * 守的不變量沒變：整場只扣一次，且必須在第一輪起轉之前。 */
      t.ok(/escrowTake\(room\.wager\)/.test(body(v, "commitCountdown")), "承諾倒數歸零時必須扣款（唯一的硬性 commit 點）");
      t.ok(!/escrowTake/.test(body(v, "accept")), "accept() 不得再直接扣款（玩家還沒看清陣容錢就沒了）");
      t.ok(/HL\.rg\.check\(room\.wager\)/.test(body(v, "accept")), "accept() 仍須保留責任博弈前置檢查");
      t.ok(/onClick:\s*leaveBattle/.test(v), "對戰畫面的返回鈕必須走 leaveBattle（棄局路徑），不得直接 backArena");
      /* 派彩金額的算式不變（贏家通吃全桌注），但 2026-08-21 之後它先算成 payout、
       * 由高潮動畫結束後才真的入帳（餘額不得比動畫先跳）⇒ 這裡守算式與「入帳排在動畫之後」兩件事。 */
      t.ok(/var payout = win \? room\.wager \* sides\.length : 0/.test(v), "本機結算必須付回『贏家通吃全桌注』");
      t.ok(/climaxThen\(R\.winnerIdx, payout,/.test(v), "派彩必須交給高潮流程，在動畫結束後才入帳");
      t.ok(/escrowSettle\(payout\)/.test(body(v, "climaxThen")), "escrowSettle 必須在 climaxThen 內（動畫之後）");
      /* ⚠️ 這裡刻意用 setBeat 的標記而不是 T.ms("climax_lose") 的位置來判順序：
       * 巢狀回呼會讓「延遲毫秒數」的字面位置與**執行順序相反**（外層的 delay 寫在最後一行）。
       * setBeat 是在各拍開頭呼叫的，它的字面順序才等於執行順序——第一版就是被這個坑騙到。 */
      var cx = body(v, "climaxThen");
      t.ok(cx.indexOf('setBeat("suspense")') < cx.indexOf('setBeat("climax-lose")'), "懸念拍必須排在高潮之前");
      t.ok(cx.indexOf('setBeat("climax-lose")') < cx.indexOf('setBeat("climax-win")'), "必須先掃輸（敗方灰化）再派贏（輪盤 take-and-pay 慣例）");
      t.ok(cx.indexOf("escrowSettle(payout)") > cx.indexOf('setBeat("climax-win")'), "餘額必須在獎池動畫之後才更新（比動畫先跳＝顯示 BUG 的體感來源）");
      t.ok(cx.indexOf('setBeat("settled")') > cx.indexOf("escrowSettle(payout)"), "settled 拍必須排在入帳之後");
      /* 棄局必須據實記一筆敗局。2026-08-21 把邏輯收斂進 forfeitEscrow()，因為現在有**兩個**入口會棄局：
       * ① 對戰中按返回（leaveBattle）② 外框被真正關掉（關閉子母畫面而原視窗已不在 ⇒ onTeardown）。
       * 守的是「有在途賭注就要記帳」，不是它寫在哪個函式裡。 */
      t.ok(/HL\.liveStats\.record\("Slots Battle", lost, 0\)/.test(body(v, "forfeitEscrow")), "forfeitEscrow 必須據實記一筆敗局");
      t.ok(/forfeitEscrow\(\)/.test(body(v, "leaveBattle")), "按返回離場必須走棄局路徑");
      t.ok(/onTeardown:\s*function/.test(v) && /forfeitEscrow\(\)/.test(v.slice(v.indexOf("onTeardown"))),
        "必須向 gameFrame 登記 onTeardown 並在其中棄局（否則關掉 PiP 後對戰會在隱藏 DOM 裡跑完並自行結算）");
      // 會員模式：RPC 必須在開打前取（否則就是事後整批覆蓋玩家看到的過程）
      // 首輪起轉的延遲 2026-08-21 從裸 300ms 改成節奏表的 first_spin_lead（兩條路徑統一）
      var iPre = v.indexOf("HL.api.playBattle"), iRun = v.lastIndexOf('later(runRound, T.ms("first_spin_lead"');
      t.ok(iPre >= 0 && iRun > iPre, "playBattle 必須排在開打之前（實測 rpc@" + iPre + " / runRound@" + iRun + "）");
      t.ok(/if \(!SRV\) return finishLocal\(\)/.test(body(v, "finish")), "結算不得再自己打一次 RPC（要用開打前取到的那一份）");
      t.ok(/noPopup:\s*memberMode/.test(v), "伺服器決定分數時不得彈客端分數（那些數字不是最終分）");
      t.ok(/!opts\.noPopup/.test(strip(rd("views/fgboard.js"))), "fgBoard 必須支援 noPopup");
    }
  });

  selftest.register({
    id: "games/table-engine/staged-settle", group: "games", env: "node", tier: "fast",
    title: "家族 D＋E：6 款桌遊的結算必須分兩拍（先掃輸家籌碼、再付贏家），且三顆控制鈕鎖得住",
    run: function (t) {
      var eng = strip(rd("core/table.js"));
      t.ok(/settleStaged\s*:\s*settleStaged/.test(eng), "HL.table 的 betArea 必須出口 settleStaged");
      var st = body(eng, "settleStaged");
      t.ok(st.length > 200, "應取得 settleStaged() 函式體（實測 " + st.length + " 字元）");
      /* 守的是**順序**：掃輸家（刪 stakes + changed）必須排在付贏家（settle）之前。
       * 兩者順序反了就回到「同一 task 內連贏帶輸一起抹掉」——畫面看起來還是有動，但那兩拍不見了。 */
      var iSweep = st.indexOf("delete stakes["), iChanged = st.indexOf("changed()"), iPay = st.indexOf("settle(snap");
      t.ok(iSweep >= 0 && iChanged > iSweep, "第一拍必須刪掉輸家的 stakes 並呼叫 changed()（各 view 的 renderStakes 才畫得掉）");
      t.ok(iPay > iChanged, "付贏家必須排在掃輸家之後（實測 sweep@" + iSweep + " / changed@" + iChanged + " / pay@" + iPay + "）");
      t.ok(/settle\(snap, returns\)/.test(st), "派彩必須委派同一個 settle()（金流與中央掛鉤只准一個出口）");
      t.ok(/detail/.test(st) && /win:\s*m\s*>\s*0/.test(eng), "必須回傳逐注區 detail（多注稽核／未來逐項飛字）");
      t.ok(/fastMode\(\)\s*\?\s*0/.test(st), "極速模式必須把兩拍歸零（跳過演出但順序不變）");
      // 家族 E 的其餘三條
      var ctl = body(eng, "controls");
      t.ok(/clearBtn:\s*clearBtn/.test(ctl) && /undoBtn:\s*undoBtn/.test(ctl) && /rebetBtn:\s*rebetBtn/.test(ctl),
        "controls() 必須回傳清除/復原/重押三顆鈕（只回 dealBtn 時它們結構上無法被 disable）");
      t.ok(/ctlBtns\.forEach/.test(body(eng, "syncCtl")), "lock() 必須同步這三顆鈕的 disabled");
      t.ok(/lockNoticed/.test(body(eng, "place")), "停止下注期間點注區不得靜默吞掉（同一函式在餘額不足時是有 toast 的）");
      t.ok(/lastActions\s*=\s*actions\.slice\(\)/.test(body(eng, "commit")) && /lastActions\.forEach/.test(body(eng, "rebet")),
        "重押必須逐顆籌碼重放（聚合成一筆時「復原」會清掉整個注區）");
      // 6 支 view 都要改走 settleStaged，且不得殘留舊的一次性 settle
      var VIEWS = ["table-baccarat.js", "table-roulette.js", "table-dragon-tiger.js", "table-sicbo.js", "table-andar-bahar.js", "table-moneywheel.js"];
      var missing = [], legacy = [];
      VIEWS.forEach(function (f) {
        var c = strip(rd("views/" + f));
        if (!/area\.settleStaged\(/.test(c)) missing.push(f);
        if (/area\.settle\(/.test(c)) legacy.push(f);
      });
      t.equal(missing.length, 0, "以下桌遊未改走分階段結算：" + missing.join("、"));
      t.equal(legacy.length, 0, "以下桌遊仍殘留一次性 area.settle()：" + legacy.join("、"));
    }
  });

  selftest.register({
    id: "games/plinko/rtp-never-above-declared", group: "games", env: "node", tier: "fast",
    title: "#103：9 種 rows×risk 的解析 RTP 一律 ≤ 宣告的 99%（中央槽吸收殘差時不得把值墊高）",
    run: function (t) {
      var P = (function () { try { return require(path.join(__dirname, "..", "src", "views", "instant-games.js")).plinko; } catch (e) { return null; } })();
      if (!P) { t.skip("模組未載入（instant-games.js）"); return; }
      var EDGE = 0.99, worst = 0, best = 1, over = [];
      [8, 12, 16].forEach(function (n) {
        ["low", "medium", "high"].forEach(function (rk) {
          var tb = P.buildTable(n, rk), rtp = 0;
          for (var k = 0; k <= n; k++) rtp += (P.comb(n, k) / Math.pow(2, n)) * tb[k];
          if (rtp > EDGE + 1e-12) over.push(n + "/" + rk + "=" + (rtp * 100).toFixed(4) + "%");
          worst = Math.max(worst, rtp); best = Math.min(best, rtp);
        });
      });
      /* 這條鎖守的是**房家安全側**：Plinko 的 RTP 是參數化的（每種 rows×risk 一個值，見 BACKLOG #103），
       * 所以不鎖「等於某個單值」，而鎖「沒有任何一種設定超過宣告值」。
       * 舊版 `Math.max(0.01, floor(want,2))` 在 16排/高風險（唯一撞下限的設定）把中央槽墊高 ⇒ 99.1014%。 */
      t.equal(over.length, 0, "不得有任何設定的 RTP 超過宣告的 99%：" + over.join("、"));
      t.ok(best > 0.98, "也不得低到離宣告值太遠（實測最低 " + (best * 100).toFixed(4) + "%）");
      t.ok(worst <= EDGE, "最高實測 " + (worst * 100).toFixed(4) + "% 應 ≤ 99%");
      // 形狀鎖：不准回到用 Math.max 墊高中央槽的寫法（那是本缺陷的成因，且外觀完全正常）
      var code = strip(rd("views/instant-games.js"));
      t.ok(!/Math\.max\(0\.01,\s*Math\.floor\(\(EDGE - others\)/.test(code),
        "不得用 Math.max(0.01, …) 墊高中央槽：吸不下時它會讓殘差反向溢出（RTP > 宣告值）");
      t.ok(/want\s*>=\s*0\.01\s*\?/.test(code), "殘差吸收必須先試兩位小數、吸不下才降級（其餘 8 種設定的賠付表才不會被動到）");
      t.ok(/total\(\)\s*>\s*EDGE/.test(code), "必須保留收尾保險：排數集合擴充時仍要能把不變量拉回來");
    }
  });

  selftest.register({
    id: "games/plinko/concurrent-drops", group: "games", env: "node", tier: "fast",
    title: "G7：Plinko 是 fire-and-forget（可連續投多顆球），且併發只准由宣告者取得、其餘遊戲零回歸",
    run: function (t) {
      var eng = strip(rd("core/instant.js"));
      // ① 併發必須是 opt-in：預設 false，否則 12 款單注遊戲會一起變成可連點開多局
      t.ok(/var\s+concurrent\s*=\s*!!opts\.concurrent;/.test(eng), "併發必須由 opts.concurrent 明確宣告（預設關閉）");
      t.ok(/CONCURRENT_MAX\s*=\s*\d+/.test(eng), "必須有併發上限常數（避免無上限堆球）");
      // ② 上限要真的被兩條路徑各自遵守（少一條就會從那條路無限堆積）
      var sync = body(eng, "syncLock");
      t.ok(/inFlight\s*>=\s*CONCURRENT_MAX/.test(sync), "到上限時必須把投注鈕鎖起來");
      t.ok(/if\s*\(inFlight\s*<\s*CONCURRENT_MAX\)/.test(body(eng, "startAuto")), "自動下注在併發模式也必須先問上限");
      // ③ 併發不得繞過逐注的錢包/責任博弈閘（每一注都要各自 check，不是每輪一次）
      t.ok((eng.match(/HL\.rg\.check\(/g) || []).length >= 2, "手動與自動兩條路徑都必須各自呼叫 HL.rg.check（逐注檢查）");
      t.ok(/inFlight\+\+/.test(body(eng, "launch")) && /inFlight--/.test(body(eng, "launch")),
        "併發計數只准由 launch() 獨佔維護（散在別處就會漏減、鈕永遠鎖住或永遠不鎖）");
      // ④ 只有 Plinko 宣告它（宣告點多了要有人來改這條鎖，等於強迫下一個人想清楚）
      var views = ["instant-games.js", "instant-cases.js", "instant-crash-mines.js", "instant-hilo.js",
        "instant-keno.js", "instant-picks.js", "instant-pump.js", "instant-towers.js", "instant-duel.js",
        "slot-pirots.js", "slot-dead-by-noon.js", "slot-gem-storm.js", "slot-golden-toad.js"];
      var declared = views.filter(function (f) { return /concurrent:\s*true/.test(strip(rd("views/" + f))); });
      t.equal(declared.length, 1, "只准一支 view 宣告 concurrent:true（實測 " + declared.join("、") + "）");
      t.ok(declared[0] === "instant-games.js", "宣告者應為 instant-games.js（Plinko 所在）");
      // ⑤ 併發的前提：每顆球有自己的元素（否則多球在 DOM 層仍不可能）——與 plinko 那條鎖互為前後件
      t.ok(/class:\s*"ax-plinko__ball"/.test(body(strip(rd("views/instant-games.js")), "bounce")),
        "併發的前提是每次投球 new 一顆球（見 games/plinko/drop-start-committed）");
    }
  });

  selftest.register({
    id: "games/cashout-btn-not-lying", group: "games", env: "node", tier: "fast",
    title: "towers/hilo/pump：兌現鈕不得在開局就亮成可按（此刻按下去 100% 被拒並吐 warn）",
    run: function (t) {
      [["views/instant-towers.js", "cur"], ["views/instant-hilo.js", "streak"], ["views/instant-pump.js", "cur"]].forEach(function (pair) {
        var c = strip(rd(pair[0])), st = body(c, "start");
        t.ok(st.length > 100, "應取得 " + pair[0] + " 的 start() 函式體");
        t.ok(/cashBtn\.disabled\s*=\s*true/.test(st), pair[0] + " 的 start() 必須讓兌現鈕保持 disabled（還沒有東西可兌現）");
        t.ok(!/cashBtn\.disabled\s*=\s*false/.test(st), pair[0] + " 的 start() 不得把兌現鈕打開");
        // 而且要真的有一條路會打開它（否則就變成永遠不能兌現＝反向的錯）
        t.ok((c.match(/cashBtn\.disabled\s*=\s*false/g) || []).length >= 1,
          pair[0] + " 必須在推進成功後某處把兌現鈕打開（不能鎖死）");
        t.ok(new RegExp(pair[1] + "\\s*===?\\s*0").test(c), pair[0] + " 應仍保有「零進度不得兌現」的守衛（雙保險）");
      });
    }
  });

  // ── #39 Dice Duel：平手重擲不得被吞（resolve 的 ties/tiePairs 必須有畫面對應）──────────────
  //   舊病根＝resolve() 回傳的 ties 從未被讀、畫面無平手路徑，資訊列卻宣告「平手重擲」、公平面板又列出畫面上從未出現的 nonce（約 1% 局）。
  //   功能鎖：把 HL.duel.resolve 載進 node、以決定性 nextFloat 逼出「先平手再分勝負」⇒ tiePairs 必須逐擲收齊且長度 === ties，每對必為平手。
  //   結構鎖：render 必須真的消費 res.tiePairs（推進歷史帶）並以 res.ties 標「平手重擲 ×N」。
  selftest.register({
    id: "games/dice-duel/ties-surfaced", group: "games", env: "node", tier: "fast",
    title: "Dice Duel：平手重擲必須有畫面/歷史對應（resolve 收齊 tiePairs 且 render 消費 ties，不得吞掉）",
    run: function (t) {
      var D = load("instant-duel.js");
      if (!D || !D.duel || typeof D.duel.resolve !== "function") { t.skip("模組未載入（instant-duel.js·HL.duel）"); return; }
      // 逼出兩次平手後才分勝負：[50,50]平 → [70,70]平 → [10,90]決勝（rollOf=floor(f*100)）
      var seq = [0.50, 0.50, 0.70, 0.70, 0.10, 0.90], i = 0;
      var r = D.duel.resolve(function () { return seq[i++]; });
      t.ok(Array.isArray(r.tiePairs), "resolve 必須回傳 tiePairs 陣列（讓每次平手的那一擲都有畫面對應）");
      t.equal(r.tiePairs.length, r.ties, "tiePairs 長度必須 === ties（實測 " + (r.tiePairs || []).length + " vs " + r.ties + "）");
      t.equal(r.ties, 2, "本決定性序列應恰有 2 次平手重擲");
      t.ok(r.tiePairs.every(function (p) { return p.you === p.oth; }), "tiePairs 每一對必須是真正的平手（you===oth）");
      t.ok(r.you === 10 && r.oth === 90 && r.win === false, "決勝擲點/勝負必須不受平手收集影響（you=10 oth=90 敗）");
      // 反向錨：無平手序列時 tiePairs 必須為空（證明它只收平手、不是無腦收集）
      var seq2 = [0.10, 0.90], j = 0, r2 = D.duel.resolve(function () { return seq2[j++]; });
      t.ok(r2.ties === 0 && r2.tiePairs.length === 0, "無平手時 ties=0 且 tiePairs 為空");
      // 結構鎖：render 必須消費 tiePairs（推歷史帶）並以 ties 標「平手重擲 ×N」
      var src = strip(rd("views/instant-duel.js"));
      t.ok(/res\.tiePairs\.forEach\([\s\S]{0,80}histEl\.push\(/.test(src),
        "render 必須把 res.tiePairs 逐對推進歷史帶（否則公平面板的 nonce 仍無畫面對應＝#39 未修）");
      t.ok(/res\.ties\s*>\s*0/.test(src) && src.indexOf("平手重擲 ×") >= 0,
        "狀態列必須在 res.ties>0 時據實標『平手重擲 ×N』（資訊列的承諾要有對應演出）");
    }
  });

  // ── #55 Dice Duel：分階段揭曉 + #29 dice-duel 半 pre-reveal-payout-leak ─────────────────────
  //   舊病根＝單一 800ms setTimeout 同一 tick 揭雙方點數＋掛勝負＋寫結論（無 1v1 對決懸念），
  //     且派彩在演出**之前**就 setBal 入帳 ⇒ 頁首錢包在骰子揭曉前先跳出贏額＝可見餘額洩漏結果（#29）。
  //   功能鎖：載 HL.duel 揭曉節拍純函式（驗的即玩的），驗「你<對手<比點」嚴格遞增（sequential，非同 tick）、
  //     各拍間隔 ≥ 可讀地板、總時長 ≤ 理智上界。
  //   結構鎖：三拍各走純函式 youAtMs/oppAtMs/verdictAtMs（非裸毫秒）＋三個 data-beat；派彩延後——settlePending
  //     為單一入帳點、於比點拍呼叫、且註冊到 onExit（離場補結）；反向錨：演出前不得直接 setBal(bal()+payout)。
  selftest.register({
    id: "games/dice-duel/staged-reveal", group: "games", env: "node", tier: "fast",
    title: "Dice Duel：分階段揭曉（你<對手<比點嚴格遞增）＋派彩延後到揭曉後入帳（不 pre-reveal 洩漏）",
    run: function (t) {
      var D = load("instant-duel.js");
      if (!D || !D.duel || typeof D.duel.youAtMs !== "function") { t.skip("模組未載入（instant-duel.js·HL.duel 揭曉節拍）"); return; }
      var Q = D.duel, you = Q.youAtMs(), opp = Q.oppAtMs(), ver = Q.verdictAtMs();
      // 功能鎖：三拍嚴格遞增 + 可讀地板 + 理智上界
      t.ok(you < opp, "youAtMs 必須嚴格早於 oppAtMs（sequential 揭曉，非同一 tick）：" + you + " < " + opp);
      t.ok(opp < ver, "verdictAtMs 必須嚴格晚於 oppAtMs（兩點揭定後才判勝負/入帳）：" + opp + " < " + ver);
      t.ok((opp - you) >= 200 && (ver - opp) >= 200, "每一拍間隔須 ≥ 200ms 可讀地板（實測 " + (opp - you) + "/" + (ver - opp) + "）");
      t.ok(ver <= 3000, "verdictAtMs 須 ≤ 3000ms 理智上界（實測 " + ver + "）");
      // 結構鎖
      var src = strip(rd("views/instant-duel.js"));
      t.ok(src.indexOf("Duel.youAtMs()") >= 0 && src.indexOf("Duel.oppAtMs()") >= 0 && src.indexOf("Duel.verdictAtMs()") >= 0,
        "三拍延遲必須走純函式 Duel.youAtMs()/oppAtMs()/verdictAtMs()（非裸毫秒）");
      t.ok(src.indexOf("}, 800);") < 0, "舊的單一 800ms 一次結算不得殘留（否則退回同 tick 揭曉）");
      t.ok((src.match(/data-beat/g) || []).length >= 3, "揭曉須分三拍（reveal-you/reveal-opp/verdict 各寫一個 data-beat）");
      // 派彩延後入帳：settlePending 為單一入帳點、於比點拍呼叫、且註冊到 onExit
      t.ok(/function settlePending\(/.test(src), "必須有單一入帳助手 settlePending（派彩的唯一 setBal 入帳點）");
      t.ok(/settlePending[\s\S]{0,200}setBal\(bal\(\) \+ p\.payout\)/.test(src), "settlePending 內必須 setBal(bal()+p.payout) 入帳");
      t.ok(/data-beat", "verdict"[\s\S]{0,400}settlePending\(\)/.test(src), "比點拍（verdict）必須呼叫 settlePending＝派彩在兩點揭定之後才入帳");
      t.ok(/onExit\([\s\S]{0,120}settlePending\(\)/.test(src), "必須把 settlePending 註冊到 HL.shell.onExit（離場補結，不吞分）");
      // #29 反向錨：派彩不得在演出前直接入帳（舊 commit-then-animate 的 setBal(bal()+payout) 必須已移除）
      t.ok(src.indexOf("setBal(bal() + payout)") < 0, "派彩不得在演出前直接入帳（舊 setBal(bal()+payout) 於 commit＝pre-reveal 洩漏，必須已移除）");
    }
  });

  // ── #45 買入型免費遊戲：結果必須寫回 betPanel「上一局」計分板（不得停在上一筆普通旋轉）──────────
  //   舊病根＝買入路徑自算派彩、繞過 settle()，而 lastEl 唯一寫入點在 finish() 內且未在 api ⇒ 兩個計分面板互相矛盾。
  //   結構鎖：① instant.js 把 lastEl 的寫入抽成單一 writeLast 並經 api.setLast 對外開放（單一寫入點）；② 兩款買入路徑都呼叫 panel.setLast(cost,payout,…)。
  selftest.register({
    id: "games/buyin-updates-scoreboard", group: "games", env: "node", tier: "fast",
    title: "買入免費遊戲：結果必須經 betPanel.setLast 寫回「上一局」計分板（Pirots／Dead By Noon）",
    run: function (t) {
      var inst = strip(rd("core/instant.js"));
      t.ok(/function writeLast\(/.test(inst), "instant.js 必須有單一 writeLast 助手（lastEl 的唯一寫入點）");
      t.equal((inst.match(/lastEl\.textContent\s*=/g) || []).length, 1, "lastEl.textContent 只能有一個寫入點（在 writeLast 內），否則買入結果與普通旋轉會各寫一份＝再度分岔");
      t.ok(/setLast:\s*function\s*\([^)]*\)\s*\{[\s\S]{0,120}writeLast\(/.test(inst), "api 必須開放 setLast 且路由到 writeLast（買入型入口才寫得回同一個計分板）");
      // 兩款買入路徑都要在自算派彩後呼叫 panel.setLast(cost, payout, …)
      [["views/slot-pirots.js", "Pirots"], ["views/slot-dead-by-noon.js", "Dead By Noon"]].forEach(function (pair) {
        var c = strip(rd(pair[0]));
        t.ok(/panel\.setLast\(\s*cost\s*,\s*payout/.test(c),
          pair[1] + " 買入路徑必須呼叫 panel.setLast(cost, payout, …) 把買入結果寫回計分板（否則面板停在上一筆普通旋轉＝#45）");
      });
    }
  });

  // ── #46 Pump 爆裂：inline scale 可脹到 ~1.99，而 is-pop keyframe 收在 scale(1) 且無 fill-mode ──────
  //   舊病根＝爆裂後動畫退回 inline 的膨脹尺寸停住＝先縮小、0.4s 後彈回「爆裂前體積」（非單調、結束態說謊）。
  //   結構鎖：爆裂分支(bomb[cur])在掛 is-pop 之前必須先把 inline transform 歸零到 scale(1)，讓 keyframe 與收尾態一致。
  //   反向錨：refreshHUD 仍以會 >1 的公式寫 inline scale（證明這個歸零是真的有必要、不是死碼）。
  selftest.register({
    id: "games/pump/burst-scale-reset", group: "games", env: "node", tier: "fast",
    title: "Pump 爆裂：掛 is-pop 前必須把 inline transform 歸零到 scale(1)（否則動畫退回膨脹尺寸停住）",
    run: function (t) {
      var c = strip(rd("views/instant-pump.js"));
      t.ok(/balloonEl\.style\.transform\s*=\s*"scale\(1\)";\s*balloonEl\.textContent\s*=\s*"💥";\s*balloonEl\.classList\.add\("is-pop"\)/.test(c),
        "爆裂分支必須先 balloonEl.style.transform='scale(1)' 再掛 is-pop（錨死同一序列，杜絕退回 inline 膨脹尺寸）");
      t.ok(/balloonEl\.style\.transform\s*=\s*"scale\(" \+ scale/.test(c),
        "反向錨：refreshHUD 仍以動態 scale 寫 inline transform（值可 >1 ⇒ 爆裂前的歸零確有必要）");
    }
  });

  // ── #52 picks 結算只換掉剛下注的那一場，不得整批洗掉玩家在看的另外兩場（家族 state-churn）──
  //   病根：settle() 尾端 `slate = makeSlate()` 每下一單就重生全部 3 場 fixture ⇒ 玩家正盯著看的
  //     另外兩場盤口/隊名憑空消失換成全新對戰（真實運彩＝只有下注的那場結束後由新賽事遞補、其餘留在板上）。
  //   正解：`slate[sel.fi] = makeFixture()`（逐場替換），且必須排在清 sel 之前（否則 sel.fi 已成 null）。
  //   ⚠️ view 函式封在 IIFE、node 取不到 ⇒ 源碼結構鎖；反向錨確保 makeSlate/makeFixture 仍被使用（沒被刪成死碼）。
  selftest.register({
    id: "games/picks/settle-replaces-only-bet-fixture", group: "games", env: "node", tier: "fast",
    title: "picks：結算只遞補剛下注的那一場 fixture，不得整批重生洗掉玩家在看的另外兩場",
    run: function (t) {
      var src = strip(rd("views/instant-picks.js"));
      // #67 拆兩拍後：遞補剛下注那一場的邏輯搬進 reveal()（揭曉拍），settle() 只做扣注＋開賽中懸念。
      //   不變量不變（只換 fi 那場、不整批重生、在清 sel 之前擷取索引），只是換到 reveal 檢。
      var sb = body(src, "settle");
      var rb = body(src, "reveal");
      t.ok(sb.length > 0 && rb.length > 0, "應取得 settle()／reveal() 兩函式體（實測 settle " + sb.length + " ／ reveal " + rb.length + " 字元）");
      // ① 病根寫法（整批重生）不得殘留在 settle 或 reveal 任一拍
      t.ok(!/slate\s*=\s*makeSlate\s*\(/.test(sb) && !/slate\s*=\s*makeSlate\s*\(/.test(rb),
        "settle／reveal 皆不得 `slate = makeSlate()` 整批重生（會洗掉玩家在看的另外兩場＝#52 病根）");
      // ② reveal 必須逐場替換剛結算的那一場（用 pending 擷取的 fi＝p.fi）
      var iRepl = rb.indexOf("slate[p.fi] = makeFixture()");
      t.ok(iRepl >= 0,
        "reveal 必須 `slate[p.fi] = makeFixture()` 只遞補下注的那一場（其餘場次留在板上）");
      // ③ 替換必須排在清 sel 之前（維持原不變量：索引須在清空前擷取；p.fi 由 pending 快照保有）
      var iNull = rb.indexOf("sel = null");
      t.ok(iRepl >= 0 && iNull >= 0 && iRepl < iNull,
        "`slate[p.fi] = makeFixture()` 必須排在 `sel = null` 之前（實測 repl@" + iRepl + " / null@" + iNull + "）");
      // ④ 反向錨：makeFixture 是逐場遞補的真實來源，且 makeSlate 仍用於開局初始化（沒被刪成死碼）
      t.ok(/function\s+makeFixture\s*\(/.test(src) && /function\s+makeSlate\s*\(/.test(src),
        "makeFixture/makeSlate 兩函式須都存在（前者逐場遞補、後者開局建 3 場）");
      t.ok(/var\s+slate\s*=\s*makeSlate\s*\(/.test(src),
        "反向錨：picksGame 開局仍以 makeSlate() 建初始 3 場（逐場替換不取代開局建板）");
    }
  });

  // ── #67 picks：整局零階段 → 拆兩拍（kickoff 扣注＋開賽中懸念｜reveal 揭曉分級結果＋派彩入帳）──
  //   舊病根：settle() 從扣注→抽結果→派彩→顯示→重生賽程全在**同一同步 task**、零「開賽中」揭曉相位
  //     ⇒ 玩家一按下單，勝負與派彩同一 frame 就定案顯示，運彩最核心的「開賽後見真章」張力不存在。
  //   正解：純節拍 HL.picks.revealAtMs()（結構懸念拍，極速模式才歸零）；settle 只扣注＋設 data-beat kickoff
  //     ＋setTimeout(reveal, …)；派彩延後到 reveal 拍才 setBal(bal()+payout)＝開賽中頁首錢包不得先洩漏勝負
  //     （同 #29 keno/dice-duel「餘額先洩漏結果」家族）；延後入帳配 onExit 補結（中途離場也據實了結一次）。
  //   為什麼含源碼鎖：view 封在 IIFE、DOM/計時器 node 測不到 ⇒ 節拍走純函式（node 驗）＋寫法錨。
  //   反向擾動：把 creditPending/setBal(bal()+…) 搬回 settle 同 frame／移除 setTimeout(reveal)／刪 kickoff 或 reveal 的 data-beat／
  //     刪 onExit／把 revealAtMs 改 0 —— 各由對應斷言轉紅。
  selftest.register({
    id: "games/picks/staged-reveal-money-after-kickoff", group: "games", env: "node", tier: "fast",
    title: "picks：拆兩拍（kickoff 扣注＋開賽中懸念｜reveal 才揭曉並派彩入帳）＋延後入帳配 onExit 補結＝修 game-feel #67 flat-single-tick-round",
    run: function (t) {
      var M = load("instant-picks.js");
      if (!M || !M.picks || typeof M.picks.revealAtMs !== "function") { t.skip("模組未載入（instant-picks.js·HL.picks 揭曉節拍）"); return; }
      var rev = M.picks.revealAtMs();
      // 功能鎖：懸念拍為正、有可讀結構地板、理智上界
      t.ok(rev >= 600, "revealAtMs 須 ≥ 600ms 結構懸念地板（開賽中→揭曉；實測 " + rev + "）");
      t.ok(rev <= 4000, "revealAtMs 須 ≤ 4000ms 理智上界（實測 " + rev + "）");
      var src = strip(rd("views/instant-picks.js"));
      var sb = body(src, "settle"), rb = body(src, "reveal"), cb = body(src, "creditPending");
      t.ok(sb.length > 0 && rb.length > 0 && cb.length > 0, "應取得 settle／reveal／creditPending 三函式體");
      // ① 兩拍各寫一個 data-beat（headless 驗拍序；rAF/transition 驗不到，data-beat 驗得到）
      t.ok(sb.indexOf('"kickoff"') >= 0, "settle 必須設 data-beat kickoff（開賽中懸念拍）");
      t.ok(rb.indexOf('"reveal"') >= 0, "reveal 必須設 data-beat reveal（揭曉拍）");
      // ② settle 以純節拍 setTimeout(reveal,…) 排揭曉（走 Picks.revealAtMs、非同一 tick、非裸毫秒）
      t.ok(/setTimeout\(\s*reveal\s*,/.test(sb), "settle 必須 setTimeout(reveal, …) 延後揭曉（非同一同步 task）");
      t.ok(sb.indexOf("Picks.revealAtMs()") >= 0, "settle 揭曉延遲必須走純函式 Picks.revealAtMs()（非裸毫秒·防 §10.2 繞過）");
      t.ok(/fastMode\(\)\s*\?\s*0\s*:/.test(sb), "settle 須讓極速模式把懸念拍歸零（fastMode()?0:…）");
      // ③ 錢晚於 kickoff：settle 只扣注、不得在 kickoff 拍派彩入帳；派彩只在 creditPending 動
      t.ok(sb.indexOf("setBal(bal() - bet)") >= 0, "settle 必須有扣注 setBal(bal() - bet)");
      t.ok(!/setBal\(\s*bal\(\)\s*\+/.test(sb),
        "settle（kickoff 拍）不得 setBal(bal()+…) 派彩入帳＝開賽中頁首錢包會先洩漏勝負（#29 家族復發）");
      t.ok(/setBal\(\s*bal\(\)\s*\+\s*p\.payout\s*\)/.test(cb),
        "派彩入帳必須在 creditPending 內（setBal(bal()+p.payout)）＝晚於 kickoff、由 reveal／onExit 觸發");
      t.ok(rb.indexOf("creditPending()") >= 0, "reveal 必須呼叫 creditPending()（揭曉拍才動錢）");
      // ④ 延後入帳配 onExit 補結：換頁時取消計時器＋據實了結一次（家族 B／vsslot escrow 教訓）
      t.ok(/HL\.shell\s*&&\s*HL\.shell\.onExit/.test(src), "必須註冊 HL.shell.onExit（延後入帳須配離場補結）");
      var ob = src.slice(src.indexOf("HL.shell.onExit"));
      t.ok(ob.indexOf("clearTimeout(revealTimer)") >= 0 && ob.indexOf("creditPending()") >= 0,
        "onExit 必須 clearTimeout(revealTimer) 並 creditPending()（中途離場：取消揭曉＋據實了結一次）");
      // ⑤ 反向錨：creditPending 冪等（結一次就清 pending），且 settle 建立 pending 快照
      t.ok(/pending\s*=\s*null/.test(cb), "creditPending 必須把 pending 清 null（冪等：只結一次）");
      t.ok(/pending\s*=\s*\{/.test(sb), "settle 必須建立 pending 快照（bet/payout/fi …）供 reveal 與 onExit 據實了結");
    }
  });

  // ── #27 Hilo：翻牌揭曉必須分階段（翻牌落定→分級揭曉勝負），且揭曉期間鎖住控件（連點不得砍掉整張牌的揭曉）──
  //   舊病根：guess() 只守 `if(!active)`，翻牌／勝負色／連對／狀態／歷史全在同一同步 frame 寫完
  //     ⇒ ① 揭曉純裝飾（0.35s flip 期間結果早已定案並顯示）② 連點 hi/lo 可在動畫途中再抽一張牌、疊局。
  //   正解：純節拍 HL.hilo.flipMs()/revealMs() 兩拍嚴格遞增；guess 進場設 busy=true+lockGuess()，
  //     outcome（pushHist 上色／mult 累乘／狀態）延後到 revealMs 後的 revealOutcome，該拍守 isConnected。
  //   為什麼含源碼鎖：view 封在 IIFE、且 DOM/計時器行為 node 測不到（gameFeelLocks 慣例）⇒ 節拍走純函式（node 驗）＋寫法錨。
  //   反向擾動：移除 `|| busy` 閘／把 mult 累乘搬回 guess 同 frame／改寫裸 setTimeout 毫秒／刪 isConnected 守／把兩拍改同值 —— 各由對應斷言轉紅。
  selftest.register({
    id: "games/hilo/staged-reveal-commit-lock", group: "games", env: "node", tier: "fast",
    title: "Hilo：翻牌分兩拍揭曉（flip<reveal 嚴格遞增）＋揭曉期間 commit-lock（busy 閘＋控件停用＋離場 isConnected 守）",
    run: function (t) {
      var M = load("instant-hilo.js");
      if (!M || !M.hilo || typeof M.hilo.revealMs !== "function") { t.skip("模組未載入（instant-hilo.js·HL.hilo 揭曉節拍）"); return; }
      var H = M.hilo, flip = H.flipMs(), rev = H.revealMs();
      // 功能鎖：兩拍嚴格遞增 + 可讀懸念地板 + 理智上界
      t.ok(flip > 0, "flipMs 須為正（實測 " + flip + "）");
      t.ok(flip < rev, "flipMs 必須嚴格早於 revealMs（翻牌落定後才分級揭曉，非同一 frame）：" + flip + " < " + rev);
      t.ok((rev - flip) >= 200, "翻牌→揭曉懸念間隔須 ≥ 200ms 可讀地板（實測 " + (rev - flip) + "）");
      t.ok(rev <= 3000, "revealMs 須 ≤ 3000ms 理智上界（實測 " + rev + "）");
      // 結構鎖：view 委派純函式、不寫裸毫秒
      var src = strip(rd("views/instant-hilo.js"));
      t.ok(/setTimeout\([^,]*revealOutcome[\s\S]{0,40}Hilo\.revealMs\(\)\)/.test(src),
        "揭曉必須以 setTimeout(...revealOutcome..., Hilo.revealMs()) 延後（走純函式節拍、非裸毫秒）");
      t.ok((src.match(/data-beat/g) || []).length >= 2, "揭曉須分兩拍（flip／reveal 各寫一個 data-beat）");
      // commit-lock：busy 閘擋再入 + 進場鎖控件
      var gb = body(src, "guess");
      t.ok(gb.length > 0, "應取得 guess() 函式體（實測 " + gb.length + " 字元）");
      t.ok(/if \(!active \|\| busy\) return/.test(gb),
        "guess 進場必須守 `if (!active || busy) return`（揭曉中連點無效＝#27）");
      t.ok(/busy = true;\s*lockGuess\(\)/.test(gb),
        "guess 抽牌後必須 busy=true 且 lockGuess()（翻牌拍即鎖住控件）");
      // outcome 延後：勝負分級（mult 累乘）不得留在 guess 同 frame，必須搬進 revealOutcome
      t.ok(gb.indexOf("mult *= EDGE / p") < 0,
        "guess 本體不得再有 `mult *= EDGE / p`（分級揭曉已搬到 revealOutcome＝翻牌落定後才發生）");
      var rb = body(src, "revealOutcome");
      t.ok(rb.length > 0 && rb.indexOf("mult *= EDGE / p") >= 0 && /pushHist\(next, good\)/.test(rb),
        "revealOutcome 必須含 `mult *= EDGE / p` 與 pushHist(next, good)（勝負色/連對在揭曉拍才寫）");
      // 離場安全：revealOutcome 首行守 isConnected（換頁後這一拍不得對 detached DOM/帳務動手）
      t.ok(/function revealOutcome\([^)]*\)\s*\{\s*if \(!cardEl\.isConnected\) return/.test(src),
        "revealOutcome 必須以 `if (!cardEl.isConnected) return` 開頭（離場後不續跑揭曉拍＝家族 B 現成形制）");
      // 反向錨：cashOut 也擋 busy（揭曉中不得兌現）；paintCard 仍在 guess 內（翻牌動畫沒被刪成死碼）
      t.ok(/if \(!active \|\| busy\) return/.test(body(src, "cashOut")),
        "cashOut 必須守 `if (!active || busy) return`（揭曉中不得兌現）");
      t.ok(/paintCard\(next\)/.test(gb),
        "反向錨：guess 仍呼叫 paintCard(next)（翻牌拍照樣翻牌，只是勝負分級延後）");
    }
  });

  // ── #25 家族 J：中獎盤必須保留至下一局（golden-toad + gem-storm）─────────────────
  //   根因：結算路徑呼叫 renderResting() 用固定種子的無獎待機盤把中獎盤抹掉，而派彩(betPanel/buyBtn 的
  //   done.then finish)在下一個 microtask 才入帳 ⇒ 玩家永遠看不到自己中的那盤、餘額卻已在待機盤上跳動。
  //   修法＝結算不重繪：結果盤留在畫面，下一注 playRound 開頭的 base 渲染才覆蓋它。
  //   為什麼是源碼鎖：node 無 DOM/layout、跑不出整段 async 結算演出；能守的是「playRound 結算路徑不得再有 board-wipe」。
  selftest.register({
    id: "games/slot-holdwin/result-persists-until-next-spin", group: "games", env: "node", tier: "fast",
    title: "golden-toad+gem-storm：結算路徑不得 renderResting() 抹掉中獎盤（中獎盤保留至下一局）＝修 game-feel #25 家族 J",
    run: function (t) {
      ["slot-golden-toad.js", "slot-gem-storm.js"].forEach(function (f) {
        var src = strip(rd("views/" + f));
        var pr = body(src, "playRound");
        t.ok(pr.length > 200, f + "：應取得 playRound() 函式體（實測 " + pr.length + " 字元）");
        // ① 結算路徑不得 board-wipe：renderResting 只准在 mount/idle 呼叫，不得出現在 playRound 內
        t.ok(pr.indexOf("renderResting(") < 0,
          f + "：playRound 內不得呼叫 renderResting()（那會在派彩入帳前把中獎盤換成固定待機盤＝#25 復發）");
        // ② 正向錨：結算收尾仍在（非整段刪掉），且以 data-result 標記最終盤（win/lose）＝結果盤保留而非重繪
        t.ok(/board\.dataset\.result\s*=\s*totalMult\s*>=\s*1\s*\?/.test(pr),
          f + "：結算收尾必須寫 board.dataset.result=totalMult>=1?...（結果盤保留＋標記最終態，非重繪待機盤）");
        // ③ 反向錨：renderResting 仍為活函式且在 mount 被呼叫（沒被改成死碼＝進場第一眼仍有待機盤、非空白）
        t.ok(src.indexOf("function renderResting(") >= 0 && src.indexOf("renderResting();") >= 0,
          f + "：renderResting() 仍須定義且在 mount 被呼叫（進場第一眼要有待機盤，非死碼/空白）");
      });
    }
  });

  // ── #24 家族 wrong-genre：Hold & Win 重旋期間非鎖定格必須「滾動」而非永久空白（golden-toad）──────
  //   根因：renderGrid 的非鎖定分支在 grid===null（Hold&Win bstart/respin 影格）時 txt="" ⇒ 沒落金幣的
  //   重旋逐格與前一影格相同（實測 51.9% 空、24.1% 空接空完全靜止）＝該類型唯一的張力被做成靜態。
  //   修法＝該分支改抽非金幣裝飾符 spinChar()（純視覺·非公平關鍵，不消耗 HL.fair 種子）。
  //   為什麼是源碼鎖：node 無 DOM/rAF，跑不出重旋演出影格；能守的是「非鎖定空格分支不得再回退成空字串、
  //   裝飾符池排除金幣、且用視覺 RNG 而非 HL.fair」。反向擾動：把 spinChar() 改回 ""／把 COIN 併入 SPIN_SYMS／
  //   把 Math.random 換成 HL.fair.floatOr 任一，對應斷言即轉紅。
  selftest.register({
    id: "games/slot-golden-toad/holdwin-respin-not-blank", group: "games", env: "node", tier: "fast",
    title: "golden-toad：Hold & Win 重旋非鎖定格必須滾動裝飾符（非空白）＝修 game-feel #24 家族 wrong-genre",
    run: function (t) {
      var raw = rd("views/slot-golden-toad.js");
      var src = strip(raw);
      var rg = body(src, "renderGrid");
      t.ok(rg.length > 200, "應取得 renderGrid() 函式體（實測 " + rg.length + " 字元）");
      // ① 正向錨：非鎖定格分支必須呼叫 spinChar()（Hold&Win 重旋空格要滾動，不得留空白）
      t.ok(rg.indexOf("spinChar()") >= 0,
        "renderGrid 非鎖定分支必須呼叫 spinChar()（Hold&Win 重旋空格要滾動、不得留空白）");
      // ② 反向錨：舊的空字串回退 (grid ? symChar(s) : "") 必須消失＝空重旋不得再輸出永久空白
      t.ok(!/grid\s*\?\s*symChar\(s\)\s*:\s*""/.test(rg),
        "renderGrid 不得再有 (grid ? symChar(s) : \"\") 空字串回退（那正是 #24：非鎖定格永久空白）");
      // ③ spinChar 定義存在且抽自「非金幣」符號池（COIN=7 不得列入，否則假裝有金幣落定）
      var sc = body(src, "spinChar");
      t.ok(sc.length > 0 && sc.indexOf("SPIN_SYMS") >= 0, "spinChar() 必須定義且抽自 SPIN_SYMS 池");
      t.ok(/SPIN_SYMS\s*=\s*\[\s*0\s*,\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*,\s*6\s*\]/.test(src),
        "SPIN_SYMS 必須為非金幣符號池 [0..6]（COIN=7 排除：非鎖定格顯示金幣會誤導成落定）");
      // ④ 純視覺·非公平關鍵：spinChar 必須用 Math.random，不得消耗 HL.fair（否則亂改結果/破壞可重算）
      t.ok(sc.indexOf("Math.random") >= 0, "spinChar() 必須用 Math.random（視覺裝飾 RNG）");
      t.ok(sc.indexOf("HL.fair") < 0 && sc.indexOf("floatOr") < 0,
        "spinChar() 不得碰 HL.fair/floatOr（裝飾符純視覺，落不落金幣由 runBonus 的種子事先算定）");
    }
  });
})();

/* ===================== 桌遊注區籌碼徽章渲染收斂鎖（T38 · 2026-08-23 維護軌）=====================
 * 6 款 HL.table.betArea 桌遊原本各自逐字複製 6 行 renderStakes；其中 roulette 已 drift（精簡 "Nk" 格式）。
 * 已收斂為單一出口 HL.table.renderStakes(spotEls, area, fmt)，把 drift 化為顯式 fmt 參數（預設 money）。
 * 為什麼是源碼鎖：桌遊是會員閘 view、preview 沙箱過不了登入 gate（§9），render 不可 headless 觀察；
 *   能守住「不再各自 inline」的只有寫法。去註解後比對（同 gameFeelLocks 的量測紀律）。
 * 反向擾動：任一 view 把 badge render 重新 inline（出現 .badge.textContent）⇒ inlined 斷言紅；
 *   刪掉 core 出口的掛載 ⇒ 出口斷言紅；把 fmt(v) 改回寫死 money(v) ⇒ fmt 斷言紅。
 * ============================================================================================ */
(function tableRenderStakesLock() {
  var fs = require("fs");
  var SRC = path.join(__dirname, "..", "src");
  function rd(rel) { try { return fs.readFileSync(path.join(SRC, rel), "utf8"); } catch (e) { return ""; } }
  function strip(x) { return x.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]*\/\/[^\n]*/g, ""); }
  var VIEWS = ["table-andar-bahar.js", "table-baccarat.js", "table-dragon-tiger.js", "table-sicbo.js", "table-moneywheel.js", "table-roulette.js"];

  selftest.register({
    id: "games/table/render-stakes-single-source", group: "games", env: "node", tier: "fast",
    title: "桌遊注區籌碼徽章渲染單一出口：6 款皆呼叫 HL.table.renderStakes、無一自行 inline（守 T38 收斂不回退）",
    run: function (t) {
      var core = strip(rd("core/table.js"));
      // 不空心：核心檔要真的讀到
      t.ok(core.length > 400, "應讀到 core/table.js（實測 " + core.length + " 字元）");
      // 出口存在（單一真相）
      t.ok(/function\s+renderStakes\s*\(\s*spotEls\s*,\s*area\s*,\s*fmt\s*\)/.test(core),
        "core/table.js 必須定義 renderStakes(spotEls, area, fmt)");
      t.ok(/HL\.table\s*=\s*\{[^}]*renderStakes\s*:\s*renderStakes/.test(core),
        "renderStakes 必須掛上 HL.table 匯出（否則 6 款 view 呼叫不到）");
      t.ok(/spotEls\[id\]\.badge\.textContent\s*=\s*v\s*\?\s*fmt\(v\)/.test(core),
        "共用出口內必須用傳入的 fmt 格式化（roulette 的 drift 已收為顯式參數，不得再寫死 money(v)）");

      // 六款 view：呼叫共用出口、且不得再 inline badge render
      var called = 0, bad = [];
      VIEWS.forEach(function (f) {
        var code = strip(rd("views/" + f));
        t.ok(code.length > 0, "應讀到 views/" + f);
        if (/HL\.table\.renderStakes\(\s*spotEls\s*,\s*area/.test(code)) called++;
        else bad.push(f + "（未呼叫共用出口）");
        if (/badge\.textContent/.test(code)) bad.push(f + "（重新 inline 了 badge render）");
      });
      t.equal(called, VIEWS.length, "全 " + VIEWS.length + " 款桌遊都要呼叫 HL.table.renderStakes（實測 " + called + "）");
      t.equal(bad.length, 0, "不得有 view 未收斂或重新 inline：" + (bad.join("、") || "（無）"));
    }
  });
})();

// ── 玩家面 view 整節點 toast 的 EN 覆蓋（維護軌 2026-08-29 escape① i18n 覆蓋審計）──────
//   止血對象：`HL.ui.toast("中文")` 這種**整節點**字面（walker 於 i18n.js:91 `k=raw.trim()`
//   後查 en 字典）反覆在新遊戲落地時漏補 EN ⇒ 英文玩家看到中文 toast。此鎖把「掃描器」變「網」：
//   任何玩家面 view 新增一條無 EN 鍵的整節點 toast、或有人移除既有 EN 鍵，皆當場轉紅。
//   排除 ops-dashboard.js＝內部 ⚙ 營運工具、非玩家 i18n 範圍（據實界定，不假裝全站）。
//   ⚠️ 只認「toast 字面緊接 , 或 )」＝非 P3「中文＋變數」串接（那種 walker 結構上翻不到、非本鎖範圍）。
(function () {
  var fs = require("fs"), path = require("path");
  var SRC = path.join(__dirname, "..", "src");
  var VIEW_DIR = path.join(SRC, "views");
  var EXCLUDE = { "ops-dashboard.js": 1 };
  var CJK = /[一-鿿]/;
  var en = "";
  try { en = fs.readFileSync(path.join(SRC, "i18n", "en.js"), "utf8"); } catch (e) {}
  function enHas(key) {
    var esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp('(["\'])' + esc + '\\1\\s*:').test(en);
  }
  function toastKeys(code) {
    var out = [], re = /\btoast\(\s*(["'])((?:[^"'\\]|\\.)*)\1\s*(?:,|\))/g, m;
    while ((m = re.exec(code))) { if (CJK.test(m[2])) out.push(m[2].trim()); }
    return out;
  }
  selftest.register({
    id: "games/i18n/game-view-toast-en-coverage", group: "games", env: "node", tier: "fast",
    title: "玩家面 view 的整節點 toast 皆有 EN 鍵（止「toast 落地無 EN→英文玩家見中文」的血；排除內部 ops-dashboard）",
    run: function (t) {
      // 反向錨①：字典真的讀到（空字串會讓每條缺鍵假紅、enHas 全 false）
      t.ok(en.length > 5000, "應讀到 i18n/en.js（實測 " + en.length + " 字元）");
      // 反向錨②：掃描器兩個方向都對（尺自身）——已知鍵判存在、亂鍵判不存在
      t.ok(enHas("餘額不足"), "掃描器壞：已知 EN 鍵『餘額不足』應判存在");
      t.ok(!enHas("＿＿保證不存在的鍵＿＿zzz"), "掃描器壞：亂鍵不應判存在");
      var files = fs.readdirSync(VIEW_DIR).filter(function (f) { return /\.js$/.test(f) && !EXCLUDE[f]; });
      t.ok(files.length >= 20, "應掃到 ≥20 個 view 檔（實測 " + files.length + "）");
      var missing = [], scanned = 0;
      files.forEach(function (f) {
        toastKeys(fs.readFileSync(path.join(VIEW_DIR, f), "utf8")).forEach(function (k) {
          scanned++; if (!enHas(k)) missing.push(f + " → \"" + k + "\"");
        });
      });
      // 反向錨③：確有在掃（0 條掃描也會 0 缺漏＝假綠）
      t.ok(scanned >= 15, "應掃到 ≥15 條整節點 toast（實測 " + scanned + "）");
      t.equal(missing.length, 0, "以下玩家面 toast 缺 EN 鍵（英文玩家會看到中文）：" + (missing.join("；") || "（無）"));
    }
  });
})();

module.exports = selftest;

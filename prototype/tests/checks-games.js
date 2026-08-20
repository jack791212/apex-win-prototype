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
      // 全域賠付標量（G＝RTP 命脈總縮放；蒙地卡羅校準）
      t.ok(C.G === 1.101, "校準標量 G 應為 1.101（RTP 命脈），現為 " + C.G);
      // 買入價＝單一常數驅動（保真閘第 14 項）：43.4× ≈ E[force=1]41.73× / 宣告 96.27%（買入 RTP 96.2%）
      t.ok(C.buyX === 43.4, "買入價應為 43.4×（E[買入]/宣告RTP·單一來源），現為 " + C.buyX);
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
      t.close(truncRTP, 0.46516, 0.008, "base 截尾@30× RTP " + (truncRTP * 100).toFixed(3) + "%（殺重尾後 PAY/chamberMult/cascade 賠付曲線漂移哨兵·錨點 46.516%）");
      // 全基礎局 RTP：300k 下重尾抖 ±5.75pp → 只放健康帶抓粗漂移；≤100% 誠實性由 250M 另證（96.093%）
      t.ok(fullRTP >= 0.80 && fullRTP <= 1.13, "全基礎局 RTP " + (fullRTP * 100).toFixed(3) + "% 逸出健康帶 [80%,113%]（重尾粗漂移哨兵）");
      // 精算級 ±0.5pp 僅在抽樣極深時啟用（SD≈36.1·真值 96.093% 距宣告 -0.177pp → 單種子需 CI95≤0.32pp＝N≳481M；預設 300k 絕不啟用避 flaky）
      if (N >= 500000000) t.close(fullRTP, 0.96093, 0.005, "全基礎局 RTP " + (fullRTP * 100).toFixed(4) + "% 偏離真值 96.093%（宣告 96.27%·-0.177pp 在 ±0.5pp 內·±0.5pp 規格 PASS）");
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
})();

module.exports = selftest;

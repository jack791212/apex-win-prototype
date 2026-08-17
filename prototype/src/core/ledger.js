/*
 * Apex Win｜營運帳本（Operator Ledger）＝全站「莊家視角」記帳核心
 * ---------------------------------------------------------------------------
 * 目的：平台原本只有「玩家本場盈虧」(live-stats)，全站沒有任何莊家帳本，量不到自己的 GGR。
 * 本檔在各金流點記一筆事件，彙總出營運監控儀表板要的：
 *   turnover(總流水) / payout(總派彩) / GGR / RTP / 送幣成本 / NGR / 淨現金流 / 流通幣 / 活躍玩家。
 * 存量設計：不存原始逐筆事件（autobet turbo 會爆量），只存「固定大小的累積量 + 分遊戲/來源 +
 *   封頂的淨部位走勢」，故 localStorage 物件恆為數 KB。寫回 debounce 400ms，關頁保底 flush。
 * 命名空間：經 HL.dom.lsGet/lsSet → 受 HL.site.ns() 前綴 → 真站(r:)與假站帳本完全隔離。
 * 多人：本版單機彙總（players 幾乎恆為自己）；資料模型預留日後同步 Supabase 做多人彙總。
 *
 * 【2026-07-31 #56：站內移轉不是現金流】休閒模式「玩家間轉贈遊戲幣」原本被記成 `withdraw`
 *   ⇒ 玩家互贈被計為**營運提款**，直接汙染 `cashNet`／NGR 判讀（提款＝錢離開平台，
 *   轉贈＝錢在平台內換手，兩者對莊家帳的意義相反），且儀表板「🟠 淨現金流為負」健檢會誤報。
 *   現以 `p2p_out`／`p2p_in` 一對對稱型別記帳，**明確排除於淨現金流之外**（見 `CASH_IN`/`CASH_OUT`/
 *   `INTERNAL` 三張分類表＝唯一真相，`deriveFrom` 依表求值而非散落的加減式）。
 *   同時**退役死型別 `trade`**（自建檔起零寫入者、零讀取者，語意與本對重疊）。
 *   ⚠️ 誠實限制：Demo 無真實對手方，故 `p2p_in` 目前恆為 0（沒有收款方入帳）＝轉出的幣在帳上
 *   仍是淨銷毀，`p2pNet<0` 即此缺口的量化呈現。收款方入帳需玩家帳戶系統（後端），本卡不含。
 *
 * 雙環境契約（比照 #50 edge 與 #51 betlog）：分類表與彙總純函式以 `module.exports` 暴露，
 *   `prototype/tests/run.js` 驗的即瀏覽器跑的同一份。
 * 註冊於 window.HL.ledger。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純資料/純函式區（node 可 require · 無 DOM／localStorage 相依）=====================
  // player_in：deposit(儲值) · player_out：withdraw(提款) · bet/win：下注/派彩 · bonus：送幣(各來源) ·
  // faucet：救濟金 · shop：點數商城(保留) · p2p_out/p2p_in：站內玩家間移轉 · jp_seed/jp_hit：JP 提撥/命中
  // bonus_void：#71 紅利逾期作廢＝**成本回沖**。紅利成本在授予當下（badd）就記進 bonus 了，
  //   逾期作廢代表那筆成本從未真的發生 ⇒ 不是新的一筆送幣，而是把 promo 扣回來（見 deriveFrom）。
  //   刻意**不改動 totals.bonus**：毛額（發出去多少）與淨額（真的被拿走多少）都要看得到。
  var TYPES = ["deposit", "withdraw", "bet", "win", "bonus", "shop", "p2p_out", "p2p_in", "jp_seed", "jp_hit", "faucet", "bonus_void"];
  // 現金流分類表＝唯一真相。**只有真正跨越平台邊界的錢**進 cashNet；站內移轉一律列 INTERNAL。
  var CASH_IN = ["deposit"];            // 錢進入平台
  var CASH_OUT = ["withdraw"];          // 錢離開平台
  var INTERNAL = ["p2p_out", "p2p_in"]; // 站內換手：不進 cashNet、不進 GGR、不算送幣成本
  var SERIES_CAP = 240;

  function freshTotals() {
    var t = {}, c = {};
    for (var i = 0; i < TYPES.length; i++) { t[TYPES[i]] = 0; c[TYPES[i]] = 0; }
    return { totals: t, counts: c };
  }
  function sumOf(t, keys) {
    var n = 0;
    for (var i = 0; i < keys.length; i++) n += (+t[keys[i]] || 0);
    return n;
  }
  // 純彙總：由 totals/counts（+ 瀏覽器才算得出的 coins/players/時戳）算出儀表板要的全部指標。
  function deriveFrom(t, counts, extra) {
    t = t || {}; counts = counts || {}; extra = extra || {};
    var ggr = (+t.bet || 0) - (+t.win || 0);
    // #71：送幣成本＝毛送幣 − 逾期作廢回沖。夾 0 是因為「回沖不得大於發出去的量」——
    //   舊存檔被清空（bonus 歸零）而 void 事件仍進來時，負的 promo 會讓 NGR 憑空變好看。
    var voided = Math.min(Math.max(0, +t.bonus_void || 0), (+t.bonus || 0) + (+t.faucet || 0));
    var promo = (+t.bonus || 0) + (+t.faucet || 0) - voided;
    var cashIn = sumOf(t, CASH_IN), cashOut = sumOf(t, CASH_OUT);
    return {
      turnover: +t.bet || 0, payout: +t.win || 0, ggr: ggr, rtp: (+t.bet || 0) > 0 ? (+t.win || 0) / (+t.bet || 0) : 0,
      bonus: +t.bonus || 0, faucet: +t.faucet || 0, bonusVoid: voided, promo: promo, ngr: ggr - promo,
      deposit: cashIn, withdraw: cashOut, cashNet: cashIn - cashOut, shop: +t.shop || 0,
      // 站內移轉（不列入 cashNet；p2pNet<0 ＝ Demo 無收款方而淨銷毀的量）
      p2pOut: +t.p2p_out || 0, p2pIn: +t.p2p_in || 0, p2pNet: (+t.p2p_in || 0) - (+t.p2p_out || 0),
      jpSeed: +t.jp_seed || 0, jpHit: +t.jp_hit || 0, jpNet: (+t.jp_seed || 0) - (+t.jp_hit || 0),
      coins: extra.coins || 0, players: extra.players || 0,
      betCount: counts.bet || 0, winCount: counts.win || 0,
      firstTs: extra.firstTs || 0, lastTs: extra.lastTs || 0
    };
  }

  var CORE = { TYPES: TYPES, CASH_IN: CASH_IN, CASH_OUT: CASH_OUT, INTERNAL: INTERNAL, freshTotals: freshTotals, deriveFrom: deriveFrom, sumOf: sumOf };

  // ===================== 測項（雙環境同一份定義）=====================
  function registerTests(st) {
    if (!st || !st.register) return;
    st.register({
      id: "ledger/p2p-not-cashflow", group: "ledger", title: "站內轉贈不得汙染淨現金流（#56 迴歸鎖）",
      run: function (t) {
        var f = freshTotals(), x = f.totals;
        x.deposit = 10000; x.withdraw = 2000; x.p2p_out = 5000;
        var d = deriveFrom(x, f.counts, {});
        t.equal(d.cashNet, 8000, "cashNet 只該是 儲值−提款＝8000（轉贈 5000 不得計入）");
        t.equal(d.withdraw, 2000, "轉贈不得被加進提款");
        t.equal(d.p2pOut, 5000, "轉贈應記在 p2pOut");
        t.equal(d.p2pNet, -5000, "Demo 無收款方 ⇒ p2pNet 為負＝淨銷毀量");
        t.equal(d.ngr, deriveFrom((function () { var g = freshTotals().totals; g.deposit = 10000; g.withdraw = 2000; return g; })(), f.counts, {}).ngr,
          "轉贈不得改動 NGR（非送幣成本、非 GGR）");
      }
    });
    st.register({
      id: "ledger/cash-tables", group: "ledger", title: "現金流分類表覆蓋且互斥（INTERNAL 不在現金流內）",
      run: function (t) {
        var all = CASH_IN.concat(CASH_OUT).concat(INTERNAL), seen = {};
        for (var i = 0; i < all.length; i++) {
          t.ok(TYPES.indexOf(all[i]) >= 0, all[i] + " 應是合法交易型別");
          t.ok(!seen[all[i]], all[i] + " 不得同時屬於多張分類表");
          seen[all[i]] = true;
        }
        t.equal(TYPES.indexOf("trade"), -1, "死型別 trade 應已退役");
        for (var j = 0; j < INTERNAL.length; j++) {
          t.equal(CASH_IN.indexOf(INTERNAL[j]), -1, INTERNAL[j] + " 不得列為現金流入");
          t.equal(CASH_OUT.indexOf(INTERNAL[j]), -1, INTERNAL[j] + " 不得列為現金流出");
        }
      }
    });
    st.register({
      id: "ledger/derived-shape", group: "ledger", title: "derived() 對外形狀含 p2p 三欄且無退役 trade", env: "browser",
      run: function (t) {
        t.isFn(HL && HL.ledger && HL.ledger.derived, "HL.ledger.derived 應存在");
        var d = HL.ledger.derived();   // 唯讀，不寫入任何狀態
        t.ok("p2pOut" in d && "p2pIn" in d && "p2pNet" in d, "應輸出 p2pOut/p2pIn/p2pNet 供儀表板呈現");
        t.ok(!("trade" in d), "退役型別 trade 不應再出現於 derived() 輸出");
        t.equal(d.cashNet, d.deposit - d.withdraw, "cashNet 恆等於 儲值−提款");
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 以下為瀏覽器區 =====================
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;
  var KEY = "HL_LEDGER";

  function fresh() {
    var f = freshTotals();
    return { v: 1, totals: f.totals, counts: f.counts, byGame: {}, bySource: {}, players: {}, series: [], firstTs: 0, lastTs: 0 };
  }
  function ensureShape(d) {
    d.totals = d.totals || {}; d.counts = d.counts || {};
    for (var i = 0; i < TYPES.length; i++) { if (d.totals[TYPES[i]] == null) d.totals[TYPES[i]] = 0; if (d.counts[TYPES[i]] == null) d.counts[TYPES[i]] = 0; }
    d.byGame = d.byGame || {}; d.bySource = d.bySource || {}; d.players = d.players || {}; d.series = d.series || [];
  }
  var data = null;
  function load() { if (!data) { data = ls(KEY, null) || fresh(); ensureShape(data); } return data; }

  var dirty = false, timer = null;
  function persist() { dirty = true; if (timer) return; timer = setTimeout(function () { timer = null; if (dirty) { dirty = false; save(KEY, data); } }, 400); }
  function flush() { if (timer) { clearTimeout(timer); timer = null; } if (dirty) { dirty = false; save(KEY, data); } }

  function self() { try { return (HL.auth && HL.auth.user && HL.auth.user()) ? HL.auth.user().id : "self"; } catch (e) { return "self"; } }

  // 記一筆事件。type ∈ TYPES；amount 正數；meta {game, source, player}
  function record(type, amount, meta) {
    if (TYPES.indexOf(type) < 0) return;
    amount = Math.round(+amount || 0); if (amount <= 0) return;
    var d = load(); meta = meta || {};
    d.totals[type] += amount; d.counts[type] += 1;
    var ts = Date.now(); if (!d.firstTs) d.firstTs = ts; d.lastTs = ts;
    if ((type === "bet" || type === "win") && meta.game) {
      var g = d.byGame[meta.game] || (d.byGame[meta.game] = { bet: 0, win: 0, plays: 0 });
      if (type === "bet") { g.bet += amount; g.plays += 1; } else g.win += amount;
    }
    if (type === "bonus") { var s = meta.source || "其他紅利"; d.bySource[s] = (d.bySource[s] || 0) + amount; }
    else if (type === "faucet") { d.bySource["救濟金 Faucet"] = (d.bySource["救濟金 Faucet"] || 0) + amount; }
    var p = meta.player || (type === "bet" ? self() : null); if (p) d.players[p] = true;
    // 淨部位走勢＝NGR＝GGR−送幣（含 faucet）
    var net = (d.totals.bet - d.totals.win) - (d.totals.bonus + d.totals.faucet);
    d.series.push([ts, net]); if (d.series.length > SERIES_CAP) d.series = d.series.slice(-SERIES_CAP);
    persist();
    mirror(type, amount, meta);
  }

  // Phase 6：後端+會員+真站 → 把「送幣」鏡射到伺服器供全站彙總。
  //   只鏡射低頻的 bonus/faucet（送幣成本訊號）；bet/win/儲值/提款已由伺服器 RPC 權威記＝不鏡射避免雙重計；
  //   jp_seed 為每注高頻＝不鏡射（JP 為各機客端構造、真站已自籌 ~中性）。fire-and-forget，錯誤不影響本地記帳。
  function mirror(type, amount, meta) {
    if (type !== "bonus" && type !== "faucet") return;
    try {
      if (HL.api && HL.api.opsLog && HL.site && HL.site.isLive() &&
          HL.auth && HL.auth.backend && HL.auth.backend() && HL.auth.user && HL.auth.user()) {
        HL.api.opsLog(type, amount, meta || {});
      }
    } catch (e) {}
  }

  // 流通幣（莊家對玩家的負債）＝玩家可玩餘額 + 獎金錢包(可領+待解鎖)
  function coinsOutstanding() {
    var bal = (HL.state && HL.state.get) ? (HL.state.get().balance || 0) : 0;
    var bonus = 0;
    if (HL.bonus) { try { bonus = (HL.bonus.balance() || 0) + (HL.bonus.locked ? (HL.bonus.locked() || 0) : 0); } catch (e) {} }
    return Math.round(bal + bonus);
  }
  function playerCount() { var d = load(), n = 0; for (var k in d.players) if (d.players.hasOwnProperty(k)) n++; return n; }

  function derived() {
    var d = load();
    // 彙總邏輯只有一份（純函式，node 測項驗的即此處跑的）；瀏覽器只補算不可攜的三項。
    return deriveFrom(d.totals, d.counts, { coins: coinsOutstanding(), players: playerCount(), firstTs: d.firstTs, lastTs: d.lastTs });
  }
  function byGame() {
    var d = load(), a = [];
    for (var g in d.byGame) { if (!d.byGame.hasOwnProperty(g)) continue; var x = d.byGame[g]; a.push({ game: g, bet: x.bet, win: x.win, plays: x.plays, ggr: x.bet - x.win, rtp: x.bet > 0 ? x.win / x.bet : 0 }); }
    a.sort(function (p, q) { return q.bet - p.bet; }); return a;
  }
  function bySource() {
    var d = load(), a = [];
    for (var s in d.bySource) { if (!d.bySource.hasOwnProperty(s)) continue; a.push({ source: s, amount: d.bySource[s] }); }
    a.sort(function (p, q) { return q.amount - p.amount; }); return a;
  }
  function series() { return load().series.slice(); }
  function totals() { return load().totals; }
  function reset() { data = fresh(); flush(); }

  // 頁面關閉/切背景保底寫回（避免 debounce 視窗內遺失）
  try {
    global.addEventListener("pagehide", flush);
    if (global.document) global.document.addEventListener("visibilitychange", function () { if (global.document.visibilityState === "hidden") flush(); });
  } catch (e) {}

  HL.ledger = {
    record: record, derived: derived, byGame: byGame, bySource: bySource, series: series,
    totals: totals, coinsOutstanding: coinsOutstanding, playerCount: playerCount, self: self, reset: reset, flush: flush,
    TYPES: TYPES, CASH_IN: CASH_IN, CASH_OUT: CASH_OUT, INTERNAL: INTERNAL, deriveFrom: deriveFrom
  };

  // ⚠️ 本檔在 index.html 的載入序（core/ledger.js）**早於** core/selftest.js，故此刻 HL.selftest 多半還不存在
  //    （betlog/edge 載於 selftest 之後才能直接註冊）。不調整載入序（其他模組依賴本檔早期就緒），
  //    改為延後到 DOMContentLoaded——那時所有同步 script 皆已執行完畢。
  if (HL.selftest) registerTests(HL.selftest);
  else if (global.addEventListener) global.addEventListener("DOMContentLoaded", function () { registerTests(HL.selftest); });
})(typeof window !== "undefined" ? window : globalThis);

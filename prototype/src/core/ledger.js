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
 * 註冊於 window.HL.ledger。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;
  var KEY = "HL_LEDGER";
  // player_in：deposit(儲值) · player_out：withdraw(提款) · bet/win：下注/派彩 ·
  // bonus：送幣(各來源) · faucet：救濟金 · shop/trade：商城/交易 · jp_seed/jp_hit：JP 真實提撥/命中
  var TYPES = ["deposit", "withdraw", "bet", "win", "bonus", "shop", "trade", "jp_seed", "jp_hit", "faucet"];
  var SERIES_CAP = 240;

  function fresh() {
    var t = {}, c = {};
    for (var i = 0; i < TYPES.length; i++) { t[TYPES[i]] = 0; c[TYPES[i]] = 0; }
    return { v: 1, totals: t, counts: c, byGame: {}, bySource: {}, players: {}, series: [], firstTs: 0, lastTs: 0 };
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
    var d = load(), t = d.totals;
    var ggr = t.bet - t.win, promo = t.bonus + t.faucet, ngr = ggr - promo;
    return {
      turnover: t.bet, payout: t.win, ggr: ggr, rtp: t.bet > 0 ? t.win / t.bet : 0,
      bonus: t.bonus, faucet: t.faucet, promo: promo, ngr: ngr,
      deposit: t.deposit, withdraw: t.withdraw, cashNet: t.deposit - t.withdraw, shop: t.shop, trade: t.trade,
      jpSeed: t.jp_seed, jpHit: t.jp_hit, jpNet: t.jp_seed - t.jp_hit,
      coins: coinsOutstanding(), players: playerCount(),
      betCount: d.counts.bet, winCount: d.counts.win, firstTs: d.firstTs, lastTs: d.lastTs
    };
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
    totals: totals, coinsOutstanding: coinsOutstanding, playerCount: playerCount, self: self, reset: reset, flush: flush
  };
})(window);

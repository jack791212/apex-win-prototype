/*
 * Apex Win｜資料服務層（App ↔ Supabase 的唯一邊界）
 * view 永遠不直接碰 Supabase，只透過 HL.api。
 * 後端未啟用時所有方法安全回傳預設值 / no-op。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  function on() { return HL.auth && HL.auth.backend() && HL.auth.user(); }
  function defaultStats() { return { matches: 0, wins: 0, losses: 0, profit: 0, streak: 0, best: 0, bigWin: 0, hostNet: 0 }; }

  // 載入玩家檔（trigger 已在註冊時建檔；保險起見查不到就回預設）
  function loadProfile() {
    if (!on()) return Promise.resolve(null);
    var u = HL.auth.user();
    return HL.sb.from("profiles").select("*").eq("id", u.id).single().then(function (res) {
      if (res.error || !res.data) {
        return { balance: HL.config.INITIAL_BALANCE, currency: "TWD", wallet: {}, arena_stats: defaultStats() };
      }
      return res.data;
    });
  }

  // 寫回玩家切片（由 persistence.js debounce 呼叫）
  function saveProfile(patch) {
    if (!on()) return Promise.resolve();
    var u = HL.auth.user();
    patch.updated_at = new Date().toISOString();
    return HL.sb.from("profiles").update(patch).eq("id", u.id).then(function (res) {
      if (res.error && global.console) console.warn("[Apex Win] saveProfile 失敗：", res.error.message);
    });
  }

  // 載入最近 N 場戰績（hydrate 進 arenaStats.history，供回放）
  function loadHistory(n) {
    if (!on()) return Promise.resolve([]);
    var u = HL.auth.user();
    return HL.sb.from("battle_history").select("payload").eq("user_id", u.id)
      .order("ts", { ascending: false }).limit(n || 30)
      .then(function (res) { return (res.data || []).map(function (r) { return r.payload; }); });
  }

  // 一場結束插一列（arena.js statRecord 內呼叫；事件型寫入）
  function recordBattle(rec) {
    if (!on()) return Promise.resolve();
    var u = HL.auth.user();
    return HL.sb.from("battle_history").insert({
      user_id: u.id, vs: rec.vs, mode: rec.mode, wager: rec.wager, net: rec.net, win: rec.win, payload: rec
    }).then(function (res) {
      if (res.error && global.console) console.warn("[Apex Win] recordBattle 失敗：", res.error.message);
    });
  }

  // Phase 4：伺服器決定 Slots Battle 的分數/勝負/結算（防作弊）。回傳 null 代表 Demo 模式或失敗 → 前端自行結算
  function playBattle(payload) {
    if (!on()) return Promise.resolve(null);
    return HL.sb.rpc("play_battle", {
      p_wager: payload.wager, p_players: payload.players, p_mode: payload.mode,
      p_rounds: payload.rounds, p_roster: payload.roster || [], p_game: payload.game || "Slots Battle"
    }).then(function (res) {
      if (res.error) { if (global.console) console.warn("[Apex Win] play_battle 失敗，改用前端結算：", res.error.message); return null; }
      if (res.data && res.data.error) { if (global.console) console.warn("[Apex Win] play_battle:", res.data.error); return null; }
      return res.data;
    }).catch(function (e) { if (global.console) console.warn("[Apex Win] play_battle 例外：", e); return null; });
  }

  // Phase 4b：slot / 賞金局 伺服器結算（回 null = Demo/失敗 → 前端降級）
  function rpc(name, args) {
    if (!on()) return Promise.resolve(null);
    return HL.sb.rpc(name, args).then(function (res) {
      if (res.error) { if (global.console) console.warn("[Apex Win] " + name + " 失敗，改前端：", res.error.message); return null; }
      if (res.data && res.data.error) { if (global.console) console.warn("[Apex Win] " + name + ":", res.data.error); return null; }
      return res.data;
    }).catch(function (e) { if (global.console) console.warn("[Apex Win] " + name + " 例外：", e); return null; });
  }
  function playSlotSpin(bet) { return rpc("slot_spin", { p_bet: bet }); }
  function playSlotBuy(kind, bet) { return rpc("slot_buy", { p_kind: kind, p_bet: bet }); }
  function playBountyFlip(cost, vol, flips) { return rpc("bounty_flip", { p_cost: cost, p_vol: vol, p_flips: flips }); }
  function playBountyMine(bet, maxMult, vol) { return rpc("bounty_mine", { p_bet: bet, p_maxmult: maxMult, p_vol: vol }); }

  // Phase 5：錢包儲值/提款（伺服器記帳）＋ 真資料 feeds ＋ 小雞過馬路（伺服器逐步開獎）
  function walletTxn(amount, kind) { return rpc("wallet_txn", { p_amount: amount, p_kind: kind }); }
  function walletHistory(n) {
    if (!on()) return Promise.resolve([]);
    var u = HL.auth.user();
    return HL.sb.from("wallet_txns").select("kind,amount,created_at").eq("user_id", u.id)
      .order("created_at", { ascending: false }).limit(n || 20)
      .then(function (res) { return res.data || []; });
  }
  function feedWins(n) { return rpc("feed_recent_wins", { p_limit: n || 30 }); }
  function feedLeaderboard(n) { return rpc("feed_leaderboard", { p_limit: n || 8 }); }
  // 小雞是「有狀態的回合制」：錯誤不可一律折成 null。
  //   null              → RPC 未部署（前端降級練習模式）
  //   { error: "..." }  → 驗證/網路/回合錯誤（前端提示或重新同步，不降級）
  function rpcChicken(name, args) {
    if (!on()) return Promise.resolve(null);
    return HL.sb.rpc(name, args).then(function (res) {
      if (res.error) {
        var m = res.error.message || "";
        if (res.error.code === "PGRST202" || /could not find the function|does not exist/i.test(m)) return null;
        return { error: m || "network" };
      }
      return res.data; // 可能含 {error:'insufficient balance'/'no active round'}
    }).catch(function () { return { error: "network" }; });
  }
  function chickenStart(bet, diff) { return rpcChicken("chicken_start", { p_bet: bet, p_diff: diff }); }
  function chickenStep() { return rpcChicken("chicken_step", {}); }
  function chickenCashout() { return rpcChicken("chicken_cashout", {}); }

  HL.api = {
    loadProfile: loadProfile, saveProfile: saveProfile, loadHistory: loadHistory, recordBattle: recordBattle,
    playBattle: playBattle, playSlotSpin: playSlotSpin, playSlotBuy: playSlotBuy, playBountyFlip: playBountyFlip, playBountyMine: playBountyMine,
    walletTxn: walletTxn, walletHistory: walletHistory, feedWins: feedWins, feedLeaderboard: feedLeaderboard,
    chickenStart: chickenStart, chickenStep: chickenStep, chickenCashout: chickenCashout
  };
})(window);

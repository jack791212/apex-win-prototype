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

  HL.api = { loadProfile: loadProfile, saveProfile: saveProfile, loadHistory: loadHistory, recordBattle: recordBattle, playBattle: playBattle };
})(window);

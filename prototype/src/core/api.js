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

  // 載入玩家檔：身份(display_name/avatar/currency/wallet)讀 profiles；經濟(balance/wagered/arena_stats)
  // 依當前站別讀 member_econ（Phase 7 的 load_econ，rpc 自動帶 p_site）。未部署 phase7 時 load_econ 回 null → 退回 profiles 欄位（相容）。
  function loadProfile() {
    if (!on()) return Promise.resolve(null);
    var u = HL.auth.user();
    return Promise.all([
      HL.sb.from("profiles").select("*").eq("id", u.id).single(),
      rpc("load_econ") // rpc 注入 p_site；回 {balance,wagered,arena_stats} 或 null(未部署)
    ]).then(function (r) {
      var res = r[0], econ = r[1] || {};
      var base = (res.error || !res.data) ? { display_name: null, avatar: "👑", currency: "TWD", wallet: {}, balance: HL.config.INITIAL_BALANCE, arena_stats: defaultStats(), wagered: 0 } : res.data;
      return Object.assign({}, base, {
        balance: econ.balance != null ? +econ.balance : (base.balance != null ? base.balance : HL.config.INITIAL_BALANCE),
        wagered: econ.wagered != null ? +econ.wagered : (base.wagered || 0),
        arena_stats: econ.arena_stats || base.arena_stats || defaultStats()
      });
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

  /* ── 戰績列正規化（競技場規格 §5 #1/#2）───────────────────────────────────
   * `battle_history` 裡有**兩種形狀**混在一起：
   *   · 客端寫的（`recordBattle` → `payload: rec`）本來就是前端形狀；
   *   · 伺服器 `play_battle` 寫的只有 `{seats:[{idx,total,rounds}], winnerIdx, roster, game, players, mode}`。
   * 而前端讀的是 `net/win/vs/myTotal/totals/rounds/seats[].name|av|me/winnerName`
   * ⇒ 會員模式 F5 之後每一列變「敗 · −NT$ NaN · 你 NT$ 0」、對手名空白、
   *   回放 10 輪縮成 1 輪、條長全 0%（crazy 因 barFrac 反向歸一全 100%）、自己那條被畫成 opp。
   * 表上現成的 `vs/wager/net/win/ts` 四五個欄位其實都有值，只是 `select("payload")` 把它們丟掉了。
   *
   * ⚠️ **表上的 `mode` 欄是「站別」（SQL 寫的是 `v_site`），不是對戰模式**——對戰模式在
   *   `payload.mode`（`v_gmode`）。拿錯會讓 `HL.battleMode` 用 "demo" 去查排名語意，
   *   回放的名次、勝負條件與長條方向會整個反過來，而畫面看起來完全正常。
   * ⚠️ **rounds 要轉置**：伺服器存的是「逐席位的每輪陣列」，前端讀的是「逐輪的每席位陣列」。
   * ⚠️ 座位 0 ＝ 自己（`makeRec` 的 `myTotal: totals[0]` 與 `seats[0].me` 是同一個約定）。
   * 純函式、不碰 DOM/HL ⇒ node 可直接跑（測項用 fnBody 抽出來驗）。 */
  function normalizeBattle(row) {
    if (!row || typeof row !== "object") return null;
    var p = row.payload || row;
    if (!p || typeof p !== "object") return null;
    var seats = p.seats || [];
    var tsNum = row.ts ? (typeof row.ts === "number" ? row.ts : Date.parse(row.ts) || 0) : 0;
    /* 已經是前端形狀（客端寫入）⇒ 只補表上現成的欄位，一個字都不改它算好的東西 */
    if (seats.length && seats[0] && seats[0].name != null) {
      var out = {};
      for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) out[k] = p[k];
      if (out.net == null) out.net = +(row.net || 0);
      if (out.win == null) out.win = !!row.win;
      if (!out.vs) out.vs = row.vs || "1v1";
      if (out.wager == null) out.wager = +(row.wager || 0);
      if (!out.ts) out.ts = tsNum;
      return out;
    }
    /* 伺服器形狀 ⇒ 補齊成前端形狀 */
    var roster = p.roster || [];
    var n = seats.length || roster.length || 0;
    if (!n) return null;
    var totals = [], perSeat = [], i, r, kk;
    for (i = 0; i < n; i++) {
      var st = seats[i] || {};
      totals.push(+(st.total || 0));
      perSeat.push(st.rounds || []);
    }
    var nR = 0;
    for (i = 0; i < n; i++) if (perSeat[i].length > nR) nR = perSeat[i].length;
    var rounds = [];
    for (r = 0; r < nR; r++) {
      var line = [];
      for (kk = 0; kk < n; kk++) line.push(+((perSeat[kk] || [])[r] || 0));
      rounds.push(line);
    }
    var seatObjs = [];
    for (i = 0; i < n; i++) {
      var m = roster[i] || {};
      seatObjs.push({ name: m.name || ("玩家 " + (i + 1)), av: m.av || "👤", me: i === 0 });
    }
    var wi = (p.winnerIdx == null ? -1 : p.winnerIdx);
    return {
      ts: tsNum || p.ts || 0,
      vs: row.vs || p.vs || "1v1",
      players: p.players || n,
      mode: p.mode || "normal",          // ⚠️ 不是 row.mode（那是站別）
      wager: +(row.wager || 0),
      game: p.game || "",
      seats: seatObjs,
      totals: totals,
      rounds: rounds,
      myTotal: totals.length ? totals[0] : 0,
      win: !!row.win,
      net: +(row.net || 0),
      winnerName: (seatObjs[wi] && seatObjs[wi].name) || "—"
    };
  }
  // 載入最近 N 場戰績（hydrate 進 arenaStats.history，供回放）
  function loadHistory(n) {
    if (!on()) return Promise.resolve([]);
    var u = HL.auth.user();
    /* 把表上現成的欄位一起拿回來——舊版只 select("payload")，於是 vs/wager/net/win/ts 全丟掉，
       而 payload 裡根本沒有它們 ⇒ 每一列的金額都是 undefined ⇒ 畫面上就是 −NT$ NaN。 */
    return HL.sb.from("battle_history").select("payload, vs, wager, net, win, ts").eq("user_id", u.id)
      .order("ts", { ascending: false }).limit(n || 30)
      .then(function (res) { return (res.data || []).map(normalizeBattle).filter(Boolean); });
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

  /* Phase 4：伺服器決定 Slots Battle 的分數/勝負/結算（防作弊）。回傳 null＝Demo 或失敗 → 前端自行結算。
   * ⚠️ 2026-09-07：本函式原本是全檔**唯一直接呼 `HL.sb.rpc` 而繞過下方 `rpc()` 包裝**的結算 RPC
   *   ⇒ 沒帶 `p_site`（Phase 7 的站別軸）⇒ 伺服器把它當 `'demo'`：**真站的對戰讀寫假站的經濟列，
   *   而回傳的 balance 又蓋回真站畫面**＝在真站印錢。修法就是走同一個出口（`rpc()` 會自動注入 p_site）。
   *   為什麼一直沒被發現：Demo 模式（唯一常被驗的模式）根本不會走到這條路。 */
  function playBattle(payload) {
    return rpc("play_battle", {
      p_wager: payload.wager, p_players: payload.players, p_mode: payload.mode,
      p_rounds: payload.rounds, p_roster: payload.roster || [], p_game: payload.game || "Slots Battle"
    });
  }

  // Phase 4b：slot / 賞金局 伺服器結算（回 null = Demo/失敗 → 前端降級）
  function rpc(name, args) {
    if (!on()) return Promise.resolve(null);
    // Phase 7：所有 RPC 自動帶站別 p_site = HL.site.mode()（伺服器據此讀寫 member_econ / 標事件 mode）。
    // 所有經此的伺服器函式皆已含 p_site 參數（部分收下不用）；舊伺服器無此參數時 rpc 會落 catch→null 優雅降級。
    args = args || {};
    try { if (HL.site && HL.site.mode && args.p_site == null) args.p_site = HL.site.mode(); } catch (e) {}
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
      // 軟錯誤（res.error）改拋出，讓呼叫端能分辨「載入失敗」與「無紀錄」，避免降級成誤導性空態；
      // 硬錯誤（網路例外）本就會 reject 傳到呼叫端 .catch。成功路徑（res.data||[]）不變。
      .then(function (res) { if (res.error) throw new Error(res.error.message || "wallet history failed"); return res.data || []; });
  }
  function feedWins(n) { return rpc("feed_recent_wins", { p_limit: n || 30 }); }
  function feedLeaderboard(n) { return rpc("feed_leaderboard", { p_limit: n || 8 }); }
  // Phase 6：多人真站雲端營運彙總。opsSummary＝全站彙總(admin 閘，回 {error:'forbidden'} 或 {scope:'site',...})；
  //   opsLog＝客端鏡射「送幣」事件(伺服器只收 bonus/faucet/jp_*)。未連後端 rpc() 自動回 null。
  function opsSummary() { return rpc("ops_summary", {}); }
  function opsLog(type, amount, meta) { meta = meta || {}; return rpc("ops_log", { p_type: type, p_amount: amount, p_source: meta.source || null, p_game: meta.game || null }); }
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
    normalizeBattle: normalizeBattle,   // 對外出口：戰績列的唯一正規化口（測項與未來的其他消費者都走它）
    loadProfile: loadProfile, saveProfile: saveProfile, loadHistory: loadHistory, recordBattle: recordBattle,
    playBattle: playBattle, playSlotSpin: playSlotSpin, playSlotBuy: playSlotBuy, playBountyFlip: playBountyFlip, playBountyMine: playBountyMine,
    walletTxn: walletTxn, walletHistory: walletHistory, feedWins: feedWins, feedLeaderboard: feedLeaderboard,
    opsSummary: opsSummary, opsLog: opsLog,
    chickenStart: chickenStart, chickenStep: chickenStep, chickenCashout: chickenCashout
  };
})(window);

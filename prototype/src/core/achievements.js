/*
 * Apex Win｜成就徽章牆 HL.achievements（資料驅動成就引擎 + 成就點數 XP 底座 · 擴充性優先）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 Stake「達成新目標即獲成就徽章」/ BC.Game「成就+任務→紅利+榜分」（2026 gamification
 * 共識：徽章/XP/里程碑是留存核心，即時發獎才有多巴胺；radar 連 7 輪點名 ApexWin 此缺口）。
 *
 * 核心哲學＝容器先於內容：這裡是一個「成就『註冊表』」。種子目錄先塞一批，任何未來模組 / 同仁
 *   遊戲只要 HL.achievements.register(spec) 即把新成就掛上牆（比照 HL.games.register 自我上架），
 *   不需要動這支引擎。牆本身＝資料驅動的徽章網格，渲染「已註冊了什麼」。
 *
 * 資料流：liveStats.record(game,bet,win) 為全遊戲中央記錄點，其尾端呼叫 HL.achievements.record(...)。
 *   引擎累積「終身統計」（下注數 / 累積押注 / 勝場 / 單筆最大贏分 / 最大倍數 / 玩過幾款），
 *   每次結算後重評所有成就；跨過門檻且未解鎖者 → 即時解鎖：發成就點數（XP 底座，供未來季票消耗）
 *   + 獎金入獎金錢包 HL.bonus（帶 source 自動入帳本）+ 通知 + toast。
 *   忠誠類（VIP 段位 / 連續簽到）門檻於重評時「即時讀取」HL.vip / HL.rewards，故簽到後呼 sync() 亦即時解鎖。
 *
 * spec 欄位（除 id/title 皆可省）：
 *   { id, cat, icon, title, desc, tier,          // tier: bronze|silver|gold|plat（決定徽章配色）
 *     stat, goal,                                // 門檻式：某終身統計 stat >= goal 即達成
 *     test(stats) -> bool,                       // 或自訂判定（覆寫 stat/goal）
 *     pts, reward }                              // 成就點數（XP）+ 解鎖獎金（入獎金錢包）
 *
 * 終身統計走站別命名空間（HL.dom.lsGet/lsSet → demo/live 平行宇宙隔離，比照 VIP/任務；
 *   成就為玩家真實進度、非假活動產生器，故不加 isLive() 閘）。
 * status()/record()/sync()/register()/open()。註冊於 window.HL.achievements。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;   // T20：共用 localStorage 出口（站別命名空間）
  var dayNum = HL.dom.dayNum;
  var KEY = "HL_ACHIEVE";

  // ---- 註冊表（容器先於內容）----
  var specs = [];                                // 依註冊序；牆依 cat 分組渲染
  var byId = {};
  function register(spec) {
    if (!spec || !spec.id || byId[spec.id]) return HL.achievements;
    spec.tier = spec.tier || "bronze";
    spec.pts = spec.pts || 0;
    spec.reward = spec.reward || 0;
    specs.push(spec); byId[spec.id] = spec;
    return HL.achievements;                       // 可鏈式
  }

  // ---- 終身統計（含即時讀取的忠誠維度）----
  function raw() { return ls(KEY, { bets: 0, wagered: 0, wins: 0, bestWin: 0, bestMult: 0, games: {}, unlocked: {} }); }
  function stats() {
    var s = raw();
    return {
      bets: s.bets || 0, wagered: s.wagered || 0, wins: s.wins || 0,
      bestWin: s.bestWin || 0, bestMult: s.bestMult || 0,
      variety: s.games ? Object.keys(s.games).length : 0,
      vipRank: (HL.vip && HL.vip.status) ? HL.vip.status().index : 0,     // 即時讀 VIP 段位
      streak: (HL.rewards && HL.rewards.status) ? HL.rewards.status().streak : 0  // 即時讀連續簽到
    };
  }
  function meets(spec, st) {
    if (typeof spec.test === "function") { try { return !!spec.test(st); } catch (e) { return false; } }
    if (spec.stat == null) return false;
    return (st[spec.stat] || 0) >= spec.goal;
  }
  // 目前進度（0–1），供未解鎖徽章顯示進度條；test 型無數值 → 未達 0 / 已達 1
  function progressOf(spec, st) {
    if (typeof spec.test === "function") return meets(spec, st) ? 1 : 0;
    if (spec.stat == null || !spec.goal) return 0;
    return Math.max(0, Math.min(1, (st[spec.stat] || 0) / spec.goal));
  }

  // ---- 重評 + 解鎖（即時發獎）----
  function evaluate(st) {
    var s = raw();
    s.unlocked = s.unlocked || {};
    var newly = [];
    for (var i = 0; i < specs.length; i++) {
      var sp = specs[i];
      if (s.unlocked[sp.id]) continue;
      if (meets(sp, st)) { s.unlocked[sp.id] = dayNum(); newly.push(sp); }
    }
    if (newly.length) {
      save(KEY, s);
      newly.forEach(function (sp) {
        if (sp.reward > 0 && HL.bonus) HL.bonus.add(sp.reward, { source: "成就徽章" });
        if (HL.ui) HL.ui.toast("🏅 成就解鎖：" + sp.title + (sp.reward > 0 ? "　+" + money(sp.reward) + " 獎金" : ""), "ok");
        if (HL.notify) HL.notify.add({ ic: "🏅", title: "成就解鎖：" + sp.title, text: sp.desc + (sp.reward > 0 ? "　獎金 " + money(sp.reward) + " 已入獎金錢包。" : "") + (sp.pts > 0 ? "　成就點數 +" + sp.pts + "。" : "") });
      });
      if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    }
    return newly;
  }

  // ---- 中央掛鉤：全遊戲結算後累積終身統計並重評 ----
  function record(game, bet, win) {
    bet = bet || 0; win = win || 0;
    if (bet <= 0 && win <= 0) return;
    var s = raw();
    if (bet > 0) { s.bets = (s.bets || 0) + 1; s.wagered = (s.wagered || 0) + bet; if (game) { s.games = s.games || {}; s.games[game] = 1; } }
    if (win > 0) { s.wins = (s.wins || 0) + 1; if (win > (s.bestWin || 0)) s.bestWin = win; }
    if (bet > 0 && win > 0) { var m = win / bet; if (m > (s.bestMult || 0)) s.bestMult = m; }
    save(KEY, s);
    evaluate(stats());
  }
  // 非下注事件（如簽到後）觸發重評，讓忠誠類成就即時解鎖
  function sync() { evaluate(stats()); }

  // ---- 對外狀態 ----
  function status() {
    var s = raw(); s.unlocked = s.unlocked || {};
    var st = stats();
    var unlocked = 0, pts = 0;
    var list = specs.map(function (sp) {
      var got = !!s.unlocked[sp.id];
      if (got) { unlocked++; pts += sp.pts; }
      return { id: sp.id, cat: sp.cat, icon: sp.icon, title: sp.title, desc: sp.desc, tier: sp.tier,
               pts: sp.pts, reward: sp.reward, unlocked: got, prog: got ? 1 : progressOf(sp, st) };
    });
    return { total: specs.length, unlocked: unlocked, pts: pts,
             pct: specs.length ? (unlocked / specs.length) * 100 : 0, list: list };
  }

  // ---- 徽章牆（資料驅動網格，依 cat 分組）----
  var TIER_LABEL = { bronze: "銅", silver: "銀", gold: "金", plat: "白金" };
  function badgeCard(a) {
    var kids = [
      el("div", { class: "ax-badge__ic", text: a.icon || "🏅" }),
      el("div", { class: "ax-badge__meta" }, [
        el("div", { class: "ax-badge__t", text: a.title }),
        el("small", { class: "ax-badge__d", text: a.desc }),
        a.unlocked
          ? el("small", { class: "ax-badge__done", text: "✓ 已解鎖" + (a.reward > 0 ? "　+" + money(a.reward) : "") })
          : HL.ui.progress(a.prog * 100)
      ]),
      el("span", { class: "ax-badge__pts", text: "+" + a.pts })
    ];
    return el("div", { class: "ax-badge ax-badge--" + a.tier + (a.unlocked ? " is-on" : " is-locked") }, kids);
  }
  function open() {
    var st = status();
    // 依註冊序分組（保留 cat 首次出現順序）
    var cats = [], grouped = {};
    st.list.forEach(function (a) {
      var c = a.cat || "其他";
      if (!grouped[c]) { grouped[c] = []; cats.push(c); }
      grouped[c].push(a);
    });
    var body = [
      el("div", { class: "ax-panel ax-badgewall__hd" }, [
        el("div", { class: "ax-badgewall__stat" }, [
          el("b", { class: "ax-gold", text: st.pts + " 點" }),
          el("small", { class: "ax-muted", text: "成就點數" })
        ]),
        el("div", { class: "ax-badgewall__stat" }, [
          el("b", { text: st.unlocked + " / " + st.total }),
          el("small", { class: "ax-muted", text: "已解鎖徽章" })
        ]),
        el("div", { class: "ax-badgewall__prog" }, [
          HL.ui.progress(st.pct),
          el("small", { class: "ax-muted", text: "完成度 " + Math.round(st.pct) + "%" })
        ])
      ])
    ];
    cats.forEach(function (c) {
      body.push(el("div", { class: "ax-hub__cat", text: c }));
      var grid = el("div", { class: "ax-badgewall__grid" });
      grouped[c].forEach(function (a) { grid.appendChild(badgeCard(a)); });
      body.push(grid);
    });
    body.push(el("button", { class: "ax-btn-ghost", text: "前往領取中心 →", onClick: function () { HL.ui.closeTop(); if (HL.bonus) HL.bonus.open(); } }));
    body.push(el("span", { class: "ax-demo-tag", text: "下注即累積終身進度 · 解鎖即發獎金與成就點數 · Demo" }));
    HL.ui.modal("🏅 成就徽章牆", body, { wide: true });
  }

  HL.achievements = { register: register, record: record, sync: sync, status: status, open: open,
                      ids: function () { return specs.map(function (s) { return s.id; }); } };

  // ===================== 種子成就目錄（資料驅動；未來模組可續 register） =====================
  [
    // — 下注里程碑 —
    { id: "first-bet", cat: "下注里程碑", icon: "🎲", title: "初試身手", desc: "完成第一次下注", tier: "bronze", stat: "bets", goal: 1, pts: 5, reward: 100 },
    { id: "bet-100", cat: "下注里程碑", icon: "🎯", title: "百戰之路", desc: "累積下注 100 次", tier: "silver", stat: "bets", goal: 100, pts: 10, reward: 500 },
    { id: "bet-1000", cat: "下注里程碑", icon: "🔥", title: "千局老手", desc: "累積下注 1,000 次", tier: "gold", stat: "bets", goal: 1000, pts: 25, reward: 3000 },
    // — 累積押注（流水）—
    { id: "wager-10k", cat: "累積押注", icon: "💰", title: "小試流水", desc: "累積有效押注 NT$10,000", tier: "bronze", stat: "wagered", goal: 10000, pts: 10, reward: 300 },
    { id: "wager-100k", cat: "累積押注", icon: "💵", title: "流水達人", desc: "累積有效押注 NT$100,000", tier: "silver", stat: "wagered", goal: 100000, pts: 20, reward: 1500 },
    { id: "wager-1m", cat: "累積押注", icon: "🏦", title: "百萬流水", desc: "累積有效押注 NT$1,000,000", tier: "gold", stat: "wagered", goal: 1000000, pts: 50, reward: 8000 },
    // — 勝利 —
    { id: "win-50", cat: "勝利", icon: "🎉", title: "常勝之始", desc: "累積贏 50 局", tier: "bronze", stat: "wins", goal: 50, pts: 10, reward: 400 },
    { id: "win-500", cat: "勝利", icon: "👑", title: "勝場常客", desc: "累積贏 500 局", tier: "silver", stat: "wins", goal: 500, pts: 25, reward: 2000 },
    // — 大獎 · 高倍 —
    { id: "big-win-5k", cat: "大獎 · 高倍", icon: "💥", title: "初嘗大獎", desc: "單筆贏分達 NT$5,000", tier: "silver", stat: "bestWin", goal: 5000, pts: 15, reward: 800 },
    { id: "big-win-50k", cat: "大獎 · 高倍", icon: "🌟", title: "一擲萬金", desc: "單筆贏分達 NT$50,000", tier: "gold", stat: "bestWin", goal: 50000, pts: 40, reward: 5000 },
    { id: "mult-10", cat: "大獎 · 高倍", icon: "⚡", title: "十倍時刻", desc: "單局命中 10× 以上", tier: "silver", stat: "bestMult", goal: 10, pts: 15, reward: 600 },
    { id: "mult-100", cat: "大獎 · 高倍", icon: "🚀", title: "百倍傳說", desc: "單局命中 100× 以上", tier: "gold", stat: "bestMult", goal: 100, pts: 40, reward: 4000 },
    { id: "mult-1000", cat: "大獎 · 高倍", icon: "🏆", title: "千倍神話", desc: "單局命中 1,000× 以上", tier: "plat", stat: "bestMult", goal: 1000, pts: 80, reward: 20000 },
    // — 探索 —
    { id: "explore-5", cat: "探索", icon: "🧭", title: "廣泛涉獵", desc: "玩過 5 款不同遊戲", tier: "bronze", stat: "variety", goal: 5, pts: 10, reward: 400 },
    { id: "explore-12", cat: "探索", icon: "🗺️", title: "遍歷賭城", desc: "玩過 12 款不同遊戲", tier: "gold", stat: "variety", goal: 12, pts: 30, reward: 2500 },
    // — 忠誠 —
    { id: "vip-gold", cat: "忠誠", icon: "🥇", title: "黃金會員", desc: "VIP 等級達到黃金", tier: "silver", pts: 20, reward: 1000, test: function (s) { return s.vipRank >= 2; } },
    { id: "vip-diamond", cat: "忠誠", icon: "💎", title: "鑽石之巔", desc: "VIP 等級達到鑽石", tier: "plat", pts: 60, reward: 10000, test: function (s) { return s.vipRank >= 4; } },
    { id: "streak-7", cat: "忠誠", icon: "📆", title: "一週不斷", desc: "連續簽到 7 天", tier: "silver", stat: "streak", goal: 7, pts: 15, reward: 800 },
    { id: "streak-30", cat: "忠誠", icon: "🗓️", title: "月度全勤", desc: "連續簽到 30 天", tier: "plat", stat: "streak", goal: 30, pts: 50, reward: 8000 }
  ].forEach(register);
})(window);

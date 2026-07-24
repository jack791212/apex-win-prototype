/*
 * Apex Win｜團隊/公會 meta HL.guild（team-vs-team 社交層 · 資料驅動骨架 · 擴充性優先）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 radar 連 7 輪點名的「業界最強空缺」——公會/團隊戰（CapySpin Guild Battles、島戰 raid、
 *   Stake/BC.Game 的 crew 週榜）。2026 社交 casino 共識：團隊歸屬感 + team-vs-team 競賽是留存
 *   下一條護城河（個人榜已飽和）。ApexWin 先前僅 #30 Dice Duel 1v1，無團隊層。
 *
 * 核心哲學＝容器先於內容：這裡是一個「公會『註冊表』」。種子先塞一批公會，任何未來模組只要
 *   HL.guild.register(spec) 即把新公會掛上榜（比照 HL.games / HL.achievements 自我上架），
 *   不需要動這支引擎。玩家加入一個公會，其有效押注即成為該公會的「週貢獻」。
 *
 * 純前端骨架（社交層/好友/後端待 route C/D）：其他隊伍與隊友活動為「模擬」，故一律加 isLive() 閘——
 *   真站(live) 關掉所有假隊伍/假隊友分數（比照 tournament/arena bot），只留玩家自己的貢獻。
 *
 * 資料流：liveStats.record(game,bet,win) → HL.guild.record(bet) 累積玩家「本週貢獻」→ 計入所屬公會
 *   週榜分數，並推進「貢獻任務」里程碑。兩條獎勵路徑（皆入獎金錢包 HL.bonus，帶 source 自動進帳本）：
 *     ① 貢獻任務里程碑（玩家本人本週貢獻跨門檻即可領，冪等 per week）＝真正玩家賺得的獎勵。
 *     ② 週榜結算（跨週時依所屬公會 vs 對手最終名次派發，冪等 per week，比照 tournament.settle）。
 * 進度走站別命名空間（demo/live 平行宇宙隔離，比照 VIP/成就/季票）；週期以 weekNum() 換季自動重置。
 * status()/record()/join()/leave()/claimQuest()/register()/open()。註冊於 window.HL.guild。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;   // 站別命名空間出口
  var weekNum = HL.dom.weekNum, dayNum = HL.dom.dayNum, rint = HL.dom.rint;
  var KEY = "HL_GUILD";

  function isLive() { return !!(HL.site && HL.site.isLive()); }

  // ---- 公會註冊表（容器先於內容）----
  var GUILDS = [], byId = {};
  function register(spec) {
    if (!spec || !spec.id || byId[spec.id]) return HL.guild;
    spec.icon = spec.icon || "🛡️"; spec.tag = spec.tag || spec.id.toUpperCase();
    GUILDS.push(spec); byId[spec.id] = spec;
    return HL.guild;                              // 可鏈式
  }

  // ---- 貢獻任務里程碑（玩家本週貢獻；純資料，改資料即可加階/換獎）----
  var QUEST = [
    { need: 5000,   reward: 200,  ic: "🎯", title: "先鋒" },
    { need: 20000,  reward: 800,  ic: "🔥", title: "主力" },
    { need: 60000,  reward: 2500, ic: "💎", title: "精銳" },
    { need: 150000, reward: 8000, ic: "👑", title: "傳奇" }
  ];
  function rankPrize(rank) { return rank === 1 ? 5000 : rank === 2 ? 2500 : rank === 3 ? 1000 : 0; }

  // ---- 玩家狀態（站別命名空間；weekNum 換週自動重置貢獻，跨週先結算上週）----
  function tick() {
    var s = ls(KEY, {}); s.claimed = s.claimed || {};
    var wk = weekNum();
    if (s.wk == null) { s.wk = wk; save(KEY, s); }
    if (s.wk !== wk) {
      if (s.gid) settlePrevWeek(s);              // 先派上週名次獎（冪等）
      s.wk = wk; s.wager = 0; s.claimed = {}; save(KEY, s);
    }
    return s;
  }

  // ---- 確定性種子（同一週內穩定、隨週變動；真站歸零＝無假分）----
  function hash(str) { var h = 2166136261 >>> 0; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function seeded(gid, wk, salt, min, max) { if (isLive()) return 0; var h = hash(gid + "|" + wk + "|" + salt); return min + (h % (max - min + 1)); }

  // ---- 週榜（team-vs-team；玩家貢獻計入所屬公會；真站無其他隊伍假分）----
  function leaderboard(wk, contrib, myGid) {
    var live = isLive();
    var rows = GUILDS.map(function (g) {
      var base = seeded(g.id, wk, "base", 40000, 240000);          // 對手隊模擬週分（live→0）
      var score = base + (g.id === myGid ? (contrib || 0) : 0);
      return { gid: g.id, name: g.name, icon: g.icon, tag: g.tag, score: Math.round(score), mine: g.id === myGid };
    });
    if (live) rows = rows.filter(function (r) { return r.mine; });  // 真站只留玩家所屬隊
    rows.sort(function (a, b) { var d = b.score - a.score; return d !== 0 ? d : (a.mine ? -1 : b.mine ? 1 : (a.name < b.name ? -1 : 1)); });
    rows.forEach(function (r, i) { r.rank = i + 1; });
    return rows;
  }

  // ---- 跨週結算（依上週名次派公會獎金；冪等 per week）----
  function settlePrevWeek(s) {
    if (!s.gid || s.lastSettledWk === s.wk) return;
    var lb = leaderboard(s.wk, s.wager, s.gid), mine = null;
    for (var i = 0; i < lb.length; i++) if (lb[i].gid === s.gid) { mine = lb[i]; break; }
    var rank = mine ? mine.rank : lb.length, prize = rankPrize(rank);
    s.lastSettledWk = s.wk; save(KEY, s);         // 先落地旗標杜絕重入雙倍
    if (prize > 0 && HL.bonus) {
      HL.bonus.add(prize, { source: "公會週榜獎金" });
      var gname = byId[s.gid] ? byId[s.gid].name : "公會";
      if (HL.ui) HL.ui.toast("⚔️ " + gname + " 週榜第 " + rank + " 名！獎金 " + money(prize) + " 已入獎金錢包", "ok");
      if (HL.notify) HL.notify.add({ ic: "⚔️", title: "公會週榜結算：第 " + rank + " 名", text: gname + " 上週結算，團隊獎金 " + money(prize) + " 已入獎金錢包。" });
    }
  }

  // ---- 中央掛鉤：有效押注 → 累積本週貢獻 + 里程碑即時通知 ----
  function record(bet) {
    bet = bet || 0; if (bet <= 0) return;
    var s = tick(); if (!s.gid) return;           // 未入會＝不累積
    var before = questClaimable(s).length;
    s.wager = (s.wager || 0) + bet; save(KEY, s);
    var after = questClaimable(s).length;
    if (after > before && HL.ui) {
      HL.ui.toast("⚔️ 公會貢獻任務可領取：" + after + " 項", "ok");
      if (HL.notify) HL.notify.add({ ic: "⚔️", title: "公會貢獻任務達標", text: "你本週的公會貢獻跨越了新門檻，有 " + after + " 項團隊獎勵可於公會面板領取。" });
      if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    }
  }

  function questClaimable(s) {
    var out = []; if (!s.gid) return out;
    QUEST.forEach(function (q, i) { if ((s.wager || 0) >= q.need && !s.claimed[i]) out.push(i); });
    return out;
  }
  function claimQuest(i) {
    var s = tick(), q = QUEST[i];
    if (!s.gid || !q || (s.wager || 0) < q.need || s.claimed[i]) return false;
    s.claimed[i] = dayNum(); save(KEY, s);
    if (HL.bonus) HL.bonus.add(q.reward, { source: "公會貢獻任務" });
    return true;
  }

  // ---- 加入 / 退出 ----
  function join(gid) {
    if (!byId[gid]) return false;
    var s = tick(); if (s.gid === gid) return true;
    s.gid = gid; save(KEY, s);
    var g = byId[gid];
    if (HL.ui) HL.ui.toast("⚔️ 已加入公會：" + g.icon + " " + g.name, "ok");
    if (HL.notify) HL.notify.add({ ic: g.icon, title: "加入公會：" + g.name, text: "歡迎加入！你的每筆有效押注都會計入 " + g.name + " 的週榜貢獻，週末結算團隊獎金。" });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return true;
  }
  function leave() {
    var s = tick(); if (!s.gid) return false;
    s.gid = null; save(KEY, s);
    if (HL.ui) HL.ui.toast("已退出公會", "warn");
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return true;
  }

  // ---- 對外狀態 ----
  function status() {
    var s = tick(), wk = weekNum();
    var lb = leaderboard(wk, s.wager, s.gid), mine = null;
    if (s.gid) for (var i = 0; i < lb.length; i++) if (lb[i].gid === s.gid) { mine = lb[i]; break; }
    return {
      joined: !!s.gid, guild: s.gid ? byId[s.gid] : null,
      contrib: s.wager || 0, rank: mine ? mine.rank : 0, score: mine ? mine.score : 0,
      totalGuilds: lb.length, count: GUILDS.length, claimable: questClaimable(s).length
    };
  }

  // ========================= 面板 =========================
  function reopen() { HL.ui.closeTop(); open(); }

  // 模擬隊友（真站→空；純前端骨架，好友/社交層待後端）
  function botPool() { return (HL.mock && HL.mock.fakeNames) ? HL.mock.fakeNames.slice() : ["Ace", "Neo", "Luna", "Rex", "Max", "Kai", "Zoe", "Sky", "Fox", "Jin", "Mia", "Leo"]; }
  function teammates(gid, wk, myContrib) {
    if (isLive() || !gid) return [];
    var pool = botPool(), n = 3, out = [];
    for (var i = 0; i < n; i++) {
      var nm = pool[seeded(gid, wk, "nm" + i, 0, pool.length - 1)] + seeded(gid, wk, "tag" + i, 10, 99);
      out.push({ name: nm, contrib: seeded(gid, wk, "c" + i, 3000, 55000) });
    }
    out.push({ name: "你", contrib: myContrib || 0, you: true });
    out.sort(function (a, b) { return b.contrib - a.contrib; });
    return out;
  }

  function guildBrowser(body, st) {
    body.push(el("p", { class: "ax-muted ax-guild__lede", text: "加入一個公會，你的每筆有效押注都會計入團隊週榜。與其他公會競爭名次，週末依名次發放團隊獎金，並沿途解鎖個人貢獻任務。" }));
    var grid = el("div", { class: "ax-guild__browse" });
    var wk = weekNum();
    GUILDS.forEach(function (g) {
      var lbRow = leaderboard(wk, 0, null).filter(function (r) { return r.gid === g.id; })[0];
      grid.appendChild(HL.dom.pressable(el("button", { class: "ax-guild__gcard", onClick: function () { if (join(g.id)) reopen(); } }, [
        el("span", { class: "ax-guild__gic", text: g.icon }),
        el("div", { class: "ax-guild__gmeta" }, [
          el("b", { text: g.name }),
          el("small", { class: "ax-muted", text: g.motto || g.tag })
        ]),
        el("span", { class: "ax-guild__gjoin", text: "加入" })
      ])));
    });
    body.push(grid);
  }

  function questRow(i, st, s) {
    var q = QUEST[i], reached = (s.wager || 0) >= q.need, claimed = !!s.claimed[i];
    var cls = "ax-guild__quest", stateTxt, clickable = false;
    if (claimed) { cls += " is-claimed"; stateTxt = "✓ 已領"; }
    else if (reached) { cls += " is-claimable"; stateTxt = "領取"; clickable = true; }
    else { cls += " is-locked"; stateTxt = money(q.need) + " 貢獻"; }
    var pct = Math.max(0, Math.min(100, ((s.wager || 0) / q.need) * 100));
    var kids = [
      el("span", { class: "ax-guild__qic", text: q.ic }),
      el("div", { class: "ax-guild__qmeta" }, [
        el("b", { text: q.title + "　+" + money(q.reward) }),
        claimed ? el("small", { class: "ax-muted", text: "團隊獎金已入獎金錢包" }) : HL.ui.progress(pct)
      ]),
      el("small", { class: "ax-guild__qstate", text: stateTxt })
    ];
    if (clickable) {
      return el("button", { class: cls, onClick: function () {
        if (claimQuest(i)) { HL.ui.toast("⚔️ 已領取貢獻獎勵：" + money(q.reward), "ok"); reopen(); }
      } }, kids);
    }
    return el("div", { class: cls }, kids);
  }

  function guildDashboard(body, st) {
    var s = tick(), g = st.guild, wk = weekNum();

    // 頭部：所屬公會 + 名次 + 我的貢獻
    body.push(el("div", { class: "ax-panel ax-guild__hd" }, [
      el("div", { class: "ax-guild__hdtitle" }, [
        el("span", { class: "ax-guild__hdic", text: g.icon }),
        el("div", {}, [ el("b", { text: g.name }), el("small", { class: "ax-muted", text: g.motto || g.tag }) ])
      ]),
      el("div", { class: "ax-guild__hdstat" }, [
        el("b", { class: "ax-gold", text: st.rank ? ("第 " + st.rank + " 名") : "—" }),
        el("small", { class: "ax-muted", text: "本週 / " + st.totalGuilds + " 隊" })
      ]),
      el("div", { class: "ax-guild__hdstat" }, [
        el("b", { text: money(st.contrib) }),
        el("small", { class: "ax-muted", text: "我的貢獻" })
      ])
    ]));

    // team-vs-team 週榜
    body.push(el("div", { class: "ax-hub__cat", text: "團隊週榜 · team-vs-team" }));
    var lb = leaderboard(wk, s.wager, s.gid);
    var board = el("div", { class: "ax-guild__board" });
    lb.forEach(function (r) {
      board.appendChild(el("div", { class: "ax-guild__brow" + (r.mine ? " is-mine" : "") }, [
        el("span", { class: "ax-guild__brank", text: "#" + r.rank }),
        el("span", { class: "ax-guild__bic", text: r.icon }),
        el("b", { class: "ax-guild__bname", text: r.name + (r.mine ? "（我）" : "") }),
        el("span", { class: "ax-guild__bscore", text: money(r.score) })
      ]));
    });
    if (isLive()) board.appendChild(el("small", { class: "ax-muted ax-guild__note", text: "真站模式：不顯示模擬對手隊伍，僅計你所屬公會的真實貢獻。" }));
    board.appendChild(el("small", { class: "ax-muted ax-guild__note", text: "週末依名次發放團隊獎金（第 1／2／3 名 = " + money(5000) + "／" + money(2500) + "／" + money(1000) + "）。" }));
    body.push(board);

    // 隊友（模擬骨架）
    var mates = teammates(s.gid, wk, s.wager);
    if (mates.length) {
      body.push(el("div", { class: "ax-hub__cat", text: "本週貢獻榜（隊內）" }));
      var mlist = el("div", { class: "ax-guild__mates" });
      mates.slice(0, 6).forEach(function (m, i) {
        mlist.appendChild(el("div", { class: "ax-guild__mate" + (m.you ? " is-you" : "") }, [
          el("span", { class: "ax-guild__mrank", text: String(i + 1) }),
          el("b", { class: "ax-guild__mname", text: m.name }),
          el("span", { class: "ax-guild__mscore", text: money(m.contrib) })
        ]));
      });
      body.push(mlist);
    }

    // 貢獻任務里程碑
    body.push(el("div", { class: "ax-hub__cat", text: "個人貢獻任務" + (st.claimable ? "（" + st.claimable + " 項可領取）" : "") }));
    var quests = el("div", { class: "ax-guild__quests" });
    for (var i = 0; i < QUEST.length; i++) quests.appendChild(questRow(i, st, s));
    body.push(quests);

    // 動作
    body.push(el("div", { class: "ax-guild__actions" }, [
      el("button", { class: "ax-btn-ghost", text: "換公會 / 瀏覽全部", onClick: function () { HL.ui.closeTop(); openBrowse(); } }),
      el("button", { class: "ax-btn-ghost", text: "退出公會", onClick: function () { if (leave()) reopen(); } })
    ]));
  }

  var _forceBrowse = false;
  function openBrowse() { _forceBrowse = true; open(); }
  function open() {
    var st = status(), body = [];
    if (!st.joined || _forceBrowse) { _forceBrowse = false; guildBrowser(body, st); }
    else guildDashboard(body, st);
    body.push(el("span", { class: "ax-demo-tag", text: "下注即累積公會貢獻 · 週末結算團隊獎金 · 純前端骨架（社交層待後端）· Demo" }));
    HL.ui.modal("⚔️ 公會 · 團隊戰", body, { wide: true });
  }

  HL.guild = { register: register, record: record, join: join, leave: leave,
               claimQuest: claimQuest, status: status, open: open,
               ids: function () { return GUILDS.map(function (g) { return g.id; }); } };

  // ===================== 種子公會目錄（資料驅動；未來模組/後端可續 register） =====================
  [
    { id: "shadow-wolves", name: "暗影狼群", icon: "🐺", tag: "WOLF", motto: "月下同行，永不獨獵" },
    { id: "golden-dragons", name: "黃金龍族", icon: "🐉", tag: "GOLD", motto: "逐金而生，一擲千金" },
    { id: "neon-syndicate", name: "霓虹辛迪加", icon: "🌃", tag: "NEON", motto: "不夜之城，勝率永燃" },
    { id: "lucky-clover", name: "幸運草會", icon: "🍀", tag: "LUCK", motto: "四葉在手，好運長留" },
    { id: "crimson-order", name: "赤紅騎士團", icon: "⚔️", tag: "CRIM", motto: "以榮譽下注，以團隊致勝" },
    { id: "void-runners", name: "虛空行者", icon: "🚀", tag: "VOID", motto: "衝破極限，倍數無界" }
  ].forEach(register);
})(window);

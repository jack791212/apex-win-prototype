/*
 * Apex Win｜留存三件套：VIP 等級 + 任務/成就 + 獎金錢包（領取中心）
 * 純前端 localStorage。資料源：HL.liveStats.record(game,bet,win) 為全遊戲中央記錄點，
 *   在其尾端餵 HL.vip.addWager / HL.tasks.bump（見 live-stats.js / instant.js 的掛鉤）。
 * 註冊於 window.HL.vip / HL.tasks / HL.bonus。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function ls(k, d) { try { return JSON.parse(global.localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function dayNum() { return Math.floor(Date.now() / 86400000); }
  function bar(pct) { return el("div", { class: "ax-progress" }, [el("i", { style: "width:" + Math.max(0, Math.min(100, pct)) + "%" })]); }

  /* ===================== 獎金錢包 / 領取中心 ===================== */
  var KEY_B = "HL_BONUS";
  function bbal() { return ls(KEY_B, { bonus: 0 }).bonus || 0; }
  function badd(n) { var o = ls(KEY_B, { bonus: 0 }); o.bonus = Math.max(0, Math.round((o.bonus || 0) + n)); save(KEY_B, o); }
  function bclaim() {
    var amt = bbal(); if (amt <= 0) return 0;
    save(KEY_B, { bonus: 0 });
    HL.state.set({ balance: HL.state.get().balance + amt });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return amt;
  }
  function bonusOpen() {
    var amt = bbal();
    var m = HL.ui.modal("🎁 領取中心 · 獎金錢包", [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "可領取獎金" }), el("b", { class: "ax-gold", text: money(amt) })]),
        el("small", { class: "ax-muted", text: "獎金來自每日任務、VIP 升級。領取後轉入主餘額（休閒遊戲幣）。" })
      ]),
      el("button", { class: "ax-btn-primary", text: amt > 0 ? ("領取 " + money(amt) + " 到主餘額") : "目前沒有可領取獎金", disabled: amt > 0 ? null : "disabled", onClick: function () {
        var got = bclaim(); if (got > 0) { HL.ui.toast("已領取 " + money(got) + " 到主餘額", "ok"); m.close(); bonusOpen(); }
      } }),
      el("button", { class: "ax-btn-ghost", text: "去完成每日任務 →", onClick: function () { m.close(); tasksOpen(); } }),
      el("span", { class: "ax-demo-tag", text: "休閒模式 · Demo" })
    ]);
  }
  HL.bonus = { balance: bbal, add: badd, claim: bclaim, open: bonusOpen };

  /* ===================== VIP 等級 ===================== */
  var KEY_V = "HL_VIP";
  var RANKS = [
    { name: "青銅", icon: "🥉", min: 0, reward: 0 },
    { name: "白銀", icon: "🥈", min: 5000, reward: 500 },
    { name: "黃金", icon: "🥇", min: 20000, reward: 1500 },
    { name: "白金", icon: "💠", min: 60000, reward: 5000 },
    { name: "鑽石", icon: "💎", min: 150000, reward: 15000 }
  ];
  function vwager() { return ls(KEY_V, { wager: 0 }).wager || 0; }
  function rankIndexFor(w) { var idx = 0; for (var i = 0; i < RANKS.length; i++) if (w >= RANKS[i].min) idx = i; return idx; }
  // #29 tier-up 雙層獎金（對標 Shuffle level-up + tier-up）：每段位內切 SUBS 個子等級，
  // 升「子級」發小獎（LEVEL_REWARDS，依所在段位）、跨「段位（大階）」發既有大獎（RANKS[].reward）。
  var SUBS = 5;                                  // 每段位 5 個子等級（各段 gap 均分，恰為整數）
  var LEVEL_REWARDS = [60, 150, 400, 1000, 0];   // 各段位內「升一子級」獎金（鑽石為頂、無子級）
  function subIndexFor(w) {                      // 全域子級序＝rank×SUBS＋段內子級（鑽石＝終點）
    var i = rankIndexFor(w), r = RANKS[i], next = RANKS[i + 1];
    if (!next) return i * SUBS;
    var step = (next.min - r.min) / SUBS;
    return i * SUBS + Math.min(SUBS - 1, Math.floor((w - r.min) / step));
  }
  function vstatus() {
    var w = vwager(), i = rankIndexFor(w), r = RANKS[i], next = RANKS[i + 1] || null;
    var pct = next ? ((w - r.min) / (next.min - r.min)) * 100 : 100;
    var step = next ? (next.min - r.min) / SUBS : 0;
    var sub = next ? Math.min(SUBS - 1, Math.floor((w - r.min) / step)) : 0;
    return {
      index: i, name: r.name, icon: r.icon, wager: w, next: next, toNext: next ? next.min - w : 0, pct: pct,
      sub: sub, subs: SUBS, toNextSub: next ? (r.min + step * (sub + 1)) - w : 0, levelReward: LEVEL_REWARDS[i] || 0,
      // #31 微等級：全域等級 Lv 1..21（鑽石＝封頂）＋ 距下一子級的段內進度（header 迷你條用）
      level: i * SUBS + sub + 1, maxLevel: (RANKS.length - 1) * SUBS + 1,
      subPct: next ? ((w - (r.min + step * sub)) / step) * 100 : 100
    };
  }
  function addWager(amount) {
    amount = Math.round(amount || 0); if (amount <= 0) return;
    var o = ls(KEY_V, { wager: 0 });
    var before = rankIndexFor(o.wager || 0), beforeSub = subIndexFor(o.wager || 0);
    o.wager = (o.wager || 0) + amount; save(KEY_V, o);
    var after = rankIndexFor(o.wager), afterSub = subIndexFor(o.wager);
    if (after > before) { // 跨大階：發段位大獎（tier-up）
      for (var i = before + 1; i <= after; i++) if (RANKS[i].reward) badd(RANKS[i].reward);
      var rk = RANKS[after];
      HL.ui.toast("🎉 VIP 升級：" + rk.icon + " " + rk.name + "！獎金 " + money(RANKS[after].reward) + " 已入獎金錢包", "ok");
      if (HL.notify) HL.notify.add({ ic: rk.icon, title: "VIP 升級：" + rk.name, text: "恭喜晉升 " + rk.name + "，升級獎金 " + money(RANKS[after].reward) + " 已入獎金錢包。" });
    }
    // 升子級：發小獎（段位邊界 s%SUBS===0 由上面大階路徑發、此處跳過＝不重複）
    var levelGain = 0;
    for (var s = beforeSub + 1; s <= afterSub; s++) {
      if (s % SUBS === 0) continue;
      levelGain += LEVEL_REWARDS[Math.floor(s / SUBS)] || 0;
    }
    if (levelGain > 0) {
      badd(levelGain);
      HL.ui.toast("⭐ VIP 子等級提升！獎金 " + money(levelGain) + " 已入獎金錢包", "ok");
      if (HL.notify) HL.notify.add({ ic: "⭐", title: "VIP 子等級提升", text: "等級推進獎金 " + money(levelGain) + " 已入獎金錢包。" });
    }
    // 每次押注都刷新 chrome（header 微等級迷你條要能連續推進，不只在升級瞬間跳動）
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }
  function vipOpen() {
    var s = vstatus();
    var rows = RANKS.map(function (r, i) {
      return el("div", { class: "ax-kv" + (i === s.index ? " ax-vip__cur" : "") }, [
        el("span", { text: r.icon + " " + r.name + (i === s.index ? "（目前）" : "") }),
        el("b", { class: "ax-muted", text: "押注滿 " + money(r.min) + (r.reward ? " · 獎金 " + money(r.reward) : "") })
      ]);
    });
    var m = HL.ui.modal("💎 VIP 俱樂部", [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [el("span", { text: "目前等級" }), el("b", { class: "ax-gold", text: s.icon + " " + s.name })]),
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "累積有效押注" }), el("b", { text: money(s.wager) })]),
        bar(s.pct),
        el("small", { class: "ax-muted", text: s.next ? ("再押注 " + money(s.toNext) + " 升級到 " + s.next.icon + " " + s.next.name) : "已達最高等級 💎" }),
        s.next ? el("div", { class: "ax-kv" }, [
          el("span", { class: "ax-muted", text: "⭐ 子等級" }),
          el("b", { text: "Lv " + (s.sub + 1) + " / " + s.subs })
        ]) : null,
        s.next ? el("small", { class: "ax-muted" }, [
          el("span", { text: "距下一級" }), document.createTextNode(" " + money(s.toNextSub) + " · "),
          el("span", { text: "每級獎金" }), document.createTextNode(" " + money(s.levelReward))
        ]) : null
      ]),
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "💧 返水率（本級）" }), el("b", { class: "ax-gold", text: (HL.rakeback ? (HL.rakeback.rate() * 100).toFixed(1) : "0") + "%" })]),
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "可領取返水" }), el("b", { class: "ax-gold", text: money(HL.rakeback ? Math.floor(HL.rakeback.pot()) : 0) })]),
        el("button", { class: "ax-btn-ghost", text: "前往 Rakeback 返水 →", onClick: function () { m.close(); if (HL.rakeback) HL.rakeback.open(); } }),
        el("button", { class: "ax-btn-ghost", text: "🔄 領週期紅利（每日/週/月）→", onClick: function () { m.close(); if (HL.reload) HL.reload.open(); } })
      ]),
      el("div", { class: "ax-panel" }, rows),
      el("span", { class: "ax-demo-tag", text: "押注即累積 · 子級+大階雙層獎金 · Demo" })
    ]);
  }
  HL.vip = { addWager: addWager, status: vstatus, open: vipOpen };

  /* ===================== Rakeback 返水（綁 VIP 等級係數 · 每日桶 · 逾期作廢 #22） ===================== */
  var KEY_R = "HL_RAKEBACK";
  var RB_RATES = [0.005, 0.008, 0.011, 0.014, 0.018]; // 青銅/白銀/黃金/白金/鑽石：0.5%→1.8%
  // 每日返水桶：當日累積的返水須當日領取，跨日未領即作廢（對標 rollbit 快領 / roobet 日桶）。
  function rbState() {
    var o = ls(KEY_R, { pot: 0, lifetime: 0, day: dayNum() });
    if (o.day == null) { o.day = dayNum(); save(KEY_R, o); }                       // 舊資料遷移：既有 pot 併為今日桶，不作廢
    else if (o.day !== dayNum()) { o.day = dayNum(); o.pot = 0; save(KEY_R, o); }  // 跨日：未領桶逾期作廢
    return o;
  }
  function rbRate() { var i = HL.vip ? HL.vip.status().index : 0; return RB_RATES[Math.min(i, RB_RATES.length - 1)]; }
  function rbPot() { return rbState().pot || 0; }
  function rbMsToReset() { return (dayNum() + 1) * 86400000 - Date.now(); } // 距今日桶作廢（跨日）的剩餘毫秒
  // 每筆下注即時累積返水至今日桶（由 HL.liveStats.record 中央點呼叫）
  function rbAccrue(bet) {
    bet = Math.round(bet || 0); if (bet <= 0) return 0;
    var rb = bet * rbRate(), o = rbState();
    o.pot = (o.pot || 0) + rb; o.lifetime = (o.lifetime || 0) + rb; save(KEY_R, o);
    return rb;
  }
  function rbClaim() {
    var amt = Math.floor(rbPot()); if (amt <= 0) return 0; // 領取取整數，餘數留在今日桶
    var o = rbState(); o.pot = (o.pot || 0) - amt; save(KEY_R, o);
    HL.state.set({ balance: HL.state.get().balance + amt });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return amt;
  }
  function rbFmtLeft(ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h + " 小時 " + m + " 分"; }
  function rakebackOpen() {
    var s = HL.vip ? HL.vip.status() : { icon: "🥉", name: "青銅", index: 0 };
    var pot = rbPot(), claimable = Math.floor(pot);
    var rateRows = RANKS.map(function (r, i) {
      return el("div", { class: "ax-kv" + (i === s.index ? " ax-vip__cur" : "") }, [
        el("span", { text: r.icon + " " + r.name + (i === s.index ? "（目前）" : "") }),
        el("b", { class: "ax-muted", text: (RB_RATES[i] * 100).toFixed(1) + "% 返水" })
      ]);
    });
    var m = HL.ui.modal("💧 Rakeback 返水", [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "目前返水率" }), el("b", { class: "ax-gold", text: (rbRate() * 100).toFixed(1) + "%（" + s.icon + " " + s.name + "）" })]),
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "今日可領返水" }), el("b", { class: "ax-gold", text: money(claimable) })]),
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "本桶逾期作廢，剩餘" }), el("b", { text: rbFmtLeft(rbMsToReset()) })]),
        el("small", { class: "ax-muted", text: "每筆下注即時回饋一定比例（含跟注），等級越高返水越多。返水進「每日桶」，當日未領跨日即作廢，記得每天回來領。" })
      ]),
      el("button", { class: "ax-btn-primary", text: claimable > 0 ? ("領取 " + money(claimable) + " 到主餘額") : "尚無可領取返水", disabled: claimable > 0 ? null : "disabled", onClick: function () {
        var got = rbClaim(); if (got > 0) { HL.ui.toast("已領取返水 " + money(got) + " 到主餘額", "ok"); m.close(); rakebackOpen(); }
      } }),
      el("div", { class: "ax-panel" }, rateRows),
      el("span", { class: "ax-demo-tag", text: "綁 VIP 等級係數 · 每日桶逾期作廢 · Demo" })
    ]);
  }
  HL.rakeback = { accrue: rbAccrue, pot: rbPot, rate: rbRate, claim: rbClaim, msToReset: rbMsToReset, open: rakebackOpen };

  /* ===================== 每日任務 / 成就 ===================== */
  var KEY_T = "HL_TASKS";
  var DAILY = [
    { id: "play10", name: "今日下注 10 次", goal: 10, reward: 200, ev: "bet" },
    { id: "win5", name: "今日贏 5 次", goal: 5, reward: 300, ev: "win" },
    { id: "wager2k", name: "今日累積押注 NT$2,000", goal: 2000, reward: 400, ev: "wager" },
    { id: "checkin", name: "完成每日簽到", goal: 1, reward: 100, ev: "checkin" }
  ];
  function tload() {
    var o = ls(KEY_T, null);
    if (!o || o.day !== dayNum()) { o = { day: dayNum(), prog: {}, claimed: {} }; save(KEY_T, o); }
    return o;
  }
  function bump(ev, amount) {
    amount = amount || 0; if (amount <= 0) return;
    var o = tload(), changed = false;
    DAILY.forEach(function (t) { if (t.ev === ev) { var cur = Math.min(t.goal, (o.prog[t.id] || 0) + amount); if (cur !== (o.prog[t.id] || 0)) { o.prog[t.id] = cur; changed = true; } } });
    if (changed) save(KEY_T, o);
  }
  function tlist() { var o = tload(); return DAILY.map(function (t) { var cur = o.prog[t.id] || 0; return { id: t.id, name: t.name, goal: t.goal, reward: t.reward, cur: cur, done: cur >= t.goal, claimed: !!o.claimed[t.id] }; }); }
  function tclaim(id) {
    var o = tload(), t = null; DAILY.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return 0; var cur = o.prog[id] || 0;
    if (cur < t.goal || o.claimed[id]) return 0;
    o.claimed[id] = true; save(KEY_T, o); badd(t.reward); return t.reward;
  }
  function tasksOpen() {
    var list = tlist();
    var rows = list.map(function (t) {
      var btn = el("button", {
        class: t.claimed ? "ax-btn-ghost" : "ax-btn-primary", text: t.claimed ? "已領取 ✓" : (t.done ? "領取 +" + money(t.reward) : (t.id === "checkin" ? "去簽到" : t.cur + "/" + t.goal)),
        disabled: (t.claimed || (!t.done && t.id !== "checkin")) ? "disabled" : null,
        onClick: function () {
          if (t.id === "checkin" && !t.done) { closeTop(); if (HL.rewards) HL.rewards.open(); return; }
          var got = tclaim(t.id); if (got > 0) { HL.ui.toast("任務獎勵 +" + money(got) + " 入獎金錢包", "ok"); closeTop(); tasksOpen(); }
        }
      });
      return el("div", { class: "ax-task" }, [
        el("div", { class: "ax-task__main" }, [
          el("div", { class: "ax-task__name", text: (t.done ? "✓ " : "") + t.name }),
          bar(t.goal ? (t.cur / t.goal) * 100 : 0)
        ]),
        btn
      ]);
    });
    function closeTop() { var ms = document.querySelectorAll(".ax-modal-mask"); if (ms.length) ms[ms.length - 1].remove(); }
    HL.ui.modal("📋 每日任務", [
      el("div", { class: "ax-tasks" }, rows),
      el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "獎金錢包" }), el("b", { class: "ax-gold", text: money(HL.bonus.balance()) })]),
      el("button", { class: "ax-btn-ghost", text: "前往領取中心 →", onClick: function () { closeTop(); HL.bonus.open(); } }),
      el("span", { class: "ax-demo-tag", text: "每日 0 點重置 · 獎勵入獎金錢包 · Demo" })
    ]);
  }
  HL.tasks = { bump: bump, list: tlist, claim: tclaim, open: tasksOpen };
})(window);

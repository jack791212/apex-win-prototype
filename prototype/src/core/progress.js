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
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;  // T20：收斂至共用 localStorage 持久化出口
  var dayNum = HL.dom.dayNum;  // T12：收斂至共用 epoch-bucket
  function bar(pct) { return HL.ui.progress(pct); }  // 薄轉接 → HL.ui.progress（T6，clamp 入 primitive）

  /* ===================== 獎金錢包 / 領取中心（#20 紅利/流水引擎） =====================
   * 分離記帳：unlocked（達標可領）vs entries（待解鎖紅利 ledger，逐筆 {amt, req, prog}）。
   * 新紅利預設附流水要求（req = amt × WAGER_MULT），有效押注經中央掛鉤 onWager(bet) 以 FIFO
   * 推進頭筆進度、達標自動轉入 unlocked（🔓 通知）；未達標不可領。wagerFree 選項供「零流水」
   * 來源（#33 cashback）直入 unlocked。舊資料 {bonus:N} 優雅遷移為 unlocked（不鎖既有可領）。
   * API 相容：balance()/add()/claim()/open() 簽名不變（12+ 來源零改裝）。 */
  var KEY_B = "HL_BONUS";
  var WAGER_MULT = 1;    // 每 1 元紅利需 1 元有效流水解鎖（demo 友善；正式營運可調）
  var MAX_ENTRIES = 20;  // ledger 上限：超過併入尾筆（高頻小額來源如紅包雨防爆量）
  function bstate() {
    var o = ls(KEY_B, null);
    if (!o) { o = { unlocked: 0, entries: [] }; save(KEY_B, o); return o; }
    if (o.entries == null) { // 舊資料遷移：既有 pot 全數視為已解鎖，不誤鎖使用者既得
      // 防毀損：同時保留 unlocked 欄位（異常態 {unlocked:N, entries:null} 不得歸零＝金額不可銷毀）
      o = { unlocked: Math.max(0, Math.round((o.unlocked != null ? o.unlocked : o.bonus) || 0)), entries: [] };
      save(KEY_B, o);
    }
    return o;
  }
  function bbal() { return bstate().unlocked || 0; }
  function blocked() { var o = bstate(), s = 0; for (var i = 0; i < o.entries.length; i++) s += o.entries[i].amt; return s; }
  function badd(n, opts) {
    n = Math.round(n || 0); if (n <= 0) return;
    var o = bstate();
    if (opts && opts.wagerFree) { o.unlocked = (o.unlocked || 0) + n; }
    else if (o.entries.length >= MAX_ENTRIES) { var tl = o.entries[o.entries.length - 1]; tl.amt += n; tl.req += n * WAGER_MULT; }
    else o.entries.push({ amt: n, req: n * WAGER_MULT, prog: 0 });
    save(KEY_B, o);
    // 營運帳本：紅利在「授予當下」即為送幣成本（非領取端，避免與 bclaim 重複計）；source 供成本明細分類
    if (HL.ledger) HL.ledger.record("bonus", n, { source: (opts && opts.source) || "其他紅利" });
  }
  // 中央掛鉤：有效押注累進流水（FIFO 推頭筆；單注可連鎖解多筆）
  function bOnWager(bet) {
    bet = Math.round(bet || 0); if (bet <= 0) return 0;
    var o = bstate(); if (!o.entries.length) return 0;
    var w = bet, freed = 0;
    while (w > 0 && o.entries.length) {
      var e = o.entries[0], need = e.req - e.prog;
      if (w >= need) { w -= need; freed += e.amt; o.entries.shift(); }
      else { e.prog += w; w = 0; }
    }
    if (freed > 0) {
      o.unlocked = (o.unlocked || 0) + freed;
      if (HL.notify) HL.notify.add({ ic: "🔓", title: "紅利解鎖", text: "流水達標，" + money(freed) + " 紅利已轉為可領取。" });
      if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    }
    save(KEY_B, o);
    return freed;
  }
  function bclaim() {
    var o = bstate(); var amt = o.unlocked || 0; if (amt <= 0) return 0;
    o.unlocked = 0; save(KEY_B, o);
    HL.state.set({ balance: HL.state.get().balance + amt });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return amt;
  }
  // 提款/轉出閘控：有待解鎖紅利時回報鎖定額（demo 轉贈與未來真金提款共用）
  function bCanWithdraw() { var lk = blocked(); return { ok: lk <= 0, locked: lk }; }
  function bStatus() {
    var o = bstate();
    var head = o.entries[0] || null;
    return {
      unlocked: o.unlocked || 0, locked: blocked(), count: o.entries.length,
      head: head ? { amt: head.amt, req: head.req, prog: head.prog, pct: head.req > 0 ? (head.prog / head.req) * 100 : 100 } : null
    };
  }
  function bonusOpen() {
    var st = bStatus();
    var lockedPanel = null;
    if (st.locked > 0 && st.head) {
      var rest = st.count - 1, restAmt = st.locked - st.head.amt;
      lockedPanel = el("div", { class: "ax-panel" }, [
        HL.ui.kv("🔒 待解鎖紅利", money(st.locked)),
        el("div", { class: "ax-kv" }, [
          el("span", { class: "ax-muted", text: "當前解鎖進度" }),
          el("b", {}, [document.createTextNode(money(st.head.prog) + " / " + money(st.head.req))])
        ]),
        bar(st.head.pct),
        rest > 0 ? el("small", { class: "ax-muted" }, [
          el("span", { text: "其餘排隊中" }), document.createTextNode("：" + rest + " 筆 · " + money(restAmt))
        ]) : null,
        el("small", { class: "ax-muted", text: "有效押注會自動累進流水，達標的紅利自動解鎖為可領取。" })
      ]);
    }
    var m = HL.ui.modal("🎁 領取中心 · 獎金錢包", [
      el("div", { class: "ax-panel" }, [
        HL.ui.kv("可領取獎金", money(st.unlocked), { valCls: "ax-gold" }),
        el("small", { class: "ax-muted", text: "活動獎金先入「待解鎖」，以有效押注累進流水；達標自動轉為可領取，領取後入主餘額。" })
      ]),
      lockedPanel,
      el("button", { class: "ax-btn-primary", disabled: st.unlocked > 0 ? null : "disabled", onClick: function () {
        var got = bclaim(); if (got > 0) { HL.ui.toast("已領取 " + money(got) + " 到主餘額", "ok"); m.close(); bonusOpen(); }
      } }, st.unlocked > 0
        ? [el("span", { text: "領取" }), document.createTextNode(" " + money(st.unlocked) + " "), el("span", { text: "到主餘額" })]
        : [el("span", { text: "目前沒有可領取獎金" })]),
      el("button", { class: "ax-btn-ghost", text: "去完成每日任務 →", onClick: function () { m.close(); tasksOpen(); } }),
      el("span", { class: "ax-demo-tag", text: "分離記帳 · 流水達標解鎖 · Demo" })
    ]);
  }
  HL.bonus = { balance: bbal, add: badd, claim: bclaim, open: bonusOpen, onWager: bOnWager, locked: blocked, canWithdraw: bCanWithdraw, status: bStatus };

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
      for (var i = before + 1; i <= after; i++) if (RANKS[i].reward) badd(RANKS[i].reward, { source: "VIP 升級金" });
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
      badd(levelGain, { source: "VIP 子級金" });
      HL.ui.toast("⭐ VIP 子等級提升！獎金 " + money(levelGain) + " 已入獎金錢包", "ok");
      if (HL.notify) HL.notify.add({ ic: "⭐", title: "VIP 子等級提升", text: "等級推進獎金 " + money(levelGain) + " 已入獎金錢包。" });
    }
    // 每次押注都刷新 chrome（header 微等級迷你條要能連續推進，不只在升級瞬間跳動）
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }
  // S11 福利矩陣：一眼看各級「返水率（隨等級放大）＋ 升級獎金（解鎖）」，highlight 目前 + 標記下一級
  function benefitMatrix(curIdx) {
    var head = el("div", { class: "ax-vipmx__row ax-vipmx__head" }, [
      el("span", { text: "等級" }), el("span", { text: "累積押注" }), el("span", { text: "返水" }), el("span", { text: "升級獎金" })
    ]);
    var rows = RANKS.map(function (r, i) {
      var stateCls = i === curIdx ? " is-cur" : (i === curIdx + 1 ? " is-next" : (i < curIdx ? " is-done" : ""));
      var tag = i === curIdx ? el("span", { class: "ax-vipmx__tag", text: "目前" })
              : (i === curIdx + 1 ? el("span", { class: "ax-vipmx__tag ax-vipmx__tag--next", text: "下一級" }) : null);
      return el("div", { class: "ax-vipmx__row" + stateCls }, [
        el("span", { class: "ax-vipmx__lv" }, [el("span", { text: r.icon + " " + r.name }), tag]),
        el("span", { text: r.min ? money(r.min) : "—" }),
        el("span", { class: i <= curIdx ? "ax-gold" : "", text: (RB_RATES[i] * 100).toFixed(1) + "%" }),
        el("span", { text: r.reward ? money(r.reward) : "—" })
      ]);
    });
    return el("div", { class: "ax-vipmx" }, [head].concat(rows));
  }
  function vipOpen() {
    var s = vstatus();
    var m = HL.ui.modal("💎 VIP 俱樂部", [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [el("span", { text: "目前等級" }), el("b", { class: "ax-gold", text: s.icon + " " + s.name })]),
        HL.ui.kv("累積有效押注", money(s.wager)),
        bar(s.pct),
        el("small", { class: "ax-muted", text: s.next ? ("再押注 " + money(s.toNext) + " 升級到 " + s.next.icon + " " + s.next.name) : "已達最高等級 💎" }),
        s.next ? HL.ui.kv("⭐ 子等級", "Lv " + (s.sub + 1) + " / " + s.subs) : null,
        s.next ? el("small", { class: "ax-muted" }, [
          el("span", { text: "距下一級" }), document.createTextNode(" " + money(s.toNextSub) + " · "),
          el("span", { text: "每級獎金" }), document.createTextNode(" " + money(s.levelReward))
        ]) : null
      ]),
      el("div", { class: "ax-panel" }, [
        HL.ui.kv("💧 返水率（本級）", (HL.rakeback ? (HL.rakeback.rate() * 100).toFixed(1) : "0") + "%" + ((HL.happyhour && HL.happyhour.mult && HL.happyhour.mult() > 1) ? " ⚡×2" : ""), { valCls: "ax-gold" }),
        HL.ui.kv("可領取返水", money(HL.rakeback ? Math.floor(HL.rakeback.pot()) : 0), { valCls: "ax-gold" }),
        el("button", { class: "ax-btn-ghost", text: "前往 Rakeback 返水 →", onClick: function () { m.close(); if (HL.rakeback) HL.rakeback.open(); } }),
        el("button", { class: "ax-btn-ghost", text: "🔄 領週期紅利（每日/週/月）→", onClick: function () { m.close(); if (HL.reload) HL.reload.open(); } })
      ]),
      el("div", { class: "ax-panel" }, [
        el("small", { class: "ax-muted ax-vipmx__cap", text: "各級福利一覽（返水率隨等級放大、升級發獎金）" }),
        benefitMatrix(s.index)
      ]),
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
    var boost = (HL.happyhour && HL.happyhour.mult) ? HL.happyhour.mult() : 1; // #35 Happy Hour：窗內返水 ×2
    var rb = bet * rbRate() * boost, o = rbState();
    o.pot = (o.pot || 0) + rb; o.lifetime = (o.lifetime || 0) + rb; save(KEY_R, o);
    return rb;
  }
  function rbClaim() {
    var amt = Math.floor(rbPot()); if (amt <= 0) return 0; // 領取取整數，餘數留在今日桶
    var o = rbState(); o.pot = (o.pot || 0) - amt; save(KEY_R, o);
    HL.state.set({ balance: HL.state.get().balance + amt });
    if (HL.ledger) HL.ledger.record("bonus", amt, { source: "返水 Rakeback" }); // 營運帳本：返水領取＝送幣成本
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
        HL.ui.kv("目前返水率", (rbRate() * 100).toFixed(1) + "%（" + s.icon + " " + s.name + "）" + ((HL.happyhour && HL.happyhour.mult && HL.happyhour.mult() > 1) ? " ⚡×2" : ""), { valCls: "ax-gold" }),
        HL.ui.kv("今日可領返水", money(claimable), { valCls: "ax-gold" }),
        HL.ui.kv("本桶逾期作廢，剩餘", rbFmtLeft(rbMsToReset())),
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
    o.claimed[id] = true; save(KEY_T, o); badd(t.reward, { source: "每日任務" }); return t.reward;
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
    function closeTop() { HL.ui.closeTop(); }
    HL.ui.modal("📋 每日任務", [
      el("div", { class: "ax-tasks" }, rows),
      HL.ui.kv("獎金錢包", money(HL.bonus.balance()), { valCls: "ax-gold" }),
      el("button", { class: "ax-btn-ghost", text: "前往領取中心 →", onClick: function () { closeTop(); HL.bonus.open(); } }),
      el("span", { class: "ax-demo-tag", text: "每日 0 點重置 · 獎勵入獎金錢包 · Demo" })
    ]);
  }
  HL.tasks = { bump: bump, list: tlist, claim: tclaim, open: tasksOpen };
})(window);

/*
 * Apex Win｜累積彩金 Jackpot（純前端 · 真實遞增 + 命中演出）
 * 三級漸進式彩池（MEGA / MAJOR / MINI）：
 *  - 即時遞增：每秒 ambient 成長（setInterval，跨頁持續）+ 每筆下注貢獻一定比例。
 *  - 命中：每筆下注各級依機率觸發；命中即把當前池額真派到 HL.money、重置該池、播中獎演出。
 * 資料源掛鉤：HL.liveStats.record(game,bet,win) 的 bet>0 尾端呼叫 HL.jackpot.onBet(bet)（全遊戲+跟注通吃）。
 * 註冊於 window.HL.jackpot。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;  // T20：收斂至共用 localStorage 持久化出口
  var rint = HL.dom.rint;                          // T21：收斂至 HL.dom.rint（原逐字相同）

  // 各級：seed 起跳、growMin/Max 每秒成長、contrib 每筆下注貢獻比例、hitChance 每筆下注命中機率
  var TIERS = [
    { key: "mega", name: "MEGA", icon: "💎", seed: 8000000, growMin: 200, growMax: 900, contrib: 0.005, hitChance: 1 / 80000, sub: "全平台最高彩池" },
    { key: "major", name: "MAJOR", icon: "🔥", seed: 80000, growMin: 40, growMax: 180, contrib: 0.003, hitChance: 1 / 3000, sub: "中級彩池" },
    { key: "mini", name: "MINI", icon: "✨", seed: 3000, growMin: 8, growMax: 40, contrib: 0.002, hitChance: 1 / 120, sub: "最常開出" }
  ];
  function tierOf(key) { for (var i = 0; i < TIERS.length; i++) if (TIERS[i].key === key) return TIERS[i]; return null; }

  var KEY_J = "HL_JACKPOT";
  function load() {
    var o = ls(KEY_J, null);
    if (!o || !o.pools) {
      o = { pools: {}, winners: [] };
      var live = HL.site && HL.site.isLive();
      TIERS.forEach(function (t) { o.pools[t.key] = t.seed + (live ? 0 : Math.floor(Math.random() * t.seed * 0.4)); }); // 真站：無假堆疊，池只從真實下注貢獻成長
      save(KEY_J, o);
    }
    return o;
  }
  function pool(key) { var o = load(); return Math.round(o.pools[key] || (tierOf(key) || {}).seed || 0); }

  function setBal(v) {
    if (HL.instant) { HL.instant.setBal(v); return; }
    HL.state.set({ balance: Math.max(0, Math.round(v)) });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }
  function bal() { return HL.instant ? HL.instant.bal() : HL.state.get().balance; }

  // 每秒 ambient 遞增（跨頁持續，不用 HL.ticker 以免換頁被 clearAll）
  function grow() {
    if (HL.site && HL.site.isLive()) return; // 真站：關掉「每秒自漲」假成長，池只從真實下注貢獻長
    var o = load();
    TIERS.forEach(function (t) { o.pools[t.key] = (o.pools[t.key] || t.seed) + rint(t.growMin, t.growMax); });
    save(KEY_J, o);
  }
  setInterval(grow, 1000);

  // 每筆下注：貢獻彩池 + 嘗試命中（一次最多中一級，由大到小判定）
  function onBet(betAmt) {
    betAmt = Math.round(betAmt || 0); if (betAmt <= 0) return;
    var o = load(), seedAdd = 0;
    TIERS.forEach(function (t) { var c = Math.max(1, Math.round(betAmt * t.contrib)); o.pools[t.key] = (o.pools[t.key] || t.seed) + c; seedAdd += c; });
    save(KEY_J, o);
    if (HL.ledger && seedAdd > 0) HL.ledger.record("jp_seed", seedAdd, {}); // 營運帳本：JP 真實提撥（來自下注）
    for (var i = 0; i < TIERS.length; i++) { if (Math.random() < TIERS[i].hitChance) { hit(TIERS[i].key); break; } }
  }

  function hit(key) {
    var t = tierOf(key); if (!t) return 0;
    var o = load(), amount = Math.round(o.pools[key] || t.seed);
    setBal(bal() + amount);                                  // 真派彩到主餘額
    if (HL.ledger) HL.ledger.record("jp_hit", amount, {}); // 營運帳本：JP 命中（派彩本身另經 liveStats 計入 win/GGR，此處僅供 JP 收支明細）
    if (HL.liveStats) HL.liveStats.record("彩金·" + t.name, 0, amount); // 入實時統計（bet=0，純贏分）
    o.winners.unshift({ name: "你", tier: t.name, amount: amount });
    if (o.winners.length > 20) o.winners = o.winners.slice(0, 20);
    o.pools[key] = t.seed;                                   // 重置該池
    save(KEY_J, o);
    HL.ui.toast(t.icon + " 中得 " + t.name + " 累積彩金 " + money(amount) + "！", "ok");
    if (HL.notify) HL.notify.add({ ic: t.icon, title: t.name + " 累積彩金中獎！", text: "恭喜中得累積彩金 " + money(amount) + "，已派入主餘額。" });
    celebrate(t, amount, false);
    return amount;
  }
  function forceHit(key) { return hit(key || "mini"); } // 供 Demo/測試觸發

  /* ---------- 中獎演出（命中即播；金額已先入餘額，本層純演出） ---------- */
  function celebrate(t, amount, preview) {
    var ex = document.querySelector(".ax-jpwin"); if (ex) ex.remove();
    var confetti = el("div", { class: "ax-jpwin__confetti" });
    var COLORS = ["#ffd34d", "#ff5d6c", "#36a6ff", "#22c55e", "#a855f7"];
    for (var i = 0; i < 26; i++) {
      var p = el("i");
      p.style.left = (Math.random() * 100) + "%";
      p.style.background = COLORS[i % COLORS.length];
      p.style.animationDelay = (Math.random() * 0.7).toFixed(2) + "s";
      p.style.animationDuration = (1.8 + Math.random() * 1.2).toFixed(2) + "s";
      confetti.appendChild(p);
    }
    var amtEl = el("div", { class: "ax-jpwin__amt", text: money(0) });
    var overlay = el("div", { class: "ax-jpwin" }, [confetti, el("div", { class: "ax-jpwin__card ax-jp__card--" + t.key }, [
      el("div", { class: "ax-jpwin__tier", text: t.icon + " " + t.name + " JACKPOT" }),
      el("div", { class: "ax-jpwin__cong", text: preview ? "🎬 中獎演出預覽" : "🎉 恭喜中得累積彩金！" }),
      amtEl,
      el("button", { class: "ax-btn-primary", text: preview ? "關閉預覽" : "太棒了，收下！", onClick: function () { overlay.remove(); } })
    ])]);
    document.body.appendChild(overlay);
    if (HL.instant && HL.instant.animate) HL.instant.animate(0, amount, 1400, function (v) { amtEl.textContent = money(Math.round(v)); });
    else amtEl.textContent = money(amount);
    setTimeout(function () { if (overlay.isConnected) overlay.remove(); }, 9000); // 單一 setTimeout 後備自動關，防卡浮層
  }

  /* ---------- 彩金橫幅（掛在娛樂城頁；數字即時跳動） ---------- */
  function banner() {
    var cells = [];
    var row = el("div", { class: "ax-jp__row" }, TIERS.map(function (t) {
      var amtEl = el("div", { class: "ax-jp__amt", text: money(pool(t.key)) });
      cells.push({ key: t.key, el: amtEl });
      return HL.dom.pressable(el("div", { class: "ax-jp__card ax-jp__card--" + t.key, onClick: open }, [
        el("div", { class: "ax-jp__tier" }, [el("span", { class: "ax-jp__ic", text: t.icon }), el("b", { text: t.name })]),
        amtEl,
        el("small", { class: "ax-jp__sub", text: t.sub })
      ]));
    }));
    var wrap = el("div", { class: "ax-jp" }, [
      el("div", { class: "ax-jp__head" }, [
        el("span", { class: "ax-jp__title", text: "🎰 累積彩金 JACKPOT" }),
        el("span", { class: "ax-jp__live", text: "● 即時累積中" }),
        el("button", { class: "ax-jp__info", text: "ℹ 規則 / 中獎", onClick: function (e) { e.stopPropagation(); open(); } })
      ]),
      row
    ]);
    var tick = HL.ticker.add(function () {
      if (!wrap.isConnected) { HL.ticker.remove(tick); return; }
      cells.forEach(function (c) { c.el.textContent = money(pool(c.key)); }); // 每秒貼齊目前池額 → 看得到遞增
    });
    return wrap;
  }

  function open() {
    var o = load();
    var tierRows = TIERS.map(function (t) {
      return el("div", { class: "ax-kv" }, [el("span", { text: t.icon + " " + t.name + "　" + t.sub }), el("b", { class: "ax-gold", text: money(pool(t.key)) })]);
    });
    var winRows = (o.winners || []).slice(0, 8).map(function (w) {
      return el("div", { class: "ax-row" }, [el("span", { class: "av", text: "🏆" }), el("span", { class: "nm", text: w.name }), el("span", { class: "ax-muted", text: w.tier }), el("b", { class: "ax-gold", text: money(w.amount) })]);
    });
    if (!winRows.length) winRows = [el("p", { class: "ax-muted", text: "還沒有人中獎，會是你嗎？每筆下注都有機會！" })];
    HL.ui.modal("🎰 累積彩金 Jackpot", [
      el("div", { class: "ax-panel" }, tierRows),
      el("p", { class: "ax-muted", text: "每筆下注（含跟注）都會推高彩池，並有機會即時觸發中獎；級別越高、越難中、獎越大。" }),
      HL.ui.sectionTitle("近期中獎"),
      el("div", { class: "ax-panel" }, winRows),
      el("button", { class: "ax-btn-ghost", text: "🎬 預覽中獎演出（Demo）", onClick: function () { celebrate(TIERS[2], pool("mini"), true); } }),
      el("span", { class: "ax-demo-tag", text: "純前端累積 · 命中即時派彩 · Demo" })
    ]);
  }

  HL.jackpot = { onBet: onBet, pool: pool, banner: banner, open: open, forceHit: forceHit, tiers: TIERS };
})(window);

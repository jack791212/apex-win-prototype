/*
 * Apex Win｜季票 / Battle-Pass 外殼 HL.season（雙軌加速 · config 驅動 · 擴充性優先）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 2026 頂級 casino 第 7 度共識的「live-service / 季票化」留存主題（gamified 6 月留存 >75%
 *   vs 非 gamified ~50%；radar 連番點名 ApexWin 有連登/VIP 但缺雙軌 pass 加速器）。
 *
 * 核心哲學＝容器先於內容：一份「賽季設定」(SEASON) 就是一張可換的 config 排程——換季＝換一份
 *   SEASON（state.sid 不符即自動重置進度）；階梯 tiers 為純資料陣列，未來只要改資料就能加階/換獎，
 *   不動這支引擎。疊在既有骨架上不重造輪子：
 *     · 賽季經驗(season XP) 由中央結算點 liveStats.record 的有效押注累積（比照 VIP addWager）。
 *     · 進階軌(premium)「解鎖」＝花費 HL.achievements 的「成就點數」（成就牆本就是為此鋪的 XP 底座）。
 *     · 階梯獎勵一律入獎金錢包 HL.bonus（帶 source 自動進營運帳本 ledger → GGR/NGR）。
 *
 * 雙軌：free（人人可領）／prem（進階軌，需先以成就點數解鎖，解鎖後可回溯領已達階級）。
 * 資料流：liveStats.record(game,bet,win) → HL.season.record(bet) 累積 XP、跨階即時通知；
 *   玩家於季票面板逐階或一鍵領取。進度走站別命名空間（demo/live 平行宇宙隔離，比照 VIP/成就）。
 * status()/record()/claim()/claimAll()/unlockPrem()/setSeason()/open()。註冊於 window.HL.season。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet, dayNum = HL.dom.dayNum;
  var KEY = "HL_SEASON";

  var XP_PER_WAGER = 1;     // 每 NT$1 有效押注累積 1 賽季經驗
  var XP_PER_TIER = 1500;   // 每階所需經驗

  // ---- 階梯生成（純資料；milestone 每 10 階與最終階加碼）----
  function buildTiers(n) {
    var t = [];
    for (var i = 0; i < n; i++) {
      var lvl = i + 1, milestone = (lvl % 10 === 0), last = (i === n - 1);
      var freeCash = last ? 2500 : (milestone ? 600 + lvl * 60 : 150 + lvl * 30);
      var premCash = last ? 30000 : (milestone ? 2000 + lvl * 160 : 400 + lvl * 80);
      t.push({
        free: { ic: milestone ? "🎁" : "💰", bonus: freeCash },
        prem: { ic: last ? "👑" : (milestone ? "💎" : "🪙"), bonus: premCash }
      });
    }
    return t;
  }

  // ---- 賽季設定（可換的 config 排程）----
  var SEASON = {
    id: "S1-shadow",
    name: "暗影賽季 · 第一季",
    icon: "🎟️",
    days: 45,             // 賽季天數（daysLeft 依 startDay 起算；到期仍可領已達階級）
    unlockCost: 60,       // 進階軌解鎖所需「成就點數」
    tiers: buildTiers(30)
  };
  function setSeason(cfg) { if (cfg && cfg.id && cfg.tiers) SEASON = cfg; return HL.season; } // 換季/白標出口

  // ---- 玩家進度（站別命名空間；sid 不符＝新賽季自動重置）----
  function raw() {
    var s = ls(KEY, {});
    if (s.sid !== SEASON.id) { s = { sid: SEASON.id, xp: 0, prem: false, startDay: dayNum(), cf: {}, cp: {}, spent: 0 }; save(KEY, s); }
    if (s.startDay == null) { s.startDay = dayNum(); save(KEY, s); }
    s.cf = s.cf || {}; s.cp = s.cp || {};
    return s;
  }
  function reachedCount(s) { return Math.min(SEASON.tiers.length, Math.floor((s.xp || 0) / XP_PER_TIER)); }
  function availPts() {
    var pts = (HL.achievements && HL.achievements.status) ? HL.achievements.status().pts : 0;
    return Math.max(0, pts - (raw().spent || 0));
  }

  // ---- 中央掛鉤：有效押注累積賽季經驗 + 跨階即時通知 ----
  function record(bet) {
    bet = bet || 0; if (bet <= 0) return;
    var s = raw();
    var before = Math.min(SEASON.tiers.length, Math.floor((s.xp || 0) / XP_PER_TIER));
    s.xp = (s.xp || 0) + Math.floor(bet * XP_PER_WAGER); save(KEY, s);
    var after = Math.min(SEASON.tiers.length, Math.floor(s.xp / XP_PER_TIER));
    if (after > before) {
      var canGet = claimableList().length;
      if (HL.ui) HL.ui.toast("🎟️ 季票升級：Tier " + after + (canGet ? "　有 " + canGet + " 項可領取" : ""), "ok");
      if (HL.notify) HL.notify.add({ ic: "🎟️", title: "季票前進到 Tier " + after, text: SEASON.name + "：抵達 Tier " + after + (canGet ? "，有 " + canGet + " 項獎勵可於季票領取。" : "。") });
      if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    }
  }

  // ---- 領取 ----
  function claim(track, i) {
    var s = raw(), reached = reachedCount(s), tier = SEASON.tiers[i];
    if (!tier || i < 0 || i >= reached) return false;         // 尚未抵達該階
    if (track === "prem") {
      if (!s.prem || s.cp[i]) return false;                    // 未解鎖進階 / 已領
      s.cp[i] = dayNum(); save(KEY, s);
      if (HL.bonus) HL.bonus.add(tier.prem.bonus, { source: "季票·進階軌" });
    } else {
      if (s.cf[i]) return false;                               // 已領
      s.cf[i] = dayNum(); save(KEY, s);
      if (HL.bonus) HL.bonus.add(tier.free.bonus, { source: "季票·免費軌" });
    }
    return true;
  }
  function claimableList() {
    var s = raw(), reached = reachedCount(s), out = [];
    for (var i = 0; i < reached; i++) {
      if (!s.cf[i]) out.push(["free", i]);
      if (s.prem && !s.cp[i]) out.push(["prem", i]);
    }
    return out;
  }
  function claimAll() {
    var list = claimableList(), n = 0, total = 0;
    list.forEach(function (x) { var rw = SEASON.tiers[x[1]][x[0]]; if (claim(x[0], x[1])) { n++; total += rw.bonus; } });
    return { count: n, total: total };
  }

  // ---- 解鎖進階軌（花費成就點數；解鎖後回溯領已達階級）----
  function unlockPrem() {
    var s = raw();
    if (s.prem) return { ok: true, already: true };
    var have = availPts();
    if (have < SEASON.unlockCost) return { ok: false, need: SEASON.unlockCost, have: have };
    s.prem = true; s.spent = (s.spent || 0) + SEASON.unlockCost; save(KEY, s);
    if (HL.ui) HL.ui.toast("💎 進階軌已解鎖！已達階級的進階獎勵現可回溯領取", "ok");
    if (HL.notify) HL.notify.add({ ic: "💎", title: "季票進階軌已解鎖", text: SEASON.name + "：花費 " + SEASON.unlockCost + " 成就點數，進階獎勵全數開放。" });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return { ok: true };
  }

  // ---- 對外狀態 ----
  function status() {
    var s = raw(), reached = reachedCount(s);
    var into = (s.xp || 0) - reached * XP_PER_TIER;
    var maxed = reached >= SEASON.tiers.length;
    var elapsed = dayNum() - (s.startDay || dayNum());
    var daysLeft = Math.max(0, SEASON.days - elapsed);
    return {
      name: SEASON.name, icon: SEASON.icon, tier: reached, total: SEASON.tiers.length,
      xp: s.xp || 0, into: maxed ? XP_PER_TIER : into, xpPerTier: XP_PER_TIER,
      toNext: maxed ? 0 : XP_PER_TIER - into, tierPct: maxed ? 100 : (into / XP_PER_TIER) * 100,
      prem: !!s.prem, daysLeft: daysLeft, ended: daysLeft <= 0, maxed: maxed,
      unlockCost: SEASON.unlockCost, availPts: availPts(), claimable: claimableList().length
    };
  }

  // ---- 季票面板（資料驅動階梯 · 雙軌）----
  function reopen() { HL.ui.closeTop(); open(); }
  function rewardChip(track, i, st) {
    var s = raw(), tier = SEASON.tiers[i], rw = tier[track];
    var claimed = track === "prem" ? !!s.cp[i] : !!s.cf[i];
    var reachedThis = i < st.tier;
    var cls = "ax-spass__chip ax-spass__chip--" + track;
    var stateTxt, clickable = false;
    if (claimed) { cls += " is-claimed"; stateTxt = "✓ 已領"; }
    else if (track === "prem" && !st.prem) { cls += " is-plocked"; stateTxt = "🔒 需進階"; }
    else if (reachedThis) { cls += " is-claimable"; stateTxt = "領取"; clickable = true; }
    else { cls += " is-locked"; stateTxt = "🔒 未達"; }
    var kids = [
      el("span", { class: "ax-spass__chipic", text: rw.ic }),
      el("span", { class: "ax-spass__chipv", text: money(rw.bonus) }),
      el("small", { class: "ax-spass__chips", text: stateTxt })
    ];
    if (clickable) {
      return el("button", { class: cls, onClick: function () {
        if (claim(track, i)) { HL.ui.toast("🎟️ 已領取：" + money(rw.bonus) + " 獎金入獎金錢包", "ok"); reopen(); }
      } }, kids);
    }
    return el("div", { class: cls }, kids);
  }
  function open() {
    var st = status();
    var body = [];

    // 頭部：賽季名 + 進度 + 進階軌狀態/解鎖
    var head = el("div", { class: "ax-panel ax-spass__hd" }, [
      el("div", { class: "ax-spass__title" }, [
        el("b", { text: st.icon + " " + st.name }),
        el("small", { class: "ax-muted", text: st.ended ? "本賽季已結束 · 仍可領取已達階級" : "剩餘 " + st.daysLeft + " 天" })
      ]),
      el("div", { class: "ax-spass__lvl" }, [
        el("b", { class: "ax-gold", text: "Tier " + st.tier + " / " + st.total }),
        el("small", { class: "ax-muted", text: st.maxed ? "已達頂階 🏁" : (st.into + " / " + st.xpPerTier + " XP") })
      ]),
      el("div", { class: "ax-spass__prog" }, [
        HL.ui.progress(st.tierPct),
        el("small", { class: "ax-muted", text: st.maxed ? "賽季經驗已滿" : "距下一階還差 " + st.toNext + " XP（下注即累積）" })
      ])
    ]);
    body.push(head);

    // 進階軌 CTA
    if (st.prem) {
      body.push(el("div", { class: "ax-spass__premrow is-on" }, [el("span", { text: "💎 進階軌已解鎖 · 進階獎勵全數開放" })]));
    } else {
      body.push(el("div", { class: "ax-spass__premrow" }, [
        el("div", {}, [
          el("b", { text: "🔓 解鎖進階軌" }),
          el("small", { class: "ax-muted", text: "花費 " + st.unlockCost + " 成就點數（目前可用 " + st.availPts + " 點）· 解鎖後回溯領已達階級進階獎勵" })
        ]),
        el("button", { class: st.availPts >= st.unlockCost ? "ax-btn-primary" : "ax-btn-ghost", text: "解鎖", onClick: function () {
          var r = unlockPrem();
          if (r.ok) reopen();
          else HL.ui.toast("成就點數不足：需 " + r.need + " 點，目前 " + r.have + " 點（多解鎖成就即可累積）", "warn");
        } })
      ]));
    }

    // 一鍵領取
    var claimAllBtn = el("button", { class: st.claimable ? "ax-btn-primary" : "ax-btn-ghost", text: st.claimable ? ("一鍵領取 " + st.claimable + " 項") : "暫無可領取", onClick: function () {
      var r = claimAll();
      if (r.count) { HL.ui.toast("🎉 已領取 " + r.count + " 項，共 " + money(r.total) + " 獎金", "ok"); reopen(); }
      else HL.ui.toast("目前沒有可領取的階級獎勵", "warn");
    } });
    body.push(el("div", { class: "ax-spass__actions" }, [claimAllBtn]));

    // 軌道欄名
    body.push(el("div", { class: "ax-spass__legend" }, [
      el("span", { text: "階級" }), el("span", { text: "免費軌" }), el("span", { text: "💎 進階軌" })
    ]));

    // 階梯（資料驅動）
    var ladder = el("div", { class: "ax-spass__ladder" });
    for (var i = 0; i < SEASON.tiers.length; i++) {
      var isNow = (i === st.tier && !st.maxed);      // 進行中的階級
      var reachedThis = i < st.tier;
      var rowCls = "ax-spass__row" + (isNow ? " is-now" : "") + (reachedThis ? " is-reached" : "");
      ladder.appendChild(el("div", { class: rowCls }, [
        el("div", { class: "ax-spass__tier" }, [el("b", { text: String(i + 1) })]),
        rewardChip("free", i, st),
        rewardChip("prem", i, st)
      ]));
    }
    body.push(ladder);
    body.push(el("span", { class: "ax-demo-tag", text: "下注累積賽季經驗 · 免費軌人人可領 · 進階軌以成就點數解鎖 · Demo" }));

    HL.ui.modal("🎟️ 季票 · Season Pass", body, { wide: true });
  }

  HL.season = { record: record, claim: claim, claimAll: claimAll, unlockPrem: unlockPrem,
                status: status, open: open, setSeason: setSeason };
})(window);

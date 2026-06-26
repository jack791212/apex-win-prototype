/*
 * Apex Win｜每週抽獎 Raffle / Lottery（自我進化引擎 #18）
 * 對標 Stake（$75k Weekly Raffle，押注換券）+ BC.Game（Weekly Lottery，多名得主）。
 * 玩法：每筆有效押注經中央掛鉤 HL.liveStats.record → 每滿 TICKET_PER 累積一張抽獎券；
 *   週期倒數結束時自動開獎（懶觸發、冪等，同 tournament.js 模式），中獎入獎金錢包 HL.bonus，
 *   並開新一期。保留「我的券數 / 倒數 / 歷史中獎」。純前端 localStorage、零牌照。
 * 掛鉤：live-stats.js 的 record() 尾端呼叫 HL.raffle.record(bet)。
 * 註冊於 window.HL.raffle。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function ls(k, d) { try { return JSON.parse(global.localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }

  var KEY_R = "HL_RAFFLE", KEY_H = "HL_RAFFLE_HIST";
  var DURATION = 7 * 86400 * 1000;     // 一期 7 天（每週抽獎）
  var POOL = 750000;                    // 本期彩池（對齊 Stake $75k Weekly Raffle 量級）
  var TICKET_PER = 2000;                // 每累積 NT$2,000 有效押注 = 1 張抽獎券
  var WINNERS = 20;                     // 每期得獎名額
  // 20 名階梯權重（和＝1）：頭重尾長，多數人中小獎
  var SPLIT = [0.20, 0.13, 0.09, 0.07, 0.06, 0.04, 0.04, 0.04, 0.04, 0.04,
               0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025];
  var NAMES = ["週末百萬抽獎", "VIP 週禮抽獎", "黃金週抽獎", "幸運週彩", "Apex 週度抽獎"];
  var subs = [];

  function nowMs() { return Date.now(); }
  function notify() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }

  function freshEvent() {
    return {
      id: "R" + nowMs(), name: NAMES[rint(0, NAMES.length - 1)],
      startAt: nowMs(), endAt: nowMs() + DURATION, pool: POOL,
      tickets: 0, wagerAcc: 0,                 // 我的券數 + 朝下一張券累積的押注
      botTickets: rint(6000, 18000),           // 社群其他玩家的總券數（決定中獎機率，Demo）
      players: rint(2000, 9000)
    };
  }
  function load() { var o = ls(KEY_R, null); if (!o || !o.id) { o = freshEvent(); save(KEY_R, o); } return o; }

  function prizeFor(rank) { return rank >= 1 && rank <= SPLIT.length ? Math.round(POOL * SPLIT[rank - 1]) : 0; }

  // 中央掛鉤：每筆有效押注 → 累積券（先處理逾期開獎，避免把券加到已結束的期）
  function record(bet) {
    bet = Math.round(bet || 0); if (bet <= 0) return;
    maybeSettle();
    var o = load();
    o.wagerAcc += bet;
    while (o.wagerAcc >= TICKET_PER) { o.tickets++; o.wagerAcc -= TICKET_PER; }
    save(KEY_R, o); notify();
  }

  // 依券數比例開獎：我的中獎機率＝1-(1-p)^名額，p＝我的券/總券；中獎則隨機落在某個名次
  function draw(o) {
    var my = o.tickets, total = my + o.botTickets;
    if (my <= 0 || total <= 0) return { won: false };
    var pAny = 1 - Math.pow(1 - my / total, WINNERS);
    if (Math.random() < pAny) {
      var rank = 1 + Math.floor(Math.random() * WINNERS);
      return { won: true, rank: rank, prize: prizeFor(rank) };
    }
    return { won: false };
  }

  function pushHistory(res) {
    var h = ls(KEY_H, []); h.unshift(res); if (h.length > 12) h = h.slice(0, 12); save(KEY_H, h); return h;
  }

  function settle(o) {
    o = o || load();
    if (o.settled) { var h0 = ls(KEY_H, []); return h0[0] || null; } // 冪等：同一期不重複開獎/派彩
    var d = draw(o);
    o.settled = true; save(KEY_R, o);                                // 先落地已結算旗標，再派彩，杜絕重入雙倍
    var res = { eventName: o.name, when: nowMs(), tickets: o.tickets, won: d.won, rank: d.won ? d.rank : 0, prize: d.won ? d.prize : 0, entrants: o.tickets + o.botTickets, winners: WINNERS };
    pushHistory(res);
    if (d.won && d.prize > 0 && HL.bonus) HL.bonus.add(d.prize);
    if (d.won && d.prize > 0) {
      if (HL.ui) HL.ui.toast("🎟️ 每週抽獎中獎！第 " + d.rank + " 名 " + money(d.prize) + " 已入獎金錢包", "ok");
      if (HL.notify) HL.notify.add({ ic: "🎟️", title: "每週抽獎開獎：第 " + d.rank + " 名", text: o.name + " 中獎 " + money(d.prize) + " 已入獎金錢包。" });
    } else if (HL.notify) {
      HL.notify.add({ ic: "🎫", title: "每週抽獎開獎", text: o.name + " 已開獎，本期" + (o.tickets > 0 ? "未中獎，券已重置，下期再來！" : "你沒有券，多玩幾局累積抽獎券吧！") });
    }
    notify();
    return res;
  }
  function startNew() { var ne = freshEvent(); save(KEY_R, ne); notify(); return ne; }
  function cycleEvent() { var r = settle(load()); startNew(); return r; }                 // 唯一開獎路徑：開獎→開新期
  function maybeSettle() { if (nowMs() >= load().endAt) { cycleEvent(); return true; } return false; } // 逾期自動開獎（懶觸發）
  function settleAndCycle() { return cycleEvent(); }                                      // Demo 立即開獎本期

  function status() {
    maybeSettle();
    var o = load();
    var total = o.tickets + o.botTickets;
    var winChance = total > 0 && o.tickets > 0 ? (1 - Math.pow(1 - o.tickets / total, WINNERS)) : 0;
    return {
      id: o.id, name: o.name, endAt: o.endAt, pool: o.pool, players: o.players,
      tickets: o.tickets, toNext: Math.max(0, TICKET_PER - o.wagerAcc), entrants: total,
      winChance: winChance, winners: WINNERS, ticketPer: TICKET_PER, prizeFor: prizeFor,
      history: ls(KEY_H, [])
    };
  }
  function subscribe(fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }

  /* ---------- UI：我的券數 / 倒數 / 獎級 / 歷史中獎 ---------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDHMS(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400), r = s % 86400;
    return d + t("天 ", "天 ") + pad(Math.floor(r / 3600)) + ":" + pad(Math.floor((r % 3600) / 60)) + ":" + pad(r % 60);
  }
  function kv(k, v, cls) { return el("div", { class: "ax-raffle__kv" }, [el("small", { class: "ax-muted", text: k }), el("b", { class: cls || "", text: v })]); }

  function open() {
    var st = status();

    var cd = el("b", { text: fmtDHMS(st.endAt - nowMs()) });
    HL.ticker.add(function tick() {
      if (!document.body.contains(cd)) { HL.ticker.remove(tick); return; }
      cd.textContent = fmtDHMS(status().endAt - nowMs());
    });

    var chancePct = (st.winChance * 100);
    var chanceTxt = st.tickets <= 0 ? t("尚無抽獎券", "尚無抽獎券") : (chancePct < 0.1 ? "<0.1%" : chancePct.toFixed(1) + "%");

    // 獎級（顯示前幾名 + 名額）
    var tierRows = [1, 2, 3, 4, 5].map(function (r) {
      return el("div", { class: "ax-raffle__tier" }, [el("span", { text: t("第", "第") + " " + r + " " + t("名", "名") }), el("b", { class: "ax-gold", text: money(st.prizeFor(r)) })]);
    });
    tierRows.push(el("div", { class: "ax-raffle__tier" }, [el("span", { text: "6–20 " + t("名", "名") }), el("b", { text: money(st.prizeFor(6)) + " ~ " + money(st.prizeFor(20)) })]));

    var histNodes = st.history.length ? st.history.slice(0, 6).map(function (h) {
      return el("div", { class: "ax-raffle__hrow" }, [
        el("span", { class: h.won ? "ax-gold" : "ax-muted", text: h.won ? "🏆 " + t("第", "第") + " " + h.rank + " " + t("名", "名") : "—" }),
        el("span", { class: "ax-muted", text: h.eventName }),
        el("b", { class: h.won ? "ax-green" : "ax-muted", text: h.won ? "+" + money(h.prize) : t("未中獎", "未中獎") })
      ]);
    }) : [el("div", { class: "ax-muted", text: t("尚無開獎紀錄。", "尚無開獎紀錄。") })];

    var demoBtn = el("button", { class: "ax-btn-ghost", text: t("🎲 立即開獎（Demo 測試）", "🎲 立即開獎（Demo 測試）") });
    demoBtn.addEventListener("click", function () { settleAndCycle(); HL.ui.toast(t("已開獎並開啟新一期", "已開獎並開啟新一期"), "ok"); open(); });

    HL.ui.modal(t("🎟️ 每週抽獎", "🎟️ 每週抽獎"), [
      el("div", { class: "ax-raffle" }, [
        el("div", { class: "ax-raffle__hero" }, [
          el("div", {}, [el("small", { class: "ax-muted", text: t("本期彩池", "本期彩池") }), el("div", { class: "ax-raffle__pool", text: money(st.pool) })]),
          el("div", { class: "ax-raffle__timer" }, [el("small", { class: "ax-muted", text: t("本期剩餘", "本期剩餘") }), cd])
        ]),
        el("div", { class: "ax-raffle__grid" }, [
          kv(t("我的抽獎券", "我的抽獎券"), "🎟️ " + st.tickets, "ax-gold"),
          kv(t("預估中獎機率", "預估中獎機率"), chanceTxt, st.tickets > 0 ? "ax-green" : ""),
          kv(t("本期參與人數", "本期參與人數"), "👥 " + st.players.toLocaleString()),
          kv(t("得獎名額", "得獎名額"), String(st.winners))
        ]),
        el("div", { class: "ax-raffle__hint", text: t("每累積 ", "每累積 ") + money(st.ticketPer) + t(" 有效押注得 1 張券", " 有效押注得 1 張券") + "（" + t("還差 ", "還差 ") + money(st.toNext) + t(" 得下一張", " 得下一張") + "）" }),
        el("div", { class: "ax-raffle__sec" }, [el("h4", { text: t("獎級", "獎級") })].concat(tierRows)),
        el("div", { class: "ax-raffle__sec" }, [el("h4", { text: t("我的開獎紀錄", "我的開獎紀錄") })].concat(histNodes)),
        demoBtn,
        el("span", { class: "ax-demo-tag", text: t("押注換券 · 週期自動開獎 · 中獎入獎金錢包 · Demo", "押注換券 · 週期自動開獎 · 中獎入獎金錢包 · Demo") })
      ])
    ]);
  }

  HL.raffle = {
    record: record, status: status, settleAndCycle: settleAndCycle, prizeFor: prizeFor,
    subscribe: subscribe, open: open, TICKET_PER: TICKET_PER, WINNERS: WINNERS, pool: function () { return POOL; }
  };
})(window);

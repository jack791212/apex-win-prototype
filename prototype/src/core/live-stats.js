/*
 * Apex Win｜實時統計（Live Stats）
 * GameFrame 工具列 📈 開啟的浮動面板：本工作階段的投注 / 贏分 / 盈虧 / 走勢。
 * 會員模式下數值來自「伺服器結算回應」（slot_spin / play_battle / bounty_* / chicken_*），
 * 非客端動畫演出值；Demo 模式則為客端結算值。跨遊戲共用同一份工作階段統計。
 * 註冊於 window.HL.liveStats。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;

  function fresh() { return { plays: 0, hits: 0, wagered: 0, won: 0, best: 0, lastGame: "", series: [0] }; }
  var data = fresh();
  var panel = null, bodyEl = null;

  // 各遊戲結算時回報：bet = 本次付費（押注/購買成本）、win = 本次贏分；可只帶其中一個
  function record(game, bet, win) {
    bet = bet || 0; win = win || 0;
    // 營運帳本：全遊戲（含跟注）下注/派彩的中央記帳點 → GGR/RTP/流水（真站乾淨、假站含模擬）
    if (HL.ledger) { if (bet > 0) HL.ledger.record("bet", bet, { game: game }); if (win > 0) HL.ledger.record("win", win, { game: game }); }
    if (bet > 0) { data.plays++; data.wagered += bet; }
    if (win > 0) { data.hits++; data.won += win; if (win > data.best) data.best = win; }
    if (game) data.lastGame = game;
    data.series.push(data.won - data.wagered);
    if (data.series.length > 120) data.series = data.series.slice(-120);
    if (panel && panel.style.display !== "none") renderBody();
    // 留存三件套中央掛鉤：押注 → VIP 累積 + 任務進度（全遊戲共用此記錄點）
    // #20 流水推進放最前：本注只累進「既存」紅利的流水，不解鎖同一結算內才鑄出的紅利（如 VIP 升級獎金）
    if (bet > 0 && HL.bonus && HL.bonus.onWager) HL.bonus.onWager(bet);
    if (bet > 0) { if (HL.vip) HL.vip.addWager(bet); if (HL.tasks) { HL.tasks.bump("bet", 1); HL.tasks.bump("wager", bet); } if (HL.rakeback) HL.rakeback.accrue(bet); if (HL.jackpot) HL.jackpot.onBet(bet); if (HL.tournament) HL.tournament.record(bet); if (HL.raffle) HL.raffle.record(bet); if (HL.shop) HL.shop.record(bet); if (HL.base) HL.base.record(bet); if (HL.onboard) HL.onboard.record(bet); if (HL.season) HL.season.record(bet); }
    if (win > 0 && HL.tasks) HL.tasks.bump("win", 1);
    if (bet > 0 && win > 0 && HL.challenges) HL.challenges.record(game, bet, win); // 多倍數挑戰 #26：同一局帶 bet+win 才算倍數（win/bet）
    if (HL.cashback) HL.cashback.record(bet, win); // 淨損 cashback #33：累積本週押注/贏分算淨輸（bet 或 win 可只帶其一，故不設 bet>0 閘）
    if (HL.heat) HL.heat.record(game, bet, win); // 遊戲熱度：對應遊戲即時加溫（On Fire/Ice Cold + 當下最熱牆）
    if (HL.achievements) HL.achievements.record(game, bet, win); // 成就徽章牆：累積終身統計 + 即時解鎖徽章/成就點數
  }

  function sparkline(series) {
    var w = 248, h = 56, n = Math.max(2, series.length);
    var min = Math.min.apply(null, series.concat([0]));
    var max = Math.max.apply(null, series.concat([0]));
    if (max === min) max = min + 1;
    function x(i) { return (i / (n - 1)) * (w - 4) + 2; }
    function y(v) { return h - 4 - ((v - min) / (max - min)) * (h - 8); }
    var d = "M " + x(0).toFixed(1) + " " + y(series[0]).toFixed(1);
    for (var i = 1; i < series.length; i++) d += " L " + x(i).toFixed(1) + " " + y(series[i]).toFixed(1);
    var last = series[series.length - 1];
    var color = last >= 0 ? "var(--ax-green)" : "var(--ax-red)";
    var box = el("div", { class: "ax-lstat__chart" });
    box.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<line x1="0" y1="' + y(0).toFixed(1) + '" x2="' + w + '" y2="' + y(0).toFixed(1) + '" stroke="var(--ax-border)" stroke-dasharray="3 3"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/></svg>';
    return box;
  }

  function kv(k, v, cls) {
    return HL.ui.stat(k, el("b", { class: cls || "", text: v }), "ax-lstat__kv"); // 沿用共用 primitive（見 core/ui.js）
  }
  function renderBody() {
    if (!bodyEl) return;
    HL.dom.clear(bodyEl);
    var profit = data.won - data.wagered;
    var isMember = !!(HL.auth && HL.auth.backend() && HL.auth.user());
    bodyEl.appendChild(el("div", { class: "ax-lstat__profit" }, [
      el("small", { class: "ax-muted", text: "盈虧" }),
      el("b", { class: profit >= 0 ? "ax-green" : "ax-red", text: (profit >= 0 ? "+" : "−") + money(Math.abs(profit)) })
    ]));
    bodyEl.appendChild(sparkline(data.series));
    bodyEl.appendChild(el("div", { class: "ax-lstat__grid" }, [
      kv("投注數", String(data.plays)),
      kv("中獎數", String(data.hits)),
      kv("總投注", money(data.wagered)),
      kv("總贏分", money(data.won)),
      kv("最大單筆", money(data.best), "ax-gold"),
      kv("最近遊戲", data.lastGame || "—")
    ]));
    bodyEl.appendChild(el("div", { class: "ax-lstat__note" }, [
      el("span", { class: "ax-demo-tag", text: isMember ? "🔒 伺服器結算資料" : "Demo 客端資料" }),
      el("small", { class: "ax-muted", text: "本瀏覽器工作階段" })
    ]));
  }

  function ensurePanel() {
    if (panel) return panel;
    var head = el("div", { class: "ax-lstat__head" }, [
      el("div", { class: "ax-lstat__title", text: "📈 實時統計" }),
      el("button", { class: "ax-pip__b", title: "關閉", "aria-label": "關閉", text: "×", onClick: function () { close(); } })
    ]);
    bodyEl = el("div", { class: "ax-lstat__body" });
    var foot = el("div", { class: "ax-lstat__foot" }, [
      el("button", { class: "ax-btn-ghost", text: "🔗 分享戰績", onClick: function () {
        var profit = data.won - data.wagered;
        HL.share.text({
          title: "ApexWin 戰績",
          text: "🎰 我在 ApexWin 玩「" + (data.lastGame || "遊戲") + "」：本場 " + data.plays + " 局、盈虧 " +
            (profit >= 0 ? "+" : "−") + money(Math.abs(profit)) + "、最大單筆 " + money(data.best) + "！一起來試手氣 👉"
        });
      } }),
      el("button", { class: "ax-btn-ghost", text: "重置統計", onClick: function () { data = fresh(); renderBody(); HL.ui.toast("實時統計已重置", "ok"); } })
    ]);
    panel = el("div", { class: "ax-lstat" }, [head, bodyEl, foot]);
    panel.style.display = "none";
    document.body.appendChild(panel);
    HL.dom.makeDraggable(panel, head, { lockWidth: true });
    return panel;
  }

  function open() {
    ensurePanel();
    // 全螢幕中（原生 top layer 或 CSS fallback）：把面板掛進全螢幕節點內才看得到；
    // 也順便把曾被銷毀容器帶走的面板撿回 body。
    var host = document.fullscreenElement || document.querySelector(".ax-gframe--fullscreen") || document.body;
    if (panel.parentNode !== host) host.appendChild(panel);
    renderBody();
    panel.style.display = "flex";
  }
  function close() { if (panel) panel.style.display = "none"; }
  function toggle() { ensurePanel(); (panel.style.display === "none") ? open() : close(); }

  HL.liveStats = { record: record, open: open, close: close, toggle: toggle };
})(window);

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
    // #89 可用範圍軸：把 game 一併交給紅利引擎（此前它是這個中央掛鉤上最後一個收不到 game 的
    //   大消費端 ⇒ 「這筆紅利只能在 slot 打流水」在架構上做不出來）。未宣告範圍的紅利權重恆為 1。
    if (bet > 0 && HL.bonus && HL.bonus.onWager) HL.bonus.onWager(bet, game);
    // #50 成本加權：VIP／賽季**經驗**依該遊戲理論莊家成本加權（HL.edge，站別感知）。
    //   ⚠️ 只有這兩個「進度」訂閱者收加權額；bet 本身與帳本/返水/彩金/抽獎券/任務目標/公會貢獻
    //   一律維持**真實金額**（加權額若外流到派彩或帳目就會失真）。未登記遊戲 weighted() 恰回原額。
    // #60 返水改以莊家優勢計價：傳給 rakeback 的仍是**真實 bet**，另帶 game 讓它自行查 edge 定率
    //   （＝改變返水公式的計價基準，不是把加權額當押注額餵進去 ⇒ 與上面 #50 的契約不牴觸）。
    // #65 進度來源註冊表：VIP／賽季**進度**改由 HL.progressSrc 單一出口餵入（"wager" 註冊為第一筆、
    //   係數恆 1 且不設上限 ⇒ 每一注的 XP 逐位不變＝行為零變更）。之後新增「儲值/簽到」等非投注來源
    //   ＝加一筆註冊 + 呼叫端一行，不必再改本檔。未載入時回退舊直呼路徑（漏載只退化、不整組失效）。
    var xpBet = (bet > 0 && HL.edge) ? HL.edge.weighted(game, bet) : bet;
    // #59 近 30 天活躍度滾動視窗：兩把尺各記一份——`bet`＝真實金額（資格閘要的），`xpBet`＝edge 加權額
    //   （光環段位吃的，與 VIP 經驗同一把尺）。⚠️ 刻意餵**加速前**的 xpBet：若餵加速後的量，光環的
    //   加成會回流成自己的輸入＝正回饋（測項 activity/no-self-feedback 鎖住此處的引數形狀）。
    if (bet > 0 && HL.activity) HL.activity.record(bet, xpBet);
    if (bet > 0) { if (HL.progressSrc) HL.progressSrc.grant("wager", xpBet); else { if (HL.vip) HL.vip.addWager(xpBet); if (HL.season) HL.season.record(xpBet); } if (HL.tasks) { HL.tasks.bump("bet", 1); HL.tasks.bump("wager", bet); } if (HL.rakeback) HL.rakeback.accrue(bet, game); if (HL.jackpot) HL.jackpot.onBet(bet); if (HL.tournament) HL.tournament.record(bet, win, game); if (HL.raffle) HL.raffle.record(bet); if (HL.shop) HL.shop.record(bet); if (HL.base) HL.base.record(bet); if (HL.onboard) HL.onboard.record(bet); if (HL.guild) HL.guild.record(bet); }
    if (win > 0 && HL.tasks) HL.tasks.bump("win", 1);
    // #85 計分軸：旗艦 slot／小雞把同一局拆成 record(bet,0) 與 record(0,win) 兩次結算
    //   （views/slot.js:434/477）⇒ win-only 這半也要餵給錦標賽，否則「最大贏額」軸永遠收不到 slot 贏分。
    //   流水軸（現行賽制）下這行恆為 no-op：分數沒變就不寫檔不通知＝零回歸（見 selftest scoreAxis/zero-regression）。
    if (win > 0 && bet <= 0 && HL.tournament) HL.tournament.record(0, win, game);
    if (bet > 0 && win > 0 && HL.challenges) HL.challenges.record(game, bet, win); // 多倍數挑戰 #26：同一局帶 bet+win 才算倍數（win/bet）
    if (HL.cashback) HL.cashback.record(bet, win); // 淨損 cashback #33：累積本週押注/贏分算淨輸（bet 或 win 可只帶其一，故不設 bet>0 閘）
    if (HL.heat) HL.heat.record(game, bet, win); // 遊戲熱度：對應遊戲即時加溫（On Fire/Ice Cold + 當下最熱牆）
    if (HL.achievements) HL.achievements.record(game, bet, win); // 成就徽章牆：累積終身統計 + 即時解鎖徽章/成就點數
    if (HL.betlog) HL.betlog.record(game, bet, win); // 注單中心 #51：逐局落地（含當下 clientSeed/nonce）供回看與可驗證公平驗算
    if (HL.rg) HL.rg.record(bet, win); // 負責任博弈 #67：累積今日押注/贏分/遊玩時間（閘本身在下注前，見 instant/table）
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
    var isMember = !!(HL.auth && HL.auth.isMember());
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

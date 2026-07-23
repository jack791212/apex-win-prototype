/*
 * Apex Win｜每日簽到 / 獎勵中心（#34 遞增連登階梯 + 里程碑日）
 * 純前端、localStorage 持久化。連續簽到 streak，每日領一次遊戲幣（休閒模式）。
 * #34（對標 Crown Coins 7 天遞增+里程碑 / Stake.us 31 天連登包 / SpinBlitz escalating）：
 *   把原「平 7 天循環」升級為 30 天**逐日遞增階梯**（連越久單日獎越大），並在第 8/15/22/30 天
 *   疊加**里程碑大禮**。日獎進主餘額（同原行為＝遊戲幣），里程碑大禮進獎金錢包 HL.bonus。
 *   斷簽歸零（streak 回 1）；第 30 天後日獎 plateau、不再觸發里程碑（旅程完成）。
 * 保留 status().claimedToday 等既有欄位（#28 新手窗口依賴）。status()/claim()/open()。註冊於 window.HL.rewards。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_REWARDS";
  // 30 天逐日遞增日獎（遊戲幣，入主餘額）；第 7 天 1500 對齊原循環峰值，續攀至第 30 天
  var LADDER = [
    100, 200, 350, 550, 800, 1100, 1500,
    1700, 1950, 2250, 2600, 3000, 3450, 3950,
    4400, 4950, 5550, 6200, 6900, 7650, 8450,
    8900, 9800, 10750, 11750, 12800, 13900, 15050, 16250, 17500
  ];
  var LADDER_LEN = LADDER.length;                          // 30
  // 里程碑大禮（額外入獎金錢包 HL.bonus，僅於「當前連登恰為此日」觸發）
  var MILESTONES = { 8: 3000, 15: 8000, 22: 15000, 30: 50000 };

  var dayNum = HL.dom.dayNum;  // T12：收斂至共用 epoch-bucket（本地日序，判斷昨天/今天）
  function load() { return HL.dom.lsGet(KEY, {}); }  // T20+站別命名空間（見 dom.js）
  function save(o) { HL.dom.lsSet(KEY, o); }

  function ladderReward(streakDay) { return LADDER[Math.min(streakDay, LADDER_LEN) - 1]; } // 第 30 天後 plateau
  function milestoneOf(streakDay) { return MILESTONES[streakDay] || 0; }                    // 僅精確里程碑日

  function status() {
    var s = load();
    var d = dayNum();
    var claimedToday = s.lastDay === d;
    var raw = s.streak || 0;
    var nextStreak = claimedToday ? raw : (s.lastDay === d - 1 ? raw + 1 : 1); // 昨天有領→+1，否則重置為 1
    // 顯示用 streak：斷簽（未在今/昨領）即歸零，與 nextStreak 一致，避免表頭顯示過期連登數
    var streak = (claimedToday || s.lastDay === d - 1) ? raw : 0;
    return {
      claimedToday: claimedToday, streak: streak, nextStreak: nextStreak,
      reward: ladderReward(nextStreak),          // 今日日獎（主餘額）
      milestone: milestoneOf(nextStreak),        // 今日里程碑大禮（獎金錢包，0=非里程碑日）
      ladderIdx: Math.min(nextStreak, LADDER_LEN) - 1,
      canClaim: !claimedToday
    };
  }

  function claim() {
    var st = status();
    if (st.claimedToday) return st;
    save({ lastDay: dayNum(), streak: st.nextStreak });
    HL.state.set({ balance: HL.state.get().balance + st.reward }); // 日獎發遊戲幣（休閒）入主餘額
    if (HL.ledger && st.reward > 0) HL.ledger.record("bonus", st.reward, { source: "每日簽到" }); // 營運帳本：直入主餘額的送幣
    if (st.milestone > 0 && HL.bonus) {                            // 里程碑大禮入獎金錢包
      HL.bonus.add(st.milestone);
      if (HL.notify) HL.notify.add({ ic: "🏅", title: t("連登里程碑", "連登里程碑"), text: t("連登", "連登") + " " + st.nextStreak + " " + t("天里程碑", "天里程碑") + " " + money(st.milestone) + " " + t("已入獎金錢包。", "已入獎金錢包。") });
    }
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.tasks) HL.tasks.bump("checkin", 1); // 推進「完成每日簽到」任務
    if (HL.achievements) HL.achievements.sync(); // 成就徽章牆：簽到後即時重評連續簽到類成就
    return status();
  }

  function open() {
    var st = status();
    var todayIdx = st.ladderIdx;                 // 今日在階梯上的 0-based 位置
    var grid = el("div", { class: "ax-checkin ax-checkin--ladder" });
    var todayCell = null;
    for (var i = 0; i < LADDER_LEN; i++) {
      var day = i + 1;
      var isToday = (i === todayIdx);
      // 本輪已領＝當前 streak 內、位置早於今日的格；claimedToday 時今日也算已領
      var done = st.claimedToday ? (i <= todayIdx) : (i < todayIdx);
      var ms = MILESTONES[day] || 0;
      var cls = "ax-checkin__day" + (done ? " is-done" : "") + (isToday ? " is-today" : "") + (ms ? " is-milestone" : "");
      var cell = el("div", { class: cls }, [
        el("div", { class: "ax-checkin__d", text: t("第", "第") + day + t("天", "天") }),
        el("div", { class: "ax-checkin__amt", text: "+" + LADDER[i] }),
        ms ? el("div", { class: "ax-checkin__ms", text: "🏅+" + ms }) : null,
        done ? el("div", { class: "ax-checkin__chk", text: "✓" }) : null
      ]);
      if (isToday) todayCell = cell;
      grid.appendChild(cell);
    }

    var claimLabel = st.canClaim
      ? (t("簽到領取", "簽到領取") + " +" + money(st.reward) + (st.milestone > 0 ? (" +🏅" + money(st.milestone)) : ""))
      : t("今日已領取 ✓", "今日已領取 ✓");

    var m = HL.ui.modal(t("🎁 每日簽到 · 連登階梯", "🎁 每日簽到 · 連登階梯"), [
      el("div", { class: "ax-checkin__hd" }, [
        el("b", {}, [el("span", { text: t("連續簽到", "連續簽到") }), document.createTextNode(" " + st.streak), el("span", { text: t("天", "天") })]),
        el("span", { class: "ax-muted", text: st.canClaim ? (t("連越久單日獎越大 · 第 8/15/22/30 天有里程碑大禮", "連越久單日獎越大 · 第 8/15/22/30 天有里程碑大禮")) : t("今日已領，明天再來", "今日已領，明天再來") })
      ]),
      grid,
      el("button", {
        class: "ax-btn-primary", text: claimLabel,
        disabled: st.canClaim ? null : "disabled",
        onClick: function () {
          if (!status().canClaim) return;
          var before = status();
          claim();
          var msg = t("簽到成功", "簽到成功") + " +" + money(before.reward) + "（" + t("連續", "連續") + " " + before.nextStreak + " " + t("天", "天") + "）";
          HL.ui.toast(before.milestone > 0 ? (msg + " +🏅" + money(before.milestone)) : msg, "ok");
          m.close(); open(); // 重繪反映已領狀態
        }
      }),
      el("span", { class: "ax-demo-tag", text: t("休閒模式 · 日獎進主餘額 · 里程碑進獎金錢包 · Demo", "休閒模式 · 日獎進主餘額 · 里程碑進獎金錢包 · Demo") })
    ]);
    // 今日格捲入視野（階梯長，避免使用者看不到當前進度）
    if (todayCell && todayCell.scrollIntoView) { try { todayCell.scrollIntoView({ block: "nearest" }); } catch (e) {} }
  }

  HL.rewards = { status: status, claim: claim, open: open };
})(window);

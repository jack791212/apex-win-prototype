/*
 * Apex Win｜每日簽到 / 獎勵中心
 * 純前端、localStorage 持久化。連續簽到 streak，每日領一次遊戲幣（休閒模式）。
 * status()/claim()/open()。註冊於 window.HL.rewards。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var KEY = "HL_REWARDS";
  var CYCLE = [100, 150, 200, 300, 500, 800, 1500]; // 7 天循環獎勵（遊戲幣）

  function dayNum() { return Math.floor(Date.now() / 86400000); } // 本地日序（判斷昨天/今天）
  function load() { try { return JSON.parse(global.localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(o) { try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  function status() {
    var s = load();
    var d = dayNum();
    var claimedToday = s.lastDay === d;
    var streak = s.streak || 0;
    var nextStreak = claimedToday ? streak : (s.lastDay === d - 1 ? streak + 1 : 1); // 昨天有領→+1，否則重置為 1
    var idx = (nextStreak - 1) % CYCLE.length;
    return { claimedToday: claimedToday, streak: streak, nextStreak: nextStreak, reward: CYCLE[idx], canClaim: !claimedToday };
  }

  function claim() {
    var st = status();
    if (st.claimedToday) return st;
    save({ lastDay: dayNum(), streak: st.nextStreak });
    HL.state.set({ balance: HL.state.get().balance + st.reward }); // 發遊戲幣（休閒）
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.tasks) HL.tasks.bump("checkin", 1); // 推進「完成每日簽到」任務
    return status();
  }

  function open() {
    var st = status();
    var cur = (st.nextStreak - 1) % CYCLE.length; // 本輪今天的格子位置(0-based)
    var grid = el("div", { class: "ax-checkin" });
    CYCLE.forEach(function (amt, i) {
      var isToday = (i === cur);
      var done = st.claimedToday ? (i <= cur) : (i < cur); // 本輪已領的格子
      var cls = "ax-checkin__day" + (done ? " is-done" : "") + (isToday ? " is-today" : "");
      grid.appendChild(el("div", { class: cls }, [
        el("div", { class: "ax-checkin__d", text: "第 " + (i + 1) + " 天" }),
        el("div", { class: "ax-checkin__amt", text: "+" + amt }),
        done ? el("div", { class: "ax-checkin__chk", text: "✓" }) : null
      ]));
    });

    var m = HL.ui.modal("🎁 每日簽到 · 獎勵中心", [
      el("div", { class: "ax-checkin__hd" }, [
        el("b", { text: "連續簽到 " + st.streak + " 天" }),
        el("span", { class: "ax-muted", text: st.canClaim ? ("今天可領 +" + money(st.reward).replace("NT$ ", "") + " 遊戲幣") : "今日已領，明天再來" })
      ]),
      grid,
      el("button", {
        class: "ax-btn-primary", text: st.canClaim ? ("簽到領取 +" + money(st.reward)) : "今日已領取 ✓",
        disabled: st.canClaim ? null : "disabled",
        onClick: function () {
          if (!status().canClaim) return;
          var r = claim();
          HL.ui.toast("簽到成功 +" + money(CYCLE[(r.streak - 1) % CYCLE.length]) + "（連續 " + r.streak + " 天）", "ok");
          m.close(); open(); // 重繪反映已領狀態
        }
      }),
      el("span", { class: "ax-demo-tag", text: "休閒模式 · 發遊戲幣 · Demo" })
    ]);
  }

  HL.rewards = { status: status, claim: claim, open: open };
})(window);

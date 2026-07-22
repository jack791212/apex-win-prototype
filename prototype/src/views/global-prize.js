/*
 * Apex Win｜全球獎（全平台事件中心）
 * 主軸：WORLD EVENT 全服事件 / 虛擬偶像直播主。
 * 入口 + 說明 Modal + 假資料動態 + Demo 標示 + 導向。偶像為虛擬主持（Demo，非真人）。
 * 註冊於 window.HL.views.globe。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var pick = function (a) { return HL.mock.pick(a); };
  var rint = function (a, b) { return HL.mock.rint(a, b); };

  var fmtDHMS = HL.dom.dhms; // 沿用共用 helper（見 core/dom.js）
  function btnRow(items) {
    return el("div", { class: "ax-modal__actions" }, items.map(function (it) {
      return el("button", { class: "ax-btn-ghost", text: it[0], onClick: it[1] });
    }));
  }
  function kv(k, v, cls) { return HL.ui.kv(k, v, { valCls: cls }); } // 沿用共用 primitive（見 core/ui.js）
  function demoTag() { return el("span", { class: "ax-demo-tag", text: "Demo 假資料" }); }

  /* =========================================================
   * 1. WORLD EVENT 全服事件
   * ========================================================= */
  function eventSection() {
    var e = HL.mock.globeEvent;
    var left = e.endsInSec;
    var cd = el("b", { text: fmtDHMS(left) });
    HL.ticker.add(function () { left = left > 0 ? left - 1 : e.endsInSec; cd.textContent = fmtDHMS(left); });

    var my = HL.state.get().myEffectiveBet;
    var qualified = my >= e.threshold;
    var pct = Math.min(100, Math.round((my / e.threshold) * 100));

    return el("section", { class: "ax-ge-hero" }, [
      el("div", { class: "ax-ge-hero__top" }, [
        el("div", {}, [
          el("div", { class: "ax-hero__tag", text: "WORLD EVENT · 全服事件" }),
          el("h1", { class: "ax-hero__title", text: e.name }),
          el("div", { class: "ax-muted" }, [HL.i18n.fmt("第 {p} 期　|　預計開獎 {d}", { p: e.period, d: e.drawAt })]) // U22：動態組字走 fmt
        ]),
        el("div", { class: "ax-hero__timer" }, [el("small", { class: "ax-muted", text: "本期剩餘" }), cd])
      ]),
      el("div", { class: "ax-ge-hero__stats" }, [
        kv("本期總彩池", money(e.pool), "ax-gold"),
        kv("本期參與人數", "👥 " + e.players.toLocaleString()),
        kv("參與門檻", "有效押注滿 " + money(e.threshold))
      ]),
      el("div", { class: "ax-ge-prog" }, [
        el("div", { class: "ax-ge-prog__line" }, [
          el("span", { text: "我的進度：已累積 " + money(my) + (qualified ? "" : "　還差 " + money(e.threshold - my)) }),
          el("span", { class: qualified ? "ax-green" : "ax-muted", text: qualified ? "✓ 已取得抽獎資格" : "尚未取得資格" })
        ]),
        HL.ui.progress(pct)
      ]),
      el("div", { class: "ax-ge-actions" }, [
        el("button", { class: "ax-btn-join", text: "查看我的資格", onClick: myQualificationModal }),
        el("button", { class: "ax-btn-ghost ax-ge-btn", text: "活動規則", onClick: eventRulesModal }),
        el("button", { class: "ax-btn-ghost ax-ge-btn", text: "上一期得獎名單", onClick: lastWinnersModal }),
        el("button", { class: "ax-btn-ghost ax-ge-btn", text: "貢獻榜", onClick: contributorsModal }),
        el("button", { class: "ax-btn-ghost ax-ge-btn", text: "前往遊玩", onClick: navModal }),
        el("button", { class: "ax-btn-ghost ax-ge-btn", text: "提醒我開獎", onClick: function () { HL.ui.toast("已開啟本期開獎提醒（Demo 假提醒）", "ok"); } })
      ]),
      el("div", { class: "ax-ge-note" }, ["⚠️ 貢獻榜 ≠ 中獎機率：滿門檻即取得抽獎資格，小額玩家同樣有機會中獎。", demoTag()])
    ]);
  }

  function myQualificationModal() {
    var e = HL.mock.globeEvent, my = HL.state.get().myEffectiveBet, qualified = my >= e.threshold;
    HL.ui.modal("查看我的資格", [
      el("div", { class: "ax-panel" }, [
        kv("本期有效押注", money(my)),
        kv("資格門檻", money(e.threshold)),
        kv("距離資格", qualified ? "已達成" : "還差 " + money(e.threshold - my), qualified ? "ax-green" : "ax-red"),
        kv("資格狀態", qualified ? "✓ 已取得抽獎資格" : "尚未取得", qualified ? "ax-green" : "ax-red"),
        kv("計入項目", "競技場 / 娛樂城 / 直播跟注"),
        kv("本期結算", e.drawAt)
      ]),
      demoTag()
    ]);
  }
  function eventRulesModal() {
    HL.ui.modal("活動規則", [
      HL.ui.rules([
        "三天為一個週期。",
        "有效押注：於平台任意遊戲完成的有效投注。",
        "本期累積有效押注滿 NT$1,000，即取得抽獎資格。",
        "週期結束時，從符合資格玩家中抽選數名得獎。",
        "彩池依得獎名單分配；貢獻榜僅顯示活躍度，不等於中獎機率。",
        "小額玩家同樣有機會中獎。"
      ]),
      demoTag()
    ]);
  }
  function lastWinnersModal() {
    var ws = HL.mock.makeLastWinners();
    HL.ui.modal("上一期得獎名單", [
      el("p", { class: "ax-muted", text: "上一期彩池總額 " + money(HL.mock.globeEvent.pool) }),
      el("div", { class: "ax-panel" }, ws.map(function (w) {
        return el("div", { class: "ax-row" }, [
          el("span", { class: "av", text: "🏆" }),
          el("span", { class: "nm", text: w.name }),
          el("span", { class: "ax-muted", text: w.type }),
          el("b", { class: "ax-gold", text: money(w.prize) })
        ]);
      })),
      demoTag()
    ]);
  }
  function showContributors(cs, hasReal) {
    HL.ui.modal("本期貢獻榜", [
      el("p", { class: "ax-muted", text: "貢獻值反映活躍度（累積有效押注），不等於中獎機率。" }),
      el("div", { class: "ax-panel" }, cs.map(function (r) {
        return el("div", { class: "ax-row" }, [
          el("span", { style: "width:24px", class: "ax-muted", text: "#" + r.rank }),
          el("span", { class: "nm" }, [r.name, r.real ? el("span", { class: "ax-bw__real", text: "✓ 真" }) : null]),
          el("span", { class: "ax-muted", text: "押 " + money(r.bet) }),
          el("b", { text: r.score.toLocaleString() + " 分" })
        ]);
      })),
      hasReal ? el("span", { class: "ax-demo-tag", text: "✓ 真實會員資料 · 不足名額以 Demo 補位" }) : demoTag()
    ]);
  }
  var contribPending = false; // 防連點：RPC 在途時不重複開 modal
  function contributorsModal() {
    var member = HL.auth && HL.auth.backend() && HL.auth.user();
    if (!member) return showContributors(HL.mock.makeContributors(), false);
    if (contribPending) return;
    contribPending = true;
    // 會員模式：排行榜抓真資料（profiles.wagered），不足 8 名以 Demo 機器人補位
    HL.api.feedLeaderboard(8).then(function (rows) {
      contribPending = false;
      if (!rows || !rows.length) return showContributors(HL.mock.makeContributors(), false);
      var real = rows.map(function (r) { return { name: r.name || "玩家", bet: Math.round(+r.wagered || 0), score: Math.round(+r.wagered || 0), real: true }; });
      // 補位的 Demo 分數壓在最低真實分數之下（真會員永遠排前），再依分數排序編名次
      var pad = HL.mock.makeContributors().slice(0, Math.max(0, 8 - real.length));
      var floor = real[real.length - 1].score;
      pad.forEach(function (p, i) { p.score = Math.max(1, Math.floor(floor * (0.9 - i * 0.1))); p.bet = p.score; });
      var all = real.concat(pad).sort(function (a, b) { return b.score - a.score; }).map(function (r, i) { r.rank = i + 1; return r; });
      showContributors(all, true);
    });
  }
  function navModal() {
    HL.ui.modal("前往遊玩", [
      el("p", { class: "ax-muted", text: "任意有效遊玩都會推進全球獎，選擇你想前往的地方：" }),
      btnRow([
        ["⚔️ 前往競技場", function () { HL.router.go("arena"); }],
        ["🎰 前往娛樂城", function () { HL.router.go("casino"); }],
        ["📡 前往直播房", function () { HL.views.liveroom.enter(HL.mock.idols[0]); }],
        ["🏠 返回大廳", function () { HL.router.go("lobby"); }]
      ])
    ]);
  }

  /* =========================================================
   * 2. 虛擬偶像直播主
   * ========================================================= */
  function idolCard(idol) {
    var viewers = rint(800, 9000), followers = rint(20, 400);
    var vEl = el("b", { text: viewers.toLocaleString() });
    var fEl = el("b", { text: String(followers) });
    var left = rint(20, 90);
    var cd = el("span", { text: HL.dom.mmss(left) });
    HL.ticker.add(function () {
      viewers += rint(-30, 60); if (viewers < 100) viewers = 100; vEl.textContent = viewers.toLocaleString();
      if (Math.random() < 0.3) { followers += rint(0, 3); fEl.textContent = String(followers); }
      left = left > 0 ? left - 1 : rint(40, 90); cd.textContent = HL.dom.mmss(left);
    });
    return el("div", { class: "ax-idol", style: "background:linear-gradient(160deg," + idol.c1 + "," + idol.c2 + ")" }, [
      el("div", { class: "ax-idol__live", text: "● LIVE" }),
      HL.dom.pressable(el("div", { class: "ax-idol__av", text: idol.emoji, onClick: function () { idolIntroModal(idol); } })),
      el("div", { class: "ax-idol__body" }, [
        el("div", { class: "ax-idol__name" }, [idol.name, el("span", { class: "ax-idol__style", text: idol.style })]),
        el("div", { class: "ax-idol__game", text: "正在玩：" + idol.game }),
        el("div", { class: "ax-idol__meta" }, [
          el("span", {}, ["👁 ", vEl]), el("span", {}, ["🎯 跟注 ", fEl]), el("span", { class: "ax-muted" }, ["⏱ ", cd])
        ]),
        el("button", { class: "ax-btn-join ax-idol__enter", text: "進入直播間", onClick: function () { HL.views.liveroom.enter(idol); } })
      ])
    ]);
  }

  function idolsSection() {
    return el("section", {}, [
      HL.ui.sectionTitle("📡 虛擬偶像直播主", { extras: [
        el("span", { class: "ax-demo-tag", text: "虛擬主持 · 非真人直播" })
      ] }),
      el("div", { class: "ax-idol-grid" }, HL.mock.idols.map(idolCard))
    ]);
  }

  function idolIntroModal(idol) {
    HL.ui.modal(idol.name + "　偶像介紹", [
      el("div", { class: "ax-panel" }, [
        kv("風格", idol.style),
        kv("擅長遊戲", idol.game),
        kv("今日戰績", "勝率 " + rint(48, 66) + "%"),
        kv("粉絲數", idol.fans.toLocaleString())
      ]),
      el("span", { class: "ax-demo-tag", text: "虛擬主持 · Demo 演繹 · 非真人" })
    ]);
  }

  // 直播間已改為整頁視圖（src/views/liveroom.js，HL.views.liveroom.enter）。

  /* ---------- 右側：我的參與狀態 / 上一期入口 ---------- */
  function rail() {
    var e = HL.mock.globeEvent, st = HL.state.get();
    var pct = Math.min(100, Math.round((st.myEffectiveBet / e.threshold) * 100));
    return el("div", { class: "ax-globe__rail" }, [
      el("div", { class: "ax-panel" }, [
        el("h4", { text: "我的參與狀態" }),
        el("div", { class: "ax-ge-prog__line" }, [el("span", { class: "ax-muted", text: "WORLD EVENT 進度" }), el("b", { text: pct + "%" })]),
        HL.ui.progress(pct, { style: "margin:6px 0 12px" }),
        kv("本期有效押注", money(st.myEffectiveBet)),
        kv("追蹤直播主", "AI Luna"),
        el("button", { class: "ax-btn-join", style: "width:100%;margin-top:10px", text: "📡 進入 AI Luna 直播間", title: "整頁直播間，內可切換子母畫面、跟注", onClick: function () { HL.views.liveroom.enter(HL.mock.idols[0]); } })
      ]),
      el("button", { class: "ax-btn-ghost", text: "🏆 上一期得獎入口", onClick: lastWinnersModal })
    ]);
  }

  function render() {
    return el("div", { class: "ax-globe ax-fade-in" }, [
      el("div", { class: "ax-globe__main" }, [eventSection(), idolsSection()]),
      rail()
    ]);
  }

  HL.views = HL.views || {};
  HL.views.globe = { render: render };
})(window);

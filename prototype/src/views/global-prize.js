/*
 * Apex Win｜全球獎（全平台事件中心）
 * 三大主軸：WORLD EVENT 全服事件 / 虛擬偶像直播主 / 國戰系統。
 * 第一版：入口 + 說明 Modal + 假資料動態 + Demo 標示 + 導向。
 * 所有玩家皆為假玩家；偶像為虛擬主持（Demo 演繹，非真人）。
 * 註冊於 window.HL.views.globe。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var pick = function (a) { return HL.mock.pick(a); };
  var rint = function (a, b) { return HL.mock.rint(a, b); };

  var mapEl, feedEl, statusEl; // 動態容器

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDHMS(sec) {
    var d = Math.floor(sec / 86400), r = sec % 86400;
    return pad(d) + "天 " + pad(Math.floor(r / 3600)) + ":" + pad(Math.floor((r % 3600) / 60)) + ":" + pad(r % 60);
  }
  function btnRow(items) {
    return el("div", { class: "ax-modal__actions" }, items.map(function (it) {
      return el("button", { class: "ax-btn-ghost", text: it[0], onClick: it[1] });
    }));
  }
  function kv(k, v, cls) { return el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: k }), el("b", { class: cls || "", text: v })]); }
  function demoTag() { return el("span", { class: "ax-demo-tag", text: "Demo 假資料" }); }

  function pushFeed(txt) {
    var arr = HL.state.get().globeFeed.slice();
    arr.unshift({ txt: txt, t: Date.now() });
    if (arr.length > 30) arr = arr.slice(0, 30);
    HL.state.set({ globeFeed: arr });
    renderFeed();
  }

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
          el("div", { class: "ax-muted", text: "第 " + e.period + " 期　|　預計開獎 " + e.drawAt }),
        ]),
        el("div", { class: "ax-hero__timer" }, [el("small", { class: "ax-muted", text: "本期剩餘" }), cd])
      ]),
      el("div", { class: "ax-ge-hero__stats" }, [
        kv("本期總彩池", money(e.pool), "ax-gold"),
        kv("本期參與人數", "👥 " + e.players.toLocaleString()),
        kv("參與門檻", "有效押注滿 " + money(e.threshold))
      ]),
      // 我的進度
      el("div", { class: "ax-ge-prog" }, [
        el("div", { class: "ax-ge-prog__line" }, [
          el("span", { text: "我的進度：已累積 " + money(my) + (qualified ? "" : "　還差 " + money(e.threshold - my)) }),
          el("span", { class: qualified ? "ax-green" : "ax-muted", text: qualified ? "✓ 已取得抽獎資格" : "尚未取得資格" })
        ]),
        el("div", { class: "ax-progress" }, [el("i", { style: "width:" + pct + "%" })])
      ]),
      // 按鈕群
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
      el("ul", { class: "ax-rules" }, [
        el("li", { text: "三天為一個週期。" }),
        el("li", { text: "有效押注：於平台任意遊戲完成的有效投注。" }),
        el("li", { text: "本期累積有效押注滿 NT$1,000，即取得抽獎資格。" }),
        el("li", { text: "週期結束時，從符合資格玩家中抽選數名得獎。" }),
        el("li", { text: "彩池依得獎名單分配；貢獻榜僅顯示活躍度，不等於中獎機率。" }),
        el("li", { text: "小額玩家同樣有機會中獎。" })
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
  function contributorsModal() {
    var cs = HL.mock.makeContributors();
    HL.ui.modal("本期貢獻榜", [
      el("p", { class: "ax-muted", text: "貢獻值反映活躍度，不等於中獎機率。" }),
      el("div", { class: "ax-panel" }, cs.map(function (r) {
        return el("div", { class: "ax-row" }, [
          el("span", { style: "width:24px", class: "ax-muted", text: "#" + r.rank }),
          el("span", { class: "nm", text: r.name }),
          el("span", { class: "ax-muted", text: "押 " + money(r.bet) }),
          el("b", { text: r.score + " 分" })
        ]);
      })),
      demoTag()
    ]);
  }
  function navModal() {
    HL.ui.modal("前往遊玩", [
      el("p", { class: "ax-muted", text: "任意有效遊玩都會推進全球獎，選擇你想前往的地方：" }),
      btnRow([
        ["⚔️ 前往競技場", function () { HL.router.go("duel", "pool_ab"); }],
        ["🎰 前往娛樂城", function () { HL.ui.comingSoon("娛樂城"); }],
        ["📡 前往直播房", function () { openRoom(HL.mock.idols[0]); }],
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
    var cd = el("span", { text: pad(Math.floor(left / 60)) + ":" + pad(left % 60) });
    HL.ticker.add(function () {
      viewers += rint(-30, 60); if (viewers < 100) viewers = 100; vEl.textContent = viewers.toLocaleString();
      if (Math.random() < 0.3) { followers += rint(0, 3); fEl.textContent = String(followers); }
      left = left > 0 ? left - 1 : rint(40, 90); cd.textContent = pad(Math.floor(left / 60)) + ":" + pad(left % 60);
    });
    return el("div", { class: "ax-idol", style: "background:linear-gradient(160deg," + idol.c1 + "," + idol.c2 + ")" }, [
      el("div", { class: "ax-idol__live", text: "● LIVE" }),
      el("div", { class: "ax-idol__av", text: idol.emoji, onClick: function () { idolIntroModal(idol); } }),
      el("div", { class: "ax-idol__body" }, [
        el("div", { class: "ax-idol__name" }, [idol.name, el("span", { class: "ax-idol__style", text: idol.style })]),
        el("div", { class: "ax-idol__game", text: "正在玩：" + idol.game }),
        el("div", { class: "ax-idol__meta" }, [
          el("span", {}, ["👁 ", vEl]), el("span", {}, ["🎯 跟注 ", fEl]), el("span", { class: "ax-muted" }, ["⏱ ", cd])
        ]),
        el("button", { class: "ax-btn-join ax-idol__enter", text: "進入直播間", onClick: function () { openRoom(idol); } })
      ])
    ]);
  }

  function idolsSection() {
    return el("section", {}, [
      el("div", { class: "ax-section-title" }, [
        el("h2", {}, ["📡 虛擬偶像直播主"]),
        el("span", { class: "ax-demo-tag", text: "虛擬主持 · 非真人直播" })
      ]),
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

  // 直播間（寬版 Modal）
  function openRoom(idol) {
    var mode = "watch"; // watch | follow
    var stake = 50;
    var pickSide = idol.game === "對押挑戰" ? "A" : "莊";
    var left = rint(15, 30);

    var cdEl = el("b", { text: String(left) });
    var totalEl = el("b", { text: money(rint(50, 400) * 1000) });
    var viewersEl = el("b", { text: rint(1000, 9000).toLocaleString() });

    var chatBox = el("div", { class: "ax-room__chat" });
    function addChat(m) { chatBox.appendChild(el("div", { class: "ax-cmsg ax-feed-item" }, [el("span", { class: "ax-cmsg__av", text: (m.name || "?").charAt(0) }), el("div", {}, [el("div", { class: "ax-cmsg__name", text: m.name }), el("div", { class: "ax-cmsg__text", text: m.text })])])); while (chatBox.children.length > 30) chatBox.removeChild(chatBox.firstChild); chatBox.scrollTop = chatBox.scrollHeight; }
    for (var i = 0; i < 5; i++) addChat({ name: pick(HL.mock.fakeNames) + rint(10, 99), text: pick(["跟一注", "主持穩", "上車", "這局看好", "GoGo"]) });

    var modeBtn = el("button", { class: "ax-btn-ghost", text: "目前：觀看模式（點此切換跟注）" });
    var stakeWrap = el("div", { class: "ax-stakes", style: "display:none" });
    [10, 50, 100, 500].forEach(function (v) {
      stakeWrap.appendChild(el("button", { class: "ax-stake" + (v === stake ? " is-picked" : ""), text: String(v), onClick: function () { stake = v; Array.prototype.forEach.call(stakeWrap.children, function (c) { c.classList.remove("is-picked"); }); this.classList.add("is-picked"); } }));
    });
    var followBtn = el("button", { class: "ax-btn-primary", text: "確認跟注", style: "display:none" });

    modeBtn.addEventListener("click", function () {
      mode = mode === "watch" ? "follow" : "watch";
      modeBtn.textContent = mode === "watch" ? "目前：觀看模式（點此切換跟注）" : "目前：跟注模式（點此切回觀看）";
      stakeWrap.style.display = mode === "follow" ? "flex" : "none";
      followBtn.style.display = mode === "follow" ? "block" : "none";
    });
    followBtn.addEventListener("click", function () {
      HL.ui.modal("確認跟注", [
        el("div", { class: "ax-panel" }, [kv("直播主本局選擇", pickSide), kv("跟注金額", money(stake)), kv("風險提示", "可能全部輸掉", "ax-red")]),
        el("button", { class: "ax-btn-primary", text: "確認加入本局", onClick: function () { Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m, i) { if (i === document.querySelectorAll(".ax-modal-mask").length - 1) m.remove(); }); HL.ui.toast("已跟注 " + money(stake) + "（Demo）", "ok"); addChat({ name: "你", text: "跟注 " + money(stake) }); } }),
        el("span", { class: "ax-demo-tag", text: "Demo · 不扣真錢" })
      ]);
    });

    var input = el("input", { type: "text", placeholder: "說點什麼…（Demo）" });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && input.value.trim()) { addChat({ name: "你", text: input.value.trim() }); input.value = ""; } });

    var ref = HL.ui.modal("📡 " + idol.name + " 直播間", [
      el("div", { class: "ax-room" }, [
        el("div", { class: "ax-room__stats" }, [
          el("span", {}, ["👁 在線 ", viewersEl]), el("span", {}, ["💰 本局總跟注 ", totalEl]),
          el("span", {}, ["⏱ 本局倒數 ", cdEl, " 秒"]), el("span", { class: "ax-gold" }, ["🏆 本局大獎"])
        ]),
        el("div", { class: "ax-room__grid" }, [
          el("div", { class: "ax-room__idol", style: "background:linear-gradient(160deg," + idol.c1 + "," + idol.c2 + ")" }, [
            el("div", { class: "ax-room__emoji", text: idol.emoji }),
            el("div", { class: "ax-room__name", text: idol.name }),
            el("div", { class: "ax-muted", text: idol.style + " · LIVE" })
          ]),
          el("div", { class: "ax-room__game" }, [
            el("div", { class: "ax-room__gtitle", text: "本局遊戲：" + idol.game }),
            el("div", { class: "ax-muted", text: "直播主本局選擇：" + pickSide }),
            modeBtn, stakeWrap, followBtn,
            el("a", { class: "ax-link", text: "玩法說明 ›", onClick: roomRulesModal })
          ]),
          el("div", { class: "ax-room__side" }, [el("div", { class: "ax-muted", text: "聊天室" }), chatBox, el("div", { class: "ax-chat__input" }, [input, el("button", { class: "ax-chat__send", text: "➤", onClick: function () { if (input.value.trim()) { addChat({ name: "你", text: input.value.trim() }); input.value = ""; } } })])])
        ]),
        el("span", { class: "ax-demo-tag", text: "虛擬主持 · Demo 演繹 · 非真人直播" })
      ])
    ], { wide: true });

    // 直播間動態：倒數、聊天、開獎（視窗關閉即停止）
    var tickFn = HL.ticker.add(function () {
      if (!document.body.contains(cdEl)) { HL.ticker.remove(tickFn); return; }
      left--;
      if (left <= 0) {
        var winner = pick(HL.mock.fakeNames) + rint(10, 99);
        addChat({ name: "系統", text: "本局結果：" + pickSide + " 勝　恭喜 " + winner + " 獲得大獎！" });
        HL.ui.toast(winner + " 跟注獲得大獎（Demo）", "ok");
        left = rint(15, 30); totalEl.textContent = money(rint(50, 400) * 1000);
      }
      cdEl.textContent = String(left);
      if (Math.random() < 0.5) addChat({ name: pick(HL.mock.fakeNames) + rint(10, 99), text: pick(["跟一注", "主持神準", "上車 🚀", "穩", "再來"]) });
    });
  }

  function roomRulesModal() {
    HL.ui.modal("直播房玩法", [
      el("ul", { class: "ax-rules" }, [
        el("li", { text: "可純觀看，不一定要下注。" }),
        el("li", { text: "想參與時切換為跟注模式。" }),
        el("li", { text: "跟注需再次確認後才加入本局。" }),
        el("li", { text: "結果與獎勵皆為 Demo 假資料。" })
      ]),
      el("span", { class: "ax-demo-tag", text: "虛擬主持 · Demo 演繹 · 非真人" })
    ]);
  }

  /* =========================================================
   * 3. 國戰系統
   * ========================================================= */
  function frontline(cells, f) {
    if (f === "ally") { var m = -1; cells.forEach(function (c) { if (c.owner === "ally") m = Math.max(m, c.i); }); return m; }
    var n = cells.length; cells.forEach(function (c) { if (c.owner === "horde") n = Math.min(n, c.i); }); return n;
  }
  function warStep() {
    var st = HL.state.get(); if (st.war.winner) return;
    var cells = st.war.cells, center = Math.floor(cells.length / 2);
    var f = Math.random() < 0.5 ? "ally" : "horde";
    var fl = frontline(cells, f);
    var target = f === "ally" ? fl + 1 : fl - 1;
    if (target < 0 || target >= cells.length || cells[target].owner) return;
    var dist = Math.abs(target - center);
    var chance = 0.16 + 0.55 * (dist / center); // 越靠中心越低
    if (Math.random() > chance) return;
    var who = (st.myFaction === f && Math.random() < 0.25) ? "你" : pick(HL.mock.fakeNames) + rint(10, 99);
    var reward = rint(2, 12) * 100;
    cells[target].owner = f; cells[target].last = who;
    HL.state.set({ war: st.war });
    pushFeed(who + " 為" + HL.mock.factions[f].name + "佔領前線格 +" + money(reward));
    if (target === center) {
      st.war.winner = f; HL.state.set({ war: st.war });
      HL.ui.toast(HL.mock.factions[f].name + " 佔領中央格，本期勝利！（Demo）", "ok");
      pushFeed("🏆 " + HL.mock.factions[f].name + " 佔領中央勝利格！本期結束");
      setTimeout(resetWar, 6000);
    }
    renderWar();
  }
  function resetWar() {
    var st = HL.state.get();
    st.war.cells = HL.mock.initWarCells(); st.war.winner = null;
    HL.state.set({ war: st.war });
    renderWar(); pushFeed("國戰地圖已重置，新一期開戰！");
  }

  function renderWar() {
    if (!mapEl) return;
    HL.dom.clear(mapEl);
    var st = HL.state.get(), cells = st.war.cells, center = Math.floor(cells.length / 2);
    var F = HL.mock.factions;
    cells.forEach(function (c) {
      var cls = "ax-cell";
      if (c.i === center) cls += " is-center";
      if (c.owner === "ally") cls += " is-ally";
      else if (c.owner === "horde") cls += " is-horde";
      mapEl.appendChild(el("div", {
        class: cls, title: c.owner ? F[c.owner].name : "中立",
        onClick: function () { cellModal(c, center); }
      }, [c.i === center ? "👑" : (c.owner ? F[c.owner].emoji : "·")]));
    });
  }

  function cellModal(c, center) {
    var F = HL.mock.factions;
    var dist = Math.abs(c.i - center);
    HL.ui.modal(c.i === center ? "中央勝利格" : "格子資訊", [
      el("div", { class: "ax-panel" }, [
        kv("目前佔領", c.owner ? F[c.owner].name : "中立"),
        kv("最近觸發者", c.last || "—"),
        kv("距離中心", dist + " 格"),
        kv("觸發難度", dist <= 1 ? "極高" : dist <= 2 ? "高" : "中", dist <= 1 ? "ax-red" : ""),
        kv("格子獎金", money(rint(2, 12) * 100))
      ]),
      c.i === center ? el("p", { class: "ax-muted", text: "中央格是勝利條件：先佔領的勢力本期勝出，成員可獲得本期獎勵。" }) : el("p", { class: "ax-muted", text: "越靠近中心，觸發機率越低。機率事件，不保證觸發。" }),
      demoTag()
    ]);
  }

  function warSection() {
    var st = HL.state.get(), F = HL.mock.factions;
    mapEl = el("div", { class: "ax-warmap" });
    renderWar();

    var myF = st.myFaction ? F[st.myFaction] : null;
    return el("section", { class: "ax-war" }, [
      el("div", { class: "ax-section-title" }, [
        el("h2", {}, ["🗺️ 國戰系統"]),
        el("span", { class: "ax-demo-tag", text: "機率事件 · 不保證觸發" })
      ]),
      el("div", { class: "ax-war__head" }, [
        el("div", { class: "ax-war__faction", style: "color:" + F.ally.color }, [F.ally.emoji + " " + F.ally.name + " ← 由左推進"]),
        el("div", { class: "ax-war__vs", text: "VS" }),
        el("div", { class: "ax-war__faction", style: "color:" + F.horde.color }, ["由右推進 → " + F.horde.name + " " + F.horde.emoji])
      ]),
      mapEl,
      el("div", { class: "ax-war__bar" }, [
        el("div", {}, ["我的勢力：", el("b", { id: "ax-myfaction", text: myF ? (myF.emoji + " " + myF.name) : "尚未選擇" })]),
        el("div", { class: "ax-war__btns" }, [
          el("button", { class: "ax-btn-join", text: st.myFaction ? "已加入" : "選擇勢力", onClick: chooseFactionModal }),
          el("button", { class: "ax-btn-ghost ax-ge-btn", text: "戰爭英雄榜", onClick: heroesModal }),
          el("button", { class: "ax-btn-ghost ax-ge-btn", text: "我的戰功", onClick: myDeedsModal }),
          el("button", { class: "ax-btn-ghost ax-ge-btn", text: "中央格規則", onClick: function () { cellModal({ i: 5, owner: null, last: null }, 5); } })
        ])
      ]),
      el("p", { class: "ax-ge-note", text: "💡 你不需要大額下注，每次有效遊玩都有機率為勢力推進；但越接近勝利，戰況越艱難。" })
    ]);
  }

  function chooseFactionModal() {
    if (HL.state.get().myFaction) { HL.ui.toast("本期已選擇勢力，不可更換", "warn"); return; }
    var F = HL.mock.factions;
    function join(k) {
      HL.state.set({ myFaction: k });
      var b = document.getElementById("ax-myfaction"); if (b) b.textContent = F[k].emoji + " " + F[k].name;
      Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m) { m.remove(); });
      HL.ui.toast("已加入 " + F[k].name + "（本期不可更換）", "ok");
      pushFeed("你 加入了 " + F[k].name + "！");
    }
    HL.ui.modal("選擇勢力", [
      el("p", { class: "ax-muted", text: "本期選擇後不可更換：" }),
      el("div", { class: "ax-faction-pick" }, [
        el("button", { class: "ax-faction-opt", style: "border-color:" + F.ally.color, onClick: function () { join("ally"); } }, [el("div", { class: "ax-faction-opt__ic", text: F.ally.emoji }), el("b", { text: F.ally.name }), el("small", { class: "ax-muted", text: "由左側推進" })]),
        el("button", { class: "ax-faction-opt", style: "border-color:" + F.horde.color, onClick: function () { join("horde"); } }, [el("div", { class: "ax-faction-opt__ic", text: F.horde.emoji }), el("b", { text: F.horde.name }), el("small", { class: "ax-muted", text: "由右側推進" })])
      ]),
      demoTag()
    ]);
  }
  function heroesModal() {
    var F = HL.mock.factions;
    var rows = [];
    for (var i = 0; i < 8; i++) { var f = Math.random() < 0.5 ? "ally" : "horde"; rows.push({ name: pick(HL.mock.fakeNames) + rint(10, 99), f: f, hits: rint(3, 40), gold: rint(5, 80) * 100, acts: rint(20, 300) }); }
    rows.sort(function (a, b) { return b.hits - a.hits; });
    HL.ui.modal("戰爭英雄榜", [
      el("div", { class: "ax-panel" }, rows.map(function (r, i) {
        return el("div", { class: "ax-row" }, [
          el("span", { style: "width:24px", class: "ax-muted", text: "#" + (i + 1) }),
          el("span", { class: "nm", text: r.name }),
          el("span", { style: "color:" + F[r.f].color, text: F[r.f].emoji }),
          el("span", { class: "ax-muted", text: "佔領 " + r.hits }),
          el("b", { class: "ax-gold", text: money(r.gold) })
        ]);
      })),
      demoTag()
    ]);
  }
  function myDeedsModal() {
    var st = HL.state.get(), F = HL.mock.factions;
    HL.ui.modal("我的戰功", [
      el("div", { class: "ax-panel" }, [
        kv("我的勢力", st.myFaction ? (F[st.myFaction].emoji + " " + F[st.myFaction].name) : "尚未選擇"),
        kv("有效行動數", String(rint(10, 80))),
        kv("觸發佔領次數", String(rint(0, 12))),
        kv("本期獎金", money(rint(0, 40) * 100), "ax-gold"),
        kv("最近觸發", st.myFaction ? "前線格 +" + money(rint(2, 12) * 100) : "—")
      ]),
      demoTag()
    ]);
  }

  /* =========================================================
   * 右側：我的參與狀態 / 事件動態 / 上一期入口
   * ========================================================= */
  function renderFeed() {
    if (!feedEl) return;
    HL.dom.clear(feedEl);
    var f = HL.state.get().globeFeed;
    if (!f.length) { feedEl.appendChild(el("p", { class: "ax-muted", text: "等待事件…" })); return; }
    f.slice(0, 12).forEach(function (ev) { feedEl.appendChild(el("div", { class: "ax-row ax-feed-item" }, [el("span", { class: "ax-muted", text: "•" }), el("span", { class: "nm", text: ev.txt })])); });
  }
  function rail() {
    var e = HL.mock.globeEvent, st = HL.state.get(), F = HL.mock.factions;
    var pct = Math.min(100, Math.round((st.myEffectiveBet / e.threshold) * 100));
    statusEl = el("div", { class: "ax-panel" }, [
      el("h4", { text: "我的參與狀態" }),
      el("div", { class: "ax-ge-prog__line" }, [el("span", { class: "ax-muted", text: "WORLD EVENT 進度" }), el("b", { text: pct + "%" })]),
      el("div", { class: "ax-progress", style: "margin:6px 0 12px" }, [el("i", { style: "width:" + pct + "%" })]),
      kv("我的勢力", st.myFaction ? (F[st.myFaction].emoji + " " + F[st.myFaction].name) : "尚未選擇"),
      kv("追蹤直播主", "AI Luna")
    ]);
    feedEl = el("div", { class: "ax-panel" }, []);
    var feedWrap = el("div", { class: "ax-panel" }, [el("h4", { text: "最新事件通知" }), feedEl]);

    return el("div", { class: "ax-globe__rail" }, [
      statusEl,
      feedWrap,
      el("button", { class: "ax-btn-ghost", text: "🏆 上一期得獎入口", onClick: lastWinnersModal })
    ]);
  }

  /* ---------- 組裝 ---------- */
  function render() {
    // 動態：國戰每 2-4 秒嘗試一次推進
    var warTimer = rint(2, 4);
    HL.ticker.add(function () { warTimer--; if (warTimer <= 0) { warStep(); warTimer = rint(2, 4); } });
    // 種子事件
    if (!HL.state.get().globeFeed.length) {
      pushFeed("聯盟 正在向中心推進");
      pushFeed("部落 佔領一處前線格");
    }

    var node = el("div", { class: "ax-globe ax-fade-in" }, [
      el("div", { class: "ax-globe__main" }, [
        eventSection(),
        idolsSection(),
        warSection()
      ]),
      rail()
    ]);
    setTimeout(renderFeed, 0);
    return node;
  }

  HL.views = HL.views || {};
  HL.views.globe = { render: render };
})(window);

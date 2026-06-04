/*
 * Apex Win｜對押池玩法（核心可玩迴圈）
 * 單局狀態：idle → ready → countdown → resolving → result。
 * 規則：玩家選一方 + 參與額 → 加入（扣款）→ 倒數 → 開獎 →
 *       輸方池扣平台抽水 2% 後由勝方按投注比例分配 → 結算 → 再玩 / 返回。
 * 結果可由 Demo 工具控制（隨機 / 強制贏 / 強制輸 / 假玩家爆贏）。
 * 註冊於 window.HL.views.duel。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var rint = function (a, b) { return HL.mock.rint(a, b); };

  var STAKES = [10, 50, 100, 500];

  // 模組內單局狀態
  var pool, phase, pickedSide, pickedStake, fakePlayers, arenaEl, sideEl, lastResult, backView;

  // 某一方的潛在賠率（pari-mutuel，含抽水）
  function multiplier(thisPct, otherPct, rake) {
    return 1 + (otherPct / thisPct) * (1 - rake / 100);
  }

  function genFakePlayers() {
    var n = rint(5, 8);
    var used = {};
    var list = [];
    for (var i = 0; i < n; i++) {
      var nm = HL.mock.pick(HL.mock.fakeNames) + rint(10, 99);
      if (used[nm]) { nm += rint(0, 9); }
      used[nm] = true;
      list.push({
        name: nm,
        side: Math.random() < pool.a.pct / 100 ? "a" : "b",
        stake: HL.mock.pick([10, 50, 100, 100, 500]),
        joined: false,
        result: null
      });
    }
    return list;
  }

  // 決定本局勝方（回傳 'a' | 'b'），尊重 Demo 結果設定
  function decideWinner() {
    var mode = HL.state.get().demo.result;
    if (mode === "win") return pickedSide;
    if (mode === "lose" || mode === "fakeBig") return pickedSide === "a" ? "b" : "a";
    // random：以該方百分比作為勝率
    return Math.random() < pool.a.pct / 100 ? "a" : "b";
  }

  function settle(winner) {
    var s = HL.state.get();
    var win = winner === pickedSide;
    var winSide = pool[winner];
    var loseSide = pool[winner === "a" ? "b" : "a"];
    var rake = pool.rakePct;

    var payout = 0, profit = 0;
    if (win) {
      var losingPool = pool.pool * (loseSide.pct / 100);
      var distributable = losingPool * (1 - rake / 100);
      var winningPool = pool.pool * (winSide.pct / 100);
      var share = pickedStake / (winningPool + pickedStake);
      profit = Math.round(distributable * share);
      payout = pickedStake + profit; // 退回本金 + 分配利潤
      HL.state.set({ balance: s.balance + payout });
    } else {
      // 已於加入時扣款，輸局不退回；更新今日損失限制
      HL.state.set({ lossLimitRemaining: Math.max(0, s.lossLimitRemaining - pickedStake) });
    }
    HL.shell.refreshChrome();

    // 假玩家結果
    fakePlayers.forEach(function (fp) { fp.result = fp.side === winner ? "win" : "lose"; });

    // 動態 Feed：本局事件
    addFeed({ txt: "你 " + (win ? "贏得 " + money(payout) : "輸掉 " + money(pickedStake)), type: win ? "win" : "lose" });
    if (HL.state.get().demo.result === "fakeBig" || (!win && Math.random() < 0.5)) {
      var star = HL.mock.pick(fakePlayers.filter(function (f) { return f.result === "win"; }));
      if (star) addFeed({ txt: star.name + " 爆贏 " + money(rint(80, 300) * 1000) + "！", type: "win" });
    }
    nudgeLeaderboard(win, profit);

    lastResult = { win: win, payout: payout, profit: profit, winner: winner };
    phase = "result";
    renderArena();
    renderSide();
  }

  function nudgeLeaderboard(win, profit) {
    var lb = HL.state.get().leaderboard.slice();
    // 玩家大贏時演繹擠進榜單
    if (win && profit > 60000) {
      lb.push({ rank: 0, name: "你", profit: profit, streak: 1, vip: 4, me: true });
    }
    lb.forEach(function (r) { r.profit += rint(-3000, 4000); });
    lb.sort(function (a, b) { return b.profit - a.profit; });
    lb = lb.slice(0, 8).map(function (r, i) { r.rank = i + 1; return r; });
    HL.state.set({ leaderboard: lb });
  }

  function addFeed(ev) {
    var feed = HL.state.get().feed.slice();
    feed.unshift(ev);
    if (feed.length > 12) feed = feed.slice(0, 12);
    HL.state.set({ feed: feed });
  }

  // ---- 操作 ----
  function pickSide(side) {
    if (phase !== "idle" && phase !== "ready") return;
    pickedSide = side;
    phase = "ready";
    renderArena();
  }
  function pickStake(v) {
    if (phase !== "idle" && phase !== "ready") return;
    pickedStake = v;
    renderArena();
  }
  function join() {
    if (phase !== "ready" || !pickedSide) { HL.ui.toast("請先選擇一方", "warn"); return; }
    var s = HL.state.get();
    if (pickedStake > s.balance) { HL.ui.toast("餘額不足", "err"); return; }
    HL.state.set({ balance: s.balance - pickedStake }); // 加入時扣款
    HL.shell.refreshChrome();
    addFeed({ txt: "你 加入了 " + pool.name + "（押 " + pool[pickedSide].label + "）", type: "join" });
    // 最後補 1-2 位假玩家
    for (var i = 0; i < rint(1, 2); i++) {
      fakePlayers.push({ name: HL.mock.pick(HL.mock.fakeNames) + rint(10, 99), side: Math.random() < 0.5 ? "a" : "b", stake: HL.mock.pick(STAKES), joined: true, result: null });
    }
    phase = "countdown";
    renderSide();
    startCountdown(3);
  }
  function startCountdown(n) {
    var c = n;
    drawCountdown(c);
    var fn = function () {
      c--;
      if (c <= 0) { HL.ticker.remove(fn); resolve(); }
      else drawCountdown(c);
    };
    HL.ticker.add(fn);
  }
  function resolve() {
    phase = "resolving";
    renderArena();
    setTimeout(function () { settle(decideWinner()); }, 900);
  }
  function replay() {
    pickedSide = null;
    pickedStake = 50;
    lastResult = null;
    fakePlayers = genFakePlayers();
    revealFakesProgressively();
    phase = "idle";
    renderArena();
    renderSide();
    HL.ui.toast("新的一局開始", "ok");
  }

  function revealFakesProgressively() {
    fakePlayers.forEach(function (fp, i) {
      setTimeout(function () {
        if (phase === "idle" || phase === "ready") { fp.joined = true; renderSide(); }
      }, 400 + i * rint(500, 1200));
    });
  }

  // ---- 畫面 ----
  function drawCountdown(n) {
    HL.dom.clear(arenaEl);
    arenaEl.appendChild(el("div", { class: "ax-countdown", text: String(n) }));
    arenaEl.appendChild(el("p", { class: "ax-muted", style: "text-align:center", text: "開獎倒數中…" }));
  }

  function sideCard(key) {
    var side = pool[key];
    var other = pool[key === "a" ? "b" : "a"];
    var mult = multiplier(side.pct, other.pct, pool.rakePct);
    var cls = "ax-side";
    if (pickedSide === key && (phase === "ready" || phase === "idle")) cls += " is-picked";
    if (phase === "result" && lastResult) cls += lastResult.winner === key ? " is-win" : " is-lose";
    return el("div", { class: cls, onClick: function () { pickSide(key); }, style: "border-color:" + (pickedSide === key ? "" : "") }, [
      el("div", { class: "ax-side__label", style: "color:" + side.color, text: side.label }),
      el("div", { class: "ax-side__pct", text: side.pct + "% 押注" }),
      el("div", { class: "ax-side__mult", text: "x" + mult.toFixed(2) })
    ]);
  }

  function renderArena() {
    HL.dom.clear(arenaEl);

    if (phase === "resolving") {
      arenaEl.appendChild(el("div", { class: "ax-countdown", text: "✦" }));
      arenaEl.appendChild(el("p", { class: "ax-muted", style: "text-align:center", text: "開獎中…" }));
      return;
    }

    if (phase === "result" && lastResult) {
      var r = lastResult;
      arenaEl.appendChild(el("div", { class: "ax-result " + (r.win ? "win" : "lose") }, [
        el("div", { class: "ax-result__title", text: r.win ? "🎉 你贏了！" : "本局未中" }),
        el("div", { class: "ax-result__amount", text: (r.win ? "+" : "-") + money(r.win ? r.payout : pickedStake) }),
        el("p", { class: "ax-muted", text: "開獎結果：" + pool[r.winner].label + " 勝　|　平台抽水 " + pool.rakePct + "%" }),
        el("div", { class: "ax-result__actions" }, [
          el("button", { class: "ax-btn-ghost", text: backView === "arena" ? "返回競技場" : "返回大廳", onClick: function () { HL.router.go(backView); } }),
          el("button", { class: "ax-btn-primary", text: "再玩一局", onClick: replay })
        ])
      ]));
      return;
    }

    // idle / ready
    arenaEl.appendChild(el("div", { class: "ax-sides" }, [
      sideCard("a"),
      el("div", { class: "ax-vs-mid", text: "VS" }),
      sideCard("b")
    ]));

    var balance = HL.state.get().balance;
    arenaEl.appendChild(el("div", { class: "ax-stakes" }, STAKES.map(function (v) {
      return el("button", {
        class: "ax-stake" + (pickedStake === v ? " is-picked" : ""),
        text: money(v).replace("NT$ ", ""),
        disabled: v > balance ? "" : null,
        onClick: function () { pickStake(v); }
      });
    })));

    arenaEl.appendChild(el("button", {
      class: "ax-btn-primary",
      text: pickedSide ? ("加入挑戰 · 押 " + pool[pickedSide].label + " " + money(pickedStake)) : "請先選擇 A 或 B",
      disabled: pickedSide ? null : "",
      onClick: join
    }));
    arenaEl.appendChild(el("p", { class: "ax-muted", style: "text-align:center;margin-top:10px", text: "輸方池扣除平台抽水 " + pool.rakePct + "% 後，由勝方依投注比例分配" }));
  }

  function renderSide() {
    HL.dom.clear(sideEl);
    var s = HL.state.get();

    // 假玩家
    var joined = fakePlayers.filter(function (f) { return f.joined; });
    var playersPanel = el("div", { class: "ax-panel" }, [
      el("h4", { text: "本局玩家 · " + (joined.length + (phase === "idle" || phase === "ready" ? 0 : 1)) + " 人（含你）" })
    ]);
    joined.forEach(function (fp) {
      playersPanel.appendChild(el("div", { class: "ax-row ax-feed-item" }, [
        el("span", { class: "av", text: fp.name.charAt(0) }),
        el("span", { class: "nm", text: fp.name }),
        el("span", { style: "color:" + pool[fp.side].color, text: pool[fp.side].label }),
        fp.result ? el("span", { class: fp.result === "win" ? "ax-green" : "ax-red", text: fp.result === "win" ? "贏" : "輸" }) : el("span", { class: "ax-muted", text: money(fp.stake).replace("NT$ ", "") })
      ]));
    });
    sideEl.appendChild(playersPanel);

    // Feed
    var feedPanel = el("div", { class: "ax-panel" }, [el("h4", { text: "即時動態" })]);
    s.feed.slice(0, 6).forEach(function (ev) {
      feedPanel.appendChild(el("div", { class: "ax-row ax-feed-item" }, [
        el("span", { class: ev.type === "win" ? "ax-green" : ev.type === "lose" ? "ax-red" : "ax-muted", text: "•" }),
        el("span", { class: "nm", text: ev.txt })
      ]));
    });
    if (!s.feed.length) feedPanel.appendChild(el("p", { class: "ax-muted", text: "等待動態…" }));
    sideEl.appendChild(feedPanel);

    // 排行榜
    var lbPanel = el("div", { class: "ax-panel" }, [el("h4", { text: "今日排行榜" })]);
    s.leaderboard.slice(0, 6).forEach(function (r) {
      lbPanel.appendChild(el("div", { class: "ax-row" + (r.me ? " ax-feed-item" : "") }, [
        el("span", { style: "width:20px", class: "ax-muted", text: "#" + r.rank }),
        el("span", { class: "av", text: (r.name || "?").charAt(0) }),
        el("span", { class: "nm" + (r.me ? " ax-gold" : ""), text: r.name }),
        el("span", { class: r.profit >= 0 ? "ax-green" : "ax-red", text: (r.profit >= 0 ? "+" : "") + money(r.profit).replace("NT$ ", "") })
      ]));
    });
    sideEl.appendChild(lbPanel);
  }

  function render(poolId) {
    var all = HL.mock.pools.concat([HL.mock.officialDuel]);
    pool = all.filter(function (p) { return p.id === (poolId || "pool_ab"); })[0] || HL.mock.pools[0];
    backView = pool.id === "pool_duel" ? "arena" : "lobby";
    phase = "idle";
    pickedSide = null;
    pickedStake = 50;
    lastResult = null;
    fakePlayers = genFakePlayers();
    revealFakesProgressively();

    arenaEl = el("div", { class: "ax-arena" });
    sideEl = el("div");
    renderArena();
    renderSide();
    // 假玩家陸續加入時刷新人數
    HL.ticker.add(function () { if (phase === "idle" || phase === "ready") renderSide(); });

    var pa = pool.a, pb = pool.b;
    return el("div", { class: "ax-duel ax-fade-in" }, [
      el("a", { class: "ax-duel__back", text: backView === "arena" ? "‹ 返回競技場" : "‹ 返回大廳", onClick: function () { HL.router.go(backView); } }),
      el("div", { class: "ax-duel__top" }, [
        el("div", {}, [
          el("div", { class: "ax-duel__title", text: "對押池 · " + pool.name }),
          el("span", { class: "ax-demo-tag", text: "Demo 玩法 · 抽水 " + pool.rakePct + "%" })
        ]),
        el("div", { class: "ax-duel__stats" }, [
          el("div", { class: "ax-stat" }, [el("small", { text: "總獎池" }), el("b", { class: "ax-gold", text: money(pool.pool) })]),
          el("div", { class: "ax-stat" }, [el("small", { text: "你的餘額" }), el("b", { id: "ax-duel-balance", text: money(HL.state.get().balance) })])
        ])
      ]),
      el("div", { class: "ax-duel__board" }, [arenaEl, sideEl])
    ]);
  }

  HL.views = HL.views || {};
  HL.views.duel = { render: render };
})(window);

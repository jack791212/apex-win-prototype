/*
 * Apex Win｜大廳（首頁）
 * 版面：左主欄（World Event Hero、促銷輪播、熱門對押池、Hot Games、New Games）
 *       右側欄（最新巨獎大獎牆，持續刷新）。
 * 註冊於 window.HL.views.lobby。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;

  function reltime(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5) return "剛剛";
    if (s < 60) return s + " 秒前";
    var m = Math.floor(s / 60);
    if (m < 60) return m + " 分前";
    return Math.floor(m / 60) + " 小時前";
  }
  function sectionTitle(title, linkText, onLink) {
    return HL.ui.sectionTitle(title, { extras: [
      linkText ? HL.dom.linkable(el("a", { class: "ax-link", text: linkText, onClick: onLink || function () { HL.ui.toast("Demo：更多內容建構中", "warn"); } })) : null
    ] });
  }

  /* ---------- World Event Hero ---------- */
  function hero() {
    var w = HL.mock.worldEvent;
    var left = w.endsInSec;
    var cdEl = el("b", {});
    function draw() { cdEl.textContent = HL.dom.dhms(left); } // 沿用共用 helper（見 core/dom.js）
    draw();
    HL.ticker.add(function () { left = left > 0 ? left - 1 : w.endsInSec; draw(); });

    return el("section", {
      class: "ax-hero ax-fade-in",
      onClick: function () {
        HL.ui.modal("世界活動 · " + w.title, [
          el("p", { text: w.subtitle }),
          el("p", { class: "ax-muted", text: "參與玩家 " + w.players.toLocaleString() + " 人　|　進度 " + w.pct + "%" }),
          el("span", { class: "ax-demo-tag", text: "Demo 活動演繹" })
        ]);
      }
    }, [
      el("div", { class: "ax-hero__timer" }, [
        el("small", { class: "ax-muted", text: "活動結束倒數" }), cdEl
      ]),
      el("div", { class: "ax-hero__tag", text: w.tag }),
      el("h1", { class: "ax-hero__title", text: w.title }),
      el("div", { class: "ax-hero__sub", text: w.subtitle }),
      el("div", { class: "ax-hero__stats" }, [
        el("div", {}, [el("small", { class: "ax-muted", text: w.prizeLabel }), el("div", { class: "ax-hero__pool", text: money(w.pool) })]),
        el("div", {}, [el("small", { class: "ax-muted", text: "參與玩家" }), el("div", { class: "ax-hero__players", text: "👥 " + w.players.toLocaleString() })])
      ]),
      HL.ui.progress(w.pct),
      el("div", { class: "ax-hero__pctline" }, [el("span", { class: "ax-gold", text: w.pct + "%" }), el("span", { class: "ax-muted", text: " 已達成" })])
    ]);
  }

  /* ---------- Hero 並排：World Event（縮窄）+ 新上線遊戲推薦 ---------- */
  function newGamePromo() {
    var g = (HL.games && HL.games.byId) ? (HL.games.byId("shadow-ritual") || {}) : {};
    var art = g.thumb
      ? el("img", { class: "ax-newgame__artimg", src: g.thumb, alt: "暗影儀式" })
      : el("div", { class: "ax-newgame__art", text: "🎰" });
    if (g.thumb) art.addEventListener("error", function () { var f = el("div", { class: "ax-newgame__art", text: "🎰" }); if (this.parentNode) this.parentNode.replaceChild(f, this); });
    return el("section", { class: "ax-newgame", onClick: function () { HL.router.go("slot"); } }, [
      el("div", { class: "ax-newgame__tag", text: "🔥 新上線遊戲館" }),
      art,
      el("div", { class: "ax-newgame__name", text: "暗影儀式" }),
      el("div", { class: "ax-newgame__sub", text: "Shadow Ritual · 連爆 ways slot" }),
      el("button", { class: "ax-btn-primary ax-newgame__cta", text: "立即遊玩 ▶", onClick: function (e) { e.stopPropagation(); HL.router.go("slot"); } })
    ]);
  }
  function heroRow() { return el("div", { class: "ax-hero-row" }, [hero(), newGamePromo()]); }

  /* ---------- 限時錦標賽橫幅（接 #15 賽事頁） ---------- */
  function tournamentBanner() {
    if (!HL.tournament) return null;
    var st = HL.tournament.status();
    return el("section", { class: "ax-tny-banner", onClick: function () { HL.router.go("tournament"); } }, [
      el("div", { class: "ax-tny-banner__l" }, [
        el("div", { class: "ax-tny-banner__tag", text: "🏆 限時錦標賽 · 進行中" }),
        el("div", { class: "ax-tny-banner__title", text: st.name + " · 獎池 " + money(st.pool) }),
        el("small", { class: "ax-muted", text: "玩任一遊戲累積積分，賽末自動派彩 · 我的名次 " + (st.myRank <= 3 ? "🏅" : "#") + st.myRank })
      ]),
      el("button", { class: "ax-btn-primary", onClick: function (e) { e.stopPropagation(); HL.router.go("tournament"); }, text: "立即參賽 →" })
    ]);
  }

  /* ---------- 促銷活動輪播（3 顯示 / 共 6，可拖曳，放開校正，自動輪替） ---------- */
  // 輪播與卡片機制沿用 HL.ui.carousel / HL.ui.promoCard（跨 view 共用，見 core/ui.js）。
  function promoCarousel() {
    var vp = HL.ui.carousel(HL.mock.promos, function (p) {
      return HL.ui.promoCard(p, { ctaText: "立即參加", onCta: function () { HL.ui.comingSoon(p.title); } });
    });
    var dots = el("div", { class: "ax-promo__dots" });
    return el("section", {}, [sectionTitle("🎁 促銷活動"), vp, dots]);
  }

  /* ---------- 熱門玩家擂台（接競技場真實開房） ---------- */
  function hotRoomsSection() {
    var rooms = HL.state.get().arenaRooms.slice()
      .sort(function (a, b) { return (b.challenges || 0) - (a.challenges || 0); })
      .slice(0, 8);
    return el("section", {}, [
      sectionTitle("🔥 熱門玩家擂台", "查看全部 ›", function () { HL.router.go("arena"); }),
      el("div", { class: "ax-room-grid" }, rooms.map(function (r) { return HL.arenaUI.roomCard(r); }))
    ]);
  }

  /* ---------- 遊戲館（Hot / New Games） ---------- */
  // 遊戲卡沿用 HL.ui.gameCard（跨 view 共用）；大廳版：只顯示「可玩」緞帶、無熱度角標/試玩鈕。
  function gameCard(g) {
    return HL.ui.gameCard(g, {
      onClick: function () { g.playable ? HL.games.launch(g) : HL.ui.comingSoon(HL.games.title(g)); }
    });
  }
  function gamesSection(title, games) {
    return el("section", {}, [
      sectionTitle(title, "查看全部 ›"),
      el("div", { class: "ax-game-grid" }, games.map(gameCard))
    ]);
  }

  /* ---------- 最新巨獎（大獎牆，持續刷新，最多 200） ---------- */
  function bwRow(w, isNew) {
    return el("div", { class: "ax-bw__row" + (isNew ? " is-new" : "") }, [
      el("span", { class: "ax-bw__ic", style: "background:" + w.color, text: w.ic }),
      el("div", { class: "ax-bw__mid" }, [
        el("div", { class: "ax-bw__name" }, [
          el("b", { text: w.name }),
          w.real ? el("span", { class: "ax-bw__real", text: "✓ 真" }) : null,
          el("small", { class: "ax-muted", text: " · " + reltime(w.time) })
        ]),
        el("small", { class: "ax-muted", text: w.type + " · " + w.game })
      ]),
      el("div", { class: "ax-bw__amt" }, [
        el("b", { class: "ax-green", text: money(w.win) }),
        el("small", { class: "ax-muted", text: "投 " + money(w.bet) })
      ])
    ]);
  }
  // 真實開獎紀錄（big_wins 資料表）→ 牆面分類樣式
  function bwMeta(game) {
    if (/Battle|對戰|對押/i.test(game)) return { t: "對戰", ic: "⚔️", color: "#36a6ff" };
    if (/賞金/.test(game)) return { t: "賞金局", ic: "💰", color: "#ffb524" };
    if (/小雞|Chicken/i.test(game)) return { t: "ORIGINALS", ic: "🐔", color: "#2fd17a" };
    return { t: "SLOT", ic: "🎰", color: "#9d80ff" };
  }
  function nextDelay() {
    var sp = HL.state.get().demo.bigWinSpeed;
    var base = sp === "fast" ? 1 : sp === "slow" ? 5 : 2;
    var span = sp === "fast" ? 2 : sp === "slow" ? 4 : 3;
    return base + Math.floor(Math.random() * span);
  }
  function bigWinsWall() {
    var list = el("div", { class: "ax-bw__list" });
    var realRows = []; // 會員模式：big_wins 資料表的真實開獎（與 Demo 動態依時間混排，掛 ✓ 真 標記）
    function renderList() {
      HL.dom.clear(list);
      var all = realRows.concat(HL.state.get().bigWins).sort(function (a, b) { return b.time - a.time; });
      all.slice(0, 40).forEach(function (w, i) { list.appendChild(bwRow(w, i === 0)); });
    }
    function fetchReal() {
      if (!(HL.auth && HL.auth.backend() && HL.auth.user())) return;
      HL.api.feedWins(30).then(function (rows) {
        if (!rows || !rows.length || !document.body.contains(list)) return;
        realRows = rows.map(function (r) {
          var m = bwMeta(r.game || "");
          return { time: new Date(r.created_at).getTime(), type: m.t, ic: m.ic, color: m.color, name: r.name || "玩家", game: r.game || "—", bet: +r.bet || 0, win: +r.win || 0, real: true };
        });
        renderList();
      });
    }
    renderList();
    fetchReal();
    var countdown = nextDelay(), rcount = 0;
    HL.ticker.add(function () {
      countdown--; rcount++;
      if (rcount % 45 === 0) fetchReal(); // 每 45 秒刷新一次真實開獎
      if (countdown <= 0) {
        var arr = HL.state.get().bigWins.slice();
        arr.unshift(HL.mock.makeBigWin());
        if (arr.length > 200) arr = arr.slice(0, 200);
        HL.state.set({ bigWins: arr });
        renderList();
        countdown = nextDelay();
      }
    });
    return el("aside", { class: "ax-bw" }, [
      el("div", { class: "ax-bw__head" }, [
        el("span", {}, ["🏆 最新巨獎"]),
        el("span", { class: "ax-bw__live", text: "● LIVE" })
      ]),
      list
    ]);
  }

  /* ---------- 組裝 ---------- */
  function render() {
    return el("div", { class: "ax-lobby ax-fade-in" }, [
      el("div", { class: "ax-lobby__main" }, [
        heroRow(),
        tournamentBanner(),
        promoCarousel(),
        hotRoomsSection(),
        gamesSection("🔥 Hot Games", HL.games.hot()),
        gamesSection("⭐ New Games", HL.games["new"]())
      ]),
      el("div", { class: "ax-lobby__rail" }, [bigWinsWall()])
    ]);
  }

  HL.views = HL.views || {};
  HL.views.lobby = { render: render };
})(window);

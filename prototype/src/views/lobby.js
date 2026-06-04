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

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtMS(sec) { return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60); }
  function reltime(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5) return "剛剛";
    if (s < 60) return s + " 秒前";
    var m = Math.floor(s / 60);
    if (m < 60) return m + " 分前";
    return Math.floor(m / 60) + " 小時前";
  }
  function sectionTitle(title, linkText, onLink) {
    return el("div", { class: "ax-section-title" }, [
      el("h2", { text: title }),
      linkText ? el("a", { class: "ax-link", text: linkText, onClick: onLink || function () { HL.ui.toast("Demo：更多內容建構中", "warn"); } }) : null
    ]);
  }

  /* ---------- World Event Hero ---------- */
  function hero() {
    var w = HL.mock.worldEvent;
    var left = w.endsInSec;
    var cdEl = el("b", {});
    function draw() {
      var d = Math.floor(left / 86400);
      var r = left % 86400;
      cdEl.textContent = pad(d) + "天 " + pad(Math.floor(r / 3600)) + ":" + pad(Math.floor((r % 3600) / 60)) + ":" + pad(r % 60);
    }
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
      el("div", { class: "ax-progress" }, [el("i", { style: "width:" + w.pct + "%" })]),
      el("div", { class: "ax-hero__pctline" }, [el("span", { class: "ax-gold", text: w.pct + "%" }), el("span", { class: "ax-muted", text: " 已達成" })])
    ]);
  }

  /* ---------- 促銷活動輪播（3 顯示 / 共 6，可拖曳，放開校正，自動輪替） ---------- */
  function promoCard(p) {
    return el("div", { class: "ax-promo__card", style: "background:linear-gradient(120deg," + p.c1 + "," + p.c2 + ")" }, [
      el("div", { class: "ax-promo__tag", text: p.tag }),
      el("div", { class: "ax-promo__title", text: p.title }),
      el("div", { class: "ax-promo__sub", text: p.sub }),
      el("div", { class: "ax-promo__ic", text: p.ic }),
      el("button", { class: "ax-promo__cta", text: "立即參加", onClick: function () { HL.ui.comingSoon(p.title); } })
    ]);
  }
  function promoCarousel() {
    var promos = HL.mock.promos;
    var visible = 3;
    var maxIdx = Math.max(0, promos.length - visible);
    var track = el("div", { class: "ax-promo__track" }, promos.map(promoCard));
    var vp = el("div", { class: "ax-promo__vp" }, [track]);

    var idx = 0, step = 0, dragging = false, startX = 0, startTx = 0, curTx = 0, tcount = 0;
    function calc() { var f = track.children[0]; if (!f) return; var gap = parseFloat(getComputedStyle(track).gap) || 16; step = f.getBoundingClientRect().width + gap; }
    function apply(anim) { track.style.transition = anim ? "transform .35s var(--ax-ease)" : "none"; curTx = -idx * step; track.style.transform = "translateX(" + curTx + "px)"; }
    function go(i) { idx = Math.max(0, Math.min(maxIdx, i)); apply(true); }

    vp.addEventListener("pointerdown", function (e) { calc(); dragging = true; vp.setPointerCapture(e.pointerId); startX = e.clientX; startTx = curTx; track.style.transition = "none"; });
    vp.addEventListener("pointermove", function (e) { if (!dragging) return; curTx = startTx + (e.clientX - startX); track.style.transform = "translateX(" + curTx + "px)"; });
    function endDrag() { if (!dragging) return; dragging = false; if (step) idx = Math.round(-curTx / step); go(idx); }
    vp.addEventListener("pointerup", endDrag);
    vp.addEventListener("pointercancel", endDrag);

    HL.ticker.add(function () { if (dragging) return; tcount++; if (tcount % 5 === 0) { calc(); idx = idx >= maxIdx ? 0 : idx + 1; apply(true); } });
    setTimeout(function () { calc(); apply(false); }, 0);

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
  function gameCard(g) {
    return el("div", { class: "ax-game", style: "background:linear-gradient(160deg," + g.c1 + "," + g.c2 + ")", onClick: function () { HL.ui.comingSoon(g.title); } }, [
      el("button", { class: "ax-game__fav", onClick: function (e) { e.stopPropagation(); HL.ui.toast("已收藏（Demo）", "ok"); } }, ["♡ ", el("span", { text: String(g.fav) })]),
      el("div", { class: "ax-game__body" }, [
        el("div", { class: "ax-game__title", text: g.title }),
        el("div", { class: "ax-game__prov", text: g.provider })
      ])
    ]);
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
  function nextDelay() {
    var sp = HL.state.get().demo.bigWinSpeed;
    var base = sp === "fast" ? 1 : sp === "slow" ? 5 : 2;
    var span = sp === "fast" ? 2 : sp === "slow" ? 4 : 3;
    return base + Math.floor(Math.random() * span);
  }
  function bigWinsWall() {
    var list = el("div", { class: "ax-bw__list" });
    function renderList() {
      HL.dom.clear(list);
      HL.state.get().bigWins.slice(0, 40).forEach(function (w, i) { list.appendChild(bwRow(w, i === 0)); });
    }
    renderList();
    var countdown = nextDelay();
    HL.ticker.add(function () {
      countdown--;
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
        hero(),
        promoCarousel(),
        hotRoomsSection(),
        gamesSection("🔥 Hot Games", HL.mock.hotGames),
        gamesSection("⭐ New Games", HL.mock.newGames)
      ]),
      el("div", { class: "ax-lobby__rail" }, [bigWinsWall()])
    ]);
  }

  HL.views = HL.views || {};
  HL.views.lobby = { render: render };
})(window);

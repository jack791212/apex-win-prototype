/*
 * Apex Win｜娛樂城（傳統 web casino 大廳）
 * 搜尋 + 分類頁籤 + 多區塊遊戲牆 + 供應商。
 * 遊戲皆為 Demo 示意，未接入真實遊戲。註冊於 window.HL.views.casino。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  var filter = "all"; // all | hot | new | <catKey>
  var query = "";
  var contentEl, tabsEl;

  function catName(key) {
    var c = HL.mock.casinoCats.filter(function (x) { return x.key === key; })[0];
    return c ? c.name : key;
  }

  function matchQ(g) {
    if (!query) return true;
    var q = query.toLowerCase();
    return g.title.toLowerCase().indexOf(q) >= 0 || g.provider.toLowerCase().indexOf(q) >= 0 || (g.author && g.author.toLowerCase().indexOf(q) >= 0);
  }
  function matchFilter(g) {
    if (filter === "all") return true;
    if (filter === "hot") return g.hot;
    if (filter === "new") return g.isNew;
    if (filter.indexOf("author:") === 0) return g.author === filter.slice(7); // 依作者暱稱
    return g.cat === filter;
  }

  function gameCard(g) {
    var ribbon = g.playable ? el("span", { class: "ax-game__ribbon play", text: "▶ 可玩" })
      : g.comingSoon ? el("span", { class: "ax-game__ribbon soon", text: "即將推出" })
      : g.hot ? el("span", { class: "ax-game__ribbon hot", text: "HOT" })
      : g.isNew ? el("span", { class: "ax-game__ribbon new", text: "NEW" }) : null;
    return el("div", {
      class: "ax-game" + (g.playable ? " is-playable" : "") + (g.comingSoon ? " is-soon" : ""), style: "background:linear-gradient(160deg," + g.c1 + "," + g.c2 + ")",
      onClick: function () {
        if (g.playable) { HL.games.launch(g); return; }
        if (g.comingSoon) { HL.ui.modal(g.title + "（即將推出）", [el("p", { class: "ax-muted", text: "Apex Studio 原創遊戲 · " + catName(g.cat) }), el("p", { text: "這款原創遊戲正在開發中，敬請期待！" }), el("span", { class: "ax-demo-tag", text: "Coming Soon" })]); return; }
        HL.ui.modal(g.title, [el("p", { class: "ax-muted", text: "供應商：" + g.provider + "　|　分類：" + catName(g.cat) }), el("p", { text: "Demo：遊戲示意，尚未接入真實遊戲。" }), el("span", { class: "ax-demo-tag", text: "Demo 假資料" })]);
      }
    }, [
      ribbon,
      el("button", { class: "ax-game__fav", onClick: function (e) { e.stopPropagation(); HL.ui.toast("已收藏（Demo）", "ok"); } }, ["♡ ", el("span", { text: String(g.fav) })]),
      el("div", { class: "ax-game__body" }, [
        el("div", { class: "ax-game__title", text: g.title }),
        el("div", { class: "ax-game__prov", text: g.provider + (g.author ? " · 🎨" + g.author : "") })
      ])
    ]);
  }

  function grid(list) { return el("div", { class: "ax-game-grid" }, list.map(gameCard)); }

  function section(title, list, moreFilter) {
    return el("section", {}, [
      el("div", { class: "ax-section-title" }, [
        el("h2", { text: title }),
        el("a", { class: "ax-link", text: "查看全部 ›", onClick: function () { setFilter(moreFilter); } })
      ]),
      grid(list.slice(0, 14))
    ]);
  }

  function authorsRow() {
    var list = HL.games && HL.games.authors ? HL.games.authors() : [];
    if (!list.length) return null;
    return el("section", {}, [
      el("div", { class: "ax-section-title" }, [el("h2", { text: "🎨 我們的開發者（依暱稱）" })]),
      el("div", { class: "ax-providers" }, list.map(function (a) {
        return el("button", { class: "ax-provider", text: a.nick + "（" + a.count + "）", onClick: function () { setFilter("author:" + a.nick); } });
      }))
    ]);
  }
  function providersRow() {
    return el("section", {}, [
      el("div", { class: "ax-section-title" }, [el("h2", { text: "🏢 遊戲供應商" })]),
      el("div", { class: "ax-providers" }, HL.mock.casinoProviders.map(function (p) {
        return el("button", { class: "ax-provider", text: p, onClick: function () { query = p; if (searchInput) searchInput.value = p; renderContent(); } });
      }))
    ]);
  }

  /* ---------- 廣告牌：娛樂城促銷輪播（3 顯示 / 共 6，可拖曳，自動輪替） ---------- */
  function promoCard(p) {
    return el("div", { class: "ax-promo__card", style: "background:linear-gradient(120deg," + p.c1 + "," + p.c2 + ")" }, [
      el("div", { class: "ax-promo__tag", text: p.tag }),
      el("div", { class: "ax-promo__title", text: p.title }),
      el("div", { class: "ax-promo__sub", text: p.sub }),
      el("div", { class: "ax-promo__ic", text: p.ic }),
      el("button", { class: "ax-promo__cta", text: "立即前往", onClick: function () { p.cat ? setFilter(p.cat) : HL.ui.comingSoon(p.title); } })
    ]);
  }
  function promoCarousel() {
    var promos = HL.mock.casinoPromos;
    var visible = 3, maxIdx = Math.max(0, promos.length - visible);
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
    return el("div", { class: "ax-casino__board" }, [vp]);
  }

  function renderContent() {
    HL.dom.clear(contentEl);
    var games = HL.games.all(); // 單一來源：遊戲登錄表

    // 搜尋或指定分類 → 單一結果牆
    if (query || filter !== "all") {
      var res = games.filter(function (g) { return matchFilter(g) && matchQ(g); });
      var label = query ? ("搜尋「" + query + "」") : (filter === "hot" ? "熱門遊戲" : filter === "new" ? "最新遊戲" : filter.indexOf("author:") === 0 ? ("🎨 開發者 " + filter.slice(7)) : catName(filter));
      contentEl.appendChild(el("div", { class: "ax-section-title" }, [el("h2", { text: label + "　" }), el("span", { class: "ax-muted", text: res.length + " 款遊戲" })]));
      contentEl.appendChild(res.length ? grid(res) : el("p", { class: "ax-muted", text: "找不到符合的遊戲。" }));
      return;
    }

    // 預設：多區塊
    var hot = games.filter(function (g) { return g.hot; });
    var nw = games.filter(function (g) { return g.isNew; });
    contentEl.appendChild(section("🔥 熱門遊戲", hot, "hot"));
    contentEl.appendChild(section("⭐ 最新遊戲", nw, "new"));
    HL.mock.casinoCats.forEach(function (c) {
      contentEl.appendChild(section(c.name, games.filter(function (g) { return g.cat === c.key; }), c.key));
    });
    var ar = authorsRow(); if (ar) contentEl.appendChild(ar);
    contentEl.appendChild(providersRow());
  }

  function renderTabs() {
    HL.dom.clear(tabsEl);
    var tabs = [{ k: "all", n: "全部" }, { k: "hot", n: "熱門" }, { k: "new", n: "最新" }]
      .concat(HL.mock.casinoCats.map(function (c) { return { k: c.key, n: c.name }; }));
    tabs.forEach(function (t) {
      tabsEl.appendChild(el("button", {
        class: "ax-tab" + (filter === t.k && !query ? " is-active" : ""),
        text: t.n, onClick: function () { setFilter(t.k); }
      }));
    });
  }

  function setFilter(k) {
    filter = k; query = ""; if (searchInput) searchInput.value = "";
    renderTabs(); renderContent();
    var m = document.getElementById("ax-main-content"); if (m) m.scrollTop = 0;
  }

  var searchInput;
  function render() {
    filter = "all"; query = "";
    searchInput = el("input", { type: "text", placeholder: "搜尋遊戲或供應商…" });
    searchInput.addEventListener("input", function () { query = searchInput.value.trim(); renderTabs(); renderContent(); });

    var bar = el("div", { class: "ax-casino__bar" }, [
      el("div", { class: "ax-search" }, [el("span", { class: "ax-search__ic", text: "🔍" }), searchInput]),
      el("button", { class: "ax-btn-ghost ax-casino__pick", text: "🎲 隨機遊戲", onClick: function () { var g = HL.mock.pick(HL.games.all()); HL.ui.toast("隨機選中：" + g.title, "ok"); gameCardOpen(g); } })
    ]);

    tabsEl = el("div", { class: "ax-tabs" });
    contentEl = el("div", {});
    renderTabs(); renderContent();

    return el("div", { class: "ax-casino ax-fade-in" }, [
      el("div", { class: "ax-casino__head" }, [
        el("div", {}, [el("h1", { class: "ax-casino__title", text: "娛樂城 CASINO" }), el("p", { class: "ax-muted", text: "你喜愛的遊戲，盡在一處。所有遊戲為 Demo 示意。" })]),
        el("span", { class: "ax-demo-tag", text: "Demo · 未接入真實遊戲" })
      ]),
      // 廣告牌：娛樂城促銷輪播（6 連播）
      promoCarousel(),
      bar,
      tabsEl,
      contentEl
    ]);
  }

  function gameCardOpen(g) {
    HL.ui.modal(g.title, [el("p", { class: "ax-muted", text: "供應商：" + g.provider + "　|　分類：" + catName(g.cat) }), el("p", { text: "Demo：遊戲示意，尚未接入真實遊戲。" }), el("span", { class: "ax-demo-tag", text: "Demo 假資料" })]);
  }

  HL.views = HL.views || {};
  HL.views.casino = { render: render };
})(window);

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
    return g.title.toLowerCase().indexOf(q) >= 0 || g.provider.toLowerCase().indexOf(q) >= 0;
  }
  function matchFilter(g) {
    if (filter === "all") return true;
    if (filter === "hot") return g.hot;
    if (filter === "new") return g.isNew;
    return g.cat === filter;
  }

  function gameCard(g) {
    return el("div", {
      class: "ax-game" + (g.playable ? " is-playable" : ""), style: "background:linear-gradient(160deg," + g.c1 + "," + g.c2 + ")",
      onClick: function () {
        if (g.playable) { HL.router.go("slot"); return; }
        HL.ui.modal(g.title, [el("p", { class: "ax-muted", text: "供應商：" + g.provider + "　|　分類：" + catName(g.cat) }), el("p", { text: "Demo：遊戲示意，尚未接入真實遊戲。" }), el("span", { class: "ax-demo-tag", text: "Demo 假資料" })]);
      }
    }, [
      g.playable ? el("span", { class: "ax-game__ribbon play", text: "▶ 可玩" }) : (g.hot ? el("span", { class: "ax-game__ribbon hot", text: "HOT" }) : (g.isNew ? el("span", { class: "ax-game__ribbon new", text: "NEW" }) : null)),
      el("button", { class: "ax-game__fav", onClick: function (e) { e.stopPropagation(); HL.ui.toast("已收藏（Demo）", "ok"); } }, ["♡ ", el("span", { text: String(g.fav) })]),
      el("div", { class: "ax-game__body" }, [
        el("div", { class: "ax-game__title", text: g.title }),
        el("div", { class: "ax-game__prov", text: g.provider })
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

  function providersRow() {
    return el("section", {}, [
      el("div", { class: "ax-section-title" }, [el("h2", { text: "🏢 遊戲供應商" })]),
      el("div", { class: "ax-providers" }, HL.mock.casinoProviders.map(function (p) {
        return el("button", { class: "ax-provider", text: p, onClick: function () { query = p; if (searchInput) searchInput.value = p; renderContent(); } });
      }))
    ]);
  }

  function renderContent() {
    HL.dom.clear(contentEl);
    var games = HL.mock.casinoGames;

    // 搜尋或指定分類 → 單一結果牆
    if (query || filter !== "all") {
      var res = games.filter(function (g) { return matchFilter(g) && matchQ(g); });
      var label = query ? ("搜尋「" + query + "」") : (filter === "hot" ? "熱門遊戲" : filter === "new" ? "最新遊戲" : catName(filter));
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
      el("button", { class: "ax-btn-ghost ax-casino__pick", text: "🎲 隨機遊戲", onClick: function () { var g = HL.mock.pick(HL.mock.casinoGames); HL.ui.toast("隨機選中：" + g.title, "ok"); gameCardOpen(g); } })
    ]);

    tabsEl = el("div", { class: "ax-tabs" });
    contentEl = el("div", {});
    renderTabs(); renderContent();

    return el("div", { class: "ax-casino ax-fade-in" }, [
      el("div", { class: "ax-casino__head" }, [
        el("div", {}, [el("h1", { class: "ax-casino__title", text: "娛樂城 CASINO" }), el("p", { class: "ax-muted", text: "你喜愛的遊戲，盡在一處。所有遊戲為 Demo 示意。" })]),
        el("span", { class: "ax-demo-tag", text: "Demo · 未接入真實遊戲" })
      ]),
      // 歡迎彩金橫幅
      el("div", { class: "ax-casino__promo" }, [
        el("div", {}, [el("div", { class: "ax-promo__tag", text: "新玩家專屬" }), el("div", { class: "ax-promo__title", text: "100% 首儲獎金　最高 NT$30,000 + 200 免費旋轉" })]),
        el("button", { class: "ax-btn-join", text: "領取彩金", onClick: function () { HL.ui.comingSoon("首儲獎金"); } })
      ]),
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

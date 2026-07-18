/*
 * Apex Win｜娛樂城（傳統 web casino 大廳）
 * 搜尋 + 分類頁籤 + 多區塊遊戲牆 + 供應商。
 * 遊戲皆為 Demo 示意，未接入真實遊戲。註冊於 window.HL.views.casino。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; } // i18n：無則回預設(zh-Hant)文案

  var filter = "all"; // all | hot | new | <catKey>
  var query = "";
  var sortBy = "default"; // default | popular | new | az
  var contentEl, tabsEl;

  function sortList(list) {
    var a = list.slice();
    if (sortBy === "popular") a.sort(function (x, y) { return (y.fav || 0) - (x.fav || 0); });
    else if (sortBy === "new") a.sort(function (x, y) { return ((y.isNew ? 1 : 0) - (x.isNew ? 1 : 0)) || ((y.fav || 0) - (x.fav || 0)); });
    else if (sortBy === "az") a.sort(function (x, y) { return HL.games.title(x).localeCompare(HL.games.title(y)); });
    return a;
  }
  function sortControl() {
    var sel = el("select", { class: "ax-sort" });
    [["default", t("sort.default", "推薦")], ["popular", t("sort.popular", "熱門")], ["new", t("sort.new", "最新")], ["az", t("sort.az", "A-Z")]].forEach(function (o) {
      var op = el("option", { value: o[0], text: o[1] }); if (o[0] === sortBy) op.selected = true; sel.appendChild(op);
    });
    sel.addEventListener("change", function () { sortBy = sel.value; renderContent(); });
    return el("label", { class: "ax-sort__wrap" }, [el("span", { class: "ax-muted", text: t("sort", "排序") }), sel]);
  }

  function catName(key) {
    var c = HL.mock.casinoCats.filter(function (x) { return x.key === key; })[0];
    return t("cat." + key, c ? c.name : key);
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
    if (filter === "fav") return HL.fav.has(g.id); // 我的最愛
    if (filter === "community") return g.community; // 同仁開發放置區
    if (filter.indexOf("author:") === 0) return g.author === filter.slice(7); // 依作者暱稱
    return g.cat === filter;
  }

  // 真錢遊玩：已核照→直接玩；否則說明真金模式（提款待牌照），可切換或改試玩
  function realPlay(g) {
    if (HL.money && HL.money.canWithdraw()) { HL.games.launch(g); return; }
    var isReal = HL.money && HL.money.isReal();
    var m = HL.ui.modal("💵 真錢遊玩 · " + HL.games.title(g), [
      el("p", { class: "ax-muted", text: isReal
        ? "真金模式已開啟，但提款／兌換待牌照核發；目前以體驗額度遊玩。"
        : "目前為休閒模式（遊戲幣）。真錢遊玩需切換真金模式，且提款待牌照核發。" }),
      el("div", { class: "ax-modal__actions" }, [
        isReal ? null : el("button", { class: "ax-btn-primary", text: "切換真金模式", onClick: function () { m.close(); if (HL.money) HL.money.setMode("real"); HL.ui.toast("已切換真金模式（提款待牌照）", "ok"); } }),
        el("button", { class: "ax-btn-ghost", text: "改用試玩開始", onClick: function () { m.close(); HL.games.launch(g); } })
      ]),
      el("span", { class: "ax-demo-tag", text: "提款／兌換待牌照 · canWithdraw() 已閘控" })
    ]);
  }

  // 遊戲卡沿用 HL.ui.gameCard（與大廳共用，見 core/ui.js）；娛樂城版：完整緞帶 + 熱度角標 + 試玩/真錢雙鈕。
  function gameCard(g) {
    var actions = g.playable ? el("div", { class: "ax-game__btns" }, [
      el("button", { class: "ax-game__btn is-demo", text: t("card.demo", "▶ 試玩"), onClick: function (e) { e.stopPropagation(); HL.games.launch(g); } }),
      el("button", { class: "ax-game__btn is-real", text: t("card.real", "💵 真錢"), onClick: function (e) { e.stopPropagation(); realPlay(g); } })
    ]) : null;
    return HL.ui.gameCard(g, {
      ribbon: "full", heat: true, soon: true, actions: actions,
      favCb: function () { if (filter === "fav") renderContent(); },
      onClick: function () {
        if (g.playable) { HL.games.launch(g); return; }
        if (g.comingSoon) { HL.ui.modal(g.title + "（即將推出）", [el("p", { class: "ax-muted", text: "Apex Studio 原創遊戲 · " + catName(g.cat) }), el("p", { text: "這款原創遊戲正在開發中，敬請期待！" }), el("span", { class: "ax-demo-tag", text: "Coming Soon" })]); return; }
        HL.ui.modal(g.title, [el("p", { class: "ax-muted", text: "供應商：" + g.provider + "　|　分類：" + catName(g.cat) }), el("p", { text: "Demo：遊戲示意，尚未接入真實遊戲。" }), el("span", { class: "ax-demo-tag", text: "Demo 假資料" })]);
      }
    });
  }

  function grid(list) { return el("div", { class: "ax-game-grid" }, list.map(gameCard)); }

  function section(title, list, moreFilter) {
    return el("section", {}, [
      HL.ui.sectionTitle(title, { extras: [
        moreFilter ? HL.dom.linkable(el("a", { class: "ax-link", text: t("more", "查看全部 ›"), onClick: function () { setFilter(moreFilter); } })) : null
      ] }),
      grid(list.slice(0, 14))
    ]);
  }

  function authorsRow() {
    var list = HL.games && HL.games.authors ? HL.games.authors() : [];
    if (!list.length) return null;
    return el("section", {}, [
      HL.ui.sectionTitle(t("sec.authors", "🎨 我們的開發者（依暱稱）")),
      el("div", { class: "ax-providers" }, list.map(function (a) {
        return el("button", { class: "ax-provider", text: a.nick + "（" + a.count + "）", onClick: function () { setFilter("author:" + a.nick); } });
      }))
    ]);
  }
  function providersRow() {
    return el("section", {}, [
      HL.ui.sectionTitle(t("sec.providers", "🏢 遊戲供應商")),
      el("div", { class: "ax-providers" }, HL.mock.casinoProviders.map(function (p) {
        return el("button", { class: "ax-provider", text: p, onClick: function () { query = p; if (searchInput) searchInput.value = p; renderContent(); } });
      }))
    ]);
  }

  /* ---------- 廣告牌：娛樂城促銷輪播（3 顯示 / 共 6，可拖曳，自動輪替） ---------- */
  // 沿用 HL.ui.carousel / HL.ui.promoCard（與大廳共用，見 core/ui.js）。
  function promoCarousel() {
    var vp = HL.ui.carousel(HL.mock.casinoPromos, function (p) {
      return HL.ui.promoCard(p, { ctaText: "立即前往", onCta: function () { if (p.go && HL.router) HL.router.go(p.go); else if (p.cat) setFilter(p.cat); else HL.ui.comingSoon(p.title); } });
    });
    return el("div", { class: "ax-casino__board" }, [vp]);
  }

  function renderContent() {
    HL.dom.clear(contentEl);
    var games = HL.games.all(); // 單一來源：遊戲登錄表

    // 搜尋或指定分類 → 單一結果牆
    if (query || filter !== "all") {
      var res = sortList(games.filter(function (g) { return matchFilter(g) && matchQ(g); }));
      var label = query ? ("搜尋「" + query + "」") : (filter === "hot" ? "熱門遊戲" : filter === "new" ? "最新遊戲" : filter === "fav" ? "♥ 我的最愛" : filter === "community" ? "🧪 同仁開發遊戲（放置區）" : filter.indexOf("author:") === 0 ? ("🎨 開發者 " + filter.slice(7)) : catName(filter));
      contentEl.appendChild(HL.ui.sectionTitle(label + "　", { cls: "ax-section-title--sort", extras: [el("span", { class: "ax-muted", text: res.length + " " + t("unit.games", "款遊戲") }), sortControl()] }));
      contentEl.appendChild(res.length ? grid(res) : el("p", { class: "ax-muted", text: t("nores", "找不到符合的遊戲。") }));
      return;
    }

    // 預設：多區塊
    // 當下最熱牆（依近期下注的即時熱度，置頂強化發現性）
    if (HL.heat) contentEl.appendChild(HL.heat.wall(8));
    var rec = HL.games.recent ? HL.games.recent() : [];
    if (rec.length) contentEl.appendChild(section(t("sec.recent", "🕘 最近遊玩"), rec, null));
    var favs = games.filter(function (g) { return HL.fav.has(g.id); });
    var hot = games.filter(function (g) { return g.hot; });
    var nw = games.filter(function (g) { return g.isNew; });
    var community = games.filter(function (g) { return g.community; });
    if (favs.length) contentEl.appendChild(section(t("sec.fav", "♥ 我的最愛"), favs, "fav"));
    contentEl.appendChild(section(t("sec.hot", "🔥 熱門遊戲"), hot, "hot"));
    contentEl.appendChild(section(t("sec.new", "⭐ 最新遊戲"), nw, "new"));
    // 同仁開發放置區（外部 games/ 動態載入；無則不顯示）
    if (community.length) contentEl.appendChild(section(t("sec.community", "🧪 同仁開發遊戲（放置區）"), community, "community"));
    HL.mock.casinoCats.forEach(function (c) {
      contentEl.appendChild(section(catName(c.key), games.filter(function (g) { return g.cat === c.key; }), c.key));
    });
    var ar = authorsRow(); if (ar) contentEl.appendChild(ar);
    contentEl.appendChild(providersRow());
  }

  function renderTabs() {
    var tabs = [{ k: "all", n: t("tab.all", "全部") }, { k: "hot", n: t("tab.hot", "熱門") }, { k: "new", n: t("tab.new", "最新") }, { k: "fav", n: t("tab.fav", "♥ 收藏") }]
      .concat(HL.mock.casinoCats.map(function (c) { return { k: c.key, n: catName(c.key) }; }));
    HL.ui.tabs(tabsEl, tabs, function (k) { setFilter(k); }, { isActive: function (it) { return filter === it.k && !query; } });
  }

  function setFilter(k) {
    filter = k; query = ""; if (searchInput) searchInput.value = "";
    renderTabs(); renderContent();
    var m = document.getElementById("ax-main-content"); if (m) m.scrollTop = 0;
  }

  var searchInput, searchTimer;
  function render() {
    filter = "all"; query = ""; sortBy = "default";
    searchInput = el("input", { type: "text", placeholder: t("casino.search", "搜尋遊戲或供應商…") });
    searchInput.addEventListener("input", function () { // 防抖：停止輸入 220ms 才查詢
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { query = searchInput.value.trim(); renderTabs(); renderContent(); }, 220);
    });

    var bar = el("div", { class: "ax-casino__bar" }, [
      el("div", { class: "ax-search" }, [el("span", { class: "ax-search__ic", text: "🔍" }), searchInput]),
      el("button", { class: "ax-btn-ghost ax-casino__pick", text: t("casino.random", "🎲 隨機遊戲"), onClick: function () { var g = HL.mock.pick(HL.games.all()); HL.ui.toast("隨機選中：" + g.title, "ok"); gameCardOpen(g); } })
    ]);

    tabsEl = el("div", { class: "ax-tabs" });
    contentEl = el("div", {});
    renderTabs(); renderContent();

    return el("div", { class: "ax-casino ax-fade-in" }, [
      el("div", { class: "ax-casino__head" }, [
        el("div", {}, [el("h1", { class: "ax-casino__title", text: t("casino.title", "娛樂城 CASINO") }), el("p", { class: "ax-muted", text: t("casino.sub", "你喜愛的遊戲，盡在一處。所有遊戲為 Demo 示意。") })]),
        el("span", { class: "ax-demo-tag", text: t("casino.demotag", "Demo · 未接入真實遊戲") })
      ]),
      // 累積彩金橫幅（即時遞增 + 命中演出）
      HL.jackpot ? HL.jackpot.banner() : null,
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

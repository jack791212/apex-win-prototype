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

  /* 玩家看到的那個字。`HL.i18n.t` 是相容 passthrough（直接回 def），真正的翻譯由 i18n 的 DOM 層
   * 在文字節點上做 ⇒ 入口標籤在程式裡**一律是 zh-Hant**，而英文/簡體玩家看到的是譯文。
   * 只把 zh-Hant 那一面搜得到＝死巷只修掉一種語言（而且是最不需要修的那種）。
   * 字典查不到的標籤本來就原樣顯示，已由原標籤涵蓋 ⇒ 這裡只補「有譯文」的那些。 */
  function localized(label) {
    if (!HL.i18n || !HL.i18n.dict || HL.i18n.current() === "zh-Hant") return null;
    var d = HL.i18n.dict()[HL.i18n.current()];
    return d && d[label] ? d[label] : null;
  }
  /* 搜尋的乾草堆 ＝ 這款遊戲自己的欄位 ＋ **它落在哪些「玩家看得見的入口」**的名字。
   * 後者刻意向 `allEntries()`（頁籤列的同一份來源）反推，不是在這裡另列一張表——
   * 原本本函式只認 title/provider/author 三個硬寫欄位，於是**畫面上印著的字打進搜尋框會得到
   * 「找不到符合的遊戲」**：修前實測 15/15 個入口的標籤（六個分類名 ＋ 五條體感桶名）與兩個軸名
   * 全是死巷，而那些字**都是我們自己印在畫面上**的。
   * ⇒ 兩份清單分開時，`data/game-traits.js` 每加一條軸就多一條死巷（加軸的人不會經過本檔）；
   *   共讀一份則新軸自動可搜。「全部」刻意排除：人人都屬於它，打進去等於沒篩。
   * ⚠️ 本段刻意**不舉任何一條軸或桶的名字**當例子：本檔連一條軸的名字都不該知道，而既有兩條
   *   反向鎖正在擋這件事、其中一條連註解裡的字也算。 */
  function searchWords(g) {
    var w = [g.title, g.provider, g.author || ""];
    allEntries().forEach(function (tb) {
      if (tb.k === "all" || !matchFilter(g, tb.k)) return;
      w.push(tb.n);
      var lz = localized(tb.n); if (lz) w.push(lz);
    });
    // 頁籤上只印**桶**名，但玩家會打**軸**名 ⇒ 有落進任一桶就把該軸的名字也算進去（名字由軸自己提供）
    if (HL.gameAxes) HL.gameAxes.enabled().forEach(function (a) {
      for (var i = 0; i < a.buckets.length; i++) {
        if (HL.gameAxes.match(g, HL.gameAxes.keyOf(a.key, a.buckets[i].key))) {
          w.push(a.label);
          var lzA = localized(a.label); if (lzA) w.push(lzA);
          break;
        }
      }
    });
    return w.join(" ");
  }
  /* 全站**唯一**的搜尋述詞。無狀態（`query` 由呼叫點餵進來）⇒ 常駐鎖可以直接問它，
   * 不必自己再實作一次比對。
   * ⚠️ 刻意**不留** `matchQ(g)` 這種「順手讀畫面狀態」的包裝：首版留了一個，而負向擾動當場
   *   證明它是個洞——把那個包裝改回硬寫 title/provider/author 三欄，玩家的搜尋就壞回去了，
   *   而鎖問的是本函式、依然全綠（＝兩份述詞、只量得到一份）。述詞只准有一個。 */
  function matchesQuery(g, q) {
    if (!q) return true;
    return searchWords(g).toLowerCase().indexOf(String(q).toLowerCase()) >= 0;
  }
  /* `k` 省略＝問「屬於當前頁籤嗎」（原行為）；給 key ＝問「屬於那個入口嗎」（searchWords 用）。 */
  function matchFilter(g, k) {
    if (k == null) k = filter;
    if (k === "all") return true;
    // 分群軸（#94）：本檔不認得任何一條軸的名字，只認得「這是不是一個軸 key」——
    // 軸與桶的定義全在 data/game-traits.js，加一條軸不必回來改這裡。缺值的遊戲由容器判 false。
    if (HL.gameAxes) { var ax = HL.gameAxes.match(g, k); if (ax !== null) return ax; }
    if (k === "hot") return !!g.hot;
    if (k === "new") return !!g.isNew;
    if (k === "fav") return HL.fav.has(g.id); // 我的最愛
    if (k === "community") return !!g.community; // 同仁開發放置區
    if (k.indexOf("author:") === 0) return g.author === k.slice(7); // 依作者暱稱
    return g.cat === k;
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
    // #54 上架排程 × 受眾分層：未宣告排程的遊戲 canPlay 逐位等於 g.playable、badge 為 null＝零回歸
    var canPlay = HL.release ? HL.release.playable(g) : g.playable;
    var actions = canPlay ? el("div", { class: "ax-game__btns" }, [
      el("button", { class: "ax-game__btn is-demo", text: t("card.demo", "▶ 試玩"), onClick: function (e) { e.stopPropagation(); HL.games.launch(g); } }),
      el("button", { class: "ax-game__btn is-real", text: t("card.real", "💵 真錢"), onClick: function (e) { e.stopPropagation(); realPlay(g); } })
    ]) : null;
    return HL.ui.gameCard(g, {
      ribbon: "full", heat: true, soon: true, actions: actions,
      badge: HL.release ? HL.release.badge(g) : null,
      favCb: function () { if (filter === "fav") renderContent(); },
      onClick: function () {
        if (canPlay) { HL.games.launch(g); return; }
        // 有排程但當下不符資格（搶先期未達受眾／尚未開放）→ 說明現在誰能玩、我何時能玩
        if (HL.release && HL.release.stateOf(g.id)) { HL.release.explain(g); return; }
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
    // #61 內容資料層：內容物改由 HL.content 註冊表供給（窗口/受眾/語系皆在查詢當下求值）。
    var items = HL.content ? HL.content.list("casino-promo") : [];
    if (!items.length) return null;
    var vp = HL.ui.carousel(items, function (p) {
      return HL.ui.promoCard(p, { ctaText: "立即前往", onCat: setFilter });
    });
    return el("div", { class: "ax-casino__board" }, [vp]);
  }

  function renderContent() {
    HL.dom.clear(contentEl);
    var games = HL.games.all(); // 單一來源：遊戲登錄表

    // 搜尋或指定分類 → 單一結果牆
    if (query || filter !== "all") {
      var res = sortList(games.filter(function (g) { return matchFilter(g) && matchesQuery(g, query); }));
      var axLabel = HL.gameAxes ? HL.gameAxes.labelOf(filter) : null; // #94：軸的標題由軸自己提供
      var label = query ? ("搜尋「" + query + "」") : axLabel ? axLabel : (filter === "hot" ? "熱門遊戲" : filter === "new" ? "最新遊戲" : filter === "fav" ? "♥ 我的最愛" : filter === "community" ? "🧪 同仁開發遊戲（放置區）" : filter.indexOf("author:") === 0 ? ("🎨 開發者 " + filter.slice(7)) : catName(filter));
      contentEl.appendChild(HL.ui.sectionTitle(label + "　", { extras: [el("span", { class: "ax-muted", text: res.length + " " + t("unit.games", "款遊戲") })] })); // 排序控制已上移至常駐 bar（S8）
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
    // S8：常駐排序套用到各區塊（sortBy=default 時 sortList 原序回傳＝維持策展；用戶選熱門/最新/A-Z 才重排）
    if (favs.length) contentEl.appendChild(section(t("sec.fav", "♥ 我的最愛"), sortList(favs), "fav"));
    contentEl.appendChild(section(t("sec.hot", "🔥 熱門遊戲"), sortList(hot), "hot"));
    contentEl.appendChild(section(t("sec.new", "⭐ 最新遊戲"), sortList(nw), "new"));
    // 同仁開發放置區（外部 games/ 動態載入；無則不顯示）
    if (community.length) contentEl.appendChild(section(t("sec.community", "🧪 同仁開發遊戲（放置區）"), sortList(community), "community"));
    HL.mock.casinoCats.forEach(function (c) {
      contentEl.appendChild(section(catName(c.key), sortList(games.filter(function (g) { return g.cat === c.key; })), c.key));
    });
    var ar = authorsRow(); if (ar) contentEl.appendChild(ar);
    contentEl.appendChild(providersRow());
  }

  /* 玩家看得見的瀏覽入口 ── **頁籤列與搜尋共讀這一份**，只有這裡知道入口有幾個、叫什麼名字。 */
  function browseTabs() {
    return [{ k: "all", n: t("tab.all", "全部") }, { k: "hot", n: t("tab.hot", "熱門") }, { k: "new", n: t("tab.new", "最新") }, { k: "fav", n: t("tab.fav", "♥ 收藏") }]
      .concat(HL.mock.casinoCats.map(function (c) { return { k: c.key, n: catName(c.key) }; }))
      // #94 分群軸：只有「真的有遊戲落進去」的桶才會回傳（空桶/只剩一桶的軸自動不出現＝不擠壓入口列）
      .concat(HL.gameAxes ? HL.gameAxes.tabs(HL.games.all()) : []);
  }
  /* 只以「區塊標題」存在、不在頁籤列的入口（目前只有放置區）。
   * 判準刻意不是「有沒有頁籤」而是「`setFilter` 進得去嗎」——進得去的入口就必須打得到，
   * 否則它只是一條長得不一樣的死巷。 */
  function offTabEntries() { return [{ k: "community", n: t("sec.community", "🧪 同仁開發遊戲（放置區）") }]; }
  function allEntries() { return browseTabs().concat(offTabEntries()); }
  function renderTabs() {
    HL.ui.tabs(tabsEl, browseTabs(), function (k) { setFilter(k); }, { isActive: function (it) { return filter === it.k && !query; } });
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
      sortControl(), // S8：排序控制常駐（不再只在篩選結果牆才出現）
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
      bar, // S8：搜尋+排序上移至最頂（Stake 搜尋優先慣例）
      // 累積彩金橫幅（即時遞增 + 命中演出）
      HL.jackpot ? HL.jackpot.banner() : null,
      // 廣告牌：娛樂城促銷輪播（6 連播）
      promoCarousel(),
      tabsEl,
      contentEl
    ]);
  }

  function gameCardOpen(g) {
    HL.ui.modal(g.title, [el("p", { class: "ax-muted", text: "供應商：" + g.provider + "　|　分類：" + catName(g.cat) }), el("p", { text: "Demo：遊戲示意，尚未接入真實遊戲。" }), el("span", { class: "ax-demo-tag", text: "Demo 假資料" })]);
  }

  HL.views = HL.views || {};
  /* `browseTabs`／`offTabEntries`／`matchesQuery` 一併對外——**因為常駐鎖必須有東西可以問**。
   * 本 repo 已五次記錄「容器做好了、接線沒補完，而畫面完全正常」（見 tests/registry-probe.js 檔頭）；
   * 「入口列印的字搜不到」正是同一家族在**搜尋詞彙**上的形狀 ⇒ 述詞不留一個無狀態出口，
   * 測項就只能改去自己實作一次比對＝第二份真相，而第二份真相不會跟著這裡一起改。 */
  HL.views.casino = { render: render, browseTabs: browseTabs, offTabEntries: offTabEntries, matchesQuery: matchesQuery };
})(window);

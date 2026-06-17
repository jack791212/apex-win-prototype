/*
 * Apex Win｜遊戲登錄表 GameList（單一資料來源 + 動態註冊）
 * 目標 2 地基：同仁自製 SLOT / 特殊 / 牌桌 / 直播遊戲都用 HL.games.register() 掛進來，
 *   並可依「作者暱稱(author)」「分類(cat)」「型別(type)」查詢與分組。
 * 載入順序：mock-data.js 之後（會 seed 既有 casinoGames）、views 之前。註冊於 window.HL.games。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  var _list = [];      // 登錄的遊戲（依註冊順序）
  var _byId = {};      // id → game

  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

  // 正規化：保留既有欄位（向後相容 casino.js），補上 id/type/author/thumb/tags/enabled/render
  function norm(m) {
    m = m || {};
    return {
      id: m.id || slug(m.title),
      title: m.title || "未命名遊戲",
      type: m.type || "slot",              // slot | table | live | special | original
      cat: m.cat || "slots",               // 既有分類 key（casinoCats）
      provider: m.provider || m.studio || "Apex Studio",
      author: m.author || null,            // ★ 作者暱稱（同仁自製遊戲用，可依此分類）
      thumb: m.thumb || null,              // 縮圖 url（null → 用 c1/c2 漸層占位）
      c1: m.c1 || "#3a1e6e", c2: m.c2 || "#160a2a",
      fav: m.fav || 0,
      hot: !!m.hot, isNew: !!m.isNew,
      playable: !!m.playable, comingSoon: !!m.comingSoon,
      route: m.route || null,              // 對應 view key（給 router 派發）
      render: m.render || null,            // 或直接給 render 函式（動態遊戲，免改 router）
      tags: m.tags || [],
      community: !!m.community,             // ★ 同仁開發放置區（外部 games/ 載入）→ 大廳獨立區塊
      enabled: m.enabled !== false,
      locales: m.locales || null           // 之後 i18n 用：{ en:{title:...}, ... }
    };
  }

  function register(meta) {
    var g = norm(meta);
    if (_byId[g.id]) { var i = _list.indexOf(_byId[g.id]); if (i >= 0) _list[i] = g; }
    else _list.push(g);
    _byId[g.id] = g;
    return g;
  }
  function registerMany(arr) { (arr || []).forEach(register); return HL.games; }
  // 同仁自製遊戲上架範例（免改任何核心檔）：
  //   HL.games.register({
  //     id: "my-slot", title: "我的拉霸", type: "slot", cat: "originals",
  //     author: "你的暱稱", playable: true, hot: true,
  //     render: function (arg) { /* 回傳遊戲 DOM 節點；可用 HL.gameFrame.wrap(node, meta) 套通用外框 */ }
  //   });
  // 之後娛樂城點卡 → HL.games.launch(g) → router.goGame 直接派發（不需在 main.js 加 case）。

  function all() { return _list.filter(function (g) { return g.enabled; }); }
  function byId(id) { return _byId[id] || null; }
  function byCat(c) { return all().filter(function (g) { return g.cat === c; }); }
  function byType(t) { return all().filter(function (g) { return g.type === t; }); }
  function byAuthor(a) { return all().filter(function (g) { return g.author === a; }); }
  function hot() { return all().filter(function (g) { return g.hot; }); }
  function fresh() { return all().filter(function (g) { return g.isNew; }); }
  function playable() { return all().filter(function (g) { return g.playable; }); }
  // 依作者暱稱分組（目標 2：依同仁暱稱分類）→ [{ nick, count }]
  function authors() {
    var m = {}; all().forEach(function (g) { if (g.author) m[g.author] = (m[g.author] || 0) + 1; });
    return Object.keys(m).map(function (a) { return { nick: a, count: m[a] }; }).sort(function (x, y) { return y.count - x.count; });
  }

  // 啟動遊戲：既有 view（slot/chicken…）走 router.go；自帶 render 的動態註冊遊戲走 router.goGame（免改 main.js）
  function launch(g) {
    if (!g || !HL.router) return null;
    if (g.route && HL.views && HL.views[g.route]) return HL.router.go(g.route);
    if (typeof g.render === "function") return HL.router.goGame(g.id);
    return HL.router.go(g.route || "slot");
  }
  // 遊戲名 i18n：有 locales[lang].title 用之，否則原 title（之後接 HL.lang / HL.i18n）
  function gameTitle(g, lang) { lang = lang || HL.lang || "zh-Hant"; return (g && g.locales && g.locales[lang] && g.locales[lang].title) || (g ? g.title : ""); }

  HL.games = {
    register: register, registerMany: registerMany, slug: slug, launch: launch, title: gameTitle,
    all: all, byId: byId, byCat: byCat, byType: byType, byAuthor: byAuthor,
    hot: hot, "new": fresh, playable: playable, authors: authors
  };

  // ---- Seed：把既有 mock.casinoGames 灌入登錄表（單一來源）----
  // Apex 原創補上型別與「作者暱稱」（暫為示意，之後由團隊填正式暱稱）
  var AUTHOR = {
    "暗影儀式 Shadow Ritual": "Jack",
    "小雞過馬路 Chicken Cross": "Mina",
    "Crash X": "Leo", "Mines": "Mina", "Plinko": "Leo", "Dice": "Jack", "Limbo": "Mina"
  };
  var THUMB = { // 遊戲館縮圖（其餘暫用漸層占位）
    "暗影儀式 Shadow Ritual": "./assets/shadow-ritual/lobby-icon.webp",
    "小雞過馬路 Chicken Cross": "./assets/chicken-cross/lobby-icon.png"
  };
  if (HL.mock && HL.mock.casinoGames) {
    registerMany(HL.mock.casinoGames.map(function (g) {
      var isApex = g.provider === "Apex Studio";
      return {
        id: slug(g.title), title: g.title, provider: g.provider, cat: g.cat,
        type: g.route === "chicken" ? "special" : (g.cat === "originals" ? "original" : "slot"),
        author: isApex ? (AUTHOR[g.title] || "Apex") : null,
        thumb: THUMB[g.title] || null,
        c1: g.c1, c2: g.c2, fav: g.fav, hot: g.hot, isNew: g.isNew,
        playable: g.playable, comingSoon: g.comingSoon, route: g.route
      };
    }));
  }
})(window);

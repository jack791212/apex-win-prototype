/*
 * Apex Win｜輕量 i18n 引擎 + 語言切換器（接 header 🌐，目標3）
 * 設計：t(key, def) → 回 DICT[lang][key]，無則回 def（＝預設 zh-Hant 文案）。
 *   → 預設語言不需建字典；只為 en / zh-Hans 填要翻譯的 key，逐步擴充覆蓋。
 * 切換語言寫入 localStorage + 設 HL.lang（games.title 等已讀此值）+ HL.app.refresh 重繪。
 * 註冊於 window.HL.i18n；載入順序需在 main.js（首次 render）之前。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  function ls(k, d) { try { var v = global.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { global.localStorage.setItem(k, v); } catch (e) {} }

  var KEY_L = "HL_LANG";
  var LANGS = [
    { code: "zh-Hant", name: "繁體中文", flag: "🇹🇼" },
    { code: "zh-Hans", name: "简体中文", flag: "🇨🇳" },
    { code: "en", name: "English", flag: "🇬🇧" }
  ];

  var DICT = {
    "zh-Hans": {
      "nav.notify": "通知", "nav.lang": "语言",
      "bb.tasks": "每日任务", "bb.bonus": "奖励中心", "bb.responsible": "负责任博弈", "bb.fair": "可验证公平", "bb.vip": "VIP 俱乐部", "bb.partner": "伙伴",
      "casino.title": "娱乐城 CASINO", "casino.sub": "你喜爱的游戏，尽在一处。所有游戏为 Demo 示意。", "casino.demotag": "Demo · 未接入真实游戏",
      "casino.search": "搜索游戏或供应商…", "casino.random": "🎲 随机游戏",
      "tab.all": "全部", "tab.hot": "热门", "tab.new": "最新", "tab.fav": "♥ 收藏",
      "cat.originals": "Originals", "cat.slots": "老虎机", "cat.live": "真人娱乐", "cat.table": "桌上游戏", "cat.jackpot": "累积彩金", "cat.gameshow": "游戏节目",
      "sec.hot": "🔥 热门游戏", "sec.new": "⭐ 最新游戏", "sec.fav": "♥ 我的收藏", "sec.recent": "🕘 最近游玩", "sec.community": "🧪 同仁开发游戏（放置区）", "sec.authors": "🎨 我们的开发者（依昵称）", "sec.providers": "🏢 游戏供应商",
      "more": "查看全部 ›", "sort": "排序", "sort.default": "推荐", "sort.popular": "热门", "sort.new": "最新", "sort.az": "A-Z",
      "card.demo": "▶ 试玩", "card.real": "💵 真钱", "nores": "找不到符合的游戏。", "unit.games": "款游戏"
    },
    "en": {
      "nav.notify": "Notifications", "nav.lang": "Language",
      "bb.tasks": "Daily Tasks", "bb.bonus": "Rewards", "bb.responsible": "Responsible Gaming", "bb.fair": "Provably Fair", "bb.vip": "VIP Club", "bb.partner": "Buddy",
      "casino.title": "CASINO", "casino.sub": "All your favorite games in one place. All games are demos.", "casino.demotag": "Demo · not real games",
      "casino.search": "Search games or providers…", "casino.random": "🎲 Random game",
      "tab.all": "All", "tab.hot": "Hot", "tab.new": "New", "tab.fav": "♥ Favorites",
      "cat.originals": "Originals", "cat.slots": "Slots", "cat.live": "Live Casino", "cat.table": "Table Games", "cat.jackpot": "Jackpots", "cat.gameshow": "Game Shows",
      "sec.hot": "🔥 Hot Games", "sec.new": "⭐ New Games", "sec.fav": "♥ My Favorites", "sec.recent": "🕘 Recently Played", "sec.community": "🧪 Community Games", "sec.authors": "🎨 Our Developers", "sec.providers": "🏢 Providers",
      "more": "View all ›", "sort": "Sort", "sort.default": "Recommended", "sort.popular": "Popular", "sort.new": "Newest", "sort.az": "A-Z",
      "card.demo": "▶ Demo", "card.real": "💵 Real", "nores": "No matching games.", "unit.games": "games"
    }
  };

  function current() { return HL.lang || "zh-Hant"; }
  function t(key, def) { var d = DICT[current()]; return (d && d[key] != null) ? d[key] : def; }
  function setLang(code) {
    if (!code) return;
    HL.lang = code; save(KEY_L, code);
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.app && HL.app.refresh) HL.app.refresh();
  }
  function open() {
    var cur = current();
    var m = HL.ui.modal(t("nav.lang", "語言") + " / Language", [
      el("div", { class: "ax-lang" }, LANGS.map(function (L) {
        return el("button", { class: "ax-lang__opt" + (L.code === cur ? " is-current" : ""), onClick: function () { m.close(); if (L.code !== cur) setLang(L.code); } }, [
          el("span", { class: "ax-lang__flag", text: L.flag }),
          el("span", { text: L.name }),
          L.code === cur ? el("span", { class: "ax-lang__chk", text: "✓" }) : null
        ]);
      })),
      el("span", { class: "ax-demo-tag", text: "輕量 i18n · 介面逐步在地化 · Demo" })
    ]);
  }

  // 載入即套用已存語言（在 main.js 首次 render 前）
  HL.lang = ls(KEY_L, "zh-Hant");

  HL.i18n = { t: t, setLang: setLang, current: current, open: open, langs: LANGS };
})(window);

/*
 * Apex Win｜遊戲熱度（Heat）— On Fire 🔥 / Ice Cold 🧊 + 當下最熱牆
 * 來源：bet365「首頁置頂當下最熱」+ roobet「Live RTP / On Fire・Ice Cold」共識的熱度發現性模式。
 * 模型：對遊戲登錄表 HL.games 做 ambient 模擬（玩家數隨機漫步 + 近期 RTP 漂移），
 *       並由全站中央掛鉤 HL.liveStats.record 對「真正被玩到的遊戲」即時加溫（fuzzy 比對遊戲名）。
 *       純前端、零牌照，複用既有 HL.games / HL.ticker，與既有裝飾性排行榜同一設計哲學。
 * 註冊於 window.HL.heat。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }

  var FIRE = 118, COLD = 82;   // 近期 RTP(%) 門檻：≥FIRE 火熱、≤COLD 冰冷
  var state = {};              // id -> { players, rtp, base }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function gameList() { return (HL.games && HL.games.all) ? HL.games.all() : []; }

  // 依既有人氣旗標給基準玩家數，rtp 以 100% 為中心散開（讓開場就有火熱/冰冷可看）
  function seed(g) {
    var base = (g.hot ? 240 : g.isNew ? 90 : 60) + (g.fav || 0) * 0.4 + (g.playable ? 60 : 0);
    return { players: Math.round(base * rnd(0.7, 1.3)), rtp: rnd(76, 124), base: base };
  }
  function st(g) { return state[g.id] || (state[g.id] = seed(g)); } // 懶建（含後載入的同仁遊戲）

  // ambient 漂移（自帶 interval，跨頁持續，不靠會被 clearAll 的 HL.ticker）
  function drift() {
    var list = gameList();
    for (var i = 0; i < list.length; i++) {
      var s = st(list[i]);
      s.players += (s.base - s.players) * 0.08 + rnd(-12, 12);   // 向基準回歸 + 噪音
      if (s.players < 4) s.players = Math.round(rnd(4, 14));
      s.rtp += rnd(-3.5, 3.5) + (Math.random() < 0.06 ? rnd(-18, 18) : 0); // 隨機漫步 + 偶發大波動
      if (s.rtp > 150) s.rtp = 150; if (s.rtp < 60) s.rtp = 60;
    }
  }

  // fuzzy 比對中央掛鉤的遊戲名 → 登錄表遊戲（名稱字串各遊戲不一致，找不到不致命）
  function matchGame(name) {
    if (!name) return null;
    var n = String(name).toLowerCase(), list = gameList();
    for (var i = 0; i < list.length; i++) {
      var g = list[i], id = String(g.id).toLowerCase(), title = String(g.title || "").toLowerCase();
      if (n.indexOf(id) >= 0 || (title && (n.indexOf(title) >= 0 || title.indexOf(n) >= 0))) return g;
    }
    return null;
  }

  // 中央掛鉤：真有人玩 → 對應遊戲即時加溫（玩家+、rtp 朝本局結果靠攏）
  function record(game, bet, win) {
    var g = matchGame(game); if (!g) return;
    var s = st(g);
    s.players += rnd(6, 18);
    if (bet > 0) { var roundRtp = Math.max(0, Math.min(400, (win / bet) * 100)); s.rtp += (roundRtp - s.rtp) * 0.12; }
  }

  function statusOf(rtp) { return rtp >= FIRE ? "fire" : rtp <= COLD ? "cold" : null; }
  function forGame(g) {
    if (!g) return { players: 0, rtp: 100, status: null };
    var s = st(g);
    return { players: Math.round(s.players), rtp: Math.round(s.rtp), status: statusOf(s.rtp) };
  }
  function hottest(n) {
    return gameList().map(function (g) {
      var h = forGame(g); h.g = g; return h;
    }).sort(function (a, b) { return b.players - a.players; }).slice(0, n || 8);
  }

  // 遊戲卡角標：只在 fire/cold 顯示
  function badge(g) {
    var h = forGame(g);
    if (!h.status) return null;
    var fire = h.status === "fire";
    return el("span", {
      class: "ax-heat-badge " + (fire ? "is-fire" : "is-cold"),
      title: (fire ? t("火熱", "火熱") : t("冰冷", "冰冷")) + " · RTP " + h.rtp + "%",
      text: (fire ? "🔥 " : "🧊 ") + h.rtp + "%"
    });
  }

  // S9 遊戲卡「N 人在玩」即時人數徽章（社交證明）：複用 ambient players、只給可玩遊戲、太少不顯示。
  // 靜態快照（每次渲染取當下值）；脈動綠點動效受 prefers-reduced-motion / .ax-anim-off（S1）尊重。
  function playersBadge(g) {
    if (!g || !g.playable) return null;
    var n = forGame(g).players;
    if (n < 5) return null;
    return el("span", { class: "ax-live-badge", title: t("線上遊玩人數（模擬）", "線上遊玩人數（模擬）") }, [
      el("i", { class: "ax-live-badge__dot" }),
      document.createTextNode(" " + n.toLocaleString("en-US") + " "),
      el("span", { text: "在玩" })
    ]);
  }

  function cell(h) {
    var g = h.g, fire = h.status === "fire", cold = h.status === "cold";
    return el("button", {
      class: "ax-trend__cell" + (fire ? " is-fire" : cold ? " is-cold" : ""),
      style: "background:linear-gradient(160deg," + (g.c1 || "#2a2d3a") + "," + (g.c2 || "#15161e") + ")",
      title: HL.games.title(g),
      onClick: function () { if (g.playable) HL.games.launch(g); else HL.router.go("casino"); }
    }, [
      fire || cold ? el("span", { class: "ax-trend__flame", text: fire ? "🔥" : "🧊" }) : null,
      el("span", { class: "ax-trend__name", text: HL.games.title(g) }),
      el("div", { class: "ax-trend__meta" }, [
        el("b", { text: "👤 " + h.players }),
        el("i", { class: fire ? "ax-green" : cold ? "ax-red" : "ax-muted", text: "RTP " + h.rtp + "%" })
      ])
    ]);
  }

  // 當下最熱牆（娛樂城頂部）— 在本頁時每數秒即時刷新；換頁時 HL.ticker 被 clearAll 自動停
  function wall(n) {
    n = n || 8;
    var row = el("div", { class: "ax-trend__row" }, hottest(n).map(cell));
    var sec = el("section", { class: "ax-trend" }, [
      HL.ui.sectionTitle(t("🔥 現在最多人玩", "🔥 現在最多人玩"), { extras: [
        el("span", { class: "ax-muted", text: t("即時熱度 · 依近期下注", "即時熱度 · 依近期下注") })
      ] }),
      row
    ]);
    var ticks = 0;
    HL.ticker.add(function tick() {
      if (!sec.isConnected) { HL.ticker.remove(tick); return; }
      if (++ticks % 3 !== 0) return; // 每 3 秒重畫一次
      HL.dom.clear(row);
      hottest(n).forEach(function (h) { row.appendChild(cell(h)); });
    });
    return sec;
  }

  // 真站：關掉 ambient 假在線數 + 假 Live RTP 漂移（後者若當真實遙測外顯＝不實宣稱）；熱度只由真實遊玩 record 推進
  if (!(HL.site && HL.site.isLive())) { setInterval(drift, 4000); drift(); }

  HL.heat = { record: record, forGame: forGame, hottest: hottest, badge: badge, playersBadge: playersBadge, wall: wall };
})(window);

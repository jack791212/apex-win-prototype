/*
 * Apex Win｜百家樂 Baccarat（掛在 HL.table 共用桌遊引擎上）
 * 真開牌：標準補牌規則（閒 0–5 補、莊依閒第三張補牌表）、天牌 8/9 停。
 * 注區：閒 1:1、莊 1:1(扣 5% 傭金=1.95)、和 8:1、閒對/莊對 11:1。
 * 結算走 HL.table（扣注/派彩/餘額同步 + 掛 HL.liveStats.record）。
 * 以 HL.games.register 覆蓋 mock 的「Baccarat」占位卡（id: baccarat）為可玩。
 * 載入順序：data/games.js 之後（覆蓋 seed）、core/table.js 之後。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學（HL.baccarat）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var SUITS = ["♠", "♥", "♦", "♣"];
  var RANKS = [
    { r: "A", v: 1 }, { r: "2", v: 2 }, { r: "3", v: 3 }, { r: "4", v: 4 }, { r: "5", v: 5 },
    { r: "6", v: 6 }, { r: "7", v: 7 }, { r: "8", v: 8 }, { r: "9", v: 9 },
    { r: "10", v: 0 }, { r: "J", v: 0 }, { r: "Q", v: 0 }, { r: "K", v: 0 }
  ];
  // 8 副牌靴 = 416 張（32×13）。idx 0..415 → 一張牌：rankIdx = idx%13、suitIdx = ⌊(idx%52)/13⌋
  //   （52=13×4 故整靴每 rank 32 張、每花色 104 張皆均勻）。比照龍虎鬥/安達巴哈同一 8 副靴慣例。
  //   遊戲與 node 驗證器共用同一映射。
  function cardOf(idx) {
    var rk = RANKS[idx % 13];
    var st = SUITS[Math.floor((idx % 52) / 13)];
    return { rank: rk.r, val: rk.v, suit: st, red: st === "♥" || st === "♦" };
  }
  function pointOf(cards) { var s = 0; cards.forEach(function (c) { s += c.val; }); return s % 10; }

  // 真開牌（純數學）：8 副牌靴無替換發牌（fresh shoe per coup＝canonical 百家「一靴首局」分布）。
  //   抽牌序：閒2→莊2→閒3→莊3（順序不影響機率）。第 k 張以 nextFloat() 取「剩餘牌數的均勻排名 j」，
  //   對映到尚未抽出的第 j 張牌（等價 Fisher–Yates 逐步、可事後重算）。依標準補牌規則開牌。
  //   ⚠️ 對子＝前兩張同 rank：8 副靴 P=31/415=7.470%（非無限牌組 1/13=7.692%）→ 對子退 12× RTP=372/415
  //      ≈89.64%，與真實 8 副靴 casino 一致（2026-07-30 消化船長 G5：舊版 with-replacement 使對子 RTP 92.31% 偏高）。
  function dealWith(nextFloat) {
    var used = [];
    function draw() {
      var remaining = 416 - used.length;
      var j = Math.floor(nextFloat() * remaining);
      if (j >= remaining) j = remaining - 1; if (j < 0) j = 0;
      var idx, seen = -1;
      for (idx = 0; idx < 416; idx++) { if (used.indexOf(idx) === -1) { if (++seen === j) break; } }
      used.push(idx);
      return cardOf(idx);
    }
    var P = [draw(), draw()], B = [draw(), draw()];
    var pt = pointOf(P), bt = pointOf(B);
    var natural = pt >= 8 || bt >= 8;
    var p3 = null;
    if (!natural) {
      if (pt <= 5) { p3 = draw(); P.push(p3); }            // 閒：0–5 補、6–7 停
      var drawB = false;
      if (p3 === null) { drawB = bt <= 5; }                 // 閒停 → 莊 0–5 補
      else {                                                // 閒補 → 莊依補牌表（v=閒第三張點值 0–9）
        var v = p3.val;
        if (bt <= 2) drawB = true;
        else if (bt === 3) drawB = v !== 8;
        else if (bt === 4) drawB = v >= 2 && v <= 7;
        else if (bt === 5) drawB = v >= 4 && v <= 7;
        else if (bt === 6) drawB = v >= 6 && v <= 7;
        else drawB = false;                                // 莊 7 停
      }
      if (drawB) B.push(draw());
    }
    pt = pointOf(P); bt = pointOf(B);
    return {
      P: P, B: B, pt: pt, bt: bt,
      winner: pt > bt ? "player" : (bt > pt ? "banker" : "tie"),
      pPair: P[0].rank === P[1].rank,
      bPair: B[0].rank === B[1].rank
    };
  }
  // 各注區總賠付倍數（輸=0、和退本=1）
  function returnsOf(o) {
    return {
      player: o.winner === "player" ? 2 : (o.winner === "tie" ? 1 : 0),
      banker: o.winner === "banker" ? 1.95 : (o.winner === "tie" ? 1 : 0),
      tie: o.winner === "tie" ? 9 : 0,
      ppair: o.pPair ? 12 : 0,
      bpair: o.bPair ? 12 : 0
    };
  }

  // ── 發牌/揭曉節拍（純函式，node 驗證器與瀏覽器共用同一份）──────────────────────
  // 舊版：onDeal 在同一同步 tick 用 renderHand 把閒/莊兩手整手渲染完（閒莊平行落牌）、
  //   第三張與前兩張同一波（CSS 0.12s×i 交錯）、點數等單一 ~890ms setTimeout 才顯示
  //   ⇒ 沒有 canonical「閒1→莊1→閒2→莊2」發牌序、補牌不獨立、~890ms 死等（game-feel #4）。
  // 改為 canonical 發牌序：閒1→莊1→閒2→莊2（各一拍 sequential）→（有補牌則）閒3→莊3 各一拍
  //   → 比點（揭最終點數＋高亮贏家）→ 結算（錢才動）。每張牌落定即更新該手跑動點數。
  //   不變量（games/baccarat/staged-reveal 鎖）：
  //   (a) 發牌序前四張嚴格＝閒1,莊1,閒2,莊2（非閒莊平行、非同一 tick）；
  //   (b) 補牌（第三張）為獨立且較晚的拍（非與前兩張同一波）；
  //   (c) 比點在所有牌落定之後；(d) 結算嚴格晚於比點；(e) 每拍可讀地板＋總時長理智上界。
  //   dealWith 先閒後莊補牌（見上），故補牌序＝閒3 早於莊3。
  function dealSequence(o) {
    var seq = [
      { side: "player", i: 0 }, { side: "banker", i: 0 },
      { side: "player", i: 1 }, { side: "banker", i: 1 }
    ];
    if (o.P.length > 2) seq.push({ side: "player", i: 2 }); // 閒補牌
    if (o.B.length > 2) seq.push({ side: "banker", i: 2 }); // 莊補牌
    return seq;
  }
  var CARD0_MS = 120;       // 首張落牌（第一拍）
  var CARD_GAP_MS = 240;    // 逐張落牌間隔（sequential deal 的儀式感）
  var COMPARE_GAP_MS = 300; // 末張落定 → 比點（揭最終點數＋高亮贏家）
  var SETTLE_GAP_MS = 320;  // 比點 → 結算（張力間隔）
  function cardAtMs(k) { return CARD0_MS + k * CARD_GAP_MS; }          // 第 k 張（0-based）
  function compareAtMs(n) { return cardAtMs(n - 1) + COMPARE_GAP_MS; } // n＝本局總張數（4/5/6）
  function settleAtMs(n) { return compareAtMs(n) + SETTLE_GAP_MS; }

  // ── 贏分回饋分級 + 淨額 roll-up（純函式，node 驗證器與瀏覽器共用同一份）──────────────
  // 舊版：結算只寫一行綠字＋單一 ax-green，對子/和 12×/9× 與閒/莊 2×/1.95× 視覺重量完全相同，
  //   且淨額一次性 textContent 跳到終值（無 roll-up count-up）＝玩家無法從畫面感知「這注中得很大」
  //   （game-feel #2 flat-feedback-no-tiering，同 #13 sicbo/moneywheel／#2 dragon-tiger 家族尺）。
  // 修法：以「本局總回收倍數 x = payout / staked」分級（對齊 slot.js bigWin／sicbo 門檻語意：
  //   epic≥50×／mega≥15×／big≥5×／其餘普通贏；對子/和 12×/9×＝big、閒/莊 2×/1.95×＝普通），
  //   結算拍寫 data-tier 供 headless 驗分級＋掛內聯分級輝光（零首屏 CSS），
  //   再把淨額以 setTimeout 分步 roll-up（純節拍函式、非 rAF ⇒ 背景分頁/headless 也推進、末步精確等於淨額）。
  var TIER_EPIC = 50, TIER_MEGA = 15, TIER_BIG = 5;   // 回收倍數門檻（gross return multiple）
  function winMult(payout, staked) { return staked > 0 ? payout / staked : 0; }
  function winTier(payout, staked) {
    var x = winMult(payout, staked);
    return x >= TIER_EPIC ? "epic" : x >= TIER_MEGA ? "mega" : x >= TIER_BIG ? "big" : "";
  }
  function tierLabel(tier) { return tier === "epic" ? "史詩大獎 EPIC！" : tier === "mega" ? "超級大獎 MEGA！" : tier === "big" ? "大獎 BIG！" : ""; }
  var ROLLUP_STEPS = 14;    // 淨額 count-up 分步數（>1 ⇒ 不是一次跳號）
  var ROLLUP_MS = 616;      // 總 roll-up 時長（≈44ms/步·可讀）
  function rollupSteps() { return ROLLUP_STEPS; }
  function rollupStepMs() { return Math.round(ROLLUP_MS / ROLLUP_STEPS); }
  function rollupValueAt(net, step) { return step >= ROLLUP_STEPS ? net : Math.round(net * step / ROLLUP_STEPS); } // 末步精確＝net

  HL.baccarat = {
    SUITS: SUITS, RANKS: RANKS, cardOf: cardOf, pointOf: pointOf,
    dealWith: dealWith, returnsOf: returnsOf,
    dealSequence: dealSequence, cardAtMs: cardAtMs, compareAtMs: compareAtMs, settleAtMs: settleAtMs,
    CARD0_MS: CARD0_MS, CARD_GAP_MS: CARD_GAP_MS, COMPARE_GAP_MS: COMPARE_GAP_MS, SETTLE_GAP_MS: SETTLE_GAP_MS,
    winMult: winMult, winTier: winTier, tierLabel: tierLabel, rollupSteps: rollupSteps, rollupStepMs: rollupStepMs, rollupValueAt: rollupValueAt,
    TIER_EPIC: TIER_EPIC, TIER_MEGA: TIER_MEGA, TIER_BIG: TIER_BIG, ROLLUP_STEPS: ROLLUP_STEPS,
    // live 開牌：一牌一 HL.fair 浮點（nonce 遞增）→ 可驗證公平、可事後重算（與驗證器同一 dealWith）
    deal: function () { return dealWith(function () { return HL.fair.floatOr("baccarat"); }); }
  };
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.baccarat; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.table || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;
  var dealHands = HL.baccarat.deal;

  function infoModal() {
    HL.ui.modal("百家樂 · 規則 / 賠率", [
      el("p", { class: "ax-muted", text: "閒/莊各發兩張，依標準補牌規則開牌；點數＝各牌點和個位數（10/J/Q/K=0、A=1），最接近 9 者勝。" }),
      HL.ui.payoutRules([
        { term: "閒 PLAYER ", desc: "1:1（贏家退 2×）" },
        { term: "莊 BANKER ", desc: "1:1，扣 5% 傭金（退 1.95×）" },
        { term: "和 TIE ", desc: "8:1（退 9×）；和局時閒/莊退回本金" },
        { term: "閒對 / 莊對 ", desc: "前兩張同數字（同 rank，如兩張 K）＝對子，11:1（退 12×）；採 8 副牌靴" }
      ], { cls: "ax-bacc__rules" }),
      el("p", { class: "ax-muted", text: "天牌：任一方前兩張為 8 或 9 即停牌。本桌採可驗證公平（HMAC-SHA256）開牌 · Demo，點「近況」珠可開驗證面板。" })
    ]);
  }

  function baccaratGame() {
    var spotEls = {};
    var playerCards = el("div", { class: "ax-bacc__cards" });
    var bankerCards = el("div", { class: "ax-bacc__cards" });
    var pTotal = el("div", { class: "ax-bacc__pt", text: "–" });
    var bTotal = el("div", { class: "ax-bacc__pt", text: "–" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "下注後按「開牌」，閒/莊比點數，最接近 9 者勝 🎴" });
    var history = HL.ui.histBar({ cls: "ax-bacc__history", itemCls: "ax-bacc__bead", max: 18, fair: true }); // 已接 HL.fair → 近況珠可點開驗證面板

    function hand(label, cardsEl, totalEl, cls) {
      return el("div", { class: "ax-bacc__hand " + cls }, [
        el("div", { class: "ax-bacc__handhead" }, [el("span", { class: "ax-bacc__handlbl", text: label }), totalEl]),
        cardsEl
      ]);
    }

    function spot(id, label, odds, cls) {
      var badge = el("div", { class: "ax-bacc__stake" });
      var box = el("button", { class: "ax-bacc__spot " + cls, onClick: function () { area.place(id); } }, [
        el("div", { class: "ax-bacc__spotlbl", text: label }),
        el("small", { class: "ax-bacc__odds", text: odds }),
        badge
      ]);
      spotEls[id] = { badge: badge, box: box };
      return box;
    }

    function renderStakes() { HL.table.renderStakes(spotEls, area); }

    var area = HL.table.betArea({ game: "baccarat", onChange: renderStakes });

    // 逐張落牌（分階段揭曉：一次只 append 一張、不 clear+重建整手）——回合開始由 clearTable 清一次
    function placeCard(container, c) {
      container.appendChild(el("div", { class: "ax-card ax-card--in" + (c.red ? " is-red" : "") }, [
        el("span", { class: "ax-card__r", text: c.rank }),
        el("span", { class: "ax-card__s", text: c.suit })
      ]));
    }
    function clearTable() {
      HL.dom.clear(playerCards); HL.dom.clear(bankerCards);
      pTotal.textContent = "–"; bTotal.textContent = "–";
      pTotal.className = "ax-bacc__pt"; bTotal.className = "ax-bacc__pt";
      for (var id in spotEls) spotEls[id].box.classList.remove("is-win");
    }
    function pushHistory(o) {
      var k = o.winner === "player" ? "P" : (o.winner === "banker" ? "B" : "T");
      history.push(k, "is-" + o.winner);
    }

    function onDeal() {
      var snap = area.commit(); if (!snap) return;
      area.lock(true); ctrls.dealBtn.disabled = true;
      clearTable();
      statusEl.textContent = "開牌中…"; statusEl.className = "ax-inst__last ax-muted";

      var o = dealHands();          // 立即算出整局結果（RNG 回合開始就 commit）
      var ret = returnsOf(o);
      var seq = HL.baccarat.dealSequence(o); // canonical 發牌序 閒1→莊1→閒2→莊2→(閒3)→(莊3)
      var n = seq.length;

      // 逐張落牌：各一拍 sequential（非閒莊平行同一 tick）；每張落定即更新該手跑動點數
      seq.forEach(function (step, k) {
        setTimeout(function () {
          var isP = step.side === "player";
          var cards = isP ? o.P : o.B;
          placeCard(isP ? playerCards : bankerCards, cards[step.i]);
          (isP ? pTotal : bTotal).textContent = String(HL.baccarat.pointOf(cards.slice(0, step.i + 1)));
          statusEl.setAttribute("data-beat", "deal-" + step.side + "-" + step.i);
        }, HL.baccarat.cardAtMs(k));
      });

      // 比點：所有牌落定後才揭最終點數＋高亮贏家（結果已可讀，錢尚未動）
      setTimeout(function () {
        pTotal.textContent = String(o.pt); bTotal.textContent = String(o.bt);
        pTotal.className = "ax-bacc__pt" + (o.winner === "player" ? " is-win" : "");
        bTotal.className = "ax-bacc__pt" + (o.winner === "banker" ? " is-win" : "");
        var winSpots = { player: o.winner === "player", banker: o.winner === "banker", tie: o.winner === "tie", ppair: o.pPair, bpair: o.bPair };
        for (var id in spotEls) if (winSpots[id]) spotEls[id].box.classList.add("is-win");
        statusEl.setAttribute("data-beat", "compare");
      }, HL.baccarat.compareAtMs(n));

      // 結算：結果已可見、錢才動（單一 setTimeout 閘門，背景分頁/無 rAF 也成立）
      setTimeout(function () {
        statusEl.setAttribute("data-beat", "settle");
        // 家族 D＋E：分階段結算（先掃輸家籌碼、再付贏家）——兩拍做在 HL.table，這裡只等它完成
        area.settleStaged(snap, ret).then(function (r) {
          pushHistory(o);
          var who = o.winner === "player" ? "閒贏" : (o.winner === "banker" ? "莊贏" : "和局");
          var pairTxt = (o.pPair ? " · 閒對" : "") + (o.bPair ? " · 莊對" : "");
          var head = "閒 " + o.pt + " : " + o.bt + " 莊 — " + who + pairTxt + "　";
          function unlock() { area.lock(false); area.clear(); ctrls.dealBtn.disabled = false; } // 清空本局籌碼，下一局重新下注（重押用「重押」鈕）
          if (r.net < 0) { // 淨負（輸）：即時揭示、無 roll-up、清除分級輝光
            statusEl.textContent = head + "輸 " + money(-r.net);
            statusEl.className = "ax-inst__last ax-red";
            statusEl.style.fontWeight = ""; statusEl.style.textShadow = "";
            statusEl.setAttribute("data-tier", "loss");
            statusEl.setAttribute("data-beat", "settled");
            unlock(); return;
          }
          // 贏（含和局退本 net=0）：#2 分級（data-tier）＋內聯分級輝光（零首屏 CSS）＋淨額 setTimeout 分步 roll-up（末步精確）
          var tier = winTier(r.payout, r.staked);
          statusEl.className = "ax-inst__last ax-green" + (tier ? " ax-bacc__win--" + tier : "");
          statusEl.style.fontWeight = tier ? "700" : "";
          statusEl.style.textShadow = tier === "epic" ? "0 0 14px rgba(255,196,64,.9)"
            : tier === "mega" ? "0 0 10px rgba(255,196,64,.7)"
            : tier === "big" ? "0 0 7px rgba(255,196,64,.5)" : "";
          statusEl.setAttribute("data-tier", tier || "win");
          var prefix = tier ? tierLabel(tier) + "　" : "";
          var steps = rollupSteps(), step = 0;
          (function tick() {                                     // 逐步累進淨額（table 保持鎖定至 roll-up 完成＝無跨局覆寫）
            step++;
            statusEl.textContent = head + prefix + "贏 +" + money(rollupValueAt(r.net, step));
            if (step < steps) { statusEl.setAttribute("data-beat", "rollup"); setTimeout(tick, rollupStepMs()); }
            else { statusEl.setAttribute("data-beat", "settled"); unlock(); }
          })();
        });
      }, HL.baccarat.settleAtMs(n));
    }

    var ctrls = area.controls(onDeal, "開牌");

    var node = el("div", { class: "ax-inst ax-bacc ax-fade-in" }, [
      el("div", { class: "ax-bacc__titlerow" }, [
        el("h2", { class: "ax-inst__title", text: "🎴 百家樂 Baccarat" }),
        el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal })
      ]),
      el("div", { class: "ax-bacc__felt" }, [
        el("div", { class: "ax-bacc__hands" }, [
          hand("閒 PLAYER", playerCards, pTotal, "is-player"),
          el("div", { class: "ax-bacc__vs", text: "VS" }),
          hand("莊 BANKER", bankerCards, bTotal, "is-banker")
        ]),
        statusEl
      ]),
      el("div", { class: "ax-bacc__bets" }, [
        el("div", { class: "ax-bacc__pairs" }, [
          spot("ppair", "閒對", "11:1", "ax-bacc__spot--ppair"),
          spot("bpair", "莊對", "11:1", "ax-bacc__spot--bpair")
        ]),
        el("div", { class: "ax-bacc__main" }, [
          spot("player", "閒 PLAYER", "1:1", "ax-bacc__spot--player"),
          spot("tie", "和 TIE", "8:1", "ax-bacc__spot--tie"),
          spot("banker", "莊 BANKER", "1:1 −5%", "ax-bacc__spot--banker")
        ])
      ]),
      el("div", { class: "ax-bacc__histrow" }, [el("small", { class: "ax-muted", text: "近況" }), history.node]),
      HL.table.panel(area, ctrls)
    ]);

    renderStakes();
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "百家樂 Baccarat", provider: "Apex Studio", key: "baccarat" }) : node;
  }

  // 註：對外真開牌 API（HL.baccarat.deal/returnsOf，供主播跟注 7c 等複用同一套 RNG 真桌結果）
  //     已於檔首純數學區暴露 + module.exports（node 驗證器共用同一份 dealWith）。

  if (HL.games && HL.games.register) {
    HL.games.register({
      id: "baccarat", title: "百家樂 Baccarat", provider: "Apex Studio",
      type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true,
      author: "Apex", c1: "#0e7a5f", c2: "#0a3320", render: baccaratGame
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

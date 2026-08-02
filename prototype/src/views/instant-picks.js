/*
 * Apex Win｜即時遊戲：ApexWin Picks 賽事預測（社交運彩 pick'em v1，對標 Legendz + Courtside 社交運彩）
 * ApexWin 完全空白的「第三內容軸線」——把傳統運彩下注 UI 壓成純前端『用虛擬幣預測模擬賽事』。
 *   **不接真實賽事數據源 / 不做真運彩結算**（那是 avoid：即時賽事 feed + 供應商後端）。改用站內 mock 賽程：
 *   本地隊名池 + 賠率參數產生一批虛擬對戰，玩家用主餘額對「獨贏（moneyline）」或「大小分（totals）」下單注，
 *   開賽後以 HL.fair.float("picks") 可驗證亂數依「所選盤口機率」決定結果並派彩入主餘額。
 * 賠率＝EDGE/p（1% 莊家優勢，與其餘 originals 一致）；派彩 floor(bet×odds)＝小注不反轉 edge（同 #27/#32 修正）。
 * 每張單一注 = HL.fair.float("picks") 一注（一單一 nonce），命中＝float < 所選盤口機率＝逐單可驗證重算。
 * 結算走中央掛鉤 HL.liveStats.record("picks",bet,payout)＝補上調研點名缺的「運彩預測」計分來源（餵 VIP/任務/races/返水/彩金）。
 * v1 僅單注（moneyline + 大小分）；bet slip 串關 parlay / live 盤口留後續卡。
 *
 * 保真契約（2026-08-02 遊戲軌·補 node 契約）：純數學區抽成 HL.picks（EDGE/盤口範圍/SPORTS/TEAMS/oddsOf/won/payoutOf/fairRTP），
 *   以 module.exports 暴露供 node RTP 驗證器 require＝「驗的即玩的同一份」（繼 dice/limbo/plinko/crash-x/mines/
 *   keno/towers/cases/hilo/pump/duel 後 CRASH/INSTANT+special 家族最後一款無契約者補齊）。DOM 存取移至 node early-return 後、
 *   IIFE globalThis fallback。**公平（pre-floor）每注 RTP＝命中機率 p·賠率(EDGE/p)＝EDGE＝99.0000% 恰等 ∀p**
 *   （策略無關、盤口分布無關、獨贏/大小分兩市場同 RTP）；派彩 payoutOf() 對 bet×odds 取 floor＝房家安全側
 *   （單發小賠率單注故 floor 影響較大：實付 RTP 隨注額趨近 99%——bet50≈98.50%／bet500≈99.02%，**恆 ≤99%、>100% 數學排除**、
 *    不同於 hilo/pump 累乘大倍數時 floor 幾乎無感；此為誠實揭示、方向永遠向房家＝非玩家暗虧陷阱）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用 HL.picks）=====================
  var Picks = {
    EDGE: 0.99,
    // 盤口機率生成範圍（純裝飾的讓分設定；決定賠率分布，但**不影響**公平 RTP＝EDGE ∀p）
    HOME_PROB_MIN: 0.34, HOME_PROB_RANGE: 0.32,   // 主隊獨贏 34%–66%
    OVER_PROB_MIN: 0.42, OVER_PROB_RANGE: 0.16,   // 大分 42%–58%
    // 運動別（emoji + 大小分基準線；純裝飾）與隊名池（與真實隊伍無關）
    SPORTS: [
      { ic: "⚽", line: 2.5 }, { ic: "🏀", line: 210.5 }, { ic: "🏈", line: 44.5 }, { ic: "🎮", line: 26.5 }, { ic: "🏒", line: 5.5 }
    ],
    TEAMS: ["雷霆", "蒼狼", "銀河", "烈焰", "北極星", "鐵衛", "颶風", "王朝", "毒蠍", "破曉", "巨浪", "閃電", "深淵", "獵鷹", "赤龍", "寒冰"],
    // 賠率＝EDGE/命中機率（1% 莊家優勢定價）
    oddsOf: function (prob) { return this.EDGE / prob; },
    // 一單一 float：命中＝draw < 所選盤口機率 p＝逐單可驗證重算（賠率 EDGE/p ⇒ EV=EDGE）
    won: function (draw, prob) { return draw < prob; },
    // 派彩取 floor＝房家安全側（小注不反轉 edge；#27/#32 同源；實付 ≤ bet·odds、>100% 數學排除）
    payoutOf: function (bet, prob) { return Math.floor(bet * this.oddsOf(prob)); },
    // 公平（pre-floor）每注 RTP＝命中機率·賠率＝p·(EDGE/p)＝EDGE 恰等 ∀p（策略無關、盤口分布無關）
    fairRTP: function (prob) { return prob * this.oddsOf(prob); }
  };
  HL.picks = Picks;
  if (typeof module !== "undefined" && module.exports) { module.exports = { picks: Picks }; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;
  var EDGE = Picks.EDGE, SPORTS = Picks.SPORTS, TEAMS = Picks.TEAMS;

  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return HL.fair.floatOr("picks"); } // T11：統一後援出口（float 語意不變）
  // 顯示用賠率＝無條件捨去 2 位小數：按鈕/注單絕不高報實付（同 #27/#32 審查修正）
  function fmtOdds(o) { return (Math.floor(o * 100) / 100).toFixed(2); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // 產一場模擬賽事：主客隊、獨贏機率、大小分機率（機率＝盤口參數，用 Math.random 生成即可；公平性在於「結算」以 HL.fair 對機率可驗證重算）
  function makeFixture() {
    var sport = pick(SPORTS);
    var h = pick(TEAMS), a; do { a = pick(TEAMS); } while (a === h);
    var homeProb = Picks.HOME_PROB_MIN + Math.random() * Picks.HOME_PROB_RANGE;   // 主隊獨贏 34%–66%
    var overProb = Picks.OVER_PROB_MIN + Math.random() * Picks.OVER_PROB_RANGE;   // 大分 42%–58%
    return { ic: sport.ic, line: sport.line, home: h, away: a, homeProb: homeProb, overProb: overProb };
  }
  function makeSlate() { return [makeFixture(), makeFixture(), makeFixture()]; }

  function picksGame() {
    var slate = makeSlate();
    var sel = null;   // { fi, market:"ml"|"tot", side, prob, odds, label }
    var busy = false;

    var amt = HL.instant.amountField(50);
    var slateEl = el("div", { class: "ax-picks__slate" });
    var slipTeamsEl = el("div", { class: "ax-picks__sliphd ax-muted", text: "先在上方選一個盤口 🎯" });
    var slipPickEl = el("b", { text: "—" });
    var slipRetEl = el("b", { class: "ax-gold", text: "—" });
    var betBtn = el("button", { class: "ax-btn-primary", text: "下單開賽", disabled: "disabled" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted" }, [el("span", { text: "選一場賽事的盤口，用主餘額下單，開賽後見真章 ⚽🏀" })]);

    function record(payout) { if (HL.liveStats) HL.liveStats.record("picks", sel ? sel.bet : 0, payout); }
    function setStatus(nodes, cls) {
      HL.dom.clear(statusEl);
      nodes.forEach(function (n) { statusEl.appendChild(n); });
      statusEl.className = "ax-inst__last " + (cls || "ax-muted");
    }
    function potReturn() { var b = amt.get(); return sel ? Math.floor(b * sel.odds) : 0; }

    function refreshSlip() {
      if (!sel) {
        slipTeamsEl.textContent = "先在上方選一個盤口 🎯"; slipTeamsEl.className = "ax-picks__sliphd ax-muted";
        slipPickEl.textContent = "—"; slipRetEl.textContent = "—";
        betBtn.setAttribute("disabled", "disabled"); return;
      }
      var f = slate[sel.fi];
      slipTeamsEl.textContent = f.ic + " " + f.home + " vs " + f.away; slipTeamsEl.className = "ax-picks__sliphd";
      HL.dom.clear(slipPickEl);
      slipPickEl.appendChild(el("span", { text: sel.label }));
      slipPickEl.appendChild(document.createTextNode(" @ " + fmtOdds(sel.odds)));
      slipRetEl.textContent = money(potReturn());
      if (!busy) betBtn.removeAttribute("disabled");
    }

    function selectOdd(fi, market, side) {
      if (busy) return;
      var f = slate[fi], prob, label;
      if (market === "ml") {
        if (side === "home") { prob = f.homeProb; label = f.home + " 勝"; }
        else { prob = 1 - f.homeProb; label = f.away + " 勝"; }
      } else {
        if (side === "over") { prob = f.overProb; label = "大分 " + f.line; }
        else { prob = 1 - f.overProb; label = "小分 " + f.line; }
      }
      sel = { fi: fi, market: market, side: side, prob: prob, odds: Picks.oddsOf(prob), label: label };
      paintSlate(); refreshSlip();
    }

    function oddBtn(fi, market, side, txt, prob) {
      var b = el("button", { class: "ax-picks__odd" }, [
        el("small", { text: txt }),
        el("b", { text: fmtOdds(Picks.oddsOf(prob)) })
      ]);
      if (sel && sel.fi === fi && sel.market === market && sel.side === side) b.classList.add("is-sel");
      b.addEventListener("click", function () { selectOdd(fi, market, side); });
      return b;
    }

    function paintSlate() {
      HL.dom.clear(slateEl);
      slate.forEach(function (f, fi) {
        var row = el("div", { class: "ax-picks__fix" }, [
          el("div", { class: "ax-picks__teams" }, [
            el("span", { class: "ax-picks__ic", text: f.ic }),
            el("span", { text: f.home }),
            el("span", { class: "ax-muted", text: " vs " }),
            el("span", { text: f.away })
          ]),
          el("div", { class: "ax-picks__mkt" }, [
            el("small", { class: "ax-picks__mklbl ax-muted", text: "獨贏" }),
            oddBtn(fi, "ml", "home", "主", f.homeProb),
            oddBtn(fi, "ml", "away", "客", 1 - f.homeProb),
            el("small", { class: "ax-picks__mklbl ax-muted", text: "大小" }),
            oddBtn(fi, "tot", "over", "大", f.overProb),
            oddBtn(fi, "tot", "under", "小", 1 - f.overProb)
          ])
        ]);
        slateEl.appendChild(row);
      });
    }

    function settle() {
      if (busy || !sel) return;
      var bet = amt.get();
      if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      busy = true; betBtn.setAttribute("disabled", "disabled");
      sel.bet = bet; setBal(bal() - bet);
      var f = slate[sel.fi];
      var draw = rnd();                       // 一單一 nonce＝可驗證
      // 以「所選盤口機率」判定：命中＝draw < prob（賠率 EDGE/prob ⇒ EV=EDGE，1% edge）
      var won = Picks.won(draw, sel.prob);
      var payout = won ? Picks.payoutOf(bet, sel.prob) : 0;
      setBal(bal() + payout); record(payout);
      // 產生與結果一致的裝飾比分/總分
      var resultTxt;
      if (sel.market === "ml") {
        var homeWins = (sel.side === "home") === won;   // 命中主勝或未命中客勝時＝主贏
        resultTxt = "終場 " + (homeWins ? (f.home + " 2–1 " + f.away) : (f.home + " 1–2 " + f.away));
      } else {
        var isOver = (sel.side === "over") === won;      // 命中大或未命中小時＝實際大分
        var total = isOver ? (Math.ceil(f.line) + 1) : Math.floor(f.line);
        resultTxt = "總分 " + total + "（" + (isOver ? "大分" : "小分") + "）";
      }
      if (won) {
        setStatus([el("span", { text: "✅ 命中！" }), el("span", { text: resultTxt }), el("span", { class: "ax-gold", text: " +" + money(payout - bet) }) ], "ax-green");
      } else {
        setStatus([el("span", { text: "❌ 未命中 · " }), el("span", { text: resultTxt }) ], "ax-red");
      }
      // 換新賽程、清選擇（讓玩家繼續下一單）
      slate = makeSlate(); sel = null; busy = false;
      paintSlate(); refreshSlip();
    }

    betBtn.addEventListener("click", settle);
    amt.node.addEventListener("input", refreshSlip, true);
    paintSlate();

    function slipStat(l, n) { return HL.ui.stat(l, n, "ax-mines__stat"); }
    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "🎯 ApexWin Picks 賽事預測" }),
      el("div", { class: "ax-inst__stage ax-picks" }, [
        slateEl,
        el("div", { class: "ax-picks__slip" }, [
          slipTeamsEl,
          el("div", { class: "ax-mines__top" }, [slipStat("我的預測", slipPickEl), slipStat("預估回報", slipRetEl)])
        ])
      ]),
      amt.node,
      el("div", { class: "ax-crash__btns" }, [betBtn]),
      statusEl,
      HL.ui.gameInfoBar({ fair: "一單一注", edge: "1% 莊家優勢", note: "模擬賽事非真實賽果" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "ApexWin Picks 賽事預測", provider: "Apex Studio", key: "picks" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "picks", title: "ApexWin Picks 賽事預測", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#1b5e43", c2: "#0a1f18", render: picksGame });
  }
})(typeof window !== "undefined" ? window : globalThis);

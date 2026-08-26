/*
 * Apex Win｜即時遊戲：Dice Duel 骰子對決（PvP vs Bot，重用 HL.instant 餘額/金額欄 + HL.fair 可驗證亂數）
 * 機制（對標 Duelbits Dice Duels 1v1）：玩家與一位對手（mock bot，沿用 #15 leaderboard bot 命名/頭像池）
 *   各擲一次點數（0–99），高者勝、贏家通吃「雙方賭注池」扣 1% 平台抽水＝1% 莊家優勢。
 *   平手則重擲（各多取一個 nonce）直到分出勝負。
 * 每次擲點 = HL.fair.float("dice-duel") 一注（一擲一 nonce）：point = floor(f*100)＝逐擲可驗證重算。
 * 派彩 = floor(bet * 1.98)（floor 而非 round：小注時 round 會反轉 1% edge，floor 保證 edge 恆 ≥1%）。
 * ApexWin 首個 PvP 對戰維度（此前所有 Originals 皆單人對莊）。以 register 新增 originals 可玩卡（id: dice-duel）。
 *
 * 保真契約（2026-08-01 遊戲軌·補 node 契約）：純數學區抽成 HL.duel（RAKE/payMult/rollOf/pWin/fairRTP/potWin/resolve + 揭曉節拍 youAtMs/oppAtMs/verdictAtMs），
 *   以 module.exports 暴露供 node RTP 驗證器 require＝「驗的即玩的同一份」（繼 dice/limbo/plinko/crash-x/mines/
 *   keno/towers/cases/hilo/pump 後 CRASH/INSTANT+special 家族再補一款）。DOM 存取移至 node early-return 後、IIFE
 *   globalThis fallback。**公平 RTP＝pWin·payMult＝0.5·(2·RAKE)＝RAKE＝99.0000% 恰等（對稱決鬥 + 平手重擲 ⇒
 *   條件於分出勝負 P(勝)=0.5，與點數分布無關、策略無關）**；potWin() 對派彩取 floor＝房家安全側（實付 RTP≤99%、
 *   >100% 數學排除，因 payMult=2·RAKE≤2 且 pWin=0.5 ⇒ RTP=RAKE≤1）。resolve() 為 render 與 node MC 共用同一份決鬥邏輯。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用 HL.duel）=====================
  var Duel = {
    RAKE: 0.99,                                     // 贏家通吃扣 1% 抽水
    payMult: function () { return 2 * this.RAKE; }, // 派彩倍數 = bet*(2*RAKE) = 1.98
    rollOf: function (f) { return Math.floor(f * 100); }, // 一 float → 0..99 一擲（逐擲可驗證重算）
    // 對稱決鬥（雙方同分布獨立擲點）+ 平手重擲 ⇒ 條件於「分出勝負」，P(勝)=0.5 恰等（與點數分布無關、策略無關）
    pWin: 0.5,
    // 公平 RTP = P(勝)·派彩倍數 = 0.5·2·RAKE = RAKE = 0.99（payMult=2·RAKE≤2 ⇒ RTP=RAKE≤1，>100% 數學排除）
    fairRTP: function () { return this.pWin * this.payMult(); },
    potWin: function (bet) { return Math.floor(bet * this.payMult()); }, // floor 房家安全側（實付 ≤ 公平）

    // ── 揭曉節拍（純函式，node 驗證器與瀏覽器共用同一份＝「驗的即玩的」）──────────────
    // 舊版（game-feel #55 flat-feedback + #29 dice-duel 半 pre-reveal-payout-leak）：
    //   單一 800ms setTimeout 內同一 tick 做完「移除滾動→同時寫兩個點數→掛勝負光暈→寫結論」＝
    //   雙方點數同時揭曉、沒有 1v1 對決該有的「先看到自己、再屏息等對手」懸念；且派彩在演出**之前**
    //   就 setBal 入帳 ⇒ 頁首錢包在骰子還沒揭曉前就先跳出贏額＝可見餘額洩漏結果。
    // 改為分階段：揭你的點 → 揭對手的點(sequential) → 比點(判勝負高亮＋此刻才入帳)。
    //   不變量（games/dice-duel/staged-reveal 鎖）：
    //   (a) 你的點嚴格早於對手的點（sequential，非同一 tick）；
    //   (b) 比點/入帳在兩點都揭定之後（結果先看到、錢後動＝不 pre-reveal 洩漏）；
    //   (c) 每一拍間隔 ≥ 可讀地板，且總時長有理智上界。
    YOU_AT_MS: 450,        // 揭你的點（第一拍）
    REVEAL_GAP_MS: 400,    // 你 → 對手（sequential 的屏息間隔）
    VERDICT_GAP_MS: 350,   // 對手揭定 → 比點/入帳（張力間隔）
    youAtMs:     function () { return this.YOU_AT_MS; },
    oppAtMs:     function () { return this.YOU_AT_MS + this.REVEAL_GAP_MS; },
    verdictAtMs: function () { return this.oppAtMs() + this.VERDICT_GAP_MS; },

    // 一場決鬥的結算（render 與 node MC 共用同一份）：nextFloat 為「取下一個 [0,1) 亂數」的函式。
    // 平手重擲（各多取一 nonce），guard 防理論無限迴圈（30 連平手機率 (1/100)^30＝天文級可忽略）。
    resolve: function (nextFloat) {
      var you, oth, guard = 0, tiePairs = [];
      do {
        you = this.rollOf(nextFloat()); oth = this.rollOf(nextFloat()); guard++;
        if (you === oth && guard < 30) tiePairs.push({ you: you, oth: oth }); // 記下每次「重擲的那一擲」＝實際消耗的 nonce（#39：讓平手重擲有畫面對應）
      } while (you === oth && guard < 30);
      return { you: you, oth: oth, win: you > oth, ties: guard - 1, tiePairs: tiePairs };
    }
  };
  HL.duel = Duel;
  if (typeof module !== "undefined" && module.exports) { module.exports = { duel: Duel }; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.instant || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;
  function bal() { return HL.instant.bal(); }
  function setBal(v) { HL.instant.setBal(v); }
  function rnd() { return HL.fair.floatOr("dice-duel"); } // T11：統一後援出口（float 語意不變）
  var pad = HL.dom.pad; // 沿用共用 helper（見 core/dom.js）

  function duelGame() {
    var busy = false;
    var amt = HL.instant.amountField(50);
    var pending = null;   // 在途未了結的一場：{ bet, payout } —— 揭曉那刻（或離場）才入帳/記錄
    var timers = [];
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(function (id) { clearTimeout(id); }); timers = []; }

    // 對戰雙方面板
    var youScore = el("b", { class: "ax-ddu__score", text: "—" });
    var oppScore = el("b", { class: "ax-ddu__score", text: "—" });
    var youCard = el("div", { class: "ax-ddu__side is-you" }, [
      el("div", { class: "ax-ddu__av", text: "👑" }),
      el("div", { class: "ax-ddu__name", text: "你" }),
      youScore
    ]);
    var oppName = el("div", { class: "ax-ddu__name", text: "對手" });
    var oppAv = el("div", { class: "ax-ddu__av", text: "🤖" });
    var oppCard = el("div", { class: "ax-ddu__side is-opp" }, [oppAv, oppName, oppScore]);
    var board = el("div", { class: "ax-ddu__board" }, [youCard, el("div", { class: "ax-ddu__vs", text: "VS" }), oppCard]);

    var histEl = HL.ui.histBar({ cls: "ax-ddu__hist", itemCls: "ax-ddu__h", max: 10, fair: true });
    var statusEl = el("div", { class: "ax-inst__last ax-muted" }, [el("span", { text: "設定賭注，向對手發起 1v1 骰子對決 ⚔️" })]);
    var battleBtn = el("button", { class: "ax-btn-primary", text: "對戰" });

    function setStatus(nodes, cls) {
      HL.dom.clear(statusEl);
      nodes.forEach(function (n) { statusEl.appendChild(n); });
      statusEl.className = "ax-inst__last " + (cls || "ax-muted");
    }
    function record(bet, payout) { if (HL.liveStats) HL.liveStats.record("dice-duel", bet, payout); }
    function pushHist(you, opp, win) { histEl.push(pad(you) + " : " + pad(opp), win ? "is-win" : "is-lose"); }
    function clearMarks() { youCard.classList.remove("is-winner", "is-loser"); oppCard.classList.remove("is-winner", "is-loser"); }
    // 據實了結在途的一場（揭曉那刻正常呼叫；冪等＝pending 清空後重呼為 no-op，防重複入帳）。
    //   派彩到此刻才 setBal ⇒ 演出前不洩漏結果（#29）；record 為中央掛鉤（VIP/任務/返水/JP/錦標賽），一次即可。
    function settlePending() {
      if (!pending) return;
      var p = pending; pending = null;
      if (p.payout) setBal(bal() + p.payout);
      record(p.bet, p.payout);
    }
    // 離場鉤：底部導覽／側邊抽屜換頁走 mountView，不經過本 view 的任何按鈕 ⇒ 若一場還在演出中途，
    //   payout 尚未入帳。沒有這一行，玩家贏了卻在離場時被靜默吞分（比照 vsslot escrow 的家族 B 修法）。
    if (HL.shell && HL.shell.onExit) HL.shell.onExit(function () { clearTimers(); settlePending(); });

    function battle() {
      if (busy) return;
      var bet = amt.get();
      if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      if (HL.rg && !HL.rg.check(bet)) return;   // #86：本檔自帶下注面板(amountField，未走 betPanel) ⇒ 需自帶閘；未設限時恆真＝零回歸
      busy = true; battleBtn.disabled = true;
      clearTimers();
      setBal(bal() - bet);   // 下注即扣（commit·誠實）；派彩則延後到揭曉後才入帳（見 settlePending）

      // 配對一位對手（bot 池）
      var opp = HL.mock.makeHost();
      oppAv.textContent = opp.av; oppName.textContent = opp.name;
      clearMarks(); youScore.textContent = "—"; oppScore.textContent = "—";

      // 先用可驗證亂數定勝負（走純數學 Duel.resolve＝與 node 驗證同一份；平手重擲，各多取一 nonce）
      var res = Duel.resolve(rnd);
      var you = res.you, oth = res.oth, win = res.win;
      var payout = win ? Duel.potWin(bet) : 0; // 贏家通吃扣 1% 抽水（floor 房家安全側）
      pending = { bet: bet, payout: payout };  // 尚未入帳：等揭曉那刻（或離場）才由 settlePending 據實了結

      // 擲骰演出：分階段揭曉（先你 → 再對手 → 比點），以 setTimeout 收尾（背景分頁也觸發，不依賴會被暫停的 rAF）
      setStatus([el("span", { text: "擲骰中…" })], "ax-muted");
      youScore.classList.add("is-rolling"); oppScore.classList.add("is-rolling");
      youScore.textContent = "?"; oppScore.textContent = "?";

      // 第一拍：揭你的點（對手仍在滾動＝1v1 對決的懸念起點）
      later(function () {
        youScore.classList.remove("is-rolling"); youScore.textContent = pad(you);
        statusEl.setAttribute("data-beat", "reveal-you");
      }, Duel.youAtMs());
      // 第二拍：揭對手的點（sequential，不與你同一 tick）
      later(function () {
        oppScore.classList.remove("is-rolling"); oppScore.textContent = pad(oth);
        statusEl.setAttribute("data-beat", "reveal-opp");
      }, Duel.oppAtMs());
      // 第三拍：比點——兩點都揭定之後才判勝負高亮＋入帳（結果先看到、錢後動＝不 pre-reveal 洩漏）
      later(function () {
        statusEl.setAttribute("data-beat", "verdict");
        // #39：平手重擲整段原本被吞（resolve 的 ties/tiePairs 從未被讀），資訊列卻宣告「平手重擲」、公平面板又列出畫面上從未出現的 nonce。
        //   把每次平手的那一擲也推進歷史帶（各消耗一組可驗證 nonce ⇒ 每個 nonce 現在都有畫面對應），並在狀態列據實標「平手重擲 ×N」。
        res.tiePairs.forEach(function (t) { histEl.push(pad(t.you) + " : " + pad(t.oth), "is-tie"); });
        pushHist(you, oth, win);
        youCard.classList.add(win ? "is-winner" : "is-loser");
        oppCard.classList.add(win ? "is-loser" : "is-winner");
        settlePending();   // 派彩此刻才入帳（揭曉後）；中途離場則由 onExit 補結
        var tieNote = res.ties > 0 ? [el("span", { class: "ax-ddu__tie", text: "🤝 平手重擲 ×" + res.ties + "　" })] : [];
        if (win) setStatus(tieNote.concat([el("span", { text: "🏆 你贏了！贏家通吃 " }), el("b", { class: "ax-gold", text: "+" + money(payout - bet) })]), "ax-green");
        else setStatus(tieNote.concat([el("span", { text: "💥 你輸了，賭注歸對手 " }), el("b", { text: "-" + money(bet) })]), "ax-red");
        busy = false; battleBtn.disabled = false;
      }, Duel.verdictAtMs());
    }
    battleBtn.addEventListener("click", battle);

    var node = el("div", { class: "ax-inst ax-fade-in" }, [
      el("h2", { class: "ax-inst__title", text: "⚔️ Dice Duel 骰子對決" }),
      el("div", { class: "ax-inst__stage ax-ddu" }, [board, histEl.node]),
      amt.node,
      el("div", { class: "ax-crash__btns" }, [battleBtn]),
      statusEl,
      HL.ui.gameInfoBar({ fair: "一擲一注", edge: "1% 莊家優勢（贏家通吃扣 1% 抽水）", note: "平手重擲" })
    ]);
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "Dice Duel 骰子對決", provider: "Apex Studio", key: "dice-duel" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({ id: "dice-duel", title: "Dice Duel 骰子對決", provider: "Apex Studio", type: "special", cat: "originals", playable: true, comingSoon: false, isNew: true, hot: true, c1: "#6e1e3a", c2: "#2a0a14", render: duelGame });
  }
})(typeof window !== "undefined" ? window : globalThis);

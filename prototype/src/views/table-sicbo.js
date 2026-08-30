/*
 * Apex Win｜骰寶 Sic Bo（掛在 HL.table 共用桌遊引擎上）
 * 三顆骰的多下注區亞洲賭桌：搖三骰求和，玩家在豐富的注區（近輪盤複雜度）押注。
 * 對 ApexWin 是全新「骰類 bet-area」維度（現有 TABLE 僅百家樂/輪盤/龍虎鬥皆發牌）；三骰純數學 → HL.fair 天然契合、可驗證公平最純。
 *
 * 對標 live-casino canonical 賠付/edge（來源 Wizard of Odds 標準 Macau 賠付表交叉查證）：
 *   大 Big(11-17,非圍) / 小 Small(4-10,非圍) 1:1 —— 逢任何圍骰(triple)皆輸；house edge 2.78%、RTP 97.22%（頭條主注）
 *   全圍 Any Triple 30:1（edge 13.89%）
 *   指定圍骰 Specific Triple ×6 180:1（edge 16.20%）
 *   單骰 Single ×6：出現 1/2/3 次 → 1:1 / 2:1 / 3:1（edge 7.87%）
 *   指定對子 Double ×6：該點 ≥2 顆 10:1（edge 18.52%）
 *   總點 Sum 4-17：canonical 逐點賠付（4/17=60:1、5/16=30:1、6/15=17:1、7/14=12:1、8/13=8:1、9/12/10/11=6:1）
 * 可驗證公平：每局取三個 HL.fair.floatOr 浮點 → ⌊f×6⌋+1（可事後重算）。
 * 結算走 HL.table（扣注/派彩/餘額同步 + 掛 HL.liveStats.record 中央點通吃 VIP/任務/返水/JP/帳本）。
 * 以 HL.games.register 覆蓋 mock 的「Sic Bo」占位卡（id: sic-bo）為可玩。
 * 載入順序：data/games.js 之後（覆蓋 seed）、core/table.js 之後。
 * 純數學區以 module.exports 暴露供 node 驗證器 → 驗的即玩家玩的同一份。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = !isNode ? (global.HL = global.HL || {}) : null;

  // ── 純數學區（node 驗證器與瀏覽器共用同一份）────────────────────────────
  var DIE_GLYPH = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]; // index 1..6

  // 總點 X:1 賠付表（canonical Macau 標準）。return = payout + 1（含本金）
  var SUM_PAY = { 4: 60, 5: 30, 6: 17, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 17, 16: 30, 17: 60 };

  function die(f) { var v = Math.floor(f * 6) + 1; return v > 6 ? 6 : (v < 1 ? 1 : v); }

  function summarize(d) {
    var sum = d[0] + d[1] + d[2];
    var counts = [0, 0, 0, 0, 0, 0, 0]; // index 1..6
    for (var i = 0; i < 3; i++) counts[d[i]]++;
    var triple = d[0] === d[1] && d[1] === d[2];
    return { dice: d, sum: sum, counts: counts, triple: triple, tripleFace: triple ? d[0] : 0 };
  }

  // 各注區「總賠付倍數」（輸=0）。與 HL.table.settle 的 returns 對接：payout = 注 × returns[id]
  function returnsOf(o) {
    var R = {}, n, sum = o.sum, c = o.counts, tri = o.triple;
    R.small = (!tri && sum >= 4 && sum <= 10) ? 2 : 0;            // 1:1，逢圍骰輸
    R.big   = (!tri && sum >= 11 && sum <= 17) ? 2 : 0;           // 1:1，逢圍骰輸
    R.anytriple = tri ? 31 : 0;                                   // 30:1
    for (n = 1; n <= 6; n++) {
      R["triple" + n] = (tri && o.tripleFace === n) ? 181 : 0;    // 指定圍骰 180:1
      R["double" + n] = (c[n] >= 2) ? 11 : 0;                     // 指定對子 10:1
      R["single" + n] = c[n] >= 1 ? (1 + c[n]) : 0;              // 單骰 1/2/3 次 → 1:1/2:1/3:1
    }
    for (n = 4; n <= 17; n++) R["sum" + n] = (sum === n) ? (SUM_PAY[n] + 1) : 0; // 總點逐點
    return R;
  }

  /* ── 分階段揭曉節拍（修 game-feel #10 flat-single-tick-round）──────────────────
   * 舊版：搖骰後單一 680ms setTimeout **同一 tick** 做完「揭三骰＋亮贏區＋派彩＋文字＋歷史＋清籌碼＋解鎖」，
   *   三顆骰同時全現、無逐顆揭骰的骰盅開蓋儀式，也無「先看到點數、錢才動」的張力間隔。
   * 修法：五拍——逐顆揭骰（die1<die2<die3 sequential，非同一 tick）→ 判定亮贏區（judge）→ 結算（settle，
   *   嚴格晚於判定）。各拍走純節拍函式（非裸毫秒，防 §10.2 繞過）、各寫一個 data-beat 供 headless 驗拍序。
   *   同 #16 dragon-tiger／#55 dice-duel 家族。節拍函式匯出供 node 驗證器＝驗的即玩的同一份。 */
  var DIE1_AT_MS = 520;      // 骰盅開蓋揭第一顆（搖動後）
  var DIE_GAP_MS = 300;      // 逐顆揭骰間隔（sequential reveal 的儀式感）
  var JUDGE_GAP_MS = 260;    // 第三顆落定 → 判定 / 亮贏區
  var SETTLE_GAP_MS = 320;   // 判定 → 結算（結果先見、錢才動的張力間隔）
  function die1AtMs() { return DIE1_AT_MS; }
  function die2AtMs() { return DIE1_AT_MS + DIE_GAP_MS; }
  function die3AtMs() { return die2AtMs() + DIE_GAP_MS; }
  function judgeAtMs() { return die3AtMs() + JUDGE_GAP_MS; }
  function settleAtMs() { return judgeAtMs() + SETTLE_GAP_MS; }

  /* ── 分級贏分回饋（修 game-feel #13 flat-feedback-no-tiering）──────────────────
   * 舊版：結算只寫一行綠字＋單一 is-win／ax-green，180:1 指定圍骰與 1:1 大小在視覺重量上完全相同，
   *   且淨額一次性 textContent 跳到終值（無 roll-up count-up）。玩家無法從畫面感知「這注中得很大」。
   * 修法：以「本局總回收倍數 x = payout / staked」分級（對齊 slot.js bigWin 的門檻語意：
   *   epic≥50×／mega≥15×／big≥5×／其餘為普通贏），結算拍寫 data-tier 供 headless 驗分級並掛分級輝光，
   *   再把淨額以 setTimeout 分步 roll-up（純節拍函式、非 rAF ⇒ 背景分頁/headless 也推進、末步精確等於淨額）。
   *   分級與節拍全走匯出純函式（非裸字串/裸毫秒），供 node 驗證器＝驗的即玩的同一份（防 §10.2 繞過、§4「修一半」）。 */
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

  var CORE = { die: die, summarize: summarize, returnsOf: returnsOf, SUM_PAY: SUM_PAY, DIE_GLYPH: DIE_GLYPH,
    die1AtMs: die1AtMs, die2AtMs: die2AtMs, die3AtMs: die3AtMs, judgeAtMs: judgeAtMs, settleAtMs: settleAtMs,
    DIE1_AT_MS: DIE1_AT_MS, DIE_GAP_MS: DIE_GAP_MS, JUDGE_GAP_MS: JUDGE_GAP_MS, SETTLE_GAP_MS: SETTLE_GAP_MS,
    winMult: winMult, winTier: winTier, tierLabel: tierLabel, rollupSteps: rollupSteps, rollupStepMs: rollupStepMs, rollupValueAt: rollupValueAt,
    TIER_EPIC: TIER_EPIC, TIER_MEGA: TIER_MEGA, TIER_BIG: TIER_BIG, ROLLUP_STEPS: ROLLUP_STEPS };
  if (isNode) { module.exports = CORE; return; }
  HL.sicBo = CORE; // 對外暴露純解析（供主播跟注/驗證器對照）

  // ── 瀏覽器 UI 區 ──────────────────────────────────────────────────────
  var el = HL.dom.el, money = HL.dom.money;

  // 真開局：三顆骰各取一浮點 → ⌊f×6⌋+1
  function rollRound() {
    var d = [die(HL.fair.floatOr("sic-bo")), die(HL.fair.floatOr("sic-bo")), die(HL.fair.floatOr("sic-bo"))];
    return summarize(d);
  }
  CORE.roll = rollRound; HL.sicBo.roll = rollRound;

  function infoModal() {
    HL.ui.modal("骰寶 Sic Bo · 規則 / 賠率", [
      el("p", { class: "ax-muted", text: "搖三顆骰子求和，於各注區下注。下列賠付與莊家優勢對標真實娛樂城標準（大/小為頭條主注 RTP 97.22%）。" }),
      HL.ui.payoutRules([
        { term: "大 BIG / 小 SMALL ", desc: "1:1；小=總點 4–10、大=11–17，逢任何圍骰(三同)皆輸。edge 2.78%" },
        { term: "全圍 ANY TRIPLE ", desc: "30:1；任意三顆同點。edge 13.89%" },
        { term: "指定圍骰 TRIPLE ", desc: "180:1；指定某點三顆全同。edge 16.20%" },
        { term: "單骰 SINGLE ", desc: "指定點出現 1/2/3 顆 → 賠 1/2/3 倍。edge 7.87%" },
        { term: "對子 DOUBLE ", desc: "10:1；指定某點至少兩顆。edge 18.52%" },
        { term: "總點 TOTAL ", desc: "4/17→60:1、5/16→30:1、6/15→17:1、7/14→12:1、8/13→8:1、9-12→6:1" }
      ], { cls: "ax-sb__rules" }),
      el("p", { class: "ax-muted", text: "本桌採可驗證公平（HMAC-SHA256）搖骰 · Demo：每局取三個浮點 f，每骰＝⌊f×6⌋+1，可事後重算。點「近況」珠可開驗證面板。" })
    ]);
  }

  function sicBoGame() {
    var spotEls = {};
    var diceRow = el("div", { class: "ax-sb__dice" });
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "下注後按「搖骰」，三骰求和決定各注區輸贏 🎲" });
    var history = HL.ui.histBar({ cls: "ax-sb__history", itemCls: "ax-sb__bead", max: 18, fair: true });

    function spot(id, label, odds, cls, glyph) {
      var badge = el("div", { class: "ax-sb__stake" });
      var kids = [];
      if (glyph) kids.push(el("div", { class: "ax-sb__glyph", text: glyph }));
      kids.push(el("div", { class: "ax-sb__spotlbl", text: label }));
      if (odds) kids.push(el("small", { class: "ax-sb__odds", text: odds }));
      kids.push(badge);
      var box = el("button", { class: "ax-sb__spot " + (cls || ""), onClick: function () { area.place(id); } }, kids);
      spotEls[id] = { badge: badge, box: box };
      return box;
    }

    function renderStakes() { HL.table.renderStakes(spotEls, area); }

    var area = HL.table.betArea({ game: "sic-bo", onChange: renderStakes });

    function section(title, gridCls, spots) {
      return el("div", { class: "ax-sb__section" }, [
        el("div", { class: "ax-sb__sechd", text: title }),
        el("div", { class: "ax-sb__grid " + gridCls }, spots)
      ]);
    }

    // 注區組裝
    var bigSmall = section("大 / 小", "ax-sb__grid--2", [
      spot("small", "小 SMALL", "1:1 · 4–10", "ax-sb__spot--sm"),
      spot("big", "大 BIG", "1:1 · 11–17", "ax-sb__spot--big")
    ]);
    var triples = section("圍骰", "ax-sb__grid--triples", [
      spot("anytriple", "全圍 ANY", "30:1", "ax-sb__spot--any")
    ].concat([1, 2, 3, 4, 5, 6].map(function (n) {
      return spot("triple" + n, "", "180:1", "ax-sb__spot--tri", DIE_GLYPH[n] + DIE_GLYPH[n] + DIE_GLYPH[n]);
    })));
    var singles = section("單骰（出現次數 → 1/2/3 倍）", "ax-sb__grid--6", [1, 2, 3, 4, 5, 6].map(function (n) {
      return spot("single" + n, "", "1:1", "ax-sb__spot--single", DIE_GLYPH[n]);
    }));
    var doubles = section("對子", "ax-sb__grid--6", [1, 2, 3, 4, 5, 6].map(function (n) {
      return spot("double" + n, "", "10:1", "ax-sb__spot--dbl", DIE_GLYPH[n] + DIE_GLYPH[n]);
    }));
    var sums = section("總點 TOTAL", "ax-sb__grid--sums", [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(function (n) {
      return spot("sum" + n, String(n), SUM_PAY[n] + ":1", "ax-sb__spot--sum");
    }));

    // revealCount：已揭骰數（0..3）。逐顆揭骰時 dice[0..count-1] 定格、其餘仍搖動 🎲，
    // 讓每一顆單獨落定（sequential reveal），而非同一 tick 三顆全現。
    function renderDice(o, revealCount) {
      HL.dom.clear(diceRow);
      for (var i = 0; i < 3; i++) {
        var shown = i < revealCount;
        var g = shown ? DIE_GLYPH[o.dice[i]] : "🎲";
        diceRow.appendChild(el("div", { class: "ax-sb__die" + (shown ? " is-in" : " is-roll") }, [
          el("span", { class: "ax-sb__diepip", text: g })
        ]));
      }
    }
    function clearTable() {
      for (var id in spotEls) spotEls[id].box.classList.remove("is-win");
    }
    function pushHistory(o) {
      if (o.triple) history.push("圍", "is-triple");
      else if (o.sum >= 11) history.push("大", "is-big");
      else history.push("小", "is-small");
    }

    function kindOf(o) { return o.triple ? ("圍骰 " + o.dice[0]) : (o.sum >= 11 ? "大" : "小"); }

    function onRoll() {
      var snap = area.commit(); if (!snap) return;
      area.lock(true); ctrls.dealBtn.disabled = true;
      clearTable();
      statusEl.textContent = "搖骰中…"; statusEl.className = "ax-inst__last ax-muted";

      var o = rollRound();          // 立即算出整局結果（RNG 回合開始就 commit）
      var ret = returnsOf(o);
      renderDice(o, 0);              // 先顯示搖動骰盅（0 顆已揭）

      // 第一/二/三拍：逐顆揭骰（sequential，非同一 tick；每顆單獨落定＝骰盅開蓋儀式）
      setTimeout(function () { renderDice(o, 1); statusEl.setAttribute("data-beat", "reveal-1"); }, die1AtMs());
      setTimeout(function () { renderDice(o, 2); statusEl.setAttribute("data-beat", "reveal-2"); }, die2AtMs());
      setTimeout(function () { renderDice(o, 3); statusEl.setAttribute("data-beat", "reveal-3"); }, die3AtMs());
      // 第四拍：判定——三骰全落定後才亮中獎注區、報點數/大小圍（結果先看到，錢未動）
      setTimeout(function () {
        var winSpots = {};
        for (var id in ret) if (ret[id] > 0) winSpots[id] = true;
        for (var sid in spotEls) if (winSpots[sid]) spotEls[sid].box.classList.add("is-win");
        statusEl.textContent = "🎲 " + o.dice.join(" · ") + " ＝ " + o.sum + "（" + kindOf(o) + "）";
        statusEl.className = "ax-inst__last ax-muted";
        statusEl.setAttribute("data-beat", "judge");
      }, judgeAtMs());
      // 第五拍：結算——結果已可見、錢才動（單一 setTimeout 閘門，背景分頁/無 rAF 也成立）
      setTimeout(function () {
        statusEl.setAttribute("data-beat", "settle");
        // 家族 D＋E：分階段結算（先掃輸家籌碼、再付贏家）——兩拍做在 HL.table，這裡只等它完成
        area.settleStaged(snap, ret).then(function (r) {
          pushHistory(o);
          var head = "🎲 " + o.dice.join(" · ") + " ＝ " + o.sum + "（" + kindOf(o) + "）　";
          function unlock() { area.lock(false); area.clear(); ctrls.dealBtn.disabled = false; }
          if (r.net <= 0) { // 輸／平：即時揭示、無 roll-up、清除分級輝光
            statusEl.textContent = head + "輸 " + money(-r.net);
            statusEl.className = "ax-inst__last ax-red";
            statusEl.style.fontWeight = ""; statusEl.style.textShadow = "";
            statusEl.setAttribute("data-tier", "loss");
            statusEl.setAttribute("data-beat", "settled");
            unlock(); return;
          }
          // 贏：#13 分級（data-tier）＋內聯分級輝光（零首屏 CSS）＋淨額 setTimeout 分步 roll-up（末步精確）
          var tier = winTier(r.payout, r.staked);
          statusEl.className = "ax-inst__last ax-green" + (tier ? " ax-sb__win--" + tier : "");
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
      }, settleAtMs());
    }

    var ctrls = area.controls(onRoll, "搖骰");

    var node = el("div", { class: "ax-inst ax-sb ax-fade-in" }, [
      el("div", { class: "ax-sb__titlerow" }, [
        el("h2", { class: "ax-inst__title", text: "🎲 骰寶 Sic Bo" }),
        el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal })
      ]),
      el("div", { class: "ax-sb__felt" }, [diceRow, statusEl]),
      el("div", { class: "ax-sb__bets" }, [bigSmall, triples, singles, doubles, sums]),
      el("div", { class: "ax-sb__histrow" }, [el("small", { class: "ax-muted", text: "近況" }), history.node]),
      HL.table.panel(area, ctrls)
    ]);

    renderDice({ dice: [0, 0, 0] }, 0);
    renderStakes();
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "骰寶 Sic Bo", provider: "Apex Studio", key: "sic-bo" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({
      id: "sic-bo", title: "骰寶 Sic Bo", provider: "Apex Studio",
      type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true,
      author: "Apex", c1: "#16a3a3", c2: "#0a3f3f", render: sicBoGame
    });
  }
})(typeof window !== "undefined" ? window : this);

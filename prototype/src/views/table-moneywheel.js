/*
 * Apex Win｜幸運轉盤 Money Wheel（對標 Evolution Dream Catcher 現金轉盤 · 掛在 HL.table 共用桌遊引擎上）
 * ApexWin 全新「GAME-SHOW 轉盤」品類 —— 填補 casinoCats 早已宣告卻長期空白的「遊戲節目 gameshow」分類。
 * 現有 TABLE(百家/輪盤/龍虎鬥/骰寶)皆發牌/擲骰的注區桌遊；本作是**大轉盤 + 乘數重轉**的新互動維度：
 *   玩家在 1/2/5/10/20/40 六個號碼上下注 → 轉盤旋轉 → 指針停在哪個號碼段、該號碼贏，賠付＝號碼:1。
 *   兩個乘數段(×2 / ×7)：轉到乘數 → 全部注保留、乘數累乘、**再轉一次**，最終停在號碼時以累積乘數放大彩金。
 *
 * 對標 canonical Dream Catcher（來源 Wizard of Odds，54 段配置與莊家優勢逐項交叉查證）：
 *   段數 54＝ 1×23 / 2×15 / 5×7 / 10×4 / 20×2 / 40×1 / ×2 乘數×1 / ×7 乘數×1
 *   賠付 N:1（號碼贏＝退 1 + N×累積乘數 倍本金）
 *   各號碼 house edge（獨立驗證 == Wizard of Odds）：
 *     10 → 3.42%(RTP 96.58%，頭條最低 edge) · 2 → 4.49%(95.51%) · 1 → 4.66%(95.34%)
 *     20 → 7.26%(92.74%) · 5 → 8.76%(91.24%) · 40 → 9.19%(90.81%)
 *   解析式 RTP(N) = s_N/52 + N·s_N/45（/45 項來自乘數重轉：命中乘數的期望倍數 E[mult]=1.2）
 * 可驗證公平：每次旋轉取一個 HL.fair.floatOr 浮點 → ⌊f×54⌋ 選段；乘數重轉再取新浮點（皆記入 nonce，可事後重算）。
 * 結算走 HL.table（扣注/派彩/餘額同步 + 掛 HL.liveStats.record 中央點通吃 VIP/任務/返水/JP/帳本）。
 * 以 HL.games.register 新增可玩卡（id: money-wheel、cat: gameshow）。
 * 載入順序：core/table.js 之後、data/games.js 之後。
 * 純數學區以 module.exports 暴露供 node 驗證器 → 驗的即玩家玩的同一份。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = !isNode ? (global.HL = global.HL || {}) : null;

  // ── 純數學區（node 驗證器與瀏覽器共用同一份）────────────────────────────
  var SEG_COUNT = 54;
  // canonical Dream Catcher 段數配置
  var SPEC = [
    { key: "40", type: "num", v: 40, count: 1 },
    { key: "20", type: "num", v: 20, count: 2 },
    { key: "m7", type: "mult", v: 7, count: 1 },
    { key: "10", type: "num", v: 10, count: 4 },
    { key: "m2", type: "mult", v: 2, count: 1 },
    { key: "5", type: "num", v: 5, count: 7 },
    { key: "2", type: "num", v: 2, count: 15 },
    { key: "1", type: "num", v: 1, count: 23 }
  ];
  var NUMS = [1, 2, 5, 10, 20, 40];               // 可下注號碼（賠付＝號碼:1）

  // 依「均勻散佈」決定性排出 54 段（無 RNG）：每類第 k 段落在圓周 (k+0.5)/count，合併後依位置排序
  // → 稀有大號碼平均分散、常見小號碼填空隙，接近實體轉盤觀感。順序不影響 RTP（均勻抽段），僅為視覺。
  function buildWheel() {
    var placed = [];
    SPEC.forEach(function (s, si) {
      for (var k = 0; k < s.count; k++) {
        placed.push({ pos: (k + 0.5) / s.count, tie: si, type: s.type, v: s.v, key: s.key });
      }
    });
    placed.sort(function (a, b) { return a.pos - b.pos || a.tie - b.tie; });
    return placed;
  }
  var SEGMENTS = buildWheel(); // length 54

  function segAt(f) {
    var i = Math.floor(f * SEG_COUNT);
    if (i < 0) i = 0; if (i >= SEG_COUNT) i = SEG_COUNT - 1;
    return i;
  }

  // 一整局：轉到乘數就累乘並再取新浮點重轉，停在號碼段收局。next()＝取下一個浮點。
  function resolveRound(next) {
    var spins = [], mult = 1, guard = 0, idx, seg;
    while (true) {
      idx = segAt(next());
      seg = SEGMENTS[idx];
      spins.push({ idx: idx, type: seg.type, v: seg.v });
      if (seg.type === "num") break;
      mult *= seg.v;               // 乘數段：累乘後重轉
      if (++guard > 60) {          // 保險絲（機率 ~0）：強制收在第一個號碼段
        for (var j = 0; j < SEG_COUNT; j++) if (SEGMENTS[j].type === "num") { idx = j; break; }
        spins.push({ idx: idx, type: "num", v: SEGMENTS[idx].v });
        break;
      }
    }
    var fin = spins[spins.length - 1];
    return { spins: spins, mult: mult, number: fin.v, finalIdx: fin.idx };
  }

  // 各注區「總賠付倍數」（輸=0）。號碼贏＝退 (1 + 號碼×累積乘數) 倍本金。
  function returnsOf(o) {
    var R = {};
    for (var i = 0; i < NUMS.length; i++) {
      var n = NUMS[i];
      R["n" + n] = (o.number === n) ? (1 + n * o.mult) : 0;
    }
    return R;
  }

  var CORE = {
    SEG_COUNT: SEG_COUNT, SPEC: SPEC, NUMS: NUMS, SEGMENTS: SEGMENTS,
    buildWheel: buildWheel, segAt: segAt, resolveRound: resolveRound, returnsOf: returnsOf
  };
  if (isNode) { module.exports = CORE; return; }
  HL.moneyWheel = CORE; // 對外暴露純解析（供驗證器/主播對照）

  // ── 瀏覽器 UI 區 ──────────────────────────────────────────────────────
  var el = HL.dom.el, money = HL.dom.money;

  var NUM_COLOR = { 1: "#3f6fd0", 2: "#2f9d55", 5: "#8a54d6", 10: "#159c9c", 20: "#e0872a", 40: "#d63b3b" };
  var MULT_COLOR = { 2: "#f2c53d", 7: "#ff5db1" };
  function segColor(s) { return s.type === "mult" ? MULT_COLOR[s.v] : NUM_COLOR[s.v]; }
  function segLabel(s) { return s.type === "mult" ? ("×" + s.v) : String(s.v); }

  // 真開局：乘數重轉時每轉各取一新浮點
  function nextFloat() { return HL.fair.floatOr("money-wheel"); }
  function spinRound() { return resolveRound(nextFloat); }
  CORE.spin = spinRound; HL.moneyWheel.spin = spinRound;

  function infoModal() {
    HL.ui.modal("幸運轉盤 Money Wheel · 規則 / 賠率", [
      el("p", { class: "ax-muted", text: "在 1 / 2 / 5 / 10 / 20 / 40 六個號碼上下注。轉盤停在哪個號碼、押中該號碼就贏，賠付＝號碼:1（例如押 10 中 10 → 賠 10 倍）。對標 Evolution Dream Catcher，54 段。" }),
      HL.ui.payoutRules([
        { term: "號碼 10 ", desc: "10:1；4 段。edge 3.42%（頭條最低莊家優勢、RTP 96.58%）" },
        { term: "號碼 1 / 2 ", desc: "1:1（23 段）/ 2:1（15 段）。edge 4.66% / 4.49%（最常見主注）" },
        { term: "號碼 5 / 20 / 40 ", desc: "5:1（7 段）/ 20:1（2 段）/ 40:1（1 段）。edge 8.76% / 7.26% / 9.19%（高賠側注）" },
        { term: "乘數段 ×2 / ×7 ", desc: "轉到乘數：全部注保留、乘數累乘後再轉一次；最終停在號碼時以累積乘數放大彩金（可連乘）。" }
      ], { cls: "ax-mw__rules" }),
      el("p", { class: "ax-muted", text: "本桌採可驗證公平（HMAC-SHA256）· Demo：每次旋轉取一個浮點 f，段＝⌊f×54⌋，乘數重轉再取新浮點，可事後重算。點「近況」珠可開驗證面板。" })
    ]);
  }

  function wheelGame() {
    var spinDeg = 0; // 累積旋轉角（永遠向前轉）

    // 轉盤：conic-gradient 背景 + 絕對定位號碼標籤，整體在 wheelRot 內旋轉；指針固定於頂端。
    var W = 360 / SEG_COUNT;
    var stops = SEGMENTS.map(function (s, i) {
      return segColor(s) + " " + (i * W).toFixed(3) + "deg " + ((i + 1) * W).toFixed(3) + "deg";
    }).join(", ");
    var wheelRot = el("div", { class: "ax-mw__rot" });
    wheelRot.style.background = "conic-gradient(from 0deg, " + stops + ")";
    SEGMENTS.forEach(function (s, i) {
      var a = (i + 0.5) * W;
      // 徑向標籤：以「底端＝轉盤中心」為軸旋轉 a 度，文字落在外緣（authentic radial look）
      var lab = el("div", { class: "ax-mw__seglbl" + (s.type === "mult" ? " is-mult" : "") }, [
        el("span", { text: segLabel(s) })
      ]);
      lab.style.transform = "rotate(" + a + "deg)";
      wheelRot.appendChild(lab);
    });
    var hub = el("div", { class: "ax-mw__hub" }, [
      el("div", { class: "ax-mw__hubnum", text: "🎡" }),
      el("div", { class: "ax-mw__hubmult" })
    ]);
    var wheel = el("div", { class: "ax-mw__wheel" }, [
      wheelRot,
      el("div", { class: "ax-mw__pointer" }),
      hub
    ]);
    var hubNum = hub.querySelector(".ax-mw__hubnum");
    var hubMult = hub.querySelector(".ax-mw__hubmult");

    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "在號碼上下注後按「旋轉」，指針停在哪個號碼即為開獎 🎡" });
    var history = HL.ui.histBar({ cls: "ax-mw__history", itemCls: "ax-mw__bead", max: 18, fair: true });

    // 六個號碼下注格
    var spotEls = {};
    function spot(n) {
      var badge = el("div", { class: "ax-mw__stake" });
      var box = el("button", {
        class: "ax-mw__spot", style: "--seg:" + NUM_COLOR[n],
        onClick: function () { area.place("n" + n); }
      }, [
        el("div", { class: "ax-mw__spotnum", text: String(n) }),
        el("small", { class: "ax-mw__spotodds", text: n + ":1" }),
        badge
      ]);
      spotEls["n" + n] = { badge: badge, box: box };
      return box;
    }
    function renderStakes() {
      for (var id in spotEls) {
        var v = area.staked(id);
        spotEls[id].badge.textContent = v ? money(v) : "";
        spotEls[id].box.classList.toggle("is-staked", v > 0);
      }
    }
    var area = HL.table.betArea({ game: "money-wheel", onChange: renderStakes });

    var betsRow = el("div", { class: "ax-mw__bets" }, NUMS.map(spot));

    function clearWins() { for (var id in spotEls) spotEls[id].box.classList.remove("is-win"); hubMult.textContent = ""; hubMult.classList.remove("is-on"); }

    // 把指針轉到 idx 段中心（永遠向前多轉 turns 圈）
    function spinTo(idx, durMs, turns) {
      var A = (idx + 0.5) * W;               // 段中心角（順時針、頂端為 0）
      var want = (360 - A) % 360;            // 該段落在頂端所需的 wheel 絕對角 mod 360
      var base = spinDeg + 360 * turns;
      var add = (want - (base % 360) + 360) % 360;
      spinDeg = base + add;
      wheelRot.style.transition = "transform " + durMs + "ms cubic-bezier(0.15,0.55,0.15,1)";
      wheelRot.style.transform = "rotate(" + spinDeg + "deg)";
    }

    function pushHistory(o) {
      var s = SEGMENTS[o.finalIdx];
      var cls = "is-n" + o.number;
      history.push(o.mult > 1 ? (o.number + "★") : String(o.number), cls);
      void s;
    }

    var ctrls;
    function onSpin() {
      var snap = area.commit(); if (!snap) return;
      area.lock(true); ctrls.dealBtn.disabled = true; clearWins();
      statusEl.textContent = "轉盤旋轉中…"; statusEl.className = "ax-inst__last ax-muted";
      hubNum.textContent = "🎡"; hubNum.style.color = "";

      var o = spinRound();               // 立即算出整局（RNG 回合開始就 commit，含所有乘數重轉）
      var ret = returnsOf(o);

      // 逐段動畫（乘數段短轉 + 顯示累積乘數 → 最終號碼段長轉收局）；結算由獨立 setTimeout 保證
      var STAGE = 1400, FINAL = 2600, accMult = 1;
      o.spins.forEach(function (sp, i) {
        var isLast = (i === o.spins.length - 1);
        var at = i * STAGE;
        setTimeout(function () {
          spinTo(sp.idx, isLast ? FINAL : STAGE - 200, isLast ? 6 : 4);
        }, at);
        if (!isLast) {
          accMult *= sp.v;
          var showMult = accMult;
          setTimeout(function () {   // 乘數段落定後顯示累積乘數徽章
            hubMult.textContent = "×" + showMult; hubMult.classList.add("is-on");
            hubNum.textContent = "🔥";
          }, at + (STAGE - 120));
        }
      });

      var totalMs = (o.spins.length - 1) * STAGE + FINAL + 260;
      setTimeout(function () {         // 單一保證結算閘門（背景分頁/無動畫也成立）
        var s = SEGMENTS[o.finalIdx];
        hubNum.textContent = segLabel(s); hubNum.style.color = segColor(s);
        if (o.mult > 1) { hubMult.textContent = "×" + o.mult; hubMult.classList.add("is-on"); }
        var winId = "n" + o.number;
        if (spotEls[winId]) spotEls[winId].box.classList.add("is-win");

        var r = area.settle(snap, ret);
        var multTxt = o.mult > 1 ? ("（×" + o.mult + " 乘數！）") : "";
        statusEl.textContent = "🎡 開出 " + o.number + " " + multTxt + "　" + (r.net >= 0 ? "贏 +" + money(r.net) : "輸 " + money(-r.net));
        statusEl.className = "ax-inst__last " + (r.net >= 0 ? "ax-green" : "ax-red");
        pushHistory(o);
        area.lock(false); area.clear(); ctrls.dealBtn.disabled = false;
      }, totalMs);
    }

    ctrls = area.controls(onSpin, "旋轉");

    var node = el("div", { class: "ax-inst ax-mw ax-fade-in" }, [
      el("div", { class: "ax-mw__titlerow" }, [
        el("h2", { class: "ax-inst__title", text: "🎡 幸運轉盤 Money Wheel" }),
        el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal })
      ]),
      el("div", { class: "ax-mw__felt" }, [wheel, statusEl]),
      betsRow,
      el("div", { class: "ax-mw__histrow" }, [el("small", { class: "ax-muted", text: "近況" }), history.node]),
      HL.table.panel(area, ctrls)
    ]);

    renderStakes();
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "幸運轉盤 Money Wheel", provider: "Apex Studio", key: "money-wheel" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({
      id: "money-wheel", title: "幸運轉盤 Money Wheel", provider: "Apex Studio",
      type: "table", cat: "gameshow", playable: true, comingSoon: false, isNew: true, hot: true,
      author: "Apex", c1: "#e0872a", c2: "#5a1010", render: wheelGame
    });
  }
})(typeof window !== "undefined" ? window : this);

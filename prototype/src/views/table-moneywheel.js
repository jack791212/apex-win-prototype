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
  var SEG_W = 360 / SEG_COUNT;                    // 每段角度＝每兩根釘之間的角度（釘落在段界）

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

  // ── 演出節拍（純函式·node 與瀏覽器共用同一份＝驗的即玩的）──────────────
  // game-feel #60：招牌高潮＝轉到乘數段。舊版一個乘數 stage 只有 1400ms，×N 徽章在 stage 尾端
  //   1280ms 才淡入、1400ms 就重轉 ⇒ 徽章只有 120ms 舞台時間、淡入到 ~60% 就被下一轉抹掉。
  //   本模型讓乘數落定「當拍」即揭曉徽章（MULT_BADGE_AT＝落定時刻），再停留 MULT_HOLD 讓玩家看清
  //   累積乘數這個招牌高潮，然後才重轉。號碼段仍以 FINAL_MS 長轉收局。
  var SPIN_MS = 1200;    // 乘數段轉盤過場時長（＝舊 STAGE-200，視覺不變）
  var MULT_HOLD = 900;   // 乘數落定後徽章停留（招牌高潮 dwell），舊版實際只有 120ms
  var FINAL_MS = 2600;   // 最終號碼段長轉收局（不變）
  var SETTLE_PAD = 260;  // 最終落定後到結算閘門的緩衝（不變）
  function spinMsOf(isLast) { return isLast ? FINAL_MS : SPIN_MS; }      // 某 stage 的轉盤過場時長

  /* ── 釘與撥片（修 game-feel #36 missing-genre-signature）────────────────────────────
   * 舊版：指針是一個**從不被動畫的靜態三角形**，輪面上一根釘也沒有。而「撥片啪啪啪地跳過一根根釘、
   *   隨轉盤減速而愈跳愈慢」正是 Money Wheel（Dream Catcher／Crazy Time）這個品類的**招牌物理訊號**——
   *   玩家判斷「還會不會再過一格」靠的就是它，少了它，一個 2.6 秒的長轉在感官上只是「圖在轉」。
   * 修法（三個刻意的選擇）：
   *   ① **釘聲時刻由曲線反解，不是另外編一套節奏**：轉盤走的是 CSS `transition` 的 cubic-bezier，
   *      釘聲要跟它同步就必須解「已轉角度 = k 根釘」對應的時間 ⇒ 反解貝茲（`easeTimeAt`）。
   *      ⚠️ 因此 `EASE` 是**單一真相**：CSS transition 字串與釘聲排程共用同一組控制點（`easeCss()` 組字串）。
   *      若兩邊各寫一份，改了曲線就會靜默失步——即 §4「修一半」形態④（彈分壽命 JS/CSS 各寫一套）的同型。
   *   ② **只排「人眼分得開」的那幾聲，前段交給 buzz**：一次最終轉動會經過 ~324–378 根釘，前段每兩根相隔
   *      僅數毫秒＝既排不動也看不出來。故由末端往回收，直到間隔 < `CLICK_MIN_GAP` 為止（減速 ⇒ 間隔單調，
   *      收到的必是一個後綴），其餘時間撥片走連續嗡鳴。實測最終段收到 ~11 聲、間隔 37→146ms。
   *   ③ **末聲落在停止前 W/2 的位置**：`spinTo` 永遠把段**中心**對到頂端 ⇒ 最後一根釘必在停止前半格，
   *      撥片「答」一聲之後轉盤才滑進段中心——這正是實體轉盤收尾的樣子，也是它會不會再過一格的張力所在。
   * 全走純函式（非裸毫秒/裸字串），node 驗證器與瀏覽器同一份＝驗的即玩的。 */
  var EASE = [0.15, 0.55, 0.15, 1];  // 轉盤減速曲線（CSS transition 與釘聲排程的單一真相）
  var TURNS_FINAL = 6;               // 最終號碼段轉幾圈
  var TURNS_MULT = 4;                // 乘數段轉幾圈
  var CLICK_MIN_GAP = 35;            // 兩聲釘聲至少相隔這麼久才排成「一聲」；更密者併入 buzz
  var CLICK_MAX = 24;                // 單次轉動最多排幾聲（上界：防極端參數排出上百個計時器）
  function easeCss() { return "cubic-bezier(" + EASE.join(",") + ")"; }   // 給 CSS transition 用（禁止另寫字面量）
  // 一維三次貝茲（P0=0、P3=1），s 為參數而非時間
  function bezAxis(a, b, s) { var m = 1 - s; return 3 * m * m * s * a + 3 * m * s * s * b + s * s * s; }
  function bezX(s) { return bezAxis(EASE[0], EASE[2], s); }   // 時間軸
  function bezY(s) { return bezAxis(EASE[1], EASE[3], s); }   // 進度軸
  // 反解：給「已走進度 p(0..1)」回傳它發生在時間比例 u(0..1)。解 bezY(s)=p 再取 bezX(s)。
  function easeTimeAt(p) {
    if (!(p > 0)) return 0; if (p >= 1) return 1;
    var lo = 0, hi = 1, s = 0;
    for (var i = 0; i < 60; i++) { s = (lo + hi) / 2; if (bezY(s) < p) lo = s; else hi = s; }
    return bezX((lo + hi) / 2);
  }
  // 本次轉動的角度增量（永遠向前；把 idx 段中心對到頂端）。UI 與排程共用，確保兩者算的是同一次轉動。
  function spinDeltaOf(curDeg, idx, turns) {
    var want = (360 - (idx + 0.5) * SEG_W) % 360;      // 該段中心落在頂端所需的絕對角 mod 360
    var base = curDeg + 360 * turns;
    return 360 * turns + ((want - (base % 360) + 360) % 360);
  }
  // 本次轉動該發出的釘聲時刻（ms，相對該段起拍），昇冪。由末端往回收＝天然只留得下減速後的那幾聲。
  function pegClickTimes(totalDeg, durMs) {
    var out = [];
    if (!(totalDeg > 0) || !(durMs > 0)) return out;
    var prev = durMs;                                   // 末聲之後就是停止
    for (var j = 0; j < 5000; j++) {
      var d = totalDeg - SEG_W / 2 - j * SEG_W;         // 由末端往回數第 j 根釘時「已轉的角度」
      if (d <= 0) break;
      var t = durMs * easeTimeAt(d / totalDeg);
      if (prev - t < CLICK_MIN_GAP) break;              // 再往回只會更密＝人眼分不開 ⇒ 交給 buzz
      out.push(t); prev = t;
      if (out.length >= CLICK_MAX) break;
    }
    return out.reverse();                               // 昇冪＝實際發生順序
  }
  function stageStartOf(i) { return i * (SPIN_MS + MULT_HOLD); }        // 第 i 個 stage 起拍（非末段皆等長）
  function multBadgeAt(i) { return stageStartOf(i) + SPIN_MS; }         // 乘數徽章揭曉拍＝該段落定當刻
  function multHoldMs() { return MULT_HOLD; }                           // 徽章停留（＝下一轉起拍 − 揭曉拍）
  function totalMsOf(k) { return (k - 1) * (SPIN_MS + MULT_HOLD) + FINAL_MS + SETTLE_PAD; } // k 段一局總時長

  /* ── 分級贏分回饋（修 game-feel #13 flat-feedback-no-tiering · Money Wheel 側）──────────
   * 舊版：結算只寫一行綠字＋單一 ax-green，押 40 中 ×7×2 放大到 561× 與押 1 中 2× 在視覺重量上完全相同，
   *   且淨額一次性 textContent 跳到終值（無 roll-up count-up）。玩家無法從畫面感知「這注中得很大」。
   * 修法：與 table-sicbo.js #13 同一把尺——以「本局總回收倍數 x = payout / staked」分級（對齊 slot.js bigWin：
   *   epic≥50×／mega≥15×／big≥5×／其餘為普通贏），結算拍寫 data-tier 供 headless 驗分級並掛分級輝光，
   *   再把淨額以 setTimeout 分步 roll-up（純節拍函式、非 rAF ⇒ 背景分頁/headless 也推進、末步精確等於淨額）。
   *   分級與節拍全走匯出純函式（非裸字串/裸毫秒），供 node 驗證器＝驗的即玩的同一份（防 §10.2 繞過、§4「修一半」）。 */
  // T52 單一真相：分級/roll-up 純函式家族收斂於 core/table-tier.js（此處只做繫結，不得再複製本體）
  var TIER = (typeof module !== "undefined" && module.exports) ? require("../core/table-tier.js") : HL.tableTier;
  var TIER_EPIC = TIER.TIER_EPIC, TIER_MEGA = TIER.TIER_MEGA, TIER_BIG = TIER.TIER_BIG;
  var ROLLUP_STEPS = TIER.ROLLUP_STEPS, ROLLUP_MS = TIER.ROLLUP_MS;
  var winMult = TIER.winMult, winTier = TIER.winTier, tierLabel = TIER.tierLabel;
  var rollupSteps = TIER.rollupSteps, rollupStepMs = TIER.rollupStepMs, rollupValueAt = TIER.rollupValueAt;

  var CORE = {
    SEG_COUNT: SEG_COUNT, SPEC: SPEC, NUMS: NUMS, SEGMENTS: SEGMENTS, SEG_W: SEG_W,
    buildWheel: buildWheel, segAt: segAt, resolveRound: resolveRound, returnsOf: returnsOf,
    EASE: EASE, easeCss: easeCss, easeTimeAt: easeTimeAt, spinDeltaOf: spinDeltaOf,
    pegClickTimes: pegClickTimes, CLICK_MIN_GAP: CLICK_MIN_GAP, CLICK_MAX: CLICK_MAX,
    TURNS_FINAL: TURNS_FINAL, TURNS_MULT: TURNS_MULT,
    spinMsOf: spinMsOf, stageStartOf: stageStartOf, multBadgeAt: multBadgeAt,
    multHoldMs: multHoldMs, totalMsOf: totalMsOf,
    winMult: winMult, winTier: winTier, tierLabel: tierLabel,
    rollupSteps: rollupSteps, rollupStepMs: rollupStepMs, rollupValueAt: rollupValueAt,
    TIER_EPIC: TIER_EPIC, TIER_MEGA: TIER_MEGA, TIER_BIG: TIER_BIG, ROLLUP_STEPS: ROLLUP_STEPS
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
    // #36：54 根釘落在**段界**（標籤落在段中心）——撥片就是靠它們一根根彈開的
    for (var pi = 0; pi < SEG_COUNT; pi++) {
      var peg = el("div", { class: "ax-mw__peg" });
      peg.style.transform = "rotate(" + (pi * W).toFixed(3) + "deg)";
      wheelRot.appendChild(peg);
    }
    var hub = el("div", { class: "ax-mw__hub" }, [
      el("div", { class: "ax-mw__hubnum", text: "🎡" }),
      el("div", { class: "ax-mw__hubmult" })
    ]);
    var flap = el("div", { class: "ax-mw__flap" });      // #36：會被釘彈開的撥片（取代從不動的靜態三角）
    var wheel = el("div", { class: "ax-mw__wheel" }, [
      wheelRot,
      el("div", { class: "ax-mw__pointer" }),
      flap,
      hub
    ]);
    wheel.setAttribute("data-clicks", "0");
    wheel.setAttribute("data-flap", "rest");
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
    function renderStakes() { HL.table.renderStakes(spotEls, area); }
    var area = HL.table.betArea({ game: "money-wheel", onChange: renderStakes });

    var betsRow = el("div", { class: "ax-mw__bets" }, NUMS.map(spot));

    function clearWins() { for (var id in spotEls) spotEls[id].box.classList.remove("is-win"); hubMult.textContent = ""; hubMult.classList.remove("is-on"); }

    // ── 撥片：釘聲排程（#36）───────────────────────────────────────────────
    // 世代閘（§4 形態⑦-(d)：用世代，不要用模組級節點參照）——換局/離場後舊排程一律啞火，
    // 否則上一局的釘聲會敲在下一局的畫面上。計時器同時收進 clickTimers 以便當場清掉。
    var spinEpoch = 0, clickTimers = [], clickCount = 0;
    function clearClicks() {
      spinEpoch++;
      for (var i = 0; i < clickTimers.length; i++) clearTimeout(clickTimers[i]);
      clickTimers = [];
      flap.classList.remove("is-buzz"); flap.classList.remove("is-hit");
      wheel.setAttribute("data-flap", "rest");
    }
    function tick(myEpoch) {
      if (myEpoch !== spinEpoch) return;                 // 第一個敘述句就問世代
      flap.classList.remove("is-buzz");
      flap.classList.remove("is-hit");
      void flap.offsetWidth;                             // 提交動畫起點（否則同一拍內重加 class 不會重播）
      flap.classList.add("is-hit");
      clickCount++;
      wheel.setAttribute("data-clicks", String(clickCount));
      wheel.setAttribute("data-flap", "tick");
    }
    // 依本次轉動的角度增量與時長排出該段的釘聲（時刻相對「現在」＝呼叫點就在該段起拍上）；
    // 前段太密者不排單聲，改由撥片連續嗡鳴代表。
    function scheduleClicks(deltaDeg, durMs) {
      var myEpoch = spinEpoch;
      var ts = pegClickTimes(deltaDeg, durMs);
      if (!ts.length) return;
      flap.classList.add("is-buzz");                     // 起拍即嗡鳴（釘太密、分不出單聲）
      wheel.setAttribute("data-flap", "buzz");
      ts.forEach(function (t) {
        clickTimers.push(setTimeout(function () { tick(myEpoch); }, t));
      });
    }

    // 把指針轉到 idx 段中心（永遠向前多轉 turns 圈）。回傳本次轉動的角度增量供釘聲排程使用
    // ——UI 與排程**共用同一個 spinDeltaOf**，確保釘聲算的就是這一次轉動。
    function spinTo(idx, durMs, turns) {
      var delta = spinDeltaOf(spinDeg, idx, turns);
      spinDeg += delta;
      wheelRot.style.transition = "transform " + durMs + "ms " + easeCss();
      wheelRot.style.transform = "rotate(" + spinDeg + "deg)";
      return delta;
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
      clearClicks(); clickCount = 0; wheel.setAttribute("data-clicks", "0");  // #36：新局＝舊釘聲一律啞火
      statusEl.textContent = "轉盤旋轉中…"; statusEl.className = "ax-inst__last ax-muted";
      hubNum.textContent = "🎡"; hubNum.style.color = "";

      var o = spinRound();               // 立即算出整局（RNG 回合開始就 commit，含所有乘數重轉）
      var ret = returnsOf(o);

      // 逐段動畫（乘數段落定當拍揭曉累積乘數徽章 + 停留 MULT_HOLD 招牌高潮 → 最終號碼段長轉收局）；
      // 節拍全由純函式 spinMsOf/stageStartOf/multBadgeAt 決定＝與 node 驗證器同一份。結算由獨立閘門保證。
      var accMult = 1;
      o.spins.forEach(function (sp, i) {
        var isLast = (i === o.spins.length - 1);
        var at = stageStartOf(i);
        setTimeout(function () {
          var dur = spinMsOf(isLast);
          // #36：轉盤與釘聲在**同一個呼叫點**產生——delta 由 spinTo 回傳，排程拿的就是這一次轉動的角度
          scheduleClicks(spinTo(sp.idx, dur, isLast ? TURNS_FINAL : TURNS_MULT), dur);
        }, at);
        if (!isLast) {
          accMult *= sp.v;
          var showMult = accMult;
          setTimeout(function () {   // 乘數段落定當拍揭曉累積乘數徽章（隨後 MULT_HOLD 停留＝招牌高潮）
            hubMult.textContent = "×" + showMult; hubMult.classList.add("is-on");
            hubNum.textContent = "🔥";
          }, multBadgeAt(i));
        }
      });

      var totalMs = totalMsOf(o.spins.length);
      setTimeout(function () {         // 單一保證結算閘門（背景分頁/無動畫也成立）
        var s = SEGMENTS[o.finalIdx];
        flap.classList.remove("is-buzz");                 // #36：落定＝撥片歸位（末聲已在停止前 W/2 敲完）
        wheel.setAttribute("data-flap", "rest");
        hubNum.textContent = segLabel(s); hubNum.style.color = segColor(s);
        if (o.mult > 1) { hubMult.textContent = "×" + o.mult; hubMult.classList.add("is-on"); }
        var winId = "n" + o.number;
        if (spotEls[winId]) spotEls[winId].box.classList.add("is-win");

        statusEl.setAttribute("data-beat", "settle");
        // 家族 D＋E：分階段結算（先掃輸家籌碼、再付贏家）——兩拍做在 HL.table，這裡只等它完成
        /* #11：付贏家那一拍，把每一個中獎注區各自賠了多少貼在它自己身上（總淨額看不出誰賠了幾倍） */
        area.settleStaged(snap, ret, { onPay: function (w, d) { HL.table.showPayouts(spotEls, d); } }).then(function (r) {
          pushHistory(o);
          var multTxt = o.mult > 1 ? ("（×" + o.mult + " 乘數！）") : "";
          var head = "🎡 開出 " + o.number + " " + multTxt + "　";
          function unlock() { area.lock(false); area.clear(); ctrls.dealBtn.disabled = false; }
          if (r.net <= 0) { // 輸／平：即時揭示、無 roll-up、清除分級輝光
            /* #11：淨額**恰為 0** 不是輸——押「小」＋「大」各 50 這種注法必有一輸一贏，
               舊版寫成 `"輸 " + money(-r.net)` ⇒ 畫面出現「輸 NT$ -0」（連負零都印出來了）。 */
            var flat = r.net === 0;
            statusEl.textContent = head + (flat ? "不賺不賠" : ("輸 " + money(-r.net)));
            statusEl.className = "ax-inst__last " + (flat ? "ax-muted" : "ax-red");
            statusEl.style.fontWeight = ""; statusEl.style.textShadow = "";
            statusEl.setAttribute("data-tier", flat ? "flat" : "loss");
            statusEl.setAttribute("data-beat", "settled");
            unlock(); return;
          }
          // 贏：#13 分級（data-tier）＋內聯分級輝光（零首屏 CSS）＋淨額 setTimeout 分步 roll-up（末步精確）
          var tier = winTier(r.payout, r.staked);
          statusEl.className = "ax-inst__last ax-green" + (tier ? " ax-mw__win--" + tier : "");
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

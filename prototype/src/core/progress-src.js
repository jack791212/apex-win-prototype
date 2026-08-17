/*
 * Apex Win｜進度來源註冊表 HL.progressSrc（自我進化引擎 #65）
 *
 * 為什麼要有：ApexWin 的**進度只認投注**。中央結算點 `HL.liveStats.record(game,bet,win)`
 *   是唯一入口，其下游 18 條訂閱者（vip/season/guild/tasks/rakeback/jackpot/tournament/
 *   raffle/shop/base/onboard…）**全部**由 `bet` 驅動。⇒ 玩家「儲值、每日回站」這些平台其實
 *   更在乎的行為，對 VIP 段位與賽季經驗的貢獻**恰好為零**（`app-shell.js` 的 `pushDemoTxn`
 *   只記 `HL.ledger`、`rewards.js` 簽到只 bump 任務與成就，兩者都不碰任何進度）。
 *
 * 四平台共識（platform-modules 台帳「VIP」模組已記，逐輪獨立收斂）：
 *   · Spree 2026-08-05：XP Rewards 的 XP 來自「遊玩」＋「**選購 GC 幣包**」兩條來源。
 *   · BigPirate 2026-08-05：XP 同樣「也來自買幣包」。
 *   · Deal or No Deal Win 2026-08-06：7 段 Stars 階梯的 Stars 來源＝「遊玩／任務」＋「選購幣包」。
 *   · CapySpin 2026-08-06（本輪刷新）：六階 VIP Club 的貨幣叫 **Growth Points**，明載
 *     「earn Growth Points through **daily logins and purchases**」＝把「每日回站」也算成進度來源，
 *     且 Monthly/Season Pass 是「爬 VIP 更快」的**加速軌**而非直接發錢。
 *   ⇒ 本表首批兩個新來源（`deposit`／`checkin`）**恰好對上 CapySpin 的 purchases + daily logins 兩條**。
 *
 * 【只發進度、不發錢】沿用 #50 `HL.edge` 已確立的紀律：本表只餵 `HL.vip.addWager` 與
 *   `HL.season.record` 兩個**進度**訂閱者。金額、帳本 `HL.ledger`、返水、彩金、抽獎券、任務目標、
 *   公會貢獻一律維持真實金額，本檔一行都不碰。
 *
 * 【真站零非投注進度＝可機械證明的經濟安全（刻意設計，非漏做）】
 *   非投注來源在真站一律 `xpPerLive: 0`。理由是**數學上的雙重計數**：玩家儲值 1,000（拿進度）
 *   後把同一筆 1,000 押出去（再拿一次進度）⇒ 每單位「真實莊家理論收入」對應的 XP 上升
 *   ⇒ VIP 升級金（`progress.js` `LEVEL_REWARDS`／`RANKS[].reward`）與季票獎勵的**每單位成本
 *   送出額隨之上升**＝可套利的儲值返利，牴觸 CLAUDE.md §11「真站 NGR 剛轉正、禁不起送幣量上調」。
 *   把真站係數設為 0 ⇒ 真站 XP 流入與改版前**逐位相同**，「送出額不增加」不是宣稱而是恆等式
 *   （測項 `progress-src/live-no-purchase-xp` 與 `progress-src/wager-identity` 兩條一起鎖住）。
 *   假站 demo 維持慷慨（留存玩法要看得到）。**未來要在真站開啟非投注進度，前提是先有下注模型
 *   能算出該筆儲值的期望莊家收入**——屆時只改本表一個數字，不動任何呼叫端。
 *
 * 【每日上限】每個來源可設 `cap`（每日 XP 上限，`HL.dom.dayNum` 日桶、跨日自動歸零），
 *   防「連續小額儲值刷段位」。`cap: 0` ＝不設限（僅 `wager` 如此＝維持既有行為）。
 *
 * 擴充性：新增一種可累積進度的行為＝`HL.progressSrc.register({...})` 一筆定義 + 呼叫端一行
 *   `HL.progressSrc.grant(id, amount)`，**不改 progress.js／season.js**。`register()` 對任何
 *   非 wager 類別**強制把 xpPerLive 預設為 0**（未明寫也不會漏出真站 XP＝fail-safe）。
 *   未註冊的 id 一律 0 XP（漏註冊只退化成「沒進度」，不會當掉也不會白送）。
 *
 * 與 #50 分工（勿合併）：#50 `HL.edge` 管「同樣是投注，不同遊戲值多少」；本檔管「除了投注，
 *   還有什麼算進度」。兩者串接：`live-stats` 先 `HL.edge.weighted(game,bet)` 再 `grant("wager", …)`。
 *
 * 雙環境契約（比照 #50/#51/#63/#66）：純資料/純函式區以 `module.exports` 暴露，
 *   `prototype/tests/run.js` 驗的即瀏覽器跑的同一份。
 * 註冊於 window.HL.progressSrc = { grant, register, xpFor, list, mode, open, ... }。
 *
 * 【2026-08-07 · #75 加速層】本檔第二層＝**進度乘數註冊表**（`registerBoost`）：季票進階軌與
 *   #49 促銷日曆的限時檔期都只是表裡的一筆。解析＝取最大不相乘（同 #52），真站上限 1.0＝零加速，
 *   乘數不得穿透每日 `cap`。詳見下方「#75 加速層」段落。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純資料：進度來源表 =====================
  // xpPer     ＝假站每一單位 amount 換多少 XP（wager 恆為 1＝原封不動）
  // xpPerLive ＝真站係數；非 wager 類別一律 0（見檔頭「真站零非投注進度」）
  // cap       ＝每日 XP 上限（0＝不設限）
  var SOURCES = {
    "wager": {
      id: "wager", kind: "wager", ic: "🎲", label: "遊戲押注",
      xpPer: 1, xpPerLive: 1, cap: 0,
      note: "經 HL.edge 依遊戲莊家成本加權後的有效押注（本來就有的唯一來源）"
    },
    "deposit": {
      id: "deposit", kind: "purchase", ic: "💳", label: "儲值",
      xpPer: 0.5, xpPerLive: 0, cap: 20000,
      note: "對標 Spree／BigPirate／DoND／CapySpin 的「買幣包也累積等級」；真站 0（雙重計數）"
    },
    "checkin": {
      id: "checkin", kind: "social", ic: "📅", label: "每日簽到",
      xpPer: 800, xpPerLive: 0, cap: 800,
      note: "對標 CapySpin「Growth Points from daily logins」；amount 恆為 1＝每日一筆定額"
    }
  };

  var WAGER_KIND = "wager";

  // ===================== 純函式 =====================
  function ids() { return Object.keys(SOURCES); }
  function srcOf(id) { return SOURCES[id] || null; }

  // 該來源在該站別的係數（未註冊＝0＝不給進度）
  function perFor(id, mode) {
    var s = srcOf(id);
    if (!s) return 0;
    var p = (mode === "live") ? s.xpPerLive : s.xpPer;
    return (typeof p === "number" && isFinite(p) && p > 0) ? p : 0;
  }

  function capFor(id) {
    var s = srcOf(id);
    if (!s) return 0;
    var c = +s.cap;
    return (isFinite(c) && c > 0) ? Math.floor(c) : 0;
  }

  // 未夾上限的 XP（整數、非負）
  function rawXp(id, amount, mode) {
    amount = +amount || 0;
    if (amount <= 0) return 0;
    var per = perFor(id, mode);
    if (per <= 0) return 0;
    return Math.floor(amount * per);
  }

  // 夾每日上限後實際可得的 XP。usedToday＝今日該來源已取得的 XP
  function xpFor(id, amount, mode, usedToday) {
    var raw = rawXp(id, amount, mode);
    if (raw <= 0) return 0;
    var cap = capFor(id);
    if (cap <= 0) return raw;                    // 不設限
    var left = cap - Math.max(0, Math.floor(+usedToday || 0));
    if (left <= 0) return 0;
    return Math.min(raw, left);
  }

  /* ===================== #75 加速層（進度乘數註冊表）=====================
   * 【在補什麼】ApexWin **有季票但它不加速進度**：`core/season.js` 的進階軌解鎖後給的是更大的
   *   獎金（`tier.prem.bonus`），`s.prem` 只影響「可領什麼」，**完全不影響 XP 累積速度**；
   *   全站唯一的進度乘數是 #50 `HL.edge`（依**遊戲**加權），**沒有任何「玩家層級的進度乘數」**。
   *   對標 CapySpin 的 Monthly/Season Pass 賣的就是「climb the VIP ranks **that much faster**」
   *   ＝賣進度速度而非獎金額度 ⇒ 這個維度在 ApexWin 無處可掛。
   *
   * 【解析規則＝取最大值，不是相乘】直接沿用 #52 `HL.rakeboost` 已確立的疊加紀律（相乘會讓
   *   成本無上界：兩個 ×2 疊成 ×4）。再夾一層站別硬上限 `BOOST_CAP`。
   *
   * 【真站上限刻意為 1.0 ＝真站零加速，且是恆等式不是宣稱】與 #65「非投注來源真站係數 0」同一條
   *   紅線、同一個理由：加速真站進度 ⇒ 每單位「真實莊家理論收入」對應的 XP 上升 ⇒ VIP 升級金與
   *   季票獎勵的**每單位成本送出額隨之上升**（牴觸 CLAUDE.md §11「真站 NGR 剛轉正」）。
   *   把真站上限夾成 1.0 ⇒ **任何註冊（含刻意傳 ×9 的呼叫端）都無法加速真站**，真站 XP 流入與
   *   本卡落地前**逐位相同**（測項 `progress-src/boost-live-identity` 鎖住）。
   *   未來要在真站開啟加速，前提同 #65：先有能算出該筆行為期望莊家收入的模型，屆時只改此一個數字。
   *
   * 【乘數不得穿透每日上限】加速只放大「未夾上限前的 raw」，`cap` 仍是最後一道夾子
   *   ⇒ 加速期間只是**更快撞到上限**，不是拿到更多（測項 `progress-src/boost-respects-cap`）。
   */
  var BOOST_CAP = { demo: 2.0, live: 1.0 };
  function boostCapOf(mode) { return (mode === "live") ? BOOST_CAP.live : BOOST_CAP.demo; }

  // 從「候選乘數陣列」解析出最終乘數：取最大、夾在 [1, BOOST_CAP]。空/全無效 ⇒ 1（＝零加速）
  function resolveBoost(mults, mode) {
    var best = 1;
    for (var i = 0; i < (mults || []).length; i++) {
      var v = +mults[i];
      if (isFinite(v) && v > best) best = v;
    }
    var cap = boostCapOf(mode);
    if (best > cap) best = cap;
    return best < 1 ? 1 : best;
  }

  /* 含加速的 XP。boostMult 未給/≤1 ⇒ 與 xpFor **逐位相同**（本卡對既有行為零影響的出口）。
     順序刻意為「先乘後夾」：cap 永遠是最後一道，故加速不得穿透每日上限。 */
  function xpForBoosted(id, amount, mode, usedToday, boostMult) {
    amount = +amount || 0;
    if (amount <= 0) return 0;
    var per = perFor(id, mode);
    if (per <= 0) return 0;
    var raw = Math.floor(amount * per * resolveBoost([boostMult], mode));
    if (raw <= 0) return 0;
    var cap = capFor(id);
    if (cap <= 0) return raw;
    var left = cap - Math.max(0, Math.floor(+usedToday || 0));
    if (left <= 0) return 0;
    return Math.min(raw, left);
  }

  // 非投注來源在某站別的係數總和（測項用：真站必須恰為 0）
  function nonWagerPerTotal(mode) {
    var t = 0;
    ids().forEach(function (id) { if (SOURCES[id].kind !== WAGER_KIND) t += perFor(id, mode); });
    return t;
  }

  // 註冊：非 wager 類別的真站係數**硬夾為 0**（不只是「預設 0」）。
  //   理由：動態註冊不得成為真站經濟的漏口——任何呼叫端（含未來的卡、放置區遊戲、實驗性模組）
  //   都無法靠傳一個 xpPerLive 就讓真站開始發非投注 XP。要在真站開啟，必須明確改本檔上方
  //   SOURCES 表＝一次刻意的原始碼變更，且得先過 progress-src/live-no-purchase-xp 測項。
  function register(def) {
    if (!def || !def.id || typeof def.id !== "string") return CORE;
    var per = +def.xpPer;
    if (!isFinite(per) || per <= 0) return CORE;
    var kind = def.kind || "social";
    var live = (kind === WAGER_KIND) ? (isFinite(+def.xpPerLive) ? Math.max(0, +def.xpPerLive) : per) : 0;
    SOURCES[def.id] = {
      id: def.id, kind: kind, ic: def.ic || "✨", label: def.label || def.id,
      xpPer: per, xpPerLive: live, cap: (+def.cap > 0 ? Math.floor(+def.cap) : 0),
      note: def.note || ""
    };
    return CORE;
  }

  var CORE = {
    SOURCES: SOURCES, WAGER_KIND: WAGER_KIND, BOOST_CAP: BOOST_CAP,
    ids: ids, srcOf: srcOf, perFor: perFor, capFor: capFor,
    rawXp: rawXp, xpFor: xpFor, nonWagerPerTotal: nonWagerPerTotal, register: register,
    boostCapOf: boostCapOf, resolveBoost: resolveBoost, xpForBoosted: xpForBoosted
  };

  // ===================== 測項（node + 瀏覽器共用同一份純函式）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    st.register({
      id: "progress-src/wager-identity", group: "progress-src",
      title: "投注來源＝恆等（改版後每一注的 XP 逐位不變）", env: "both",
      run: function (t) {
        var w = CORE.srcOf("wager");
        t.ok(!!w && w.kind === CORE.WAGER_KIND, "wager 來源應存在且為 wager 類別");
        t.ok(CORE.capFor("wager") === 0, "wager 不得設每日上限（否則重度玩家會被截斷＝行為改變）");
        ["demo", "live"].forEach(function (mode) {
          t.ok(CORE.perFor("wager", mode) === 1, mode + " 站的 wager 係數必須恰為 1，實際 " + CORE.perFor("wager", mode));
          [1, 7, 250, 9999, 1234567].forEach(function (n) {
            t.ok(CORE.xpFor("wager", n, mode, 0) === n, mode + " 站押注 " + n + " 應恰得 " + n + " XP，實際 " + CORE.xpFor("wager", n, mode, 0));
            // 已用額度再高也不得夾住投注（cap=0 路徑）
            t.ok(CORE.xpFor("wager", n, mode, 99999999) === n, mode + " 站 wager 不受已用額度影響");
          });
        });
      }
    });

    st.register({
      id: "progress-src/live-no-purchase-xp", group: "progress-src",
      title: "真站：非投注來源恰 0 XP（每單位成本送出額不增加）", env: "both",
      run: function (t) {
        t.ok(CORE.nonWagerPerTotal("live") === 0,
          "真站所有非投注來源的係數總和必須恰為 0，實際 " + CORE.nonWagerPerTotal("live"));
        var nonWager = CORE.ids().filter(function (id) { return CORE.SOURCES[id].kind !== CORE.WAGER_KIND; });
        t.ok(nonWager.length >= 2, "應至少有 2 個非投注來源（否則本測項是空殼），實際 " + nonWager.length);
        nonWager.forEach(function (id) {
          [1, 1000, 100000, 1e9].forEach(function (n) {
            t.ok(CORE.xpFor(id, n, "live", 0) === 0, "真站 " + id + " 帶 amount=" + n + " 應恰得 0 XP，實際 " + CORE.xpFor(id, n, "live", 0));
          });
          // 假站必須確實有效，否則整張卡等於沒做
          t.ok(CORE.xpFor(id, 100000, "demo", 0) > 0, "假站 " + id + " 應能取得 XP（否則本卡在兩站都是死碼）");
        });
      }
    });

    st.register({
      id: "progress-src/daily-cap", group: "progress-src",
      title: "每日上限：夾住不溢出、不倒扣、跨日可重來", env: "both",
      run: function (t) {
        var cap = CORE.capFor("deposit");
        t.ok(cap > 0, "deposit 應設每日上限（防連續小額儲值刷段位），實際 " + cap);
        t.ok(CORE.xpFor("deposit", 1e9, "demo", 0) === cap, "單筆超大儲值應恰被夾到上限 " + cap + "，實際 " + CORE.xpFor("deposit", 1e9, "demo", 0));
        t.ok(CORE.xpFor("deposit", 1e9, "demo", cap) === 0, "已用滿上限後應恰得 0，實際 " + CORE.xpFor("deposit", 1e9, "demo", cap));
        t.ok(CORE.xpFor("deposit", 1e9, "demo", cap + 12345) === 0, "已用超過上限（異常態）也不得為負或有值");
        var half = Math.floor(cap / 2);
        t.ok(CORE.xpFor("deposit", 1e9, "demo", half) === cap - half, "用掉一半後應只剩 " + (cap - half) + "，實際 " + CORE.xpFor("deposit", 1e9, "demo", half));
        // 單調：amount 越大不會拿到越少
        var prev = -1;
        [0, 100, 5000, 40000, 1e6].forEach(function (n) {
          var x = CORE.xpFor("deposit", n, "demo", 0);
          t.ok(x >= prev, "XP 應隨 amount 單調不減（amount=" + n + " → " + x + "）");
          prev = x;
        });
      }
    });

    st.register({
      id: "progress-src/fail-safe", group: "progress-src",
      title: "未註冊來源／非法 amount 一律 0（漏註冊只退化不白送）", env: "both",
      run: function (t) {
        t.ok(CORE.srcOf("no-such-source-xyz") === null, "未註冊來源的 srcOf 應為 null");
        ["demo", "live"].forEach(function (mode) {
          t.ok(CORE.xpFor("no-such-source-xyz", 99999, mode, 0) === 0, mode + " 站未註冊來源應恰得 0 XP");
          ["wager", "deposit", "checkin"].forEach(function (id) {
            t.ok(CORE.xpFor(id, 0, mode, 0) === 0, mode + " 站 " + id + " amount=0 應得 0");
            t.ok(CORE.xpFor(id, -500, mode, 0) === 0, mode + " 站 " + id + " 負 amount 應得 0（不得倒扣進度）");
            var x = CORE.xpFor(id, 3333, mode, 0);
            t.ok(x === Math.floor(x) && x >= 0, mode + " 站 " + id + " 的 XP 應為非負整數，實際 " + x);
          });
        });
      }
    });

    st.register({
      id: "progress-src/extensibility", group: "progress-src",
      title: "新增一種行為＝加一筆註冊（且真站預設不漏 XP）", env: "both",
      run: function (t) {
        var before = CORE.ids().length;
        CORE.register({ id: "__probe", kind: "social", label: "探針", xpPer: 5, cap: 50 });
        t.ok(CORE.ids().length === before + 1, "註冊後來源數應 +1");
        t.ok(CORE.xpFor("__probe", 4, "demo", 0) === 20, "假站探針 amount=4 應得 20 XP，實際 " + CORE.xpFor("__probe", 4, "demo", 0));
        t.ok(CORE.xpFor("__probe", 4, "live", 0) === 0, "**未明寫 xpPerLive 的非投注來源，真站必須自動為 0**（fail-safe）");
        t.ok(CORE.xpFor("__probe", 1e9, "demo", 0) === 50, "探針應受自身 cap 夾住");
        // 硬夾：即使呼叫端**刻意**傳非零真站係數，非投注來源也不得漏出真站 XP
        CORE.register({ id: "__probe2", kind: "purchase", label: "探針2", xpPer: 3, xpPerLive: 9 });
        t.ok(CORE.perFor("__probe2", "live") === 0,
          "非投注來源即使明寫 xpPerLive 也必須被硬夾為 0（動態註冊不得成為真站經濟漏口），實際 " + CORE.perFor("__probe2", "live"));
        t.ok(CORE.perFor("__probe2", "demo") === 3, "假站係數應照傳入值生效");
        delete CORE.SOURCES["__probe2"];
        // 非法定義一律不進表
        CORE.register({ id: "__bad", kind: "social", xpPer: 0 });
        CORE.register({ id: "", kind: "social", xpPer: 5 });
        CORE.register(null);
        t.ok(CORE.srcOf("__bad") === null, "xpPer<=0 的定義不得進表");
        delete CORE.SOURCES["__probe"];
        t.ok(CORE.ids().length === before, "測項應把探針清乾淨（不汙染後續測項）");
      }
    });

    /* ---------------- #75 加速層的四條不變量 ---------------- */

    st.register({
      id: "progress-src/boost-resolve-is-max-not-product", group: "progress-src",
      title: "加速解析＝取最大值（不相乘）且夾在 [1, 站別上限]", env: "both",
      run: function (t) {
        t.ok(CORE.resolveBoost([], "demo") === 1, "無加速應為 ×1");
        t.ok(CORE.resolveBoost(null, "demo") === 1, "null 應為 ×1");
        t.ok(CORE.resolveBoost([1.2, 1.5], "demo") === 1.5, "兩筆應取最大 1.5（相乘會是 1.8）");
        t.ok(CORE.resolveBoost([1.2, 1.5, 1.3], "demo") === 1.5, "三筆應取最大（相乘會是 2.34）");
        t.ok(CORE.resolveBoost([0.5], "demo") === 1, "小於 1 的乘數不得減損進度（加速層不該變成懲罰層）");
        t.ok(CORE.resolveBoost([NaN, 1.4], "demo") === 1.4, "NaN 應被忽略");
        t.ok(CORE.resolveBoost([99], "demo") === CORE.boostCapOf("demo"), "超上限應被夾到假站上限");
        t.ok(CORE.boostCapOf("live") <= CORE.boostCapOf("demo"), "真站上限必須 ≤ 假站上限（慷慨度方向不可反轉）");
        t.ok(CORE.boostCapOf("live") === 1, "真站上限必須恰為 1（＝真站零加速；改動此值前請先讀檔頭經濟安全段）");
        t.ok(CORE.boostCapOf("demo") > 1, "假站上限必須 >1（否則整層是死碼）");
      }
    });

    st.register({
      id: "progress-src/boost-live-identity", group: "progress-src",
      title: "真站：任何加速下 XP 與本卡落地前逐位相同（含刻意傳 ×9）", env: "both",
      run: function (t) {
        var amounts = [1, 7, 250, 20000, 1234567];
        CORE.ids().forEach(function (id) {
          amounts.forEach(function (n) {
            var base = CORE.xpFor(id, n, "live", 0);
            [undefined, 1, 1.2, 1.5, 2, 9, 1e6].forEach(function (b) {
              t.ok(CORE.xpForBoosted(id, n, "live", 0, b) === base,
                "真站 " + id + " amount=" + n + " boost=" + b + " 應恰等於未加速的 " + base +
                "，實際 " + CORE.xpForBoosted(id, n, "live", 0, b));
            });
          });
          // 非投注來源在真站仍恆 0（#65 紅線：加速不得成為繞過那個 0 的後門）
          if (CORE.SOURCES[id].kind !== CORE.WAGER_KIND) {
            t.ok(CORE.xpForBoosted(id, 1e9, "live", 0, 9) === 0,
              "真站非投注來源 " + id + " 在任何加速下都必須恰 0");
          }
        });
        // 假站零加速時也必須與 xpFor 逐位相同（本卡對既有行為零影響）
        CORE.ids().forEach(function (id) {
          amounts.forEach(function (n) {
            t.ok(CORE.xpForBoosted(id, n, "demo", 0, 1) === CORE.xpFor(id, n, "demo", 0),
              "假站 " + id + " 未加速時應與 xpFor 逐位相同");
          });
        });
      }
    });

    st.register({
      id: "progress-src/boost-respects-cap", group: "progress-src",
      title: "加速不得穿透每日上限（只是更快撞到上限，不是拿到更多）", env: "both",
      run: function (t) {
        var capped = CORE.ids().filter(function (id) { return CORE.capFor(id) > 0; });
        t.ok(capped.length >= 2, "應至少有 2 個設上限的來源（否則本測項是空殼），實際 " + capped.length);
        capped.forEach(function (id) {
          var cap = CORE.capFor(id);
          [1.2, 1.5, 2, 9].forEach(function (b) {
            t.ok(CORE.xpForBoosted(id, 1e9, "demo", 0, b) === cap,
              "假站 " + id + " boost=" + b + " 單筆超大 amount 仍應恰被夾到上限 " + cap +
              "，實際 " + CORE.xpForBoosted(id, 1e9, "demo", 0, b));
            t.ok(CORE.xpForBoosted(id, 1e9, "demo", cap, b) === 0, "已用滿上限後任何加速都應恰得 0");
            var half = Math.floor(cap / 2);
            t.ok(CORE.xpForBoosted(id, 1e9, "demo", half, b) === cap - half,
              "用掉一半後任何加速都只剩 " + (cap - half));
          });
        });
      }
    });

    st.register({
      id: "progress-src/boost-demo-effective", group: "progress-src",
      title: "假站：加速確實生效且單調（否則整層是死碼）", env: "both",
      run: function (t) {
        // wager 無上限 ⇒ 是唯一能觀察到「純加速效果」的來源
        t.ok(CORE.capFor("wager") === 0, "wager 應無每日上限（本測項的前提）");
        t.ok(CORE.xpForBoosted("wager", 1000, "demo", 0, 1.5) === 1500, "假站押注 1000 × 1.5 應得 1500，實際 " + CORE.xpForBoosted("wager", 1000, "demo", 0, 1.5));
        t.ok(CORE.xpForBoosted("wager", 1000, "demo", 0, 1.2) === 1200, "×1.2 應得 1200");
        t.ok(CORE.xpForBoosted("wager", 1000, "demo", 0, 9) === 1000 * CORE.boostCapOf("demo"), "超上限應被夾到假站上限倍");
        var prev = -1;
        [1, 1.1, 1.25, 1.5, 1.75, 2].forEach(function (b) {
          var x = CORE.xpForBoosted("wager", 777, "demo", 0, b);
          t.ok(x >= prev, "XP 應隨加速單調不減（boost=" + b + " → " + x + "）");
          prev = x;
        });
        // 整數性與非負（XP 不得出現小數，否則 VIP/賽季累加會漂）
        [1.13, 1.37, 1.99].forEach(function (b) {
          var x = CORE.xpForBoosted("wager", 333, "demo", 0, b);
          t.ok(x === Math.floor(x) && x >= 0, "加速後 XP 應為非負整數，實際 " + x);
        });
      }
    });

    if (isNode) return;

    st.register({
      id: "progress-src/wired", group: "progress-src",
      title: "中央結算點與儲值／簽到確實經由 HL.progressSrc 餵進度", env: "browser",
      run: function (t) {
        t.isFn(HL && HL.progressSrc && HL.progressSrc.grant, "HL.progressSrc.grant 應存在");
        t.isFn(HL && HL.liveStats && HL.liveStats.record, "中央結算點應存在");
        var src = String(HL.liveStats.record);
        t.ok(/progressSrc\.grant\(\s*"wager"/.test(src), "liveStats.record 應以 grant(\"wager\", …) 餵進度");
        t.ok(/HL\.edge/.test(src), "應仍先經 HL.edge 加權（#50 契約不變）");
        t.ok(/HL\.ledger\.record\("bet", *bet\b/.test(src), "帳本必須記真實 bet（加權/進度不得外流到帳目）");
        // 本檔只餵進度兩個訂閱者，不得碰錢
        var g = String(HL.progressSrc.grant);
        t.ok(/HL\.vip/.test(g) && /HL\.season/.test(g), "grant 應餵 HL.vip 與 HL.season");
        t.ok(!/HL\.bonus/.test(g) && !/HL\.ledger/.test(g) && !/HL\.state/.test(g),
          "grant 不得碰 HL.bonus／HL.ledger／HL.state（只發進度不發錢）");
      }
    });

    st.register({
      id: "progress-src/boost-wired", group: "progress-src",
      title: "#75 加速層：兩個來源已註冊、接進活動日曆、grant 走加速出口、真站恆 1×", env: "browser",
      run: function (t) {
        t.isFn(HL.progressSrc.registerBoost, "registerBoost 應存在");
        t.isFn(HL.progressSrc.boostMult, "boostMult 應存在");
        // grant 必須走加速出口（否則整層註冊了卻沒人讀＝#55/#54 家族踩過的「有容器沒接線」）
        var g = String(HL.progressSrc.grant);
        t.ok(/xpForBoosted/.test(g), "grant 應改走 xpForBoosted");
        t.ok(/boostMult/.test(g), "grant 應以 boostMult(id) 取當下倍率");
        t.ok(!/HL\.bonus/.test(g) && !/HL\.ledger/.test(g) && !/HL\.state/.test(g),
          "加速層落地後 grant 仍不得碰 HL.bonus／HL.ledger／HL.state（只發進度不發錢）");
        // 首批兩筆種子都在表裡
        var ids2 = HL.progressSrc.boostEntries().map(function (b) { return b.id; });
        t.ok(ids2.indexOf("season-prem") >= 0, "季票進階軌加速應已註冊，實際 " + ids2.join(","));
        t.ok(ids2.indexOf("progress-boost") >= 0, "限時經驗加速應已註冊，實際 " + ids2.join(","));
        // 容器採用度：#49 活動日曆的外部註冊者應含本卡（本卡使其 2 → 3）
        if (HL.promoCal && HL.promoCal.list) {
          var pids = HL.promoCal.list().map(function (p) { return p.id; });
          t.ok(pids.indexOf("progress-boost") >= 0, "本卡應已註冊進 #49 活動日曆，實際 " + pids.join(","));
        } else t.skip("promoCal 不可用");
        // 倍率恆在合法區間；opt-in 未加入時不得生效
        var m = HL.progressSrc.boostMult();
        t.ok(m >= 1 && m <= HL.progressSrc.boostCap(), "當前倍率 " + m + " 應落在 [1, " + HL.progressSrc.boostCap() + "]");
        var joined = !!(HL.promoCal && HL.promoCal.isJoined && HL.promoCal.isJoined("progress-boost"));
        var onNow = HL.progressSrc.activeBoosts().some(function (b) { return b.id === "progress-boost"; });
        t.ok(joined === onNow, "opt-in 加速的生效狀態必須與「是否已加入」一致（joined=" + joined + " active=" + onNow + "）");
        // 真站：任何註冊都不得加速（純核心夾死）
        t.ok(HL.progressSrc.core.boostCapOf("live") === 1, "真站上限必須恰為 1×");
      }
    });

    /* U34 同型的「面板實際開一次」鎖：本卡在既有面板加了一個新區塊（boostNode），
       而 #60 的 `RB_RATES` 事故證明「只驗純函式、從不開面板」會讓整個面板靜默拋錯數日。 */
    st.register({
      id: "progress-src/panel-opens", group: "progress-src",
      title: "進度來源面板可實際開啟且加速區塊有渲染", env: "browser",
      run: function (t) {
        var threw = null;
        try { HL.progressSrc.open(); } catch (e) { threw = e.message; }
        t.ok(threw === null, "HL.progressSrc.open() 不得拋錯，實際：" + threw);
        var m = document.querySelector(".ax-modal");
        t.ok(!!m, "面板應實際渲染出 modal");
        var rows = m ? m.querySelectorAll(".ax-edge__row") : [];
        t.ok(rows.length >= 4, "應有表頭 + 每個來源一列（≥4），實際 " + rows.length);
        var txt2 = m ? m.innerText : "";
        t.ok(/加速|Boost|加速/.test(txt2) || /×/.test(txt2), "加速區塊應有渲染（無加速時亦應有一行說明）");
        if (HL.ui && HL.ui.closeAll) HL.ui.closeAll();
      }
    });

    /* 迴歸鎖：本卡的唯一入口在 VIP 面板內，而該面板自 #60 起因 `RB_RATES` 更名漏改而**開一次就拋錯、
       零渲染**，歷時 2 天無人察覺——因為沒有任何測項真的「開過」它。此測項即補上那個缺的動作：
       實際呼叫 HL.vip.open()，斷言不拋錯、福利矩陣渲染出每段位一列、且本卡入口鈕在裡面。 */
    st.register({
      id: "progress-src/vip-panel-opens", group: "progress-src",
      title: "VIP 面板可實際開啟（福利矩陣渲染 + 本卡入口存在）", env: "browser",
      run: function (t) {
        t.isFn(HL.vip && HL.vip.open, "HL.vip.open 應存在");
        var threw = null;
        try { HL.vip.open(); } catch (e) { threw = e.message; }
        t.ok(threw === null, "HL.vip.open() 不得拋錯，實際：" + threw);
        var m = document.querySelector(".ax-modal");
        t.ok(!!m, "VIP 面板應實際渲染出 modal");
        var rows = m ? m.querySelectorAll(".ax-vipmx__row") : [];
        t.ok(rows.length >= 6, "福利矩陣應有表頭 + 每段位一列（≥6），實際 " + rows.length);
        var pcts = m ? (m.innerText.match(/\d+\.\d%/g) || []) : [];
        t.ok(pcts.length >= 5, "各段位返水率應渲染為百分比（≥5 筆），實際 " + pcts.length);
        // 語意鎖：矩陣的「返水」欄必須是**絕對返水率**（RB_LEGACY 量級 <2%），不得誤填
        //   rakebackCore 的「占莊家優勢比例」（20%~90% 量級）＝同面板兩個「返水」互相矛盾。
        var big = pcts.filter(function (p) { return parseFloat(p) >= 5; });
        t.ok(big.length === 0,
          "福利矩陣的返水欄應為絕對返水率（<5%），不得混入「占莊家優勢比例」，實際越界值：" + big.join(","));
        var btns = m ? Array.prototype.filter.call(m.querySelectorAll("button"), function (b) { return /進度來源/.test(b.textContent); }) : [];
        t.ok(btns.length === 1, "VIP 面板內應有恰一個「進度來源」入口鈕，實際 " + btns.length);
        if (HL.ui && HL.ui.closeAll) HL.ui.closeAll();
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 以下為瀏覽器區 =====================
  var el = HL.dom.el;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet, dayNum = HL.dom.dayNum;
  var KEY = "HL_PROGSRC";
  // XP 不是錢：一律用純數字（千分位），**不得用 HL.dom.money** ——首版誤用 money() 導致
  //   面板顯示「每日上限 NT$ 20,000」把經驗值印成貨幣，preview 抓到後改此helper（同 heat/raffle 慣例）。
  function num(n) { return Math.round(+n || 0).toLocaleString("en-US"); }
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }

  function mode() { return (HL.site && HL.site.isLive && HL.site.isLive()) ? "live" : "demo"; }

  // 日桶：跨日自動歸零（同 shop/cashback/rakeback 的 dayNum 慣例）
  function usedState() {
    var o = ls(KEY, null);
    var d = dayNum();
    if (!o || o.day !== d) { o = { day: d, used: {} }; save(KEY, o); }
    if (!o.used) o.used = {};
    return o;
  }
  function usedToday(id) { return usedState().used[id] || 0; }

  /* ===================== #75 加速層：註冊表（比照 HL.rakeboost / HL.promoCal 家族）=====================
     registerBoost(spec)：
       id       唯一鍵（同 id 覆蓋＝可熱替換）
       name/icon 顯示用（name 為可翻譯的完整片語，勿與動態值串接＝P3 契約）
       avail()  模組是否可用（false ⇒ 整筆跳過 ⇒ **載入序無關**，本檔早於 season.js/promo-cal.js 也安全）
       mult()   當下乘數（1 ＝未生效）
       msLeft() 剩餘毫秒（0/未給 ⇒ 不顯示倒數）
       sources  null ＝套用到所有來源；陣列 ＝只套用到列出的來源 id（例：只加速投注）
     ⚠️ 這裡刻意**不提供** live 專屬欄位：真站上限由純核心 `BOOST_CAP.live = 1` 夾死，
        任何 spec（含刻意寫 ×9 者）都不可能加速真站＝與 #65 的 `xpPerLive` 硬夾同一種 fail-safe。 */
  var BOOSTS = [];
  function callv(v, dflt) { try { return typeof v === "function" ? v() : (v === undefined ? dflt : v); } catch (e) { return dflt; } }

  function registerBoost(spec) {
    if (!spec || !spec.id) return HL.progressSrc;
    BOOSTS = BOOSTS.filter(function (b) { return b.id !== spec.id; });
    BOOSTS.push(spec);
    return HL.progressSrc;
  }
  function unregisterBoost(id) { BOOSTS = BOOSTS.filter(function (b) { return b.id !== id; }); return HL.progressSrc; }
  function boostEntries() { return BOOSTS.slice(); }

  // 當下所有「已生效」的加速（mult > 1 且適用於 srcId；srcId 省略＝不做來源過濾）
  function activeBoosts(srcId) {
    var out = [];
    BOOSTS.forEach(function (sp) {
      if (!callv(sp.avail, true)) return;
      if (srcId && sp.sources && sp.sources.indexOf(srcId) < 0) return;
      var m = +callv(sp.mult, 1) || 1;
      if (!(m > 1)) return;
      out.push({ id: sp.id, name: callv(sp.name, sp.id), icon: sp.icon || "🚀", mult: m, msLeft: +callv(sp.msLeft, 0) || 0, sources: sp.sources || null });
    });
    out.sort(function (a, b) { return b.mult - a.mult; });   // 最高在前＝實際生效的那筆
    return out;
  }

  // 某來源當下的最終加速倍率（真站恆 1＝由純核心夾死）
  function boostMult(srcId) {
    return resolveBoost(activeBoosts(srcId).map(function (b) { return b.mult; }), mode());
  }
  function boostCap() { return boostCapOf(mode()); }

  /* 唯一出口：把一筆行為換成進度並餵給兩個進度訂閱者。
     回傳實際入帳的 XP（0＝該來源在本站別關閉／已達每日上限／未註冊）。
     ⚠️ 只發進度：本函式刻意不觸碰 HL.bonus／HL.ledger／HL.state（測項 progress-src/wired 鎖住）。 */
  function grant(id, amount) {
    var xp = xpForBoosted(id, amount, mode(), usedToday(id), boostMult(id));
    if (xp <= 0) return 0;
    var st = usedState();
    st.used[id] = (st.used[id] || 0) + xp;
    save(KEY, st);
    if (HL.vip && HL.vip.addWager) HL.vip.addWager(xp);
    if (HL.season && HL.season.record) HL.season.record(xp);
    return xp;
  }

  // 非投注來源實際入帳時給一則輕提示（投注不提示＝每注都彈會很吵）
  function grantNotify(id, amount) {
    var xp = grant(id, amount);
    if (xp > 0 && HL.ui && HL.ui.toast) {
      var s = srcOf(id);
      HL.ui.toast(s.ic + " " + t(s.label, s.label) + " " + t("累積 VIP 經驗", "累積 VIP 經驗") + " +" + num(xp), "ok");
    }
    return xp;
  }

  // 唯讀說明表（比照 HL.edge.open／HL.sla.open：讓「有內容沒出口」不再重演）
  function list() {
    var m = mode();
    return ids().map(function (id) {
      var s = SOURCES[id];
      return { id: id, ic: s.ic, label: s.label, kind: s.kind, per: perFor(id, m), cap: capFor(id), used: usedToday(id), note: s.note };
    }).sort(function (a, b) { return (b.per - a.per) || a.id.localeCompare(b.id); });
  }

  /* ⚠️ i18n 結構鐵律（P3 陷阱，本檔首版就踩到並由 preview 三語驗證抓到）：
     `HL.i18n.t` 是 passthrough，真正的翻譯只發生在 DOM walker，且**要求整個文字節點恰等於一條 key**。
     故「中文 + 數字」串接（如 `每日上限 20,000 XP（已用 0）`）永遠翻不到——首版就是這樣寫，
     EN/zh-Hans 下整列殘留繁中，而同列的 `不設上限`（單一純 key、無串接）卻正常翻譯＝診斷鐵證。
     修法＝**每條 key 各自獨立成一個元素，數字與標點放在裸文字節點**（下方寫法）。 */
  function txt(s) { return document.createTextNode(s); }
  function row(r) {
    var live = mode() === "live";
    var off = r.per <= 0;
    var capCell = r.cap
      ? el("small", { class: "ax-muted" }, [
          el("span", { text: "每日上限" }), txt(" " + num(r.cap) + " XP（"),
          el("span", { text: "已用" }), txt(" " + num(r.used) + "）")
        ])
      : el("small", { class: "ax-muted" }, [el("span", { text: "不設上限" })]);
    return el("div", { class: "ax-edge__row" + (off ? " is-off" : "") }, [
      el("span", { class: "ax-edge__name" }, [txt(r.ic + " "), el("span", { text: r.label })]),
      capCell,
      el("b", { class: "ax-edge__mult" }, off
        ? [live ? el("span", { text: "真站關閉" }) : txt("—")]
        : [txt(r.per + "×")])
    ]);
  }

  /* #75 加速層的唯一呈現出口（避免又一個「有內容沒出口」）。
     ⚠️ i18n：每條 key 各自獨立成元素、數字放裸文字節點（同上方 row() 的 P3 契約）。 */
  function boostNode() {
    if (mode() === "live") {
      return el("small", { class: "ax-muted", style: "display:block;margin-top:10px" },
        [el("span", { text: "真站不套用經驗加速。" })]);
    }
    var list2 = activeBoosts(), m = boostMult();
    if (m <= 1) {
      return el("small", { class: "ax-muted", style: "display:block;margin-top:10px" },
        [el("span", { text: "目前無經驗加速生效。" })]);
    }
    var top = list2[0];
    var kids = [
      el("div", { class: "ax-kv" }, [
        el("span", { text: "當前經驗加速" }),
        el("b", { class: "ax-gold", text: "×" + m })
      ])
    ];
    if (top.msLeft > 0) {
      kids.push(el("div", { class: "ax-kv" }, [
        el("span", { text: "加速剩餘時間" }),
        el("b", { text: HL.dom.dhm(top.msLeft) })
      ]));
    }
    kids.push(el("small", { class: "ax-muted", style: "display:block" },
      [el("span", { text: "多個加速同時符合時只套用最高的一個（不相乘），且加速不會提高每日上限。" })]));
    if (list2.length > 1) {
      kids.push(el("small", { class: "ax-muted", style: "display:block" }, [
        el("span", { text: "其他符合但未套用的加速：" }),
        txt(" " + list2.slice(1).map(function (b) { return b.icon + " " + b.name + " ×" + b.mult; }).join(" · "))
      ]));
    }
    return el("div", { class: "ax-panel", style: "margin-top:10px" }, kids);
  }

  function open() {
    var live = mode() === "live";
    var head = el("div", { class: "ax-edge__row ax-edge__row--head" }, [
      el("span", { text: t("進度來源", "進度來源") }),
      el("small", { text: t("每日上限", "每日上限") }),
      el("b", { text: t("經驗倍率", "經驗倍率") })
    ]);
    HL.ui.modal(t("進度來源", "進度來源"), [
      el("div", {}, [
        el("p", { class: "ax-muted", style: "margin:0 0 8px",
          text: t("除了遊戲押注，儲值與每日簽到也會累積 VIP 經驗與賽季經驗。這些來源只累積進度，不影響任何金額、返水、彩金或帳目。",
                  "除了遊戲押注，儲值與每日簽到也會累積 VIP 經驗與賽季經驗。這些來源只累積進度，不影響任何金額、返水、彩金或帳目。") }),
        el("p", { class: "ax-muted", style: "margin:0 0 10px",
          text: live ? t("真站僅計入遊戲押注：非投注來源一律關閉，避免同一筆錢被重複計為進度。",
                         "真站僅計入遊戲押注：非投注來源一律關閉，避免同一筆錢被重複計為進度。")
                     : t("假站已開啟全部來源，各來源設有每日上限。", "假站已開啟全部來源，各來源設有每日上限。") }),
        el("div", { class: "ax-edge__list" }, [head].concat(list().map(row))),
        boostNode(),
        el("p", { class: "ax-muted", style: "margin:10px 0 0",
          text: t("未列出的行為不累積進度。", "未列出的行為不累積進度。") })
      ])
    ], { wide: true });
  }

  HL.progressSrc = {
    grant: grant, grantNotify: grantNotify, register: register,
    xpFor: xpFor, xpForBoosted: xpForBoosted, rawXp: rawXp, perFor: perFor, capFor: capFor,
    ids: ids, srcOf: srcOf, list: list, usedToday: usedToday, mode: mode, open: open,
    nonWagerPerTotal: nonWagerPerTotal,
    registerBoost: registerBoost, unregisterBoost: unregisterBoost, boostEntries: boostEntries,
    activeBoosts: activeBoosts, boostMult: boostMult, boostCap: boostCap, core: CORE
  };

  /* ---------- #75 首批兩個加速來源：都只是表裡的一筆 ---------- */

  // ① 季票進階軌（#46）：解鎖後「成長更快」而不只是「獎金更多」＝對標 CapySpin Season Pass
  //    avail/mult 皆為惰性閉包 ⇒ 本檔載入序早於 season.js 也不會漏（同 rakeboost 的教訓）。
  registerBoost({
    id: "season-prem", icon: "💎",
    name: function () { return t("季票進階軌加速", "季票進階軌加速"); },
    avail: function () { return !!(HL.season && HL.season.status); },
    mult: function () { return HL.season.status().prem ? 1.2 : 1; }
  });

  // ② #49 促銷日曆的 opt-in 限時加速檔期（玩家按「加入」才起算，一次 OPTIN_MS）
  var BOOST_OPTIN_MS = 6 * 3600000;
  function optinLeft() {
    if (!(HL.promoCal && HL.promoCal.joinedAt)) return 0;
    var at = HL.promoCal.joinedAt("progress-boost");
    if (!at) return 0;
    return Math.max(0, at + BOOST_OPTIN_MS - Date.now());
  }
  registerBoost({
    id: "progress-boost", icon: "🚀",
    name: function () { return t("限時經驗加速", "限時經驗加速"); },
    avail: function () { return !!(HL.promoCal && HL.promoCal.joinedAt); },
    mult: function () { return optinLeft() > 0 ? 1.5 : 1; },
    msLeft: optinLeft
  });

  // 接進 #49 活動日曆（`promoCal.register` 的第三個外部註冊者；前兩個為 rakeboost/release）
  function registerPromo() {
    if (!HL.promoCal || !HL.promoCal.register) return;
    HL.promoCal.register({
      id: "progress-boost", name: function () { return t("限時經驗加速", "限時經驗加速"); },
      icon: "🚀", cat: t("加成", "加成"), sched: "always",
      optIn: true, optInTtlMs: BOOST_OPTIN_MS, optInDaily: true,
      avail: function () { return !!(HL.vip || HL.season); },
      // ⚠️ #49 的 note 是單一字串→單一文字節點，「中文＋動態值」翻不到（既存債，見 rakeboost 同註）
      note: function () {
        var left = optinLeft();
        if (left > 0) return t("加速生效中 · 剩", "加速生效中 · 剩") + " " + HL.dom.dhm(left);
        return t("加入即開啟經驗加速", "加入即開啟經驗加速");
      },
      open: function () { open(); }
    });
  }
  if (HL.promoCal) registerPromo();
  else if (global.addEventListener) global.addEventListener("DOMContentLoaded", registerPromo);

  /* #90 經濟旋鈕自我描述：加速上限是**送幣型**（放大 XP 取得速度）⇒ strict:"le"。
   * 每日 XP 上限逐來源不同，故以「來源數 + 已宣告上限的來源數」呈現，數字全部當場數。 */
  if (HL.econCfg && HL.econCfg.register) {
    HL.econCfg.register({
      id: "progress-src", label: "成長進度來源（#65）", icon: "📈", order: 40,
      describe: function () {
        var ks = ids(), capped = 0;
        for (var i = 0; i < ks.length; i++) { var s = srcOf(ks[i]); if (s && isFinite(+s.cap)) capped++; }
        return [
          { key: "sources", label: "已登記 XP 來源數", demo: ks.length, live: ks.length, unit: " 種", note: "註冊即納管（加一種來源＝加一筆 spec）" },
          { key: "capped", label: "其中設有每日上限者", demo: capped, live: capped, unit: " 種", note: "上限是最後一道夾子，加速不得穿透" },
          { key: "boostCap", label: "加速乘數上限", demo: BOOST_CAP.demo, live: BOOST_CAP.live, unit: "×", strict: "le",
            note: "真站 1.0×＝實質關閉加速（只更快撞到每日上限，不是拿到更多）" }
        ];
      }
    });
  }

  // 載入序脫鉤（#101）：現排在 selftest.js 之後走直通；else 分支保證重排也不會靜默掉測項。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : this);

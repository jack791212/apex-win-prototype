/*
 * Apex Win｜近 30 天活躍度滾動視窗 HL.activity（自我進化引擎 #59）
 * ─────────────────────────────────────────────────────────────────────
 * 三平台共識（platform-modules 台帳「VIP」模組已記，逐輪獨立收斂）：
 *   · **WOW Vegas**：每押注 50 SC 得 1 星、**星星 30 天後過期**，同時追蹤「近 30 天星數」（決定
 *     當前段位）與「終身星數」⇒ 待遇由**近期活躍度**決定，而非終身累積。
 *   · **Punkz**（2026-08-05 刷新）：XP 收集後 **6 週過期**、每週重算段位 ⇒ 段位會下降。
 *   · **GoKong**（2026-08-06 刷新）：VIP 依**最近 90 天**活動重算，停下來就掉級。
 *   · 反例 **Stake**：明文終身累計、永不重置。
 *   ⇒ 頂級站在此分歧。本檔採**兩派交集**：核心終身等級照舊只升不降，衰退只作用在**額外光環層**。
 *
 * 【缺口】`HL.vip.addWager` 只單向累加 `o.wager`（progress.js:281）⇒ 純終身累積。一位半年前狂刷、
 *   此後完全不玩的玩家，與每天都玩的玩家享有**完全相同**的待遇，平台沒有任何催回訪的等級槓桿。
 *   而基礎設施也確實不存在：`rolling|滾動|windowMs|sinceMs|last30|decay` 於 `core/*.js` 經
 *   06-29／08-10 兩次不同樣式、兩個日期各自機械證實 **0 命中**。
 *
 * 【為什麼是獨立的 HL.activity，而不是長在 HL.vip 旁邊】（卡片 08-10 更新的結論）
 *   「滾動視窗押注量」不只有光環層一個消費者：Stake 的 **Bonus Drops** 領取資格＝「過去 7 天押注
 *   達標」，而 `core/redeem.js` 的 `CODES` 只有 `{amount, exp}`＝無任何資格述詞（#107 已立卡）。
 *   若把桶藏在 vip 內部，下一個消費者就會**各自再手刻一份桶**——正是 #81 對 rakeboost 三筆種子
 *   「各自手刻一份時間戳」的同型教訓。⇒ 本檔對外是**可查詢的公用出口**
 *   （`wageredSince(days)` / `xpSince(days)`），新消費者是**加一行呼叫**而不是加一份桶。
 *
 * 【兩把尺，都存，不互相冒充】每個日桶同時記兩個數：
 *   · `w` ＝**真實押注金額**（金錢的尺）→ `wageredSince()`：資格閘（「過去 7 天押注 500」）要的是這把。
 *   · `x` ＝**edge 加權後的 XP**（進度的尺，由 #50 `HL.edge` 決定）→ `xpSince()`：光環段位吃這把，
 *     故光環與 VIP 經驗**同一把尺**（卡片明列的要求）。
 *   兩把尺各存一欄的成本是零，而只存一把就必然有一個消費者拿到錯的數字——這正是「第二份真相」的
 *   反面：不是抄兩份同一個值，是誠實承認這是**兩個不同的量**。（測項 `activity/two-rulers` 鎖住。）
 *
 * 【核心等級永不倒退＝結構上做不到，不是靠一句斷言】
 *   本檔**從頭到尾沒有 `HL.vip`／`HL.bonus`／`HL.state` 的寫入路徑**：不呼叫 `addWager`、不碰
 *   `HL_VIP` 這個 key、不送一分錢。它自己的 key 是獨立的 `HL_ACTIVITY`。⇒ 衰退能作用的範圍
 *   在**作用域上**就被限制在光環層內（測項 `activity/never-touches-vip` 對本檔原始碼直接斷言）。
 *   卡片自記的理由：等級倒退的懲罰感過重，且回收已解鎖福利＝實質扣獎，與 §11「真站經濟剛收斂」相衝。
 *
 * 【光環的效果走既有註冊表，不另開一條路】光環段位＝`HL.progressSrc.registerBoost` 表裡的一筆
 *   （第三個註冊者，前兩個為季票進階軌／#49 限時檔期）。⇒ 不新增任何「誰來讀這個加成」的管線，
 *   解析規則（取最大不相乘）與站別上限**沿用既有的**，不長第二套慣例。
 *   ⚠️ **據實記一件卡片沒說準的事**：卡片寫「真站加成幅度須保守（§11）」，但既有結構給的是
 *   **恰好零**——`progress-src.js` 的 `BOOST_CAP.live = 1.0` 把真站任何加速夾成 1×，且該檔頭明文
 *   警告改動前先讀經濟安全段、並有測項 `progress-src/boost-live-identity` 鎖住。要在真站給光環
 *   加成，唯一的路是繞過那道夾子＝**再造一套第二真相**。⇒ 刻意不繞：真站光環只有**徽章與視窗查詢**
 *   （零成本、非送幣），加速是假站限定。這是「保守」的極限值，不是漏做（測項 `activity/live-no-boost`）。
 *
 * 【光環吃的是加速前的量＝不能自我啟動】`live-stats.record` 餵進來的 `xpBet` 是 `HL.edge.weighted()`
 *   的結果，**在 `grant()` 套用 boost 之前**。⇒ 光環的加成不會回流成自己的輸入，不存在
 *   「加速 → 視窗量變大 → 段位更高 → 加速更多」的正回饋（測項 `activity/no-self-feedback`）。
 *
 * 【視窗長度是 config，不是寫死的 30】WOW Vegas 用 30 天、GoKong 用 90 天 ⇒ 窗長本身該是旋鈕。
 *   環形桶保留 `KEEP_DAYS`（90）天，`WINDOW_DAYS`（30）只是光環的**評估窗**；任何消費者都能問
 *   `wageredSince(7)`。桶數上界恆為 KEEP_DAYS+1，與經過多少天無關（測項 `activity/ring-bounded`）。
 *
 * 站別隔離：走 `HL.dom.lsGet/lsSet` ⇒ 真站與假站各有一份視窗（`HL.site.ns()` 前綴），互不外溢。
 *
 * 雙環境契約（比照 #50 edge／#63 sla／#65 progressSrc／#71 bonusTtl）：純資料/純函式區以
 *   `module.exports` 暴露供 node 直接 require ⇒ `prototype/tests/run.js` 驗的即瀏覽器跑的同一份。
 * 註冊於 window.HL.activity = { record, status, wageredSince, xpSince, betsSince, tiers, open, core }。
 *
 * 【#108（2026-08-19 14:00 窗）第二個消費端：返水加成】
 *   #59 出貨時光環只有一個讀者（進度加速），而那條路的下游 `BOOST_CAP.live = 1.0` 把真站夾成
 *   **恰好零** ⇒ 真站玩家看得到徽章、拿不到任何好處。本次補上第二個讀者：`HL.rakeboost.register`
 *   表裡的一筆（第五筆），與第一筆**同一個 id `activity-aura`**、同一組門檻、同一個 `tierIndexFor`。
 *   · **rakeboost.js 一字未改**（含其 `CAP`，有常駐測項盯）：門檻、倍率、站別旋鈕全在本檔，
 *     那邊只是註冊表多一列（沿 happyhour「委派給權威模組」的既有形制）⇒ 門檻仍只有一份真相。
 *   · ⚠️ **與 #59 的路徑結構不同，別照搬那次的結論**——理由與那顆真站旋鈕見 `RB_LIVE_SCALE`；
 *     兩欄為何不能合併見 `TIERS` 上方（各只寫一次，別在這裡再抄一遍）。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純資料：config =====================
  var KEEP_DAYS = 90;      // 環形桶保留天數（＝任何消費者可問的最長視窗；對齊 GoKong 的 90 天）
  var WINDOW_DAYS = 30;    // 光環的評估窗（對齊 WOW Vegas 的 30 天星星壽命）

  /* 光環段位表。`min` ＝視窗內累積 XP 門檻（與 VIP 經驗同一把尺，故可與 RANKS 的
     0/5k/20k/60k/150k **終身**門檻對照著讀：本表刻意遠低於它們，因為這是「30 天內」的量）。
     `mult` ＝假站進度加速倍率（「小幅上浮」＝卡片原話；真站恆 1，見檔頭）。
     擴充＝表裡加一列，`tierOf`/`multOf`/UI/說明中心全部自動跟上（無一處手抄段數或門檻）。 */
  /* `rb` ＝**返水**加成倍率（#108 的第二個消費端），與上面的進度加速 `mult` **刻意分成兩欄**。
     兩欄目前的數字很接近，看起來像可以合併的重複——**不可合併**，理由是它們花的是不同的東西：
       · `mult` 動的是 XP／進度（帳面速度，不送一分錢）
       · `rb`   動的是**真的會付出去的返水**（§11 的送幣成本）
     合成一欄之後，「把光環加速調快一點」這種純體驗調整就會**同時**把真站送幣成本往上推，
     而且沒有任何地方會提醒你。⇒ 測項 `activity/rb-two-columns` 反向鎖住：兩欄若被改成
     逐段相同，該測項立刻轉紅（＝合併這件事做不到「靜默」）。
     `rb` 刻意比 `mult` 保守：光環是**常駐**加成（光環亮著就一直生效），而 rakeboost 表裡其他
     幾筆（happyhour ×2／新手 ×2／opt-in ×1.5）都是**限時窗口**；常駐項若給到同級數字，
     等於把限時活動的幅度變成基礎費率。 */
  var TIERS = [
    { key: "idle",   name: "休眠",   icon: "💤", min: 0,     mult: 1.00, rb: 1.00 },
    { key: "active", name: "活躍中", icon: "🔥", min: 2000,  mult: 1.05, rb: 1.03 },
    { key: "hot",    name: "高活躍", icon: "⚡", min: 10000, mult: 1.10, rb: 1.06 },
    { key: "core",   name: "常駐",   icon: "🌟", min: 40000, mult: 1.20, rb: 1.10 }
  ];

  /* 真站要不要給光環返水加成＝**§11 經濟決策，引擎不代裁**（卡片明訂）。
     這個常數就是那顆旋鈕：真站幅度 ＝ 1 + (rb - 1) × RB_LIVE_SCALE。
       · 0（預設）⇒ 真站恆 1.00×＝零送幣成本落地，容器就位、效果留白。
       · 1         ⇒ 真站與假站同幅。船長要開多少就改這一個數字（0～1 之間任意）。
     ⚠️ 與 #59 的進度加速**結構上不同**：那條路的下游 `BOOST_CAP.live = 1.0` 把真站夾成恰好零，
        「想給也給不了」；返水這條路的下游 `CAP.live = 1.5` **不是 1**，所以真站這裡調上去
        是真的會多送錢。也因此本檔一律**不動** rakeboost 的 `CAP`（有常駐測項盯著它），
        只在既有 CAP 之內加一筆乘數 ⇒ 真站硬不變量 `maxPct(live) × CAP.live = 0.2175 < 1`
        原封不動繼續成立（恆等式，不是宣稱）。 */
  var RB_LIVE_SCALE = 0;

  // ===================== 純函式：環形日桶 =====================
  // 桶＝{ d: dayNum, w: 真實押注, x: 加權 XP, n: 注數 }。清單依 d 遞增，長度上界 KEEP_DAYS+1。

  function num(v) { var n = +v; return isFinite(n) && n > 0 ? n : 0; }

  /* 汰除：只留 (today - keepDays, today + 1] 的桶。
     · 下界 ⇒ 過期的日子真的離開視窗（衰退的本體）。
     · 上界 `today + 1` ⇒ 容許一天的時區/時鐘抖動，但**時鐘被往後撥出去的未來桶不會永久佔位**
       （若無上界，一個誤標 today+365 的桶會存活一年；而 `sumSince` 又只認 d ≤ today
       ⇒ 那筆押注會憑空消失一年，「視窗是空的」與「玩家沒玩」在畫面上完全同形）。 */
  function sweep(buckets, today, keepDays) {
    var keep = num(keepDays) || KEEP_DAYS;
    var lo = today - keep, out = [];
    for (var i = 0; i < (buckets || []).length; i++) {
      var b = buckets[i];
      if (!b || typeof b.d !== "number") continue;
      if (b.d > lo && b.d <= today + 1) out.push(b);
    }
    out.sort(function (a, b) { return a.d - b.d; });
    return out;
  }

  /* 累加到「今天」的桶（不存在就開一個），並同步汰除過期桶。回傳新清單（不就地改）。 */
  function add(buckets, today, real, xp, keepDays) {
    var list = sweep(buckets, today, keepDays);
    real = num(real); xp = num(xp);
    if (real <= 0 && xp <= 0) return list;
    var cur = null;
    for (var i = 0; i < list.length; i++) if (list[i].d === today) { cur = list[i]; break; }
    if (!cur) { cur = { d: today, w: 0, x: 0, n: 0 }; list.push(cur); list.sort(function (a, b) { return a.d - b.d; }); }
    cur.w = num(cur.w) + real;
    cur.x = num(cur.x) + xp;
    cur.n = num(cur.n) + (real > 0 ? 1 : 0);
    return list;
  }

  /* 視窗合計。days=1 ⇒ 只有今天；days=30 ⇒ 今天與前 29 天。
     刻意要求 `d <= today`：未來桶（時鐘抖動）**不得膨脹**任何合計。 */
  function sumSince(buckets, today, days, field) {
    var d = Math.max(1, Math.floor(num(days) || WINDOW_DAYS));
    var f = field || "x", lo = today - d, s = 0;
    for (var i = 0; i < (buckets || []).length; i++) {
      var b = buckets[i];
      if (!b || typeof b.d !== "number") continue;
      if (b.d > lo && b.d <= today) s += num(b[f]);
    }
    return s;
  }

  // ===================== 純函式：段位與倍率 =====================
  function tierIndexFor(windowXp) {
    var v = num(windowXp), idx = 0;
    for (var i = 0; i < TIERS.length; i++) if (v >= TIERS[i].min) idx = i;
    return idx;
  }

  /* 段位倍率。真站恆 1 ⇒ 真站零加速在**本檔就成立**，不必依賴下游那道夾子
     （下游 BOOST_CAP.live=1 是第二層保險；兩層同向、互不衝突）。 */
  function multFor(windowXp, mode) {
    if (mode === "live") return 1;
    return TIERS[tierIndexFor(windowXp)].mult;
  }

  /* 返水加成倍率（#108）。段位判定與 `multFor` **共用同一個 `tierIndexFor`** ⇒ 門檻只有一份真相，
     返水這條路上不存在任何門檻數字（rakeboost 側連一個數字都沒有，見該檔註冊處）。
     `scale` 為選用參數：不給就用檔頭那顆 `RB_LIVE_SCALE` 旋鈕；**只有測項會傳**，
     用途是機械證明「這顆旋鈕真的接著線」——否則預設 0 之下，整條真站分支與死碼在測項上同形。 */
  function rbMultFor(windowXp, mode, scale) {
    var rb = TIERS[tierIndexFor(windowXp)].rb;
    if (!(rb > 1)) return 1;
    if (mode !== "live") return rb;
    var s = scale === undefined ? RB_LIVE_SCALE : scale;
    s = Math.max(0, Math.min(1, +s || 0));
    return 1 + (rb - 1) * s;
  }

  /* 段位描述（供 UI／說明中心／status 共用；`next` 為 null ＝已達最高段）。 */
  function describeTier(windowXp, mode) {
    var i = tierIndexFor(windowXp), tr = TIERS[i], next = TIERS[i + 1] || null;
    var span = next ? (next.min - tr.min) : 0;
    return {
      index: i, key: tr.key, name: tr.name, icon: tr.icon,
      min: tr.min, mult: multFor(windowXp, mode), rb: rbMultFor(windowXp, mode),
      active: i > 0,                                  // 光環是否亮著（idle 段＝沒有光環）
      next: next, toNext: next ? Math.max(0, next.min - num(windowXp)) : 0,
      pct: next ? Math.max(0, Math.min(100, span > 0 ? ((num(windowXp) - tr.min) / span) * 100 : 100)) : 100
    };
  }

  var CORE = {
    KEEP_DAYS: KEEP_DAYS, WINDOW_DAYS: WINDOW_DAYS, TIERS: TIERS,
    RB_LIVE_SCALE: RB_LIVE_SCALE,
    sweep: sweep, add: add, sumSince: sumSince,
    tierIndexFor: tierIndexFor, multFor: multFor, rbMultFor: rbMultFor, describeTier: describeTier
  };

  // ===================== 測項（node + 瀏覽器共用同一份純函式）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    st.register({
      id: "activity/tiers-sane", group: "activity", title: "光環段位表門檻遞增、倍率遞增且首段為零加速", env: "both",
      run: function (t) {
        var T = CORE.TIERS;
        t.ok(T.length >= 3, "段位表至少 3 段，實際 " + T.length);
        t.ok(T[0].min === 0 && T[0].mult === 1, "首段必須是「沒有光環」＝門檻 0、倍率 1.00×");
        for (var i = 1; i < T.length; i++) {
          t.ok(T[i].min > T[i - 1].min, T[i].key + " 門檻須嚴格高於前一段");
          t.ok(T[i].mult >= T[i - 1].mult, T[i].key + " 倍率不得低於前一段");
          t.ok(T[i].mult <= 1.5, T[i].key + " 倍率 " + T[i].mult + " 過高（本層是「小幅上浮」，非主要送幣軸）");
        }
        t.ok(T[T.length - 1].mult > 1, "最高段倍率必須 >1，否則整層是死碼");
      }
    });

    st.register({
      id: "activity/live-no-boost", group: "activity", title: "真站：任何活躍量都恰為 1.00×（零加速）", env: "both",
      run: function (t) {
        [0, 1, 2000, 10000, 40000, 9e9].forEach(function (v) {
          t.ok(CORE.multFor(v, "live") === 1, "真站活躍量 " + v + " 的倍率必須恰為 1，實際 " + CORE.multFor(v, "live"));
        });
        // 假站最高段確實有加速（否則本層對兩站都是死碼）
        t.ok(CORE.multFor(9e9, "demo") > 1, "假站最高段必須 >1×");
        // 站別方向不可反轉（§11：真站不得比假站寬鬆）
        [0, 2000, 10000, 40000].forEach(function (v) {
          t.ok(CORE.multFor(v, "live") <= CORE.multFor(v, "demo"), "活躍量 " + v + "：真站倍率不得高於假站");
        });
      }
    });

    st.register({
      id: "activity/rb-live-off-by-default", group: "activity", title: "#108 返水加成：真站旋鈕預設關閉（零送幣成本落地）", env: "both",
      run: function (t) {
        t.ok(CORE.RB_LIVE_SCALE === 0, "真站旋鈕預設須為 0（開啟＝船長經濟裁決），實際 " + CORE.RB_LIVE_SCALE);
        [0, 1, 2000, 10000, 40000, 9e9].forEach(function (v) {
          t.ok(CORE.rbMultFor(v, "live") === 1, "真站活躍量 " + v + " 的返水倍率須恰為 1，實際 " + CORE.rbMultFor(v, "live"));
        });
        t.ok(CORE.rbMultFor(9e9, "demo") > 1, "假站最高段的返水倍率必須 >1，否則整條消費端是死碼");
        [0, 2000, 10000, 40000].forEach(function (v) {
          t.ok(CORE.rbMultFor(v, "live") <= CORE.rbMultFor(v, "demo"), "活躍量 " + v + "：真站返水倍率不得高於假站（§11）");
        });
      }
    });

    st.register({
      id: "activity/rb-live-scale-wired", group: "activity", title: "#108 真站旋鈕不是死碼：轉開就真的按比例生效", env: "both",
      run: function (t) {
        var top = CORE.TIERS[CORE.TIERS.length - 1], v = top.min;
        t.ok(CORE.rbMultFor(v, "live", 1) === CORE.rbMultFor(v, "demo"), "scale=1 時真站應與假站同幅，實際 " +
          CORE.rbMultFor(v, "live", 1) + " vs " + CORE.rbMultFor(v, "demo"));
        var half = CORE.rbMultFor(v, "live", 0.5);
        t.ok(Math.abs(half - (1 + (top.rb - 1) / 2)) < 1e-9, "scale=0.5 應取一半幅度，實際 " + half);
        t.ok(CORE.rbMultFor(v, "live", 0) === 1, "scale=0 應恰為 1");
        // 旋鈕不得被越界值放大（負數/>1/垃圾字串一律夾回 [0,1]）
        t.ok(CORE.rbMultFor(v, "live", 9) === CORE.rbMultFor(v, "demo"), "scale>1 須夾到 1（不得超過假站幅度）");
        t.ok(CORE.rbMultFor(v, "live", -3) === 1 && CORE.rbMultFor(v, "live", "x") === 1, "負數/非數值須夾回 0");
      }
    });

    st.register({
      id: "activity/rb-two-columns", group: "activity", title: "#108 進度尺與金錢尺是兩欄（合併會轉紅）", env: "both",
      run: function (t) {
        var T = CORE.TIERS, same = true;
        T.forEach(function (tr) {
          t.ok(typeof tr.rb === "number" && tr.rb >= 1, tr.key + " 須有 rb 欄且 ≥1，實際 " + tr.rb);
          if (tr.rb !== tr.mult) same = false;
        });
        t.ok(!same, "兩欄不得逐段相同——那代表有人把「進度加速」與「返水成本」合成一欄，"
          + "之後調體驗就會靜默動到真站送幣（見 TIERS 上方註解）");
        t.ok(T[0].rb === 1, "首段（沒有光環）的返水倍率必須是 1.00");
        for (var i = 1; i < T.length; i++) {
          t.ok(T[i].rb >= T[i - 1].rb, T[i].key + " 返水倍率不得低於前一段");
          t.ok(T[i].rb <= T[i].mult, T[i].key + " 返水倍率不得高於進度倍率（常駐送幣項須比帳面加速保守）");
          t.ok(T[i].rb <= 1.25, T[i].key + " 返水倍率 " + T[i].rb + " 過高：本層是常駐加成，限時活動的幅度不該變成基礎費率");
        }
      }
    });

    st.register({
      id: "activity/window-decays", group: "activity", title: "滾動視窗真的會衰退（過期日離開視窗）", env: "both",
      run: function (t) {
        var b = CORE.add([], 100, 1000, 1000);          // 第 100 天押 1000
        t.ok(CORE.sumSince(b, 100, 30, "x") === 1000, "當天視窗內應為 1000");
        t.ok(CORE.sumSince(b, 129, 30, "x") === 1000, "第 129 天（第 30 天）仍應在視窗內");
        t.ok(CORE.sumSince(b, 130, 30, "x") === 0, "第 130 天（滿 30 天）應已離開視窗，實際 " + CORE.sumSince(b, 130, 30, "x"));
        // 而終身量不受影響（本檔沒有終身量；此處驗的是「衰退只發生在視窗查詢」）
        t.ok(CORE.sumSince(b, 130, 90, "x") === 1000, "同一筆在 90 天視窗內仍看得到＝衰退是視窗長度的函式，不是刪資料");
        // 窗長為 config：同一份桶、不同窗長給出不同答案
        t.ok(CORE.sumSince(b, 105, 3, "x") === 0 && CORE.sumSince(b, 105, 30, "x") === 1000, "窗長須真的參與計算（3 天窗看不到、30 天窗看得到）");
      }
    });

    st.register({
      id: "activity/ring-bounded", group: "activity", title: "環形桶長度有上界（跑一年也不會無限成長）", env: "both",
      run: function (t) {
        var b = [];
        for (var d = 0; d < 400; d++) b = CORE.add(b, d, 10, 10);
        t.ok(b.length <= CORE.KEEP_DAYS + 1, "連押 400 天後桶數應 ≤ " + (CORE.KEEP_DAYS + 1) + "，實際 " + b.length);
        t.ok(b.length >= CORE.KEEP_DAYS - 1, "保留天數內的桶不該被誤汰，實際 " + b.length);
        // 同一天多次押注不開新桶（否則上界失效）
        var c = CORE.add(CORE.add([], 5, 10, 10), 5, 10, 10);
        t.ok(c.length === 1 && c[0].w === 20 && c[0].n === 2, "同日多注應併入同一桶（w=20/n=2），實際 " + JSON.stringify(c));
      }
    });

    st.register({
      id: "activity/two-rulers", group: "activity", title: "真實金額與加權 XP 是兩把獨立的尺（互不冒充）", env: "both",
      run: function (t) {
        var b = CORE.add([], 10, 1000, 1800);            // 真實 1000、edge 加權後 1800
        t.ok(CORE.sumSince(b, 10, 30, "w") === 1000, "wageredSince 必須回真實金額 1000，實際 " + CORE.sumSince(b, 10, 30, "w"));
        t.ok(CORE.sumSince(b, 10, 30, "x") === 1800, "xpSince 必須回加權額 1800，實際 " + CORE.sumSince(b, 10, 30, "x"));
        // 段位吃的是加權尺：同一筆若只看真實金額會落在不同段
        t.ok(CORE.tierIndexFor(1800) >= CORE.tierIndexFor(1000), "段位須依加權尺判定（加權額 ≥ 真實額 ⇒ 段位不低於）");
      }
    });

    st.register({
      id: "activity/clock-skew", group: "activity", title: "時鐘抖動：未來桶不膨脹合計、也不永久佔位", env: "both",
      run: function (t) {
        var b = [{ d: 100, w: 500, x: 500 }, { d: 400, w: 9e9, x: 9e9 }];  // 第二筆＝時鐘被往前撥
        t.ok(CORE.sumSince(b, 100, 30, "x") === 500, "未來桶不得計入視窗合計，實際 " + CORE.sumSince(b, 100, 30, "x"));
        var swept = CORE.sweep(b, 100, CORE.KEEP_DAYS);
        t.ok(swept.length === 1 && swept[0].d === 100, "遠期未來桶應被汰除（否則憑空消失的押注會躺很久），實際 " + JSON.stringify(swept));
        // 但「今天+1」的邊界桶要留（時區/午夜跨界的正常抖動）
        var edge = CORE.sweep([{ d: 101, w: 1, x: 1 }], 100, CORE.KEEP_DAYS);
        t.ok(edge.length === 1, "today+1 的邊界桶應保留（正常時區抖動）");
      }
    });

    st.register({
      id: "activity/describe-boundaries", group: "activity", title: "段位描述在門檻邊界正確、且最高段無下一段", env: "both",
      run: function (t) {
        var T = CORE.TIERS, second = T[1];
        var below = CORE.describeTier(second.min - 1, "demo"), at = CORE.describeTier(second.min, "demo");
        t.ok(below.index === 0 && below.active === false, "門檻下一單位應仍在首段且光環未亮");
        t.ok(at.index === 1 && at.active === true, "恰達門檻應進入第二段且光環亮起");
        t.ok(below.toNext === 1, "距下一段應為 1，實際 " + below.toNext);
        var top = CORE.describeTier(9e9, "demo");
        t.ok(top.next === null && top.toNext === 0 && top.pct === 100, "最高段應無下一段、pct=100");
        t.ok(CORE.describeTier(0, "demo").pct === 0, "零活躍時段內進度應為 0");
      }
    });

    if (isNode) return;

    st.register({
      id: "activity/never-touches-vip", group: "activity", title: "光環層碰不到核心等級與錢（作用域限制，非斷言）", env: "browser",
      run: function (t) {
        t.isFn(HL && HL.activity && HL.activity.record, "HL.activity.record 應存在");
        var src = String(HL.activity.record) + String(HL.activity.status);
        t.ok(!/addWager/.test(src), "本層不得呼叫 HL.vip.addWager（核心等級只能由中央結算點推進）");
        t.ok(!/HL\.bonus|HL\.state|balance/.test(src), "本層不得碰紅利/餘額（衰退不得變成扣獎）");
        t.ok(!/HL_VIP/.test(src), "本層不得寫 VIP 的儲存 key");
      }
    });

    st.register({
      id: "activity/no-self-feedback", group: "activity", title: "光環吃加速前的量（不可自我啟動）", env: "browser",
      run: function (t) {
        var rec = String(HL.liveStats.record);
        t.ok(/HL\.activity/.test(rec), "中央結算點應餵 HL.activity");
        // 餵進來的必須是 grant 用的同一個 xpBet 變數（＝edge 加權後、boost 之前）
        t.ok(/HL\.activity\.record\(\s*bet\s*,\s*xpBet\s*\)/.test(rec),
          "應以 record(bet, xpBet) 餵入＝真實額與加權額各一把尺，且 xpBet 是加速前的量");
        var own = String(HL.activity.record);
        t.ok(!/boostMult|boostEntries/.test(own), "本層不得讀進度加速倍率（否則加成會回流成自己的輸入）");
      }
    });

    st.register({
      id: "activity/boost-registered", group: "activity", title: "光環加成是既有加速註冊表裡的一筆（不另開管線）", env: "browser",
      run: function (t) {
        t.ok(!!(HL.progressSrc && HL.progressSrc.boostEntries), "HL.progressSrc 加速註冊表應存在");
        var ids = HL.progressSrc.boostEntries().map(function (b) { return b.id; });
        t.ok(ids.indexOf("activity-aura") >= 0, "光環應已註冊為加速來源 activity-aura，實際 " + ids.join("/"));
        // 真站：即使本層回 1，下游硬上限也必須是 1（兩層同向保險）
        t.ok(HL.progressSrc.core.boostCapOf("live") === 1, "下游真站加速上限必須恰為 1×");
      }
    });

    st.register({
      id: "activity/rb-registered", group: "activity", title: "#108 光環加成是既有返水加成表裡的一筆（門檻不在 rakeboost 側）", env: "browser",
      run: function (t) {
        t.ok(!!(HL.rakeboost && HL.rakeboost.entries), "HL.rakeboost 加成註冊表應存在");
        var sp = HL.rakeboost.entries().filter(function (e) { return e.id === "activity-aura"; })[0];
        t.ok(!!sp, "光環應已註冊為返水加成來源 activity-aura，實際 " +
          HL.rakeboost.entries().map(function (e) { return e.id; }).join("/"));
        // 反向鎖：那筆註冊的乘數必須向本層求值，且**自身不得出現任何門檻數字**
        var src = String(sp && sp.mult);
        t.ok(/rbMultFor/.test(src), "乘數須向 rbMultFor 求值（段位門檻只有一份真相），實際 " + src);
        t.ok(!/\d{3,}/.test(src), "註冊處不得出現門檻/倍率的字面數字，實際 " + src);
        // CAP 一字未動 ⇒ 真站硬不變量（maxPct×CAP<1）自動繼續成立
        var C = HL.rakeboost.core.CAP;
        t.ok(C.live === 1.5 && C.demo === 3.0, "本卡不得改動 rakeboost 的 CAP（#81 常駐約束），實際 " + JSON.stringify(C));
        // 兩態互補斷言（刻意不用 t.skip：見 rakeboost/trigger-wired 學到的教訓）
        var s = HL.activity.status();
        var row = HL.rakeboost.active().filter(function (a) { return a.id === "activity-aura"; })[0];
        if (s.rb > 1) {
          t.ok(!!row, "光環加成生效中（rb=" + s.rb + "）時必須出現在 active()");
          t.ok(row.mult === s.rb, "active() 的乘數應等於本層當下值 " + s.rb + "，實得 " + (row && row.mult));
        } else {
          t.ok(!row, "光環未達標／真站旋鈕關閉時不得出現在 active()（＝對返水率零影響），實得 " + JSON.stringify(row || null));
        }
        var m = HL.rakeboost.mult();
        t.ok(m >= 1 && m <= HL.rakeboost.cap(), "含本加成後最終乘數 " + m + " 仍須落在 [1, cap=" + HL.rakeboost.cap() + "]");
      }
    });

    st.register({
      id: "activity/vip-status-additive", group: "activity", title: "vip.status() 加法式新增 activity 欄位（既有欄位不動）", env: "browser",
      run: function (t) {
        var s = HL.vip.status();
        ["index", "name", "icon", "wager", "level", "maxLevel", "pct", "sub", "subs"].forEach(function (k) {
          t.ok(s[k] !== undefined, "既有欄位 " + k + " 必須仍在（加法式擴充）");
        });
        t.ok(s.activity && typeof s.activity === "object", "status() 應新增 activity 物件");
        ["last30", "tier", "active", "mult"].forEach(function (k) {
          t.ok(s.activity[k] !== undefined, "activity." + k + " 應存在");
        });
        t.ok(typeof s.activity.last30 === "number" && s.activity.last30 >= 0, "last30 應為非負數，實際 " + s.activity.last30);
      }
    });

    st.register({
      id: "activity/window-config", group: "activity", title: "視窗長度為 config，任意窗長皆可查詢", env: "browser",
      run: function (t) {
        t.isFn(HL.activity.wageredSince, "wageredSince 應為公用查詢出口（#107 兌換碼資格閘的預定消費者）");
        t.isFn(HL.activity.xpSince, "xpSince 應存在");
        [1, 7, 30, 90].forEach(function (d) {
          var v = HL.activity.wageredSince(d);
          t.ok(typeof v === "number" && v >= 0, d + " 天視窗應回非負數，實際 " + v);
        });
        // 視窗單調：更長的窗不可能看到更少
        t.ok(HL.activity.wageredSince(90) >= HL.activity.wageredSince(7), "90 天視窗合計不得小於 7 天視窗");
        t.ok(HL.activity.core.WINDOW_DAYS > 0 && HL.activity.core.KEEP_DAYS >= HL.activity.core.WINDOW_DAYS,
          "保留天數須 ≥ 評估窗長（否則光環的窗自己被汰掉）");
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
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  function txt(s) { return document.createTextNode(s); }
  function xpNum(n) { return Math.round(+n || 0).toLocaleString("en-US"); }

  var KEY = "HL_ACTIVITY";
  function mode() { return (HL.site && HL.site.isLive && HL.site.isLive()) ? "live" : "demo"; }
  function today() { return HL.dom.dayNum(); }
  function buckets() { var o = HL.dom.lsGet(KEY, null); return sweep((o && o.b) || [], today(), KEEP_DAYS); }
  function saveBuckets(list) { HL.dom.lsSet(KEY, { b: list }); }

  /* 中央結算點的唯一入口。`real` ＝真實押注額、`xp` ＝ HL.edge 加權額（加速前）。
     ⚠️ 這裡刻意**不做任何授予**：本層只記帳，效果全由段位倍率經既有加速註冊表生效。 */
  function record(real, xp) {
    real = +real || 0; xp = +xp || 0;
    if (real <= 0 && xp <= 0) return;
    saveBuckets(add(buckets(), today(), real, xp, KEEP_DAYS));
  }

  function wageredSince(days) { return sumSince(buckets(), today(), days || WINDOW_DAYS, "w"); }
  function xpSince(days) { return sumSince(buckets(), today(), days || WINDOW_DAYS, "x"); }
  function betsSince(days) { return sumSince(buckets(), today(), days || WINDOW_DAYS, "n"); }

  /* 光環現況。`last30` 的名字沿用卡片與 WOW Vegas 的說法，值則由 WINDOW_DAYS 決定
     （改 config 時這個欄位跟著改意義，而不是變成一個名不副實的欄位——UI 一律讀 `days` 來標示）。 */
  function status() {
    var m = mode(), xp = xpSince(WINDOW_DAYS);
    var d = describeTier(xp, m);
    d.last30 = xp;
    d.days = WINDOW_DAYS;
    d.wagered = wageredSince(WINDOW_DAYS);
    d.bets = betsSince(WINDOW_DAYS);
    d.tier = d.name;          // 卡片明列的欄位名（tier 為顯示名、index 為序號）
    return d;
  }

  function tiers() {
    var m = mode(), cur = tierIndexFor(xpSince(WINDOW_DAYS));
    return TIERS.map(function (tr, i) {
      return { index: i, key: tr.key, name: tr.name, icon: tr.icon, min: tr.min,
               mult: multFor(tr.min, m), rb: rbMultFor(tr.min, m), cur: i === cur };
    });
  }

  /* ---------- 光環層的效果：既有加速註冊表裡的一筆（第三個註冊者）---------- */
  // avail/mult 皆為惰性閉包 ⇒ 載入序無關（沿 season-prem／progress-boost 的既有形制）。
  if (HL.progressSrc && HL.progressSrc.registerBoost) {
    HL.progressSrc.registerBoost({
      id: "activity-aura", icon: "🔥",
      name: function () { return t("活躍光環加速", "活躍光環加速"); },
      avail: function () { return true; },
      mult: function () { return multFor(xpSince(WINDOW_DAYS), mode()); }
    });
  }

  /* ---------- 光環的第二個消費端（#108）：既有**返水**加成註冊表裡的一筆 ----------
     形狀與上面那筆逐位相同（id/name/icon/avail/mult），沿 happyhour「委派給權威模組」的既有形制
     ⇒ rakeboost.js 一字未改：門檻、倍率、站別旋鈕全部留在本檔，那邊只是表裡多一列。
     載入序：index.html 的 rakeboost.js 早於本檔（與 progress-src.js 同理），且 avail/mult 皆為
     惰性閉包 ⇒ 即使日後被重排，最壞情況是這筆註冊不上（返水回到基準），不會拋錯。
     **刻意不給 `msLeft`**：滾動視窗沒有「到期時刻」——它是每天邊緣一格一格淡出的，
     給一個假的倒數會讓玩家以為某個時間點會整段消失（那是 #81 觸發型窗口的語意，不是本層的）。 */
  if (HL.rakeboost && HL.rakeboost.register) {
    HL.rakeboost.register({
      id: "activity-aura", icon: "🔥",
      name: function () { return t("活躍光環加成", "活躍光環加成"); },
      avail: function () { return true; },
      mult: function () { return rbMultFor(xpSince(WINDOW_DAYS), mode()); }
    });
  }

  /* ---------- 唯讀面板（比照 HL.edge.open／HL.progressSrc.open：不讓「有內容沒出口」重演）----------
     ⚠️ i18n 結構鐵律（P3）：每條 key 各自獨立成一個元素，數字與標點放在裸文字節點——
        `HL.i18n.t` 是 passthrough、真正的翻譯要求整個文字節點恰等於一條 key，
        故「中文 + 數字」串接永遠翻不到（progress-src.js 首版踩過、preview 三語驗證抓到）。 */
  /* 段位名一律**獨立成一個文字節點**（圖示放裸文字節點）——`icon + " " + name` 串成一個節點時
     whole-key 字典就比不到那條 key，四個段位名在 EN/zh-Hans 下會整排殘留繁中。
     （progress.js 的 VIP 段位名正是這樣寫的既有債，本檔不跟進。） */
  function tierName(icon, name, cls) {
    return el("b", { class: cls || "" }, [txt(icon + " "), el("span", { text: name })]);
  }

  function tierRow(r) {
    return el("div", { class: "ax-kv" + (r.cur ? " ax-kv--row" : "") }, [
      tierName(r.icon, r.name, r.cur ? "ax-gold" : "ax-muted"),
      el("b", { class: r.cur ? "ax-gold" : "" }, [
        txt(xpNum(r.min) + " XP · "),
        el("span", { text: r.mult > 1 ? "經驗加速" : "無加速" }),
        txt(r.mult > 1 ? " " + r.mult.toFixed(2) + "×" : "")
      ])
    ]);
  }

  function open() {
    var s = status(), live = mode() === "live";
    var body = [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [
          el("span", { class: "ax-muted", text: t("目前光環", "目前光環") }),
          tierName(s.icon, s.name, "ax-gold")
        ]),
        /* 窗長刻意獨立成一列，而不是寫成「近 30 天」塞進上一列的值——「近」與「天」單獨成 key
           翻不出通順的英文（whole-key 字典只認整個文字節點，切碎的助詞就是翻不好的那種 key）。 */
        HL.ui.kv(t("評估視窗內累積經驗", "評估視窗內累積經驗"), xpNum(s.last30) + " XP"),
        HL.ui.kv(t("評估視窗天數", "評估視窗天數"), String(s.days)),
        /* 目前生效的兩個消費端各一個數字（#59 進度加速 + #108 返水加成）。
           ⚠️ 兩者**都當場向本層求值**、不寫死任何一個字面數字 ⇒ 真站旋鈕若被船長轉開，
              這一列自動變動，不會出現「文案說沒有、實際有」的第二份真相（#59 學到的那條）。 */
        el("div", { class: "ax-kv" }, [
          el("span", { class: "ax-muted", text: t("目前加成", "目前加成") }),
          el("b", { class: (s.mult > 1 || s.rb > 1) ? "ax-gold" : "" }, [
            el("span", { text: "經驗加速" }), txt(" " + s.mult.toFixed(2) + "× · "),
            el("span", { text: "返水加成" }), txt(" " + s.rb.toFixed(2) + "×")
          ])
        ]),
        HL.ui.progress(s.pct, { style: "margin:6px 0 10px" }),
        el("small", { class: "ax-muted" }, s.next
          ? [el("span", { text: "再累積" }), txt(" " + xpNum(s.toNext) + " XP "), el("span", { text: "晉升" }),
             txt(" " + s.next.icon + " "), el("span", { text: s.next.name })]
          : [el("span", { text: "已達最高光環段位" })]),
        el("div", { class: "ax-kv" }, [
          el("span", { class: "ax-muted", text: t("視窗內真實押注", "視窗內真實押注") }),
          el("b", {}, [txt(HL.dom.money(s.wagered) + " · "), el("span", { text: "注數" }), txt(" " + xpNum(s.bets))])
        ])
      ]),
      HL.ui.sectionTitle(t("光環段位", "光環段位")),
      el("div", { class: "ax-panel" }, tiers().map(tierRow)),
      el("p", { class: "ax-muted", style: "margin:10px 0 0",
        text: t("光環只依最近一段時間的活躍度計算，停下來會淡出；VIP 核心等級與已解鎖的福利永不回收。",
                "光環只依最近一段時間的活躍度計算，停下來會淡出；VIP 核心等級與已解鎖的福利永不回收。") }),
      /* 站別說明**由常數推導**，不是各自斷言一句話：真站的返水加成旋鈕（RB_LIVE_SCALE）
         若被船長轉開，這裡自動換成「有加成」那句 ⇒ 文案不可能與程式分歧。
         （#59 落地時記下的教訓反面用法：那次是卡片的形容詞與常數矛盾，這次讓常數說話。） */
      el("p", { class: "ax-muted", style: "margin:6px 0 0",
        text: !live ? t("假站模式：光環達標時經驗累積小幅加速，返水率同步小幅上浮。", "假站模式：光環達標時經驗累積小幅加速，返水率同步小幅上浮。")
                    : (rbMultFor(9e9, "live") > 1
                        ? t("真站模式：光環的返水加成已開啟，經驗加速仍為零。", "真站模式：光環的返水加成已開啟，經驗加速仍為零。")
                        : t("真站模式：光環只顯示活躍狀態，不提供任何額外加成。", "真站模式：光環只顯示活躍狀態，不提供任何額外加成。")) })
    ];
    HL.ui.modal(t("🔥 活躍光環", "🔥 活躍光環"), body);
  }

  HL.activity = {
    record: record, status: status, tiers: tiers, open: open,
    wageredSince: wageredSince, xpSince: xpSince, betsSince: betsSince,
    mode: mode, core: CORE
  };

  /* ---- #114 成就徽章牆的外部註冊者 ----
   * 段位判定**共用 `tierIndexFor`**（與 `multFor`／`rbMultFor` 同一個）⇒ 本檔仍然只有一份門檻真相，
   *   成就這條路上不出現任何門檻數字（沿用 #108 在 rakeboost 側連一個數字都不寫的紀律）。
   * 用 `TIERS.length - 1` 而不是寫死 3：將來加一段，這枚徽章自動改指向新的最高段。
   * `reward: 0`（§11）；`test` 型無進度條是刻意的（要進度條就得先動引擎＝#114 卡上判定為 M，不在本卡範圍）。
   * 為何不需要在 record() 裡補 sync：`HL.activity.record` 在 live-stats.js 裡排在
   *   `HL.achievements.record` **之前** ⇒ 跨過段位的那一注當場解鎖（順序有測項盯）。 */
  if (HL.achievements && HL.achievements.register) {
    HL.achievements.register({
      id: "aura-top-tier", cat: "平台里程碑", icon: "🌟",
      title: "常駐玩家", desc: "活躍光環達到最高段",
      tier: "gold", pts: 30, reward: 0,
      test: function () { return tierIndexFor(xpSince(WINDOW_DAYS)) >= TIERS.length - 1; }
    });
  }

  /* ---- #107：接進 #49 活動日曆，並宣告受眾＝光環亮著的人 ----
   * 光環是**常設**機制（sched:"always"），但它只對「近 30 天有在玩」的人有意義：
   *   idle 段的玩家看到「活躍光環」只會得到一則沒有內容的常設條目。宣告 `audience:{kind:"active"}`
   *   之後，這則活動就成為「光環亮著才看得到」＝日曆本身變成一種回饋。
   * ⚠️ 述詞求值一律走 HL.release（本檔不判斷「怎樣算活躍」；`active` 述詞回頭向 status().active 求，
   *   即本檔的 describeTier(i>0) ⇒ 門檻仍只有一份真相，只是換了方向：定義在此、判定在受眾表）。 */
  if (HL.promoCal && HL.promoCal.register) {
    HL.promoCal.register({
      id: "activity", icon: "🔥", sched: "always",
      audience: { kind: "active" },
      name: function () { return t("活躍光環", "活躍光環"); },
      cat: t("加成", "加成"),
      avail: function () { return true; },
      // ⚠️ P3 契約：note 為單一文字節點 ⇒ 只用整句片語（段位名與數值留在面板裡呈現）
      note: function () { return t("光環生效中 · 點開看目前段位與加成", "光環生效中 · 點開看目前段位與加成"); },
      open: function () { open(); }
    });
  }

  /* #72 說明中心：光環規則由本模組自己解釋。段數/門檻/倍率**當場向 tiers() 求值**，
   * 不手抄任何一個數字 ⇒ 改 TIERS 表時說明自動跟著改（沿 HL.edge.table 的形制）。 */
  if (HL.support && HL.support.register) {
    HL.support.register({
      id: "rules/activity-aura", cat: "rules", order: 40,
      title: "活躍光環是什麼？停下來會掉等級嗎？",
      keys: ["活躍", "光環", "掉等級", "滾動", "近 30 天", "active"],
      body: function () {
        var s = status(), rows = tiers() || [];
        var top = rows[rows.length - 1];
        return "活躍光環是 VIP 之外的**額外**一層，只看最近 " + s.days + " 天累積的經驗，"
             + "共 " + rows.length + " 段（最高為 " + (top ? top.icon + " " + top.name : "—") + "）。"
             + "目前為 " + s.icon + " " + s.name + "，視窗內已累積 " + xpNum(s.last30) + " XP。"
             + "光環會隨活躍度淡出，但 **VIP 核心等級與已解鎖的福利永不回收**——"
             + "衰退只作用在這一層。"
             /* 兩個消費端各自獨立判斷、逐項當場求值——刻意不寫「有／沒有加成」的二分句：
                真站可能出現「返水有、經驗仍為零」這個組合（旋鈕分屬兩個檔），
                二分句會在那個組合下說出一句不準的話。 */
             + (function () {
                 var eff = [];
                 if (top && top.mult > 1) eff.push("經驗累積小幅加速（最高 " + top.mult.toFixed(2) + "×）");
                 if (top && top.rb > 1) eff.push("返水率小幅上浮（最高 " + top.rb.toFixed(2) + "×）");
                 return eff.length ? "達標時" + eff.join("、") + "。" : "本站別下光環僅顯示活躍狀態，不提供額外加成。";
               })();
      },
      action: { label: "查看光環段位", run: function () { open(); } }
    });
  }

  /* #90 經濟旋鈕自我描述：窗長與各段倍率全部**當場求值**，不手抄。
   * `strict: "le"` ＝真站不得比假站寬鬆（本層真站恆 1 ⇒ 恆真，但仍宣告以便旋鈕表機械檢查）。 */
  if (HL.econCfg && HL.econCfg.register) {
    HL.econCfg.register({
      id: "activity", label: "活躍光環（#59）", icon: "🔥", order: 35,
      describe: function () {
        var rows = [
          { key: "window", label: "評估視窗", demo: WINDOW_DAYS, live: WINDOW_DAYS, unit: " 天", note: "環形桶保留 " + KEEP_DAYS + " 天＝任何消費者可問的最長視窗" },
          { key: "tiers", label: "光環段數", demo: TIERS.length, live: TIERS.length, unit: " 段", note: "首段為「沒有光環」" }
        ];
        rows.push({
          key: "rbLiveScale", label: "真站返水加成開啟比例（#108）", demo: 1, live: RB_LIVE_SCALE, unit: "", strict: "le",
          note: "0 ＝真站不給光環返水加成（§11 送幣成本，需船長裁決）；真站幅度＝1+(rb-1)×本值"
        });
        TIERS.forEach(function (tr, i) {
          if (i === 0) return;
          rows.push({
            key: "mult-" + tr.key, label: tr.icon + " " + tr.name + " 加速",
            demo: multFor(tr.min, "demo"), live: multFor(tr.min, "live"), unit: "×", strict: "le",
            note: "門檻 " + xpNum(tr.min) + " XP／視窗內"
          });
          rows.push({
            key: "rb-" + tr.key, label: tr.icon + " " + tr.name + " 返水加成",
            demo: rbMultFor(tr.min, "demo"), live: rbMultFor(tr.min, "live"), unit: "×", strict: "le",
            note: "常駐加成（非限時窗口）故刻意低於同段的經驗加速；夾在 rakeboost CAP 之內"
          });
        });
        return rows;
      }
    });
  }

  // 載入序脫鉤（#101）：現排在 selftest.js 之後走直通；else 分支保證重排也不會靜默掉測項。
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : this);

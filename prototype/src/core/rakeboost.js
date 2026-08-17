/* =============================================================================
 * rakeboost.js — #52 限時返水加成排程表 HL.rakeboost（純數學核心 + 註冊表 · 雙環境契約）
 * -----------------------------------------------------------------------------
 * 【這張卡在補什麼】
 *   #60 已把返水改成 `bet × edge × 段位返還比例 × boost`，**boost 這個入口卻只有一個硬編來源**
 *   （progress.js:262 直接讀 `HL.happyhour.mult()`）。於是：
 *     · 想加「新手前 24 小時高返水」（Rollbit 2026：首 24h 每注 15%、之後常態 5%）→ 得再改一次
 *       progress.js，第三個加成再改第四次＝每加一個活動就動一次金流熱路徑。
 *     · #49 `HL.promoCal` 排好了全站活動排程，**卻與回饋率完全沒接線**——活動歸活動、費率歸費率。
 *   本檔＝**容器先於內容**：加成是一張可註冊的表，happyhour / 新手窗口 / opt-in 活動都只是其中一筆，
 *   progress.js 從此只問一句 `HL.rakeboost.mult()`。新增加成＝register 一行，不動金流路徑。
 *
 * 【解析規則＝取最大值，不是相乘｜刻意的設計決策】
 *   相乘會讓成本無上界（兩個 ×2 疊成 ×4、三個 ×8），§11 剛把真站 NGR 調正就會被一次活動疊穿。
 *   故採「**最高適用加成勝出**」（也是玩家對「最優惠自動套用」的預期）＋每站別硬上限 CAP。
 *   ⇒ 只有 happyhour 生效時 `mult()===HL.happyhour.mult()` **逐位相同＝#35 零回歸**。
 *
 * 【與 #60 不變量的關係｜本檔把「只在 boost=1 成立」的證明補成「含加成也成立」】
 *   #60 證的是 `rakeback < 該注理論莊家收入`，但那組測項全部跑在 boost=1 下。實際線上
 *   happyhour ×2 時，假站頂階 0.875 × 2 = 1.75 ⇒ **早已可超過莊優**（#60 未涵蓋的既存事實）。
 *   本檔據 §11「假站刻意慷慨、真站須留住利潤」把它明確分軌並機械化：
 *     · 真站：`maxPct(live) × CAP.live = 0.145 × 1.5 = 0.2175 < 1` ⇒ **含加成仍恆真**（硬測項）
 *     · 假站：明載刻意超發（頂階 ×2 加成期間會吐超過莊優），只斷言不失控（< 3）
 *   ⇒ 真站的保證比 #60 出貨時**更強**，且假站的超發從「沒人算過」變成「寫明並被測項盯著」。
 *
 * 【#81（2026-08-10）新增第三種觸發源：「領取」本身開窗 · triggered boosts】
 *   Rollbit 2026 的 Rewards Calendar：**每領一次 → 隨即 +15% Rakeboost 60 分鐘**、可重複觸發。
 *   對照本檔改版前的三筆種子，觸發源只有三種、**沒有一種是「領取」**：
 *     happyhour＝排程、newcomer＝**註冊時間**（自刻 `HL_RB_NEWCOMER`）、rakeboost＝**加入活動**（借 `promoCal.joinedAt`）。
 *   更根本的問題不是少一種，而是**「限時窗口」這件事本身沒有被容器化**——上面三筆各自手刻一份
 *   時間戳存取（一筆自刻、一筆借用），第三筆要加就得再刻第三份。
 *   ⇒ 本次把「窗口」抽成一條共用路徑：`registerTriggered(spec)` 註冊即免費得到 `mult()/msLeft()`，
 *     `trigger(id)` 開窗，時間戳統一走 `HL.dom.lsGet/lsSet`（⇒ **自動繼承 #4 真/假站命名空間隔離**）。
 *     領取點只加一行 `trigger()`，**金流路徑一字不動**（progress.js 仍只問 `HL.rakeboost.mult()`）。
 *
 *   ⚠️ **刻意偏離卡上 API 草案的一處（強化而非放寬）**：卡上寫 `registerTriggered({..., mult})`，
 *     本實作**不收 spec 自帶的乘數**，改為 `kind` → 查下面 `MULTS` 中央表。理由：若每個註冊者
 *     都能自帶數字，經濟數值就會散落在各呼叫端（＝#60 `RB_RATES` 更名事故的同型土壤）；
 *     限定必須指名 MULTS 裡的一種，**新增觸發型加成無法憑空發明乘數**，且下面「∀kind: demo ≥ live」
 *     那條測項會自動覆蓋每一個新 kind。
 *
 *   【三條硬不變量的落地方式】
 *     (a) **不引入新的經濟旋鈕**：觸發型加成一律走既有 `resolve()`（取最大不相乘）與站別 `CAP`，
 *         `CAP` 一字未改 ⇒ 真站 `maxPct(live) × CAP.live = 0.2175 < 1` **自動繼續成立**（恆等式，非宣稱）。
 *     (b) **窗口不可無限展期**：同 id 重複觸發採 `nextUntil()`＝**取較晚到期、不累加時長**
 *         （否則領 10 次＝10 小時）；再加**單日觸發次數上限** `TRIGGER_DAILY_MAX`
 *         ⇒ 每日可享加成時間有硬上界（假站 4×60 分、真站 2×30 分）。
 *     (c) **真站不得比假站慷慨**：窗口時長、單日次數、乘數三者皆站別分軌且真站 ≤ 假站（有測項）。
 *
 * 雙環境契約（比照 #50 edge.js／#60 rakeback-core.js）：純資料/純函式以 module.exports 供
 * `node prototype/tests/run.js` 驗證，瀏覽器註冊於 window.HL.rakeboost。
 * ========================================================================== */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  var HOUR = 3600000;

  // ===== 純資料：各加成的乘數（站別感知 · §11 假站慷慨／真站保守）=====
  //   ⚠️ 這是**全檔唯一的乘數來源**：觸發型加成（#81）只能指名這裡的一種 kind，不得自帶數字。
  //      下面 `demo-generous-but-bounded` 測項改為遍歷 Object.keys(MULTS.demo)
  //      ⇒ 任何新增的 kind 自動被「假站 ≥ 真站 ≥ 1」盯住，不必記得去改測項。
  var MULTS = {
    demo: { newcomer: 2.0, optin: 1.5, claim: 1.5 },
    live: { newcomer: 1.2, optin: 1.1, claim: 1.15 }
  };
  // 每站別「解析後」硬上限。真站上限須滿足 maxPct×CAP < 1（見檔頭；有常駐測項盯）。
  //   ⚠️ #81 刻意**一字未改此表**——這就是「觸發型加成不引入新經濟旋鈕」的恆等式論證所依賴的前提。
  var CAP = { demo: 3.0, live: 1.5 };

  var NEWCOMER_MS = 24 * HOUR;   // 新手高返水窗口（Rollbit：首 24 小時）
  var OPTIN_MS = 6 * HOUR;       // opt-in 加成一次的有效時長（加入後起算）

  // ===== #81 觸發型加成：窗口時長與單日次數上限（站別分軌，真站 ≤ 假站，有測項）=====
  //   每日可享加成時間的硬上界 ＝ TRIGGER_MS × TRIGGER_DAILY_MAX（假站 4h／真站 1h）。
  var TRIGGER_MS = { demo: 60 * 60000, live: 30 * 60000 };
  var TRIGGER_DAILY_MAX = { demo: 4, live: 2 };

  function modeKey(mode) { return mode === "live" ? "live" : "demo"; }
  function multOf(kind, mode) { var m = MULTS[modeKey(mode)]; return (m && m[kind]) || 1; }
  function capOf(mode) { return CAP[modeKey(mode)]; }

  /* 解析：從「已生效加成的乘數陣列」求最終乘數。取最大值、夾在 [1, CAP]。
   * 空陣列/全無效 ⇒ 1（＝完全維持無加成行為）。 */
  function resolve(mults, mode) {
    var best = 1;
    for (var i = 0; i < (mults || []).length; i++) {
      var v = +mults[i];
      if (isFinite(v) && v > best) best = v;
    }
    var cap = capOf(mode);
    if (best > cap) best = cap;
    return best < 1 ? 1 : best;
  }

  function triggerMsOf(mode) { return TRIGGER_MS[modeKey(mode)]; }
  function triggerDailyMaxOf(mode) { return TRIGGER_DAILY_MAX[modeKey(mode)]; }

  /* #81 (b) 之一：同 id 重複觸發＝**取較晚到期**，不累加時長。
   * 窗口內再觸發 ⇒ 到期時間重新拉到 now+ttl（＝續命，但上限仍是一個 ttl）；
   * 窗口外觸發 ⇒ 開新窗。任一情況下 `until - now` 永不超過 ttl。 */
  function nextUntil(prevUntil, nowMs, ttlMs) {
    var ttl = Math.max(0, +ttlMs || 0);
    var cand = nowMs + ttl;
    var prev = +prevUntil || 0;
    return prev > cand ? prev : cand;
  }

  /* #81 (b) 之二：單日次數閘。rec = { day, n, until }。
   * 跨日 ⇒ 次數 n 歸零，但**保留 until**（23:59 開的窗不該在午夜被砍掉＝那是玩家已取得的權益）。
   * 回傳 { ok, reason, rec }；ok:false 時 rec 為未變更的正規化值（呼叫端不應寫回）。 */
  function trigStep(rec, day, nowMs, ttlMs, dailyMax) {
    var prevUntil = (rec && +rec.until) || 0;
    var sameDay = !!(rec && rec.day === day);
    var r = { day: day, n: sameDay ? (+rec.n || 0) : 0, until: prevUntil };
    var max = Math.max(0, +dailyMax || 0);
    if (r.n >= max) return { ok: false, reason: "daily-cap", rec: r };
    r.n += 1;
    r.until = nextUntil(prevUntil, nowMs, ttlMs);
    return { ok: true, reason: "ok", rec: r };
  }

  var CORE = {
    MULTS: MULTS, CAP: CAP, NEWCOMER_MS: NEWCOMER_MS, OPTIN_MS: OPTIN_MS,
    TRIGGER_MS: TRIGGER_MS, TRIGGER_DAILY_MAX: TRIGGER_DAILY_MAX,
    multOf: multOf, capOf: capOf, resolve: resolve,
    triggerMsOf: triggerMsOf, triggerDailyMaxOf: triggerDailyMaxOf,
    nextUntil: nextUntil, trigStep: trigStep
  };

  // ===================== 測項（雙環境同一批）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    st.register({
      id: "rakeboost/resolve-is-max-not-product", group: "rakeback",
      title: "加成解析＝取最大值（不相乘）且夾在 [1, CAP]", env: "both",
      run: function (t) {
        t.ok(CORE.resolve([], "demo") === 1, "無加成應為 ×1");
        t.ok(CORE.resolve(null, "demo") === 1, "null 應為 ×1");
        t.ok(CORE.resolve([1], "demo") === 1, "只有 ×1 應為 ×1");
        t.ok(CORE.resolve([2, 1.5], "demo") === 2, "兩筆應取最大 2（相乘會是 3）");
        t.ok(CORE.resolve([1.5, 2, 1.2], "demo") === 2, "三筆應取最大 2（相乘會是 3.6）");
        t.ok(CORE.resolve([0.5], "demo") === 1, "小於 1 的乘數不得減損返水");
        t.ok(CORE.resolve([NaN, 2], "demo") === 2, "NaN 應被忽略");
        t.ok(CORE.resolve([99], "demo") === CORE.capOf("demo"), "超上限應被夾到假站 CAP");
        t.ok(CORE.resolve([99], "live") === CORE.capOf("live"), "超上限應被夾到真站 CAP");
        t.ok(CORE.capOf("live") < CORE.capOf("demo"), "真站上限必須低於假站上限");
      }
    });

    st.register({
      id: "rakeboost/live-invariant-survives-boost", group: "rakeback",
      title: "真站：含加成後返水仍低於該注理論莊家收入（#60 不變量的加成版）", env: "both",
      run: function (t) {
        var C = loadCore();
        if (!C) { t.skip("rakeback-core 不可用"); return; }
        var cap = CORE.capOf("live"), worst = 0;
        for (var i = 0; i < C.tiers(); i++) {
          var pct = C.edgePctFor("live", i);
          if (pct > worst) worst = pct;
          t.ok(pct * cap < 1, "真站段位 " + i + " 返還比例 " + pct + " × 上限 " + cap +
            " = " + (pct * cap).toFixed(4) + " 必須 < 1（否則加成期間每注淨虧）");
        }
        // 逐遊戲實算：最壞情況（頂階 × 上限加成）仍須低於該遊戲莊優
        var edge = loadEdge();
        if (edge) {
          var ks = edge.keys();
          for (var k = 0; k < ks.length; k++) {
            var e = edge.edgeOf(ks[k]);
            var boosted = C.rateFor(e, "live", C.tiers() - 1) * cap;
            t.ok(boosted < e / 100, "真站/" + ks[k] + " 最壞加成返水率 " + boosted.toFixed(6) +
              " 必須低於莊優 " + (e / 100).toFixed(6));
          }
        }
        t.ok(worst * cap < 1, "真站最壞組合 " + (worst * cap).toFixed(4) + " < 1");
      }
    });

    st.register({
      id: "rakeboost/demo-generous-but-bounded", group: "rakeback",
      title: "假站：刻意超發但不失控（明載既存事實，非新增漏洞）", env: "both",
      run: function (t) {
        var C = loadCore();
        if (!C) { t.skip("rakeback-core 不可用"); return; }
        var cap = CORE.capOf("demo");
        var top = C.edgePctFor("demo", C.tiers() - 1);
        // 誠實記錄：假站頂階 × 加成上限**會**超過莊優（§11 假站刻意慷慨；真站才是要留利潤的那條）
        t.ok(top * cap > 1, "假站頂階 " + top + " × " + cap + " 預期 >1＝刻意慷慨（若此項失敗代表假站已被收斂，請同步更新檔頭說明）");
        t.ok(top * cap < 3, "假站超發仍須有界（< 3 倍莊優），實際 " + (top * cap).toFixed(3));
        // 假站每一筆加成都不得低於真站對應筆（慷慨度方向不可反轉）
        //   #81：改為**遍歷 MULTS 全部 kind**（原本硬列 ["newcomer","optin"]）
        //   ⇒ 之後每新增一種 kind 都自動被這條盯住，不必記得回來改測項。
        var kinds = Object.keys(CORE.MULTS.demo);
        t.ok(kinds.length >= 3, "MULTS 應至少含 newcomer/optin/claim 三種，實際 " + kinds.join(","));
        kinds.forEach(function (kind) {
          t.ok(CORE.multOf(kind, "demo") >= CORE.multOf(kind, "live"),
            kind + "：假站乘數不得低於真站");
          t.ok(CORE.multOf(kind, "live") >= 1, kind + "：真站乘數不得低於 1");
        });
        // 反向護欄：真站鍵集不得漏掉任何假站有的 kind（漏掉會靜默退化為 ×1＝真站悄悄失效）
        kinds.forEach(function (kind) {
          t.ok(CORE.MULTS.live[kind] !== undefined, kind + "：真站表必須也登記此 kind（否則靜默退化為 ×1）");
        });
        t.ok(CORE.multOf("nonexistent-kind", "demo") === 1, "未登記的加成種類應退化為 ×1");
      }
    });

    // ---- #81 觸發型加成：純數學不變量（兩端同一批）----
    st.register({
      id: "rakeboost/trigger-window-not-additive", group: "rakeback",
      title: "#81 觸發窗口取較晚到期而非累加時長（領 N 次 ≠ N 倍時長）", env: "both",
      run: function (t) {
        var TTL = 60 * 60000, T0 = 1000000000;
        t.ok(CORE.nextUntil(0, T0, TTL) === T0 + TTL, "首次觸發＝now+ttl");
        t.ok(CORE.nextUntil(null, T0, TTL) === T0 + TTL, "無舊值＝now+ttl");
        // 窗口內再觸發：續命到 now+ttl，但絕不變成 2×ttl
        var mid = T0 + TTL / 2;
        var u2 = CORE.nextUntil(T0 + TTL, mid, TTL);
        t.ok(u2 === mid + TTL, "窗口內再觸發應續命到 now+ttl，實得 " + (u2 - mid));
        t.ok(u2 - mid <= TTL, "續命後剩餘不得超過一個 ttl（累加會是 1.5×ttl）");
        t.ok(u2 < T0 + 2 * TTL, "絕不得等於累加結果 2×ttl");
        // 連觸發 10 次：剩餘時間仍恆 ≤ 一個 ttl（卡上「領 10 次＝10 小時」的反例）
        var until = 0, now = T0;
        for (var i = 0; i < 10; i++) { now += 60000; until = CORE.nextUntil(until, now, TTL); }
        t.ok(until - now === TTL, "連觸發 10 次後剩餘應恰為一個 ttl，實得 " + (until - now));
        // 舊到期較晚時不得被縮短（例：ttl 被下修的站別切換情境）
        t.ok(CORE.nextUntil(T0 + 10 * TTL, T0, TTL) === T0 + 10 * TTL, "既有較晚到期不得被縮短");
      }
    });

    st.register({
      id: "rakeboost/trigger-daily-cap", group: "rakeback",
      title: "#81 單日觸發次數上限（跨日歸零但保留已取得的窗口）", env: "both",
      run: function (t) {
        var TTL = 60 * 60000, T0 = 1000000000, DAY = 20000, MAX = 3;
        var rec = null, ok = 0;
        for (var i = 0; i < MAX + 2; i++) {
          var r = CORE.trigStep(rec, DAY, T0 + i * 1000, TTL, MAX);
          if (r.ok) { ok++; rec = r.rec; } else t.ok(r.reason === "daily-cap", "超額應回 daily-cap，實得 " + r.reason);
        }
        t.ok(ok === MAX, "單日成功觸發次數應恰為上限 " + MAX + "，實得 " + ok);
        t.ok(rec.n === MAX, "計數應停在上限，實得 " + rec.n);
        // 跨日：次數歸零、until 保留（23:59 開的窗不該被午夜砍掉）
        var nx = CORE.trigStep(rec, DAY + 1, T0 + 99999, TTL, MAX);
        t.ok(nx.ok === true, "跨日後應可再觸發");
        t.ok(nx.rec.n === 1, "跨日後計數應歸零再 +1，實得 " + nx.rec.n);
        // ⚠️ 這條必須用「既有窗口遠比新窗口長」的情境才有鑑別力：若只比對上面那筆同 ttl 的 rec，
        //   跨日觸發本身又開了一個新窗，會把「舊 until 被砍掉」完全遮住（本卡負向擾動實測到這點：
        //   第一版斷言 until >= keep 對「跨日歸零 until」的擾動抓不到，屬裝飾性斷言）。
        var longRec = { day: DAY, n: 1, until: T0 + 10 * TTL };
        var nx2 = CORE.trigStep(longRec, DAY + 1, T0 + 1000, TTL, MAX);
        t.ok(nx2.rec.until === T0 + 10 * TTL,
          "跨日不得縮短既有較長窗口（應保留 " + (10 * TTL) + "，實得 " + (nx2.rec.until - T0) + "）");
        t.ok(nx2.rec.until > T0 + 1000 + TTL, "保留值必須嚴格晚於「重新開一個新窗」的結果（＝真的沒被歸零）");
        // 上限 0 ⇒ 完全擋住（供「真站先不開放」之用）
        t.ok(CORE.trigStep(null, DAY, T0, TTL, 0).ok === false, "上限 0 應完全擋住");
        // 每日加成時間硬上界＝ttl × max，兩站別都要能算出來且真站更緊
        var demoCeil = CORE.triggerMsOf("demo") * CORE.triggerDailyMaxOf("demo");
        var liveCeil = CORE.triggerMsOf("live") * CORE.triggerDailyMaxOf("live");
        t.ok(demoCeil === 4 * 3600000, "假站每日加成時間上界應為 4h，實得 " + (demoCeil / 3600000) + "h");
        t.ok(liveCeil === 1 * 3600000, "真站每日加成時間上界應為 1h，實得 " + (liveCeil / 3600000) + "h");
        t.ok(liveCeil < demoCeil, "真站每日加成時間上界必須嚴格小於假站");
      }
    });

    st.register({
      id: "rakeboost/trigger-live-not-more-generous", group: "rakeback",
      title: "#81 真站的窗口時長／單日次數／乘數三者皆不得超過假站", env: "both",
      run: function (t) {
        t.ok(CORE.triggerMsOf("live") <= CORE.triggerMsOf("demo"), "真站窗口時長不得長於假站");
        t.ok(CORE.triggerDailyMaxOf("live") <= CORE.triggerDailyMaxOf("demo"), "真站單日次數不得多於假站");
        t.ok(CORE.multOf("claim", "live") <= CORE.multOf("claim", "demo"), "真站領取加成乘數不得高於假站");
        t.ok(CORE.multOf("claim", "live") >= 1, "真站領取加成乘數不得低於 1");
        // (a) 恆等式：CAP 未被本卡改動 ⇒ 真站硬不變量自動續成立
        t.ok(CORE.capOf("live") === 1.5 && CORE.capOf("demo") === 3.0,
          "#81 不得改動 CAP（真站 maxPct×CAP<1 的恆等式論證依賴此前提）");
        // 觸發型乘數本身也必須進得了 CAP 這道關（不得繞過 resolve）
        t.ok(CORE.resolve([CORE.multOf("claim", "live")], "live") <= CORE.capOf("live"),
          "觸發型乘數解析後必須仍受真站 CAP 夾制");
        t.ok(CORE.triggerMsOf("bogus-mode") === CORE.triggerMsOf("demo"), "未知站別應退化為假站鍵（與 modeKey 一致）");
      }
    });

    if (isNode) return;

    st.register({
      id: "rakeboost/wired", group: "rakeback",
      title: "返水熱路徑改讀加成表，且 happyhour 單獨生效時逐位等於舊行為", env: "browser",
      run: function (t) {
        t.isFn(HL && HL.rakeboost && HL.rakeboost.mult, "HL.rakeboost.mult 應存在");
        t.isFn(HL && HL.rakeback && HL.rakeback.accrue, "HL.rakeback.accrue 應存在");
        t.ok(/rakeboost/.test(String(HL.rakeback.accrue)), "rbAccrue 應改讀 HL.rakeboost");
        var m = HL.rakeboost.mult();
        t.ok(m >= 1 && m <= HL.rakeboost.cap(), "當前乘數 " + m + " 應落在 [1, cap]");
        // #35 零回歸：只有 happyhour 生效時，表解析結果必須等於 happyhour 自己的乘數
        var others = HL.rakeboost.active().filter(function (a) { return a.id !== "happyhour"; });
        if (HL.happyhour && !others.length) {
          t.ok(m === HL.happyhour.mult(), "僅 happyhour 生效時應逐位等於 HL.happyhour.mult()，實際 " +
            m + " vs " + HL.happyhour.mult());
        } else t.skip("另有其他加成生效（新手窗口/opt-in），本項僅驗單獨情境");
        // opt-in 加成必須真的被 opt-in 閘住：未加入 ⇒ 不在 active() 內
        var joined = HL.promoCal && HL.promoCal.isJoined && HL.promoCal.isJoined("rakeboost");
        var inActive = HL.rakeboost.active().some(function (a) { return a.id === "rakeboost"; });
        t.ok(!!joined === inActive, "opt-in 加成的生效狀態必須與「是否已加入」一致（joined=" + !!joined + " active=" + inActive + "）");
      }
    });

    st.register({
      id: "rakeboost/trigger-wired", group: "rakeback",
      title: "#81 觸發型加成已接線：未觸發時零回歸、觸發後乘數上升、領取點確有呼叫", env: "browser",
      run: function (t) {
        t.isFn(HL.rakeboost.registerTriggered, "registerTriggered 應存在");
        t.isFn(HL.rakeboost.trigger, "trigger 應存在");
        var sBefore = HL.rakeboost.triggerStatus("claimwindow");
        t.ok(sBefore.registered, "種子 claimwindow 應已註冊");
        t.ok(sBefore.dailyMax >= 1, "單日上限應 ≥1，實得 " + sBefore.dailyMax);
        // (b) 零回歸／生效兩態各有互補斷言 —— ⚠️ **刻意不用 t.skip**：
        //   本測項第一版在「窗口正生效」時 t.skip()，而本 harness 的 skip 會把**整個測項**標成 skip
        //   ⇒ 一個今天已簽到的玩家（線上最常見狀態）會讓下面「領取點確有呼叫」那條鎖整組消失。
        //   preview 實測到這點後改為兩態皆斷言：未觸發必不在 active()、已觸發必在且乘數正確。
        var row = HL.rakeboost.active().filter(function (a) { return a.id === "claimwindow"; })[0];
        var claimMult = HL.rakeboost.core.multOf("claim", (HL.site && HL.site.isLive()) ? "live" : "demo");
        if (sBefore.msLeft <= 0) {
          t.ok(!row, "未觸發時 claimwindow 不得出現在 active()（＝對 mult() 零影響）");
        } else {
          t.ok(!!row, "窗口生效中時 claimwindow 必須出現在 active()");
          t.ok(row.mult === claimMult, "生效中乘數應等於站別表值 " + claimMult + "，實得 " + (row && row.mult));
          t.ok(row.msLeft > 0 && row.msLeft <= HL.rakeboost.core.triggerMsOf((HL.site && HL.site.isLive()) ? "live" : "demo"),
            "生效中剩餘時間須落在 (0, 站別窗口上限]，實得 " + (row && row.msLeft));
        }
        // 未註冊 id 必須安全退化（領取點誤打 id 不得拋錯）
        var bad = HL.rakeboost.trigger("no-such-boost-id");
        t.ok(bad.ok === false && bad.reason === "unregistered", "未註冊 id 應回 unregistered 而非拋錯");
        // 領取點確實有呼叫（防「容器做好了卻沒人用」＝#52 當年 promoCal.register 零註冊者的同型病）
        t.ok(!!(HL.rewards && HL.rewards.claim), "HL.rewards.claim 應存在");
        t.ok(/rakeboost[\s\S]{0,80}trigger/.test(String(HL.rewards.claim)),
          "每日簽到領取路徑應含 HL.rakeboost.trigger 呼叫");
        // 解析後仍受 cap 夾制（不得因為新增一種加成就衝破上限）
        t.ok(HL.rakeboost.mult() <= HL.rakeboost.cap(), "當前乘數不得超過站別 cap");
      }
    });

    st.register({
      id: "rakeboost/trigger-site-namespaced", group: "rakeback",
      title: "#81 窗口時間戳走 HL.dom.lsGet/lsSet（切站不繼承窗口）", env: "browser",
      run: function (t) {
        var src = String(trigLoad) + String(trigSave);
        t.ok(/lsGet/.test(src) && /lsSet/.test(src), "窗口存取應走 HL.dom.lsGet/lsSet");
        t.ok(!/localStorage/.test(src), "不得直接碰 localStorage（會繞過站別命名空間前綴）");
        t.isFn(HL.dom.lsGet, "HL.dom.lsGet 應存在");
        t.isFn(HL.site && HL.site.ns, "HL.site.ns 應存在（命名空間前綴的來源）");
      }
    });
  }

  function loadCore() {
    try {
      if (isNode) return require("./rakeback-core.js");
      return (HL && HL.rakebackCore) ? HL.rakebackCore : null;
    } catch (e) { return null; }
  }
  function loadEdge() {
    try {
      if (isNode) return require("./edge.js");
      return (HL && HL.edge && HL.edge.edgeOf) ? HL.edge : null;
    } catch (e) { return null; }
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  /* =========================== 瀏覽器：加成註冊表 =========================== */
  var el = HL.dom.el, dhm = HL.dom.dhm;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  function mode() { return (HL.site && HL.site.isLive()) ? "live" : "demo"; }

  var ENTRIES = [];   // 加成註冊表（資料驅動；比照 HL.promoCal / HL.dock 家族）

  /* register(spec)：
   *   id       唯一鍵（同 id 覆蓋＝可熱替換）
   *   name/icon 顯示用（name 為可翻譯的完整片語）
   *   avail()  模組是否可用（false ⇒ 整筆跳過，載入序無關）
   *   mult()   當下乘數（1 ＝未生效）
   *   msLeft() 剩餘毫秒（0/未給 ⇒ 不顯示倒數）
   */
  function register(spec) {
    if (!spec || !spec.id) return HL.rakeboost;
    ENTRIES = ENTRIES.filter(function (e) { return e.id !== spec.id; });
    ENTRIES.push(spec);
    return HL.rakeboost;
  }
  function unregister(id) { ENTRIES = ENTRIES.filter(function (e) { return e.id !== id; }); return HL.rakeboost; }
  function entries() { return ENTRIES.slice(); }

  function call(v, dflt) { try { return typeof v === "function" ? v() : (v === undefined ? dflt : v); } catch (e) { return dflt; } }

  // 當下所有「已生效」的加成（mult > 1）
  function active() {
    var out = [];
    ENTRIES.forEach(function (sp) {
      if (!call(sp.avail, true)) return;
      var m = +call(sp.mult, 1) || 1;
      if (!(m > 1)) return;
      out.push({ id: sp.id, name: call(sp.name, sp.id), icon: sp.icon || "💧", mult: m, msLeft: +call(sp.msLeft, 0) || 0 });
    });
    out.sort(function (a, b) { return b.mult - a.mult; });   // 最高加成在前（＝實際生效的那筆）
    return out;
  }

  // 最終乘數（progress.js 的 rbAccrue 唯一入口）
  function mult() {
    return resolve(active().map(function (a) { return a.mult; }), mode());
  }
  function cap() { return capOf(mode()); }

  /* ---------- 種子：既有 + 新增加成，全部只是表裡的一筆 ---------- */

  // ① Happy Hour（#35）：委派給既有模組＝單一真相，行為與改版前逐位相同
  register({
    id: "happyhour", name: function () { return t("Happy Hour", "Happy Hour"); }, icon: "⚡",
    avail: function () { return !!(HL.happyhour && HL.happyhour.mult); },
    mult: function () { return HL.happyhour.mult(); },
    msLeft: function () { var s = HL.happyhour.status(); return s.active ? s.msLeft : 0; }
  });

  // ② 新手窗口（Rollbit 2026：首 24 小時高返水）
  //    起算時間戳惰性播種；播種當下若已有終身押注（＝老玩家）則直接記 0＝永不啟用，
  //    避免「加了這個功能就讓所有既有玩家白拿一輪」。
  var KEY_N = "HL_RB_NEWCOMER";
  function newcomerTs() {
    var o = HL.dom.lsGet(KEY_N, null);
    if (o && typeof o.ts === "number") return o.ts;
    var veteran = !!(HL.vip && HL.vip.status && HL.vip.status().wager > 0);
    var ts = veteran ? 0 : Date.now();
    HL.dom.lsSet(KEY_N, { ts: ts, seededVeteran: veteran });
    return ts;
  }
  function newcomerLeft() {
    var ts = newcomerTs();
    if (!ts) return 0;
    return Math.max(0, ts + NEWCOMER_MS - Date.now());
  }
  register({
    id: "newcomer", name: function () { return t("新手高返水窗口", "新手高返水窗口"); }, icon: "🌱",
    avail: function () { return newcomerTs() > 0; },
    mult: function () { return newcomerLeft() > 0 ? multOf("newcomer", mode()) : 1; },
    msLeft: newcomerLeft
  });

  // ③ opt-in 限時加成（bet365 2026「每個促銷需主動 opt-in」＋ Rollbit Rakeboost）
  //    生效條件＝玩家在 #49 活動日曆按下「加入」；一次有效 OPTIN_MS，每日限加入一次。
  function optinLeft() {
    if (!(HL.promoCal && HL.promoCal.joinedAt)) return 0;
    var at = HL.promoCal.joinedAt("rakeboost");
    if (!at) return 0;
    return Math.max(0, at + OPTIN_MS - Date.now());
  }
  register({
    id: "rakeboost", name: function () { return t("限時返水加成", "限時返水加成"); }, icon: "💧",
    avail: function () { return !!(HL.promoCal && HL.promoCal.joinedAt); },
    mult: function () { return optinLeft() > 0 ? multOf("optin", mode()) : 1; },
    msLeft: optinLeft
  });

  /* ---------- #81 觸發型加成：「限時窗口」的共用容器 ---------- */
  //   改版前三筆種子各自手刻時間戳（newcomer 自刻 HL_RB_NEWCOMER、optin 借 promoCal.joinedAt）；
  //   本區把「窗口」收斂成一份存放與一條路徑，之後第 N 個觸發型加成＝registerTriggered 一行。
  //   ⚠️ 存取一律走 HL.dom.lsGet/lsSet ⇒ 自動繼承 #4 真/假站命名空間前綴（切站不繼承窗口）。
  var KEY_T = "HL_RB_TRIG";       // { <id>: { day, n, until } }
  var TRIGGERED = {};             // id -> 正規化後的觸發型 spec

  function trigLoad() { var o = HL.dom.lsGet(KEY_T, {}); return (o && typeof o === "object") ? o : {}; }
  function trigSave(o) { HL.dom.lsSet(KEY_T, o); }
  function trigLeft(id) {
    var rec = trigLoad()[id];
    return rec ? Math.max(0, (+rec.until || 0) - Date.now()) : 0;
  }

  /* registerTriggered(spec)：註冊一個「被事件觸發才開窗」的加成。
   *   id        唯一鍵
   *   kind      指名 MULTS 中的一種乘數（**不接受自帶數字**，見檔頭「刻意偏離」說明）
   *   ttlMs     可選；不給或超過站別上限 ⇒ 用/夾到 TRIGGER_MS[站別]
   *   dailyMax  可選；同上，夾到 TRIGGER_DAILY_MAX[站別]
   *   name/icon 顯示用（name 為可翻譯的完整片語）
   * 註冊後即自動成為 ENTRIES 的一筆 ⇒ 免費得到 mult()/msLeft()/active()/summaryNode() 全套。 */
  function registerTriggered(spec) {
    if (!spec || !spec.id) return HL.rakeboost;
    var kind = spec.kind || "claim";
    var sp = {
      id: spec.id, kind: kind, name: spec.name, icon: spec.icon || "🎁",
      ttlMs: function () {
        var want = +call(spec.ttlMs, 0) || triggerMsOf(mode());
        return Math.min(want, triggerMsOf(mode()));          // 硬夾：註冊者不得自行放寬窗口
      },
      dailyMax: function () {
        var want = +call(spec.dailyMax, 0) || triggerDailyMaxOf(mode());
        return Math.min(want, triggerDailyMaxOf(mode()));    // 硬夾：註冊者不得自行放寬次數
      }
    };
    TRIGGERED[sp.id] = sp;
    register({
      id: sp.id, name: sp.name, icon: sp.icon,
      avail: function () { return true; },
      mult: function () { return trigLeft(sp.id) > 0 ? multOf(sp.kind, mode()) : 1; },
      msLeft: function () { return trigLeft(sp.id); }
    });
    return HL.rakeboost;
  }

  /* trigger(id)：開窗（領取點只需這一行）。回傳 { ok, reason, msLeft, mult }。
   *   reason ∈ unregistered | daily-cap | ok —— 呼叫端可完全忽略回傳值（本身即無害）。 */
  function trigger(id) {
    var sp = TRIGGERED[id];
    if (!sp) return { ok: false, reason: "unregistered", msLeft: 0, mult: 1 };
    var all = trigLoad();
    var res = trigStep(all[id], HL.dom.dayNum(), Date.now(), sp.ttlMs(), sp.dailyMax());
    if (!res.ok) return { ok: false, reason: res.reason, msLeft: trigLeft(id), mult: mult() };
    all[id] = res.rec;
    trigSave(all);
    var m = multOf(sp.kind, mode()), left = Math.max(0, res.rec.until - Date.now());
    if (HL.notify) {
      HL.notify.add({
        ic: sp.icon,
        title: t("領取加成窗口", "領取加成窗口"),
        // P3 契約：語意全在可翻譯片語裡，值只放裸數字/時間（勿把 ×N 串進整句）
        text: t("返水加成已開啟", "返水加成已開啟") + " ×" + m + " · " + dhm(left)
      });
    }
    return { ok: true, reason: "ok", msLeft: left, mult: m };
  }
  function triggerStatus(id) {
    var sp = TRIGGERED[id], rec = trigLoad()[id] || {};
    var sameDay = rec.day === HL.dom.dayNum();
    return {
      registered: !!sp, msLeft: trigLeft(id),
      usedToday: sameDay ? (+rec.n || 0) : 0,
      dailyMax: sp ? sp.dailyMax() : 0,
      mult: sp ? multOf(sp.kind, mode()) : 1
    };
  }

  // ④ 領取即開窗（Rollbit Rewards Calendar：每領一次 → 隨即開一段個人加成窗口）
  //    種子只掛「每日簽到」一個領取點（容器先於內容）；其餘領取點（任務/返水/VIP 升級金/#48 保險/
  //    #46 賽季）要接就是各加一行 `HL.rakeboost.trigger("claimwindow")`，不必再動本檔。
  registerTriggered({
    id: "claimwindow", kind: "claim", icon: "🎁",
    name: function () { return t("領取加成窗口", "領取加成窗口"); }
  });

  // ---- 接進 #49 活動日曆：活動排程 × 回饋率首次接線（opt-in 由日曆那顆「加入」驅動）----
  function registerPromo() {
    if (!HL.promoCal || !HL.promoCal.register) return;
    HL.promoCal.register({
      id: "rakeboost", name: function () { return t("限時返水加成", "限時返水加成"); },
      icon: "💧", cat: t("加成", "加成"), sched: "always",
      optIn: true, optInTtlMs: OPTIN_MS, optInDaily: true,
      avail: function () { return !!HL.rakeback; },
      // ⚠️ P3 契約 × #49 現況：promoCal 的 `note` 是**單一字串→單一文字節點**，故「中文＋動態值」
      //   一律翻不到（本檔七個既有 note 全有此形狀＝#49 的既存 i18n 債，非本卡新增）。
      //   因此未加入時刻意**不把 ×N 塞進 note**（改成純片語＝可翻譯），倍率在返水面板的加成區塊呈現；
      //   已加入時的倒數必須帶值，屬不可避免者，留給維護軌隨 #49 note 形狀一併處理。
      note: function () {
        var left = optinLeft();
        if (left > 0) return t("加成生效中 · 剩", "加成生效中 · 剩") + " " + dhm(left);
        return t("加入即開啟返水加成", "加入即開啟返水加成");
      },
      open: function () { if (HL.rakeback) HL.rakeback.open(); }
    });
  }

  /* ---------- 呈現 helper：供返水面板顯示「當前加成 + 剩餘」---------- */
  function summaryNode() {
    var list = active(), m = mult();
    if (m <= 1) {
      return el("small", { class: "ax-muted", style: "display:block",
        text: t("目前無返水加成生效。", "目前無返水加成生效。") });
    }
    var top = list[0];
    var kids = [
      el("div", { class: "ax-kv" }, [
        el("span", { text: t("當前返水加成", "當前返水加成") }),
        // ⚠️ P3 契約：值節點保持「×數字」，語意/單位一律放進可翻譯的整句 label
        el("b", { class: "ax-gold", text: "×" + m })
      ])
    ];
    if (top.msLeft > 0) {
      kids.push(el("div", { class: "ax-kv" }, [
        el("span", { text: t("加成剩餘時間", "加成剩餘時間") }),
        el("b", { text: dhm(top.msLeft) })
      ]));
    }
    kids.push(el("small", { class: "ax-muted", style: "display:block",
      text: t("多個加成同時符合時，只套用最高的一個（不相乘）。", "多個加成同時符合時，只套用最高的一個（不相乘）。") }));
    if (list.length > 1) {
      kids.push(el("small", { class: "ax-muted", style: "display:block",
        text: t("其他符合但未套用的加成：", "其他符合但未套用的加成：") + " " +
          list.slice(1).map(function (a) { return a.icon + " " + a.name + " ×" + a.mult; }).join(" · ") }));
    }
    return el("div", { class: "ax-panel" }, kids);
  }

  HL.rakeboost = {
    register: register, unregister: unregister, entries: entries,
    active: active, mult: mult, cap: cap, summaryNode: summaryNode,
    // #81 觸發型加成
    registerTriggered: registerTriggered, trigger: trigger, triggerStatus: triggerStatus,
    NEWCOMER_MS: NEWCOMER_MS, OPTIN_MS: OPTIN_MS, core: CORE
  };

  /* #90 經濟旋鈕自我描述：加成倍率/上限/窗口/次數**全部是送幣型** ⇒ 一律 strict:"le"。
   * MULTS 逐 kind 遍歷（不寫死 newcomer/optin/claim 三個名字）＝新增一種加成自動被盯住，
   * 同本檔既有 `demo-generous-but-bounded` 測項的設計。 */
  if (HL.econCfg && HL.econCfg.register) {
    HL.econCfg.register({
      id: "rakeboost", label: "返水加成（#81）", icon: "🚀", order: 20,
      describe: function () {
        var kinds = Object.keys(MULTS.demo);
        var rows = [
          { key: "cap", label: "解析後倍率硬上限", demo: CAP.demo, live: CAP.live, unit: "×", strict: "le",
            note: "真站須滿足 返還比例×CAP < 100% 莊優（有常駐測項盯）" },
          { key: "newcomerH", label: "新手高返水窗口", demo: NEWCOMER_MS / HOUR, live: NEWCOMER_MS / HOUR, unit: " 小時", note: "兩站同值（窗口長度非站別旋鈕）" },
          { key: "optinH", label: "opt-in 加成時長", demo: OPTIN_MS / HOUR, live: OPTIN_MS / HOUR, unit: " 小時", note: "兩站同值" },
          { key: "trigMin", label: "觸發型加成單次時長", demo: TRIGGER_MS.demo / 60000, live: TRIGGER_MS.live / 60000, unit: " 分", strict: "le" },
          { key: "trigMax", label: "觸發型每日次數上限", demo: TRIGGER_DAILY_MAX.demo, live: TRIGGER_DAILY_MAX.live, unit: " 次", strict: "le",
            note: "每日加成時間硬上界＝單次時長 × 次數（假站 " + (TRIGGER_MS.demo * TRIGGER_DAILY_MAX.demo / HOUR) + "h／真站 " + (TRIGGER_MS.live * TRIGGER_DAILY_MAX.live / HOUR) + "h）" }
        ];
        kinds.forEach(function (k) {
          rows.push({ key: "mult:" + k, label: "加成倍率 · " + k, demo: MULTS.demo[k], live: MULTS.live[k], unit: "×", strict: "le" });
        });
        return rows;
      }
    });
  }

  // 載入序：本檔早於 core/promo-cal.js 與 core/selftest.js ⇒ 兩者皆延後掛（比照 #56/#60 踩過的坑）
  if (HL.promoCal) registerPromo();
  else if (global.addEventListener) global.addEventListener("DOMContentLoaded", registerPromo);
  // 載入序脫鉤（#101）：本檔早於 core/selftest.js ⇒ 先排隊，由 selftest.js 載入時清算。
  //   （registerPromo 上面那條仍走 DOMContentLoaded——那是對 HL.promoCal 的相依，與本佇列無關。）
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

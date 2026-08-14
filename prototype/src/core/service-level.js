/*
 * Apex Win｜VIP 服務水準軸 HL.sla（自我進化引擎 #63）
 * ─────────────────────────────────────────────────────────────────────
 * 【問題】ApexWin 的 VIP 每一條延伸線都是「送錢」：#1 段位獎金、#50 成本加權經驗、
 *   #60 依段位放大的返水比例、reload/cashback 段位費率……而**提款/兌獎體驗是單一固定流程、
 *   與段位完全無關**。⇒ 高段位玩家在「拿錢這件事」上感受不到任何差別，而這正是真金站最有感的差異點。
 *
 * 【五平台共識（每站各貢獻不同維度、卻全落在同一軸）】
 *   · Dorados 2026-08-04：五階 VIP 決定的不是給多少錢，而是 **① 兌獎處理速度（L1 72h → L5 24h）
 *     ② 每月兌獎上限（30,000 → 60,000 Gems）**；**刻意不分階**的是每日上限（全階一致）。
 *   · Chancer 2026-08-05：分階**提領上限** + 商城折扣。
 *   · BigPirate 2026-08-05：分階**客服層級／專屬客戶經理**。
 *   · Kaasino 2026-08-05：標準提領上限為**三週期制（£10,000/日・£20,000/週・£60,000/月）**、
 *     VIP 分階解鎖更高門檻，Prime 頂階＝專屬客戶經理。（來源衝突已在 dossier 據實兩記。）
 *   · CoinsBack 2026-08-05：CoinsClub 14 級高階解鎖的不是錢，是**加速兌獎 + 優先客服**。
 *   ⇒ 五站的維度**互不相同**（時效／上限／週期數／客服）。這正是本檔不做「固定三欄位」而做
 *     **可註冊維度表**的決定性理由：新增一種服務水準＝加一筆 spec，面板與閘皆零改動。
 *
 * 【容器先於內容（擴充性優先）】
 *   `register(spec)` 自我上架（比照 `HL.rg.register`／`HL.games.register`／`HL.achievements.register`）。
 *   每筆 spec ＝ `{ id, label, unit, kind, period, better, byTier:{demo:[],live:[]}, fmt, hint }`：
 *     · `kind:"cap"` ＝ 額度型（帶 `period` day/week/month，會被閘逐筆求值）
 *     · `kind:"info"` ＝ 純呈現型（只在面板顯示，不參與閘）
 *     · `better` ＝ "lower"（如處理時效）或 "higher"（如額度／客服層級）——單調性測項據此逐向驗證
 *   **表是唯一真相**：真金上線後把數值換成真 SLA 即可，介面與文案不動。
 *
 * 【站別感知（§11）】假站 demo 寬鬆、真站 live 保守。**真站在任一維度都不得比假站寬鬆**
 *   （時效不得更短、額度不得更大）＝常駐測項 `sla/live-not-looser`，避免哪天調表時
 *   不小心讓真站更好送錢／更快出金。
 *
 * 【零回歸契約】未註冊任何 `kind:"cap"` 維度時 `check()` 恆真；`HL.money.canWithdraw()` 為 false
 *   （休閒模式／真金未開放）時提款頁根本不渲染表單 ⇒ 本檔對現況玩法**零影響**，
 *   唯一新增的可見面貌是 VIP 面板多一顆「服務水準」按鈕（唯讀說明表，比照 #50 的 `HL.edge.open`）。
 *
 * 【邊界｜與 CONTROL.avoid 的關係】avoid 列的是「真金流串接／KYC／提款審核佇列」。本檔只做
 *   **分階額度與預計到帳時間**這半邊（純前端、資料驅動）；**提款→待審→核准的狀態機仍未做、仍不開卡**
 *   （台帳「提款審核佇列」維持 absent）。故本檔擋下提款時的語意是「超出你這一階的額度」，
 *   **不是**「送去人工審核」。
 *
 * 雙環境契約（比照 #50 edge／#51 betlog／#54 release／#60 rakeback-core／#67 rg）：
 *   純資料/純函式區以 `module.exports` 暴露供 `node prototype/tests/run.js` 驗證
 *   ⇒ **驗的即瀏覽器跑的同一份**。註冊於 window.HL.sla。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  var DAY = 86400000;
  var WEEK = 7 * DAY;
  var KEY = "HL_SLA";
  var TIERS = 5;                     // 對齊 progress.js RANKS（青銅→鑽石）

  // 期間索引：day/week 用固定長度桶（決定性、與 #33/#22 同口徑）；month 用曆月（真實帳務語意）
  function dayOf(ts) { return Math.floor(ts / DAY); }
  function weekOf(ts) { return Math.floor(ts / WEEK); }
  function monthOf(ts) { var d = new Date(ts); return d.getFullYear() * 12 + d.getMonth(); }
  var PERIOD_OF = { day: dayOf, week: weekOf, month: monthOf };

  /* ===================== 服務水準維度註冊表 ===================== */
  var DIMS = [];
  function normalize(s) {
    var kind = s.kind === "cap" ? "cap" : "info";
    return {
      id: s.id,
      label: s.label || s.id,
      unit: s.unit || "money",                                  // money | hours | level
      kind: kind,
      period: kind === "cap" ? (PERIOD_OF[s.period] ? s.period : "day") : null,
      better: s.better === "lower" ? "lower" : "higher",
      byTier: { demo: (s.byTier && s.byTier.demo) || [], live: (s.byTier && s.byTier.live) || [] },
      fmt: typeof s.fmt === "function" ? s.fmt : null,
      hint: s.hint || ""
    };
  }
  function register(spec) {
    if (!spec || !spec.id || !spec.byTier) return null;
    var n = normalize(spec);
    if (!n.byTier.demo.length || n.byTier.demo.length !== n.byTier.live.length) return null;  // 兩站別必須同長
    for (var i = 0; i < DIMS.length; i++) {
      if (DIMS[i].id === n.id) { DIMS[i] = n; return n; }        // 同 id 覆蓋（重載安全）
    }
    DIMS.push(n);
    return n;
  }
  function dimOf(id) { for (var i = 0; i < DIMS.length; i++) if (DIMS[i].id === id) return DIMS[i]; return null; }
  function caps() { return DIMS.filter(function (d) { return d.kind === "cap"; }); }

  // 段位索引夾住（未知/越界一律夾進 [0, n-1]＝漏傳只退化成最低階，不出錯）
  function tierIdx(i, len) {
    i = Math.floor(+i || 0);
    if (!(i >= 0)) i = 0;
    return Math.min(i, len - 1);
  }
  function modeKey(mode) { return mode === "live" ? "live" : "demo"; }

  function valueFor(id, tier, mode) {
    var d = dimOf(id); if (!d) return null;
    var row = d.byTier[modeKey(mode)];
    return row[tierIdx(tier, row.length)];
  }

  /* ===================== 期間累計（純邏輯）=====================
   * usage ＝ { day, week, month, used:{day,week,month} }。跨期只清該期，較長的期不受影響。 */
  function blank(now) {
    return { day: dayOf(now), week: weekOf(now), month: monthOf(now), used: { day: 0, week: 0, month: 0 } };
  }
  function rollover(u, now) {
    if (!u || !u.used) return blank(now);
    if (u.day !== dayOf(now)) { u.day = dayOf(now); u.used.day = 0; }
    if (u.week !== weekOf(now)) { u.week = weekOf(now); u.used.week = 0; }
    if (u.month !== monthOf(now)) { u.month = monthOf(now); u.used.month = 0; }
    return u;
  }
  function addUsage(u, amount, now) {
    u = rollover(u, now);
    amount = Math.max(0, Math.round(amount || 0));
    u.used.day += amount; u.used.week += amount; u.used.month += amount;
    return u;
  }
  function remainingOf(dim, u, tier, mode, now) {
    var cap = valueFor(dim.id, tier, mode);
    if (cap == null) return null;
    u = rollover(u, now);
    return Math.max(0, cap - (u.used[dim.period] || 0));
  }

  /* 閘：回 { ok } 或 { ok:false, id, label, period, cap, used, remaining }。
   * 逐維度求值，取**第一個**被擋下的（維度依註冊序＝day → week → month，故短週期先報＝訊息更貼近玩家感受）。
   * 無 cap 維度／金額 ≤ 0 ⇒ 恆真（零回歸契約）。 */
  function evaluate(u, amount, tier, mode, now) {
    amount = Math.max(0, Math.round(amount || 0));
    if (amount <= 0) return { ok: true };
    var cs = caps();
    for (var i = 0; i < cs.length; i++) {
      var d = cs[i], rem = remainingOf(d, u, tier, mode, now);
      if (rem == null) continue;
      if (amount > rem) {
        return { ok: false, id: d.id, label: d.label, period: d.period,
                 cap: valueFor(d.id, tier, mode), used: rollover(u, now).used[d.period], remaining: rem };
      }
    }
    return { ok: true };
  }

  /* ===================== 首批維度（五平台共識的四個具體出口）===================== */
  register({
    id: "wd-sla-hours", label: "提領處理時效", unit: "hours", kind: "info", better: "lower",
    hint: "段位越高，提領/兌獎的預計到帳時間越短。",
    // live 一列即 Dorados 實測值（L1 72h → L5 24h）；demo 為其寬鬆版
    byTier: { demo: [48, 36, 24, 12, 6], live: [72, 60, 48, 36, 24] }
  });
  register({
    id: "wd-cap-day", label: "每日提領上限", unit: "money", kind: "cap", period: "day", better: "higher",
    hint: "每日提領總額上限。**刻意全段位一致**——對標 Dorados「每日上限不分階」的設計決策：分階的是速度與長週期額度，不是把新手鎖在極低的日限。",
    byTier: { demo: [25000, 25000, 25000, 25000, 25000], live: [10000, 10000, 10000, 10000, 10000] }
  });
  register({
    id: "wd-cap-week", label: "每週提領上限", unit: "money", kind: "cap", period: "week", better: "higher",
    hint: "每週提領總額上限（對標 Kaasino 的三週期制：日／週／月各有一道）。",
    byTier: { demo: [50000, 62500, 75000, 87500, 100000], live: [20000, 25000, 30000, 35000, 40000] }
  });
  register({
    id: "wd-cap-month", label: "每月提領上限", unit: "money", kind: "cap", period: "month", better: "higher",
    hint: "每月（曆月）提領總額上限，隨段位提升。",
    byTier: { demo: [80000, 100000, 120000, 140000, 160000], live: [30000, 37500, 45000, 52500, 60000] }
  });
  register({
    id: "support-level", label: "客服層級", unit: "level", kind: "info", better: "higher",
    hint: "段位越高，客服響應層級越高（對標 BigPirate／Kaasino Prime 的專屬客戶經理、CoinsBack 的優先客服）。",
    byTier: { demo: [1, 1, 2, 2, 3], live: [1, 1, 1, 2, 3] },
    fmt: function (v) { return ["標準客服", "優先客服", "專屬客戶經理"][Math.max(0, Math.min(2, (v | 0) - 1))]; }
  });

  /* ===================== #74：紅利流水倍數＝第五個維度（條款軸）=====================
   * 【問題】`progress.js` 的 `WAGER_MULT` 是**扁平常數**（真站 8×／假站 1×），只分站別、
   *   完全不分段位，且是 module 級 `var`、載入期一次求值 ⇒ 鑽石與青銅的解鎖門檻一模一樣，
   *   而全站唯一的流水豁免 `badd(n,{wagerFree:true})` 是由「**來源**」決定（#33 cashback），
   *   從來不是由「**玩家段位**」決定。
   * 【三平台佐證】Jackpotter（VIP 專屬 wager-free／極低流水，並作為 VIP 賣點行銷）、
   *   2026-08 crypto 榜通則（「loyalty bonuses include … lower wagering requirements」）、
   *   BetPanda（反例：80× 流水／7 天到期＝流水條款本身就是產品）。
   * 【為何掛在本檔而非 progress.js】本卡就是「VIP 決定條款」這條軸的下一個維度，
   *   而本檔已是該軸的註冊表且有 node 契約（progress.js 是純瀏覽器檔、無 module.exports）
   *   ⇒ 數值與純函式在此（可機械驗證），progress.js 只在 `badd()` 求值一次。
   * 【經濟安全｜三個不變量，皆為常駐測項】
   *   (a) **已建立的 entry 其 `req` 不得因段位變動而上調**——`badd()` 以**當下段位**求值並寫進
   *       entry，之後只讀 `e.req`（降段不追溯加重門檻＝信任問題的紅線）。
   *   (b) **真站成本中性**：live 一列的平均 ≥ 現行 8×（低階更嚴、頂階更鬆，平均不放水）。
   *   (c) **demo 不得比現況更嚴**：假站現為 1× 扁平 ⇒ 任一段位不得 > 1×（既有玩家零退步）。
   * 【不增送幣量】本維度只改「**多久能拿到**」，不改「**拿多少**」——與 §11 真金前收斂相容。 */
  register({
    id: "bonus-wager-mult", label: "紅利流水倍數", unit: "mult", kind: "info", better: "lower",
    hint: "紅利入帳後需累積的有效押注倍數（req = 紅利額 × 倍數）。段位越高倍數越低＝同一筆獎金更早解鎖；金額不變，只是拿到得更快。",
    byTier: { demo: [1, 1, 1, 0.75, 0.5], live: [10, 9, 8, 7, 6] },
    fmt: function (v) { return v + "×"; }
  });
  var LEGACY_MULT = { demo: 1, live: 8 };     // 改制前的扁平常數（成本中性線的基準，勿改）
  function bonusWagerMult(tier, mode) {
    var v = valueFor("bonus-wager-mult", tier, mode);
    return v == null ? LEGACY_MULT[modeKey(mode)] : v;     // 維度被移除也只退回舊制，不當機
  }
  /* 紅利的流水要求（唯一求值出口）。`badd()` 在建立 entry 時呼叫一次、把結果寫死進 entry。
   * 一律取整（0.75×／0.5× 會產生小數；req 是要顯示給玩家的金額語意）；
   * 且**金額 ≥ 1 時 req 必 ≥ 1**（倍數不得因取整變成「零流水」的後門）。 */
  function bonusReqFor(amount, tier, mode) {
    amount = Math.max(0, Math.round(amount || 0));
    if (amount <= 0) return 0;
    return Math.max(1, Math.round(amount * bonusWagerMult(tier, mode)));
  }

  var CORE = {
    DIMS: DIMS, TIERS: TIERS, register: register, dimOf: dimOf, caps: caps,
    valueFor: valueFor, tierIdx: tierIdx, blank: blank, rollover: rollover,
    addUsage: addUsage, remainingOf: remainingOf, evaluate: evaluate,
    dayOf: dayOf, weekOf: weekOf, monthOf: monthOf,
    bonusWagerMult: bonusWagerMult, bonusReqFor: bonusReqFor, LEGACY_MULT: LEGACY_MULT
  };

  /* ===================== 測項（node + 瀏覽器共用同一份純函式）===================== */
  function registerTests(st) {
    if (!st || !st.register) return;
    var T0 = 1700000000000;          // 固定基準時刻（決定性：不用 Date.now）
    var MODES = ["demo", "live"];

    st.register({
      id: "sla/monotone-service", group: "sla", title: "服務水準隨段位單調不變差（時效不變長、額度不變小）", env: "both",
      run: function (t) {
        t.ok(CORE.DIMS.length >= 4, "維度表至少應有 4 筆，實際 " + CORE.DIMS.length);
        CORE.DIMS.forEach(function (d) {
          MODES.forEach(function (mode) {
            var row = d.byTier[mode === "live" ? "live" : "demo"];
            t.equal(row.length, CORE.TIERS, d.id + "/" + mode + " 應涵蓋 " + CORE.TIERS + " 個段位");
            for (var i = 1; i < row.length; i++) {
              if (d.better === "lower") {
                t.ok(row[i] <= row[i - 1], d.id + "/" + mode + " 第 " + i + " 階 " + row[i] + " 不得比前階 " + row[i - 1] + " 更差（越低越好）");
              } else {
                t.ok(row[i] >= row[i - 1], d.id + "/" + mode + " 第 " + i + " 階 " + row[i] + " 不得比前階 " + row[i - 1] + " 更差（越高越好）");
              }
            }
          });
        });
      }
    });

    st.register({
      id: "sla/daily-cap-uniform", group: "sla", title: "每日提領上限刻意全段位一致（Dorados 設計決策，勿悄悄分階）", env: "both",
      run: function (t) {
        MODES.forEach(function (mode) {
          var row = CORE.dimOf("wd-cap-day").byTier[mode === "live" ? "live" : "demo"];
          for (var i = 1; i < row.length; i++) {
            t.equal(row[i], row[0], mode + " 每日上限第 " + i + " 階應與最低階相同（分階的是速度與長週期額度）");
          }
        });
      }
    });

    st.register({
      id: "sla/period-ordering", group: "sla", title: "同段位下 日上限 ≤ 週上限 ≤ 月上限（額度階梯不得倒掛）", env: "both",
      run: function (t) {
        MODES.forEach(function (mode) {
          for (var i = 0; i < CORE.TIERS; i++) {
            var d = CORE.valueFor("wd-cap-day", i, mode),
                w = CORE.valueFor("wd-cap-week", i, mode),
                mo = CORE.valueFor("wd-cap-month", i, mode);
            t.ok(d <= w, mode + " 第 " + i + " 階：日上限 " + d + " 不得高於週上限 " + w);
            t.ok(w <= mo, mode + " 第 " + i + " 階：週上限 " + w + " 不得高於月上限 " + mo);
          }
        });
      }
    });

    st.register({
      id: "sla/live-not-looser", group: "sla", title: "真站在任一維度都不比假站寬鬆（§11 經濟安全）", env: "both",
      run: function (t) {
        CORE.DIMS.forEach(function (d) {
          for (var i = 0; i < CORE.TIERS; i++) {
            var dv = d.byTier.demo[i], lv = d.byTier.live[i];
            if (d.better === "lower") t.ok(lv >= dv, d.id + " 第 " + i + " 階：真站 " + lv + " 不得比假站 " + dv + " 更短/更優");
            else t.ok(lv <= dv, d.id + " 第 " + i + " 階：真站 " + lv + " 不得比假站 " + dv + " 更寬鬆");
          }
        });
      }
    });

    st.register({
      id: "sla/cap-gate", group: "sla", title: "額度閘邊界：恰好等於剩餘放行、+1 擋下、由最短週期先報", env: "both",
      run: function (t) {
        var mode = "live", tier = 0;
        var dayCap = CORE.valueFor("wd-cap-day", tier, mode);
        var u = CORE.blank(T0);
        t.equal(CORE.evaluate(u, dayCap, tier, mode, T0).ok, true, "恰好等於日上限應放行");
        var over = CORE.evaluate(u, dayCap + 1, tier, mode, T0);
        t.equal(over.ok, false, "超過日上限 1 元應擋下");
        t.equal(over.id, "wd-cap-day", "應由最短週期（日）先報，實際 " + over.id);
        t.equal(over.remaining, dayCap, "剩餘額度應等於日上限（尚未提領）");
        // 用掉日額度後，同一日再提任何金額都應被日限擋（週/月仍有餘裕）
        u = CORE.addUsage(u, dayCap, T0);
        var blocked = CORE.evaluate(u, 1, tier, mode, T0);
        t.equal(blocked.ok, false, "當日額度用盡後應擋下");
        t.equal(blocked.remaining, 0, "剩餘應為 0");
        // 跨到隔日：日限重置，但週限仍累計 ⇒ 若週剩餘不足應改由週限報
        var weekCap = CORE.valueFor("wd-cap-week", tier, mode);
        var u2 = CORE.blank(T0);
        u2 = CORE.addUsage(u2, weekCap, T0);                       // 本週已提滿
        var nextDay = T0 + DAY;
        var byWeek = CORE.evaluate(u2, 1, tier, mode, nextDay);
        t.equal(byWeek.ok, false, "隔日日限已重置，但週限已滿仍應擋下");
        t.equal(byWeek.id, "wd-cap-week", "應由週限報，實際 " + byWeek.id);
        t.equal(CORE.evaluate(u2, 0, tier, mode, nextDay).ok, true, "金額 0 應恆真（零回歸）");
      }
    });

    st.register({
      id: "sla/period-rollover", group: "sla", title: "跨日只清日、跨週清日+週、跨月三者皆清", env: "both",
      run: function (t) {
        // 起點對齊到「週的第 3 天」＝機械保證 base 與 base+DAY 落在同一週。
        //   （首版寫成 `base = T0 + DAY` 並用 `A || weekOf(base)!==weekOf(base+DAY)` 兜底，
        //    結果該起點恰跨週 ⇒ 斷言永遠被 or 的右半救活＝空殼；負向驗證⑤當場抓到，故改為無退路的寫法。）
        var base = CORE.weekOf(T0) * WEEK + 2 * DAY;
        t.equal(CORE.weekOf(base), CORE.weekOf(base + DAY), "測項前提：base 與隔日必須同週");
        var u = CORE.addUsage(CORE.blank(base), 1000, base);
        var d1 = CORE.rollover(JSON.parse(JSON.stringify(u)), base + DAY);
        t.equal(d1.used.day, 0, "跨日後日累計應歸零");
        t.equal(d1.used.week, 1000, "同週內跨日不得清掉週累計（否則玩家可用跨日繞過週限）");
        var w1 = CORE.rollover(JSON.parse(JSON.stringify(u)), base + WEEK);
        t.equal(w1.used.day, 0, "跨週後日累計應歸零");
        t.equal(w1.used.week, 0, "跨週後週累計應歸零");
        var m1 = CORE.rollover(JSON.parse(JSON.stringify(u)), base + 45 * DAY);
        t.equal(m1.used.month, 0, "跨月後月累計應歸零");
        // 累計為三期同時記帳（同一筆提領同時吃掉日/週/月額度）
        t.equal(u.used.day, 1000, "同一筆提領應計入日");
        t.equal(u.used.week, 1000, "同一筆提領應計入週");
        t.equal(u.used.month, 1000, "同一筆提領應計入月");
      }
    });

    st.register({
      id: "sla/zero-regression", group: "sla", title: "未知段位夾住、無 cap 維度時閘恆真（漏傳只退化不出錯）", env: "both",
      run: function (t) {
        var top = CORE.TIERS - 1;
        ["demo", "live"].forEach(function (mode) {
          t.equal(CORE.valueFor("wd-cap-day", 999, mode), CORE.valueFor("wd-cap-day", top, mode), mode + " 越界段位應夾到最高階");
          t.equal(CORE.valueFor("wd-cap-day", -5, mode), CORE.valueFor("wd-cap-day", 0, mode), mode + " 負段位應夾到最低階");
          t.equal(CORE.valueFor("wd-cap-day", null, mode), CORE.valueFor("wd-cap-day", 0, mode), mode + " 未傳段位應夾到最低階");
        });
        t.equal(CORE.valueFor("no-such-dim", 0, "demo"), null, "未註冊維度應回 null");
        // 註冊表本身：同 id 覆蓋、兩站別長度不符應被拒
        var before = CORE.DIMS.length;
        t.equal(CORE.register({ id: "__probe", label: "測試", kind: "info", byTier: { demo: [1], live: [1, 2] } }), null,
          "兩站別長度不符的 spec 應被拒");
        t.equal(CORE.DIMS.length, before, "被拒的 spec 不得進表");
        CORE.register({ id: "__probe", label: "測試", kind: "info", better: "higher", byTier: { demo: [1, 1, 1, 1, 1], live: [1, 1, 1, 1, 1] } });
        t.equal(CORE.DIMS.length, before + 1, "合法 spec 應進表");
        CORE.register({ id: "__probe", label: "測試2", kind: "info", better: "higher", byTier: { demo: [2, 2, 2, 2, 2], live: [1, 1, 1, 1, 1] } });
        t.equal(CORE.DIMS.length, before + 1, "同 id 應覆蓋而非重複");
        t.equal(CORE.dimOf("__probe").label, "測試2", "覆蓋後應為新 spec");
        CORE.DIMS.splice(before, 1);   // 清掉探針，勿汙染其他測項
        t.equal(CORE.DIMS.length, before, "探針已移除");
      }
    });

    /* #74 不變量 (b)(c)：真站成本中性 + 假站零退步。
       這兩條是本卡「不增送幣量」承諾的機械證明——單調性與「真站不比假站寬鬆」已由上面兩個
       通用測項涵蓋，此處補的是**與改制前扁平常數的對照**（那是通用測項看不到的）。 */
    st.register({
      id: "sla/bonus-wager-cost-neutral", group: "sla",
      title: "紅利流水倍數：真站平均 ≥ 改制前 8×（成本中性）、假站任一段位 ≤ 1×（既有玩家零退步）", env: "both",
      run: function (t) {
        var d = CORE.dimOf("bonus-wager-mult");
        t.ok(!!d, "bonus-wager-mult 維度應存在");
        var live = d.byTier.live, demo = d.byTier.demo;
        var mean = live.reduce(function (a, b) { return a + b; }, 0) / live.length;
        t.ok(mean >= CORE.LEGACY_MULT.live,
          "真站各段位平均倍數 " + mean + " 不得低於改制前扁平 " + CORE.LEGACY_MULT.live + "×（否則等於整體放水）");
        for (var i = 0; i < CORE.TIERS; i++) {
          t.ok(demo[i] <= CORE.LEGACY_MULT.demo,
            "假站第 " + i + " 階 " + demo[i] + "× 不得高於改制前 " + CORE.LEGACY_MULT.demo + "×（既有玩家門檻不得變嚴）");
          t.ok(live[i] > 0 && demo[i] > 0,
            "第 " + i + " 階倍數不得為 0（0× ＝依段位的零流水後門，wagerFree 只該由『來源』決定）");
        }
      }
    });

    st.register({
      id: "sla/bonus-req", group: "sla",
      title: "紅利流水要求：段位越高越低、金額 ≥1 時 req ≥1、金額 0 回 0", env: "both",
      run: function (t) {
        ["demo", "live"].forEach(function (mode) {
          var prev = Infinity;
          for (var i = 0; i < CORE.TIERS; i++) {
            var r = CORE.bonusReqFor(1000, i, mode);
            t.ok(r <= prev, mode + " 第 " + i + " 階 req " + r + " 不得高於前階 " + prev + "（越高階越早解鎖）");
            prev = r;
            t.ok(CORE.bonusReqFor(1, i, mode) >= 1, mode + " 第 " + i + " 階：1 元紅利的 req 不得取整成 0");
          }
          t.equal(CORE.bonusReqFor(0, 0, mode), 0, mode + " 金額 0 應回 req 0");
          t.equal(CORE.bonusReqFor(-5, 0, mode), 0, mode + " 負金額應回 req 0");
        });
        // 維度被移除時退回舊制常數（只退化、不當機）
        t.equal(CORE.bonusWagerMult(0, "live"), CORE.valueFor("bonus-wager-mult", 0, "live"), "應取自維度表");
        t.equal(CORE.bonusReqFor(100, 0, "live"), Math.round(100 * CORE.valueFor("bonus-wager-mult", 0, "live")),
          "req 應恰為 金額 × 該段位倍數");
      }
    });

    if (isNode) return;

    st.register({
      id: "sla/wired", group: "sla", title: "提款流程確實接上 HL.sla 閘、VIP 面板可開服務水準表", env: "browser",
      run: function (t) {
        t.isFn(HL && HL.sla && HL.sla.check, "HL.sla.check 應存在");
        t.isFn(HL && HL.sla && HL.sla.open, "HL.sla.open 應存在");
        t.isFn(HL && HL.vip && HL.vip.open, "VIP 面板應存在");
        t.ok(/HL\.sla/.test(String(HL.vip.open)), "VIP 面板原始碼應引用 HL.sla（服務水準入口）");
        // 帳目不變：本檔只擋/只顯示，不得自行動餘額或帳本
        t.ok(!/HL\.ledger|state\.set/.test(String(HL.sla.check)), "check() 不得碰帳本或餘額");
      }
    });

    /* #74 不變量 (a)：**已建立的 entry 其 `req` 不得被重算**。
       這條是結構性的（badd 求值一次、寫進 entry；之後只讀 `e.req`），故用「誰引用了求值出口」
       來鎖——若哪天有人把流水要求改成「每次比對時依當下段位重算」，降段就會追溯加重門檻，
       本測項會立刻紅。（比照 progress-src 的 `grant 不得碰 HL.bonus` 同型架構鎖。） */
    st.register({
      id: "sla/bonus-wager-frozen", group: "sla",
      title: "紅利流水要求只在建立時求值一次（推進/查詢不得依當下段位重算）", env: "browser",
      run: function (t) {
        t.isFn(HL.sla.bonusReqFor, "HL.sla.bonusReqFor 應存在（唯一求值出口）");
        t.ok(/reqFor\(/.test(String(HL.bonus.add)), "HL.bonus.add 應以求值出口 reqFor() 建立 req（不得再用扁平常數）");
        t.ok(!/reqFor|WAGER_MULT/.test(String(HL.bonus.onWager)),
          "HL.bonus.onWager 不得重算 req（只能讀 entry 上寫死的 req）");
        t.ok(!/reqFor|WAGER_MULT/.test(String(HL.bonus.status)),
          "HL.bonus.status 不得重算 req（顯示的必須是建立時寫死的值）");
      }
    });

    /* 「面板型出口必有一條『實際開一次』的測項」（2026-08-06 平台軌 P0 事故的通則）：
       本卡在 VIP 福利矩陣新增一欄，故直接開面板數欄位。 */
    st.register({
      id: "sla/bonus-wager-in-matrix", group: "sla",
      title: "VIP 福利矩陣確實多出「紅利流水」欄且每段位皆有倍數值", env: "browser",
      run: function (t) {
        var threw = null;
        try { HL.vip.open(); } catch (e) { threw = e.message; }
        t.ok(threw === null, "HL.vip.open() 不得拋錯，實際：" + threw);
        var m = document.querySelector(".ax-modal");
        t.ok(!!m, "VIP 面板應渲染出 modal");
        var head = m ? m.querySelector(".ax-vipmx__head") : null;
        t.ok(!!head && head.children.length === 5, "福利矩陣表頭應為 5 欄（等級/經驗/返水/升級獎金/紅利流水），實際 " + (head ? head.children.length : 0));
        var mults = m ? (m.innerText.match(/[\d.]+×/g) || []) : [];
        t.ok(mults.length >= CORE.TIERS, "每段位皆應渲染倍數（≥" + CORE.TIERS + " 筆），實際 " + mults.length + "：" + mults.join(","));
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
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }

  function mode() { return (HL.site && HL.site.isLive && HL.site.isLive()) ? "live" : "demo"; }
  function tier() { return (HL.vip && HL.vip.status) ? (HL.vip.status().index || 0) : 0; }
  function load() { return rollover(HL.dom.lsGet(KEY, null) || blank(Date.now()), Date.now()); }
  function save(u) { HL.dom.lsSet(KEY, u); }

  function valueOf(id) { return valueFor(id, tier(), mode()); }
  function remaining(id) {
    var d = dimOf(id); if (!d || d.kind !== "cap") return null;
    return remainingOf(d, load(), tier(), mode(), Date.now());
  }

  /* 閘：提款送出前呼叫。回 true＝放行；false＝已 toast 說明原因並擋下。 */
  function check(amount) {
    var r = evaluate(load(), amount, tier(), mode(), Date.now());
    if (r.ok) return true;
    if (HL.ui && HL.ui.toast) {
      HL.ui.toast(t(r.label, r.label) + " " + money(r.cap) + " · " +
        t("本期剩餘額度", "本期剩餘額度") + " " + money(r.remaining), "warn");
    }
    return false;
  }
  /* 提款成功後呼叫：同一筆同時計入日/週/月三個桶。 */
  function record(amount) { save(addUsage(load(), amount, Date.now())); }

  function fmtValue(d, v) {
    if (d.fmt) return t(d.fmt(v), d.fmt(v));
    if (d.unit === "money") return money(v);
    return String(v);
  }
  // 「值 + 單位」一律拆成獨立節點（P3 契約：整個文字節點須等於一條字典 key 才翻得到）
  function valueNode(d, v) {
    if (d.unit === "hours") {
      return el("b", { class: "ax-gold" }, [
        document.createTextNode(String(v) + " "), el("span", { text: t("小時", "小時") })
      ]);
    }
    return el("b", { class: "ax-gold", text: fmtValue(d, v) });
  }

  function dimRow(d, cur) {
    var v = valueFor(d.id, cur, mode());
    var kids = [el("span", { text: t(d.label, d.label) }), valueNode(d, v)];
    if (d.kind === "cap") {
      var rem = remaining(d.id);
      kids.push(el("small", { class: "ax-muted" }, [
        el("span", { text: t("本期剩餘額度", "本期剩餘額度") }), document.createTextNode(" " + money(rem))
      ]));
    }
    return el("div", { class: "ax-kv", style: "align-items:center;gap:8px" }, kids);
  }

  // 各段位對照表（唯讀說明；比照 #50 HL.edge.open 的風格與定位）
  function matrix(cur) {
    var NAMES = [["🥉", "青銅"], ["🥈", "白銀"], ["🥇", "黃金"], ["💠", "白金"], ["💎", "鑽石"]];
    var rows = NAMES.map(function (n, i) {
      var cells = DIMS.map(function (d) {
        var v = valueFor(d.id, i, mode());
        var txt = d.unit === "hours" ? (v + "h") : (d.unit === "money" ? money(v) : fmtValue(d, v));
        return el("span", { class: i === cur ? "ax-gold" : "ax-muted", text: txt });
      });
      // 段位名走既有字典 key「🥉 青銅」等（含 emoji），「（目前）」另成節點——
      //   串接成一個文字節點就會不等於任何 key ⇒ 永遠翻不到（P3 契約）。
      var name = el("span", {}, [
        el("span", { text: n[0] + " " + n[1] }),
        i === cur ? el("span", { text: "（目前）" }) : null
      ]);
      return el("div", { class: "ax-kv" + (i === cur ? " ax-vip__cur" : ""), style: "gap:6px;flex-wrap:wrap" },
        [name].concat(cells));
    });
    return el("div", {}, rows);
  }

  function open() {
    var cur = tier(), live = mode() === "live";
    var body = [
      el("div", { class: "ax-panel" }, [
        el("p", { class: "ax-muted", style: "margin:0 0 8px",
          text: t("VIP 不只決定拿多少獎金，也決定「拿錢這件事」的服務水準：提領處理時效、各週期額度上限與客服層級皆隨段位提升。",
                  "VIP 不只決定拿多少獎金，也決定「拿錢這件事」的服務水準：提領處理時效、各週期額度上限與客服層級皆隨段位提升。") })
      ].concat(DIMS.map(function (d) { return dimRow(d, cur); }))),
      el("div", { class: "ax-panel" }, [
        el("small", { class: "ax-muted", text: t("各段位服務水準一覽", "各段位服務水準一覽") }),
        matrix(cur),
        el("p", { class: "ax-muted", style: "margin:8px 0 0",
          text: t("每日提領上限刻意全段位一致——分階的是處理速度與長週期額度，不把新手鎖在極低的日限。",
                  "每日提領上限刻意全段位一致——分階的是處理速度與長週期額度，不把新手鎖在極低的日限。") }),
        // #74：新維度不屬「拿錢」而屬「條款」，故單獨說明一句（沿用既有段落樣式、不改既有已譯文案）
        el("p", { class: "ax-muted", style: "margin:6px 0 0",
          text: t("紅利流水倍數同屬服務水準：段位越高，同一筆獎金越早解鎖——金額完全不變，只是拿到得更快。",
                  "紅利流水倍數同屬服務水準：段位越高，同一筆獎金越早解鎖——金額完全不變，只是拿到得更快。") }),
        el("p", { class: "ax-muted", style: "margin:6px 0 0",
          text: live ? t("真站保守模式：額度較緊、時效較長。", "真站保守模式：額度較緊、時效較長。")
                     : t("假站寬鬆模式：額度較寬、時效較短。", "假站寬鬆模式：額度較寬、時效較短。") })
      ]),
      el("span", { class: "ax-demo-tag", text: t("提領時效為預估值 · 額度依段位 · Demo", "提領時效為預估值 · 額度依段位 · Demo") })
    ];
    HL.ui.modal(t("🚚 服務水準", "🚚 服務水準"), body, { wide: true });
  }

  HL.sla = {
    check: check, record: record, remaining: remaining, valueOf: valueOf,
    tier: tier, mode: mode, open: open, dims: function () { return DIMS.slice(); },
    // 純函式再匯出（供瀏覽器端測項與其他模組取用，語意與 node 完全同一份）
    valueFor: valueFor, evaluate: evaluate, remainingOf: remainingOf, blank: blank, rollover: rollover,
    addUsage: addUsage, dimOf: dimOf, caps: caps, register: register, TIERS: TIERS,
    // #74：紅利流水倍數。省略 tier/mode ＝取「當下段位 × 當前站別」（progress.js `badd()` 的用法）；
    //   顯式傳入則走純函式（測項與說明表用）。兩者是同一份 CORE 邏輯。
    bonusWagerMult: function (tierArg, modeArg) {
      return bonusWagerMult(tierArg == null ? tier() : tierArg, modeArg || mode());
    },
    bonusReqFor: function (amount, tierArg, modeArg) {
      return bonusReqFor(amount, tierArg == null ? tier() : tierArg, modeArg || mode());
    }
  };

  /* #72 說明中心：提領時效與分階額度由本模組自己解釋（數字讀 DIMS/valueOf 當下值，不手抄）。 */
  if (HL.support && HL.support.register) {
    HL.support.register({
      id: "sla/withdraw", cat: "payment", order: 10,
      title: "提款要多久？單次／每日的額度上限是多少？",
      keys: ["withdraw", "提款", "提領", "額度", "上限", "時效", "多久"],
      body: function () {
        var ti = tier(), tn = (TIERS[ti] && (TIERS[ti].label || TIERS[ti].name)) || ("第 " + ti + " 階");
        var parts = (caps() || []).map(function (d) {
          var v = valueOf(d.id);
          return (d.label || d.id) + "：" + (v == null ? "不限" : v);
        });
        return "提款額度依你的 VIP 段位分階，你目前為「" + tn + "」。"
             + (parts.length ? "當前額度—— " + parts.join("；") + "。" : "")
             + "額度以日／週／月為單位滾動重置；超出時會直接說明「超出你這一階的額度」"
             + "，不是送人工審核。實際到帳時間亦依段位不同，詳見服務層級面板。";
      },
      action: { label: "查看我的服務層級", run: function () { open(); } }
    });
    /* `when()` 的真實用例：這條只在假站（Demo）成立，真站不該顯示。
     * 述詞為 false 時**面板與搜尋兩處都不出現**（只藏其一等於沒藏）。 */
    HL.support.register({
      id: "sla/demo-notice", cat: "payment", order: 1,
      title: "我可以在這裡真的儲值或提款嗎？",
      keys: ["deposit", "儲值", "充值", "存款", "提款", "真錢", "demo"],
      when: function () { return !(HL.site && HL.site.isLive && HL.site.isLive()); },
      body: function () {
        return "目前為 Demo（假站）模式：所有金額、儲值與提款流程皆為體驗用途，"
             + "不涉及任何真實資金，也不會產生真實付款。切換到真站後才會套用真實的金流規則。";
      }
    });
  }

  registerTests(HL.selftest);
})(typeof window !== "undefined" ? window : this);

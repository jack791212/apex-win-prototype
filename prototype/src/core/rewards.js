/*
 * Apex Win｜每日簽到 / 獎勵中心（#34 遞增連登階梯 + 里程碑日 · #76 揭曉層）
 * 純前端、localStorage 持久化。連續簽到 streak，每日領一次遊戲幣（休閒模式）。
 * #34（對標 Crown Coins 7 天遞增+里程碑 / Stake.us 31 天連登包 / SpinBlitz escalating）：
 *   把原「平 7 天循環」升級為 30 天**逐日遞增階梯**（連越久單日獎越大），並在第 8/15/22/30 天
 *   疊加**里程碑大禮**。日獎進主餘額（同原行為＝遊戲幣），里程碑大禮進獎金錢包 HL.bonus。
 *   斷簽歸零（streak 回 1）；第 30 天後日獎 plateau、不再觸發里程碑（旅程完成）。
 * 保留 status().claimedToday 等既有欄位（#28 新手窗口依賴）。status()/claim()/open()。註冊於 window.HL.rewards。
 *
 * ── #76 每日獎「揭曉化」（對標 Legendz Daily Drop＝Plinko 式掉落 + GoKong 爪機 Bonus Crab）─────
 * 【這張卡為何能做，而 08-05 zonko 那輪刻意沒做】
 *   當時的否決理由是「會動到送幣期望值與帳本成本歸屬」。本層把約束寫成**恆等式**即消除該理由：
 *   揭曉的權重分布**必須**滿足 `Σ(pᵢ · prizeᵢ) == ladderReward(day)`（同一天期望值逐位相等）
 *   ⇒ **純呈現改造、零經濟變動**，帳本 `bonus` 成本歸屬與長期送幣總量完全不變。
 *
 * 【怎麼做到「逐位相等」而不靠四捨五入｜全整數算術】
 *   關鍵觀察：LADDER 全部是 **50 的倍數** ⇒ 必為 10 的倍數 ⇒ 可取整數單位 `u = R / 10`。
 *   把每檔獎額寫成 `cᵢ × u`（cᵢ 為整數），權重 wᵢ 為整數（分母 REVEAL_W = 100），則恆等式化為
 *   **純整數等式** `Σ(wᵢ · cᵢ) == 10 × REVEAL_W == 1000`——與 R 無關、對 30 天全部成立。
 *   實際配置：35%×0.6 + 30%×0.9 + 25%×1.2 + 8%×2.0 + 2%×3.0
 *             ⇒ 35·6 + 30·9 + 25·12 + 8·20 + 2·30 = 210+270+300+160+60 = **1000** ✓
 *   ⇒ 期望值 = 1000·u / 100 = 10u = R（**精確**，無浮點誤差、無殘差配額）。
 *
 * 【刻意的邊界（皆為卡上要求的不變量，且都有常駐測項）】
 *   · 最小檔 0.6× > 0——**簽到給 0 是體驗禁區**（見 capyspin「餘額低時彈窗沒完沒了」那類反面教材）。
 *   · 最大檔恰 3.0×——卡上明訂「尾巴檔不得超過當日值的 3 倍」，避免第 1 天就給出第 30 天的量級。
 *   · **真站/假站共用同一份分布**＝本卡不引入任何站別差異、沒有新的經濟旋鈕（與 #65/#74 的站別軸無關）。
 *   · **可關**：`setReveal(false)` 即逐位退回改版前的固定值行為（`revealOn()` 為單一判斷出口）。
 *
 * 【誠實呈現（不可省）】
 *   階梯格與按鈕仍以 `ladderReward(day)` 為準，但揭曉開啟時**必須標示那是平均值**——否則玩家看到
 *   「+1500」卻抽中 0.6×＝900，會（正確地）覺得被騙。UI 因此多一行說明，與恆等式互為表裡。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  var KEY = "HL_REWARDS";
  var KEY_REVEAL = "HL_CHECKIN_REVEAL";
  var KEY_GRACE = "HL_CHECKIN_GRACE";   // #84 容錯用量 { used:{specId:n}, marks:[被保住的連登日] }
  // 30 天逐日遞增日獎（遊戲幣，入主餘額）；第 7 天 1500 對齊原循環峰值，續攀至第 30 天
  var LADDER = [
    100, 200, 350, 550, 800, 1100, 1500,
    1700, 1950, 2250, 2600, 3000, 3450, 3950,
    4400, 4950, 5550, 6200, 6900, 7650, 8450,
    8900, 9800, 10750, 11750, 12800, 13900, 15050, 16250, 17500
  ];
  var LADDER_LEN = LADDER.length;                          // 30
  // 里程碑大禮（額外入獎金錢包 HL.bonus，僅於「當前連登恰為此日」觸發）
  var MILESTONES = { 8: 3000, 15: 8000, 22: 15000, 30: 50000 };

  function ladderReward(streakDay) { return LADDER[Math.min(streakDay, LADDER_LEN) - 1]; } // 第 30 天後 plateau
  function milestoneOf(streakDay) { return MILESTONES[streakDay] || 0; }                    // 僅精確里程碑日

  /* ===================== #76 揭曉層：純數學區（node 可測） ===================== */
  var REVEAL_W = 100;    // 權重分母（wᵢ 之和）
  var UNIT_DIV = 10;     // 單位 u = R / UNIT_DIV（LADDER 全為 50 的倍數 ⇒ 恆可整除）
  var REVEAL_DEFAULT = true;
  // wᵢ＝權重（整數，和 = REVEAL_W）；cᵢ＝獎額為 cᵢ×u（即 cᵢ/UNIT_DIV 倍當日值）
  var REVEAL_TIERS = [
    { w: 35, c: 6 },    // 0.6×
    { w: 30, c: 9 },    // 0.9×
    { w: 25, c: 12 },   // 1.2×
    { w: 8, c: 20 },   // 2.0×
    { w: 2, c: 30 }    // 3.0×
  ];

  // 當日揭曉方案；R 不可被 UNIT_DIV 整除時回 null＝**安全退回固定值**（不硬湊、不四捨五入）
  function revealPlan(day) {
    var R = ladderReward(day);
    if (!R || R % UNIT_DIV !== 0) return null;
    var u = R / UNIT_DIV;
    var out = [];
    for (var i = 0; i < REVEAL_TIERS.length; i++) {
      out.push({
        w: REVEAL_TIERS[i].w,
        p: REVEAL_TIERS[i].w / REVEAL_W,
        mult: REVEAL_TIERS[i].c / UNIT_DIV,
        prize: REVEAL_TIERS[i].c * u
      });
    }
    return out;
  }

  // 期望值（整數加總後才除，避免逐項浮點累積誤差）
  function revealEV(day) {
    var plan = revealPlan(day);
    if (!plan) return ladderReward(day);
    var s = 0;
    for (var i = 0; i < plan.length; i++) s += plan[i].w * plan[i].prize;
    return s / REVEAL_W;
  }

  // 依 r∈[0,1) 加權抽一檔（純函式＝可決定性測試；瀏覽器端傳 HL.fair 的隨機值進來）
  function pickReveal(day, r) {
    var plan = revealPlan(day);
    if (!plan) return null;
    var x = (typeof r === "number" && r >= 0 && r < 1 ? r : 0) * REVEAL_W;
    var acc = 0;
    for (var i = 0; i < plan.length; i++) {
      acc += plan[i].w;
      if (x < acc) return plan[i];
    }
    return plan[plan.length - 1];
  }

  /* ===================== #84 連簽容錯（streak grace）：純數學區（node 可測） =====================
   * 【病灶】斷簽即 streak 歸零，而里程碑（`milestoneOf`）**只在精確**連續第 8/15/22/30 天觸發
   *   ⇒ 第 3 天漏簽的新手必須從第 1 天重新連滿 8 天，而第 6–8 天正是流失懸崖（zonko 07-02 記）。
   * 【形制】容錯做成 **config 化 spec 表**（比照 #67 `HL.rg` 的限額型別註冊表：新增一種容錯＝加一筆
   *   spec，判斷路徑與面板零改動），不硬寫死「新手前 14 天送 2 次」。
   * 【為何不新增送幣來源】容錯**不補發**漏掉那天的日獎，只保住 streak——每個日曆日仍然只能領一次，
   *   故它不創造新的領取事件，只改變「這一次領取落在階梯的哪一階」。
   */
  // grants：終身可動用次數（**站別分開；真站 ≤ 假站**＝成本中性紀律，同 #60/#65/#74）
  // scope.maxProtectedDay：只有「被保住的那個連登日」≤ 此值才可動用＝把成本鎖在 FTUE 段
  // refill：'never'（首版）｜'season'（需接 #46 賽季邊界，留待後續；未實作故不登記）
  var GRACE_SPECS = [
    { id: "ftue", label: "新手連簽容錯", icon: "🛟", grants: { demo: 2, live: 0 }, scope: { maxProtectedDay: 8 }, refill: "never" }
  ];
  var GRACE_GAP = 2;   // **只有「恰好漏 1 天」可動用**（today − lastDay === 2）

  function graceSpec(id) {
    for (var i = 0; i < GRACE_SPECS.length; i++) if (GRACE_SPECS[i].id === id) return GRACE_SPECS[i];
    return null;
  }
  // 該站別的終身容錯次數（未知站別一律回真站值＝保守）
  function graceGrantsOf(id, live) {
    var sp = graceSpec(id);
    if (!sp) return 0;
    return Math.max(0, (live ? sp.grants.live : sp.grants.demo) | 0);
  }

  /* nextStreakOf(gap, streak, graceLeft, maxProtectedDay) → { streak, usedGrace }
   *   gap ＝ today − lastDay（從未簽到者傳 Infinity/null）。把「今天算第幾天連登」收斂成純函式。
   *   gap === 0        今天已領 → 連登數不動
   *   gap === 1        昨天有領 → 正常續連
   *   gap === 2        **恰好漏 1 天** → 有容錯且 scope 允許則續連並消耗一次；否則歸 1
   *   gap >= 3         連續漏 ≥2 天 → **一律歸 1**（卡上不變量 (d)：容錯不得累積成無限展期）
   * ⚠️ graceLeft === 0 時本函式**逐位等於**改版前的三分支邏輯＝零回歸的機械保證。
   */
  function nextStreakOf(gap, streak, graceLeft, maxProtectedDay) {
    var raw = streak || 0;
    if (gap === 0) return { streak: raw, usedGrace: false };
    if (gap === 1) return { streak: raw + 1, usedGrace: false };
    if (gap === GRACE_GAP && (graceLeft || 0) > 0 && (raw + 1) <= (maxProtectedDay || 0)) {
      return { streak: raw + 1, usedGrace: true };
    }
    return { streak: 1, usedGrace: false };
  }

  var CORE = {
    LADDER: LADDER, LADDER_LEN: LADDER_LEN, MILESTONES: MILESTONES,
    ladderReward: ladderReward, milestoneOf: milestoneOf,
    REVEAL_TIERS: REVEAL_TIERS, REVEAL_W: REVEAL_W, UNIT_DIV: UNIT_DIV, REVEAL_DEFAULT: REVEAL_DEFAULT,
    revealPlan: revealPlan, revealEV: revealEV, pickReveal: pickReveal,
    GRACE_SPECS: GRACE_SPECS, GRACE_GAP: GRACE_GAP,
    graceSpec: graceSpec, graceGrantsOf: graceGrantsOf, nextStreakOf: nextStreakOf
  };

  /* ===================== 測項（雙環境同一批） ===================== */
  function registerTests(st) {
    st.register({
      id: "rewards/reveal-ev-identity", group: "platform", tier: "fast",
      label: "#76 期望值恆等：∀day∈[1,30] Σ(p·prize) 與階梯值**逐位相等**（整數等式，非近似）",
      run: function (t) {
        for (var day = 1; day <= LADDER_LEN; day++) {
          var R = ladderReward(day);
          var plan = revealPlan(day);
          t.ok(!!plan, "第 " + day + " 天應有揭曉方案（R=" + R + " 可被 " + UNIT_DIV + " 整除）");
          var wsum = 0, acc = 0;
          for (var i = 0; i < plan.length; i++) { wsum += plan[i].w; acc += plan[i].w * plan[i].prize; }
          t.equal(wsum, REVEAL_W, "第 " + day + " 天權重和應恰為 " + REVEAL_W);
          // 整數等式：Σ(w·prize) 必須恰等於 R×REVEAL_W（浮點除法前先比整數）
          t.equal(acc, R * REVEAL_W, "第 " + day + " 天 Σ(w·prize) 應恰為 R×" + REVEAL_W + "（R=" + R + "）");
          t.equal(revealEV(day), R, "第 " + day + " 天期望值應恰等於階梯值 " + R);
        }
        // plateau 後（第 31 天起）仍成立
        t.equal(revealEV(31), ladderReward(31), "第 31 天（plateau）期望值仍應等於階梯值");
      }
    });
    st.register({
      id: "rewards/reveal-tier-bounds", group: "platform", tier: "fast",
      label: "#76 檔位邊界：最小檔 >0（簽到不得給 0）、最大檔 ≤3×當日值、獎額全為整數",
      run: function (t) {
        // 純資料層的結構不變量（與 day 無關）
        var wsum = 0;
        for (var i = 0; i < REVEAL_TIERS.length; i++) wsum += REVEAL_TIERS[i].w;
        t.equal(wsum, REVEAL_W, "REVEAL_TIERS 權重和應恰為 " + REVEAL_W);
        t.ok(REVEAL_TIERS.length >= 3 && REVEAL_TIERS.length <= 5, "檔數應為卡上要求的 3–5 檔（現 " + REVEAL_TIERS.length + "）");
        for (var day = 1; day <= LADDER_LEN; day++) {
          var R = ladderReward(day), plan = revealPlan(day);
          for (var j = 0; j < plan.length; j++) {
            t.ok(plan[j].prize > 0, "第 " + day + " 天第 " + (j + 1) + " 檔獎額必須 >0（0 ＝體驗禁區）");
            t.ok(plan[j].prize === Math.round(plan[j].prize), "第 " + day + " 天第 " + (j + 1) + " 檔獎額必須為整數");
            t.ok(plan[j].prize <= 3 * R, "第 " + day + " 天第 " + (j + 1) + " 檔獎額不得超過當日值 3 倍");
            t.ok(plan[j].w > 0, "第 " + day + " 天第 " + (j + 1) + " 檔權重必須 >0（權重 0 ＝永不出現的死檔）");
          }
          // 必須真的有「低於」與「高於」當日值的檔，否則揭曉毫無張力
          var lo = false, hi = false;
          for (var k = 0; k < plan.length; k++) { if (plan[k].prize < R) lo = true; if (plan[k].prize > R) hi = true; }
          t.ok(lo && hi, "第 " + day + " 天應同時存在低於與高於當日值的檔");
        }
      }
    });
    st.register({
      id: "rewards/reveal-pick-distribution", group: "platform", tier: "fast",
      label: "#76 加權抽取：r 掃過 [0,1) 的命中比例應恰為權重，且邊界值落在正確檔",
      run: function (t) {
        var day = 7, plan = revealPlan(day);
        // 邊界：r=0 落第一檔；r 趨近 1 落最後一檔
        t.equal(pickReveal(day, 0).prize, plan[0].prize, "r=0 應落第一檔");
        t.equal(pickReveal(day, 0.999999).prize, plan[plan.length - 1].prize, "r→1 應落最後一檔");
        // 累積邊界：權重 35/30/25/8/2 ⇒ 切點 .35 .65 .90 .98
        t.equal(pickReveal(day, 0.3499).prize, plan[0].prize, "r=0.3499 應仍落第一檔");
        t.equal(pickReveal(day, 0.35).prize, plan[1].prize, "r=0.35 應落第二檔（切點右閉）");
        t.equal(pickReveal(day, 0.9799).prize, plan[3].prize, "r=0.9799 應落第四檔");
        t.equal(pickReveal(day, 0.98).prize, plan[4].prize, "r=0.98 應落第五檔");
        // 掃描：每萬分之一取一點，命中數應等於權重×100
        var counts = [0, 0, 0, 0, 0];
        for (var n = 0; n < 10000; n++) {
          var got = pickReveal(day, n / 10000);
          for (var i = 0; i < plan.length; i++) if (plan[i].prize === got.prize) { counts[i]++; break; }
        }
        for (var j = 0; j < plan.length; j++) {
          t.equal(counts[j], plan[j].w * 100, "第 " + (j + 1) + " 檔命中數應恰為權重×100");
        }
        // 掃描所得的樣本平均也應等於階梯值（期望值恆等的第二種驗法）
        var sum = 0;
        for (var m = 0; m < 10000; m++) sum += pickReveal(day, m / 10000).prize;
        t.equal(sum / 10000, ladderReward(day), "均勻掃描 r 的樣本平均應恰等於階梯值");
      }
    });
    /* ===================== #84 連簽容錯 ===================== */
    st.register({
      id: "rewards/grace-zero-regression", group: "platform", tier: "fast",
      label: "#84 零回歸：graceLeft=0 時 nextStreakOf 對所有 (gap,streak) **逐位等於**改版前三分支邏輯",
      run: function (t) {
        // 改版前的原始式（保留於此當作黃金參考）：claimedToday ? raw : (lastDay===d-1 ? raw+1 : 1)
        function legacy(gap, raw) { return gap === 0 ? raw : (gap === 1 ? raw + 1 : 1); }
        var bad = 0;
        for (var raw = 0; raw <= 40; raw++) {
          for (var gap = 0; gap <= 12; gap++) {
            var got = nextStreakOf(gap, raw, 0, 14);
            if (got.streak !== legacy(gap, raw) || got.usedGrace) bad++;
          }
        }
        t.equal(bad, 0, "graceLeft=0 時 13×41 組合應全部與舊邏輯相同且不動用容錯");
        // 從未簽到（gap=Infinity）
        t.equal(nextStreakOf(Infinity, 0, 2, 14).streak, 1, "從未簽到應為第 1 天");
        t.equal(nextStreakOf(Infinity, 0, 2, 14).usedGrace, false, "從未簽到不應消耗容錯");
        // ladderReward / milestoneOf 本身一字未改＝再釘一次（防後續重構動到金額表）
        t.equal(ladderReward(1), 100, "第 1 天日獎應為 100");
        t.equal(ladderReward(7), 1500, "第 7 天日獎應為 1500");
        t.equal(ladderReward(30), 17500, "第 30 天日獎應為 17500");
        t.equal(ladderReward(31), ladderReward(30), "第 31 天應 plateau");
        t.equal(milestoneOf(8), 3000, "第 8 天里程碑應為 3000");
        t.equal(milestoneOf(9), 0, "第 9 天非里程碑日應為 0");
      }
    });
    st.register({
      id: "rewards/grace-gap-rules", group: "platform", tier: "fast",
      label: "#84 只救『恰好漏 1 天』：gap=2 可救、gap≥3 一律歸零（容錯不得成為無限展期）",
      run: function (t) {
        t.equal(GRACE_GAP, 2, "可動用容錯的 gap 應恰為 2（＝恰好漏 1 天）");
        var r2 = nextStreakOf(2, 5, 2, 14);
        t.equal(r2.streak, 6, "gap=2 有容錯時應續連（5→6）");
        t.equal(r2.usedGrace, true, "gap=2 有容錯時應標記動用");
        // ⛔ 最重要的一條：連續漏 ≥2 天不得動用（否則容錯＝把 streak 永久凍住）
        for (var gap = 3; gap <= 30; gap++) {
          var r = nextStreakOf(gap, 5, 99, 14);
          t.equal(r.streak, 1, "gap=" + gap + "（連續漏 " + (gap - 1) + " 天）必須歸 1");
          t.equal(r.usedGrace, false, "gap=" + gap + " 不得動用容錯");
        }
        // 容錯用盡後行為退回原狀
        t.equal(nextStreakOf(2, 5, 0, 14).streak, 1, "容錯用盡時 gap=2 應歸 1");
        // scope：超出 maxProtectedDay 不得動用（成本鎖在 FTUE 段）
        t.equal(nextStreakOf(2, 13, 2, 14).streak, 14, "被保住第 14 天（=上限）應可動用");
        t.equal(nextStreakOf(2, 14, 2, 14).streak, 1, "被保住第 15 天（>上限）不得動用");
        t.equal(nextStreakOf(2, 14, 2, 14).usedGrace, false, "超出 scope 不得標記動用");
      }
    });
    st.register({
      id: "rewards/grace-spec-cost", group: "platform", tier: "fast",
      label: "#84 成本上界**算出來而非宣稱**：真站 grants ≤ 假站，且最壞情況多發額由列舉求出",
      run: function (t) {
        // (c) 成本中性紀律：真站 grants 必須 ≤ 假站（且首版真站為 0＝不開）
        for (var i = 0; i < GRACE_SPECS.length; i++) {
          var sp = GRACE_SPECS[i];
          t.ok(sp.grants.live <= sp.grants.demo, sp.id + " 真站 grants(" + sp.grants.live + ") 應 ≤ 假站(" + sp.grants.demo + ")");
          t.ok(sp.grants.live >= 0 && sp.grants.demo >= 0, sp.id + " grants 不得為負");
          t.ok(sp.scope && sp.scope.maxProtectedDay > 0, sp.id + " 必須有 scope.maxProtectedDay（否則成本無上界）");
          t.equal(sp.refill, "never", sp.id + " 首版 refill 必須為 never（season 需接 #46 賽季邊界，未實作不得登記）");
        }
        t.equal(graceGrantsOf("ftue", true), 0, "真站首版容錯次數應為 0（＝功能對真站關閉）");
        t.equal(graceGrantsOf("ftue", false), 2, "假站容錯次數應為 2");
        t.equal(graceGrantsOf("不存在的id", false), 0, "未登記的 spec 應回 0（不得預設給獎）");

        // 成本上界：列舉「30 天內漏 ≤3 天」的所有漏簽樣式，比較有/無容錯的總送幣額
        //   模型：每個日曆日最多領一次；漏簽日不領（容錯**不補發**）⇒ 差額純粹來自「領取落在更高的階」
        // ⭐ 真正有意義的天花板不是「比被罰的自己多多少」，而是「**永遠不可能超過全勤者**」——
        //   容錯者必定少領至少一天，故 30 天總額恆 < 全勤總額 ⇒ **每人曝險上限一分未增**（見下方測項）。
        var SP = graceSpec("ftue"), N = 30;
        function totalFor(missSet, grants) {
          var streak = 0, lastDay = null, total = 0, left = grants;
          for (var d = 1; d <= N; d++) {
            if (missSet.indexOf(d) >= 0) continue;               // 這天沒簽到
            var gap = lastDay === null ? Infinity : d - lastDay;
            var nx = nextStreakOf(gap, streak, left, SP.scope.maxProtectedDay);
            if (nx.usedGrace) left--;
            streak = nx.streak; lastDay = d;
            total += ladderReward(streak) + milestoneOf(streak);  // 日獎 + 里程碑
          }
          return total;
        }
        var perfect = totalFor([], 0);                      // 全勤 30 天總額（改版前後相同）
        var worst = 0, worstPat = null, ceilingBad = 0, ceilingWorstPat = null;
        // 漏 1~3 天（列舉；C(30,1)+C(30,2)+C(30,3) = 30+435+4060 = 4525 種）
        for (var a = 2; a <= N; a++) {
          for (var b = a; b <= N; b++) {
            for (var c = b; c <= N; c++) {
              var pat = (a === b && b === c) ? [a] : (b === c ? [a, b] : [a, b, c]);
              var withG = totalFor(pat, SP.grants.demo), without = totalFor(pat, 0);
              if (withG - without > worst) { worst = withG - without; worstPat = pat; }
              // ⛔ 天花板不變量：容錯者必定少領 ≥1 天 ⇒ 總額必須 **嚴格小於** 全勤者
              if (withG >= perfect) { ceilingBad++; ceilingWorstPat = pat; }
            }
          }
        }
        // 漏 0 天時差額必須恰為 0（沒有斷簽＝容錯永不動用＝不可能多發一塊錢）
        t.equal(totalFor([], SP.grants.demo) - totalFor([], 0), 0, "全勤者的送幣額必須與改版前逐位相同（容錯零動用）");
        // ⭐ 最重要的一條：**每人曝險上限一分未增**——所有漏簽樣式的總額恆 < 全勤總額
        t.equal(ceilingBad, 0, "任何漏簽樣式的 30 天總額都必須 < 全勤總額 " + perfect + "（違反樣式：" + JSON.stringify(ceilingWorstPat) + "）");
        // 相對於「被罰的自己」的最壞多發額（列舉求得的實數，非宣稱；作為未來改動的回歸鎖）
        t.ok(worst > 0, "容錯確實會提高里程碑觸達率（相對被罰基線最壞多發 " + worst + "＝全勤的 " + (100 * worst / perfect).toFixed(1) + "%，樣式 " + JSON.stringify(worstPat) + "）");
        t.ok(worst <= 100000, "最壞多發額（" + worst + "）應 ≤ 100,000；超過表示 scope/grants 被放寬，須重新評估經濟");
        // 真站 grants=0 ⇒ 真站送幣額與改版前**恆等**（不是宣稱，是列舉出來的）
        var liveBad = 0;
        for (var m = 2; m <= N; m++) if (totalFor([m], graceGrantsOf("ftue", true)) !== totalFor([m], 0)) liveBad++;
        t.equal(liveBad, 0, "真站（grants=0）對所有單日漏簽樣式的送幣額必須與改版前逐位相同");
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  /* ===================== 以下為瀏覽器區 ===================== */
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  if (HL.selftest) registerTests(HL.selftest);

  var dayNum = HL.dom.dayNum;  // T12：收斂至共用 epoch-bucket（本地日序，判斷昨天/今天）
  function load() { return HL.dom.lsGet(KEY, {}); }  // T20+站別命名空間（見 dom.js）
  function save(o) { HL.dom.lsSet(KEY, o); }

  // #76 開關（單一判斷出口）：關閉時逐位退回改版前的固定值行為
  function revealOn() {
    var o = HL.dom.lsGet(KEY_REVEAL, null);
    return (o && typeof o.on === "boolean") ? o.on : REVEAL_DEFAULT;
  }
  function setReveal(on) { HL.dom.lsSet(KEY_REVEAL, { on: !!on }); return revealOn(); }

  // #84 容錯用量（站別自動隔離＝走 HL.dom.lsGet/lsSet 的命名空間前綴，見 dom.js）
  function graceLoad() { return HL.dom.lsGet(KEY_GRACE, { used: {}, marks: [] }); }
  function graceSave(o) { HL.dom.lsSet(KEY_GRACE, o); }
  function isLive() { return !!(HL.site && HL.site.isLive && HL.site.isLive()); }
  function graceLeftOf(id) {
    var g = graceLoad();
    return Math.max(0, graceGrantsOf(id, isLive()) - ((g.used && g.used[id]) || 0));
  }

  function status() {
    var s = load();
    var d = dayNum();
    var claimedToday = s.lastDay === d;
    var raw = s.streak || 0;
    var gap = (typeof s.lastDay === "number") ? (d - s.lastDay) : Infinity;
    // #84：把三分支收斂到純函式 nextStreakOf（graceLeft=0 時逐位等於改版前行為）
    var SP = GRACE_SPECS[0];
    var graceLeft = SP ? graceLeftOf(SP.id) : 0;
    var nx = nextStreakOf(gap, raw, graceLeft, SP ? SP.scope.maxProtectedDay : 0);
    var nextStreak = nx.streak;
    // 顯示用 streak：斷簽即歸零，避免表頭顯示過期連登數；**容錯可救時視為仍存活**（不先歸零再回填）
    var streak = (gap === 0 || gap === 1 || nx.usedGrace) ? raw : 0;
    return {
      claimedToday: claimedToday, streak: streak, nextStreak: nextStreak,
      reward: ladderReward(nextStreak),          // 今日日獎（主餘額）＝揭曉開啟時為**期望值**
      milestone: milestoneOf(nextStreak),        // 今日里程碑大禮（獎金錢包，0=非里程碑日）
      ladderIdx: Math.min(nextStreak, LADDER_LEN) - 1,
      canClaim: !claimedToday,
      revealOn: revealOn(),                       // #76：供 UI 決定是否標示「平均值」
      // #84：容錯狀態（供 UI 誠實呈現——**不得讓玩家以為自己真的連續**）
      graceId: SP ? SP.id : null, graceLeft: graceLeft,
      graceGrants: SP ? graceGrantsOf(SP.id, isLive()) : 0,
      gracePending: nx.usedGrace,                 // 今天這筆領取將動用一次容錯
      graceMarks: graceLoad().marks || []         // 歷史上被容錯保住的連登日（面板標記用）
    };
  }

  function claim() {
    var st = status();
    if (st.claimedToday) return st;
    // #76：開啟揭曉時抽一檔，實發金額＝該檔獎額（期望值與 st.reward 恆等，見檔頭）
    var tier = null, amount = st.reward;
    if (st.revealOn) {
      var r = (HL.fair && HL.fair.floatOr) ? HL.fair.floatOr("checkin") : Math.random();
      tier = pickReveal(st.nextStreak, r);
      if (tier) amount = tier.prize;
    }
    save({ lastDay: dayNum(), streak: st.nextStreak });
    // #84 動用容錯：記帳 + **顯式留痕**（面板標「已用容錯」、通知說明——不假裝玩家真的連續）
    if (st.gracePending && st.graceId) {
      var g = graceLoad();
      g.used = g.used || {}; g.used[st.graceId] = ((g.used[st.graceId]) || 0) + 1;
      g.marks = (g.marks || []).concat([st.nextStreak]);
      graceSave(g);
      if (HL.notify) HL.notify.add({
        ic: "🛟", title: t("已動用連簽容錯", "已動用連簽容錯"),
        text: t("昨天漏簽，已用 1 次容錯保住連登（未補發漏掉那天的日獎）。剩餘 ", "昨天漏簽，已用 1 次容錯保住連登（未補發漏掉那天的日獎）。剩餘 ") + Math.max(0, st.graceLeft - 1)
      });
    }
    HL.state.set({ balance: HL.state.get().balance + amount }); // 日獎發遊戲幣（休閒）入主餘額
    if (HL.ledger && amount > 0) HL.ledger.record("bonus", amount, { source: "每日簽到" }); // 營運帳本：直入主餘額的送幣（記**實發額**）
    if (st.milestone > 0 && HL.bonus) {                            // 里程碑大禮入獎金錢包（不受揭曉影響）
      HL.bonus.add(st.milestone);
      if (HL.notify) HL.notify.add({ ic: "🏅", title: t("連登里程碑", "連登里程碑"), text: t("連登", "連登") + " " + st.nextStreak + " " + t("天里程碑", "天里程碑") + " " + money(st.milestone) + " " + t("已入獎金錢包。", "已入獎金錢包。") });
    }
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.tasks) HL.tasks.bump("checkin", 1); // 推進「完成每日簽到」任務
    if (HL.achievements) HL.achievements.sync(); // 成就徽章牆：簽到後即時重評連續簽到類成就
    // #65 進度來源：每日回站也累積 VIP／賽季**進度**（對標 CapySpin「Growth Points from daily logins」）。
    //   amount 恆為 1＝每日一筆定額；只發進度不發錢（日獎金額仍由上面既有路徑處理，本行不碰金額）。
    if (HL.progressSrc) HL.progressSrc.grant("checkin", 1);
    // #81 領取即開窗（Rollbit Rewards Calendar）：把「領完就結束」變成「接下來一段時間回饋更高」。
    //   ⚠️ 只呼叫一行、不碰金額路徑；窗口時長/次數上限/乘數全在 rakeboost.js 的站別表裡。
    if (HL.rakeboost && HL.rakeboost.trigger) HL.rakeboost.trigger("claimwindow");
    var out = status();
    out.claimedAmount = amount;   // 本次實發（揭曉關閉時＝階梯值）
    out.claimedTier = tier;       // 本次抽中的檔（揭曉關閉時為 null）
    return out;
  }

  function open() {
    var st = status();
    var todayIdx = st.ladderIdx;                 // 今日在階梯上的 0-based 位置
    var grid = el("div", { class: "ax-checkin ax-checkin--ladder" });
    var todayCell = null;
    for (var i = 0; i < LADDER_LEN; i++) {
      var day = i + 1;
      var isToday = (i === todayIdx);
      // 本輪已領＝當前 streak 內、位置早於今日的格；claimedToday 時今日也算已領
      var done = st.claimedToday ? (i <= todayIdx) : (i < todayIdx);
      var ms = MILESTONES[day] || 0;
      // #84 誠實呈現：這一格是被容錯保住的（**不假裝玩家真的連續**）
      var byGrace = st.graceMarks.indexOf(day) >= 0;
      var cls = "ax-checkin__day" + (done ? " is-done" : "") + (isToday ? " is-today" : "") + (ms ? " is-milestone" : "") + (byGrace ? " is-grace" : "");
      var cell = el("div", { class: cls }, [
        el("div", { class: "ax-checkin__d", text: t("第", "第") + day + t("天", "天") }),
        el("div", { class: "ax-checkin__amt", text: "+" + LADDER[i] }),
        ms ? el("div", { class: "ax-checkin__ms", text: "🏅+" + ms }) : null,
        byGrace ? el("div", { class: "ax-checkin__grace", text: t("已用容錯", "已用容錯") }) : null,
        done ? el("div", { class: "ax-checkin__chk", text: "✓" }) : null
      ]);
      if (isToday) todayCell = cell;
      grid.appendChild(cell);
    }

    var claimLabel = st.canClaim
      ? (t("簽到領取", "簽到領取") + " +" + money(st.reward) + (st.milestone > 0 ? (" +🏅" + money(st.milestone)) : ""))
      : t("今日已領取 ✓", "今日已領取 ✓");

    var m = HL.ui.modal(t("🎁 每日簽到 · 連登階梯", "🎁 每日簽到 · 連登階梯"), [
      el("div", { class: "ax-checkin__hd" }, [
        el("b", {}, [el("span", { text: t("連續簽到", "連續簽到") }), document.createTextNode(" " + st.streak), el("span", { text: t("天", "天") })]),
        el("span", { class: "ax-muted", text: st.canClaim ? (t("連越久單日獎越大 · 第 8/15/22/30 天有里程碑大禮", "連越久單日獎越大 · 第 8/15/22/30 天有里程碑大禮")) : t("今日已領，明天再來", "今日已領，明天再來") })
      ]),
      grid,
      // #76 誠實呈現：揭曉開啟時，階梯上的數字是**平均值**而非保證值（整句為單一文字節點＝可翻譯）
      st.revealOn ? el("small", { class: "ax-muted", text: t("今日獎勵以揭曉方式發放 · 平均值與階梯相同", "今日獎勵以揭曉方式發放 · 平均值與階梯相同") }) : null,
      // #84 誠實呈現：動用容錯這件事必須說出來（整句為單一文字節點＝可翻譯，見 §4 P3 陷阱）
      st.gracePending
        ? el("small", { class: "ax-gold", text: t("昨天漏簽 · 本次領取將動用 1 次連簽容錯（不補發漏掉那天的日獎）", "昨天漏簽 · 本次領取將動用 1 次連簽容錯（不補發漏掉那天的日獎）") })
        : (st.graceLeft > 0
          ? el("small", { class: "ax-muted" }, [
              el("span", { text: t("連簽容錯可用次數", "連簽容錯可用次數") }),
              document.createTextNode(" " + st.graceLeft + " "),
              el("span", { text: t("次 · 漏簽 1 天可保住連登", "次 · 漏簽 1 天可保住連登") })
            ])
          : null),
      el("button", {
        class: "ax-btn-primary", text: claimLabel,
        disabled: st.canClaim ? null : "disabled",
        onClick: function () {
          if (!status().canClaim) return;
          var before = status();
          var after = claim();
          var got = (typeof after.claimedAmount === "number") ? after.claimedAmount : before.reward;
          var msg = t("簽到成功", "簽到成功") + " +" + money(got) + "（" + t("連續", "連續") + " " + before.nextStreak + " " + t("天", "天") + "）";
          // #76：走既有 HL.reveal.show（不自刻動畫）；獎金在 claim() 早已入帳，揭曉只是儀式
          if (before.revealOn && after.claimedTier && HL.reveal && HL.reveal.show) {
            m.close();
            HL.reveal.show({
              title: t("🎁 簽到揭曉", "🎁 簽到揭曉"), ic: "📆", amount: got,
              note: t("已入主餘額", "已入主餘額"),
              onDone: function () { open(); }, onClose: function () { open(); }
            });
            return;
          }
          HL.ui.toast(before.milestone > 0 ? (msg + " +🏅" + money(before.milestone)) : msg, "ok");
          m.close(); open(); // 重繪反映已領狀態
        }
      }),
      el("span", { class: "ax-demo-tag", text: t("休閒模式 · 日獎進主餘額 · 里程碑進獎金錢包 · Demo", "休閒模式 · 日獎進主餘額 · 里程碑進獎金錢包 · Demo") })
    ]);
    // 今日格捲入視野（階梯長，避免使用者看不到當前進度）
    if (todayCell && todayCell.scrollIntoView) { try { todayCell.scrollIntoView({ block: "nearest" }); } catch (e) {} }
  }

  HL.rewards = {
    status: status, claim: claim, open: open,
    // #76 揭曉層出口（純數學供測項/面板複用；revealOn/setReveal 為可關開關）
    revealPlan: revealPlan, revealEV: revealEV, pickReveal: pickReveal,
    revealOn: revealOn, setReveal: setReveal,
    // #84 容錯出口（純數學供測項/瀏覽器端與 node 逐位對照；GRACE_SPECS 為 config 表）
    GRACE_SPECS: GRACE_SPECS, GRACE_GAP: GRACE_GAP,
    nextStreakOf: nextStreakOf, graceGrantsOf: graceGrantsOf, graceLeftOf: graceLeftOf
  };

  /* #90 經濟旋鈕自我描述：連簽容錯次數是**送幣型**（保住的 streak 等於保住後續獎勵）
   * ⇒ strict:"le"。遍歷 GRACE_SPECS，加一種容錯自動出現。 */
  if (HL && HL.econCfg && HL.econCfg.register) {
    HL.econCfg.register({
      id: "grace", label: "簽到連續容錯（#84）", icon: "🛟", order: 70,
      describe: function () {
        var rows = GRACE_SPECS.map(function (g) {
          return {
            key: "grants:" + g.id, label: g.label + " · 終身可動用次數",
            demo: (g.grants && g.grants.demo) || 0, live: (g.grants && g.grants.live) || 0,
            unit: " 次", strict: "le",
            note: "只有「被保住的連登日 ≤ " + ((g.scope && g.scope.maxProtectedDay) || "—") + "」才可動用＝成本鎖在 FTUE 段"
          };
        });
        rows.push({ key: "gap", label: "可動用的斷簽間隔", demo: GRACE_GAP, live: GRACE_GAP, unit: " 日",
          note: "只有「恰好漏 1 天」可動用（today − lastDay === " + GRACE_GAP + "）" });
        return rows;
      }
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

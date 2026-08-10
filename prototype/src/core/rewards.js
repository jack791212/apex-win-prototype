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

  var CORE = {
    LADDER: LADDER, LADDER_LEN: LADDER_LEN, MILESTONES: MILESTONES,
    ladderReward: ladderReward, milestoneOf: milestoneOf,
    REVEAL_TIERS: REVEAL_TIERS, REVEAL_W: REVEAL_W, UNIT_DIV: UNIT_DIV, REVEAL_DEFAULT: REVEAL_DEFAULT,
    revealPlan: revealPlan, revealEV: revealEV, pickReveal: pickReveal
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

  function status() {
    var s = load();
    var d = dayNum();
    var claimedToday = s.lastDay === d;
    var raw = s.streak || 0;
    var nextStreak = claimedToday ? raw : (s.lastDay === d - 1 ? raw + 1 : 1); // 昨天有領→+1，否則重置為 1
    // 顯示用 streak：斷簽（未在今/昨領）即歸零，與 nextStreak 一致，避免表頭顯示過期連登數
    var streak = (claimedToday || s.lastDay === d - 1) ? raw : 0;
    return {
      claimedToday: claimedToday, streak: streak, nextStreak: nextStreak,
      reward: ladderReward(nextStreak),          // 今日日獎（主餘額）＝揭曉開啟時為**期望值**
      milestone: milestoneOf(nextStreak),        // 今日里程碑大禮（獎金錢包，0=非里程碑日）
      ladderIdx: Math.min(nextStreak, LADDER_LEN) - 1,
      canClaim: !claimedToday,
      revealOn: revealOn()                        // #76：供 UI 決定是否標示「平均值」
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
      var cls = "ax-checkin__day" + (done ? " is-done" : "") + (isToday ? " is-today" : "") + (ms ? " is-milestone" : "");
      var cell = el("div", { class: cls }, [
        el("div", { class: "ax-checkin__d", text: t("第", "第") + day + t("天", "天") }),
        el("div", { class: "ax-checkin__amt", text: "+" + LADDER[i] }),
        ms ? el("div", { class: "ax-checkin__ms", text: "🏅+" + ms }) : null,
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
    revealOn: revealOn, setReveal: setReveal
  };
})(typeof window !== "undefined" ? window : globalThis);

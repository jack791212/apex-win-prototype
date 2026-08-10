/*
 * Apex Win｜通用「揭曉型領獎」元件（自我進化引擎 #38）
 * 對標 Spree（XP 解鎖 → scratch-off / bubble burst / prize wheel 揭曉領獎）+ Punkz（Loot Box 開箱儀式）。
 * ApexWin 領獎原本多為「直接入帳」，缺互動揭曉的儀式感——本檔做成可複用元件、一次做多處掛。
 * 鐵律：本元件**純呈現、不派彩**——呼叫端先同步入帳（房規：同步記帳保證不漏、動畫僅視覺呈現），
 *   再呼叫 show() 播放揭曉儀式；使用者中途關閉 modal 也不會漏帳。
 * 三種樣式：scratch（刮刮卡 canvas）/ bubble（戳泡泡）/ wheel（轉輪）。
 *
 * 【2026-08-06 #66 里程碑揭曉層】原本本元件只有 3 個呼叫點（meta 里程碑／onboarding 大禮包／shop 神秘包+寶箱），
 *   而全站 19 個 `HL.bonus.add` 送幣點中的**四大進度里程碑**（VIP 升段/升級、季票階梯、成就徽章、每日任務）
 *   一律「直接入帳、零儀式」＝**建了容器卻沒人用**（與 P4 的 HL.dock、promoCal 外部註冊者為零同型病）。
 *   本輪補的不是新元件，是**接線 + 一張把樣式決策收斂成資料的表**：
 *     - `TIER_STYLE`：里程碑層級（small/mid/big）→ 樣式，比照 Punkz「階級越高、箱子越好」。
 *     - `registerMilestone(spec)`：新增一種里程碑＝加一筆註冊，**呼叫端只說「我是誰、給了多少」**，不決定樣式。
 *     - **佇列**：同一瞬間達成多個里程碑（例：一注同時升 VIP 段位又解鎖徽章）時**依序播放**，絕不同時彈多個 modal。
 *     - **停用**：刻意複用既有動效 kill-switch（`HL.gset.anim` + `prefers-reduced-motion`），
 *       不新增只有這裡讀的旗標（game-settings.js 檔頭已立「避免死 flag」紀律）。
 *   ⚠️ 鐵律不變且更重要：**呼叫端必須先入帳再呼叫本層**。本層可能因動效關閉/未註冊/獎額為 0 而完全不播，
 *      任何金額都不得依賴它執行。
 *
 *   決策邏輯（註冊表 + 該不該播 + 播哪種樣式）以 `module.exports` 暴露供 node require，
 *   **瀏覽器與 node 跑的是同一份 planMilestone**（＝「驗的即玩的」，比照 responsible.js／service-level.js）。
 *
 * 註冊於 window.HL.reveal = { show, styles, milestone, registerMilestone, milestones, pending }。
 *   show({ style?, title?, ic?, amount, onDone?, onClose? })：style 不給則隨機；amount 為要展示的獎額（已入帳）。
 *   milestone(id, amount, opts?)：走 config 表 + 佇列播放；回傳是否排入（false＝本次不播，非錯誤）。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  var STYLES = ["scratch", "bubble", "wheel"];

  /* ===================== #66 里程碑揭曉：純決策區（node 可測） ===================== */

  // 層級 → 樣式（比照 Punkz「階級越高、箱子越好」；小里程碑刮一下就好、大里程碑轉輪）
  var TIER_STYLE = { small: "scratch", mid: "bubble", big: "wheel" };
  var QMAX = 4;   // 佇列上限：滿了就丟棄動畫（獎金早已入帳，丟的只是儀式）

  var MILESTONES = {};
  function registerMilestone(spec) {
    if (!spec || !spec.id) return false;
    MILESTONES[spec.id] = {
      id: spec.id,
      tier: TIER_STYLE[spec.tier] ? spec.tier : "small",
      style: STYLES.indexOf(spec.style) >= 0 ? spec.style : null,   // 給了就覆蓋層級預設
      ic: spec.ic || "🎁",
      title: spec.title || "🎁 揭曉獎勵"
    };
    return true;
  }
  // 首批註冊＝四大進度里程碑（VIP 兩層算兩種：升段稀有走大禮、升子級較頻繁走小禮）
  [
    { id: "vip-rank", tier: "big",   ic: "👑", title: "👑 VIP 段位晉升" },
    { id: "vip-sub",  tier: "small", ic: "⭐", title: "⭐ VIP 等級提升" },
    { id: "task",     tier: "small", ic: "🎯", title: "🎯 每日任務達成" },
    { id: "season",   tier: "mid",   ic: "🎫", title: "🎫 季票階梯獎勵" },
    { id: "badge",    tier: "mid",   ic: "🏅", title: "🏅 成就徽章解鎖" }
  ].forEach(registerMilestone);

  /* 該不該播、播哪種——**唯一的決策出口**，瀏覽器與 node 共用這一份。
   * env = { anim:bool（玩家動效開關）, reduced:bool（prefers-reduced-motion）, qlen:int（目前佇列長度含播放中）}
   * 回傳 { play:false, reason } 或 { play:true, style, title, ic, amount }。
   * ⚠️ 不播**不是錯誤**：呼叫端一律已先入帳，本層只決定要不要演。
   */
  function planMilestone(id, amount, env) {
    env = env || {};
    var def = MILESTONES[id];
    amount = Math.round(amount || 0);
    if (!def) return { play: false, reason: "unregistered" };
    if (!(amount > 0)) return { play: false, reason: "no-amount" };
    if (env.anim === false) return { play: false, reason: "anim-off" };
    if (env.reduced === true) return { play: false, reason: "reduced-motion" };
    if ((env.qlen || 0) >= QMAX) return { play: false, reason: "queue-full" };
    return {
      play: true,
      style: def.style || TIER_STYLE[def.tier],
      title: def.title,
      ic: def.ic,
      amount: amount
    };
  }

  var CORE = {
    STYLES: STYLES.slice(), TIER_STYLE: TIER_STYLE, QMAX: QMAX,
    registerMilestone: registerMilestone, planMilestone: planMilestone,
    milestones: function () { return Object.keys(MILESTONES); },
    specOf: function (id) { return MILESTONES[id] || null; }
  };

  function registerTests(st) {
    st.register({
      id: "reveal/milestone-tier-style", group: "platform", tier: "fast",
      label: "#66 里程碑層級→樣式：五個註冊項各自落在預期樣式，且大禮≠小禮",
      run: function (t) {
        var open = { anim: true, reduced: false, qlen: 0 };
        t.equal(planMilestone("vip-rank", 100, open).style, "wheel", "big 層級應走轉輪");
        t.equal(planMilestone("season", 100, open).style, "bubble", "mid 層級應走戳泡泡");
        t.equal(planMilestone("badge", 100, open).style, "bubble", "mid 層級應走戳泡泡");
        t.equal(planMilestone("vip-sub", 100, open).style, "scratch", "small 層級應走刮刮卡");
        t.equal(planMilestone("task", 100, open).style, "scratch", "small 層級應走刮刮卡");
        t.equal(CORE.milestones().length, 5, "首批應註冊 5 種里程碑");
      }
    });
    st.register({
      id: "reveal/milestone-gates", group: "platform", tier: "fast",
      label: "#66 不播的四種情形（未註冊／零獎額／動效關閉／佇列滿）各自回報正確原因",
      run: function (t) {
        var open = { anim: true, reduced: false, qlen: 0 };
        t.equal(planMilestone("no-such-id", 100, open).reason, "unregistered", "未註冊的里程碑不得猜樣式硬播");
        t.equal(planMilestone("task", 0, open).reason, "no-amount", "零獎額不佔用揭曉");
        t.equal(planMilestone("task", -50, open).reason, "no-amount", "負數獎額不得播");
        t.equal(planMilestone("task", 100, { anim: false, qlen: 0 }).reason, "anim-off",
          "玩家關閉動效時不得播（複用既有 kill-switch，不新增死 flag）");
        t.equal(planMilestone("task", 100, { anim: true, reduced: true, qlen: 0 }).reason, "reduced-motion",
          "prefers-reduced-motion 時不得播");
        t.equal(planMilestone("task", 100, { anim: true, qlen: CORE.QMAX }).reason, "queue-full",
          "佇列已滿時丟棄動畫（金額早已入帳，不受影響）");
        t.equal(planMilestone("task", 100, { anim: true, qlen: CORE.QMAX - 1 }).play, true,
          "佇列未滿的邊界應仍播（上限為 >= 而非 >）");
      }
    });
    st.register({
      id: "reveal/milestone-extensibility", group: "platform", tier: "fast",
      label: "#66 擴充性：新增一種里程碑＝加一筆註冊，不需改任何呼叫端或樣式邏輯",
      run: function (t) {
        var before = CORE.milestones().length;
        registerMilestone({ id: "__probe", tier: "big", ic: "🧪", title: "測試用里程碑" });
        var p = planMilestone("__probe", 777, { anim: true, reduced: false, qlen: 0 });
        t.equal(p.play, true, "新註冊的里程碑應立即可播");
        t.equal(p.style, "wheel", "新註冊項的樣式應由其層級決定（未寫死在呼叫端）");
        t.equal(p.ic, "🧪", "圖示應取自註冊表");
        t.equal(p.amount, 777, "獎額應原樣帶出（本層不改任何金額）");
        t.equal(CORE.milestones().length, before + 1, "註冊表應增加一筆");
        registerMilestone({ id: "__probe", tier: "small", ic: "🧪", title: "測試用里程碑", style: "not-a-style" });
        t.equal(planMilestone("__probe", 5, { anim: true, qlen: 0 }).style, "scratch",
          "非法 style 應退回層級預設，不得產出未知樣式");
        delete MILESTONES.__probe;
        t.equal(CORE.milestones().length, before, "清理後註冊表應回到原長度");
      }
    });
    st.register({
      id: "reveal/no-payout-contract", group: "platform", tier: "fast",
      label: "#66 零派彩契約：本層不得改動獎額、不得因不播而吞掉金額語意",
      run: function (t) {
        // 本層唯一碰到金額的地方是 Math.round（呈現用），且不論播或不播都不影響呼叫端已入的帳。
        t.equal(planMilestone("task", 123.4, { anim: true, qlen: 0 }).amount, 123, "顯示額四捨五入，不放大");
        t.equal(planMilestone("task", 123.6, { anim: true, qlen: 0 }).amount, 124, "顯示額四捨五入，不縮小");
        var off = planMilestone("task", 500, { anim: false, qlen: 0 });
        t.equal(off.play, false, "動效關閉時不播");
        t.equal(off.amount, undefined, "不播時不回傳金額＝呼叫端無從誤把本層當派彩來源");
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

  // ---- 各樣式的互動舞台。完成揭曉時呼叫 finish()（一次性）。----

  // 刮刮卡：canvas 覆蓋層 destination-out 擦除，放開時取樣清除率 >45% 即完成。
  // 覆蓋層只畫金幣圖樣（不畫文字，避開 DOM 翻譯層搆不到 canvas 的問題）。
  function stageScratch(amount, ic, finish) {
    var W = 260, H = 130;
    var under = el("div", { class: "ax-reveal__under" }, [
      el("span", { class: "ax-reveal__uic", text: ic }),
      el("b", { class: "ax-gold", text: money(amount) })
    ]);
    var cv = el("canvas", { class: "ax-reveal__cv", width: String(W), height: String(H) });
    var wrap = el("div", { class: "ax-reveal__scratch" }, [under, cv]);
    var ctx = cv.getContext("2d");
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#3b3567"); g.addColorStop(1, "#1c2740");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.font = "22px serif"; ctx.globalAlpha = 0.5;
    for (var y = 22; y < H; y += 34) for (var x = 10; x < W; x += 44) ctx.fillText("🪙", x + ((y / 34) % 2) * 20, y);
    ctx.globalAlpha = 1;

    var drawing = false, done = false;
    function at(e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
    }
    function check() {
      if (done) return;
      var img = ctx.getImageData(0, 0, W, H).data, clear = 0, total = 0;
      for (var y = 6; y < H; y += 12) for (var x = 6; x < W; x += 12) { total++; if (img[(y * W + x) * 4 + 3] < 40) clear++; }
      if (clear / total > 0.45) { done = true; cv.style.opacity = "0"; setTimeout(finish, 350); }
    }
    cv.addEventListener("pointerdown", function (e) { drawing = true; try { cv.setPointerCapture(e.pointerId); } catch (er) {} at(e); });
    cv.addEventListener("pointermove", function (e) { if (drawing) at(e); });
    cv.addEventListener("pointerup", function () { drawing = false; check(); });
    cv.addEventListener("pointercancel", function () { drawing = false; check(); });
    return { node: wrap, hint: "刮開卡片揭曉獎勵" };
  }

  // 戳泡泡：3×3 泡泡，第 3 顆戳破的泡泡揭曉獎勵。
  function stageBubble(amount, ic, finish) {
    var pops = 0, done = false;
    var cells = [];
    for (var i = 0; i < 9; i++) {
      (function () {
        var b = el("button", { class: "ax-reveal__bub", text: "🫧" });
        b.addEventListener("click", function () {
          if (done || b.disabled) return;
          b.disabled = true; pops++;
          if (pops >= 3) {
            done = true;
            b.textContent = ic; b.classList.add("is-hit");
            cells.forEach(function (c) { c.disabled = true; });
            setTimeout(finish, 450);
          } else {
            b.textContent = "💨"; b.classList.add("is-pop");
          }
        });
        cells.push(b);
      })();
    }
    return { node: el("div", { class: "ax-reveal__bubs" }, cells), hint: "戳破泡泡揭曉獎勵" };
  }

  // 轉輪：8 段裝飾圖示轉輪（獎額已定，轉輪為呈現），停在 🎁 段後揭曉。
  function stageWheel(amount, ic, finish) {
    var ICONS = ["💰", "⭐", "🍀", ic, "💎", "🔔", "🍒", "👑"];
    var HIT = 3; // 停在 ic 段
    var COLORS = ["#7c3aed", "#2563eb", "#0891b2", "#ca8a04", "#16a34a", "#ea580c", "#dc2626", "#db2777"];
    var stops = [];
    for (var i = 0; i < 8; i++) stops.push(COLORS[i] + " " + (i * 45) + "deg " + ((i + 1) * 45) + "deg");
    var wheel = el("div", { class: "ax-reveal__wheel", style: "background:conic-gradient(" + stops.join(",") + ")" },
      ICONS.map(function (c, i) {
        return el("span", { class: "ax-reveal__wic", style: "transform:rotate(" + (i * 45 + 22.5) + "deg) translateY(-46px) rotate(-" + (i * 45 + 22.5) + "deg)", text: c });
      }));
    var btn = el("button", { class: "ax-btn-primary" }, [el("span", { text: t("轉動", "轉動") })]);
    var spun = false;
    btn.addEventListener("click", function () {
      if (spun) return; spun = true;
      btn.setAttribute("disabled", "disabled");
      var center = HIT * 45 + 22.5;
      wheel.style.transform = "rotate(" + (360 * 6 + ((360 - center) % 360)) + "deg)";
      setTimeout(finish, 2700); // 單一閘門收尾（同 luckyspin 模式）
    });
    var stage = el("div", { class: "ax-reveal__wstage" }, [el("div", { class: "ax-reveal__wptr" }), wheel]);
    return { node: el("div", { class: "ax-reveal__wwrap" }, [stage, btn]), hint: "轉動轉輪揭曉獎勵" };
  }

  var BUILDERS = { scratch: stageScratch, bubble: stageBubble, wheel: stageWheel };

  function show(opts) {
    opts = opts || {};
    var style = BUILDERS[opts.style] ? opts.style : STYLES[Math.floor(Math.random() * STYLES.length)];
    var amount = opts.amount || 0;
    var ic = opts.ic || "🎁";
    var finished = false;

    var result = el("div", { class: "ax-reveal__result", style: "display:none" }, [
      el("div", { class: "ax-reveal__congrats", text: t("🎉 恭喜獲得", "🎉 恭喜獲得") }),
      el("b", { class: "ax-reveal__amt ax-gold", text: money(amount) }),
      // #76：入帳去處由呼叫端決定（簽到日獎入**主餘額**、其餘既有呼叫端皆為獎金錢包）。
      //   不給 note ⇒ 維持既有文案＝四個既有呼叫端逐位不變。
      el("small", { class: "ax-muted", text: opts.note || t("已入獎金錢包", "已入獎金錢包") }),
      el("button", { class: "ax-btn-primary", text: t("太棒了，收下 ✓", "太棒了，收下 ✓"), onClick: function () {
        modalRef.close();
        if (typeof opts.onDone === "function") opts.onDone();
      } })
    ]);

    var stage = BUILDERS[style](amount, ic, function finish() {
      if (finished) return; finished = true;
      stageHost.style.display = "none";
      hintEl.style.display = "none";
      result.style.display = "flex";
    });

    var stageHost = el("div", { class: "ax-reveal__stage" }, [stage.node]);
    var hintEl = el("small", { class: "ax-muted ax-reveal__hint", text: t(stage.hint, stage.hint) });

    var modalRef = HL.ui.modal(opts.title || t("🎁 揭曉獎勵", "🎁 揭曉獎勵"), [
      el("div", { class: "ax-reveal" }, [stageHost, hintEl, result])
    ], { onClose: opts.onClose });
    return modalRef;
  }

  // ---- 佇列：一次只播一則，關閉後才播下一則（同一注可能同時觸發多個里程碑）----
  var queue = [], busy = false;
  function pending() { return queue.length + (busy ? 1 : 0); }
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    var job = queue.shift();
    show({
      style: job.style, title: job.title, ic: job.ic, amount: job.amount,
      onDone: job.onDone,
      onClose: function () {
        busy = false;
        // 延一拍再播下一則：讓呼叫端的 onDone（可能會再開別的面板）先跑完，避免兩層 modal 疊起來
        setTimeout(pump, 250);
      }
    });
  }

  // 環境探針：把「玩家的動效偏好」讀成純資料餵給 planMilestone（決策本身在純函式區、node 可測）
  function envNow() {
    var reduced = false;
    try { reduced = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (_) {}
    return {
      anim: HL.gset ? HL.gset.get("anim") !== false : true,
      reduced: reduced,
      qlen: pending()
    };
  }

  function milestone(id, amount, opts) {
    opts = opts || {};
    var plan = planMilestone(id, amount, envNow());
    if (!plan.play) {
      // 不播也要跑 onDone——呼叫端（例：任務面板領完要開回面板）不必為了動效開關而分支。
      if (typeof opts.onDone === "function") opts.onDone();
      return false;
    }
    queue.push({
      style: plan.style,
      title: opts.title || t(plan.title, plan.title),
      ic: opts.ic || plan.ic,
      amount: plan.amount,
      onDone: opts.onDone
    });
    pump();
    return true;
  }

  // 換頁/登出時清空待播佇列：`enterView` 已用 HL.ui.closeAll() 清殘留遮罩，
  // 若不一併清佇列，關掉當前那則後**下一則會蓋在新頁面上**（正是那行註解要防的情況）。
  // 丟掉的只有動畫——獎金在呼叫端早已入帳，與 queue-full 同一個安全前提。
  function drain() { var n = queue.length; queue.length = 0; return n; }

  HL.reveal = {
    show: show, styles: STYLES.slice(),
    milestone: milestone, registerMilestone: registerMilestone,
    planMilestone: planMilestone, drain: drain,
    milestones: CORE.milestones, pending: pending
  };
})(typeof window !== "undefined" ? window : globalThis);

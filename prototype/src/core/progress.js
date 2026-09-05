/*
 * Apex Win｜留存三件套：VIP 等級 + 任務/成就 + 獎金錢包（領取中心）
 * 純前端 localStorage。資料源：HL.liveStats.record(game,bet,win) 為全遊戲中央記錄點，
 *   在其尾端餵 HL.vip.addWager / HL.tasks.bump（見 live-stats.js / instant.js 的掛鉤）。
 * 註冊於 window.HL.vip / HL.tasks / HL.bonus。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;  // T20：收斂至共用 localStorage 持久化出口
  var dayNum = HL.dom.dayNum;  // T12：收斂至共用 epoch-bucket
  function bar(pct) { return HL.ui.progress(pct); }  // 薄轉接 → HL.ui.progress（T6，clamp 入 primitive）
  // #65：VIP 進度值自 #50 起就不是「錢」（edge 加權），本輪起更可含儲值/簽到來源 ⇒ 經驗欄一律純數字、不加 NT$
  function xpNum(n) { return Math.round(+n || 0).toLocaleString("en-US"); }
  /* 各段位「顯示用」返水率＝`RB_LEGACY[i]`。
     ⚠️ 刻意**不用** `rakebackCore.edgePctFor`：那個回的是「**占莊家優勢的返還比例**」（黃金約 53.5%），
     只在 rakebackOpen 裡才正確，因為那裡的標題明寫「各等級返還比例（占該注莊家優勢）」。
     本矩陣的欄名是「返水」、且同面板上方「💧 返水率（本級）」走 `rbRate()`（無 game ⇒ 退回 RB_LEGACY，
     黃金＝1.1%）——若這裡填 53.5%，同一個面板會同時出現 1.1% 與 53.5% 兩個「返水」互相矛盾。
     `RB_LEGACY` 本來就是 #60 更名前 `RB_RATES` 的同一份陣列 ⇒ 直接用它＝**精準還原本欄原意**。 */
  function rbDisplayPct(i) { return RB_LEGACY[Math.min(Math.max(i | 0, 0), RB_LEGACY.length - 1)]; }

  /* ===================== 獎金錢包 / 領取中心（#20 紅利/流水引擎） =====================
   * 分離記帳：unlocked（達標可領）vs entries（待解鎖紅利 ledger，逐筆 {amt, req, prog}）。
   * 新紅利預設附流水要求（req = amt × WAGER_MULT），有效押注經中央掛鉤 onWager(bet) 以 FIFO
   * 推進頭筆進度、達標自動轉入 unlocked（🔓 通知）；未達標不可領。wagerFree 選項供「零流水」
   * 來源（#33 cashback）直入 unlocked。舊資料 {bonus:N} 優雅遷移為 unlocked（不鎖既有可領）。
   * API 相容：balance()/add()/claim()/open() 簽名不變（12+ 來源零改裝）。 */
  var KEY_B = "HL_BONUS";
  /* #74：流水倍數由「扁平常數」改為「**依段位查表的函式**」（VIP 條款軸的第五個維度）。
   *   舊碼是 `var WAGER_MULT = isLive() ? 8 : 1`＝module 級、載入期一次求值、只分站別不分段位
   *   ⇒ 鑽石與青銅門檻相同。現改為求值出口 `HL.sla.bonusReqFor(amt)`（表在 core/service-level.js，
   *   有 node 契約＋成本中性/單調性/不得為 0 三組常駐測項）。
   *   ⚠️ **只在 `badd()` 建立 entry 時求值一次並寫進 entry**；`bOnWager`／`bStatus` 一律只讀 `e.req`
   *   ⇒ 降段不追溯加重既有紅利的門檻（信任紅線，由 `sla/bonus-wager-frozen` 架構鎖看守）。
   *   HL.sla 尚未載入時（service-level.js 在本檔之後掛載）退回舊制常數＝只退化、不當機。 */
  /* #97：原為 `(HL.site && HL.site.isLive()) ? 8 : 1` ＝**載入期純量三元式**（執行期只看得到
   *   自己站別那一個數字、無法被 `HL.econCfg` 描述）。改為兩站別並存的表，取值逐位不變。 */
  var LEGACY_WAGER_MULT_BY_SITE = { demo: 1, live: 8 };
  var LEGACY_WAGER_MULT = LEGACY_WAGER_MULT_BY_SITE[(HL.site && HL.site.isLive()) ? "live" : "demo"];
  function reqFor(n) {
    return (HL.sla && HL.sla.bonusReqFor) ? HL.sla.bonusReqFor(n)
                                          : Math.max(1, Math.round(n * LEGACY_WAGER_MULT));
  }
  var MAX_ENTRIES = 20;  // ledger 上限：超過併入尾筆（高頻小額來源如紅包雨防爆量）
  var DAY_MS = 86400000; // #71：倒數轉紅的門檻（與 HL.bonusTtl.WARN_MS 同口徑）
  /* #89：紅利可用範圍軸。`sc` 只在**有宣告**時才寫進 entry ⇒ 未宣告的紅利與舊存檔
   *   在 localStorage 裡是**逐位相同的物件**（沒有多出來的鍵），零回歸不靠比對而靠不存在。 */
  /* #71 紅利壽命軸：`exp`（絕對到期時戳）**在授予當下求值一次**寫進 entry，之後只讀不重算
   *   （與同一物件上的 `req` #74、`sc` #89 同一條紀律）⇒ 日後調整壽命表不會追溯縮短既有紅利。
   *   查無壽命政策 ⇒ 回 0 ⇒ **不寫 `exp` 欄位**：未註冊來源與改版前的存檔在 localStorage 裡是
   *   逐位相同的物件，零回歸靠「欄位不存在」而非比對（同 #89 對 `sc` 的處置）。 */
  function ttlExpFor(src) {
    if (!HL.bonusTtl) return 0;
    return HL.bonusTtl.expAt(src, (HL.site && HL.site.isLive()) ? "live" : "demo", Date.now());
  }
  function mkEntry(n, sc, src) {
    var e = { amt: n, req: reqFor(n), prog: 0 };
    if (sc != null && sc !== "") e.sc = sc;
    var exp = ttlExpFor(src);
    if (exp > 0) e.exp = exp;
    return e;
  }
  function sameScope(a, b) {
    return JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);
  }
  /* #71：壽命不同的紅利**不得併筆**——併了會靜默改掉其中一半的到期日（玩家看到的條款與實際不符），
   *   與 #89 對「範圍不同不得併筆」同一條理由。`exp` 由 `Date.now()` 產生 ⇒ 實務上只有
   *   「兩邊都不到期」會相等 ⇒ 未註冊壽命的來源併筆行為**逐位如舊**。
   *   代價是有壽命的高頻來源（紅包雨）可能讓 ledger 略微超過 MAX_ENTRIES：上限本是防爆量的軟保護，
   *   正確性優先（沿 #89 的裁決）；且壽命本身就會把這些筆掃掉，累積是有界的。 */
  function sameExp(a, b) { return (a || 0) === (b || 0); }
  function bstate() {
    var o = ls(KEY_B, null);
    if (!o) { o = { unlocked: 0, entries: [] }; save(KEY_B, o); return o; }
    if (o.entries == null) { // 舊資料遷移：既有 pot 全數視為已解鎖，不誤鎖使用者既得
      // 防毀損：同時保留 unlocked 欄位（異常態 {unlocked:N, entries:null} 不得歸零＝金額不可銷毀）
      o = { unlocked: Math.max(0, Math.round((o.unlocked != null ? o.unlocked : o.bonus) || 0)), entries: [] };
      save(KEY_B, o);
    }
    if (bSweep(o)) save(KEY_B, o);
    return o;
  }
  /* #71 逾期清理（懶觸發，比照 rakeback 日桶／#33 cashback 跨週作廢，不需常駐計時器）。
   * ⚠️ **本函式全篇不得出現 `unlocked`**——卡上的信任紅線是「已達流水而轉入可領取的錢不得被
   *   回頭作廢」，這裡靠的是**作用域**而非斷言：`HL.bonusTtl.sweep` 的簽章只有 (entries, now)，
   *   而達標的 entry 早已被 `bOnWager` 的 `entries.shift()` 移出 ledger ⇒ TTL 結構上夠不著它。
   *   常駐測項 `platform/bonus-ttl-cannot-touch-unlocked` 會逐字掃本函式看守這件事。
   * 回 true ＝ 有改動（呼叫端負責存檔）。 */
  function bSweep(o) {
    if (!HL.bonusTtl || !o || !o.entries || !o.entries.length) return false;
    var now = Date.now(), changed = false;
    var r = HL.bonusTtl.sweep(o.entries, now);
    if (r.expired.length) {
      o.entries = r.kept; changed = true;
      var lost = 0;
      for (var i = 0; i < r.expired.length; i++) lost += (r.expired[i].amt || 0);
      if (lost > 0) {
        // 帳本回沖：紅利成本在 badd() 授予當下就記過了，作廢代表那筆成本從未真的發生
        if (HL.ledger) HL.ledger.record("bonus_void", lost, { source: "紅利逾期作廢" });
        // 不得靜默蒸發（卡上不變量 a）
        if (HL.notify) HL.notify.add({ ic: "⌛", title: "紅利已逾期",
          text: money(lost) + " 待解鎖紅利未在期限內完成流水，已失效。" });
      }
    }
    // 到期前提醒（每筆只提醒一次；標記寫在 entry 上隨存檔一起走）
    var soon = HL.bonusTtl.dueSoon(o.entries, now);
    for (var j = 0; j < soon.length; j++) {
      var e = o.entries[soon[j]];
      e.wn = 1; changed = true;
      if (HL.notify) HL.notify.add({ ic: "⏳", title: "紅利即將到期",
        text: money(e.amt) + " 待解鎖紅利將於 24 小時內到期，請盡快完成流水。" });
    }
    return changed;
  }
  function bbal() { return bstate().unlocked || 0; }
  function blocked() { var o = bstate(), s = 0; for (var i = 0; i < o.entries.length; i++) s += o.entries[i].amt; return s; }
  function badd(n, opts) {
    n = Math.round(n || 0); if (n <= 0) return;
    var o = bstate();
    var sc = (opts && opts.scope != null) ? opts.scope : null;   // #89：選用，不給＝全遊戲 100%＝現況
    var src = (opts && opts.source) || null;                     // #71：壽命政策以 source 為 key
    if (opts && opts.wagerFree) { o.unlocked = (o.unlocked || 0) + n; }
    // 併入尾筆時只為「新增的那部分」加 req（既有部分的 req 不動＝不追溯加重）
    // ⚠️ #89：**範圍不同的紅利不得併筆**——併了會靜默改掉其中一筆的可用範圍（玩家看到的條款與實際不符）。
    // ⚠️ #71：**壽命不同的紅利同理不得併筆**（見上方 sameExp 的理由）。
    //   寧可讓 ledger 略微超過 MAX_ENTRIES：上限本是防爆量的軟保護，正確性優先。
    else if (o.entries.length >= MAX_ENTRIES && sameScope(o.entries[o.entries.length - 1].sc, sc)
             && sameExp(o.entries[o.entries.length - 1].exp, ttlExpFor(src))) {
      var tl = o.entries[o.entries.length - 1]; tl.amt += n; tl.req += reqFor(n);
    }
    else o.entries.push(mkEntry(n, sc, src));
    save(KEY_B, o);
    // 營運帳本：紅利在「授予當下」即為送幣成本（非領取端，避免與 bclaim 重複計）；source 供成本明細分類
    if (HL.ledger) HL.ledger.record("bonus", n, { source: (opts && opts.source) || "其他紅利" });
  }
  /* 中央掛鉤：有效押注累進流水（FIFO 推頭筆；單注可連鎖解多筆）
   * #89：`game` 為選用第二參數。**未宣告範圍的紅利（無 e.sc）權重恆為 1 ⇒ 下面的算式逐位退化回
   *   改版前的三行**（wt>=1 時 eff===w、消耗===need）＝零回歸錨點，不是靠比對而是靠同一條路徑。 */
  function bOnWager(bet, game) {
    bet = Math.round(bet || 0); if (bet <= 0) return 0;
    var o = bstate(); if (!o.entries.length) return 0;
    var w = bet, freed = 0;
    while (w > 0 && o.entries.length) {
      var e = o.entries[0];
      var wt = (e.sc && HL.wagerScope) ? HL.wagerScope.weightFor(e.sc, game) : 1;
      // 不符範圍：不推進、**也絕不倒扣**，且不得跳過頭筆去推後面（FIFO 語義必須維持）
      if (!(wt > 0)) break;
      var need = e.req - e.prog;
      var eff = (wt >= 1) ? w : Math.floor(w * wt);          // 這一注的有效流水
      if (eff >= need) {
        // 換算回「消耗掉多少原始押注」，餘額才能正確流到下一筆（wt=1 時恰為 need）
        w -= (wt >= 1) ? need : Math.min(w, Math.ceil(need / wt));
        freed += e.amt; o.entries.shift();
      }
      else { e.prog += eff; w = 0; }
    }
    if (freed > 0) {
      o.unlocked = (o.unlocked || 0) + freed;
      if (HL.notify) HL.notify.add({ ic: "🔓", title: "紅利解鎖", text: "流水達標，" + money(freed) + " 紅利已轉為可領取。" });
      if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    }
    save(KEY_B, o);
    return freed;
  }
  function bclaim() {
    var o = bstate(); var amt = o.unlocked || 0; if (amt <= 0) return 0;
    o.unlocked = 0; save(KEY_B, o);
    HL.state.set({ balance: HL.state.get().balance + amt });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return amt;
  }
  // 提款/轉出閘控：有待解鎖紅利時回報鎖定額（demo 轉贈與未來真金提款共用）
  function bCanWithdraw() { var lk = blocked(); return { ok: lk <= 0, locked: lk }; }
  function bStatus() {
    var o = bstate();
    var head = o.entries[0] || null;
    return {
      unlocked: o.unlocked || 0, locked: blocked(), count: o.entries.length,
      head: head ? {
        amt: head.amt, req: head.req, prog: head.prog, pct: head.req > 0 ? (head.prog / head.req) * 100 : 100,
        // #89：未宣告範圍時恆為 null ⇒ 呼叫端不顯示任何多餘的行（零視覺回歸）
        scope: head.sc || null,
        scopeLabel: (head.sc && HL.wagerScope) ? HL.wagerScope.labelOf(head.sc) : null,
        // #71：未宣告壽命時恆為 null ⇒ 同樣不多出任何一行
        expLeftMs: (HL.bonusTtl ? HL.bonusTtl.leftMs(head, Date.now()) : null)
      } : null
    };
  }
  function bonusOpen() {
    var st = bStatus();
    var lockedPanel = null;
    if (st.locked > 0 && st.head) {
      var rest = st.count - 1, restAmt = st.locked - st.head.amt;
      lockedPanel = el("div", { class: "ax-panel" }, [
        HL.ui.kv("🔒 待解鎖紅利", money(st.locked)),
        el("div", { class: "ax-kv" }, [
          el("span", { class: "ax-muted", text: "當前解鎖進度" }),
          el("b", {}, [document.createTextNode(money(st.head.prog) + " / " + money(st.head.req))])
        ]),
        bar(st.head.pct),
        rest > 0 ? el("small", { class: "ax-muted" }, [
          el("span", { text: "其餘排隊中" }), document.createTextNode("：" + rest + " 筆 · " + money(restAmt))
        ]) : null,
        // #89：只有受限紅利才多出這一行（P3 契約：中文全片語各自成節點，值不與片語同節點）
        st.head.scopeLabel ? el("small", { class: "ax-muted" }, [
          el("span", { text: "本筆紅利限定範圍" }), document.createTextNode("："),
          el("span", { text: st.head.scopeLabel })
        ]) : null,
        // #71：只有有壽命的紅利才多出這兩行（未註冊來源 expLeftMs 恆為 null ⇒ 零視覺回歸）
        st.head.expLeftMs != null ? el("small", { class: st.head.expLeftMs <= DAY_MS ? "ax-red" : "ax-muted" }, [
          el("span", { text: "本筆紅利到期倒數" }), document.createTextNode("：" + HL.dom.dhm(st.head.expLeftMs))
        ]) : null,
        st.head.expLeftMs != null ? el("small", { class: "ax-muted",
          text: "逾期仍未完成流水的待解鎖紅利將失效；已轉為可領取的獎金不受影響。" }) : null,
        el("small", { class: "ax-muted", text: "有效押注會自動累進流水，達標的紅利自動解鎖為可領取。" })
      ]);
    }
    var m = HL.ui.modal("🎁 領取中心 · 獎金錢包", [
      el("div", { class: "ax-panel" }, [
        HL.ui.kv("可領取獎金", money(st.unlocked), { valCls: "ax-gold" }),
        el("small", { class: "ax-muted", text: "活動獎金先入「待解鎖」，以有效押注累進流水；達標自動轉為可領取，領取後入主餘額。" })
      ]),
      lockedPanel,
      el("button", { class: "ax-btn-primary", disabled: st.unlocked > 0 ? null : "disabled", onClick: function () {
        var got = bclaim(); if (got > 0) { HL.ui.toast("已領取 " + money(got) + " 到主餘額", "ok"); m.close(); bonusOpen(); }
      } }, st.unlocked > 0
        ? [el("span", { text: "領取" }), document.createTextNode(" " + money(st.unlocked) + " "), el("span", { text: "到主餘額" })]
        : [el("span", { text: "目前沒有可領取獎金" })]),
      el("button", { class: "ax-btn-ghost", text: "去完成每日任務 →", onClick: function () { m.close(); tasksOpen(); } }),
      el("span", { class: "ax-demo-tag", text: "分離記帳 · 流水達標解鎖 · Demo" })
    ]);
  }
  HL.bonus = { balance: bbal, add: badd, claim: bclaim, open: bonusOpen, onWager: bOnWager, locked: blocked, canWithdraw: bCanWithdraw, status: bStatus };

  /* ===================== VIP 等級 ===================== */
  var KEY_V = "HL_VIP";
  var RANKS = [
    { name: "青銅", icon: "🥉", min: 0, reward: 0 },
    { name: "白銀", icon: "🥈", min: 5000, reward: 500 },
    { name: "黃金", icon: "🥇", min: 20000, reward: 1500 },
    { name: "白金", icon: "💠", min: 60000, reward: 5000 },
    { name: "鑽石", icon: "💎", min: 150000, reward: 15000 }
  ];
  function vwager() { return ls(KEY_V, { wager: 0 }).wager || 0; }
  function rankIndexFor(w) { var idx = 0; for (var i = 0; i < RANKS.length; i++) if (w >= RANKS[i].min) idx = i; return idx; }
  // #29 tier-up 雙層獎金（對標 Shuffle level-up + tier-up）：每段位內切 SUBS 個子等級，
  // 升「子級」發小獎（LEVEL_REWARDS，依所在段位）、跨「段位（大階）」發既有大獎（RANKS[].reward）。
  var SUBS = 5;                                  // 每段位 5 個子等級（各段 gap 均分，恰為整數）
  var LEVEL_REWARDS = [60, 150, 400, 1000, 0];   // 各段位內「升一子級」獎金（鑽石為頂、無子級）
  // 真站：VIP 升級金/子級金縮至 40%（一次性取得成本，真金前要控管）；假站維持慷慨展示值
  /* #97：縮放係數具名 + **先留存假站基準值**，否則真站載入後兩個陣列已被就地改寫，
   *   執行期再也拿不回假站那一排 ⇒ `describe()` 只能手抄數字（正是 #90 要根除的第二份真相）。 */
  var VIP_LIVE_SCALE = 0.4;
  var RANK_REWARD_DEMO = RANKS.map(function (r) { return r.reward; });
  var LEVEL_REWARDS_DEMO = LEVEL_REWARDS.slice();
  if (HL.site && HL.site.isLive()) {
    RANKS.forEach(function (r) { r.reward = Math.round(r.reward * VIP_LIVE_SCALE); });
    for (var _li = 0; _li < LEVEL_REWARDS.length; _li++) LEVEL_REWARDS[_li] = Math.round(LEVEL_REWARDS[_li] * VIP_LIVE_SCALE);
  }
  function subIndexFor(w) {                      // 全域子級序＝rank×SUBS＋段內子級（鑽石＝終點）
    var i = rankIndexFor(w), r = RANKS[i], next = RANKS[i + 1];
    if (!next) return i * SUBS;
    var step = (next.min - r.min) / SUBS;
    return i * SUBS + Math.min(SUBS - 1, Math.floor((w - r.min) / step));
  }
  function vstatus() {
    var w = vwager(), i = rankIndexFor(w), r = RANKS[i], next = RANKS[i + 1] || null;
    var pct = next ? ((w - r.min) / (next.min - r.min)) * 100 : 100;
    var step = next ? (next.min - r.min) / SUBS : 0;
    var sub = next ? Math.min(SUBS - 1, Math.floor((w - r.min) / step)) : 0;
    return {
      index: i, name: r.name, icon: r.icon, wager: w, next: next, toNext: next ? next.min - w : 0, pct: pct,
      sub: sub, subs: SUBS, toNextSub: next ? (r.min + step * (sub + 1)) - w : 0, levelReward: LEVEL_REWARDS[i] || 0,
      // #31 微等級：全域等級 Lv 1..21（鑽石＝封頂）＋ 距下一子級的段內進度（header 迷你條用）
      level: i * SUBS + sub + 1, maxLevel: (RANKS.length - 1) * SUBS + 1,
      subPct: next ? ((w - (r.min + step * sub)) / step) * 100 : 100,
      /* #59 活躍光環（**加法式**：既有欄位一個都沒動，既有讀者不受影響）。
         上面所有欄位皆由終身 `w` 決定＝**只升不降**，本欄是唯一會退的東西，且它退的是
         另一層（HL.activity 碰不到 `KEY_V`／不呼叫 addWager，見該檔頭「作用域限制」段）。
         查不到 HL.activity（漏載／node）⇒ 回 null，讀者照舊，不是 undefined 陷阱。 */
      activity: (HL.activity && HL.activity.status) ? HL.activity.status() : null
    };
  }
  function addWager(amount) {
    amount = Math.round(amount || 0); if (amount <= 0) return;
    var o = ls(KEY_V, { wager: 0 });
    var before = rankIndexFor(o.wager || 0), beforeSub = subIndexFor(o.wager || 0);
    o.wager = (o.wager || 0) + amount; save(KEY_V, o);
    var after = rankIndexFor(o.wager), afterSub = subIndexFor(o.wager);
    if (after > before) { // 跨大階：發段位大獎（tier-up）
      var rankGain = 0;
      for (var i = before + 1; i <= after; i++) if (RANKS[i].reward) { badd(RANKS[i].reward, { source: "VIP 升級金" }); rankGain += RANKS[i].reward; }
      var rk = RANKS[after];
      HL.ui.toast("🎉 VIP 升級：" + rk.icon + " " + rk.name + "！獎金 " + money(RANKS[after].reward) + " 已入獎金錢包", "ok");
      if (HL.notify) HL.notify.add({ ic: rk.icon, title: "VIP 升級：" + rk.name, text: "恭喜晉升 " + rk.name + "，升級獎金 " + money(RANKS[after].reward) + " 已入獎金錢包。" });
      // #66 揭曉儀式（已入帳後才播；一次跨多階時合併為一則，勿連彈）
      if (HL.reveal) HL.reveal.milestone("vip-rank", rankGain, { ic: rk.icon });
    }
    // 升子級：發小獎（段位邊界 s%SUBS===0 由上面大階路徑發、此處跳過＝不重複）
    var levelGain = 0;
    for (var s = beforeSub + 1; s <= afterSub; s++) {
      if (s % SUBS === 0) continue;
      levelGain += LEVEL_REWARDS[Math.floor(s / SUBS)] || 0;
    }
    if (levelGain > 0) {
      badd(levelGain, { source: "VIP 子級金" });
      HL.ui.toast("⭐ VIP 子等級提升！獎金 " + money(levelGain) + " 已入獎金錢包", "ok");
      if (HL.notify) HL.notify.add({ ic: "⭐", title: "VIP 子等級提升", text: "等級推進獎金 " + money(levelGain) + " 已入獎金錢包。" });
      if (HL.reveal) HL.reveal.milestone("vip-sub", levelGain);   // #66 揭曉儀式（同上：先入帳、後播）
    }
    // 每次押注都刷新 chrome（header 微等級迷你條要能連續推進，不只在升級瞬間跳動）
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }
  // S11 福利矩陣：一眼看各級「返水率（隨等級放大）＋ 升級獎金（解鎖）」，highlight 目前 + 標記下一級
  function benefitMatrix(curIdx) {
    var head = el("div", { class: "ax-vipmx__row ax-vipmx__head" }, [
      el("span", { text: "等級" }), el("span", { text: "累積經驗" }), el("span", { text: "返水" }), el("span", { text: "升級獎金" }),
      // #74：VIP 不只決定「拿多少」，也決定「多久拿到」——紅利流水倍數是條款軸的一欄
      el("span", { text: "紅利流水" })
    ]);
    var rows = RANKS.map(function (r, i) {
      var stateCls = i === curIdx ? " is-cur" : (i === curIdx + 1 ? " is-next" : (i < curIdx ? " is-done" : ""));
      var tag = i === curIdx ? el("span", { class: "ax-vipmx__tag", text: "目前" })
              : (i === curIdx + 1 ? el("span", { class: "ax-vipmx__tag ax-vipmx__tag--next", text: "下一級" }) : null);
      return el("div", { class: "ax-vipmx__row" + stateCls }, [
        el("span", { class: "ax-vipmx__lv" }, [el("span", { text: r.icon + " " + r.name }), tag]),
        el("span", { text: r.min ? xpNum(r.min) : "—" }),
        // 🐞 既有缺陷修復（2026-08-06 平台軌 14:00 窗於實作 #65 時查獲）：此處原為 `RB_RATES[i]`，
        //   但該變數在 #60（9fe925d「返水改以莊家優勢計價」）已更名為 `RB_LEGACY` 而**漏改這一處**
        //   ⇒ benefitMatrix 一被呼叫就 ReferenceError ⇒ **`HL.vip.open()` 整個 VIP 俱樂部面板自 #60
        //   起完全開不起來（拋錯、零渲染）**，歷時 2 天無人察覺（過往驗證都沒實際開過本面板）。
        //   修法沿用同檔 rakebackOpen 既有寫法：有 rakebackCore 走 edge 基準百分比、否則退回 RB_LEGACY。
        el("span", { class: i <= curIdx ? "ax-gold" : "", text: (rbDisplayPct(i) * 100).toFixed(1) + "%" }),
        el("span", { text: r.reward ? money(r.reward) : "—" }),
        // #74 紅利流水倍數（越低越好 ⇒ 用 ax-gold 標示已達段位，與返水欄同一視覺語意）
        el("span", { class: i <= curIdx ? "ax-gold" : "",
          text: (HL.sla && HL.sla.bonusWagerMult ? HL.sla.bonusWagerMult(i) : LEGACY_WAGER_MULT) + "×" })
      ]);
    });
    return el("div", { class: "ax-vipmx" }, [head].concat(rows));
  }
  function vipOpen() {
    var s = vstatus();
    var m = HL.ui.modal("💎 VIP 俱樂部", [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [el("span", { text: "目前等級" }), el("b", { class: "ax-gold", text: s.icon + " " + s.name })]),
        // #65：本欄自 #50 起即為「edge 加權後的有效押注」，本輪起更可含非投注來源（儲值/簽到）
        //   ⇒ 標籤改為誠實的「累積 VIP 經驗」，並附一個查來源的入口（原標籤會讓玩家以為只算押注）。
        HL.ui.kv("累積 VIP 經驗", xpNum(s.wager)),
        bar(s.pct),
        el("small", { class: "ax-muted", text: s.next ? ("再押注 " + money(s.toNext) + " 升級到 " + s.next.icon + " " + s.next.name) : "已達最高等級 💎" }),
        s.next ? HL.ui.kv("⭐ 子等級", "Lv " + (s.sub + 1) + " / " + s.subs) : null,
        s.next ? el("small", { class: "ax-muted" }, [
          el("span", { text: "距下一級" }), document.createTextNode(" " + money(s.toNextSub) + " · "),
          el("span", { text: "每級獎金" }), document.createTextNode(" " + money(s.levelReward))
        ]) : null,
        /* #59 活躍光環：上面每一欄都是「只升不降」的終身量，這一欄是唯一會退的——**而且刻意
           放在同一張面板裡**，玩家才看得出兩者是兩層而不是同一層（光環淡出時核心等級沒動）。
           段位名獨立成節點（見 activity.js tierName 同註）；查不到 HL.activity ⇒ 整段略過。 */
        s.activity ? el("div", { class: "ax-kv" }, [
          el("span", { class: "ax-muted", text: "🔥 活躍光環" }),
          el("b", { class: s.activity.active ? "ax-gold" : "ax-muted" }, [
            document.createTextNode(s.activity.icon + " "), el("span", { text: s.activity.name })
          ])
        ]) : null,
        s.activity ? el("button", { class: "ax-btn-ghost", text: "🔥 活躍光環（近期活躍度）→",
          onClick: function () { m.close(); HL.activity.open(); } }) : null
      ]),
      el("div", { class: "ax-panel" }, [
        // #52：加成標示改讀加成表（原本只認得 happyhour 的 ⚡×2，新手窗口/opt-in 加成生效時會漏標）
        HL.ui.kv("💧 返水率（本級）", (HL.rakeback ? (HL.rakeback.rate() * 100).toFixed(1) : "0") + "%" + rbBoostTag(), { valCls: "ax-gold" }),
        HL.ui.kv("可領取返水", money(HL.rakeback ? Math.floor(HL.rakeback.pot()) : 0), { valCls: "ax-gold" }),
        el("button", { class: "ax-btn-ghost", text: "前往 Rakeback 返水 →", onClick: function () { m.close(); if (HL.rakeback) HL.rakeback.open(); } }),
        el("button", { class: "ax-btn-ghost", text: "🔄 領週期紅利（每日/週/月）→", onClick: function () { m.close(); if (HL.reload) HL.reload.open(); } })
      ]),
      el("div", { class: "ax-panel" }, [
        el("small", { class: "ax-muted ax-vipmx__cap", text: "各級福利一覽（返水率隨等級放大、升級發獎金）" }),
        benefitMatrix(s.index),
        // #50 成本加權：讓「為什麼這局累積比較多」可查（唯讀說明表，非設定）
        HL.edge ? el("button", { class: "ax-btn-ghost", text: "⚖️ XP 成本加權（各遊戲倍率）→",
          onClick: function () { m.close(); HL.edge.open(); } }) : null,
        // #65 進度來源：除了押注，還有哪些行為累積進度（唯讀說明表；容器做了就要有入口）
        HL.progressSrc ? el("button", { class: "ax-btn-ghost", text: "📊 進度來源（押注以外的累積）→",
          onClick: function () { m.close(); HL.progressSrc.open(); } }) : null,
        // #63 服務水準軸：VIP 除了「送多少錢」，也決定「拿錢這件事」的時效/額度/客服（唯讀說明表）
        HL.sla ? el("button", { class: "ax-btn-ghost", text: "🚚 服務水準（提領時效／額度）→",
          onClick: function () { m.close(); HL.sla.open(); } }) : null
      ]),
      el("span", { class: "ax-demo-tag", text: "押注/儲值/簽到皆累積 · 子級+大階雙層獎金 · Demo" })
    ]);
  }
  HL.vip = { addWager: addWager, status: vstatus, open: vipOpen, xpNum: xpNum };

  /* ===================== Rakeback 返水（綁 VIP 等級係數 · 每日桶 · 逾期作廢 #22） ===================== */
  var KEY_R = "HL_RAKEBACK";
  // #60：計價基準由「押注額」改為「該注的理論莊家收入」＝ bet × 該遊戲莊家優勢 × 段位返還比例。
  //   舊制「率是常數、edge 逐遊戲不同」無法機械保證「返水率 < 莊優」，實測假站頂階 1.8% 在
  //   1% edge 的 originals ＝吐回莊家理論收入的 180%（每注淨虧）。改制後該不變量數學恆真。
  //   純資料/純函式與成本中性校準在 core/rakeback-core.js（雙環境契約 + 常駐 node 測項），
  //   本檔只負責「取用 + 記桶 + UI」。未登記 edge 的遊戲一律退回下面的舊制率（只退化、不歸零）。
  /* #90 查獲並收斂的**第二份真相**：本行原本自帶一份與 `core/rakeback-core.js` 的
   *   `LEGACY_RATES` **逐位相同**的舊制返水率字面量——上面第 317 行才剛寫「純資料在
   *   rakeback-core.js，本檔只負責取用+記桶+UI」，實際上卻硬抄了一份 ⇒ 改那邊不會改到這邊。
   *   （查獲方式：#90 的反向覆蓋鎖把「站別分歧的經濟常數」當成訊號掃 core/，這一行被掃出來。）
   * 改為**從單一真相取值**。載入序有保證：`rakeback-core.js`(index.html 第 64 行)早於本檔(第 67 行)
   *   ⇒ 正常部署下取到的就是同一組數字（有常駐測項逐位比對兩者相等）。
   * ⚠️ 退化路徑的取捨：核心真的沒載入時回全 0（＝不計返水）而非 NaN。
   *   原本的字面量後備在「rakeback 引擎整個不存在」時才會用到，那已是壞掉的部署。 */
  var RB_LEGACY = (function () {
    var C = HL.rakebackCore;
    var arr = (C && C.LEGACY_RATES) ? C.LEGACY_RATES[(HL.site && HL.site.isLive()) ? "live" : "demo"] : null;
    return (arr && arr.length) ? arr.slice() : [0, 0, 0, 0, 0];
  })();
  function rbMode() { return HL.site && HL.site.mode ? HL.site.mode() : "demo"; }
  function rbVipIdx() { var i = HL.vip ? HL.vip.status().index : 0; return Math.min(Math.max(i | 0, 0), RB_LEGACY.length - 1); }
  // ⚠️ 惰性查表：core/edge.js 在 index.html 的載入序**晚於**本檔，載入期不可捕捉 HL.edge。
  function rbEdgeOf(game) { return (game != null && HL.edge && HL.edge.edgeOf) ? HL.edge.edgeOf(game) : null; }
  function rbEdgePct() { var C = HL.rakebackCore; return C ? C.edgePctFor(rbMode(), rbVipIdx()) : null; }
  // 每日返水桶：當日累積的返水須當日領取，跨日未領即作廢（對標 rollbit 快領 / roobet 日桶）。
  function rbState() {
    var o = ls(KEY_R, { pot: 0, lifetime: 0, day: dayNum() });
    if (o.day == null) { o.day = dayNum(); save(KEY_R, o); }                       // 舊資料遷移：既有 pot 併為今日桶，不作廢
    else if (o.day !== dayNum()) { o.day = dayNum(); o.pot = 0; save(KEY_R, o); }  // 跨日：未領桶逾期作廢
    return o;
  }
  // 返水率（占「押注額」的比例）。給 game ⇒ 走 edge 基準；未給或未登記 ⇒ 退回舊制率。
  function rbRate(game) {
    var C = HL.rakebackCore, i = rbVipIdx();
    if (!C) return RB_LEGACY[i];                      // 極端防禦：核心未載入時完全維持舊行為
    return C.rateFor(rbEdgeOf(game), rbMode(), i);
  }
  function rbPot() { return rbState().pot || 0; }
  function rbMsToReset() { return (dayNum() + 1) * 86400000 - Date.now(); } // 距今日桶作廢（跨日）的剩餘毫秒
  // 每筆下注即時累積返水至今日桶（由 HL.liveStats.record 中央點呼叫）
  function rbAccrue(bet, game) {
    bet = Math.round(bet || 0); if (bet <= 0) return 0;
    // #52：加成來源由「硬編 happyhour」改為可註冊的加成表（happyhour/新手窗口/opt-in 活動皆為其中一筆，
    //   解析規則＝取最高、不相乘、夾在站別上限內）。表不存在時退回原本的 happyhour 讀法＝零回歸。
    var boost = (HL.rakeboost && HL.rakeboost.mult) ? HL.rakeboost.mult()
              : ((HL.happyhour && HL.happyhour.mult) ? HL.happyhour.mult() : 1);
    var C = HL.rakebackCore;
    var rb = C ? C.accrualFor(bet, rbEdgeOf(game), rbMode(), rbVipIdx(), boost)
               : bet * RB_LEGACY[rbVipIdx()] * boost;
    var o = rbState();
    o.pot = (o.pot || 0) + rb; o.lifetime = (o.lifetime || 0) + rb; save(KEY_R, o);
    return rb;
  }
  function rbClaim() {
    var amt = Math.floor(rbPot()); if (amt <= 0) return 0; // 領取取整數，餘數留在今日桶
    var o = rbState(); o.pot = (o.pot || 0) - amt; save(KEY_R, o);
    HL.state.set({ balance: HL.state.get().balance + amt });
    if (HL.ledger) HL.ledger.record("bonus", amt, { source: "返水 Rakeback" }); // 營運帳本：返水領取＝送幣成本
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return amt;
  }
  function rbFmtLeft(ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h + " 小時 " + m + " 分"; }
  // #52 加成標示（供 VIP 面板與返水面板共用；無加成＝空字串，與改版前逐字相同）
  //   ⚠️ 函式宣告會提升，故可被上方 vipOpen 使用；圖示取當前生效那筆，非固定 ⚡。
  function rbBoostTag() {
    if (!(HL.rakeboost && HL.rakeboost.mult)) {
      return (HL.happyhour && HL.happyhour.mult && HL.happyhour.mult() > 1) ? " ⚡×2" : "";
    }
    var m = HL.rakeboost.mult();
    if (!(m > 1)) return "";
    var a = HL.rakeboost.active()[0];
    return " " + ((a && a.icon) || "💧") + "×" + m;
  }
  // #52：加成區塊（含「當前 ×N／剩餘時間」＋一顆去活動日曆加入優惠的入口）。
  //   加成表未載入 ⇒ 回空陣列＝面板與改版前完全相同。
  function boostRows() {
    if (!(HL.rakeboost && HL.rakeboost.summaryNode)) return [];
    var out = [HL.rakeboost.summaryNode()];
    if (HL.promoCal && HL.promoCal.open) {
      out.push(el("button", { class: "ax-btn-ghost", text: "前往活動日曆加入優惠 →",
        onClick: function () { HL.ui.closeTop(); HL.promoCal.open(); } }));
    }
    return out;
  }
  function rakebackOpen() {
    var s = HL.vip ? HL.vip.status() : { icon: "🥉", name: "青銅", index: 0 };
    var pot = rbPot(), claimable = Math.floor(pot);
    var C = HL.rakebackCore;
    var rateRows = RANKS.map(function (r, i) {
      var pct = C ? C.edgePctFor(rbMode(), i) : null;
      return el("div", { class: "ax-kv" + (i === s.index ? " ax-vip__cur" : "") }, [
        el("span", { text: r.icon + " " + r.name + (i === s.index ? "（目前）" : "") }),
        // ⚠️ P3 契約：值必須是「純數字」文字節點，單位/語意一律放進可翻譯的整句 label
        //   （i18n 只翻「整個文字節點等於一條 key」者，「數字＋中文」串接永遠翻不到）。
        el("b", { class: "ax-muted", text: pct === null ? ((RB_LEGACY[i] * 100).toFixed(1) + "%")
                                                        : ((pct * 100).toFixed(1) + "%") })
      ]);
    });
    // 以實際 edge 表舉兩個對照例，讓「同注額、不同遊戲返水不同」變得可見（純展示，不影響計算）
    var egPct = rbEdgePct();
    var egRows = (egPct === null || !HL.edge || !HL.edge.edgeOf) ? [] : [
      el("div", { class: "ax-panel" }, [
        el("small", { class: "ax-muted", text: "同樣押注 NT$1,000，不同遊戲的返水（依該遊戲莊家優勢）" }),
        HL.ui.kv("骰寶 Dice（1.00% 莊優）", money(Math.round(1000 * rbRate("dice")))),
        HL.ui.kv("Pirots（3.855% 莊優）", money(Math.round(1000 * rbRate("pirots"))))
      ])
    ];
    var m = HL.ui.modal("💧 Rakeback 返水", [
      el("div", { class: "ax-panel" }, [
        HL.ui.kv("目前返還比例（占莊家優勢）", ((egPct === null ? rbRate() : egPct) * 100).toFixed(1) + "%"
          + "（" + s.icon + " " + s.name + "）" + rbBoostTag(), { valCls: "ax-gold" }),
        HL.ui.kv("今日可領返水", money(claimable), { valCls: "ax-gold" }),
        HL.ui.kv("本桶逾期作廢，剩餘", rbFmtLeft(rbMsToReset())),
        el("small", { class: "ax-muted", text: "返水以「這一注理論上莊家賺多少」計價：莊家優勢越高的遊戲，同樣的押注額返得越多；等級越高，返還的比例越高。返水進「每日桶」，當日未領跨日即作廢，記得每天回來領。" })
      ]),
      el("button", { class: "ax-btn-primary", text: claimable > 0 ? ("領取 " + money(claimable) + " 到主餘額") : "尚無可領取返水", disabled: claimable > 0 ? null : "disabled", onClick: function () {
        var got = rbClaim(); if (got > 0) { HL.ui.toast("已領取返水 " + money(got) + " 到主餘額", "ok"); m.close(); rakebackOpen(); }
      } }),
      el("div", { class: "ax-panel" }, [
        el("small", { class: "ax-muted", text: "各等級返還比例（占該注莊家優勢）" })
      ].concat(rateRows))
    ].concat(boostRows(), egRows, [
      el("span", { class: "ax-demo-tag", text: "以莊家優勢計價 · 每日桶逾期作廢 · Demo" })
    ]));
  }
  HL.rakeback = {
    accrue: rbAccrue, pot: rbPot, rate: rbRate, rateOf: rbRate, edgePct: rbEdgePct,
    claim: rbClaim, msToReset: rbMsToReset, open: rakebackOpen
  };

  /* ===================== 每日任務 / 成就 ===================== */
  var KEY_T = "HL_TASKS";
  var DAILY = [
    { id: "play10", name: "今日下注 10 次", goal: 10, reward: 200, ev: "bet" },
    { id: "win5", name: "今日贏 5 次", goal: 5, reward: 300, ev: "win" },
    { id: "wager2k", name: "今日累積押注 NT$2,000", goal: 2000, reward: 400, ev: "wager" },
    { id: "checkin", name: "完成每日簽到", goal: 1, reward: 100, ev: "checkin" }
  ];
  function tload() {
    var o = ls(KEY_T, null);
    if (!o || o.day !== dayNum()) { o = { day: dayNum(), prog: {}, claimed: {} }; save(KEY_T, o); }
    return o;
  }
  function bump(ev, amount) {
    amount = amount || 0; if (amount <= 0) return;
    var o = tload(), changed = false;
    DAILY.forEach(function (t) { if (t.ev === ev) { var cur = Math.min(t.goal, (o.prog[t.id] || 0) + amount); if (cur !== (o.prog[t.id] || 0)) { o.prog[t.id] = cur; changed = true; } } });
    if (changed) save(KEY_T, o);
  }
  function tlist() { var o = tload(); return DAILY.map(function (t) { var cur = o.prog[t.id] || 0; return { id: t.id, name: t.name, goal: t.goal, reward: t.reward, cur: cur, done: cur >= t.goal, claimed: !!o.claimed[t.id] }; }); }
  function tclaim(id) {
    var o = tload(), t = null; DAILY.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return 0; var cur = o.prog[id] || 0;
    if (cur < t.goal || o.claimed[id]) return 0;
    o.claimed[id] = true; save(KEY_T, o); badd(t.reward, { source: "每日任務" }); return t.reward;
  }
  function tasksOpen() {
    var list = tlist();
    var rows = list.map(function (t) {
      var btn = el("button", {
        class: t.claimed ? "ax-btn-ghost" : "ax-btn-primary", text: t.claimed ? "已領取 ✓" : (t.done ? "領取 +" + money(t.reward) : (t.id === "checkin" ? "去簽到" : t.cur + "/" + t.goal)),
        disabled: (t.claimed || (!t.done && t.id !== "checkin")) ? "disabled" : null,
        onClick: function () {
          if (t.id === "checkin" && !t.done) { closeTop(); if (HL.rewards) HL.rewards.open(); return; }
          var got = tclaim(t.id);
          if (got > 0) {
            HL.ui.toast("任務獎勵 +" + money(got) + " 入獎金錢包", "ok");
            closeTop();
            // #66：比照 shop.js 既有模式——先收面板、播揭曉、看完再開回任務面板（動效關閉時 onDone 仍會跑）
            if (HL.reveal) HL.reveal.milestone("task", got, { onDone: tasksOpen }); else tasksOpen();
          }
        }
      });
      return el("div", { class: "ax-task" }, [
        el("div", { class: "ax-task__main" }, [
          el("div", { class: "ax-task__name", text: (t.done ? "✓ " : "") + t.name }),
          bar(t.goal ? (t.cur / t.goal) * 100 : 0)
        ]),
        btn
      ]);
    });
    function closeTop() { HL.ui.closeTop(); }
    HL.ui.modal("📋 每日任務", [
      el("div", { class: "ax-tasks" }, rows),
      HL.ui.kv("獎金錢包", money(HL.bonus.balance()), { valCls: "ax-gold" }),
      el("button", { class: "ax-btn-ghost", text: "前往領取中心 →", onClick: function () { closeTop(); HL.bonus.open(); } }),
      el("span", { class: "ax-demo-tag", text: "每日 0 點重置 · 獎勵入獎金錢包 · Demo" })
    ]);
  }
  HL.tasks = { bump: bump, list: tlist, claim: tclaim, open: tasksOpen };

  /* #72 說明中心：紅利流水規則由本模組自己解釋。倍數讀 HL.sla.bonusWagerMult() 的當下值
   * （#74 之後倍數依段位而變 ⇒ 手抄一個數字必錯），可用範圍讀 #89 HL.wagerScope。 */
  if (HL.support && HL.support.register) {
    HL.support.register({
      id: "bonus/wager", cat: "bonus", order: 10,
      title: "紅利為什麼不能直接提出？流水要怎麼算才算完成？",
      keys: ["bonus", "紅利", "流水", "wager", "解鎖", "獎金錢包"],
      body: function () {
        var mult = (HL.sla && HL.sla.bonusWagerMult) ? HL.sla.bonusWagerMult() : null;
        var st = null; try { st = bStatus(); } catch (e) {}
        var scopes = (HL.wagerScope && HL.wagerScope.ids) ? HL.wagerScope.ids().length : 0;
        return "紅利入的是「獎金錢包」，需完成流水才會轉為可提餘額。"
             + "你目前的流水倍數為 " + (mult == null ? "—" : mult + "×")
             + "（依 VIP 段位分級；倍數在紅利入帳當下就固定寫入該筆，日後降段不會回頭加重舊紅利）。"
             + (st && st.req ? "目前這筆進度 " + Math.round(st.prog || 0) + " / " + Math.round(st.req) + "。" : "")
             + (scopes ? "部分紅利會限定可用範圍（目前共 " + scopes + " 種範圍條款），"
                       + "範圍外的遊戲下注不計入該筆流水。" : "");
      },
      action: { label: "開啟獎金錢包", run: function () { bonusOpen(); } }
    });
  }

  /* #97：向 `HL.econCfg` 註冊本檔的兩個站別分歧經濟旋鈕（VIP 一次性取得成本 + 舊制流水倍數）。
   *   真站那一排一律由「假站基準 × 具名係數」當場推導，與上面實際套用的算式同一條 ⇒ 不會各改各的。 */
  if (HL.econCfg && HL.econCfg.register) {
    var scaled = function (arr) { return arr.map(function (v) { return Math.round(v * VIP_LIVE_SCALE); }); };
    HL.econCfg.register({
      id: "vip-upgrade", label: "VIP 升級金／舊制流水（#29／#74）", icon: "🏅", order: 65,
      describe: function () {
        return [
          { key: "liveScale", label: "真站升級金保留比例", demo: 100, live: Math.round(VIP_LIVE_SCALE * 100), unit: "%", strict: "le",
            note: "假站 100%＝不縮；真站只發 " + Math.round(VIP_LIVE_SCALE * 100) + "%" },
          { key: "rankReward", label: "段位升級金（青銅→鑽石）", demo: RANK_REWARD_DEMO, live: scaled(RANK_REWARD_DEMO),
            unit: " 元", strict: "le", note: "真站縮至 " + Math.round(VIP_LIVE_SCALE * 100) + "%（一次性取得成本，§11）" },
          { key: "levelReward", label: "子級升級金（段內 5 級）", demo: LEVEL_REWARDS_DEMO, live: scaled(LEVEL_REWARDS_DEMO),
            unit: " 元", strict: "le" },
          { key: "legacyWagerMult", label: "舊制紅利流水倍數（HL.sla 未載入時的退回值）",
            demo: LEGACY_WAGER_MULT_BY_SITE.demo, live: LEGACY_WAGER_MULT_BY_SITE.live, unit: "×", strict: "ge",
            note: "摩擦型：真站須 ≥ 假站。現制改依段位查表（core/service-level.js）" }
        ];
      }
    });
  }
})(window);

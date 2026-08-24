/*
 * Apex Win｜點數商城 / Reward Market（自我進化引擎 #36）
 * 對標 Dorados（Reward Market：Elixir 換獎）+ Chancer（Bonus Shop：累點逛商城換獎）+ BigPirate（Reward Market：Rum 換 free plays）——三方共識。
 * ApexWin 原本一堆「發錢進 HL.bonus」的賺取端（Lucky Spin/Reload/Raffle/Rakeback…）卻無「點數消耗端 + 商品目錄」；
 * 本檔補上「賺→逛→換」經濟閉環：有效押注經中央掛鉤 HL.liveStats.record 累積「商城點數」，
 *   到商城花點數兌換獎勵（獎金券／神秘獎勵包），VIP 越高折扣越好，每品項有週期冷卻（冪等）。
 * 首版兌換標的皆派入獎金錢包 HL.bonus＝每個按鈕都真的發獎、非假招牌（頭像框/免費轉券/加成券留待後續卡）。
 * 純前端 localStorage、零牌照、不改任何派發金額邏輯以外的東西。
 * #123（2026-08-24 平台軌）：目錄由硬寫陣列改為**可註冊清單** `register(item)`＝其他模組（季票/公會/
 *   成就/活動）能把獎品擺進商城而不動本檔＝容器先於內容；並補資格閘（對標 bet365 Loyalty Store：
 *   Cash Reward 只有白金/鑽石換得到）。受眾述詞一律向 `HL.release` 求，本檔不自建第二張門檻表，
 *   只決定「什麼時候問」＝逛目錄時 + 按下兌換時（兩個消費者共用同一支述詞）。
 * 註冊於 window.HL.shop = { record, points, status, redeem, open, register, catalog }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_SHOP";
  var DAY = 86400000;
  var POINT_PER = 100;               // 每 NT$100 有效押注 = 1 點
  var VIP_DISCOUNT = [0, 0.05, 0.10, 0.15, 0.20]; // 青銅→鑽石：折扣越高

  var dayNum = HL.dom.dayNum;    // T12：收斂至共用 epoch-bucket
  var weekNum = HL.dom.weekNum;  // T12：收斂至共用 epoch-bucket

  // 商品目錄。kind: "bonus"＝固定額、"mystery"＝區間均勻隨機、"gacha"＝加權分層抽獎（有小機率大獎尾）。period: 冷卻週期。
  var BUILTIN = [
    { id: "v-s",     ic: "🎟️", name: "小獎金券",   cost: 40,  kind: "bonus",   value: 300,          period: "daily" },
    { id: "v-m",     ic: "💰", name: "中獎金券",   cost: 100, kind: "bonus",   value: 900,          period: "daily" },
    { id: "mystery", ic: "🎁", name: "神秘獎勵包", cost: 80,  kind: "mystery", range: [150, 2000],  period: "daily" },
    // #42 機率型兌換（對標 Deal or No Deal Win「Star Shop：花固定點 → up to X SC」+ 姊妹站 Zonko）：
    //   花固定點數 → 依權重抽一層獎（tiers 由低到高、含小機率大獎尾），走 #38 獎輪揭曉。EV≈758。
    { id: "gacha",   ic: "🎰", name: "命運寶箱",   cost: 90,  kind: "gacha",
      tiers: [ { value: 200, weight: 55 }, { value: 600, weight: 28 }, { value: 1500, weight: 12 }, { value: 6000, weight: 5 } ],
      period: "daily" },
    { id: "v-l",     ic: "💎", name: "大獎金券",   cost: 250, kind: "bonus",   value: 2500,         period: "weekly" },
    /* #123 首個受眾閘品項。arg 的尺＝`AUDIENCES.vip` 既有的**全域微等級 Lv 1..21**（不是 RANKS 索引）：
     * 白金＝RANKS[3] ⇒ 起點全域等級 = 3×SUBS(5)+1 = **16**。改 progress.js 的 SUBS 時此數要跟著動。 */
    { id: "v-plat",  ic: "🏆", name: "白金專屬大獎券", cost: 400, kind: "bonus", value: 4000,       period: "weekly",
      audience: { kind: "vip", arg: 16 } }
  ];

  /* #123 商品註冊表。CATALOG 起始為空，連內建品項都**走同一道門**註冊進來 ⇒ 驗證器若拒絕真實形狀
   * 會當場暴露，不會有「內建走後門、只有外部註冊者被檢查」的雙軌。同 id 不覆蓋（先註冊者為主）。
   * 壞註冊回 false 而非拋錯：一筆壞資料不該讓整個商城打不開。
   * ⚠️ 週期白名單刻意不叫 PERIODS——那是 reload.js 的私有名，有常駐鎖守它不外露（#91 不變量 e）。 */
  var CATALOG = [];
  var PERIOD_OK = { daily: 1, weekly: 1 };
  function validItem(it) {
    if (!it || typeof it.id !== "string" || !it.id) return false;
    if (!it.name || !it.ic) return false;
    if (typeof it.cost !== "number" || !(it.cost > 0)) return false;
    if (!PERIOD_OK[it.period]) return false;
    // 每種 kind 必須帶齊自己的獎額來源，否則 redeem() 會算出 undefined/NaN 派出去
    if (it.kind === "bonus")   return typeof it.value === "number" && it.value > 0;
    if (it.kind === "mystery") return !!(it.range && it.range.length === 2 && it.range[1] >= it.range[0]);
    if (it.kind === "gacha")   return !!(it.tiers && it.tiers.length && it.tiers.every(function (x) {
      return x && typeof x.value === "number" && typeof x.weight === "number" && x.weight > 0;
    }));
    return false;                                   // 未知 kind ⇒ 不收（別讓它變成一張算不出獎的卡）
  }
  function register(item) {
    if (!validItem(item)) return false;
    if (itemBy(item.id)) return false;
    CATALOG.push(item);
    return true;
  }

  // 加權分層抽獎：依 weight 抽一層，回傳該層獎額。tiers 假設由低到高排序（供 min–max 標示）。
  function pickTier(tiers) {
    var total = 0, i;
    for (i = 0; i < tiers.length; i++) total += tiers[i].weight;
    var r = Math.random() * total, acc = 0;
    for (i = 0; i < tiers.length; i++) { acc += tiers[i].weight; if (r < acc) return tiers[i].value; }
    return tiers[tiers.length - 1].value;
  }

  function load() { return HL.dom.lsGet(KEY, {}); }  // T20+站別命名空間（見 dom.js）
  function save(o) { HL.dom.lsSet(KEY, o); }
  function vipIdx() { return HL.vip ? HL.vip.status().index : 0; }
  function discount() { return VIP_DISCOUNT[Math.min(vipIdx(), VIP_DISCOUNT.length - 1)]; }
  function costOf(item) { return Math.ceil(item.cost * (1 - discount())); }

  function points() { return Math.floor(load().points || 0); }

  // 中央掛鉤：有效押注累積點數（同 raffle 的累積模式；點數存浮點、顯示取整）
  function record(bet) {
    if (!bet || bet <= 0) return;
    var s = load(); s.points = (s.points || 0) + bet / POINT_PER; save(s);
  }

  function periodNum(period) { return period === "weekly" ? weekNum() : dayNum(); }
  function msToNext(period) {
    return period === "weekly" ? (weekNum() + 1) * 7 * DAY - Date.now() : (dayNum() + 1) * DAY - Date.now();
  }
  function itemBy(id) { for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i]; return null; }
  /* #123 資格閘。時機＝逛目錄時 + 按下兌換時都問。fail-closed：宣告了 audience 但 release.js 未載入
   * ⇒ 不放行（載入競態下寧可少發）。⚠️ 這條不變量有**兩個消費者**（UI 的 open() 與派彩的 redeem()），
   * 必須共用本函式——只擋 UI 不擋 redeem() 就是「直接呼叫 redeem() 繞過」＝§4 的「修一半」型態。 */
  function eligible(item) {
    if (!item || !item.audience) return true;                       // 未宣告＝全體（既有 6 筆行為逐位不變）
    if (!(HL.release && HL.release.matches)) return false;
    return HL.release.matches(item.audience, HL.release.audienceCtx());
  }
  function audienceLabel(item) {
    if (!item || !item.audience) return "";
    return (HL.release && HL.release.audienceLabelOf) ? HL.release.audienceLabelOf(item.audience) : "";
  }
  /* 未達標該「隱藏」還是「可見但鎖著」？**不在本檔判斷** ⇒ 問 `HL.release.isGoalAudience`：
   * 目標型（只升不降、可憑遊玩達成）＝鎖著展示（段位制度的動機來源）；其餘一律隱藏，比照 #107
   * `audience-promo-hidden-not-greyed`「灰掉＝預告一個拿不到的獎」。讀不到詞彙 ⇒ 隱藏。 */
  function shownWhenLocked(item) {
    if (!item || !item.audience) return true;
    return !!(HL.release && HL.release.isGoalAudience && HL.release.isGoalAudience(item.audience));
  }
  // 目錄可見清單：達標的全收；未達標的只有「目標型」留下（鎖著展示）
  function visible() {
    return CATALOG.filter(function (it) { return eligible(it) || shownWhenLocked(it); });
  }
  function onCooldown(item) { var s = load(); return s.red && s.red[item.id] === periodNum(item.period); }
  function redeemable(item) { return eligible(item) && !onCooldown(item) && points() >= costOf(item); }

  // 兌換：扣點 + 設週期冷卻 + 派獎入獎金錢包。回傳實得獎金或 0。
  function redeem(id) {
    var item = itemBy(id); if (!item) return 0;
    if (!eligible(item)) return 0;                 // #123：派彩側的權威閘（UI 之外的第二個消費者）
    if (onCooldown(item)) return 0;
    var cost = costOf(item);
    var s = load();
    if (Math.floor(s.points || 0) < cost) return 0;
    var reward = item.kind === "mystery"
      ? item.range[0] + Math.floor(Math.random() * (item.range[1] - item.range[0] + 1))
      : item.kind === "gacha"
      ? pickTier(item.tiers)
      : item.value;
    s.points = (s.points || 0) - cost;
    s.red = s.red || {}; s.red[item.id] = periodNum(item.period);
    save(s);
    HL.bonus.add(reward, { source: "商城回饋" });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.notify) HL.notify.add({ ic: item.ic, title: t("點數商城", "點數商城"), text: t(item.name, item.name) + " " + money(reward) + " " + t("已入獎金錢包。", "已入獎金錢包。") });
    return reward;
  }

  function status() {
    return { points: points(), discount: discount(), items: visible().map(function (it) {
      return { id: it.id, ic: it.ic, name: it.name, cost: costOf(it), redeemable: redeemable(it), onCooldown: onCooldown(it), period: it.period,
               eligible: eligible(it), audience: audienceLabel(it) };
    }) };
  }

  var fmtLeft = HL.dom.dhm; // 倒數格式（d/h/m 級聯）收斂至 HL.dom.dhm（本輪淺審計 · 原與 reload 逐字同）

  function open() {
    var disc = discount();
    var modalRef;

    function card(item) {
      var cost = costOf(item);
      var cd = onCooldown(item);
      var afford = points() >= cost;
      var rewardLabel = item.kind === "mystery" ? (money(item.range[0]) + "–" + money(item.range[1]))
        : item.kind === "gacha" ? (money(item.tiers[0].value) + "–" + money(item.tiers[item.tiers.length - 1].value))
        : money(item.value);

      var sub;
      var ok = eligible(item);                     // #123：未解鎖＝可見但不可換（bet365 Loyalty Store 形制）
      if (!ok) {
        sub = el("small", { class: "ax-muted" }, [
          el("span", { text: t("解鎖條件", "解鎖條件") + " " }),
          el("b", { text: audienceLabel(item) })
        ]);
      } else if (cd) {
        sub = el("small", { class: "ax-muted" }, [
          el("span", { text: t(item.period === "weekly" ? "本週已兌換 · 下次" : "本日已兌換 · 下次", item.period === "weekly" ? "本週已兌換 · 下次" : "本日已兌換 · 下次") }),
          el("span", { text: " " + fmtLeft(msToNext(item.period)) })
        ]);
      } else {
        sub = el("small", { class: "ax-muted" }, [el("span", { text: t("獎勵", "獎勵") + " " }), el("b", { class: "ax-gold", text: rewardLabel })]);
      }

      var canBuy = ok && !cd && afford;
      var btn = el("button", { class: canBuy ? "ax-btn-primary" : "ax-btn-ghost", disabled: canBuy ? null : "disabled" },
        !ok ? [el("span", { text: t("🔒 未解鎖", "🔒 未解鎖") })]
           : cd ? [el("span", { text: t("已兌換 ✓", "已兌換 ✓") })]
           : [el("span", { text: t("兌換", "兌換") }), document.createTextNode(" " + cost + " "), el("span", { text: t("點", "點") })]);
      btn.addEventListener("click", function () {
        var got = redeem(item.id);
        if (got <= 0) return;
        if (modalRef && modalRef.close) modalRef.close();
        // 神秘獎勵包＝隨機額，走 #38 揭曉儀式（刮刮卡）；已同步入帳，動畫僅呈現
        if (item.kind === "mystery" && HL.reveal) {
          HL.reveal.show({ style: "scratch", title: item.ic + " " + t(item.name, item.name), ic: item.ic, amount: got, onDone: open });
        } else if (item.kind === "gacha" && HL.reveal) {
          // 機率型兌換＝加權抽層，走 #38 獎輪揭曉（賭一把的期待感）；已同步入帳，動畫僅呈現
          HL.reveal.show({ style: "wheel", title: item.ic + " " + t(item.name, item.name), ic: item.ic, amount: got, onDone: open });
        } else {
          HL.ui.toast(item.ic + " " + money(got) + " " + t("已入獎金錢包", "已入獎金錢包"), "ok");
          open();
        }
      });

      return el("div", { class: "ax-shop__card" + (canBuy ? " is-ready" : "") }, [
        el("div", { class: "ax-shop__head" }, [
          el("span", { class: "ax-shop__ic", text: item.ic }),
          el("div", {}, [
            el("div", { class: "ax-shop__name", text: t(item.name, item.name) }),
            el("small", { class: "ax-muted" }, [document.createTextNode(cost + " "), el("span", { text: t("點", "點") })])
          ])
        ]),
        sub,
        btn
      ]);
    }

    var cards = visible().map(card);

    modalRef = HL.ui.modal(t("🛍️ 點數商城", "🛍️ 點數商城"), [
      el("div", { class: "ax-shop" }, [
        el("div", { class: "ax-shop__bal" }, [
          el("span", { class: "ax-muted", text: t("我的點數", "我的點數") }),
          el("b", { class: "ax-gold" }, [el("span", { text: String(points()) }), el("span", { text: " " + t("點", "點") })])
        ]),
        disc > 0 ? el("small", { class: "ax-muted" }, [el("span", { text: t("VIP 折扣", "VIP 折扣") }), document.createTextNode(" −" + Math.round(disc * 100) + "%")]) : null,
        el("div", { class: "ax-shop__grid" }, cards),
        el("small", { class: "ax-muted", text: t("有效押注累積點數（每 NT$100 = 1 點）。兌換獎勵入獎金錢包，各品項有冷卻。", "有效押注累積點數（每 NT$100 = 1 點）。兌換獎勵入獎金錢包，各品項有冷卻。") }),
        el("button", { class: "ax-btn-ghost", text: t("前往領取中心 →", "前往領取中心 →"), onClick: function () { if (modalRef && modalRef.close) modalRef.close(); HL.bonus.open(); } }),
        el("span", { class: "ax-demo-tag", text: t("賺→逛→換 · 點數消耗端 · Demo", "賺→逛→換 · 點數消耗端 · Demo") })
      ])
    ]);
  }

  BUILTIN.forEach(register);                       // #123：內建品項與外部註冊者走同一道門

  HL.shop = { record: record, points: points, status: status, redeem: redeem, open: open,
              register: register, catalog: function () { return CATALOG.slice(); } };
})(window);

/*
 * Apex Win｜黃金之城 · 持久養成 meta 層 v1（自我進化引擎 #37）
 * 對標 Dorados（Lost City：玩 slot 賺 Coins → 分層 Upgrades 重建城市 → 每層解鎖里程碑）
 *   + BigPirate（Adventure Mode：Rum 蓋島升級、離線照跑、里程碑主獎）——雙平台共識的全新軸線。
 * ApexWin 所有留存機制（VIP/任務/連登/Reload/Lucky Spin）都在賭場「之內」；本檔補上賭場「之上」
 *   一層跨場、離線也保留、階梯升級的養成 meta 層：
 *   有效押注經中央掛鉤 HL.liveStats.record 累積「金磚」（每 NT$200 = 1 塊）→ 投入建設五階城市
 *   （營地→市集→港灣→神殿→王城）→ 每完成一階解鎖里程碑獎入 HL.bonus（揭曉儀式走 #38 HL.reveal）。
 * v1 僅基地養成；非對稱 PvP raid（搶資源/Shield 防守）依卡片規劃另開後續卡。
 * 純前端 localStorage（資源/進度離線保留）、零牌照。派彩採房規「同步記帳、動畫僅呈現」。
 * 註冊於 window.HL.base = { record, bricks, status, invest, open }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_BASE";
  var BRICK_PER = 200; // 每 NT$200 有效押注 = 1 塊金磚

  // 五階建設：need = 需投入金磚數；reward = 完成里程碑獎（入獎金錢包）
  var TIERS = [
    { ic: "⛺", name: "營地", need: 50, reward: 300 },
    { ic: "🏪", name: "市集", need: 150, reward: 1000 },
    { ic: "⚓", name: "港灣", need: 400, reward: 3000 },
    { ic: "🏛️", name: "神殿", need: 1000, reward: 8000 },
    { ic: "🏰", name: "王城", need: 2500, reward: 25000 }
  ];

  function load() { return HL.dom.lsGet(KEY, {}); }  // T20+站別命名空間（見 dom.js）
  function save(o) { HL.dom.lsSet(KEY, o); }

  // 中央掛鉤：有效押注累積金磚（存浮點、顯示/投入取整）
  function record(bet) {
    if (!bet || bet <= 0) return;
    var s = load(); s.bricks = (s.bricks || 0) + bet / BRICK_PER; save(s);
  }

  function bricks() { return Math.floor(load().bricks || 0); }

  function status() {
    var s = load();
    var tier = Math.min(s.tier || 0, TIERS.length);
    var doneAll = tier >= TIERS.length;
    var cur = doneAll ? null : TIERS[tier];
    var invested = doneAll ? 0 : Math.min(s.invested || 0, cur.need);
    return {
      bricks: bricks(), tier: tier, doneAll: doneAll,
      invested: invested, need: cur ? cur.need : 0,
      reward: cur ? cur.reward : 0, earned: s.earned || 0,
      investable: cur ? Math.min(bricks(), cur.need - invested) : 0
    };
  }

  // 投入金磚到當前階：一次投入 min(持有, 尚缺)。完成該階＝同步派里程碑獎。
  // 回傳 { amt, completed, reward, tierIdx } 或 null（無可投）。
  function invest() {
    var st = status();
    if (st.doneAll || st.investable <= 0) return null;
    var s = load();
    var amt = st.investable;
    s.bricks = (s.bricks || 0) - amt;
    s.invested = (s.invested || 0) + amt;
    var out = { amt: amt, completed: false, reward: 0, tierIdx: st.tier };
    if (s.invested >= TIERS[st.tier].need) {
      var reward = TIERS[st.tier].reward;
      s.tier = st.tier + 1; s.invested = 0;
      s.earned = (s.earned || 0) + reward;
      out.completed = true; out.reward = reward;
      save(s);
      HL.bonus.add(reward, { source: "黃金之城" }); // 同步記帳（揭曉動畫僅呈現）
      if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
      if (HL.notify) HL.notify.add({ ic: TIERS[st.tier].ic, title: t("黃金之城", "黃金之城"), text: t(TIERS[st.tier].name, TIERS[st.tier].name) + " " + t("建成！里程碑", "建成！里程碑") + " " + money(reward) + " " + t("已入獎金錢包。", "已入獎金錢包。") });
    } else {
      save(s);
    }
    return out;
  }

  var REVEAL_STYLES = ["bubble", "wheel", "scratch"]; // 各階輪換揭曉樣式

  function open() {
    var st = status();
    var modalRef;

    // 城市天際線：五階格（已建成亮、當前階脈動、未解鎖暗）
    var skyline = el("div", { class: "ax-base__sky" }, TIERS.map(function (tr, i) {
      var cls = "ax-base__cell" + (i < st.tier ? " is-done" : i === st.tier ? " is-cur" : " is-locked");
      return el("div", { class: cls }, [
        el("span", { class: "ax-base__cic", text: tr.ic }),
        el("small", { text: t(tr.name, tr.name) }),
        i < st.tier ? el("small", { class: "ax-base__chk", text: "✓" }) : null
      ]);
    }));

    var body;
    if (st.doneAll) {
      body = el("div", { class: "ax-base__doneall" }, [
        el("div", { class: "ax-base__congrats", text: t("🏆 黃金之城已建成！", "🏆 黃金之城已建成！") }),
        HL.ui.kv(t("累計里程碑獎勵", "累計里程碑獎勵"), money(st.earned), { valCls: "ax-gold" })
      ]);
    } else {
      var cur = TIERS[st.tier];
      var pct = Math.floor((st.invested / cur.need) * 100);
      var investBtn = el("button", { class: st.investable > 0 ? "ax-btn-primary" : "ax-btn-ghost", disabled: st.investable > 0 ? null : "disabled" },
        [el("span", { text: t("投入金磚", "投入金磚") }), document.createTextNode(" ×" + st.investable)]);
      investBtn.addEventListener("click", function () {
        var r = invest();
        if (!r) return;
        if (r.completed) {
          if (modalRef && modalRef.close) modalRef.close();
          if (HL.reveal) {
            HL.reveal.show({
              style: REVEAL_STYLES[r.tierIdx % REVEAL_STYLES.length],
              title: TIERS[r.tierIdx].ic + " " + t(TIERS[r.tierIdx].name, TIERS[r.tierIdx].name) + " " + t("建成！", "建成！"),
              ic: TIERS[r.tierIdx].ic, amount: r.reward,
              onDone: open
            });
          } else {
            HL.ui.toast(TIERS[r.tierIdx].ic + " " + money(r.reward) + " " + t("已入獎金錢包", "已入獎金錢包"), "ok");
            open();
          }
        } else {
          HL.ui.toast("🧱 +" + r.amt, "ok");
          if (modalRef && modalRef.close) modalRef.close();
          open();
        }
      });

      body = el("div", { class: "ax-base__cur" }, [
        el("div", { class: "ax-base__curhead" }, [
          el("span", { class: "ax-base__cic", text: cur.ic }),
          el("div", {}, [
            el("div", { class: "ax-base__cname" }, [el("span", { text: t("建設中：", "建設中：") }), el("span", { text: t(cur.name, cur.name) })]),
            el("small", { class: "ax-muted" }, [el("span", { text: t("完成獎勵", "完成獎勵") + " " }), el("b", { class: "ax-gold", text: money(cur.reward) })])
          ])
        ]),
        el("div", { class: "ax-base__bar" }, [el("div", { class: "ax-base__fill", style: "width:" + pct + "%" })]),
        el("small", { class: "ax-muted ax-base__pg" }, [
          el("span", { text: t("建設進度", "建設進度") + " " }),
          el("span", { text: st.invested + " / " + cur.need + " " }),
          el("span", { text: "(" + pct + "%)" })
        ]),
        investBtn
      ]);
    }

    modalRef = HL.ui.modal(t("🏰 黃金之城", "🏰 黃金之城"), [
      el("div", { class: "ax-base" }, [
        el("div", { class: "ax-base__bal" }, [
          el("span", { class: "ax-muted", text: t("我的金磚", "我的金磚") }),
          el("b", { class: "ax-gold" }, [el("span", { text: "🧱 " + st.bricks + " " }), el("span", { text: t("金磚", "金磚") })])
        ]),
        skyline,
        body,
        el("small", { class: "ax-muted", text: t("有效押注累積金磚（每 NT$200 = 1 塊）。投入建設，每完成一階領里程碑獎入獎金錢包，進度離線保留。", "有效押注累積金磚（每 NT$200 = 1 塊）。投入建設，每完成一階領里程碑獎入獎金錢包，進度離線保留。") }),
        el("span", { class: "ax-demo-tag", text: t("賺金磚 → 蓋城市 → 領里程碑 · Demo", "賺金磚 → 蓋城市 → 領里程碑 · Demo") })
      ])
    ]);
  }

  HL.base = { record: record, bricks: bricks, status: status, invest: invest, open: open };
})(window);

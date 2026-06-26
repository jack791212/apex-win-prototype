/*
 * Apex Win｜每日 Lucky Spin 幸運轉盤（自我進化引擎 #17）
 * 對標 BC.Game Lucky Spin / Stake Wheel：每 24h 一次免費轉，獎品依 VIP 等級放大，
 * 中獎入獎金錢包 HL.bonus。純前端 localStorage daily gate（同 rewards.js 模式）。
 * 結算採「同步記帳」保證不漏（動畫僅視覺呈現，背景分頁節流也不影響派彩）。
 * 註冊於 window.HL.luckyspin = { status, spin, open }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_LUCKYSPIN";

  // 8 段獎品（基礎遊戲幣）＋命中權重（越大越罕見，權重和＝100）
  var SEG = [
    { amt: 50, w: 26 }, { amt: 100, w: 22 }, { amt: 150, w: 16 }, { amt: 250, w: 12 },
    { amt: 400, w: 9 }, { amt: 600, w: 7 }, { amt: 1000, w: 5 }, { amt: 2000, w: 3 }
  ];
  var COLORS = ["#7c3aed", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777"];
  var VIP_MULT = [1, 1.2, 1.5, 2, 3]; // 青銅→鑽石：等級越高獎品越大
  var SLICE = 360 / SEG.length;

  function dayNum() { return Math.floor(Date.now() / 86400000); }
  function load() { try { return JSON.parse(global.localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(o) { try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function vipIdx() { return HL.vip ? HL.vip.status().index : 0; }
  function mult() { return VIP_MULT[Math.min(vipIdx(), VIP_MULT.length - 1)]; }
  function prizeAt(i) { return Math.round(SEG[i].amt * mult()); }

  function status() {
    var s = load(), d = dayNum();
    var spunToday = s.lastDay === d;
    return { spunToday: spunToday, canSpin: !spunToday, mult: mult() };
  }

  // 加權抽一段
  function pick() {
    var total = 0, i; for (i = 0; i < SEG.length; i++) total += SEG[i].w;
    var r = Math.random() * total, acc = 0;
    for (i = 0; i < SEG.length; i++) { acc += SEG[i].w; if (r < acc) return i; }
    return SEG.length - 1;
  }

  // 執行一次轉動：同步記帳（設每日閘 + 派彩入獎金錢包）。回傳 {index, reward} 或 null
  function spin() {
    if (!status().canSpin) return null;
    var idx = pick(), reward = prizeAt(idx);
    save({ lastDay: dayNum() });
    HL.bonus.add(reward);
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.notify) HL.notify.add({ ic: "🎡", title: "每日幸運轉盤", text: "今日轉到 " + money(reward) + " 已入獎金錢包。" });
    return { index: idx, reward: reward };
  }

  // 轉盤色盤（conic-gradient，從頂端順時針，每段 SLICE 度）
  function wheelGradient() {
    var stops = [];
    for (var i = 0; i < SEG.length; i++) stops.push(COLORS[i] + " " + (i * SLICE) + "deg " + ((i + 1) * SLICE) + "deg");
    return "conic-gradient(" + stops.join(",") + ")";
  }

  function open() {
    var st = status();
    var wheel = el("div", { class: "ax-spin__wheel", style: "background:" + wheelGradient() + ";transform:rotate(0deg)" });
    var stage = el("div", { class: "ax-spin__stage" }, [
      el("div", { class: "ax-spin__pointer" }),
      wheel,
      el("div", { class: "ax-spin__hub", text: "🎡" })
    ]);

    // 獎品圖例（依 VIP 放大後的金額），與色盤同序，可高亮中獎段
    var legRows = SEG.map(function (s, i) {
      return el("div", { class: "ax-spin__leg", "data-i": i }, [
        el("span", { class: "ax-spin__sw", style: "background:" + COLORS[i] }),
        el("b", { text: money(prizeAt(i)) })
      ]);
    });
    var legend = el("div", { class: "ax-spin__legend" }, legRows);

    var btn = el("button", {
      class: st.canSpin ? "ax-btn-primary" : "ax-btn-ghost",
      text: st.canSpin ? t("立即免費轉", "立即免費轉") : t("今日已轉，明天再來", "今日已轉，明天再來"),
      disabled: st.canSpin ? null : "disabled"
    });

    var spinning = false;
    btn.addEventListener("click", function () {
      if (spinning || !status().canSpin) return;
      var res = spin(); // 同步記帳（先派彩、設每日閘），動畫只是呈現
      if (!res) return;
      spinning = true;
      btn.setAttribute("disabled", "disabled");
      btn.textContent = t("轉動中…", "轉動中…");
      btn.className = "ax-btn-ghost";
      // 目標旋轉：多轉幾圈 + 讓中獎段中心落到頂端指針
      var center = res.index * SLICE + SLICE / 2;
      var target = 360 * 6 + ((360 - center) % 360);
      wheel.style.transform = "rotate(" + target + "deg)";
      // 單一閘門保證收尾（背景分頁節流也會觸發）
      global.setTimeout(function () {
        var hit = legend.querySelector('.ax-spin__leg[data-i="' + res.index + '"]');
        if (hit) hit.classList.add("is-hit");
        btn.textContent = t("今日已轉 ✓", "今日已轉 ✓");
        HL.ui.toast("🎡 " + money(res.reward) + " 已入獎金錢包", "ok");
        spinning = false;
      }, 4200);
    });

    HL.ui.modal(t("🎡 每日幸運轉盤", "🎡 每日幸運轉盤"), [
      el("div", { class: "ax-spin" }, [
        stage,
        el("div", { class: "ax-spin__hint", text: t("獎品依 VIP 等級放大", "獎品依 VIP 等級放大") + "（×" + st.mult + "）" }),
        legend,
        btn,
        el("span", { class: "ax-demo-tag", text: t("每日一次免費 · 中獎入獎金錢包 · Demo", "每日一次免費 · 中獎入獎金錢包 · Demo") })
      ])
    ]);
  }

  HL.luckyspin = { status: status, spin: spin, open: open };
})(window);

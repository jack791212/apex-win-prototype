/*
 * Apex Win｜餘額歸零救濟金 Faucet（自我進化引擎 #39）
 * 對標 Courtside（餘額歸零自動補回 1,000 Coins）+ CoinsBack（Faucet 續命幣）——雙平台共識、
 *   ApexWin 全空白的「防流失鉤子」：免費玩家餘額玩到見底就流失，缺一條把人留住的續命線。
 * 玩法：當可玩餘額 ≤ 門檻（NT$100）時，右下方浮現救濟金藥丸；每 8 小時可領一次一筆固定續命金
 *   （NT$1,000）。與 Courtside 一致＝直接補進「可玩主餘額」（不是入獎金錢包，救濟金的意義就是「馬上能玩」），
 *   故走 HL.state.set 直接記帳。冷卻中則顯示倒數；餘額充足時藥丸自動收起。
 * UI：右下角藥丸（自管 boot interval，不依賴切頁會清空的 HL.ticker；位置左移避開 #28 啟用禮藥丸）。
 * 純前端 localStorage、零牌照。既有登入頁閘（會員模式未登入不掛，沿用 #28 gated 邏輯）。
 * 註冊於 window.HL.faucet = { status, claim, eligible, open }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_FAUCET";
  var THRESHOLD = 100;            // 可玩餘額 ≤ 此值＝算「見底」，才給救濟
  var RELIEF = 1000;              // 每次救濟金額（對標 Courtside 1,000）
  var COOLDOWN_MS = 8 * 3600000;  // 每 8 小時一次

  function load() { return HL.dom.lsGet(KEY, {}); }  // T20+站別命名空間（見 dom.js）
  function save(o) { HL.dom.lsSet(KEY, o); }

  // 會員模式且未登入（登入頁）＝閘住不掛（沿用 #28 onboarding 的 gated 邏輯）
  function gated() {
    try { return !!(HL.auth && HL.auth.backend && HL.auth.backend() && !(HL.auth.user && HL.auth.user())); } catch (e) { return false; }
  }
  function bal() { try { return HL.state.get().balance || 0; } catch (e) { return 0; } }
  function msToNext() { var s = load(); return Math.max(0, (s.last || 0) + COOLDOWN_MS - Date.now()); }
  function offCooldown() { return msToNext() <= 0; }
  function low() { return bal() <= THRESHOLD; }
  // 可領＝餘額見底 且 冷卻已過
  function eligible() { return low() && offCooldown(); }

  function status() {
    return { balance: bal(), threshold: THRESHOLD, relief: RELIEF, low: low(), offCooldown: offCooldown(), eligible: eligible(), msToNext: msToNext() };
  }

  // 領取：直接補進可玩主餘額（救濟金＝馬上能玩，非入獎金錢包）。回傳金額或 0。
  function claim() {
    if (!eligible()) return 0;
    var s = load(); s.last = Date.now(); save(s);
    HL.state.set({ balance: bal() + RELIEF });
    if (HL.ledger) HL.ledger.record("faucet", RELIEF, {}); // 營運帳本：救濟金＝無上限送幣成本
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.notify) HL.notify.add({ ic: "💧", title: t("救濟金", "救濟金"), text: t("救濟金", "救濟金") + " " + money(RELIEF) + " " + t("已入主餘額", "已入主餘額") });
    renderPill();
    return RELIEF;
  }

  var fmtLeft = HL.dom.hms; // 倒數格式（h/m/s 級聯）收斂至 HL.dom.hms（本輪淺審計 · 原與 onboarding 逐字同、happyhour 僅冗餘括號）

  /* ---------------- 救濟金 modal（狀態即時刷新） ---------------- */
  function open() {
    var modalRef;
    var st = status();
    var cdNode = el("span", { text: fmtLeft(st.msToNext) });
    var claimBtn = el("button", { class: st.eligible ? "ax-btn-primary" : "ax-btn-ghost", disabled: st.eligible ? null : "disabled" },
      [el("span", { text: t("領救濟金", "領救濟金") }), document.createTextNode(" " + money(RELIEF))]);
    claimBtn.addEventListener("click", function () {
      var got = claim();
      if (got > 0) { HL.ui.toast("💧 " + money(got) + " " + t("已入主餘額", "已入主餘額"), "ok"); if (modalRef && modalRef.close) modalRef.close(); }
    });
    // 冷卻/餘額狀態行（語言中性倒數值另置文字節點）
    var stateRow;
    if (st.eligible) {
      stateRow = el("small", { class: "ax-muted" }, [el("span", { text: t("餘額見底，可領救濟金續玩", "餘額見底，可領救濟金續玩") })]);
    } else if (!st.low) {
      stateRow = el("small", { class: "ax-muted" }, [el("span", { text: t("餘額充足時無需領取。", "餘額充足時無需領取。") })]);
    } else {
      stateRow = el("small", { class: "ax-muted" }, [el("span", { text: t("下次可領倒數：", "下次可領倒數：") }), cdNode]);
    }

    // 每秒刷新（冷卻倒數 + 領取鈕狀態；節點離場自動停）
    var iv = global.setInterval(function () {
      if (!document.body.contains(claimBtn)) { global.clearInterval(iv); return; }
      var now = status();
      cdNode.textContent = fmtLeft(now.msToNext);
      claimBtn.className = now.eligible ? "ax-btn-primary" : "ax-btn-ghost";
      if (now.eligible) claimBtn.removeAttribute("disabled"); else claimBtn.setAttribute("disabled", "disabled");
    }, 1000);

    modalRef = HL.ui.modal(t("💧 餘額救濟金", "💧 餘額救濟金"), [
      el("div", { class: "ax-onb" }, [
        HL.ui.kv(t("目前可玩餘額", "目前可玩餘額"), money(st.balance), { valCls: "ax-gold" }),
        stateRow,
        claimBtn,
        el("small", { class: "ax-muted", text: t("餘額不足時可領一筆救濟金續玩，每 8 小時一次。", "餘額不足時可領一筆救濟金續玩，每 8 小時一次。") }),
        el("span", { class: "ax-demo-tag", text: t("餘額歸零救濟 · 防流失鉤子 · Demo", "餘額歸零救濟 · 防流失鉤子 · Demo") })
      ])
    ]);
  }

  /* ---------------- 右下角救濟金藥丸（boot interval 驅動；位置左移避開啟用禮藥丸） ---------------- */
  var pillEl = null, pillCd = null, pillLabel = null, pillLang = null;
  function teardownPill() {
    if (pillEl && pillEl.parentNode) pillEl.parentNode.removeChild(pillEl);
    pillEl = null; pillCd = null; pillLabel = null;
  }
  function renderPill() {
    if (gated() || !low()) { teardownPill(); return; } // 只在餘額見底時浮現
    if (!pillEl) {
      pillCd = el("span", { class: "ax-onb-pill__cd" });
      pillLabel = el("span", { text: t("救濟金", "救濟金") });
      pillLang = HL.lang || null;
      pillEl = el("button", { class: "ax-onb-pill ax-faucet-pill", onClick: open }, [el("span", { text: "💧 " }), pillLabel, pillCd]);
      document.body.appendChild(pillEl);
    }
    // 語言切換：藥丸在 #app 之外、不受重繪——重置標籤原文交翻譯層重譯（沿用 #28）
    if (pillLang !== (HL.lang || null)) { pillLang = HL.lang || null; pillLabel.textContent = t("救濟金", "救濟金"); }
    if (eligible()) { pillCd.textContent = ""; pillEl.classList.add("is-ready"); }
    else { pillCd.textContent = " " + fmtLeft(msToNext()); pillEl.classList.remove("is-ready"); }
  }

  var bootTimer = null;
  function bootTick() {
    if (gated()) { teardownPill(); return; }
    renderPill();
  }
  function boot() { bootTick(); if (!bootTimer) bootTimer = global.setInterval(bootTick, 1500); }
  if (document.readyState === "loading") global.addEventListener("DOMContentLoaded", boot);
  else boot();

  HL.faucet = { status: status, claim: claim, eligible: eligible, open: open };
})(window);

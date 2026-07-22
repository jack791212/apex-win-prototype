/*
 * Apex Win｜新手限時啟用窗口（自我進化引擎 #28）
 * 對標 Gamdom（登入後底部 6 小時啟用倒數窗口）——提升首日轉化的低成本鉤子。
 * 玩法：進入主 shell 起算 6 小時窗口，窗口內完成兩件事——①完成首注（任一遊戲下注，經中央掛鉤）
 *   ②完成每日簽到 → 即可領「啟用大禮包」入獎金錢包 HL.bonus（領取走 #38 HL.reveal 揭曉儀式；
 *   房規：先同步入帳、動畫僅呈現）。逾期未領＝窗口關閉、不補發。
 * 審查修正（#28 對抗性審查）：①簽到任務「閂鎖」進本地狀態（否則跨日翻轉會撤銷已完成任務、獎勵懸空）
 *   ②會員模式登入頁不起算、不掛藥丸（登入後才開窗，避免窗口在無法完成任務的畫面燒掉）
 *   ③modal 任務列/領取鈕隨狀態即時刷新（非開窗快照）④語言切換時藥丸標籤重置供翻譯層重譯。
 * UI：右下角倒數藥丸（自管 boot interval，不依賴切頁會清空的 HL.ticker），點開任務清單 modal。
 * 純前端 localStorage；既有使用者首次載入本版時同樣起算一次（demo 展示用，可完整看到此功能）。
 * 註冊於 window.HL.onboard = { record, status, claim, open }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_ONBOARD";
  var WINDOW_MS = 6 * 3600000; // 6 小時啟用窗口
  var REWARD = 500;            // 啟用大禮包（入獎金錢包）

  function load() { try { return JSON.parse(global.localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(o) { try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  // 會員模式且未登入（登入頁）＝閘住：不起算、不掛藥丸（登入頁無法完成任務，窗口不該燒）
  function gated() {
    try { return !!(HL.auth && HL.auth.backend && HL.auth.backend() && !(HL.auth.user && HL.auth.user())); } catch (e) { return false; }
  }
  function ensure() { var s = load(); if (!s.start && !gated()) { s.start = Date.now(); save(s); } return s; }

  function status() {
    var s = load();
    if (!s.start) return { active: false, notStarted: true, msLeft: 0, claimed: false, expired: false, wagered: false, checkedIn: false, claimable: false, reward: REWARD };
    // 簽到任務閂鎖：窗口內一旦完成就寫死進本地狀態（跨日翻轉不撤銷——rewards 的 claimedToday 是日序即時判定）
    var msLeft = Math.max(0, s.start + WINDOW_MS - Date.now());
    var active = !s.claimed && msLeft > 0;
    if (active && !s.checkedIn && HL.rewards && HL.rewards.status && HL.rewards.status().claimedToday) { s.checkedIn = true; save(s); }
    return {
      active: active, msLeft: msLeft, claimed: !!s.claimed, expired: !s.claimed && msLeft <= 0,
      wagered: !!s.wagered, checkedIn: !!s.checkedIn,
      claimable: active && !!s.wagered && !!s.checkedIn, reward: REWARD
    };
  }

  // 中央掛鉤：窗口內任一有效押注＝完成「首注」任務（閂鎖）
  function record(bet) {
    if (!bet || bet <= 0) return;
    var st = status();
    if (!st.active || st.wagered) return;
    var s = load(); s.wagered = true; save(s);
    renderPill();
  }

  // 領取：同步入帳（揭曉動畫僅呈現）。回傳金額或 0。
  function claim() {
    var st = status();
    if (!st.claimable) return 0;
    var s = load(); s.claimed = true; save(s);
    HL.bonus.add(REWARD);
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.notify) HL.notify.add({ ic: "🎁", title: t("新手啟用大禮包", "新手啟用大禮包"), text: t("啟用大禮包", "啟用大禮包") + " " + money(REWARD) + " " + t("已入獎金錢包。", "已入獎金錢包。") });
    renderPill();
    return REWARD;
  }

  var fmtLeft = HL.dom.hms; // 倒數格式（h/m/s 級聯）收斂至 HL.dom.hms（本輪淺審計 · 原與 faucet 逐字同）

  /* ---------------- 任務清單 modal（狀態即時刷新，非開窗快照） ---------------- */
  function open() {
    var st = status();
    var modalRef;
    var body;
    if (st.claimed) {
      body = [el("div", { class: "ax-onb__done" }, [el("span", { text: t("已領取 ✓", "已領取 ✓") })])];
    } else if (st.expired || st.notStarted) {
      body = [el("div", { class: "ax-onb__done" }, [el("span", { text: t("啟用窗口已結束", "啟用窗口已結束") })])];
    } else {
      var cd = el("span", { text: fmtLeft(st.msLeft) });
      var chk1 = el("span", { class: "ax-onb__chk", text: st.wagered ? "✅" : "⬜" });
      var row1 = el("div", { class: "ax-onb__task" + (st.wagered ? " is-done" : "") }, [chk1, el("span", { text: t("完成首注（任一遊戲下注一次）", "完成首注（任一遊戲下注一次）") })]);
      var chk2 = el("span", { class: "ax-onb__chk", text: st.checkedIn ? "✅" : "⬜" });
      var row2 = el("div", { class: "ax-onb__task" + (st.checkedIn ? " is-done" : "") }, [chk2, el("span", { text: t("完成每日簽到", "完成每日簽到") })]);
      var claimBtn = el("button", { class: st.claimable ? "ax-btn-primary" : "ax-btn-ghost", disabled: st.claimable ? null : "disabled" },
        [el("span", { text: t("領取啟用大禮包", "領取啟用大禮包") }), document.createTextNode(" " + money(st.reward))]);
      claimBtn.addEventListener("click", function () {
        var got = claim();
        if (got <= 0) return;
        if (modalRef && modalRef.close) modalRef.close();
        if (HL.reveal) HL.reveal.show({ style: "bubble", title: t("🎁 新手啟用大禮包", "🎁 新手啟用大禮包"), ic: "🎁", amount: got });
        else HL.ui.toast("🎁 " + money(got) + " " + t("已入獎金錢包", "已入獎金錢包"), "ok");
      });
      body = [
        el("div", { class: "ax-onb__cd" }, [el("span", { class: "ax-muted", text: t("剩餘時間", "剩餘時間") }), el("b", { class: "ax-gold" }, [cd])]),
        row1, row2,
        st.checkedIn ? null : el("button", { class: "ax-btn-ghost", text: t("去簽到 →", "去簽到 →"), onClick: function () { if (modalRef && modalRef.close) modalRef.close(); if (HL.rewards && HL.rewards.open) HL.rewards.open(); } }),
        claimBtn
      ];
      // 每秒同步：倒數 + 任務列 + 領取鈕（節點離場自動停；窗口結束自動關）
      var iv = global.setInterval(function () {
        if (!document.body.contains(cd)) { global.clearInterval(iv); return; }
        var now = status();
        cd.textContent = fmtLeft(now.msLeft);
        chk1.textContent = now.wagered ? "✅" : "⬜"; row1.classList.toggle("is-done", now.wagered);
        chk2.textContent = now.checkedIn ? "✅" : "⬜"; row2.classList.toggle("is-done", now.checkedIn);
        claimBtn.className = now.claimable ? "ax-btn-primary" : "ax-btn-ghost";
        if (now.claimable) claimBtn.removeAttribute("disabled"); else claimBtn.setAttribute("disabled", "disabled");
        if (!now.active) { global.clearInterval(iv); if (modalRef && modalRef.close) modalRef.close(); renderPill(); }
      }, 1000);
    }
    modalRef = HL.ui.modal(t("⏳ 新手啟用大禮包", "⏳ 新手啟用大禮包"), [
      el("div", { class: "ax-onb" }, body.filter(Boolean).concat([
        el("small", { class: "ax-muted", text: t("進站 6 小時內完成兩項任務，即可領取啟用大禮包（入獎金錢包）。逾期不補發。", "進站 6 小時內完成兩項任務，即可領取啟用大禮包（入獎金錢包）。逾期不補發。") }),
        el("span", { class: "ax-demo-tag", text: t("限時啟用窗口 · 首日轉化鉤子 · Demo", "限時啟用窗口 · 首日轉化鉤子 · Demo") })
      ]))
    ]);
  }

  /* ---------------- 右下角倒數藥丸（boot interval 統一驅動生命週期） ---------------- */
  var pillEl = null, pillCd = null, pillLabel = null, pillLang = null;
  function teardownPill() {
    if (pillEl && pillEl.parentNode) pillEl.parentNode.removeChild(pillEl);
    pillEl = null; pillCd = null; pillLabel = null;
  }
  function renderPill() {
    if (gated()) { teardownPill(); return; }
    var st = status();
    if (!st.active) { teardownPill(); return; }
    if (!pillEl) {
      pillCd = el("span", { class: "ax-onb-pill__cd" });
      pillLabel = el("span", { text: t("啟用禮", "啟用禮") });
      pillLang = HL.lang || null;
      pillEl = el("button", { class: "ax-onb-pill", onClick: open }, [el("span", { text: "🎁 " }), pillLabel, pillCd]);
      document.body.appendChild(pillEl);
    }
    // 語言切換：藥丸在 #app 之外、不受 HL.app.refresh 重繪——重置標籤原文，交給翻譯層（observer）重譯
    if (pillLang !== (HL.lang || null)) { pillLang = HL.lang || null; pillLabel.textContent = t("啟用禮", "啟用禮"); }
    pillCd.textContent = " " + fmtLeft(st.msLeft);
    pillEl.classList.toggle("is-ready", st.claimable);
  }

  // boot：每 1.5s 驅動（登入前閘住不起算；登入後自動起算+掛藥丸；claim/expiry 後收尾停止）
  var bootTimer = null;
  function bootTick() {
    if (gated()) { teardownPill(); return; }   // 尚未登入：不起算、不掛（保留 timer 等登入）
    ensure();
    var st = status();
    renderPill();
    if (st.claimed || st.expired) { teardownPill(); if (bootTimer) { global.clearInterval(bootTimer); bootTimer = null; } }
  }
  function boot() { bootTick(); if (!bootTimer) bootTimer = global.setInterval(bootTick, 1500); }
  if (document.readyState === "loading") global.addEventListener("DOMContentLoaded", boot);
  else boot();

  HL.onboard = { record: record, status: status, claim: claim, open: open };
})(window);

/*
 * Apex Win｜兌換碼 Redeem Code / Promo（自我進化引擎 #19）
 * 對標 BC.Game Shitcode：輸入碼即領 bonus，經典低成本拉新/回流鉤子。
 * 純前端 localStorage：內嵌碼表（金額 + 可選到期日），每碼每裝置限領一次。
 * 派彩走獎金錢包 HL.bonus.add（與 #17 Lucky Spin / #18 Raffle 同口徑，
 *   待 #20 流水引擎上線後所有 bonus 來源一併受流水約束、無須改本檔）。
 * 註冊於 window.HL.redeem = { redeem, open }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  var KEY = "HL_REDEEM";

  // 內嵌碼表（key 一律大寫）：amount=遊戲幣、exp=到期日(YYYY-MM-DD，null=永久)
  var CODES = {
    "WELCOME100": { amount: 100, exp: null },
    "APEXWIN":    { amount: 500, exp: null },
    "LUCKY888":   { amount: 888, exp: null },
    "WEEKEND300": { amount: 300, exp: null },
    "VIPBOOST":   { amount: 1000, exp: null }
  };

  function norm(c) { return String(c || "").trim().toUpperCase(); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function load() { try { return JSON.parse(global.localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(o) { try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  // 嘗試兌換一組碼。回傳 { ok, amount, reason }
  //   reason ∈ empty | invalid | expired | claimed | ok
  function redeem(raw) {
    var code = norm(raw);
    if (!code) return { ok: false, reason: "empty" };
    var def = CODES[code];
    if (!def) return { ok: false, reason: "invalid" };
    if (def.exp && today() > def.exp) return { ok: false, reason: "expired" };
    var claimed = load();
    if (claimed[code]) return { ok: false, reason: "claimed" };
    // 記帳：先標已領（冪等），再派彩入獎金錢包
    claimed[code] = today();
    save(claimed);
    if (HL.bonus) HL.bonus.add(def.amount);
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    if (HL.notify) HL.notify.add({ ic: "🎫", title: t("兌換碼", "兌換碼"), text: t("兌換成功", "兌換成功") + "：" + code + " · " + money(def.amount) });
    return { ok: true, amount: def.amount, reason: "ok" };
  }

  function open() {
    var claimed = load();
    var input = el("input", { class: "ax-input", type: "text", placeholder: t("輸入兌換碼", "輸入兌換碼"), autocomplete: "off", spellcheck: "false" });
    var msg = el("div", { class: "ax-redeem__msg ax-muted", text: t("輸入活動兌換碼領取獎金", "輸入活動兌換碼領取獎金") });

    function history() {
      var keys = Object.keys(claimed);
      if (!keys.length) return el("small", { class: "ax-muted", text: t("尚無兌換紀錄。", "尚無兌換紀錄。") });
      return el("div", { class: "ax-redeem__hist" }, keys.map(function (k) {
        return el("div", { class: "ax-redeem__row" }, [el("code", { text: k }), el("small", { class: "ax-muted", text: claimed[k] })]);
      }));
    }
    var hist = el("div", {}, [history()]);

    function refreshHist() { claimed = load(); hist.innerHTML = ""; hist.appendChild(history()); }

    function submit() {
      var r = redeem(input.value);
      if (r.ok) {
        msg.className = "ax-redeem__msg ax-gold";
        msg.textContent = "🎉 " + t("兌換成功", "兌換成功") + " · " + money(r.amount) + " " + t("已入獎金錢包", "已入獎金錢包");
        HL.ui.toast("🎫 " + money(r.amount) + " " + t("已入獎金錢包", "已入獎金錢包"), "ok");
        input.value = "";
        refreshHist();
      } else {
        var rm = {
          empty:   t("請先輸入兌換碼。", "請先輸入兌換碼。"),
          invalid: t("兌換碼無效。", "兌換碼無效。"),
          expired: t("兌換碼已過期。", "兌換碼已過期。"),
          claimed: t("這組兌換碼已經領取過了。", "這組兌換碼已經領取過了。")
        };
        msg.className = "ax-redeem__msg ax-red";
        msg.textContent = "⚠️ " + (rm[r.reason] || rm.invalid);
      }
    }

    var btn = el("button", { class: "ax-btn-primary", text: t("兌換", "兌換"), onClick: submit });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); submit(); } });

    HL.ui.modal(t("🎫 兌換碼", "🎫 兌換碼"), [
      el("div", { class: "ax-redeem" }, [
        el("div", { class: "ax-redeem__form" }, [input, btn]),
        msg,
        el("div", { class: "ax-redeem__histwrap" }, [
          el("div", { class: "ax-muted", text: t("我的兌換紀錄", "我的兌換紀錄") }),
          hist
        ]),
        el("span", { class: "ax-demo-tag", text: t("輸入碼即領 · 每碼限領一次 · 中獎入獎金錢包 · Demo", "輸入碼即領 · 每碼限領一次 · 中獎入獎金錢包 · Demo") })
      ])
    ]);
    global.setTimeout(function () { try { input.focus(); } catch (e) {} }, 60);
  }

  HL.redeem = { redeem: redeem, open: open };
})(window);

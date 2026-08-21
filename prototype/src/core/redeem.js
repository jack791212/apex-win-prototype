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

  /* 內嵌碼表（key 一律大寫）：amount=遊戲幣、exp=到期日(YYYY-MM-DD，null=永久)、
   *   audience=可選的領取資格述詞（#107，形狀 { kind, arg }，與 #54/#49 同一套詞彙）。
   * ⚠️ 受眾述詞**一律向 HL.release.AUDIENCES 求**，本檔不自建第二張表、不自刻任何門檻數字
   *   （常駐鎖 `platform/audience-single-vocabulary`）。加一種資格＝去 release.js 加一筆。
   * 既有五組碼刻意**不加 audience**＝行為逐位不變（零回歸靠「欄位不存在」，不靠比對）。 */
  var CODES = {
    "WELCOME100": { amount: 100, exp: null },
    "APEXWIN":    { amount: 500, exp: null },
    "LUCKY888":   { amount: 888, exp: null },
    "WEEKEND300": { amount: 300, exp: null },
    "VIPBOOST":   { amount: 1000, exp: null },
    // ↓ #107 首兩組資格碼：對標 Stake Bonus Drops（「過去 N 天押注達標才領得到」）與新手回流碼。
    //   刻意給小額＝本卡要證明的是資格閘存在，不是加碼送幣（§11 真站送幣成本方向）。
    "FIRSTWEEK":  { amount: 200, exp: null, audience: { kind: "newcomer", arg: 7 } },
    "GRIND500":   { amount: 150, exp: null, audience: { kind: "wagered7", arg: 500 } }
  };

  function norm(c) { return String(c || "").trim().toUpperCase(); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function load() { return HL.dom.lsGet(KEY, {}); }  // T20+站別命名空間（見 dom.js）
  function save(o) { HL.dom.lsSet(KEY, o); }

  /* #107 資格閘：述詞與 ctx 都向 HL.release 求（唯一詞彙），本檔只負責「什麼時候問」。
   * 時機語意＝**領取當下**（與 #54 的「只在搶先期問」、#49 的「整段窗口都問」並列為第三種）。
   * fail-closed：宣告了 audience 但 release.js 未載入 ⇒ 不放行（寧可少發，不要在載入競態下漏發）。 */
  function eligible(def) {
    if (!def || !def.audience) return true;
    if (!(HL.release && HL.release.matches)) return false;
    return HL.release.matches(def.audience, HL.release.audienceCtx());
  }
  function audienceLabel(def) {
    if (!def || !def.audience) return "";
    return (HL.release && HL.release.audienceLabelOf) ? HL.release.audienceLabelOf(def.audience) : "";
  }

  // 嘗試兌換一組碼。回傳 { ok, amount, reason, audience }
  //   reason ∈ empty | invalid | expired | ineligible | claimed | ok
  function redeem(raw) {
    var code = norm(raw);
    if (!code) return { ok: false, reason: "empty" };
    var def = CODES[code];
    if (!def) return { ok: false, reason: "invalid" };
    if (def.exp && today() > def.exp) return { ok: false, reason: "expired" };
    /* 資格先於「已領取」判定：兩者都不放行，但訊息不同——
     * 不符資格的人重試一次是合理的（明天就可能符合），已領取的人重試永遠沒用。 */
    if (!eligible(def)) return { ok: false, reason: "ineligible", audience: audienceLabel(def) };
    var claimed = load();
    if (claimed[code]) return { ok: false, reason: "claimed" };
    // 記帳：先標已領（冪等），再派彩入獎金錢包
    claimed[code] = today();
    save(claimed);
    if (HL.bonus) HL.bonus.add(def.amount, { source: "兌換碼" });
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
          claimed: t("這組兌換碼已經領取過了。", "這組兌換碼已經領取過了。"),
          // #107：不符資格時要說清楚「誰才領得到」，否則玩家只會以為碼是假的（同 #54 explain 的紀律）
          ineligible: t("這組兌換碼有領取資格限制，目前僅限：", "這組兌換碼有領取資格限制，目前僅限：")
        };
        msg.className = "ax-redeem__msg ax-red";
        /* P3 契約：翻譯只發生在「整個文字節點等於一條字典 key」時 ⇒ 把「⚠️ 」與片語拆成兩個節點，
         * 片語才自成一個等於 key 的節點。（原本 "⚠️ " + 片語 是單一節點，五種錯誤訊息其實一句都翻不到。）*/
        msg.textContent = "";
        msg.appendChild(document.createTextNode("⚠️ "));
        msg.appendChild(el("span", { text: rm[r.reason] || rm.invalid }));
        // 受眾標籤本身已由 HL.release 逐段以 t() 組好（片語＋純數字），故作為值另起一個節點呈現
        if (r.reason === "ineligible" && r.audience) msg.appendChild(el("b", { class: "ax-gold", text: " " + r.audience }));
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

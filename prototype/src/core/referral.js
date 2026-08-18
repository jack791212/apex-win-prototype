/*
 * Apex Win｜推薦 / 邀請好友 HL.referral（自我進化引擎 #58 · 病毒成長軸首次開通）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 WOW Vegas（雙方各得獎勵）＋ SpinBlitz（依被推薦人里程碑**分階段釋放**，非註冊即發）。
 * 本檔＝**殼層**：邀請碼、分享連結、`?ref=` 落地歸因、好友清單、領獎、面板、日曆接線。
 * 所有「可算錯」的算術（碼、歸因、分階、冪等、真站獎額）全在 `core/referral-core.js`
 *   （`HL.refCore`，純函式、node 可 require）——node 驗的就是這裡跑的那一份。
 *
 * ─────────── ⚠️ 本卡最重要的一條結構事實（實作時才查獲，值得後手先讀） ───────────
 * 純前端**沒有任何通道**讓「我的裝置」知道有人用我的碼註冊了：被邀請者的歸因寫在
 *   **他自己的 localStorage** 裡，兩台裝置之間沒有任何連線。⇒ **真站的好友清單結構上恆為空**，
 *   推薦人側的獎勵在真站**根本無從觸發**（不是「暫時沒人用」，是永遠不會有資料）。
 *   而被推薦人側若照發，等於「自己貼一個碼給自己就領錢」＝**無限印幣**（§11 明令避免）。
 * ⇒ 依 #57 立下的先例：**真站在沒有伺服器見證者（attestor）時據實不供應推薦獎勵**，
 *   面板明說原因，而**不是**靜默退化成「碼照給、獎照發」——那會讓規則在真站反向卻長得一模一樣。
 *   **歸因本身仍然照記**（記錄不等於付款；那是未來後端結算的唯一依據，且寫一次不可覆寫）。
 *   接上後端那天：`HL.referral.setAttestor(fn)` 一行即恢復供應——容器留在這裡，內容等權威。
 *
 * 【擴充性】里程碑階梯是資料描述子（`refCore.tiers()`，加一階＝加一筆）；本檔另 register 進
 *   #49 `HL.promoCal`（sched:"always"）＝順手把「外部註冊者為零」那個容器採用度缺口再補一個，
 *   並 register 進 #90 `HL.econCfg` ⇒ 營運儀表板的「真站不得比假站寬鬆」健檢自動涵蓋本卡獎額。
 *
 * 【假站/真站鐵律（§4）】模擬好友一律走 `bots: !isLive()`；真站不生成任何假社交證明。
 * 註冊於 window.HL.referral = { code, link, status, friends, claim, claimableCount,
 *                               attribute, open, setAttestor, attestor }。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }
  function C() { return HL.refCore; }
  function isLive() { return !!(HL.site && HL.site.isLive()); }

  var KEY = "HL_REFERRAL";
  var DAY = 86400000;
  var SIM_N = 5;                      // 假站模擬好友數（展示完整體驗用）
  var SIM_SPAN = 21 * DAY;            // 好友陸續加入的窗口
  /* 假站模擬窗口的**起點回推**天數。首版把起點設在「本機首次開站的那一刻」，結果新玩家
   * 第一次打開面板時**一位好友都沒有**（所有模擬加入時刻都還在未來）＝卡上要求的「展示完整體驗」
   * 落空、而且畫面與真站無見證者時長得一樣。⇒ 回推一段既往史，開場即有 2–3 位好友與分階進度。
   * 這是典型的假站種子（同 boot 種子／ambientFeed／arena sim），故一律受 isLive() 閘管制。 */
  var SIM_BACKDATE = 10 * DAY;

  /* 見證者（容器）：真站要供應推薦獎勵必須有權威來源證明「這位好友確實由我帶進來」。
   * 未註冊時真站不供應（見檔頭）。形狀刻意與本檔內部一致：{ friends(), eeWager() }。 */
  var ATTESTOR = null;
  function setAttestor(fn) { ATTESTOR = (typeof fn === "function") ? fn : null; return HL.referral; }
  function attestor() { return ATTESTOR; }
  // 獎勵是否供應：假站永遠供應；真站要有見證者才供應（不靜默退化成自助印幣）
  function rewardsEnabled() { return !isLive() || !!ATTESTOR; }

  function load() {
    var o = HL.dom.lsGet(KEY, null);      // T20+站別命名空間（真/假站平行宇宙）
    if (!o || !o.seed) {
      o = { seed: String(Date.now()) + "-" + Math.floor(Math.random() * 1e9), createdAt: Date.now(), friends: {}, eePaidUpTo: 0, earned: 0 };
      save(o);
    }
    if (!o.friends) o.friends = {};
    if (o.eePaidUpTo == null) o.eePaidUpTo = 0;
    return o;
  }
  function save(o) { HL.dom.lsSet(KEY, o); }

  function code() { return C() ? C().codeFor(load().seed) : ""; }
  function link() {
    var loc = global.location, base = (loc && (loc.origin || "") + (loc.pathname || "")) || "";
    var q = (loc && /[?&]demo=1\b/.test(loc.search || "")) ? "?demo=1&ref=" : "?ref=";
    return base + q + code();
  }
  function tiers() { return C() ? C().tiers(isLive()) : []; }

  /* 好友清單。真站有見證者＝以它為權威；否則（真站無見證者）**結構上為空**，
   * 假站走確定性模擬。seed 綁 code ⇒ 同一裝置每次看到同一批好友、重整不跳動。 */
  function friends() {
    if (!C()) return [];
    if (isLive()) {
      if (!ATTESTOR) return [];
      var srv = null;
      try { srv = ATTESTOR({ now: Date.now() }); } catch (e) { srv = null; }
      return (srv && srv.friends) ? srv.friends : [];
    }
    var o = load();
    return C().simFriends(code(), {
      n: SIM_N, startMs: (o.createdAt || Date.now()) - SIM_BACKDATE, now: Date.now(),
      spanMs: SIM_SPAN, names: (HL.mock && HL.mock.fakeNames) ? HL.mock.fakeNames : null,
      bots: !isLive()
    });
  }

  // 被推薦人（我自己）的里程碑尺＝累積 VIP 經驗（#50 成本加權後的押注量，與好友側同一把尺）
  function myWager() {
    if (isLive() && ATTESTOR) {
      var srv = null;
      try { srv = ATTESTOR({ now: Date.now() }); } catch (e) { srv = null; }
      if (srv && srv.eeWager != null) return +srv.eeWager || 0;
    }
    return (HL.vip && HL.vip.status) ? (HL.vip.status().wager || 0) : 0;
  }

  /* `?ref=` 落地歸因（開機時呼叫一次）／面板手動輸入亦走此出口。
   * 純函式 applyRef 保證：自我推薦不歸因、已歸因不可覆寫。**歸因與付款分離**——
   * 真站無見證者時照樣記錄（那是未來後端結算的唯一依據），只是不發錢。 */
  function attribute(raw) {
    if (!C()) return false;
    var o = load();
    var next = C().applyRef({ ref: o.ref, refAt: o.refAt, paidUpTo: o.eePaidUpTo }, raw, code(), Date.now());
    if (!next || next.ref === o.ref) return false;         // 未寫入（自我推薦／非法／已有歸因）
    o.ref = next.ref; o.refAt = next.refAt; save(o);
    HL.ui.toast("🤝 " + t("已記錄邀請碼", "已記錄邀請碼") + " " + next.ref, "ok");
    if (HL.notify) HL.notify.add({
      ic: "🤝", title: t("邀請好友", "邀請好友"),
      text: t("已記錄你的邀請人，達成里程碑即可領取雙方獎勵。", "已記錄你的邀請人，達成里程碑即可領取雙方獎勵。")
    });
    return true;
  }

  /* 可領取金額：推薦人側（每位好友各自分階）＋ 被推薦人側（我自己的里程碑）。
   * 全部委派 refCore.settle ⇒ 冪等由單調 paidUpTo 結構保證，本層只負責存檔。 */
  function pending() {
    if (!C() || !rewardsEnabled()) return { total: 0, ref: 0, ee: 0, rows: [] };
    var o = load(), ts = tiers(), rows = [], ref = 0, ee = 0;
    friends().forEach(function (f) {
      var r = C().settle({ wager: f.wager, paidUpTo: o.friends[f.id] || 0 }, ts);
      if (r.ref > 0) { rows.push({ kind: "ref", id: f.id, name: f.name, amount: r.ref, paidUpTo: r.paidUpTo }); ref += r.ref; }
    });
    if (o.ref) {
      var m = C().settle({ wager: myWager(), paidUpTo: o.eePaidUpTo || 0 }, ts);
      if (m.ee > 0) { rows.push({ kind: "ee", id: "__me", name: t("我的邀請人獎勵", "我的邀請人獎勵"), amount: m.ee, paidUpTo: m.paidUpTo }); ee += m.ee; }
    }
    return { total: ref + ee, ref: ref, ee: ee, rows: rows };
  }
  function claimableCount() { return pending().rows.length; }

  function claim() {
    var p = pending();
    if (p.total <= 0) return 0;
    var o = load();
    p.rows.forEach(function (r) {
      if (r.kind === "ee") o.eePaidUpTo = r.paidUpTo;
      else o.friends[r.id] = r.paidUpTo;
    });
    o.earned = (o.earned || 0) + p.total;
    save(o);                                    // **先寫進度再送幣**：中途失敗寧可少發也不重複發
    HL.bonus.add(p.total, { source: "邀請好友" });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
    return p.total;
  }

  function status() {
    var o = load(), fs = friends(), ts = tiers(), done = 0;
    fs.forEach(function (f) { if (C() && C().reached(f.wager, ts) >= ts.length) done++; });
    return {
      code: code(), link: link(), friends: fs.length, completed: done,
      earned: o.earned || 0, invitedBy: o.ref || "", enabled: rewardsEnabled(),
      claimable: claimableCount(), tiers: ts
    };
  }

  /* ---------------- 面板 ---------------- */
  function open() {
    var modalRef;
    var st = status();
    var body = [];

    // 我的邀請碼 + 分享（碼本身在真站也是真的，故一律顯示）
    body.push(el("div", { class: "ax-panel", style: "text-align:center;padding:12px" }, [
      el("small", { class: "ax-muted", text: t("我的邀請碼", "我的邀請碼") }),
      // 字級/間距一律走既有 token（不新造 --ax-fs-* 這種不存在的軸＝死 token，維護軌 T31 家族）
      el("div", { class: "ax-gold", style: "font-size:var(--ax-font-xl);letter-spacing:3px;font-weight:700;margin:var(--ax-space-1) 0", text: st.code }),
      el("button", {
        class: "ax-btn-primary", onClick: function () {
          if (HL.share && HL.share.text) HL.share.text({ title: "ApexWin", text: t("用我的邀請碼加入 ApexWin，雙方都有獎勵！", "用我的邀請碼加入 ApexWin，雙方都有獎勵！"), url: st.link });
          else HL.ui.toast(st.link, "ok");
        }
      }, [el("span", { text: t("分享邀請連結", "分享邀請連結") })])
    ]));

    /* 里程碑階梯（讀活值、不手抄數字——比照 #90 econCfg 紀律 ②）。
     * ⚠️ P3 紀律：`HL.i18n` 只翻「整個文字節點等於一條 key」者 ⇒ 「第 1 階」這種**組出來的**
     *   字串永遠翻不到。故一律「語言中性的數值一節點 + 中文全片語一節點」（同 #57 名額列的作法）。 */
    var tierRows = st.tiers.map(function (tr, i) {
      return el("div", { class: "ax-task" }, [
        el("div", { class: "ax-task__main" }, [
          el("div", { class: "ax-task__name", style: "display:flex;gap:var(--ax-space-1);flex-wrap:wrap;align-items:baseline" }, [
            el("span", { class: "ax-gold", text: String(i + 1) }),
            el("span", { text: t("好友累積 VIP 經驗達", "好友累積 VIP 經驗達") }),
            el("span", { text: String(tr.need) })
          ])
        ]),
        el("small", { class: "ax-gold", text: "+" + money(tr.ref) + " / +" + money(tr.ee) })
      ]);
    });
    tierRows.push(el("small", { class: "ax-muted", text: t("金額為「推薦人 / 好友」各自可得。", "金額為「推薦人 / 好友」各自可得。") }));
    body.push(el("div", { class: "ax-panel" }, [
      HL.ui.sectionTitle ? HL.ui.sectionTitle(t("分階獎勵", "分階獎勵")) : el("div", { text: t("分階獎勵", "分階獎勵") })
    ].concat(tierRows).concat([
      el("small", { class: "ax-muted", text: t("好友的累積 VIP 經驗每跨過一階，推薦人與好友各領一次（不是註冊就發）。", "好友的累積 VIP 經驗每跨過一階，推薦人與好友各領一次（不是註冊就發）。") })
    ])));

    // 好友清單
    var fr = friends(), ts = st.tiers;
    var listKids = fr.map(function (f) {
      var lv = C() ? C().reached(f.wager, ts) : 0;
      var nextNeed = ts[lv] ? ts[lv].need : 0;
      var pct = nextNeed ? Math.min(100, (f.wager / nextNeed) * 100) : 100;
      return el("div", { class: "ax-task" }, [
        el("div", { class: "ax-task__main" }, [
          el("div", { class: "ax-task__name", text: "🙋 " + f.name }),
          HL.ui.progress(pct),
          el("small", { class: "ax-muted", text: lv + "/" + ts.length })
        ]),
        el("small", { class: lv >= ts.length ? "ax-gold" : "ax-muted", text: lv >= ts.length ? t("全階完成", "全階完成") : t("累積中", "累積中") })
      ]);
    });
    if (!fr.length) {
      listKids.push(el("small", { class: "ax-muted", text: st.enabled ? t("還沒有好友加入，把邀請連結分享出去吧。", "還沒有好友加入，把邀請連結分享出去吧。") : t("真站模式：好友歸因需伺服器見證，尚未接入前不顯示清單。", "真站模式：好友歸因需伺服器見證，尚未接入前不顯示清單。") }));
    }
    body.push(el("div", { class: "ax-panel" }, [
      HL.ui.sectionTitle ? HL.ui.sectionTitle(t("我邀請的好友", "我邀請的好友")) : el("div", { text: t("我邀請的好友", "我邀請的好友") })
    ].concat(listKids)));

    // 我的邀請人（被推薦人側）
    var meKids = [];
    if (st.invitedBy) {
      meKids.push(HL.ui.kv(t("我的邀請人", "我的邀請人"), st.invitedBy));
      meKids.push(HL.ui.kv(t("我的累積 VIP 經驗", "我的累積 VIP 經驗"), String(myWager())));
    } else {
      // 輸入列**沿用 #19 兌換碼既有的 .ax-redeem__form/.ax-input 形制**（同一種「碼輸入 + 送出」）
      //   ⇒ 零新 CSS、零複製貼上樣式（模板化方向）；也刻意不動 components.css（維護軌在該檔作業）。
      var input = el("input", { class: "ax-input", type: "text", placeholder: t("輸入邀請碼", "輸入邀請碼"), autocomplete: "off", spellcheck: "false", maxlength: String(C() ? C().LEN : 6) });
      var applyBtn = el("button", { class: "ax-btn-ghost" }, [el("span", { text: t("套用邀請碼", "套用邀請碼") })]);
      applyBtn.addEventListener("click", function () {
        if (attribute(input.value)) { if (modalRef && modalRef.close) modalRef.close(); open(); }
        else HL.ui.toast(t("邀請碼無效，或你已經有邀請人了。", "邀請碼無效，或你已經有邀請人了。"), "warn");
      });
      meKids.push(el("div", { class: "ax-redeem" }, [el("div", { class: "ax-redeem__form" }, [input, applyBtn])]));
      meKids.push(el("small", { class: "ax-muted", text: t("邀請碼只能填一次，且不能填自己的碼。", "邀請碼只能填一次，且不能填自己的碼。") }));
    }
    body.push(el("div", { class: "ax-panel" }, [
      HL.ui.sectionTitle ? HL.ui.sectionTitle(t("我的邀請人", "我的邀請人")) : el("div", { text: t("我的邀請人", "我的邀請人") })
    ].concat(meKids)));

    // 統計 + 領獎
    body.push(HL.ui.kv(t("已加入好友", "已加入好友"), String(st.friends)));
    body.push(HL.ui.kv(t("累計獲得", "累計獲得"), money(st.earned), { valCls: "ax-gold" }));
    var p = pending();
    if (p.total > 0) {
      var btn = el("button", { class: "ax-btn-primary" }, [el("span", { text: t("領取推薦獎勵", "領取推薦獎勵") }), document.createTextNode(" +" + money(p.total))]);
      btn.addEventListener("click", function () {
        var got = claim();
        if (got > 0) {
          HL.ui.toast(t("推薦獎勵", "推薦獎勵") + " +" + money(got) + " " + t("已入獎金錢包", "已入獎金錢包"), "ok");
          if (modalRef && modalRef.close) modalRef.close();
          open();
        }
      });
      body.push(btn);
    }
    // 真站無見證者時據實說明「為什麼這裡不發獎」，不假裝它在運作
    if (!st.enabled) {
      body.push(el("small", { class: "ax-muted", text: t("真站模式：推薦獎勵需伺服器見證雙方關係，尚未接入前不發放（不以單機自填冒充推薦）。", "真站模式：推薦獎勵需伺服器見證雙方關係，尚未接入前不發放（不以單機自填冒充推薦）。") }));
      body.push(el("small", { class: "ax-muted", text: t("你填入的邀請碼仍會被記錄，接入後可回頭結算。", "你填入的邀請碼仍會被記錄，接入後可回頭結算。") }));
    }
    body.push(el("span", { class: "ax-demo-tag", text: t("獎勵入獎金錢包 · 分階釋放 · Demo", "獎勵入獎金錢包 · 分階釋放 · Demo") }));

    modalRef = HL.ui.modal(t("🤝 邀請好友", "🤝 邀請好友"), body);
  }

  HL.referral = {
    code: code, link: link, status: status, friends: friends,
    claim: claim, claimableCount: claimableCount, attribute: attribute,
    open: open, setAttestor: setAttestor, attestor: attestor
  };

  /* 開機落地歸因：`?ref=CODE` 只在**首次**寫入（applyRef 保證不可覆寫、不可自我推薦）。
   * 刻意不清掉 URL 參數——重整同一條連結不會產生第二筆歸因（寫一次），留著也無害。 */
  (function bootAttribute() {
    var loc = global.location;
    var m = loc && /[?&]ref=([A-Za-z0-9]+)/.exec(loc.search || "");
    if (!m || !m[1]) return;
    // 歸因會吐 toast/notify ⇒ 等 DOM 就緒再做（載入時 body 可能還沒有，toast 會落空）
    function go() { attribute(m[1]); }
    if (global.document && global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", go);
    else go();
  })();

  /* #49 活動日曆：推薦制是常設活動（沒有窗口）⇒ sched:"always"。
   * 求值一律即時（promoCal 契約）；真站無見證者時 enabled 為 false ⇒ 日曆同步不顯示。 */
  if (HL.promoCal && HL.promoCal.register) {
    HL.promoCal.register({
      id: "referral", name: "邀請好友", icon: "🤝", sched: "always",
      enabled: function () { return rewardsEnabled(); },
      note: function () {
        var s = status();
        if (s.claimable > 0) return "有推薦獎勵可領取";
        return s.friends > 0 ? ("已有 " + s.friends + " 位好友加入") : "分享邀請碼，雙方各得獎勵";
      },
      open: function () { open(); }
    });
  }

  /* #90 經濟旋鈕自我描述：獎額/門檻登記進去 ⇒ 儀表板的「真站不得比假站寬鬆」健檢自動涵蓋。
   * 紀律 ②（讀活值不手抄）：一律當場從 refCore.tiers() 求值。 */
  if (HL.econCfg && HL.econCfg.register) {
    HL.econCfg.register({
      id: "referral", label: "邀請好友（#58）", icon: "🤝", order: 60,
      describe: function () {
        if (!C()) return [];
        var d = C().tiers(false), l = C().tiers(true);
        return [
          { key: "ref_award", label: "推薦人各階獎額", demo: d.map(function (x) { return x.ref; }), live: l.map(function (x) { return x.ref; }), unit: "", strict: "le", note: "分階釋放，非註冊即發" },
          { key: "ee_award", label: "被推薦人各階獎額", demo: d.map(function (x) { return x.ee; }), live: l.map(function (x) { return x.ee; }), unit: "", strict: "le", note: "" },
          { key: "need", label: "各階門檻（累積 VIP 經驗）", demo: d.map(function (x) { return x.need; }), live: l.map(function (x) { return x.need; }), unit: "", strict: "ge", note: "摩擦型：真站不得更低" },
          { key: "sim_friends", label: "假站模擬好友數", demo: SIM_N, live: 0, unit: " 位", strict: "le", note: "真站不生成任何模擬社交證明（§4）" }
        ];
      }
    });
  }
})(window);

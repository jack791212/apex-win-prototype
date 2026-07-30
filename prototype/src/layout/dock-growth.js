/*
 * Apex Win｜成長進度可停靠面板（#55 · HL.dock 第二代註冊者）
 * ─────────────────────────────────────────────────────────────────────
 * 這支檔案的存在意義有兩層：
 *
 * ① 功能：把三條「邊玩邊想看一眼」的成長進度壓成一個窄面板——
 *    #46 季票（賽季經驗 / 階級 / 可領數）、#45 成就（點數 / 解鎖率）、
 *    #47 公會（週貢獻 / 排名）。每區一個 CTA 開回各自的完整 modal。
 *
 * ② 架構驗證（船長 P4）：#44 建了 HL.dock 容器底座後，唯一註冊者是它自己
 *    遷移進去的 夥伴 + 聊天 ⇒ 底座從未被「新功能」用過，「先做容器再填功能」
 *    形同名存實亡。本檔是**第二代註冊者**：全檔沒有一行浮窗/拖曳/收合/持久化
 *    程式——開 / 關 / 收合(可收納) / 桌機拖曳自由擺放 / 跨站持久座標 / 手機互斥
 *    一律由 HL.dock 提供，本檔只實作 buildScroll 的內容。
 *
 * 為何是「新面板」而不是把 #45–#49 的面板改掛 dock：徽章牆 / 季票階梯 / 公會週榜
 * 都是「進去專心看一次」的全幅內容，360px 側邊浮窗會讓資訊密度崩掉；modal 才是
 * 對的容器。⇒ dock 面板負責「持續在旁邊看的摘要」，modal 負責「完整檢視」。
 *
 * 載入序：dock.js 之後（需要 HL.dock）、app-shell.js 之前（FAB 要能呼叫）。
 * 相依模組（season/achievements/guild）皆為**選用**：任一未載入則該區自動不渲染，
 * 三者全缺則面板顯示單行提示 ⇒ 不製造新的硬相依。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  var REFRESH_MS = 5000;                       // 開著時的輕量重繪節奏（面板關閉即停）
  var timer = null;
  var bodyRef = null;

  function t(zh) { return HL.i18n ? HL.i18n.t(zh, zh) : zh; }
  function pct(n) { return Math.max(0, Math.min(100, n || 0)); }

  // 一個成長區塊：標題列 + 進度條 + 兩個數值 + 開啟完整面板的 CTA
  function section(o) {
    var kids = [
      el("div", { class: "ax-growth__head" }, [
        el("span", { class: "ax-growth__ic", text: o.icon }),
        el("b", { text: t(o.title) }),
        o.badge ? el("span", { class: "ax-growth__badge", text: o.badge }) : null
      ]),
      el("small", { class: "ax-muted", text: o.caption })
    ];
    if (typeof o.pct === "number") kids.push(HL.ui.progress(pct(o.pct), { style: "margin:6px 0 4px" }));
    if (o.rows && o.rows.length) {
      kids.push(el("div", { class: "ax-growth__rows" }, o.rows.map(function (r) {
        return HL.ui.kv(t(r[0]), r[1], { row: true });
      })));
    }
    kids.push(HL.dom.pressable(el("button", {
      class: "ax-growth__cta", text: t(o.ctaText), onClick: o.onCta
    })));
    return el("div", { class: "ax-growth__sec" }, kids);
  }

  /* i18n 契約（本檔一律遵守，preview 首驗踩過才寫下）：
   *   `HL.i18n.t` 是 **passthrough**（`function t(k,def){return def}`）——翻譯只發生在 i18n 的
   *   DOM walker（走文字節點，key＝畫面繁中）。⇒ 一個文字節點必須**整段等於字典的一條 key**
   *   才會被翻譯。因此本檔所有中文字串都是「完整片語」，所有動態值都是**純數字/純資料**
   *   （不與中文串接）。反例（首版寫錯、已改掉）：`"解鎖 "+1+" / "+19+" 枚徽章"` 串成單一節點
   *   「解鎖 1 / 19 枚徽章」，既不等於任何 key，也得靠 PREFIX/SUFFIX 兩張補丁表才救得回來。
   */
  function seasonSec() {
    if (!HL.season || !HL.season.status) return null;
    var s = HL.season.status();
    var rows = [
      ["階級", s.tier + " / " + s.total],
      // ⚠️ 經驗值不是金額：刻意不用 HL.dom.money（會冠上 NT$，preview 首驗即抓到）
      ["距下一階（經驗）", s.maxed ? t("已滿階") : Number(s.toNext).toLocaleString()],
      ["可領獎勵", String(s.claimable)]
    ];
    rows.push(s.ended ? ["賽季狀態", t("已結束")] : ["剩餘天數", String(s.daysLeft)]);
    return section({
      icon: s.icon || "🎟️", title: "季票進度",
      badge: s.prem ? t("進階軌") : t("免費軌"),
      caption: s.name,                          // 賽季名＝動態資料，不進字典
      pct: s.tierPct, rows: rows,
      ctaText: s.claimable > 0 ? "前往領取" : "開啟季票",
      onCta: function () { HL.season.open(); }
    });
  }

  function achSec() {
    if (!HL.achievements || !HL.achievements.status) return null;
    var a = HL.achievements.status();
    return section({
      icon: "🏅", title: "成就進度",
      pct: a.pct,
      rows: [
        ["徽章解鎖", a.unlocked + " / " + a.total],
        ["成就點數", String(a.pts)],
        ["完成度", a.pct.toFixed(0) + "%"]
      ],
      ctaText: "開啟徽章牆",
      onCta: function () { HL.achievements.open(); }
    });
  }

  function guildSec() {
    if (!HL.guild || !HL.guild.status) return null;
    var g = HL.guild.status();
    if (!g.joined) {
      return section({
        icon: "🛡️", title: "公會",
        caption: t("尚未加入公會"),
        rows: [["招募中公會", String(g.count)]],
        ctaText: "瀏覽公會",
        onCta: function () { HL.guild.open(); }
      });
    }
    return section({
      icon: g.guild && g.guild.icon ? g.guild.icon : "🛡️",
      title: "公會週貢獻",
      badge: g.rank ? "#" + g.rank : null,
      caption: g.guild ? g.guild.name : "",     // 公會名＝動態資料，不進字典
      rows: [
        ["本週排名", (g.rank || "-") + " / " + g.totalGuilds],
        ["我的貢獻", HL.dom.money ? HL.dom.money(g.contrib) : String(g.contrib)],
        ["可領任務", String(g.claimable)]
      ],
      ctaText: g.claimable > 0 ? "領取公會任務" : "開啟公會",
      onCta: function () { HL.guild.open(); }
    });
  }

  // 資料指紋：只有三個模組的狀態真的變了才重繪。
  // 為何需要：面板每 5 秒 tick 一次，若無條件重繪則 ① 無謂 DOM churn ② i18n 是靠
  // MutationObserver 走文字節點翻譯（HL.i18n.t 本身是 passthrough），每次重繪都會先產生
  // 一批繁中節點再被翻回 EN/簡中 ⇒ 非繁中語系下每 5 秒閃一次原文。比對指紋可讓絕大多數
  // tick 直接跳過，只在真的有進度變化時才重繪一次。
  function fingerprint() {
    var p = [];
    if (HL.season && HL.season.status) { var s = HL.season.status(); p.push(s.xp, s.tier, s.claimable, s.prem, s.daysLeft); }
    if (HL.achievements && HL.achievements.status) { var a = HL.achievements.status(); p.push(a.unlocked, a.pts); }
    if (HL.guild && HL.guild.status) { var g = HL.guild.status(); p.push(g.joined, g.contrib, g.rank, g.claimable, g.totalGuilds); }
    p.push(HL.lang || "");                     // 換語言也要重繪（走 restore→refresh 後指紋才會變）
    return p.join("|");
  }
  var lastFp = null;

  function render(scroll, force) {
    if (!scroll) return;
    var fp = fingerprint();
    if (!force && fp === lastFp) return;       // 無變化＝不動 DOM
    lastFp = fp;
    HL.dom.clear(scroll);
    var secs = [seasonSec(), achSec(), guildSec()].filter(Boolean);
    if (!secs.length) {
      scroll.appendChild(el("p", { class: "ax-muted", text: t("成長模組尚未載入。") }));
      return;
    }
    secs.forEach(function (s) { scroll.appendChild(s); });
    scroll.appendChild(el("p", {
      class: "ax-muted ax-growth__foot",
      text: t("進度隨每筆有效押注即時累積（走中央結算點）。")
    }));
  }

  var registered = false;
  function ensureRegistered() {
    if (registered || !HL.dock) return;
    registered = true;
    HL.dock.register({
      id: "growth", cls: "ax-float--growth", icon: "📈",
      title: "成長進度", sub: "季票 · 成就 · 公會", mobileExclusive: true,
      buildScroll: function (s) { bodyRef = s; render(s, true); },
      onOpen: function () {
        render(bodyRef, true);                 // 開啟時強制重繪一次（可能關閉期間資料已變）
        if (timer) return;
        timer = global.setInterval(function () { render(bodyRef); }, REFRESH_MS);
      },
      onClose: function () {
        if (timer) { global.clearInterval(timer); timer = null; }
      }
    });
  }

  HL.dockGrowth = {
    ensureRegistered: ensureRegistered,
    toggle: function () { ensureRegistered(); HL.dock.toggle("growth"); },
    open: function () { ensureRegistered(); HL.dock.open("growth"); },
    close: function () { HL.dock.close("growth"); },
    refresh: function () { render(bodyRef, true); }  // 供外部（如領取後）主動強制刷新
  };
})(window);

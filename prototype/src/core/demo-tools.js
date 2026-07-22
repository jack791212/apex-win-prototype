/*
 * Apex Win｜Demo 測試工具
 * 提案展示用：控制下一局結果、社群活躍度、重置餘額 / 排行榜。
 * 對應規格 06 / 09 / 11 的測試工具需求。註冊於 window.HL.demoTools。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  var RESULTS = [
    { v: "random", t: "隨機" },
    { v: "win", t: "強制贏" },
    { v: "lose", t: "強制輸" },
    { v: "fakeBig", t: "假玩家爆贏" }
  ];
  var ACT = [
    { v: "low", t: "低" },
    { v: "normal", t: "一般" },
    { v: "high", t: "高" }
  ];
  var SPEED = [
    { v: "slow", t: "慢" },
    { v: "normal", t: "一般" },
    { v: "fast", t: "快" }
  ];
  var MODES = [{ v: "casual", t: "休閒(遊戲幣)" }, { v: "real", t: "真金" }];
  var LIC = [{ v: "off", t: "未核照" }, { v: "on", t: "已核照" }];

  var seg = HL.ui.segmented; // 分段控制沿用共用 primitive（見 core/ui.js）

  function open() {
    var s = HL.state.get();
    var live = HL.site && HL.site.isLive();
    HL.ui.modal(live ? "營運工具（真站）" : "Demo 測試工具", [
      // ===== 站別：真站/假站切換 + 營運儀表板入口（兩站皆可見）=====
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv" }, [
          el("span", { text: "目前站別" }),
          el("b", { class: live ? "ax-gold" : "", text: HL.site ? HL.site.label() : "假站（展示 Demo）" })
        ]),
        el("button", { class: "ax-btn-primary", text: live ? "🎭 切回假站（展示 Demo）" : "🚦 切換到真站（營運健檢）", onClick: function () {
          if (!HL.site) return;
          var to = live ? "demo" : "live";
          var msg = to === "live"
            ? "切換到「真站」會重新載入，並套用獨立乾淨的資料空間：\n關閉所有假玩家／假流水／假 JP／假報獎、餘額歸零、每筆金流記入營運帳本。\n\n確定切換？"
            : "切回「假站」會重新載入，回到原本的展示資料（假玩家／假流水都在）。\n\n確定切換？";
          if (global.confirm(msg)) HL.site.setMode(to);
        } }),
        el("button", { class: "ax-btn-ghost", text: "📊 營運監控儀表板", onClick: function () {
          if (HL.ui.closeTop) HL.ui.closeTop();
          if (HL.opsBoard) HL.opsBoard.open(); else HL.ui.toast("儀表板尚未就緒", "warn");
        } })
      ]),
      // ===== 假站專屬：演出／作弊控制（真站無意義，隱藏）=====
      live ? null : el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "下一局結果" }),
        seg(RESULTS, s.demo.result, function (v) {
          s.demo.result = v; HL.ui.toast("下一局結果：" + v, "ok");
        })
      ]),
      live ? null : el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "社群活躍度" }),
        seg(ACT, s.demo.activity, function (v) {
          s.demo.activity = v; HL.ui.toast("活躍度：" + v, "ok");
        })
      ]),
      live ? null : el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "大獎牆刷新速度（隨機區間）" }),
        seg(SPEED, s.demo.bigWinSpeed, function (v) {
          s.demo.bigWinSpeed = v; HL.ui.toast("大獎牆速度：" + v, "ok");
        })
      ]),
      // ===== 金流模式 + 牌照（兩站皆可測試）=====
      el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "金流模式（雙金流測試）" }),
        seg(MODES, HL.money.mode(), function (v) { HL.money.setMode(v); HL.ui.toast("金流模式：" + (v === "real" ? "真金" : "休閒"), "ok"); })
      ]),
      el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "真金牌照（開放提款）" }),
        seg(LIC, HL.money.licensed() ? "on" : "off", function (v) { HL.state.set({ realLicensed: v === "on" }); HL.ui.toast("真金牌照：" + (v === "on" ? "已核照" : "未核照"), "ok"); })
      ]),
      // ===== 重置 =====
      el("div", { class: "ax-tool-row" }, [
        // 真會員：餘額由雲端管理，隱藏重置鈕避免誤把雲端餘額歸零
        (HL.auth && HL.auth.backend() && HL.auth.user())
          ? el("span", { class: "ax-muted", text: "🔒 真會員餘額由雲端管理，不在此重置" })
          : el("button", { class: "ax-btn-ghost", text: live ? "重置餘額（歸零）" : "重置餘額", onClick: function () {
              HL.state.resetBalance(); HL.shell.refreshChrome(); HL.ui.toast("餘額已重置", "ok");
            } }),
        live ? null : el("button", { class: "ax-btn-ghost", text: "重置排行榜", onClick: function () {
          HL.state.resetLeaderboard(); HL.ui.toast("排行榜已重置", "ok");
        } })
      ]),
      el("span", { class: "ax-demo-tag", text: live ? "真站：數據記入營運帳本 · 假金流" : "所有資料皆為 Demo 假資料" })
    ]);
  }

  function fab() {
    return el("button", { class: "ax-demo-fab", text: HL.site && HL.site.isLive() ? "⚙ 營運工具" : "⚙ DEMO 工具", onClick: open });
  }

  HL.demoTools = { fab: fab, open: open };
})(window);

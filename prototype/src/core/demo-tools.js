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

  function seg(options, current, onPick) {
    var wrap = el("div", { class: "ax-seg" });
    options.forEach(function (o) {
      wrap.appendChild(el("button", {
        class: "ax-seg-btn" + (o.v === current ? " is-on" : ""),
        text: o.t,
        onClick: function () {
          onPick(o.v);
          Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove("is-on"); });
          this.classList.add("is-on");
        }
      }));
    });
    return wrap;
  }

  function open() {
    var s = HL.state.get();
    HL.ui.modal("Demo 測試工具", [
      el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "下一局結果" }),
        seg(RESULTS, s.demo.result, function (v) {
          s.demo.result = v; HL.ui.toast("下一局結果：" + v, "ok");
        })
      ]),
      el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "社群活躍度" }),
        seg(ACT, s.demo.activity, function (v) {
          s.demo.activity = v; HL.ui.toast("活躍度：" + v, "ok");
        })
      ]),
      el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "大獎牆刷新速度（隨機區間）" }),
        seg(SPEED, s.demo.bigWinSpeed, function (v) {
          s.demo.bigWinSpeed = v; HL.ui.toast("大獎牆速度：" + v, "ok");
        })
      ]),
      el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "金流模式（雙金流測試）" }),
        seg(MODES, HL.money.mode(), function (v) { HL.money.setMode(v); HL.ui.toast("金流模式：" + (v === "real" ? "真金" : "休閒"), "ok"); })
      ]),
      el("div", { class: "ax-tool-row" }, [
        el("label", { class: "ax-muted", text: "真金牌照（開放提款）" }),
        seg(LIC, HL.money.licensed() ? "on" : "off", function (v) { HL.state.set({ realLicensed: v === "on" }); HL.ui.toast("真金牌照：" + (v === "on" ? "已核照" : "未核照"), "ok"); })
      ]),
      el("div", { class: "ax-tool-row" }, [
        // 真會員：餘額由雲端管理，隱藏重置鈕避免誤把雲端餘額歸零
        (HL.auth && HL.auth.backend() && HL.auth.user())
          ? el("span", { class: "ax-muted", text: "🔒 真會員餘額由雲端管理，不在此重置" })
          : el("button", { class: "ax-btn-ghost", text: "重置餘額", onClick: function () {
              HL.state.resetBalance(); HL.shell.refreshChrome(); HL.ui.toast("餘額已重置", "ok");
            } }),
        el("button", { class: "ax-btn-ghost", text: "重置排行榜", onClick: function () {
          HL.state.resetLeaderboard(); HL.ui.toast("排行榜已重置", "ok");
        } })
      ]),
      el("span", { class: "ax-demo-tag", text: "所有資料皆為 Demo 假資料" })
    ]);
  }

  function fab() {
    return el("button", { class: "ax-demo-fab", text: "⚙ DEMO 工具", onClick: open });
  }

  HL.demoTools = { fab: fab, open: open };
})(window);

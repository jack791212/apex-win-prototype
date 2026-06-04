/*
 * Apex Win｜App Shell
 * Header（品牌 + 整合式錢包/幣別/玩家）、Sidebar（含底部 DEMO 工具）、底部安全列
 * （含 VIP 俱樂部 + 夥伴 / 聊天 開關）。夥伴與聊天為浮動視窗（見 panels.js），不佔版面。
 * 註冊於 window.HL.shell。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var ui = HL.ui;

  var SIDE = [
    { ic: "🏠", t: "大廳", go: "lobby" },
    { ic: "🌐", t: "全球獎", go: "globe" },
    { ic: "⚔️", t: "競技場", go: "arena", group: ["arena", "bounty", "vsslot", "duel"] },
    { ic: "🎰", t: "娛樂城", go: "casino" },
    { ic: "•••", t: "更多", soon: "更多" }
  ];

  // ---- 幣別 / 餘額 ----
  function balanceOf(code) { return code === "TWD" ? HL.state.get().balance : (HL.state.get().wallet[code] || 0); }
  function fmtBal(code, amt) {
    if (code === "TWD") return "NT$ " + Math.round(amt).toLocaleString("en-US");
    if (code === "USD") return "$" + amt.toFixed(2);
    return amt.toFixed(2) + " " + code;
  }
  function curMeta(code) { return HL.mock.currencies.filter(function (c) { return c.code === code; })[0] || HL.mock.currencies[0]; }

  function refreshWalletPill() {
    var c = HL.state.get().currency;
    var amt = document.getElementById("ax-wallet-amount");
    if (amt) amt.textContent = fmtBal(c, balanceOf(c));
    var ico = document.getElementById("ax-wallet-ico");
    if (ico) { var m = curMeta(c); ico.style.background = m.color; ico.textContent = m.ic; }
  }

  function walletWidget() {
    var c = HL.state.get().currency;
    var dd = el("div", { class: "ax-cur-dropdown", id: "ax-cur-dd" });
    HL.mock.currencies.forEach(function (m) {
      dd.appendChild(el("div", {
        class: "ax-cur-row" + (m.code === c ? " is-active" : ""),
        onClick: function () {
          HL.state.set({ currency: m.code });
          refreshWalletPill(); closeDropdown();
          ui.toast("已切換幣別：" + m.code + (m.code === "TWD" ? "" : "（Demo）"), "ok");
        }
      }, [
        el("span", { class: "ax-cur-icon", style: "background:" + m.color, text: m.ic }),
        el("span", { class: "code", text: m.code }),
        el("span", { class: "bal", text: fmtBal(m.code, balanceOf(m.code)) })
      ]));
    });
    dd.appendChild(el("div", { class: "ax-cur-settings", text: "錢包設定", onClick: function () { closeDropdown(); ui.comingSoon("錢包設定"); } }));

    var pill = el("button", { class: "ax-wallet", id: "ax-wallet-pill", onClick: toggleDropdown }, [
      el("span", { class: "ax-cur-icon", id: "ax-wallet-ico", style: "background:" + curMeta(c).color, text: curMeta(c).ic }),
      el("span", { id: "ax-wallet-amount", text: fmtBal(c, balanceOf(c)) }),
      el("span", { class: "ax-caret", text: "▾" })
    ]);
    var walletBtn = el("button", { class: "ax-btn-wallet", text: "錢包", onClick: walletModal });
    return el("div", { class: "ax-wallet-wrap" }, [pill, dd, walletBtn]);
  }

  function toggleDropdown(e) { if (e) e.stopPropagation(); var dd = document.getElementById("ax-cur-dd"); if (!dd) return; dd.classList.contains("open") ? closeDropdown() : openDropdown(); }
  function openDropdown() { var dd = document.getElementById("ax-cur-dd"); if (!dd) return; dd.classList.add("open"); setTimeout(function () { document.addEventListener("click", onDocClick); }, 0); }
  function closeDropdown() { var dd = document.getElementById("ax-cur-dd"); if (dd) dd.classList.remove("open"); document.removeEventListener("click", onDocClick); }
  function onDocClick(e) { var wrap = document.querySelector(".ax-wallet-wrap"); if (wrap && !wrap.contains(e.target)) closeDropdown(); }

  function walletModal() {
    closeDropdown();
    ui.modal("錢包（Demo）", [
      el("p", { text: "以下為 Demo 假餘額與假幣別，不代表真實資產。儲值 / 提款功能之後再做。" }),
      el("div", { class: "ax-panel" }, HL.mock.currencies.map(function (m) {
        return el("div", { class: "ax-row" }, [
          el("span", { class: "ax-cur-icon", style: "background:" + m.color, text: m.ic }),
          el("span", { class: "nm", text: m.code + "　" + m.name }),
          el("b", { text: fmtBal(m.code, balanceOf(m.code)) })
        ]);
      })),
      el("span", { class: "ax-demo-tag", text: "Demo · 不做真儲值 / 提款" })
    ]);
  }

  function playerWidget() {
    return el("button", { class: "ax-player", onClick: function () { ui.comingSoon("帳號中心"); } }, [
      el("div", { class: "ax-avatar", text: "A" }),
      el("div", { class: "ax-player__meta" }, [el("b", { text: "Allen 162" }), el("small", { text: "Unranked" })]),
      el("span", { class: "ax-caret", text: "▾" })
    ]);
  }

  function header() {
    return el("header", { class: "ax-header" }, [
      el("div", { class: "ax-brand" }, [
        el("span", { class: "ax-brand__mark", text: "A" }),
        el("span", { class: "ax-brand__name", html: "Apex <b>Win</b>" })
      ]),
      el("div", { class: "ax-header__spacer" }),
      el("button", { class: "ax-icon-btn", text: "🔔", title: "通知", onClick: function () { ui.comingSoon("通知"); } }, [el("span", { class: "ax-badge-dot", text: "3" })]),
      el("button", { class: "ax-icon-btn", text: "🌐", title: "語言", onClick: function () { ui.comingSoon("語言切換"); } }),
      walletWidget(),
      playerWidget()
    ]);
  }

  function sidebar() {
    var view = HL.state.get().view;
    var items = SIDE.map(function (it) {
      var active = it.group ? (it.group.indexOf(view) >= 0) : (it.go && it.go === view);
      return el("button", {
        class: "ax-side-item" + (active ? " is-active" : ""),
        onClick: function () {
          if (it.go) HL.router.go(it.go);
          else ui.comingSoon(it.soon);
        }
      }, [el("span", { class: "ic", text: it.ic }), el("span", { text: it.t })]);
    });
    // DEMO 工具固定在側欄最下方
    items.push(el("div", { class: "ax-side-spacer" }));
    items.push(el("button", { class: "ax-side-item ax-side-demo", title: "Demo 測試工具", onClick: function () { HL.demoTools.open(); } }, [
      el("span", { class: "ic", text: "⚙" }), el("span", { text: "DEMO" })
    ]));
    return el("aside", { class: "ax-sidebar" }, items);
  }

  function bottombar() {
    var item = function (ic, title, sub, onClick) {
      return el("div", { class: "ax-bottombar__item", onClick: onClick }, [
        el("span", { class: "ic", text: ic }),
        el("div", {}, [el("span", { text: title }), sub ? el("small", { id: sub.id, text: sub.text }) : null])
      ]);
    };
    return el("footer", { class: "ax-bottombar" }, [
      item("📋", "每日任務", { text: "3/6 完成" }, function () { ui.comingSoon("每日任務"); }),
      item("🎁", "獎勵中心", { text: "可領取獎勵" }, function () { ui.comingSoon("獎勵中心"); }),
      item("🛡️", "負責任博弈", { text: "使命宣言" }, function () { ui.comingSoon("負責任博弈 · 使命宣言"); }),
      item("✅", "可驗證公平", { text: "如何驗證" }, function () { ui.comingSoon("可驗證公平 · 如何驗證"); }),
      item("💎", "VIP 俱樂部", { text: "專屬禮遇" }, function () { ui.comingSoon("VIP 俱樂部"); }),
      el("div", { class: "ax-bottombar__right" }, [
        el("button", { class: "ax-ai-fab", title: "你的專屬夥伴", onClick: function () { HL.panels.toggleAi(); } }, [
          el("span", { class: "ax-ai-fab__av", text: "🧝‍♀️" }), el("span", { text: "夥伴" })
        ]),
        el("button", { class: "ax-ai-fab", title: "聊天室", onClick: function () { HL.panels.toggleChat(); } }, [
          el("span", { class: "ax-ai-fab__av", style: "background:var(--ax-grad-brand)", text: "💬" }), el("span", { text: "聊天" })
        ])
      ])
    ]);
  }

  function render() {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("div", { class: "ax-shell" }, [
      header(),
      sidebar(),
      el("main", { class: "ax-main", id: "ax-main-content" }),
      bottombar()
    ]));
    return frag;
  }

  function mountView(node) {
    var main = document.getElementById("ax-main-content");
    if (!main) return;
    HL.dom.clear(main);
    main.appendChild(node);
    main.scrollTop = 0;
  }

  function refreshChrome() {
    refreshWalletPill();
    var s = HL.state.get();
    var db = document.getElementById("ax-duel-balance");
    if (db) db.textContent = money(s.balance);
  }

  HL.shell = { render: render, mountView: mountView, refreshChrome: refreshChrome };
})(window);

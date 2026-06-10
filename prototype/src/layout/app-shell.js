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

  // 錢包：儲值 / 提款 / 紀錄（虛擬點數；會員模式走 wallet_txn RPC 由伺服器記帳）
  var PAY_METHODS = [{ ic: "💳", n: "信用卡" }, { ic: "🏪", n: "超商代碼" }, { ic: "🏦", n: "銀行轉帳" }, { ic: "₿", n: "加密貨幣" }];
  var QUICK_AMTS = [500, 1000, 5000, 10000, 50000];
  function pushDemoTxn(kind, amount, balAfter) {
    var a = (HL.state.get().walletTxns || []).slice();
    a.unshift({ kind: kind, amount: amount, bal: balAfter, ts: Date.now() });
    HL.state.set({ walletTxns: a.slice(0, 50) });
  }
  function txnRow(t) {
    var dep = t.kind === "deposit";
    var d = new Date(t.ts);
    var when = (d.getMonth() + 1) + "/" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    return el("div", { class: "ax-row" }, [
      el("span", { class: "ax-cur-icon", style: "background:" + (dep ? "var(--ax-green)" : "var(--ax-red)"), text: dep ? "入" : "出" }),
      el("span", { class: "nm", text: (dep ? "儲值" : "提款") + " · " + when }),
      el("b", { class: dep ? "ax-green" : "ax-red", text: (dep ? "+" : "−") + HL.dom.money(Math.abs(t.amount)) })
    ]);
  }
  function walletModal() {
    closeDropdown();
    var member = isMember();
    var tab = "dep";
    var balEl = el("b", { class: "ax-gold", text: HL.dom.money(HL.state.get().balance) });
    var tabsEl = el("div", { class: "ax-tabs" });
    var body = el("div", { class: "ax-wallet-body" });

    function refreshBal() { balEl.textContent = HL.dom.money(HL.state.get().balance); HL.shell.refreshChrome(); }

    function amountBox(placeholder) {
      var input = el("input", { type: "number", min: "0", placeholder: placeholder });
      var chips = el("div", { class: "ax-stakes" }, QUICK_AMTS.map(function (v) {
        return el("button", { class: "ax-stake", text: v.toLocaleString(), onClick: function () { input.value = String(v); } });
      }));
      return { input: input, node: el("div", { class: "ax-wallet-amt" }, [el("div", { class: "ax-search ax-wallet-input" }, [el("span", { class: "ax-search__ic", text: "NT$" }), input]), chips]) };
    }

    function renderDep() {
      HL.dom.clear(body);
      var box = amountBox("輸入儲值點數");
      var method = 0;
      var mGrid = el("div", { class: "ax-paym" }, PAY_METHODS.map(function (m, i) {
        var b = el("button", { class: "ax-paym__opt" + (i === 0 ? " is-on" : "") }, [el("span", { class: "ax-paym__ic", text: m.ic }), el("span", { text: m.n })]);
        b.addEventListener("click", function () { method = i; Array.prototype.forEach.call(mGrid.children, function (c) { c.classList.remove("is-on"); }); b.classList.add("is-on"); });
        return b;
      }));
      var btn = el("button", { class: "ax-btn-primary", text: "確認儲值" });
      btn.addEventListener("click", function () {
        var amt = Math.floor(+box.input.value || 0);
        if (amt < 100) { ui.toast("最低儲值 100 點", "warn"); return; }
        if (amt > 1000000) { ui.toast("單筆上限 1,000,000 點", "warn"); return; }
        btn.setAttribute("disabled", "");
        if (member) {
          HL.api.walletTxn(amt, "deposit").then(function (R) {
            btn.removeAttribute("disabled");
            if (!R || R.balance == null) { ui.toast("儲值服務尚未部署或忙線，請稍後再試", "err"); return; }
            HL.state.set({ balance: +R.balance }); refreshBal();
            ui.toast("已儲值 " + HL.dom.money(amt) + "（" + PAY_METHODS[method].n + " · 伺服器記帳）", "ok");
            box.input.value = "";
          });
          return;
        }
        var nb = HL.state.get().balance + amt;
        HL.state.set({ balance: nb }); pushDemoTxn("deposit", amt, nb); refreshBal();
        ui.toast("已儲值 " + HL.dom.money(amt) + "（" + PAY_METHODS[method].n + " · Demo）", "ok");
        btn.removeAttribute("disabled"); box.input.value = "";
      });
      body.appendChild(el("p", { class: "ax-muted", text: "選擇支付方式（示意，無真實金流）：" }));
      body.appendChild(mGrid);
      body.appendChild(box.node);
      body.appendChild(btn);
    }

    function renderWd() {
      HL.dom.clear(body);
      var box = amountBox("輸入提款點數");
      var maxBtn = el("button", { class: "ax-stake", text: "全部", onClick: function () { box.input.value = String(Math.floor(HL.state.get().balance)); } });
      box.node.querySelector(".ax-stakes").appendChild(maxBtn);
      var btn = el("button", { class: "ax-btn-primary", text: "確認提款" });
      btn.addEventListener("click", function () {
        var amt = Math.floor(+box.input.value || 0);
        if (amt < 100) { ui.toast("最低提款 100 點", "warn"); return; }
        if (amt > 1000000) { ui.toast("單筆上限 1,000,000 點", "warn"); return; }
        if (amt > HL.state.get().balance) { ui.toast("超過可提款餘額", "err"); return; }
        btn.setAttribute("disabled", "");
        if (member) {
          HL.api.walletTxn(amt, "withdraw").then(function (R) {
            btn.removeAttribute("disabled");
            if (!R || R.balance == null) { ui.toast("提款服務尚未部署或忙線，請稍後再試", "err"); return; }
            HL.state.set({ balance: +R.balance }); refreshBal();
            ui.toast("已提款 " + HL.dom.money(amt) + "（伺服器記帳）", "ok");
            box.input.value = "";
          });
          return;
        }
        var nb = HL.state.get().balance - amt;
        HL.state.set({ balance: nb }); pushDemoTxn("withdraw", amt, nb); refreshBal();
        ui.toast("已提款 " + HL.dom.money(amt) + "（Demo）", "ok");
        btn.removeAttribute("disabled"); box.input.value = "";
      });
      body.appendChild(el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: "提款帳戶（示意）" }), el("b", { text: "🏦 台北富邦 ****8731" })]),
        el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: "預計到帳" }), el("b", { text: "即時（虛擬點數）" })])
      ]));
      body.appendChild(box.node);
      body.appendChild(btn);
    }

    function renderHist() {
      HL.dom.clear(body);
      var listEl = el("div", { class: "ax-panel ax-wallet-hist" }, [el("p", { class: "ax-muted", text: "載入中…" })]);
      body.appendChild(listEl);
      function show(rows) {
        HL.dom.clear(listEl);
        if (!rows || !rows.length) { listEl.appendChild(el("p", { class: "ax-muted", text: "尚無交易紀錄。" })); return; }
        rows.forEach(function (t) { listEl.appendChild(txnRow(t)); });
      }
      if (member) {
        HL.api.walletHistory(20).then(function (rows) {
          show((rows || []).map(function (r) { return { kind: r.kind, amount: +r.amount, ts: new Date(r.created_at).getTime() }; }));
        });
      } else show(HL.state.get().walletTxns || []);
    }

    function setTab(k) {
      tab = k;
      HL.dom.clear(tabsEl);
      [["dep", "儲值"], ["wd", "提款"], ["hist", "紀錄"]].forEach(function (t) {
        tabsEl.appendChild(el("button", { class: "ax-tab" + (tab === t[0] ? " is-active" : ""), text: t[1], onClick: function () { setTab(t[0]); } }));
      });
      if (k === "dep") renderDep(); else if (k === "wd") renderWd(); else renderHist();
    }
    setTab("dep");

    ui.modal("錢包 · 儲值 / 提款", [
      el("div", { class: "ax-wallet-top" }, [el("span", { class: "ax-muted", text: "可用點數" }), balEl]),
      tabsEl,
      body,
      el("span", { class: "ax-demo-tag", text: member ? "虛擬點數 · 伺服器記帳 · 無真實金流" : "Demo · 虛擬點數 · 無真實金流" })
    ]);
  }

  function isMember() { return HL.auth && HL.auth.backend() && HL.auth.user(); }
  function profileOf() { return (HL.state.get().profile) || {}; }
  function killModals() { Array.prototype.forEach.call(document.querySelectorAll(".ax-modal-mask"), function (m) { m.remove(); }); }
  function playerWidget() {
    var member = isMember(), prof = member ? profileOf() : null;
    var av = member ? (prof.avatar || "👑") : null;
    return el("button", { class: "ax-player", onClick: function () { member ? accountMenu() : ui.comingSoon("帳號中心"); } }, [
      el("div", { class: "ax-avatar" + (av ? " ax-avatar--emoji" : ""), text: av || "A" }),
      el("div", { class: "ax-player__meta" }, [el("b", { text: member ? (prof.display_name || HL.auth.displayName()) : "Allen 162" }), el("small", { text: member ? "會員" : "Unranked" })]),
      el("span", { class: "ax-caret", text: "▾" })
    ]);
  }
  function accountMenu() {
    var c = HL.state.get().currency, u = HL.auth.user(), prof = profileOf();
    ui.modal("帳號 · " + (prof.display_name || HL.auth.displayName()), [
      el("div", { class: "ax-panel" }, [
        el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: "頭像 / 暱稱" }), el("b", { text: (prof.avatar || "👑") + " " + (prof.display_name || HL.auth.displayName()) })]),
        el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: "Email" }), el("b", { text: (u && u.email) || "—" })]),
        el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: "餘額" }), el("b", { class: "ax-gold", text: fmtBal(c, balanceOf(c)) })])
      ]),
      el("p", { class: "ax-muted", text: "點數與戰績已跨裝置雲端同步。" }),
      el("div", { class: "ax-modal__actions" }, [
        el("button", { class: "ax-btn-ghost", text: "編輯個人資料", onClick: function () { killModals(); editProfileModal(); } }),
        el("button", { class: "ax-btn-ghost", text: "登出", onClick: function () { killModals(); HL.app.signOut(); } })
      ]),
      el("span", { class: "ax-demo-tag", text: "Demo · 虛擬點數" })
    ]);
  }
  var AVATARS = ["👑", "🦊", "🐯", "🐲", "🦁", "🐺", "🦅", "🐸", "🦄", "🐙", "🐳", "🦖", "🧝‍♀️", "🦸‍♀️", "🤴", "👸"];
  function editProfileModal() {
    var prof = profileOf();
    var nameIn = el("input", { class: "ax-auth__in", type: "text", value: prof.display_name || "", placeholder: "暱稱（1–16 字）", maxlength: "16" });
    var chosen = prof.avatar || "👑";
    var grid = el("div", { class: "ax-avatar-pick" });
    function renderAv() { HL.dom.clear(grid); AVATARS.forEach(function (a) { grid.appendChild(el("button", { class: "ax-avatar-opt" + (a === chosen ? " is-on" : ""), text: a, onClick: function () { chosen = a; renderAv(); } })); }); }
    renderAv();
    ui.modal("編輯個人資料", [
      el("label", { class: "ax-muted ax-edit__lbl", text: "頭像" }), grid,
      el("label", { class: "ax-muted ax-edit__lbl", text: "暱稱" }), nameIn,
      el("div", { class: "ax-modal__actions" }, [
        el("button", { class: "ax-btn-ghost", text: "取消", onClick: killModals }),
        el("button", { class: "ax-btn-primary", text: "儲存", onClick: function () {
          var nm = (nameIn.value || "").trim() || prof.display_name || "玩家";
          HL.api.saveProfile({ display_name: nm, avatar: chosen }).then(function () {
            HL.state.set({ profile: { display_name: nm, avatar: chosen } });
            killModals(); HL.app.refresh(); ui.toast("個人資料已更新", "ok");
          });
        } })
      ]),
      el("span", { class: "ax-demo-tag", text: "Demo · 虛擬點數" })
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

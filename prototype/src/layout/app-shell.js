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
  // 休閒模式商城：遊戲幣套餐（含紅利）
  var COIN_PACKS = [
    { coins: 1000, price: 30, bonus: 0 },
    { coins: 5000, price: 140, bonus: 300, tag: "熱門" },
    { coins: 12000, price: 320, bonus: 1200, tag: "超值" },
    { coins: 30000, price: 750, bonus: 4500, tag: "最划算" },
    { coins: 68000, price: 1600, bonus: 12000 },
    { coins: 128000, price: 2880, bonus: 28000, tag: "豪華" }
  ];
  // 真金模式：法幣 / 加密貨幣（示意，無真實金流）
  var FIAT_METHODS = [{ ic: "💳", n: "信用卡" }, { ic: "🏪", n: "超商代碼" }, { ic: "🏦", n: "銀行轉帳" }];
  var CRYPTO_COINS = [{ code: "USDT", net: "TRC20", ic: "₮" }, { code: "BTC", net: "Bitcoin", ic: "₿" }, { code: "ETH", net: "ERC20", ic: "Ξ" }];
  var DEMO_ADDR = "TXf8h2…Demo…9kQ2vR";
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
    var casual = HL.money.isCasual(); // 休閒模式：商城購買遊戲幣、無真金提款
    var tab = "dep";
    var balEl = el("b", { class: "ax-gold", text: HL.dom.money(HL.state.get().balance) });
    var tabsEl = el("div", { class: "ax-tabs" });
    var body = el("div", { class: "ax-wallet-body" });

    function refreshBal() { balEl.textContent = HL.dom.money(HL.state.get().balance); HL.shell.refreshChrome(); }

    function amountBox(placeholder, prefix) {
      var input = el("input", { type: "number", min: "0", placeholder: placeholder });
      var chips = el("div", { class: "ax-stakes" }, QUICK_AMTS.map(function (v) {
        return el("button", { class: "ax-stake", text: v.toLocaleString(), onClick: function () { input.value = String(v); } });
      }));
      return { input: input, node: el("div", { class: "ax-wallet-amt" }, [el("div", { class: "ax-search ax-wallet-input" }, [el("span", { class: "ax-search__ic", text: prefix || "NT$" }), input]), chips]) };
    }

    // 共用入帳（會員走 RPC、Demo 走本地）
    function doDeposit(amt, okMsg, btn) {
      if (member) {
        if (btn) btn.setAttribute("disabled", "");
        HL.api.walletTxn(amt, "deposit").then(function (R) {
          if (btn) btn.removeAttribute("disabled");
          if (!R || R.balance == null) { ui.toast("服務忙線，請稍後再試", "err"); return; }
          HL.state.set({ balance: +R.balance }); refreshBal(); ui.toast(okMsg + "（伺服器記帳）", "ok");
        });
        return;
      }
      var nb = HL.state.get().balance + amt; HL.state.set({ balance: nb }); pushDemoTxn("deposit", amt, nb); refreshBal();
      ui.toast(okMsg + "（Demo）", "ok");
    }

    // ===== 休閒模式：商城（遊戲幣套餐）=====
    function renderShop() {
      HL.dom.clear(body);
      body.appendChild(el("p", { class: "ax-muted", text: "選擇遊戲幣套餐（遊戲幣僅供娛樂，官方不提供真金兌換）：" }));
      body.appendChild(el("div", { class: "ax-shop-grid" }, COIN_PACKS.map(function (p) {
        var total = p.coins + (p.bonus || 0);
        var card = el("button", { class: "ax-shop-pack" + (p.tag ? " is-feat" : "") }, [
          p.tag ? el("span", { class: "ax-shop-pack__tag", text: p.tag }) : null,
          el("div", { class: "ax-shop-pack__coins", text: "🪙 " + p.coins.toLocaleString() }),
          el("div", { class: "ax-shop-pack__bonus", text: p.bonus ? ("+ " + p.bonus.toLocaleString() + " 紅利") : "　" }),
          el("div", { class: "ax-shop-pack__price", text: "NT$ " + p.price.toLocaleString() })
        ]);
        card.addEventListener("click", function () { doDeposit(total, "已購買 " + total.toLocaleString() + " 遊戲幣", null); });
        return card;
      })));
    }

    // ===== 休閒模式：玩家間交易（轉贈遊戲幣，Demo）=====
    function renderTrade() {
      HL.dom.clear(body);
      body.appendChild(el("p", { class: "ax-muted", text: "轉贈遊戲幣給其他玩家（休閒模式專屬 · Demo）：" }));
      var to = el("input", { type: "text", placeholder: "對方暱稱 / ID" });
      var box = amountBox("輸入轉出遊戲幣", "🪙");
      var btn = el("button", { class: "ax-btn-primary", text: "送出" });
      btn.addEventListener("click", function () {
        var nick = (to.value || "").trim(), amt = Math.floor(+box.input.value || 0);
        if (!nick) { ui.toast("請輸入對方暱稱 / ID", "warn"); return; }
        if (amt < 100) { ui.toast("最低轉出 100 遊戲幣", "warn"); return; }
        if (amt > HL.state.get().balance) { ui.toast("遊戲幣不足", "err"); return; }
        var nb = HL.state.get().balance - amt; HL.state.set({ balance: nb }); pushDemoTxn("withdraw", amt, nb); refreshBal();
        ui.toast("已轉 " + amt.toLocaleString() + " 遊戲幣給 " + nick + "（Demo）", "ok");
        to.value = ""; box.input.value = "";
      });
      body.appendChild(el("div", { class: "ax-search ax-wallet-input" }, [el("span", { class: "ax-search__ic", text: "👤" }), to]));
      body.appendChild(box.node);
      body.appendChild(btn);
      body.appendChild(el("p", { class: "ax-muted", style: "margin-top:8px", text: "⚠️ 遊戲幣交易僅供娛樂，無真實金錢價值。" }));
    }

    // ===== 真金模式：儲值（法幣 / 加密）=====
    function renderDep() {
      HL.dom.clear(body);
      var sel = { type: "fiat", idx: 0 };
      var fiat = el("div", { class: "ax-paym" }, FIAT_METHODS.map(function (m, i) {
        var b = el("button", { class: "ax-paym__opt" + (i === 0 ? " is-on" : "") }, [el("span", { class: "ax-paym__ic", text: m.ic }), el("span", { text: m.n })]);
        b.addEventListener("click", function () { sel = { type: "fiat", idx: i }; mark(b); area(); }); return b;
      }));
      var crypto = el("div", { class: "ax-paym" }, CRYPTO_COINS.map(function (m, i) {
        var b = el("button", { class: "ax-paym__opt" }, [el("span", { class: "ax-paym__ic", text: m.ic }), el("span", { text: m.code + " · " + m.net })]);
        b.addEventListener("click", function () { sel = { type: "crypto", idx: i }; mark(b); area(); }); return b;
      }));
      function mark(active) { [fiat, crypto].forEach(function (g) { Array.prototype.forEach.call(g.children, function (c) { c.classList.remove("is-on"); }); }); active.classList.add("is-on"); }
      var areaEl = el("div", {});
      function area() {
        HL.dom.clear(areaEl);
        if (sel.type === "crypto") {
          var coin = CRYPTO_COINS[sel.idx];
          areaEl.appendChild(el("div", { class: "ax-panel" }, [
            el("p", { class: "ax-muted", text: "將 " + coin.code + "（" + coin.net + "）轉入以下地址，入帳後自動換算（示意，無真實金流）：" }),
            el("div", { class: "ax-crypto" }, [el("div", { class: "ax-crypto__qr", text: "▦" }), el("div", { class: "ax-crypto__addr", text: DEMO_ADDR })])
          ]));
        } else {
          var box = amountBox("輸入儲值金額");
          var btn = el("button", { class: "ax-btn-primary", text: "確認儲值" });
          btn.addEventListener("click", function () {
            var amt = Math.floor(+box.input.value || 0);
            if (amt < 100) { ui.toast("最低儲值 100", "warn"); return; }
            if (amt > 1000000) { ui.toast("單筆上限 1,000,000", "warn"); return; }
            doDeposit(amt, "已儲值 " + HL.dom.money(amt) + "（" + FIAT_METHODS[sel.idx].n + "）", btn); box.input.value = "";
          });
          areaEl.appendChild(box.node); areaEl.appendChild(btn);
        }
      }
      body.appendChild(el("div", { class: "ax-muted", text: "法幣" }));
      body.appendChild(fiat);
      body.appendChild(el("div", { class: "ax-muted", style: "margin-top:8px", text: "加密貨幣" }));
      body.appendChild(crypto);
      body.appendChild(areaEl); area();
    }

    // ===== 真金模式：提款（待牌照；法幣 / 加密）=====
    function renderWd() {
      HL.dom.clear(body);
      if (!HL.money.canWithdraw()) {
        body.appendChild(el("div", { class: "ax-panel" }, [
          el("div", { class: "ax-result__title", text: "🔒 真金提款尚未開放" }),
          el("p", { class: "ax-muted", text: "真金提款 / 兌換功能已就緒，待取得合法牌照後開放。目前餘額僅供遊戲娛樂。" })
        ]));
        return;
      }
      var via = "fiat";
      var toggle = el("div", { class: "ax-tabs" });
      [["fiat", "法幣（銀行）"], ["crypto", "加密貨幣"]].forEach(function (t) {
        var b = el("button", { class: "ax-tab" + (via === t[0] ? " is-active" : ""), text: t[1], onClick: function () { via = t[0]; Array.prototype.forEach.call(toggle.children, function (c) { c.classList.remove("is-active"); }); b.classList.add("is-active"); drawForm(); } });
        toggle.appendChild(b);
      });
      var formEl = el("div", {});
      function drawForm() {
        HL.dom.clear(formEl);
        if (via === "crypto") {
          formEl.appendChild(el("div", { class: "ax-search ax-wallet-input" }, [el("span", { class: "ax-search__ic", text: "₮" }), el("input", { type: "text", placeholder: "提款地址（USDT-TRC20）" })]));
        } else {
          formEl.appendChild(el("div", { class: "ax-panel" }, [el("div", { class: "ax-kv ax-kv--row" }, [el("span", { class: "ax-muted", text: "提款帳戶" }), el("b", { text: "🏦 台北富邦 ****8731" })])]));
        }
        var box = amountBox("輸入提款金額");
        box.node.querySelector(".ax-stakes").appendChild(el("button", { class: "ax-stake", text: "全部", onClick: function () { box.input.value = String(Math.floor(HL.state.get().balance)); } }));
        var btn = el("button", { class: "ax-btn-primary", text: "確認提款" });
        btn.addEventListener("click", function () {
          var amt = Math.floor(+box.input.value || 0);
          if (amt < 100) { ui.toast("最低提款 100", "warn"); return; }
          if (amt > HL.state.get().balance) { ui.toast("超過可提款餘額", "err"); return; }
          btn.setAttribute("disabled", "");
          if (member) {
            HL.api.walletTxn(amt, "withdraw").then(function (R) {
              btn.removeAttribute("disabled");
              if (!R || R.balance == null) { ui.toast("提款服務忙線，請稍後再試", "err"); return; }
              HL.state.set({ balance: +R.balance }); refreshBal(); ui.toast("已提款 " + HL.dom.money(amt) + "（" + (via === "crypto" ? "加密" : "銀行") + " · 伺服器記帳）", "ok"); box.input.value = "";
            });
            return;
          }
          var nb = HL.state.get().balance - amt; HL.state.set({ balance: nb }); pushDemoTxn("withdraw", amt, nb); refreshBal();
          ui.toast("已提款 " + HL.dom.money(amt) + "（" + (via === "crypto" ? "加密" : "銀行") + " · Demo）", "ok"); btn.removeAttribute("disabled"); box.input.value = "";
        });
        formEl.appendChild(box.node); formEl.appendChild(btn);
      }
      body.appendChild(toggle); body.appendChild(formEl); drawForm();
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
      (casual ? [["shop", "商城"], ["trade", "交易"], ["hist", "紀錄"]] : [["dep", "儲值"], ["wd", "提款"], ["hist", "紀錄"]]).forEach(function (t) {
        tabsEl.appendChild(el("button", { class: "ax-tab" + (tab === t[0] ? " is-active" : ""), text: t[1], onClick: function () { setTab(t[0]); } }));
      });
      if (k === "shop") renderShop(); else if (k === "trade") renderTrade(); else if (k === "dep") renderDep(); else if (k === "wd") renderWd(); else renderHist();
    }
    setTab(casual ? "shop" : "dep");

    ui.modal(casual ? "錢包 · 商城（遊戲幣）" : "錢包 · 儲值 / 提款", [
      el("div", { class: "ax-wallet-top" }, [el("span", { class: "ax-muted", text: casual ? "遊戲幣餘額" : "可用餘額" }), balEl]),
      tabsEl,
      body,
      el("span", { class: "ax-demo-tag", text: HL.money.modeLabel() + " · " + (member ? "伺服器記帳 · 無真實金流" : "Demo · 無真實金流") })
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
        el("button", { class: "ax-ai-fab", title: "虛擬主播 + 聊天室", onClick: function () { HL.panels.toggleAi(); } }, [
          el("span", { class: "ax-ai-fab__av", text: "🔴" }), el("span", { text: "主播" })
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

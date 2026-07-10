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
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; } // i18n：無則回預設(zh-Hant)文案

  var SIDE = [
    { ic: "🏠", t: "大廳", go: "lobby" },
    { ic: "🌐", t: "全球獎", go: "globe", group: ["globe", "liveroom"] },
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
      // #20 流水引擎：有待解鎖紅利時提示（鎖定額不在主餘額、不可轉出/提取，流水達標後才可領）
      if (HL.bonus && HL.bonus.canWithdraw && !HL.bonus.canWithdraw().ok) {
        body.appendChild(el("p", { class: "ax-muted", style: "margin-top:4px" }, [
          el("span", { text: "🔒 另有待解鎖紅利" }),
          document.createTextNode(" " + HL.dom.money(HL.bonus.locked()) + " "),
          el("span", { text: "流水中（不可轉出，達標後至領取中心領取）" })
        ]));
      }
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
          formEl.appendChild(el("div", { class: "ax-panel" }, [HL.ui.kv("提款帳戶", "🏦 台北富邦 ****8731", { row: true })]));
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
  function killModals() { HL.ui.closeAll(); }
  // #31 VIP 微等級：header 顯示全域 Lv + 距下一子級迷你進度條（refreshChrome 即時更新）
  function vipLineText(member) {
    if (!HL.vip) return "Unranked";
    var s = HL.vip.status();
    return s.icon + " " + s.name + " · Lv " + s.level + (member ? "" : " 會員");
  }
  function playerWidget() {
    var member = isMember(), prof = member ? profileOf() : null;
    var av = member ? (prof.avatar || "👑") : null;
    var subPct = HL.vip ? HL.vip.status().subPct : 0;
    return el("button", { class: "ax-player", onClick: function () { member ? accountMenu() : (HL.vip ? HL.vip.open() : ui.comingSoon("帳號中心")); } }, [
      el("div", { class: "ax-avatar" + (av ? " ax-avatar--emoji" : ""), text: av || "A" }),
      el("div", { class: "ax-player__meta" }, [
        el("b", { text: member ? (prof.display_name || HL.auth.displayName()) : "Allen 162" }),
        el("small", { id: "ax-player-vip", text: vipLineText(member) }),
        el("div", { class: "ax-player__bar" }, [el("div", { class: "ax-player__fill", id: "ax-player-vipbar", style: "width:" + subPct + "%" })])
      ]),
      el("span", { class: "ax-caret", text: "▾" })
    ]);
  }
  function accountMenu() {
    var c = HL.state.get().currency, u = HL.auth.user(), prof = profileOf();
    ui.modal("帳號 · " + (prof.display_name || HL.auth.displayName()), [
      el("div", { class: "ax-panel" }, [
        HL.ui.kv("頭像 / 暱稱", (prof.avatar || "👑") + " " + (prof.display_name || HL.auth.displayName()), { row: true }),
        HL.ui.kv("Email", (u && u.email) || "—", { row: true }),
        HL.ui.kv("餘額", fmtBal(c, balanceOf(c)), { row: true, valCls: "ax-gold" })
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

  // ---- Rakeback 每日返水快領下拉（#22）----
  var rbTimer = null;
  function rbFmtCount(ms) {
    ms = Math.max(0, ms); var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? (h + "h " + m + "m") : (m + "m " + sec + "s");
  }
  function rakebackWidget() {
    var dd = el("div", { class: "ax-rb-dropdown", id: "ax-rb-dd" });
    var btn = el("button", { class: "ax-icon-btn", id: "ax-rb-btn", text: "💧", title: t("nav.rakeback", "每日返水"), onClick: toggleRbDropdown }, [
      el("span", { class: "ax-badge-dot", id: "ax-rb-badge", style: "display:none" })
    ]);
    return el("div", { class: "ax-rb-wrap" }, [btn, dd]);
  }
  function renderRbDropdown() {
    var dd = document.getElementById("ax-rb-dd"); if (!dd || !HL.rakeback) return;
    var claimable = Math.floor(HL.rakeback.pot());
    HL.dom.clear(dd);
    dd.appendChild(el("div", { class: "ax-rb-dd__head" }, [
      el("b", { text: "💧 每日返水" }),
      el("span", { class: "ax-rb-dd__rate", text: (HL.rakeback.rate() * 100).toFixed(1) + "%" + ((HL.happyhour && HL.happyhour.mult && HL.happyhour.mult() > 1) ? " ⚡×2" : "") })
    ]));
    dd.appendChild(el("div", { class: "ax-rb-dd__amt", text: money(claimable) }));
    dd.appendChild(el("div", { class: "ax-rb-dd__exp" }, [
      el("span", { class: "ax-muted", text: "逾期作廢，剩餘 " }),
      el("b", { id: "ax-rb-count", text: rbFmtCount(HL.rakeback.msToReset()) })
    ]));
    dd.appendChild(el("button", {
      class: claimable > 0 ? "ax-btn-primary" : "ax-btn-ghost",
      text: claimable > 0 ? ("領取 " + money(claimable)) : "暫無可領返水",
      disabled: claimable > 0 ? null : "disabled",
      onClick: function () { var got = HL.rakeback.claim(); if (got > 0) { ui.toast("已領取返水 " + money(got) + " 到主餘額", "ok"); renderRbDropdown(); refreshRbBadge(); } }
    }));
    dd.appendChild(el("button", { class: "ax-rb-dd__more", text: "返水明細 / 各級費率 →", onClick: function () { closeRbDropdown(); HL.rakeback.open(); } }));
  }
  function toggleRbDropdown(e) { if (e) e.stopPropagation(); var dd = document.getElementById("ax-rb-dd"); if (!dd) return; dd.classList.contains("open") ? closeRbDropdown() : openRbDropdown(); }
  function openRbDropdown() {
    var dd = document.getElementById("ax-rb-dd"); if (!dd || !HL.rakeback) return;
    renderRbDropdown(); dd.classList.add("open");
    rbTimer = global.setInterval(function () { var c = document.getElementById("ax-rb-count"); if (c) c.textContent = rbFmtCount(HL.rakeback.msToReset()); }, 1000);
    setTimeout(function () { document.addEventListener("click", onRbDocClick); }, 0);
  }
  function closeRbDropdown() {
    var dd = document.getElementById("ax-rb-dd"); if (dd) dd.classList.remove("open");
    if (rbTimer) { global.clearInterval(rbTimer); rbTimer = null; }
    document.removeEventListener("click", onRbDocClick);
  }
  function onRbDocClick(e) { var wrap = document.querySelector(".ax-rb-wrap"); if (wrap && !wrap.contains(e.target)) closeRbDropdown(); }
  function refreshRbBadge() { var b = document.getElementById("ax-rb-badge"); if (!b || !HL.rakeback) return; b.style.display = Math.floor(HL.rakeback.pot()) >= 1 ? "block" : "none"; }

  function header() {
    return el("header", { class: "ax-header" }, [
      el("button", { class: "ax-nav-toggle", "aria-label": t("nav.menu", "主選單"), title: t("nav.menu", "主選單"), text: "☰", onClick: openDrawer }),
      el("div", { class: "ax-brand" }, [
        el("span", { class: "ax-brand__mark", text: "A" }),
        el("span", { class: "ax-brand__name", html: "Apex <b>Win</b>" })
      ]),
      el("div", { class: "ax-header__spacer" }),
      el("button", { class: "ax-icon-btn", id: "ax-notif-btn", text: "🔔", title: t("nav.notify", "通知"), onClick: function () { if (HL.notify) HL.notify.open(); else ui.comingSoon("通知"); } }, [el("span", { class: "ax-badge-dot", id: "ax-notif-badge", style: "display:none" })]),
      el("button", { class: "ax-icon-btn", text: "🌐", title: t("nav.lang", "語言"), onClick: function () { if (HL.i18n) HL.i18n.open(); else ui.comingSoon("語言切換"); } }),
      rakebackWidget(),
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
      item("📋", t("bb.tasks", "每日任務"), { text: (HL.tasks ? (HL.tasks.list().filter(function (x) { return x.done && !x.claimed; }).length + " 可領取") : "查看任務") }, function () { HL.tasks.open(); }),
      item("🎁", t("bb.bonus", "獎勵中心"), { text: (HL.bonus && HL.bonus.balance() > 0) ? ("可領 " + money(HL.bonus.balance())) : "領取中心" }, function () { HL.bonus.open(); }),
      item("🎡", t("bb.spin", "幸運轉盤"), { text: (HL.luckyspin && HL.luckyspin.status().canSpin) ? "今日可轉" : "今日已轉" }, function () { if (HL.luckyspin) HL.luckyspin.open(); else ui.comingSoon("幸運轉盤"); }),
      item("🎟️", t("bb.raffle", "每週抽獎"), { text: (HL.raffle ? (HL.raffle.status().tickets + " 張券") : "押注換券") }, function () { if (HL.raffle) HL.raffle.open(); else ui.comingSoon("每週抽獎"); }),
      item("🎫", t("bb.redeem", "兌換碼"), { text: "輸入領獎金" }, function () { if (HL.redeem) HL.redeem.open(); else ui.comingSoon("兌換碼"); }),
      item("🔄", t("bb.reload", "週期紅利"), { text: (HL.reload ? (HL.reload.claimableCount() > 0 ? (HL.reload.claimableCount() + " 檔可領") : "本期已領") : "VIP 週期禮") }, function () { if (HL.reload) HL.reload.open(); else ui.comingSoon("週期紅利"); }),
      item("🎯", t("bb.challenge", "多倍數挑戰"), { text: (HL.challenges ? (HL.challenges.claimableCount() > 0 ? (HL.challenges.claimableCount() + " 可領取") : "命中倍數領獎") : "命中倍數領獎") }, function () { if (HL.challenges) HL.challenges.open(); else ui.comingSoon("多倍數挑戰"); }),
      item("🛍️", t("bb.shop", "點數商城"), { text: (HL.shop ? (HL.shop.points() + " 點") : "賺→逛→換") }, function () { if (HL.shop) HL.shop.open(); else ui.comingSoon("點數商城"); }),
      item("💸", t("bb.cashback", "淨損回饋"), { text: (HL.cashback ? (HL.cashback.pot() > 0 ? ("可領 " + money(HL.cashback.pot())) : "淨輸返現") : "淨輸返現") }, function () { if (HL.cashback) HL.cashback.open(); else ui.comingSoon("淨損 Cashback"); }),
      item("⚡", t("bb.happyhour", "Happy Hour"), { id: "ax-bb-hh", text: (HL.happyhour && HL.happyhour.status().active) ? "返水×2 進行中" : "限時返水加成" }, function () { if (HL.happyhour) HL.happyhour.open(); else ui.comingSoon("Happy Hour"); }),
      item("🏰", t("bb.city", "黃金之城"), { text: (HL.base ? (HL.base.bricks() + " 金磚") : "蓋城市領里程碑") }, function () { if (HL.base) HL.base.open(); else ui.comingSoon("黃金之城"); }),
      item("🛡️", t("bb.responsible", "負責任博弈"), { text: "使命宣言" }, function () { ui.comingSoon("負責任博弈 · 使命宣言"); }),
      item("✅", t("bb.fair", "可驗證公平"), { text: "如何驗證" }, function () { if (HL.fair) HL.fair.verifyModal(); else ui.comingSoon("可驗證公平 · 如何驗證"); }),
      item("💎", t("bb.vip", "VIP 俱樂部"), { text: (HL.vip ? (HL.vip.status().icon + " " + HL.vip.status().name) : "專屬禮遇") }, function () { HL.vip.open(); }),
      el("div", { class: "ax-bottombar__right" }, [
        el("button", { class: "ax-ai-fab", title: "你的專屬夥伴", onClick: function () { HL.panels.toggleAi(); } }, [
          el("span", { class: "ax-ai-fab__av", text: "🧝‍♀️" }), el("span", { text: t("bb.partner", "夥伴") })
        ]),
        el("button", { class: "ax-ai-fab", title: "聊天室", onClick: function () { HL.panels.toggleChat(); } }, [
          el("span", { class: "ax-ai-fab__av", style: "background:var(--ax-grad-brand)", text: "💬" }), el("span", { text: "聊天" })
        ])
      ])
    ]);
  }

  // ---- 手機主導覽（≤720px）：header 漢堡鈕 → 左側抽屜 ----
  // 桌機以側欄(ax-sidebar)導覽；≤720 側欄隱藏，改用此抽屜（原本手機無法切換 大廳/全球獎/競技場/娛樂城）。
  function onDrawerKey(e) { if (e.key === "Escape") closeDrawer(); }
  function openDrawer() {
    var mask = document.getElementById("ax-drawer-mask"); if (!mask) return;
    mask.classList.add("is-open"); mask.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onDrawerKey, true);
    var first = mask.querySelector(".ax-drawer__item"); if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 0);
  }
  function closeDrawer() {
    var mask = document.getElementById("ax-drawer-mask"); if (!mask) return;
    mask.classList.remove("is-open"); mask.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onDrawerKey, true);
  }
  function mobileDrawer() {
    var view = HL.state.get().view;
    var panel = el("nav", { class: "ax-drawer", "aria-label": t("nav.menu", "主選單") }, [
      el("div", { class: "ax-drawer__brand" }, [el("span", { class: "ax-brand__mark", text: "A" }), el("span", { class: "ax-brand__name", html: "Apex <b>Win</b>" })])
    ]);
    SIDE.forEach(function (it) {
      var active = it.group ? (it.group.indexOf(view) >= 0) : (it.go && it.go === view);
      panel.appendChild(el("button", {
        class: "ax-drawer__item" + (active ? " is-active" : ""),
        onClick: function () { closeDrawer(); if (it.go) HL.router.go(it.go); else ui.comingSoon(it.soon); }
      }, [el("span", { class: "ic", text: it.ic }), el("span", { text: it.t })]));
    });
    panel.appendChild(el("button", { class: "ax-drawer__item ax-side-demo", onClick: function () { closeDrawer(); HL.demoTools.open(); } }, [el("span", { class: "ic", text: "⚙" }), el("span", { text: "DEMO" })]));
    var mask = el("div", { class: "ax-drawer-mask", id: "ax-drawer-mask", "aria-hidden": "true" }, [panel]);
    mask.addEventListener("click", function (e) { if (e.target === mask) closeDrawer(); });
    return mask;
  }

  function render() {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("div", { class: "ax-shell" }, [
      header(),
      sidebar(),
      el("main", { class: "ax-main", id: "ax-main-content" }),
      bottombar()
    ]));
    frag.appendChild(mobileDrawer()); // 手機主導覽抽屜（桌機以 CSS 隱藏）
    return frag;
  }

  // 公版「返回娛樂城」列：掛在遊戲節點「之外、之上」（不進遊戲視窗/GameFrame）。
  // 所有遊戲頁共用同一顆；未來新遊戲（走 view:"game"）自動繼承，免在各遊戲自刻。
  function gameBackBar(target) {
    return el("div", { class: "ax-gameback" }, [
      el("button", { class: "ax-gameback__btn", type: "button", title: "返回娛樂城",
        onClick: function () { HL.router.go(target || "casino"); } }, [
        el("span", { class: "ax-gameback__i", text: "‹" }),
        el("span", { text: "返回娛樂城" })
      ])
    ]);
  }

  function mountView(node, backTo) {
    var main = document.getElementById("ax-main-content");
    if (!main) return;
    HL.dom.clear(main);
    if (backTo) main.appendChild(gameBackBar(backTo)); // 遊戲頁才補公版返回列
    main.appendChild(node);
    main.scrollTop = 0;
  }

  function refreshChrome() {
    refreshWalletPill();
    refreshRbBadge();
    var s = HL.state.get();
    var db = document.getElementById("ax-duel-balance");
    if (db) db.textContent = money(s.balance);
    // #31 VIP 微等級：header Lv 文字 + 迷你進度條即時推進
    if (HL.vip) {
      var pv = document.getElementById("ax-player-vip");
      if (pv) pv.textContent = vipLineText(isMember());
      var pb = document.getElementById("ax-player-vipbar");
      if (pb) pb.style.width = HL.vip.status().subPct + "%";
    }
  }

  HL.shell = { render: render, mountView: mountView, refreshChrome: refreshChrome };
})(window);

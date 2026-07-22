/*
 * Apex Win｜營運監控儀表板（Operator Dashboard）
 * ---------------------------------------------------------------------------
 * 從 ⚙ DEMO/營運工具面板開啟。以 HL.ledger 的莊家帳本彙總，全面健檢暫代金流與規則：
 *   收支總覽 KPI（儲值/提款/淨現金流 · 流水/派彩/GGR · 送幣成本/NGR · 流通幣/活躍玩家）、
 *   規則健檢警示（資料驅動 + 已知結構性風險）、淨部位趨勢、遊戲別 GGR/RTP、送幣成本明細、JP 收支。
 * a11y/焦點/Escape 沿用 HL.ui.modal（wide=920px）。純呈現，資料源 HL.ledger（真站乾淨、假站含模擬）。
 * 註冊於 window.HL.opsBoard。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;

  function signed(n) { n = Math.round(n || 0); return (n >= 0 ? "+" : "−") + money(Math.abs(n)); }
  function pctStr(x) { return (x * 100).toFixed(1) + "%"; }
  function tone(n) { return n > 0 ? "ax-green" : (n < 0 ? "ax-red" : "ax-muted"); }

  // KPI 小卡：label 上、值下（+ 可選副標）
  function tile(label, valueText, opts) {
    opts = opts || {};
    var kids = [
      el("small", { class: "ax-ops__tlabel", text: label }),
      el("b", { class: "ax-ops__tval" + (opts.valCls ? " " + opts.valCls : ""), text: valueText })
    ];
    if (opts.sub) kids.push(el("small", { class: "ax-ops__tsub ax-muted", text: opts.sub }));
    return el("div", { class: "ax-ops__tile" + (opts.big ? " ax-ops__tile--big" : "") }, kids);
  }

  // 表格（寬內容自身橫捲，不撐破頁）
  function table(headers, rows) {
    var thead = el("tr", {}, headers.map(function (h) { return el("th", { class: h.num ? "ax-ops__num" : "", text: h.t }); }));
    var body = rows.length
      ? rows.map(function (r) {
          return el("tr", { class: r.warn ? "ax-ops__tr--warn" : "" }, r.cells.map(function (c) {
            return el("td", { class: (c.num ? "ax-ops__num " : "") + (c.cls || ""), text: c.t });
          }));
        })
      : [el("tr", {}, [el("td", { class: "ax-muted", colspan: String(headers.length), text: "尚無資料" })])];
    return el("div", { class: "ax-ops__tablewrap" }, [
      el("table", { class: "ax-ops__table" }, [el("thead", {}, [thead]), el("tbody", {}, body)])
    ]);
  }

  // 淨部位趨勢 sparkline（[ts,net] 陣列）
  function sparkline(series) {
    var w = 640, h = 72;
    var vals = series.map(function (p) { return p[1]; });
    if (vals.length < 2) return el("div", { class: "ax-ops__spark ax-ops__spark--empty" }, [el("small", { class: "ax-muted", text: "資料累積後顯示淨部位（NGR）走勢" })]);
    var min = Math.min.apply(null, vals.concat([0])), max = Math.max.apply(null, vals.concat([0]));
    if (max === min) max = min + 1;
    var n = vals.length;
    function x(i) { return (i / (n - 1)) * (w - 4) + 2; }
    function y(v) { return h - 4 - ((v - min) / (max - min)) * (h - 8); }
    var dPath = "M " + x(0).toFixed(1) + " " + y(vals[0]).toFixed(1);
    for (var i = 1; i < n; i++) dPath += " L " + x(i).toFixed(1) + " " + y(vals[i]).toFixed(1);
    var last = vals[n - 1];
    var box = el("div", { class: "ax-ops__spark" });
    box.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="淨部位走勢">' +
      '<line x1="0" y1="' + y(0).toFixed(1) + '" x2="' + w + '" y2="' + y(0).toFixed(1) + '" stroke="var(--ax-border)" stroke-dasharray="4 4"/>' +
      '<path d="' + dPath + '" fill="none" stroke="' + (last >= 0 ? "var(--ax-green)" : "var(--ax-red)") + '" stroke-width="2" stroke-linejoin="round"/></svg>';
    return box;
  }

  // 已知結構性風險（來自全站金流稽核；與資料無關，恆列為提醒）
  var STATIC_RISKS = [
    "✅ 累積彩金 JP：真站已改「自籌」(seed=0、池由下注貢獻累積)，不再是 8M 假種子由分幣資助的印鈔黑洞；假站維持展示大池。",
    "✅ 返水/返現/VIP 升級金：真站已降到低於莊家優勢(返水 0.1–0.3%、返現 2–6%、VIP 金 40%)，總送幣 < GGR；假站維持慷慨。",
    "✅ 救濟金 Faucet：真站已設金額(300)+終身次數(5 次)上限；紅利流水 WAGER_MULT 真站 8×（假站 1×）。",
    "⚠️ 暗影儀式 slot：真站已套 0.90 莊家利潤 scalar 為近似防護，但無精準 RTP 數學模型 → 仍須以伺服器模型校準（見上方遊戲別實測 RTP，可據以微調 scalar）。",
    "⚠️ bounty_mine RPC 派彩仍信任前端傳入的 p_maxmult ＝伺服器端印錢漏洞(supabase-phase5.sql)；純前端原型無法修，真金上線前務必於後端修正。",
    "⚠️ 直入主餘額的送幣（救濟金/每日簽到/返水/JP 命中）在真金模式可即時提走 → 上線前建議綁流水/KYC 提款閘。"
  ];

  function computeAlerts(d, games) {
    var a = [];
    if (d.turnover > 0 && d.ngr < 0) a.push("🔴 整站淨收益 NGR 為負（" + signed(d.ngr) + "）：送幣＋派彩多於流水進帳，經濟結構性虧損、不可持續。");
    if (d.turnover > 0 && d.rtp > 1) a.push("🔴 整站實測 RTP " + pctStr(d.rtp) + "（>100%）：玩家長期為正期望值，莊家倒貼。");
    if (d.cashNet < 0) a.push("🟠 淨現金流為負（" + signed(d.cashNet) + "）：提款多於儲值。");
    games.forEach(function (g) {
      if (g.bet >= 500 && g.rtp > 1) a.push("🟠 遊戲「" + g.game + "」實測 RTP " + pctStr(g.rtp) + "（>100%）：賠付偏高（或樣本不足）。");
    });
    return a;
  }

  function render() {
    var live = HL.site && HL.site.isLive();
    var d = HL.ledger ? HL.ledger.derived() : null;
    var games = HL.ledger ? HL.ledger.byGame() : [];
    var sources = HL.ledger ? HL.ledger.bySource() : [];
    var root = el("div", { class: "ax-ops" });

    // 模式橫幅
    root.appendChild(el("div", { class: "ax-ops__banner " + (live ? "is-live" : "is-demo") }, [
      el("b", { text: live ? "🟢 真站 · 真實營運數據" : "🟡 假站 · 展示模式" }),
      el("span", { class: "ax-muted", text: live ? "無模擬玩家/流水/JP，以下為乾淨真實記帳。" : "含模擬玩家/流水/JP，以下數字僅供 UI 展示、非真實營運。" })
    ]));

    if (!d) { root.appendChild(el("p", { class: "ax-muted", text: "帳本尚未就緒。" })); return root; }

    // 規則健檢警示（資料驅動）
    var alerts = computeAlerts(d, games);
    var alertKids = [el("div", { class: "ax-ops__alerts-head" }, [el("b", { text: "🩺 規則健檢" }), el("span", { class: "ax-muted", text: alerts.length ? (alerts.length + " 項需注意") : "資料驅動檢查：目前無警示" })])];
    if (alerts.length) alerts.forEach(function (t) { alertKids.push(el("div", { class: "ax-ops__alert", text: t })); });
    else alertKids.push(el("div", { class: "ax-ops__alert ax-ops__alert--ok", text: "✅ 目前流水/派彩/送幣的收支未觸發虧損或 RTP>100% 警示（可蓄意刷返水/救濟金再看是否轉負）。" }));
    root.appendChild(el("section", { class: "ax-ops__alerts" }, alertKids));

    // 收支總覽 KPI
    root.appendChild(HL.ui.sectionTitle("💰 收支總覽"));
    root.appendChild(el("div", { class: "ax-ops__kpis" }, [
      tile("儲值（進帳）", money(d.deposit), { valCls: "ax-green" }),
      tile("提款（出帳）", money(d.withdraw), { valCls: "ax-red" }),
      tile("淨現金流", signed(d.cashNet), { valCls: tone(d.cashNet) }),
      tile("總流水 Turnover", money(d.turnover)),
      tile("總派彩 Payout", money(d.payout)),
      tile("GGR 毛收益", signed(d.ggr), { valCls: tone(d.ggr), sub: "流水 − 派彩" }),
      tile("送幣成本", money(d.promo), { valCls: "ax-red", sub: "紅利 " + money(d.bonus) + " · 救濟 " + money(d.faucet) }),
      tile("NGR 淨收益", signed(d.ngr), { valCls: tone(d.ngr), big: true, sub: "GGR − 送幣" }),
      tile("實測 RTP", d.turnover > 0 ? pctStr(d.rtp) : "—", { valCls: d.rtp > 1 ? "ax-red" : "ax-gold", sub: "派彩 / 流水" }),
      tile("流通總幣", money(d.coins), { sub: "玩家餘額＋獎金錢包" }),
      tile("活躍玩家", String(d.players), { sub: "本機彙總" }),
      tile("投注次數", String(d.betCount))
    ]));

    // 淨部位趨勢
    root.appendChild(HL.ui.sectionTitle("📈 淨部位（NGR）趨勢"));
    root.appendChild(sparkline(HL.ledger.series()));

    // 遊戲別 GGR / RTP
    root.appendChild(HL.ui.sectionTitle("🎮 遊戲別 GGR / RTP"));
    root.appendChild(table(
      [{ t: "遊戲" }, { t: "投注數", num: true }, { t: "流水", num: true }, { t: "派彩", num: true }, { t: "GGR", num: true }, { t: "實測 RTP", num: true }],
      games.map(function (g) {
        var over = g.rtp > 1 && g.bet >= 500;
        return {
          warn: over,
          cells: [
            { t: g.game },
            { t: String(g.plays), num: true },
            { t: money(g.bet), num: true },
            { t: money(g.win), num: true },
            { t: signed(g.ggr), num: true, cls: tone(g.ggr) },
            { t: g.bet > 0 ? pctStr(g.rtp) : "—", num: true, cls: over ? "ax-red" : "" }
          ]
        };
      })
    ));
    root.appendChild(el("p", { class: "ax-ops__note ax-muted", text: "理論莊優：即時遊戲 ~1%（RTP 99%）· 輪盤 2.70% · 百家樂 ~1.06%/1.24%。暗影儀式(slot)無強制 RTP 模型 ⚠。" }));

    // 送幣成本明細
    root.appendChild(HL.ui.sectionTitle("🎁 送幣成本明細（by 來源）"));
    root.appendChild(table(
      [{ t: "來源" }, { t: "累計送出", num: true }, { t: "佔比", num: true }],
      sources.map(function (s) {
        return { cells: [{ t: s.source }, { t: money(s.amount), num: true }, { t: d.promo > 0 ? pctStr(s.amount / d.promo) : "—", num: true }] };
      })
    ));

    // JP 收支
    root.appendChild(HL.ui.sectionTitle("🎰 累積彩金 JP 收支"));
    root.appendChild(el("div", { class: "ax-ops__kpis" }, [
      tile("真實提撥（自下注）", money(d.jpSeed)),
      tile("JP 命中派彩", money(d.jpHit), { valCls: "ax-red" }),
      tile("JP 淨額", signed(d.jpNet), { valCls: tone(d.jpNet), sub: "提撥 − 命中" })
    ]));
    root.appendChild(el("p", { class: "ax-ops__note ax-muted", text: "廣告池（MEGA 8M / MAJOR 80k / MINI 3k 起）為展示數字、非真實負債；真站已關閉每秒自漲與隨機起始堆疊。" }));

    // 已知結構性風險
    root.appendChild(HL.ui.sectionTitle("⚠️ 已知結構性風險（真金前必修）"));
    root.appendChild(HL.ui.rules(STATIC_RISKS));

    return root;
  }

  function open() {
    if (!HL.ledger) { if (HL.ui) HL.ui.toast("帳本模組未載入", "warn"); return; }
    var m = HL.ui.modal("📊 營運監控儀表板", [
      render(),
      el("div", { class: "ax-ops__actions" }, [
        el("button", { class: "ax-btn-ghost", text: "🔄 重新整理", onClick: function () { m.close(); open(); } }),
        el("button", { class: "ax-btn-ghost", text: "🧹 重置帳本", onClick: function () {
          if (global.confirm("清空目前站別的營運帳本（僅本站別，另一站別不受影響）？")) { HL.ledger.reset(); m.close(); open(); HL.ui.toast("已重置營運帳本", "ok"); }
        } })
      ])
    ], { wide: true });
    return m;
  }

  HL.opsBoard = { open: open, render: render };
})(window);

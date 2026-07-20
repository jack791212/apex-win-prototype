/*
 * Apex Win｜共用 RNG 桌遊引擎 HL.table
 * 給「多注區下注」的桌遊共用（百家樂 7a、輪盤 7b…）：
 *  - 籌碼選擇列（多面額）
 *  - 多注區下注狀態：place / undo / clear / rebet（皆受餘額閘控）
 *  - commit()：驗證 + 立即扣注 + 快照（供重押）
 *  - settle(snap, returns)：依各注區「總賠付倍數」派彩 + 同步餘額 + 掛 HL.liveStats.record
 * 各桌遊自行排版注區 DOM（呼叫 place(id)/staked(id) 畫籌碼），本引擎只管籌碼/金流/結算。
 * 註冊於 window.HL.table。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;

  function bal() { return HL.instant ? HL.instant.bal() : HL.state.get().balance; }
  function setBal(v) {
    if (HL.instant) { HL.instant.setBal(v); return; }
    HL.state.set({ balance: Math.max(0, Math.round(v)) });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }

  var DEFAULT_CHIPS = [10, 50, 100, 500, 1000];
  var CHIP_COLORS = ["#3b82f6", "#22c55e", "#475569", "#a855f7", "#f59e0b", "#ef4444"];

  function betArea(opts) {
    opts = opts || {};
    var chips = opts.chips || DEFAULT_CHIPS;
    var chip = chips[Math.min(1, chips.length - 1)]; // 預設選第二檔
    var stakes = {};   // id → 金額
    var actions = [];  // 下注歷程（供復原）：[{id, amt}]
    var last = null;   // 上局快照（供重押）
    var locked = false;
    var totalEl = el("b", { class: "ax-tbl__total", text: money(0) });

    function total() { var s = 0; for (var k in stakes) s += stakes[k]; return s; }
    function changed() { totalEl.textContent = money(total()); if (opts.onChange) opts.onChange(stakes, total()); }

    function place(id) {
      if (locked) return false;
      if (total() + chip > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return false; }
      stakes[id] = (stakes[id] || 0) + chip; actions.push({ id: id, amt: chip }); changed(); return true;
    }
    function undo() { if (locked) return; var a = actions.pop(); if (!a) return; stakes[a.id] -= a.amt; if (stakes[a.id] <= 0) delete stakes[a.id]; changed(); }
    function clear() { if (locked) return; stakes = {}; actions = []; changed(); }
    function rebet() {
      if (locked || !last) return false;
      var t = 0, k; for (k in last) t += last[k];
      if (t <= 0) return false;
      if (t > bal()) { HL.ui.toast("餘額不足，無法重押", "warn"); return false; }
      stakes = {}; actions = [];
      for (k in last) { stakes[k] = last[k]; actions.push({ id: k, amt: last[k] }); }
      changed(); return true;
    }
    function commit() {
      var t = total();
      if (t <= 0) { HL.ui.toast("請先下注", "warn"); return null; }
      if (t > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return null; }
      var snap = {}; for (var k in stakes) snap[k] = stakes[k];
      last = snap;       // 供重押
      setBal(bal() - t); // 立即扣注
      return snap;
    }
    // returns：各注區「總賠付倍數」（輸=0、平/和退本=1、贏 1:1=2、莊扣傭=1.95、和=9、對子=12…）
    function settle(snap, returns) {
      var staked = 0, payout = 0, k;
      for (k in snap) { staked += snap[k]; payout += Math.round(snap[k] * ((returns && returns[k]) || 0)); }
      if (payout) setBal(bal() + payout);
      if (HL.liveStats) HL.liveStats.record(opts.game || "table", staked, payout);
      return { staked: staked, payout: payout, net: payout - staked };
    }

    // 籌碼列
    var rail = el("div", { class: "ax-tbl__chips" });
    function renderRail() {
      HL.dom.clear(rail);
      chips.forEach(function (c, i) {
        var b = el("button", {
          class: "ax-tbl__chip" + (c === chip ? " is-active" : ""),
          style: "--chip:" + CHIP_COLORS[i % CHIP_COLORS.length],
          onClick: function () { chip = c; renderRail(); }
        }, [el("span", { class: "ax-tbl__chipv", text: c >= 1000 ? (c / 1000) + "k" : String(c) })]);
        rail.appendChild(b);
      });
    }
    renderRail();

    function controls(onDeal, dealLabel) {
      var dealBtn = el("button", { class: "ax-btn-primary ax-tbl__deal", text: dealLabel || "開牌", onClick: function () { onDeal(); } });
      var node = el("div", { class: "ax-tbl__ctrls" }, [
        el("button", { class: "ax-btn-ghost", text: "清除", onClick: clear }),
        el("button", { class: "ax-btn-ghost", text: "復原", onClick: undo }),
        el("button", { class: "ax-btn-ghost", text: "重押", onClick: function () { rebet(); } }),
        dealBtn
      ]);
      return { node: node, dealBtn: dealBtn };
    }

    return {
      chipRail: rail, totalEl: totalEl,
      chip: function () { return chip; },
      place: place, undo: undo, clear: clear, rebet: rebet,
      staked: function (id) { return stakes[id] || 0; }, total: total,
      stakes: function () { var c = {}; for (var k in stakes) c[k] = stakes[k]; return c; },
      hasLast: function () { return !!last; },
      lock: function (b) { locked = !!b; }, isLocked: function () { return locked; },
      commit: commit, settle: settle, controls: controls
    };
  }

  // 牌桌下注面板外殼（籌碼列＋本局總注列＋控制鈕）——百家樂/輪盤共用
  // 比照 HL.instant.betPanel：引擎組裝，各桌遊只需傳 betArea 產出的 area 與 controls() 產出的 ctrls
  function panel(area, ctrls) {
    return el("div", { class: "ax-inst__panel ax-tbl__panel" }, [
      el("div", { class: "ax-tbl__chiprow" }, [el("small", { class: "ax-muted", text: "籌碼" }), area.chipRail]),
      el("div", { class: "ax-tbl__totalrow" }, [el("small", { class: "ax-muted", text: "本局總注" }), area.totalEl]),
      ctrls.node
    ]);
  }

  HL.table = { betArea: betArea, panel: panel, CHIPS: DEFAULT_CHIPS };
})(window);

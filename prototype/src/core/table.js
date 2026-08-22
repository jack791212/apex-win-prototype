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
    var lastActions = null; // 上局的**逐顆籌碼**歷程（供重押後仍能一顆一顆復原，見 rebet）
    var locked = false;
    var lockNoticed = false; // 停止下注期間只提示一次（連點注區不該刷爆 toast）
    var ctlBtns = [];  // 清除/復原/重押三顆鈕：鎖定期間必須一起 disabled（見 controls）
    var totalEl = el("b", { class: "ax-tbl__total", text: money(0) });

    function total() { var s = 0; for (var k in stakes) s += stakes[k]; return s; }
    function changed() { totalEl.textContent = money(total()); if (opts.onChange) opts.onChange(stakes, total()); }

    function place(id) {
      /* 家族「說謊的控件」（2026-08-20 手感巡檢）：舊版鎖定時 `return false` 是**靜默**的——
       * 注區還有 hover/下壓回饋、點下去卻什麼都沒發生，而同一個函式在餘額不足時是有 toast 的
       * ＝同一個失敗動作兩種待遇。停止下注是牌桌最基本的規則，必須說出來（但只說一次）。 */
      if (locked) {
        if (!lockNoticed) { lockNoticed = true; HL.ui.toast("已停止下注，等本局結算", "warn"); }
        return false;
      }
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
      /* 家族「毀滅性控件」：舊版每個注區只 push **一筆聚合** action（`{id, amt: last[id]}`）
       * ⇒ 重押後按一下「復原」會把**整個注區**清掉，而玩家的心智模型是「退掉最後那一顆籌碼」。
       * 修法：commit 時把逐顆籌碼的歷程一起存起來（lastActions），重押就照原樣一顆一顆重放。 */
      if (lastActions && lastActions.length) {
        lastActions.forEach(function (a) {
          stakes[a.id] = (stakes[a.id] || 0) + a.amt;
          actions.push({ id: a.id, amt: a.amt });
        });
      } else {
        for (k in last) { stakes[k] = last[k]; actions.push({ id: k, amt: last[k] }); }
      }
      changed(); return true;
    }
    function commit() {
      var t = total();
      if (t <= 0) { HL.ui.toast("請先下注", "warn"); return null; }
      if (t > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return null; }
      if (HL.rg && !HL.rg.check(t)) return null;   // #67 負責任博弈：以「本局各注區總額」為單注量計（未設限時恆真＝零回歸）
      var snap = {}; for (var k in stakes) snap[k] = stakes[k];
      last = snap;       // 供重押
      lastActions = actions.slice();  // 逐顆籌碼歷程（rebet 用；比聚合快照多保留「怎麼下的」）
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

    /* ---- 分階段結算（2026-08-20 手感巡檢家族 D＋E·一處修通吃 6 款桌遊）--------------------
     * 【缺陷】舊版 6 款桌遊的收尾**逐字相同**：`settle()` 一次性總額入帳，然後**同一個 task 內**
     *   `area.clear()` 把中獎與落敗籌碼一起抹掉 ⇒ 玩家永遠看不到牌桌最基本的那兩拍
     *   「先掃走輸的、再賠給贏的」，多注時也無法稽核哪一注賠了多少（`settle` 只回聚合值）。
     *   這違反保真規格第 4 項（順序也是感覺）與第 11 項（逐項結算）。
     * 【修法】把兩拍做進引擎，**6 支 view 只要把收尾包進 .then() 即可**：
     *   第一拍 掃輸家：刪掉輸的注區 stakes → `changed()` → 各 view 自己的 renderStakes 就把那些
     *     籌碼畫掉，而**贏家的籌碼留在原位**（零 view 改動就得到正確視覺）。
     *   第二拍 付贏家：走同一個 `settle()`（金流與中央掛鉤仍只有一個出口，不製造第二份真相）。
     *   回傳值多帶 `detail`（逐注區 staked/mult/payout/win）＝多注稽核與未來逐項飛字都有料可用。
     * 極速模式（HL.gset.fast）把兩拍歸零＝跳過演出但順序不變。 */
    var SWEEP_MS = 420, PAY_MS = 380;
    function fastMode() { return !!(HL.gset && HL.gset.get("fast")); }
    function detailOf(snap, returns) {
      var d = {}, k;
      for (k in snap) {
        var m = (returns && returns[k]) || 0;
        d[k] = { staked: snap[k], mult: m, payout: Math.round(snap[k] * m), win: m > 0 };
      }
      return d;
    }
    function settleStaged(snap, returns, hooks) {
      hooks = hooks || {};
      var detail = detailOf(snap, returns), winIds = [], loseIds = [], k;
      for (k in detail) (detail[k].win ? winIds : loseIds).push(k);
      var sweepMs = fastMode() ? 0 : SWEEP_MS, payMs = fastMode() ? 0 : PAY_MS;
      return new Promise(function (resolve) {
        setTimeout(function () {
          loseIds.forEach(function (id) { delete stakes[id]; });
          changed();                                   // ← 輸家籌碼在這一拍被收走
          if (hooks.onSweep) hooks.onSweep(loseIds, detail);
          setTimeout(function () {
            var r = settle(snap, returns);              // ← 贏家在這一拍才拿到錢
            if (hooks.onPay) hooks.onPay(winIds, detail, r);
            resolve({ staked: r.staked, payout: r.payout, net: r.net, detail: detail, winIds: winIds, loseIds: loseIds });
          }, payMs);
        }, sweepMs);
      });
    }

    // 籌碼列
    var rail = el("div", { class: "ax-tbl__chips" });
    function renderRail() {
      HL.dom.clear(rail);
      chips.forEach(function (c, i) {
        var b = el("button", {
          class: "ax-tbl__chip" + (c === chip ? " is-active" : ""),
          style: "--chip:" + CHIP_COLORS[i % CHIP_COLORS.length],
          "aria-pressed": c === chip ? "true" : "false",
          onClick: function () { chip = c; renderRail(); }
        }, [el("span", { class: "ax-tbl__chipv", text: c >= 1000 ? (c / 1000) + "k" : String(c) })]);
        rail.appendChild(b);
      });
    }
    renderRail();

    /* 家族 E：舊版 controls() **只回傳 dealBtn** ⇒ 清除/復原/重押三顆鈕在結構上無法被 disable，
     * 於是「停止下注」期間它們看起來仍可按（按下去被 lock 靜默吞掉）。改為一併回傳並由 lock() 同步。 */
    function controls(onDeal, dealLabel) {
      var dealBtn = el("button", { class: "ax-btn-primary ax-tbl__deal", text: dealLabel || "開牌", onClick: function () { onDeal(); } });
      var clearBtn = el("button", { class: "ax-btn-ghost", text: "清除", onClick: clear });
      var undoBtn = el("button", { class: "ax-btn-ghost", text: "復原", onClick: undo });
      var rebetBtn = el("button", { class: "ax-btn-ghost", text: "重押", onClick: function () { rebet(); } });
      ctlBtns = [clearBtn, undoBtn, rebetBtn];   // dealBtn 不列入：它的節奏由各桌遊自己掌握
      syncCtl();
      var node = el("div", { class: "ax-tbl__ctrls" }, [clearBtn, undoBtn, rebetBtn, dealBtn]);
      return { node: node, dealBtn: dealBtn, clearBtn: clearBtn, undoBtn: undoBtn, rebetBtn: rebetBtn };
    }
    function syncCtl() { ctlBtns.forEach(function (b) { b.disabled = locked; }); }

    return {
      chipRail: rail, totalEl: totalEl,
      chip: function () { return chip; },
      place: place, undo: undo, clear: clear, rebet: rebet,
      staked: function (id) { return stakes[id] || 0; }, total: total,
      stakes: function () { var c = {}; for (var k in stakes) c[k] = stakes[k]; return c; },
      hasLast: function () { return !!last; },
      lock: function (b) { locked = !!b; if (!locked) lockNoticed = false; syncCtl(); }, isLocked: function () { return locked; },
      commit: commit, settle: settle, settleStaged: settleStaged, controls: controls
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

  // 共用注區籌碼徽章渲染（T38 收斂：6 款桌遊原本各自逐字複製此 6 行 renderStakes）：
  //  spotEls: { id → { badge, box } }；area: betArea() 回傳物件；fmt: 金額→顯示字串（預設 HL.dom.money）
  //  輪盤板面格小、注區多 ⇒ 傳自己的精簡格式器（≥1000 顯 "Nk"），其餘 5 款走預設 money()。
  function renderStakes(spotEls, area, fmt) {
    fmt = fmt || money;
    for (var id in spotEls) {
      var v = area.staked(id);
      spotEls[id].badge.textContent = v ? fmt(v) : "";
      spotEls[id].box.classList.toggle("is-staked", v > 0);
    }
  }

  HL.table = { betArea: betArea, panel: panel, CHIPS: DEFAULT_CHIPS, renderStakes: renderStakes };
})(window);

/*
 * Apex Win｜遊戲外框公版（GameFrame）
 * 用途：web casino 後續接各家廠商遊戲時的「通用視窗外框」。把任意遊戲節點(我們的
 *       暗影儀式 slot，未來可換成廠商 iframe)嵌進來，下方提供一排通用視窗控制：
 *       全螢幕 / 劇院模式 / 實時統計(暫不做) / 子母畫面(PiP，可拖曳、收合、放大、設定、幣別)。
 * 與遊戲自身的 spin/auto/押注 無關——那些由各遊戲自行排版。
 * 註冊於 window.HL.gameFrame。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  var pipHost = null;
  var pip = { active: false, key: null, stage: null, meta: null, frame: null };
  // 「哪些遊戲採可驗證公平（決定是否顯示 🔒）」＝單一真相 `HL.fair.isPF`（core/fair.js #51）。
  //   2026-08-02 維護軌收斂：此檔原有一份 byte-for-byte 相同的區域 `PF` 表（21 鍵）＝drift-prone
  //   重複（每新增一款 PF 遊戲得同時改兩處，G4/G5 兩輪即為證），已刪除、兩處判斷改讀 HL.fair.isPF。
  //   node 證明兩表成員完全相同（21/21 零差）＝零視覺。fair.js:205-208 記載的維護軌去重債至此結清。

  // ---------- 幣別小控制（外框 / PiP 共用）----------
  function currencyControl() {
    var cur = HL.state.get().currency || "TWD";
    var label = el("span", { class: "ax-gfcur__c", text: cur });
    var menu = el("div", { class: "ax-gfcur__menu" });
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    function setOpen(on) {
      menu.classList.toggle("open", on);
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) document.addEventListener("keydown", onKey, true);
      else document.removeEventListener("keydown", onKey, true);
    }
    (HL.mock.currencies || []).forEach(function (m) {
      menu.appendChild(el("button", { class: "ax-gfcur__opt", text: m.code + "　" + m.name, onClick: function (e) {
        e.stopPropagation(); HL.state.set({ currency: m.code }); label.textContent = m.code;
        if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome(); setOpen(false);
      } }));
    });
    var btn = el("button", { class: "ax-gfbtn ax-gfcur__btn", title: "幣別", "aria-expanded": "false", onClick: function (e) { e.stopPropagation(); setOpen(!menu.classList.contains("open")); } }, [el("span", { text: "💱 " }), label, el("span", { text: " ▾" })]);
    return el("div", { class: "ax-gfcur" }, [btn, menu]);
  }

  // ---------- 外框 ----------
  function gfbtn(icon, label, onClick) { return el("button", { class: "ax-gfbtn", title: label, "aria-label": label, onClick: onClick }, [el("span", { class: "ax-gfbtn__i", text: icon })]); }

  // ---------- 遊戲設定齒輪（S1：極速/動效/熱鍵，HL.gset 持久化、跨遊戲生效）----------
  function settingsModal() {
    if (!HL.gset) { HL.ui.comingSoon("遊戲設定"); return; }
    function row(key, title, desc, onAfter) {
      var cb = el("input", { type: "checkbox" });
      cb.checked = !!HL.gset.get(key);
      cb.addEventListener("change", function () { HL.gset.set(key, cb.checked); if (onAfter) onAfter(cb.checked); });
      return el("label", { class: "ax-gset__row" }, [
        el("div", { class: "ax-gset__txt" }, [el("b", { text: title }), el("small", { class: "ax-muted", text: desc })]),
        cb
      ]);
    }
    // S10 display-in-fiat：金額顯示幣別（僅顯示層，示意匯率；結算仍以遊戲幣計）
    var fiatSel = el("select", { class: "ax-gset__sel" });
    fiatSel.appendChild(el("option", { value: "", text: "NT$（原生）" }));
    (HL.mock && HL.mock.currencies ? HL.mock.currencies : []).forEach(function (m) {
      if (m.code === "TWD" || !m.rate) return;
      fiatSel.appendChild(el("option", { value: m.code, text: m.code + "　" + m.name }));
    });
    fiatSel.value = HL.gset.get("fiatView") || "";
    fiatSel.addEventListener("change", function () {
      HL.gset.set("fiatView", fiatSel.value);
      HL.ui.toast(fiatSel.value ? "金額改以 " + fiatSel.value + " 顯示（示意匯率）" : "金額恢復 NT$ 顯示", "ok");
      if (HL.app && HL.app.refresh) HL.app.refresh(); // 重繪讓全站金額立即換算
    });
    var fiatRow = el("label", { class: "ax-gset__row" }, [
      el("div", { class: "ax-gset__txt" }, [
        el("b", { text: "金額顯示幣別" }),
        el("small", { class: "ax-muted", text: "示意匯率、僅顯示層；結算仍以遊戲幣計" })
      ]),
      fiatSel
    ]);
    HL.ui.modal("⚙️ 遊戲設定", [
      row("fast", "極速模式", "跳過結果動畫、縮短自動下注間隔（全遊戲生效）"),
      row("anim", "介面動效", "關閉後停用非必要動畫與轉場（手機省效能）"),
      row("hotkeys", "鍵盤熱鍵", "Space 下注 · S 加倍 · A 減半 · D 最小注", function (on) {
        HL.ui.toast(on ? "熱鍵已啟用：Space 下注 · S 加倍 · A 減半 · D 最小注" : "熱鍵已關閉", on ? "ok" : "warn");
      }),
      fiatRow,
      el("small", { class: "ax-muted", text: "設定儲存於本機瀏覽器，所有遊戲共用。" })
    ]);
  }

  function buildFrame(stage, meta) {
    var frame = el("div", { class: "ax-gframe" });
    var bar = el("div", { class: "ax-gframe__bar" }, [
      el("div", { class: "ax-gframe__tools" }, [
        gfbtn("⛶", "全螢幕", function () { toggleFullscreen(frame); }),
        gfbtn("▭", "劇院模式", function () { toggleTheater(frame); }),
        gfbtn("📈", "實時統計", function () { if (HL.liveStats) HL.liveStats.toggle(); else HL.ui.toast("實時統計 即將推出", "warn"); }),
        gfbtn("⚙", "遊戲設定", settingsModal),
        (HL.fair && meta && HL.fair.isPF(meta.key)) ? gfbtn("🔒", "可驗證公平", function () { HL.fair.fairnessModal(); }) : null, // 僅可驗證公平的遊戲顯示
        gfbtn("⧉", "子母畫面", function () { openPip(frame, stage, meta); })
      ]),
      el("div", { class: "ax-gframe__prov" }, [el("small", { class: "ax-muted", text: (meta && meta.provider) || "Apex Studio" })]),
      el("div", { class: "ax-gframe__right" }, [currencyControl()])
    ]);
    frame.appendChild(stage);
    frame.appendChild(bar);
    frame._stage = stage; frame._meta = meta; frame._bar = bar;
    if (meta && meta.maxWidth) frame.style.maxWidth = meta.maxWidth; // 各遊戲外框寬度可不同
    return frame;
  }
  function wrap(gameNode, meta) {
    var stage = el("div", { class: "ax-gframe__stage" }, [gameNode]);
    return buildFrame(stage, meta || {});
  }

  // ---------- 全螢幕 / 劇院 ----------
  function toggleFullscreen(frame) {
    var on = frame.classList.toggle("ax-gframe--fullscreen");
    frame.classList.remove("ax-gframe--theater");
    try {
      if (on && frame.requestFullscreen) frame.requestFullscreen().catch(function () {});
      else if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    } catch (e) {}
  }
  function toggleTheater(frame) { frame.classList.remove("ax-gframe--fullscreen"); frame.classList.toggle("ax-gframe--theater"); }

  // ---------- 子母畫面 PiP ----------
  function ensurePipHost() {
    if (pipHost) return pipHost;
    var head = el("div", { class: "ax-pip__head" });
    var body = el("div", { class: "ax-pip__body" });
    var foot = el("div", { class: "ax-pip__foot" });
    var tab = el("button", { class: "ax-pip__tab", onClick: function () { pipHost.classList.remove("ax-pip--collapsed"); } });
    pipHost = el("div", { class: "ax-pip" }, [head, body, foot, tab]);
    pipHost._head = head; pipHost._body = body; pipHost._foot = foot; pipHost._tab = tab;
    pipHost.style.display = "none";
    document.body.appendChild(pipHost);
    HL.dom.makeDraggable(pipHost, head);
    return pipHost;
  }
  function openPip(frame, stage, meta) {
    var host = ensurePipHost();
    HL.dom.clear(host._head); HL.dom.clear(host._foot);
    host._head.appendChild(el("div", { class: "ax-pip__title" }, [el("span", { text: "🎮 " }), el("b", { text: (meta && meta.title) || "遊戲" })]));
    host._head.appendChild(el("div", { class: "ax-pip__hbtns" }, [
      el("button", { class: "ax-pip__b", title: "放大(劇院)", "aria-label": "放大(劇院)", text: "⤢", onClick: function (e) { e.stopPropagation(); host.classList.toggle("ax-pip--big"); } }),
      el("button", { class: "ax-pip__b", title: "收合至頁籤", "aria-label": "收合至頁籤", text: "▾", onClick: function (e) { e.stopPropagation(); host.classList.add("ax-pip--collapsed"); } }),
      el("button", { class: "ax-pip__b", title: "關閉", "aria-label": "關閉", text: "×", onClick: function (e) { e.stopPropagation(); closePip(); } })
    ]));
    host._tab.textContent = "🎮 " + ((meta && meta.title) || "遊戲");
    host._foot.appendChild(el("button", { class: "ax-pip__b", title: "遊戲設定", "aria-label": "遊戲設定", text: "⚙", onClick: settingsModal }));
    if (HL.fair && meta && HL.fair.isPF(meta.key)) host._foot.appendChild(el("button", { class: "ax-pip__b", title: "可驗證公平", "aria-label": "可驗證公平", text: "✓", onClick: function () { HL.fair.fairnessModal(); } })); // 僅可驗證公平的遊戲顯示
    host._foot.appendChild(currencyControl());

    host._body.appendChild(stage);                 // 把遊戲 stage 移入 PiP
    host.classList.remove("ax-pip--collapsed", "ax-pip--big");
    host.style.display = "flex";
    pip.active = true; pip.key = (meta && meta.key) || "game"; pip.stage = stage; pip.meta = meta; pip.frame = frame;

    frame.classList.add("ax-gframe--inpip");        // 原視窗顯示占位
    if (!frame.querySelector(".ax-gframe__ph")) {
      frame.insertBefore(el("div", { class: "ax-gframe__ph" }, [
        el("div", { class: "ax-gframe__ph-ic", text: "🎬" }),
        el("div", { text: "遊戲於子母畫面播放中" }),
        el("button", { class: "ax-btn-ghost", text: "返回原視窗", onClick: restorePip })
      ]), frame.firstChild);
    }
    HL.ui.toast("已切換子母畫面 · 可拖曳", "ok");
  }
  // 把遊戲移回它的外框（若還在 DOM）
  function restorePip() {
    if (!pip.active) return;
    var frame = pip.frame, stage = pip.stage;
    if (frame && document.body.contains(frame)) {
      var ph = frame.querySelector(".ax-gframe__ph"); if (ph) ph.remove();
      frame.classList.remove("ax-gframe--inpip");
      frame.insertBefore(stage, frame.firstChild);
    }
    if (pipHost) pipHost.style.display = "none";
    pip.active = false; pip.stage = null; pip.frame = null;
  }
  /* ---- 關閉子母畫面（2026-08-21 前景·修 high：關掉 PiP 後遊戲在隱藏節點裡繼續跑完並自行結算）----
   * 【缺陷】舊版 closePip 只呼叫 restorePip，而 restorePip 的移回動作有前提 `document.body.contains(frame)`。
   *   玩家「開 PiP → 用底部導覽回大廳（PiP 續播＝設計）→ 按 PiP 的 ×」時，原外框早已被 mountView 清掉
   *   ⇒ 那個 if 不成立 ⇒ **stage 留在 pipHost 裡，只把 pipHost 設成 display:none**。
   *   而各遊戲的存活檢查寫的是 `document.body.contains(container)`——它**仍然為真**（節點還掛在 body 上，
   *   只是看不見）⇒ 對戰照樣跑完 10 輪、餘額自己變動、戰績入帳、結算卡渲染在一個沒人看得到的 DOM 裡。
   *   （這是家族 B「換頁必須有卸載鉤」的第三種入口：不是換頁、不是拔 DOM，而是**藏起來**。）
   * 【修法】關閉時若移不回原外框，就**真的把 stage 從 DOM 移除**，讓既有的存活檢查在下一拍自己了結；
   *   並呼叫該遊戲登記的 onTeardown（有錢在途的遊戲可以據實棄局，例如 vsslot 的 escrow）。
   * ⚠️ 不要只設 display:none 就當關閉——那正是這個 bug。 */
  function closePip() {
    if (!pip.active) return;
    var frame = pip.frame, stage = pip.stage, meta = pip.meta || {};
    var restorable = frame && document.body.contains(frame);
    if (restorable) { restorePip(); return; }        // 原視窗還在 → 移回去（原行為）
    if (stage && stage.parentNode) stage.parentNode.removeChild(stage);   // 真正離開 DOM ⇒ 存活檢查會生效
    if (pipHost) pipHost.style.display = "none";
    pip.active = false; pip.stage = null; pip.frame = null; pip.meta = null;
    if (typeof meta.onTeardown === "function") { try { meta.onTeardown("pip-closed"); } catch (e) {} }
    HL.ui.toast("已關閉子母畫面（未完成的回合視為棄局）", "warn");
  }
  // slot.render 重新進入時：若 PiP 仍在播放同一遊戲 → 取回 stage、重建外框
  function resumeFrame(key) {
    if (!pip.active || pip.key !== key) return null;
    var stage = pip.stage, meta = pip.meta;
    if (pipHost) pipHost.style.display = "none";
    pip.active = false; pip.stage = null; pip.frame = null;
    return buildFrame(stage, meta);
  }
  function isPipActive(key) { return pip.active && (!key || pip.key === key); }

  HL.gameFrame = { wrap: wrap, resumeFrame: resumeFrame, isPipActive: isPipActive, restorePip: restorePip };
})(window);

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
  var PF = { dice: 1, limbo: 1, plinko: 1, towers: 1, hilo: 1, "dice-duel": 1, keno: 1 }; // 採可驗證公平的遊戲（決定是否顯示 🔒）

  // ---------- 幣別小控制（外框 / PiP 共用）----------
  function currencyControl() {
    var cur = HL.state.get().currency || "TWD";
    var label = el("span", { class: "ax-gfcur__c", text: cur });
    var menu = el("div", { class: "ax-gfcur__menu" });
    (HL.mock.currencies || []).forEach(function (m) {
      menu.appendChild(el("button", { class: "ax-gfcur__opt", text: m.code + "　" + m.name, onClick: function (e) {
        e.stopPropagation(); HL.state.set({ currency: m.code }); label.textContent = m.code;
        if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome(); menu.classList.remove("open");
      } }));
    });
    var btn = el("button", { class: "ax-gfbtn ax-gfcur__btn", title: "幣別", onClick: function (e) { e.stopPropagation(); menu.classList.toggle("open"); } }, [el("span", { text: "💱 " }), label, el("span", { text: " ▾" })]);
    return el("div", { class: "ax-gfcur" }, [btn, menu]);
  }

  // ---------- 外框 ----------
  function gfbtn(icon, label, onClick) { return el("button", { class: "ax-gfbtn", title: label, onClick: onClick }, [el("span", { class: "ax-gfbtn__i", text: icon })]); }

  function buildFrame(stage, meta) {
    var frame = el("div", { class: "ax-gframe" });
    var bar = el("div", { class: "ax-gframe__bar" }, [
      el("div", { class: "ax-gframe__tools" }, [
        gfbtn("⛶", "全螢幕", function () { toggleFullscreen(frame); }),
        gfbtn("▭", "劇院模式", function () { toggleTheater(frame); }),
        gfbtn("📈", "實時統計", function () { if (HL.liveStats) HL.liveStats.toggle(); else HL.ui.toast("實時統計 即將推出", "warn"); }),
        (HL.fair && meta && PF[meta.key]) ? gfbtn("🔒", "可驗證公平", function () { HL.fair.fairnessModal(); }) : null, // 僅可驗證公平的遊戲顯示
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
    makeDraggable(pipHost, head);
    return pipHost;
  }
  function openPip(frame, stage, meta) {
    var host = ensurePipHost();
    HL.dom.clear(host._head); HL.dom.clear(host._foot);
    host._head.appendChild(el("div", { class: "ax-pip__title" }, [el("span", { text: "🎮 " }), el("b", { text: (meta && meta.title) || "遊戲" })]));
    host._head.appendChild(el("div", { class: "ax-pip__hbtns" }, [
      el("button", { class: "ax-pip__b", title: "放大(劇院)", text: "⤢", onClick: function (e) { e.stopPropagation(); host.classList.toggle("ax-pip--big"); } }),
      el("button", { class: "ax-pip__b", title: "收合至頁籤", text: "▾", onClick: function (e) { e.stopPropagation(); host.classList.add("ax-pip--collapsed"); } }),
      el("button", { class: "ax-pip__b", title: "關閉", text: "×", onClick: function (e) { e.stopPropagation(); closePip(); } })
    ]));
    host._tab.textContent = "🎮 " + ((meta && meta.title) || "遊戲");
    host._foot.appendChild(el("button", { class: "ax-pip__b", title: "設定", text: "⚙", onClick: function () { HL.ui.toast("設定 即將推出", "warn"); } }));
    if (HL.fair && meta && PF[meta.key]) host._foot.appendChild(el("button", { class: "ax-pip__b", title: "可驗證公平", text: "✓", onClick: function () { HL.fair.fairnessModal(); } })); // 僅可驗證公平的遊戲顯示
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
  function closePip() {
    // 關閉：若原外框還在就移回；否則直接收掉（回主頁時會重建）
    restorePip();
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

  function makeDraggable(host, handle) {
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    handle.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) return;       // 點按鈕不拖曳
      dragging = true; try { handle.setPointerCapture(e.pointerId); } catch (er) {}
      var r = host.getBoundingClientRect();
      host.style.left = r.left + "px"; host.style.top = r.top + "px"; host.style.right = "auto"; host.style.bottom = "auto";
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    });
    handle.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var nx = ox + (e.clientX - sx), ny = oy + (e.clientY - sy);
      var maxX = global.innerWidth - host.offsetWidth, maxY = global.innerHeight - host.offsetHeight;
      host.style.left = Math.max(0, Math.min(maxX, nx)) + "px";
      host.style.top = Math.max(8, Math.min(maxY, ny)) + "px";
    });
    function end() { dragging = false; }
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  HL.gameFrame = { wrap: wrap, resumeFrame: resumeFrame, isPipActive: isPipActive, restorePip: restorePip };
})(window);

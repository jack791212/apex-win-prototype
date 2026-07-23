/*
 * Apex Win｜可停靠面板系統 HL.dock（模組化 / 可收納佈局底座 · 擴充性優先）
 * ─────────────────────────────────────────────────────────────────────
 * 這是「功能齊全 + 用不到可收納 / 自由擺放」的容器底座：shell 只提供骨架，
 * 任何功能只要 HL.dock.register(spec) 即獲得統一的「開 / 關 / 收合(可收納) /
 * 桌機拖曳自由擺放 / 跨站持久佈局」，不必各自重刻浮窗程式（原 panels.js 的
 * 夥伴 + 聊天已改掛到這裡；虛擬主播等未來面板亦可註冊進來）。
 *
 * spec 欄位（皆可選除 id/title）：
 *   { id, title, icon, sub, cls,            // 身分與樣式（cls 疊在 .ax-float 上）
 *     buildScroll(bodyEl),                  // 建面板主捲動區內容
 *     buildFooter() -> el|null,             // 建底部（如輸入列），可省
 *     onOpen(), onClose(),                  // 生命週期 hook（如聊天 startAuto/stopAuto）
 *     mobileExclusive }                     // 手機同時只留一個此類面板開著（避免重疊溢出）
 *
 * 佈局偏好（收合狀態 + 擺放座標）走「跨站」原生 localStorage（比照 i18n：
 * 語言 / 側欄 / 收藏這類 UI 偏好兩站共用，不進 HL.site 命名空間 → 不受真 / 假站隔離）。
 * 註冊於 window.HL.dock。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  var LS_KEY = "ax:dock:v1";                 // 跨站 UI 偏好（原生 key，不走 HL.dom.lsGet 的站別前綴）
  var STACK_GAP = 372;                        // 桌機自動堆疊間距（面板寬 360 + 12）

  var specs = {};                            // id -> spec（註冊表）
  var panels = {};                           // id -> { spec, root, body, head, open, collapsed }
  var order = [];                            // 目前開著（且無自訂座標）的面板 id，右→左堆疊順序

  function loadLayout() { try { return JSON.parse(global.localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; } }
  function saveLayout() { try { global.localStorage.setItem(LS_KEY, JSON.stringify(layout)); } catch (e) {} }
  var layout = loadLayout();                 // { <id>: { collapsed:bool, pos:{left,top} } }

  function isMobile() { return (document.documentElement.clientWidth || global.innerWidth) <= 720; }
  function hasCustomPos(id) { return !isMobile() && layout[id] && layout[id].pos; }

  function register(spec) {
    if (!spec || !spec.id) return HL.dock;
    specs[spec.id] = spec;
    return HL.dock;                          // 可鏈式：HL.dock.register(a).register(b)
  }

  function build(id) {
    if (panels[id]) return panels[id];
    var spec = specs[id];
    if (!spec) return null;

    var body = el("div", { class: "ax-float__body" });
    if (spec.buildScroll) spec.buildScroll(body);

    var collapseBtn = el("button", {
      class: "ax-float__collapse", text: "▾", title: "收合",
      "aria-label": "收合面板", onClick: function () { toggleCollapse(id); }
    });
    var head = el("div", { class: "ax-float__head" }, [
      el("div", { class: "ax-float__title" }, [
        spec.icon ? el("span", { class: "ic", text: spec.icon }) : null,
        el("span", { text: spec.title }),
        spec.sub ? el("span", { class: "ax-float__sub", text: spec.sub }) : null
      ]),
      collapseBtn,
      el("button", {
        class: "ax-float__close", text: "×", title: "關閉",
        "aria-label": "關閉面板", onClick: function () { close(id); }
      })
    ]);
    var root = el("div", { class: "ax-float " + (spec.cls || ""), "data-dock": id }, [
      head, body, spec.buildFooter ? spec.buildFooter() : null
    ]);
    root.style.display = "none";
    document.body.appendChild(root);

    // 桌機：拖標題列自由擺放；放手後持久化座標（手機不記，交回 CSS 全寬堆疊）
    HL.dom.makeDraggable(root, head, { lockWidth: true });
    head.addEventListener("pointerup", function () {
      if (isMobile()) return;
      if (root.style.left && root.style.left !== "auto") {
        layout[id] = layout[id] || {};
        layout[id].pos = { left: root.style.left, top: root.style.top };
        saveLayout();
      }
    });

    var rec = { spec: spec, root: root, body: body, head: head, collapseBtn: collapseBtn, open: false, collapsed: false };
    panels[id] = rec;
    if (layout[id] && layout[id].collapsed) setCollapsed(rec, true);
    return rec;
  }

  function setCollapsed(rec, on) {
    rec.collapsed = on;
    rec.root.classList.toggle("is-collapsed", on);
    rec.collapseBtn.textContent = on ? "▸" : "▾";
    rec.collapseBtn.title = on ? "展開" : "收合";
    rec.collapseBtn.setAttribute("aria-label", on ? "展開面板" : "收合面板");
  }

  function toggleCollapse(id) {
    var rec = panels[id]; if (!rec) return;
    setCollapsed(rec, !rec.collapsed);
    layout[id] = layout[id] || {};
    layout[id].collapsed = rec.collapsed;
    saveLayout();
    relayout();
  }

  // 自動堆疊：手機清掉內聯座標交給 CSS 全寬；桌機無自訂座標者由右往左排、有自訂座標者維持原位
  function relayout() {
    order = order.filter(function (id) { return panels[id] && panels[id].open; });
    var i = 0;
    order.forEach(function (id) {
      var rec = panels[id];
      if (hasCustomPos(id)) {
        rec.root.style.left = layout[id].pos.left;
        rec.root.style.top = layout[id].pos.top;
        rec.root.style.right = "auto"; rec.root.style.bottom = "auto";
        return;                               // 自訂擺放者不參與堆疊
      }
      rec.root.style.left = ""; rec.root.style.top = ""; rec.root.style.bottom = "";
      rec.root.style.right = isMobile() ? "" : (16 + i * STACK_GAP) + "px";
      i++;
    });
  }

  function open(id) {
    var rec = build(id); if (!rec) return;
    // 手機互斥：同時只留一個 mobileExclusive 面板
    if (isMobile() && rec.spec.mobileExclusive) {
      Object.keys(panels).forEach(function (other) {
        if (other !== id && panels[other].open && panels[other].spec.mobileExclusive) close(other);
      });
    }
    if (!rec.open) {
      rec.open = true;
      rec.root.style.display = "flex";
      if (order.indexOf(id) === -1) order.push(id);
      if (rec.spec.onOpen) rec.spec.onOpen();
    }
    relayout();
  }

  function close(id) {
    var rec = panels[id]; if (!rec || !rec.open) return;
    rec.open = false;
    rec.root.style.display = "none";
    var k = order.indexOf(id); if (k !== -1) order.splice(k, 1);
    if (rec.spec.onClose) rec.spec.onClose();
    relayout();
  }

  function toggle(id) { var rec = panels[id]; (rec && rec.open) ? close(id) : open(id); }
  function isOpen(id) { return !!(panels[id] && panels[id].open); }

  // 視窗尺寸切換（桌機⇄手機）時重排，避免堆疊座標殘留
  var rzT = null;
  global.addEventListener("resize", function () {
    if (rzT) return;
    rzT = setTimeout(function () { rzT = null; relayout(); }, 150);
  });

  HL.dock = {
    register: register, build: build,
    open: open, close: close, toggle: toggle, toggleCollapse: toggleCollapse,
    isOpen: isOpen, relayout: relayout,
    ids: function () { return Object.keys(specs); }
  };
})(window);

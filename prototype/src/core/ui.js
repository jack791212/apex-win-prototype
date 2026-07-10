/*
 * Apex Win｜共用 UI：Toast + Modal
 * 提供統一的點擊回饋與彈窗（登入/註冊/錢包/活動/客服/建構中…）。
 * 註冊於 window.HL.ui。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  // ---- Toast ----
  function toast(message, type) {
    var box = document.getElementById("ax-toasts");
    if (!box) {
      box = el("div", { id: "ax-toasts", class: "ax-toasts", role: "status", "aria-live": "polite" });
      document.body.appendChild(box);
    }
    var t = el("div", { class: "ax-toast " + (type || "ok"), text: message });
    box.appendChild(t);
    setTimeout(function () {
      t.style.opacity = "0";
      setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 200);
    }, 2200);
  }

  // ---- Modal ----
  // a11y：role=dialog/aria-modal、Escape 關閉、焦點鎖在彈窗內、關閉後還原焦點。
  function modal(title, bodyNodes, opts) {
    opts = opts || {};
    var prevFocus = document.activeElement; // 關閉後還原
    var mask = el("div", { class: "ax-modal-mask" });

    function focusables() {
      return Array.prototype.slice.call(box.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )).filter(function (n) { return n.offsetParent !== null; });
    }
    function trapTab(e) {
      var f = focusables();
      if (!f.length) { e.preventDefault(); box.focus(); return; }
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey) { if (a === first || a === box) { e.preventDefault(); last.focus(); } }
      else { if (a === last || a === box) { e.preventDefault(); first.focus(); } }
    }
    function onKey(e) {
      if (e.key === "Escape") { close(); }
      else if (e.key === "Tab") { trapTab(e); }
    }
    function close() {
      document.removeEventListener("keydown", onKey, true);
      if (mask.parentNode) mask.parentNode.removeChild(mask);
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (_) {} }
    }
    mask.addEventListener("click", function (e) {
      if (e.target === mask) close();
    });

    var body = el("div", { class: "ax-modal__body" });
    (Array.isArray(bodyNodes) ? bodyNodes : [bodyNodes]).forEach(function (n) {
      if (n == null) return;
      body.appendChild(typeof n === "string" ? el("p", { text: n }) : n);
    });

    var box = el("div", {
      class: "ax-modal" + (opts.wide ? " ax-modal--wide" : ""),
      role: "dialog", "aria-modal": "true", "aria-label": title, tabindex: "-1"
    }, [
      el("div", { class: "ax-modal__head" }, [
        el("h3", { text: title }),
        el("button", { class: "ax-modal__close", text: "×", "aria-label": "關閉", onClick: close })
      ]),
      body
    ]);
    mask.appendChild(box);
    document.body.appendChild(mask);
    document.addEventListener("keydown", onKey, true);
    // 進場把焦點移入彈窗本體（不自動聚焦輸入框，避免手機鍵盤彈出）
    setTimeout(function () { try { box.focus(); } catch (_) {} }, 0);
    return { close: close, body: body };
  }

  // 「建構中 / Demo」通用彈窗
  function comingSoon(name) {
    modal(name || "功能建構中", [
      el("p", {
        text: "此功能在本 Demo 中為示意，尚未實作正式流程。"
      }),
      el("span", { class: "ax-demo-tag", text: "Demo 假資料 · 建構中" })
    ]);
  }

  /* ================= 共用視圖元件（模板化：跨 view 一處定義，各處復用） ================= */

  // 促銷卡：大廳/娛樂城共用。opts.ctaText / opts.onCta 控制按鈕文案與行為。
  function promoCard(p, opts) {
    opts = opts || {};
    return el("div", { class: "ax-promo__card", style: "background:linear-gradient(120deg," + p.c1 + "," + p.c2 + ")" }, [
      el("div", { class: "ax-promo__tag", text: p.tag }),
      el("div", { class: "ax-promo__title", text: p.title }),
      el("div", { class: "ax-promo__sub", text: p.sub }),
      el("div", { class: "ax-promo__ic", text: p.ic }),
      el("button", { class: "ax-promo__cta", text: opts.ctaText || "立即參加", onClick: opts.onCta || function () { comingSoon(p.title); } })
    ]);
  }

  // 可拖曳、自動輪替的輪播。回傳視口節點（.ax-promo__vp），由呼叫端自行外包裝。
  // renderCard(item)→node；opts.visible 預設 3。（原本 lobby/casino 各有一份逐字元相同的實作）
  function carousel(items, renderCard, opts) {
    opts = opts || {};
    var visible = opts.visible || 3;
    var maxIdx = Math.max(0, items.length - visible);
    var track = el("div", { class: "ax-promo__track" }, items.map(renderCard));
    var vp = el("div", { class: "ax-promo__vp" }, [track]);
    var idx = 0, step = 0, dragging = false, startX = 0, startTx = 0, curTx = 0, tcount = 0;
    function calc() { var f = track.children[0]; if (!f) return; var gap = parseFloat(getComputedStyle(track).gap) || 16; step = f.getBoundingClientRect().width + gap; }
    function apply(anim) { track.style.transition = anim ? "transform .35s var(--ax-ease)" : "none"; curTx = -idx * step; track.style.transform = "translateX(" + curTx + "px)"; }
    function go(i) { idx = Math.max(0, Math.min(maxIdx, i)); apply(true); }
    vp.addEventListener("pointerdown", function (e) { calc(); dragging = true; vp.setPointerCapture(e.pointerId); startX = e.clientX; startTx = curTx; track.style.transition = "none"; });
    vp.addEventListener("pointermove", function (e) { if (!dragging) return; curTx = startTx + (e.clientX - startX); track.style.transform = "translateX(" + curTx + "px)"; });
    function endDrag() { if (!dragging) return; dragging = false; if (step) idx = Math.round(-curTx / step); go(idx); }
    vp.addEventListener("pointerup", endDrag);
    vp.addEventListener("pointercancel", endDrag);
    HL.ticker.add(function () { if (dragging) return; tcount++; if (tcount % 5 === 0) { calc(); idx = idx >= maxIdx ? 0 : idx + 1; apply(true); } });
    setTimeout(function () { calc(); apply(false); }, 0);
    return vp;
  }

  // 遊戲緞帶：opts.ribbon === "full"（娛樂城：可玩/即將推出/HOT/NEW）；否則只顯示「可玩」（大廳）。
  function gameRibbon(g, mode) {
    if (mode === "full") {
      if (g.playable) return el("span", { class: "ax-game__ribbon play", text: "▶ 可玩" });
      if (g.comingSoon) return el("span", { class: "ax-game__ribbon soon", text: "即將推出" });
      if (g.hot) return el("span", { class: "ax-game__ribbon hot", text: "HOT" });
      if (g.isNew) return el("span", { class: "ax-game__ribbon new", text: "NEW" });
      return null;
    }
    return g.playable ? el("span", { class: "ax-game__ribbon play", text: "▶ 可玩" }) : null;
  }

  // 遊戲卡：大廳/娛樂城共用（原兩處已 drift）。以 opts 覆蓋差異點：
  //   ribbon: "full"|"play"(預設) · heat:顯示熱度角標 · soon:套 is-soon · favCb:收藏回呼 · actions:body 內附加節點 · onClick:整卡點擊
  function gameCard(g, opts) {
    opts = opts || {};
    var thumb = g.thumb ? el("img", { class: "ax-game__thumb", src: g.thumb, alt: "", loading: "lazy", decoding: "async" }) : null;
    if (thumb) thumb.addEventListener("error", function () { if (this.parentNode) this.parentNode.removeChild(this); });
    var bodyKids = [
      el("div", { class: "ax-game__title", text: HL.games.title(g) }),
      el("div", { class: "ax-game__prov", text: g.provider + (g.author ? " · 🎨" + g.author : "") })
    ];
    if (opts.actions) bodyKids.push(opts.actions);
    return el("div", {
      class: "ax-game" + (g.playable ? " is-playable" : "") + (opts.soon && g.comingSoon ? " is-soon" : ""),
      style: "background:linear-gradient(160deg," + g.c1 + "," + g.c2 + ")",
      onClick: opts.onClick
    }, [
      thumb,
      gameRibbon(g, opts.ribbon),
      opts.heat && HL.heat ? HL.heat.badge(g) : null,
      HL.fav.button(g.id, g.fav, opts.favCb),
      el("div", { class: "ax-game__body" }, bodyKids)
    ]);
  }

  HL.ui = { toast: toast, modal: modal, comingSoon: comingSoon, promoCard: promoCard, carousel: carousel, gameCard: gameCard };
})(window);

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
    mask.__axClose = close; // 供 HL.ui.closeAll/closeTop 正確關閉（移 keydown + 還原焦點，不只 remove DOM）

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

  /* ================= 分享單局戰績（Web Share API + 剪貼簿後備） ================= */
  // 不帶 query 的乾淨連結（避免夾帶 ?demo / 私密房參數）。
  function shareUrl() {
    var loc = global.location;
    if (!loc) return "";
    return (loc.origin || "") + (loc.pathname || "");
  }
  // 舊瀏覽器 / 非安全上下文的複製後備。
  function legacyCopy(full) {
    try {
      var ta = el("textarea");
      ta.value = full; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      var ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      toast(ok ? "已複製戰績連結，貼上分享吧！" : "請長按手動複製戰績", ok ? "ok" : "warn");
    } catch (_) { toast("此裝置不支援分享", "warn"); }
  }
  function copyFallback(text, url) {
    var full = (text ? text + " " : "") + url;
    var nav = global.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(full).then(
        function () { toast("已複製戰績連結，貼上分享吧！", "ok"); },
        function () { legacyCopy(full); }
      );
    } else { legacyCopy(full); }
  }
  // 通用分享：opts = {title, text, url}。原生 share 可用就叫系統分享盤，否則複製到剪貼簿。
  function shareText(opts) {
    opts = opts || {};
    var url = opts.url || shareUrl();
    var text = opts.text || "";
    var nav = global.navigator;
    if (nav && typeof nav.share === "function") {
      try {
        var p = nav.share({ title: opts.title || "ApexWin", text: text, url: url });
        if (p && p.then) p.then(null, function (e) {
          if (e && e.name === "AbortError") return; // 使用者自行取消：不打擾
          copyFallback(text, url);
        });
        return;
      } catch (_) { /* 落到複製後備 */ }
    }
    copyFallback(text, url);
  }
  // 依「單局結果」組訊息：o = {game, win(bool), amount(已格式化字串)}。
  function shareResult(o) {
    o = o || {};
    var brand = "ApexWin";
    var game = o.game || "遊戲";
    var line = o.win
      ? "🎉 我在 " + brand + " 玩「" + game + "」贏得 " + (o.amount || "") + "！"
      : "我在 " + brand + " 玩「" + game + "」：" + (o.amount || "");
    shareText({ title: brand + " 戰績", text: line + " 一起來試手氣 👉" });
  }

  HL.share = { text: shareText, result: shareResult, url: shareUrl };

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

  // 分段控制（segmented）：options=[{v,t}]，點選切換 is-on。（原 arena/demo-tools 各有一份相同實作）
  function segmented(options, current, onPick) {
    var wrap = el("div", { class: "ax-seg" });
    options.forEach(function (o) {
      wrap.appendChild(el("button", {
        class: "ax-seg-btn" + (o.v === current ? " is-on" : ""), text: o.t,
        onClick: function () { onPick(o.v); Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove("is-on"); }); this.classList.add("is-on"); }
      }));
    });
    return wrap;
  }

  // 頁籤列：把 items 填入既有 container（清空再填），供 renderTabs 這類「重繪整條」的呼叫端共用。
  //   items=[{k, n}]；onPick(k, item)；opts.isActive(item)→bool 決定 is-active。
  function tabs(container, items, onPick, opts) {
    opts = opts || {};
    HL.dom.clear(container);
    items.forEach(function (it) {
      var active = opts.isActive ? opts.isActive(it) : false;
      container.appendChild(el("button", {
        class: "ax-tab" + (active ? " is-active" : ""),
        text: it.n != null ? it.n : it.label,
        onClick: function () { onPick(it.k, it); }
      }));
    });
    return container;
  }

  // 鍵值列：opts.row→橫向(ax-kv--row)、opts.cls→容器附加 class、opts.valCls→值(b)的 class。
  function kv(k, v, opts) {
    opts = opts || {};
    return el("div", { class: "ax-kv" + (opts.row ? " ax-kv--row" : "") + (opts.cls ? " " + opts.cls : "") }, [
      el("span", { class: "ax-muted", text: k }),
      el("b", { class: opts.valCls || "", text: v })
    ]);
  }

  // 結算結果塊（.ax-result）：win→套 win/lose 色；extra=額外子節點(陣列，null 自動略過)。
  //   opts.share = {game}（或 true）時，附「🔗 分享戰績」鈕（Web Share API）；win/amount 沿用本塊。
  //   原本 arena(×2)/bounty(×2)/slot/vsslot 共 6 處各自手刻。
  function resultBlock(win, title, amount, extra, opts) {
    var kids = [
      el("div", { class: "ax-result__title", text: title }),
      el("div", { class: "ax-result__amount", text: amount })
    ];
    if (extra) (Array.isArray(extra) ? extra : [extra]).forEach(function (n) { if (n != null) kids.push(n); });
    if (opts && opts.share) {
      var sg = opts.share === true ? {} : opts.share;
      kids.push(el("button", {
        class: "ax-result__share", type: "button", text: "🔗 分享戰績",
        onClick: function () { shareResult({ game: sg.game, win: win, amount: sg.amount != null ? sg.amount : amount }); }
      }));
    }
    return el("div", { class: "ax-result " + (win ? "win" : "lose") }, kids);
  }

  // 關閉彈窗（統一入口，取代各 view 散落的 querySelectorAll('.ax-modal-mask') 手動移除）。
  // 走每個 mask 的 __axClose（移 keydown + 還原焦點）；非本模組建立的 mask 退回直接移除。
  function killMask(m) { if (!m) return; if (m.__axClose) m.__axClose(); else if (m.parentNode) m.parentNode.removeChild(m); }
  function closeAll() { Array.prototype.slice.call(document.querySelectorAll(".ax-modal-mask")).forEach(killMask); }
  function closeTop() { var ms = document.querySelectorAll(".ax-modal-mask"); killMask(ms[ms.length - 1]); }

  HL.ui = {
    toast: toast, modal: modal, comingSoon: comingSoon,
    promoCard: promoCard, carousel: carousel, gameCard: gameCard,
    segmented: segmented, tabs: tabs, kv: kv, resultBlock: resultBlock,
    closeAll: closeAll, closeTop: closeTop
  };
})(window);

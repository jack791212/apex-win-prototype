/*
 * Apex Win｜通用「揭曉型領獎」元件（自我進化引擎 #38）
 * 對標 Spree（XP 解鎖 → scratch-off / bubble burst / prize wheel 揭曉領獎）+ Punkz（Loot Box 開箱儀式）。
 * ApexWin 領獎原本多為「直接入帳」，缺互動揭曉的儀式感——本檔做成可複用元件、一次做多處掛。
 * 鐵律：本元件**純呈現、不派彩**——呼叫端先同步入帳（房規：同步記帳保證不漏、動畫僅視覺呈現），
 *   再呼叫 show() 播放揭曉儀式；使用者中途關閉 modal 也不會漏帳。
 * 三種樣式：scratch（刮刮卡 canvas）/ bubble（戳泡泡）/ wheel（轉輪）。
 * 註冊於 window.HL.reveal = { show, styles }。
 *   show({ style?, title?, ic?, amount, onDone? })：style 不給則隨機；amount 為要展示的獎額（已入帳）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;
  function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }

  var STYLES = ["scratch", "bubble", "wheel"];

  // ---- 各樣式的互動舞台。完成揭曉時呼叫 finish()（一次性）。----

  // 刮刮卡：canvas 覆蓋層 destination-out 擦除，放開時取樣清除率 >45% 即完成。
  // 覆蓋層只畫金幣圖樣（不畫文字，避開 DOM 翻譯層搆不到 canvas 的問題）。
  function stageScratch(amount, ic, finish) {
    var W = 260, H = 130;
    var under = el("div", { class: "ax-reveal__under" }, [
      el("span", { class: "ax-reveal__uic", text: ic }),
      el("b", { class: "ax-gold", text: money(amount) })
    ]);
    var cv = el("canvas", { class: "ax-reveal__cv", width: String(W), height: String(H) });
    var wrap = el("div", { class: "ax-reveal__scratch" }, [under, cv]);
    var ctx = cv.getContext("2d");
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#3b3567"); g.addColorStop(1, "#1c2740");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.font = "22px serif"; ctx.globalAlpha = 0.5;
    for (var y = 22; y < H; y += 34) for (var x = 10; x < W; x += 44) ctx.fillText("🪙", x + ((y / 34) % 2) * 20, y);
    ctx.globalAlpha = 1;

    var drawing = false, done = false;
    function at(e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
    }
    function check() {
      if (done) return;
      var img = ctx.getImageData(0, 0, W, H).data, clear = 0, total = 0;
      for (var y = 6; y < H; y += 12) for (var x = 6; x < W; x += 12) { total++; if (img[(y * W + x) * 4 + 3] < 40) clear++; }
      if (clear / total > 0.45) { done = true; cv.style.opacity = "0"; setTimeout(finish, 350); }
    }
    cv.addEventListener("pointerdown", function (e) { drawing = true; try { cv.setPointerCapture(e.pointerId); } catch (er) {} at(e); });
    cv.addEventListener("pointermove", function (e) { if (drawing) at(e); });
    cv.addEventListener("pointerup", function () { drawing = false; check(); });
    cv.addEventListener("pointercancel", function () { drawing = false; check(); });
    return { node: wrap, hint: "刮開卡片揭曉獎勵" };
  }

  // 戳泡泡：3×3 泡泡，第 3 顆戳破的泡泡揭曉獎勵。
  function stageBubble(amount, ic, finish) {
    var pops = 0, done = false;
    var cells = [];
    for (var i = 0; i < 9; i++) {
      (function () {
        var b = el("button", { class: "ax-reveal__bub", text: "🫧" });
        b.addEventListener("click", function () {
          if (done || b.disabled) return;
          b.disabled = true; pops++;
          if (pops >= 3) {
            done = true;
            b.textContent = ic; b.classList.add("is-hit");
            cells.forEach(function (c) { c.disabled = true; });
            setTimeout(finish, 450);
          } else {
            b.textContent = "💨"; b.classList.add("is-pop");
          }
        });
        cells.push(b);
      })();
    }
    return { node: el("div", { class: "ax-reveal__bubs" }, cells), hint: "戳破泡泡揭曉獎勵" };
  }

  // 轉輪：8 段裝飾圖示轉輪（獎額已定，轉輪為呈現），停在 🎁 段後揭曉。
  function stageWheel(amount, ic, finish) {
    var ICONS = ["💰", "⭐", "🍀", ic, "💎", "🔔", "🍒", "👑"];
    var HIT = 3; // 停在 ic 段
    var COLORS = ["#7c3aed", "#2563eb", "#0891b2", "#ca8a04", "#16a34a", "#ea580c", "#dc2626", "#db2777"];
    var stops = [];
    for (var i = 0; i < 8; i++) stops.push(COLORS[i] + " " + (i * 45) + "deg " + ((i + 1) * 45) + "deg");
    var wheel = el("div", { class: "ax-reveal__wheel", style: "background:conic-gradient(" + stops.join(",") + ")" },
      ICONS.map(function (c, i) {
        return el("span", { class: "ax-reveal__wic", style: "transform:rotate(" + (i * 45 + 22.5) + "deg) translateY(-46px) rotate(-" + (i * 45 + 22.5) + "deg)", text: c });
      }));
    var btn = el("button", { class: "ax-btn-primary" }, [el("span", { text: t("轉動", "轉動") })]);
    var spun = false;
    btn.addEventListener("click", function () {
      if (spun) return; spun = true;
      btn.setAttribute("disabled", "disabled");
      var center = HIT * 45 + 22.5;
      wheel.style.transform = "rotate(" + (360 * 6 + ((360 - center) % 360)) + "deg)";
      setTimeout(finish, 2700); // 單一閘門收尾（同 luckyspin 模式）
    });
    var stage = el("div", { class: "ax-reveal__wstage" }, [el("div", { class: "ax-reveal__wptr" }), wheel]);
    return { node: el("div", { class: "ax-reveal__wwrap" }, [stage, btn]), hint: "轉動轉輪揭曉獎勵" };
  }

  var BUILDERS = { scratch: stageScratch, bubble: stageBubble, wheel: stageWheel };

  function show(opts) {
    opts = opts || {};
    var style = BUILDERS[opts.style] ? opts.style : STYLES[Math.floor(Math.random() * STYLES.length)];
    var amount = opts.amount || 0;
    var ic = opts.ic || "🎁";
    var finished = false;

    var result = el("div", { class: "ax-reveal__result", style: "display:none" }, [
      el("div", { class: "ax-reveal__congrats", text: t("🎉 恭喜獲得", "🎉 恭喜獲得") }),
      el("b", { class: "ax-reveal__amt ax-gold", text: money(amount) }),
      el("small", { class: "ax-muted", text: t("已入獎金錢包", "已入獎金錢包") }),
      el("button", { class: "ax-btn-primary", text: t("太棒了，收下 ✓", "太棒了，收下 ✓"), onClick: function () {
        modalRef.close();
        if (typeof opts.onDone === "function") opts.onDone();
      } })
    ]);

    var stage = BUILDERS[style](amount, ic, function finish() {
      if (finished) return; finished = true;
      stageHost.style.display = "none";
      hintEl.style.display = "none";
      result.style.display = "flex";
    });

    var stageHost = el("div", { class: "ax-reveal__stage" }, [stage.node]);
    var hintEl = el("small", { class: "ax-muted ax-reveal__hint", text: t(stage.hint, stage.hint) });

    var modalRef = HL.ui.modal(opts.title || t("🎁 揭曉獎勵", "🎁 揭曉獎勵"), [
      el("div", { class: "ax-reveal" }, [stageHost, hintEl, result])
    ]);
    return modalRef;
  }

  HL.reveal = { show: show, styles: STYLES.slice() };
})(window);

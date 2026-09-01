/*
 * Apex Win｜輪盤 Roulette（歐式單零，掛在 HL.table 共用桌遊引擎上）
 * 真開：0–36 亂數開號。注區：直注 35:1(36×)、紅黑/單雙/大小 1:1(2×)、打/列 2:1(3×)。
 * 結算走 HL.table（扣注/派彩/餘額同步 + 掛 HL.liveStats.record）。
 * 以 HL.games.register 覆蓋 mock 的「European Roulette」占位卡（id: european-roulette）為可玩。
 * 載入順序：data/games.js 之後（覆蓋 seed）、core/table.js 之後。
 * 純數學區（無 DOM）同時 module.exports 給 node RTP 驗證器 → 驗的就是玩家玩的同一份數學（HL.roulette）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  // ===================== 純數學（無 DOM；遊戲 render + node RTP 驗證器共用）=====================
  var POCKETS = 37; // 歐式單零：0..36
  var RED = { 1: 1, 3: 1, 5: 1, 7: 1, 9: 1, 12: 1, 14: 1, 16: 1, 18: 1, 19: 1, 21: 1, 23: 1, 25: 1, 27: 1, 30: 1, 32: 1, 34: 1, 36: 1 };
  function colorOf(n) { return n === 0 ? "green" : (RED[n] ? "red" : "black"); }
  function colorName(n) { return n === 0 ? "綠" : (RED[n] ? "紅" : "黑"); }

  // float(0..1) → 開出號碼（0..36 均勻）。遊戲與驗證器共用同一映射。
  function resolveFloat(f) { return Math.floor(f * POCKETS); }

  // 開出 n → 各中獎注區的「總賠付倍數」（未列＝輸=0）
  function returnsOf(n) {
    var r = {};
    r["n" + n] = 36;                       // 直注 35:1
    if (n !== 0) {
      r[RED[n] ? "red" : "black"] = 2;     // 紅黑 1:1
      r[(n % 2 === 0) ? "even" : "odd"] = 2; // 單雙 1:1
      r[(n <= 18) ? "low" : "high"] = 2;   // 大小 1:1
      r["d" + (n <= 12 ? 1 : n <= 24 ? 2 : 3)] = 3; // 打(12) 2:1
      r["c" + (((n - 1) % 3) + 1)] = 3;    // 列 2:1（1,4,7..=c1；2,5,8..=c2；3,6,9..=c3）
    }
    return r;
  }

  // ── 贏分回饋分級 + 淨額 roll-up（純函式，node 驗證器與瀏覽器共用同一份）──────────────
  // 舊版：結算只寫一行綠字＋單一 ax-green，直注 36× 與紅黑/單雙 2× 視覺重量完全相同，
  //   且淨額一次性 textContent 跳到終值（無 roll-up count-up）＝玩家無法從畫面感知「這注中得很大」
  //   （game-feel #2 flat-feedback-no-tiering，同 #13 sicbo/moneywheel／#2 dragon-tiger/baccarat 家族尺）。
  // 修法：以「本局總回收倍數 x = payout / staked」分級（epic≥50×／mega≥15×／big≥5×／其餘普通贏；
  //   直注 36×＝mega、打/列 3×與紅黑等 2×＝普通），結算拍寫 data-tier 供 headless 驗分級＋掛內聯分級輝光
  //   （零首屏 CSS），再把淨額以 setTimeout 分步 roll-up（純節拍函式、非 rAF ⇒ 背景分頁/headless 也推進、末步精確等於淨額）。
  var TIER_EPIC = 50, TIER_MEGA = 15, TIER_BIG = 5;   // 回收倍數門檻（gross return multiple）
  function winMult(payout, staked) { return staked > 0 ? payout / staked : 0; }
  function winTier(payout, staked) {
    var x = winMult(payout, staked);
    return x >= TIER_EPIC ? "epic" : x >= TIER_MEGA ? "mega" : x >= TIER_BIG ? "big" : "";
  }
  function tierLabel(tier) { return tier === "epic" ? "史詩大獎 EPIC！" : tier === "mega" ? "超級大獎 MEGA！" : tier === "big" ? "大獎 BIG！" : ""; }
  var ROLLUP_STEPS = 14;    // 淨額 count-up 分步數（>1 ⇒ 不是一次跳號）
  var ROLLUP_MS = 616;      // 總 roll-up 時長（≈44ms/步·可讀）
  function rollupSteps() { return ROLLUP_STEPS; }
  function rollupStepMs() { return Math.round(ROLLUP_MS / ROLLUP_STEPS); }
  function rollupValueAt(net, step) { return step >= ROLLUP_STEPS ? net : Math.round(net * step / ROLLUP_STEPS); } // 末步精確＝net

  // ── 輪盤盤面幾何（純函式，node 驗證器與瀏覽器共用同一份）─────────────────────────────
  //   修 game-feel #66（wrong-genre·high）＋#51（animation-end-not-committed·low）：舊版輪面只是一個
  //   `axRouSpin` 等速轉 360° 的裝飾圓（fill-mode:none ⇒ class 一移除就彈回 0°），**旋轉角度與開出號碼完全無關**，
  //   號碼只是中央 textContent 瞬間替換、盤上沒有球。玩家看的過程與結果毫無因果（保真規格第 3/4 項）。
  //   修法：把「盤面停在哪＝開出哪號」做成純函式因果——37 格依**歐式單零 canonical 順序**排成一圈，
  //   旋轉終角 = 純函式 restRotation(result)，使中獎格恰好停在頂端指針下並**committed（不彈回）**；球停在頂端＝落在中獎格。
  var WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]; // 歐式單零輪盤 canonical 順時針序（0 起）
  var SPIN_TURNS = 6;                                   // 每次旋轉的整圈數（視覺盡力；不影響停位，因整圈=360°倍數）
  function wheelIndex(n) { return WHEEL_ORDER.indexOf(n); }              // 號碼 n 在盤面圈上的格位 0..36
  function pocketAngle(n) { return wheelIndex(n) * (360 / POCKETS); }    // n 格相對頂端的初始角（順時針度）
  // 旋轉盤面 R 度後，n 格落在 (pocketAngle(n)+R)；要 n 停在頂端(≡0)須 R≡-pocketAngle(n)，再加整圈數做出旋轉演出。
  function restRotation(n, turns) { turns = (turns == null ? SPIN_TURNS : turns); return turns * 360 - pocketAngle(n); }

  HL.roulette = { POCKETS: POCKETS, RED: RED, colorOf: colorOf, colorName: colorName, resolveFloat: resolveFloat, returnsOf: returnsOf,
    winMult: winMult, winTier: winTier, tierLabel: tierLabel, rollupSteps: rollupSteps, rollupStepMs: rollupStepMs, rollupValueAt: rollupValueAt,
    TIER_EPIC: TIER_EPIC, TIER_MEGA: TIER_MEGA, TIER_BIG: TIER_BIG, ROLLUP_STEPS: ROLLUP_STEPS,
    WHEEL_ORDER: WHEEL_ORDER, SPIN_TURNS: SPIN_TURNS, wheelIndex: wheelIndex, pocketAngle: pocketAngle, restRotation: restRotation };
  if (typeof module !== "undefined" && module.exports) { module.exports = HL.roulette; }

  // ===================== 瀏覽器 render + 上架（node 驗證時 HL.dom 不存在 → 提前返回）=====================
  if (!HL.dom || !HL.games || !HL.table || !HL.ui) return;
  var el = HL.dom.el, money = HL.dom.money;

  function infoModal() {
    HL.ui.modal("輪盤 · 規則 / 賠率", [
      el("p", { class: "ax-muted", text: "歐式單零輪盤（0–36，共 37 格，莊家優勢 2.7%）。下注後旋轉，開出號碼即結算。" }),
      HL.ui.payoutRules([
        { term: "直注（單一號碼）", desc: "　35:1（退 36×）" },
        { term: "紅 / 黑、單 / 雙、小(1–18) / 大(19–36)", desc: "　1:1（退 2×）" },
        { term: "打（1–12 / 13–24 / 25–36）、列（2 to 1）", desc: "　2:1（退 3×）" }
      ], { cls: "ax-bacc__rules" }),
      el("p", { class: "ax-muted", text: "開出 0 時，所有場外注（紅黑/單雙/大小/打/列）皆輸。本桌採可驗證公平（HMAC-SHA256）開號 · Demo，點「近況」珠可開驗證面板。" })
    ]);
  }

  function rouletteGame() {
    var spotEls = {};
    var pocket = el("div", { class: "ax-rou__pocket", text: "?" });
    // ── 真實輪盤盤面（inline style＝零首屏 CSS）：37 格 canonical 順序圈 + 球 ──────────
    var WHEEL_PX = 180, NUM_R = 70, BALL_R = 80, BALL_SPINS = 10;
    function pocketBg(n) { var c = colorOf(n); return c === "red" ? "#c0392b" : c === "green" ? "#15834e" : "#141418"; }
    var ring = el("div", { class: "ax-rou__ring" });
    ring.style.cssText = "position:absolute;inset:0;border-radius:50%;transform:rotate(0deg);will-change:transform;z-index:1;";
    WHEEL_ORDER.forEach(function (num, i) {
      var ang = i * (360 / POCKETS);
      var wrap = el("div", { class: "ax-rou__pnum" });
      wrap.style.cssText = "position:absolute;top:50%;left:50%;width:0;height:0;transform:rotate(" + ang + "deg) translateY(-" + NUM_R + "px);";
      var lbl = el("span", { text: String(num) });
      lbl.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(" + (-ang) + "deg);"
        + "font-size:8px;font-weight:900;line-height:1;color:#fff;padding:1px 3px;border-radius:4px;"
        + "background:" + pocketBg(num) + ";box-shadow:0 0 1px rgba(0,0,0,.85);";
      wrap.appendChild(lbl); ring.appendChild(wrap);
    });
    function ballTransform(deg) { return "translate(-50%,-50%) rotate(" + deg + "deg) translateY(-" + BALL_R + "px)"; }
    var ball = el("div", { class: "ax-rou__ball" });
    ball.style.cssText = "position:absolute;top:50%;left:50%;width:11px;height:11px;border-radius:50%;z-index:3;"
      + "background:radial-gradient(circle at 35% 30%,#fff,#c2cad6);box-shadow:0 1px 4px rgba(0,0,0,.7);"
      + "transform:" + ballTransform(0) + ";";
    var wheel = el("div", { class: "ax-rou__wheel" }, [ring, el("div", { class: "ax-rou__pointer" }), ball, pocket]);
    // 覆寫首屏 CSS 的 132px 裝飾圓（inline·lazy＝零首屏成本）：放大到 180px 給 37 格號碼空間、換掉會與 37 格錯位的紅黑條紋 conic
    wheel.style.cssText = "width:" + WHEEL_PX + "px;height:" + WHEEL_PX + "px;background:radial-gradient(circle at 50% 32%,#3a2018,#160b0e 72%);";
    var statusEl = el("div", { class: "ax-inst__last ax-muted", text: "下注後按「旋轉」，開出號碼即結算 🎯" });
    var history = HL.ui.histBar({ cls: "ax-rou__hist", itemCls: "ax-rou__histpill", max: 16, fair: true }); // 已接 HL.fair → 近況珠可點開驗證面板

    function spot(id, label, cls) {
      var badge = el("div", { class: "ax-tbl__stake" });
      var box = el("button", { class: "ax-rou__spot " + (cls || ""), onClick: function () { area.place(id); } }, [
        el("span", { class: "ax-rou__spotlbl", text: label }), badge
      ]);
      spotEls[id] = { badge: badge, box: box };
      return box;
    }
    function renderStakes() { HL.table.renderStakes(spotEls, area, function (v) { return v >= 1000 ? Math.round(v / 1000) + "k" : v; }); }
    var area = HL.table.betArea({ game: "roulette", onChange: renderStakes });

    // ---- 賭桌佈局 ----
    // 上半：0（左、跨 3 列）+ 12×3 號碼格 + 右側 3 個「2 to 1」列注
    var grid = el("div", { class: "ax-rou__grid" });
    var zero = spot("n0", "0", "ax-rou__cell is-green ax-rou__zero");
    grid.appendChild(zero);
    for (var i = 0; i < 12; i++) {
      // 上列 3,6,..36 / 中列 2,5,..35 / 下列 1,4,..34
      [3 * (i + 1), 3 * (i + 1) - 1, 3 * (i + 1) - 2].forEach(function (num, rowIdx) {
        var cell = spot("n" + num, String(num), "ax-rou__cell is-" + colorOf(num));
        cell.style.gridColumn = String(2 + i);
        cell.style.gridRow = String(rowIdx + 1);
        grid.appendChild(cell);
      });
    }
    // 右側列注（c3=上列、c2=中列、c1=下列）
    [["c3", 1], ["c2", 2], ["c1", 3]].forEach(function (cr) {
      var cb = spot(cr[0], "2:1", "ax-rou__colbet");
      cb.style.gridColumn = "14"; cb.style.gridRow = String(cr[1]);
      grid.appendChild(cb);
    });

    // 下半：打（dozens）+ 場外（1-18/單/紅/黑/雙/19-36）
    var dozens = el("div", { class: "ax-rou__dozens" }, [
      spot("d1", "第 1 打 (1–12)", "ax-rou__obet"),
      spot("d2", "第 2 打 (13–24)", "ax-rou__obet"),
      spot("d3", "第 3 打 (25–36)", "ax-rou__obet")
    ]);
    var outside = el("div", { class: "ax-rou__outside" }, [
      spot("low", "1–18", "ax-rou__obet"),
      spot("even", "雙", "ax-rou__obet"),
      spot("red", "紅", "ax-rou__obet is-red"),
      spot("black", "黑", "ax-rou__obet is-black"),
      spot("odd", "單", "ax-rou__obet"),
      spot("high", "19–36", "ax-rou__obet")
    ]);

    // ---- 旋轉 / 結算 ----
    function setPocket(n) {
      pocket.textContent = String(n);
      pocket.className = "ax-rou__pocket is-" + colorOf(n);
    }
    function clearWins() { for (var id in spotEls) spotEls[id].box.classList.remove("is-win"); }
    function pushHistory(n) { history.push(String(n), "is-" + colorOf(n)); }

    function onSpin() {
      var snap = area.commit(); if (!snap) return;
      area.lock(true); ctrls.dealBtn.disabled = true;
      clearWins();
      statusEl.textContent = "旋轉中…"; statusEl.className = "ax-inst__last ax-muted";
      pocket.className = "ax-rou__pocket is-spin"; pocket.textContent = "·";

      var result = resolveFloat(HL.fair.floatOr("roulette")); // 立即定結果（可驗證公平 HMAC-SHA256；下方 flick 僅視覺滾號、不決結果）＝與 node 驗證器同一映射
      var ret = returnsOf(result);

      /* #66/#51：盤面停位＝開出號碼的純函式因果，且 committed（class 移除不再彈回 0°）。
       * 先歸零再 transition 到 restRotation(result)＝真的轉出這一號；球反向繞圈後停頂端＝落在中獎格。
       * headless 無影格合成時 transition 不推進、元素直接停在終角＝停位仍然正確（優雅退化）。 */
      wheel.setAttribute("data-beat", "spinning");
      ring.style.transition = "none"; ring.style.transform = "rotate(0deg)";
      ball.style.transition = "none"; ball.style.transform = ballTransform(0);
      void wheel.offsetWidth;                                                     // 強制 reflow 讓下面終角走 transition
      ring.style.transition = "transform 2.15s cubic-bezier(.16,.62,.2,1)";
      ring.style.transform = "rotate(" + restRotation(result) + "deg)";          // ← committed 終角（中獎格停頂端指針下）
      ball.style.transition = "transform 2.15s cubic-bezier(.2,.72,.16,1)";
      ball.style.transform = ballTransform(-BALL_SPINS * 360);                    // 反向繞 N 圈後停頂端(≡0 mod 360)＝落在中獎格

      /* 中央滾號（視覺盡力·不決結果）。⚠️ 家族 B：`clearInterval` 只寫在下方揭曉的 setTimeout 裡 ⇒ 玩家在開獎途中
       * 離開遊戲頁，這條 60ms 的 interval 會**永遠跑下去**寫一個已經離開 DOM 的元素（每次進出多留一條）。
       * 加存活檢查自我了結（同 core/instant.js 的 panel.isConnected、instant-crash-mines.js 的 multEl.isConnected）。 */
      var flick = setInterval(function () {
        if (!pocket.isConnected) { clearInterval(flick); return; }
        pocket.textContent = String(Math.floor(Math.random() * 37));
      }, 60);

      // 單一 setTimeout 閘門保證結算（背景分頁/無 rAF 也成立）
      setTimeout(function () {
        clearInterval(flick);
        wheel.setAttribute("data-beat", "landed");
        setPocket(result);
        for (var id in spotEls) if (ret[id]) spotEls[id].box.classList.add("is-win");
        // 家族 D＋E：分階段結算（先掃輸家籌碼、再付贏家）——兩拍做在 HL.table，這裡只等它完成
        area.settleStaged(snap, ret).then(function (r) {
          pushHistory(result);
          var head = "開出 " + result + "（" + colorName(result) + "）　";
          function unlock() { area.lock(false); area.clear(); ctrls.dealBtn.disabled = false; }
          if (r.net < 0) { // 淨負（輸）：即時揭示、無 roll-up、清除分級輝光
            statusEl.textContent = head + "輸 " + money(-r.net);
            statusEl.className = "ax-inst__last ax-red";
            statusEl.style.fontWeight = ""; statusEl.style.textShadow = "";
            statusEl.setAttribute("data-tier", "loss");
            statusEl.setAttribute("data-beat", "settled");
            unlock(); return;
          }
          // 贏（含淨零 net=0）：#2 分級（data-tier）＋內聯分級輝光（零首屏 CSS）＋淨額 setTimeout 分步 roll-up（末步精確）
          var tier = winTier(r.payout, r.staked);
          statusEl.className = "ax-inst__last ax-green" + (tier ? " ax-rou__win--" + tier : "");
          statusEl.style.fontWeight = tier ? "700" : "";
          statusEl.style.textShadow = tier === "epic" ? "0 0 14px rgba(255,196,64,.9)"
            : tier === "mega" ? "0 0 10px rgba(255,196,64,.7)"
            : tier === "big" ? "0 0 7px rgba(255,196,64,.5)" : "";
          statusEl.setAttribute("data-tier", tier || "win");
          var prefix = tier ? tierLabel(tier) + "　" : "";
          var steps = rollupSteps(), step = 0;
          (function tick() {                                     // 逐步累進淨額（table 保持鎖定至 roll-up 完成＝無跨局覆寫）
            step++;
            statusEl.textContent = head + prefix + "贏 +" + money(rollupValueAt(r.net, step));
            if (step < steps) { statusEl.setAttribute("data-beat", "rollup"); setTimeout(tick, rollupStepMs()); }
            else { statusEl.setAttribute("data-beat", "settled"); unlock(); }
          })();
        });
      }, 2200);
    }

    var ctrls = area.controls(onSpin, "旋轉");

    var node = el("div", { class: "ax-inst ax-rou ax-fade-in" }, [
      el("div", { class: "ax-bacc__titlerow" }, [
        el("h2", { class: "ax-inst__title", text: "🎯 輪盤 Roulette" }),
        el("button", { class: "ax-slot__info", text: "ℹ 規則 / 賠率", onClick: infoModal })
      ]),
      el("div", { class: "ax-rou__stage" }, [wheel, statusEl,
        el("div", { class: "ax-rou__histrow" }, [el("small", { class: "ax-muted", text: "近況" }), history.node])
      ]),
      el("div", { class: "ax-rou__board" }, [grid, el("div", { class: "ax-rou__below" }, [dozens, outside])]),
      HL.table.panel(area, ctrls)
    ]);

    renderStakes();
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "輪盤 Roulette", provider: "Apex Studio", key: "roulette" }) : node;
  }

  if (HL.games && HL.games.register) {
    HL.games.register({
      id: "european-roulette", title: "輪盤 Roulette", provider: "Apex Studio",
      type: "table", cat: "table", playable: true, comingSoon: false, isNew: true, hot: true,
      author: "Apex", c1: "#7a1020", c2: "#2a0a12", render: rouletteGame
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

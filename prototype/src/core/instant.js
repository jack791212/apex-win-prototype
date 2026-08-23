/*
 * Apex Win｜即時遊戲共用引擎 HL.instant
 * 給 Dice/Limbo/Crash/Mines/Plinko 等 instant 遊戲共用：
 *  - 下注金額面板（輸入 + ½ / 2× / Max）
 *  - 手動 / 自動 切換；自動下注(局數、贏後+%/輸後+%、止盈、止損、Turbo)
 *  - 統一扣注 / 派彩 / 餘額同步（Demo：HL.state.balance）
 * 各遊戲只需提供 playRound(bet) → { win, multiplier(總賠付倍數,輸=0), label? }，
 * 並在 playRound 內更新自己的 stage 視覺。本面板負責金流與 autobet。註冊於 window.HL.instant。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el, money = HL.dom.money;

  function bal() { return HL.state.bal(); }                 // T39：委派餘額存取單一真相 HL.state
  function setBal(v) { HL.state.setBal(v); }                 // T39：同上（body 原與 HL.state.setBal 逐字相同）
  function clampInt(v, lo, hi) { v = Math.round(+v || 0); return Math.max(lo, Math.min(hi, v)); }
  function fastMode() { return !!(HL.gset && HL.gset.get("fast")); } // S1 極速模式：跳過結果動畫
  function chip(t, fn) { return el("button", { class: "ax-inst__chip", text: t, onClick: fn }); } // betPanel/amountField 共用（原兩閉包各一份逐字相同）

  /* ---- 活面板登記簿（2026-08-20 手感巡檢家族 B：沒有 view 卸載鉤）------------------------
   * 【缺陷】`app-shell.js mountView` / `main.js renderApp` 換頁只 `HL.dom.clear()` 拔 DOM，
   *   views 層 `grep unmount|teardown|onLeave|destroy` 零命中 ⇒ **autobet 迴圈在玩家離開遊戲頁後
   *   仍每 470ms 繼續扣款派彩**，而且照樣餵 VIP/任務/返水/JP/錦標賽、消耗 fair nonce；
   *   每進一款新遊戲就多疊一個並行迴圈，同吃一份餘額，直到餘額見底才停。
   *   （`betPanel.stop` 出口早就存在，但全 repo 零呼叫者＝死出口——有機制沒接線。）
   * 【修法】兩層，缺一不可：
   *   ① 登記簿 + `HL.instant.stopAll()`：換頁時由殼層一行呼叫，治本。
   *   ② `step()` 每一拍先問 `panel.isConnected`：即使某條換頁路徑忘了呼叫 ①（或未來新增第三條），
   *      迴圈也會在**下一次扣款之前**自己停。抄的是同庫既有形制（下方熱鍵 `hkPanel.node.isConnected`、
   *      `views/instant-crash-mines.js` 的 `if (!multEl.isConnected) { stop(); return; }`）。 */
  var livePanels = [];
  function stopAll(onlyDetached) {
    livePanels = livePanels.filter(function (p) {
      var gone = !p.node.isConnected;
      if (gone || !onlyDetached) p.stop();
      return !gone;
    });
    return livePanels.length;
  }

  // ---- 熱鍵（S2，由 HL.gset.hotkeys gate；作用於最後掛載且仍在 DOM 的 betPanel）----
  // Space=下注 · S=加倍 · A=減半 · D=最小注。輸入框聚焦或彈窗開啟時停用。
  var hkPanel = null;
  document.addEventListener("keydown", function (e) {
    if (!HL.gset || !HL.gset.get("hotkeys")) return;
    if (!hkPanel || !hkPanel.node.isConnected) { hkPanel = null; return; }
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (document.querySelector(".ax-modal-mask")) return;
    if (e.code === "Space") { e.preventDefault(); hkPanel.pressPlay(); }
    else if (e.code === "KeyS") hkPanel.mulBet(2);
    else if (e.code === "KeyA") hkPanel.mulBet(0.5);
    else if (e.code === "KeyD") hkPanel.setMin();
  });

  function betPanel(opts) {
    opts = opts || {};
    var state = { bet: opts.initial || 50, running: false };
    var base = state.bet, timer = null;

    var input = el("input", { type: "number", min: "1", value: String(state.bet), class: "ax-inst__bet", "aria-label": "下注金額" });
    function notifyBet() { if (opts.onBetChange) opts.onBetChange(state.bet); }
    function readBet() { state.bet = clampInt(input.value, 1, 9e9); input.value = String(state.bet); return state.bet; }
    function writeBet(v) { state.bet = clampInt(v, 1, 9e9); input.value = String(state.bet); notifyBet(); }
    input.addEventListener("input", function () { state.bet = clampInt(input.value, 1, 9e9); notifyBet(); });
    /* ⚠️ chips 收成陣列而不是就地 new（2026-08-20 家族 A）：因為 lock() 要能把它們一起 disable。
     *   缺陷原形＝注額欄與 ½/2×/Max 三顆 chip 從頭到尾無回合閘，而 autobet 每局又會回寫 input.value
     *   ⇒ 兩邊搶同一個欄位；更糟的是「已經付款的那一注」在動畫途中還能被改注額。 */
    var chips = [
      chip("½", function () { writeBet(Math.max(1, Math.floor(state.bet / 2))); }),
      chip("2×", function () { writeBet(state.bet * 2); }),
      chip("Max", function () { writeBet(bal()); })
    ];
    var amountRow = el("div", { class: "ax-inst__row" }, [
      el("small", { class: "ax-muted", text: "下注金額" }),
      el("div", { class: "ax-inst__amt" }, [input].concat(chips))
    ]);

    var manualWrap = el("div", { class: "ax-inst__manual" });
    var autoWrap = el("div", { class: "ax-inst__auto", style: "display:none" });
    var tabM = el("button", { class: "ax-inst__tab is-active", text: "手動", role: "tab", "aria-selected": "true" });
    var tabA = el("button", { class: "ax-inst__tab", text: "自動", role: "tab", "aria-selected": "false" });
    function setMode(auto) {
      tabM.classList.toggle("is-active", !auto); tabA.classList.toggle("is-active", auto);
      tabM.setAttribute("aria-selected", auto ? "false" : "true"); tabA.setAttribute("aria-selected", auto ? "true" : "false");
      manualWrap.style.display = auto ? "none" : "block";
      autoWrap.style.display = auto ? "block" : "none";
    }
    tabM.addEventListener("click", function () { if (!state.running) setMode(false); });
    tabA.addEventListener("click", function () { if (!state.running) setMode(true); });

    var lastEl = el("div", { class: "ax-inst__last ax-muted", text: "—" });
    /* 「上一局」計分板的唯一寫入點（家族 F · 2026-08-22 #45）。原本只寫在 finish() 裡、又不在 api 裡
     *   ⇒ 遊戲自己開的回合（5 款 slot 的「購買免費遊戲」買入路徑）自算派彩、繞過 settle()，面板的
     *   「上一局」永遠停在上一筆普通旋轉那筆＝兩個計分面板互相矛盾。抽成 writeLast 並經 api.setLast
     *   對外開放，讓買入型入口能把自己的結果寫回同一個計分板。 */
    function writeLast(net, label) {
      lastEl.textContent = (net >= 0 ? "贏 +" + money(net) : "輸 " + money(-net)) + (label ? "　" + label : "");
      lastEl.className = "ax-inst__last " + (net >= 0 ? "ax-green" : "ax-red");
    }
    // res.multiplier = 總賠付倍數（輸=0；可為 <1 的部分賠付，如 Plinko）。以淨值判定輸贏顯示。
    // res.done（選用）= Promise：有動畫的遊戲(Dice/Limbo)在動畫結束才結算派彩，回傳 Promise。
    function settle(bet, res) {
      setBal(bal() - bet); // 立即扣注
      function finish() {
        var payout = Math.round(bet * (res.multiplier || 0));
        if (payout) setBal(bal() + payout);
        if (HL.liveStats) HL.liveStats.record(opts.game || "instant", bet, payout); // 進實時統計 + 餵 VIP/任務
        var net = payout - bet;
        writeLast(net, res.label);
        return { payout: payout, net: net };
      }
      return (res && res.done && typeof res.done.then === "function") ? res.done.then(finish) : finish();
    }

    /* ---- 回合鎖（2026-08-20 手感巡檢家族 A：回合沒有硬性 commit 鎖）----------------------
     * 【缺陷】舊版唯一的閘是 `playBtn.disabled`，而它①只鎖那一顆鈕（注額欄與三顆 chip 全程可改）
     *   ②只有本面板自己會設。於是**遊戲自己開的回合（5 款 slot 的「購買免費遊戲」鈕）面板完全不知道**
     *   ⇒ 買入動畫跑到一半點旋轉，第二局照樣開，兩局動畫演在同一個 board / badge / history 上。
     * 【修法】把「忙」變成面板的公開狀態：`lock(b)` 讓回合的**擁有者**（不論是誰）宣告忙碌，
     *   `isBusy()` 讓遊戲問「現在可不可以開局」。一個出口、一份真相；下注面板整組（鈕+欄+chip）一起鎖。
     * ⚠️ 刻意不鎖「手動/自動」頁籤與 autobet 參數欄——那些不影響已付款那一注的結算基準。 */
    /* ---- 併發回合（G7 · 2026-08-20 船長裁決前景實作）--------------------------------------
     * 【為什麼需要這個】有些遊戲的類型本質是 **fire-and-forget**：真實 Plinko 是「點一次投一顆、
     *   可連點讓十幾顆球同時在空中各自落下」——那正是這款遊戲的爽點。而本引擎預設是**單注輪次鎖**
     *   （一局跑完才准下一局），所以 Plinko 被做成「一顆飛完才能投下一顆」＝做錯了遊戲類型。
     * 【設計】`concurrent: true` 只由需要的遊戲宣告；其餘 12 款單注遊戲不宣告＝完全零回歸。
     *   併發模式下：不鎖 playBtn（那是重點）、每一注各自扣款/各自結算/各自進中央掛鉤，
     *   `inFlight` 到上限就忽略那一下（不吐 toast——連點時會刷爆畫面）。
     * ⚠️ 併發模式**刻意不鎖注額欄**：每一顆球在投出的當下就把自己的注額捕獲進 settle()，
     *   之後改注額只影響「下一顆」。這與家族 A（不准改「已付款那一注」的結算基準）不衝突——
     *   那條要防的是「同一注的基準被事後改掉」，這裡每一注的基準在投出瞬間就已固定。
     * ⚠️ 每一注**各自取一個 `HL.fair` nonce**（由遊戲的 playRound 自己抽），可驗證公平不因併發共用抽樣；
     *   `HL.rg` 限額閘也是逐注檢查（下方 onClick 與 autobet 的 step 各自 check）。 */
    var CONCURRENT_MAX = 12;               // 同時在空中的上限：真實 Plinko 也不是無限堆球，且避免無上限累積
    var concurrent = !!opts.concurrent;
    var inFlight = 0;

    function syncLock() {
      // 併發模式：在途回合不鎖面板（否則就回到「一次一顆」）；非併發模式沿用原本的整組鎖。
      var off = !!state.busy || state.running;
      playBtn.disabled = concurrent ? (state.running || inFlight >= CONCURRENT_MAX) : off;
      input.disabled = off;
      chips.forEach(function (c) { c.disabled = off; });
      // ⚠️ startBtn 只看 state.busy：自動執行中它的身分是「停止」，鎖住它就沒人能停下自動下注了。
      startBtn.disabled = !!state.busy;
      panel.classList.toggle("is-busy", off);        // 給 CSS 一個可見的鎖定掛點（無樣式時零影響）
      panel.classList.toggle("is-full", concurrent && inFlight >= CONCURRENT_MAX);
    }
    function setBusy(b) { state.busy = !!b; syncLock(); }
    function isBusy() { return !!(state.busy || state.running || (concurrent && inFlight >= CONCURRENT_MAX)); }

    // 投出一注：扣款 → 遊戲演出 → 結算。回傳 Promise（結算完成）。併發計數由本函式獨佔維護。
    function launch(bet, ctx) {
      inFlight++;
      if (!concurrent) state.busy = true;
      syncLock();
      return Promise.resolve(settle(bet, opts.playRound(bet, ctx))).then(function (s) {
        inFlight--;
        if (!concurrent) state.busy = false;
        syncLock();
        return s;
      });
    }

    var playBtn = el("button", { class: "ax-btn-primary", text: opts.playText || "下注", onClick: function () {
      if (isBusy()) return;
      var bet = readBet();
      if (bet > bal()) { HL.ui.toast("餘額不足（Demo）", "warn"); return; }
      if (HL.rg && !HL.rg.check(bet)) return;   // #67 負責任博弈：玩家自設限額/冷靜期（未設限時恆真＝零回歸）
      // 家族 C：手動路徑原本硬寫 turbo:false ⇒ 極速模式對「手動下注」結構上永遠無效，
      //   而 game-frame 的設定面板對玩家寫的是「跳過結果動畫（全遊戲生效）」＝承諾未實現。
      launch(bet, { turbo: fastMode() });
    } });
    manualWrap.appendChild(playBtn);

    var aCount = el("input", { type: "number", min: "0", value: "10", class: "ax-inst__num" });
    var aWin = el("input", { type: "number", min: "0", value: "0", class: "ax-inst__num" });
    var aLoss = el("input", { type: "number", min: "0", value: "0", class: "ax-inst__num" });
    var aTP = el("input", { type: "number", min: "0", value: "0", class: "ax-inst__num" });
    var aSL = el("input", { type: "number", min: "0", value: "0", class: "ax-inst__num" });
    var turbo = el("input", { type: "checkbox" });
    var startBtn = el("button", { class: "ax-btn-primary", text: "開始自動" });
    function field(label, node) { return el("label", { class: "ax-inst__field" }, [el("small", { class: "ax-muted", text: label }), node]); }
    autoWrap.appendChild(el("div", { class: "ax-inst__grid" }, [
      field("局數(0=∞)", aCount), field("贏後+%", aWin), field("輸後+%", aLoss), field("止盈", aTP), field("止損", aSL),
      el("label", { class: "ax-inst__field ax-inst__turbo" }, [el("small", { class: "ax-muted", text: "Turbo" }), turbo])
    ]));
    autoWrap.appendChild(startBtn);

    function stopAuto() { state.running = false; if (timer) { clearTimeout(timer); timer = null; } startBtn.textContent = "開始自動"; startBtn.classList.remove("is-stop"); syncLock(); }
    function startAuto() {
      base = readBet();
      var left = clampInt(aCount.value, 0, 1e9);
      var winPct = Math.max(0, +aWin.value || 0), lossPct = Math.max(0, +aLoss.value || 0);
      var tp = Math.max(0, +aTP.value || 0), sl = Math.max(0, +aSL.value || 0), profit = 0;
      state.running = true; startBtn.textContent = "停止"; startBtn.classList.add("is-stop"); syncLock();
      (function step() {
        if (!state.running) return;
        // 家族 B ②：離場自停。這一行必須排在扣款之前——放到 .then() 裡就已經扣掉一注了。
        if (!panel.isConnected) { stopAuto(); return; }
        var bet = state.bet;
        if (bet > bal()) { HL.ui.toast("餘額不足，自動停止", "warn"); stopAuto(); return; }
        if (HL.rg && !HL.rg.check(bet)) { stopAuto(); return; }   // #67：自動下注撞限額/冷靜期即停（否則會連撞數百次 toast）
        var iv = (turbo.checked || fastMode()) ? 110 : 470;
        function applyResult(b, s) {                 // 注額階梯 + 止盈止損（兩種模式共用同一份規則）
          if (!s) return;
          profit += s.net;
          state.bet = s.net >= 0
            ? (winPct ? Math.max(1, Math.round(b * (1 + winPct / 100))) : base)
            : (lossPct ? Math.max(1, Math.round(b * (1 + lossPct / 100))) : base);
          input.value = String(state.bet);
        }
        if (concurrent) {
          /* G7 併發模式（Plinko）：**不等上一顆球落地就排下一顆**——這才是這個類型的節奏
           * （球比投球間隔飛得久，所以畫面上自然會有好幾顆同時在落）。
           * 到上限只是「跳過這一拍」而不是停止：等球落地空出位置，下一拍就又投得出去。
           * 局數以「已投出」計（不是以落地計），否則到上限時計數會停住、玩家看不懂剩幾局。 */
          if (inFlight < CONCURRENT_MAX) {
            launch(bet, { turbo: turbo.checked || fastMode() }).then(function (s) {
              applyResult(bet, s);
              if (!state.running) return;
              if (tp && profit >= tp) { HL.ui.toast("已達止盈 +" + money(profit), "ok"); stopAuto(); return; }
              if (sl && -profit >= sl) { HL.ui.toast("已達止損 " + money(profit), "warn"); stopAuto(); return; }
            });
            if (left > 0 && --left === 0) { stopAuto(); return; }
          }
          timer = setTimeout(step, iv);
          return;
        }
        launch(bet, { turbo: turbo.checked || fastMode() }).then(function (s) {
          if (!state.running) return; // 動畫期間被停止
          if (!panel.isConnected) { stopAuto(); return; }   // 動畫期間被換頁
          applyResult(bet, s);
          if (left > 0 && --left === 0) { stopAuto(); return; }
          if (tp && profit >= tp) { HL.ui.toast("已達止盈 +" + money(profit), "ok"); stopAuto(); return; }
          if (sl && -profit >= sl) { HL.ui.toast("已達止損 " + money(profit), "warn"); stopAuto(); return; }
          timer = setTimeout(step, iv);
        });
      })();
    }
    startBtn.addEventListener("click", function () { state.running ? stopAuto() : startAuto(); });

    var panel = el("div", { class: "ax-inst__panel" }, [
      amountRow,
      el("div", { class: "ax-inst__tabs", role: "tablist" }, [tabM, tabA]),
      manualWrap, autoWrap, lastEl
    ]);
    var api = {
      node: panel, getBet: function () { return state.bet; }, stop: stopAuto,
      // 熱鍵動作（S2）：僅手動模式且非忙碌才觸發下注（isBusy 現在也涵蓋「遊戲自己開的回合」）
      pressPlay: function () { if (!isBusy() && manualWrap.style.display !== "none") playBtn.click(); },
      mulBet: function (f) { if (!isBusy()) writeBet(Math.max(1, Math.floor(state.bet * f))); },
      setMin: function () { if (!isBusy()) writeBet(1); },
      // 家族 A 的兩個新出口：回合的擁有者可以是遊戲自己（買入型入口），面板必須知道。
      lock: setBusy, isBusy: isBusy,
      // 家族 F（#45）：買入型入口自算派彩、繞過 settle() ⇒ 用這個把結果寫回「上一局」計分板（net = payout - bet）。
      setLast: function (bet, payout, label) { writeLast((payout || 0) - bet, label); },
      // G7：併發模式下遊戲可以問「現在空中有幾顆」（Plinko 用來決定要不要顯示「已達上限」）
      inFlight: function () { return inFlight; }, concurrentMax: CONCURRENT_MAX
    };
    hkPanel = api; // 最新掛載的面板成為熱鍵作用對象
    /* ⚠️ 踩過的雷（2026-08-20 preview 實測）：這裡**不可以**順手呼叫 stopAll(true) 汰除舊面板。
     *   betPanel() 回傳的當下 panel 還沒被掛進文件（view 的節點要等 render() 回傳後才 append），
     *   `isConnected` 是 false ⇒ 它會把「自己」從登記簿刪掉，登記簿恆空、層① 形同不存在，
     *   而畫面上一切正常（因為層② 的存活檢查會補上）＝**修了一半卻看不出來**。
     *   汰除交給 stopAll() 自己做——它在每次換頁都會被呼叫，成長本來就有界。 */
    livePanels.push(api);
    return api;
  }

  // 獨立「下注金額欄」(輸入 + ½ / 2× / Max)，給互動式遊戲(Crash/Mines)自帶回合流程時重用。
  function amountField(initial) {
    var input = el("input", { type: "number", min: "1", value: String(clampInt(initial || 50, 1, 9e9)), class: "ax-inst__bet", "aria-label": "下注金額" });
    function get() { return clampInt(input.value, 1, 9e9); }
    function set(v) { input.value = String(clampInt(v, 1, 9e9)); }    var node = el("div", { class: "ax-inst__row" }, [
      el("small", { class: "ax-muted", text: "下注金額" }),
      el("div", { class: "ax-inst__amt" }, [
        input,
        chip("½", function () { set(Math.max(1, Math.floor(get() / 2))); }),
        chip("2×", function () { set(get() * 2); }),
        chip("Max", function () { set(bal()); })
      ])
    ]);
    return { node: node, get: get, set: set, input: input };
  }

  // 共用數值動畫（count-up）：from→to，回傳 Promise（動畫完成 resolve）。easeOutCubic 預設。
  // 極速模式（S1）：ms 歸零＝所有走此函式的結果動畫直接跳到終值。
  function animate(from, to, ms, onFrame, easing) {
    if (fastMode()) ms = 0;
    easing = easing || function (p) { return 1 - Math.pow(1 - p, 3); };
    return new Promise(function (resolve) {
      if (ms <= 0) { onFrame(to, 1); resolve(to); return; }
      var start = null;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / ms);
        onFrame(from + (to - from) * easing(p), p);
        if (p < 1) requestAnimationFrame(frame); else resolve(to);
      }
      requestAnimationFrame(frame);
    });
  }

  HL.instant = {
    bal: bal, setBal: setBal, betPanel: betPanel, amountField: amountField, clampInt: clampInt, animate: animate,
    // 換頁時由殼層呼叫（家族 B ①）：停掉所有還在跑的 autobet 迴圈。
    // 不帶參數＝全停（換頁）；stopAll(true)＝只停已離開 DOM 的（清登記簿用）。
    stopAll: stopAll, livePanelCount: function () { return livePanels.length; }
  };
})(window);

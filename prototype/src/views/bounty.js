/*
 * Apex Win｜賞金局（玩家開房挑戰）
 * 翻牌（新版）：10 張卡依震盪配置「固定彩金」，總和 = 每次費用 × 10 / 翻牌數（RTP 100%）。
 *   流程：開始挑戰（扣費用）→ 逐一開卡（最多翻 K 張，開到彩金有動畫）→
 *         翻滿 K 張 → 其餘卡壓黑揭示 → 結算本次贏得 → 再挑戰 / 結束。
 * 踩地雷：避雷翻格累積倍數、可兌現（沿用）。
 * 次數用盡即整場結算，回報局主。註冊於 window.HL.views.bounty。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var rint = function (a, b) { return HL.mock.rint(a, b); };

  var room, bet, playEl, infoEl;
  // 翻牌狀態
  var fCards, fFlipped, fWin, fPhase;
  // 踩地雷狀態
  var mineActive, mineMult, mineBombs;
  /* 家族 stale-timer（#15）：本檔所有狀態皆模組全域（room/playEl/fCardEls…），且 6 處 setTimeout
   *   ＋兩條 RPC .then 都在「延遲後」才動這些全域。玩家中途離場 → render() 進新房會把 room/playEl/fCardEls
   *   重指到「下一間房」，殘留的揭示/結算回呼卻照舊 room.playsLeft-- / prizePool 改、往新房的 playEl 貼卡
   *   ⇒ 結算卡長進新房、新房次數與賞金池被扣、翻牌房被畫成踩地雷房（audit CONFIRMED·M）。
   *   正解＝epoch 世代閘（比照 sibling chicken.js:58 的 RPC 回呼閘）：render() 進場 epoch++、離場 onExit 亦 epoch++；
   *   每個 setTimeout/RPC.then 進場前 `var tk = epoch`、回呼首列 `if (tk !== epoch) return;`。
   *   ⚠️ epoch 同時閘 RPC .then 本體（非只計時器）——clearTimers 型防禦擋不住「離場後才 resolve 的 .then 直接改 room」。 */
  var epoch = 0;

  function findRoom(id) { return HL.state.get().arenaRooms.filter(function (r) { return r.id === id; })[0]; }
  // Phase 4b｜會員模式：賞金局開獎/餘額由伺服器 RPC 決定並原子結算（防作弊）。Demo 維持前端。
  function isMember() { return !!(HL.auth && HL.auth.isMember()); }
  function setBalance(v) { if (v != null) { HL.state.set({ balance: v }); HL.shell.refreshChrome(); var b = document.getElementById("ax-duel-balance"); if (b) b.textContent = money(v); } }

  function refreshInfo() {
    if (!infoEl) return;
    HL.dom.clear(infoEl);
    var V = HL.mock.volatility[room.vol], G = HL.mock.roomGames[room.game];
    var kv = room.game === "flip"
      ? [["局主", room.host.av + " " + room.host.name], ["遊戲", G.name], ["震盪", V.name], ["賞金池", money(room.prizePool)], ["每次費用", money(room.cost)], ["每次翻牌", room.flips + " / 10 張"], ["剩餘次數", room.playsLeft + " / " + room.plays]]
      : [["局主", room.host.av + " " + room.host.name], ["遊戲", G.name], ["震盪", V.name], ["賞金池", money(room.prizePool)], ["每次最高押注", money(room.maxBet)], ["最高倍數", room.maxMult + "x"], ["剩餘次數", room.playsLeft + " / " + room.plays]];
    kv.forEach(function (p) { infoEl.appendChild(HL.ui.kv(p[0], p[1], { row: true })); });
  }

  /* ===================== 翻牌（新版） ===================== */
  function flipChargeOK() {
    if (room.playsLeft <= 0) { HL.ui.toast("本場次數已用盡", "warn"); return false; }
    if (room.cost > HL.state.get().balance) { HL.ui.toast("餘額不足", "err"); return false; }
    return true;
  }
  var fHeadWin, fHeadCount, fBoard, fCardEls, fBusy = false;   // #65：翻牌開局的 RPC 在途旗標（防連點兩下送兩次 bounty_flip）
  function buildCard(c, i, active) {
    var node = el("div", { class: "ax-fcard" }, [
      el("div", { class: "ax-fcard__inner" }, [
        el("div", { class: "ax-fcard__front", text: "?" }),
        el("div", { class: "ax-fcard__back" }, [el("span", { class: "ax-fcard__amt" }), el("span", { class: "ax-fcard__miss" })])
      ])
    ]);
    if (active) { node.classList.add("is-active"); node.addEventListener("click", function () { pickCard(i, node); }); HL.dom.pressable(node); }
    return node;
  }
  function revealCardEl(node, c, picked) {
    node.classList.add("is-flipped"); node.classList.remove("is-active");
    node.classList.add(picked ? (c.prize > 0 ? "is-win" : "is-zero") : "is-dim");
    node.querySelector(".ax-fcard__amt").textContent = c.prize > 0 ? money(c.prize).replace("NT$ ", "") : "—";
    node.querySelector(".ax-fcard__miss").textContent = picked ? "" : "未選";
  }
  function flipHead() {
    fHeadWin = el("div", { class: "ax-fwin", text: money(fWin || 0) });
    fHeadCount = el("div", { class: "ax-fcount", text: fPhase === "playing" ? ("已翻 " + fFlipped + " / " + room.flips + " 張") : "每次可翻 " + room.flips + " 張" });
    return el("div", { class: "ax-fhead" }, [el("div", {}, [el("small", { class: "ax-muted", text: "本次累計贏得" }), fHeadWin]), fHeadCount]);
  }
  function renderIdle() {
    HL.dom.clear(playEl);
    fCards = null; fFlipped = 0; fWin = 0; fPhase = "idle";
    playEl.appendChild(flipHead());
    fBoard = el("div", { class: "ax-fboard" });
    for (var i = 0; i < 10; i++) fBoard.appendChild(buildCard({ prize: 0 }, i, false));
    playEl.appendChild(fBoard);
    var canStart = room.playsLeft > 0;
    playEl.appendChild(el("button", { class: "ax-btn-primary", text: canStart ? ("開始挑戰（押 " + money(room.cost) + "）") : "本場已結束", disabled: canStart ? null : "", onClick: startFlip }));
    playEl.appendChild(el("p", { class: "ax-muted", style: "text-align:center;margin-top:10px", text: "10 張卡含固定彩金，翻 " + room.flips + " 張；其餘將於結束後揭示。" }));
  }
  // 結果卡（client + server 共用）
  function flipResultCard(win) {
    return el("div", { class: "ax-fsettle ax-fade-in" }, [
      HL.ui.resultBlock(win >= room.cost, win >= room.cost ? "🎉 本次獲利！" : (win > 0 ? "本次小賺" : "本次槓龜"), "贏得 " + money(win),
        el("p", { class: "ax-muted", text: "押 " + money(room.cost) + " · 淨 " + (win - room.cost >= 0 ? "+" : "-") + money(Math.abs(win - room.cost)) + (isMember() ? " · 🔒 伺服器結算" : "") }),
        { share: { game: "賞金掃雷 Bounty" } }),
      el("div", { class: "ax-result__actions" }, [
        el("button", { class: "ax-btn-ghost", text: "結束離開", onClick: function () { HL.router.go("arena"); } }),
        room.playsLeft > 0
          ? el("button", { class: "ax-btn-primary", text: "再挑戰一次（押 " + money(room.cost) + "）", onClick: startFlip })
          : el("button", { class: "ax-btn-primary", text: "本場已結束", disabled: "" })
      ])
    ]);
  }
  // 會員：伺服器決定 10 張彩金 + 抽 flips 張並原子結算；前端自動揭示
  function startFlipServer() {
    fBusy = true;   // #65：開始挑戰鈕在 RPC 在途期間仍留在 DOM，不設旗標則連點＝兩次扣費 + 兩條揭示鏈互踩同一組模組全域（比照踩地雷 mineActive 閘）
    var tk = epoch; // #15：捕捉開局世代；離場後 resolve 的 .then 不得改 room/貼新房
    HL.api.playBountyFlip(room.cost, room.vol, room.flips).then(function (R) {
      if (tk !== epoch) return;   // #15：已離場（或換房）→ 這條 RPC 結果整段作廢（fBusy 由 render 重置）
      fBusy = false;   // 到達結果即解鎖（比照踩地雷 .then 首行 mineActive=false）；rpc() 失敗必解析為 null ⇒ 此行恆執行、不會鎖死
      if (!R || !R.prizes) { startFlipClient(); return; } // RPC 不可用 → 前端
      setBalance(R.balance);
      if (HL.liveStats) HL.liveStats.record("賞金局 · 翻牌", room.cost, +R.fWin); // 伺服器結算值
      fCards = R.prizes.map(function (v) { return { prize: +v, revealed: false, picked: false }; });
      fWin = +R.fWin; fFlipped = R.picked.length; fPhase = "revealing";
      HL.dom.clear(playEl);
      playEl.appendChild(flipHead());
      fBoard = el("div", { class: "ax-fboard" }); fCardEls = [];
      fCards.forEach(function (c, i) { var n = buildCard(c, i, false); fCardEls.push(n); fBoard.appendChild(n); });
      playEl.appendChild(fBoard);
      var pickedSet = {}, run = 0; R.picked.forEach(function (i) { pickedSet[i] = true; });
      R.picked.forEach(function (idx, k) {
        setTimeout(function () {
          if (tk !== epoch) return;   // #15：揭示鏈途中離場 → 不再往（現已屬新房的）fCardEls 貼卡
          fCards[idx].picked = true; revealCardEl(fCardEls[idx], fCards[idx], true);
          run += fCards[idx].prize; fHeadWin.textContent = money(run);
          fHeadWin.classList.remove("ax-pulse"); void fHeadWin.offsetWidth; fHeadWin.classList.add("ax-pulse");
          fHeadCount.textContent = "已翻 " + (k + 1) + " / " + room.flips + " 張";
        }, 250 + k * 320);
      });
      setTimeout(function () {
        if (tk !== epoch) return;   // #15：結算拍離場 → 不得對新房 room.playsLeft--/prizePool 動手、不貼結算卡
        fCards.forEach(function (c, i) { if (!pickedSet[i]) { c.revealed = true; revealCardEl(fCardEls[i], c, false); } });
        room.prizePool = Math.max(0, room.prizePool + room.cost - fWin);
        room.playsLeft--; room.done = (room.done || 0) + 1; room.challenges++;
        (room.log = room.log || []).push({ name: "你", bet: room.cost, win: fWin, flip: true });
        refreshInfo(); fPhase = "done";
        playEl.appendChild(flipResultCard(fWin));
      }, 250 + R.picked.length * 320 + 500);
    });
  }
  function startFlip() {
    if (fBusy) return;   // #65：RPC 在途鎖，杜絕連點兩下（第二次點擊在此早退）
    if (!flipChargeOK()) return;
    if (isMember()) return startFlipServer();
    return startFlipClient();
  }
  function startFlipClient() {
    HL.state.set({ balance: HL.state.get().balance - room.cost });
    room.prizePool += room.cost; // 局主收取費用
    HL.shell.refreshChrome();
    var poolPer = Math.round(room.cost * 10 / room.flips);
    fCards = HL.mock.flipPrizes(poolPer, room.vol).map(function (v) { return { prize: v, revealed: false, picked: false }; });
    fFlipped = 0; fWin = 0; fPhase = "playing";
    HL.dom.clear(playEl);
    playEl.appendChild(flipHead());
    fBoard = el("div", { class: "ax-fboard" }); fCardEls = [];
    fCards.forEach(function (c, i) { var n = buildCard(c, i, true); fCardEls.push(n); fBoard.appendChild(n); });
    playEl.appendChild(fBoard);
    playEl.appendChild(el("p", { class: "ax-muted", style: "text-align:center;margin-top:12px", text: "點選卡片開牌（開到 0 不扣不加）" }));
  }
  function pickCard(idx, node) {
    if (fPhase !== "playing" || fCards[idx].revealed || fFlipped >= room.flips) return;
    var c = fCards[idx]; c.revealed = true; c.picked = true; fFlipped++; fWin += c.prize;
    revealCardEl(node, c, true); // 只翻這一張，不重繪整桌（避免已開卡閃爍）
    fHeadWin.textContent = money(fWin); fHeadWin.classList.remove("ax-pulse"); void fHeadWin.offsetWidth; fHeadWin.classList.add("ax-pulse");
    fHeadCount.textContent = "已翻 " + fFlipped + " / " + room.flips + " 張";
    if (c.prize > 0) HL.ui.toast("開到 " + money(c.prize) + "！", "ok");
    if (fFlipped >= room.flips) {
      fPhase = "revealing";
      fCardEls.forEach(function (n) { n.classList.remove("is-active"); });
      var tk = epoch; setTimeout(function () { if (tk !== epoch) return; finishFlip(); }, 650);   // #15：離場後不得在新房跑 finishFlip（會改新房 room/餘額並貼結算卡）
    }
  }
  function finishFlip() {
    fCards.forEach(function (c, i) { if (!c.revealed) { c.revealed = true; revealCardEl(fCardEls[i], c, false); } });
    room.prizePool = Math.max(0, room.prizePool - fWin);
    HL.state.set({ balance: HL.state.get().balance + fWin });
    if (HL.liveStats) HL.liveStats.record("賞金局 · 翻牌", room.cost, fWin);
    room.playsLeft--; room.done = (room.done || 0) + 1; room.challenges++;
    var net = room.cost - fWin;
    if (net >= 0) room.hostEdge = (room.hostEdge || 0) + net; else room.challEdge = (room.challEdge || 0) + (-net);
    (room.log = room.log || []).push({ name: "你", bet: room.cost, win: fWin, flip: true });
    HL.shell.refreshChrome(); refreshInfo(); // 左側剩餘次數即時更新
    fPhase = "done";
    playEl.appendChild(el("div", { class: "ax-fsettle ax-fade-in" }, [
      HL.ui.resultBlock(fWin >= room.cost, fWin >= room.cost ? "🎉 本次獲利！" : (fWin > 0 ? "本次小賺" : "本次槓龜"), "贏得 " + money(fWin),
        el("p", { class: "ax-muted", text: "押 " + money(room.cost) + " · 淨 " + (fWin - room.cost >= 0 ? "+" : "-") + money(Math.abs(fWin - room.cost)) }),
        { share: { game: "賞金掃雷 Bounty" } }),
      el("div", { class: "ax-result__actions" }, [
        el("button", { class: "ax-btn-ghost", text: "結束離開", onClick: function () { HL.router.go("arena"); } }),
        room.playsLeft > 0
          ? el("button", { class: "ax-btn-primary", text: "再挑戰一次（押 " + money(room.cost) + "）", onClick: startFlip })
          : el("button", { class: "ax-btn-primary", text: "本場已結束", disabled: "" })
      ])
    ]));
  }
  function renderFlip() { renderIdle(); }

  /* ===================== 踩地雷（沿用） ===================== */
  function chargeOK() {
    if (room.playsLeft <= 0) { HL.ui.toast("本場次數已用盡", "warn"); return false; }
    if (bet > HL.state.get().balance) { HL.ui.toast("餘額不足", "err"); return false; }
    if (HL.rg && !HL.rg.check(bet)) return false;   // #86：賞金局自扣餘額(afterPlay)、未走 betPanel ⇒ 需自帶閘；未設限時恆真＝零回歸
    return true;
  }
  function afterPlay(win) {
    var st = HL.state.get();
    HL.state.set({ balance: st.balance - bet + win });
    if (HL.liveStats) HL.liveStats.record("賞金局 · 踩地雷", bet, win);
    room.prizePool = Math.max(0, room.prizePool + bet - win);
    room.playsLeft--; room.done = (room.done || 0) + 1; room.challenges++;
    var net = bet - win;
    if (net >= 0) room.hostEdge = (room.hostEdge || 0) + net; else room.challEdge = (room.challEdge || 0) + (-net);
    HL.shell.refreshChrome(); refreshInfo();
  }
  function renderMine() {
    HL.dom.clear(playEl);
    mineActive = false; mineMult = 0;
    mineBombs = room.vol === "high" ? 4 : room.vol === "mid" ? 3 : 2;
    var step = mineBombs * 0.4 + 0.2, TILES = 12;
    var safeFlipped = 0, safeTotal = TILES - mineBombs;   // #37：全安全格翻完＝回合封頂終局，需自動兌現（對照 instant-crash-mines.js:170 safeCount===N-mines⇒cashOut）
    var statusEl = el("div", { class: "ax-mine__status", text: "按「開始挑戰」翻格累積倍數，踩雷則輸；隨時可兌現。" });
    var multEl = el("b", { class: "ax-gold", text: "x0.00" });
    var grid = el("div", { class: "ax-mine-grid" });
    function layout() {
      HL.dom.clear(grid);
      var bombSet = {}; while (Object.keys(bombSet).length < mineBombs) bombSet[rint(0, TILES - 1)] = true;
      for (var k = 0; k < TILES; k++) (function (idx) {
        var bomb = !!bombSet[idx];
        var tile = el("button", { class: "ax-mine" }, [el("span", { text: "?" })]);
        tile.addEventListener("click", function () {
          if (!mineActive || tile.classList.contains("done")) return;
          tile.classList.add("done");
          if (bomb) {
            tile.classList.add("is-bomb"); HL.dom.clear(tile); tile.appendChild(el("span", { text: "💣" }));
            mineActive = false; statusEl.textContent = "踩到地雷！本注輸掉。";
            HL.ui.toast("踩雷，輸掉 " + money(bet), "err"); afterPlay(0);
            var tk = epoch; setTimeout(function () { if (tk !== epoch) return; if (room.playsLeft > 0) renderMine(); }, 1100);   // #15：離場後不得在新房重繪雷盤
          } else {
            tile.classList.add("is-gem"); HL.dom.clear(tile); tile.appendChild(el("span", { text: "💎" }));
            mineMult += step; multEl.textContent = "x" + mineMult.toFixed(2);
            safeFlipped++;
            if (safeFlipped >= safeTotal) cashNow(true);   // #37：全部安全格翻完＝已達本局上限 ⇒ 自動兌現＋鎖盤（不再引導玩家去踩剩下的雷）
          }
        });
        grid.appendChild(tile);
      })(k);
    }
    layout();
    var over = room.playsLeft <= 0;
    var startBtn = el("button", { class: "ax-btn-primary", text: over ? "本場已結束" : "開始挑戰（押 " + money(bet) + "）", disabled: over ? "" : null });
    var cashBtn = el("button", { class: "ax-btn-ghost", text: "兌現", disabled: "" });
    startBtn.addEventListener("click", function () {
      if (mineActive) return; if (!chargeOK()) return;
      if (isMember()) { // 會員：伺服器一次決定出局/兌現倍數並原子結算
        mineActive = true; statusEl.textContent = "開獎中…";
        var tk = epoch;   // #15：捕捉世代；離場後 resolve 的 mine RPC 不得改 room/重繪
        HL.api.playBountyMine(bet, room.maxMult, room.vol).then(function (R) {
          if (tk !== epoch) return;   // #15：已離場（或換房）→ 這條 RPC 結果整段作廢（mineActive 由新 renderMine 重置）
          mineActive = false;
          if (!R) { statusEl.textContent = "伺服器忙線，請再試一次。"; return; }
          setBalance(R.balance);
          if (HL.liveStats) HL.liveStats.record("賞金局 · 踩地雷", bet, +R.win); // 伺服器結算值
          statusEl.textContent = R.bust ? "💣 踩到地雷！本注輸掉。" : ("💎 兌現 x" + (+R.mult).toFixed(2) + " · 獲得 " + money(R.win) + "（🔒 伺服器結算）");
          multEl.textContent = "x" + (+R.mult).toFixed(2);
          room.prizePool = Math.max(0, room.prizePool + bet - (+R.win)); room.playsLeft--; room.done = (room.done || 0) + 1; room.challenges++;
          (room.log = room.log || []).push({ name: "你", bet: bet, win: +R.win, mult: +R.mult });
          refreshInfo();
          HL.ui.toast(R.bust ? "踩雷，輸掉 " + money(bet) : "兌現獲得 " + money(R.win), R.bust ? "err" : "ok");
          setTimeout(function () { if (tk !== epoch) return; if (room.playsLeft > 0) renderMine(); }, 1500);   // #15
        });
        return;
      }
      mineActive = true; mineMult = 0; multEl.textContent = "x0.00"; cashBtn.removeAttribute("disabled");
      statusEl.textContent = "翻開格子；💎 累積倍數，💣 出局。地雷數：" + mineBombs; layout();
    });
    function cashNow(auto) {   // #37：兌現單一出口，手動鈕與「全安全格翻完」自動終局共用（不得兩處各寫一份結算）
      if (!mineActive) return;
      if (mineMult <= 0) { if (!auto) HL.ui.toast("至少翻一格再兌現", "warn"); return; }   // #14：0 格兌現＝x0.00 直接輸整注並吃掉一次挑戰次數，比照 Mines(instant-crash-mines.js safeCount===0)的守衛。mineMult 由每顆💎加正的 step 累積、開局為 0 ⇒ ===0 即零翻牌。auto 終局不會 mineMult<=0（至少翻滿全部安全格）故僅守手動
      mineActive = false; cashBtn.setAttribute("disabled", "");   // 鎖盤：mineActive=false 後剩餘格 tile click 守衛即擋下，玩家不會再踩到雷
      var mult = Math.min(mineMult, room.maxMult), win = Math.round(bet * mult);
      statusEl.textContent = (auto ? "全部安全格已翻開，自動兌現 x" : "兌現 x") + mult.toFixed(2) + "，獲得 " + money(win);
      HL.ui.toast((auto ? "全部翻開！自動兌現 " : "兌現獲得 ") + money(win), win > 0 ? "ok" : "warn"); afterPlay(win);
      var tk = epoch; setTimeout(function () { if (tk !== epoch) return; if (room.playsLeft > 0) renderMine(); }, auto ? 1500 : 1100);   // #15
    }
    cashBtn.addEventListener("click", function () { cashNow(false); });
    playEl.appendChild(el("div", { class: "ax-mine__bar" }, [statusEl, el("div", {}, ["目前倍數 ", multEl])]));
    playEl.appendChild(grid);
    playEl.appendChild(el("div", { class: "ax-mine__btns" }, [startBtn, cashBtn]));
  }
  function mineStakeBar() {
    var opts = [10, 50, 100, 500].filter(function (v) { return v <= room.maxBet; });
    if (!opts.length) opts = [room.maxBet];
    bet = opts[Math.min(1, opts.length - 1)];
    // U17：單選押注額群改走 HL.ui.segmented（保留 ax-stakes/ax-stake/is-picked 外觀＋補 aria-pressed）
    var wrap = HL.ui.segmented(opts.map(function (v) { return { v: v, t: String(v) }; }), bet, function (v) { bet = v; }, { cls: "ax-stakes", btnCls: "ax-stake", activeCls: "is-picked" });
    return el("div", { class: "ax-room-stake" }, [el("div", { class: "ax-muted", text: "選擇押注額" }), wrap]);
  }

  /* ===================== 進入點 ===================== */
  function render(roomId) {
    if (HL.gameFrame && HL.gameFrame.resumeFrame) { var resumed = HL.gameFrame.resumeFrame("bounty:" + roomId); if (resumed) return resumed; }
    // #15：新的一次掛載＝新世代，作廢上一房殘留的計時器/RPC 回呼（resumeFrame 續接原場故不在此路徑）。
    epoch++; fBusy = false;
    // 離場鉤：底部導覽／側邊抽屜換頁走 mountView（不經 view 內返回連結）⇒ 也 epoch++ 使殘留回呼失效（比照 vsslot onExit）。
    if (HL.shell && HL.shell.onExit) HL.shell.onExit(function () { epoch++; });
    room = findRoom(roomId);
    if (!room) {
      return el("div", { class: "ax-duel" }, [HL.dom.linkable(el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } })), el("div", { class: "ax-panel", text: "此房間已結束。" })]);
    }
    infoEl = el("div", { class: "ax-room-info" });
    playEl = el("div", { class: "ax-room-play" });
    refreshInfo();

    var leftCol;
    if (room.game === "flip") { fCards = null; fPhase = "idle"; fFlipped = 0; fWin = 0; leftCol = el("div", {}, [infoEl]); }
    else { leftCol = el("div", {}, [infoEl, mineStakeBar()]); }

    var node = el("div", { class: "ax-duel ax-fade-in" }, [
      HL.dom.linkable(el("a", { class: "ax-duel__back", text: "‹ 返回競技場", onClick: function () { HL.router.go("arena"); } })),
      el("div", { class: "ax-duel__top" }, [
        el("div", {}, [el("div", { class: "ax-duel__title", text: "賞金局 · " + HL.mock.roomGames[room.game].name }), HL.ui.gameInfoBar({ rtp: HL.gameRtp.of("bounty") })]),
        el("div", { class: "ax-stat" }, [el("small", { text: "你的餘額" }), el("b", { id: "ax-duel-balance", text: money(HL.state.get().balance) })])
      ]),
      el("div", { class: "ax-room-detail" }, [leftCol, el("div", { class: "ax-arena" }, [playEl])])
    ]);
    room.game === "flip" ? renderFlip() : renderMine();
    // 套入遊戲外框公版（全螢幕/劇院/子母畫面）
    return HL.gameFrame ? HL.gameFrame.wrap(node, { title: "賞金局 · " + HL.mock.roomGames[room.game].name, provider: "Apex Arena", key: "bounty:" + roomId, maxWidth: "1100px" }) : node;
  }

  HL.views = HL.views || {};
  HL.views.bounty = { render: render };
})(window);

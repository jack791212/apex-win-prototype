/*
 * Slot Engine POC · Spin — 遊戲入口
 * 流程：HL Bridge 握手 → 建 PixiJS 舞台 → 載入 Spine（spine-pixi）→ 解鎖 SPIN
 *       SPIN：bet:place（平台扣款）→ 逐軸停輪 → 算分 → bet:settle（平台派彩）
 */
(function (global) {
  "use strict";

  var GAME_ID = "slot-engine-poc-spin";
  var GAME_VERSION = "0.1.0";
  var DESIGN_W = 960, DESIGN_H = 540;

  var PIXI = global.PIXI;
  var M = global.PocMath;
  var Bridge = global.HLBridge;

  var $ = function (id) { return document.getElementById(id); };
  var stageEl = $("stage"), bootEl = $("boot");
  var balEl = $("bal"), coinNameEl = $("coinName"), betsEl = $("bets"), msgEl = $("msg"), spinBtn = $("spin"), fsBtn = $("fs");

  var app = null, board = null, coin = null, scene = null;
  var lastWinTxt = null, statusTxt = null;
  var bet = 50, limits = { minBet: 10, maxBet: 500, steps: [10, 50, 100, 500] };
  var balance = 0, busy = false, betSeq = 0, playable = false;
  var lastBet = null; // { betId, amount, win }：供 POC 驗證幂等重送用

  // ---------- HUD ----------
  function msg(text, cls) { msgEl.textContent = text; msgEl.className = cls || "idle"; }
  function setBalance(v) {
    if (typeof v !== "number") return;
    balance = v;
    balEl.textContent = v.toLocaleString("en-US");
    if (statusTxt) statusTxt.text = "餘額 " + v.toLocaleString("en-US");
    syncChips();
  }
  function syncChips() {
    Array.prototype.forEach.call(betsEl.children, function (b) {
      b.classList.toggle("on", Number(b.dataset.v) === bet);
      b.disabled = busy || !playable;
    });
    spinBtn.disabled = busy || !playable;
    fsBtn.disabled = !playable;
  }
  function buildChips() {
    betsEl.innerHTML = "";
    limits.steps.forEach(function (v) {
      var b = document.createElement("button");
      b.className = "chip"; b.textContent = String(v); b.dataset.v = String(v);
      b.addEventListener("click", function () { if (busy) return; bet = v; syncChips(); });
      betsEl.appendChild(b);
    });
    if (limits.steps.indexOf(bet) < 0) bet = limits.steps[0];
    syncChips();
  }

  // ---------- 舞台 ----------
  function fit() {
    if (!app || !scene) return;
    var w = app.screen.width, h = app.screen.height;
    var s = Math.min(w / DESIGN_W, h / DESIGN_H);
    scene.scale.set(s);
    scene.x = (w - DESIGN_W * s) / 2;
    scene.y = (h - DESIGN_H * s) / 2;
  }

  function label(text, size, color, weight) {
    return new PIXI.Text({ text: text, style: { fontFamily: "Noto Sans TC, Microsoft JhengHei, sans-serif", fontSize: size, fontWeight: weight || "700", fill: color, align: "center" } });
  }

  async function buildStage() {
    app = new PIXI.Application();
    await app.init({
      background: 0x0a0913,
      antialias: true,
      resolution: global.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: stageEl,
      hello: true // console 印出 PixiJS 版本（POC 驗證證據）
    });
    stageEl.appendChild(app.canvas);
    if (bootEl) bootEl.remove();

    scene = new PIXI.Container();
    app.stage.addChild(scene);

    // 背景
    var bgLayer = new PIXI.Graphics();
    bgLayer.rect(0, 0, DESIGN_W, DESIGN_H).fill({ color: 0x0c0b1a });
    bgLayer.roundRect(16, 16, DESIGN_W - 32, DESIGN_H - 32, 20).stroke({ width: 1, color: 0x272348 });
    scene.addChild(bgLayer);

    // 標題
    var t1 = label("SLOT ENGINE · POC SPIN", 22, 0xffd76a, "900");
    t1.anchor.set(0.5, 0); t1.x = DESIGN_W / 2; t1.y = 30; scene.addChild(t1);
    var t2 = label("PixiJS v" + PIXI.VERSION + "　·　spine-pixi runtime　·　iframe + HL Bridge v1", 13, 0x9a94c4, "400");
    t2.anchor.set(0.5, 0); t2.x = DESIGN_W / 2; t2.y = 60; scene.addChild(t2);

    // 盤面 3×5
    board = global.PocReels.create(app);
    board.container.x = (DESIGN_W - board.width) / 2;   // 218
    board.container.y = 104;
    scene.addChild(board.container);

    // 左側：Spine 掛點
    var spineHost = new PIXI.Container();
    spineHost.x = 109; spineHost.y = 250;
    scene.addChild(spineHost);
    var spineLbl = label("Spine 動畫元素", 12, 0x6ad7ff, "700");
    spineLbl.anchor.set(0.5); spineLbl.x = 109; spineLbl.y = 372; scene.addChild(spineLbl);

    // 右側：狀態
    statusTxt = label("餘額 --", 15, 0xe9e6ff, "800");
    statusTxt.anchor.set(0.5); statusTxt.x = 851; statusTxt.y = 214; scene.addChild(statusTxt);
    lastWinTxt = label("尚未開始", 14, 0x9a94c4, "700");
    lastWinTxt.anchor.set(0.5); lastWinTxt.x = 851; lastWinTxt.y = 252; scene.addChild(lastWinTxt);
    var linesTxt = label("5 條固定線\n中 / 上 / 下 / ∨ / ∧", 12, 0x9a94c4, "400");
    linesTxt.anchor.set(0.5); linesTxt.x = 851; linesTxt.y = 306; scene.addChild(linesTxt);

    // 底部賠付摘要
    var pay = M.SYMBOLS.map(function (s) { return s.glyph + "×5=" + s.pay[5] + "x"; }).join("　·　");
    var t3 = label(pay + "　（× 單線注 = 總注 / 5）", 12, 0x8f89b8, "400");
    t3.anchor.set(0.5); t3.x = DESIGN_W / 2; t3.y = 458; scene.addChild(t3);

    app.renderer.on("resize", fit);
    fit();
    return spineHost;
  }

  // ---------- Spine ----------
  async function loadSpine(host) {
    var spine = global.spine;
    if (!spine || !spine.Spine) throw new Error("spine-pixi runtime 未載入");
    PIXI.Assets.add({ alias: "coinData", src: "./assets/spine/coin-pro.json" });
    PIXI.Assets.add({ alias: "coinAtlas", src: "./assets/spine/coin-pma.atlas" });
    await PIXI.Assets.load(["coinData", "coinAtlas"]);
    // darkTint：coin 骨架的 shine slot 用 two-color tint（JSON 的 rgba2 timeline），關閉會整體泛白
    coin = new spine.Spine({ skeleton: "coinData", atlas: "coinAtlas", scale: 0.5, darkTint: true });
    coin.state.data.defaultMix = 0.15;
    coin.state.setAnimation(0, "animation", true); // coin 骨架唯一動畫
    host.addChild(coin);
    return coin;
  }

  // ---------- SPIN ----------
  async function doSpin() {
    if (busy || !playable) return;
    busy = true; syncChips();
    board.clearWin();
    var betId = "b" + (++betSeq) + "-" + Date.now().toString(36);
    msg("下注 " + bet + " 送出中…", "idle");

    var res = await Bridge.placeBet(betId, bet);
    if (!res.ok) {                       // 契約：扣款未成功一律不得轉輪
      msg(rejectText(res), "bad");
      busy = false; syncChips();
      return;
    }
    setBalance(res.balance);
    msg("轉輪中…", "idle");

    var grid = M.spinGrid();
    var ev = M.evaluate(grid, bet);
    await board.spin(grid);

    if (ev.win > 0) {
      board.showWin(ev.hits);
      if (coin) { coin.state.timeScale = 2.4; setTimeout(function () { if (coin) coin.state.timeScale = 1; }, 1800); }
    }

    lastBet = { betId: betId, amount: bet, win: ev.win };
    var detail = ev.hits.map(function (h) { return h.lineName + " " + h.key + "×" + h.count; }).join("；");
    var st = await Bridge.settle(betId, ev.win, detail || "無中獎線");
    if (st.ok) {
      setBalance(st.balance);
      msg(ev.win > 0 ? "🎉 中獎 +" + ev.win + "　" + detail : "未中獎，再來一次", ev.win > 0 ? "win" : "idle");
      lastWinTxt.text = ev.win > 0 ? "上次贏分 +" + ev.win : "上次未中獎";
      lastWinTxt.style.fill = ev.win > 0 ? 0x3ddc97 : 0x9a94c4;
    } else {
      msg("派彩失敗（" + st.code + "）：" + st.message, "bad");
      Bridge.reportError(st.code, "settle 失敗 betId=" + betId);
      playable = false;                 // 契約 4：settle 重試耗盡 → 停用下注
    }
    busy = false; syncChips();
  }

  function rejectText(res) {
    switch (res.code) {
      case "INSUFFICIENT_FUNDS": return "餘額不足，無法下注（未扣款）";
      case "BET_OUT_OF_RANGE":   return "下注超出平台限額（未扣款）";
      case "BET_IN_PROGRESS":    return "上一注尚未結算";
      case "TIMEOUT":            return "下注逾時，未扣款，請重試";
      default:                   return "下注被拒：" + (res.message || res.code);
    }
  }

  // ---------- 啟動 ----------
  async function boot() {
    if (!Bridge) { if (bootEl) bootEl.textContent = "HL Bridge 未載入"; return; }

    Bridge.on("balance:changed", function (d) {
      setBalance(d.balance);
      if (!busy) msg("平台餘額更新（" + (d.reason || "platform") + "）：" + d.balance.toLocaleString("en-US"), "idle");
    });
    Bridge.on("fatal", function (d) { playable = false; syncChips(); msg("協定不相容：" + d.message, "bad"); });

    // 1) 握手
    var init = await Bridge.handshake({ gameId: GAME_ID, gameVersion: GAME_VERSION, bridge: 1, wants: ["fullscreen"] });
    if (!init) { msg("無法連上平台（握手逾時）", "bad"); if (bootEl) bootEl.textContent = "無法連上平台：HL Bridge 握手逾時"; return; }
    if (init.limits) limits = init.limits;
    if (init.currency && init.currency.name) coinNameEl.textContent = init.currency.name;
    setBalance(init.balance);
    buildChips();
    msg("已連上平台（session " + init.sessionId + "）", "idle");

    // 2) 舞台 + Spine
    try {
      var host = await buildStage();
      setBalance(balance); // 舞台建好後補寫右側餘額文字（握手時 statusTxt 還不存在）
      await loadSpine(host);
    } catch (e) {
      if (global.console) console.error("[POC] 舞台建立失敗", e);
      Bridge.reportError("STAGE_FAILED", e && e.message);
      msg("渲染初始化失敗：" + (e && e.message), "bad");
      return;
    }

    // 3) 解鎖
    playable = true;
    syncChips();

    // POC 驗證用把手（給大腦／自動化重跑檢查 Spine 是否在播、程式化觸發 spin）
    global.POC = {
      app: function () { return app; },
      coin: function () { return coin; },
      board: function () { return board; },
      spin: doSpin,
      lastBet: function () { return lastBet; },
      bridge: Bridge,
      setBet: function (v) { if (limits.steps.indexOf(v) >= 0) { bet = v; syncChips(); } return bet; },
      state: function () {
        return {
          pixi: PIXI.VERSION, renderer: app.renderer.type,
          spineLoaded: !!coin,
          spineAnimation: coin ? (coin.state.tracks[0] && coin.state.tracks[0].animation.name) : null,
          spineTrackTime: coin && coin.state.tracks[0] ? coin.state.tracks[0].trackTime : null,
          balance: balance, bet: bet, busy: busy, playable: playable, msg: msgEl.textContent
        };
      }
    };
    msg("按 SPIN 開始（下注會即時反映到平台餘額）", "idle");

    spinBtn.addEventListener("click", doSpin);
    fsBtn.addEventListener("click", async function () {
      var r = await Bridge.fullscreen(!fsBtn.dataset.on);
      fsBtn.dataset.on = r.fullscreen ? "1" : "";
      if (!r.ok) msg("平台拒絕全螢幕請求（" + (r.code || "?") + "）", "bad");
    });
    document.addEventListener("keydown", function (e) { if (e.code === "Space") { e.preventDefault(); doSpin(); } });
  }

  boot();
})(window);

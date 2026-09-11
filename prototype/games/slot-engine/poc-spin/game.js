/*
 * Slot Engine｜POC Spin — 平台側 stub（HL Bridge v1 平台端實作）
 *
 * 這支檔案是「輕量 stub」：本身不含任何玩法，只做四件事
 *   1. HL.games.register() 自我上架（走平台既有放置區 SOP，不改任何核心檔）
 *   2. render() 時建立 iframe 載入遊戲本體 app/index.html（D-005：遊戲端 iframe 殼）
 *   3. 實作 HL Bridge v1 的「平台側」：握手、餘額讀寫、下注扣款、派彩、全螢幕
 *   4. 把 Bridge 往來訊息列在畫面上（POC 驗證用證據面板）
 *
 * 契約文件：Slot Engine 專案 engine/docs/hl-bridge-v1.md
 * 餘額唯一真相＝平台 HL.state.balance；遊戲側只能「請求」，不自行加減。
 */
(function (global) {
  "use strict";
  var HL = global.HL;
  if (!HL || !HL.games) return; // 平台未就緒則略過

  var el = HL.dom.el;
  var money = HL.dom.money;

  // ---------- 常數 ----------
  var GAME_ID = "slot-engine-poc-spin";
  var GAME_TITLE = "Slot Engine POC · Spin";
  var APP_URL = "./games/slot-engine/poc-spin/app/index.html";
  var CH = "hl-bridge";     // HL Bridge 通道標記
  var PROTOCOL = 1;         // HL Bridge 主版本
  var LIMITS = { minBet: 10, maxBet: 500, steps: [10, 50, 100, 500] };
  var LOG_MAX = 14;

  var session = null; // 當前 iframe session（同時只有一個）
  var seq = 0;
  var listening = false;

  // ---------- 平台錢包（Demo：直接改 HL.state；未來接後端 API 見契約 S5）----------
  function bal() { return HL.state.get().balance; }
  function setBal(v, reason) {
    if (session) session.reason = reason || "platform";
    HL.state.set({ balance: Math.max(0, Math.round(v)) });
    if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome();
  }
  function currency() {
    var st = HL.state.get();
    var code = (HL.money && HL.money.isCasual && HL.money.isCasual()) ? "COIN" : (st.currency || "TWD");
    var name = (HL.money && HL.money.coinName) ? HL.money.coinName() : "遊戲幣";
    return { code: code, name: name };
  }

  // ---------- origin / 來源驗證（契約第 6 節）----------
  // 本階段同源：targetOrigin 用 location.origin；file:// 下 origin 為 "null" → 退回 "*"（僅本機開發）
  function targetOrigin() {
    var o = global.location.origin;
    return (!o || o === "null") ? "*" : o;
  }
  function originOk(origin) {
    var o = global.location.origin;
    if (!o || o === "null") return true; // file://：origin 不可用，只能靠 event.source 驗證
    return origin === o || origin === "null";
  }

  // ---------- 訊息收發 ----------
  function isInt(n) { return typeof n === "number" && isFinite(n) && Math.floor(n) === n; }

  function send(type, data, re) {
    if (!session || !session.iframe) return;
    var win = null;
    try { win = session.iframe.contentWindow; } catch (e) { return; }
    if (!win) return;
    var msg = { ch: CH, v: PROTOCOL, type: type, id: "p" + (++seq), data: data || {} };
    if (re) msg.re = re;
    try { win.postMessage(msg, targetOrigin()); } catch (e) { return; }
    log("→ " + type, data);
  }

  function onMessage(e) {
    if (!session || !session.iframe) return;
    var win = null;
    try { win = session.iframe.contentWindow; } catch (err) { return; }
    if (!win || e.source !== win) return;      // ① 來源視窗驗證
    if (!originOk(e.origin)) return;           // ② origin 驗證
    var m = e.data;
    if (!m || typeof m !== "object" || m.ch !== CH) return; // ③ 通道標記（不符者靜默丟棄）
    if (m.v !== PROTOCOL) { send("error", { code: "PROTOCOL_MISMATCH", message: "HL Bridge 僅支援 v" + PROTOCOL }, m.id); return; }
    log("← " + m.type, m.data);
    handle(m);
  }

  function handle(m) {
    var d = m.data || {};
    switch (m.type) {
      case "game:ready":       return onReady(m, d);
      case "balance:get":      return send("balance:value", { balance: bal(), currency: currency() }, m.id);
      case "bet:place":        return onPlace(m, d);
      case "bet:settle":       return onSettle(m, d);
      case "frame:fullscreen": return onFullscreen(m, d);
      case "game:error":
        if (global.console) console.warn("[Slot Engine POC] 遊戲側錯誤：", d);
        return;
      default:
        return send("error", { code: "UNKNOWN_TYPE", message: "未知訊息型別：" + m.type }, m.id);
    }
  }

  function onReady(m, d) {
    session.ready = true;
    session.gameVersion = d.gameVersion || "?";
    setStatus("已握手 · 遊戲 v" + session.gameVersion);
    send("platform:init", {
      sessionId: session.id,
      protocol: PROTOCOL,
      balance: bal(),
      currency: currency(),
      limits: LIMITS,
      mode: (HL.money && HL.money.mode) ? HL.money.mode() : "casual",
      locale: "zh-Hant",
      features: { fullscreen: true }
    }, m.id);
  }

  function onPlace(m, d) {
    if (!session.ready) return send("error", { code: "NOT_INITIALIZED", message: "尚未完成握手" }, m.id);
    if (typeof d.betId !== "string" || !d.betId || !isInt(d.amount) || d.amount <= 0) {
      return send("error", { code: "BAD_ENVELOPE", message: "bet:place 需要 betId(string) 與 amount(正整數)" }, m.id);
    }
    if (session.openBet) return send("bet:rejected", { betId: d.betId, code: "BET_IN_PROGRESS", message: "上一注尚未結算" }, m.id);
    if (session.bets[d.betId]) return send("bet:rejected", { betId: d.betId, code: "DUPLICATE_BET", message: "betId 重複" }, m.id);
    if (d.amount < LIMITS.minBet || d.amount > LIMITS.maxBet) {
      return send("bet:rejected", { betId: d.betId, code: "BET_OUT_OF_RANGE", message: "下注須在 " + LIMITS.minBet + "～" + LIMITS.maxBet }, m.id);
    }
    if (bal() < d.amount) {
      if (HL.ui && HL.ui.toast) HL.ui.toast("餘額不足（Demo）", "warn");
      return send("bet:rejected", { betId: d.betId, code: "INSUFFICIENT_FUNDS", message: "餘額不足" }, m.id);
    }
    setBal(bal() - d.amount, "bet");
    session.bets[d.betId] = { amount: d.amount, settled: false, win: 0, balanceAfter: bal() };
    session.openBet = d.betId;
    session.spins++;
    syncPanel();
    send("bet:accepted", { betId: d.betId, amount: d.amount, balance: bal() }, m.id);
  }

  function onSettle(m, d) {
    if (!session.ready) return send("error", { code: "NOT_INITIALIZED", message: "尚未完成握手" }, m.id);
    if (typeof d.betId !== "string" || !session.bets[d.betId]) {
      return send("error", { code: "UNKNOWN_BET", message: "查無此注：" + d.betId }, m.id);
    }
    var rec = session.bets[d.betId];
    if (rec.settled) { // 幂等：重送同一 betId 不再加錢，回上次結果（契約 5-4）
      return send("bet:settled", { betId: d.betId, win: rec.win, balance: rec.balanceAfter }, m.id);
    }
    if (!isInt(d.win) || d.win < 0) {
      return send("error", { code: "BAD_ENVELOPE", message: "bet:settle 的 win 需為非負整數" }, m.id);
    }
    if (d.win > 0) setBal(bal() + d.win, "settle");
    rec.settled = true; rec.win = d.win; rec.balanceAfter = bal();
    // ⭐ 必做（#180）：沙箱橋接就是這條路徑的錢包權威，所以回報結算也該在這裡做一次
    //    ——放在冪等早退之後，重送同一 betId 不會重複回報。少了它，沙箱遊戲的每一注
    //    對 record() 下游 21 個子系統（含營運帳本／注單／玩家自設限額）都不存在。
    if (HL.liveStats) HL.liveStats.record(GAME_ID, rec.amount, d.win);
    session.openBet = null;
    session.wagered += rec.amount; session.won += d.win;
    if (d.win > 0 && HL.ui && HL.ui.toast) HL.ui.toast("Slot Engine POC 中獎 +" + money(d.win) + "（Demo）", "ok");
    syncPanel();
    send("bet:settled", { betId: d.betId, win: d.win, balance: bal() }, m.id);
  }

  // 全螢幕：不自行實作外框行為，改「按下 gameFrame 公版的 ⛶ 按鈕」——重用平台既有邏輯，零改動
  function onFullscreen(m, d) {
    var frame = session.frame;
    var btn = frame ? frame.querySelector('.ax-gframe__bar [title="全螢幕"]') : null;
    var want = !!d.on;
    var isOn = frame ? frame.classList.contains("ax-gframe--fullscreen") : false;
    if (!btn) return send("frame:state", { fullscreen: isOn, ok: false, code: "FRAME_DENIED", message: "找不到外框全螢幕按鈕" }, m.id);
    if (want !== isOn) { try { btn.click(); } catch (e) {} }
    var now = frame.classList.contains("ax-gframe--fullscreen");
    send("frame:state", { fullscreen: now, ok: now === want, code: now === want ? undefined : "FRAME_DENIED" }, m.id);
  }

  // ---------- 平台餘額變動推播（救濟金 / 後台調整 / 本 stub 自己的扣加分）----------
  function watchBalance() {
    var own = session;            // 綁定「這一次 render 的 session」，避免重繪後舊訂閱誤動新 session
    own.lastBal = bal();
    own.unsub = HL.state.subscribe(function (s) {
      // 離開遊戲頁（iframe 已不在 DOM）或已被新 session 取代 → 自我退訂，不留殘留訂閱
      if (own !== session || !own.iframe || !document.body.contains(own.iframe)) {
        if (own.unsub) { try { own.unsub(); } catch (e) {} own.unsub = null; }
        return;
      }
      if (s.balance === own.lastBal) return;
      own.lastBal = s.balance;
      send("balance:changed", { balance: s.balance, currency: currency(), reason: own.reason || "unknown" });
      own.reason = "platform";
      syncPanel();
    });
  }

  // ---------- 畫面：iframe + Bridge 證據面板 ----------
  function fmt(data) {
    if (!data) return "";
    var keys = Object.keys(data), out = [];
    for (var i = 0; i < keys.length && i < 4; i++) {
      var v = data[keys[i]];
      if (v == null) continue;
      if (typeof v === "object") v = (v.code || v.balance || JSON.stringify(v).slice(0, 28));
      out.push(keys[i] + "=" + v);
    }
    return out.length ? "  { " + out.join(", ") + " }" : "";
  }
  function log(head, data) {
    if (!session) return;
    var t = new Date();
    var ts = ("0" + t.getMinutes()).slice(-2) + ":" + ("0" + t.getSeconds()).slice(-2) + "." + ("00" + t.getMilliseconds()).slice(-3);
    session.lines.unshift(ts + "  " + head + fmt(data));
    if (session.lines.length > LOG_MAX) session.lines.length = LOG_MAX;
    if (session.logEl) session.logEl.textContent = session.lines.join("\n");
  }
  function setStatus(txt) { if (session && session.statusEl) session.statusEl.textContent = txt; }
  function syncPanel() {
    if (!session) return;
    if (session.balEl) session.balEl.textContent = money(bal());
    if (session.statEl) session.statEl.textContent = session.spins + " 注 · 押 " + money(session.wagered) + " · 贏 " + money(session.won);
  }

  function render() {
    // 換掉舊 session（平台重繪時 render 會再被呼叫）
    if (session && session.unsub) { try { session.unsub(); } catch (e) {} }

    var iframe = el("iframe", {
      src: APP_URL,
      title: GAME_TITLE,
      allow: "fullscreen",
      referrerpolicy: "origin",
      style: "display:block;width:100%;aspect-ratio:16/9;min-height:380px;border:0;border-radius:12px;background:#0a0913;"
    });
    var statusEl = el("b", { text: "等待 iframe 握手…" });
    var balEl = el("b", { text: money(bal()) });
    var statEl = el("span", { class: "ax-muted", text: "0 注 · 押 0 · 贏 0" });
    var logEl = el("pre", {
      style: "margin:0;padding:8px 10px;max-height:170px;overflow:auto;font:11px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;" +
             "white-space:pre-wrap;word-break:break-all;color:var(--ax-text-muted);background:rgba(0,0,0,0.28);border-radius:10px;"
    });

    var node = el("div", { class: "slot-engine-poc", style: "max-width:1080px;margin:0 auto;" }, [
      el("div", { style: "display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:10px;" }, [
        el("div", {}, [
          el("h2", { text: "🎰 " + GAME_TITLE, style: "margin:0;font-size:18px;" }),
          el("small", { class: "ax-muted", text: "PixiJS v8 + spine-pixi · iframe 殼 · HL Bridge v1" })
        ]),
        el("div", { style: "text-align:right;" }, [
          el("div", { class: "ax-muted" }, ["平台餘額 ", balEl]),
          statEl
        ])
      ]),
      iframe,
      el("div", { style: "margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;" }, [
        el("div", {}, [el("small", { class: "ax-muted", text: "Bridge 狀態：" }), statusEl]),
        el("span", { class: "ax-demo-tag", text: "Slot Engine 技術 POC · Demo 不扣真錢" })
      ]),
      el("details", { open: "", style: "margin-top:8px;" }, [
        el("summary", { style: "cursor:pointer;font-size:12px;color:var(--ax-text-muted);", text: "HL Bridge v1 訊息記錄（→ 平台送出 / ← 遊戲送來）" }),
        el("div", { style: "margin-top:6px;" }, [logEl])
      ])
    ]);

    var frame = HL.gameFrame ? HL.gameFrame.wrap(node, { title: GAME_TITLE, provider: "Slot Engine", key: GAME_ID, maxWidth: "1120px" }) : node;

    session = {
      id: "s" + Date.now(),
      iframe: iframe, frame: (frame === node ? null : frame),
      ready: false, bets: {}, openBet: null,
      spins: 0, wagered: 0, won: 0,
      reason: "platform", lastBal: bal(),
      lines: [], logEl: logEl, statusEl: statusEl, balEl: balEl, statEl: statEl
    };
    watchBalance();
    if (!listening) { global.addEventListener("message", onMessage, false); listening = true; }
    log("· stub render，iframe = " + APP_URL);
    return frame;
  }

  HL.games.register({
    id: GAME_ID,
    title: GAME_TITLE,
    author: "Slot Engine",       // 大廳依作者暱稱分組
    provider: "Slot Engine",
    type: "slot",                // 分類：slot
    cat: "community",
    community: true,             // 進「同仁開發放置區」
    playable: true,
    isNew: true,
    c1: "#1f6feb", c2: "#0b1b3a",
    tags: ["poc", "pixijs", "spine", "iframe"],
    render: render
  });
})(window);

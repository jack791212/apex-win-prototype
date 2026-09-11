/*
 * HL Bridge v1 — 遊戲側（iframe 內）實作
 * 契約：Slot Engine 專案 engine/docs/hl-bridge-v1.md
 *
 * 設計原則
 *   1. 餘額唯一真相在平台側：本檔只負責「請求」，回應帶回的 balance 一律覆寫本地顯示。
 *   2. 所有請求都有逾時；逾時的語意（可否轉輪、可否重試）由契約第 4 節規定。
 *   3. 收訊息一律驗 source / origin / ch / v，不符者靜默丟棄。
 * 註冊於 window.HLBridge。
 */
(function (global) {
  "use strict";

  var CH = "hl-bridge";
  var V = 1;

  // ---------- origin（契約第 6 節）----------
  // 本階段同源。file:// 下 location.origin 為 "null"，postMessage 只能用 "*"（僅限本機開發）。
  var SELF_ORIGIN = global.location.origin;
  var PARENT_ORIGIN = (function () {
    if (!SELF_ORIGIN || SELF_ORIGIN === "null") return "*";
    try { if (global.document.referrer) return new global.URL(global.document.referrer).origin; } catch (e) {}
    return SELF_ORIGIN;
  })();

  var TIMEOUT = { init: 8000, ready: 2000, readyTries: 4, balance: 5000, bet: 5000, settle: 5000, frame: 3000 };

  var seq = 0;
  var pending = {};          // id → { resolve, timer }
  var listeners = {};        // type → [fn]
  var initData = null;
  var closed = false;

  function post(type, data) {
    var msg = { ch: CH, v: V, type: type, id: "g" + (++seq), data: data || {} };
    try { global.parent.postMessage(msg, PARENT_ORIGIN); } catch (e) { return null; }
    return msg.id;
  }

  // 送出請求並等回應（回應以 re 配對）。resolve({ type, data })；逾時 resolve({ type:"timeout" })
  function request(type, data, timeout) {
    return new Promise(function (resolve) {
      var id = post(type, data);
      if (!id) { resolve({ type: "timeout", data: { code: "NO_PARENT" } }); return; }
      pending[id] = {
        resolve: resolve,
        timer: setTimeout(function () {
          delete pending[id];
          resolve({ type: "timeout", data: { code: "TIMEOUT", message: type + " 逾時" } });
        }, timeout || 5000)
      };
    });
  }

  function emit(type, data) {
    (listeners[type] || []).forEach(function (fn) { try { fn(data); } catch (e) {} });
  }

  function onMessage(e) {
    if (closed) return;
    if (e.source !== global.parent) return;                                  // ① 來源視窗
    if (PARENT_ORIGIN !== "*" && e.origin !== PARENT_ORIGIN && e.origin !== "null") return; // ② origin
    var m = e.data;
    if (!m || typeof m !== "object" || m.ch !== CH) return;                  // ③ 通道標記
    if (m.v !== V) { emit("fatal", { code: "PROTOCOL_MISMATCH", message: "平台 HL Bridge 版本為 v" + m.v }); return; }

    if (m.re && pending[m.re]) {                                            // 請求／回應配對只認 re
      var p = pending[m.re];
      delete pending[m.re];
      clearTimeout(p.timer);
      p.resolve({ type: m.type, data: m.data || {} });
      return;
    }
    emit(m.type, m.data || {});                                             // 事件推播（無 re）
  }
  global.addEventListener("message", onMessage, false);

  // ---------- 握手：送 game:ready 直到收到 platform:init（契約 4 / 5-1）----------
  function handshake(info) {
    return new Promise(function (resolve) {
      var tries = 0, done = false, hardTimer;
      function attempt() {
        if (done) return;
        tries++;
        request("game:ready", info, TIMEOUT.ready).then(function (r) {
          if (done) return;
          if (r.type === "platform:init") {
            done = true; clearTimeout(hardTimer);
            initData = r.data;
            resolve(initData);
          } else if (tries < TIMEOUT.readyTries) {
            attempt();
          }
        });
      }
      hardTimer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, TIMEOUT.init);
      attempt();
    });
  }

  // ---------- 下注：成功才可轉輪（契約 5-2）----------
  // resolve { ok:true, balance } / { ok:false, code, message }
  function placeBet(betId, amount) {
    return request("bet:place", { betId: betId, amount: amount }, TIMEOUT.bet).then(function (r) {
      if (r.type === "bet:accepted") return { ok: true, balance: r.data.balance, amount: r.data.amount };
      if (r.type === "bet:rejected") return { ok: false, code: r.data.code, message: r.data.message };
      if (r.type === "timeout") return { ok: false, code: "TIMEOUT", message: "下注逾時，未扣款" };
      return { ok: false, code: (r.data && r.data.code) || "INTERNAL", message: (r.data && r.data.message) || "下注失敗" };
    });
  }

  // ---------- 派彩：逾時以同一 betId 重送（平台端幂等，契約 5-4）----------
  function settle(betId, win, detail) {
    var tries = 0;
    function attempt() {
      tries++;
      return request("bet:settle", { betId: betId, win: win, detail: detail }, TIMEOUT.settle).then(function (r) {
        if (r.type === "bet:settled") return { ok: true, balance: r.data.balance, win: r.data.win };
        if (r.type === "timeout" && tries <= 2) return attempt();  // 幂等重送，最多 2 次
        return { ok: false, code: (r.data && r.data.code) || "TIMEOUT", message: (r.data && r.data.message) || "派彩失敗" };
      });
    }
    return attempt();
  }

  function getBalance() {
    return request("balance:get", {}, TIMEOUT.balance).then(function (r) {
      return r.type === "balance:value" ? r.data : null;
    });
  }

  function fullscreen(on) {
    return request("frame:fullscreen", { on: !!on }, TIMEOUT.frame).then(function (r) {
      return r.type === "frame:state" ? r.data : { fullscreen: false, ok: false, code: "TIMEOUT" };
    });
  }

  function reportError(code, message) { post("game:error", { code: code, message: String(message).slice(0, 300) }); }

  global.HLBridge = {
    version: V,
    parentOrigin: PARENT_ORIGIN,
    handshake: handshake,
    placeBet: placeBet,
    settle: settle,
    getBalance: getBalance,
    fullscreen: fullscreen,
    reportError: reportError,
    init: function () { return initData; },
    on: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
  };
})(window);

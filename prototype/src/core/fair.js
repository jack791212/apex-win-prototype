/*
 * Apex Win｜可驗證公平 Provably Fair（#15）
 * 模型（Stake 類）：serverSeed（保密，先公開其 SHA-256 雜湊＝承諾）＋ clientSeed（玩家可改）＋ nonce（每注遞增）。
 *   每注亂數 = HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`) → 取前 4 byte → [0,1) 浮點。
 *   輪換種子時揭露舊 serverSeed，任何人可用標準 HMAC-SHA256 重算、比對雜湊與每注結果。
 * 為讓遊戲同步取得結果，內含「同步」SHA-256/HMAC 實作（已對標 WebCrypto 驗證一致）。
 * 註冊於 window.HL.fair。Dice/Limbo 以 HL.fair.float() 取代 Math.random()。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  /* ---------------- 同步 SHA-256 ---------------- */
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  function ror(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256(msg) { // Uint8Array → Uint8Array(32)
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = msg.length, withOne = l + 1, k = (56 - withOne % 64 + 64) % 64, total = withOne + k + 8;
    var m = new Uint8Array(total); m.set(msg); m[l] = 0x80;
    var dv = new DataView(m.buffer);
    var bitLen = l * 8;
    dv.setUint32(total - 4, bitLen >>> 0, false);
    dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000) >>> 0, false);
    var w = new Array(64), i, t;
    for (i = 0; i < total; i += 64) {
      for (t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4, false);
      for (t = 16; t < 64; t++) {
        var s0 = ror(w[t - 15], 7) ^ ror(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = ror(w[t - 2], 17) ^ ror(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var out = new Uint8Array(32), odv = new DataView(out.buffer);
    for (i = 0; i < 8; i++) odv.setUint32(i * 4, H[i], false);
    return out;
  }
  function concat(a, b) { var c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }
  function hmac(key, msg) { // Uint8Array, Uint8Array → Uint8Array(32)
    var B = 64;
    if (key.length > B) key = sha256(key);
    var k = new Uint8Array(B); k.set(key);
    var ip = new Uint8Array(B), op = new Uint8Array(B);
    for (var i = 0; i < B; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
    return sha256(concat(op, sha256(concat(ip, msg))));
  }
  function utf8(s) { return new global.TextEncoder().encode(String(s)); }
  function toHex(bytes) { var h = ""; for (var i = 0; i < bytes.length; i++) h += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16); return h; }
  function sha256hex(str) { return toHex(sha256(utf8(str))); }
  function hmacBytes(keyStr, msgStr) { return hmac(utf8(keyStr), utf8(msgStr)); }
  function hmacHex(keyStr, msgStr) { return toHex(hmacBytes(keyStr, msgStr)); }

  /* ---------------- 種子狀態 ---------------- */
  var ls = HL.dom.lsGet, save = HL.dom.lsSet;  // T20：收斂至共用 localStorage 持久化出口
  var KEY_F = "HL_FAIR";
  function randHex(nBytes) {
    var b = new Uint8Array(nBytes);
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(b);
    else for (var i = 0; i < nBytes; i++) b[i] = Math.floor(Math.random() * 256);
    return toHex(b);
  }
  function load() {
    var o = ls(KEY_F, null);
    if (!o || !o.serverSeed) { o = { serverSeed: randHex(32), clientSeed: randHex(8), nonce: 0, last: null, history: [] }; save(KEY_F, o); }
    if (!o.history) o.history = [];
    return o;
  }
  function info() { var o = load(); return { serverSeedHash: sha256hex(o.serverSeed), clientSeed: o.clientSeed, nonce: o.nonce }; }

  // 每注：HMAC-SHA256(serverSeed, clientSeed:nonce) → 前 4 byte → [0,1)
  function floatFrom(serverSeed, clientSeed, nonce) {
    var by = hmacBytes(serverSeed, clientSeed + ":" + nonce);
    return by[0] / 256 + by[1] / 65536 + by[2] / 16777216 + by[3] / 4294967296;
  }
  function float(game) {
    var o = load();
    var f = floatFrom(o.serverSeed, o.clientSeed, o.nonce);
    var rec = { game: game || "", nonce: o.nonce, clientSeed: o.clientSeed, value: f };
    o.last = rec;
    o.history.unshift(rec); if (o.history.length > 12) o.history = o.history.slice(0, 12); // 近期下注（供驗證；輪換後可重算）
    o.nonce++; save(KEY_F, o);
    return f;
  }
  // 可驗證公平 float 的統一後援出口（T11）：fair.js 先於 views 載入故後援永不觸發，收斂散在各遊戲的守衛。
  function floatOr(game) { return (HL.fair && HL.fair.float) ? float(game) : Math.random(); }
  function setClientSeed(s) { s = String(s || "").trim().slice(0, 64); if (!s) return false; var o = load(); o.clientSeed = s; o.nonce = 0; save(KEY_F, o); return true; }
  function rotate() { // 揭露舊 serverSeed + 換新（nonce 歸零）
    var o = load(), oldSeed = o.serverSeed, oldHash = sha256hex(oldSeed);
    o.serverSeed = randHex(32); o.nonce = 0; save(KEY_F, o);
    return { oldServerSeed: oldSeed, oldServerSeedHash: oldHash, newServerSeedHash: sha256hex(o.serverSeed) };
  }
  // 對外驗證：給定種子/nonce → 浮點 + 各遊戲結果解讀
  var EDGE = 0.99;
  function diceRollOf(f) { return Math.floor(f * 10000) / 100; }           // 0.00–99.99
  function limboCrashOf(f) { return Math.max(1, EDGE / (1 - f)); }          // ≥1.00×
  function popcount(n) { var c = 0; n = n >>> 0; while (n) { c += n & 1; n >>>= 1; } return c; }
  function plinkoOf(f) { var bits = Math.floor(f * 65536); return { bits: bits, r8: popcount(bits & 0xff), r12: popcount(bits & 0xfff), r16: popcount(bits & 0xffff) }; } // 右移落點數
  var HILO_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var HILO_SUITS = ["♠", "♥", "♦", "♣"];
  function hiloCardOf(f) { var c = Math.floor(f * 52); return { card: c, rank: c % 13, suit: Math.floor(c / 13), face: HILO_RANKS[c % 13] + HILO_SUITS[Math.floor(c / 13)] }; } // 一牌一注（#27）
  function verify(serverSeed, clientSeed, nonce) {
    serverSeed = String(serverSeed || "").trim(); clientSeed = String(clientSeed || "").trim(); nonce = Math.max(0, Math.floor(+nonce || 0));
    if (!serverSeed || !clientSeed) return null;
    if (nonce > 9007199254740991) return null; // 超出安全整數則拒絕（避免精度流失誤導）
    var f = floatFrom(serverSeed, clientSeed, nonce);
    return { hmac: hmacHex(serverSeed, clientSeed + ":" + nonce), serverSeedHash: sha256hex(serverSeed), float: f, diceRoll: diceRollOf(f), limboCrash: limboCrashOf(f), plinko: plinkoOf(f), hiloCard: hiloCardOf(f) };
  }

  /* ---------------- UI ---------------- */
  function row(k, v, mono) { return HL.ui.kv(k, v, { valCls: mono ? "ax-fair__mono" : "" }); } // 沿用共用 primitive（見 core/ui.js）

  // 單一遊戲/當前種子的公平性面板（承諾雜湊 + 改 client seed + nonce + 輪換揭露）
  function fairnessModal() {
    var st = load(), s = info();
    var ci = el("input", { class: "ax-fair__in", type: "text", value: s.clientSeed, maxlength: "64", "aria-label": "客戶端種子" });
    var m;
    var hist = (st.history || []).slice(0, 8).map(function (h) {
      return el("div", { class: "ax-kv" }, [
        el("span", { class: "ax-muted", text: (h.game || "—") + " #" + h.nonce + "　" + (+h.value).toFixed(6) }),
        el("button", { class: "ax-link", text: "驗證 →", onClick: function () { m.close(); verifyModal({ clientSeed: h.clientSeed, nonce: h.nonce }); } })
      ]);
    });
    m = HL.ui.modal("🔒 可驗證公平 · 當前種子", [
      el("div", { class: "ax-panel" }, [
        row("伺服器種子雜湊（承諾）", s.serverSeedHash.slice(0, 24) + "…", true),
        el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: "客戶端種子（可改）" }), ci]),
        row("Nonce（下一注）", String(s.nonce))
      ]),
      el("p", { class: "ax-muted", text: "適用 Originals（Dice／Limbo／Plinko／Towers／Hilo）。開局前已公開伺服器種子的 SHA-256 雜湊；每注＝HMAC-SHA256(伺服器種子, 客戶端種子:nonce)。輪換種子會揭露原始伺服器種子，即可回頭驗證每一注（輪換前無法得知伺服器種子原值＝防作弊承諾）。" }),
      hist.length ? el("div", { class: "ax-panel" }, [el("div", { class: "ax-muted ax-fair__hh", text: "近期下注（輪換後可驗證）" })].concat(hist)) : null,
      el("div", { class: "ax-modal__actions" }, [
        el("button", { class: "ax-btn-primary", text: "儲存客戶端種子", onClick: function () { if (setClientSeed(ci.value)) { HL.ui.toast("已更新客戶端種子，Nonce 歸零", "ok"); m.close(); fairnessModal(); } else HL.ui.toast("客戶端種子不可為空", "warn"); } }),
        el("button", { class: "ax-btn-ghost", text: "輪換並揭露伺服器種子", onClick: function () { var r = rotate(); m.close(); revealModal(r); } }),
        el("button", { class: "ax-btn-ghost", text: "🔎 驗證器", onClick: function () { m.close(); verifyModal(); } })
      ]),
      el("span", { class: "ax-demo-tag", text: "純前端 Demo：伺服器種子存於本機（正式版須由伺服器簽發保管）；機制為標準 HMAC-SHA256，可用任何工具重算" })
    ]);
  }
  function revealModal(r) {
    var m = HL.ui.modal("🔓 已輪換 · 揭露原始伺服器種子", [
      el("div", { class: "ax-panel" }, [
        row("原始伺服器種子", r.oldServerSeed, true),
        row("其 SHA-256（應＝先前承諾）", r.oldServerSeedHash.slice(0, 24) + "…", true),
        row("新承諾雜湊", r.newServerSeedHash.slice(0, 24) + "…", true)
      ]),
      el("p", { class: "ax-muted", text: "把「原始伺服器種子 + 客戶端種子 + 各 nonce」貼進驗證器，即可重算先前每一注是否吻合。" }),
      el("button", { class: "ax-btn-primary", text: "🔎 前往驗證器", onClick: function () { m.close(); verifyModal({ serverSeed: r.oldServerSeed }); } })
    ]);
  }
  // 通用驗證器（bottombar「可驗證公平」入口）
  function verifyModal(prefill) {
    prefill = prefill || {}; var s = info();
    var ss = el("input", { id: "ax-fair-ss", class: "ax-fair__in", type: "text", placeholder: "伺服器種子（輪換後揭露的原始值）", value: prefill.serverSeed || "" });
    var cs = el("input", { id: "ax-fair-cs", class: "ax-fair__in", type: "text", placeholder: "客戶端種子", value: prefill.clientSeed || s.clientSeed });
    var nn = el("input", { id: "ax-fair-nn", class: "ax-fair__in", type: "number", min: "0", max: "9007199254740991", placeholder: "nonce", value: String(prefill.nonce != null ? prefill.nonce : 0) });
    var outBox = el("div", { class: "ax-panel", style: "display:none" });
    function run() {
      var r = verify(ss.value, cs.value, nn.value);
      HL.dom.clear(outBox); outBox.style.display = "block";
      if (!r) { outBox.appendChild(el("p", { class: "ax-red", text: "請填入有效的伺服器/客戶端種子與 nonce（nonce ≤ 9007199254740991）。" })); return; }
      outBox.appendChild(row("HMAC-SHA256", r.hmac.slice(0, 32) + "…", true));
      outBox.appendChild(row("浮點 [0,1)", r.float.toFixed(8)));
      outBox.appendChild(row("→ Dice 點數", r.diceRoll.toFixed(2)));
      outBox.appendChild(row("→ Limbo 崩盤", r.limboCrash.toFixed(2) + "×"));
      outBox.appendChild(row("→ Plinko 落點(右移) 8／12／16排", r.plinko.r8 + " ／ " + r.plinko.r12 + " ／ " + r.plinko.r16));
      outBox.appendChild(row("→ Hilo 牌面", r.hiloCard.face));
    }
    HL.ui.modal("🔎 公平性驗證器", [
      el("p", { class: "ax-muted", text: "貼入種子與 nonce，重算該注的 HMAC 與結果。與遊戲顯示一致即證明未被竄改。" }),
      el("div", { class: "ax-fair__form" }, [
        el("label", { class: "ax-muted", "for": "ax-fair-ss", text: "伺服器種子" }), ss,
        el("label", { class: "ax-muted", "for": "ax-fair-cs", text: "客戶端種子" }), cs,
        el("label", { class: "ax-muted", "for": "ax-fair-nn", text: "Nonce" }), nn
      ]),
      el("button", { class: "ax-btn-primary", text: "重算驗證", onClick: run }),
      outBox,
      el("span", { class: "ax-demo-tag", text: "標準 HMAC-SHA256（前 4 byte → 浮點）· 可用任何外部工具比對 · Demo（伺服器種子存於本機）" })
    ]);
  }

  HL.fair = {
    float: float, floatOr: floatOr, info: info, setClientSeed: setClientSeed, rotate: rotate, verify: verify,
    sha256hex: sha256hex, hmacHex: hmacHex, diceRollOf: diceRollOf, limboCrashOf: limboCrashOf, hiloCardOf: hiloCardOf,
    fairnessModal: fairnessModal, verifyModal: verifyModal
  };
})(window);

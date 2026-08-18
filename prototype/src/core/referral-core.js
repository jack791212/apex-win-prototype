/*
 * Apex Win｜推薦/邀請好友的純數學層 HL.refCore（自我進化引擎 #58）
 * ─────────────────────────────────────────────────────────────────────
 * 對標三平台共識：**WOW Vegas**（每邀一位好友，雙方各得獎勵）＋ **SpinBlitz**
 *   （獎勵**不是註冊即發**，而是依被推薦人的里程碑**分階段釋放**：達 $20 放第一段、
 *   累計 $500 才放剩餘）＋ platform-modules 台帳「活動 / 推薦聯盟」長期 absent。
 *   ApexWin 的成長此前**全部**來自玩家自身押注（VIP／賽季／成就／公會皆單人累積），
 *   「把人帶進來」這條軸線是唯一連 mock 骨架都沒有的主流成長維度（開卡時 grep 命中 0）。
 *
 * 【本檔只做一件事】回答「這位好友走到第幾階、這一階該放多少、我能不能歸因給這個碼」，
 *   **不碰 DOM、不碰 localStorage、不碰站別**——全部由呼叫端餵進來（純函式 ⇒ node 可 require）。
 *   雙環境契約比照 #50 edge／#57 chalSlots／#71 bonusTtl：node 驗的就是瀏覽器跑的那一份。
 *
 * 【為什麼要獨立成檔】推薦制唯一有「可算錯」空間的地方全在這裡：重複發放、預付未達成的階、
 *   自我推薦、歸因被覆寫、真站獎額比假站寬鬆。把它們搬進純函式，鎖才咬得到東西。
 *
 * 【五條刻意的紀律（皆有對應測項）】
 *   ① **冪等靠結構、不靠比對**：已發放進度以**單調整數 `paidUpTo`** 記錄（發到第幾階），
 *      而不是「已發放集合」。`settle()` 只看 `i >= paidUpTo` 的階 ⇒ **重複發放沒有路徑可走**，
 *      不是「有人在檢查」（比照 #71 把 TTL 清理的簽章訂成 sweep(entries, now) 的作法）。
 *   ② **分階釋放不得預付**：`due()` 只回「里程碑已達成」的階；第二階的錢在好友押注量真的
 *      跨過門檻前**取不出來**。這正是 SpinBlitz 形狀的反濫用價值——「註冊即給」的一次性紅包
 *      在假站等於無限印幣（mock 好友可任意生成）。
 *   ③ **自我推薦不可歸因**：`attributable()` 對「碼等於自己的碼」「碼格式非法」一律回 false。
 *   ④ **歸因寫一次**：`applyRef()` 是**純函式**，已有歸因時原樣回傳同一個物件參考
 *      （呼叫端就算漏判也覆寫不掉；`===` 可斷言）。
 *   ⑤ **真站不得比假站寬鬆（§11）**：`tiers(live)` 的獎額逐階 live ≤ demo、門檻逐階 live ≥ demo。
 *      這條同時登記進 #90 `HL.econCfg`（strict le/ge）⇒ 儀表板健檢也會自動盯。
 *
 * 【真站的誠實邊界（§4＋#57 的教訓）】純前端**沒有任何通道**讓「我的裝置」知道有人用我的碼註冊了
 *   ——被邀請者的紀錄在**他自己的 localStorage** 裡。⇒ 真站的好友清單**結構上恆為空**，
 *   模擬好友一律 `bots:false` 關掉（`simFriends` 直接回 []）。呼叫端因此在真站無 attestor 時
 *   **據實不供應**推薦獎勵（而非靜默退化成「自己填一個碼就領錢」＝無限印幣）。
 *   本檔只負責把 `bots:false` 算對，不負責決定要不要顯示。
 *
 * 註冊於 window.HL.refCore = { hash, codeFor, normalize, valid, attributable, applyRef,
 *                              tiers, reached, due, settle, simFriends, ALPHABET, LEN }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純函式區（node 可 require · 無 DOM／localStorage／站別相依）=====================

  // 去掉易混字元（0/O、1/I/L）——邀請碼會被口述與手打，這是實務上唯一會咬人的細節。
  var ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  var LEN = 6;

  // 確定性雜湊（沿用 chalSlots/guild/tournament 家族的 32-bit FNV 混合；同輸入必同輸出）
  function hash(s) {
    var h = 2166136261, i;
    s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }

  /* 由任意種子產生穩定邀請碼。同一裝置每次開站都必須得到同一個碼——玩家可能已經把碼
   * 貼給朋友了，碼會變＝先前分享出去的連結全部作廢。 */
  function codeFor(seed) {
    var out = "", h = hash("ref|" + seed), i;
    for (i = 0; i < LEN; i++) {
      out += ALPHABET.charAt(h % ALPHABET.length);
      h = hash(out + "|" + seed + "|" + i);
    }
    return out;
  }

  // 正規化使用者輸入／URL 參數：大寫、剔除非字母表字元、截到 LEN。
  function normalize(raw) {
    var s = String(raw == null ? "" : raw).toUpperCase(), out = "", i;
    for (i = 0; i < s.length && out.length < LEN; i++) {
      if (ALPHABET.indexOf(s.charAt(i)) >= 0) out += s.charAt(i);
    }
    return out;
  }
  function valid(code) { return normalize(code).length === LEN && normalize(code) === String(code || "").toUpperCase(); }

  /* 紀律 ③：可不可以把「我」歸因給 inCode。
   * 非法碼、空碼、等於自己的碼一律 false（同裝置自我推薦是純前端唯一擋得住的濫用形狀）。 */
  function attributable(myCode, inCode) {
    var c = normalize(inCode);
    if (c.length !== LEN) return false;
    return c !== normalize(myCode);
  }

  /* 紀律 ④：歸因寫一次。state = { ref, refAt, paidUpTo } | null。
   * 已有 ref ⇒ **原樣回傳同一個參考**（呼叫端 `next === state` 即可判斷「沒寫入」）。 */
  function applyRef(state, inCode, myCode, now) {
    var s = state || null;
    if (s && s.ref) return s;                       // 已歸因：不可覆寫（同一參考）
    if (!attributable(myCode, inCode)) return s;    // 自我推薦／非法碼：不歸因
    return { ref: normalize(inCode), refAt: +now || 0, paidUpTo: (s && s.paidUpTo) || 0 };
  }

  /* 里程碑階梯（資料描述子：加一階＝加一筆）。
   *   need ＝被推薦人的**累積 VIP 經驗**（＝#50 成本加權後的押注量，非名目押注）
   *   ref  ＝推薦人這一階可得   ee ＝被推薦人這一階可得
   * 紀律 ⑤：真站獎額逐階 ≤ 假站、門檻逐階 ≥ 假站（§11 真站不得比假站寬鬆）。 */
  var TIERS_DEMO = [
    { need: 3000,  ref: 500,  ee: 300 },
    { need: 30000, ref: 2000, ee: 1000 }
  ];
  var TIERS_LIVE = [
    { need: 3000,  ref: 100,  ee: 60 },
    { need: 30000, ref: 400,  ee: 200 }
  ];
  function tiers(live) {
    return (live ? TIERS_LIVE : TIERS_DEMO).map(function (t) { return { need: t.need, ref: t.ref, ee: t.ee }; });
  }

  // 已達成的階數（0..n）。門檻為升冪，回傳第一個未達成之前的階數。
  function reached(wager, ts) {
    var n = 0, i;
    ts = ts || [];
    for (i = 0; i < ts.length; i++) { if ((+wager || 0) >= ts[i].need) n = i + 1; else break; }
    return n;
  }

  /* 紀律 ①＋②：這位好友現在**該放**的階（已達成且尚未發放者）。
   * paidUpTo 是單調整數（已發到第幾階）⇒ 同一階不可能被算兩次，且未達成的階取不出來。 */
  function due(wager, paidUpTo, ts) {
    ts = ts || [];
    var from = Math.max(0, Math.min(ts.length, Math.floor(+paidUpTo || 0)));
    var to = reached(wager, ts);
    var stages = [], ref = 0, ee = 0, i;
    for (i = from; i < to; i++) { stages.push(i); ref += ts[i].ref; ee += ts[i].ee; }
    return { stages: stages, ref: ref, ee: ee, from: from, to: to };
  }

  /* 結算一位好友：回傳「發多少 + 新的 paidUpTo」。**不改入參**（純函式）。
   * 呼叫端拿 paidUpTo 覆寫自己的存檔即可，重放同一次呼叫不會多發（due 會變空）。 */
  function settle(friend, ts) {
    var f = friend || {};
    var d = due(f.wager, f.paidUpTo, ts);
    return { ref: d.ref, ee: d.ee, stages: d.stages, paidUpTo: d.to };
  }

  /* 假站模擬好友（確定性）：呈現「已有 N 位好友加入、各自走到第幾階」的完整體驗。
   * opts = { n, startMs, now, spanMs, names, bots }。
   *   bots:false（真站）⇒ **直接回 []**——真站好友清單結構上恆為空（見檔頭）。
   * 同 seed 在任何裝置／任何時間重算都得到同一組加入時刻與押注量 ⇒ 重新整理不跳動
   *   （這是模擬型社交證明唯一會被玩家一眼看穿的破綻）。 */
  function simFriends(seed, opts) {
    opts = opts || {};
    if (opts.bots === false) return [];
    var n = Math.max(0, Math.floor(opts.n || 0));
    var start = +opts.startMs || 0, now = +opts.now || 0;
    var span = Math.max(1, +opts.spanMs || 1);
    var names = opts.names && opts.names.length ? opts.names : null;
    var cap = 0, ts = tiers(false), i;
    for (i = 0; i < ts.length; i++) cap = Math.max(cap, ts[i].need);
    cap = Math.round(cap * 1.4);                       // 模擬好友不會無限成長（避免「每個人最後都滿階」）
    var out = [];
    for (i = 0; i < n; i++) {
      var u = (hash(seed + "|join|" + i) % 100000) / 100000;
      var joinedAt = start + Math.floor(u * span);
      if (joinedAt > now) continue;                    // 還沒加入的好友不出現在清單上
      var rate = 0.15 + (hash(seed + "|rate|" + i) % 1000) / 1000 * 1.25;   // 各人活躍度不同
      var days = (now - joinedAt) / 86400000;
      var wager = Math.min(cap, Math.floor(days * rate * 6000));
      out.push({
        id: "f" + i,
        name: names ? names[hash(seed + "|nm|" + i) % names.length] : ("Player " + (i + 1)),
        joinedAt: joinedAt,
        wager: wager
      });
    }
    out.sort(function (a, b) { return a.joinedAt - b.joinedAt; });
    return out;
  }

  var CORE = {
    hash: hash, codeFor: codeFor, normalize: normalize, valid: valid,
    attributable: attributable, applyRef: applyRef,
    tiers: tiers, reached: reached, due: due, settle: settle, simFriends: simFriends,
    ALPHABET: ALPHABET, LEN: LEN
  };

  // ===================== 自我測項（node 與瀏覽器同一份）=====================
  function registerTests(st) {
    if (!st || !st.register) return;
    var DAY = 86400000;

    st.register({
      id: "platform/referral-code-attribution",
      group: "platform", tier: "fast",
      name: "#58 邀請碼與歸因：穩定碼 / 自我推薦不可歸因 / 歸因寫一次",
      run: function (t) {
        // 碼必須穩定（玩家已把碼貼出去了，變碼＝先前分享的連結全作廢）
        var a = codeFor("dev-1"), b = codeFor("dev-1");
        t.equal(a, b, "同一種子必須產生同一個邀請碼");
        t.equal(a.length, LEN, "邀請碼長度必須為 " + LEN);
        var amb = 0, i;
        for (i = 0; i < a.length; i++) if ("01OIL".indexOf(a.charAt(i)) >= 0) amb++;
        t.equal(amb, 0, "邀請碼不得含易混字元 0/1/O/I/L（會被口述與手打）");
        t.ok(codeFor("dev-1") !== codeFor("dev-2"), "不同裝置種子不應撞碼");

        // ③ 自我推薦
        t.ok(attributable(a, codeFor("dev-2")) === true, "他人的合法碼應可歸因");
        t.ok(attributable(a, a) === false, "自我推薦（碼等於自己）不得歸因");
        t.ok(attributable(a, "") === false, "空碼不得歸因");
        t.ok(attributable(a, "AB") === false, "長度不足的碼不得歸因");
        t.ok(attributable(a, a.toLowerCase()) === false, "大小寫不同的自己的碼仍是自我推薦");

        // ④ 歸因寫一次：已有歸因時回傳**同一個參考**（覆寫沒有路徑可走）
        var s0 = null;
        var s1 = applyRef(s0, codeFor("dev-2"), a, 1000);
        t.equal(s1.ref, codeFor("dev-2"), "首次歸因應寫入");
        t.equal(s1.refAt, 1000, "首次歸因應記錄時間");
        var s2 = applyRef(s1, codeFor("dev-3"), a, 2000);
        t.ok(s2 === s1, "已歸因後再帶別的碼必須原樣回傳同一參考（不可覆寫）");
        var s3 = applyRef(null, a, a, 3000);
        t.ok(s3 === null, "自我推薦不得產生歸因狀態");
      }
    });

    st.register({
      id: "platform/referral-milestone-release",
      group: "platform", tier: "fast",
      name: "#58 分階釋放：不得預付未達成的階 / 冪等靠單調 paidUpTo / 真站不得比假站寬鬆",
      run: function (t) {
        var ts = tiers(false);
        t.ok(ts.length >= 2, "里程碑至少兩階（一次性紅包＝反濫用形狀不成立）");
        for (var i = 1; i < ts.length; i++) t.ok(ts[i].need > ts[i - 1].need, "里程碑門檻必須嚴格升冪");

        // ② 不得預付
        t.equal(reached(0, ts), 0, "零押注＝零階達成");
        t.equal(reached(ts[0].need - 1, ts), 0, "差 1 也不算達成第一階");
        t.equal(reached(ts[0].need, ts), 1, "恰好達門檻即算達成（邊界含）");
        t.equal(reached(ts[1].need, ts), 2, "跨過第二門檻＝兩階達成");
        var d0 = due(ts[0].need, 0, ts);
        t.equal(d0.stages.length, 1, "只達第一階時只能放一階");
        t.equal(d0.ref, ts[0].ref, "第一階推薦人獎額必須等於描述子");
        t.equal(d0.ee, ts[0].ee, "第一階被推薦人獎額必須等於描述子");

        // ① 冪等：結算後 paidUpTo 前進，重放同一次呼叫得到 0
        var f = { wager: ts[0].need, paidUpTo: 0 };
        var r1 = settle(f, ts);
        t.equal(r1.paidUpTo, 1, "結算後 paidUpTo 應前進到 1");
        t.equal(f.paidUpTo, 0, "settle 不得改入參（純函式）");
        var r2 = settle({ wager: f.wager, paidUpTo: r1.paidUpTo }, ts);
        t.equal(r2.ref + r2.ee, 0, "同一階不得二次發放（重放結算應為 0）");
        // 跳階：好友一次衝過兩個門檻 ⇒ 一次補齊兩階、金額為兩階和
        var jump = settle({ wager: ts[1].need, paidUpTo: 0 }, ts);
        t.equal(jump.stages.length, 2, "一次跨兩階應補齊兩階");
        t.equal(jump.ref, ts[0].ref + ts[1].ref, "跨階金額必須等於各階之和（不得只發最後一階）");
        // 髒資料：paidUpTo 超出階數／為負，都不得算出負數或超額
        t.equal(settle({ wager: 1e9, paidUpTo: 99 }, ts).ref, 0, "paidUpTo 超出階數時不得再發");
        t.equal(settle({ wager: 0, paidUpTo: -5 }, ts).ref, 0, "負 paidUpTo 不得倒推發放");

        // ⑤ §11：真站不得比假站寬鬆（送幣 le、門檻 ge）
        var dm = tiers(false), lv = tiers(true);
        t.equal(dm.length, lv.length, "兩站階數必須一致（否則比較無意義）");
        for (var j = 0; j < dm.length; j++) {
          t.ok(lv[j].ref <= dm[j].ref, "真站第 " + (j + 1) + " 階推薦人獎額不得高於假站");
          t.ok(lv[j].ee <= dm[j].ee, "真站第 " + (j + 1) + " 階被推薦人獎額不得高於假站");
          t.ok(lv[j].need >= dm[j].need, "真站第 " + (j + 1) + " 階門檻不得低於假站");
        }
        // 描述子是副本：改它不得污染下一次讀取（呼叫端拿去畫面上算數是常態）
        dm[0].ref = 999999;
        t.equal(tiers(false)[0].ref, TIERS_DEMO[0].ref, "tiers() 必須回可安全改寫的副本");
      }
    });

    st.register({
      id: "platform/referral-live-has-no-channel",
      group: "platform", tier: "fast",
      name: "#58 真站結構事實：無伺服器則好友清單恆為空（模擬社交證明只准存在於假站）",
      run: function (t) {
        var now = 1700000000000, start = now - 30 * DAY;
        var demo = simFriends("seed-a", { n: 6, startMs: start, now: now, spanMs: 25 * DAY, bots: true });
        t.ok(demo.length > 0, "假站應模擬出好友（否則面板是空的、體驗不完整）");
        var live = simFriends("seed-a", { n: 6, startMs: start, now: now, spanMs: 25 * DAY, bots: false });
        t.equal(live.length, 0, "真站（bots:false）好友清單必須為空——純前端沒有通道得知有人用了我的碼");

        // 確定性：重新整理不得看到不同的好友數／不同的進度
        var again = simFriends("seed-a", { n: 6, startMs: start, now: now, spanMs: 25 * DAY, bots: true });
        t.equal(JSON.stringify(demo), JSON.stringify(again), "同 seed 同時刻的模擬好友必須完全確定");
        // 未來才加入的好友不得提前出現
        var early = simFriends("seed-a", { n: 6, startMs: now + DAY, now: now, spanMs: 25 * DAY, bots: true });
        t.equal(early.length, 0, "尚未到加入時刻的好友不得出現在清單上");
        // 加入時間升冪 + 押注量有上限（不得每個人最後都滿階）
        var capNeed = tiers(false)[tiers(false).length - 1].need;
        for (var i = 0; i < demo.length; i++) {
          if (i > 0) t.ok(demo[i].joinedAt >= demo[i - 1].joinedAt, "模擬好友必須依加入時間升冪");
          t.ok(demo[i].wager >= 0, "模擬押注量不得為負");
          t.ok(demo[i].wager <= Math.round(capNeed * 1.4), "模擬押注量必須有上限");
          t.ok(demo[i].joinedAt <= now, "模擬好友的加入時刻不得晚於現在");
        }
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 瀏覽器區 =====================
  HL.refCore = CORE;
  // 載入序脫鉤（#101）：不假設 selftest.js 已載入，改用它的佇列形狀
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : globalThis);

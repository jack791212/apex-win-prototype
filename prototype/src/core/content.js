/*
 * Apex Win｜內容資料層 HL.content（自我進化引擎 #61）
 * ─────────────────────────────────────────────────────────────────────
 * 缺口（開卡時的 grep 實證 + 落地當下新查獲的一項）：
 *   ① 全站可展示內容（banner／促銷卡／公告 copy）硬寫在 `data/mock-data.js` 的模組級陣列裡，
 *      無 schema／enabled／窗口／受眾／語系欄位 ⇒ 換一張 banner 要改碼重新部署。
 *   ② ⚠️ 大廳與娛樂城的**促銷輪播 12 張卡幾乎零 i18n**（逐條實測只有「限時錦標賽」在字典裡）
 *      ⇒ 切 EN/简中時首屏最顯眼的那條輪播原樣顯示繁中。而 #119 的 i18n 棘輪掃的是 `t("中文")`
 *      呼叫點，**內容資料不是呼叫點 ⇒ 天生在棘輪射程外**（P3 家族第 8 次，這次是資料型的）。
 *
 * 容器先於編輯器：本檔是**內容註冊表**，不認識任何特定 banner；一行 register 即上架
 *   （比照 #49 promoCal／#109 reports／dock／achievements 的註冊表家族）。編輯 UI 屬後台
 *   （ROADMAP LATER）——本檔只把資料層做對，日後接編輯器/後端 CMS **不必再動渲染端**。
 * 與 #49 分工（勿誤判重複）：promoCal 管「活動的排程呈現」，本檔管「內容物本身 + 它的可見窗口」。
 * 受眾一律向 #54 `HL.release.matches` 求（全站唯一一份受眾詞彙，本檔不得有第二張表），
 *   fail-closed：宣告了 audience 卻拿不到述詞＝不顯示（勝過在載入競態那瞬間把限定內容全站放出去）。
 * 一律即時求值（比照 #49/#54）：不快取、不常駐計時器 ⇒ 跨午夜自動正確、過期內容不需有人回頭清。
 * 語系：descriptor 自帶 `locales`，查詢時淺層覆蓋 payload ⇒ **營運文案脫離字典**
 *   （字典管 UI 用語、內容管營運文案）；新增 banner 的人在同一個物件裡就把三語寫齊。
 * 雙環境契約（比照 #50/#54/#56）：純函式區以 module.exports 暴露；不變量鎖在
 *   `tests/checks-platform.js`（node 端，刻意不放本檔＝首屏不必載測項散文，M6 預算閘）。
 * 註冊於 window.HL.content = { register, unregister, get, list, sources, types, counts, TYPES }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純函式區（node 可 require · 無 DOM 相依）=====================

  /* 內容型別詞彙（自我描述：加一個內容出口＝加一筆）。register() 對未登記型別 **fail-closed**：
   * 本專案被「打錯鍵/排錯序＝靜默不註冊、畫面少一塊卻不拋錯」咬過多次（#66/#101/#106/#59）。 */
  var TYPES = {
    "lobby-promo":  { label: "大廳促銷輪播", where: "views/lobby.js promoCarousel" },
    "casino-promo": { label: "娛樂城廣告牌", where: "views/casino.js promoCarousel" }
    // 公告（notice）尚無渲染表面 ⇒ 刻意不先登記（登記了沒出口＝又一個有容器沒內容）。
  };

  var CJK = /[㐀-鿿]/;   // 含漢字＝需要譯文的欄位（emoji／色碼／路由鍵天生不含）

  // 某語言下「必須另有譯文」的欄位鍵集（zh-Hant 為原文語言故恆空）
  function needsLocale(desc, langCode) {
    if (!desc || !desc.payload || langCode === "zh-Hant") return [];
    var out = [], p = desc.payload, k;
    for (k in p) if (Object.prototype.hasOwnProperty.call(p, k) && typeof p[k] === "string" && CJK.test(p[k])) out.push(k);
    return out;
  }

  // 語系解析：payload 之上淺層覆蓋 locales[lang]。**不改寫 descriptor**，每次回新物件。
  function resolveLocale(desc, langCode) {
    var out = {}, p = (desc && desc.payload) || {}, k;
    for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) out[k] = p[k];
    var L = desc && desc.locales && desc.locales[langCode];
    if (L) for (k in L) if (Object.prototype.hasOwnProperty.call(L, k)) out[k] = L[k];
    return out;
  }

  /* 窗口階段。⚠️ 兩個方向都要判：只判「已結束」會讓未開始的內容提前出現，
   * 只判「未開始」會讓過期內容永遠留在畫面上。startAt/endAt 皆選用，兩者皆無＝常設。 */
  function phaseOf(desc, now) {
    var s = (desc && desc.startAt) || 0, e = (desc && desc.endAt) || 0;
    if (!s && !e) return "always";
    if (s && now < s) return "upcoming";
    if (e && now >= e) return "ended";
    return "live";
  }

  // 是否該出現。matches 由呼叫端注入（瀏覽器＝HL.release.matches；node 測項＝假述詞）。
  function visibleAt(desc, now, ctx, matches) {
    if (!desc) return false;
    if (desc.enabled === false) return false;
    var ph = phaseOf(desc, now);
    if (ph !== "live" && ph !== "always") return false;
    if (!desc.audience) return true;                       // 未宣告＝全體（零回歸）
    if (typeof matches !== "function") return false;       // fail-closed
    try { return !!matches(desc.audience, ctx || {}); } catch (err) { return false; }
  }

  // 排序：priority 高者先，同 priority 維持註冊順序 ⇒ 遷移前的硬寫陣列順序逐位不變。
  function sortDescs(list) {
    return list.slice().sort(function (a, b) {
      var d = (b.priority || 0) - (a.priority || 0);
      return d !== 0 ? d : (a._seq - b._seq);
    });
  }

  /* ===================== 種子內容（原 mock-data.js 的硬寫陣列，逐則搬過來）=====================
   * 三語**同物件寫齊**：payload 為 zh-Hant 原文，locales.en／locales["zh-Hans"] 全譯
   * （內容型不套字典的「只補差異字」慣例——內容是整句替換，缺一欄就會露出繁中）。 */
  var SEED = [
    { id: "lobby:welcome", type: "lobby-promo",
      payload: { tag: "新玩家專屬", title: "100% 首儲獎金", sub: "最高 NT$30,000 + 200 免費旋轉", ic: "🎰", c1: "#3b1e6e", c2: "#7c5cff" },
      locales: { en: { tag: "New Players", title: "100% First Deposit Bonus", sub: "Up to NT$30,000 + 200 free spins" },
                 "zh-Hans": { tag: "新玩家专属", title: "100% 首储奖金", sub: "最高 NT$30,000 + 200 免费旋转" } } },
    { id: "lobby:rakeback", type: "lobby-promo",
      payload: { tag: "天天回饋", title: "每日返水 1.5%", sub: "當日下注自動回饋彩金", ic: "💰", c1: "#16345f", c2: "#36a6ff" },
      locales: { en: { tag: "Daily Boost", title: "1.5% Daily Rakeback", sub: "Auto-credited on the day you wager" },
                 "zh-Hans": { tag: "天天回馈", title: "每日返水 1.5%", sub: "当日下注自动回馈彩金" } } },
    { id: "lobby:arena-rake", type: "lobby-promo",
      payload: { tag: "限時活動", title: "對押池抽水減半", sub: "競技場狂歡，現在加入", ic: "⚔️", c1: "#6e1e3a", c2: "#ff5d6c" },
      locales: { en: { tag: "Limited Time", title: "Half Rake on Head-to-Head Pools", sub: "Arena party is live — jump in" },
                 "zh-Hans": { tag: "限时活动", title: "对押池抽水减半", sub: "竞技场狂欢，现在加入" } } },
    { id: "lobby:vip", type: "lobby-promo",
      payload: { tag: "尊榮禮遇", title: "VIP 俱樂部開放", sub: "升級解鎖專屬獎勵", ic: "💎", c1: "#13524a", c2: "#2fd17a" },
      locales: { en: { tag: "VIP Perks", title: "VIP Club Is Open", sub: "Level up to unlock exclusive rewards" },
                 "zh-Hans": { tag: "尊荣礼遇", title: "VIP 俱乐部开放", sub: "升级解锁专属奖励" } } },
    { id: "lobby:weekend", type: "lobby-promo",
      payload: { tag: "週末加碼", title: "週末充值送彩金", sub: "儲值最高加贈 50%", ic: "🎁", c1: "#5f4a13", c2: "#ffb524" },
      locales: { en: { tag: "Weekend Extra", title: "Weekend Reload Bonus", sub: "Up to 50% extra on deposits" },
                 "zh-Hans": { tag: "周末加码", title: "周末充值送彩金", sub: "储值最高加赠 50%" } } },
    { id: "lobby:referral", type: "lobby-promo",
      payload: { tag: "好友同樂", title: "推薦好友共享獎勵", sub: "邀請越多，回饋越多", ic: "🤝", c1: "#3a1e6e", c2: "#9d80ff" },
      locales: { en: { tag: "Bring Friends", title: "Refer a Friend, Share the Rewards", sub: "The more you invite, the more you earn" },
                 "zh-Hans": { tag: "好友同乐", title: "推荐好友共享奖励", sub: "邀请越多，回馈越多" } } },

    { id: "casino:originals", type: "casino-promo",
      payload: { tag: "獨家原創", title: "Originals 遊戲館上線", sub: "暗影儀式 Shadow Ritual 立即試玩", ic: "🎰", c1: "#6e1a2a", c2: "#ff5d6c", cat: "originals" },
      locales: { en: { tag: "Exclusive Originals", title: "Originals Lounge Is Live", sub: "Play Shadow Ritual right now" },
                 "zh-Hans": { tag: "独家原创", title: "Originals 游戏馆上线", sub: "暗影仪式 Shadow Ritual 立即试玩" } } },
    { id: "casino:tournament", type: "casino-promo",
      payload: { tag: "限時錦標賽", title: "Slots 競賽 100 萬獎池", sub: "限時積分賽 · 賽末自動派彩", ic: "🏆", c1: "#3b1e6e", c2: "#7c5cff", go: "tournament" },
      locales: { en: { tag: "Timed Tournament", title: "Slots Race · 1,000,000 Prize Pool", sub: "Points race · paid out automatically at the end" },
                 "zh-Hans": { tag: "限时锦标赛", title: "Slots 竞赛 100 万奖池", sub: "限时积分赛 · 赛末自动派彩" } } },
    { id: "casino:live", type: "casino-promo",
      payload: { tag: "真人現場", title: "真人娛樂首儲免傭金", sub: "百家樂・輪盤 24h 不打烊", ic: "🎴", c1: "#16345f", c2: "#36a6ff", cat: "live" },
      locales: { en: { tag: "Live Dealer", title: "No Commission on Your First Live Deposit", sub: "Baccarat and roulette, open 24h" },
                 "zh-Hans": { tag: "真人现场", title: "真人娱乐首储免佣金", sub: "百家乐・轮盘 24h 不打烊" } } },
    { id: "casino:jackpot", type: "casino-promo",
      payload: { tag: "累積彩金", title: "Jackpot 隨時引爆", sub: "Mega Moolah 千萬獎池等你", ic: "💎", c1: "#5f4a13", c2: "#ffb524", cat: "jackpot" },
      locales: { en: { tag: "Progressive Jackpot", title: "The Jackpot Can Drop Anytime", sub: "Mega Moolah's ten-million pool is waiting" },
                 "zh-Hans": { tag: "累积彩金", title: "Jackpot 随时引爆", sub: "Mega Moolah 千万奖池等你" } } },
    { id: "casino:gameshow", type: "casino-promo",
      payload: { tag: "遊戲節目", title: "Crazy Time 加倍時刻", sub: "現場遊戲節目派對開跑", ic: "🎡", c1: "#6e1e3a", c2: "#ff4bd1", cat: "gameshow" },
      locales: { en: { tag: "Game Show", title: "Crazy Time Multiplier Hour", sub: "The live game-show party is on" },
                 "zh-Hans": { tag: "游戏节目", title: "Crazy Time 加倍时刻", sub: "现场游戏节目派对开跑" } } },
    { id: "casino:new", type: "casino-promo",
      payload: { tag: "新游搶先", title: "每週新游首發體驗", sub: "搶先試玩最新上架遊戲", ic: "✨", c1: "#13524a", c2: "#2fd17a", cat: "new" },
      locales: { en: { tag: "New Arrivals", title: "Weekly New-Game Premiere", sub: "Be first to try the latest release" },
                 "zh-Hans": { tag: "新游抢先", title: "每周新游首发体验", sub: "抢先试玩最新上架游戏" } } }
  ];

  var CORE = {
    TYPES: TYPES, SEED: SEED, CJK: CJK,
    needsLocale: needsLocale, resolveLocale: resolveLocale,
    phaseOf: phaseOf, visibleAt: visibleAt, sortDescs: sortDescs
  };

  if (isNode) { module.exports = CORE; return; }

  // ===================== 瀏覽器端註冊表 =====================
  var SOURCES = [], SEQ = 0;
  function warn(msg) { try { if (global.console && console.warn) console.warn("[HL.content] " + msg); } catch (e) {} }

  function register(desc) {
    if (!desc || !desc.id) { warn("descriptor 缺 id，已忽略"); return false; }
    if (!TYPES[desc.type]) { warn("未登記的內容型別「" + desc.type + "」（id=" + desc.id + "）已被拒絕；請先在 content.js 的 TYPES 加一筆"); return false; }
    var prev = null;
    SOURCES = SOURCES.filter(function (s) { if (s.id === desc.id) { prev = s; return false; } return true; });
    var o = {}, k;
    for (k in desc) if (Object.prototype.hasOwnProperty.call(desc, k)) o[k] = desc[k];
    o._seq = prev ? prev._seq : SEQ++;             // 熱替換保留原順序（換文案不讓卡片跳位）
    SOURCES.push(o);
    return true;
  }
  function unregister(id) { SOURCES = SOURCES.filter(function (s) { return s.id !== id; }); return HL.content; }
  function sources() { return SOURCES.slice(); }
  function get(id) { for (var i = 0; i < SOURCES.length; i++) if (SOURCES[i].id === id) return SOURCES[i]; return null; }

  function lang() { return (HL.i18n && HL.i18n.current) ? HL.i18n.current() : (HL.lang || "zh-Hant"); }
  function matcher() { return (HL.release && HL.release.matches) ? HL.release.matches : null; }

  /* 查詢：即時求值 → 過濾（enabled／窗口／受眾）→ 排序 → 依當前語言解析。
   * 回傳每則＝`{ ...解析後的 payload, id, type }` ⇒ 渲染端（promoCard）拿到的欄位與遷移前逐位相同。 */
  function list(type) {
    var n = Date.now(), m = matcher();
    var ctx = (m && HL.release.audienceCtx) ? HL.release.audienceCtx() : {};
    var lg = lang();
    var hit = SOURCES.filter(function (d) { return (!type || d.type === type) && visibleAt(d, n, ctx, m); });
    return sortDescs(hit).map(function (d) {
      var out = resolveLocale(d, lg);
      out.id = d.id; out.type = d.type;
      return out;
    });
  }

  function types() { var out = [], k; for (k in TYPES) if (Object.prototype.hasOwnProperty.call(TYPES, k)) out.push(k); return out; }
  function counts() {
    var out = {};
    types().forEach(function (k) { out[k] = { registered: 0, visible: list(k).length }; });
    SOURCES.forEach(function (d) { if (out[d.type]) out[d.type].registered++; });
    return out;
  }

  HL.content = {
    register: register, unregister: unregister, get: get, list: list, sources: sources,
    types: types, counts: counts, TYPES: TYPES,
    // 純函式出口（與 node 同一份；供測項與日後後台預覽「某時刻/某受眾看到什麼」）
    phaseOf: phaseOf, visibleAt: visibleAt, resolveLocale: resolveLocale, needsLocale: needsLocale
  };

  SEED.forEach(register);          // 種子上架（一則一行；日後改由後台/後端餵）

  /* 瀏覽器端測項：只驗「註冊表在瀏覽器裡真的被用起來」——純函式不變量在 node 端
   * （tests/checks-platform.js 的 content/* 四鎖），刻意不把測項散文放進首屏。 */
  function registerTests(st) {
    if (!st || !st.register) return;
    st.register({
      id: "content/wired", group: "platform", env: "browser", tier: "fast",
      title: "內容註冊表確實被兩條促銷輪播消費（#61 容器非孤兒）",
      run: function (t) {
        t.ok(counts()["lobby-promo"].registered >= 6, "大廳促銷內容應已上架 ≥6 則");
        t.ok(counts()["casino-promo"].registered >= 6, "娛樂城廣告牌內容應已上架 ≥6 則");
        var lob = String(HL.views && HL.views.lobby && HL.views.lobby.render);
        t.ok(lob.indexOf("HL.mock.promos") < 0, "lobby 不得再讀 HL.mock.promos（第二份真相）");
        t.ok(!register({ id: "__bad", type: "nope", payload: {} }), "未登記型別必須被拒（打錯 type 不可靜默消失）");
        t.equal(get("__bad"), null, "被拒的註冊不得進入註冊表");
        var one = list("lobby-promo")[0];
        t.ok(!!one && !!one.title && !!one.id, "查詢結果須帶 id 與解析後文案");
      }
    });
  }
  if (HL.selftest) registerTests(HL.selftest);
  else (HL._selftestQ = HL._selftestQ || []).push(registerTests);
})(typeof window !== "undefined" ? window : this);

/*
 * Apex Win｜紅利壽命軸 HL.bonusTtl（自我進化引擎 #71）
 * ─────────────────────────────────────────────────────────────────────
 * 對標 **BetPanda 2026-08-05 刷新**：其歡迎禮明碼寫出「80× 流水、**7 天內未達標即失效**」，
 *   且每日 rakeback / 每週 cashback 有固定的入帳時鐘 ⇒ 業界的紅利同時有「門檻」與「壽命」。
 *
 * 【缺口】ApexWin 的 `HL.bonus`（core/progress.js）只有門檻、沒有壽命：`entries`（待解鎖紅利，
 *   逐筆 `{amt, req, prog}`）**一個時間欄位都沒有**，可以無限期躺著。而同一站內**已有兩個逾期
 *   作廢先例**——`HL.rakeback` 每日桶跨日作廢、#33 `HL.cashback` 跨週作廢 ⇒ 主軸 `HL.bonus`
 *   反而是唯一沒有壽命的送幣出口。這不是路線爭議，是房規漏了一處。
 *
 * 【容器先於內容】本檔只是一張**依「送幣來源」註冊的壽命描述子表**，一分錢都不新增：
 *     register({ id, label, days, daysLive, note })
 *   `id` 直接就是 `badd(n, {source})` 的 **source 字串**（沿用單一真相，不另立第二套 key）
 *   ⇒ 「某個送幣來源要有壽命」＝加一筆註冊，`badd`／`bOnWager`／領取中心**一行都不改**。
 *
 * 【四條刻意的紀律】
 *   ① **預設永不到期**：未註冊的來源 `daysFor()` 回 0＝∞。22 個既有送幣來源中只有本輪明列的
 *      幾個會有壽命，其餘**逐位如舊** ⇒ 零回歸不靠比對而靠「查不到就不寫欄位」。
 *   ② **壽命在授予當下凍結**：`exp` 由 `badd()` 求值一次寫進 entry，之後**只讀不重算**
 *      （比照 #74 對 `req` 的處置）⇒ 改表不追溯縮短既有紅利的壽命＝信任紅線。
 *      連帶：改版前存下的舊 entry **沒有 `exp` 欄位 ⇒ 永不到期**，不會被追溯銷毀。
 *   ③ **只碰 entries、碰不到 unlocked**：`sweep(entries, now)` 的簽章裡**根本沒有 unlocked**
 *      ⇒ 卡上那條紅線「已達流水標準而轉入 unlocked 的錢不得因原 entry 的 TTL 被回頭作廢」
 *      是**結構上做不到**，而不是靠一句斷言。（entry 一旦達標就被 `entries.shift()` 移出，
 *      TTL 從此夠不著它。）
 *   ④ **真站不得比假站寬鬆**（§11 成本方向）：到期作廢**降低**送幣成本 ⇒ 真站壽命必須
 *      ≤ 假站。`daysLive` 未宣告時恆等於 `days` ⇒ 該不變量是**恆等式**而非宣稱
 *      （沿 #63 sla／#89 wagerScope 形制，見測項 live-never-looser）。
 *
 * 【本輪刻意不做的一半（據實記，非漏做）】卡上另提「`unlocked`（可領取獎金）也加壽命」。
 *   **不做**，理由有二：(1) `unlocked` 目前是**單一純量**、沒有逐筆授予紀錄，要讓它到期得先把它
 *   改成第二本 ledger＝資料模型變更，且那是「銷毀玩家已經賺到、隨時可領的錢」＝本卡風險最高的
 *   一種變體，該由船長裁決而非引擎自行開啟；(2) 若只先塞一個 `uat` 時戳等以後用，就會長出一個
 *   **零讀取的死欄位**——維護軌 08-17 00:00 窗剛開的 T34 卡（`HL.rg` hint 死欄位）正是同一種病
 *   ⇒ 不預留、要做時再加。
 *
 * 雙環境契約（比照 #50 edge／#63 sla／#89 wagerScope）：純資料/純函式區以 `module.exports`
 *   暴露供 node 直接 require ⇒ `prototype/tests/run.js` 驗的即瀏覽器跑的同一份。
 * 註冊於 window.HL.bonusTtl = { register, get, ids, daysFor, msFor, expAt, sweep, dueSoon, describe, ... }。
 */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var HL = isNode ? null : (global.HL = global.HL || {});

  // ===================== 純資料/純函式區（node 可 require · 無 DOM／localStorage 相依）=====================

  var DAY = 86400000;
  var WARN_MS = DAY;          // 到期前多久提醒（卡上不變量 (a)：不得靜默蒸發）
  var NEVER = 0;              // 0 ＝ 永不到期（∞），刻意不用 Infinity：JSON 往返會變 null

  var POLICIES = {};          // { [source]: {id,label,days,daysLive,note} }

  function define(spec) {
    var days = Math.max(0, Math.round(+spec.days || 0));
    var live = (spec.daysLive == null) ? days : Math.max(0, Math.round(+spec.daysLive || 0));
    POLICIES[spec.id] = { id: spec.id, label: spec.label || spec.id, days: days, daysLive: live, note: spec.note || "" };
    return POLICIES[spec.id];
  }

  /* 註冊一種來源的壽命。回 null＝被拒（沒有 id，或壽命宣告無效）。 */
  function register(spec) {
    if (!spec || !spec.id) return null;
    if (spec.days == null && spec.daysLive == null) return null;   // 什麼都沒宣告的空殼
    return define(spec);
  }

  function get(source) { return (source != null && POLICIES[source]) || null; }
  function ids() { return Object.keys(POLICIES).sort(); }
  function count() { return ids().length; }

  /* 某來源在某站別的壽命（天）。查無＝0＝永不到期（紀律 ①）。 */
  function daysFor(source, mode) {
    var p = get(source);
    if (!p) return NEVER;
    return (mode === "live") ? p.daysLive : p.days;
  }
  function msFor(source, mode) { return daysFor(source, mode) * DAY; }

  /* 授予當下求值一次的絕對到期時戳。0＝不到期（呼叫端據此**不寫 exp 欄位**）。 */
  function expAt(source, mode, now) {
    var ms = msFor(source, mode);
    return ms > 0 ? (now + ms) : NEVER;
  }

  /* 逾期清理（純函式）。**簽章裡沒有 unlocked**＝紀律 ③ 的本體。
   *   回 { kept, expired }；兩者都是新陣列，原陣列一律不動（呼叫端自己決定要不要換掉）。
   *   沒有 `exp` 欄位的 entry（舊存檔／不到期來源）恆留下 ⇒ sweep 對現況是 identity。 */
  function sweep(entries, now) {
    var kept = [], expired = [];
    entries = entries || [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e && e.exp > 0 && e.exp <= now) expired.push(e); else kept.push(e);
    }
    return { kept: kept, expired: expired };
  }

  /* 即將到期、且**尚未提醒過**的筆數（entry 上以 `wn:1` 標記已提醒，避免每次載入都轟炸）。
   *   純函式：只回索引清單，標記由呼叫端寫（讓「誰能改存檔」保持單一）。 */
  function dueSoon(entries, now, withinMs) {
    var out = [];
    withinMs = (withinMs == null) ? WARN_MS : withinMs;
    entries = entries || [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e && e.exp > 0 && !e.wn && e.exp > now && (e.exp - now) <= withinMs) out.push(i);
    }
    return out;
  }

  /* 剩餘壽命（ms）。不到期回 null ⇒ 呼叫端不顯示任何多餘的行（零視覺回歸，同 #89 scope 的處置）。 */
  function leftMs(entry, now) {
    if (!entry || !(entry.exp > 0)) return null;
    return Math.max(0, entry.exp - now);
  }

  /* 唯讀純值副本（#90 `HL.econCfg` 契約：改它不會改到旋鈕本體）。 */
  function describe() {
    return ids().map(function (id) {
      var p = POLICIES[id];
      return { key: p.id, label: p.label, demoDays: p.days, liveDays: p.daysLive, note: p.note };
    });
  }

  /* ===================== 首批壽命（資料，不是機制）=====================
   * 選件原則：只給「本來就有週期性、玩家預期它會過期」的來源。一次性大額（VIP 升級金／
   *   錦標賽獎金／兌換碼）**刻意不給壽命**——那些是玩家「賺到的」而非「發到的」。
   * 假站寬鬆（留存展示要看得見時鐘，但不至於逼人上線）、真站取業界值（§11 成本收斂）。
   * 恆等式檢查：每一筆都 daysLive ≤ days（0 視為 ∞＝最寬鬆，見 live-never-looser 測項）。 */
  define({ id: "每日簽到",         label: "每日簽到里程碑", days: 60, daysLive: 30, note: "簽到里程碑紅利，未打完流水即失效" });
  define({ id: "每日任務",         label: "每日任務獎金",   days: 30, daysLive: 7,  note: "任務獎金，逾期未達標即失效" });
  define({ id: "Reload 週期紅利",  label: "Reload 週期紅利", days: 30, daysLive: 7,  note: "對標 BetPanda 歡迎禮 7 天期限" });
  define({ id: "新手禮包",         label: "新手禮包",       days: 60, daysLive: 14, note: "新手期紅利，逾期失效" });
  define({ id: "幸運轉盤",         label: "幸運轉盤獎金",   days: 30, daysLive: 7,  note: "轉盤送幣，逾期失效" });
  define({ id: "紅包雨 Rain",      label: "紅包雨",         days: 14, daysLive: 3,  note: "高頻小額，壽命最短" });

  var CORE = {
    DAY: DAY, WARN_MS: WARN_MS, NEVER: NEVER,
    register: register, get: get, ids: ids, count: count,
    daysFor: daysFor, msFor: msFor, expAt: expAt,
    sweep: sweep, dueSoon: dueSoon, leftMs: leftMs, describe: describe,
    _POLICIES: POLICIES
  };

  // ===================== 測項（雙環境同一份定義）=====================
  function registerTests(st) {
    if (!st || !st.register) return;

    st.register({
      id: "bonusTtl/zero-regression-default", group: "bonusTtl",
      title: "#71 (紀律①)：未註冊來源永不到期，且 sweep 對無 exp 的存檔是 identity",
      run: function (t) {
        t.equal(daysFor("錦標賽獎金", "demo"), 0, "未註冊來源在假站不得有壽命");
        t.equal(daysFor("錦標賽獎金", "live"), 0, "未註冊來源在真站也不得有壽命");
        t.equal(daysFor(undefined, "live"), 0, "沒帶 source 的紅利不得有壽命");
        t.equal(expAt("錦標賽獎金", "live", 1000), 0, "不到期來源的 expAt 應回 0（呼叫端據此不寫 exp 欄位）");
        // 舊存檔（無 exp）＝改版前的資料形狀，必須逐筆原樣留下
        var old = [{ amt: 100, req: 100, prog: 0 }, { amt: 50, req: 50, prog: 10 }];
        var r = sweep(old, 9e15);
        t.equal(r.expired.length, 0, "無 exp 欄位的舊 entry 在任何時點都不得被清掉");
        t.equal(r.kept.length, 2, "舊 entry 應全數留下");
        t.equal(JSON.stringify(r.kept), JSON.stringify(old), "留下的 entry 必須逐位相同（不得被補欄位）");
        t.equal(sweep([], 1).kept.length, 0, "空 ledger 不得出錯");
        t.equal(sweep(null, 1).expired.length, 0, "null ledger 不得出錯");
      }
    });

    st.register({
      id: "bonusTtl/no-unlocked-reachability", group: "bonusTtl",
      title: "#71 (紀律③·卡上紅線)：TTL 夠不著 unlocked——sweep 只認得 entries 陣列",
      run: function (t) {
        // 結構證明：sweep 是一元純函式（entries, now），沒有任何形式的 unlocked 入口
        t.equal(sweep.length, 2, "sweep 的簽章必須只有 (entries, now)＝拿不到 unlocked");
        // 行為證明：一筆早就過期的 entry，清掉它不會產生任何「回頭扣錢」的輸出
        var st0 = { unlocked: 5000, entries: [{ amt: 300, req: 300, prog: 300, exp: 10 }, { amt: 7, exp: 0 }] };
        var snap = JSON.stringify(st0.entries);
        var r = sweep(st0.entries, 1e9);
        t.equal(r.expired.length, 1, "過期 entry 應被挑出");
        t.equal(st0.unlocked, 5000, "sweep 不得改動呼叫端的 unlocked");
        // 逐位快照比對：長度沒變還不夠，補欄位／改值也是就地改動（首輪負向擾動實測靠長度檢查抓不到）
        t.equal(JSON.stringify(st0.entries), snap,
          "sweep 不得以任何形式就地改動原陣列（長度、元素、欄位皆然——呼叫端自己決定換不換）");
        t.ok(!("unlocked" in r), "sweep 的回傳值裡不得有 unlocked 這個概念");
        // 卡上情境：已達流水而轉入 unlocked 的錢 —— 它已被 entries.shift() 移出 ledger，
        //   TTL 的作用域是 entries，因此**不存在任何路徑**能回頭作廢它。
        var afterShift = { unlocked: 5300, entries: [] };
        var r2 = sweep(afterShift.entries, 9e15);
        t.equal(r2.expired.length, 0, "已解鎖轉出後 ledger 為空，任何時點都不得有可作廢對象");
        t.equal(afterShift.unlocked, 5300, "已解鎖金額必須原封不動");
      }
    });

    st.register({
      id: "bonusTtl/live-never-looser", group: "bonusTtl",
      title: "#71 (紀律④·§11)：真站壽命不得比假站長（0＝∞ 視為最寬鬆）",
      run: function (t) {
        var d = describe();
        t.ok(d.length >= 6, "首批壽命至少 6 筆（實測 " + d.length + "）");
        d.forEach(function (p) {
          var demoInf = p.demoDays === 0, liveInf = p.liveDays === 0;
          t.ok(!(liveInf && !demoInf), p.key + "：真站不得永不到期而假站會到期（那是真站更寬鬆）");
          if (!demoInf && !liveInf) {
            t.ok(p.liveDays <= p.demoDays, p.key + "：真站壽命 " + p.liveDays + "d 不得長於假站 " + p.demoDays + "d");
          }
          t.ok(p.demoDays > 0, p.key + "：既然註冊了就必須真的有壽命（否則是死註冊）");
          t.ok(!!p.label && !!p.note, p.key + "：必須有可顯示片語與說明（面板不得靜默蒸發）");
        });
        // daysLive 未宣告時是恆等式，不是宣稱
        register({ id: "_t_ttl", label: "測試", days: 9 });
        t.equal(daysFor("_t_ttl", "live"), daysFor("_t_ttl", "demo"), "未宣告 daysLive 時兩站別必須恆等");
        delete POLICIES._t_ttl;
      }
    });

    st.register({
      id: "bonusTtl/expiry-and-warning", group: "bonusTtl",
      title: "#71 (不變量 a)：到期判定以凍結的 exp 為準 + 到期前會提醒且只提醒一次",
      run: function (t) {
        var now = 1000000;
        var soon = { amt: 100, req: 100, prog: 0, exp: now + 3600000 };        // 1h 後到期
        var far = { amt: 100, req: 100, prog: 0, exp: now + 30 * DAY };
        var dead = { amt: 100, req: 100, prog: 0, exp: now - 1 };
        var list = [soon, far, dead];
        var r = sweep(list, now);
        t.equal(r.expired.length, 1, "只有真的過期的那筆該被清");
        t.equal(r.expired[0].exp, dead.exp, "清掉的應是 exp 已過的那筆");
        t.equal(r.kept.length, 2, "未到期的兩筆必須留下");
        // 邊界：exp 恰等於 now 視為已到期（與 rakeback 日桶「跨過即作廢」同口徑）
        t.equal(sweep([{ amt: 1, exp: now }], now).expired.length, 1, "exp === now 應判為已到期");
        var warn = dueSoon(list, now);
        t.equal(warn.length, 1, "只有 24h 內到期的才提醒（實測 " + warn.length + "）");
        t.equal(warn[0], 0, "應指向 soon 那筆的索引");
        soon.wn = 1;
        t.equal(dueSoon(list, now).length, 0, "標記過的不得重複提醒");
        t.equal(dueSoon([dead], now).length, 0, "已經過期的不再算「即將到期」（走作廢路徑而非提醒）");
        // leftMs：不到期回 null ⇒ 面板不多出任何一行
        t.equal(leftMs({ amt: 1 }, now), null, "不到期的 entry 不得產生倒數行");
        t.equal(leftMs(far, now), 30 * DAY, "剩餘壽命應可精確求值");
        t.equal(leftMs(dead, now), 0, "已過期的剩餘壽命夾到 0，不得為負");
      }
    });

    st.register({
      id: "bonusTtl/registry-is-the-knob", group: "bonusTtl",
      title: "#71 (容器優先)：加一種壽命＝加一筆註冊；describe() 不洩漏可寫參考",
      run: function (t) {
        var before = count();
        t.ok(!!register({ id: "_t_reg", label: "測試來源", days: 5, daysLive: 2, note: "n" }), "合法註冊應被接受");
        t.equal(count(), before + 1, "註冊後應 +1");
        t.equal(daysFor("_t_reg", "live"), 2, "新註冊應立即可取用");
        t.equal(register({ id: "_t_reg2" }), null, "沒宣告壽命的空殼應被拒");
        t.equal(register(null), null, "空註冊應被拒");
        delete POLICIES._t_reg;
        t.equal(count(), before, "清理後應回復");
        var d1 = describe(), d2 = describe();
        d1[0].liveDays = 999;
        t.ok(d2[0].liveDays !== 999, "describe() 回傳值被改動不得影響表本身");
        t.ok(get(d1[0].key).daysLive !== 999, "describe() 不得洩漏可寫入的參考");
        // 來源 key 必須就是 badd 的 source 字串（不另立第二套 key）
        t.ok(get("每日簽到") && get("每日簽到").days > 0, "註冊 key 應直接是 badd 的 source 字串");
      }
    });
  }

  if (isNode) {
    module.exports = CORE;
    try { registerTests(require("./selftest.js")); } catch (e) {}
    return;
  }

  // ===================== 以下為瀏覽器區 =====================
  HL.bonusTtl = CORE;
  registerTests(HL.selftest);

  /* #90：向 `HL.econCfg` 註冊自我描述——壽命是**降低送幣成本**的旋鈕（逾期作廢＝成本回沖），
   *   宣告 strict 讓「真站不得比假站寬鬆」這條 §11 紀律由描述子自動被盯住。
   *   ⚠️ 值一律當場從 `describe()` 求值，不手抄（#90 紀律②）。 */
  if (HL.econCfg && HL.econCfg.register) {
    HL.econCfg.register({
      id: "bonus-ttl", label: "紅利壽命（逾期作廢）", icon: "⏳", order: 55,
      describe: function () {
        // strict:"le" ＝送幣型：壽命越短送幣成本越低 ⇒ 真站須 ≤ 假站。
        // ⚠️ `0`（＝永不到期＝最寬鬆）在數值上會小於任何天數，econCfg 的通則表達不了 ∞；
        //    ∞ 這一側由本檔自己的 `bonusTtl/live-never-looser` 測項守（首批六筆兩站皆 >0，實務上不觸及）。
        return describe().map(function (p) {
          return { key: p.key, label: p.label, demo: p.demoDays, live: p.liveDays, unit: " 天", strict: "le", note: p.note };
        });
      }
    });
  }

  /* #72：說明中心——壽命屬於「玩家有權事先知道」的條款（卡上不變量 (b)：面板必須明示壽命）。 */
  if (HL.support && HL.support.register) {
    HL.support.register({
      id: "bonus/ttl", cat: "bonus", order: 12,
      title: "紅利有效期限",
      keys: ["紅利", "到期", "有效期", "失效", "expire", "ttl", "壽命"],
      // 值一律當場求值（#72 契約：說明讀該模組的當下真值、不手抄）
      body: function () {
        var live = !!(HL.site && HL.site.isLive());
        var rows = describe().map(function (p) { return p.label + "（" + (live ? p.liveDays : p.demoDays) + " 天）"; });
        return "部分紅利有有效期限：" + rows.join("、") + "。"
             + "逾期前一天會發通知提醒；逾期仍未打完流水的「待解鎖紅利」將作廢。"
             + "已轉為「可領取獎金」的部分不受期限影響，可以放著慢慢領。"
             + "未列出的紅利來源沒有期限。期限在紅利發放當下就固定寫入該筆，日後調整規則不會回頭縮短既有紅利。";
      },
      action: { label: "開啟獎金錢包", run: function () { if (HL.bonus) HL.bonus.open(); } }
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

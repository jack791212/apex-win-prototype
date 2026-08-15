/*
 * Apex Win｜遊戲體感特徵側表 + 大廳分群軸設定  #94
 * ---------------------------------------------------------------------------
 * 這是 `core/game-axes.js`（容器）唯一的內容來源。**新增一條軸 = 在本檔加一筆 register，不必動任何 render。**
 *
 * ── 為什麼是側表而不是寫進各遊戲的 register meta ────────────────────────────
 * 大廳卡有兩份 meta 必須逐欄一致（#80 延遲載入：`data/lazy-games.js` 清單 vs view 檔自己的
 * `HL.games.register`，`platform/lazy-games-meta-parity` 常駐鎖著），欄位加在那邊就得**兩處同步加 22 次**。
 * 側表只有一份、以 id 為鍵，而 `HL.gameAxes.valueOf` 又讓「遊戲自己的 meta 優先」——
 * 所以遊戲軌日後想把某款的值搬回它自己的 view 檔，直接加欄位即可生效，大廳一行都不用改。
 *
 * ── 誰是權威（#94 卡上「跨軌，宜先談好誰是權威」的答覆）────────────────────
 *   `pace`（互動節奏）＝**平台軌**擁有。它是**互動結構**、不是數學：判定只需讀該遊戲有沒有「局中兌現」控制，
 *       任何人都能用一行 grep 複驗（見下方 RUBRIC 與 `platform/game-axes-pace-rubric` 測項）。
 *   `volatility` / `rtp` ＝**遊戲軌**擁有。它們要蒙地卡羅或解析證明，平台軌無權代填。
 *
 * ── ⚠️ 為什麼本表刻意**沒有** `rtp` 欄位（#94 卡的不變量 (d) 落地時被推翻的部分）─────
 * 卡上寫「rtp 的值必須與 games-catalog.json 的 gate_log 對得上（反向鎖：不得在 UI 端自己編數字）」。
 * 實作時查證兩件事，使那條鎖**不能照字面建**、而它要防的事**另有更近的答案**：
 *   (1) `intel/db/games-catalog.json` 的 `gate_log` 是**自由散文**（整段敘述，非結構化欄位），
 *       且 intel/ 不被前端服務 ⇒ 無法逐位比對。
 *   (2) 更重要的是：**RTP 早就有一份玩家看得到的真相**——各遊戲 view 內的
 *       `HL.ui.gameInfoBar({ rtp: "96.27%" })`。在本表再抄一次＝製造第二份真相（正是 #90 在根除的東西），
 *       而且是**會漂移的那一種**（遊戲軌改了賠付表只會去改 gameInfoBar，不會想到來改大廳側表）。
 * ⇒ 處置：本表不收 `rtp`（由 `platform/game-axes-no-second-rtp` 反向鎖擋住往後偷加），
 *   RTP 軸要落地的前提是**先把 gameInfoBar 的 rtp 變成可列舉的資料**（已開卡，見 BACKLOG #98）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  /* ── pace 判準（RUBRIC）：一局之內玩家要做幾次決定 ──────────────────────────
   *   instant  一鍵見分：下注 → 一次操作就出結果，局中無決策點。
   *   stepwise 逐步兌現：一局內可以一直「再開一格 / 再爬一層」，**且隨時能收手落袋**。
   *   pending  等待開獎：結果不在當下產生（跨時段結算）。
   * 機械判定：`stepwise` ⟺ 該遊戲的 view 檔有「局中兌現」控制（`兌現`/`cash out`）。
   *   實測 24 款只有 6 款有：crash-x／mines（instant-crash-mines.js）、chicken-cross、pump、towers、hilo。
   *   ⚠️ `picks` 曾被憑印象歸為 pending（「賽事預測要等賽果」），讀碼才發現它 `betBtn → settle()`
   *      **當下就結算**（站內 mock 賽程，不接真實賽事 feed）⇒ 正確歸 instant。
   *      pending 桶保留在設定裡但目前 0 款 ⇒ 依容器規則**不會渲染**（這正是「空的不出現」的實證）。
   */
  var STEPWISE = ["crash-x", "mines", "chicken-cross", "pump", "towers", "hilo"];
  var INSTANT = [
    "dice", "limbo", "plinko", "keno", "cases", "dice-duel", "picks",
    "baccarat", "european-roulette", "sic-bo", "dragon-tiger", "andar-bahar", "money-wheel",
    "pirots", "dead-by-noon", "golden-toad", "gem-storm", "shadow-ritual"
  ];

  var _t = {};
  function put(id, key, val) { (_t[id] = _t[id] || {})[key] = val; }
  STEPWISE.forEach(function (id) { put(id, "pace", "stepwise"); });
  INSTANT.forEach(function (id) { put(id, "pace", "instant"); });

  function idOf(g) { return typeof g === "string" ? g : (g && g.id) || null; }
  function get(g) { var id = idOf(g); return (id && _t[id]) || null; }
  function value(g, field) { var r = get(g); return r ? r[field] : null; }
  function ids() { return Object.keys(_t); }
  // 供同仁自製遊戲/後續軌補值：不覆寫已有值以外的欄位，一款一欄位獨立
  function set(id, traits) { if (!id || !traits) return false; Object.keys(traits).forEach(function (k) { put(id, k, traits[k]); }); return true; }

  HL.gameTraits = { get: get, value: value, ids: ids, set: set, RUBRIC_STEPWISE: STEPWISE.slice() };

  /* ── 軸設定（內容）。加一條新軸＝在這裡多一個 register，render 一行都不用改 ── */
  if (HL.gameAxes) {
    HL.gameAxes.register({
      key: "pace", label: "節奏", field: "pace", order: 10,
      buckets: [
        { key: "instant", label: "⚡ 一鍵見分", order: 1 },
        { key: "stepwise", label: "🎚️ 逐步兌現", order: 2 },
        { key: "pending", label: "⏳ 等待開獎", order: 3 }   // 目前 0 款 ⇒ 依容器規則不渲染
      ]
    });
  }
})(window);

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
 * ── ⚠️ 為什麼本表**到今天仍然沒有存任何一個 rtp 值**（#94 不變量 (d) 的演化史，勿刪）─────
 * 【2026-08-17 更新（#102）】RTP 軸已上線，但**本表依然一個 RTP 數字都沒有**——它走上面的
 *   `DERIVED.rtp`＝求值時才向 `HL.gameRtp`（#98 的單一真相）要。所以下面這段當年的推理**結論未變、
 *   只有前提變了**：當年沒有可查詢的來源，所以整條軸不能做；現在有了，所以軸能做、而副本仍然不准存。
 *   （另一件當年不知道的事：真正卡住這條軸的不是「有沒有來源」，而是**來源的覆蓋率**——見下方軸註解。）
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
   *   實測只有 7 款有：crash-x／mines（instant-crash-mines.js）、chicken-cross、pump、towers、hilo、moles。
   *   ⚠️ `picks` 曾被憑印象歸為 pending（「賽事預測要等賽果」），讀碼才發現它 `betBtn → settle()`
   *      **當下就結算**（站內 mock 賽程，不接真實賽事 feed）⇒ 正確歸 instant。
   *      pending 桶保留在設定裡但目前 0 款 ⇒ 依容器規則**不會渲染**（這正是「空的不出現」的實證）。
   */
  var STEPWISE = ["crash-x", "mines", "chicken-cross", "pump", "towers", "hilo", "moles"];
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

  /* ── 求值型欄位（#102）：值不存在本表裡，而是**當下向單一真相求得** ────────────────
   * `rtp` 刻意走這條路而不是 `put(id,"rtp",96.5)`：只要有一份副本就會漂移（本檔檔頭第 17–26 行
   * 記的正是這件事，而 `platform/game-axes-no-second-rtp` 反向鎖也擋著）。求值型欄位讓
   * 「大廳能依 RTP 分群」與「RTP 只有一份」同時成立——本表對 RTP 的值**一無所知**。
   * 缺登記者回 null ⇒ 依容器「缺值不進軸」自動不出現在任何桶（不必在此列例外清單）。 */
  var DERIVED = {
    rtp: function (id) { return (HL.gameRtp && HL.gameRtp.of(id)) || null; }
  };

  function value(g, field) {
    var id = idOf(g);
    if (!id) return null;
    if (DERIVED[field]) return DERIVED[field](id);
    var r = _t[id];
    return r ? r[field] : null;
  }
  function ids() { return Object.keys(_t); }
  // 供同仁自製遊戲/後續軌補值：不覆寫已有值以外的欄位，一款一欄位獨立
  function set(id, traits) { if (!id || !traits) return false; Object.keys(traits).forEach(function (k) { put(id, k, traits[k]); }); return true; }

  HL.gameTraits = { get: get, value: value, ids: ids, set: set, RUBRIC_STEPWISE: STEPWISE.slice() };

  /* ── 軸設定（內容）。加一條新軸＝在這裡多一個 register，render 一行都不用改 ── */
  if (HL.gameAxes) {
    HL.gameAxes.register({
      key: "pace", label: "節奏", field: "pace", order: 10,
      // #106：軸自己交代「值打哪來」，供說明中心印給玩家（容器不得認識任何一條軸的名字，故收在這裡）
      source: "依該遊戲的互動結構判定（局中有沒有可兌現的控制），一行 grep 即可複驗",
      buckets: [
        { key: "instant", label: "⚡ 一鍵見分", order: 1 },
        { key: "stepwise", label: "🎚️ 逐步兌現", order: 2 },
        { key: "pending", label: "⏳ 等待開獎", order: 3 }   // 目前 0 款 ⇒ 依容器規則不渲染
      ]
    });

    /* ── 回報率軸（#102）。值走上面的 DERIVED＝向 HL.gameRtp 求，本檔不存任何一個數字 ──
     * 桶界只是**級距**（不是某款遊戲的值），級距選法：讓每一桶都對應玩家真的分得出來的差別——
     *   99%+ ＝ originals 家族（edge 常數 1%）／98–99% ＝ 抽水略高的變體（cases 1.5%、pump 2%）／
     *   96–98% ＝ slot 與 chicken（3.5–4% 級）。
     * ⚠️ **本軸的上線條件是「覆蓋率」而不是「容器就緒」**：容器 08-15 就好了，但當時 `HL.gameRtp`
     *   只登記 7 款，而**沒登記的那批恰好是全站 RTP 最高的 10 款 originals**（99%）⇒ 那時上線
     *   會長出一條「最高 RTP」桶裡沒有最高 RTP 遊戲的軸＝比沒有這條軸更糟。#102 實作當輪先把
     *   那 10 款登記進單一真相（見 game-rtp.js 該批註解）才讓本軸見光。
     * 目前覆蓋 16/24 可玩遊戲；未覆蓋者（plinko＝無單值、桌遊六款＝每注型不同、shadow-ritual＝已知為假）
     *   依容器規則**不進任何桶**，不會被塞進某一格假裝有值。 */
    HL.gameAxes.register({
      key: "rtp", label: "回報率", field: "rtp", order: 20,
      // #106：同上。措辭刻意不含任何數字——本檔一出現「回報率＋數字」就是第二份真相（既有反向鎖會擋）。
      source: "值一律當場向平台宣告的回報率單一真相求得（與各遊戲資訊列同一份資料，大廳不另存副本）",
      buckets: [
        { key: "top", label: "💎 RTP 99%+", order: 1, is: function (v) { return v >= 99; } },
        { key: "high", label: "🟢 RTP 98–99%", order: 2, is: function (v) { return v >= 98 && v < 99; } },
        { key: "mid", label: "🔵 RTP 96–98%", order: 3, is: function (v) { return v >= 96 && v < 98; } }
      ]
    });
  }
})(window);

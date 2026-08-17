/*
 * Apex Win｜宣告 RTP 單一真相登記表 HL.gameRtp  #98
 * ---------------------------------------------------------------------------
 * 【這張卡要解決的事】各遊戲把自己的 RTP 寫在 `HL.ui.gameInfoBar({ rtp: "96.27%" })` 裡——
 * 那是**字串**、而且寫在 `render()` 內部（只有玩家點進那款遊戲的當下才存在）⇒
 * 站內沒有任何一段程式碼能問出「哪些遊戲的 RTP ≥ 96.5%」。這擋住了 #94 的 RTP 軸，
 * 也擋住了儀表板健檢、說明中心 RTP 一覽、與 #50 `HL.edge` 對帳。
 *
 * ── ⚠️ 實作當輪查證：卡上的前提「只是顯示字串」講少了一半（範圍比卡上寬）────────
 * 宣告 RTP **早就有第二份機器可讀的副本**，只是不在前端：`prototype/tests/checks-games.js`
 * 的 `GAMES[].declaredRTP`（4 款）＋各 deep 測項內的裸字面量（0.963／0.965／0.96145…）。
 * 也就是說 migration 前這個數字散在**三處**：玩家看到的字串、檔頭與買入價推導的註解、測試表。
 * ⇒ 若照卡上字面「把字串改成數字」而不收斂，只會多造出**第四份**。本檔因此是**唯一真相**：
 *   view 的 `gameInfoBar` 讀它、`checks-games.js` 的契約表也讀它（不再自帶 `declaredRTP`）。
 *
 * ── ✅ 那個分歧已裁決（pirots · #99 · 2026-08-16 遊戲軌）───────────────────────
 *   曾經：玩家看到 `rtp:"96.0%"`，但買入價 `buyPrice: 103.7`(＝99.68/0.96145)、deep 鎖、
 *   `edge.js` 3.855 全對齊 **96.145%** ⇒ 同一款遊戲 repo 內宣稱兩個 RTP，且方向恰是保真閘
 *   第 14 項要防的形狀（玩家以為基礎 96.0%、買入路徑實得 99.68/103.7＝96.123% ⇒ 買入看起來划算）。
 *   ⇒ 依 #94 定案 `rtp` 屬**遊戲軌**權威。遊戲軌裁定：**標稱收斂到 96.145%**（買入價/deep/edge
 *   四處都已用它、只有顯示是離群值；且 250M×5 種子真值 96.187% 落其 +0.042pp）。**只動顯示、不動
 *   買入價**（動買入價＝動玩家真付的錢；96.0% 反推需 103.8×）。裁後基礎(96.145%)≥買入(96.123%)＝
 *   假象消除。`rtp` 與 `gateRtp` 現同值，`KNOWN_DIVERGENCE` 白名單已清空（divergence-pinned 鎖回到
 *   「任何分歧一出現就紅」）。
 *
 * ── 為什麼登記表放在「一定會載入」的 data 層，而不是各遊戲自己 export ────────────
 * 遊戲 view 是**延遲載入**的（#80 `HL.lazyGames`，22 款）。若數字只存在 view 的 CFG 裡，
 * 大廳要列舉就得先把 22 個模組全載回來＝正是 #80 花 -221KB／-19 支去解掉的東西。
 * ⇒ 數字住在這裡（永遠載入、很小），view 反過來讀它顯示。**仍然只有一份。**
 *
 * ── 誰不在這張表裡（重要，不是漏了）───────────────────────────────────────────
 *   `shadow-ritual`（`views/slot.js`）顯示 `rtp:"~97%（基礎連爆）"`，但 DEBT `S-slot-rtp`
 *   已實測 full RTP＝**1132.68%**（特色回合未校準）。把它登記進來＝**把一個已知為假的數字
 *   鑄成可查詢的 API**，之後 RTP 軸會把旗艦排在 97% 那一格。⇒ 刻意不登記（字串照舊顯示，
 *   漸進遷移本來就允許未遷移者續傳字串），並由 `platform/game-rtp-no-false-claim` 鎖住，
 *   等 `S-slot-rtp` 重平衡完成才可登記。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var isNode = typeof module !== "undefined" && module.exports;

  var _r = {};      // id → entry
  var _order = [];

  /* rtp／gateRtp 皆為**百分比數值**（96.27 而非 0.9627）——與玩家看到的單位一致，
   * 少一層換算就少一個「差 100 倍」的出錯面。basis 說明這個數字是怎麼來的，禁止裸數字。 */
  function declare(id, spec) {
    if (!id || !spec || typeof spec.rtp !== "number" || !isFinite(spec.rtp)) return false;
    if (!_r[id]) _order.push(id);
    _r[id] = {
      id: id,
      rtp: spec.rtp,
      gateRtp: typeof spec.gateRtp === "number" ? spec.gateRtp : spec.rtp,
      basis: spec.basis || "unknown",
      note: spec.note || ""
    };
    return true;
  }

  function of(id) { var e = _r[id]; return e ? e.rtp : null; }
  // 保真閘/買入價推導要對齊的值。與 of() 不同時代表 repo 內存在未裁決的分歧（見檔頭）。
  function gateOf(id) { var e = _r[id]; return e ? e.gateRtp : null; }
  function entry(id) { var e = _r[id]; return e ? { id: e.id, rtp: e.rtp, gateRtp: e.gateRtp, basis: e.basis, note: e.note } : null; }
  function ids() { return _order.slice(); }
  function list() { return _order.map(entry); }
  // 這就是本卡要解鎖的那個問題：「哪些遊戲的 RTP ≥ X」現在問得到了。
  function atLeast(x) { return _order.filter(function (id) { return _r[id].rtp >= x; }); }
  function edgeOf(id) { var v = of(id); return v == null ? null : round3(100 - v); }

  function round3(n) { return Math.round(n * 1000) / 1000; }
  /* 顯示格式：最多 3 位小數、去掉尾隨 0。刻意不統一補到固定位數——那會把現有
   * 「96.5%／96.27%」全改寫成「96.500%／96.270%」＝一次製造 8 處視覺回歸。 */
  function fmt(n) { return n == null ? "" : (round3(n) + "%"); }
  function rtpText(id) { var v = of(id); return v == null ? "" : fmt(v); }
  function edgeText(id) { var v = edgeOf(id); return v == null ? "" : fmt(v) + " 莊家優勢"; }

  function _reset() { _r = {}; _order = []; return API; }   // 測項用（瀏覽器端不呼叫）

  var API = {
    declare: declare, of: of, gateOf: gateOf, entry: entry, ids: ids, list: list,
    atLeast: atLeast, edgeOf: edgeOf, fmt: fmt, rtpText: rtpText, edgeText: edgeText,
    _reset: _reset
  };

  /* ── 內容（唯一真相）────────────────────────────────────────────────────────
   * 每筆的 basis 必須指得出證據：
   *   mc       ＝蒙地卡羅定案（樣本數與種子數見 checks-games.js 的 <game>/base-rtp 測項檔頭）
   *   analytic ＝封閉解析式（零抽樣誤差）
   *   design   ＝設計恆等式（賠付結構本身保證）
   */
  declare("pirots", {
    rtp: 96.145, gateRtp: 96.145, basis: "mc",
    note: "標稱 96.145%（＝買入價 103.7×＝99.68/0.96145、deep 鎖、edge.js 3.855 皆對齊此值）；250M×5 種子實測真值 96.187%（+0.042pp·±0.5pp 內·玩家實得略高於標稱）。原顯示 96.0% 係建置期 1M MC 校準的過時目標值，2026-08-16 遊戲軌 #99 裁定收斂到 96.145%（僅動顯示、不動買入價/經濟）＝基礎局(96.145%)不再低於買入路徑(99.68/103.7=96.123%)＝除去『買入看起來比基礎划算』的假象。"
  });
  declare("dead-by-noon", { rtp: 96.27, basis: "mc", note: "250M×5 種子 pooled 96.093%（-0.177pp，±0.5pp 內）" });
  declare("golden-toad", { rtp: 96.3, basis: "mc", note: "250M×5 種子 pooled 96.47%（+0.17pp）" });
  declare("gem-storm", { rtp: 96.5, basis: "mc", note: "50M×5 種子 pooled 96.72%（+0.22pp）" });
  declare("chicken-cross", {
    rtp: 97, basis: "analytic",
    note: "＝`HL.chicken.rtp`(0.97)×100。賠率 mult(k)=floor2(RTP/cum(k)) ⇒ 任一兌現策略 RTP ≤ 97%（策略無關上界）。"
  });
  declare("cases", {
    rtp: 98.5, basis: "analytic",
    note: "各難度精確 RTP＝Σ(w·mult)/Σw（`HL.cases.rtpOf`）＝98.41–98.63%，宣告值取四表共同標稱。"
  });
  declare("bounty", {
    rtp: 100, basis: "design",
    note: "10 張卡彩金總和＝費用×10/翻牌數 ⇒ E[贏]＝(翻牌數/10)×總和＝費用（設計恆等式，非校準值）。"
  });

  /* ── originals 家族 10 款（2026-08-17 平台軌·#102 實作當輪補登記）─────────────────
   * 【為什麼是平台軌登記，而這不算「代填」】#94 定案 `rtp` 屬**遊戲軌**權威、需蒙地卡羅或解析證明。
   * 本批的每一個值**不是平台軌判斷出來的，是從該遊戲自己的模組重算出來的**：
   *   `instant-games.js`/`instant-crash-mines.js`/`instant-keno.js`/… 各自 `module.exports` 的
   *   `edge`(或 `EDGE`/`RAKE`) 常數與機率/賠率純函式 ⇒ 本輪逐款**窮舉全參數空間**算解析 RTP，
   *   實測**恰為常數×100、零離散**（dice ∀target×∀方向、limbo/crash-x ∀兌現點、mines ∀雷數×∀翻格、
   *   keno ∀選號數、towers ∀難度×∀層、hilo ∀牌面×∀方向、pump ∀難度×∀打氣數、dice-duel/picks 模組自帶 fairRTP）。
   *   且 `platform/game-rtp-derived-from-module` 常駐鎖**每輪重算一次並比對本表**⇒ 遊戲軌哪天改了
   *   edge 常數，紅的是這條鎖，不是玩家看到的數字。**本表在此只是那些常數的可列舉出口，不是第二個意見。**
   * 【與 gameInfoBar 既有字串的關係】這 10 款的 infoBar 寫的是 `edge:"1% 莊家優勢"`（字串），
   *   也就是說 99% 這個宣稱**早已對玩家公開**、只是不可查詢——本批不新增任何宣稱，只讓它問得到。
   * 【floor 派彩的方向性】派彩取 floor ⇒ 玩家**實得略低於**此上界（遊戲軌 gate_log 已證 ≤99%），
   *   與四款 slot 的「宣告值 vs 250M MC 實測值」同型，故一律 `basis:"analytic"`＝解析上界恆等式。
   * 【誰刻意不在本批】`plinko`——它**沒有單一 RTP**：9 種 rows×risk 組合實測 98.8164%–99.1014%
   *   （賠付表取整所致，其 infoBar 也誠實寫 `~1% 莊家優勢`）。登記任一單值都會是假的
   *   （取均值＝發明數字、取 99＝高報 8 種組合中的 8 種）⇒ 留給遊戲軌裁決（已開卡 #103），
   *   由 `platform/game-rtp-no-false-claim` 家族的同型理由擋住往後隨手補登。
   * 【桌遊六款也不在本批】baccarat/roulette/sic-bo/andar-bahar/dragon-tiger/money-wheel 的
   *   `HL.edge` 值明載為「頭條主注」或「近似中值」＝**加權係數**，不是宣告 RTP（同一款遊戲每種注型
   *   RTP 不同，和/對子差距達數十 pp）⇒ 把中值登記成「這款遊戲的 RTP」會是本檔最不該有的那種假數字。
   */
  var ORIGINALS_NOTE = "＝該遊戲 view 模組自身的 edge 常數×100，本輪窮舉全參數空間重算解析 RTP 恰等此值（零離散）；派彩 floor ⇒ 實得略低於此上界。常駐鎖 platform/game-rtp-derived-from-module 每輪重算比對。";
  [
    ["dice", 99, "∀target(2–98)×∀方向 皆 99.0000%"],
    ["limbo", 99, "∀目標倍數 皆 99.0000%"],
    ["crash-x", 99, "∀兌現點 皆 99.0000%（instant-bust 1.00%）"],
    ["mines", 99, "∀雷數(1–24)×∀翻格數 皆 99.0000%（策略無關）"],
    ["keno", 99, "∀選號數(1–10) 皆 99.0000%"],
    ["towers", 99, "∀難度×∀兌現層(24 格) 皆 99.0000%（策略無關）"],
    ["hilo", 99, "∀牌面×∀方向(24 組) 單步皆 99.0000%"],
    ["dice-duel", 99, "贏家通吃抽水 RAKE=0.99 ⇒ fairRTP()=99.0000%"],
    ["picks", 99, "EDGE=0.99 ⇒ fairRTP(prob)=99.0000% ∀盤口機率"],
    ["pump", 98, "EDGE=0.98（檔頭明載高於 Dice 家族）⇒ ∀難度×∀打氣次數 皆 98.0000%"]
  ].forEach(function (row) {
    declare(row[0], { rtp: row[1], basis: "analytic", note: row[2] + "。" + ORIGINALS_NOTE });
  });

  if (isNode) { module.exports = API; return; }
  HL.gameRtp = API;
})(typeof window !== "undefined" ? window : globalThis);

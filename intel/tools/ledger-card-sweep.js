/*
 * 台帳自我查核｜台帳 ↔ BACKLOG 卡的**雙向**錨點檢查
 * ---------------------------------------------------------------------------
 * 用法：node intel/tools/ledger-card-sweep.js
 * 亦可被 require（`prototype/tests/checks-platform.js` 的常駐鎖用它當單一真相）。
 *
 * 【為什麼需要這支】平台軌 2026-08-14 20:00 窗查獲一種**系統性**的台帳失真，而且它不是
 *   「久沒審所以過時」那種——是**我們自己造成的**：
 *     台帳寫下「模組 X 的缺口是 A ⇒ 開卡 #N」→ 隔天 #N 落地把 A 關掉 → **台帳沒人回填**
 *     ⇒ 台帳從那一刻起就在**高報一個自己已經關閉的缺口**。
 *   實測當時 11 個「開卡 #N」引用中有 2 筆是這種狀態（`活動/新手引導` 的 #84 連簽容錯、
 *   `資安/負責任博弈` 的 #86 slot 下注閘），兩筆的落地日都在該模組 `last_audited` 的**隔天**。
 *
 * 【關鍵推論】一筆 evidence 只要寫了「開卡 #N」，**它的有效期就等於 #N 的落地時刻**，
 *   而不是 `stale_days`。純看 `last_audited` 的新鮮度指標對這種失真完全免疫（照樣顯示「很新」），
 *   所以必須另外機械掃描——這正是本檔存在的理由。
 *
 * 【怎麼用】平台軌 SKILL 第 2 步（更新台帳）開頭先跑一次；有 ⚠️ 的先回填，再開始輪替審分類。
 *   回填＝據實改寫該模組 evidence（缺口 A 已由 #N 關閉、剩餘缺口改寫為 B），並重新判定 status。
 *
 * ===========================================================================
 * 【② 反向錨（2026-08-30 20:00 窗新增）—— 本檔原本只有一個方向，而那一半是抓不到的】
 * ---------------------------------------------------------------------------
 * 首版只走 **台帳 → 卡**（evidence 寫了 `#N` ⇒ 去看 #N 的狀態）。這個方向有一個結構性盲點：
 *   **evidence 沒寫、或寫錯卡號時，它一個字都掃不到。**
 *   · 實例 A（08-30 08:00 窗當場發生）：「外觀/主題模式」evidence 寫「⇒ 開卡 **#147**」，
 *     實際開出的是 **#148**（#147 是 08-29 20:00 窗的登錄表語意卡）。當下兩張都是 ⬜待批准
 *     ⇒ 解析得出、狀態合理、**零告警**。後果不是今天的：等 #147 落地 ✅ 而 #148 沒落地時，
 *     本工具會指示「本模組缺口已被 #147 關閉、請回填」，**而主題那條線其實一個字都沒接**
 *     ⇒ 台帳會從此**低報一個真缺口**（與首版要治的「高報」剛好相反的失真）。
 *   · 實例 B（本輪首跑當場掃出 3 筆）：卡的「來源」欄明寫自己來自台帳某分類，
 *     但**該分類的任何模組 evidence 都沒有回指這張卡** ⇒ #106（功能／支援與透明度中心·已 ✅）、
 *     #90（後台·已 ✅）、#137（資安／出金安全鎖·⬜）。前兩者是「缺口已被自己的卡關掉、
 *     而台帳連那張卡的存在都不知道」＝首版**永遠**掃不到（首版要有 `#N` 才有東西可走）。
 *
 * 【反向錨的判準】只認**卡自己宣告**的來源，不做語意猜測：
 *   卡首行 `來源：…` 內同時出現「台帳／platform-modules」與某個**台帳分類名**時，
 *   視為該卡**宣告自己源出於該分類** ⇒ 該分類至少要有一個模組的 evidence 提到 `#N`。
 *   沒指名分類的（例：「platform-modules 台帳『報表與匯出』」只寫模組名）⇒ **無錨可比，不告警**
 *   （寧可漏報也不誤報：本檔是收窄範圍用的，見下方誤報說明）。
 *
 * 【兩個方向各自抓什麼（別把它們當同一條）】
 *   · 正向（evidence → 卡）：卡**做完了**而台帳還在報那個缺口 ⇒ **高報**。
 *   · 反向（卡 → evidence）：卡**宣告**源出於某分類，而該分類**沒有任何模組記得它** ⇒
 *     不是卡號寫錯（實例 A），就是台帳從一開始就沒把出口寫下來（實例 B）⇒ 未來會**低報**。
 *
 * 【誤報說明】正向第二欄的「已回填？」是關鍵詞啟發式（找 evidence 裡有沒有「#N 已落地/已修/已完成」
 *   之類的語句），**會有誤報**：2026-08-14 首跑 3 筆告警中有 1 筆（`功能/可驗證公平` 的 #92）
 *   其實當天稍早已回填、只是措辭沒被關鍵詞命中。⇒ 本工具是**收窄檢查範圍**用的，
 *   每一筆仍須人工（或 Claude）讀 evidence 確認，不可直接照單全改。
 */
"use strict";
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..", "..");

function loadModules() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "intel", "db", "platform-modules.json"), "utf8"));
}
function loadBacklogLines() {
  return fs.readFileSync(path.join(ROOT, "BACKLOG.md"), "utf8").split(/\r?\n/);
}

/* 卡狀態表：BACKLOG 佇列裡行首形如 `NN. ✅完成` / `NN. 🟦已批准待做` …
 * 同時擷取「來源：…」（反向錨用）。同一張卡只認**第一次**出現的行（後文可能引用同號）。 */
function parseCards(lines) {
  var byId = {};
  lines.forEach(function (l) {
    var m = l.match(/^(\d{1,3})\.\s*(✅完成|🟦已批准待做|🏗️進行中|⬜待批准|♻️)/);
    if (!m || byId[m[1]]) return;
    byId[m[1]] = { id: m[1], state: m[2], src: (l.match(/來源：(.*)$/) || ["", ""])[1] };
  });
  return byId;
}

/* 一筆 evidence 內對卡的引用，形狀有兩種，**兩種的有效期都等於那張卡的落地時刻**：
 *   ① 開卡：「⇒ 開卡 #N」——首版只認這一種。
 *   ② 委派：「本缺口掛在 #N 底下追蹤」「寫進既有 #59」「併入 #72」——刻意不另開卡、把缺口寄在別張卡上。
 * 【為什麼補 ②（2026-08-22 平台軌 14:00 窗實測）】`活動/抽獎Raffle` 的「兌換碼缺領取資格述詞」
 *   連四輪寫著未變，08-18 那輪明文決定「掛在 #107 底下追蹤，非再度蒸發」；#107 已落地並**確實**
 *   在 `core/redeem.js` 加了 `audience` 述詞閘（FIRSTWEEK／GRIND500 兩碼），但台帳沒回填 ⇒ 台帳
 *   繼續高報一個自己已關閉的缺口。**首版工具對這筆完全免疫**，因為那段話沒有「開卡」二字。
 *   ⇒ 委派型引用是「不開卡」換來的代價：它把回填責任藏得比開卡型更深。 */
function citedCards(ev) {
  var ids = [], kind = {};
  [[/開卡\s*\*{0,2}#(\d{1,3})/g, "開卡"],
   [/(?:掛在|寫進既有|寫進|併入|已開的|改由|轉由|收在)\s*\*{0,2}#(\d{1,3})/g, "委派"],
   [/\*{0,2}#(\d{1,3})\*{0,2}\s*(?:底下追蹤|底下)/g, "委派"]
  ].forEach(function (pair) {
    var re = pair[0], m;
    while ((m = re.exec(ev))) {
      if (ids.indexOf(m[1]) < 0) { ids.push(m[1]); kind[m[1]] = pair[1]; }
    }
  });
  return { ids: ids, kind: kind };
}

/* ── ① 正向：台帳 evidence → 卡狀態 ───────────────────────────────────────── */
function forward() {
  var mods = loadModules();
  var cards = parseCards(loadBacklogLines());
  var rows = [];
  mods.modules.forEach(function (mod) {
    var ev = mod.evidence || "";
    var cited = citedCards(ev);
    cited.ids.forEach(function (id) {
      var st = cards[id] ? cards[id].state : "(不在佇列/已封存)";
      // 「已回填」啟發式：evidence 裡有沒有把 #N 講成「已經做完/已關閉」的語句。
      // ⚠️ 2026-08-14 首版只認「已落地/已修/已完成/已兌現」，把「#84 **於 08-11 落地**」「#86 已關閉」
      //    這類同義寫法全部漏掉 ⇒ 回填過的模組下一輪還是會被標紅（假警報疲勞）。已放寬同義詞。
      var verb = "(落地|關閉|補上|補完|修完|完成|兌現|清償)";
      var done = new RegExp("#" + id + "[^。]{0,60}" + verb).test(ev)
              || new RegExp(verb + "[^。]{0,30}#" + id).test(ev);
      rows.push({ cat: mod.category, name: mod.name.split(" ")[0], status: mod.apexwin_status,
                  audited: mod.last_audited, card: id, kind: cited.kind[id], cardState: st,
                  backfilled: done });
    });
  });
  return rows;
}

/* ── ② 反向：卡的「來源」宣告 → 該分類 evidence 有沒有回指 ─────────────────── */
function reverse() {
  var mods = loadModules();
  var cards = parseCards(loadBacklogLines());
  var cats = [], evByCat = {};
  mods.modules.forEach(function (m) {
    if (cats.indexOf(m.category) < 0) cats.push(m.category);
    evByCat[m.category] = (evByCat[m.category] || "") + "\n" + (m.evidence || "") + "\n" + (m.stowable_note || "");
  });

  var rows = [];
  Object.keys(cards).forEach(function (id) {
    var c = cards[id];
    if (!/台帳|platform-modules/.test(c.src)) return;              // 沒宣告來自台帳＝本檢查不管
    var named = cats.filter(function (k) { return c.src.indexOf(k) >= 0; });
    if (!named.length) {                                            // 提台帳但沒指名分類＝無錨可比
      rows.push({ id: id, state: c.state, cats: [], anchored: null, src: c.src });
      return;
    }
    var anchored = named.some(function (k) {
      return new RegExp("#" + id + "(?!\\d)").test(evByCat[k] || "");
    });
    rows.push({ id: id, state: c.state, cats: named, anchored: anchored, src: c.src });
  });
  rows.sort(function (a, b) { return Number(a.id) - Number(b.id); });
  return { cats: cats, rows: rows };
}

/* 反向錨用的「比對子本身」：某分類群的 evidence 有沒有提到 #id。
 * 單獨匯出的理由＝常駐鎖要能拿一個**全庫不存在的卡號**來問它，證明它答得出「沒有」。
 * 沒有這一問，比對子哪天壞成恆真時，主斷言（未回指筆數＝0）會照樣全綠。 */
function anchoredFor(id, cats) {
  var mods = loadModules();
  var re = new RegExp("#" + String(id) + "(?!\\d)");
  return mods.modules.some(function (m) {
    if (cats && cats.indexOf(m.category) < 0) return false;
    return re.test((m.evidence || "") + "\n" + (m.stowable_note || ""));
  });
}

module.exports = { forward: forward, reverse: reverse, parseCards: parseCards,
                   citedCards: citedCards, anchoredFor: anchoredFor };

/* ── CLI ──────────────────────────────────────────────────────────────────── */
if (require.main === module) {
  var rows = forward();
  var suspect = rows.filter(function (r) { return r.cardState === "✅完成" && !r.backfilled; });
  console.log("① 正向（台帳 evidence → 卡）：提及卡號（開卡／委派）共 " + rows.length + " 筆；其中卡已完成者 "
    + rows.filter(function (r) { return r.cardState === "✅完成"; }).length + " 筆\n");
  rows.forEach(function (r) {
    var flag = (r.cardState === "✅完成" && !r.backfilled) ? "   ⚠️ 卡已完成、evidence 疑未回填" : "";
    console.log("[" + r.cat + "] " + r.name + " (" + r.status + ", audited " + r.audited + ")"
      + " → " + (r.kind || "開卡") + " #" + r.card + " = " + r.cardState + flag);
  });
  console.log("\n⚠️ 正向待人工確認：" + suspect.length + " 筆"
    + (suspect.length ? "（" + suspect.map(function (r) { return r.name + "/#" + r.card; }).join("、") + "）" : ""));

  var rev = reverse();
  var claimed = rev.rows.filter(function (r) { return r.anchored !== null; });
  var orphan = claimed.filter(function (r) { return !r.anchored; });
  console.log("\n② 反向（卡「來源」宣告 → 該分類 evidence 回指）：宣告來自台帳的卡 " + rev.rows.length
    + " 張，其中指名分類可比對者 " + claimed.length + " 張（未指名分類 "
    + (rev.rows.length - claimed.length) + " 張＝無錨可比、不告警）");
  orphan.forEach(function (r) {
    console.log("  ⚠️ #" + r.id + " [" + r.state + "] 宣告來自台帳「" + r.cats.join("／")
      + "」，但該分類任何模組 evidence 都沒有回指 #" + r.id
      + "\n       來源：" + r.src.slice(0, 140));
  });
  console.log("\n⚠️ 反向待人工確認：" + orphan.length + " 筆"
    + (orphan.length ? "（" + orphan.map(function (r) { return "#" + r.id; }).join("、") + "）" : ""));
  process.exitCode = 0;   // 資訊型工具，不當 CI 閘（誤報率不為零，見檔頭）
}

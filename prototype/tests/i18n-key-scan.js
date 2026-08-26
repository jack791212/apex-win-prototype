/*
 * Apex Win｜i18n 整節點鍵覆蓋掃描器（#119 的單一真相）
 * ---------------------------------------------------------------------------
 * 【為什麼有這個檔】#109 報表中心 08-21 落地時，`open()` 內 13 個 `t("…")` 純片語鍵
 *   在 `src/i18n/en.js`／`zh-Hans.js` **全部 0 命中**——整個面板切成英文會原樣顯示繁中，
 *   而 node 全綠、console 零錯誤、中文下畫面完全正常。這是船長 P3 紀律第 7 次被記錄，
 *   也是第一次由**後手在別的卡的實作輪**偶然發現（前 6 次都靠落地者自己記得）。
 *   既有 i18n 鎖全是**逐表面特化**的（`support-title-i18n`／`auth-view-i18n`／
 *   `game-axes-title-i18n`…）⇒ **還沒寫的表面天生不在任何鎖的射程內**。
 *   本檔把「哪些 key 該有翻譯、實得多少」變成可重現的機械量測，供兩個消費者共用：
 *     ① 常駐棘輪鎖 `platform/i18n-key-ratchet`（tests/checks-platform.js）
 *     ② 情報側報告 `node intel/tools/i18n-key-gaps.js`（逐檔缺漏排行，給實作輪挑補哪一檔）
 *   ⚠️ **刻意只有這一份掃描器**：本專案反覆踩「同一把尺被抄成兩份、然後 drift」
 *      （T26/T28/#94 側表 rtp…）⇒ 鎖與報告必須讀同一支函式，不得各自實作正則。
 *
 * 【口徑（改這裡＝換尺，換尺就必須重量基線）】
 *   · 掃 `prototype/src/**\/*.js`，排除 `src/i18n/`（字典自己不是呼叫端）。
 *   · 只認**呼叫**、不認提及：以狀態機逐字走過原始碼，字串內與註解內的 `t("…")` 一律不算
 *     （船長 08-16 已把「口徑必須是『只認呼叫/賦值、不認提及』」列為硬規則）。
 *   · 承認的呼叫形狀：`t("…")`／`t("…", "…")`（各檔本地 i18n passthrough wrapper）
 *     與 `HL.i18n.t("…")`。第一引數必須是**字面量字串且含 CJK**＝畫面中文 key。
 *     `t.equal(…)`／`get("x")` 之類不會命中（要求 `t` 是完整識別字且其後緊接 `(`）。
 *
 * 【三種分類 · 為什麼不是全部都算缺漏】
 *   · MISSING —— 該有翻譯而沒有。這是棘輪鎖數的量。
 *   · NA_CONCAT —— 呼叫的左右緊鄰 `+`（`t("剩餘") + n`）。依 i18n.js 契約，翻譯只發生在
 *     「整個文字節點 trim 後等於一條 key」時 ⇒ 串接出來的節點**結構上永遠翻不到**，
 *     補了字典也不會生效。#106／#72 都踩過這個界定 ⇒ 判 N/A，不灌爆基線。
 *   · NA_SAME —— 僅指 zh-Hans：該語言包契約是**差異補丁**（只列與繁體不同的字），
 *     簡繁同形的鍵照抄一份反而是噪音 ⇒ 不算缺漏。
 *
 * 【已知偏差 · 讀數時一起讀】
 *   · zh-Hans 的「同形」判定用的是**從既有 zh-Hans 條目自身反推**的繁→簡變化字集
 *     （逐字對齊等長的 key/value 對）。字集不完備 ⇒ **會低估** zh-Hans 缺漏，不會高估。
 *     EN 側則是精確的（全譯契約 + 字典鍵集直接比對），棘輪主要靠 EN 側扛。
 *   · 動態 key（`t(someVar)`／樣板字串）不在射程內——那本來就不是「整節點鍵」。
 */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");                     // prototype/
var SRC = path.join(ROOT, "src");
var I18N_DIR = path.join(SRC, "i18n");

var HAS_CJK = /[一-鿿]/;
var ID_CHAR = /[A-Za-z0-9_$]/;

/* ── ① 權威字典（實跑語言包、攔 register，不用正則數 key） ───────────────── */
function loadPack(file) {
  var packs = {};
  var sb = { console: console };
  sb.window = sb; sb.globalThis = sb;
  sb.HL = { i18n: { register: function (code, o) { packs[code] = o; } } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(file, "utf8"), sb, { filename: path.basename(file) });
  var k = Object.keys(packs)[0];
  var p = (k && packs[k]) || {};
  return { dict: p.dict || {}, prefix: p.prefix || {}, suffix: p.suffix || {} };
}

function dicts() {
  return {
    en: loadPack(path.join(I18N_DIR, "en.js")),
    hans: loadPack(path.join(I18N_DIR, "zh-Hans.js"))
  };
}

/* 一條 key 是否**真的翻得到**——必須與 `core/i18n.js` 的 `tText()` 同構：
 *   精確比對 → PREFIX（key 以某前綴開頭）→ SUFFIX（key 以某後綴結尾且長於它）。
 * ⚠️ 只比對 `DICT` 會把「✓ 已解鎖 / 挑戰次數 N / 世界活動 · WORLD EVENT」這類**已由前後綴表覆蓋**
 *    的節點誤報成缺漏（#120 卡上的阻塞事實 ②）。呼叫面（#119）當時基線恰為 0 所以沒露出，
 *    DOM 面分母大 20 倍，不同構就會灌進一批補了也沒用的假缺漏。 */
function covers(pack, key) {
  if (Object.prototype.hasOwnProperty.call(pack.dict, key)) return true;
  var p;
  for (p in pack.prefix) if (key.indexOf(p) === 0) return true;
  var s;
  for (s in pack.suffix) if (key.length > s.length && key.slice(-s.length) === s) return true;
  return false;
}

/* 屬性面（#122）**必須用比 `covers()` 更嚴的判定**——這不是保守起見，是契約差異：
   `core/i18n.js` 的 `tText()` 走 精確→PREFIX→SUFFIX 三段，但同一支檔的 `tAttrs()`（第 100 行起）
   只做 `if (d[k] == null) return;` ＝**精確比對，沒有前後綴分支**。⇒ 一條只被 PREFIX 表覆蓋的
   屬性值，`covers()` 會說「已覆蓋」，而執行期 `tAttrs` 根本翻不到它，切 EN 照樣露繁中。
   ⚠️ 落地當輪實測 `coversExact` 與 `covers` 在屬性面**逐鍵相同（差 0）**——也就是說
   今天這條嚴格判定**沒有任何 witness**。沒有 witness 的性質等於沒被守住（同 #120 健檢②-b
   的教訓）⇒ 鎖裡用**合成探針**替它造 witness，而不是靠真實語料剛好撞上。 */
function coversExact(pack, key) {
  return Object.prototype.hasOwnProperty.call(pack.dict, key);
}

/* 從 zh-Hans 既有條目反推「繁→簡會變形」的字集：逐字對齊等長的 key/value 對。
   用途＝判斷一條沒進 zh-Hans 的 key 究竟是「漏補」還是「簡繁同形本來就不必補」。 */
function changedCharSet(hansDict) {
  /* ⚠️ 逐字對齊會被「等長但**換詞序**」的條目汙染，這是本函式最容易寫錯的一處：
   *   「評估視窗內累積經驗」→「评估窗口内累积经验」——長度相同，但 `視窗`→`窗口` 是換詞不是換字，
   *   天真對齊會學到 `窗→口`，於是「保障窗口」被誤判為「需要 zh-Hans 條目」（實際簡繁同形）。
   *   首版就踩到，逐一回查才發現 上/目/入/窗 四個字全是這樣來的假映射。
   * ⇒ 只採**一致**的映射：同一個字在所有對齊樣本中必須恆指向同一個目標，且**從未原樣不變**。
   *   任一樣本違反就整個字作廢（寧可漏判＝低估缺漏，也不要誤判＝逼人補一條沒必要的條目）。 */
  var map = Object.create(null), poisoned = Object.create(null);
  Object.keys(hansDict).forEach(function (k) {
    var v = hansDict[k];
    if (typeof v !== "string" || v.length !== k.length) return;   // 長度不等＝不可逐字對齊，跳過
    for (var i = 0; i < k.length; i++) {
      var a = k[i], b = v[i];
      if (a === b) { poisoned[a] = true; continue; }              // 同一個字曾原樣不變 ⇒ 不可靠
      if (map[a] && map[a] !== b) poisoned[a] = true; else map[a] = b;
    }
  });
  /* ⭐ 第二道濾網「目標字必須是簡體專用形」（#120 實作輪查獲 · 補的是上面那道濾網漏掉的一整族）
   * 【怎麼發現的】補譯第二批時，`🔄 重新整理` 被判成「需要 zh-Hans 條目」，但它**簡繁同形**——
   *   照判定補下去就是往「差異補丁」字典裡塞一條 key 與 value 逐字相同的條目（違反語言包契約）。
   *   回查來源：`重整即清空` → `刷新即清空`（**等長、但是換詞**）讓上面的濾網學到 `整→新`；
   *   `整` 在其他等長樣本裡既沒有第二個目標、也從未原樣不變 ⇒ 一致性檢查**結構上抓不到它**。
   *   這與檔頭已記的 `視窗→窗口` 是**同一族**（等長換詞），只是那次是靠人工逐一回查才發現。
   * 【判準】真正的「繁→簡字形簡化」，其**目標字是簡體專用形**（动/记/网/图…）——那種字**不可能**
   *   出現在繁體那一側，所以它永遠不會被登記進 `poisoned`（`poisoned` 收的正是「曾原樣不變＝兩體共用」的字）。
   *   反過來，換詞產生的假映射，其目標是**共用字**（新/持/只/服）⇒ 必然已在 `poisoned` 裡。
   *   ⇒ **目標字若是共用字，整條映射作廢。** 實測一擊命中全部 4 條假映射（整>新／援>持／唯>只／伺>服）。
   * 【誠實記載的代價】同時也誤殺 3 條真映射（裡>里／準>准／註>注）——它們的簡體形恰好也是共用字。
   *   方向仍是**只會縮小字集＝只會低估 zh-Hans 缺漏**（漏抓），而不是誤逼人補一條沒必要的條目，
   *   與本函式既定紀律一致；且 `changedChars` 由 318 降到 311，反向錨（≥200）仍安全。 */
  var set = Object.create(null);
  Object.keys(map).forEach(function (c) {
    if (poisoned[c]) return;
    if (poisoned[map[c]]) return;          // 目標是兩體共用字 ⇒ 這是換詞，不是字形簡化
    set[c] = map[c];
  });
  return set;
}

function needsHans(key, changed) {
  for (var i = 0; i < key.length; i++) if (changed[key[i]]) return true;
  return false;
}

/* ── ② 呼叫點抽取（狀態機：字串/註解內一律不算） ─────────────────────────── */
function readString(src, i) {
  // src[i] 是引號；回傳 { value, end }（end＝閉合引號的下一個位置），未閉合回 null
  var q = src[i], out = "", j = i + 1;
  while (j < src.length) {
    var c = src[j];
    if (c === "\\") { out += src[j + 1] || ""; j += 2; continue; }
    if (c === q) return { value: out, end: j + 1 };
    if (c === "\n" && q !== "`") return null;
    out += c; j++;
  }
  return null;
}

/* 從 `(` 位置找到配對的 `)`（跳過字串與註解）。找不到回 -1。 */
function matchParen(src, open) {
  var depth = 0, i = open;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); if (!s) return -1; i = s.end; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); if (e < 0) return -1; i = e + 2; continue; }
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

/* ── 串接判定（NA_CONCAT）───────────────────────────────────────────────────
 * 天真的做法是「呼叫的左右緊鄰 `+`」，但那會**漏掉一種很常見的形狀**：
 *   `text: t("退還封頂",…) + " " + money(cap) + (capReached ? t("（已達封頂）",…) : "")`
 * 這裡 `t("（已達封頂）")` 的左右分別是 `?` 與 `:`，緊鄰沒有 `+`——可是它最終仍然
 * 被串進**同一個文字節點**，補進字典也永遠翻不到。漏判＝把「補了也不生效」的項目
 * 灌進基線（正是本卡阻塞事實 ① 要防的事）。
 * ⇒ 改成**往外走一層**：找到最近的未閉合括號群 → 以深度 0 的逗號切出本呼叫所在的那一段
 *   （＝一個屬性值／一個引數）→ 只要該段在深度 0 有 `+`，整段就是一個串接節點。
 */
/* ⚠️ **往外走必須在「值語境」用盡時停下——首版沒停，於是它把真缺漏判成 N/A**
 *   （#122 實作輪 2026-08-25 20:00 窗實測發現；CLAUDE.md §4「修一半而看不出來」第六例）。
 *   首版無條件往外走 5 層。第 3 層以後往往已經**走出物件字面量、進到函式主體**——
 *   而函式主體裡幾乎一定找得到某個深度 0 的 `+`（任何一行 `var s = a + b;` 都算），
 *   於是 `segHasPlus` 回 true，該筆命中被標成「補了也翻不到」而**靜默退出分母**。
 *   實例：`progress.js:103` `HL.notify.add({ ic:"⌛", title:"紅利已逾期",` 換行後
 *   `text: money(lost) + " 待解鎖…" })`——`title` 這一段自己**沒有** `+`（兄弟的 `text` 才有），
 *   物件層與引數層都正確回 false，但再往外兩層走到 `if` 所在的函式主體就撿到別人的 `+`。
 *   全庫實測：**34 筆命中**被這樣藏起來，其中 **11 條缺 EN／9 條缺 zh-Hans 是真缺漏**
 *   （`出發`〔小雞過馬路的主按鈕〕／`遊戲設定`／`點擊略過`／`史詩大獎 EPIC WIN` 三檔大獎橫幅…）。
 *   ⇒ 三段既有棘輪全都寫著「零容忍」且全綠，實際上是**尺自己把缺漏吃掉了**。
 *   修法＝每往外一層都先問「這一層還是值語境嗎」（物件字面量／引數列／陣列／括號運算式），
 *   一走進 block（函式主體、if/for 主體）就停。註記所在的形狀是 `{`：只有前一個非空白字元
 *   落在值位置（`( , : = [ ? & |`）或 `return` 之後，那個 `{` 才是物件字面量；
 *   `) {`／`} {`／`; {`／`=> {` 都是 block。 */
var VALUE_BEFORE_BRACE = "(,:=[?&|";
function isValueGroup(src, open) {
  var c = src[open];
  if (c === "(" || c === "[") return true;                 // 引數列／陣列／括號運算式恆是值語境
  if (c !== "{") return false;
  var j = prevNonSpace(src, open);
  if (j < 0) return false;
  if (src[j] === ">" && src[j - 1] === "=") return false;   // `=> {` 是箭頭函式主體，不是物件字面量
  if (VALUE_BEFORE_BRACE.indexOf(src[j]) >= 0) return true;
  if (/[A-Za-z]/.test(src[j])) return /\breturn$/.test(src.slice(Math.max(0, j - 9), j + 1));
  return false;
}

function segmentIsConcat(src, callStart) {
  /* 一層還不夠：上例的 `+` 在**再外面一層**（呼叫本身包在 `( … ? … : … )` 裡）。
     ⇒ 逐層往外走，任何一層的所在段落有深度 0 的 `+` 就判串接。
     往外走不會亂咬，是因為**每一層都先用該層的逗號切段**——同層的兄弟屬性／兄弟子節點
     （`[el(…), el(…)]`、`el("p", {…}, […])`）都被逗號隔開，不會把別人的 `+` 算到自己頭上。
     ——但「同層兄弟被逗號隔開」這個保證**只在值語境裡成立**；走進 block 之後
     分隔符變成 `;` 與換行，逗號切段就不再切得開任何東西（見上方 #122 的實測）。 */
  var at = callStart;
  for (var lv = 0; lv < 5; lv++) {
    var g = groupOf(src, at);
    if (!g) return false;
    var block = !isValueGroup(src, g.open);
    /* block（函式主體／if 主體…）也必須量——`x.textContent = "已翻" + n;` 這種**語句層賦值**
       的最近群組就是 block，跳過它會把真串接判成非串接（方向與上面那個 bug 相反，一樣是錯）。
       差別在**切段符**：值語境用逗號切（同層兄弟屬性），block 要**再加上 `;`**切（同層兄弟語句）。
       progress.js:103 的兄弟 `+` 正是被 `;` 擋在別的語句裡，而首版沒有 `;` 這道切線。 */
    if (segHasPlus(src, g.open, g.close, at, block)) return true;
    if (block) return false;                               // block 是硬邊界：再往外只會撿到別的語句
    at = g.open;
  }
  return false;
}

function groupOf(src, callStart) {
  // ① 往左找最近的「未閉合」開括號
  var depth = 0, open = -1, i = callStart - 1;
  while (i >= 0) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") {          // 從右往左遇到引號：跳過整個字串
      var q = c, j = i - 1;
      while (j >= 0 && !(src[j] === q && src[j - 1] !== "\\")) j--;
      i = j - 1; continue;
    }
    if (c === ")" || c === "]" || c === "}") depth++;
    else if (c === "(" || c === "[" || c === "{") { if (depth === 0) { open = i; break; } depth--; }
    i--;
  }
  if (open < 0) return null;
  var close = matchGroup(src, open);
  if (close < 0) return null;
  return { open: open, close: close };
}

// ② 在群內以深度 0 的切段符切段，找出含 callStart 的那一段，看它有沒有深度 0 的 `+`
//    切段符：值語境＝`,`（同層兄弟屬性／引數）；block 另加 `;`（同層兄弟語句，見 #122 註解）。
function segHasPlus(src, open, close, callStart, splitSemi) {
  var d = 0, segStart = open + 1, hasPlus = false, k = open + 1;
  while (k < close) {
    var ch = src[k];
    if (ch === '"' || ch === "'" || ch === "`") { var s = readString(src, k); k = s ? s.end : k + 1; continue; }
    if (ch === "/" && src[k + 1] === "/") { while (k < src.length && src[k] !== "\n") k++; continue; }
    if (ch === "/" && src[k + 1] === "*") { var e = src.indexOf("*/", k + 2); k = e < 0 ? close : e + 2; continue; }
    if (ch === "(" || ch === "[" || ch === "{") d++;
    else if (ch === ")" || ch === "]" || ch === "}") d--;
    else if (d === 0 && (ch === "," || (splitSemi && ch === ";"))) {
      if (callStart >= segStart && callStart < k) return hasPlus;   // 本段結束且含本呼叫
      segStart = k + 1; hasPlus = false;
    } else if (d === 0 && ch === "+") hasPlus = true;
    k++;
  }
  return callStart >= segStart ? hasPlus : false;
}

function matchGroup(src, open) {           // 任意 ([{ 的配對閉合位置
  var pairs = { "(": ")", "[": "]", "{": "}" };
  var want = pairs[src[open]], d = 0, i = open;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); if (!s) return -1; i = s.end; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); if (e < 0) return -1; i = e + 2; continue; }
    if (c === "(" || c === "[" || c === "{") d++;
    else if (c === ")" || c === "]" || c === "}") { d--; if (d === 0) return c === want ? i : -1; }
    i++;
  }
  return -1;
}

function prevNonSpace(src, i) {           // i 之前（不含）第一個非空白字元位置
  var j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  return j;
}
function nextNonSpace(src, i) {           // i 起（含）第一個非空白字元位置
  var j = i;
  while (j < src.length && /\s/.test(src[j])) j++;
  return j;
}

/* 回傳該檔所有「整節點鍵」呼叫點：{ key, concat, line } */
function scanSource(src) {
  var hits = [], i = 0;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); i = s ? s.end : i + 1; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === "/" && looksLikeRegexStart(src, i)) { i = skipRegex(src, i); continue; }

    if (c === "t" && !ID_CHAR.test(src[i - 1] || "")) {
      var after = i + 1;
      if (!ID_CHAR.test(src[after] || "")) {          // 完整識別字 `t`（擋掉 title/toast/get… ）
        var dot = src[i - 1] === ".";
        var ok = !dot || /i18n\s*\.\s*$/.test(src.slice(Math.max(0, i - 12), i));  // 只放行 i18n.t(
        var p = nextNonSpace(src, after);
        if (ok && src[p] === "(") {
          var a = nextNonSpace(src, p + 1);
          if (src[a] === '"' || src[a] === "'") {
            var lit = readString(src, a);
            if (lit && HAS_CJK.test(lit.value)) {
              var close = matchParen(src, p);
              var leftIdx = prevNonSpace(src, dot ? i - 1 : i);
              var left = leftIdx >= 0 ? src[leftIdx] : "";
              var rightIdx = close > 0 ? nextNonSpace(src, close + 1) : -1;
              var right = rightIdx >= 0 ? src[rightIdx] : "";
              hits.push({
                // ⚠️ key 必須 **trim**：`HL.i18n.t` 只是 passthrough（回傳 def），真正查表的是 DOM walker，
                //    而它查的是 `node.nodeValue.trim()`（core/i18n.js:91）⇒ 帶前後空白的字面量
                //    （實例：rain.js 的 `"已領取 ✓ "`，後面接一個 money 文字節點）**照字面補進字典永遠查不到**。
                //    這是本掃描器最容易寫錯的一處：不 trim 會產出「補了也不生效」的假缺漏。
                key: lit.value.trim(),
                raw: lit.value,
                concat: left === "+" || right === "+" || segmentIsConcat(src, dot ? i - 1 : i),
                line: src.slice(0, i).split("\n").length
              });
              i = close > 0 ? close + 1 : lit.end;
              continue;
            }
          }
        }
      }
    }
    i++;
  }
  return hits;
}

/* ── ②-b DOM 綁定面抽取（#120）─────────────────────────────────────────────
 * 【為什麼需要第二種抽取法】本站大多數畫面文字**根本沒經過 `t()`**——
 *   `el("div", { text: "中文" })` 直接把中文餵進文字節點，靠 DOM walker 事後比對整節點翻譯。
 *   ⇒ 它一樣需要字典條目、一樣會在切 EN 時原樣露繁中，但 #119 的呼叫面棘輪**天生掃不到它**。
 *
 * 【承認的三種形狀 · 為什麼恰好是這三種】
 *   `text:` / `textContent =` → 文字節點（`tText` 的射程）；`placeholder:` → 屬性（`tAttrs` 的射程）。
 *   三者都是「宣告當下就決定了畫面上會出現哪串中文」的寫法。
 *
 * 【`title:` 為何排除（#120 卡上的阻塞事實 ①）】
 *   `title` 同時是 HTML title 屬性**與 `selftest.register({ title: "…" })` 的測項標題**。
 *   混在一起分母會從 615 灌到 934，多出來的 319 條幾乎全是測項標題——那些本來就不該翻。
 *   要救回 title 屬性那一面，得先能分辨兩種 title（非本卡範圍），故此處誠實留為射程外。
 *   同理 `aria-label`（`tAttrs` 也翻它）目前寫法多為 `"aria-label"` 引號鍵，留待後續擴。
 *
 * 【N/A 規則與呼叫面完全共用】串接（`text: "剩餘" + n`）→ 補了也翻不到，判 NA_CONCAT；
 *   key 一律 trim（walker 查的是 `nodeValue.trim()`）。
 */
var DOM_SHAPES = [
  { name: "text", prop: "text", sep: ":" },
  { name: "placeholder", prop: "placeholder", sep: ":" },
  { name: "textContent", prop: "textContent", sep: "=" }
];

/*
 * ── 第三面：資料面（#121）─────────────────────────────────────────────────
 * 【為什麼前兩面都掃不到】前兩面問的都是「**中文寫在哪一行**」：呼叫面看 `t("中文")`，
 *   DOM 面看 `text: "中文"`。但本站有一整類中文**根本不在渲染那一行**——
 *   渲染端寫的是 `el("div", { text: p.title })`，那一行**一個漢字都沒有**，
 *   中文躲在 `src/data/` 的物件裡當**資料值**。⇒ 兩面的抽取法對它結構性失明。
 *   實例（#61 遷移 12 張促銷卡當輪撞見）：切 EN／简中 時大廳最顯眼的那條輪播
 *   原樣顯示繁中，而 node 全綠、console 零錯誤、繁中下畫面完全正常。
 *   這是船長 P3 紀律第 8 例，也是第一個「**三種寫法**」的證據。
 *
 * 【射程＝檔案 × 欄位兩道閘，兩道都刻意收窄，理由不同】
 *   ① **檔案**：只認「資料宣告檔」＝`src/data/**` 全目錄 + 明列的 `src/core/game-axes.js`。
 *      用**目錄**而非檔案清單，是為了讓 `src/data/` 下的新檔天生在射程內
 *      （本專案的既有 i18n 鎖全是逐表面特化＝「還沒寫的表面永遠零覆蓋」，#119 檔頭已記其代價）。
 *      明列的額外檔由 `DATA_EXTRA` 承接，並由鎖的健檢盯著「明列的檔必須真的存在且真的有命中」。
 *   ② **欄位**：只認**已驗證會走到 DOM** 的欄位（下方 `DATA_FIELDS`）。
 *      刻意**不含** `text`／`placeholder`／`textContent`（那是第二面的射程，重疊會雙記）
 *      與 `icon`／`ic`／`emoji`／`av`（字形，不是語言）。
 *   ③ **`title` 在此射程內是安全的**——第二面把 `title:` 排除是因為它與
 *      `selftest.register({ title })` 一詞兩義（#122 要解的正是這個判別），
 *      而 `selftest.register` 在本射程的 8 支檔裡**零命中**（實測；鎖有一條反向錨盯著這個前提）。
 *
 * 【刻意排除且各有理由（別在後續輪「順手加回來」）】
 *   · `author`（`data/games.js`）＝**同仁開發者暱稱**。目標 2 明定遊戲要能依作者暱稱分類，
 *     翻譯專有名詞會直接破壞那條身分軸 ⇒ 永久排除，不是「還沒做」。
 *   · `source`（`data/game-traits.js`）＝分群軸的**判定依據出處散文**（給審計看的長句，非 UI 詞彙）。
 *   · `note`／`by`／`rtp`／`edge`（`data/game-rtp.js`）＝RTP 證明註記與數值格式字串，
 *     屬 #98 宣告 RTP 單一真相的顯示層，遷移是另一條軌（#94 側表已記）。
 *   ⇒ 這四條是**口徑**，不是缺漏。要改口徑＝換尺，換尺就必須重量基線（同 #119 檔頭規則）。
 */
/* ⚠️ `title` 已於 #122（2026-08-25 20:00 窗）**撤出本清單**，改由第四面（屬性面）單一持有。
   理由不是「資料面不該管 title」，而是**同一條宣告不得被兩把尺各量一次**：資料面用寬鬆的
   `covers()`（tText 契約，含前後綴），屬性面用嚴格的 `coversExact()`（tAttrs 契約，只精確比對）
   ⇒ 同一條 `title:"…"` 會拿到兩個可能矛盾的判定。撤出當輪逐鍵複核：原本落在資料面的 title
   命中全數落入屬性面射程（屬性面射程是整個 `src/` 減 OPS_ONLY，嚴格涵蓋資料面的目錄閘），零遺失。
   ⇒ 上方第三面段落的「③ `title` 在此射程內是安全的」已隨之失效，那條前提現在由屬性面的
   `testSpecRegions()` 逐宣告承擔（見第四面段落）。 */
var DATA_FIELDS = ["tag", "subtitle", "prizeLabel", "label", "name", "style", "game", "t"];
/* 目錄之外仍屬「資料宣告」的明列檔。**#122 起為空，且這是正確狀態、不是遺漏**：
   唯一一筆 `src/core/game-axes.js` 先在 #126 批次二被 `DATA_DIRS` 的 `src/core/` 涵蓋而變成冗餘，
   再於 #122 把它僅存的一條含漢字宣告（`title:` 的 FAQ 問句）移交屬性面 ⇒ 本面對它零命中。
   鎖的殘骸錨（「DATA_EXTRA 明列的檔必須真的有命中」）當場把它逼紅，正是這條錨該做的事。
   機制保留：日後若有 `src/data|views|layout|core` 以外的資料宣告檔，寫進這裡即納管。 */
var DATA_EXTRA = [];

/*
 * ── #126 批次一：射程自「資料宣告檔」擴到「玩家面表面」（平台軌 2026-08-25 08:00 窗）──
 * 【為什麼要擴】#121 只關了 8 支資料宣告檔的 45 條；同一把尺量全 `src/` 是 390 條缺漏。
 *   剩下的中文並沒有比較不可見——`views/slot.js` 的 `title: "賠付表"`、`layout/app-shell.js`
 *   的 `title: "成就徽章牆"` 都是玩家天天看到的字，只是它們寫在 view 裡而不是 data 裡。
 *
 * 【受眾口徑（#126 範圍①要的那個決定，本輪定案）】
 *   界線**不是新發明的**——直接沿用 `core/reports.js` 已經在用的 `aud` 軸（`player`｜`ops`）：
 *     · **玩家受眾的表面 ⇒ 在射程內**，缺一條就是缺漏。
 *     · **營運受眾的表面 ⇒ 在射程外，這是口徑不是缺漏**。理由有二，且都是實質的：
 *       (a) 受眾是營運人員（`HL.rbac` 的 `ops`、`ops_admins` 閘後），不是玩家；
 *           後台 i18n 屬目標 5（後台）的軌，該有自己的營運語言包，不該混進玩家包。
 *       (b) 營運文案**帶內部卡號**（`活躍光環（#59）`／`真站返水加成開啟比例（#108）`），
 *           直譯等於把內部卡號外洩到英文介面 ⇒ 先把卡號移出可見文案才談翻譯（#126 範圍③）。
 *   ⚠️ **口徑必須是有守衛的口徑，否則它就是一個逃生門**：`OPS_ONLY` 上的每一支檔
 *      都由鎖的反向錨逐輪查證「它真的帶營運受眾標記」且「它真的有命中」——
 *      沒有標記卻被排除＝有人把玩家面的檔停在這裡躲翻譯，鎖會轉紅。
 *
 * 【為什麼 `src/core/**` 這一批**還不能**進來（不是漏做，是有前置）】
 *   ① `title` 在 core 會**立刻**撞上 `selftest.register({ title })` 一詞兩義
 *      （`core/selftest.js`／`core/challenge-slots.js`）⇒ 那是 #122 的判別，本批不繞過它。
 *   ② `core/reports.js`（29 條）**同一支檔裡同時有 player 與 ops 兩種受眾的報表定義**，
 *      檔案級的 `OPS_ONLY` 切不開它 ⇒ 它需要的是**逐筆註冊看 `aud`** 的切法，屬下一批。
 *   ⇒ 這兩條寫在這裡，是為了讓後續批次不必重新發現。
 */
/*
 * ── #126 批次二：射程再擴到 `src/core/`，並修掉批次一寫錯的那個前置（平台軌 2026-08-25 14:00 窗）──
 * 【批次一把前置寫錯了，而錯的方向剛好是「看起來安全」】批次一的檔頭與 #126 卡上都寫著
 *   「`title` 一進 core 就撞 `selftest.register({ title })`，而那只有 `core/selftest.js`／
 *   `core/challenge-slots.js` 兩支」，並據此把「不含 `title:` 宣告的 core 檔」列為安全子集
 *   （卡上點名 `responsible.js`／`activity.js`／`progress-src.js`）。**三支全都不安全。**
 *   本站的測項有兩種註冊寫法，而**只有一種**含字面 `selftest.register`：
 *     ① 檔內直接呼叫：`selftest.register({ … })`   ← 舊反向錨④ 抓得到（實測僅 2 支）
 *     ② **注入式**：`function registerTests(st){ st.register({ id:"rg/…", title:"中文", run:… }) }`
 *        （`core/responsible.js:286` 起 12 筆即此形）← **舊錨④ 一個字都看不到**
 *   實測 ② 型在 `src/core/` 有 **22 支檔**，光 `title:` 欄就 **191 條測項標題**
 *   （`content.js` 25／`responsible.js` 18／`activity.js` 18／`service-level.js` 14／`progress-src.js` 13…）。
 *   ⇒ 若照批次一的前置直接把 core 併進射程，這 191 條測項標題會**當成玩家面缺漏**灌進分母，
 *      而**專門為此而立的反向錨④ 會保持全綠**——CLAUDE.md §4「修一半而看不出來」的第五例：
 *      **不變量只認了同一件事的其中一種寫法。**
 *
 * 【本批的三個動作】
 *   ① `DATA_DIRS` 加 `src/core/`（**用目錄不用清單**：理由同批次一——新檔天生在射程內，
 *      避免 #119 檔頭記的「還沒寫的表面永遠零覆蓋」）。
 *   ② `SPEC_HOSTS` 承接「託管測項 spec 的檔」＝**暫時**口徑排除，並由 `hostsTestSpec()`
 *      **形制無關**地判定（認 `.register({ … run: function …})`，不認特定呼叫者名字）。
 *   ③ 反向錨④ 改用 `hostsTestSpec()`：射程內出現**任何**形式的測項 spec 即轉紅。
 *
 * 【SPEC_HOSTS 是暫時的，而且它的代價已經量好了——別讓它變成永久逃生門】
 *   正解不是「把 22 支檔永久排除」（那 22 支裡有 `content.js`／`responsible.js`，
 *   玩家面中文最深的兩支），而是**逐宣告判別**：同一個物件字面裡有 `run: function` 的
 *   `title` 是測項標題、沒有的是玩家面文案。那正是 **#122** 的題目；本批把它的
 *   **輸入資料**（22 支檔名 × 191 條 title）量好寫下，#122 不必重新發現一次。
 *   ⚠️ 與 `OPS_ONLY` 一樣，這份清單由鎖的四條反向錨看守（存在／真的託管 spec／真的有命中／
 *      真的被排除），外加一條**完備性錨**：`src/core/` 下任何有命中的檔都必須落在
 *      「射程 ∪ OPS_ONLY ∪ SPEC_HOSTS」之內——否則新檔可以靜默逃出三份清單之外。
 */
var DATA_DIRS = ["src/data/", "src/views/", "src/layout/", "src/core/"];
var OPS_ONLY = ["src/views/ops-dashboard.js"];     // 營運受眾（HL.opsBoard／ops_admins 閘後）＝口徑排除，非缺漏

/* 託管測項 spec 的檔＝本批暫時排除（正解＝#122 逐宣告判別；清單與代價見上方檔頭）。 */
/* ⚠️ #122 自本清單移除 4 筆殘骸（`battle-tempo.js`／`challenge-slots.js`／`ledger.js`／`selftest.js`）：
   `title` 移交屬性面後，這四支在**資料面零命中**——留著就是排除一支沒東西可排的檔，
   只讓清單看起來有在管事。四筆全是鎖的殘骸錨（「明列的檔必須真的有命中」）逐一逼紅逼出來的，
   不是人工複查。它們的測項標題現在由屬性面的 `testSpecRegions()` 逐宣告排除，覆蓋沒有變薄。
   剩下 20 筆仍必要：本面剩下的 8 個欄位仍會被測項夾具字串污染（`name:"探針"`／`label:"會爆的表"`）。 */
var SPEC_HOSTS = [
  "src/core/activity.js", "src/core/battle-mode.js",
  "src/core/betlog.js", "src/core/bonus-ttl.js",
  "src/core/content.js", "src/core/econ-config.js", "src/core/edge.js",
  "src/core/progress-src.js", "src/core/rakeback-core.js",
  "src/core/rakeboost.js", "src/core/rbac.js", "src/core/referral-core.js",
  "src/core/release.js", "src/core/reports.js", "src/core/responsible.js",
  "src/core/reveal.js", "src/core/rewards.js", "src/core/score-axis.js",
  "src/core/service-level.js", "src/core/wager-scope.js"
];

/* 形制無關的測項 spec 判定：認「`register(` 後面那個物件字面裡有 `run: function`」，
   **刻意不認呼叫者名字**——`selftest.register`／注入式 `st.register`／裸呼叫 `register(`
   ／未來任何別名都算。舊錨④ 只認字面 `selftest.register`，那正是它漏掉 22 支檔的原因。
   ⚠️ 本函式的首版寫成 `/\.register\(/`（要求前面有一個點），於是漏掉**第三種**形制：
      `core/selftest.js` 自己是 `register({…})` **裸呼叫**（它就是定義 register 的那支檔）。
      抓到這件事的不是人工複查，是本批新加的錨④-c（「SPEC_HOSTS 明列的檔必須真的託管測項」）
      ——當時 selftest.js 在清單裡卻被判 false 而轉紅。⇒ 前綴改為 `\b`，
      邊界仍嚴（`registerPause(`／`unregister(` 皆不命中，因為要求 `register` 後緊接 `(`）。 */
function hostsTestSpec(src) {
  return /\bregister\(\s*\{[\s\S]{0,600}?\brun:\s*function/.test(String(src || ""));
}

function inDataScope(rel) {
  if (OPS_ONLY.indexOf(rel) >= 0) return false;
  if (SPEC_HOSTS.indexOf(rel) >= 0) return false;
  for (var i = 0; i < DATA_DIRS.length; i++) if (rel.indexOf(DATA_DIRS[i]) === 0) return true;
  return DATA_EXTRA.indexOf(rel) >= 0;
}

/* 抽取器。刻意與 scanDomBindings 同一套狀態機（字串/註解/正則一律略過＝只認宣告、不認提及），
   差別只在「認哪些鍵」與「值必須是引號字面量」。 */

/*
 * ── 受眾口徑的**逐宣告**版（#126 批次二 · 平台軌 2026-08-25 14:00 窗）─────────
 * 【為什麼檔案級的 OPS_ONLY 在這一批不夠用】射程擴到 `src/core/` 後冒出一整族缺漏，
 *   長相是這樣的：`cashback.js:109 label:"淨損 Cashback（#33）"`、`faucet.js:137
 *   label:"餘額歸零救濟金（#39）"`、`progress.js:615 label:"VIP 升級金／舊制流水（#29／#74）"`。
 *   它們**全部**是 #90 `HL.econCfg.register({…})` 的經濟旋鈕自我描述，而 `HL.econCfg` 的
 *   標籤**唯一的渲染端是 `views/ops-dashboard.js`**（已在 OPS_ONLY）⇒ 受眾是營運人員，
 *   且文案帶內部卡號（`（#33）`／`（#39）`／`（#29／#74）`）——直譯就是把卡號外洩到英文介面
 *   （#126 範圍③ 明文禁止）。
 *   但**不能用檔案級排除**：同一支 `progress.js` 裡還有 `青銅／白銀／黃金／白金／鑽石`
 *   （VIP 段位名，玩家天天看到）、`cashback.js` 裡還有玩家面的段位名。
 *   ⇒ 把這 10 支檔丟進 OPS_ONLY 會**連玩家面的真缺漏一起藏掉**，方向正好是最危險的那個。
 *
 * 【所以這一批做的是「逐宣告」而不是「逐檔」】——這正是 #126 卡上說的
 *   「`core/reports.js` 需要的是逐筆註冊看 `aud` 的切法，這才是批次二真正的設計題」。
 *   本函式回傳 `HL.econCfg.register( … )` 這個呼叫的字元區間；落在區間內的命中標 `ops:true`，
 *   由 `measureData` 記進**看得見的** `naOps` 計數（**不是靜默丟棄**——靜默丟棄正是尺說謊的方式）。
 *
 * 【括號配對為什麼不用現成的 matchParen】`matchParen` 只跳字串與註解、**不跳正則字面量**，
 *   而「遮罩器不認正則字面量」在本專案已經害過一次（08-24：`first-screen-deps.js` 的
 *   `/[",\n]/` 讓整檔遮罩自第 73 行起失準、把不可搬的判成可搬）⇒ 這裡沿用本檔
 *   `scanDataValues` 同一組跳越規則（含 `looksLikeRegexStart`／`skipRegex`），不另開一份。
 * 【配對失敗必須是紅，不是安靜的空集合】鎖有一條反向錨：任何含 `econCfg.register(` 的檔
 *   都必須解析出區間，否則就是配對器壞了——而壞掉的方向是「區間變空 ⇒ 缺漏數暴增」，
 *   會被棘輪本體立刻抓到；反之若區間被撐大到吞掉整檔，缺漏會變 0，那由 `naOps` witness 擋。
 */
function opsDeclRegions(src) {
  var out = [], i = 0;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); i = s ? s.end : i + 1; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === "/" && looksLikeRegexStart(src, i)) { i = skipRegex(src, i); continue; }
    if (c === "e" && src.slice(i, i + 17) === "econCfg.register(" && !ID_CHAR.test(src[i - 1] || "")) {
      var open = i + 16, close = matchParenSkipRegex(src, open);
      if (close > open) { out.push({ open: open, close: close }); i = close + 1; continue; }
    }
    i++;
  }
  return out;
}

/* 與 matchParen 同意圖，但**一併跳過正則字面量**（見上方註解的 08-24 事故）。 */
function matchParenSkipRegex(src, open) {
  var depth = 0, i = open;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); if (!s) return -1; i = s.end; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); if (e < 0) return -1; i = e + 2; continue; }
    if (c === "/" && looksLikeRegexStart(src, i)) { i = skipRegex(src, i); continue; }
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

function scanDataValues(src) {
  var hits = [], i = 0;
  var opsAt = opsDeclRegions(src);
  function inOps(pos) {
    for (var q = 0; q < opsAt.length; q++) if (pos > opsAt[q].open && pos < opsAt[q].close) return true;
    return false;
  }
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); i = s ? s.end : i + 1; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === "/" && looksLikeRegexStart(src, i)) { i = skipRegex(src, i); continue; }

    var matched = false;
    for (var k = 0; k < DATA_FIELDS.length && !matched; k++) {
      var f = DATA_FIELDS[k];
      if (c !== f[0]) continue;
      var prev = src[i - 1] || "";
      if (ID_CHAR.test(prev) || prev === ".") continue;                  // 擋 `nickname:`／`x.name:` 尾巴誤命中
      if (src.slice(i, i + f.length) !== f) continue;
      var after = i + f.length;
      if (ID_CHAR.test(src[after] || "")) continue;                      // 完整識別字（擋 `labelOf`）
      var p = nextNonSpace(src, after);
      if (src[p] !== ":") continue;
      var a = nextNonSpace(src, p + 1);
      if (src[a] !== '"' && src[a] !== "'") continue;                    // 樣板字串／變數不是「整節點鍵」
      var lit = readString(src, a);
      if (!lit) continue;
      if (!HAS_CJK.test(lit.value)) { i = lit.end; matched = true; continue; }
      hits.push({
        key: lit.value.trim(), raw: lit.value, shape: f,
        concat: segmentIsConcat(src, a),
        ops: inOps(i),                                                   // #126 批次二：營運受眾逐宣告口徑
        line: src.slice(0, i).split("\n").length
      });
      i = lit.end; matched = true;
    }
    if (matched) continue;
    i++;
  }
  return hits;
}

function scanDomBindings(src) {
  var hits = [], i = 0;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); i = s ? s.end : i + 1; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === "/" && looksLikeRegexStart(src, i)) { i = skipRegex(src, i); continue; }

    var matched = false;
    for (var k = 0; k < DOM_SHAPES.length && !matched; k++) {
      var sh = DOM_SHAPES[k];
      if (c !== sh.prop[0]) continue;
      if (ID_CHAR.test(src[i - 1] || "")) continue;                       // 擋 `context:`／`innerText`… 的尾巴誤命中
      if (src.slice(i, i + sh.prop.length) !== sh.prop) continue;
      var after = i + sh.prop.length;
      if (ID_CHAR.test(src[after] || "")) continue;                       // 完整識別字（擋 `textContentOf`）
      var p = nextNonSpace(src, after);
      if (src[p] !== sh.sep) continue;
      if (sh.sep === "=" && (src[p + 1] === "=" || src[p - 1] === "!" || src[p - 1] === "=" ||
        src[p - 1] === "<" || src[p - 1] === ">")) continue;              // `textContent ===` 是比較不是賦值
      var a = nextNonSpace(src, p + 1);
      if (src[a] !== '"' && src[a] !== "'") continue;                     // 樣板字串／變數不是「整節點鍵」
      var lit = readString(src, a);
      if (!lit) continue;
      if (!HAS_CJK.test(lit.value)) { i = lit.end; matched = true; continue; }
      hits.push({
        key: lit.value.trim(), raw: lit.value, shape: sh.name,
        concat: segmentIsConcat(src, a),
        line: src.slice(0, i).split("\n").length
      });
      i = lit.end; matched = true;
    }
    if (matched) continue;
    i++;
  }
  return hits;
}

// 極簡正則字面量偵測（避免把 /…/ 裡的引號當字串起頭）：前一個非空白字元屬於運算子/開括號時才算。
function looksLikeRegexStart(src, i) {
  var j = prevNonSpace(src, i);
  if (j < 0) return false;
  return "(,=:[!&|?{};+".indexOf(src[j]) >= 0;
}
function skipRegex(src, i) {
  var j = i + 1, inClass = false;
  while (j < src.length) {
    var c = src[j];
    if (c === "\\") { j += 2; continue; }
    if (c === "\n") return i + 1;                      // 不是正則，退回逐字前進
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) return j + 1;
    j++;
  }
  return i + 1;
}

/*
 * ── 第四面：屬性面 `title` / `aria-label`（#122 · 平台軌 2026-08-25 20:00 窗）───────
 * 【為什麼這一面單獨存在】`core/i18n.js:102` 的 `tAttrs` 翻**三個**屬性
 *   （`title`／`placeholder`／`aria-label`），`OBS.attributeFilter` 也監聽這三個，
 *   但 #120 的 DOM 面只涵蓋 `placeholder` 一個。另外兩個屬性的中文**寫下去就上線**、
 *   切 EN 原樣露繁中；而 `aria-label` 是**螢幕閱讀器唸出來的字**，露繁中比視覺文字更難察覺。
 *   實測命中 354 條（`title:` 333／`"aria-label":` 21），去重後 149 鍵。
 *
 * 【`title` 一詞三義——這才是本面真正的題目】#120 當時把 `title:` 整個排除，理由寫的是
 *   「HTML title 屬性 vs `selftest.register({ title })` 測項標題」**兩**義；實際量下來是**三**義：
 *     ① HTML `title`／`aria-label` 屬性（`el("b",{ title:"遊戲設定" })`）；
 *     ② **測項標題**（`register({ id, title:"…", run: function })`）——全庫 131 條命中；
 *     ③ **玩家面資料欄位**（`notify.add({ title:"紅利已逾期" })`／成就名／發行排程名）。
 *   ①③ 都需要字典條目（同樣會在切語言時露繁中），②**永遠不該翻**（自我檢測面板是開發/營運面）。
 *   ⇒ 本面的射程＝①＋③，判別靠 `testSpecRegions()` 把 ② 逐宣告切掉。
 *
 * 【為什麼判別必須「逐宣告」而不是「逐檔」（＝為什麼不沿用 SPEC_HOSTS）】
 *   #126 批次二把 24 支託管測項的檔整支排除在資料面之外，並在檔頭寫明那是**暫時**手段。
 *   實測那 24 支檔裡有 172 條 `title:` 命中，其中 **131 條是測項標題、41 條是玩家面文案**
 *   （`content.js` 的促銷卡標題、`activity.js`／`responsible.js` 的成就名…）。
 *   逐檔排除＝把那 41 條真缺漏一起藏掉，方向正好是最危險的那個。
 *   ⇒ 本面改判**物件字面量層級**：同一個物件字面量裡直屬有 `run: function` 的，整段是測項 spec。
 *   （#126 批次三＝把同一個判別套回資料面、退役 SPEC_HOSTS。本輪**不做**：實測那 24 支檔的
 *    非 title 欄位還有 100 條 EN 缺漏，其中大半是測項夾具名與 ops 報表欄位，需要另一次受眾裁決。）
 *
 * 【第二種口徑排除：自帶 `locales` 的 descriptor（`naLocale`）】
 *   `core/content.js` 的 12 張促銷卡是 #61 的設計——descriptor **自帶 `locales`**，
 *   `getContent(lang)` 查詢時淺層覆蓋 payload ⇒ **營運文案脫離字典**（該檔第 18 行明載）。
 *   它們的 `title` 永遠不會經過 `HL.i18n` 的字典，補進語言包只會產出**沒有任何表面在消費的死鍵**
 *   （#121 已為「裸正則多算一條 dev-kit 註解範例」付過一次這種代價）。
 *   ⇒ 由 `localeDeclRegions()` 逐宣告排除，計進**看得見的** `naLocale`（不是靜默丟棄——
 *      靜默丟棄正是尺說謊的方式），而它們的譯文由既有的 `content/locale-coverage` 鎖看守。
 *
 * 【射程刻意是「整個 src/ 減 OPS_ONLY」，不是目錄清單】屬性可以掛在任何一支檔的任何一個
 *   元素上，沒有「屬性只寫在某幾個目錄」這回事 ⇒ 用清單就會重演 #119 檔頭那個病
 *   （逐表面特化的鎖，還沒寫的表面永遠零覆蓋）。`src/main.js` 也因此天生在射程內。
 *
 * 【`title` 已自 `DATA_FIELDS` 撤出，交由本面單一持有】否則同一條 `title:"…"` 會被資料面
 *   （寬鬆 `covers`）與屬性面（嚴格 `coversExact`）各記一次、各用一把不同的尺——
 *   本專案反覆踩的「同一把尺被抄成兩份然後 drift」正是這個形狀。撤出當輪實測：
 *   資料面 title 命中全數落入本面射程，逐鍵零遺失。
 */
var ATTR_QUOTED_KEYS = ["title", "aria-label"];    // 引號鍵形狀：`"aria-label": "…"`／`"title": "…"`
var ATTR_BARE_KEY = "title";                       // 裸識別字形狀：`title: "…"`（`aria-label` 有連字號，不可能裸寫）

/* 這個 `{` 是不是**某個 `register(` 呼叫的第一個引數**？——判準與 `hostsTestSpec()` 的
   `\bregister\(` 逐字對齊：認的是**呼叫名恰為 `register`**（含 `x.register`、裸 `register`），
   不認 `registerPause(`／`unregister(`。刻意不綁 `selftest.` 前綴（#126 批次二的教訓：
   只認一種寫法的不變量漏掉 22 支注入式 core 檔）。 */
function isRegisterArgBrace(src, open) {
  var p = prevNonSpace(src, open);
  if (p < 0 || src[p] !== "(") return false;
  var e = prevNonSpace(src, p);                                          // `(` 之前的識別字尾端
  if (e < 0 || !ID_CHAR.test(src[e])) return false;
  var b = e;
  while (b >= 0 && ID_CHAR.test(src[b])) b--;
  return src.slice(b + 1, e + 1) === "register";
}

/* 測項 spec 的**逐宣告**判定：回傳所有「`register(` 的引數物件且直屬含 `run: function`」的區間。
   與 `hostsTestSpec()`（檔案級、給資料面用）刻意同一組結構標記、不同粒度。
   ⚠️ **首版只看 `run: function`，少了 `register(` 那半，當場被錨④-b 抓出來**：
      `core/challenges.js:310` 的 `action: { label:"開啟挑戰面板", run: function(){ open(); } }`
      是**說明中心的行動描述子**，不是測項——它的 `label` 是玩家天天看到的字。
      少那半條件＝任何「帶 run 回呼的描述子」都能讓自己整段免譯，而畫面完全正常。
      （抓到它的是「屬性面認定託管測項的檔，檔案級 hostsTestSpec 也必須同意」這條雙粒度一致性錨——
       CLAUDE.md §4 的自問「這條不變量有沒有第二個消費者」當輪就回本一次。）
   ⚠️ 區間涵蓋整個 spec 物件（含 `run` 的函式主體）＝刻意：測項內部再怎麼寫中文也不上玩家面。 */
function testSpecRegions(src) {
  var out = [], stack = [], i = 0;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); i = s ? s.end : i + 1; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === "/" && looksLikeRegexStart(src, i)) { i = skipRegex(src, i); continue; }
    if (c === "{") { stack.push({ open: i, run: false, reg: isRegisterArgBrace(src, i) }); i++; continue; }
    if (c === "}") { var f = stack.pop(); if (f && f.run && f.reg) out.push({ open: f.open, close: i }); i++; continue; }
    if (c === "r" && src.slice(i, i + 3) === "run" && !ID_CHAR.test(src[i - 1] || "") && src[i - 1] !== "." &&
      !ID_CHAR.test(src[i + 3] || "")) {
      var p = nextNonSpace(src, i + 3);
      if (src[p] === ":" && src.slice(nextNonSpace(src, p + 1), nextNonSpace(src, p + 1) + 8) === "function" && stack.length) {
        stack[stack.length - 1].run = true;                              // 只標**直屬**的那一層
      }
    }
    i++;
  }
  return out;
}

/* 自帶 `locales` 的 descriptor：回傳所有「直屬含 `locales:` 鍵的物件字面量」區間。
   判定同樣是結構標記而非檔名——`core/content.js` 今天是唯一使用者，但 #61 的設計本意
   就是讓任何 descriptor 都能自帶譯文，寫成檔名清單等於把新用法擋在射程外看不見。 */
function localeDeclRegions(src) {
  var out = [], stack = [], i = 0;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); i = s ? s.end : i + 1; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === "/" && looksLikeRegexStart(src, i)) { i = skipRegex(src, i); continue; }
    if (c === "{") { stack.push({ open: i, loc: false }); i++; continue; }
    if (c === "}") { var f = stack.pop(); if (f && f.loc) out.push({ open: f.open, close: i }); i++; continue; }
    if (c === "l" && src.slice(i, i + 7) === "locales" && !ID_CHAR.test(src[i - 1] || "") && src[i - 1] !== "." &&
      !ID_CHAR.test(src[i + 7] || "")) {
      if (src[nextNonSpace(src, i + 7)] === ":" && stack.length) stack[stack.length - 1].loc = true;
    }
    i++;
  }
  return out;
}

/* 屬性面抽取器。與另外兩個抽取器同一套狀態機（字串/註解/正則一律略過＝只認宣告、不認提及），
   差別在①同時認裸鍵 `title:` 與引號鍵 `"title":`／`"aria-label":`；②每筆帶 `spec`／`locale` 兩個口徑旗標。 */
function scanAttrBindings(src) {
  var specAt = testSpecRegions(src), locAt = localeDeclRegions(src);
  function within(list, pos) {
    for (var q = 0; q < list.length; q++) if (pos > list[q].open && pos < list[q].close) return true;
    return false;
  }
  function take(hits, keyName, valPos, atPos) {
    var lit = readString(src, valPos);
    if (!lit) return -1;
    if (HAS_CJK.test(lit.value)) {
      hits.push({
        key: lit.value.trim(), raw: lit.value, shape: keyName,
        concat: segmentIsConcat(src, valPos),
        spec: within(specAt, atPos), locale: within(locAt, atPos),
        line: src.slice(0, atPos).split("\n").length
      });
    }
    return lit.end;
  }

  var hits = [], i = 0;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'") {
      var s = readString(src, i);
      if (s && ATTR_QUOTED_KEYS.indexOf(s.value) >= 0 && src[nextNonSpace(src, s.end)] === ":") {
        var a1 = nextNonSpace(src, nextNonSpace(src, s.end) + 1);
        if (src[a1] === '"' || src[a1] === "'") {
          var e1 = take(hits, s.value, a1, i);
          if (e1 > 0) { i = e1; continue; }
        }
      }
      i = s ? s.end : i + 1; continue;
    }
    if (c === "`") { var sb = readString(src, i); i = sb ? sb.end : i + 1; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e2 = src.indexOf("*/", i + 2); i = e2 < 0 ? src.length : e2 + 2; continue; }
    if (c === "/" && looksLikeRegexStart(src, i)) { i = skipRegex(src, i); continue; }
    if (c === ATTR_BARE_KEY[0] && src.slice(i, i + ATTR_BARE_KEY.length) === ATTR_BARE_KEY &&
      !ID_CHAR.test(src[i - 1] || "") && src[i - 1] !== "." &&                 // 擋 `x.title:`／`subtitle:` 尾巴誤命中
      !ID_CHAR.test(src[i + ATTR_BARE_KEY.length] || "")) {                    // 完整識別字（擋 `titleOf`）
      var p = nextNonSpace(src, i + ATTR_BARE_KEY.length);
      if (src[p] === ":") {
        var a2 = nextNonSpace(src, p + 1);
        if (src[a2] === '"' || src[a2] === "'") {
          var e3 = take(hits, ATTR_BARE_KEY, a2, i);
          if (e3 > 0) { i = e3; continue; }
        }
      }
    }
    i++;
  }
  return hits;
}

/* ── ②-e 第五面：非中文 key 的 `t("nav.menu", "主選單")` 抽取（#129）─────────
 * 【為什麼前四面一條都攔不到】
 *   ① 呼叫面（#119）要求 `t()` 的**第一引數含 CJK** ⇒ `nav.menu` 是純 ASCII，結構性失明；
 *   ② DOM 面（#120）／③ 資料面（#121/#126）／④ 屬性面（#122）都要求值是**引號字面量** ⇒
 *      這裡 `title: t("nav.menu","主選單")` 是**呼叫**，三面同樣看不見。
 *   ⇒ 同一件事的第五種寫法。今天 35/35 個 fallback 都在字典裡（實際外洩 0 條），
 *      但沒有任何機制擋住「下一個 `t("nav.foo","新字串")` 的中文沒進字典」——那一刻
 *      node 全綠、console 零錯誤、畫面只在切語言時壞掉（＝#119 原始事故的形狀）。
 *
 * 【量的是 fallback（第二引數），不是 key】`core/i18n.js` 的 `t(key, def)` 是 passthrough：
 *   它回傳 `def`（＝那串中文），真正查表的是 DOM walker／`tAttrs`。⇒ 需要字典條目的是
 *   **第二引數**；第一引數那 37 個點分 key 在 `en.js`／`zh-Hans.js` 全數零命中、
 *   本來就不是字典鍵，拿它當量測對象會量到一個永遠補不完的空集合。
 *
 * 【覆蓋判定分位置】值落在 `title:`／`"aria-label":`／`placeholder:` 上 ⇒ 走 `tAttrs` 契約
 *   （精確比對，用 `coversExact`）；其餘落到文字節點 ⇒ 走 `tText` 契約（`covers`，吃前/後綴表）。
 *   兩個判定函式已由 #122 建立，此處直接取用、不得自刻第三套。
 *
 * 【與第一面的分界＝第一引數含不含 CJK】`t("中","中")` 屬第一面，此處必須**不收**，
 *   否則同一條鍵被兩段各記一次（#122 探針釘住的同一種重疊病）。
 */
var FB_ATTR_KEYS = ["title", "aria-label", "placeholder"];

/* 這個呼叫是不是掛在屬性鍵上？回傳屬性名（`title`／`aria-label`／`placeholder`）或 ""。
   `callStart` 須是整條 `HL.i18n.t(` 的最左端，否則往左讀到的是 `i18n` 而不是屬性鍵。 */
function fbAttrKeyBefore(src, callStart) {
  var j = prevNonSpace(src, callStart);
  if (j < 0 || src[j] !== ":") return "";
  var k = prevNonSpace(src, j);
  if (k < 0) return "";
  if (src[k] === '"' || src[k] === "'") {              // 引號鍵 `"aria-label": t(…)`
    var q = src[k], m = k - 1;
    while (m >= 0 && src[m] !== q) m--;
    if (m < 0) return "";
    var quoted = src.slice(m + 1, k);
    return FB_ATTR_KEYS.indexOf(quoted) >= 0 ? quoted : "";
  }
  if (!ID_CHAR.test(src[k])) return "";
  var m2 = k;                                          // 裸鍵 `title: t(…)`
  while (m2 >= 0 && ID_CHAR.test(src[m2])) m2--;
  if (src[m2] === ".") return "";                      // `x.title:` 不是屬性宣告
  var bare = src.slice(m2 + 1, k + 1);
  return FB_ATTR_KEYS.indexOf(bare) >= 0 ? bare : "";
}

function scanFallbackKeys(src) {
  var hits = [], i = 0;
  while (i < src.length) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") { var s = readString(src, i); i = s ? s.end : i + 1; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { var e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === "/" && looksLikeRegexStart(src, i)) { i = skipRegex(src, i); continue; }

    if (c === "t" && !ID_CHAR.test(src[i - 1] || "")) {
      var after = i + 1;
      if (!ID_CHAR.test(src[after] || "")) {           // 完整識別字 `t`（擋掉 title/toast/get…）
        var dot = src[i - 1] === ".";
        var ok = !dot || /i18n\s*\.\s*$/.test(src.slice(Math.max(0, i - 12), i));   // 只放行 i18n.t(
        var p = nextNonSpace(src, after);
        if (ok && src[p] === "(") {
          var a = nextNonSpace(src, p + 1);
          if (src[a] === '"' || src[a] === "'") {
            var kLit = readString(src, a);
            if (kLit && !HAS_CJK.test(kLit.value)) {   // 第一引數**不含**中文＝這一面（含中文的歸第一面）
              var comma = nextNonSpace(src, kLit.end);
              if (src[comma] === ",") {
                var b = nextNonSpace(src, comma + 1);
                if (src[b] === '"' || src[b] === "'") {
                  var fLit = readString(src, b);
                  if (fLit && HAS_CJK.test(fLit.value)) {
                    var anchor = dot ? i - 1 : i;
                    var start = anchor;                 // 退到 `HL.i18n.t` 的最左端
                    while (start > 0 && (ID_CHAR.test(src[start - 1]) || src[start - 1] === ".")) start--;
                    var close = matchParen(src, p);
                    hits.push({
                      // key 一律 trim：walker 查的是 `nodeValue.trim()`（core/i18n.js:91），
                      // 不 trim 會產出「補了也不生效」的假缺漏（同第一面檔頭那條教訓）。
                      key: fLit.value.trim(), raw: fLit.value, id: kLit.value,
                      attr: fbAttrKeyBefore(src, start),
                      concat: segmentIsConcat(src, anchor),
                      line: src.slice(0, i).split("\n").length
                    });
                    i = close > 0 ? close + 1 : fLit.end;
                    continue;
                  }
                }
              }
            }
          }
        }
      }
    }
    i++;
  }
  return hits;
}

/* ── ③ 走檔 ────────────────────────────────────────────────────────────── */
function jsFiles(dir, out) {
  out = out || [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    var abs = path.join(dir, d.name);
    if (d.isDirectory()) { if (abs !== I18N_DIR) jsFiles(abs, out); }
    else if (/\.js$/.test(d.name)) out.push(abs);
  });
  return out;
}

/* 主出口：回傳整份量測結果（鎖與報告工具共用同一份） */
function measure() {
  var D = dicts();
  var changed = changedCharSet(D.hans.dict);
  var files = jsFiles(SRC).sort();
  var perFile = {}, totals = { sites: 0, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0 };

  files.forEach(function (abs) {
    var rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    var hits = scanSource(fs.readFileSync(abs, "utf8"));
    if (!hits.length) return;
    var rec = { sites: hits.length, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0, missing: [] };
    var seen = Object.create(null);
    hits.forEach(function (h) {
      totals.sites++;
      if (h.concat) { rec.naConcat++; totals.naConcat++; return; }
      if (!h.key) return;                               // trim 後為空＝不是片語鍵
      if (seen[h.key]) return;                          // 同檔同鍵只算一次（補一條就全補）
      seen[h.key] = true;
      rec.keys++; totals.keys++;
      var missEn = !covers(D.en, h.key);
      var wantHans = needsHans(h.key, changed);
      var missHans = wantHans && !covers(D.hans, h.key);
      if (!wantHans) { rec.naSame++; totals.naSame++; }
      if (missEn) { rec.enMissing++; totals.enMissing++; }
      if (missHans) { rec.hansMissing++; totals.hansMissing++; }
      if (missEn || missHans) rec.missing.push({ key: h.key, line: h.line, en: missEn, hans: missHans });
    });
    rec.gaps = rec.enMissing + rec.hansMissing;
    perFile[rel] = rec;
  });
  totals.gaps = totals.enMissing + totals.hansMissing;
  totals.dictEn = Object.keys(D.en.dict).length;
  totals.dictHans = Object.keys(D.hans.dict).length;
  totals.changedChars = Object.keys(changed).length;
  return {
    perFile: perFile, totals: totals,
    dom: measureDom(files, D, changed),
    data: measureData(files, D, changed),
    attr: measureAttr(files, D, changed),
    fb: measureFallback(files, D, changed)
  };
}

/* 第二面的量測（#120）。刻意與 measure() 同結構、同分類、同 N/A 規則，
   差別只在**中文從哪裡來**：呼叫面來自 `t("…")`，DOM 面來自 `text:`／`textContent=`／`placeholder:`。 */
function measureDom(files, D, changed) {
  var perFile = {}, totals = { sites: 0, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0 };
  files.forEach(function (abs) {
    var rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    var hits = scanDomBindings(fs.readFileSync(abs, "utf8"));
    if (!hits.length) return;
    var rec = { sites: hits.length, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0, missing: [] };
    var seen = Object.create(null);
    hits.forEach(function (h) {
      totals.sites++;
      if (h.concat) { rec.naConcat++; totals.naConcat++; return; }
      if (!h.key) return;
      if (seen[h.key]) return;
      seen[h.key] = true;
      rec.keys++; totals.keys++;
      var missEn = !covers(D.en, h.key);
      var wantHans = needsHans(h.key, changed);
      var missHans = wantHans && !covers(D.hans, h.key);
      if (!wantHans) { rec.naSame++; totals.naSame++; }
      if (missEn) { rec.enMissing++; totals.enMissing++; }
      if (missHans) { rec.hansMissing++; totals.hansMissing++; }
      if (missEn || missHans) rec.missing.push({ key: h.key, line: h.line, shape: h.shape, en: missEn, hans: missHans });
    });
    rec.gaps = rec.enMissing + rec.hansMissing;
    perFile[rel] = rec;
  });
  totals.gaps = totals.enMissing + totals.hansMissing;
  return { perFile: perFile, totals: totals };
}

/* 第三面的量測（#121）。與前兩面同結構、同分類、同 N/A 規則；差別是**中文從哪裡來**
   ——資料宣告檔裡的欄位值。`scopeFiles` 一併回傳，供鎖檢查射程沒有被悄悄縮成空集合。 */
function measureData(files, D, changed) {
  var perFile = {}, scopeFiles = [], opsDeclFiles = [];
  var totals = { sites: 0, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0, naOps: 0 };
  files.forEach(function (abs) {
    var rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    if (!inDataScope(rel)) return;
    scopeFiles.push(rel);
    var raw = fs.readFileSync(abs, "utf8");
    if (opsDeclRegions(raw).length > 0) opsDeclFiles.push(rel);
    var hits = scanDataValues(raw);
    if (!hits.length) return;
    var rec = { sites: hits.length, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0, naOps: 0, missing: [] };
    var seen = Object.create(null);
    hits.forEach(function (h) {
      totals.sites++;
      if (h.ops) { rec.naOps++; totals.naOps++; return; }              // #126 批次二：營運受眾＝口徑，非缺漏
      if (h.concat) { rec.naConcat++; totals.naConcat++; return; }
      if (!h.key) return;
      if (seen[h.key]) return;
      seen[h.key] = true;
      rec.keys++; totals.keys++;
      var missEn = !covers(D.en, h.key);
      var wantHans = needsHans(h.key, changed);
      var missHans = wantHans && !covers(D.hans, h.key);
      if (!wantHans) { rec.naSame++; totals.naSame++; }
      if (missEn) { rec.enMissing++; totals.enMissing++; }
      if (missHans) { rec.hansMissing++; totals.hansMissing++; }
      if (missEn || missHans) rec.missing.push({ key: h.key, line: h.line, shape: h.shape, en: missEn, hans: missHans });
    });
    rec.gaps = rec.enMissing + rec.hansMissing;
    perFile[rel] = rec;
  });
  totals.gaps = totals.enMissing + totals.hansMissing;
  return {
    perFile: perFile, totals: totals, scopeFiles: scopeFiles,
    extra: DATA_EXTRA.slice(), dirs: DATA_DIRS.slice(), opsOnly: OPS_ONLY.slice(),
    opsDeclFiles: opsDeclFiles,
    specHosts: SPEC_HOSTS.slice()
  };
}

/* 第四面的量測（#122）。與前三面同結構、同分類、同 N/A 規則；兩處刻意不同，且都是契約差異：
   ① 覆蓋判定用 `coversExact`（`tAttrs` 沒有前後綴分支）；
   ② 多兩個**看得見的** N/A 桶：`naSpec`（測項 spec 逐宣告）與 `naLocale`（自帶 locales 的 descriptor）。
   `strictDelta` 是自我揭露欄位：本面若改用寬鬆的 `covers()` 會少算幾條——落地當輪為 0，
   代表嚴格判定目前沒有真實 witness，鎖必須自己造合成探針（見鎖內註解）。 */
function measureAttr(files, D, changed) {
  var perFile = {}, scopeFiles = [], specFiles = [], localeFiles = [];
  var totals = { sites: 0, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0, naSpec: 0, naLocale: 0, strictDelta: 0 };
  files.forEach(function (abs) {
    var rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    if (OPS_ONLY.indexOf(rel) >= 0) return;                              // 營運受眾＝口徑排除（與資料面同一份清單）
    scopeFiles.push(rel);
    var raw = fs.readFileSync(abs, "utf8");
    if (testSpecRegions(raw).length > 0) specFiles.push(rel);
    if (localeDeclRegions(raw).length > 0) localeFiles.push(rel);
    var hits = scanAttrBindings(raw);
    if (!hits.length) return;
    var rec = { sites: hits.length, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0, naSpec: 0, naLocale: 0, missing: [] };
    var seen = Object.create(null);
    hits.forEach(function (h) {
      totals.sites++;
      if (h.spec) { rec.naSpec++; totals.naSpec++; return; }             // 測項標題＝自我檢測面板，永遠不翻
      if (h.locale) { rec.naLocale++; totals.naLocale++; return; }       // descriptor 自帶譯文＝脫離字典
      if (h.concat) { rec.naConcat++; totals.naConcat++; return; }
      if (!h.key) return;
      if (seen[h.key]) return;
      seen[h.key] = true;
      rec.keys++; totals.keys++;
      var missEn = !coversExact(D.en, h.key);
      var wantHans = needsHans(h.key, changed);
      var missHans = wantHans && !coversExact(D.hans, h.key);
      if (missEn && covers(D.en, h.key)) totals.strictDelta++;           // 寬鬆判定會漏掉的那一條
      if (missHans && covers(D.hans, h.key)) totals.strictDelta++;
      if (!wantHans) { rec.naSame++; totals.naSame++; }
      if (missEn) { rec.enMissing++; totals.enMissing++; }
      if (missHans) { rec.hansMissing++; totals.hansMissing++; }
      if (missEn || missHans) rec.missing.push({ key: h.key, line: h.line, shape: h.shape, en: missEn, hans: missHans });
    });
    rec.gaps = rec.enMissing + rec.hansMissing;
    perFile[rel] = rec;
  });
  totals.gaps = totals.enMissing + totals.hansMissing;
  return {
    perFile: perFile, totals: totals, scopeFiles: scopeFiles,
    specFiles: specFiles, localeFiles: localeFiles, opsOnly: OPS_ONLY.slice(),
    quotedKeys: ATTR_QUOTED_KEYS.slice(), bareKey: ATTR_BARE_KEY
  };
}

/* 第五面的量測（#129）。與前四面同結構、同分類、同 N/A 規則；差別有二：
   ① 中文來自 `t(<非CJK key>, <CJK fallback>)` 的**第二引數**；
   ② 覆蓋判定**依位置分流**——掛在 `title:`／`"aria-label":`／`placeholder:` 上的走
      `coversExact`（tAttrs 只做精確比對），其餘走 `covers`（tText 吃前/後綴表）。
   `attrSites` 一併回傳，供鎖檢查位置分流沒有被悄悄退化成「全部走寬鬆」。 */
/* 位置分流的**單一決策點**。刻意抽成具名函式並外露，理由與 #122 ④-b 同一條教訓：
   真實語料今天的 strictDelta 是 0 ⇒ 若分流只寫在 measureFallback 內部，把 \`coversExact\`
   改成 \`covers\` 是個 **no-op**（缺漏數一樣 0、鎖一樣全綠）＝那條性質沒有 witness、
   負向擾動會打空。抽出來之後鎖可以直接對它下探針，擾動就一定打得到。 */
function fbCovers(pack, key, attr) {
  return attr ? coversExact(pack, key) : covers(pack, key);
}

function measureFallback(files, D, changed) {
  var perFile = {}, scopeFiles = [];
  var totals = { sites: 0, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0, attrSites: 0, strictDelta: 0 };
  files.forEach(function (abs) {
    var rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    if (OPS_ONLY.indexOf(rel) >= 0) return;                       // 營運受眾＝口徑排除（與資料面/屬性面同一份清單）
    scopeFiles.push(rel);
    var hits = scanFallbackKeys(fs.readFileSync(abs, "utf8"));
    if (!hits.length) return;
    var rec = { sites: hits.length, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0, missing: [] };
    var seen = Object.create(null);
    hits.forEach(function (h) {
      totals.sites++;
      if (h.attr) totals.attrSites++;
      if (h.concat) { rec.naConcat++; totals.naConcat++; return; }
      if (!h.key) return;
      if (seen[h.key]) return;
      seen[h.key] = true;
      rec.keys++; totals.keys++;
      var strict = h.attr;                                        // 屬性位置＝tAttrs 契約（精確比對）
      var hasEn = fbCovers(D.en, h.key, strict);
      var wantHans = needsHans(h.key, changed);
      var hasHans = fbCovers(D.hans, h.key, strict);
      var missEn = !hasEn, missHans = wantHans && !hasHans;
      if (strict && missEn && covers(D.en, h.key)) totals.strictDelta++;
      if (strict && missHans && covers(D.hans, h.key)) totals.strictDelta++;
      if (!wantHans) { rec.naSame++; totals.naSame++; }
      if (missEn) { rec.enMissing++; totals.enMissing++; }
      if (missHans) { rec.hansMissing++; totals.hansMissing++; }
      if (missEn || missHans) rec.missing.push({ key: h.key, line: h.line, id: h.id, attr: h.attr, en: missEn, hans: missHans });
    });
    rec.gaps = rec.enMissing + rec.hansMissing;
    perFile[rel] = rec;
  });
  totals.gaps = totals.enMissing + totals.hansMissing;
  return { perFile: perFile, totals: totals, scopeFiles: scopeFiles, opsOnly: OPS_ONLY.slice(), attrKeys: FB_ATTR_KEYS.slice() };
}

module.exports = {
  measure: measure, scanSource: scanSource, scanDomBindings: scanDomBindings,
  scanDataValues: scanDataValues, inDataScope: inDataScope,
  scanAttrBindings: scanAttrBindings, scanFallbackKeys: scanFallbackKeys,
  fbAttrKeyBefore: fbAttrKeyBefore, fbCovers: fbCovers, testSpecRegions: testSpecRegions,
  localeDeclRegions: localeDeclRegions, coversExact: coversExact,
  segmentIsConcat: segmentIsConcat, isValueGroup: isValueGroup,
  dicts: dicts, covers: covers, changedCharSet: changedCharSet, needsHans: needsHans,
  hostsTestSpec: hostsTestSpec, opsDeclRegions: opsDeclRegions
};

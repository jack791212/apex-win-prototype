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
function segmentIsConcat(src, callStart) {
  /* 一層還不夠：上例的 `+` 在**再外面一層**（呼叫本身包在 `( … ? … : … )` 裡）。
     ⇒ 逐層往外走，任何一層的所在段落有深度 0 的 `+` 就判串接。
     往外走不會亂咬，是因為**每一層都先用該層的逗號切段**——同層的兄弟屬性／兄弟子節點
     （`[el(…), el(…)]`、`el("p", {…}, […])`）都被逗號隔開，不會把別人的 `+` 算到自己頭上。 */
  var at = callStart;
  for (var lv = 0; lv < 5; lv++) {
    var g = groupOf(src, at);
    if (!g) return false;
    if (segHasPlus(src, g.open, g.close, at)) return true;
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

// ② 在群內以深度 0 的逗號切段，找出含 callStart 的那一段，看它有沒有深度 0 的 `+`
function segHasPlus(src, open, close, callStart) {
  var d = 0, segStart = open + 1, hasPlus = false, k = open + 1;
  while (k < close) {
    var ch = src[k];
    if (ch === '"' || ch === "'" || ch === "`") { var s = readString(src, k); k = s ? s.end : k + 1; continue; }
    if (ch === "/" && src[k + 1] === "/") { while (k < src.length && src[k] !== "\n") k++; continue; }
    if (ch === "/" && src[k + 1] === "*") { var e = src.indexOf("*/", k + 2); k = e < 0 ? close : e + 2; continue; }
    if (ch === "(" || ch === "[" || ch === "{") d++;
    else if (ch === ")" || ch === "]" || ch === "}") d--;
    else if (d === 0 && ch === ",") {
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
var DATA_FIELDS = ["tag", "subtitle", "prizeLabel", "label", "name", "style", "game", "t", "title"];
var DATA_EXTRA = ["src/core/game-axes.js"];        // 目錄之外仍屬「資料宣告」的明列檔
function inDataScope(rel) {
  return rel.indexOf("src/data/") === 0 || DATA_EXTRA.indexOf(rel) >= 0;
}

/* 抽取器。刻意與 scanDomBindings 同一套狀態機（字串/註解/正則一律略過＝只認宣告、不認提及），
   差別只在「認哪些鍵」與「值必須是引號字面量」。 */
function scanDataValues(src) {
  var hits = [], i = 0;
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
    data: measureData(files, D, changed)
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
  var perFile = {}, scopeFiles = [];
  var totals = { sites: 0, keys: 0, enMissing: 0, hansMissing: 0, naConcat: 0, naSame: 0 };
  files.forEach(function (abs) {
    var rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    if (!inDataScope(rel)) return;
    scopeFiles.push(rel);
    var hits = scanDataValues(fs.readFileSync(abs, "utf8"));
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
  return { perFile: perFile, totals: totals, scopeFiles: scopeFiles, extra: DATA_EXTRA.slice() };
}

module.exports = {
  measure: measure, scanSource: scanSource, scanDomBindings: scanDomBindings,
  scanDataValues: scanDataValues, inDataScope: inDataScope,
  dicts: dicts, covers: covers, changedCharSet: changedCharSet, needsHans: needsHans
};

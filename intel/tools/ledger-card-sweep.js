/*
 * 台帳自我查核｜「缺口敘述被我們自己的卡關閉了，但台帳沒回填」偵測器
 * ---------------------------------------------------------------------------
 * 用法：node intel/tools/ledger-card-sweep.js
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
 * 【誤報說明】第二欄的「已回填？」是關鍵詞啟發式（找 evidence 裡有沒有「#N 已落地/已修/已完成」
 *   之類的語句），**會有誤報**：2026-08-14 首跑 3 筆告警中有 1 筆（`功能/可驗證公平` 的 #92）
 *   其實當天稍早已回填、只是措辭沒被關鍵詞命中。⇒ 本工具是**收窄檢查範圍**用的，
 *   每一筆仍須人工（或 Claude）讀 evidence 確認，不可直接照單全改。
 */
"use strict";
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..", "..");
var mods = JSON.parse(fs.readFileSync(path.join(ROOT, "intel", "db", "platform-modules.json"), "utf8"));
var backlog = fs.readFileSync(path.join(ROOT, "BACKLOG.md"), "utf8").split(/\r?\n/);

// 卡狀態表：BACKLOG 佇列裡行首形如 `NN. ✅完成` / `NN. 🟦已批准待做` …
var cardState = {};
backlog.forEach(function (l) {
  // 狀態含 ♻️（併入他卡）
  var m = l.match(/^(\d{1,3})\.\s*(✅完成|🟦已批准待做|🏗️進行中|⬜待批准|♻️)/);
  if (m) cardState[m[1]] = m[2];
});

var rows = [];
mods.modules.forEach(function (mod) {
  var ev = mod.evidence || "";
  /* 引用形狀有兩種，**兩種的有效期都等於那張卡的落地時刻**：
   *   ① 開卡：「⇒ 開卡 #N」——首版只認這一種。
   *   ② 委派：「本缺口掛在 #N 底下追蹤」「寫進既有 #59」「併入 #72」——刻意不另開卡、把缺口寄在別張卡上。
   * 【為什麼補 ②（2026-08-22 平台軌 14:00 窗實測）】`活動/抽獎Raffle` 的「兌換碼缺領取資格述詞」
   *   連四輪寫著未變，08-18 那輪明文決定「掛在 #107 底下追蹤，非再度蒸發」；#107 已落地並**確實**
   *   在 `core/redeem.js` 加了 `audience` 述詞閘（FIRSTWEEK／GRIND500 兩碼），但台帳沒回填 ⇒ 台帳
   *   繼續高報一個自己已關閉的缺口。**首版工具對這筆完全免疫**，因為那段話沒有「開卡」二字。
   *   ⇒ 委派型引用是「不開卡」換來的代價：它把回填責任藏得比開卡型更深。 */
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
  ids.forEach(function (id) {
    var st = cardState[id] || "(不在佇列/已封存)";
    // 「已回填」啟發式：evidence 裡有沒有把 #N 講成「已經做完/已關閉」的語句。
    // ⚠️ 2026-08-14 首版只認「已落地/已修/已完成/已兌現」，把「#84 **於 08-11 落地**」「#86 已關閉」
    //    這類同義寫法全部漏掉 ⇒ 回填過的模組下一輪還是會被標紅（假警報疲勞）。已放寬同義詞。
    var verb = "(落地|關閉|補上|補完|修完|完成|兌現|清償)";
    var done = new RegExp("#" + id + "[^。]{0,60}" + verb).test(ev)
            || new RegExp(verb + "[^。]{0,30}#" + id).test(ev);
    rows.push({ cat: mod.category, name: mod.name.split(" ")[0], status: mod.apexwin_status,
                audited: mod.last_audited, card: id, kind: kind[id], cardState: st, backfilled: done });
  });
});

var suspect = rows.filter(function (r) { return r.cardState === "✅完成" && !r.backfilled; });
console.log("台帳 evidence 提及卡號（開卡／委派）共 " + rows.length + " 筆；其中卡已完成者 "
  + rows.filter(function (r) { return r.cardState === "✅完成"; }).length + " 筆\n");
rows.forEach(function (r) {
  var flag = (r.cardState === "✅完成" && !r.backfilled) ? "   ⚠️ 卡已完成、evidence 疑未回填" : "";
  console.log("[" + r.cat + "] " + r.name + " (" + r.status + ", audited " + r.audited + ")"
    + " → " + (r.kind || "開卡") + " #" + r.card + " = " + r.cardState + flag);
});
console.log("\n⚠️ 待人工確認：" + suspect.length + " 筆"
  + (suspect.length ? "（" + suspect.map(function (r) { return r.name + "/#" + r.card; }).join("、") + "）" : ""));
process.exitCode = 0;   // 資訊型工具，不當 CI 閘（誤報率不為零，見檔頭）

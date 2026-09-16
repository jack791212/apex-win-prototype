#!/usr/bin/env node
/*
 * Apex Win｜負向擾動 harness（#201）
 * ═══════════════════════════════════════════════════════════════════════════════
 * 負向擾動是本專案**唯一**用來證明「一條鎖不是空綠」的手段（CLAUDE.md §10.1 第 2 條）：
 * 把剛修好的性質逐一破壞、確認被**對應的那一條**鎖抓到。
 * 而在此之前，它每一輪都是**手刻的一次性腳本**，沒有任何保險。
 *
 * ── 這個檔為什麼存在（2026-09-15 20:00 窗實際發生的事故，不是推論）────────────
 * #185 那一輪的第一批擾動跑到 P11 時**被外層 timeout 砍掉**（SIGTERM/SIGKILL）
 * ⇒ 它的「還原」那一步沒跑到，**P12 的變異就留在 `prototype/tests/checks-platform.js` 裡**。
 * 第二批 harness 啟動時把那個**已被污染**的檔讀成 `orig`，於是**基線本來就是紅的**；
 * 而它的判定只問「跑完之後本鎖有沒有紅」⇒ **七條擾動全部印出 `CAUGHT`，七條全部不可信**，
 * 而輸出看起來完全正常。
 *
 * ⚠️ **一個會說謊的驗證工具比沒有工具更糟**——它讓那一輪的結論、卡片、journal 與
 *    交接檔全部建立在假讀數上。這次是**工具自己**成為了 CLAUDE.md §4「修一半而看不出來」的受害者。
 *
 * ── 因此本工具強制五件事（前三件是 #201 卡面要求，後兩件是落地時追加的）────────
 *   ① **開跑前先量基線**，非全綠就**中止**（連一條擾動都不跑）。
 *   ② **每一條擾動前後都還原目標檔並逐位比對**，比對不過就中止。
 *   ③ 結束時印 `restored identical=true/false`，**false 視同紅**（exit code ≠ 0）。
 *   ④ ⭐ **崩潰殘留自癒（`.perturb-state.json` 哨兵）**——這一條才真正涵蓋得到那次事故。
 *      ③ 的 `finally` 只在「拋例外」時有效；**外層 timeout 是把整個行程砍掉，`finally` 根本不會跑**。
 *      ⇒ 動第一個位元組之前先把原檔內容寫進哨兵；下一次啟動時若哨兵還在且檔案內容對不上，
 *        **先還原、大聲說出來**，再量基線。少了它，卡面的 ①②③ 三條加起來仍然接不住本次事故
 *        （＝這張卡自己也差點成為「修一半」的一員）。
 *   ⑤ **空轉擾動要當場說**——`mutate()` 回傳與原檔逐位相同 ⇒ 判 `NO-OP`，不得靜默記成
 *      CAUGHT/MISSED。來源是 2026-09-15 16:00 窗 money-wheel 的 P6：擾動塞了一個影子宣告，
 *      但真正讀它的是另外兩個函式 ⇒ **行為根本沒變，鎖當然綠**，而那被誤讀成「漏鎖」。
 *
 * ── 用法 ───────────────────────────────────────────────────────────────────────
 *   A. 當模組用（寫鎖當下最常用）：
 *        var perturb = require("<repo>/intel/tools/perturb.js");
 *        var r = perturb.run({
 *          file: "prototype/tests/checks-platform.js",   // repo 相對路徑；多檔用 files: [...]
 *          lockId: "platform/perturb-harness-has-a-fuse",
 *          cases: [
 *            { name: "P1 拿掉 (A) 的射程點名", mutate: function (src) { return src.replace(...); } },
 *            …
 *          ],
 *          argv: process.argv.slice(2)                    // 讓 --case 生效
 *        });
 *        process.exit(r.ok ? 0 : 1);
 *   B. 當 CLI 用：`node intel/tools/perturb.js <spec.js> [--case 3|--case 拿掉射程]`
 *      （`<spec.js>` module.exports 一份上面那種 spec）
 *
 *   ⚠️ `--case` 存在的理由就是那次事故：一次跑十四條 × 每條一輪完整自我檢測，
 *      很容易撞上外層 timeout。**條數多就分批跑，不要賭。**
 *
 * ── 刻意不做 ───────────────────────────────────────────────────────────────────
 *   不接進 `prototype/tests/run.js`。擾動是**寫鎖當下**的工具，不是每次自我檢測都要跑的東西
 *   （跑一輪擾動 ＝ 跑 N 次完整測試套組）。常駐鎖 `platform/perturb-harness-has-a-fuse`
 *   守的是**本工具的控制流**（用注入的假驗證器 + 記憶體 io，毫秒級），不是真的去擾動誰。
 * ═══════════════════════════════════════════════════════════════════════════════
 */
"use strict";
var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var ROOT = path.join(__dirname, "..", "..");                        // repo 根
var SENTINEL_PATH = path.join(__dirname, ".perturb-state.json");    // 崩潰殘留哨兵（.gitignore）

/* ══════════════════════════════════════════════════════════════════════════════
 * io 接縫：預設打真檔案；鎖注入記憶體版本 ⇒ 控制流可以毫秒級、零副作用地被打一遍。
 * （與 `verify` 同一個理由：本工具唯一能被驗證的東西就是它的控制流，
 *   而控制流若只能靠「真的去擾動一次」來驗，那就等於沒有被驗過。）
 * ══════════════════════════════════════════════════════════════════════════════ */
function fsIo() {
  return {
    read: function (abs) { return fs.readFileSync(abs); },
    write: function (abs, buf) { fs.writeFileSync(abs, buf); },
    exists: function (abs) { try { return fs.existsSync(abs); } catch (e) { return false; } },
    remove: function (abs) { try { fs.unlinkSync(abs); } catch (e) {} }
  };
}

/** 記憶體 io（給鎖用）。`seed` = { absPath: "內容" }。 */
function makeMemIo(seed) {
  var store = {};
  Object.keys(seed || {}).forEach(function (k) { store[k] = Buffer.from(String(seed[k]), "utf8"); });
  return {
    _store: store,
    read: function (abs) {
      if (!Object.prototype.hasOwnProperty.call(store, abs)) throw new Error("ENOENT: " + abs);
      return store[abs];
    },
    write: function (abs, buf) { store[abs] = Buffer.from(buf); },
    exists: function (abs) { return Object.prototype.hasOwnProperty.call(store, abs); },
    remove: function (abs) { delete store[abs]; }
  };
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 預設驗證器：真的跑一輪自我檢測，回 { total, pass, fail, failures:[id…] }
 * ══════════════════════════════════════════════════════════════════════════════ */
function parseRun(out) {
  var failures = [], seen = {}, pass = 0, fail = 0, skip = 0;
  String(out).split("\n").forEach(function (line) {
    var m = /^\s*(✅|❌|⏭)\s+(\S+)/.exec(line);
    if (!m) return;
    var id = m[2];
    if (seen[id + "|" + m[1]]) return;              // fast/deep 兩段各印一次，同 id 同狀態只記一次
    seen[id + "|" + m[1]] = 1;
    if (m[1] === "✅") pass++;
    else if (m[1] === "❌") { fail++; if (failures.indexOf(id) < 0) failures.push(id); }
    else skip++;
  });
  return { total: pass + fail + skip, pass: pass, fail: fail, skip: skip, failures: failures };
}

function defaultVerify(spec) {
  spec = spec || {};
  var args = [path.join(ROOT, "prototype", "tests", "run.js")];
  if (spec.deep) args.push("--deep");
  if (spec.group) { args.push("--group"); args.push(spec.group); }
  // `_exec` 是給常駐鎖用的接縫：鎖要能餵一份合成的 stdout 進來，證明
  // 「解析不到任何一項時必須拋錯」這條 fail-closed 防線真的在 defaultVerify 裡，
  // 而不是只寫在註解上。生產路徑一律走下面的 execFileSync。
  var exec = spec._exec || function () {
    return cp.execFileSync(process.execPath, args, {
      cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
      timeout: spec.timeoutMs || 300000
    });
  };
  var out = null;
  try {
    out = exec();
  } catch (e) {
    // exit code 1 ＝「有測項紅」，那是本工具的正常路徑；其餘（逾時被砍、無法啟動）一律當成量不到。
    var statusIsNumber = e && typeof e.status === "number";
    if (statusIsNumber && e.stdout != null) out = String(e.stdout);
    else {
      throw new Error("自我檢測無法完成（不是『有測項紅』，是根本量不到）：" +
        ((e && e.signal) ? "被訊號 " + e.signal + " 砍掉" : (e && e.message) || String(e)));
    }
  }
  var r = parseRun(out);
  if (r.total === 0) throw new Error("自我檢測輸出解析不到任何一項 ⇒ 判定基礎不存在，不得繼續");
  return r;
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 哨兵：動第一個位元組之前寫，收尾刪。存在＝上一次沒有正常收場。
 * ══════════════════════════════════════════════════════════════════════════════ */
function writeSentinel(io, sentinelPath, originals) {
  var payload = { written_at: new Date().toISOString(), files: {} };
  Object.keys(originals).forEach(function (abs) {
    payload.files[abs] = originals[abs].toString("base64");
  });
  io.write(sentinelPath, Buffer.from(JSON.stringify(payload, null, 2), "utf8"));
}

function clearSentinel(io, sentinelPath) { io.remove(sentinelPath); }

/**
 * 崩潰殘留自癒。回 { found, restored:[rel…], alreadyClean:[rel…] }
 * ⚠️ 這一段才是真正接得住「外層 timeout 砍掉整個行程」的那一段——`finally` 接不到它。
 */
function healFromSentinel(io, sentinelPath, log) {
  var out = { found: false, restored: [], alreadyClean: [] };
  if (!io.exists(sentinelPath)) return out;
  out.found = true;
  var payload;
  try { payload = JSON.parse(io.read(sentinelPath).toString("utf8")); }
  catch (e) {
    log("⚠️ 哨兵檔存在但讀不懂（" + ((e && e.message) || e) + "）⇒ 無法自癒，請手動 `git status` 檢查工作區。");
    return out;
  }
  Object.keys(payload.files || {}).forEach(function (abs) {
    var want = Buffer.from(payload.files[abs], "base64");
    var have = io.exists(abs) ? io.read(abs) : null;
    if (have && Buffer.compare(have, want) === 0) { out.alreadyClean.push(abs); return; }
    io.write(abs, want);
    out.restored.push(abs);
  });
  clearSentinel(io, sentinelPath);
  log("♻️  上一次擾動沒有正常收場（哨兵寫於 " + (payload.written_at || "?") + "）。");
  if (out.restored.length) {
    log("   已還原 " + out.restored.length + " 個被留下的變異：");
    out.restored.forEach(function (a) { log("     · " + path.relative(ROOT, a)); });
    log("   ⇒ 這正是 #201 要防的那件事：**被污染的檔會被下一輪讀成基線**，於是每一條擾動都印 CAUGHT 而全部不可信。");
  } else {
    log("   目標檔內容已與原檔一致（多半是被手動還原過）⇒ 只清掉哨兵。");
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 主入口
 * ══════════════════════════════════════════════════════════════════════════════ */
function normFiles(spec) {
  var list = spec.files ? spec.files.slice() : (spec.file ? [spec.file] : []);
  return list.map(function (rel) {
    return { rel: rel, abs: path.isAbsolute(rel) ? rel : path.join(ROOT, rel) };
  });
}

/**
 * `--case` 的三種寫法（存在的理由就是那次 timeout 事故：條數多就分批跑，不要賭）：
 *   `--case 3`        第 3 條（1-based）
 *   `--case 1-5,9`    第 1~5 與第 9 條
 *   `--case 射程`      名稱含這個子字串的每一條
 */
function pickCases(cases, argv) {
  var i = (argv || []).indexOf("--case");
  if (i < 0) return { list: cases, filter: null };
  var want = String((argv || [])[i + 1] || "").trim();
  var wanted = null;
  if (/^[0-9]+(\s*-\s*[0-9]+)?(\s*,\s*[0-9]+(\s*-\s*[0-9]+)?)*$/.test(want)) {
    wanted = {};
    want.split(",").forEach(function (part) {
      var mm = /^\s*([0-9]+)\s*-\s*([0-9]+)\s*$/.exec(part);
      if (mm) { for (var k = +mm[1]; k <= +mm[2]; k++) wanted[k] = 1; }
      else wanted[parseInt(part, 10)] = 1;
    });
  }
  var list = cases.filter(function (c, idx) {
    if (wanted) return !!wanted[idx + 1];
    return c.name.indexOf(want) >= 0;
  });
  return { list: list, filter: want };
}

function run(spec) {
  var log = spec.log || function () { console.log.apply(console, arguments); };
  var io = spec.io || fsIo();
  var sentinelPath = spec.sentinelPath || SENTINEL_PATH;
  var lockId = spec.lockId;
  var files = normFiles(spec);
  var result = {
    ok: false, aborted: false, reason: null, healed: null,
    baseline: null, results: [], missed: [], noop: [], restoredIdentical: null
  };

  if (!lockId) { result.aborted = true; result.reason = "spec 少了 lockId ⇒ 沒有判定對象"; log("❌ " + result.reason); return result; }
  if (!files.length) { result.aborted = true; result.reason = "spec 少了 file/files ⇒ 沒有擾動對象"; log("❌ " + result.reason); return result; }
  if (!spec.cases || !spec.cases.length) { result.aborted = true; result.reason = "spec 少了 cases ⇒ 沒有擾動可跑"; log("❌ " + result.reason); return result; }

  var verify = spec.verify || function () { return defaultVerify(spec); };

  /* ── ④ 先處理崩潰殘留，再量基線（順序不可換：殘留正是讓基線變紅的那個東西）── */
  result.healed = healFromSentinel(io, sentinelPath, log);

  /* ── 記下原檔（逐位，Buffer；不經 utf8 往返）── */
  var originals = {};
  for (var i = 0; i < files.length; i++) {
    try { originals[files[i].abs] = io.read(files[i].abs); }
    catch (e) {
      result.aborted = true;
      result.reason = "讀不到目標檔 " + files[i].rel + "：" + ((e && e.message) || e);
      log("❌ " + result.reason);
      return result;
    }
  }

  /* ── ① 基線：非全綠就中止，連一條都不跑 ───────────────────────────────────── */
  var base;
  try { base = verify(); }
  catch (e) {
    result.aborted = true;
    result.reason = "基線量不到：" + ((e && e.message) || e);
    log("❌ " + result.reason);
    return result;
  }
  result.baseline = base;
  if (base.fail !== 0) {
    result.aborted = true;
    result.reason = "基線不是全綠（" + base.fail + " 項紅：" + base.failures.join(", ") + "）" +
      " ⇒ **中止**。基線是紅的時候，每一條擾動都會印 CAUGHT 而全部不可信（#201 事故本體）。" +
      "先把工作區弄乾淨（`git status` / `git checkout -- <檔>`）再跑。";
    log("❌ " + result.reason);
    return result;
  }
  log("✓ 基線全綠：" + base.pass + " 項通過" + (base.skip ? "、" + base.skip + " 略過" : "") + "。開始擾動。");

  var picked = pickCases(spec.cases, spec.argv);
  if (picked.filter !== null) log("   （--case " + picked.filter + " ⇒ 本次只跑 " + picked.list.length + " 條）");
  if (!picked.list.length) {
    result.aborted = true;
    result.reason = "--case " + picked.filter + " 沒有對到任何一條擾動";
    log("❌ " + result.reason);
    return result;
  }

  function restoreAll() {
    Object.keys(originals).forEach(function (abs) { io.write(abs, originals[abs]); });
  }
  function identicalAll() {
    return Object.keys(originals).every(function (abs) {
      var have;
      try { have = io.read(abs); } catch (e) { return false; }
      return Buffer.compare(have, originals[abs]) === 0;
    });
  }

  /* ── 動第一個位元組之前寫哨兵 ──────────────────────────────────────────────── */
  writeSentinel(io, sentinelPath, originals);

  try {
    for (var c = 0; c < picked.list.length; c++) {
      var cs = picked.list[c];
      var label = "[" + (c + 1) + "/" + picked.list.length + "] " + cs.name;

      /* 產生變異（多檔時 mutate 收/回一個 {rel: text} 的 map） */
      var mutated = {}, threw = null;
      try {
        if (files.length === 1) {
          mutated[files[0].abs] = String(cs.mutate(originals[files[0].abs].toString("utf8"), files[0].rel));
        } else {
          var mapIn = {};
          files.forEach(function (f) { mapIn[f.rel] = originals[f.abs].toString("utf8"); });
          var mapOut = cs.mutate(mapIn) || {};
          files.forEach(function (f) {
            if (Object.prototype.hasOwnProperty.call(mapOut, f.rel)) mutated[f.abs] = String(mapOut[f.rel]);
          });
        }
      } catch (e) { threw = e; }

      if (threw) {
        // 擾動函式自己爆了 ⇒ 據實記一筆 ERROR，**還原後**繼續下一條（不讓一條壞擾動吃掉整批）。
        restoreAll();
        result.results.push({ name: cs.name, verdict: "ERROR", error: (threw && threw.message) || String(threw) });
        log("❌ " + label + " → ERROR（擾動函式拋例外：" + ((threw && threw.message) || threw) + "）");
        continue;
      }

      /* ── ⑤ 空轉擾動：一個位元組都沒改到 ⇒ 這條證明不了任何事 ── */
      var changed = Object.keys(mutated).some(function (abs) {
        return Buffer.compare(Buffer.from(mutated[abs], "utf8"), originals[abs]) !== 0;
      });
      if (!changed) {
        result.noop.push(cs.name);
        result.results.push({ name: cs.name, verdict: "NO-OP" });
        log("⚠️  " + label + " → **NO-OP**（mutate 回傳與原檔逐位相同）" +
          " ⇒ 這條沒有擾動到任何東西，鎖當然綠。先確認 replace 的字面量真的在檔裡，再重跑。");
        continue;
      }

      /* ── 寫入變異 → 量 → 還原 → ② 逐位比對 ── */
      Object.keys(mutated).forEach(function (abs) { io.write(abs, Buffer.from(mutated[abs], "utf8")); });
      var r = null, verr = null;
      try { r = verify(); } catch (e) { verr = e; }
      restoreAll();

      if (!identicalAll()) {
        result.aborted = true;
        result.reason = "還原後與原檔**逐位不同** ⇒ 立即中止（再跑下去會把污染累積進下一條的基線）。";
        log("❌ " + label + " → " + result.reason);
        break;
      }

      if (verr) {
        result.results.push({ name: cs.name, verdict: "ERROR", error: (verr && verr.message) || String(verr) });
        log("❌ " + label + " → ERROR（量不到：" + ((verr && verr.message) || verr) + "）");
        continue;
      }

      var caught = r.failures.indexOf(lockId) >= 0;
      var others = r.failures.filter(function (id) { return id !== lockId; });
      result.results.push({ name: cs.name, verdict: caught ? "CAUGHT" : "MISSED", others: others });
      if (!caught) result.missed.push(cs.name);
      log((caught ? "✅ " : "❌ ") + label + " → " + (caught ? "CAUGHT" : "**MISSED**") +
        (others.length ? "（另有 " + others.length + " 條也紅：" + others.join(", ") + "）" : "") +
        (caught ? "" : " ⇒ 本鎖對這個破壞是空綠的"));
    }
  } finally {
    /* ── ③ 不論怎麼離開，先還原、再逐位比對、然後把結論印出來 ── */
    restoreAll();
    result.restoredIdentical = identicalAll();
    if (result.restoredIdentical) clearSentinel(io, sentinelPath);
    log("restored identical=" + result.restoredIdentical);
    if (!result.restoredIdentical) {
      log("❌ 還原失敗 ⇒ **視同紅**。哨兵 " + sentinelPath + " 刻意保留，下一次啟動會自動還原。");
    }
  }

  // 「這一輪算不算數」只有一個判準：每一條都 CAUGHT。
  // ⚠️ 刻意**不**再並上 `missed.length === 0 && noop.length === 0`——那兩個是同一件事的第二份真相
  //   （verdict 與清單是在同一處一起寫的），而本專案吃過太多次「同一件事有兩份真相」的虧。
  //   `missed`／`noop` 只作報表用。`results.length > 0` 則擋「一條都沒跑到卻宣稱全數通過」。
  result.ok = !result.aborted && result.restoredIdentical === true &&
    result.results.length > 0 &&
    result.results.every(function (x) { return x.verdict === "CAUGHT"; });

  var caughtN = result.results.filter(function (x) { return x.verdict === "CAUGHT"; }).length;
  log((result.ok ? "✅ " : "❌ ") + "負向擾動 " + caughtN + "/" + result.results.length + " CAUGHT" +
    (result.missed.length ? "｜MISSED " + result.missed.length : "") +
    (result.noop.length ? "｜NO-OP " + result.noop.length : "") +
    (result.aborted ? "｜已中止" : ""));
  return result;
}

/* ══════════════════════════════════════════════════════════════════════════════ */
module.exports = {
  run: run,
  parseRun: parseRun,
  defaultVerify: defaultVerify,
  makeMemIo: makeMemIo,
  healFromSentinel: healFromSentinel,
  writeSentinel: writeSentinel,
  SENTINEL_PATH: SENTINEL_PATH,
  ROOT: ROOT
};

/* ── CLI：node intel/tools/perturb.js <spec.js> [--case N|名稱片段] ───────────── */
if (require.main === module) {
  var argv = process.argv.slice(2);
  var specPath = argv.filter(function (a) { return a.indexOf("--") !== 0; })[0];
  if (!specPath) {
    console.log("用法：node intel/tools/perturb.js <spec.js> [--case N|名稱片段]");
    console.log("      <spec.js> 需 module.exports = { file|files, lockId, cases:[{name,mutate}] }");
    process.exit(2);
  }
  var spec = require(path.isAbsolute(specPath) ? specPath : path.join(process.cwd(), specPath));
  spec.argv = argv;
  var res = run(spec);
  process.exit(res.ok ? 0 : 1);
}

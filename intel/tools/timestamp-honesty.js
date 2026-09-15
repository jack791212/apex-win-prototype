/*
 * timestamp-honesty.js — 引擎時戳的單一把尺（E15）
 * ---------------------------------------------------------------------------
 * 【它守的是什麼】
 * 引擎裡有兩種時戳，都是**收尾時由執行者寫下**的：
 *   ① `intel/STATE.json` 的 last_platform_run_at / last_games_run_at / last_maintain_run_at
 *   ② `intel/CONTROL.md` 的 build_lock 心跳（格式 `<前綴>-<時分秒>-<亂數>@<ISO 起始>@<ISO 最後心跳>`）
 * 兩者都**不是量到的，是敘述出來的**：2026-09-14 維護軌實測 307 次「值有變」的寫入裡
 * **212 次（69%）比寫下它的那個 commit 還晚**，最大 +110 分；而且偏移**永遠是往未來**
 * ——偏的方向剛好讓每一軌看起來比實際更活著。
 *
 * 【為什麼這件事會痛】
 * 讀這兩個值的是引擎唯一的兩條自癒路徑：
 *   - `catchup_if_dark_hours`(24h) 與維護軌存活訊號①：問「這一軌暗了沒」。誤差單向 ⇒ 系統性偏樂觀。
 *   - `lock_heartbeat_stale_min`(45 分) 的 stale-heal：**2026-08-03「73 小時掛死」事故唯一的自癒機制**。
 *     2026-09-15 00:00 窗當場量到一次中途心跳把自己寫到 **+59.5 分的未來＝門檻的 132%**
 *     ⇒ 若該 session 在那之後凍結，下一軌要多等整整一個寬限期才判得出 stale。
 *
 * 【兩條不變量的方向**刻意不同**】
 *   A. run_at：只檢 **HEAD**（`git show HEAD:intel/STATE.json`），**工作區豁免**——
 *      因為本輪自己的未提交草稿必然「還沒有 commit 時間」可比，檢它只會誤報。
 *   B. 鎖心跳：檢 **工作區**，**沒有豁免**——因為 stale-heal 的讀者讀的就是工作區那一行
 *      （SKILL 明文「讀鎖要讀本機工作區，不要讀 origin/master」）。
 *      心跳寫未來在任何情況下都沒有正當用途。
 *
 * 【歷史不回填】那 212 筆維持原樣：回填等於捏造我們沒有的精度（比照 P1/P7「寧可低估新鮮度」）。
 */
"use strict";

var RUN_AT_KEYS = ["last_platform_run_at", "last_games_run_at", "last_maintain_run_at"];

function ms(iso) {
  if (typeof iso !== "string" || !iso) return NaN;
  var v = new Date(iso).getTime();
  return typeof v === "number" ? v : NaN;
}

/* ── A. run_at 不得晚於寫下它的那個 commit ──────────────────────────────────
 * 純函式：吃一個 STATE 物件 + 「最近一次改動 STATE.json 的 commit」的 committer ISO，
 * 回傳違規清單。tolerateMin 預設 0（嚴格）——寬容值存在只是為了讓測項能證明它有被用到。
 * 缺鍵也算違規：一個讀不到的存活訊號跟一個說謊的存活訊號一樣危險（fail-closed）。 */
function runAtViolations(stateObj, commitIso, tolerateMin) {
  var tol = (tolerateMin || 0) * 60000;
  var base = ms(commitIso);
  var out = [];
  if (!stateObj || typeof stateObj !== "object") {
    return [{ key: "(STATE)", reason: "no-state", detail: "讀不到 STATE 物件" }];
  }
  if (isNaN(base)) {
    return [{ key: "(commit)", reason: "bad-commit-time", detail: String(commitIso) }];
  }
  for (var i = 0; i < RUN_AT_KEYS.length; i++) {
    var k = RUN_AT_KEYS[i], v = stateObj[k];
    if (v === undefined || v === null || v === "") {
      out.push({ key: k, reason: "missing", detail: "鍵不存在＝存活訊號讀不到" });
      continue;
    }
    var t = ms(v);
    if (isNaN(t)) { out.push({ key: k, reason: "unparsable", detail: String(v) }); continue; }
    if (t - base > tol) {
      out.push({
        key: k, reason: "future", declared: v, commit: commitIso,
        driftMin: Math.round((t - base) / 60000)
      });
    }
  }
  return out;
}

/* ── B. build_lock 心跳 ─────────────────────────────────────────────────────
 * 解析 CONTROL.md 的 build_lock 行。回傳：
 *   { held:false }                                  ← `build_lock: false`（沒人持鎖）
 *   { held:true, token, startIso, beatIso }          ← 新格式（帶 @ 心跳）
 *   { held:true, token, startIso:null, beatIso:null }← 舊格式（無 @，退化用 mtime，非本尺職責）
 *   null                                             ← 連 build_lock 這一行都找不到（呼叫端須 fail-closed）
 * 只取 `#` 註解之前的值——鎖行後面永遠跟著一長串中文註記。 */
function parseLockLine(text) {
  if (typeof text !== "string") return null;
  var m = /^[ \t]*build_lock[ \t]*:[ \t]*(.*)$/m.exec(text);
  if (!m) return null;
  var raw = m[1];
  var hash = raw.indexOf("#");
  if (hash >= 0) raw = raw.slice(0, hash);
  raw = raw.trim();
  if (!raw || raw === "false" || raw === "null") return { held: false };
  var parts = raw.split("@");
  if (parts.length < 3) return { held: true, token: parts[0], startIso: null, beatIso: null };
  return { held: true, token: parts[0], startIso: parts[1].trim(), beatIso: parts[2].trim() };
}

/* 心跳晚於 now ⇒ 違規。回 null 表示「沒有可檢的心跳」（沒人持鎖／舊格式）。
 * ⚠️ 這裡的 now 必須由呼叫端用系統時鐘求值，不得由敘述傳入——那正是本卡要治的病。 */
function heartbeatViolation(lockInfo, nowIso) {
  if (!lockInfo) return { reason: "no-lock-line", detail: "CONTROL.md 找不到 build_lock 行" };
  if (!lockInfo.held) return null;
  if (!lockInfo.beatIso) return null; // 舊格式：退化用 mtime，不在本尺射程
  var beat = ms(lockInfo.beatIso), now = ms(nowIso);
  if (isNaN(now)) return { reason: "bad-now", detail: String(nowIso) };
  if (isNaN(beat)) return { reason: "unparsable", detail: String(lockInfo.beatIso) };
  if (beat > now) {
    return {
      reason: "future", beat: lockInfo.beatIso, now: nowIso,
      aheadMin: Math.round((beat - now) / 60000), token: lockInfo.token
    };
  }
  return null;
}

module.exports = { RUN_AT_KEYS: RUN_AT_KEYS, runAtViolations: runAtViolations, parseLockLine: parseLockLine, heartbeatViolation: heartbeatViolation };

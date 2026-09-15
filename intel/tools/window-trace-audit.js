#!/usr/bin/env node
/**
 * window-trace-audit.js — 「這個窗到底有沒有發生過？」的可重跑量尺
 *
 * 由 E16 立（2026-09-16 維護軌·00:00 窗）。
 *
 * ── 為什麼需要它 ──────────────────────────────────────────────
 * `log_yield_rounds: true` 的契約是「repo 沒寫下＝沒發生」，它涵蓋的是**自願退出**
 * （讓路／撞鎖／no-op／退避各留一行）。但 2026-09-15 12:00 維護窗證明了第三種收場：
 * 該輪**有觸發、跑了 33 分鐘、然後被帳號 session 上限砍死**
 * （排程器記 `failed: You've hit your session limit · resets 1pm`）。
 * 它死在收尾之前 ⇒ journal 沒有一行、STATE 沒有一筆、counters 沒有 +1、
 * 而它手上那張卡（E15）的產出**已經寫進工作區**、由平台軌 14:00 窗 rescue-commit 進了 HEAD。
 * ⇒ 一個窗可以「完全發生過、產出還在線上」而**台帳上完全不存在**。
 *
 * 更糟的是既有判準會**指向錯的結論**：三軌 wrapper 寫
 *「`last_*_run_at` 落後 >24h 且無讓路留痕 ⇒ 很可能是 session 掛死佔住 task slot
 *  ⇒ 需人工 delete + create 重建排程任務」。
 * 本次實測：排程任務**完全健康**（準時觸發、`lastRunAt` 逐窗前進、後續 firing 正常），
 * 照那條規則做就是對一個好端端的排程器做一次無謂的破壞性重建。
 * ⇒ 「暗了」有三種成因，而它們的處置完全不同（見 --help 的三態表）。
 *
 * ── 這把尺做什麼 ──────────────────────────────────────────────
 * 依三軌 cron 列舉「應該觸發過的窗」，逐窗到 `intel/loop-journal.md` 找留痕：
 *   ① 輪次條目   `- **YYYY-MM-DD <軌>·HH:00 窗**（…`
 *   ② 退出留痕   `↳ (YYYY-MM-DD <軌>·HH:00 firing＝讓路：…`
 * 兩者**任一**即算留痕（一個窗要嘛做事、要嘛留一行說為什麼沒做事）。
 * 沒有留痕的窗＝**需要人去問一句**的窗。
 *
 * ── 它答不出來的那一半（據實聲明，勿超譯）────────────────────
 * 本尺只讀 repo，**分不出**「機器/App 沒開 ⇒ 根本沒觸發」與「觸發了但死在收尾前」。
 * 這兩者在 repo 裡逐位元組同形——這正是 2026-08-03「73 小時掛死」當年查不出來的原因。
 * 要定案必須問排程器本身：
 *     mcp__scheduled-tasks__list_task_runs  { taskId: "apexwin-maintain" }
 * ⚠️ 該工具**排程輪自己就叫得到**（2026-09-16 實測）。三軌 wrapper 舊註
 *「只有使用者/前景能查 list_scheduled_tasks」**已不成立**，勿再照抄。
 *
 * 用法：
 *   node intel/tools/window-trace-audit.js                # 近 7 天
 *   node intel/tools/window-trace-audit.js --days 14
 *   node intel/tools/window-trace-audit.js --json
 */

'use strict';
const fs = require('fs');
const path = require('path');

/** 三軌排程（與 CONTROL.md §6／各軌 wrapper 的 cron 一致）。
 *  ⚠️ 這張表就是本尺的**射程**。少一軌或少一個時段＝那一格從此沒有任何東西在看，
 *  而報告仍然一切正常（E14／U38／#190 全家族的共同形狀）⇒ 由常駐鎖
 *  `platform/window-trace-ruler` 逐軌逐時逐一點名比對，改動當場轉紅。 */
const SCHEDULE = {
  平台軌: [8, 14, 20],
  遊戲軌: [10, 16, 22],
  維護軌: [0, 12],
};

const TRACKS = Object.keys(SCHEDULE);

/** 留痕的兩種形狀。**兩種都要算**：
 *  只認①＝每個讓路輪都變成假警報；只認②＝每個正常工作輪都變成假警報。
 *
 *  ⚠️ 兩條都釘在**行首（第 0 欄）**，而且掃描端**不得先 trim**。
 *  初版對每行 `.trim()` 再比對，結果是：**一個縮排的子項只要「談論」某個窗，
 *  就會被算成那個窗的留痕**——而談論失蹤的窗，正是發現它之後第一件會做的事
 *  ⇒ 這個 fail-open **只在它最該工作的那一刻失效**（§4「修一半而看不出來」家族）。
 *  實測：真 journal 裡合法留痕**縮排者 0 筆**（兩種形狀各 grep 一次）⇒ 收緊零損失。
 *  留痕是**頂層條目**；縮排的子項是敘述，不是留痕。 */
const TRACE_PATTERNS = [
  // ① 輪次條目
  { kind: 'round', re: /^-\s*\*\*(\d{4}-\d{2}-\d{2})\s*(平台軌|遊戲軌|維護軌)·(\d{1,2}):00\s*窗/ },
  // ② 退出留痕（讓路／撞鎖／no-op／退避）
  { kind: 'yield', re: /^↳\s*\((\d{4}-\d{2}-\d{2})\s*(平台軌|遊戲軌|維護軌)·(\d{1,2}):00\s*(?:firing|窗)/ },
];

function parseArgs(argv) {
  const o = { days: 7, json: false, graceHours: 2, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--days') o.days = Number(argv[++i]);
    else if (a === '--grace-hours') o.graceHours = Number(argv[++i]);
  }
  if (!Number.isFinite(o.days) || o.days <= 0) o.days = 7;
  if (!Number.isFinite(o.graceHours) || o.graceHours < 0) o.graceHours = 2;
  return o;
}

function ymd(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/** 掃 journal，回傳 Set of "YYYY-MM-DD|軌|H" 與逐筆明細。 */
function collectTraces(journalPath) {
  const text = fs.readFileSync(journalPath, 'utf8');
  const lines = text.split('\n');
  const seen = new Map(); // key -> {kind, line}
  for (const raw of lines) {
    // 只去尾端空白/CR；**行首空白一律保留**，讓上面的 ^ 錨真的擋得住縮排的敘述。
    const line = raw.replace(/\s+$/, '');
    for (const p of TRACE_PATTERNS) {
      const m = p.re.exec(line);
      if (!m) continue;
      const key = m[1] + '|' + m[2] + '|' + String(Number(m[3]));
      // 同一窗可能既有輪次條目又有補記；先到者為準，round 優先於 yield
      if (!seen.has(key) || (p.kind === 'round' && seen.get(key).kind === 'yield')) {
        seen.set(key, { kind: p.kind, line: line.slice(0, 160) });
      }
      break;
    }
  }
  return seen;
}

/** 列舉 [since, now-grace] 之間所有應觸發的窗。 */
function expectedWindows(days, graceHours, now) {
  const out = [];
  const cutoff = new Date(now.getTime() - graceHours * 3600 * 1000);
  const start = new Date(now.getTime() - days * 24 * 3600 * 1000);
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cur <= now) {
    for (const track of TRACKS) {
      for (const hour of SCHEDULE[track]) {
        const when = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), hour, 0, 0);
        if (when < start || when > cutoff) continue;
        out.push({ date: ymd(when), track, hour, when });
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  out.sort((a, b) => a.when - b.when);
  return out;
}

function main() {
  const opt = parseArgs(process.argv);
  if (opt.help) {
    console.log(HELP);
    return;
  }
  const root = path.resolve(__dirname, '..', '..');
  const journal = path.join(root, 'intel', 'loop-journal.md');
  const traces = collectTraces(journal);
  const now = new Date();
  const windows = expectedWindows(opt.days, opt.graceHours, now);

  const rows = windows.map((w) => {
    const key = w.date + '|' + w.track + '|' + String(w.hour);
    const t = traces.get(key);
    return { ...w, when: undefined, traced: !!t, kind: t ? t.kind : null };
  });
  const untraced = rows.filter((r) => !r.traced);

  if (opt.json) {
    console.log(JSON.stringify({
      days: opt.days, graceHours: opt.graceHours,
      expected: rows.length, traced: rows.length - untraced.length,
      untraced,
    }, null, 1));
    return;
  }

  console.log('窗留痕稽核（近 ' + opt.days + ' 天，末 ' + opt.graceHours + ' 小時不判＝可能仍在跑）');
  console.log('  射程：' + TRACKS.map((t) => t + ' ' + SCHEDULE[t].map((h) => h + ':00').join('/')).join('｜'));
  console.log('  應觸發 ' + rows.length + ' 窗｜有留痕 ' + (rows.length - untraced.length) + '｜**無留痕 ' + untraced.length + '**');
  if (untraced.length) {
    const byTrack = {};
    for (const u of untraced) byTrack[u.track] = (byTrack[u.track] || 0) + 1;
    console.log('  無留痕分布：' + Object.keys(byTrack).map((k) => k + ' ' + byTrack[k]).join('｜'));
    for (const u of untraced) console.log('    ✗ ' + u.date + ' ' + u.track + '·' + String(u.hour).padStart(2, '0') + ':00 窗 — 無任何留痕');
    console.log('');
    console.log('  ⚠️ 「無留痕」**不等於**「沒觸發」。本尺只讀 repo，分不出下面三態——處置完全不同：');
    console.log('     (a) 機器/App 沒開 ⇒ 根本沒觸發。正常，順延即可，不必處置。');
    console.log('     (b) 觸發了但 session 掛死（stdin heredoc 之類）⇒ 佔住 task slot、**後續 firing 全部不啟動**。');
    console.log('         需人工 delete + create 重建該排程任務（disable/enable 無效）。');
    console.log('     (c) 觸發了、做了事，然後被**帳號 session 上限**砍死 ⇒ 排程器完全健康、後續 firing 照常。');
    console.log('         **不要重建排程**。要做的是去認領它留下的孤兒（鎖／WIP／沒被標掉的卡）。');
    console.log('     ⇒ 定案請問排程器本身（排程輪自己叫得到，2026-09-16 實測）：');
    console.log('        mcp__scheduled-tasks__list_task_runs { taskId: "apexwin-<track>" }');
    console.log('        status=failed + error 訊息 ⇒ (c)；status 長期 running ⇒ (b)；根本沒有該次 run ⇒ (a)。');
  } else {
    console.log('  ✅ 近 ' + opt.days + ' 天每一個窗都留下了痕跡（做事或說明為何不做事）。');
  }
}

const HELP = [
  'window-trace-audit.js — 依三軌 cron 列舉應觸發的窗，逐窗到 loop-journal.md 找留痕。',
  '',
  '  --days N          回看幾天（預設 7）',
  '  --grace-hours N   末 N 小時不判（預設 2；一輪要跑到收尾才寫 journal）',
  '  --json            機器可讀輸出',
  '',
  '「無留痕」的三種成因與處置：',
  '  (a) 沒觸發（機器/App 沒開）        → 順延，不處置',
  '  (b) 觸發後掛死，佔住 task slot     → 人工 delete + create 重建排程任務',
  '  (c) 觸發後被帳號 session 上限砍死  → **排程器沒事**，去認領孤兒鎖／WIP／未標記的卡',
  '定案靠 mcp__scheduled-tasks__list_task_runs（排程輪自己叫得到）。',
].join('\n');

if (require.main === module) main();
module.exports = { SCHEDULE, TRACKS, TRACE_PATTERNS, collectTraces, expectedWindows };

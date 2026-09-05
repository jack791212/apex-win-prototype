#!/usr/bin/env node
// intel/tools/i18n-leading-label-scan.js
// ─────────────────────────────────────────────────────────────────────────────
// Reproducible measuring stick for the "leading-label concat i18n leak" debt (T49,
// the quantified successor to T48's "⬜ 待續" note). Run from repo root:
//     node intel/tools/i18n-leading-label-scan.js
//
// WHAT IT FINDS: `text: "<中文…>" + <dynamic>` sites whose LEADING string literal
// contains Chinese and is NOT translatable by the current EN pack (tries dict-exact,
// then PREFIX, then SUFFIX — the exact decision order of core/i18n.js tText()).
//
// WHY IT MATTERS: the i18n-key-ratchet files these as NA_CONCAT ("concat never
// translates"), which is only true for EXACT-key nodes. tText() also has a PREFIX
// table — so a leading-label node like "存活率 87%" IS translatable via a
// "存活率 " prefix entry. Uncovered ones leak Chinese to EN/zh-Hans players while
// node stays green and the zh-Hant screen looks perfect. (See DEBT.md T48/T49.)
//
// CLASSIFICATION (the key output):
//  • CLEAN   = the only Chinese is in the leading literal; dynamic parts are
//              number/English. A PREFIX entry translates the whole visible label.
//              (Caveat printed per-site: trailing full-width punctuation 「）。」
//              left after the dynamic value is a cosmetic blemish, not a word.)
//  • NODE-SPLIT = later string literals in the same statement ALSO contain Chinese
//              (mid/trailing Chinese words). A prefix would translate only the head
//              and leave a half-English/half-Chinese node — WORSE than pure Chinese.
//              These need the text node split in the VIEW file (preview-gated,
//              regression risk) — NOT a headless-safe language-pack win.
//  NOTE: dynamic Chinese returned by function calls (e.g. sideLabel()) is invisible
//  to a static scan — a "CLEAN" chat-message site may still carry runtime Chinese.
//  This rule is now ENFORCED (2026-09-04 维护軌): a leak inside an `addChat(`/`addMsg(`
//  call is forced to NODE-SPLIT (chatCtx), because its concat interpolates function
//  results (game name / sideLabel()) that return Chinese a static prefix cannot cover.
//  Before this, liveroom.js:95 & streamer.js:88 mislabelled CLEAN and had to be
//  hand-rejected every round (see DEBT.md T50, 2026-09-02) — the doctrine lived only
//  in this comment, not in the classifier, so the false positives kept coming back.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'prototype', 'src');
const hasCJK = s => /[一-鿿]/.test(s);

function loadPack(file) {
  const code = fs.readFileSync(file, 'utf8');
  const HL = { i18n: { register(_c, obj) { HL.__pack = obj; } } };
  const fn = new Function('HL', 'window', 'globalThis',
    code + '\nreturn (typeof HL!=="undefined"&&HL.__pack)?HL.__pack:null;');
  try { return fn(HL, { HL }, { HL }); } catch (e) { return { __err: e.message }; }
}

const en = loadPack(path.join(SRC, 'i18n', 'en.js'));
if (!en || en.__err) { console.error('EN pack load failed:', en && en.__err); process.exit(2); }
const dict = en.dict || {}, prefix = en.prefix || {}, suffix = en.suffix || {};

function covered(k) {
  if (dict[k] != null) return 'dict-exact';
  for (const p in prefix) if (k.indexOf(p) === 0) return 'prefix:' + p;
  for (const s in suffix) if (k.length > s.length && k.slice(-s.length) === s) return 'suffix:' + s;
  return null;
}

function walk(dir, acc) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walk(fp, acc);
    else if (f.endsWith('.js')) acc.push(fp);
  }
  return acc;
}
const files = ['views', 'core', 'layout'].reduce((a, d) => walk(path.join(SRC, d), a), []);

const re = /text:\s*"((?:[^"\\]|\\.)*)"\s*\+/g;
const leaks = [];
for (const fp of files) {
  const code = fs.readFileSync(fp, 'utf8');
  let m; re.lastIndex = 0;
  while ((m = re.exec(code)) !== null) {
    const lit = m[1];
    if (!hasCJK(lit)) continue;
    const k = lit.trim();
    if (!k || covered(k) || covered(lit)) continue;
    const lineNo = code.slice(0, m.index).split('\n').length;
    const tail = code.slice(m.index + m[0].length, m.index + m[0].length + 240)
      .split('\n').slice(0, 2).join('\n');
    const laterStrings = tail.match(/"((?:[^"\\]|\\.)*)"/g) || [];
    const midChinese = laterStrings.some(s => hasCJK(s));
    // chatCtx: the leak sits inside an addChat(/addMsg( call whose concat interpolates
    // function results (game name / sideLabel()) that return runtime Chinese invisible
    // to this static scan → a prefix would half-translate it. Enforce the header rule.
    const before = code.slice(Math.max(0, m.index - 80), m.index);
    const chatCtx = /add(?:Chat|Msg)\s*\(/.test(before);
    const trailingPunct = /[）。，、；：」』]/.test((tail.match(/"([^"]*)"/) || [, ''])[1]);
    leaks.push({ file: path.relative(SRC, fp).replace(/\\/g, '/'), line: lineNo, lit, midChinese, chatCtx, trailingPunct });
  }
}

const clean = leaks.filter(l => !l.midChinese && !l.chatCtx);
const nodeSplit = leaks.filter(l => l.midChinese || l.chatCtx);
console.log(`EN pack: dict ${Object.keys(dict).length} | PREFIX ${Object.keys(prefix).length} | SUFFIX ${Object.keys(suffix).length}`);
console.log(`UNCOVERED leading-label concat sites: ${leaks.length}  (CLEAN ${clean.length} / NODE-SPLIT ${nodeSplit.length})`);
console.log('\n### CLEAN leading-only (PREFIX-translatable; trailing full-width punct is cosmetic):');
clean.forEach(l => console.log(`  ${l.file}:${l.line}${l.trailingPunct ? ' (trailing-punct)' : ''}  "${l.lit}"`));
console.log('\n### NODE-SPLIT (mid/trailing Chinese word, or chat-runtime CJK — needs view-file node split, preview-gated):');
nodeSplit.forEach(l => console.log(`  ${l.file}:${l.line}${l.chatCtx && !l.midChinese ? ' (chat-runtime-CJK)' : ''}  "${l.lit}"`));

// Regression sentinel. BASELINE tracks the CURRENT uncovered floor so a future
// window notices new leaks immediately. Re-tightened 2026-09-06 (maintain): T50
// covered the 7 CLEAN sites on 09-02, dropping the count 42→35, but the old
// baseline stayed at 42 — it would have silently tolerated re-introducing those
// 7 sites (T51 "rule lives in prose/stale value, never re-entered the ruler").
const BASELINE = 35;
if (leaks.length > BASELINE) {
  console.log(`\n⚠️ uncovered ${leaks.length} > baseline ${BASELINE} — new leak sites appeared.`);
  process.exit(1);
}
if (leaks.length < BASELINE) {
  // Sites were covered but BASELINE was not re-tightened — left as-is it drifts
  // loose again (exactly the gap this edit fixes). Warn so the window re-records.
  console.log(`\nℹ️ uncovered ${leaks.length} < baseline ${BASELINE} — sites were covered; re-tighten BASELINE to ${leaks.length}.`);
}
// A CLEAN (leading-only, PREFIX-translatable) site is headless-landable work: a
// language-pack PREFIX key covers it with zero first-screen bytes and zero view
// changes. Surface it as a non-zero exit so a maintain window picks it up instead
// of it hiding among the preview-gated NODE-SPLIT population.
if (clean.length > 0) {
  console.log(`\n⚠️ ${clean.length} CLEAN leading-label site(s) are PREFIX-translatable — headless-landable, cover them with language-pack keys.`);
  process.exit(1);
}

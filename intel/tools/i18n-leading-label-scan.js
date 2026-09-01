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
//  Treat CLEAN chat/`addChat`/`addMsg` sites as NODE-SPLIT in practice.
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
    const trailingPunct = /[）。，、；：」』]/.test((tail.match(/"([^"]*)"/) || [, ''])[1]);
    leaks.push({ file: path.relative(SRC, fp).replace(/\\/g, '/'), line: lineNo, lit, midChinese, trailingPunct });
  }
}

const clean = leaks.filter(l => !l.midChinese);
const nodeSplit = leaks.filter(l => l.midChinese);
console.log(`EN pack: dict ${Object.keys(dict).length} | PREFIX ${Object.keys(prefix).length} | SUFFIX ${Object.keys(suffix).length}`);
console.log(`UNCOVERED leading-label concat sites: ${leaks.length}  (CLEAN ${clean.length} / NODE-SPLIT ${nodeSplit.length})`);
console.log('\n### CLEAN leading-only (PREFIX-translatable; trailing full-width punct is cosmetic):');
clean.forEach(l => console.log(`  ${l.file}:${l.line}${l.trailingPunct ? ' (trailing-punct)' : ''}  "${l.lit}"`));
console.log('\n### NODE-SPLIT (mid/trailing Chinese word — needs view-file node split, preview-gated):');
nodeSplit.forEach(l => console.log(`  ${l.file}:${l.line}  "${l.lit}"`));

// exit non-zero if the uncovered population GROWS past the recorded baseline,
// so a future window notices regressions. Baseline recorded 2026-09-02.
const BASELINE = 42;
if (leaks.length > BASELINE) {
  console.log(`\n⚠️ uncovered ${leaks.length} > baseline ${BASELINE} — new leak sites appeared.`);
  process.exit(1);
}

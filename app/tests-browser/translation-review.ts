/**
 * Mechanical translation review (Quality area, task 2, the script half).
 *
 * Scans every WordTable row in app/src and runs the mechanical checks.
 * described in task 2 of team-docs/04-build/areas.md: placeholders, mixed scripts, English
 * left in, consistent terms (Wisdom, Communities, Marketplace), Simplified Chinese, and
 * strings more than 2.5 times the English length. Prints a findings summary and the 40 rows
 * most in need of a native speaker, ready to paste into app/tests-browser/README.md.
 *
 * Run: cd app && npx tsx tests-browser/translation-review.ts
 * No server needed. Results are a snapshot of the words at run time.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const APP_SRC = path.resolve(__dirname, '../src');
const LANGS = ['en', 'hi', 'bn', 'ta', 'zh', 'ms'] as const;

// Latin tokens that are legitimately left in a non-Latin translation (proper nouns, brands, codes).
const ALLOWED_LATIN = new Set([
  'wisdom', 'communities', 'marketplace', 'google', 'whatsapp', 'telegram', 'sms',
  'singpass', 'digilocker', 'pdpa', 'dpdp', 'ai', 'sos', 'ok', 'yes', 'no', 'bricks',
  'exponent', 'expo', 'api', 'url', 'http', 'https', 'ids', 'id', 'json', 'pdf',
  'png', 'jpg', 'jpeg', 'svg', 'png', 'mp3', 'mp4', 'aac', 'mms', 'gb', 'mb', 'kb',
  'tts', 'stt', 'ocr', 'ui', 'ux', 'ip', 'tcp', 'udp', 'ssl', 'tls', 'dns', 'cdn',
  'utc', 'gmt', 'ist', 'sgt', 'am', 'pm', 'a', 'i',
]);

// Common Traditional-only characters: if any appears in the zh column, the row is Traditional.
const TRADITIONAL = new Set('國學們來時間這個嗎無為與當開關東車馬鳥魚風飛聽讀寫語說話問題點業產動務戰圖學術應該讓請謝謝會週樣機樹樓漢語話說點樣體圖國學們'.split(''));

interface Row {
  file: string;        // path relative to app/src
  key: string;
  values: string[];    // length 6
  line: number;
}

interface Finding {
  row: Row;
  reasons: string[];
}

// ---------- walk src for words.ts ----------
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name === 'words.ts') out.push(full);
  }
  return out;
}

// ---------- extract balanced bracket content after a key: [ ----------
function extractRows(file: string, src: string): Row[] {
  const rows: Row[] = [];
  // find every "identifier:" followed by "[" (the row key)
  const re = /(^|\n)\s*(\w+)\s*:\s*\[/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const key = m[2];
    const start = m.index + m[0].length - 1; // position of '['
    // walk to matching close bracket
    let depth = 0;
    let i = start;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '[') depth++;
      else if (c === ']') { depth--; if (depth === 0) break; }
      else if (c === "'" || c === '"' || c === '`') {
        // skip a quoted string
        const q = c;
        i++;
        while (i < src.length) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === q) break;
          i++;
        }
      }
    }
    const slice = src.slice(start + 1, i);
    // extract single-quoted strings
    const strs: string[] = [];
    const sr = /'((?:[^'\\]|\\.)*)'/g;
    let sm: RegExpExecArray | null;
    while ((sm = sr.exec(slice)) !== null) strs.push(sm[1].replace(/\\'/g, "'").replace(/\\n/g, '\n'));
    if (strs.length !== 6) continue;
    // line number of the key
    const line = src.slice(0, m.index).split('\n').length + 1;
    rows.push({ file: path.relative(APP_SRC, file), key, values: strs, line });
  }
  return rows;
}

// ---------- checks ----------
function placeholders(s: string): string[] {
  return (s.match(/\{[^}]+\}/g) || []).sort();
}

const ALLOWED_LATIN_RX = new RegExp('\\b(' + [...ALLOWED_LATIN].join('|') + ')\\b', 'gi');

const ALLOWED_UNTRANSLATED = new Set([
  'wisdom', 'telegram', 'whatsapp', 'sms', 'google', 'singpass', 'digilocker',
  'pdpa', 'dpdp', 'ai', 'sos', 'ok', 'yes', 'no', 'bricks', 'singapore', 'india',
  'english', 'hindi', 'bengali', 'tamil', 'chinese', 'malay', 'whatsapp', 'min',
]);

function stripPlaceholders(s: string): string {
  return s.replace(/\{[^}]+\}/g, '');
}

function latinTokens(s: string): string[] {
  const stripped = stripPlaceholders(s);
  const runs = stripped.match(/[A-Za-z]{2,}/g) || [];
  // Capitalised runs are treated as proper nouns (names, brands) and are allowed.
  return runs.filter((t) => t[0] === t[0].toLowerCase()).map((t) => t.toLowerCase());
}

function hasCJK(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s);
}
function isDevanagari(s: string): boolean {
  return /[\u0900-\u097f]/.test(s);
}
function isBengali(s: string): boolean {
  return /[\u0980-\u09ff]/.test(s);
}
function isTamil(s: string): boolean {
  return /[\u0b80-\u0bff]/.test(s);
}
function isLatinScript(lang: string): boolean {
  return lang === 'en' || lang === 'ms';
}

function scriptOk(lang: string, s: string): boolean {
  const stripped = stripPlaceholders(s).trim();
  if (!stripped) return true;
  if (lang === 'en' || lang === 'ms') return true;
  const expected =
    lang === 'hi' ? isDevanagari(stripped) :
    lang === 'bn' ? isBengali(stripped) :
    lang === 'ta' ? isTamil(stripped) :
    hasCJK(stripped);
  if (expected) return true;
  const runs = (stripped.match(/[A-Za-z]{2,}/g) || []).map((t) => t.toLowerCase());
  return runs.length > 0 && runs.every((t) => ALLOWED_LATIN.has(t) || ALLOWED_UNTRANSLATED.has(t));
}

function checkRow(row: Row): string[] {
  const reasons: string[] = [];
  const [en, hi, bn, ta, zh, ms] = row.values;
  const vals = [en, hi, bn, ta, zh, ms];

  // empty
  vals.forEach((v, i) => { if (!v || !v.trim()) reasons.push(`empty ${LANGS[i]}`); });

  // placeholders must match across all six
  const phs = vals.map(placeholders);
  const phKey = phs.map((p) => p.join('|')).join(' || ');
  if (new Set(phs.map((p) => p.join(','))).size > 1) reasons.push(`placeholder mismatch (${phKey})`);

  // mojibake
  vals.forEach((v, i) => { if (v.includes('\ufffd')) reasons.push(`replacement char in ${LANGS[i]}`); });

  // script correctness + english left in
  vals.forEach((v, i) => {
    const lang = LANGS[i];
    if (lang === 'en') return;
    if (!scriptOk(lang, v)) reasons.push(`wrong script in ${lang}`);
  });

  // english left in: non-latin language identical to english, or 3+ latin letters not in allowlist
  [1, 2, 3, 4, 5].forEach((i) => {
    const lang = LANGS[i];
    const v = vals[i];
    const enStripped = stripPlaceholders(en);
    const enTokens = (enStripped.match(/[A-Za-z]{2,}/g) || []).map((t) => t.toLowerCase());
    const enIsTerm = enTokens.length > 0 && enTokens.every((t) => ALLOWED_LATIN.has(t) || ALLOWED_UNTRANSLATED.has(t));
    const enIsProperNoun = /^[A-Z]/.test(en.trim()) && en.trim().split(/\s+/).length <= 3;
    const skipIdentical = enIsTerm || enIsProperNoun;
    if (isLatinScript(lang)) {
      if (v.trim() === en.trim() && en.trim().length > 3 && !skipIdentical) reasons.push(`identical to English in ${lang}`);
      return;
    }
    if (v.trim() === en.trim() && en.trim().length > 3 && !enIsTerm && !ALLOWED_UNTRANSLATED.has(en.trim().toLowerCase())) reasons.push(`identical to English in ${lang}`);
    const toks = latinTokens(v);
    const bad = toks.filter((t) => !ALLOWED_LATIN.has(t));
    if (bad.length) reasons.push(`English left in ${lang}: ${[...new Set(bad)].join(', ')}`);
  });

  // Simplified Chinese: Traditional chars
  for (const ch of zh) {
    if (TRADITIONAL.has(ch)) { reasons.push(`Traditional Chinese char "${ch}" in zh`); break; }
  }

  // length > 2.5x english
  if (en.length >= 4) {
    vals.forEach((v, i) => {
      if (i === 0) return;
      if (v.length > 2.5 * en.length) reasons.push(`${LANGS[i]} ${v.length} chars vs ${en.length} (${(v.length / en.length).toFixed(1)}x)`);
    });
  }

  // consistent terms: English should use the exact product names
  const enLower = en.toLowerCase();
  if (/\bmarket\s?place\b/.test(enLower) && en !== 'Marketplace' && !en.includes('Marketplace')) reasons.push('inconsistent Marketplace spelling in en');
  if (/\bcommunity\b/.test(enLower) && !en.includes('Communities') && !en.includes('community')) {} // too noisy, skip
  if (/\bwisdom\b/.test(enLower) && !en.includes('Wisdom') && !en.includes('wisdom')) {} // skip

  return [...new Set(reasons)];
}

// ---------- main ----------
const files = walk(APP_SRC);
let allRows: Row[] = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  allRows = allRows.concat(extractRows(f, src));
}

const findings: Finding[] = [];
for (const r of allRows) {
  const reasons = checkRow(r);
  if (reasons.length) findings.push({ row: r, reasons });
}

// summary by reason
const reasonCounts = new Map<string, number>();
for (const f of findings) for (const r of f.reasons) reasonCounts.set(r.replace(/:.*$/, ':*'), (reasonCounts.get(r.replace(/:.*$/, ':*')) || 0) + 1);
// bucket reasons more coarsely
function bucket(reason: string): string {
  if (reason.startsWith('empty')) return 'empty cell';
  if (reason.startsWith('placeholder')) return 'placeholder mismatch';
  if (reason.startsWith('replacement')) return 'mojibake (U+FFFD)';
  if (reason.startsWith('wrong script')) return 'wrong script';
  if (reason.startsWith('identical to English')) return 'identical to English';
  if (reason.startsWith('English left in')) return 'English left in translation';
  if (reason.startsWith('Traditional Chinese')) return 'Traditional Chinese (should be Simplified)';
  if (reason.includes('chars vs')) return 'over 2.5x English length';
  if (reason.startsWith('inconsistent')) return 'inconsistent product term';
  return reason;
}
const buckets = new Map<string, number>();
for (const f of findings) for (const r of f.reasons) { const b = bucket(r); buckets.set(b, (buckets.get(b) || 0) + 1); }

console.log(`\n=== Translation review (mechanical) ===`);
console.log(`files scanned: ${files.length}`);
console.log(`WordTable rows: ${allRows.length}`);
console.log(`rows with findings: ${findings.length}\n`);

console.log('Findings by check:');
for (const [b, n] of [...buckets.entries()].sort((a, c) => c[1] - a[1])) console.log(`  ${n.toString().padStart(5)}  ${b}`);

// score rows: number of reasons, plus a bonus for "identical to English" and placeholder mismatch
const scored = findings.map((f) => {
  let score = f.reasons.length;
  if (f.reasons.some((r) => r.startsWith('identical to English'))) score += 2;
  if (f.reasons.some((r) => r.startsWith('placeholder'))) score += 2;
  if (f.reasons.some((r) => r.startsWith('English left in'))) score += 1;
  return { ...f, score };
}).sort((a, b) => b.score - a.score || a.row.file.localeCompare(b.row.file));

const TOP = 40;
console.log(`\n=== Top ${TOP} strings most in need of a native speaker ===\n`);
scored.slice(0, TOP).forEach((f, idx) => {
  const r = f.row;
  console.log(`${idx + 1}. [${r.file}:${r.key}] (score ${f.score})`);
  console.log(`   reasons: ${f.reasons.join('; ')}`);
  LANGS.forEach((l, i) => console.log(`   ${l}: ${JSON.stringify(r.values[i])}`));
  console.log('');
});

// also dump a compact markdown list to a file? stdout is enough; the README can be updated by hand.
console.log(`\n(total findings: ${findings.length} rows; top ${TOP} printed above)`);

// Run: npx tsx src/features/home/when.check.ts  (time in plain words, no screen needed)
import { LANGUAGES } from '../../i18n/languages';
import { dateWords, dayDiff, dayHeading, timeWords, whenWords } from './when';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + detail}`); if (!ok) failed += 1; };
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

const now = local(2026, 11, 17, 10, 15); // a Tuesday morning
check('today is 0, tomorrow 1, yesterday -1', dayDiff(local(2026, 11, 17, 23, 59), now) === 0 && dayDiff(local(2026, 11, 18, 0, 1), now) === 1 && dayDiff(local(2026, 11, 16, 23, 0), now) === -1);
check('across a month and a year', dayDiff(local(2026, 12, 1), now) === 14 && dayDiff(local(2027, 1, 1), local(2026, 12, 31, 23)) === 1);
check('on the hour: no minutes', timeWords(local(2026, 11, 18, 7), 'en').replace(/\s/g, ' ').toLowerCase() === '7 am', timeWords(local(2026, 11, 18, 7), 'en'));
check('half past: with minutes', /9.30/.test(timeWords(local(2026, 11, 18, 9, 30), 'en')), timeWords(local(2026, 11, 18, 9, 30), 'en'));
const en = (d: Date) => whenWords(d.toISOString(), now, 'en').replace(/\s/g, ' ');
check('today', en(local(2026, 11, 17, 19)).startsWith('Today, 7'), en(local(2026, 11, 17, 19)));
check('tomorrow', en(local(2026, 11, 18, 7)).startsWith('Tomorrow, 7'), en(local(2026, 11, 18, 7)));
check('yesterday', en(local(2026, 11, 16, 7)).startsWith('Yesterday, 7'), en(local(2026, 11, 16, 7)));
check('within the week: the weekday', en(local(2026, 11, 20, 7)).startsWith('Friday, 7'), en(local(2026, 11, 20, 7)));
check('next week: a short date', /29/.test(en(local(2026, 11, 29, 7))) && /Nov/.test(en(local(2026, 11, 29, 7))) && !/2026/.test(en(local(2026, 11, 29, 7))), en(local(2026, 11, 29, 7)));
check('next year: with the year', /2027/.test(en(local(2027, 1, 5, 7))), en(local(2027, 1, 5, 7)));
check('a date heading', dateWords(local(2026, 11, 20), now, 'en') === 'Friday, 20 November', dateWords(local(2026, 11, 20), now, 'en'));
check('a day heading', dayHeading(local(2026, 11, 17, 12), now, 'en') === 'Today · Tuesday' && dayHeading(local(2026, 11, 18, 12), now, 'en') === 'Tomorrow · Wednesday', dayHeading(local(2026, 11, 18, 12), now, 'en'));
for (const { code } of LANGUAGES) {
  const all = [local(2026, 11, 17, 19), local(2026, 11, 18, 7), local(2026, 11, 16, 7), local(2026, 11, 20, 7), local(2026, 11, 29, 9, 30)].map((d) => whenWords(d.toISOString(), now, code));
  check(`${code}: every kind of day has words, no blank left`, all.every((s) => s.length > 3 && !s.includes('{') && !s.startsWith('hwhen.')), all.join(' | '));
}
check('Chinese says today in Chinese', whenWords(local(2026, 11, 17, 19).toISOString(), now, 'zh').startsWith('今天'));

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
if (failed) process.exit(1);

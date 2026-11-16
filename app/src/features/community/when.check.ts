// Run from app/:  npx tsx src/features/community/when.check.ts
// Checks the plain-words time helper: today, tomorrow, this week, later dates, the clock, and all six languages.
import { clock, dayHeading, dayWord, whenWords, type Lang } from './when';

let failed = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  if (ok) console.log('PASS ', name);
  else { failed++; console.log('FAIL ', name, got === undefined ? '' : JSON.stringify(got)); }
};

const now = new Date(2026, 10, 17, 10, 0); // Tuesday 17 Nov 2026, 10 am
const at = (days: number, h: number, m = 0) => new Date(2026, 10, 17 + days, h, m);
const LANGS: Lang[] = ['en', 'hi', 'bn', 'ta', 'zh', 'ms'];

check('today', dayWord(at(0, 19), now, 'en') === 'Today');
check('tomorrow', dayWord(at(1, 7), now, 'en') === 'Tomorrow');
check('this week says the weekday', dayWord(at(4, 9), now, 'en') === 'Saturday', dayWord(at(4, 9), now, 'en'));
check('later says a short date', dayWord(at(10, 9), now, 'en') === 'Fri 27 Nov', dayWord(at(10, 9), now, 'en'));
check('next month', dayWord(new Date(2026, 11, 3, 9), now, 'en') === 'Thu 3 Dec', dayWord(new Date(2026, 11, 3, 9), now, 'en'));
check('clock on the hour', clock(at(1, 7), 'en') === '7 am');
check('clock with minutes', clock(at(1, 19, 30), 'en') === '7:30 pm');
check('noon and midnight', clock(at(1, 12), 'en') === '12 pm' && clock(at(1, 0), 'en') === '12 am');
check('in full', whenWords(at(1, 7).toISOString(), 'en', now) === 'Tomorrow, 7 am', whenWords(at(1, 7).toISOString(), 'en', now));
check('a bad date says nothing', whenWords('not a date', 'en', now) === '');
check('heading for tomorrow names the weekday', dayHeading(at(1, 7).toISOString(), 'en', now) === 'Tomorrow · Wednesday', dayHeading(at(1, 7).toISOString(), 'en', now));
check('heading for this week is just the weekday', dayHeading(at(4, 7).toISOString(), 'en', now) === 'Saturday', dayHeading(at(4, 7).toISOString(), 'en', now));
for (const lang of LANGS) {
  const words = [whenWords(at(0, 9).toISOString(), lang, now), whenWords(at(1, 15, 30).toISOString(), lang, now), whenWords(at(3, 8).toISOString(), lang, now), whenWords(at(20, 8).toISOString(), lang, now)];
  check(`${lang}: four different, none empty`, new Set(words).size === 4 && words.every((x) => x.length > 3), words);
  check(`${lang}: no English left in`, lang === 'en' || lang === 'ms' || !/Today|Tomorrow|am|pm|Sat|Nov/.test(words.join(' ')), words);
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
if (failed) process.exit(1);

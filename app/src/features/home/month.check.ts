// Run: npx tsx src/features/home/month.check.ts  (the month on Home, no screen needed)
import { LANGUAGES } from '../../i18n/languages';
import { byDay, dayKey, daysIn, leadingBlanks, monthCells, monthTitle, shiftMonth, weekdayNames, type DayItem } from './month';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + detail}`); if (!ok) failed += 1; };
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString();
const item = (k: string, iso: string, extra: Partial<DayItem> = {}): DayItem => ({ key: k, source: 'community', title: k, at: iso, place: null, going: false, wasThere: false, ...extra });

// months that start on each weekday (Monday first: 0 blanks for a Monday ... 6 for a Sunday)
const starts: [number, number, number][] = [[2026, 5, 0], [2026, 8, 1], [2026, 3, 2], [2026, 9, 3], [2026, 4, 4], [2026, 7, 5], [2026, 2, 6]]; // [year, month0, blanks]
check('a month starting on each weekday gets the right number of blanks', starts.every(([y, m, b]) => leadingBlanks(y, m) === b), starts.map(([y, m]) => leadingBlanks(y, m)).join(','));
check('leap February has 29 days, the others 28', daysIn(2028, 1) === 29 && daysIn(2026, 1) === 28 && daysIn(2100, 1) === 28 && daysIn(2000, 1) === 29);
check('30 and 31 day months', daysIn(2026, 10) === 30 && daysIn(2026, 11) === 31);
check('the month before January is last December', JSON.stringify(shiftMonth(2026, 0, -1)) === JSON.stringify({ year: 2025, month0: 11 }) && JSON.stringify(shiftMonth(2026, 11, 1)) === JSON.stringify({ year: 2027, month0: 0 }));

const now = new Date(2026, 10, 17, 10); // Tuesday 17 November 2026
const days = byDay([
  item('community:a', at(2026, 11, 20), { going: true }), // coming up: a flag
  item('market:b', at(2026, 11, 12), { wasThere: true }), // past, showed up: a trophy
  item('market:c', at(2026, 11, 10)), // past, never went: nothing
  item('community:d', at(2026, 11, 17, 8), { wasThere: true }), // today, already there: a trophy
  item('community:d', at(2026, 11, 17, 8), { going: true, open: { key: 'community.event', params: { id: 'x', eid: 'd' } } }), // the same event again, from the upcoming list
  item('reminder:e', at(2026, 11, 17, 18)), // later today: a flag too
]);
const cells = monthCells(2026, 10, now, days);
const cell = (d: number) => cells[d - 1];
check('November has 30 cells, numbered 1 to 30', cells.length === 30 && cells[0].day === 1 && cells[29].day === 30);
check('today is marked', cell(17).today && cells.filter((c) => c.today).length === 1);
check('a coming day with an event has a flag and no trophy', cell(20).flag && !cell(20).trophy);
check('a past day the person showed up has a trophy and no flag', cell(12).trophy && !cell(12).flag);
check('a past day they did not go has neither', !cell(10).trophy && !cell(10).flag);
check('today can carry both: there already, more later', cell(17).trophy && cell(17).flag);
check('a plain day is plain', !cell(5).flag && !cell(5).trophy && !cell(25).flag);
const today = days.get(dayKey(new Date(2026, 10, 17))) ?? [];
check('the same event from two places is counted once', today.length === 2, today.map((x) => x.key).join(','));
const d = today.find((x) => x.key === 'community:d');
check('what is known about it is combined', !!d && d.wasThere && d.going && d.open?.key === 'community.event');
check('a day lists its events in time order', today[0].key === 'community:d' && today[1].key === 'reminder:e');
check('a month from another year carries no marks', monthCells(2025, 10, now, days).every((c) => !c.flag && !c.trophy));

check('the month title in English', monthTitle(2026, 10, 'en') === 'November 2026', monthTitle(2026, 10, 'en'));
check('Monday comes first', weekdayNames('en')[0].startsWith('Mon') && weekdayNames('en')[6].startsWith('Sun'), weekdayNames('en').join(','));
for (const { code } of LANGUAGES) {
  const names = weekdayNames(code);
  check(`${code}: a month title and seven different weekday names`, monthTitle(2026, 10, code).length > 3 && names.length === 7 && new Set(names).size === 7, `${monthTitle(2026, 10, code)} ${names.join(',')}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
if (failed) process.exit(1);

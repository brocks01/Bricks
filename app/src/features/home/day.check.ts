// Throwaway check of day.ts. Run: npx tsx src/features/home/day.check.ts
import type { Occurrence } from '../../api/calendar';
import { dayRows, freeBefore, minutesUntil, nextUp, popupsDue } from './day';

const today = new Date(2026, 10, 15, 0, 0, 0);
const at = (h: number, m = 0) => new Date(2026, 10, 15, h, m, 0).toISOString();
const occ = (title: string, h: number, m: number, dur: number | null, status: Occurrence['status'] = 'pending', item = title): Occurrence => ({
  item_id: item, occurs_at: at(h, m), kind: 'appointment', title, note: null, duration_min: dur, status, added_by_name: '', channel: 'app', can_edit: true, remind_before_min: 0,
});
let bad = 0;
const check = (name: string, ok: unknown, got?: unknown) => { if (!ok) { bad++; console.log('FAIL', name, got ?? ''); } else console.log('ok  ', name); };

const now = new Date(2026, 10, 15, 9, 0, 0);
const list = [occ('Medicine', 8, 0, 5, 'done'), occ('Tai chi', 10, 0, 60), occ('Call grandson', 14, 30, 30), occ('Tea', 16, 0, null), occ('Old', 7, 0, 5, 'skipped')];

const rows = dayRows(list, now);
const text = rows.map((r) => (r.kind === 'free' ? `free ${r.start.getHours()}:${String(r.start.getMinutes()).padStart(2, '0')}-${r.end.getHours()}:${String(r.end.getMinutes()).padStart(2, '0')} (${r.minutes})` : `${r.occ.title}${r.past ? '*' : ''}`));
console.log(text.join(' | '));
check('skipped things are not on the day', !text.some((t) => t.startsWith('Old')));
check('past item is marked, first free window starts now', text[0] === 'Medicine*' && text[1] === 'free 9:00-10:00 (60)', text);
check('a free window sits between tai chi and the call', text.includes('free 11:00-14:30 (210)'), text);
check('an item without a length holds 15 minutes', text.includes('free 16:15-21:00 (285)'), text);

const n = nextUp(list, now);
check('next up is tai chi', n?.title === 'Tai chi', n?.title);
check('60 minutes until it', n && minutesUntil(n, now) === 60);
check('60 free minutes before it', n && freeBefore(list, n, now) === 60, n && freeBefore(list, n, now));
const n2 = nextUp(list, new Date(2026, 10, 15, 11, 30));
check('after tai chi the call is next', n2?.title === 'Call grandson', n2?.title);
check('free before the call counts from the end of tai chi', n2 && freeBefore(list, n2, new Date(2026, 10, 15, 11, 30)) === 180, n2 && freeBefore(list, n2, new Date(2026, 10, 15, 11, 30)));
check('nothing left late at night', nextUp(list, new Date(2026, 10, 15, 22, 0)) === null);
check('a thing 5 minutes past is still next (grace)', nextUp([occ('X', 9, 0, null)], new Date(2026, 10, 15, 9, 5))?.title === 'X');

// pop-ups: 2 hours, 1 hour, 15 minutes, now
const shown = new Set<string>();
const one = [occ('Doctor', 12, 0, 30)];
check('nothing 3 hours before', popupsDue(one, new Date(2026, 10, 15, 9, 0), shown).length === 0);
let p = popupsDue(one, new Date(2026, 10, 15, 10, 30), shown);
check('first pop-up in the two-hour band', p.length === 1 && p[0].step === 120, p);
p.forEach((x) => shown.add(x.key));
check('not shown twice', popupsDue(one, new Date(2026, 10, 15, 10, 45), shown).length === 0);
p = popupsDue(one, new Date(2026, 10, 15, 11, 10), shown);
check('one-hour band', p.length === 1 && p[0].step === 60, p);
p.forEach((x) => shown.add(x.key));
p = popupsDue(one, new Date(2026, 10, 15, 11, 50), shown);
check('fifteen-minute band', p.length === 1 && p[0].step === 15, p);
p.forEach((x) => shown.add(x.key));
p = popupsDue(one, new Date(2026, 10, 15, 12, 0), shown);
check('now', p.length === 1 && p[0].step === 0, p);
check('done things never pop up', popupsDue([occ('Doctor', 12, 0, 30, 'done')], new Date(2026, 10, 15, 11, 50), new Set()).length === 0);
check('long past things never pop up', popupsDue(one, new Date(2026, 10, 15, 13, 0), new Set()).length === 0);
void today;
console.log(bad ? `${bad} FAILED` : 'all pass');
process.exit(bad ? 1 : 0);

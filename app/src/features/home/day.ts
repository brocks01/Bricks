// The logic of "my day", with no screen and no network, so it can be tested on its own (see navigation/selftest.ts):
//  - the day as rows: what is booked, and the free windows between;
//  - the next thing to act on, and how much time there is before it;
//  - which reminder pop-ups are due (two hours before, one hour, fifteen minutes, now).
import type { Occurrence } from '../../api/calendar';

export const DAY_START_HOUR = 7; // the day a person is awake: free windows are only shown inside it
export const DAY_END_HOUR = 21;
export const MIN_FREE_MIN = 30; // a gap shorter than this is not "free time"
export const POPUP_STEPS = [120, 60, 15, 0]; // minutes before, largest first
const MIN = 60_000;

export type DayRow =
  | { kind: 'item'; occ: Occurrence; start: Date; end: Date | null; past: boolean }
  | { kind: 'free'; start: Date; end: Date; minutes: number };

const startOf = (o: Occurrence) => new Date(o.occurs_at);
const endOf = (o: Occurrence): Date | null => (o.duration_min ? new Date(startOf(o).getTime() + o.duration_min * MIN) : null);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const atHour = (day: Date, h: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0, 0);
export const key = (o: Occurrence): string => `${o.item_id ?? o.activity_id ?? o.title}|${o.occurs_at}`;

/** Today's things in time order, with the free windows between them (only the part of the day that is still ahead). */
export function dayRows(occs: readonly Occurrence[], now: Date): DayRow[] {
  const today = occs.filter((o) => sameDay(startOf(o), now) && o.status !== 'skipped').sort((a, b) => startOf(a).getTime() - startOf(b).getTime());
  const rows: DayRow[] = [];
  const dayEnd = atHour(now, DAY_END_HOUR);
  let cursor = new Date(Math.max(now.getTime(), atHour(now, DAY_START_HOUR).getTime()));
  const gap = (to: Date) => {
    const minutes = Math.floor((to.getTime() - cursor.getTime()) / MIN);
    if (minutes >= MIN_FREE_MIN) rows.push({ kind: 'free', start: new Date(cursor), end: new Date(to), minutes });
  };
  for (const o of today) {
    const start = startOf(o);
    const end = endOf(o);
    const past = (end ?? start).getTime() < now.getTime();
    if (!past && start.getTime() > cursor.getTime()) gap(start);
    rows.push({ kind: 'item', occ: o, start, end, past });
    if (!past) cursor = new Date(Math.max(cursor.getTime(), (end ?? new Date(start.getTime() + 15 * MIN)).getTime())); // an item with no length holds a quarter of an hour
  }
  if (dayEnd.getTime() > cursor.getTime()) gap(dayEnd);
  return rows;
}

/** The next thing that still needs the person: not done, not skipped, and not already long past (ten minutes of grace). */
export function nextUp(occs: readonly Occurrence[], now: Date): Occurrence | null {
  const open = occs.filter((o) => o.status === 'pending' && ((endOf(o) ?? startOf(o)).getTime() >= now.getTime() - 10 * MIN));
  open.sort((a, b) => startOf(a).getTime() - startOf(b).getTime());
  return open[0] ?? null;
}

/** Minutes from now until it starts (negative once it has begun). */
export const minutesUntil = (o: Occurrence, now: Date): number => Math.ceil((startOf(o).getTime() - now.getTime()) / MIN);

/** Free minutes just before `next` (since now, or since the previous thing ended): "you have this window". 0 when it is already on. */
export function freeBefore(occs: readonly Occurrence[], next: Occurrence, now: Date): number {
  let from = now.getTime();
  for (const o of occs) {
    if (o === next || o.status === 'skipped' || startOf(o).getTime() >= startOf(next).getTime()) continue;
    const e = (endOf(o) ?? new Date(startOf(o).getTime() + 15 * MIN)).getTime();
    if (e > from) from = e;
  }
  return Math.max(0, Math.floor((startOf(next).getTime() - from) / MIN));
}

export interface Popup { key: string; occ: Occurrence; step: number; minutes: number }

/** The reminders due right now: one per thing, for the band it is in (two hours, one hour, fifteen minutes, now), never one already shown. */
export function popupsDue(occs: readonly Occurrence[], now: Date, shown: ReadonlySet<string>): Popup[] {
  const out: Popup[] = [];
  for (const o of occs) {
    if (o.status !== 'pending') continue;
    const minutes = minutesUntil(o, now);
    if (minutes > POPUP_STEPS[0] || minutes < -5) continue; // too far ahead, or already well begun
    const lower = [...POPUP_STEPS].reverse().find((s) => s >= Math.max(minutes, 0)); // the smallest step that is not below the time left
    if (lower === undefined) continue;
    const k = `${key(o)}|${lower}`;
    if (!shown.has(k)) out.push({ key: k, occ: o, step: lower, minutes });
  }
  return out.sort((a, b) => a.minutes - b.minutes);
}

// The month on Home, as plain data: the cells of one month (Monday first), which days carry a flag (something coming up) and which a trophy
// (the person showed up), and the events of one day with no event counted twice. Pure: no React, no network; month.check.ts tests it.
import type { EventSource } from '../../api/home';
import type { LangCode } from '../../i18n/languages';
import { LOCALE } from './when';

/** One thing on a day, from wherever it came: an upcoming event, a leaf (an event the person showed up to), or their own calendar. */
export interface DayItem {
  key: string; // the same event from two places has the same key: `${source}:${id}`
  source: EventSource | 'reminder';
  title: string;
  at: string; // ISO
  place: string | null;
  going: boolean;
  wasThere: boolean;
  open?: { key: string; params: Record<string, string> };
}

export interface Cell {
  day: number; // 1 to 31
  key: string; // YYYY-MM-DD, in the device's own time
  today: boolean;
  past: boolean;
  flag: boolean; // from today onward, with something coming up
  trophy: boolean; // up to today, a day the person showed up
}

const pad = (n: number) => String(n).padStart(2, '0');
/** The local date of an instant as YYYY-MM-DD. */
export const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** How many empty places come before day 1 when the week starts on Monday. */
export const leadingBlanks = (year: number, month0: number): number => (new Date(year, month0, 1).getDay() + 6) % 7;
export const daysIn = (year: number, month0: number): number => new Date(year, month0 + 1, 0).getDate();

/** Merge items from several places into one list per day: the same event (same key) is kept once, and what is known about it is combined. */
export function byDay(items: DayItem[]): Map<string, DayItem[]> {
  const one = new Map<string, DayItem>();
  for (const it of items) {
    const had = one.get(it.key);
    one.set(it.key, had ? { ...had, ...it, going: had.going || it.going, wasThere: had.wasThere || it.wasThere, open: had.open ?? it.open, place: had.place ?? it.place } : it);
  }
  const out = new Map<string, DayItem[]>();
  for (const it of one.values()) {
    const k = dayKey(new Date(it.at));
    out.set(k, [...(out.get(k) ?? []), it]);
  }
  for (const l of out.values()) l.sort((a, b) => a.at.localeCompare(b.at) || a.title.localeCompare(b.title));
  return out;
}

/** The cells of a month. A flag on a day from today onward that has something coming up; a trophy on a day up to today on which the person showed up. */
export function monthCells(year: number, month0: number, now: Date, days: Map<string, DayItem[]>): Cell[] {
  const today = dayKey(now);
  return Array.from({ length: daysIn(year, month0) }, (_, i) => {
    const key = dayKey(new Date(year, month0, i + 1));
    const items = days.get(key) ?? [];
    const past = key < today;
    return { day: i + 1, key, today: key === today, past, flag: !past && items.length > 0, trophy: key <= today && items.some((x) => x.wasThere) };
  });
}

/** "November 2026" in the person's language. */
export const monthTitle = (year: number, month0: number, lang: LangCode): string =>
  new Date(year, month0, 1).toLocaleDateString(LOCALE[lang], { month: 'long', year: 'numeric' });

/** The seven weekday names, Monday first, short ("Mon"), in the person's language. 1 January 2024 was a Monday. */
export const weekdayNames = (lang: LangCode, long = false): string[] =>
  Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(LOCALE[lang], { weekday: long ? 'long' : 'short' }));

/** The month before or after: (2026, 0) - 1 is (2025, 11). */
export function shiftMonth(year: number, month0: number, by: number): { year: number; month0: number } {
  const d = new Date(year, month0 + by, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

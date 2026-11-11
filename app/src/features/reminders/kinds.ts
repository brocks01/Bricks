import type { ReminderKind } from '@/api/types';
import {
  BellIcon,
  CalendarBlankIcon,
  PillIcon,
  StethoscopeIcon,
  type Icon,
} from '@/components/primitives/icons';

export const REMINDER_KINDS: readonly ReminderKind[] = ['medicine', 'doctor', 'event', 'other'];

export const REMINDER_ICON: Record<ReminderKind, Icon> = {
  medicine: PillIcon,
  doctor: StethoscopeIcon,
  event: CalendarBlankIcon,
  other: BellIcon,
};

/** "08:00" (from the API) → a Date today at that time, for formatting. */
export function timeToday(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

/** Minutes after midnight → "HH:MM" for the API. */
export function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** For a one-off reminder: the date it's for (YYYY-MM-DD), moved to tomorrow if the time has passed. */
export function reminderDate(minutes: number, dayOffset: 0 | 1 = 0, now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  if (dayOffset === 0 && now.getHours() * 60 + now.getMinutes() >= minutes) {
    d.setDate(d.getDate() + 1);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A time of day (minutes after midnight) as a Date, for formatting. */
export const atMinutes = (minutes: number) =>
  new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);

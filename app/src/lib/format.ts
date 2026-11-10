import type { TFunction } from 'i18next';

import { LANGUAGE_INFO, type Language } from '@/i18n/languages';

/**
 * Dates and times written the way people say them (docs/02 §8–9):
 * "Tomorrow, 7 am", "Saturday, 10:30 am", "14 Nov, 6 pm". Never "07:00" or ISO.
 * All in the phone's local time zone.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole calendar days from `now` to `date` (0 = today, 1 = tomorrow, -1 = yesterday). */
export function calendarDaysBetween(now: Date, date: Date): number {
  return Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
}

/** "7 am", or "7:30 am" when there are minutes. */
export function formatTime(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(LANGUAGE_INFO[language].intlLocale, {
    hour: 'numeric',
    ...(date.getMinutes() !== 0 && { minute: '2-digit' }),
  }).format(date);
}

/** "Today", "Tomorrow", a weekday this week, otherwise "14 Nov". */
export function formatDay(date: Date, language: Language, t: TFunction, now = new Date()): string {
  const locale = LANGUAGE_INFO[language].intlLocale;
  const days = calendarDaysBetween(now, date);
  if (days === 0) return t('time.today');
  if (days === 1) return t('time.tomorrow');
  if (days > 1 && days < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  }
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
}

/** "Tomorrow, 7 am". */
export function formatWhen(date: Date, language: Language, t: TFunction, now = new Date()): string {
  return t('time.dayAndTime', {
    day: formatDay(date, language, t, now),
    time: formatTime(date, language),
  });
}

/** Voice note length: "0:12", "1:05". */
export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.round(totalSeconds) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Monday-first short weekday names in the member's language, for weekly charts. */
export function weekdayLabels(language: Language): string[] {
  const format = new Intl.DateTimeFormat(LANGUAGE_INFO[language].intlLocale, { weekday: 'short' });
  // 2026-11-09 is a Monday.
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(2026, 10, 9 + i)));
}

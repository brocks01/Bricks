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

/** "850 m" under 1 km, otherwise "2.4 km" (one decimal), in the member's number style. */
export function formatDistance(metres: number, language: Language): string {
  const locale = LANGUAGE_INFO[language].intlLocale;
  if (metres < 1000) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(metres / 10) * 10)} m`;
  }
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(metres / 1000)} km`;
}

/** Whole numbers with separators: "3,210". */
export function formatCount(value: number, language: Language): string {
  return new Intl.NumberFormat(LANGUAGE_INFO[language].intlLocale, {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** A running clock: "4:05", "24:10", "1:02:30". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = h > 0 ? m.toString().padStart(2, '0') : m.toString();
  return `${h > 0 ? `${h}:` : ''}${mm}:${s.toString().padStart(2, '0')}`;
}

/** "32 min", "1 h 5 min": durations in words, rounded to the minute. */
export function formatMinutes(totalSeconds: number, t: TFunction): string {
  const minutes = Math.max(0, Math.round(totalSeconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t('units.minutes', { count: m });
  if (m === 0) return t('units.hours', { count: h });
  return t('units.hoursMinutes', { hours: h, minutes: m });
}

/**
 * For read-outs: "32 minutes", "1 hour and 5 minutes". Speech engines read "min" and "h"
 * oddly (or letter by letter), so anything spoken uses whole words.
 */
export function sayMinutes(totalSeconds: number, t: TFunction): string {
  const minutes = Math.max(0, Math.round(totalSeconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t('units.spoken.minutes', { count: m });
  const hours = t('units.spoken.hours', { count: h });
  if (m === 0) return hours;
  return t('units.spoken.hoursMinutes', {
    hours,
    minutes: t('units.spoken.minutes', { count: m }),
  });
}

/** For read-outs: "850 metres", "2.4 kilometres", "2 kilometres" (never "km", read letter by letter). */
export function sayDistance(metres: number, language: Language, t: TFunction): string {
  const locale = LANGUAGE_INFO[language].intlLocale;
  if (metres < 1000) {
    const value = Math.round(metres / 10) * 10;
    return t('units.spoken.metres', {
      count: value,
      value: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value),
    });
  }
  const km = Math.round(metres / 100) / 10;
  return t('units.spoken.km', {
    count: km,
    // "2 kilometres", not "2.0 kilometres".
    value: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(km),
  });
}

/** Phone numbers for read-outs, digit by digit: "995" → "9 9 5" (not "nine hundred…"). */
export function sayDigits(number: string): string {
  return number.replace(/\s+/g, '').split('').join(' ');
}

/** Average pace in words: "13 min 20 s per km". */
export function formatPace(secondsPerKm: number, t: TFunction): string {
  const safe = Math.max(0, Math.round(secondsPerKm));
  return t('units.pace', { minutes: Math.floor(safe / 60), seconds: safe % 60 });
}

import i18n from '@/i18n';

import {
  calendarDaysBetween,
  formatDay,
  formatDuration,
  formatTime,
  formatWhen,
  weekdayLabels,
} from './format';

// Wednesday 11 Nov 2026, 9:15 am local time.
const NOW = new Date(2026, 10, 11, 9, 15);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const en = i18n.cloneInstance({ lng: 'en' }).t;
const ta = i18n.cloneInstance({ lng: 'ta' }).t;

describe('formatTime', () => {
  it('drops ":00" so it reads the way people say it', () => {
    expect(formatTime(at(12, 7), 'en')).toBe('7 am');
    expect(formatTime(at(12, 18), 'en')).toBe('6 pm');
  });

  it('keeps minutes when there are some', () => {
    expect(formatTime(at(12, 10, 30), 'en')).toBe('10:30 am');
  });

  it('uses each language’s own wording', () => {
    expect(formatTime(at(12, 7), 'zh')).toContain('7');
    expect(formatTime(at(12, 19), 'ms')).toMatch(/7/);
  });
});

describe('formatDay', () => {
  it.each([
    [at(11, 18), 'Today'],
    [at(12, 7), 'Tomorrow'],
    [at(14, 10), 'Saturday'],
    [at(17, 10), 'Tuesday'],
    [at(18, 10), '18 Nov'],
  ])('%s → %s', (date, expected) => {
    expect(formatDay(date, 'en', en, NOW)).toBe(expected);
  });

  it('translates today and tomorrow', () => {
    expect(formatDay(at(12, 7), 'ta', ta, NOW)).toBe('நாளை');
  });
});

describe('formatWhen', () => {
  it('reads "Tomorrow, 7 am"', () => {
    expect(formatWhen(at(12, 7), 'en', en, NOW)).toBe('Tomorrow, 7 am');
  });

  it('counts calendar days, not 24-hour periods', () => {
    expect(calendarDaysBetween(at(11, 23, 59), at(12, 0, 1))).toBe(1);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [4, '0:04'],
    [12.4, '0:12'],
    [65, '1:05'],
    [Number.NaN, '0:00'],
    [-3, '0:00'],
  ])('%s s → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('weekdayLabels', () => {
  it('starts on Monday and has seven days', () => {
    const labels = weekdayLabels('en');
    expect(labels).toHaveLength(7);
    expect(labels[0]).toBe('Mon');
    expect(labels[6]).toBe('Sun');
  });
});

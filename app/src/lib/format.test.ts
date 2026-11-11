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

describe('walk formats', () => {
  const { formatDistance, formatCount, formatClock, formatMinutes, formatPace } =
    jest.requireActual<typeof import('./format')>('./format');

  it.each([
    [0, '0 m'],
    [854, '850 m'],
    [2412, '2.4 km'],
    [10_050, '10.1 km'],
  ])('distance %s m → %s', (m, expected) => {
    expect(formatDistance(m, 'en')).toBe(expected);
  });

  it('counts with separators', () => {
    expect(formatCount(3210.4, 'en')).toBe('3,210');
  });

  it.each([
    [0, '0:00'],
    [245, '4:05'],
    [1450, '24:10'],
    [3750, '1:02:30'],
  ])('clock %s s → %s', (s, expected) => {
    expect(formatClock(s)).toBe(expected);
  });

  it('durations and pace in words', () => {
    expect(formatMinutes(32 * 60 + 10, en)).toBe('32 min');
    expect(formatMinutes(65 * 60, en)).toBe('1 h 5 min');
    expect(formatMinutes(120 * 60, en)).toBe('2 h');
    expect(formatPace(800, en)).toBe('13 min 20 s per km');
  });

  // Read-outs never contain "km", "m", "min" or "h": speech engines read them letter by letter.
  it('read-outs say units in whole words', () => {
    const { sayDigits, sayDistance, sayMinutes } =
      jest.requireActual<typeof import('./format')>('./format');
    expect(sayMinutes(32 * 60, en)).toBe('32 minutes');
    expect(sayMinutes(60, en)).toBe('1 minute');
    expect(sayMinutes(65 * 60, en)).toBe('1 hour and 5 minutes');
    expect(sayMinutes(120 * 60, en)).toBe('2 hours');
    expect(sayDistance(854, 'en', en)).toBe('850 metres');
    expect(sayDistance(2412, 'en', en)).toBe('2.4 kilometres');
    expect(sayDistance(1000, 'en', en)).toBe('1 kilometre');
    expect(sayDistance(2412, 'ta', ta)).toBe('2.4 கிலோமீட்டர்');
    expect(sayMinutes(32 * 60, ta)).toBe('32 நிமிடங்கள்');
    expect(sayDigits('995')).toBe('9 9 5');
  });
});

import { dayPart } from './greeting';

const at = (hour: number, minute = 0) => new Date(2026, 10, 11, hour, minute);

describe('dayPart', () => {
  it.each([
    [at(0), 'morning'],
    [at(7), 'morning'],
    [at(11, 59), 'morning'],
    [at(12), 'afternoon'],
    [at(16, 59), 'afternoon'],
    [at(17), 'evening'],
    [at(23, 59), 'evening'],
  ])('%s → %s', (date, expected) => {
    expect(dayPart(date)).toBe(expected);
  });
});

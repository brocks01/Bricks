export type DayPart = 'morning' | 'afternoon' | 'evening';

/** Morning until noon, afternoon until 5 pm, evening after. Local device time. */
export function dayPart(date: Date = new Date()): DayPart {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

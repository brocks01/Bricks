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

import type { TFunction } from 'i18next';

import type { EventSummary } from '@/api/types';
import type { Language } from '@/i18n/languages';
import { formatWhen } from '@/lib/format';

/** "Morning walk, Tomorrow, 7 am, Bishan Park, Gate 2": an event as one spoken phrase. */
export function speakEvent(event: EventSummary, language: Language, t: TFunction): string {
  return `${event.title}, ${formatWhen(new Date(event.start_at), language, t)}, ${event.place_name}`;
}

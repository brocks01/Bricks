import { useTranslation } from 'react-i18next';

import { useMe, useToday } from '@/api';
import { dayPart } from '@/features/home/greeting';
import { timeToday } from '@/features/reminders/kinds';
import type { ReadOutContent } from '@/features/readout/script';
import { formatTime, formatWhen } from '@/lib/format';
import { useTypography } from '@/theme/TypographyProvider';

/** "Good morning, Raj" (or without a name until it's loaded). */
export function useGreeting(): string {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const part = dayPart();
  const name = me?.preferred_name ?? me?.name;
  return name ? t(`home.greeting.${part}`, { name }) : t(`home.greetingNoName.${part}`);
}

/**
 * Home's read-out (S12, and Today in Simple Mode): where you are → what's on today
 * → what you can do. The "Today" part is highlighted while it's read.
 */
export function useHomeReadout(): () => ReadOutContent {
  const { t } = useTranslation();
  const { language } = useTypography();
  const today = useToday();
  const greeting = useGreeting();

  return () => {
    const d = today.data;
    let todayText = '';
    if (d?.checkin.pending) todayText += t('home.readoutCheckin');
    if (d?.next_event) {
      todayText += t('home.readoutEvent', {
        title: d.next_event.title,
        when: formatWhen(new Date(d.next_event.start_at), language, t),
      });
    }
    if (d?.next_reminder) {
      todayText += t('home.readoutReminder', {
        time: formatTime(timeToday(d.next_reminder.time), language),
        text: d.next_reminder.text,
      });
    }
    const full = t('home.readout', { greeting, today: todayText });
    const at = todayText ? full.indexOf(todayText) : -1;
    if (at < 0) return full;
    return [
      { text: full.slice(0, at) },
      { text: todayText, target: 'today' },
      { text: full.slice(at + todayText.length) },
    ];
  };
}

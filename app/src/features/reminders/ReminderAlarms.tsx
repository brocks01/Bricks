import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';

import { useCompleteReminder, useReminders } from '@/api';
import {
  ACTION_DONE,
  ACTION_SNOOZE,
  setupNotifications,
  snoozeReminder,
  syncReminderAlarms,
} from '@/lib/notifications';

/**
 * Keeps the phone's reminder alerts in step with the reminders list, and acts on
 * the alert buttons: Done marks it done, Snooze rings again in 10 minutes, and
 * tapping the alert itself opens Reminders. Renders nothing.
 */
export function ReminderAlarms() {
  const router = useRouter();
  const reminders = useReminders();
  const complete = useCompleteReminder();

  useEffect(() => {
    void setupNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    if (reminders.data) void syncReminderAlarms(reminders.data).catch(() => {});
  }, [reminders.data]);

  const onResponse = useEffectEvent((response: Notifications.NotificationResponse) => {
    const content = response.notification.request.content;
    const reminderId = (content.data as { reminderId?: string } | null)?.reminderId;
    if (!reminderId) return;
    if (response.actionIdentifier === ACTION_DONE) {
      complete.mutate(reminderId);
    } else if (response.actionIdentifier === ACTION_SNOOZE) {
      const text = reminders.data?.find((r) => r.id === reminderId)?.text ?? content.body ?? '';
      void snoozeReminder({ id: reminderId, text }).catch(() => {});
    } else {
      router.push('/thrive/reminders');
    }
  });

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => onResponse(r));
    return () => sub.remove();
  }, []);

  return null;
}

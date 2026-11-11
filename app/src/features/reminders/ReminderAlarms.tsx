import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useEffectEvent, useRef } from 'react';

import { useAnswerCheckin, useCompleteReminder, useReminders, useUpdateMe } from '@/api';
import { config } from '@/lib/config';
import {
  ACTION_DONE,
  ACTION_NO,
  ACTION_SNOOZE,
  ACTION_YES,
  expoPushToken,
  setupNotifications,
  snoozeReminder,
  syncMorningCheckin,
  syncReminderAlarms,
} from '@/lib/notifications';
import { platform } from '@/lib/platform';
import { useOnboarding } from '@/state/onboarding';

/** The EAS project id, needed for push tokens (set by `eas init`). */
const projectId =
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
  null;

/**
 * Everything notifications, app-wide. Renders nothing.
 * - Keeps the phone's reminder alerts in step with the reminders list.
 * - Schedules the 8 am check-in on the phone where the server can't push (Expo Go on iPhone,
 *   or mock data), and registers for server push in our Android build.
 * - Acts on the buttons: Done / Snooze for reminders, Yes / No for the check-in.
 *   Tapping a notification opens its screen and reads it out (S38).
 */
export function ReminderAlarms() {
  const router = useRouter();
  const onboarded = useOnboarding((s) => s.completed);
  const reminders = useReminders();
  const complete = useCompleteReminder();
  const answer = useAnswerCheckin();
  const updateMe = useUpdateMe();
  const sentToken = useRef<string | null>(null);
  const serverPushes = platform.canUseRemotePush && !config.demoVoice;

  useEffect(() => {
    void setupNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    if (reminders.data) void syncReminderAlarms(reminders.data).catch(() => {});
  }, [reminders.data]);

  useEffect(() => {
    void syncMorningCheckin(onboarded && !serverPushes).catch(() => {});
  }, [onboarded, serverPushes]);

  const sendToken = useEffectEvent(async () => {
    const token = await expoPushToken(projectId);
    if (!token || token === sentToken.current) return;
    sentToken.current = token;
    updateMe.mutate({ push_token: token });
  });
  useEffect(() => {
    if (!onboarded || !serverPushes) return;
    if (!projectId && __DEV__) console.warn('[push] no EAS project id yet: run `eas init`');
    void sendToken().catch((error: unknown) => {
      if (__DEV__) console.warn('[push] could not register', error);
    });
  }, [onboarded, serverPushes]);

  const onResponse = useEffectEvent((response: Notifications.NotificationResponse) => {
    const content = response.notification.request.content;
    const data = (content.data ?? {}) as { reminderId?: string; kind?: string };
    const action = response.actionIdentifier;

    if (data.kind === 'checkin') {
      if (action === ACTION_YES) return void answer.mutate('yes');
      if (action === ACTION_NO) answer.mutate('no');
      router.push({ pathname: '/thrive/checkin', params: { read: '1' } });
      return;
    }

    const reminderId = data.reminderId;
    if (!reminderId) return;
    if (action === ACTION_DONE) {
      complete.mutate(reminderId);
    } else if (action === ACTION_SNOOZE) {
      const text = reminders.data?.find((r) => r.id === reminderId)?.text ?? content.body ?? '';
      void snoozeReminder({ id: reminderId, text }).catch(() => {});
    } else {
      router.push({ pathname: '/thrive/reminders', params: { read: '1' } });
    }
  });

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => onResponse(r));
    return () => sub.remove();
  }, []);

  return null;
}

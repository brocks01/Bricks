import * as Notifications from 'expo-notifications';

import type { Reminder } from '@/api/types';
import i18n from '@/i18n';

import { platform } from './platform';

/**
 * Local reminder alerts (TH-4). They work on Android and in Expo Go on iPhone
 * (server push comes in 2.1). The reminders list from the API is the single
 * source of truth: `syncReminderAlarms` makes the phone's scheduled alerts match
 * it, so reminders set by phone call or WhatsApp alert here too.
 */

export const REMINDER_CATEGORY = 'reminder';
export const CHECKIN_CATEGORY = 'checkin';
export const ACTION_YES = 'yes';
export const ACTION_NO = 'no';
const CHECKIN_ID = 'checkin:daily';
/** The morning question goes out at 8 am (docs/01 TH-1). */
const CHECKIN_HOUR = 8;
export const ACTION_DONE = 'done';
export const ACTION_SNOOZE = 'snooze';
export const SNOOZE_MINUTES = 10;
const CHANNEL_ID = 'reminders';
const ID_PREFIX = 'reminder:';

/** Shows alerts while the app is open too, and sets up the Done / Snooze buttons. */
export async function setupNotifications(): Promise<void> {
  if (!platform.canScheduleNotifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (platform.usesNotificationChannels) {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: i18n.t('notifications.channel'),
      // eslint-disable-next-line import/namespace -- re-exported via a .types file the import plugin doesn't follow
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  // Buttons work from the lock screen without opening the app.
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    {
      identifier: ACTION_DONE,
      buttonTitle: i18n.t('common.done'),
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: i18n.t('notifications.snooze', { count: SNOOZE_MINUTES }),
      options: { opensAppToForeground: false },
    },
  ]);
  // "Did you move yesterday?" Yes answers from the lock screen; No opens the app
  // to suggest a walk with company (Walk With Me).
  await Notifications.setNotificationCategoryAsync(CHECKIN_CATEGORY, [
    {
      identifier: ACTION_YES,
      buttonTitle: i18n.t('common.yes'),
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_NO,
      buttonTitle: i18n.t('common.no'),
      options: { opensAppToForeground: true },
    },
  ]);
}

/**
 * The 8 am check-in as a local notification, every day. Used wherever the server
 * can't push to the phone (always in Expo Go on iPhone). Never asks for permission.
 */
export async function syncMorningCheckin(enabled: boolean): Promise<void> {
  if (!(await notificationsAllowed(false))) return;
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).some(
    (n) => n.identifier === CHECKIN_ID,
  );
  if (!enabled) {
    if (scheduled) await Notifications.cancelScheduledNotificationAsync(CHECKIN_ID);
    return;
  }
  if (scheduled) return;
  await Notifications.scheduleNotificationAsync({
    identifier: CHECKIN_ID,
    content: {
      // First words say what it is (S38).
      title: i18n.t('notifications.checkinTitle'),
      body: i18n.t('notifications.checkinBody'),
      categoryIdentifier: CHECKIN_CATEGORY,
      sound: 'default',
      data: { kind: 'checkin' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: CHECKIN_HOUR,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });
}

/**
 * The Expo push token for server notifications (our Android build only: Expo Go
 * on iPhone can't receive them). Null when push isn't possible or not set up.
 */
export async function expoPushToken(projectId: string | null): Promise<string | null> {
  if (!platform.canUseRemotePush || !projectId) return null;
  if (!(await notificationsAllowed(false))) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/** True if we may alert. Asks the phone only when `ask` is true (a member action). */
export async function notificationsAllowed(ask: boolean): Promise<boolean> {
  if (!platform.canScheduleNotifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function content(reminder: Pick<Reminder, 'id' | 'text'>): Notifications.NotificationContentInput {
  return {
    // First words say what it is (S38): "Reminder: Take medicine".
    title: i18n.t('notifications.reminderTitle', { text: reminder.text }),
    body: i18n.t('notifications.reminderBody'),
    categoryIdentifier: REMINDER_CATEGORY,
    sound: 'default',
    data: { reminderId: reminder.id },
  };
}

/** One identifier per alert, so a changed time or repeat gets rescheduled. */
function alarmIds(r: Reminder): string[] {
  const base = `${ID_PREFIX}${r.id}:${r.time}:${r.repeat}:${r.date ?? ''}`;
  return r.repeat === 'weekdays' ? [1, 2, 3, 4, 5].map((d) => `${base}:${d}`) : [base];
}

function triggers(r: Reminder): Notifications.NotificationTriggerInput[] {
  const [hour = 0, minute = 0] = r.time.split(':').map(Number);
  const channelId = CHANNEL_ID;
  if (r.repeat === 'daily') {
    return [{ type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId }];
  }
  if (r.repeat === 'weekdays') {
    // Expo weekdays: 1 = Sunday, so Monday–Friday are 2–6.
    return [2, 3, 4, 5, 6].map((weekday) => ({
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
      channelId,
    }));
  }
  const [y, m, d] = (r.date ?? '').split('-').map(Number);
  const when = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hour, minute);
  return when.getTime() > Date.now()
    ? [{ type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId }]
    : [];
}

/**
 * Makes the phone's scheduled reminder alerts match `reminders`: adds missing
 * ones, cancels ones that were removed or changed. Never asks for permission.
 */
export async function syncReminderAlarms(reminders: readonly Reminder[]): Promise<void> {
  if (!(await notificationsAllowed(false))) return;

  const wanted = new Map<
    string,
    { reminder: Reminder; trigger: Notifications.NotificationTriggerInput }
  >();
  for (const r of reminders) {
    const ids = alarmIds(r);
    triggers(r).forEach((trigger, i) => wanted.set(ids[i]!, { reminder: r, trigger }));
  }

  const scheduled = (await Notifications.getAllScheduledNotificationsAsync())
    .map((n) => n.identifier)
    .filter((id) => id.startsWith(ID_PREFIX));

  await Promise.all(
    scheduled
      .filter((id) => !wanted.has(id))
      .map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
  await Promise.all(
    [...wanted.entries()]
      .filter(([id]) => !scheduled.includes(id))
      .map(([identifier, { reminder, trigger }]) =>
        Notifications.scheduleNotificationAsync({
          identifier,
          content: content(reminder),
          trigger,
        }),
      ),
  );
}

/** "Snooze 10 min": the same alert again, once, in ten minutes. */
export async function snoozeReminder(reminder: Pick<Reminder, 'id' | 'text'>): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: content(reminder),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SNOOZE_MINUTES * 60,
      channelId: CHANNEL_ID,
    },
  });
}

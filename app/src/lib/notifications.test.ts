import * as Notifications from 'expo-notifications';

import type { Reminder } from '@/api/types';

import { notificationsAllowed, snoozeReminder, syncReminderAlarms } from './notifications';

const scheduled = (jest.requireMock('expo-notifications') as { __scheduled: Map<string, any> })
  .__scheduled;

const reminder = (over: Partial<Reminder>): Reminder => ({
  id: 'r1',
  kind: 'medicine',
  text: 'Take medicine',
  time: '08:00',
  repeat: 'daily',
  date: null,
  done_today: false,
  created_by: 'self',
  ...over,
});

beforeEach(() => {
  scheduled.clear();
  jest.clearAllMocks();
});

describe('syncReminderAlarms', () => {
  it('schedules one daily alert, titled with what it is, with Done / Snooze', async () => {
    await syncReminderAlarms([reminder({})]);
    expect(scheduled.size).toBe(1);
    const req = [...scheduled.values()][0];
    expect(req.trigger).toMatchObject({ type: 'daily', hour: 8, minute: 0 });
    expect(req.content).toMatchObject({
      title: 'Reminder: Take medicine',
      categoryIdentifier: 'reminder',
      data: { reminderId: 'r1' },
    });
  });

  it('schedules weekdays as Monday to Friday', async () => {
    await syncReminderAlarms([reminder({ repeat: 'weekdays', time: '20:30' })]);
    const weekdays = [...scheduled.values()].map((r) => r.trigger.weekday).sort();
    expect(weekdays).toEqual([2, 3, 4, 5, 6]);
  });

  it('cancels alerts for removed or changed reminders and adds new ones', async () => {
    await syncReminderAlarms([reminder({}), reminder({ id: 'r2', time: '20:00' })]);
    expect(scheduled.size).toBe(2);
    await syncReminderAlarms([reminder({ time: '09:00' })]);
    const hours = [...scheduled.values()].map((r) => r.trigger.hour);
    expect(hours).toEqual([9]);
  });

  it('does nothing twice: an unchanged list schedules nothing new', async () => {
    await syncReminderAlarms([reminder({})]);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();
    await syncReminderAlarms([reminder({})]);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('skips one-off reminders that are already in the past', async () => {
    await syncReminderAlarms([reminder({ repeat: 'once', date: '2020-01-01' })]);
    expect(scheduled.size).toBe(0);
  });

  it('never asks for permission while syncing, and schedules nothing without it', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
    });
    await syncReminderAlarms([reminder({})]);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(scheduled.size).toBe(0);
  });
});

it('asks for permission only when the member acts', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    granted: false,
    canAskAgain: true,
  });
  expect(await notificationsAllowed(true)).toBe(true);
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
});

it('snooze rings again in 10 minutes', async () => {
  await snoozeReminder({ id: 'r1', text: 'Take medicine' });
  const req = [...scheduled.values()][0];
  expect(req.trigger).toMatchObject({ type: 'timeInterval', seconds: 600 });
});

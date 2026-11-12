import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import { ApiError } from '@/api';
import { mockApi, mockDb } from '@/api/mock';
import { ALERTS_CHANNEL_ID } from '@/lib/notifications';
import { currentPath, renderApp, resetAppState, spokenText } from '@/test-utils/renderApp';

/**
 * Iteration 2.2 §4.4–4.6: SOS with location, S29 Are you OK?, S30 Helper alert,
 * and the alerts that open them (iterations/app/2.2-real-features.md §6 T5, T6).
 */

jest.setTimeout(60_000);

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));
const advance = async (ms: number) => {
  for (let left = ms; left > 0; left -= 1000) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(1000, left));
    });
  }
};

const response = (data: object, identifier = 'n1') =>
  ({
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: { request: { identifier, content: { title: '', body: '', data } } },
  }) as unknown as Notifications.NotificationResponse;

const tanAlert = {
  kind: 'sos_alert',
  sos_id: 's_demo_tan',
  member_name: 'Tan Mei Ling',
  member_phone: '+6591234567',
  lat: 1.3505,
  lng: 103.8486,
  created_at: '2026-11-13T09:30:00+08:00',
};

const helperUrl = (overrides: Record<string, string> = {}) =>
  '/helper-alert?' +
  new URLSearchParams({
    sos: 's_demo_tan',
    name: 'Tan Mei Ling',
    phone: '+6591234567',
    lat: '1.3505',
    lng: '103.8486',
    at: '2026-11-13T09:30:00+08:00',
    ...overrides,
  }).toString();

let openURL: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  await resetAppState();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

describe('S29 Are you OK?', () => {
  it("T6: reads itself out; I'm OK stops the ladder and says thank you", async () => {
    await renderApp('/are-you-ok');
    expect(screen.getAllByText('Are you okay?').length).toBeGreaterThan(0);
    await waitFor(() => expect(spokenText()).toContain('Are you okay?'));

    await press('ok-yes');
    expect(await screen.findByTestId('ok-thanks')).toBeTruthy();
    expect(mockDb().okConfirmations()).toHaveLength(1);
    // Not a check-in answer: "did you move yesterday?" is still unanswered.
    expect(mockDb().getToday().checkin.pending).toBe(true);
  });

  it('I need help goes straight to SOS', async () => {
    await renderApp('/are-you-ok');
    await press('ok-help');
    expect(currentPath()).toBe('/sos');
  });

  it('counts down 30 s, then says honestly that we will phone', async () => {
    await renderApp('/are-you-ok');
    expect(screen.getByTestId('ok-countdown').props.children).toBe('30');
    await advance(31_000);
    expect(screen.getByTestId('ok-no-answer')).toBeTruthy();
    // They can still answer.
    await press('ok-yes');
    expect(await screen.findByTestId('ok-thanks')).toBeTruthy();
  });
});

describe('S30 Helper alert', () => {
  it("T5: who, where, when; I'm on my way tells the member", async () => {
    await renderApp(helperUrl());
    expect(screen.getAllByText('Tan needs help').length).toBeGreaterThan(0);
    expect(screen.getByTestId('helper-map')).toBeTruthy();
    expect(screen.getByTestId('helper-when')).toBeTruthy();

    await press('helper-on-way');
    expect(await screen.findByTestId('helper-sent')).toBeTruthy();
    expect(mockDb().helperReply('s_demo_tan')).toBe('on_way');
  });

  it('Call Tan and Call 995 dial', async () => {
    await renderApp(helperUrl());
    await press('helper-call');
    expect(openURL).toHaveBeenCalledWith('tel:+6591234567');
    await press('helper-call-995');
    expect(openURL).toHaveBeenCalledWith('tel:995');
  });

  it('an alert that is already over says so calmly', async () => {
    jest
      .spyOn(mockApi, 'respondSos')
      .mockRejectedValueOnce(new ApiError(404, '', '/sos/s_demo_tan/respond'));
    await renderApp(helperUrl());
    await press('helper-on-way');
    expect(await screen.findByTestId('helper-closed')).toBeTruthy();
    expect(screen.queryByTestId('helper-failed')).toBeNull();
  });

  it('without a location: asks them to call instead of showing a map', async () => {
    await renderApp(helperUrl({ lat: '', lng: '' }));
    expect(screen.queryByTestId('helper-map')).toBeNull();
    expect(screen.getByText(/don't know exactly where Tan is/)).toBeTruthy();
  });
});

describe('Alerts open their screens', () => {
  const listener = () =>
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls.at(-1)![0] as (
      r: Notifications.NotificationResponse,
    ) => void;

  it('"Are you okay?" alert → S29', async () => {
    await renderApp('/home');
    await act(async () => listener()(response({ kind: 'are_you_ok' })));
    expect(currentPath()).toBe('/are-you-ok');
  });

  it('"Tan needs help" alert → S30 with everything from the push', async () => {
    await renderApp('/home');
    await act(async () => listener()(response(tanAlert)));
    expect(currentPath()).toBe('/helper-alert');
    expect(screen.getAllByText('Tan needs help').length).toBeGreaterThan(0);
    expect(screen.getByTestId('helper-call')).toBeTruthy();
  });

  it('a tap that opened the app is handled once', async () => {
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValueOnce(
      response({ kind: 'are_you_ok' }, 'launch'),
    );
    await renderApp('/home');
    await waitFor(() => expect(currentPath()).toBe('/are-you-ok'));
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
  });
});

describe('SOS sends where they are', () => {
  it("uses the phone's location, found during the countdown", async () => {
    const trigger = jest.spyOn(mockApi, 'triggerSos');
    await renderApp('/sos');
    await advance(6000);
    await waitFor(() => expect(trigger).toHaveBeenCalled());
    expect(trigger).toHaveBeenCalledWith({ trigger: 'button', lat: 1.3521, lng: 103.8198 });
  });

  it('without location permission sends none (the server uses home), and never asks', async () => {
    const Location = jest.requireMock('expo-location') as {
      getForegroundPermissionsAsync: jest.Mock;
      requestForegroundPermissionsAsync: jest.Mock;
    };
    Location.getForegroundPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const trigger = jest.spyOn(mockApi, 'triggerSos');
    await renderApp('/sos');
    await advance(6000);
    await waitFor(() => expect(trigger).toHaveBeenCalled());
    expect(trigger).toHaveBeenCalledWith({ trigger: 'button', lat: null, lng: null });
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('Demo alerts (mock data)', () => {
  it('Settings schedules the real alert on the urgent channel', async () => {
    await renderApp('/settings');
    await press('settings-demo-open');
    await fireEvent.press(await screen.findByTestId('settings-demo-helper-alert'));
    expect(await screen.findByTestId('settings-demo-note')).toBeTruthy();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Tan Mei Ling needs help',
          data: expect.objectContaining({ kind: 'sos_alert', sos_id: 's_demo_tan' }),
        }),
        trigger: expect.objectContaining({ channelId: ALERTS_CHANNEL_ID, seconds: 5 }),
      }),
    );
  });
});

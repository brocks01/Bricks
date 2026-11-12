import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { api } from '@/api';
import { mockApi, mockDb } from '@/api/mock';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { currentPath, renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Iteration 2.3 (iterations/app/2.3-integration-freeze.md): changes made on other
 * channels show up, the hidden demo reset, and no action fails silently.
 */

jest.setTimeout(60_000);

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));

beforeEach(async () => {
  jest.restoreAllMocks();
  await resetAppState();
});

describe('Cross-channel', () => {
  it('an SOS raised on WhatsApp opens the SOS screen with who is coming, once', async () => {
    // As if they had sent "HELP" on WhatsApp: the alert exists before the app opens.
    const alert = mockDb().triggerSos();
    await renderApp('/home');
    expect(await screen.findByTestId('screen-sos')).toBeTruthy();
    expect(currentPath()).toBe('/sos');
    // No countdown and nothing sent twice: it shows the alert that already went out.
    expect(screen.queryByTestId('sos-countdown')).toBeNull();
    expect(await screen.findByText(/Priya/)).toBeTruthy();

    await press('sos-safe');
    await press('confirm-yes');
    await waitFor(() => expect(mockDb().getSos(alert.id).status).toBe('resolved'));
  });
});

describe('Demo reset (hidden)', () => {
  it('tap the version 5 times → Reset demo → fresh story, back on Home as Raj', async () => {
    useSettings.setState({ demoUser: 'u_priya' });
    await renderApp('/settings');
    expect(screen.queryByTestId('settings-reset-demo')).toBeNull();
    for (let i = 0; i < 5; i += 1) await press('settings-version');
    expect(await screen.findByText('Demo controls are on.')).toBeTruthy();

    // Change the story first: answer the check-in.
    mockDb().answerCheckin('yes');
    expect(mockDb().getToday().checkin.pending).toBe(false);

    await press('settings-reset-demo');
    expect(screen.getByText(/Start the demo again from the beginning/)).toBeTruthy();
    await press('confirm-yes');

    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(await screen.findByText(/Demo reset in [\d.]+ seconds\./)).toBeTruthy();
    expect(mockDb().getToday().checkin.pending).toBe(true);
    expect(useSettings.getState().demoUser).toBeNull();
    expect(useOnboarding.getState().completed).toBe(true);
  });

  it('says so in plain words when the server is not a demo server', async () => {
    jest.spyOn(api, 'resetDemo').mockRejectedValueOnce(new Error('404'));
    await renderApp('/settings/demo');
    await press('demo-reset');
    await press('confirm-yes');
    expect(await screen.findByText(/We couldn't reset the demo/)).toBeTruthy();
  });

  it('the account switcher only appears with several accounts (not on mock data)', async () => {
    await renderApp('/settings/demo');
    await screen.findByTestId('demo-reset');
    await waitFor(() => expect(screen.queryByTestId('demo-account-u_raj')).toBeNull());
  });
});

describe('Account switcher (demo server)', () => {
  const accounts = [
    { id: 'u_raj', name: 'Raj Kumar', role: 'senior' },
    { id: 'u_priya', name: 'Priya Kumar', role: 'family' },
    { id: 'u_judge', name: 'Guest Judge', role: 'judge' },
  ] as const;

  it('a seeded person opens on Home as them', async () => {
    jest.spyOn(api, 'getDemoAccounts').mockResolvedValue([...accounts]);
    await renderApp('/settings/demo');
    await fireEvent.press(await screen.findByTestId('demo-account-u_priya'));
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(useSettings.getState().demoUser).toBe('u_priya');
  });

  it('the guest judge is a new member: sign-in and onboarding from the start', async () => {
    jest.spyOn(api, 'getDemoAccounts').mockResolvedValue([...accounts]);
    await renderApp('/settings/demo');
    await fireEvent.press(await screen.findByTestId('demo-account-u_judge'));
    await waitFor(() => expect(currentPath()).toMatch(/^\/onboarding/));
    expect(useSettings.getState().demoUser).toBe('u_judge');
    expect(useOnboarding.getState().completed).toBe(false);
  });
});

describe('No silent failures (S39)', () => {
  it('a reminder Done that fails says "That didn\'t work"', async () => {
    jest.spyOn(mockApi, 'completeReminder').mockRejectedValueOnce(new Error('offline'));
    await renderApp('/home');
    await fireEvent.press(await screen.findByTestId('next-reminder-done'));
    expect(await screen.findByText("That didn't work. Let's try again.")).toBeTruthy();
  });

  it('Home says what it is doing while today loads', async () => {
    jest.spyOn(mockApi, 'getToday').mockReturnValueOnce(new Promise(() => {}));
    await renderApp('/home');
    expect(screen.getByText("Getting today's plan…")).toBeTruthy();
  });
});

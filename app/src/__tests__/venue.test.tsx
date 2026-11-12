import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { api } from '@/api';
import { NetworkError } from '@/api/errors';
import { mockDb } from '@/api/mock';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { currentPath, renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Iteration 3.1 (iterations/app/3.1-stabilise-venue.md): judges' QR links, the
 * connection check for venue networks, and a crash sweep of every screen.
 */

jest.setTimeout(120_000);

beforeEach(async () => {
  jest.restoreAllMocks();
  await resetAppState();
});

describe('Judge QR link', () => {
  it('opens as that judge, skips onboarding, and lands on Home with the check-in waiting', async () => {
    await resetAppState({ onboarded: false });
    const reset = jest.spyOn(api, 'resetJudge');
    await renderApp('/judge/3');
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(reset).toHaveBeenCalledWith(3);
    expect(useSettings.getState().demoUser).toBe('u_judge3');
    expect(useOnboarding.getState().completed).toBe(true);
    expect(await screen.findByText(/Welcome, Judge 3\./)).toBeTruthy();
    // Today's question is there, so "No → join walk" works straight away.
    expect(mockDb().getToday().checkin.pending).toBe(true);
    expect(await screen.findByTestId('checkin-card')).toBeTruthy();
  });

  it("says so in plain words when the server can't be reached, and tries again", async () => {
    jest
      .spyOn(api, 'resetJudge')
      .mockRejectedValueOnce(new NetworkError('/demo/judges/2/reset', new Error('offline')));
    await renderApp('/judge/2');
    expect(await screen.findByText(/We couldn't open the judge account/)).toBeTruthy();
    expect(useSettings.getState().demoUser).toBeNull();
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(useSettings.getState().demoUser).toBe('u_judge2');
  });

  it("a link that isn't a judge goes to the normal start", async () => {
    const reset = jest.spyOn(api, 'resetJudge');
    await renderApp('/judge/42');
    await waitFor(() => expect(currentPath()).toBe('/home'));
    expect(reset).not.toHaveBeenCalled();
  });
});

describe('Check connection (venue Wi-Fi or hotspot)', () => {
  it('says how fast the server answered', async () => {
    await renderApp('/settings/demo');
    await fireEvent.press(await screen.findByTestId('demo-check-connection'));
    expect(await screen.findByText(/The server answered in \d+ ms\./)).toBeTruthy();
  });

  it("suggests the hotspot when the server can't be reached", async () => {
    jest
      .spyOn(api, 'getHealth')
      .mockRejectedValueOnce(new NetworkError('/health', new Error('offline')));
    await renderApp('/settings/demo');
    await fireEvent.press(await screen.findByTestId('demo-check-connection'));
    expect(await screen.findByText("We can't reach the server. Try the hotspot.")).toBeTruthy();
  });
});

describe('Crash sweep: every screen opens', () => {
  const onboarding = [
    '/onboarding',
    '/onboarding/who',
    '/onboarding/text-size',
    '/onboarding/sign-in',
    '/onboarding/about',
    '/onboarding/voice-intro',
    '/onboarding/safe-circle',
    '/onboarding/reminders',
    '/onboarding/family',
    '/onboarding/done',
  ];
  const app = [
    '/home',
    '/kampung',
    '/kampung/happenings',
    '/kampung/circles',
    '/kampung/circle/c_walkers',
    '/kampung/create',
    '/thrive',
    '/thrive/checkin',
    '/thrive/reminders',
    '/thrive/reminder-new',
    '/pass-it-on',
    '/pass-it-on/intro',
    '/pass-it-on/share',
    '/pass-it-on/skills',
    '/pass-it-on/story',
    '/pass-it-on/thanks',
    '/event/e_walk_bishan',
    '/going/e_walk_bishan',
    '/thank/e_past_kueh',
    '/walk/record',
    '/sos',
    '/are-you-ok',
    '/helper-alert',
    '/family',
    '/profile',
    '/settings',
    '/settings/language',
    '/settings/text-size',
    '/settings/read-aloud',
    '/settings/reminders',
    '/settings/safe-circle',
    '/settings/demo',
  ];

  it.each(onboarding)('%s', async (route) => {
    await resetAppState({ onboarded: false });
    await renderApp(route);
    expect(screen.queryByTestId('error-retry')).toBeNull();
  });

  it.each(app)('%s', async (route) => {
    await renderApp(route);
    expect(screen.queryByTestId('error-retry')).toBeNull();
  });

  it('a walk summary', async () => {
    const last = mockDb().walkStats().last_walk;
    expect(last).not.toBeNull();
    await renderApp(`/walk/${last!.id}`);
    expect(screen.queryByTestId('error-retry')).toBeNull();
  });
});

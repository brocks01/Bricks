import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import * as Speech from 'expo-speech';
import { Linking } from 'react-native';

import { mockDb } from '@/api/mock';
import { currentPath, renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Iteration 3.4 (iterations/app/3.4-rehearse.md §3): the app's part of the 2-minute
 * stage demo, run five times with Settings → Demo → Reset demo between runs, the way
 * the presenter will on the day. Every run must end the same way as the first.
 */

jest.setTimeout(120_000);

const RUNS = 5;

/** Moves fake time forward a second at a time, letting requests settle in between. */
const advance = async (ms: number) => {
  for (let left = ms; left > 0; left -= 1000) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(1000, left));
    });
  }
};
const tap = async (testID: string) => fireEvent.press(await screen.findByTestId(testID));
/** Pull down to refresh, as the presenter would on the Reminders screen. */
const pullToRefresh = async (screenTestID: string) => {
  const scroll = screen.getByTestId(`${screenTestID}-scroll`);
  await act(async () => {
    scroll.props.refreshControl.props.onRefresh();
  });
};

beforeEach(async () => {
  jest.clearAllMocks();
  await resetAppState();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

/** Step 1: Home → No → the walk with company → I'm going → its WhatsApp group. */
async function checkinToCommunity() {
  await act(async () => {
    router.navigate('/home');
  });
  await tap('checkin-no');
  const suggestion = await screen.findByTestId('checkin-suggestion');
  await fireEvent.press(within(suggestion).getByText("I'm going"));
  expect(await screen.findByText("You're going.")).toBeTruthy();
  expect(screen.getByTestId('going-whatsapp')).toBeTruthy();
}

/** Step 2: Health → the last walk (read aloud) → Share → a Circle-mate's cheer arrives. */
async function walkSummary() {
  await act(async () => {
    router.navigate('/thrive');
  });
  await tap('thrive-last-walk');
  const walks = await screen.findAllByTestId(/^history-walk-/);
  await fireEvent.press(walks[0]!);
  expect(currentPath()).toMatch(/^\/walk\/w_/);
  expect(await screen.findByText('2.4 km')).toBeTruthy();
  await tap('topbar-readout');
  await waitFor(() => expect(Speech.speak).toHaveBeenCalled());
  await tap('walk-share');
  expect(await screen.findByText('Shared with your Circle.')).toBeTruthy();
  // The demo cheer arrives 5 s later; the page checks every 5 s.
  await advance(11_000);
  expect(await screen.findByText('Lim cheered')).toBeTruthy();
}

/** Step 3: the stage phone call sets "8 am Take medicine, every day"; pull to refresh shows it. */
async function reminderFromCall() {
  await act(async () => {
    router.navigate('/thrive/reminders');
  });
  await screen.findByTestId('screen-reminders');
  const before = (await screen.findAllByTestId(/^reminder-r_\d+-remove$/)).length;
  // What the voice call does on the server.
  mockDb().createReminder({
    kind: 'medicine',
    text: 'Take medicine',
    time: '08:00',
    repeat: 'daily',
    date: null,
  });
  await pullToRefresh('screen-reminders');
  await waitFor(() =>
    expect(screen.getAllByTestId(/^reminder-r_\d+-remove$/)).toHaveLength(before + 1),
  );
}

/** Step 4: Help → countdown → helpers on their way. */
async function safetyNet() {
  await tap('topbar-help');
  expect(currentPath()).toBe('/sos');
  await advance(5000);
  expect(await screen.findByText('Your Safe Circle has been told.')).toBeTruthy();
  await advance(15_000);
  expect(await screen.findByText('Priya is on the way')).toBeTruthy();
  expect(await screen.findByText('Ahmad (300 m away) is on the way')).toBeTruthy();
  // Off stage: I'm safe now, so the next run starts clean.
  await tap('sos-safe');
  await tap('confirm-yes');
  expect(await screen.findByTestId('sos-resolved')).toBeTruthy();
}

/** Settings → Demo → Reset demo → Yes: back to the seeded story on Home. */
async function resetDemo() {
  await act(async () => {
    router.navigate('/settings/demo');
  });
  await tap('demo-reset');
  await tap('confirm-yes');
  await waitFor(() => expect(currentPath()).toBe('/home'));
  expect(await screen.findByText('Did you move yesterday?')).toBeTruthy();
}

it(`runs the stage demo ${RUNS} times in a row, with a reset between`, async () => {
  await renderApp('/home');
  for (let run = 1; run <= RUNS; run++) {
    await checkinToCommunity();
    await walkSummary();
    await reminderFromCall();
    await safetyNet();
    await resetDemo();
  }
});

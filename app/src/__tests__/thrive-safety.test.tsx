import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import * as Speech from 'expo-speech';
import { Linking } from 'react-native';

import { mockApi } from '@/api/mock';
import { useActiveWalk } from '@/features/walk/activeWalk';
import { bishanParkLoop } from '@/features/walk/simulatedTrack';
import { currentPath, renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Iteration 1.2 exit criteria and test cases (iterations/app/1.2-thrive-safety.md §6),
 * through the real router, screens, walk engine and mock backend.
 */

jest.setTimeout(60_000);

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));
/** Moves fake time forward a second at a time, letting requests settle in between (like a real clock). */
const advance = async (ms: number) => {
  for (let left = ms; left > 0; left -= 1000) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(1000, left));
    });
  }
};
const scheduled = (jest.requireMock('expo-notifications') as { __scheduled: Map<string, any> })
  .__scheduled;

let openURL: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  scheduled.clear();
  await resetAppState();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

describe('Thrive', () => {
  it('shows Start walk, this week, the last walk and reminders (the check-in is on Home)', async () => {
    await renderApp('/thrive');
    expect(await screen.findByTestId('thrive-start-walk')).toBeTruthy();
    expect(screen.queryByText('Did you move yesterday?')).toBeNull();
    expect(await screen.findByTestId('thrive-week')).toBeTruthy();
    expect(screen.getByText(/days in a row/)).toBeTruthy();
    expect(screen.getByText(/^Last: Bishan Park · 2\.4 km$/)).toBeTruthy();
    expect(screen.getByTestId('thrive-reminders')).toBeTruthy();
    expect(
      screen.getByText(/^Next: (8 am · Take medicine|8 pm · Blood pressure tablet)$/),
    ).toBeTruthy();
  });

  it('opens the last walk: route, numbers, splits and a warm line', async () => {
    await renderApp('/thrive');
    // Your walks → the newest walk is at the top of the list.
    await fireEvent.press(await screen.findByTestId('thrive-last-walk'));
    const walks = await screen.findAllByTestId(/^history-walk-/);
    await fireEvent.press(walks[0]!);
    expect(currentPath()).toMatch(/^\/walk\/w_/);
    expect(await screen.findByText(/Morning walk · Bishan Park/)).toBeTruthy();
    expect(screen.getByText('2.4 km')).toBeTruthy();
    expect(screen.getByTestId('walk-splits')).toBeTruthy();
    expect(screen.getByTestId('walk-praise')).toBeTruthy();
  });
});

describe('Check-in (S21)', () => {
  it('T1: No → a walk with company → join it', async () => {
    await renderApp('/thrive/checkin');
    await fireEvent.press(await screen.findByTestId('checkin-no'));
    const suggestion = await screen.findByTestId('checkin-suggestion');
    await fireEvent.press(within(suggestion).getByText("I'm going"));
    expect(await screen.findByText("You're going.")).toBeTruthy();
  });

  it('T2: Yes → "6 days in a row", and the card clears on Thrive', async () => {
    await renderApp('/thrive/checkin');
    await fireEvent.press(await screen.findByTestId('checkin-yes'));
    expect(await screen.findByText("Well done. That's 6 days in a row.")).toBeTruthy();
    await press('checkin-done');
    await waitFor(() => expect(screen.queryByTestId('checkin-card')).toBeNull());
  });

  it('"Maybe later" goes back without joining', async () => {
    await renderApp('/thrive');
    await screen.findByTestId('thrive-start-walk');
    await act(async () => router.push('/thrive/checkin'));
    await fireEvent.press(await screen.findByTestId('checkin-no'));
    await fireEvent.press(await screen.findByTestId('checkin-later'));
    expect(currentPath()).toBe('/thrive');
  });
});

describe('Walk recording (S22 → S23)', () => {
  it('T3: Start walk → simulated walk at 10× → Finish (confirmed) → summary', async () => {
    useActiveWalk.getState().setSimulationSpeed(10);
    await renderApp('/thrive');
    await fireEvent.press(await screen.findByTestId('thrive-start-walk'));
    expect(currentPath()).toBe('/walk/record');
    // 4 real minutes at 10× = the whole 32-minute loop.
    for (let i = 0; i < 8; i++) await advance(30_000);
    expect(screen.getByText('2.4 km')).toBeTruthy();
    expect(screen.getByText(/^3,[0-9]{3}$/)).toBeTruthy();

    await press('walk-finish');
    expect(screen.getByText('Finish your walk?')).toBeTruthy();
    await press('confirm-yes');
    expect(await screen.findByTestId('walk-praise')).toBeTruthy();
    expect(currentPath()).toMatch(/^\/walk\/w_/);
    expect(screen.getByText('2.4 km')).toBeTruthy();
    expect(screen.getByTestId('walk-splits')).toBeTruthy();
  });

  it('Pause stops the clock; Carry on continues', async () => {
    await renderApp('/walk/record');
    await advance(10_000);
    await press('walk-pause');
    expect(screen.getByTestId('walk-paused')).toBeTruthy();
    const before = screen.getByText(/^0:\d\d$/).props.children;
    await advance(30_000);
    expect(screen.getByText(/^0:\d\d$/).props.children).toBe(before);
    await press('walk-pause');
    expect(screen.queryByTestId('walk-paused')).toBeNull();
  });

  it('Finish asks first; "No" keeps walking', async () => {
    await renderApp('/walk/record');
    await press('walk-finish');
    await press('confirm-no');
    expect(currentPath()).toBe('/walk/record');
    expect(useActiveWalk.getState().session).not.toBeNull();
  });

  it('T5: a walk left unfinished (app closed) can be saved from Thrive', async () => {
    const start = Date.now() - 40 * 60 * 1000;
    const points = bishanParkLoop().map(({ offset_s, point }) => ({
      ...point,
      t: start + offset_s * 1000,
    }));
    await AsyncStorage.setItem(
      'bricks.walk.unfinished',
      JSON.stringify({
        started_at: start,
        segments: [points],
        active_ms: 0,
        steps: null,
        event_id: null,
        saved_at: Date.now(),
      }),
    );
    await renderApp('/thrive');
    expect(await screen.findByTestId('thrive-unfinished')).toBeTruthy();
    await press('thrive-unfinished-save');
    expect(await screen.findByTestId('walk-praise')).toBeTruthy();
    expect(await AsyncStorage.getItem('bricks.walk.unfinished')).toBeNull();
  });

  it('shows "Keep this screen open" where it can\'t record in the background', async () => {
    await renderApp('/walk/record');
    // Tests run as Expo Go (no background recording).
    expect(screen.getByTestId('walk-keep-open')).toBeTruthy();
  });
});

describe('Reminders (S26)', () => {
  it('T6: adds a reminder in steps, schedules the phone alert, with Undo', async () => {
    await renderApp('/thrive/reminders');
    await fireEvent.press(await screen.findByTestId('reminders-add'));
    expect(screen.getByText('Step 1 of 3')).toBeTruthy();
    await press('reminder-kind-medicine');
    await press('reminder-next');
    await press('reminder-time-9');
    await press('reminder-next');
    await press('reminder-repeat-daily');
    await press('reminder-next');
    expect(screen.getByTestId('reminder-summary').props.children).toBe(
      'Every day at 9 am: Take medicine',
    );
    await press('reminder-next');

    expect(await screen.findByText('Reminder set for 9 am.')).toBeTruthy();
    expect(screen.getByText('9 am')).toBeTruthy();
    await waitFor(() =>
      expect([...scheduled.values()].some((r) => r.trigger.hour === 9)).toBe(true),
    );

    await press('undo-bar-undo');
    await waitFor(() => expect(screen.queryByText('9 am')).toBeNull());
  });

  it('"Another time" uses big Earlier / Later buttons instead of a wheel', async () => {
    await renderApp('/thrive/reminder-new');
    await press('reminder-kind-doctor');
    await press('reminder-next');
    await press('reminder-time-other');
    expect(screen.getByTestId('time-adjuster-value').props.children).toBe('8 am');
    await press('time-hour-later');
    await press('time-minute-later');
    await press('time-minute-later');
    expect(screen.getByTestId('time-adjuster-value').props.children).toBe('9:30 am');
  });

  it('Remove takes it off the list, and Undo brings it back', async () => {
    await renderApp('/thrive/reminders');
    const removeButtons = await screen.findAllByTestId(/^reminder-r_\d+-remove$/);
    expect(removeButtons).toHaveLength(2);
    await fireEvent.press(removeButtons[0]!);
    await waitFor(() => expect(screen.getAllByTestId(/^reminder-r_\d+-remove$/)).toHaveLength(1));
    await press('undo-bar-undo');
    await waitFor(() => expect(screen.getAllByTestId(/^reminder-r_\d+-remove$/)).toHaveLength(2));
  });
});

describe('SOS (S28)', () => {
  it('T8: opens from Thrive, offers 995 first, reads itself out; Cancel sends nothing', async () => {
    const trigger = jest.spyOn(mockApi, 'triggerSos');
    await renderApp('/thrive');
    await fireEvent.press(await screen.findByTestId('topbar-help'));
    expect(currentPath()).toBe('/sos');
    expect(screen.getByText('Call 995 now')).toBeTruthy();
    expect(screen.getByText('Telling your Safe Circle in 5 seconds…')).toBeTruthy();
    await waitFor(() =>
      expect(Speech.speak).toHaveBeenCalledWith(
        expect.stringContaining('Telling your Safe Circle in 5 seconds'),
        expect.anything(),
      ),
    );
    await press('sos-call');
    expect(openURL).toHaveBeenCalledWith('tel:995');

    await advance(2000);
    expect(screen.getByText('Telling your Safe Circle in 3 seconds…')).toBeTruthy();
    await press('sos-cancel');
    await advance(10_000);
    expect(trigger).not.toHaveBeenCalled();
    expect(currentPath()).toBe('/thrive');
  });

  it('T9: after the countdown, helpers\' replies show live; "I\'m safe now" ends it', async () => {
    await renderApp('/sos');
    await advance(5000);
    expect(await screen.findByText('Your Safe Circle has been told.')).toBeTruthy();
    // Replies are checked every 3 s; Priya sets off after 3 s, Ahmad after 6 s.
    await advance(15_000);
    expect(await screen.findByText('Priya is on the way')).toBeTruthy();
    expect(await screen.findByText('Ahmad (300 m away) is on the way')).toBeTruthy();
    expect(screen.getByText('Lim (650 m away) has been told')).toBeTruthy();

    await press('sos-safe');
    expect(screen.getByText("Tell everyone you're safe now?")).toBeTruthy();
    await press('confirm-yes');
    expect(await screen.findByTestId('sos-resolved')).toBeTruthy();
  });
});

describe('Help and Read it out on every new screen', () => {
  it.each([
    '/thrive',
    '/thrive/checkin',
    '/thrive/reminders',
    '/thrive/reminder-new',
    '/walk/record',
  ])('%s', async (url) => {
    await renderApp(url);
    expect(await screen.findByTestId('topbar-readout')).toBeTruthy();
    await press('topbar-help');
    expect(currentPath()).toBe('/sos');
  });
});

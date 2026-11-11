import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';
import * as Location from 'expo-location';
import { AppState, Linking } from 'react-native';

import { useActiveWalk } from '@/features/walk/activeWalk';
import { currentPath, renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Iteration 2.2 §4.3: real GPS walks through the real record screen
 * (iterations/app/2.2-real-features.md). Location is asked when the walk starts,
 * and a "no" is explained in plain words.
 */

jest.setTimeout(60_000);

const location = Location as typeof Location & { __emit: (loc: unknown) => void };
const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));
const fix = (i: number, t: number) => ({
  coords: { latitude: 1.35 + i * 0.0001, longitude: 103.85, accuracy: 5 },
  timestamp: t,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await resetAppState();
  useActiveWalk.getState().setSource('gps');
});

describe('GPS walk recording (S22)', () => {
  it('asks for location, then records real GPS fixes', async () => {
    await renderApp('/walk/record');
    expect(await screen.findByTestId('walk-stats')).toBeTruthy();
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(useActiveWalk.getState().session).not.toBeNull();

    const t0 = Date.now();
    await act(async () => {
      for (let i = 0; i <= 10; i++) location.__emit(fix(i, t0 + i * 5000));
    });
    // ~111 m north. (The screen's copy refreshes on the engine's 1 s tick.)
    expect(useActiveWalk.getState().session?.progress().distance_m).toBeGreaterThan(100);
  });

  it('location refused: plain words, Open Settings, and it starts once allowed', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const appStateListeners: ((s: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, cb) => {
      appStateListeners.push(cb as (s: string) => void);
      return { remove: jest.fn() } as never;
    });

    await renderApp('/walk/record');
    expect(await screen.findByTestId('walk-location-denied')).toBeTruthy();
    expect(screen.getByText(/needs to use your location/)).toBeTruthy();
    expect(useActiveWalk.getState().session).toBeNull();

    await press('walk-location-settings');
    expect(openSettings).toHaveBeenCalled();

    // They allow it in Settings and come back: the walk starts without another tap.
    await act(async () => appStateListeners.forEach((cb) => cb('active')));
    expect(await screen.findByTestId('walk-stats')).toBeTruthy();
    expect(useActiveWalk.getState().session).not.toBeNull();
  });

  it('location switched off: says so; Try again starts once it is on', async () => {
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValueOnce(false);
    await renderApp('/walk/record');
    expect(await screen.findByTestId('walk-location-off')).toBeTruthy();

    await press('walk-location-retry');
    expect(await screen.findByTestId('walk-stats')).toBeTruthy();
  });

  it('leaving while location is being asked does not start a walk', async () => {
    let answer: (v: unknown) => void = () => {};
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockReturnValueOnce(
      new Promise((r) => (answer = r)),
    );
    await renderApp('/thrive');
    await fireEvent.press(await screen.findByTestId('thrive-start-walk'));
    expect(currentPath()).toBe('/walk/record');
    await act(async () => router.back());
    await act(async () => answer({ granted: true }));
    expect(useActiveWalk.getState().session).toBeNull();
  });
});

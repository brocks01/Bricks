import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { WalkSession } from './engine';
import { GpsTrackSource, prepareWalkLocation } from './gpsTrack';
import { WALK_LOCATION_TASK } from './locationTask';
import { StepCounter } from './stepCounter';

import type { TrackPoint } from '@/lib/geo';

// Background recording is decided per test (our Android build vs Expo Go / iPhone).
const flags = { canRecordInBackground: false, canCountSteps: true };
jest.mock('@/lib/platform', () => ({
  platform: new Proxy({}, { get: (_t, key: string) => (flags as Record<string, boolean>)[key] }),
}));

type LocationMock = typeof Location & {
  __emit: (loc: unknown) => void;
  __watchers: Set<unknown>;
  __started: Set<string>;
};
const location = Location as LocationMock;
const taskManager = jest.requireMock('expo-task-manager') as {
  __runTask: (name: string, body: unknown) => Promise<unknown> | undefined;
};
const pedometer = (
  jest.requireMock('expo-sensors') as { Pedometer: { __emit: (steps: number) => void } }
).Pedometer;

const fix = (lat: number, lng: number, t: number, accuracy: number | null = 5) => ({
  coords: { latitude: lat, longitude: lng, accuracy },
  timestamp: t,
});

const flush = () => new Promise((r) => setImmediate(r));
const notification = { title: 'Recording your walk', body: 'Tap to open' };

beforeEach(async () => {
  jest.clearAllMocks();
  flags.canRecordInBackground = false;
  flags.canCountSteps = true;
  await AsyncStorage.clear();
});

describe('prepareWalkLocation', () => {
  it('says so when location is switched off', async () => {
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValueOnce(false);
    expect(await prepareWalkLocation()).toEqual({ status: 'off' });
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('says so when they refuse location', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });
    expect(await prepareWalkLocation()).toEqual({ status: 'denied' });
  });

  it('records in the foreground where background is not possible (iPhone, Expo Go)', async () => {
    expect(await prepareWalkLocation()).toEqual({ status: 'ready', background: false });
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('asks for "all the time" once, on the first walk only (Android build)', async () => {
    flags.canRecordInBackground = true;
    expect(await prepareWalkLocation()).toEqual({ status: 'ready', background: true });
    expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);

    // Second walk: still not granted in settings → foreground, no second question.
    expect(await prepareWalkLocation()).toEqual({ status: 'ready', background: false });
    expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

describe('GpsTrackSource', () => {
  it('foreground: passes each GPS fix on as a track point and stops cleanly', async () => {
    const points: TrackPoint[] = [];
    const source = new GpsTrackSource(false, notification);
    source.start((p) => points.push(p));
    await flush();

    location.__emit(fix(1.35, 103.85, 1000, 4));
    location.__emit(fix(1.3501, 103.85, 6000, null));
    expect(points).toEqual([
      { lat: 1.35, lng: 103.85, t: 1000, accuracy: 4 },
      { lat: 1.3501, lng: 103.85, t: 6000 },
    ]);

    source.stop();
    expect(location.__watchers.size).toBe(0);
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('background: records through the task with a translated notification', async () => {
    const points: TrackPoint[] = [];
    const source = new GpsTrackSource(true, notification);
    source.start((p) => points.push(p));
    await flush();

    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
      WALK_LOCATION_TASK,
      expect.objectContaining({
        foregroundService: expect.objectContaining({
          notificationTitle: 'Recording your walk',
          notificationBody: 'Tap to open',
        }),
      }),
    );
    await taskManager.__runTask(WALK_LOCATION_TASK, {
      data: { locations: [fix(1.35, 103.85, 1000), fix(1.3501, 103.85, 6000)] },
      error: null,
    });
    expect(points.map((p) => p.t)).toEqual([1000, 6000]);

    source.stop();
    await flush();
    expect(location.__started.has(WALK_LOCATION_TASK)).toBe(false);
    // After stopping, late task deliveries go nowhere.
    await taskManager.__runTask(WALK_LOCATION_TASK, {
      data: { locations: [fix(1.36, 103.85, 9000)] },
      error: null,
    });
    expect(points).toHaveLength(2);
  });

  it('falls back to foreground GPS if the background service will not start', async () => {
    (Location.startLocationUpdatesAsync as jest.Mock).mockRejectedValueOnce(new Error('no'));
    const points: TrackPoint[] = [];
    const source = new GpsTrackSource(true, notification);
    source.start((p) => points.push(p));
    await flush();
    location.__emit(fix(1.35, 103.85, 1000));
    expect(points).toHaveLength(1);
    source.stop();
  });

  it('feeds a walk session: distance from real fixes, bad fixes dropped', async () => {
    let now = 0;
    const clock = {
      now: () => now,
      setInterval: () => null,
      clearInterval: () => {},
    };
    const session = new WalkSession({ source: new GpsTrackSource(false, notification), clock });
    session.start();
    await flush();

    // ~11 m north every 5 s (a slow walk), plus one 80 m-accuracy reading in the middle.
    for (let i = 0; i <= 10; i++) {
      now = i * 5000;
      location.__emit(fix(1.35 + i * 0.0001, 103.85, now));
      if (i === 5) location.__emit(fix(1.4, 103.9, now + 1, 80));
    }
    const upload = session.finish();
    expect(upload.segments[0]).toHaveLength(11);
    const distance = session.progress().distance_m;
    expect(distance).toBeGreaterThan(105);
    expect(distance).toBeLessThan(118);
  });
});

describe('StepCounter', () => {
  it('counts steps since the walk started, leaving out steps while paused', async () => {
    const seen: number[] = [];
    const counter = new StepCounter((s) => seen.push(s));
    await counter.start();

    pedometer.__emit(100);
    counter.pause();
    pedometer.__emit(130); // shuffling about while paused: not counted, not shown
    counter.resume();
    pedometer.__emit(150);
    expect(seen).toEqual([100, 120]);
    counter.stop();
  });

  it('reports nothing without a step counter (the walk estimates from distance)', async () => {
    flags.canCountSteps = false;
    const seen: number[] = [];
    const counter = new StepCounter((s) => seen.push(s));
    await counter.start();
    pedometer.__emit(100);
    expect(seen).toEqual([]);
  });
});

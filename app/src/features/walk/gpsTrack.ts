import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import type { TrackPoint } from '@/lib/geo';
import { platform } from '@/lib/platform';

import type { PointSource } from './engine';
import { setWalkLocationListener, toTrackPoint, WALK_LOCATION_TASK } from './locationTask';

/**
 * Real GPS for walks (docs/04 §2.3, iteration 2.2).
 *
 * - Our Android build: background location with a foreground service, so the
 *   walk keeps recording with the screen locked.
 * - iPhone (Expo Go) and anyone who said no to "all the time": foreground
 *   updates while the screen is open (the record screen keeps it awake).
 *
 * Pause and Carry on leave GPS running: the engine ignores points while paused,
 * and the next point after Carry on is already accurate.
 */

const OPTIONS = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 5000,
  distanceInterval: 10,
} as const;

export class GpsTrackSource implements PointSource {
  private watch: Location.LocationSubscription | null = null;
  private stopped = false;

  /**
   * `background`: use the background task (needs the "all the time" permission).
   * `notification`: the ongoing notification Android shows while it records, in their language.
   */
  constructor(
    private readonly background: boolean,
    private readonly notification: { title: string; body: string },
  ) {}

  start(onPoint: (point: TrackPoint) => void): void {
    this.stopped = false;
    if (this.background) {
      setWalkLocationListener(onPoint);
      Location.startLocationUpdatesAsync(WALK_LOCATION_TASK, {
        ...OPTIONS,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: this.notification.title,
          notificationBody: this.notification.body,
          killServiceOnDestroy: true,
        },
      }).catch(() => this.startForeground(onPoint));
    } else {
      this.startForeground(onPoint);
    }
  }

  pause(): void {}

  resume(): void {}

  stop(): void {
    this.stopped = true;
    this.watch?.remove();
    this.watch = null;
    if (this.background) {
      setWalkLocationListener(null);
      void Location.hasStartedLocationUpdatesAsync(WALK_LOCATION_TASK)
        .then((started) => (started ? Location.stopLocationUpdatesAsync(WALK_LOCATION_TASK) : null))
        .catch(() => {});
    }
  }

  private startForeground(onPoint: (point: TrackPoint) => void): void {
    setWalkLocationListener(null);
    Location.watchPositionAsync(OPTIONS, (location) => onPoint(toTrackPoint(location)))
      .then((sub) => {
        // Stopped while the subscription was starting: end it straight away.
        if (this.stopped) sub.remove();
        else this.watch = sub;
      })
      .catch(() => {});
  }
}

export type WalkLocationAccess =
  | { status: 'ready'; background: boolean }
  /** Location is switched off in the phone's settings. */
  | { status: 'off' }
  /** They said no to location for the app. */
  | { status: 'denied' };

/** "All the time" is asked once, on the first walk (Android 11+ opens Settings for it). */
const ASKED_BACKGROUND_KEY = 'bricks.walk.askedBackgroundLocation';

/**
 * Asks for what a GPS walk needs, only when the walk starts (docs/07: permissions
 * when needed, with reasons). The OS shows the reasons from app.config.ts.
 */
export async function prepareWalkLocation(): Promise<WalkLocationAccess> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return { status: 'off' };
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) return { status: 'denied' };
    if (!platform.canRecordInBackground) return { status: 'ready', background: false };

    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.granted) return { status: 'ready', background: true };
    if (await AsyncStorage.getItem(ASKED_BACKGROUND_KEY)) {
      return { status: 'ready', background: false };
    }
    await AsyncStorage.setItem(ASKED_BACKGROUND_KEY, '1');
    const asked = await Location.requestBackgroundPermissionsAsync();
    return { status: 'ready', background: asked.granted };
  } catch {
    return { status: 'denied' };
  }
}

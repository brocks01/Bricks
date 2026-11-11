import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import type { TrackPoint } from '@/lib/geo';

/**
 * The background location task for walks (our Android build only).
 *
 * TaskManager needs the task defined at module scope before anything mounts, so
 * the root layout imports this file first. Locations go to whichever walk is
 * listening; the foreground service keeps the app alive while it records.
 */

export const WALK_LOCATION_TASK = 'bricks-walk-location';

type Listener = (point: TrackPoint) => void;
let listener: Listener | null = null;

/** The walk that receives background locations (null when no walk is recording). */
export function setWalkLocationListener(next: Listener | null): void {
  listener = next;
}

export function toTrackPoint(location: LocationObject): TrackPoint {
  const { latitude, longitude, accuracy } = location.coords;
  return {
    lat: latitude,
    lng: longitude,
    t: location.timestamp,
    ...(accuracy != null ? { accuracy } : {}),
  };
}

try {
  if (!TaskManager.isTaskDefined(WALK_LOCATION_TASK)) {
    TaskManager.defineTask<{ locations?: LocationObject[] }>(
      WALK_LOCATION_TASK,
      async ({ data, error }) => {
        if (error || !data?.locations) return;
        for (const location of data.locations) listener?.(toTrackPoint(location));
      },
    );
  }
} catch {
  // TaskManager isn't available (Expo Go on Android, web): walks use foreground GPS.
}

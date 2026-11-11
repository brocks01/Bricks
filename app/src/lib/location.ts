import * as Location from 'expo-location';

import type { LatLng } from './geo';
import { platform } from './platform';

/** Older than this, the phone's last known position is too stale to send help to. */
const MAX_AGE_MS = 2 * 60 * 1000;
/** Never hold up an SOS for longer than this waiting for a fresh fix. */
const FIX_TIMEOUT_MS = 4000;

/**
 * Where the member is now, for SOS (docs/03 §7). Never asks for permission (no
 * prompts during an emergency) and never throws: null means "use home", which
 * the server does. Start it as the SOS screen opens; the countdown covers the wait.
 */
export async function currentLocation(): Promise<LatLng | null> {
  if (!platform.canRecordGps) return null;
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return null;
    const recent = await Location.getLastKnownPositionAsync({ maxAge: MAX_AGE_MS });
    if (recent) return { lat: recent.coords.latitude, lng: recent.coords.longitude };
    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS)),
    ]);
    return fresh ? { lat: fresh.coords.latitude, lng: fresh.coords.longitude } : null;
  } catch {
    return null;
  }
}

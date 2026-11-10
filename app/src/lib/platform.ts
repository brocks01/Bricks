import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Capability flags. Screens read these and never check Platform.OS directly
 * (docs/04_APP_PLAN.md §1.1).
 *
 * - Android runs our own EAS build (dev client / preview APK).
 * - iPhone runs inside Expo Go, so anything outside Expo Go is unavailable there.
 */

const isExpoGo = isRunningInExpoGo();
const isAndroid = Platform.OS === 'android';
const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

// The RightPosture module (modules/posture) only exists in our Android build.
const postureModule = requireOptionalNativeModule('Posture');

export const platform = {
  isExpoGo,
  /** Move Along camera warm-ups. Android build only. */
  canUsePosture: isAndroid && postureModule != null,
  /** Server-sent push. Expo Go supports local notifications only. */
  canUseRemotePush: isNative && !isExpoGo,
  /** Walk recording with the screen locked. iPhone/Expo Go records with the app open. */
  canRecordInBackground: isAndroid && !isExpoGo,
  /** Phone dialler links (tel:). */
  canCallPhone: isNative,
} as const;

export type PlatformFlags = typeof platform;

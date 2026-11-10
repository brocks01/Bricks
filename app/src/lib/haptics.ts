import * as Haptics from 'expo-haptics';

/** A light tick on every successful tap (docs/02 §5.3). Never throws. */
export function tapFeedback(): void {
  Haptics.selectionAsync().catch(() => {
    // Some devices / simulators have no haptics. Not worth surfacing.
  });
}

/** A stronger cue for important moments (opening SOS). */
export function warningFeedback(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

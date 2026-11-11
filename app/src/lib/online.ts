import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/**
 * Network status for React Query and the offline banner. While offline, queries
 * wait instead of failing, and everything refetches when the phone is back online.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    // `isInternetReachable` is null while unknown: only "false" counts as offline.
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  }),
);

/** True when the phone has no internet. */
export function useIsOffline(): boolean {
  return !useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}

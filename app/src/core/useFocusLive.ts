import { useFocusEffect } from 'expo-router';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cacheEpoch, cachePeek, cachePut, epochSubscribe } from './cache';

const noEpoch = () => 0;

/** Goes up each time the server says something changed. Put it in the dependencies of a screen's own loading effect to load again then. */
export function useLiveEpoch(): number {
  return useSyncExternalStore(epochSubscribe, cacheEpoch, noEpoch);
}

/**
 * Drop-in for expo-router's useFocusEffect, for every screen that loads its own data: it runs when the screen comes into view, as before, and
 * ALSO again whenever the server says something changed (a phone call, a chat, the other device). The callback must be safe to run twice (a loader is).
 */
export function useFocusLive(effect: Parameters<typeof useFocusEffect>[0]): void {
  const epoch = useSyncExternalStore(epochSubscribe, cacheEpoch, noEpoch);
  const latest = useRef(effect);
  useEffect(() => {
    latest.current = effect;
  });
  // The epoch is what identifies the callback: when the server reports a change it is a new one, so the screen's own loader runs again.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `effect` and the epoch are both reasons to run again
  useFocusEffect(useCallback(() => latest.current(), [effect, epoch]));
}

/**
 * useState whose value is kept across leaving and coming back to the screen (a tab switch) and after closing the app. Use it for what a screen
 * LOADED, so it shows the last thing it knew at once instead of a blank. `key` must say whose and what it is (it is cleared on sign-out with the rest).
 * The first value is read once; later changes are written back.
 */
export function useSavedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => (cachePeek<T>(`saved:${key}`)?.data ?? initial));
  const keyRef = useRef(key);
  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        // Saving is scheduled, not done during the update: React may run this function twice and it must stay pure.
        queueMicrotask(() => cachePut(`saved:${keyRef.current}`, v));
        return v;
      });
    },
    []
  );
  return [value, set];
}

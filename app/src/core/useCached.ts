import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { cacheMeta, cachePeek, cachePut, cacheSetMeta, cacheSubscribe } from './cache';

const FRESH_MS = 30_000; // newer than this: shown without asking again
const inflight = new Map<string, Promise<unknown>>(); // two screens asking for the same thing share one request

export interface Cached<T> {
  /** What we know now: the saved copy at once, then the server's, whichever is newer. undefined only the very first time. */
  data: T | undefined;
  /** True only when there is nothing to show yet: this is the one moment for a skeleton. */
  loading: boolean;
  /** True while the server is being asked in the background (the screen already shows the saved copy). */
  refreshing: boolean;
  /** The last ask failed; `data` (if any) is the saved copy and still shown. */
  failed: boolean;
  refresh: () => Promise<void>;
  /** Replace what is shown right now (an optimistic change), and remember it. The next refresh brings the server's truth. */
  set: (next: T | ((prev: T | undefined) => T)) => void;
}

/** One function for everyone asking: ask the server once per key at a time, keep the answer, record whether it worked. */
async function ask<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fetcher().then((d) => {
      cachePut(key, d);
      return d;
    });
    inflight.set(key, p);
    const done = () => inflight.delete(key);
    p.then(done, done);
  }
  cacheSetMeta(key, { refreshing: true });
  try {
    await p;
    cacheSetMeta(key, { refreshing: false, failed: false });
  } catch {
    cacheSetMeta(key, { refreshing: false, failed: true });
  }
}

const subscribeKey = (key: string | null) => (cb: () => void) => cacheSubscribe((paths) => key && paths.includes(key) && cb());

/**
 * Data for a screen that does not vanish. `key` starts with the API path it comes from ("/v1/home/summary", "/v1/calendar/occurrences?day=2026-11-17"): that is
 * what lets the live link refresh exactly the screens a change touches. `fetcher` is any function that returns the data (the existing api helpers work as they are).
 * Opening the screen again, switching tabs or coming back to the app shows the saved copy immediately and refreshes it in the background.
 */
export function useCached<T>(key: string | null, fetcher: () => Promise<T>, opts: { maxAgeMs?: number; enabled?: boolean } = {}): Cached<T> {
  const enabled = opts.enabled ?? true;
  const maxAge = opts.maxAgeMs ?? FRESH_MS;
  const fetchRef = useRef(fetcher);
  useEffect(() => {
    fetchRef.current = fetcher;
  });

  const entry = useSyncExternalStore(
    useCallback((cb: () => void) => subscribeKey(key)(cb), [key]),
    () => (key ? cachePeek<T>(key) : undefined),
    () => undefined
  );
  const meta = useSyncExternalStore(
    useCallback((cb: () => void) => subscribeKey(key)(cb), [key]),
    () => (key ? cacheMeta(key) : cacheMeta('')),
    () => cacheMeta('')
  );

  const refresh = useCallback(async () => {
    if (key && enabled) await ask(key, () => fetchRef.current());
  }, [key, enabled]);

  // Open, the key changed, or the saved copy is old or was marked stale (by the live link): ask again, showing the saved copy meanwhile.
  const missing = !entry;
  const stale = !!entry?.stale;
  const at = entry?.at ?? 0;
  useEffect(() => {
    if (key && enabled && (missing || stale || Date.now() - at > maxAge)) void refresh();
  }, [key, enabled, missing, stale, at, maxAge, refresh]);

  const set = useCallback(
    (next: T | ((prev: T | undefined) => T)) => {
      if (!key) return;
      const prev = cachePeek<T>(key)?.data;
      cachePut(key, typeof next === 'function' ? (next as (p: T | undefined) => T)(prev) : next);
    },
    [key]
  );

  return { data: entry?.data, loading: enabled && !!key && !entry && !meta.failed, refreshing: meta.refreshing, failed: meta.failed, refresh, set };
}

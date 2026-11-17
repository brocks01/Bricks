// What the server last told this app, kept so a screen shows something the moment it opens (no blank, no loading wheel) and still has it after the person
// switches tabs, closes the app or loses the network. The server is always the truth: every screen asks again in the background, and the live link
// (live/client.ts) marks entries stale the moment something changes anywhere (a phone call, a chat, the other device).
//
// Rules: one cache per account (a family helper acting for someone has their own); signing out erases it; the secret parts of the API (sign-in) are never kept.
// Loaded lazily so this file also runs in plain Node tests.
type Entry = { data: unknown; at: number; stale: boolean };

const MAX_ENTRIES = 80;
const MAX_BYTES = 350_000; // what is written to the device, in total
const NEVER = /\/(auth|token|login|code)\b/i;
const storageKey = (owner: string) => `bricks.cache.v1.${owner}`;

const mem = new Map<string, Entry>();
let owner: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(paths: string[]) => void>();

async function plain() {
  try {
    return (await import('@react-native-async-storage/async-storage')).default;
  } catch {
    return null;
  }
}

function notify(paths: string[]) {
  if (paths.length) listeners.forEach((l) => l(paths));
}

function schedule() {
  if (!owner || saveTimer) return;
  const who = owner;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    if (owner !== who) return;
    try {
      const entries = [...mem.entries()].filter(([k]) => !NEVER.test(k)).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_ENTRIES);
      let out = JSON.stringify(entries.map(([k, e]) => [k, e.data, e.at]));
      while (out.length > MAX_BYTES && entries.length > 1) {
        entries.pop(); // the oldest goes first
        out = JSON.stringify(entries.map(([k, e]) => [k, e.data, e.at]));
      }
      await (await plain())?.setItem(storageKey(who), out);
    } catch {
      /* the cache is a convenience: a full disk or a blocked store must never break the app */
    }
  }, 400);
}

/** Whose cache this is. Call it when the signed-in account (or the account being helped) changes; null on sign-out erases everything. */
export async function setCacheOwner(next: string | null): Promise<void> {
  if (next === owner) return;
  const previous = owner;
  owner = next;
  mem.clear();
  metas.clear();
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const store = await plain();
  if (previous && !next) await store?.removeItem(storageKey(previous)).catch(() => undefined); // signed out: nothing personal stays on the device
  if (!next) return;
  try {
    const raw = await store?.getItem(storageKey(next));
    if (raw && owner === next) {
      for (const [k, data, at] of JSON.parse(raw) as [string, unknown, number][]) mem.set(k, { data, at, stale: true }); // from disk: shown at once, then asked again
      notify([...mem.keys()]);
    }
  } catch {
    /* an unreadable cache is an empty cache */
  }
}

export function cachePeek<T>(key: string): { data: T; at: number; stale: boolean } | undefined {
  return mem.get(key) as { data: T; at: number; stale: boolean } | undefined; // the same object until the entry changes (a screen can watch it)
}

/** What is going on with one key: being asked for now, or the last ask failed. Same object until it changes. */
export type CacheMeta = { refreshing: boolean; failed: boolean };
const NO_META: CacheMeta = { refreshing: false, failed: false };
const metas = new Map<string, CacheMeta>();
export const cacheMeta = (key: string): CacheMeta => metas.get(key) ?? NO_META;
export function cacheSetMeta(key: string, patch: Partial<CacheMeta>): void {
  const cur = cacheMeta(key);
  if ((patch.refreshing === undefined || patch.refreshing === cur.refreshing) && (patch.failed === undefined || patch.failed === cur.failed)) return;
  metas.set(key, { ...cur, ...patch });
  notify([key]);
}

export function cachePut(key: string, data: unknown): void {
  mem.set(key, { data, at: Date.now(), stale: false });
  notify([key]);
  schedule();
}

/** Something changed. Topics are the first word of the API path ("calendar" is every /v1/calendar...). "*" means everything. Marked entries are asked for again by any screen showing them. */
export function cacheInvalidate(topics: string[]): void {
  const all = topics.includes('*');
  const hit: string[] = [];
  [...mem.entries()].forEach(([k, e]) => {
    if (all || topics.some((t) => k.startsWith(`/v1/${t}`))) {
      mem.set(k, { ...e, stale: true }); // a new object, so a screen watching it notices
      hit.push(k);
    }
  });
  notify(hit);
}

/** Tells a screen whenever an entry it shows is replaced or marked stale. Returns the way to stop listening. */
export function cacheSubscribe(fn: (paths: string[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const cacheOwner = () => owner;

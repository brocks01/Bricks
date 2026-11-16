import { createStore } from '../../core/store';
export type Who = 'myself' | 'family';
export const whoStore = createStore<{ who: Who | null }>({ who: null });
const KEY = 'bricks.who';
async function storage() { try { return (await import('@react-native-async-storage/async-storage')).default; } catch { return null; } }
export async function loadWho(): Promise<void> {
  try {
    const raw = await (await storage())?.getItem(KEY);
    if (!raw) return;
    const v = JSON.parse(raw) as Partial<{ who: Who | null }>;
    if (v.who === 'myself' || v.who === 'family') whoStore.set({ who: v.who });
  } catch { /* defaults stay */ }
}
export function setWho(who: Who): void {
  whoStore.set({ who });
  void storage().then((st) => st?.setItem(KEY, JSON.stringify(whoStore.get()))).catch(() => undefined);
}
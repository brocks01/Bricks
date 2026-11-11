import { createStore } from '../core/store';

// Which element is glowing because the agent is acting on it. A person's own taps never glow.
export const glowStore = createStore<{ key: string | null; caption: string }>({ key: null, caption: '' });

let timer: ReturnType<typeof setTimeout> | undefined;

export function glow(key: string, caption: string, ms = 1600): void {
  if (timer) clearTimeout(timer);
  glowStore.set({ key, caption });
  timer = setTimeout(() => glowStore.set({ key: null, caption: '' }), ms);
}

import { getWisdom } from '../../api/nodes';
import { createStore } from '../../core/store';
import { sessionStore } from '../../session/store';

// How many leaves the person's Tree of Wisdom has: one for every event they showed up to. The header's little tree and the tree page read it.
// It loads after sign-in and clears on sign-out. `null` means "not known yet" (signed out, or still loading), never "none".
export const wisdomStore = createStore<{ leaves: number | null }>({ leaves: null });

/** Ask the server again. Call it after anything that can grow or withdraw a leaf: "I'm here", "I went", a completed Wisdom session. */
export async function refreshWisdom(): Promise<void> {
  if (sessionStore.get().status !== 'in') return;
  try {
    const w = await getWisdom(1);
    if (sessionStore.get().status === 'in') wisdomStore.set({ leaves: w.leaves });
  } catch {
    /* keep the last known count: the tree page says so itself when it cannot load */
  }
}

let last = sessionStore.get().status;
sessionStore.subscribe(() => {
  const now = sessionStore.get().status;
  if (now === last) return;
  last = now;
  if (now === 'in') void refreshWisdom();
  else if (now === 'out') wisdomStore.set({ leaves: null });
});
if (last === 'in') void refreshWisdom();

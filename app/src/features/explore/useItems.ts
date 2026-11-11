import { useCallback } from 'react';
import { saveExploreItem, type ExploreItem } from '../../api/explore';

/** Flip the bookmark on an item at once in a list, and undo it if the server refuses. `update` maps over the screen's lists. */
export function useToggleSave(update: (fn: (i: ExploreItem) => ExploreItem) => void) {
  return useCallback(
    async (item: ExploreItem) => {
      const next = !item.saved;
      const set = (saved: boolean) => update((x) => (x.id === item.id ? { ...x, saved } : x));
      set(next);
      try {
        await saveExploreItem(item.id, next);
      } catch {
        set(!next);
      }
    },
    [update]
  );
}

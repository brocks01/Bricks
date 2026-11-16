import { useEffect } from 'react';
import { createStore } from '../core/store';

// A screen that has its own big microphone (language, the assistant) hides the small floating agent button while it is open, so there is only one mic on screen.
// While the agent is in a call the floating button still shows (it holds the time and the end button).
export const orbHidden = createStore<{ hide: boolean }>({ hide: false });

export function useHideOrb(): void {
  useEffect(() => {
    orbHidden.set({ hide: true });
    return () => orbHidden.set({ hide: false });
  }, []);
}

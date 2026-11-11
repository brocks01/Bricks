import { create } from 'zustand';

/** Whether Buddy is listening. The Tell me button on any screen opens it. */
export const useBuddy = create<{ listening: boolean; open: () => void; close: () => void }>()(
  (set) => ({
    listening: false,
    open: () => set({ listening: true }),
    close: () => set({ listening: false }),
  }),
);

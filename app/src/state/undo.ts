import { create } from 'zustand';

interface UndoEntry {
  /** Changes each time, so the bar restarts its timer for a new action. */
  id: number;
  message: string;
  undo: () => void;
  /** What was done, e.g. "rsvp:e_walk", so screens about it can react to Undo. */
  key?: string;
}

interface UndoState {
  current: UndoEntry | null;
  /** The last action that was undone (key + a counter so repeats are distinct). */
  lastUndone: { key: string; seq: number } | null;
  /** Show "You joined the walk. Undo" on whichever screen is in front. */
  show: (message: string, undo: () => void, key?: string) => void;
  /** Undo the current action and record that it happened. */
  runUndo: () => void;
  clear: () => void;
}

let nextId = 1;
let undoSeq = 0;

/**
 * One undo bar for the whole app (docs/02 rule 7): the latest action wins, and it
 * survives navigation, so "I'm going" → next screen still offers Undo.
 */
export const useUndo = create<UndoState>()((set, get) => ({
  current: null,
  lastUndone: null,
  show: (message, undo, key) => set({ current: { id: nextId++, message, undo, key } }),
  runUndo: () => {
    const entry = get().current;
    if (!entry) return;
    entry.undo();
    set({
      current: null,
      lastUndone: entry.key ? { key: entry.key, seq: ++undoSeq } : get().lastUndone,
    });
  },
  clear: () => set({ current: null }),
}));

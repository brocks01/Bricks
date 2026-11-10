import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  STRIDE_M,
  systemClock,
  WalkSession,
  type WalkProgress,
  type WalkSnapshot,
  type WalkUpload,
} from './engine';
import { scaledClock, SimulatedTrackSource } from './simulatedTrack';
import { pathLength } from '@/lib/geo';

/**
 * The walk being recorded right now, app-wide, so it keeps going while SOS or
 * another screen is open on top. A snapshot is saved every 30 s (and on pause);
 * if the app is closed mid-walk, Thrive offers to save it next time.
 */

const STORAGE_KEY = 'bricks.walk.unfinished';
const SAVE_EVERY_MS = 30_000;

interface ActiveWalkState {
  session: WalkSession | null;
  progress: WalkProgress | null;
  /** Developer option: replay the simulated walk faster (1× or 10×). */
  simulationSpeed: 1 | 10;
  setSimulationSpeed: (speed: 1 | 10) => void;
  start: (eventId?: string | null) => void;
  pause: () => void;
  resume: () => void;
  /** Ends the walk and returns what to upload. Keeps the snapshot until the upload succeeds. */
  finish: () => WalkUpload | null;
  discard: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setInterval> | null = null;

async function saveSnapshot(snapshot: WalkSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or unavailable: the walk still records; only crash recovery is lost.
  }
}

export const useActiveWalk = create<ActiveWalkState>()((set, get) => ({
  session: null,
  progress: null,
  simulationSpeed: 1,
  setSimulationSpeed: (simulationSpeed) => set({ simulationSpeed }),

  start: (eventId = null) => {
    if (get().session) return;
    // Iteration 1.2: simulated track. 2.2 swaps in GPS (+ the phone's step counter) here.
    const clock = scaledClock(systemClock, get().simulationSpeed);
    const session = new WalkSession({
      source: new SimulatedTrackSource(clock),
      clock,
      eventId,
      onProgress: (progress) => set({ progress }),
    });
    set({ session });
    session.start();
    saveTimer = setInterval(() => void saveSnapshot(session.snapshot()), SAVE_EVERY_MS);
  },

  pause: () => {
    const { session } = get();
    if (!session) return;
    session.pause();
    void saveSnapshot(session.snapshot());
  },

  resume: () => get().session?.resume(),

  finish: () => {
    const { session } = get();
    if (!session) return null;
    if (saveTimer) clearInterval(saveTimer);
    saveTimer = null;
    const upload = session.finish();
    void saveSnapshot(session.snapshot());
    set({ session: null, progress: null });
    return upload;
  },

  discard: async () => {
    get().session?.discard();
    if (saveTimer) clearInterval(saveTimer);
    saveTimer = null;
    set({ session: null, progress: null });
    await clearUnfinishedWalk();
  },
}));

/** A walk left unfinished by an earlier session (app closed mid-walk), if any. */
export async function loadUnfinishedWalk(): Promise<WalkSnapshot | null> {
  if (useActiveWalk.getState().session) return null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as WalkSnapshot;
    return snap.segments?.some((s) => s.length > 1) ? snap : null;
  } catch {
    return null;
  }
}

export async function clearUnfinishedWalk(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do; it will be offered again and can be discarded then.
  }
}

/** Turns a saved snapshot into an upload ("Save that walk"). */
export function uploadFromSnapshot(snap: WalkSnapshot): WalkUpload {
  const segments = snap.segments.filter((s) => s.length > 0);
  const last = segments.flat().at(-1);
  const distance = segments.reduce((sum, s) => sum + pathLength(s), 0);
  return {
    segments,
    steps: snap.steps ?? Math.round(distance / STRIDE_M),
    started_at: new Date(snap.started_at).toISOString(),
    ended_at: new Date(last?.t ?? snap.saved_at).toISOString(),
    event_id: snap.event_id,
  };
}

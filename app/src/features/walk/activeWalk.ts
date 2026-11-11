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
import { GpsTrackSource } from './gpsTrack';
import { scaledClock, SimulatedTrackSource } from './simulatedTrack';
import { StepCounter } from './stepCounter';
import i18n from '@/i18n';
import { pathLength } from '@/lib/geo';
import { platform } from '@/lib/platform';

/** Real GPS, or the simulated Bishan Park loop (indoor demos, web, tests). */
export type WalkSource = 'gps' | 'simulated';

export interface StartWalkOptions {
  eventId?: string | null;
  /** GPS only: record with the screen locked (our Android build, "all the time" allowed). */
  background?: boolean;
}

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
  /** Developer option: GPS or the simulated walk. */
  source: WalkSource;
  setSource: (source: WalkSource) => void;
  /** Developer option: replay the simulated walk faster (1× or 10×). */
  simulationSpeed: 1 | 10;
  setSimulationSpeed: (speed: 1 | 10) => void;
  /** For GPS, ask for location first (prepareWalkLocation). */
  start: (options?: StartWalkOptions) => void;
  /** Bumped when Buddy hears "stop the walk": the walk screen then asks "Finish your walk?". */
  finishAsked: number;
  askToFinish: () => void;
  pause: () => void;
  resume: () => void;
  /** Ends the walk and returns what to upload. Keeps the snapshot until the upload succeeds. */
  finish: () => WalkUpload | null;
  discard: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setInterval> | null = null;
let stepCounter: StepCounter | null = null;

function stopTimers(): void {
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = null;
  stepCounter?.stop();
  stepCounter = null;
}

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
  source: platform.canRecordGps ? 'gps' : 'simulated',
  setSource: (source) => set({ source }),
  simulationSpeed: 1,
  setSimulationSpeed: (simulationSpeed) => set({ simulationSpeed }),

  finishAsked: 0,
  askToFinish: () => set((s) => ({ finishAsked: s.finishAsked + 1 })),
  start: ({ eventId = null, background = false } = {}) => {
    if (get().session) return;
    const onProgress = (progress: WalkProgress) => set({ progress });
    let session: WalkSession;
    if (get().source === 'gps') {
      session = new WalkSession({
        source: new GpsTrackSource(background, {
          title: i18n.t('walk.serviceTitle'),
          body: i18n.t('walk.serviceBody'),
        }),
        eventId,
        onProgress,
      });
      stepCounter = new StepCounter((steps) => session.setMeasuredSteps(steps));
      void stepCounter.start();
    } else {
      const clock = scaledClock(systemClock, get().simulationSpeed);
      session = new WalkSession({
        source: new SimulatedTrackSource(clock),
        clock,
        eventId,
        onProgress,
      });
    }
    set({ session, finishAsked: 0 });
    session.start();
    saveTimer = setInterval(() => void saveSnapshot(session.snapshot()), SAVE_EVERY_MS);
  },

  pause: () => {
    const { session } = get();
    if (!session) return;
    session.pause();
    stepCounter?.pause();
    void saveSnapshot(session.snapshot());
  },

  resume: () => {
    stepCounter?.resume();
    get().session?.resume();
  },

  finish: () => {
    const { session } = get();
    if (!session) return null;
    stopTimers();
    const upload = session.finish();
    void saveSnapshot(session.snapshot());
    set({ session: null, progress: null });
    return upload;
  },

  discard: async () => {
    get().session?.discard();
    stopTimers();
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

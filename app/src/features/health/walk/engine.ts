// Walk recording engine. Ported unchanged (imports only) from the teammates' Interchange app (branch sayan, features/walk/engine.ts): distance, active time, automatic pause, steps.
import { cleanTrack, haversine, pathLength, type TrackPoint } from './geo';

/**
 * Walk recording engine (docs/04 §2.3), independent of React and of where the
 * points come from. Iteration 1.2 feeds it a simulated track; 2.2 feeds it GPS.
 *
 * - Distance: haversine along cleaned points (bad accuracy and jumps removed).
 * - Pause: points that arrive while paused are ignored, and a pause starts a new
 *   segment, so the gap is never counted as walked distance.
 * - Auto-pause: no real movement for 20 s → the clock stops (and those 20 s are
 *   taken back off), until they move again.
 * - Steps: from the phone's step counter when there is one (never below the
 *   estimate, since the counter stops in the background), else distance ÷ 0.7 m.
 */

/** Walking slower than this for AUTO_PAUSE_MS counts as stopped (0.3 m/s). */
export const AUTO_PAUSE_SPEED = 0.3;
export const AUTO_PAUSE_MS = 20_000;
/** Average stride, for estimating steps when there is no step counter. */
export const STRIDE_M = 0.7;
const TICK_MS = 1000;

export interface Clock {
  now(): number;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>),
};

/** Where location points come from (simulated track or GPS). */
export interface PointSource {
  start(onPoint: (point: TrackPoint) => void): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

/** Live numbers for the recording screen. */
export interface WalkProgress {
  /** Time shown on screen: excludes manual and automatic pauses. */
  active_s: number;
  distance_m: number;
  steps: number;
  /** Every kept point, for drawing the route so far. */
  points: TrackPoint[];
  paused: boolean;
  autoPaused: boolean;
}

/** What gets uploaded when the walk ends (POST /walks). */
export interface WalkUpload {
  segments: TrackPoint[][];
  steps: number;
  started_at: string;
  ended_at: string;
  event_id: string | null;
}

/** Saved every 30 s so a walk survives the app being closed. */
export interface WalkSnapshot {
  started_at: number;
  segments: TrackPoint[][];
  active_ms: number;
  steps: number | null;
  event_id: string | null;
  saved_at: number;
}

export interface WalkSessionOptions {
  source: PointSource;
  clock?: Clock;
  eventId?: string | null;
  onProgress?: (progress: WalkProgress) => void;
}

export class WalkSession {
  private readonly source: PointSource;
  private readonly clock: Clock;
  private readonly eventId: string | null;
  private readonly onProgress?: (progress: WalkProgress) => void;

  private readonly startedAt: number;
  private segments: TrackPoint[][] = [[]];
  private distance = 0;
  private activeMs = 0;
  private lastTick: number;
  private measuredSteps: number | null = null;
  private paused = false;
  private autoPaused = false;
  private timer: unknown = null;
  private finished = false;

  constructor({ source, clock = systemClock, eventId = null, onProgress }: WalkSessionOptions) {
    this.source = source;
    this.clock = clock;
    this.eventId = eventId;
    this.onProgress = onProgress;
    this.startedAt = clock.now();
    this.lastTick = this.startedAt;
  }

  start(): void {
    this.source.start((p) => this.addPoint(p));
    this.timer = this.clock.setInterval(() => this.tick(), TICK_MS);
    this.emit();
  }

  /** Steps since the walk started, from the phone's step counter. */
  setMeasuredSteps(steps: number): void {
    this.measuredSteps = steps;
  }

  pause(): void {
    if (this.paused || this.finished) return;
    this.tick();
    this.paused = true;
    this.source.pause();
    this.emit();
  }

  resume(): void {
    if (!this.paused || this.finished) return;
    this.paused = false;
    this.autoPaused = false;
    this.lastTick = this.clock.now();
    // A new segment, so the pause is never counted as distance.
    if (this.current().length > 0) this.segments.push([]);
    this.source.resume();
    this.emit();
  }

  finish(): WalkUpload {
    if (!this.finished) {
      this.tick();
      this.finished = true;
      this.source.stop();
      this.clock.clearInterval(this.timer);
    }
    return {
      segments: this.segments.filter((s) => s.length > 0),
      steps: this.steps(),
      started_at: new Date(this.startedAt).toISOString(),
      ended_at: new Date(this.clock.now()).toISOString(),
      event_id: this.eventId,
    };
  }

  /** Stop without saving (the member chose to discard the walk). */
  discard(): void {
    this.finished = true;
    this.source.stop();
    this.clock.clearInterval(this.timer);
  }

  snapshot(): WalkSnapshot {
    return {
      started_at: this.startedAt,
      segments: this.segments,
      active_ms: this.activeMs,
      steps: this.measuredSteps,
      event_id: this.eventId,
      saved_at: this.clock.now(),
    };
  }

  progress(): WalkProgress {
    return {
      active_s: Math.floor(this.activeMs / 1000),
      distance_m: this.distance,
      steps: this.steps(),
      points: this.segments.flat(),
      paused: this.paused,
      autoPaused: this.autoPaused,
    };
  }

  private current(): TrackPoint[] {
    return this.segments[this.segments.length - 1]!;
  }

  private steps(): number {
    const estimate = Math.round(this.distance / STRIDE_M);
    // The step counter pauses while the app is in the background (screen locked),
    // so never show fewer steps than the distance implies.
    return this.measuredSteps === null ? estimate : Math.max(this.measuredSteps, estimate);
  }

  private addPoint(point: TrackPoint): void {
    if (this.paused || this.finished) return;
    const segment = this.current();
    const last = segment[segment.length - 1];
    // Same filters as the server: a point is kept only if it passes against the last kept one.
    const kept = cleanTrack(last ? [last, point] : [point]);
    if (kept[kept.length - 1] !== point) return;
    if (last) this.distance += haversine(last, point);
    segment.push(point);
  }

  /** Moved less than walking pace over the last AUTO_PAUSE_MS? */
  private isStill(now: number): boolean {
    if (now - this.startedAt < AUTO_PAUSE_MS) return false;
    const recent = this.current().filter((p) => p.t >= now - AUTO_PAUSE_MS);
    const before = this.current()
      .filter((p) => p.t < now - AUTO_PAUSE_MS)
      .pop();
    const window = before ? [before, ...recent] : recent;
    return pathLength(window) < AUTO_PAUSE_SPEED * (AUTO_PAUSE_MS / 1000);
  }

  private tick(): void {
    if (this.finished || this.paused) return;
    const now = this.clock.now();
    const delta = now - this.lastTick;
    this.lastTick = now;

    const still = this.isStill(now);
    if (still && !this.autoPaused) {
      // They actually stopped AUTO_PAUSE_MS ago: take that time back off the clock.
      this.activeMs = Math.max(0, this.activeMs + delta - AUTO_PAUSE_MS);
      this.autoPaused = true;
    } else if (!still) {
      this.autoPaused = false;
      this.activeMs += delta;
    }
    this.emit();
  }

  private emit(): void {
    this.onProgress?.(this.progress());
  }
}

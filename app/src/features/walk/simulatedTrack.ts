import type { LatLng, TrackPoint } from '@/lib/geo';

import type { Clock, PointSource } from './engine';

/**
 * A walk around Bishan-Ang Mo Kio Park for indoor demos and tests ("simulate
 * walk", docs/04 §2.3): about 2.4 km in about 32 minutes, one point every 5 s.
 * Synthetic until the backend seed provides a recorded track (iteration 0.2 hand-off).
 */

const START: LatLng = { lat: 1.3626, lng: 103.8466 }; // Bishan Park, Gate 2
const POINT_EVERY_S = 5;
const WALK_SPEED_MPS = 1.25; // ~13 min 20 s per km, a comfortable senior pace
const LOOP_LENGTH_M = 2400;
const M_PER_DEG_LAT = 111_320;

/** Offsets (seconds from start) and positions along a gentle oval loop. */
export function bishanParkLoop(): { offset_s: number; point: LatLng }[] {
  const totalS = LOOP_LENGTH_M / WALK_SPEED_MPS;
  const count = Math.round(totalS / POINT_EVERY_S);
  // An oval whose perimeter is ~2.4 km (Ramanujan's approximation for a ≈ 1.6 b).
  const b = 290;
  const a = 1.6 * b;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((START.lat * Math.PI) / 180);
  const centre = { lat: START.lat - b / M_PER_DEG_LAT, lng: START.lng };

  return Array.from({ length: count + 1 }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI + Math.PI / 2; // start at the top (Gate 2)
    // A little natural wobble so it doesn't look drawn with a compass.
    const wobble = 1 + 0.03 * Math.sin(angle * 3);
    return {
      offset_s: i * POINT_EVERY_S,
      point: {
        lat: centre.lat + (b * wobble * Math.sin(angle)) / M_PER_DEG_LAT,
        lng: centre.lng + (a * wobble * Math.cos(angle)) / mPerDegLng,
      },
    };
  });
}

/**
 * Replays the loop as if walking it now. `speed` > 1 replays faster (developer
 * toggle); timestamps are in walk time, so the summary still reads like a real
 * 32-minute walk. Pausing freezes the replay where it is.
 */
export class SimulatedTrackSource implements PointSource {
  private readonly track = bishanParkLoop();
  private next = 0;
  private walked_ms = 0;
  private lastReal = 0;
  private running = false;
  private timer: unknown = null;
  private onPoint: ((p: TrackPoint) => void) | null = null;

  constructor(
    private readonly clock: Clock,
    private readonly speed = 1,
    /** Walk time 0 in epoch ms (the session's start). */
    private readonly startAt = clock.now(),
  ) {}

  start(onPoint: (p: TrackPoint) => void): void {
    this.onPoint = onPoint;
    this.running = true;
    this.lastReal = this.clock.now();
    this.emitDue();
    this.timer = this.clock.setInterval(() => this.advance(), 250);
  }

  pause(): void {
    this.advance();
    this.running = false;
  }

  resume(): void {
    this.lastReal = this.clock.now();
    this.running = true;
  }

  stop(): void {
    this.running = false;
    this.clock.clearInterval(this.timer);
  }

  /** True once the whole loop has been replayed. */
  get done(): boolean {
    return this.next >= this.track.length;
  }

  private advance(): void {
    if (!this.running) return;
    const now = this.clock.now();
    this.walked_ms += (now - this.lastReal) * this.speed;
    this.lastReal = now;
    this.emitDue();
  }

  private emitDue(): void {
    while (
      this.next < this.track.length &&
      this.track[this.next]!.offset_s * 1000 <= this.walked_ms
    ) {
      const { offset_s, point } = this.track[this.next]!;
      this.onPoint?.({ ...point, t: this.startAt + offset_s * 1000, accuracy: 5 });
      this.next += 1;
    }
  }
}

/**
 * A clock that runs `speed` times faster than real time from `origin`, so the
 * whole session (timer, timestamps) moves at simulation speed.
 */
export function scaledClock(base: Clock, speed: number, origin = base.now()): Clock {
  return {
    now: () => origin + (base.now() - origin) * speed,
    setInterval: (fn, ms) => base.setInterval(fn, Math.max(16, ms / speed)),
    clearInterval: (h) => base.clearInterval(h),
  };
}

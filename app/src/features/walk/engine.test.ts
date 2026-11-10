import { pathLength, type TrackPoint } from '@/lib/geo';

import { AUTO_PAUSE_MS, WalkSession, type Clock, type PointSource } from './engine';
import { bishanParkLoop, scaledClock, SimulatedTrackSource } from './simulatedTrack';

/** A clock we move by hand; intervals fire in order as time passes. */
function fakeClock(start = Date.UTC(2026, 10, 12, 0, 0)): Clock & { advance(ms: number): void } {
  let now = start;
  let nextId = 1;
  const timers = new Map<number, { fn: () => void; ms: number; due: number }>();
  return {
    now: () => now,
    setInterval(fn, ms) {
      const id = nextId++;
      timers.set(id, { fn, ms, due: now + ms });
      return id;
    },
    clearInterval(h) {
      timers.delete(h as number);
    },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers.values()].sort((a, b) => a.due - b.due)[0];
        if (!next || next.due > end) break;
        now = next.due;
        next.due += next.ms;
        next.fn();
      }
      now = end;
    },
  };
}

/** A source we feed points into by hand. */
function manualSource() {
  let emit: ((p: TrackPoint) => void) | null = null;
  const source: PointSource & { push(p: TrackPoint): void } = {
    start: (fn) => (emit = fn),
    pause: () => {},
    resume: () => {},
    stop: () => (emit = null),
    push: (p) => emit?.(p),
  };
  return source;
}

const metresNorth = (m: number) => m / 111_320;

describe('simulated Bishan Park loop', () => {
  it('is about 2.4 km and about 32 minutes', () => {
    const loop = bishanParkLoop();
    const length = pathLength(loop.map((x) => x.point));
    expect(length).toBeGreaterThan(2200);
    expect(length).toBeLessThan(2600);
    expect(loop[loop.length - 1]!.offset_s / 60).toBeCloseTo(32, 0);
  });

  it('records the whole loop: distance, steps and time match the track', () => {
    const clock = fakeClock();
    const session = new WalkSession({ source: new SimulatedTrackSource(clock), clock });
    session.start();
    clock.advance(33 * 60 * 1000);
    const upload = session.finish();
    const p = session.progress();
    expect(p.distance_m).toBeGreaterThan(2200);
    expect(p.steps).toBe(Math.round(p.distance_m / 0.7));
    // ~32 min of walking; the minute standing at the end is auto-paused off the clock.
    expect(p.active_s / 60).toBeGreaterThan(31);
    expect(p.active_s / 60).toBeLessThan(33);
    expect(upload.segments).toHaveLength(1);
    expect(upload.segments[0]!.length).toBe(bishanParkLoop().length);
  });

  it('runs at 10× with a scaled clock but keeps walk-time timestamps', () => {
    const real = fakeClock();
    const clock = scaledClock(real, 10);
    const session = new WalkSession({ source: new SimulatedTrackSource(clock), clock });
    session.start();
    real.advance(3.3 * 60 * 1000); // 3.3 real minutes = 33 walk minutes
    const upload = session.finish();
    const first = upload.segments[0]![0]!.t;
    const last = upload.segments[0]!.at(-1)!.t;
    expect((last - first) / 60_000).toBeCloseTo(32, 0);
  });
});

describe('WalkSession', () => {
  const base = { lat: 1.3626, lng: 103.8466 };

  it('auto-pauses after 20 s still, takes those seconds back, and resumes on movement', () => {
    const clock = fakeClock();
    const source = manualSource();
    const session = new WalkSession({ source, clock });
    session.start();
    // Walk 60 s north at 1.2 m/s, a point every 5 s.
    for (let s = 0; s <= 60; s += 5) {
      source.push({ ...base, lat: base.lat + metresNorth(1.2 * s), t: clock.now() });
      clock.advance(5000);
    }
    const walked = session.progress().active_s;
    // Stand still for 40 s.
    const here = { ...base, lat: base.lat + metresNorth(72) };
    for (let s = 0; s < 40; s += 5) {
      source.push({ ...here, t: clock.now() });
      clock.advance(5000);
    }
    const stopped = session.progress();
    expect(stopped.autoPaused).toBe(true);
    expect(stopped.active_s).toBeLessThanOrEqual(walked + 1);
    // Move again.
    for (let s = 5; s <= 20; s += 5) {
      source.push({ ...here, lat: here.lat + metresNorth(1.2 * s), t: clock.now() });
      clock.advance(5000);
    }
    expect(session.progress().autoPaused).toBe(false);
    expect(session.progress().active_s).toBeGreaterThan(walked);
  });

  it('ignores points while paused and never counts the gap as distance', () => {
    const clock = fakeClock();
    const source = manualSource();
    const session = new WalkSession({ source, clock });
    session.start();
    source.push({ ...base, t: clock.now() });
    clock.advance(5000);
    source.push({ ...base, lat: base.lat + metresNorth(6), t: clock.now() });
    session.pause();
    clock.advance(60_000);
    source.push({ ...base, lat: base.lat + metresNorth(500), t: clock.now() }); // ignored
    const timeBefore = session.progress().active_s;
    session.resume();
    source.push({ ...base, lat: base.lat + metresNorth(100), t: clock.now() });
    clock.advance(5000);
    source.push({ ...base, lat: base.lat + metresNorth(106), t: clock.now() });

    const upload = session.finish();
    expect(upload.segments).toHaveLength(2);
    expect(session.progress().distance_m).toBeCloseTo(12, 0);
    // The minute paused isn't on the clock.
    expect(timeBefore).toBeLessThan(10);
  });

  it('drops inaccurate readings and GPS jumps', () => {
    const clock = fakeClock();
    const source = manualSource();
    const session = new WalkSession({ source, clock });
    session.start();
    source.push({ ...base, t: clock.now(), accuracy: 5 });
    clock.advance(5000);
    source.push({ ...base, lat: base.lat + metresNorth(6), t: clock.now(), accuracy: 80 }); // poor fix
    source.push({ ...base, lat: base.lat + metresNorth(300), t: clock.now(), accuracy: 5 }); // jump
    source.push({ ...base, lat: base.lat + metresNorth(6), t: clock.now(), accuracy: 5 });
    expect(session.progress().points).toHaveLength(2);
    expect(session.progress().distance_m).toBeCloseTo(6, 0);
  });

  it('prefers the phone step counter over the estimate', () => {
    const clock = fakeClock();
    const session = new WalkSession({ source: manualSource(), clock });
    session.start();
    session.setMeasuredSteps(1234);
    expect(session.finish().steps).toBe(1234);
  });

  it('snapshots enough to save the walk later', () => {
    const clock = fakeClock();
    const source = manualSource();
    const session = new WalkSession({ source, clock, eventId: 'e1' });
    session.start();
    source.push({ ...base, t: clock.now() });
    clock.advance(AUTO_PAUSE_MS / 2);
    const snap = session.snapshot();
    expect(snap).toMatchObject({ event_id: 'e1', segments: [[expect.any(Object)]] });
    expect(snap.active_ms).toBe(AUTO_PAUSE_MS / 2);
  });
});

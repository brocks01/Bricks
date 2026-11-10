import { bishanParkLoop } from '@/features/walk/simulatedTrack';
import { decodePath, haversine, type TrackPoint } from '@/lib/geo';

import { createMockDb } from './db';
import { RAJ_HOME } from './thriveDb';
import { PRIVACY_RADIUS_M, processWalk } from './walkProcessing';

// Wednesday 11 Nov 2026, 9 am.
const NOW = new Date(2026, 10, 11, 9, 0);

const loop = (start: Date): TrackPoint[] =>
  bishanParkLoop().map(({ offset_s, point }) => ({
    ...point,
    t: start.getTime() + offset_s * 1000,
  }));

const ctx = (overrides = {}) => ({
  id: 'w_test',
  home: RAJ_HOME,
  areaName: 'Bishan',
  steps: 3300,
  startedAt: new Date(2026, 10, 11, 7, 5),
  endedAt: new Date(2026, 10, 11, 7, 37),
  walkedWith: [],
  history: [],
  ...overrides,
});

describe('walk processing (POST /walks)', () => {
  const start = new Date(2026, 10, 11, 7, 5);
  const summary = processWalk([loop(start)], ctx());

  it('measures the loop: ~2.4 km in ~32 min at ~13 min 20 s per km', () => {
    expect(summary.distance_m).toBeGreaterThan(2300);
    expect(summary.distance_m).toBeLessThan(2500);
    expect(summary.moving_s / 60).toBeCloseTo(32, 0);
    expect(summary.avg_pace_s_per_km).toBeGreaterThan(780);
    expect(summary.avg_pace_s_per_km).toBeLessThan(820);
  });

  it('splits into two full kilometres and the last part', () => {
    expect(summary.splits.map((s) => s.km)).toEqual([1, 2, 3]);
    expect(summary.splits[0]).toMatchObject({ distance_m: 1000 });
    expect(summary.splits[2]!.distance_m).toBeLessThan(1000);
  });

  it('is titled by time of day and nearest park', () => {
    expect(summary).toMatchObject({ time_of_day: 'morning', start_place_name: 'Bishan Park' });
  });

  it('hides everything within 200 m of home from the public route (WK-6)', () => {
    // A walk that starts at the front door.
    const fromHome: TrackPoint[] = Array.from({ length: 60 }, (_, i) => ({
      lat: RAJ_HOME.lat + (i * 10) / 111_320,
      lng: RAJ_HOME.lng,
      t: start.getTime() + i * 8000,
    }));
    const s = processWalk([fromHome], ctx());
    const pub = decodePath(s.route_public_polyline);
    const full = decodePath(s.route_polyline!);
    expect(full.length).toBe(60);
    expect(pub.length).toBeLessThan(full.length);
    expect(pub.every((p) => haversine(p, RAJ_HOME) > PRIVACY_RADIUS_M)).toBe(true);
  });

  it('counts paused segments separately (the gap is not distance)', () => {
    const points = loop(start);
    const a = points.slice(0, 50);
    const b = points.slice(200, 250);
    const together = processWalk([a, b], ctx());
    const joined = processWalk([[...a, ...b]], ctx());
    expect(together.distance_m).toBeLessThan(joined.distance_m);
  });

  it('praises honestly: first walk, longest this month, more than last time, steady', () => {
    expect(summary.praise).toEqual({ kind: 'first_walk' });
    const short = { distance_m: 1500, started_at: new Date(2026, 10, 10).toISOString() };
    expect(processWalk([loop(start)], ctx({ history: [short] })).praise).toEqual({
      kind: 'longest_month',
    });
    const longer = { distance_m: 3000, started_at: new Date(2026, 10, 9).toISOString() };
    const prev = { distance_m: 2000, started_at: new Date(2026, 10, 10).toISOString() };
    expect(processWalk([loop(start)], ctx({ history: [prev, longer] })).praise).toMatchObject({
      kind: 'more_than_last',
    });
    const same = { distance_m: 2400, started_at: new Date(2026, 10, 10).toISOString() };
    expect(processWalk([loop(start)], ctx({ history: [same, longer] })).praise).toEqual({
      kind: 'steady',
    });
  });
});

describe('Thrive mock backend', () => {
  let clock = NOW.getTime();
  const db = () => createMockDb(() => new Date(clock));
  beforeEach(() => {
    clock = NOW.getTime();
  });

  it('starts with a 5-day check-in streak; Yes makes it 6, No resets today', () => {
    const d = db();
    expect(d.checkinWeek().streak).toBe(5);
    expect(d.answerCheckin('yes').streak).toBe(6);
    const week = d.checkinWeek();
    expect(week.days).toHaveLength(7);
    expect(week.days.find((x) => x.date === '2026-11-11')?.answer).toBe('yes');
    expect(db().answerCheckin('no').streak).toBe(0);
  });

  it('has three weeks of walks for Raj, the last one yesterday', () => {
    const stats = db().walkStats();
    expect(stats.last_walk).toMatchObject({ start_place_name: 'Bishan Park' });
    expect(new Date(stats.last_walk!.started_at).getDate()).toBe(10);
    expect(stats.days).toHaveLength(7);
    expect(stats.walks).toBeGreaterThan(0);
  });

  it('a group walk lists who walked with you', () => {
    const d = db();
    const group = Array.from({ length: 15 }, (_, i) => `w_${i}`)
      .map((id) => {
        try {
          return d.getWalk(id);
        } catch {
          return null;
        }
      })
      .find((w) => w && w.walked_with.length > 0);
    expect(group?.walked_with.map((p) => p.name)).toEqual(['Lim Ah Kow', 'Ahmad Rahman']);
  });

  it('a new walk with an event records the people going as "walked with"', () => {
    const d = db();
    d.rsvp('e_walk_bishan');
    const start = new Date(2026, 10, 11, 7, 0);
    const pts = loop(start);
    const walk = d.uploadWalk({
      segments: [pts],
      steps: 3000,
      started_at: start.toISOString(),
      ended_at: new Date(pts.at(-1)!.t).toISOString(),
      event_id: 'e_walk_bishan',
    });
    expect(walk.walked_with.map((p) => p.name)).toEqual(['Lim Ah Kow', 'Ahmad Rahman']);
    expect(d.getWalk(walk.id).id).toBe(walk.id);
  });

  it('reminders: add, list in time order, delete', () => {
    const d = db();
    const r = d.createReminder({
      kind: 'doctor',
      text: 'Polyclinic',
      time: '10:30',
      repeat: 'once',
      date: '2026-11-11',
    });
    expect(d.listReminders().map((x) => x.time)).toEqual(['08:00', '10:30', '20:00']);
    expect(d.getToday().next_reminder).toMatchObject({ id: r.id });
    d.deleteReminder(r.id);
    expect(d.listReminders().map((x) => x.id)).not.toContain(r.id);
  });

  it('SOS: everyone is told, then Priya and Ahmad set off; resolving ends it', () => {
    const d = db();
    const alert = d.triggerSos();
    expect(alert.status).toBe('open');
    expect(alert.helpers.map((h) => h.status)).toEqual(['notified', 'notified', 'notified']);
    clock += 3000;
    expect(d.getSos(alert.id).helpers[0]).toMatchObject({
      name: 'Priya Kumar',
      status: 'on_way',
      is_family: true,
    });
    clock += 3000;
    const later = d.getSos(alert.id);
    expect(later.status).toBe('helper_coming');
    expect(later.helpers[1]).toMatchObject({
      name: 'Ahmad Rahman',
      status: 'on_way',
      distance_m: 300,
    });
    expect(later.helpers[2]).toMatchObject({ name: 'Lim Ah Kow', status: 'notified' });
    d.resolveSos(alert.id);
    expect(d.getSos(alert.id).status).toBe('resolved');
  });
});

import type {
  CheckinWeek,
  NewReminder,
  PersonSummary,
  Reminder,
  SafeCircleMember,
  SosAlert,
  WalkListItem,
  WalkPeriod,
  WalkStats,
  WalkSummary,
} from '@/api/types';
import { bishanParkLoop } from '@/features/walk/simulatedTrack';
import type { WalkUpload } from '@/features/walk/engine';
import type { LatLng, TrackPoint } from '@/lib/geo';

import { processWalk } from './walkProcessing';

/**
 * Thrive and Safety part of the mock backend: check-ins, reminders, walks
 * (three weeks of history for Raj, two of them group walks) and SOS fan-out.
 */

/** Raj's home: Block 123, Bishan Street 12. Used for the walk privacy zone. */
export const RAJ_HOME: LatLng = { lat: 1.3489, lng: 103.8512 };
const AREA = 'Bishan';

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Monday of the week containing `d`, at midnight. */
function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** The demo loop, cut to `fraction` of its length and replayed from `start`. */
function loopWalk(start: Date, fraction: number): TrackPoint[] {
  const loop = bishanParkLoop();
  const count = Math.max(2, Math.round(loop.length * fraction));
  return loop.slice(0, count).map(({ offset_s, point }) => ({
    ...point,
    t: start.getTime() + offset_s * 1000,
    accuracy: 5,
  }));
}

export interface ThriveDeps {
  now: () => Date;
  person: (id: string) => PersonSummary;
  /** People going to an event, for "Walked with" (excluding the walker). */
  attendees: (eventId: string) => PersonSummary[];
  /** Who to tell in an SOS, in order (set at onboarding, S6). */
  safeCircle: () => SafeCircleMember[];
}

export function createThriveDb({ now, person, attendees, safeCircle }: ThriveDeps) {
  let nextId = 1;
  const today = () => isoDate(now());

  /* ---------- Check-ins ---------- */
  const checkins = new Map<string, 'yes' | 'no'>();
  // A 5-day streak up to yesterday.
  for (let i = 1; i <= 5; i++) checkins.set(isoDate(addDays(now(), -i)), 'yes');

  function streak(): number {
    let n = 0;
    // Today counts only once answered; the streak runs back from there.
    let day = checkins.has(today()) ? now() : addDays(now(), -1);
    while (checkins.get(isoDate(day)) === 'yes') {
      n += 1;
      day = addDays(day, -1);
    }
    return n;
  }

  /* ---------- Reminders ---------- */
  const reminders = new Map<string, Reminder & { doneOn: string | null }>();
  // Reminders family set for their parent: they ring on the parent's phone, not here.
  const forFamily = new Map<string, Reminder>();
  const addReminder = (
    { for_senior_id, ...r }: NewReminder,
    created_by: Reminder['created_by'] = 'self',
  ) => {
    const id = `r_${nextId++}`;
    if (for_senior_id) {
      forFamily.set(id, { ...r, id, done_today: false, created_by: 'family' });
      return id;
    }
    reminders.set(id, { ...r, id, done_today: false, created_by, doneOn: null });
    return id;
  };
  addReminder({
    kind: 'medicine',
    text: 'Take medicine',
    time: '08:00',
    repeat: 'daily',
    date: null,
  });
  addReminder({
    kind: 'medicine',
    text: 'Blood pressure tablet',
    time: '20:00',
    repeat: 'daily',
    date: null,
  });

  const toReminder = (r: Reminder & { doneOn: string | null }): Reminder => {
    const { doneOn, ...rest } = r;
    return { ...rest, done_today: doneOn === today() };
  };
  const isToday = (r: Reminder) => {
    const d = now();
    if (r.repeat === 'once') return r.date === today();
    if (r.repeat === 'weekdays') return d.getDay() >= 1 && d.getDay() <= 5;
    return true;
  };

  /* ---------- Walks ---------- */
  const walks: WalkSummary[] = [];
  // Three weeks of morning walks; two of them were group walks with Lim and Ahmad.
  const SEED: { daysAgo: number; fraction: number; group?: boolean }[] = [
    { daysAgo: 20, fraction: 0.6 },
    { daysAgo: 18, fraction: 0.75 },
    { daysAgo: 16, fraction: 0.7, group: true },
    { daysAgo: 13, fraction: 0.8 },
    { daysAgo: 11, fraction: 0.65 },
    { daysAgo: 9, fraction: 0.85, group: true },
    { daysAgo: 6, fraction: 0.7 },
    { daysAgo: 4, fraction: 0.9 },
    { daysAgo: 2, fraction: 0.75 },
    { daysAgo: 1, fraction: 1 },
  ];
  for (const s of SEED) {
    const start = addDays(now(), -s.daysAgo);
    start.setHours(7, 5, 0, 0);
    const points = loopWalk(start, s.fraction);
    const end = new Date(points[points.length - 1]!.t);
    const history = walks.slice().reverse();
    walks.push(
      processWalk([points], {
        id: `w_${nextId++}`,
        home: RAJ_HOME,
        areaName: AREA,
        steps: Math.round((2400 * s.fraction) / 0.72),
        startedAt: start,
        endedAt: end,
        walkedWith: s.group ? [person('u_lim'), person('u_ahmad')] : [],
        history,
      }),
    );
  }

  const listItem = (w: WalkSummary): WalkListItem => ({
    id: w.id,
    time_of_day: w.time_of_day,
    start_place_name: w.start_place_name,
    started_at: w.started_at,
    distance_m: w.distance_m,
    moving_s: w.moving_s,
    steps: w.steps,
    route_public_polyline: w.route_public_polyline,
  });

  /* ---------- SOS ---------- */
  const alerts = new Map<string, { created: number; resolved: boolean }>();
  // The demo story: the first person sets off after 3 s, the second after 6 s,
  // the rest have been told. Neighbours we know show how far away they are.
  const SETS_OFF_AFTER_MS = [3000, 6000];
  const DISTANCE_M: Record<string, number> = { u_ahmad: 300, u_lim: 650 };

  return {
    /* Check-ins */
    checkinPending: () => !checkins.has(today()),
    answerCheckin(answer: 'yes' | 'no') {
      checkins.set(today(), answer);
      return streak();
    },
    checkinWeek(): CheckinWeek {
      const monday = weekStart(now());
      return {
        streak: streak(),
        days: Array.from({ length: 7 }, (_, i) => {
          const date = isoDate(addDays(monday, i));
          return { date, answer: checkins.get(date) ?? 'none' };
        }),
      };
    },

    /* Reminders */
    listReminders(): Reminder[] {
      return [...reminders.values()]
        .filter((r) => r.repeat !== 'once' || (r.date ?? '') >= today())
        .sort((a, b) => a.time.localeCompare(b.time))
        .map(toReminder);
    },
    createReminder(input: NewReminder): Reminder {
      const id = addReminder(input);
      const own = reminders.get(id);
      return own ? toReminder(own) : forFamily.get(id)!;
    },
    deleteReminder(id: string): void {
      reminders.delete(id);
      forFamily.delete(id);
    },
    completeReminder(id: string): void {
      const r = reminders.get(id);
      if (r) r.doneOn = today();
    },
    /** For Today: the next reminder not yet done, upcoming first. */
    nextReminder(): Reminder | null {
      const nowHm = `${String(now().getHours()).padStart(2, '0')}:${String(now().getMinutes()).padStart(2, '0')}`;
      const due = this.listReminders().filter((r) => isToday(r) && !r.done_today);
      return due.find((r) => r.time >= nowHm) ?? due[0] ?? null;
    },

    /* Walks */
    uploadWalk(upload: WalkUpload): WalkSummary {
      const summary = processWalk(upload.segments, {
        id: `w_${nextId++}`,
        home: RAJ_HOME,
        areaName: AREA,
        steps: upload.steps,
        startedAt: new Date(upload.started_at),
        endedAt: new Date(upload.ended_at),
        walkedWith: upload.event_id ? attendees(upload.event_id) : [],
        history: walks.slice().reverse(),
      });
      walks.push(summary);
      return summary;
    },
    getWalk(id: string): WalkSummary | null {
      return walks.find((w) => w.id === id) ?? null;
    },
    walkStats(period: WalkPeriod = 'week'): WalkStats {
      const monday = weekStart(now());
      const weeks = period === 'week' ? 1 : 4;
      const start = addDays(monday, -7 * (weeks - 1));
      const before = addDays(start, -7 * weeks);
      const day = (w: WalkSummary) => isoDate(new Date(w.started_at));
      const current = walks.filter((w) => day(w) >= isoDate(start));
      const previous = walks.filter((w) => day(w) >= isoDate(before) && day(w) < isoDate(start));
      const sum = (list: WalkSummary[], key: 'distance_m' | 'moving_s') =>
        list.reduce((total, w) => total + w[key], 0);
      const buckets =
        period === 'week'
          ? Array.from({ length: 7 }, (_, i) => [addDays(monday, i), addDays(monday, i + 1)])
          : Array.from({ length: weeks }, (_, i) => [
              addDays(start, 7 * i),
              addDays(start, 7 * (i + 1)),
            ]);
      const stepsByDay = new Map<string, number>();
      for (const w of walks) stepsByDay.set(day(w), (stepsByDay.get(day(w)) ?? 0) + w.steps);
      const longest = walks.reduce<WalkSummary | null>(
        (best, w) => (!best || w.distance_m > best.distance_m ? w : best),
        null,
      );
      const monthStart = isoDate(new Date(now().getFullYear(), now().getMonth(), 1));
      const last = walks[walks.length - 1];
      return {
        period,
        distance_m: sum(current, 'distance_m'),
        walks: current.length,
        moving_s: sum(current, 'moving_s'),
        days: buckets.map(([from, to]) => ({
          date: isoDate(from!),
          distance_m: sum(
            walks.filter((w) => day(w) >= isoDate(from!) && day(w) < isoDate(to!)),
            'distance_m',
          ),
        })),
        previous_distance_m: sum(previous, 'distance_m'),
        bests: {
          longest_m: longest?.distance_m ?? 0,
          longest_walk_id: longest?.id ?? null,
          most_steps_day: Math.max(0, ...stepsByDay.values()),
          walks_this_month: walks.filter((w) => day(w) >= monthStart).length,
        },
        items: current.slice().reverse().map(listItem),
        last_walk: last ? listItem(last) : null,
      };
    },

    /* SOS */
    triggerSos(): SosAlert {
      const id = `s_${nextId++}`;
      alerts.set(id, { created: now().getTime(), resolved: false });
      return this.getSos(id)!;
    },
    getSos(id: string): SosAlert | null {
      const alert = alerts.get(id);
      if (!alert) return null;
      const elapsed = now().getTime() - alert.created;
      const helpers = safeCircle().map((h, i) => {
        const after = SETS_OFF_AFTER_MS[i];
        return {
          id: h.id,
          name: h.name,
          is_family: h.is_family,
          distance_m: h.is_family ? null : (DISTANCE_M[h.id] ?? null),
          status:
            after !== undefined && elapsed >= after ? ('on_way' as const) : ('notified' as const),
        };
      });
      return {
        id,
        status: alert.resolved
          ? 'resolved'
          : helpers.some((h) => h.status === 'on_way')
            ? 'helper_coming'
            : 'open',
        created_at: new Date(alert.created).toISOString(),
        helpers,
      };
    },
    /** The newest alert still going in the last 2 hours (like GET /sos/active). */
    activeSos(): SosAlert | null {
      const cutoff = now().getTime() - 2 * 60 * 60 * 1000;
      const open = [...alerts.entries()]
        .filter(([, a]) => !a.resolved && a.created > cutoff)
        .sort(([, a], [, b]) => b.created - a.created);
      return open[0] ? this.getSos(open[0][0]) : null;
    },
    resolveSos(id: string): void {
      const alert = alerts.get(id);
      if (alert) alert.resolved = true;
    },
  };
}

import type { PersonSummary, WalkPraise, WalkSummary } from '@/api/types';
import { cleanTrack, encodePath, haversine, type LatLng, type TrackPoint } from '@/lib/geo';

/**
 * What the backend does on POST /walks (docs/03 §6 "Walk processing"), so the
 * mock server returns exactly what the real one will:
 * 1. clean points → distance + moving time; 2. splits per km and average pace;
 * 3. home privacy zone; 4. title from time of day + nearest place;
 * 5. walked-with; 6. a friendly, template-based encouragement (no LLM).
 */

/** Points this close to home are cut from anything others can see (WK-6). */
export const PRIVACY_RADIUS_M = 200;
/** Slower than this between two points counts as standing still. */
const MOVING_SPEED_MPS = 0.3;
/** Gaps longer than this (lost signal) don't count as moving time. */
const MAX_GAP_S = 30;

const PLACES: { name: string; lat: number; lng: number }[] = [
  { name: 'Bishan Park', lat: 1.3626, lng: 103.8466 },
  { name: 'Bishan-Ang Mo Kio Park', lat: 1.3644, lng: 103.8433 },
  { name: 'Toa Payoh Town Park', lat: 1.3336, lng: 103.8476 },
  { name: 'Bishan Community Club', lat: 1.3505, lng: 103.8486 },
  { name: 'Toa Payoh Central', lat: 1.3326, lng: 103.8486 },
];

function nearestPlace(p: LatLng, fallback: string): string {
  let best = { name: fallback, d: 1500 };
  for (const place of PLACES) {
    const d = haversine(p, place);
    if (d < best.d) best = { name: place.name, d };
  }
  return best.name;
}

function timeOfDay(date: Date): WalkSummary['time_of_day'] {
  const h = date.getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

export interface ProcessContext {
  id: string;
  home: LatLng;
  areaName: string;
  steps: number;
  startedAt: Date;
  endedAt: Date;
  walkedWith: PersonSummary[];
  /** Earlier walks, newest first, for the encouragement line. */
  history: { distance_m: number; started_at: string }[];
}

/** A processed walk before it's stored (whose it is and the cheers come from the store). */
export type ProcessedWalk = Omit<
  WalkSummary,
  'owner' | 'visibility' | 'cheers' | 'cheered_by_me' | 'can_cheer'
>;

export function processWalk(segments: TrackPoint[][], ctx: ProcessContext): ProcessedWalk {
  const clean = segments.map((s) => cleanTrack(s)).filter((s) => s.length > 0);

  let distance = 0;
  let moving = 0;
  const splits: WalkSummary['splits'] = [];
  let kmDistance = 0;
  let kmTime = 0;

  for (const seg of clean) {
    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1]!;
      const b = seg[i]!;
      const d = haversine(a, b);
      const dt = (b.t - a.t) / 1000;
      const isMoving = dt > 0 && dt <= MAX_GAP_S && d / dt >= MOVING_SPEED_MPS;
      distance += d;
      if (!isMoving) continue;
      moving += dt;

      // Splits: share this step between the km it finishes and the next.
      let remainingD = d;
      let remainingT = dt;
      while (kmDistance + remainingD >= 1000) {
        const need = 1000 - kmDistance;
        const share = need / remainingD;
        kmTime += remainingT * share;
        splits.push({ km: splits.length + 1, distance_m: 1000, pace_s: Math.round(kmTime) });
        remainingD -= need;
        remainingT -= remainingT * share;
        kmDistance = 0;
        kmTime = 0;
      }
      kmDistance += remainingD;
      kmTime += remainingT;
    }
  }
  // The last part-km, if it's long enough to mean something.
  if (kmDistance >= 100) {
    splits.push({
      km: splits.length + 1,
      distance_m: Math.round(kmDistance),
      pace_s: Math.round((kmTime / kmDistance) * 1000),
    });
  }

  const all = clean.flat();
  const outsideHome = all.filter((p) => haversine(p, ctx.home) > PRIVACY_RADIUS_M);
  const first = all[0];

  return {
    id: ctx.id,
    time_of_day: timeOfDay(ctx.startedAt),
    start_place_name: first ? nearestPlace(first, ctx.areaName) : ctx.areaName,
    started_at: ctx.startedAt.toISOString(),
    ended_at: ctx.endedAt.toISOString(),
    distance_m: Math.round(distance),
    duration_s: Math.round((ctx.endedAt.getTime() - ctx.startedAt.getTime()) / 1000),
    moving_s: Math.round(moving),
    steps: ctx.steps,
    avg_pace_s_per_km: distance > 0 ? Math.round(moving / (distance / 1000)) : 0,
    splits,
    route_polyline: encodePath(all),
    route_public_polyline: encodePath(outsideHome),
    walked_with: ctx.walkedWith,
    praise: praiseFor(distance, ctx),
  };
}

function praiseFor(distance: number, ctx: ProcessContext): WalkPraise {
  if (ctx.history.length === 0) return { kind: 'first_walk' };
  const monthStart = new Date(ctx.startedAt.getFullYear(), ctx.startedAt.getMonth(), 1).getTime();
  const thisMonth = ctx.history.filter((w) => new Date(w.started_at).getTime() >= monthStart);
  if (thisMonth.length > 0 && thisMonth.every((w) => distance > w.distance_m)) {
    return { kind: 'longest_month' };
  }
  const last = ctx.history[0]!;
  const extra = distance - last.distance_m;
  if (extra >= 100) return { kind: 'more_than_last', extra_m: Math.round(extra) };
  return { kind: 'steady' };
}

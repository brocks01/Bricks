// Walk geometry: distances and the filters that keep a GPS track honest.
// Ported from the teammates' Interchange app (branch sayan, lib/geo.ts); the encoded-polyline helpers were left out because we do not store routes.

export interface LatLng {
  lat: number;
  lng: number;
}

/** One GPS reading. `t` is milliseconds since the epoch. */
export interface TrackPoint extends LatLng {
  t: number;
  /** Horizontal accuracy in metres, when the device reports it. */
  accuracy?: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length of a path, in metres. */
export function pathLength(points: readonly LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1]!, points[i]!);
  return total;
}

/** Readings worse than this are ignored. */
export const MAX_ACCURACY_M = 30;
/** Faster than this between two readings is a GPS jump, not walking (50 m in 5 s). */
export const MAX_SPEED_MPS = 10;

/** Drops inaccurate readings and impossible jumps, keeping the walk's true shape. Each point is compared with the last point we kept. */
export function cleanTrack(points: readonly TrackPoint[]): TrackPoint[] {
  const kept: TrackPoint[] = [];
  for (const p of points) {
    if (p.accuracy !== undefined && p.accuracy > MAX_ACCURACY_M) continue;
    const last = kept[kept.length - 1];
    if (last) {
      const seconds = (p.t - last.t) / 1000;
      if (seconds <= 0) continue;
      if (haversine(last, p) / seconds > MAX_SPEED_MPS) continue;
    }
    kept.push(p);
  }
  return kept;
}

/** Reading speeds offered (expo-speech rates). "Normal" is already slow and clear. */
export const SPEEDS = [
  { key: 'slowest', rate: 0.6 },
  { key: 'slow', rate: 0.75 },
  { key: 'normal', rate: 0.85 },
  { key: 'quick', rate: 1 },
] as const;

/** The offered speed nearest to the current rate ("Slower" can land in between). */
export function nearestSpeed(rate: number) {
  return SPEEDS.reduce((best, s) =>
    Math.abs(s.rate - rate) < Math.abs(best.rate - rate) ? s : best,
  );
}

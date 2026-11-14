// Small formatters for the Health pages: plain words and numbers, nothing medical.
export const clock = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(r)}` : `${two(m)}:${two(r)}`;
};

/** 2400 -> "2.40" (kilometres, two decimals). Short walks stay readable. */
export const km = (metres: number): string => (metres / 1000).toFixed(2);

/** Seconds per kilometre -> { m, s } for "12:30 per km". */
export const paceParts = (secPerKm: number): { m: number; s: string } => ({ m: Math.floor(secPerKm / 60), s: String(Math.round(secPerKm % 60)).padStart(2, '0') });

export const minutes = (seconds: number): number => Math.round(seconds / 60);

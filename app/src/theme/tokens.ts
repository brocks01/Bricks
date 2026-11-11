// Design tokens, taken from the UI samples: white cards on a soft background, one strong green, large readable text.
export const colors = {
  bg: '#F6F7F4',
  card: '#FFFFFF',
  ink: '#16202A',
  muted: '#5B6773',
  line: '#E3E8E4',
  accent: '#1B7F3B', // the green of the logo, buttons and progress bars
  accentDark: '#136B2E',
  accentSoft: '#E6F4EA',
  accentLine: '#BFE0C7',
  danger: '#E5372E',
  warn: '#8A5A00',
  warnSoft: '#FDF1D6',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const type = {
  h1: { fontSize: 24, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 17, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
};

export const radius = { card: 18, pill: 999, button: 14 };

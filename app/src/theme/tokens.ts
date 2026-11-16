// Design tokens: white cards on a soft background, the brand's deep green and amber (from the logo: the elder and the younger person), large readable text.
export const colors = {
  bg: '#F7F4EE', // warm paper
  card: '#FFFFFF',
  ink: '#111827',
  muted: '#4A5361',
  line: '#E2DACB', // warm hairline
  accent: '#17684A', // the brand's deep green: the main button (white text on it passes contrast)
  accentDark: '#0F4D37',
  accentSoft: '#E3F1EA',
  accentLine: '#B9D9C8',
  navy: '#1B2B44', // header mark, profile circle, dark buttons
  navySoft: '#E9EDF4',
  gold: '#F2A31B', // the brand's amber: highlights and rings
  leaf: '#17684A', // progress bars and the selected tab
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

// Soft tile backgrounds for pictures-without-pictures (a symbol on a tinted square). One place, so no screen types a colour.
export const tints = { green: '#E3F1E7', lilac: '#E8E6F8', lime: '#E6F4E1', sand: '#FBEFD9', sky: '#E4EEF8' };

// Sizes that more than one screen needs, named once: icons, the smallest thing a finger can hit, pictures, bars.
export const size = {
  icon: { sm: 18, md: 22, lg: 28, xl: 40 },
  touch: 48, // never smaller than this for something to tap
  thumb: 56,
  avatar: 44,
  bar: 10, // thickness of a progress bar
  chart: 72, // height of a small bar chart
};

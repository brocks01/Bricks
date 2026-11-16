// Design tokens: white cards on a soft background, terracotta and deep navy from the design, warm paper, large readable text.
export const colors = {
  bg: '#FAF7F2', // warm paper
  card: '#FFFFFF',
  ink: '#111827',
  muted: '#5A6472',
  line: '#E6DFD4', // warm hairline
  accent: '#B85028', // warm terracotta / rust CTA from mockup
  accentDark: '#8F3B1A',
  accentSoft: '#FAECE5',
  accentLine: '#E8BEB0',
  navy: '#1B2B44', // header mark, dark buttons, profile circle
  navySoft: '#EAEFF5',
  gold: '#D97706', // warm amber
  leaf: '#B85028', // active tab color and primary indicators
  bone: '#EAE5DB', // loading skeletons
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

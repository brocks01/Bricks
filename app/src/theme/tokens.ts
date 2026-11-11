/**
 * Design tokens: the ONLY place in the app with raw colours, sizes and timings.
 * Source of truth: docs/02_DESIGN_PRINCIPLES.md §5. Change both together.
 *
 * Seniors first: "minimal" means fewer things on screen, never small or grey text.
 *
 * Look: Luma-style (2026-11 redesign). Ink-black actions on white, soft grey panels
 * instead of borders, pill buttons, a floating tab bar. Light mode only for now: every
 * colour lives here, so a dark palette can be added later in one place.
 */

export const color = {
  bg: '#FFFFFF',
  /** Grey panels (cards, grouped lists, secondary buttons): Luma's soft grey. */
  bgSubtle: '#F2F2F5',
  border: '#E3E3E8',
  /** Stronger border for controls (outline buttons, inputs) so their edges are easy to see. */
  borderStrong: '#5F6368',
  text: '#111111',
  /** Never use anything lighter than this for text. */
  textSecondary: '#3C4043',
  textOnColor: '#FFFFFF',
  /** The single accent: ink black, as in Luma. Buttons, links, active tab, routes. */
  primary: '#111111',
  primaryPressed: '#3A3A3C',
  primarySubtle: '#E9E9EE',
  /** Only for "done" / "going" / completed days. */
  success: '#1E7B34',
  successPressed: '#165C27',
  /** Only for the Help button and emergency screens. */
  sos: '#C62828',
  sosPressed: '#9E1F1F',
  noticeText: '#8A5A00',
  noticeBg: '#FFF4DC',
  /** Missed days and inactive states: neutral, never red. */
  neutral: '#D5D8DD',
  /** Tint behind "done" / "going" status messages. */
  successSubtle: '#E6F2E9',
  /** Dims the screen behind bottom sheets so the sheet is the only thing in focus. */
  scrim: 'rgba(17, 17, 17, 0.6)',
  /** The undo bar: dark so it stands apart from the white screen without a shadow. */
  snackbar: '#111111',
} as const;

export type ColorToken = keyof typeof color;

export type FontWeightToken = 'regular' | 'semibold' | 'bold';

export interface TypeStyle {
  readonly size: number;
  readonly weight: FontWeightToken;
}

/** Type scale (pt). Body text is never below 20. */
export const typeScale = {
  stat: { size: 40, weight: 'bold' },
  display: { size: 34, weight: 'bold' },
  title: { size: 28, weight: 'bold' },
  heading: { size: 24, weight: 'semibold' },
  button: { size: 22, weight: 'semibold' },
  body: { size: 20, weight: 'regular' },
  bodyStrong: { size: 20, weight: 'semibold' },
  /** Absolute minimum, rare (timestamps, tab labels). */
  caption: { size: 18, weight: 'regular' },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

/** Line height multiplier. ≥ 1.4 per the design system; Tamil needs the room. */
export const lineHeightRatio = 1.4;

export const radius = {
  /** Cards, grouped lists, sheets' inner panels. */
  card: 20,
  /** Pills: every button, chip and the tab bar. */
  button: 999,
  /** Photo thumbnails and icon squares. */
  tile: 14,
  /** Bottom sheets float as rounded panels. */
  sheet: 28,
  avatar: 999,
} as const;

/** Spacing scale: 4 · 8 · 16 · 20 · 24 · 32 · 48. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const screenPadding = space.md;

export const touch = {
  /** Minimum size of anything tappable. */
  min: 64,
  /** Primary / walk controls. */
  large: 72,
  /** Emergency call button. */
  sos: 80,
  /** Minimum gap between tappable things. */
  gap: 16,
} as const;

export const borderWidth = {
  hairline: 1,
  control: 2,
} as const;

export const iconSize = {
  inline: 28,
  button: 32,
  hero: 40,
  /** The single big tick on success screens. */
  celebrate: 96,
} as const;

/** The one shadow, for things that float over content (tab bar, sheets, Buddy). */
export const shadow = {
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
} as const;

/** 150–200 ms fades and slides only. No bounce, no confetti. */
export const motion = {
  fast: 150,
  base: 200,
} as const;

/**
 * Text may grow with the system font setting up to this multiple.
 * We design and test at 200%; beyond that layouts are not guaranteed.
 */
export const maxFontScale = 2;

/** Fixed controls (top bar, tab bar) grow less so they never push content off screen. */
export const maxChromeFontScale = 1.4;

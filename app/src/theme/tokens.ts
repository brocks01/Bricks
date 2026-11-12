/**
 * Design tokens: the ONLY place in the app with raw colours, sizes and timings.
 * Source of truth: docs/02_DESIGN_PRINCIPLES.md §5. Change both together.
 *
 * Seniors first: "minimal" means fewer things on screen, never small or grey text.
 */

export const color = {
  /** Raised surfaces: cards, grouped lists, sheets' rows, inputs, secondary buttons. */
  bg: '#FFFFFF',
  /** The page behind everything (Luma's pale grey): white cards float on it. */
  canvas: '#F3F3F6',
  /** Soft grey panels (cards, grouped lists, secondary buttons). */
  bgSubtle: '#F2F2F5',
  border: '#E3E3E8',
  /** Stronger border for controls (outline buttons, inputs) so their edges are easy to see. */
  borderStrong: '#5F6368',
  text: '#111111',
  /** Never use anything lighter than this for text. */
  textSecondary: '#3C4043',
  textOnColor: '#FFFFFF',
  /** The single accent, ink black (Luma-style): buttons, links, active tab, routes, charts. */
  primary: '#111111',
  primaryPressed: '#3A3A3C',
  /** Grey pills: secondary buttons, the selected tab, chips. */
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
  /** Status badges over photos and after titles (StatusBadge). */
  badgeGoingBg: '#DDF3E2',
  badgeGoingText: '#14632A',
  badgeHostingBg: '#EEE5FB',
  badgeHostingText: '#5B2A9E',
  badgeFullBg: '#E9E9EE',
  badgeFullText: '#3C4043',
  /** Confirmation toast: a green pill at the top. */
  toastBg: '#1E7B34',
} as const;

export type ColorToken = keyof typeof color;

/**
 * Category art: a soft tile with the category icon in a deep shade, used where an
 * event or Circle has no photo, and to tint the event page (Luma's cover colour).
 * Keys match the API's event categories.
 */
export const categoryColor = {
  walk: { bg: '#DCEFE3', fg: '#1E6B3A' },
  exercise: { bg: '#E3E9FB', fg: '#2F4FA8' },
  class: { bg: '#FDEBD3', fg: '#8A4500' },
  games: { bg: '#EEE5FB', fg: '#5B2A9E' },
  music: { bg: '#FBE3EC', fg: '#A3264F' },
  cooking: { bg: '#FDE6DA', fg: '#A13A12' },
  gardening: { bg: '#E4F2D9', fg: '#3F6B14' },
  kids: { bg: '#FFF1C9', fg: '#6E5100' },
  meetup: { bg: '#DFF1F5', fg: '#136271' },
  other: { bg: '#ECECF0', fg: '#3C4043' },
} as const;

export type CategoryColorKey = keyof typeof categoryColor;

/**
 * Each part of the app has its own soft colour (warm yellow Home, teal Community,
 * lilac Activity, green Health, blue Settings): a wash at the top of its pages and
 * the selected tab's pill, so members always know where they are. Text on these is
 * contrast-tested like the category tints (same values).
 */
export const sectionColor = {
  home: categoryColor.kids,
  community: categoryColor.meetup,
  activity: categoryColor.games,
  health: categoryColor.walk,
  settings: categoryColor.exercise,
} as const;

export type SectionColorKey = keyof typeof sectionColor;

/**
 * Poster art: a bold diagonal gradient per category with a big white icon, used
 * where an event has no photo (Luma's covers are vivid photos and posters).
 * Decorative only: no text is ever drawn on it.
 */
export const posterColor: Record<CategoryColorKey, { from: string; to: string }> = {
  walk: { from: '#3DD68C', to: '#0B7A4B' },
  exercise: { from: '#6E9BFF', to: '#2A3DB5' },
  class: { from: '#FFB561', to: '#D45A0B' },
  games: { from: '#B993FF', to: '#6430D1' },
  music: { from: '#FF85B0', to: '#C0185A' },
  cooking: { from: '#FF9A6B', to: '#CF3D16' },
  gardening: { from: '#A6DC63', to: '#3B861C' },
  kids: { from: '#FFD95A', to: '#EE8A0A' },
  meetup: { from: '#55D6E4', to: '#117C98' },
  other: { from: '#A3ABBA', to: '#4A5262' },
};

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
  card: 24,
  /** Every button is a pill. */
  button: 999,
  /** Icon tiles, photos in rows. */
  tile: 14,
  /** Bottom sheets float as rounded panels. */
  sheet: 28,
  avatar: 999,
} as const;

/**
 * Soft shadows (Luma). `floating` for things above the page (tab bar, sheets,
 * toasts, covers); `card` lifts white cards off the grey page; `control` for
 * white buttons and chips so their edges read clearly.
 */
export const shadow = {
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  control: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
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
  /**
   * Tap size with Small and Normal text (the member's choice): still above the
   * iOS (44) and Android (48) minimums, but in proportion to the smaller words.
   */
  compact: 56,
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

/**
 * The member's text size (asked in onboarding, changeable in Settings). It multiplies
 * the type scale on top of the phone's own font setting. Large is the full scale
 * (body 20pt); Normal, the default, is still generous (body 18pt); Small fits the
 * most on one screen (body 16pt).
 */
export const textSizeScale = {
  small: 0.8,
  normal: 0.9,
  large: 1,
} as const;

export type TextSize = keyof typeof textSizeScale;

export const TEXT_SIZES = ['small', 'normal', 'large'] as const satisfies readonly TextSize[];

export const DEFAULT_TEXT_SIZE: TextSize = 'normal';

export function isTextSize(value: unknown): value is TextSize {
  return typeof value === 'string' && value in textSizeScale;
}

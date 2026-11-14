/**
 * Design tokens: the ONLY place in the app with raw colours, sizes and timings.
 * Source of truth: docs/02_DESIGN_PRINCIPLES.md §5. Change both together.
 *
 * Seniors first: "minimal" means fewer things on screen, never small or grey text.
 */

export const color = {
  /** Raised surfaces: cards, grouped lists, sheets' rows, inputs, secondary buttons. */
  bg: '#FFFFFF',
  /** The page behind everything (a light olive stone): white cards stand out on it. */
  canvas: '#DFE2D0',
  /**
   * The olive wash at the top of every main page, fading into `canvas`. Only titles and
   * buttons sit on its darkest part; grey text there stays above the 4.5:1 floor
   * (theme/tokens.test.ts), and is 7:1 on `canvas`.
   */
  pageWash: '#C8CEA8',
  /** Soft grey panels (cards, grouped lists, secondary buttons). */
  bgSubtle: '#F2F2F5',
  border: '#E3E3E8',
  /**
   * The thin edge on white cards and secondary buttons (an olive-tinted line, not grey),
   * so they read on the olive page without heavy shadows.
   */
  hairline: 'rgba(46, 52, 24, 0.10)',
  /** The fixed controls (Read it out, Back, a title's button): frosted white over the wash. */
  chrome: 'rgba(255, 255, 255, 0.72)',
  chromePressed: 'rgba(255, 255, 255, 0.95)',
  /** The selected tab's pill: one light olive on every tab. */
  selected: '#E2E6CF',
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
 * Names for the parts of the app (Home, Community, Activity, Health, Settings), used
 * by `Screen`'s `section` prop. Every section now shares the one olive wash and the
 * one selected-tab colour; these soft tints stay for contrast tests and future use.
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
  card: 20,
  /** Every button is a pill. */
  button: 999,
  /** Icon tiles, photos in rows. */
  tile: 14,
  /** Bottom sheets float as rounded panels. */
  sheet: 28,
  avatar: 999,
} as const;

/** Shadows are tinted with the page's olive (a black shadow on olive looks muddy). */
const SHADOW_INK = '#2E3418';

/**
 * Soft shadows. `floating` for things above the page (tab bar, sheets, toasts,
 * covers); `card` lifts white cards off the page together with their hairline
 * edge (`surface`); `control` is barely there, for white buttons and chips.
 * Solid buttons (black, green, red) have no shadow.
 */
export const shadow = {
  floating: {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  card: {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  control: {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const;

/**
 * A white card's edge and lift, shared by every card-like surface. The 1pt edge
 * comes out of the card's padding (`padding - surface.borderWidth`), so the words
 * inside keep the same width and wrap exactly as before.
 */
export const surface = {
  borderWidth: 1,
  borderColor: color.hairline,
  ...shadow.card,
} as const;

/**
 * Tighter letter spacing for big Latin headings and numbers (Inter is set for
 * body sizes; large sizes look loose without it). Tamil and Chinese keep 0.
 */
export const tracking = {
  stat: -1,
  display: -0.8,
  title: -0.6,
  heading: -0.3,
  /** The tab bar's labels, a touch tighter so "Community" fits its quarter. */
  tab: -0.3,
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

/*
 * Size scales for everything else on screen. A new page picks the nearest step from
 * these; it never types its own number (lint: design-system/no-raw-sizes). Add a step
 * here only when none fits, so every page keeps drawing from the same few sizes.
 */

/** The rounded square behind an icon (a "well"): list rows up to empty states. */
export const iconWell = {
  xs: 36,
  sm: 40,
  md: 44,
  lg: 56,
  xl: 64,
  hero: 80,
} as const;

/** Covers, photos and category art: a list row up to a page's preview. */
export const coverSize = {
  sm: 64,
  md: 88,
  lg: 96,
  xl: 104,
  xxl: 128,
  hero: 160,
} as const;

/** Faces. The Avatar component takes exactly these. */
export const avatarSize = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
} as const;

/** Route thumbnails in lists and cards. */
export const thumbSize = {
  sm: 48,
  md: 56,
  lg: 72,
} as const;

/** Map heights (the compact text sizes shrink them further). */
export const mapHeight = {
  xs: 180,
  sm: 200,
  md: 220,
  lg: 240,
  xl: 360,
} as const;

/** The narrowest a column gets before its row wraps or stacks. */
export const columnWidth = {
  time: 60,
  timeWide: 64,
  label: 72,
  title: 140,
  half: 160,
  card: 180,
} as const;

/** Line weights: routes, the ring round map dots, route thumbnails. */
export const stroke = {
  ring: 2,
  thumb: 3,
  route: 6,
} as const;

/** Bars and waves in charts and voice notes. */
export const chart = {
  height: 72,
  heightCompact: 44,
  stub: 8,
  maxBar: 32,
  splitBar: 20,
  wave: 32,
  waveBar: 3,
} as const;

/** One-off pieces that still need a single home. */
export const layout = {
  /** The selected tab's pill. */
  tabPill: 64,
  /** The join QR code on an organisation's page. */
  qrCode: 260,
  /** Simple Mode's big buttons never get shorter than this. */
  simpleButtonMin: 112,
  /** A scrolling list inside a bottom sheet. */
  sheetListMax: 260,
  /** How far faces overlap in a row of people. */
  avatarOverlap: 12,
  /** The space round a route inside its thumbnail. */
  thumbInset: 6,
} as const;

/** The web's stand-in maps draw in an SVG box of these units (not screen points). */
export const svgMap = {
  view: 1000,
  pad: 60,
  padPins: 80,
  route: 14,
} as const;

/** The welcome screen's tilted category tiles (positions are artwork, kept here too). */
export const welcomeCollage = {
  height: 240,
  tiles: [
    { category: 'walk', size: 104, left: '2%', top: 18, turn: '-8deg' },
    { category: 'cooking', size: 88, left: '30%', top: 0, turn: '6deg' },
    { category: 'music', size: 96, left: '58%', top: 24, turn: '-4deg' },
    { category: 'games', size: 80, left: '80%', top: 2, turn: '10deg' },
    { category: 'gardening', size: 92, left: '16%', top: 120, turn: '5deg' },
    { category: 'exercise', size: 100, left: '44%', top: 112, turn: '-7deg' },
    { category: 'kids', size: 84, left: '74%', top: 126, turn: '7deg' },
  ],
} as const satisfies {
  height: number;
  tiles: readonly {
    category: CategoryColorKey;
    size: number;
    left: `${number}%`;
    top: number;
    turn: string;
  }[];
};

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

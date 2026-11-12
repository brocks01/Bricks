import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { DEFAULT_LANGUAGE, type Language } from '@/i18n/languages';

import { iconSize, maxFontScale, touch } from './tokens';

interface TypographyContextValue {
  /** Picks the font family (Tamil, Latin or system CJK). */
  language: Language;
  /** False if font files failed to load: we then fall back to system fonts. */
  fontsLoaded: boolean;
  /**
   * Extra text scale on top of the phone's font setting. 1 everywhere in the app;
   * the dev gallery sets 2 to preview "200% font" without changing phone settings.
   */
  fontScale: number;
}

const TypographyContext = createContext<TypographyContextValue>({
  language: DEFAULT_LANGUAGE,
  fontsLoaded: false,
  fontScale: 1,
});

export function TypographyProvider({
  language,
  fontsLoaded,
  fontScale = 1,
  children,
}: Omit<TypographyContextValue, 'fontScale'> & { fontScale?: number; children: ReactNode }) {
  const value = useMemo(
    () => ({ language, fontsLoaded, fontScale }),
    [language, fontsLoaded, fontScale],
  );
  return <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>;
}

export function useTypography(): TypographyContextValue {
  return useContext(TypographyContext);
}

/**
 * True when the member chose Small or Normal text (a scale below 1). Layouts then
 * tighten their gaps and padding so most screens fit on one phone screen. Tap
 * targets never shrink below touch.min. Large keeps the roomy layout.
 */
export function useCompact(): boolean {
  return useTypography().fontScale < 1;
}

export interface TouchSizes {
  /** Smallest tap target (buttons, chips, rows). */
  min: number;
  /** Primary and walk controls. */
  large: number;
  /** Icon inside a button. */
  icon: number;
}

const FULL_TOUCH: TouchSizes = { min: touch.min, large: touch.large, icon: iconSize.button };
const COMPACT_TOUCH: TouchSizes = {
  min: touch.compact,
  large: touch.compact,
  icon: iconSize.inline,
};

/** Tap sizes for the member's text size: 56dp with Small and Normal, 64/72dp with Large. */
export function useTouchSizes(): TouchSizes {
  return useCompact() ? COMPACT_TOUCH : FULL_TOUCH;
}

/**
 * How big text actually is right now: the phone's font setting (capped at 200%)
 * times any preview override. Components use it to switch layouts, e.g. stacking
 * Yes / No buttons when text gets large.
 */
export function useEffectiveFontScale(): number {
  const { fontScale: systemScale } = useWindowDimensions();
  const { fontScale: override } = useTypography();
  return Math.min(systemScale, maxFontScale) * override;
}

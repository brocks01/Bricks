// Import each weight from its own folder: the package index pulls in all 18
// weights and italics (~11 MB), and we only ship the three we use.
import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans/600SemiBold';
import { NotoSans_700Bold } from '@expo-google-fonts/noto-sans/700Bold';
import { NotoSansTamil_400Regular } from '@expo-google-fonts/noto-sans-tamil/400Regular';
import { NotoSansTamil_600SemiBold } from '@expo-google-fonts/noto-sans-tamil/600SemiBold';
import { NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil/700Bold';
import type { TextStyle } from 'react-native';

import type { Language } from '@/i18n/languages';

import type { FontWeightToken } from './tokens';

/**
 * Fonts loaded at startup (behind the splash screen).
 *
 * Mandarin deliberately uses the system font: Noto Sans SC is ~96 MB across weights,
 * far too heavy for over-the-air updates. Android's system CJK font is already
 * Noto Sans CJK, and iOS uses PingFang SC, so it reads the same.
 */
export const fontAssets = {
  NotoSans_400Regular,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
  NotoSansTamil_400Regular,
  NotoSansTamil_600SemiBold,
  NotoSansTamil_700Bold,
};

type LoadedFamily = keyof typeof fontAssets;

const LATIN: Record<FontWeightToken, LoadedFamily> = {
  regular: 'NotoSans_400Regular',
  semibold: 'NotoSans_600SemiBold',
  bold: 'NotoSans_700Bold',
};

const TAMIL: Record<FontWeightToken, LoadedFamily> = {
  regular: 'NotoSansTamil_400Regular',
  semibold: 'NotoSansTamil_600SemiBold',
  bold: 'NotoSansTamil_700Bold',
};

const NUMERIC_WEIGHT: Record<FontWeightToken, NonNullable<TextStyle['fontWeight']>> = {
  regular: '400',
  semibold: '600',
  bold: '700',
};

/**
 * Font style for a language + weight.
 * Loaded families carry their own weight, so fontWeight is left unset for them
 * (setting it as well makes Android synthesise a faux bold).
 * If fonts failed to load we fall back to the system font with a numeric weight.
 */
export function fontStyleFor(
  language: Language,
  weight: FontWeightToken,
  fontsLoaded = true,
): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (language === 'zh' || !fontsLoaded) {
    return { fontWeight: NUMERIC_WEIGHT[weight] };
  }
  const table = language === 'ta' ? TAMIL : LATIN;
  return { fontFamily: table[weight] };
}

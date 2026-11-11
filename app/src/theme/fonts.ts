// Import each weight from its own folder: the package index pulls in all 18
// weights and italics (~11 MB), and we only ship the three we use.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSansTamil_400Regular } from '@expo-google-fonts/noto-sans-tamil/400Regular';
import { NotoSansTamil_600SemiBold } from '@expo-google-fonts/noto-sans-tamil/600SemiBold';
import { NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil/700Bold';
import type { TextStyle } from 'react-native';

import type { Language } from '@/i18n/languages';

import type { FontWeightToken } from './tokens';

/**
 * Fonts loaded at startup (behind the splash screen).
 *
 * English and Malay use Inter: a clean, open face close to the iPhone's own font
 * (the look of the Luma references), with large, clear numbers. Tamil keeps
 * Noto Sans Tamil, since Inter has no Tamil letters.
 *
 * Mandarin deliberately uses the system font: Noto Sans SC is ~96 MB across weights,
 * far too heavy for over-the-air updates. Android's system CJK font is already
 * Noto Sans CJK, and iOS uses PingFang SC, so it reads the same.
 */
export const fontAssets = {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  NotoSansTamil_400Regular,
  NotoSansTamil_600SemiBold,
  NotoSansTamil_700Bold,
};

type LoadedFamily = keyof typeof fontAssets;

const LATIN: Record<FontWeightToken, LoadedFamily> = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
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

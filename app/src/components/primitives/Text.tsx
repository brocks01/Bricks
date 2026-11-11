import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import {
  color as colors,
  fontStyleFor,
  lineHeightRatio,
  maxFontScale,
  typeScale,
  type ColorToken,
  type FontWeightToken,
  type TypeVariant,
} from '@/theme';
import type { Language } from '@/i18n/languages';
import { useTypography } from '@/theme/TypographyProvider';

export interface TextProps extends RNTextProps {
  /** Type scale step from the design system. Defaults to body (20pt). */
  variant?: TypeVariant;
  /** Override the variant's weight (never below regular). */
  weight?: FontWeightToken;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
  /** Text in a language other than the app's (the language picker): picks its font. */
  lang?: Language;
}

const HEADER_VARIANTS: readonly TypeVariant[] = ['display', 'title', 'heading'];

/**
 * The only text component screens use. It applies the type scale, the right font
 * for the active language (Tamil, Latin, system CJK) and a generous line height.
 * Text wraps instead of truncating: Tamil strings are long.
 */
export function Text({
  variant = 'body',
  weight,
  color = 'text',
  align,
  style,
  maxFontSizeMultiplier = maxFontScale,
  accessibilityRole,
  lang,
  ...rest
}: TextProps) {
  const { language: appLanguage, fontsLoaded, fontScale } = useTypography();
  const language = lang ?? appLanguage;
  const scale = typeScale[variant];
  const size = scale.size * fontScale;

  return (
    <RNText
      accessibilityRole={
        accessibilityRole ?? (HEADER_VARIANTS.includes(variant) ? 'header' : undefined)
      }
      // A preview scale counts towards the cap, so the total never exceeds it.
      maxFontSizeMultiplier={Math.max(1, maxFontSizeMultiplier / fontScale)}
      style={[
        styles.base,
        {
          fontSize: size,
          lineHeight: Math.round(size * lineHeightRatio),
          color: colors[color],
          textAlign: align,
        },
        fontStyleFor(language, weight ?? scale.weight, fontsLoaded),
        style,
      ]}
      // `ref` is a normal prop in React 19 and arrives through `rest`.
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    // Android adds extra top padding for accents by default, which misaligns icons.
    includeFontPadding: false,
  },
});

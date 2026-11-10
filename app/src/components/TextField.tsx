import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import {
  borderWidth,
  color,
  fontStyleFor,
  lineHeightRatio,
  maxFontScale,
  radius,
  space,
  touch,
  typeScale,
} from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { Text } from './primitives/Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Always visible above the box (never a placeholder-only label). */
  label: string;
  /** Plain-words problem shown under the box. */
  error?: string | null;
  hint?: string;
}

/**
 * A 64dp text box with its label always visible above it, 20pt text and a
 * thick border that turns blue while typing. Typing is always optional in
 * our flows: every field has a tap or voice alternative.
 */
export function TextField({ label, error, hint, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { language, fontsLoaded, fontScale } = useTypography();
  const [focused, setFocused] = useState(false);
  const size = typeScale.body.size * fontScale;

  return (
    <View style={styles.wrap}>
      <Text variant="bodyStrong">{label}</Text>
      {hint ? <Text color="textSecondary">{hint}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={color.textSecondary}
        maxFontSizeMultiplier={Math.max(1, maxFontScale / fontScale)}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { fontSize: size, lineHeight: Math.round(size * lineHeightRatio) },
          fontStyleFor(language, 'regular', fontsLoaded),
          focused && styles.focused,
          error ? styles.invalid : null,
        ]}
        {...rest}
      />
      {error ? (
        <Text color="noticeText" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.xs,
  },
  input: {
    minHeight: touch.min,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.button,
    borderWidth: borderWidth.control,
    borderColor: color.borderStrong,
    backgroundColor: color.bg,
    color: color.text,
  },
  focused: {
    borderColor: color.primary,
  },
  invalid: {
    borderColor: color.noticeText,
  },
});

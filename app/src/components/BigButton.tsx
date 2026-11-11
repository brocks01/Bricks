import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import {
  borderWidth,
  color,
  iconSize,
  radius,
  space,
  touch,
  type ColorToken,
  type TypeVariant,
} from '@/theme';

import type { Language } from '@/i18n/languages';

import { Text } from './primitives/Text';
import type { Icon } from './primitives/icons';

export type BigButtonVariant = 'primary' | 'success' | 'outline' | 'sos';
export type BigButtonSize = 'md' | 'lg' | 'xl';

export interface BigButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  icon?: Icon;
  variant?: BigButtonVariant;
  /** md 64dp (default) · lg 72dp (walk / primary) · xl 80dp (emergency call). */
  size?: BigButtonSize;
  /** Label text size. Defaults to the button step (22pt). */
  labelVariant?: TypeVariant;
  /** Cap on system font growth, for fixed controls. */
  maxFontSizeMultiplier?: number;
  fullWidth?: boolean;
  /** The label's language when it isn't the app's (language buttons). */
  labelLanguage?: Language;
}

const MIN_HEIGHT: Record<BigButtonSize, number> = {
  md: touch.min,
  lg: touch.large,
  xl: touch.sos,
};

const PALETTE: Record<
  BigButtonVariant,
  { bg: ColorToken; pressed: ColorToken; text: ColorToken; border: ColorToken }
> = {
  primary: { bg: 'primary', pressed: 'primaryPressed', text: 'textOnColor', border: 'primary' },
  success: { bg: 'success', pressed: 'successPressed', text: 'textOnColor', border: 'success' },
  // Secondary actions: a grey pill (Luma). Its dark label carries the meaning.
  outline: { bg: 'primarySubtle', pressed: 'neutral', text: 'text', border: 'primarySubtle' },
  sos: { bg: 'sos', pressed: 'sosPressed', text: 'textOnColor', border: 'sos' },
};

/**
 * The main button: a big pill with icon + word, full width by default. Black for the
 * main action, grey for the rest, green for done, red only for emergencies.
 * Labels wrap rather than truncate, and the button grows with them.
 */
export function BigButton({
  label,
  icon: IconComponent,
  variant = 'primary',
  size = 'md',
  labelVariant = 'button',
  maxFontSizeMultiplier,
  fullWidth = true,
  labelLanguage,
  disabled,
  onPress,
  accessibilityLabel,
  ...rest
}: BigButtonProps) {
  const palette = PALETTE[variant];
  const textColor: ColorToken = disabled ? 'textSecondary' : palette.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={(event) => {
        tapFeedback();
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: MIN_HEIGHT[size],
          backgroundColor: color[disabled ? 'bgSubtle' : pressed ? palette.pressed : palette.bg],
          borderColor: color[disabled ? 'border' : palette.border],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {IconComponent ? (
          <IconComponent size={iconSize.button} color={color[textColor]} weight="bold" />
        ) : null}
        <Text
          variant={labelVariant}
          color={textColor}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          lang={labelLanguage}
          style={styles.label}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    borderWidth: borderWidth.control,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  label: {
    flexShrink: 1,
  },
});

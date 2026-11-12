import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import {
  borderWidth,
  color,
  radius,
  shadow,
  space,
  touch,
  type ColorToken,
  type TypeVariant,
} from '@/theme';

import type { Language } from '@/i18n/languages';
import { useCompact, useTouchSizes } from '@/theme/TypographyProvider';

import { Text } from './primitives/Text';
import type { Icon } from './primitives/icons';

export type BigButtonVariant = 'primary' | 'success' | 'outline' | 'chrome' | 'sos';
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
  // Secondary actions: a white pill with a thin edge. Its dark label carries the meaning.
  outline: { bg: 'bg', pressed: 'primarySubtle', text: 'text', border: 'hairline' },
  // The fixed controls and a title's button: frosted white, lighter than the content.
  chrome: { bg: 'chrome', pressed: 'chromePressed', text: 'text', border: 'hairline' },
  sos: { bg: 'sos', pressed: 'sosPressed', text: 'textOnColor', border: 'sos' },
};

/**
 * The main button: a big pill with icon + word, full width by default. Black for the
 * main action, white for the rest, frosted for the fixed controls, green for done,
 * red only for emergencies. Solid buttons are flat; white ones have a thin edge.
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
  const compact = useCompact();
  const tap = useTouchSizes();
  // Small and Normal text: md and lg are 56dp (the SOS call keeps its 80dp).
  const minHeight = size === 'xl' ? MIN_HEIGHT.xl : size === 'lg' ? tap.large : tap.min;
  const textColor: ColorToken = disabled ? 'textSecondary' : palette.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...rest.accessibilityState, disabled: !!disabled }}
      disabled={disabled}
      onPress={(event) => {
        tapFeedback();
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight,
          backgroundColor: color[disabled ? 'bgSubtle' : pressed ? palette.pressed : palette.bg],
          borderColor: color[disabled ? 'border' : palette.border],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        compact && styles.compact,
        !disabled && variant === 'outline' && styles.raised,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {IconComponent ? (
          <IconComponent size={tap.icon} color={color[textColor]} weight="bold" />
        ) : null}
        <Text
          variant={labelVariant}
          color={textColor}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          lang={labelLanguage}
          align="center"
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
    borderWidth: borderWidth.hairline,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    justifyContent: 'center',
  },
  compact: {
    paddingHorizontal: space.sm,
  },
  raised: {
    ...shadow.control,
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

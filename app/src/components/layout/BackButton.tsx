import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, iconSize, maxChromeFontScale, radius, space, touch } from '@/theme';
import { useTouchSizes } from '@/theme/TypographyProvider';

import { CaretLeftIcon } from '../primitives/icons';
import { Text } from '../primitives/Text';

/**
 * "‹ Back" as a frosted pill (like Read it out) on its own row above the title (Luma's round back button,
 * with the word kept: never icon-only).
 * Keeping it off the top bar means Read it out and Help never move between screens.
 */
export function BackButton({ onPress }: { onPress?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const label = t('common.back');
  const tap = useTouchSizes();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={space.xs}
      testID="screen-back"
      onPress={() => {
        tapFeedback();
        if (onPress) onPress();
        else if (router.canGoBack()) router.back();
        else router.replace('/home');
      }}
      style={({ pressed }) => [styles.base, { minHeight: tap.min }, pressed && styles.pressed]}
    >
      <CaretLeftIcon size={iconSize.inline} color={color.text} weight="bold" />
      <Text variant="bodyStrong" color="text" maxFontSizeMultiplier={maxChromeFontScale}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: touch.min,
    paddingLeft: space.sm,
    paddingRight: space.md,
    gap: space.xxs,
    borderRadius: radius.button,
    borderWidth: borderWidth.hairline,
    borderColor: color.hairline,
    backgroundColor: color.chrome,
  },
  pressed: {
    backgroundColor: color.chromePressed,
  },
});

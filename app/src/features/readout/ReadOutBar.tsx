import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

// Direct imports (not '@/components'): <Screen> renders this bar.
import {
  ArrowCounterClockwiseIcon,
  HourglassIcon,
  PauseIcon,
  PlayIcon,
  type Icon,
} from '@/components/primitives/icons';
import { Text } from '@/components/primitives/Text';
import { tapFeedback } from '@/lib/haptics';
import {
  borderWidth,
  color,
  iconSize,
  maxChromeFontScale,
  radius,
  screenPadding,
  space,
  touch,
} from '@/theme';

import { useReadOut } from './ReadOutProvider';

/**
 * S37: a slim bar at the bottom while a screen is being read (Apple Spoken
 * Content). Pause / Carry on · Repeat · Slower. Stop stays on the Read it out
 * button at the top, in the same place as always.
 */
export function ReadOutBar() {
  const { t } = useTranslation();
  const { status, pause, resume, repeat, slower, canGoSlower } = useReadOut();
  if (status === 'idle') return null;
  const paused = status === 'paused';

  return (
    <View style={styles.bar} testID="readout-bar" accessibilityLabel={t('readOutBar.label')}>
      <BarButton
        icon={paused ? PlayIcon : PauseIcon}
        label={paused ? t('readOutBar.resume') : t('common.pause')}
        onPress={paused ? resume : pause}
        testID="readout-pause"
      />
      <BarButton
        icon={ArrowCounterClockwiseIcon}
        label={t('readOutBar.repeat')}
        onPress={repeat}
        testID="readout-repeat"
      />
      <BarButton
        icon={HourglassIcon}
        label={t('readOutBar.slower')}
        onPress={slower}
        disabled={!canGoSlower}
        testID="readout-slower"
      />
    </View>
  );
}

function BarButton({
  icon: IconComponent,
  label,
  onPress,
  disabled = false,
  testID,
}: {
  icon: Icon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}) {
  const fg = disabled ? color.textSecondary : color.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <IconComponent size={iconSize.inline} color={fg} weight="bold" />
      <Text
        variant="caption"
        weight="bold"
        color={disabled ? 'textSecondary' : 'primary'}
        align="center"
        maxFontSizeMultiplier={maxChromeFontScale}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: space.xs,
    paddingHorizontal: screenPadding,
    paddingVertical: space.xs,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: color.border,
    backgroundColor: color.primarySubtle,
  },
  button: {
    flex: 1,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    paddingVertical: space.xxs,
    borderRadius: radius.button,
    borderWidth: borderWidth.control,
    borderColor: color.primary,
    backgroundColor: color.bg,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
  },
});

import { StyleSheet, View } from 'react-native';

import { color, iconSize, radius, space, type ColorToken } from '@/theme';

import { CheckCircleIcon, InfoIcon, WarningCircleIcon, type Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export type StatusTone = 'info' | 'success' | 'notice' | 'celebrate';

const TONES: Record<
  StatusTone,
  { icon: Icon; iconColor: ColorToken; bg: ColorToken; text: ColorToken }
> = {
  info: { icon: InfoIcon, iconColor: 'primary', bg: 'primarySubtle', text: 'text' },
  success: { icon: CheckCircleIcon, iconColor: 'success', bg: 'successSubtle', text: 'text' },
  notice: { icon: WarningCircleIcon, iconColor: 'noticeText', bg: 'noticeBg', text: 'noticeText' },
  // Praise (Luma's green toast, as a panel): white on solid green.
  celebrate: {
    icon: CheckCircleIcon,
    iconColor: 'textOnColor',
    bg: 'toastBg',
    text: 'textOnColor',
  },
};

/**
 * A status in plain words with an icon, never colour alone: "Priya is on her way",
 * "Waiting for Dad to say yes". Changes are announced to screen readers.
 * There is no red tone on purpose: red belongs only to SOS.
 */
export function StatusBanner({
  text,
  tone = 'info',
  testID,
}: {
  text: string;
  tone?: StatusTone;
  testID?: string;
}) {
  const { icon: IconComponent, iconColor, bg, text: textColor } = TONES[tone];

  return (
    <View
      style={[styles.banner, { backgroundColor: color[bg] }]}
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={text}
      testID={testID}
    >
      <IconComponent size={iconSize.button} color={color[iconColor]} weight="fill" />
      <Text variant="bodyStrong" color={textColor} style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.card,
  },
  text: {
    flex: 1,
  },
});

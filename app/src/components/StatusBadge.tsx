import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { color, maxChromeFontScale, radius, space, type ColorToken } from '@/theme';

import { Text } from './primitives/Text';

export type BadgeKind = 'going' | 'hosting' | 'full' | 'new';

const LOOK: Record<BadgeKind, { bg: ColorToken; text: ColorToken }> = {
  going: { bg: 'badgeGoingBg', text: 'badgeGoingText' },
  hosting: { bg: 'badgeHostingBg', text: 'badgeHostingText' },
  full: { bg: 'badgeFullBg', text: 'badgeFullText' },
  new: { bg: 'primary', text: 'textOnColor' },
};

/**
 * A small coloured label over a photo or after a title (Luma): Going, Hosting,
 * Full, New. Colour is never the only signal: the word is always there.
 */
export function StatusBadge({ kind, testID }: { kind: BadgeKind; testID?: string }) {
  const { t } = useTranslation();
  const look = LOOK[kind];
  return (
    <View style={[styles.badge, { backgroundColor: color[look.bg] }]} testID={testID}>
      <Text
        variant="caption"
        weight="bold"
        color={look.text}
        maxFontSizeMultiplier={maxChromeFontScale}
      >
        {t(`badge.${kind}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.button,
    paddingHorizontal: space.xs,
    paddingVertical: space.xxs,
  },
});

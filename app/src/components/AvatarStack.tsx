import { StyleSheet, View } from 'react-native';

import { avatarSize, borderWidth, color, maxChromeFontScale, radius, space } from '@/theme';

import { Avatar } from './Avatar';
import { Text } from './primitives/Text';

export interface AvatarStackProps {
  people: { id: string; name: string; photo_url: string | null }[];
  /** Everyone going, including people not shown: "+12". */
  total?: number;
  max?: number;
}

/**
 * Overlapping faces plus "+12" (Luma). Decorative: the count is always written
 * in words next to it ("14 going"), so screen readers skip it.
 */
export function AvatarStack({ people, total = people.length, max = 4 }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const more = Math.max(0, total - shown.length);
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {shown.map((p, i) => (
        <View key={p.id} style={[styles.ring, i > 0 && styles.overlap]}>
          <Avatar name={p.name} photoUrl={p.photo_url} size={SIZE} />
        </View>
      ))}
      {more > 0 ? (
        <View style={[styles.ring, styles.overlap, styles.more]}>
          <Text variant="bodyStrong" maxFontSizeMultiplier={maxChromeFontScale}>
            {`+${more}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const SIZE = avatarSize.md;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ring: {
    borderRadius: radius.avatar,
    borderWidth: borderWidth.control,
    borderColor: color.bg,
  },
  overlap: {
    marginLeft: -space.sm,
  },
  more: {
    minWidth: SIZE + borderWidth.control * 2,
    height: SIZE + borderWidth.control * 2,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primarySubtle,
  },
});

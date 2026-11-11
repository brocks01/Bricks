import { StyleSheet, View } from 'react-native';

import { color, iconSize, radius, space } from '@/theme';

import type { Icon } from './primitives/icons';
import { Text } from './primitives/Text';

/**
 * A label that isn't a button ("Ask me about: Chess"). Flat and grey with no
 * border, so it never looks tappable next to Chips.
 */
export function Tag({ label, icon: IconComponent }: { label: string; icon?: Icon }) {
  return (
    <View style={styles.tag}>
      {IconComponent ? (
        <IconComponent size={iconSize.inline} color={color.textSecondary} weight="regular" />
      ) : null}
      <Text>{label}</Text>
    </View>
  );
}

export function TagRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.button,
    backgroundColor: color.bgSubtle,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
});

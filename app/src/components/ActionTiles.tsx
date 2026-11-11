import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { color, iconSize, radius, space, touch, type ColorToken } from '@/theme';

import type { Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface ActionTile {
  label: string;
  icon: Icon;
  onPress: () => void;
  /** The one main action: black. Others are white tiles. */
  primary?: boolean;
  testID?: string;
}

/** From this system font size up, tiles stack so long labels never squeeze. */
const STACK_AT_FONT_SCALE = 1.5;

/**
 * A row of equal tiles with an icon over a word (Luma's Register / Contact / More).
 * Every tile always has a word; at large font sizes they stack full width.
 */
export function ActionTiles({ tiles }: { tiles: ActionTile[] }) {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= STACK_AT_FONT_SCALE;
  return (
    <View style={[styles.row, stacked && styles.stacked]}>
      {tiles.map(({ label, icon: IconComponent, onPress, primary, testID }) => {
        const fg: ColorToken = primary ? 'textOnColor' : 'text';
        return (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            testID={testID}
            onPress={() => {
              tapFeedback();
              onPress();
            }}
            style={({ pressed }) => [
              styles.tile,
              stacked && styles.tileStacked,
              {
                backgroundColor: primary
                  ? color[pressed ? 'primaryPressed' : 'primary']
                  : color[pressed ? 'primarySubtle' : 'bg'],
              },
            ]}
          >
            <IconComponent size={iconSize.inline} color={color[fg]} weight="bold" />
            <Text variant="bodyStrong" color={fg} align="center" style={styles.label}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.xs,
  },
  stacked: {
    flexDirection: 'column',
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    minHeight: touch.large + space.sm,
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
    borderRadius: radius.tile,
  },
  tileStacked: {
    flex: 0,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: touch.min,
  },
  label: {
    flexShrink: 1,
  },
});

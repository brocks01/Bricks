import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, iconSize, radius, space, touch } from '@/theme';

import type { Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface TileProps {
  icon: Icon;
  label: string;
  onPress: () => void;
  testID?: string;
}

/**
 * A large shortcut tile: icon above a word (Grab home). Used two per row through
 * <TileGrid>. The tile grows taller instead of cutting text at large font sizes.
 */
export function Tile({ icon: IconComponent, label, onPress, testID }: TileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.iconWell}>
        <IconComponent size={iconSize.hero} color={color.primary} weight="bold" />
      </View>
      <Text variant="bodyStrong" align="center">
        {label}
      </Text>
    </Pressable>
  );
}

/** Lays tiles out two per row with even gaps; an odd last tile keeps its half width. */
export function TileGrid({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((item, cell) => (
            <View key={cell} style={styles.cell}>
              {item}
            </View>
          ))}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const ICON_WELL = 64;

const styles = StyleSheet.create({
  grid: {
    gap: touch.gap,
  },
  row: {
    flexDirection: 'row',
    gap: touch.gap,
  },
  cell: {
    flex: 1,
  },
  tile: {
    flex: 1,
    minHeight: touch.min * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    borderColor: color.border,
    backgroundColor: color.bg,
  },
  pressed: {
    backgroundColor: color.bgSubtle,
    borderColor: color.primary,
  },
  iconWell: {
    width: ICON_WELL,
    height: ICON_WELL,
    borderRadius: radius.button,
    backgroundColor: color.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

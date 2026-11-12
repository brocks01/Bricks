import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, iconSize, radius, space, surface, touch } from '@/theme';
import { useCompact } from '@/theme/TypographyProvider';

import { CheckCircleIcon, type Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface TileProps {
  icon: Icon;
  label: string;
  onPress: () => void;
  /** For multiple-choice steps (interests): a tick and a blue outline when chosen. */
  selected?: boolean;
  testID?: string;
}

/**
 * A large shortcut tile: icon above a word (Grab home). Used two per row through
 * <TileGrid>. The tile grows taller instead of cutting text at large font sizes.
 */
export function Tile({ icon: IconComponent, label, onPress, selected, testID }: TileProps) {
  const compact = useCompact();
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'checkbox'}
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.tile,
        compact && styles.tileCompact,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      {selected ? (
        <View style={styles.tick}>
          <CheckCircleIcon size={iconSize.inline} color={color.primary} weight="fill" />
        </View>
      ) : null}
      <View style={[styles.iconWell, compact && styles.iconWellCompact]}>
        <IconComponent
          size={compact ? iconSize.inline : iconSize.hero}
          color={color.primary}
          weight="bold"
        />
      </View>
      <Text variant="bodyStrong" align={compact ? 'left' : 'center'} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Lays tiles out two per row with even gaps; an odd last tile keeps its half width. */
export function TileGrid({ children }: { children: ReactNode }) {
  const compact = useCompact();
  const items = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={[styles.grid, compact && styles.gridCompact]}>
      {rows.map((row, index) => (
        <View key={index} style={[styles.row, compact && styles.gridCompact]}>
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
const ICON_WELL_COMPACT = 40;

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
    backgroundColor: color.bg,
    ...surface,
  },
  // Small and Normal text: icon beside the word, so a step's choices fit on one screen.
  tileCompact: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    minHeight: touch.compact,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs + space.xxs,
  },
  gridCompact: {
    gap: space.xs + space.xxs,
  },
  iconWellCompact: {
    width: ICON_WELL_COMPACT,
    height: ICON_WELL_COMPACT,
  },
  label: {
    flexShrink: 1,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
    borderColor: color.primary,
  },
  selected: {
    borderWidth: borderWidth.control,
    borderColor: color.primary,
    backgroundColor: color.primarySubtle,
  },
  tick: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
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

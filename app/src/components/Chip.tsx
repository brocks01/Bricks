import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, iconSize, radius, shadow, space, touch } from '@/theme';
import { useCompact, useEffectiveFontScale, useTouchSizes } from '@/theme/TypographyProvider';

import { CheckIcon, type Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: Icon;
  testID?: string;
}

/**
 * A large white pill for filters and one-question steps (Luma). Selected turns black
 * with a tick, so the choice is clear without relying on colour.
 */
export function Chip({ label, selected, onPress, icon: IconComponent, testID }: ChipProps) {
  const fg = selected ? color.textOnColor : color.text;
  const ShownIcon = selected ? CheckIcon : IconComponent;
  const tap = useTouchSizes();
  const inGrid = useContext(ChipGridContext);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        { minHeight: tap.min },
        inGrid && styles.cell,
        selected ? styles.selected : pressed ? styles.pressed : null,
      ]}
    >
      {ShownIcon ? <ShownIcon size={iconSize.inline} color={fg} weight="bold" /> : null}
      <Text variant="bodyStrong" color={selected ? 'textOnColor' : 'text'} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

/** True inside a ChipGroup laid out as a two-column grid. */
const ChipGridContext = createContext(false);

/**
 * Lays chips out in wrapping rows (never a sideways-scrolling strip). With Small and
 * Normal text they line up in two even columns, so a list of choices stays short
 * and tidy (one column again when the phone's own font is very large).
 */
export function ChipGroup({ children, testID }: { children: ReactNode; testID?: string }) {
  const compact = useCompact();
  const scale = useEffectiveFontScale();
  const grid = compact && scale <= CHIP_GRID_MAX_SCALE;
  return (
    <ChipGridContext.Provider value={grid}>
      <View style={[styles.group, grid && styles.grid]} testID={testID}>
        {children}
      </View>
    </ChipGridContext.Provider>
  );
}

/** Above this text scale two chips no longer fit side by side. */
const CHIP_GRID_MAX_SCALE = 1.2;

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.button,
    borderWidth: borderWidth.control,
    borderColor: color.hairline,
    backgroundColor: color.bg,
    maxWidth: '100%',
    ...shadow.control,
  },
  selected: {
    borderColor: color.primary,
    backgroundColor: color.primary,
  },
  pressed: {
    borderColor: color.primarySubtle,
    backgroundColor: color.primarySubtle,
  },
  label: {
    flexShrink: 1,
  },
  grid: {
    gap: space.xs + space.xxs,
  },
  cell: {
    flexBasis: '45%',
    flexGrow: 1,
    paddingHorizontal: space.sm,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: touch.gap,
  },
});

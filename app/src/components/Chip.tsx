import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, iconSize, radius, space, touch } from '@/theme';

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
 * A large choice button for filters and one-question steps. Selected shows a tick
 * and a filled blue background, so the choice is clear without relying on colour.
 */
export function Chip({ label, selected, onPress, icon: IconComponent, testID }: ChipProps) {
  const fg = selected ? color.textOnColor : color.text;
  const ShownIcon = selected ? CheckIcon : IconComponent;

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

/** Lays chips out in wrapping rows (never a sideways-scrolling strip). */
export function ChipGroup({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View style={styles.group} testID={testID}>
      {children}
    </View>
  );
}

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
    borderColor: color.borderStrong,
    backgroundColor: color.bg,
    maxWidth: '100%',
  },
  selected: {
    borderColor: color.primary,
    backgroundColor: color.primary,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
  },
  label: {
    flexShrink: 1,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: touch.gap,
  },
});

import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, iconSize, radius, shadow, space, touch } from '@/theme';

import { CaretRightIcon, type Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface ListRowProps {
  icon: Icon;
  label: string;
  /** The current setting, shown under the label ("English", "3 people"). */
  value?: string;
  onPress?: () => void;
  /** Not available yet: greyed out, with a note such as "Coming soon". */
  disabled?: boolean;
  note?: string;
  testID?: string;
}

/**
 * A large settings row (SGDS / LifeSG lists): icon, label, current value and an
 * arrow. The whole row is the button, at least 64dp tall.
 */
export function ListRow({
  icon: IconComponent,
  label,
  value,
  onPress,
  disabled = false,
  note,
  testID,
}: ListRowProps) {
  const fg = disabled ? color.textSecondary : color.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, value, note].filter(Boolean).join('. ')}
      accessibilityState={{ disabled }}
      disabled={disabled || !onPress}
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <IconComponent size={iconSize.button} color={fg} weight="bold" />
      <View style={styles.text}>
        <Text variant="bodyStrong" color={disabled ? 'textSecondary' : 'text'}>
          {label}
        </Text>
        {value ? <Text color="textSecondary">{value}</Text> : null}
        {note ? <Text color="textSecondary">{note}</Text> : null}
      </View>
      {disabled ? null : <CaretRightIcon size={iconSize.inline} color={fg} weight="bold" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.min + space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    borderColor: color.bg,
    backgroundColor: color.bg,
    ...shadow.card,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
    borderColor: color.primary,
  },
  disabled: {
    backgroundColor: color.bgSubtle,
  },
  text: {
    flex: 1,
    gap: space.xxs,
  },
});

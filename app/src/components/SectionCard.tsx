import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, iconSize, radius, shadow, space, touch } from '@/theme';

import { CaretRightIcon, CheckCircleIcon, type Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface SectionCardProps {
  title: string;
  description: string;
  icon: Icon;
  onPress: () => void;
  /** Not available yet: greyed out, with a short note such as "Coming soon". */
  disabled?: boolean;
  note?: string;
  /** Selected choice in a one-question step. */
  selected?: boolean;
  testID?: string;
}

/**
 * A grey panel with a white icon tile (Luma). One big tappable card per pillar on Home (Grab-style large tiles, but one per row
 * so long Tamil text never gets squeezed). The whole card is the button.
 */
export function SectionCard({
  title,
  description,
  icon: IconComponent,
  onPress,
  disabled = false,
  note,
  selected = false,
  testID,
}: SectionCardProps) {
  const fg = disabled ? color.textSecondary : color.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, description, note].filter(Boolean).join('. ')}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={[styles.iconWell, disabled && styles.iconWellDisabled]}>
        <IconComponent size={iconSize.hero} color={fg} weight="bold" />
      </View>
      <View style={styles.text}>
        <Text variant="heading" color={disabled ? 'textSecondary' : 'text'}>
          {title}
        </Text>
        <Text color="textSecondary">{description}</Text>
        {note ? (
          <Text variant="bodyStrong" color="textSecondary">
            {note}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <CheckCircleIcon size={iconSize.button} color={color.primary} weight="fill" />
      ) : disabled ? null : (
        <CaretRightIcon size={iconSize.inline} color={color.primary} weight="bold" />
      )}
    </Pressable>
  );
}

const ICON_WELL = 64;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.min * 2,
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: borderWidth.control,
    borderColor: color.bg,
    backgroundColor: color.bg,
    ...shadow.card,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
    borderColor: color.primarySubtle,
  },
  selected: {
    borderColor: color.primary,
    backgroundColor: color.bg,
  },
  iconWellDisabled: {
    backgroundColor: color.border,
  },
  iconWell: {
    width: ICON_WELL,
    height: ICON_WELL,
    borderRadius: radius.tile,
    backgroundColor: color.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: space.xxs,
  },
});

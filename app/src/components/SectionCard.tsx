import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, iconSize, radius, space, touch } from '@/theme';

import { CaretRightIcon, type Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface SectionCardProps {
  title: string;
  description: string;
  icon: Icon;
  onPress: () => void;
  testID?: string;
}

/**
 * One big tappable card per pillar on Home (Grab-style large tiles, but one per row
 * so long Tamil text never gets squeezed). The whole card is the button.
 */
export function SectionCard({
  title,
  description,
  icon: IconComponent,
  onPress,
  testID,
}: SectionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWell}>
        <IconComponent size={iconSize.hero} color={color.primary} weight="bold" />
      </View>
      <View style={styles.text}>
        <Text variant="heading">{title}</Text>
        <Text color="textSecondary">{description}</Text>
      </View>
      <CaretRightIcon size={iconSize.inline} color={color.primary} weight="bold" />
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
  text: {
    flex: 1,
    gap: space.xxs,
  },
});

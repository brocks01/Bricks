import { StyleSheet, View } from 'react-native';

import { color, iconSize, radius, space, surface } from '@/theme';

import type { Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface SheetHeaderProps {
  icon: Icon;
  title: string;
  /** One line of explanation under the title. */
  text?: string;
}

/**
 * The top of a sheet (Luma): an icon in a soft circle, a bold title and one line
 * of explanation. The buttons follow it in the sheet: the main action as a black
 * pill, Cancel as a grey pill. (Red stays for Help and emergencies only, so a
 * destructive action is a black pill with a clear verb: "Leave", "Sign out".)
 */
export function SheetHeader({ icon: IconComponent, title, text }: SheetHeaderProps) {
  return (
    <View style={styles.header} accessibilityLiveRegion="polite">
      <View style={styles.iconWell}>
        <IconComponent size={iconSize.button} color={color.text} weight="bold" />
      </View>
      <Text variant="heading" weight="bold">
        {title}
      </Text>
      {text ? <Text color="textSecondary">{text}</Text> : null}
    </View>
  );
}

const ICON_WELL = 56;

const styles = StyleSheet.create({
  header: {
    gap: space.xs,
  },
  iconWell: {
    width: ICON_WELL,
    height: ICON_WELL,
    borderRadius: radius.avatar,
    backgroundColor: color.bg,
    ...surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xxs,
  },
});

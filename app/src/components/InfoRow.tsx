import { StyleSheet, View } from 'react-native';

import { color, iconSize, space, type ColorToken } from '@/theme';

import type { Icon } from './primitives/icons';
import { Text } from './primitives/Text';

/**
 * One fact on its own line with an icon: "(calendar) Tomorrow, 7 am".
 * Separate lines read more easily than facts joined with dots, and wrap cleanly in Tamil.
 */
export function InfoRow({
  icon: IconComponent,
  text,
  textColor = 'text',
}: {
  icon: Icon;
  text: string;
  textColor?: ColorToken;
}) {
  return (
    <View style={styles.row}>
      <IconComponent size={iconSize.inline} color={color.textSecondary} weight="regular" />
      <Text color={textColor} style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
  },
  text: {
    flex: 1,
  },
});

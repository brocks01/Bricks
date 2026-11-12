import { StyleSheet, View } from 'react-native';

import { borderWidth, color, radius, space } from '@/theme';

import { Text } from './primitives/Text';

/**
 * Placeholder body for a section that hasn't been built yet. One plain sentence
 * that says what will be here, never a blank screen.
 */
export function ComingSoon({ text }: { text: string }) {
  return (
    <View style={styles.box}>
      <Text>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    borderColor: color.border,
    backgroundColor: color.bg,
  },
});

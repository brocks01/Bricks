import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';
import { useEffectiveFontScale } from '@/theme/TypographyProvider';

/** Above this text size the buttons stack, so labels never get squeezed. */
const STACK_SCALE = 1.5;

/**
 * Two (or three) buttons side by side with equal widths, e.g. Pause | Finish.
 * Stacks vertically at large text sizes.
 */
export function ButtonRow({ children, testID }: { children: ReactNode; testID?: string }) {
  const stacked = useEffectiveFontScale() >= STACK_SCALE;
  return (
    <View style={[styles.row, stacked && styles.stacked]} testID={testID}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={styles.cell}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.sm,
  },
  stacked: {
    flexDirection: 'column',
  },
  cell: {
    flexGrow: 1,
    flexBasis: 0,
  },
});

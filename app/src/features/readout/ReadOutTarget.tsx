import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { borderWidth, color, radius, space } from '@/theme';

import { useReadOut } from './ReadOutProvider';

/**
 * Marks a region of the screen that a Read It Out part points at
 * (`{ text, target: id }`). While that part is read, the region gets a thick
 * blue outline, so people can follow along with their eyes.
 */
export function ReadOutTarget({ id, children }: { id: string; children: ReactNode }) {
  const { activeTarget } = useReadOut();
  const active = activeTarget === id;
  return (
    <View
      style={[styles.frame, active && styles.active]}
      testID={active ? `readout-target-${id}-active` : undefined}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // The same outline width is always reserved, so highlighting never moves content.
  frame: {
    margin: -space.xxs,
    padding: space.xxs - borderWidth.control,
    borderWidth: borderWidth.control,
    borderColor: 'transparent',
    borderRadius: radius.card + space.xxs,
  },
  active: {
    borderColor: color.primary,
    backgroundColor: color.primarySubtle,
  },
});

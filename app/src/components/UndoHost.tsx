import { useIsFocused } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useUndo } from '@/state/undo';
import { screenPadding, space } from '@/theme';

import { UndoBar } from './UndoBar';

/**
 * Shows the app-wide undo bar on the focused screen only, floating just above
 * that screen's bottom edge (and so above the tab bar or the screen's footer).
 */
export function UndoHost() {
  const focused = useIsFocused();
  const current = useUndo((s) => s.current);
  const clear = useUndo((s) => s.clear);
  const runUndo = useUndo((s) => s.runUndo);

  if (!focused || !current) return null;

  return (
    <UndoBar
      key={current.id}
      visible
      message={current.message}
      onUndo={runUndo}
      onDismiss={clear}
      style={styles.bar}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: screenPadding,
    right: screenPadding,
    bottom: space.sm,
  },
});

import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, screenPadding, shadow, space } from '@/theme';

export interface BottomSheetProps {
  visible: boolean;
  /** Android back button. Sheets never close by tapping outside (no hidden gestures). */
  onRequestClose: () => void;
  children: ReactNode;
  testID?: string;
}

/**
 * A rounded panel that floats just above the bottom edge (Luma) over a dimmed screen, for one focused task
 * (listening, confirming). It only closes through its own clearly labelled
 * buttons or the Android back button, never by an accidental tap outside.
 */
export function BottomSheet({ visible, onRequestClose, children, testID }: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.scrim}>
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { marginBottom: insets.bottom + space.xs }]}
          testID={testID}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: color.scrim,
  },
  sheet: {
    ...shadow.floating,
    marginHorizontal: space.xs,
    backgroundColor: color.bg,
    borderRadius: radius.sheet,
    paddingHorizontal: screenPadding,
    paddingVertical: space.lg,
    gap: space.md,
  },
});

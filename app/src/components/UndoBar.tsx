import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { color, iconSize, motion, radius, space, touch } from '@/theme';

import { ArrowCounterClockwiseIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export const UNDO_DURATION_MS = 8000;

export interface UndoBarProps {
  visible: boolean;
  /** What just happened, in plain words: "You joined the walk." */
  message: string;
  onUndo: () => void;
  /** Called when the bar goes away (time up or after Undo). Hide it here. */
  onDismiss: () => void;
  durationMs?: number;
  /** Where to sit, e.g. above the tab bar. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Monzo-style "You joined the walk. Undo" bar after every action (docs/02 rule 7).
 * Fades in, is announced to screen readers, and stays for 8 seconds.
 */
export function UndoBar({
  visible,
  message,
  onUndo,
  onDismiss,
  durationMs = UNDO_DURATION_MS,
  style,
}: UndoBarProps) {
  const { t } = useTranslation();
  // Created once and kept for the component's life.
  const [opacity] = useState(() => new Animated.Value(0));
  const dismiss = useEffectEvent(() => onDismiss());

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();
    AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(dismiss, durationMs);
    return () => clearTimeout(timer);
  }, [visible, message, durationMs, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.bar, { opacity }, style]} testID="undo-bar">
      <View style={styles.message}>
        <Text color="textOnColor">{message}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.undo')}
        onPress={() => {
          tapFeedback();
          onUndo();
          onDismiss();
        }}
        style={({ pressed }) => [styles.undo, pressed && styles.undoPressed]}
        testID="undo-bar-undo"
      >
        <ArrowCounterClockwiseIcon size={iconSize.inline} color={color.textOnColor} weight="bold" />
        <Text variant="bodyStrong" color="textOnColor" style={styles.undoLabel}>
          {t('common.undo')}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.xs,
    paddingLeft: space.md,
    paddingRight: space.xs,
    paddingVertical: space.xs,
    borderRadius: radius.card,
    backgroundColor: color.snackbar,
  },
  message: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    paddingVertical: space.xs,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    minHeight: touch.min,
    paddingHorizontal: space.sm,
    borderRadius: radius.button,
  },
  undoPressed: {
    backgroundColor: color.textSecondary,
  },
  undoLabel: {
    textDecorationLine: 'underline',
  },
});

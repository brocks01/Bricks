import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { color, iconSize, motion, radius, shadow, space, touch } from '@/theme';

import { CheckCircleIcon } from './primitives/icons';
import { Text } from './primitives/Text';

/** Long enough to read twice at a slow pace. */
export const TOAST_DURATION_MS = 5000;

interface ToastState {
  text: string | null;
  /** Bumps on every show, so the same message twice restarts the timer. */
  key: number;
  show: (text: string) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  text: null,
  key: 0,
  show: (text) => set((s) => ({ text, key: s.key + 1 })),
  hide: () => set({ text: null }),
}));

/** "You're going", "Copied": confirms something that just happened. */
export function showToast(text: string): void {
  useToast.getState().show(text);
}

/**
 * A green pill near the top of the screen (Luma). It sits below the top bar, so
 * Read it out and Help are never covered, fades out by itself and is announced to
 * screen readers. Mounted once, in the root layout.
 */
export function ToastHost() {
  const text = useToast((s) => s.text);
  const key = useToast((s) => s.key);
  const hide = useToast((s) => s.hide);
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!text) return;
    AccessibilityInfo.announceForAccessibility(text);
    Animated.timing(opacity, { toValue: 1, duration: motion.base, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.base,
        useNativeDriver: true,
      }).start(() => hide());
    }, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [text, key, hide, opacity]);

  if (!text) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { top: insets.top + touch.min + space.md, opacity }]}
      accessibilityLiveRegion="polite"
      testID="toast"
    >
      <CheckCircleIcon size={iconSize.inline} color={color.textOnColor} weight="fill" />
      <Text variant="bodyStrong" color="textOnColor" style={styles.text}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    ...shadow.floating,
    position: 'absolute',
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: space.xs,
    minHeight: touch.min - space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.button,
    backgroundColor: color.toastBg,
  },
  text: {
    flexShrink: 1,
  },
});

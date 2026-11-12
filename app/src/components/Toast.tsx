import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { color, iconSize, motion, radius, shadow, space, touch } from '@/theme';

import { CheckCircleIcon, WarningCircleIcon } from './primitives/icons';
import { Text } from './primitives/Text';

/** Long enough to read twice at a slow pace. */
export const TOAST_DURATION_MS = 5000;

export type ToastTone = 'success' | 'notice';

interface ToastState {
  text: string | null;
  tone: ToastTone;
  /** Bumps on every show, so the same message twice restarts the timer. */
  key: number;
  show: (text: string, tone?: ToastTone) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  text: null,
  tone: 'success',
  key: 0,
  show: (text, tone = 'success') => set((s) => ({ text, tone, key: s.key + 1 })),
  hide: () => set({ text: null }),
}));

/**
 * "You're going", "Copied": confirms something that just happened. `notice` (amber,
 * with a warning sign) says something didn't work.
 */
export function showToast(text: string, tone: ToastTone = 'success'): void {
  useToast.getState().show(text, tone);
}

/**
 * A green pill near the top of the screen (Luma). It sits below the top bar, so
 * Read it out and Help are never covered, fades out by itself and is announced to
 * screen readers. Mounted once, in the root layout.
 */
export function ToastHost() {
  const text = useToast((s) => s.text);
  const tone = useToast((s) => s.tone);
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
      style={[
        styles.toast,
        tone === 'notice' && styles.notice,
        { top: insets.top + touch.min + space.md, opacity },
      ]}
      accessibilityLiveRegion="polite"
      testID="toast"
    >
      {tone === 'notice' ? (
        <WarningCircleIcon size={iconSize.inline} color={color.noticeText} weight="fill" />
      ) : (
        <CheckCircleIcon size={iconSize.inline} color={color.textOnColor} weight="fill" />
      )}
      <Text
        variant="bodyStrong"
        color={tone === 'notice' ? 'noticeText' : 'textOnColor'}
        style={styles.text}
      >
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
  notice: {
    backgroundColor: color.noticeBg,
  },
  text: {
    flexShrink: 1,
  },
});

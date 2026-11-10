import { Stack } from 'expo-router';

import { color, motion } from '@/theme';

/**
 * Every tab is its own stack, so screens opened inside a tab keep the tab bar
 * visible and Home is always one tap away. Headers are drawn by <Screen>.
 */
export function TabStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
        animation: 'fade',
        animationDuration: motion.base,
      }}
    />
  );
}

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useOnboarding } from '@/state/onboarding';

/** Remembers this onboarding screen, so reopening the app comes back to it. */
export function useResumeHere(route: string): void {
  const setResumeAt = useOnboarding((s) => s.setResumeAt);
  useFocusEffect(useCallback(() => setResumeAt(route), [route, setResumeAt]));
}

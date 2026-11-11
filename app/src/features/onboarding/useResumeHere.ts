import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useOnboarding } from '@/state/onboarding';

/** Remembers this onboarding screen, so reopening the app comes back to it. */
export function useResumeHere(route: string): void {
  const setResumeAt = useOnboarding((s) => s.setResumeAt);
  useFocusEffect(
    useCallback(() => {
      // Braces matter: the saving store returns a Promise, and an effect may only return a cleanup.
      setResumeAt(route);
    }, [route, setResumeAt]),
  );
}

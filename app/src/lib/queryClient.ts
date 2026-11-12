import { MutationCache, QueryClient, focusManager } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { isRetryableError } from '@/api/errors';
import { showToast } from '@/components/Toast';
import i18n from '@/i18n';

const MAX_RETRIES = 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    // Actions marked `meta.errorToast` say "That didn't work" when they fail, so a
    // tap that didn't stick is never silent (S39). Screens with their own message
    // leave it off.
    mutationCache: new MutationCache({
      onError: (_error, _vars, _context, mutation) => {
        if (mutation.meta?.errorToast) showToast(i18n.t('common.error'), 'notice');
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryableError(error),
        // Changes made on WhatsApp or by phone must show up when the app comes back.
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * React Native has no window focus, so "app came to the foreground" counts as focus.
 * Coming back also marks everything stale: a check-in answered on WhatsApp or a
 * reminder set by phone a few seconds ago must show at once, not after 30 s.
 */
export function useAppStateFocus(client?: QueryClient): void {
  const last = useRef<string | null | undefined>(AppState.currentState);
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      const cameBack = status === 'active' && last.current !== 'active';
      last.current = status;
      focusManager.setFocused(status === 'active');
      if (cameBack) void client?.invalidateQueries();
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [client]);
}

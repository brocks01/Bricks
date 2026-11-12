import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import type { DemoAccount } from '@/api/types';
import { showToast } from '@/components';
import { signOutOfSupabase } from '@/features/auth/google';
import { resetShownSos } from '@/features/safety/ActiveSosWatcher';
import { useActiveWalk } from '@/features/walk/activeWalk';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { useUndo } from '@/state/undo';

/** The seeded member the demo starts as. */
export const DEMO_SENIOR = 'u_raj';

/** Forgets everything this phone remembers about the session (not language or text size). */
async function clearLocalSession(): Promise<void> {
  await signOutOfSupabase();
  useUndo.getState().clear();
  await useActiveWalk.getState().discard();
  resetShownSos();
}

/**
 * Reset demo (iteration 2.3): the server goes back to the seeded story, this phone
 * forgets its session, and the app opens on Home as Raj with fresh data. Language
 * and text size stay as they are. Target: under 10 seconds.
 */
export function useDemoReset() {
  const { t } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const started = Date.now();
      await api.resetDemo();
      await clearLocalSession();
      useSettings.getState().setDemoUser(null);
      useOnboarding.getState().complete();
      client.clear();
      return (Date.now() - started) / 1000;
    },
    onSuccess: (seconds) => {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/home');
      showToast(t('settings.resetDone', { seconds: seconds.toFixed(1) }));
    },
  });
}

/**
 * Demo servers: act as another seeded account (family, helper, a judge). The
 * seeded people already have their story, so they open on Home. The guest judge
 * is a new member: they go through sign-in and onboarding like anyone joining.
 */
export function useSwitchDemoAccount() {
  const router = useRouter();
  const client = useQueryClient();
  return async (account: Pick<DemoAccount, 'id' | 'role'>) => {
    await clearLocalSession();
    useSettings.getState().setDemoUser(account.id === DEMO_SENIOR ? null : account.id);
    const fresh = account.role === 'judge';
    if (fresh) useOnboarding.getState().reset();
    else useOnboarding.getState().complete();
    client.clear();
    if (router.canDismiss()) router.dismissAll();
    router.replace(fresh ? '/onboarding' : '/home');
  };
}

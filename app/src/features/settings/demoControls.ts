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

/** Judge 1…JUDGE_COUNT each have a QR link: `/judge/3` (backend deps.JUDGE_COUNT). */
export const JUDGE_COUNT = 10;

/** "3" → 3 when it's a judge's number, else null. */
export function judgeNumber(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= JUDGE_COUNT ? n : null;
}

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

/**
 * A judge's QR link (iteration 3.1): their account back to fresh on the server, this
 * phone signed in as them with onboarding skipped. Home then shows today's check-in
 * and tomorrow's walk, so "No → join walk" works straight away.
 */
export function useOpenAsJudge() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (n: number) => {
      const judge = await api.resetJudge(n);
      await clearLocalSession();
      useSettings.getState().setDemoUser(judge.id);
      useOnboarding.getState().complete();
      client.clear();
      return judge;
    },
  });
}

/** Settings → Demo → Check connection: how long the server takes to answer. */
export function useConnectionCheck() {
  return useMutation({
    mutationFn: async () => {
      const started = Date.now();
      const health = await api.getHealth();
      return { ms: Date.now() - started, database: health.database };
    },
  });
}

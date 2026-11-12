import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useActiveSos } from '@/api';
import { useOnboarding } from '@/state/onboarding';

/** Alerts this phone has already shown, so closing one never brings it back. */
const shown = new Set<string>();

/** The SOS screen calls this for the alert it raised itself. */
export function markSosShown(id: string): void {
  shown.add(id);
}

/** For tests. */
export function resetShownSos(): void {
  shown.clear();
}

/**
 * Cross-channel SOS (iteration 2.3): if the member asked for help somewhere else
 * (WhatsApp "HELP", a phone call), the app opens their SOS screen with who's
 * coming as soon as it's open, instead of acting as if nothing happened.
 * Each alert opens once; the member closes it with "I'm safe now" as usual.
 */
export function ActiveSosWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const onboarded = useOnboarding((s) => s.completed);
  const active = useActiveSos(onboarded);
  const alert = active.data ?? null;

  useEffect(() => {
    if (!alert || shown.has(alert.id) || pathname === '/sos') return;
    shown.add(alert.id);
    router.push({ pathname: '/sos', params: { id: alert.id } });
  }, [alert, pathname, router]);

  return null;
}

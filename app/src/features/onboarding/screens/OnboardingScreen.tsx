// Onboarding after Singpass: the assistant, the profile to check, and "you're all set" (Flow.tsx). Everything else Interchange needs is asked later, by the agent or in the profile.
import { useCallback } from 'react';
import { exploreCommunities } from '../../../api/communityRules';
import { useNavigate } from '../../../navigation';
import { firstTab, loadProfile, profileStore } from '../state';
import { Flow } from '../Flow';
import { whoStore } from '../who';

export default function OnboardingScreen() {
  const go = useNavigate();

  // After the last screen: to the communities worth joining, or the first tab.
  const finish = useCallback(async () => {
    await loadProfile();
    if (whoStore.get().who === 'family') { go('family.create', {}, { replace: true }); return; }
    try {
      const r = await exploreCommunities('');
      const open = (r.communities ?? []).filter((c: any) => c.privacy === 'open' && !c.joined);
      if (open.length > 0 && (r.limits?.left ?? 0) > 0) { go('connect.pick', {}, { replace: true }); return; }
    } catch { /* the first tab is fine */ }
    go(firstTab(profileStore.get().profile), {}, { replace: true });
  }, [go]);

  return <Flow finish={finish} />;
}

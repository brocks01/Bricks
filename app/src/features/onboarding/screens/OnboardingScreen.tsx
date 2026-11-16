// Onboarding after sign-in: only the reference screens (name, where, enjoy, voice, reminders, welcome) in Wizard.tsx. There is no long form any more;
// whatever else Interchange needs to know is asked later, by the agent or in the profile.
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { exploreCommunities } from '../../../api/communityRules';
import { getOnboarding, type OnboardingState } from '../../../api/wisdom';
import { AppLoading } from '../../../components/AppLoading';
import { usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, space, type } from '../../../theme/tokens';
import { firstTab, loadProfile, profileStore } from '../state';
import { onboardingIndex as page } from '../pages';
import { loadWho, whoStore } from '../who';
import { Wizard } from '../Wizard';

export default function OnboardingScreen() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void loadWho();
    getOnboarding().then(setState).catch(() => setFailed(true));
  }, []);

  // After the welcome screen: a parent set up for the family goes to the family page; otherwise to the communities worth joining, or the first tab.
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

  if (failed) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, backgroundColor: colors.bg }}>
        <Text style={[type.body, { color: colors.danger, textAlign: 'center' }]}>{w('failed')}</Text>
      </View>
    );
  }
  if (!state) return <AppLoading />;
  return <Wizard state={state} onState={setState} finish={finish} />;
}

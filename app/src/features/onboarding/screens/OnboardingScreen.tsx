// Onboarding after sign-in: only the reference screens (name, where, enjoy, voice, reminders, welcome) in Wizard.tsx. There is no long form any more;
// whatever else Interchange needs to know is asked later, by the agent or in the profile.
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { exploreCommunities } from '../../../api/communityRules';
import { getOnboarding, type OnboardingState } from '../../../api/wisdom';
import { AppLoading } from '../../../components/AppLoading';
import { usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { useStore } from '../../../core/store';
import { sessionStore } from '../../../session/store';
import { colors, space, type } from '../../../theme/tokens';
import { loadProfile } from '../state';
import { onboardingIndex as page } from '../pages';
import { loadWho, whoStore } from '../who';
import { Wizard } from '../Wizard';

export default function OnboardingScreen() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [failed, setFailed] = useState(false);

  const { status } = useStore(sessionStore);
  useEffect(() => {
    if (status !== 'in') return; // after a reload the saved sign-in loads first
    void loadWho();
    getOnboarding().then(setState).catch(() => setFailed(true));
  }, [status]);

  // After the welcome screen: a parent set up for the family goes to the family page; otherwise to the communities worth joining (once, while there is room), then Home.
  const finish = useCallback(async () => {
    await loadProfile();
    if (whoStore.get().who === 'family') { go('family.create', {}, { replace: true }); return; }
    try {
      const r = await exploreCommunities('');
      const open = (r.communities ?? []).filter((c: any) => c.privacy === 'open' && !c.joined);
      if (open.length > 0 && (r.limits?.left ?? 0) > 0) { go('connect.pick', {}, { replace: true }); return; }
    } catch { /* the first tab is fine */ }
    go('home.index', {}, { replace: true });
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

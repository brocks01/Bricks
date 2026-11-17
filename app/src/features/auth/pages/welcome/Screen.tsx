import { useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../../../../core/store';
import { LANGUAGES } from '../../../../i18n/languages';
import { languageStore, setLanguage } from '../../../../i18n/store';
import { usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { startLimDemo } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { LanguageBody } from '../../../onboarding/bodies';
import { Collage, Frame } from '../../../onboarding/kit';
import { onboardingLocal } from '../../../onboarding/state';
import { authWelcome as page } from './page';

const LINES = ['Choose your language', 'अपनी भाषा चुनें', 'আপনার ভাষা বেছে নিন', 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்', '请选择语言', 'Pilih bahasa anda'];

/** Screen 1: the language. The app changes the moment a language is tapped; Next goes on to the text size. */
export default function Welcome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { code } = useStore(languageStore);
  const [demo, setDemo] = useState<'idle' | 'busy' | 'failed'>('idle');
  // For a presentation: sign straight in as Mr Lim, already set up; the app then opens Home by itself (AuthGate)
  const skip = () => {
    if (demo === 'busy') return;
    setDemo('busy');
    onboardingLocal.walk = false;
    onboardingLocal.done = true;
    startLimDemo().then(() => setDemo('idle')).catch(() => { onboardingLocal.done = false; setDemo('failed'); });
  };
  usePageData(page, {
    values: [{ label: w('heading'), value: LANGUAGES.find((l) => l.code === code)?.native ?? '' }],
    images: [],
    lists: [],
    actions: [
      ...LANGUAGES.map((l) => ({ id: `lang${l.code.charAt(0).toUpperCase()}${l.code.slice(1)}`, label: l.native, run: () => { void setLanguage(l.code); } })),
      { id: 'start', label: w('o_next'), run: () => { go('auth.textSize'); } },
      { id: 'skipDemo', label: w('o_demo_skip'), run: skip },
    ],
  });
  return (
    <Frame top={<Collage />} primary={{ label: w('o_next'), onPress: () => go('auth.textSize') }} secondary={{ label: demo === 'busy' ? w('o_demo_wait') : w('o_demo_skip'), onPress: skip }}>
      <Text accessibilityRole="header" style={{ fontSize: 36, fontWeight: '800', color: colors.ink }}>Interchange</Text>
      <View style={{ marginTop: space.md, marginBottom: space.md, gap: 2 }}>
        {LINES.map((t, i) => <Text key={t} style={[type.body, { color: colors.ink, fontWeight: LANGUAGES[i].code === code ? '800' : '500' }]}>{t}</Text>)}
      </View>
      <LanguageBody code={code} onPick={(c) => void setLanguage(c)} />
      {demo === 'failed' ? <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, fontWeight: '700', marginTop: space.md }}>{w('o_demo_failed')}</Text> : null}
    </Frame>
  );
}

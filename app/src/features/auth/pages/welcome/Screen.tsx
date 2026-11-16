import { Text, View } from 'react-native';
import { useStore } from '../../../../core/store';
import { LANGUAGES } from '../../../../i18n/languages';
import { languageStore, setLanguage } from '../../../../i18n/store';
import { useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { colors, space, type } from '../../../../theme/tokens';
import { Chip, Collage, Frame, grid } from '../../../onboarding/kit';
import { authWelcome as page } from './page';

const LINES = ['Choose your language', 'अपनी भाषा चुनें', 'আপনার ভাষা বেছে নিন', 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்', '请选择语言', 'Pilih bahasa anda'];

/** Screen 1: the language. The app changes the moment a language is tapped; Next goes on to the text size. */
export default function Welcome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { code } = useStore(languageStore);
  useAction(page, 'start', () => go('auth.textSize'));
  return (
    <Frame top={<Collage />} primary={{ label: w('o_next'), onPress: () => go('auth.textSize') }}>
      <Text accessibilityRole="header" style={{ fontSize: 36, fontWeight: '800', color: colors.ink }}>Wisdom</Text>
      <View style={{ marginTop: space.md, marginBottom: space.md, gap: 2 }}>
        {LINES.map((t, i) => <Text key={t} style={[type.body, { color: colors.ink, fontWeight: LANGUAGES[i].code === code ? '800' : '500' }]}>{t}</Text>)}
      </View>
      <View style={grid}>
        {LANGUAGES.map((l) => <Chip key={l.code} label={l.native} on={code === l.code} onPress={() => void setLanguage(l.code)} />)}
      </View>
    </Frame>
  );
}

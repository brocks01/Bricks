import { Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { LANGUAGES, useLanguage } from '../../../../i18n';
import { SPOKEN_LANGUAGES, spokenStore } from '../../../../i18n/spoken';
import { El, useAction, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { authWelcome as page } from './page';

/**
 * The landing page. NOT a `Screen`: it must never scroll - the photo takes whatever height is left, so the
 * whole page always fits the phone, whatever its size.
 */
export default function Welcome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const code = useLanguage();
  const insets = useSafeAreaInsets();
  const native = LANGUAGES.find((l) => l.code === code)?.native ?? '';
  const spoken = useStore(spokenStore).spoken;
  // What the person already said they speak, so the entry reads like theirs ("English, Hindi").
  const spokenNames = spoken.map((c) => SPOKEN_LANGUAGES.find((l) => l.code === c)?.native ?? c);
  const spokenLabel = spokenNames.length ? `${w('spokenLink')}: ${spokenNames.slice(0, 2).join(', ')}${spokenNames.length > 2 ? '…' : ''}` : w('spokenLink');
  useAction(page, 'start', () => go('auth.signIn'));
  useAction(page, 'languageLink', () => go('language.pick'));
  useAction(page, 'spokenLink', () => go('language.spoken'));
  // What the agent sees before sign-in: the three entries, nothing else. It can explain them, not press them.
  usePageData(page, {
    values: [{ label: w('subtitle'), value: native }],
    images: [],
    lists: [],
    actions: [
      { id: 'start', label: w('start'), run: () => { go('auth.signIn'); } },
      { id: 'languageLink', label: w('languageLink'), run: () => { go('language.pick'); } },
      { id: 'spokenLink', label: spokenLabel, run: () => { go('language.spoken'); } },
    ],
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* The approved lockup: mark, Wisdom wordmark and the tagline, so the heading is not repeated below. */}
      <View style={{ alignItems: 'center', paddingTop: space.xl * 2, paddingBottom: space.lg }}>
        <Image
          source={require('../../../../../assets/brand/logo.png')}
          accessibilityLabel="Wisdom"
          accessibilityRole="header"
          resizeMode="contain"
          style={{ width: 220, height: 80 }}
        />
      </View>
      {/* The photo grows and shrinks to fill whatever height is left, so nothing ever has to scroll. */}
      {/* A Singapore photo: older people playing games together in Chinatown. Wikimedia Commons, CC BY-SA 4.0 (the credit below is the licence's attribution). */}
      <View style={{ flex: 1, width: '100%', borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.accentSoft }}>
        <Image
          source={require('../../../../../assets/images/singapore-seniors.jpg')}
          accessibilityLabel="Older neighbours playing games together in Singapore"
          resizeMode="cover"
          style={{ flex: 1, width: '100%' }}
        />
        <Text style={{ position: 'absolute', right: 8, bottom: 4, fontSize: 10, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 }}>Photo: Dangobang, CC BY-SA 4.0</Text>
      </View>
      <Text style={[type.body, { color: colors.muted, marginTop: space.lg, textAlign: 'center' }]}>{w('subtitle')}</Text>
      <View style={{ height: space.md }} />
      <El page={page} id="start"><Button label={w('start')} onPress={() => go('auth.signIn')} /></El>
      <View style={{ height: space.xs }} />
      <El page={page} id="languageLink"><Button kind="plain" icon="language" label={`${w('languageLink')}: ${native}`} onPress={() => go('language.pick')} /></El>
      <View style={{ height: space.xs }} />
      <El page={page} id="spokenLink"><Button kind="plain" icon="chatbubbles-outline" label={spokenLabel} onPress={() => go('language.spoken')} /></El>
      <View style={{ height: space.lg }} />
    </View>
  );
}

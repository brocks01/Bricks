import { Text, View } from 'react-native';
import { Logo } from '../../../../components/headers';
import { Button, Screen } from '../../../../components/ui';
import { LANGUAGES, useLanguage } from '../../../../i18n';
import { El, useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { colors, space, type } from '../../../../theme/tokens';
import { authWelcome as page } from './page';

export default function Welcome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const code = useLanguage();
  const native = LANGUAGES.find((l) => l.code === code)?.native ?? '';
  useAction(page, 'start', () => go('auth.signIn'));
  useAction(page, 'languageLink', () => go('language.pick'));

  return (
    <Screen title="" plain>
      <View style={{ alignItems: 'center', paddingTop: space.xl * 2, paddingBottom: space.xl }}>
        <Logo size={72} />
        <Text style={[type.h1, { color: colors.ink, marginTop: space.lg, textAlign: 'center' }]} accessibilityRole="header">{w('heading')}</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: space.sm, textAlign: 'center' }]}>{w('subtitle')}</Text>
      </View>
      <El page={page} id="start"><Button label={w('start')} onPress={() => go('auth.signIn')} /></El>
      <View style={{ height: space.sm }} />
      <El page={page} id="languageLink"><Button kind="plain" icon="language" label={`${w('languageLink')}: ${native}`} onPress={() => go('language.pick')} /></El>
    </Screen>
  );
}

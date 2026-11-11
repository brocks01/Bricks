import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GoogleButton, googleAvailable } from '../../../../components/GoogleButton';
import { Button, ErrorText, Field, Screen } from '../../../../components/ui';
import { useLanguage, useT } from '../../../../i18n';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { errorWords } from '../../../../session/errors';
import { googleSignIn, loadProviders, requestCode, type Providers } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { authSignIn as page } from './page';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const lang = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<Providers | null>(null);

  useEffect(() => {
    void loadProviders().then(setProviders);
  }, []);

  const send = async () => {
    if (!EMAIL.test(email.trim())) return setError(t('common.error.invalidEmail'));
    setError(null);
    setBusy(true);
    try {
      await requestCode(email);
      go('auth.verify');
    } catch (e) {
      const m = errorWords(e);
      setError(t(m.key, m.vars));
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'email', email, (v) => setEmail(String(v)));
  useAction(page, 'sendCode', send);

  const onGoogle = async (idToken: string) => {
    setBusy(true);
    setError(null);
    try {
      await googleSignIn(idToken); // the gate in the root layout then opens the right page
    } catch (e) {
      const m = errorWords(e);
      setError(m.key === 'common.error.generic' ? w('googleFailed') : t(m.key, m.vars));
    } finally {
      setBusy(false);
    }
  };

  const off = <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginBottom: space.sm }]}>{w('unavailable')}</Text>;
  const showGoogle = providers?.google && googleAvailable;

  return (
    <Screen title={w('heading')} back>
      <El page={page} id="email">
        <Field label={w('email')} value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" error={null} />
      </El>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="sendCode"><Button label={w('sendCode')} onPress={() => void send()} disabled={busy} /></El>

      <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginVertical: space.lg }]}>{w('or')}</Text>

      <El page={page} id="google">
        {showGoogle ? <GoogleButton locale={lang} onToken={(tok) => void onGoogle(tok)} onError={() => setError(w('googleFailed'))} /> : <View><Button kind="plain" icon="logo-google" label={w('google')} onPress={() => undefined} disabled />{off}</View>}
      </El>
      <El page={page} id="singpass">
        <View><Button kind="plain" icon="shield-checkmark-outline" label={w('singpass')} onPress={() => undefined} disabled={!providers?.singpass} />{providers?.singpass ? null : off}</View>
      </El>
      <El page={page} id="digilocker">
        <View><Button kind="plain" icon="id-card-outline" label={w('digilocker')} onPress={() => undefined} disabled={!providers?.digilocker} />{providers?.digilocker ? null : off}</View>
      </El>
    </Screen>
  );
}

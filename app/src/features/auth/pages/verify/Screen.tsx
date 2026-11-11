import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, ErrorText, Field, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useT } from '../../../../i18n';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { errorWords } from '../../../../session/errors';
import { requestCode, sessionStore, verifyCode } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { authVerify as page } from './page';

export default function Verify() {
  const w = usePageWords(page);
  const t = useT();
  const { pendingEmail, devCode } = useStore(sessionStore);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => {
    const m = errorWords(e);
    setError(t(m.key, m.vars));
  };
  const verify = async () => {
    setError(null);
    setBusy(true);
    try {
      await verifyCode(code.trim()); // the gate in the root layout then opens the setup page or home
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    if (!pendingEmail) return;
    setError(null);
    try {
      await requestCode(pendingEmail);
    } catch (e) {
      fail(e);
    }
  };

  useField(page, 'code', code, (v) => setCode(String(v)));
  useAction(page, 'verify', verify);
  useAction(page, 'resend', resend);

  return (
    <Screen title={w('heading')} back>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>{w('hint', { email: pendingEmail ?? '' })}</Text>
      {devCode ? <Card tint><Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>{w('devCode', { code: devCode })}</Text></Card> : null}
      <El page={page} id="code">
        <Field label={w('code')} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} big />
      </El>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="verify"><Button label={w('verify')} onPress={() => void verify()} disabled={busy || code.length !== 6} /></El>
      <El page={page} id="resend"><Button kind="plain" label={w('resend')} onPress={() => void resend()} /></El>
    </Screen>
  );
}

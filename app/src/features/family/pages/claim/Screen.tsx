import { useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '../../../../api/client';
import { BackScreen } from '../../../../components/BackButton';
import { Button, ErrorText, Field } from '../../../../components/ui';
import { useT } from '../../../../i18n';
import { El, useAction, useField, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { errorWords } from '../../../../session/errors';
import { claimWithCode } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { familyClaim as page } from './page';

const CODE = /^\d{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Claim() {
  const w = usePageWords(page);
  const go = useNavigate();
  const t = useT();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    if (!CODE.test(code.trim())) return setError(w('wrong'));
    if (!EMAIL.test(email.trim())) return setError(w('taken'));
    setError(null);
    setBusy(true);
    try {
      await claimWithCode(code.trim(), email.trim());
      go('connect.index', {}, { replace: true }); // the account is theirs now: into the app
    } catch (e) {
      if (e instanceof ApiError && e.code === 'code_invalid') setError(w('wrong'));
      else if (e instanceof ApiError && e.code === 'email_in_use') setError(w('taken'));
      else {
        const m = errorWords(e);
        setError(m.key === 'common.error.generic' ? w('failed') : t(m.key, m.vars));
      }
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'code', code, (v) => setCode(String(v).replace(/\D/g, '').slice(0, 6)));
  useField(page, 'email', email, (v) => setEmail(String(v)));
  useAction(page, 'claim', () => void claim());
  // The agent may see the contact address, never the 6-digit family code (it is the person's key to the account).
  usePageData(page, {
    values: [{ label: w('email'), value: email }],
    images: [],
    lists: [],
    actions: [{ id: 'claim', label: w('claim'), run: () => void claim() }],
  });

  return (
    <BackScreen title={w('heading')}>
      <View style={{ gap: space.md }}>
        <Text style={[type.body, { color: colors.muted }]}>{w('intro')}</Text>
        <El page={page} id="code">
          <Field label={w('code')} value={code} onChangeText={setCode} icon="key-outline" keyboardType="number-pad" maxLength={6} big />
        </El>
        <El page={page} id="email">
          <Field label={w('email')} value={email} onChangeText={setEmail} placeholder={w('emailPlaceholder')} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
        </El>
        <ErrorText>{error}</ErrorText>
        <El page={page} id="claim">
          <Button label={w('claim')} onPress={() => void claim()} disabled={busy} />
        </El>
      </View>
    </BackScreen>
  );
}

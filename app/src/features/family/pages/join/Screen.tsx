import { useState } from 'react';
import { Text } from 'react-native';
import { familyApi } from '../../../../api/family';
import { ApiError } from '../../../../api/client';
import { Button, ErrorText, Field, Screen } from '../../../../components/ui';
import { useT } from '../../../../i18n';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { errorWords } from '../../../../session/errors';
import { invalidateFamilies } from '../../state';
import { colors, space, type } from '../../../../theme/tokens';
import { familyJoin as page } from './page';

const CODE = /^\d{6}$/;

export default function FamilyJoin() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const join = async () => {
    if (!CODE.test(code.trim())) return setError(w('wrong'));
    setError(null);
    setBusy(true);
    try {
      const family = await familyApi.accept(code.trim());
      invalidateFamilies();
      go('family.detail', { id: family.id });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'code_invalid') setError(w('wrong'));
      else {
        const m = errorWords(e);
        setError(m.key === 'common.error.generic' ? w('failed') : t(m.key, m.vars));
      }
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'code', code, (v) => setCode(String(v).replace(/\D/g, '').slice(0, 6)));
  useAction(page, 'join', () => void join());

  return (
    <Screen title={w('heading')} back>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('intro')}</Text>
      <El page={page} id="code">
        <Field label={w('code')} value={code} onChangeText={setCode} icon="key-outline" keyboardType="number-pad" maxLength={6} big />
      </El>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="join">
        <Button label={w('join')} onPress={() => void join()} disabled={busy} />
      </El>
    </Screen>
  );
}

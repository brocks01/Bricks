import { useState } from 'react';
import { Text } from 'react-native';
import { BackScreen } from '../../../../components/BackButton';
import { Button, ErrorText, Field } from '../../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { errorWords } from '../../../../session/errors';
import { useT } from '../../../../i18n';
import { familyApi } from '../../../../api/family';
import { invalidateFamilies } from '../../state';
import { colors, space, type } from '../../../../theme/tokens';
import { familyCreate as page } from './page';

export default function FamilyCreate() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (name.trim().length < 2) return setError(w('nameError'));
    setError(null);
    setBusy(true);
    try {
      const family = await familyApi.create(name.trim());
      invalidateFamilies();
      go('family.detail', { id: family.id });
    } catch (e) {
      const m = errorWords(e);
      setError(m.key === 'common.error.generic' ? w('failed') : t(m.key, m.vars));
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'name', name, (v) => setName(String(v)));
  useAction(page, 'create', () => void create());

  return (
    <BackScreen title={w('heading')}>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('intro')}</Text>
      <El page={page} id="name">
        <Field label={w('name')} value={name} onChangeText={setName} placeholder={w('namePlaceholder')} icon="home-outline" maxLength={80} />
      </El>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="create">
        <Button label={w('create')} onPress={() => void create()} disabled={busy} />
      </El>
    </BackScreen>
  );
}

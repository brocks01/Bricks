import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { familyApi } from '../../../../api/family';
import { Button, ChoiceChips, ErrorText, Field, Screen } from '../../../../components/ui';
import { LANGUAGES, useT } from '../../../../i18n';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { errorWords } from '../../../../session/errors';
import { colors, space, type } from '../../../../theme/tokens';
import { invalidateFamilies } from '../../state';
import { familyAssisted as page } from './page';

export default function FamilyAssisted() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<string>('en');
  const [relationship, setRelationship] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (name.trim().length < 2) return setError(w('nameError'));
    setError(null);
    setBusy(true);
    try {
      await familyApi.createAssisted(String(id), {
        display_name: name.trim(),
        language,
        relationship: relationship.trim() || null,
      });
      invalidateFamilies(); // the member count just changed
      go('family.detail', { id: String(id) });
    } catch (e) {
      const m = errorWords(e);
      setError(m.key === 'common.error.generic' ? w('failed') : t(m.key, m.vars));
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'name', name, (v) => setName(String(v)));
  useField(page, 'language', language, (v) => setLanguage(String(v)));
  useField(page, 'relationship', relationship, (v) => setRelationship(String(v)));
  useAction(page, 'create', () => void create());

  return (
    <Screen title={w('heading')} back>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('intro')}</Text>
      <El page={page} id="name">
        <Field label={w('name')} value={name} onChangeText={setName} placeholder={w('namePlaceholder')} icon="person-outline" maxLength={80} />
      </El>
      <El page={page} id="language">
        <View style={{ marginBottom: space.md }}>
          <Text style={[type.small, { color: colors.muted, marginBottom: space.xs }]}>{w('language')}</Text>
          <ChoiceChips label={w('language')} options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))} value={language} onChange={(v) => setLanguage(v)} />
        </View>
      </El>
      <El page={page} id="relationship">
        <Field label={w('relationship')} value={relationship} onChangeText={setRelationship} placeholder={w('relationshipPlaceholder')} icon="people-outline" maxLength={40} />
      </El>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="create">
        <Button label={w('create')} onPress={() => void create()} disabled={busy} />
      </El>
    </Screen>
  );
}

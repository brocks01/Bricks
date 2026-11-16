import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ApiError } from '../../../api/client';
import { createInitiative } from '../../../api/communities';
import { BackScreen } from '../../../components/BackButton';
import { Button, ErrorText, Field } from '../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../kit';
import { useGoBack } from '../../../navigation';
import { communityNewInitiative as page } from '../pages';

// Start an Initiative: a short form for a community leader.
export default function NewInitiative() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const back = useGoBack();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [plan, setPlan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError(null);
    if (title.trim().length < 2) {
      setError(w('failed'));
      return;
    }
    setBusy(true);
    try {
      await createInitiative(String(id), { title: title.trim(), ...(summary.trim() ? { summary: summary.trim() } : {}), ...(plan.trim() ? { current_plan: plan.trim() } : {}) });
      back();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? w('leadersOnly') : w('failed'));
    } finally {
      setBusy(false);
    }
  };
  useField(page, 'fTitle', title, (v) => setTitle(String(v)));
  useField(page, 'fSummary', summary, (v) => setSummary(String(v)));
  useField(page, 'fPlan', plan, (v) => setPlan(String(v)));
  useAction(page, 'save', save);

  return (
    <BackScreen title={w('newInitiative')}>
      <El page={page} id="fTitle"><Field label={w('fTitle')} value={title} onChangeText={setTitle} maxLength={80} autoCapitalize="words" /></El>
      <El page={page} id="fSummary"><Field label={w('fSummary')} value={summary} onChangeText={setSummary} maxLength={200} autoCapitalize="sentences" /></El>
      <El page={page} id="fPlan"><Field label={w('fPlan')} value={plan} onChangeText={setPlan} maxLength={300} autoCapitalize="sentences" /></El>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="save"><Button label={w('save')} onPress={() => void save()} disabled={busy} /></El>
    </BackScreen>
  );
}

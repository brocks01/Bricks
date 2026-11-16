import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ApiError } from '../../../api/client';
import { createActivity } from '../../../api/communities';
import { Notice } from '../../../components/blocks';
import { Button, ChoiceChips, ErrorText, Field, Screen } from '../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../kit';
import { useGoBack } from '../../../navigation';
import { communityNewEvent as page } from '../pages';

// Create Event: a short form for a community leader. The date and time are typed as 2026-11-16 and 06:00 (the same in every language).
export default function NewEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const back = useGoBack();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [category, setCategory] = useState('');
  const [about, setAbout] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly'>('none');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError(null);
    const start = /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) && /^\d{1,2}:\d{2}$/.test(time.trim()) ? new Date(`${date.trim()}T${time.trim().padStart(5, '0')}:00`) : null;
    if (title.trim().length < 2 || !start || Number.isNaN(start.getTime())) {
      setError(w('badDate'));
      return;
    }
    setBusy(true);
    try {
      await createActivity(String(id), {
        title: title.trim(),
        starts_at: start.toISOString(),
        ...(place.trim() ? { location: place.trim() } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(about.trim() ? { description: about.trim() } : {}),
        ...(repeat !== 'none' ? { repeat } : {}),
      });
      back();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? w('leadersOnly') : w('failed'));
    } finally {
      setBusy(false);
    }
  };
  useField(page, 'fTitle', title, (v) => setTitle(String(v)));
  useField(page, 'fDate', date, (v) => setDate(String(v)));
  useField(page, 'fTime', time, (v) => setTime(String(v)));
  useField(page, 'fPlace', place, (v) => setPlace(String(v)));
  useField(page, 'fCategory', category, (v) => setCategory(String(v)));
  useField(page, 'fAbout', about, (v) => setAbout(String(v)));
  useField(page, 'fRepeat', repeat, (v) => setRepeat(String(v) as typeof repeat));
  useAction(page, 'save', save);

  return (
    <Screen title={w('newEvent')} back>
      <El page={page} id="fTitle"><Field label={w('fTitle')} value={title} onChangeText={setTitle} maxLength={120} autoCapitalize="words" /></El>
      <El page={page} id="fDate"><Field label={w('fDate')} value={date} onChangeText={setDate} placeholder="2026-11-16" keyboardType="numbers-and-punctuation" maxLength={10} /></El>
      <El page={page} id="fTime"><Field label={w('fTime')} value={time} onChangeText={setTime} placeholder="06:00" keyboardType="numbers-and-punctuation" maxLength={5} /></El>
      <El page={page} id="fPlace"><Field label={w('fPlace')} value={place} onChangeText={setPlace} maxLength={160} autoCapitalize="words" /></El>
      <El page={page} id="fCategory"><Field label={w('fCategory')} value={category} onChangeText={setCategory} maxLength={60} autoCapitalize="words" /></El>
      <El page={page} id="fAbout"><Field label={w('fAbout')} value={about} onChangeText={setAbout} maxLength={1000} autoCapitalize="sentences" /></El>
      <El page={page} id="fRepeat">
        <ChoiceChips label={w('fRepeat')} options={(['none', 'daily', 'weekdays', 'weekly', 'monthly'] as const).map((r) => ({ value: r, label: w(`repeat_${r}`) }))} value={repeat} onChange={(v) => setRepeat(v as typeof repeat)} />
      </El>
      {repeat !== 'none' ? <Notice text={w('repeatNote')} icon="repeat-outline" /> : null}
      <ErrorText>{error}</ErrorText>
      <El page={page} id="save"><Button label={w('save')} onPress={() => void save()} disabled={busy} /></El>
    </Screen>
  );
}

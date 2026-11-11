import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { addActivity, getActivity, type ActivityData, type ActivityKind } from '../../../../api/grow';
import { Hero } from '../../../../components/Hero';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Field, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage } from '../../../../i18n';
import { El, usePageData, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { Card, Chips, Stat, WeekBars, num } from '../../ui';
import { growActivity as page } from './page';

const KINDS: ActivityKind[] = ['walk', 'jog', 'yoga', 'exercise', 'other'];

// Activity: the last seven days as bars, this week's minutes, days in a row, and a form to add what the person did. A missed day is just an empty bar.
export default function Activity() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [data, setData] = useState<ActivityData | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<ActivityKind>('walk');
  const [mins, setMins] = useState('');
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    getActivity().then(setData).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);
  const when = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' });

  const save = useCallback(async () => {
    const m = num(mins);
    if (!m) return;
    setError(false);
    try {
      await addActivity(kind, Math.min(600, Math.round(m)));
      setAdding(false);
      setMins('');
      load();
    } catch {
      setError(true);
    }
  }, [kind, mins, load]);

  usePageData(
    page,
    data === null
      ? null
      : {
          values: [
            { label: w('thisWeek'), value: w('minutesUnit', { n: data.week_minutes }) },
            { label: w('streak', { n: data.streak }), value: String(data.streak) },
          ],
          images: [],
          lists: [{ label: w('recent'), items: data.recent.map((r) => ({ label: w(r.kind), detail: `${w('minutesUnit', { n: r.minutes })} · ${when(r.logged_on)}` })) }],
          actions: [{ id: 'logActivity', label: w('logActivity'), run: () => setAdding(true) }, ...(adding ? [{ id: 'saveActivity', label: w('save'), run: () => save() }] : [])],
        }
  );

  return (
    <Screen title={w('heading')} back>
      <Hero source={require('../../../../../assets/images/activity.jpg')} height={150} light={false} />
      <Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>{w('act_intro')}</Text>
      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : data === null ? (
        <SkeletonList count={3} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
            <Stat icon="time-outline" n={w('minutesUnit', { n: data.week_minutes })} label={w('thisWeek')} />
            <Stat icon="flame-outline" n={data.streak} label={w('streakLabel')} />
          </View>
          <WeekBars days={data.days} />
          {adding ? (
            <View>
              <Chips options={KINDS.map((k) => ({ id: k, label: w(k) }))} value={kind} onChange={setKind} />
              <Field label={w('minutes')} value={mins} onChangeText={setMins} keyboardType="number-pad" maxLength={3} />
              {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.sm }]}>{w('failed')}</Text> : null}
              <El page={page} id="saveActivity"><Button label={w('save')} onPress={() => void save()} icon="checkmark" disabled={!num(mins)} /></El>
              <Pressable onPress={() => setAdding(false)} accessibilityRole="button" style={{ alignItems: 'center', padding: space.md }}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>{w('cancel')}</Text></Pressable>
            </View>
          ) : (
            <El page={page} id="logActivity"><Button label={w('logActivity')} onPress={() => setAdding(true)} icon="add" /></El>
          )}
          {data.recent.length ? <Text style={[type.h2, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>{w('recent')}</Text> : null}
          {data.recent.map((r) => (
            <Card key={r.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{w(r.kind)}</Text>
                <Text style={{ fontSize: 16, color: colors.ink }}>{w('minutesUnit', { n: r.minutes })}</Text>
              </View>
              <Text style={[type.small, { color: colors.muted }]}>{when(r.logged_on)}</Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

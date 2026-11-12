import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { addReading, getHealth, type HealthData, type HealthKind } from '../../../../api/grow';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Field, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage } from '../../../../i18n';
import { El, usePageData, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { Card, num } from '../../ui';
import { growHealth as page } from './page';

const KINDS: { id: HealthKind; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'heart_rate', icon: 'heart-outline', color: '#E5372E' },
  { id: 'sleep_hours', icon: 'moon-outline', color: '#4B5FBF' },
  { id: 'weight_kg', icon: 'scale-outline', color: '#E58A1F' },
  { id: 'blood_pressure', icon: 'pulse-outline', color: '#1B7F3B' },
];

// Health (sample 11, screen 8): the latest value of four things the person records, and their records. No score and no advice:
// Bricks shows back what the person typed in. Private to them.
export default function Health() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [data, setData] = useState<HealthData | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<'overview' | 'records'>('overview');
  const [adding, setAdding] = useState<HealthKind | null>(null);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    getHealth()
      .then((x) => {
        setFailed(false);
        setData(x);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);

  const show = (v: string | number) => String(Number(v));
  const text = (kind: HealthKind, r: { value: string | number; value2: string | number | null }) => (kind === 'blood_pressure' ? `${show(r.value)}/${show(r.value2 ?? 0)}` : show(r.value)) + ' ' + w('u_' + kind);
  const when = (iso: string) => new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });

  const save = useCallback(async () => {
    if (!adding) return;
    const v = num(a);
    const v2 = num(b);
    if (!v || (adding === 'blood_pressure' && !v2)) return;
    setError(false);
    try {
      await addReading(adding, v, adding === 'blood_pressure' ? v2 ?? undefined : undefined);
      setAdding(null);
      setA('');
      setB('');
      load();
    } catch {
      setError(true);
    }
  }, [adding, a, b, load]);
  const open = (k: HealthKind) => {
    setAdding(k);
    setA('');
    setB('');
    setError(false);
  };

  usePageData(
    page,
    data === null
      ? null
      : {
          values: KINDS.map((k) => ({ label: w(k.id), value: data.latest[k.id] ? `${text(k.id, data.latest[k.id]!)} (${when(data.latest[k.id]!.recorded_at)})` : w('empty') })),
          images: [],
          lists: [{ label: w('records'), items: data.recent.map((r) => ({ label: w(r.kind), detail: `${text(r.kind, r)} · ${when(r.recorded_at)}` })) }],
          actions: [
            { id: 'overview', label: w('overview'), run: () => setTab('overview') },
            { id: 'records', label: w('records'), run: () => setTab('records') },
            ...KINDS.map((k, n) => ({ id: `add${n + 1}`, label: `${w('addReading')}: ${w(k.id)}`, run: () => open(k.id) })),
            ...(adding ? [{ id: 'saveReading', label: w('save'), run: () => save() }] : []),
          ],
        }
  );

  return (
    <Screen title={w('heading')} back>
      <Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>{w('health_intro')}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
        {(['overview', 'records'] as const).map((t) => (
          <View key={t} style={{ flex: 1 }}>
            <El page={page} id={t}>
              <Pressable onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={{ minHeight: 44, borderRadius: radius.button, backgroundColor: tab === t ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: tab === t ? '#FFFFFF' : colors.accent }}>{w(t)}</Text>
              </Pressable>
            </El>
          </View>
        ))}
      </View>
      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : data === null ? (
        <SkeletonList count={3} />
      ) : tab === 'overview' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {KINDS.map((k) => {
              const r = data.latest[k.id];
              return (
                <View key={k.id} style={{ width: '48.5%' }}>
                  <Pressable onPress={() => open(k.id)} accessibilityRole="button" accessibilityLabel={`${w('addReading')}: ${w(k.id)}`} style={{ minHeight: 104, borderRadius: radius.card, borderWidth: adding === k.id ? 2 : 1, borderColor: adding === k.id ? colors.accent : colors.line, backgroundColor: colors.card, padding: space.md, gap: 4 }}>
                    <Ionicons name={k.icon} size={26} color={k.color} />
                    <Text style={[type.small, { color: colors.muted }]}>{w(k.id)}</Text>
                    <Text style={{ fontSize: r ? 20 : 16, fontWeight: '800', color: r ? colors.ink : colors.accent }}>{r ? text(k.id, r) : '+ ' + w('noReading')}</Text>
                    {r ? <Text style={{ fontSize: 12, color: colors.muted }}>{when(r.recorded_at)}</Text> : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
          {adding ? (
            <View style={{ marginTop: space.lg }}>
              <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{w('addReading')}: {w(adding)}</Text>
              <Field label={adding === 'blood_pressure' ? w('top') : w('value') + ' (' + w('u_' + adding) + ')'} value={a} onChangeText={setA} keyboardType="decimal-pad" maxLength={7} />
              {adding === 'blood_pressure' ? <Field label={w('bottom')} value={b} onChangeText={setB} keyboardType="decimal-pad" maxLength={7} /> : null}
              {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.sm }]}>{w('failed')}</Text> : null}
              <El page={page} id="saveReading"><Button label={w('save')} onPress={() => void save()} icon="checkmark" disabled={!num(a) || (adding === 'blood_pressure' && !num(b))} /></El>
              <Pressable onPress={() => setAdding(null)} accessibilityRole="button" style={{ alignItems: 'center', padding: space.md }}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>{w('cancel')}</Text></Pressable>
            </View>
          ) : (
            <View style={{ marginTop: space.lg }}><El page={page} id="addReading"><Button label={w('addReading')} onPress={() => open('heart_rate')} icon="add" /></El></View>
          )}
        </>
      ) : data.recent.length ? (
        data.recent.map((r) => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{w(r.kind)}</Text>
              <Text style={{ fontSize: 16, color: colors.ink }}>{text(r.kind, r)}</Text>
            </View>
            <Text style={[type.small, { color: colors.muted }]}>{when(r.recorded_at)}</Text>
          </Card>
        ))
      ) : (
        <Text style={[type.body, { color: colors.muted }]}>{w('empty')}</Text>
      )}
    </Screen>
  );
}

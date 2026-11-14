import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { getHealthStatus, getHealthSummary, sendCheckin, type HealthStatus, type HealthSummary } from '../../../api/health';
import { Bar, Figure, ListRow, Notice, Panel, Pill, Section } from '../../../components/blocks';
import { Button, ChoiceChips, ErrorText, Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { useLanguage, useT } from '../../../i18n';
import { El, useAction, useField, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, size, space, type } from '../../../theme/tokens';
import { healthIndex as page } from '../pages';

export default function HealthIndex() {
  const w = usePageWords(page);
  const t = useT();
  const lang = useLanguage();
  const navigate = useNavigate();
  const { status } = useStore(sessionStore);
  const [st, setSt] = useState<HealthStatus | null>(null);
  const [sum, setSum] = useState<HealthSummary | null>(null);
  const [feeling, setFeeling] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getHealthStatus().then(setSt).catch(() => setError(t('error.network')));
    getHealthSummary().then(setSum).catch(() => undefined);
  }, [t]);
  useFocusEffect(
    useCallback(() => {
      if (status === 'in') load(); // wait until the saved sign-in has been checked, so the requests carry a token
    }, [status, load])
  );

  const answer = useCallback(
    async (moved: boolean) => {
      setError(null);
      try {
        await sendCheckin(moved, feeling ? Number(feeling) : undefined);
        load();
      } catch {
        setError(t('error.generic'));
      }
    },
    [feeling, load, t]
  );

  useField(page, 'feeling', feeling, (v) => setFeeling(String(v)));
  useAction(page, 'movedYes', () => answer(true));
  useAction(page, 'movedNo', () => answer(false));
  useAction(page, 'startWalk', () => navigate('health.walk'));
  useAction(page, 'history', () => navigate('health.history'));
  useAction(page, 'card', () => navigate('health.card'));
  useAction(page, 'records', () => navigate('grow.health'));
  useAction(page, 'help', () => navigate('health.help'));

  const weekMinutes = sum?.week_minutes ?? 0;
  const more = sum ? weekMinutes - sum.last_week_minutes : 0;
  const day = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(lang, { weekday: 'narrow' });
  const maxMin = Math.max(30, ...(st?.week ?? []).map((d) => d.minutes));

  usePageData(
    page,
    st === null
      ? null
      : {
          values: [
            { label: w('moved_q'), value: st.answered ? (st.moved ? w('yes') : w('no')) : '—' },
            { label: w('streak_0'), value: st.streak ? (st.streak === 1 ? w('streak_one') : w('streak_n', { n: st.streak })) : w('streak_0') },
            { label: w('this_week'), value: `${weekMinutes} ${w('minutes')}` },
          ],
          images: [],
          lists: [],
          actions: [],
        }
  );

  return (
    <Screen title={w('heading')} subtitle={w('intro')}>
      <ErrorText>{error}</ErrorText>

      <Panel tone={st && !st.answered ? 'soft' : undefined}>
        <Text style={[type.h2, { color: colors.ink }]}>{w('moved_q')}</Text>
        {st?.answered ? (
          <View style={{ marginTop: space.sm, gap: space.sm }}>
            <Text style={[type.body, { color: colors.ink }]}>{st.moved ? w('answered_yes') : w('answered_no')}</Text>
            <Pill text={st.streak ? (st.streak === 1 ? w('streak_one') : w('streak_n', { n: st.streak })) : w('streak_0')} />
            <Text style={[type.small, { color: colors.muted }]}>{w('change')}</Text>
          </View>
        ) : null}
        <View style={{ marginTop: space.md }}>
          <El page={page} id="feeling">
            <ChoiceChips label={`${w('feeling_q')}  (${w('feeling_low')} 1 – 5 ${w('feeling_good')})`} options={['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v }))} value={feeling || null} onChange={setFeeling} />
          </El>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <El page={page} id="movedYes">
                <Button label={w('yes')} onPress={() => answer(true)} icon="walk-outline" />
              </El>
            </View>
            <View style={{ flex: 1 }}>
              <El page={page} id="movedNo">
                <Button label={w('no')} kind="plain" onPress={() => answer(false)} />
              </El>
            </View>
          </View>
        </View>
      </Panel>

      <Section title={w('this_week')}>
        <Panel>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, height: size.chart + space.xl }}>
            {(st?.week ?? []).map((d) => (
              <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
                <View style={{ width: '100%', height: Math.max(space.xs, Math.round((d.minutes / maxMin) * size.chart)), borderRadius: space.xs, backgroundColor: d.minutes ? colors.accent : d.moved ? colors.accentLine : colors.accentSoft }} />
                <Text style={[type.small, { color: colors.muted }]}>{day(d.day)}</Text>
              </View>
            ))}
          </View>
          {sum && more > 0 ? <Text style={[type.small, { color: colors.accent, fontWeight: '700', marginTop: space.sm }]}>{w('more_than_last', { n: more })}</Text> : null}
        </Panel>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Figure icon="time-outline" n={weekMinutes} label={w('minutes')} />
          <Figure icon="footsteps-outline" n={sum?.week_steps ?? 0} label={w('steps')} />
          <Figure icon="walk-outline" n={sum?.week_walks ?? 0} label={w('walks')} />
        </View>
        <View style={{ height: space.sm }} />
        <Bar value={Math.min(1, weekMinutes / 150)} />
      </Section>

      <View style={{ marginTop: space.lg, gap: space.sm }}>
        <El page={page} id="startWalk">
          <Button label={w('start_walk')} icon="play" onPress={() => navigate('health.walk')} />
        </El>
        <El page={page} id="history">
          <ListRow icon="stats-chart-outline" i={0} title={w('history')} right={<Ionicons name="chevron-forward" size={size.icon.md} color={colors.muted} />} onPress={() => navigate('health.history')} />
        </El>
        <El page={page} id="coach">
          <Panel tone="soft">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs }}>
              <Ionicons name="body-outline" size={size.icon.lg} color={colors.accent} />
              <Text style={[type.h2, { color: colors.ink, flex: 1 }]}>{w('coach_title')}</Text>
              <Pill text={w('soon')} tone="warn" />
            </View>
            <Text style={[type.body, { color: colors.ink }]}>{w('coach_body')}</Text>
            <Text style={[type.small, { color: colors.accent, fontWeight: '700', marginTop: space.sm }]}>{w('coach_by')}</Text>
          </Panel>
        </El>
        <El page={page} id="card">
          <ListRow icon="medkit-outline" i={1} title={w('card_title')} right={<Ionicons name="chevron-forward" size={size.icon.md} color={colors.muted} />} onPress={() => navigate('health.card')} />
        </El>
        <El page={page} id="records">
          <ListRow icon="pulse-outline" i={3} title={w('records')} right={<Ionicons name="chevron-forward" size={size.icon.md} color={colors.muted} />} onPress={() => navigate('grow.health')} />
        </El>
        <El page={page} id="help">
          <Button label={w('help_btn')} kind="danger" icon="alert-circle-outline" onPress={() => navigate('health.help')} />
        </El>
      </View>

      <View style={{ marginTop: space.lg }}>
        <Notice text={w('not_medical')} />
      </View>
    </Screen>
  );
}

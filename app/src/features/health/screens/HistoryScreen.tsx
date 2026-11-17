import { useFocusLive, useSavedState } from '../../../core/useFocusLive';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { deleteWalk, getWalks, type Walk, type WalkTotals } from '../../../api/health';
import { Empty, Figure, ListRow, Section } from '../../../components/blocks';
import { ErrorText } from '../../../components/ui';
import { BackScreen } from '../../../components/BackButton';
import { useStore } from '../../../core/store';
import { useLanguage, useT } from '../../../i18n';
import { usePageData, usePageWords } from '../../../kit';
import { sessionStore } from '../../../session/store';
import { colors, size, space, type } from '../../../theme/tokens';
import { healthHistory as page } from '../pages';
import { clock, km, minutes } from '../format';

export default function HistoryScreen() {
  const w = usePageWords(page);
  const t = useT();
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [data, setData] = useSavedState<{ walks: Walk[]; this_week: WalkTotals; last_week: WalkTotals } | null>('health.history.data', null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getWalks().then(setData).catch(() => setError(t('error.network')));
  }, [t]);
  useFocusLive(
    useCallback(() => {
      if (status === 'in') load();
    }, [status, load])
  );

  const remove = async (id: string) => {
    try {
      await deleteWalk(id);
      load();
    } catch {
      setError(t('error.generic'));
    }
  };

  usePageData(
    page,
    data === null
      ? null
      : {
          values: [
            { label: `${w('this_week')} · ${w('walks')}`, value: String(data.this_week.walks) },
            { label: `${w('this_week')} · ${w('distance')}`, value: `${km(data.this_week.distance_m)} ${w('km')}` },
          ],
          images: [],
          lists: [],
          actions: [],
        }
  );

  const when = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <BackScreen title={w('heading')}>
      <ErrorText>{error}</ErrorText>
      <Section title={w('this_week')}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Figure icon="walk-outline" n={data?.this_week.walks ?? 0} label={w('walks')} />
          <Figure icon="navigate-outline" n={km(data?.this_week.distance_m ?? 0)} label={w('km')} />
          <Figure icon="time-outline" n={data?.this_week.minutes ?? 0} label={w('minutes')} />
        </View>
      </Section>
      <Section title={w('last_week')}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Figure icon="walk-outline" n={data?.last_week.walks ?? 0} label={w('walks')} />
          <Figure icon="navigate-outline" n={km(data?.last_week.distance_m ?? 0)} label={w('km')} />
          <Figure icon="time-outline" n={data?.last_week.minutes ?? 0} label={w('minutes')} />
        </View>
      </Section>
      <View style={{ marginTop: space.lg }}>
        {data && data.walks.length === 0 ? <Empty text={w('no_walks')} /> : null}
        {(data?.walks ?? []).map((x) => (
          <ListRow
            key={x.id}
            icon="walk-outline"
            title={`${km(x.distance_m)} ${w('km')} · ${clock(x.moving_s)}`}
            sub={`${when(x.started_at)} · ${x.steps} ${w('steps')} · ${minutes(x.moving_s)} ${w('minutes')}`}
            right={
              <Pressable onPress={() => remove(x.id)} accessibilityRole="button" accessibilityLabel={w('remove')} hitSlop={8} style={{ minHeight: size.touch, justifyContent: 'center' }}>
                <Text style={[type.small, { color: colors.danger, fontWeight: '700' }]}>{w('remove')}</Text>
              </Pressable>
            }
          />
        ))}
      </View>
    </BackScreen>
  );
}

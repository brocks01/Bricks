import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { getProgress, type ProgressData } from '../../../../api/grow';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { Card, WeekBars } from '../../ui';
import { growProgress as page } from './page';

// My Progress (sample 11, screen 7): a kind overview of what the person has done in Grow, counts and totals only. It never says "behind" and never gives a score.
export default function Progress() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const { status } = useStore(sessionStore);
  const [d, setD] = useState<ProgressData | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    getProgress()
      .then((x) => {
        setFailed(false);
        setD(x);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);

  const rows = d
    ? [
        { icon: 'walk-outline' as const, text: w('p_activity', { n: d.activity.week_minutes }), to: 'grow.activity' as const },
        { icon: 'heart-outline' as const, text: w('p_health', { n: d.health.readings_this_month }), to: 'grow.health' as const },
        { icon: 'flag-outline' as const, text: w('p_aspirations', { done: d.aspirations.done, total: d.aspirations.total }), to: 'grow.aspirations' as const },
        { icon: 'compass-outline' as const, text: w('p_explore', { started: d.explore.started, completed: d.explore.completed }), to: 'explore.mine' as const },
        { icon: 'people-outline' as const, text: w('p_contributions', { n: d.contributions.count, h: d.contributions.hours }), to: 'grow.contributions' as const },
      ]
    : [];

  usePageData(
    page,
    d === null
      ? null
      : {
          values: rows.map((r) => ({ label: r.text, value: '' })),
          images: [],
          lists: [],
          actions: rows.map((r, i) => ({ id: `open${i + 1}`, label: r.text, run: () => { navigate(r.to); } })),
        }
  );

  return (
    <Screen title={w('heading')} back>
      <Card tone="soft"><Text style={{ fontSize: 16.5, fontWeight: '700', color: colors.ink }}>{w('prog_intro')}</Text></Card>
      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginVertical: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : d === null ? (
        <SkeletonList count={4} />
      ) : (
        <>
          <WeekBars days={d.activity.days} />
          {rows.map((r) => (
            <Pressable key={r.to} onPress={() => navigate(r.to)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}>
              <Ionicons name={r.icon} size={24} color={colors.accent} />
              <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>{r.text}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
          <Text style={[type.small, { color: colors.accent, textAlign: 'center', marginTop: space.md }]}>{w('keepGoing')}</Text>
        </>
      )}
    </Screen>
  );
}

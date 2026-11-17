import { useEffect, useState } from 'react';
import { useLiveEpoch } from '../../core/useFocusLive';
import { Text, View } from 'react-native';
import { getStanding, type Standing } from '../../api/communities';
import { Pill } from '../../components/blocks';
import { useT } from '../../i18n';
import { colors, radius, space, type } from '../../theme/tokens';

/** How often the person comes to this community: this month, the streak, and their level. Only showing up counts, and only people who have come at least once see it. */
export function StandingCard({ communityId }: { communityId: string }) {
  const t = useT();
  const [s, setS] = useState<Standing | null>(null);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    getStanding(communityId).then(setS).catch(() => setS(null));
  }, [communityId, liveEpoch]);
  if (!s || s.total === 0) return null;
  const w = (k: string, vars?: Record<string, string | number>) => t(`community.home.${k}`, vars);
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginTop: space.lg, gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[type.h2, { color: colors.ink }]}>{w('standingTitle')}</Text>
        <Pill text={w(`level_${s.level}`)} tone={s.level === 'newcomer' ? 'quiet' : 'soft'} />
      </View>
      <Text style={[type.body, { color: colors.ink }]}>{w('standingMonth', { n: s.this_month })}</Text>
      {s.day_streak >= 2 ? <Text style={[type.small, { color: colors.leaf, fontWeight: '700' }]}>{w('standingDays', { n: s.day_streak })}</Text> : s.week_streak >= 2 ? <Text style={[type.small, { color: colors.leaf, fontWeight: '700' }]}>{w('standingWeeks', { n: s.week_streak })}</Text> : null}
      {s.regulars.length > 1 ? (
        <Text style={[type.small, { color: colors.muted }]}>{w('regularsTitle')}: {s.regulars.map((r) => `${r.name} (${r.times})`).join(', ')}</Text>
      ) : null}
    </View>
  );
}

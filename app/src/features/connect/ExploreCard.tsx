import { Pressable, Text, View } from 'react-native';
import type { ExploreCommunity } from '../../api/communityRules';
import { Panel, Pill, Tile } from '../../components/blocks';
import { Button } from '../../components/ui';
import { colors, space, type } from '../../theme/tokens';

type W = (k: string, vars?: Record<string, string | number>) => string;
type T = (key: string, vars?: Record<string, string | number>) => string;

/**
 * One community in explore: its name, how many are in it, who it is for (its audience badge), what brings it together (its feeling in
 * words) and, for a circle brought in from a host, where it came from. The right side is the way in: join, or (when the person is
 * already in it) the way out. A member can read a circle, so this shows only what explore is allowed to show.
 */
export function ExploreCard({ c, i, w, t, full, onOpen, onJoin, onLeave }: {
  c: ExploreCommunity; i: number; w: W; t: T; full: boolean;
  onOpen?: () => void; onJoin: () => void; onLeave: () => void;
}) {
  const badge = c.audience === 'men' ? w('audience_men') : c.audience === 'women' ? w('audience_women') : w('audience_all');
  const sub = [t('common.members', { n: c.member_count }), c.area_name, c.family_here.length ? w('family_here_n', { n: c.family_here.length }) : ''].filter(Boolean).join(' · ');
  const detail = [w(`circle_${c.circle}`), c.source === 'imported' && c.host_name ? w('brought_in', { host: c.host_name }) : ''].filter(Boolean).join(' · ');
  const right = c.joined ? (
    <View style={{ alignItems: 'flex-end', gap: space.xs }}>
      <Pill text={w('joined_c')} />
      <Text accessibilityRole="button" onPress={onLeave} style={[type.small, { color: colors.danger, fontWeight: '700', paddingVertical: space.xs }]}>{w('leave_c')}</Text>
    </View>
  ) : c.can_join ? (
    <View style={{ minWidth: 88 }}><Button label={w('join_c')} onPress={onJoin} /></View>
  ) : c.privacy === 'invite' ? (
    <View style={{ maxWidth: 140 }}><Text style={[type.small, { color: colors.muted }]}>{w('invite_only')}</Text></View>
  ) : full ? (
    <View style={{ maxWidth: 110 }}><Text style={[type.small, { color: colors.warn, fontWeight: '700' }]}>{w('leave_first')}</Text></View>
  ) : null;
  return (
    <Panel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {/* Only the left part is a button when it opens the circle, so the Join button beside it is never inside another button. */}
        <Pressable onPress={onOpen} disabled={!onOpen} accessibilityRole="button" accessibilityLabel={c.name} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <Tile icon="people-outline" i={i} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }} numberOfLines={2}>{c.name}</Text>
            <View><Pill text={badge} /></View>
            {sub ? <Text style={[type.small, { color: colors.muted }]} numberOfLines={2}>{sub}</Text> : null}
            {detail ? <Text style={[type.small, { color: colors.muted }]} numberOfLines={2}>{detail}</Text> : null}
          </View>
        </Pressable>
        <View style={{ alignItems: 'flex-end' }}>{right}</View>
      </View>
    </Panel>
  );
}

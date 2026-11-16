import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { exploreCommunities, recommendedCommunities, type CommunityCard as Card } from '../../../../api/communityRules';
import { SkeletonList } from '../../../../components/Skeleton';
import { Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useT } from '../../../../i18n';
import { El, useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space } from '../../../../theme/tokens';
import { CommunityCard } from '../../CommunityCard';
import { useJoin } from '../../useJoin';
import { connectPick as page } from '../../pages';

/**
 * After onboarding: the ten communities that suit the person best (what they enjoy, how near they live), and they choose up to three.
 * Room is three minus the communities they are already in; when it is full the other cards dim and one calm line says why.
 * If the ranking cannot be loaded, the plain list of open communities is shown instead of an error wall.
 */
export default function Pick() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const [list, setList] = useState<Card[] | null>(null);
  const [room, setRoom] = useState(3);
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [joinedNow, setJoinedNow] = useState<string[]>([]);
  const joiner = useJoin(useCallback((c) => setJoinedNow((j) => [...j, c.id]), []));

  useEffect(() => {
    if (status !== 'in') return;
    recommendedCommunities('', 10)
      .then((r) => { setRoom(r.limits.left); setList(r.communities); })
      .catch(() =>
        // the plain list, shaped like cards, rather than an error
        exploreCommunities('')
          .then((r) => {
            setRoom(r.limits.left);
            setList(r.communities.filter((c) => c.privacy === 'open' && !c.joined).slice(0, 10).map((c) => ({
              ...c, host_name: c.host_name ?? null, address: c.area_name, interests: [], faces: [], leader: null, leader_name: null, next_event: null,
              distance_km: null, reasons: [], is_member: false, can_manage: false, has_whatsapp: false, whatsapp_url: null, events_url: null,
            })));
          })
          .catch(() => setList([])));
  }, [status]);

  const full = chosen.length >= room;
  const toggle = (id: string) => {
    joiner.clear();
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= room ? c : [...c, id]));
  };
  const home = () => go('home.index', {}, { replace: true });
  const next = async () => {
    if (busy) return;
    if (!chosen.length) return home();
    setBusy(true);
    let all = true;
    for (const id of chosen) {
      if (joinedNow.includes(id)) continue;
      const c = (list ?? []).find((x) => x.id === id);
      if (c && !(await joiner.join(c))) { all = false; break; } // a question (men-only or women-only) or a refusal: stay and show it
    }
    setBusy(false);
    if (all) home();
  };
  useAction(page, 'pickContinue', next);
  useAction(page, 'pickSkip', home);

  return (
    <Screen title={w('heading')} hero={
      <View style={{ marginBottom: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' }}>
          <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '800', color: colors.ink }}>{w('heading')}</Text>
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 18, fontWeight: '700', color: colors.navy }}>{t('rv.pick_count', { n: chosen.length, max: room })}</Text>
        </View>
        <Text style={{ fontSize: 18, lineHeight: 26, color: colors.ink, marginTop: space.sm }}>{t('rv.pick_sub')}</Text>
      </View>
    }>
      {list === null ? <SkeletonList count={3} /> : null}
      {list && list.length === 0 ? <Text style={{ fontSize: 18, color: colors.ink }}>{t('rv.pick_none')}</Text> : null}
      {full && room > 0 ? (
        <View style={{ backgroundColor: colors.navySoft, borderRadius: radius.button, padding: space.md, marginBottom: space.md }}>
          <Text style={{ fontSize: 17, lineHeight: 24, color: colors.navy }}>{t('rv.pick_full')}</Text>
        </View>
      ) : null}
      {room === 0 ? (
        <View style={{ backgroundColor: colors.navySoft, borderRadius: radius.button, padding: space.md, marginBottom: space.md }}>
          <Text style={{ fontSize: 17, lineHeight: 24, color: colors.navy }}>{t('rv.pick_full')}</Text>
        </View>
      ) : null}
      <View style={{ gap: space.md }}>
        {(list ?? []).map((c) => {
          const on = chosen.includes(c.id);
          return (
            <CommunityCard key={c.id} c={c} chosen={on} dim={!on && full} onChoose={() => toggle(c.id)}
              onOpen={() => go('community.home', { id: c.id })} onEvents={() => go('community.events', { id: c.id })} />
          );
        })}
      </View>
      {joiner.askNode ? <View style={{ marginTop: space.lg }}>{joiner.askNode}</View> : null}
      {joiner.error ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, color: colors.danger, fontWeight: '600', marginTop: space.md }}>{joiner.error}</Text> : null}
      <El page={page} id="pickContinue">
        <Pressable onPress={() => void next()} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }}
          style={({ pressed }) => ({ minHeight: 60, borderRadius: radius.button, backgroundColor: colors.accent, opacity: busy ? 0.6 : pressed ? 0.85 : 1, alignItems: 'center', justifyContent: 'center', marginTop: space.xl, paddingHorizontal: space.lg })}>
          <Text style={{ fontSize: 19, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>{chosen.length ? w('pickContinue') : t('rv.pick_home')}</Text>
        </Pressable>
      </El>
      {chosen.length ? (
        <El page={page} id="pickSkip">
          <Pressable onPress={home} accessibilityRole="button" style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center', marginTop: space.sm }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.navy, textDecorationLine: 'underline' }}>{w('pickSkip')}</Text>
          </Pressable>
        </El>
      ) : null}
    </Screen>
  );
}

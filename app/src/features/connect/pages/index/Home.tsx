// The Communities tab, kept simple: a greeting, what is next with who is going, the groups you have joined, and one button to start another.
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getMyCommunities, getUpcoming, setGoing, type MyCommunity, type Upcoming } from '../../../../api/communities';
import { Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { languageStore } from '../../../../i18n/store';
import { usePageData, usePageWords } from '../../../../kit';
import type { PageDataAction } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { connectIndex as page } from './page';

const LOCALE: Record<string, string> = { en: 'en-SG', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-SG', zh: 'zh-SG', ms: 'ms-SG' };

export default function CommunitiesHome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { user } = useStore(sessionStore);
  const { code } = useStore(languageStore);
  const [mine, setMine] = useState<MyCommunity[] | null>(null);
  const [next, setNext] = useState<Upcoming[]>([]);
  const locale = LOCALE[code] ?? 'en-SG';
  const name = user?.display_name ?? '';

  const load = useCallback(async () => {
    const [m, u] = await Promise.all([getMyCommunities().catch(() => [] as MyCommunity[]), getUpcoming(20).catch(() => [] as Upcoming[])]);
    setMine(m);
    setNext(u);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const hour = new Date().getHours();
  const greeting = w(hour < 12 ? 'c_morning' : hour < 18 ? 'c_afternoon' : 'c_evening', { name });
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  const when = (iso: string) => {
    const d = new Date(iso);
    const mins = Math.round((d.getTime() - Date.now()) / 60000);
    const t = time(iso);
    if (mins > 0 && mins < 60) return w('c_in_min', { n: mins });
    const day0 = new Date(); day0.setHours(0, 0, 0, 0);
    const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - day0.getTime()) / 86400000);
    if (days <= 0) return w('c_today', { t });
    if (days === 1) return w('c_tomorrow', { t });
    return w('c_on', { d: d.toLocaleDateString(locale, { weekday: 'short' }), t });
  };
  const first = next[0];
  const nextFor = (cid: string) => next.find((a) => a.community_id === cid);

  const toggleGoing = async (a: Upcoming) => {
    try { await setGoing(a.id, !a.i_going); await load(); } catch { /* the button just stays as it was */ }
  };

  const actions: PageDataAction[] = [
    ...(first ? [{ id: 'imGoing', label: `${first.title}: ${first.i_going ? w('c_isgoing') : w('c_imgoing')}`, run: () => void toggleGoing(first) }] : []),
    ...(mine ?? []).map((c, k) => ({ id: `community${k + 1}`, label: c.name, run: () => { go('community.home', { id: c.id }); } })),
    { id: 'startCommunity', label: w('c_start'), run: () => { go('connect.create'); } },
    { id: 'findGroups', label: w('c_find'), run: () => { go('connect.pick'); } },
  ];
  usePageData(page, mine ? {
    values: [{ label: greeting, value: first ? `${first.title} ${when(first.starts_at)}. ${w('c_going', { n: first.going_count })}` : w('c_next_none') }],
    images: [],
    lists: [{ label: w('c_title'), items: mine.map((c) => ({ label: c.name, detail: `${c.area_name ?? ''} · ${c.member_count}` })) }],
    actions,
  } : null);

  return (
    <Screen title="" hero={<Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: colors.muted, marginBottom: space.md }}>{greeting}</Text>}>
      {first ? (
        <View style={{ backgroundColor: colors.navy, borderRadius: radius.card, padding: space.lg, marginBottom: space.lg }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.card }}>{first.title} {when(first.starts_at)}.</Text>
          <Text style={{ fontSize: 16, color: '#D6DCE8', marginTop: 4 }}>
            {w('c_going', { n: first.going_count })}.{first.going_names[0] ? ` ${w('c_waiting', { name: first.going_names[0] })}` : ''}
          </Text>
          <Pressable onPress={() => void toggleGoing(first)} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: space.md, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: first.i_going ? colors.accentSoft : colors.gold }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: first.i_going ? colors.accentDark : colors.ink }}>{first.i_going ? `✓ ${w('c_isgoing')}` : w('c_imgoing')}</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: space.sm }}>{w('c_title')}</Text>
      {mine && !mine.length ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.md }}>
          <Text style={[type.body, { color: colors.muted }]}>{w('c_none')}</Text>
        </View>
      ) : null}
      {(mine ?? []).map((c) => {
        const a = nextFor(c.id);
        const place = a?.location || c.area_name || '';
        const schedule = a ? `${new Date(a.starts_at).toLocaleDateString(locale, { weekday: 'short' })} ${time(a.starts_at)}` : '';
        return (
          <Pressable key={c.id} onPress={() => { go('community.home', { id: c.id }); }} accessibilityRole="button" style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}>
            <Text style={{ fontSize: 19, fontWeight: '800', color: colors.navy }}>{c.name}</Text>
            {place || schedule ? <Text style={[type.small, { color: colors.muted, marginTop: 2 }]}>{[place, schedule].filter(Boolean).join(' · ')}</Text> : null}
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.accent, marginTop: 4 }}>{a ? w('c_going', { n: a.going_count }) : w('c_members', { n: c.member_count })} · {w('c_joined')}</Text>
          </Pressable>
        );
      })}

      <Pressable onPress={() => { go('connect.create'); }} accessibilityRole="button" style={{ minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.button, backgroundColor: '#EDE6DA', marginTop: space.xs }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.navy }}>{w('c_start')}</Text>
      </Pressable>
      <Pressable onPress={() => { go('connect.pick'); }} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: space.sm }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>{w('c_find')}</Text>
      </Pressable>
      <Pressable onPress={() => { go('connect.more'); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.muted }}>{w('c_more')}</Text>
      </Pressable>
    </Screen>
  );
}

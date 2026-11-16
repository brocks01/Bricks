// The Communities tab (revamp v2): a search bar, the person's own communities ("2 of 3"), then the ones picked for them.
// Every community is the same card (CommunityCard): its words on the left, its picture on the right, Join WhatsApp group and See events.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { myCommunityCards, recommendedCommunities, type CommunityCard as Card } from '../../../../api/communityRules';
import { SkeletonList } from '../../../../components/Skeleton';
import { Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useT } from '../../../../i18n';
import { El, useField, usePageData, usePageWords } from '../../../../kit';
import type { PageDataAction } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space } from '../../../../theme/tokens';
import { CommunityCard } from '../../CommunityCard';
import { useJoin } from '../../useJoin';
import { connectIndex as page } from './page';

function Heading({ text, right }: { text: string; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md, marginTop: space.xl, marginBottom: space.md }}>
      <Text accessibilityRole="header" style={{ flexShrink: 1, fontSize: 24, fontWeight: '800', color: colors.ink }}>{text}</Text>
      {right ? <Text style={{ fontSize: 18, fontWeight: '700', color: colors.navy }}>{right}</Text> : null}
    </View>
  );
}

function Calm({ text, button, onPress }: { text: string; button?: string; onPress?: () => void }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md }}>
      <Text style={{ fontSize: 18, lineHeight: 26, color: colors.ink }}>{text}</Text>
      {button && onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.button, backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg })}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>{button}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PlainRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, borderRadius: radius.button, backgroundColor: pressed ? colors.navySoft : 'transparent' })}>
      <Ionicons name={icon} size={24} color={colors.navy} />
      <Text style={{ flex: 1, fontSize: 18, fontWeight: '600', color: colors.navy }}>{label}</Text>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </Pressable>
  );
}

export default function CommunitiesHome() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const [mine, setMine] = useState<Card[] | null>(null);
  const [picked, setPicked] = useState<Card[] | null>(null);
  const [used, setUsed] = useState(0);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ q: string; list: Card[] } | null>(null);
  const searchSeq = useRef(0);
  useField(page, 'search', q, (v) => setQ(String(v ?? '')));

  const load = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([myCommunityCards(), recommendedCommunities('', 10)]);
      setMine(m);
      setPicked(r.communities);
      setUsed(r.limits.used);
      setFailed(false);
    } catch {
      setFailed(true); // a failed request is not the same as "no communities yet"
    }
  }, []);
  useFocusEffect(useCallback(() => { if (status === 'in') void load(); }, [status, load]));
  const joiner = useJoin(useCallback(() => { void load(); }, [load]));

  // search as the person types, after a short pause; the results replace the two lists
  useEffect(() => {
    const text = q.trim();
    if (!text) return;
    const mySeq = ++searchSeq.current;
    const timer = setTimeout(() => {
      recommendedCommunities(text, 20)
        .then((r) => {
          if (mySeq !== searchSeq.current) return;
          // my own communities match too: search them here, so a person can find their own group by typing its name
          const own = (mine ?? []).filter((c) => [c.name, c.area_name, c.address, c.description].some((x) => (x ?? '').toLowerCase().includes(text.toLowerCase())));
          setResults({ q: text, list: [...own, ...r.communities] });
        })
        .catch(() => { if (mySeq === searchSeq.current) setResults({ q: text, list: [] }); });
    }, 300);
    return () => clearTimeout(timer);
  }, [q, mine]);

  const found = results && results.q === q.trim() ? results.list : null;
  const card = (c: Card) => (
    <CommunityCard key={c.id} c={c}
      onOpen={() => go('community.home', { id: c.id })}
      onEvents={() => go('community.events', { id: c.id })}
      onJoin={() => void joiner.join(c)}
      onAddWhatsapp={c.can_manage ? () => go('community.home', { id: c.id }) : undefined} />
  );

  const actions: PageDataAction[] = [
    ...(mine ?? []).map((c, k) => ({ id: `community${k + 1}`, label: c.name, run: () => { go('community.home', { id: c.id }); } })),
    ...(mine ?? []).map((c, k) => ({ id: `events${k + 1}`, label: `${t('rv.see_events')}: ${c.name}`, run: () => { go('community.events', { id: c.id }); } })),
    ...(picked ?? []).map((c, k) => ({ id: `join${k + 1}`, label: `${t('rv.join')}: ${c.name}`, run: () => { void joiner.join(c); } })),
    { id: 'seeForYou', label: t('rv.see_for_you'), run: () => { go('connect.pick'); } },
  ];
  usePageData(page, mine && picked ? {
    values: [{ label: t('rv.yours'), value: t('rv.of_three', { n: used }) }],
    images: [],
    lists: [
      { label: t('rv.yours'), items: mine.map((c) => ({ label: c.name, detail: c.next_event ? c.next_event.title : t('rv.none_planned') })) },
      { label: t('rv.picked'), items: picked.map((c) => ({ label: c.name, detail: t('rv.members', { n: c.member_count }) })) },
    ],
    actions,
  } : null);

  return (
    <Screen title={t('rv.tab_title')} hero={
      <View>
        <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: space.md }}>{t('rv.tab_title')}</Text>
        <El page={page} id="search">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56, borderRadius: radius.button, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: space.md }}>
            <Ionicons name="search" size={24} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder={t('rv.search')} placeholderTextColor={colors.muted} accessibilityLabel={t('rv.search')}
              returnKeyType="search" style={{ flex: 1, fontSize: 18, color: colors.ink, paddingVertical: space.sm }} />
            {q ? (
              <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel={t('rv.clear')} hitSlop={10} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close-circle" size={26} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </El>
      </View>
    }>
      {joiner.askNode ? <View style={{ marginTop: space.lg }}>{joiner.askNode}</View> : null}
      {joiner.error ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, fontWeight: '600', color: colors.danger, marginTop: space.md }}>{joiner.error}</Text> : null}
      {joiner.note ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, fontWeight: '600', color: '#1F7A3F', marginTop: space.md }}>{joiner.note}</Text> : null}

      {q.trim() ? (
        <View>
          <View style={{ height: space.lg }} />
          {found === null ? <SkeletonList count={2} /> : null}
          {found && !found.length ? <Calm text={t('rv.no_match', { q: q.trim() })} button={t('rv.ask_start')} onPress={() => go('connect.create')} /> : null}
          <View style={{ gap: space.md }}>{(found ?? []).map(card)}</View>
        </View>
      ) : failed ? (
        <View style={{ marginTop: space.lg }}><Calm text={t('rv.failed')} button={t('rv.try_again')} onPress={() => void load()} /></View>
      ) : (
        <View>
          <Heading text={t('rv.yours')} right={t('rv.of_three', { n: used })} />
          {mine === null ? <SkeletonList count={2} /> : null}
          {mine && !mine.length ? <Calm text={t('rv.none_yours')} button={t('rv.see_for_you')} onPress={() => go('connect.pick')} /> : null}
          <View style={{ gap: space.md }}>{(mine ?? []).map(card)}</View>

          <Heading text={t('rv.picked')} />
          {picked === null ? <SkeletonList count={2} /> : null}
          {picked && !picked.length ? <Calm text={t('rv.none_picked')} /> : null}
          <View style={{ gap: space.md }}>{(picked ?? []).map(card)}</View>
        </View>
      )}

      <View style={{ marginTop: space.xl, gap: space.xs, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md }}>
        <El page={page} id="joinOrCreate"><PlainRow icon="key-outline" label={t('rv.have_code')} onPress={() => go('connect.join')} /></El>
        <El page={page} id="askStart"><PlainRow icon="add-circle-outline" label={t('rv.start_one')} onPress={() => go('connect.create')} /></El>
        <PlainRow icon="ellipsis-horizontal-circle-outline" label={w('c_more')} onPress={() => go('connect.more')} />
      </View>
    </Screen>
  );
}

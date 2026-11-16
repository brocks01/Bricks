import { SuggestionsCard } from '../../SuggestionsCard';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getMyCommunities, getUpcoming, setGoing, type MyCommunity, type Upcoming } from '../../../../api/communities';
import { getStalls, type Stall } from '../../../../api/market';
import { SkeletonList } from '../../../../components/Skeleton';
import { Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage, useT } from '../../../../i18n';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import '../../../lead/leadWords'; // registers the words of the first-run page
import '../../cardWords'; // registers the words of the cards
import { CommunityCard, ListEntry, MarketDayCard } from '../../CommunityCards';
import { connectIndex as page } from './page';

// The Communities tab, laid out like the owner's design: how many places are used, the next Market Day, one card per community (its next gathering and how many
// are going), "Happening near you", and a short list at the bottom (explore, join with a code, the marketplace, ask to start one). Everything comes from the database.
export default function ConnectIndex() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const t = useT();
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [mine, setMine] = useState<MyCommunity[] | null>(null);
  const [soon, setSoon] = useState<Upcoming[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  useEffect(() => {
    if (status !== 'in') return; // wait until the saved sign-in has been checked, so the requests carry a token
    getMyCommunities().then(setMine).catch(() => setMine([]));
    getUpcoming(10)
      .then((l) => {
        setSoon(l);
        const market = l.find((a) => a.category === 'Market');
        if (market) getStalls(market.id).then((s) => setStalls(s.stalls)).catch(() => setStalls([]));
      })
      .catch(() => setSoon([]));
  }, [status]);

  const toggle = useCallback(async (e: Upcoming) => {
    const next = !e.i_going;
    setSoon((l) => l.map((x) => (x.id === e.id ? { ...x, i_going: next } : x))); // show it at once, undo if the server refuses
    try {
      const r = await setGoing(e.id, next);
      setSoon((l) => l.map((x) => (x.id === e.id ? { ...x, going_count: r.going_count } : x)));
    } catch {
      setSoon((l) => l.map((x) => (x.id === e.id ? { ...x, i_going: !next } : x)));
    }
  }, []);

  const used = mine?.length ?? 0;
  const full = used >= 3;
  const market = soon.find((a) => a.category === 'Market');
  const nextOf = (cid: string) => soon.find((a) => a.community_id === cid);
  const when = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const empty = { backgroundColor: colors.accentSoft, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accentLine, padding: space.lg, alignItems: 'center', gap: space.sm } as const;

  // What the agent may read and press: the communities and the events really on this screen. Until this loads `read` has no data at all, which is why the agent once
  // claimed there were no communities while four were on screen. The actions run this screen's own handlers.
  usePageData(
    page,
    mine === null
      ? null
      : {
          values: [{ label: w('mine'), value: mine.length === 1 ? w('countOne') : w('countMany', { n: mine.length }) }],
          images: [],
          lists: [
            {
              label: w('mine'),
              items: mine.map((c, i) => ({
                label: c.name,
                detail: t('common.members', { n: c.member_count }),
                image: c.cover_url ? { uri: c.cover_url, alt: c.name } : undefined,
                actions: [{ id: `community${i + 1}`, label: c.name, run: () => { navigate('community.home', { id: c.id }); } }],
              })),
            },
            {
              label: w('comingUp'),
              items: soon.map((e, i) => ({
                label: e.title,
                detail: `${e.community_name} · ${when(e.starts_at)}`,
                image: e.image_url ? { uri: e.image_url, alt: e.title } : undefined,
                actions: [{ id: `rsvpEvent${i + 1}`, label: e.title, run: () => toggle(e) }],
              })),
            },
          ],
          actions: [
            { id: 'explore', label: w('explore'), run: () => { navigate('connect.explore'); } },
            { id: 'joinOrCreate', label: w('joinOrCreate'), run: () => { navigate('connect.join'); } },
            { id: 'askStart', label: w('askStart'), run: () => { navigate('connect.create'); } },
          ],
        }
  );

  return (
    <Screen title={w('heading')} subtitle={mine ? (full ? w('full_note', { max: 3 }) : w('limitInfo', { n: used, max: 3 })) : undefined}>
      <SuggestionsCard />
      {mine === null ? <SkeletonList count={3} /> : null}

      {mine && mine.length ? (
        <View style={{ gap: space.lg }}>
          {market ? <MarketDayCard act={market} stalls={stalls} lang={lang} t={t} onReserve={() => navigate('market.stall', { id: market.id })} /> : null}
          {mine.map((c, i) => (
            <El key={c.id} page={page} id={`community${i + 1}`}>
              <CommunityCard c={c} next={nextOf(c.id)} i={i} lang={lang} t={t} onOpen={() => navigate('community.home', { id: c.id })} />
            </El>
          ))}
          <Text style={[type.small, { color: '#5A6472', marginTop: -space.sm, marginHorizontal: 4 }]}>{t('cday.only_members')}</Text>
        </View>
      ) : null}

      {mine && !mine.length ? (
        <View style={empty}>
          <Ionicons name="people" size={40} color={colors.accent} />
          <El page={page} id="noCommunity"><Text style={[type.h2, { color: colors.ink, textAlign: 'center' }]}>{w('noCommunity')}</Text></El>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>{w('noCommunityBody')}</Text>
          <Pressable onPress={() => navigate('connect.pick')} accessibilityRole="button" style={{ minHeight: 52, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: space.sm }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#FFFFFF' }}>{t('lead.pick_banner')}</Text>
          </Pressable>
        </View>
      ) : null}

      {soon.length ? (
        <View style={{ marginTop: space.xl, gap: 10 }}>
          <El page={page} id="comingUp"><Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('cday.near')}</Text></El>
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: space.lg }}>
            {soon.slice(0, 6).map((e, i, all) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: i < all.length - 1 ? 1 : 0, borderColor: '#EDE6DA' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{e.title}</Text>
                  <Text style={{ fontSize: 15, color: '#4A5361' }}>{when(e.starts_at)}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.navy }}>{e.community_name}</Text>
                </View>
                <El page={page} id={`rsvpEvent${i + 1}`}>
                  <Pressable onPress={() => void toggle(e)} accessibilityRole="button" accessibilityState={{ selected: e.i_going }} style={{ minHeight: 44, minWidth: 80, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: e.i_going ? colors.navy : '#FFFFFF', borderWidth: e.i_going ? 0 : 1, borderColor: colors.navy }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: e.i_going ? '#FFFFFF' : colors.navy }}>{e.i_going ? w('rsvpGoing') : w('rsvpJoin')}</Text>
                  </Pressable>
                </El>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* The design's bottom list: one white card, rows with a title and a chevron. */}
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: space.lg, marginTop: space.xl }}>
        <El page={page} id="explore"><ListEntry title={w('explore')} onPress={() => navigate('connect.explore')} line /></El>
        <El page={page} id="joinOrCreate"><ListEntry title={w('joinOrCreate')} onPress={() => navigate('connect.join')} line /></El>
        <El page={page} id="askStart"><ListEntry title={w('askStart')} onPress={() => navigate('connect.create')} /></El>
      </View>
    </Screen>
  );
}

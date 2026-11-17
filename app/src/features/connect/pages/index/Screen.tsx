import { Ionicons } from '@expo/vector-icons';
import { useLiveEpoch } from '../../../../core/useFocusLive';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { getMyCommunities, getUpcoming, setGoing, type MyCommunity, type Upcoming } from '../../../../api/communities';
import { SkeletonList } from '../../../../components/Skeleton';
import { BackHeroScreen } from '../../BackHero';
import { useStore } from '../../../../core/store';
import { useLanguage, useT } from '../../../../i18n';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import '../../../lead/leadWords'; // registers the words of the first-run page
import '../../cardWords'; // registers the words of the cards
import { ListEntry } from '../../CommunityCards';
import { connectIndex as page } from './page';

// The Communities tab, laid out like the owner's design: how many places are used, the next Market Day, one card per community (its next gathering and how many
// are going), "Happening near you", and a short list at the bottom (explore, join with a code, the marketplace, ask to start one). Everything comes from the database.
export default function ConnectIndex() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const t = useT();
  const lang = useLanguage();
  const { status, user } = useStore(sessionStore);
  const [mine, setMine] = useState<MyCommunity[] | null>(null);
  const [soon, setSoon] = useState<Upcoming[]>([]);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (status !== 'in') return; // wait until the saved sign-in has been checked, so the requests carry a token
    getMyCommunities().then(setMine).catch(() => setMine([]));
    getUpcoming(10)
      .then((l) => {
        setSoon(l);
      })
      .catch(() => setSoon([]));
  }, [status, liveEpoch]);

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

  const featured = soon[0];
  const firstName = user?.display_name?.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const sectionTitle = { fontSize: 27, fontWeight: '700' as const, color: colors.ink };

  return (
    <BackHeroScreen
      title={w('heading')}
      hero={<View style={{ paddingBottom: space.lg }}><Text style={{ fontSize: 32, lineHeight: 39, fontWeight: '700', color: colors.navy }} accessibilityRole="header">{firstName ? `${greeting}, ${firstName}` : greeting}</Text><Text style={{ fontSize: 20, color: colors.muted, marginTop: 2 }}>{w('heading')}</Text></View>}
    >
      {mine === null ? <SkeletonList count={3} /> : null}

      {featured ? <View style={{ marginBottom: space.xl }}>
        <Text style={[type.small, { color: colors.accent, fontWeight: '700', marginBottom: space.sm }]}>{w('comingUp')}</Text>
        <Pressable onPress={() => void toggle(featured)} accessibilityRole="button" style={{ borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
          <View style={{ flexDirection: 'row', minHeight: 156 }}>
            {featured.image_url ? <Image source={{ uri: featured.image_url }} style={{ width: '42%', backgroundColor: colors.accentSoft }} resizeMode="cover" /> : <View style={{ width: '42%', backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="people-outline" size={50} color={colors.accent} /></View>}
            <View style={{ flex: 1, padding: space.lg, justifyContent: 'center', gap: 4 }}>
              <Text style={[type.small, { color: colors.accent, fontWeight: '700' }]}>{when(featured.starts_at)}</Text>
              <Text style={{ fontSize: 23, lineHeight: 27, fontWeight: '700', color: colors.ink }}>{featured.title}</Text>
              <Text style={[type.body, { color: colors.muted }]}>{featured.community_name}</Text>
              {featured.location ? <Text style={[type.small, { color: colors.muted }]} numberOfLines={1}>{featured.location}</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line }}>
            <Pressable onPress={() => void toggle(featured)} style={{ flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: featured.i_going ? colors.navy : colors.accent }}><Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{featured.i_going ? w('rsvpGoing') : w('rsvpJoin')}</Text></Pressable>
            <Pressable onPress={() => navigate('community.home', { id: featured.community_id })} style={{ flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{featured.going_count} {t('home.index.going_n', { n: featured.going_count })}</Text></Pressable>
          </View>
        </Pressable>
      </View> : null}

      {mine && mine.length ? <View style={{ marginBottom: space.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.md }}><Text style={sectionTitle}>{w('mine')}</Text><Pressable onPress={() => navigate('connect.explore')}><Text style={{ color: colors.accent, fontSize: 17, fontWeight: '700' }}>{w('explore')} ›</Text></Pressable></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {mine.slice(0, 4).map((c, i) => { const next = nextOf(c.id); return <El key={c.id} page={page} id={`community${i + 1}`}><Pressable onPress={() => navigate('community.home', { id: c.id })} accessibilityRole="button" style={{ width: '48%', minHeight: 150, padding: space.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'space-between' }}><View style={{ flexDirection: 'row', gap: space.sm }}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: i % 2 ? '#FBEFD9' : '#E3F1E7', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={i % 2 ? 'musical-notes-outline' : 'people-outline'} size={24} color={colors.accent} /></View><Text numberOfLines={2} style={{ flex: 1, fontSize: 18, lineHeight: 22, fontWeight: '700', color: colors.ink }}>{c.name}</Text></View><Text numberOfLines={1} style={[type.small, { color: colors.muted }]}>{next ? when(next.starts_at) : t('cday.none_planned')}</Text><Text style={[type.small, { color: '#276B1A', fontWeight: '700' }]}>✓ {t('common.members', { n: c.member_count })}</Text></Pressable></El>; })}
        </View>
      </View> : null}

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

      {soon.length > 1 ? (
        <View style={{ marginTop: space.xl, gap: 10 }}>
          <El page={page} id="comingUp"><Text style={sectionTitle} accessibilityRole="header">{t('cday.near')}</Text></El>
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: space.lg }}>
            {soon.slice(1, 6).map((e, i, all) => (
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
    </BackHeroScreen>
  );
}

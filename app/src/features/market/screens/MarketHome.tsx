// The Marketplace tab: events near the person. A search bar; "Your market days" (with "Did you go?" after the day); "Recommended for you",
// grouped by day and ranked on the server by the person's interests and how near the event is. Paid sessions by the hour live in Wisdom.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { getMyHosts, type MyHost } from '../../../api/hosts';
import { getMyMarket, getRecommended, markAttendance, type MarketEventCard, type MyMarket, type MyMarketDay, type RecommendedEvent } from '../../../api/market';
import { ChipRow } from '../../../components/blocks';
import { SkeletonList } from '../../../components/Skeleton';
import { Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { useLanguage } from '../../../i18n';
import { El, useAction, useField, usePageData, usePageWords } from '../../../kit';
import type { PageDataAction } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, radius, space } from '../../../theme/tokens';
import { refreshWisdom } from '../../grow/wisdomStore';
import { PICTURE } from '../../home/EventCard';
import { dayHeading, timeWords, whenWords } from '../../home/when';
import { AnswerButtons, ChangeLink, StatePill, stateOf, Toast, useToast } from '../Answer';
import { marketIndex as page } from '../pages';

const INTENTS = ['all', 'earn', 'contribute', 'volunteer', 'enjoy'] as const;
type Intent = (typeof INTENTS)[number];
const PAUSE = 400; // the search waits this long after the last key

export default function MarketHome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [intent, setIntent] = useState<Intent>('all');
  const [mine, setMine] = useState<MyMarket | null>(null);
  const [rec, setRec] = useState<RecommendedEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hosts, setHosts] = useState<MyHost[]>([]);
  const [changing, setChanging] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [toast, say] = useToast();

  const loadMine = useCallback(() => {
    getMyMarket().then((m) => { setMine(m); setFailed(false); setNow(new Date()); }).catch(() => setFailed(true));
    getMyHosts().then(setHosts).catch(() => setHosts([]));
  }, []);
  useFocusEffect(useCallback(() => { if (status === 'in') loadMine(); }, [status, loadMine]));
  useEffect(() => {
    const h = setTimeout(() => setQuery(q.trim()), PAUSE);
    return () => clearTimeout(h);
  }, [q]);
  useEffect(() => {
    if (status !== 'in') return;
    let live = true;
    getRecommended(query || undefined, intent === 'all' ? undefined : intent).then((r) => { if (live) { setRec(r); setFailed(false); } }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [status, query, intent]);

  const answer = useCallback(async (e: MyMarketDay, went: boolean) => {
    setBusy(e.id);
    try {
      await markAttendance(e.id, went);
      setMine((m) => m && ({ ...m, to_answer: m.to_answer.filter((x) => x.id !== e.id), answered: [{ ...e, attended: went }, ...m.answered.filter((x) => x.id !== e.id)] }));
      setChanging(null);
      say(w('noted'));
      void refreshWisdom(); // "I went" grows a leaf; "I didn't go" takes a self-reported one back
    } catch {
      say(w('not_saved'));
    } finally {
      setBusy(null);
    }
  }, [say, w]);
  const clear = useCallback(() => { setQ(''); setQuery(''); }, []);

  useField(page, 'search', q, (v) => setQ(String(v ?? '')));
  useField(page, 'intent', intent, (v) => setIntent(INTENTS.includes(v as Intent) ? (v as Intent) : 'all'));
  useAction(page, 'clearSearch', clear);
  useAction(page, 'retry', () => { loadMine(); setQuery((x) => x); });
  useAction(page, 'myHost', () => go('host.home'));

  const days: MyMarketDay[] = mine ? [...mine.to_answer, ...mine.upcoming, ...mine.answered] : [];
  const place = (e: MarketEventCard) => (e.area_name && !e.venue_name.toLowerCase().includes(e.area_name.toLowerCase()) ? `${e.venue_name}, ${e.area_name}` : e.venue_name);
  const reasonWord = (e: RecommendedEvent) => (e.reasons[0] ? w(`r_${e.reasons[0]}`) : null);
  const groups: { heading: string; items: RecommendedEvent[] }[] = [];
  for (const e of rec ?? []) {
    const heading = dayHeading(new Date(e.starts_at), now, lang);
    const g = groups.find((x) => x.heading === heading);
    if (g) g.items.push(e);
    else groups.push({ heading, items: [e] });
  }
  groups.sort((a, b) => a.items[0].starts_at.localeCompare(b.items[0].starts_at));

  const dayActions = (e: MyMarketDay, i: number): PageDataAction[] => {
    const s = stateOf(true, mine?.upcoming.every((x) => x.id !== e.id) ?? false, e.attended);
    if (s === 'ask') return [
      { id: `went${i + 1}`, label: w('i_went_on', { title: e.title }), agent: 'confirm', run: () => answer(e, true) },
      { id: `didntGo${i + 1}`, label: w('i_didnt_on', { title: e.title }), agent: 'confirm', run: () => answer(e, false) },
    ];
    if (s === 'went' || s === 'didnt') return [{ id: `change${i + 1}`, label: w('change_on', { title: e.title }), run: () => setChanging(e.id) }];
    return [{ id: `day${i + 1}`, label: w('open_event', { title: e.title }), run: () => { go('market.day', { id: e.id }); } }];
  };
  usePageData(page, mine === null && rec === null ? null : {
    values: [{ label: w('search'), value: q }],
    images: [],
    lists: [
      { label: w('your_days'), items: days.map((e, i) => ({ label: e.title, detail: [whenWords(e.starts_at, now, lang), place(e), w(`pill_${stateOf(true, mine?.upcoming.every((x) => x.id !== e.id) ?? false, e.attended) ?? 'going'}`)].join(' · '), actions: dayActions(e, i) })) },
      { label: w('recommended'), items: (rec ?? []).map((e, i) => ({ label: e.title, detail: [whenWords(e.starts_at, now, lang), e.host ?? place(e), e.distance_km !== null ? w('km', { n: e.distance_km }) : '', reasonWord(e) ?? ''].filter(Boolean).join(' · '), actions: [{ id: `event${i + 1}`, label: w('open_event', { title: e.title }), run: () => { go('market.day', { id: e.id }); } }] })) },
    ],
    actions: [{ id: 'clearSearch', label: w('clear'), run: clear }],
  });

  return (
    <View style={{ flex: 1 }}>
      <Screen title={w('heading')} hero={<View />}>
        <El page={page} id="search">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56, borderRadius: radius.button, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card, paddingLeft: space.md, marginBottom: space.lg }}>
            <Ionicons name="search" size={24} color={colors.ink} accessible={false} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={w('search')}
              placeholderTextColor={colors.muted}
              accessibilityLabel={w('search')}
              returnKeyType="search"
              autoCorrect={false}
              style={[{ flex: 1, fontSize: 19, color: colors.ink, paddingVertical: 14 }, { outlineStyle: 'none' } as object]}
            />
            {q ? (
              <Pressable onPress={clear} accessibilityRole="button" accessibilityLabel={w('clear')} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close-circle" size={28} color={colors.muted} accessible={false} />
              </Pressable>
            ) : null}
          </View>
        </El>

        {failed && mine === null ? (
          <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md, marginBottom: space.lg }}>
            <Text style={{ fontSize: 19, lineHeight: 26, fontWeight: '600', color: colors.ink }}>{w('load_failed')}</Text>
            <El page={page} id="retry"><Wide label={w('try_again')} onPress={loadMine} /></El>
          </View>
        ) : null}

        {hosts.length ? (
          <El page={page} id="myHost">
            <Pressable onPress={() => go('host.home')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.lg }}>
              <Ionicons name="business" size={28} color={colors.navy} accessible={false} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{w('myHost')}</Text>
                <Text style={{ fontSize: 17, color: colors.ink }}>{hosts.map((h) => h.name).join(', ')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.ink} accessible={false} />
            </Pressable>
          </El>
        ) : null}

        {!query ? (
          <View style={{ marginBottom: space.xl }}>
            <El page={page} id="yourDays"><Heading text={w('your_days')} /></El>
            {mine === null ? (failed ? null : <SkeletonList count={2} />) : days.length === 0 ? (
              <Text style={{ fontSize: 19, lineHeight: 26, color: colors.ink, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg }}>{w('no_days')}</Text>
            ) : days.map((e, i) => {
              const upcoming = mine.upcoming.some((x) => x.id === e.id);
              const s = stateOf(true, !upcoming, e.attended) ?? 'going';
              const asking = s === 'ask' || changing === e.id;
              return (
                <El key={e.id} page={page} id={`day${i + 1}`}>
                  <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: s === 'ask' ? 2 : 1, borderColor: s === 'ask' ? '#D9A23A' : colors.line, padding: space.lg, marginBottom: space.md, gap: space.md }}>
                    <Pressable onPress={() => go('market.day', { id: e.id })} accessibilityRole="button" accessibilityLabel={`${e.title}. ${whenWords(e.starts_at, now, lang)}. ${place(e)}. ${w(`pill_${s}`)}`} style={{ flexDirection: 'row', gap: space.md }}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 21, lineHeight: 27, fontWeight: '800', color: colors.ink }}>{e.title}</Text>
                        <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.accentDark }}>{whenWords(e.starts_at, now, lang)}</Text>
                        <Text style={{ fontSize: 18, lineHeight: 24, color: colors.ink }}>{place(e)}</Text>
                        <View style={{ marginTop: 4 }}><StatePill state={s} w={w} /></View>
                      </View>
                      {e.cover_url ? <Image source={{ uri: e.cover_url }} accessibilityIgnoresInvertColors style={{ width: PICTURE, height: PICTURE, borderRadius: radius.button, backgroundColor: colors.bone }} /> : null}
                    </Pressable>
                    {asking ? <AnswerButtons w={w} busy={busy === e.id} onAnswer={(went) => void answer(e, went)} /> : null}
                    {(s === 'went' || s === 'didnt') && changing !== e.id ? <ChangeLink label={w('change')} onPress={() => setChanging(e.id)} /> : null}
                  </View>
                </El>
              );
            })}
          </View>
        ) : null}

        <El page={page} id="recommended"><Heading text={w('recommended')} /></El>
        <El page={page} id="intent">
          <ChipRow options={INTENTS.map((i) => ({ value: i, label: w(`intent_${i}`) }))} value={intent} onChange={setIntent} />
        </El>
        {rec === null ? (failed ? null : <SkeletonList count={3} />) : rec.length === 0 ? (
          query ? (
            <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md }}>
              <Text style={{ fontSize: 19, lineHeight: 26, color: colors.ink }}>{w('no_match', { q: query })}</Text>
              <El page={page} id="clearSearch"><Wide label={w('show_all')} onPress={clear} /></El>
            </View>
          ) : (
            <Text style={{ fontSize: 19, lineHeight: 26, color: colors.ink }}>{w('no_recommended')}</Text>
          )
        ) : groups.map((g) => (
          <View key={g.heading} style={{ marginBottom: space.md }}>
            <Text accessibilityRole="header" style={{ fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.navy, marginBottom: space.sm }}>{g.heading}</Text>
            {g.items.map((e) => {
              const i = (rec ?? []).indexOf(e);
              const why = reasonWord(e);
              return (
                <El key={e.id} page={page} id={`event${i + 1}`}>
                  <Pressable onPress={() => go('market.day', { id: e.id })} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, backgroundColor: pressed ? colors.bg : colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.sm })}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.ink }}>{e.title}</Text>
                      {e.host ? <Text style={{ fontSize: 18, lineHeight: 24, color: colors.ink }}>{w('by_host', { name: e.host })}</Text> : null}
                      <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.accentDark }}>{timeWords(new Date(e.starts_at), lang)}</Text>
                      <Text style={{ fontSize: 18, lineHeight: 24, color: colors.ink }}>{place(e)}{e.distance_km !== null ? ` · ${w('km', { n: e.distance_km })}` : ''}</Text>
                      {why ? (
                        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 }}>
                          <Ionicons name={e.reasons[0] === 'near' ? 'location' : e.reasons[0] === 'soon' ? 'calendar' : 'heart'} size={16} color={colors.accentDark} accessible={false} />
                          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.accentDark }}>{why}</Text>
                        </View>
                      ) : null}
                    </View>
                    {e.cover_url ? <Image source={{ uri: e.cover_url }} accessibilityIgnoresInvertColors style={{ width: PICTURE, height: PICTURE, borderRadius: radius.button, backgroundColor: colors.bone }} /> : null}
                  </Pressable>
                </El>
              );
            })}
          </View>
        ))}
      </Screen>
      <Toast msg={toast} />
    </View>
  );
}

function Heading({ text }: { text: string }) {
  return <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.ink, marginBottom: space.md }}>{text}</Text>;
}

function Wide({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 })}>
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.card }}>{label}</Text>
    </Pressable>
  );
}

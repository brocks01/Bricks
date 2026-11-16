import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { calendarApi } from '../../../api/calendar';
import { getHomeSummary, getHomeUpcoming, type HomeEvent } from '../../../api/home';
import { SkeletonList } from '../../../components/Skeleton';
import { Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { useLanguage } from '../../../i18n';
import { El, useAction, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, radius, space } from '../../../theme/tokens';
import { EventCard, SOURCE_TAG } from '../EventCard';
import { HomeCalendar, useHomeCalendar } from '../HomeCalendar';
import { monthTitle } from '../month';
import { homeIndex as page } from '../pages';
import { dateWords, timeWords, whenWords } from '../when';

const FIRST = 3; // how many upcoming events show before "Show all"
const LIST_DAYS = 30; // the list shows a month ahead; the calendar looks three months ahead
const CALENDAR_DAYS = 92;

// Home: a greeting, "Your upcoming events" (from Communities, the Marketplace and Wisdom) and "Your calendar".
// The reminder pop-ups live in the root layout; this page keeps telling the server it is open, once a minute.
export default function HomeIndex() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const go = useNavigate();
  const { status, user } = useStore(sessionStore);
  const [events, setEvents] = useState<HomeEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [all, setAll] = useState(false);
  const [help, setHelp] = useState(0);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(() => {
    getHomeUpcoming(CALENDAR_DAYS)
      .then((r) => { setEvents(r.events); setFailed(false); setNow(new Date()); })
      .catch(() => setFailed(true));
    getHomeSummary().then((s) => setHelp(s.help_alerts)).catch(() => undefined);
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (status === 'in') load();
    }, [status, load])
  );
  // While Home is open the app tells the server it can be reached here (the reminder loop uses it), and the time words stay fresh.
  useEffect(() => {
    if (status !== 'in') return;
    const beat = () => void calendarApi.heartbeat(-new Date().getTimezoneOffset()).catch(() => undefined);
    beat();
    const beating = setInterval(beat, 60_000);
    const clock = setInterval(() => setNow(new Date()), 60_000);
    return () => { clearInterval(beating); clearInterval(clock); };
  }, [status]);

  const open = useCallback((e: HomeEvent) => { go(e.open_key, e.open_params); }, [go]);
  const lines = (e: HomeEvent) => [e.place, e.from_name ? w(e.source === 'wisdom' ? 'with_name' : 'from_name', { name: e.from_name }) : null].filter((x): x is string => !!x);
  const soon = new Date(now.getTime() + LIST_DAYS * 86_400_000).toISOString();
  const list = (events ?? []).filter((e) => e.starts_at <= soon);
  const cal = useHomeCalendar(events, now);
  const shown = all ? list : list.slice(0, FIRST);

  useAction(page, 'showAll', () => setAll((a) => !a));
  useAction(page, 'openCommunities', () => go('connect.index'));
  useAction(page, 'openMarket', () => go('market.index'));
  useAction(page, 'retry', () => load());
  useAction(page, 'openHelp', () => go('health.help'));

  usePageData(
    page,
    events === null
      ? null
      : {
          values: list.length ? [] : [{ label: w('upcoming'), value: w('empty_up') }],
          images: [],
          lists: [{
            label: w('upcoming'),
            items: list.map((e, i) => ({
              label: e.title,
              detail: [whenWords(e.starts_at, now, lang), w(SOURCE_TAG[e.source].word), ...lines(e), e.going ? w('you_going') : ''].filter(Boolean).join(' · '),
              actions: [{ id: `event${i + 1}`, label: e.title, run: () => open(e) }],
            })),
          }, {
            label: `${w('calendar')}: ${monthTitle(cal.shown.year, cal.shown.month0, lang)}`,
            items: cal.cells.flatMap((c) => (cal.days.get(c.key) ?? []).map((it) => ({
              label: it.title,
              detail: [dateWords(new Date(cal.shown.year, cal.shown.month0, c.day), now, lang), timeWords(new Date(it.at), lang), it.source === 'reminder' ? w('reminder') : w(`tag_${it.source}`), it.wasThere ? w('you_were_there') : it.going ? w('you_going') : ''].filter(Boolean).join(' · '),
            }))),
          }],
          actions: [],
        }
  );

  const hour = now.getHours();
  const name = user?.display_name?.trim().split(/\s+/)[0] || w('friend');
  const greeting = w(hour < 12 ? 'greet_morning' : hour < 17 ? 'greet_afternoon' : 'greet_evening', { name });

  return (
    <Screen title={greeting} hero={<Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.ink, marginBottom: space.lg }}>{greeting}</Text>}>
      {help > 0 ? (
        <El page={page} id="openHelp">
          <Pressable onPress={() => go('health.help')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.warnSoft, borderWidth: 1, borderColor: colors.warn, borderRadius: radius.card, padding: space.lg, marginBottom: space.lg, minHeight: 56 }}>
            <Ionicons name="alert-circle" size={28} color={colors.warn} accessible={false} />
            <Text style={{ flex: 1, fontSize: 19, fontWeight: '700', color: colors.ink }}>{w('help_alert', { n: help })}</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accentDark }}>{w('open_help')}</Text>
          </Pressable>
        </El>
      ) : null}

      <El page={page} id="upcoming"><Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.ink, marginBottom: space.md }}>{w('upcoming')}</Text></El>
      {events === null ? (
        failed ? (
          <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md }}>
            <Text style={{ fontSize: 19, lineHeight: 26, fontWeight: '600', color: colors.ink }}>{w('load_failed')}</Text>
            <El page={page} id="retry"><Wide label={w('try_again')} onPress={load} /></El>
          </View>
        ) : (
          <SkeletonList count={3} />
        )
      ) : list.length === 0 ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md }}>
          <Text style={{ fontSize: 19, lineHeight: 27, color: colors.ink }}>{w('empty_up')}</Text>
          <El page={page} id="openCommunities"><Wide label={w('btn_communities')} icon="people" onPress={() => go('connect.index')} /></El>
          <El page={page} id="openMarket"><Wide label={w('btn_marketplace')} icon="storefront" onPress={() => go('market.index')} plain /></El>
        </View>
      ) : (
        <>
          {shown.map((e, i) => (
            <El key={`${e.source}:${e.id}`} page={page} id={`event${i + 1}`}>
              <EventCard
                source={e.source}
                tagLabel={w(SOURCE_TAG[e.source].word)}
                when={whenWords(e.starts_at, now, lang)}
                title={e.title}
                lines={lines(e)}
                going={e.going}
                goingLabel={w('you_going')}
                imageUrl={e.image_url}
                onPress={() => open(e)}
                a11y={[e.title, whenWords(e.starts_at, now, lang), w(SOURCE_TAG[e.source].word), ...lines(e), e.going ? w('you_going') : ''].filter(Boolean).join('. ')}
              />
            </El>
          ))}
          {list.length > FIRST ? (
            <El page={page} id="showAll"><Wide label={all ? w('show_fewer') : w('show_all', { n: list.length })} onPress={() => setAll((a) => !a)} plain /></El>
          ) : null}
        </>
      )}

      <HomeCalendar cal={cal} now={now} lang={lang} w={w} onOpen={(o) => go(o.key, o.params)} />
    </Screen>
  );
}

/** A full-width button, 56 high, with a word on it (and an icon when it helps). */
export function Wide({ label, onPress, plain, icon }: { label: string; onPress: () => void; plain?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const fg = plain ? colors.navy : colors.card;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.lg, backgroundColor: plain ? colors.card : colors.accent, borderWidth: plain ? 2 : 0, borderColor: colors.navy, opacity: pressed ? 0.85 : 1 })}>
      {icon ? <Ionicons name={icon} size={24} color={fg} accessible={false} /> : null}
      <Text style={{ fontSize: 19, fontWeight: '800', color: fg, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

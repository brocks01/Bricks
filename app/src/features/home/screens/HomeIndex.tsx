import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { calendarApi, type Occurrence } from '../../../api/calendar';
import { getUpcoming, setGoing, type Upcoming } from '../../../api/communities';
import { checkIn } from '../../../api/lead';
import { getHomeSummary, type HomeSummary } from '../../../api/home';
import { sendCheckin } from '../../../api/health';
import { Figure, ListRow, Notice, Panel, Section } from '../../../components/blocks';
import { Button, ErrorText, Screen } from '../../../components/ui';
import { SkeletonList } from '../../../components/Skeleton';
import { useCached } from '../../../core/useCached';
import { useStore } from '../../../core/store';
import { useLanguage, useT } from '../../../i18n';
import { El, useAction, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, size, space, type } from '../../../theme/tokens';
import { dayRows, freeBefore, minutesUntil, nextUp } from '../day';
import { TreeSummary } from '../../grow/TreeSummary';
import { prefs } from '../../../prefs/store';
import '../../lead/leadWords'; // registers the words of the first-run link
import { ActivityCard, type Answer } from './ActivityCard';
import { MonthPlanner } from './MonthPlanner';
import { homeIndex as page } from '../pages';

const KIND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = { medicine: 'medkit-outline', appointment: 'time-outline', exercise: 'fitness-outline', event: 'flag-outline', call: 'call-outline', other: 'ellipse-outline' };

export default function HomeIndex() {
  const w = usePageWords(page);
  const t = useT();
  const lang = useLanguage();
  const navigate = useNavigate();
  const { status, user } = useStore(sessionStore);
  const { readAloud } = useStore(prefs);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [chosen, setAnswer] = useState<Answer | undefined>(undefined); // what the person picked here; until then the server's answer shows
  const [picked, setPicked] = useState(() => new Date().getDate());

  // What the screen shows is kept (core/cache.ts): leaving Home and coming back, or switching the app, shows the last copy at once and refreshes it quietly.
  // The live link refreshes it the moment something changes anywhere (a call, a chat, the other device). Only the very first time is there a skeleton.
  const on = status === 'in';
  const today = new Date();
  const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dayRes = useCached<Occurrence[]>(`/v1/calendar/occurrences?day=${dayKey}`, () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    return calendarApi.occurrences(undefined, from.toISOString(), new Date(from.getTime() + 2 * 86_400_000).toISOString()).then((r) => r.occurrences);
  }, { enabled: on });
  const sumRes = useCached<HomeSummary>('/v1/home/summary', getHomeSummary, { enabled: on });
  const actRes = useCached<Upcoming | null>('/v1/communities/upcoming?limit=1', () => getUpcoming(1).then((l) => l[0] ?? null), { enabled: on });
  const monthRes = useCached<Occurrence[]>(`/v1/calendar/occurrences?month=${dayKey.slice(0, 7)}`, () => {
    const d = new Date();
    return calendarApi.occurrences(undefined, new Date(d.getFullYear(), d.getMonth(), 1).toISOString(), new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()).then((r) => r.occurrences);
  }, { enabled: on });
  const occs = dayRes.data ?? null;
  const sum = sumRes.data ?? null;
  const act = actRes.data ?? null;
  const monthOccs = monthRes.data ?? [];
  const { set: setAct } = actRes;
  const answer: Answer = chosen !== undefined ? chosen : act?.i_going ? 'yes' : null;
  const refreshDay = dayRes.refresh, refreshSum = sumRes.refresh, refreshAct = actRes.refresh, refreshMonth = monthRes.refresh;
  const load = useCallback(() => {
    void Promise.all([refreshDay(), refreshSum(), refreshAct(), refreshMonth()]);
    setNow(new Date());
  }, [refreshDay, refreshSum, refreshAct, refreshMonth]);
  const shownError = error ?? (dayRes.failed && !occs ? w('failed') : null);
  useFocusEffect(
    useCallback(() => {
      if (status === 'in') load();
    }, [status, load])
  );
  // While Home is open: the clock moves every half minute (the countdown), the day is fetched again every few minutes, and the app tells the server it is open
  // (the reminder loop uses this as a hint that the person can be reached in the app).
  useEffect(() => {
    if (status !== 'in') return;
    const clock = setInterval(() => setNow(new Date()), 30_000);
    const refresh = setInterval(load, 5 * 60_000);
    const beat = () => void calendarApi.heartbeat(-new Date().getTimezoneOffset()).catch(() => undefined);
    beat();
    const beating = setInterval(beat, 60_000);
    return () => { clearInterval(clock); clearInterval(refresh); clearInterval(beating); };
  }, [status, load]);

  const mark = useCallback(async (o: Occurrence, as: 'done' | 'skipped') => {
    if (!o.item_id) return;
    try {
      await calendarApi.mark(o.item_id, o.occurs_at, as);
      load();
    } catch {
      setError(w('failed'));
    }
  }, [load, w]);

  const answerGoing = useCallback(async (going: boolean) => {
    if (!act) return;
    try {
      const r = await setGoing(act.id, going);
      setAct({ ...act, i_going: going, going_count: r.going_count });
      setAnswer(going ? 'yes' : 'no');
      load();
    } catch {
      setError(w('failed'));
    }
  }, [act, load, w, setAct]);

  const checkin = useCallback(async (moved: boolean) => {
    try {
      await sendCheckin(moved);
      load();
    } catch {
      setError(w('failed'));
    }
  }, [load, w]);

  const list = occs ?? [];
  const rows = dayRows(list, now);
  const next = nextUp(list, now);
  const hour = now.getHours();
  const name = user?.display_name?.split(' ')[0] || w('friend');
  const greeting = w(hour < 12 ? 'greet_morning' : hour < 17 ? 'greet_afternoon' : 'greet_evening', { name });
  const clockTime = (d: Date) => d.toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
  const dur = (m: number) => (m < 60 ? w('mins', { n: m }) : w('hm', { h: Math.floor(m / 60), m: m % 60 }));
  const when = (o: Occurrence) => {
    const m = minutesUntil(o, now);
    return m <= 0 ? w('now') : m < 60 ? w('in_min', { n: m }) : w('in_hm', { h: Math.floor(m / 60), m: m % 60 });
  };
  const kindWord = (k: string) => w(`kind_${k in KIND_ICON ? k : 'other'}`);

  useAction(page, 'markDone', () => next && mark(next, 'done'));
  useAction(page, 'markSkip', () => next && mark(next, 'skipped'));
  useAction(page, 'checkinYes', () => checkin(true));
  useAction(page, 'checkinNo', () => checkin(false));
  useAction(page, 'goYes', () => answerGoing(true));
  useAction(page, 'goNo', () => answerGoing(false));
  useAction(page, 'changeAnswer', () => setAnswer(null));
  useAction(page, 'openCalendar', () => navigate('calendar.today'));
  useAction(page, 'addReminder', () => navigate('calendar.new'));
  useAction(page, 'openFamily', () => navigate('family.home'));
  useAction(page, 'openHelp', () => navigate('health.help'));
  useAction(page, 'openCommunities', () => navigate('connect.index'));
  useAction(page, 'openMarket', () => navigate('market.index'));

  usePageData(
    page,
    occs === null
      ? null
      : {
          values: [
            { label: w('next_up'), value: next ? `${next.title} · ${clockTime(new Date(next.occurs_at))} · ${when(next)}` : w('nothing_next') },
            ...(sum ? [{ label: w('active_min'), value: String(sum.health.week_minutes) }, { label: w('communities_used', { n: sum.communities.used, max: sum.communities.max }), value: '' }] : []),
          ],
          images: [],
          lists: [
            {
              label: w('your_day'),
              items: rows.map((r) => (r.kind === 'item' ? { label: r.occ.title, detail: `${clockTime(r.start)} · ${kindWord(r.occ.kind)}` } : { label: w('free_label'), detail: w('free_slot', { from: clockTime(r.start), to: clockTime(r.end) }) })),
            },
          ],
          actions: [],
        }
  );

  return (
    <Screen title={greeting} subtitle={now.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })}>
      <ErrorText>{shownError}</ErrorText>
      {dayRes.loading ? <SkeletonList count={3} /> : null}

      {sum && sum.help_alerts > 0 ? (
        <El page={page} id="openHelp">
          <Panel tone="warn" onPress={() => navigate('health.help')} label={w('help_alert', { n: sum.help_alerts })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="alert-circle" size={size.icon.lg} color={colors.warn} />
              <Text style={[type.h2, { color: colors.ink, flex: 1 }]}>{w('help_alert', { n: sum.help_alerts })}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>{w('open_help')}</Text>
            </View>
          </Panel>
        </El>
      ) : null}

      {sum && sum.communities.used === 0 ? (
        <View style={{ marginBottom: space.lg }}>
          <Button label={t('lead.pick_banner')} icon="people-outline" onPress={() => navigate('connect.pick')} />
        </View>
      ) : null}

      {act ? (
        <View style={{ marginBottom: space.lg }}>
          <ActivityCard
            act={act}
            answer={answer}
            lang={lang}
            w={w}
            readAloud={readAloud}
            nowMs={now.getTime()}
            onYes={() => void answerGoing(true)}
            onNo={() => void answerGoing(false)}
            onChange={() => setAnswer(null)}
            onOpen={() => navigate('community.home', { id: act.community_id })}
            onHere={() => void (async () => { try { await checkIn(act.id); setAct({ ...act, i_attended: true }); load(); } catch { setError(w('failed')); } })()}
          />
        </View>
      ) : null}

      <Section title={w('next_up')}>
        {next ? (
          <Panel tone="warn">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs }}>
              <Ionicons name={KIND_ICON[next.kind] ?? 'ellipse-outline'} size={size.icon.lg} color={colors.warn} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.warn }}>{when(next)}  ·  {clockTime(new Date(next.occurs_at))}</Text>
            </View>
            <Text style={[type.h1, { color: colors.ink }]}>{next.title}</Text>
            {next.note ? <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>{next.note}</Text> : null}
            <Text style={[type.body, { color: colors.ink, marginTop: space.sm }]}>
              {minutesUntil(next, now) <= 0
                ? w('window_on', { time: clockTime(new Date(new Date(next.occurs_at).getTime() + (next.duration_min ?? 15) * 60_000)) })
                : w('window', { time: dur(freeBefore(list, next, now)) })}
            </Text>
            {next.item_id ? (
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
                <View style={{ flex: 1 }}><El page={page} id="markDone"><Button label={w('mark_done')} icon="checkmark" onPress={() => mark(next, 'done')} /></El></View>
                <View style={{ flex: 1 }}><El page={page} id="markSkip"><Button label={w('mark_skip')} kind="plain" onPress={() => mark(next, 'skipped')} /></El></View>
              </View>
            ) : null}
          </Panel>
        ) : (
          <Notice text={w('nothing_next')} icon="sunny-outline" />
        )}
      </Section>

      <View style={{ marginBottom: space.lg }}>
        <TreeSummary onOpen={() => navigate('grow.progress')} refreshKey={monthOccs.length + (act?.i_attended ? 1 : 0)} />
      </View>

      <View style={{ marginBottom: space.lg }}>
        <MonthPlanner now={now} occs={monthOccs} picked={picked} onPick={setPicked} lang={lang} w={w} />
      </View>

      <Section title={w('checkin_title')}>
        {sum?.health.answered ? (
          <Panel tone="soft">
            <Text style={[type.h2, { color: colors.ink }]}>{w('checked')}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{sum.health.streak ? (sum.health.streak === 1 ? w('streak_one') : w('streak_n', { n: sum.health.streak })) : w('streak_0')}</Text>
          </Panel>
        ) : (
          <Panel>
            <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{w('checkin_q')}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}><El page={page} id="checkinYes"><Button label={w('yes')} icon="walk-outline" onPress={() => checkin(true)} /></El></View>
              <View style={{ flex: 1 }}><El page={page} id="checkinNo"><Button label={w('no')} kind="plain" onPress={() => checkin(false)} /></El></View>
            </View>
          </Panel>
        )}
      </Section>

      <Section title={w('tracking')}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Figure icon="time-outline" n={sum?.health.week_minutes ?? 0} label={w('active_min')} />
          <Figure icon="footsteps-outline" n={sum?.health.week_steps ?? 0} label={w('steps')} />
        </View>
        <View style={{ height: space.sm }} />
        <El page={page} id="openCommunities">
          <ListRow icon="people-outline" i={0} title={w('communities_used', { n: sum?.communities.used ?? 0, max: sum?.communities.max ?? 3 })} onPress={() => navigate('connect.index')} right={<Ionicons name="chevron-forward" size={size.icon.md} color={colors.muted} />} />
        </El>
        <El page={page} id="openMarket">
          <ListRow icon="storefront-outline" i={1} title={sum && sum.market.waiting_for_me > 0 ? w('market_waiting', { n: sum.market.waiting_for_me }) : w('market_none')} onPress={() => navigate(sum && sum.market.waiting_for_me > 0 ? 'wisdom.myServices' : 'market.index')} right={<Ionicons name="chevron-forward" size={size.icon.md} color={colors.muted} />} />
        </El>
      </Section>

      <View style={{ marginTop: space.lg, gap: space.sm }}>
        <El page={page} id="addReminder"><Button label={w('add_reminder')} icon="add" onPress={() => navigate('calendar.new')} /></El>
        <El page={page} id="openCalendar"><Button label={w('full_calendar')} kind="plain" icon="calendar-outline" onPress={() => navigate('calendar.today')} /></El>
        <El page={page} id="openFamily"><Button label={w('family')} kind="plain" icon="people-circle-outline" onPress={() => navigate('family.home')} /></El>
      </View>
    </Screen>
  );
}

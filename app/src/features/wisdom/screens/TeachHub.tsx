// TEACH (revamp v2, A2): the elder's own side of Wisdom. Their teaching profile with Edit, the invitations waiting for their answer
// (one person, or a whole group), and their mentorships: active ones, sessions coming up, and completed ones (three, then Show all).
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { decideConnection, getConnections, getSessions, getTeachingProfile, type Connection, type TeachingProfile, type WisdomSession } from '../../../api/wisdom';
import { SkeletonList } from '../../../components/Skeleton';
import { useLanguage, useT } from '../../../i18n';
import { El, usePageData } from '../../../kit';
import type { PageDataAction } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, radius, space } from '../../../theme/tokens';
import { whenWords, type Lang } from '../../community/when';
import { wisdomIndex as page } from '../pages';
import { dayKey } from './TeachProfileScreen';
import { Avatar, BigButton, BLUE, Calm, card, Heading, Result, StatusWord, SubHeading } from '../teachUi';

interface Data { profile: TeachingProfile; conns: Connection[]; sessions: WisdomSession[] }
const load = (): Promise<Data> => Promise.all([getTeachingProfile(), getConnections(), getSessions()]).then(([profile, conns, sessions]) => ({ profile, conns, sessions }));

export function availabilityLine(t: ReturnType<typeof useT>, p: TeachingProfile | null): string | null {
  if (!p?.days && !p?.start_time) return null;
  const k = dayKey(p.days);
  const days = k ? t(`wt.${k}`) : p.days;
  if (days && p.start_time && p.end_time) return t('wt.avail_line', { days, start: p.start_time, end: p.end_time });
  return [days, p.start_time && p.end_time ? `${p.start_time}-${p.end_time}` : null].filter(Boolean).join(', ');
}

/** The session a mentorship card opens: the next one coming up, else the latest one. */
function sessionFor(c: Connection, sessions: WisdomSession[]): WisdomSession | undefined {
  const own = sessions.filter((s) => s.connection_id === c.id);
  return own.find((s) => s.status === 'scheduled') ?? own[0];
}

export function TeachHub({ extra = [] }: { extra?: PageDataAction[] }) {
  const t = useT();
  const lang = useLanguage() as Lang;
  const go = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const [decided, setDecided] = useState<Record<string, 'accepted' | 'declined'>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let live = true; // read again on every visit, and when `tick` asks for it
    void tick;
    load().then((d) => { if (live) { setData(d); setFailed(false); } }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [tick]));

  // a decided card shows its result for a moment, then the list is read again (and the card has gone)
  const shown = Object.keys(decided).length;
  useEffect(() => {
    if (!shown) return;
    const h = setTimeout(() => { setDecided({}); setTick((n) => n + 1); }, 1800);
    return () => clearTimeout(h);
  }, [shown]);

  const decide = (c: Connection, accept: boolean) => {
    setBusy(c.id);
    decideConnection(c.id, accept)
      .then(() => setDecided((d) => ({ ...d, [c.id]: accept ? 'accepted' : 'declined' })))
      .catch(() => setFailed(true))
      .finally(() => setBusy(null));
  };

  const conns = data?.conns ?? [];
  const invitations = conns.filter((c) => c.i_am === 'mentor' && (c.status === 'pending' || decided[c.id]) && (c.waiting_for_me || decided[c.id]));
  const active = conns.filter((c) => c.i_am === 'mentor' && c.status === 'accepted' && !decided[c.id]);
  const teaching = (data?.sessions ?? []).filter((s) => s.role === 'teacher');
  const upcoming = teaching.filter((s) => s.status === 'scheduled');
  const completed = teaching.filter((s) => s.status === 'completed');
  const avail = availabilityLine(t, data?.profile ?? null);
  const who = (c: Connection) => c.group_name || c.with;
  const openSession = (s?: WisdomSession) => { if (s) go('wisdom.session', { id: s.id }); };

  const actions: PageDataAction[] = [
    ...extra,
    { id: 'editProfile', label: t('wt.edit'), run: () => go('wisdom.teachProfile') },
    { id: 'showHistory', label: t('wt.show_all'), run: () => go('wisdom.history') },
    ...invitations.filter((c) => !decided[c.id]).flatMap((c, k) => [
      { id: `accept${k + 1}`, label: `${t('wt.accept')}: ${who(c)}`, run: () => decide(c, true) },
      { id: `decline${k + 1}`, label: `${t('wt.decline')}: ${who(c)}`, run: () => decide(c, false) },
    ]),
    ...upcoming.slice(0, 5).map((s, k) => ({ id: `session${k + 1}`, label: `${s.title}, ${whenWords(s.starts_at, lang)}`, run: () => openSession(s) })),
  ];
  usePageData(page, data ? {
    values: [
      { label: t('wt.expertise'), value: data.profile.expertise ?? t('wt.not_set') },
      { label: t('wt.availability'), value: avail ?? t('wt.not_set') },
    ],
    images: [],
    lists: [
      { label: t('wt.pending'), items: invitations.map((c) => ({ label: who(c), detail: c.group_name ? `${t('wt.learners_n', { n: c.learner_count ?? 0 })}, ${c.topic ?? ''}` : c.topic ?? '' })) },
      { label: t('wt.active'), items: active.map((c) => ({ label: c.with, detail: c.topic ?? '' })) },
      { label: t('wt.coming_up'), items: upcoming.map((s) => ({ label: s.title, detail: `${whenWords(s.starts_at, lang)}, ${s.place ?? t('wt.online')}, ${s.with_name}` })) },
      { label: t('wt.completed'), items: completed.map((s) => ({ label: s.title, detail: s.review ? t('wt.score', { n: s.review.score }) : t('wt.not_reviewed') })) },
    ],
    actions,
  } : null);

  if (failed && !data) {
    return <Calm text={t('wt.failed')}><BigButton label={t('wt.retry')} icon="refresh" onPress={() => setTick((n) => n + 1)} /></Calm>;
  }
  if (!data) return <SkeletonList />;

  return (
    <View>
      {/* the teaching profile */}
      <View style={[card, { padding: space.lg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '800', color: colors.ink }}>{t('wt.profile')}</Text>
          <El page={page} id="editProfile">
            <Pressable onPress={() => go('wisdom.teachProfile')} accessibilityRole="button" accessibilityLabel={t('wt.edit')} style={({ pressed }) => ({ minHeight: 48, minWidth: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 2, borderColor: BLUE, opacity: pressed ? 0.8 : 1 })}>
              <Ionicons name="create-outline" size={20} color={BLUE} accessible={false} />
              <Text style={{ fontSize: 17, fontWeight: '800', color: BLUE }}>{t('wt.edit')}</Text>
            </Pressable>
          </El>
        </View>
        {data.profile.expertise || avail ? (
          <View style={{ marginTop: space.md, gap: space.sm }}>
            <Text style={{ fontSize: 16, color: colors.muted }}>{t('wt.expertise')}</Text>
            <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink, marginTop: -4 }}>{data.profile.expertise ?? t('wt.not_set')}</Text>
            <Text style={{ fontSize: 16, color: colors.muted, marginTop: space.xs }}>{t('wt.availability')}</Text>
            <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink, marginTop: -4 }}>{avail ?? t('wt.not_set')}</Text>
          </View>
        ) : <Text style={{ fontSize: 18, lineHeight: 26, color: colors.muted, marginTop: space.sm }}>{t('wt.no_profile')}</Text>}
      </View>

      {/* the invitations waiting for an answer */}
      <Heading text={t('wt.pending')} />
      {invitations.length ? invitations.map((c, k) => {
        const result = decided[c.id];
        return (
          <View key={c.id} style={[card, { marginBottom: space.md, borderColor: result ? colors.line : '#C9D6EE' }]}>
            {result ? <Result ok={result === 'accepted'} text={t(result === 'accepted' ? 'wt.accepted_msg' : 'wt.declined_msg', { name: who(c) })} /> : (
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <Avatar name={who(c)} group={!!c.group_name} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{who(c)}</Text>
                  {c.group_name ? <Text style={{ fontSize: 16, fontWeight: '700', color: '#5B3FB8' }}>{t('wt.learners_n', { n: c.learner_count ?? 0 })}</Text> : null}
                  <Text style={{ fontSize: 17, lineHeight: 23, color: colors.ink }}>{c.group_name ? t('wt.group_wants', { topic: c.topic ?? '' }) : t('wt.wants', { topics: c.topic ?? '' })}</Text>
                </View>
                <View style={{ gap: space.sm, width: 132 }}>
                  <El page={page} id={`decline${k + 1}`}><BigButton kind="outline" tone={colors.ink} icon="close" label={t('wt.decline')} busy={busy === c.id} onPress={() => decide(c, false)} /></El>
                  <El page={page} id={`accept${k + 1}`}><BigButton icon="checkmark" label={t('wt.accept')} disabled={busy === c.id} onPress={() => decide(c, true)} /></El>
                </View>
              </View>
            )}
          </View>
        );
      }) : <Calm text={t('wt.no_invites')} />}

      {/* the mentorships */}
      <Heading text={t('wt.mentorships')} />
      <SubHeading text={t('wt.active')} />
      {active.length ? active.map((c) => {
        const s = sessionFor(c, data.sessions);
        return (
          <Pressable key={c.id} onPress={() => openSession(s)} disabled={!s} accessibilityRole="button" accessibilityHint={s ? t('wt.open_chat') : undefined}
            style={({ pressed }) => [card, { marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md, borderLeftWidth: 6, borderLeftColor: '#1D6B3F', opacity: pressed ? 0.85 : 1 }]}>
            <Avatar name={c.with} size={48} />
            <View style={{ flex: 1, gap: 4 }}>
              <StatusWord tone="active" text={t('wt.active')} />
              <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{c.with}</Text>
              {c.topic ? <Text style={{ fontSize: 17, color: colors.ink }}>{c.topic}</Text> : null}
              <Text style={{ fontSize: 16, color: colors.muted }}>{t('wt.sessions_n', { n: c.sessions })}</Text>
            </View>
            {c.unread ? <View style={{ minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger }}><Text style={{ fontSize: 15, fontWeight: '800', color: colors.card }}>{c.unread}</Text></View> : null}
            {s ? <Ionicons name="chevron-forward" size={26} color={colors.muted} accessible={false} /> : null}
          </Pressable>
        );
      }) : <Calm text={t('wt.no_active')} />}

      <SubHeading text={t('wt.coming_up')} />
      {upcoming.length ? upcoming.map((s) => (
        <Pressable key={s.id} onPress={() => openSession(s)} accessibilityRole="button" style={({ pressed }) => [card, { marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md, borderLeftWidth: 6, borderLeftColor: BLUE, opacity: pressed ? 0.85 : 1 }]}>
          <View style={{ width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9F0FB' }}>
            <Ionicons name="calendar" size={28} color={BLUE} accessible={false} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <StatusWord tone="soon" text={t('wt.status_scheduled')} />
            <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{s.title}</Text>
            <Text style={{ fontSize: 17, color: colors.ink }}>{whenWords(s.starts_at, lang)}</Text>
            <Text style={{ fontSize: 16, color: colors.muted }}>{[s.place ?? t('wt.online'), t('wt.with_name', { name: s.with_name })].join(' · ')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={26} color={colors.muted} accessible={false} />
        </Pressable>
      )) : <Calm text={t('wt.no_upcoming')} />}

      <SubHeading text={t('wt.completed')} />
      {completed.length ? (
        <>
          {completed.slice(0, 3).map((s) => (
            <Pressable key={s.id} onPress={() => go('wisdom.history')} accessibilityRole="button" style={({ pressed }) => [card, { marginBottom: space.sm, gap: 4, backgroundColor: '#F7F8FA', opacity: pressed ? 0.85 : 1 }]}>
              <StatusWord tone="done" text={t('wt.status_completed')} />
              <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{s.title}</Text>
              <Text style={{ fontSize: 16, color: colors.muted }}>{t('wt.with_name', { name: s.with_name })}</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: s.review ? colors.ink : colors.muted }}>{s.review ? t('wt.score', { n: s.review.score }) : t('wt.not_reviewed')}</Text>
            </Pressable>
          ))}
          <El page={page} id="showHistory"><BigButton kind="outline" icon="list" label={t('wt.show_all')} onPress={() => go('wisdom.history')} /></El>
        </>
      ) : <Calm text={t('wt.no_completed')} />}
    </View>
  );
}

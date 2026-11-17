// LEARN (revamp v2, A2): find an elder who can teach you. A tall search bar (it searches as you type, after a short pause, over the
// elder's name, skills and bio), four topic chips (one at a time, or none), and one card per elder with a full-width Ask to learn.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../../api/client';
import { askOffer, getConnections, getOffers, getSessions, type Connection, type Offer, type WisdomSession } from '../../../api/wisdom';
import { SkeletonList } from '../../../components/Skeleton';
import { useT } from '../../../i18n';
import { El, useField, usePageData } from '../../../kit';
import type { PageDataAction } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, radius, space } from '../../../theme/tokens';
import { wisdomIndex as page } from '../pages';
import { Avatar, BigButton, BLUE, Calm, card, Heading, Result, SubHeading } from '../teachUi';

/** THE one table from a chip to the offers' topics: an offer is found when one of its topics contains one of these words. */
export const CHIPS = {
  career: ['career', 'interview', 'first job', 'sales', 'business'],
  technology: ['technology', 'computer', 'python', 'excel', 'coding', 'phone'],
  language: ['language', 'japanese', 'mandarin', 'malay', 'tamil', 'english', 'hindi', 'bengali'],
  hobbies: ['hobbies', 'gardening', 'painting', 'cooking', 'music', 'photo', 'craft'],
} as const;
export type Chip = keyof typeof CHIPS;
const CHIP_KEYS = Object.keys(CHIPS) as Chip[];

interface Found { key: string; offers: Offer[] }
const keyOf = (q: string, chip: Chip | null) => `${q.trim().toLowerCase()}|${chip ?? ''}`;

function MentorCard({ o, asked, onAsk }: { o: Offer; asked: boolean; onAsk: (note: string) => Promise<'sent' | 'failed'> }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'sent' | 'failed' | null>(null);
  const done = asked || result === 'sent';
  const send = () => {
    setBusy(true);
    onAsk(note.trim()).then((r) => { setResult(r); if (r === 'sent') setAsking(false); }).finally(() => setBusy(false));
  };
  const line = [o.proof_years && o.proof_field ? t('wt.years_in', { n: o.proof_years, field: o.proof_field }) : o.proof_field, o.languages.length ? t('wt.speaks', { langs: o.languages.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(', ') }) : null].filter(Boolean);
  return (
    <View style={[card, { marginBottom: space.md, padding: space.lg }]}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 21, fontWeight: '800', color: colors.ink }}>{o.name ?? o.by}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: BLUE }}>{o.title}</Text>
          {line.map((l) => <Text key={l} style={{ fontSize: 16, lineHeight: 22, color: colors.muted }}>{l}</Text>)}
        </View>
        <Avatar name={o.name ?? o.by} size={64} />
      </Pressable>
      {open ? (
        <View style={{ marginTop: space.md, gap: space.sm }}>
          {o.about ? <Text style={{ fontSize: 17, lineHeight: 25, color: colors.ink }}>{o.about}</Text> : null}
          {o.availability ? <Text style={{ fontSize: 16, color: colors.muted }}>{`${t('wt.availability')}: ${o.availability}`}</Text> : null}
          {o.sensitive ? <Text style={{ fontSize: 16, lineHeight: 22, color: colors.warn }}>{t('wt.not_advice')}</Text> : null}
        </View>
      ) : null}
      {result === 'sent' ? <Result text={t('wt.request_sent')} /> : result === 'failed' ? <Result ok={false} text={t('wt.ask_failed')} /> : null}
      {asking && !done ? (
        <View style={{ marginTop: space.md, gap: space.sm }}>
          <TextInput value={note} onChangeText={setNote} placeholder={t('wt.ask_note')} placeholderTextColor={colors.muted} maxLength={500} multiline accessibilityLabel={t('wt.ask_note')}
            style={{ minHeight: 88, borderWidth: 2, borderColor: colors.line, borderRadius: radius.button, padding: space.md, fontSize: 18, color: colors.ink, textAlignVertical: 'top' }} />
          <BigButton icon="paper-plane" label={t('wt.send_ask')} busy={busy} onPress={send} />
        </View>
      ) : (
        <View style={{ marginTop: space.md }}>
          <BigButton icon={done ? 'checkmark' : 'school'} label={done ? t('wt.asked') : t('wt.ask')} disabled={done} kind={done ? 'outline' : 'fill'} onPress={() => setAsking(true)} />
        </View>
      )}
    </View>
  );
}

export function LearnHub({ extra = [] }: { extra?: PageDataAction[] }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [chip, setChip] = useState<Chip | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [conns, setConns] = useState<Connection[]>([]);
  const [sessions, setSessions] = useState<WisdomSession[]>([]);
  const go = useNavigate();
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const key = keyOf(q, chip);

  useFocusEffect(useCallback(() => {
    let live = true; // read again on every visit, and when `tick` asks for it
    void tick;
    getConnections().then((c) => { if (live) setConns(c); }).catch(() => undefined);
    getSessions().then((x) => { if (live) setSessions(x.filter((y) => y.role === 'learner')); }).catch(() => undefined);
    return () => { live = false; };
  }, [tick]));

  // search as the person types, after a short pause; results are kept with the words they were found for
  useEffect(() => {
    let live = true;
    const h = setTimeout(() => {
      getOffers(q.trim(), undefined, chip ? { topic: CHIPS[chip].join(',') } : undefined)
        .then((offers) => { if (live) { setFound({ key, offers: offers.filter((o) => !o.mine) }); setFailed(false); } })
        .catch(() => { if (live) setFailed(true); });
    }, q.trim() ? 300 : 0);
    return () => { live = false; clearTimeout(h); };
  }, [q, chip, key, tick]);

  const offers = found?.key === key ? found.offers : null;
  const askedOffers = new Set(conns.filter((c) => c.i_am === 'learner' && c.status !== 'declined').map((c) => c.offer_id).filter(Boolean));
  const teachers = conns.filter((c) => c.i_am === 'learner');
  const ask = (o: Offer, note: string): Promise<'sent' | 'failed'> => askOffer(o.id, note || undefined)
    .then(() => { setTick((n) => n + 1); return 'sent' as const; })
    .catch((e) => (e instanceof ApiError && e.code === 'already_asked' ? 'sent' as const : 'failed' as const));
  const showAll = () => { setQ(''); setChip(null); };

  useField(page, 'search', q, (v) => setQ(String(v ?? '')));
  useField(page, 'topic', chip ?? 'all', (v) => setChip(v && v !== 'all' && (CHIP_KEYS as string[]).includes(String(v)) ? (v as Chip) : null));
  usePageData(page, offers ? {
    values: [{ label: t('wt.search'), value: q }, { label: t('wt.topic'), value: chip ? t(`wt.c_${chip}`) : '' }],
    images: [],
    lists: [
      { label: t('wt.mentors_heading'), items: offers.map((o) => ({ label: o.name ?? o.by, detail: [o.title, ...o.languages].join(', ') })) },
      { label: t('wt.your_teachers'), items: teachers.map((c) => ({ label: c.with, detail: c.status === 'pending' ? t('wt.waiting') : c.topic ?? '' })) },
    ],
    actions: [
      ...extra,
      ...offers.filter((o) => !askedOffers.has(o.id)).slice(0, 8).map((o, k) => ({ id: `ask${k + 1}`, label: `${t('wt.ask')}: ${o.name ?? o.by}, ${o.title}`, run: () => void ask(o, '') })),
      ...(q || chip ? [{ id: 'showAll', label: t('wt.show_all'), run: showAll }] : []),
    ],
  } : null);

  return (
    <View>
      <El page={page} id="search">
        <View style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card }}>
          <Ionicons name="search" size={24} color={colors.muted} accessible={false} />
          <TextInput value={q} onChangeText={setQ} placeholder={t('wt.search')} placeholderTextColor={colors.muted} accessibilityLabel={t('wt.search')} returnKeyType="search"
            style={{ flex: 1, minHeight: 56, fontSize: 19, color: colors.ink }} />
          {q ? (
            <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel={t('wt.clear')} hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close-circle" size={28} color={colors.muted} accessible={false} />
            </Pressable>
          ) : null}
        </View>
      </El>

      <El page={page} id="topic">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.md, marginHorizontal: -space.md }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.md }}>
          {CHIP_KEYS.map((c) => {
            const on = chip === c;
            return (
              <Pressable key={c} onPress={() => setChip(on ? null : c)} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ minHeight: 52, justifyContent: 'center', paddingHorizontal: 24, borderRadius: radius.pill, borderWidth: 2, borderColor: on ? BLUE : colors.line, backgroundColor: on ? BLUE : colors.card }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: on ? colors.card : colors.ink }}>{t(`wt.c_${c}`)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </El>

      <Heading text={t('wt.mentors_heading')} />
      {failed && !offers ? <Calm text={t('wt.failed')}><BigButton label={t('wt.retry')} icon="refresh" onPress={() => setTick((n) => n + 1)} /></Calm> : null}
      {!offers && !failed ? <SkeletonList /> : null}
      {offers && !offers.length ? (
        <Calm text={t('wt.no_mentors')}>{q || chip ? <BigButton kind="outline" icon="list" label={t('wt.show_all')} onPress={showAll} /> : null}</Calm>
      ) : null}
      {offers?.map((o) => <MentorCard key={o.id} o={o} asked={askedOffers.has(o.id)} onAsk={(note) => ask(o, note)} />)}

      {teachers.length ? (
        <>
          <SubHeading text={t('wt.your_teachers')} />
          {teachers.map((c) => {
            const own = sessions.filter((x) => x.connection_id === c.id);
            const s = own.find((x) => x.status === 'scheduled') ?? own[0];
            return (
            <Pressable key={c.id} disabled={!s} onPress={() => s && go('wisdom.session', { id: s.id })} accessibilityRole="button" style={[card, { marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
              <Avatar name={c.with} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{c.with}</Text>
                <Text style={{ fontSize: 16, color: colors.muted }}>{c.status === 'pending' ? t('wt.waiting') : c.topic ?? ''}</Text>
              </View>
              {s ? <Ionicons name="chevron-forward" size={26} color={colors.muted} accessible={false} /> : null}
            </Pressable>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

// The Wisdom tab, kept simple: "N people want your advice" with Accept / Not now (Teach), or who can teach you (Learn). Nothing else on the page.
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { askOffer, decideConnection, getConnections, getMyOffers, getMyRequests, getOffers, type Connection, type Offer, type Request } from '../../../api/wisdom';
import { Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { usePageData, usePageWords } from '../../../kit';
import type { PageDataAction } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, radius, space, tints, type } from '../../../theme/tokens';
import { wisdomIndex as page } from '../pages';
import { Conversation } from './Conversation';

type Tab = 'learn' | 'teach';
const BLUE = '#1F4E9E'; // Wisdom's colour in the deck
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';
const card = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md } as const;

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: tints.sky }}>
      <Text style={{ fontSize: size * 0.42, fontWeight: '800', color: BLUE }}>{initial(name)}</Text>
    </View>
  );
}

export default function WisdomHome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { user } = useStore(sessionStore);
  const name = user?.display_name ?? '';
  const [tab, setTab] = useState<Tab | null>(null);
  const [conns, setConns] = useState<Connection[] | null>(null);
  const [mine, setMine] = useState<Offer[]>([]);
  const [asks, setAsks] = useState<Request[]>([]);
  const [people, setPeople] = useState<Offer[] | null>(null);
  const [open, setOpen] = useState<Connection | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, o, r] = await Promise.all([getConnections().catch(() => []), getMyOffers().catch(() => []), getMyRequests().catch(() => [])]);
    setConns(c);
    setMine(o);
    setAsks(r.filter((x) => x.kind === 'learn'));
    setTab((t) => t ?? (c.some((x) => x.i_am === 'mentor' && x.status === 'pending') || o.length ? 'teach' : 'learn'));
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (tab !== 'learn') return;
    let live = true;
    getOffers('').then((r) => live && setPeople(r)).catch(() => live && setPeople([]));
    return () => { live = false; };
  }, [tab]);

  const invitations = (conns ?? []).filter((c) => c.i_am === 'mentor' && c.status === 'pending');
  const learners = (conns ?? []).filter((c) => c.i_am === 'mentor' && c.status === 'accepted');
  const teachers = (conns ?? []).filter((c) => c.i_am === 'learner');
  const askedOffer = new Set(teachers.map((c) => c.offer_id).filter(Boolean));
  const shown = (people ?? []).filter((o) => !o.mine);

  const decide = async (c: Connection, accept: boolean) => {
    setBusy(c.id);
    try { await decideConnection(c.id, accept); await load(); } finally { setBusy(null); }
  };
  const ask = async (o: Offer) => {
    setBusy(o.id);
    try { await askOffer(o.id); await load(); } finally { setBusy(null); }
  };
  const share = () => { void Share.share({ message: w('h_share_msg', { name }) }).catch(() => undefined); };
  const edit = () => { go(tab === 'learn' ? 'wisdom.ask' : 'wisdom.offer'); };

  const actions: PageDataAction[] = [
    { id: 'learnTab', label: w('h_learn'), run: () => setTab('learn') },
    { id: 'teachTab', label: w('h_teach'), run: () => setTab('teach') },
    { id: 'edit', label: tab === 'learn' ? w('h_edit_learn') : w('h_edit_teach'), run: edit },
    ...(tab === 'teach' && !invitations.length ? [{ id: 'shareProfile', label: w('h_share'), run: share }] : []),
    ...(tab === 'teach' ? invitations.flatMap((c, k) => [{ id: `accept${k + 1}`, label: `${w('h_accept')}: ${c.with}`, run: () => void decide(c, true) }, { id: `decline${k + 1}`, label: `${w('h_notnow')}: ${c.with}`, run: () => void decide(c, false) }]) : []),
    ...(tab === 'learn' ? shown.filter((o) => !askedOffer.has(o.id)).slice(0, 8).map((o, k) => ({ id: `ask${k + 1}`, label: `${w('h_ask')}: ${o.by}, ${o.title}`, run: () => void ask(o) })) : []),
  ];
  usePageData(page, conns && tab ? {
    values: [{ label: w('h_title'), value: tab === 'teach' ? (invitations.length ? w(invitations.length === 1 ? 'h_want_1' : 'h_want_n', { n: invitations.length }) : w('h_none')) : w('h_people') }],
    images: [],
    lists: tab === 'teach'
      ? [{ label: w('h_pending'), items: invitations.map((c) => ({ label: c.with, detail: c.message ?? c.about ?? '' })) }]
      : [{ label: w('h_people'), items: shown.map((o) => ({ label: o.by, detail: o.title })) }],
    actions,
  } : null);

  const teachLine = mine.length ? `${w('h_teaches')}: ${mine.map((o) => o.title).join(', ')}` : w('h_add_teach');
  const learnLine = asks.length ? `${w('h_wants_learn')}: ${asks.map((r) => r.topic).join(', ')}` : w('h_add_learn');

  return (
    <Screen title="" hero={<Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '800', color: colors.navy }}>{w('h_title')}</Text>}>
      <View style={{ flexDirection: 'row', marginTop: space.sm, marginBottom: space.md, borderRadius: radius.pill, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
        {(['learn', 'teach'] as Tab[]).map((t) => {
          const on = tab === t;
          return (
            <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? BLUE : colors.card }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: on ? colors.card : colors.ink }}>{w(`h_${t}`)}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'teach' ? (
        <>
          {invitations.length ? (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy, marginBottom: space.sm }}>{w(invitations.length === 1 ? 'h_want_1' : 'h_want_n', { n: invitations.length })}</Text>
              {invitations.map((c) => (
                <View key={c.id} style={[card, { marginBottom: space.sm, opacity: busy === c.id ? 0.6 : 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <Avatar name={c.with} />
                    <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: colors.navy }}>{c.with}</Text>
                  </View>
                  {c.message || c.about ? <Text style={[type.body, { color: colors.muted, marginTop: space.sm }]}>“{c.message || c.about}”</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md }}>
                    <Pressable onPress={() => void decide(c, true)} disabled={busy === c.id} accessibilityRole="button" style={{ minHeight: 46, justifyContent: 'center', paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: BLUE }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.card }}>{w('h_accept')}</Text>
                    </Pressable>
                    <Pressable onPress={() => void decide(c, false)} disabled={busy === c.id} accessibilityRole="button" style={{ minHeight: 46, justifyContent: 'center', paddingHorizontal: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.muted }}>{w('h_notnow')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          ) : conns && !learners.length ? (
            <View style={[card, { alignItems: 'center', paddingVertical: space.xl, gap: space.lg }]}>
              <Text style={{ fontSize: 19, lineHeight: 27, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>{w('h_none')}</Text>
              <Pressable onPress={share} accessibilityRole="button" style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, borderRadius: radius.pill, backgroundColor: BLUE }}>
                <Ionicons name="paper-plane-outline" size={20} color={colors.card} accessible={false} />
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.card }}>{w('h_share')}</Text>
              </Pressable>
            </View>
          ) : null}
          {learners.length ? (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy, marginTop: space.md, marginBottom: space.sm }}>{w('h_yourlearners')}</Text>
              {learners.map((c) => (
                <Pressable key={c.id} onPress={() => setOpen(open?.id === c.id ? null : c)} accessibilityRole="button" style={[card, { marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
                  <Avatar name={c.with} size={40} />
                  <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink }}>{c.with}</Text>
                  {c.unread ? <View style={{ minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger }}><Text style={{ fontSize: 13, fontWeight: '800', color: colors.card }}>{c.unread}</Text></View> : null}
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={BLUE} accessible={false} />
                </Pressable>
              ))}
              {open && open.i_am === 'mentor' ? <Conversation c={open} onClose={() => setOpen(null)} onChanged={() => void load()} /> : null}
            </>
          ) : null}
        </>
      ) : null}

      {tab === 'learn' ? (
        <>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy, marginBottom: space.sm }}>{w('h_people')}</Text>
          {people && !shown.length ? <Text style={[type.body, { color: colors.muted }]}>{w('h_none_learn')}</Text> : null}
          {shown.map((o) => {
            const asked = askedOffer.has(o.id);
            return (
              <View key={o.id} style={[card, { marginBottom: space.sm, opacity: busy === o.id ? 0.6 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <Avatar name={o.by} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.navy }}>{o.by}</Text>
                    <Text style={[type.small, { color: colors.muted }]}>{[o.proof_field, o.proof_years ? w('h_years', { n: o.proof_years }) : ''].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: o.mode === 'volunteer' ? colors.accentDark : colors.warn }}>{o.mode === 'volunteer' ? w('h_free') : o.price_note || w('h_paid')}</Text>
                </View>
                <Text style={[type.body, { color: colors.ink, marginTop: space.sm }]}>{o.title}</Text>
                <Pressable onPress={() => void ask(o)} disabled={asked || busy === o.id} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 46, justifyContent: 'center', marginTop: space.sm, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: asked ? tints.sky : BLUE }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: asked ? BLUE : colors.card }}>{asked ? `✓ ${w('h_asked')}` : w('h_ask')}</Text>
                </Pressable>
              </View>
            );
          })}
          {teachers.length ? (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy, marginTop: space.md, marginBottom: space.sm }}>{w('h_yourteachers')}</Text>
              {teachers.map((c) => (
                <Pressable key={c.id} onPress={() => c.status === 'accepted' && setOpen(open?.id === c.id ? null : c)} accessibilityRole="button" style={[card, { marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
                  <Avatar name={c.with} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{c.with}</Text>
                    {c.status === 'pending' ? <Text style={[type.small, { color: colors.muted }]}>{w('h_waiting')}</Text> : null}
                  </View>
                  {c.status === 'accepted' ? <Ionicons name="chatbubble-ellipses-outline" size={22} color={BLUE} accessible={false} /> : <Ionicons name="time-outline" size={22} color={colors.muted} accessible={false} />}
                </Pressable>
              ))}
              {open && open.i_am === 'learner' ? <Conversation c={open} onClose={() => setOpen(null)} onChanged={() => void load()} /> : null}
            </>
          ) : null}
        </>
      ) : null}

      {tab ? (
        <Pressable onPress={edit} accessibilityRole="button" style={{ minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: space.md }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: BLUE }}>{tab === 'learn' ? w('h_edit_learn') : w('h_edit_teach')}</Text>
          <Text style={[type.small, { color: colors.muted, marginTop: 2 }]}>{tab === 'teach' ? teachLine : learnLine}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => { go('wisdom.more'); }} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.muted }}>{w('h_more')}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} accessible={false} />
      </Pressable>
    </Screen>
  );
}

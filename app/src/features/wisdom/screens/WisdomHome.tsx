// The Wisdom tab, as sketched: Back and Search on top, a Learn | Teach switch, then the person's profile card and, under Teach, the invitations waiting for an answer
// (or a way to share the profile when there are none). Under Learn: who can teach you, and the teachers you have asked. Nothing else on the page.
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askOffer, decideConnection, getConnections, getMyOffers, getMyRequests, getOffers, type Connection, type Offer, type Request } from '../../../api/wisdom';
import { useStore } from '../../../core/store';
import { useField, usePageData, usePageWords } from '../../../kit';
import type { PageDataAction } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, radius, space, tints, type } from '../../../theme/tokens';
import { wisdomIndex as page } from '../pages';
import { Conversation } from './Conversation';

type Tab = 'learn' | 'teach';
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';
const chips = (about: string | null): string[] => (about ? about.split(/[,;]/).map((x) => x.trim()).filter((x) => x && x.length <= 28) : []);

function Avatar({ name, size = 48, warm }: { name: string; size?: number; warm?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: warm ? tints.sand : tints.green }}>
      <Text style={{ fontSize: size * 0.42, fontWeight: '800', color: warm ? colors.warn : colors.accent }}>{initial(name)}</Text>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accentDark }}>{text}</Text>
    </View>
  );
}

const card = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md } as const;

export default function WisdomHome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useStore(sessionStore);
  const name = user?.display_name ?? '';
  const [tab, setTab] = useState<Tab | null>(null);
  const [q, setQ] = useState('');
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

  // Learn: who can teach you (searched as you type)
  useEffect(() => {
    if (tab !== 'learn') return;
    let live = true;
    const t = setTimeout(() => { getOffers(q).then((r) => live && setPeople(r)).catch(() => live && setPeople([])); }, q ? 300 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [tab, q]);

  const needle = q.trim().toLowerCase();
  const invitations = (conns ?? []).filter((c) => c.i_am === 'mentor' && c.status === 'pending' && (!needle || `${c.with} ${c.about ?? ''}`.toLowerCase().includes(needle)));
  const learners = (conns ?? []).filter((c) => c.i_am === 'mentor' && c.status === 'accepted');
  const teachers = (conns ?? []).filter((c) => c.i_am === 'learner');
  const askedOffer = new Set(teachers.map((c) => c.offer_id).filter(Boolean));

  const decide = async (c: Connection, accept: boolean) => {
    setBusy(c.id);
    try { await decideConnection(c.id, accept); await load(); } finally { setBusy(null); }
  };
  const ask = async (o: Offer) => {
    setBusy(o.id);
    try { await askOffer(o.id); await load(); } finally { setBusy(null); }
  };
  const share = () => { void Share.share({ message: w('h_share_msg', { name }) }).catch(() => undefined); };
  const back = () => { if (router.canGoBack()) router.back(); else go('connect.index'); };
  const shown = (people ?? []).filter((o) => !o.mine);

  // What the agent can read and press here.
  useField(page, 'search', q, (v) => setQ(String(v)));
  const actions: PageDataAction[] = [
    { id: 'learnTab', label: w('h_learn'), run: () => setTab('learn') },
    { id: 'teachTab', label: w('h_teach'), run: () => setTab('teach') },
    { id: 'edit', label: w('h_edit'), run: () => { go(tab === 'learn' ? 'wisdom.ask' : 'wisdom.offer'); } },
    ...(tab === 'teach' && !invitations.length ? [{ id: 'shareProfile', label: w('h_share'), run: share }] : []),
    ...(tab === 'teach' ? invitations.flatMap((c, k) => [{ id: `accept${k + 1}`, label: `${w('h_accept')}: ${c.with}`, run: () => void decide(c, true) }, { id: `decline${k + 1}`, label: `${w('h_decline')}: ${c.with}`, run: () => void decide(c, false) }]) : []),
    ...(tab === 'learn' ? shown.filter((o) => !askedOffer.has(o.id)).slice(0, 8).map((o, k) => ({ id: `ask${k + 1}`, label: `${w('h_ask')}: ${o.by}, ${o.title}`, run: () => void ask(o) })) : []),
  ];
  usePageData(page, conns && tab ? {
    values: [{ label: tab === 'teach' ? w('h_teach') : w('h_learn'), value: q }],
    images: [],
    lists: tab === 'teach'
      ? [{ label: w('h_pending'), items: invitations.map((c) => ({ label: c.with, detail: `${w('h_wants')}${c.about ? `: ${c.about}` : ''}` })) }]
      : [{ label: w('h_people'), items: shown.map((o) => ({ label: o.by, detail: o.title })) }],
    actions,
  } : null);

  const teachSummary = mine.length ? `${w('h_teaches')}: ${mine.map((o) => o.title).join(', ')}` : w('h_add_teach');
  const learnSummary = asks.length ? `${w('h_wants_learn')}: ${asks.map((r) => r.topic).join(', ')}` : w('h_add_learn');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, paddingBottom: 140 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={w('h_back')} style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 10, paddingRight: 16, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.ink }}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} accessible={false} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{w('h_back')}</Text>
          </Pressable>
          <View style={{ flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.ink }}>
            <Ionicons name="search" size={20} color={colors.ink} accessible={false} />
            <TextInput value={q} onChangeText={setQ} placeholder={w('h_search')} placeholderTextColor={colors.muted} accessibilityLabel={w('h_search')} autoCapitalize="none" style={{ flex: 1, fontSize: 17, color: colors.ink, outlineStyle: 'none' } as never} />
            {q ? <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="Clear" hitSlop={10}><Ionicons name="close-circle" size={20} color={colors.muted} accessible={false} /></Pressable> : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginTop: space.md, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.card }}>
          {(['learn', 'teach'] as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : colors.card }}>
                <Text style={{ fontSize: 19, fontWeight: '800', color: on ? colors.card : colors.ink }}>{w(`h_${t}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab ? (
          <View style={[card, { marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
            <Avatar name={name} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{w('h_profile')}</Text>
              <Text numberOfLines={2} style={[type.small, { color: colors.muted, marginTop: 2 }]}>{name ? `${name}. ` : ''}{tab === 'teach' ? teachSummary : learnSummary}</Text>
            </View>
            <Pressable onPress={() => { go(tab === 'learn' ? 'wisdom.ask' : 'wisdom.offer'); }} accessibilityRole="button" accessibilityLabel={w('h_edit')} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.card }}>
              <Ionicons name="create-outline" size={18} color={colors.ink} accessible={false} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>{w('h_edit')}</Text>
            </Pressable>
          </View>
        ) : null}

        {tab === 'teach' ? (
          <>
            {invitations.length ? (
              <>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: space.lg, marginBottom: space.sm }}>{w('h_pending')}</Text>
                {invitations.map((c) => (
                  <View key={c.id} style={[card, { marginBottom: space.md, opacity: busy === c.id ? 0.6 : 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                      <Avatar name={c.with} warm />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{c.with}</Text>
                        <Text style={[type.small, { color: colors.muted }]}>{w('h_wants')}</Text>
                      </View>
                      <Pressable onPress={() => void decide(c, false)} disabled={busy === c.id} accessibilityRole="button" accessibilityLabel={`${w('h_decline')}: ${c.with}`} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.muted, backgroundColor: colors.card }}>
                        <Ionicons name="close" size={26} color={colors.ink} accessible={false} />
                      </Pressable>
                      <Pressable onPress={() => void decide(c, true)} disabled={busy === c.id} accessibilityRole="button" accessibilityLabel={`${w('h_accept')}: ${c.with}`} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
                        <Ionicons name="checkmark" size={26} color={colors.card} accessible={false} />
                      </Pressable>
                    </View>
                    {chips(c.about).length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm }}>{chips(c.about).map((t) => <Chip key={t} text={t} />)}</View> : null}
                    {c.message ? <Text style={[type.small, { color: colors.muted, marginTop: space.sm }]}>{c.message}</Text> : null}
                  </View>
                ))}
              </>
            ) : conns && !learners.length ? (
              <View style={[card, { marginTop: space.md, alignItems: 'center', paddingVertical: space.xl, gap: space.lg }]}>
                <Text style={{ fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>{w('h_none')}</Text>
                <Pressable onPress={share} accessibilityRole="button" style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 26, borderRadius: 16, backgroundColor: colors.accent }}>
                  <Ionicons name="paper-plane-outline" size={22} color={colors.card} accessible={false} />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.card }}>{w('h_share')}</Text>
                </Pressable>
              </View>
            ) : null}
            {learners.length ? (
              <>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: space.lg, marginBottom: space.sm }}>{w('h_yourlearners')}</Text>
                {learners.map((c) => (
                  <Pressable key={c.id} onPress={() => setOpen(open?.id === c.id ? null : c)} accessibilityRole="button" style={[card, { marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
                    <Avatar name={c.with} size={42} />
                    <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.ink }}>{c.with}</Text>
                    {c.unread ? <View style={{ minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger }}><Text style={{ fontSize: 13, fontWeight: '800', color: colors.card }}>{c.unread}</Text></View> : null}
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} accessible={false} />
                  </Pressable>
                ))}
                {open && open.i_am === 'mentor' ? <Conversation c={open} onClose={() => setOpen(null)} onChanged={() => void load()} /> : null}
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'learn' ? (
          <>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: space.lg, marginBottom: space.sm }}>{w('h_people')}</Text>
            {people && !shown.length ? <Text style={[type.body, { color: colors.muted }]}>{w('h_none_learn')}</Text> : null}
            {shown.map((o) => {
              const asked = askedOffer.has(o.id);
              const free = o.mode === 'volunteer';
              return (
                <View key={o.id} style={[card, { marginBottom: space.md, opacity: busy === o.id ? 0.6 : 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <Avatar name={o.by} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{o.by}</Text>
                      <Text style={[type.small, { color: colors.muted }]}>{[o.proof_field, o.proof_years ? w('h_years', { n: o.proof_years }) : '', o.area].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: free ? colors.accentSoft : tints.sand }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: free ? colors.accentDark : colors.warn }}>{free ? w('h_free') : o.price_note || w('h_paid')}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: space.sm }}>{o.title}</Text>
                  {o.about ? <Text numberOfLines={2} style={[type.small, { color: colors.muted, marginTop: 2 }]}>{o.about}</Text> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm }}>
                    {o.endorsements ? <Chip text={w('h_thanks', { n: o.endorsements })} /> : null}
                    {o.languages.slice(0, 3).map((l) => <Chip key={l} text={l} />)}
                  </View>
                  <Pressable onPress={() => void ask(o)} disabled={asked || busy === o.id} accessibilityRole="button" style={{ minHeight: 50, marginTop: space.md, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: asked ? colors.accentSoft : colors.accent }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: asked ? colors.accentDark : colors.card }}>{asked ? `✓ ${w('h_asked')}` : w('h_ask')}</Text>
                  </Pressable>
                </View>
              );
            })}
            {teachers.length ? (
              <>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: space.lg, marginBottom: space.sm }}>{w('h_yourteachers')}</Text>
                {teachers.map((c) => (
                  <Pressable key={c.id} onPress={() => c.status === 'accepted' && setOpen(open?.id === c.id ? null : c)} accessibilityRole="button" style={[card, { marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
                    <Avatar name={c.with} size={42} warm />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{c.with}</Text>
                      {c.status === 'pending' ? <Text style={[type.small, { color: colors.muted }]}>{w('h_waiting')}</Text> : null}
                    </View>
                    {c.status === 'accepted' ? <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} accessible={false} /> : <Ionicons name="time-outline" size={22} color={colors.muted} accessible={false} />}
                  </Pressable>
                ))}
                {open && open.i_am === 'learner' ? <Conversation c={open} onClose={() => setOpen(null)} onChanged={() => void load()} /> : null}
              </>
            ) : null}
          </>
        ) : null}

        <Pressable onPress={() => { go('wisdom.more'); }} accessibilityRole="button" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.lg }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>{w('h_more')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} accessible={false} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

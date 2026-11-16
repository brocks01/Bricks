// The last three first-time screens, drawn like the reference: the assistant asks two simple questions (4), the profile to check (5), and "you're all set" (6).
// Singpass already told us the name, the area and the languages; the assistant only asks what Singpass cannot know. Everything is saved to the account on "Looks right".
// Each screen publishes what it shows to the agent (usePageData, useField), so the floating mic can read it, answer for the person in any language and press the buttons.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { exploreCommunities } from '../../api/communityRules';
import { createOffer, createRequest, putOnboarding } from '../../api/wisdom';
import { useHideOrb } from '../../agent/orbHidden';
import { useStore } from '../../core/store';
import { useField, usePageData, usePageWords } from '../../kit';
import { useNavigate } from '../../navigation';
import { sessionStore, signOut, singpassFacts } from '../../session/store';
import { Go, MicButton, R, RefFrame } from './ref';
import { onboardingIndex as page } from './pages';
import { onboardingLocal } from './state';

type Stage = 'chat' | 'profile' | 'done';
// What Uncle Tan says when the mic is tapped (a person can speak or type their own; the agent can fill any answer in any language).
const SAY = ['Tech sales manager, 40 years.', 'Tai chi, music.'];
const KEYS: [string, RegExp][] = [['walking', /walk/i], ['taichi', /tai ?chi/i], ['cooking', /cook/i], ['chess', /chess/i], ['music', /music|sing/i], ['gardening', /garden/i], ['teaching', /teach/i], ['tech', /tech|digital|comput/i]];
const strip = (s: string) => s.trim().replace(/[.\s]+$/, '');
const first = (s: string) => s.trim().split(/\s+/)[0] ?? '';
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function Flow({ finish }: { finish: () => Promise<void> }) {
  const { user } = useStore(sessionStore);
  const go = useNavigate();
  const facts = singpassFacts.current;
  const [stage, setStage] = useState<Stage>('chat');
  const [answers, setAnswers] = useState<string[]>([]);
  const [area, setArea] = useState(facts?.area ?? '');
  const [languages, setLanguages] = useState((facts?.languages ?? ['English']).join(', '));
  const [work, setWork] = useState('');
  const [likes, setLikes] = useState('');
  const [share, setShare] = useState('');
  const [learn, setLearn] = useState('Digital photography');
  const name = first(facts?.name ?? user?.display_name ?? '');

  const cancel = () => { void signOut().then(() => { go('auth.signIn', {}, { replace: true }); }).catch(() => undefined); };
  const answered = (list: string[]) => {
    setAnswers(list);
    if (list.length < 2) return;
    const w = strip(list[0]);
    setWork(w);
    setLikes(strip(list[1]));
    setShare(/sales/i.test(w) ? 'Sales, career guidance' : `${title(w.split(',')[0])}, life experience`);
    setTimeout(() => setStage('profile'), 900);
  };

  if (stage === 'chat') return <Chat name={name} area={area} answers={answers} onAnswers={answered} onBack={cancel} />;
  if (stage === 'profile') {
    return <Profile rows={{ area, work, languages, likes, share, learn }} set={{ area: setArea, work: setWork, languages: setLanguages, likes: setLikes, share: setShare, learn: setLearn }} onBack={() => { setAnswers([]); setStage('chat'); }}
      onOk={async () => { await save({ area, work, likes, share, learn }); setStage('done'); }} />;
  }
  return <AllSet name={name} area={area} likes={likes} share={share} finish={async () => { try { await putOnboarding('consent', { privacy: true, terms: true }); } catch { /* the server asks again at the next start */ } onboardingLocal.done = true; await finish(); }} />;
}

/** Writes everything the person confirmed into their account: where they live, what they enjoy, what they can share (this turns Wisdom on) and what they want to learn. */
async function save(p: { area: string; work: string; likes: string; share: string; learn: string }) {
  const attempt = async (f: () => Promise<unknown>) => { try { await f(); } catch { /* one part failing must not stop the rest */ } };
  await attempt(() => putOnboarding('purpose', { roles: ['connect', 'share', 'learn'] }));
  await attempt(() => putOnboarding('basics', { country: 'SG', ...(p.area.trim() ? { area_name: p.area.trim() } : {}) }));
  const keys = KEYS.filter(([, re]) => re.test(p.likes)).map(([k]) => k);
  if (keys.length) await attempt(() => putOnboarding('interests', { interests: keys }));
  const years = Number(/(\d{1,2})\s*years?/i.exec(p.work)?.[1] ?? 0) || undefined;
  const field = p.work.split(',')[0].trim();
  await attempt(() => putOnboarding('share', { field, ...(years ? { years } : {}), skills: p.share.split(',').map((x) => x.trim()).filter(Boolean) }));
  if (p.share.trim()) await attempt(() => createOffer({ title: p.share.trim(), about: p.work.trim() || undefined, kind: 'mentoring', mode: 'volunteer', domain: 'professional', proof_field: field || undefined, proof_years: years, topics: [] }));
  if (p.learn.trim()) await attempt(() => createRequest({ topic: p.learn.trim(), kind: 'learn' }));
}

// ---------- 4: the assistant ----------
function Chat({ name, area, answers, onAnswers, onBack }: { name: string; area: string; answers: string[]; onAnswers: (a: string[]) => void; onBack: () => void }) {
  const w = usePageWords(page);
  useHideOrb();
  const [listening, setListening] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const t = answers.length; // 0: waiting for the work answer, 1: waiting for the enjoy answer, 2: done
  const submit = (text: string) => { const v = text.trim(); if (!v || t > 1) return; setDraft(''); setTyping(false); onAnswers([...answers, v]); };
  const speak = () => {
    if (listening || t > 1) return;
    setListening(true);
    timer.current = setTimeout(() => { setListening(false); submit(SAY[t]); }, 1600);
  };
  usePageData(page, {
    values: [{ label: t === 0 ? w('x_a_q1') : w('x_a_q2'), value: draft }],
    images: [],
    lists: [],
    actions: [
      { id: 'send', label: w('x_send'), run: () => submit(draft || SAY[Math.min(t, 1)]) },
      { id: 'back', label: w('x_back'), run: onBack },
    ],
  });
  useField(page, 'answer', draft, (v) => setDraft(String(v)));
  const bubble = (key: string, mine: boolean, text: string) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: 14 }}>
      {mine ? null : <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: R.green, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="happy-outline" size={22} color="#FFFFFF" accessible={false} /></View>}
      <View style={{ maxWidth: '80%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: mine ? R.greenSoft : '#F3EEE3' }}>
        {mine ? <Ionicons name="person" size={20} color={R.green} accessible={false} /> : null}
        <Text style={{ flexShrink: 1, fontSize: 19, lineHeight: 26, fontWeight: mine ? '600' : '800', color: R.ink }}>{text}</Text>
      </View>
    </View>
  );
  return (
    <RefFrame at={3} onBack={onBack} backLabel={w('x_back')}
      bottom={
        <View style={{ alignItems: 'center', gap: 10 }}>
          {t > 1 ? null : <MicButton hot={listening} onPress={speak} label={listening ? w('x_listen') : w('x_tap')} />}
          {t > 1 ? null : typing ? (
            <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
              <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => submit(draft)} autoFocus accessibilityLabel={w('answer')} placeholder={w('x_type')} placeholderTextColor={R.muted}
                style={{ flex: 1, minHeight: 52, fontSize: 18, color: R.ink, paddingHorizontal: 16, borderRadius: 26, backgroundColor: R.card, borderWidth: 2, borderColor: R.green, outlineStyle: 'none' } as never} />
              <Pressable onPress={() => submit(draft)} accessibilityRole="button" accessibilityLabel={w('x_send')} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: R.green, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="arrow-up" size={26} color="#FFFFFF" accessible={false} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setTyping(true)} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: R.green, textDecorationLine: 'underline' }}>{w('x_type')}</Text>
            </Pressable>
          )}
        </View>
      }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: R.card, borderWidth: 1, borderColor: R.line, marginTop: 6 }}>
        <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: R.green, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="happy-outline" size={38} color="#FFFFFF" accessible={false} /></View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '800', color: R.ink }}>{w('x_a_name')}</Text>
          <Text style={{ fontSize: 15, lineHeight: 21, color: R.muted }}>{w('x_a_intro')}</Text>
        </View>
      </View>
      {bubble('hello', false, w('x_a_hello', { name, area }))}
      {bubble('q1', false, w('x_a_q1'))}
      {answers[0] ? bubble('a1', true, answers[0]) : null}
      {answers[0] ? bubble('q2', false, w('x_a_q2')) : null}
      {answers[1] ? bubble('a2', true, answers[1]) : null}
    </RefFrame>
  );
}

// ---------- 5: the profile to check ----------
type Rows = { area: string; work: string; languages: string; likes: string; share: string; learn: string };
function Profile({ rows, set, onBack, onOk }: { rows: Rows; set: { [K in keyof Rows]: (v: string) => void }; onBack: () => void; onOk: () => Promise<void> }) {
  const w = usePageWords(page);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const ok = () => { if (busy) return; setBusy(true); void onOk().finally(() => setBusy(false)); };
  const list: { key: keyof Rows; icon: keyof typeof Ionicons.glyphMap; color: string; label: string }[] = [
    { key: 'area', icon: 'location', color: '#E8542A', label: w('x_p_lives') },
    { key: 'work', icon: 'briefcase', color: '#4A5566', label: w('x_p_work') },
    { key: 'languages', icon: 'language', color: '#2E7CF6', label: w('x_p_lang') },
    { key: 'likes', icon: 'heart', color: '#E8423F', label: w('x_p_int') },
    { key: 'share', icon: 'people', color: '#7B5BE6', label: w('x_p_share') },
    { key: 'learn', icon: 'school', color: '#5B4FD6', label: w('x_p_learn') },
  ];
  usePageData(page, {
    values: list.map((r) => ({ label: r.label, value: rows[r.key] })),
    images: [],
    lists: [],
    actions: [
      { id: 'looksRight', label: w('x_p_ok'), run: ok },
      { id: 'edit', label: edit ? w('x_p_done') : w('x_p_edit'), run: () => setEdit((e) => !e) },
      { id: 'back', label: w('x_back'), run: onBack },
    ],
  });
  return (
    <RefFrame at={4} onBack={onBack} backLabel={w('x_back')}
      bottom={<View style={{ gap: 10 }}><Go label={w('x_p_ok')} icon="checkmark-circle" onPress={ok} disabled={busy} /><Go light label={edit ? w('x_p_done') : w('x_p_edit')} onPress={() => setEdit((e) => !e)} /></View>}>
      <Text accessibilityRole="header" style={{ fontSize: 32, lineHeight: 38, fontWeight: '800', color: R.ink, marginTop: 14 }}>{w('x_p_title')}</Text>
      <Text style={{ fontSize: 18, lineHeight: 25, color: R.muted, marginTop: 6 }}>{w('x_p_sub')}</Text>
      <View style={{ marginTop: 16, gap: 10 }}>
        {list.map((r) => (
          <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: R.card, borderWidth: 1, borderColor: edit ? R.greenLine : R.line }}>
            <Ionicons name={r.icon} size={26} color={r.color} accessible={false} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: R.muted }}>{r.label}</Text>
              {edit ? (
                <TextInput value={rows[r.key]} onChangeText={set[r.key]} accessibilityLabel={r.label} style={{ fontSize: 18, fontWeight: '800', color: R.ink, paddingVertical: 2, outlineStyle: 'none' } as never} />
              ) : (
                <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '800', color: R.ink }}>{rows[r.key]}</Text>
              )}
            </View>
            <Ionicons name={edit ? 'create' : 'create-outline'} size={22} color={edit ? R.green : R.muted} accessible={false} />
          </View>
        ))}
      </View>
    </RefFrame>
  );
}

// ---------- 6: all set ----------
function AllSet({ name, area, likes, share, finish }: { name: string; area: string; likes: string; share: string; finish: () => Promise<void> }) {
  const w = usePageWords(page);
  const [busy, setBusy] = useState(false);
  const [going, setGoing] = useState<number | null>(null);
  const what = title(likes.split(/,| and /i)[0]?.trim() || 'Community');
  useEffect(() => {
    // a real group near the person: how many people are in it
    exploreCommunities(area).then((r) => { const c = r.communities?.[0] as { member_count?: number } | undefined; if (c?.member_count) setGoing(c.member_count); }).catch(() => undefined);
  }, [area]);
  const go = () => { if (busy) return; setBusy(true); void finish().finally(() => setBusy(false)); };
  const cards = [
    { icon: 'people' as const, color: '#F29A1F', head: w('x_s_comm'), line: w('x_s_comm_d', { what, area }), tail: going ? w('x_s_comm_n', { n: going }) : '', img: require('../../../assets/images/activity.jpg') },
    { icon: 'book' as const, color: '#1F6FB5', head: w('x_s_wis'), line: w('x_s_wis_d', { what: share.split(',')[0].trim().toLowerCase() }), tail: '', img: require('../../../assets/images/knowledge.jpg') },
    { icon: 'storefront' as const, color: '#0E6B3D', head: w('x_s_mkt'), line: w('x_s_mkt_d', { area }), tail: '', img: require('../../../assets/images/contributions.jpg') },
  ];
  usePageData(page, { values: [{ label: w('x_s_title', { name }), value: w('x_s_sub') }, ...cards.map((c) => ({ label: c.head, value: `${c.line} ${c.tail}`.trim() }))], images: [], lists: [], actions: [{ id: 'goHome', label: w('x_s_go'), run: go }] });
  return (
    <RefFrame at={5} bottom={<Go label={w('x_s_go')} trailing="arrow-forward" onPress={go} disabled={busy} />}>
      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#E3F1E7', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark-circle" size={58} color={R.green} accessible={false} />
        </View>
      </View>
      <Text accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: R.ink, textAlign: 'center', marginTop: 10 }}>{w('x_s_title', { name })}</Text>
      <Text style={{ fontSize: 17, color: R.muted, textAlign: 'center', marginTop: 4 }}>{w('x_s_sub')}</Text>
      <View style={{ marginTop: 16, gap: 12 }}>
        {cards.map((c) => (
          <View key={c.head} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: R.peach }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={c.icon} size={22} color={c.color} accessible={false} />
                <Text style={{ fontSize: 20, fontWeight: '800', color: R.ink }}>{c.head}</Text>
              </View>
              <Text style={{ fontSize: 15, lineHeight: 21, color: R.muted, marginTop: 4 }}>{c.line}</Text>
              {c.tail ? <Text style={{ fontSize: 14, fontWeight: '700', color: R.ink, marginTop: 4 }}>{c.tail}</Text> : null}
            </View>
            <Image source={c.img} accessible={false} resizeMode="cover" style={{ width: 86, height: 72, borderRadius: 12 }} />
          </View>
        ))}
      </View>
    </RefFrame>
  );
}

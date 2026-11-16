// Onboarding after sign-in, screen for screen like the reference: name (step 1 of 3), where you live (2 of 3), what you enjoy (3 of 3), your voice,
// how to remind you, welcome. Only these. Everything else Wisdom needs is asked later (by the agent or in the profile), never here.
// Every step also publishes what it shows to the agent (usePageData / useField), so the floating mic can read the page, fill the name, pick an option
// and press Next in any language, on the front end only, exactly as a person's own taps would.
import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { uploadVoiceIntro } from '../../api/media';
import { putOnboarding, skipOnboarding, type OnboardingState } from '../../api/wisdom';
import { useStore } from '../../core/store';
import { useField, usePageData, usePageWords } from '../../kit';
import type { PageDataAction } from '../../kit';
import { sessionStore } from '../../session/store';
import { colors, radius, space, type } from '../../theme/tokens';
import { Bar, Chip, Frame, Interest, ListCard, grid, type Icon } from './kit';
import { onboardingIndex as page } from './pages';
import { onboardingLocal } from './state';
import { whoStore } from './who';

const TOWNS = ['Bishan', 'Toa Payoh', 'Ang Mo Kio', 'Tampines', 'Jurong West', 'Woodlands'];
const INTERESTS: { key: string; icon: Icon }[] = [
  { key: 'walking', icon: 'walk-outline' }, { key: 'taichi', icon: 'body-outline' }, { key: 'cooking', icon: 'restaurant-outline' }, { key: 'chess', icon: 'extension-puzzle-outline' },
  { key: 'music', icon: 'musical-notes-outline' }, { key: 'gardening', icon: 'leaf-outline' }, { key: 'teaching', icon: 'school-outline' }, { key: 'tech', icon: 'laptop-outline' },
];
type StepId = 'name' | 'where' | 'enjoy' | 'voice' | 'reminders' | 'welcome';
const ORDER: StepId[] = ['name', 'where', 'enjoy', 'voice', 'reminders', 'welcome'];
const ans = (st: OnboardingState, sec: string, key: string): unknown => st.sections.find((s) => s.id === sec)?.questions.find((q) => q.key === key)?.answer;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Wizard({ state, onState, finish }: { state: OnboardingState; onState: (s: OnboardingState) => void; finish: () => Promise<void> }) {
  const w = usePageWords(page);
  const { user } = useStore(sessionStore);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(String(ans(state, 'basics', 'display_name') ?? user?.display_name ?? ''));
  const [area, setArea] = useState(String(ans(state, 'basics', 'area_name') ?? ''));
  const [typed, setTyped] = useState(false);
  const [likes, setLikes] = useState<string[]>(Array.isArray(ans(state, 'interests', 'interests')) ? (ans(state, 'interests', 'interests') as string[]) : []);

  // What the person is here for is set quietly from "who is setting up" (the first screens), so no screen has to ask it.
  useEffect(() => {
    if (state.roles?.length) return;
    const who = whoStore.get().who;
    void putOnboarding('purpose', { roles: who === 'family' ? ['care'] : ['connect'] }).then(onState).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = ORDER[i];
  const next = () => { setError(null); setI((x) => Math.min(x + 1, ORDER.length - 1)); };
  const back = i > 0 && step !== 'welcome' ? () => { setError(null); setI((x) => x - 1); } : undefined;
  const run = async (fn: () => Promise<OnboardingState | void>) => {
    setBusy(true); setError(null);
    try { const s = await fn(); if (s) onState(s); next(); } catch { setError(w('failed')); } finally { setBusy(false); }
  };

  // The one set of handlers: the buttons below and the agent both call exactly these.
  const saveName = () => run(() => putOnboarding('basics', { display_name: name.trim() }));
  const saveWhere = () => run(() => putOnboarding('basics', { country: typed ? 'other' : 'SG', ...(area.trim() ? { area_name: area.trim() } : {}) }));
  const toggleLike = (k: string) => setLikes((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  const saveLikes = () => run(() => putOnboarding('interests', { interests: likes }));
  const skipLikes = () => run(() => skipOnboarding('interests'));
  const pickRemind = (c: string) => run(() => putOnboarding('channels', { preferred_channel: c }));
  const laterRemind = () => run(() => skipOnboarding('channels'));
  const goBack = back ? () => back() : undefined;

  // What the agent can read and press on this step.
  const nextAction = (run_: () => void): PageDataAction => ({ id: 'next', label: w('o_next'), run: run_ });
  const stepActions: PageDataAction[] =
    step === 'name' ? [nextAction(() => name.trim() && void saveName())]
    : step === 'where' ? [
        ...TOWNS.map((t, k) => ({ id: `town${k + 1}`, label: t, run: () => { setArea(t); setTyped(false); } })),
        { id: 'townOther', label: w('o_other'), run: () => { setTyped(true); setArea(''); } },
        nextAction(() => void saveWhere()),
      ]
    : step === 'enjoy' ? [
        ...INTERESTS.map((x) => ({ id: `like${cap(x.key)}`, label: `${w(`interest_${x.key}`)}${likes.includes(x.key) ? ' ✓' : ''}`, run: () => toggleLike(x.key) })),
        likes.length ? nextAction(() => void saveLikes()) : { id: 'skip', label: w('o_skip'), run: () => void skipLikes() },
      ]
    : step === 'reminders' ? [
        { id: 'remindApp', label: w('o_rem_app'), run: () => void pickRemind('app') },
        { id: 'remindWhatsapp', label: w('o_rem_wa'), run: () => void pickRemind('whatsapp') },
        { id: 'remindCall', label: w('o_rem_call'), run: () => void pickRemind('call') },
        { id: 'later', label: w('o_later'), run: () => void laterRemind() },
      ]
    : [];
  const title: Record<StepId, string> = { name: w('o_name_t'), where: w('o_where_t'), enjoy: w('o_enjoy_t'), voice: w('o_voice_t'), reminders: w('o_rem_t'), welcome: w('o_welcome', { name }) };
  const valueNow = step === 'name' ? name : step === 'where' ? area : step === 'enjoy' ? likes.map((k) => w(`interest_${k}`)).join(', ') : '';
  usePageData(page, step === 'voice' || step === 'welcome' ? null : {
    values: [{ label: title[step], value: valueNow }, ...(goBack ? [] : [])],
    images: [],
    lists: [],
    actions: [...stepActions, ...(goBack ? [{ id: 'back', label: w('o_back'), run: goBack }] : [])],
  });
  useField(page, 'name', name, (v) => setName(String(v)));
  useField(page, 'area', area, (v) => { setArea(String(v)); setTyped(true); });

  const err = error ? <Text style={{ color: colors.danger, fontWeight: '600', marginTop: space.sm }}>{error}</Text> : null;
  const common = { onBack: back, backLabel: w('o_back') };

  if (step === 'name') {
    return (
      <Frame {...common} step={w('o_step3', { n: 1 })} title={w('o_name_t')} primary={{ label: w('o_next'), onPress: () => void saveName(), disabled: busy || !name.trim() }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: space.sm }}>{w('o_name_f')}</Text>
        <TextInput value={name} onChangeText={setName} onSubmitEditing={() => name.trim() && void saveName()} accessibilityLabel={w('o_name_f')} autoCapitalize="words"
          style={{ minHeight: 60, fontSize: 22, fontWeight: '600', color: colors.ink, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, outlineStyle: 'none' } as never} />
        {err}
      </Frame>
    );
  }
  if (step === 'where') {
    return (
      <Frame {...common} step={w('o_step3', { n: 2 })} title={w('o_where_t')} primary={{ label: w('o_next'), onPress: () => void saveWhere(), disabled: busy }}>
        <View style={grid}>
          {TOWNS.map((t) => <Chip key={t} label={t} on={area === t && !typed} onPress={() => { setArea(t); setTyped(false); }} />)}
          <Chip full label={w('o_other')} on={typed} onPress={() => { setTyped(true); setArea(''); }} />
        </View>
        {typed ? (
          <TextInput value={area} onChangeText={setArea} placeholder={w('o_town_f')} placeholderTextColor={colors.muted} accessibilityLabel={w('o_town_f')} autoFocus
            style={{ marginTop: space.md, minHeight: 60, fontSize: 19, color: colors.ink, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, outlineStyle: 'none' } as never} />
        ) : null}
        {err}
      </Frame>
    );
  }
  if (step === 'enjoy') {
    return (
      <Frame {...common} step={w('o_step3', { n: 3 })} title={w('o_enjoy_t')} hint={w('o_pick_many')}
        primary={likes.length ? { label: w('o_next'), onPress: () => void saveLikes(), disabled: busy } : undefined} secondary={likes.length ? undefined : { label: w('o_skip'), onPress: () => void skipLikes() }}>
        <View style={grid}>{INTERESTS.map((x) => <Interest key={x.key} icon={x.icon} label={w(`interest_${x.key}`)} on={likes.includes(x.key)} onPress={() => toggleLike(x.key)} />)}</View>
        {err}
      </Frame>
    );
  }
  if (step === 'voice') return <Voice common={common} onDone={next} />;
  if (step === 'reminders') {
    return (
      <Frame {...common} title={w('o_rem_t')} secondary={{ label: w('o_later'), onPress: () => void laterRemind() }}>
        <ListCard icon="notifications-outline" title={w('o_rem_app')} line={w('o_rem_app_l')} onPress={() => void pickRemind('app')} />
        <ListCard icon="logo-whatsapp" title={w('o_rem_wa')} line={w('o_rem_wa_l')} onPress={() => void pickRemind('whatsapp')} />
        <ListCard icon="call-outline" title={w('o_rem_call')} line={w('o_rem_call_l')} onPress={() => void pickRemind('call')} />
        {err}
      </Frame>
    );
  }
  return <Welcome name={name.trim() || user?.display_name || ''} finish={async () => { try { await putOnboarding('consent', { privacy: true, terms: true }); } catch { /* the server asks again at the next start */ } onboardingLocal.done = true; await finish(); }} />;
}

// ---------- your voice: record up to ten seconds, or skip ----------
function Voice({ common, onDone }: { common: { onBack?: () => void; backLabel: string }; onDone: () => void }) {
  const w = usePageWords(page);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [uri, setUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const player = useAudioPlayer(uri);
  useEffect(() => {
    if (!recording) { setSeconds(0); return; }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);
  useEffect(() => {
    if (recording && seconds >= 10) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording]);
  const start = async () => {
    setMessage(null);
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) { setMessage(w('voice_permission')); return; }
      await AudioModule.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 10 });
      setUri(null);
      setRecording(true);
    } catch { setMessage(w('voice_permission')); }
  };
  const stop = async () => {
    try { await recorder.stop(); } catch { /* already stopped */ }
    setUri(recorder.uri ?? null);
    setRecording(false);
  };
  const save = async () => {
    if (uri && !saving) {
      setSaving(true);
      try {
        const res = await uploadVoiceIntro(uri);
        await api('PATCH', '/v1/me', { voice_intro_url: res.url } as never);
      } catch { setMessage(w('voice_not_saved')); } finally { setSaving(false); }
    }
    onDone();
  };
  usePageData(page, {
    values: [{ label: w('o_voice_t'), value: recording ? String(10 - seconds) : uri ? w('voice_recorded') : '' }],
    images: [],
    lists: [],
    actions: [
      { id: 'record', label: recording ? w('voice_stop') : uri ? w('voice_again') : w('voice_record'), run: () => void (recording ? stop() : start()) },
      uri && !recording ? { id: 'next', label: w('o_next'), run: () => void save() } : { id: 'skip', label: w('o_skip'), run: onDone },
      ...(common.onBack ? [{ id: 'back', label: w('o_back'), run: common.onBack }] : []),
    ],
  });
  return (
    <Frame {...common} inlineTitle title={w('o_voice_t')} primary={uri && !recording ? { label: saving ? w('voice_saving') : w('o_next'), onPress: () => void save(), disabled: saving } : undefined} secondary={uri && !recording ? undefined : { label: w('o_skip'), onPress: onDone }}>
      <View style={{ padding: space.lg, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{w('o_voice_card')}</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: space.sm }]}>{w('o_voice_ex')}</Text>
      </View>
      <View style={{ height: space.md }} />
      <Bar icon={recording ? 'stop' : 'mic-outline'} label={recording ? `${w('voice_stop')}  ${10 - seconds}` : uri ? w('voice_again') : w('voice_record')} onPress={() => void (recording ? stop() : start())} />
      {uri && !recording ? (
        <Pressable onPress={() => { player.seekTo(0); player.play(); }} accessibilityRole="button" style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: space.sm }}>
          <Ionicons name="play" size={22} color={colors.accent} accessible={false} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accent }}>{w('voice_play')}</Text>
        </Pressable>
      ) : null}
      <Text style={[type.body, { color: colors.muted, marginTop: space.md }]}>{message ?? w('o_voice_note')}</Text>
    </Frame>
  );
}

// ---------- welcome ----------
function Welcome({ name, finish }: { name: string; finish: () => Promise<void> }) {
  const w = usePageWords(page);
  const pop = useRef(new Animated.Value(0.6)).current;
  const [busy, setBusy] = useState(false);
  useEffect(() => { Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 10 }).start(); }, [pop]);
  const home = () => { if (busy) return; setBusy(true); void finish().finally(() => setBusy(false)); };
  usePageData(page, { values: [{ label: w('o_welcome', { name }), value: w('o_welcome_ref') }], images: [], lists: [], actions: [{ id: 'goHome', label: w('o_home'), run: home }] });
  return (
    <Frame primary={{ label: w('o_home'), icon: 'home-outline', onPress: home, disabled: busy }}>
      <View style={{ alignItems: 'center', paddingTop: space.xl * 2 }}>
        <Animated.View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }] }}>
          <Ionicons name="checkmark" size={64} color={colors.card} accessible={false} />
        </Animated.View>
        <Text accessibilityRole="header" style={{ fontSize: 32, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: space.xl }}>{w('o_welcome', { name })}</Text>
        <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginTop: space.sm, fontSize: 19 }]}>{w('o_welcome_ref')}</Text>
        <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.xl }]}>{w('o_consent_note')}</Text>
      </View>
    </Frame>
  );
}

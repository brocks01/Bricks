// Onboarding after sign-in, screen for screen like the reference: name (step 1 of 3), where you live (2 of 3), what you enjoy (3 of 3), your voice,
// how to remind you, welcome. Only these. Everything else Wisdom needs is asked later (by the agent or in the profile), never here.
import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { uploadVoiceIntro } from '../../api/media';
import { putOnboarding, skipOnboarding, type OnboardingState } from '../../api/wisdom';
import { useStore } from '../../core/store';
import { usePageWords } from '../../kit';
import { sessionStore } from '../../session/store';
import { colors, radius, space, type } from '../../theme/tokens';
import { Bar, Chip, Frame, Interest, ListCard, SayIt, grid, type Icon } from './kit';
import { onboardingIndex as page } from './pages';
import { whoStore } from './who';

const TOWNS = ['Bishan', 'Toa Payoh', 'Ang Mo Kio', 'Tampines', 'Jurong West', 'Woodlands'];
const INTERESTS: { key: string; icon: Icon }[] = [
  { key: 'walking', icon: 'walk-outline' }, { key: 'taichi', icon: 'body-outline' }, { key: 'cooking', icon: 'restaurant-outline' }, { key: 'chess', icon: 'extension-puzzle-outline' },
  { key: 'music', icon: 'musical-notes-outline' }, { key: 'gardening', icon: 'leaf-outline' }, { key: 'teaching', icon: 'school-outline' }, { key: 'tech', icon: 'laptop-outline' },
];
type StepId = 'name' | 'where' | 'enjoy' | 'voice' | 'reminders' | 'welcome';
const ORDER: StepId[] = ['name', 'where', 'enjoy', 'voice', 'reminders', 'welcome'];
const ans = (st: OnboardingState, sec: string, key: string): unknown => st.sections.find((s) => s.id === sec)?.questions.find((q) => q.key === key)?.answer;

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
  const err = error ? <Text style={{ color: colors.danger, fontWeight: '600', marginTop: space.sm }}>{error}</Text> : null;
  const common = { onBack: back, backLabel: w('o_back') };

  if (step === 'name') {
    return (
      <Frame {...common} step={w('o_step3', { n: 1 })} title={w('o_name_t')} primary={{ label: w('o_next'), onPress: () => void run(() => putOnboarding('basics', { display_name: name.trim() })), disabled: busy || !name.trim() }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: space.sm }}>{w('o_name_f')}</Text>
        <TextInput value={name} onChangeText={setName} onSubmitEditing={() => name.trim() && void run(() => putOnboarding('basics', { display_name: name.trim() }))} accessibilityLabel={w('o_name_f')} autoCapitalize="words"
          style={{ minHeight: 60, fontSize: 22, fontWeight: '600', color: colors.ink, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, outlineStyle: 'none' } as never} />
        <SayIt label={w('o_say')} />
        {err}
      </Frame>
    );
  }
  if (step === 'where') {
    const save = () => run(() => (area.trim() ? putOnboarding('basics', { country: typed ? 'other' : 'SG', area_name: area.trim() }) : Promise.resolve()));
    return (
      <Frame {...common} step={w('o_step3', { n: 2 })} title={w('o_where_t')} primary={{ label: w('o_next'), onPress: () => void save(), disabled: busy }}>
        <View style={grid}>
          {TOWNS.map((t) => <Chip key={t} label={t} on={area === t && !typed} onPress={() => { setArea(t); setTyped(false); }} />)}
          <Chip full label={w('o_other')} on={typed} onPress={() => { setTyped(true); setArea(''); }} />
        </View>
        {typed ? (
          <TextInput value={area} onChangeText={setArea} placeholder={w('o_town_f')} placeholderTextColor={colors.muted} accessibilityLabel={w('o_town_f')} autoFocus
            style={{ marginTop: space.md, minHeight: 60, fontSize: 19, color: colors.ink, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, outlineStyle: 'none' } as never} />
        ) : null}
        <SayIt label={w('o_say')} />
        {err}
      </Frame>
    );
  }
  if (step === 'enjoy') {
    const toggle = (k: string) => setLikes((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
    const save = () => run(() => putOnboarding('interests', { interests: likes }));
    return (
      <Frame {...common} step={w('o_step3', { n: 3 })} title={w('o_enjoy_t')} hint={w('o_pick_many')}
        primary={likes.length ? { label: w('o_next'), onPress: () => void save(), disabled: busy } : undefined} secondary={likes.length ? undefined : { label: w('o_skip'), onPress: () => void run(() => skipOnboarding('interests')) }}>
        <View style={grid}>{INTERESTS.map((x) => <Interest key={x.key} icon={x.icon} label={w(`interest_${x.key}`)} on={likes.includes(x.key)} onPress={() => toggle(x.key)} />)}</View>
        <SayIt label={w('o_say')} />
        {err}
      </Frame>
    );
  }
  if (step === 'voice') return <Voice common={common} onDone={next} />;
  if (step === 'reminders') {
    const pick = (c: string) => void run(() => putOnboarding('channels', { preferred_channel: c }));
    return (
      <Frame {...common} title={w('o_rem_t')} secondary={{ label: w('o_later'), onPress: () => void run(() => skipOnboarding('channels')) }}>
        <ListCard icon="notifications-outline" title={w('o_rem_app')} line={w('o_rem_app_l')} onPress={() => pick('app')} />
        <ListCard icon="logo-whatsapp" title={w('o_rem_wa')} line={w('o_rem_wa_l')} onPress={() => pick('whatsapp')} />
        <ListCard icon="call-outline" title={w('o_rem_call')} line={w('o_rem_call_l')} onPress={() => pick('call')} />
        {err}
      </Frame>
    );
  }
  return <Welcome name={name.trim() || user?.display_name || ''} finish={async () => { try { await putOnboarding('consent', { privacy: true, terms: true }); } catch { /* the server asks again at the next start */ } await finish(); }} />;
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
  return (
    <Frame primary={{ label: w('o_home'), icon: 'home-outline', onPress: () => { setBusy(true); void finish().finally(() => setBusy(false)); }, disabled: busy }}>
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

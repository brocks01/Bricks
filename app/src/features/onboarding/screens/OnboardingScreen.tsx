import { useCallback, useEffect, useState } from 'react';
import { AudioModule, RecordingPresets, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { getOnboarding, putOnboarding, skipOnboarding, type OnboardingState, type Question, type Section } from '../../../api/wisdom';
import { uploadVoiceIntro } from '../../../api/media';
import { api } from '../../../api/client';
import { ChipRow } from '../../../components/blocks';
import { Button, Card, Body, ErrorText, Field, Screen } from '../../../components/ui';
import { usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, radius, space } from '../../../theme/tokens';
import { firstTab, loadProfile, profileStore } from '../state';
import { whoStore, loadWho, setWho, type Who } from '../who';
import { onboardingIndex as page } from '../pages';
import { exploreCommunities } from '../../../api/communityRules';

const nice = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const WORDS: Record<string, Record<string, string>> = {
  language: { en: 'English', hi: 'हिन्दी', bn: 'বাংলা', ta: 'தமிழ்', zh: '中文', ms: 'Bahasa Melayu' },
  age_band: { under40: 'Under 40', '40to59': '40 to 59', '60plus': '60 and over' },
  country: { SG: 'Singapore', IN: 'India', other: 'Somewhere else' },
  roles: { connect: 'Stay connected and active', share: 'Share what I know', learn: 'Learn from experienced people', help: 'Help older people', care: 'Look after someone I love' },
  preferred_channel: { call: 'Phone call', whatsapp: 'WhatsApp', telegram: 'Telegram', sms: 'Text message', app: 'The app' },
  voice_or_text: { voice: 'Talking', text: 'Writing' },
  living: { alone: 'On my own', with_family: 'With family', care_home: 'In a care home' },
  gender: { man: 'Man', woman: 'Woman', other: 'Another gender', prefer_not_to_say: 'Prefer not to say' },
  hearing: { fine: 'Fine', some_trouble: 'Some trouble', hard: 'Hard' }, eyesight: { fine: 'Fine', some_trouble: 'Some trouble', hard: 'Hard' }, walking: { fine: 'Fine', some_trouble: 'Some trouble', hard: 'Hard' },
  share_modes: { voice_capsules: 'Spoken stories', live_sessions: 'Live sessions', freelance: 'Freelance work' },
  pay: { volunteer: 'Free', paid: 'Paid', either: 'Either' },
  offers: { companionship: 'Company', errands: 'Errands', digital_help: 'Help with phones and computers' },
};
const FEELING: Record<string, string> = { hardly_ever: 'Hardly ever', some_of_the_time: 'Some of the time', often: 'Often' };
const word = (key: string, option: string) => WORDS[key]?.[option] ?? FEELING[option] ?? nice(option);
const INTEREST_KEYS = ['walking', 'taichi', 'cooking', 'chess', 'music', 'gardening', 'teaching', 'tech'] as const;
const INTEREST_ICONS: Record<string, string> = { walking: 'walk-outline', taichi: 'leaf-outline', cooking: 'restaurant-outline', chess: 'grid-outline', music: 'musical-notes-outline', gardening: 'flower-outline', teaching: 'school-outline', tech: 'phone-portrait-outline' };
type ServerQ = Question & { why?: string | null };
type Values = Record<string, unknown>;

function Why({ text, under }: { text?: string | null; under?: boolean }) {
  if (!text) return null;
  return <Text style={{ fontSize: 14, color: '#5A6472', marginTop: under ? -10 : 0, marginBottom: under ? space.md : space.sm }}>{text}</Text>;
}

function Ask({ q, value, onChange, yes, no }: { q: ServerQ; value: unknown; onChange: (v: unknown) => void; yes: string; no: string }) {
  const w = usePageWords(page);
  const opt = (o: string) => (q.key === 'gender' || q.key === 'keeps' ? w(`${q.key}_${o}`) : word(q.key, o));
  if (q.kind === 'choice') return (
    <View style={{ marginBottom: space.md }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: space.sm }}>{q.label}</Text>
      <Why text={q.why} />
      <ChipRow options={q.options.map((o) => ({ value: o, label: opt(o) }))} value={String(value ?? '')} onChange={onChange} />
    </View>
  );
  if (q.kind === 'bool') return (
    <View style={{ marginBottom: space.md }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: space.sm }}>{q.label}</Text>
      <Why text={q.why} />
      <ChipRow options={[{ value: 'yes', label: yes }, { value: 'no', label: no }]} value={value === true ? 'yes' : value === false ? 'no' : ''} onChange={(v) => onChange(v === 'yes')} />
    </View>
  );
  if (q.kind === 'multi' && q.options.length) {
    const chosen = Array.isArray(value) ? (value as string[]) : [];
    return (
      <View style={{ marginBottom: space.md }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: space.sm }}>{q.label}</Text>
        <Why text={q.why} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {q.options.map((o) => {
            const on = chosen.includes(o);
            return (
              <Pressable key={o} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => onChange(on ? chosen.filter((x) => x !== o) : [...chosen, o])}
                style={{ paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? colors.navy : colors.line, backgroundColor: on ? colors.navy : colors.card }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: on ? '#FFFFFF' : colors.ink }}>{opt(o)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  const text = Array.isArray(value) ? (value as string[]).join(', ') : value == null ? '' : String(value);
  return (
    <>
      <Field label={q.label} value={text} onChangeText={onChange} keyboardType={q.kind === 'int' ? 'numeric' : q.kind === 'phone' ? 'phone-pad' : 'default'}
        placeholder={q.kind === 'multi' ? 'for example: music, cooking' : q.kind === 'time' ? '07:30' : undefined} autoCapitalize={q.key === 'display_name' ? 'words' : 'sentences'} />
      <Why text={q.why} under />
    </>
  );
}

function WhoStep({ w, onPicked }: { w: (id: string) => string; onPicked: (who: Who) => void }) {
  const cards: { who: Who; title: string; line: string; icon: string; disabled?: boolean }[] = [
    { who: 'myself', title: w('who_myself'), line: w('who_myself_line'), icon: 'person-outline' },
    { who: 'family', title: w('who_family'), line: w('who_family_line'), icon: 'people-outline' },
    { who: 'family', title: w('who_community'), line: w('who_community_line'), icon: 'business-outline', disabled: true },
  ];
  return (
    <Screen title={w('heading')} subtitle={w('who_intro')}>
      <View style={{ gap: space.md }}>
        {cards.map((c, i) => (
          <Pressable key={i} disabled={c.disabled} onPress={() => { if (!c.disabled) { setWho(c.who === 'family' ? 'family' : 'myself'); onPicked(c.who === 'family' ? 'family' : 'myself'); } }}
            style={{ opacity: c.disabled ? 0.5 : 1, minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
            <Ionicons name={c.icon as any} size={32} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }}>{c.title}</Text>
              <Text style={{ fontSize: 15, color: '#4A5361', marginTop: 2 }}>{c.line}</Text>
              {c.disabled ? <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{w('comingSoon')}</Text> : null}
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function InterestsTiles({ q, value, onChange }: { q: Question; value: unknown; onChange: (v: unknown) => void }) {
  const w = usePageWords(page);
  const chosen = Array.isArray(value) ? (value as string[]) : [];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
      {INTEREST_KEYS.map((k) => {
        const on = chosen.includes(k);
        return (
          <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => onChange(on ? chosen.filter((x) => x !== k) : [...chosen, k])}
            style={{ flexBasis: '48%', minHeight: 72, padding: space.md, borderRadius: 14, borderWidth: 1, borderColor: on ? colors.navy : colors.line, backgroundColor: on ? colors.navySoft : colors.card, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={INTEREST_ICONS[k] as any} size={28} color={colors.accent} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink, marginTop: space.xs, textAlign: 'center' }}>{w(`interest_${k}`)}</Text>
            {on ? <Ionicons name="checkmark-circle" size={18} color={colors.navy} style={{ position: 'absolute', top: 8, right: 8 }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function VoiceIntro({ w, onDone }: { w: (id: string) => string; onDone: () => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [uri, setUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const player = useAudioPlayer(uri);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= 10) { recorder.stop().then(() => { setUri(recorder.uri ?? null); setRecording(false); }).catch(() => setRecording(false)); return 10; }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [recording, recorder]);
  // reset counter when a recording ends
  useEffect(() => { if (!recording) setSeconds(0); }, [recording]);
  const start = async () => {
    setMessage(null);
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) { setMessage(w('voice_permission')); return; }
      await AudioModule.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 10 });
      setRecording(true);
    } catch { setMessage(w('voice_permission')); }
  };
  const stop = async () => {
    try { await recorder.stop(); } catch { /* ignore */ }
    setUri(recorder.uri ?? null);
    setRecording(false);
  };
  const next = async () => {
    if (uri && !uploading) {
      setUploading(true);
      try {
        const res = await uploadVoiceIntro(uri);
        await api('PATCH', '/v1/me', { voice_intro_url: res.url } as never);
      } catch (e: any) {
        if (e?.status === 503) setMessage(w('voice_not_saved'));
        else setMessage(w('voice_not_saved'));
      } finally { setUploading(false); }
    }
    onDone();
  };
  return (
    <Screen title={w('voice_heading')} subtitle={w('voice_intro')}>
      {message ? <Text style={{ color: colors.danger, marginBottom: space.md, fontSize: 16 }}>{message}</Text> : null}
      <View style={{ alignItems: 'center', gap: space.lg, marginVertical: space.xl }}>
        {!recording ? (
          <Pressable onPress={() => void start()} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="mic" size={40} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable onPress={() => void stop()} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="stop" size={40} color="#FFFFFF" />
          </Pressable>
        )}
        <Text style={{ fontSize: 22, fontWeight: '600', color: colors.ink }}>{recording ? (10 - seconds) : (uri ? w('voice_recorded') : w('voice_prompt'))}</Text>
        {uri && !recording ? (
          <Pressable onPress={() => { player.seekTo(0); player.play(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="play" size={22} color={colors.accent} />
            <Text style={{ fontSize: 17, color: colors.accent, fontWeight: '600' }}>{w('voice_play')}</Text>
          </Pressable>
        ) : null}
        {uri && !recording ? (
          <Pressable onPress={() => { setUri(null); setMessage(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="refresh" size={22} color={colors.muted} />
            <Text style={{ fontSize: 17, color: colors.muted, fontWeight: '600' }}>{w('voice_again')}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: space.sm }}>
        <Button label={uploading ? w('voice_saving') : w('voice_next')} onPress={() => void next()} disabled={uploading || recording} />
        <Button kind="plain" label={w('voice_skip')} onPress={() => onDone()} disabled={uploading || recording} />
      </View>
    </Screen>
  );
}

export default function OnboardingScreen() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [values, setValues] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whoReady, setWhoReady] = useState(false);
  const [whoChosen, setWhoChosen] = useState<Who | null>(null);
  const [voiceDone, setVoiceDone] = useState(false);
  const [voiceIntroDone] = useState<boolean>(() => { try { return (typeof window !== 'undefined' ? window.localStorage.getItem('bricks.voiceIntro') === '1' : false); } catch { return false; } });

  const open = useCallback((st: OnboardingState) => {
    setState(st);
    const next = st.next;
    setValues(next ? Object.fromEntries(next.questions.filter((q) => q.answer !== null && q.answer !== undefined).map((q) => [q.key, q.answer])) : {});
    setError(null);
  }, []);

  useEffect(() => { void loadWho().then(() => { setWhoChosen(whoStore.get().who); setWhoReady(true); }); }, []);
  useEffect(() => { getOnboarding().then(open).catch(() => setError(w('failed'))); }, [open, w]);

  const finish = useCallback(async () => {
    await loadProfile();
    const who = whoStore.get().who;
    if (who === 'family') { go('family.create', {}, { replace: true }); return; }
    try {
      const r = await exploreCommunities('');
      const openList = (r.communities ?? []).filter((c: any) => c.privacy === 'open' && !c.joined);
      if (openList.length > 0 && (r.limits?.left ?? 0) > 0) { go('connect.pick', {}, { replace: true }); return; }
    } catch { /* fall through to the normal home */ }
    go(firstTab(profileStore.get().profile), {}, { replace: true });
  }, [go]);

  const section: Section | null = state?.next ?? null;
  const steps = state ? state.sections.length : 0;
  const index = state && section ? state.sections.findIndex((s) => s.id === section.id) + 1 : 0;
  const titleFor = (s: Section) => s.id === 'interests' ? w('interests_title') : s.id === 'belonging' ? w('belonging_title') : s.title;

  const save = async () => {
    if (!section) return;
    const answers: Values = {};
    for (const q of section.questions) {
      const v = values[q.key];
      if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
      answers[q.key] = v;
    }
    if (Object.keys(answers).length === 0 && section.required) { setError(w('failed')); return; }
    setBusy(true);
    try {
      const next = Object.keys(answers).length ? await putOnboarding(section.id, answers) : await skipOnboarding(section.id);
      open(next);
      if (!next.next) {
        if (section.id === 'interests' || true) { /* voice step before finish */ }
      }
    } catch { setError(w('failed')); } finally { setBusy(false); }
  };
  // voice intro step shows once sections are done
  if (!whoReady) return <Screen title={w('heading')} subtitle={w('loading')}><ErrorText>{error}</ErrorText></Screen>;
  if (whoChosen === null) {
    return <WhoStep w={w} onPicked={(who) => { setWho(who); setWhoChosen(who); }} />;
  }
  if (!state) return <Screen title={w('heading')} subtitle={w('loading')}><ErrorText>{error}</ErrorText></Screen>;
  if (!section) {
    if (!voiceIntroDone && !voiceDone) {
      return <VoiceIntro w={w} onDone={() => { try { window.localStorage.setItem('bricks.voiceIntro', '1'); } catch {} setVoiceDone(true); }} />;
    }
    return <Screen title={w('heading')} subtitle={w('allDone')}><Button label={w('continue')} onPress={() => void finish()} /></Screen>;
  }
  const isInterests = section.id === 'interests';

  return (
    <Screen title={titleFor(section)} subtitle={index === 1 && section.required ? w('intro') : w('step', { n: index, total: steps })}>
      <Card>
        <Body muted>{section.required ? w('needed') : w('optional')}</Body>
        <View style={{ height: space.md }} />
        {isInterests ? <InterestsTiles q={section.questions[0]} value={values[section.questions[0].key]} onChange={(v) => setValues((s) => ({ ...s, [section.questions[0].key]: v }))} /> : null}
        {!isInterests ? section.questions.map((q) => (
          <Ask key={q.key} q={q as ServerQ} value={values[q.key]} onChange={(v) => setValues((s) => ({ ...s, [q.key]: v }))} yes={w('yes')} no={w('no')} />
        )) : null}
        <ErrorText>{error}</ErrorText>
        <Button label={w('save')} onPress={() => void save()} disabled={busy} />
        {!section.required ? (
          <>
            <View style={{ height: space.sm }} />
            <Button kind="plain" label={w('skip')} onPress={async () => { setBusy(true); try { const n = await skipOnboarding(section.id); open(n); } catch { setError(w('failed')); } finally { setBusy(false); } }} disabled={busy} />
            <View style={{ height: space.sm }} />
            <Button kind="plain" label={w('later')} onPress={() => void finish()} disabled={busy} />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

// The short, step-by-step onboarding: one question per screen, big touch cards, a progress bar, "Read it out", "Say it instead".
// Only what Wisdom needs to start is asked here (name, age, where, what brings you, what you enjoy, consent). Everything else stays in the database and is asked later.
import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import * as Speech from 'expo-speech';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { audioAvailable } from '../../agent/audio';
import { startTalk } from '../../agent/live';
import { api } from '../../api/client';
import { uploadVoiceIntro } from '../../api/media';
import { putOnboarding, skipOnboarding, type OnboardingState } from '../../api/wisdom';
import { Button } from '../../components/ui';
import { useStore } from '../../core/store';
import { LANGUAGES } from '../../i18n/languages';
import { languageStore, setLanguage } from '../../i18n/store';
import { usePageWords } from '../../kit';
import { prefs, setPref, type TextSize } from '../../prefs/store';
import { sessionStore } from '../../session/store';
import { colors, radius, space, type } from '../../theme/tokens';
import { Collage, Confetti } from './Collage';
import { onboardingIndex as page } from './pages';
import type { Who } from './who';

type Icon = keyof typeof Ionicons.glyphMap;
const SPEECH_LANG: Record<string, string> = { en: 'en-GB', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', zh: 'zh-CN', ms: 'ms-MY' };
const ROLE_ICON: Record<string, Icon> = { connect: 'people-outline', share: 'bulb-outline', learn: 'school-outline', help: 'hand-left-outline', care: 'heart-outline' };
const ROLES = ['connect', 'share', 'learn', 'help', 'care'];
const INTERESTS: { key: string; icon: Icon }[] = [
  { key: 'walking', icon: 'walk-outline' }, { key: 'taichi', icon: 'body-outline' }, { key: 'cooking', icon: 'restaurant-outline' }, { key: 'chess', icon: 'grid-outline' },
  { key: 'music', icon: 'musical-notes-outline' }, { key: 'gardening', icon: 'flower-outline' }, { key: 'teaching', icon: 'school-outline' }, { key: 'tech', icon: 'phone-portrait-outline' },
];
const TOWNS: Record<string, string[]> = {
  SG: ['Bishan', 'Toa Payoh', 'Ang Mo Kio', 'Tampines', 'Jurong West', 'Woodlands', 'Bedok', 'Yishun', 'Punggol', 'Clementi', 'Hougang', 'Sengkang', 'Queenstown', 'Geylang'],
  IN: ['Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Patna', 'Bengaluru', 'Hyderabad', 'Lucknow'],
  other: [],
};

// ---------- the frame every step sits in ----------
function Enter({ id, children }: { id: string; children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [id, v]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>{children}</Animated.View>;
}

function Frame({ id, title, hint, n, total, onBack, speak, say, primary, secondary, children, bare, top }: {
  id: string; top?: ReactNode; title?: string; hint?: string; n?: number; total?: number; onBack?: () => void; speak?: string; say?: boolean;
  primary?: { label: string; onPress: () => void; disabled?: boolean }; secondary?: { label: string; onPress: () => void }; children: ReactNode; bare?: boolean;
}) {
  const w = usePageWords(page);
  const insets = useSafeAreaInsets();
  const { code } = useStore(languageStore);
  const grow = useRef(new Animated.Value(0)).current;
  const [speaking, setSpeaking] = useState(false);
  const frac = n && total ? n / total : 0;
  useEffect(() => {
    Animated.timing(grow, { toValue: frac, duration: 420, useNativeDriver: false }).start();
  }, [frac, grow]);
  useEffect(() => () => { void Speech.stop(); }, [id]);
  const read = () => {
    if (speaking) { void Speech.stop(); setSpeaking(false); return; }
    setSpeaking(true);
    Speech.speak([title, hint, speak].filter(Boolean).join('. '), { language: SPEECH_LANG[code] ?? 'en-GB', onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.md }}>
        <Pressable onPress={read} accessibilityRole="button" accessibilityLabel={w('o_read')} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: speaking ? colors.accent : colors.card, borderWidth: 1, borderColor: speaking ? colors.accent : colors.line }}>
          <Ionicons name={speaking ? 'stop-circle-outline' : 'volume-high-outline'} size={20} color={speaking ? colors.card : colors.ink} accessible={false} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: speaking ? colors.card : colors.ink }}>{w('o_read')}</Text>
        </Pressable>
        {n && total ? <Text style={[type.small, { color: colors.muted, fontWeight: '600' }]}>{w('o_stepof', { n, total })}</Text> : null}
      </View>
      {n && total ? (
        <View style={{ height: 6, marginHorizontal: space.lg, marginTop: space.md, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
          <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: colors.accent, width: grow.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        </View>
      ) : null}
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, paddingBottom: 220 }}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={w('o_back')} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingRight: 14, marginBottom: space.sm }}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} accessible={false} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{w('o_back')}</Text>
          </Pressable>
        ) : null}
        <Enter id={id}>
          {top}
          {title ? <Text accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: colors.ink, marginTop: bare ? 0 : space.sm }}>{title}</Text> : null}
          {hint ? <Text style={[type.body, { color: colors.muted, marginTop: space.sm }]}>{hint}</Text> : null}
          <View style={{ height: space.lg }} />
          {children}
        </Enter>
      </ScrollView>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 66 + insets.bottom, gap: space.sm, backgroundColor: colors.bg }}>
        {say ? (
          <Pressable onPress={() => void startTalk({ mic: audioAvailable() })} accessibilityRole="button" accessibilityLabel={w('o_say')} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.accentLine }}>
            <Ionicons name="mic-outline" size={22} color={colors.accent} accessible={false} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.accent }}>{w('o_say')}</Text>
          </Pressable>
        ) : null}
        {primary ? <Button label={primary.label} onPress={primary.onPress} disabled={primary.disabled} icon="arrow-forward" /> : null}
        {secondary ? <Button kind="plain" label={secondary.label} onPress={secondary.onPress} /> : null}
      </View>
    </View>
  );
}

// ---------- the pieces ----------
function Card({ icon, title, line, on, onPress, disabled }: { icon?: Icon; title: string; line?: string; on?: boolean; onPress: () => void; disabled?: boolean }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Animated.View style={{ transform: [{ scale: s }], marginBottom: space.md, opacity: disabled ? 0.5 : 1 }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityState={{ selected: !!on }}
        style={{ minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.card, backgroundColor: on ? colors.accentSoft : colors.card, borderWidth: 2, borderColor: on ? colors.accent : colors.line }}
      >
        {icon ? (
          <View style={{ width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : colors.accentSoft }}>
            <Ionicons name={icon} size={28} color={on ? colors.card : colors.accent} accessible={false} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>{title}</Text>
          {line ? <Text style={[type.small, { color: colors.muted, marginTop: 2 }]}>{line}</Text> : null}
        </View>
        <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={on ? colors.accent : colors.line} accessible={false} />
      </Pressable>
    </Animated.View>
  );
}

function Tile({ label, icon, on, onPress }: { label: string; icon?: Icon; on: boolean; onPress: () => void }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return (
    <Animated.View style={{ flexBasis: '48%', flexGrow: 1, transform: [{ scale: s }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.95)}
        onPressOut={() => to(1)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        style={{ minHeight: icon ? 84 : 60, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? colors.accent : colors.card, borderWidth: 2, borderColor: on ? colors.accent : colors.line }}
      >
        {icon ? <Ionicons name={icon} size={28} color={on ? colors.card : colors.accent} accessible={false} /> : null}
        <Text style={{ fontSize: 17, fontWeight: '700', color: on ? colors.card : colors.ink, textAlign: 'center' }}>{label}</Text>
        {on ? <Ionicons name="checkmark-circle" size={18} color={colors.card} style={{ position: 'absolute', top: 8, right: 8 }} accessible={false} /> : null}
      </Pressable>
    </Animated.View>
  );
}

const grid = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: space.sm };

// ---------- the flow ----------
type StepId = 'lang' | 'who' | 'size' | 'name' | 'age' | 'where' | 'roles' | 'enjoy' | 'voice' | 'agree' | 'welcome';
const LANG_KEY = 'wisdom.lang.asked';
const VOICE_KEY = 'wisdom.voice.asked';
const ans = (st: OnboardingState, sec: string, key: string): unknown => st.sections.find((s) => s.id === sec)?.questions.find((q) => q.key === key)?.answer;
const SIZE_KEY = 'wisdom.size.asked';
async function store() {
  try { return (await import('@react-native-async-storage/async-storage')).default; } catch { return null; }
}

export function Wizard({ state, who, onWho, onState, finish, more }: {
  state: OnboardingState; who: Who | null; onWho: (w: Who) => void; onState: (s: OnboardingState) => void; finish: () => Promise<void>; more: () => void;
}) {
  const w = usePageWords(page);
  const { user } = useStore(sessionStore);
  const { textSize } = useStore(prefs);
  const [plan, setPlan] = useState<StepId[] | null>(null);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(String(ans(state, 'basics', 'display_name') ?? user?.display_name ?? ''));
  const [age, setAge] = useState(String(ans(state, 'basics', 'age_band') ?? ''));
  const [country, setCountry] = useState(String(ans(state, 'basics', 'country') ?? 'SG'));
  const [area, setArea] = useState(String(ans(state, 'basics', 'area_name') ?? ''));
  const [typed, setTyped] = useState(false);
  const [roles, setRoles] = useState<string[]>(state.roles ?? []);
  const [likes, setLikes] = useState<string[]>(Array.isArray(ans(state, 'interests', 'interests')) ? (ans(state, 'interests', 'interests') as string[]) : []);
  const [privacy, setPrivacy] = useState(ans(state, 'consent', 'privacy') === true);
  const [terms, setTerms] = useState(ans(state, 'consent', 'terms') === true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const asked = !!(await (await store())?.getItem(SIZE_KEY).catch(() => null));
      const secDone = (id: string) => state.sections.find((s) => s.id === id)?.done || state.sections.find((s) => s.id === id)?.skipped;
      const langAsked = !!(await (await store())?.getItem(LANG_KEY).catch(() => null));
      const voiceAsked = !!(await (await store())?.getItem(VOICE_KEY).catch(() => null));
      const p: StepId[] = [];
      if (!langAsked) p.push('lang');
      if (who === null) p.push('who');
      if (!asked) p.push('size');
      if (!ans(state, 'basics', 'display_name')) p.push('name');
      if (!ans(state, 'basics', 'age_band')) p.push('age');
      if (!ans(state, 'basics', 'country') || !ans(state, 'basics', 'area_name')) p.push('where');
      if (!state.roles?.length) p.push('roles');
      if (!secDone('interests')) p.push('enjoy');
      if (!voiceAsked) p.push('voice');
      if (!secDone('consent')) p.push('agree');
      if (alive) setPlan(p);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!plan) return <Frame id="load" bare>{null}</Frame>;
  const total = plan.length;
  const step: StepId = plan[i] ?? 'welcome';
  const advance = () => { setError(null); setI((x) => x + 1); };
  const back = i > 0 && step !== 'welcome' ? () => { setError(null); setI((x) => x - 1); } : undefined;
  const run = async (fn: () => Promise<OnboardingState | void>, then?: () => void) => {
    setBusy(true); setError(null);
    try { const s = await fn(); if (s) onState(s); (then ?? advance)(); } catch { setError(w('failed')); } finally { setBusy(false); }
  };
  const err = error ? <Text style={{ color: colors.danger, fontWeight: '600', marginBottom: space.sm }}>{error}</Text> : null;
  const n = Math.min(i + 1, total);
  const common = { n, total, onBack: back, id: step };

  if (step === 'lang') {
    const done = async () => { try { await (await store())?.setItem(LANG_KEY, '1'); } catch { /* asked again next time */ } advance(); };
    return <LangStep common={common} onNext={() => void done()} />;
  }
  if (step === 'voice') {
    const done = async () => { try { await (await store())?.setItem(VOICE_KEY, '1'); } catch { /* asked again next time */ } advance(); };
    return <VoiceStep common={common} onDone={() => void done()} />;
  }
  if (step === 'who') {
    const pick = (x: Who) => { onWho(x); setTimeout(advance, 220); };
    return (
      <Frame {...common} top={plan.includes('lang') ? undefined : <Collage />} title={w('who_intro')} speak={`${w('who_myself')}. ${w('who_family')}`} say>
        <Card icon="person-outline" title={w('who_myself')} line={w('who_myself_line')} on={who === 'myself'} onPress={() => pick('myself')} />
        <Card icon="people-outline" title={w('who_family')} line={w('who_family_line')} on={who === 'family'} onPress={() => pick('family')} />
        <Card icon="business-outline" title={w('who_community')} line={w('comingSoon')} onPress={() => undefined} disabled />
      </Frame>
    );
  }
  if (step === 'size') {
    const order: { v: TextSize; t: string; l: string }[] = [{ v: 'normal', t: 'o_size_small', l: 'o_size_small_l' }, { v: 'large', t: 'o_size_normal', l: 'o_size_normal_l' }, { v: 'larger', t: 'o_size_large', l: 'o_size_large_l' }];
    const done = async () => { try { await (await store())?.setItem(SIZE_KEY, '1'); } catch { /* the device keeps asking next time */ } advance(); };
    return (
      <Frame {...common} title={w('o_size_t')} hint={w('o_size_h')} speak={order.map((o) => w(o.t)).join('. ')} primary={{ label: w('o_next'), onPress: () => void done() }}>
        {order.map((o) => <Card key={o.v} title={w(o.t)} line={w(o.l)} on={textSize === o.v} onPress={() => setPref({ textSize: o.v })} />)}
      </Frame>
    );
  }
  if (step === 'name') {
    return (
      <Frame {...common} title={w('o_name_t')} hint={w('o_name_h')} say primary={{ label: w('o_next'), onPress: () => void run(() => putOnboarding('basics', { display_name: name.trim() })), disabled: busy || name.trim().length < 1 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={() => name.trim() && void run(() => putOnboarding('basics', { display_name: name.trim() }))}
          placeholder={w('o_name_f')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={w('o_name_f')}
          autoCapitalize="words"
          autoFocus
          style={{ minHeight: 64, fontSize: 24, fontWeight: '600', color: colors.ink, paddingHorizontal: space.lg, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 2, borderColor: name ? colors.accent : colors.line, outlineStyle: 'none' } as never}
        />
        {err}
      </Frame>
    );
  }
  if (step === 'age') {
    const opts: [string, string, Icon][] = [['under40', 'o_age_u40', 'person-outline'], ['40to59', 'o_age_4059', 'person-outline'], ['60plus', 'o_age_60', 'person-outline']];
    const pick = (v: string) => { setAge(v); void run(() => putOnboarding('basics', { age_band: v }), () => setTimeout(advance, 160)); };
    return (
      <Frame {...common} title={w('o_age_t')} speak={opts.map((o) => w(o[1])).join('. ')} say>
        {opts.map(([v, k, ic]) => <Card key={v} icon={ic} title={w(k)} on={age === v} onPress={() => pick(v)} />)}
        {err}
      </Frame>
    );
  }
  if (step === 'where') {
    const countries: [string, string][] = [['SG', 'o_sg'], ['IN', 'o_in'], ['other', 'o_other']];
    const save = () => run(() => putOnboarding('basics', { country, ...(area.trim() ? { area_name: area.trim() } : {}) }));
    const towns = TOWNS[country] ?? [];
    return (
      <Frame {...common} title={w('o_where_t')} hint={w('o_where_h')} say primary={{ label: w('o_next'), onPress: () => void save(), disabled: busy }} secondary={{ label: w('o_skip'), onPress: () => void run(() => putOnboarding('basics', { country })) }}>
        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
          {countries.map(([c, k]) => {
            const on = country === c;
            return (
              <Pressable key={c} onPress={() => { setCountry(c); setArea(''); setTyped(c === 'other'); }} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.card, borderWidth: 1.5, borderColor: on ? colors.accent : colors.line }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: on ? colors.card : colors.ink }}>{w(k)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={grid}>
          {towns.map((t) => <Tile key={t} label={t} on={area === t && !typed} onPress={() => { setArea(t); setTyped(false); }} />)}
          {country !== 'other' ? <Tile label={w('o_other')} on={typed} onPress={() => { setTyped(true); setArea(''); }} /> : null}
        </View>
        {typed || country === 'other' ? (
          <TextInput value={area} onChangeText={setArea} placeholder={w('o_town_f')} placeholderTextColor={colors.muted} accessibilityLabel={w('o_town_f')} autoFocus
            style={{ marginTop: space.md, minHeight: 56, fontSize: 19, color: colors.ink, paddingHorizontal: space.lg, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, outlineStyle: 'none' } as never} />
        ) : null}
        {err}
      </Frame>
    );
  }
  if (step === 'roles') {
    const toggle = (r: string) => setRoles((l) => (l.includes(r) ? l.filter((x) => x !== r) : [...l, r]));
    return (
      <Frame {...common} title={w('o_roles_t')} hint={w('o_pick_many')} speak={ROLES.map((r) => w(`o_r_${r}`)).join('. ')} say primary={{ label: w('o_next'), onPress: () => void run(() => putOnboarding('purpose', { roles })), disabled: busy || roles.length === 0 }}>
        {ROLES.map((r) => <Card key={r} icon={ROLE_ICON[r]} title={w(`o_r_${r}`)} on={roles.includes(r)} onPress={() => toggle(r)} />)}
        {err}
      </Frame>
    );
  }
  if (step === 'enjoy') {
    const toggle = (k: string) => setLikes((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
    return (
      <Frame {...common} title={w('o_enjoy_t')} hint={w('o_pick_many')} speak={INTERESTS.map((x) => w(`interest_${x.key}`)).join('. ')} say
        primary={{ label: w('o_next'), onPress: () => void run(() => (likes.length ? putOnboarding('interests', { interests: likes }) : skipOnboarding('interests'))), disabled: busy }}
        secondary={{ label: w('o_skip'), onPress: () => void run(() => skipOnboarding('interests')) }}>
        <View style={grid}>{INTERESTS.map((x) => <Tile key={x.key} icon={x.icon} label={w(`interest_${x.key}`)} on={likes.includes(x.key)} onPress={() => toggle(x.key)} />)}</View>
        {err}
      </Frame>
    );
  }
  if (step === 'agree') {
    const both = privacy && terms;
    return (
      <Frame {...common} title={w('o_agree_t')} hint={w('o_agree_h')} speak={`${w('o_agree_privacy')}. ${w('o_agree_terms')}`}
        primary={{ label: w('o_next'), onPress: () => void run(() => putOnboarding('consent', { privacy: true, terms: true })), disabled: busy || !both }}>
        <Card icon="shield-checkmark-outline" title={w('o_agree_privacy')} on={privacy} onPress={() => setPrivacy((v) => !v)} />
        <Card icon="document-text-outline" title={w('o_agree_terms')} on={terms} onPress={() => setTerms((v) => !v)} />
        {err}
      </Frame>
    );
  }
  return <Welcome name={name.trim() || user?.display_name || ''} finish={finish} more={more} />;
}

// ---------- step: choose your language (big buttons, the app changes the moment one is tapped) ----------
const LANG_LINES = ['Choose your language', 'अपनी भाषा चुनें', 'আপনার ভাষা বেছে নিন', 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்', '请选择语言', 'Pilih bahasa anda'];
type CommonProps = { n: number; total: number; onBack?: () => void; id: string };
function LangStep({ common, onNext }: { common: CommonProps; onNext: () => void }) {
  const w = usePageWords(page);
  const { code } = useStore(languageStore);
  return (
    <Frame {...common} top={<Collage />} title={w('o_lang_t')} speak={LANGUAGES.map((l) => l.native).join('. ')} primary={{ label: w('o_next'), onPress: onNext }}>
      <View style={{ marginTop: -space.sm, marginBottom: space.md }}>
        {LANG_LINES.filter((_, i) => LANGUAGES[i].code !== code).map((t) => <Text key={t} style={[type.small, { color: colors.muted }]}>{t}</Text>)}
      </View>
      <View style={grid}>
        {LANGUAGES.map((l) => <Tile key={l.code} label={l.native} on={code === l.code} onPress={() => void setLanguage(l.code)} />)}
      </View>
    </Frame>
  );
}

// ---------- step: your voice (optional, ten seconds) ----------
function VoiceStep({ common, onDone }: { common: CommonProps; onDone: () => void }) {
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
  const next = async () => {
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
    <Frame {...common} title={w('voice_heading')} hint={w('voice_intro')} primary={{ label: saving ? w('voice_saving') : w('o_next'), onPress: () => void next(), disabled: saving || recording }} secondary={{ label: w('o_skip'), onPress: onDone }}>
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.lg }}>
        <Pressable onPress={() => void (recording ? stop() : start())} accessibilityRole="button" accessibilityLabel={recording ? w('voice_stop') : w('voice_record')}
          style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: recording ? colors.danger : colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={recording ? 'stop' : 'mic'} size={48} color={colors.card} accessible={false} />
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink }}>{recording ? String(10 - seconds) : uri ? w('voice_recorded') : w('voice_prompt')}</Text>
        {uri && !recording ? (
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <Pressable onPress={() => { player.seekTo(0); player.play(); }} accessibilityRole="button" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="play" size={22} color={colors.accent} accessible={false} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.accent }}>{w('voice_play')}</Text>
            </Pressable>
            <Pressable onPress={() => { setUri(null); setMessage(null); }} accessibilityRole="button" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="refresh" size={22} color={colors.muted} accessible={false} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.muted }}>{w('voice_again')}</Text>
            </Pressable>
          </View>
        ) : null}
        {message ? <Text style={{ color: colors.danger, fontSize: 16, textAlign: 'center' }}>{message}</Text> : null}
      </View>
    </Frame>
  );
}

function Welcome({ name, finish, more }: { name: string; finish: () => Promise<void>; more: () => void }) {
  const w = usePageWords(page);
  const pop = useRef(new Animated.Value(0)).current;
  const [busy, setBusy] = useState(false);
  useEffect(() => { Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 14 }).start(); }, [pop]);
  return (
    <Frame id="welcome" bare top={<Confetti />} speak={`${w('o_welcome', { name })}. ${w('o_welcome_l')}`}
      primary={{ label: w('o_home'), onPress: () => { setBusy(true); void finish().finally(() => setBusy(false)); }, disabled: busy }} secondary={{ label: w('o_more'), onPress: more }}>
      <View style={{ alignItems: 'center', paddingTop: space.xl * 2 }}>
        <Animated.View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }] }}>
          <Ionicons name="checkmark" size={72} color={colors.card} accessible={false} />
        </Animated.View>
        <Text accessibilityRole="header" style={{ fontSize: 32, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: space.xl }}>{w('o_welcome', { name })}</Text>
        <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginTop: space.sm }]}>{w('o_welcome_l')}</Text>
        <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.md }]}>{w('o_later_note')}</Text>
      </View>
    </Frame>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getOnboarding, putOnboarding, skipOnboarding, type OnboardingState, type Question, type Section } from '../../../api/wisdom';
import { ChipRow } from '../../../components/blocks';
import { Button, Card, Body, ErrorText, Field, Screen } from '../../../components/ui';
import { usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, radius, space } from '../../../theme/tokens';
import { firstTab, loadProfile, profileStore } from '../state';
import { onboardingIndex as page } from '../pages';

const nice = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
// Plain words for the choices the server sends as codes.
const WORDS: Record<string, Record<string, string>> = {
  language: { en: 'English', hi: 'हिन्दी', bn: 'বাংলা', ta: 'தமிழ்', zh: '中文', ms: 'Bahasa Melayu' },
  age_band: { under40: 'Under 40', '40to59': '40 to 59', '60plus': '60 and over' },
  country: { SG: 'Singapore', IN: 'India', other: 'Somewhere else' },
  roles: { connect: 'Stay connected and active', share: 'Share what I know', learn: 'Learn from experienced people', help: 'Help older people', care: 'Look after someone I love' },
  preferred_channel: { call: 'Phone call', whatsapp: 'WhatsApp', telegram: 'Telegram', sms: 'Text message', app: 'The app' },
  voice_or_text: { voice: 'Talking', text: 'Writing' },
  living: { alone: 'On my own', with_family: 'With family', care_home: 'In a care home' },
  gender: { man: 'Man', woman: 'Woman', other: 'Other', prefer_not_to_say: 'Prefer not to say' },
  hearing: { fine: 'Fine', some_trouble: 'Some trouble', hard: 'Hard' }, eyesight: { fine: 'Fine', some_trouble: 'Some trouble', hard: 'Hard' }, walking: { fine: 'Fine', some_trouble: 'Some trouble', hard: 'Hard' },
  share_modes: { voice_capsules: 'Spoken stories', live_sessions: 'Live sessions', freelance: 'Freelance work' },
  pay: { volunteer: 'Free', paid: 'Paid', either: 'Either' },
  offers: { companionship: 'Company', errands: 'Errands', digital_help: 'Help with phones and computers' },
};
const FEELING: Record<string, string> = { hardly_ever: 'Hardly ever', some_of_the_time: 'Some of the time', often: 'Often' };
const word = (key: string, option: string) => WORDS[key]?.[option] ?? FEELING[option] ?? nice(option);
type Values = Record<string, unknown>;

/** One question, drawn from what the server says it is. */
function Ask({ q, value, onChange, yes, no }: { q: Question; value: unknown; onChange: (v: unknown) => void; yes: string; no: string }) {
  if (q.kind === 'choice') return (
    <View style={{ marginBottom: space.md }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: space.sm }}>{q.label}</Text>
      <ChipRow options={q.options.map((o) => ({ value: o, label: word(q.key, o) }))} value={String(value ?? '')} onChange={onChange} />
    </View>
  );
  if (q.kind === 'bool') return (
    <View style={{ marginBottom: space.md }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: space.sm }}>{q.label}</Text>
      <ChipRow options={[{ value: 'yes', label: yes }, { value: 'no', label: no }]} value={value === true ? 'yes' : value === false ? 'no' : ''} onChange={(v) => onChange(v === 'yes')} />
    </View>
  );
  if (q.kind === 'multi' && q.options.length) {
    const chosen = Array.isArray(value) ? (value as string[]) : [];
    return (
      <View style={{ marginBottom: space.md }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: space.sm }}>{q.label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {q.options.map((o) => {
            const on = chosen.includes(o);
            return (
              <Pressable key={o} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => onChange(on ? chosen.filter((x) => x !== o) : [...chosen, o])}
                style={{ paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? colors.navy : colors.line, backgroundColor: on ? colors.navy : colors.card }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: on ? '#FFFFFF' : colors.ink }}>{word(q.key, o)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  const text = Array.isArray(value) ? (value as string[]).join(', ') : value == null ? '' : String(value);
  return (
    <Field label={q.label} value={text} onChangeText={onChange} keyboardType={q.kind === 'int' ? 'numeric' : q.kind === 'phone' ? 'phone-pad' : 'default'}
      placeholder={q.kind === 'multi' ? 'for example: music, cooking' : q.kind === 'time' ? '07:30' : undefined} autoCapitalize={q.key === 'display_name' ? 'words' : 'sentences'} />
  );
}

export default function OnboardingScreen() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [values, setValues] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((st: OnboardingState) => {
    setState(st);
    const next = st.next;
    setValues(next ? Object.fromEntries(next.questions.filter((q) => q.answer !== null && q.answer !== undefined).map((q) => [q.key, q.answer])) : {});
    setError(null);
  }, []);

  useEffect(() => {
    getOnboarding().then(open).catch(() => setError(w('failed')));
  }, [open, w]);

  const finish = useCallback(async () => {
    await loadProfile();
    go(firstTab(profileStore.get().profile), {}, { replace: true });
  }, [go]);

  const section: Section | null = state?.next ?? null;
  const steps = state ? state.sections.length : 0;
  const index = state && section ? state.sections.findIndex((s) => s.id === section.id) + 1 : 0;

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
      if (!next.next) await finish();
    } catch {
      setError(w('failed'));
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (!section) return;
    setBusy(true);
    try {
      const next = await skipOnboarding(section.id);
      open(next);
      if (!next.next) await finish();
    } catch {
      setError(w('failed'));
    } finally {
      setBusy(false);
    }
  };

  if (!state) return <Screen title={w('heading')} subtitle={w('loading')}><ErrorText>{error}</ErrorText></Screen>;
  if (!section) return <Screen title={w('heading')} subtitle={w('allDone')}><Button label={w('later')} onPress={finish} /></Screen>;

  return (
    <Screen title={section.title} subtitle={index === 1 && section.required ? w('intro') : w('step', { n: index, total: steps })}>
      <Card>
        <Body muted>{section.required ? w('needed') : w('optional')}</Body>
        <View style={{ height: space.md }} />
        {section.questions.map((q) => (
          <Ask key={q.key} q={q} value={values[q.key]} onChange={(v) => setValues((s) => ({ ...s, [q.key]: v }))} yes={w('yes')} no={w('no')} />
        ))}
        <ErrorText>{error}</ErrorText>
        <Button label={w('save')} onPress={save} disabled={busy} />
        {!section.required ? (
          <>
            <View style={{ height: space.sm }} />
            <Button kind="plain" label={w('skip')} onPress={skip} disabled={busy} />
            <View style={{ height: space.sm }} />
            <Button kind="plain" label={w('later')} onPress={finish} disabled={busy} />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

// The body of each onboarding step, written once and used twice: inside onboarding (the screen around it says Next and moves on) and on the
// profile's edit screens (the screen around it says Save, saves, shows "Saved" and goes back). A body only shows the choice and reports it;
// the screen around it decides what the button says and what saving does. `w` is the page's word lookup (both pages carry the same word tables).
import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { uploadVoiceIntro } from '../../api/media';
import { LANGUAGES, type LangCode } from '../../i18n/languages';
import type { TextSize } from '../../prefs/store';
import { colors, radius, space, type } from '../../theme/tokens';
import { Bar, Chip, Interest, ListCard, RadioCard, grid, type Icon } from './kit';

type W = (key: string, vars?: Record<string, string | number>) => string;

export const TOWNS = ['Bishan', 'Toa Payoh', 'Ang Mo Kio', 'Tampines', 'Jurong West', 'Woodlands'];
export const INTERESTS: { key: string; icon: Icon }[] = [
  { key: 'walking', icon: 'walk-outline' }, { key: 'taichi', icon: 'body-outline' }, { key: 'cooking', icon: 'restaurant-outline' }, { key: 'chess', icon: 'extension-puzzle-outline' },
  { key: 'music', icon: 'musical-notes-outline' }, { key: 'gardening', icon: 'leaf-outline' }, { key: 'teaching', icon: 'school-outline' }, { key: 'tech', icon: 'laptop-outline' },
];
/** Small, Normal, Large as the person sees them, and the app's own size names behind them. */
export const SIZES: { v: TextSize; t: string; l: string }[] = [{ v: 'normal', t: 'o_size_small', l: 'o_size_small_l' }, { v: 'large', t: 'o_size_normal', l: 'o_size_normal_l' }, { v: 'larger', t: 'o_size_large', l: 'o_size_large_l' }];
/** The reminder ways. WhatsApp cannot be chosen yet (no WhatsApp reminders): it shows "Coming soon". */
export const REMINDERS: { v: 'app' | 'whatsapp' | 'call'; icon: Icon; t: string; l: string; soon?: boolean }[] = [
  { v: 'app', icon: 'notifications-outline', t: 'o_rem_app', l: 'o_rem_app_l' },
  { v: 'whatsapp', icon: 'logo-whatsapp', t: 'o_rem_wa', l: 'o_rem_wa_l', soon: true },
  { v: 'call', icon: 'call-outline', t: 'o_rem_call', l: 'o_rem_call_l' },
];

const field = { minHeight: 60, fontSize: 22, fontWeight: '600', color: colors.ink, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, outlineStyle: 'none' } as const;

/** The language: one pill per language, two per row. The app changes the moment one is tapped. */
export function LanguageBody({ code, onPick }: { code: LangCode; onPick: (c: LangCode) => void }) {
  return <View style={grid}>{LANGUAGES.map((l) => <Chip key={l.code} label={l.native} on={code === l.code} onPress={() => onPick(l.code)} />)}</View>;
}

/** The text size: Small, Normal, Large, each a card with a round tick. */
export function TextSizeBody({ w, value, onPick }: { w: W; value: TextSize; onPick: (v: TextSize) => void }) {
  return <>{SIZES.map((s) => <RadioCard key={s.v} title={w(s.t)} line={w(s.l)} on={value === s.v} onPress={() => onPick(s.v)} />)}</>;
}

/** The name: "Your name" and one big round field. */
export function NameBody({ w, value, onChange, onSubmit }: { w: W; value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: space.sm }}>{w('o_name_f')}</Text>
      <TextInput value={value} onChangeText={onChange} onSubmitEditing={onSubmit} accessibilityLabel={w('o_name_f')} autoCapitalize="words" maxLength={80} style={field as never} />
    </>
  );
}

/** Where you live: six towns, two per row, and "Somewhere else", which opens a field. */
export function WhereBody({ w, area, typed, onPick, onType }: { w: W; area: string; typed: boolean; onPick: (town: string) => void; onType: (text: string, open?: boolean) => void }) {
  return (
    <>
      <View style={grid}>
        {TOWNS.map((t) => <Chip key={t} label={t} on={area === t && !typed} onPress={() => onPick(t)} />)}
        <Chip full label={w('o_other')} on={typed} onPress={() => onType('', true)} />
      </View>
      {typed ? (
        <TextInput value={area} onChangeText={(v) => onType(v)} placeholder={w('o_town_f')} placeholderTextColor={colors.muted} accessibilityLabel={w('o_town_f')} autoFocus maxLength={120}
          style={[field, { marginTop: space.md, fontSize: 19, fontWeight: '400' }] as never} />
      ) : null}
    </>
  );
}

/** What you enjoy: eight tiles with an icon, as many as the person likes. */
export function EnjoyBody({ w, likes, onToggle }: { w: W; likes: string[]; onToggle: (key: string) => void }) {
  return <View style={grid}>{INTERESTS.map((x) => <Interest key={x.key} icon={x.icon} label={w(`interest_${x.key}`)} on={likes.includes(x.key)} onPress={() => onToggle(x.key)} />)}</View>;
}

/** How to remind you: three cards; the chosen one (on the profile) shows a tick. */
export function RemindBody({ w, value, onPick }: { w: W; value?: string | null; onPick: (v: 'app' | 'call') => void }) {
  return (
    <>
      {REMINDERS.map((r) => r.soon
        ? <ListCard key={r.v} icon={r.icon} title={w(r.t)} line={w(r.l)} note={w('o_soon')} disabled onPress={() => undefined} />
        : <ListCard key={r.v} icon={r.icon} title={w(r.t)} line={w(r.l)} note={value === r.v ? `✓ ${w('o_chosen')}` : undefined} onPress={() => onPick(r.v as 'app' | 'call')} />)}
    </>
  );
}

/** Recording the ten-second "about me" clip: start, stop (by itself at ten), play, and save to the account. */
export function useVoice(w: W) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [uri, setUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const player = useAudioPlayer(uri);
  const stop = async () => {
    try { await recorder.stop(); } catch { /* already stopped */ }
    setUri(recorder.uri ?? null);
    setRecording(false);
  };
  const start = async () => {
    setMessage(null);
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) { setMessage(w('voice_permission')); return; }
      await AudioModule.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 10 });
      setUri(null);
      setSeconds(0);
      setRecording(true);
    } catch { setMessage(w('voice_permission')); }
  };
  // While recording: count the seconds, and stop by itself at ten.
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((x) => x + 1), 1000);
    const end = setTimeout(() => void stop(), 10000);
    return () => { clearInterval(t); clearTimeout(end); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);
  /** Uploads the clip and puts it on the account. True when it was saved. */
  const save = async (): Promise<boolean> => {
    if (!uri || saving) return false;
    setSaving(true);
    try {
      const res = await uploadVoiceIntro(uri);
      await api('PATCH', '/v1/me', { voice_intro_url: res.url } as never);
      return true;
    } catch { setMessage(w('voice_not_saved')); return false; } finally { setSaving(false); }
  };
  const toggle = () => void (recording ? stop() : start());
  const play = () => { player.seekTo(0); player.play(); };
  return { uri, recording, seconds, saving, message, toggle, play, save };
}

/** The voice step's body: the card, Record (or Stop with the seconds left), Play once there is a clip, and the note. */
export function VoiceBody({ w, v }: { w: W; v: ReturnType<typeof useVoice> }) {
  return (
    <>
      <View style={{ padding: space.lg, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{w('o_voice_card')}</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: space.sm }]}>{w('o_voice_ex')}</Text>
      </View>
      <View style={{ height: space.md }} />
      <Bar icon={v.recording ? 'stop' : 'mic-outline'} label={v.recording ? `${w('voice_stop')}  ${10 - v.seconds}` : v.uri ? w('voice_again') : w('voice_record')} onPress={v.toggle} />
      {v.uri && !v.recording ? (
        <Pressable onPress={v.play} accessibilityRole="button" style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: space.sm }}>
          <Ionicons name="play" size={22} color={colors.accent} accessible={false} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accent }}>{w('voice_play')}</Text>
        </Pressable>
      ) : null}
      <Text style={[type.body, { color: colors.muted, marginTop: space.md }]}>{v.message ?? w('o_voice_note')}</Text>
    </>
  );
}

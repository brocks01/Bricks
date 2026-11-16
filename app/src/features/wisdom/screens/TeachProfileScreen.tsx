// Mentor Profile Editing (revamp v2, A2): the elder's initials in the middle, Expertise, Bio (a large text area), Availability as Days,
// Start time and End time (simple pickers: a choice of days, and Earlier / Later in half hours), and a full-width Save Changes.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { getTeachingProfile, saveTeachingProfile } from '../../../api/wisdom';
import { BackScreen } from '../../../components/BackButton';
import { SkeletonList } from '../../../components/Skeleton';
import { useStore } from '../../../core/store';
import { useT } from '../../../i18n';
import { El, useAction, useField } from '../../../kit';
import { sessionStore } from '../../../session/store';
import { colors, radius, space } from '../../../theme/tokens';
import { wisdomTeachProfile as page } from '../pages';
import { Avatar, BigButton, BLUE, Result } from '../teachUi';

/** The day choices, stored as these English words (the profile card shows them in the person's language). */
export const DAYS = [['Mon-Fri', 'd_weekdays'], ['Mon-Sat', 'd_mon_sat'], ['Weekends', 'd_weekends'], ['Every day', 'd_every']] as const;
export const dayKey = (v: string | null) => DAYS.find(([d]) => d === v)?.[1];

const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const toHHMM = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const okTime = (s: unknown) => typeof s === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.trim());

function Label({ text }: { text: string }) {
  return <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink, marginTop: space.lg, marginBottom: space.sm }}>{text}</Text>;
}

const input = { minHeight: 60, borderWidth: 2, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: space.md, fontSize: 19, color: colors.ink, backgroundColor: colors.card } as const;

function TimePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const t = useT();
  const step = (d: number) => onChange(toHHMM(Math.min(23 * 60 + 30, Math.max(0, toMin(value) + d))));
  const btn = (d: number, icon: 'remove' | 'add', word: string) => (
    <Pressable onPress={() => step(d)} accessibilityRole="button" accessibilityLabel={`${label}: ${word}`}
      style={({ pressed }) => ({ width: 64, minHeight: 60, alignItems: 'center', justifyContent: 'center', borderRadius: radius.button, borderWidth: 2, borderColor: BLUE, opacity: pressed ? 0.8 : 1 })}>
      <Ionicons name={icon} size={28} color={BLUE} accessible={false} />
    </Pressable>
  );
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.muted, marginBottom: space.xs }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        {btn(-30, 'remove', t('wt.earlier'))}
        <Text accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '800', color: colors.ink }}>{value}</Text>
        {btn(30, 'add', t('wt.later'))}
      </View>
    </View>
  );
}

export default function TeachProfileScreen() {
  const t = useT();
  const { user } = useStore(sessionStore);
  const [ready, setReady] = useState(false);
  const [expertise, setExpertise] = useState('');
  const [bio, setBio] = useState('');
  const [days, setDays] = useState('Mon-Fri');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    getTeachingProfile().then((p) => {
      if (!live) return;
      setExpertise(p.expertise ?? ''); setBio(p.bio ?? '');
      if (p.days) setDays(p.days);
      if (p.start_time) setStart(p.start_time);
      if (p.end_time) setEnd(p.end_time);
      setReady(true);
    }).catch(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  const save = async () => {
    setNote(null);
    if (toMin(end) <= toMin(start)) { setNote({ ok: false, text: t('wt.bad_time') }); return; }
    setBusy(true);
    try {
      await saveTeachingProfile({ expertise: expertise.trim(), bio: bio.trim(), days, start_time: start, end_time: end });
      setNote({ ok: true, text: t('wt.saved') });
    } catch {
      setNote({ ok: false, text: t('wt.save_failed') });
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'expertise', expertise, (v) => setExpertise(String(v ?? '').slice(0, 120)));
  useField(page, 'bio', bio, (v) => setBio(String(v ?? '').slice(0, 1000)));
  useField(page, 'days', days, (v) => { if (DAYS.some(([d]) => d === v)) setDays(String(v)); });
  useField(page, 'startTime', start, (v) => { if (okTime(v)) setStart(toHHMM(toMin(String(v).trim()))); });
  useField(page, 'endTime', end, (v) => { if (okTime(v)) setEnd(toHHMM(toMin(String(v).trim()))); });
  useAction(page, 'save', save);

  return (
    <BackScreen title={t('wt.edit_title')}>
      {!ready ? <SkeletonList count={2} /> : (
        <View style={{ paddingBottom: space.xl }}>
          <View style={{ alignItems: 'center', marginTop: space.sm }}>
            <Avatar name={user?.display_name ?? ''} size={104} />
            {user?.display_name ? <Text style={{ fontSize: 21, fontWeight: '800', color: colors.ink, marginTop: space.sm }}>{user.display_name}</Text> : null}
          </View>

          <Label text={t('wt.expertise')} />
          <El page={page} id="expertise">
            <TextInput value={expertise} onChangeText={setExpertise} maxLength={120} placeholder={t('wt.expertise_hint')} placeholderTextColor={colors.muted} accessibilityLabel={t('wt.expertise')} style={input} />
          </El>

          <Label text={t('wt.bio')} />
          <El page={page} id="bio">
            <TextInput value={bio} onChangeText={setBio} maxLength={1000} multiline placeholder={t('wt.bio_hint')} placeholderTextColor={colors.muted} accessibilityLabel={t('wt.bio')}
              style={[input, { minHeight: 160, paddingVertical: space.md, lineHeight: 27, textAlignVertical: 'top' }]} />
          </El>

          <Label text={t('wt.availability')} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.muted, marginBottom: space.xs }}>{t('wt.days')}</Text>
          <El page={page} id="days">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {DAYS.map(([d, k]) => {
                const on = days === d;
                return (
                  <Pressable key={d} onPress={() => setDays(d)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    style={{ minHeight: 52, justifyContent: 'center', paddingHorizontal: 20, borderRadius: radius.pill, borderWidth: 2, borderColor: on ? BLUE : colors.line, backgroundColor: on ? BLUE : colors.card }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: on ? colors.card : colors.ink }}>{t(`wt.${k}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </El>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md }}>
            <View style={{ minWidth: 220, flex: 1 }}><El page={page} id="startTime"><TimePicker label={t('wt.start_time')} value={start} onChange={setStart} /></El></View>
            <View style={{ minWidth: 220, flex: 1 }}><El page={page} id="endTime"><TimePicker label={t('wt.end_time')} value={end} onChange={setEnd} /></El></View>
          </View>

          {note ? <Result ok={note.ok} text={note.text} /> : null}
          <View style={{ marginTop: space.lg }}>
            <El page={page} id="save"><BigButton icon="checkmark" label={t('wt.save_changes')} busy={busy} onPress={() => void save()} /></El>
          </View>
        </View>
      )}
    </BackScreen>
  );
}

// One profile edit screen (revamp v2, A3): the same body as the onboarding step, with Save instead of Next. Save saves, shows "Saved" and goes back.
// Language and text size apply the moment they are tapped (as in onboarding); Save then also keeps the language on the account.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { getOnboarding, putOnboarding } from '../../../../api/wisdom';
import { BackScreen } from '../../../../components/BackButton';
import { useStore } from '../../../../core/store';
import { isLangCode, type LangCode } from '../../../../i18n/languages';
import { languageStore, setLanguage } from '../../../../i18n/store';
import { useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { prefs, setPref, type TextSize } from '../../../../prefs/store';
import { reloadUser, sessionStore, updateProfile, type AgeBand } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { EnjoyBody, INTERESTS, LanguageBody, NameBody, RemindBody, TextSizeBody, TOWNS, VoiceBody, WhereBody, useVoice } from '../../../onboarding/bodies';
import { Bar, Chip, grid } from '../../../onboarding/kit';
import { FIELDS, meField as page, type FieldId } from './page';

const TITLE: Record<FieldId, string> = { language: 'o_lang_t', textSize: 'o_size_t', name: 'o_name_t', area: 'o_where_t', enjoy: 'o_enjoy_t', voice: 'o_voice_t', reminders: 'o_rem_t', age: 'age', phone: 'phone' };
const HINT: Partial<Record<FieldId, string>> = { textSize: 'o_size_h', enjoy: 'o_pick_many' };
const SIZE_WORD: Record<string, TextSize> = { small: 'normal', normal: 'large', large: 'larger' };
const AGES: AgeBand[] = ['under40', '40to59', '60plus'];

export default function FieldScreen() {
  const { field: raw } = useLocalSearchParams<{ field: string }>();
  const field: FieldId = (FIELDS as readonly string[]).includes(raw ?? '') ? (raw as FieldId) : 'name';
  const w = usePageWords(page);
  const go = useNavigate();
  const { user, status } = useStore(sessionStore);
  const { textSize } = useStore(prefs);
  const { code } = useStore(languageStore);
  const v = useVoice(w);

  const [name, setName] = useState(user?.display_name ?? '');
  const [area, setArea] = useState(user?.area_name ?? '');
  const [typed, setTyped] = useState(!!user?.area_name && !TOWNS.includes(user.area_name));
  const [likes, setLikes] = useState<string[]>(user?.interests ?? []);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [age, setAge] = useState<AgeBand | null>(user?.age_band ?? null);
  const [remind, setRemind] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const leave = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (leave.current) clearTimeout(leave.current); }, []);

  // The reminder way lives in the onboarding answers, not on the account.
  useEffect(() => {
    if (field !== 'reminders' || status !== 'in') return;
    let live = true;
    getOnboarding().then((st) => {
      const a = st.sections.find((s) => s.id === 'channels')?.questions.find((q) => q.key === 'preferred_channel')?.answer;
      if (live && typeof a === 'string') setRemind(a);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [field, status]);

  const back = () => { if (router.canGoBack()) router.back(); else go('me.index', {}, { replace: true }); };
  const done = () => { setNote({ ok: true, text: w('saved') }); leave.current = setTimeout(back, 900); };

  const save = async (over?: { remind?: string }) => {
    if (busy) return;
    setNote(null); setBusy(true);
    try {
      if (field === 'language') await updateProfile({ language: code });
      else if (field === 'textSize') { /* applied when tapped; it belongs to this phone */ }
      else if (field === 'name') { if (!name.trim()) throw new Error('empty'); await putOnboarding('basics', { display_name: name.trim() }); }
      else if (field === 'area') { if (area.trim()) await putOnboarding('basics', { area_name: area.trim() }); else await updateProfile({ area_name: null }); }
      else if (field === 'enjoy') await putOnboarding('interests', { interests: likes });
      else if (field === 'voice') { if (!(await v.save())) throw new Error('voice'); }
      else if (field === 'reminders') await putOnboarding('channels', { preferred_channel: over?.remind ?? remind });
      else if (field === 'age') await updateProfile({ age_band: age });
      else if (field === 'phone') await updateProfile({ phone: phone.trim() || null });
      await reloadUser();
      done();
    } catch {
      setNote({ ok: false, text: w('failed') });
    } finally {
      setBusy(false);
    }
  };

  // What the agent can fill: one answer, in the form the summary of this page explains.
  const current = field === 'language' ? code : field === 'textSize' ? Object.keys(SIZE_WORD).find((k) => SIZE_WORD[k] === textSize) ?? '' : field === 'name' ? name : field === 'area' ? area
    : field === 'enjoy' ? likes.join(',') : field === 'reminders' ? remind ?? '' : field === 'age' ? age ?? '' : field === 'phone' ? phone : v.uri ? 'recorded' : '';
  useField(page, 'answer', current, (x) => {
    const s = String(x ?? '').trim();
    if (field === 'language' && isLangCode(s)) void setLanguage(s as LangCode);
    else if (field === 'textSize' && SIZE_WORD[s.toLowerCase()]) setPref({ textSize: SIZE_WORD[s.toLowerCase()] });
    else if (field === 'name') setName(s.slice(0, 80));
    else if (field === 'area') { setArea(s.slice(0, 120)); setTyped(!TOWNS.includes(s)); }
    else if (field === 'enjoy') setLikes(s.split(',').map((k) => k.trim().toLowerCase()).filter((k) => INTERESTS.some((i) => i.key === k)));
    else if (field === 'reminders' && (s === 'app' || s === 'call')) setRemind(s);
    else if (field === 'age' && (AGES as string[]).includes(s)) setAge(s as AgeBand);
    else if (field === 'phone') setPhone(s.slice(0, 30));
  });
  useAction(page, 'record', v.toggle);
  useAction(page, 'save', () => save());

  const input = { minHeight: 60, fontSize: 22, fontWeight: '600', color: colors.ink, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, outlineStyle: 'none' } as never;
  const title = w(TITLE[field]);
  const hint = HINT[field];
  const noSave = field === 'voice' && (!v.uri || v.recording);

  return (
    <BackScreen title={title}>
      {hint ? <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w(hint)}</Text> : null}
      {field === 'language' ? <LanguageBody code={code} onPick={(c) => void setLanguage(c)} /> : null}
      {field === 'textSize' ? <TextSizeBody w={w} value={textSize} onPick={(s) => setPref({ textSize: s })} /> : null}
      {field === 'name' ? <NameBody w={w} value={name} onChange={setName} onSubmit={() => void save()} /> : null}
      {field === 'area' ? <WhereBody w={w} area={area} typed={typed} onPick={(t) => { setArea(t); setTyped(false); }} onType={(x, open) => { setArea(x); if (open) setTyped(true); }} /> : null}
      {field === 'enjoy' ? <EnjoyBody w={w} likes={likes} onToggle={(k) => setLikes((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]))} /> : null}
      {field === 'voice' ? <VoiceBody w={w} v={v} /> : null}
      {field === 'reminders' ? <RemindBody w={w} value={remind} onPick={(c) => { setRemind(c); void save({ remind: c }); }} /> : null}
      {field === 'age' ? <View style={grid}>{AGES.map((a) => <Chip key={a} label={w(`age_${a}`)} on={age === a} onPress={() => setAge(a)} />)}</View> : null}
      {field === 'phone' ? (
        <>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: space.sm }}>{w('phone_f')}</Text>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={30} accessibilityLabel={w('phone_f')} style={input} />
        </>
      ) : null}

      {note ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 19, fontWeight: '800', color: note.ok ? '#1D6B3F' : colors.danger, marginTop: space.md }}>{note.ok ? `✓ ${note.text}` : note.text}</Text> : null}
      {field === 'reminders' ? null : (
        <View style={{ marginTop: space.lg, marginBottom: space.xl }}>
          <Bar label={busy || v.saving ? '…' : w('save')} icon="checkmark" onPress={() => void save()} disabled={busy || v.saving || noSave || (field === 'name' && !name.trim())} />
        </View>
      )}
    </BackScreen>
  );
}

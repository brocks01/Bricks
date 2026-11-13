import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, ChoiceChips, ErrorText, Field } from '../../components/ui';
import { useStore } from '../../core/store';
import { useT } from '../../i18n';
import { El, useAction, useField, usePageWords } from '../../kit';
import type { PageDef } from '../../navigation/types';
import { useNavigate } from '../../navigation';
import { errorWords } from '../../session/errors';
import { SPOKEN_LANGUAGES, cleanSpoken, saveSpoken, spokenStore } from '../../i18n/spoken';
import { colors, radius, space, type } from '../../theme/tokens';
import { sessionStore, updateProfile, type AgeBand } from '../../session/store';

const BANDS: AgeBand[] = ['under40', '40to59', '60plus'];

/**
 * The profile form used by the first-time setup page and by Edit profile. The page that shows it declares the elements
 * displayName, ageBand, phone, area and save (so the agent can fill them by key) and supplies the words for them.
 */
export function ProfileForm({ page, destination }: { page: Pick<PageDef, 'key' | 'elements'>; destination: string }) {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const { user: own, actingUser } = useStore(sessionStore);
  const user = actingUser ?? own; // while helping a family member, their profile is the one being edited
  const editingSelf = !actingUser; // only my own profile may change what THIS phone says I speak
  const [name, setName] = useState(user?.display_name ?? '');
  const [band, setBand] = useState<string | null>(user?.age_band ?? null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [area, setArea] = useState(user?.area_name ?? '');
  const [spoken, setSpoken] = useState<string[]>(cleanSpoken(user?.spoken_languages?.length ? user.spoken_languages : editingSelf ? spokenStore.get().spoken : undefined));
  const [comm, setComm] = useState<string | null>(user?.comm_language ?? (editingSelf ? spokenStore.get().comm : null));
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError(null);
    setNameError(null);
    if (!name.trim()) return setNameError(t('common.error.required'));
    setBusy(true);
    try {
      const main = comm && spoken.includes(comm) ? comm : spoken[0] ?? null;
      if (editingSelf) void saveSpoken(spoken, main); // my phone and my account stay in step
      await updateProfile({ display_name: name.trim(), age_band: (band as AgeBand | null) ?? null, phone: phone.trim() || null, area_name: area.trim() || null, spoken_languages: spoken, comm_language: main });
      go(destination, {}, { replace: true });
    } catch (e) {
      const m = errorWords(e);
      setError(t(m.key, m.vars));
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'displayName', name, (v) => setName(String(v)));
  useField(page, 'ageBand', band, (v) => setBand(BANDS.includes(v as AgeBand) ? String(v) : null));
  useField(page, 'phone', phone, (v) => setPhone(String(v)));
  useField(page, 'area', area, (v) => setArea(String(v)));
  useField(page, 'spoken', spoken.join(','), (v) => setSpoken(cleanSpoken(v)));
  useField(page, 'commLanguage', comm ?? '', (v) => setComm(cleanSpoken(v)[0] ?? null));
  useAction(page, 'save', save);
  const toggle = (c: string) => setSpoken((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));

  return (
    <>
      <El page={page} id="displayName"><Field label={w('displayName')} value={name} onChangeText={setName} icon="person-outline" autoCapitalize="words" maxLength={80} error={nameError} /></El>
      <El page={page} id="ageBand"><ChoiceChips label={w('ageBand')} value={band} onChange={setBand} options={BANDS.map((b) => ({ value: b, label: t(`common.ageBand.${b}`) }))} /></El>
      <El page={page} id="phone"><Field label={w('phone')} value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" maxLength={20} /></El>
      <El page={page} id="area"><Field label={w('area')} value={area} onChangeText={setArea} icon="location-outline" maxLength={120} /></El>
      <El page={page} id="spoken">
        <View style={{ marginBottom: space.md }}>
          <Text style={[type.small, { color: colors.ink, fontWeight: '700', marginBottom: space.xs }]}>{w('spoken')}</Text>
          <Text style={[type.small, { color: colors.muted, marginBottom: space.sm }]}>{w('spokenHint')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {SPOKEN_LANGUAGES.map((l) => {
              const on = spoken.includes(l.code);
              return (
                <Pressable key={l.code} onPress={() => toggle(l.code)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#FFFFFF' : colors.ink }}>{l.native}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </El>
      {spoken.length > 1 ? (
        <El page={page} id="commLanguage">
          <ChoiceChips label={w('commLanguage')} value={comm && spoken.includes(comm) ? comm : spoken[0]} onChange={setComm} options={spoken.map((c) => ({ value: c, label: SPOKEN_LANGUAGES.find((l) => l.code === c)?.native ?? c }))} />
        </El>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <El page={page} id="save"><Button label={w('save')} onPress={() => void save()} disabled={busy} /></El>
    </>
  );
}

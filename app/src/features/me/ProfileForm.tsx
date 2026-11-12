import { useState } from 'react';
import { Button, ChoiceChips, ErrorText, Field } from '../../components/ui';
import { useStore } from '../../core/store';
import { useT } from '../../i18n';
import { El, useAction, useField, usePageWords } from '../../kit';
import type { PageDef } from '../../navigation/types';
import { useNavigate } from '../../navigation';
import { errorWords } from '../../session/errors';
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
  const [name, setName] = useState(user?.display_name ?? '');
  const [band, setBand] = useState<string | null>(user?.age_band ?? null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [area, setArea] = useState(user?.area_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError(null);
    setNameError(null);
    if (!name.trim()) return setNameError(t('common.error.required'));
    setBusy(true);
    try {
      await updateProfile({ display_name: name.trim(), age_band: (band as AgeBand | null) ?? null, phone: phone.trim() || null, area_name: area.trim() || null });
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
  useAction(page, 'save', save);

  return (
    <>
      <El page={page} id="displayName"><Field label={w('displayName')} value={name} onChangeText={setName} icon="person-outline" autoCapitalize="words" maxLength={80} error={nameError} /></El>
      <El page={page} id="ageBand"><ChoiceChips label={w('ageBand')} value={band} onChange={setBand} options={BANDS.map((b) => ({ value: b, label: t(`common.ageBand.${b}`) }))} /></El>
      <El page={page} id="phone"><Field label={w('phone')} value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" maxLength={20} /></El>
      <El page={page} id="area"><Field label={w('area')} value={area} onChangeText={setArea} icon="location-outline" maxLength={120} /></El>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="save"><Button label={w('save')} onPress={() => void save()} disabled={busy} /></El>
    </>
  );
}

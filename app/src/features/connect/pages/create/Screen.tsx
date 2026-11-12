import { useState } from 'react';
import { createCommunity, type CommunityKind } from '../../../../api/communities';
import { Button, ChoiceChips, ErrorText, Field, Screen } from '../../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { connectCreate as page } from '../../pages';

const KINDS: CommunityKind[] = ['apartment', 'block', 'neighbourhood', 'club', 'other'];

// Create a community: a name and a kind are enough. The person becomes its Community Lead and finds the invite code on the Invite screen.
export default function CreateCommunity() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CommunityKind>('apartment');
  const [area, setArea] = useState('');
  const [about, setAbout] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (busy) return;
    if (name.trim().length < 2) {
      setError(w('needName'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r = await createCommunity({ name: name.trim(), kind, ...(area.trim() ? { area_name: area.trim() } : {}), ...(about.trim() ? { description: about.trim() } : {}) });
      go('community.home', { id: r.id }, { replace: true });
    } catch {
      setError(w('failed'));
    } finally {
      setBusy(false);
    }
  };
  useField(page, 'name', name, (v) => setName(String(v)));
  useField(page, 'kind', kind, (v) => setKind(KINDS.includes(v as CommunityKind) ? (v as CommunityKind) : 'other'));
  useField(page, 'area', area, (v) => setArea(String(v)));
  useField(page, 'about', about, (v) => setAbout(String(v)));
  useAction(page, 'createButton', create);

  return (
    <Screen title={w('createTitle')} subtitle={w('createIntro')} back>
      <El page={page} id="name"><Field label={w('name')} value={name} onChangeText={setName} maxLength={80} autoCapitalize="words" /></El>
      <El page={page} id="kind"><ChoiceChips label={w('kind')} options={KINDS.map((k) => ({ value: k, label: w(k) }))} value={kind} onChange={(v) => setKind(v as CommunityKind)} /></El>
      <El page={page} id="area"><Field label={w('area')} value={area} onChangeText={setArea} maxLength={120} autoCapitalize="words" /></El>
      <El page={page} id="about"><Field label={w('about')} value={about} onChangeText={setAbout} maxLength={500} autoCapitalize="sentences" /></El>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="createButton"><Button label={w('createButton')} onPress={() => void create()} disabled={busy} icon="checkmark" /></El>
    </Screen>
  );
}

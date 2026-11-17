import { useEffect, useState } from 'react';
import { useLiveEpoch } from '../../../core/useFocusLive';
import { getCard, putCard } from '../../../api/health';
import { Notice } from '../../../components/blocks';
import { Button, ChoiceChips, ErrorText, Field } from '../../../components/ui';
import { BackScreen } from '../../../components/BackButton';
import { useStore } from '../../../core/store';
import { El, useAction, useField, usePageData, usePageWords } from '../../../kit';
import { sessionStore } from '../../../session/store';
import { healthCard as page } from '../pages';

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function CardScreen() {
  const w = usePageWords(page);
  const { status } = useStore(sessionStore);
  const [blood, setBlood] = useState('');
  const [conditions, setConditions] = useState('');
  const [medicines, setMedicines] = useState('');
  const [allergies, setAllergies] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (status !== 'in') return;
    getCard()
      .then((c) => {
        setBlood(c.blood_group ?? '');
        setConditions(c.conditions ?? '');
        setMedicines(c.medicines ?? '');
        setAllergies(c.allergies ?? '');
        setContactName(c.contact_name ?? '');
        setContactPhone(c.contact_phone ?? '');
        setLoaded(true);
      })
      .catch(() => setError(w('failed')));
  }, [status, w, liveEpoch]);

  const save = async () => {
    setError(null);
    setNote(null);
    try {
      await putCard({ blood_group: blood || null, conditions: conditions.trim() || null, medicines: medicines.trim() || null, allergies: allergies.trim() || null, contact_name: contactName.trim() || null, contact_phone: contactPhone.trim() || null });
      setNote(w('saved'));
    } catch {
      setError(w('failed'));
    }
  };

  useField(page, 'bloodGroup', blood, (v) => setBlood(String(v)));
  useField(page, 'conditionsField', conditions, (v) => setConditions(String(v)));
  useField(page, 'medicinesField', medicines, (v) => setMedicines(String(v)));
  useField(page, 'allergiesField', allergies, (v) => setAllergies(String(v)));
  useField(page, 'contactName', contactName, (v) => setContactName(String(v)));
  useField(page, 'contactPhone', contactPhone, (v) => setContactPhone(String(v)));
  useAction(page, 'saveCard', save);
  usePageData(page, loaded ? { values: [{ label: w('blood_group'), value: blood || '—' }, { label: w('medicines'), value: medicines || '—' }, { label: w('contact_name'), value: contactName || '—' }], images: [], lists: [], actions: [] } : null);

  return (
    <BackScreen title={w('heading')}>
      <Notice text={w('private_note')} />
      <ErrorText>{error}</ErrorText>
      <El page={page} id="bloodGroup">
        <ChoiceChips label={w('blood_group')} options={BLOOD.map((b) => ({ value: b, label: b }))} value={blood || null} onChange={setBlood} />
      </El>
      <El page={page} id="conditionsField"><Field label={w('conditions')} value={conditions} onChangeText={setConditions} maxLength={600} /></El>
      <El page={page} id="medicinesField"><Field label={w('medicines')} value={medicines} onChangeText={setMedicines} maxLength={600} /></El>
      <El page={page} id="allergiesField"><Field label={w('allergies')} value={allergies} onChangeText={setAllergies} maxLength={300} /></El>
      <El page={page} id="contactName"><Field label={w('contact_name')} value={contactName} onChangeText={setContactName} maxLength={80} /></El>
      <El page={page} id="contactPhone"><Field label={w('contact_phone')} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" maxLength={30} /></El>
      <El page={page} id="saveCard"><Button label={note ?? w('save')} icon={note ? 'checkmark' : undefined} onPress={save} /></El>
    </BackScreen>
  );
}

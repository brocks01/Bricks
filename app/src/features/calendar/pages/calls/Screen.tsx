import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { calendarApi, type CallConsent } from '../../../../api/calendar';
import { ApiError } from '../../../../api/client';
import { Button, ChoiceChips, ErrorText, Field } from '../../../../components/ui';
import { BackScreen } from '../../../../components/BackButton';
import { useStore } from '../../../../core/store';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useLocalSearchParams } from 'expo-router';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { calendarCalls as page } from './page';

// The person's standing yes to reminder calls: phone, language, allowed hours. A helper may record it
// for someone else only with the person present (the explicit tick). Only the person themselves can
// stop the calls. Saving the yes never places a call by itself.
const LANG_OPTS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'zh', label: '中文' },
  { value: 'ms', label: 'Bahasa Melayu' },
];

export default function CalendarCalls() {
  const w = usePageWords(page);
  const { status, user } = useStore(sessionStore);
  const p = useLocalSearchParams() as { person?: string };
  const person = p.person || undefined;
  const isMe = !person || person === user?.id;

  const [consent, setConsent] = useState<CallConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('en');
  const [windowFrom, setWindowFrom] = useState('08:00');
  const [windowTo, setWindowTo] = useState('20:00');
  const [personPresent, setPersonPresent] = useState('no');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== 'in') return;
    let alive = true;
    (async () => {
      try {
        const c = await calendarApi.getConsent(person);
        if (!alive) return;
        setConsent(c);
        if (c.language) setLanguage(c.language);
        if (c.window_from) setWindowFrom(c.window_from);
        if (c.window_to) setWindowTo(c.window_to);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof ApiError && e.code === 'no_access' ? w('noAccess') : w('failed'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [status, person, w]);

  const agree = useCallback(async () => {
    if (busy) return;
    if (!phone.trim()) return setError(w('callsNeedPhone'));
    if (!/^\+?[0-9 ]{6,20}$/.test(phone.trim())) return setError(w('callsBadPhone'));
    if (!/^\d{2}:\d{2}$/.test(windowFrom) || !/^\d{2}:\d{2}$/.test(windowTo)) return setError(w('callsBadWindow'));
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const c = await calendarApi.putConsent({
        person_id: person,
        phone: phone.trim(),
        language,
        window_from: windowFrom,
        window_to: windowTo,
        person_present: !isMe && personPresent === 'yes',
      });
      setConsent(c);
      setPhone(''); // never keep the full number around after it is saved
      setPersonPresent('no');
      setInfo(w('callsSaved'));
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'person_present_needed') setError(w('callsPersonPresentNeeded'));
        else if (e.code === 'validation') setError(w('callsBadWindow'));
        else if (e.code === 'no_access') setError(w('noAccess'));
        else setError(w('failed'));
      } else setError(w('failed'));
    } finally {
      setBusy(false);
    }
  }, [busy, phone, windowFrom, windowTo, person, language, isMe, personPresent, w]);

  const stop = useCallback(async () => {
    if (busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await calendarApi.revokeConsent();
      setConsent((c) => (c ? { ...c, agreed: false, revoked: true } : c));
      setInfo(w('callsStopped'));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'no_access') setError(w('callsOnlySelf'));
      else setError(w('failed'));
    } finally {
      setBusy(false);
    }
  }, [busy, w]);

  useField(page, 'callsPhone', phone, (v) => setPhone(String(v)));
  useField(page, 'callsWindowFrom', windowFrom, (v) => setWindowFrom(String(v)));
  useField(page, 'callsWindowTo', windowTo, (v) => setWindowTo(String(v)));
  useAction(page, 'callsAgree', () => void agree());
  useAction(page, 'callsStop', () => void stop());

  const statusLine = () => {
    if (!consent) return null;
    if (consent.agreed) {
      const bits = [w('callsStatusAgreed')];
      if (consent.phone_masked) bits.push(consent.phone_masked);
      if (consent.window_from && consent.window_to) bits.push(`${consent.window_from}–${consent.window_to}`);
      return bits.join(' · ');
    }
    return consent.revoked ? w('callsStatusRevoked') : w('callsStatusNot');
  };

  return (
    <BackScreen title={w('callsHeading')} subtitle={w('callsIntro')}>
      {!loading && consent ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.md }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: consent.agreed ? colors.accent : colors.ink }}>{statusLine()}</Text>
        </View>
      ) : null}

      <El page={page} id="callsPhone">
        <Field label={w('callsPhone')} value={phone} onChangeText={setPhone} placeholder={w('callsPhonePlaceholder')} keyboardType="phone-pad" autoCapitalize="none" />
      </El>

      <El page={page} id="callsLanguage">
        <ChoiceChips label={w('callsLanguage')} options={LANG_OPTS} value={language} onChange={setLanguage} />
      </El>

      <Text style={[type.small, { color: colors.muted, marginBottom: space.xs }]}>{w('callsWindowHint')}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <El page={page} id="callsWindowFrom">
            <Field label={w('callsWindowFrom')} value={windowFrom} onChangeText={setWindowFrom} placeholder="08:00" autoCapitalize="none" />
          </El>
        </View>
        <View style={{ flex: 1 }}>
          <El page={page} id="callsWindowTo">
            <Field label={w('callsWindowTo')} value={windowTo} onChangeText={setWindowTo} placeholder="20:00" autoCapitalize="none" />
          </El>
        </View>
      </View>

      {!isMe ? (
        <View style={{ marginTop: space.sm }}>
          <Text style={[type.small, { color: colors.muted, marginBottom: space.xs }]}>{w('callsPersonPresentHint')}</Text>
          <El page={page} id="callsPersonPresent">
            <ChoiceChips
              label={w('callsPersonPresent')}
              options={[{ value: 'no', label: w('callsPersonPresentNo') }, { value: 'yes', label: w('callsPersonPresentYes') }]}
              value={personPresent}
              onChange={setPersonPresent}
            />
          </El>
        </View>
      ) : null}

      <ErrorText>{error}</ErrorText>
      {info ? <Text style={[type.small, { color: colors.accent, fontWeight: '700', marginBottom: space.sm }]}>{info}</Text> : null}

      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <El page={page} id="callsAgree">
          <Button label={w('callsAgree')} onPress={() => void agree()} disabled={busy} icon="call-outline" />
        </El>
        {consent?.agreed && isMe ? (
          <El page={page} id="callsStop">
            <Button label={w('callsStop')} onPress={() => void stop()} disabled={busy} kind="danger" icon="stop-circle-outline" />
          </El>
        ) : null}
      </View>
    </BackScreen>
  );
}


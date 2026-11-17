import { useLocalSearchParams } from 'expo-router';
import { useLiveEpoch } from '../../../core/useFocusLive';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getMyCommunities, type MyCommunity } from '../../../api/communities';
import { archiveListing, bookListing, endorseListing, getListing, updateListing, type ListingDetail } from '../../../api/wisdom';
import { Empty, Notice, Panel, Pill, Section } from '../../../components/blocks';
import { BackScreen } from '../../../components/BackButton';
import { Button, ChoiceChips, ErrorText, Field } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { El, useAction, useField, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, space, type } from '../../../theme/tokens';
import { wisdomService as page } from '../pages';
import { categoryWord, money, refusalWord, tierWord } from '../serviceUi';

const pad = (n: number) => String(n).padStart(2, '0');
const tomorrow = () => {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** One paid session: proof, what people say, and a booking form. Moved here from the Marketplace tab. */
export default function ServiceScreen() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status } = useStore(sessionStore);
  const [l, setL] = useState<ListingDetail | null>(null);
  const [lost, setLost] = useState(false);
  const [date, setDate] = useState(tomorrow());
  const [time, setTime] = useState('10:00');
  const [hours, setHours] = useState('1');
  const [note, setNote] = useState('');
  const [forWhom, setForWhom] = useState('me');
  const [leads, setLeads] = useState<MyCommunity[]>([]);
  const [thanks, setThanks] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    getListing(id).then(setL).catch(() => setLost(true));
  }, [id]);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (status !== 'in') return;
    load();
    getMyCommunities().then((all) => setLeads(all.filter((c) => c.my_role !== 'Member'))).catch(() => setLeads([]));
  }, [status, load, liveEpoch]);

  const send = async () => {
    if (!l) return;
    setError(null);
    setMsg(null);
    const start = new Date(`${date.trim()}T${time.trim()}:00`);
    const h = parseFloat(hours.replace(',', '.'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || !/^\d{1,2}:\d{2}$/.test(time.trim()) || Number.isNaN(start.getTime()) || !(h > 0)) return setError(w('err_date'));
    try {
      await bookListing(l.id, { starts_at: start.toISOString(), hours: h, note: note.trim() || undefined, community_id: forWhom !== 'me' ? forWhom : undefined });
      setMsg(w('request_sent', { name: l.owner_name }));
    } catch (e) {
      setError(w(refusalWord(e)));
    }
  };

  const thank = async () => {
    if (!l) return;
    try {
      await endorseListing(l.id, thanks.trim() || undefined);
      setMsg(w('endorsed_thanks'));
      load();
    } catch (e) {
      setError(w(refusalWord(e)));
    }
  };

  const pause = async () => {
    if (!l) return;
    await updateListing(l.id, { status: l.status === 'paused' ? 'active' : 'paused' }).catch(() => setError(w('failed')));
    load();
  };

  const remove = async () => {
    if (!l) return;
    await archiveListing(l.id).catch(() => setError(w('failed')));
    navigate('wisdom.myServices');
  };

  useField(page, 'date', date, (v) => setDate(String(v)));
  useField(page, 'time', time, (v) => setTime(String(v)));
  useField(page, 'hours', hours, (v) => setHours(String(v)));
  useField(page, 'note', note, (v) => setNote(String(v)));
  useField(page, 'forWhom', forWhom, (v) => setForWhom(String(v)));
  useField(page, 'endorseNote', thanks, (v) => setThanks(String(v)));
  useAction(page, 'sendRequest', send);
  useAction(page, 'endorse', thank);
  useAction(page, 'pause', pause);
  useAction(page, 'removeListing', remove);

  usePageData(
    page,
    l === null
      ? null
      : {
          values: [
            { label: w('f_title'), value: l.title },
            { label: w('by_owner', { name: '' }).trim(), value: l.owner_name },
            { label: w('f_years'), value: String(l.experience_years) },
            { label: w('f_rate'), value: l.rate_per_hour ? money(l.rate_per_hour, l.currency) : w('free') },
          ],
          images: [],
          lists: [],
          actions: [],
        }
  );

  if (lost) return <BackScreen title={w('heading')}><Empty text={w('not_found')} /></BackScreen>;
  if (!l) return <BackScreen title={w('heading')}><Text style={[type.body, { color: colors.muted }]}> </Text></BackScreen>;

  return (
    <BackScreen title={l.title}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
        <Pill text={w(categoryWord(l.category))} tone="quiet" />
        <Pill text={w(tierWord(l.tier))} />
        {l.verified ? <Pill text={w('verified')} /> : null}
        {l.status === 'paused' ? <Pill text={w('status_requested')} tone="warn" /> : null}
      </View>
      <Text style={[type.body, { color: colors.ink }]}>{w('by_owner', { name: l.owner_name || '—' })} · {w('years_exp', { n: l.experience_years })}</Text>
      <Text style={[type.h2, { color: colors.accent, marginVertical: space.sm }]}>{l.rate_per_hour ? w('per_hour', { price: money(l.rate_per_hour, l.currency) }) : w('free')}</Text>
      {l.description ? <Text style={[type.body, { color: colors.ink }]}>{l.description}</Text> : null}
      {l.area_name ? <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>{l.area_name}</Text> : null}
      <Notice text={w('adviceNote')} icon="information-circle-outline" />

      {l.proof_text ? (
        <Section title={w('proof_title')}>
          <Panel><Text style={[type.body, { color: colors.ink }]}>{l.proof_text}</Text></Panel>
        </Section>
      ) : null}

      {l.endorsed_by.length ? (
        <Section title={`${w('endorsements_title')} (${l.endorsements})`}>
          {l.endorsed_by.map((e, i) => (
            <Panel key={i}>
              <Text style={[type.small, { color: colors.ink, fontWeight: '700' }]}>{e.name}</Text>
              {e.note ? <Text style={[type.body, { color: colors.ink }]}>{e.note}</Text> : null}
            </Panel>
          ))}
        </Section>
      ) : null}

      {l.mine ? (
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <ErrorText>{error}</ErrorText>
          <El page={page} id="pause"><Button label={l.status === 'paused' ? w('unpause_listing') : w('pause_listing')} kind="plain" onPress={pause} /></El>
          <El page={page} id="removeListing"><Button label={w('remove_listing')} kind="danger" onPress={remove} /></El>
        </View>
      ) : (
        <>
          <Section title={w('book_title')}>
            {leads.length ? (
              <El page={page} id="forWhom">
                <ChoiceChips label="" options={[{ value: 'me', label: w('book_for_me') }, ...leads.map((c) => ({ value: c.id, label: w('book_for_community', { name: c.name }) }))]} value={forWhom} onChange={setForWhom} />
              </El>
            ) : null}
            <El page={page} id="date"><Field label={w('f_date')} value={date} onChangeText={setDate} maxLength={10} /></El>
            <El page={page} id="time"><Field label={w('f_time')} value={time} onChangeText={setTime} maxLength={5} /></El>
            <El page={page} id="hours"><Field label={w('f_hours')} value={hours} onChangeText={setHours} keyboardType="numeric" maxLength={4} /></El>
            <El page={page} id="note"><Field label={w('f_note')} value={note} onChangeText={setNote} maxLength={500} /></El>
            <El page={page} id="sendRequest"><Button label={w('send_request')} icon="paper-plane-outline" onPress={send} /></El>
            <View style={{ marginTop: space.sm }}>
              <ErrorText>{error}</ErrorText>
              {msg ? <Notice text={msg} /> : null}
            </View>
            <Text style={[type.small, { color: colors.muted, marginTop: space.sm }]}>{w('payment_note')}</Text>
          </Section>

          {l.can_endorse ? (
            <Section title={w('endorse_title')}>
              <El page={page} id="endorseNote"><Field label={w('endorse_note')} value={thanks} onChangeText={setThanks} maxLength={200} /></El>
              <El page={page} id="endorse"><Button label={w('endorse_btn')} icon="heart-outline" onPress={thank} /></El>
              <View style={{ marginTop: space.sm }}>
                <ErrorText>{error}</ErrorText>
                {msg ? <Notice text={msg} /> : null}
              </View>
            </Section>
          ) : null}
        </>
      )}
    </BackScreen>
  );
}

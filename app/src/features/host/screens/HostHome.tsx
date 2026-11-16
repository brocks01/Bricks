import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  cancelHostEvent, createHostEvent, endHostSeries, getHostEvents, getMyHosts, INTENTS, OPPORTUNITY_KINDS, REPEATS,
  type HostEvent, type HostEventBody, type Intent, type MyHost, type OpportunityKind,
} from '../../../api/hosts';
import { Empty, ListRow, Pill, Section } from '../../../components/blocks';
import { Body, Button, Card, ChoiceChips, ErrorText, Field } from '../../../components/ui';
import { BackScreen } from '../../../components/BackButton';
import { El, useAction, useField, usePageWords } from '../../../kit';
import { colors, radius, space, type } from '../../../theme/tokens';
import { hostHome as page } from '../pages';

// What each kind is usually for; the person can change any of them (a person may do more than one thing there).
const DEFAULT_INTENTS: Record<OpportunityKind, Intent[]> = {
  market_day: ['earn', 'enjoy'],
  volunteer: ['volunteer', 'contribute'],
  gig: ['earn'],
  show: ['enjoy'],
  activity: ['enjoy'],
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** My host: the host the person works for (an Active Ageing Centre, a mall, a community centre) — what is coming up there,
 *  the form to add one, and a way to cancel one. Hidden from everyone who is not a member of a host (the server decides). */
export default function HostHome() {
  const w = usePageWords(page);
  const [hosts, setHosts] = useState<MyHost[] | null>(null); // null = still looking
  const [active, setActive] = useState<MyHost | null>(null);
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<OpportunityKind>('market_day');
  const [intents, setIntents] = useState<Intent[]>(DEFAULT_INTENTS.market_day);
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState<(typeof REPEATS)[number]>('none');
  const [stalls, setStalls] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadEvents = useCallback((h: MyHost) => {
    getHostEvents(h.id).then(setEvents).catch(() => setEvents([]));
  }, []);

  useFocusEffect(useCallback(() => {
    let live = true;
    getMyHosts().then((hs) => {
      if (!live) return;
      setHosts(hs);
      const only = hs.length === 1 ? hs[0] : null;
      setActive(only);
      if (only) loadEvents(only);
      else setEvents([]);
    }).catch(() => { if (live) setHosts([]); });
    return () => { live = false; };
  }, [loadEvents]));

  const choose = (h: MyHost) => { setActive(h); loadEvents(h); };
  const pickKind = (k: OpportunityKind) => { setKind(k); setIntents(DEFAULT_INTENTS[k]); };
  const toggleIntent = (i: Intent) => setIntents((cur) => (cur.includes(i) ? (cur.length > 1 ? cur.filter((x) => x !== i) : cur) : [...cur, i]));

  const add = async () => {
    if (!active) return;
    if (title.trim().length < 3) return setError(w('need_title'));
    if (venue.trim().length < 2) return setError(w('need_venue'));
    const day = date.trim();
    const starts = new Date(`${day}T${time.trim() || '10:00'}`);
    if (!DAY.test(day) || Number.isNaN(starts.getTime())) return setError(w('need_date'));
    setBusy(true);
    try {
      const body: HostEventBody = {
        title: title.trim(),
        kind,
        intents,
        venue_name: venue.trim(),
        address: address.trim() || undefined,
        starts_at: starts.toISOString(),
        repeat,
        stalls_total: stalls.trim() ? Math.max(0, Math.min(200, parseInt(stalls, 10) || 0)) : undefined,
        external_url: link.trim() || undefined,
      };
      await createHostEvent(active.id, body);
      setError(null);
      setTitle(''); setVenue(''); setAddress(''); setDate(''); setTime(''); setStalls(''); setLink(''); setRepeat('none');
      setIntents(DEFAULT_INTENTS[kind]);
      loadEvents(active);
    } catch {
      setError(w('failed'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (e: HostEvent) => {
    if (!active) return;
    try { await cancelHostEvent(active.id, e.id); setError(null); loadEvents(active); } catch { setError(w('failed')); }
  };
  const stop = async (e: HostEvent) => {
    if (!active) return;
    try { await endHostSeries(active.id, e.id); setError(null); loadEvents(active); } catch { setError(w('failed')); }
  };

  useField(page, 'title', title, (v) => setTitle(String(v)));
  useField(page, 'kind', kind, (v) => (OPPORTUNITY_KINDS as string[]).includes(v as string) && pickKind(v as OpportunityKind));
  useField(page, 'venue', venue, (v) => setVenue(String(v)));
  useField(page, 'address', address, (v) => setAddress(String(v)));
  useField(page, 'date', date, (v) => setDate(String(v)));
  useField(page, 'time', time, (v) => setTime(String(v)));
  useField(page, 'repeat', repeat, (v) => (REPEATS as readonly string[]).includes(v as string) && setRepeat(v as (typeof REPEATS)[number]));
  useField(page, 'stalls', stalls, (v) => setStalls(String(v)));
  useField(page, 'link', link, (v) => setLink(String(v)));
  useAction(page, 'add', add);

  if (hosts === null) return <BackScreen title={w('h_host')}><Body muted>…</Body></BackScreen>;
  if (hosts.length === 0) {
    return (
      <BackScreen title={w('h_host')}>
        <Empty text={w('host_none')} />
        <Body muted>{w('host_none_d')}</Body>
      </BackScreen>
    );
  }
  if (!active) {
    return (
      <BackScreen title={w('h_host')} subtitle={w('choose_host')}>
        {hosts.map((h) => (
          <ListRow key={h.id} icon="business-outline" title={h.name} sub={h.area_name ?? ''} onPress={() => choose(h)} />
        ))}
      </BackScreen>
    );
  }

  return (
    <BackScreen title={w('h_host')} subtitle={`${active.name} · ${w(`role_${active.role}`)}`}>
      <Section title={w('coming_up')}>
        {events.length === 0 ? <Empty text={w('no_events')} /> : null}
        {events.map((e) => (
          <Card key={e.id}>
            <Body>{e.title}</Body>
            <Body muted>
              {[new Date(e.starts_at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
                e.venue_name, e.repeat ? w(`repeat_${e.repeat}`) : ''].filter(Boolean).join(' · ')}
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginVertical: space.sm }}>
              {e.intents.map((i) => <Pill key={i} text={w(`intent_${i}`)} />)}
              <Pill text={w('n_going', { n: e.going_count })} tone="quiet" />
              <Pill text={w('n_stalls', { n: e.stalls_left })} tone="quiet" />
            </View>
            <View style={{ gap: space.sm }}>
              <Button kind="plain" label={w('cancel')} onPress={() => void cancel(e)} />
              {e.repeat ? <Button kind="plain" label={w('stop_series')} onPress={() => void stop(e)} /> : null}
            </View>
          </Card>
        ))}
      </Section>

      <Card title={w('add')}>
        <ErrorText>{error}</ErrorText>
        <El page={page} id="title"><Field label={w('f_title')} value={title} onChangeText={setTitle} maxLength={120} /></El>
        <El page={page} id="kind">
          <ChoiceChips label={w('f_kind')} options={OPPORTUNITY_KINDS.map((k) => ({ value: k, label: w(`kind_${k}`) }))} value={kind} onChange={(v) => pickKind(v as OpportunityKind)} />
        </El>
        <Text style={[type.small, { color: colors.ink, fontWeight: '700', marginBottom: space.xs }]}>{w('what_todo')}</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
          {INTENTS.map((i) => {
            const on = intents.includes(i);
            return (
              <Pressable key={i} onPress={() => toggleIntent(i)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                style={{ minHeight: 48, paddingHorizontal: 18, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#FFFFFF' : colors.ink }}>{w(`intent_${i}`)}</Text>
              </Pressable>
            );
          })}
        </View>
        <El page={page} id="venue"><Field label={w('f_venue')} value={venue} onChangeText={setVenue} maxLength={120} /></El>
        <El page={page} id="address"><Field label={w('f_address')} value={address} onChangeText={setAddress} maxLength={200} /></El>
        <El page={page} id="date"><Field label={w('f_date')} value={date} onChangeText={setDate} placeholder={w('hint_date')} keyboardType="numbers-and-punctuation" maxLength={10} /></El>
        <El page={page} id="time"><Field label={w('f_time')} value={time} onChangeText={setTime} placeholder={w('hint_time')} keyboardType="numbers-and-punctuation" maxLength={5} /></El>
        <El page={page} id="repeat">
          <ChoiceChips label={w('f_repeat')} options={REPEATS.map((r) => ({ value: r, label: w(`repeat_${r}`) }))} value={repeat} onChange={(v) => setRepeat(v as (typeof REPEATS)[number])} />
        </El>
        <El page={page} id="stalls"><Field label={w('f_stalls')} value={stalls} onChangeText={setStalls} keyboardType="numeric" maxLength={3} /></El>
        <El page={page} id="link"><Field label={w('f_link')} value={link} onChangeText={setLink} maxLength={300} autoCapitalize="none" /></El>
        <El page={page} id="add">
          <Button label={w('add')} icon="add" disabled={busy} onPress={() => void add()} />
        </El>
      </Card>
    </BackScreen>
  );
}

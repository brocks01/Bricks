import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { ApiError } from '../../../api/client';
import { cancelMarketStall, getMarketEvent, setMarketGoing, takeMarketStall, type MarketEventDetail } from '../../../api/market';
import { Empty, ListRow, Notice, Pill, Section } from '../../../components/blocks';
import { Body, Button, Card, ChoiceChips, ErrorText, Field, Screen } from '../../../components/ui';
import { usePageWords } from '../../../kit';
import { colors, space } from '../../../theme/tokens';
import { marketDay as page } from '../pages';

type Slot = 'first' | 'second' | 'whole';
const SLOT_WORD: Record<Slot, string> = { first: 'slotFirst', second: 'slotSecond', whole: 'slotWhole' };

/** One market day: when, where, who is going, the stalls, and the two things a person can do: say they are going, or take a stall (people aged 60 and over). */
export default function MarketDay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const [e, setE] = useState<MarketEventDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [selling, setSelling] = useState('');
  const [slot, setSlot] = useState<Slot>('whole');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => { getMarketEvent(String(id)).then(setE).catch(() => setFailed(true)); }, [id]);
  useEffect(() => { load(); }, [load]);

  const going = async (on: boolean) => {
    try { await setMarketGoing(String(id), on); setError(null); load(); } catch { setError(w('dayFailed')); }
  };
  const stall = async () => {
    try { await takeMarketStall(String(id), { selling: selling.trim(), slot, kind: 'goods' }); setSelling(''); setError(null); load(); }
    catch (err) { setError(err instanceof ApiError && err.code === 'sellers_are_seniors' ? w('sellersOnly') : w('dayFailed')); }
  };
  const give = async () => { try { await cancelMarketStall(String(id)); load(); } catch { setError(w('dayFailed')); } };

  if (failed) return <Screen title={w('dayHeading')} back><Body muted>{w('dayNotFound')}</Body></Screen>;
  if (!e) return <Screen title={w('dayHeading')} back><Body muted>…</Body></Screen>;
  const mine = e.stalls.find((s) => s.mine);
  const when = new Date(e.starts_at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <Screen title={e.title} subtitle={[when, e.venue_name, e.host ? w('hostedBy', { name: e.host }) : ''].filter(Boolean).join(' · ')} back>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
        {e.repeat ? <Pill text={w(`dayRepeat_${e.repeat}`)} /> : null}
        {e.intents.map((i) => <Pill key={i} text={w(`intent_${i}`)} />)}
        <Pill text={w('goingCount', { n: e.going_count })} tone="quiet" />
        <Pill text={w('stallsLeft', { n: e.stalls_left })} tone="quiet" />
      </View>
      {e.description ? <Body>{e.description}</Body> : null}
      {e.external_url ? <Button kind="plain" label={w('openLink')} onPress={() => { void Linking.openURL(e.external_url as string); }} /> : null}
      {e.address ? <Text style={{ color: colors.muted, marginVertical: space.sm }}>{e.address}</Text> : null}
      {e.my_communities.length ? <Notice text={`${w('yourCommunities')}: ${e.my_communities.map((c) => c.name).join(', ')}`} icon="people-outline" /> : null}
      <View style={{ height: space.sm }} />
      <Button kind={e.i_going ? 'plain' : 'primary'} label={e.i_going ? w('imNotGoing') : w('imGoing')} onPress={() => void going(!e.i_going)} />
      <ErrorText>{error}</ErrorText>
      <Section title={w('stallsTitle')}>
        {e.stalls.length === 0 ? <Empty text={w('noStalls')} /> : e.stalls.map((s) => (
          <ListRow key={s.id} icon="storefront-outline" title={s.selling} sub={`${s.seller} · ${w(SLOT_WORD[s.slot as Slot] ?? 'slotWhole')}${s.helper_name ? ' · ' + s.helper_name : ''}`} right={s.mine ? <Pill text="✓" /> : undefined} />
        ))}
      </Section>
      {mine ? (
        <Card><Body>{w('yourStall')}</Body><View style={{ height: space.sm }} /><Button kind="plain" label={w('cancelStall')} onPress={() => void give()} /></Card>
      ) : e.stalls_left > 0 ? (
        <Card title={w('takeStall')}>
          <Field label={w('sellingLabel')} value={selling} onChangeText={setSelling} maxLength={200} />
          <ChoiceChips label={w('dayStalls')} options={(['first', 'second', 'whole'] as Slot[]).map((s) => ({ value: s, label: w(SLOT_WORD[s]) }))} value={slot} onChange={(v) => setSlot(v as Slot)} />
          <View style={{ height: space.sm }} />
          <Button label={w('takeStall')} onPress={() => void stall()} disabled={selling.trim().length < 2} />
        </Card>
      ) : null}
    </Screen>
  );
}

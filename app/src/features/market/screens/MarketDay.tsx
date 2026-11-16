import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { ApiError } from '../../../api/client';
import { cancelMarketStall, getMarketEvent, setMarketGoing, takeMarketStall, type MarketEventDetail } from '../../../api/market';
import { addMilestone, getMilestones, tickMilestone, type Milestone } from '../../../api/marketSteps';
import { Empty, ListRow, Notice, Pill, Section } from '../../../components/blocks';
import { Body, Button, Card, ChoiceChips, ErrorText, Field } from '../../../components/ui';
import { BackScreen } from '../../../components/BackButton';
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
  const [steps, setSteps] = useState<Milestone[]>([]);
  const [canAddStep, setCanAddStep] = useState(false);
  const [stepCommunity, setStepCommunity] = useState<string | null>(null);
  const [stepTitle, setStepTitle] = useState('');
  const [stepDue, setStepDue] = useState('');

  const load = useCallback(() => { getMarketEvent(String(id)).then(setE).catch(() => setFailed(true)); }, [id]);
  const loadSteps = useCallback(() => {
    getMilestones(String(id)).then((r) => { setSteps(r.milestones); setCanAddStep(r.can_add); setStepCommunity(r.my_community_id); })
      .catch(() => { setSteps([]); setCanAddStep(false); setStepCommunity(null); });
  }, [id]);
  useEffect(() => { load(); loadSteps(); }, [load, loadSteps]);

  const going = async (on: boolean) => {
    try { await setMarketGoing(String(id), on); setError(null); load(); } catch { setError(w('dayFailed')); }
  };
  const stall = async () => {
    try { await takeMarketStall(String(id), { selling: selling.trim(), slot, kind: 'goods' }); setSelling(''); setError(null); load(); }
    catch (err) { setError(err instanceof ApiError && err.code === 'sellers_are_seniors' ? w('sellersOnly') : w('dayFailed')); }
  };
  const give = async () => { try { await cancelMarketStall(String(id)); load(); } catch { setError(w('dayFailed')); } };
  // The circle's weekly steps toward its stall: the lead of a circle that planned the visit adds them, every member ticks them.
  const addStep = async () => {
    const cid = stepCommunity ?? e?.my_communities[0]?.community_id;
    if (!cid) return;
    try {
      await addMilestone(String(id), { community_id: cid, title: stepTitle.trim(), due_on: stepDue.trim() || undefined });
      setStepTitle(''); setStepDue(''); setError(null); loadSteps();
    } catch { setError(w('dayFailed')); }
  };
  const tickStep = async (s: Milestone) => {
    try { await tickMilestone(String(id), s.id, !s.done); setError(null); loadSteps(); } catch { setError(w('dayFailed')); }
  };

  if (failed) return <BackScreen title={w('dayHeading')}><Body muted>{w('dayNotFound')}</Body></BackScreen>;
  if (!e) return <BackScreen title={w('dayHeading')}><Body muted>…</Body></BackScreen>;
  const mine = e.stalls.find((s) => s.mine);
  const when = new Date(e.starts_at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <BackScreen title={e.title} subtitle={[when, e.venue_name, e.host ? w('hostedBy', { name: e.host }) : ''].filter(Boolean).join(' · ')}>
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
      {e.my_communities.length ? (
        <Section title={w('daySteps')}>
          {steps.length === 0 ? <Empty text={w('noSteps')} /> : null}
          {steps.map((s) => (
            <ListRow key={s.id} icon={s.done ? 'checkmark-circle' : 'ellipse-outline'} title={s.title}
              sub={[s.community,
                    s.due_on ? `${w('stepBy')} ${new Date(`${s.due_on}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : '',
                    s.done ? w('stepDone') : ''].filter(Boolean).join(' · ')}
              onPress={() => void tickStep(s)} />
          ))}
          {canAddStep ? (
            <Card title={w('addStep')}>
              <Field label={w('step_title')} value={stepTitle} onChangeText={setStepTitle} maxLength={200} />
              <Field label={w('step_by')} value={stepDue} onChangeText={setStepDue} keyboardType="numbers-and-punctuation" maxLength={10} />
              <View style={{ height: space.sm }} />
              <Button label={w('addStep')} onPress={() => void addStep()} disabled={stepTitle.trim().length < 2} />
            </Card>
          ) : null}
        </Section>
      ) : null}
    </BackScreen>
  );
}

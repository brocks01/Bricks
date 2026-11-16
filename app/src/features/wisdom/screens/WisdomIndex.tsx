import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '../../../api/client';
import {
  answerRequest, askOffer, CAPSULE_KINDS, closeRequest, decideConnection, getConnections, getLibrary, getMyCapsules, getMyOffers, getMyRequests, getOffers, getRequests, getWisdomStats, logSession, putOnboarding,
  setOfferStatus, shareCapsule, type Capsule, type Connection, type Offer, type Request, type WisdomStats,
} from '../../../api/wisdom';
import { ChipRow, Empty, Figure, ListRow, Notice, Pill, Section } from '../../../components/blocks';
import { Body, Button, Card, Field, Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { El, useAction, useField, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, space } from '../../../theme/tokens';
import { profileStore } from '../../onboarding/state';
import { wisdomIndex as page } from '../pages';

type Part = 'stories' | 'mentors' | 'learners' | 'mine';
type Target = { kind: 'offer' | 'request'; id: string; name: string } | null;

export default function WisdomIndex() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { profile } = useStore(profileStore);
  const helpOnly = !!profile?.roles.includes('help') && !profile.roles.includes('share'); // the next generation sees who needs a hand; elders see who wants to learn
  const parts: Part[] = (profile?.wisdom.parts as Part[] | undefined) ?? ['stories', 'mentors', 'learners', 'mine'];
  const [part, setPart] = useState<Part>((profile?.wisdom.default as Part | undefined) ?? 'stories');
  const [library, setLibrary] = useState<Capsule[] | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [mineCaps, setMineCaps] = useState<Capsule[]>([]);
  const [mineOffers, setMineOffers] = useState<Offer[]>([]);
  const [mineReqs, setMineReqs] = useState<Request[]>([]);
  const [conns, setConns] = useState<Connection[]>([]);
  const [stats, setStats] = useState<WisdomStats | null>(null);
  const [target, setTarget] = useState<Target>(null);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [needAge, setNeedAge] = useState(false);
  const [minutes, setMinutes] = useState('30');
  const [kind, setKind] = useState<string>('all');

  const load = useCallback(() => {
    getLibrary().then(setLibrary).catch(() => setLibrary([]));
    getOffers().then(setOffers).catch(() => setOffers([]));
    getRequests('', helpOnly ? 'support' : 'learn').then(setRequests).catch(() => setRequests([]));
    getMyCapsules().then(setMineCaps).catch(() => undefined);
    getMyOffers().then(setMineOffers).catch(() => undefined);
    getMyRequests().then(setMineReqs).catch(() => undefined);
    getConnections().then(setConns).catch(() => undefined);
    getWisdomStats().then(setStats).catch(() => undefined);
  }, [helpOnly]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useField(page, 'section', part, (v) => setPart(String(v) as Part));
  useAction(page, 'story', () => go('wisdom.story'));
  useAction(page, 'offer', () => go('wisdom.offer'));
  useAction(page, 'ask', () => go('wisdom.ask'));

  const waiting = conns.filter((c) => c.waiting_for_me);
  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.code === 'confirm_age_15') setNeedAge(true);
    else setNote(w('failed'));
  };
  const send = async () => {
    if (!target) return;
    try {
      if (target.kind === 'offer') await askOffer(target.id, message.trim() || undefined);
      else await answerRequest(target.id, message.trim() || undefined);
      setNote(w('sent', { name: target.name }));
      setTarget(null);
      setMessage('');
      setNeedAge(false);
      load();
    } catch (e) {
      fail(e);
    }
  };
  const confirmAge = async () => {
    try {
      await putOnboarding('learn', { age_15_plus: true });
      setNeedAge(false);
      await send();
    } catch {
      setNote(w('failed'));
    }
  };

  const composer = (
    <Card>
      <Field label={w('messagePlaceholder')} value={message} onChangeText={setMessage} maxLength={500} />
      {needAge ? <Notice text={w('confirmAge')} tone="warn" icon="alert-circle-outline" /> : null}
      <Button label={needAge ? w('iAm15') : w('send')} onPress={needAge ? confirmAge : send} />
      <View style={{ height: space.sm }} />
      <Button kind="plain" label={w('cancel')} onPress={() => { setTarget(null); setNeedAge(false); }} />
    </Card>
  );
  const modeWord = (m: string) => w(m === 'volunteer' ? 'free' : m);
  const shown = library === null ? null : library.filter((c) => kind === 'all' || c.kind === kind);

  return (
    <Screen title={w('heading')} subtitle={profile?.focus === 'serve' ? w('introServe') : w('intro')}>
      <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.md }}>
        <Figure n={stats?.calls ?? 0} label={w('calls')} icon="call-outline" />
        <Figure n={stats?.people_helped ?? 0} label={w('helped')} icon="heart-outline" />
        <Figure n={stats?.mentors_learned_from ?? 0} label={w('learnedFrom')} icon="school-outline" />
      </View>
      {waiting.length ? <Notice text={waiting.length === 1 ? w('waitingOne') : w('waiting', { n: waiting.length })} icon="notifications-outline" /> : null}
      {note ? <Notice text={note} /> : null}
      <El page={page} id="section">
        <ChipRow<Part> options={parts.map((p) => ({ value: p, label: p === 'learners' && profile?.focus === 'serve' ? w('needHelp') : w(p) }))} value={part} onChange={setPart} />
      </El>
      <View style={{ height: space.md }} />

      {part === 'stories' ? (
        <>
          <Button label={w('keepStory')} icon="create-outline" onPress={() => go('wisdom.story')} />
          <View style={{ height: space.md }} />
          <ChipRow options={['all', ...CAPSULE_KINDS].map((k) => ({ value: k, label: k === 'all' ? w('all') : w(`kind_${k}`) }))} value={kind} onChange={setKind} />
          <View style={{ height: space.md }} />
          {shown === null ? null : shown.length === 0 ? <Empty text={w('noStories')} /> : shown.map((c) => (
            <Card key={c.id} title={c.title}>
              <Body>{c.body.length > 280 ? c.body.slice(0, 280) + '…' : c.body}</Body>
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' }}>
                <Pill text={c.by} tone="quiet" />
                <Pill text={w(`kind_${c.kind}`)} />
                {c.tags.slice(0, 3).map((t) => <Pill key={t} text={t} tone="quiet" />)}
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {part === 'mentors' ? (
        <>
          {offers === null ? null : offers.length === 0 ? <Empty text={w('noMentors')} /> : offers.map((o) => (
            <View key={o.id}>
              <ListRow icon="school-outline" title={o.title} sub={`${o.by} · ${w(o.kind)} · ${modeWord(o.mode)}${o.price_note ? ' · ' + o.price_note : ''}${o.availability ? ' · ' + o.availability : ''}`}
                right={<Text style={{ color: colors.accent, fontWeight: '700' }}>{w('askGuidance')}</Text>} onPress={() => { setTarget({ kind: 'offer', id: o.id, name: o.by }); setNote(null); }} />
              {target?.kind === 'offer' && target.id === o.id ? composer : null}
            </View>
          ))}
        </>
      ) : null}

      {part === 'learners' ? (
        <>
          {requests === null ? null : requests.length === 0 ? <Empty text={w('noLearners')} /> : requests.map((r) => (
            <View key={r.id}>
              <ListRow icon="help-buoy-outline" title={r.topic} sub={`${r.by}${r.about ? ' · ' + r.about : ''}`} right={<Text style={{ color: colors.accent, fontWeight: '700' }}>{w('offerToHelp')}</Text>}
                onPress={() => { setTarget({ kind: 'request', id: r.id, name: r.by }); setNote(null); }} />
              {target?.kind === 'request' && target.id === r.id ? composer : null}
            </View>
          ))}
        </>
      ) : null}

      {part === 'mine' ? (
        <>
          <Button label={w('shareExperience')} icon="create-outline" onPress={() => go('wisdom.story')} />
          <View style={{ height: space.sm }} />
          <Button kind="plain" label={w('offerHelp')} icon="school-outline" onPress={() => go('wisdom.offer')} />
          {profile?.roles.includes('learn') ? (
            <>
              <View style={{ height: space.sm }} />
              <Button kind="plain" label={w('askLearn')} icon="help-buoy-outline" onPress={() => go('wisdom.ask')} />
            </>
          ) : null}
          {profile?.roles.some((r) => r === 'share' || r === 'connect' || r === 'care') ? (
            <>
              <View style={{ height: space.sm }} />
              <Button kind="plain" label={w('askHand')} icon="hand-left-outline" onPress={() => go('wisdom.support')} />
            </>
          ) : null}
          <View style={{ height: space.md }} />
          {conns.length ? (
            <Section title={w('introductions')}>
              {conns.map((c) => (
                <View key={c.id}>
                  <ListRow icon="people-outline" title={`${c.with} · ${c.about ?? ''}`} sub={c.message ?? undefined}
                    right={<Pill text={c.status === 'accepted' ? w('accepted') : c.status === 'pending' ? w('pendingWord') : w('declined')} tone={c.status === 'accepted' ? 'soft' : 'quiet'} />} />
                  {c.waiting_for_me ? (
                    <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
                      <View style={{ flex: 1 }}><Button label={w('accept')} onPress={() => decideConnection(c.id, true).then(load).catch(() => setNote(w('failed')))} /></View>
                      <View style={{ flex: 1 }}><Button kind="plain" label={w('notNow')} onPress={() => decideConnection(c.id, false).then(load).catch(() => setNote(w('failed')))} /></View>
                    </View>
                  ) : null}
                  {c.status === 'accepted' ? (
                    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end', marginBottom: space.md }}>
                      <View style={{ flex: 1 }}><Field label={w('minutes')} value={minutes} onChangeText={setMinutes} keyboardType="numeric" /></View>
                      <View style={{ flex: 1 }}><Button kind="plain" label={w('talked')} onPress={() => logSession(c.id, Number(minutes) || 0).then(() => { setNote(w('logged')); load(); }).catch(() => setNote(w('failed')))} /></View>
                    </View>
                  ) : null}
                </View>
              ))}
            </Section>
          ) : null}
          <Section title={w('myStories')}>
            {mineCaps.length === 0 ? <Empty text={w('nothing')} /> : mineCaps.map((c) => (
              <ListRow key={c.id} icon="book-outline" title={c.title} sub={c.status === 'published' ? w('shared') : w('private')}
                right={<Text style={{ color: colors.accent, fontWeight: '700' }}>{c.status === 'published' ? w('unshare') : w('share')}</Text>} onPress={() => shareCapsule(c.id, c.status !== 'published').then(load).catch(() => setNote(w('failed')))} />
            ))}
          </Section>
          <Section title={w('myOffers')}>
            {mineOffers.length === 0 ? <Empty text={w('nothing')} /> : mineOffers.map((o) => (
              <ListRow key={o.id} icon="school-outline" title={o.title} sub={`${w(o.kind)} · ${modeWord(o.mode)}`}
                right={<Text style={{ color: colors.accent, fontWeight: '700' }}>{o.status === 'active' ? w('pause') : w('resume')}</Text>} onPress={() => setOfferStatus(o.id, o.status === 'active' ? 'paused' : 'active').then(load).catch(() => setNote(w('failed')))} />
            ))}
          </Section>
          <Section title={w('myRequests')}>
            {mineReqs.length === 0 ? <Empty text={w('nothing')} /> : mineReqs.map((r) => (
              <ListRow key={r.id} icon="help-buoy-outline" title={r.topic} right={<Text style={{ color: colors.accent, fontWeight: '700' }}>{w('close')}</Text>} onPress={() => closeRequest(r.id).then(load).catch(() => setNote(w('failed')))} />
            ))}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

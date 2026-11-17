import { useFocusLive, useSavedState } from '../../../core/useFocusLive';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '../../../api/client';
import {
  answerRequest, askOffer, CAPSULE_KINDS, CATEGORIES, closeRequest, decideConnection, getConnections, getLibrary, getMyCapsules, getMyOffers, getMyRequests, getListings, getOffers, getRequests, getWisdomStats, logSession, putOnboarding,
  setOfferStatus, shareCapsule, type Capsule, type Connection, type Listing, type Offer, type Request, type WisdomStats,
} from '../../../api/wisdom';
import { ChipRow, Empty, Figure, ListRow, Notice, Pill, Section } from '../../../components/blocks';
import { Body, Button, Card, Field, Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { El, useAction, useField, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, space, type } from '../../../theme/tokens';
import { profileStore } from '../../onboarding/state';
import { wisdomIndex as page } from '../pages';
import { CATEGORY_ICON, categoryWord, money, tierWord } from '../serviceUi';
import { Conversation } from './Conversation';

type Part = 'stories' | 'mentors' | 'learners' | 'mine' | 'paid';
type Target = { kind: 'offer' | 'request'; id: string; name: string } | null;

export default function WisdomIndex() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { profile } = useStore(profileStore);
  const { user } = useStore(sessionStore);
  const helpOnly = !!profile?.roles.includes('help') && !profile.roles.includes('share'); // the next generation sees who needs a hand; elders see who wants to learn
  const parts: Part[] = (profile?.wisdom.parts as Part[] | undefined) ?? ['stories', 'mentors', 'learners', 'mine'];
  const [part, setPart] = useState<Part>((profile?.wisdom.default as Part | undefined) ?? 'stories');
  const [library, setLibrary] = useSavedState<Capsule[] | null>('wisdom.library', null);
  const [offers, setOffers] = useSavedState<Offer[] | null>('wisdom.offers', null);
  const [requests, setRequests] = useSavedState<Request[] | null>('wisdom.requests', null);
  const [mineCaps, setMineCaps] = useSavedState<Capsule[]>('wisdom.mineCaps', []);
  const [mineOffers, setMineOffers] = useSavedState<Offer[]>('wisdom.mineOffers', []);
  const [mineReqs, setMineReqs] = useSavedState<Request[]>('wisdom.mineReqs', []);
  const [conns, setConns] = useSavedState<Connection[]>('wisdom.conns', []);
  const [stats, setStats] = useSavedState<WisdomStats | null>('wisdom.stats', null);
  const [target, setTarget] = useState<Target>(null);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [needAge, setNeedAge] = useState(false);
  const [minutes, setMinutes] = useState('30');
  const [kind, setKind] = useState<string>('all');
  const [serviceQ, setServiceQ] = useState('');
  const [serviceKind, setServiceKind] = useState('all');
  const [listings, setListings] = useSavedState<Listing[] | null>('wisdom.listings', null);
  const [mentorQ, setMentorQ] = useState('');
  const [mentorMode, setMentorMode] = useState('all');
  const [mentorTopic, setMentorTopic] = useState('');
  const [mentorLanguage, setMentorLanguage] = useState('');
  const [mentorNear, setMentorNear] = useState('anywhere');
  const [openThread, setOpenThread] = useState<Connection | null>(null);
  const myArea = (user?.area_name ?? '').trim();

  const load = useCallback(() => {
    getLibrary().then(setLibrary).catch(() => setLibrary([]));
    getRequests('', helpOnly ? 'support' : 'learn').then(setRequests).catch(() => setRequests([]));
    getMyCapsules().then(setMineCaps).catch(() => undefined);
    getMyOffers().then(setMineOffers).catch(() => undefined);
    getMyRequests().then(setMineReqs).catch(() => undefined);
    getConnections().then(setConns).catch(() => undefined);
    getWisdomStats().then(setStats).catch(() => undefined);
  }, [helpOnly]);
  useFocusLive(useCallback(() => { load(); }, [load]));

  // mentors are searched only while that part is open, with the filters the person chose (a topic, a language, their own area)
  useEffect(() => {
    if (part !== 'mentors') return;
    if (mentorNear === 'near_me' && !myArea) { setOffers([]); return; }
    let live = true;
    getOffers(mentorQ, undefined, {
      mode: mentorMode === 'all' ? undefined : mentorMode,
      topic: mentorTopic.trim() || undefined,
      language: mentorLanguage.trim() || undefined,
      area: mentorNear === 'near_me' ? myArea : undefined,
    })
      .then((r) => { if (live) setOffers(r); })
      .catch(() => { if (live) setOffers([]); });
    return () => { live = false; };
  }, [part, mentorQ, mentorMode, mentorTopic, mentorLanguage, mentorNear, myArea]);

  // paid sessions are searched only while that part is open, so opening Wisdom costs nothing extra
  useEffect(() => {
    if (part !== 'paid') return;
    let live = true;
    getListings(serviceQ, serviceKind === 'all' ? undefined : serviceKind)
      .then((r) => { if (live) setListings(r); })
      .catch(() => { if (live) setListings([]); });
    return () => { live = false; };
  }, [part, serviceQ, serviceKind]);

  useField(page, 'section', part, (v) => setPart(String(v) as Part));
  useAction(page, 'story', () => go('wisdom.story'));
  useAction(page, 'offer', () => go('wisdom.offer'));
  useAction(page, 'ask', () => go('wisdom.ask'));
  useField(page, 'serviceSearch', serviceQ, (v) => setServiceQ(String(v)));
  useField(page, 'serviceKind', serviceKind, (v) => setServiceKind(String(v)));
  useAction(page, 'offerService', () => go('wisdom.serviceOffer'));
  useAction(page, 'myServices', () => go('wisdom.myServices'));
  useField(page, 'mentorSearch', mentorQ, (v) => setMentorQ(String(v)));
  useField(page, 'mentorMode', mentorMode, (v) => setMentorMode(String(v)));
  useField(page, 'mentorTopic', mentorTopic, (v) => setMentorTopic(String(v)));
  useField(page, 'mentorLanguage', mentorLanguage, (v) => setMentorLanguage(String(v)));
  useField(page, 'mentorNear', mentorNear, (v) => setMentorNear(String(v)));

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
        <ChipRow<Part> options={parts.map((p) => ({ value: p, label: p === 'paid' ? w('paidSessions') : p === 'learners' && profile?.focus === 'serve' ? w('needHelp') : w(p) }))} value={part} onChange={setPart} />
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
          <El page={page} id="mentorSearch"><Field label={w('searchMentors')} value={mentorQ} onChangeText={setMentorQ} maxLength={80} /></El>
          <El page={page} id="mentorMode">
            <ChipRow options={[{ value: 'all', label: w('all') }, { value: 'volunteer', label: w('free') }, { value: 'paid', label: w('paid') }]} value={mentorMode} onChange={setMentorMode} />
          </El>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}><El page={page} id="mentorTopic"><Field label={w('topicLabel')} value={mentorTopic} onChangeText={setMentorTopic} maxLength={40} /></El></View>
            <View style={{ flex: 1 }}><El page={page} id="mentorLanguage"><Field label={w('languageLabel')} value={mentorLanguage} onChangeText={setMentorLanguage} maxLength={30} /></El></View>
          </View>
          <El page={page} id="mentorNear">
            <ChipRow options={[{ value: 'anywhere', label: w('anywhere') }, { value: 'near_me', label: w('nearMe') }]} value={mentorNear} onChange={setMentorNear} />
          </El>
          {mentorNear === 'near_me' && !myArea ? <Notice text={w('needArea')} /> : null}
          <View style={{ height: space.md }} />
          {offers === null ? null : offers.length === 0 ? <Empty text={w('noMentors')} /> : offers.map((o) => (
            <Card key={o.id} title={o.title}>
              <Body>{`${o.by} · ${w(o.kind)} · ${modeWord(o.mode)}${o.price_note ? ' · ' + o.price_note : ''}${o.availability ? ' · ' + o.availability : ''}`}</Body>
              {o.proof_field || o.proof_years != null || o.proof_where ? (
                <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>{w('proofLabel')}: {[o.proof_field, o.proof_years != null ? w('years_exp', { n: o.proof_years }) : '', o.proof_where].filter(Boolean).join(' · ')}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' }}>
                <Pill text={w('endorsements_n', { n: o.endorsements })} tone="quiet" />
                <Pill text={w('sessions_n', { n: o.sessions })} tone="quiet" />
                {o.topics.slice(0, 3).map((t) => <Pill key={t} text={t} tone="quiet" />)}
                {o.languages.slice(0, 3).map((l) => <Pill key={l} text={l} tone="quiet" />)}
                {o.area ? <Pill text={o.area} tone="quiet" /> : null}
              </View>
              {o.sensitive ? <View style={{ marginTop: space.sm }}><Notice text={w('adviceNote')} tone="warn" icon="alert-circle-outline" /></View> : null}
              <View style={{ marginTop: space.sm }}>
                <Button label={w('askGuidance')} onPress={() => { setTarget({ kind: 'offer', id: o.id, name: o.by }); setNote(null); }} />
                {target?.kind === 'offer' && target.id === o.id ? composer : null}
              </View>
            </Card>
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

      {part === 'paid' ? (
        <>
          <Notice text={w('adviceNote')} icon="information-circle-outline" />
          <El page={page} id="serviceSearch">
            <Field label={w('searchServices')} value={serviceQ} onChangeText={setServiceQ} maxLength={80} />
          </El>
          <El page={page} id="serviceKind">
            <ChipRow options={['all', ...CATEGORIES].map((c) => ({ value: c, label: c === 'all' ? w('all') : w(categoryWord(c as never)) }))} value={serviceKind} onChange={setServiceKind} />
          </El>
          {profile?.roles.includes('share') ? (
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
              <View style={{ flex: 1 }}>
                <El page={page} id="offerService"><Button label={w('offer_service')} icon="add" onPress={() => go('wisdom.serviceOffer')} /></El>
              </View>
              <View style={{ flex: 1 }}>
                <El page={page} id="myServices"><Button kind="plain" label={w('my_market')} onPress={() => go('wisdom.myServices')} /></El>
              </View>
            </View>
          ) : null}
          <View style={{ height: space.md }} />
          {listings === null ? null : listings.length === 0 ? <Empty text={w('noServices')} /> : listings.map((l) => (
            <ListRow
              key={l.id}
              icon={CATEGORY_ICON[l.category]}
              title={l.title}
              sub={`${w('by_owner', { name: l.owner_name || '—' })} · ${w('years_exp', { n: l.experience_years })}`}
              onPress={() => go('wisdom.service', { id: l.id })}
              right={
                <View style={{ alignItems: 'flex-end', gap: space.xs }}>
                  <Text style={{ color: colors.accent, fontWeight: '800' }}>{l.rate_per_hour ? money(l.rate_per_hour, l.currency) : w('free')}</Text>
                  <Pill text={w(tierWord(l.tier))} tone="quiet" />
                  {l.verified ? <Pill text={w('verified')} /> : l.endorsements ? <Pill text={w('endorsed_n', { n: l.endorsements })} /> : null}
                </View>
              }
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

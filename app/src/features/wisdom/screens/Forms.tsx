import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '../../../api/client';
import { CAPSULE_KINDS, createOffer, createRequest, keepCapsule, OFFER_KINDS, OFFER_MODES, putOnboarding, type CapsuleKind, type OfferKind, type OfferMode } from '../../../api/wisdom';
import { Notice } from '../../../components/blocks';
import { Button, Card, ChoiceChips, ErrorText, Field, Screen } from '../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { space } from '../../../theme/tokens';
import { wisdomAsk, wisdomOffer, wisdomStory, wisdomSupport } from '../pages';

/** Keep a story, skill or lesson. Private until the person shares it from the Wisdom tab. */
export function StoryScreen() {
  const page = wisdomStory;
  const w = usePageWords(page);
  const go = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<CapsuleKind>('social');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  useField(page, 'title', title, (v) => setTitle(String(v)));
  useField(page, 'body', body, (v) => setBody(String(v)));
  useField(page, 'kind', kind, (v) => setKind(String(v) as CapsuleKind));
  const save = async () => {
    try {
      await keepCapsule({ title: title.trim(), body: body.trim(), kind, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) });
      go('wisdom.index', {}, { replace: true });
    } catch {
      setError(w('failed'));
    }
  };
  useAction(page, 'save', save);
  return (
    <Screen title={w('heading')} subtitle={w('intro')} back>
      <Card>
        <El page={page} id="title"><Field label={w('title')} value={title} onChangeText={setTitle} maxLength={120} /></El>
        <El page={page} id="body"><Field label={w('body')} value={body} onChangeText={setBody} big maxLength={6000} /></El>
        <El page={page} id="kind"><ChoiceChips label={w('kind')} options={CAPSULE_KINDS.map((k) => ({ value: k, label: w(k) }))} value={kind} onChange={(v) => setKind(v as CapsuleKind)} /></El>
        <Field label={w('tags')} value={tags} onChangeText={setTags} />
        <ErrorText>{error}</ErrorText>
        <El page={page} id="save"><Button label={w('save')} onPress={save} disabled={title.trim().length < 2 || body.trim().length < 10} /></El>
      </Card>
    </Screen>
  );
}

/** Offer to teach: mentoring, a workshop or freelance work. */
export function OfferScreen() {
  const page = wisdomOffer;
  const w = usePageWords(page);
  const go = useNavigate();
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState('');
  const [kind, setKind] = useState<OfferKind>('mentoring');
  const [mode, setMode] = useState<OfferMode>('volunteer');
  const [domain, setDomain] = useState<CapsuleKind>('professional');
  const [price, setPrice] = useState('');
  const [availability, setAvailability] = useState('');
  const [error, setError] = useState<string | null>(null);
  useField(page, 'title', title, (v) => setTitle(String(v)));
  useField(page, 'about', about, (v) => setAbout(String(v)));
  useField(page, 'kind', kind, (v) => setKind(String(v) as OfferKind));
  const save = async () => {
    try {
      await createOffer({ title: title.trim(), about: about.trim() || undefined, kind, mode, availability: availability.trim() || undefined, domain, ...(mode !== 'volunteer' && price.trim() ? { price_note: price.trim() } : {}) });
      go('wisdom.index', {}, { replace: true });
    } catch {
      setError(w('failed'));
    }
  };
  useAction(page, 'save', save);
  return (
    <Screen title={w('heading')} subtitle={w('intro')} back>
      <Card>
        <El page={page} id="title"><Field label={w('title')} value={title} onChangeText={setTitle} maxLength={120} /></El>
        <El page={page} id="about"><Field label={w('about')} value={about} onChangeText={setAbout} big maxLength={1000} /></El>
        <El page={page} id="kind"><ChoiceChips label={w('kind')} options={OFFER_KINDS.filter((k) => k !== 'freelance').map((k) => ({ value: k, label: w(k) }))} value={kind} onChange={(v) => setKind(v as OfferKind)} /></El>
        <Field label={w('availability')} value={availability} onChangeText={setAvailability} maxLength={200} />
        <ChoiceChips label={w('domain')} options={CAPSULE_KINDS.map((d) => ({ value: d, label: w(`kind_${d}`) }))} value={domain} onChange={(v) => setDomain(v as CapsuleKind)} />
        <ChoiceChips label={w('mode')} options={OFFER_MODES.map((m) => ({ value: m, label: w(m) }))} value={mode} onChange={(v) => setMode(v as OfferMode)} />
        {mode !== 'volunteer' ? <Field label={w('priceNote')} value={price} onChangeText={setPrice} maxLength={120} /> : null}
        <ErrorText>{error}</ErrorText>
        <El page={page} id="save"><Button label={w('save')} onPress={save} disabled={title.trim().length < 2} /></El>
      </Card>
    </Screen>
  );
}

/** Say what you want to learn. A learner under 40 confirms they are 15 or older first. */
export function AskScreen() {
  const page = wisdomAsk;
  const w = usePageWords(page);
  const go = useNavigate();
  const [topic, setTopic] = useState('');
  const [about, setAbout] = useState('');
  const [needAge, setNeedAge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useField(page, 'topic', topic, (v) => setTopic(String(v)));
  useField(page, 'about', about, (v) => setAbout(String(v)));
  const post = async () => {
    try {
      await createRequest({ topic: topic.trim(), about: about.trim() || undefined });
      go('wisdom.index', {}, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'confirm_age_15') setNeedAge(true);
      else setError(w('failed'));
    }
  };
  const confirmAge = async () => {
    try {
      await putOnboarding('learn', { age_15_plus: true });
      setNeedAge(false);
      await post();
    } catch {
      setError(w('failed'));
    }
  };
  useAction(page, 'save', post);
  return (
    <Screen title={w('heading')} subtitle={w('intro')} back>
      <Card>
        <El page={page} id="topic"><Field label={w('topic')} value={topic} onChangeText={setTopic} maxLength={120} /></El>
        <El page={page} id="about"><Field label={w('about')} value={about} onChangeText={setAbout} big maxLength={1000} /></El>
        {needAge ? <Notice text={w('confirmAge')} tone="warn" icon="alert-circle-outline" /> : null}
        <ErrorText>{error}</ErrorText>
        <View style={{ height: space.sm }} />
        <El page={page} id="save"><Button label={needAge ? w('iAm15') : w('save')} onPress={needAge ? confirmAge : post} disabled={topic.trim().length < 2} /></El>
      </Card>
    </Screen>
  );
}

/** An older person asks the next generation for a hand. Younger people can offer; the person decides who to say yes to. */
export function SupportScreen() {
  const page = wisdomSupport;
  const w = usePageWords(page);
  const go = useNavigate();
  const [topic, setTopic] = useState('');
  const [about, setAbout] = useState('');
  const [error, setError] = useState<string | null>(null);
  useField(page, 'topic', topic, (v) => setTopic(String(v)));
  useField(page, 'about', about, (v) => setAbout(String(v)));
  const post = async () => {
    try {
      await createRequest({ topic: topic.trim(), about: about.trim() || undefined, kind: 'support' });
      go('wisdom.index', {}, { replace: true });
    } catch {
      setError(w('failed'));
    }
  };
  useAction(page, 'save', post);
  return (
    <Screen title={w('heading')} subtitle={w('intro')} back>
      <Card>
        <El page={page} id="topic"><Field label={w('topic')} value={topic} onChangeText={setTopic} maxLength={120} /></El>
        <El page={page} id="about"><Field label={w('about')} value={about} onChangeText={setAbout} big maxLength={1000} /></El>
        <ErrorText>{error}</ErrorText>
        <View style={{ height: space.sm }} />
        <El page={page} id="save"><Button label={w('save')} onPress={() => void post()} disabled={topic.trim().length < 2} /></El>
      </Card>
    </Screen>
  );
}

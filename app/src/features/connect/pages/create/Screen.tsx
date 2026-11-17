import { useFocusLive } from '../../../../core/useFocusLive';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { type CommunityKind } from '../../../../api/communities';
import { ApiError } from '../../../../api/client';
import { createFromRequest, getExperience, getMyRequests, requestCommunity, type Audience, type Circle, type CommunityRequest, type Experience } from '../../../../api/communityRules';
import { Bar, Notice, Panel, Pill, Section } from '../../../../components/blocks';
import { Button, ErrorText, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { useT } from '../../../../i18n';
import { RequestWizard, type RequestDraft } from '../../RequestWizard';
import { connectCreate as page } from '../../pages';

const KINDS: CommunityKind[] = ['apartment', 'block', 'neighbourhood', 'club', 'other'];
const CIRCLES: Circle[] = ['origin', 'faith', 'place', 'life', 'interest'];
const AUDIENCES: Audience[] = ['all', 'men', 'women'];

// Ask to start a community. Communities are few and curated: a person with a little experience sends a request, the Interchange team approves it, and then the person creates it here.
export default function CreateCommunity() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const [exp, setExp] = useState<Experience | null>(null);
  const [reqs, setReqs] = useState<CommunityRequest[] | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CommunityKind>('neighbourhood');
  const [area, setArea] = useState('');
  const [about, setAbout] = useState('');
  const [why, setWhy] = useState('');
  const [circle, setCircle] = useState<Circle>('life');
  const [audience, setAudience] = useState<Audience>('all');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getExperience().then(setExp).catch(() => setExp(null));
    getMyRequests().then(setReqs).catch(() => setReqs([]));
  }, []);
  useFocusLive(
    useCallback(() => {
      if (status === 'in') load();
    }, [status, load])
  );

  const send = async (draft?: RequestDraft) => {
    if (busy) return;
    const n = (draft?.name ?? name).trim();
    if (n.length < 2) return setError(w('err_need_name'));
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      const k = draft?.kind ?? kind;
      const a = (draft?.area ?? area).trim();
      await requestCommunity({ name: n, kind: k, circle: draft?.circle ?? circle, audience: draft?.audience ?? audience, ...(a ? { area_name: a } : {}), ...(about.trim() ? { description: about.trim() } : {}), ...(why.trim() ? { why: why.trim() } : {}), ...(draft?.product.trim() ? { product: draft.product.trim() } : {}), ...(draft?.meeting.trim() ? { meeting: draft.meeting.trim() } : {}) });
      setNote(w('req_sent'));
      load();
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'already_open' ? w('err_already_open') : w('err_failed'));
    } finally {
      setBusy(false);
    }
  };

  const make = async (r: CommunityRequest) => {
    setError(null);
    try {
      const c = await createFromRequest(r.id);
      go('community.home', { id: c.id }, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'community_limit' ? w('err_limit') : w('err_failed'));
    }
  };

  useField(page, 'name', name, (v) => setName(String(v)));
  useField(page, 'kind', kind, (v) => setKind(KINDS.includes(v as CommunityKind) ? (v as CommunityKind) : 'other'));
  useField(page, 'area', area, (v) => setArea(String(v)));
  useField(page, 'about', about, (v) => setAbout(String(v)));
  useField(page, 'why', why, (v) => setWhy(String(v)));
  useField(page, 'circle', circle, (v) => setCircle(CIRCLES.includes(v as Circle) ? (v as Circle) : 'life'));
  useField(page, 'audience', audience, (v) => setAudience(AUDIENCES.includes(v as Audience) ? (v as Audience) : 'all'));
  useAction(page, 'createButton', send);
  useAction(page, 'reviewLink', () => go('connect.review'));

  const open = (reqs ?? []).find((r) => r.status === 'pending' || r.status === 'approved');
  const canAsk = !!exp?.eligible && !open;
  const stWord = (s: CommunityRequest['status']) => w(`st_${s}`);

  return (
    <Screen title={w('createTitle')} subtitle={w('createIntro')} back>
      <ErrorText>{error}</ErrorText>
      {note ? <Notice text={note} /> : null}

      {exp ? (
        <Section title={w('exp_title')}>
          <Panel>
            {exp.leads > 0 || exp.is_admin ? (
              <Text style={[type.body, { color: colors.ink }]}>{w('exp_lead')}</Text>
            ) : (
              <View style={{ gap: space.sm }}>
                <Text style={[type.small, { color: colors.ink }]}>{w('exp_days', { n: Math.min(exp.days_member, exp.need_days), need: exp.need_days })}</Text>
                <Bar value={exp.days_member / exp.need_days} />
                <Text style={[type.small, { color: colors.ink }]}>{w('exp_events', { n: Math.min(exp.events_attended, exp.need_events), need: exp.need_events })}</Text>
                <Bar value={exp.events_attended / exp.need_events} />
              </View>
            )}
          </Panel>
          {!exp.eligible ? <Notice tone="warn" text={w('not_eligible')} /> : null}
        </Section>
      ) : null}

      {(reqs ?? []).length ? (
        <Section title={w('my_requests')}>
          {(reqs ?? []).map((r) => (
            <Panel key={r.id} tone={r.status === 'approved' ? 'soft' : undefined}>
              <Text style={[type.h2, { color: colors.ink }]}>{r.name}</Text>
              <Text style={[type.small, { color: colors.muted, marginBottom: space.xs }]}>{w(`circle_${r.circle}`)} · {w(`audience_${r.audience}`)}</Text>
              <View style={{ marginVertical: space.xs }}><Pill text={stWord(r.status)} tone={r.status === 'declined' ? 'warn' : r.status === 'pending' ? 'quiet' : 'soft'} /></View>
              {r.note ? <Text style={[type.small, { color: colors.muted }]}>{r.note}</Text> : null}
              {r.status === 'approved' ? <View style={{ marginTop: space.sm }}><Button label={w('create_now')} icon="checkmark" onPress={() => void make(r)} /></View> : null}
              {r.status === 'used' && r.community_id ? <View style={{ marginTop: space.sm }}><Button label={r.name} kind="plain" onPress={() => go('community.home', { id: r.community_id as string })} /></View> : null}
            </Panel>
          ))}
        </Section>
      ) : null}

      {canAsk ? (
        <El page={page} id="createButton">
          <RequestWizard w={w} t={t} busy={busy} error={null} onSend={(d) => void send(d)} />
        </El>
      ) : null}

      {exp?.is_admin ? (
        <View style={{ marginTop: space.lg }}>
          <El page={page} id="reviewLink"><Button label={w('review_link')} kind="plain" icon="shield-checkmark-outline" onPress={() => go('connect.review')} /></El>
        </View>
      ) : null}
    </Screen>
  );
}

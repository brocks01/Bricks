import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ApiError } from '../../../api/client';
import {
  adminReports, blockPerson, fileReport, myBlocks, myReports, resolveReport, unblockPerson,
  type Report, type ReportKind, type ReportReason, type ResolveAction,
} from '../../../api/safety';
import { Notice } from '../../../components/blocks';
import { Body, Button, Card, ChoiceChips, ErrorText, Field, Row, Screen } from '../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { space } from '../../../theme/tokens';
import { safetyAdmin, safetyBlock, safetyIndex, safetyReport } from '../pages';

const KINDS: ReportKind[] = ['capsule', 'offer', 'request', 'message', 'community', 'event', 'person'];
const REASONS: ReportReason[] = ['unsafe', 'unkind', 'spam', 'false_experience', 'other'];
const reasonWord: Record<ReportReason, string> = { unsafe: 'reason_unsafe', unkind: 'reason_unkind', spam: 'reason_spam', false_experience: 'reason_false', other: 'reason_other' };

/** File a report: what, why, and anything to add. Opened from the thing itself (kind and id prefilled) or by hand. */
export function ReportScreen() {
  const page = safetyReport;
  const w = usePageWords(page);
  const go = useNavigate();
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const fixed = !!params.id;
  const [kind, setKind] = useState<ReportKind>(KINDS.includes(params.kind as ReportKind) ? (params.kind as ReportKind) : 'capsule');
  const [target, setTarget] = useState(params.id ?? '');
  const [reason, setReason] = useState<ReportReason>('unsafe');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useField(page, 'kind', kind, (v) => setKind(v as ReportKind));
  useField(page, 'target', target, (v) => setTarget(String(v)));
  useField(page, 'reason', reason, (v) => setReason(v as ReportReason));
  useField(page, 'note', note, (v) => setNote(String(v)));
  const send = useCallback(async () => {
    setError(null);
    try {
      const r = await fileReport({ target_kind: kind, target_id: target.trim(), reason, note: note.trim() || undefined });
      setSaid(r.status === 'already_reported' ? w('already') : w('thanks'));
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'already_reported' ? w('already') : w('failed'));
    }
  }, [kind, target, reason, note, w]);
  useAction(page, 'send', send);
  if (sent) {
    return (
      <Screen title={w('heading')} back>
        <Notice text={said ?? w('thanks')} icon="shield-checkmark-outline" />
        <View style={{ height: space.md }} />
        <Button label={w('heading')} onPress={() => go('safety.index', {}, { replace: true })} kind="plain" />
      </Screen>
    );
  }
  return (
    <Screen title={w('heading')} subtitle={w('intro')} back>
      <Card>
        <El page={page} id="kind"><ChoiceChips label={w('kind')} options={KINDS.map((k) => ({ value: k, label: w(`kind_${k}`) }))} value={kind} onChange={(v) => setKind(v as ReportKind)} /></El>
        {fixed ? null : <El page={page} id="target"><Field label={w('target')} value={target} onChangeText={setTarget} placeholder={w('targetHint')} /></El>}
        <El page={page} id="reason"><ChoiceChips label={w('reason')} options={REASONS.map((r) => ({ value: r, label: w(reasonWord[r]) }))} value={reason} onChange={(v) => setReason(v as ReportReason)} /></El>
        <El page={page} id="note"><Field label={w('note')} value={note} onChangeText={setNote} big maxLength={500} /></El>
        <ErrorText>{error}</ErrorText>
        <El page={page} id="send"><Button label={w('send')} onPress={() => void send()} disabled={target.trim().length < 1} /></El>
      </Card>
    </Screen>
  );
}

/** Block a person: the two stay apart everywhere, quietly, undoable. */
export function BlockScreen() {
  const page = safetyBlock;
  const w = usePageWords(page);
  const go = useNavigate();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const [person, setPerson] = useState(params.id ?? '');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useField(page, 'person', person, (v) => setPerson(String(v)));
  const confirm = useCallback(async () => {
    setError(null);
    try {
      await blockPerson(person.trim());
      setDone(true);
    } catch {
      setError(w('failed'));
    }
  }, [person, w]);
  useAction(page, 'confirm', confirm);
  if (done) {
    return (
      <Screen title={w('heading')} back>
        <Notice text={w('blockedDone')} icon="person-remove-outline" />
        <View style={{ height: space.md }} />
        <Button label={w('heading')} onPress={() => go('safety.index', {}, { replace: true })} kind="plain" />
      </Screen>
    );
  }
  return (
    <Screen title={w('heading')} back>
      <Card>
        <El page={page} id="blockIntro"><Body>{w('blockIntro')}</Body></El>
        {params.id ? null : <El page={page} id="person"><Field label={w('person')} value={person} onChangeText={setPerson} /></El>}
        <ErrorText>{error}</ErrorText>
        <View style={{ height: space.sm }} />
        <El page={page} id="confirm"><Button label={w('confirmBlock')} kind="danger" onPress={() => void confirm()} disabled={person.trim().length < 1} /></El>
      </Card>
    </Screen>
  );
}

/** My reports and the people I have blocked; admins also get the way into the review. */
export function SafetyIndexScreen() {
  const page = safetyIndex;
  const w = usePageWords(page);
  const go = useNavigate();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [blocks, setBlocks] = useState<{ person_id: string; name: string }[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    const mineAndBlocks = Promise.all([myReports(), myBlocks()])
      .then(([mine, blocked]) => {
        setReports(mine);
        setBlocks(blocked);
      })
      .catch(() => setError(w('failed')));
    adminReports('open')
      .then(() => setIsAdmin(true))
      .catch((e: unknown) => setIsAdmin(!(e instanceof ApiError && e.code === 'admin_only')));
    return mineAndBlocks;
  }, [w]);
  useEffect(() => { load(); }, [load]);
  const unblock = async (id: string) => {
    try {
      await unblockPerson(id);
      setMsg(w('unblocked'));
      await load();
    } catch {
      setError(w('failed'));
    }
  };
  useAction(page, 'reportAction', () => go('safety.report', {}));
  useAction(page, 'adminRow', () => go('safety.admin', {}));
  return (
    <Screen title={w('heading')} subtitle={w('intro')}>
      <Card title={w('myReports')}>
        {reports === null ? null : reports.length === 0 ? <Body muted>{w('noReports')}</Body> : reports.map((r) => (
          <View key={r.id} style={{ marginBottom: space.sm }}>
            <Body>{`${w(`kind_${r.target_kind}`)} · ${w(reasonWord[r.reason])} · ${w(`status_${r.status}`)}`}</Body>
            <Body muted>{w('reportedOn', { date: r.created_at.slice(0, 10) })}</Body>
          </View>
        ))}
        <ErrorText>{error}</ErrorText>
        <El page={page} id="reportAction"><Button label={w('reportAction')} onPress={() => go('safety.report', {})} /></El>
      </Card>
      <Card title={w('blockedTitle')}>
        {blocks === null ? null : blocks.length === 0 ? <Body muted>{w('noBlocks')}</Body> : blocks.map((b) => (
          <Row key={b.person_id} icon="person-remove-outline" label={b.name || b.person_id.slice(0, 8)} value={w('unblock')} onPress={() => void unblock(b.person_id)} />
        ))}
        {msg ? <Notice text={msg} icon="checkmark-circle-outline" /> : null}
      </Card>
      {isAdmin ? (
        <Card tint>
          <El page={page} id="adminRow"><Button label={w('adminRow')} kind="plain" onPress={() => go('safety.admin', {})} /></El>
        </Card>
      ) : null}
    </Screen>
  );
}

/** The Wisdom team: open reports, and the three actions. Everyone else is refused by the server. */
export function AdminScreen() {
  const page = safetyAdmin;
  const w = usePageWords(page);
  const [rows, setRows] = useState<Report[] | null>(null);
  const [notAdmin, setNotAdmin] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() =>
    adminReports('open')
      .then((rows) => {
        setRows(rows);
        setNotAdmin(false);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === 'admin_only') setNotAdmin(true);
        else setError(w('failed'));
      }), [w]);
  useEffect(() => { load(); }, [load]);
  const act = async (id: string, action: ResolveAction) => {
    setError(null);
    try {
      const r = await resolveReport(id, action);
      setMsg(w('resolved', { status: w(`status_${r.status}`) }));
      await load();
    } catch {
      setError(w('failed'));
    }
  };
  if (notAdmin) return <Screen title={w('heading')} back><Notice text={w('notAdmin')} tone="warn" /></Screen>;
  return (
    <Screen title={w('heading')} subtitle={w('adminIntro')} back>
      {rows !== null && rows.length === 0 ? <Notice text={w('adminEmpty')} icon="checkmark-circle-outline" /> : null}
      {msg ? <Notice text={msg} icon="checkmark-circle-outline" /> : null}
      <ErrorText>{error}</ErrorText>
      {(rows ?? []).map((r) => (
        <Card key={r.id} title={`${w(`kind_${r.target_kind}`)} · ${w(reasonWord[r.reason])}`}>
          <Body>{r.target_title || r.target_id.slice(0, 8)}</Body>
          {r.note ? <Body muted>{r.note}</Body> : null}
          <Body muted>{`${r.reporter_name ? `${r.reporter_name} · ` : ''}${w('reportedOn', { date: r.created_at.slice(0, 10) })}`}</Body>
          <View style={{ height: space.sm }} />
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <El page={page} id="dismiss"><Button label={w('dismiss')} kind="plain" onPress={() => void act(r.id, 'dismiss')} /></El>
            <El page={page} id="hide"><Button label={w('hide')} kind="plain" onPress={() => void act(r.id, 'hide')} /></El>
            <El page={page} id="suspend"><Button label={w('suspend')} kind="danger" onPress={() => void act(r.id, 'suspend')} /></El>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

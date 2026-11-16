import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  addContribution, addDay, getContributions, getDays, getPresence, removeDay, setPresence,
  getCircleStories, shareStoryToCircle, type CircleDay, type CircleStory, type Contribution, type ContributionKind, type Presence,
} from '../../api/belonging';
import { getMembers } from '../../api/communities';
import { getMyCapsules, type Capsule } from '../../api/wisdom';
import { Empty, Panel, Pill } from '../../components/blocks';
import { Button } from '../../components/ui';
import { colors, radius, space, type } from '../../theme/tokens';

type W = (k: string, vars?: Record<string, string | number>) => string;

const card = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginTop: space.lg, gap: space.sm } as const;
const input = { minHeight: 52, fontSize: 17, color: colors.ink, backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line } as const;
const chip = (on: boolean) => ({ minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.bg, borderWidth: 1, borderColor: on ? colors.accent : colors.line, alignItems: 'center', justifyContent: 'center' } as const);

/** One quiet word for a refusal: never blaming, and the leader is told only that leaders may do it. */
function noteOf(e: unknown, w: W): string {
  return w(e instanceof ApiError && e.code === 'not_a_lead' ? 'daysLeadOnly' : 'belongFailed');
}

/** Our days: what the circle keeps, with the countdown, and (for a leader) the way to add one and take one off. */
export function DaysCard({ cid, canManage, w }: { cid: string; canManage: boolean; w: W }) {
  const [days, setDays] = useState<CircleDay[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [when, setWhen] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { getDays(cid).then(setDays).catch(() => setDays([])); }, [cid]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (busy) return;
    if (name.trim().length < 2) return setError(w('daysNeedName'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(when.trim())) return setError(w('daysNeedDate'));
    setError(null);
    setBusy(true);
    try {
      const made = await addDay(cid, { name: name.trim(), starts_on: when.trim() });
      setNote(w('daysAdded', { name: name.trim() }));
      if (!made.kept) setNote(w('daysTwice'));
      setName(''); setWhen(''); setAdding(false);
      load();
    } catch (e) {
      setError(noteOf(e, w));
    } finally {
      setBusy(false);
    }
  };
  const drop = async (d: CircleDay) => {
    setError(null);
    setNote(null);
    try { await removeDay(cid, d.id); setNote(w('daysRemoved')); load(); }
    catch (e) { setError(noteOf(e, w)); }
  };

  if (days === null) return null;
  const countdown = (n: number) => (n <= 0 ? w('daysToday') : n === 1 ? w('daysTomorrow') : w('daysIn', { n }));
  return (
    <View style={card}>
      <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">{w('daysTitle')}</Text>
      {!days.length ? <Text style={[type.body, { color: colors.muted }]}>{canManage ? w('daysLeadNone') : w('daysNone')}</Text> : null}
      {days.map((d) => (
        <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 }}>
          <View style={{ minWidth: 92, backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingVertical: space.xs, paddingHorizontal: space.sm, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>{countdown(d.days_to_go)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{d.name}</Text>
            {d.tradition ? <Text style={[type.small, { color: colors.muted }]} numberOfLines={2}>{d.tradition}</Text> : null}
          </View>
          {canManage ? <Text accessibilityRole="button" onPress={() => void drop(d)} style={[type.small, { color: colors.danger, fontWeight: '700', minHeight: 44, textAlignVertical: 'center' }]}>{w('daysRemove')}</Text> : null}
        </View>
      ))}
      {error ? <Text style={[type.small, { color: colors.danger, fontWeight: '700' }]}>{error}</Text> : null}
      {note ? <Text style={[type.small, { color: colors.leaf, fontWeight: '700' }]}>{note}</Text> : null}
      {canManage && !adding ? <Button label={w('daysAdd')} kind="plain" icon="add" onPress={() => { setAdding(true); setError(null); setNote(null); }} /> : null}
      {canManage && adding ? (
        <View style={{ gap: space.sm }}>
          <TextInput value={name} onChangeText={setName} placeholder={w('daysName')} placeholderTextColor={colors.muted} accessibilityLabel={w('daysName')} maxLength={80} autoCapitalize="words" style={input} />
          <TextInput value={when} onChangeText={(v) => setWhen(v.trim())} placeholder={w('daysDate')} placeholderTextColor={colors.muted} accessibilityLabel={w('daysDate')} maxLength={10} keyboardType="numbers-and-punctuation" autoCapitalize="none" style={input} />
          <Button label={w('daysKeep')} onPress={() => void save()} disabled={busy} />
          <Button label={w('daysRemove')} kind="plain" onPress={() => { setAdding(false); setError(null); }} />
        </View>
      ) : null}
    </View>
  );
}

/** Our people: who is away right now (only the ones who chose to say so), and my own choice about it. */
export function PeopleCard({ cid, w }: { cid: string; w: W }) {
  const [rows, setRows] = useState<{ id: string; name: string; away?: boolean; away_place?: string | null }[] | null>(null);
  const [me, setMe] = useState<Presence | null>(null);
  const [place, setPlace] = useState('');
  const [share, setShare] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getMembers(cid).then(setRows).catch(() => setRows([]));
    getPresence(cid).then((p) => { setMe(p); setShare(p.share); setPlace(p.place ?? ''); }).catch(() => setMe(null));
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const save = async (status: 'here' | 'away') => {
    if (busy || !me) return;
    setBusy(true);
    setNote(null);
    try {
      const p = await setPresence(cid, status === 'away' ? { status, place: place.trim() || null, share } : { status });
      setMe(p); setShare(p.share);
      setNote(status === 'away' ? w('awaySavedOn') : w('awaySavedOff'));
      load();
    } catch { setNote(w('awaySavedOff')); } finally { setBusy(false); }
  };

  if (me === null || rows === null) return null;
  const away = rows.filter((r) => r.away);
  return (
    <View style={card}>
      <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">{w('peopleTitle')}</Text>
      {!away.length ? <Text style={[type.body, { color: colors.muted }]}>{w('awayNone')}</Text> : null}
      {away.map((r) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}>
          <Ionicons name="person-outline" size={20} color={colors.accent} />
          <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>{r.away_place ? w('awayNowIn', { name: r.name, place: r.away_place }) : w('awayNow', { name: r.name })}</Text>
        </View>
      ))}
      <View style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: space.sm, gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}>
          <Switch value={share} onValueChange={setShare} accessibilityLabel={w('awayShare')} trackColor={{ true: colors.accent }} />
          <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>{w('awayShare')}</Text>
        </View>
        <Text style={[type.small, { color: colors.muted }]}>{w('awayOnlyYou')}</Text>
        {me.status === 'here' ? (
          <View style={{ gap: space.sm }}>
            <TextInput value={place} onChangeText={setPlace} placeholder={w('awayWhere')} placeholderTextColor={colors.muted} accessibilityLabel={w('awayWhere')} maxLength={120} style={input} />
            <Button label={w('iAmAway')} onPress={() => void save('away')} disabled={busy} icon="airplane-outline" />
          </View>
        ) : (
          <Button label={w('iAmBack')} kind="plain" onPress={() => void save('here')} disabled={busy} icon="home-outline" />
        )}
        {note ? <Text style={[type.small, { color: colors.leaf, fontWeight: '700' }]}>{note}</Text> : null}
      </View>
    </View>
  );
}

/** Take part from where you are: a blessing or a message for one of the circle's days, and what the circle has sent. */
export function TakePartCard({ cid, w }: { cid: string; w: W }) {
  const [days, setDays] = useState<CircleDay[]>([]);
  const [day, setDay] = useState<string>('');
  const [kind, setKind] = useState<ContributionKind>('blessing');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Contribution[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getDays(cid).then(setDays).catch(() => setDays([]));
    getContributions(cid, day || undefined).then((r) => setRows(r.contributions)).catch(() => setRows([]));
  }, [cid, day]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (busy) return;
    if (!text.trim()) return setError(w('takeNeedText'));
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      await addContribution(cid, { day_id: day || null, kind, body: text.trim() });
      setText('');
      setNote(w('takeSent'));
      load();
    } catch (e) {
      setError(noteOf(e, w));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={card}>
      <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">{w('takeTitle')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Pressable onPress={() => setDay('')} accessibilityRole="radio" accessibilityState={{ checked: day === '' }} style={chip(day === '')}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: day === '' ? '#FFFFFF' : colors.ink }}>{w('takeCircle')}</Text>
        </Pressable>
        {days.map((d) => (
          <Pressable key={d.id} onPress={() => setDay(d.id)} accessibilityRole="radio" accessibilityState={{ checked: day === d.id }} style={chip(day === d.id)}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: day === d.id ? '#FFFFFF' : colors.ink }}>{d.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[type.small, { color: colors.muted }]}>{w('takeKind')}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {(['blessing', 'message'] as ContributionKind[]).map((k) => (
          <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="radio" accessibilityState={{ checked: kind === k }} style={{ ...chip(kind === k), flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: kind === k ? '#FFFFFF' : colors.ink }}>{w(k === 'blessing' ? 'takeBlessing' : 'takeMessage')}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={text} onChangeText={setText} placeholder={w('takeText')} placeholderTextColor={colors.muted} accessibilityLabel={w('takeText')} multiline maxLength={1000} style={[input, { minHeight: 96, textAlignVertical: 'top', paddingTop: space.sm }]} />
      {error ? <Text style={[type.small, { color: colors.danger, fontWeight: '700' }]}>{error}</Text> : null}
      {note ? <Text style={[type.small, { color: colors.leaf, fontWeight: '700' }]}>{note}</Text> : null}
      <Button label={w('takeSend')} onPress={() => void send()} disabled={busy} icon="send-outline" />
      <Text style={[type.h2, { color: colors.ink, marginTop: space.sm }]} accessibilityRole="header">{w('takeRecent')}</Text>
      {rows === null ? null : !rows.length ? <Empty text={w('takeEmpty')} /> : rows.slice(0, 6).map((c) => (
        <Panel key={c.id}>
          <Text style={[type.body, { color: colors.ink }]}>{c.body}</Text>
          <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>{c.by}{c.created_at ? ` · ${new Date(c.created_at).toLocaleDateString()}` : ''}</Text>
        </Panel>
      ))}
    </View>
  );
}

/** Our stories: the stories members shared into this circle, and the way to share one of mine into it. */
export function StoriesCard({ cid, w }: { cid: string; w: W }) {
  const [rows, setRows] = useState<CircleStory[] | null>(null);
  const [mine, setMine] = useState<Capsule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { getCircleStories(cid).then(setRows).catch(() => setRows([])); }, [cid]);
  useEffect(() => { load(); }, [load]);

  const open = async () => {
    setNote(null);
    setError(null);
    if (mine !== null) return setMine(null);
    try {
      const mineCapsules = await getMyCapsules();
      setMine(mineCapsules);
    } catch { setError(w('storiesMineNone')); }
  };
  const share = async (c: Capsule) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await shareStoryToCircle(c.id, cid); setNote(w('storyShared')); setMine(null); load(); }
    catch (e) { setError(noteOf(e, w)); }
    finally { setBusy(false); }
  };

  if (rows === null) return null;
  return (
    <View style={card}>
      <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">{w('storiesTitle')}</Text>
      {!rows.length ? <Text style={[type.body, { color: colors.muted }]}>{w('storiesNone')}</Text> : null}
      {rows.map((s) => (
        <Panel key={s.id}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{s.title}</Text>
          <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]} numberOfLines={4}>{s.body}</Text>
          <View style={{ marginTop: space.xs }}><Pill text={s.by} tone="quiet" /></View>
        </Panel>
      ))}
      {error ? <Text style={[type.small, { color: colors.danger, fontWeight: '700' }]}>{error}</Text> : null}
      {note ? <Text style={[type.small, { color: colors.leaf, fontWeight: '700' }]}>{note}</Text> : null}
      <Button label={w('storiesShare')} kind="plain" icon="book-outline" onPress={() => void open()} />
      {mine !== null ? (
        !mine.length ? <Text style={[type.body, { color: colors.muted }]}>{w('storiesMineNone')}</Text> : mine.slice(0, 8).map((c) => (
          <Pressable key={c.id} onPress={() => void share(c)} accessibilityRole="button" style={{ minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md }}>
            <Ionicons name="book-outline" size={18} color={colors.accent} />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.ink }} numberOfLines={2}>{c.title}</Text>
            <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
          </Pressable>
        ))
      ) : null}
    </View>
  );
}

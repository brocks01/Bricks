import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { addContribution, getContributions, type ContributionKind, type ContributionsData } from '../../../../api/grow';
import { Hero } from '../../../../components/Hero';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Field, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage } from '../../../../i18n';
import { El, usePageData, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { Card, Chips, Stat, num } from '../../ui';
import { growContributions as page } from './page';

const KINDS: ContributionKind[] = ['time', 'skill', 'goods', 'money'];

// My Contributions (sample 11, Grow home card): what the person has given to the communities they belong to, and a form to add one.
// Totals are the person's own entries; they are not verified by anyone yet.
export default function Contributions() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [d, setD] = useState<ContributionsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cid, setCid] = useState('');
  const [kind, setKind] = useState<ContributionKind>('time');
  const [what, setWhat] = useState('');
  const [hours, setHours] = useState('');
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    getContributions().then((x) => {
      setFailed(false);
      setD(x);
      setCid((c) => c || x.my_communities[0]?.id || '');
    }).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);
  const when = (iso: string) => new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });

  const save = useCallback(async () => {
    if (!cid || what.trim().length < 2) return;
    setError(false);
    try {
      await addContribution(cid, kind, what.trim(), num(hours) ?? undefined);
      setAdding(false);
      setWhat('');
      setHours('');
      load();
    } catch {
      setError(true);
    }
  }, [cid, kind, what, hours, load]);

  usePageData(
    page,
    d === null
      ? null
      : {
          values: [
            { label: w('total'), value: String(d.count) },
            { label: w('hours'), value: String(d.hours) },
            { label: w('communities'), value: String(d.communities_count) },
          ],
          images: [],
          lists: [{ label: w('heading'), items: d.recent.map((r) => ({ label: r.description, detail: `${r.community_name} · ${w('kind_' + r.kind)}${r.hours ? ` · ${r.hours} ${w('hours')}` : ''} · ${when(r.created_at)}` })) }],
          actions: d.my_communities.length ? [{ id: 'log', label: w('log'), run: () => setAdding(true) }, ...(adding ? [{ id: 'saveContribution', label: w('save'), run: () => save() }] : [])] : [],
        }
  );

  return (
    <Screen title={w('heading')} back>
      <Hero source={require('../../../../../assets/images/contributions.jpg')} height={150} light={false} />
      <Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>{w('contrib_intro')}</Text>
      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : d === null ? (
        <SkeletonList count={3} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
            <Stat icon="hand-left-outline" n={d.count} label={w('total')} />
            <Stat icon="time-outline" n={d.hours} label={w('hours')} />
            <Stat icon="people-outline" n={d.communities_count} label={w('communities')} />
          </View>
          {d.my_communities.length === 0 ? (
            <Text style={[type.body, { color: colors.muted }]}>{w('noCommunity')}</Text>
          ) : adding ? (
            <View>
              <Text style={[type.small, { color: colors.ink, fontWeight: '700', marginBottom: space.xs }]}>{w('whichCommunity')}</Text>
              <Chips options={d.my_communities.map((c) => ({ id: c.id, label: c.name }))} value={cid} onChange={setCid} />
              <Chips options={KINDS.map((k) => ({ id: k, label: w('kind_' + k) }))} value={kind} onChange={setKind} />
              <Field label={w('whatDid')} value={what} onChangeText={setWhat} maxLength={300} />
              <Field label={w('hoursOpt')} value={hours} onChangeText={setHours} keyboardType="decimal-pad" maxLength={6} />
              {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.sm }]}>{w('failed')}</Text> : null}
              <El page={page} id="saveContribution"><Button label={w('save')} onPress={() => void save()} icon="checkmark" disabled={what.trim().length < 2} /></El>
              <Pressable onPress={() => setAdding(false)} accessibilityRole="button" style={{ alignItems: 'center', padding: space.md }}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>{w('cancel')}</Text></Pressable>
            </View>
          ) : (
            <El page={page} id="log"><Button label={w('log')} onPress={() => setAdding(true)} icon="add" /></El>
          )}
          {d.recent.length ? <Text style={[type.h2, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>{w('recent')}</Text> : null}
          {d.recent.map((r) => (
            <Card key={r.id}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{r.description}</Text>
              <Text style={[type.small, { color: colors.muted }]}>{r.community_name} · {w('kind_' + r.kind)}{r.hours ? ` · ${r.hours} ${w('hours')}` : ''} · {when(r.created_at)}</Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

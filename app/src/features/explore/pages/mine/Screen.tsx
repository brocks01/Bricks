import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getExploreMine, type ExploreItem, type ExploreMine } from '../../../../api/explore';
import { SkeletonList } from '../../../../components/Skeleton';
import { BackScreen } from '../../../../components/BackButton';
import { Button } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { ItemRow } from '../../ui';
import { useToggleSave } from '../../useItems';
import { exploreMine as page } from './page';

type Tab = 'in_progress' | 'completed' | 'saved';

// My Exploration and Saved (sample 10): three tabs and gentle counts. Not scores: nothing here says "behind".
export default function ExploreMineScreen() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const { status } = useStore(sessionStore);
  const [data, setData] = useState<ExploreMine | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('in_progress');
  const load = useCallback(() => {
    getExploreMine()
      .then((x) => {
        setFailed(false);
        setData(x);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);
  const update = useCallback((fn: (i: ExploreItem) => ExploreItem) => setData((d) => (d ? { ...d, in_progress: d.in_progress.map(fn), completed: d.completed.map(fn), saved: d.saved.map(fn) } : d)), []);
  const toggleSave = useToggleSave(update);
  const meta = (i: ExploreItem) => `${w('min', { n: i.minutes })} · ${w(i.format)}`;
  const names: Record<Tab, string> = { in_progress: w('inProgress'), completed: w('completed'), saved: w('savedTab') };
  const empty: Record<Tab, string> = { in_progress: w('nothingInProgress'), completed: w('nothingCompleted'), saved: w('nothingSaved') };
  const items = data ? data[tab] : [];

  usePageData(
    page,
    data === null
      ? null
      : {
          values: [
            { label: w('explored'), value: String(data.milestones.explored) },
            { label: w('finished'), value: String(data.milestones.completed) },
            { label: w('chosen'), value: String(data.milestones.interests) },
            { label: w('heading'), value: names[tab] },
          ],
          images: [],
          lists: [{ label: names[tab], items: items.map((i, n) => ({ label: i.title, detail: i.completed ? w('done') : i.percent > 0 ? `${i.percent}%` : meta(i), actions: [{ id: `open${n + 1}`, label: i.title, run: () => { navigate('explore.item', { id: i.id }); } }] })) }],
          actions: [
            { id: 'inProgress', label: names.in_progress, run: () => setTab('in_progress') },
            { id: 'completed', label: names.completed, run: () => setTab('completed') },
            { id: 'savedTab', label: names.saved, run: () => setTab('saved') },
          ],
        }
  );

  const tabs: { id: Tab; el: 'inProgress' | 'completed' | 'savedTab' }[] = [
    { id: 'in_progress', el: 'inProgress' },
    { id: 'completed', el: 'completed' },
    { id: 'saved', el: 'savedTab' },
  ];
  const counts: { label: string; n: number; icon: keyof typeof Ionicons.glyphMap }[] = data
    ? [
        { label: w('explored'), n: data.milestones.explored, icon: 'compass-outline' },
        { label: w('finished'), n: data.milestones.completed, icon: 'checkmark-circle-outline' },
        { label: w('chosen'), n: data.milestones.interests, icon: 'heart-outline' },
      ]
    : [];
  return (
    <BackScreen title={w('mine')}>
      <El page={page} id="heading"><Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>{w('milestones')}</Text></El>
      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : data === null ? (
        <SkeletonList count={3} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
            {counts.map((c) => (
              <View key={c.label} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
                <Ionicons name={c.icon} size={22} color={colors.accent} />
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{c.n}</Text>
                <Text style={[type.small, { color: colors.muted }]}>{c.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
            {tabs.map((t) => (
              <View key={t.id} style={{ flex: 1 }}>
                <El page={page} id={t.el}>
                  <Pressable onPress={() => setTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }} style={{ minHeight: 44, borderRadius: radius.button, backgroundColor: tab === t.id ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: tab === t.id ? '#FFFFFF' : colors.accent }} numberOfLines={1}>{names[t.id]}</Text>
                  </Pressable>
                </El>
              </View>
            ))}
          </View>
          {items.length ? (
            items.map((i, n) => <ItemRow key={i.id} item={i} i={n} meta={meta(i)} onOpen={() => navigate('explore.item', { id: i.id })} onSave={() => void toggleSave(i)} saveLabel={i.saved ? w('unsave') : w('save')} />)
          ) : (
            <Text style={[type.body, { color: colors.muted }]}>{empty[tab]}</Text>
          )}
        </>
      )}
    </BackScreen>
  );
}

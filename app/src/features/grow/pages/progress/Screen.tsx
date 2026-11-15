import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getProgress, type ProgressData } from '../../../../api/grow';
import { getTree, type Tree } from '../../../../api/nodes';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useT } from '../../../../i18n';
import { usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { WeekBars } from '../../ui';
import '../../treeWords'; // registers the words of the tree
import { TreeView } from '../../TreeView';
import { growProgress as page } from './page';

// My Progress (sample 11, screen 7): a kind overview of what the person has done in Grow, counts and totals only. It never says "behind" and never gives a score.
export default function Progress() {
  const w = usePageWords(page);
  const t = useT();
  const navigate = useNavigate();
  const [tree, setTree] = useState<Tree | null>(null);
  const { status } = useStore(sessionStore);
  const [d, setD] = useState<ProgressData | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    getTree().then(setTree).catch(() => undefined);
    getProgress()
      .then((x) => {
        setFailed(false);
        setD(x);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);

  const rows = d
    ? [
        { icon: 'walk-outline' as const, text: w('p_activity', { n: d.activity.week_minutes }), to: 'grow.activity' as const },
        { icon: 'heart-outline' as const, text: w('p_health', { n: d.health.readings_this_month }), to: 'grow.health' as const },
        { icon: 'flag-outline' as const, text: w('p_aspirations', { done: d.aspirations.done, total: d.aspirations.total }), to: 'grow.aspirations' as const },
        { icon: 'compass-outline' as const, text: w('p_explore', { started: d.explore.started, completed: d.explore.completed }), to: 'explore.mine' as const },
        { icon: 'people-outline' as const, text: w('p_contributions', { n: d.contributions.count, h: d.contributions.hours }), to: 'grow.contributions' as const },
      ]
    : [];

  usePageData(
    page,
    d === null
      ? null
      : {
          values: rows.map((r) => ({ label: r.text, value: '' })),
          images: [],
          lists: [],
          actions: rows.map((r, i) => ({ id: `open${i + 1}`, label: r.text, run: () => { navigate(r.to); } })),
        }
  );

  return (
    <Screen title={w('heading')} subtitle={tree ? t('tree.level', { n: Math.floor(tree.leaves / 10) + 1 }) : undefined}>
      {tree ? <TreeCard tree={tree} /> : null}
      <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink, marginTop: space.lg, marginBottom: space.sm }} accessibilityRole="header">{t('tree.more')}</Text>
      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginVertical: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : d === null ? (
        <SkeletonList count={4} />
      ) : (
        <>
          <WeekBars days={d.activity.days} />
          {rows.map((r) => (
            <Pressable key={r.to} onPress={() => navigate(r.to)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}>
              <Ionicons name={r.icon} size={24} color={colors.accent} />
              <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>{r.text}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
          <Text style={[type.small, { color: colors.accent, textAlign: 'center', marginTop: space.md }]}>{w('keepGoing')}</Text>
        </>
      )}
    </Screen>
  );
}

const AREA_WORD: Record<string, string> = { move: 'tree.area_move', community: 'tree.area_community', give: 'tree.area_give' };

// The tree, the count of leaves with the way to the next level, a line for each branch, and how leaves are earned. Everything comes from the person's real nodes.
function TreeCard({ tree }: { tree: Tree }) {
  const t = useT();
  const areas = tree.nodes.filter((n) => n.type === 'area' && n.parent_id === 'R1');
  const into = tree.leaves % 10;
  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: space.lg, gap: space.md } as const;
  return (
    <View style={{ gap: space.lg }}>
      <View style={card}>
        <TreeView nodes={tree.nodes} label={t('tree.tree_label', { n: tree.leaves })} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontSize: 24, fontWeight: '600', color: colors.ink }}>{tree.leaves} <Text style={{ fontSize: 16, fontWeight: '500', color: colors.muted }}>{t(tree.leaves === 1 ? 'tree.leaf' : 'tree.leaves')}</Text></Text>
          <Text style={{ fontSize: 15, color: colors.muted }}>{t('tree.to_next', { n: 10 - into })}</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 10, now: into }} style={{ height: 8, borderRadius: 999, backgroundColor: '#EDE6DA', overflow: 'hidden' }}>
          <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.leaf, width: `${into * 10}%` }} />
        </View>
        <Text style={{ fontSize: 15, color: colors.muted }}>{tree.leaves === 0 && tree.growing === 0 ? t('tree.empty') : tree.growing > 0 ? `${t('tree.every')} ${t('tree.growing', { n: tree.growing })}` : t('tree.every')}</Text>
      </View>
      {areas.length ? (
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: space.lg }}>
          {areas.map((a, i) => (
            <View key={a.nid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: i < areas.length - 1 ? 1 : 0, borderColor: '#EDE6DA' }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{AREA_WORD[a.key] ? t(AREA_WORD[a.key]) : a.title}</Text>
              <Text style={{ fontSize: 15, color: colors.muted }}>{a.counts.closed ?? 0} {t(a.counts.closed === 1 ? 'tree.leaf' : 'tree.leaves')}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('tree.how')}</Text>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: space.lg }}>
          {['tree.how_walk', 'tree.how_move', 'tree.how_gather', 'tree.how_give'].map((k, i, all) => (
            <Text key={k} style={{ fontSize: 16, color: colors.ink, paddingVertical: 14, borderBottomWidth: i < all.length - 1 ? 1 : 0, borderColor: '#EDE6DA' }}>{t(k)}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getTree, type Tree } from '../../api/nodes';
import { useT } from '../../i18n';
import { colors } from '../../theme/tokens';
import './treeWords';
import { TreeView } from './TreeView';

/**
 * Your tree on Home: the picture, how many leaves and which level, and a button that opens the whole thing (habits, goals, every branch) as its own page.
 * It loads its own data, so Home does not have to know how the tree is built.
 */
export function TreeSummary({ onOpen, refreshKey }: { onOpen: () => void; refreshKey?: number }) {
  const t = useT();
  const [tree, setTree] = useState<Tree | null>(null);
  useEffect(() => {
    getTree().then(setTree).catch(() => setTree(null));
  }, [refreshKey]);
  if (!tree) return null;
  const into = tree.leaves % 10;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('tree.title')}</Text>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, gap: 12 }}>
        <TreeView nodes={tree.nodes} label={t('tree.tree_label', { n: tree.leaves })} level={tree.level} roots={tree.roots.strength} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontSize: 24, fontWeight: '600', color: colors.ink }}>{tree.leaves} <Text style={{ fontSize: 16, fontWeight: '500', color: colors.muted }}>{t(tree.leaves === 1 ? 'tree.leaf' : 'tree.leaves')}</Text></Text>
          <Text style={{ fontSize: 15, color: colors.muted }}>{t('tree.level', { n: tree.level })} · {t('tree.to_next', { n: 10 - into })}</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 10, now: into }} style={{ height: 8, borderRadius: 999, backgroundColor: '#EDE6DA', overflow: 'hidden' }}>
          <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.leaf, width: `${into * 10}%` }} />
        </View>
        <Pressable onPress={onOpen} accessibilityRole="button" style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#CFC6B6', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}>{t('tree.see_all')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

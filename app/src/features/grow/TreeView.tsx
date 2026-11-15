import { View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import type { TreeNode } from '../../api/nodes';
import { colors } from '../../theme/tokens';
import { GROUND, layoutTree } from './treeLayout';

/**
 * The person's tree, drawn from their real nodes. The trunk is the root and gets thicker with the level; every area is a branch, thicker the steadier the habits on it
 * are; every piece of work is a leaf (green when closed, an outline while it is still growing); the roots under the ground are their health.
 * The drawing rules are in treeLayout.ts, so they can be tested without a screen.
 */
const GREEN = colors.leaf;
const LEAF = 'M0 0 C 5 -9, 14 -9, 19 0 C 14 9, 5 9, 0 0 Z';

export function TreeView({ nodes, label, level, roots }: { nodes: TreeNode[]; label: string; level: number; roots: number }) {
  const lay = layoutTree(nodes, { level, roots });
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ height: 300, borderRadius: 12, backgroundColor: '#F1EEE6', overflow: 'hidden', alignItems: 'center' }}>
      <Svg width={300} height={300} viewBox="0 0 300 300">
        <Rect x={0} y={GROUND} width={300} height={300 - GROUND} fill="#E7DDCB" />
        <Path d={`M0 ${GROUND} H300`} stroke="#CBBFA8" strokeWidth={2} />
        <G fill="none" stroke="#8A6A4E" strokeLinecap="round">
          {lay.roots.map((r) => (
            <Path key={r.key} d={r.d} strokeWidth={r.width} />
          ))}
        </G>
        <G fill="none" stroke="#7A5C44" strokeLinecap="round">
          <Path d={lay.trunk} strokeWidth={lay.trunkWidth} />
          {lay.branches.map((b) => (
            <Path key={b.key} d={b.d} strokeWidth={b.width} />
          ))}
          {lay.leaves.map((l) => (
            <Path key={`s${l.key}`} d={l.stem} strokeWidth={1} />
          ))}
        </G>
        {lay.leaves.map((l) => (
          <G key={l.key} transform={`translate(${l.x} ${l.y}) rotate(${l.rot})`}>
            <Path d={LEAF} fill={l.grown ? GREEN : 'none'} stroke={l.grown ? '#245A40' : GREEN} strokeWidth={l.grown ? 0.8 : 1.4} opacity={l.grown ? 1 : 0.55} />
          </G>
        ))}
      </Svg>
    </View>
  );
}

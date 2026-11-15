import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import type { TreeNode } from '../../api/nodes';
import { colors } from '../../theme/tokens';
import { layoutTree } from './treeLayout';

/**
 * The person's tree, drawn from their real nodes: the trunk is the root, every area is a branch, and every piece of work on a branch is a leaf.
 * A closed piece of work is a green leaf; work still open is an outline that has not grown yet. More nodes make a denser tree.
 * The drawing rules (where a branch goes and where each leaf sits) are in treeLayout.ts, so they can be tested without a screen.
 */
const GREEN = colors.leaf;
const LEAF = 'M0 0 C 5 -9, 14 -9, 19 0 C 14 9, 5 9, 0 0 Z';

export function TreeView({ nodes, label }: { nodes: TreeNode[]; label: string }) {
  const lay = layoutTree(nodes);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ height: 236, borderRadius: 12, backgroundColor: '#F1EEE6', overflow: 'hidden', alignItems: 'center' }}>
      <Svg width={300} height={236} viewBox="0 0 300 236">
        <Path d="M40 230 H260" stroke="#CBD3E0" strokeWidth={2} strokeLinecap="round" />
        <G fill="none" stroke="#7A5C44" strokeLinecap="round">
          <Path d={lay.trunk} strokeWidth={7} />
          {lay.branches.map((b) => (
            <Path key={b.key} d={b.d} strokeWidth={b.width} />
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

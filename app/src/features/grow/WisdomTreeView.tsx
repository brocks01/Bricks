import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import { radius } from '../../theme/tokens';
import { GROUND_Y, LEAF_PATH, layoutWisdomTree, VIEW } from './wisdomTree';

/**
 * The Tree of Wisdom, drawn large: a rain tree that starts as bare branches and carries one leaf for every event the person showed up to.
 * A square that fills the width, one simple leaf shape in three close greens, a soft ground line, a calm background, no words on the picture.
 * When the count rises while the person is looking, the newest leaf grows in gently (not at all when the device asks for reduced motion).
 * The shapes come from wisdomTree.ts, so they can be checked without a screen.
 */
export const TREE_COLOURS = {
  sky: '#F3F7EF',
  ground: '#DCE8CF',
  bark: '#6B4A32',
  greens: ['#3E9455', '#58A95F', '#2F7D4F'] as const,
};

export function WisdomTree({ leaves, label }: { leaves: number; label: string }) {
  const lay = layoutWisdomTree(leaves);
  const shown = lay.leaves.length;
  const before = useRef(shown);
  const grow = useState(() => new Animated.Value(1))[0];
  const [still, setStill] = useState(true); // until the device has answered, nothing moves
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => undefined);
  }, []);
  useEffect(() => {
    const rose = shown > before.current;
    before.current = shown;
    if (!rose || still) return;
    grow.setValue(0);
    Animated.timing(grow, { toValue: 1, duration: 900, useNativeDriver: false }).start();
  }, [shown, still, grow]);
  const newest = lay.leaves[shown - 1];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: '100%', aspectRatio: 1, borderRadius: radius.card, backgroundColor: TREE_COLOURS.sky, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW} ${VIEW}`}>
        <Ellipse cx={VIEW / 2} cy={GROUND_Y + 2} rx={150} ry={12} fill={TREE_COLOURS.ground} />
        <G fill="none" stroke={TREE_COLOURS.bark} strokeLinecap="round">
          {lay.wood.map((w, i) => (
            <Path key={i} d={w.d} strokeWidth={w.w} />
          ))}
        </G>
        <Path d={lay.trunk} fill={TREE_COLOURS.bark} />
        {lay.leaves.slice(0, -1).map((p) => (
          <Path key={p.n} d={LEAF_PATH} fill={TREE_COLOURS.greens[p.tone]} transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`} />
        ))}
      </Svg>
      {newest ? (
        // The newest leaf has a layer of its own, so it can fade in without redrawing the tree.
        <Animated.View style={{ pointerEvents: 'none', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: grow }}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW} ${VIEW}`}>
            <Path d={LEAF_PATH} fill={TREE_COLOURS.greens[newest.tone]} transform={`translate(${newest.x} ${newest.y}) rotate(${newest.angle})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

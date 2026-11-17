import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useStore } from '../../core/store';
import { TREE_COLOURS } from './WisdomTreeView';
import { layoutWisdomTree } from './wisdomTree';
import { wisdomStore } from './wisdomStore';

/**
 * The person's own Tree of Wisdom in miniature, for the round button in the header: the same tree from the same layout, with the trunk and
 * the main limbs drawn thicker and each leaf as a small dot in its real place, so the little picture is recognisably the big one.
 * It pulses once, gently, when the count rises while the person is looking (never when the device asks for reduced motion).
 */
const BOX = '18 34 364 350'; // the part of the big picture the tree fills

export function MiniTree({ size = 40 }: { size?: number }) {
  const { leaves } = useStore(wisdomStore);
  const lay = layoutWisdomTree(leaves ?? 0);
  const before = useRef(leaves);
  const pulse = useState(() => new Animated.Value(1))[0];
  const [still, setStill] = useState(true);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => undefined);
  }, []);
  useEffect(() => {
    const rose = before.current !== null && leaves !== null && leaves > before.current;
    before.current = leaves;
    if (!rose || still) return;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.22, duration: 350, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: false }),
    ]).start();
  }, [leaves, still, pulse]);
  return (
    <Animated.View accessible={false} style={{ width: size, height: size, transform: [{ scale: pulse }] }}>
      <Svg width={size} height={size} viewBox={BOX}>
        <G fill="none" stroke={TREE_COLOURS.bark} strokeLinecap="round">
          {lay.wood.filter((w) => w.gen < 3).map((w, i) => (
            <Path key={i} d={w.d} strokeWidth={w.gen === 1 ? 17 : 10} />
          ))}
        </G>
        <Path d={lay.trunk} fill={TREE_COLOURS.bark} stroke={TREE_COLOURS.bark} strokeWidth={10} strokeLinejoin="round" />
        {lay.leaves.map((p) => (
          <Circle key={p.n} cx={p.cx} cy={p.cy} r={15} fill={TREE_COLOURS.greens[p.tone]} />
        ))}
      </Svg>
    </Animated.View>
  );
}

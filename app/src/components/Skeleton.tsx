import { useEffect, useState } from 'react';
import { Animated, DimensionValue, View, ViewStyle } from 'react-native';
import { colors, radius, space } from '../theme/tokens';

// ONE shared loading look for the whole app. Use it instead of a blank screen or a bare spinner:
//   <Bone w={120} h={16} />            a grey bar or block (text line, picture, button)
//   <SkeletonCard />                   a card with a picture and two lines, as in the lists
//   <SkeletonList count={3} />         several cards
//   <SkeletonPage banner />            a whole page: optional banner picture, a title row, a row of tiles, then cards
// Everything pulses together, so a page that is loading looks calm, not broken.

const BONE = colors.bone;

function usePulse() {
  const v = useState(() => new Animated.Value(0.55))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(v, { toValue: 0.55, duration: 700, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

/** A single grey bar or block that pulses. Give it a width and height (numbers or percentages). */
export function Bone({ w = '100%', h = 14, r = 8, style }: { w?: DimensionValue; h?: number; r?: number; style?: ViewStyle }) {
  const opacity = usePulse();
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: w, height: h, borderRadius: r, backgroundColor: BONE, opacity }, style]} />;
}

/** A card with a picture on the left and two lines of text, like a community or an event in a list. */
export function SkeletonCard({ picture = 64 }: { picture?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.sm, marginBottom: space.sm }}>
      <Bone w={picture} h={picture} r={14} />
      <View style={{ flex: 1, gap: 10 }}>
        <Bone w="70%" h={16} />
        <Bone w="45%" h={12} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3, picture }: { count?: number; picture?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} picture={picture} />)}
    </View>
  );
}

/** A whole page while it loads: optional banner, a heading line, a row of four tiles, and a few cards. */
export function SkeletonPage({ banner = false, tiles = false, cards = 3 }: { banner?: boolean; tiles?: boolean; cards?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading">
      {banner ? <Bone h={160} r={radius.card} style={{ marginBottom: space.md }} /> : null}
      <Bone w="55%" h={22} style={{ marginBottom: space.md }} />
      {tiles ? (
        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
          {[0, 1, 2, 3].map((i) => <Bone key={i} w="23%" h={64} r={radius.button} />)}
        </View>
      ) : null}
      {Array.from({ length: cards }, (_, i) => <SkeletonCard key={i} />)}
    </View>
  );
}

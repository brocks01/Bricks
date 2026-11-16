// Decorative pictures for onboarding: a scatter of tilted icon tiles (what people do together here) and a short confetti burst. Both are still or one-shot, never looping.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors, tints } from '../../theme/tokens';

type Icon = keyof typeof Ionicons.glyphMap;
const TILES: { icon: Icon; bg: string; fg: string; size: number; left: string; top: number; turn: string }[] = [
  { icon: 'walk-outline', bg: colors.accent, fg: colors.card, size: 64, left: '4%', top: 18, turn: '-8deg' },
  { icon: 'restaurant-outline', bg: colors.gold, fg: colors.card, size: 58, left: '24%', top: 0, turn: '6deg' },
  { icon: 'musical-notes-outline', bg: tints.lilac, fg: colors.accent, size: 60, left: '45%', top: 22, turn: '-5deg' },
  { icon: 'chatbubbles-outline', bg: tints.sky, fg: colors.accent, size: 66, left: '66%', top: 2, turn: '9deg' },
  { icon: 'leaf-outline', bg: tints.lime, fg: colors.accent, size: 56, left: '84%', top: 28, turn: '-6deg' },
  { icon: 'heart-outline', bg: colors.accentSoft, fg: colors.accent, size: 54, left: '14%', top: 84, turn: '7deg' },
  { icon: 'bulb-outline', bg: tints.sand, fg: colors.gold, size: 62, left: '38%', top: 80, turn: '-9deg' },
  { icon: 'people-outline', bg: colors.accent, fg: colors.card, size: 58, left: '62%', top: 86, turn: '5deg' },
];

/** Tilted icon tiles in our colours: the first thing a new person sees. Decorative only (hidden from screen readers). */
export function Collage({ height = 150 }: { height?: number }) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height, marginBottom: 8 }}>
      {TILES.map((t, i) => (
        <View key={i} style={{ position: 'absolute', left: t.left as never, top: t.top * (height / 150), width: t.size, height: t.size, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg, borderWidth: 3, borderColor: colors.card, transform: [{ rotate: t.turn }], shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
          <Ionicons name={t.icon} size={t.size * 0.5} color={t.fg} />
        </View>
      ))}
    </View>
  );
}

const PIECES = Array.from({ length: 22 }, (_, i) => ({ x: (i * 37) % 100, d: (i % 7) * 90, c: [colors.accent, colors.gold, tints.lilac, tints.sky, colors.accentLine][i % 5], s: 8 + (i % 4) * 3, r: (i % 2 ? 1 : -1) * (120 + i * 17) }));

/** One short burst of confetti falling over the welcome screen, then nothing. */
export function Confetti() {
  const v = useRef(PIECES.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(40, v.map((a, i) => Animated.timing(a, { toValue: 1, duration: 1500 + (i % 5) * 160, useNativeDriver: true }))).start();
  }, [v]);
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 360, overflow: 'hidden' }}>
      {PIECES.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: `${p.x}%` as never, top: 0, width: p.s, height: p.s * 1.6, borderRadius: 2, backgroundColor: p.c,
            opacity: v[i].interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateY: v[i].interpolate({ inputRange: [0, 1], outputRange: [-20, 340] }) }, { rotate: v[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.r}deg`] }) }],
          }}
        />
      ))}
    </View>
  );
}
